/**
 * Sunum ERP — Üretim Kalite Kontrol, Muayene, NCR & İstatistiksel Süreç Kontrolü Motoru
 *
 * Saf İş Mantığı ve Matematiksel Hesaplamalar:
 * 1. ISO 2859-1 / ANSI/ASQ Z1.4 AQL Numune Büyüklüğü & Kabul/Ret Tablosu
 * 2. Tolerans & Değişken/Niteliksel Ölçüm Doğrulama
 * 3. Muayene Karar Verme Algoritması (Kabul / Şartlı Kabul / Ret)
 * 4. NCR & DÖF (CAPA) Durum Makinesi (State Machine)
 * 5. İki Yönlü Parti İzlenebilirliği (İleri / Geri) & Geri Çağırma (Recall) Etki Analizi
 * 6. Ölçüm Cihazı Kalibrasyon Geçerlilik Denetimi (Engelleme Altyapısı)
 * 7. Pareto Analizi (80/20) & SPC X-bar / R İstatistiksel Kontrol Limitleri
 * 8. Tedarikçi Kalite Puanlama İstatistiği
 */

import { ProductionDomainError } from "./productionAuditAndError"

// ─────────────────────────────────────────────────────────────
// 1. ISO 2859-1 AQL STANDART NUMUNE TABLOLARI
// ─────────────────────────────────────────────────────────────

export type InspectionLevel = "LEVEL_I" | "LEVEL_II" | "LEVEL_III"
export type SamplingMethod = "AQL" | "PERCENTAGE" | "FIXED" | "FULL_INSPECTION"

interface LotSizeRange {
  min: number
  max: number
  levelI: string
  levelII: string
  levelIII: string
}

// ISO 2859-1 Tablo 1: Numune Boyut Kod Harfleri (Genel Muayene Seviyeleri I, II, III)
const LOT_SIZE_CODE_TABLE: LotSizeRange[] = [
  { min: 2, max: 8, levelI: "A", levelII: "A", levelIII: "B" },
  { min: 9, max: 15, levelI: "A", levelII: "B", levelIII: "C" },
  { min: 16, max: 25, levelI: "B", levelII: "C", levelIII: "D" },
  { min: 26, max: 50, levelI: "C", levelII: "D", levelIII: "E" },
  { min: 51, max: 90, levelI: "C", levelII: "E", levelIII: "F" },
  { min: 91, max: 150, levelI: "D", levelII: "F", levelIII: "G" },
  { min: 151, max: 280, levelI: "E", levelII: "G", levelIII: "H" },
  { min: 281, max: 500, levelI: "F", levelII: "H", levelIII: "J" },
  { min: 501, max: 1200, levelI: "G", levelII: "J", levelIII: "K" },
  { min: 1201, max: 3200, levelI: "H", levelII: "K", levelIII: "L" },
  { min: 3201, max: 10000, levelI: "J", levelII: "L", levelIII: "M" },
  { min: 10001, max: 35000, levelI: "K", levelII: "M", levelIII: "N" },
  { min: 35001, max: 150000, levelI: "L", levelII: "N", levelIII: "P" },
  { min: 150001, max: 500000, levelI: "M", levelII: "P", levelIII: "Q" },
  { min: 500001, max: Infinity, levelI: "N", levelII: "Q", levelIII: "R" },
]

// Kod Harfine Karşılık Gelen Standart Numune Boyutları
const CODE_LETTER_SAMPLE_SIZES: Record<string, number> = {
  A: 2,
  B: 3,
  C: 5,
  D: 8,
  E: 13,
  F: 20,
  G: 32,
  H: 50,
  J: 80,
  K: 125,
  L: 200,
  M: 315,
  N: 500,
  P: 800,
  Q: 1250,
  R: 2000,
}

