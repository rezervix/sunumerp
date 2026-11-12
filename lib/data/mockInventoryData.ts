/**
 * Sunum ERP – Stok ve Depo Yönetimi Canlı Demo Veri Seti (Mock Inventory & WMS Data)
 * 
 * Bu dosya, Public Demo ortamında "Stok ve Depo Yönetimi" başlığı altındaki 5 ana ekranın:
 * 1. Stok Kartları & Envanter (/dashboard/stok)
 * 2. Depo Operasyonları & Sayım WMS (/dashboard/wms)
 * 3. Akıllı Satın Alma & ROP (/dashboard/satinalma)
 * 4. Çok Kanallı Satış & Sevkiyat (/dashboard/omnichannel)
 * 5. AI Analiz & Entegrasyon Ekosistemi (/dashboard/stok-ai)
 * 
 * Tıpkı aktif, büyük ölçekli ve prestijli bir çiçek/aranjman kurumsal operasyonunda
 * olduğu gibi canlı, zengin, gerçekçi ve birbirine bağlı kurumsal verilerle çalışmasını sağlar.
 */

// ── Dinamik Tarih Yardımcıları ───────────────────────────────────────────────

function getRelativeIso(daysOffset: number, hours = 10, minutes = 0): string {
  const d = new Date()
  d.setDate(d.getDate() + daysOffset)
  d.setHours(hours, minutes, 0, 0)
  return d.toISOString()
}

function getRelativeDateOnly(daysOffset: number): string {
  const d = new Date()
  d.setDate(d.getDate() + daysOffset)
  return d.toISOString().split("T")[0]
}

// ─────────────────────────────────────────────────────────────────────────────
// 1. DEPOLAR & BÖLGELER (WAREHOUSES & ZONES)
// ─────────────────────────────────────────────────────────────────────────────

export const MOCK_WAREHOUSES = [
  {
    id: "wh-merkez-01",
    branchId: "branch-hq-main",
    code: "DEP-MRK-01",
    name: "Merkez Soğuk Hava & Lojistik Deposu (+4°C)",
    type: "MAIN",
    city: "İstanbul / Tuzla",
    temperatureRange: "+2°C / +4°C (Soğuk Zincir)",
    capacityVolumeM3: 4500,
    usedVolumeM3: 3420,
    occupancyRate: 76,
    isDefault: true,
    isActive: true,
    binsCount: 24,
    managerName: "Kemal Demirtaş (Depo Müdürü)",
    phone: "0216 450 12 00"
  },
  {
    id: "wh-kadikoy-02",
    branchId: "branch-hq-main",
    code: "DEP-KDK-02",
    name: "Kadıköy Mağaza & Hızlı Sevkiyat Deposu",
    type: "STORE",
    city: "İstanbul / Kadıköy",
    temperatureRange: "+18°C / +22°C (İklimlendirilmiş)",
    capacityVolumeM3: 850,
    usedVolumeM3: 680,
    occupancyRate: 80,
    isDefault: false,
    isActive: true,
    binsCount: 8,
    managerName: "Selin Çelik (Mağaza Şefi)",
    phone: "0216 330 45 80"
  },
  {
    id: "wh-atolye-03",
    branchId: "branch-hq-main",
    code: "DEP-ATL-03",
    name: "Aranjman & Tasarım Üretim Atölyesi",
    type: "MANUFACTURING",
    city: "İstanbul / Ataşehir",
    temperatureRange: "+16°C / +20°C",
    capacityVolumeM3: 1200,
    usedVolumeM3: 890,
    occupancyRate: 74,
    isDefault: false,
    isActive: true,
    binsCount: 12,
    managerName: "Burak Yılmaz (Tasarım Koordinatörü)",
    phone: "0216 570 90 20"
  },
  {
    id: "wh-ecom-04",
    branchId: "branch-hq-main",
    code: "DEP-ECM-04",
    name: "E-Ticaret & Pazaryeri Hızlı Paketleme Deposu",
    type: "FULFILLMENT",
    city: "İstanbul / Ümraniye",
    temperatureRange: "+18°C / +21°C",
    capacityVolumeM3: 1600,
    usedVolumeM3: 1120,
    occupancyRate: 70,
    isDefault: false,
    isActive: true,
    binsCount: 16,
    managerName: "Ece Tunç (Fulfillment Yöneticisi)",
    phone: "0216 612 34 50"
  }
]

export const MOCK_WAREHOUSE_ZONES = [
  {
    id: "zone-cold",
    warehouseId: "wh-merkez-01",
    code: "ZN-COLD",
    name: "A Bölgesi: Soğuk Hava Kesme Çiçek Deposu (+4°C)",
    zoneType: "COLD_STORAGE",
    temperatureMin: 2,
    temperatureMax: 4,
    description: "İthal güller, laleler, orkideler ve yeşillikler için ozonlu soğuk hücreler"
  },
  {
    id: "zone-ambient",
    warehouseId: "wh-merkez-01",
    code: "ZN-AMB",
    name: "B Bölgesi: Kuru Depo & Ambalaj Malzemeleri",
    zoneType: "DRY_STORAGE",
    temperatureMin: 18,
    temperatureMax: 24,
    description: "Vazolar, seramikler, kurdeleler, lüks kutular ve karton koliler"
  },
  {
    id: "zone-pick",
    warehouseId: "wh-merkez-01",
    code: "ZN-PICK",
    name: "C Bölgesi: Hızlı Toplama & Dalga İstasyonu (Fast-Pick)",
    zoneType: "PICKING",
    temperatureMin: 18,
    temperatureMax: 22,
    description: "Günlük e-ticaret siparişleri için en çok dönen A-Sınıfı ürünlerin raf hattı"
  },
  {
    id: "zone-quarantine",
    warehouseId: "wh-merkez-01",
    code: "ZN-QC",
    name: "D Bölgesi: Mal Kabul, Kalite Kontrol & İade Karantina",
    zoneType: "QUARANTINE",
    temperatureMin: 16,
    temperatureMax: 20,
    description: "Tedarikçiden yeni inen sevkiyatlar ve müşteri RMA iade inceleme alanı"
  }
]

// ─────────────────────────────────────────────────────────────────────────────
// 2. STOK KARTLARI (INVENTORY ITEMS & BALANCES)
// ─────────────────────────────────────────────────────────────────────────────

