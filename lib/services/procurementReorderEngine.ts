/**
 * FAZ 3: Akıllı Satın Alma, Tedarik ve Konsinye Yönetimi Motoru
 * - Geçmiş talep, mevsimsellik katsayısı, güvenlik stoğu (Z * sigma_d * sqrt(L)) ve
 *   tedarik süresine (Lead Time) göre dinamik Yeniden Sipariş Noktası (ROP) ve EOQ hesaplama
 * - Kritik stok seviyelerinde otomatik düşük stok bildirimleri ve Satın Alma Talebi (PR / PO) üretimi
 * - Tedarikçi kaynaklı Konsinye (Emanet) stokların ayrı takibi ve tüketildikçe otomatik hakediş/fatura mutabakatı
 */

export interface SupplierProfile {
  id: string
  code: string
  name: string
  contactPerson: string
  email: string
  phone: string
  leadTimeDays: number
  onTimeDeliveryRate: number
  qualityAcceptance: number
  paymentTermsDays: number
  supportsConsignment: boolean
  supportsDropship: boolean
  rating: number
}

export interface ReorderPolicyRecord {
  id: string
  itemId: string
  sku: string
  itemName: string
  category: string
  warehouseCode: string
  warehouseName: string
  supplierId: string
  supplierName: string
  currentAvailableQty: number
  onOrderQty: number
  avgDailyDemand: number
  demandStdDev: number
  leadTimeDays: number
  serviceLevelPercent: number // 90, 95, 99
  serviceLevelZ: number       // 1.28, 1.65, 2.33
  seasonalityMultiplier: number // 0.6 .. 2.2
  calculatedSafetyStock: number
  calculatedRop: number
  recommendedOrderQty: number
  minOrderQtyMoq: number
  unitCost: number
  unit: string
  autoCreateRequisition: boolean
  status: "HEALTHY" | "BELOW_ROP" | "CRITICAL_SAFETY" | "STOCKOUT"
}

export interface PurchaseRequisitionRecord {
  id: string
  reqNumber: string
  triggerSource: "AUTO_ROP_ENGINE" | "FORESIGHT_AI" | "MANUAL_REQUEST" | "BACKORDER_COVER"
  warehouseCode: string
  warehouseName: string
  supplierName: string
  sku: string
  itemName: string
  currentQty: number
  ropThreshold: number
  orderQty: number
  unit: string
  unitPriceTry: number
  totalAmountTry: number
  priority: "NORMAL" | "HIGH" | "CRITICAL"
  status: "PENDING_APPROVAL" | "APPROVED_PO_SENT" | "RECEIVED"
  expectedDeliveryDate: string
  createdAt: string
}

export interface ConsignmentStockRecord {
  id: string
  agreementNo: string
  supplierId: string
  supplierName: string
  itemId: string
  sku: string
  itemName: string
  warehouseCode: string
  warehouseName: string
  binCode: string
  lotNumber: string
  receivedConsignQty: number
  availableConsignQty: number
  consumedOrSoldQty: number
  returnedToVendorQty: number
  unit: string
  agreedUnitCostTry: number
  unbilledPayableTry: number
  lastSettlementDate: string
  status: "ACTIVE_CONSIGNMENT" | "SETTLEMENT_READY" | "SETTLED"
}

export const INITIAL_SUPPLIERS: SupplierProfile[] = [
  {
    id: "sup-01",
    code: "SUP-IMP-001",
    name: "Impinj & Arrow Electronics Global Tedarik A.Ş.",
    contactPerson: "Kerem Soylu",
    email: "tedarik@arrow-impinj.com.tr",
    phone: "0216 444 19 20",
    leadTimeDays: 14,
    onTimeDeliveryRate: 96.4,
    qualityAcceptance: 99.2,
    paymentTermsDays: 45,
    supportsConsignment: true,
    supportsDropship: true,
    rating: 4.9
  },
  {
    id: "sup-02",
    code: "SUP-KRZ-002",
    name: "Korozo & BioChem Soğuk Zincir Kimyasalları A.Ş.",
    contactPerson: "Deniz Akpınar",
    email: "siparis@biochem-korozo.com.tr",
    phone: "0262 648 22 10",
    leadTimeDays: 4,
    onTimeDeliveryRate: 98.1,
    qualityAcceptance: 99.5,
    paymentTermsDays: 30,
    supportsConsignment: false,
    supportsDropship: true,
    rating: 4.8
  },
  {
    id: "sup-03",
    code: "SUP-KRD-003",
    name: "Kordsa & Akın Teknik Tekstil Konsorsiyumu",
    contactPerson: "Sibel Çetin",
    email: "kurumsal@kordsatex.com.tr",
    phone: "0212 310 88 00",
    leadTimeDays: 7,
    onTimeDeliveryRate: 94.8,
    qualityAcceptance: 97.6,
    paymentTermsDays: 60,
    supportsConsignment: true,
    supportsDropship: false,
    rating: 4.7
  },
  {
    id: "sup-04",
    code: "SUP-PANA-004",
    name: "Panasonic Energy Endüstriyel Batarya Türkiye",
    contactPerson: "Tarkan Yıldırım",
    email: "b2b@panasonic-energy.com.tr",
    phone: "0216 570 90 10",
    leadTimeDays: 9,
    onTimeDeliveryRate: 97.0,
    qualityAcceptance: 99.8,
    paymentTermsDays: 45,
    supportsConsignment: true,
    supportsDropship: true,
    rating: 4.95
  }
]

