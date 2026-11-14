/**
 * Lojistik Faz 2 (WMS Derinleştirmesi) — İdempotent & Geri Alınabilir Demo Seed Modülü
 *
 * Kurallar:
 * - Yalnızca DEMO ortamında (assertLogisticsDemoSeedAllowed) çalışır.
 * - Pre-existing kayıtları bozmaz; yalnızca bilinen bozuk Faz 0 verilerini güvenli
 *   onarma (`repairAnomalies`) ve yeni `f2-*` ID'li Faz 2 WMS verilerini ekler.
 * - `rollbackLogisticsDemoSeed` ile tüm `f2-*` kayıtları tek komutta temizlenir.
 */

import type { LogisticsSeedModule } from "./framework"
import { generateSscc18Code } from "../wms/constantsAndHelpers"

const SEEDED_ZONE_IDS = [
  "f2-zone-qar-01",
  "f2-zone-ship-01",
  "f2-zone-onl-01",
  "f2-zone-xd-01",
] as const

const SEEDED_BIN_IDS = [
  "f2-bin-mrk-cold-a2",
  "f2-bin-mrk-fast-f1",
  "f2-bin-mrk-qar-q1",
  "f2-bin-mrk-rma-r1",
  "f2-bin-mrk-ship-s1",
  "f2-bin-mrk-xd-x1",
  "f2-bin-onl-e1",
  "f2-bin-kdk-b2",
] as const

const SEEDED_LOT_IDS = [
  "f2-lot-gul-nov20",
  "f2-lot-gul-dec05",
  "f2-lot-gul-quar",
  "f2-lot-lil-nov22",
  "f2-lot-vaz-2611",
] as const

const SEEDED_BALANCE_IDS = [
  "f2-bal-gul-cold-a2",
  "f2-bal-gul-fast-f1",
  "f2-bal-gul-quar-q1",
  "f2-bal-lil-cold-a2",
  "f2-bal-vaz-onl-e1",
  "f2-bal-ork-kdk-b2",
] as const

const SEEDED_UNIT_CONV_IDS = [
  "f2-uconv-gul-palet",
  "f2-uconv-vaz-kutu",
  "f2-uconv-vaz-koli",
  "f2-uconv-vaz-palet",
] as const

const SEEDED_DIRECTIVE_IDS = [
  "f2-dir-putaway-cold",
  "f2-dir-putaway-fast",
  "f2-dir-putaway-dry",
] as const

const SEEDED_LPN_IDS = [
  "f2-lpn-palet-01",
  "f2-lpn-palet-02",
  "f2-lpn-koli-03",
] as const

const SEEDED_LPN_CONTENT_IDS = [
  "f2-lpnc-01",
  "f2-lpnc-02",
  "f2-lpnc-03",
] as const

const SEEDED_RESERVATION_IDS = [
  "f2-res-01",
  "f2-res-02",
] as const

const SEEDED_TASK_IDS = [
  "f2-task-put-01",
  "f2-task-wave-02",
  "f2-task-wave-late-03",
  "f2-task-done-04",
  "f2-task-done-05",
] as const

const SEEDED_TASK_LINE_IDS = [
  "f2-tline-01",
  "f2-tline-02",
  "f2-tline-03",
  "f2-tline-04",
  "f2-tline-05",
] as const

const SEEDED_TRANSFER_IDS = [
  "f2-trf-disc-01",
  "f2-trf-transit-02",
] as const

const SEEDED_TRANSFER_LINE_IDS = [
  "f2-tfln-01",
  "f2-tfln-02",
] as const

const SEEDED_COUNT_SESSION_IDS = [
  "f2-cnt-open-01",
  "f2-cnt-pending-02",
] as const

const SEEDED_COUNT_LINE_IDS = [
  "f2-cntln-01",
  "f2-cntln-02",
  "f2-cntln-03",
] as const

const SEEDED_CROSS_DOCK_IDS = [
  "f2-xd-01",
  "f2-xd-02",
] as const

const SEEDED_KIT_ORDER_IDS = [
  "f2-kit-01",
  "f2-kit-02",
] as const

const SEEDED_KIT_COMP_IDS = [
  "f2-kitc-01",
  "f2-kitc-02",
  "f2-kitc-03",
] as const

const SEEDED_RFID_IDS = [
  "f2-rfid-01",
  "f2-rfid-02",
  "f2-rfid-03",
] as const

const SEEDED_MOVEMENT_IDS = [
  "f2-mov-aug-01",
  "f2-mov-sep-02",
  "f2-mov-oct-03",
  "f2-mov-nov-04",
  "f2-mov-nov-05",
  "f2-mov-nov-06",
] as const

const SEEDED_SYNC_LOG_IDS = [
  "f2-sync-01",
  "f2-sync-02",
] as const

function pushIfMissing(db: Record<string, any[]>, collection: string, record: any): number {
  if (!Array.isArray(db[collection])) db[collection] = []
  const exists = db[collection].some((r) => String(r?.id) === String(record.id))
  if (exists) return 0
  db[collection].push(record)
  return 1
}

