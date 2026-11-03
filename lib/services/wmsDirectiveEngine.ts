/**
 * FAZ 2: İleri Seviye Depo Yönetim Sistemi (WMS) Motoru
 * - Çok Katmanlı Depo Adresleme (Zone -> Koridor -> Raf -> Kat -> Bin/Hücre)
 * - Lokasyon Direktifleri (FEFO, FIFO, ABC Hız Sınıfı, Soğuk Zincir, Konsolidasyon)
 * - Mal Kabul -> Kalite Kontrol (QC) -> Put-away -> Wave Picking -> Paketleme İş Akışları
 * - Depolar Arası Transfer Emirleri ve Lisans Plakalı (LPN) Konteyner/Palet Takibi
 * - Tam Sayım, Döngüsel Sayım (Smart Count) ve Kör Sayım (Blind Count) + Otomatik Fark Mahsuplaşma
 */

export interface WmsStorageBin {
  id: string
  warehouseId: string
  warehouseCode: string
  zoneCode: string
  zoneName: string
  zoneType: "RECEIVING" | "QC" | "FAST_PICK" | "BULK_STORAGE" | "COLD_STORAGE" | "QUARANTINE" | "PACKING"
  binCode: string // Ör: IST-Z2-A01-R02-L01-B01
  aisle: string
  rack: string
  level: string
  position: string
  abcVelocity: "A" | "B" | "C"
  temperatureRange: string
  maxWeightKg: number
  currentWeightKg: number
  maxVolumeM3: number
  currentVolumeM3: number
  occupancyPercent: number
  storedSku?: string
  storedItemName?: string
  storedQty?: number
  storedLot?: string
  lpnCode?: string
  isBlocked: boolean
  blockReason?: string
}

export interface WmsLocationDirectiveRule {
  id: string
  priority: number
  name: string
  directiveType: "PUTAWAY" | "PICK" | "REPLENISH"
  warehouseCode: string
  abcClassFilter: string
  requiresColdChain: boolean
  strategy: "FEFO_FIRST" | "FIFO_FIRST" | "ABC_VELOCITY_ZONE" | "CONSOLIDATE_EXISTING_SKU" | "EMPTY_BIN_LOW_LEVEL"
  targetZoneCode: string
  isActive: boolean
}

export interface WmsOperationTask {
  id: string
  taskNumber: string
  workflowStage: "GOODS_RECEIPT" | "QC_INSPECTION" | "PUTAWAY" | "WAVE_PICK" | "PACKING"
  waveNumber?: string
  warehouseCode: string
  warehouseName: string
  sourceDocNo: string
  partnerName: string
  priority: "LOW" | "NORMAL" | "HIGH" | "URGENT"
  status: "PENDING" | "IN_PROGRESS" | "QC_HOLD" | "COMPLETED"
  assignedOperator: string
  lpnCode: string
  sku: string
  itemName: string
  lotNumber: string
  expiryDate?: string
  expectedQty: number
  processedQty: number
  unit: string
  suggestedFromBin: string
  suggestedToBin: string
  directiveApplied: string
  createdAt: string
}

export interface WmsLicensePlateRecord {
  id: string
  lpnCode: string
  containerType: "PALLET_EUR" | "PLASTIC_TOTE" | "MASTER_CARTON" | "ROLL_CAGE"
  warehouseCode: string
  currentBinCode: string
  parentLpnCode?: string
  status: "ACTIVE" | "SEALED" | "IN_TRANSIT" | "SHIPPED"
  rfidTagEpc: string
  totalWeightKg: number
  items: Array<{
    sku: string
    name: string
    lotNumber: string
    qty: number
    unit: string
  }>
  updatedAt: string
}

export interface WmsTransferOrderRecord {
  id: string
  transferNumber: string
  fromWarehouseCode: string
  fromWarehouseName: string
  toWarehouseCode: string
  toWarehouseName: string
  status: "APPROVED" | "PICKED" | "IN_TRANSIT" | "RECEIVED" | "DISCREPANCY"
  lpnCode: string
  carrierName: string
  vehiclePlate: string
  driverName: string
  sku: string
  itemName: string
  lotNumber: string
  sentQty: number
  receivedQty: number
  unit: string
  unitCost: number
  shippedAt: string
}

export interface WmsCountLineItem {
  id: string
  sku: string
  itemName: string
  binCode: string
  lotNumber: string
  lpnCode?: string
  systemQty: number
  countedQty: number | null
  varianceQty: number
  unitCost: number
  varianceAmountTry: number
  scanMethod: "BARCODE" | "QR" | "RFID_WAVE" | "MANUAL"
}

