/**
 * Lojistik Sağlayıcı Adaptörü — Harita / Trafik & Uygulama İçi Rota Hesaplama
 *
 * Karar #5:
 * - Varsayılan sağlayıcı API anahtarı gerektirmeyen uygulama içi Haversine +
 *   En Yakın Komşu + 2-Opt optimizasyon çözücüsüdür (local-solver).
 * - Harici OSRM / Google Directions / HERE REST servisi yalnızca yapılandırma ile bağlanır.
 */

import type {
  GeoCoordinate,
  ILogisticsRoutingProvider,
  OptimizedRouteResult,
  RouteStopInput,
} from "../types"

const EARTH_RADIUS_KM = 6371

function toRad(deg: number): number {
  return (deg * Math.PI) / 180
}

/**
 * İki coğrafi koordinat arasındaki kuş uçuşu mesafeyi (km) Haversine formülü ile hesaplar.
 * Şehir içi gerçek yol kıvrımı faktörü (1.28) ile gerçekçi karayolu tahmini üretir.
 */
export function calculateRoadDistanceKm(
  a: Pick<GeoCoordinate, "lat" | "lng">,
  b: Pick<GeoCoordinate, "lat" | "lng">,
  urbanDetourFactor = 1.28
): number {
  const dLat = toRad(b.lat - a.lat)
  const dLng = toRad(b.lng - a.lng)
  const lat1 = toRad(a.lat)
  const lat2 = toRad(b.lat)

  const sinDLat = Math.sin(dLat / 2)
  const sinDLng = Math.sin(dLng / 2)
  const h =
    sinDLat * sinDLat +
    Math.cos(lat1) * Math.cos(lat2) * sinDLng * sinDLng
  const c = 2 * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h))
  const rawKm = EARTH_RADIUS_KM * c
  return Math.round(rawKm * urbanDetourFactor * 100) / 100
}

function computeTotalSequenceDistance(
  origin: GeoCoordinate,
  sequence: RouteStopInput[],
  returnToDepot: boolean
): number {
  if (sequence.length === 0) return 0
  let total = calculateRoadDistanceKm(origin, sequence[0])
  for (let i = 1; i < sequence.length; i++) {
    total += calculateRoadDistanceKm(sequence[i - 1], sequence[i])
  }
  if (returnToDepot) {
    total += calculateRoadDistanceKm(sequence[sequence.length - 1], origin)
  }
  return Math.round(total * 100) / 100
}

/**
 * Uygulama içi, API anahtarı gerektirmeyen (key-free) En Yakın Komşu + 2-Opt Rota Çözücüsü.
 */
export class LocalKeyFreeRoutingProvider implements ILogisticsRoutingProvider {
  readonly adapterId = "lojistik-local-solver-v1"
  readonly displayName = "Uygulama İçi Rota Motoru (Haversine + 2-Opt)"
  readonly mode = "local-solver" as const

