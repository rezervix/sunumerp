/**
 * Lojistik Faz 4 (Tersine Lojistik, İade/RMA, Karantina, Kalite & Kredi Notası)
 * İdempotent ve Tam Geri Alınabilir Demo Seed Modülü
 *
 * KURALLAR:
 * - Yalnızca DEMO ortamında çalışır (`assertLogisticsDemoSeedAllowed`).
 * - Mevcut hiçbir kayda dokunmaz; tüm Faz 4 demo kayıtları `f4-*` önekli sabit ID taşır.
 * - `npm run seed:logistics:rollback` ile tek komutta temizlenir.
 */

import type { LogisticsSeedModule } from "./framework"
import { generateRmaBarcodeValue } from "../returns/constantsAndHelpers"

const SEEDED_POLICY_IDS = [
  "f4-pol-default-14",
  "f4-pol-kesme-14",
  "f4-pol-vazo-30",
  "f4-pol-item-vaz",
] as const

const SEEDED_RMA_IDS = [
  "f4-rma-01",
  "f4-rma-02",
  "f4-rma-03",
  "f4-rma-04",
  "f4-rma-05",
  "f4-rma-06",
  "f4-rma-07",
  "f4-rma-08",
  "f4-rma-09",
  "f4-rma-10",
  "f4-rma-11",
] as const

const SEEDED_RMA_LINE_IDS = [
  "f4-rmal-01a",
  "f4-rmal-01b",
  "f4-rmal-02",
  "f4-rmal-03",
  "f4-rmal-04",
  "f4-rmal-05",
  "f4-rmal-06",
  "f4-rmal-07",
  "f4-rmal-08",
  "f4-rmal-09",
  "f4-rmal-10",
  "f4-rmal-11",
] as const

const SEEDED_EVENT_IDS = [
  "f4-rmae-01",
  "f4-rmae-02",
  "f4-rmae-03",
  "f4-rmae-04",
  "f4-rmae-05",
  "f4-rmae-06",
  "f4-rmae-07",
  "f4-rmae-08",
  "f4-rmae-09",
  "f4-rmae-10",
  "f4-rmae-11",
] as const

const SEEDED_QC_IDS = ["f4-qc-06", "f4-qc-07", "f4-qc-08", "f4-qc-09"] as const
const SEEDED_NCR_IDS = ["f4-ncr-06", "f4-ncr-07", "f4-ncr-09"] as const
const SEEDED_CREDIT_IDS = ["f4-crn-06", "f4-crn-07", "f4-crn-08", "f4-crn-09"] as const
const SEEDED_EDOC_IDS = ["f4-edoc-07", "f4-edoc-08", "f4-edoc-09"] as const
const SEEDED_FINANCE_IDS = ["f4-fin-07", "f4-fin-08", "f4-fin-09"] as const
const SEEDED_BALANCE_IDS = ["f4-bal-quar-gul", "f4-bal-rma-ork"] as const
const SEEDED_MOVEMENT_IDS = ["f4-mov-quar-04", "f4-mov-rma-05"] as const
const SEEDED_WEBHOOK_IDS = ["f4-whl-01", "f4-whl-02", "f4-whl-03", "f4-whl-04"] as const

function pushIfMissing(db: Record<string, any[]>, col: string, rec: any): number {
  if (!Array.isArray(db[col])) db[col] = []
  if (db[col].some((r) => String(r?.id) === String(rec.id))) return 0
  db[col].push(rec)
  return 1
}

function removeByIds(list: any[] | undefined, ids: Set<string>): number {
  if (!Array.isArray(list) || ids.size === 0) return 0
  const before = list.length
  const kept = list.filter((r) => !ids.has(String(r?.id ?? "")))
  list.length = 0
  list.push(...kept)
  return before - kept.length
}

function daysAgoIso(days: number): string {
  return new Date(Date.now() - days * 86_400_000).toISOString()
}

function daysAheadIso(baseIso: string, days: number): string {
  return new Date(new Date(baseIso).getTime() + days * 86_400_000).toISOString()
}

