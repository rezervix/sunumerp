/**
 * Sunum ERP — Lojistik Faz 5 (lojistik_filo): Filo, Araç, Şoför, Bakım, Yakıt, Maliyet ve Telematik
 * Saf Paylaşılan Tipler, Sabitler, KVKK Maskeleme ve Hesaplama Yardımcıları
 *
 * KURALLAR:
 * - Hem sunucu hem istemci ("use client") bileşenleri tarafından güvenle import edilebilir.
 * - fs, path, prisma/db veya audit modülleri ASLA import edilmez.
 * - CO2 emisyon katsayıları kod içine gömülmez; veritabanı / yapılandırma kayıtlarından okunur.
 */

export const FLEET_VEHICLE_TYPES = [
  "TRUCK",
  "FRIGO_VAN",
  "PANEL_VAN",
  "MINIBUS",
  "PASSENGER",
  "PICKUP",
] as const

export type FleetVehicleType = (typeof FLEET_VEHICLE_TYPES)[number]

export const FLEET_VEHICLE_TYPE_LABELS: Record<FleetVehicleType, string> = {
  TRUCK: "Kamyon / Yük Aracı",
  FRIGO_VAN: "Frigorifik Panelvan",
  PANEL_VAN: "Panelvan",
  MINIBUS: "Minibüs / Personel",
  PASSENGER: "Binek Araç",
  PICKUP: "Kamyonet / Pick-up",
}

export const FLEET_FUEL_TYPES = [
  "DIESEL",
  "PETROL",
  "LPG",
  "ELECTRIC",
  "HYBRID",
] as const

export type FleetFuelType = (typeof FLEET_FUEL_TYPES)[number]

export const FLEET_FUEL_TYPE_LABELS: Record<FleetFuelType, string> = {
  DIESEL: "Dizel / Motorin",
  PETROL: "Benzin",
  LPG: "Otogaz (LPG)",
  ELECTRIC: "Elektrikli",
  HYBRID: "Hibrit",
}

export const FLEET_OWNERSHIP_TYPES = ["OWNED", "LEASED", "RENTED"] as const
export type FleetOwnershipType = (typeof FLEET_OWNERSHIP_TYPES)[number]

export const FLEET_OWNERSHIP_LABELS: Record<FleetOwnershipType, string> = {
  OWNED: "Öz Mal",
  LEASED: "Uzun Dönem Kiralık (Leasing)",
  RENTED: "Kısa Dönem Kiralama",
}

export const FLEET_VEHICLE_STATUSES = [
  "ACTIVE",
  "IN_TRANSIT",
  "MAINTENANCE",
  "FAULT",
  "OUT_OF_SERVICE",
] as const

export type FleetVehicleStatus = (typeof FLEET_VEHICLE_STATUSES)[number]

export const FLEET_VEHICLE_STATUS_LABELS: Record<FleetVehicleStatus, string> = {
  ACTIVE: "Hazır / Aktif",
  IN_TRANSIT: "Seferde",
  MAINTENANCE: "Bakımda",
  FAULT: "Arızalı",
  OUT_OF_SERVICE: "Servis Dışı",
}

export const FLEET_VEHICLE_STATUS_BADGES: Record<FleetVehicleStatus, string> = {
  ACTIVE: "bg-[--brand]/15 text-[#1267E6] border-[--brand]/30",
  IN_TRANSIT: "bg-sky-500/15 text-sky-300 border-sky-500/30",
  MAINTENANCE: "bg-[var(--warn-soft)] text-[var(--warn)] border-[var(--warn-line)]",
  FAULT: "bg-[var(--bad-soft)] text-[var(--bad)] border-[var(--bad-line)]",
  OUT_OF_SERVICE: "bg-[var(--muted-bg)]/15 text-[var(--text-muted)] border-[var(--line)]",
}

export const FLEET_DOCUMENT_TYPES = [
  "MUAYENE",
  "TRAFIK_SIGORTASI",
  "KASKO",
  "MTV_VERGI",
  "RUHSAT",
  "FRIGO_KALIBRASYON",
] as const

