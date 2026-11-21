/**
 * Sunum ERP — Turizm Faz 2: Araç Kiralama (Rent-a-Car) — turizm_rentacar
 * İstemci-Güvenli (Saf) Tipler, Sabitler, KVKK Maskeleme, Fiyatlandırma,
 * Teslim/İade Fark Hesaplama ve Gantt Müsaitlik Yardımcıları
 *
 * KURALLAR:
 * - Hem sunucu hem istemci ("use client") bileşenleri tarafından güvenle import edilebilir.
 * - fs, path, prisma/db veya audit modülleri ASLA import edilmez.
 * - Tüm para, yaş, ehliyet yılı, gecikme ve yakıt farkı oranları veritabanındaki
 *   ayarlanabilir kayıtlardan (TurizmRentVehicleClass, TurizmRentTariff, TurizmRentPolicyConfig)
 *   beslenir; yasal/mali iddia içermez.
 */

import {
  maskAddress,
  maskDocumentNo,
  maskPhone,
  maskTckn,
} from "@/lib/logistics/fleet/constantsAndHelpers"

export const RENT_VEHICLE_SEGMENTS = [
  "A",
  "B",
  "C",
  "D",
  "SUV",
  "VIP",
  "MINIBUS",
] as const

export type RentVehicleSegment = (typeof RENT_VEHICLE_SEGMENTS)[number]

export const RENT_VEHICLE_SEGMENT_LABELS: Record<RentVehicleSegment, string> = {
  A: "A Segment (Mini / Şehir)",
  B: "B Segment (Ekonomik Hatchback)",
  C: "C Segment (Kompakt / Sedan)",
  D: "D Segment (Üst Konfor / Prestij)",
  SUV: "SUV & 4x4 Arazi",
  VIP: "VIP Executive & Lüks",
  MINIBUS: "Minibüs & Grup (8+1 / 16+1)",
}

export const RENT_TRANSMISSION_TYPES = ["AUTOMATIC", "MANUAL"] as const
export type RentTransmissionType = (typeof RENT_TRANSMISSION_TYPES)[number]

export const RENT_TRANSMISSION_LABELS: Record<RentTransmissionType, string> = {
  AUTOMATIC: "Otomatik Vites",
  MANUAL: "Manuel Vites",
}

export const RENT_SEASON_TYPES = [
  "STANDARD",
  "HIGH_SEASON",
  "WINTER_PROMO",
  "CORPORATE",
] as const

export type RentSeasonType = (typeof RENT_SEASON_TYPES)[number]

export const RENT_SEASON_LABELS: Record<RentSeasonType, string> = {
  STANDARD: "Standart Sezon",
  HIGH_SEASON: "Yüksek Sezon / Yoğun Dönem",
  WINTER_PROMO: "Kış & Kampanya Dönemi",
  CORPORATE: "Kurumsal Anlaşmalı Tarife",
}

export const RENT_EXTRA_CATEGORIES = [
  "EQUIPMENT",
  "DRIVER",
  "INSURANCE",
  "DELIVERY",
  "TOLL_PASS",
] as const

export type RentExtraCategory = (typeof RENT_EXTRA_CATEGORIES)[number]

export const RENT_EXTRA_CATEGORY_LABELS: Record<RentExtraCategory, string> = {
  EQUIPMENT: "Ekipman & Aksesuar",
  DRIVER: "Sürücü & Şoför Hizmeti",
  INSURANCE: "Güvence & Muafiyet Paketi",
  DELIVERY: "Vale & Adrese/Havalimanı Teslimat",
  TOLL_PASS: "HGS / Otoyol Geçiş Hizmeti",
}

export const RENT_RESERVATION_STATUSES = [
  "PENDING",
  "CONFIRMED",
  "ACTIVE",
  "COMPLETED",
  "CANCELLED",
  "NO_SHOW",
] as const

export type RentReservationStatus = (typeof RENT_RESERVATION_STATUSES)[number]

export const RENT_RESERVATION_STATUS_LABELS: Record<RentReservationStatus, string> = {
  PENDING: "Onay Bekliyor",
  CONFIRMED: "Onaylı (Rezerve)",
  ACTIVE: "Kirada (Teslim Edildi)",
  COMPLETED: "İade Alındı (Tamamlandı)",
  CANCELLED: "İptal Edildi",
  NO_SHOW: "Müşteri Gelmedi (No-Show)",
}