export const faz4ReturnsAndRmaSeedModule: LogisticsSeedModule = {
  moduleKey: "faz4_iade_ve_rma",
  phase: 4,
  seededIdsByCollection: {
    lojistikReturnPolicy: SEEDED_POLICY_IDS,
    returnRmaRecord: SEEDED_RMA_IDS,
    lojistikRmaLine: SEEDED_RMA_LINE_IDS,
    lojistikRmaEventLog: SEEDED_EVENT_IDS,
    uretimQualityInspection: SEEDED_QC_IDS,
    uretimQualityNcr: SEEDED_NCR_IDS,
    lojistikRmaCreditNote: SEEDED_CREDIT_IDS,
    eDocumentRecord: SEEDED_EDOC_IDS,
    finance: SEEDED_FINANCE_IDS,
    stockBalance: SEEDED_BALANCE_IDS,
    stockMovement: SEEDED_MOVEMENT_IDS,
    lojistikRmaWebhookLog: SEEDED_WEBHOOK_IDS,
  },

  seed(db) {
    const inserted: Record<string, number> = {}
    let skippedExisting = 0

    const track = (col: string, rec: any) => {
      const n = pushIfMissing(db, col, rec)
      inserted[col] = (inserted[col] || 0) + n
      if (n === 0) skippedExisting++
    }

    const nowIso = new Date().toISOString()

    // 1. İade & Garanti Politikaları (Min 14 Gün Yasal Zemin + Kategori & Ürün Politikaları)
    track("lojistikReturnPolicy", {
      id: "f4-pol-default-14",
      policyKey: "DEFAULT_LEGAL_14",
      title: "Yasal Asgari 14 Gün Cayma & İade Politikası",
      category: null,
      itemId: null,
      returnWindowDays: 14,
      warrantyMonths: 0,
      restockable: true,
      requireInspection: true,
      notes: "6502 sayılı Kanun kapsamında asgari 14 günlük cayma hakkı.",
      isActive: true,
      createdAt: daysAgoIso(88),
      updatedAt: daysAgoIso(88),
    })

    track("lojistikReturnPolicy", {
      id: "f4-pol-kesme-14",
      policyKey: "CAT_KESME_CICEK_14",
      title: "Kesme Çiçek & Soğuk Zincir 14 Gün İade Politikası",
      category: "Kesme Çiçek",
      itemId: null,
      returnWindowDays: 14,
      warrantyMonths: 0,
      restockable: true,
      requireInspection: true,
      notes: "SKT ve soğuk zincir tazelik kontrolü zorunludur.",
      isActive: true,
      createdAt: daysAgoIso(85),
      updatedAt: daysAgoIso(85),
    })

    track("lojistikReturnPolicy", {
      id: "f4-pol-vazo-30",
      policyKey: "CAT_VAZO_SAKSI_30",
      title: "Vazo & Seramik 30 Gün İade + 12 Ay Garanti",
      category: "Vazo & Saksı",
      itemId: null,
      returnWindowDays: 30,
      warrantyMonths: 12,
      restockable: true,
      requireInspection: true,
      notes: "Üretim sır çatlağı ve taşıma hasarı 12 ay garanti kapsamındadır.",
      isActive: true,
      createdAt: daysAgoIso(85),
      updatedAt: daysAgoIso(85),
    })

    track("lojistikReturnPolicy", {
      id: "f4-pol-item-vaz",
      policyKey: "ITEM_VAZ_ANT_03",
      title: "İthal Antrasit Seramik Vazo Özel 30 Gün / 24 Ay Garanti",
      category: "Vazo & Saksı",
      itemId: "item-vaz-03",
      returnWindowDays: 30,
      warrantyMonths: 24,
      restockable: true,
      requireInspection: true,
      notes: "İthal seramik serisi için 24 ay üretici garantisi.",
      isActive: true,
      createdAt: daysAgoIso(80),
      updatedAt: daysAgoIso(80),
    })

    // 2. Her Durumdan RMA Kayıtları (Son 90 Gün)
    const d12 = daysAgoIso(12) // 14 gün kuralında 2 gün kaldı!
    const d13 = daysAgoIso(13) // 14 gün kuralında 1 gün kaldı!
    const d6 = daysAgoIso(6)
    const d5 = daysAgoIso(5)
    const d28 = daysAgoIso(28)
    const d35 = daysAgoIso(35)
    const d48 = daysAgoIso(48)
    const d62 = daysAgoIso(62)
    const d76 = daysAgoIso(76)
    const d82 = daysAgoIso(82)
    const d20 = daysAgoIso(20)

    // 2.1 TALEP (Çok kalemli, süresi dolmak üzere - 2 gün kaldı)
    track("returnRmaRecord", {
      id: "f4-rma-01",
      rmaNumber: "RMA-2026-401",
      orderNumber: "OMN-2026-9041",
      channelCode: "SUNUM-B2B",
      customerName: "KoçSistem Bilgi ve İletişim Hizmetleri A.Ş.",
      sku: "GUL-EKV-01",
      itemName: "Ekvator Kırmızı Gül (1. Kalite - 60cm)",
      returnQty: 5,
      returnReason: "14 Gün Yasal Cayma Hakkı (+1 kalem)",
      qcInspectionResult: "PENDING_INSPECTION",
      targetWarehouseId: "wh-merkez-01",
      targetBinCode: "Q-01-01",
      refundAmount: 1015,
      refundStatus: "PENDING",
      returnTrackingNo: "YK-RMA-401100",
      returnCarrierCode: "YURTICI",
      labelCode: generateRmaBarcodeValue("RMA-2026-401"),
      rmaStatus: "TALEP",
      reasonCode: "CAYMA_HAKKI",
      reasonNote: "Etkinlik tarih değişikliği sebebiyle kısmi çok kalemli iade talebi",
      orderSourceType: "OMNICHANNEL",
      originalOrderId: "omni-ord-001",
      deliveredAt: d12,
      returnWindowDays: 30,
      returnDeadlineAt: daysAheadIso(d12, 14),
      isWithinReturnWindow: true,
      isWithinWarranty: true,
      deadlineOverrideApproved: false,
      supplierId: "sup-holland-01",
      estimatedCostTry: 0,
      recoveredValueTry: 0,
      createdAt: daysAgoIso(1),
      updatedAt: daysAgoIso(1),
      isActive: true,
    })

    // 2.2 ONAYLANDI (Süresi dolmak üzere - 1 gün kaldı)
    track("returnRmaRecord", {
      id: "f4-rma-02",
      rmaNumber: "RMA-2026-402",
      orderNumber: "OMN-2026-9042",
      channelCode: "TRENDYOL",
      customerName: "Borusan Lojistik Dağıtım A.Ş.",
      sku: "LIL-KAZ-02",
      itemName: "Beyaz Kazablanka Lilyum (Kokulu)",
      returnQty: 3,
      returnReason: "Yanlış / Eksik Ürün Gönderimi",
      qcInspectionResult: "PENDING_INSPECTION",
      targetWarehouseId: "wh-merkez-01",
      targetBinCode: "Q-01-01",
      refundAmount: 930,
      refundStatus: "PENDING",
      returnTrackingNo: "TYX-RMA-402201",
      returnCarrierCode: "TRENDYOL_EXPRESS",
      labelCode: generateRmaBarcodeValue("RMA-2026-402"),
      rmaStatus: "ONAYLANDI",
      reasonCode: "YANLIS_URUN",
      reasonNote: "Pembe oryantal yerine beyaz kazablanka çıkışı",
      orderSourceType: "OMNICHANNEL",
      originalOrderId: "omni-ord-002",
      deliveredAt: d13,
      returnWindowDays: 14,
      returnDeadlineAt: daysAheadIso(d13, 14),
      isWithinReturnWindow: true,
      isWithinWarranty: false,
      deadlineOverrideApproved: false,
      supplierId: "sup-yalova-02",
      estimatedCostTry: 0,
      recoveredValueTry: 0,
      createdAt: daysAgoIso(2),
      updatedAt: daysAgoIso(1),
      isActive: true,
    })

    // 2.3 YOLDA (El terminali RMA_RETURN_RECEIPT okutmasına hazır)
    track("returnRmaRecord", {
      id: "f4-rma-03",
      rmaNumber: "RMA-2026-403",
      orderNumber: "OMN-2026-9041",
      channelCode: "SUNUM-B2B",
      customerName: "KoçSistem Bilgi ve İletişim Hizmetleri A.Ş.",
      sku: "VAZ-ANT-03",
      itemName: "İthal Mat Antrasit Seramik Vazo (25cm)",
      returnQty: 2,
      returnReason: "Taşıma / Kargo Hasarı",
      qcInspectionResult: "PENDING_INSPECTION",
      targetWarehouseId: "wh-merkez-01",
      targetBinCode: "Q-01-01",
      refundAmount: 760,
      refundStatus: "PENDING",
      returnTrackingNo: "YK-RMA-403315",
      returnCarrierCode: "YURTICI",
      labelCode: generateRmaBarcodeValue("RMA-2026-403"),
      rmaStatus: "YOLDA",
      reasonCode: "HASARLI_KARGO",
      reasonNote: "Kargo kutusu köşe ezilmesi bildirimi; depo kabul bekliyor",
      orderSourceType: "OMNICHANNEL",
      originalOrderId: "omni-ord-001",
      deliveredAt: d6,
      returnWindowDays: 30,
      returnDeadlineAt: daysAheadIso(d6, 30),
      isWithinReturnWindow: true,
      isWithinWarranty: true,
      deadlineOverrideApproved: false,
      supplierId: "sup-pasabahce-03",
      estimatedCostTry: 0,
      recoveredValueTry: 0,
      createdAt: daysAgoIso(3),
      updatedAt: daysAgoIso(2),
      isActive: true,
    })

    // 2.4 TESLIM_ALINDI (Karantinada bekliyor - Q-01-01)
    track("returnRmaRecord", {
      id: "f4-rma-04",
      rmaNumber: "RMA-2026-404",
      orderNumber: "OMN-2026-9043",
      channelCode: "SHOPIFY",
      customerName: "Eczacıbaşı Monrol Nükleer Tıp A.Ş.",
      sku: "GUL-EKV-01",
      itemName: "Ekvator Kırmızı Gül (1. Kalite - 60cm)",
      returnQty: 5,
      returnReason: "Tazelik / SKT Uygunsuzluğu",
      qcInspectionResult: "PENDING_INSPECTION",
      targetWarehouseId: "wh-merkez-01",
      targetBinCode: "Q-01-01",
      receivedWarehouseId: "wh-merkez-01",
      receivedBinCode: "Q-01-01",
      receivedAt: daysAgoIso(1),
      receivedBy: "Ahmet Yılmaz (ZEBRA-TC58)",
      refundAmount: 425,
      refundStatus: "PENDING",
      returnTrackingNo: "UPS-RMA-404771",
      returnCarrierCode: "UPS",
      labelCode: generateRmaBarcodeValue("RMA-2026-404"),
      rmaStatus: "TESLIM_ALINDI",
      reasonCode: "SKT_SORUNU",
      reasonNote: "Soğuk zincir sıcaklık sapması nedeniyle karantina rafında muayene bekliyor",
      orderSourceType: "OMNICHANNEL",
      originalOrderId: "omni-ord-003",
      deliveredAt: d5,
      returnWindowDays: 14,
      returnDeadlineAt: daysAheadIso(d5, 14),
      isWithinReturnWindow: true,
      isWithinWarranty: false,
      deadlineOverrideApproved: false,
      supplierId: "sup-holland-01",
      estimatedCostTry: 0,
      recoveredValueTry: 0,
      createdAt: daysAgoIso(4),
      updatedAt: daysAgoIso(1),
      isActive: true,
    })

    // 2.5 INCELEMEDE (ERP Siparişinden süre istisna onayı ile + Karantinada)
    track("returnRmaRecord", {
      id: "f4-rma-05",
      rmaNumber: "RMA-2026-405",
      orderNumber: "ORD-2026-0101",
      channelCode: "ERP",
      customerName: "Ziraat Bankası Kurumsal",
      sku: "ORK-MOR-05",
      itemName: "Mor Phalaenopsis Orkide (Çift Dal)",
      returnQty: 2,
      returnReason: "Garanti Kapsamında Arıza",
      qcInspectionResult: "PENDING_INSPECTION",
      targetWarehouseId: "wh-merkez-01",
      targetBinCode: "RMA-01-01",
      receivedWarehouseId: "wh-merkez-01",
      receivedBinCode: "RMA-01-01",
      receivedAt: daysAgoIso(2),
      receivedBy: "Elif Demir",
      inspectedAt: daysAgoIso(1),
      refundAmount: 1900,
      refundStatus: "PENDING",
      returnTrackingNo: "ARAS-RMA-405009",
      returnCarrierCode: "ARAS",
      labelCode: generateRmaBarcodeValue("RMA-2026-405"),
      rmaStatus: "INCELEMEDE",
      reasonCode: "GARANTI_KAPSAMI",
      reasonNote: "Süre dışı kurumsal müşteri istisna onayıyla kalite incelemesine alındı",
      orderSourceType: "ERP_ORDER",
      originalOrderId: "ord-01",
      deliveredAt: d28,
      returnWindowDays: 14,
      returnDeadlineAt: daysAheadIso(d28, 14),
      isWithinReturnWindow: false,
      isWithinWarranty: false,
      deadlineOverrideApproved: true,
      deadlineOverrideBy: "Sistem Yöneticisi",
      deadlineOverrideReason: "Kurumsal VIP lansman anlaşması kapsamında süre istisnası onaylandı",
      supplierId: "f3-sup-ant-05",
      estimatedCostTry: 0,
      recoveredValueTry: 0,
      createdAt: daysAgoIso(6),
      updatedAt: daysAgoIso(1),
      isActive: true,
    })

    // 2.6 KARARA_BAGLANDI -> Tedarikçiye İade (RETURN_TO_VENDOR) + Taslak Kredi Notası
    track("returnRmaRecord", {
      id: "f4-rma-06",
      rmaNumber: "RMA-2026-406",
      orderNumber: "OMN-2026-9043",
      channelCode: "SHOPIFY",
      customerName: "Eczacıbaşı Monrol Nükleer Tıp A.Ş.",
      sku: "GUL-EKV-01",
      itemName: "Ekvator Kırmızı Gül (1. Kalite - 60cm)",
      returnQty: 4,
      returnReason: "Kalite / Kusur Hatası",
      qcInspectionResult: "QUARANTINE_REPAIR",
      qualityDecision: "RETURN_TO_VENDOR",
      targetWarehouseId: "wh-merkez-01",
      targetBinCode: "Q-01-01",
      receivedWarehouseId: "wh-merkez-01",
      receivedBinCode: "Q-01-01",
      receivedAt: daysAgoIso(34),
      receivedBy: "Depo Operatörü",
      inspectedAt: daysAgoIso(33),
      decidedAt: daysAgoIso(33),
      inspectionId: "f4-qc-06",
      ncrId: "f4-ncr-06",
      supplierId: "sup-holland-01",
      creditNoteId: "f4-crn-06",
      creditNoteNo: "CRN-2026-0406",
      refundAmount: 340,
      refundStatus: "PENDING",
      returnTrackingNo: "MNG-RMA-406880",
      returnCarrierCode: "MNG",
      labelCode: generateRmaBarcodeValue("RMA-2026-406"),
      rmaStatus: "KARARA_BAGLANDI",
      reasonCode: "KALITE_HATASI",
      reasonNote: "İthal partide yaprak yanıklığı; tedarikçiye rücu (RTV) kararı verildi",
      orderSourceType: "OMNICHANNEL",
      originalOrderId: "omni-ord-003",
      deliveredAt: d35,
      returnWindowDays: 14,
      returnDeadlineAt: daysAheadIso(d35, 14),
      isWithinReturnWindow: true,
      isWithinWarranty: false,
      estimatedCostTry: 1000,
      recoveredValueTry: 0,
      cycleHours: 36.5,
      createdAt: d35,
      updatedAt: daysAgoIso(33),
      isActive: true,
    })

    // 2.7 KARARA_BAGLANDI -> Hurda (SCRAP) + Onaylı Kredi Notası + E-Belge + Finans
    track("returnRmaRecord", {
      id: "f4-rma-07",
      rmaNumber: "RMA-2026-407",
      orderNumber: "OMN-2026-9041",
      channelCode: "SUNUM-B2B",
      customerName: "KoçSistem Bilgi ve İletişim Hizmetleri A.Ş.",
      sku: "VAZ-ANT-03",
      itemName: "İthal Mat Antrasit Seramik Vazo (25cm)",
      returnQty: 1,
      returnReason: "Taşıma / Kargo Hasarı",
      qcInspectionResult: "QUARANTINE_REPAIR",
      qualityDecision: "SCRAP",
      targetWarehouseId: "wh-merkez-01",
      targetBinCode: "Q-01-01",
      receivedWarehouseId: "wh-merkez-01",
      receivedBinCode: "Q-01-01",
      receivedAt: daysAgoIso(47),
      receivedBy: "Depo Operatörü",
      inspectedAt: daysAgoIso(46),
      decidedAt: daysAgoIso(46),
      inspectionId: "f4-qc-07",
      ncrId: "f4-ncr-07",
      supplierId: "sup-pasabahce-03",
      creditNoteId: "f4-crn-07",
      creditNoteNo: "CRN-2026-0407",
      financeRecordId: "f4-fin-07",
      refundAmount: 380,
      refundStatus: "APPROVED_CREDITED",
      returnTrackingNo: "YK-RMA-407990",
      returnCarrierCode: "YURTICI",
      labelCode: generateRmaBarcodeValue("RMA-2026-407"),
      rmaStatus: "KARARA_BAGLANDI",
      reasonCode: "HASARLI_KARGO",
      reasonNote: "Kırık seramik gövde; hurda çıkış ve kredi notası onaylandı",
      orderSourceType: "OMNICHANNEL",
      originalOrderId: "omni-ord-001",
      deliveredAt: d48,
      returnWindowDays: 30,
      returnDeadlineAt: daysAheadIso(d48, 30),
      isWithinReturnWindow: true,
      isWithinWarranty: true,
      estimatedCostTry: 180,
      recoveredValueTry: 0,
      cycleHours: 42.0,
      createdAt: d48,
      updatedAt: daysAgoIso(46),
      isActive: true,
    })

    // 2.8 KAPANDI -> Yeniden Satışa (RESTOCK_TO_BIN) + Ödenmiş Kredi Notası
    track("returnRmaRecord", {
      id: "f4-rma-08",
      rmaNumber: "RMA-2026-408",
      orderNumber: "OMN-2026-9042",
      channelCode: "TRENDYOL",
      customerName: "Borusan Lojistik Dağıtım A.Ş.",
      sku: "LIL-KAZ-02",
      itemName: "Beyaz Kazablanka Lilyum (Kokulu)",
      returnQty: 2,
      returnReason: "14 Gün Yasal Cayma Hakkı",
      qcInspectionResult: "RESTOCK_TO_BIN",
      qualityDecision: "RESTOCK_TO_BIN",
      targetWarehouseId: "wh-merkez-01",
      targetBinCode: "A-01-01",
      receivedWarehouseId: "wh-merkez-01",
      receivedBinCode: "Q-01-01",
      receivedAt: daysAgoIso(61),
      receivedBy: "Depo Operatörü",
      inspectedAt: daysAgoIso(60),
      decidedAt: daysAgoIso(60),
      closedAt: daysAgoIso(59),
      inspectionId: "f4-qc-08",
      supplierId: "sup-yalova-02",
      creditNoteId: "f4-crn-08",
      creditNoteNo: "CRN-2026-0408",
      financeRecordId: "f4-fin-08",
      refundAmount: 620,
      refundStatus: "APPROVED_CREDITED",
      returnTrackingNo: "TYX-RMA-408111",
      returnCarrierCode: "TRENDYOL_EXPRESS",
      labelCode: generateRmaBarcodeValue("RMA-2026-408"),
      rmaStatus: "KAPANDI",
      reasonCode: "CAYMA_HAKKI",
      reasonNote: "Açılmamış ambalaj; soğuk oda rafına geri alındı ve iade ödendi",
      orderSourceType: "OMNICHANNEL",
      originalOrderId: "omni-ord-002",
      deliveredAt: d62,
      returnWindowDays: 14,
      returnDeadlineAt: daysAheadIso(d62, 14),
      isWithinReturnWindow: true,
      isWithinWarranty: false,
      estimatedCostTry: 0,
      recoveredValueTry: 620,
      cycleHours: 28.4,
      createdAt: d62,
      updatedAt: daysAgoIso(59),
      isActive: true,
    })

    // 2.9 KAPANDI -> Tamir / Yenileme (REPAIR_REFURBISH)
    track("returnRmaRecord", {
      id: "f4-rma-09",
      rmaNumber: "RMA-2026-409",
      orderNumber: "ORD-2026-0105",
      channelCode: "ERP",
      customerName: "Koç Holding",
      sku: "VAZ-ANT-03",
      itemName: "İthal Mat Antrasit Seramik Vazo (25cm)",
      returnQty: 1,
      returnReason: "Garanti Kapsamında Arıza",
      qcInspectionResult: "QUARANTINE_REPAIR",
      qualityDecision: "REPAIR_REFURBISH",
      targetWarehouseId: "wh-merkez-01",
      targetBinCode: "RMA-01-01",
      receivedWarehouseId: "wh-merkez-01",
      receivedBinCode: "RMA-01-01",
      receivedAt: daysAgoIso(75),
      receivedBy: "Depo Operatörü",
      inspectedAt: daysAgoIso(74),
      decidedAt: daysAgoIso(74),
      closedAt: daysAgoIso(73),
      inspectionId: "f4-qc-09",
      ncrId: "f4-ncr-09",
      supplierId: "sup-pasabahce-03",
      creditNoteId: "f4-crn-09",
      creditNoteNo: "CRN-2026-0409",
      financeRecordId: "f4-fin-09",
      refundAmount: 480,
      refundStatus: "APPROVED_CREDITED",
      returnTrackingNo: "ARAS-RMA-409210",
      returnCarrierCode: "ARAS",
      labelCode: generateRmaBarcodeValue("RMA-2026-409"),
      rmaStatus: "KAPANDI",
      reasonCode: "GARANTI_KAPSAMI",
      reasonNote: "Stand montajı yenilenerek tekrar kullanıma hazırlandı",
      orderSourceType: "ERP_ORDER",
      originalOrderId: "ord-05",
      deliveredAt: d76,
      returnWindowDays: 30,
      returnDeadlineAt: daysAheadIso(d76, 30),
      isWithinReturnWindow: true,
      isWithinWarranty: true,
      estimatedCostTry: 54,
      recoveredValueTry: 126,
      cycleHours: 52.0,
      createdAt: d76,
      updatedAt: daysAgoIso(73),
      isActive: true,
    })

    // 2.10 REDDEDILDI + 2.11 IPTAL
    track("returnRmaRecord", {
      id: "f4-rma-10",
      rmaNumber: "RMA-2026-410",
      orderNumber: "OMN-2026-9043",
      channelCode: "SHOPIFY",
      customerName: "Eczacıbaşı Monrol Nükleer Tıp A.Ş.",
      sku: "GUL-EKV-01",
      itemName: "Ekvator Kırmızı Gül (1. Kalite - 60cm)",
      returnQty: 2,
      returnReason: "Diğer İade Nedeni",
      qcInspectionResult: "QUARANTINE_REPAIR",
      targetWarehouseId: "wh-merkez-01",
      targetBinCode: "Q-01-01",
      refundAmount: 170,
      refundStatus: "REJECTED",
      returnTrackingNo: null,
      returnCarrierCode: "YURTICI",
      labelCode: generateRmaBarcodeValue("RMA-2026-410"),
      rmaStatus: "REDDEDILDI",
      reasonCode: "DIGER",
      reasonNote: "Müşteri kaynaklı hatalı saklama koşulları nedeniyle iade reddedildi",
      orderSourceType: "OMNICHANNEL",
      originalOrderId: "omni-ord-003",
      deliveredAt: d82,
      returnWindowDays: 14,
      returnDeadlineAt: daysAheadIso(d82, 14),
      isWithinReturnWindow: false,
      isWithinWarranty: false,
      createdAt: daysAgoIso(80),
      updatedAt: daysAgoIso(79),
      isActive: true,
    })

    track("returnRmaRecord", {
      id: "f4-rma-11",
      rmaNumber: "RMA-2026-411",
      orderNumber: "OMN-2026-9042",
      channelCode: "TRENDYOL",
      customerName: "Borusan Lojistik Dağıtım A.Ş.",
      sku: "LIL-KAZ-02",
      itemName: "Beyaz Kazablanka Lilyum (Kokulu)",
      returnQty: 1,
      returnReason: "Teslim Edilemedi (Adres / Alıcı)",
      qcInspectionResult: "PENDING_INSPECTION",
      targetWarehouseId: "wh-merkez-01",
      targetBinCode: "Q-01-01",
      refundAmount: 310,
      refundStatus: "PENDING",
      returnCarrierCode: "TRENDYOL_EXPRESS",
      labelCode: generateRmaBarcodeValue("RMA-2026-411"),
      rmaStatus: "IPTAL",
      reasonCode: "TESLIM_EDILEMEDI",
      reasonNote: "Müşteri kargoyu şubeden teslim aldığı için iade talebini iptal etti",
      orderSourceType: "OMNICHANNEL",
      originalOrderId: "omni-ord-002",
      deliveredAt: d20,
      returnWindowDays: 14,
      returnDeadlineAt: daysAheadIso(d20, 14),
      isWithinReturnWindow: false,
      isWithinWarranty: false,
      createdAt: daysAgoIso(18),
      updatedAt: daysAgoIso(17),
      isActive: true,
    })

    // 3. RMA Satırları (LojistikRmaLine)
    const rmaLineEntries = [
      { id: "f4-rmal-01a", rmaId: "f4-rma-01", itemId: "item-gul-01", sku: "GUL-EKV-01", itemName: "Ekvator Kırmızı Gül (1. Kalite - 60cm)", soldQty: 50, requestedQty: 3, receivedQty: 0, unitPrice: 85, supplierId: "sup-holland-01" },
      { id: "f4-rmal-01b", rmaId: "f4-rma-01", itemId: "item-vaz-03", sku: "VAZ-ANT-03", itemName: "İthal Mat Antrasit Seramik Vazo (25cm)", soldQty: 10, requestedQty: 2, receivedQty: 0, unitPrice: 380, supplierId: "sup-pasabahce-03" },
      { id: "f4-rmal-02", rmaId: "f4-rma-02", itemId: "item-lil-02", sku: "LIL-KAZ-02", itemName: "Beyaz Kazablanka Lilyum (Kokulu)", soldQty: 40, requestedQty: 3, receivedQty: 0, unitPrice: 310, supplierId: "sup-yalova-02" },
      { id: "f4-rmal-03", rmaId: "f4-rma-03", itemId: "item-vaz-03", sku: "VAZ-ANT-03", itemName: "İthal Mat Antrasit Seramik Vazo (25cm)", soldQty: 10, requestedQty: 2, receivedQty: 0, unitPrice: 380, supplierId: "sup-pasabahce-03" },
      { id: "f4-rmal-04", rmaId: "f4-rma-04", itemId: "item-gul-01", sku: "GUL-EKV-01", itemName: "Ekvator Kırmızı Gül (1. Kalite - 60cm)", soldQty: 60, requestedQty: 5, receivedQty: 3, damagedQty: 2, lotNumber: "LOT-GUL-2611-EARLY", targetBinCode: "Q-01-01", supplierId: "sup-holland-01" },
      { id: "f4-rmal-05", rmaId: "f4-rma-05", itemId: "item-ork-05", sku: "ORK-MOR-05", itemName: "Mor Phalaenopsis Orkide (Çift Dal)", soldQty: 23, requestedQty: 2, receivedQty: 2, damagedQty: 0, targetBinCode: "RMA-01-01", supplierId: "f3-sup-ant-05" },
      { id: "f4-rmal-06", rmaId: "f4-rma-06", itemId: "item-gul-01", sku: "GUL-EKV-01", itemName: "Ekvator Kırmızı Gül (1. Kalite - 60cm)", soldQty: 60, requestedQty: 4, receivedQty: 0, damagedQty: 4, disposition: "RETURN_TO_VENDOR", inspectionId: "f4-qc-06", ncrId: "f4-ncr-06", supplierId: "sup-holland-01" },
      { id: "f4-rmal-07", rmaId: "f4-rma-07", itemId: "item-vaz-03", sku: "VAZ-ANT-03", itemName: "İthal Mat Antrasit Seramik Vazo (25cm)", soldQty: 10, requestedQty: 1, receivedQty: 0, damagedQty: 1, disposition: "SCRAP", inspectionId: "f4-qc-07", ncrId: "f4-ncr-07", supplierId: "sup-pasabahce-03" },
      { id: "f4-rmal-08", rmaId: "f4-rma-08", itemId: "item-lil-02", sku: "LIL-KAZ-02", itemName: "Beyaz Kazablanka Lilyum (Kokulu)", soldQty: 40, requestedQty: 2, receivedQty: 2, damagedQty: 0, lotNumber: "LOT-LIL-2611-FRESH", disposition: "RESTOCK_TO_BIN", targetBinCode: "A-01-01", inspectionId: "f4-qc-08", supplierId: "sup-yalova-02" },
      { id: "f4-rmal-09", rmaId: "f4-rma-09", itemId: "item-vaz-03", sku: "VAZ-ANT-03", itemName: "İthal Mat Antrasit Seramik Vazo (25cm)", soldQty: 1, requestedQty: 1, receivedQty: 1, damagedQty: 0, disposition: "REPAIR_REFURBISH", targetBinCode: "RMA-01-01", inspectionId: "f4-qc-09", ncrId: "f4-ncr-09", supplierId: "sup-pasabahce-03" },
      { id: "f4-rmal-10", rmaId: "f4-rma-10", itemId: "item-gul-01", sku: "GUL-EKV-01", itemName: "Ekvator Kırmızı Gül (1. Kalite - 60cm)", soldQty: 60, requestedQty: 2, receivedQty: 0, supplierId: "sup-holland-01" },
      { id: "f4-rmal-11", rmaId: "f4-rma-11", itemId: "item-lil-02", sku: "LIL-KAZ-02", itemName: "Beyaz Kazablanka Lilyum (Kokulu)", soldQty: 40, requestedQty: 1, receivedQty: 0, supplierId: "sup-yalova-02" },
    ]
    for (const rl of rmaLineEntries) {
      track("lojistikRmaLine", {
        damagedQty: 0,
        missingQty: 0,
        vatRate: 20,
        createdAt: nowIso,
        updatedAt: nowIso,
        ...rl,
      })
    }

    // 4. Olay Günlükleri (LojistikRmaEventLog)
    const eventEntries = [
      { id: "f4-rmae-01", rmaId: "f4-rma-01", eventType: "RMA_CREATED", toStatus: "TALEP", actorName: "Müşteri / Webhook", method: "WEBHOOK", note: "Çok kalemli cayma hakkı talebi alındı (2 gün kaldı)." },
      { id: "f4-rmae-02", rmaId: "f4-rma-02", eventType: "STATUS_CHANGED", fromStatus: "TALEP", toStatus: "ONAYLANDI", actorName: "Operasyon Şefi", method: "WEB", note: "Yanlış ürün gönderimi teyit edildi, iade kodu verildi." },
      { id: "f4-rmae-03", rmaId: "f4-rma-03", eventType: "STATUS_CHANGED", fromStatus: "ONAYLANDI", toStatus: "YOLDA", actorName: "Trendyol / Yurtiçi", method: "WEB", note: "Kargo YK-RMA-403315 yola çıktı." },
      { id: "f4-rmae-04", rmaId: "f4-rma-04", eventType: "RMA_PHYSICAL_RECEIPT", fromStatus: "YOLDA", toStatus: "TESLIM_ALINDI", actorName: "Ahmet Yılmaz", method: "HANDHELD_CAMERA", binCode: "Q-01-01", qtyDelta: 5, note: "El terminali QR ile Q-01-01 karantina rafına alındı (3 sağlam, 2 hasarlı)." },
      { id: "f4-rmae-05", rmaId: "f4-rma-05", eventType: "STATUS_CHANGED", fromStatus: "TESLIM_ALINDI", toStatus: "INCELEMEDE", actorName: "Kalite Mühendisi", method: "WEB", binCode: "RMA-01-01", note: "Süre istisna onaylı ürün kalite testine alındı." },
      { id: "f4-rmae-06", rmaId: "f4-rma-06", eventType: "RMA_QUALITY_DECISION", fromStatus: "INCELEMEDE", toStatus: "KARARA_BAGLANDI", actorName: "Kalite Ekibi", method: "WEB", note: "Tedarikçiye İade (RETURN_TO_VENDOR) kararı ve NCR açıldı." },
      { id: "f4-rmae-07", rmaId: "f4-rma-07", eventType: "CREDIT_NOTE_APPROVED", fromStatus: "KARARA_BAGLANDI", toStatus: "KARARA_BAGLANDI", actorName: "Mali İşler", method: "WEB", note: "Hurda kararı sonrası CRN-2026-0407 onaylandı ve E-Belge kesildi." },
      { id: "f4-rmae-08", rmaId: "f4-rma-08", eventType: "REFUND_PAID", fromStatus: "KARARA_BAGLANDI", toStatus: "KAPANDI", actorName: "Mali İşler", method: "WEB", binCode: "A-01-01", note: "Sağlam ürün A-01-01 rafına alındı ve CRN-2026-0408 ödendi." },
      { id: "f4-rmae-09", rmaId: "f4-rma-09", eventType: "REFUND_PAID", fromStatus: "KARARA_BAGLANDI", toStatus: "KAPANDI", actorName: "Mali İşler", method: "WEB", note: "Garanti tamiri sonrası dosya kapatıldı." },
      { id: "f4-rmae-10", rmaId: "f4-rma-10", eventType: "STATUS_CHANGED", fromStatus: "TALEP", toStatus: "REDDEDILDI", actorName: "Kalite Ekibi", method: "WEB", note: "Kullanım/saklama hatası nedeniyle iade reddedildi." },
      { id: "f4-rmae-11", rmaId: "f4-rma-11", eventType: "STATUS_CHANGED", fromStatus: "TALEP", toStatus: "IPTAL", actorName: "Müşteri Destek", method: "WEB", note: "Müşteri siparişi teslim alarak iadeden vazgeçti." },
    ]
    for (const ev of eventEntries) {
      track("lojistikRmaEventLog", { createdAt: daysAgoIso(1), ...ev })
    }

    // 5. Kalite Muayeneleri & NCR (Mevcut uretimQualityInspection / uretimQualityNcr Yeniden Kullanımı)
    track("uretimQualityInspection", {
      id: "f4-qc-06",
      inspectionNumber: "QC-RMA-2026-406",
      inspectionType: "RETURN_RMA",
      itemId: "item-gul-01",
      supplierId: "sup-holland-01",
      supplierName: "Royal Flora Holland İthalat Konsorsiyumu",
      goodsReceiptId: "RMA-2026-406",
      batchQuantity: 4,
      sampleSize: 4,
      acceptedQty: 0,
      rejectedQty: 4,
      decision: "REJECTED",
      status: "COMPLETED",
      decisionNotes: "İthal partide yaprak yanıklığı; tedarikçiye iade (RTV).",
      inspectedAt: daysAgoIso(33),
      createdAt: daysAgoIso(33),
    })

    track("uretimQualityInspection", {
      id: "f4-qc-07",
      inspectionNumber: "QC-RMA-2026-407",
      inspectionType: "RETURN_RMA",
      itemId: "item-vaz-03",
      supplierId: "sup-pasabahce-03",
      supplierName: "Paşabahçe & Paşa Cam Sanayi A.Ş.",
      goodsReceiptId: "RMA-2026-407",
      batchQuantity: 1,
      sampleSize: 1,
      acceptedQty: 0,
      rejectedQty: 1,
      decision: "REJECTED",
      status: "COMPLETED",
      decisionNotes: "Kargo darbesiyle kırık; hurda ayrıldı.",
      inspectedAt: daysAgoIso(46),
      createdAt: daysAgoIso(46),
    })

    track("uretimQualityInspection", {
      id: "f4-qc-08",
      inspectionNumber: "QC-RMA-2026-408",
      inspectionType: "RETURN_RMA",
      itemId: "item-lil-02",
      supplierId: "sup-yalova-02",
      supplierName: "Yalova Çiçekçilik & Kesme Gül Üreticileri Kooperatifi",
      goodsReceiptId: "RMA-2026-408",
      batchQuantity: 2,
      sampleSize: 2,
      acceptedQty: 2,
      rejectedQty: 0,
      decision: "ACCEPTED",
      status: "COMPLETED",
      decisionNotes: "Ambalaj sağlam, soğuk oda rafına geri alındı.",
      inspectedAt: daysAgoIso(60),
      createdAt: daysAgoIso(60),
    })

    track("uretimQualityInspection", {
      id: "f4-qc-09",
      inspectionNumber: "QC-RMA-2026-409",
      inspectionType: "RETURN_RMA",
      itemId: "item-vaz-03",
      supplierId: "sup-pasabahce-03",
      supplierName: "Paşabahçe & Paşa Cam Sanayi A.Ş.",
      goodsReceiptId: "RMA-2026-409",
      batchQuantity: 1,
      sampleSize: 1,
      acceptedQty: 1,
      rejectedQty: 0,
      decision: "CONDITIONAL",
      status: "COMPLETED",
      decisionNotes: "Tamir / yenileme sonrası onaylandı.",
      inspectedAt: daysAgoIso(74),
      createdAt: daysAgoIso(74),
    })

    track("uretimQualityNcr", {
      id: "f4-ncr-06",
      ncrNumber: "NCR-RMA-2026-406",
      inspectionId: "f4-qc-06",
      itemId: "item-gul-01",
      source: "CUSTOMER_COMPLAINT",
      severity: "MAJOR",
      defectCategory: "MATERIAL",
      title: "RMA-2026-406 — RETURN_TO_VENDOR Uygunsuzluğu",
      description: "Tedarikçiye iade edilen kusurlu Ekvator gül partisi.",
      affectedQuantity: 4,
      costImpact: 1000,
      status: "OPEN",
      createdAt: daysAgoIso(33),
      updatedAt: daysAgoIso(33),
    })

    track("uretimQualityNcr", {
      id: "f4-ncr-07",
      ncrNumber: "NCR-RMA-2026-407",
      inspectionId: "f4-qc-07",
      itemId: "item-vaz-03",
      source: "CUSTOMER_COMPLAINT",
      severity: "CRITICAL",
      defectCategory: "PACKAGING",
      title: "RMA-2026-407 — SCRAP Uygunsuzluğu",
      description: "Taşımada kırılan seramik vazo hurda imha kaydı.",
      affectedQuantity: 1,
      costImpact: 180,
      status: "CLOSED",
      createdAt: daysAgoIso(46),
      updatedAt: daysAgoIso(45),
    })

    track("uretimQualityNcr", {
      id: "f4-ncr-09",
      ncrNumber: "NCR-RMA-2026-409",
      inspectionId: "f4-qc-09",
      itemId: "item-vaz-03",
      source: "CUSTOMER_COMPLAINT",
      severity: "MINOR",
      defectCategory: "WORKMANSHIP",
      title: "RMA-2026-409 — REPAIR_REFURBISH Uygunsuzluğu",
      description: "Stand montaj düzeltmesi yapıldı.",
      affectedQuantity: 1,
      costImpact: 54,
      status: "CLOSED",
      createdAt: daysAgoIso(74),
      updatedAt: daysAgoIso(73),
    })

    // 6. Kredi Notaları + E-Belge + Finans Kayıtları
    track("lojistikRmaCreditNote", {
      id: "f4-crn-06",
      creditNoteNo: "CRN-2026-0406",
      rmaId: "f4-rma-06",
      rmaNumber: "RMA-2026-406",
      orderNumber: "OMN-2026-9043",
      customerName: "Eczacıbaşı Monrol Nükleer Tıp A.Ş.",
      netAmount: 283.33,
      vatAmount: 56.67,
      grossAmount: 340,
      currency: "TRY",
      status: "TASLAK_ONAY_BEKLIYOR",
      branchId: "local-debug-branch",
      requestedBy: "Operasyon Ekibi",
      notes: "RTV kararı sonrası mali onay bekleyen kredi notası taslağı",
      createdAt: daysAgoIso(32),
      updatedAt: daysAgoIso(32),
    })

    track("eDocumentRecord", {
      id: "f4-edoc-07",
      ettnUuid: "f4000007-0000-4000-8000-000000000407",
      documentNo: "IAD2026000407",
      documentType: "E_FATURA",
      profileId: "IADE",
      relatedOrderNo: "OMN-2026-9041",
      receiverTitle: "KoçSistem Bilgi ve İletişim Hizmetleri A.Ş.",
      receiverVknTckn: "1111111111",
      receiverTaxOffice: "Kurumsal İade",
      carrierName: "YURTICI",
      totalNetAmount: 316.67,
      totalVatAmount: 63.33,
      totalGrossAmount: 380,
      currency: "TRY",
      gibStatusCode: "1300",
      gibStatusText: "GİB Onaylı - İade Kredi Notası (CRN-2026-0407)",
      dispatchDate: daysAgoIso(45),
      createdAt: daysAgoIso(45),
    })

    track("finance", {
      id: "f4-fin-07",
      branchId: "local-debug-branch",
      type: "EXPENSE",
      amount: 380,
      category: "Müşteri İadesi & Kredi Notası",
      description: "CRN-2026-0407 — RMA-2026-407 (OMN-2026-9041)",
      status: "approved",
      approvedBy: "Mali İşler Müdürü",
      date: daysAgoIso(45),
      createdAt: daysAgoIso(45),
    })

    track("lojistikRmaCreditNote", {
      id: "f4-crn-07",
      creditNoteNo: "CRN-2026-0407",
      rmaId: "f4-rma-07",
      rmaNumber: "RMA-2026-407",
      orderNumber: "OMN-2026-9041",
      customerName: "KoçSistem Bilgi ve İletişim Hizmetleri A.Ş.",
      netAmount: 316.67,
      vatAmount: 63.33,
      grossAmount: 380,
      currency: "TRY",
      status: "ONAYLANDI",
      eDocumentId: "f4-edoc-07",
      eDocumentNo: "IAD2026000407",
      financeId: "f4-fin-07",
      branchId: "local-debug-branch",
      requestedBy: "Operasyon",
      approvedBy: "Mali İşler Müdürü",
      approvedAt: daysAgoIso(45),
      notes: "Onaylandı; ödeme çıkışı bekliyor",
      createdAt: daysAgoIso(46),
      updatedAt: daysAgoIso(45),
    })

    track("eDocumentRecord", {
      id: "f4-edoc-08",
      ettnUuid: "f4000008-0000-4000-8000-000000000408",
      documentNo: "IAD2026000408",
      documentType: "E_FATURA",
      profileId: "IADE",
      relatedOrderNo: "OMN-2026-9042",
      receiverTitle: "Borusan Lojistik Dağıtım A.Ş.",
      receiverVknTckn: "1111111111",
      receiverTaxOffice: "Kurumsal İade",
      carrierName: "TRENDYOL_EXPRESS",
      totalNetAmount: 516.67,
      totalVatAmount: 103.33,
      totalGrossAmount: 620,
      currency: "TRY",
      gibStatusCode: "1300",
      gibStatusText: "GİB Onaylı - İade Kredi Notası (CRN-2026-0408)",
      dispatchDate: daysAgoIso(59),
      createdAt: daysAgoIso(59),
    })

    track("finance", {
      id: "f4-fin-08",
      branchId: "local-debug-branch",
      type: "EXPENSE",
      amount: 620,
      category: "Müşteri İadesi & Kredi Notası",
      description: "CRN-2026-0408 — RMA-2026-408 (OMN-2026-9042)",
      status: "approved",
      approvedBy: "Mali İşler Müdürü",
      date: daysAgoIso(59),
      createdAt: daysAgoIso(59),
    })

    track("lojistikRmaCreditNote", {
      id: "f4-crn-08",
      creditNoteNo: "CRN-2026-0408",
      rmaId: "f4-rma-08",
      rmaNumber: "RMA-2026-408",
      orderNumber: "OMN-2026-9042",
      customerName: "Borusan Lojistik Dağıtım A.Ş.",
      netAmount: 516.67,
      vatAmount: 103.33,
      grossAmount: 620,
      currency: "TRY",
      status: "IADE_ODENDI",
      eDocumentId: "f4-edoc-08",
      eDocumentNo: "IAD2026000408",
      financeId: "f4-fin-08",
      branchId: "local-debug-branch",
      requestedBy: "Operasyon",
      approvedBy: "Mali İşler Müdürü",
      approvedAt: daysAgoIso(59),
      paidAt: daysAgoIso(59),
      notes: "İade ödemesi tamamlandı ve RMA kapatıldı",
      createdAt: daysAgoIso(60),
      updatedAt: daysAgoIso(59),
    })

    track("eDocumentRecord", {
      id: "f4-edoc-09",
      ettnUuid: "f4000009-0000-4000-8000-000000000409",
      documentNo: "IAD2026000409",
      documentType: "E_FATURA",
      profileId: "IADE",
      relatedOrderNo: "ORD-2026-0105",
      receiverTitle: "Koç Holding",
      receiverVknTckn: "1111111111",
      receiverTaxOffice: "Kurumsal İade",
      carrierName: "ARAS",
      totalNetAmount: 400,
      totalVatAmount: 80,
      totalGrossAmount: 480,
      currency: "TRY",
      gibStatusCode: "1300",
      gibStatusText: "GİB Onaylı - İade Kredi Notası (CRN-2026-0409)",
      dispatchDate: daysAgoIso(73),
      createdAt: daysAgoIso(73),
    })

    track("finance", {
      id: "f4-fin-09",
      branchId: "local-debug-branch",
      type: "EXPENSE",
      amount: 480,
      category: "Müşteri İadesi & Kredi Notası",
      description: "CRN-2026-0409 — RMA-2026-409 (ORD-2026-0105)",
      status: "approved",
      approvedBy: "Mali İşler Müdürü",
      date: daysAgoIso(73),
      createdAt: daysAgoIso(73),
    })

    track("lojistikRmaCreditNote", {
      id: "f4-crn-09",
      creditNoteNo: "CRN-2026-0409",
      rmaId: "f4-rma-09",
      rmaNumber: "RMA-2026-409",
      orderNumber: "ORD-2026-0105",
      customerName: "Koç Holding",
      netAmount: 400,
      vatAmount: 80,
      grossAmount: 480,
      currency: "TRY",
      status: "IADE_ODENDI",
      eDocumentId: "f4-edoc-09",
      eDocumentNo: "IAD2026000409",
      financeId: "f4-fin-09",
      branchId: "local-debug-branch",
      requestedBy: "Operasyon",
      approvedBy: "Mali İşler Müdürü",
      approvedAt: daysAgoIso(73),
      paidAt: daysAgoIso(73),
      notes: "Garanti tamiri sonrası ödeme tamamlandı",
      createdAt: daysAgoIso(74),
      updatedAt: daysAgoIso(73),
    })

    // 7. Karantina Stok Bakiyesi & Defter Hareketleri (Mevcut kayıtlara dokunmadan f4-* olarak)
    track("stockBalance", {
      id: "f4-bal-quar-gul",
      itemId: "item-gul-01",
      warehouseId: "wh-merkez-01",
      storageBinId: "f2-bin-mrk-qar-q1",
      binCode: "Q-01-01",
      onHandQty: 5,
      reservedQty: 0,
      availableQty: 0,
      inTransitQty: 0,
      quarantineQty: 5,
      consignmentQty: 0,
      createdAt: daysAgoIso(1),
      updatedAt: daysAgoIso(1),
    })

    track("stockBalance", {
      id: "f4-bal-rma-ork",
      itemId: "item-ork-05",
      warehouseId: "wh-merkez-01",
      storageBinId: "f2-bin-mrk-rma-r1",
      binCode: "RMA-01-01",
      onHandQty: 2,
      reservedQty: 0,
      availableQty: 0,
      inTransitQty: 0,
      quarantineQty: 2,
      consignmentQty: 0,
      createdAt: daysAgoIso(2),
      updatedAt: daysAgoIso(2),
    })

    track("stockMovement", {
      id: "f4-mov-quar-04",
      itemId: "item-gul-01",
      warehouseId: "wh-merkez-01",
      storageBinId: "f2-bin-mrk-qar-q1",
      toBinCode: "Q-01-01",
      movementType: "RMA_RETURN",
      quantity: 5,
      documentType: "RMA_RETURN",
      documentNo: "RMA-2026-404",
      referenceDocNo: "RMA-2026-404",
      performedBy: "Ahmet Yılmaz",
      method: "HANDHELD_CAMERA",
      deviceId: "ZEBRA-TC58-IST-01",
      idempotencyKey: "f4-seed-rma-404-l0",
      notes: "İade Mal Kabul (RMA-2026-404) -> Karantina Rafı (Q-01-01)",
      createdAt: daysAgoIso(1),
    })

    track("stockMovement", {
      id: "f4-mov-rma-05",
      itemId: "item-ork-05",
      warehouseId: "wh-merkez-01",
      storageBinId: "f2-bin-mrk-rma-r1",
      toBinCode: "RMA-01-01",
      movementType: "RMA_RETURN",
      quantity: 2,
      documentType: "RMA_RETURN",
      documentNo: "RMA-2026-405",
      referenceDocNo: "RMA-2026-405",
      performedBy: "Elif Demir",
      method: "WEB",
      idempotencyKey: "f4-seed-rma-405-l0",
      notes: "İade Mal Kabul (RMA-2026-405) -> İade Kabul Rafı (RMA-01-01)",
      createdAt: daysAgoIso(2),
    })

    // 8. Webhook Günlüğü Kayıtları (INBOUND ACCEPTED / DUPLICATE / REJECTED + OUTBOUND)
    track("lojistikRmaWebhookLog", {
      id: "f4-whl-01",
      direction: "INBOUND",
      channelCode: "TRENDYOL",
      eventType: "RETURN_REQUEST",
      externalRef: "TY-EXT-RMA-401",
      idempotencyKey: "wh-f4-ty-401",
      rmaId: "f4-rma-01",
      rmaNumber: "RMA-2026-401",
      signatureVerified: true,
      status: "ACCEPTED",
      payloadJson: JSON.stringify({ event: "RETURN_REQUEST", orderNumber: "OMN-2026-9041", reasonCode: "CAYMA_HAKKI" }),
      responseNote: "RMA-2026-401 RMA belgesi oluşturuldu (demo-db-ecommerce-returns).",
      createdAt: daysAgoIso(1),
    })

    track("lojistikRmaWebhookLog", {
      id: "f4-whl-02",
      direction: "INBOUND",
      channelCode: "TRENDYOL",
      eventType: "RETURN_REQUEST",
      externalRef: "TY-EXT-RMA-401",
      idempotencyKey: "wh-f4-ty-401-dup",
      rmaId: "f4-rma-01",
      rmaNumber: "RMA-2026-401",
      signatureVerified: true,
      status: "DUPLICATE",
      payloadJson: JSON.stringify({ event: "RETURN_REQUEST", orderNumber: "OMN-2026-9041", idempotencyKey: "wh-f4-ty-401" }),
      responseNote: "Idempotency tekilleştirme: RMA-2026-401 mevcut kayda bağlandı.",
      createdAt: daysAgoIso(1),
    })

    track("lojistikRmaWebhookLog", {
      id: "f4-whl-03",
      direction: "INBOUND",
      channelCode: "HEPSIBURADA",
      eventType: "RETURN_REQUEST",
      externalRef: "HB-FORGED-99",
      idempotencyKey: "wh-f4-hb-bad-sig",
      rmaId: null,
      rmaNumber: null,
      signatureVerified: false,
      status: "REJECTED",
      payloadJson: JSON.stringify({ event: "RETURN_REQUEST", orderNumber: "OMN-2026-9042", forged: true }),
      responseNote: "İmza reddedildi: INVALID_HMAC_SIGNATURE",
      createdAt: daysAgoIso(2),
    })

    track("lojistikRmaWebhookLog", {
      id: "f4-whl-04",
      direction: "OUTBOUND",
      channelCode: "TRENDYOL",
      eventType: "RMA_STATUS_PUSH",
      externalRef: "TY-EXT-RMA-402",
      rmaId: "f4-rma-02",
      rmaNumber: "RMA-2026-402",
      signatureVerified: true,
      status: "ACCEPTED",
      payloadJson: JSON.stringify({ rmaNumber: "RMA-2026-402", status: "ONAYLANDI" }),
      responseNote: "TRENDYOL iade durumu (ONAYLANDI) demo veritabanına senkronize edildi.",
      createdAt: daysAgoIso(1),
    })

    const totalTargets = Object.values(
      faz4ReturnsAndRmaSeedModule.seededIdsByCollection
    ).reduce((sum, list) => sum + list.length, 0)
    const totalInserted = Object.values(inserted).reduce((sum, n) => sum + n, 0)

    return {
      moduleKey: "faz4_iade_ve_rma",
      inserted,
      skippedExisting: Math.max(0, totalTargets - totalInserted),
      notes: [
        "4 İade/Garanti Politikası (14 gün yasal taban + kategori & ürün garantisi) eklendi.",
        "9 durumun tamamını kapsayan 11 RMA kaydı (son 90 gün), karantina bakiyeleri, NCR/QC kayıtları, kredi notaları ve webhook günlükleri eklendi.",
      ],
    }
  },

  rollback(db) {
    const removed: Record<string, number> = {}
    removed.lojistikRmaWebhookLog = removeByIds(db.lojistikRmaWebhookLog, new Set(SEEDED_WEBHOOK_IDS))
    removed.stockMovement = removeByIds(db.stockMovement, new Set(SEEDED_MOVEMENT_IDS))
    removed.stockBalance = removeByIds(db.stockBalance, new Set(SEEDED_BALANCE_IDS))
    removed.lojistikRmaCreditNote = removeByIds(db.lojistikRmaCreditNote, new Set(SEEDED_CREDIT_IDS))
    removed.finance = removeByIds(db.finance, new Set(SEEDED_FINANCE_IDS))
    removed.eDocumentRecord = removeByIds(db.eDocumentRecord, new Set(SEEDED_EDOC_IDS))
    removed.uretimQualityNcr = removeByIds(db.uretimQualityNcr, new Set(SEEDED_NCR_IDS))
    removed.uretimQualityInspection = removeByIds(db.uretimQualityInspection, new Set(SEEDED_QC_IDS))
    removed.lojistikRmaEventLog = removeByIds(db.lojistikRmaEventLog, new Set(SEEDED_EVENT_IDS))
    removed.lojistikRmaLine = removeByIds(db.lojistikRmaLine, new Set(SEEDED_RMA_LINE_IDS))
    removed.returnRmaRecord = removeByIds(db.returnRmaRecord, new Set(SEEDED_RMA_IDS))
    removed.lojistikReturnPolicy = removeByIds(db.lojistikReturnPolicy, new Set(SEEDED_POLICY_IDS))
    return removed
  },
}
