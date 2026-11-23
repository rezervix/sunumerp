/**
 * Turizm Faz 6 Seed Modülü — Uçtan Uca Entegrasyonlar ve Sektörel Panolar
 *
 * KURALLAR:
 * - Yalnızca DEMO ortamında çalışır (`isDemoEnvironment()`).
 * - Önceki Faz 1–5 kayıtlarına dokunmaz; tüm yeni kayıtlar `trzm-f6-*` ön ekli ID taşır.
 * - İdempotenttir (tekrar çalıştığında 0 ekleme yapar).
 * - Rollback fonksiyonu tüm `trzm-f6-*` kayıtlarını siler.
 */

import type { LogisticsSeedModule } from "@/lib/logistics/seed/framework"

export const SEED_FAZ6_IDS = {
  turizmRentReservation: ["trzm-f6-rnt-01"],
  turizmHotelFolioItem: ["trzm-f6-fl-01", "trzm-f6-fl-02"],
  turizmHotelHousekeepingTask: ["trzm-f6-hk-01", "trzm-f6-hk-02"],
  finance: ["trzm-f6-fin-01", "trzm-f6-fin-02"],
  notification: ["trzm-f6-notif-01", "trzm-f6-notif-02", "trzm-f6-notif-03"],
} as const

function pushIfMissing(db: Record<string, any[]>, col: string, rec: any): number {
  if (!Array.isArray(db[col])) db[col] = []
  if (db[col].some((r) => String(r?.id) === String(rec.id))) return 0
  db[col].push(rec)
  return 1
}