export interface WmsCountSessionRecord {
  id: string
  sessionNumber: string
  warehouseCode: string
  warehouseName: string
  zoneFilter: string
  countType: "FULL_COUNT" | "CYCLE_SMART_COUNT" | "BLIND_COUNT"
  hideSystemQty: boolean
  status: "IN_PROGRESS" | "PENDING_APPROVAL" | "RECONCILED"
  assignedCounter: string
  accuracyPercent: number
  totalVarianceValueTry: number
  reconciledJournalNo?: string
  reconciledAt?: string
  lines: WmsCountLineItem[]
}

export const INITIAL_WMS_BINS: WmsStorageBin[] = [
  {
    id: "bin-01",
    warehouseId: "wh-ist-main",
    warehouseCode: "DEP-IST-01",
    zoneCode: "Z1-MAL-KABUL",
    zoneName: "Mal Kabul & Kalite Kontrol Alanı",
    zoneType: "RECEIVING",
    binCode: "IST-Z1-RCV-DOCK-01",
    aisle: "DOCK",
    rack: "R01",
    level: "L01",
    position: "B01",
    abcVelocity: "A",
    temperatureRange: "+18°C / +22°C",
    maxWeightKg: 2500,
    currentWeightKg: 980,
    maxVolumeM3: 6.0,
    currentVolumeM3: 2.4,
    occupancyPercent: 40,
    storedSku: "MTX-PRO-JACKET-NVY-M",
    storedItemName: "Endüstriyel Pro-Shield Mont — Gece Mavisi / M",
    storedQty: 84,
    storedLot: "LOT-2610-C9",
    lpnCode: "LPN-TR-2026-00911",
    isBlocked: false
  },
  {
    id: "bin-02",
    warehouseId: "wh-ist-main",
    warehouseCode: "DEP-IST-01",
    zoneCode: "Z2-HIZLI-TOPLAMA",
    zoneName: "A Sınıfı Hızlı Sipariş Toplama Koridoru",
    zoneType: "FAST_PICK",
    binCode: "IST-Z2-A01-R02-L01-B01",
    aisle: "A01",
    rack: "R02",
    level: "L01",
    position: "B01",
    abcVelocity: "A",
    temperatureRange: "+18°C / +22°C",
    maxWeightKg: 1200,
    currentWeightKg: 920,
    maxVolumeM3: 2.4,
    currentVolumeM3: 1.9,
    occupancyPercent: 79,
    storedSku: "MTX-PRO-JACKET-NVY-M",
    storedItemName: "Endüstriyel Pro-Shield Mont — Gece Mavisi / M",
    storedQty: 120,
    storedLot: "LOT-2609-A1",
    lpnCode: "LPN-TR-2026-00840",
    isBlocked: false
  },
  {
    id: "bin-03",
    warehouseId: "wh-ist-main",
    warehouseCode: "DEP-IST-01",
    zoneCode: "Z2-HIZLI-TOPLAMA",
    zoneName: "A Sınıfı Hızlı Sipariş Toplama Koridoru",
    zoneType: "FAST_PICK",
    binCode: "IST-Z2-A01-R02-L01-B02",
    aisle: "A01",
    rack: "R02",
    level: "L01",
    position: "B02",
    abcVelocity: "A",
    temperatureRange: "+18°C / +22°C",
    maxWeightKg: 1200,
    currentWeightKg: 1010,
    maxVolumeM3: 2.4,
    currentVolumeM3: 2.05,
    occupancyPercent: 85,
    storedSku: "MTX-PRO-JACKET-NVY-L",
    storedItemName: "Endüstriyel Pro-Shield Mont — Gece Mavisi / L",
    storedQty: 130,
    storedLot: "LOT-2610-B4",
    lpnCode: "LPN-TR-2026-00842",
    isBlocked: false
  },
  {
    id: "bin-04",
    warehouseId: "wh-ist-main",
    warehouseCode: "DEP-IST-01",
    zoneCode: "Z2-HIZLI-TOPLAMA",
    zoneName: "Elektronik & Seri Takipli Yüksek Güvenlikli Raf",
    zoneType: "FAST_PICK",
    binCode: "IST-Z2-A03-R01-L02-B01",
    aisle: "A03",
    rack: "R01",
    level: "L02",
    position: "B01",
    abcVelocity: "A",
    temperatureRange: "+18°C / +20°C",
    maxWeightKg: 600,
    currentWeightKg: 340,
    maxVolumeM3: 1.5,
    currentVolumeM3: 0.85,
    occupancyPercent: 57,
    storedSku: "WMS-HHT-X900",
    storedItemName: "SunumTech X900 Endüstriyel 2D & RFID El Terminali",
    storedQty: 54,
    storedLot: "LOT-X900-01",
    lpnCode: "LPN-TR-2026-00890",
    isBlocked: false
  },
  {
    id: "bin-05",
    warehouseId: "wh-gebze-cold",
    warehouseCode: "DEP-GBZ-04",
    zoneCode: "Z3-SOGUK-ZINCIR",
    zoneName: "Gebze +2°C/+6°C Soğuk Hava & FEFO Hücresi",
    zoneType: "COLD_STORAGE",
    binCode: "GBZ-Z3-C01-R01-L01-B02",
    aisle: "C01",
    rack: "R01",
    level: "L01",
    position: "B02",
    abcVelocity: "A",
    temperatureRange: "+2°C / +6°C",
    maxWeightKg: 1500,
    currentWeightKg: 1120,
    maxVolumeM3: 3.0,
    currentVolumeM3: 2.2,
    occupancyPercent: 73,
    storedSku: "BIO-THERM-GEL-5L",
    storedItemName: "BioTherm Soğuk Zincir Faz Değişim Jeli (5L)",
    storedQty: 118,
    storedLot: "LOT-BIO-2608",
    lpnCode: "LPN-TR-2026-00901",
    isBlocked: false
  },
  {
    id: "bin-06",
    warehouseId: "wh-ist-main",
    warehouseCode: "DEP-IST-01",
    zoneCode: "Z4-KARANTINA",
    zoneName: "Kalite Kontrol Red / Blokeli Karantina Kafesi",
    zoneType: "QUARANTINE",
    binCode: "IST-Z4-KARANTINA-B01",
    aisle: "Q01",
    rack: "R01",
    level: "L01",
    position: "B01",
    abcVelocity: "C",
    temperatureRange: "+18°C / +22°C",
    maxWeightKg: 800,
    currentWeightKg: 180,
    maxVolumeM3: 2.0,
    currentVolumeM3: 0.45,
    occupancyPercent: 22,
    storedSku: "MTX-PRO-JACKET",
    storedItemName: "Endüstriyel Pro-Shield Mont (QC Test Bekleyen)",
    storedQty: 10,
    storedLot: "LOT-2610-Q1",
    lpnCode: "LPN-TR-2026-00919",
    isBlocked: true,
    blockReason: "QC Numune Basınç Testi Devam Ediyor (Toplamaya Kapalı)"
  }
]