// ISO 2859-1 Normal Tekli Numune Alma Planı (Yaygın AQL Değerleri İçin Kabul Ac / Ret Re)
// format: [Ac, Re]
const AQL_PLANS: Record<string, Record<number, [number, number]>> = {
  // AQL 0.65
  "0.65": {
    2: [0, 1],
    3: [0, 1],
    5: [0, 1],
    8: [0, 1],
    13: [0, 1],
    20: [0, 1],
    32: [0, 1],
    50: [1, 2],
    80: [1, 2],
    125: [2, 3],
    200: [3, 4],
    315: [5, 6],
    500: [7, 8],
    800: [10, 11],
    1250: [14, 15],
    2000: [21, 22],
  },
  // AQL 1.0
  "1.0": {
    2: [0, 1],
    3: [0, 1],
    5: [0, 1],
    8: [0, 1],
    13: [0, 1],
    20: [0, 1],
    32: [1, 2],
    50: [1, 2],
    80: [2, 3],
    125: [3, 4],
    200: [5, 6],
    315: [7, 8],
    500: [10, 11],
    800: [14, 15],
    1250: [21, 22],
    2000: [21, 22],
  },
  // AQL 1.5 (Varsayılan Endüstriyel Kabul)
  "1.5": {
    2: [0, 1],
    3: [0, 1],
    5: [0, 1],
    8: [0, 1],
    13: [0, 1],
    20: [1, 2],
    32: [1, 2],
    50: [2, 3],
    80: [3, 4],
    125: [5, 6],
    200: [7, 8],
    315: [10, 11],
    500: [14, 15],
    800: [21, 22],
    1250: [21, 22],
    2000: [21, 22],
  },
  // AQL 2.5
  "2.5": {
    2: [0, 1],
    3: [0, 1],
    5: [0, 1],
    8: [0, 1],
    13: [1, 2],
    20: [1, 2],
    32: [2, 3],
    50: [3, 4],
    80: [5, 6],
    125: [7, 8],
    200: [10, 11],
    315: [14, 15],
    500: [21, 22],
    800: [21, 22],
    1250: [21, 22],
    2000: [21, 22],
  },
  // AQL 4.0
  "4.0": {
    2: [0, 1],
    3: [0, 1],
    5: [0, 1],
    8: [1, 2],
    13: [1, 2],
    20: [2, 3],
    32: [3, 4],
    50: [5, 6],
    80: [7, 8],
    125: [10, 11],
    200: [14, 15],
    315: [21, 22],
    500: [21, 22],
    800: [21, 22],
    1250: [21, 22],
    2000: [21, 22],
  },
}

export interface AqlCalculationResult {
  lotSize: number
  samplingMethod: SamplingMethod
  codeLetter: string
  sampleSize: number
  aqlLimit: number
  acceptanceNumber: number // Ac: Bu sayı veya daha az hata varsa parti KABUL
  rejectionNumber: number // Re: Bu sayı veya daha fazla hata varsa parti RET
  inspectionLevel: InspectionLevel
}

/**
 * ISO 2859-1 standardına göre parti büyüklüğü ve seviyeden numune büyüklüğü ve Ac/Re limitlerini hesaplar.
 */