export const faz6IntegrationAndDashboardsSeedModule: LogisticsSeedModule = {
  moduleKey: "turizm_faz6_entegrasyon_ve_panolar",
  phase: 6,
  seededIdsByCollection: SEED_FAZ6_IDS,
  seed(db) {
    const now = "2026-11-23T12:00:00.000Z"
    const inserted: Record<string, number> = {}
    let skippedExisting = 0

    const add = (col: string, rec: any) => {
      const n = pushIfMissing(db, col, rec)
      if (n > 0) inserted[col] = (inserted[col] || 0) + n
      else skippedExisting++
    }

    // 1. Rent-a-car tamamlanmış ve finansa yansımış kiralama kaydı
    add("turizmRentReservation", {
      id: "trzm-f6-rnt-01",
      reservationNo: "RNT-2026-F601",
      branchId: "local-debug-branch",
      pickupBranchId: "local-debug-branch",
      returnBranchId: "local-debug-branch",
      pickupLocationLabel: "Merkez Ofis",
      returnLocationLabel: "Merkez Ofis",
      vehicleId: "veh-001",
      vehicleClassId: "cls-c-auto",
      customerId: "cust-001",
      startAt: "2026-11-18T09:00:00.000Z",
      endAt: "2026-11-21T18:00:00.000Z",
      actualPickupAt: "2026-11-18T09:15:00.000Z",
      actualReturnAt: "2026-11-21T17:45:00.000Z",
      rentalDays: 3,
      status: "COMPLETED",
      dailyRateTry: 1650,
      baseRentalAmountTry: 4950,
      extrasTotalTry: 350,
      discountAmountTry: 0,
      totalEstimatedTry: 5300,
      finalTotalTry: 5300,
      depositRequiredTry: 4000,
      dailyKmLimit: 250,
      totalKmLimit: 750,
      extraKmRateTry: 6.5,
      notes: "Eksiksiz teslim alındı; depozito blokesi kaldırıldı.",
      ownerCompanyId: "trzm-comp-main",
      createdBy: "turizm-faz6-seed",
      createdAt: "2026-11-18T08:00:00.000Z",
      updatedAt: now,
    })

    // 2. Otel Folio Minibar Harcamaları
    add("turizmHotelFolioItem", {
      id: "trzm-f6-fl-01",
      reservationId: "trzm-otl-res-01",
      category: "MINIBAR",
      description: "Minibar Tüketimi: 2x Su, 1x Maden Suyu, 1x Çikolata",
      amountTry: 280,
      isPaid: false,
      createdAt: "2026-11-22T21:30:00.000Z",
    })
    add("turizmHotelFolioItem", {
      id: "trzm-f6-fl-02",
      reservationId: "trzm-otl-res-01",
      category: "RESTAURANT",
      description: "Oda Servisi Akşam Yemeği",
      amountTry: 850,
      isPaid: false,
      createdAt: "2026-11-23T19:45:00.000Z",
    })

    // 3. Otel Housekeeping Görevleri (Check-out sonrası temizlik)
    add("turizmHotelHousekeepingTask", {
      id: "trzm-f6-hk-01",
      roomId: "room-101",
      taskType: "CHECKOUT_CLEANING",
      status: "IN_PROGRESS",
      assignedUserId: "usr-001",
      notes: "Misafir çıkış yaptı; 101 no'lu deluxe oda genel temizliği yapılıyor.",
      createdAt: "2026-11-23T11:00:00.000Z",
    })
    add("turizmHotelHousekeepingTask", {
      id: "trzm-f6-hk-02",
      roomId: "room-102",
      taskType: "DAILY_CLEANING",
      status: "COMPLETED",
      assignedUserId: "usr-001",
      notes: "Günlük havlu ve çarşaf değişimi tamamlandı.",
      createdAt: "2026-11-23T09:30:00.000Z",
    })

    // 4. Finans Kayıtları (Kiralama ve Konaklama Gelirleri)
    add("finance", {
      id: "trzm-f6-fin-01",
      type: "INCOME",
      category: "Araç Kiralama Geliri",
      amount: 5300,
      description: "RNT-2026-F601 — Kiralama Tamamlandı Gelir Kaydı",
      date: "2026-11-21T18:00:00.000Z",
      branchId: "local-debug-branch",
      vehicleId: "veh-001",
    })
    add("finance", {
      id: "trzm-f6-fin-02",
      type: "INCOME",
      category: "Konaklama Geliri",
      amount: 14200,
      description: "Örnek Kıyı Otel — Haftalık Konaklama Hakediş Geliri",
      date: "2026-11-22T17:00:00.000Z",
      branchId: "local-debug-branch",
    })

    // 5. Örnek Turizm Bildirimleri
    add("notification", {
      id: "trzm-f6-notif-01",
      userId: "usr-001",
      title: "Geciken Araç İadesi Uyarısı",
      message: "RNT-2026-004 numaralı kiralama için planlanan dönüş saati 2 saat aşıldı.",
      type: "warning",
      link: "/dashboard/arac-kiralama",
      moduleType: "TURIZM",
      isRead: false,
      createdAt: "2026-11-23T13:00:00.000Z",
    })
    add("notification", {
      id: "trzm-f6-notif-02",
      userId: "usr-001",
      title: "KBS Bildirimi Bekleyen Misafir",
      message: "Oda 204 için kolluk kuvveti KBS bildirimi henüz sisteme işlenmedi.",
      type: "error",
      link: "/dashboard/otel",
      moduleType: "TURIZM",
      isRead: false,
      createdAt: "2026-11-23T10:15:00.000Z",
    })
    add("notification", {
      id: "trzm-f6-notif-03",
      userId: "usr-001",
      title: "Yeni B2B Çapraz Rezervasyon Talebi",
      message: "Örnek Anadolu Keşif, VIP minibüs kaynağınız için talep oluşturdu.",
      type: "info",
      link: "/dashboard/partner-agi",
      moduleType: "TURIZM",
      isRead: true,
      createdAt: "2026-11-23T08:30:00.000Z",
    })

    return {
      moduleKey: "turizm_faz6_entegrasyon_ve_panolar",
      inserted,
      skippedExisting,
      notes: ["Faz 6 entegrasyon ve birleşik yönetim panosu demo verisi başarıyla eklendi."],
    }
  },
  rollback(db) {
    const removed: Record<string, number> = {}
    for (const [col, ids] of Object.entries(SEED_FAZ6_IDS)) {
      if (!Array.isArray(db[col])) continue
      const idSet = new Set<string>(ids as readonly string[])
      const before = db[col].length
      db[col] = db[col].filter((r: any) => !idSet.has(String(r?.id)))
      removed[col] = before - db[col].length
    }
    return removed
  },
}