export type FleetDocumentType = (typeof FLEET_DOCUMENT_TYPES)[number]

export const FLEET_DOCUMENT_TYPE_LABELS: Record<FleetDocumentType, string> = {
  MUAYENE: "TÜVTÜRK Muayene",
  TRAFIK_SIGORTASI: "Zorunlu Trafik Sigortası",
  KASKO: "Kasko Poliçesi",
  MTV_VERGI: "MTV / Vergi Yükümlülüğü",
  RUHSAT: "Trafik Tescil (Ruhsat)",
  FRIGO_KALIBRASYON: "Soğuk Zincir Kalibrasyon Belgesi",
}

export const FLEET_MAINT_PLAN_TYPES = [
  "CALENDAR",
  "METER_KM",
  "METER_HOURS",
  "CONDITION",
] as const

export type FleetMaintPlanType = (typeof FLEET_MAINT_PLAN_TYPES)[number]

export const FLEET_MAINT_WORK_ORDER_TYPES = [
  "PREVENTIVE",
  "BREAKDOWN",
  "TIRE_SERVICE",
  "INSPECTION_PREP",
] as const

export type FleetMaintWorkOrderType = (typeof FLEET_MAINT_WORK_ORDER_TYPES)[number]

export const FLEET_MAINT_WORK_ORDER_STATUSES = [
  "REQUESTED",
  "EVALUATED",
  "SCHEDULED",
  "IN_PROGRESS",
  "COMPLETED",
  "CANCELLED",
] as const

export type FleetMaintWorkOrderStatus =
  (typeof FLEET_MAINT_WORK_ORDER_STATUSES)[number]

export const FLEET_MAINT_STATUS_LABELS: Record<FleetMaintWorkOrderStatus, string> = {
  REQUESTED: "Talep Açıldı",
  EVALUATED: "Değerlendirildi",
  SCHEDULED: "Planlandı",
  IN_PROGRESS: "Serviste / İşlemde",
  COMPLETED: "Tamamlandı",
  CANCELLED: "İptal Edildi",
}

export const ALLOWED_FLEET_WO_TRANSITIONS: Record<
  FleetMaintWorkOrderStatus,
  readonly FleetMaintWorkOrderStatus[]
> = {
  REQUESTED: ["EVALUATED", "SCHEDULED", "IN_PROGRESS", "CANCELLED"],
  EVALUATED: ["SCHEDULED", "IN_PROGRESS", "CANCELLED"],
  SCHEDULED: ["IN_PROGRESS", "CANCELLED"],
  IN_PROGRESS: ["COMPLETED", "CANCELLED"],
  COMPLETED: [],
  CANCELLED: [],
}

export function canTransitionFleetWorkOrderStatus(
  from: FleetMaintWorkOrderStatus,
  to: FleetMaintWorkOrderStatus
): boolean {
  if (from === to) return false
  return ALLOWED_FLEET_WO_TRANSITIONS[from]?.includes(to) ?? false
}

export const TIRE_POSITIONS = [
  "FRONT_LEFT",
  "FRONT_RIGHT",
  "REAR_LEFT",
  "REAR_RIGHT",
  "REAR_INNER_LEFT",
  "REAR_INNER_RIGHT",
  "SPARE",
] as const

export type TirePosition = (typeof TIRE_POSITIONS)[number]

export const TIRE_POSITION_LABELS: Record<TirePosition, string> = {
  FRONT_LEFT: "Ön Sol",
  FRONT_RIGHT: "Ön Sağ",
  REAR_LEFT: "Arka Dış Sol",
  REAR_RIGHT: "Arka Dış Sağ",
  REAR_INNER_LEFT: "Arka İç Sol",
  REAR_INNER_RIGHT: "Arka İç Sağ",
  SPARE: "Stepne (Yedek)",
}