export const INITIAL_LOCATION_DIRECTIVES: WmsLocationDirectiveRule[] = [
  {
    id: "dir-01",
    priority: 1,
    name: "Soğuk Zincir & SKT Hassas Ürünler → +2/+6°C Soğuk Hücrelere (Put-away)",
    directiveType: "PUTAWAY",
    warehouseCode: "DEP-GBZ-04",
    abcClassFilter: "A,B",
    requiresColdChain: true,
    strategy: "FEFO_FIRST",
    targetZoneCode: "Z3-SOGUK-ZINCIR",
    isActive: true
  },
  {
    id: "dir-02",
    priority: 2,
    name: "A Sınıfı Hızlı Dönen Ürünler → Alt Kat (L01) Hızlı Toplama Koridoruna (Put-away)",
    directiveType: "PUTAWAY",
    warehouseCode: "DEP-IST-01",
    abcClassFilter: "A",
    requiresColdChain: false,
    strategy: "ABC_VELOCITY_ZONE",
    targetZoneCode: "Z2-HIZLI-TOPLAMA",
    isActive: true
  },
  {
    id: "dir-03",
    priority: 1,
    name: "SKT'li Ürünlerde İlk Son Kullanma Tarihli Lotu Önce Topla (FEFO Pick)",
    directiveType: "PICK",
    warehouseCode: "DEP-GBZ-04",
    abcClassFilter: "A,B,C",
    requiresColdChain: true,
    strategy: "FEFO_FIRST",
    targetZoneCode: "Z3-SOGUK-ZINCIR",
    isActive: true
  },
  {
    id: "dir-04",
    priority: 2,
    name: "Standart Sipariş Toplamada En Eski Girişli Katmanı Öner (FIFO Wave Pick)",
    directiveType: "PICK",
    warehouseCode: "DEP-IST-01",
    abcClassFilter: "A,B",
    requiresColdChain: false,
    strategy: "FIFO_FIRST",
    targetZoneCode: "Z2-HIZLI-TOPLAMA",
    isActive: true
  }
]

