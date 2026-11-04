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
    id: "sup-flora-01",
    code: "SUP-FLORA-01",
    name: "Royal Flora Holland İthalat Konsorsiyumu",
    contactPerson: "Johan Van Der Berg / Arzu Kaya",
    email: "orders@royalfloraholland.com.tr",
    phone: "0212 465 88 00",
    leadTimeDays: 4,
    onTimeDeliveryRate: 98.4,
    qualityAcceptance: 99.2,
    paymentTermsDays: 30,
    supportsConsignment: true,
    supportsDropship: true,
    rating: 4.9
  },
  {
    id: "sup-yalova-02",
    code: "SUP-YALOVA-02",
    name: "Yalova Çiçekçilik & Kesme Gül Kooperatifi",
    contactPerson: "Mehmet Çiftçi",
    email: "tedarik@yalovacicek.coop",
    phone: "0226 814 30 40",
    leadTimeDays: 2,
    onTimeDeliveryRate: 97.1,
    qualityAcceptance: 98.5,
    paymentTermsDays: 15,
    supportsConsignment: false,
    supportsDropship: true,
    rating: 4.8
  },
  {
    id: "sup-pasa-03",
    code: "SUP-PASA-03",
    name: "Paşabahçe & Paşa Cam Sanayi A.Ş.",
    contactPerson: "Sevgi Eryılmaz",
    email: "b2bkurumsal@pasabahce.com.tr",
    phone: "0216 578 70 00",
    leadTimeDays: 5,
    onTimeDeliveryRate: 96.8,
    qualityAcceptance: 99.6,
    paymentTermsDays: 45,
    supportsConsignment: true,
    supportsDropship: false,
    rating: 4.85
  },
  {
    id: "sup-amb-04",
    code: "SUP-AMB-04",
    name: "Marmara Kraft Ambalaj & Koli Sanayi",
    contactPerson: "Erol Gür",
    email: "siparis@marmarakraft.com",
    phone: "0212 549 12 34",
    leadTimeDays: 3,
    onTimeDeliveryRate: 99.0,
    qualityAcceptance: 98.0,
    paymentTermsDays: 30,
    supportsConsignment: true,
    supportsDropship: true,
    rating: 4.75
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

/**
 * Ekonomik Sipariş Miktarı (EOQ) Hesaplama
 * Formül: EOQ = sqrt( (2 * D * S) / H )
 * D: Yıllık Talep
 * S: Sipariş Başına Sabit Maliyet
 * H: Birim Başına Yıllık Elde Tutma Maliyeti
 */
export function calculateEoq(annualDemand: number, orderingCost: number, holdingCost: number): number {
  if (annualDemand <= 0 || orderingCost <= 0 || holdingCost <= 0) return 0
  return Math.round(Math.sqrt((2 * annualDemand * orderingCost) / holdingCost))
}

export const INITIAL_REORDER_POLICIES: ReorderPolicyRecord[] = [
  {
    id: "rop-01",
    itemId: "item-gul-01",
    sku: "GUL-EKV-01",
    itemName: "Ekvator Kırmızı Gül (1. Kalite - 60cm)",
    category: "Kesme Çiçek",
    warehouseCode: "DEP-MERKEZ",
    warehouseName: "Merkez Soğuk Hava Deposu",
    supplierId: "sup-flora-01",
    supplierName: "Royal Flora Holland İthalat Konsorsiyumu",
    currentAvailableQty: 35,
    onOrderQty: 0,
    avgDailyDemand: 25,
    demandStdDev: 6.2,
    leadTimeDays: 4,
    serviceLevelPercent: 95,
    serviceLevelZ: 1.65,
    seasonalityMultiplier: 1.25,
    calculatedSafetyStock: 21,
    calculatedRop: 146,
    recommendedOrderQty: 180,
    minOrderQtyMoq: 50,
    unitCost: 45,
    unit: "Adet",
    autoCreateRequisition: true,
    status: "BELOW_ROP"
  },
  {
    id: "rop-02",
    itemId: "item-lil-02",
    sku: "LIL-KAZ-02",
    itemName: "Kazablanka Beyaz Lilyum (Kokulu)",
    category: "Kesme Çiçek",
    warehouseCode: "DEP-MERKEZ",
    warehouseName: "Merkez Soğuk Hava Deposu",
    supplierId: "sup-flora-01",
    supplierName: "Royal Flora Holland İthalat Konsorsiyumu",
    currentAvailableQty: 12,
    onOrderQty: 0,
    avgDailyDemand: 8,
    demandStdDev: 2.5,
    leadTimeDays: 5,
    serviceLevelPercent: 98,
    serviceLevelZ: 2.05,
    seasonalityMultiplier: 1.2,
    calculatedSafetyStock: 12,
    calculatedRop: 60,
    recommendedOrderQty: 80,
    minOrderQtyMoq: 25,
    unitCost: 185,
    unit: "Demet",
    autoCreateRequisition: true,
    status: "CRITICAL_SAFETY"
  },
  {
    id: "rop-03",
    itemId: "item-vaz-03",
    sku: "VAZ-ANT-03",
    itemName: "El Yapımı Antik Seramik Vazo (Mat Beyaz)",
    category: "Süs & Vazo",
    warehouseCode: "DEP-MERKEZ",
    warehouseName: "Merkez Genel Depo",
    supplierId: "sup-pasa-03",
    supplierName: "Paşabahçe & Paşa Cam Sanayi A.Ş.",
    currentAvailableQty: 18,
    onOrderQty: 10,
    avgDailyDemand: 3.5,
    demandStdDev: 1.2,
    leadTimeDays: 5,
    serviceLevelPercent: 95,
    serviceLevelZ: 1.65,
    seasonalityMultiplier: 1.1,
    calculatedSafetyStock: 5,
    calculatedRop: 25,
    recommendedOrderQty: 30,
    minOrderQtyMoq: 10,
    unitCost: 280,
    unit: "Adet",
    autoCreateRequisition: true,
    status: "HEALTHY"
  }
]

export const INITIAL_CONSIGNMENT_STOCKS: ConsignmentStockRecord[] = [
  {
    id: "consign-01",
    agreementNo: "KSN-2026-FLORA-001",
    supplierId: "sup-flora-01",
    supplierName: "Royal Flora Holland İthalat Konsorsiyumu",
    itemId: "item-gul-01",
    sku: "GUL-EKV-01",
    itemName: "Ekvator Kırmızı Gül (1. Kalite - 60cm)",
    warehouseCode: "DEP-MERKEZ",
    warehouseName: "Merkez Soğuk Hava Deposu",
    binCode: "A-01-01",
    lotNumber: "LOT-CONSIGN-26A",
    receivedConsignQty: 250,
    availableConsignQty: 170,
    consumedOrSoldQty: 80,
    returnedToVendorQty: 0,
    unit: "Adet",
    agreedUnitCostTry: 32.5,
    unbilledPayableTry: 2600,
    lastSettlementDate: "2026-11-03",
    status: "ACTIVE_CONSIGNMENT"
  },
  {
    id: "consign-02",
    agreementNo: "KSN-2026-PASA-002",
    supplierId: "sup-pasa-03",
    supplierName: "Paşabahçe & Paşa Cam Sanayi A.Ş.",
    itemId: "item-vaz-03",
    sku: "VAZ-ANT-03",
    itemName: "El Yapımı Antik Seramik Vazo (Mat Beyaz)",
    warehouseCode: "DEP-MERKEZ",
    warehouseName: "Merkez Genel Depo",
    binCode: "C-01-01",
    lotNumber: "LOT-CONSIGN-PASA-01",
    receivedConsignQty: 60,
    availableConsignQty: 45,
    consumedOrSoldQty: 15,
    returnedToVendorQty: 0,
    unit: "Adet",
    agreedUnitCostTry: 260.0,
    unbilledPayableTry: 3900,
    lastSettlementDate: "2026-11-02",
    status: "ACTIVE_CONSIGNMENT"
  }
]