export function calculateAqlSamplingPlan(params: {
  lotSize: number
  samplingMethod?: SamplingMethod
  samplingSize?: number | null // Sabit adet veya yüzde (PERCENTAGE veya FIXED ise)
  inspectionLevel?: InspectionLevel
  aqlLimit?: number
}): AqlCalculationResult {
  const lotSize = Math.max(1, Math.round(params.lotSize))
  const method = params.samplingMethod || "AQL"
  const level: InspectionLevel = params.inspectionLevel || "LEVEL_II"
  const aqlLimit = params.aqlLimit !== undefined ? params.aqlLimit : 1.5

  if (method === "FULL_INSPECTION") {
    return {
      lotSize,
      samplingMethod: "FULL_INSPECTION",
      codeLetter: "FULL",
      sampleSize: lotSize,
      aqlLimit: 0,
      acceptanceNumber: 0,
      rejectionNumber: 1,
      inspectionLevel: level,
    }
  }

  if (method === "FIXED") {
    const fixedQty = Math.max(1, Math.min(lotSize, Math.round(params.samplingSize || 5)))
    return {
      lotSize,
      samplingMethod: "FIXED",
      codeLetter: "FIX",
      sampleSize: fixedQty,
      aqlLimit,
      acceptanceNumber: 0,
      rejectionNumber: 1,
      inspectionLevel: level,
    }
  }

  if (method === "PERCENTAGE") {
    const pct = Math.max(1, Math.min(100, params.samplingSize || 10))
    const sampleSize = Math.max(1, Math.min(lotSize, Math.ceil((lotSize * pct) / 100)))
    return {
      lotSize,
      samplingMethod: "PERCENTAGE",
      codeLetter: "PCT",
      sampleSize,
      aqlLimit,
      acceptanceNumber: Math.max(0, Math.floor((sampleSize * aqlLimit) / 100)),
      rejectionNumber: Math.max(1, Math.floor((sampleSize * aqlLimit) / 100) + 1),
      inspectionLevel: level,
    }
  }

  // Standart ISO 2859-1 AQL
  const matchedRange = LOT_SIZE_CODE_TABLE.find(
    (range) => lotSize >= range.min && lotSize <= range.max
  ) || LOT_SIZE_CODE_TABLE[LOT_SIZE_CODE_TABLE.length - 1]

  let codeLetter = "A"
  if (level === "LEVEL_I") codeLetter = matchedRange.levelI
  else if (level === "LEVEL_III") codeLetter = matchedRange.levelIII
  else codeLetter = matchedRange.levelII

  let sampleSize = CODE_LETTER_SAMPLE_SIZES[codeLetter] || 2
  if (sampleSize > lotSize) {
    sampleSize = lotSize
  }

  // AQL Ac / Re Bulma
  const aqlKey = String(aqlLimit)
  const planForAql = AQL_PLANS[aqlKey] || AQL_PLANS["1.5"]
  const [ac, re] = planForAql[sampleSize] || [0, 1]

  return {
    lotSize,
    samplingMethod: "AQL",
    codeLetter,
    sampleSize,
    aqlLimit,
    acceptanceNumber: ac,
    rejectionNumber: re,
    inspectionLevel: level,
  }
}

// ─────────────────────────────────────────────────────────────
// 2. TOLERANS & ÖLÇÜM KONTROLÜ
// ─────────────────────────────────────────────────────────────

export interface CharacteristicEvaluationInput {
  characteristicType: "VARIABLE" | "ATTRIBUTE"
  nominalValue?: number | null
  minTolerance?: number | null // örn. -0.05
  maxTolerance?: number | null // örn. +0.05
  minValue?: number | null
  maxValue?: number | null
  measuredValue?: number | null
  isAttributePassed?: boolean | null
}

export interface CharacteristicEvaluationResult {
  isConforming: boolean
  deviation?: number
  effectiveMin?: number
  effectiveMax?: number
  reason?: string
}

/**
 * Tekil ölçüm veya nitelik sonucunun toleranslara uygunluğunu değerlendirir.
 */
