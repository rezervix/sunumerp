/**
 * Sunum ERP — Turizm Faz 3: Otel Yönetimi (Mini PMS) — turizm_otel
 * İstemci-Güvenli (Saf) Tipler, Sabitler, Oda Durumu Renkleri, KPI Formülleri
 * (Doluluk %, ADR, RevPAR), Folio Bakiye Hesabı ve Oda x Gün Gantt Yardımcıları
 *
 * KURALLAR:
 * - Hem sunucu hem istemci ("use client") bileşenlerinde güvenle import edilir.
 * - fs, path, prisma/db veya audit modülleri ASLA import edilmez.
 * - Tüm fiyatlar, vergi/ek kalem oranları ve check-in/out saatleri ayarlanabilir kayıtlardan gelir.
 */

import { doTimeIntervalsOverlap } from "@/lib/tourism/rentacar/constantsAndHelpers"

export const HOTEL_ROOM_STATUSES = [
  "CLEAN_VACANT",
  "OCCUPIED",
  "DIRTY_VACANT",
  "CLEANING_IN_PROGRESS",
  "INSPECTION_PENDING",
  "MAINTENANCE",
  "OUT_OF_ORDER",
] as const

export type HotelRoomStatus = (typeof HOTEL_ROOM_STATUSES)[number]

export const HOTEL_ROOM_STATUS_LABELS: Record<HotelRoomStatus, string> = {
  CLEAN_VACANT: "Boş & Temiz (Satışa Hazır)",
  OCCUPIED: "Dolu (Misafir İçeride)",
  DIRTY_VACANT: "Kirli / Temizlik Bekliyor",
  CLEANING_IN_PROGRESS: "Temizlikte",
  INSPECTION_PENDING: "Denetim Bekliyor",
  MAINTENANCE: "Bakımda",
  OUT_OF_ORDER: "Arızalı / Servis Dışı",
}

export const HOTEL_ROOM_STATUS_BADGES: Record<HotelRoomStatus, string> = {
  CLEAN_VACANT: "bg-[--ok-soft] text-[--ok] border border-[--ok]/20",
  OCCUPIED: "bg-sky-500/20 text-sky-300 border-sky-500/40",
  DIRTY_VACANT: "bg-amber-500/20 text-amber-300 border-amber-500/40",
  CLEANING_IN_PROGRESS: "bg-indigo-500/20 text-indigo-300 border-indigo-500/40",
  INSPECTION_PENDING: "bg-purple-500/20 text-purple-300 border-purple-500/40",
  MAINTENANCE: "bg-orange-500/20 text-orange-300 border-orange-500/40",
  OUT_OF_ORDER: "bg-rose-500/20 text-rose-300 border-rose-500/40",
}

export const HOTEL_BOARD_TYPES = ["RO", "BB", "HB", "FB", "AI"] as const
export type HotelBoardType = (typeof HOTEL_BOARD_TYPES)[number]

export const HOTEL_BOARD_TYPE_LABELS: Record<HotelBoardType, string> = {
  RO: "Sadece Oda (RO)",
  BB: "Oda + Kahvaltı (BB)",
  HB: "Yarım Pansiyon (HB)",
  FB: "Tam Pansiyon (FB)",
  AI: "Her Şey Dahil (AI)",
}

export const HOTEL_CHANNEL_SOURCES = [
  "DIRECT_WEB",
  "DIRECT_PHONE",
  "WALK_IN",
  "AGENCY_B2B",
  "OTA_BOOKING",
  "CORPORATE",
] as const

export type HotelChannelSource = (typeof HOTEL_CHANNEL_SOURCES)[number]

export const HOTEL_CHANNEL_LABELS: Record<HotelChannelSource, string> = {
  DIRECT_WEB: "Direkt Web Sitesi",
  DIRECT_PHONE: "Direkt Telefon / Ön Büro",
  WALK_IN: "Kapıdan Giriş (Walk-In)",
  AGENCY_B2B: "Acenta / Tur Operatörü (Kontenjan)",
  OTA_BOOKING: "Online Kanal (OTA)",
  CORPORATE: "Kurumsal Şirket Anlaşması",
}