export const MOCK_INVENTORY_ITEMS: any[] = [
  {
    id: "item-gul-01",
    productId: "prod-gul-01",
    sku: "GUL-EKV-01",
    barcode: "8690001001",
    name: "Ekvator Kırmızı Gül (1. Kalite - 60cm)",
    category: "Kesme Çiçek",
    itemType: "RAW_MATERIAL",
    baseUnit: "Demet",
    valuationMethod: "FIFO",
    standardCost: 250,
    currentAvgCost: 255,
    fifoUnitCost: 250,
    lifoUnitCost: 265,
    lastPurchaseCost: 260,
    salesPrice: 480,
    taxRate: 20,
    trackLot: true,
    trackExpiry: true,
    shelfLifeDays: 14,
    minStockLevel: 25,
    maxStockLevel: 300,
    leadTimeDays: 3,
    totalOnHand: 140,
    totalReserved: 25,
    totalAvailable: 115,
    stockBalances: [
      {
        id: "sb-gul-01",
        warehouseId: "wh-merkez-01",
        storageBinId: "bin-a01-01",
        onHandQty: 100,
        reservedQty: 20,
        availableQty: 80,
        warehouse: { id: "wh-merkez-01", name: "Merkez Soğuk Hava Deposu", code: "DEP-MRK-01" },
        storageBin: { id: "bin-a01-01", code: "A-01-01", binPosition: "Zemin Soğuk Hücre" }
      },
      {
        id: "sb-gul-02",
        warehouseId: "wh-kadikoy-02",
        storageBinId: "bin-k01-01",
        onHandQty: 25,
        reservedQty: 5,
        availableQty: 20,
        warehouse: { id: "wh-kadikoy-02", name: "Kadıköy Mağaza Deposu", code: "DEP-KDK-02" },
        storageBin: { id: "bin-k01-01", code: "M-01-01", binPosition: "Vitrin Ön Soğutucu" }
      },
      {
        id: "sb-gul-03",
        warehouseId: "wh-atolye-03",
        storageBinId: "bin-t01-01",
        onHandQty: 15,
        reservedQty: 0,
        availableQty: 15,
        warehouse: { id: "wh-atolye-03", name: "Tasarım Üretim Atölyesi", code: "DEP-ATL-03" },
        storageBin: { id: "bin-t01-01", code: "T-01-01", binPosition: "Atölye Tezgah Altı" }
      }
    ],
    costLayers: [
      { id: "cl-gul-1", layerDate: getRelativeIso(-7), initialQty: 80, remainingQty: 40, unitCost: 250, isExhausted: false },
      { id: "cl-gul-2", layerDate: getRelativeIso(-2), initialQty: 100, remainingQty: 100, unitCost: 260, isExhausted: false }
    ],
    lotSerials: [
      { id: "lot-gul-1", lotNumber: "LOT-2026-EKV01", initialQty: 80, remainingQty: 40, expiryDate: getRelativeIso(5), qcStatus: "PASSED" },
      { id: "lot-gul-2", lotNumber: "LOT-2026-EKV02", initialQty: 100, remainingQty: 100, expiryDate: getRelativeIso(12), qcStatus: "PASSED" }
    ],
    unitConversions: [
      { id: "uc-gul-1", fromUnit: "Demet", toUnit: "Adet", multiplier: 10 },
      { id: "uc-gul-2", fromUnit: "Koli", toUnit: "Demet", multiplier: 20 }
    ],
    stockMovements: [
      { id: "sm-gul-1", movementType: "PURCHASE_RECEIPT", quantity: 100, unitCost: 260, documentNo: "FAT-2026-8812", createdAt: getRelativeIso(-2), warehouse: { name: "Merkez Soğuk Hava Deposu" } },
      { id: "sm-gul-2", movementType: "SALES_DISPATCH", quantity: -20, unitCost: 250, documentNo: "IRS-2026-0941", createdAt: getRelativeIso(-1), warehouse: { name: "Merkez Soğuk Hava Deposu" } }
    ]
  },
  {
    id: "item-lil-02",
    productId: "prod-lil-02",
    sku: "LIL-KAZ-02",
    barcode: "8690001002",
    name: "Beyaz Kazablanka Lilyum (Kokulu)",
    category: "Kesme Çiçek",
    itemType: "RAW_MATERIAL",
    baseUnit: "Demet",
    valuationMethod: "FIFO",
    standardCost: 190,
    currentAvgCost: 195,
    fifoUnitCost: 190,
    lifoUnitCost: 200,
    lastPurchaseCost: 200,
    salesPrice: 390,
    taxRate: 20,
    trackLot: true,
    trackExpiry: true,
    shelfLifeDays: 10,
    minStockLevel: 20,
    maxStockLevel: 180,
    leadTimeDays: 4,
    totalOnHand: 55,
    totalReserved: 12,
    totalAvailable: 43,
    stockBalances: [
      {
        id: "sb-lil-01",
        warehouseId: "wh-merkez-01",
        storageBinId: "bin-a01-02",
        onHandQty: 40,
        reservedQty: 10,
        availableQty: 30,
        warehouse: { id: "wh-merkez-01", name: "Merkez Soğuk Hava Deposu", code: "DEP-MRK-01" },
        storageBin: { id: "bin-a01-02", code: "A-01-02", binPosition: "Orta Raf Soğuk Hücre" }
      },
      {
        id: "sb-lil-02",
        warehouseId: "wh-kadikoy-02",
        storageBinId: "bin-k01-02",
        onHandQty: 15,
        reservedQty: 2,
        availableQty: 13,
        warehouse: { id: "wh-kadikoy-02", name: "Kadıköy Mağaza Deposu", code: "DEP-KDK-02" },
        storageBin: { id: "bin-k01-02", code: "M-01-02", binPosition: "Mağaza Soğutucu" }
      }
    ],
    costLayers: [
      { id: "cl-lil-1", layerDate: getRelativeIso(-3), initialQty: 60, remainingQty: 55, unitCost: 195, isExhausted: false }
    ],
    lotSerials: [
      { id: "lot-lil-1", lotNumber: "LOT-2026-LIL01", initialQty: 60, remainingQty: 55, expiryDate: getRelativeIso(6), qcStatus: "PASSED" }
    ],
    unitConversions: [
      { id: "uc-lil-1", fromUnit: "Demet", toUnit: "Dal", multiplier: 5 }
    ]
  },
  {
    id: "item-ork-05",
    productId: "prod-ork-05",
    sku: "ORK-MOR-05",
    barcode: "8690001005",
    name: "Çift Dallı Premium Mor Orkide (Phalaenopsis)",
    category: "Saksılı Çiçek",
    itemType: "FINISHED_PRODUCT",
    baseUnit: "Adet",
    valuationMethod: "AVERAGE",
    standardCost: 320,
    currentAvgCost: 335,
    fifoUnitCost: 330,
    lifoUnitCost: 340,
    lastPurchaseCost: 340,
    salesPrice: 750,
    taxRate: 20,
    trackLot: true,
    trackExpiry: true,
    shelfLifeDays: 45,
    minStockLevel: 15,
    maxStockLevel: 120,
    leadTimeDays: 5,
    totalOnHand: 34,
    totalReserved: 8,
    totalAvailable: 26,
    stockBalances: [
      {
        id: "sb-ork-01",
        warehouseId: "wh-merkez-01",
        storageBinId: "bin-b01-01",
        onHandQty: 20,
        reservedQty: 5,
        availableQty: 15,
        warehouse: { id: "wh-merkez-01", name: "Merkez Soğuk Hava Deposu", code: "DEP-MRK-01" },
        storageBin: { id: "bin-b01-01", code: "B-01-01", binPosition: "İklimlendirilmiş Saksı Bölmesi" }
      },
      {
        id: "sb-ork-02",
        warehouseId: "wh-kadikoy-02",
        storageBinId: "bin-k01-03",
        onHandQty: 14,
        reservedQty: 3,
        availableQty: 11,
        warehouse: { id: "wh-kadikoy-02", name: "Kadıköy Mağaza Deposu", code: "DEP-KDK-02" },
        storageBin: { id: "bin-k01-03", code: "M-02-01", binPosition: "Ön Teşhir Vitrini" }
      }
    ],
    costLayers: [
      { id: "cl-ork-1", layerDate: getRelativeIso(-10), initialQty: 50, remainingQty: 34, unitCost: 335, isExhausted: false }
    ],
    lotSerials: [
      { id: "lot-ork-1", lotNumber: "LOT-2026-ORK-HOLLAND", initialQty: 50, remainingQty: 34, expiryDate: getRelativeIso(35), qcStatus: "PASSED" }
    ],
    unitConversions: []
  },
  {
    id: "item-vaz-03",
    productId: "prod-vaz-03",
    sku: "VAZ-ANT-03",
    barcode: "8690001003",
    name: "Antrasit Mat Seramik Vazo (25cm)",
    category: "Vazo & Seramik",
    itemType: "RAW_MATERIAL",
    baseUnit: "Adet",
    valuationMethod: "FIFO",
    standardCost: 110,
    currentAvgCost: 115,
    fifoUnitCost: 110,
    lifoUnitCost: 120,
    lastPurchaseCost: 120,
    salesPrice: 280,
    taxRate: 20,
    trackLot: false,
    trackExpiry: false,
    minStockLevel: 30,
    maxStockLevel: 250,
    leadTimeDays: 7,
    totalOnHand: 85,
    totalReserved: 15,
    totalAvailable: 70,
    stockBalances: [
      {
        id: "sb-vaz-01",
        warehouseId: "wh-merkez-01",
        storageBinId: "bin-c01-01",
        onHandQty: 60,
        reservedQty: 10,
        availableQty: 50,
        warehouse: { id: "wh-merkez-01", name: "Merkez Soğuk Hava Deposu", code: "DEP-MRK-01" },
        storageBin: { id: "bin-c01-01", code: "C-01-01", binPosition: "Ağır Palet Katı" }
      },
      {
        id: "sb-vaz-02",
        warehouseId: "wh-atolye-03",
        storageBinId: "bin-t01-02",
        onHandQty: 25,
        reservedQty: 5,
        availableQty: 20,
        warehouse: { id: "wh-atolye-03", name: "Tasarım Üretim Atölyesi", code: "DEP-ATL-03" },
        storageBin: { id: "bin-t01-02", code: "T-01-02", binPosition: "Vazo Hazırlık Bölümü" }
      }
    ],
    costLayers: [
      { id: "cl-vaz-1", layerDate: getRelativeIso(-14), initialQty: 100, remainingQty: 85, unitCost: 115, isExhausted: false }
    ],
    lotSerials: [],
    unitConversions: [
      { id: "uc-vaz-1", fromUnit: "Koli", toUnit: "Adet", multiplier: 12 }
    ]
  },
  {
    id: "item-sng-04",
    productId: "prod-sng-04",
    sku: "SNG-OAS-04",
    barcode: "8690001004",
    name: "Oasis İthal Çiçek Süngeri (Tuğla)",
    category: "Sarf Malzeme",
    itemType: "CONSUMABLE",
    baseUnit: "Adet",
    valuationMethod: "AVERAGE",
    standardCost: 18,
    currentAvgCost: 19.5,
    fifoUnitCost: 19,
    lifoUnitCost: 20,
    lastPurchaseCost: 20,
    salesPrice: 45,
    taxRate: 20,
    trackLot: false,
    trackExpiry: false,
    minStockLevel: 50,
    maxStockLevel: 500,
    leadTimeDays: 2,
    totalOnHand: 180,
    totalReserved: 40,
    totalAvailable: 140,
    stockBalances: [
      {
        id: "sb-sng-01",
        warehouseId: "wh-merkez-01",
        storageBinId: "bin-c02-01",
        onHandQty: 120,
        reservedQty: 30,
        availableQty: 90,
        warehouse: { id: "wh-merkez-01", name: "Merkez Soğuk Hava Deposu", code: "DEP-MRK-01" },
        storageBin: { id: "bin-c02-01", code: "C-02-01", binPosition: "Sarf Malzeme Rafı" }
      },
      {
        id: "sb-sng-02",
        warehouseId: "wh-atolye-03",
        storageBinId: "bin-t01-03",
        onHandQty: 60,
        reservedQty: 10,
        availableQty: 50,
        warehouse: { id: "wh-atolye-03", name: "Tasarım Üretim Atölyesi", code: "DEP-ATL-03" },
        storageBin: { id: "bin-t01-03", code: "T-01-03", binPosition: "Islatma Havuzu Yanı" }
      }
    ],
    costLayers: [
      { id: "cl-sng-1", layerDate: getRelativeIso(-20), initialQty: 250, remainingQty: 180, unitCost: 19.5, isExhausted: false }
    ],
    lotSerials: [],
    unitConversions: [
      { id: "uc-sng-1", fromUnit: "Koli", toUnit: "Adet", multiplier: 20 }
    ]
  },
  {
    id: "item-krd-08",
    productId: "prod-krd-08",
    sku: "KRD-SAT-08",
    barcode: "8690001008",
    name: "Lüks Bordo İpek Saten Kurdele (40mm x 50m)",
    category: "Ambalaj & Süsleme",
    itemType: "CONSUMABLE",
    baseUnit: "Rulo",
    valuationMethod: "FIFO",
    standardCost: 75,
    currentAvgCost: 78,
    fifoUnitCost: 75,
    lifoUnitCost: 80,
    lastPurchaseCost: 80,
    salesPrice: 175,
    taxRate: 20,
    trackLot: false,
    trackExpiry: false,
    minStockLevel: 15,
    maxStockLevel: 150,
    leadTimeDays: 3,
    totalOnHand: 8, // KRİTİK SEVİYE
    totalReserved: 4,
    totalAvailable: 4,
    stockBalances: [
      {
        id: "sb-krd-01",
        warehouseId: "wh-atolye-03",
        storageBinId: "bin-t01-04",
        onHandQty: 8,
        reservedQty: 4,
        availableQty: 4,
        warehouse: { id: "wh-atolye-03", name: "Tasarım Üretim Atölyesi", code: "DEP-ATL-03" },
        storageBin: { id: "bin-t01-04", code: "T-02-01", binPosition: "Kurdele Askılık Bölmesi" }
      }
    ],
    costLayers: [
      { id: "cl-krd-1", layerDate: getRelativeIso(-25), initialQty: 50, remainingQty: 8, unitCost: 78, isExhausted: false }
    ],
    lotSerials: [],
    unitConversions: [
      { id: "uc-krd-1", fromUnit: "Koli", toUnit: "Rulo", multiplier: 10 }
    ]
  },
  {
    id: "item-bkt-06",
    productId: "prod-bkt-06",
    sku: "BKT-PST-06",
    barcode: "8690001006",
    name: "Pastel Rüya Bahar Buketi",
    category: "Buket & Aranjman",
    itemType: "FINISHED_PRODUCT",
    baseUnit: "Adet",
    valuationMethod: "FIFO",
    standardCost: 420,
    currentAvgCost: 430,
    fifoUnitCost: 420,
    lifoUnitCost: 440,
    lastPurchaseCost: 430,
    salesPrice: 950,
    taxRate: 20,
    trackLot: true,
    trackExpiry: true,
    shelfLifeDays: 4,
    minStockLevel: 10,
    maxStockLevel: 60,
    leadTimeDays: 1,
    totalOnHand: 18,
    totalReserved: 8,
    totalAvailable: 10,
    stockBalances: [
      {
        id: "sb-bkt-01",
        warehouseId: "wh-kadikoy-02",
        storageBinId: "bin-k01-04",
        onHandQty: 10,
        reservedQty: 4,
        availableQty: 6,
        warehouse: { id: "wh-kadikoy-02", name: "Kadıköy Mağaza Deposu", code: "DEP-KDK-02" },
        storageBin: { id: "bin-k01-04", code: "M-03-01", binPosition: "Buket Standı" }
      },
      {
        id: "sb-bkt-02",
        warehouseId: "wh-ecom-04",
        storageBinId: "bin-e01-01",
        onHandQty: 8,
        reservedQty: 4,
        availableQty: 4,
        warehouse: { id: "wh-ecom-04", name: "E-Ticaret Deposu", code: "DEP-ECM-04" },
        storageBin: { id: "bin-e01-01", code: "E-01-01", binPosition: "Hızlı Kurye Çıkış Hattı" }
      }
    ],
    costLayers: [
      { id: "cl-bkt-1", layerDate: getRelativeIso(-1), initialQty: 25, remainingQty: 18, unitCost: 430, isExhausted: false }
    ],
    lotSerials: [
      { id: "lot-bkt-1", lotNumber: "LOT-BKT-2601", initialQty: 25, remainingQty: 18, expiryDate: getRelativeIso(3), qcStatus: "PASSED" }
    ],
    unitConversions: []
  },
  {
    id: "item-arj-07",
    productId: "prod-arj-07",
    sku: "ARJ-VIP-07",
    barcode: "8690001007",
    name: "VIP Antrasit Seramik Gül & Lilyum Aranjmanı",
    category: "Lüks Aranjman",
    itemType: "FINISHED_PRODUCT",
    baseUnit: "Adet",
    valuationMethod: "FIFO",
    standardCost: 780,
    currentAvgCost: 810,
    fifoUnitCost: 780,
    lifoUnitCost: 830,
    lastPurchaseCost: 810,
    salesPrice: 1850,
    taxRate: 20,
    trackLot: true,
    trackExpiry: true,
    shelfLifeDays: 5,
    minStockLevel: 10,
    maxStockLevel: 50,
    leadTimeDays: 1,
    totalOnHand: 14,
    totalReserved: 6,
    totalAvailable: 8,
    stockBalances: [
      {
        id: "sb-arj-01",
        warehouseId: "wh-merkez-01",
        storageBinId: "bin-a02-01",
        onHandQty: 8,
        reservedQty: 4,
        availableQty: 4,
        warehouse: { id: "wh-merkez-01", name: "Merkez Soğuk Hava Deposu", code: "DEP-MRK-01" },
        storageBin: { id: "bin-a02-01", code: "A-02-01", binPosition: "VIP Özel Muhafaza Hücresi" }
      },
      {
        id: "sb-arj-02",
        warehouseId: "wh-kadikoy-02",
        storageBinId: "bin-k01-05",
        onHandQty: 6,
        reservedQty: 2,
        availableQty: 4,
        warehouse: { id: "wh-kadikoy-02", name: "Kadıköy Mağaza Deposu", code: "DEP-KDK-02" },
        storageBin: { id: "bin-k01-05", code: "M-03-02", binPosition: "VIP Vitrin" }
      }
    ],
    costLayers: [
      { id: "cl-arj-1", layerDate: getRelativeIso(-1), initialQty: 20, remainingQty: 14, unitCost: 810, isExhausted: false }
    ],
    lotSerials: [
      { id: "lot-arj-1", lotNumber: "LOT-ARJ-2601", initialQty: 20, remainingQty: 14, expiryDate: getRelativeIso(4), qcStatus: "PASSED" }
    ],
    unitConversions: [],
    bomHeaders: [
      {
        id: "bom-arj-01",
        code: "BOM-ARJ-VIP-01",
        name: "VIP Seramik Aranjman Ürün Ağacı",
        revision: "01",
        components: [
          { componentItem: { name: "Ekvator Kırmızı Gül", sku: "GUL-EKV-01" }, quantity: 15, unit: "Dal" },
          { componentItem: { name: "Beyaz Kazablanka Lilyum", sku: "LIL-KAZ-02" }, quantity: 4, unit: "Dal" },
          { componentItem: { name: "Antrasit Mat Seramik Vazo", sku: "VAZ-ANT-03" }, quantity: 1, unit: "Adet" },
          { componentItem: { name: "Oasis İthal Çiçek Süngeri", sku: "SNG-OAS-04" }, quantity: 1.5, unit: "Adet" },
          { componentItem: { name: "Lüks Bordo İpek Saten Kurdele", sku: "KRD-SAT-08" }, quantity: 2, unit: "Metre" }
        ]
      }
    ]
  },
  {
    id: "item-kut-09",
    productId: "prod-kut-09",
    sku: "KUT-LKS-09",
    barcode: "8690001009",
    name: "Gold Varaklı Silindir Şapka Kutusu (Büyük Boy)",
    category: "Kutu & Ambalaj",
    itemType: "RAW_MATERIAL",
    baseUnit: "Adet",
    valuationMethod: "FIFO",
    standardCost: 65,
    currentAvgCost: 68,
    fifoUnitCost: 65,
    lifoUnitCost: 70,
    lastPurchaseCost: 70,
    salesPrice: 160,
    taxRate: 20,
    trackLot: false,
    trackExpiry: false,
    minStockLevel: 20,
    maxStockLevel: 200,
    leadTimeDays: 5,
    totalOnHand: 4, // TÜKENME TEHLİKESİ (STOCKOUT SINIRINDA)
    totalReserved: 4,
    totalAvailable: 0,
    stockBalances: [
      {
        id: "sb-kut-01",
        warehouseId: "wh-merkez-01",
        storageBinId: "bin-c03-01",
        onHandQty: 4,
        reservedQty: 4,
        availableQty: 0,
        warehouse: { id: "wh-merkez-01", name: "Merkez Soğuk Hava Deposu", code: "DEP-MRK-01" },
        storageBin: { id: "bin-c03-01", code: "C-03-01", binPosition: "Kutu Depolama Katı" }
      }
    ],
    costLayers: [
      { id: "cl-kut-1", layerDate: getRelativeIso(-18), initialQty: 80, remainingQty: 4, unitCost: 68, isExhausted: false }
    ],
    lotSerials: [],
    unitConversions: []
  },
  {
    id: "item-okl-10",
    productId: "prod-okl-10",
    sku: "OKL-CIN-10",
    barcode: "8690001010",
    name: "Gümüş Okaliptüs Yeşilliği (Cinerea)",
    category: "Yeşillik & Dolgu",
    itemType: "RAW_MATERIAL",
    baseUnit: "Bağ",
    valuationMethod: "FIFO",
    standardCost: 85,
    currentAvgCost: 90,
    fifoUnitCost: 85,
    lifoUnitCost: 95,
    lastPurchaseCost: 95,
    salesPrice: 180,
    taxRate: 20,
    trackLot: true,
    trackExpiry: true,
    shelfLifeDays: 20,
    minStockLevel: 20,
    maxStockLevel: 150,
    leadTimeDays: 3,
    totalOnHand: 48,
    totalReserved: 10,
    totalAvailable: 38,
    stockBalances: [
      {
        id: "sb-okl-01",
        warehouseId: "wh-merkez-01",
        storageBinId: "bin-a03-01",
        onHandQty: 48,
        reservedQty: 10,
        availableQty: 38,
        warehouse: { id: "wh-merkez-01", name: "Merkez Soğuk Hava Deposu", code: "DEP-MRK-01" },
        storageBin: { id: "bin-a03-01", code: "A-03-01", binPosition: "Yeşillik Soğutucu" }
      }
    ],
    costLayers: [
      { id: "cl-okl-1", layerDate: getRelativeIso(-4), initialQty: 60, remainingQty: 48, unitCost: 90, isExhausted: false }
    ],
    lotSerials: [
      { id: "lot-okl-1", lotNumber: "LOT-OKL-2601", initialQty: 60, remainingQty: 48, expiryDate: getRelativeIso(16), qcStatus: "PASSED" }
    ],
    unitConversions: []
  }
]

