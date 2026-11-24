/**
 * Lojistik Faz 3 — Saf İstemci & Sunucu Paylaşımlı Tedarikçi, RFQ, PO, ASN ve Skor Kartı Yardımcıları
 *
 * KURALLAR:
 * - "use client" bileşenleri tarafından güvenle import edilebilir (Prisma/fs YOKTUR).
 * - GLN-13 GS1 Mod-10 check-digit doğrulaması ve hesaplama.
 * - EOQ, Güvenlik Stoğu, Dinamik ROP ve Ağırlıklı Tedarikçi Skor Kartı formülleri tek doğruluk kaynağı.
 */

export type SupplierApprovalStatus = "ONAYLI" | "ASKIDA" | "KARALISTE" | "ADAY"
export type SupplierCriticalityLevel = "KRITIK" | "YUKSEK" | "ORTA" | "DUSUK"
export type SupplierCategory =
  | "KESME_CICEK"
  | "SAKSI_BITKI"
  | "CAM_SERAMIK"
  | "AMBALAJ_KOLI"
  | "LOJISTIK_SARF"
  | "GENEL"

export type PoWorkflowStatus =
  | "TASLAK"
  | "ONAY_BEKLIYOR"
  | "TEDARIKCIYE_ILETILDI"
  | "TEDARIKCI_ONAYLADI"
  | "KISMI_ONAY"
  | "RED_BAYRAK"
  | "KISMI_TESLIM"
  | "TESLIM_ALINDI"
  | "TAMAMLANDI"
  | "IPTAL"

export type SupplierDocStatus =
  | "GECERLI"
  | "YENILEME_YAKIN"
  | "SURESI_DOLMUS"
  | "INCELEMEDE"

export const SUPPLIER_APPROVAL_LABELS: Record<string, string> = {
  ONAYLI: "Onaylı Tedarikçi",
  ASKIDA: "Askıda",
  KARALISTE: "Kara Liste",
  ADAY: "Aday Değerlendirme",
}

export const SUPPLIER_APPROVAL_BADGES: Record<string, string> = {
  ONAYLI: "bg-[--brand]/10 text-[#1267E6] border-[--brand]/25",
  ASKIDA: "bg-amber-500/10 text-amber-300 border-amber-500/25",
  KARALISTE: "bg-rose-500/10 text-rose-300 border-rose-500/25",
  ADAY: "bg-zinc-500/10 text-zinc-300 border-white/[0.08]",
}

export const SUPPLIER_CATEGORY_LABELS: Record<string, string> = {
  KESME_CICEK: "Kesme Çiçek & İthalat",
  SAKSI_BITKI: "Saksı & Dış Mekan Bitki",
  CAM_SERAMIK: "Cam Vazo & Seramik",
  AMBALAJ_KOLI: "Ambalaj, Kraft & Koli",
  LOJISTIK_SARF: "Soğuk Zincir & Lojistik Sarf",
  GENEL: "Genel Tedarik",
}

export const SUPPLIER_CRITICALITY_LABELS: Record<string, string> = {
  KRITIK: "Kritik",
  YUKSEK: "Yüksek",
  ORTA: "Orta",
  DUSUK: "Düşük",
}

export const PO_STATUS_LABELS: Record<string, string> = {
  TASLAK: "Taslak",
  ONAY_BEKLIYOR: "Onay Bekliyor",
  TEDARIKCIYE_ILETILDI: "Tedarikçiye İletildi",
  TEDARIKCI_ONAYLADI: "Tedarikçi Onayladı",
  KISMI_ONAY: "Kısmi Onay / Revize",
  RED_BAYRAK: "Tedarikçi Kırmızı Bayrak",
  KISMI_TESLIM: "Kısmi Teslim Alındı",
  TESLIM_ALINDI: "Teslim Alındı",
  TAMAMLANDI: "Tamamlandı",
  IPTAL: "İptal",
}

export const SUPPLIER_RESPONSE_LABELS: Record<string, string> = {
  BEKLIYOR: "Tedarikçi Yanıtı Bekleniyor",
  ONAYLANDI: "Tedarikçi Onayladı",
  KISMI_ONAY: "Kısmi Onay Bildirdi",
  RED_BAYRAK: "Kırmızı Bayrak / Gecikme Riski",
}

