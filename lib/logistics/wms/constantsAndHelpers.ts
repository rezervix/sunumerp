/**
 * Lojistik Faz 2 — Saf İstemci & Sunucu Paylaşımlı WMS Yardımcıları ve Sabitleri
 *
 * KURALLAR:
 * - "use client" bileşenleri tarafından güvenle import edilebilir (Prisma/fs YOKTUR).
 * - SSCC-18 GS1 Mod-10 Check-Digit hesaplayıcı, GS1-128 barkod üreteci,
 *   lokasyon rolü/kabul tipleri, FEFO/FIFO stratejileri ve ambalaj hiyerarşisi.
 */

export type WmsBinRole =
  | "NORMAL"
  | "COLD_STORAGE"
  | "FAST_PICK"
  | "QUARANTINE"
  | "RETURN_RMA"
  | "SHIPPING"
  | "CROSS_DOCK"

export type WmsPickPolicy = "FEFO" | "FIFO"

export type WmsReservationStatus =
  | "ACTIVE"
  | "PARTIAL"
  | "FULFILLED"
  | "RELEASED"
  | "EXPIRED"
  | "CANCELLED"

export type WmsReservationSourceType =
  | "ORDER"
  | "OMNICHANNEL"
  | "TRANSFER"
  | "SHIPMENT"
  | "KIT_ORDER"
  | "MANUAL"

export type WmsCrossDockStatus =
  | "PLANNED"
  | "RECEIVING_DOCK"
  | "STAGED_AT_RAMP"
  | "DISPATCHED"
  | "CANCELLED"

export type WmsKitOperationType = "ASSEMBLE" | "DISASSEMBLE"
export type WmsKitStatus = "PLANNED" | "IN_PROGRESS" | "COMPLETED" | "CANCELLED"

export const WMS_BIN_ROLE_LABELS: Record<WmsBinRole, string> = {
  NORMAL: "Standart Raf / Depolama",
  COLD_STORAGE: "Soğuk Zincir / FEFO (+4°C)",
  FAST_PICK: "Hızlı Toplama (A Sınıfı)",
  QUARANTINE: "Karantina / KK Bekleyen",
  RETURN_RMA: "İade / RMA Alanı",
  SHIPPING: "Sevkiyat & Rampa Çıkışı",
  CROSS_DOCK: "Cross-Dock Aktarma Alanı",
}

export const WMS_BIN_ROLE_BADGE_CLASSES: Record<WmsBinRole, string> = {
  NORMAL: "bg-zinc-500/10 text-zinc-300 border-white/[0.08]",
  COLD_STORAGE: "bg-cyan-500/10 text-cyan-300 border-cyan-500/25",
  FAST_PICK: "bg-emerald-500/10 text-[#34D399] border-emerald-500/25",
  QUARANTINE: "bg-amber-500/10 text-amber-300 border-amber-500/25",
  RETURN_RMA: "bg-rose-500/10 text-rose-300 border-rose-500/25",
  SHIPPING: "bg-indigo-500/10 text-indigo-300 border-indigo-500/25",
  CROSS_DOCK: "bg-purple-500/10 text-purple-300 border-purple-500/25",
}

export const WMS_PICK_POLICY_LABELS: Record<WmsPickPolicy, string> = {
  FEFO: "FEFO (Önce Son Kullanma Tarihi Yaklaşan)",
  FIFO: "FIFO (İlk Giren İlk Çıkar)",
}

export const WMS_RESERVATION_STATUS_LABELS: Record<WmsReservationStatus, string> = {
  ACTIVE: "Aktif Rezerve",
  PARTIAL: "Kısmi Kullanıldı",
  FULFILLED: "Tamamlandı",
  RELEASED: "Serbest Bırakıldı",
  EXPIRED: "Süresi Doldu",
  CANCELLED: "İptal Edildi",
}

export const WMS_CROSS_DOCK_STATUS_LABELS: Record<WmsCrossDockStatus, string> = {
  PLANNED: "Planlandı",
  RECEIVING_DOCK: "Mal Kabul Rampasında",
  STAGED_AT_RAMP: "Çıkış Rampasında Hazır",
  DISPATCHED: "Doğrudan Sevk Edildi",
  CANCELLED: "İptal",
}

export const WMS_KIT_STATUS_LABELS: Record<WmsKitStatus, string> = {
  PLANNED: "Planlandı",
  IN_PROGRESS: "Hazırlanıyor",
  COMPLETED: "Tamamlandı",
  CANCELLED: "İptal",
}

export const PACKAGING_LEVEL_LABELS: Record<number, string> = {
  1: "1. Seviye — Temel Birim (Adet/Demet)",
  2: "2. Seviye — İç Kutu / Paket",
  3: "3. Seviye — Ana Koli",
  4: "4. Seviye — Euro Palet",
}

