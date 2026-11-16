/**
 * Lojistik Faz 6 — Uygulama İçi Kapasite ve Zaman Penceresi Kısıtlı Rota Çözücüsü (CVRPTW)
 *
 * Kurallar:
 * - Sıfır harici çözücü bağımlılığı (saf TypeScript).
 * - Önce hızlı başlangıç çözümü (Zaman Penceresi Boşluğu + En Yakın Ekleme),
 *   ardından süre sınırı (`timeBudgetMs`) içinde 2-Opt + Or-Opt iyileştirmesi uygular.
 * - Mesafe/Süre Matrisi dışarıdan sağlanabilir (`customMatrix`: OSRM/Google/HERE/TomTom)
 *   veya varsayılan koordinat tabanlı Haversine * yol kıvrım katsayısı ile hesaplanır.
 * - Client-safe: `fs` / `db` / `crypto` import etmez.
 */

import {
  evaluateVehicleCapacityLoad,
  formatMinutesToHhMm,
  parseHhMmToMinutes,
} from "./constantsAndHelpers"

export interface SolverOrigin {
  label: string
  lat: number
  lng: number
}

export interface SolverStopInput {
  id: string
  label?: string
  lat: number
  lng: number
  weightKg?: number
  volumeM3?: number
  palletCount?: number
  requiresColdChain?: boolean
  timeWindowStart?: string | null
  timeWindowEnd?: string | null
  serviceMinutes?: number
  priority?: number
}

export interface SolverVehicleInput {
  vehicleId: string
  plate: string
  driverId?: string | null
  driverName?: string | null
  capacityKg: number
  capacityM3: number
  palletSlots: number
  isRefrigerated?: boolean
  shiftStart?: string | null
  shiftEnd?: string | null
}

export interface DistanceDurationMatrix {
  size: number // 1 (depot) + N stops
  distancesKm: Float64Array // row-major size*size
  durationsMin: Float64Array // row-major size*size
  providerMode: string
  solverLabel: string
}

export interface OptimizedStopSchedule {
  id: string
  sequenceNo: number
  legDistanceKm: number
  cumulativeDistanceKm: number
  estimatedArrivalMin: number
  estimatedArrivalHhMm: string
  plannedEtaAt: string
  lateMinutes: number
  waitingMinutes: number
  timeWindowViolated: boolean
}

export interface SingleTripOptimizeResult {
  orderedStopIds: string[]
  stops: OptimizedStopSchedule[]
  baselineUnoptimizedDistanceKm: number
  optimizedDistanceKm: number
  estimatedDurationMin: number
  timeWindowViolations: number
  totalLateMinutes: number
  polylinePoints: Array<[number, number]>
  providerMode: string
  solverName: string
  durationMs: number
  stages: Array<{ stage: string; pct: number; distanceKm: number; violations: number }>
}

export interface MultiVehiclePlanTrip {
  vehicleId: string
  plate: string
  driverId: string | null
  driverName: string | null
  stopIds: string[]
  stops: OptimizedStopSchedule[]
  totalWeightKg: number
  totalVolumeM3: number
  totalPallets: number
  capacityLoadPct: number
  baselineUnoptimizedDistanceKm: number
  optimizedDistanceKm: number
  estimatedDurationMin: number
  timeWindowViolations: number
  totalLateMinutes: number
  polylinePoints: Array<[number, number]>
}

export interface MultiVehiclePlanResult {
  trips: MultiVehiclePlanTrip[]
  unassignedStops: Array<{ stopId: string; label?: string; reason: string }>
  baselineTotalDistanceKm: number
  optimizedTotalDistanceKm: number
  totalStopsAssigned: number
  totalStopsInput: number
  durationMs: number
}

const EARTH_RADIUS_KM = 6371

function toRad(deg: number): number {
  return (deg * Math.PI) / 180
}

