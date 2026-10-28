/**
 * Sunum ERP - Public Demo Central Mock Database & Simulation Service
 * 
 * Bu modül, Public Demo ortamında tüm sistem ekranlarının (Dashboard, Takvim,
 * Siparişler, Mağaza/B2B, Müşteriler, İnsan Kaynakları, Personel Talepleri ve Finans)
 * dolu, canlı, prestijli kurumsal verilerle çalışmasını ve kullanıcı etkileşimlerinde
 * (ekleme, silme, güncelleme) veritabanını bozmadan tarayıcı seviyesinde reaktif
 * simülasyon sunmasını sağlar.
 */

// ── Types ──────────────────────────────────────────────────────────────────

export interface MockKPIStats {
  customers: number
  activeProjects: number
  totalProjects: number
  leads: number
  income: number
  expense: number
  netProfit: number
  spendingByKind: Array<{ name: string; value: number }>
  recentActivities: Array<{
    id: string
    type: string
    description: string
    time: string
    rawDate: Date | string
  }>
}

export interface MockCustomer {
  id: string
  branchId: string
  name: string
  company: string
  email: string
  phone: string
  address: string
  status: "active" | "passive" | "blacklist"
  scoreTemp: "Sıcak" | "Orta" | "Soğuk"
  purchaseProb: number
  segment: "A" | "B" | "C" | "Kurumsal"
  recallDate: string
  anniversary: string
  createdAt: string
  updatedAt: string
  notes?: any[]
  chats?: any[]
  documents?: any[]
  tasks?: any[]
  contacts?: any[]
  orders?: any[]
}

export interface MockOrder {
  id: string
  orderNumber: string
  branchId: string
  orderType: string
  title: string
  description?: string
  quantity?: number
  priority: "low" | "normal" | "high" | "urgent"
  status: "pending" | "approved" | "in-progress" | "delivered" | "rejected"
  paymentStatus: "paid" | "unpaid" | "partial"
  totalAmount: number
  customerName: string
  companyName: string
  customerPhone: string
  orderDate: string
  createdAt: string
  updatedAt: string
  customerId?: string
  customer?: { id: string; name: string; company: string }
}

export interface MockCalendarEvent {
  id: string
  title: string
  date: string // ISO string
  endDate?: string
  type: "appointment" | "income_payment" | "expense_payment" | "reminder" | "todo" | "content_calendar"
  color: string
  description?: string
  amount?: number
  status?: string
  allDay?: boolean
  location?: string
}

export interface MockStoreProduct {
  id: string
  name: string
  description: string
  unit: string
  category: string
  price: number
  stock: number
  isActive: boolean
  prices?: Array<{ id: string; price: number; branch?: { id: string; name: string } }>
}

export interface MockStockRequest {
  id: string
  productId?: string
  customProduct?: string
  quantity: number
  notes?: string
  status: "pending" | "approved" | "rejected" | "delivered"
  createdAt: string
  branchId: string
  branch?: { id: string; name: string }
  product?: MockStoreProduct
}

export interface MockHRCandidate {
  id: string
  firstName: string
  lastName: string
  email: string
  phone: string
  position: string
  status: string
  kanbanStatus: "Basvurdu" | "Mulakat" | "Teklif" | "Ise Alindi" | "Reddedildi"
  department: string
  rating: number
  skills: string
  experienceYears: number
  education: string
  documents: any[]
  chats: any[]
  applicationDate: string
  avatarUrl?: string | null
}

export interface MockHRRequest {
  id: string
  title: string
  category: "finans" | "it" | "ik" | "ofis" | "satinalma"
  summary: string
  description: string
  priority: "Normal" | "Acil" | "Kritik"
  status: "pending" | "approved" | "rejected" | "completed"
  createdAt: string
  updatedAt: string
  uploadedFiles: string[]
  approver: string
  requester: { name: string; avatarUrl: string | null; role: string }
  amount?: number
  reason?: string
  expectedDate?: string
  hardwareType?: string
  brandModel?: string
  leaveType?: string
  startDate?: string
  endDate?: string
  daysCount?: number
  proxyEmployee?: string
  managerComment?: string
  itComment?: string
  decisionDate?: string
}

export interface MockMonthlyFinancial {
  month: string
  income: number
  expense: number
  profit: number
}

export interface MockFinanceRecord {
  id: string
  branchId: string
  type: "INCOME" | "EXPENSE" | "DEBT" | "EXPECTED_PAYMENT"
  amount: number
  category: string
  description: string
  receiptUrl?: string
  date: string
  status: "pending" | "approved" | "rejected"
  approvedBy?: string | null
  branch?: { id: string; name: string }
}

// ── Dynamic Date Helpers ───────────────────────────────────────────────────

function getRelativeDate(daysOffset: number, hours = 10, minutes = 0): string {
  const d = new Date()
  d.setDate(d.getDate() + daysOffset)
  d.setHours(hours, minutes, 0, 0)
  return d.toISOString()
}

function getRelativeDateStr(daysOffset: number): string {
  const d = new Date()
  d.setDate(d.getDate() + daysOffset)
  return d.toISOString().split("T")[0]
}

const mockBranchId = "local-debug-branch"

// ── Initial Mock Datasets ──────────────────────────────────────────────────