export const faz2WmsDeepeningSeedModule: LogisticsSeedModule = {
  moduleKey: "faz2_wms_derinlestirme",
  phase: 2,
  seededIdsByCollection: {
    warehouseZone: SEEDED_ZONE_IDS,
    storageBin: SEEDED_BIN_IDS,
    lotSerialRecord: SEEDED_LOT_IDS,
    stockBalance: SEEDED_BALANCE_IDS,
    unitConversion: SEEDED_UNIT_CONV_IDS,
    locationDirective: SEEDED_DIRECTIVE_IDS,
    licensePlate: SEEDED_LPN_IDS,
    licensePlateContent: SEEDED_LPN_CONTENT_IDS,
    lojistikStockReservation: SEEDED_RESERVATION_IDS,
    wmsTask: SEEDED_TASK_IDS,
    wmsTaskLine: SEEDED_TASK_LINE_IDS,
    warehouseTransferOrder: SEEDED_TRANSFER_IDS,
    transferOrderLine: SEEDED_TRANSFER_LINE_IDS,
    inventoryCountSession: SEEDED_COUNT_SESSION_IDS,
    inventoryCountLine: SEEDED_COUNT_LINE_IDS,
    lojistikCrossDockOrder: SEEDED_CROSS_DOCK_IDS,
    lojistikKitOrder: SEEDED_KIT_ORDER_IDS,
    lojistikKitOrderComponent: SEEDED_KIT_COMP_IDS,
    lojistikRfidTagEvent: SEEDED_RFID_IDS,
    stockMovement: SEEDED_MOVEMENT_IDS,
    wmsOfflineSyncLog: SEEDED_SYNC_LOG_IDS,
  },

  /**
   * Bilinen Faz 0 JSON veritabanı tutarsızlıklarını tek seferlik ve idempotent biçimde onarır.
   */
  repairAnomalies(db) {
    let fixed = 0

    // 1) item-ork-05 üzerinde kalan { increment: 5 } objesini sayısal değere çevir
    if (Array.isArray(db.stockBalance)) {
      for (const sb of db.stockBalance) {
        if (sb && typeof sb.onHandQty === "object" && sb.onHandQty !== null) {
          const val = Number(sb.onHandQty.increment ?? 5)
          sb.onHandQty = val
          sb.reservedQty = Number(sb.reservedQty ?? 0)
          sb.availableQty = Math.max(0, val - sb.reservedQty)
          sb.updatedAt = "2026-11-14T10:00:00.000Z"
          fixed++
        }
      }
    }

    // 2) Bölge ID uyuşmazlığı olan Faz 0 raflarını gerçek zone-*-01 ID'lerine bağla
    const zoneRemap: Record<string, string> = {
      "zone-cold": "zone-cold-01",
      "zone-dry": "zone-dry-01",
      "zone-store": "zone-kdk-01",
    }
    if (Array.isArray(db.storageBin)) {
      for (const bin of db.storageBin) {
        if (bin?.zoneId && zoneRemap[bin.zoneId]) {
          bin.zoneId = zoneRemap[bin.zoneId]
          fixed++
        }
      }
    }

    // 3) Aynı görünen wh-atolye-03 adını wh-online-03'ten ayrıştır
    if (Array.isArray(db.warehouse)) {
      const atolye = db.warehouse.find((w: any) => w?.id === "wh-atolye-03")
      if (atolye && atolye.name === "E-Ticaret & Hızlı Dağıtım Hub") {
        atolye.name = "Ataşehir Tasarım & Buket Atölyesi"
        fixed++
      }
    }

    return fixed
  },

  seed(db) {
    const now = "2026-11-14T09:00:00.000Z"
    const inserted: Record<string, number> = {}
    const notes: string[] = []
    let skippedExisting = 0

    const track = (col: string, rec: any) => {
      const added = pushIfMissing(db, col, rec)
      inserted[col] = (inserted[col] || 0) + added
      if (added === 0) skippedExisting++
    }

    // 1. Faz 2 Bölge Katmanı (Karantina/RMA, Sevkiyat Rampası, Cross-Dock, Online Hub)
    track("warehouseZone", {
      id: "f2-zone-qar-01",
      createdAt: now,
      updatedAt: now,
      isActive: true,
      warehouseId: "wh-merkez-01",
      code: "Z-KARANTINA",
      name: "Karantina, Hasar & İade RMA Alanı",
      zoneType: "QUARANTINE",
      temperatureMin: 4,
      temperatureMax: 12,
      humidityMax: 75,
    })
    track("warehouseZone", {
      id: "f2-zone-ship-01",
      createdAt: now,
      updatedAt: now,
      isActive: true,
      warehouseId: "wh-merkez-01",
      code: "Z-SEVKIYAT",
      name: "Sevkiyat Çıkış & Soğuk Zincir Yükleme",
      zoneType: "SHIPPING",
      temperatureMin: 6,
      temperatureMax: 10,
      humidityMax: 70,
    })
    track("warehouseZone", {
      id: "f2-zone-xd-01",
      createdAt: now,
      updatedAt: now,
      isActive: true,
      warehouseId: "wh-merkez-01",
      code: "Z-CROSSDOCK",
      name: "Cross-Docking Doğrudan Aktarma Koridoru",
      zoneType: "RECEIVING",
      temperatureMin: 8,
      temperatureMax: 14,
      humidityMax: 70,
    })
    track("warehouseZone", {
      id: "f2-zone-onl-01",
      createdAt: now,
      updatedAt: now,
      isActive: true,
      warehouseId: "wh-online-03",
      code: "Z-ONL-FAST",
      name: "E-Ticaret Paketleme & Hızlı Çıkış",
      zoneType: "FAST_PICK",
      temperatureMin: 12,
      temperatureMax: 18,
      humidityMax: 60,
    })

    // 2. 7 Lokasyon Rolünü Kapsayan Hücreler (COLD_STORAGE, FAST_PICK, QUARANTINE, RETURN_RMA, SHIPPING, CROSS_DOCK, NORMAL)
    const f2Bins = [
      {
        id: "f2-bin-mrk-cold-a2",
        warehouseId: "wh-merkez-01",
        zoneId: "zone-cold-01",
        code: "A-02-01",
        aisle: "A",
        rack: "02",
        level: "01",
        binPosition: "Soğuk Raf FEFO Alt",
        binType: "COLD_CELL",
        binRole: "COLD_STORAGE",
        abcVelocity: "A",
        maxWeightKg: 800,
        currentWeightKg: 210,
        maxVolumeM3: 3.2,
        currentVolumeM3: 1.4,
        occupancyPercent: 44,
        isBlocked: false,
      },
      {
        id: "f2-bin-mrk-fast-f1",
        warehouseId: "wh-merkez-01",
        zoneId: "zone-fast-01",
        code: "F-01-01",
        aisle: "F",
        rack: "01",
        level: "01",
        binPosition: "Hızlı Toplama Ön Raf",
        binType: "PICK_FACE",
        binRole: "FAST_PICK",
        abcVelocity: "A",
        maxWeightKg: 450,
        currentWeightKg: 140,
        maxVolumeM3: 2.0,
        currentVolumeM3: 0.9,
        occupancyPercent: 45,
        isBlocked: false,
      },
      {
        id: "f2-bin-mrk-qar-q1",
        warehouseId: "wh-merkez-01",
        zoneId: "f2-zone-qar-01",
        code: "Q-01-01",
        aisle: "Q",
        rack: "01",
        level: "01",
        binPosition: "Karantina İnceleme Gözü",
        binType: "QUARANTINE",
        binRole: "QUARANTINE",
        abcVelocity: "C",
        maxWeightKg: 500,
        currentWeightKg: 60,
        maxVolumeM3: 2.0,
        currentVolumeM3: 0.4,
        occupancyPercent: 20,
        isBlocked: false,
      },
      {
        id: "f2-bin-mrk-rma-r1",
        warehouseId: "wh-merkez-01",
        zoneId: "f2-zone-qar-01",
        code: "RMA-01-01",
        aisle: "R",
        rack: "01",
        level: "02",
        binPosition: "Müşteri İade Kabul Gözü",
        binType: "RETURN_RMA",
        binRole: "RETURN_RMA",
        abcVelocity: "C",
        maxWeightKg: 400,
        currentWeightKg: 20,
        maxVolumeM3: 1.8,
        currentVolumeM3: 0.2,
        occupancyPercent: 11,
        isBlocked: false,
      },
      {
        id: "f2-bin-mrk-ship-s1",
        warehouseId: "wh-merkez-01",
        zoneId: "f2-zone-ship-01",
        code: "SHP-01-01",
        aisle: "S",
        rack: "01",
        level: "01",
        binPosition: "Soğutmalı Sevkiyat Kapısı #1",
        binType: "SHIPPING_DOCK",
        binRole: "SHIPPING",
        abcVelocity: "A",
        maxWeightKg: 2000,
        currentWeightKg: 420,
        maxVolumeM3: 8.0,
        currentVolumeM3: 2.1,
        occupancyPercent: 26,
        isBlocked: false,
      },
      {
        id: "f2-bin-mrk-xd-x1",
        warehouseId: "wh-merkez-01",
        zoneId: "f2-zone-xd-01",
        code: "XD-01-01",
        aisle: "X",
        rack: "01",
        level: "01",
        binPosition: "Cross-Dock Doğrudan Koridor",
        binType: "CROSS_DOCK",
        binRole: "CROSS_DOCK",
        abcVelocity: "A",
        maxWeightKg: 1500,
        currentWeightKg: 180,
        maxVolumeM3: 6.0,
        currentVolumeM3: 0.8,
        occupancyPercent: 13,
        isBlocked: false,
      },
      {
        id: "f2-bin-onl-e1",
        warehouseId: "wh-online-03",
        zoneId: "f2-zone-onl-01",
        code: "E-01-01",
        aisle: "E",
        rack: "01",
        level: "01",
        binPosition: "E-Ticaret Vazo & Buket Rafı",
        binType: "STANDARD",
        binRole: "NORMAL",
        abcVelocity: "A",
        maxWeightKg: 600,
        currentWeightKg: 195,
        maxVolumeM3: 2.4,
        currentVolumeM3: 1.1,
        occupancyPercent: 46,
        isBlocked: false,
      },
      {
        id: "f2-bin-kdk-b2",
        warehouseId: "wh-kadikoy-02",
        zoneId: "zone-kdk-01",
        code: "M-02-01",
        aisle: "M",
        rack: "02",
        level: "01",
        binPosition: "Kadıköy Soğuk Vitrin Arka",
        binType: "STANDARD",
        binRole: "COLD_STORAGE",
        abcVelocity: "B",
        maxWeightKg: 350,
        currentWeightKg: 85,
        maxVolumeM3: 1.6,
        currentVolumeM3: 0.5,
        occupancyPercent: 31,
        isBlocked: false,
      },
    ]
    for (const b of f2Bins) {
      track("storageBin", { ...b, createdAt: now, updatedAt: now, isActive: true, allowMixedSku: true })
    }

    // 3. FEFO / FIFO & Karantina Testini Destekleyen Lot / SKT Kayıtları (Kasım–Aralık 2026)
    track("lotSerialRecord", {
      id: "f2-lot-gul-nov20",
      createdAt: "2026-11-12T08:00:00.000Z",
      updatedAt: "2026-11-14T08:00:00.000Z",
      isActive: true,
      itemId: "item-gul-01",
      warehouseId: "wh-merkez-01",
      lotNumber: "LOT-GUL-2611-EARLY",
      manufacturingDate: "2026-11-11T08:00:00.000Z",
      expiryDate: "2026-11-20T23:59:59.000Z",
      supplierName: "Royal Holland Flora",
      initialQty: 60,
      remainingQty: 60,
      unitCost: 245,
      status: "AVAILABLE",
      qcStatus: "PASSED",
    })
    track("lotSerialRecord", {
      id: "f2-lot-gul-dec05",
      createdAt: "2026-11-13T10:00:00.000Z",
      updatedAt: "2026-11-14T08:00:00.000Z",
      isActive: true,
      itemId: "item-gul-01",
      warehouseId: "wh-merkez-01",
      lotNumber: "LOT-GUL-2612-LATE",
      manufacturingDate: "2026-11-13T08:00:00.000Z",
      expiryDate: "2026-12-05T23:59:59.000Z",
      supplierName: "Antalya Kesme Çiçek A.Ş.",
      initialQty: 40,
      remainingQty: 40,
      unitCost: 240,
      status: "AVAILABLE",
      qcStatus: "PASSED",
    })
    track("lotSerialRecord", {
      id: "f2-lot-gul-quar",
      createdAt: "2026-11-13T11:00:00.000Z",
      updatedAt: "2026-11-14T08:00:00.000Z",
      isActive: true,
      itemId: "item-gul-01",
      warehouseId: "wh-merkez-01",
      lotNumber: "LOT-GUL-2611-QAR",
      manufacturingDate: "2026-11-09T08:00:00.000Z",
      expiryDate: "2026-11-17T23:59:59.000Z",
      supplierName: "Royal Holland Flora",
      initialQty: 12,
      remainingQty: 12,
      unitCost: 245,
      status: "QUARANTINE",
      qcStatus: "FAILED",
    })
    track("lotSerialRecord", {
      id: "f2-lot-lil-nov22",
      createdAt: "2026-11-13T09:00:00.000Z",
      updatedAt: "2026-11-14T08:00:00.000Z",
      isActive: true,
      itemId: "item-lil-02",
      warehouseId: "wh-merkez-01",
      lotNumber: "LOT-LIL-2611-FRESH",
      manufacturingDate: "2026-11-13T06:00:00.000Z",
      expiryDate: "2026-11-22T23:59:59.000Z",
      supplierName: "Yalova Çiçek Kooperatifi",
      initialQty: 45,
      remainingQty: 45,
      unitCost: 130,
      status: "AVAILABLE",
      qcStatus: "PASSED",
    })
    track("lotSerialRecord", {
      id: "f2-lot-vaz-2611",
      createdAt: "2026-10-25T09:00:00.000Z",
      updatedAt: "2026-11-14T08:00:00.000Z",
      isActive: true,
      itemId: "item-vaz-03",
      warehouseId: "wh-online-03",
      lotNumber: "LOT-VAZ-2610-ANT",
      manufacturingDate: "2026-10-10T00:00:00.000Z",
      expiryDate: null,
      supplierName: "Kütahya Seramik Tasarım",
      initialQty: 75,
      remainingQty: 75,
      unitCost: 145,
      status: "AVAILABLE",
      qcStatus: "PASSED",
    })

    // 4. Faz 2 Raflarında Net Fiziksel / Rezerve / Kullanılabilir Bakiyeler
    track("stockBalance", {
      id: "f2-bal-gul-cold-a2",
      createdAt: now,
      updatedAt: now,
      isActive: true,
      itemId: "item-gul-01",
      warehouseId: "wh-merkez-01",
      storageBinId: "f2-bin-mrk-cold-a2",
      binCode: "A-02-01",
      lotNumber: "LOT-GUL-2611-EARLY",
      expiryDate: "2026-11-20T23:59:59.000Z",
      onHandQty: 60,
      reservedQty: 15,
      availableQty: 45,
    })
    track("stockBalance", {
      id: "f2-bal-gul-fast-f1",
      createdAt: now,
      updatedAt: now,
      isActive: true,
      itemId: "item-gul-01",
      warehouseId: "wh-merkez-01",
      storageBinId: "f2-bin-mrk-fast-f1",
      binCode: "F-01-01",
      lotNumber: "LOT-GUL-2612-LATE",
      expiryDate: "2026-12-05T23:59:59.000Z",
      onHandQty: 40,
      reservedQty: 0,
      availableQty: 40,
    })
    track("stockBalance", {
      id: "f2-bal-gul-quar-q1",
      createdAt: now,
      updatedAt: now,
      isActive: true,
      itemId: "item-gul-01",
      warehouseId: "wh-merkez-01",
      storageBinId: "f2-bin-mrk-qar-q1",
      binCode: "Q-01-01",
      lotNumber: "LOT-GUL-2611-QAR",
      expiryDate: "2026-11-17T23:59:59.000Z",
      onHandQty: 12,
      reservedQty: 0,
      availableQty: 0,
    })
    track("stockBalance", {
      id: "f2-bal-lil-cold-a2",
      createdAt: now,
      updatedAt: now,
      isActive: true,
      itemId: "item-lil-02",
      warehouseId: "wh-merkez-01",
      storageBinId: "f2-bin-mrk-cold-a2",
      binCode: "A-02-01",
      lotNumber: "LOT-LIL-2611-FRESH",
      expiryDate: "2026-11-22T23:59:59.000Z",
      onHandQty: 45,
      reservedQty: 0,
      availableQty: 45,
    })
    track("stockBalance", {
      id: "f2-bal-vaz-onl-e1",
      createdAt: now,
      updatedAt: now,
      isActive: true,
      itemId: "item-vaz-03",
      warehouseId: "wh-online-03",
      storageBinId: "f2-bin-onl-e1",
      binCode: "E-01-01",
      lotNumber: "LOT-VAZ-2610-ANT",
      onHandQty: 75,
      reservedQty: 12,
      availableQty: 63,
    })
    track("stockBalance", {
      id: "f2-bal-ork-kdk-b2",
      createdAt: now,
      updatedAt: now,
      isActive: true,
      itemId: "item-ork-05",
      warehouseId: "wh-kadikoy-02",
      storageBinId: "f2-bin-kdk-b2",
      binCode: "M-02-01",
      onHandQty: 18,
      reservedQty: 0,
      availableQty: 18,
    })

    // 5. Çok Seviyeli Ambalaj Hiyerarşisi (Adet -> İç Kutu -> Koli -> Palet + Ti-Hi)
    track("unitConversion", {
      id: "f2-uconv-gul-palet",
      createdAt: now,
      updatedAt: now,
      isActive: true,
      itemId: "item-gul-01",
      fromUnit: "Palet",
      toUnit: "Demet",
      parentUnit: "Koli",
      multiplier: 200,
      levelOrder: 4,
      tiCount: 8,
      hiCount: 5,
      weightKg: 320,
      volumeM3: 1.44,
      barcode: "8690001001-PLT",
    })
    track("unitConversion", {
      id: "f2-uconv-vaz-kutu",
      createdAt: now,
      updatedAt: now,
      isActive: true,
      itemId: "item-vaz-03",
      fromUnit: "İç Kutu",
      toUnit: "Adet",
      parentUnit: "Adet",
      multiplier: 4,
      levelOrder: 2,
      weightKg: 4.8,
      volumeM3: 0.04,
      barcode: "8690001003-KTU",
    })
    track("unitConversion", {
      id: "f2-uconv-vaz-koli",
      createdAt: now,
      updatedAt: now,
      isActive: true,
      itemId: "item-vaz-03",
      fromUnit: "Koli",
      toUnit: "Adet",
      parentUnit: "İç Kutu",
      multiplier: 16,
      levelOrder: 3,
      weightKg: 19.5,
      volumeM3: 0.16,
      barcode: "8690001003-KOL",
    })
    track("unitConversion", {
      id: "f2-uconv-vaz-palet",
      createdAt: now,
      updatedAt: now,
      isActive: true,
      itemId: "item-vaz-03",
      fromUnit: "Palet",
      toUnit: "Adet",
      parentUnit: "Koli",
      multiplier: 384,
      levelOrder: 4,
      tiCount: 6,
      hiCount: 4,
      weightKg: 485,
      volumeM3: 1.56,
      barcode: "8690001003-PLT",
    })

    // 6. Kural Tabanlı Put-Away Direktifleri (LocationDirective)
    track("locationDirective", {
      id: "f2-dir-putaway-cold",
      createdAt: now,
      updatedAt: now,
      isActive: true,
      name: "Taze Kesme Çiçek -> Soğuk Zincir FEFO Konsolidasyonu",
      directiveType: "PUTAWAY",
      warehouseId: "wh-merkez-01",
      itemCategory: "Kesme Çiçek",
      abcClassFilter: "ALL",
      requiresColdChain: true,
      strategy: "FEFO_FIRST",
      targetZoneCode: "Z-SOGUK",
      priority: 5,
    })
    track("locationDirective", {
      id: "f2-dir-putaway-fast",
      createdAt: now,
      updatedAt: now,
      isActive: true,
      name: "A Sınıfı Hızlı Çiçek -> Ön Toplama Koridoru",
      directiveType: "PUTAWAY",
      warehouseId: "wh-merkez-01",
      itemCategory: "ALL",
      abcClassFilter: "A",
      requiresColdChain: false,
      strategy: "FIXED_BIN_CONSOLIDATE",
      targetZoneCode: "Z-HIZLI",
      priority: 15,
    })
    track("locationDirective", {
      id: "f2-dir-putaway-dry",
      createdAt: now,
      updatedAt: now,
      isActive: true,
      name: "Vazo & Aksesuar -> Kuru Palet Rafı",
      directiveType: "PUTAWAY",
      warehouseId: null,
      itemCategory: "Vazo",
      abcClassFilter: "ALL",
      requiresColdChain: false,
      strategy: "EMPTY_BIN_LOWEST_LEVEL",
      targetZoneCode: "Z-KURU",
      priority: 20,
    })

    // 7. GS1 Mod-10 Geçerli SSCC-18 LPN Palet & Koli Kayıtları
    const sscc1 = generateSscc18Code({ companyPrefix: "8691234", serialNumber: "000010001", extensionDigit: "3" }).sscc18
    const sscc2 = generateSscc18Code({ companyPrefix: "8691234", serialNumber: "000010002", extensionDigit: "3" }).sscc18
    const sscc3 = generateSscc18Code({ companyPrefix: "8691234", serialNumber: "000010003", extensionDigit: "1" }).sscc18
    track("licensePlate", {
      id: "f2-lpn-palet-01",
      createdAt: now,
      updatedAt: now,
      isActive: true,
      lpnCode: "LPN-2026-PLT01",
      sscc18: sscc1,
      containerType: "PALLET_EUR",
      warehouseId: "wh-merkez-01",
      currentBinId: "f2-bin-mrk-cold-a2",
      currentBinCode: "A-02-01",
      status: "STORED",
      grossWeightKg: 145,
      tareWeightKg: 22,
      rfidTagEpc: "E280117000000201GUL0001",
    })
    track("licensePlate", {
      id: "f2-lpn-palet-02",
      createdAt: now,
      updatedAt: now,
      isActive: true,
      lpnCode: "LPN-2026-PLT02",
      sscc18: sscc2,
      containerType: "PALLET_EUR",
      warehouseId: "wh-online-03",
      currentBinId: "f2-bin-onl-e1",
      currentBinCode: "E-01-01",
      status: "STORED",
      grossWeightKg: 210,
      tareWeightKg: 22,
      rfidTagEpc: "E280117000000201VAZ0002",
    })
    track("licensePlate", {
      id: "f2-lpn-koli-03",
      createdAt: now,
      updatedAt: now,
      isActive: true,
      lpnCode: "LPN-2026-KOL03",
      sscc18: sscc3,
      containerType: "CARTON_MASTER",
      warehouseId: "wh-merkez-01",
      currentBinId: "f2-bin-mrk-ship-s1",
      currentBinCode: "SHP-01-01",
      status: "STAGED",
      grossWeightKg: 18.5,
      tareWeightKg: 1.2,
      rfidTagEpc: "E280117000000201LIL0003",
    })

    track("licensePlateContent", {
      id: "f2-lpnc-01",
      createdAt: now,
      updatedAt: now,
      licensePlateId: "f2-lpn-palet-01",
      itemId: "item-gul-01",
      sku: "GUL-EKV-01",
      lotNumber: "LOT-GUL-2611-EARLY",
      quantity: 40,
      unit: "Demet",
    })
    track("licensePlateContent", {
      id: "f2-lpnc-02",
      createdAt: now,
      updatedAt: now,
      licensePlateId: "f2-lpn-palet-02",
      itemId: "item-vaz-03",
      sku: "VAZ-ANT-03",
      lotNumber: "LOT-VAZ-2610-ANT",
      quantity: 32,
      unit: "Adet",
    })
    track("licensePlateContent", {
      id: "f2-lpnc-03",
      createdAt: now,
      updatedAt: now,
      licensePlateId: "f2-lpn-koli-03",
      itemId: "item-lil-02",
      sku: "LIL-KAZ-02",
      lotNumber: "LOT-LIL-2611-FRESH",
      quantity: 25,
      unit: "Dal",
    })

    // 8. Açık WMS Rezervasyonları (LojistikStockReservation -> Fiziksel/Ayrılmış/Kullanılabilir uyumu)
    track("lojistikStockReservation", {
      id: "f2-res-01",
      createdAt: now,
      updatedAt: now,
      isActive: true,
      reservationNo: "RES-2026-1101",
      itemId: "item-gul-01",
      warehouseId: "wh-merkez-01",
      storageBinId: "f2-bin-mrk-cold-a2",
      lotNumber: "LOT-GUL-2611-EARLY",
      reservedQty: 15,
      sourceDocType: "SALES_ORDER",
      sourceDocNo: "SIP-2026-8812",
      status: "ACTIVE",
      expiresAt: "2026-11-18T18:00:00.000Z",
      createdBy: "Lojistik Satış Planlama",
      notes: "Otel gala etkinliği VIP masa buketleri için ayrılan Ekvator gülü",
    })
    track("lojistikStockReservation", {
      id: "f2-res-02",
      createdAt: now,
      updatedAt: now,
      isActive: true,
      reservationNo: "RES-2026-1102",
      itemId: "item-vaz-03",
      warehouseId: "wh-online-03",
      storageBinId: "f2-bin-onl-e1",
      lotNumber: "LOT-VAZ-2610-ANT",
      reservedQty: 12,
      sourceDocType: "OMNICHANNEL_ORDER",
      sourceDocNo: "ETY-2026-5042",
      status: "ACTIVE",
      expiresAt: "2026-11-16T21:00:00.000Z",
      createdBy: "E-Ticaret Sevk Masası",
      notes: "Öğleden sonra kargo dalgası için rezerve antrasit vazo",
    })

    // 9. Aktif + Geciken + Tamamlanmış WMS Görevleri (Depo KPI süre & SLA metrikleri için)
    track("wmsTask", {
      id: "f2-task-put-01",
      createdAt: "2026-11-14T08:15:00.000Z",
      updatedAt: "2026-11-14T08:15:00.000Z",
      isActive: true,
      taskNumber: "TSK-PUT-2026-201",
      workflowStage: "PUTAWAY",
      warehouseId: "wh-merkez-01",
      sourceDocType: "PURCHASE_ORDER",
      sourceDocNo: "PO-2026-409",
      partnerName: "Royal Holland Flora",
      priority: "HIGH",
      status: "PENDING",
      assignedOperator: "Ahmet Yılmaz",
      totalLines: 1,
      completedLines: 0,
      dueAt: "2026-11-15T14:00:00.000Z",
      lpnCode: "LPN-2026-PLT01",
      notes: "Soğuk hava A-02-01 gözüne FEFO sırasıyla istiflenecek",
    })
    track("wmsTask", {
      id: "f2-task-wave-02",
      createdAt: "2026-11-14T08:30:00.000Z",
      updatedAt: "2026-11-14T08:30:00.000Z",
      isActive: true,
      taskNumber: "TSK-WAV-2026-202",
      waveNumber: "WAVE-20261114-01",
      workflowStage: "WAVE_PICK",
      warehouseId: "wh-merkez-01",
      sourceDocType: "WAVE_PICK",
      sourceDocNo: "SIP-2026-8812",
      partnerName: "Swissôtel Bosphorus Gala",
      priority: "URGENT",
      status: "IN_PROGRESS",
      assignedOperator: "Murat Kaya",
      totalLines: 1,
      completedLines: 0,
      dueAt: "2026-11-14T18:00:00.000Z",
      startedAt: "2026-11-14T08:40:00.000Z",
      notes: "Koridor sırası: A-02-01 -> F-01-01",
    })
    track("wmsTask", {
      id: "f2-task-wave-late-03",
      createdAt: "2026-11-13T09:00:00.000Z",
      updatedAt: "2026-11-13T09:00:00.000Z",
      isActive: true,
      taskNumber: "TSK-WAV-2026-198",
      waveNumber: "WAVE-20261113-09",
      workflowStage: "WAVE_PICK",
      warehouseId: "wh-online-03",
      sourceDocType: "OMNICHANNEL_ORDER",
      sourceDocNo: "ETY-2026-5039",
      partnerName: "E-Ticaret Hızlı Teslimat",
      priority: "HIGH",
      status: "PENDING",
      assignedOperator: "Selin Yıldız",
      totalLines: 1,
      completedLines: 0,
      dueAt: "2026-11-13T17:00:00.000Z",
      notes: "SLA süresi geçmiş öncelikli toplama emri",
    })
    track("wmsTask", {
      id: "f2-task-done-04",
      createdAt: "2026-11-13T10:00:00.000Z",
      updatedAt: "2026-11-13T10:18:00.000Z",
      isActive: true,
      taskNumber: "TSK-WAV-2026-190",
      waveNumber: "WAVE-20261113-02",
      workflowStage: "WAVE_PICK",
      warehouseId: "wh-merkez-01",
      sourceDocType: "SALES_ORDER",
      sourceDocNo: "SIP-2026-8790",
      partnerName: "Çırağan Palace Etkinlik",
      priority: "NORMAL",
      status: "COMPLETED",
      assignedOperator: "Murat Kaya",
      totalLines: 1,
      completedLines: 1,
      startedAt: "2026-11-13T10:02:00.000Z",
      completedAt: "2026-11-13T10:18:00.000Z",
    })
    track("wmsTask", {
      id: "f2-task-done-05",
      createdAt: "2026-11-12T14:00:00.000Z",
      updatedAt: "2026-11-12T14:24:00.000Z",
      isActive: true,
      taskNumber: "TSK-RCV-2026-188",
      workflowStage: "GOODS_RECEIPT",
      warehouseId: "wh-merkez-01",
      sourceDocType: "PURCHASE_ORDER",
      sourceDocNo: "PO-2026-399",
      partnerName: "Antalya Çiçek Kooperatifi",
      priority: "NORMAL",
      status: "COMPLETED",
      assignedOperator: "Ahmet Yılmaz",
      totalLines: 1,
      completedLines: 1,
      startedAt: "2026-11-12T14:03:00.000Z",
      completedAt: "2026-11-12T14:24:00.000Z",
    })

    track("wmsTaskLine", {
      id: "f2-tline-01",
      createdAt: now,
      updatedAt: now,
      taskId: "f2-task-put-01",
      itemId: "item-lil-02",
      sku: "LIL-KAZ-02",
      itemName: "Beyaz Kazablanka Lilyum (Kokulu)",
      expectedQty: 25,
      processedQty: 0,
      unit: "Dal",
      suggestedFromBin: "R-01-01",
      suggestedToBin: "A-02-01",
      lotNumber: "LOT-LIL-2611-FRESH",
      status: "OPEN",
    })
    track("wmsTaskLine", {
      id: "f2-tline-02",
      createdAt: now,
      updatedAt: now,
      taskId: "f2-task-wave-02",
      itemId: "item-gul-01",
      sku: "GUL-EKV-01",
      itemName: "Ekvator Kırmızı Gül (1. Kalite - 60cm)",
      expectedQty: 15,
      processedQty: 0,
      unit: "Demet",
      suggestedFromBin: "A-02-01",
      lotNumber: "LOT-GUL-2611-EARLY",
      status: "OPEN",
    })
    track("wmsTaskLine", {
      id: "f2-tline-03",
      createdAt: now,
      updatedAt: now,
      taskId: "f2-task-wave-late-03",
      itemId: "item-vaz-03",
      sku: "VAZ-ANT-03",
      itemName: "İthal Mat Antrasit Seramik Vazo (25cm)",
      expectedQty: 6,
      processedQty: 0,
      unit: "Adet",
      suggestedFromBin: "E-01-01",
      status: "OPEN",
    })
    track("wmsTaskLine", {
      id: "f2-tline-04",
      createdAt: "2026-11-13T10:00:00.000Z",
      updatedAt: "2026-11-13T10:18:00.000Z",
      taskId: "f2-task-done-04",
      itemId: "item-gul-01",
      sku: "GUL-EKV-01",
      itemName: "Ekvator Kırmızı Gül (1. Kalite - 60cm)",
      expectedQty: 20,
      processedQty: 20,
      unit: "Demet",
      suggestedFromBin: "A-02-01",
      status: "COMPLETED",
    })
    track("wmsTaskLine", {
      id: "f2-tline-05",
      createdAt: "2026-11-12T14:00:00.000Z",
      updatedAt: "2026-11-12T14:24:00.000Z",
      taskId: "f2-task-done-05",
      itemId: "item-lil-02",
      sku: "LIL-KAZ-02",
      itemName: "Beyaz Kazablanka Lilyum (Kokulu)",
      expectedQty: 45,
      processedQty: 45,
      unit: "Dal",
      suggestedToBin: "A-02-01",
      status: "COMPLETED",
    })

    // 10. Depolar Arası Transferler (IN_TRANSIT + DISCREPANCY)
    track("warehouseTransferOrder", {
      id: "f2-trf-disc-01",
      createdAt: "2026-11-11T09:00:00.000Z",
      updatedAt: "2026-11-11T15:30:00.000Z",
      isActive: true,
      transferNumber: "TRF-2026-1111",
      orderNumber: "TRF-2026-1111",
      fromWarehouseId: "wh-merkez-01",
      toWarehouseId: "wh-online-03",
      status: "DISCREPANCY",
      transferReason: "E-Ticaret Kasım Kampanyası Seramik Vazo Sevkiyatı",
      vehiclePlate: "34 LJS 402",
      driverName: "Kadir Şahin",
      shippedAt: "2026-11-11T10:00:00.000Z",
      receivedAt: "2026-11-11T15:30:00.000Z",
      notes: "2 adet seramik vazo nakliye esnasında kırık tespit edildi.",
    })
    track("warehouseTransferOrder", {
      id: "f2-trf-transit-02",
      createdAt: "2026-11-14T07:30:00.000Z",
      updatedAt: "2026-11-14T08:15:00.000Z",
      isActive: true,
      transferNumber: "TRF-2026-1114",
      orderNumber: "TRF-2026-1114",
      fromWarehouseId: "wh-merkez-01",
      toWarehouseId: "wh-kadikoy-02",
      status: "IN_TRANSIT",
      transferReason: "Kadıköy Hafta Sonu Orkide & Gül İkmali",
      lpnCode: "LPN-2026-KOL03",
      carrierName: "Sunum Soğuk Filo",
      vehiclePlate: "34 SNR 808",
      driverName: "Cemal Kaya",
      shippedAt: "2026-11-14T08:15:00.000Z",
      notes: "Soğuk zincir aracı Kadıköy şubesine yolda.",
    })

    track("transferOrderLine", {
      id: "f2-tfln-01",
      createdAt: "2026-11-11T09:00:00.000Z",
      updatedAt: "2026-11-11T15:30:00.000Z",
      transferOrderId: "f2-trf-disc-01",
      itemId: "item-vaz-03",
      sku: "VAZ-ANT-03",
      itemName: "İthal Mat Antrasit Seramik Vazo (25cm)",
      requestedQty: 20,
      shippedQty: 20,
      inTransitQty: 0,
      receivedQty: 18,
      unit: "Adet",
      fromBinCode: "C-01-01",
      toBinCode: "E-01-01",
      discrepancyReason: "2 adet kolide çatlak / hasarlı geldi",
    })
    track("transferOrderLine", {
      id: "f2-tfln-02",
      createdAt: "2026-11-14T07:30:00.000Z",
      updatedAt: "2026-11-14T08:15:00.000Z",
      transferOrderId: "f2-trf-transit-02",
      itemId: "item-gul-01",
      sku: "GUL-EKV-01",
      itemName: "Ekvator Kırmızı Gül (1. Kalite - 60cm)",
      requestedQty: 10,
      shippedQty: 10,
      inTransitQty: 10,
      receivedQty: 0,
      unit: "Demet",
      fromBinCode: "A-02-01",
      toBinCode: "M-02-01",
      lotNumber: "LOT-GUL-2611-EARLY",
    })

    // 11. Planlı & Tolerans Aşımı Onayı Bekleyen Döngüsel Sayım Oturumları
    track("inventoryCountSession", {
      id: "f2-cnt-open-01",
      createdAt: "2026-11-14T08:00:00.000Z",
      updatedAt: "2026-11-14T08:00:00.000Z",
      isActive: true,
      sessionNumber: "SYM-2026-1114-ABC",
      warehouseId: "wh-merkez-01",
      zoneId: "zone-cold-01",
      abcFilter: "A",
      scheduledDate: "2026-11-15T09:00:00.000Z",
      tolerancePercent: 3,
      countType: "CYCLE_SMART_COUNT",
      hideSystemQty: true,
      status: "OPEN",
      assignedCounters: "Elif Demir, Ahmet Yılmaz",
      totalBinsCounted: 0,
      accuracyPercent: 100,
      totalVarianceValue: 0,
    })
    track("inventoryCountSession", {
      id: "f2-cnt-pending-02",
      createdAt: "2026-11-13T16:00:00.000Z",
      updatedAt: "2026-11-13T17:15:00.000Z",
      isActive: true,
      sessionNumber: "SYM-2026-1113-TOL",
      warehouseId: "wh-online-03",
      zoneId: "f2-zone-onl-01",
      abcFilter: "A",
      scheduledDate: "2026-11-13T16:00:00.000Z",
      tolerancePercent: 2,
      countType: "BLIND_COUNT",
      hideSystemQty: true,
      status: "PENDING_APPROVAL",
      assignedCounters: "Selin Yıldız",
      totalBinsCounted: 1,
      accuracyPercent: 92,
      totalVarianceValue: -870,
    })

    track("inventoryCountLine", {
      id: "f2-cntln-01",
      createdAt: now,
      updatedAt: now,
      sessionId: "f2-cnt-open-01",
      itemId: "item-gul-01",
      sku: "GUL-EKV-01",
      itemName: "Ekvator Kırmızı Gül (1. Kalite - 60cm)",
      binCode: "A-02-01",
      lotNumber: "LOT-GUL-2611-EARLY",
      systemQty: 60,
      countedQty: null,
      varianceQty: 0,
      unitCost: 245,
      varianceAmount: 0,
      isReconciled: false,
    })
    track("inventoryCountLine", {
      id: "f2-cntln-02",
      createdAt: now,
      updatedAt: now,
      sessionId: "f2-cnt-open-01",
      itemId: "item-lil-02",
      sku: "LIL-KAZ-02",
      itemName: "Beyaz Kazablanka Lilyum (Kokulu)",
      binCode: "A-02-01",
      lotNumber: "LOT-LIL-2611-FRESH",
      systemQty: 45,
      countedQty: null,
      varianceQty: 0,
      unitCost: 130,
      varianceAmount: 0,
      isReconciled: false,
    })
    track("inventoryCountLine", {
      id: "f2-cntln-03",
      createdAt: "2026-11-13T16:00:00.000Z",
      updatedAt: "2026-11-13T17:15:00.000Z",
      sessionId: "f2-cnt-pending-02",
      itemId: "item-vaz-03",
      sku: "VAZ-ANT-03",
      itemName: "İthal Mat Antrasit Seramik Vazo (25cm)",
      binCode: "E-01-01",
      lotNumber: "LOT-VAZ-2610-ANT",
      systemQty: 75,
      countedQty: 69,
      varianceQty: -6,
      unitCost: 145,
      varianceAmount: -870,
      isReconciled: false,
    })

    // 12. Cross-Docking Emirleri (LojistikCrossDockOrder)
    track("lojistikCrossDockOrder", {
      id: "f2-xd-01",
      createdAt: now,
      updatedAt: now,
      isActive: true,
      crossDockNo: "XD-2026-1101",
      warehouseId: "wh-merkez-01",
      inboundPoNo: "PO-2026-415",
      inboundReceivingBinId: "f2-bin-mrk-xd-x1",
      outboundOrderRef: "SIP-2026-8830",
      outboundRampBinId: "f2-bin-mrk-ship-s1",
      itemId: "item-gul-01",
      plannedQty: 30,
      transferredQty: 0,
      lotNumber: "LOT-GUL-XD-2611",
      lpnCode: "LPN-2026-PLT01",
      status: "RECEIVING_AT_DOCK",
      priority: "URGENT",
      assignedTo: "Ahmet Yılmaz",
      notes: "Rafa kaldırmadan doğrudan Şişli mağaza aracına aktarılacak.",
    })
    track("lojistikCrossDockOrder", {
      id: "f2-xd-02",
      createdAt: "2026-11-13T07:00:00.000Z",
      updatedAt: "2026-11-13T11:20:00.000Z",
      isActive: true,
      crossDockNo: "XD-2026-1102",
      warehouseId: "wh-merkez-01",
      inboundPoNo: "PO-2026-402",
      inboundReceivingBinId: "f2-bin-mrk-xd-x1",
      outboundOrderRef: "TRF-2026-1114",
      outboundRampBinId: "f2-bin-mrk-ship-s1",
      itemId: "item-lil-02",
      plannedQty: 25,
      transferredQty: 25,
      lotNumber: "LOT-LIL-2611-FRESH",
      lpnCode: "LPN-2026-KOL03",
      status: "SHIPPED",
      priority: "HIGH",
      assignedTo: "Murat Kaya",
      shippedAt: "2026-11-13T11:20:00.000Z",
      notes: "Cross-dock akışı başarıyla tamamlandı.",
    })

    // 13. Kitting (Buket / Aranjman Birleştirme & Parçalama) Emirleri
    track("lojistikKitOrder", {
      id: "f2-kit-01",
      createdAt: now,
      updatedAt: now,
      isActive: true,
      kitOrderNo: "KIT-2026-1101",
      operationType: "ASSEMBLE",
      warehouseId: "wh-merkez-01",
      kitItemId: "item-arj-07",
      targetBinId: "f2-bin-mrk-fast-f1",
      plannedQty: 4,
      completedQty: 0,
      status: "PLANNED",
      assignedTo: "Zeynep Tasarım Atölyesi",
      notes: "4 adet VIP Seramik Aranjman set montajı",
    })
    track("lojistikKitOrder", {
      id: "f2-kit-02",
      createdAt: "2026-11-12T10:00:00.000Z",
      updatedAt: "2026-11-12T11:45:00.000Z",
      isActive: true,
      kitOrderNo: "KIT-2026-1102",
      operationType: "DISASSEMBLE",
      warehouseId: "wh-online-03",
      kitItemId: "item-arj-07",
      targetBinId: "f2-bin-onl-e1",
      plannedQty: 2,
      completedQty: 2,
      status: "COMPLETED",
      assignedTo: "Selin Yıldız",
      executedAt: "2026-11-12T11:45:00.000Z",
      notes: "Teşhir seti bileşenlerine (gül + vazo + sünger) ayrıştırıldı.",
    })

    track("lojistikKitOrderComponent", {
      id: "f2-kitc-01",
      kitOrderId: "f2-kit-01",
      componentItemId: "item-gul-01",
      qtyPerKit: 2,
      totalQty: 8,
      unit: "Demet",
    })
    track("lojistikKitOrderComponent", {
      id: "f2-kitc-02",
      kitOrderId: "f2-kit-01",
      componentItemId: "item-vaz-03",
      qtyPerKit: 1,
      totalQty: 4,
      unit: "Adet",
    })
    track("lojistikKitOrderComponent", {
      id: "f2-kitc-03",
      kitOrderId: "f2-kit-02",
      componentItemId: "item-vaz-03",
      qtyPerKit: 1,
      totalQty: 2,
      unit: "Adet",
    })

    // 14. RFID Portal Okuma Kayıtları (LojistikRfidTagEvent)
    track("lojistikRfidTagEvent", {
      id: "f2-rfid-01",
      epcCode: "E280117000000201GUL0001",
      readerId: "PORTAL-MRK-KAPI-01",
      antennaPort: 1,
      rssi: -46.5,
      warehouseId: "wh-merkez-01",
      matchedItemId: "item-gul-01",
      matchedLpnId: "f2-lpn-palet-01",
      matchedBinId: "f2-bin-mrk-cold-a2",
      countSessionId: null,
      eventStatus: "MATCHED",
      idempotencyKey: "RFID-SEED-001",
      scannedAt: "2026-11-14T08:12:00.000Z",
      rawPayload: JSON.stringify({ readerId: "PORTAL-MRK-KAPI-01", epc: "E280117000000201GUL0001" }),
    })
    track("lojistikRfidTagEvent", {
      id: "f2-rfid-02",
      epcCode: "E280117000000201VAZ0002",
      readerId: "PORTAL-ONL-RAMPA-02",
      antennaPort: 2,
      rssi: -52.0,
      warehouseId: "wh-online-03",
      matchedItemId: "item-vaz-03",
      matchedLpnId: "f2-lpn-palet-02",
      matchedBinId: "f2-bin-onl-e1",
      countSessionId: "f2-cnt-pending-02",
      eventStatus: "MATCHED",
      idempotencyKey: "RFID-SEED-002",
      scannedAt: "2026-11-14T08:25:00.000Z",
      rawPayload: JSON.stringify({ readerId: "PORTAL-ONL-RAMPA-02", epc: "E280117000000201VAZ0002" }),
    })
    track("lojistikRfidTagEvent", {
      id: "f2-rfid-03",
      epcCode: "E280117000000999UNK0009",
      readerId: "PORTAL-MRK-KAPI-01",
      antennaPort: 3,
      rssi: -68.4,
      warehouseId: "wh-merkez-01",
      matchedItemId: null,
      matchedLpnId: null,
      matchedBinId: null,
      countSessionId: null,
      eventStatus: "UNMATCHED",
      idempotencyKey: "RFID-SEED-003",
      scannedAt: "2026-11-14T08:40:00.000Z",
      rawPayload: JSON.stringify({ readerId: "PORTAL-MRK-KAPI-01", epc: "E280117000000999UNK0009" }),
    })

    // 15. 90 Günlük Değişmez Stok Defteri (StockMovement) Geçmişi (Ağustos–Kasım 2026)
    const f2Movements = [
      {
        id: "f2-mov-aug-01",
        createdAt: "2026-08-20T10:15:00.000Z",
        updatedAt: "2026-08-20T10:15:00.000Z",
        itemId: "item-gul-01",
        warehouseId: "wh-merkez-01",
        movementType: "RECEIPT",
        quantity: 60,
        unit: "Demet",
        unitCost: 235,
        totalCost: 14100,
        toBinCode: "A-02-01",
        lotNumber: "LOT-GUL-2608",
        referenceDocType: "PURCHASE_ORDER",
        referenceDocNo: "PO-2026-190",
        performedBy: "Ahmet Yılmaz",
        method: "WEB",
        balanceBefore: 0,
        balanceAfter: 60,
        idempotencyKey: "SEED-MOV-001",
        notes: "Ağustos dönemi Ekvator gülü mal kabulü",
      },
      {
        id: "f2-mov-sep-02",
        createdAt: "2026-09-18T14:20:00.000Z",
        updatedAt: "2026-09-18T14:20:00.000Z",
        itemId: "item-gul-01",
        warehouseId: "wh-merkez-01",
        movementType: "ISSUE",
        quantity: 20,
        unit: "Demet",
        unitCost: 235,
        totalCost: 4700,
        fromBinCode: "A-02-01",
        lotNumber: "LOT-GUL-2608",
        referenceDocType: "SALES_ORDER",
        referenceDocNo: "SIP-2026-6401",
        performedBy: "Murat Kaya",
        method: "HANDHELD_USB",
        deviceId: "ZEBRA-TC58-IST-01",
        balanceBefore: 60,
        balanceAfter: 40,
        idempotencyKey: "SEED-MOV-002",
        notes: "Eylül düğün organizasyonu FEFO çıkışı",
      },
      {
        id: "f2-mov-oct-03",
        createdAt: "2026-10-25T11:00:00.000Z",
        updatedAt: "2026-10-25T11:00:00.000Z",
        itemId: "item-vaz-03",
        warehouseId: "wh-online-03",
        movementType: "RECEIPT",
        quantity: 75,
        unit: "Adet",
        unitCost: 145,
        totalCost: 10875,
        toBinCode: "E-01-01",
        lotNumber: "LOT-VAZ-2610-ANT",
        referenceDocType: "PURCHASE_ORDER",
        referenceDocNo: "PO-2026-341",
        performedBy: "Selin Yıldız",
        method: "WEB",
        balanceBefore: 0,
        balanceAfter: 75,
        idempotencyKey: "SEED-MOV-003",
        notes: "E-ticaret deposu seramik vazo stok girişi",
      },
      {
        id: "f2-mov-nov-04",
        createdAt: "2026-11-11T10:00:00.000Z",
        updatedAt: "2026-11-11T10:00:00.000Z",
        itemId: "item-vaz-03",
        warehouseId: "wh-merkez-01",
        movementType: "TRANSFER_OUT",
        quantity: 20,
        unit: "Adet",
        unitCost: 145,
        totalCost: 2900,
        fromBinCode: "C-01-01",
        toBinCode: "E-01-01",
        referenceDocType: "TRANSFER",
        referenceDocNo: "TRF-2026-1111",
        performedBy: "Kadir Şahin",
        method: "WEB",
        balanceBefore: 40,
        balanceAfter: 20,
        idempotencyKey: "SEED-MOV-004",
        notes: "E-ticaret şubesine transfer çıkışı",
      },
      {
        id: "f2-mov-nov-05",
        createdAt: "2026-11-13T17:15:00.000Z",
        updatedAt: "2026-11-13T17:15:00.000Z",
        itemId: "item-vaz-03",
        warehouseId: "wh-online-03",
        movementType: "COUNT_ADJUSTMENT",
        quantity: -6,
        unit: "Adet",
        unitCost: 145,
        totalCost: 870,
        fromBinCode: "E-01-01",
        referenceDocType: "CYCLE_COUNT",
        referenceDocNo: "SYM-2026-1113-TOL",
        performedBy: "Selin Yıldız",
        method: "HANDHELD_CAMERA",
        deviceId: "ZEBRA-TC58-IST-01-CAM",
        balanceBefore: 75,
        balanceAfter: 69,
        idempotencyKey: "SEED-MOV-005",
        notes: "Sayım farkı ön kayıt (-6 Adet, tolerans onayı bekliyor)",
      },
      {
        id: "f2-mov-nov-06",
        createdAt: "2026-11-14T08:15:00.000Z",
        updatedAt: "2026-11-14T08:15:00.000Z",
        itemId: "item-gul-01",
        warehouseId: "wh-merkez-01",
        movementType: "RECEIPT",
        quantity: 100,
        unit: "Demet",
        unitCost: 243,
        totalCost: 24300,
        toBinCode: "A-02-01",
        lotNumber: "LOT-GUL-2611-EARLY",
        referenceDocType: "PURCHASE_ORDER",
        referenceDocNo: "PO-2026-409",
        performedBy: "Ahmet Yılmaz",
        method: "WEB",
        balanceBefore: 40,
        balanceAfter: 100,
        idempotencyKey: "SEED-MOV-006",
        notes: "Kasım hafta sonu taze kesme gül partisi",
      },
    ]
    for (const m of f2Movements) {
      track("stockMovement", { ...m, isActive: true })
    }

    // 16. El Terminali Çevrimdışı Senkron Günlüğü (WmsOfflineSyncLog)
    track("wmsOfflineSyncLog", {
      id: "f2-sync-01",
      deviceId: "ZEBRA-TC58-IST-01",
      operatorName: "Ahmet Yılmaz",
      operationType: "PUTAWAY",
      payloadJson: JSON.stringify({ sku: "LIL-KAZ-02", binCode: "A-02-01", quantity: 25 }),
      idempotencyKey: "SYNC-SEED-001",
      status: "SYNCED",
      queuedAt: "2026-11-14T08:20:00.000Z",
      resolutionNote: "Çevrimdışı kuyruktan başarıyla işlendi.",
    })
    track("wmsOfflineSyncLog", {
      id: "f2-sync-02",
      deviceId: "HONEYWELL-EDA52-02",
      operatorName: "Murat Kaya",
      operationType: "WAVE_PICK",
      payloadJson: JSON.stringify({ taskId: "f2-task-done-04", quantity: 5 }),
      idempotencyKey: "SYNC-SEED-002",
      status: "CONFLICT",
      conflictReason: "TASK_ALREADY_COMPLETED",
      resolutionNote: "Görev TSK-WAV-2026-190 daha önce tamamlandığı için mükerrer düşüm engellendi.",
      queuedAt: "2026-11-13T10:17:00.000Z",
    })

    notes.push("Faz 2 WMS derinleştirme demo verileri (7 lokasyon rolü, FEFO lotlar, SSCC-18, Cross-Dock, Kitting, RFID ve 90 günlük defter) eklendi.")

    return {
      moduleKey: "faz2_wms_derinlestirme",
      inserted,
      skippedExisting,
      notes,
    }
  },
}
