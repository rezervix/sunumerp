/**
 * Sunum ERP – Üretim Modülleri Canlı Demo Veri Seti (Mock Production Data)
 * 
 * Bu dosya, Public Demo (Vercel) ortamında tüm üretim ekranlarının (BOM & Rota,
 * MRP & MPS, İş Emirleri, Kapasite, Kalite Kontrol, Bakım/TPM, Terminal ve
 * Konsolide Yönetim Paneli) dolu, canlı ve zengin kurumsal verilerle çalışmasını sağlar.
 * 
 * Gerçek müşteri ve veritabanı kayıtlarına ASLA karışmaz (Pure in-memory mock).
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
// 1. İŞ MERKEZLERİ & İSTASYONLAR (WORK CENTERS)
// ─────────────────────────────────────────────────────────────────────────────

export const MOCK_WORK_CENTERS = [
  {
    id: "wc-01",
    code: "WC-BUDAMA",
    name: "Çiçek Hazırlık, Budama & Nemlendirme İstasyonu",
    type: "MANUAL_STATION",
    capacityHours: 80,
    allocatedHours: 68,
    utilizationRate: 85,
    status: "ACTIVE",
    isBottleneck: false,
    costPerHour: 320,
    operatorsCount: 4,
    description: "Hammadde kesme çiçeklerin tanzim öncesi soğuk şoklama ve sap temizliği.",
  },
  {
    id: "wc-02",
    code: "WC-TANZIM",
    name: "VIP Aranjman & Tasarım Atölyesi (Ana Hat)",
    type: "ASSEMBLY_LINE",
    capacityHours: 120,
    allocatedHours: 110.4,
    utilizationRate: 92,
    status: "ACTIVE",
    isBottleneck: true,
    costPerHour: 480,
    operatorsCount: 6,
    description: "Seramik vazo, sünger sabitleme ve usta tasarımcı buket bağlama hattı.",
  },
  {
    id: "wc-03",
    code: "WC-SOK",
    name: "İklimlendirme & Ozonlu Sisleme Odası",
    type: "MACHINE",
    capacityHours: 168,
    allocatedHours: 107.5,
    utilizationRate: 64,
    status: "ACTIVE",
    isBottleneck: false,
    costPerHour: 180,
    operatorsCount: 1,
    description: "Tamamlanan lüks aranjmanların sevkiyat öncesi tazelik koruma odası.",
  },
  {
    id: "wc-04",
    code: "WC-PAKET",
    name: "Lüks Ambalaj, Kurdele & Kalite İstasyonu",
    type: "MANUAL_STATION",
    capacityHours: 80,
    allocatedHours: 60.8,
    utilizationRate: 76,
    status: "ACTIVE",
    isBottleneck: false,
    costPerHour: 280,
    operatorsCount: 3,
    description: "Özel tebrik kartı, ithal mühürleme, koruyucu ambalaj ve son kontrol.",
  },
]

// ─────────────────────────────────────────────────────────────────────────────
// 2. ÜRÜN REÇETELERİ (BOM) & ROTALAR
// ─────────────────────────────────────────────────────────────────────────────

export const MOCK_BOMS = [
  {
    id: "bom-001",
    code: "BOM-ARJ-01",
    name: "Premium VIP Seramik Aranjman Reçetesi",
    revision: "01",
    status: "APPROVED",
    finishedItemId: "item-arj-07",
    finishedItemCode: "ARJ-VIP-07",
    finishedItemName: "Premium VIP Seramik Aranjman (Reçeteli)",
    baseQuantity: 1,
    baseUnit: "Adet",
    yieldPercent: 98,
    totalMaterialCost: 850,
    totalLaborCost: 220,
    totalOverheadCost: 80,
    totalTheoreticalCost: 1150,
    approvedAt: getRelativeIso(-15),
    approvedBy: "Baş Tasarımcı",
    notes: "Kurumsal VIP protokol teslimatları için onaylı reçete.",
    isActive: true,
    createdAt: getRelativeIso(-30),
    updatedAt: getRelativeIso(-15),
    components: [
      {
        id: "comp-101",
        bomId: "bom-001",
        componentItemId: "item-gul-01",
        componentItemCode: "GUL-EKV-01",
        componentItemName: "Ekvator Kırmızı Gül (1. Kalite - 60cm)",
        componentItemType: "RAW_MATERIAL",
        lineNumber: 1,
        quantity: 12,
        unit: "Demet",
        unitCost: 250,
        scrapPercent: 2,
        isPhantom: false,
        notes: "Dikenleri ayıklanmış, tam açmamış taze gonca.",
        substitutes: [],
      },
      {
        id: "comp-102",
        bomId: "bom-001",
        componentItemId: "item-lil-02",
        componentItemCode: "LIL-KAZ-02",
        componentItemName: "Beyaz Kazablanka Lilyum (Kokulu)",
        componentItemType: "RAW_MATERIAL",
        lineNumber: 2,
        quantity: 5,
        unit: "Dal",
        unitCost: 65,
        scrapPercent: 0,
        isPhantom: false,
        notes: "Polen keseleri temizlenmiş.",
        substitutes: [],
      },
      {
        id: "comp-103",
        bomId: "bom-001",
        componentItemId: "item-vaz-03",
        componentItemCode: "VAZ-ANT-03",
        componentItemName: "İthal Mat Antrasit Seramik Vazo (25cm)",
        componentItemType: "RAW_MATERIAL",
        lineNumber: 3,
        quantity: 1,
        unit: "Adet",
        unitCost: 180,
        scrapPercent: 0,
        isPhantom: false,
        notes: "Su sızdırmazlık testinden geçmiş vazo.",
        substitutes: [],
      },
      {
        id: "comp-104",
        bomId: "bom-001",
        componentItemId: "item-sng-04",
        componentItemCode: "SNG-OAS-04",
        componentItemName: "Oasis Islak Çiçek Süngeri (20'li Koli)",
        componentItemType: "CONSUMABLE",
        lineNumber: 4,
        quantity: 0.5,
        unit: "Adet",
        unitCost: 35,
        scrapPercent: 5,
        isPhantom: false,
        notes: "Bitki besinli suda en az 30 dk doyrulmuş.",
        substitutes: [],
      },
    ],
  },
  {
    id: "bom-002",
    code: "BOM-BKT-02",
    name: "Gelin Buketi - Romantik Pastel Tasarım Reçetesi",
    revision: "02",
    status: "APPROVED",
    finishedItemId: "item-bkt-parent-06",
    finishedItemCode: "BKT-PST-06",
    finishedItemName: "Gelin Buketi - Romantik Pastel (Tasarım Serisi)",
    baseQuantity: 1,
    baseUnit: "Buket",
    yieldPercent: 100,
    totalMaterialCost: 620,
    totalLaborCost: 280,
    totalOverheadCost: 50,
    totalTheoreticalCost: 950,
    approvedAt: getRelativeIso(-10),
    approvedBy: "Kreatif Direktör",
    notes: "Özel ithal saten kurdele sarımlı düğün koleksiyonu.",
    isActive: true,
    createdAt: getRelativeIso(-20),
    updatedAt: getRelativeIso(-10),
    components: [
      {
        id: "comp-201",
        bomId: "bom-002",
        componentItemId: "item-gul-01",
        componentItemCode: "GUL-EKV-01",
        componentItemName: "Ekvator Kırmızı Gül (1. Kalite - 60cm)",
        componentItemType: "RAW_MATERIAL",
        lineNumber: 1,
        quantity: 15,
        unit: "Adet",
        unitCost: 25,
        scrapPercent: 0,
        isPhantom: false,
        notes: null,
        substitutes: [],
      },
      {
        id: "comp-202",
        bomId: "bom-002",
        componentItemId: "item-lil-02",
        componentItemCode: "LIL-KAZ-02",
        componentItemName: "Beyaz Kazablanka Lilyum (Kokulu)",
        componentItemType: "RAW_MATERIAL",
        lineNumber: 2,
        quantity: 3,
        unit: "Dal",
        unitCost: 65,
        scrapPercent: 0,
        isPhantom: false,
        notes: null,
        substitutes: [],
      },
    ],
  },
  {
    id: "bom-003",
    code: "BOM-ORK-03",
    name: "Lüks Çift Dal Orkide Saksı Tanzim Reçetesi",
    revision: "01",
    status: "APPROVED",
    finishedItemId: "item-ork-05",
    finishedItemCode: "ORK-MOR-05",
    finishedItemName: "Mor Phalaenopsis Orkide (Çift Dal)",
    baseQuantity: 1,
    baseUnit: "Saksı",
    yieldPercent: 100,
    totalMaterialCost: 420,
    totalLaborCost: 110,
    totalOverheadCost: 40,
    totalTheoreticalCost: 570,
    approvedAt: getRelativeIso(-25),
    approvedBy: "Ziraat Mühendisi",
    notes: "Doğal çam kabuğu ve dekoratif yosun dolgusu.",
    isActive: true,
    createdAt: getRelativeIso(-40),
    updatedAt: getRelativeIso(-25),
    components: [
      {
        id: "comp-301",
        bomId: "bom-003",
        componentItemId: "item-ork-05",
        componentItemCode: "ORK-MOR-05",
        componentItemName: "Mor Phalaenopsis Orkide (Çift Dal)",
        componentItemType: "FINISHED_GOOD",
        lineNumber: 1,
        quantity: 1,
        unit: "Saksı",
        unitCost: 420,
        scrapPercent: 0,
        isPhantom: false,
        notes: "En az 8 açmış kandil çiçekli.",
        substitutes: [],
      },
    ],
  },
]

export const MOCK_ROUTINGS = [
  {
    id: "rt-001",
    code: "ROTA-ARJ-01",
    name: "VIP Seramik Aranjman Standart Üretim Rotası",
    finishedItemId: "item-arj-07",
    finishedItemName: "Premium VIP Seramik Aranjman (Reçeteli)",
    bomId: "bom-001",
    status: "APPROVED",
    isActive: true,
    operations: [
      {
        id: "op-1",
        operationSequence: 10,
        operationName: "Çiçek Budama & Nemlendirme",
        workCenterId: "wc-01",
        workCenter: { id: "wc-01", name: "Çiçek Hazırlık & Budama İstasyonu", code: "WC-BUDAMA" },
        setupTimeMinutes: 5,
        runTimeMinutes: 15,
        laborHours: 0.33,
        machineHours: 0,
        hourlyCost: 320,
      },
      {
        id: "op-2",
        operationSequence: 20,
        operationName: "Vazo Sünger Sabitleme & Taban Tanzimi",
        workCenterId: "wc-02",
        workCenter: { id: "wc-02", name: "VIP Aranjman & Tasarım Atölyesi", code: "WC-TANZIM" },
        setupTimeMinutes: 5,
        runTimeMinutes: 25,
        laborHours: 0.5,
        machineHours: 0,
        hourlyCost: 480,
      },
      {
        id: "op-3",
        operationSequence: 30,
        operationName: "Tazelik Koruma & Ozon Odası Dinlendirme",
        workCenterId: "wc-03",
        workCenter: { id: "wc-03", name: "İklimlendirme & Ozonlu Sisleme Odası", code: "WC-SOK" },
        setupTimeMinutes: 2,
        runTimeMinutes: 30,
        laborHours: 0.1,
        machineHours: 0.5,
        hourlyCost: 180,
      },
      {
        id: "op-4",
        operationSequence: 40,
        operationName: "Lüks Ambalaj, Tebrik Kartı & Kalite Onayı",
        workCenterId: "wc-04",
        workCenter: { id: "wc-04", name: "Lüks Ambalaj & Kalite İstasyonu", code: "WC-PAKET" },
        setupTimeMinutes: 3,
        runTimeMinutes: 10,
        laborHours: 0.22,
        machineHours: 0,
        hourlyCost: 280,
      },
    ],
  },
]

// ─────────────────────────────────────────────────────────────────────────────
// 3. İŞ EMİRLERİ (WORK ORDERS) & ATÖLYE İCRA
// ─────────────────────────────────────────────────────────────────────────────

export const MOCK_WORK_ORDERS = [
  {
    id: "wo-001",
    workOrderNumber: "WO-2026-084",
    itemId: "item-arj-07",
    item: {
      id: "item-arj-07",
      sku: "ARJ-VIP-07",
      name: "Premium VIP Seramik Aranjman (Reçeteli)",
      baseUnit: "Adet",
    },
    bomId: "bom-001",
    plannedQuantity: 20,
    producedQuantity: 14,
    scrapQuantity: 0,
    unit: "Adet",
    status: "IN_PROGRESS",
    priority: "URGENT",
    warehouseId: "wh-merkez-01",
    productionWarehouseId: "wh-merkez-01",
    plannedStartDate: getRelativeIso(-1, 8, 30),
    plannedDueDate: getRelativeIso(0, 18, 0),
    lotNumber: "LOT-ARJ-26084",
    theoreticalTotalCost: 23000,
    actualTotalCost: 16100,
    costVariance: 0,
    notes: "Koç Holding 2026 Kurumsal Etkinlik Protokol Siparişi.",
    operations: [
      { id: "wo-op-1", operationNumber: 10, name: "Sap Budama & Nem Dengeleme", status: "COMPLETED", workCenterName: "WC-BUDAMA", plannedDurationMinutes: 300, actualDurationMinutes: 280 },
      { id: "wo-op-2", operationNumber: 20, name: "Seramik Vazo Tanzimi", status: "RUNNING", workCenterName: "WC-TANZIM", plannedDurationMinutes: 500, actualDurationMinutes: 320 },
      { id: "wo-op-3", operationNumber: 30, name: "Sisleme & Soğuk Şoklama", status: "PENDING", workCenterName: "WC-SOK", plannedDurationMinutes: 600, actualDurationMinutes: 0 },
      { id: "wo-op-4", operationNumber: 40, name: "Lüks Paketleme & Son Kontrol", status: "PENDING", workCenterName: "WC-PAKET", plannedDurationMinutes: 200, actualDurationMinutes: 0 },
    ],
    materials: [
      { itemId: "item-gul-01", sku: "GUL-EKV-01", name: "Ekvator Kırmızı Gül", plannedQuantity: 240, consumedQuantity: 168, unit: "Demet", unitCost: 250 },
      { itemId: "item-lil-02", sku: "LIL-KAZ-02", name: "Beyaz Kazablanka Lilyum", plannedQuantity: 100, consumedQuantity: 70, unit: "Dal", unitCost: 65 },
      { itemId: "item-vaz-03", sku: "VAZ-ANT-03", name: "Mat Antrasit Seramik Vazo", plannedQuantity: 20, consumedQuantity: 14, unit: "Adet", unitCost: 180 },
    ],
  },
  {
    id: "wo-002",
    workOrderNumber: "WO-2026-085",
    itemId: "item-bkt-parent-06",
    item: {
      id: "item-bkt-parent-06",
      sku: "BKT-PST-06",
      name: "Gelin Buketi - Romantik Pastel",
      baseUnit: "Buket",
    },
    bomId: "bom-002",
    plannedQuantity: 12,
    producedQuantity: 0,
    scrapQuantity: 0,
    unit: "Buket",
    status: "RELEASED",
    priority: "HIGH",
    warehouseId: "wh-merkez-01",
    productionWarehouseId: "wh-merkez-01",
    plannedStartDate: getRelativeIso(1, 9, 0),
    plannedDueDate: getRelativeIso(2, 16, 0),
    lotNumber: "LOT-BKT-26085",
    theoreticalTotalCost: 11400,
    actualTotalCost: 0,
    costVariance: 0,
    notes: "Hammadde tahsisatı ve saten kurdele rezervasyonu tamamlandı.",
    operations: [
      { id: "wo-op-21", operationNumber: 10, name: "Gül Sap Soyma & Spiral Dizim", status: "PENDING", workCenterName: "WC-TANZIM", plannedDurationMinutes: 240, actualDurationMinutes: 0 },
      { id: "wo-op-22", operationNumber: 20, name: "Saten Kurdele Sarımı & Ambalaj", status: "PENDING", workCenterName: "WC-PAKET", plannedDurationMinutes: 120, actualDurationMinutes: 0 },
    ],
    materials: [
      { itemId: "item-gul-01", sku: "GUL-EKV-01", name: "Ekvator Kırmızı Gül", plannedQuantity: 180, consumedQuantity: 0, unit: "Adet", unitCost: 25 },
    ],
  },
  {
    id: "wo-003",
    workOrderNumber: "WO-2026-083",
    itemId: "item-ork-05",
    item: {
      id: "item-ork-05",
      sku: "ORK-MOR-05",
      name: "Mor Phalaenopsis Orkide (Çift Dal)",
      baseUnit: "Saksı",
    },
    bomId: "bom-003",
    plannedQuantity: 30,
    producedQuantity: 30,
    scrapQuantity: 1,
    unit: "Saksı",
    status: "COMPLETED",
    priority: "NORMAL",
    warehouseId: "wh-merkez-01",
    productionWarehouseId: "wh-merkez-01",
    plannedStartDate: getRelativeIso(-3, 8, 0),
    plannedDueDate: getRelativeIso(-1, 17, 0),
    lotNumber: "LOT-ORK-26083",
    theoreticalTotalCost: 17100,
    actualTotalCost: 17350,
    costVariance: 250,
    notes: "Tamamlandı. Kalite kontrol onayı alındı ve merkez depoya teslim edildi.",
    operations: [],
    materials: [],
  },
  {
    id: "wo-004",
    workOrderNumber: "WO-2026-086",
    itemId: "item-arj-07",
    item: {
      id: "item-arj-07",
      sku: "ARJ-VIP-07",
      name: "Premium VIP Seramik Aranjman (Reçeteli)",
      baseUnit: "Adet",
    },
    bomId: "bom-001",
    plannedQuantity: 10,
    producedQuantity: 0,
    scrapQuantity: 0,
    unit: "Adet",
    status: "PLANNED",
    priority: "NORMAL",
    warehouseId: "wh-merkez-01",
    productionWarehouseId: "wh-merkez-01",
    plannedStartDate: getRelativeIso(3, 8, 0),
    plannedDueDate: getRelativeIso(4, 18, 0),
    lotNumber: "LOT-ARJ-26086",
    theoreticalTotalCost: 11500,
    actualTotalCost: 0,
    costVariance: 0,
    notes: "Haftalık planlı kurumsal aranjman üretimi.",
    operations: [],
    materials: [],
  },
]

export const MOCK_WORK_ORDER_DASHBOARD = {
  totalWorkOrders: 24,
  inProgressCount: 5,
  plannedCount: 8,
  completedCount: 11,
  totalPlannedQty: 480,
  totalProducedQty: 412,
  averageOee: 89.4,
  onTimeDeliveryRate: 97.2,
  recentOrders: MOCK_WORK_ORDERS,
}

// ─────────────────────────────────────────────────────────────────────────────
// 4. ATÖLYE TERMİNALİ (SHOP FLOOR TERMINAL DATA)
// ─────────────────────────────────────────────────────────────────────────────

export const MOCK_TERMINAL_DATA = {
  activeWorkCenters: MOCK_WORK_CENTERS,
  activeOperations: [
    {
      id: "term-op-1",
      workOrderNumber: "WO-2026-084",
      operationNumber: 20,
      operationName: "Seramik Vazo Tanzimi & Çiçek Dizilimi",
      workCenterName: "VIP Aranjman & Tasarım Atölyesi (WC-TANZIM)",
      productName: "Premium VIP Seramik Aranjman (Reçeteli)",
      plannedQuantity: 20,
      completedQuantity: 14,
      status: "RUNNING",
      operatorName: "Mustafa Usta (Kıdemli Çiçek Tasarımcısı)",
      startedAt: getRelativeIso(0, 8, 45),
      elapsedMinutes: 215,
      isPaused: false,
    },
    {
      id: "term-op-2",
      workOrderNumber: "WO-2026-084",
      operationNumber: 30,
      operationName: "İklimlendirme & Sisleme Odası Hazırlık",
      workCenterName: "İklimlendirme Odası (WC-SOK)",
      productName: "Premium VIP Seramik Aranjman (Reçeteli)",
      plannedQuantity: 20,
      completedQuantity: 0,
      status: "PENDING",
      operatorName: "Atölye Otomasyon Ekibi",
      startedAt: null,
      elapsedMinutes: 0,
      isPaused: false,
    },
  ],
  recentTerminalActivities: [
    { id: "act-1", time: "11:42", operator: "Mustafa Usta", text: "WO-2026-084: 4 adet tamamlandı (Parti 2/5)" },
    { id: "act-2", time: "10:15", operator: "Ayşe Çelik", text: "WC-BUDAMA: 240 demet gül temizliği tamamlandı." },
    { id: "act-3", time: "09:30", operator: "Sistem", text: "WO-2026-085 iş emri hammadde tahsisi onaylandı." },
  ],
}

// ─────────────────────────────────────────────────────────────────────────────
// 5. KAPASİTE YÖNETİMİ & GANTT (CAPACITY)
// ─────────────────────────────────────────────────────────────────────────────

export const MOCK_CAPACITY_OVERVIEW = {
  workCenters: MOCK_WORK_CENTERS,
  metrics: {
    overallUtilization: 82.5,
    bottleneckCount: 1,
    totalAvailableHours: 448,
    totalPlannedHours: 369.7,
    overloadedStations: ["WC-TANZIM"],
  },
}

export const MOCK_CAPACITY_GANTT = {
  ganttTasks: [
    {
      id: "gantt-1",
      workOrderId: "wo-001",
      title: "WO-2026-084 (VIP Aranjman)",
      workCenterId: "wc-01",
      workCenterCode: "WC-BUDAMA",
      startDate: getRelativeIso(-1, 8, 0),
      endDate: getRelativeIso(0, 12, 0),
      progress: 100,
      status: "COMPLETED",
    },
    {
      id: "gantt-2",
      workOrderId: "wo-001",
      title: "WO-2026-084 (VIP Tanzim Montajı)",
      workCenterId: "wc-02",
      workCenterCode: "WC-TANZIM",
      startDate: getRelativeIso(0, 8, 30),
      endDate: getRelativeIso(0, 17, 30),
      progress: 68,
      status: "RUNNING",
    },
    {
      id: "gantt-3",
      workOrderId: "wo-002",
      title: "WO-2026-085 (Gelin Buketi)",
      workCenterId: "wc-02",
      workCenterCode: "WC-TANZIM",
      startDate: getRelativeIso(1, 9, 0),
      endDate: getRelativeIso(1, 15, 0),
      progress: 0,
      status: "PLANNED",
    },
    {
      id: "gantt-4",
      workOrderId: "wo-001",
      title: "WO-2026-084 (Lüks Paketleme & QC)",
      workCenterId: "wc-04",
      workCenterCode: "WC-PAKET",
      startDate: getRelativeIso(0, 16, 0),
      endDate: getRelativeIso(0, 18, 0),
      progress: 0,
      status: "PLANNED",
    },
  ],
}

// ─────────────────────────────────────────────────────────────────────────────
// 6. KALİTE GÜVENCE & FIRE (QUALITY & AQL)
// ─────────────────────────────────────────────────────────────────────────────

export const MOCK_QUALITY_OVERVIEW = {
  stats: {
    totalInspections: 64,
    passedCount: 61,
    conditionalCount: 2,
    rejectedCount: 1,
    passRate: 95.3,
    activeNcrs: 1,
    activeCalibrations: 4,
    averageDpm: 125, // Defects per million
  },
}

export const MOCK_QUALITY_INSPECTIONS = [
  {
    id: "ins-01",
    inspectionNumber: "INS-2026-081",
    inspectionType: "RECEIVING",
    itemId: "item-gul-01",
    item: { id: "item-gul-01", sku: "GUL-EKV-01", name: "Ekvator Kırmızı Gül (1. Kalite - 60cm)" },
    supplierName: "Ekvator Flora Direct Ltd.",
    batchQuantity: 500,
    sampleQuantity: 32,
    status: "PASSED",
    totalDefects: 0,
    isStockBlocked: false,
    inspectorUserId: "qc-lead-01",
    inspectionDate: getRelativeIso(-2, 10, 30),
    decisionNotes: "AQL 1.5 Seviye II standardına göre 32 demet incelendi. Sıfır kusur tespit edildi, parti KABUL edildi.",
    results: [
      { id: "qir-1", characteristicName: "Gonca Çapı & Açıklık", characteristicType: "VARIABLE", nominalValue: 55, measuredValue: 54.2, isConforming: true },
      { id: "qir-2", characteristicName: "Sap Sertliği ve Diken Düzeyi", characteristicType: "ATTRIBUTE", isAttributePassed: true, isConforming: true },
      { id: "qir-3", characteristicName: "Yaprak Sararması / Botrytis Mantarı", characteristicType: "ATTRIBUTE", isAttributePassed: true, isConforming: true },
    ],
  },
  {
    id: "ins-02",
    inspectionNumber: "INS-2026-082",
    inspectionType: "FINAL",
    itemId: "item-arj-07",
    item: { id: "item-arj-07", sku: "ARJ-VIP-07", name: "Premium VIP Seramik Aranjman" },
    workOrderId: "wo-001",
    batchQuantity: 20,
    sampleQuantity: 5,
    status: "PASSED",
    totalDefects: 0,
    isStockBlocked: false,
    inspectorUserId: "qc-lead-01",
    inspectionDate: getRelativeIso(0, 11, 15),
    decisionNotes: "Seramik sızdırmazlık, çiçek su seviyesi ve estetik form standartlara uygun.",
    results: [
      { id: "qir-4", characteristicName: "Vazo Su Sızdırmazlık Testi", characteristicType: "ATTRIBUTE", isAttributePassed: true, isConforming: true },
      { id: "qir-5", characteristicName: "Aranjman Simetrisi & Denge", characteristicType: "ATTRIBUTE", isAttributePassed: true, isConforming: true },
    ],
  },
  {
    id: "ins-03",
    inspectionNumber: "INS-2026-079",
    inspectionType: "RECEIVING",
    itemId: "item-sng-04",
    item: { id: "item-sng-04", sku: "SNG-OAS-04", name: "Oasis Islak Çiçek Süngeri" },
    supplierName: "Smithers Oasis Türkiye",
    batchQuantity: 100,
    sampleQuantity: 13,
    status: "CONDITIONAL",
    totalDefects: 1,
    isStockBlocked: false,
    inspectorUserId: "qc-lead-01",
    inspectionDate: getRelativeIso(-5, 14, 0),
    decisionNotes: "Kutulardan birinde hafif nem kaybı görüldü. Sünger doygunluk süresi 5 dk artırılarak şartlı kabul verildi.",
    results: [],
  },
]

export const MOCK_QUALITY_PLANS = [
  {
    id: "qp-01",
    code: "QP-GIRDI-CICEK",
    name: "Kesme Çiçek Hammadde Girdi Kabul Planı",
    controlPoint: "RECEIVING",
    samplingType: "AQL",
    inspectionLevel: "LEVEL_II",
    aqlAcceptanceLimit: 1.5,
    isActive: true,
    items: [
      { id: "qpi-1", characteristicName: "Gonca Çapı & Form", characteristicType: "VARIABLE", nominalValue: 55, minTolerance: 50, maxTolerance: 65, unit: "mm" },
      { id: "qpi-2", characteristicName: "Botrytis & Mantar Kontrolü", characteristicType: "ATTRIBUTE", isCritical: true },
      { id: "qpi-3", characteristicName: "Soğuk Zincir Sıcaklığı (Teslim)", characteristicType: "VARIABLE", nominalValue: 4, minTolerance: 2, maxTolerance: 8, unit: "°C" },
    ],
  },
  {
    id: "qp-02",
    code: "QP-MAMUL-VIP",
    name: "Lüks Aranjman Son Kalite Güvence Planı",
    controlPoint: "FINAL",
    samplingType: "FULL_INSPECTION",
    isActive: true,
    items: [
      { id: "qpi-4", characteristicName: "Vazo Sızdırmazlığı", characteristicType: "ATTRIBUTE", isCritical: true },
      { id: "qpi-5", characteristicName: "Lüks Tebrik Kartı ve Mühür Doğrulaması", characteristicType: "ATTRIBUTE", isCritical: false },
    ],
  },
]

export const MOCK_QUALITY_CALIBRATIONS = [
  {
    id: "cal-01",
    deviceCode: "CAL-KUMP-01",
    deviceName: "Mitutoyo Dijital Kumpas (150mm)",
    deviceType: "CALIPER",
    location: "Kalite Laboratuvarı",
    lastCalibrationDate: getRelativeDateOnly(-45),
    nextCalibrationDate: getRelativeDateOnly(320),
    daysRemaining: 320,
    status: "ACTIVE",
    certificateNumber: "TÜRKAK-CAL-2026-8812",
  },
  {
    id: "cal-02",
    deviceCode: "CAL-LOG-02",
    deviceName: "Testo 174H Sıcaklık & Nem Kaydedici",
    deviceType: "LOGGER",
    location: "Soğuk Depo & Şoklama Odası",
    lastCalibrationDate: getRelativeDateOnly(-120),
    nextCalibrationDate: getRelativeDateOnly(245),
    daysRemaining: 245,
    status: "ACTIVE",
    certificateNumber: "TÜRKAK-CAL-2025-4419",
  },
  {
    id: "cal-03",
    deviceCode: "CAL-TER-03",
    deviceName: "Radwag Hassas Laboratuvar Terazisi (0.01g)",
    deviceType: "SCALE",
    location: "Ar-Ge & Besin Karışım İstasyonu",
    lastCalibrationDate: getRelativeDateOnly(-200),
    nextCalibrationDate: getRelativeDateOnly(165),
    daysRemaining: 165,
    status: "ACTIVE",
    certificateNumber: "TÜRKAK-CAL-2025-1102",
  },
]

export const MOCK_QUALITY_NCRS = [
  {
    id: "ncr-01",
    ncrNumber: "NCR-2026-004",
    title: "Kazablanka Lilyum Yaprak Sararması & Kırılma",
    sourceType: "SUPPLIER",
    severity: "MAJOR",
    status: "IN_PROGRESS",
    itemId: "item-lil-02",
    itemName: "Beyaz Kazablanka Lilyum",
    lotNumber: "LOT-LIL-2601",
    defectQuantity: 18,
    rootCause: "Soğuk zincir nakliye esnasında 12 saatlik sıcaklık yükselişi (+14°C) tespit edildi.",
    correctiveAction: "Tedarikçiye ihtar yazıldı, nakliye firması data logger kayıtları ile tazmin süreci başlatıldı.",
    openedAt: getRelativeIso(-4),
  },
]

// ─────────────────────────────────────────────────────────────────────────────
// 7. EKİPMAN & BAKIM YÖNETİMİ (MAINTENANCE & TPM)
// ─────────────────────────────────────────────────────────────────────────────

export const MOCK_MAINTENANCE_OVERVIEW = {
  totalMachines: 6,
  operationalMachines: 5,
  underMaintenanceMachines: 1,
  mtbfHours: 580,
  mttrHours: 1.6,
  activeWorkOrders: 3,
  scheduledPlans: 4,
  overallEquipmentHealth: 94.2,
}

export const MOCK_MAINTENANCE_MACHINES = [
  {
    id: "mac-01",
    code: "EQ-SOGUK-01",
    name: "Carrier Endüstriyel Soğuk Hava Deposu Ünitesi",
    category: "COOLING",
    location: "Ana Çiçek Deposu",
    criticality: "CRITICAL",
    status: "RUNNING",
    healthScore: 96,
    operatingHours: 4820,
    lastMaintenanceDate: getRelativeDateOnly(-20),
    nextMaintenanceDate: getRelativeDateOnly(10),
  },
  {
    id: "mac-02",
    code: "EQ-SISLEME-02",
    name: "Ultrasor Yüksek Basınçlı Sisleme & Nemlendirme Cihazı",
    category: "HUMIDITY",
    location: "İklimlendirme Odası (WC-SOK)",
    criticality: "HIGH",
    status: "IN_MAINTENANCE",
    healthScore: 82,
    operatingHours: 2190,
    lastMaintenanceDate: getRelativeDateOnly(-5),
    nextMaintenanceDate: getRelativeDateOnly(25),
  },
  {
    id: "mac-03",
    code: "EQ-PAKET-03",
    name: "Lantech Otomatik Döner Tablalı Streç Sarma Makinesi",
    category: "PACKAGING",
    location: "VIP Paketleme Hattı (WC-PAKET)",
    criticality: "MEDIUM",
    status: "RUNNING",
    healthScore: 98,
    operatingHours: 1450,
    lastMaintenanceDate: getRelativeDateOnly(-60),
    nextMaintenanceDate: getRelativeDateOnly(30),
  },
]

export const MOCK_MAINTENANCE_WORK_ORDERS = [
  {
    id: "mwo-01",
    workOrderNumber: "MWO-2026-024",
    title: "Carrier Soğuk Depo Kompresör Yağ Değişimi & Gaz Kaçak Testi",
    machineAssetId: "mac-01",
    machineAssetName: "Carrier Endüstriyel Soğuk Hava Deposu",
    type: "PREVENTIVE",
    priority: "HIGH",
    status: "COMPLETED",
    plannedStartDate: getRelativeIso(-20),
    plannedEndDate: getRelativeIso(-20, 14, 0),
    assignedTo: "Teknisyen Serkan Demir",
    downtimeMinutes: 90,
    laborHours: 2.5,
    actualCost: 1850,
  },
  {
    id: "mwo-02",
    workOrderNumber: "MWO-2026-027",
    title: "Ultrasor Sisleme Nozulu Kireç Temizliği & Basınç Kalibrasyonu",
    machineAssetId: "mac-02",
    machineAssetName: "Ultrasor Yüksek Basınçlı Sisleme Cihazı",
    type: "CORRECTIVE",
    priority: "URGENT",
    status: "IN_PROGRESS",
    plannedStartDate: getRelativeIso(0, 9, 0),
    plannedEndDate: getRelativeIso(0, 16, 0),
    assignedTo: "Yetkili Servis (EkoSistem Ltd.)",
    downtimeMinutes: 120,
    laborHours: 3,
    actualCost: 950,
  },
]

export const MOCK_MAINTENANCE_PLANS = [
  {
    id: "mp-01",
    code: "MP-SOGUK-AYLIK",
    name: "Soğuk Depo Aylık Periyodik Koruyucu Bakım Planı",
    machineAssetId: "mac-01",
    machineName: "Carrier Endüstriyel Soğuk Hava Deposu",
    planType: "CALENDAR",
    frequencyDays: 30,
    estimatedDurationMinutes: 120,
    priority: "HIGH",
    isActive: true,
  },
  {
    id: "mp-02",
    code: "MP-SISLEME-HAFTALIK",
    name: "Sisleme Memesi Su Filtresi & UV Lamba Kontrolü",
    machineAssetId: "mac-02",
    machineName: "Ultrasor Yüksek Basınçlı Sisleme Cihazı",
    planType: "CALENDAR",
    frequencyDays: 7,
    estimatedDurationMinutes: 45,
    priority: "MEDIUM",
    isActive: true,
  },
]

// ─────────────────────────────────────────────────────────────────────────────
// 8. MRP & MPS (ANA ÜRETİM ÇİZELGESİ & MALZEME İHTİYAÇ PLANLAMA)
// ─────────────────────────────────────────────────────────────────────────────

export const MOCK_MPS_PLANS = [
  {
    id: "mps-001",
    code: "MPS-2026-Q4",
    name: "2026 Yıl Sonu Kurumsal Çiçek & Aranjman Ana Üretim Planı",
    status: "APPROVED",
    bucketType: "WEEKLY",
    horizonDays: 60,
    frozenDays: 14,
    notes: "Q4 bayram, yılbaşı ve kurumsal gala siparişleri baz alınmıştır.",
    approvedAt: getRelativeIso(-10),
    approvedBy: "Fabrika Müdürü",
    createdAt: getRelativeIso(-20),
  },
]

export const MOCK_MPS_GRID = {
  plan: MOCK_MPS_PLANS[0],
  periods: ["Hafta 46 (Mevcut)", "Hafta 47", "Hafta 48", "Hafta 49", "Hafta 50"],
  rows: [
    {
      itemId: "item-arj-07",
      itemSku: "ARJ-VIP-07",
      itemName: "Premium VIP Seramik Aranjman",
      unit: "Adet",
      startingStock: 12,
      values: [
        { period: "Hafta 46", forecast: 25, orders: 20, mps: 20, projectedStock: 7, availableToPromise: 5 },
        { period: "Hafta 47", forecast: 30, orders: 15, mps: 30, projectedStock: 12, availableToPromise: 15 },
        { period: "Hafta 48", forecast: 40, orders: 10, mps: 40, projectedStock: 12, availableToPromise: 30 },
        { period: "Hafta 49", forecast: 50, orders: 5, mps: 50, projectedStock: 12, availableToPromise: 45 },
        { period: "Hafta 50", forecast: 60, orders: 0, mps: 60, projectedStock: 12, availableToPromise: 60 },
      ],
    },
    {
      itemId: "item-bkt-parent-06",
      itemSku: "BKT-PST-06",
      itemName: "Gelin Buketi - Romantik Pastel",
      unit: "Buket",
      startingStock: 5,
      values: [
        { period: "Hafta 46", forecast: 15, orders: 12, mps: 15, projectedStock: 5, availableToPromise: 3 },
        { period: "Hafta 47", forecast: 20, orders: 8, mps: 20, projectedStock: 5, availableToPromise: 12 },
        { period: "Hafta 48", forecast: 25, orders: 5, mps: 25, projectedStock: 5, availableToPromise: 20 },
        { period: "Hafta 49", forecast: 30, orders: 2, mps: 30, projectedStock: 5, availableToPromise: 28 },
        { period: "Hafta 50", forecast: 35, orders: 0, mps: 35, projectedStock: 5, availableToPromise: 35 },
      ],
    },
  ],
}

export const MOCK_MRP_RUNS = [
  {
    id: "mrp-run-01",
    runNumber: "MRP-20261112-01",
    mpsPlanId: "mps-001",
    runType: "FULL_REGENERATION",
    status: "COMPLETED",
    executedAt: getRelativeIso(0, 7, 30),
    executionDurationMs: 420,
    totalPlannedOrders: 6,
    totalActionMessages: 2,
    plannedProductionCount: 2,
    plannedPurchaseCount: 4,
  },
]

export const MOCK_PLANNED_ORDERS = [
  {
    id: "po-01",
    orderType: "PURCHASE",
    itemId: "item-gul-01",
    sku: "GUL-EKV-01",
    itemName: "Ekvator Kırmızı Gül (1. Kalite - 60cm)",
    quantity: 450,
    unit: "Demet",
    suggestedReleaseDate: getRelativeDateOnly(1),
    dueDate: getRelativeDateOnly(3),
    status: "PROPOSED",
    estimatedCost: 112500,
    supplierName: "Ekvator Flora Direct Ltd.",
    sourceMpsPlanCode: "MPS-2026-Q4",
  },
  {
    id: "po-02",
    orderType: "PURCHASE",
    itemId: "item-vaz-03",
    sku: "VAZ-ANT-03",
    itemName: "İthal Mat Antrasit Seramik Vazo (25cm)",
    quantity: 80,
    unit: "Adet",
    suggestedReleaseDate: getRelativeDateOnly(2),
    dueDate: getRelativeDateOnly(5),
    status: "PROPOSED",
    estimatedCost: 14400,
    supplierName: "Paşabahçe / Seramik Dünyası A.Ş.",
    sourceMpsPlanCode: "MPS-2026-Q4",
  },
  {
    id: "po-03",
    orderType: "PRODUCTION",
    itemId: "item-arj-07",
    sku: "ARJ-VIP-07",
    itemName: "Premium VIP Seramik Aranjman",
    quantity: 30,
    unit: "Adet",
    suggestedReleaseDate: getRelativeDateOnly(4),
    dueDate: getRelativeDateOnly(6),
    status: "PROPOSED",
    estimatedCost: 34500,
    sourceMpsPlanCode: "MPS-2026-Q4",
  },
]

export const MOCK_ACTION_MESSAGES = [
  {
    id: "act-msg-01",
    actionType: "EXPEDITE",
    severity: "HIGH",
    itemId: "item-gul-01",
    itemName: "Ekvator Kırmızı Gül (1. Kalite - 60cm)",
    message: "Hafta 47 talebi için mevcut satınalma siparişinin 2 gün öne çekilmesi öneriliyor.",
    recommendedDate: getRelativeDateOnly(2),
    orderRef: "PO-2026-104",
  },
  {
    id: "act-msg-02",
    actionType: "INCREASE_QTY",
    severity: "MEDIUM",
    itemId: "item-sng-04",
    itemName: "Oasis Islak Çiçek Süngeri",
    message: "Hafta 48 için planlanan miktar emniyet stoku eşiğinin altına düşüyor (+5 koli artırılmalı).",
    orderRef: "PO-2026-109",
  },
]

// ─────────────────────────────────────────────────────────────────────────────
// 9. KONSOLİDE YÖNETİM DASHBOARD'U (OEE & INTEGRATION)
// ─────────────────────────────────────────────────────────────────────────────

export const MOCK_CONSOLIDATED_DASHBOARD = {
  kpis: {
    oee: 89.4,
    availability: 91.2,
    performance: 93.8,
    quality: 98.6,
    totalProductionQty: 412,
    targetProductionQty: 450,
    scrapRatePercent: 1.4,
    activeWorkCentersCount: 4,
    inProgressOrdersCount: 5,
    onTimeDeliveryPercent: 97.2,
  },
  dailyTrend: [
    { date: "Pzt", planned: 80, actual: 78, oee: 88.2 },
    { date: "Sal", planned: 85, actual: 84, oee: 90.1 },
    { date: "Çar", planned: 90, actual: 86, oee: 87.5 },
    { date: "Per", planned: 95, actual: 92, oee: 91.0 },
    { date: "Cum", planned: 100, actual: 98, oee: 92.4 },
  ],
  stoppages: [
    { reason: "Vardiya Mola & Temizlik", minutes: 35, percentage: 48 },
    { reason: "Hammadde / Gül Ayıklama Bekleme", minutes: 22, percentage: 30 },
    { reason: "Ekipman Ayar / Kalibrasyon", minutes: 16, percentage: 22 },
  ],
  activeAlerts: [
    { id: "alt-1", type: "WARNING", title: "Kapasite Darboğazı Uyarısı", message: "WC-TANZIM Atölyesi bu hafta %92 doluluk ile darboğaz eşiğinde.", time: "10 dk önce" },
    { id: "alt-2", type: "INFO", title: "MRP Hesaplaması Tamamlandı", message: "MPS-2026-Q4 planı başarıyla patlatıldı, 6 öneri üretildi.", time: "45 dk önce" },
    { id: "alt-3", type: "SUCCESS", title: "AQL Muayene Onayı", message: "INS-2026-081 ithal gül partisi sıfır kusurla kabul edildi.", time: "2 saat önce" },
  ],
}

// ─────────────────────────────────────────────────────────────────────────────
// 10. ALTYAPI METRİKLERİ (INFRASTRUCTURE SNAPSHOT FOR DEMO)
// ─────────────────────────────────────────────────────────────────────────────

export const MOCK_INFRASTRUCTURE_SNAPSHOT = {
  success: true,
  branchId: null,
  anyFlagEnabled: true,
  flags: {
    uretim_bom_rota: true,
    uretim_mrp_mps: true,
    uretim_is_emri: true,
    uretim_kapasite: true,
    uretim_kalite: true,
    uretim_bakim: true,
  },
  databaseReadiness: {
    bomHeaderCount: 3,
    bomComponentCount: 7,
    manufacturingWarehouseCount: 2,
    rawMaterialCount: 18,
    semiFinishedCount: 6,
    finishedGoodCount: 12,
    recentAuditCount: 28,
  },
}

