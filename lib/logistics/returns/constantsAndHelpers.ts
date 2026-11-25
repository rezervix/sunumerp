/**
 * Lojistik Faz 4 — Tersine Lojistik / İade (RMA) Saf İstemci & Sunucu Paylaşımlı Sabitleri ve Yardımcıları
 *
 * KURALLAR:
 * - "use client" bileşenleri tarafından güvenle import edilebilir (Prisma/fs/node:crypto YOKTUR).
 * - İade neden kodları, 8 aşamalı RMA durum makinesi, 4 muayene kararı, yasal asgari 14 gün ve garanti süresi hesaplayıcısı.
 */

export const LEGAL_MIN_RETURN_DAYS = 14

export const RMA_STATUS_VALUES = [
  "TALEP",
  "ONAYLANDI",
  "YOLDA",
  "TESLIM_ALINDI",
  "INCELEMEDE",
  "KARARA_BAGLANDI",
  "KAPANDI",
  "REDDEDILDI",
  "IPTAL",
] as const

export type RmaWorkflowStatus = (typeof RMA_STATUS_VALUES)[number]

export const RMA_REASON_CODES = [
  "HASARLI_KARGO",
  "YANLIS_URUN",
  "CAYMA_HAKKI",
  "KALITE_HATASI",
  "SKT_SORUNU",
  "GARANTI_KAPSAMI",
  "TESLIM_EDILEMEDI",
  "DIGER",
] as const

export type RmaReasonCode = (typeof RMA_REASON_CODES)[number]

export const RMA_QUALITY_DECISIONS = [
  "RESTOCK_TO_BIN",
  "REPAIR_REFURBISH",
  "RETURN_TO_VENDOR",
  "SCRAP",
] as const

export type RmaQualityDecision = (typeof RMA_QUALITY_DECISIONS)[number]

export const RMA_CREDIT_NOTE_STATUSES = [
  "TASLAK_ONAY_BEKLIYOR",
  "ONAYLANDI",
  "IADE_ODENDI",
  "REDDEDILDI",
] as const

export type RmaCreditNoteStatus = (typeof RMA_CREDIT_NOTE_STATUSES)[number]

export const RMA_STATUS_LABELS: Record<RmaWorkflowStatus, string> = {
  TALEP: "Talep Oluşturuldu",
  ONAYLANDI: "Onaylandı",
  YOLDA: "İade Yolda",
  TESLIM_ALINDI: "Teslim Alındı (Karantina)",
  INCELEMEDE: "Kalite İncelemesinde",
  KARARA_BAGLANDI: "Karara Bağlandı",
  KAPANDI: "Kapandı",
  REDDEDILDI: "Reddedildi",
  IPTAL: "İptal Edildi",
}

export const RMA_STATUS_BADGE_CLASSES: Record<RmaWorkflowStatus, string> = {
  TALEP: "bg-[var(--warn-soft)] text-[var(--warn)] border-amber-500/25",
  ONAYLANDI: "bg-sky-500/10 text-sky-300 border-sky-500/25",
  YOLDA: "bg-[var(--brand-soft)] text-indigo-300 border-indigo-500/25",
  TESLIM_ALINDI: "bg-[var(--brand-soft)] text-[var(--brand)] border-[var(--brand-line)]/25",
  INCELEMEDE: "bg-[var(--warn-soft)] text-orange-300 border-orange-500/25",
  KARARA_BAGLANDI: "bg-[var(--brand-soft)] text-[var(--brand)] border-[var(--brand-line)]/25",
  KAPANDI: "bg-[--brand]/10 text-[#1267E6] border-[--brand]/25",
  REDDEDILDI: "bg-[var(--bad-soft)] text-[var(--bad)] border-rose-500/25",
  IPTAL: "bg-[var(--muted-bg)]/10 text-[var(--text-muted)] border-[var(--line)]",
}

export const RMA_REASON_LABELS: Record<RmaReasonCode, string> = {
  HASARLI_KARGO: "Taşıma / Kargo Hasarı",
  YANLIS_URUN: "Yanlış / Eksik Ürün Gönderimi",
  CAYMA_HAKKI: "14 Gün Yasal Cayma Hakkı",
  KALITE_HATASI: "Kalite / Kusur Hatası",
  SKT_SORUNU: "Tazelik / SKT Uygunsuzluğu",
  GARANTI_KAPSAMI: "Garanti Kapsamında Arıza",
  TESLIM_EDILEMEDI: "Teslim Edilemedi (Adres / Alıcı)",
  DIGER: "Diğer İade Nedeni",
}

export const RMA_DECISION_LABELS: Record<RmaQualityDecision, string> = {
  RESTOCK_TO_BIN: "Yeniden Satışa Uygun (Stoğa Dön)",
  REPAIR_REFURBISH: "Tamir / Yenilemeye Al",
  RETURN_TO_VENDOR: "Tedarikçiye İade (RTV)",
  SCRAP: "Hurda / İmha",
}

export const RMA_DECISION_BADGE_CLASSES: Record<RmaQualityDecision, string> = {
  RESTOCK_TO_BIN: "bg-[--brand]/10 text-[#1267E6] border-[--brand]/25",
  REPAIR_REFURBISH: "bg-[var(--warn-soft)] text-[var(--warn)] border-amber-500/25",
  RETURN_TO_VENDOR: "bg-[var(--brand-soft)] text-indigo-300 border-indigo-500/25",
  SCRAP: "bg-[var(--bad-soft)] text-[var(--bad)] border-rose-500/25",
}

