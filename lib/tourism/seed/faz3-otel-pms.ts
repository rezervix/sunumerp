/**
 * Sunum ERP — Turizm Faz 3 Demo Seed Modülü: Otel Yönetimi (Mini PMS) — turizm_otel
 *
 * KURALLAR (Kural 6):
 * - Yalnızca DEMO ortamında çalışır (`isDemoEnvironment()`).
 * - Mevcut hiçbir kayda (`cust-*`, `f5-*`, `trzm-rnt-*`, `trzm-comp-*` vb.) dokunmaz.
 * - Tüm Faz 3 kayıtları `trzm-otl-*` öneki (ve `role-housekeeping` rol kimliği) taşır;
 *   idempotent çalışır ve tek komutla geri alınabilir.
 * - Kurgusal 50 odalı (5 kat × 10 oda) + 2 partner odalı otel envanteri, 5 oda tipi,
 *   8 sezon/pansiyon tarifesi, 4 minibar stok ürünü, 4 acenta kontenjanı (dolmaya yakın
 *   uyarılı dahil), 10 kurgusal misafir (farklı uyruklar), 90 günlük 24 rezervasyon,
 *   açık/bölünmüş foliolar, 10 housekeeping/arıza görevi, 2 kısıtlı temizlik personeli
 *   kullanıcısı (`temizlik.ayse`, `temizlik.fatma`), 8 karışık KBS hazırlık kaydı ve
 *   3 çakışma günlüğü içerir.
 */

import bcrypt from "bcryptjs"
import { DEFAULT_ROLES } from "@/lib/auth/permissions"
import type { LogisticsSeedModule } from "@/lib/logistics/seed/framework"
import { HOUSEKEEPING_ROLE_NAME, MAIN_COMPANY_ID } from "../constants"

export const SEED_FAZ3_OTEL_PREFIX = "trzm-otl-"
export const SEED_HOUSEKEEPING_ROLE_ID = "role-housekeeping"

function pushIfMissing(db: Record<string, any[]>, col: string, rec: any): number {
  if (!Array.isArray(db[col])) db[col] = []
  if (db[col].some((r) => String(r?.id) === String(rec.id))) return 0
  db[col].push(rec)
  return 1
}