export const HOTEL_RESERVATION_STATUSES = [
  "PENDING",
  "CONFIRMED",
  "CHECKED_IN",
  "CHECKED_OUT",
  "CANCELLED",
  "NO_SHOW",
] as const

export type HotelReservationStatus = (typeof HOTEL_RESERVATION_STATUSES)[number]

export const HOTEL_RESERVATION_STATUS_LABELS: Record<HotelReservationStatus, string> = {
  PENDING: "Ön Rezervasyon",
  CONFIRMED: "Onaylı (Gelecek)",
  CHECKED_IN: "Konaklıyor (Check-In)",
  CHECKED_OUT: "Çıkış Yaptı (Check-Out)",
  CANCELLED: "İptal Edildi",
  NO_SHOW: "Gelmedi (No-Show)",
}

export const HOTEL_RESERVATION_STATUS_BADGES: Record<HotelReservationStatus, string> = {
  PENDING: "bg-amber-500/15 text-amber-300 border-amber-500/30",
  CONFIRMED: "bg-sky-500/15 text-sky-300 border-sky-500/30",
  CHECKED_IN: "bg-[--ok-soft] text-[--ok] border border-[--ok]/20",
  CHECKED_OUT: "bg-zinc-500/15 text-zinc-300 border-white/[0.12]",
  CANCELLED: "bg-rose-500/15 text-rose-300 border-rose-500/30",
  NO_SHOW: "bg-purple-500/15 text-purple-300 border-purple-500/30",
}

export const HOTEL_FOLIO_GROUPS = [
  "A_ANA_HESAP",
  "B_EKSTRA_BOLUNMUS",
  "C_ACENTA_FATURASI",
] as const

export type HotelFolioGroup = (typeof HOTEL_FOLIO_GROUPS)[number]

export const HOTEL_FOLIO_GROUP_LABELS: Record<HotelFolioGroup, string> = {
  A_ANA_HESAP: "Folio A — Ana Misafir Hesabı",
  B_EKSTRA_BOLUNMUS: "Folio B — Bölünmüş Ekstra Hesap",
  C_ACENTA_FATURASI: "Folio C — Acenta / Şirket Hesabı",
}

export const HOTEL_FOLIO_CATEGORIES = [
  "ROOM_NIGHT",
  "MINIBAR",
  "RESTAURANT",
  "LAUNDRY",
  "SPA_EXTRA",
  "LATE_CHECKOUT",
  "PAYMENT_CASH",
  "PAYMENT_CARD",
  "PAYMENT_TRANSFER",
  "REFUND",
] as const

export type HotelFolioCategory = (typeof HOTEL_FOLIO_CATEGORIES)[number]

export const HOTEL_FOLIO_CATEGORY_LABELS: Record<HotelFolioCategory, string> = {
  ROOM_NIGHT: "Konaklama (Oda-Gece)",
  MINIBAR: "Minibar Tüketimi (Stok Bağlı)",
  RESTAURANT: "Restoran & Oda Servisi",
  LAUNDRY: "Çamaşırhane & Ütü",
  SPA_EXTRA: "Spa & Ekstra Hizmet",
  LATE_CHECKOUT: "Geç Çıkış (Late Check-Out) Farkı",
  PAYMENT_CASH: "Nakit Tahsilat",
  PAYMENT_CARD: "Kredi Kartı Tahsilatı",
  PAYMENT_TRANSFER: "Havale / EFT Tahsilatı",
  REFUND: "İade / Düzeltme",
}

export const HOTEL_HK_TASK_TYPE_LABELS: Record<string, string> = {
  CHECKOUT_CLEANING: "Çıkış Sonrası Oda Temizliği",
  STAYOVER_CLEANING: "Konaklayan Oda Günlük Temizliği",
  DEEP_CLEANING: "Detaylı / Periyodik Temizlik",
  MINIBAR_COUNT: "Minibar Sayım & İkmal",
  TECHNICAL_FAULT: "Teknik Arıza / Bakım Talebi",
}

export const HOTEL_HK_STATUS_LABELS: Record<string, string> = {
  PENDING: "Bekliyor",
  IN_PROGRESS: "İşlemde",
  COMPLETED: "Tamamlandı (Denetim Bekliyor)",
  INSPECTED: "Denetlendi & Satışa Hazır",
  CANCELLED: "İptal",
}

