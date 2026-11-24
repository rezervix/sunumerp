/**
 * Sunum ERP — Turizm Faz 4: Tur Operatörlüğü (turizm_tur)
 * İstemci-Güvenli (Saf) Tipler, Sabitler, Dinamik Koltuk Şeması & Cinsiyet/Aile Kuralı,
 * Mesafe/Süre Tahmini ("tahmini" ibareli), Maliyet-Kâr & Acenta Komisyon Formülleri,
 * Kaynak × Gün Gantt Yardımcıları
 *
 * KURALLAR:
 * - Hem sunucu hem istemci ("use client") bileşenlerinde güvenle import edilir.
 * - fs, path, prisma/db veya audit modülleri ASLA import edilmez.
 */

import { doTimeIntervalsOverlap } from "@/lib/tourism/rentacar/constantsAndHelpers"

export const TOUR_TYPES = ["DAY_TRIP", "MULTI_DAY"] as const
export type TourType = (typeof TOUR_TYPES)[number]

export const TOUR_TYPE_LABELS: Record<TourType, string> = {
  DAY_TRIP: "Günübirlik Tur",
  MULTI_DAY: "Konaklamalı Tur",
}

export const TOUR_STATUSES = [
  "DRAFT",
  "ON_SALE",
  "GUARANTEED",
  "FULL",
  "COMPLETED",
  "CANCELLED",
] as const
export type TourStatus = (typeof TOUR_STATUSES)[number]

export const TOUR_STATUS_LABELS: Record<TourStatus, string> = {
  DRAFT: "Taslak",
  ON_SALE: "Satışta",
  GUARANTEED: "Garantili Hareket",
  FULL: "Dolu (Kontenjan Kapalı)",
  COMPLETED: "Tamamlandı",
  CANCELLED: "İptal Edildi",
}

export const TOUR_STATUS_BADGES: Record<TourStatus, string> = {
  DRAFT: "bg-zinc-500/15 text-zinc-300 border-white/[0.12]",
  ON_SALE: "bg-sky-500/15 text-sky-300 border-sky-500/35",
  GUARANTEED: "bg-[--ok-soft] text-[--ok] border border-[--ok]/20",
  FULL: "bg-amber-500/20 text-amber-300 border-amber-500/40",
  COMPLETED: "bg-purple-500/15 text-purple-300 border-purple-500/35",
  CANCELLED: "bg-rose-500/15 text-rose-300 border-rose-500/35",
}

export const TOUR_BOOKING_STATUS_LABELS: Record<string, string> = {
  PENDING: "Ön Rezervasyon",
  CONFIRMED: "Onaylı",
  CANCELLED: "İptal",
  NO_SHOW: "Gelmedi (No-Show)",
}

export const TOUR_PAYMENT_STATUS_LABELS: Record<string, string> = {
  UNPAID: "Ödenmedi",
  PARTIAL: "Kısmi Ödeme",
  PAID: "Tamamlandı",
  REFUNDED: "İade Edildi",
}

export const TOUR_BOARDING_STATUS_LABELS: Record<string, string> = {
  WAITING: "Biniş Bekliyor",
  BOARDED: "Bindi (Check-In)",
  NO_SHOW: "Binişe Gelmedi",
}

export const TOUR_BOARDING_STATUS_BADGES: Record<string, string> = {
  WAITING: "bg-amber-500/15 text-amber-300 border-amber-500/30",
  BOARDED: "bg-[--ok-soft] text-[--ok] border border-[--ok]/20",
  NO_SHOW: "bg-rose-500/15 text-rose-300 border-rose-500/30",
}

export const TOUR_EXPENSE_CATEGORIES = [
  "VEHICLE_FUEL",
  "GUIDE_FEE",
  "HOTEL_ACCOMMODATION",
  "MUSEUM_TICKET",
  "MEAL_CATERING",
  "HIGHWAY_TOLL",
  "AGENCY_COMMISSION",
  "OTHER",
] as const
export type TourExpenseCategory = (typeof TOUR_EXPENSE_CATEGORIES)[number]

