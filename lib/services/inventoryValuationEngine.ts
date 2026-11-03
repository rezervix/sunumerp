/**
 * FAZ 1: Çekirdek Stok ve Envanter Mimarisi Motoru
 * - Çoklu Depo & Şube Anlık Stok Takibi (ATP = OnHand - Reserved)
 * - Ebeveyn-Alt Madde (Matrix) Varyant Yapısı ve Otomatik Ebeveyn Stok Roll-up
 * - Lot, Parti, Seri Numarası ve SKT (FEFO) Uçtan Uca İzlenebilirlik (Forward & Backward Genealogy)
 * - Çoklu Birim Dönüştürme (Adet, Koli, Palet, Kg, Litre) ve Alternatif/Muadil Ürün Öneri Motoru
 * - Ürün Ağacı (BOM) Reçete Maliyet Roll-up ve FIFO, LIFO, Ağırlıklı Ortalama & Standart Maliyet Değerleme Motoru
 */

export interface WarehouseRecord {
  id: string
  branchId: string
  branchName: string
  code: string
  name: string
  type: "MAIN" | "BRANCH_STORE" | "COLD_CHAIN" | "CONSIGNMENT" | "TRANSIT" | "QUARANTINE"
  city: string
  address: string
  managerName: string
  temperatureRange: string
  capacityVolumeM3: number
  usedVolumeM3: number
  capacityWeightKg: number
  usedWeightKg: number
  totalSkuCount: number
  totalStockValueTry: number
  isActive: boolean
}

export interface UnitConversionRule {
  id: string
  fromUnit: string
  toUnit: string
  multiplier: number
  barcode: string
  weightKg: number
  volumeM3: number
  isDefaultPurchase: boolean
  isDefaultSales: boolean
}

export interface AlternativeItemRule {
  id: string
  sourceItemId: string
  sourceSku: string
  substituteItemId: string
  substituteSku: string
  substituteName: string
  relationType: "EXACT_SUBSTITUTE" | "UPGRADE" | "COMPATIBLE" | "CROSS_SELL"
  priority: number
  conversionRatio: number
  priceDiffPercent: number
  availableStock: number
  autoSuggestOnOutStock: boolean
  notes: string
}

export interface CostLayerEntry {
  id: string
  receiptDocNo: string
  layerDate: string
  warehouseCode: string
  lotNumber: string
  initialQty: number
  remainingQty: number
  unitCost: number
}

export interface WarehouseBalanceEntry {
  warehouseId: string
  warehouseCode: string
  warehouseName: string
  binCode: string
  onHandQty: number
  reservedQty: number
  availableQty: number
  inTransitQty: number
  quarantineQty: number
  consignmentQty: number
}

export interface InventoryItemRecord {
  id: string
  sku: string
  barcode: string
  gtin: string
  rfidEpcPrefix: string
  name: string
  category: string
  brand: string
  itemType: "RAW_MATERIAL" | "SEMI_FINISHED" | "FINISHED_GOOD" | "MERCHANDISE" | "MATRIX_PARENT" | "MATRIX_VARIANT"
  parentItemId?: string | null
  variantAttributes?: Record<string, string>
  baseUnit: string
  valuationMethod: "FIFO" | "LIFO" | "WEIGHTED_AVERAGE" | "STANDARD"
  standardCost: number
  currentAvgCost: number
  fifoUnitCost: number
  lifoUnitCost: number
  lastPurchaseCost: number
  salesPrice: number
  taxRate: number
  trackLot: boolean
  trackSerial: boolean
  trackExpiry: boolean
  shelfLifeDays?: number
  abcClass: "A" | "B" | "C"
  xyzClass: "X" | "Y" | "Z"
  minStockLevel: number
  maxStockLevel: number
  leadTimeDays: number
  totalOnHand: number
  totalReserved: number
  totalAvailable: number
  totalInTransit: number
  totalQuarantine: number
  totalConsignment: number
  warehouseBalances: WarehouseBalanceEntry[]
  unitConversions: UnitConversionRule[]
  costLayers: CostLayerEntry[]
  isActive: boolean
}

export interface TraceabilityEvent {
  id: string
  eventDate: string
  eventType:
  | "SUPPLIER_RECEIPT"
  | "QC_INSPECTION"
  | "PUTAWAY"
  | "BOM_CONSUMPTION"
  | "PRODUCTION_OUTPUT"
  | "TRANSFER"
  | "PICK_PACK"
  | "CUSTOMER_SHIPMENT"
  | "RMA_RETURN"
  | "RECALL_HOLD"
  title: string
  quantity: number
  unit: string
  fromLocation: string
  toLocation: string
  referenceDocNo: string
  partnerName: string
  operatorName: string
  notes: string
}

export interface LotSerialBatchRecord {
  id: string
  itemId: string
  sku: string
  itemName: string
  warehouseId: string
  warehouseName: string
  binCode: string
  lotNumber: string
  batchNumber: string
  serialNumber?: string
  manufacturingDate: string
  expiryDate: string
  daysUntilExpiry: number
  supplierName: string
  supplierLotNo: string
  status: "AVAILABLE" | "QUARANTINE" | "EXPIRING_SOON" | "EXPIRED" | "RECALLED" | "CONSUMED"
  qcStatus: "PASSED" | "PENDING_QC" | "REJECTED"
  initialQty: number
  remainingQty: number
  unit: string
  unitCost: number
  originDocNo: string
  events: TraceabilityEvent[]
}

export interface BomComponentLine {
  id: string
  componentItemId: string
  componentSku: string
  componentName: string
  itemType: string
  quantity: number
  unit: string
  scrapPercent: number
  fifoUnitCost: number
  lifoUnitCost: number
  avgUnitCost: number
  standardUnitCost: number
  availableStock: number
  operationStep: string
}

export interface BomRecipeRecord {
  id: string
  code: string
  name: string
  version: string
  finishedItemId: string
  finishedSku: string
  finishedName: string
  outputQty: number
  outputUnit: string
  laborCostPerBatch: number
  overheadCostPerBatch: number
  scrapRatePercent: number
  leadTimeHours: number
  components: BomComponentLine[]
  isActive: boolean
}

export interface ValuationComparisonResult {
  itemId: string
  sku: string
  name: string
  issueQty: number
  fifoTotalCost: number
  fifoUnitCost: number
  lifoTotalCost: number
  lifoUnitCost: number
  weightedAvgTotalCost: number
  weightedAvgUnitCost: number
  standardTotalCost: number
  standardUnitCost: number
  standardCostVariance: number
  consumedLayersFifo: Array<{ layerNo: string; qtyUsed: number; unitCost: number; subtotal: number }>
  consumedLayersLifo: Array<{ layerNo: string; qtyUsed: number; unitCost: number; subtotal: number }>
}

// ── Başlangıç Kurumsal Tohum Verileri (Seed Data) ─────────────────────────────