export const INITIAL_CUSTOMERS: MockCustomer[] = [
  {
    id: "cust-01",
    branchId: mockBranchId,
    name: "Selin Yılmaz",
    company: "Koç Holding A.Ş.",
    email: "selin.yilmaz@koc.com.tr",
    phone: "0532 101 2030",
    address: "Nakkaştepe Azizbey Sok. No:1, Kuzguncuk, Üsküdar / İstanbul",
    status: "active",
    scoreTemp: "Sıcak",
    purchaseProb: 98,
    segment: "Kurumsal",
    recallDate: getRelativeDateStr(3),
    anniversary: "1988-06-15",
    createdAt: "2026-01-10T09:00:00Z",
    updatedAt: "2026-07-25T10:30:00Z",
    notes: [
      { id: "cn-1", content: "ERP Dönüşüm ve Konsolidasyon Faz-1 sözleşmesi tamamlandı.", author: "Yönetici", createdAt: "2026-07-20T10:00:00Z" }
    ],
    chats: [],
    documents: [],
    tasks: [],
    contacts: [
      { id: "cc-1", name: "Murat Koç", role: "BT Direktörü", email: "murat.koc@koc.com.tr", phone: "0532 101 2031" }
    ],
    orders: []
  },
  {
    id: "cust-02",
    branchId: mockBranchId,
    name: "Ahmet Yılmaz",
    company: "Ziraat Bankası A.Ş.",
    email: "ahmet.yilmaz@ziraatbank.com.tr",
    phone: "0555 123 4567",
    address: "Atatürk Bulvarı No:8, Altındağ / Ankara",
    status: "active",
    scoreTemp: "Sıcak",
    purchaseProb: 95,
    segment: "Kurumsal",
    recallDate: getRelativeDateStr(5),
    anniversary: "1985-04-12",
    createdAt: "2026-01-15T11:00:00Z",
    updatedAt: "2026-07-24T15:20:00Z",
    notes: [],
    chats: [],
    documents: [],
    tasks: [],
    contacts: [],
    orders: []
  },
  {
    id: "cust-03",
    branchId: mockBranchId,
    name: "Mehmet Demir",
    company: "Çiçek Sepeti İnternet Hizmetleri",
    email: "mehmet.demir@ciceksepeti.com",
    phone: "0532 987 6543",
    address: "USO Center Maslak No:245, Sarıyer / İstanbul",
    status: "active",
    scoreTemp: "Sıcak",
    purchaseProb: 92,
    segment: "A",
    recallDate: getRelativeDateStr(2),
    anniversary: "1990-09-24",
    createdAt: "2026-02-15T11:00:00Z",
    updatedAt: "2026-07-24T15:20:00Z",
    notes: [],
    chats: [],
    documents: [],
    tasks: [],
    contacts: [],
    orders: []
  },
  {
    id: "cust-04",
    branchId: mockBranchId,
    name: "Ebru Kaya",
    company: "Vodafone Telekomünikasyon A.Ş.",
    email: "ebru.kaya@vodafone.com",
    phone: "0544 111 2233",
    address: "Papirus Plaza No:37, Kağıthane / İstanbul",
    status: "active",
    scoreTemp: "Sıcak",
    purchaseProb: 90,
    segment: "Kurumsal",
    recallDate: getRelativeDateStr(7),
    anniversary: "1988-11-05",
    createdAt: "2026-03-01T10:00:00Z",
    updatedAt: "2026-07-26T12:00:00Z",
    notes: [],
    chats: [],
    documents: [],
    tasks: [],
    contacts: [],
    orders: []
  },
  {
    id: "cust-05",
    branchId: mockBranchId,
    name: "Caner Şahin",
    company: "Garanti BBVA Finansal Çözümler",
    email: "caner.sahin@garantibbva.com.tr",
    phone: "0505 222 3344",
    address: "Nispetiye Mah. Aytar Cad. No:2, Beşiktaş / İstanbul",
    status: "active",
    scoreTemp: "Orta",
    purchaseProb: 88,
    segment: "Kurumsal",
    recallDate: getRelativeDateStr(4),
    anniversary: "1992-06-18",
    createdAt: "2026-03-20T14:30:00Z",
    updatedAt: "2026-07-20T09:10:00Z",
    notes: [],
    chats: [],
    documents: [],
    tasks: [],
    contacts: [],
    orders: []
  },
  {
    id: "cust-06",
    branchId: mockBranchId,
    name: "Burak Öztürk",
    company: "Trendyol Lojistik & Dağıtım A.Ş.",
    email: "burak.ozturk@trendyol.com",
    phone: "0533 444 5566",
    address: "Spine Tower No:123 Maslak, Sarıyer / İstanbul",
    status: "active",
    scoreTemp: "Sıcak",
    purchaseProb: 94,
    segment: "Kurumsal",
    recallDate: getRelativeDateStr(1),
    anniversary: "1991-03-22",
    createdAt: "2026-04-05T08:30:00Z",
    updatedAt: "2026-07-27T16:45:00Z",
    notes: [],
    chats: [],
    documents: [],
    tasks: [],
    contacts: [],
    orders: []
  },
  {
    id: "cust-07",
    branchId: mockBranchId,
    name: "Zeynep Aydın",
    company: "Sabancı Dijital Çözümler A.Ş.",
    email: "zeynep.aydin@sabanci.com",
    phone: "0535 666 7788",
    address: "Sabancı Center K:18 4. Levent / İstanbul",
    status: "active",
    scoreTemp: "Sıcak",
    purchaseProb: 91,
    segment: "Kurumsal",
    recallDate: getRelativeDateStr(6),
    anniversary: "1989-12-04",
    createdAt: "2026-04-12T10:15:00Z",
    updatedAt: "2026-07-26T14:00:00Z",
    notes: [],
    chats: [],
    documents: [],
    tasks: [],
    contacts: [],
    orders: []
  },
  {
    id: "cust-08",
    branchId: mockBranchId,
    name: "Murat Arslan",
    company: "Eczacıbaşı Bilişim A.Ş.",
    email: "murat.arslan@eczacibasi.com.tr",
    phone: "0537 777 8899",
    address: "Kanyon Ofis No:193 K:11 Levent / İstanbul",
    status: "active",
    scoreTemp: "Orta",
    purchaseProb: 84,
    segment: "A",
    recallDate: getRelativeDateStr(8),
    anniversary: "1987-08-30",
    createdAt: "2026-04-18T13:40:00Z",
    updatedAt: "2026-07-22T11:20:00Z",
    notes: [],
    chats: [],
    documents: [],
    tasks: [],
    contacts: [],
    orders: []
  },
  {
    id: "cust-09",
    branchId: mockBranchId,
    name: "Deniz Çelik",
    company: "Getir Perakende Lojistik A.Ş.",
    email: "deniz.celik@getir.com",
    phone: "0539 888 9900",
    address: "Etiler Mah. Nispetiye Cad. No:99 Beşiktaş / İstanbul",
    status: "active",
    scoreTemp: "Sıcak",
    purchaseProb: 90,
    segment: "Kurumsal",
    recallDate: getRelativeDateStr(2),
    anniversary: "1993-01-19",
    createdAt: "2026-05-02T09:20:00Z",
    updatedAt: "2026-07-26T17:30:00Z",
    notes: [],
    chats: [],
    documents: [],
    tasks: [],
    contacts: [],
    orders: []
  },
  {
    id: "cust-10",
    branchId: mockBranchId,
    name: "Hakan Güler",
    company: "Türk Telekom Grubu A.Ş.",
    email: "hakan.guler@turktelekom.com.tr",
    phone: "0506 999 0011",
    address: "Turgut Özal Bulvarı Aydınlıkevler / Ankara",
    status: "active",
    scoreTemp: "Orta",
    purchaseProb: 82,
    segment: "Kurumsal",
    recallDate: getRelativeDateStr(10),
    anniversary: "1984-05-11",
    createdAt: "2026-05-10T14:00:00Z",
    updatedAt: "2026-07-21T09:50:00Z",
    notes: [],
    chats: [],
    documents: [],
    tasks: [],
    contacts: [],
    orders: []
  },
  {
    id: "cust-11",
    branchId: mockBranchId,
    name: "Hande Yıldırım",
    company: "Arçelik Global A.Ş.",
    email: "hande.yildirim@arcelik.com",
    phone: "0531 222 3344",
    address: "Karaağaç Cad. No:2-6 Sütlüce, Beyoğlu / İstanbul",
    status: "active",
    scoreTemp: "Sıcak",
    purchaseProb: 93,
    segment: "Kurumsal",
    recallDate: getRelativeDateStr(4),
    anniversary: "1990-10-14",
    createdAt: "2026-05-18T16:30:00Z",
    updatedAt: "2026-07-25T13:40:00Z",
    notes: [],
    chats: [],
    documents: [],
    tasks: [],
    contacts: [],
    orders: []
  },
  {
    id: "cust-12",
    branchId: mockBranchId,
    name: "Dr. Kaan Özdemir",
    company: "Özdemir Sağlık & Klinik Danışmanlık",
    email: "kaan@ozdemirklinik.com",
    phone: "0532 777 1122",
    address: "Teşvikiye Cad. No:42 Nişantaşı / İstanbul",
    status: "active",
    scoreTemp: "Sıcak",
    purchaseProb: 87,
    segment: "B",
    recallDate: getRelativeDateStr(6),
    anniversary: "1982-02-28",
    createdAt: "2026-06-01T10:00:00Z",
    updatedAt: "2026-07-20T15:10:00Z",
    notes: [],
    chats: [],
    documents: [],
    tasks: [],
    contacts: [],
    orders: []
  },
  {
    id: "cust-13",
    branchId: mockBranchId,
    name: "Elif Yıldız",
    company: "Yıldız Mimarlık & Tasarım Stüdyosu",
    email: "elif@yildizmimarlik.com",
    phone: "0533 999 4433",
    address: "Cihangir Mah. Sıraselviler Cad. No:88 Beyoğlu / İstanbul",
    status: "active",
    scoreTemp: "Sıcak",
    purchaseProb: 89,
    segment: "B",
    recallDate: getRelativeDateStr(5),
    anniversary: "1994-07-16",
    createdAt: "2026-06-12T11:45:00Z",
    updatedAt: "2026-07-24T18:00:00Z",
    notes: [],
    chats: [],
    documents: [],
    tasks: [],
    contacts: [],
    orders: []
  },
  {
    id: "cust-14",
    branchId: mockBranchId,
    name: "Av. Burak Demir",
    company: "Demir Hukuk & Arabuluculuk Ortaklığı",
    email: "burak@demirhukuk.av.tr",
    phone: "0542 333 8811",
    address: "Adalet Plaza K:7 Çağlayan / İstanbul",
    status: "active",
    scoreTemp: "Orta",
    purchaseProb: 78,
    segment: "B",
    recallDate: getRelativeDateStr(9),
    anniversary: "1986-11-20",
    createdAt: "2026-06-20T14:10:00Z",
    updatedAt: "2026-07-23T12:30:00Z",
    notes: [],
    chats: [],
    documents: [],
    tasks: [],
    contacts: [],
    orders: []
  }
]

