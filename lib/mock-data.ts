// Global Mock Data for CRM Demo Mode
// All data is themed around a Turkish Creative & Digital Agency: Çiçekana ERP

export interface MockCustomer {
  id: string
  branchId: string
  name: string
  company: string
  email: string
  phone: string
  address: string
  status: "active" | "passive" | "blacklist"
  scoreTemp: string
  purchaseProb: number
  segment: "A" | "B" | "C" | "Kurumsal"
  recallDate: string
  anniversary: string
  createdAt: string
  updatedAt: string
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
  totalAmount?: number
  customerName?: string
  companyName?: string
  customerPhone?: string
  orderDate: string
  createdAt: string
  updatedAt: string
  customerId?: string
}

export interface MockProject {
  id: string
  branchId: string
  name: string
  description?: string
  status: "active" | "completed" | "on-hold" | "planning"
  progress: number
  customerNotes?: string
  startDate?: string
  endDate?: string
  createdAt: string
  updatedAt: string
}

export interface MockUser {
  id: string
  username: string
  fullName: string
  avatarUrl?: string | null
  email: string
  isActive: boolean
}

export interface MockMessage {
  id: string
  fromUserId: string
  toUserId?: string
  branchId?: string
  content: string
  fileUrl?: string
  fileType?: string
  isRead: boolean
  createdAt: string
  fromUser: { id: string; username: string; fullName: string; avatarUrl?: string | null }
}

export interface MockCalendarEvent {
  id: string
  title: string
  date: string // ISO date string
  endDate?: string
  type: "appointment" | "income_payment" | "expense_payment" | "reminder" | "todo" | "content_calendar"
  color: string
  description?: string
  amount?: number
  status?: string
  allDay?: boolean
  location?: string
}