export const DOC_TYPE_LABELS: Record<string, string> = {
  SOZLESME: "Tedarik Çerçeve Sözleşmesi",
  ISO_KALITE: "ISO / Kalite Yönetim Sertifikası",
  VERGI_LEVHA: "Vergi Levhası & Faaliyet Belgesi",
  GIDA_TARIM: "Bitki Sağlığı / Tarım Bakanlığı İzni",
  FIYAT_LISTESI: "Onaylı Dönem Fiyat Listesi",
  DIGER: "Diğer Tedarikçi Belgesi",
}

export const DOC_STATUS_LABELS: Record<string, string> = {
  GECERLI: "Geçerli",
  YENILEME_YAKIN: "Yenileme Yaklaşıyor",
  SURESI_DOLMUS: "Süresi Dolmuş",
  INCELEMEDE: "İncelemede",
}

export const DEFAULT_SCORECARD_WEIGHTS = {
  otdWeight: 35,
  qtyWeight: 25,
  qualityWeight: 25,
  priceWeight: 15,
} as const

export interface ScorecardWeightsInput {
  otdWeight: number
  qtyWeight: number
  qualityWeight: number
  priceWeight: number
}

/**
 * GS1 GLN-13 (Global Location Number) Mod-10 kontrol hanesi hesaplar (ilk 12 haneden).
 */
export function computeGln13CheckDigit(first12Digits: string): string {
  const digits = first12Digits.replace(/\D/g, "")
  if (digits.length !== 12) {
    throw new Error("GLN-13 kontrol hanesi için tam 12 rakam gereklidir.")
  }
  let sum = 0
  for (let i = 0; i < 12; i++) {
    const d = Number(digits[i])
    // Sağdan 1. hane (12. konum) ağırlık 3, soluna doğru 1, 3, ... (indeks 0..11 => tek indeksler *3, çift indeksler *1)
    sum += i % 2 === 1 ? d * 3 : d * 1
  }
  const mod = sum % 10
  return String(mod === 0 ? 0 : 10 - mod)
}

export function generateGln13(prefix12: string): string {
  const clean = prefix12.replace(/\D/g, "").padStart(12, "8").slice(0, 12)
  return `${clean}${computeGln13CheckDigit(clean)}`
}

export function validateGln13(gln: string): { valid: boolean; reason?: string } {
  const clean = gln.trim()
  if (!/^\d{13}$/.test(clean)) {
    return { valid: false, reason: "GLN-13 tam 13 adet rakamdan oluşmalıdır." }
  }
  const expected = computeGln13CheckDigit(clean.slice(0, 12))
  if (clean[12] !== expected) {
    return {
      valid: false,
      reason: `GS1 Mod-10 kontrol hanesi geçersiz (beklenen: ${expected}, girilen: ${clean[12]}).`,
    }
  }
  return { valid: true }
}

/**
 * Çok Kademeli PO Onay Kuralları (Tutar eşiklerine göre otomatik kademe belirler)
 * - Tier 1 (< ₺25.000): 1 Kademe — Satın Alma Uzmanı / Şef
 * - Tier 2 (₺25.000 - ₺75.000): 2 Kademe — Satın Alma Uzmanı -> Satın Alma Müdürü
 * - Tier 3 (> ₺75.000 veya Acil/Riskli): 3 Kademe — Uzman -> Satın Alma Müdürü -> Finans / Genel Müdür
 */
export function resolvePoApprovalPlan(
  totalAmount: number,
  priority?: string
): Array<{ stepOrder: number; approverRole: string; thresholdMin: number }> {
  const amount = Math.max(0, Number(totalAmount || 0))
  const isCriticalOverride = priority === "CRITICAL" && amount >= 15000

  const plan = [
    { stepOrder: 1, approverRole: "Satın Alma Uzmanı", thresholdMin: 0 },
  ]
  if (amount >= 25000 || isCriticalOverride) {
    plan.push({ stepOrder: 2, approverRole: "Satın Alma Müdürü", thresholdMin: 25000 })
  }
  if (amount >= 75000) {
    plan.push({ stepOrder: 3, approverRole: "Genel Müdür / Finans Onayı", thresholdMin: 75000 })
  }
  return plan
}

/**
 * EOQ (Ekonomik Sipariş Miktarı), Güvenlik Stoğu ve ROP hesaplama
 * EOQ = sqrt((2 * D * S) / H)
 * SafetyStock = Z * sigma_d * sqrt(L)
 * ROP = (avgDailyDemand * seasonality * L) + SafetyStock
 */
