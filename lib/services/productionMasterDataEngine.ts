/**
 * Sunum ERP — Üretim Ana Verileri (Master Data) Saf İş Mantığı Motoru
 *
 * Bu modül veritabanından bağımsızdır (Pure TypeScript).
 * Kapsam:
 * 1. İş Merkezi / İstasyon doğrulama ve efektif kapasite/maliyet hesaplamaları
 * 2. Makine / Ekipman (Varlık) doğrulama, garanti ve sayaç kuralları
 * 3. Çalışma Takvimi, Vardiya net süre hesabı (gece vardiyası destekli), Tatil ve İstisna takvim motoru
 * 4. Üretim Parametreleri doğrulama ve varsayılan fabrika parametre üretimi
 * 5. Stok/Ürün Kartı 1-1 Üretim Profili doğrulama ve eşleştirme kuralları
 */

import { ProductionDomainError } from "@/lib/services/productionAuditAndError"

// ═══════════════════════════════════════════════════════════════════════════════
// 1. SABİTLER VE TÜRKÇE ETİKET SÖZLÜKLERİ
// ═══════════════════════════════════════════════════════════════════════════════

export const WORK_CENTER_TYPES = ["MACHINE", "MANUAL", "OUTSOURCE"] as const
export type WorkCenterType = (typeof WORK_CENTER_TYPES)[number]

export const WORK_CENTER_TYPE_LABELS: Record<WorkCenterType, string> = {
  MACHINE: "Makine / Otomatik İstasyon",
  MANUAL: "Manuel / El İşçiliği İstasyonu",
  OUTSOURCE: "Dış Kaynak / Fason İstasyon",
}

export const MACHINE_STATUSES = [
  "ACTIVE",
  "MAINTENANCE",
  "FAULT",
  "STANDBY",
  "DECOMMISSIONED",
] as const
export type MachineStatus = (typeof MACHINE_STATUSES)[number]

export const MACHINE_STATUS_LABELS: Record<MachineStatus, string> = {
  ACTIVE: "Çalışıyor (Aktif)",
  MAINTENANCE: "Periyodik Bakımda",
  FAULT: "Arızalı / Duruşta",
  STANDBY: "Beklemede (Yedek)",
  DECOMMISSIONED: "Kullanım Dışı",
}

export const CALENDAR_EXCEPTION_TYPES = [
  "OVERTIME",
  "CLOSED",
  "REDUCED_CAPACITY",
  "SHIFT_OVERRIDE",
] as const
export type CalendarExceptionType = (typeof CALENDAR_EXCEPTION_TYPES)[number]

export const CALENDAR_EXCEPTION_TYPE_LABELS: Record<CalendarExceptionType, string> = {
  OVERTIME: "Fazla Mesai (+)",
  CLOSED: "Kapalı / Planlı Duruş",
  REDUCED_CAPACITY: "Kısıtlı Kapasite",
  SHIFT_OVERRIDE: "Özel Vardiya",
}

export const WEEKDAY_CODES = ["MON", "TUE", "WED", "THU", "FRI", "SAT", "SUN"] as const
export type WeekdayCode = (typeof WEEKDAY_CODES)[number]

export const WEEKDAY_LABELS: Record<WeekdayCode, string> = {
  MON: "Pazartesi",
  TUE: "Salı",
  WED: "Çarşamba",
  THU: "Perşembe",
  FRI: "Cuma",
  SAT: "Cumartesi",
  SUN: "Pazar",
}

export const PLANNING_BUCKETS = ["DAILY", "WEEKLY", "MONTHLY"] as const
export type PlanningBucket = (typeof PLANNING_BUCKETS)[number]

export const PLANNING_BUCKET_LABELS: Record<PlanningBucket, string> = {
  DAILY: "Günlük Dilim",
  WEEKLY: "Haftalık Dilim",
  MONTHLY: "Aylık Dilim",
}

export const LOT_SIZING_RULES = ["L4L", "FOQ", "EOQ", "POQ"] as const
export type LotSizingRule = (typeof LOT_SIZING_RULES)[number]

export const LOT_SIZING_RULE_LABELS: Record<LotSizingRule, string> = {
  L4L: "Lot-for-Lot (Birebir İhtiyaç)",
  FOQ: "Sabit Sipariş Miktarı (FOQ)",
  EOQ: "Ekonomik Sipariş Miktarı (EOQ)",
  POQ: "Periyodik Sipariş Miktarı (POQ)",
}

export const SAFETY_STOCK_RULES = ["FIXED", "DAYS_OF_SUPPLY", "PERCENTAGE"] as const
export type SafetyStockRule = (typeof SAFETY_STOCK_RULES)[number]

export const SAFETY_STOCK_RULE_LABELS: Record<SafetyStockRule, string> = {
  FIXED: "Sabit Güvenlik Stoğu",
  DAYS_OF_SUPPLY: "Günlük Tedarik Karşılığı (Gün)",
  PERCENTAGE: "Talep Yüzdesi (%)",
}

export const PRODUCTION_ITEM_TYPES = [
  "HAMMADDE",
  "YARI_MAMUL",
  "MAMUL",
  "SARF_MALZEME",
  "TICARI_MAL",
] as const
export type ProductionItemType = (typeof PRODUCTION_ITEM_TYPES)[number]

export const PRODUCTION_ITEM_TYPE_LABELS: Record<ProductionItemType, string> = {
  HAMMADDE: "Hammadde",
  YARI_MAMUL: "Yarı Mamul",
  MAMUL: "Mamul (Bitmiş Ürün)",
  SARF_MALZEME: "Sarf Malzeme",
  TICARI_MAL: "Ticari Mal",
}