export const MOCK_STOCK_STATS = {
  totalStockValue: 1485250,
  criticalStockCount: 3,
  expiringCount: 2,
  activeWarehouseCount: 4,
  totalItemCount: 10
}

// ─────────────────────────────────────────────────────────────────────────────
// 3. WMS DEPO OPERASYONLARI, RAF ADRESLERİ & SAYIM (WMS)
// ─────────────────────────────────────────────────────────────────────────────

export const MOCK_WMS_STATS = {
  totalPendingTasks: 4,
  inProgressTasks: 3,
  totalBins: 32,
  occupiedBins: 25,
  averageOccupancy: 78,
  activeTransfers: 2,
  openCountSessions: 1
}

export const MOCK_STORAGE_BINS = [
  // A Koridoru (Soğuk Hava Hücreleri - Kesme Çiçek)
  {
    id: "bin-a01-01",
    warehouseId: "wh-merkez-01",
    zoneId: "zone-cold",
    code: "A-01-01",
    aisle: "A",
    rack: "01",
    level: "01",
    binPosition: "Zemin Soğuk Hücre",
    binType: "COLD_CELL",
    abcVelocity: "A",
    maxWeightKg: 500,
    currentWeightKg: 380,
    maxVolumeM3: 4.5,
    currentVolumeM3: 3.8,
    occupancyPercent: 84,
    isBlocked: false,
    zone: { id: "zone-cold", code: "ZN-COLD", name: "Soğuk Hava Bölgesi (+4°C)", zoneType: "COLD_STORAGE", temperatureMin: 2, temperatureMax: 4 },
    warehouse: { id: "wh-merkez-01", name: "Merkez Soğuk Hava Deposu", code: "DEP-MRK-01" },
    stockBalances: [{ id: "sb-gul-01", itemId: "item-gul-01", onHandQty: 100, item: { name: "Ekvator Kırmızı Gül", sku: "GUL-EKV-01" } }]
  },
  {
    id: "bin-a01-02",
    warehouseId: "wh-merkez-01",
    zoneId: "zone-cold",
    code: "A-01-02",
    aisle: "A",
    rack: "01",
    level: "02",
    binPosition: "Orta Raf Soğuk Hücre",
    binType: "COLD_CELL",
    abcVelocity: "A",
    maxWeightKg: 400,
    currentWeightKg: 290,
    maxVolumeM3: 3.5,
    currentVolumeM3: 2.7,
    occupancyPercent: 77,
    isBlocked: false,
    zone: { id: "zone-cold", code: "ZN-COLD", name: "Soğuk Hava Bölgesi (+4°C)", zoneType: "COLD_STORAGE" },
    warehouse: { id: "wh-merkez-01", name: "Merkez Soğuk Hava Deposu", code: "DEP-MRK-01" },
    stockBalances: [{ id: "sb-lil-01", itemId: "item-lil-02", onHandQty: 40, item: { name: "Beyaz Kazablanka Lilyum", sku: "LIL-KAZ-02" } }]
  },
  {
    id: "bin-a02-01",
    warehouseId: "wh-merkez-01",
    zoneId: "zone-cold",
    code: "A-02-01",
    aisle: "A",
    rack: "02",
    level: "01",
    binPosition: "VIP Özel Muhafaza Hücresi",
    binType: "COLD_CELL",
    abcVelocity: "A",
    maxWeightKg: 450,
    currentWeightKg: 390,
    maxVolumeM3: 4.0,
    currentVolumeM3: 3.6,
    occupancyPercent: 90,
    isBlocked: false,
    zone: { id: "zone-cold", code: "ZN-COLD", name: "Soğuk Hava Bölgesi (+4°C)", zoneType: "COLD_STORAGE" },
    warehouse: { id: "wh-merkez-01", name: "Merkez Soğuk Hava Deposu", code: "DEP-MRK-01" },
    stockBalances: [{ id: "sb-arj-01", itemId: "item-arj-07", onHandQty: 8, item: { name: "VIP Seramik Aranjmanı", sku: "ARJ-VIP-07" } }]
  },
  {
    id: "bin-a03-01",
    warehouseId: "wh-merkez-01",
    zoneId: "zone-cold",
    code: "A-03-01",
    aisle: "A",
    rack: "03",
    level: "01",
    binPosition: "Yeşillik Soğutucu",
    binType: "COLD_CELL",
    abcVelocity: "B",
    maxWeightKg: 300,
    currentWeightKg: 195,
    maxVolumeM3: 3.0,
    currentVolumeM3: 2.1,
    occupancyPercent: 70,
    isBlocked: false,
    zone: { id: "zone-cold", code: "ZN-COLD", name: "Soğuk Hava Bölgesi (+4°C)", zoneType: "COLD_STORAGE" },
    warehouse: { id: "wh-merkez-01", name: "Merkez Soğuk Hava Deposu", code: "DEP-MRK-01" },
    stockBalances: [{ id: "sb-okl-01", itemId: "item-okl-10", onHandQty: 48, item: { name: "Gümüş Okaliptüs", sku: "OKL-CIN-10" } }]
  },
  // B Koridoru (İklimlendirilmiş Saksı & Bitki)
  {
    id: "bin-b01-01",
    warehouseId: "wh-merkez-01",
    zoneId: "zone-cold",
    code: "B-01-01",
    aisle: "B",
    rack: "01",
    level: "01",
    binPosition: "İklimlendirilmiş Saksı Bölmesi",
    binType: "SHELF",
    abcVelocity: "B",
    maxWeightKg: 600,
    currentWeightKg: 420,
    maxVolumeM3: 5.0,
    currentVolumeM3: 3.8,
    occupancyPercent: 76,
    isBlocked: false,
    zone: { id: "zone-cold", code: "ZN-COLD", name: "Soğuk Hava Bölgesi (+4°C)", zoneType: "COLD_STORAGE" },
    warehouse: { id: "wh-merkez-01", name: "Merkez Soğuk Hava Deposu", code: "DEP-MRK-01" },
    stockBalances: [{ id: "sb-ork-01", itemId: "item-ork-05", onHandQty: 20, item: { name: "Mor Orkide", sku: "ORK-MOR-05" } }]
  },
  // C Koridoru (Kuru Depo - Vazo, Kutu, Sünger)
  {
    id: "bin-c01-01",
    warehouseId: "wh-merkez-01",
    zoneId: "zone-ambient",
    code: "C-01-01",
    aisle: "C",
    rack: "01",
    level: "01",
    binPosition: "Ağır Palet Katı",
    binType: "PALLET_RACK",
    abcVelocity: "B",
    maxWeightKg: 1200,
    currentWeightKg: 960,
    maxVolumeM3: 6.0,
    currentVolumeM3: 5.1,
    occupancyPercent: 85,
    isBlocked: false,
    zone: { id: "zone-ambient", code: "ZN-AMB", name: "Kuru Depo & Ambalaj", zoneType: "DRY_STORAGE" },
    warehouse: { id: "wh-merkez-01", name: "Merkez Soğuk Hava Deposu", code: "DEP-MRK-01" },
    stockBalances: [{ id: "sb-vaz-01", itemId: "item-vaz-03", onHandQty: 60, item: { name: "Antrasit Mat Seramik Vazo", sku: "VAZ-ANT-03" } }]
  },
  {
    id: "bin-c02-01",
    warehouseId: "wh-merkez-01",
    zoneId: "zone-ambient",
    code: "C-02-01",
    aisle: "C",
    rack: "02",
    level: "01",
    binPosition: "Sarf Malzeme Rafı",
    binType: "SHELF",
    abcVelocity: "A",
    maxWeightKg: 400,
    currentWeightKg: 210,
    maxVolumeM3: 4.0,
    currentVolumeM3: 2.8,
    occupancyPercent: 70,
    isBlocked: false,
    zone: { id: "zone-ambient", code: "ZN-AMB", name: "Kuru Depo & Ambalaj", zoneType: "DRY_STORAGE" },
    warehouse: { id: "wh-merkez-01", name: "Merkez Soğuk Hava Deposu", code: "DEP-MRK-01" },
    stockBalances: [{ id: "sb-sng-01", itemId: "item-sng-04", onHandQty: 120, item: { name: "Oasis İthal Çiçek Süngeri", sku: "SNG-OAS-04" } }]
  },
  {
    id: "bin-c03-01",
    warehouseId: "wh-merkez-01",
    zoneId: "zone-ambient",
    code: "C-03-01",
    aisle: "C",
    rack: "03",
    level: "01",
    binPosition: "Kutu Depolama Katı",
    binType: "SHELF",
    abcVelocity: "C",
    maxWeightKg: 300,
    currentWeightKg: 40,
    maxVolumeM3: 4.5,
    currentVolumeM3: 0.6,
    occupancyPercent: 13,
    isBlocked: false,
    zone: { id: "zone-ambient", code: "ZN-AMB", name: "Kuru Depo & Ambalaj", zoneType: "DRY_STORAGE" },
    warehouse: { id: "wh-merkez-01", name: "Merkez Soğuk Hava Deposu", code: "DEP-MRK-01" },
    stockBalances: [{ id: "sb-kut-01", itemId: "item-kut-09", onHandQty: 4, item: { name: "Şapka Kutusu", sku: "KUT-LKS-09" } }]
  }
]

