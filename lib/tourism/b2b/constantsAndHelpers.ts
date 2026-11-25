/**
 * Sunum ERP — Turizm Faz 5: B2B Partner Ağı (turizm_b2b)
 * İstemci-güvenli sabitler, etiketler, veri minimizasyonu, komisyon/hakediş ve cari denge yardımcıları.
 */

export const B2B_COMPANY_TYPE_LABELS: Record<string, string> = {
  MAIN_OPERATOR: "Ana Operatör",
  RENTACAR: "Araç Kiralama (Rent-a-Car)",
  TOUR_OPERATOR: "Tur Operatörü",
  HOTEL: "Otel / Konaklama",
  TRANSFER: "VIP Transfer & Ortak Filo",
}

export const B2B_PARTNERSHIP_STATUS_META: Record<
  string,
  { label: string; badgeClass: string }
> = {
  PENDING: {
    label: "Onay Bekliyor",
    badgeClass: "bg-[var(--warn-soft)] text-[var(--warn)] border border-[var(--warn)]/30",
  },
  APPROVED: {
    label: "Onaylı Partner",
    badgeClass: "bg-[var(--ok-soft)] text-[var(--ok)] border border-[var(--ok)]/30",
  },
  REJECTED: {
    label: "Reddedildi",
    badgeClass: "bg-[var(--bad-soft)] text-[var(--bad)] border border-[var(--bad)]/30",
  },
  SUSPENDED: {
    label: "Askıya Alındı",
    badgeClass: "bg-[var(--warn-soft)] text-[var(--warn)] border border-[var(--warn)]/30",
  },
  REMOVED: {
    label: "Sonlandırıldı",
    badgeClass: "bg-[var(--muted-bg)] text-[var(--text-muted)] border border-[var(--line)]",
  },
}

export const B2B_RESOURCE_TYPE_META: Record<
  string,
  { label: string; unitLabel: string; moduleType: string }
> = {
  VEHICLE: { label: "Araç (Rent-a-Car / Filo)", unitLabel: "Gün", moduleType: "RENTACAR" },
  DRIVER: { label: "Şoför / Sürücü", unitLabel: "Gün", moduleType: "TRANSFER" },
  GUIDE: { label: "Tur Rehberi", unitLabel: "Gün", moduleType: "TOUR" },
  ROOM_ALLOTMENT: { label: "Oda / Acenta Kontenjanı", unitLabel: "Gece", moduleType: "HOTEL" },
  TRANSFER_SLOT: { label: "VIP Transfer Slotu", unitLabel: "Sefer", moduleType: "TRANSFER" },
}

export const B2B_RESOURCE_STATUS_META: Record<
  string,
  { label: string; badgeClass: string }
> = {
  ACTIVE: {
    label: "Paylaşımda",
    badgeClass: "bg-[var(--ok-soft)] text-[var(--ok)] border border-[var(--ok)]/30",
  },
  PAUSED: {
    label: "Duraklatıldı",
    badgeClass: "bg-[var(--warn-soft)] text-[var(--warn)] border border-[var(--warn)]/30",
  },
  ARCHIVED: {
    label: "Paylaşımdan Çekildi",
    badgeClass: "bg-[var(--muted-bg)] text-[var(--text-muted)] border border-[var(--line)]",
  },
}

export const B2B_VISIBILITY_LABELS: Record<string, string> = {
  ALL_APPROVED_PARTNERS: "Tüm Onaylı Partnerler",
  SELECTED_PARTNERS: "Seçili Partnerler",
  PRIVATE: "Sadece Kendi Firmam (Kapalı)",
}

export const B2B_APPROVAL_MODE_LABELS: Record<string, string> = {
  AUTO: "Otomatik Onay",
  MANUAL: "Sahip Firma Onayı",
}

export const B2B_CROSS_RES_STATUS_META: Record<
  string,
  { label: string; badgeClass: string }
> = {
  HOLD: {
    label: "Geçici Blokaj",
    badgeClass: "bg-[var(--brand-soft)] text-[var(--brand)] border border-[var(--brand-line)]",
  },
  PENDING_APPROVAL: {
    label: "Sahip Onayı Bekliyor",
    badgeClass: "bg-[var(--warn-soft)] text-[var(--warn)] border border-[var(--warn)]/30",
  },
  CONFIRMED: {
    label: "Onaylandı",
    badgeClass: "bg-[var(--ok-soft)] text-[var(--ok)] border border-[var(--ok)]/30",
  },
  COMPLETED: {
    label: "Tamamlandı",
    badgeClass: "bg-[var(--brand-soft-2)] text-[var(--navy)] border border-[var(--brand-line)]",
  },
  REJECTED: {
    label: "Reddedildi",
    badgeClass: "bg-[var(--bad-soft)] text-[var(--bad)] border border-[var(--bad)]/30",
  },
  CANCELLED: {
    label: "İptal Edildi",
    badgeClass: "bg-[var(--muted-bg)] text-[var(--text-muted)] border border-[var(--line)]",
  },
}