export const TOUR_EXPENSE_CATEGORY_LABELS: Record<TourExpenseCategory, string> = {
  VEHICLE_FUEL: "Araç & Yakıt Gideri (Filo)",
  GUIDE_FEE: "Rehberlik & Harcırah",
  HOTEL_ACCOMMODATION: "Otel Konaklama (Faz 3)",
  MUSEUM_TICKET: "Müze / Ören Yeri / Etkinlik Bileti",
  MEAL_CATERING: "Yemek & İkram",
  HIGHWAY_TOLL: "Otoyol / Köprü / Otopark",
  AGENCY_COMMISSION: "Acenta Komisyonu",
  OTHER: "Diğer Operasyon Gideri",
}

export const TOUR_CHANNEL_LABELS: Record<string, string> = {
  DIRECT_WEB: "Direkt Web Sitesi",
  DIRECT_OFFICE: "Satış Ofisi / Telefon",
  AGENCY_B2B: "Acenta / B2B Kanal",
  CORPORATE: "Kurumsal Grup",
  ONLINE_PORTAL: "Online Tur Portalı",
}

export const TOUR_VEHICLE_CATEGORY_LABELS: Record<string, string> = {
  OTOBUS: "Turizm Otobüsü (45+1)",
  MIDIBUS: "Midibüs (27+1)",
  MINIBUS: "Minibüs / Sprinter (16+1)",
  VIP_VAN: "VIP Transfer / Vito (8+1)",
}

export interface TourItineraryItem {
  day: number
  time: string
  location: string
  activity: string
}

export interface SeatSlotDef {
  seatNumber: string
  row: number
  col: number // 0-indexed across seatsPerRow
  side: "LEFT" | "RIGHT"
  pairKey: string // aynı sıradaki bitişik ikili/çift anahtarı
}

// ── B) Dinamik Koltuk Şeması & Ayarlanabilir Cinsiyet/Aile Kuralı ─────────────

export function buildSeatSlotsFromLayout(layout: {
  totalSeats?: number
  rowsCount?: number
  seatsPerRow?: number
  aisleAfterCol?: number
  seatMapJson?: string | null
}): SeatSlotDef[] {
  if (layout?.seatMapJson) {
    try {
      const parsed = JSON.parse(layout.seatMapJson)
      if (Array.isArray(parsed) && parsed.length > 0) return parsed
    } catch {
      // fall through to deterministic generator
    }
  }
  const totalSeats = Math.max(4, Number(layout?.totalSeats || 16))
  const seatsPerRow = Math.max(2, Math.min(5, Number(layout?.seatsPerRow || 4)))
  const aisleAfterCol = Math.max(1, Math.min(seatsPerRow - 1, Number(layout?.aisleAfterCol || 2)))

  const slots: SeatSlotDef[] = []
  let num = 1
  let row = 1
  while (num <= totalSeats) {
    for (let col = 0; col < seatsPerRow && num <= totalSeats; col++) {
      const side: "LEFT" | "RIGHT" = col < aisleAfterCol ? "LEFT" : "RIGHT"
      slots.push({
        seatNumber: String(num),
        row,
        col,
        side,
        pairKey: `R${row}-${side}`,
      })
      num++
    }
    row++
  }
  return slots
}