export const PRODUCTION_METHODS = [
  "MAKE_TO_STOCK",
  "MAKE_TO_ORDER",
  "ASSEMBLE_TO_ORDER",
  "SUBCONTRACT",
  "PURCHASE_ONLY",
] as const
export type ProductionMethod = (typeof PRODUCTION_METHODS)[number]

export const PRODUCTION_METHOD_LABELS: Record<ProductionMethod, string> = {
  MAKE_TO_STOCK: "Stok İçin Üretim (MTS)",
  MAKE_TO_ORDER: "Siparişe Göre Üretim (MTO)",
  ASSEMBLE_TO_ORDER: "Siparişe Göre Montaj (ATO)",
  SUBCONTRACT: "Dış Kaynak / Fason Üretim",
  PURCHASE_ONLY: "Sadece Satınalma (Üretilmez)",
}

export const WORK_ORDER_STATUS_FLOW_DEFAULT = [
  "DRAFT",
  "PLANNED",
  "RELEASED",
  "IN_PROGRESS",
  "QA_PENDING",
  "COMPLETED",
] as const

export const WORK_ORDER_STATUS_LABELS: Record<string, string> = {
  DRAFT: "Taslak",
  PLANNED: "Planlandı",
  RELEASED: "Serbest Bırakıldı",
  IN_PROGRESS: "Üretimde",
  QA_PENDING: "Kalite Kontrol Bekliyor",
  COMPLETED: "Tamamlandı",
  CANCELLED: "İptal Edildi",
}

// ═══════════════════════════════════════════════════════════════════════════════
// 2. VARDİYA SÜRE VE İŞ MERKEZİ EFEKTİF KAPASİTE HESAPLAMALARI
// ═══════════════════════════════════════════════════════════════════════════════

const TIME_HHMM_REGEX = /^([01]\d|2[0-3]):([0-5]\d)$/
const DATE_YYYYMMDD_REGEX = /^\d{4}-(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])$/

/**
 * Başlangıç saati ("08:00"), bitiş saati ("17:00" veya gece vardiyası "06:00")
 * ve mola süresinden (dk) net çalışma süresini (dakika olarak) hesaplar.
 */
export function calculateShiftNetWorkingMinutes(
  startTime: string,
  endTime: string,
  breakMinutes: number
): { grossMinutes: number; netWorkingMinutes: number; netHours: number } {
  const cleanStart = String(startTime || "").trim()
  const cleanEnd = String(endTime || "").trim()

  if (!TIME_HHMM_REGEX.test(cleanStart) || !TIME_HHMM_REGEX.test(cleanEnd)) {
    throw new ProductionDomainError(
      "Vardiya başlangıç ve bitiş saatleri SS:DD (Örn: 08:00 - 17:00) formatında olmalıdır.",
      "VALIDATION_ERROR",
      400
    )
  }

  const [sh, sm] = cleanStart.split(":").map(Number)
  const [eh, em] = cleanEnd.split(":").map(Number)

  const startTotal = sh * 60 + sm
  let endTotal = eh * 60 + em

  // Gece yarısını aşan vardiya desteği (Örn: 22:00 -> 06:00)
  if (endTotal <= startTotal) {
    endTotal += 24 * 60
  }

  const grossMinutes = endTotal - startTotal
  const brk = Math.max(0, Math.round(Number(breakMinutes || 0)))

  if (brk >= grossMinutes) {
    throw new ProductionDomainError(
      `Mola süresi (${brk} dk), toplam vardiya süresinden (${grossMinutes} dk) küçük olmalıdır.`,
      "VALIDATION_ERROR",
      400
    )
  }

  const netWorkingMinutes = grossMinutes - brk
  const netHours = Number((netWorkingMinutes / 60).toFixed(2))

  return {
    grossMinutes,
    netWorkingMinutes,
    netHours,
  }
}

export interface WorkCenterCapacityMetrics {
  theoreticalUnitsPerHour: number
  efficiencyPercent: number
  effectiveUnitsPerHour: number
  shiftNetHours: number
  effectiveDailyCapacityUnits: number
  hourlyCost: number
  effectiveUnitCost: number
}

/**
 * İş merkezinin teorik kapasitesi, verimlilik yüzdesi, saatlik maliyeti ve
 * bağlı vardiyanın net çalışma süresine göre efektif üretim kapasitesini hesaplar.
 */
export function calculateEffectiveWorkCenterCapacity(params: {
  capacityPerHour: number
  efficiencyPercent: number
  hourlyCost: number
  shiftNetWorkingMinutes?: number
  shiftCapacityMultiplier?: number
}): WorkCenterCapacityMetrics {
  const theoreticalUnitsPerHour = Math.max(0, Number(params.capacityPerHour || 0))
  const efficiencyPercent = Math.max(1, Math.min(200, Number(params.efficiencyPercent || 100)))
  const hourlyCost = Math.max(0, Number(params.hourlyCost || 0))
  const shiftMinutes =
    params.shiftNetWorkingMinutes !== undefined && params.shiftNetWorkingMinutes > 0
      ? Number(params.shiftNetWorkingMinutes)
      : 480 // Varsayılan 8 saat (480 dk)
  const multiplier =
    params.shiftCapacityMultiplier !== undefined && params.shiftCapacityMultiplier > 0
      ? Number(params.shiftCapacityMultiplier)
      : 1.0

  const effectiveUnitsPerHour = Number(
    (theoreticalUnitsPerHour * (efficiencyPercent / 100)).toFixed(2)
  )
  const shiftNetHours = Number(((shiftMinutes / 60) * multiplier).toFixed(2))
  const effectiveDailyCapacityUnits = Number(
    (effectiveUnitsPerHour * shiftNetHours).toFixed(2)
  )
  const effectiveUnitCost =
    effectiveUnitsPerHour > 0
      ? Number((hourlyCost / effectiveUnitsPerHour).toFixed(2))
      : Number(hourlyCost.toFixed(2))

  return {
    theoreticalUnitsPerHour,
    efficiencyPercent,
    effectiveUnitsPerHour,
    shiftNetHours,
    effectiveDailyCapacityUnits,
    hourlyCost,
    effectiveUnitCost,
  }
}