export const B2B_SETTLEMENT_STATUS_META: Record<
  string,
  { label: string; badgeClass: string }
> = {
  DRAFT: {
    label: "Taslak",
    badgeClass: "bg-[var(--muted-bg)] text-[var(--text-muted)] border border-[var(--line)]",
  },
  PENDING_COUNTERPARTY: {
    label: "Karşı Firma Onayı Bekliyor",
    badgeClass: "bg-[var(--warn-soft)] text-[var(--warn)] border border-[var(--warn)]/30",
  },
  APPROVED_BOTH: {
    label: "Çift Taraflı Onaylandı",
    badgeClass: "bg-[var(--ok-soft)] text-[var(--ok)] border border-[var(--ok)]/30",
  },
  DISPUTED: {
    label: "İtiraz / İncelemede",
    badgeClass: "bg-[var(--bad-soft)] text-[var(--bad)] border border-[var(--bad)]/30",
  },
  SETTLED: {
    label: "Mahsuplaşıldı / Ödendi",
    badgeClass: "bg-[var(--brand-soft)] text-[var(--brand)] border border-[var(--brand-line)]",
  },
}

export const B2B_LEDGER_ENTRY_TYPE_LABELS: Record<string, string> = {
  RECEIVABLE: "Partner Alacağı",
  PAYABLE: "Partner Borcu",
  COMMISSION_INCOME: "Komisyon Geliri",
  COMMISSION_EXPENSE: "Komisyon Gideri",
  ADJUSTMENT: "Mutabakat Düzeltmesi",
  PAYMENT: "Tahsilat / Ödeme",
}

export function roundMoney(value: number): number {
  return Math.round((Number(value) || 0) * 100) / 100
}

export function formatTryB2b(amount: number | null | undefined): string {
  const num = Number(amount ?? 0)
  return new Intl.NumberFormat("tr-TR", {
    style: "currency",
    currency: "TRY",
    maximumFractionDigits: 0,
  }).format(Number.isFinite(num) ? num : 0)
}