export function validateSeatAssignmentRule(params: {
  seatNumber: string
  passengerGender: string
  familyGroupCode?: string | null
  layout: { totalSeats?: number; rowsCount?: number; seatsPerRow?: number; aisleAfterCol?: number; seatMapJson?: string | null }
  occupiedPassengers: Array<{
    id?: string
    seatNumber?: string | null
    gender?: string | null
    familyGroupCode?: string | null
    fullName?: string
  }>
  excludePassengerId?: string
  enforceGenderRule: boolean
  allowFamilyOverride: boolean
}): { ok: true } | { ok: false; code: string; message: string } {
  const slots = buildSeatSlotsFromLayout(params.layout)
  const targetSlot = slots.find((s) => s.seatNumber === String(params.seatNumber))
  if (!targetSlot) {
    return {
      ok: false,
      code: "INVALID_SEAT_NUMBER",
      message: `${params.seatNumber} numaralı koltuk bu araç yerleşim şemasında bulunmuyor.`,
    }
  }

  const activeOthers = (params.occupiedPassengers || []).filter(
    (p) => p.seatNumber && (!params.excludePassengerId || p.id !== params.excludePassengerId)
  )

  const takenBy = activeOthers.find((p) => String(p.seatNumber) === String(params.seatNumber))
  if (takenBy) {
    return {
      ok: false,
      code: "SEAT_ALREADY_TAKEN",
      message: `${params.seatNumber} numaralı koltuk başka bir yolcuya atanmıştır.`,
    }
  }

  if (params.enforceGenderRule && (params.passengerGender === "M" || params.passengerGender === "F")) {
    const neighborSeats = slots
      .filter((s) => s.pairKey === targetSlot.pairKey && s.seatNumber !== targetSlot.seatNumber)
      .map((s) => s.seatNumber)

    for (const ns of neighborSeats) {
      const neighborPax = activeOthers.find((p) => String(p.seatNumber) === ns)
      if (!neighborPax) continue
      const nGender = String(neighborPax.gender || "UNSPECIFIED")
      if ((nGender === "M" || nGender === "F") && nGender !== params.passengerGender) {
        const sameFamily =
          params.allowFamilyOverride &&
          Boolean(params.familyGroupCode) &&
          Boolean(neighborPax.familyGroupCode) &&
          String(params.familyGroupCode).trim().toUpperCase() ===
            String(neighborPax.familyGroupCode).trim().toUpperCase()
        if (!sameFamily) {
          return {
            ok: false,
            code: "SEAT_GENDER_RULE_VIOLATION",
            message: `Koltuk ${params.seatNumber} yanındaki ${ns} numaralı koltuk karşı cinsiyette başka bir yolcuya ait (aynı aile/grup kodu girilmeden yan yana atama kural gereği engellendi).`,
          }
        }
      }
    }
  }

  return { ok: true }
}

// ── D) Biniş Noktaları Mesafe & Süre Tahmini ("tahmini" ibaresiyle) ──────────

export function haversineDistanceKm(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number
): number {
  const R = 6371
  const toRad = (deg: number) => (deg * Math.PI) / 180
  const dLat = toRad(lat2 - lat1)
  const dLng = toRad(lng2 - lng1)
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) * Math.sin(dLng / 2)
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
  return R * c
}

export function estimateTourRouteMetrics(
  stops: Array<{ lat: number; lng: number; sequenceNo?: number }>,
  avgSpeedKmH = 52
): {
  estimatedDistanceKm: number
  estimatedDurationMinutes: number
  disclaimer: string
} {
  if (!stops || stops.length < 2) {
    return {
      estimatedDistanceKm: 0,
      estimatedDurationMinutes: 0,
      disclaimer: "Mesafe ve süre değerleri kuş uçuşu/yol faktörüyle hesaplanan tahmini verilerdir.",
    }
  }
  const ordered = [...stops].sort((a, b) => Number(a.sequenceNo || 0) - Number(b.sequenceNo || 0))
  let totalKm = 0
  for (let i = 1; i < ordered.length; i++) {
    const seg = haversineDistanceKm(
      Number(ordered[i - 1].lat),
      Number(ordered[i - 1].lng),
      Number(ordered[i].lat),
      Number(ordered[i].lng)
    )
    // Yol kıvrım katsayısı (1.24x) — açıkça tahmini olarak etiketlenir
    totalKm += seg * 1.24
  }
  const estimatedDistanceKm = Number(totalKm.toFixed(1))
  const estimatedDurationMinutes = Math.max(15, Math.round((estimatedDistanceKm / avgSpeedKmH) * 60))
  return {
    estimatedDistanceKm,
    estimatedDurationMinutes,
    disclaimer:
      "Gösterilen kilometre ve varış süreleri trafik ve yol durumuna göre değişebilen tahmini değerlerdir.",
  }
}

// ── F) Maliyet-Kâr Analizi ve Acenta Komisyon Hesabı ─────────────────────────

export interface TourProfitabilitySummary {
  tourId: string
  tourCode: string
  tourTitle: string
  status: string
  confirmedPassengers: number
  capacity: number
  occupancyPct: number
  grossRevenueTry: number
  collectedRevenueTry: number
  pendingReceivableTry: number
  agencyCommissionTotalTry: number
  expensesByCategory: Record<string, number>
  directExpensesTotalTry: number
  totalCostsWithCommissionTry: number
  netProfitTry: number
  profitPerPassengerTry: number
  profitMarginPct: number
}