export const INITIAL_WMS_TASKS: WmsOperationTask[] = [
  {
    id: "wtask-01",
    taskNumber: "WMS-RCV-2026-104",
    workflowStage: "GOODS_RECEIPT",
    warehouseCode: "DEP-IST-01",
    warehouseName: "Tuzla Merkez Akıllı Lojistik & WMS Üssü",
    sourceDocNo: "PO-2026-0891",
    partnerName: "Impinj & Arrow Electronics Tedarik",
    priority: "HIGH",
    status: "IN_PROGRESS",
    assignedOperator: "Murat Karahan",
    lpnCode: "LPN-TR-2026-00925",
    sku: "CMP-UHF-IMPINJ-E710",
    itemName: "Impinj E710 UHF RFID Okuyucu Modül Çipi",
    lotNumber: "LOT-IMP-11",
    expectedQty: 100,
    processedQty: 75,
    unit: "Adet",
    suggestedFromBin: "TEDARİKÇİ-TIR-PERON-1",
    suggestedToBin: "IST-Z1-RCV-DOCK-01",
    directiveApplied: "Mal Kabul Peron Eşleştirme",
    createdAt: "2026-11-03 09:15"
  },
  {
    id: "wtask-02",
    taskNumber: "WMS-QC-2026-105",
    workflowStage: "QC_INSPECTION",
    warehouseCode: "DEP-GBZ-04",
    warehouseName: "Gebze Soğuk Zincir & SKT Hassas Hammadde Deposu",
    sourceDocNo: "GRN-2026-1102",
    partnerName: "Korozo & BioChem Endüstriyel A.Ş.",
    priority: "URGENT",
    status: "IN_PROGRESS",
    assignedOperator: "Kimyager Selin Aydın",
    lpnCode: "LPN-TR-2026-00928",
    sku: "BIO-THERM-GEL-5L",
    itemName: "BioTherm Soğuk Zincir Faz Değişim Jeli (5L)",
    lotNumber: "LOT-BIO-2611",
    expiryDate: "2027-05-03",
    expectedQty: 50,
    processedQty: 50,
    unit: "Bidon",
    suggestedFromBin: "GBZ-Z1-QC-BENCH",
    suggestedToBin: "GBZ-Z3-C01-R01-L01-B02",
    directiveApplied: "Soğuk Zincir Termal & SKT Doğrulama",
    createdAt: "2026-11-03 10:05"
  },
  {
    id: "wtask-03",
    taskNumber: "WMS-PUT-2026-106",
    workflowStage: "PUTAWAY",
    warehouseCode: "DEP-IST-01",
    warehouseName: "Tuzla Merkez Akıllı Lojistik & WMS Üssü",
    sourceDocNo: "GRN-2026-1088",
    partnerName: "Kordsa & Akın Tekstil",
    priority: "NORMAL",
    status: "PENDING",
    assignedOperator: "Burak Şahin",
    lpnCode: "LPN-TR-2026-00911",
    sku: "MTX-PRO-JACKET-NVY-M",
    itemName: "Endüstriyel Pro-Shield Mont — Gece Mavisi / M",
    lotNumber: "LOT-2610-C9",
    expectedQty: 84,
    processedQty: 0,
    unit: "Adet",
    suggestedFromBin: "IST-Z1-RCV-DOCK-01",
    suggestedToBin: "IST-Z2-A01-R02-L01-B01",
    directiveApplied: "Direktif #2: A Sınıfı Hızlı Toplama Koridoru (L01)",
    createdAt: "2026-11-03 11:20"
  },
  {
    id: "wtask-04",
    taskNumber: "WMS-PCK-2026-107",
    workflowStage: "WAVE_PICK",
    waveNumber: "WAVE-2026-1103-A1",
    warehouseCode: "DEP-IST-01",
    warehouseName: "Tuzla Merkez Akıllı Lojistik & WMS Üssü",
    sourceDocNo: "ORD-2026-884 / ORD-2026-885",
    partnerName: "Koç Holding A.Ş. & Trendyol Kurumsal",
    priority: "URGENT",
    status: "IN_PROGRESS",
    assignedOperator: "Hakan Çelik",
    lpnCode: "LPN-TR-2026-00890",
    sku: "WMS-HHT-X900",
    itemName: "SunumTech X900 Endüstriyel 2D & RFID El Terminali",
    lotNumber: "LOT-X900-01",
    expectedQty: 14,
    processedQty: 10,
    unit: "Adet",
    suggestedFromBin: "IST-Z2-A03-R01-L02-B01",
    suggestedToBin: "IST-Z5-PACK-STATION-02",
    directiveApplied: "Direktif #4: FIFO Dalga Toplama (En Eski Katman)",
    createdAt: "2026-11-03 12:10"
  },
  {
    id: "wtask-05",
    taskNumber: "WMS-PAK-2026-108",
    workflowStage: "PACKING",
    waveNumber: "WAVE-2026-1103-A1",
    warehouseCode: "DEP-IST-01",
    warehouseName: "Tuzla Merkez Akıllı Lojistik & WMS Üssü",
    sourceDocNo: "ORD-2026-880",
    partnerName: "Ziraat Bankası A.Ş.",
    priority: "HIGH",
    status: "COMPLETED",
    assignedOperator: "Cemre Yıldız",
    lpnCode: "LPN-TR-2026-00930",
    sku: "MTX-PRO-JACKET-NVY-L",
    itemName: "Endüstriyel Pro-Shield Mont — Gece Mavisi / L",
    lotNumber: "LOT-2610-B4",
    expectedQty: 24,
    processedQty: 24,
    unit: "Adet",
    suggestedFromBin: "IST-Z5-PACK-STATION-01",
    suggestedToBin: "SEVKIYAT-UPS-PERON-3",
    directiveApplied: "Çeki Listesi & SSCC-18 Palet Barkodu Basıldı",
    createdAt: "2026-11-03 13:00"
  }
]