export const RENT_RESERVATION_STATUS_BADGES: Record<RentReservationStatus, string> = {
  PENDING: "bg-amber-500/15 text-amber-300 border-amber-500/30",
  CONFIRMED: "bg-sky-500/15 text-sky-300 border-sky-500/30",
  ACTIVE: "bg-emerald-500/15 text-[#34D399] border-emerald-500/30",
  COMPLETED: "bg-zinc-500/15 text-zinc-300 border-white/[0.12]",
  CANCELLED: "bg-rose-500/15 text-rose-300 border-rose-500/30",
  NO_SHOW: "bg-purple-500/15 text-purple-300 border-purple-500/30",
}

export const RENT_CONTRACT_STATUSES = [
  "DRAFT",
  "SIGNED_ACTIVE",
  "CLOSED",
  "CANCELLED",
] as const

export type RentContractStatus = (typeof RENT_CONTRACT_STATUSES)[number]

export const RENT_CONTRACT_STATUS_LABELS: Record<RentContractStatus, string> = {
  DRAFT: "Taslak (İmza Bekliyor)",
  SIGNED_ACTIVE: "İmzalı & Yürürlükte",
  CLOSED: "Kapandı (İade Tamamlandı)",
  CANCELLED: "İptal Edildi",
}

export const RENT_CHARGE_ENTRY_TYPES = [
  "DEPOSIT_COLLECT",
  "DEPOSIT_REFUND",
  "DEPOSIT_DEDUCTION",
  "EXTRA_KM",
  "FUEL_DIFFERENCE",
  "LATE_RETURN",
  "DAMAGE_FEE",
  "TOLL_PASS_REFLECTION",
  "TRAFFIC_PENALTY_REFLECTION",
  "EXTRA_SERVICE",
] as const

export type RentChargeEntryType = (typeof RENT_CHARGE_ENTRY_TYPES)[number]

export const RENT_CHARGE_ENTRY_TYPE_LABELS: Record<RentChargeEntryType, string> = {
  DEPOSIT_COLLECT: "Depozito Tahsilatı / Bloke",
  DEPOSIT_REFUND: "Depozito İadesi",
  DEPOSIT_DEDUCTION: "Depozitodan Mahsup / Kesinti",
  EXTRA_KM: "Kilometre Aşım Ücreti",
  FUEL_DIFFERENCE: "Eksik Yakıt Fark Ücreti",
  LATE_RETURN: "Geç İade / Süre Aşımı Ücreti",
  DAMAGE_FEE: "Hasar / Ekspertiz Onarım Bedeli",
  TOLL_PASS_REFLECTION: "HGS / Otoyol Geçiş Yansıtması",
  TRAFFIC_PENALTY_REFLECTION: "Trafik Cezası Müşteri Yansıtması",
  EXTRA_SERVICE: "Ek Hizmet / Aksesuar Bedeli",
}

export const RENT_CHARGE_STATUS_LABELS: Record<string, string> = {
  PENDING: "Tahsilat Bekliyor",
  COLLECTED: "Tahsil Edildi",
  REFUND_PENDING: "İade Bekliyor",
  REFUNDED: "Müşteriye İade Edildi",
  INVOICED: "Faturalandırıldı (Cari/E-Belge)",
  WAIVED: "Feragat Edildi / İptal",
}

export const RENT_KABIS_NOTIFICATION_TYPE_LABELS: Record<string, string> = {
  KIRALAMA_ACILIS: "Kiralama Açılış (Teslim) Bildirimi",
  KIRALAMA_KAPANIS: "Kiralama Kapanış (İade) Bildirimi",
  EK_SURUCU_BILDIRIMI: "Ek Sürücü / Araç Değişikliği Bildirimi",
}

export const RENT_KABIS_STATUS_LABELS: Record<string, string> = {
  HAZIRLANDI: "Bildirim Paketi Hazırlandı",
  GONDERILDI_MANUEL: "Dışa Aktarıldı / Manuel İşlendi",
  HATALI: "Doğrulama / Aktarım Hatası",
  EKSIK_VERI: "Eksik Kimlik / Araç Verisi",
}