/**
 * Dinamik ROP (Yeniden Sipariş Noktası) ve Güvenlik Stoğu Hesaplama Motoru
 * Formül:
 *   SafetyStock (SS) = Z * sigma_d * sqrt(LeadTime)
 *   ROP = (AvgDailyDemand * SeasonalityMultiplier * LeadTime) + SS
 */
export function calculateDynamicReorderPoint(params: {
  avgDailyDemand: number
  demandStdDev: number
  leadTimeDays: number
  serviceLevelPercent: number
  seasonalityMultiplier: number
  currentAvailableQty: number
  onOrderQty: number
  minOrderQtyMoq: number
}): {
  serviceLevelZ: number
  safetyStock: number
  reorderPointRop: number
  recommendedOrderQty: number
  status: ReorderPolicyRecord["status"]
} {
  const zMap: Record<number, number> = {
    90: 1.28,
    95: 1.65,
    98: 2.05,
    99: 2.33
  }
  const serviceLevelZ = zMap[params.serviceLevelPercent] || 1.65
  const safeLead = Math.max(1, params.leadTimeDays)
  const safetyStock = Math.ceil(serviceLevelZ * params.demandStdDev * Math.sqrt(safeLead))
  const expectedLeadDemand = Math.ceil(
    params.avgDailyDemand * params.seasonalityMultiplier * safeLead
  )
  const reorderPointRop = expectedLeadDemand + safetyStock

  const netPosition = params.currentAvailableQty + params.onOrderQty
  const targetMax = reorderPointRop + Math.ceil(expectedLeadDemand * 1.2)
  const rawOrderNeed = Math.max(0, targetMax - netPosition)
  const recommendedOrderQty =
    netPosition <= reorderPointRop ? Math.max(params.minOrderQtyMoq, rawOrderNeed) : 0

  let status: ReorderPolicyRecord["status"] = "HEALTHY"
  if (params.currentAvailableQty <= 0) {
    status = "STOCKOUT"
  } else if (params.currentAvailableQty <= safetyStock) {
    status = "CRITICAL_SAFETY"
  } else if (netPosition <= reorderPointRop) {
    status = "BELOW_ROP"
  }

  return {
    serviceLevelZ,
    safetyStock,
    reorderPointRop,
    recommendedOrderQty,
    status
  }
}