export interface MockRequestItem {
  id: string
  title: string
  category: string
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

const mockBranchId = "local-debug-branch"

// 1. MÜŞTERİLER (Customers - 12 Prestijli Kurumsal Marka)
export const mockCustomers: MockCustomer[] = [
  {
    id: "cust-01",
    branchId: mockBranchId,
    name: "Ahmet Yılmaz",
    company: "Ziraat Bankası A.Ş.",
    email: "ahmet.yilmaz@ziraatbank.com.tr",
    phone: "0555 123 4567",
    address: "Anafartalar Mah. Atatürk Bulvarı No:8, Altındağ / Ankara",
    status: "active",
    scoreTemp: "Sıcak",
    purchaseProb: 95,
    segment: "A",
    recallDate: "2026-08-10",
    anniversary: "1985-04-12",
    createdAt: "2026-01-10T09:00:00Z",
    updatedAt: "2026-07-25T10:30:00Z"
  },
  {
    id: "cust-02",
    branchId: mockBranchId,
    name: "Mehmet Demir",
    company: "Çiçek Sepeti A.Ş.",
    email: "mehmet.demir@ciceksepeti.com",
    phone: "0532 987 6543",
    address: "Maslak Mah. Büyükdere Cad. USO Center No:245, Sarıyer / İstanbul",
    status: "active",
    scoreTemp: "Orta",
    purchaseProb: 80,
    segment: "A",
    recallDate: "2026-08-05",
    anniversary: "1990-09-24",
    createdAt: "2026-02-15T11:00:00Z",
    updatedAt: "2026-07-24T15:20:00Z"
  },
  {
    id: "cust-03",
    branchId: mockBranchId,
    name: "Ebru Kaya",
    company: "Vodafone Türkiye",
    email: "ebru.kaya@vodafone.com",
    phone: "0544 111 2233",
    address: "Merkez Mah. Ayazma Cad. Papirus Plaza No:37, Kağıthane / İstanbul",
    status: "active",
    scoreTemp: "Sıcak",
    purchaseProb: 90,
    segment: "B",
    recallDate: "2026-08-02",
    anniversary: "1988-11-05",
    createdAt: "2026-03-01T10:00:00Z",
    updatedAt: "2026-07-26T12:00:00Z"
  },
  {
    id: "cust-04",
    branchId: mockBranchId,
    name: "Caner Şahin",
    company: "Garanti BBVA",
    email: "caner.sahin@garantibbva.com.tr",
    phone: "0505 222 3344",
    address: "Nispetiye Mah. Aytar Cad. No:2, Beşiktaş / İstanbul",
    status: "active",
    scoreTemp: "Soğuk",
    purchaseProb: 55,
    segment: "A",
    recallDate: "2026-08-15",
    anniversary: "1992-06-18",
    createdAt: "2026-03-20T14:30:00Z",
    updatedAt: "2026-07-20T09:10:00Z"
  },
  {
    id: "cust-05",
    branchId: mockBranchId,
    name: "Aylin Koç",
    company: "Koç Holding A.Ş.",
    email: "aylin.koc@koc.com.tr",
    phone: "0530 333 4455",
    address: "Nakkaştepe Azizbey Sok. No:1, Kuzguncuk, Üsküdar / İstanbul",
    status: "active",
    scoreTemp: "Sıcak",
    purchaseProb: 99,
    segment: "A",
    recallDate: "2026-07-30",
    anniversary: "1980-01-30",
    createdAt: "2025-12-01T09:00:00Z",
    updatedAt: "2026-07-25T11:40:00Z"
  },
  {
    id: "cust-06",
    branchId: mockBranchId,
    name: "Murat Avcı",
    company: "Teknosa İç ve Dış Ticaret",
    email: "murat.avci@teknosa.com",
    phone: "0535 444 5566",
    address: "Carrefoursa Plaza Cevizli Mah. Tugay Yolu Cad. No:67, Maltepe / İstanbul",
    status: "active",
    scoreTemp: "Orta",
    purchaseProb: 75,
    segment: "B",
    recallDate: "2026-08-08",
    anniversary: "1983-08-14",
    createdAt: "2026-04-05T10:00:00Z",
    updatedAt: "2026-07-22T16:15:00Z"
  },
  {
    id: "cust-07",
    branchId: mockBranchId,
    name: "Buse Yıldız",
    company: "Hepsiburada",
    email: "buse.yildiz@hepsiburada.com",
    phone: "0542 555 6677",
    address: "Kuştepe Mah. Mecidiyeköy Yolu Cad. Trump Towers K:12, Şişli / İstanbul",
    status: "active",
    scoreTemp: "Sıcak",
    purchaseProb: 88,
    segment: "A",
    recallDate: "2026-08-03",
    anniversary: "1994-03-05",
    createdAt: "2026-05-12T13:00:00Z",
    updatedAt: "2026-07-26T10:00:00Z"
  },
  {
    id: "cust-08",
    branchId: mockBranchId,
    name: "Serkan Bulut",
    company: "Pegasus Hava Taşımacılığı",
    email: "serkan.bulut@flypgs.com",
    phone: "0533 666 7788",
    address: "Aeropark Yenişehir Mah. Osmanlı Bulvarı No:11/A, Pendik / İstanbul",
    status: "active",
    scoreTemp: "Orta",
    purchaseProb: 70,
    segment: "B",
    recallDate: "2026-08-12",
    anniversary: "1987-10-15",
    createdAt: "2026-02-28T09:30:00Z",
    updatedAt: "2026-07-15T14:00:00Z"
  },
  {
    id: "cust-09",
    branchId: "branch-ankara",
    name: "Hande Erdem",
    company: "Defacto Perakende A.Ş.",
    email: "hande.erdem@defacto.com.tr",
    phone: "0534 888 7766",
    address: "Kızılay Cad. No:54 Çankaya / Ankara",
    status: "active",
    scoreTemp: "Sıcak",
    purchaseProb: 92,
    segment: "A",
    recallDate: "2026-08-06",
    anniversary: "1991-05-20",
    createdAt: "2026-04-10T10:00:00Z",
    updatedAt: "2026-07-20T12:00:00Z"
  },
  {
    id: "cust-10",
    branchId: "branch-izmir",
    name: "Kaan Arslan",
    company: "Şölen Çikolata A.Ş.",
    email: "kaan.arslan@solen.com.tr",
    phone: "0536 777 6655",
    address: "Atatürk Organize Sanayi Bölgesi 10014 Sok. No:5, Çiğli / İzmir",
    status: "active",
    scoreTemp: "Sıcak",
    purchaseProb: 95,
    segment: "A",
    recallDate: "2026-08-01",
    anniversary: "1986-07-11",
    createdAt: "2026-04-15T11:00:00Z",
    updatedAt: "2026-07-22T14:00:00Z"
  },
  {
    id: "cust-11",
    branchId: "branch-izmir",
    name: "Selin Vural",
    company: "Vestel Elektronik Sanayi",
    email: "selin.vural@vestel.com.tr",
    phone: "0531 999 0088",
    address: "Organize Sanayi Bölgesi, Manisa - İzmir Yolu",
    status: "active",
    scoreTemp: "Orta",
    purchaseProb: 82,
    segment: "A",
    recallDate: "2026-08-11",
    anniversary: "1989-12-02",
    createdAt: "2026-05-01T09:00:00Z",
    updatedAt: "2026-07-23T16:00:00Z"
  },
  {
    id: "cust-12",
    branchId: mockBranchId,
    name: "Tolga Güler",
    company: "Anadolu Efes Spor Kulübü",
    email: "tolga.guler@anadoluefessk.org",
    phone: "0538 444 3322",
    address: "Merter Tesisleri, Bahçelievler / İstanbul",
    status: "active",
    scoreTemp: "Sıcak",
    purchaseProb: 94,
    segment: "A",
    recallDate: "2026-08-07",
    anniversary: "1982-08-25",
    createdAt: "2026-05-15T13:00:00Z",
    updatedAt: "2026-07-24T18:00:00Z"
  }
]

// 2. SİPARİŞLER (Orders - 14 Kurumsal Sipariş)
export const mockOrders: MockOrder[] = [
  {
    id: "ord-01",
    orderNumber: "ORD-2026-0101",
    branchId: mockBranchId,
    customerId: "cust-01",
    orderType: "Sosyal Medya Yönetimi",
    title: "Ziraat Bankası Tarım Kredileri Lansman Tasarımları",
    description: "Sosyal medya mecraları için 15 adet feed görseli, 8 adet story ve reklam banner seti prodüksiyonu.",
    quantity: 23,
    priority: "high",
    status: "delivered",
    paymentStatus: "paid",
    totalAmount: 75000,
    customerName: "Ahmet Yılmaz",
    companyName: "Ziraat Bankası A.Ş.",
    customerPhone: "0555 123 4567",
    orderDate: "2026-07-15",
    createdAt: "2026-07-15T09:00:00Z",
    updatedAt: "2026-07-25T17:00:00Z"
  },
  {
    id: "ord-02",
    orderNumber: "ORD-2026-0102",
    branchId: mockBranchId,
    customerId: "cust-02",
    orderType: "Grafik Tasarım & Banner",
    title: "Çiçek Sepeti 360° Reklam Banner Paketi",
    description: "Google Display Network ve sosyal medya kanalları için 10 farklı ebatta responsive HTML5 banner seti.",
    quantity: 10,
    priority: "urgent",
    status: "in-progress",
    paymentStatus: "partial",
    totalAmount: 38000,
    customerName: "Mehmet Demir",
    companyName: "Çiçek Sepeti A.Ş.",
    customerPhone: "0532 987 6543",
    orderDate: "2026-07-20",
    createdAt: "2026-07-20T10:00:00Z",
    updatedAt: "2026-07-26T11:30:00Z"
  },
  {
    id: "ord-03",
    orderNumber: "ORD-2026-0103",
    branchId: mockBranchId,
    customerId: "cust-03",
    orderType: "Dijital Pazarlama & SEO",
    title: "Vodafone Kurumsal 5G SEO & Blog İçerik Danışmanlığı",
    description: "Kurumsal blog için 12 adet kapsamlı SEO uyumlu makale, anahtar kelime kümeleme analizi ve optimizasyon.",
    quantity: 12,
    priority: "normal",
    status: "approved",
    paymentStatus: "unpaid",
    totalAmount: 52000,
    customerName: "Ebru Kaya",
    companyName: "Vodafone Türkiye",
    customerPhone: "0544 111 2233",
    orderDate: "2026-07-22",
    createdAt: "2026-07-22T11:00:00Z",
    updatedAt: "2026-07-25T14:00:00Z"
  },
  {
    id: "ord-04",
    orderNumber: "ORD-2026-0104",
    branchId: mockBranchId,
    customerId: "cust-04",
    orderType: "UI/UX Tasarım",
    title: "Garanti BBVA Mobil Bankacılık UI/UX Arayüz Revizyonu",
    description: "Mobil kredi başvuru hunisinin kullanıcı dostu arayüzler, mikro-etkileşimler ve tasarım sistemiyle yenilenmesi.",
    quantity: 1,
    priority: "urgent",
    status: "in-progress",
    paymentStatus: "partial",
    totalAmount: 120000,
    customerName: "Caner Şahin",
    companyName: "Garanti BBVA",
    customerPhone: "0505 222 3344",
    orderDate: "2026-07-18",
    createdAt: "2026-07-18T14:30:00Z",
    updatedAt: "2026-07-26T14:30:00Z"
  },
  {
    id: "ord-05",
    orderNumber: "ORD-2026-0105",
    branchId: mockBranchId,
    customerId: "cust-05",
    orderType: "Video Prodüksiyon",
    title: "Koç Holding Sürdürülebilirlik Raporu & Motion Video",
    description: "2D/3D hareketli grafikler ve profesyonel seslendirme ile 3 dakikalık kurumsal vizyon videosu.",
    quantity: 1,
    priority: "normal",
    status: "delivered",
    paymentStatus: "paid",
    totalAmount: 95000,
    customerName: "Aylin Koç",
    companyName: "Koç Holding A.Ş.",
    customerPhone: "0530 333 4455",
    orderDate: "2026-07-05",
    createdAt: "2026-07-05T09:00:00Z",
    updatedAt: "2026-07-22T18:00:00Z"
  },
  {
    id: "ord-06",
    orderNumber: "ORD-2026-0106",
    branchId: mockBranchId,
    customerId: "cust-06",
    orderType: "Yazılım Geliştirme",
    title: "Teknosa B2B Bayi Portalı Web & Mobil Entegrasyonu",
    description: "Bayi sipariş takibi, cari hesap ekstresi sorgulama ve SAP entegrasyonu yazılım paketi.",
    quantity: 1,
    priority: "urgent",
    status: "in-progress",
    paymentStatus: "partial",
    totalAmount: 185000,
    customerName: "Murat Avcı",
    companyName: "Teknosa İç ve Dış Ticaret",
    customerPhone: "0535 444 5566",
    orderDate: "2026-07-10",
    createdAt: "2026-07-10T13:00:00Z",
    updatedAt: "2026-07-25T09:00:00Z"
  },
  {
    id: "ord-07",
    orderNumber: "ORD-2026-0107",
    branchId: mockBranchId,
    customerId: "cust-07",
    orderType: "Video Prodüksiyon",
    title: "Hepsiburada Lansmanı 15 Adet Dikey Reels/TikTok Çekimi",
    description: "Genç kitleye yönelik stüdyo ve dış mekan çekimleri, ses efektleri ve dinamik altyazı kurguları.",
    quantity: 15,
    priority: "normal",
    status: "approved",
    paymentStatus: "unpaid",
    totalAmount: 45000,
    customerName: "Buse Yıldız",
    companyName: "Hepsiburada",
    customerPhone: "0542 555 6677",
    orderDate: "2026-07-24",
    createdAt: "2026-07-24T10:00:00Z",
    updatedAt: "2026-07-26T11:00:00Z"
  },
  {
    id: "ord-08",
    orderNumber: "ORD-2026-0108",
    branchId: mockBranchId,
    customerId: "cust-08",
    orderType: "Grafik Tasarım",
    title: "Pegasus 'Uçtukça Kazan' Sadakat Kampanyası Mailing Seti",
    description: "HTML e-posta şablonları, mobil uyumlu bülten tasarımları ve CRM push bildirim görselleri.",
    quantity: 6,
    priority: "normal",
    status: "delivered",
    paymentStatus: "paid",
    totalAmount: 28000,
    customerName: "Serkan Bulut",
    companyName: "Pegasus Hava Taşımacılığı",
    customerPhone: "0533 666 7788",
    orderDate: "2026-07-08",
    createdAt: "2026-07-08T09:00:00Z",
    updatedAt: "2026-07-23T15:00:00Z"
  },
  {
    id: "ord-09",
    orderNumber: "ORD-2026-0109",
    branchId: "branch-ankara",
    customerId: "cust-09",
    orderType: "Katalog & Baskı Tasarımı",
    title: "Defacto Sonbahar/Kış Koleksiyonu Lookbook Tasarımı",
    description: "120 sayfa yüksek çözünürlüklü dijital ve ofset baskıya hazır moda katalog çalışması.",
    quantity: 1,
    priority: "high",
    status: "in-progress",
    paymentStatus: "partial",
    totalAmount: 34000,
    customerName: "Hande Erdem",
    companyName: "Defacto Perakende A.Ş.",
    customerPhone: "0534 888 7766",
    orderDate: "2026-07-16",
    createdAt: "2026-07-16T11:00:00Z",
    updatedAt: "2026-07-25T16:00:00Z"
  },
  {
    id: "ord-10",
    orderNumber: "ORD-2026-0110",
    branchId: "branch-izmir",
    customerId: "cust-10",
    orderType: "Sosyal Medya Yönetimi",
    title: "Şölen Bayram Kampanyası 3D Ürün Render & Animasyon",
    description: "Çikolata ürün ambalajlarının 3D fotogerçekçi modellemeleri ve 4 adet reklam filmi renderı.",
    quantity: 4,
    priority: "urgent",
    status: "delivered",
    paymentStatus: "paid",
    totalAmount: 62000,
    customerName: "Kaan Arslan",
    companyName: "Şölen Çikolata A.Ş.",
    customerPhone: "0536 777 6655",
    orderDate: "2026-07-12",
    createdAt: "2026-07-12T10:00:00Z",
    updatedAt: "2026-07-24T18:00:00Z"
  },
  {
    id: "ord-11",
    orderNumber: "ORD-2026-0111",
    branchId: "branch-izmir",
    customerId: "cust-11",
    orderType: "Yazılım Geliştirme",
    title: "Vestel Akıllı Yaşam Ekosistemi Tanıtım Web Sitesi",
    description: "Next.js tabanlı yüksek hızlı, interaktif 3D ürün sergileyen tanıtım mikrositesi.",
    quantity: 1,
    priority: "high",
    status: "in-progress",
    paymentStatus: "partial",
    totalAmount: 140000,
    customerName: "Selin Vural",
    companyName: "Vestel Elektronik Sanayi",
    customerPhone: "0531 999 0088",
    orderDate: "2026-07-14",
    createdAt: "2026-07-14T13:00:00Z",
    updatedAt: "2026-07-26T10:00:00Z"
  },
  {
    id: "ord-12",
    orderNumber: "ORD-2026-0112",
    branchId: mockBranchId,
    customerId: "cust-12",
    orderType: "Sosyal Medya Yönetimi",
    title: "Anadolu Efes EuroLeague Sezonluk Maç Günü Şablonları",
    description: "Maç günü skor duyuruları, kadro infografikleri ve galibiyet animasyonları tasarım kütüphanesi.",
    quantity: 30,
    priority: "normal",
    status: "approved",
    paymentStatus: "unpaid",
    totalAmount: 55000,
    customerName: "Tolga Güler",
    companyName: "Anadolu Efes Spor Kulübü",
    customerPhone: "0538 444 3322",
    orderDate: "2026-07-21",
    createdAt: "2026-07-21T15:00:00Z",
    updatedAt: "2026-07-26T09:00:00Z"
  },
  {
    id: "ord-13",
    orderNumber: "ORD-2026-0113",
    branchId: mockBranchId,
    customerId: "cust-01",
    orderType: "Kurumsal Kimlik",
    title: "Ziraat Fintek Kuluçka Merkezi Logo ve Marka Kılavuzu",
    description: "Logo tasarımı, tipografi seçimi, renk paleti ve 60 sayfalık kurumsal kimlik kullanım kılavuzu.",
    quantity: 1,
    priority: "normal",
    status: "approved",
    paymentStatus: "paid",
    totalAmount: 48000,
    customerName: "Ahmet Yılmaz",
    companyName: "Ziraat Bankası A.Ş.",
    customerPhone: "0555 123 4567",
    orderDate: "2026-07-19",
    createdAt: "2026-07-19T09:00:00Z",
    updatedAt: "2026-07-24T17:00:00Z"
  },
  {
    id: "ord-14",
    orderNumber: "ORD-2026-0114",
    branchId: "branch-bursa",
    customerId: "cust-06",
    orderType: "Tabela & Dış Mekan",
    title: "Teknosa Bursa Nilüfer Mağazası Işıklı Pleksi Tabela ve Yönlendirmeler",
    description: "Mağaza dış cephe kutu harf pleksi led aydınlatmalı tabela üretimi ve montajı.",
    quantity: 4,
    priority: "normal",
    status: "pending",
    paymentStatus: "unpaid",
    totalAmount: 68000,
    customerName: "Murat Avcı",
    companyName: "Teknosa İç ve Dış Ticaret",
    customerPhone: "0535 444 5566",
    orderDate: "2026-07-25",
    createdAt: "2026-07-25T10:00:00Z",
    updatedAt: "2026-07-26T11:00:00Z"
  }
]

// 3. PROJELER (Projects - 8 Stratejik Proje)
export const mockProjects: MockProject[] = [
  {
    id: "proj-01",
    branchId: mockBranchId,
    name: "Ziraat Bankası 2026 Dijital İletişim Kampanyası",
    description: "Tarım kredileri ve gençlik bankacılığı odaklı 360° sosyal medya lansmanı, Reels prodüksiyonları ve influencer yönetimi.",
    status: "active",
    progress: 65,
    customerNotes: "Müşteri haftalık metrik raporu ve A/B reklam testleri talep ediyor. Tasarımlar kurumsal güven hissi uyandırmalı.",
    startDate: "2026-06-25",
    endDate: "2026-08-30",
    createdAt: "2026-06-25T09:00:00Z",
    updatedAt: "2026-07-26T15:00:00Z"
  },
  {
    id: "proj-02",
    branchId: mockBranchId,
    name: "Teknosa B2B Bayi Portalı & API Entegrasyonu",
    description: "Teknosa bayilerinin sipariş verebileceği, faturalarını ve stok durumlarını anlık takip edebileceği web portalı yazılım geliştirmesi.",
    status: "active",
    progress: 80,
    customerNotes: "SAP ERP entegrasyon testleri başarıyla geçti. Bayi pilot canlıya geçişi Cuma günü planlandı.",
    startDate: "2026-06-10",
    endDate: "2026-08-15",
    createdAt: "2026-06-10T10:00:00Z",
    updatedAt: "2026-07-25T12:00:00Z"
  },
  {
    id: "proj-03",
    branchId: mockBranchId,
    name: "Garanti BBVA UI/UX Modernizasyonu & Tasarım Sistemi",
    description: "Mobil bankacılık kredi başvuru ve kart başvuru adımlarının modern arayüzler ve mikro-etkileşimlerle baştan tasarlanması.",
    status: "active",
    progress: 35,
    customerNotes: "Figma bileşen kütüphanesi onaylandı. Kredi simülatörü adımı için 2 farklı varyasyon prototipi inceleniyor.",
    startDate: "2026-07-07",
    endDate: "2026-09-30",
    createdAt: "2026-07-07T14:30:00Z",
    updatedAt: "2026-07-26T10:00:00Z"
  },
  {
    id: "proj-04",
    branchId: mockBranchId,
    name: "Koç Holding 2026 Sürdürülebilirlik Video Serisi",
    description: "Yenilenebilir enerji, sıfır atık ve karbon emisyonu hedeflerini anlatan 2D/3D hareketli grafik animasyon videosu.",
    status: "completed",
    progress: 100,
    customerNotes: "Video genel kurulda ve dijital mecralarda yayınlandı. Müşteri memnuniyet skoru 5/5.",
    startDate: "2026-06-01",
    endDate: "2026-07-20",
    createdAt: "2026-06-01T08:30:00Z",
    updatedAt: "2026-07-20T18:00:00Z"
  },
  {
    id: "proj-05",
    branchId: mockBranchId,
    name: "Vodafone Kurumsal SEO & İçerik Pazarlaması",
    description: "Vodafone Kurumsal blog platformunun organik arama motoru optimizasyonu, teknik SEO denetimi ve aylık içerik üretimi.",
    status: "active",
    progress: 50,
    customerNotes: "Her ay 10 adet SEO uyumlu blog yazısı teslim edilecek. Google ilk sayfa kelime sayısında %42 artış sağlandı.",
    startDate: "2026-07-01",
    endDate: "2026-12-31",
    createdAt: "2026-07-01T11:00:00Z",
    updatedAt: "2026-07-25T09:30:00Z"
  },
  {
    id: "proj-06",
    branchId: mockBranchId,
    name: "Hepsiburada Sonbahar Alışveriş Festivali Video Prodüksiyonu",
    description: "E-ticaret indirim günleri için 15 adet dinamik dikey reklam videosu çekimi, altyazı kurgusu ve ses miksajı.",
    status: "active",
    progress: 55,
    customerNotes: "Stüdyo çekimleri tamamlandı. Kurgu aşamasında 8 video onaya sunuldu.",
    startDate: "2026-07-10",
    endDate: "2026-08-15",
    createdAt: "2026-07-10T10:00:00Z",
    updatedAt: "2026-07-26T14:00:00Z"
  },
  {
    id: "proj-07",
    branchId: "branch-izmir",
    name: "Vestel Akıllı Ev Çözümleri Web Platformu",
    description: "Vestel IoT ekosistemini tanıtan, interaktif 3D buzdolabı ve çamaşır makinesi deneyimi sunan özel mikrosite.",
    status: "active",
    progress: 40,
    customerNotes: "3D modeller Three.js ile web ortamına optimize edildi. Mobil performans testleri sürüyor.",
    startDate: "2026-07-05",
    endDate: "2026-08-30",
    createdAt: "2026-07-05T09:00:00Z",
    updatedAt: "2026-07-24T16:00:00Z"
  },
  {
    id: "proj-08",
    branchId: mockBranchId,
    name: "Çiçekana ERP 2.0 Platform ve Tasarım Sistemi",
    description: "Ajansın tüm şubelerini, B2B siparişlerini, kargo, finans ve insan kaynakları süreçlerini birleştiren merkezi ERP sistemi.",
    status: "active",
    progress: 95,
    customerNotes: "Tüm modüller uçtan uca çalışır durumda. Müşteri sunumu ve canlı tanıtım aşamasına geçildi.",
    startDate: "2026-05-01",
    endDate: "2026-08-10",
    createdAt: "2026-05-01T08:00:00Z",
    updatedAt: "2026-07-26T18:00:00Z"
  }
]

// 4. KULLANICILAR (Users)
export const mockUsers: MockUser[] = [
  { id: "local-debug-user", username: "cicekana.dev", fullName: "Murat Çiçek (Ajans Başkanı)", email: "murat@cicekana.com", isActive: true },
  { id: "user-art-director", username: "melis.sen", fullName: "Melis Şen (Kreatif Direktör)", avatarUrl: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150", email: "melis.sen@cicekana.com", isActive: true },
  { id: "user-copywriter", username: "cem.aslan", fullName: "Cem Aslan (Metin Yazarı)", avatarUrl: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150", email: "cem.aslan@cicekana.com", isActive: true },
  { id: "user-developer", username: "emre.yildirim", fullName: "Emre Yıldırım (Lead Geliştirici)", avatarUrl: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150", email: "emre.yildirim@cicekana.com", isActive: true },
  { id: "user-accountant", username: "kemal.ozturk", fullName: "Kemal Öztürk (Mali Müşavir)", avatarUrl: "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150", email: "kemal.ozturk@cicekana.com", isActive: true },
  { id: "user-hr", username: "zeynep.demir", fullName: "Zeynep Demir (İK Direktörü)", avatarUrl: "https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=150", email: "zeynep.demir@cicekana.com", isActive: true },
  { id: "user-sales", username: "burak.celik", fullName: "Burak Çelik (Satış Direktörü)", avatarUrl: "https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?w=150", email: "burak.celik@cicekana.com", isActive: true },
  { id: "user-it", username: "ahmet.kurt", fullName: "Ahmet Kurt (IT Sorumlusu)", avatarUrl: "https://images.unsplash.com/photo-1463453091185-61582044d556?w=150", email: "ahmet.kurt@cicekana.com", isActive: true }
]

// 5. CHAT MESAJLARI (Chat / Communication)
export const mockMessages: MockMessage[] = [
  {
    id: "msg-01",
    fromUserId: "user-art-director",
    toUserId: "local-debug-user",
    content: "Selamlar Murat Bey! Ziraat Bankası'nın Temmuz ayı tarım kredisi taslaklarını bitirdim. İnceleyebilir misiniz?",
    isRead: false,
    createdAt: new Date(Date.now() - 3600000 * 2).toISOString(),
    fromUser: { id: "user-art-director", username: "melis.sen", fullName: "Melis Şen (Kreatif Direktör)", avatarUrl: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150" }
  },
  {
    id: "msg-02",
    fromUserId: "local-debug-user",
    toUserId: "user-art-director",
    content: "Harika eline sağlık Melis. Renk paleti kurumsal marka standartlarına birebir uygun. Onayladım.",
    isRead: true,
    createdAt: new Date(Date.now() - 3600000 * 1.8).toISOString(),
    fromUser: { id: "local-debug-user", username: "cicekana.dev", fullName: "Murat Çiçek (Ajans Başkanı)" }
  },
  {
    id: "msg-03",
    fromUserId: "user-art-director",
    toUserId: "local-debug-user",
    content: "Çok teşekkürler! Siparişler modülüne yüklüyorum, fatura onaylandığı gibi teslimat statüsüne çekeceğim.",
    isRead: false,
    createdAt: new Date(Date.now() - 3600000 * 1.5).toISOString(),
    fromUser: { id: "user-art-director", username: "melis.sen", fullName: "Melis Şen (Kreatif Direktör)", avatarUrl: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150" }
  },
  {
    id: "msg-04",
    fromUserId: "user-copywriter",
    toUserId: "local-debug-user",
    content: "Yeni Vodafone blog yazısı taslaklarını tamamladım. SEO başlıklarını optimize ettim, panelde yayına hazır.",
    isRead: false,
    createdAt: new Date(Date.now() - 3600000 * 0.5).toISOString(),
    fromUser: { id: "user-copywriter", username: "cem.aslan", fullName: "Cem Aslan (Metin Yazarı)", avatarUrl: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150" }
  }
]

// 6. TAKVİM (Calendar)
export const mockCalendarEvents: MockCalendarEvent[] = [
  {
    id: "cal-01",
    title: "Ziraat Bankası Kreatif Onay Toplantısı",
    date: new Date(new Date().setHours(10, 0, 0, 0)).toISOString(),
    endDate: new Date(new Date().setHours(11, 30, 0, 0)).toISOString(),
    type: "appointment",
    color: "#3b82f6",
    description: "Temmuz ayı sosyal medya taslaklarının Ziraat Bankası kreatif ekibi ile nihai onayı.",
    location: "Online (Google Meet)",
    status: "confirmed"
  },
  {
    id: "cal-02",
    title: "Alacak Tahsilatı: Ziraat Bankası",
    date: new Date(Date.now() + 86400000).toISOString().split('T')[0] + "T09:00:00Z",
    type: "income_payment",
    color: "#10b981",
    description: "Temmuz ayı sosyal medya yönetim danışmanlığı hakediş tahsilatı.",
    amount: 75000,
    status: "paid"
  },
  {
    id: "cal-03",
    title: "Fatura Ödemesi: AWS & Cloudflare",
    date: new Date(Date.now() - 86400000).toISOString().split('T')[0] + "T12:00:00Z",
    type: "expense_payment",
    color: "#ef4444",
    description: "AWS bulut sunucuları ve kurumsal CDN üyelikleri ödemesi.",
    amount: 18500,
    status: "paid"
  },
  {
    id: "cal-04",
    title: "Hatırlatıcı: Çiçek Sepeti Banner Teslimi",
    date: new Date(Date.now() + 172800000).toISOString().split('T')[0] + "T17:00:00Z",
    type: "reminder",
    color: "#f59e0b",
    description: "Haftalık banner setinin tamamlanarak kütüphaneye yüklenmesi."
  },
  {
    id: "cal-05",
    title: "Yapılacak: Koç Holding Video Revizyonu",
    date: new Date().toISOString().split('T')[0] + "T14:00:00Z",
    type: "todo",
    color: "#8b5cf6",
    description: "Girişteki logo animasyonu hızının düzenlenmesi.",
    status: "pending"
  },
  {
    id: "cal-06",
    title: "Sosyal Medya: Hepsiburada Reels Yayını",
    date: new Date(Date.now() + 259200000).toISOString().split('T')[0] + "T18:00:00Z",
    type: "content_calendar",
    color: "#ec4899",
    description: "Yaz İndirimleri Reels videosunun Instagram & Tiktok hesaplarında yayına girmesi."
  }
]

// 7. PERSONEL TALEPLERİ (HR Requests)
export const mockHRRequests: MockRequestItem[] = [
  {
    id: "REQ-0501",
    title: "Sosyal Medya Lansman Etkinlik Harcamaları",
    category: "finans",
    summary: "Marka lansman lansman etkinliği bütçesi ve ikram avansı talebi.",
    description: "12 Temmuz tarihinde gerçekleştirilecek olan yeni sosyal medya lansman etkinliğinde kullanılmak üzere organizasyon, ikramlık ve basılı görsel harcamaları için avans ihtiyacı bulunmaktadır. Faturalar etkinlik sonrasında İK'ya teslim edilecektir.",
    priority: "Acil",
    status: "pending",
    createdAt: new Date(Date.now() - 3600000 * 2).toISOString(),
    updatedAt: new Date(Date.now() - 3600000 * 2).toISOString(),
    uploadedFiles: ["bütçe_tablosu.xlsx", "lansman_akisi.pdf"],
    approver: "Murat Çiçek (Ajans Başkanı)",
    requester: { name: "Melis Şen", avatarUrl: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150", role: "Kreatif Direktör" },
    amount: 15000,
    reason: "Proje Harcamaları",
    expectedDate: "2026-08-01"
  },
  {
    id: "REQ-0502",
    title: "Yıllık İzin Talebi - Ağustos Başı",
    category: "ik",
    summary: "5 günlük yıllık izin kullanımı ve iş devir planı.",
    description: "Yaz dönemi planlaması dahilinde 5 iş günü sürecek yıllık izin talebidir. İzin süresince acil işler için vekil olarak Melis Şen belirlenmiştir. Gerekli tüm müşteri briefleri ve takvimler planlanıp teslim edilmiştir.",
    priority: "Normal",
    status: "approved",
    createdAt: new Date(Date.now() - 3600000 * 24).toISOString(),
    updatedAt: new Date(Date.now() - 3600000 * 20).toISOString(),
    uploadedFiles: ["izin_devir_notlari.pdf"],
    approver: "Zeynep Demir (İK Direktörü)",
    requester: { name: "Cem Aslan", avatarUrl: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150", role: "Metin Yazarı" },
    leaveType: "Yıllık İzin",
    startDate: "2026-08-03",
    endDate: "2026-08-07",
    daysCount: 5,
    proxyEmployee: "Melis Şen",
    managerComment: "İş devir planı kontrol edilmiştir, izin onaylanmıştır. İyi tatiller.",
    decisionDate: new Date(Date.now() - 3600000 * 20).toISOString()
  },
  {
    id: "REQ-0503",
    title: "Video Kurgu Ekibi İçin Mac Studio Donanım Talebi",
    category: "it",
    summary: "3D Render ve Video Kurgu iş istasyonu talebi.",
    description: "Kreatif video ve render ekibinin artan 4K render yükünü karşılamak üzere Apple Mac Studio (M2 Max, 64GB RAM) donanım yükseltmesi talep edilmektedir.",
    priority: "Kritik",
    status: "approved",
    createdAt: new Date(Date.now() - 3600000 * 48).toISOString(),
    updatedAt: new Date(Date.now() - 3600000 * 12).toISOString(),
    uploadedFiles: ["donanim_teknik_karsilastirma.xlsx"],
    approver: "Murat Çiçek (Ajans Başkanı)",
    requester: { name: "Deniz Arda", avatarUrl: "https://images.unsplash.com/photo-1522075469751-3a6694fb2f61?w=150", role: "Video Designer" },
    hardwareType: "İş İstasyonu (Workstation)",
    brandModel: "Apple Mac Studio M2 Max (64GB, 1TB SSD)",
    managerComment: "Prodüksiyon departmanı bütçesinden onaylanmıştır, satın alma yapılıyor.",
    decisionDate: new Date(Date.now() - 3600000 * 12).toISOString()
  }
]

// 8. DASHBOARD GRAPH & METRICS
export const getMockStats = () => {
  const customerCount = mockCustomers.length
  const projectCount = mockProjects.length
  const activeProjectCount = mockProjects.filter(p => p.status === "active").length
  const leadCount = 14
  const orderCount = mockOrders.length
  const pendingOrderCount = mockOrders.filter(o => o.status === "pending" || o.status === "approved").length

  const totalIncome = mockOrders
    .filter(o => o.status !== "rejected")
    .reduce((sum, o) => sum + (o.totalAmount || 0), 0)

  const totalExpense = 112500
  const netProfit = totalIncome - totalExpense

  const spendingByKind = [
    { name: "Bulut & Sunucu Altyapısı", value: 18500 },
    { name: "Yazılım & Tasarım Lisansları", value: 22800 },
    { name: "Ofis Kirası & Sabit Giderler", value: 45000 },
    { name: "Prodüksiyon & Stüdyo Çekimi", value: 16500 },
    { name: "Ofis & Lojistik Harcamaları", value: 9700 }
  ]

  const allActivities = [
    ...mockOrders.map(o => ({
      id: o.id,
      type: "Siparis",
      description: `${o.companyName || o.customerName} - ${o.title} siparişi oluşturuldu (${(o.totalAmount || 0).toLocaleString("tr-TR")} ₺)`,
      time: new Date(o.createdAt).toLocaleDateString("tr-TR"),
      rawDate: new Date(o.createdAt)
    })),
    ...mockProjects.map(p => ({
      id: p.id,
      type: "Proje",
      description: `${p.name} projesi başlatıldı (%${p.progress} tamamlandı)`,
      time: new Date(p.createdAt).toLocaleDateString("tr-TR"),
      rawDate: new Date(p.createdAt)
    }))
  ]
    .sort((a, b) => b.rawDate.getTime() - a.rawDate.getTime())
    .slice(0, 10)

  return {
    customers: customerCount,
    projects: projectCount,
    activeProjects: activeProjectCount,
    leads: leadCount,
    orders: orderCount,
    pendingOrders: pendingOrderCount,
    income: totalIncome,
    expense: totalExpense,
    spendingByKind,
    netProfit,
    recentActivities: allActivities
  }
}

// 9. LEADS & FINANCE & CARGO EXPORTS FOR DATA CONTROLLER
export const mockLeads = [
  { id: "lead-01", branchId: mockBranchId, name: "Seda Aksoy", company: "Migros Ticaret A.Ş.", email: "seda.aksoy@migros.com.tr", phone: "0532 999 1122", status: "hot", amount: 180000, industry: "Perakende & E-Ticaret", scoreTemp: "Sıcak", timeline: "Hemen" },
  { id: "lead-02", branchId: mockBranchId, name: "Onur Çetin", company: "LC Waikiki", email: "onur.cetin@lcwaikiki.com", phone: "0533 888 2233", status: "qualified", amount: 240000, industry: "Moda & Tekstil", scoreTemp: "Sıcak", timeline: "Kısa vade" },
  { id: "lead-03", branchId: mockBranchId, name: "Derya Şengül", company: "Eczacıbaşı", email: "derya.sengul@eczacibasi.com.tr", phone: "0535 777 3344", status: "warm", amount: 135000, industry: "Yapı Malzemeleri", scoreTemp: "Ilık", timeline: "Q4" },
  { id: "lead-04", branchId: mockBranchId, name: "Tarkan Güven", company: "Beko Global", email: "tarkan.guven@beko.com", phone: "0530 666 4455", status: "contacted", amount: 210000, industry: "Tüketici Elektroniği", scoreTemp: "Sıcak", timeline: "Hemen" }
]

export const mockFinances = [
  { id: "fin-01", branchId: mockBranchId, type: "INCOME", amount: 75000, category: "Hizmet Geliri", description: "Ziraat Bankası Temmuz danışmanlık hakedişi", status: "approved", date: new Date().toISOString() },
  { id: "fin-02", branchId: mockBranchId, type: "INCOME", amount: 95000, category: "Prodüksiyon Geliri", description: "Koç Holding Sürdürülebilirlik filmi teslimatı", status: "approved", date: new Date().toISOString() },
  { id: "fin-03", branchId: mockBranchId, type: "EXPENSE", amount: 18500, category: "Bulut & Sunucu", description: "AWS Cloud ve Cloudflare CDN kurumsal sunucu faturası", status: "approved", date: new Date().toISOString() }
]

export const mockCargo = [
  { id: "cargo-01", branchId: mockBranchId, carrierName: "Yurtiçi Kargo", trackingNumber: "124892019401", status: "delivered", notes: "Ziraat Bankası sözleşme evrakları teslim edildi" },
  { id: "cargo-02", branchId: mockBranchId, carrierName: "Aras Kargo", trackingNumber: "349182940192", status: "in_transit", notes: "Çiçek Sepeti numune kutuları dağıtımda" }
]

export const mockProducts = [
  { id: "prod-01", name: "Kuşe Kağıt Broşür (A4 Çift Yön, 1000 Adet)", description: "170 gr parlak kuşe ofset baskı", unit: "Paket", isActive: true },
  { id: "prod-02", name: "Roll-up Banner (85x200 cm Alüminyum)", description: "Vinil branda baskılı fuar mekanizması", unit: "Adet", isActive: true }
]