export const RENT_KABIS_STATUS_BADGES: Record<string, string> = {
  HAZIRLANDI: "bg-sky-500/15 text-sky-300 border-sky-500/30",
  GONDERILDI_MANUEL: "bg-emerald-500/15 text-[#34D399] border-emerald-500/30",
  HATALI: "bg-rose-500/15 text-rose-300 border-rose-500/30",
  EKSIK_VERI: "bg-amber-500/15 text-amber-300 border-amber-500/30",
}

export const RENT_INVOICE_TIMING_LABELS: Record<string, string> = {
  ON_CONTRACT_APPROVAL: "Sözleşme İmzalandığında Otomatik",
  ON_RETURN_COMPLETION: "Araç İadesi ve Mahsup Tamamlandığında Otomatik",
  MANUAL: "Operasyon / Muhasebe Onayıyla Manuel",
}

export const RENT_DAMAGE_ZONES = [
  "Ön Tampon",
  "Arka Tampon",
  "Motor Kaputu",
  "Bagaj Kapağı",
  "Sol Ön Çamurluk",
  "Sağ Ön Çamurluk",
  "Sol Ön Kapı",
  "Sağ Ön Kapı",
  "Sol Arka Kapı",
  "Sağ Arka Kapı",
  "Sol Arka Çamurluk",
  "Sağ Arka Çamurluk",
  "Ön Cam",
  "Tavan",
  "Jant / Lastik",
  "İç Döşeme / Kokpit",
] as const

export const DEFAULT_SAMPLE_CONTRACT_TEMPLATE_TEXT = `[ÖRNEK ŞABLON — HUKUKİ İNCELEME GEREKTİRİR]

1. TARAFLAR VE KONU
İşbu örnek araç kiralama sözleşmesi şablonu, Kiralayan ({{COMPANY_NAME}}) ile Kiracı ({{CUSTOMER_NAME}}) arasında {{VEHICLE_PLATE}} plakalı ({{VEHICLE_BRAND_MODEL}}) aracın {{START_DATE}} - {{END_DATE}} tarihleri arasında ({{RENTAL_DAYS}} gün) kiralanmasına ilişkin operasyonel kayıt belgesidir.

2. TESLİM, İADE VE KİLOMETRE SINIRI
- Günlük Kilometre Limiti: {{DAILY_KM_LIMIT}} km (Toplam Dönem Limiti: {{TOTAL_KM_LIMIT}} km)
- Kilometre Aşım Birim Bedeli: {{EXTRA_KM_RATE}} TRY / km
- Kararlaştırılan Günlük Kira Bedeli: {{DAILY_RATE}} TRY | Toplam Kira Tutarı: {{TOTAL_AMOUNT}} TRY
- Alınan Güvence / Depozito Tutarı: {{DEPOSIT_AMOUNT}} TRY

3. YAKIT, HASAR, HGS VE CEZA YANSITMA KURALLARI (AYARLANABİLİR ŞABLON)
- Araç teslim edildiği yakıt seviyesinde ({{DELIVERY_FUEL_PCT}}%) iade edilir. Eksik yakıt tespitinde sistemde tanımlı birim fark tarifesi uygulanır.
- Kiralama süresi ({{START_DATE}} - {{END_DATE}}) içerisinde plaka üzerinden gerçekleşen otoyol/köprü (HGS) geçişleri ve trafik cezaları, kiralama dönemiyle eşleştirilerek kiracı cari hesabına yansıtılır.
- Araç periyodik bakımda veya arızalı iken trafiğe çıkarılamaz; arıza halinde kiralayan ikame araç tahsisi yapabilir.

NOT: Bu metin teknik doğrulama ve operasyonel çıktı için yer tutucu bir şablondur; yürürlüğe alınmadan önce şirket hukuk müşavirliği tarafından incelenmelidir.`

// ── KVKK Müşteri & Kiracı Maskeleme Yardımcıları ─────────────────────────────

export interface KvkkMaskedCustomerResult<T extends Record<string, any>> {
  customer: T & { isKvkkMasked: boolean }
  maskedFields: string[]
}