export function computeAgencyCommission(
  grossAmountTry: number,
  commissionRatePct: number
): number {
  const gross = Math.max(0, Number(grossAmountTry || 0))
  const rate = Math.max(0, Math.min(100, Number(commissionRatePct || 0)))
  return Number(((gross * rate) / 100).toFixed(2))
}

export function computeTourProfitability(params: {
  tour: any
  bookings: any[]
  expenses: any[]
  fleetFuelCostTry?: number
}): TourProfitabilitySummary {
  const activeBookings = (params.bookings || []).filter(
    (b) => b.status !== "CANCELLED" && b.status !== "NO_SHOW"
  )
  const confirmedPassengers = activeBookings.reduce(
    (s, b) => s + Number(b.passengerCount || 0),
    0
  )
  const grossRevenueTry = Number(
    activeBookings.reduce((s, b) => s + Number(b.totalPriceTry || 0), 0).toFixed(2)
  )
  const collectedRevenueTry = Number(
    activeBookings.reduce((s, b) => s + Number(b.paidAmountTry || 0), 0).toFixed(2)
  )
  const pendingReceivableTry = Number(Math.max(0, grossRevenueTry - collectedRevenueTry).toFixed(2))
  const agencyCommissionTotalTry = Number(
    activeBookings.reduce((s, b) => s + Number(b.agencyCommissionTry || 0), 0).toFixed(2)
  )

  const expensesByCategory: Record<string, number> = {}
  let directExpensesTotalTry = 0
  let hasExplicitFuel = false
  for (const exp of params.expenses || []) {
    const cat = String(exp.category || "OTHER")
    if (cat === "AGENCY_COMMISSION") continue // komisyon booking üzerinden tek sefer toplanır
    if (cat === "VEHICLE_FUEL") hasExplicitFuel = true
    const val = Number(exp.totalCostTry || 0)
    expensesByCategory[cat] = Number(((expensesByCategory[cat] || 0) + val).toFixed(2))
    directExpensesTotalTry += val
  }

  // Filo yakıt verisinden otomatik tamamlayıcı maliyet (eğer manuel yakıt kalemi yoksa)
  if (!hasExplicitFuel && Number(params.fleetFuelCostTry || 0) > 0) {
    const fuelVal = Number(Number(params.fleetFuelCostTry).toFixed(2))
    expensesByCategory.VEHICLE_FUEL = fuelVal
    directExpensesTotalTry += fuelVal
  }

  directExpensesTotalTry = Number(directExpensesTotalTry.toFixed(2))
  const totalCostsWithCommissionTry = Number(
    (directExpensesTotalTry + agencyCommissionTotalTry).toFixed(2)
  )
  const netProfitTry = Number((grossRevenueTry - totalCostsWithCommissionTry).toFixed(2))
  const profitPerPassengerTry =
    confirmedPassengers > 0 ? Number((netProfitTry / confirmedPassengers).toFixed(2)) : 0
  const profitMarginPct =
    grossRevenueTry > 0 ? Number(((netProfitTry / grossRevenueTry) * 100).toFixed(1)) : 0
  const cap = Math.max(1, Number(params.tour?.capacity || 1))
  const occupancyPct = Number(Math.min(100, (confirmedPassengers / cap) * 100).toFixed(1))

  return {
    tourId: params.tour.id,
    tourCode: params.tour.code,
    tourTitle: params.tour.title,
    status: params.tour.status,
    confirmedPassengers,
    capacity: cap,
    occupancyPct,
    grossRevenueTry,
    collectedRevenueTry,
    pendingReceivableTry,
    agencyCommissionTotalTry,
    expensesByCategory,
    directExpensesTotalTry,
    totalCostsWithCommissionTry,
    netProfitTry,
    profitPerPassengerTry,
    profitMarginPct,
  }
}

// ── E) Kaynak × Gün Çakışma & Gantt Görünümü (Araç + Şoför + Rehber) ─────────