export const INITIAL_WAREHOUSES: WarehouseRecord[] = [
  {
    id: "wh-ist-main",
    branchId: "local-debug-branch",
    branchName: "Merkez Şube (İstanbul)",
    code: "DEP-IST-01",
    name: "Tuzla Merkez Akıllı Lojistik & WMS Üssü",
    type: "MAIN",
    city: "İstanbul / Tuzla",
    address: "İTOSB Lojistik Bulvarı No: 42, Tuzla / İstanbul",
    managerName: "Hakan Çelik",
    temperatureRange: "+18°C / +22°C (İklimlendirmeli)",
    capacityVolumeM3: 12000,
    usedVolumeM3: 8640,
    capacityWeightKg: 450000,
    usedWeightKg: 312000,
    totalSkuCount: 1480,
    totalStockValueTry: 18450000,
    isActive: true
  },
  {
    id: "wh-ist-kadikoy",
    branchId: "local-debug-branch",
    branchName: "Kadıköy Mağaza & Omnichannel Hub",
    code: "DEP-KDK-02",
    name: "Kadıköy Mağaza & Hızlı Teslimat (Dark Store) Deposu",
    type: "BRANCH_STORE",
    city: "İstanbul / Kadıköy",
    address: "Bağdat Cad. No: 214, Kadıköy / İstanbul",
    managerName: "Zeynep Aksoy",
    temperatureRange: "+20°C Oda Sıcaklığı",
    capacityVolumeM3: 1800,
    usedVolumeM3: 1390,
    capacityWeightKg: 60000,
    usedWeightKg: 44500,
    totalSkuCount: 620,
    totalStockValueTry: 4920000,
    isActive: true
  },
  {
    id: "wh-ank-hub",
    branchId: "local-debug-branch",
    branchName: "Ankara Bölge Müdürlüğü",
    code: "DEP-ANK-03",
    name: "Ankara İç Anadolu Bölge Dağıtım Merkezi",
    type: "MAIN",
    city: "Ankara / Sincan OSB",
    address: "ASO 2. OSB Lojistik Cad. No: 19, Ankara",
    managerName: "Serkan Demirtaş",
    temperatureRange: "+16°C / +22°C",
    capacityVolumeM3: 6500,
    usedVolumeM3: 4120,
    capacityWeightKg: 220000,
    usedWeightKg: 148000,
    totalSkuCount: 890,
    totalStockValueTry: 8740000,
    isActive: true
  },
  {
    id: "wh-gebze-cold",
    branchId: "local-debug-branch",
    branchName: "Gebze Üretim & Soğuk Zincir",
    code: "DEP-GBZ-04",
    name: "Gebze Soğuk Zincir & SKT Hassas Hammadde Deposu",
    type: "COLD_CHAIN",
    city: "Kocaeli / Gebze",
    address: "GOSB Teknopark Yanı 4. Cad. No: 8, Gebze",
    managerName: "Gökhan Arslan",
    temperatureRange: "+2°C / +6°C (Sensör İzlemeli)",
    capacityVolumeM3: 3200,
    usedVolumeM3: 2410,
    capacityWeightKg: 110000,
    usedWeightKg: 82000,
    totalSkuCount: 310,
    totalStockValueTry: 6180000,
    isActive: true
  },
  {
    id: "wh-izmir-consign",
    branchId: "local-debug-branch",
    branchName: "İzmir Ege Şubesi",
    code: "DEP-IZM-05",
    name: "İzmir Konsinye (Emanet) & 3PL Entegre Depo",
    type: "CONSIGNMENT",
    city: "İzmir / Kemalpaşa",
    address: "KOSBİ Lojistik Köyü B Blok, Kemalpaşa / İzmir",
    managerName: "Elif Yalçın",
    temperatureRange: "+18°C / +24°C",
    capacityVolumeM3: 4000,
    usedVolumeM3: 2650,
    capacityWeightKg: 140000,
    usedWeightKg: 91000,
    totalSkuCount: 440,
    totalStockValueTry: 5390000,
    isActive: true
  }
]