export function applyCustomerKvkkMasking<T extends Record<string, any>>(
  customer: T,
  canViewSensitivePii: boolean
): KvkkMaskedCustomerResult<T> {
  if (canViewSensitivePii) {
    return {
      customer: { ...customer, isKvkkMasked: false },
      maskedFields: [],
    }
  }

  const maskedFields: string[] = []
  const copy: Record<string, any> = { ...customer, isKvkkMasked: true }

  if (copy.tckn) {
    copy.tckn = maskTckn(copy.tckn)
    maskedFields.push("tckn")
  }
  if (copy.passportNo) {
    copy.passportNo = maskDocumentNo(copy.passportNo)
    maskedFields.push("passportNo")
  }
  if (copy.driverLicenseNo) {
    copy.driverLicenseNo = maskDocumentNo(copy.driverLicenseNo)
    maskedFields.push("driverLicenseNo")
  }
  if (copy.phone) {
    copy.phone = maskPhone(copy.phone)
    maskedFields.push("phone")
  }
  if (copy.address) {
    copy.address = maskAddress(copy.address)
    maskedFields.push("address")
  }

  return {
    customer: copy as T & { isKvkkMasked: boolean },
    maskedFields,
  }
}

// ── Sürücü Yaş, Ehliyet Yılı & Geçerlilik Doğrulayıcısı (Ayarlanabilir Kurallar) ──

export interface RenterEligibilityInput {
  birthDate?: string | Date | null
  driverLicenseIssuedAt?: string | Date | null
  driverLicenseExpiresAt?: string | Date | null
  isBlacklisted?: boolean | null
  blacklistReason?: string | null
  rentalStartAt: string | Date
  rentalEndAt: string | Date
  minDriverAge: number
  minLicenseYears: number
}

export interface RenterEligibilityEvaluation {
  eligible: boolean
  driverAgeYears: number | null
  licenseTenureYears: number | null
  licenseValidThroughRental: boolean
  violations: string[]
}

export function evaluateRenterEligibility(
  input: RenterEligibilityInput
): RenterEligibilityEvaluation {
  const violations: string[] = []
  const start = new Date(input.rentalStartAt)
  const end = new Date(input.rentalEndAt)
  const refDate = Number.isNaN(start.getTime()) ? new Date() : start

  if (input.isBlacklisted) {
    violations.push(
      `Müşteri kara listede kayıtlıdır${input.blacklistReason ? ` (${input.blacklistReason})` : ""}.`
    )
  }

  let driverAgeYears: number | null = null
  if (input.birthDate) {
    const bd = new Date(input.birthDate)
    if (!Number.isNaN(bd.getTime())) {
      driverAgeYears = Number(
        ((refDate.getTime() - bd.getTime()) / (365.25 * 86_400_000)).toFixed(1)
      )
      if (driverAgeYears < input.minDriverAge) {
        violations.push(
          `Sürücü yaşı (${Math.floor(driverAgeYears)}) bu araç sınıfı için gereken minimum yaşın (${input.minDriverAge}) altındadır.`
        )
      }
    }
  }

  let licenseTenureYears: number | null = null
  if (input.driverLicenseIssuedAt) {
    const issued = new Date(input.driverLicenseIssuedAt)
    if (!Number.isNaN(issued.getTime())) {
      licenseTenureYears = Number(
        ((refDate.getTime() - issued.getTime()) / (365.25 * 86_400_000)).toFixed(1)
      )
      if (licenseTenureYears < input.minLicenseYears) {
        violations.push(
          `Ehliyet süresi (${licenseTenureYears.toFixed(1)} yıl) bu araç sınıfı için gereken minimum sürenin (${input.minLicenseYears} yıl) altındadır.`
        )
      }
    }
  }

  let licenseValidThroughRental = true
  if (input.driverLicenseExpiresAt) {
    const exp = new Date(input.driverLicenseExpiresAt)
    if (!Number.isNaN(exp.getTime()) && !Number.isNaN(end.getTime())) {
      if (exp.getTime() < end.getTime()) {
        licenseValidThroughRental = false
        violations.push(
          `Sürücü ehliyet geçerlilik tarihi (${exp.toISOString().slice(0, 10)}) kiralama bitiş tarihinden önce dolmaktadır.`
        )
      }
    }
  }

  return {
    eligible: violations.length === 0,
    driverAgeYears,
    licenseTenureYears,
    licenseValidThroughRental,
    violations,
  }
}

// ── Fiyatlandırma & Ek Hizmet Hesaplama Motoru ───────────────────────────────