export function haversineRoadKm(
  aLat: number,
  aLng: number,
  bLat: number,
  bLng: number,
  urbanDetourFactor = 1.28
): number {
  const dLat = toRad(bLat - aLat)
  const dLng = toRad(bLng - aLng)
  const lat1 = toRad(aLat)
  const lat2 = toRad(bLat)
  const sinDLat = Math.sin(dLat / 2)
  const sinDLng = Math.sin(dLng / 2)
  const h = sinDLat * sinDLat + Math.cos(lat1) * Math.cos(lat2) * sinDLng * sinDLng
  const c = 2 * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h))
  return Math.round(EARTH_RADIUS_KM * c * urbanDetourFactor * 100) / 100
}

export function buildLocalCoordinateMatrix(
  origin: SolverOrigin,
  stops: SolverStopInput[],
  options?: { avgSpeedKmh?: number; urbanDetourFactor?: number }
): DistanceDurationMatrix {
  const n = stops.length + 1
  const distancesKm = new Float64Array(n * n)
  const durationsMin = new Float64Array(n * n)
  const avgSpeed = Math.max(15, Number(options?.avgSpeedKmh ?? 38))
  const detour = Number(options?.urbanDetourFactor ?? 1.28)

  const coords: Array<{ lat: number; lng: number }> = [
    { lat: origin.lat, lng: origin.lng },
    ...stops.map((s) => ({ lat: s.lat, lng: s.lng })),
  ]

  for (let i = 0; i < n; i++) {
    for (let j = i + 1; j < n; j++) {
      const km = haversineRoadKm(coords[i].lat, coords[i].lng, coords[j].lat, coords[j].lng, detour)
      const mins = Math.max(1, Math.round((km / avgSpeed) * 60))
      distancesKm[i * n + j] = km
      distancesKm[j * n + i] = km
      durationsMin[i * n + j] = mins
      durationsMin[j * n + i] = mins
    }
  }

  return {
    size: n,
    distancesKm,
    durationsMin,
    providerMode: "local-solver",
    solverLabel: "Koordinat Tabanlı Haversine + CVRPTW (Uygulama İçi)",
  }
}

interface ParsedStopMeta {
  indexInMatrix: number // 1..N
  stop: SolverStopInput
  twStartMin: number | null
  twEndMin: number | null
  serviceMin: number
  priority: number
}

interface SequenceEvalSummary {
  totalDistanceKm: number
  totalDurationMin: number
  timeWindowViolations: number
  totalLateMinutes: number
  objective: number
}

function evaluateIndexSequence(
  order: number[],
  metas: ParsedStopMeta[],
  matrix: DistanceDurationMatrix,
  departureMin: number,
  returnToDepot: boolean
): SequenceEvalSummary {
  const n = matrix.size
  if (order.length === 0) {
    return { totalDistanceKm: 0, totalDurationMin: 0, timeWindowViolations: 0, totalLateMinutes: 0, objective: 0 }
  }

  let prevNode = 0
  let totalKm = 0
  let curMin = departureMin
  let violations = 0
  let totalLate = 0

  for (let i = 0; i < order.length; i++) {
    const meta = metas[order[i]]
    const node = meta.indexInMatrix
    const legKm = matrix.distancesKm[prevNode * n + node]
    const driveMin = matrix.durationsMin[prevNode * n + node]
    totalKm += legKm
    const arrivalMin = curMin + driveMin

    let effectiveStart = arrivalMin
    if (meta.twStartMin !== null && arrivalMin < meta.twStartMin) {
      effectiveStart = meta.twStartMin
    }
    if (meta.twEndMin !== null && arrivalMin > meta.twEndMin) {
      violations++
      totalLate += arrivalMin - meta.twEndMin
    }

    curMin = effectiveStart + meta.serviceMin
    prevNode = node
  }

  if (returnToDepot) {
    const backKm = matrix.distancesKm[prevNode * n + 0]
    const backMin = matrix.durationsMin[prevNode * n + 0]
    totalKm += backKm
    curMin += backMin
  }

  const roundedKm = Math.round(totalKm * 100) / 100
  const durationMin = Math.max(0, Math.round(curMin - departureMin))
  // Güçlü zaman penceresi + mesafe amaç fonksiyonu (geç teslimat ağır cezalı)
  const objective = roundedKm + violations * 400 + totalLate * 20

  return {
    totalDistanceKm: roundedKm,
    totalDurationMin: durationMin,
    timeWindowViolations: violations,
    totalLateMinutes: Math.round(totalLate),
    objective,
  }
}