export const INITIAL_INVENTORY_ITEMS: InventoryItemRecord[] = [
  // 1. Ebeveyn-Alt Madde (Matrix) Ana Ürün
  {
    id: "item-mat-parent-01",
    sku: "MTX-PRO-JACKET",
    barcode: "8690001100001",
    gtin: "08690001100001",
    rfidEpcPrefix: "3034257BF400",
    name: "Endüstriyel Pro-Shield Akıllı İş Montu (Matrix Ana Kart)",
    category: "Teknik Tekstil & KKD",
    brand: "SunumPro Gear",
    itemType: "MATRIX_PARENT",
    parentItemId: null,
    variantAttributes: { matrisYapisi: "Renk x Beden (Otomatik Toplam)" },
    baseUnit: "Adet",
    valuationMethod: "FIFO",
    standardCost: 1450,
    currentAvgCost: 1510,
    fifoUnitCost: 1480,
    lifoUnitCost: 1560,
    lastPurchaseCost: 1560,
    salesPrice: 2850,
    taxRate: 20,
    trackLot: true,
    trackSerial: false,
    trackExpiry: false,
    abcClass: "A",
    xyzClass: "X",
    minStockLevel: 120,
    maxStockLevel: 1200,
    leadTimeDays: 7,
    totalOnHand: 460,
    totalReserved: 65,
    totalAvailable: 395,
    totalInTransit: 40,
    totalQuarantine: 10,
    totalConsignment: 50,
    warehouseBalances: [
      {
        warehouseId: "wh-ist-main",
        warehouseCode: "DEP-IST-01",
        warehouseName: "Tuzla Merkez Akıllı Lojistik & WMS Üssü",
        binCode: "IST-Z2-A01-R02-L01-B01",
        onHandQty: 310,
        reservedQty: 45,
        availableQty: 265,
        inTransitQty: 25,
        quarantineQty: 10,
        consignmentQty: 30
      },
      {
        warehouseId: "wh-ist-kadikoy",
        warehouseCode: "DEP-KDK-02",
        warehouseName: "Kadıköy Mağaza & Hızlı Teslimat Deposu",
        binCode: "KDK-Z1-A02-R01-L02-B03",
        onHandQty: 150,
        reservedQty: 20,
        availableQty: 130,
        inTransitQty: 15,
        quarantineQty: 0,
        consignmentQty: 20
      }
    ],
    unitConversions: [
      { id: "uc-1", fromUnit: "Koli", toUnit: "Adet", multiplier: 12, barcode: "18690001100008", weightKg: 14.4, volumeM3: 0.08, isDefaultPurchase: true, isDefaultSales: false },
      { id: "uc-2", fromUnit: "Euro Palet", toUnit: "Adet", multiplier: 144, barcode: "28690001100005", weightKg: 185, volumeM3: 1.15, isDefaultPurchase: false, isDefaultSales: false }
    ],
    costLayers: [
      { id: "cl-1", receiptDocNo: "GRN-2026-0812", layerDate: "2026-09-10", warehouseCode: "DEP-IST-01", lotNumber: "LOT-2609-A1", initialQty: 200, remainingQty: 140, unitCost: 1420 },
      { id: "cl-2", receiptDocNo: "GRN-2026-0945", layerDate: "2026-10-05", warehouseCode: "DEP-IST-01", lotNumber: "LOT-2610-B4", initialQty: 200, remainingQty: 180, unitCost: 1510 },
      { id: "cl-3", receiptDocNo: "GRN-2026-1088", layerDate: "2026-10-28", warehouseCode: "DEP-KDK-02", lotNumber: "LOT-2610-C9", initialQty: 140, remainingQty: 140, unitCost: 1560 }
    ],
    isActive: true
  },
  // Alt Varyant 1
  {
    id: "item-mat-var-01",
    sku: "MTX-PRO-JACKET-NVY-M",
    barcode: "8690001100018",
    gtin: "08690001100018",
    rfidEpcPrefix: "3034257BF401",
    name: "Endüstriyel Pro-Shield Mont — Gece Mavisi / M Beden",
    category: "Teknik Tekstil & KKD",
    brand: "SunumPro Gear",
    itemType: "MATRIX_VARIANT",
    parentItemId: "item-mat-parent-01",
    variantAttributes: { renk: "Gece Mavisi", beden: "M", kumas: "Gore-Tex 3L" },
    baseUnit: "Adet",
    valuationMethod: "FIFO",
    standardCost: 1450,
    currentAvgCost: 1495,
    fifoUnitCost: 1460,
    lifoUnitCost: 1540,
    lastPurchaseCost: 1540,
    salesPrice: 2850,
    taxRate: 20,
    trackLot: true,
    trackSerial: false,
    trackExpiry: false,
    abcClass: "A",
    xyzClass: "X",
    minStockLevel: 40,
    maxStockLevel: 400,
    leadTimeDays: 7,
    totalOnHand: 180,
    totalReserved: 25,
    totalAvailable: 155,
    totalInTransit: 15,
    totalQuarantine: 0,
    totalConsignment: 20,
    warehouseBalances: [
      {
        warehouseId: "wh-ist-main",
        warehouseCode: "DEP-IST-01",
        warehouseName: "Tuzla Merkez Akıllı Lojistik & WMS Üssü",
        binCode: "IST-Z2-A01-R02-L01-B01",
        onHandQty: 120,
        reservedQty: 15,
        availableQty: 105,
        inTransitQty: 10,
        quarantineQty: 0,
        consignmentQty: 10
      },
      {
        warehouseId: "wh-ist-kadikoy",
        warehouseCode: "DEP-KDK-02",
        warehouseName: "Kadıköy Mağaza & Hızlı Teslimat Deposu",
        binCode: "KDK-Z1-A02-R01-L02-B03",
        onHandQty: 60,
        reservedQty: 10,
        availableQty: 50,
        inTransitQty: 5,
        quarantineQty: 0,
        consignmentQty: 10
      }
    ],
    unitConversions: [
      { id: "uc-v1", fromUnit: "Koli", toUnit: "Adet", multiplier: 12, barcode: "18690001100015", weightKg: 14.0, volumeM3: 0.08, isDefaultPurchase: true, isDefaultSales: false }
    ],
    costLayers: [
      { id: "cl-v1", receiptDocNo: "GRN-2026-0812", layerDate: "2026-09-10", warehouseCode: "DEP-IST-01", lotNumber: "LOT-2609-A1", initialQty: 100, remainingQty: 80, unitCost: 1460 },
      { id: "cl-v2", receiptDocNo: "GRN-2026-1088", layerDate: "2026-10-28", warehouseCode: "DEP-KDK-02", lotNumber: "LOT-2610-C9", initialQty: 100, remainingQty: 100, unitCost: 1540 }
    ],
    isActive: true
  },
  // Alt Varyant 2
  {
    id: "item-mat-var-02",
    sku: "MTX-PRO-JACKET-NVY-L",
    barcode: "8690001100025",
    gtin: "08690001100025",
    rfidEpcPrefix: "3034257BF402",
    name: "Endüstriyel Pro-Shield Mont — Gece Mavisi / L Beden",
    category: "Teknik Tekstil & KKD",
    brand: "SunumPro Gear",
    itemType: "MATRIX_VARIANT",
    parentItemId: "item-mat-parent-01",
    variantAttributes: { renk: "Gece Mavisi", beden: "L", kumas: "Gore-Tex 3L" },
    baseUnit: "Adet",
    valuationMethod: "FIFO",
    standardCost: 1450,
    currentAvgCost: 1520,
    fifoUnitCost: 1500,
    lifoUnitCost: 1560,
    lastPurchaseCost: 1560,
    salesPrice: 2850,
    taxRate: 20,
    trackLot: true,
    trackSerial: false,
    trackExpiry: false,
    abcClass: "A",
    xyzClass: "X",
    minStockLevel: 50,
    maxStockLevel: 400,
    leadTimeDays: 7,
    totalOnHand: 190,
    totalReserved: 30,
    totalAvailable: 160,
    totalInTransit: 15,
    totalQuarantine: 5,
    totalConsignment: 20,
    warehouseBalances: [
      {
        warehouseId: "wh-ist-main",
        warehouseCode: "DEP-IST-01",
        warehouseName: "Tuzla Merkez Akıllı Lojistik & WMS Üssü",
        binCode: "IST-Z2-A01-R02-L01-B02",
        onHandQty: 130,
        reservedQty: 20,
        availableQty: 110,
        inTransitQty: 10,
        quarantineQty: 5,
        consignmentQty: 15
      },
      {
        warehouseId: "wh-ist-kadikoy",
        warehouseCode: "DEP-KDK-02",
        warehouseName: "Kadıköy Mağaza & Hızlı Teslimat Deposu",
        binCode: "KDK-Z1-A02-R01-L02-B04",
        onHandQty: 60,
        reservedQty: 10,
        availableQty: 50,
        inTransitQty: 5,
        quarantineQty: 0,
        consignmentQty: 5
      }
    ],
    unitConversions: [],
    costLayers: [
      { id: "cl-v3", receiptDocNo: "GRN-2026-0945", layerDate: "2026-10-05", warehouseCode: "DEP-IST-01", lotNumber: "LOT-2610-B4", initialQty: 190, remainingQty: 190, unitCost: 1520 }
    ],
    isActive: true
  },
  // Alt Varyant 3
  {
    id: "item-mat-var-03",
    sku: "MTX-PRO-JACKET-ORG-XL",
    barcode: "8690001100032",
    gtin: "08690001100032",
    rfidEpcPrefix: "3034257BF403",
    name: "Endüstriyel Pro-Shield Mont — Reflektörlü Turuncu / XL Beden",
    category: "Teknik Tekstil & KKD",
    brand: "SunumPro Gear",
    itemType: "MATRIX_VARIANT",
    parentItemId: "item-mat-parent-01",
    variantAttributes: { renk: "Reflektörlü Turuncu", beden: "XL", kumas: "Gore-Tex 3L" },
    baseUnit: "Adet",
    valuationMethod: "FIFO",
    standardCost: 1480,
    currentAvgCost: 1550,
    fifoUnitCost: 1520,
    lifoUnitCost: 1580,
    lastPurchaseCost: 1580,
    salesPrice: 2950,
    taxRate: 20,
    trackLot: true,
    trackSerial: false,
    trackExpiry: false,
    abcClass: "B",
    xyzClass: "Y",
    minStockLevel: 30,
    maxStockLevel: 300,
    leadTimeDays: 7,
    totalOnHand: 90,
    totalReserved: 10,
    totalAvailable: 80,
    totalInTransit: 10,
    totalQuarantine: 5,
    totalConsignment: 10,
    warehouseBalances: [
      {
        warehouseId: "wh-ist-main",
        warehouseCode: "DEP-IST-01",
        warehouseName: "Tuzla Merkez Akıllı Lojistik & WMS Üssü",
        binCode: "IST-Z2-A01-R02-L01-B03",
        onHandQty: 60,
        reservedQty: 10,
        availableQty: 50,
        inTransitQty: 5,
        quarantineQty: 5,
        consignmentQty: 5
      },
      {
        warehouseId: "wh-ist-kadikoy",
        warehouseCode: "DEP-KDK-02",
        warehouseName: "Kadıköy Mağaza & Hızlı Teslimat Deposu",
        binCode: "KDK-Z1-A02-R01-L02-B05",
        onHandQty: 30,
        reservedQty: 0,
        availableQty: 30,
        inTransitQty: 5,
        quarantineQty: 0,
        consignmentQty: 5
      }
    ],
    unitConversions: [],
    costLayers: [
      { id: "cl-v4", receiptDocNo: "GRN-2026-1088", layerDate: "2026-10-28", warehouseCode: "DEP-IST-01", lotNumber: "LOT-2610-C9", initialQty: 90, remainingQty: 90, unitCost: 1550 }
    ],
    isActive: true
  },

  // 2. Seri & BOM Üretimi Takipli Mamul (Akıllı El Terminali)
  {
    id: "item-fg-terminal",
    sku: "WMS-HHT-X900",
    barcode: "8690002200900",
    gtin: "08690002200900",
    rfidEpcPrefix: "3034991AA100",
    name: "SunumTech X900 Endüstriyel 2D Barkod & UHF RFID El Terminali",
    category: "Otomasyon & Donanım",
    brand: "SunumTech",
    itemType: "FINISHED_GOOD",
    parentItemId: null,
    baseUnit: "Adet",
    valuationMethod: "FIFO",
    standardCost: 14200,
    currentAvgCost: 14850,
    fifoUnitCost: 14400,
    lifoUnitCost: 15300,
    lastPurchaseCost: 15300,
    salesPrice: 24900,
    taxRate: 20,
    trackLot: true,
    trackSerial: true,
    trackExpiry: false,
    abcClass: "A",
    xyzClass: "X",
    minStockLevel: 35,
    maxStockLevel: 250,
    leadTimeDays: 10,
    totalOnHand: 84,
    totalReserved: 19,
    totalAvailable: 65,
    totalInTransit: 12,
    totalQuarantine: 2,
    totalConsignment: 15,
    warehouseBalances: [
      {
        warehouseId: "wh-ist-main",
        warehouseCode: "DEP-IST-01",
        warehouseName: "Tuzla Merkez Akıllı Lojistik & WMS Üssü",
        binCode: "IST-Z2-A03-R01-L02-B01",
        onHandQty: 54,
        reservedQty: 14,
        availableQty: 40,
        inTransitQty: 8,
        quarantineQty: 2,
        consignmentQty: 10
      },
      {
        warehouseId: "wh-ank-hub",
        warehouseCode: "DEP-ANK-03",
        warehouseName: "Ankara İç Anadolu Bölge Dağıtım Merkezi",
        binCode: "ANK-Z1-A01-R04-L01-B02",
        onHandQty: 30,
        reservedQty: 5,
        availableQty: 25,
        inTransitQty: 4,
        quarantineQty: 0,
        consignmentQty: 5
      }
    ],
    unitConversions: [
      { id: "uc-3", fromUnit: "Master Koli (6'lı)", toUnit: "Adet", multiplier: 6, barcode: "18690002200907", weightKg: 4.8, volumeM3: 0.035, isDefaultPurchase: true, isDefaultSales: true },
      { id: "uc-4", fromUnit: "Konteyner Palet", toUnit: "Adet", multiplier: 120, barcode: "28690002200904", weightKg: 108, volumeM3: 0.85, isDefaultPurchase: false, isDefaultSales: false }
    ],
    costLayers: [
      { id: "cl-4", receiptDocNo: "PRD-2026-0410", layerDate: "2026-09-02", warehouseCode: "DEP-IST-01", lotNumber: "LOT-X900-01", initialQty: 40, remainingQty: 24, unitCost: 14100 },
      { id: "cl-5", receiptDocNo: "PRD-2026-0522", layerDate: "2026-10-11", warehouseCode: "DEP-IST-01", lotNumber: "LOT-X900-02", initialQty: 35, remainingQty: 30, unitCost: 14800 },
      { id: "cl-6", receiptDocNo: "PRD-2026-0609", layerDate: "2026-10-30", warehouseCode: "DEP-ANK-03", lotNumber: "LOT-X900-03", initialQty: 30, remainingQty: 30, unitCost: 15300 }
    ],
    isActive: true
  },

  // 3. SKT & Soğuk Zincir Takipli Ürün (FEFO Kritik)
  {
    id: "item-cold-bio-01",
    sku: "BIO-THERM-GEL-5L",
    barcode: "8690003300501",
    gtin: "08690003300501",
    rfidEpcPrefix: "3034882CC200",
    name: "BioTherm Medikal & Gıda Soğuk Zincir Faz Değişim Jeli (5 Litre)",
    category: "Soğuk Zincir & Kimyasal",
    brand: "BioTherm ColdPack",
    itemType: "FINISHED_GOOD",
    parentItemId: null,
    baseUnit: "Bidon",
    valuationMethod: "FIFO",
    standardCost: 620,
    currentAvgCost: 665,
    fifoUnitCost: 640,
    lifoUnitCost: 690,
    lastPurchaseCost: 690,
    salesPrice: 1180,
    taxRate: 20,
    trackLot: true,
    trackSerial: false,
    trackExpiry: true,
    shelfLifeDays: 180,
    abcClass: "A",
    xyzClass: "Y",
    minStockLevel: 150,
    maxStockLevel: 900,
    leadTimeDays: 4,
    totalOnHand: 118,
    totalReserved: 38,
    totalAvailable: 80,
    totalInTransit: 50,
    totalQuarantine: 12,
    totalConsignment: 0,
    warehouseBalances: [
      {
        warehouseId: "wh-gebze-cold",
        warehouseCode: "DEP-GBZ-04",
        warehouseName: "Gebze Soğuk Zincir & SKT Hassas Hammadde Deposu",
        binCode: "GBZ-Z3-C01-R01-L01-B02",
        onHandQty: 118,
        reservedQty: 38,
        availableQty: 80,
        inTransitQty: 50,
        quarantineQty: 12,
        consignmentQty: 0
      }
    ],
    unitConversions: [
      { id: "uc-5", fromUnit: "Litre", toUnit: "Bidon", multiplier: 0.2, barcode: "8690003300501-L", weightKg: 1.05, volumeM3: 0.001, isDefaultPurchase: false, isDefaultSales: false },
      { id: "uc-6", fromUnit: "Koli (4 Bidon / 20 Lt)", toUnit: "Bidon", multiplier: 4, barcode: "18690003300508", weightKg: 21.4, volumeM3: 0.028, isDefaultPurchase: true, isDefaultSales: true }
    ],
    costLayers: [
      { id: "cl-7", receiptDocNo: "GRN-2026-0710", layerDate: "2026-08-15", warehouseCode: "DEP-GBZ-04", lotNumber: "LOT-BIO-2608", initialQty: 80, remainingQty: 38, unitCost: 640 },
      { id: "cl-8", receiptDocNo: "GRN-2026-1012", layerDate: "2026-10-18", warehouseCode: "DEP-GBZ-04", lotNumber: "LOT-BIO-2610", initialQty: 80, remainingQty: 80, unitCost: 690 }
    ],
    isActive: true
  },

  // 4. BOM Alt Bileşenleri (Yarı Mamul & Hammadde)
  {
    id: "item-raw-rfid-mod",
    sku: "CMP-UHF-IMPINJ-E710",
    barcode: "8690004400710",
    gtin: "08690004400710",
    rfidEpcPrefix: "3034771DD100",
    name: "Impinj E710 UHF RFID Okuyucu Modül Çipi (BOM Bileşeni)",
    category: "Elektronik Komponent",
    brand: "Impinj Corp",
    itemType: "RAW_MATERIAL",
    parentItemId: null,
    baseUnit: "Adet",
    valuationMethod: "FIFO",
    standardCost: 4800,
    currentAvgCost: 5120,
    fifoUnitCost: 4950,
    lifoUnitCost: 5350,
    lastPurchaseCost: 5350,
    salesPrice: 7200,
    taxRate: 20,
    trackLot: true,
    trackSerial: true,
    trackExpiry: false,
    abcClass: "A",
    xyzClass: "X",
    minStockLevel: 80,
    maxStockLevel: 400,
    leadTimeDays: 14,
    totalOnHand: 52,
    totalReserved: 20,
    totalAvailable: 32,
    totalInTransit: 100,
    totalQuarantine: 0,
    totalConsignment: 45,
    warehouseBalances: [
      {
        warehouseId: "wh-ist-main",
        warehouseCode: "DEP-IST-01",
        warehouseName: "Tuzla Merkez Akıllı Lojistik & WMS Üssü",
        binCode: "IST-Z2-A04-R02-L03-B04",
        onHandQty: 52,
        reservedQty: 20,
        availableQty: 32,
        inTransitQty: 100,
        quarantineQty: 0,
        consignmentQty: 45
      }
    ],
    unitConversions: [
      { id: "uc-7", fromUnit: "Anti-Statik Tepsi (25'li)", toUnit: "Adet", multiplier: 25, barcode: "18690004400717", weightKg: 1.2, volumeM3: 0.005, isDefaultPurchase: true, isDefaultSales: false }
    ],
    costLayers: [
      { id: "cl-9", receiptDocNo: "GRN-2026-0890", layerDate: "2026-09-19", warehouseCode: "DEP-IST-01", lotNumber: "LOT-IMP-09", initialQty: 50, remainingQty: 22, unitCost: 4950 },
      { id: "cl-10", receiptDocNo: "GRN-2026-1055", layerDate: "2026-10-22", warehouseCode: "DEP-IST-01", lotNumber: "LOT-IMP-10", initialQty: 30, remainingQty: 30, unitCost: 5350 }
    ],
    isActive: true
  },
  {
    id: "item-raw-batt-6000",
    sku: "CMP-LION-6000MAH",
    barcode: "8690004400600",
    gtin: "08690004400600",
    rfidEpcPrefix: "3034771DD200",
    name: "Endüstriyel Hot-Swap Li-Ion Batarya Paketi 6000mAh (SKT & Lot Takipli)",
    category: "Enerji & Batarya",
    brand: "Panasonic Energy",
    itemType: "SEMI_FINISHED",
    parentItemId: null,
    baseUnit: "Adet",
    valuationMethod: "WEIGHTED_AVERAGE",
    standardCost: 1850,
    currentAvgCost: 1920,
    fifoUnitCost: 1880,
    lifoUnitCost: 1960,
    lastPurchaseCost: 1960,
    salesPrice: 3100,
    taxRate: 20,
    trackLot: true,
    trackSerial: true,
    trackExpiry: true,
    shelfLifeDays: 730,
    abcClass: "B",
    xyzClass: "X",
    minStockLevel: 100,
    maxStockLevel: 600,
    leadTimeDays: 9,
    totalOnHand: 210,
    totalReserved: 30,
    totalAvailable: 180,
    totalInTransit: 0,
    totalQuarantine: 4,
    totalConsignment: 60,
    warehouseBalances: [
      {
        warehouseId: "wh-ist-main",
        warehouseCode: "DEP-IST-01",
        warehouseName: "Tuzla Merkez Akıllı Lojistik & WMS Üssü",
        binCode: "IST-Z2-A04-R03-L01-B02",
        onHandQty: 140,
        reservedQty: 20,
        availableQty: 120,
        inTransitQty: 0,
        quarantineQty: 4,
        consignmentQty: 20
      },
      {
        warehouseId: "wh-izmir-consign",
        warehouseCode: "DEP-IZM-05",
        warehouseName: "İzmir Konsinye (Emanet) & 3PL Entegre Depo",
        binCode: "IZM-Z1-A01-R01-L01-B01",
        onHandQty: 70,
        reservedQty: 10,
        availableQty: 60,
        inTransitQty: 0,
        quarantineQty: 0,
        consignmentQty: 40
      }
    ],
    unitConversions: [
      { id: "uc-8", fromUnit: "Kutu (10'lu)", toUnit: "Adet", multiplier: 10, barcode: "18690004400607", weightKg: 3.5, volumeM3: 0.012, isDefaultPurchase: true, isDefaultSales: true }
    ],
    costLayers: [
      { id: "cl-11", receiptDocNo: "GRN-2026-0840", layerDate: "2026-09-05", warehouseCode: "DEP-IST-01", lotNumber: "LOT-BAT-2609", initialQty: 120, remainingQty: 110, unitCost: 1880 },
      { id: "cl-12", receiptDocNo: "GRN-2026-1019", layerDate: "2026-10-15", warehouseCode: "DEP-IZM-05", lotNumber: "LOT-BAT-2610", initialQty: 100, remainingQty: 100, unitCost: 1960 }
    ],
    isActive: true
  },
  {
    id: "item-sub-zebra-alt",
    sku: "ZBR-TC58-PRO",
    barcode: "8690002200999",
    gtin: "08690002200999",
    rfidEpcPrefix: "3034991AA999",
    name: "Zebra TC58e Kurumsal Mobil Terminal (Muadil / Üst Segment İkame)",
    category: "Otomasyon & Donanım",
    brand: "Zebra Technologies",
    itemType: "MERCHANDISE",
    parentItemId: null,
    baseUnit: "Adet",
    valuationMethod: "STANDARD",
    standardCost: 16500,
    currentAvgCost: 16800,
    fifoUnitCost: 16600,
    lifoUnitCost: 17100,
    lastPurchaseCost: 17100,
    salesPrice: 27500,
    taxRate: 20,
    trackLot: true,
    trackSerial: true,
    trackExpiry: false,
    abcClass: "A",
    xyzClass: "Y",
    minStockLevel: 20,
    maxStockLevel: 150,
    leadTimeDays: 6,
    totalOnHand: 48,
    totalReserved: 6,
    totalAvailable: 42,
    totalInTransit: 10,
    totalQuarantine: 0,
    totalConsignment: 25,
    warehouseBalances: [
      {
        warehouseId: "wh-ist-main",
        warehouseCode: "DEP-IST-01",
        warehouseName: "Tuzla Merkez Akıllı Lojistik & WMS Üssü",
        binCode: "IST-Z2-A03-R01-L02-B04",
        onHandQty: 48,
        reservedQty: 6,
        availableQty: 42,
        inTransitQty: 10,
        quarantineQty: 0,
        consignmentQty: 25
      }
    ],
    unitConversions: [],
    costLayers: [
      { id: "cl-13", receiptDocNo: "GRN-2026-1002", layerDate: "2026-10-12", warehouseCode: "DEP-IST-01", lotNumber: "LOT-ZBR-10", initialQty: 48, remainingQty: 48, unitCost: 16800 }
    ],
    isActive: true
  }
]