export interface SelectedExtraServiceInput {
  serviceId: string
  code: string
  name: string
  pricingType: "DAILY" | "PER_RENTAL" | string
  unitPriceTry: number
  quantity?: number
}

export interface RentalPricingCalculationResult {
  rentalDays: number
  tierApplied: "DAILY" | "WEEKLY" | "MONTHLY"
  appliedDailyRateTry: number
  baseRentalAmountTry: number
  extrasTotalTry: number
  discountAmountTry: number
  totalEstimatedTry: number
  dailyKmLimit: number
  totalKmLimit: number
  extraKmRateTry: number
  depositRequiredTry: number
  extrasBreakdown: Array<{
    serviceId: string
    code: string
    name: string
    pricingType: string
    quantity: number
    unitPriceTry: number
    lineTotalTry: number
  }>
}

export function calculateRentalDays(startAt: string | Date, endAt: string | Date): number {
  const s = new Date(startAt).getTime()
  const e = new Date(endAt).getTime()
  if (Number.isNaN(s) || Number.isNaN(e) || e <= s) return 1
  return Math.max(1, Math.ceil((e - s) / 86_400_000))
}

export function calculateRentalPricing(params: {
  startAt: string | Date
  endAt: string | Date
  dailyRateTry: number
  weeklyDailyRateTry?: number | null
  monthlyDailyRateTry?: number | null
  dailyKmLimit: number
  extraKmRateTry: number
  depositAmountTry: number
  selectedExtras?: SelectedExtraServiceInput[]
  discountAmountTry?: number
}): RentalPricingCalculationResult {
  const rentalDays = calculateRentalDays(params.startAt, params.endAt)

  let tierApplied: "DAILY" | "WEEKLY" | "MONTHLY" = "DAILY"
  let appliedDailyRateTry = Number(params.dailyRateTry || 0)

  if (
    rentalDays >= 30 &&
    params.monthlyDailyRateTry &&
    Number(params.monthlyDailyRateTry) > 0
  ) {
    tierApplied = "MONTHLY"
    appliedDailyRateTry = Number(params.monthlyDailyRateTry)
  } else if (
    rentalDays >= 7 &&
    params.weeklyDailyRateTry &&
    Number(params.weeklyDailyRateTry) > 0
  ) {
    tierApplied = "WEEKLY"
    appliedDailyRateTry = Number(params.weeklyDailyRateTry)
  }

  const baseRentalAmountTry = Number((rentalDays * appliedDailyRateTry).toFixed(2))
  const extrasBreakdown = (params.selectedExtras || []).map((ex) => {
    const qty = Math.max(1, Number(ex.quantity ?? 1))
    const unit = Math.max(0, Number(ex.unitPriceTry || 0))
    const multiplier = ex.pricingType === "DAILY" ? rentalDays * qty : qty
    const lineTotalTry = Number((unit * multiplier).toFixed(2))
    return {
      serviceId: ex.serviceId,
      code: ex.code,
      name: ex.name,
      pricingType: ex.pricingType,
      quantity: qty,
      unitPriceTry: unit,
      lineTotalTry,
    }
  })

  const extrasTotalTry = Number(
    extrasBreakdown.reduce((sum, item) => sum + item.lineTotalTry, 0).toFixed(2)
  )
  const discountAmountTry = Math.max(0, Number((params.discountAmountTry || 0).toFixed(2)))
  const totalEstimatedTry = Number(
    Math.max(0, baseRentalAmountTry + extrasTotalTry - discountAmountTry).toFixed(2)
  )
  const dailyKmLimit = Math.max(0, Number(params.dailyKmLimit || 250))
  const totalKmLimit = dailyKmLimit * rentalDays

  return {
    rentalDays,
    tierApplied,
    appliedDailyRateTry,
    baseRentalAmountTry,
    extrasTotalTry,
    discountAmountTry,
    totalEstimatedTry,
    dailyKmLimit,
    totalKmLimit,
    extraKmRateTry: Math.max(0, Number(params.extraKmRateTry || 0)),
    depositRequiredTry: Math.max(0, Number(params.depositAmountTry || 0)),
    extrasBreakdown,
  }
}

// ── Teslim vs İade Formu Karşılaştırma & Fark Hesaplama Motoru ───────────────