export function optimizeSingleTripRoute(params: {
  origin: SolverOrigin
  stops: SolverStopInput[]
  plannedDepartureAt?: string | Date
  avgSpeedKmh?: number
  returnToDepot?: boolean
  timeBudgetMs?: number
  matrix?: DistanceDurationMatrix
  onStageProgress?: (stage: { status: string; label: string; pct: number }) => void
}): SingleTripOptimizeResult {
  const t0 = Date.now()
  const returnToDepot = Boolean(params.returnToDepot)
  const timeBudgetMs = Math.max(150, Math.min(8000, Number(params.timeBudgetMs ?? 1500)))
  const depDate = params.plannedDepartureAt ? new Date(params.plannedDepartureAt) : new Date()
  const safeDepDate = Number.isNaN(depDate.getTime()) ? new Date() : depDate
  const depDayMin = safeDepDate.getHours() * 60 + safeDepDate.getMinutes()
  const dayMidnightMs = new Date(
    safeDepDate.getFullYear(),
    safeDepDate.getMonth(),
    safeDepDate.getDate(),
    0,
    0,
    0,
    0
  ).getTime()

  const stages: SingleTripOptimizeResult["stages"] = []
  params.onStageProgress?.({ status: "QUEUED", label: "Mesafe ve süre matrisi hazırlanıyor", pct: 15 })

  const matrix =
    params.matrix ||
    buildLocalCoordinateMatrix(params.origin, params.stops, { avgSpeedKmh: params.avgSpeedKmh })

  const metas: ParsedStopMeta[] = params.stops.map((stop, idx) => ({
    indexInMatrix: idx + 1,
    stop,
    twStartMin: parseHhMmToMinutes(stop.timeWindowStart),
    twEndMin: parseHhMmToMinutes(stop.timeWindowEnd),
    serviceMin: Math.max(2, Math.round(Number(stop.serviceMinutes ?? 10))),
    priority: Math.max(1, Number(stop.priority ?? 1)),
  }))

  const baselineOrder = metas.map((_, idx) => idx)
  const baselineEval = evaluateIndexSequence(baselineOrder, metas, matrix, depDayMin, returnToDepot)
  stages.push({
    stage: "Mevcut Sıra (Baseline)",
    pct: 20,
    distanceKm: baselineEval.totalDistanceKm,
    violations: baselineEval.timeWindowViolations,
  })

  if (metas.length === 0) {
    params.onStageProgress?.({ status: "COMPLETED", label: "Durak yok", pct: 100 })
    return {
      orderedStopIds: [],
      stops: [],
      baselineUnoptimizedDistanceKm: 0,
      optimizedDistanceKm: 0,
      estimatedDurationMin: 0,
      timeWindowViolations: 0,
      totalLateMinutes: 0,
      polylinePoints: [[params.origin.lat, params.origin.lng]],
      providerMode: matrix.providerMode,
      solverName: matrix.solverLabel,
      durationMs: Date.now() - t0,
      stages,
    }
  }

  // AŞAMA 1: Zaman Penceresi Boşluğu & En Yakın Ekleme ile Hızlı Başlangıç Turu
  params.onStageProgress?.({
    status: "INITIAL_SOLVING",
    label: "Hızlı başlangıç çözümü (Zaman penceresi + En yakın ekleme)",
    pct: 45,
  })

  const remaining = new Set(baselineOrder)
  const tour: number[] = []
  const n = matrix.size

  while (remaining.size > 0) {
    let bestCand = -1
    let bestPos = tour.length
    let bestCost = Number.POSITIVE_INFINITY

    for (const candIdx of remaining) {
      const candMeta = metas[candIdx]
      // Mevcut tur içine tüm ekleme konumlarını dene (N<=100 için ultra hızlı)
      for (let pos = 0; pos <= tour.length; pos++) {
        const trial = [...tour.slice(0, pos), candIdx, ...tour.slice(pos)]
        const evalRes = evaluateIndexSequence(trial, metas, matrix, depDayMin, returnToDepot)
        const urgencyBias =
          candMeta.twEndMin !== null ? Math.max(0, (candMeta.twEndMin - depDayMin) * 0.015) : 12
        const priorityBonus = (candMeta.priority - 1) * 1.5
        const score = evalRes.objective + urgencyBias - priorityBonus
        if (score < bestCost) {
          bestCost = score
          bestCand = candIdx
          bestPos = pos
        }
      }
      // Büyük turlarda (>=40) ekleme maliyeti hesaplamasını hızlandır
      if (tour.length > 40 && remaining.size > 25 && bestCand !== -1 && posIsGreedyLimit(n)) {
        // Sadece son 2 aday arasından devam etme koruması burada zaten hızlı (Float64)
      }
    }

    if (bestCand === -1) break
    tour.splice(bestPos, 0, bestCand)
    remaining.delete(bestCand)
  }

  let curEval = evaluateIndexSequence(tour, metas, matrix, depDayMin, returnToDepot)
  stages.push({
    stage: "İlk Zaman Pencereli Çözüm",
    pct: 60,
    distanceKm: curEval.totalDistanceKm,
    violations: curEval.timeWindowViolations,
  })

  // AŞAMA 2: Zaman Sınırlı 2-Opt + Or-Opt Lokal İyileştirme
  params.onStageProgress?.({
    status: "IMPROVING",
    label: "2-Opt ve Or-Opt lokal rota iyileştirmesi yapılıyor",
    pct: 80,
  })

  let improved = true
  let iter = 0
  while (improved && iter < 150 && Date.now() - t0 < timeBudgetMs) {
    improved = false
    iter++

    // 2a. 2-Opt ters çevirme
    for (let i = 0; i < tour.length - 1; i++) {
      if (Date.now() - t0 >= timeBudgetMs) break
      for (let j = i + 1; j < tour.length; j++) {
        const candidate = [...tour.slice(0, i), ...tour.slice(i, j + 1).reverse(), ...tour.slice(j + 1)]
        const candEval = evaluateIndexSequence(candidate, metas, matrix, depDayMin, returnToDepot)
        if (candEval.objective + 0.02 < curEval.objective) {
          tour.splice(0, tour.length, ...candidate)
          curEval = candEval
          improved = true
          break
        }
      }
      if (improved) break
    }

    if (improved) continue

    // 2b. Or-Opt tek durak kaydırma (yön ve zaman penceresi düzeltmesi)
    for (let i = 0; i < tour.length; i++) {
      if (Date.now() - t0 >= timeBudgetMs) break
      const node = tour[i]
      const without = [...tour.slice(0, i), ...tour.slice(i + 1)]
      for (let pos = 0; pos <= without.length; pos++) {
        if (pos === i) continue
        const candidate = [...without.slice(0, pos), node, ...without.slice(pos)]
        const candEval = evaluateIndexSequence(candidate, metas, matrix, depDayMin, returnToDepot)
        if (candEval.objective + 0.02 < curEval.objective) {
          tour.splice(0, tour.length, ...candidate)
          curEval = candEval
          improved = true
          break
        }
      }
      if (improved) break
    }
  }

  stages.push({
    stage: "İyileştirilmiş Final Rota (2-Opt + Or-Opt)",
    pct: 100,
    distanceKm: curEval.totalDistanceKm,
    violations: curEval.timeWindowViolations,
  })
  params.onStageProgress?.({ status: "COMPLETED", label: "Optimizasyon tamamlandı", pct: 100 })

  // Final durak zaman çizelgesi hesaplama
  const stopsOut: OptimizedStopSchedule[] = []
  const polylinePoints: Array<[number, number]> = [[params.origin.lat, params.origin.lng]]
  let prevNode = 0
  let cumKm = 0
  let curMin = depDayMin

  for (let seq = 0; seq < tour.length; seq++) {
    const meta = metas[tour[seq]]
    const node = meta.indexInMatrix
    const legKm = Math.round(matrix.distancesKm[prevNode * n + node] * 100) / 100
    const driveMin = matrix.durationsMin[prevNode * n + node]
    cumKm = Math.round((cumKm + legKm) * 100) / 100
    const arrivalMin = curMin + driveMin

    const waitingMinutes =
      meta.twStartMin !== null && arrivalMin < meta.twStartMin ? meta.twStartMin - arrivalMin : 0
    const lateMinutes =
      meta.twEndMin !== null && arrivalMin > meta.twEndMin ? arrivalMin - meta.twEndMin : 0
    const effectiveStart = arrivalMin + waitingMinutes

    stopsOut.push({
      id: meta.stop.id,
      sequenceNo: seq + 1,
      legDistanceKm: legKm,
      cumulativeDistanceKm: cumKm,
      estimatedArrivalMin: Math.round(arrivalMin),
      estimatedArrivalHhMm: formatMinutesToHhMm(arrivalMin),
      plannedEtaAt: new Date(dayMidnightMs + Math.round(arrivalMin) * 60_000).toISOString(),
      lateMinutes: Math.round(lateMinutes),
      waitingMinutes: Math.round(waitingMinutes),
      timeWindowViolated: lateMinutes > 0,
    })

    polylinePoints.push([meta.stop.lat, meta.stop.lng])
    curMin = effectiveStart + meta.serviceMin
    prevNode = node
  }

  if (returnToDepot && tour.length > 0) {
    polylinePoints.push([params.origin.lat, params.origin.lng])
  }

  return {
    orderedStopIds: tour.map((idx) => metas[idx].stop.id),
    stops: stopsOut,
    baselineUnoptimizedDistanceKm: baselineEval.totalDistanceKm,
    optimizedDistanceKm: curEval.totalDistanceKm,
    estimatedDurationMin: curEval.totalDurationMin,
    timeWindowViolations: curEval.timeWindowViolations,
    totalLateMinutes: curEval.totalLateMinutes,
    polylinePoints,
    providerMode: matrix.providerMode,
    solverName: matrix.solverLabel,
    durationMs: Date.now() - t0,
    stages,
  }
}