export const NORMALIZED_TELEMATIC_EVENT_TYPES = [
  "POSITION",
  "SPEED_VIOLATION",
  "IGNITION_ON",
  "IGNITION_OFF",
  "FUEL_LEVEL",
  "FUEL_REFILL",
  "IDLE_ALERT",
  "HARSH_BRAKE",
  "HARSH_ACCEL",
  "DRIVER_IDENT",
  "TEMP_ALERT",
] as const

export type NormalizedTelematicEventType =
  (typeof NORMALIZED_TELEMATIC_EVENT_TYPES)[number]

export const FLEET_COST_CATEGORIES = [
  "FUEL",
  "MAINTENANCE",
  "LEASE_DEPRECIATION",
  "DRIVER",
  "PENALTY",
  "INSURANCE_TAX",
] as const

export type FleetCostCategory = (typeof FLEET_COST_CATEGORIES)[number]

export const FLEET_COST_CATEGORY_LABELS: Record<FleetCostCategory, string> = {
  FUEL: "Yakıt",
  MAINTENANCE: "Bakım & Lastik",
  LEASE_DEPRECIATION: "Kira / Amortisman",
  DRIVER: "Sürücü / Harcırah",
  PENALTY: "Trafik Cezası",
  INSURANCE_TAX: "Sigorta & MTV",
}

// ── KVKK Maskeleme Yardımcıları ───────────────────────────────────────────────

export function maskTckn(value: string | null | undefined): string | null {
  if (!value) return null
  const clean = String(value).replace(/\s+/g, "")
  if (clean.length <= 4) return "****"
  return `${clean.slice(0, 3)}${"*".repeat(Math.max(2, clean.length - 6))}${clean.slice(-3)}`
}

export function maskPhone(value: string | null | undefined): string | null {
  if (!value) return null
  const clean = String(value).trim()
  if (clean.length <= 4) return "****"
  return `${clean.slice(0, Math.min(4, clean.length))} *** ** ${clean.slice(-2)}`
}

export function maskDocumentNo(value: string | null | undefined): string | null {
  if (!value) return null
  const clean = String(value).trim()
  if (clean.length <= 3) return "***"
  return `${clean.slice(0, 2)}${"*".repeat(Math.max(2, clean.length - 5))}${clean.slice(-3)}`
}

export function maskAddress(value: string | null | undefined): string | null {
  if (!value) return null
  const clean = String(value).trim()
  if (clean.length <= 6) return "******"
  const parts = clean.split(/[,\s]+/).filter(Boolean)
  if (parts.length >= 2) {
    return `${parts[0].slice(0, 2)}*** / ${parts[parts.length - 1]}`
  }
  return `${clean.slice(0, 3)}***`
}

export interface KvkkMaskedDriverResult<T extends Record<string, any>> {
  driver: T & { isKvkkMasked: boolean }
  maskedFields: string[]
}

export function applyDriverKvkkMasking<T extends Record<string, any>>(
  driver: T,
  canViewSensitivePii: boolean
): KvkkMaskedDriverResult<T> {
  if (canViewSensitivePii) {
    return {
      driver: { ...driver, isKvkkMasked: false },
      maskedFields: [],
    }
  }
  const maskedFields: string[] = []
  const copy: Record<string, any> = { ...driver, isKvkkMasked: true }

  if (copy.tckn) {
    copy.tckn = maskTckn(copy.tckn)
    maskedFields.push("tckn")
  }
  if (copy.phone) {
    copy.phone = maskPhone(copy.phone)
    maskedFields.push("phone")
  }
  if (copy.licenseNumber) {
    copy.licenseNumber = maskDocumentNo(copy.licenseNumber)
    maskedFields.push("licenseNumber")
  }
  if (copy.srcNumber) {
    copy.srcNumber = maskDocumentNo(copy.srcNumber)
    maskedFields.push("srcNumber")
  }
  if (copy.psychotechNumber) {
    copy.psychotechNumber = maskDocumentNo(copy.psychotechNumber)
    maskedFields.push("psychotechNumber")
  }
  if (copy.homeAddress) {
    copy.homeAddress = maskAddress(copy.homeAddress)
    maskedFields.push("homeAddress")
  }
  if (copy.emergencyContact) {
    copy.emergencyContact = "KVKK Kapsamında Gizli"
    maskedFields.push("emergencyContact")
  }

  return {
    driver: copy as T & { isKvkkMasked: boolean },
    maskedFields,
  }
}