export interface InspectionComparisonSummary {
  deliveryKm: number
  returnKm: number
  distanceDrivenKm: number
  allowedKm: number
  excessKm: number
  extraKmRateTry: number
  extraKmChargeTry: number
  deliveryFuelPct: number
  returnFuelPct: number
  missingFuelPct: number
  missingFuelRatePerPctTry: number
  fuelDifferenceChargeTry: number
  plannedEndAt: string
  actualReturnAt: string
  lateMinutes: number
  gracePeriodMinutes: number
  billableLateHours: number
  lateFullDayApplied: boolean
  lateReturnChargeTry: number
  deliveryDamageCount: number
  returnDamageCount: number
  newDamageMarkers: string[]
  damageChargeTry: number
  totalExtraChargesTry: number
  depositCollectedTry: number
  depositDeductionTry: number
  netDepositRefundTry: number
  additionalReceivableTry: number
}

export function compareDeliveryAndReturnForms(params: {
  deliveryOdometerKm: number
  returnOdometerKm: number
  deliveryFuelPct: number
  returnFuelPct: number
  deliveryDamageMarkers?: string[]
  returnDamageMarkers?: string[]
  estimatedDamageCostTry?: number
  plannedEndAt: string | Date
  actualReturnAt: string | Date
  allowedTotalKm: number
  extraKmRateTry: number
  dailyRateTry: number
  lateReturnHourlyTry: number
  gracePeriodMinutes: number
  lateHourToFullDayThreshold: number
  missingFuelRatePerPctTry: number
  depositCollectedTry: number
}): InspectionComparisonSummary {
  const deliveryKm = Math.max(0, Number(params.deliveryOdometerKm || 0))
  const returnKm = Math.max(deliveryKm, Number(params.returnOdometerKm || deliveryKm))
  const distanceDrivenKm = Number((returnKm - deliveryKm).toFixed(1))
  const allowedKm = Math.max(0, Number(params.allowedTotalKm || 0))
  const excessKm = Number(Math.max(0, distanceDrivenKm - allowedKm).toFixed(1))
  const extraKmRateTry = Math.max(0, Number(params.extraKmRateTry || 0))
  const extraKmChargeTry = Number((excessKm * extraKmRateTry).toFixed(2))

  const deliveryFuelPct = Math.min(100, Math.max(0, Math.round(Number(params.deliveryFuelPct ?? 100))))
  const returnFuelPct = Math.min(100, Math.max(0, Math.round(Number(params.returnFuelPct ?? 100))))
  const missingFuelPct = Math.max(0, deliveryFuelPct - returnFuelPct)
  const missingFuelRatePerPctTry = Math.max(0, Number(params.missingFuelRatePerPctTry || 0))
  const fuelDifferenceChargeTry = Number((missingFuelPct * missingFuelRatePerPctTry).toFixed(2))

  const plannedEnd = new Date(params.plannedEndAt)
  const actualRet = new Date(params.actualReturnAt)
  const diffMs =
    !Number.isNaN(plannedEnd.getTime()) && !Number.isNaN(actualRet.getTime())
      ? actualRet.getTime() - plannedEnd.getTime()
      : 0
  const lateMinutes = Math.max(0, Math.round(diffMs / 60_000))
  const gracePeriodMinutes = Math.max(0, Number(params.gracePeriodMinutes ?? 60))

  let billableLateHours = 0
  let lateFullDayApplied = false
  let lateReturnChargeTry = 0

  if (lateMinutes > gracePeriodMinutes) {
    billableLateHours = Math.ceil((lateMinutes - gracePeriodMinutes) / 60)
    const threshold = Math.max(1, Number(params.lateHourToFullDayThreshold || 4))
    if (billableLateHours >= threshold) {
      lateFullDayApplied = true
      const extraDays = Math.max(1, Math.ceil(billableLateHours / 24))
      lateReturnChargeTry = Number((extraDays * Number(params.dailyRateTry || 0)).toFixed(2))
    } else {
      lateReturnChargeTry = Number(
        (billableLateHours * Number(params.lateReturnHourlyTry || 0)).toFixed(2)
      )
    }
  }

  const delMarkers = params.deliveryDamageMarkers || []
  const retMarkers = params.returnDamageMarkers || []
  const delSet = new Set(delMarkers)
  const newDamageMarkers = retMarkers.filter((m) => !delSet.has(m))
  const damageChargeTry = Math.max(0, Number((params.estimatedDamageCostTry || 0).toFixed(2)))

  const totalExtraChargesTry = Number(
    (
      extraKmChargeTry +
      fuelDifferenceChargeTry +
      lateReturnChargeTry +
      damageChargeTry
    ).toFixed(2)
  )

  const depositCollectedTry = Math.max(0, Number((params.depositCollectedTry || 0).toFixed(2)))
  const depositDeductionTry = Number(Math.min(depositCollectedTry, totalExtraChargesTry).toFixed(2))
  const netDepositRefundTry = Number(Math.max(0, depositCollectedTry - depositDeductionTry).toFixed(2))
  const additionalReceivableTry = Number(
    Math.max(0, totalExtraChargesTry - depositDeductionTry).toFixed(2)
  )

  return {
    deliveryKm,
    returnKm,
    distanceDrivenKm,
    allowedKm,
    excessKm,
    extraKmRateTry,
    extraKmChargeTry,
    deliveryFuelPct,
    returnFuelPct,
    missingFuelPct,
    missingFuelRatePerPctTry,
    fuelDifferenceChargeTry,
    plannedEndAt: Number.isNaN(plannedEnd.getTime()) ? "" : plannedEnd.toISOString(),
    actualReturnAt: Number.isNaN(actualRet.getTime()) ? "" : actualRet.toISOString(),
    lateMinutes,
    gracePeriodMinutes,
    billableLateHours,
    lateFullDayApplied,
    lateReturnChargeTry,
    deliveryDamageCount: delMarkers.length,
    returnDamageCount: retMarkers.length,
    newDamageMarkers,
    damageChargeTry,
    totalExtraChargesTry,
    depositCollectedTry,
    depositDeductionTry,
    netDepositRefundTry,
    additionalReceivableTry,
  }
}