export const INITIAL_ALTERNATIVE_PRODUCTS: AlternativeItemRule[] = [
  {
    id: "alt-01",
    sourceItemId: "item-fg-terminal",
    sourceSku: "WMS-HHT-X900",
    substituteItemId: "item-sub-zebra-alt",
    substituteSku: "ZBR-TC58-PRO",
    substituteName: "Zebra TC58e Kurumsal Mobil Terminal (Muadil / Üst Segment İkame)",
    relationType: "EXACT_SUBSTITUTE",
    priority: 1,
    conversionRatio: 1.0,
    priceDiffPercent: 10.4,
    availableStock: 42,
    autoSuggestOnOutStock: true,
    notes: "Ana terminal stokta kalmadığında B2B ve kurumsal siparişlerde birebir ikame olarak otomatik önerilir."
  },
  {
    id: "alt-02",
    sourceItemId: "item-mat-var-01",
    sourceSku: "MTX-PRO-JACKET-NVY-M",
    substituteItemId: "item-mat-var-02",
    substituteSku: "MTX-PRO-JACKET-NVY-L",
    substituteName: "Endüstriyel Pro-Shield Mont — Gece Mavisi / L Beden",
    relationType: "COMPATIBLE",
    priority: 2,
    conversionRatio: 1.0,
    priceDiffPercent: 0,
    availableStock: 160,
    autoSuggestOnOutStock: true,
    notes: "Ayarlanabilir bel/kol bandı sayesinde M beden tükendiğinde L beden alternatif olarak sunulabilir."
  }
]

