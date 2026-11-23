/**
 * Sunum ERP — Turizm Faz 4 Demo Seed Modülü: Tur Operatörlüğü (turizm_tur)
 *
 * KURALLAR (Kural 6):
 * - Yalnızca DEMO ortamında çalışır (`isDemoEnvironment()`).
 * - Mevcut hiçbir kayda dokunmaz; mevcut Filo araçlarını (`f5-veh-11`), şoförlerini
 *   (`f5-drv-04`, `f5-drv-06`, `f5-drv-08`, `f5-drv-09`, `f5-drv-10`, `f5-drv-11`),
 *   müşterilerini (`trzm-otl-cust-*`, `cust-*`) ve Faz 3 otel odaları/kontenjanlarını
 *   (`trzm-otl-allot-01`, `trzm-otl-rm-*`) doğrudan yeniden kullanır.
 * - Tüm yeni kayıtlar `trzm-tur-*` öneki (ve `role-tur-rehberi` rolü) taşır;
 *   idempotent çalışır ve tek komutla geri alınabilir.
 */

import bcrypt from "bcryptjs"
import { DEFAULT_ROLES } from "@/lib/auth/permissions"
import type { LogisticsSeedModule } from "@/lib/logistics/seed/framework"
import { GUIDE_ROLE_NAME, MAIN_COMPANY_ID } from "../constants"
import { buildSeatSlotsFromLayout, computeAgencyCommission } from "../tur/constantsAndHelpers"

export const SEED_FAZ4_TUR_PREFIX = "trzm-tur-"
export const SEED_GUIDE_ROLE_ID = "role-tur-rehberi"

function pushIfMissing(db: Record<string, any[]>, col: string, rec: any): number {
  if (!Array.isArray(db[col])) db[col] = []
  if (db[col].some((r) => String(r?.id) === String(rec.id))) return 0
  db[col].push(rec)
  return 1
}