export const HOTEL_HK_STATUS_BADGES: Record<string, string> = {
  PENDING: "bg-amber-500/15 text-amber-300 border-amber-500/30",
  IN_PROGRESS: "bg-sky-500/15 text-sky-300 border-sky-500/30",
  COMPLETED: "bg-purple-500/15 text-purple-300 border-purple-500/30",
  INSPECTED: "bg-[--ok-soft] text-[--ok] border border-[--ok]/20",
  CANCELLED: "bg-zinc-500/15 text-zinc-400 border-white/[0.1]",
}

export const HOTEL_KBS_TYPE_LABELS: Record<string, string> = {
  MISAFIR_GIRIS: "Misafir Giriş (Check-In) Bildirimi",
  MISAFIR_CIKIS: "Misafir Çıkış (Check-Out) Bildirimi",
  ODA_DEGISIKLIGI: "Oda Değişikliği Bildirimi",
}

export const HOTEL_KBS_STATUS_LABELS: Record<string, string> = {
  HAZIRLANDI: "Bildirim Paketi Hazırlandı",
  GONDERILDI_MANUEL: "Dışa Aktarıldı / Manuel İşlendi",
  HATALI: "Doğrulama / Aktarım Hatası",
  EKSIK_VERI: "Eksik Kimlik / Pasaport Verisi",
}

export const HOTEL_KBS_STATUS_BADGES: Record<string, string> = {
  HAZIRLANDI: "bg-sky-500/15 text-sky-300 border-sky-500/30",
  GONDERILDI_MANUEL: "bg-[--ok-soft] text-[--ok] border border-[--ok]/20",
  HATALI: "bg-rose-500/15 text-rose-300 border-rose-500/30",
  EKSIK_VERI: "bg-amber-500/15 text-amber-300 border-amber-500/30",
}

export const HOTEL_INVOICE_TIMING_LABELS: Record<string, string> = {
  ON_CHECKOUT: "Check-Out Tamamlandığında Otomatik",
  ON_CHECKIN: "Check-In Sırasında Otomatik",
  MANUAL: "Ön Büro / Muhasebe Onayıyla Manuel",
}

export const HOTEL_SEASON_LABELS: Record<string, string> = {
  STANDARD: "Standart Sezon",
  HIGH_SEASON: "Yüksek Sezon / Yoğun Dönem",
  WINTER_PROMO: "Kış & Erken Rezervasyon",
  WEEKEND: "Hafta Sonu Tarifesi",
  AGENCY_CONTRACT: "Acenta Kontrat Tarifesi",
}

// ── Gece Sayısı ve Folio Bakiye Hesaplama Yardımcıları ───────────────────────

export function calculateHotelNights(checkInDate: string | Date, checkOutDate: string | Date): number {
  const s = new Date(checkInDate)
  const e = new Date(checkOutDate)
  if (Number.isNaN(s.getTime()) || Number.isNaN(e.getTime())) return 1
  const sDay = Date.UTC(s.getUTCFullYear(), s.getUTCMonth(), s.getUTCDate())
  const eDay = Date.UTC(e.getUTCFullYear(), e.getUTCMonth(), e.getUTCDate())
  return Math.max(1, Math.round((eDay - sDay) / 86_400_000))
}

export interface FolioBalanceSummary {
  roomChargesTry: number
  extraChargesTry: number
  totalChargesTry: number
  totalPaymentsTry: number
  balanceDueTry: number
  byGroup: Record<
    string,
    { chargesTry: number; paymentsTry: number; balanceTry: number; itemCount: number }
  >
}