export const INITIAL_LOT_SERIAL_BATCHES: LotSerialBatchRecord[] = [
  {
    id: "lot-rec-01",
    itemId: "item-cold-bio-01",
    sku: "BIO-THERM-GEL-5L",
    itemName: "BioTherm Medikal & Gıda Soğuk Zincir Faz Değişim Jeli (5 Litre)",
    warehouseId: "wh-gebze-cold",
    warehouseName: "Gebze Soğuk Zincir & SKT Hassas Hammadde Deposu",
    binCode: "GBZ-Z3-C01-R01-L01-B02",
    lotNumber: "LOT-BIO-2608",
    batchNumber: "BATCH-2026-A88",
    serialNumber: undefined,
    manufacturingDate: "2026-05-18",
    expiryDate: "2026-11-18",
    daysUntilExpiry: 15,
    supplierName: "Korozo & BioChem Endüstriyel A.Ş.",
    supplierLotNo: "VND-KRZ-9981",
    status: "EXPIRING_SOON",
    qcStatus: "PASSED",
    initialQty: 80,
    remainingQty: 38,
    unit: "Bidon",
    unitCost: 640,
    originDocNo: "GRN-2026-0710",
    events: [
      {
        id: "tev-1",
        eventDate: "2026-08-15 09:15",
        eventType: "SUPPLIER_RECEIPT",
        title: "Tedarikçi Mal Kabulü (ASN-8841)",
        quantity: 80,
        unit: "Bidon",
        fromLocation: "Korozo & BioChem Fabrikası",
        toLocation: "DEP-GBZ-04 / Mal Kabul Peronu-2",
        referenceDocNo: "GRN-2026-0710",
        partnerName: "Korozo & BioChem Endüstriyel A.Ş.",
        operatorName: "Murat Karahan",
        notes: "Soğuk zincir datalogger (+3.8°C) doğrulandı."
      },
      {
        id: "tev-2",
        eventDate: "2026-08-15 11:40",
        eventType: "QC_INSPECTION",
        title: "Kalite Kontrol & Viskozite Testi Onayı",
        quantity: 80,
        unit: "Bidon",
        fromLocation: "DEP-GBZ-04 / QC Alanı",
        toLocation: "GBZ-Z3-C01-R01-L01-B02",
        referenceDocNo: "QC-2026-319",
        partnerName: "İç Kalite Laboratuvarı",
        operatorName: "Kimyager Selin Aydın",
        notes: "pH 7.1, termal iletkenlik %99.4 uyumlu."
      },
      {
        id: "tev-3",
        eventDate: "2026-09-22 14:20",
        eventType: "CUSTOMER_SHIPMENT",
        title: "Müşteri Sevkiyatı (FEFO Öncelikli Çıkış)",
        quantity: 42,
        unit: "Bidon",
        fromLocation: "GBZ-Z3-C01-R01-L01-B02",
        toLocation: "Acıbadem Sağlık Grubu Lojistik",
        referenceDocNo: "SHP-2026-4410",
        partnerName: "Acıbadem Sağlık Hizmetleri A.Ş.",
        operatorName: "Gökhan Arslan",
        notes: "E-İrsaliye SNR2026000001412 ile teslim edildi."
      }
    ]
  },
  {
    id: "lot-rec-02",
    itemId: "item-fg-terminal",
    sku: "WMS-HHT-X900",
    itemName: "SunumTech X900 Endüstriyel 2D Barkod & UHF RFID El Terminali",
    warehouseId: "wh-ist-main",
    warehouseName: "Tuzla Merkez Akıllı Lojistik & WMS Üssü",
    binCode: "IST-Z2-A03-R01-L02-B01",
    lotNumber: "LOT-X900-01",
    batchNumber: "PRD-BATCH-901",
    serialNumber: "SN-X900-2026-00418",
    manufacturingDate: "2026-09-01",
    expiryDate: "2029-09-01",
    daysUntilExpiry: 1032,
    supplierName: "SunumTech Elektronik Üretim Hattı-1",
    supplierLotNo: "INT-LINE-01",
    status: "AVAILABLE",
    qcStatus: "PASSED",
    initialQty: 40,
    remainingQty: 24,
    unit: "Adet",
    unitCost: 14100,
    originDocNo: "PRD-2026-0410",
    events: [
      {
        id: "tev-4",
        eventDate: "2026-09-01 10:00",
        eventType: "BOM_CONSUMPTION",
        title: "BOM Reçete Alt Bileşen Tüketimi (LOT-IMP-09 & LOT-BAT-2609)",
        quantity: 40,
        unit: "Set",
        fromLocation: "IST-Z2-A04 (Komponent Rafları)",
        toLocation: "Tuzla SMT & Montaj Hattı-1",
        referenceDocNo: "WO-2026-0410",
        partnerName: "İç Üretim",
        operatorName: "Başmühendis Emre Tekin",
        notes: "Impinj E710 (LOT-IMP-09) ve Panasonic 6000mAh (LOT-BAT-2609) kullanıldı."
      },
      {
        id: "tev-5",
        eventDate: "2026-09-02 16:30",
        eventType: "PRODUCTION_OUTPUT",
        title: "Mamul Üretim Girişi & Seri No Eşleştirme",
        quantity: 40,
        unit: "Adet",
        fromLocation: "Tuzla Montaj Hattı-1",
        toLocation: "IST-Z2-A03-R01-L02-B01",
        referenceDocNo: "PRD-2026-0410",
        partnerName: "Tuzla Merkez Depo",
        operatorName: "Hakan Çelik",
        notes: "SN-X900-2026-00401 .. 00440 aralığı RFID EPC kodlarıyla doğrulandı."
      },
      {
        id: "tev-6",
        eventDate: "2026-10-14 15:10",
        eventType: "CUSTOMER_SHIPMENT",
        title: "Kurumsal Sipariş Teslimatı (Koç Holding A.Ş.)",
        quantity: 16,
        unit: "Adet",
        fromLocation: "IST-Z2-A03-R01-L02-B01",
        toLocation: "Koç Holding Nakkaştepe Kampüsü",
        referenceDocNo: "ORD-2026-001",
        partnerName: "Koç Holding A.Ş.",
        operatorName: "Hakan Çelik",
        notes: "LPN-TR-2026-00890 paleti ile sevk edildi."
      }
    ]
  },
  {
    id: "lot-rec-03",
    itemId: "item-mat-parent-01",
    sku: "MTX-PRO-JACKET",
    itemName: "Endüstriyel Pro-Shield Akıllı İş Montu",
    warehouseId: "wh-ist-main",
    warehouseName: "Tuzla Merkez Akıllı Lojistik & WMS Üssü",
    binCode: "IST-Z4-KARANTINA-B01",
    lotNumber: "LOT-2610-Q1",
    batchNumber: "BATCH-TEX-409",
    serialNumber: undefined,
    manufacturingDate: "2026-10-10",
    expiryDate: "2031-10-10",
    daysUntilExpiry: 1800,
    supplierName: "Kordsa & Akın Tekstil Конsorsiyumu",
    supplierLotNo: "KRD-2026-771",
    status: "QUARANTINE",
    qcStatus: "PENDING_QC",
    initialQty: 10,
    remainingQty: 10,
    unit: "Adet",
    unitCost: 1510,
    originDocNo: "GRN-2026-1092",
    events: [
      {
        id: "tev-7",
        eventDate: "2026-10-29 13:05",
        eventType: "QC_INSPECTION",
        title: "Su Geçirmezlik & Dikiş Basınç Testi Karantinası",
        quantity: 10,
        unit: "Adet",
        fromLocation: "DEP-IST-01 / Mal Kabul",
        toLocation: "IST-Z4-KARANTINA-B01",
        referenceDocNo: "QC-HOLD-2026-19",
        partnerName: "Kordsa & Akın Tekstil",
        operatorName: "Kalite Uzmanı Deniz Kurt",
        notes: "Numune testi tamamlanana kadar satışa/toplamaya kapalı (Karantina)."
      }
    ]
  }
]