export const MOCK_WMS_TASKS: any[] = [
  {
    id: "task-01",
    taskNumber: "TSK-2026-091",
    workflowStage: "GOODS_RECEIPT",
    warehouseId: "wh-merkez-01",
    sourceDocType: "PURCHASE_ORDER",
    sourceDocNo: "PO-2026-041",
    partnerName: "Royal Flora Holland İthalat",
    priority: "HIGH",
    status: "IN_PROGRESS",
    assignedOperator: "Ahmet Yılmaz (Mal Kabul Sorumlusu)",
    lpnCode: "LPN-TR-88910",
    notes: "Hollanda'dan gelen soğuk zincir tırından 120 demet Ekvator gülü ve lilyum indiriliyor.",
    lines: [
      { id: "tl-1", itemId: "item-gul-01", sku: "GUL-EKV-01", itemName: "Ekvator Kırmızı Gül", expectedQty: 100, processedQty: 60, unit: "Demet", actualBin: "A-01-01", lotNumber: "LOT-2026-EKV02" },
      { id: "tl-2", itemId: "item-lil-02", sku: "LIL-KAZ-02", itemName: "Beyaz Kazablanka Lilyum", expectedQty: 50, processedQty: 0, unit: "Demet", actualBin: "A-01-02", lotNumber: "LOT-2026-LIL02" }
    ],
    warehouse: { id: "wh-merkez-01", name: "Merkez Soğuk Hava Deposu", code: "DEP-MRK-01" }
  },
  {
    id: "task-02",
    taskNumber: "TSK-2026-088",
    workflowStage: "QC_INSPECTION",
    warehouseId: "wh-merkez-01",
    sourceDocType: "SUPPLIER_DISPATCH",
    sourceDocNo: "IRS-YAL-2026",
    partnerName: "Yalova Çiçekçilik Kooperatifi",
    priority: "URGENT",
    status: "PENDING",
    assignedOperator: "Zeynep Arslan (Kalite Mühendisi)",
    lpnCode: "LPN-QC-1102",
    notes: "Gelen yeşillik ve güllerin nem, sap kırığı ve yaprak tazeliği spektrometre kontrolünde.",
    lines: [
      { id: "tl-3", itemId: "item-okl-10", sku: "OKL-CIN-10", itemName: "Gümüş Okaliptüs Yeşilliği", expectedQty: 60, processedQty: 60, unit: "Bağ", suggestedToBin: "A-03-01", lotNumber: "LOT-OKL-2601" }
    ],
    warehouse: { id: "wh-merkez-01", name: "Merkez Soğuk Hava Deposu", code: "DEP-MRK-01" }
  },
  {
    id: "task-03",
    taskNumber: "TSK-2026-085",
    workflowStage: "PUTAWAY",
    warehouseId: "wh-merkez-01",
    sourceDocType: "GOODS_RECEIPT_SLIP",
    sourceDocNo: "GRN-2026-019",
    partnerName: "Paşabahçe Cam Sanayi",
    priority: "NORMAL",
    status: "IN_PROGRESS",
    assignedOperator: "Mehmet Kaya (Forklift Operatörü)",
    lpnCode: "LPN-PAL-3392",
    notes: "Mal kabulü ve sağlamlık testi biten 60 adet seramik vazo C-01-01 palet rafına taşınıyor.",
    lines: [
      { id: "tl-4", itemId: "item-vaz-03", sku: "VAZ-ANT-03", itemName: "Antrasit Mat Seramik Vazo", expectedQty: 60, processedQty: 40, unit: "Adet", suggestedToBin: "C-01-01", actualBin: "C-01-01" }
    ],
    warehouse: { id: "wh-merkez-01", name: "Merkez Soğuk Hava Deposu", code: "DEP-MRK-01" }
  },
  {
    id: "task-04",
    taskNumber: "TSK-2026-092",
    workflowStage: "WAVE_PICK",
    warehouseId: "wh-merkez-01",
    sourceDocType: "SALES_WAVE",
    sourceDocNo: "WAVE-2026-M14",
    partnerName: "Trendyol & Shopify Konsolide Dalga",
    priority: "HIGH",
    status: "IN_PROGRESS",
    assignedOperator: "Canan Şahin (Dalga Toplama Uzmanı)",
    lpnCode: "LPN-CART-04",
    notes: "Bugün 15:00 kargo çıkışı için 18 adet pastel buket ve 8 adet VIP aranjman sepeti toplanıyor.",
    lines: [
      { id: "tl-5", itemId: "item-bkt-06", sku: "BKT-PST-06", itemName: "Pastel Rüya Bahar Buketi", expectedQty: 18, processedQty: 12, unit: "Adet", suggestedFromBin: "E-01-01" },
      { id: "tl-6", itemId: "item-arj-07", sku: "ARJ-VIP-07", itemName: "VIP Seramik Aranjmanı", expectedQty: 8, processedQty: 8, unit: "Adet", suggestedFromBin: "A-02-01" }
    ],
    warehouse: { id: "wh-merkez-01", name: "Merkez Soğuk Hava Deposu", code: "DEP-MRK-01" }
  },
  {
    id: "task-05",
    taskNumber: "TSK-2026-093",
    workflowStage: "PACKING",
    warehouseId: "wh-ecom-04",
    sourceDocType: "CUSTOMER_ORDER",
    sourceDocNo: "ORD-2026-8840",
    partnerName: "Koç Holding A.Ş. (Kurumsal Sipariş)",
    priority: "URGENT",
    status: "PENDING",
    assignedOperator: "Seda Aksoy (Lüks Paketleme Şefi)",
    lpnCode: "LPN-BOX-9912",
    notes: "Özel tebrik mektubu, mühürlü zarf ve ısı yalıtımlı VIP ambalaj kutulaması.",
    lines: [
      { id: "tl-7", itemId: "item-arj-07", sku: "ARJ-VIP-07", itemName: "VIP Seramik Aranjmanı", expectedQty: 4, processedQty: 0, unit: "Adet" }
    ],
    warehouse: { id: "wh-ecom-04", name: "E-Ticaret Deposu", code: "DEP-ECM-04" }
  }
]

