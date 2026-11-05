export interface DemoProject {
  id: string
  name: string
  description: string
  status: "Devam Ediyor" | "Test Aşamasında" | "Tamamlandı" | "Planlanıyor"
  progress: number
  client: string
  budget: number
  deadline: string
  startDate?: string
  endDate?: string
  customerNotes?: string
  createdAt?: string
}

export const DEMO_PROJECTS: DemoProject[] = [
  {
    id: "demo-proj-01",
    name: "Ziraat Finans & Tarım Kredi Dijital Portalı",
    description: "Tarım kredileri, genç çiftçi teşvikleri ve mikro-finansman süreçlerinin uçtan uca modern web ve mobil ortama taşınması.",
    status: "Devam Ediyor",
    progress: 68,
    client: "T.C. Ziraat Bankası A.Ş.",
    budget: 850000,
    deadline: "15 Ekim 2026",
    startDate: "2026-05-10",
    endDate: "2026-10-15",
    customerNotes: "Müşteri haftalık güvenlik taraması ve ISO 27001 uyumluluk raporu talep ediyor.",
    createdAt: "2026-05-10T09:00:00Z"
  },
  {
    id: "demo-proj-02",
    name: "Teknosa B2B Çok Kanallı Bayi & Stok Platformu",
    description: "Tüm Türkiye bayilerinin anlık sipariş, konsinye stok ve entegre faturalandırma işlemlerini yöneten yüksek hacimli ERP ağı.",
    status: "Test Aşamasında",
    progress: 92,
    client: "Teknosa İç ve Dış Ticaret A.Ş.",
    budget: 1250000,
    deadline: "28 Eylül 2026",
    startDate: "2026-04-01",
    endDate: "2026-09-28",
    customerNotes: "SAP & Logo Tiger API köprüleri canlıya geçiş öncesi yük testinde.",
    createdAt: "2026-04-01T10:00:00Z"
  },
  {
    id: "demo-proj-03",
    name: "Garanti BBVA Yeni Nesil Tasarım Sistemi & UI/UX",
    description: "Kurumsal ve bireysel bankacılık şube içi tablet arayüzleri ile web platformunun zümrüt/obsidyen tasarım diline uyarlanması.",
    status: "Devam Ediyor",
    progress: 45,
    client: "Garanti BBVA Teknoloji",
    budget: 620000,
    deadline: "10 Kasım 2026",
    startDate: "2026-06-15",
    endDate: "2026-11-10",
    customerNotes: "Figma token'ları ve Tailwind bileşen kütüphanesi versiyon 2.4 onaylandı.",
    createdAt: "2026-06-15T08:30:00Z"
  },
  {
    id: "demo-proj-04",
    name: "Koç Holding Sürdürülebilirlik & Karbon Takip Paneli",
    description: "Holding grup şirketlerinin sıfır atık, karbon ayak izi ve yenilenebilir enerji tüketim verilerini toplayan ESG analiz modülü.",
    status: "Tamamlandı",
    progress: 100,
    client: "Koç Holding Enerji Grubu",
    budget: 980000,
    deadline: "20 Ağustos 2026",
    startDate: "2026-02-15",
    endDate: "2026-08-20",
    customerNotes: "Yönetim kurulu sunumu başarıyla yapıldı. Sistem stabil olarak devredildi.",
    createdAt: "2026-02-15T11:00:00Z"
  },
  {
    id: "demo-proj-05",
    name: "Vestel Akıllı Fabrika & WMS Depo Otomasyonu",
    description: "Manisa Vestel City içindeki robotik raf sistemleri, RFID barkod okuyucular ve AGV yönlendirme altyapısı için gerçek zamanlı kontrol paneli.",
    status: "Devam Ediyor",
    progress: 55,
    client: "Vestel Elektronik Sanayi A.Ş.",
    budget: 1450000,
    deadline: "05 Aralık 2026",
    startDate: "2026-05-20",
    endDate: "2026-12-05",
    customerNotes: "WMS direktif motoru ve offline sync senaryoları sahada test ediliyor.",
    createdAt: "2026-05-20T14:00:00Z"
  },
  {
    id: "demo-proj-06",
    name: "Hepsiburada Lojistik & Hızlı Teslimat Hub Entegrasyonu",
    description: "Marmara Bölgesi mikro dağıtım merkezleri için kurye rota optimizasyonu, dinamik barkodlama ve teslimat doğrulama mimarisi.",
    status: "Planlanıyor",
    progress: 18,
    client: "D-Market Elektronik (Hepsiburada)",
    budget: 740000,
    deadline: "25 Ocak 2027",
    startDate: "2026-08-01",
    endDate: "2027-01-25",
    customerNotes: "Kurye mobil uygulaması arayüzleri ve kargo API spesifikasyonları hazırlanıyor.",
    createdAt: "2026-08-01T09:30:00Z"
  }
]