// ── Belge & Bakım Vade Değerlendirmesi ────────────────────────────────────────

export interface ExpiryEvaluation {
  status: "EXPIRED" | "EXPIRING_SOON" | "VALID" | "UNKNOWN"
  daysRemaining: number | null
}

export function evaluateExpiryStatus(
  expiresAt: string | Date | null | undefined,
  warningDays = 30,
  referenceNow: Date = new Date()
): ExpiryEvaluation {
  if (!expiresAt) return { status: "UNKNOWN", daysRemaining: null }
  const exp = new Date(expiresAt)
  if (Number.isNaN(exp.getTime())) return { status: "UNKNOWN", daysRemaining: null }

  const diffMs = exp.getTime() - referenceNow.getTime()
  const daysRemaining = Math.ceil(diffMs / 86_400_000)
  if (daysRemaining < 0) return { status: "EXPIRED", daysRemaining }
  if (daysRemaining <= warningDays) return { status: "EXPIRING_SOON", daysRemaining }
  return { status: "VALID", daysRemaining }
}

export interface FleetMaintenanceDueResult {
  isDue: boolean
  isSoon: boolean
  reason: string | null
  remainingKm: number | null
  remainingDays: number | null
}

export function evaluateFleetMaintenanceDue(
  plan: {
    planType: string
    isActive?: boolean
    frequencyKm?: number | null
    lastTriggeredKm?: number | null
    frequencyHours?: number | null
    lastTriggeredHours?: number | null
    frequencyDays?: number | null
    nextScheduledDate?: string | Date | null
  },
  currentOdometerKm: number,
  currentEngineHours = 0,
  referenceNow: Date = new Date(),
  soonKmThreshold = 1000,
  soonDaysThreshold = 14
): FleetMaintenanceDueResult {
  if (plan.isActive === false) {
    return { isDue: false, isSoon: false, reason: null, remainingKm: null, remainingDays: null }
  }

  let remainingKm: number | null = null
  let remainingDays: number | null = null
  let isDue = false
  let isSoon = false
  const reasons: string[] = []

  if ((plan.planType === "METER_KM" || plan.frequencyKm) && Number(plan.frequencyKm) > 0) {
    const freqKm = Number(plan.frequencyKm)
    const lastKm = Number(plan.lastTriggeredKm ?? 0)
    const nextDueKm = lastKm + freqKm
    remainingKm = Number((nextDueKm - currentOdometerKm).toFixed(1))
    if (remainingKm <= 0) {
      isDue = true
      reasons.push(`Km bakım eşiği aşıldı (${currentOdometerKm.toLocaleString("tr-TR")} / ${nextDueKm.toLocaleString("tr-TR")} km)`)
    } else if (remainingKm <= soonKmThreshold) {
      isSoon = true
      reasons.push(`Km bakımına ${remainingKm.toLocaleString("tr-TR")} km kaldı`)
    }
  }

  if (plan.planType === "METER_HOURS" && Number(plan.frequencyHours) > 0) {
    const freqH = Number(plan.frequencyHours)
    const lastH = Number(plan.lastTriggeredHours ?? 0)
    const deltaH = currentEngineHours - lastH
    if (deltaH >= freqH) {
      isDue = true
      reasons.push(`Motor/frigo saat eşiği doldu (${deltaH.toFixed(1)} / ${freqH} saat)`)
    } else if (freqH - deltaH <= 50) {
      isSoon = true
      reasons.push(`Saat bazlı bakıma ${(freqH - deltaH).toFixed(1)} saat kaldı`)
    }
  }

  if ((plan.planType === "CALENDAR" || plan.nextScheduledDate) && plan.nextScheduledDate) {
    const exp = evaluateExpiryStatus(plan.nextScheduledDate, soonDaysThreshold, referenceNow)
    remainingDays = exp.daysRemaining
    if (exp.status === "EXPIRED") {
      isDue = true
      reasons.push(`Takvim bakımı ${Math.abs(exp.daysRemaining ?? 0)} gün gecikti`)
    } else if (exp.status === "EXPIRING_SOON") {
      isSoon = true
      reasons.push(`Takvim bakımına ${exp.daysRemaining} gün kaldı`)
    }
  }

  return {
    isDue,
    isSoon: isSoon && !isDue,
    reason: reasons.length > 0 ? reasons.join(" | ") : null,
    remainingKm,
    remainingDays,
  }
}