export const INITIAL_ORDERS: MockOrder[] = [
  {
    id: "ord-01",
    orderNumber: "ORD-2026-001",
    branchId: mockBranchId,
    orderType: "Kurumsal ERP Yazılımı",
    title: "Kurumsal ERP Dönüşüm Lisansı & Özel Entegrasyon",
    description: "Koç Holding tüm bağlı iştirakleri için merkezi ERP, konsolidasyon ve çoklu şirket yönetimi lisans paketi.",
    quantity: 1,
    priority: "urgent",
    status: "approved",
    paymentStatus: "paid",
    totalAmount: 350000,
    customerName: "Selin Yılmaz",
    companyName: "Koç Holding A.Ş.",
    customerPhone: "0532 101 2030",
    orderDate: getRelativeDateStr(-2),
    createdAt: getRelativeDate(-2, 11, 30),
    updatedAt: getRelativeDate(-2, 14, 0),
    customerId: "cust-01",
    customer: { id: "cust-01", name: "Selin Yılmaz", company: "Koç Holding A.Ş." }
  },
  {
    id: "ord-02",
    orderNumber: "ORD-2026-002",
    branchId: mockBranchId,
    orderType: "B2B Modül Entegrasyonu",
    title: "B2B Finans ve Açık Bankacılık Entegrasyon Paketi",
    description: "Ziraat Bankası ticari bankacılık ve otomatik hakediş mutabakatı API gateway köprüsü kurulumu.",
    quantity: 1,
    priority: "high",
    status: "delivered",
    paymentStatus: "paid",
    totalAmount: 180000,
    customerName: "Ahmet Yılmaz",
    companyName: "Ziraat Bankası A.Ş.",
    customerPhone: "0555 123 4567",
    orderDate: getRelativeDateStr(-5),
    createdAt: getRelativeDate(-5, 9, 15),
    updatedAt: getRelativeDate(-3, 16, 20),
    customerId: "cust-02",
    customer: { id: "cust-02", name: "Ahmet Yılmaz", company: "Ziraat Bankası A.Ş." }
  },
  {
    id: "ord-03",
    orderNumber: "ORD-2026-003",
    branchId: mockBranchId,
    orderType: "AI Otomasyon & CRM",
    title: "Kuşçu AI Asistan & WhatsApp Sipariş Botu",
    description: "Çiçek Sepeti satıcı paneli için yapay zeka destekli otomatik müşteri karşılama ve durum bilgilendirme robotu.",
    quantity: 1,
    priority: "high",
    status: "in-progress",
    paymentStatus: "partial",
    totalAmount: 125000,
    customerName: "Mehmet Demir",
    companyName: "Çiçek Sepeti İnternet Hizmetleri",
    customerPhone: "0532 987 6543",
    orderDate: getRelativeDateStr(-1),
    createdAt: getRelativeDate(-1, 14, 45),
    updatedAt: getRelativeDate(0, 10, 0),
    customerId: "cust-03",
    customer: { id: "cust-03", name: "Mehmet Demir", company: "Çiçek Sepeti İnternet Hizmetleri" }
  },
  {
    id: "ord-04",
    orderNumber: "ORD-2026-004",
    branchId: mockBranchId,
    orderType: "Lojistik & Depo Takip",
    title: "Barkodlu Depo & Kargo Entegrasyon Terminali",
    description: "Trendyol aktarma merkezleri için barkod okuyucu yazılımı, anlık stok takip ve kargo etiketleme altyapısı.",
    quantity: 8,
    priority: "urgent",
    status: "approved",
    paymentStatus: "paid",
    totalAmount: 95000,
    customerName: "Burak Öztürk",
    companyName: "Trendyol Lojistik & Dağıtım A.Ş.",
    customerPhone: "0533 444 5566",
    orderDate: getRelativeDateStr(-3),
    createdAt: getRelativeDate(-3, 10, 0),
    updatedAt: getRelativeDate(-2, 11, 0),
    customerId: "cust-06",
    customer: { id: "cust-06", name: "Burak Öztürk", company: "Trendyol Lojistik & Dağıtım A.Ş." }
  },
  {
    id: "ord-05",
    orderNumber: "ORD-2026-005",
    branchId: mockBranchId,
    orderType: "İnsan Kaynakları Modülü",
    title: "Gelişmiş İK & Personel Performans Denetim Paketi",
    description: "Vodafone kurumsal ekipleri için izin, avans, bordro takibi ve gün sonu iş teslim denetim modülü.",
    quantity: 1,
    priority: "normal",
    status: "in-progress",
    paymentStatus: "paid",
    totalAmount: 85000,
    customerName: "Ebru Kaya",
    companyName: "Vodafone Telekomünikasyon A.Ş.",
    customerPhone: "0544 111 2233",
    orderDate: getRelativeDateStr(-4),
    createdAt: getRelativeDate(-4, 15, 30),
    updatedAt: getRelativeDate(-1, 12, 10),
    customerId: "cust-04",
    customer: { id: "cust-04", name: "Ebru Kaya", company: "Vodafone Telekomünikasyon A.Ş." }
  },
  {
    id: "ord-06",
    orderNumber: "ORD-2026-006",
    branchId: mockBranchId,
    orderType: "Bulut Yedekleme & Güvenlik",
    title: "Hibrit Bulut Depolama & Otomatik Felaket Kurtarma",
    description: "Garanti BBVA şube verileri için uçtan uca şifreli yedekleme ve replikasyon servisi.",
    quantity: 1,
    priority: "normal",
    status: "delivered",
    paymentStatus: "paid",
    totalAmount: 72000,
    customerName: "Caner Şahin",
    companyName: "Garanti BBVA Finansal Çözümler",
    customerPhone: "0505 222 3344",
    orderDate: getRelativeDateStr(-7),
    createdAt: getRelativeDate(-7, 13, 0),
    updatedAt: getRelativeDate(-4, 17, 0),
    customerId: "cust-05",
    customer: { id: "cust-05", name: "Caner Şahin", company: "Garanti BBVA Finansal Çözümler" }
  },
  {
    id: "ord-07",
    orderNumber: "ORD-2026-007",
    branchId: mockBranchId,
    orderType: "Çoklu Şube Yönetimi",
    title: "Merkezi Şube ve Bayi Konsolidasyon Lisansı",
    description: "Sabancı Grubu mağazaları için anlık ciro, stok aktarımı ve konsolide bilanço raporlama sistemi.",
    quantity: 1,
    priority: "high",
    status: "pending",
    paymentStatus: "unpaid",
    totalAmount: 110000,
    customerName: "Zeynep Aydın",
    companyName: "Sabancı Dijital Çözümler A.Ş.",
    customerPhone: "0535 666 7788",
    orderDate: getRelativeDateStr(0),
    createdAt: getRelativeDate(0, 9, 30),
    updatedAt: getRelativeDate(0, 9, 30),
    customerId: "cust-07",
    customer: { id: "cust-07", name: "Zeynep Aydın", company: "Sabancı Dijital Çözümler A.Ş." }
  },
  {
    id: "ord-08",
    orderNumber: "ORD-2026-008",
    branchId: mockBranchId,
    orderType: "Finans & e-Dönüşüm",
    title: "e-Fatura / e-İrsaliye ve Gelir İdaresi Entegratörü",
    description: "Eczacıbaşı fabrikaları ve depoları için doğrudan GİB portalı ile tam uyumlu e-fatura modülü.",
    quantity: 1,
    priority: "normal",
    status: "approved",
    paymentStatus: "paid",
    totalAmount: 64000,
    customerName: "Murat Arslan",
    companyName: "Eczacıbaşı Bilişim A.Ş.",
    customerPhone: "0537 777 8899",
    orderDate: getRelativeDateStr(-6),
    createdAt: getRelativeDate(-6, 11, 20),
    updatedAt: getRelativeDate(-5, 14, 0),
    customerId: "cust-08",
    customer: { id: "cust-08", name: "Murat Arslan", company: "Eczacıbaşı Bilişim A.Ş." }
  },
  {
    id: "ord-09",
    orderNumber: "ORD-2026-009",
    branchId: mockBranchId,
    orderType: "Mobil POS ve Saha Satış",
    title: "Saha Satış & Kurye Sipariş Yönetim Terminali",
    description: "Getir kurye ve depo yöneticileri için hızlı sipariş kabul ve rota optimizasyon modülü.",
    quantity: 12,
    priority: "urgent",
    status: "in-progress",
    paymentStatus: "partial",
    totalAmount: 88000,
    customerName: "Deniz Çelik",
    companyName: "Getir Perakende Lojistik A.Ş.",
    customerPhone: "0539 888 9900",
    orderDate: getRelativeDateStr(-2),
    createdAt: getRelativeDate(-2, 16, 10),
    updatedAt: getRelativeDate(-1, 10, 40),
    customerId: "cust-09",
    customer: { id: "cust-09", name: "Deniz Çelik", company: "Getir Perakende Lojistik A.Ş." }
  },
  {
    id: "ord-10",
    orderNumber: "ORD-2026-010",
    branchId: mockBranchId,
    orderType: "Özel Yazılım Geliştirme",
    title: "Kurumsal SMS & WhatsApp Bildirim Gateway",
    description: "Türk Telekom altyapısı ile doğrudan entegre toplu bildirim ve SMS bilgilendirme köprüsü.",
    quantity: 1,
    priority: "normal",
    status: "approved",
    paymentStatus: "paid",
    totalAmount: 52000,
    customerName: "Hakan Güler",
    companyName: "Türk Telekom Grubu A.Ş.",
    customerPhone: "0506 999 0011",
    orderDate: getRelativeDateStr(-8),
    createdAt: getRelativeDate(-8, 10, 0),
    updatedAt: getRelativeDate(-6, 15, 30),
    customerId: "cust-10",
    customer: { id: "cust-10", name: "Hakan Güler", company: "Türk Telekom Grubu A.Ş." }
  },
  {
    id: "ord-11",
    orderNumber: "ORD-2026-011",
    branchId: mockBranchId,
    orderType: "Yıllık Destek & Bakım",
    title: "7/24 SLA Destek, Güvenlik ve Versiyon Güncelleme",
    description: "Arçelik global yönetim sistemleri için yüksek öncelikli 7/24 teknik servis ve bakım paketi.",
    quantity: 1,
    priority: "normal",
    status: "delivered",
    paymentStatus: "paid",
    totalAmount: 48000,
    customerName: "Hande Yıldırım",
    companyName: "Arçelik Global A.Ş.",
    customerPhone: "0531 222 3344",
    orderDate: getRelativeDateStr(-10),
    createdAt: getRelativeDate(-10, 14, 0),
    updatedAt: getRelativeDate(-8, 16, 0),
    customerId: "cust-11",
    customer: { id: "cust-11", name: "Hande Yıldırım", company: "Arçelik Global A.Ş." }
  },
  {
    id: "ord-12",
    orderNumber: "ORD-2026-012",
    branchId: mockBranchId,
    orderType: "KOBİ ERP Başlangıç Paketi",
    title: "Klinik & Randevu Yönetimi CRM Paketi",
    description: "Özdemir Sağlık bünyesinde hasta takibi, SMS hatırlatıcı ve online randevu takvimi kurulumu.",
    quantity: 1,
    priority: "normal",
    status: "approved",
    paymentStatus: "paid",
    totalAmount: 34000,
    customerName: "Dr. Kaan Özdemir",
    companyName: "Özdemir Sağlık Danışmanlığı",
    customerPhone: "0532 777 1122",
    orderDate: getRelativeDateStr(-4),
    createdAt: getRelativeDate(-4, 11, 0),
    updatedAt: getRelativeDate(-3, 14, 0),
    customerId: "cust-12",
    customer: { id: "cust-12", name: "Dr. Kaan Özdemir", company: "Özdemir Sağlık Danışmanlığı" }
  }
]