export function evaluateCharacteristicMeasurement(
  input: CharacteristicEvaluationInput
): CharacteristicEvaluationResult {
  if (input.characteristicType === "ATTRIBUTE") {
    const isConforming = input.isAttributePassed === true
    return {
      isConforming,
      reason: isConforming ? "Niteliksel test başarılı (Geçti)" : "Niteliksel test başarısız (Kaldı)",
    }
  }

  // VARIABLE (Sayısal Ölçüm)
  if (input.measuredValue === undefined || input.measuredValue === null || isNaN(input.measuredValue)) {
    return {
      isConforming: false,
      reason: "Ölçüm değeri girilmemiş veya geçersiz sayısal değer.",
    }
  }

  const measured = input.measuredValue
  const nominal = input.nominalValue ?? 0

  let effectiveMin: number | undefined = undefined
  let effectiveMax: number | undefined = undefined

  if (input.minValue !== undefined && input.minValue !== null) {
    effectiveMin = input.minValue
  } else if (input.minTolerance !== undefined && input.minTolerance !== null) {
    // minTolerance negatifse (örn. -0.2) ya da pozitif verilmişse nominal - abs(min)
    effectiveMin = nominal - Math.abs(input.minTolerance)
  }

  if (input.maxValue !== undefined && input.maxValue !== null) {
    effectiveMax = input.maxValue
  } else if (input.maxTolerance !== undefined && input.maxTolerance !== null) {
    effectiveMax = nominal + Math.abs(input.maxTolerance)
  }

  const deviation = Number((measured - nominal).toFixed(4))

  let isConforming = true
  let reason = "Ölçüm tolerans limitleri dahilinde."

  if (effectiveMin !== undefined && measured < effectiveMin) {
    isConforming = false
    reason = `Ölçülen değer (${measured}), alt tolerans limitinin (${effectiveMin}) altında.`
  } else if (effectiveMax !== undefined && measured > effectiveMax) {
    isConforming = false
    reason = `Ölçülen değer (${measured}), üst tolerans limitinin (${effectiveMax}) üzerinde.`
  }

  return {
    isConforming,
    deviation,
    effectiveMin,
    effectiveMax,
    reason,
  }
}

// ─────────────────────────────────────────────────────────────
// 3. MUAYENE KARAR ALGORİTMASI (PASSED / CONDITIONAL / REJECTED)
// ─────────────────────────────────────────────────────────────

export interface InspectionDispositionInput {
  sampleSize: number
  acceptanceNumber: number // Ac
  rejectionNumber: number // Re
  results: Array<{
    isConforming: boolean
    isCritical?: boolean
    deviation?: number
    characteristicName?: string
  }>
  allowConditionalAcceptance?: boolean
  maxConditionalDefects?: number
}

export interface InspectionDispositionResult {
  disposition: "PASSED" | "CONDITIONAL_PASSED" | "REJECTED"
  totalEvaluated: number
  conformingCount: number
  defectCount: number
  criticalDefectCount: number
  defectRate: number
  decisionReason: string
  isStockBlockRequired: boolean
}

/**
 * Muayene numune ölçüm sonuçlarına göre nihai kabul/şartlı kabul/ret kararını belirler.
 */
export function determineInspectionDisposition(
  input: InspectionDispositionInput
): InspectionDispositionResult {
  const totalEvaluated = input.results.length
  let defectCount = 0
  let criticalDefectCount = 0

  for (const r of input.results) {
    if (!r.isConforming) {
      defectCount++
      if (r.isCritical) {
        criticalDefectCount++
      }
    }
  }

  const conformingCount = totalEvaluated - defectCount
  const defectRate = totalEvaluated > 0 ? Number(((defectCount / totalEvaluated) * 100).toFixed(2)) : 0

  // 1. Kritik Hata Kuralı: Kritik tolerans hatası varsa doğrudan RET
  if (criticalDefectCount > 0) {
    return {
      disposition: "REJECTED",
      totalEvaluated,
      conformingCount,
      defectCount,
      criticalDefectCount,
      defectRate,
      decisionReason: `Partide ${criticalDefectCount} adet KRİTİK tolerans uygunsuzluğu tespit edildi. Doğrudan RET.`,
      isStockBlockRequired: true,
    }
  }

  // 2. AQL Rejection Kuralı
  if (defectCount >= input.rejectionNumber) {
    // Şartlı kabul incelenebilir mi?
    if (
      input.allowConditionalAcceptance &&
      input.maxConditionalDefects &&
      defectCount <= input.maxConditionalDefects
    ) {
      return {
        disposition: "CONDITIONAL_PASSED",
        totalEvaluated,
        conformingCount,
        defectCount,
        criticalDefectCount: 0,
        defectRate,
        decisionReason: `Hata sayısı (${defectCount}) AQL ret sınırında (${input.rejectionNumber}), ancak kritik olmayan sapmalar için Şartlı Kabul onaylandı.`,
        isStockBlockRequired: false,
      }
    }

    return {
      disposition: "REJECTED",
      totalEvaluated,
      conformingCount,
      defectCount,
      criticalDefectCount: 0,
      defectRate,
      decisionReason: `Hata sayısı (${defectCount}) AQL ret eşiğini (${input.rejectionNumber}) aştı. Parti RET edildi.`,
      isStockBlockRequired: true,
    }
  }

  // 3. AQL Kabul
  return {
    disposition: "PASSED",
    totalEvaluated,
    conformingCount,
    defectCount,
    criticalDefectCount: 0,
    defectRate,
    decisionReason: `Hata sayısı (${defectCount}) AQL kabul eşiğinin (${input.acceptanceNumber}) altında veya eşit. Parti KABUL edildi.`,
    isStockBlockRequired: false,
  }
}