export const INITIAL_BOM_RECIPES: BomRecipeRecord[] = [
  {
    id: "bom-x900-v2",
    code: "BOM-WMS-X900-V2",
    name: "SunumTech X900 UHF RFID & 2D Endüstriyel El Terminali Üretim Reçetesi",
    version: "v2.4 (Endüstriyel)",
    finishedItemId: "item-fg-terminal",
    finishedSku: "WMS-HHT-X900",
    finishedName: "SunumTech X900 Endüstriyel 2D Barkod & UHF RFID El Terminali",
    outputQty: 1,
    outputUnit: "Adet",
    laborCostPerBatch: 1450,
    overheadCostPerBatch: 920,
    scrapRatePercent: 1.5,
    leadTimeHours: 6.5,
    isActive: true,
    components: [
      {
        id: "bomc-1",
        componentItemId: "item-raw-rfid-mod",
        componentSku: "CMP-UHF-IMPINJ-E710",
        componentName: "Impinj E710 UHF RFID Okuyucu Modül Çipi",
        itemType: "RAW_MATERIAL",
        quantity: 1,
        unit: "Adet",
        scrapPercent: 1.0,
        fifoUnitCost: 4950,
        lifoUnitCost: 5350,
        avgUnitCost: 5120,
        standardUnitCost: 4800,
        availableStock: 32,
        operationStep: "10 - SMT Anakart Dizgi"
      },
      {
        id: "bomc-2",
        componentItemId: "item-raw-batt-6000",
        componentSku: "CMP-LION-6000MAH",
        componentName: "Endüstriyel Hot-Swap Li-Ion Batarya Paketi 6000mAh",
        itemType: "SEMI_FINISHED",
        quantity: 2,
        unit: "Adet (Çift Batarya Seti)",
        scrapPercent: 0.5,
        fifoUnitCost: 1880,
        lifoUnitCost: 1960,
        avgUnitCost: 1920,
        standardUnitCost: 1850,
        availableStock: 180,
        operationStep: "20 - Güç Modülü & Gövde Montajı"
      },
      {
        id: "bomc-3",
        componentItemId: "item-raw-screen-ip68",
        componentSku: "CMP-OLED-55-IP68",
        componentName: "5.5 inç Gorilla Glass Victus IP68 Dokunmatik Ekran & Zebra SE4770 2D Optik Motor",
        itemType: "RAW_MATERIAL",
        quantity: 1,
        unit: "Set",
        scrapPercent: 2.0,
        fifoUnitCost: 3420,
        lifoUnitCost: 3680,
        avgUnitCost: 3550,
        standardUnitCost: 3350,
        availableStock: 95,
        operationStep: "30 - Optik Kalibrasyon & IP68 Sızdırmazlık Testi"
      }
    ]
  }
]