export function computeFolioBalance(folioItems: any[]): FolioBalanceSummary {
  let roomChargesTry = 0
  let extraChargesTry = 0
  let totalPaymentsTry = 0
  const byGroup: Record<
    string,
    { chargesTry: number; paymentsTry: number; balanceTry: number; itemCount: number }
  > = {}

  for (const item of folioItems || []) {
    const grp = String(item.folioGroup || "A_ANA_HESAP")
    if (!byGroup[grp]) {
      byGroup[grp] = { chargesTry: 0, paymentsTry: 0, balanceTry: 0, itemCount: 0 }
    }
    byGroup[grp].itemCount++

    const val = Math.abs(Number(item.totalWithVatTry ?? item.amountTry ?? 0))
    if (item.isPayment || String(item.entryCategory || "").startsWith("PAYMENT_")) {
      totalPaymentsTry += val
      byGroup[grp].paymentsTry = Number((byGroup[grp].paymentsTry + val).toFixed(2))
    } else if (item.entryCategory === "REFUND") {
      totalPaymentsTry -= val
      byGroup[grp].paymentsTry = Number((byGroup[grp].paymentsTry - val).toFixed(2))
    } else {
      if (item.entryCategory === "ROOM_NIGHT") roomChargesTry += val
      else extraChargesTry += val
      byGroup[grp].chargesTry = Number((byGroup[grp].chargesTry + val).toFixed(2))
    }
    byGroup[grp].balanceTry = Number(
      (byGroup[grp].chargesTry - byGroup[grp].paymentsTry).toFixed(2)
    )
  }

  const totalChargesTry = Number((roomChargesTry + extraChargesTry).toFixed(2))
  const paid = Number(totalPaymentsTry.toFixed(2))
  const balanceDueTry = Number((totalChargesTry - paid).toFixed(2))

  return {
    roomChargesTry: Number(roomChargesTry.toFixed(2)),
    extraChargesTry: Number(extraChargesTry.toFixed(2)),
    totalChargesTry,
    totalPaymentsTry: paid,
    balanceDueTry,
    byGroup,
  }
}

// ── Otel KPI Formülleri (Doluluk %, ADR, RevPAR) ─────────────────────────────
// Formüller:
//   Doluluk Oranı (%) = (Satılan Oda-Gece / Satılabilir Aktif Oda-Gece) * 100
//   ADR (Ortalama Günlük Oda Fiyatı) = Toplam Oda Konaklama Geliri / Satılan Oda-Gece
//   RevPAR (Mevcut Oda Başı Gelir) = Toplam Oda Konaklama Geliri / Satılabilir Aktif Oda-Gece

export interface HotelKpiFormulaResult {
  totalActiveRooms: number
  sellableRoomNights: number
  soldRoomNights: number
  occupancyPct: number
  roomRevenueTry: number
  extrasRevenueTry: number
  totalRevenueTry: number
  adrTry: number
  revParTry: number
  formulas: {
    occupancyFormula: string
    adrFormula: string
    revParFormula: string
  }
}

export function computeHotelKpis(params: {
  activeRoomsCount: number
  periodDays: number
  soldRoomNights: number
  roomRevenueTry: number
  extrasRevenueTry: number
}): HotelKpiFormulaResult {
  const totalActiveRooms = Math.max(0, Number(params.activeRoomsCount || 0))
  const periodDays = Math.max(1, Number(params.periodDays || 30))
  const sellableRoomNights = totalActiveRooms * periodDays
  const soldRoomNights = Math.max(0, Number(params.soldRoomNights || 0))
  const roomRevenueTry = Number((params.roomRevenueTry || 0).toFixed(2))
  const extrasRevenueTry = Number((params.extrasRevenueTry || 0).toFixed(2))
  const totalRevenueTry = Number((roomRevenueTry + extrasRevenueTry).toFixed(2))

  const occupancyPct =
    sellableRoomNights > 0
      ? Number(Math.min(100, (soldRoomNights / sellableRoomNights) * 100).toFixed(1))
      : 0
  const adrTry =
    soldRoomNights > 0 ? Number((roomRevenueTry / soldRoomNights).toFixed(2)) : 0
  const revParTry =
    sellableRoomNights > 0 ? Number((roomRevenueTry / sellableRoomNights).toFixed(2)) : 0

  return {
    totalActiveRooms,
    sellableRoomNights,
    soldRoomNights,
    occupancyPct,
    roomRevenueTry,
    extrasRevenueTry,
    totalRevenueTry,
    adrTry,
    revParTry,
    formulas: {
      occupancyFormula: "(Satılan Oda-Gece / Satılabilir Aktif Oda-Gece) × 100",
      adrFormula: "Toplam Oda Konaklama Geliri / Satılan Oda-Gece",
      revParFormula: "Toplam Oda Konaklama Geliri / Satılabilir Aktif Oda-Gece",
    },
  }
}