export const INITIAL_CALENDAR_EVENTS: MockCalendarEvent[] = [
  {
    id: "cal-01",
    title: "Koç Holding Kurumsal ERP Entegrasyon Toplantısı",
    date: getRelativeDate(0, 10, 0),
    endDate: getRelativeDate(0, 11, 30),
    type: "appointment",
    color: "#3b82f6",
    description: "Koç Holding BT heyeti ile Faz-2 ERP modül devreye alma planı ve veri aktarım çalıştayı.",
    location: "Merkez Ofis Toplantı Salonu A (Levent) / Hibrit Teams",
    status: "confirmed"
  },
  {
    id: "cal-02",
    title: "Ziraat Bankası Çeyreklik İnceleme & KPI Değerlendirmesi",
    date: getRelativeDate(1, 14, 0),
    endDate: getRelativeDate(1, 15, 30),
    type: "appointment",
    color: "#3b82f6",
    description: "Ziraat Bankası kurumsal entegrasyon performans göstergeleri ve SLA süreleri değerlendirmesi.",
    location: "Online (Google Meet)",
    status: "confirmed"
  },
  {
    id: "cal-03",
    title: "Alacak Tahsilatı: Koç Holding ERP Lisans Bedeli",
    date: getRelativeDate(2, 9, 0),
    type: "income_payment",
    color: "#10b981",
    description: "Koç Holding kurumsal ERP dönüşüm sözleşmesi hakediş tahsilatı.",
    amount: 350000,
    status: "pending"
  },
  {
    id: "cal-04",
    title: "Alacak Tahsilatı: Ziraat Bankası B2B Hakedişi",
    date: getRelativeDate(-1, 11, 0),
    type: "income_payment",
    color: "#10b981",
    description: "Açık bankacılık entegrasyonu onaylanan hakediş tutarı tahsilatı.",
    amount: 180000,
    status: "paid"
  },
  {
    id: "cal-05",
    title: "Fatura Ödemesi: AWS Dedicated Sunucu & Cloudflare Enterprise",
    date: getRelativeDate(3, 12, 0),
    type: "expense_payment",
    color: "#ef4444",
    description: "Yüksek erişilebilirlik bulut sunucuları ve WAF güvenlik lisansı aylık ödemesi.",
    amount: 45000,
    status: "pending"
  },
  {
    id: "cal-06",
    title: "Yazılım Lisansları: Adobe Creative Cloud & Atlassian Jira",
    date: getRelativeDate(-2, 10, 0),
    type: "expense_payment",
    color: "#ef4444",
    description: "Tasarım ve geliştirici ekipleri kurumsal yazılım lisans bedelleri.",
    amount: 28500,
    status: "paid"
  },
  {
    id: "cal-07",
    title: "Hatırlatıcı: KDV & Muhtasar Beyannamesi Son Ödeme Tarihi",
    date: getRelativeDate(4, 17, 0),
    type: "reminder",
    color: "#f59e0b",
    description: "Mali müşavirlik birimi tarafından onaylanan resmi vergi ve beyanname bildirimleri.",
    status: "active"
  },
  {
    id: "cal-08",
    title: "Hatırlatıcı: Personel Prim ve Avans Bordroları Onay Günü",
    date: getRelativeDate(5, 15, 0),
    type: "reminder",
    color: "#f59e0b",
    description: "İnsan kaynakları ve muhasebe departmanının aylık bordro mutabakatı.",
    status: "active"
  },
  {
    id: "cal-09",
    title: "Q3 Gelir/Gider Raporlarının Yönetim Kuruluna Sunulması",
    date: getRelativeDate(6, 11, 0),
    type: "todo",
    color: "#8b5cf6",
    description: "Finansal analiz grafikleri, büyüme projeksiyonları ve şube bazlı kârlılık rapor sunumu.",
    status: "pending"
  },
  {
    id: "cal-10",
    title: "B2B Sipariş Modülü v2.4 Güvenlik & Yük Testlerinin Yapılması",
    date: getRelativeDate(-3, 16, 0),
    type: "todo",
    color: "#8b5cf6",
    description: "Penetrasyon test raporu analizi ve API yük testlerinin tamamlanması.",
    status: "completed"
  },
  {
    id: "cal-11",
    title: "İçerik Planı: 'ERP ile %40 Verimlilik Artışı' Vaka Analizi",
    date: getRelativeDate(2, 13, 0),
    type: "content_calendar",
    color: "#d946ef",
    description: "LinkedIn ve kurumsal web sitesi için interaktif başarı hikayesi yayını.",
    status: "planned"
  },
  {
    id: "cal-12",
    title: "Trendyol Lojistik & Sipariş Entegrasyonu Onay Toplantısı",
    date: getRelativeDate(-1, 15, 0),
    endDate: getRelativeDate(-1, 16, 30),
    type: "appointment",
    color: "#3b82f6",
    description: "Otomatik sipariş etiketleme ve barkod entegrasyonu kabul testi.",
    location: "Sarıyer Spine Tower / Zoom",
    status: "completed"
  }
]

export const INITIAL_STORE_PRODUCTS: MockStoreProduct[] = [
  {
    id: "prod-01",
    name: "Sunum ERP Çekirdek Lisansı (Kurumsal Sınırsız)",
    description: "Tüm kurumsal modülleri içeren sınırsız kullanıcı ve sınırsız işlem kapasiteli ERP çekirdek sistemi.",
    unit: "Lisans",
    category: "Yazılım",
    price: 150000,
    stock: 999,
    isActive: true,
    prices: [
      { id: "p1-1", price: 150000, branch: { id: mockBranchId, name: "Merkez Şube" } }
    ]
  },
  {
    id: "prod-02",
    name: "B2B Sipariş ve Bayi Yönetim Modülü",
    description: "Bayi sipariş portalı, dinamik fiyat listeleri, iskonto matrisi ve anlık stok sorgulama sistemi.",
    unit: "Modül",
    category: "Yazılım",
    price: 45000,
    stock: 999,
    isActive: true,
    prices: [
      { id: "p2-1", price: 45000, branch: { id: mockBranchId, name: "Merkez Şube" } }
    ]
  },
  {
    id: "prod-03",
    name: "İnsan Kaynakları & Personel Denetim Paketi",
    description: "Kapsamlı izin, avans, bordro yönetimi, aday havuzu ve gün sonu denetim raporlama sistemi.",
    unit: "Paket",
    category: "Yazılım",
    price: 35000,
    stock: 999,
    isActive: true,
    prices: [
      { id: "p3-1", price: 35000, branch: { id: mockBranchId, name: "Merkez Şube" } }
    ]
  },
  {
    id: "prod-04",
    name: "Finans & e-Fatura / e-İrsaliye Entegrasyon Modülü",
    description: "GİB uyumlu e-fatura, e-arşiv, e-irsaliye ve otomatik banka ekstre mutabakat altyapısı.",
    unit: "Modül",
    category: "Yazılım",
    price: 28000,
    stock: 999,
    isActive: true,
    prices: [
      { id: "p4-1", price: 28000, branch: { id: mockBranchId, name: "Merkez Şube" } }
    ]
  },
  {
    id: "prod-05",
    name: "Kuşçu AI Asistan & Akıllı İş Analitiği Paketi",
    description: "Yapay zeka tabanlı doğal dil sorgulama, otomatik sipariş tahmini ve akıllı içgörü motoru.",
    unit: "Lisans",
    category: "Yapay Zeka",
    price: 55000,
    stock: 999,
    isActive: true,
    prices: [
      { id: "p5-1", price: 55000, branch: { id: mockBranchId, name: "Merkez Şube" } }
    ]
  },
  {
    id: "prod-06",
    name: "Çoklu Şube & Konsolidasyon Lisansı",
    description: "Sınırsız şube ekleme, şubeler arası stok transferi ve konsolide finansal raporlama eklentisi.",
    unit: "Modül",
    category: "Yazılım",
    price: 60000,
    stock: 999,
    isActive: true,
    prices: [
      { id: "p6-1", price: 60000, branch: { id: mockBranchId, name: "Merkez Şube" } }
    ]
  },
  {
    id: "prod-07",
    name: "Saha Satış & Mobil POS Entegrasyon Terminali",
    description: "Kurye ve saha satış temsilcileri için NFC destekli mobil ödeme ve anlık fatura kesim cihazı.",
    unit: "Adet",
    category: "Donanım",
    price: 18500,
    stock: 45,
    isActive: true,
    prices: [
      { id: "p7-1", price: 18500, branch: { id: mockBranchId, name: "Merkez Şube" } }
    ]
  },
  {
    id: "prod-08",
    name: "Barkod & RFID Depo Yönetim Donanım Kiti",
    description: "Endüstriyel el terminali, 2D barkod tarayıcı ve kablosuz termal fiş/etiket yazıcı donanım seti.",
    unit: "Set",
    category: "Donanım",
    price: 24000,
    stock: 28,
    isActive: true,
    prices: [
      { id: "p8-1", price: 24000, branch: { id: mockBranchId, name: "Merkez Şube" } }
    ]
  }
]

