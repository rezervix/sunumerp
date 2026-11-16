/**
 * Lojistik Faz 6 (lojistik_sevkiyat_rota) — Saf İstemci-Güvenli Sabitler, Etiketler,
 * Kapasite/Vardiya/Ehliyet Doğrulama ve Sevkiyat KPI Yardımcıları
 *
 * KURALLAR:
 * - İstemci ("use client") ve sunucu dosyalarında güvenle import edilebilir.
 * - fs, path, prisma/db veya crypto modülleri ASLA import edilmez.
 */

export type DispatchTripStatus =
  | "TASLAK"
  | "ONAYLANDI"
  | "YUKLENIYOR"
  | "YOLDA"
  | "TESLIMAT_SURUYOR"
  | "TAMAMLANDI"
  | "IPTAL"

export type DispatchStopStatus =
  | "BEKLIYOR"
  | "YOLDA"
  | "VARISTA"
  | "TESLIM_EDILDI"
  | "KISMI_TESLIM"
  | "TESLIM_EDILEMEDI"

export type DispatchStopSourceType =
  | "OMNICHANNEL_ORDER"
  | "ERP_ORDER"
  | "WMS_TRANSFER"
  | "WMS_WAVE"
  | "MANUAL"

export type DispatchFailureReasonCode =
  | "ALICI_ADRESTE_YOK"
  | "ADRES_YANLIS_EKSIK"
  | "ALICI_REDDETTI"
  | "ZAMAN_PENCERESI_KAPALI"
  | "ARAC_ARIZA_GECIKME"
  | "HASARLI_URUN"
  | "DIGER"

export const DISPATCH_TRIP_STATUS_LABELS: Record<DispatchTripStatus, string> = {
  TASLAK: "Taslak Plan",
  ONAYLANDI: "Onaylandı & E-İrsaliye Hazır",
  YUKLENIYOR: "Yükleniyor (Peronda)",
  YOLDA: "Yolda",
  TESLIMAT_SURUYOR: "Teslimat Sürüyor",
  TAMAMLANDI: "Tamamlandı",
  IPTAL: "İptal Edildi",
}

export const DISPATCH_TRIP_STATUS_BADGES: Record<DispatchTripStatus, string> = {
  TASLAK: "bg-zinc-500/15 text-zinc-300 border-white/[0.1]",
  ONAYLANDI: "bg-emerald-500/15 text-emerald-300 border-emerald-500/30",
  YUKLENIYOR: "bg-amber-500/15 text-amber-300 border-amber-500/30",
  YOLDA: "bg-sky-500/15 text-sky-300 border-sky-500/30",
  TESLIMAT_SURUYOR: "bg-teal-500/15 text-teal-300 border-teal-500/30",
  TAMAMLANDI: "bg-emerald-500/20 text-[#34D399] border-emerald-500/40",
  IPTAL: "bg-rose-500/15 text-rose-300 border-rose-500/30",
}

export const DISPATCH_STOP_STATUS_LABELS: Record<DispatchStopStatus, string> = {
  BEKLIYOR: "Bekliyor",
  YOLDA: "Yolda",
  VARISTA: "Varışta",
  TESLIM_EDILDI: "Teslim Edildi",
  KISMI_TESLIM: "Kısmi Teslim",
  TESLIM_EDILEMEDI: "Teslim Edilemedi",
}

export const DISPATCH_STOP_STATUS_BADGES: Record<DispatchStopStatus, string> = {
  BEKLIYOR: "bg-zinc-500/15 text-zinc-300 border-white/[0.08]",
  YOLDA: "bg-sky-500/15 text-sky-300 border-sky-500/25",
  VARISTA: "bg-amber-500/15 text-amber-300 border-amber-500/25",
  TESLIM_EDILDI: "bg-emerald-500/15 text-[#34D399] border-emerald-500/30",
  KISMI_TESLIM: "bg-amber-500/20 text-amber-200 border-amber-500/35",
  TESLIM_EDILEMEDI: "bg-rose-500/15 text-rose-300 border-rose-500/30",
}