export const faz4TourOperatorSeedModule: LogisticsSeedModule = {
  moduleKey: "turizm_faz4_tur_operatorlugu",
  phase: 4,
  seededIdPrefixes: [SEED_FAZ4_TUR_PREFIX],
  seededIdsByCollection: {
    role: [SEED_GUIDE_ROLE_ID],
    user: [],
    userBranchRole: [],
    lojistikVehicle: [],
    finance: [],
    turizmHotelKbsRecord: [],
    turizmTourGuide: [],
    turizmTourAgency: [],
    turizmTourSeatLayout: [],
    turizmTourPackage: [],
    turizmTourPickupStop: [],
    turizmTourBooking: [],
    turizmTourPassenger: [],
    turizmTourExpenseItem: [],
    turizmTourConflictLog: [],
    turizmTourFieldLog: [],
  },
  rollback(db) {
    const removed: Record<string, number> = {}
    for (const col of Object.keys(this.seededIdsByCollection)) {
      if (!Array.isArray(db[col])) continue
      const before = db[col].length
      db[col] = db[col].filter((r) => {
        const id = String(r?.id || "")
        if (col === "role" && id === SEED_GUIDE_ROLE_ID) return false
        return !id.startsWith(SEED_FAZ4_TUR_PREFIX)
      })
      const diff = before - db[col].length
      if (diff > 0) removed[col] = diff
    }
    return removed
  },
  seed(db) {
    const now = "2026-11-23T09:00:00.000Z"
    const inserted: Record<string, number> = {}
    let skippedExisting = 0
    const notes: string[] = []

    const add = (col: string, rec: any) => {
      const count = pushIfMissing(db, col, rec)
      if (count > 0) inserted[col] = (inserted[col] || 0) + count
      else skippedExisting++
    }

    if (!Array.isArray(db.role)) db.role = []
    if (!Array.isArray(db.user)) db.user = []
    if (!Array.isArray(db.userBranchRole)) db.userBranchRole = []

    const defaultBranchId =
      Array.isArray(db.branch) && db.branch.some((b) => b.id === "local-debug-branch")
        ? "local-debug-branch"
        : db.branch?.[0]?.id ?? "local-debug-branch"

    // ── 1. KISITLI "Tur Rehberi" ROLÜ VE 2 DEMO REHBER KULLANICISI ────────────
    if (!db.role.some((r) => r.id === SEED_GUIDE_ROLE_ID || r.name === GUIDE_ROLE_NAME)) {
      db.role.push({
        id: SEED_GUIDE_ROLE_ID,
        name: GUIDE_ROLE_NAME,
        description:
          "Kısıtlı Tur Rehberi rolü — yalnızca atandığı turların yolcu listesi, yoklama, acil not ve saha tahsilat ekranına erişir.",
        permissions: JSON.stringify(DEFAULT_ROLES[GUIDE_ROLE_NAME]),
      })
      inserted.role = (inserted.role || 0) + 1
    } else {
      skippedExisting++
    }

    const hashedPass = bcrypt.hashSync("demo123", 10)
    const guideUsers = [
      {
        id: "trzm-tur-user-gd1",
        ubrId: "trzm-tur-ubr-gd1",
        username: "rehber.kerem",
        fullName: "Kerem Aksoy (Kokartlı Tur Rehberi)",
        email: "kerem.rehber@ornek-tur.example",
        phone: "+90 555 401 01 01",
      },
      {
        id: "trzm-tur-user-gd2",
        ubrId: "trzm-tur-ubr-gd2",
        username: "rehber.elif",
        fullName: "Elif Karaca (Kültür & Doğa Rehberi)",
        email: "elif.rehber@ornek-tur.example",
        phone: "+90 555 401 02 02",
      },
    ]
    for (const gu of guideUsers) {
      add("user", {
        id: gu.id,
        username: gu.username,
        email: gu.email,
        password: hashedPass,
        fullName: gu.fullName,
        phone: gu.phone,
        avatarUrl: null,
        department: "Tur Operasyon & Rehberlik",
        position: "Kokartlı Tur Rehberi",
        supplierId: null,
        partnerCompanyId: null,
        isActive: true,
        mustChangePassword: false,
        createdAt: now,
        updatedAt: now,
      })
      add("userBranchRole", {
        id: gu.ubrId,
        userId: gu.id,
        branchId: defaultBranchId,
        roleId: SEED_GUIDE_ROLE_ID,
        assignedAt: now,
        assignedBy: "turizm-faz4-seed",
      })
    }

    // ── 2. REHBER KAYITLARI (4 Kurgusal Rehber) ───────────────────────────────
    const guides = [
      { id: "trzm-tur-gd-01", code: "RHB-01", userId: "trzm-tur-user-gd1", fullName: "Kerem Aksoy", licenseNo: "TRB-34-8821", languages: ["Türkçe", "İngilizce", "Almanca"], phone: "+90 555 401 01 01", dailyFeeTry: 4200, status: "ACTIVE" },
      { id: "trzm-tur-gd-02", code: "RHB-02", userId: "trzm-tur-user-gd2", fullName: "Elif Karaca", licenseNo: "TRB-34-9045", languages: ["Türkçe", "İngilizce", "Fransızca"], phone: "+90 555 401 02 02", dailyFeeTry: 3900, status: "ACTIVE" },
      { id: "trzm-tur-gd-03", code: "RHB-03", userId: null, fullName: "Barış Tuncer", licenseNo: "TRB-35-4410", languages: ["Türkçe", "İngilizce"], phone: "+90 555 401 03 03", dailyFeeTry: 3600, status: "ACTIVE" },
      { id: "trzm-tur-gd-04", code: "RHB-04", userId: null, fullName: "Derya Uslu", licenseNo: "TRB-06-5519", languages: ["Türkçe", "İspanyolca", "İngilizce"], phone: "+90 555 401 04 04", dailyFeeTry: 4400, status: "ACTIVE", ownerCompanyId: "trzm-comp-tur-02" },
    ]
    for (const g of guides) {
      add("turizmTourGuide", {
        id: g.id,
        code: g.code,
        userId: g.userId,
        fullName: g.fullName,
        licenseNo: g.licenseNo,
        languagesJson: JSON.stringify(g.languages),
        phone: g.phone,
        email: `${g.code.toLowerCase()}@ornek-tur.example`,
        dailyFeeTry: g.dailyFeeTry,
        status: g.status,
        notes: "Kurgusal demo rehber kaydı.",
        isActive: true,
        ownerCompanyId: (g as any).ownerCompanyId || MAIN_COMPANY_ID,
        createdAt: now,
        updatedAt: now,
      })
    }

    // ── 3. ACENTA & SATIŞ KANALLARI (4 Acenta) ────────────────────────────────
    const agencies = [
      { id: "trzm-tur-agn-01", code: "ACN-AND", name: "Örnek Anadolu Keşif Turizm Ltd.", partnerCompanyId: "trzm-comp-tur-02", contactPerson: "Selin Arslan", commissionRatePct: 12, defaultQuotaPerTour: 12, settlementTermDays: 15 },
      { id: "trzm-tur-agn-02", code: "ACN-EGE", name: "Örnek Ege Gezi & Incoming Acentası", partnerCompanyId: null, contactPerson: "Murat Seçkin", commissionRatePct: 15, defaultQuotaPerTour: 10, settlementTermDays: 30 },
      { id: "trzm-tur-agn-03", code: "ACN-KRP", name: "Örnek Kurumsal Etkinlik & MICE A.Ş.", partnerCompanyId: null, contactPerson: "Seda Gündüz", commissionRatePct: 10, defaultQuotaPerTour: 20, settlementTermDays: 15 },
      { id: "trzm-tur-agn-04", code: "ACN-ONL", name: "Örnek GeziPort Online Portalı", partnerCompanyId: null, contactPerson: "Operasyon Ekibi", commissionRatePct: 8, defaultQuotaPerTour: 15, settlementTermDays: 7 },
    ]
    for (const ag of agencies) {
      add("turizmTourAgency", {
        ...ag,
        phone: "+90 212 555 44 00",
        email: `${ag.code.toLowerCase()}@ornek-acenta.example`,
        status: "ACTIVE",
        notes: "Ayarlanabilir acenta komisyon ve kontenjan sözleşmesi (demo).",
        ownerCompanyId: MAIN_COMPANY_ID,
        createdAt: now,
        updatedAt: now,
      })
    }

    // ── 4. DİNAMİK KOLTUK ŞEMALARI (4 Araç Tipi) ──────────────────────────────
    const layouts = [
      { id: "trzm-tur-lay-bus45", code: "OTOBUS_45", name: "Turizm Otobüsü 2+2 (45+1)", vehicleCategory: "OTOBUS", totalSeats: 45, rowsCount: 12, seatsPerRow: 4, aisleAfterCol: 2 },
      { id: "trzm-tur-lay-mid27", code: "MIDIBUS_27", name: "Midibüs 2+2 (27+1)", vehicleCategory: "MIDIBUS", totalSeats: 27, rowsCount: 7, seatsPerRow: 4, aisleAfterCol: 2 },
      { id: "trzm-tur-lay-min16", code: "MINIBUS_16", name: "Minibüs / Sprinter 2+1 (16+1)", vehicleCategory: "MINIBUS", totalSeats: 16, rowsCount: 6, seatsPerRow: 3, aisleAfterCol: 2 },
      { id: "trzm-tur-lay-vip8", code: "VIP_8", name: "VIP Executive Vito (8+1)", vehicleCategory: "VIP_VAN", totalSeats: 8, rowsCount: 3, seatsPerRow: 3, aisleAfterCol: 2 },
    ]
    for (const lay of layouts) {
      add("turizmTourSeatLayout", {
        ...lay,
        seatMapJson: JSON.stringify(buildSeatSlotsFromLayout(lay)),
        enforceGenderRuleDefault: true,
        allowFamilyAdjacentDefault: true,
        isActive: true,
        ownerCompanyId: MAIN_COMPANY_ID,
        createdAt: now,
        updatedAt: now,
      })
    }

    // ── 5. TUR FİLOSU EK ARAÇLARI (Mevcut f5-veh-11 Crafter'a ek 3 Tur Aracı) ─
    const tourVehicles = [
      { id: "trzm-tur-veh-bus1", code: "TUR-451", plate: "34 TUR 451", brand: "Mercedes-Benz", model: "Travego 15 SHD (45+1)", vehicleType: "BUS", seatCount: 45, status: "ACTIVE", ownerCompanyId: MAIN_COMPANY_ID },
      { id: "trzm-tur-veh-mid1", code: "TUR-272", plate: "34 TUR 272", brand: "Isuzu", model: "Novo Lux Turizm Midibüs (27+1)", vehicleType: "MIDIBUS", seatCount: 27, status: "ACTIVE", ownerCompanyId: MAIN_COMPANY_ID },
      { id: "trzm-tur-veh-min1", code: "TUR-163", plate: "34 TUR 163", brand: "Mercedes-Benz", model: "Sprinter Turizm Paket (16+1)", vehicleType: "MINIBUS", seatCount: 16, status: "ACTIVE", ownerCompanyId: MAIN_COMPANY_ID },
      { id: "trzm-tur-veh-prt1", code: "PRT-274", plate: "35 TUR 274", brand: "Otokar", model: "Sultan Mega (27+1)", vehicleType: "MIDIBUS", seatCount: 27, status: "ACTIVE", ownerCompanyId: "trzm-comp-tur-02" },
    ]
    for (const tv of tourVehicles) {
      add("lojistikVehicle", {
        id: tv.id,
        code: tv.code,
        plate: tv.plate,
        vin: `WDB906000${tv.code.replace("-", "")}99`,
        brand: tv.brand,
        model: tv.model,
        modelYear: 2025,
        vehicleType: tv.vehicleType,
        fuelType: "DIESEL",
        ownershipType: "OWNED",
        branchId: defaultBranchId,
        status: tv.status,
        isRentalPool: false,
        seatCount: tv.seatCount,
        odometerKm: 42500,
        expectedLPer100Km: tv.vehicleType === "BUS" ? 26 : 14,
        tankCapacityLiters: tv.vehicleType === "BUS" ? 480 : 120,
        monthlyDepreciationTry: 35000,
        ownerCompanyId: tv.ownerCompanyId,
        isActive: true,
        createdAt: now,
        updatedAt: now,
      })
    }

    // ── 6. 12 KURGUSAL TUR (Günübirlik + Konaklamalı + Faz 3 Otel Bağlantılı + Farklı Durumlar) ──
    const toursSeed = [
      {
        id: "trzm-tur-pkg-01",
        code: "TUR-2026-01",
        title: "Ege Kıyı & Butik Otel 3 Günlük Kültür Turu",
        destinationCity: "Bodrum / Muğla",
        departureCity: "İstanbul",
        tourType: "MULTI_DAY",
        durationDays: 3,
        startAt: "2026-11-26T06:30:00.000Z",
        endAt: "2026-11-29T21:00:00.000Z",
        adultPriceTry: 12900,
        childPriceTry: 8900,
        capacity: 27,
        minParticipants: 10,
        status: "GUARANTEED",
        vehicleId: "trzm-tur-veh-mid1",
        driverId: "f5-drv-04",
        guideId: "trzm-tur-gd-01",
        seatLayoutId: "trzm-tur-lay-mid27",
        hotelAllotmentId: "trzm-otl-allot-01",
        hotelRoomIds: ["trzm-otl-rm-103", "trzm-otl-rm-108", "trzm-otl-rm-203", "trzm-otl-rm-208"],
        hotelNightlyCostPerRoomTry: 2950,
        estimatedDistanceKm: 715.4,
        estimatedDurationMinutes: 540,
        itinerary: [
          { day: 1, time: "06:30", location: "İstanbul Kadıköy / Bakırköy", activity: "Biniş noktalarından hareket ve kahvaltı molası" },
          { day: 1, time: "15:00", location: "Sunum Örnek Sahil Oteli (Faz 3)", activity: "Grup Check-In, KBS kimlik bildirimi ve serbest zaman" },
          { day: 2, time: "09:30", location: "Antik Kıyı & Kale Gezisi", activity: "Rehberli kültür turu ve yerel öğle yemeği" },
          { day: 3, time: "12:00", location: "Otel Check-Out & Dönüş", activity: "Yöresel alışveriş durağı sonrası İstanbul'a dönüş" },
        ],
        stops: [
          { seq: 1, name: "Bakırköy İncirli Metro", district: "Bakırköy", time: "06:30", lat: 40.9964, lng: 28.8745 },
          { seq: 2, name: "Mecidiyeköy Meydan", district: "Şişli", time: "07:00", lat: 41.0662, lng: 28.9949 },
          { seq: 3, name: "Kadıköy Evlendirme Dairesi", district: "Kadıköy", time: "07:35", lat: 40.9906, lng: 29.0357 },
          { seq: 4, name: "Bursa Feribot / Otoyol Tesisi", district: "Osmangazi", time: "09:45", lat: 40.2669, lng: 29.0634 },
        ],
      },
      {
        id: "trzm-tur-pkg-02",
        code: "TUR-2026-02",
        title: "Sapanca Gölü & Maşukiye Günübirlik Doğa Turu",
        destinationCity: "Sapanca / Sakarya",
        departureCity: "İstanbul",
        tourType: "DAY_TRIP",
        durationDays: 1,
        startAt: "2026-11-24T07:00:00.000Z",
        endAt: "2026-11-24T20:30:00.000Z",
        adultPriceTry: 1950,
        childPriceTry: 1350,
        capacity: 16,
        minParticipants: 10,
        status: "FULL",
        vehicleId: "trzm-tur-veh-min1",
        driverId: "f5-drv-06",
        guideId: "trzm-tur-gd-02",
        seatLayoutId: "trzm-tur-lay-min16",
        estimatedDistanceKm: 148.2,
        estimatedDurationMinutes: 135,
        itinerary: [
          { day: 1, time: "07:00", location: "İstanbul Biniş Noktaları", activity: "Hareket ve araç içi ikram" },
          { day: 1, time: "10:00", location: "Maşukiye Şelale", activity: "Doğa yürüyüşü ve köy kahvaltısı" },
          { day: 1, time: "14:00", location: "Sapanca Göl Kıyısı", activity: "Serbest zaman ve fotoğraf molası" },
        ],
        stops: [
          { seq: 1, name: "Mecidiyeköy Meydan", district: "Şişli", time: "07:00", lat: 41.0662, lng: 28.9949 },
          { seq: 2, name: "Kadıköy Evlendirme Dairesi", district: "Kadıköy", time: "07:30", lat: 40.9906, lng: 29.0357 },
          { seq: 3, name: "Kartal Köprüsü", district: "Kartal", time: "08:00", lat: 40.9061, lng: 29.1888 },
          { seq: 4, name: "Maşukiye Doğa Parkı", district: "Kartepe", time: "09:45", lat: 40.7016, lng: 30.1371 },
        ],
      },
      {
        id: "trzm-tur-pkg-03",
        code: "TUR-2026-03",
        title: "Bursa Uludağ & Cumalıkızık Günübirlik Turu",
        destinationCity: "Bursa",
        departureCity: "İstanbul",
        tourType: "DAY_TRIP",
        durationDays: 1,
        startAt: "2026-11-24T06:45:00.000Z",
        endAt: "2026-11-24T21:30:00.000Z",
        adultPriceTry: 2450,
        childPriceTry: 1750,
        capacity: 45,
        minParticipants: 20,
        status: "GUARANTEED",
        vehicleId: "trzm-tur-veh-bus1",
        driverId: "f5-drv-08",
        guideId: "trzm-tur-gd-01",
        seatLayoutId: "trzm-tur-lay-bus45",
        estimatedDistanceKm: 185.6,
        estimatedDurationMinutes: 170,
        itinerary: [
          { day: 1, time: "06:45", location: "İstanbul", activity: "Hareket ve Osmangazi Köprüsü geçişi" },
          { day: 1, time: "10:15", location: "Cumalıkızık Tarihi Köyü", activity: "Rehberli yürüyüş ve yöresel kahvaltı" },
          { day: 1, time: "13:30", location: "Uludağ Teleferik & Zirve", activity: "Panoramik gezi ve öğle yemeği" },
        ],
        stops: [
          { seq: 1, name: "Bakırköy İncirli", district: "Bakırköy", time: "06:45", lat: 40.9964, lng: 28.8745 },
          { seq: 2, name: "Kadıköy Evlendirme", district: "Kadıköy", time: "07:20", lat: 40.9906, lng: 29.0357 },
          { seq: 3, name: "Gebze Center", district: "Gebze", time: "08:05", lat: 40.8027, lng: 29.4307 },
          { seq: 4, name: "Cumalıkızık Meydan", district: "Yıldırım", time: "10:15", lat: 40.1763, lng: 29.1726 },
        ],
      },
      {
        id: "trzm-tur-pkg-04",
        code: "TUR-2026-04",
        title: "Kapadokya Vadiler & Balon İzleme 3 Günlük Turu",
        destinationCity: "Nevşehir / Ürgüp",
        departureCity: "İstanbul",
        tourType: "MULTI_DAY",
        durationDays: 3,
        startAt: "2026-11-27T21:00:00.000Z",
        endAt: "2026-11-30T22:00:00.000Z",
        adultPriceTry: 11400,
        childPriceTry: 7900,
        capacity: 45,
        minParticipants: 18,
        status: "ON_SALE",
        vehicleId: "trzm-tur-veh-bus1",
        driverId: "f5-drv-09",
        guideId: "trzm-tur-gd-03",
        seatLayoutId: "trzm-tur-lay-bus45",
        estimatedDistanceKm: 745.0,
        estimatedDurationMinutes: 560,
        itinerary: [
          { day: 1, time: "08:00", location: "Göreme & Uçhisar", activity: "Açık Hava Müzesi ve vadi panoraması" },
          { day: 2, time: "06:00", location: "Aşk Vadisi", activity: "Gündoğumu balon izleme, Avanos çömlek atölyesi" },
          { day: 3, time: "10:00", location: "Derinkuyu Yeraltı Şehri", activity: "Gezi sonrası dönüş yolculuğu" },
        ],
        stops: [
          { seq: 1, name: "Kadıköy Evlendirme", district: "Kadıköy", time: "21:00", lat: 40.9906, lng: 29.0357 },
          { seq: 2, name: "Ankara AŞTİ Önü", district: "Çankaya", time: "02:30", lat: 39.9182, lng: 32.8131 },
          { seq: 3, name: "Ürgüp Meydan", district: "Ürgüp", time: "07:30", lat: 38.6311, lng: 34.9122 },
        ],
      },
      {
        id: "trzm-tur-pkg-05",
        code: "TUR-2026-05",
        title: "Abant & Yedigöller Sonbahar Fotoğraf Turu",
        destinationCity: "Bolu",
        departureCity: "İstanbul",
        tourType: "DAY_TRIP",
        durationDays: 1,
        startAt: "2026-11-28T06:30:00.000Z",
        endAt: "2026-11-28T21:30:00.000Z",
        adultPriceTry: 2350,
        childPriceTry: 1650,
        capacity: 27,
        minParticipants: 12,
        status: "GUARANTEED",
        vehicleId: "f5-veh-11",
        driverId: "f5-drv-11",
        guideId: "trzm-tur-gd-02",
        seatLayoutId: "trzm-tur-lay-mid27",
        estimatedDistanceKm: 282.4,
        estimatedDurationMinutes: 230,
        itinerary: [
          { day: 1, time: "10:30", location: "Abant Gölü Tabiat Parkı", activity: "Göl çevresi yürüyüşü" },
          { day: 1, time: "14:00", location: "Yedigöller Milli Parkı", activity: "Sonbahar yaprak fotoğraf yürüyüşü" },
        ],
        stops: [
          { seq: 1, name: "Mecidiyeköy", district: "Şişli", time: "06:30", lat: 41.0662, lng: 28.9949 },
          { seq: 2, name: "Kadıköy", district: "Kadıköy", time: "07:00", lat: 40.9906, lng: 29.0357 },
          { seq: 3, name: "Abant Göl Girişi", district: "Bolu", time: "10:30", lat: 40.6061, lng: 31.2782 },
        ],
      },
      {
        id: "trzm-tur-pkg-06",
        code: "TUR-2026-06",
        title: "Eskişehir Odunpazarı & Sazova Ekspres Turu",
        destinationCity: "Eskişehir",
        departureCity: "İstanbul",
        tourType: "DAY_TRIP",
        durationDays: 1,
        startAt: "2026-11-29T07:00:00.000Z",
        endAt: "2026-11-29T22:00:00.000Z",
        adultPriceTry: 2200,
        childPriceTry: 1550,
        capacity: 27,
        minParticipants: 14,
        status: "ON_SALE",
        vehicleId: "trzm-tur-veh-min1",
        driverId: "f5-drv-10",
        guideId: "trzm-tur-gd-03",
        seatLayoutId: "trzm-tur-lay-mid27",
        estimatedDistanceKm: 312.0,
        estimatedDurationMinutes: 245,
        itinerary: [
          { day: 1, time: "11:00", location: "Odunpazarı Evleri & OMM", activity: "Müze gezisi ve çibörek öğle molası" },
          { day: 1, time: "15:00", location: "Porsuk Çayı & Sazova Parkı", activity: "Gondol turu ve serbest zaman" },
        ],
        stops: [
          { seq: 1, name: "Kadıköy Evlendirme", district: "Kadıköy", time: "07:00", lat: 40.9906, lng: 29.0357 },
          { seq: 2, name: "Odunpazarı Meydan", district: "Odunpazarı", time: "11:00", lat: 39.7647, lng: 30.5256 },
        ],
      },
      {
        id: "trzm-tur-pkg-07",
        code: "TUR-2026-07",
        title: "İstanbul Boğaz & Tarihi Yarımada VIP Özel Turu",
        destinationCity: "İstanbul",
        departureCity: "İstanbul",
        tourType: "DAY_TRIP",
        durationDays: 1,
        startAt: "2026-11-25T09:00:00.000Z",
        endAt: "2026-11-25T18:30:00.000Z",
        adultPriceTry: 5400,
        childPriceTry: 3800,
        capacity: 8,
        minParticipants: 4,
        status: "GUARANTEED",
        vehicleId: "trzm-rnt-veh-07",
        driverId: "f5-drv-12",
        guideId: "trzm-tur-gd-01",
        seatLayoutId: "trzm-tur-lay-vip8",
        estimatedDistanceKm: 46.5,
        estimatedDurationMinutes: 95,
        itinerary: [
          { day: 1, time: "09:30", location: "Sultanahmet & Topkapı", activity: "Özel rehberli müze turu" },
          { day: 1, time: "14:30", location: "Bebek – Boğaz Tekne", activity: "Özel tekne ile Boğaz turu" },
        ],
        stops: [
          { seq: 1, name: "Levent Merkez Otel Alımı", district: "Beşiktaş", time: "09:00", lat: 41.0785, lng: 29.0112 },
          { seq: 2, name: "Sultanahmet Meydanı", district: "Fatih", time: "09:40", lat: 41.0054, lng: 28.9768 },
          { seq: 3, name: "Bebek İskelesi", district: "Beşiktaş", time: "14:30", lat: 41.0766, lng: 29.0434 },
        ],
      },
      {
        id: "trzm-tur-pkg-08",
        code: "TUR-2026-08",
        title: "Safranbolu & Amasra 2 Günlük Miras Turu",
        destinationCity: "Karabük / Bartın",
        departureCity: "İstanbul",
        tourType: "MULTI_DAY",
        durationDays: 2,
        startAt: "2026-11-14T06:30:00.000Z",
        endAt: "2026-11-15T22:00:00.000Z",
        adultPriceTry: 6900,
        childPriceTry: 4900,
        capacity: 45,
        minParticipants: 20,
        status: "COMPLETED",
        vehicleId: "trzm-tur-veh-bus1",
        driverId: "f5-drv-04",
        guideId: "trzm-tur-gd-01",
        seatLayoutId: "trzm-tur-lay-bus45",
        estimatedDistanceKm: 435.0,
        estimatedDurationMinutes: 350,
        itinerary: [
          { day: 1, time: "12:00", location: "Safranbolu Eski Çarşı", activity: "Konaklar, Kristal Teras ve akşam yemeği" },
          { day: 2, time: "10:00", location: "Amasra Kalesi & Liman", activity: "Amasra salatası ve dönüş" },
        ],
        stops: [
          { seq: 1, name: "Kadıköy Evlendirme", district: "Kadıköy", time: "06:30", lat: 40.9906, lng: 29.0357 },
          { seq: 2, name: "Safranbolu Tarihi Çarşı", district: "Safranbolu", time: "12:00", lat: 41.2464, lng: 32.6942 },
        ],
      },
      {
        id: "trzm-tur-pkg-09",
        code: "TUR-2026-09",
        title: "Şile Feneri & Ağva Göksu Tekne Günübirlik Turu",
        destinationCity: "Şile / Ağva",
        departureCity: "İstanbul",
        tourType: "DAY_TRIP",
        durationDays: 1,
        startAt: "2026-11-18T08:00:00.000Z",
        endAt: "2026-11-18T19:30:00.000Z",
        adultPriceTry: 1750,
        childPriceTry: 1200,
        capacity: 27,
        minParticipants: 12,
        status: "COMPLETED",
        vehicleId: "trzm-tur-veh-mid1",
        driverId: "f5-drv-06",
        guideId: "trzm-tur-gd-02",
        seatLayoutId: "trzm-tur-lay-mid27",
        estimatedDistanceKm: 112.0,
        estimatedDurationMinutes: 115,
        itinerary: [
          { day: 1, time: "10:00", location: "Şile Feneri & Saklıgöl", activity: "Kahvaltı ve manzara molası" },
          { day: 1, time: "13:30", location: "Ağva Göksu Deresi", activity: "Tekne gezisi ve akşam dönüş" },
        ],
        stops: [
          { seq: 1, name: "Kadıköy Evlendirme", district: "Kadıköy", time: "08:00", lat: 40.9906, lng: 29.0357 },
          { seq: 2, name: "Ağva Göksu İskelesi", district: "Şile", time: "10:15", lat: 41.1328, lng: 29.8453 },
        ],
      },
      {
        id: "trzm-tur-pkg-10",
        code: "TUR-2026-10",
        title: "Batı Karadeniz Yaylalar & Kanyonlar 2 Günlük Turu",
        destinationCity: "Kastamonu / Pınarbaşı",
        departureCity: "İstanbul",
        tourType: "MULTI_DAY",
        durationDays: 2,
        startAt: "2026-11-21T06:00:00.000Z",
        endAt: "2026-11-22T22:00:00.000Z",
        adultPriceTry: 7200,
        childPriceTry: 5100,
        capacity: 27,
        minParticipants: 15,
        status: "CANCELLED",
        vehicleId: null,
        driverId: null,
        guideId: null,
        seatLayoutId: "trzm-tur-lay-mid27",
        estimatedDistanceKm: 495.0,
        estimatedDurationMinutes: 410,
        notes: "Olumsuz hava uyarısı ve minimum katılım altı nedeniyle iptal edildi.",
        itinerary: [],
        stops: [],
      },
      {
        id: "trzm-tur-pkg-11",
        code: "TUR-2026-11",
        title: "İznik Çini Atölyesi & Göl Kıyısı Gastronomi Turu",
        destinationCity: "İznik / Bursa",
        departureCity: "İstanbul",
        tourType: "DAY_TRIP",
        durationDays: 1,
        startAt: "2026-12-06T07:30:00.000Z",
        endAt: "2026-12-06T20:00:00.000Z",
        adultPriceTry: 2150,
        childPriceTry: 1450,
        capacity: 16,
        minParticipants: 8,
        status: "DRAFT",
        vehicleId: "trzm-tur-veh-min1",
        driverId: "f5-drv-10",
        guideId: "trzm-tur-gd-02",
        seatLayoutId: "trzm-tur-lay-min16",
        estimatedDistanceKm: 158.0,
        estimatedDurationMinutes: 145,
        itinerary: [
          { day: 1, time: "10:30", location: "İznik Çini Vakfı", activity: "Geleneksel çini atölyesi ziyareti" },
        ],
        stops: [
          { seq: 1, name: "Kadıköy Evlendirme", district: "Kadıköy", time: "07:30", lat: 40.9906, lng: 29.0357 },
          { seq: 2, name: "İznik Göl Kıyısı", district: "İznik", time: "10:00", lat: 40.4286, lng: 29.7211 },
        ],
      },
      {
        id: "trzm-tur-pkg-12",
        code: "PRT-TUR-2026-01",
        title: "Efes Antik Kenti & Şirince 2 Günlük Özel Tur (Partner)",
        destinationCity: "Selçuk / İzmir",
        departureCity: "İzmir",
        tourType: "MULTI_DAY",
        durationDays: 2,
        startAt: "2026-11-27T08:00:00.000Z",
        endAt: "2026-11-28T19:00:00.000Z",
        adultPriceTry: 6400,
        childPriceTry: 4400,
        capacity: 27,
        minParticipants: 10,
        status: "GUARANTEED",
        vehicleId: "trzm-tur-veh-prt1",
        driverId: "f5-drv-06",
        guideId: "trzm-tur-gd-04",
        seatLayoutId: "trzm-tur-lay-mid27",
        estimatedDistanceKm: 92.4,
        estimatedDurationMinutes: 85,
        ownerCompanyId: "trzm-comp-tur-02",
        itinerary: [
          { day: 1, time: "09:30", location: "Efes Antik Kenti", activity: "Celsus Kütüphanesi ve Antik Tiyatro" },
          { day: 2, time: "11:00", location: "Şirince Köyü", activity: "Yöresel bağ ve taş sokak yürüyüşü" },
        ],
        stops: [
          { seq: 1, name: "İzmir Alsancak Gar", district: "Konak", time: "08:00", lat: 38.4392, lng: 27.1478 },
          { seq: 2, name: "Efes Alt Kapı", district: "Selçuk", time: "09:15", lat: 37.9409, lng: 27.3414 },
        ],
      },
    ]

    for (const t of toursSeed) {
      const ownerId = (t as any).ownerCompanyId || MAIN_COMPANY_ID
      add("turizmTourPackage", {
        id: t.id,
        code: t.code,
        title: t.title,
        destinationCity: t.destinationCity,
        departureCity: t.departureCity,
        tourType: t.tourType,
        durationDays: t.durationDays,
        startAt: t.startAt,
        endAt: t.endAt,
        itineraryJson: JSON.stringify(t.itinerary || []),
        adultPriceTry: t.adultPriceTry,
        childPriceTry: t.childPriceTry,
        capacity: t.capacity,
        minParticipants: t.minParticipants,
        status: t.status,
        branchId: defaultBranchId,
        vehicleId: t.vehicleId,
        driverId: t.driverId,
        guideId: t.guideId,
        seatLayoutId: t.seatLayoutId,
        hotelAllotmentId: (t as any).hotelAllotmentId || null,
        hotelRoomIdsJson: (t as any).hotelRoomIds ? JSON.stringify((t as any).hotelRoomIds) : null,
        hotelNightlyCostPerRoomTry: (t as any).hotelNightlyCostPerRoomTry || 0,
        agencyQuotasJson: JSON.stringify([
          { agencyId: "trzm-tur-agn-01", quotaSeats: 10 },
          { agencyId: "trzm-tur-agn-02", quotaSeats: 8 },
        ]),
        enforceGenderSeatRule: true,
        allowFamilySeatOverride: true,
        estimatedDistanceKm: t.estimatedDistanceKm,
        estimatedDurationMinutes: t.estimatedDurationMinutes,
        notes: (t as any).notes || null,
        ownerCompanyId: ownerId,
        createdBy: "turizm-faz4-seed",
        createdAt: now,
        updatedAt: now,
      })

      for (const st of t.stops || []) {
        add("turizmTourPickupStop", {
          id: `${t.id}-stp-${st.seq}`,
          tourId: t.id,
          sequenceNo: st.seq,
          stopName: st.name,
          district: st.district,
          address: `${st.name}, ${st.district}`,
          pickupTime: st.time,
          lat: st.lat,
          lng: st.lng,
          estimatedMinutesFromStart: (st.seq - 1) * 35,
          ownerCompanyId: ownerId,
          createdAt: now,
        })
      }
    }

    // ── 7. YOLCU REZERVASYONLARI, KOLTUKLAR, KISMİ ÖDEMELER & FAZ 3 OTEL/KBS BAĞLANTISI ──
    const bookingsSeed = [
      // TUR-2026-01 (Konaklamalı + Faz 3 Otel & KBS bağlı)
      {
        id: "trzm-tur-bkg-01", bookingNo: "TRZ-2026-4001", tourId: "trzm-tur-pkg-01", customerId: "trzm-otl-cust-01",
        bookingType: "GROUP", groupName: "Özdemir Ailesi Grubu", agencyId: "trzm-tur-agn-01", agencyName: "Örnek Anadolu Keşif Turizm Ltd.",
        commissionRate: 12, channelSource: "AGENCY_B2B", totalPriceTry: 51600, paidAmountTry: 30000, status: "CONFIRMED",
        passengers: [
          { fullName: "Kaan Özdemir", tckn: "21948576310", gender: "M", fam: "FAM-OZ", seat: "1", stop: "trzm-tur-pkg-01-stp-1", room: "trzm-otl-rm-103", kbs: "trzm-tur-kbs-01" },
          { fullName: "Selin Özdemir", tckn: "21948576312", gender: "F", fam: "FAM-OZ", seat: "2", stop: "trzm-tur-pkg-01-stp-1", room: "trzm-otl-rm-103", kbs: "trzm-tur-kbs-01" },
          { fullName: "Hakan Özdemir", tckn: "21948576314", gender: "M", fam: "FAM-OZ", seat: "3", stop: "trzm-tur-pkg-01-stp-2", room: "trzm-otl-rm-108", kbs: "trzm-tur-kbs-02" },
          { fullName: "Dilek Özdemir", tckn: "21948576316", gender: "F", fam: "FAM-OZ", seat: "4", stop: "trzm-tur-pkg-01-stp-2", room: "trzm-otl-rm-108", kbs: "trzm-tur-kbs-02" },
        ],
      },
      {
        id: "trzm-tur-bkg-02", bookingNo: "TRZ-2026-4002", tourId: "trzm-tur-pkg-01", customerId: "trzm-otl-cust-03",
        bookingType: "GROUP", groupName: "Avrupa Kültür Grubu (8 Kişi)", agencyId: "trzm-tur-agn-02", agencyName: "Örnek Ege Gezi & Incoming Acentası",
        commissionRate: 15, channelSource: "AGENCY_B2B", totalPriceTry: 103200, paidAmountTry: 103200, status: "CONFIRMED",
        passengers: [
          { fullName: "Lukas Weber", passportNo: "C01X88421", nat: "DE", gender: "M", fam: "GRP-EU", seat: "5", stop: "trzm-tur-pkg-01-stp-2", room: "trzm-otl-rm-203" },
          { fullName: "Anna Weber", passportNo: "C01X88422", nat: "DE", gender: "F", fam: "GRP-EU", seat: "6", stop: "trzm-tur-pkg-01-stp-2", room: "trzm-otl-rm-203" },
          { fullName: "Sophie Laurent", passportNo: "19FR77210", nat: "FR", gender: "F", fam: "GRP-EU2", seat: "7", stop: "trzm-tur-pkg-01-stp-3", room: "trzm-otl-rm-208" },
          { fullName: "Claire Moreau", passportNo: "19FR77215", nat: "FR", gender: "F", fam: "GRP-EU2", seat: "8", stop: "trzm-tur-pkg-01-stp-3", room: "trzm-otl-rm-208" },
          { fullName: "Bram van Dijk", passportNo: "NL8831042", nat: "NL", gender: "M", fam: "GRP-EU3", seat: "9", stop: "trzm-tur-pkg-01-stp-3" },
          { fullName: "Eva van Dijk", passportNo: "NL8831043", nat: "NL", gender: "F", fam: "GRP-EU3", seat: "10", stop: "trzm-tur-pkg-01-stp-3" },
          { fullName: "Oliver Bennett", passportNo: "54GB99102", nat: "GB", gender: "M", fam: null, seat: "11", stop: "trzm-tur-pkg-01-stp-3" },
          { fullName: "Mark Taylor", passportNo: "54GB99199", nat: "GB", gender: "M", fam: null, seat: "12", stop: "trzm-tur-pkg-01-stp-3" },
        ],
      },
      // TUR-2026-02 (Sapanca — 16/16 FULL)
      {
        id: "trzm-tur-bkg-03", bookingNo: "TRZ-2026-4003", tourId: "trzm-tur-pkg-02", customerId: "trzm-otl-cust-07",
        bookingType: "GROUP", groupName: "Anadolu Sağlık Kurumsal Ekip (16 Kişi)", agencyId: "trzm-tur-agn-03", agencyName: "Örnek Kurumsal Etkinlik & MICE A.Ş.",
        commissionRate: 10, channelSource: "CORPORATE", totalPriceTry: 31200, paidAmountTry: 31200, status: "CONFIRMED",
        passengers: Array.from({ length: 16 }, (_, i) => ({
          fullName: `Kurumsal Katılımcı ${i + 1}`,
          tckn: `451029384${String(10 + i)}`,
          gender: i % 2 === 0 ? "F" : "M",
          fam: "CORP-ASG",
          seat: String(i + 1),
          stop: i < 8 ? "trzm-tur-pkg-02-stp-1" : "trzm-tur-pkg-02-stp-2",
          boarding: i < 12 ? "BOARDED" : "WAITING",
        })),
      },
      // TUR-2026-03 (Bursa — 39/45 GUARANTEED & Dolmak Üzere)
      {
        id: "trzm-tur-bkg-04", bookingNo: "TRZ-2026-4004", tourId: "trzm-tur-pkg-03", customerId: "trzm-otl-cust-02",
        bookingType: "GROUP", groupName: "Mimarlık Kulübü Gezisi (24 Kişi)", agencyId: "trzm-tur-agn-01", agencyName: "Örnek Anadolu Keşif Turizm Ltd.",
        commissionRate: 12, channelSource: "AGENCY_B2B", totalPriceTry: 58800, paidAmountTry: 40000, status: "CONFIRMED",
        passengers: Array.from({ length: 24 }, (_, i) => ({
          fullName: `Mimarlık Grubu Yolcusu ${i + 1}`,
          tckn: `348192047${String(10 + i)}`,
          gender: i % 2 === 0 ? "F" : "M",
          fam: "GRP-MIM",
          seat: String(i + 1),
          stop: i < 12 ? "trzm-tur-pkg-03-stp-1" : "trzm-tur-pkg-03-stp-2",
          boarding: i < 10 ? "BOARDED" : "WAITING",
        })),
      },
      {
        id: "trzm-tur-bkg-05", bookingNo: "TRZ-2026-4005", tourId: "trzm-tur-pkg-03", customerId: "trzm-otl-cust-08",
        bookingType: "GROUP", groupName: "GeziPort Bireysel Karma (15 Kişi)", agencyId: "trzm-tur-agn-04", agencyName: "Örnek GeziPort Online Portalı",
        commissionRate: 8, channelSource: "ONLINE_PORTAL", totalPriceTry: 36750, paidAmountTry: 36750, status: "CONFIRMED",
        passengers: Array.from({ length: 15 }, (_, i) => ({
          fullName: `Online Katılımcı ${i + 1}`,
          tckn: `562910482${String(20 + i)}`,
          gender: i % 3 === 0 ? "F" : "M",
          fam: "GRP-ONL",
          seat: String(25 + i),
          stop: "trzm-tur-pkg-03-stp-2",
        })),
      },
      // TUR-2026-04 (Kapadokya — 7/45 ON_SALE Min. Katılım Altında!)
      {
        id: "trzm-tur-bkg-06", bookingNo: "TRZ-2026-4006", tourId: "trzm-tur-pkg-04", customerId: "trzm-otl-cust-09",
        bookingType: "GROUP", groupName: "Fotoğraf Tutkunları (7 Kişi)", agencyId: null, agencyName: null,
        commissionRate: 0, channelSource: "DIRECT_WEB", totalPriceTry: 79800, paidAmountTry: 25000, status: "CONFIRMED",
        passengers: Array.from({ length: 7 }, (_, i) => ({
          fullName: `Kapadokya Yolcusu ${i + 1}`,
          passportNo: `US662019${String(40 + i)}`,
          nat: "US",
          gender: i % 2 === 0 ? "F" : "M",
          fam: "GRP-KAP",
          seat: String(i + 1),
          stop: "trzm-tur-pkg-04-stp-1",
        })),
      },
      // TUR-2026-05 (Abant — 15/27 GUARANTEED)
      {
        id: "trzm-tur-bkg-07", bookingNo: "TRZ-2026-4007", tourId: "trzm-tur-pkg-05", customerId: "trzm-otl-cust-01",
        bookingType: "GROUP", groupName: "Doğa Yürüyüş Kulübü (15 Kişi)", agencyId: "trzm-tur-agn-04", agencyName: "Örnek GeziPort Online Portalı",
        commissionRate: 8, channelSource: "ONLINE_PORTAL", totalPriceTry: 35250, paidAmountTry: 20000, status: "CONFIRMED",
        passengers: Array.from({ length: 15 }, (_, i) => ({
          fullName: `Doğa Kulübü Üyesi ${i + 1}`,
          tckn: `219485700${String(10 + i)}`,
          gender: i % 2 === 0 ? "M" : "F",
          fam: "GRP-DOG",
          seat: String(i + 1),
          stop: "trzm-tur-pkg-05-stp-2",
        })),
      },
      // TUR-2026-07 (VIP 6/8 GUARANTEED)
      {
        id: "trzm-tur-bkg-08", bookingNo: "TRZ-2026-4008", tourId: "trzm-tur-pkg-07", customerId: "trzm-otl-cust-05",
        bookingType: "GROUP", groupName: "VIP Yönetici Heyeti (6 Kişi)", agencyId: "trzm-tur-agn-03", agencyName: "Örnek Kurumsal Etkinlik & MICE A.Ş.",
        commissionRate: 10, channelSource: "CORPORATE", totalPriceTry: 32400, paidAmountTry: 32400, status: "CONFIRMED",
        passengers: Array.from({ length: 6 }, (_, i) => ({
          fullName: `VIP Misafir ${i + 1}`,
          passportNo: `54GB880${String(10 + i)}`,
          nat: "GB",
          gender: i % 2 === 0 ? "M" : "F",
          fam: "VIP-HEY",
          seat: String(i + 1),
          stop: "trzm-tur-pkg-07-stp-1",
        })),
      },
      // TUR-2026-08 (Safranbolu — COMPLETED, 38 yolcu — Kâr analizi verisi!)
      {
        id: "trzm-tur-bkg-09", bookingNo: "TRZ-2026-3901", tourId: "trzm-tur-pkg-08", customerId: "trzm-otl-cust-02",
        bookingType: "GROUP", groupName: "Safranbolu Miras Grubu (38 Kişi)", agencyId: "trzm-tur-agn-01", agencyName: "Örnek Anadolu Keşif Turizm Ltd.",
        commissionRate: 12, channelSource: "AGENCY_B2B", totalPriceTry: 262200, paidAmountTry: 262200, status: "CONFIRMED",
        passengers: Array.from({ length: 10 }, (_, i) => ({
          fullName: `Safranbolu Yolcusu ${i + 1}`,
          tckn: `348192000${String(10 + i)}`,
          gender: i % 2 === 0 ? "F" : "M",
          fam: "GRP-SAF",
          seat: String(i + 1),
          stop: "trzm-tur-pkg-08-stp-1",
          boarding: "BOARDED",
        })),
        overridePassengerCount: 38,
      },
      // TUR-2026-09 (Şile/Ağva — COMPLETED, 24 yolcu — Kâr analizi verisi!)
      {
        id: "trzm-tur-bkg-10", bookingNo: "TRZ-2026-3902", tourId: "trzm-tur-pkg-09", customerId: "trzm-otl-cust-08",
        bookingType: "GROUP", groupName: "Ağva Hafta Sonu Grubu (24 Kişi)", agencyId: "trzm-tur-agn-04", agencyName: "Örnek GeziPort Online Portalı",
        commissionRate: 8, channelSource: "ONLINE_PORTAL", totalPriceTry: 42000, paidAmountTry: 42000, status: "CONFIRMED",
        passengers: Array.from({ length: 6 }, (_, i) => ({
          fullName: `Ağva Yolcusu ${i + 1}`,
          tckn: `562910000${String(10 + i)}`,
          gender: i % 2 === 0 ? "M" : "F",
          fam: "GRP-AGV",
          seat: String(i + 1),
          stop: "trzm-tur-pkg-09-stp-1",
          boarding: "BOARDED",
        })),
        overridePassengerCount: 24,
      },
      // İptal edilmiş örnek rezervasyon (iptal oranı raporu için)
      {
        id: "trzm-tur-bkg-11", bookingNo: "TRZ-2026-4009", tourId: "trzm-tur-pkg-06", customerId: "trzm-otl-cust-08",
        bookingType: "INDIVIDUAL", groupName: null, agencyId: null, agencyName: null,
        commissionRate: 0, channelSource: "DIRECT_WEB", totalPriceTry: 4400, paidAmountTry: 0, status: "CANCELLED",
        passengers: [
          { fullName: "Emre Çelik", tckn: "56291048234", gender: "M", fam: null, seat: null, stop: null },
          { fullName: "Canan Çelik", tckn: "56291048236", gender: "F", fam: null, seat: null, stop: null },
        ],
      },
      // Partner firma (trzm-comp-tur-02) izole rezervasyonu
      {
        id: "trzm-tur-bkg-12", bookingNo: "PRT-TRZ-2026-01", tourId: "trzm-tur-pkg-12", customerId: "trzm-otl-cust-04",
        bookingType: "GROUP", groupName: "Efes Partner Grubu (12 Kişi)", agencyId: null, agencyName: null,
        commissionRate: 0, channelSource: "DIRECT_OFFICE", totalPriceTry: 76800, paidAmountTry: 76800, status: "CONFIRMED",
        ownerCompanyId: "trzm-comp-tur-02",
        passengers: Array.from({ length: 6 }, (_, i) => ({
          fullName: `Efes Partner Misafiri ${i + 1}`,
          passportNo: `19FR880${String(10 + i)}`,
          nat: "FR",
          gender: i % 2 === 0 ? "F" : "M",
          fam: "PRT-EF",
          seat: String(i + 1),
          stop: "trzm-tur-pkg-12-stp-1",
        })),
        overridePassengerCount: 12,
      },
    ]

    for (const b of bookingsSeed) {
      const paxCount = (b as any).overridePassengerCount ?? b.passengers.length
      const commissionTry = computeAgencyCommission(b.totalPriceTry, b.commissionRate)
      const balanceDue = Number(Math.max(0, b.totalPriceTry - b.paidAmountTry).toFixed(2))
      const payStatus =
        b.status === "CANCELLED"
          ? "REFUNDED"
          : b.paidAmountTry <= 0
            ? "UNPAID"
            : balanceDue <= 0.01
              ? "PAID"
              : "PARTIAL"
      const ownerId = (b as any).ownerCompanyId || MAIN_COMPANY_ID

      add("turizmTourBooking", {
        id: b.id,
        bookingNo: b.bookingNo,
        tourId: b.tourId,
        customerId: b.customerId,
        branchId: defaultBranchId,
        bookingType: b.bookingType,
        groupName: b.groupName,
        agencyId: b.agencyId,
        agencyName: b.agencyName,
        channelSource: b.channelSource,
        passengerCount: paxCount,
        totalPriceTry: b.totalPriceTry,
        paidAmountTry: b.paidAmountTry,
        balanceDueTry: balanceDue,
        agencyCommissionRatePct: b.commissionRate,
        agencyCommissionTry: commissionTry,
        paymentStatus: payStatus,
        status: b.status,
        hotelReservationIdsJson: null,
        financeId: b.paidAmountTry > 0 ? `trzm-tur-fin-${b.id.slice(-2)}` : null,
        eDocumentId: null,
        eDocumentNo: payStatus === "PAID" ? `EAR2026${b.bookingNo.slice(-4)}` : null,
        cancelReason: b.status === "CANCELLED" ? "Yolcu tarih değişikliği talebi" : null,
        notes: null,
        ownerCompanyId: ownerId,
        createdBy: "turizm-faz4-seed",
        createdAt: now,
        updatedAt: now,
      })

      b.passengers.forEach((p: any, idx: number) => {
        add("turizmTourPassenger", {
          id: `${b.id}-pax-${idx + 1}`,
          bookingId: b.id,
          tourId: b.tourId,
          fullName: p.fullName,
          tckn: p.tckn || null,
          passportNo: p.passportNo || null,
          nationality: p.nat || "TR",
          birthDate: "1988-05-15T00:00:00.000Z",
          phone: `+90 532 555 ${String(40 + idx).padStart(2, "0")} ${String(10 + idx).padStart(2, "0")}`,
          gender: p.gender || "UNSPECIFIED",
          familyGroupCode: p.fam || null,
          seatNumber: p.seat || null,
          pickupStopId: p.stop || null,
          boardingStatus: p.boarding || "WAITING",
          boardedAt: p.boarding === "BOARDED" ? now : null,
          hotelRoomId: p.room || null,
          hotelReservationId: null,
          kbsRecordId: p.kbs || null,
          emergencyNote: null,
          offlineIdempotencyKey: null,
          ownerCompanyId: ownerId,
          createdAt: now,
          updatedAt: now,
        })
      })
    }

    // Konaklamalı TUR-2026-01 için Faz 3 KBS koleksiyonunda bağlı örnek hazırlık kayıtları
    add("turizmHotelKbsRecord", {
      id: "trzm-tur-kbs-01",
      kbsRefNo: "KBS-TUR-2026-01-103",
      reservationId: "trzm-otl-res-14",
      roomId: "trzm-otl-rm-103",
      roomNumber: "103",
      customerId: "trzm-otl-cust-01",
      notificationType: "MISAFIR_GIRIS",
      guestFullName: "Kaan Özdemir (TUR-2026-01 Grup)",
      guestTcknMasked: "21*******10",
      guestPassportMasked: null,
      guestNationality: "TR",
      guestBirthYear: 1986,
      checkInAt: "2026-11-26T14:00:00.000Z",
      expectedCheckOutAt: "2026-11-29T12:00:00.000Z",
      actualCheckOutAt: null,
      missingFieldsJson: JSON.stringify([]),
      isPayloadComplete: true,
      preparationStatus: "HAZIRLANDI",
      exportedFormat: null,
      lastExportedAt: null,
      retryCount: 0,
      lastErrorNote: null,
      preparedPayloadJson: JSON.stringify({ source: "TUR-2026-01" }),
      notes: "Konaklamalı tur (TUR-2026-01) için Faz 3 KBS hazırlık mekanizmasıyla üretildi.",
      ownerCompanyId: MAIN_COMPANY_ID,
      createdAt: now,
      updatedAt: now,
    })

    // ── 8. TUR GİDER KALEMLERİ (Maliyet-Kâr Analizi + Tamamlanan Turlar) ──────
    const expensesSeed = [
      // TUR-2026-01 (Konaklamalı — Otel + Rehber + Yakıt + Müze)
      { id: "trzm-tur-exp-01", tourId: "trzm-tur-pkg-01", category: "HOTEL_ACCOMMODATION", description: "Faz 3 Otel Grup Bloğu (6 Oda × 3 Gece HB)", quantity: 18, unitCostTry: 2950, sourceRefType: "HOTEL_PMS" },
      { id: "trzm-tur-exp-02", tourId: "trzm-tur-pkg-01", category: "VEHICLE_FUEL", description: "34 TUR 272 Midibüs Gidiş-Dönüş Yakıt (Filo)", quantity: 1, unitCostTry: 11800, sourceRefType: "FLEET_FUEL" },
      { id: "trzm-tur-exp-03", tourId: "trzm-tur-pkg-01", category: "GUIDE_FEE", description: "Kokartlı Rehber Kerem Aksoy (3 Gün)", quantity: 3, unitCostTry: 4200, sourceRefType: "GUIDE" },
      { id: "trzm-tur-exp-04", tourId: "trzm-tur-pkg-01", category: "MUSEUM_TICKET", description: "Antik Kıyı & Kale Müze Girişleri", quantity: 12, unitCostTry: 450, sourceRefType: "MANUAL" },

      // TUR-2026-02 (Sapanca FULL)
      { id: "trzm-tur-exp-05", tourId: "trzm-tur-pkg-02", category: "VEHICLE_FUEL", description: "34 TUR 163 Sprinter Yakıt & Otoyol", quantity: 1, unitCostTry: 3400, sourceRefType: "FLEET_FUEL" },
      { id: "trzm-tur-exp-06", tourId: "trzm-tur-pkg-02", category: "GUIDE_FEE", description: "Rehber Elif Karaca (1 Gün)", quantity: 1, unitCostTry: 3900, sourceRefType: "GUIDE" },
      { id: "trzm-tur-exp-07", tourId: "trzm-tur-pkg-02", category: "MEAL_CATERING", description: "Maşukiye Köy Kahvaltısı (16 Kişi)", quantity: 16, unitCostTry: 420, sourceRefType: "MANUAL" },

      // TUR-2026-03 (Bursa)
      { id: "trzm-tur-exp-08", tourId: "trzm-tur-pkg-03", category: "VEHICLE_FUEL", description: "34 TUR 451 Travego Otobüs Yakıt", quantity: 1, unitCostTry: 6900, sourceRefType: "FLEET_FUEL" },
      { id: "trzm-tur-exp-09", tourId: "trzm-tur-pkg-03", category: "HIGHWAY_TOLL", description: "Osmangazi Köprüsü & Otoyol Geçişi", quantity: 2, unitCostTry: 1450, sourceRefType: "MANUAL" },
      { id: "trzm-tur-exp-10", tourId: "trzm-tur-pkg-03", category: "MUSEUM_TICKET", description: "Uludağ Teleferik Grup Bileti (39 Kişi)", quantity: 39, unitCostTry: 550, sourceRefType: "MANUAL" },
      { id: "trzm-tur-exp-11", tourId: "trzm-tur-pkg-03", category: "GUIDE_FEE", description: "Rehber Kerem Aksoy (1 Gün)", quantity: 1, unitCostTry: 4200, sourceRefType: "GUIDE" },

      // TUR-2026-08 (COMPLETED Safranbolu — Zengin Kâr Analizi!)
      { id: "trzm-tur-exp-12", tourId: "trzm-tur-pkg-08", category: "HOTEL_ACCOMMODATION", description: "Safranbolu Konaklama (19 Oda × 1 Gece HB)", quantity: 19, unitCostTry: 3200, sourceRefType: "HOTEL_PMS" },
      { id: "trzm-tur-exp-13", tourId: "trzm-tur-pkg-08", category: "VEHICLE_FUEL", description: "34 TUR 451 Otobüs Yakıt (Filo)", quantity: 1, unitCostTry: 14600, sourceRefType: "FLEET_FUEL" },
      { id: "trzm-tur-exp-14", tourId: "trzm-tur-pkg-08", category: "GUIDE_FEE", description: "Rehber Kerem Aksoy (2 Gün)", quantity: 2, unitCostTry: 4200, sourceRefType: "GUIDE" },
      { id: "trzm-tur-exp-15", tourId: "trzm-tur-pkg-08", category: "MEAL_CATERING", description: "Amasra Öğle Yemeği & İkram (38 Kişi)", quantity: 38, unitCostTry: 580, sourceRefType: "MANUAL" },
      { id: "trzm-tur-exp-16", tourId: "trzm-tur-pkg-08", category: "MUSEUM_TICKET", description: "Kristal Teras & Müze Girişleri", quantity: 38, unitCostTry: 240, sourceRefType: "MANUAL" },

      // TUR-2026-09 (COMPLETED Şile/Ağva)
      { id: "trzm-tur-exp-17", tourId: "trzm-tur-pkg-09", category: "VEHICLE_FUEL", description: "34 TUR 272 Midibüs Yakıt", quantity: 1, unitCostTry: 2800, sourceRefType: "FLEET_FUEL" },
      { id: "trzm-tur-exp-18", tourId: "trzm-tur-pkg-09", category: "GUIDE_FEE", description: "Rehber Elif Karaca (1 Gün)", quantity: 1, unitCostTry: 3900, sourceRefType: "GUIDE" },
      { id: "trzm-tur-exp-19", tourId: "trzm-tur-pkg-09", category: "MEAL_CATERING", description: "Göksu Dere Tekne & Kahvaltı (24 Kişi)", quantity: 24, unitCostTry: 480, sourceRefType: "MANUAL" },
    ]
    for (const ex of expensesSeed) {
      add("turizmTourExpenseItem", {
        ...ex,
        totalCostTry: Number((ex.quantity * ex.unitCostTry).toFixed(2)),
        sourceRefId: null,
        financeId: null,
        recordedBy: "turizm-faz4-seed",
        ownerCompanyId: MAIN_COMPANY_ID,
        createdAt: now,
      })
    }

    // Tamamlanan turların finans gelir özet kayıtları
    add("finance", {
      id: "trzm-tur-fin-09",
      branchId: defaultBranchId,
      type: "INCOME",
      amount: 262200,
      category: "Tur Paket Satış Geliri",
      description: "TUR-2026-08 Safranbolu & Amasra 2 Günlük Miras Turu Tahsilatı",
      status: "approved",
      approvedBy: "turizm-faz4-seed",
      date: "2026-11-15T18:00:00.000Z",
      createdAt: now,
      updatedAt: now,
    })
    add("finance", {
      id: "trzm-tur-fin-10",
      branchId: defaultBranchId,
      type: "INCOME",
      amount: 42000,
      category: "Tur Paket Satış Geliri",
      description: "TUR-2026-09 Şile & Ağva Günübirlik Tur Tahsilatı",
      status: "approved",
      approvedBy: "turizm-faz4-seed",
      date: "2026-11-18T18:00:00.000Z",
      createdAt: now,
      updatedAt: now,
    })

    // ── 9. REDDEDİLEN KAYNAK & KOLTUK ÇAKIŞMA GÜNLÜĞÜ (4 Örnek) ───────────────
    const conflictsSeed = [
      {
        id: "trzm-tur-cnf-01",
        tourId: "trzm-tur-pkg-03",
        tourCode: "TUR-2026-03",
        resourceType: "VEHICLE",
        resourceId: "trzm-tur-veh-min1",
        resourceLabel: "34 TUR 163 (Mercedes Sprinter)",
        attemptedStartAt: "2026-11-24T06:45:00.000Z",
        attemptedEndAt: "2026-11-24T21:30:00.000Z",
        conflictSource: "TOUR_OVERLAP",
        conflictRefNo: "TUR-2026-02",
        rejectionCode: "VEHICLE_OVERLAP",
        rejectionMessage: "34 TUR 163 aracı 24 Kasım tarihinde TUR-2026-02 Sapanca Turu ile çakıştığı için engellendi.",
        resolved: true,
        resolutionNote: "34 TUR 451 Travego Otobüs atandı.",
      },
      {
        id: "trzm-tur-cnf-02",
        tourId: "trzm-tur-pkg-05",
        tourCode: "TUR-2026-05",
        resourceType: "VEHICLE",
        resourceId: "f5-veh-08",
        resourceLabel: "34 SNR 915 (Filo Bakımda)",
        attemptedStartAt: "2026-11-28T06:30:00.000Z",
        attemptedEndAt: "2026-11-28T21:30:00.000Z",
        conflictSource: "FLEET_MAINTENANCE",
        conflictRefNo: "34 SNR 915",
        rejectionCode: "VEHICLE_MAINTENANCE_OR_FAULT",
        rejectionMessage: "34 SNR 915 Filo'da MAINTENANCE durumunda olduğundan tura atanamadı.",
        resolved: true,
        resolutionNote: "Mevcut f5-veh-11 (34 SNR 118 Crafter) ile çözüldü.",
      },
      {
        id: "trzm-tur-cnf-03",
        tourId: "trzm-tur-pkg-07",
        tourCode: "TUR-2026-07",
        resourceType: "VEHICLE",
        resourceId: "trzm-rnt-veh-07",
        resourceLabel: "34 RNT 707 (Mercedes Vito VIP)",
        attemptedStartAt: "2026-11-21T09:00:00.000Z",
        attemptedEndAt: "2026-11-21T18:30:00.000Z",
        conflictSource: "RENTACAR_OVERLAP",
        conflictRefNo: "RNT-2026-1003",
        rejectionCode: "VEHICLE_RENTACAR_OVERLAP",
        rejectionMessage: "34 RNT 707 aracı 21 Kasım'da Rent-a-Car kiralamasında olduğundan tur 25 Kasım'a kaydırıldı.",
        resolved: true,
        resolutionNote: "Tur tarihi 25 Kasım'a alındı.",
      },
      {
        id: "trzm-tur-cnf-04",
        tourId: "trzm-tur-pkg-01",
        tourCode: "TUR-2026-01",
        resourceType: "SEAT",
        resourceId: "11",
        resourceLabel: "Koltuk 11 (Yanı: Koltuk 12)",
        attemptedStartAt: "2026-11-26T06:30:00.000Z",
        attemptedEndAt: "2026-11-29T21:00:00.000Z",
        conflictSource: "SEAT_GENDER_RULE",
        conflictRefNo: "TUR-2026-01",
        rejectionCode: "SEAT_GENDER_RULE_VIOLATION",
        rejectionMessage: "Farklı cinsiyette aile kodu olmayan yolcu için yan koltuk ataması kural gereği engellendi.",
        resolved: false,
        resolutionNote: null,
      },
    ]
    for (const c of conflictsSeed) {
      add("turizmTourConflictLog", {
        ...c,
        actorUserId: "turizm-faz4-seed",
        ownerCompanyId: MAIN_COMPANY_ID,
        attemptedAt: now,
      })
    }

    // ── 10. REHBER / ŞOFÖR SAHA NOTLARI (2 Örnek) ─────────────────────────────
    add("turizmTourFieldLog", {
      id: "trzm-tur-fld-01",
      tourId: "trzm-tur-pkg-02",
      logType: "EMERGENCY_NOTE",
      bookingId: "trzm-tur-bkg-03",
      passengerId: "trzm-tur-bkg-03-pax-1",
      amountTry: 0,
      paymentMethod: null,
      note: "Kartal durağından 2 yolcu trafik nedeniyle 5 dk gecikmeli bindi; grup tam kadro yolda.",
      recordedByUserId: "trzm-tur-user-gd2",
      recordedByName: "rehber.elif",
      offlineIdempotencyKey: "seed-fld-01",
      ownerCompanyId: MAIN_COMPANY_ID,
      recordedAt: now,
    })
    add("turizmTourFieldLog", {
      id: "trzm-tur-fld-02",
      tourId: "trzm-tur-pkg-03",
      logType: "FIELD_COLLECTION",
      bookingId: "trzm-tur-bkg-04",
      passengerId: null,
      amountTry: 4900,
      paymentMethod: "Saha Nakit (Rehber)",
      note: "Mimarlık Kulübü kalan bakiye kısmi saha tahsilatı teslim alındı.",
      recordedByUserId: "trzm-tur-user-gd1",
      recordedByName: "rehber.kerem",
      offlineIdempotencyKey: "seed-fld-02",
      ownerCompanyId: MAIN_COMPANY_ID,
      recordedAt: now,
    })

    notes.push(
      "Turizm Faz 4 Tur Operatörlüğü kurgusal demo verisi işlendi: 12 tur (günübirlik/konaklamalı/dolu/garantili/min-altı/tamamlandı/iptal/partner), 4 rehber, 2 kısıtlı rehber kullanıcısı, 4 acenta, 4 koltuk şeması, 12 rezervasyon, Faz 3 otel & KBS bağlantısı, 19 gider kalemi ve 4 çakışma kaydı."
    )

    return {
      moduleKey: "turizm_faz4_tur_operatorlugu",
      inserted,
      skippedExisting,
      notes,
    }
  },
}