// ─────────────────────────────────────────────────────────────
// 4. NCR & DÖF (CAPA) DURUM MAKİNESİ (STATE MACHINE)
// ─────────────────────────────────────────────────────────────

export type NcrStatus =
  | "OPEN"
  | "INVESTIGATION"
  | "ACTION_PENDING"
  | "EFFECTIVENESS_CHECK"
  | "CLOSED"
  | "CANCELLED"

const NCR_VALID_TRANSITIONS: Record<NcrStatus, NcrStatus[]> = {
  OPEN: ["INVESTIGATION", "CANCELLED"],
  INVESTIGATION: ["ACTION_PENDING", "CANCELLED"],
  ACTION_PENDING: ["EFFECTIVENESS_CHECK", "CANCELLED"],
  EFFECTIVENESS_CHECK: ["CLOSED", "ACTION_PENDING", "CANCELLED"], // Etkinlik yetersizse tekrar ACTION_PENDING'e dönebilir
  CLOSED: [],
  CANCELLED: [],
}

/**
 * NCR / DÖF durum geçişinin geçerli olup olmadığını doğrular.
 */
export function validateNcrStateTransition(
  currentStatus: NcrStatus,
  targetStatus: NcrStatus,
  context?: {
    rootCauseDescription?: string | null
    correctiveAction?: string | null
    assignedToUserId?: string | null
    effectivenessResult?: string | null
  }
): { valid: boolean; error?: string } {
  if (currentStatus === targetStatus) {
    return { valid: true }
  }

  const allowed = NCR_VALID_TRANSITIONS[currentStatus] || []
  if (!allowed.includes(targetStatus)) {
    return {
      valid: false,
      error: `Geçersiz NCR durum geçişi: '${currentStatus}' durumundan '${targetStatus}' durumuna geçilemez. İzin verilen geçişler: ${allowed.join(", ") || "Yok (Kapanmış)"}`,
    }
  }

  // İş Kuralı: ACTION_PENDING'e geçebilmek için Kök Neden Analizi doldurulmuş olmalıdır
  if (targetStatus === "ACTION_PENDING") {
    if (!context?.rootCauseDescription || context.rootCauseDescription.trim().length < 5) {
      return {
        valid: false,
        error: "Aksiyon aşamasına geçebilmek için Kök Neden Analizi açıklaması zorunludur.",
      }
    }
  }

  // İş Kuralı: EFFECTIVENESS_CHECK'e geçebilmek için Düzeltici Faaliyet doldurulmuş olmalıdır
  if (targetStatus === "EFFECTIVENESS_CHECK") {
    if (!context?.correctiveAction || context.correctiveAction.trim().length < 5) {
      return {
        valid: false,
        error: "Etkinlik doğrulama aşamasına geçebilmek için Düzeltici Faaliyet açıklaması zorunludur.",
      }
    }
  }

  // İş Kuralı: CLOSED olabilmek için Etkinlik Sonucu 'EFFECTIVE' olmalıdır
  if (targetStatus === "CLOSED") {
    if (context?.effectivenessResult !== "EFFECTIVE") {
      return {
        valid: false,
        error: "NCR/DÖF kaydı yalnızca etkinlik doğrulaması 'Başarılı (EFFECTIVE)' onaylandığında kapatılabilir.",
      }
    }
  }

  return { valid: true }
}