export const INITIAL_STOCK_REQUESTS: MockStockRequest[] = [
  {
    id: "req-01",
    productId: "prod-07",
    quantity: 6,
    notes: "Getir saha ekibi için ek mobil POS terminalleri temini.",
    status: "approved",
    createdAt: getRelativeDate(-2, 10, 15),
    branchId: mockBranchId,
    branch: { id: mockBranchId, name: "Merkez Şube" },
    product: INITIAL_STORE_PRODUCTS[6]
  },
  {
    id: "req-02",
    productId: "prod-08",
    quantity: 4,
    notes: "Trendyol aktarma deposu için ek el terminalleri kiti.",
    status: "delivered",
    createdAt: getRelativeDate(-5, 14, 30),
    branchId: mockBranchId,
    branch: { id: mockBranchId, name: "Merkez Şube" },
    product: INITIAL_STORE_PRODUCTS[7]
  },
  {
    id: "req-03",
    productId: "prod-05",
    quantity: 1,
    notes: "Vodafone kurumsal ekibi için Kuşçu AI lisans aktivasyonu.",
    status: "pending",
    createdAt: getRelativeDate(-1, 16, 0),
    branchId: mockBranchId,
    branch: { id: mockBranchId, name: "Merkez Şube" },
    product: INITIAL_STORE_PRODUCTS[4]
  }
]

export const INITIAL_HR_CANDIDATES: MockHRCandidate[] = [
  {
    id: "hr-01",
    firstName: "Selin",
    lastName: "Güneş",
    email: "selin.gunes@email.com",
    phone: "0532 555 1010",
    position: "Kıdemli Full Stack & ERP Geliştirici",
    status: "Aktif",
    kanbanStatus: "Ise Alindi",
    department: "Yazılım & Ar-Ge",
    rating: 5,
    skills: "Next.js, TypeScript, PostgreSQL, Prisma, ERP Mimarisi, Mikroservisler",
    experienceYears: 8,
    education: "ODTÜ Bilgisayar Mühendisliği (Yüksek Lisans)",
    documents: [],
    chats: [],
    applicationDate: getRelativeDateStr(-20)
  },
  {
    id: "hr-02",
    firstName: "Emre",
    lastName: "Yıldırım",
    email: "emre.yildirim@email.com",
    phone: "0533 444 2020",
    position: "Lead UI/UX & Tasarım Sistemleri Lideri",
    status: "Aktif",
    kanbanStatus: "Teklif",
    department: "Ürün Tasarımı",
    rating: 5,
    skills: "Figma, Design Systems, Tailwind CSS, ERP Arayüz Deneyimi, User Research",
    experienceYears: 6,
    education: "İTÜ Endüstri Ürünleri Tasarımı",
    documents: [],
    chats: [],
    applicationDate: getRelativeDateStr(-12)
  },
  {
    id: "hr-03",
    firstName: "Ayşe",
    lastName: "Polat",
    email: "ayse.polat@email.com",
    phone: "0542 333 3030",
    position: "Kurumsal Çözüm & Satış Yöneticisi",
    status: "Aktif",
    kanbanStatus: "Mulakat",
    department: "Satış & İş Geliştirme",
    rating: 4,
    skills: "B2B Satış, ERP Satış Danışmanlığı, Müşteri İlişkileri, Sözleşme Müzakeresi",
    experienceYears: 5,
    education: "Boğaziçi Üniversitesi İşletme",
    documents: [],
    chats: [],
    applicationDate: getRelativeDateStr(-8)
  },
  {
    id: "hr-04",
    firstName: "Kerem",
    lastName: "Aksoy",
    email: "kerem.aksoy@email.com",
    phone: "0505 222 4040",
    position: "Finansal Analist & Muhasebe Uzmanı",
    status: "Aktif",
    kanbanStatus: "Ise Alindi",
    department: "Finans & Muhasebe",
    rating: 5,
    skills: "Maliyet Muhasebesi, e-Fatura, Finansal Modelleme, Bütçe ve Nakit Akışı",
    experienceYears: 7,
    education: "Marmara Üniversitesi İktisat",
    documents: [],
    chats: [],
    applicationDate: getRelativeDateStr(-25)
  },
  {
    id: "hr-05",
    firstName: "Derya",
    lastName: "Çetin",
    email: "derya.cetin@email.com",
    phone: "0531 111 5050",
    position: "DevOps & Bulut Altyapı Mühendisi",
    status: "Aktif",
    kanbanStatus: "Mulakat",
    department: "Altyapı & Sistem",
    rating: 4,
    skills: "AWS, Kubernetes, Docker, CI/CD, Terraform, Linux Sistem Yönetimi",
    experienceYears: 4,
    education: "Yıldız Teknik Üniversitesi Bilgisayar Mühendisliği",
    documents: [],
    chats: [],
    applicationDate: getRelativeDateStr(-5)
  },
  {
    id: "hr-06",
    firstName: "Barış",
    lastName: "Tekin",
    email: "baris.tekin@email.com",
    phone: "0536 777 6060",
    position: "QA & Test Otomasyon Mühendisi",
    status: "Aktif",
    kanbanStatus: "Basvurdu",
    department: "Kalite Güvence",
    rating: 4,
    skills: "Playwright, Cypress, Jest, API Testing, Regresyon Testleri, Jest",
    experienceYears: 3,
    education: "Hacettepe Üniversitesi Bilgisayar Mühendisliği",
    documents: [],
    chats: [],
    applicationDate: getRelativeDateStr(-2)
  },
  {
    id: "hr-07",
    firstName: "Merve",
    lastName: "Şimşek",
    email: "merve.simsek@email.com",
    phone: "0544 888 7070",
    position: "İnsan Kaynakları & Bordro Uzmanı",
    status: "Aktif",
    kanbanStatus: "Ise Alindi",
    department: "İnsan Kaynakları",
    rating: 5,
    skills: "SGK Mevzuatı, Bordro Hesaplama, Yetenek Yönetimi, Personel Özlük İşleri",
    experienceYears: 5,
    education: "İstanbul Üniversitesi İnsan Kaynakları Yönetimi",
    documents: [],
    chats: [],
    applicationDate: getRelativeDateStr(-30)
  }
]