export const DISPATCH_FAILURE_REASON_LABELS: Record<DispatchFailureReasonCode, string> = {
  ALICI_ADRESTE_YOK: "Alıcı Adreste Bulunamadı",
  ADRES_YANLIS_EKSIK: "Adres Eksik / Hatalı",
  ALICI_REDDETTI: "Alıcı Teslimatı Reddetti",
  ZAMAN_PENCERESI_KAPALI: "Teslimat Penceresi Dışında / İşyeri Kapalı",
  ARAC_ARIZA_GECIKME: "Araç Arızası / Trafik Gecikmesi",
  HASARLI_URUN: "Taşıma Esnasında Hasar",
  DIGER: "Diğer",
}

export const POD_RELATION_LABELS: Record<string, string> = {
  ALICI: "Alıcının Kendisi",
  GUVENLIK: "Bina / Site Güvenliği",
  RESEPSIYON: "Resepsiyon / Danışma",
  KOMSU: "Yakın / Yetkili Kişi",
  DIGER: "Diğer",
}

const VALID_TRIP_TRANSITIONS: Record<DispatchTripStatus, readonly DispatchTripStatus[]> = {
  TASLAK: ["ONAYLANDI", "IPTAL"],
  ONAYLANDI: ["YUKLENIYOR", "YOLDA", "IPTAL"],
  YUKLENIYOR: ["YOLDA", "IPTAL"],
  YOLDA: ["TESLIMAT_SURUYOR", "TAMAMLANDI", "IPTAL"],
  TESLIMAT_SURUYOR: ["TAMAMLANDI", "IPTAL"],
  TAMAMLANDI: [],
  IPTAL: [],
}

export function canTransitionDispatchTripStatus(
  from: DispatchTripStatus | string,
  to: DispatchTripStatus | string
): boolean {
  if (from === to) return true
  const allowed = VALID_TRIP_TRANSITIONS[from as DispatchTripStatus]
  return Boolean(allowed && allowed.includes(to as DispatchTripStatus))
}

export function parseHhMmToMinutes(val?: string | null): number | null {
  if (!val) return null
  const m = String(val).trim().match(/^(\d{1,2}):(\d{2})$/)
  if (!m) return null
  const hh = Number(m[1])
  const mm = Number(m[2])
  if (!Number.isInteger(hh) || !Number.isInteger(mm) || hh < 0 || hh > 23 || mm < 0 || mm > 59) {
    return null
  }
  return hh * 60 + mm
}

export function formatMinutesToHhMm(totalMinutes: number): string {
  const safe = ((Math.round(totalMinutes) % 1440) + 1440) % 1440
  const hh = Math.floor(safe / 60)
  const mm = safe % 60
  return `${String(hh).padStart(2, "0")}:${String(mm).padStart(2, "0")}`
}

export function getDayMinuteFromDate(dt: Date | string): number {
  const d = dt instanceof Date ? dt : new Date(dt)
  if (Number.isNaN(d.getTime())) return 8 * 60 + 30
  return d.getHours() * 60 + d.getMinutes()
}

export interface VehicleCapacityCheckInput {
  capacityKg: number
  capacityM3: number
  palletSlots: number
  isRefrigerated?: boolean
  status?: string
}

export interface DispatchLoadSummary {
  totalWeightKg: number
  totalVolumeM3: number
  totalPallets: number
  weightLoadPct: number
  volumeLoadPct: number
  palletLoadPct: number
  capacityLoadPct: number
  requiresColdChain: boolean
  isOverweight: boolean
  isOvervolume: boolean
  isOverpallet: boolean
  coldChainMismatch: boolean
  isValid: boolean
  warnings: string[]
}