// ─────────────────────────────────────────────────────────────
// 5. KALİBRASYON GEÇERLİLİK KONTROLÜ
// ─────────────────────────────────────────────────────────────

export interface CalibrationDeviceRecord {
  id: string
  deviceCode: string
  deviceName: string
  status: string
  nextCalibrationDate: Date | string
}

/**
 * Ölçüm cihazının kalibrasyon süresinin geçerli olup olmadığını denetler.
 * Süresi geçmiş veya kullanım dışı cihaz tespit edilirse ProductionDomainError fırlatır.
 */
export function checkCalibrationDeviceValidity(device: CalibrationDeviceRecord): {
  isValid: boolean
  isExpiringSoon: boolean
  daysRemaining: number
} {
  const now = new Date()
  const nextDate = new Date(device.nextCalibrationDate)

  const diffMs = nextDate.getTime() - now.getTime()
  const daysRemaining = Math.ceil(diffMs / (1000 * 60 * 60 * 24))

  if (device.status === "OUT_OF_SERVICE") {
    throw new ProductionDomainError(
      "CALIBRATION_EXPIRED",
      `'${device.deviceName}' (${device.deviceCode}) ölçüm cihazı kullanım dışıdır (OUT_OF_SERVICE). Bu cihazla muayene ölçümü yapılamaz!`,
      { deviceId: device.id, deviceCode: device.deviceCode, status: device.status },
      422
    )
  }

  if (device.status === "EXPIRED" || daysRemaining < 0) {
    throw new ProductionDomainError(
      "CALIBRATION_EXPIRED",
      `'${device.deviceName}' (${device.deviceCode}) cihazının kalibrasyon geçerlilik süresi ${Math.abs(daysRemaining)} gün önce dolmuştur! Kalibrasyonu geçmiş cihazla muayene girişi kesinlikle engellenmiştir.`,
      {
        deviceId: device.id,
        deviceCode: device.deviceCode,
        nextCalibrationDate: device.nextCalibrationDate,
        daysOverdue: Math.abs(daysRemaining),
      },
      422
    )
  }

  const isExpiringSoon = daysRemaining <= 30

  return {
    isValid: true,
    isExpiringSoon,
    daysRemaining,
  }
}

// ─────────────────────────────────────────────────────────────
// 6. PARETO ANALİZİ (80/20 KURALI)
// ─────────────────────────────────────────────────────────────

export interface ParetoItemInput {
  category: string
  count: number
  cost?: number
}

export interface ParetoItemOutput {
  category: string
  count: number
  cost: number
  percentage: number
  cumulativePercentage: number
  isVitalFew: boolean // %80 kümülatif dilimde yer alan öncelikli hata grubu
}

/**
 * Hata veya fire kategorilerini sıklık ve maliyetine göre 80/20 Pareto kuralı ile analiz eder.
 */
export function calculateParetoAnalysis(items: ParetoItemInput[]): ParetoItemOutput[] {
  if (!items || items.length === 0) return []

  const sorted = [...items].sort((a, b) => b.count - a.count)
  const totalCount = sorted.reduce((sum, item) => sum + item.count, 0)

  if (totalCount === 0) return []

  let cumulativeCount = 0
  const result: ParetoItemOutput[] = []

  for (const item of sorted) {
    cumulativeCount += item.count
    const percentage = Number(((item.count / totalCount) * 100).toFixed(2))
    const cumulativePercentage = Number(((cumulativeCount / totalCount) * 100).toFixed(2))

    result.push({
      category: item.category,
      count: item.count,
      cost: item.cost || 0,
      percentage,
      cumulativePercentage,
      isVitalFew: cumulativePercentage <= 80 || result.length === 0,
    })
  }

  return result
}