export const INITIAL_HR_REQUESTS: MockHRRequest[] = [
  {
    id: "REQ-0432",
    title: "Sosyal Medya Lansman Etkinlik Harcamaları",
    category: "finans",
    summary: "Marka lansman etkinliği bütçesi ve ikram avansı talebi.",
    description: "Yeni kurumsal sürüm lansman etkinliğinde kullanılmak üzere basılı materyaller ve ikram harcamaları için avans ihtiyacı bulunmaktadır. Faturalar muhasebeye teslim edilecektir.",
    priority: "Acil",
    status: "pending",
    createdAt: getRelativeDate(-2, 11, 0),
    updatedAt: getRelativeDate(-2, 11, 0),
    uploadedFiles: ["lansman_butce_tablosu.xlsx", "etkinlik_programi.pdf"],
    approver: "Hakan Yılmaz (Operasyon Direktörü)",
    requester: { name: "Aylin Kaya", avatarUrl: null, role: "Sosyal Medya Takım Lideri" },
    amount: 15000,
    reason: "Proje Harcamaları",
    expectedDate: getRelativeDateStr(2)
  },
  {
    id: "REQ-0431",
    title: "Yıllık İzin Talebi - Temmuz/Ağustos Dönemi",
    category: "ik",
    summary: "5 günlük yıllık izin kullanımı ve iş teslim planı.",
    description: "Yaz dönemi planlaması dahilinde 5 iş günü sürecek yıllık izin talebidir. İzin süresince acil konular için Melis Şen vekil tayin edilmiştir. Tüm müşteri takvimleri planlanmıştır.",
    priority: "Normal",
    status: "approved",
    createdAt: getRelativeDate(-3, 9, 30),
    updatedAt: getRelativeDate(-3, 15, 20),
    uploadedFiles: ["izin_devir_notlari.pdf"],
    approver: "Zeynep Demir (İK Müdürü)",
    requester: { name: "Cem Aslan", avatarUrl: null, role: "Kreatif Grup Lideri" },
    leaveType: "Yıllık İzin",
    startDate: getRelativeDateStr(7),
    endDate: getRelativeDateStr(12),
    daysCount: 5,
    proxyEmployee: "Melis Şen",
    managerComment: "İş devir planı incelenmiş ve onaylanmıştır. İyi tatiller.",
    decisionDate: getRelativeDate(-3, 15, 20)
  },
  {
    id: "REQ-0430",
    title: "Yaratıcı Ekip İçin Mac Studio Donanım Yükseltmesi",
    category: "it",
    summary: "3D Render ve Video Kurgu iş istasyonu talebi.",
    description: "Artan 4K video ve kurumsal animasyon render iş yükü için Apple Mac Studio (M2 Max, 64GB RAM) donanım yükseltmesi talep edilmektedir.",
    priority: "Kritik",
    status: "pending",
    createdAt: getRelativeDate(-4, 8, 15),
    updatedAt: getRelativeDate(-4, 17, 40),
    uploadedFiles: ["donanim_teknik_karsilastirma.xlsx"],
    approver: "Ahmet Kurt (IT Departman Sorumlusu)",
    requester: { name: "Volkan Çelik", avatarUrl: null, role: "Video Production Manager" },
    hardwareType: "Masaüstü Bilgisayar (Workstation)",
    brandModel: "Apple Mac Studio M2 Max (64GB, 1TB SSD)",
    managerComment: "Bütçe onayına sunulmuştur, teknik gereksinimler doğrulanmıştır."
  },
  {
    id: "REQ-0429",
    title: "Ortak Çalışma Alanı Ergonomik Sandalyeleri",
    category: "ofis",
    summary: "Tasarım ofisi ortak çalışma alanı için 6 adet ergonomik çalışma sandalyesi.",
    description: "Çalışma saatlerinde personel sağlığını desteklemek amacıyla sırt destekli ergonomik çalışma sandalyelerinin temini talebidir.",
    priority: "Normal",
    status: "completed",
    createdAt: getRelativeDate(-7, 10, 0),
    updatedAt: getRelativeDate(-5, 11, 30),
    uploadedFiles: ["teklif_proforma.pdf"],
    approver: "Mustafa Kaya (Satın Alma Sorumlusu)",
    requester: { name: "Gizem Kurt", avatarUrl: null, role: "Ofis Koordinatörü" },
    managerComment: "Sandalyeler teslim alınmış ve kurulmuştur.",
    decisionDate: getRelativeDate(-5, 11, 30)
  },
  {
    id: "REQ-0428",
    title: "Müşteri Saha Ziyaretleri Ulaşım & Yakıt Avansı",
    category: "finans",
    summary: "Ankara ve Bursa şube ziyaretleri kurumsal araç yakıt ve konaklama avansı.",
    description: "Şube denetim ve kurumsal müşteri görüşmeleri için 3 günlük seyahat avansı talebidir.",
    priority: "Acil",
    status: "approved",
    createdAt: getRelativeDate(-1, 14, 0),
    updatedAt: getRelativeDate(0, 9, 30),
    uploadedFiles: ["ziyaret_takvimi.pdf"],
    approver: "Hakan Yılmaz (Operasyon Direktörü)",
    requester: { name: "Caner Şahin", avatarUrl: null, role: "Saha Operasyon Lideri" },
    amount: 8500,
    reason: "Saha Ziyaretleri",
    expectedDate: getRelativeDateStr(1),
    managerComment: "Onaylandı. Harcama fişlerini muhasebeye teslim ediniz.",
    decisionDate: getRelativeDate(0, 9, 30)
  },
  {
    id: "REQ-0427",
    title: "AWS Certified Solutions Architect Sınav & Eğitim Desteği",
    category: "ik",
    summary: "Bulut altyapı mühendisleri için AWS sertifikasyon sınav ücreti desteği.",
    description: "Kurumsal bulut yetkinliğimizi belgelemek amacıyla yazılım ve devops ekibinden 2 kişinin AWS sertifika sınav bedelidir.",
    priority: "Normal",
    status: "approved",
    createdAt: getRelativeDate(-5, 10, 0),
    updatedAt: getRelativeDate(-4, 16, 0),
    uploadedFiles: ["aws_sertifika_detaylari.pdf"],
    approver: "Zeynep Demir (İK Müdürü)",
    requester: { name: "Derya Çetin", avatarUrl: null, role: "DevOps Mühendisi" },
    amount: 12000,
    reason: "Eğitim ve Sertifikasyon",
    managerComment: "Eğitim bütçesinden karşılanmak üzere onaylandı.",
    decisionDate: getRelativeDate(-4, 16, 0)
  }
]

export const INITIAL_MONTHLY_FINANCIALS: MockMonthlyFinancial[] = [
  { month: "Ocak", income: 980000, expense: 420000, profit: 560000 },
  { month: "Şubat", income: 1050000, expense: 440000, profit: 610000 },
  { month: "Mart", income: 1120000, expense: 430000, profit: 690000 },
  { month: "Nisan", income: 1190000, expense: 460000, profit: 730000 },
  { month: "Mayıs", income: 1250000, expense: 480000, profit: 770000 },
  { month: "Haziran (Tahmini)", income: 1340000, expense: 510000, profit: 830000 }
]

export const INITIAL_SPENDING_BY_KIND = [
  { name: "Bulut & Altyapı Sunucuları", value: 85000 },
  { name: "Yazılım & Lisans Giderleri", value: 95000 },
  { name: "Ofis Kirası & Sabit Giderler", value: 140000 },
  { name: "Pazarlama & Büyüme Yönetimi", value: 110000 },
  { name: "Prodüksiyon & Ar-Ge Ekipmanı", value: 50000 }
]

export const INITIAL_FINANCES: MockFinanceRecord[] = [
  { id: "fin-01", branchId: mockBranchId, type: "INCOME", amount: 350000, category: "Hizmet Satışı", description: "Koç Holding A.Ş. - Kurumsal ERP Dönüşüm Lisansı", date: getRelativeDateStr(-2), status: "approved", branch: { id: mockBranchId, name: "Merkez Şube" } },
  { id: "fin-02", branchId: mockBranchId, type: "INCOME", amount: 180000, category: "Hizmet Satışı", description: "Ziraat Bankası A.Ş. - B2B Entegrasyon Paketi hakedişi", date: getRelativeDateStr(-5), status: "approved", branch: { id: mockBranchId, name: "Merkez Şube" } },
  { id: "fin-03", branchId: mockBranchId, type: "INCOME", amount: 125000, category: "Hizmet Satışı", description: "Çiçek Sepeti - Kuşçu AI & WhatsApp Sipariş Botu", date: getRelativeDateStr(-1), status: "approved", branch: { id: mockBranchId, name: "Merkez Şube" } },
  { id: "fin-04", branchId: mockBranchId, type: "INCOME", amount: 95000, category: "Hizmet Satışı", description: "Trendyol Lojistik - Barkod & Depo Entegrasyonu", date: getRelativeDateStr(-3), status: "approved", branch: { id: mockBranchId, name: "Merkez Şube" } },
  { id: "fin-05", branchId: mockBranchId, type: "INCOME", amount: 85000, category: "Hizmet Satışı", description: "Vodafone Türkiye - İK & Performans Modülü", date: getRelativeDateStr(-4), status: "approved", branch: { id: mockBranchId, name: "Merkez Şube" } },
  { id: "fin-06", branchId: mockBranchId, type: "INCOME", amount: 110000, category: "Hizmet Satışı", description: "Sabancı Grubu - Merkezi Şube Konsolidasyon Lisansı", date: getRelativeDateStr(0), status: "approved", branch: { id: mockBranchId, name: "Merkez Şube" } },
  { id: "fin-07", branchId: mockBranchId, type: "INCOME", amount: 88000, category: "Hizmet Satışı", description: "Getir - Saha Satış & POS Terminalleri", date: getRelativeDateStr(-2), status: "approved", branch: { id: mockBranchId, name: "Merkez Şube" } },
  { id: "fin-08", branchId: mockBranchId, type: "INCOME", amount: 72000, category: "Hizmet Satışı", description: "Garanti BBVA - Hibrit Bulut Yedekleme Altyapısı", date: getRelativeDateStr(-7), status: "approved", branch: { id: mockBranchId, name: "Merkez Şube" } },
  { id: "fin-09", branchId: mockBranchId, type: "INCOME", amount: 64000, category: "Hizmet Satışı", description: "Eczacıbaşı Bilişim - GİB e-Fatura Entegratörü", date: getRelativeDateStr(-6), status: "approved", branch: { id: mockBranchId, name: "Merkez Şube" } },
  { id: "fin-10", branchId: mockBranchId, type: "INCOME", amount: 52000, category: "Hizmet Satışı", description: "Türk Telekom Grubu - SMS & Bildirim Gateway", date: getRelativeDateStr(-8), status: "approved", branch: { id: mockBranchId, name: "Merkez Şube" } },
  { id: "fin-11", branchId: mockBranchId, type: "INCOME", amount: 29000, category: "Danışmanlık", description: "Arçelik Global - Yıllık SLA ve Danışmanlık Bakımı", date: getRelativeDateStr(-10), status: "approved", branch: { id: mockBranchId, name: "Merkez Şube" } },
  { id: "fin-e01", branchId: mockBranchId, type: "EXPENSE", amount: 140000, category: "Kira", description: "Merkez Ofis Levent Kanyon kira ve bina işletme aidatı", date: getRelativeDateStr(-5), status: "approved", branch: { id: mockBranchId, name: "Merkez Şube" } },
  { id: "fin-e02", branchId: mockBranchId, type: "EXPENSE", amount: 85000, category: "Donanım & Yazılım", description: "AWS Dedicated Cloud sunucuları ve Cloudflare WAF altyapısı", date: getRelativeDateStr(-3), status: "approved", branch: { id: mockBranchId, name: "Merkez Şube" } },
  { id: "fin-e03", branchId: mockBranchId, type: "EXPENSE", amount: 95000, category: "Donanım & Yazılım", description: "Adobe Creative Cloud, Figma ve Atlassian kurumsal lisansları", date: getRelativeDateStr(-6), status: "approved", branch: { id: mockBranchId, name: "Merkez Şube" } },
  { id: "fin-e04", branchId: mockBranchId, type: "EXPENSE", amount: 110000, category: "Pazarlama & Reklam", description: "Q3 Dijital Büyüme ve Google / LinkedIn reklam kampanyaları", date: getRelativeDateStr(-8), status: "approved", branch: { id: mockBranchId, name: "Merkez Şube" } },
  { id: "fin-e05", branchId: mockBranchId, type: "EXPENSE", amount: 50000, category: "Donanım & Yazılım", description: "Stüdyo 4K kamera ve test donanım kiti tedariği", date: getRelativeDateStr(-12), status: "approved", branch: { id: mockBranchId, name: "Merkez Şube" } }
]