export const MOCK_COUNT_SESSIONS: any[] = [
  {
    id: "count-01",
    sessionNumber: "KOR-SAY-2026-03",
    warehouseId: "wh-merkez-01",
    countType: "BLIND_CYCLE_COUNT",
    hideSystemQty: true,
    status: "ACTIVE_COUNTING",
    assignedCounters: "Murat Demir, Emre Tan",
    totalBinsCounted: 18,
    accuracyPercent: 99.4,
    totalVarianceValue: 450,
    warehouse: { id: "wh-merkez-01", name: "Merkez Soğuk Hava Deposu" },
    createdAt: getRelativeIso(-1)
  },
  {
    id: "count-02",
    sessionNumber: "KOR-SAY-2026-02",
    warehouseId: "wh-kadikoy-02",
    countType: "FULL_ANNUAL_COUNT",
    hideSystemQty: true,
    status: "RECONCILED",
    assignedCounters: "Selin Çelik, Seda Kara",
    totalBinsCounted: 8,
    accuracyPercent: 100,
    totalVarianceValue: 0,
    reconciledJournalNo: "JRN-WMS-2026-081",
    reconciledAt: getRelativeIso(-7),
    warehouse: { id: "wh-kadikoy-02", name: "Kadıköy Mağaza Deposu" },
    createdAt: getRelativeIso(-8)
  }
]

export const MOCK_TRANSFERS: any[] = [
  {
    id: "tr-01",
    orderNumber: "TRF-2026-042",
    fromWarehouseId: "wh-merkez-01",
    toWarehouseId: "wh-kadikoy-02",
    fromWarehouse: { name: "Merkez Soğuk Hava Deposu", code: "DEP-MRK-01" },
    toWarehouse: { name: "Kadıköy Mağaza Deposu", code: "DEP-KDK-02" },
    status: "IN_TRANSIT",
    vehiclePlate: "34 ER 9012 (Soğutuculu Sprinter)",
    driverName: "Cemil Çavuş",
    driverPhone: "0532 990 12 34",
    notes: "Mağaza haftasonu VIP siparişleri için taze kırmızı gül ve lilyum ikmali.",
    dispatchDate: getRelativeIso(0, 8, 30),
    createdAt: getRelativeIso(0, 8, 0),
    lines: [
      { id: "tl-01", itemId: "item-gul-01", item: { name: "Ekvator Kırmızı Gül", sku: "GUL-EKV-01", unit: "Demet" }, requestedQty: 30, shippedQty: 30, receivedQty: 0, unit: "Demet" },
      { id: "tl-02", itemId: "item-lil-02", item: { name: "Beyaz Kazablanka Lilyum", sku: "LIL-KAZ-02", unit: "Demet" }, requestedQty: 15, shippedQty: 15, receivedQty: 0, unit: "Demet" }
    ]
  },
  {
    id: "tr-02",
    orderNumber: "TRF-2026-039",
    fromWarehouseId: "wh-merkez-01",
    toWarehouseId: "wh-atolye-03",
    fromWarehouse: { name: "Merkez Soğuk Hava Deposu", code: "DEP-MRK-01" },
    toWarehouse: { name: "Tasarım Üretim Atölyesi", code: "DEP-ATL-03" },
    status: "APPROVED",
    vehiclePlate: "34 KL 3410",
    driverName: "Kadir Yıldırım",
    driverPhone: "0533 412 88 90",
    notes: "VIP aranjman üretim hattı için 25 adet seramik vazo ve 50 adet sünger transferi.",
    createdAt: getRelativeIso(-1),
    lines: [
      { id: "tl-03", itemId: "item-vaz-03", item: { name: "Antrasit Mat Seramik Vazo", sku: "VAZ-ANT-03", unit: "Adet" }, requestedQty: 25, shippedQty: 0, receivedQty: 0, unit: "Adet" },
      { id: "tl-04", itemId: "item-sng-04", item: { name: "Oasis İthal Çiçek Süngeri", sku: "SNG-OAS-04", unit: "Adet" }, requestedQty: 50, shippedQty: 0, receivedQty: 0, unit: "Adet" }
    ]
  }
]

// ─────────────────────────────────────────────────────────────────────────────
// 4. SATIN ALMA, DİNAMİK ROP & KONSİNYE EMANET STOK (PROCUREMENT)
// ─────────────────────────────────────────────────────────────────────────────

export const MOCK_PROCUREMENT_STATS = {
  totalCriticalItems: 3,
  stockoutItems: 1,
  belowRopItems: 2,
  pendingPrCount: 3,
  pendingPrTotalAmount: 184500,
  totalConsignmentValue: 342000,
  unbilledConsignmentPayable: 48600,
  activeSupplierCount: 4
}