// ── Yakıt Tüketimi (L/100km), Anormallik & Fatura Mutabakatı ─────────────────

export interface FuelLogEntryLike {
  id: string
  vehicleId: string
  fuelDate: string | Date
  odometerKm: number
  liters: number
  totalAmountTry: number
  fullTank?: boolean | null
  invoiceRef?: string | null
  invoiceLiters?: number | null
  invoiceAmountTry?: number | null
  source?: string | null // MANUAL | FUEL_CARD_IMPORT | TELEMETICS
}

export interface FuelSegmentAnalysis {
  logId: string
  distanceKm: number | null
  litersPer100Km: number | null
  isAnomaly: boolean
  anomalyRatioPct: number | null
  literVariance: number | null
  amountVarianceTry: number | null
}

export interface VehicleFuelReconciliationSummary {
  vehicleId: string
  totalLitersLogged: number
  totalAmountLoggedTry: number
  totalInvoiceLiters: number
  totalInvoiceAmountTry: number
  totalDistanceKm: number
  avgLitersPer100Km: number | null
  literVariance: number
  literVariancePct: number
  amountVarianceTry: number
  anomalyCount: number
  reconciliationStatus: "MATCHED" | "VARIANCE_WARNING" | "NO_INVOICE"
  segments: FuelSegmentAnalysis[]
}