export const RMA_CREDIT_STATUS_LABELS: Record<RmaCreditNoteStatus, string> = {
  TASLAK_ONAY_BEKLIYOR: "Mali Onay Bekliyor",
  ONAYLANDI: "Kredi Notası Onaylandı",
  IADE_ODENDI: "Ödeme İadesi Yapıldı",
  REDDEDILDI: "Mali Onay Reddedildi",
}

/**
 * İzin verilen RMA durum geçiş matrisi
 */
export const ALLOWED_RMA_TRANSITIONS: Record<RmaWorkflowStatus, readonly RmaWorkflowStatus[]> = {
  TALEP: ["ONAYLANDI", "YOLDA", "TESLIM_ALINDI", "REDDEDILDI", "IPTAL"],
  ONAYLANDI: ["YOLDA", "TESLIM_ALINDI", "IPTAL"],
  YOLDA: ["TESLIM_ALINDI", "IPTAL"],
  TESLIM_ALINDI: ["INCELEMEDE", "KARARA_BAGLANDI"],
  INCELEMEDE: ["KARARA_BAGLANDI", "REDDEDILDI"],
  KARARA_BAGLANDI: ["KAPANDI"],
  KAPANDI: [],
  REDDEDILDI: [],
  IPTAL: [],
}

export function canTransitionRmaStatus(
  fromStatus: string,
  toStatus: string
): boolean {
  const from = (fromStatus || "TALEP") as RmaWorkflowStatus
  const to = toStatus as RmaWorkflowStatus
  const allowed = ALLOWED_RMA_TRANSITIONS[from]
  if (!allowed) return false
  return allowed.includes(to)
}

/**
 * Mal kabul teyidinden önce ödeme iadesi / kredi notası tetiklenip tetiklenemeyeceğini kontrol eder.
 * Yalnızca fiziksel olarak teslim alınmış ve inceleme kararı verilmiş RMA'lar mali işleme uygundur.
 */
export function isRmaEligibleForRefundTrigger(rma: {
  rmaStatus?: string | null
  receivedAt?: string | Date | null
  qualityDecision?: string | null
}): boolean {
  const status = rma.rmaStatus || ""
  const hasReceipt =
    Boolean(rma.receivedAt) ||
    status === "TESLIM_ALINDI" ||
    status === "INCELEMEDE" ||
    status === "KARARA_BAGLANDI" ||
    status === "KAPANDI"
  const hasDecision =
    Boolean(rma.qualityDecision) ||
    status === "KARARA_BAGLANDI" ||
    status === "KAPANDI"
  return hasReceipt && hasDecision
}

export interface ReturnEligibilityEvaluation {
  deliveredAtIso: string
  effectiveWindowDays: number
  returnDeadlineIso: string
  remainingDays: number
  isWithinReturnWindow: boolean
  isExpiringSoon: boolean
  warrantyMonths: number
  warrantyExpiresIso: string | null
  isWithinWarranty: boolean
}

/**
 * Teslimat tarihine göre yasal asgari 14 gün iade süresi, ürün/kategori süresi ve garanti süresini hesaplar.
 */
export function evaluateReturnEligibility(params: {
  deliveredAt?: string | Date | null
  policyReturnDays?: number | null
  warrantyMonths?: number | null
  referenceNow?: string | Date | null
}): ReturnEligibilityEvaluation {
  const nowDate = params.referenceNow ? new Date(params.referenceNow) : new Date()
  const deliveredDate = params.deliveredAt ? new Date(params.deliveredAt) : new Date(nowDate)
  const effectiveWindowDays = Math.max(
    LEGAL_MIN_RETURN_DAYS,
    Math.floor(Number(params.policyReturnDays || LEGAL_MIN_RETURN_DAYS))
  )

  const deadlineDate = new Date(deliveredDate.getTime() + effectiveWindowDays * 86_400_000)
  const diffMs = deadlineDate.getTime() - nowDate.getTime()
  const remainingDays = Math.ceil(diffMs / 86_400_000)
  const isWithinReturnWindow = diffMs >= 0
  const isExpiringSoon = isWithinReturnWindow && remainingDays <= 3

  const warrantyMonths = Math.max(0, Math.floor(Number(params.warrantyMonths || 0)))
  let warrantyExpiresIso: string | null = null
  let isWithinWarranty = false
  if (warrantyMonths > 0) {
    const wEnd = new Date(deliveredDate.getTime())
    wEnd.setMonth(wEnd.getMonth() + warrantyMonths)
    warrantyExpiresIso = wEnd.toISOString()
    isWithinWarranty = wEnd.getTime() >= nowDate.getTime()
  }

  return {
    deliveredAtIso: deliveredDate.toISOString(),
    effectiveWindowDays,
    returnDeadlineIso: deadlineDate.toISOString(),
    remainingDays,
    isWithinReturnWindow,
    isExpiringSoon,
    warrantyMonths,
    warrantyExpiresIso,
    isWithinWarranty,
  }
}

export function normalizeLegacyRmaStatus(rma: any): RmaWorkflowStatus {
  if (rma?.rmaStatus && (RMA_STATUS_VALUES as readonly string[]).includes(rma.rmaStatus)) {
    return rma.rmaStatus as RmaWorkflowStatus
  }
  const qc = String(rma?.qcInspectionResult || "")
  const ref = String(rma?.refundStatus || "")
  if (qc === "RESTOCK_TO_BIN" || ref === "APPROVED_CREDITED") {
    return "KAPANDI"
  }
  if (qc === "QUARANTINE_REPAIR") {
    return "INCELEMEDE"
  }
  return "TESLIM_ALINDI"
}

export function generateRmaBarcodeValue(rmaNumber: string): string {
  const clean = String(rmaNumber || "RMA").replace(/[^A-Z0-9-]/gi, "").toUpperCase()
  return `RMA|${clean}`
}