export const MOCK_SUPPLIERS = [
  {
    id: "sup-holland-01",
    name: "Royal Flora Holland İthalat Konsorsiyumu",
    code: "SUP-FLORA-01",
    taxNumber: "8472910382",
    taxOffice: "Marmara Kurumlar",
    contactPerson: "Johan Van Der Berg / Arzu Kaya",
    email: "orders@royalfloraholland.com.tr",
    phone: "0212 465 88 00",
    address: "Atatürk Havalimanı Serbest Bölge A-12 Bakırköy / İstanbul",
    paymentTerms: "30 Gün Vadeli",
    leadTimeDays: 3,
    rating: 4.9,
    notes: "Ekvator gülü, Hollanda orkidesi ve egzotik kesme çiçek ithalatçısı"
  },
  {
    id: "sup-yalova-02",
    name: "Yalova Çiçekçilik & Kesme Gül Üreticileri Kooperatifi",
    code: "SUP-YALOVA-02",
    taxNumber: "9102837461",
    taxOffice: "Yalova Vergi Dairesi",
    contactPerson: "Mehmet Çiftçi (Başkan)",
    email: "kooperatif@yalovacicek.org.tr",
    phone: "0226 814 20 40",
    address: "Çınarcık Yolu Üzeri 4. Km Sera Bölgesi Yalova",
    paymentTerms: "Haftalık Peşin İskontolu",
    leadTimeDays: 2,
    rating: 4.7,
    notes: "Yerli kesme gül, lale, gerbera ve mevsimlik yeşillik tedariki"
  },
  {
    id: "sup-pasabahce-03",
    name: "Paşabahçe Cam & Seramik Endüstri A.Ş.",
    code: "SUP-PASA-03",
    taxNumber: "7263541890",
    taxOffice: "Büyük Mükellefler",
    contactPerson: "Levent Öztürk",
    email: "kurumsal@pasabahce.com.tr",
    phone: "0216 578 70 00",
    address: "İçmeler Mah. D-100 Cad. No:44 Tuzla / İstanbul",
    paymentTerms: "45 Gün Vadeli",
    leadTimeDays: 7,
    rating: 4.8,
    notes: "Özel tasarım seramik vazolar ve cam fanus ürünleri"
  },
  {
    id: "sup-ambalaj-04",
    name: "Matbaa & Ambalaj Dünyası San. Tic. Ltd.",
    code: "SUP-AMB-04",
    taxNumber: "6152439870",
    taxOffice: "Güneşli",
    contactPerson: "Derya Aydın",
    email: "siparis@ambalajdunyasi.com.tr",
    phone: "0212 654 30 20",
    address: "İkitelli OSB Triko Dokumacılar Sitesi M Blok Başakşehir / İstanbul",
    paymentTerms: "30 Gün Vadeli",
    leadTimeDays: 4,
    rating: 4.6,
    notes: "Lüks şapka kutuları, varak baskılı şeritler, kurdele ve tebrik kartları"
  }
]

export const MOCK_CRITICAL_ROP_ITEMS: any[] = [
  {
    id: "item-kut-09",
    sku: "KUT-LKS-09",
    name: "Gold Varaklı Silindir Şapka Kutusu (Büyük Boy)",
    category: "Kutu & Ambalaj",
    unit: "Adet",
    unitCost: 68,
    totalOnHand: 4,
    totalReserved: 4,
    availableQty: 0,
    onOrderQty: 0,
    avgDailyDemand: 6,
    leadTimeDays: 5,
    safetyStock: 12,
    reorderPointRop: 42,
    recommendedOrderQty: 80,
    status: "STOCKOUT",
    warehouseName: "Merkez Soğuk Hava Deposu",
    warehouseId: "wh-merkez-01"
  },
  {
    id: "item-krd-08",
    sku: "KRD-SAT-08",
    name: "Lüks Bordo İpek Saten Kurdele (40mm x 50m)",
    category: "Ambalaj & Süsleme",
    unit: "Rulo",
    unitCost: 78,
    totalOnHand: 8,
    totalReserved: 4,
    availableQty: 4,
    onOrderQty: 0,
    avgDailyDemand: 3,
    leadTimeDays: 3,
    safetyStock: 6,
    reorderPointRop: 15,
    recommendedOrderQty: 30,
    status: "CRITICAL_SAFETY",
    warehouseName: "Tasarım Üretim Atölyesi",
    warehouseId: "wh-atolye-03"
  },
  {
    id: "item-bkt-06",
    sku: "BKT-PST-06",
    name: "Pastel Rüya Bahar Buketi",
    category: "Buket & Aranjman",
    unit: "Adet",
    unitCost: 430,
    totalOnHand: 18,
    totalReserved: 8,
    availableQty: 10,
    onOrderQty: 10,
    avgDailyDemand: 7,
    leadTimeDays: 1,
    safetyStock: 7,
    reorderPointRop: 14,
    recommendedOrderQty: 25,
    status: "BELOW_ROP",
    warehouseName: "Kadıköy Mağaza Deposu",
    warehouseId: "wh-kadikoy-02"
  },
  {
    id: "item-gul-01",
    sku: "GUL-EKV-01",
    name: "Ekvator Kırmızı Gül (1. Kalite - 60cm)",
    category: "Kesme Çiçek",
    unit: "Demet",
    unitCost: 255,
    totalOnHand: 140,
    totalReserved: 25,
    availableQty: 115,
    onOrderQty: 100,
    avgDailyDemand: 22,
    leadTimeDays: 3,
    safetyStock: 25,
    reorderPointRop: 91,
    recommendedOrderQty: 150,
    status: "HEALTHY",
    warehouseName: "Merkez Soğuk Hava Deposu",
    warehouseId: "wh-merkez-01"
  }
]

export const MOCK_PURCHASE_REQUISITIONS: any[] = [
  {
    id: "pr-01",
    reqNumber: "SAT-2026-081",
    supplierName: "Matbaa & Ambalaj Dünyası San. Tic. Ltd.",
    triggerSource: "AUTO_ROP_TRIGGER",
    status: "PENDING_APPROVAL",
    priority: "URGENT",
    totalAmount: 18450,
    currency: "TRY",
    notes: "Gold varaklı şapka kutusu stokta tükendi. Dinamik ROP tetiklemesiyle otomatik satın alma talebi açıldı.",
    createdAt: getRelativeIso(0, 9, 15),
    warehouse: { name: "Merkez Soğuk Hava Deposu" },
    lines: [
      { id: "prl-01", itemId: "item-kut-09", sku: "KUT-LKS-09", itemName: "Gold Varaklı Silindir Şapka Kutusu", quantity: 80, unit: "Adet", estimatedCost: 68, totalCost: 5440 },
      { id: "prl-02", itemId: "item-krd-08", sku: "KRD-SAT-08", itemName: "Lüks Bordo İpek Saten Kurdele", quantity: 30, unit: "Rulo", estimatedCost: 78, totalCost: 2340 }
    ]
  },
  {
    id: "pr-02",
    reqNumber: "SAT-2026-079",
    supplierName: "Royal Flora Holland İthalat Konsorsiyumu",
    triggerSource: "AI_FORESIGHT",
    status: "APPROVED_PO_SENT",
    priority: "HIGH",
    totalAmount: 112000,
    currency: "TRY",
    approvedBy: "Sistem Yöneticisi (AI Onay)",
    notes: "Sevgililer Günü & Anneler Günü Foresight AI 30 günlük talep kestirimi için erken rezerve sipariş.",
    createdAt: getRelativeIso(-2),
    warehouse: { name: "Merkez Soğuk Hava Deposu" },
    lines: [
      { id: "prl-03", itemId: "item-gul-01", sku: "GUL-EKV-01", itemName: "Ekvator Kırmızı Gül", quantity: 300, unit: "Demet", estimatedCost: 260, totalCost: 78000 },
      { id: "prl-04", itemId: "item-ork-05", sku: "ORK-MOR-05", itemName: "Çift Dallı Premium Mor Orkide", quantity: 100, unit: "Adet", estimatedCost: 340, totalCost: 34000 }
    ]
  },
  {
    id: "pr-03",
    reqNumber: "SAT-2026-075",
    supplierName: "Paşabahçe Cam & Seramik Endüstri A.Ş.",
    triggerSource: "MANUAL_REQUEST",
    status: "RECEIVED",
    priority: "NORMAL",
    totalAmount: 54000,
    currency: "TRY",
    approvedBy: "Burak Yılmaz (Tasarım Koordinatörü)",
    notes: "VIP aranjman üretim hattı için 200 adet seramik vazo teslim alındı ve muayenesi tamamlandı.",
    createdAt: getRelativeIso(-6),
    warehouse: { name: "Merkez Soğuk Hava Deposu" },
    lines: [
      { id: "prl-05", itemId: "item-vaz-03", sku: "VAZ-ANT-03", itemName: "Antrasit Mat Seramik Vazo", quantity: 200, unit: "Adet", estimatedCost: 115, totalCost: 23000 }
    ]
  }
]

export const MOCK_CONSIGNMENT_STOCKS: any[] = [
  {
    id: "cs-01",
    agreementNo: "KSN-FLORA-2026-A1",
    supplierId: "sup-holland-01",
    itemId: "item-ork-05",
    warehouseId: "wh-merkez-01",
    binCode: "B-01-01",
    lotNumber: "LOT-CONSIGN-ORK-01",
    receivedConsignQty: 80,
    availableConsignQty: 45,
    consumedOrSoldQty: 35,
    agreedUnitCost: 320,
    commissionPercent: 12.5,
    unbilledPayableAmt: 11200,
    status: "ACTIVE",
    lastSettlementDate: getRelativeDateOnly(-5),
    item: { name: "Çift Dallı Premium Mor Orkide (Phalaenopsis)", sku: "ORK-MOR-05", baseUnit: "Adet" },
    supplier: { name: "Royal Flora Holland İthalat Konsorsiyumu", code: "SUP-FLORA-01" },
    warehouse: { name: "Merkez Soğuk Hava Deposu" }
  },
  {
    id: "cs-02",
    agreementNo: "KSN-YALOVA-2026-B4",
    supplierId: "sup-yalova-02",
    itemId: "item-gul-01",
    warehouseId: "wh-kadikoy-02",
    binCode: "M-01-01",
    lotNumber: "LOT-CONSIGN-GUL-02",
    receivedConsignQty: 200,
    availableConsignQty: 75,
    consumedOrSoldQty: 125,
    agreedUnitCost: 240,
    commissionPercent: 10.0,
    unbilledPayableAmt: 30000,
    status: "ACTIVE",
    lastSettlementDate: getRelativeDateOnly(-2),
    item: { name: "Ekvator Kırmızı Gül (1. Kalite - 60cm)", sku: "GUL-EKV-01", baseUnit: "Demet" },
    supplier: { name: "Yalova Çiçekçilik Kooperatifi", code: "SUP-YALOVA-02" },
    warehouse: { name: "Kadıköy Mağaza Deposu" }
  }
]