export function analyzeVehicleFuelLogs(
  vehicleId: string,
  logs: FuelLogEntryLike[],
  expectedBaselineLPer100Km = 14,
  anomalyThresholdPct = 25,
  reconciliationTolerancePct = 3
): VehicleFuelReconciliationSummary {
  const sorted = [...logs]
    .filter((l) => l.vehicleId === vehicleId)
    .sort((a, b) => {
      const odoDiff = Number(a.odometerKm || 0) - Number(b.odometerKm || 0)
      if (odoDiff !== 0) return odoDiff
      return new Date(a.fuelDate).getTime() - new Date(b.fuelDate).getTime()
    })

  let totalLitersLogged = 0
  let totalAmountLoggedTry = 0
  let totalInvoiceLiters = 0
  let totalInvoiceAmountTry = 0
  let totalDistanceForAvg = 0
  let totalLitersForAvg = 0
  let anomalyCount = 0
  const segments: FuelSegmentAnalysis[] = []

  for (let i = 0; i < sorted.length; i++) {
    const cur = sorted[i]
    const liters = Math.max(0, Number(cur.liters || 0))
    const amount = Math.max(0, Number(cur.totalAmountTry || 0))
    totalLitersLogged += liters
    totalAmountLoggedTry += amount

    const hasInvL = cur.invoiceLiters !== undefined && cur.invoiceLiters !== null
    const hasInvA = cur.invoiceAmountTry !== undefined && cur.invoiceAmountTry !== null
    if (hasInvL) totalInvoiceLiters += Number(cur.invoiceLiters)
    if (hasInvA) totalInvoiceAmountTry += Number(cur.invoiceAmountTry)

    let distanceKm: number | null = null
    let litersPer100Km: number | null = null
    let isAnomaly = false
    let anomalyRatioPct: number | null = null

    if (i > 0) {
      const prevOdo = Number(sorted[i - 1].odometerKm || 0)
      const curOdo = Number(cur.odometerKm || 0)
      const dist = curOdo - prevOdo
      if (dist > 0) {
        distanceKm = Number(dist.toFixed(1))
        totalDistanceForAvg += dist
        totalLitersForAvg += liters
        litersPer100Km = Number(((liters / dist) * 100).toFixed(2))
        if (expectedBaselineLPer100Km > 0) {
          const ratio = ((litersPer100Km - expectedBaselineLPer100Km) / expectedBaselineLPer100Km) * 100
          anomalyRatioPct = Number(ratio.toFixed(1))
          if (ratio >= anomalyThresholdPct) {
            isAnomaly = true
            anomalyCount++
          }
        }
      }
    }

    segments.push({
      logId: cur.id,
      distanceKm,
      litersPer100Km,
      isAnomaly,
      anomalyRatioPct,
      literVariance: hasInvL ? Number((Number(cur.invoiceLiters) - liters).toFixed(2)) : null,
      amountVarianceTry: hasInvA ? Number((Number(cur.invoiceAmountTry) - amount).toFixed(2)) : null,
    })
  }

  const avgLitersPer100Km =
    totalDistanceForAvg > 0
      ? Number(((totalLitersForAvg / totalDistanceForAvg) * 100).toFixed(2))
      : null

  const literVariance = Number((totalInvoiceLiters - totalLitersLogged).toFixed(2))
  const literVariancePct =
    totalLitersLogged > 0 && totalInvoiceLiters > 0
      ? Number(((Math.abs(literVariance) / totalLitersLogged) * 100).toFixed(2))
      : 0
  const amountVarianceTry = Number((totalInvoiceAmountTry - totalAmountLoggedTry).toFixed(2))

  let reconciliationStatus: "MATCHED" | "VARIANCE_WARNING" | "NO_INVOICE" = "NO_INVOICE"
  if (totalInvoiceLiters > 0 || totalInvoiceAmountTry > 0) {
    reconciliationStatus =
      literVariancePct > reconciliationTolerancePct || Math.abs(amountVarianceTry) > 250
        ? "VARIANCE_WARNING"
        : "MATCHED"
  }

  return {
    vehicleId,
    totalLitersLogged: Number(totalLitersLogged.toFixed(2)),
    totalAmountLoggedTry: Number(totalAmountLoggedTry.toFixed(2)),
    totalInvoiceLiters: Number(totalInvoiceLiters.toFixed(2)),
    totalInvoiceAmountTry: Number(totalInvoiceAmountTry.toFixed(2)),
    totalDistanceKm: Number(totalDistanceForAvg.toFixed(1)),
    avgLitersPer100Km,
    literVariance,
    literVariancePct,
    amountVarianceTry,
    anomalyCount,
    reconciliationStatus,
    segments,
  }
}

// ── TCO (Km Başı Maliyet), Eko-Sürüş & Yapılandırılabilir CO2 Tahmini ─────────

export interface VehicleTcoBreakdown {
  fuelCostTry: number
  maintenanceCostTry: number
  leaseDepreciationTry: number
  driverCostTry: number
  penaltyCostTry: number
  insuranceTaxTry: number
  totalCostTry: number
  totalDistanceKm: number
  costPerKmTry: number
}

export function computeVehicleTco(
  totals: Partial<Omit<VehicleTcoBreakdown, "totalCostTry" | "costPerKmTry">>,
  totalDistanceKm: number
): VehicleTcoBreakdown {
  const fuelCostTry = Number((totals.fuelCostTry || 0).toFixed(2))
  const maintenanceCostTry = Number((totals.maintenanceCostTry || 0).toFixed(2))
  const leaseDepreciationTry = Number((totals.leaseDepreciationTry || 0).toFixed(2))
  const driverCostTry = Number((totals.driverCostTry || 0).toFixed(2))
  const penaltyCostTry = Number((totals.penaltyCostTry || 0).toFixed(2))
  const insuranceTaxTry = Number((totals.insuranceTaxTry || 0).toFixed(2))
  const totalCostTry = Number(
    (
      fuelCostTry +
      maintenanceCostTry +
      leaseDepreciationTry +
      driverCostTry +
      penaltyCostTry +
      insuranceTaxTry
    ).toFixed(2)
  )
  const safeKm = Math.max(0, Number(totalDistanceKm || 0))
  const costPerKmTry = safeKm > 0 ? Number((totalCostTry / safeKm).toFixed(2)) : 0

  return {
    fuelCostTry,
    maintenanceCostTry,
    leaseDepreciationTry,
    driverCostTry,
    penaltyCostTry,
    insuranceTaxTry,
    totalCostTry,
    totalDistanceKm: Number(safeKm.toFixed(1)),
    costPerKmTry,
  }
}