export function evaluateVehicleCapacityLoad(
  vehicle: VehicleCapacityCheckInput | null | undefined,
  stops: Array<{
    weightKg?: number | null
    volumeM3?: number | null
    palletCount?: number | null
    requiresColdChain?: boolean | null
  }>
): DispatchLoadSummary {
  const totalWeightKg = Number(
    stops.reduce((s, x) => s + Math.max(0, Number(x.weightKg || 0)), 0).toFixed(2)
  )
  const totalVolumeM3 = Number(
    stops.reduce((s, x) => s + Math.max(0, Number(x.volumeM3 || 0)), 0).toFixed(2)
  )
  const totalPallets = stops.reduce((s, x) => s + Math.max(0, Math.round(Number(x.palletCount || 0))), 0)
  const requiresColdChain = stops.some((x) => Boolean(x.requiresColdChain))

  if (!vehicle) {
    return {
      totalWeightKg,
      totalVolumeM3,
      totalPallets,
      weightLoadPct: 0,
      volumeLoadPct: 0,
      palletLoadPct: 0,
      capacityLoadPct: 0,
      requiresColdChain,
      isOverweight: false,
      isOvervolume: false,
      isOverpallet: false,
      coldChainMismatch: false,
      isValid: true,
      warnings: ["Araç henüz atanmadı."],
    }
  }

  const maxKg = Math.max(1, Number(vehicle.capacityKg || 1500))
  const maxM3 = Math.max(0.5, Number(vehicle.capacityM3 || 10))
  const maxPal = Math.max(0, Number(vehicle.palletSlots || 0))

  const weightLoadPct = Number(((totalWeightKg / maxKg) * 100).toFixed(1))
  const volumeLoadPct = Number(((totalVolumeM3 / maxM3) * 100).toFixed(1))
  const palletLoadPct = maxPal > 0 ? Number(((totalPallets / maxPal) * 100).toFixed(1)) : 0
  const capacityLoadPct = Math.max(weightLoadPct, volumeLoadPct, palletLoadPct)

  const isOverweight = totalWeightKg > maxKg + 0.01
  const isOvervolume = totalVolumeM3 > maxM3 + 0.01
  const isOverpallet = maxPal > 0 && totalPallets > maxPal
  const coldChainMismatch = requiresColdChain && !vehicle.isRefrigerated

  const warnings: string[] = []
  if (isOverweight) {
    warnings.push(`Ağırlık kapasitesi aşıldı (${totalWeightKg} / ${maxKg} kg).`)
  }
  if (isOvervolume) {
    warnings.push(`Hacim kapasitesi aşıldı (${totalVolumeM3} / ${maxM3} m³).`)
  }
  if (isOverpallet) {
    warnings.push(`Palet kapasitesi aşıldı (${totalPallets} / ${maxPal} palet).`)
  }
  if (coldChainMismatch) {
    warnings.push("Soğuk zincir (+2/+6°C) gerektiren duraklar frigorifik olmayan araca atanamaz.")
  }

  return {
    totalWeightKg,
    totalVolumeM3,
    totalPallets,
    weightLoadPct,
    volumeLoadPct,
    palletLoadPct,
    capacityLoadPct,
    requiresColdChain,
    isOverweight,
    isOvervolume,
    isOverpallet,
    coldChainMismatch,
    isValid: !isOverweight && !isOvervolume && !isOverpallet && !coldChainMismatch,
    warnings,
  }
}

export interface DriverCompatibilityResult {
  compatible: boolean
  reasons: string[]
}

const LICENSE_CLASS_RANK: Record<string, number> = {
  B: 1,
  BE: 2,
  C1: 2,
  C: 3,
  CE: 4,
  D1: 2,
  D: 3,
  DE: 4,
}