// ── Zaman Aralığı Çakışma (Overlap) ve Gantt Müsaitlik Yardımcıları ──────────

export function doTimeIntervalsOverlap(
  aStart: string | Date,
  aEnd: string | Date,
  bStart: string | Date,
  bEnd: string | Date
): boolean {
  const as = new Date(aStart).getTime()
  const ae = new Date(aEnd).getTime()
  const bs = new Date(bStart).getTime()
  const be = new Date(bEnd).getTime()
  if (Number.isNaN(as) || Number.isNaN(ae) || Number.isNaN(bs) || Number.isNaN(be)) {
    return false
  }
  return as < be && bs < ae
}

export type GanttDayCellStatus = "AVAILABLE" | "RENTED" | "RESERVED" | "MAINTENANCE"

export interface VehicleGanttDayCell {
  dateKey: string // YYYY-MM-DD
  status: GanttDayCellStatus
  reservationId?: string
  reservationNo?: string
  customerName?: string
  maintenanceRef?: string
}

export interface VehicleAvailabilityGanttRow {
  vehicleId: string
  plate: string
  brandModel: string
  branchId: string
  vehicleClassId: string | null
  vehicleClassName: string
  fleetStatus: string
  rentalStatus: string
  odometerKm: number
  currentFuelPct: number
  days: VehicleGanttDayCell[]
  rentedDaysCount: number
  reservedDaysCount: number
  maintenanceDaysCount: number
  availableDaysCount: number
  occupancyPct: number
}