export const INITIAL_LICENSE_PLATES: WmsLicensePlateRecord[] = [
  {
    id: "lpn-01",
    lpnCode: "LPN-TR-2026-00840",
    containerType: "PALLET_EUR",
    warehouseCode: "DEP-IST-01",
    currentBinCode: "IST-Z2-A01-R02-L01-B01",
    status: "ACTIVE",
    rfidTagEpc: "3034257BF400000000000840",
    totalWeightKg: 148.5,
    items: [
      { sku: "MTX-PRO-JACKET-NVY-M", name: "Endüstriyel Pro-Shield Mont — Gece Mavisi / M", lotNumber: "LOT-2609-A1", qty: 120, unit: "Adet" }
    ],
    updatedAt: "2026-11-03 10:30"
  },
  {
    id: "lpn-02",
    lpnCode: "LPN-TR-2026-00890",
    containerType: "PLASTIC_TOTE",
    warehouseCode: "DEP-IST-01",
    currentBinCode: "IST-Z2-A03-R01-L02-B01",
    parentLpnCode: "LPN-TR-2026-00800-MASTER",
    status: "ACTIVE",
    rfidTagEpc: "3034991AA100000000000890",
    totalWeightKg: 43.2,
    items: [
      { sku: "WMS-HHT-X900", name: "SunumTech X900 Endüstriyel 2D & RFID El Terminali", lotNumber: "LOT-X900-01", qty: 54, unit: "Adet" }
    ],
    updatedAt: "2026-11-03 12:15"
  },
  {
    id: "lpn-03",
    lpnCode: "LPN-TR-2026-00901",
    containerType: "PALLET_EUR",
    warehouseCode: "DEP-GBZ-04",
    currentBinCode: "GBZ-Z3-C01-R01-L01-B02",
    status: "SEALED",
    rfidTagEpc: "3034882CC200000000000901",
    totalWeightKg: 615.0,
    items: [
      { sku: "BIO-THERM-GEL-5L", name: "BioTherm Soğuk Zincir Faz Değişim Jeli (5L)", lotNumber: "LOT-BIO-2608", qty: 118, unit: "Bidon" }
    ],
    updatedAt: "2026-11-03 11:00"
  }
]