export interface EcoDrivingScoreResult {
  score: number // 0 - 100
  grade: "MÜKEMMEL" | "İYİ" | "ORTA" | "RİSKLİ"
  idleMinutes: number
  speedViolationCount: number
  harshBrakeCount: number
  harshAccelCount: number
}

export function computeEcoDrivingScore(input: {
  idleMinutes: number
  speedViolationCount: number
  harshBrakeCount: number
  harshAccelCount: number
  distanceKm: number
}): EcoDrivingScoreResult {
  const safeDistFactor = Math.max(1, Number(input.distanceKm || 0) / 100)
  const idlePenalty = (Math.max(0, input.idleMinutes) / 15) * (1.2 / Math.max(1, Math.sqrt(safeDistFactor)))
  const speedPenalty = (Math.max(0, input.speedViolationCount) * 6) / Math.max(1, Math.sqrt(safeDistFactor))
  const brakePenalty = (Math.max(0, input.harshBrakeCount) * 4) / Math.max(1, Math.sqrt(safeDistFactor))
  const accelPenalty = (Math.max(0, input.harshAccelCount) * 3) / Math.max(1, Math.sqrt(safeDistFactor))

  const raw = 100 - idlePenalty - speedPenalty - brakePenalty - accelPenalty
  const score = Number(Math.max(0, Math.min(100, raw)).toFixed(1))
  const grade =
    score >= 85 ? "MÜKEMMEL" : score >= 70 ? "İYİ" : score >= 50 ? "ORTA" : "RİSKLİ"

  return {
    score,
    grade,
    idleMinutes: Math.max(0, Math.round(input.idleMinutes)),
    speedViolationCount: Math.max(0, Math.round(input.speedViolationCount)),
    harshBrakeCount: Math.max(0, Math.round(input.harshBrakeCount)),
    harshAccelCount: Math.max(0, Math.round(input.harshAccelCount)),
  }
}

export interface Co2FactorRecordInput {
  fuelType: string
  kgCo2ePerUnit: number
  unit: string
  sourceName: string
  sourceYear: number
  sourceVersion?: string | null
  sourceUrl?: string | null
}

export interface Co2EstimateResult {
  fuelType: string
  quantity: number
  unit: string
  factorKgCo2ePerUnit: number
  totalKgCo2e: number
  totalTonnesCo2e: number
  isEstimate: true
  sourceName: string
  sourceYear: number
  sourceVersion: string | null
  sourceUrl: string | null
}

export function estimateCo2EmissionsFromFactor(
  quantity: number,
  factor: Co2FactorRecordInput
): Co2EstimateResult {
  const qty = Math.max(0, Number(quantity || 0))
  const coeff = Math.max(0, Number(factor.kgCo2ePerUnit || 0))
  const totalKgCo2e = Number((qty * coeff).toFixed(2))
  return {
    fuelType: factor.fuelType,
    quantity: Number(qty.toFixed(2)),
    unit: factor.unit,
    factorKgCo2ePerUnit: coeff,
    totalKgCo2e,
    totalTonnesCo2e: Number((totalKgCo2e / 1000).toFixed(4)),
    isEstimate: true,
    sourceName: factor.sourceName,
    sourceYear: factor.sourceYear,
    sourceVersion: factor.sourceVersion ?? null,
    sourceUrl: factor.sourceUrl ?? null,
  }
}