export function formatDateTrB2b(value: string | Date | null | undefined): string {
  if (!value) return "—"
  const d = new Date(value)
  if (Number.isNaN(d.getTime())) return "—"
  return d.toLocaleDateString("tr-TR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  })
}

export function formatDateTimeTrB2b(value: string | Date | null | undefined): string {
  if (!value) return "—"
  const d = new Date(value)
  if (Number.isNaN(d.getTime())) return "—"
  return d.toLocaleString("tr-TR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  })
}

export function computeDurationDays(startAt: Date | string, endAt: Date | string): number {
  const start = new Date(startAt).getTime()
  const end = new Date(endAt).getTime()
  if (!Number.isFinite(start) || !Number.isFinite(end) || end <= start) return 1
  return Math.max(1, Math.ceil((end - start) / (1000 * 60 * 60 * 24)))
}

export function rangesOverlap(
  aStart: Date | string,
  aEnd: Date | string,
  bStart: Date | string,
  bEnd: Date | string
): boolean {
  const s1 = new Date(aStart).getTime()
  const e1 = new Date(aEnd).getTime()
  const s2 = new Date(bStart).getTime()
  const e2 = new Date(bEnd).getTime()
  if (!Number.isFinite(s1) || !Number.isFinite(e1) || !Number.isFinite(s2) || !Number.isFinite(e2)) {
    return false
  }
  return s1 < e2 && s2 < e1
}

export interface CrossReservationFinancials {
  durationDays: number
  quantity: number
  grossAmountTry: number
  commissionRatePct: number
  commissionAmountTry: number
  ownerNetAmountTry: number
}

/**
 * Çapraz rezervasyon brüt, komisyon ve kaynak sahibi net hakedişini hesaplar.
 * - Brüt = birim partner fiyatı × gün × adet
 * - Komisyon = brüt × komisyon oranı (%)
 * - Sahip Firma Net Alacağı = brüt - komisyon
 */
export function calculateCrossReservationFinancials(params: {
  unitRateTry: number
  durationDays: number
  quantity?: number
  commissionRatePct: number
}): CrossReservationFinancials {
  const durationDays = Math.max(1, Math.floor(params.durationDays || 1))
  const quantity = Math.max(1, Math.floor(params.quantity || 1))
  const rate = Math.max(0, Number(params.unitRateTry) || 0)
  const commissionRatePct = Math.min(50, Math.max(0, Number(params.commissionRatePct) || 0))

  const grossAmountTry = roundMoney(rate * durationDays * quantity)
  const commissionAmountTry = roundMoney((grossAmountTry * commissionRatePct) / 100)
  const ownerNetAmountTry = roundMoney(Math.max(0, grossAmountTry - commissionAmountTry))

  return {
    durationDays,
    quantity,
    grossAmountTry,
    commissionRatePct,
    commissionAmountTry,
    ownerNetAmountTry,
  }
}

export function parseAllowedPartnerIds(raw?: string | null): string[] {
  if (!raw) return []
  try {
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? parsed.filter((x): x is string => typeof x === "string") : []
  } catch {
    return []
  }
}

export interface SensitiveResourceMeta {
  plate?: string
  vin?: string
  contactPhone?: string
  internalCode?: string
}

export function parseSensitiveMeta(raw?: string | null): SensitiveResourceMeta {
  if (!raw) return {}
  try {
    const parsed = JSON.parse(raw)
    return parsed && typeof parsed === "object" ? (parsed as SensitiveResourceMeta) : {}
  } catch {
    return {}
  }
}

/**
 * Veri minimizasyonu (Madde C & H):
 * Kaynak sahibi `hideSensitiveFields = true` seçtiyse, partner firmaya plaka, şasi no,
 * dahili telefon gibi hassas alanlar ASLA ham dönmez; yalnızca izin verilen alanlar paylaşılır.
 */
export function sanitizeSharedResourceForViewer<T extends Record<string, any>>(
  resource: T,
  viewerCompanyId: string
): T & {
  isOwnerView: boolean
  sensitiveMeta: SensitiveResourceMeta | null
  maskedFieldsNotice: string | null
  allowedPartnerIds: string[]
} {
  const isOwnerView = resource.ownerCompanyId === viewerCompanyId
  const allowedPartnerIds = parseAllowedPartnerIds(resource.allowedPartnerIdsJson)
  const rawMeta = parseSensitiveMeta(resource.sensitiveMetaJson)

  if (isOwnerView) {
    return {
      ...resource,
      isOwnerView: true,
      sensitiveMeta: Object.keys(rawMeta).length > 0 ? rawMeta : null,
      maskedFieldsNotice: null,
      allowedPartnerIds,
    }
  }

  const hideSensitive = resource.hideSensitiveFields !== false
  const sanitized: Record<string, any> = {
    ...resource,
    sensitiveMetaJson: undefined,
    allowedPartnerIdsJson: undefined,
    externalRefId: hideSensitive ? null : resource.externalRefId,
  }

  return {
    ...(sanitized as T),
    isOwnerView: false,
    sensitiveMeta: hideSensitive
      ? null
      : Object.keys(rawMeta).length > 0
      ? rawMeta
      : null,
    maskedFieldsNotice: hideSensitive
      ? "Veri minimizasyonu aktif: Plaka, şasi ve dahili iletişim alanları kaynak sahibi tarafından gizlenmiştir."
      : null,
    allowedPartnerIds: [],
  }
}

/**
 * Karşılıklı cari tutarlılık kontrolü (Madde F):
 * Aynı `pairKey` taşıyan A firması alacağı (RECEIVABLE) ile B firması borcunun (PAYABLE)
 * kuruşu kuruşuna eşit olduğunu doğrular.
 */
export function verifyReciprocalLedgerBalance(
  entries: Array<{
    pairKey: string
    entryType: string
    amountTry: number
    status: string
  }>
): {
  pairCount: number
  balancedPairCount: number
  imbalancedPairKeys: string[]
  isBalanced: boolean
} {
  const byPair = new Map<string, { receivable: number; payable: number }>()
  for (const e of entries) {
    if (e.status === "VOID") continue
    const cur = byPair.get(e.pairKey) ?? { receivable: 0, payable: 0 }
    if (e.entryType === "RECEIVABLE") cur.receivable = roundMoney(cur.receivable + Number(e.amountTry || 0))
    if (e.entryType === "PAYABLE") cur.payable = roundMoney(cur.payable + Number(e.amountTry || 0))
    byPair.set(e.pairKey, cur)
  }

  const imbalancedPairKeys: string[] = []
  for (const [pairKey, totals] of byPair.entries()) {
    if (Math.abs(totals.receivable - totals.payable) > 0.01) {
      imbalancedPairKeys.push(pairKey)
    }
  }

  return {
    pairCount: byPair.size,
    balancedPairCount: byPair.size - imbalancedPairKeys.length,
    imbalancedPairKeys,
    isBalanced: imbalancedPairKeys.length === 0,
  }
}