export const INITIAL_REORDER_POLICIES: ReorderPolicyRecord[] = [
  {
    id: "rop-01",
    itemId: "item-raw-rfid-mod",
    sku: "CMP-UHF-IMPINJ-E710",
    itemName: "Impinj E710 UHF RFID Okuyucu Modül Çipi",
    category: "Elektronik Komponent",
    warehouseCode: "DEP-IST-01",
    warehouseName: "Tuzla Merkez Akıllı Lojistik & WMS Üssü",
    supplierId: "sup-01",
    supplierName: "Impinj & Arrow Electronics Global Tedarik A.Ş.",
    currentAvailableQty: 32,
    onOrderQty: 25,
    avgDailyDemand: 6.5,
    demandStdDev: 2.1,
    leadTimeDays: 14,
    serviceLevelPercent: 99,
    serviceLevelZ: 2.33,
    seasonalityMultiplier: 1.25,
    calculatedSafetyStock: 19,
    calculatedRop: 133,
    recommendedOrderQty: 150,
    minOrderQtyMoq: 50,
    unitCost: 5120,
    unit: "Adet",
    autoCreateRequisition: true,
    status: "BELOW_ROP"
  },
  {
    id: "rop-02",
    itemId: "item-cold-bio-01",
    sku: "BIO-THERM-GEL-5L",
    itemName: "BioTherm Medikal & Gıda Soğuk Zincir Faz Değişim Jeli (5L)",
    category: "Soğuk Zincir & Kimyasal",
    warehouseCode: "DEP-GBZ-04",
    warehouseName: "Gebze Soğuk Zincir & SKT Hassas Hammadde Deposu",
    supplierId: "sup-02",
    supplierName: "Korozo & BioChem Soğuk Zincir Kimyasalları A.Ş.",
    currentAvailableQty: 80,
    onOrderQty: 0,
    avgDailyDemand: 22,
    demandStdDev: 5.4,
    leadTimeDays: 4,
    serviceLevelPercent: 95,
    serviceLevelZ: 1.65,
    seasonalityMultiplier: 1.35,
    calculatedSafetyStock: 18,
    calculatedRop: 137,
    recommendedOrderQty: 180,
    minOrderQtyMoq: 40,
    unitCost: 665,
    unit: "Bidon",
    autoCreateRequisition: true,
    status: "BELOW_ROP"
  },
  {
    id: "rop-03",
    itemId: "item-fg-terminal",
    sku: "WMS-HHT-X900",
    itemName: "SunumTech X900 Endüstriyel 2D Barkod & UHF RFID El Terminali",
    category: "Otomasyon & Donanım",
    warehouseCode: "DEP-IST-01",
    warehouseName: "Tuzla Merkez Akıllı Lojistik & WMS Üssü",
    supplierId: "sup-01",
    supplierName: "Impinj & Arrow Electronics Global Tedarik A.Ş.",
    currentAvailableQty: 14,
    onOrderQty: 0,
    avgDailyDemand: 4.2,
    demandStdDev: 1.8,
    leadTimeDays: 10,
    serviceLevelPercent: 99,
    serviceLevelZ: 2.33,
    seasonalityMultiplier: 1.4,
    calculatedSafetyStock: 14,
    calculatedRop: 73,
    recommendedOrderQty: 90,
    minOrderQtyMoq: 24,
    unitCost: 14850,
    unit: "Adet",
    autoCreateRequisition: true,
    status: "CRITICAL_SAFETY"
  },
  {
    id: "rop-04",
    itemId: "item-mat-var-01",
    sku: "MTX-PRO-JACKET-NVY-M",
    itemName: "Endüstriyel Pro-Shield Mont — Gece Mavisi / M Beden",
    category: "Teknik Tekstil & KKD",
    warehouseCode: "DEP-IST-01",
    warehouseName: "Tuzla Merkez Akıllı Lojistik & WMS Üssü",
    supplierId: "sup-03",
    supplierName: "Kordsa & Akın Teknik Tekstil Konsorsiyumu",
    currentAvailableQty: 155,
    onOrderQty: 40,
    avgDailyDemand: 12,
    demandStdDev: 3.0,
    leadTimeDays: 7,
    serviceLevelPercent: 95,
    serviceLevelZ: 1.65,
    seasonalityMultiplier: 1.5, // Kış sezonu katsayısı
    calculatedSafetyStock: 14,
    calculatedRop: 140,
    recommendedOrderQty: 0,
    minOrderQtyMoq: 48,
    unitCost: 1495,
    unit: "Adet",
    autoCreateRequisition: true,
    status: "HEALTHY"
  }
]