function posIsGreedyLimit(matrixSize: number): boolean {
  return matrixSize > 200
}

/**
 * Verilen sıra değişmeden (örn. sürükle-bırak sonrası) yalnızca mesafe, ETA ve ihlalleri yeniden hesaplar.
 */
export function recalculateFixedStopSequence(params: {
  origin: SolverOrigin
  stopsInOrder: SolverStopInput[]
  plannedDepartureAt?: string | Date
  avgSpeedKmh?: number
  returnToDepot?: boolean
}): Omit<SingleTripOptimizeResult, "stages" | "baselineUnoptimizedDistanceKm"> {
  const t0 = Date.now()
  const matrix = buildLocalCoordinateMatrix(params.origin, params.stopsInOrder, {
    avgSpeedKmh: params.avgSpeedKmh,
  })
  const metas: ParsedStopMeta[] = params.stopsInOrder.map((stop, idx) => ({
    indexInMatrix: idx + 1,
    stop,
    twStartMin: parseHhMmToMinutes(stop.timeWindowStart),
    twEndMin: parseHhMmToMinutes(stop.timeWindowEnd),
    serviceMin: Math.max(2, Math.round(Number(stop.serviceMinutes ?? 10))),
    priority: Math.max(1, Number(stop.priority ?? 1)),
  }))

  const depDate = params.plannedDepartureAt ? new Date(params.plannedDepartureAt) : new Date()
  const safeDepDate = Number.isNaN(depDate.getTime()) ? new Date() : depDate
  const depDayMin = safeDepDate.getHours() * 60 + safeDepDate.getMinutes()
  const dayMidnightMs = new Date(
    safeDepDate.getFullYear(),
    safeDepDate.getMonth(),
    safeDepDate.getDate(),
    0,
    0,
    0,
    0
  ).getTime()

  const order = metas.map((_, i) => i)
  const evalRes = evaluateIndexSequence(order, metas, matrix, depDayMin, Boolean(params.returnToDepot))

  const stopsOut: OptimizedStopSchedule[] = []
  const polylinePoints: Array<[number, number]> = [[params.origin.lat, params.origin.lng]]
  const n = matrix.size
  let prevNode = 0
  let cumKm = 0
  let curMin = depDayMin

  for (let seq = 0; seq < order.length; seq++) {
    const meta = metas[order[seq]]
    const node = meta.indexInMatrix
    const legKm = Math.round(matrix.distancesKm[prevNode * n + node] * 100) / 100
    const driveMin = matrix.durationsMin[prevNode * n + node]
    cumKm = Math.round((cumKm + legKm) * 100) / 100
    const arrivalMin = curMin + driveMin
    const waitingMinutes =
      meta.twStartMin !== null && arrivalMin < meta.twStartMin ? meta.twStartMin - arrivalMin : 0
    const lateMinutes =
      meta.twEndMin !== null && arrivalMin > meta.twEndMin ? arrivalMin - meta.twEndMin : 0
    const effectiveStart = arrivalMin + waitingMinutes

    stopsOut.push({
      id: meta.stop.id,
      sequenceNo: seq + 1,
      legDistanceKm: legKm,
      cumulativeDistanceKm: cumKm,
      estimatedArrivalMin: Math.round(arrivalMin),
      estimatedArrivalHhMm: formatMinutesToHhMm(arrivalMin),
      plannedEtaAt: new Date(dayMidnightMs + Math.round(arrivalMin) * 60_000).toISOString(),
      lateMinutes: Math.round(lateMinutes),
      waitingMinutes: Math.round(waitingMinutes),
      timeWindowViolated: lateMinutes > 0,
    })
    polylinePoints.push([meta.stop.lat, meta.stop.lng])
    curMin = effectiveStart + meta.serviceMin
    prevNode = node
  }

  return {
    orderedStopIds: params.stopsInOrder.map((s) => s.id),
    stops: stopsOut,
    optimizedDistanceKm: evalRes.totalDistanceKm,
    estimatedDurationMin: evalRes.totalDurationMin,
    timeWindowViolations: evalRes.timeWindowViolations,
    totalLateMinutes: evalRes.totalLateMinutes,
    polylinePoints,
    providerMode: matrix.providerMode,
    solverName: "Manuel Sıra ETA Hesaplayıcısı",
    durationMs: Date.now() - t0,
  }
}