export const INITIAL_TRANSFER_ORDERS: WmsTransferOrderRecord[] = [
  {
    id: "trf-01",
    transferNumber: "TRF-2026-0318",
    fromWarehouseCode: "DEP-IST-01",
    fromWarehouseName: "Tuzla Merkez Akıllı Lojistik Üssü",
    toWarehouseCode: "DEP-KDK-02",
    toWarehouseName: "Kadıköy Mağaza & Hızlı Teslimat Deposu",
    status: "IN_TRANSIT",
    lpnCode: "LPN-TR-2026-00915",
    carrierName: "İç Filo Express Ring-2",
    vehiclePlate: "34 SNR 482",
    driverName: "Kemal Öztürk",
    sku: "MTX-PRO-JACKET-NVY-M",
    itemName: "Endüstriyel Pro-Shield Mont — Gece Mavisi / M",
    lotNumber: "LOT-2610-B4",
    sentQty: 25,
    receivedQty: 0,
    unit: "Adet",
    unitCost: 1495,
    shippedAt: "2026-11-03 08:45"
  },
  {
    id: "trf-02",
    transferNumber: "TRF-2026-0315",
    fromWarehouseCode: "DEP-IST-01",
    fromWarehouseName: "Tuzla Merkez Akıllı Lojistik Üssü",
    toWarehouseCode: "DEP-ANK-03",
    toWarehouseName: "Ankara İç Anadolu Bölge Dağıtım Merkezi",
    status: "RECEIVED",
    lpnCode: "LPN-TR-2026-00877",
    carrierName: "Yurtiçi Lojistik Kurumsal Hat",
    vehiclePlate: "06 ANK 904",
    driverName: "Orhan Kaya",
    sku: "WMS-HHT-X900",
    itemName: "SunumTech X900 Endüstriyel 2D & RFID El Terminali",
    lotNumber: "LOT-X900-02",
    sentQty: 12,
    receivedQty: 12,
    unit: "Adet",
    unitCost: 14800,
    shippedAt: "2026-11-01 14:00"
  }
]

export const INITIAL_COUNT_SESSIONS: WmsCountSessionRecord[] = [
  {
    id: "cnt-session-01",
    sessionNumber: "CNT-2026-BLIND-09",
    warehouseCode: "DEP-IST-01",
    warehouseName: "Tuzla Merkez Akıllı Lojistik & WMS Üssü",
    zoneFilter: "Z2-HIZLI-TOPLAMA",
    countType: "BLIND_COUNT",
    hideSystemQty: true,
    status: "PENDING_APPROVAL",
    assignedCounter: "Saha Ekibi (Barkod & RFID)",
    accuracyPercent: 98.1,
    totalVarianceValueTry: -4485,
    lines: [
      {
        id: "cntl-1",
        sku: "MTX-PRO-JACKET-NVY-M",
        itemName: "Endüstriyel Pro-Shield Mont — Gece Mavisi / M",
        binCode: "IST-Z2-A01-R02-L01-B01",
        lotNumber: "LOT-2609-A1",
        lpnCode: "LPN-TR-2026-00840",
        systemQty: 120,
        countedQty: 117,
        varianceQty: -3,
        unitCost: 1495,
        varianceAmountTry: -4485,
        scanMethod: "RFID_WAVE"
      },
      {
        id: "cntl-2",
        sku: "WMS-HHT-X900",
        itemName: "SunumTech X900 Endüstriyel 2D & RFID El Terminali",
        binCode: "IST-Z2-A03-R01-L02-B01",
        lotNumber: "LOT-X900-01",
        lpnCode: "LPN-TR-2026-00890",
        systemQty: 54,
        countedQty: 54,
        varianceQty: 0,
        unitCost: 14850,
        varianceAmountTry: 0,
        scanMethod: "BARCODE"
      }
    ]
  },
  {
    id: "cnt-session-02",
    sessionNumber: "CNT-2026-SMART-08",
    warehouseCode: "DEP-GBZ-04",
    warehouseName: "Gebze Soğuk Zincir & SKT Hassas Hammadde Deposu",
    zoneFilter: "Z3-SOGUK-ZINCIR",
    countType: "CYCLE_SMART_COUNT",
    hideSystemQty: false,
    status: "RECONCILED",
    assignedCounter: "Gökhan Arslan",
    accuracyPercent: 100,
    totalVarianceValueTry: 1280,
    reconciledJournalNo: "MAH-FIN-2026-0412",
    reconciledAt: "2026-10-31 17:45",
    lines: [
      {
        id: "cntl-3",
        sku: "BIO-THERM-GEL-5L",
        itemName: "BioTherm Soğuk Zincir Faz Değişim Jeli (5L)",
        binCode: "GBZ-Z3-C01-R01-L01-B02",
        lotNumber: "LOT-BIO-2608",
        lpnCode: "LPN-TR-2026-00901",
        systemQty: 116,
        countedQty: 118,
        varianceQty: 2,
        unitCost: 640,
        varianceAmountTry: 1280,
        scanMethod: "QR"
      }
    ]
  }
]