// ─────────────────────────────────────────────────────────────
// 7. SPC İSTATİSTİKSEL SÜREÇ KONTROLÜ (X-BAR & R CHART)
// ─────────────────────────────────────────────────────────────

// ASTM / ISO Standart Kontrol Grafiği Faktörleri (Alt grup boyutu n=2..10)
const SPC_FACTORS: Record<number, { A2: number; D3: number; D4: number }> = {
  2: { A2: 1.88, D3: 0, D4: 3.267 },
  3: { A2: 1.023, D3: 0, D4: 2.574 },
  4: { A2: 0.729, D3: 0, D4: 2.282 },
  5: { A2: 0.577, D3: 0, D4: 2.114 },
  6: { A2: 0.483, D3: 0, D4: 2.004 },
  7: { A2: 0.419, D3: 0.076, D4: 1.924 },
  8: { A2: 0.373, D3: 0.136, D4: 1.864 },
  9: { A2: 0.337, D3: 0.184, D4: 1.816 },
  10: { A2: 0.308, D3: 0.223, D4: 1.777 },
}

export interface SpcSubgroupData {
  subgroupId: string | number
  label?: string
  values: number[]
}

export interface SpcSubgroupCalculated {
  subgroupId: string | number
  label?: string
  n: number
  mean: number // X-bar
  range: number // R (Max - Min)
  isXOutOfControl: boolean
  isROutOfControl: boolean
}

export interface SpcChartLimits {
  subgroupSize: number
  grandMean: number // X-double-bar
  averageRange: number // R-bar
  xUcl: number // Upper Control Limit for X-bar
  xLcl: number // Lower Control Limit for X-bar
  xCl: number // Central Line for X-bar
  rUcl: number // Upper Control Limit for R
  rLcl: number // Lower Control Limit for R
  rCl: number // Central Line for R
  subgroups: SpcSubgroupCalculated[]
  isProcessInControl: boolean
}

/**
 * Alt gruplardan X-bar ve R kontrol limitlerini hesaplar ve kontrol dışı noktaları belirler.
 */
export function calculateSpcXBarRChart(subgroups: SpcSubgroupData[]): SpcChartLimits {
  if (!subgroups || subgroups.length === 0) {
    return {
      subgroupSize: 0,
      grandMean: 0,
      averageRange: 0,
      xUcl: 0,
      xLcl: 0,
      xCl: 0,
      rUcl: 0,
      rLcl: 0,
      rCl: 0,
      subgroups: [],
      isProcessInControl: true,
    }
  }

  // İlk geçerli alt grubun boyutunu baz alalım (min 2, max 10)
  const n = Math.max(2, Math.min(10, subgroups[0].values.length))
  const factors = SPC_FACTORS[n] || SPC_FACTORS[5]

  const calculatedSubgroups: Array<{
    subgroupId: string | number
    label?: string
    n: number
    mean: number
    range: number
  }> = []

  let sumOfMeans = 0
  let sumOfRanges = 0

  for (const sg of subgroups) {
    const vals = sg.values.filter((v) => typeof v === "number" && !isNaN(v))
    if (vals.length === 0) continue

    const sum = vals.reduce((a, b) => a + b, 0)
    const mean = Number((sum / vals.length).toFixed(4))
    const min = Math.min(...vals)
    const max = Math.max(...vals)
    const range = Number((max - min).toFixed(4))

    sumOfMeans += mean
    sumOfRanges += range

    calculatedSubgroups.push({
      subgroupId: sg.subgroupId,
      label: sg.label,
      n: vals.length,
      mean,
      range,
    })
  }

  const k = Math.max(1, calculatedSubgroups.length)
  const grandMean = Number((sumOfMeans / k).toFixed(4))
  const averageRange = Number((sumOfRanges / k).toFixed(4))

  // Limitler
  const xUcl = Number((grandMean + factors.A2 * averageRange).toFixed(4))
  const xLcl = Number((grandMean - factors.A2 * averageRange).toFixed(4))
  const xCl = grandMean

  const rUcl = Number((factors.D4 * averageRange).toFixed(4))
  const rLcl = Number((factors.D3 * averageRange).toFixed(4))
  const rCl = averageRange

  let isProcessInControl = true

  const enrichedSubgroups: SpcSubgroupCalculated[] = calculatedSubgroups.map((sg) => {
    const isXOutOfControl = sg.mean > xUcl || sg.mean < xLcl
    const isROutOfControl = sg.range > rUcl || sg.range < rLcl

    if (isXOutOfControl || isROutOfControl) {
      isProcessInControl = false
    }

    return {
      ...sg,
      isXOutOfControl,
      isROutOfControl,
    }
  })

  return {
    subgroupSize: n,
    grandMean,
    averageRange,
    xUcl,
    xLcl,
    xCl,
    rUcl,
    rLcl,
    rCl,
    subgroups: enrichedSubgroups,
    isProcessInControl,
  }
}