const JS_DAY_TO_WEEKDAY: Record<number, WeekdayCode> = {
  0: "SUN",
  1: "MON",
  2: "TUE",
  3: "WED",
  4: "THU",
  5: "FRI",
  6: "SAT",
}

/**
 * Belirli bir tarihte (YYYY-MM-DD) iş merkezinin çalışma takvimi, vardiya,
 * tatil günleri ve iş merkezi bazlı istisnalarına göre kullanılabilir kapasitesini değerlendirir.
 */
export function evaluateWorkCenterAvailabilityOnDate(params: {
  dateStr: string
  workingDays: WeekdayCode[]
  defaultShiftMinutes?: number
  holidays?: Array<{ holidayDate: string; name: string; isHalfDay?: boolean; isRecurringYearly?: boolean }>
  exceptions?: Array<{
    workCenterId: string
    exceptionDate: string
    exceptionType: CalendarExceptionType
    availableHours: number
    capacityPercent: number
    reason?: string | null
  }>
  workCenterId?: string
}): {
  dateStr: string
  weekday: WeekdayCode
  isWorkingDay: boolean
  status: "WORKING" | "HOLIDAY" | "HALF_HOLIDAY" | "WEEKEND_OFF" | "EXCEPTION_CLOSED" | "EXCEPTION_OVERTIME" | "EXCEPTION_MODIFIED"
  availableHours: number
  capacityFactor: number
  note: string
} {
  const { dateStr, workingDays, defaultShiftMinutes = 480, holidays = [], exceptions = [], workCenterId } = params

  const parsedDate = new Date(`${dateStr}T12:00:00Z`)
  const weekday = JS_DAY_TO_WEEKDAY[parsedDate.getUTCDay()] || "MON"
  const baseHours = Number((defaultShiftMinutes / 60).toFixed(2))

  // 1. Önce iş merkezi bazlı istisna kontrolü (en yüksek öncelik)
  const matchingException = exceptions.find(
    (ex) =>
      ex.exceptionDate === dateStr &&
      (!workCenterId || ex.workCenterId === workCenterId)
  )

  if (matchingException) {
    if (matchingException.exceptionType === "CLOSED") {
      return {
        dateStr,
        weekday,
        isWorkingDay: false,
        status: "EXCEPTION_CLOSED",
        availableHours: 0,
        capacityFactor: 0,
        note: matchingException.reason || "İş merkezi istisnası: Kapalı / Duruş",
      }
    }

    if (matchingException.exceptionType === "OVERTIME") {
      const totalHours = Number((baseHours + Number(matchingException.availableHours || 0)).toFixed(2))
      return {
        dateStr,
        weekday,
        isWorkingDay: true,
        status: "EXCEPTION_OVERTIME",
        availableHours: totalHours,
        capacityFactor: Number((matchingException.capacityPercent || 100) / 100),
        note: matchingException.reason || "Fazla mesai tanımlı",
      }
    }

    return {
      dateStr,
      weekday,
      isWorkingDay: Number(matchingException.availableHours || 0) > 0,
      status: "EXCEPTION_MODIFIED",
      availableHours: Number(matchingException.availableHours || 0),
      capacityFactor: Number((matchingException.capacityPercent || 100) / 100),
      note: matchingException.reason || "Kapasite / Vardiya istisnası",
    }
  }

  // 2. Tatil günü kontrolü (Tam tarih veya yıllık tekrarlayan AA-GG eşleşmesi)
  const monthDay = dateStr.slice(5)
  const matchingHoliday = holidays.find(
    (h) =>
      h.holidayDate === dateStr ||
      (h.isRecurringYearly && h.holidayDate.slice(5) === monthDay)
  )

  if (matchingHoliday) {
    if (matchingHoliday.isHalfDay) {
      return {
        dateStr,
        weekday,
        isWorkingDay: true,
        status: "HALF_HOLIDAY",
        availableHours: Number((baseHours / 2).toFixed(2)),
        capacityFactor: 0.5,
        note: `${matchingHoliday.name} (Yarım Gün)`,
      }
    }
    return {
      dateStr,
      weekday,
      isWorkingDay: false,
      status: "HOLIDAY",
      availableHours: 0,
      capacityFactor: 0,
      note: matchingHoliday.name,
    }
  }

  // 3. Standart çalışma günü kontrolü
  const isWorking = workingDays.includes(weekday)
  if (!isWorking) {
    return {
      dateStr,
      weekday,
      isWorkingDay: false,
      status: "WEEKEND_OFF",
      availableHours: 0,
      capacityFactor: 0,
      note: `${WEEKDAY_LABELS[weekday]} (Hafta Tatili)`,
    }
  }

  return {
    dateStr,
    weekday,
    isWorkingDay: true,
    status: "WORKING",
    availableHours: baseHours,
    capacityFactor: 1,
    note: "Standart Çalışma Günü",
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// 3. GİRDİ DOĞRULAMA (VALIDATION) KURALLARI
// ═══════════════════════════════════════════════════════════════════════════════

export interface WorkCenterValidatedInput {
  branchId: string | null
  warehouseId: string | null
  code: string
  name: string
  type: WorkCenterType
  hourlyCost: number
  capacityPerHour: number
  efficiencyPercent: number
  calendarId: string | null
  defaultShiftId: string | null
  alternativeGroupCode: string | null
  isActive: boolean
  notes: string | null
}

export function validateWorkCenterInput(raw: Record<string, any>): WorkCenterValidatedInput {
  const code = String(raw.code || "").trim().toUpperCase()
  const name = String(raw.name || "").trim()
  const type = String(raw.type || "MACHINE").trim().toUpperCase() as WorkCenterType

  if (!code || code.length < 2) {
    throw new ProductionDomainError(
      "İş merkezi kodu zorunludur ve en az 2 karakter olmalıdır (Örn: IST-01).",
      "VALIDATION_ERROR",
      400
    )
  }
  if (!name || name.length < 2) {
    throw new ProductionDomainError(
      "İş merkezi / istasyon adı zorunludur.",
      "VALIDATION_ERROR",
      400
    )
  }
  if (!WORK_CENTER_TYPES.includes(type)) {
    throw new ProductionDomainError(
      `Geçersiz iş merkezi tipi: ${type}. Geçerli tipler: ${WORK_CENTER_TYPES.join(", ")}`,
      "VALIDATION_ERROR",
      400
    )
  }

  const hourlyCost = Number(raw.hourlyCost ?? 0)
  if (Number.isNaN(hourlyCost) || hourlyCost < 0) {
    throw new ProductionDomainError(
      "Saatlik maliyet 0 veya daha büyük bir sayı olmalıdır.",
      "VALIDATION_ERROR",
      400
    )
  }

  const capacityPerHour = Number(raw.capacityPerHour ?? 1)
  if (Number.isNaN(capacityPerHour) || capacityPerHour <= 0) {
    throw new ProductionDomainError(
      "Saatlik kapasite (adet/saat) 0'dan büyük olmalıdır.",
      "VALIDATION_ERROR",
      400
    )
  }

  const efficiencyPercent = Number(raw.efficiencyPercent ?? 100)
  if (
    Number.isNaN(efficiencyPercent) ||
    efficiencyPercent <= 0 ||
    efficiencyPercent > 200
  ) {
    throw new ProductionDomainError(
      "Verimlilik yüzdesi %1 ile %200 arasında olmalıdır.",
      "VALIDATION_ERROR",
      400
    )
  }

  const altGroup = raw.alternativeGroupCode
    ? String(raw.alternativeGroupCode).trim().toUpperCase()
    : null

  return {
    branchId: raw.branchId ? String(raw.branchId).trim() : null,
    warehouseId: raw.warehouseId && raw.warehouseId !== "none" ? String(raw.warehouseId).trim() : null,
    code,
    name,
    type,
    hourlyCost: Number(hourlyCost.toFixed(2)),
    capacityPerHour: Number(capacityPerHour.toFixed(2)),
    efficiencyPercent: Number(efficiencyPercent.toFixed(2)),
    calendarId: raw.calendarId && raw.calendarId !== "none" ? String(raw.calendarId).trim() : null,
    defaultShiftId:
      raw.defaultShiftId && raw.defaultShiftId !== "none"
        ? String(raw.defaultShiftId).trim()
        : null,
    alternativeGroupCode: altGroup || null,
    isActive: raw.isActive !== undefined ? Boolean(raw.isActive) : true,
    notes: raw.notes ? String(raw.notes).trim() : null,
  }
}

export interface MachineAssetValidatedInput {
  branchId: string | null
  code: string
  name: string
  serialNumber: string
  brand: string | null
  model: string | null
  warrantyEndDate: string | null
  warrantyProvider: string | null
  location: string | null
  workCenterId: string | null
  status: MachineStatus
  operatingHours: number
  productionCount: number
  isActive: boolean
  notes: string | null
}

export function validateMachineAssetInput(raw: Record<string, any>): MachineAssetValidatedInput {
  const code = String(raw.code || "").trim().toUpperCase()
  const name = String(raw.name || "").trim()
  const serialNumber = String(raw.serialNumber || "").trim().toUpperCase()
  const status = String(raw.status || "ACTIVE").trim().toUpperCase() as MachineStatus

  if (!code || code.length < 2) {
    throw new ProductionDomainError(
      "Makine / ekipman varlık kodu zorunludur (Örn: MAK-01).",
      "VALIDATION_ERROR",
      400
    )
  }
  if (!name || name.length < 2) {
    throw new ProductionDomainError(
      "Makine / ekipman adı zorunludur.",
      "VALIDATION_ERROR",
      400
    )
  }
  if (!serialNumber || serialNumber.length < 2) {
    throw new ProductionDomainError(
      "Makine seri numarası zorunludur.",
      "VALIDATION_ERROR",
      400
    )
  }
  if (!MACHINE_STATUSES.includes(status)) {
    throw new ProductionDomainError(
      `Geçersiz makine durumu: ${status}.`,
      "VALIDATION_ERROR",
      400
    )
  }

  const operatingHours = Number(raw.operatingHours ?? 0)
  const productionCount = Number(raw.productionCount ?? 0)
  if (Number.isNaN(operatingHours) || operatingHours < 0) {
    throw new ProductionDomainError(
      "Çalışma saati sayacı negatif olamaz.",
      "VALIDATION_ERROR",
      400
    )
  }
  if (Number.isNaN(productionCount) || productionCount < 0) {
    throw new ProductionDomainError(
      "Üretim adet sayacı negatif olamaz.",
      "VALIDATION_ERROR",
      400
    )
  }

  const warrantyEndDate = raw.warrantyEndDate
    ? String(raw.warrantyEndDate).trim()
    : null
  if (warrantyEndDate && !DATE_YYYYMMDD_REGEX.test(warrantyEndDate)) {
    throw new ProductionDomainError(
      "Garanti bitiş tarihi YYYY-AA-GG formatında olmalıdır.",
      "VALIDATION_ERROR",
      400
    )
  }

  return {
    branchId: raw.branchId ? String(raw.branchId).trim() : null,
    code,
    name,
    serialNumber,
    brand: raw.brand ? String(raw.brand).trim() : null,
    model: raw.model ? String(raw.model).trim() : null,
    warrantyEndDate,
    warrantyProvider: raw.warrantyProvider ? String(raw.warrantyProvider).trim() : null,
    location: raw.location ? String(raw.location).trim() : null,
    workCenterId:
      raw.workCenterId && raw.workCenterId !== "none"
        ? String(raw.workCenterId).trim()
        : null,
    status,
    operatingHours: Number(operatingHours.toFixed(2)),
    productionCount: Number(productionCount.toFixed(2)),
    isActive: raw.isActive !== undefined ? Boolean(raw.isActive) : status !== "DECOMMISSIONED",
    notes: raw.notes ? String(raw.notes).trim() : null,
  }
}

export function validateWorkCalendarInput(raw: Record<string, any>) {
  const code = String(raw.code || "").trim().toUpperCase()
  const name = String(raw.name || "").trim()

  if (!code || code.length < 2) {
    throw new ProductionDomainError(
      "Çalışma takvimi kodu zorunludur (Örn: TAK-STD).",
      "VALIDATION_ERROR",
      400
    )
  }
  if (!name || name.length < 2) {
    throw new ProductionDomainError(
      "Çalışma takvimi adı zorunludur.",
      "VALIDATION_ERROR",
      400
    )
  }

  let workingDays: WeekdayCode[] = ["MON", "TUE", "WED", "THU", "FRI", "SAT"]
  if (Array.isArray(raw.workingDays)) {
    workingDays = raw.workingDays.filter((d: any) =>
      WEEKDAY_CODES.includes(d)
    ) as WeekdayCode[]
  } else if (typeof raw.workingDaysJson === "string") {
    try {
      const parsed = JSON.parse(raw.workingDaysJson)
      if (Array.isArray(parsed)) {
        workingDays = parsed.filter((d: any) => WEEKDAY_CODES.includes(d))
      }
    } catch {
      // Varsayılan liste korunur
    }
  }

  if (workingDays.length === 0) {
    throw new ProductionDomainError(
      "Çalışma takviminde en az 1 aktif çalışma günü seçilmelidir.",
      "VALIDATION_ERROR",
      400
    )
  }

  return {
    branchId: raw.branchId ? String(raw.branchId).trim() : null,
    code,
    name,
    workingDaysJson: JSON.stringify(workingDays),
    isDefault: Boolean(raw.isDefault),
    isActive: raw.isActive !== undefined ? Boolean(raw.isActive) : true,
    notes: raw.notes ? String(raw.notes).trim() : null,
  }
}

export function validateShiftInput(raw: Record<string, any>) {
  const calendarId = String(raw.calendarId || "").trim()
  const code = String(raw.code || "").trim().toUpperCase()
  const name = String(raw.name || "").trim()
  const startTime = String(raw.startTime || "08:00").trim()
  const endTime = String(raw.endTime || "17:00").trim()
  const breakMinutes = Number(raw.breakMinutes ?? 60)
  const capacityMultiplier = Number(raw.capacityMultiplier ?? 1.0)

  if (!calendarId) {
    throw new ProductionDomainError(
      "Vardiyanın bağlanacağı çalışma takvimi seçilmelidir.",
      "VALIDATION_ERROR",
      400
    )
  }
  if (!code || code.length < 2) {
    throw new ProductionDomainError(
      "Vardiya kodu zorunludur (Örn: VRD-SABAH).",
      "VALIDATION_ERROR",
      400
    )
  }
  if (!name || name.length < 2) {
    throw new ProductionDomainError(
      "Vardiya adı zorunludur.",
      "VALIDATION_ERROR",
      400
    )
  }
  if (Number.isNaN(capacityMultiplier) || capacityMultiplier <= 0 || capacityMultiplier > 3) {
    throw new ProductionDomainError(
      "Vardiya kapasite çarpanı 0 ile 3.0 arasında olmalıdır.",
      "VALIDATION_ERROR",
      400
    )
  }

  const { netWorkingMinutes } = calculateShiftNetWorkingMinutes(
    startTime,
    endTime,
    breakMinutes
  )

  return {
    calendarId,
    code,
    name,
    startTime,
    endTime,
    breakMinutes: Math.max(0, Math.round(breakMinutes)),
    netWorkingMinutes,
    capacityMultiplier: Number(capacityMultiplier.toFixed(2)),
    isActive: raw.isActive !== undefined ? Boolean(raw.isActive) : true,
  }
}

export function validateCalendarHolidayInput(raw: Record<string, any>) {
  const calendarId = String(raw.calendarId || "").trim()
  const holidayDate = String(raw.holidayDate || "").trim()
  const name = String(raw.name || "").trim()

  if (!calendarId) {
    throw new ProductionDomainError(
      "Tatil günü için çalışma takvimi seçilmelidir.",
      "VALIDATION_ERROR",
      400
    )
  }
  if (!DATE_YYYYMMDD_REGEX.test(holidayDate)) {
    throw new ProductionDomainError(
      "Tatil tarihi YYYY-AA-GG formatında olmalıdır.",
      "VALIDATION_ERROR",
      400
    )
  }
  if (!name || name.length < 2) {
    throw new ProductionDomainError(
      "Tatil günü adı/açıklaması zorunludur.",
      "VALIDATION_ERROR",
      400
    )
  }

  return {
    calendarId,
    holidayDate,
    name,
    isHalfDay: Boolean(raw.isHalfDay),
    isRecurringYearly: Boolean(raw.isRecurringYearly),
    notes: raw.notes ? String(raw.notes).trim() : null,
  }
}

export function validateCalendarExceptionInput(raw: Record<string, any>) {
  const calendarId = String(raw.calendarId || "").trim()
  const workCenterId = String(raw.workCenterId || "").trim()
  const exceptionDate = String(raw.exceptionDate || "").trim()
  const exceptionType = String(raw.exceptionType || "CLOSED")
    .trim()
    .toUpperCase() as CalendarExceptionType

  if (!calendarId) {
    throw new ProductionDomainError(
      "İstisna için çalışma takvimi seçilmelidir.",
      "VALIDATION_ERROR",
      400
    )
  }
  if (!workCenterId) {
    throw new ProductionDomainError(
      "İstisna için iş merkezi seçilmelidir.",
      "VALIDATION_ERROR",
      400
    )
  }
  if (!DATE_YYYYMMDD_REGEX.test(exceptionDate)) {
    throw new ProductionDomainError(
      "İstisna tarihi YYYY-AA-GG formatında olmalıdır.",
      "VALIDATION_ERROR",
      400
    )
  }
  if (!CALENDAR_EXCEPTION_TYPES.includes(exceptionType)) {
    throw new ProductionDomainError(
      `Geçersiz istisna tipi: ${exceptionType}.`,
      "VALIDATION_ERROR",
      400
    )
  }

  const availableHours =
    exceptionType === "CLOSED" ? 0 : Math.max(0, Number(raw.availableHours ?? 4))
  const capacityPercent =
    exceptionType === "CLOSED"
      ? 0
      : Math.max(0, Math.min(200, Number(raw.capacityPercent ?? 100)))

  return {
    calendarId,
    workCenterId,
    exceptionDate,
    exceptionType,
    availableHours: Number(availableHours.toFixed(2)),
    capacityPercent: Number(capacityPercent.toFixed(2)),
    reason: raw.reason ? String(raw.reason).trim() : null,
  }
}

export function validateProductionParametersInput(raw: Record<string, any>) {
  const planningHorizonDays = Number(raw.planningHorizonDays ?? 30)
  const planningBucket = String(raw.planningBucket || "DAILY")
    .trim()
    .toUpperCase() as PlanningBucket
  const defaultLotSizingRule = String(raw.defaultLotSizingRule || "L4L")
    .trim()
    .toUpperCase() as LotSizingRule
  const defaultMinLotSize = Number(raw.defaultMinLotSize ?? 1)
  const defaultLotMultiple = Number(raw.defaultLotMultiple ?? 1)
  const defaultSafetyStockRule = String(raw.defaultSafetyStockRule || "FIXED")
    .trim()
    .toUpperCase() as SafetyStockRule
  const defaultSafetyStockValue = Number(raw.defaultSafetyStockValue ?? 10)
  const defaultSafetyStockDays = Number(raw.defaultSafetyStockDays ?? 3)
  const allowOverProductionPercent = Number(raw.allowOverProductionPercent ?? 5)

  if (
    Number.isNaN(planningHorizonDays) ||
    planningHorizonDays < 1 ||
    planningHorizonDays > 365
  ) {
    throw new ProductionDomainError(
      "Planlama dönemi (ufku) 1 ile 365 gün arasında olmalıdır.",
      "VALIDATION_ERROR",
      400
    )
  }
  if (!PLANNING_BUCKETS.includes(planningBucket)) {
    throw new ProductionDomainError(
      `Geçersiz planlama dilimi: ${planningBucket}.`,
      "VALIDATION_ERROR",
      400
    )
  }
  if (!LOT_SIZING_RULES.includes(defaultLotSizingRule)) {
    throw new ProductionDomainError(
      `Geçersiz varsayılan lot kuralı: ${defaultLotSizingRule}.`,
      "VALIDATION_ERROR",
      400
    )
  }
  if (Number.isNaN(defaultMinLotSize) || defaultMinLotSize <= 0) {
    throw new ProductionDomainError(
      "Varsayılan minimum lot büyüklüğü 0'dan büyük olmalıdır.",
      "VALIDATION_ERROR",
      400
    )
  }
  if (Number.isNaN(defaultLotMultiple) || defaultLotMultiple <= 0) {
    throw new ProductionDomainError(
      "Varsayılan lot katı 0'dan büyük olmalıdır.",
      "VALIDATION_ERROR",
      400
    )
  }
  if (!SAFETY_STOCK_RULES.includes(defaultSafetyStockRule)) {
    throw new ProductionDomainError(
      `Geçersiz güvenlik stoğu kuralı: ${defaultSafetyStockRule}.`,
      "VALIDATION_ERROR",
      400
    )
  }
  if (Number.isNaN(defaultSafetyStockValue) || defaultSafetyStockValue < 0) {
    throw new ProductionDomainError(
      "Varsayılan güvenlik stoğu değeri negatif olamaz.",
      "VALIDATION_ERROR",
      400
    )
  }
  if (
    Number.isNaN(allowOverProductionPercent) ||
    allowOverProductionPercent < 0 ||
    allowOverProductionPercent > 100
  ) {
    throw new ProductionDomainError(
      "Fazla üretim tolerans yüzdesi %0 ile %100 arasında olmalıdır.",
      "VALIDATION_ERROR",
      400
    )
  }

  let statusFlow: string[] = [...WORK_ORDER_STATUS_FLOW_DEFAULT]
  if (Array.isArray(raw.statusFlow) && raw.statusFlow.length >= 2) {
    statusFlow = raw.statusFlow.map(String)
  } else if (typeof raw.statusFlowJson === "string") {
    try {
      const parsed = JSON.parse(raw.statusFlowJson)
      if (Array.isArray(parsed) && parsed.length >= 2) {
        statusFlow = parsed.map(String)
      }
    } catch {
      // Varsayılan akış korunur
    }
  }

  return {
    branchId: raw.branchId ? String(raw.branchId).trim() : "GLOBAL",
    planningHorizonDays: Math.round(planningHorizonDays),
    planningBucket,
    defaultLotSizingRule,
    defaultMinLotSize: Number(defaultMinLotSize.toFixed(2)),
    defaultLotMultiple: Number(defaultLotMultiple.toFixed(2)),
    defaultSafetyStockRule,
    defaultSafetyStockValue: Number(defaultSafetyStockValue.toFixed(2)),
    defaultSafetyStockDays: Math.max(0, Math.round(defaultSafetyStockDays)),
    requireWorkOrderApproval:
      raw.requireWorkOrderApproval !== undefined
        ? Boolean(raw.requireWorkOrderApproval)
        : true,
    requireQualityCheckOnComplete:
      raw.requireQualityCheckOnComplete !== undefined
        ? Boolean(raw.requireQualityCheckOnComplete)
        : false,
    autoBackflushOnComplete:
      raw.autoBackflushOnComplete !== undefined
        ? Boolean(raw.autoBackflushOnComplete)
        : true,
    autoReserveOnRelease:
      raw.autoReserveOnRelease !== undefined
        ? Boolean(raw.autoReserveOnRelease)
        : true,
    allowOverProductionPercent: Number(allowOverProductionPercent.toFixed(2)),
    allowNegativeStockInProduction: Boolean(raw.allowNegativeStockInProduction),
    defaultManufacturingWarehouseId:
      raw.defaultManufacturingWarehouseId &&
      raw.defaultManufacturingWarehouseId !== "none"
        ? String(raw.defaultManufacturingWarehouseId).trim()
        : null,
    statusFlowJson: JSON.stringify(statusFlow),
  }
}

export function buildDefaultProductionParameters(branchId?: string | null) {
  return {
    id: `uretim-params-${branchId || "global"}`,
    branchId: branchId || "GLOBAL",
    planningHorizonDays: 30,
    planningBucket: "DAILY" as PlanningBucket,
    defaultLotSizingRule: "L4L" as LotSizingRule,
    defaultMinLotSize: 1,
    defaultLotMultiple: 1,
    defaultSafetyStockRule: "FIXED" as SafetyStockRule,
    defaultSafetyStockValue: 10,
    defaultSafetyStockDays: 3,
    requireWorkOrderApproval: true,
    requireQualityCheckOnComplete: false,
    autoBackflushOnComplete: true,
    autoReserveOnRelease: true,
    allowOverProductionPercent: 5,
    allowNegativeStockInProduction: false,
    defaultManufacturingWarehouseId: null as string | null,
    statusFlowJson: JSON.stringify(WORK_ORDER_STATUS_FLOW_DEFAULT),
    updatedBy: "SYSTEM_DEFAULT",
  }
}

/**
 * Mevcut InventoryItem.itemType değerini Türkçe üretim profili tipine eşler.
 */
export function mapInventoryItemTypeToProductionType(
  itemType?: string | null
): ProductionItemType {
  switch (String(itemType || "").toUpperCase()) {
    case "RAW_MATERIAL":
      return "HAMMADDE"
    case "SEMI_FINISHED":
      return "YARI_MAMUL"
    case "CONSUMABLE":
      return "SARF_MALZEME"
    case "MERCHANDISE":
      return "TICARI_MAL"
    case "FINISHED_GOOD":
    default:
      return "MAMUL"
  }
}

export function validateItemProfileInput(raw: Record<string, any>) {
  const itemId = String(raw.itemId || "").trim()
  if (!itemId) {
    throw new ProductionDomainError(
      "Stok/Ürün kartı kimliği (itemId) zorunludur.",
      "VALIDATION_ERROR",
      400
    )
  }

  const productionItemType = String(raw.productionItemType || "MAMUL")
    .trim()
    .toUpperCase() as ProductionItemType
  if (!PRODUCTION_ITEM_TYPES.includes(productionItemType)) {
    throw new ProductionDomainError(
      `Geçersiz üretim ürün tipi: ${productionItemType}.`,
      "VALIDATION_ERROR",
      400
    )
  }

  const defaultMethod: ProductionMethod =
    productionItemType === "HAMMADDE" ||
    productionItemType === "SARF_MALZEME" ||
    productionItemType === "TICARI_MAL"
      ? "PURCHASE_ONLY"
      : "MAKE_TO_STOCK"

  const productionMethod = String(raw.productionMethod || defaultMethod)
    .trim()
    .toUpperCase() as ProductionMethod
  if (!PRODUCTION_METHODS.includes(productionMethod)) {
    throw new ProductionDomainError(
      `Geçersiz üretim yöntemi: ${productionMethod}.`,
      "VALIDATION_ERROR",
      400
    )
  }

  const leadTimeDays = Number(raw.leadTimeDays ?? 3)
  const productionLeadTimeHours = Number(raw.productionLeadTimeHours ?? 4)
  const minStockLevel = Number(raw.minStockLevel ?? 10)
  const safetyStockQty = Number(raw.safetyStockQty ?? 5)
  const lotSizingRule = String(raw.lotSizingRule || "L4L")
    .trim()
    .toUpperCase() as LotSizingRule
  const standardLotSize = Number(raw.standardLotSize ?? 1)
  const minOrderQty = Number(raw.minOrderQty ?? 1)
  const orderMultiple = Number(raw.orderMultiple ?? 1)
  const scrapTolerancePercent = Number(raw.scrapTolerancePercent ?? 2)

  if (Number.isNaN(leadTimeDays) || leadTimeDays < 0) {
    throw new ProductionDomainError(
      "Tedarik süresi (gün) negatif olamaz.",
      "VALIDATION_ERROR",
      400
    )
  }
  if (Number.isNaN(productionLeadTimeHours) || productionLeadTimeHours < 0) {
    throw new ProductionDomainError(
      "Üretim süresi (saat) negatif olamaz.",
      "VALIDATION_ERROR",
      400
    )
  }
  if (Number.isNaN(minStockLevel) || minStockLevel < 0) {
    throw new ProductionDomainError(
      "Min / emniyet stok seviyesi negatif olamaz.",
      "VALIDATION_ERROR",
      400
    )
  }
  if (Number.isNaN(safetyStockQty) || safetyStockQty < 0) {
    throw new ProductionDomainError(
      "Güvenlik stoğu miktarı negatif olamaz.",
      "VALIDATION_ERROR",
      400
    )
  }
  if (!LOT_SIZING_RULES.includes(lotSizingRule)) {
    throw new ProductionDomainError(
      `Geçersiz lot kuralı: ${lotSizingRule}.`,
      "VALIDATION_ERROR",
      400
    )
  }
  if (Number.isNaN(standardLotSize) || standardLotSize <= 0) {
    throw new ProductionDomainError(
      "Lot büyüklüğü 0'dan büyük olmalıdır.",
      "VALIDATION_ERROR",
      400
    )
  }
  if (Number.isNaN(minOrderQty) || minOrderQty <= 0) {
    throw new ProductionDomainError(
      "Minimum sipariş/üretim miktarı 0'dan büyük olmalıdır.",
      "VALIDATION_ERROR",
      400
    )
  }
  if (Number.isNaN(orderMultiple) || orderMultiple <= 0) {
    throw new ProductionDomainError(
      "Sipariş/üretim katı 0'dan büyük olmalıdır.",
      "VALIDATION_ERROR",
      400
    )
  }
  if (
    Number.isNaN(scrapTolerancePercent) ||
    scrapTolerancePercent < 0 ||
    scrapTolerancePercent > 100
  ) {
    throw new ProductionDomainError(
      "Fire tolerans yüzdesi %0 ile %100 arasında olmalıdır.",
      "VALIDATION_ERROR",
      400
    )
  }

  return {
    itemId,
    productionItemType,
    productionMethod,
    leadTimeDays: Math.round(leadTimeDays),
    productionLeadTimeHours: Number(productionLeadTimeHours.toFixed(2)),
    minStockLevel: Number(minStockLevel.toFixed(2)),
    safetyStockQty: Number(safetyStockQty.toFixed(2)),
    lotSizingRule,
    standardLotSize: Number(standardLotSize.toFixed(2)),
    minOrderQty: Number(minOrderQty.toFixed(2)),
    orderMultiple: Number(orderMultiple.toFixed(2)),
    defaultBomId:
      raw.defaultBomId && raw.defaultBomId !== "none"
        ? String(raw.defaultBomId).trim()
        : null,
    defaultWorkCenterId:
      raw.defaultWorkCenterId && raw.defaultWorkCenterId !== "none"
        ? String(raw.defaultWorkCenterId).trim()
        : null,
    scrapTolerancePercent: Number(scrapTolerancePercent.toFixed(2)),
    backflushEnabled:
      raw.backflushEnabled !== undefined ? Boolean(raw.backflushEnabled) : true,
    qualityCheckRequired: Boolean(raw.qualityCheckRequired),
    notes: raw.notes ? String(raw.notes).trim() : null,
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// 4. PERFORMANS & SAYFALAMA (PAGINATION) YARDIMCISI
// ═══════════════════════════════════════════════════════════════════════════════

export interface PaginatedResult<T> {
  items: T[]
  pagination: {
    page: number
    pageSize: number
    totalCount: number
    totalPages: number
    hasNextPage: boolean
    hasPrevPage: boolean
  }
}

export function paginateArray<T>(
  allItems: T[],
  pageInput?: number | string | null,
  pageSizeInput?: number | string | null
): PaginatedResult<T> {
  const pageSize = Math.max(1, Math.min(100, Number(pageSizeInput || 10)))
  const totalCount = allItems.length
  const totalPages = Math.max(1, Math.ceil(totalCount / pageSize))
  const page = Math.max(1, Math.min(totalPages, Number(pageInput || 1)))
  const start = (page - 1) * pageSize
  const items = allItems.slice(start, start + pageSize)

  return {
    items,
    pagination: {
      page,
      pageSize,
      totalCount,
      totalPages,
      hasNextPage: page < totalPages,
      hasPrevPage: page > 1,
    },
  }
}