export interface ResourceGanttRow {
  resourceType: "VEHICLE" | "DRIVER" | "GUIDE"
  resourceId: string
  label: string
  subLabel: string
  days: Array<{
    dateKey: string
    status: "AVAILABLE" | "TOUR" | "RENTACAR" | "MAINTENANCE"
    refLabel?: string
  }>
}

export function buildTourResourceGantt(params: {
  vehicles: any[]
  drivers: any[]
  guides: any[]
  tours: any[]
  rentReservations: any[]
  windowStartDate: string | Date
  daysCount?: number
}): { dateHeaders: string[]; rows: ResourceGanttRow[] } {
  const daysCount = Math.min(21, Math.max(7, Number(params.daysCount || 14)))
  const start = new Date(params.windowStartDate)
  start.setUTCHours(0, 0, 0, 0)

  const dateHeaders: string[] = []
  for (let i = 0; i < daysCount; i++) {
    dateHeaders.push(new Date(start.getTime() + i * 86_400_000).toISOString().slice(0, 10))
  }

  const activeTours = (params.tours || []).filter((t) => t.status !== "CANCELLED")
  const activeRents = (params.rentReservations || []).filter(
    (r) => r.status === "PENDING" || r.status === "CONFIRMED" || r.status === "ACTIVE"
  )

  const rows: ResourceGanttRow[] = []

  // 1. Araçlar (Turlar + Rent-a-Car + Filo Bakım)
  for (const v of params.vehicles || []) {
    rows.push({
      resourceType: "VEHICLE",
      resourceId: v.id,
      label: `Araç: ${v.plate}`,
      subLabel: `${v.brand || ""} ${v.model || ""}`.trim(),
      days: dateHeaders.map((dk) => {
        const dStart = new Date(`${dk}T00:00:00.000Z`)
        const dEnd = new Date(`${dk}T23:59:59.000Z`)
        if (v.status === "MAINTENANCE" || v.status === "FAULT" || v.status === "OUT_OF_SERVICE") {
          return { dateKey: dk, status: "MAINTENANCE", refLabel: v.status }
        }
        const t = activeTours.find(
          (x) => x.vehicleId === v.id && doTimeIntervalsOverlap(x.startAt, x.endAt, dStart, dEnd)
        )
        if (t) return { dateKey: dk, status: "TOUR", refLabel: t.code }
        const r = activeRents.find(
          (x) => x.vehicleId === v.id && doTimeIntervalsOverlap(x.startAt, x.endAt, dStart, dEnd)
        )
        if (r) return { dateKey: dk, status: "RENTACAR", refLabel: r.reservationNo }
        return { dateKey: dk, status: "AVAILABLE" }
      }),
    })
  }

  // 2. Şoförler
  for (const d of (params.drivers || []).slice(0, 8)) {
    rows.push({
      resourceType: "DRIVER",
      resourceId: d.id,
      label: `Şoför: ${d.fullName}`,
      subLabel: d.licenseClass ? `Ehliyet ${d.licenseClass}` : "Filo Şoförü",
      days: dateHeaders.map((dk) => {
        const dStart = new Date(`${dk}T00:00:00.000Z`)
        const dEnd = new Date(`${dk}T23:59:59.000Z`)
        const t = activeTours.find(
          (x) => x.driverId === d.id && doTimeIntervalsOverlap(x.startAt, x.endAt, dStart, dEnd)
        )
        if (t) return { dateKey: dk, status: "TOUR", refLabel: t.code }
        return { dateKey: dk, status: "AVAILABLE" }
      }),
    })
  }

  // 3. Rehberler
  for (const g of params.guides || []) {
    rows.push({
      resourceType: "GUIDE",
      resourceId: g.id,
      label: `Rehber: ${g.fullName}`,
      subLabel: g.licenseNo || g.code,
      days: dateHeaders.map((dk) => {
        const dStart = new Date(`${dk}T00:00:00.000Z`)
        const dEnd = new Date(`${dk}T23:59:59.000Z`)
        const t = activeTours.find(
          (x) => x.guideId === g.id && doTimeIntervalsOverlap(x.startAt, x.endAt, dStart, dEnd)
        )
        if (t) return { dateKey: dk, status: "TOUR", refLabel: t.code }
        return { dateKey: dk, status: "AVAILABLE" }
      }),
    })
  }

  return { dateHeaders, rows }
}
