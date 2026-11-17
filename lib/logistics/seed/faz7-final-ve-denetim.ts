/**
 * Lojistik Faz 7 (Final Entegrasyon, Stok Açılış Bakiyesi Mutabakatı & Demo Bütünlüğü)
 * İdempotent ve Tam Geri Alınabilir Demo Seed + Onarım Modülü
 *
 * KURALLAR:
 * - Yalnızca DEMO ortamında çalışır (`assertLogisticsDemoSeedAllowed()`).
 * - `StockBalance.onHandQty` toplamlarını DEĞİŞTİRMEZ; yalnızca:
 *   1) İki eski stok hareketindeki `"wh-merkez"` depo ID'sini `"wh-merkez-01"` olarak düzeltir.
 *   2) `f2-bal-gul-quar-q1` kaydına eksik `quarantineQty: 12` alanını ekler.
 *   3) Her `(itemId, warehouseId)` çifti için `SUM(stockMovement) === SUM(stockBalance.onHandQty)`
 *      denkliğini sağlayacak geri alınabilir `OPENING_BALANCE` ("Açılış Bakiyesi")
 *      mutabakat hareketlerini (`f7-mov-open-*`) ekler.
 * - e-POD sonrası taslak E-Fatura örneği (`f7-trip-01` / `f7-stop-01` / `f7-edoc-draft-01`)
 *   ve 24s idempotent başlangıç bildirimleri (`f7-notif-*`) ekler.
 * - `rollback(db)` tüm `f7-*` önekli kayıtları eksiksiz geri alır.
 */

import type { LogisticsSeedModule } from "./framework"
import type { LogisticsSeedStepResult } from "../types"

const LEGACY_WH_FIX_IDS = new Set([
  "local-1793785067687-r5r2h3ivi8b",
  "local-1793785068870-votjyv7o62k",
])

function round2(n: number): number {
  return Math.round((Number.isFinite(n) ? n : 0) * 100) / 100
}

function getSignedMovementQty(m: any): number {
  const q = Number(m?.quantity || 0)
  const t = String(m?.movementType || "").toUpperCase()
  if (
    [
      "OPENING_BALANCE",
      "RECEIPT",
      "IN",
      "TRANSFER_IN",
      "PRODUCTION_OUTPUT",
      "PRODUCE",
      "RETURN",
      "RMA_RETURN",
      "ADJUST_IN",
    ].includes(t)
  ) {
    return Math.abs(q)
  }
  if (
    [
      "ISSUE",
      "OUT",
      "TRANSFER_OUT",
      "PRODUCTION_CONSUME",
      "CONSUME",
      "CONSIGNMENT_CONSUME",
      "SCRAP",
      "ADJUST_OUT",
    ].includes(t)
  ) {
    return -Math.abs(q)
  }
  return q
}

function pushIfMissing(db: Record<string, any[]>, col: string, rec: any): number {
  if (!Array.isArray(db[col])) db[col] = []
  if (db[col].some((r) => String(r?.id) === String(rec.id))) return 0
  db[col].push(rec)
  return 1
}