export interface WmsWarehouseKpiSnapshot {
  computedAt: string
  warehouseId: string | "ALL"
  stockAccuracyPercent: number
  reconciledCountSessions: number
  avgPickDurationMinutes: number
  completedPickTasks: number
  avgReceivingDurationMinutes: number
  completedReceivingTasks: number
  binOccupancyRatePercent: number
  occupiedBins: number
  totalActiveBins: number
  blockedBins: number
  overdueTasksCount: number
  activeReservationsQty: number
  productionReservedQty: number
  crossDockThroughputQty: number
  rfidReadsLast24h: number
}

/**
 * GS1 Mod-10 Check Digit hesaplama (SSCC-18 için ilk 17 haneden 18. kontrol hanesini üretir)
 * Algoritma: Sağdan sola tek sıradaki basamaklar ×3, çift sıradaki basamaklar ×1 toplanır;
 * (10 - (toplam % 10)) % 10 kontrol hanesidir.
 */
export function calculateGs1Mod10CheckDigit(digitsWithoutCheck: string): string {
  const clean = digitsWithoutCheck.replace(/\D/g, "")
  if (clean.length === 0) return "0"
  let sum = 0
  for (let i = clean.length - 1, posFromRight = 1; i >= 0; i--, posFromRight++) {
    const digit = Number(clean[i])
    sum += posFromRight % 2 === 1 ? digit * 3 : digit
  }
  return String((10 - (sum % 10)) % 10)
}

/**
 * Geçerli 18 haneli SSCC (Serial Shipping Container Code) üretir.
 * Format: [Extension Digit (1 hane)] + [GS1 Company Prefix (7-9 hane)] + [Serial Ref] + [Check Digit (1 hane)]
 */
export function generateSscc18Code(params?: {
  extensionDigit?: "0" | "1" | "2" | "3"
  companyPrefix?: string
  serialNumber?: number | string
}): {
  sscc18: string
  gs1BarcodeValue: string
  gs1HumanReadable: string
  checkDigit: string
} {
  const ext = params?.extensionDigit ?? "3"
  const prefixRaw = (params?.companyPrefix ?? "8699012").replace(/\D/g, "").slice(0, 9).padEnd(7, "0")
  const remainingLen = 17 - 1 - prefixRaw.length
  const seedNum =
    params?.serialNumber !== undefined
      ? String(params.serialNumber).replace(/\D/g, "")
      : String(Math.floor(100000000 + Math.random() * 899999999))
  const serialPadded = seedNum.slice(-remainingLen).padStart(remainingLen, "0")
  const first17 = `${ext}${prefixRaw}${serialPadded}`
  const checkDigit = calculateGs1Mod10CheckDigit(first17)
  const sscc18 = `${first17}${checkDigit}`

  return {
    sscc18,
    gs1BarcodeValue: `00${sscc18}`,
    gs1HumanReadable: `(00) ${sscc18}`,
    checkDigit,
  }
}

/**
 * Verilen 18 veya 20 haneli ("00..." AI önekli) SSCC barkodunu doğrular.
 */
export function validateSscc18Code(rawCode: string): {
  valid: boolean
  sscc18: string
  expectedCheckDigit: string
  actualCheckDigit: string
} {
  const digits = rawCode.replace(/\D/g, "")
  const sscc18 = digits.length === 20 && digits.startsWith("00") ? digits.slice(2) : digits
  if (sscc18.length !== 18) {
    return {
      valid: false,
      sscc18,
      expectedCheckDigit: "",
      actualCheckDigit: "",
    }
  }
  const expectedCheckDigit = calculateGs1Mod10CheckDigit(sscc18.slice(0, 17))
  const actualCheckDigit = sscc18[17]
  return {
    valid: expectedCheckDigit === actualCheckDigit,
    sscc18,
    expectedCheckDigit,
    actualCheckDigit,
  }
}

/**
 * Bir rafın binRole veya binType alanından normalize edilmiş WMS lokasyon rolünü çözer.
 */
export function resolveNormalizedBinRole(bin: {
  binRole?: string | null
  binType?: string | null
}): WmsBinRole {
  const role = String(bin.binRole || "").toUpperCase()
  if (
    role === "NORMAL" ||
    role === "COLD_STORAGE" ||
    role === "FAST_PICK" ||
    role === "QUARANTINE" ||
    role === "RETURN_RMA" ||
    role === "SHIPPING" ||
    role === "CROSS_DOCK"
  ) {
    return role as WmsBinRole
  }
  const type = String(bin.binType || "").toUpperCase()
  if (type === "COLD_STORAGE" || type === "FEFO_COLD") return "COLD_STORAGE"
  if (type === "FAST_PICK") return "FAST_PICK"
  if (type === "QUARANTINE") return "QUARANTINE"
  if (type === "RETURN_RMA" || type === "RETURN") return "RETURN_RMA"
  if (type === "SHIPPING" || type === "RAMP") return "SHIPPING"
  if (type === "CROSS_DOCK") return "CROSS_DOCK"
  return "NORMAL"
}