// ─────────────────────────────────────────────────────────────
// 8. TEDARİKÇİ KALİTE PUANLAMA
// ─────────────────────────────────────────────────────────────

export interface SupplierInspectionSummaryInput {
  supplierId: string
  supplierName: string
  totalInspections: number
  passedInspections: number
  conditionalPassedInspections: number
  rejectedInspections: number
  totalBatchQuantity: number
  rejectedQuantity: number
}

export interface SupplierQualityScoreResult {
  supplierId: string
  supplierName: string
  totalInspections: number
  passedInspections: number
  conditionalPassedInspections: number
  rejectedInspections: number
  qualityScore: number // 0 - 100
  acceptanceRate: number // %
  rejectionRate: number // %
  ratingBadge: "EXCELLENT" | "GOOD" | "RISKY" | "UNACCEPTABLE"
}

/**
 * Mal kabul muayenelerinden tedarikçi kalite skorunu (0 - 100) hesaplar.
 */
export function calculateSupplierQualityScore(
  input: SupplierInspectionSummaryInput
): SupplierQualityScoreResult {
  if (input.totalInspections <= 0) {
    return {
      supplierId: input.supplierId,
      supplierName: input.supplierName,
      totalInspections: 0,
      passedInspections: 0,
      conditionalPassedInspections: 0,
      rejectedInspections: 0,
      qualityScore: 100,
      acceptanceRate: 100,
      rejectionRate: 0,
      ratingBadge: "GOOD",
    }
  }

  // Puan Formülü: Tam Kabul = 1.0 katsayı, Şartlı Kabul = 0.70 katsayı, Ret = 0.0 katsayı
  const weightedSum =
    input.passedInspections * 1.0 +
    input.conditionalPassedInspections * 0.7 +
    input.rejectedInspections * 0.0

  const qualityScore = Number(((weightedSum / input.totalInspections) * 100).toFixed(1))
  const acceptanceRate = Number(
    (((input.passedInspections + input.conditionalPassedInspections) / input.totalInspections) * 100).toFixed(1)
  )
  const rejectionRate = Number(((input.rejectedInspections / input.totalInspections) * 100).toFixed(1))

  let ratingBadge: "EXCELLENT" | "GOOD" | "RISKY" | "UNACCEPTABLE" = "GOOD"
  if (qualityScore >= 95) ratingBadge = "EXCELLENT"
  else if (qualityScore >= 80) ratingBadge = "GOOD"
  else if (qualityScore >= 65) ratingBadge = "RISKY"
  else ratingBadge = "UNACCEPTABLE"

  return {
    supplierId: input.supplierId,
    supplierName: input.supplierName,
    totalInspections: input.totalInspections,
    passedInspections: input.passedInspections,
    conditionalPassedInspections: input.conditionalPassedInspections,
    rejectedInspections: input.rejectedInspections,
    qualityScore,
    acceptanceRate,
    rejectionRate,
    ratingBadge,
  }
}