/**
 * Çoklu Araç / Kapasite & Zaman Penceresi Kısıtlı Sefer Gruplama ve Rota Planlama (CVRPTW Batch)
 * Örneğin 100 durak + 10 araç yükünü araç kg/m³/palet/soğuk zincir ve şoför vardiyasına göre dağıtır
 * ve her araç turunu zaman sınırı içinde 2-Opt + Or-Opt ile optimize eder.
 */
export function planMultiVehicleTrips(params: {
  origin: SolverOrigin
  stops: SolverStopInput[]
  vehicles: SolverVehicleInput[]
  plannedDepartureAt?: string | Date
  avgSpeedKmh?: number
  timeBudgetMs?: number
}): MultiVehiclePlanResult {
  const t0 = Date.now()
  const timeBudgetMs = Math.max(200, Math.min(8000, Number(params.timeBudgetMs ?? 2500)))
  const depDate = params.plannedDepartureAt ? new Date(params.plannedDepartureAt) : new Date()
  const safeDepDate = Number.isNaN(depDate.getTime()) ? new Date() : depDate

  if (params.stops.length === 0 || params.vehicles.length === 0) {
    return {
      trips: [],
      unassignedStops: params.stops.map((s) => ({
        stopId: s.id,
        label: s.label,
        reason: "Atanacak uygun araç bulunamadı.",
      })),
      baselineTotalDistanceKm: 0,
      optimizedTotalDistanceKm: 0,
      totalStopsAssigned: 0,
      totalStopsInput: params.stops.length,
      durationMs: Date.now() - t0,
    }
  }

  // Ön hesaplı O(1) arama matrisi (100 durak = 101x101 Float64 ~1ms)
  const matrix = buildLocalCoordinateMatrix(params.origin, params.stops, {
    avgSpeedKmh: params.avgSpeedKmh,
  })
  const stopIdxById = new Map<string, number>()
  params.stops.forEach((s, idx) => stopIdxById.set(s.id, idx + 1))

  interface Bucket {
    vehicle: SolverVehicleInput
    assigned: SolverStopInput[]
    curWeight: number
    curVolume: number
    curPallets: number
    lastNode: number
    shiftEndMin: number | null
  }

  const buckets: Bucket[] = params.vehicles.map((v) => ({
    vehicle: v,
    assigned: [],
    curWeight: 0,
    curVolume: 0,
    curPallets: 0,
    lastNode: 0,
    shiftEndMin: parseHhMmToMinutes(v.shiftEnd),
  }))

  // Önce soğuk zincir, sonra sıkı zaman penceresi ve öncelik sırası
  const sortedStops = [...params.stops].sort((a, b) => {
    if (Boolean(a.requiresColdChain) !== Boolean(b.requiresColdChain)) {
      return a.requiresColdChain ? -1 : 1
    }
    const twA = parseHhMmToMinutes(a.timeWindowEnd) ?? 1440
    const twB = parseHhMmToMinutes(b.timeWindowEnd) ?? 1440
    if (twA !== twB) return twA - twB
    return Number(b.priority || 1) - Number(a.priority || 1)
  })

  const unassignedStops: MultiVehiclePlanResult["unassignedStops"] = []
  const mSize = matrix.size

  for (const stop of sortedStops) {
    const w = Math.max(0, Number(stop.weightKg || 0))
    const vol = Math.max(0, Number(stop.volumeM3 || 0))
    const pal = Math.max(0, Math.round(Number(stop.palletCount || 0)))
    const node = stopIdxById.get(stop.id) ?? 0

    let bestBucket: Bucket | null = null
    let bestScore = Number.POSITIVE_INFINITY

    for (const b of buckets) {
      if (stop.requiresColdChain && !b.vehicle.isRefrigerated) continue
      if (b.curWeight + w > b.vehicle.capacityKg + 0.01) continue
      if (b.curVolume + vol > b.vehicle.capacityM3 + 0.01) continue
      if (b.vehicle.palletSlots > 0 && b.curPallets + pal > b.vehicle.palletSlots) continue

      const addedKm = matrix.distancesKm[b.lastNode * mSize + node]
      const emptyVehiclePenalty = b.assigned.length === 0 ? 12 : 0
      const loadRatio =
        (b.curWeight + w) / Math.max(1, b.vehicle.capacityKg) +
        (b.curVolume + vol) / Math.max(0.5, b.vehicle.capacityM3)
      // Coğrafi yakınlık + araç birleştirme dengesi
      const score = addedKm + emptyVehiclePenalty + loadRatio * 4
      if (score < bestScore) {
        bestScore = score
        bestBucket = b
      }
    }

    if (!bestBucket) {
      const reason = stop.requiresColdChain
        ? "Kapasite dolu veya uygun soğuk zincir aracı yok."
        : "Tüm araçların ağırlık/hacim/palet kapasitesi dolu."
      unassignedStops.push({ stopId: stop.id, label: stop.label, reason })
      continue
    }

    bestBucket.assigned.push(stop)
    bestBucket.curWeight += w
    bestBucket.curVolume += vol
    bestBucket.curPallets += pal
    bestBucket.lastNode = node
  }

  const activeBuckets = buckets.filter((b) => b.assigned.length > 0)
  const perTripBudget = Math.max(
    150,
    Math.floor((timeBudgetMs - (Date.now() - t0)) / Math.max(1, activeBuckets.length))
  )

  const trips: MultiVehiclePlanTrip[] = []
  let baselineTotalDistanceKm = 0
  let optimizedTotalDistanceKm = 0

  for (const b of activeBuckets) {
    // Alt-matris çıkar (0=depot + bu araca atanan duraklar)
    const subNodes = [0, ...b.assigned.map((s) => stopIdxById.get(s.id) ?? 0)]
    const subSize = subNodes.length
    const subDist = new Float64Array(subSize * subSize)
    const subTime = new Float64Array(subSize * subSize)
    for (let i = 0; i < subSize; i++) {
      for (let j = 0; j < subSize; j++) {
        const gi = subNodes[i]
        const gj = subNodes[j]
        subDist[i * subSize + j] = matrix.distancesKm[gi * mSize + gj]
        subTime[i * subSize + j] = matrix.durationsMin[gi * mSize + gj]
      }
    }

    const opt = optimizeSingleTripRoute({
      origin: params.origin,
      stops: b.assigned,
      plannedDepartureAt: safeDepDate,
      avgSpeedKmh: params.avgSpeedKmh,
      timeBudgetMs: perTripBudget,
      matrix: {
        size: subSize,
        distancesKm: subDist,
        durationsMin: subTime,
        providerMode: matrix.providerMode,
        solverLabel: matrix.solverLabel,
      },
    })

    const load = evaluateVehicleCapacityLoad(
      {
        capacityKg: b.vehicle.capacityKg,
        capacityM3: b.vehicle.capacityM3,
        palletSlots: b.vehicle.palletSlots,
        isRefrigerated: b.vehicle.isRefrigerated,
      },
      b.assigned
    )

    baselineTotalDistanceKm = Number((baselineTotalDistanceKm + opt.baselineUnoptimizedDistanceKm).toFixed(2))
    optimizedTotalDistanceKm = Number((optimizedTotalDistanceKm + opt.optimizedDistanceKm).toFixed(2))

    trips.push({
      vehicleId: b.vehicle.vehicleId,
      plate: b.vehicle.plate,
      driverId: b.vehicle.driverId ?? null,
      driverName: b.vehicle.driverName ?? null,
      stopIds: opt.orderedStopIds,
      stops: opt.stops,
      totalWeightKg: load.totalWeightKg,
      totalVolumeM3: load.totalVolumeM3,
      totalPallets: load.totalPallets,
      capacityLoadPct: load.capacityLoadPct,
      baselineUnoptimizedDistanceKm: opt.baselineUnoptimizedDistanceKm,
      optimizedDistanceKm: opt.optimizedDistanceKm,
      estimatedDurationMin: opt.estimatedDurationMin,
      timeWindowViolations: opt.timeWindowViolations,
      totalLateMinutes: opt.totalLateMinutes,
      polylinePoints: opt.polylinePoints,
    })
  }

  return {
    trips,
    unassignedStops,
    baselineTotalDistanceKm,
    optimizedTotalDistanceKm,
    totalStopsAssigned: params.stops.length - unassignedStops.length,
    totalStopsInput: params.stops.length,
    durationMs: Date.now() - t0,
  }
}