export function buildVehicleAvailabilityGantt(params: {
  vehicles: any[]
  classesById: Map<string, any>
  reservations: any[]
  maintenanceWorkOrders: any[]
  customersById: Map<string, any>
  windowStartDate: string | Date
  daysCount?: number
  filterClassId?: string
  filterBranchId?: string
}): {
  dateHeaders: string[]
  rows: VehicleAvailabilityGanttRow[]
} {
  const daysCount = Math.min(60, Math.max(7, Number(params.daysCount || 21)))
  const start = new Date(params.windowStartDate)
  start.setUTCHours(0, 0, 0, 0)

  const dateHeaders: string[] = []
  for (let i = 0; i < daysCount; i++) {
    const d = new Date(start.getTime() + i * 86_400_000)
    dateHeaders.push(d.toISOString().slice(0, 10))
  }

  let filteredVehicles = params.vehicles.filter(
    (v) =>
      v.isActive !== false &&
      (v.isRentalPool === true ||
        v.vehicleType === "PASSENGER" ||
        v.vehicleType === "MINIBUS" ||
        Boolean(v.rentalClassId))
  )

  if (params.filterClassId) {
    filteredVehicles = filteredVehicles.filter((v) => v.rentalClassId === params.filterClassId)
  }
  if (params.filterBranchId) {
    filteredVehicles = filteredVehicles.filter((v) => v.branchId === params.filterBranchId)
  }

  const activeOrReservedRes = params.reservations.filter(
    (r) => r.status === "ACTIVE" || r.status === "CONFIRMED" || r.status === "PENDING"
  )
  const activeMaintWos = params.maintenanceWorkOrders.filter(
    (wo) => wo.status === "IN_PROGRESS" || wo.status === "SCHEDULED" || wo.status === "REQUESTED"
  )

  const rows: VehicleAvailabilityGanttRow[] = filteredVehicles.map((v) => {
    const cls = v.rentalClassId ? params.classesById.get(v.rentalClassId) : null
    const vRes = activeOrReservedRes.filter((r) => r.vehicleId === v.id)
    const vWos = activeMaintWos.filter((wo) => wo.vehicleId === v.id)

    let rentedDaysCount = 0
    let reservedDaysCount = 0
    let maintenanceDaysCount = 0
    let availableDaysCount = 0

    const days: VehicleGanttDayCell[] = dateHeaders.map((dateKey) => {
      const dayStart = new Date(`${dateKey}T00:00:00.000Z`)
      const dayEnd = new Date(`${dateKey}T23:59:59.999Z`)

      // 1. Aktif kiralama veya rezervasyon kontrolü
      const matchedRes = vRes.find((r) =>
        doTimeIntervalsOverlap(r.startAt, r.endAt, dayStart, dayEnd)
      )
      if (matchedRes) {
        const cust = params.customersById.get(matchedRes.customerId)
        const isRented = matchedRes.status === "ACTIVE"
        if (isRented) rentedDaysCount++
        else reservedDaysCount++
        return {
          dateKey,
          status: isRented ? "RENTED" : "RESERVED",
          reservationId: matchedRes.id,
          reservationNo: matchedRes.reservationNo,
          customerName: cust?.name || cust?.company || "Müşteri",
        }
      }

      // 2. Bakım / arıza iş emri veya araç bakım durumu kontrolü
      const matchedWo = vWos.find((wo) => {
        const woStart = wo.startedAt || wo.plannedDate || wo.createdAt
        const woEnd =
          wo.completedAt ||
          new Date(new Date(woStart).getTime() + Math.max(24, Number(wo.downtimeMinutes || 1440) / 60) * 3_600_000)
        return doTimeIntervalsOverlap(woStart, woEnd, dayStart, dayEnd)
      })

      if (
        matchedWo ||
        v.status === "MAINTENANCE" ||
        v.status === "FAULT" ||
        v.status === "OUT_OF_SERVICE" ||
        v.rentalStatus === "MAINTENANCE"
      ) {
        maintenanceDaysCount++
        return {
          dateKey,
          status: "MAINTENANCE",
          maintenanceRef: matchedWo?.workOrderNumber || v.status,
        }
      }

      availableDaysCount++
      return {
        dateKey,
        status: "AVAILABLE",
      }
    })

    const occupancyPct =
      daysCount > 0
        ? Number((((rentedDaysCount + reservedDaysCount) / daysCount) * 100).toFixed(1))
        : 0

    return {
      vehicleId: v.id,
      plate: v.plate,
      brandModel: `${v.brand} ${v.model} (${v.modelYear || 2024})`,
      branchId: v.branchId || "local-debug-branch",
      vehicleClassId: v.rentalClassId || null,
      vehicleClassName: cls?.name || "Genel Filo",
      fleetStatus: v.status,
      rentalStatus: v.rentalStatus || (v.status === "MAINTENANCE" ? "MAINTENANCE" : "AVAILABLE"),
      odometerKm: Number(v.odometerKm || 0),
      currentFuelPct: Number(v.currentFuelPct ?? 100),
      days,
      rentedDaysCount,
      reservedDaysCount,
      maintenanceDaysCount,
      availableDaysCount,
      occupancyPct,
    }
  })

  return { dateHeaders, rows }
}
