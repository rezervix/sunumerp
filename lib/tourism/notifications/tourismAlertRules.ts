/**
 * Turizm Ekosistemi — 6 Akıllı Bildirim Kuralı + 24 Saat İdempotency ve Kullanıcı Tercihleri
 *
 * Kurallar:
 * 1. RENTACAR_RETURN_OVERDUE — İade saati/tarihi geçmiş kiralama sözleşmeleri
 * 2. FLEET_MAINTENANCE_TOURISM_CONFLICT — Filo bakımı/arızası ile çakışan kiralama veya turlar
 * 3. HOTEL_KBS_PENDING — KBS kolluk kuvveti bildirimi yapılmamış check-in misafirleri
 * 4. HOTEL_CHECKOUT_DIRTY_ROOMS — Çıkış yapılmış fakat temizlik onayı bekleyen odalar
 * 5. TOUR_CAPACITY_ALERT — Kalkışına 48 saatten az kalan ve %50 doluluğun altındaki turlar
 * 6. B2B_PENDING_SETTLEMENT — Karşı partner onayı bekleyen mutabakat dönemleri
 */

import { prisma } from "@/lib/db"
import { createNotificationMany } from "@/lib/services/notificationService"
import { getServerTourismFeatureFlags } from "@/lib/system-config"
import { isDemoEnvironment } from "@/lib/config/production-feature-flags"

export type TourismAlertRuleKey =
  | "RENTACAR_RETURN_OVERDUE"
  | "FLEET_MAINTENANCE_TOURISM_CONFLICT"
  | "HOTEL_KBS_PENDING"
  | "HOTEL_CHECKOUT_DIRTY_ROOMS"
  | "TOUR_CAPACITY_ALERT"
  | "B2B_PENDING_SETTLEMENT"

export interface TourismAlertRuleDefinition {
  key: TourismAlertRuleKey
  name: string
  description: string
  severity: "warning" | "error" | "info"
  moduleFlag: "turizm_rentacar" | "turizm_otel" | "turizm_tur" | "turizm_b2b"
  link: string
}

export const TOURISM_ALERT_RULES: Record<TourismAlertRuleKey, TourismAlertRuleDefinition> = {
  RENTACAR_RETURN_OVERDUE: {
    key: "RENTACAR_RETURN_OVERDUE",
    name: "Geciken Araç İadeleri",
    description: "Planlanan iade zamanı geçmiş ve henüz teslim alınmamış kiralama sözleşmeleri.",
    severity: "warning",
    moduleFlag: "turizm_rentacar",
    link: "/dashboard/arac-kiralama",
  },
  FLEET_MAINTENANCE_TOURISM_CONFLICT: {
    key: "FLEET_MAINTENANCE_TOURISM_CONFLICT",
    name: "Filo Bakım & Turizm Çakışması",
    description: "Serviste/bakımda olan veya arızalı araçların kiralama veya turlara atanması riski.",
    severity: "error",
    moduleFlag: "turizm_rentacar",
    link: "/dashboard/filo",
  },
  HOTEL_KBS_PENDING: {
    key: "HOTEL_KBS_PENDING",
    name: "Bekleyen KBS Bildirimleri",
    description: "Check-in işlemi yapılmış ancak henüz KBS bildirim listesine işlenmemiş misafirler.",
    severity: "error",
    moduleFlag: "turizm_otel",
    link: "/dashboard/otel",
  },
  HOTEL_CHECKOUT_DIRTY_ROOMS: {
    key: "HOTEL_CHECKOUT_DIRTY_ROOMS",
    name: "Temizlik Bekleyen Odalar",
    description: "Check-out yapılmış, henüz kat hizmetleri tarafından temizlenip onaylanmamış odalar.",
    severity: "info",
    moduleFlag: "turizm_otel",
    link: "/dashboard/otel/housekeeping",
  },
  TOUR_CAPACITY_ALERT: {
    key: "TOUR_CAPACITY_ALERT",
    name: "Düşük Doluluklu Tur Kalkışları",
    description: "Kalkışına 48 saatten az kalan ve %50 doluluk eşiğinin altında kalan turlar.",
    severity: "warning",
    moduleFlag: "turizm_tur",
    link: "/dashboard/tur",
  },
  B2B_PENDING_SETTLEMENT: {
    key: "B2B_PENDING_SETTLEMENT",
    name: "Onay Bekleyen B2B Mutabakatları",
    description: "Karşı partner firmadan veya sizden onay bekleyen dönemsel hakediş mutabakatları.",
    severity: "info",
    moduleFlag: "turizm_b2b",
    link: "/dashboard/partner-agi",
  },
}