// ── Interactive In-Memory & LocalStorage Database Service ───────────────────

const STORAGE_KEY = "sunum_erp_public_demo_database_v2"

interface DatabaseState {
  customers: MockCustomer[]
  orders: MockOrder[]
  calendarEvents: MockCalendarEvent[]
  products: MockStoreProduct[]
  stockRequests: MockStockRequest[]
  candidates: MockHRCandidate[]
  requests: MockHRRequest[]
  finances: MockFinanceRecord[]
}

class MockDatabaseService {
  private state: DatabaseState

  constructor() {
    this.state = this.loadInitialState()
  }

  private loadInitialState(): DatabaseState {
    if (typeof window !== "undefined") {
      try {
        const stored = localStorage.getItem(STORAGE_KEY)
        if (stored) {
          const parsed = JSON.parse(stored)
          if (parsed && Array.isArray(parsed.customers) && parsed.customers.length > 0) {
            return parsed
          }
        }
      } catch (err) {
        console.warn("[MockDatabase] LocalStorage load failed, using defaults:", err)
      }
    }

    return {
      customers: [...INITIAL_CUSTOMERS],
      orders: [...INITIAL_ORDERS],
      calendarEvents: [...INITIAL_CALENDAR_EVENTS],
      products: [...INITIAL_STORE_PRODUCTS],
      stockRequests: [...INITIAL_STOCK_REQUESTS],
      candidates: [...INITIAL_HR_CANDIDATES],
      requests: [...INITIAL_HR_REQUESTS],
      finances: [...INITIAL_FINANCES]
    }
  }