export function evaluateDriverVehicleCompatibility(
  driver: {
    status?: string
    licenseClass?: string | null
    licenseExpiresAt?: string | Date | null
    srcExpiresAt?: string | Date | null
    psychotechExpiresAt?: string | Date | null
    shiftStart?: string | null
    shiftEnd?: string | null
  } | null | undefined,
  vehicle: {
    vehicleType?: string
    capacityKg?: number
    status?: string
  } | null | undefined,
  tripDepartureIso?: string | Date | null,
  estimatedDurationMin = 0,
  referenceNow: Date = new Date()
): DriverCompatibilityResult {
  const reasons: string[] = []

  if (vehicle && (vehicle.status === "MAINTENANCE" || vehicle.status === "FAULT" || vehicle.status === "OUT_OF_SERVICE")) {
    reasons.push(`Seçilen aracın durumu (${vehicle.status}) sefere çıkışa uygun değildir.`)
  }

  if (!driver) {
    return { compatible: reasons.length === 0, reasons }
  }

  if (driver.status === "SUSPENDED") {
    reasons.push("Şoför hesabı askıda (SUSPENDED).")
  }

  const lic = String(driver.licenseClass || "B").toUpperCase()
  const vehType = String(vehicle?.vehicleType || "PANEL_VAN").toUpperCase()
  const rank = LICENSE_CLASS_RANK[lic] ?? 1

  if (vehType === "TRUCK" && Number(vehicle?.capacityKg || 0) >= 3500 && rank < 3) {
    reasons.push(`Ağır tonaj kamyonet/kamyon için en az C sınıfı ehliyet gerekir (şoför: ${lic}).`)
  }
  if (vehType === "MINIBUS" && !["D", "DE", "D1"].includes(lic) && rank < 3) {
    reasons.push(`Minibüs için D/D1/C sınıfı ehliyet gerekir (şoför: ${lic}).`)
  }

  if (driver.licenseExpiresAt && new Date(driver.licenseExpiresAt).getTime() < referenceNow.getTime()) {
    reasons.push("Şoförün ehliyet geçerlilik süresi dolmuş.")
  }

  if (tripDepartureIso && driver.shiftStart && driver.shiftEnd) {
    const depMin = getDayMinuteFromDate(tripDepartureIso)
    const startMin = parseHhMmToMinutes(driver.shiftStart)
    const endMin = parseHhMmToMinutes(driver.shiftEnd)
    if (startMin !== null && endMin !== null && endMin > startMin) {
      if (depMin < startMin - 30 || depMin > endMin) {
        reasons.push(
          `Planlanan kalkış saati (${formatMinutesToHhMm(depMin)}) şoför vardiyası (${driver.shiftStart}–${driver.shiftEnd}) dışındadır.`
        )
      } else if (estimatedDurationMin > 0 && depMin + estimatedDurationMin > endMin + 90) {
        reasons.push(
          `Tahmini dönüş (${formatMinutesToHhMm(depMin + estimatedDurationMin)}) vardiya bitişini (${driver.shiftEnd}) 90 dk'dan fazla aşıyor.`
        )
      }
    }
  }

  return { compatible: reasons.length === 0, reasons }
}

export interface DispatchKpiSnapshot {
  totalTrips: number
  activeTrips: number
  completedTrips: number
  totalStops: number
  deliveredStops: number
  failedStops: number
  delayedStops: number
  pendingStops: number
  onTimeDeliveryRatePct: number
  failedDeliveryRatePct: number
  avgStopsPerVehicleDay: number
  avgCapacityLoadPct: number
  totalPlannedDistanceKm: number
  totalActualDistanceKm: number
  totalBaselineUnoptimizedKm: number
  distanceVarianceKm: number
  distanceVariancePct: number
  optimizationSavedKm: number
  optimizationSavedPct: number
  eWaybillIssuedTrips: number
  podCapturedStops: number
}