  async optimizeStops(
    origin: GeoCoordinate,
    stops: RouteStopInput[],
    options?: {
      avgSpeedKmh?: number
      returnToDepot?: boolean
    }
  ): Promise<OptimizedRouteResult> {
    const avgSpeedKmh = Math.max(15, options?.avgSpeedKmh ?? 36)
    const returnToDepot = options?.returnToDepot ?? false

    if (stops.length === 0) {
      return {
        providerMode: this.mode,
        solverName: this.displayName,
        origin,
        orderedStops: [],
        totalDistanceKm: 0,
        estimatedDurationMinutes: 0,
        polylinePoints: [[origin.lat, origin.lng]],
      }
    }

    // 1. Öncelik skoru + En Yakın Komşu (Nearest Neighbor) başlangıç turu
    const remaining = [...stops]
    let currentPos: GeoCoordinate = origin
    const tour: RouteStopInput[] = []

    while (remaining.length > 0) {
      let bestIdx = 0
      let bestScore = Number.POSITIVE_INFINITY
      for (let i = 0; i < remaining.length; i++) {
        const candidate = remaining[i]
        const dist = calculateRoadDistanceKm(currentPos, candidate)
        const priorityBonus = Math.max(0, (candidate.priority ?? 1) - 1) * 1.2
        const score = Math.max(0.1, dist - priorityBonus)
        if (score < bestScore) {
          bestScore = score
          bestIdx = i
        }
      }
      const picked = remaining.splice(bestIdx, 1)[0]
      tour.push(picked)
      currentPos = picked
    }

    // 2. 2-Opt yerel iyileştirme (durak sayısı >= 3 ise kesişmeleri çözer)
    if (tour.length >= 3) {
      let improved = true
      let guard = 0
      while (improved && guard < 120) {
        improved = false
        guard++
        const currentDist = computeTotalSequenceDistance(origin, tour, returnToDepot)
        for (let i = 0; i < tour.length - 1; i++) {
          for (let j = i + 1; j < tour.length; j++) {
            const candidate = [
              ...tour.slice(0, i),
              ...tour.slice(i, j + 1).reverse(),
              ...tour.slice(j + 1),
            ]
            const candidateDist = computeTotalSequenceDistance(origin, candidate, returnToDepot)
            if (candidateDist + 0.05 < currentDist) {
              tour.splice(0, tour.length, ...candidate)
              improved = true
              break
            }
          }
          if (improved) break
        }
      }
    }

    // 3. Mesafe, kümülatif km, ETA ve polyline hesapla
    let prev: GeoCoordinate = origin
    let cumKm = 0
    let cumMinutes = 0
    const orderedStops: OptimizedRouteResult["orderedStops"] = []
    const polylinePoints: Array<[number, number]> = [[origin.lat, origin.lng]]

    for (let idx = 0; idx < tour.length; idx++) {
      const stop = tour[idx]
      const legKm = calculateRoadDistanceKm(prev, stop)
      cumKm = Math.round((cumKm + legKm) * 100) / 100
      const driveMinutes = Math.round((legKm / avgSpeedKmh) * 60)
      const serviceMinutes = Math.max(0, stop.serviceMinutes ?? 8)
      cumMinutes += driveMinutes

      orderedStops.push({
        ...stop,
        sequenceNo: idx + 1,
        legDistanceKm: legKm,
        cumulativeDistanceKm: cumKm,
        estimatedArrivalMinutes: cumMinutes,
      })

      cumMinutes += serviceMinutes
      polylinePoints.push([stop.lat, stop.lng])
      prev = stop
    }

    if (returnToDepot && tour.length > 0) {
      const returnLeg = calculateRoadDistanceKm(prev, origin)
      cumKm = Math.round((cumKm + returnLeg) * 100) / 100
      cumMinutes += Math.round((returnLeg / avgSpeedKmh) * 60)
      polylinePoints.push([origin.lat, origin.lng])
    }

    return {
      providerMode: this.mode,
      solverName: this.displayName,
      origin,
      orderedStops,
      totalDistanceKm: cumKm,
      estimatedDurationMinutes: cumMinutes,
      polylinePoints,
    }
  }
}

/**
 * Harici rota servisi adaptörü (OSRM / Directions REST).
 * Yapılandırma ile etkinleştirilir; gerçek URL/anahtar tanımlı olmadığında yerel çözücüye güvenli dönüş sunar.
 */
export class ExternalRoutingProvider implements ILogisticsRoutingProvider {
  readonly adapterId = "lojistik-external-routing"
  readonly displayName = "Harici Rota & Trafik Sağlayıcısı (REST)"
  readonly mode = "external-rest" as const

  constructor(
    private readonly baseUrl: string,
    private readonly fallbackSolver = new LocalKeyFreeRoutingProvider()
  ) {}

  async optimizeStops(
    origin: GeoCoordinate,
    stops: RouteStopInput[],
    options?: {
      avgSpeedKmh?: number
      returnToDepot?: boolean
    }
  ): Promise<OptimizedRouteResult> {
    if (!this.baseUrl || !this.baseUrl.startsWith("http") || stops.length < 2) {
      return this.fallbackSolver.optimizeStops(origin, stops, options)
    }

    try {
      const coords = [
        `${origin.lng},${origin.lat}`,
        ...stops.map((s) => `${s.lng},${s.lat}`),
      ].join(";")

      const controller = new AbortController()
      const timer = setTimeout(() => controller.abort(), 4500)
      const res = await fetch(
        `${this.baseUrl.replace(/\/$/, "")}/trip/v1/driving/${coords}?source=first&roundtrip=${options?.returnToDepot ? "true" : "false"}`,
        { signal: controller.signal }
      )
      clearTimeout(timer)

      if (!res.ok) {
        return this.fallbackSolver.optimizeStops(origin, stops, options)
      }

      const data = await res.json()
      if (!Array.isArray(data?.waypoints) || !data?.trips?.[0]) {
        return this.fallbackSolver.optimizeStops(origin, stops, options)
      }

      // Waypoint sırasını harici yanıttan uygula
      const waypointIndexes = data.waypoints
        .slice(1)
        .map((wp: any, origIdx: number) => ({
          stop: stops[origIdx],
          tripIdx: Number(wp?.waypoint_index ?? origIdx + 1),
        }))
        .filter((w: any) => Boolean(w.stop))
        .sort((a: any, b: any) => a.tripIdx - b.tripIdx)
        .map((w: any) => w.stop)

      const computed = await this.fallbackSolver.optimizeStops(
        origin,
        waypointIndexes,
        options
      )
      return {
        ...computed,
        providerMode: this.mode,
        solverName: `${this.displayName} (OSRM Trip)`,
      }
    } catch {
      return this.fallbackSolver.optimizeStops(origin, stops, options)
    }
  }
}