  private persist() {
    if (typeof window !== "undefined") {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(this.state))
        window.dispatchEvent(
          new CustomEvent("sunum-mockdb-change", {
            detail: { timestamp: Date.now() }
          })
        )
      } catch (err) {
        console.warn("[MockDatabase] LocalStorage save failed:", err)
      }
    }
  }

  // ── KPI & Dashboard Stats ──
  public getStats(): MockKPIStats {
    const totalIncome = 1250000
    const totalExpense = 480000

    const recentActivities = [
      {
        id: "act-01",
        type: "Sipariş",
        description: "Koç Holding A.Ş. - Kurumsal ERP Dönüşüm Lisansı (350.000 ₺)",
        time: "Bugün 11:30",
        rawDate: new Date()
      },
      {
        id: "act-02",
        type: "Sipariş",
        description: "Ziraat Bankası A.Ş. - B2B Entegrasyon Paketi teslim edildi (180.000 ₺)",
        time: "Dün 16:20",
        rawDate: new Date(Date.now() - 86400000)
      },
      {
        id: "act-03",
        type: "Proje",
        description: "Vodafone B2B Satış Portalı devreye alma fazı başlatıldı",
        time: "2 gün önce",
        rawDate: new Date(Date.now() - 172800000)
      },
      {
        id: "act-04",
        type: "Personel Talebi",
        description: "Aylin Kaya - Sosyal Medya Lansman Etkinlik Harcamaları (15.000 ₺) onaylandı",
        time: "2 gün önce",
        rawDate: new Date(Date.now() - 172800000)
      },
      {
        id: "act-05",
        type: "Müşteri",
        description: "Trendyol Lojistik A.Ş. kurumsal müşteri sözleşmesi aktif edildi",
        time: "3 gün önce",
        rawDate: new Date(Date.now() - 259200000)
      },
      {
        id: "act-06",
        type: "Tahsilat",
        description: "Ziraat Bankası hakediş tahsilatı (180.000 ₺) hesabımıza geçti",
        time: "4 gün önce",
        rawDate: new Date(Date.now() - 345600000)
      },
      {
        id: "act-07",
        type: "İK",
        description: "Selin Güneş - Kıdemli ERP Geliştirici işe alım onaylandı",
        time: "5 gün önce",
        rawDate: new Date(Date.now() - 432000000)
      },
      {
        id: "act-08",
        type: "Randevu",
        description: "Garanti BBVA Q3 Bütçe ve Sözleşme Görüşmesi tamamlandı",
        time: "Geçen hafta",
        rawDate: new Date(Date.now() - 604800000)
      }
    ]

    return {
      customers: 142,
      activeProjects: 28,
      totalProjects: 34,
      leads: 45,
      income: totalIncome,
      expense: totalExpense,
      netProfit: totalIncome - totalExpense,
      spendingByKind: INITIAL_SPENDING_BY_KIND,
      recentActivities
    }
  }

  // ── Customers ──
  public getCustomers(): MockCustomer[] {
    return [...this.state.customers]
  }

  public getCustomerById(id: string): MockCustomer | undefined {
    return this.state.customers.find(c => c.id === id)
  }

  public addCustomer(data: Partial<MockCustomer>): MockCustomer {
    const newCustomer: MockCustomer = {
      id: `cust-${Date.now()}`,
      branchId: data.branchId || mockBranchId,
      name: data.name || "Yeni Müşteri",
      company: data.company || "Yeni Şirket A.Ş.",
      email: data.email || "info@yenisirket.com",
      phone: data.phone || "0555 000 0000",
      address: data.address || "İstanbul / Türkiye",
      status: (data.status as any) || "active",
      scoreTemp: (data.scoreTemp as any) || "Sıcak",
      purchaseProb: data.purchaseProb || 85,
      segment: (data.segment as any) || "A",
      recallDate: data.recallDate || getRelativeDateStr(7),
      anniversary: data.anniversary || "1990-01-01",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      notes: [],
      chats: [],
      documents: [],
      tasks: [],
      contacts: [],
      orders: []
    }
    this.state.customers.unshift(newCustomer)
    this.persist()
    return newCustomer
  }

  public updateCustomer(id: string, updates: Partial<MockCustomer>): MockCustomer | null {
    const idx = this.state.customers.findIndex(c => c.id === id)
    if (idx === -1) return null
    this.state.customers[idx] = {
      ...this.state.customers[idx],
      ...updates,
      updatedAt: new Date().toISOString()
    }
    this.persist()
    return this.state.customers[idx]
  }

  public deleteCustomer(id: string): boolean {
    const initialLen = this.state.customers.length
    this.state.customers = this.state.customers.filter(c => c.id !== id)
    if (this.state.customers.length !== initialLen) {
      this.persist()
      return true
    }
    return false
  }

  // ── Orders ──
  public getOrders(): MockOrder[] {
    return [...this.state.orders]
  }

  public getOrderById(id: string): MockOrder | undefined {
    return this.state.orders.find(o => o.id === id)
  }

  public addOrder(data: Partial<MockOrder>): MockOrder {
    const count = this.state.orders.length + 1
    const orderNumber = `ORD-2026-${String(count).padStart(3, "0")}`
    const newOrder: MockOrder = {
      id: `ord-${Date.now()}`,
      orderNumber,
      branchId: data.branchId || mockBranchId,
      orderType: data.orderType || "Kurumsal Sipariş",
      title: data.title || "Yeni Sipariş Kaydı",
      description: data.description || "",
      quantity: data.quantity || 1,
      priority: (data.priority as any) || "normal",
      status: (data.status as any) || "pending",
      paymentStatus: (data.paymentStatus as any) || "unpaid",
      totalAmount: Number(data.totalAmount) || 50000,
      customerName: data.customerName || "Kurumsal Müşteri",
      companyName: data.companyName || "Kurumsal Firma",
      customerPhone: data.customerPhone || "0555 123 4567",
      orderDate: data.orderDate || new Date().toISOString().split("T")[0],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      customerId: data.customerId,
      customer: data.customerId
        ? {
            id: data.customerId,
            name: data.customerName || "Müşteri",
            company: data.companyName || "Şirket"
          }
        : undefined
    }
    this.state.orders.unshift(newOrder)
    this.persist()
    return newOrder
  }

  public updateOrder(id: string, updates: Partial<MockOrder>): MockOrder | null {
    const idx = this.state.orders.findIndex(o => o.id === id)
    if (idx === -1) return null
    this.state.orders[idx] = {
      ...this.state.orders[idx],
      ...updates,
      updatedAt: new Date().toISOString()
    }
    this.persist()
    return this.state.orders[idx]
  }

  public deleteOrder(id: string): boolean {
    const initialLen = this.state.orders.length
    this.state.orders = this.state.orders.filter(o => o.id !== id)
    if (this.state.orders.length !== initialLen) {
      this.persist()
      return true
    }
    return false
  }

  // ── Calendar Events ──
  public getCalendarEvents(from?: string, to?: string): MockCalendarEvent[] {
    return [...this.state.calendarEvents]
  }

  public addCalendarEvent(data: Partial<MockCalendarEvent>): MockCalendarEvent {
    const newEvent: MockCalendarEvent = {
      id: `cal-${Date.now()}`,
      title: data.title || "Yeni Randevu",
      date: data.date || new Date().toISOString(),
      endDate: data.endDate,
      type: (data.type as any) || "appointment",
      color: data.color || "#3b82f6",
      description: data.description || "",
      location: data.location || "Merkez Ofis",
      amount: data.amount,
      status: data.status || "confirmed"
    }
    this.state.calendarEvents.push(newEvent)
    this.persist()
    return newEvent
  }

  public deleteCalendarEvent(id: string): boolean {
    const initialLen = this.state.calendarEvents.length
    this.state.calendarEvents = this.state.calendarEvents.filter(e => e.id !== id)
    if (this.state.calendarEvents.length !== initialLen) {
      this.persist()
      return true
    }
    return false
  }

  // ── Store Products ──
  public getProducts(): MockStoreProduct[] {
    return [...this.state.products]
  }

  public addProduct(data: Partial<MockStoreProduct>): MockStoreProduct {
    const newProduct: MockStoreProduct = {
      id: `prod-${Date.now()}`,
      name: data.name || "Yeni Ürün",
      description: data.description || "",
      unit: data.unit || "Adet",
      category: data.category || "Yazılım",
      price: Number(data.price) || 25000,
      stock: data.stock || 100,
      isActive: true,
      prices: [
        { id: `p-${Date.now()}`, price: Number(data.price) || 25000, branch: { id: mockBranchId, name: "Merkez Şube" } }
      ]
    }
    this.state.products.push(newProduct)
    this.persist()
    return newProduct
  }

  public updateProduct(id: string, updates: Partial<MockStoreProduct>): MockStoreProduct | null {
    const idx = this.state.products.findIndex(p => p.id === id)
    if (idx === -1) return null
    this.state.products[idx] = {
      ...this.state.products[idx],
      ...updates
    }
    this.persist()
    return this.state.products[idx]
  }

  // ── Stock Requests ──
  public getStockRequests(): MockStockRequest[] {
    return [...this.state.stockRequests]
  }

  public addStockRequest(data: Partial<MockStockRequest>): MockStockRequest {
    const matchedProduct = this.state.products.find(p => p.id === data.productId)
    const newRequest: MockStockRequest = {
      id: `req-${Date.now()}`,
      productId: data.productId,
      customProduct: data.customProduct || matchedProduct?.name || "Özel Talep",
      quantity: Number(data.quantity) || 1,
      notes: data.notes || "",
      status: "pending",
      createdAt: new Date().toISOString(),
      branchId: data.branchId || mockBranchId,
      branch: { id: mockBranchId, name: "Merkez Şube" },
      product: matchedProduct
    }
    this.state.stockRequests.unshift(newRequest)
    this.persist()
    return newRequest
  }

  // ── HR Candidates ──
  public getCandidates(): MockHRCandidate[] {
    return [...this.state.candidates]
  }

  public addCandidate(data: Partial<MockHRCandidate>): MockHRCandidate {
    const newCandidate: MockHRCandidate = {
      id: `hr-${Date.now()}`,
      firstName: data.firstName || "Yeni",
      lastName: data.lastName || "Aday",
      email: data.email || "aday@sunumerp.com",
      phone: data.phone || "0555 111 2233",
      position: data.position || "Yazılım Uzmanı",
      status: "Aktif",
      kanbanStatus: (data.kanbanStatus as any) || "Basvurdu",
      department: data.department || "Yazılım",
      rating: data.rating || 4,
      skills: data.skills || "TypeScript, React, ERP",
      experienceYears: data.experienceYears || 3,
      education: data.education || "Üniversite",
      documents: [],
      chats: [],
      applicationDate: new Date().toISOString().split("T")[0]
    }
    this.state.candidates.unshift(newCandidate)
    this.persist()
    return newCandidate
  }

  public updateCandidate(id: string, updates: Partial<MockHRCandidate>): MockHRCandidate | null {
    const idx = this.state.candidates.findIndex(c => c.id === id)
    if (idx === -1) return null
    this.state.candidates[idx] = {
      ...this.state.candidates[idx],
      ...updates
    }
    this.persist()
    return this.state.candidates[idx]
  }

  // ── HR Requests ──
  public getHRRequests(): MockHRRequest[] {
    return [...this.state.requests]
  }

  public addHRRequest(data: Partial<MockHRRequest>): MockHRRequest {
    const count = this.state.requests.length + 1
    const id = `REQ-${String(count + 430).padStart(4, "0")}`
    const newRequest: MockHRRequest = {
      id,
      title: data.title || "Yeni Personel Talebi",
      category: (data.category as any) || "ofis",
      summary: data.summary || data.title || "Talep özeti",
      description: data.description || "",
      priority: (data.priority as any) || "Normal",
      status: (data.status as any) || "pending",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      uploadedFiles: data.uploadedFiles || [],
      approver: data.approver || "Operasyon Yönetimi",
      requester: data.requester || { name: "Demo Kullanıcı", avatarUrl: null, role: "Personel" },
      amount: data.amount,
      reason: data.reason,
      expectedDate: data.expectedDate,
      hardwareType: data.hardwareType,
      brandModel: data.brandModel,
      leaveType: data.leaveType,
      startDate: data.startDate,
      endDate: data.endDate,
      daysCount: data.daysCount,
      proxyEmployee: data.proxyEmployee
    }
    this.state.requests.unshift(newRequest)
    this.persist()
    return newRequest
  }

  public updateHRRequest(id: string, updates: Partial<MockHRRequest>): MockHRRequest | null {
    const idx = this.state.requests.findIndex(r => r.id === id)
    if (idx === -1) return null
    this.state.requests[idx] = {
      ...this.state.requests[idx],
      ...updates,
      updatedAt: new Date().toISOString()
    }
    this.persist()
    return this.state.requests[idx]
  }

  // ── Finances ──
  public getFinances(): MockFinanceRecord[] {
    return this.state.finances && this.state.finances.length > 0
      ? [...this.state.finances]
      : [...INITIAL_FINANCES]
  }

  // ── Reset ──
  public resetToDefault() {
    this.state = {
      customers: [...INITIAL_CUSTOMERS],
      orders: [...INITIAL_ORDERS],
      calendarEvents: [...INITIAL_CALENDAR_EVENTS],
      products: [...INITIAL_STORE_PRODUCTS],
      stockRequests: [...INITIAL_STOCK_REQUESTS],
      candidates: [...INITIAL_HR_CANDIDATES],
      requests: [...INITIAL_HR_REQUESTS],
      finances: [...INITIAL_FINANCES]
    }
    this.persist()
  }
}

// Global Singleton Instance
export const mockDatabase = new MockDatabaseService()

// Default export
export default mockDatabase