export function computeDispatchKpis(
  trips: Array<{
    id: string
    status: string
    vehicleId?: string | null
    plannedDateKey?: string | null
    capacityLoadPct?: number | null
    baselineUnoptimizedDistanceKm?: number | null
    plannedDistanceKm?: number | null
    actualDistanceKm?: number | null
    eWaybillNo?: string | null
  }>,
  stops: Array<{
    id: string
    tripId: string
    status: string
    delayMinutes?: number | null
  }>,
  proofs?: Array<{ stopId: string }>
): DispatchKpiSnapshot {
  const nonCancelledTrips = trips.filter((t) => t.status !== "IPTAL")
  const nonCancelledIds = new Set(nonCancelledTrips.map((t) => t.id))
  const validStops = stops.filter((s) => nonCancelledIds.has(s.tripId))

  const totalTrips = nonCancelledTrips.length
  const activeTrips = nonCancelledTrips.filter((t) =>
    ["ONAYLANDI", "YUKLENIYOR", "YOLDA", "TESLIMAT_SURUYOR"].includes(t.status)
  ).length
  const completedTrips = nonCancelledTrips.filter((t) => t.status === "TAMAMLANDI").length

  const totalStops = validStops.length
  const deliveredStops = validStops.filter(
    (s) => s.status === "TESLIM_EDILDI" || s.status === "KISMI_TESLIM"
  ).length
  const failedStops = validStops.filter((s) => s.status === "TESLIM_EDILEMEDI").length
  const delayedStops = validStops.filter((s) => Number(s.delayMinutes || 0) > 10).length
  const pendingStops = validStops.filter((s) => ["BEKLIYOR", "YOLDA", "VARISTA"].includes(s.status)).length

  const finishedCount = deliveredStops + failedStops
  const onTimeDelivered = validStops.filter(
    (s) =>
      (s.status === "TESLIM_EDILDI" || s.status === "KISMI_TESLIM") &&
      Number(s.delayMinutes || 0) <= 10
  ).length

  const onTimeDeliveryRatePct =
    deliveredStops > 0 ? Number(((onTimeDelivered / deliveredStops) * 100).toFixed(1)) : 0
  const failedDeliveryRatePct =
    finishedCount > 0 ? Number(((failedStops / finishedCount) * 100).toFixed(1)) : 0

  const vehicleDayKeys = new Set<string>()
  for (const t of nonCancelledTrips) {
    const key = `${t.vehicleId || t.id}::${t.plannedDateKey || "TODAY"}`
    vehicleDayKeys.add(key)
  }
  const avgStopsPerVehicleDay =
    vehicleDayKeys.size > 0 ? Number((totalStops / vehicleDayKeys.size).toFixed(1)) : 0

  const loadedTrips = nonCancelledTrips.filter((t) => Number(t.capacityLoadPct || 0) > 0)
  const avgCapacityLoadPct =
    loadedTrips.length > 0
      ? Number(
          (
            loadedTrips.reduce((s, t) => s + Number(t.capacityLoadPct || 0), 0) /
            loadedTrips.length
          ).toFixed(1)
        )
      : 0

  const totalPlannedDistanceKm = Number(
    nonCancelledTrips.reduce((s, t) => s + Number(t.plannedDistanceKm || 0), 0).toFixed(1)
  )
  const completedOrMeasuredTrips = nonCancelledTrips.filter((t) => Number(t.actualDistanceKm || 0) > 0)
  const totalActualDistanceKm = Number(
    nonCancelledTrips.reduce((s, t) => s + Number(t.actualDistanceKm || 0), 0).toFixed(1)
  )
  const plannedForVarianceKm = Number(
    completedOrMeasuredTrips.reduce((s, t) => s + Number(t.plannedDistanceKm || 0), 0).toFixed(1)
  )
  const distanceVarianceKm = Number((totalActualDistanceKm - plannedForVarianceKm).toFixed(1))
  const distanceVariancePct =
    plannedForVarianceKm > 0
      ? Number(((distanceVarianceKm / plannedForVarianceKm) * 100).toFixed(1))
      : 0

  const totalBaselineUnoptimizedKm = Number(
    nonCancelledTrips
      .reduce((s, t) => s + Number(t.baselineUnoptimizedDistanceKm || t.plannedDistanceKm || 0), 0)
      .toFixed(1)
  )
  const optimizationSavedKm = Number(
    Math.max(0, totalBaselineUnoptimizedKm - totalPlannedDistanceKm).toFixed(1)
  )
  const optimizationSavedPct =
    totalBaselineUnoptimizedKm > 0
      ? Number(((optimizationSavedKm / totalBaselineUnoptimizedKm) * 100).toFixed(1))
      : 0

  const proofStopIds = new Set((proofs || []).map((p) => p.stopId))

  return {
    totalTrips,
    activeTrips,
    completedTrips,
    totalStops,
    deliveredStops,
    failedStops,
    delayedStops,
    pendingStops,
    onTimeDeliveryRatePct,
    failedDeliveryRatePct,
    avgStopsPerVehicleDay,
    avgCapacityLoadPct,
    totalPlannedDistanceKm,
    totalActualDistanceKm,
    totalBaselineUnoptimizedKm,
    distanceVarianceKm,
    distanceVariancePct,
    optimizationSavedKm,
    optimizationSavedPct,
    eWaybillIssuedTrips: nonCancelledTrips.filter((t) => Boolean(t.eWaybillNo)).length,
    podCapturedStops: proofStopIds.size,
  }
}

export function buildNavigationDeepLinks(lat: number, lng: number, label?: string) {
  const q = encodeURIComponent(label || `${lat},${lng}`)
  return {
    googleMaps: `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}&travelmode=driving`,
    appleMaps: `https://maps.apple.com/?daddr=${lat},${lng}&dirflg=d&q=${q}`,
    yandexNavi: `https://yandex.com.tr/maps/?rtext=~${lat},${lng}&rtt=auto`,
  }
}