export function computeEoqAndRopMetrics(params: {
  annualDemand: number
  orderingCostTry: number
  holdingCostTry: number
  avgDailyDemand: number
  demandStdDev: number
  leadTimeDays: number
  serviceLevelPercent?: number
  seasonalityMultiplier?: number
  currentAvailableQty?: number
  onOrderQty?: number
  minOrderQtyMoq?: number
}) {
  const zMap: Record<number, number> = {
    90: 1.28,
    95: 1.65,
    98: 2.05,
    99: 2.33,
  }
  const sl = params.serviceLevelPercent ?? 95
  const z = zMap[sl] ?? 1.65
  const lead = Math.max(1, Number(params.leadTimeDays || 1))
  const season = Number(params.seasonalityMultiplier || 1.0)
  const safetyStock = Math.ceil(z * Math.max(0, params.demandStdDev) * Math.sqrt(lead))
  const leadDemand = Math.ceil(Math.max(0, params.avgDailyDemand) * season * lead)
  const rop = leadDemand + safetyStock

  const D = Math.max(0, Number(params.annualDemand || 0))
  const S = Math.max(0, Number(params.orderingCostTry || 0))
  const H = Math.max(0, Number(params.holdingCostTry || 0))
  const eoq = D > 0 && S > 0 && H > 0 ? Math.round(Math.sqrt((2 * D * S) / H)) : 0

  const avail = Number(params.currentAvailableQty ?? 0)
  const onOrder = Number(params.onOrderQty ?? 0)
  const netPos = avail + onOrder
  const moq = Math.max(1, Number(params.minOrderQtyMoq ?? 1))
  const deficit = Math.max(0, rop - netPos)
  const suggestedOrderQty = netPos <= rop ? Math.max(eoq, deficit, moq) : 0

  return {
    serviceLevelZ: z,
    safetyStock,
    rop,
    eoq,
    netPosition: netPos,
    needsReorder: netPos <= rop,
    suggestedOrderQty,
  }
}

export function clampScore(val: number): number {
  if (!Number.isFinite(val)) return 0
  return Math.max(0, Math.min(100, Number(val.toFixed(2))))
}

export function computeCompositeScorecard(metrics: {
  onTimeCount: number
  deliveredCount: number
  totalOrderedQty: number
  totalAbsQtyVariance: number
  totalReceivedPhysicalQty: number
  totalRejectedQty: number
  baselineTotalCost: number
  agreedTotalCost: number
  weights?: ScorecardWeightsInput
}) {
  const weights = metrics.weights ?? DEFAULT_SCORECARD_WEIGHTS
  const weightSum =
    Number(weights.otdWeight) +
    Number(weights.qtyWeight) +
    Number(weights.qualityWeight) +
    Number(weights.priceWeight)
  if (Math.abs(weightSum - 100) > 0.01) {
    throw new Error(`Skor kartı ağırlık toplamı 100 olmalıdır (girilen: ${weightSum}).`)
  }

  const otdRate =
    metrics.deliveredCount > 0
      ? clampScore((metrics.onTimeCount / metrics.deliveredCount) * 100)
      : 100

  const qtyComplianceRate =
    metrics.totalOrderedQty > 0
      ? clampScore(100 - (metrics.totalAbsQtyVariance / metrics.totalOrderedQty) * 100)
      : 100

  const qualityAcceptanceRate =
    metrics.totalReceivedPhysicalQty > 0
      ? clampScore(
          ((metrics.totalReceivedPhysicalQty - metrics.totalRejectedQty) /
            metrics.totalReceivedPhysicalQty) *
            100
        )
      : 100

  const avgPriceVariancePct =
    metrics.baselineTotalCost > 0
      ? Number(
          (
            ((metrics.agreedTotalCost - metrics.baselineTotalCost) /
              metrics.baselineTotalCost) *
            100
          ).toFixed(2)
        )
      : 0

  // Fiyat bütçeyi/referansı aşarsa her %1 aşım için 2 puan düşer; tasarruf sağlanırsa tam 100 puan
  const priceVarianceScore =
    avgPriceVariancePct <= 0
      ? 100
      : clampScore(100 - avgPriceVariancePct * 2)

  const compositeScore = clampScore(
    (otdRate * weights.otdWeight +
      qtyComplianceRate * weights.qtyWeight +
      qualityAcceptanceRate * weights.qualityWeight +
      priceVarianceScore * weights.priceWeight) /
      100
  )

  const tier =
    compositeScore >= 90
      ? "A"
      : compositeScore >= 75
        ? "B"
        : compositeScore >= 60
          ? "C"
          : "D"

  return {
    otdRate,
    qtyComplianceRate,
    qualityAcceptanceRate,
    avgPriceVariancePct,
    priceVarianceScore,
    compositeScore,
    tier,
  }
}