// ─────────────────────────────────────────────────────────────────────────────
// 5. OMNICHANNEL, PAZARYERLERİ & LOJİSTİK (OMNICHANNEL & E-DOC)
// ─────────────────────────────────────────────────────────────────────────────

export const MOCK_OMNICHANNEL_STATS = {
  connectedChannelsCount: 4,
  totalDailyOrders: 118,
  totalDailyRevenue: 189400,
  pendingRmaCount: 3,
  activeShipmentsCount: 14,
  averageSlaPercent: 99.2,
  totalPublishedStock: 2840
}

export const MOCK_SALES_CHANNELS = [
  {
    id: "ch-trendyol",
    code: "TRENDYOL",
    name: "Trendyol Kurumsal & B2C Pazaryeri",
    channelType: "MARKETPLACE",
    syncStatus: "CONNECTED",
    stockBufferPercent: 5.0,
    minStockThreshold: 2,
    syncedSkuCount: 12,
    dailyOrderCount: 48,
    dailyRevenue: 64800.0,
    webhookLatencyMs: 145,
    lastSyncAt: getRelativeIso(0, 11, 45)
  },
  {
    id: "ch-hepsiburada",
    code: "HEPSIBURADA",
    name: "Hepsiburada Kurumsal Mağaza",
    channelType: "MARKETPLACE",
    syncStatus: "CONNECTED",
    stockBufferPercent: 5.0,
    minStockThreshold: 2,
    syncedSkuCount: 10,
    dailyOrderCount: 32,
    dailyRevenue: 43200.0,
    webhookLatencyMs: 160,
    lastSyncAt: getRelativeIso(0, 11, 40)
  },
  {
    id: "ch-shopify",
    code: "SHOPIFY",
    name: "Sunum Çiçekçilik D2C Online Mağaza (Shopify)",
    channelType: "ECOMMERCE",
    syncStatus: "CONNECTED",
    stockBufferPercent: 0.0,
    minStockThreshold: 1,
    syncedSkuCount: 14,
    dailyOrderCount: 26,
    dailyRevenue: 59800.0,
    webhookLatencyMs: 85,
    lastSyncAt: getRelativeIso(0, 11, 50)
  },
  {
    id: "ch-b2b",
    code: "B2B_PORTAL",
    name: "Sunum ERP Kurumsal B2B Bayi Portalı",
    channelType: "B2B_PORTAL",
    syncStatus: "CONNECTED",
    stockBufferPercent: 0.0,
    minStockThreshold: 0,
    syncedSkuCount: 14,
    dailyOrderCount: 12,
    dailyRevenue: 21600.0,
    webhookLatencyMs: 25,
    lastSyncAt: getRelativeIso(0, 11, 52)
  }
]

export const MOCK_OMNICHANNEL_ORDERS: any[] = [
  {
    id: "ord-omni-01",
    orderNumber: "TY-2026-88192",
    channelCode: "TRENDYOL",
    channelOrderRef: "TY-ORD-9918231",
    customerName: "Zehra Bilgin",
    customerCity: "İstanbul / Beşiktaş",
    fulfillmentStrategy: "AUTO_ALLOCATION",
    status: "ALLOCATED",
    totalAmount: 1850.0,
    currency: "TRY",
    backorderQty: 0,
    orderDate: getRelativeIso(0, 10, 15),
    shipmentLines: [
      {
        id: "osl-01",
        sku: "ARJ-VIP-07",
        itemName: "VIP Antrasit Seramik Gül & Lilyum Aranjmanı",
        quantity: 1,
        shippedQty: 0,
        unitPrice: 1850.0,
        carrierName: "Kolay Gelsin Aynı Gün Kurye",
        carrierTracking: "KG-992102-VIP",
        status: "RESERVED"
      }
    ]
  },
  {
    id: "ord-omni-02",
    orderNumber: "SP-2026-0418",
    channelCode: "SHOPIFY",
    channelOrderRef: "SH-10492",
    customerName: "Mehmet Can Özdemir",
    customerCity: "Ankara / Çankaya",
    fulfillmentStrategy: "SPLIT_SHIPMENT",
    status: "PARTIALLY_SHIPPED",
    totalAmount: 2800.0,
    currency: "TRY",
    backorderQty: 0,
    orderDate: getRelativeIso(0, 9, 30),
    shipmentLines: [
      {
        id: "osl-02",
        sku: "BKT-PST-06",
        itemName: "Pastel Rüya Bahar Buketi",
        quantity: 2,
        shippedQty: 2,
        unitPrice: 950.0,
        carrierName: "Yurtiçi Kargo VIP",
        carrierTracking: "YK-88291048",
        status: "SHIPPED"
      },
      {
        id: "osl-03",
        sku: "ORK-MOR-05",
        itemName: "Çift Dallı Premium Mor Orkide",
        quantity: 1,
        shippedQty: 0,
        unitPrice: 900.0,
        carrierName: "Yurtiçi Kargo VIP",
        status: "RESERVED"
      }
    ]
  },
  {
    id: "ord-omni-03",
    orderNumber: "HB-2026-3391",
    channelCode: "HEPSIBURADA",
    channelOrderRef: "HB-998214",
    customerName: "Aylin Keskin",
    customerCity: "İzmir / Karşıyaka",
    fulfillmentStrategy: "AUTO_ALLOCATION",
    status: "SHIPPED",
    totalAmount: 950.0,
    currency: "TRY",
    backorderQty: 0,
    eInvoiceNo: "GIB202600000412",
    eWaybillNo: "IRS202600000881",
    orderDate: getRelativeIso(-1, 14, 20),
    shipmentLines: [
      {
        id: "osl-04",
        sku: "BKT-PST-06",
        itemName: "Pastel Rüya Bahar Buketi",
        quantity: 1,
        shippedQty: 1,
        unitPrice: 950.0,
        carrierName: "Aras Kargo Ekspres",
        carrierTracking: "ARAS-7749102",
        status: "DELIVERED"
      }
    ]
  },
  {
    id: "ord-omni-04",
    orderNumber: "B2B-2026-009",
    channelCode: "B2B_PORTAL",
    channelOrderRef: "B2B-REF-0091",
    customerName: "Hilton Bomonti Hotel (Kurumsal B2B)",
    customerCity: "İstanbul / Şişli",
    fulfillmentStrategy: "MULTI_WAREHOUSE_FULFILLMENT",
    status: "ALLOCATED",
    totalAmount: 14800.0,
    currency: "TRY",
    backorderQty: 0,
    orderDate: getRelativeIso(0, 8, 45),
    shipmentLines: [
      {
        id: "osl-05",
        sku: "ARJ-VIP-07",
        itemName: "VIP Antrasit Seramik Gül & Lilyum Aranjmanı",
        quantity: 8,
        shippedQty: 0,
        unitPrice: 1850.0,
        carrierName: "Özel VIP Şirket Aracı (34 ER 9012)",
        status: "RESERVED"
      }
    ]
  }
]

export const MOCK_RMA_RETURNS: any[] = [
  {
    id: "rma-01",
    rmaNumber: "RMA-2026-021",
    orderNumber: "TY-2026-87102",
    channelCode: "TRENDYOL",
    customerName: "Pelin Vural",
    sku: "VAZ-ANT-03",
    itemName: "Antrasit Mat Seramik Vazo (25cm)",
    returnQty: 1,
    returnReason: "Kargo Taşıma Esnasında Kırık / Hasarlı Geldi",
    qcInspectionResult: "QUARANTINE_REPAIR",
    targetWarehouseId: "wh-merkez-01",
    targetBinCode: "D-QC-01",
    refundAmount: 280.0,
    refundStatus: "APPROVED",
    returnTrackingNo: "YK-RET-99210",
    createdAt: getRelativeIso(-1)
  },
  {
    id: "rma-02",
    rmaNumber: "RMA-2026-018",
    orderNumber: "SP-2026-0391",
    channelCode: "SHOPIFY",
    customerName: "Emirhan Çetin",
    sku: "ORK-MOR-05",
    itemName: "Çift Dallı Premium Mor Orkide",
    returnQty: 1,
    returnReason: "Müşteri Vazgeçti / Adreste Bulunamadı",
    qcInspectionResult: "RESTOCK_TO_BIN",
    targetWarehouseId: "wh-merkez-01",
    targetBinCode: "B-01-01",
    refundAmount: 750.0,
    refundStatus: "COMPLETED",
    returnTrackingNo: "KG-RET-33109",
    createdAt: getRelativeIso(-3)
  }
]

export const MOCK_LOGISTICS_ADAPTERS: any[] = [
  {
    id: "log-yurtici",
    providerCode: "YURTICI",
    providerName: "Yurtiçi Kargo VIP Entegrasyonu",
    adapterType: "REST_API_V2",
    status: "ACTIVE",
    apiEndpoint: "https://ws.yurticikargo.com/v2/soap-rest-bridge",
    supportsZplLabel: true,
    supportsColdChain: true,
    avgDeliveryDays: 1.2,
    baseRateTry: 65.0,
    activeShipments: 8,
    slaSuccessPercent: 99.4
  },
  {
    id: "log-aras",
    providerCode: "ARAS",
    providerName: "Aras Kargo Ekspres Soğuk Zincir",
    adapterType: "REST_API",
    status: "ACTIVE",
    apiEndpoint: "https://integration.araskargo.com.tr/api/shipping",
    supportsZplLabel: true,
    supportsColdChain: true,
    avgDeliveryDays: 1.4,
    baseRateTry: 58.0,
    activeShipments: 4,
    slaSuccessPercent: 98.7
  },
  {
    id: "log-kolaygelsin",
    providerCode: "KOLAYGELSIN",
    providerName: "Kolay Gelsin Aynı Gün Randevulu Kurye",
    adapterType: "GRAPHQL_WEBHOOK",
    status: "ACTIVE",
    apiEndpoint: "https://api.kolaygelsin.com/graphql",
    supportsZplLabel: true,
    supportsColdChain: true,
    avgDeliveryDays: 0.5,
    baseRateTry: 95.0,
    activeShipments: 2,
    slaSuccessPercent: 99.8
  }
]