export const faz3HotelPmsSeedModule: LogisticsSeedModule = {
  moduleKey: "turizm_faz3_otel_pms",
  phase: 3,
  seededIdPrefixes: [SEED_FAZ3_OTEL_PREFIX],
  seededIdsByCollection: {
    role: [SEED_HOUSEKEEPING_ROLE_ID],
    user: [],
    userBranchRole: [],
    customer: [],
    inventoryItem: [],
    stockBalance: [],
    stockMovement: [],
    finance: [],
    turizmHotelRoomType: [],
    turizmHotelRoom: [],
    turizmHotelTariff: [],
    turizmHotelPolicyConfig: [],
    turizmHotelAllotment: [],
    turizmHotelReservation: [],
    turizmHotelFolioItem: [],
    turizmHotelHousekeepingTask: [],
    turizmHotelKbsRecord: [],
    turizmHotelConflictAttemptLog: [],
  },
  rollback(db) {
    const removed: Record<string, number> = {}
    const cols = Object.keys(this.seededIdsByCollection)
    for (const col of cols) {
      if (!Array.isArray(db[col])) continue
      const before = db[col].length
      db[col] = db[col].filter((r) => {
        const id = String(r?.id || "")
        if (col === "role" && id === SEED_HOUSEKEEPING_ROLE_ID) return false
        return !id.startsWith(SEED_FAZ3_OTEL_PREFIX)
      })
      const diff = before - db[col].length
      if (diff > 0) removed[col] = diff
    }
    return removed
  },
  seed(db) {
    const now = "2026-11-23T08:30:00.000Z"
    const inserted: Record<string, number> = {}
    let skippedExisting = 0
    const notes: string[] = []

    const add = (col: string, rec: any) => {
      const count = pushIfMissing(db, col, rec)
      if (count > 0) {
        inserted[col] = (inserted[col] || 0) + count
      } else {
        skippedExisting++
      }
    }

    if (!Array.isArray(db.role)) db.role = []
    if (!Array.isArray(db.user)) db.user = []
    if (!Array.isArray(db.userBranchRole)) db.userBranchRole = []

    const defaultBranchId =
      Array.isArray(db.branch) && db.branch.some((b) => b.id === "local-debug-branch")
        ? "local-debug-branch"
        : db.branch?.[0]?.id ?? "local-debug-branch"

    // ── 1. KISITLI "Temizlik Personeli" ROLÜ VE 2 DEMO KULLANICISI ────────────
    const hasHkRole = db.role.some(
      (r) => r.id === SEED_HOUSEKEEPING_ROLE_ID || r.name === HOUSEKEEPING_ROLE_NAME
    )
    if (!hasHkRole) {
      db.role.push({
        id: SEED_HOUSEKEEPING_ROLE_ID,
        name: HOUSEKEEPING_ROLE_NAME,
        description:
          "Kısıtlı Kat Hizmetleri rolü — yalnızca kendine atanan oda temizlik görevlerini, minibar sayımını ve arıza bildirimini görür/günceller.",
        permissions: JSON.stringify(DEFAULT_ROLES[HOUSEKEEPING_ROLE_NAME]),
      })
      inserted.role = (inserted.role || 0) + 1
    } else {
      skippedExisting++
    }

    const hashedDemoPassword = bcrypt.hashSync("demo123", 10)
    const hkUsers = [
      {
        id: "trzm-otl-user-hk1",
        ubrId: "trzm-otl-ubr-hk1",
        username: "temizlik.ayse",
        fullName: "Ayşe Demir (Kat 1-3 Temizlik Personeli)",
        email: "ayse.hk@ornek-otel.example",
        phone: "+90 555 301 01 01",
        position: "Kat Hizmetleri Görevlisi (Kat 1-3)",
      },
      {
        id: "trzm-otl-user-hk2",
        ubrId: "trzm-otl-ubr-hk2",
        username: "temizlik.fatma",
        fullName: "Fatma Yılmaz (Kat 4-5 Temizlik Personeli)",
        email: "fatma.hk@ornek-otel.example",
        phone: "+90 555 301 02 02",
        position: "Kat Hizmetleri Görevlisi (Kat 4-5)",
      },
    ]

    for (const hu of hkUsers) {
      add("user", {
        id: hu.id,
        username: hu.username,
        email: hu.email,
        password: hashedDemoPassword,
        fullName: hu.fullName,
        phone: hu.phone,
        avatarUrl: null,
        department: "Kat Hizmetleri (Housekeeping)",
        position: hu.position,
        supplierId: null,
        partnerCompanyId: null,
        isActive: true,
        mustChangePassword: false,
        createdAt: now,
        updatedAt: now,
      })
      add("userBranchRole", {
        id: hu.ubrId,
        userId: hu.id,
        branchId: defaultBranchId,
        roleId: SEED_HOUSEKEEPING_ROLE_ID,
        assignedAt: now,
        assignedBy: "turizm-faz3-seed",
      })
    }

    // ── 2. ODA TİPLERİ (5 Ana Oda Tipi + 1 Partner Oda Tipi) ──────────────────
    const roomTypes = [
      {
        id: "trzm-otl-rt-std",
        code: "ODA-STD",
        name: "Standart Çift Kişilik Oda",
        baseCapacity: 2,
        maxAdults: 2,
        maxChildren: 1,
        bedConfiguration: "1 Çift Kişilik (Queen) veya 2 Tek Kişilik Yatak",
        areaSqm: 26,
        amenitiesJson: JSON.stringify(["Wi-Fi", "Klima", "Minibar", "Dijital Kasa", "Smart TV", "Balkon"]),
        baseRateTry: 3400,
        description: "Şehir veya bahçe manzaralı, modern donanımlı standart oda.",
        sortOrder: 10,
        isActive: true,
        ownerCompanyId: MAIN_COMPANY_ID,
        createdAt: now,
        updatedAt: now,
      },
      {
        id: "trzm-otl-rt-dlx",
        code: "ODA-DLX",
        name: "Deluxe Deniz Manzaralı Oda",
        baseCapacity: 2,
        maxAdults: 3,
        maxChildren: 1,
        bedConfiguration: "1 King Yatak + Oturma Köşesi",
        areaSqm: 34,
        amenitiesJson: JSON.stringify(["Wi-Fi", "Deniz Manzarası", "Klima", "Minibar", "Espresso Makinesi", "Geniş Balkon"]),
        baseRateTry: 4800,
        description: "Üst katlarda panoramik manzaralı ve geniş balkonlu deluxe oda.",
        sortOrder: 20,
        isActive: true,
        ownerCompanyId: MAIN_COMPANY_ID,
        createdAt: now,
        updatedAt: now,
      },
      {
        id: "trzm-otl-rt-fam",
        code: "ODA-FAM",
        name: "Aile Odası (Bağlantılı 2+2)",
        baseCapacity: 4,
        maxAdults: 4,
        maxChildren: 2,
        bedConfiguration: "1 Çift Kişilik + 2 Tek Kişilik Yatak",
        areaSqm: 46,
        amenitiesJson: JSON.stringify(["Wi-Fi", "İki Oda", "Klima", "Çift TV", "Minibar", "Bebek Yatağı Uygun"]),
        baseRateTry: 6200,
        description: "Aileler için ara kapılı, ferah ve çocuk dostu konaklama birimi.",
        sortOrder: 30,
        isActive: true,
        ownerCompanyId: MAIN_COMPANY_ID,
        createdAt: now,
        updatedAt: now,
      },
      {
        id: "trzm-otl-rt-sui",
        code: "ODA-SUI",
        name: "Teraslı Köşe Süit",
        baseCapacity: 2,
        maxAdults: 3,
        maxChildren: 2,
        bedConfiguration: "1 King Yatak + Ayrı Salon",
        areaSqm: 58,
        amenitiesJson: JSON.stringify(["Wi-Fi", "Özel Teras", "Jakuzi", "Ayrı Salon", "VIP Minibar", "Çalışma Masası"]),
        baseRateTry: 8900,
        description: "Beşinci katta geniş özel teras ve ayrı salonlu üst segment süit.",
        sortOrder: 40,
        isActive: true,
        ownerCompanyId: MAIN_COMPANY_ID,
        createdAt: now,
        updatedAt: now,
      },
      {
        id: "trzm-otl-rt-eng",
        code: "ODA-ENG",
        name: "Engelsiz Erişimli Oda",
        baseCapacity: 2,
        maxAdults: 2,
        maxChildren: 1,
        bedConfiguration: "2 Tek Kişilik Ortopedik Yatak",
        areaSqm: 30,
        amenitiesJson: JSON.stringify(["Wi-Fi", "Engelsiz Banyo", "Geniş Kapı", "Acil Çağrı", "Klima", "Minibar"]),
        baseRateTry: 3400,
        description: "Zemin/1. katta tekerlekli sandalye erişimine tam uyumlu oda.",
        sortOrder: 50,
        isActive: true,
        ownerCompanyId: MAIN_COMPANY_ID,
        createdAt: now,
        updatedAt: now,
      },
      {
        id: "trzm-otl-rt-prt",
        code: "PRT-BUTIK",
        name: "Butik Kıyı Taş Oda (Partner)",
        baseCapacity: 2,
        maxAdults: 2,
        maxChildren: 1,
        bedConfiguration: "1 King Yatak",
        areaSqm: 32,
        amenitiesJson: JSON.stringify(["Wi-Fi", "Veranda", "Klima", "Minibar"]),
        baseRateTry: 5400,
        description: "Örnek Kıyı Konaklama & Butik Otel A.Ş. (Partner Firma) özel taş odası.",
        sortOrder: 60,
        isActive: true,
        ownerCompanyId: "trzm-comp-otel-03",
        createdAt: now,
        updatedAt: now,
      },
    ]
    for (const rt of roomTypes) add("turizmHotelRoomType", rt)

    // ── 3. FİZİKSEL ODA ENVANTERİ (50 Ana Otel Odası: Kat 1–5 × 10 Oda + 2 Partner Odası) ──
    const occupiedRoomNums = new Set([
      "101", "102", "104", "201", "202", "205", "301", "303", "306", "401", "404", "501", "502",
    ])
    const dirtyRoomNums = new Set(["105", "206", "304", "405", "504"])
    const cleaningInProgressNums = new Set(["106", "207", "406"])
    const inspectionPendingNums = new Set(["107", "305", "505"])
    const maintenanceNums = new Set(["209", "409"])
    const outOfOrderNums = new Set(["310"])

    for (let floor = 1; floor <= 5; floor++) {
      for (let idx = 1; idx <= 10; idx++) {
        const roomNumber = `${floor}${String(idx).padStart(2, "0")}`
        let roomTypeId = "trzm-otl-rt-std"
        if (floor === 1 && (idx === 9 || idx === 10)) roomTypeId = "trzm-otl-rt-eng"
        else if (floor === 2 && idx >= 7) roomTypeId = "trzm-otl-rt-dlx"
        else if (floor === 3) roomTypeId = idx <= 6 ? "trzm-otl-rt-dlx" : "trzm-otl-rt-fam"
        else if (floor === 4) roomTypeId = idx <= 5 ? "trzm-otl-rt-dlx" : "trzm-otl-rt-fam"
        else if (floor === 5) roomTypeId = idx <= 6 ? "trzm-otl-rt-sui" : "trzm-otl-rt-dlx"

        let status = "CLEAN_VACANT"
        let notesTxt: string | null = null
        let keyCardCode: string | null = null
        if (occupiedRoomNums.has(roomNumber)) {
          status = "OCCUPIED"
          keyCardCode = `KEY-${roomNumber}-2611`
        } else if (dirtyRoomNums.has(roomNumber)) {
          status = "DIRTY_VACANT"
        } else if (cleaningInProgressNums.has(roomNumber)) {
          status = "CLEANING_IN_PROGRESS"
        } else if (inspectionPendingNums.has(roomNumber)) {
          status = "INSPECTION_PENDING"
        } else if (maintenanceNums.has(roomNumber)) {
          status = "MAINTENANCE"
          notesTxt = "Periyodik banyo armatür ve silikon yenileme bakımı"
        } else if (outOfOrderNums.has(roomNumber)) {
          status = "OUT_OF_ORDER"
          notesTxt = "Klima iç ünite kompresör arızası — yedek parça bekleniyor"
        }

        add("turizmHotelRoom", {
          id: `trzm-otl-rm-${roomNumber}`,
          roomNumber,
          floorNumber: floor,
          wingOrSection: idx <= 5 ? "Deniz Kanadı" : "Bahçe Kanadı",
          roomTypeId,
          branchId: defaultBranchId,
          status,
          keyCardCode,
          isSmokingAllowed: false,
          hasBalcony: floor >= 2,
          notes: notesTxt,
          isActive: true,
          ownerCompanyId: MAIN_COMPANY_ID,
          createdAt: now,
          updatedAt: now,
        })
      }
    }

    // Partner Firmaya (trzm-comp-otel-03) Ait 2 İzole Oda
    for (const prm of [
      { id: "trzm-otl-rm-b101", roomNumber: "B101", status: "OCCUPIED", keyCardCode: "KEY-B101-88" },
      { id: "trzm-otl-rm-b102", roomNumber: "B102", status: "CLEAN_VACANT", keyCardCode: null },
    ]) {
      add("turizmHotelRoom", {
        id: prm.id,
        roomNumber: prm.roomNumber,
        floorNumber: 1,
        wingOrSection: "Kıyı Butik Blok",
        roomTypeId: "trzm-otl-rt-prt",
        branchId: defaultBranchId,
        status: prm.status,
        keyCardCode: prm.keyCardCode,
        isSmokingAllowed: false,
        hasBalcony: true,
        notes: "Örnek Kıyı Konaklama & Butik Otel A.Ş. (Partner Firma) odası.",
        isActive: true,
        ownerCompanyId: "trzm-comp-otel-03",
        createdAt: now,
        updatedAt: now,
      })
    }

    // ── 4. FİYAT TARİFELERİ (8 Tarife) VE POLİTİKA AYARI ──────────────────────
    const tariffs = [
      {
        id: "trzm-otl-trf-01",
        code: "OTRF-STD-RO",
        name: "Standart Oda — Sadece Oda (RO)",
        roomTypeId: "trzm-otl-rt-std",
        seasonType: "STANDARD",
        boardType: "RO",
        nightlyRateTry: 3100,
      },
      {
        id: "trzm-otl-trf-02",
        code: "OTRF-STD-BB",
        name: "Standart Oda — Oda + Kahvaltı (BB)",
        roomTypeId: "trzm-otl-rt-std",
        seasonType: "STANDARD",
        boardType: "BB",
        nightlyRateTry: 3500,
      },
      {
        id: "trzm-otl-trf-03",
        code: "OTRF-STD-HB",
        name: "Standart Oda — Yarım Pansiyon (HB)",
        roomTypeId: "trzm-otl-rt-std",
        seasonType: "STANDARD",
        boardType: "HB",
        nightlyRateTry: 4300,
      },
      {
        id: "trzm-otl-trf-04",
        code: "OTRF-DLX-BB",
        name: "Deluxe Deniz Manzaralı — Oda + Kahvaltı (BB)",
        roomTypeId: "trzm-otl-rt-dlx",
        seasonType: "STANDARD",
        boardType: "BB",
        nightlyRateTry: 4950,
      },
      {
        id: "trzm-otl-trf-05",
        code: "OTRF-DLX-AI",
        name: "Deluxe — Her Şey Dahil Yüksek Sezon (AI)",
        roomTypeId: "trzm-otl-rt-dlx",
        seasonType: "HIGH_SEASON",
        boardType: "AI",
        nightlyRateTry: 7400,
      },
      {
        id: "trzm-otl-trf-06",
        code: "OTRF-FAM-HB",
        name: "Aile Odası — Yarım Pansiyon (HB)",
        roomTypeId: "trzm-otl-rt-fam",
        seasonType: "STANDARD",
        boardType: "HB",
        nightlyRateTry: 6850,
      },
      {
        id: "trzm-otl-trf-07",
        code: "OTRF-SUI-FB",
        name: "Teraslı Köşe Süit — Tam Pansiyon (FB)",
        roomTypeId: "trzm-otl-rt-sui",
        seasonType: "WEEKEND",
        boardType: "FB",
        nightlyRateTry: 9800,
      },
      {
        id: "trzm-otl-trf-08",
        code: "OTRF-STD-ACN",
        name: "Standart Oda — Acenta Kontrat Net (BB)",
        roomTypeId: "trzm-otl-rt-std",
        seasonType: "AGENCY_CONTRACT",
        boardType: "BB",
        nightlyRateTry: 2950,
      },
    ]
    for (const trf of tariffs) {
      add("turizmHotelTariff", {
        ...trf,
        branchId: defaultBranchId,
        validFrom: "2026-01-01T00:00:00.000Z",
        validTo: "2027-12-31T23:59:59.000Z",
        extraAdultRateTry: 1100,
        childRateTry: 550,
        currency: "TRY",
        isActive: true,
        ownerCompanyId: MAIN_COMPANY_ID,
        createdAt: now,
        updatedAt: now,
      })
    }

    add("turizmHotelPolicyConfig", {
      id: "trzm-otl-policy-hq",
      branchId: defaultBranchId,
      hotelDisplayName: "Sunum Örnek Sahil & Şehir Oteli (50 Oda)",
      defaultCheckInTime: "14:00",
      defaultCheckOutTime: "12:00",
      lateCheckOutGraceMinutes: 60,
      lateCheckOutFeePct: 50,
      invoiceTimingMode: "ON_CHECKOUT",
      defaultVatRatePct: 10,
      accommodationExtraRatePct: 2,
      autoCreateHousekeepingOnCheckOut: true,
      requireZeroBalanceOnCheckOut: true,
      updatedBy: "turizm-faz3-seed",
      ownerCompanyId: MAIN_COMPANY_ID,
      createdAt: now,
      updatedAt: now,
    })

    // ── 5. MİNİBAR STOK ÜRÜNLERİ (Mevcut InventoryItem + StockBalance Yeniden Kullanımı) ──
    const minibarProducts = [
      {
        id: "trzm-otl-inv-su",
        sku: "MNB-SU-500",
        name: "Minibar Doğal Kaynak Suyu 500 ml",
        standardCost: 14,
        salesPrice: 65,
        onHandQty: 240,
      },
      {
        id: "trzm-otl-inv-kola",
        sku: "MNB-KOLA-330",
        name: "Minibar Soğuk Gazlı İçecek 330 ml",
        standardCost: 26,
        salesPrice: 110,
        onHandQty: 180,
      },
      {
        id: "trzm-otl-inv-fistik",
        sku: "MNB-FISTIK-80",
        name: "Minibar Kavrulmuş Antep Fıstığı 80 g",
        standardCost: 62,
        salesPrice: 195,
        onHandQty: 120,
      },
      {
        id: "trzm-otl-inv-kahve",
        sku: "MNB-KAHVE-KAP",
        name: "Minibar Özel Kapsül Espresso Seti",
        standardCost: 42,
        salesPrice: 145,
        onHandQty: 150,
      },
    ]
    for (const mp of minibarProducts) {
      add("inventoryItem", {
        id: mp.id,
        sku: mp.sku,
        barcode: `869900${mp.sku.slice(-4)}`,
        name: mp.name,
        description: "Otel odası minibar tüketimi için stok bağlantılı ürün",
        category: "Otel Minibar",
        brand: "Sunum Otel İkram",
        itemType: "MERCHANDISE",
        baseUnit: "Adet",
        valuationMethod: "FIFO",
        standardCost: mp.standardCost,
        currentAvgCost: mp.standardCost,
        fifoUnitCost: mp.standardCost,
        lifoUnitCost: mp.standardCost,
        lastPurchaseCost: mp.standardCost,
        salesPrice: mp.salesPrice,
        currency: "TRY",
        taxRate: 10,
        minStockLevel: 25,
        maxStockLevel: 500,
        isActive: true,
        createdAt: now,
        updatedAt: now,
      })
      add("stockBalance", {
        id: `${mp.id}-bal`,
        itemId: mp.id,
        warehouseId: "wh-merkez-01",
        storageBinId: null,
        binCode: "MNB-RAF-01",
        onHandQty: mp.onHandQty,
        reservedQty: 0,
        availableQty: mp.onHandQty,
        inTransitQty: 0,
        quarantineQty: 0,
        consignmentQty: 0,
        updatedAt: now,
      })
      add("stockMovement", {
        id: `${mp.id}-smv-init`,
        itemId: mp.id,
        warehouseId: "wh-merkez-01",
        movementType: "RECEIPT",
        quantity: mp.onHandQty,
        unit: "Adet",
        valuationMethodUsed: "FIFO",
        unitCost: mp.standardCost,
        totalCost: Number((mp.standardCost * mp.onHandQty).toFixed(2)),
        standardCostVariance: 0,
        lotNumber: null,
        serialNumber: null,
        fromBinCode: null,
        toBinCode: "MNB-RAF-01",
        lpnCode: null,
        referenceDocNo: `OTL-MNB-ACILIS-${mp.sku}`,
        performedBy: "turizm-faz3-seed",
        notes: "Otel minibar stok başlangıç giriş hareketi (bakiye-hareket eşitliği)",
        idempotencyKey: `seed-init-${mp.id}`,
        deviceId: null,
        method: "SEED_INIT",
        reservationId: null,
        balanceAfterQty: mp.onHandQty,
        createdAt: now,
      })
    }

    // ── 6. ACENTA KONTENJANLARI (4 Kontenjan — Dolmaya Yakın Uyarılı Dahil) ───
    const allotments = [
      {
        id: "trzm-otl-allot-01",
        code: "KNT-AND-STD",
        agencyName: "Örnek Anadolu Keşif Turizm Ltd.",
        agencyCompanyId: "trzm-comp-tur-02",
        roomTypeId: "trzm-otl-rt-std",
        validFrom: "2026-11-01T00:00:00.000Z",
        validTo: "2026-12-31T23:59:59.000Z",
        allocatedRoomsPerNight: 6,
        usedRoomNights: 162,
        releaseDaysBefore: 7,
        releaseDeadlineAt: "2026-11-28T18:00:00.000Z",
        netRatePerNightTry: 2950,
        warningThresholdPct: 80,
        status: "ACTIVE",
        notes: "Kasım–Aralık 2026 standart oda kültür turu kontenjanı.",
      },
      {
        id: "trzm-otl-allot-02",
        code: "KNT-EGE-DLX",
        agencyName: "Örnek Ege Tatil & Incoming Acentası",
        agencyCompanyId: null,
        roomTypeId: "trzm-otl-rt-dlx",
        validFrom: "2026-11-10T00:00:00.000Z",
        validTo: "2026-12-10T23:59:59.000Z",
        allocatedRoomsPerNight: 4,
        usedRoomNights: 106,
        releaseDaysBefore: 5,
        releaseDeadlineAt: "2026-11-26T18:00:00.000Z",
        netRatePerNightTry: 4250,
        warningThresholdPct: 80,
        status: "NEAR_LIMIT",
        notes: "Kontenjan %88 doluluğa ulaştı; ek kontenjan talebi değerlendiriliyor.",
      },
      {
        id: "trzm-otl-allot-03",
        code: "KNT-KRP-SUI",
        agencyName: "Örnek Kurumsal Kongre Organizasyon A.Ş.",
        agencyCompanyId: null,
        roomTypeId: "trzm-otl-rt-sui",
        validFrom: "2026-11-15T00:00:00.000Z",
        validTo: "2026-12-05T23:59:59.000Z",
        allocatedRoomsPerNight: 2,
        usedRoomNights: 34,
        releaseDaysBefore: 3,
        releaseDeadlineAt: "2026-11-25T18:00:00.000Z",
        netRatePerNightTry: 7900,
        warningThresholdPct: 80,
        status: "NEAR_LIMIT",
        notes: "Sonbahar teknoloji zirvesi VIP konuşmacı süit kontenjanı.",
      },
      {
        id: "trzm-otl-allot-04",
        code: "KNT-B2B-FAM",
        agencyName: "Örnek Kuzey Avrupa Aile Turları",
        agencyCompanyId: null,
        roomTypeId: "trzm-otl-rt-fam",
        validFrom: "2026-11-20T00:00:00.000Z",
        validTo: "2026-12-20T23:59:59.000Z",
        allocatedRoomsPerNight: 2,
        usedRoomNights: 12,
        releaseDaysBefore: 10,
        releaseDeadlineAt: "2026-12-01T18:00:00.000Z",
        netRatePerNightTry: 5600,
        warningThresholdPct: 80,
        status: "ACTIVE",
        notes: "Aile odası garantili kontenjan anlaşması.",
      },
    ]
    for (const al of allotments) {
      add("turizmHotelAllotment", {
        ...al,
        branchId: defaultBranchId,
        ownerCompanyId: MAIN_COMPANY_ID,
        createdAt: now,
        updatedAt: now,
      })
    }

    // ── 7. KURGUSAL MİSAFİR CARİ KAYITLARI (10 Misafir, Farklı Uyruklar) ──────
    const hotelGuests = [
      { id: "trzm-otl-cust-01", name: "Kaan Özdemir", company: null, nationality: "TR", tckn: "21948576310", passportNo: null, birthDate: "1986-04-12T00:00:00.000Z", phone: "+90 532 555 31 01", email: "kaan.ozdemir@ornek.example" },
      { id: "trzm-otl-cust-02", name: "Merve Aydın", company: "Örnek Mimarlık Stüdyo", nationality: "TR", tckn: "34819204722", passportNo: null, birthDate: "1991-09-21T00:00:00.000Z", phone: "+90 533 555 31 02", email: "merve.aydin@ornek.example" },
      { id: "trzm-otl-cust-03", name: "Lukas Weber", company: null, nationality: "DE", tckn: null, passportNo: "C01X88421", birthDate: "1983-06-15T00:00:00.000Z", phone: "+49 170 555 0103", email: "lukas.weber@ornek.example" },
      { id: "trzm-otl-cust-04", name: "Sophie Laurent", company: null, nationality: "FR", tckn: null, passportNo: "19FR77210", birthDate: "1990-11-04T00:00:00.000Z", phone: "+33 6 55 50 01 04", email: "sophie.laurent@ornek.example" },
      { id: "trzm-otl-cust-05", name: "Oliver Bennett", company: "Example Tech UK Ltd.", nationality: "GB", tckn: null, passportNo: "54GB99102", birthDate: "1979-02-28T00:00:00.000Z", phone: "+44 7700 900105", email: "oliver.bennett@ornek.example" },
      { id: "trzm-otl-cust-06", name: "Bram van Dijk", company: null, nationality: "NL", tckn: null, passportNo: "NL8831042", birthDate: "1988-07-19T00:00:00.000Z", phone: "+31 6 5550 0106", email: "bram.vandijk@ornek.example" },
      { id: "trzm-otl-cust-07", name: "Zeynep Karahan", company: "Örnek Anadolu Sağlık Grubu", nationality: "TR", tckn: "45102938456", passportNo: null, birthDate: "1984-12-03T00:00:00.000Z", phone: "+90 535 555 31 07", email: "zeynep.karahan@ornek.example" },
      { id: "trzm-otl-cust-08", name: "Emre Çelik", company: null, nationality: "TR", tckn: "56291048234", passportNo: null, birthDate: "1993-05-11T00:00:00.000Z", phone: "+90 536 555 31 08", email: "emre.celik@ornek.example" },
      { id: "trzm-otl-cust-09", name: "Hannah Miller", company: null, nationality: "US", tckn: null, passportNo: "US66201944", birthDate: "1987-08-25T00:00:00.000Z", phone: "+1 415 555 0109", email: "hannah.miller@ornek.example" },
      { id: "trzm-otl-cust-10", name: "Serkan Bulut", company: null, nationality: "TR", tckn: null, passportNo: null, birthDate: null, phone: "+90 538 555 31 10", email: "serkan.bulut@ornek.example" },
    ]
    for (const g of hotelGuests) {
      add("customer", {
        id: g.id,
        branchId: defaultBranchId,
        name: g.name,
        company: g.company,
        email: g.email,
        phone: g.phone,
        address: "Kurgusal Otel Misafir Kaydı",
        status: "active",
        scoreTemp: "Ilik",
        segment: g.company ? "Corporate" : "Retail",
        tckn: g.tckn,
        passportNo: g.passportNo,
        nationality: g.nationality,
        birthDate: g.birthDate,
        isBlacklisted: false,
        ownerCompanyId: MAIN_COMPANY_ID,
        createdAt: now,
        updatedAt: now,
      })
    }

    // ── 8. REZERVASYONLAR (90 Günlük 24 Rezervasyon — Geçmiş, Aktif, Geciken, Bugün, Gelecek, İptal) ──
    const reservationsSeed = [
      // ── Aktif Konaklayanlar (CHECKED_IN — 13 Oda) ──
      { id: "trzm-otl-res-01", reservationNo: "OTL-2026-1001", roomId: "trzm-otl-rm-101", roomTypeId: "trzm-otl-rt-std", tariffId: "trzm-otl-trf-02", allotmentId: null, customerId: "trzm-otl-cust-01", channelSource: "DIRECT_WEB", agencyName: null, boardType: "BB", checkInDate: "2026-11-20T14:00:00.000Z", checkOutDate: "2026-11-25T12:00:00.000Z", nightsCount: 5, adultsCount: 2, childrenCount: 0, status: "CHECKED_IN", nightlyRateTry: 3500, paidTotalTry: 10000, extras: [{ cat: "MINIBAR", desc: "Minibar Doğal Kaynak Suyu & Fıstık", amt: 455, grp: "A_ANA_HESAP", inv: "trzm-otl-inv-fistik" }, { cat: "RESTAURANT", desc: "A La Carte Akşam Yemeği", amt: 1850, grp: "B_EKSTRA_BOLUNMUS" }] },
      { id: "trzm-otl-res-02", reservationNo: "OTL-2026-1002", roomId: "trzm-otl-rm-102", roomTypeId: "trzm-otl-rt-std", tariffId: "trzm-otl-trf-08", allotmentId: "trzm-otl-allot-01", customerId: "trzm-otl-cust-03", channelSource: "AGENCY_B2B", agencyName: "Örnek Anadolu Keşif Turizm Ltd.", boardType: "BB", checkInDate: "2026-11-21T14:00:00.000Z", checkOutDate: "2026-11-26T12:00:00.000Z", nightsCount: 5, adultsCount: 2, childrenCount: 0, status: "CHECKED_IN", nightlyRateTry: 2950, paidTotalTry: 14750, extras: [{ cat: "RESTAURANT", desc: "Lobi Kahve & Tatlı Servisi", amt: 620, grp: "B_EKSTRA_BOLUNMUS" }] },
      { id: "trzm-otl-res-03", reservationNo: "OTL-2026-1003", roomId: "trzm-otl-rm-104", roomTypeId: "trzm-otl-rt-std", tariffId: "trzm-otl-trf-02", allotmentId: null, customerId: "trzm-otl-cust-10", channelSource: "WALK_IN", agencyName: null, boardType: "BB", checkInDate: "2026-11-19T15:00:00.000Z", checkOutDate: "2026-11-21T12:00:00.000Z", nightsCount: 2, adultsCount: 1, childrenCount: 0, status: "CHECKED_IN", nightlyRateTry: 3500, paidTotalTry: 3500, notes: "Geciken check-out — misafir uzatma teyidi bekleniyor" },
      { id: "trzm-otl-res-04", reservationNo: "OTL-2026-1004", roomId: "trzm-otl-rm-201", roomTypeId: "trzm-otl-rt-std", tariffId: "trzm-otl-trf-03", allotmentId: null, customerId: "trzm-otl-cust-02", channelSource: "CORPORATE", agencyName: "Örnek Mimarlık Stüdyo", boardType: "HB", checkInDate: "2026-11-21T14:00:00.000Z", checkOutDate: "2026-11-23T12:00:00.000Z", nightsCount: 2, adultsCount: 2, childrenCount: 0, status: "CHECKED_IN", nightlyRateTry: 4300, paidTotalTry: 8600, extras: [{ cat: "LAUNDRY", desc: "Takım Elbise Kuru Temizleme", amt: 480, grp: "A_ANA_HESAP" }] },
      { id: "trzm-otl-res-05", reservationNo: "OTL-2026-1005", roomId: "trzm-otl-rm-202", roomTypeId: "trzm-otl-rt-std", tariffId: "trzm-otl-trf-02", allotmentId: null, customerId: "trzm-otl-cust-04", channelSource: "OTA_BOOKING", agencyName: "Online Kanal (OTA)", boardType: "BB", checkInDate: "2026-11-22T14:00:00.000Z", checkOutDate: "2026-11-27T12:00:00.000Z", nightsCount: 5, adultsCount: 2, childrenCount: 0, status: "CHECKED_IN", nightlyRateTry: 3500, paidTotalTry: 17500 },
      { id: "trzm-otl-res-06", reservationNo: "OTL-2026-1006", roomId: "trzm-otl-rm-205", roomTypeId: "trzm-otl-rt-std", tariffId: "trzm-otl-trf-08", allotmentId: "trzm-otl-allot-01", customerId: "trzm-otl-cust-06", channelSource: "AGENCY_B2B", agencyName: "Örnek Anadolu Keşif Turizm Ltd.", boardType: "BB", checkInDate: "2026-11-21T14:00:00.000Z", checkOutDate: "2026-11-24T12:00:00.000Z", nightsCount: 3, adultsCount: 2, childrenCount: 0, status: "CHECKED_IN", nightlyRateTry: 2950, paidTotalTry: 8850 },
      { id: "trzm-otl-res-07", reservationNo: "OTL-2026-1007", roomId: "trzm-otl-rm-301", roomTypeId: "trzm-otl-rt-dlx", tariffId: "trzm-otl-trf-04", allotmentId: "trzm-otl-allot-02", customerId: "trzm-otl-cust-05", channelSource: "AGENCY_B2B", agencyName: "Örnek Ege Tatil & Incoming Acentası", boardType: "BB", checkInDate: "2026-11-20T14:00:00.000Z", checkOutDate: "2026-11-25T12:00:00.000Z", nightsCount: 5, adultsCount: 2, childrenCount: 0, status: "CHECKED_IN", nightlyRateTry: 4250, paidTotalTry: 21250, extras: [{ cat: "MINIBAR", desc: "Minibar Soğuk İçecek & Espresso", amt: 365, grp: "B_EKSTRA_BOLUNMUS", inv: "trzm-otl-inv-kola" }] },
      { id: "trzm-otl-res-08", reservationNo: "OTL-2026-1008", roomId: "trzm-otl-rm-303", roomTypeId: "trzm-otl-rt-dlx", tariffId: "trzm-otl-trf-04", allotmentId: null, customerId: "trzm-otl-cust-07", channelSource: "CORPORATE", agencyName: "Örnek Anadolu Sağlık Grubu", boardType: "BB", checkInDate: "2026-11-22T14:00:00.000Z", checkOutDate: "2026-11-25T12:00:00.000Z", nightsCount: 3, adultsCount: 1, childrenCount: 0, status: "CHECKED_IN", nightlyRateTry: 4950, paidTotalTry: 0 },
      { id: "trzm-otl-res-09", reservationNo: "OTL-2026-1009", roomId: "trzm-otl-rm-306", roomTypeId: "trzm-otl-rt-dlx", tariffId: "trzm-otl-trf-04", allotmentId: null, customerId: "trzm-otl-cust-09", channelSource: "DIRECT_WEB", agencyName: null, boardType: "BB", checkInDate: "2026-11-21T14:00:00.000Z", checkOutDate: "2026-11-23T12:00:00.000Z", nightsCount: 2, adultsCount: 2, childrenCount: 0, status: "CHECKED_IN", nightlyRateTry: 4950, paidTotalTry: 9900 },
      { id: "trzm-otl-res-10", reservationNo: "OTL-2026-1010", roomId: "trzm-otl-rm-401", roomTypeId: "trzm-otl-rt-dlx", tariffId: "trzm-otl-trf-05", allotmentId: null, customerId: "trzm-otl-cust-08", channelSource: "DIRECT_PHONE", agencyName: null, boardType: "AI", checkInDate: "2026-11-22T14:00:00.000Z", checkOutDate: "2026-11-26T12:00:00.000Z", nightsCount: 4, adultsCount: 2, childrenCount: 1, status: "CHECKED_IN", nightlyRateTry: 7400, paidTotalTry: 15000, extras: [{ cat: "SPA_EXTRA", desc: "Çift Kişilik Aromaterapi Spa Paketi", amt: 2400, grp: "A_ANA_HESAP" }] },
      { id: "trzm-otl-res-11", reservationNo: "OTL-2026-1011", roomId: "trzm-otl-rm-404", roomTypeId: "trzm-otl-rt-dlx", tariffId: "trzm-otl-trf-04", allotmentId: null, customerId: "trzm-otl-cust-03", channelSource: "OTA_BOOKING", agencyName: "Online Kanal (OTA)", boardType: "BB", checkInDate: "2026-11-21T14:00:00.000Z", checkOutDate: "2026-11-24T12:00:00.000Z", nightsCount: 3, adultsCount: 2, childrenCount: 0, status: "CHECKED_IN", nightlyRateTry: 4950, paidTotalTry: 14850 },
      { id: "trzm-otl-res-12", reservationNo: "OTL-2026-1012", roomId: "trzm-otl-rm-501", roomTypeId: "trzm-otl-rt-sui", tariffId: "trzm-otl-trf-07", allotmentId: "trzm-otl-allot-03", customerId: "trzm-otl-cust-05", channelSource: "AGENCY_B2B", agencyName: "Örnek Kurumsal Kongre Organizasyon A.Ş.", boardType: "FB", checkInDate: "2026-11-21T14:00:00.000Z", checkOutDate: "2026-11-25T12:00:00.000Z", nightsCount: 4, adultsCount: 2, childrenCount: 0, status: "CHECKED_IN", nightlyRateTry: 7900, paidTotalTry: 31600, extras: [{ cat: "RESTAURANT", desc: "Teras Özel Akşam Yemeği", amt: 3200, grp: "B_EKSTRA_BOLUNMUS" }] },
      { id: "trzm-otl-res-13", reservationNo: "OTL-2026-1013", roomId: "trzm-otl-rm-502", roomTypeId: "trzm-otl-rt-sui", tariffId: "trzm-otl-trf-07", allotmentId: null, customerId: "trzm-otl-cust-01", channelSource: "DIRECT_WEB", agencyName: null, boardType: "FB", checkInDate: "2026-11-22T14:00:00.000Z", checkOutDate: "2026-11-24T12:00:00.000Z", nightsCount: 2, adultsCount: 2, childrenCount: 1, status: "CHECKED_IN", nightlyRateTry: 9800, paidTotalTry: 10000 },

      // ── Bugün Giriş Yapacaklar (CONFIRMED — 2026-11-23) ──
      { id: "trzm-otl-res-14", reservationNo: "OTL-2026-1014", roomId: "trzm-otl-rm-103", roomTypeId: "trzm-otl-rt-std", tariffId: "trzm-otl-trf-02", allotmentId: null, customerId: "trzm-otl-cust-08", channelSource: "DIRECT_WEB", agencyName: null, boardType: "BB", checkInDate: "2026-11-23T14:00:00.000Z", checkOutDate: "2026-11-26T12:00:00.000Z", nightsCount: 3, adultsCount: 2, childrenCount: 0, status: "CONFIRMED", nightlyRateTry: 3500, paidTotalTry: 0 },
      { id: "trzm-otl-res-15", reservationNo: "OTL-2026-1015", roomId: "trzm-otl-rm-308", roomTypeId: "trzm-otl-rt-fam", tariffId: "trzm-otl-trf-06", allotmentId: "trzm-otl-allot-04", customerId: "trzm-otl-cust-06", channelSource: "AGENCY_B2B", agencyName: "Örnek Kuzey Avrupa Aile Turları", boardType: "HB", checkInDate: "2026-11-23T14:00:00.000Z", checkOutDate: "2026-11-28T12:00:00.000Z", nightsCount: 5, adultsCount: 2, childrenCount: 2, status: "CONFIRMED", nightlyRateTry: 5600, paidTotalTry: 28000 },

      // ── Gelecek Rezervasyonlar (CONFIRMED / PENDING) ──
      { id: "trzm-otl-res-16", reservationNo: "OTL-2026-1016", roomId: "trzm-otl-rm-203", roomTypeId: "trzm-otl-rt-std", tariffId: "trzm-otl-trf-02", allotmentId: null, customerId: "trzm-otl-cust-04", channelSource: "OTA_BOOKING", agencyName: "Online Kanal (OTA)", boardType: "BB", checkInDate: "2026-11-26T14:00:00.000Z", checkOutDate: "2026-11-30T12:00:00.000Z", nightsCount: 4, adultsCount: 2, childrenCount: 0, status: "CONFIRMED", nightlyRateTry: 3500, paidTotalTry: 0 },
      { id: "trzm-otl-res-17", reservationNo: "OTL-2026-1017", roomId: "trzm-otl-rm-503", roomTypeId: "trzm-otl-rt-sui", tariffId: "trzm-otl-trf-07", allotmentId: null, customerId: "trzm-otl-cust-09", channelSource: "DIRECT_PHONE", agencyName: null, boardType: "FB", checkInDate: "2026-11-28T14:00:00.000Z", checkOutDate: "2026-12-02T12:00:00.000Z", nightsCount: 4, adultsCount: 2, childrenCount: 0, status: "PENDING", nightlyRateTry: 9800, paidTotalTry: 0 },

      // ── Geçmiş Tamamlanan Konaklamalar (90 Günlük Doluluk / ADR / RevPAR Geçmişi) ──
      { id: "trzm-otl-res-18", reservationNo: "OTL-2026-0910", roomId: "trzm-otl-rm-101", roomTypeId: "trzm-otl-rt-std", tariffId: "trzm-otl-trf-02", allotmentId: null, customerId: "trzm-otl-cust-02", channelSource: "DIRECT_WEB", agencyName: null, boardType: "BB", checkInDate: "2026-09-12T14:00:00.000Z", checkOutDate: "2026-09-22T12:00:00.000Z", nightsCount: 10, adultsCount: 2, childrenCount: 0, status: "CHECKED_OUT", nightlyRateTry: 3600, paidTotalTry: 36000 },
      { id: "trzm-otl-res-19", reservationNo: "OTL-2026-0945", roomId: "trzm-otl-rm-302", roomTypeId: "trzm-otl-rt-dlx", tariffId: "trzm-otl-trf-05", allotmentId: "trzm-otl-allot-02", customerId: "trzm-otl-cust-03", channelSource: "AGENCY_B2B", agencyName: "Örnek Ege Tatil & Incoming Acentası", boardType: "AI", checkInDate: "2026-10-03T14:00:00.000Z", checkOutDate: "2026-10-15T12:00:00.000Z", nightsCount: 12, adultsCount: 2, childrenCount: 1, status: "CHECKED_OUT", nightlyRateTry: 6900, paidTotalTry: 82800 },
      { id: "trzm-otl-res-20", reservationNo: "OTL-2026-0978", roomId: "trzm-otl-rm-407", roomTypeId: "trzm-otl-rt-fam", tariffId: "trzm-otl-trf-06", allotmentId: null, customerId: "trzm-otl-cust-05", channelSource: "OTA_BOOKING", agencyName: "Online Kanal (OTA)", boardType: "HB", checkInDate: "2026-10-20T14:00:00.000Z", checkOutDate: "2026-10-30T12:00:00.000Z", nightsCount: 10, adultsCount: 2, childrenCount: 2, status: "CHECKED_OUT", nightlyRateTry: 6850, paidTotalTry: 68500 },
      { id: "trzm-otl-res-21", reservationNo: "OTL-2026-0992", roomId: "trzm-otl-rm-504", roomTypeId: "trzm-otl-rt-sui", tariffId: "trzm-otl-trf-07", allotmentId: "trzm-otl-allot-03", customerId: "trzm-otl-cust-07", channelSource: "CORPORATE", agencyName: "Örnek Anadolu Sağlık Grubu", boardType: "FB", checkInDate: "2026-11-10T14:00:00.000Z", checkOutDate: "2026-11-22T12:00:00.000Z", nightsCount: 12, adultsCount: 2, childrenCount: 0, status: "CHECKED_OUT", nightlyRateTry: 9200, paidTotalTry: 110400 },

      // ── İptal ve No-Show ──
      { id: "trzm-otl-res-22", reservationNo: "OTL-2026-1018", roomId: "trzm-otl-rm-208", roomTypeId: "trzm-otl-rt-dlx", tariffId: "trzm-otl-trf-04", allotmentId: null, customerId: "trzm-otl-cust-09", channelSource: "OTA_BOOKING", agencyName: "Online Kanal (OTA)", boardType: "BB", checkInDate: "2026-11-25T14:00:00.000Z", checkOutDate: "2026-11-28T12:00:00.000Z", nightsCount: 3, adultsCount: 2, childrenCount: 0, status: "CANCELLED", nightlyRateTry: 4950, paidTotalTry: 0, cancelReason: "Uçuş tarih değişikliği nedeniyle ücretsiz iptal" },
      { id: "trzm-otl-res-23", reservationNo: "OTL-2026-1019", roomId: "trzm-otl-rm-108", roomTypeId: "trzm-otl-rt-std", tariffId: "trzm-otl-trf-01", allotmentId: null, customerId: "trzm-otl-cust-08", channelSource: "DIRECT_WEB", agencyName: null, boardType: "RO", checkInDate: "2026-11-18T14:00:00.000Z", checkOutDate: "2026-11-20T12:00:00.000Z", nightsCount: 2, adultsCount: 1, childrenCount: 0, status: "NO_SHOW", nightlyRateTry: 3100, paidTotalTry: 0, cancelReason: "Misafir giriş gününde gelmedi (No-Show)" },

      // ── Partner Firma (trzm-comp-otel-03) İzole Rezervasyonu ──
      { id: "trzm-otl-res-24", reservationNo: "PRT-OTL-2026-01", roomId: "trzm-otl-rm-b101", roomTypeId: "trzm-otl-rt-prt", tariffId: null, allotmentId: null, customerId: "trzm-otl-cust-04", channelSource: "DIRECT_WEB", agencyName: null, boardType: "BB", checkInDate: "2026-11-21T14:00:00.000Z", checkOutDate: "2026-11-26T12:00:00.000Z", nightsCount: 5, adultsCount: 2, childrenCount: 0, status: "CHECKED_IN", nightlyRateTry: 5400, paidTotalTry: 27000, ownerCompanyId: "trzm-comp-otel-03" },
    ]

    for (const r of reservationsSeed) {
      const roomTotalTry = Number((r.nightlyRateTry * r.nightsCount).toFixed(2))
      const extrasList = (r as any).extras || []
      const extrasTotalTry = extrasList.reduce((s: number, e: any) => s + Number(e.amt || 0), 0)
      const paidTotalTry = Number(r.paidTotalTry || 0)
      const balanceDueTry = Number(Math.max(0, roomTotalTry + extrasTotalTry - paidTotalTry).toFixed(2))
      const ownerId = (r as any).ownerCompanyId || MAIN_COMPANY_ID

      add("turizmHotelReservation", {
        id: r.id,
        reservationNo: r.reservationNo,
        branchId: defaultBranchId,
        roomId: r.roomId,
        roomTypeId: r.roomTypeId,
        tariffId: r.tariffId,
        allotmentId: r.allotmentId,
        customerId: r.customerId,
        channelSource: r.channelSource,
        agencyName: r.agencyName,
        boardType: r.boardType,
        checkInDate: r.checkInDate,
        checkOutDate: r.checkOutDate,
        nightsCount: r.nightsCount,
        adultsCount: r.adultsCount,
        childrenCount: r.childrenCount,
        actualCheckInAt: r.status === "CHECKED_IN" || r.status === "CHECKED_OUT" ? r.checkInDate : null,
        actualCheckOutAt: r.status === "CHECKED_OUT" ? r.checkOutDate : null,
        keyCardIssuedCode: r.status === "CHECKED_IN" ? `KEY-${r.roomId.slice(-3)}-2611` : null,
        status: r.status,
        nightlyRateTry: r.nightlyRateTry,
        roomTotalTry,
        extrasTotalTry,
        paidTotalTry,
        balanceDueTry,
        additionalGuestsJson: null,
        cancelReason: (r as any).cancelReason || null,
        conflictLockKey: `${r.roomId}:${r.checkInDate}:${r.checkOutDate}`,
        notes: (r as any).notes || null,
        ownerCompanyId: ownerId,
        createdBy: "turizm-faz3-seed",
        createdAt: now,
        updatedAt: now,
      })

      if (r.status !== "CANCELLED" && r.status !== "NO_SHOW") {
        // Konaklama Folio Kalemi
        add("turizmHotelFolioItem", {
          id: `${r.id}-fol-room`,
          entryNo: `FOL-ODA-${r.reservationNo.slice(-4)}`,
          reservationId: r.id,
          roomId: r.roomId,
          customerId: r.customerId,
          folioGroup: r.allotmentId ? "C_ACENTA_FATURASI" : "A_ANA_HESAP",
          entryCategory: "ROOM_NIGHT",
          isPayment: false,
          description: `Konaklama Bedeli (${r.nightsCount} Gece · ${r.boardType})`,
          inventoryItemId: null,
          stockMovementId: null,
          quantity: r.nightsCount,
          unitPriceTry: r.nightlyRateTry,
          amountTry: roomTotalTry,
          vatRatePct: 10,
          totalWithVatTry: roomTotalTry,
          paymentMethod: null,
          financeId: r.status === "CHECKED_OUT" ? `trzm-otl-fin-${r.id.slice(-2)}` : null,
          eDocumentId: null,
          eDocumentNo: r.status === "CHECKED_OUT" ? `EAR2026${r.reservationNo.slice(-4)}` : null,
          postedByUserId: "turizm-faz3-seed",
          postedAt: r.checkInDate,
          ownerCompanyId: ownerId,
          createdAt: now,
        })

        // Ekstra Folio Kalemleri (Minibar, Restoran, Çamaşırhane, Spa — Split Folio dahil)
        extrasList.forEach((ex: any, idx: number) => {
          add("turizmHotelFolioItem", {
            id: `${r.id}-fol-ex-${idx + 1}`,
            entryNo: `FOL-EX-${r.reservationNo.slice(-4)}-${idx + 1}`,
            reservationId: r.id,
            roomId: r.roomId,
            customerId: r.customerId,
            folioGroup: ex.grp || "A_ANA_HESAP",
            entryCategory: ex.cat,
            isPayment: false,
            description: ex.desc,
            inventoryItemId: ex.inv || null,
            stockMovementId: null,
            quantity: 1,
            unitPriceTry: ex.amt,
            amountTry: ex.amt,
            vatRatePct: 10,
            totalWithVatTry: ex.amt,
            paymentMethod: null,
            financeId: null,
            eDocumentId: null,
            eDocumentNo: null,
            postedByUserId: "turizm-faz3-seed",
            postedAt: now,
            ownerCompanyId: ownerId,
            createdAt: now,
          })
        })

        // Tahsilat Folio Kalemi
        if (paidTotalTry > 0) {
          add("turizmHotelFolioItem", {
            id: `${r.id}-fol-pay`,
            entryNo: `FOL-PAY-${r.reservationNo.slice(-4)}`,
            reservationId: r.id,
            roomId: r.roomId,
            customerId: r.customerId,
            folioGroup: r.allotmentId ? "C_ACENTA_FATURASI" : "A_ANA_HESAP",
            entryCategory: r.allotmentId ? "PAYMENT_TRANSFER" : "PAYMENT_CARD",
            isPayment: true,
            description: r.allotmentId ? "Acenta Cari Havale Tahsilatı" : "Kredi Kartı / Ön Ödeme Tahsilatı",
            inventoryItemId: null,
            stockMovementId: null,
            quantity: 1,
            unitPriceTry: paidTotalTry,
            amountTry: paidTotalTry,
            vatRatePct: 0,
            totalWithVatTry: paidTotalTry,
            paymentMethod: r.allotmentId ? "Havale / EFT" : "Kredi Kartı",
            financeId: null,
            eDocumentId: null,
            eDocumentNo: null,
            postedByUserId: "turizm-faz3-seed",
            postedAt: now,
            ownerCompanyId: ownerId,
            createdAt: now,
          })
        }

        // Tamamlanan Konaklamalar için Finance Gelir Kaydı
        if (r.status === "CHECKED_OUT") {
          add("finance", {
            id: `trzm-otl-fin-${r.id.slice(-2)}`,
            branchId: defaultBranchId,
            type: "INCOME",
            amount: roomTotalTry,
            category: "Otel Konaklama & Folio Geliri",
            description: `Otel Konaklama Faturası (${r.reservationNo})`,
            status: "approved",
            approvedBy: "turizm-faz3-seed",
            date: r.checkOutDate,
            createdAt: now,
            updatedAt: now,
          })
        }
      }
    }

    // ── 9. HOUSEKEEPING & TEKNİK ARIZA GÖREVLERİ (10 Görev — 2 Temizlik Personeline Dağıtılmış) ──
    const hkTasksSeed = [
      { id: "trzm-otl-hk-01", taskNo: "HK-105-001", roomId: "trzm-otl-rm-105", roomNumber: "105", floorNumber: 1, taskType: "CHECKOUT_CLEANING", priority: "HIGH", status: "PENDING", assignedToUserId: "trzm-otl-user-hk1", assignedToName: "Ayşe Demir (Kat 1-3 Temizlik Personeli)", notes: "Check-out sonrası yeni giriş için öncelikli temizlik." },
      { id: "trzm-otl-hk-02", taskNo: "HK-106-002", roomId: "trzm-otl-rm-106", roomNumber: "106", floorNumber: 1, taskType: "CHECKOUT_CLEANING", priority: "NORMAL", status: "IN_PROGRESS", assignedToUserId: "trzm-otl-user-hk1", assignedToName: "Ayşe Demir (Kat 1-3 Temizlik Personeli)", notes: "Temizlik sürüyor; minibar sayımı eklenecek." },
      { id: "trzm-otl-hk-03", taskNo: "HK-107-003", roomId: "trzm-otl-rm-107", roomNumber: "107", floorNumber: 1, taskType: "CHECKOUT_CLEANING", priority: "NORMAL", status: "COMPLETED", assignedToUserId: "trzm-otl-user-hk1", assignedToName: "Ayşe Demir (Kat 1-3 Temizlik Personeli)", notes: "Temizlik tamamlandı, kat şefi denetimi bekliyor." },
      { id: "trzm-otl-hk-04", taskNo: "HK-206-004", roomId: "trzm-otl-rm-206", roomNumber: "206", floorNumber: 2, taskType: "CHECKOUT_CLEANING", priority: "HIGH", status: "PENDING", assignedToUserId: "trzm-otl-user-hk1", assignedToName: "Ayşe Demir (Kat 1-3 Temizlik Personeli)", notes: "Öğleden sonra grup girişi öncesi hazırlanacak." },
      { id: "trzm-otl-hk-05", taskNo: "HK-207-005", roomId: "trzm-otl-rm-207", roomNumber: "207", floorNumber: 2, taskType: "STAYOVER_CLEANING", priority: "NORMAL", status: "IN_PROGRESS", assignedToUserId: "trzm-otl-user-hk1", assignedToName: "Ayşe Demir (Kat 1-3 Temizlik Personeli)", notes: "Günlük havlu ve çarşaf yenileme." },
      { id: "trzm-otl-hk-06", taskNo: "HK-304-006", roomId: "trzm-otl-rm-304", roomNumber: "304", floorNumber: 3, taskType: "CHECKOUT_CLEANING", priority: "HIGH", status: "PENDING", assignedToUserId: "trzm-otl-user-hk1", assignedToName: "Ayşe Demir (Kat 1-3 Temizlik Personeli)", notes: "Deluxe oda çıkış temizliği." },
      { id: "trzm-otl-hk-07", taskNo: "HK-405-007", roomId: "trzm-otl-rm-405", roomNumber: "405", floorNumber: 4, taskType: "CHECKOUT_CLEANING", priority: "HIGH", status: "PENDING", assignedToUserId: "trzm-otl-user-hk2", assignedToName: "Fatma Yılmaz (Kat 4-5 Temizlik Personeli)", notes: "Kat 4 çıkış temizliği ve minibar ikmali." },
      { id: "trzm-otl-hk-08", taskNo: "HK-406-008", roomId: "trzm-otl-rm-406", roomNumber: "406", floorNumber: 4, taskType: "DEEP_CLEANING", priority: "NORMAL", status: "IN_PROGRESS", assignedToUserId: "trzm-otl-user-hk2", assignedToName: "Fatma Yılmaz (Kat 4-5 Temizlik Personeli)", notes: "Aylık detaylı perde & halı bakımı." },
      { id: "trzm-otl-hk-09", taskNo: "HK-505-009", roomId: "trzm-otl-rm-505", roomNumber: "505", floorNumber: 5, taskType: "CHECKOUT_CLEANING", priority: "HIGH", status: "INSPECTED", assignedToUserId: "trzm-otl-user-hk2", assignedToName: "Fatma Yılmaz (Kat 4-5 Temizlik Personeli)", inspectedByName: "Kat Şefi Onayı", notes: "Süit temizliği denetlendi ve onaylandı." },
      { id: "trzm-otl-hk-10", taskNo: "ARZ-310-010", roomId: "trzm-otl-rm-310", roomNumber: "310", floorNumber: 3, taskType: "TECHNICAL_FAULT", priority: "URGENT", status: "IN_PROGRESS", assignedToUserId: "trzm-otl-user-hk2", assignedToName: "Fatma Yılmaz (Kat 4-5 Temizlik Personeli)", faultCategory: "KLIMA_HVAC", faultDescription: "Klima kompresörü soğutma yapmıyor; oda OUT_OF_ORDER işaretlendi.", notes: "Teknik servis parça değişimi bekliyor." },
    ]
    for (const t of hkTasksSeed) {
      add("turizmHotelHousekeepingTask", {
        ...t,
        reservationId: null,
        inspectedByUserId: t.status === "INSPECTED" ? "admin" : null,
        inspectedByName: (t as any).inspectedByName || null,
        checklistJson: JSON.stringify([
          { key: "linen", label: "Çarşaf ve havlu değişimi", done: t.status === "COMPLETED" || t.status === "INSPECTED" },
          { key: "bathroom", label: "Banyo dezenfeksiyon & buklet yenileme", done: t.status === "COMPLETED" || t.status === "INSPECTED" },
          { key: "minibar", label: "Minibar sayım ve ikmal kontrolü", done: t.status === "INSPECTED" },
          { key: "vacuum", label: "Zemin & yüzey temizliği", done: t.status === "COMPLETED" || t.status === "INSPECTED" },
        ]),
        minibarCountJson: null,
        faultCategory: (t as any).faultCategory || null,
        faultDescription: (t as any).faultDescription || null,
        offlineIdempotencyKey: null,
        startedAt: t.status !== "PENDING" ? now : null,
        completedAt: t.status === "COMPLETED" || t.status === "INSPECTED" ? now : null,
        inspectedAt: t.status === "INSPECTED" ? now : null,
        ownerCompanyId: MAIN_COMPANY_ID,
        createdAt: now,
        updatedAt: now,
      })
    }

    // ── 10. KBS KİMLİK BİLDİRİMİ HAZIRLIK KAYITLARI (8 Kayıt — 4 Farklı Durum) ─
    const kbsSeed = [
      { id: "trzm-otl-kbs-01", kbsRefNo: "KBS-OTL-1001-GRS", reservationId: "trzm-otl-res-01", roomId: "trzm-otl-rm-101", roomNumber: "101", customerId: "trzm-otl-cust-01", notificationType: "MISAFIR_GIRIS", guestFullName: "Kaan Özdemir", guestTcknMasked: "21*******10", guestPassportMasked: null, guestNationality: "TR", guestBirthYear: 1986, preparationStatus: "GONDERILDI_MANUEL", exportedFormat: "XML_SABLON", isPayloadComplete: true, missingFields: [] },
      { id: "trzm-otl-kbs-02", kbsRefNo: "KBS-OTL-1002-GRS", reservationId: "trzm-otl-res-02", roomId: "trzm-otl-rm-102", roomNumber: "102", customerId: "trzm-otl-cust-03", notificationType: "MISAFIR_GIRIS", guestFullName: "Lukas Weber", guestTcknMasked: null, guestPassportMasked: "C0*****21", guestNationality: "DE", guestBirthYear: 1983, preparationStatus: "HAZIRLANDI", exportedFormat: null, isPayloadComplete: true, missingFields: [] },
      { id: "trzm-otl-kbs-03", kbsRefNo: "KBS-OTL-1003-GRS", reservationId: "trzm-otl-res-03", roomId: "trzm-otl-rm-104", roomNumber: "104", customerId: "trzm-otl-cust-10", notificationType: "MISAFIR_GIRIS", guestFullName: "Serkan Bulut", guestTcknMasked: null, guestPassportMasked: null, guestNationality: "TR", guestBirthYear: null, preparationStatus: "EKSIK_VERI", exportedFormat: null, isPayloadComplete: false, missingFields: ["TCKN veya Pasaport Numarası", "Doğum Tarihi"], lastErrorNote: "Misafir kimlik/doğum tarihi check-in kartından tamamlanmalıdır." },
      { id: "trzm-otl-kbs-04", kbsRefNo: "KBS-OTL-1004-GRS", reservationId: "trzm-otl-res-04", roomId: "trzm-otl-rm-201", roomNumber: "201", customerId: "trzm-otl-cust-02", notificationType: "MISAFIR_GIRIS", guestFullName: "Merve Aydın", guestTcknMasked: "34*******22", guestPassportMasked: null, guestNationality: "TR", guestBirthYear: 1991, preparationStatus: "GONDERILDI_MANUEL", exportedFormat: "CSV", isPayloadComplete: true, missingFields: [] },
      { id: "trzm-otl-kbs-05", kbsRefNo: "KBS-OTL-1005-GRS", reservationId: "trzm-otl-res-05", roomId: "trzm-otl-rm-202", roomNumber: "202", customerId: "trzm-otl-cust-04", notificationType: "MISAFIR_GIRIS", guestFullName: "Sophie Laurent", guestTcknMasked: null, guestPassportMasked: "19*****10", guestNationality: "FR", guestBirthYear: 1990, preparationStatus: "HAZIRLANDI", exportedFormat: null, isPayloadComplete: true, missingFields: [] },
      { id: "trzm-otl-kbs-06", kbsRefNo: "KBS-OTL-1007-GRS", reservationId: "trzm-otl-res-07", roomId: "trzm-otl-rm-301", roomNumber: "301", customerId: "trzm-otl-cust-05", notificationType: "MISAFIR_GIRIS", guestFullName: "Oliver Bennett", guestTcknMasked: null, guestPassportMasked: "54*****02", guestNationality: "GB", guestBirthYear: 1979, preparationStatus: "HATALI", exportedFormat: null, isPayloadComplete: true, missingFields: [], lastErrorNote: "Manuel portal aktarımında pasaport harf kodu düzeltmesi istendi — yeniden denenecek." },
      { id: "trzm-otl-kbs-07", kbsRefNo: "KBS-OTL-1012-GRS", reservationId: "trzm-otl-res-12", roomId: "trzm-otl-rm-501", roomNumber: "501", customerId: "trzm-otl-cust-05", notificationType: "MISAFIR_GIRIS", guestFullName: "Oliver Bennett", guestTcknMasked: null, guestPassportMasked: "54*****02", guestNationality: "GB", guestBirthYear: 1979, preparationStatus: "HAZIRLANDI", exportedFormat: null, isPayloadComplete: true, missingFields: [] },
      { id: "trzm-otl-kbs-08", kbsRefNo: "KBS-OTL-0992-CKS", reservationId: "trzm-otl-res-21", roomId: "trzm-otl-rm-504", roomNumber: "504", customerId: "trzm-otl-cust-07", notificationType: "MISAFIR_CIKIS", guestFullName: "Zeynep Karahan", guestTcknMasked: "45*******56", guestPassportMasked: null, guestNationality: "TR", guestBirthYear: 1984, preparationStatus: "GONDERILDI_MANUEL", exportedFormat: "XML_SABLON", isPayloadComplete: true, missingFields: [] },
    ]
    for (const k of kbsSeed) {
      add("turizmHotelKbsRecord", {
        id: k.id,
        kbsRefNo: k.kbsRefNo,
        reservationId: k.reservationId,
        roomId: k.roomId,
        roomNumber: k.roomNumber,
        customerId: k.customerId,
        notificationType: k.notificationType,
        guestFullName: k.guestFullName,
        guestTcknMasked: k.guestTcknMasked,
        guestPassportMasked: k.guestPassportMasked,
        guestNationality: k.guestNationality,
        guestBirthYear: k.guestBirthYear,
        checkInAt: "2026-11-21T14:00:00.000Z",
        expectedCheckOutAt: "2026-11-25T12:00:00.000Z",
        actualCheckOutAt: k.notificationType === "MISAFIR_CIKIS" ? "2026-11-22T12:00:00.000Z" : null,
        missingFieldsJson: JSON.stringify(k.missingFields),
        isPayloadComplete: k.isPayloadComplete,
        preparationStatus: k.preparationStatus,
        exportedFormat: k.exportedFormat,
        lastExportedAt: k.exportedFormat ? now : null,
        retryCount: k.preparationStatus === "HATALI" ? 1 : 0,
        lastErrorNote: (k as any).lastErrorNote || null,
        preparedPayloadJson: JSON.stringify({ kbsRefNo: k.kbsRefNo, roomNumber: k.roomNumber }),
        notes: "Resmî KBS (EGMSEC / Jandarma Tesis 2) dışa aktarma şablonu — canlı kurum bağlantısı kurulmaz.",
        ownerCompanyId: MAIN_COMPANY_ID,
        createdAt: now,
        updatedAt: now,
      })
    }

    // ── 11. REDDEDİLEN ÇAKIŞMA & KONTENJAN AŞIM GÜNLÜĞÜ (3 Kayıt) ─────────────
    const conflictLogsSeed = [
      {
        id: "trzm-otl-cnf-01",
        roomId: "trzm-otl-rm-101",
        roomNumber: "101",
        attemptedCheckIn: "2026-11-22T14:00:00.000Z",
        attemptedCheckOut: "2026-11-24T12:00:00.000Z",
        conflictingSourceType: "RESERVATION",
        conflictingSourceId: "trzm-otl-res-01",
        conflictingRefNo: "OTL-2026-1001",
        customerId: "trzm-otl-cust-08",
        rejectionCode: "ROOM_DOUBLE_BOOKING_LOCKED",
        rejectionMessage: "Çift rezervasyon engellendi: 101 numaralı oda OTL-2026-1001 ile doludur.",
        actorUserId: "turizm-faz3-seed",
        ownerCompanyId: MAIN_COMPANY_ID,
        attemptedAt: "2026-11-22T11:15:00.000Z",
      },
      {
        id: "trzm-otl-cnf-02",
        roomId: "trzm-otl-rm-310",
        roomNumber: "310",
        attemptedCheckIn: "2026-11-24T14:00:00.000Z",
        attemptedCheckOut: "2026-11-27T12:00:00.000Z",
        conflictingSourceType: "ROOM_MAINTENANCE",
        conflictingSourceId: "trzm-otl-rm-310",
        conflictingRefNo: "ODA-310",
        customerId: "trzm-otl-cust-06",
        rejectionCode: "ROOM_OUT_OF_ORDER",
        rejectionMessage: "310 numaralı oda OUT_OF_ORDER (Klima arızası) durumunda olduğundan rezerve edilemedi.",
        actorUserId: "turizm-faz3-seed",
        ownerCompanyId: MAIN_COMPANY_ID,
        attemptedAt: "2026-11-22T15:40:00.000Z",
      },
      {
        id: "trzm-otl-cnf-03",
        roomId: "trzm-otl-rm-302",
        roomNumber: "302",
        attemptedCheckIn: "2026-11-23T14:00:00.000Z",
        attemptedCheckOut: "2026-11-26T12:00:00.000Z",
        conflictingSourceType: "ALLOTMENT_OVERFLOW",
        conflictingSourceId: "trzm-otl-allot-02",
        conflictingRefNo: "KNT-EGE-DLX",
        customerId: "trzm-otl-cust-04",
        rejectionCode: "ALLOTMENT_EXCEEDED",
        rejectionMessage: "Örnek Ege Tatil Acentası (KNT-EGE-DLX) için ilgili tarih aralığında kontenjan aşımı engellendi.",
        actorUserId: "turizm-faz3-seed",
        ownerCompanyId: MAIN_COMPANY_ID,
        attemptedAt: "2026-11-22T18:05:00.000Z",
      },
    ]
    for (const cnf of conflictLogsSeed) add("turizmHotelConflictAttemptLog", cnf)

    notes.push(
      "Turizm Faz 3 Otel (Mini PMS) kurgusal demo verisi işlendi: 50 ana oda + 2 partner odası, 5 oda tipi, 8 tarife, 4 minibar stok ürünü, 4 acenta kontenjanı, 10 misafir, 24 rezervasyon, 10 housekeeping/arıza görevi, 2 kısıtlı temizlik personeli, 8 KBS hazırlık kaydı ve 3 çakışma günlüğü."
    )

    return {
      moduleKey: "turizm_faz3_otel_pms",
      inserted,
      skippedExisting,
      notes,
    }
  },
}