// ── Oda x Gün Rezervasyon Takvimi (Gantt) Oluşturucu ─────────────────────────

export type RoomGanttCellStatus = "AVAILABLE" | "CHECKED_IN" | "CONFIRMED" | "MAINTENANCE"

export interface RoomGanttDayCell {
  dateKey: string
  status: RoomGanttCellStatus
  reservationId?: string
  reservationNo?: string
  guestLabel?: string
}

export interface RoomGanttRow {
  roomId: string
  roomNumber: string
  floorNumber: number
  roomTypeId: string
  roomTypeName: string
  roomStatus: string
  days: RoomGanttDayCell[]
  occupiedDaysCount: number
  availableDaysCount: number
}

export function buildRoomAvailabilityGantt(params: {
  rooms: any[]
  roomTypesById: Map<string, any>
  reservations: any[]
  customersById: Map<string, any>
  windowStartDate: string | Date
  daysCount?: number
  filterFloor?: number | null
  filterRoomTypeId?: string
}): {
  dateHeaders: string[]
  rows: RoomGanttRow[]
} {
  const daysCount = Math.min(31, Math.max(7, Number(params.daysCount || 14)))
  const start = new Date(params.windowStartDate)
  start.setUTCHours(0, 0, 0, 0)

  const dateHeaders: string[] = []
  for (let i = 0; i < daysCount; i++) {
    dateHeaders.push(new Date(start.getTime() + i * 86_400_000).toISOString().slice(0, 10))
  }

  let list = params.rooms.filter((r) => r.isActive !== false)
  if (params.filterFloor !== undefined && params.filterFloor !== null) {
    list = list.filter((r) => Number(r.floorNumber) === Number(params.filterFloor))
  }
  if (params.filterRoomTypeId) {
    list = list.filter((r) => r.roomTypeId === params.filterRoomTypeId)
  }
  list.sort((a, b) => String(a.roomNumber).localeCompare(String(b.roomNumber)))

  const blockingRes = params.reservations.filter(
    (r) => r.status === "PENDING" || r.status === "CONFIRMED" || r.status === "CHECKED_IN"
  )

  const rows: RoomGanttRow[] = list.map((rm) => {
    const rt = params.roomTypesById.get(rm.roomTypeId)
    const rRes = blockingRes.filter((r) => r.roomId === rm.id)
    let occupiedDaysCount = 0
    let availableDaysCount = 0

    const days: RoomGanttDayCell[] = dateHeaders.map((dateKey) => {
      const dayStart = new Date(`${dateKey}T12:00:00.000Z`)
      const dayEnd = new Date(`${dateKey}T23:59:59.000Z`)

      const matched = rRes.find((r) =>
        doTimeIntervalsOverlap(r.checkInDate, r.checkOutDate, dayStart, dayEnd)
      )
      if (matched) {
        occupiedDaysCount++
        const cust = params.customersById.get(matched.customerId)
        return {
          dateKey,
          status: matched.status === "CHECKED_IN" ? "CHECKED_IN" : "CONFIRMED",
          reservationId: matched.id,
          reservationNo: matched.reservationNo,
          guestLabel: cust?.name || cust?.company || "Misafir",
        }
      }

      if (rm.status === "MAINTENANCE" || rm.status === "OUT_OF_ORDER") {
        return {
          dateKey,
          status: "MAINTENANCE",
        }
      }

      availableDaysCount++
      return {
        dateKey,
        status: "AVAILABLE",
      }
    })

    return {
      roomId: rm.id,
      roomNumber: rm.roomNumber,
      floorNumber: Number(rm.floorNumber || 1),
      roomTypeId: rm.roomTypeId,
      roomTypeName: rt?.name || "Standart Oda",
      roomStatus: rm.status,
      days,
      occupiedDaysCount,
      availableDaysCount,
    }
  })

  return { dateHeaders, rows }
}