export const MOCK_EDOCUMENTS: any[] = [
  {
    id: "edoc-01",
    ettnUuid: "c18f8b22-8392-4f32-bb91-9a7381273910",
    documentNo: "IRS202600000881",
    documentType: "E_IRSALIYE",
    profileId: "TEMELIRSALIYE",
    relatedOrderNo: "HB-2026-3391",
    receiverTitle: "Aylin Keskin",
    receiverVknTckn: "34829104820",
    receiverTaxOffice: "Karşıyaka V.D.",
    dispatchDate: getRelativeIso(-1, 14, 30),
    carrierName: "Aras Kargo Ekspres",
    vehiclePlate: "34 ARAS 912",
    driverName: "Cemal Kaya",
    totalNetAmount: 791.67,
    totalVatAmount: 158.33,
    totalGrossAmount: 950.0,
    currency: "TRY",
    gibStatusCode: "200",
    gibStatusText: "1300 - GİB Başarıyla Alındı ve İmzalandı"
  },
  {
    id: "edoc-02",
    ettnUuid: "d29a9c33-9403-5e43-cc02-0b8492384021",
    documentNo: "GIB202600000412",
    documentType: "E_FATURA",
    profileId: "TICARIFATURA",
    relatedOrderNo: "B2B-2026-009",
    receiverTitle: "Hilton Bomonti Hotel İşletmeciliği A.Ş.",
    receiverVknTckn: "4620194829",
    receiverTaxOffice: "Şişli V.D.",
    dispatchDate: getRelativeIso(0, 9, 0),
    carrierName: "Özel VIP Şirket Aracı",
    vehiclePlate: "34 ER 9012",
    driverName: "Kemal Demirtaş",
    totalNetAmount: 12333.33,
    totalVatAmount: 2466.67,
    totalGrossAmount: 14800.0,
    currency: "TRY",
    gibStatusCode: "200",
    gibStatusText: "1300 - GİB Başarıyla Alındı ve İmzalandı"
  }
]

// ─────────────────────────────────────────────────────────────────────────────
// 6. FORESIGHT AI & AKILLI TAHMİNLEME (INVENTORY AI & ANALYTICS)
// ─────────────────────────────────────────────────────────────────────────────

export const MOCK_EXECUTIVE_BANNER = {
  headline: "Foresight AI: 3 Üründe Kritik Stok Riski & Sevgililer Günü Talep Artışı",
  description: "Gold Varaklı Şapka Kutusu ve Lüks İpek Kurdele tükenme sınırında. Royal Flora Holland tedarikçisine otomatik PO oluşturulması önerilmektedir.",
  criticalTopItem: {
    itemId: "item-kut-09",
    sku: "KUT-LKS-09",
    name: "Gold Varaklı Silindir Şapka Kutusu (Büyük Boy)",
    availableQty: 0,
    minStockLevel: 20,
    unit: "Adet",
    unitCostTry: 68
  },
  recommendedActionText: "Tek Tıkla +80 Adet Satın Alma Siparişi Aç",
  potentialLossTry: 48600
}

export const MOCK_DEMAND_FORECASTS = [
  {
    id: "fc-01",
    itemId: "item-gul-01",
    sku: "GUL-EKV-01",
    itemName: "Ekvator Kırmızı Gül (1. Kalite - 60cm)",
    unit: "Demet",
    unitCostTry: 255,
    currentAvailable: 115,
    minStockLevel: 25,
    dailyAvgDemand: 22.4,
    forecast30d: 680,
    recommendedOrderQty: 150,
    confidenceScore: 94,
    trendDirection: "UP" as const,
    seasonalityEffect: "Önümüzdeki Sevgililer Günü & Anneler Günü dönemi nedeniyle talep %45 yükseliş trendinde.",
    projectedStockoutDays: 5,
    suggestedReorderDate: getRelativeDateOnly(2)
  },
  {
    id: "fc-02",
    itemId: "item-kut-09",
    sku: "KUT-LKS-09",
    itemName: "Gold Varaklı Silindir Şapka Kutusu (Büyük Boy)",
    unit: "Adet",
    unitCostTry: 68,
    currentAvailable: 0,
    minStockLevel: 20,
    dailyAvgDemand: 6.2,
    forecast30d: 190,
    recommendedOrderQty: 80,
    confidenceScore: 91,
    trendDirection: "UP" as const,
    seasonalityEffect: "Kurumsal VIP siparişlerin artmasıyla tükenme gerçekleşti. Acil sipariş şart.",
    projectedStockoutDays: 0,
    suggestedReorderDate: getRelativeDateOnly(0)
  },
  {
    id: "fc-03",
    itemId: "item-krd-08",
    sku: "KRD-SAT-08",
    itemName: "Lüks Bordo İpek Saten Kurdele (40mm x 50m)",
    unit: "Rulo",
    unitCostTry: 78,
    currentAvailable: 4,
    minStockLevel: 15,
    dailyAvgDemand: 2.8,
    forecast30d: 85,
    recommendedOrderQty: 30,
    confidenceScore: 88,
    trendDirection: "STABLE" as const,
    seasonalityEffect: "Haftalık tüketim hızı güvenlik stok eşiğini aştı, 1 gün içinde tedarik önerilir.",
    projectedStockoutDays: 1,
    suggestedReorderDate: getRelativeDateOnly(1)
  },
  {
    id: "fc-04",
    itemId: "item-ork-05",
    sku: "ORK-MOR-05",
    itemName: "Çift Dallı Premium Mor Orkide (Phalaenopsis)",
    unit: "Adet",
    unitCostTry: 335,
    currentAvailable: 26,
    minStockLevel: 15,
    dailyAvgDemand: 3.5,
    forecast30d: 110,
    recommendedOrderQty: 50,
    confidenceScore: 96,
    trendDirection: "UP" as const,
    seasonalityEffect: "Kurumsal hediye gönderimleri stabil artışta. Konsinye stok ikmali öneriliyor.",
    projectedStockoutDays: 7,
    suggestedReorderDate: getRelativeDateOnly(4)
  }
]

export const MOCK_NARRATIVE_REPORTS = [
  {
    id: "rep-01",
    reportDate: getRelativeDateOnly(0),
    reportType: "WEEKLY_EXECUTIVE",
    title: "Haftalık C-Level Stok Değerleme & Tedarik Zinciri Raporu",
    executiveSummary: "Şirket aktif stok değeri ₺1,485,250 seviyesindedir. Toplam 10 aktif SKU'dan 3'ü dinamik ROP sınırının altına inmiştir. Ortalama sipariş karşılama oranı (OTIF) %99.2 olarak gerçekleşmiştir.",
    criticalRisks: [
      "Gold Varaklı Şapka Kutusu stoğu tükendi; bekleyen 4 adet VIP aranjman siparişinin sevk edilmesini geciktirebilir.",
      "Lüks Bordo Kurdele rezervasyonları mevcut stoğun %50'sini bağlamış durumdadır."
    ],
    growthOpportunities: [
      "Royal Flora Holland ile konsinye orkide anlaşması konsinye marjını %12.5 seviyesine çıkararak nakit akışını rahatlattı.",
      "Trendyol ve Shopify canlı stok tamponu %5 olarak ayarlandı, aşırı satma (overselling) sıfıra indirildi."
    ],
    financialImpactTry: 82400,
    createdAt: getRelativeIso(0, 8, 0)
  },
  {
    id: "rep-02",
    reportDate: getRelativeDateOnly(-7),
    reportType: "MONTHLY_VALUATION",
    title: "Aylık FIFO Maliyet Katmanı & Depo Doluluk Analizi",
    executiveSummary: "Tuzla Merkez Depo doluluk oranı %76, Kadıköy Mağaza Deposu %80 olarak ölçülmüştür. Enflasyonist ortamda FIFO değerleme yöntemi sayesinde brüt kâr marjı %41.8 seviyesinde optimize edilmiştir.",
    criticalRisks: [
      "Kesme çiçek grubunda ortalama raf ömrü 14 gün olup, SKT yaklaşan 2 parti ürün hızlı indirimle B2B kanalına yönlendirilmiştir."
    ],
    growthOpportunities: [
      "Merkez depodan Kadıköy mağazasına günlük taze transfer hattı (DEP-MRK -> DEP-KDK) fire oranını %3.2'den %1.1'e düşürdü."
    ],
    financialImpactTry: 145000,
    createdAt: getRelativeIso(-7, 8, 0)
  }
]

export const MOCK_DEFAULT_AMA_RESULT = {
  question: "Hangi ürünlerde kritik stok (ROP altı) ve tükenme riski var?",
  intentDetected: "CRITICAL_STOCK_INQUIRY",
  executionTimeMs: 42,
  summaryText: "Veritabanında analiz edilen 10 SKU içerisinden 3 ürün kritik eşiğin altındadır: 'Gold Varaklı Şapka Kutusu' tamamen tükenmiş durumdadır (0 Adet). 'Lüks Bordo Kurdele' 4 rulo ile güvenlik stoğu altındadır. 'Pastel Rüya Bahar Buketi' ise ROP eşiğindedir.",
  matchedItems: [
    { sku: "KUT-LKS-09", name: "Gold Varaklı Silindir Şapka Kutusu", available: 0, status: "TÜKENDİ (0 Adet)", action: "Acil +80 Adet PO Açılmalı" },
    { sku: "KRD-SAT-08", name: "Lüks Bordo İpek Saten Kurdele", available: 4, status: "KRİTİK (4 Rulo)", action: "+30 Rulo Sipariş Verilmeli" },
    { sku: "BKT-PST-06", name: "Pastel Rüya Bahar Buketi", available: 10, status: "ROP ALTI (10 Adet)", action: "Atölye Üretim Emri Verilmeli" }
  ],
  recommendedAction: "Satın alma taleplerini tek tıkla onaylayıp tedarikçilere otomatik PO e-postası gönderebilirsiniz."
}