export const faz7FinalAuditSeedModule: LogisticsSeedModule = {
  moduleKey: "faz7_final_ve_denetim",
  phase: 7,
  seededIdsByCollection: {
    lojistikShipmentTrip: ["f7-trip-01"],
    lojistikShipmentStop: ["f7-stop-01"],
    eDocumentRecord: ["f7-edoc-draft-01"],
    notification: [
      "f7-notif-01",
      "f7-notif-02",
      "f7-notif-03",
      "f7-notif-04",
      "f7-notif-05",
    ],
  },

  repairAnomalies(db: Record<string, any[]>): number {
    let repaired = 0

    if (Array.isArray(db.stockMovement)) {
      for (const m of db.stockMovement) {
        if (LEGACY_WH_FIX_IDS.has(String(m?.id)) && m.warehouseId === "wh-merkez") {
          m.warehouseId = "wh-merkez-01"
          repaired++
        }
      }
    }

    if (Array.isArray(db.stockBalance)) {
      const quarBal = db.stockBalance.find((b) => b?.id === "f2-bal-gul-quar-q1")
      if (quarBal && typeof quarBal.quarantineQty !== "number") {
        quarBal.quarantineQty = Number(quarBal.onHandQty || 12)
        repaired++
      }
    }

    return repaired
  },

  seed(db: Record<string, any[]>): LogisticsSeedStepResult {
    const inserted: Record<string, number> = {}
    let skippedExisting = 0

    const bump = (col: string, added: number) => {
      if (added > 0) inserted[col] = (inserted[col] || 0) + added
      else skippedExisting += 1
    }

    // 1. Açılış Bakiyesi (OPENING_BALANCE) Mutabakat Hareketleri
    //    Her (itemId, warehouseId) için SUM(stockMovement) === SUM(stockBalance.onHandQty) sağlanır;
    //    mevcut StockBalance satırlarının onHandQty / availableQty değerleri DEĞİŞTİRİLMEZ.
    const balances = Array.isArray(db.stockBalance) ? db.stockBalance : []
    const movements = Array.isArray(db.stockMovement) ? db.stockMovement : []
    const items = Array.isArray(db.inventoryItem) ? db.inventoryItem : []
    const itemById = new Map<string, any>(items.map((i) => [i.id, i]))

    const balanceSumByPair = new Map<string, number>()
    for (const b of balances) {
      const k = `${b.itemId}::${b.warehouseId}`
      balanceSumByPair.set(k, (balanceSumByPair.get(k) || 0) + Number(b.onHandQty || 0))
    }

    const nonF7MovementSumByPair = new Map<string, number>()
    for (const m of movements) {
      if (String(m?.id || "").startsWith("f7-mov-open-")) continue
      const k = `${m.itemId}::${m.warehouseId}`
      nonF7MovementSumByPair.set(k, (nonF7MovementSumByPair.get(k) || 0) + getSignedMovementQty(m))
    }

    const allPairs = new Set<string>([
      ...balanceSumByPair.keys(),
      ...nonF7MovementSumByPair.keys(),
    ])

    for (const pair of [...allPairs].sort()) {
      const [itemId, warehouseId] = pair.split("::")
      const balQty = round2(balanceSumByPair.get(pair) || 0)
      const movQty = round2(nonF7MovementSumByPair.get(pair) || 0)
      const delta = round2(balQty - movQty)
      if (Math.abs(delta) <= 0.0001) continue

      const item = itemById.get(itemId)
      const unitCost = Number(
        item?.currentAvgCost || item?.fifoUnitCost || item?.standardCost || 0
      )
      const movId = `f7-mov-open-${itemId}--${warehouseId}`

      const added = pushIfMissing(db, "stockMovement", {
        id: movId,
        createdAt: "2026-08-01T08:00:00.000Z",
        itemId,
        warehouseId,
        movementType: delta >= 0 ? "OPENING_BALANCE" : "COUNT_ADJUSTMENT",
        quantity: delta,
        unit: item?.baseUnit || "Adet",
        valuationMethodUsed: item?.valuationMethod || "FIFO",
        unitCost: round2(unitCost),
        totalCost: round2(Math.abs(delta) * unitCost),
        standardCostVariance: 0,
        referenceDocNo: "DEVIR-2026-ACILIS",
        performedBy: "Sistem Mutabakatı (Faz 7)",
        notes: "Açılış Bakiyesi — Stok Devir Mutabakatı",
        method: "SYSTEM",
        balanceAfterQty: balQty,
      })
      bump("stockMovement", added)
    }

    // 2. e-POD Sonrası Taslak Sales E-Fatura Demo Örneği ("Tek Tıkla E-Fatura Kes" akışı)
    bump(
      "lojistikShipmentTrip",
      pushIfMissing(db, "lojistikShipmentTrip", {
        id: "f7-trip-01",
        tripNumber: "SFR-2026-701",
        title: "Anadolu Yakası Galeri Teslimatı (E-Fatura Taslak Örneği)",
        branchId: "local-debug-branch",
        originWarehouseId: "wh-merkez-01",
        originLabel: "Merkez Soğuk Zincir Deposu",
        originLat: 41.0082,
        originLng: 28.9784,
        vehicleId: "f5-veh-03",
        driverId: "f5-drv-03",
        vehiclePlate: "34 SNR 550",
        driverName: "Burak Kaya",
        plannedDateKey: "2026-11-15",
        plannedDepartureAt: "2026-11-15T09:00:00.000Z",
        actualDepartureAt: "2026-11-15T09:05:00.000Z",
        plannedCompletionAt: "2026-11-15T14:30:00.000Z",
        actualCompletionAt: "2026-11-15T14:15:00.000Z",
        status: "TAMAMLANDI",
        totalWeightKg: 145,
        totalVolumeM3: 1.2,
        totalPallets: 2,
        capacityLoadPct: 38,
        baselineUnoptimizedDistanceKm: 28.4,
        plannedDistanceKm: 21.8,
        actualDistanceKm: 22.1,
        plannedDurationMin: 95,
        actualDurationMin: 90,
        routeProviderMode: "local-solver",
        createdAt: "2026-11-15T08:00:00.000Z",
        updatedAt: "2026-11-15T14:20:00.000Z",
      })
    )

    bump(
      "lojistikShipmentStop",
      pushIfMissing(db, "lojistikShipmentStop", {
        id: "f7-stop-01",
        tripId: "f7-trip-01",
        sequenceNo: 1,
        sourceType: "OMNICHANNEL_ORDER",
        sourceId: null,
        sourceRefNo: "OMN-2026-7701",
        customerId: null,
        customerName: "Anadolu Botanik Galeri A.Ş.",
        contactPhone: "02165550701",
        addressText: "Bağdat Cad. No: 214 Kadıköy / İstanbul",
        cityDistrict: "Kadıköy",
        lat: 40.9685,
        lng: 29.0628,
        timeWindowStart: "10:00",
        timeWindowEnd: "15:00",
        serviceMinutes: 15,
        weightKg: 145,
        volumeM3: 1.2,
        palletCount: 2,
        requiresColdChain: true,
        priority: 1,
        plannedEtaAt: "2026-11-15T14:00:00.000Z",
        actualArrivalAt: "2026-11-15T13:55:00.000Z",
        actualDepartureAt: "2026-11-15T14:15:00.000Z",
        legDistanceKm: 21.8,
        cumulativeDistanceKm: 21.8,
        delayMinutes: 0,
        status: "TESLIM_EDILDI",
        eInvoiceId: "f7-edoc-draft-01",
        eInvoiceNo: "GIB2026T0000701",
        eInvoiceStatus: "TASLAK",
        createdAt: "2026-11-15T08:00:00.000Z",
        updatedAt: "2026-11-15T14:20:00.000Z",
      })
    )

    bump(
      "eDocumentRecord",
      pushIfMissing(db, "eDocumentRecord", {
        id: "f7-edoc-draft-01",
        ettnUuid: "f7777777-0001-4000-8000-000000000701",
        documentNo: "GIB2026T0000701",
        documentType: "E_FATURA",
        profileId: "TICARIFATURA",
        relatedOrderNo: "OMN-2026-7701",
        receiverTitle: "Anadolu Botanik Galeri A.Ş.",
        receiverVknTckn: "1234567890",
        receiverTaxOffice: "Kadıköy",
        dispatchDate: "2026-11-15T14:15:00.000Z",
        carrierName: "Sunum Lojistik Filo",
        carrierVkn: "9999999999",
        vehicleId: "f5-veh-03",
        vehiclePlate: "34 SNR 550",
        driverId: "f5-drv-03",
        driverName: "Burak Kaya",
        driverTckn: "10000000003",
        shipmentTripId: "f7-trip-01",
        shipmentStopId: "f7-stop-01",
        totalNetAmount: 4250,
        totalVatAmount: 850,
        totalGrossAmount: 5100,
        currency: "TRY",
        gibStatusCode: "1000",
        gibStatusText: "Taslak — Tek Tıkla E-Fatura Kesimi Bekleniyor",
        documentStatus: "TASLAK",
        eInvoiceTimingMode: "ON_DELIVERY_DRAFT",
        linesJson: JSON.stringify([
          {
            sku: "GUL-EKV-01",
            name: "Ekvador Kırmızı Gül Demeti",
            qty: 50,
            unitPrice: 85,
            vatRate: 20,
            lineTotal: 4250,
          },
        ]),
        createdAt: "2026-11-15T14:16:00.000Z",
      })
    )

    // 3. Ön Yüklemeli 24 Saat İdempotent Lojistik Uyarı Bildirimleri (Yönetici Paneli İçin)
    const sampleNotifs = [
      {
        id: "f7-notif-01",
        ruleKey: "DELAYED_SHIPMENT",
        dedupKey: "DELAYED_SHIPMENT:f6-trip-01",
        entityId: "f6-trip-01",
        title: "Sevkiyat Gecikmesi: SFR-2026-601",
        message: "Avrupa Yakası Soğuk Zincir Dağıtımı (34 SNR 101) seferinde planlanan durak ETA süresi aşıldı.",
        type: "warning",
        link: "/dashboard/sevkiyat",
      },
      {
        id: "f7-notif-02",
        ruleKey: "OVERDUE_PURCHASE_ORDER",
        dedupKey: "OVERDUE_PURCHASE_ORDER:f3-po-04",
        entityId: "f3-po-04",
        title: "Gecikmiş Satınalma Siparişi: PO-2026-1024",
        message: "PO-2026-1024 numaralı açık satınalma siparişinin beklenen teslim tarihi geçti.",
        type: "warning",
        link: "/dashboard/satinalma",
      },
      {
        id: "f7-notif-03",
        ruleKey: "FLEET_DOC_MAINT_EXPIRING",
        dedupKey: "FLEET_DOC_MAINT_EXPIRING:doc:f5-doc-01",
        entityId: "f5-doc-01",
        title: "Araç Belge Süresi Yaklaşıyor",
        message: "Filo araç ve sürücü belgelerinde önümüzdeki 30 gün içinde yenilenmesi gereken kayıtlar var.",
        type: "warning",
        link: "/dashboard/filo",
      },
      {
        id: "f7-notif-04",
        ruleKey: "RMA_DEADLINE_EXPIRING",
        dedupKey: "RMA_DEADLINE_EXPIRING:f4-rma-01",
        entityId: "f4-rma-01",
        title: "RMA SLA / Kalite İnceleme Uyarısı",
        message: "İade penceresi son tarihi yaklaşan veya kalite kontrol incelemesi bekleyen açık RMA talepleri mevcut.",
        type: "warning",
        link: "/dashboard/iade",
      },
      {
        id: "f7-notif-05",
        ruleKey: "ANOMALOUS_FUEL_CONSUMPTION",
        dedupKey: "ANOMALOUS_FUEL_CONSUMPTION:f5-fuel-04",
        entityId: "f5-fuel-04",
        title: "Anomalili Yakıt Tüketimi Tespit Edildi",
        message: "34 SNR 412 plakalı araçta beklenen tüketim sınırının üzerinde yakıt tüketimi saptandı.",
        type: "error",
        link: "/dashboard/filo",
      },
    ]

    for (const sn of sampleNotifs) {
      const added = pushIfMissing(db, "notification", {
        id: sn.id,
        userId: "user-admin",
        title: sn.title,
        message: sn.message,
        type: sn.type,
        moduleType: "lojistik",
        content: JSON.stringify({
          ruleKey: sn.ruleKey,
          dedupKey: sn.dedupKey,
          entityId: sn.entityId,
          seededBy: "faz7",
        }),
        isRead: false,
        link: sn.link,
        taskId: null,
        createdAt: "2026-11-17T06:00:00.000Z",
      })
      bump("notification", added)
    }

    return {
      moduleKey: this.moduleKey,
      inserted,
      skippedExisting,
      notes: [
        "Eski wh-merkez depo kimliği ve eksik karantina stoğu onarıldı.",
        "Tüm ürün/depo çiftleri için Açılış Bakiyesi (OPENING_BALANCE) mutabakatı tamamlandı.",
        "Teslimat sonrası taslak E-Fatura örneği ve başlangıç lojistik bildirimleri eklendi.",
      ],
    }
  },

  rollback(db: Record<string, any[]>): Record<string, number> {
    const removed: Record<string, number> = {}
    for (const [col, list] of Object.entries(db)) {
      if (!Array.isArray(list)) continue
      const beforeLen = list.length
      const kept = list.filter((rec) => !String(rec?.id ?? "").startsWith("f7-"))
      const diff = beforeLen - kept.length
      if (diff > 0) {
        list.length = 0
        list.push(...kept)
        removed[col] = diff
      }
    }
    return removed
  },
}