// ── Hesaplama ve İş Mantığı Fonksiyonları ─────────────────────────────────────

/**
 * Birim Dönüştürme Motoru (Adet <-> Koli <-> Palet <-> Kg)
 */
export function convertStockUnit(
  item: InventoryItemRecord,
  quantity: number,
  fromUnit: string,
  toUnit: string
): { convertedQty: number; formulaText: string; estimatedWeightKg: number; estimatedVolumeM3: number } {
  if (fromUnit === toUnit) {
    return {
      convertedQty: quantity,
      formulaText: `${quantity} ${fromUnit} = ${quantity} ${toUnit}`,
      estimatedWeightKg: Number((quantity * 0.8).toFixed(2)),
      estimatedVolumeM3: Number((quantity * 0.006).toFixed(3))
    }
  }

  // Önce baz birime (item.baseUnit) çevir
  let baseQty = quantity
  let unitWeight = 0.8
  let unitVolume = 0.006

  if (fromUnit !== item.baseUnit) {
    const ruleFrom = item.unitConversions.find(u => u.fromUnit.toLowerCase() === fromUnit.toLowerCase())
    if (ruleFrom) {
      baseQty = quantity * ruleFrom.multiplier
      unitWeight = ruleFrom.weightKg / ruleFrom.multiplier
      unitVolume = ruleFrom.volumeM3 / ruleFrom.multiplier
    }
  }

  let finalQty = baseQty
  if (toUnit !== item.baseUnit) {
    const ruleTo = item.unitConversions.find(u => u.fromUnit.toLowerCase() === toUnit.toLowerCase())
    if (ruleTo && ruleTo.multiplier > 0) {
      finalQty = baseQty / ruleTo.multiplier
    }
  }

  return {
    convertedQty: Number(finalQty.toFixed(4)),
    formulaText: `${quantity} ${fromUnit} → ${baseQty} ${item.baseUnit} → ${Number(finalQty.toFixed(2))} ${toUnit}`,
    estimatedWeightKg: Number((baseQty * unitWeight).toFixed(2)),
    estimatedVolumeM3: Number((baseQty * unitVolume).toFixed(3))
  }
}

/**
 * FIFO, LIFO, Ağırlıklı Ortalama (Dönemsel) ve Standart Maliyet Değerleme Motoru
 * Hem tekil InventoryItemRecord hem de CostLayerRecord[] katman dizisi ile çağrılabilir.
 */