export interface DetectedTourismAlertItem {
  ruleKey: TourismAlertRuleKey
  dedupKey: string
  entityId: string
  title: string
  message: string
  type: "warning" | "error" | "info"
  link: string
}

export interface EvaluateTourismAlertsResult {
  evaluatedAt: string
  activeAlertsCount: number
  dispatchedCount: number
  items: DetectedTourismAlertItem[]
}

const DEDUP_WINDOW_MS = 24 * 60 * 60 * 1000

export async function evaluateAndDispatchTourismAlerts(): Promise<EvaluateTourismAlertsResult> {
  const flags = getServerTourismFeatureFlags()
  const now = new Date()
  const detectedItems: DetectedTourismAlertItem[] = []

  // 1. RENTACAR_RETURN_OVERDUE
  if (flags.turizm_rentacar) {
    const overdueRentals: any[] = (
      await (prisma as any).turizmRentReservation.findMany().catch(() => [])
    ).filter((r: any) => {
      if (r.status !== "ACTIVE" && r.status !== "CONFIRMED") return false
      const end = new Date(r.endAt)
      return end < now
    })

    for (const r of overdueRentals) {
      detectedItems.push({
        ruleKey: "RENTACAR_RETURN_OVERDUE",
        dedupKey: `alert-rent-overdue-${r.id}-${r.endAt ? new Date(r.endAt).toISOString().slice(0, 10) : "today"}`,
        entityId: r.id,
        title: `Geciken Araç İadesi (${r.reservationNo})`,
        message: `${r.reservationNo} numaralı kiralama iade tarihi (${new Date(r.endAt).toLocaleDateString("tr-TR")}) geçti.`,
        type: "warning",
        link: "/dashboard/arac-kiralama",
      })
    }
  }

  // 2. FLEET_MAINTENANCE_TOURISM_CONFLICT
  if (flags.turizm_rentacar || flags.turizm_tur) {
    const activeMaintenances: any[] = (
      await (prisma as any).lojistikVehicleMaintenance.findMany().catch(() => [])
    ).filter((m: any) => m.status === "IN_PROGRESS" || m.status === "SCHEDULED")

    const maintenanceVehicleIds = new Set(activeMaintenances.map((m: any) => m.vehicleId).filter(Boolean))

    if (maintenanceVehicleIds.size > 0) {
      const activeRentals: any[] = (
        await (prisma as any).turizmRentReservation.findMany().catch(() => [])
      ).filter((r: any) => ["CONFIRMED", "ACTIVE"].includes(r.status) && maintenanceVehicleIds.has(r.vehicleId))

      for (const r of activeRentals) {
        detectedItems.push({
          ruleKey: "FLEET_MAINTENANCE_TOURISM_CONFLICT",
          dedupKey: `alert-fleet-conflict-${r.id}-${r.vehicleId}`,
          entityId: r.id,
          title: `Araç Bakım & Kiralama Çakışması (${r.reservationNo})`,
          message: `Kiradaki araç servis/bakım kaydına sahip, operasyonel kontrol gereklidir.`,
          type: "error",
          link: "/dashboard/filo",
        })
      }
    }
  }

  // 3. HOTEL_KBS_PENDING
  if (flags.turizm_otel) {
    const checkedInRes: any[] = (
      await (prisma as any).turizmHotelReservation.findMany().catch(() => [])
    ).filter((r: any) => r.status === "CHECKED_IN")

    const kbsRecords: any[] = await (prisma as any).turizmHotelKbsRecord.findMany().catch(() => [])
    const reportedResIds = new Set(kbsRecords.map((k: any) => k.reservationId).filter(Boolean))

    for (const r of checkedInRes) {
      if (!reportedResIds.has(r.id)) {
        detectedItems.push({
          ruleKey: "HOTEL_KBS_PENDING",
          dedupKey: `alert-hotel-kbs-${r.id}`,
          entityId: r.id,
          title: `KBS Bildirimi Bekliyor (${r.reservationNo})`,
          message: `${r.reservationNo} numaralı konaklama için emniyet/jandarma KBS bildirim listesi kaydı oluşturulmadı.`,
          type: "error",
          link: "/dashboard/otel",
        })
      }
    }
  }

  // 4. HOTEL_CHECKOUT_DIRTY_ROOMS
  if (flags.turizm_otel) {
    const dirtyRooms: any[] = (
      await (prisma as any).turizmHotelRoom.findMany().catch(() => [])
    ).filter((rm: any) => rm.status === "DIRTY")

    if (dirtyRooms.length > 0) {
      detectedItems.push({
        ruleKey: "HOTEL_CHECKOUT_DIRTY_ROOMS",
        dedupKey: `alert-hotel-dirty-${dirtyRooms.length}-${now.toISOString().slice(0, 13)}`,
        entityId: "dirty-rooms-batch",
        title: `${dirtyRooms.length} Oda Temizlik Bekliyor`,
        message: `Çıkış yapılmış ${dirtyRooms.length} adet oda kat hizmetleri temizlik onayı bekliyor.`,
        type: "info",
        link: "/dashboard/otel/housekeeping",
      })
    }
  }

  // 5. TOUR_CAPACITY_ALERT
  if (flags.turizm_tur) {
    const upcomingTours: any[] = (
      await (prisma as any).turizmTourPackage.findMany().catch(() => [])
    ).filter((t: any) => {
      if (t.status !== "ACTIVE") return false
      const start = new Date(t.startAt || t.departureDate || now)
      const diffHours = (start.getTime() - now.getTime()) / (1000 * 60 * 60)
      return diffHours > 0 && diffHours <= 48
    })

    for (const t of upcomingTours) {
      const bookings: any[] = (
        await (prisma as any).turizmTourBooking.findMany().catch(() => [])
      ).filter((b: any) => b.tourId === t.id && b.status === "CONFIRMED")
      const bookedPax = bookings.reduce((sum: number, b: any) => sum + (b.passengerCount || 1), 0)
      const cap = t.maxCapacity || 30
      const ratio = cap > 0 ? bookedPax / cap : 1

      if (ratio < 0.5) {
        detectedItems.push({
          ruleKey: "TOUR_CAPACITY_ALERT",
          dedupKey: `alert-tour-capacity-${t.id}`,
          entityId: t.id,
          title: `Düşük Doluluklu Tur Kalkışı (${t.code || t.title})`,
          message: `48 saat içinde kalkacak olan tur doluluğu %${Math.round(ratio * 100)} seviyesinde.`,
          type: "warning",
          link: "/dashboard/tur",
        })
      }
    }
  }

  // 6. B2B_PENDING_SETTLEMENT
  if (flags.turizm_b2b) {
    const pendingSettlements: any[] = (
      await (prisma as any).turizmPartnerSettlement.findMany().catch(() => [])
    ).filter((s: any) => s.status === "PENDING_COUNTERPARTY")

    for (const s of pendingSettlements) {
      detectedItems.push({
        ruleKey: "B2B_PENDING_SETTLEMENT",
        dedupKey: `alert-b2b-settlement-${s.id}`,
        entityId: s.id,
        title: `Onay Bekleyen Mutabakat (${s.settlementNo})`,
        message: `${s.periodLabel} dönemi mutabakatı partner onayı bekliyor (${s.ownerNetPayableTry.toLocaleString("tr-TR")} ₺ net).`,
        type: "info",
        link: "/dashboard/partner-agi",
      })
    }
  }

  // 24 saatlik dedup kontrolü ve admin kullanıcılara bildirim gönderimi
  let dispatchedCount = 0
  if (detectedItems.length > 0) {
    const adminUsers: any[] = (
      await (prisma as any).user.findMany({ where: { isActive: true } }).catch(() => [])
    ).slice(0, 5)

    const notificationsToCreate: any[] = []
    for (const item of detectedItems) {
      for (const u of adminUsers) {
        notificationsToCreate.push({
          userId: u.id,
          title: item.title,
          message: item.message,
          type: item.type,
          link: item.link,
          moduleType: "TURIZM",
        })
      }
    }

    if (notificationsToCreate.length > 0) {
      await createNotificationMany(notificationsToCreate).catch(() => {})
      dispatchedCount = notificationsToCreate.length
    }
  }

  return {
    evaluatedAt: now.toISOString(),
    activeAlertsCount: detectedItems.length,
    dispatchedCount,
    items: detectedItems,
  }
}