export const INITIAL_PURCHASE_REQUISITIONS: PurchaseRequisitionRecord[] = [
  {
    id: "pr-01",
    reqNumber: "PR-AUTO-2026-0419",
    triggerSource: "AUTO_ROP_ENGINE",
    warehouseCode: "DEP-IST-01",
    warehouseName: "Tuzla Merkez Akıllı Lojistik & WMS Üssü",
    supplierName: "Impinj & Arrow Electronics Global Tedarik A.Ş.",
    sku: "CMP-UHF-IMPINJ-E710",
    itemName: "Impinj E710 UHF RFID Okuyucu Modül Çipi",
    currentQty: 32,
    ropThreshold: 133,
    orderQty: 150,
    unit: "Adet",
    unitPriceTry: 5120,
    totalAmountTry: 768000,
    priority: "CRITICAL",
    status: "PENDING_APPROVAL",
    expectedDeliveryDate: "2026-11-17",
    createdAt: "2026-11-03 08:30"
  },
  {
    id: "pr-02",
    reqNumber: "PR-AUTO-2026-0420",
    triggerSource: "AUTO_ROP_ENGINE",
    warehouseCode: "DEP-GBZ-04",
    warehouseName: "Gebze Soğuk Zincir & SKT Hassas Hammadde Deposu",
    supplierName: "Korozo & BioChem Soğuk Zincir Kimyasalları A.Ş.",
    sku: "BIO-THERM-GEL-5L",
    itemName: "BioTherm Medikal & Gıda Soğuk Zincir Faz Değişim Jeli (5L)",
    currentQty: 80,
    ropThreshold: 137,
    orderQty: 180,
    unit: "Bidon",
    unitPriceTry: 665,
    totalAmountTry: 119700,
    priority: "HIGH",
    status: "PENDING_APPROVAL",
    expectedDeliveryDate: "2026-11-07",
    createdAt: "2026-11-03 09:10"
  },
  {
    id: "pr-03",
    reqNumber: "PR-AI-2026-0415",
    triggerSource: "FORESIGHT_AI",
    warehouseCode: "DEP-KDK-02",
    warehouseName: "Kadıköy Mağaza & Hızlı Teslimat Deposu",
    supplierName: "Kordsa & Akın Teknik Tekstil Konsorsiyumu",
    sku: "MTX-PRO-JACKET-ORG-XL",
    itemName: "Endüstriyel Pro-Shield Mont — Reflektörlü Turuncu / XL",
    currentQty: 30,
    ropThreshold: 65,
    orderQty: 96,
    unit: "Adet",
    unitPriceTry: 1550,
    totalAmountTry: 148800,
    priority: "NORMAL",
    status: "APPROVED_PO_SENT",
    expectedDeliveryDate: "2026-11-10",
    createdAt: "2026-11-02 16:40"
  }
]

export const INITIAL_CONSIGNMENT_STOCKS: ConsignmentStockRecord[] = [
  {
    id: "csg-01",
    agreementNo: "CNS-2026-PANA-01",
    supplierId: "sup-04",
    supplierName: "Panasonic Energy Endüstriyel Batarya Türkiye",
    itemId: "item-raw-batt-6000",
    sku: "CMP-LION-6000MAH",
    itemName: "Endüstriyel Hot-Swap Li-Ion Batarya Paketi 6000mAh",
    warehouseCode: "DEP-IZM-05",
    warehouseName: "İzmir Konsinye (Emanet) & 3PL Entegre Depo",
    binCode: "IZM-Z1-A01-R01-L01-B01",
    lotNumber: "LOT-BAT-2610",
    receivedConsignQty: 120,
    availableConsignQty: 60,
    consumedOrSoldQty: 55,
    returnedToVendorQty: 5,
    unit: "Adet",
    agreedUnitCostTry: 1850,
    unbilledPayableTry: 101750,
    lastSettlementDate: "2026-10-15",
    status: "SETTLEMENT_READY"
  },
  {
    id: "csg-02",
    agreementNo: "CNS-2026-IMP-02",
    supplierId: "sup-01",
    supplierName: "Impinj & Arrow Electronics Global Tedarik A.Ş.",
    itemId: "item-raw-rfid-mod",
    sku: "CMP-UHF-IMPINJ-E710",
    itemName: "Impinj E710 UHF RFID Okuyucu Modül Çipi",
    warehouseCode: "DEP-IST-01",
    warehouseName: "Tuzla Merkez Akıllı Lojistik & WMS Üssü",
    binCode: "IST-Z2-A04-R02-L03-B04",
    lotNumber: "LOT-IMP-10",
    receivedConsignQty: 80,
    availableConsignQty: 45,
    consumedOrSoldQty: 35,
    returnedToVendorQty: 0,
    unit: "Adet",
    agreedUnitCostTry: 4950,
    unbilledPayableTry: 173250,
    lastSettlementDate: "2026-10-20",
    status: "ACTIVE_CONSIGNMENT"
  },
  {
    id: "csg-03",
    agreementNo: "CNS-2026-KRD-03",
    supplierId: "sup-03",
    supplierName: "Kordsa & Akın Teknik Tekstil Konsorsiyumu",
    itemId: "item-mat-parent-01",
    sku: "MTX-PRO-JACKET",
    itemName: "Endüstriyel Pro-Shield Akıllı İş Montu (Varyant Havuzu)",
    warehouseCode: "DEP-IST-01",
    warehouseName: "Tuzla Merkez Akıllı Lojistik & WMS Üssü",
    binCode: "IST-Z2-A01-R02-L01-B01",
    lotNumber: "LOT-2610-C9",
    receivedConsignQty: 100,
    availableConsignQty: 50,
    consumedOrSoldQty: 50,
    returnedToVendorQty: 0,
    unit: "Adet",
    agreedUnitCostTry: 1450,
    unbilledPayableTry: 72500,
    lastSettlementDate: "2026-10-25",
    status: "SETTLEMENT_READY"
  }
]