export function calculateStockValuation(
  itemOrLayers: InventoryItemRecord | CostLayerRecord[] | any,
    methodOrIssueQty ?: ValuationMethod | number,
    standardCostParam ?: number,
    issueQtyParam ?: number
): any {
    // 1. Katmanları ve temel maliyetleri güvenli şekilde çıkart
    let rawLayers: CostLayerRecord[] = []
    let fallbackCost = 500
    let itemId = "item-val"
    let sku = "SKU-VAL"
    let name = "Valuation Item"

    if (Array.isArray(itemOrLayers)) {
      rawLayers = [...itemOrLayers]
    } else if (itemOrLayers && typeof itemOrLayers === "object") {
      rawLayers = Array.isArray(itemOrLayers.costLayers) ? [...itemOrLayers.costLayers] : []
      fallbackCost = Number(itemOrLayers.fifoUnitCost || itemOrLayers.standardCost || itemOrLayers.currentAvgCost || 500)
      itemId = itemOrLayers.id || itemId
      sku = itemOrLayers.sku || sku
      name = itemOrLayers.name || name
    }

    // Güvenlik: Eğer hiçbir katman yoksa sanal varsayılan katman ekle
    if (rawLayers.length === 0) {
      rawLayers = [
        {
          id: "cl-default",
          receiptDocNo: "GRN-DEFAULT",
          layerDate: new Date().toISOString().split("T")[0],
          warehouseCode: "DEP-01",
          lotNumber: "LOT-DEFAULT",
          initialQty: 1000,
          remainingQty: 1000,
          unitCost: Number(standardCostParam || fallbackCost || 500)
        }
      ]
    }

    // 2. Parametreleri çözümle
    let selectedMethod: ValuationMethod = "FIFO"
    let issueQty = 50

    if (typeof methodOrIssueQty === "string") {
      selectedMethod = methodOrIssueQty as ValuationMethod
      issueQty = typeof issueQtyParam === "number" ? issueQtyParam : 50
    } else if (typeof methodOrIssueQty === "number") {
      issueQty = methodOrIssueQty
    }

    const safeQty = Math.max(1, issueQty)
  const standardCost = Number(standardCostParam || fallbackCost || 500)

    const layersAsc = [...rawLayers].sort(
      (a, b) => new Date(a.layerDate).getTime() - new Date(b.layerDate).getTime()
    )
  const layersDesc = [...rawLayers].sort(
      (a, b) => new Date(b.layerDate).getTime() - new Date(a.layerDate).getTime()
    )

    // Toplam mevcut envanter adedi ve maliyeti
    const totalRemainingUnits = rawLayers.reduce((s, l) => s + (l.remainingQty || 0), 0)
    const totalInventoryCost = rawLayers.reduce((s, l) => s + (l.remainingQty || 0) * (l.unitCost || 0), 0)
    const avgCost = totalRemainingUnits > 0 ? Number((totalInventoryCost / totalRemainingUnits).toFixed(2)) : standardCost

    // 1. FIFO Hesaplama (İlk Giren İlk Çıkar)
    let remFifo = safeQty
    let fifoTotalCost = 0
    const consumedLayersFifo: Array<{ layerNo: string; qtyUsed: number; unitCost: number; subtotal: number; lotNumber?: string; consumedQty?: number }> = []
    const consumedFifoBreakdown: Array<{ lotNumber: string; consumedQty: number; unitCost: number }> = []

    for (const layer of layersAsc) {
      if (remFifo <= 0) break
      const take = Math.min(remFifo, layer.remainingQty || 0)
      if (take > 0) {
        const sub = take * layer.unitCost
        fifoTotalCost += sub
        remFifo -= take
        consumedLayersFifo.push({
          layerNo: `${layer.receiptDocNo || "GRN"} (${layer.lotNumber || "LOT"})`,
          qtyUsed: take,
          unitCost: layer.unitCost,
        subtotal: sub,
          lotNumber: layer.lotNumber || "LOT-FIFO",
          consumedQty: take
        })
        consumedFifoBreakdown.push({
          lotNumber: layer.lotNumber || "LOT-FIFO",
          consumedQty: take,
          unitCost: layer.unitCost
        })
      }
    }
    if (remFifo > 0) {
      const cost = fallbackCost
      fifoTotalCost += remFifo * cost
      consumedLayersFifo.push({
        layerNo: "Son Katman Tamamlama",
        qtyUsed: remFifo,
      unitCost: cost,
        subtotal: remFifo * cost,
        lotNumber: "LOT-FALLBACK",
        consumedQty: remFifo
      })
      consumedFifoBreakdown.push({
        lotNumber: "LOT-FALLBACK",
        consumedQty: remFifo,
        unitCost: cost
      })
    }

    // 2. LIFO Hesaplama (Son Giren İlk Çıkar)
    let remLifo = safeQty
    let lifoTotalCost = 0
    const consumedLayersLifo: Array<{ layerNo: string; qtyUsed: number; unitCost: number; subtotal: number; lotNumber?: string; consumedQty?: number }> = []
    const consumedLifoBreakdown: Array<{ lotNumber: string; consumedQty: number; unitCost: number }> = []

    for (const layer of layersDesc) {
      if (remLifo <= 0) break
      const take = Math.min(remLifo, layer.remainingQty || 0)
      if (take > 0) {
        const sub = take * layer.unitCost
        lifoTotalCost += sub
        remLifo -= take
        consumedLayersLifo.push({
          layerNo: `${layer.receiptDocNo || "GRN"} (${layer.lotNumber || "LOT"})`,
          qtyUsed: take,
          unitCost: layer.unitCost,
        subtotal: sub,
          lotNumber: layer.lotNumber || "LOT-LIFO",
          consumedQty: take
        })
        consumedLifoBreakdown.push({
          lotNumber: layer.lotNumber || "LOT-LIFO",
          consumedQty: take,
          unitCost: layer.unitCost
        })
      }
    }
    if (remLifo > 0) {
      const cost = fallbackCost
      lifoTotalCost += remLifo * cost
      consumedLayersLifo.push({
        layerNo: "İlk Katman Tamamlama",
        qtyUsed: remLifo,
      unitCost: cost,
        subtotal: remLifo * cost,
        lotNumber: "LOT-FALLBACK",
        consumedQty: remLifo
      })
      consumedLifoBreakdown.push({
        lotNumber: "LOT-FALLBACK",
        consumedQty: remLifo,
        unitCost: cost
      })
    }

    // 3. Ağırlıklı Ortalama (Weighted Average)
    const weightedAvgUnitCost = avgCost
    const weightedAvgTotalCost = Number((weightedAvgUnitCost * safeQty).toFixed(2))

    // 4. Standart Maliyet ve Sapma (Variance)
    const standardUnitCost = standardCost
    const standardTotalCost = Number((standardUnitCost * safeQty).toFixed(2))
    const standardCostVariance = Number((fifoTotalCost - standardTotalCost).toFixed(2))

    // Seçilen yönteme özel alanlar
    let methodUnitCost = Number((fifoTotalCost / safeQty).toFixed(2))
    let methodCogs = Number(fifoTotalCost.toFixed(2))
    let methodConsumedBreakdown = consumedFifoBreakdown

    if (selectedMethod === "LIFO") {
      methodUnitCost = Number((lifoTotalCost / safeQty).toFixed(2))
      methodCogs = Number(lifoTotalCost.toFixed(2))
      methodConsumedBreakdown = consumedLifoBreakdown
    } else if (selectedMethod === "WEIGHTED_AVERAGE") {
      methodUnitCost = weightedAvgUnitCost
      methodCogs = weightedAvgTotalCost
      methodConsumedBreakdown = [{ lotNumber: "Ağırlıklı Ortalama Havuzu", consumedQty: safeQty, unitCost: weightedAvgUnitCost }]
    } else if (selectedMethod === "STANDARD") {
      methodUnitCost = standardUnitCost
      methodCogs = standardTotalCost
      methodConsumedBreakdown = [{ lotNumber: "Standart Reçete Maliyeti", consumedQty: safeQty, unitCost: standardUnitCost }]
    }

    const endingInventoryValue = Math.max(0, totalInventoryCost - methodCogs)

    return {
      // UI Karşılaştırma Alanları (app/dashboard/stok/page.tsx ve inventoryAiEngine)
      method: selectedMethod,
      unitCost: methodUnitCost,
      cogsForSimulatedIssue: methodCogs,
      endingInventoryValue,
      consumedLayersBreakdown: methodConsumedBreakdown,

      // Standart ValuationComparisonResult Alanları (Geriye dönük tam uyum)
      itemId,
      sku,
      name,
      issueQty: safeQty,
      fifoTotalCost: Number(fifoTotalCost.toFixed(2)),
      fifoUnitCost: Number((fifoTotalCost / safeQty).toFixed(2)),
      lifoTotalCost: Number(lifoTotalCost.toFixed(2)),
      lifoUnitCost: Number((lifoTotalCost / safeQty).toFixed(2)),
      weightedAvgTotalCost,
      weightedAvgUnitCost,
      standardTotalCost,
      standardUnitCost,
      standardCostVariance,
      consumedLayersFifo,
      consumedLayersLifo
    }
  }

  /**
   * BOM (Ürün Ağacı) Reçete Maliyet Roll-up Hesaplayıcı
   */
  export function calculateBomRollupCost(
    bom?: BomRecipeRecord | null,
    batchCount = 1
  ): {
    fifoBatchCost: number
    lifoBatchCost: number
    avgBatchCost: number
    standardBatchCost: number
    maxProducibleBatches: number
    bottleneckComponentSku: string
  } {
    if (!bom) {
      return {
        fifoBatchCost: 0,
        lifoBatchCost: 0,
        avgBatchCost: 0,
        standardBatchCost: 0,
        maxProducibleBatches: 0,
        bottleneckComponentSku: "-"
      }
    }

    let fifoMat = 0
    let lifoMat = 0
    let avgMat = 0
    let stdMat = 0
    let maxProducibleBatches = 999999
    let bottleneckComponentSku = "-"

      const components = Array.isArray(bom.components) ? bom.components : []
      for (const comp of components) {
        const effectiveQty = (comp.quantity || 0) * (1 + (comp.scrapPercent || 0) / 100) * batchCount
        fifoMat += effectiveQty * (comp.fifoUnitCost || 0)
        lifoMat += effectiveQty * (comp.lifoUnitCost || 0)
        avgMat += effectiveQty * (comp.avgUnitCost || 0)
        stdMat += effectiveQty * (comp.standardUnitCost || 0)

        const compQty = comp.quantity || 1
        const possibleForComp = Math.floor((comp.availableStock || 0) / compQty)
        if (possibleForComp < maxProducibleBatches) {
          maxProducibleBatches = possibleForComp
          bottleneckComponentSku = `${comp.componentSku || "-"} (${comp.availableStock || 0} ${comp.unit || "Adet"} mevcut)`
        }
      }

      const opsCost = ((bom.laborCostPerBatch || 0) + (bom.overheadCostPerBatch || 0)) * batchCount

      return {
        fifoBatchCost: Number((fifoMat + opsCost).toFixed(2)),
        lifoBatchCost: Number((lifoMat + opsCost).toFixed(2)),
        avgBatchCost: Number((avgMat + opsCost).toFixed(2)),
        standardBatchCost: Number((stdMat + opsCost).toFixed(2)),
        maxProducibleBatches: maxProducibleBatches === 999999 ? 0 : maxProducibleBatches,
        bottleneckComponentSku
      }
    }

