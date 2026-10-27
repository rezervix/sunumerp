export interface GuideStep {
  id: string
  title: string
  description: string
  bullets: string[]
  image?: string
  targetSelector?: string
  placement?: "top" | "right" | "bottom" | "left" | "center"
  actionLabel?: string
}

export interface ModuleGuide {
  id: string
  title: string
  subtitle: string
  badgeText: string
  category: "welcome" | "module" | "admin" | "dev"
  route: string
  version: number
  requiredPermission?: string
  requiredRole?: string[]
  isSuperAdminOnly?: boolean
  isPlatformDevOnly?: boolean
  steps: GuideStep[]
}

export const WELCOME_GUIDE_ID = "welcome-overview"

export const MODULE_GUIDES: ModuleGuide[] = [
  // ── LEVEL 1: Kısa Başlangıç Karşılaması ──
  {
    id: WELCOME_GUIDE_ID,
    title: "Çiçekana ERP'ye Hoş Geldiniz",
    subtitle: "İşletmenizin ve ekibinizin tüm süreçlerini tek noktadan dijitalleştiren akıllı ERP platformu",
    badgeText: "BAŞLANGIÇ REHBERİ",
    category: "welcome",
    route: "/dashboard",
    version: 1,
    steps: [
      {
        id: "welcome-intro",
        title: "Platforma Hoş Geldiniz",
        description: "Çiçekana Kurumsal Kaynak Planlama (ERP) Sistemine hoş geldiniz! Modüler yapımız sayesinde müşteri ilişkilerinden finansa, görev takibinden dijital kütüphaneye kadar tüm operasyonlarınızı yönetebilirsiniz.",
        bullets: [
          "Müşteri ve ajans süreçlerinizi tek ekrandan takip edin",
          "Şube ve rol bazlı güvenli veri erişimi sağlayın",
          "Mobil uyumlu ve 60 FPS akıcı kullanıcı deneyimi"
        ],
        image: "/guides/welcome/welcome-intro.svg"
      },
      {
        id: "welcome-navigation",
        title: "Sol Menü ve Temel Navigasyon",
        description: "Sol tarafta yer alan dikey menü paneli üzerinden yetkiniz dahilindeki tüm ERP modüllerine anında ulaşabilirsiniz.",
        bullets: [
          "Ana Modüller: Dashboard, Müşteriler, Görevler ve CRM",
          "İletişim & Sosyal Medya: Chat, Duyurular ve İçerik Takvimi",
          "Yönetim & Ayarlar: Kullanıcılar, Şube Ayarları ve Destek"
        ],
        image: "/guides/welcome/welcome-nav.svg"
      },
      {
        id: "welcome-help-center",
        title: "Yardım ve Modül Rehberleri",
        description: "Açtığınız her modülde sağ üst tarafta yer alan bilgi ikonuna tıklayarak o sayfaya özel modül rehberini yeniden başlatabilirsiniz.",
        bullets: [
          "Route-tabanlı canlı modül açıklamaları ve adımları",
          "İhtiyaç duyduğunuz an SSS / Yardım merkezine erişim",
          "Klavye ve mobil jest desteği ile kolay gezinti"
        ],
        image: "/guides/welcome/welcome-help.svg"
      }
    ]
  },

  // ── LEVEL 2: Modül Bazlı Rehberler ──

  // 1. DASHBOARD REHBERİ
  {
    id: "dashboard-guide",
    title: "Dashboard & Genel Durum",
    subtitle: "Operasyonel göstergeleri, performans metriklerini ve açık görevleri izleyin",
    badgeText: "DASHBOARD MODÜLÜ",
    category: "module",
    route: "/dashboard",
    version: 1,
    requiredPermission: "dashboard",
    steps: [
      {
        id: "dash-overview",
        title: "Genel Durumunuzu Tek Ekrandan İzleyin",
        description: "Dashboard; açık görevleri, ekip yoğunluğunu, bekleyen müşteri taleplerini ve güncel finans metriklerini canlı olarak sunar.",
        bullets: [
          "Aktif proje ve görev sayıları özet kartları",
          "Aylık ve günlük gelir/gider grafik panelleri",
          "Gün sonu raporlama ve aksiyon geçmişi"
        ],
        image: "/guides/dashboard/overview.svg"
      },
      {
        id: "dash-quick-actions",
        title: "Hızlı İşlemler ve Filtreler",
        description: "Şube seçici ve tarih filtreleri ile verilere istediğiniz kapsamda ulaşabilir, yeni görev veya müşteri kaydını saniyeler içinde başlatabilirsiniz.",
        bullets: [
          "Aktif şube ve organizasyon filtreleme",
          "Hızlı müşteri talebi ve görev oluşturma butonları",
          "Kişiselleştirilebilir widget ve bildirim merkezi"
        ],
        image: "/guides/dashboard/filters.svg"
      }
    ]
  },

  // 2. GÖREVLER & PROJE TAKİBİ
  {
    id: "tasks-guide",
    title: "Görev ve Proje Takibi",
    subtitle: "İşlerinizi planlayın, sorumluları atayın ve zaman çizelgesini kontrol edin",
    badgeText: "GÖREV MODÜLÜ",
    category: "module",
    route: "/dashboard/tasks",
    version: 1,
    requiredPermission: "tasks",
    steps: [
      {
        id: "tasks-board",
        title: "Görev Tahtası ve Durumlar",
        description: "Görevlerinizi Yapılacak, Devam Eden, İncelemede ve Tamamlandı sütunlarında sürükle-bırak mantığıyla takip edin.",
        bullets: [
          "Dinamik Kanban tahtası görünümü",
          "Öncelik (Düşük, Orta, Yüksek, Kritik) etiketleri",
          "Teslim tarihi ve gecikme uyarı göstergeleri"
        ],
        image: "/guides/tasks/board.svg"
      },
      {
        id: "tasks-create",
        title: "Yeni Görev Oluşturma ve Sorumlu Atama",
        description: "Görev detaylarını, müşteri ilişkisini ve sorumlu personeli seçerek yeni bir ajans iş yükü kaydı oluşturun.",
        bullets: [
          "Müşteri ve şube bağlantılı görev kaydı",
          "Personel iş yüküne göre doğru atama",
          "Dosya ekleme ve not alanları"
        ],
        image: "/guides/tasks/create.svg"
      }
    ]
  },

  // 3. MÜŞTERİ İLİŞKİLERİ (CRM)
  {
    id: "customers-guide",
    title: "Müşteri Portföyü & CRM",
    subtitle: "Müşteri kartları, iletişim geçmişi ve aktif sözleşmeleri yönetin",
    badgeText: "CRM MODÜLÜ",
    category: "module",
    route: "/dashboard/customers",
    version: 1,
    requiredPermission: "customers",
    steps: [
      {
        id: "customers-list",
        title: "Merkezi Müşteri Listesi",
        description: "Şirketinize ait tüm kurumsal müşterileri, iletişim kişilerini ve sektör kategorilerini liste halinde görüntüleyin.",
        bullets: [
          "Müşteri unvanı, vergi no ve iletişim bilgileri",
          "Aktif sözleşme ve proje sayıları",
          "Gelişmiş arama ve filtreleme araçları"
        ],
        image: "/guides/customers/list.svg"
      },
      {
        id: "customers-detail",
        title: "Müşteri Detayı ve İletişim Geçmişi",
        description: "Müşteri kartına tıklayarak geçmiş siparişleri, ajans tasarımlarını ve yapılan toplantı notlarını inceleyin.",
        bullets: [
          "Birebir etkileşim ve temsilci geçmişi",
          "Fatura ve finansal durum özeti",
          "Hızlı arama ve e-posta başlatma"
        ],
        image: "/guides/customers/detail.svg"
      }
    ]
  },

  // 4. TEKNİK DESTEK VE TALEPLER
  {
    id: "support-guide",
    title: "Teknik Destek Talepleri",
    subtitle: "Müşteri ve personel destek biletlerini çözüme kavuşturun",
    badgeText: "DESTEK MODÜLÜ",
    category: "module",
    route: "/dashboard/support-tickets",
    version: 1,
    requiredPermission: "support-tickets",
    steps: [
      {
        id: "support-overview",
        title: "Destek Biletleri Listesi",
        description: "Açık, işlemde ve çözülen destek taleplerini kategorilerine göre inceleyin.",
        bullets: [
          "Öncelik ve departman bazlı gruplama",
          "Müşteri ve personel bildirim durumu",
          "SLA ve ilk yanıt süreleri takibi"
        ],
        image: "/guides/support/overview.svg"
      },
      {
        id: "support-detail",
        title: "Bilet Detayı ve Çözüm Notları",
        description: "Destek biletine iç not ekleyebilir veya doğrudan talep sahibine yanıt verebilirsiniz.",
        bullets: [
          "Geliştirici ve destek personeli iç notları",
          "Ekran görüntüsü ve dosya ekleri",
          "Bilet kapatma ve memnuniyet anketi"
        ],
        image: "/guides/support/detail.svg"
      }
    ]
  },

  // 5. KULLANICI VE ROL YÖNETİMİ
  {
    id: "users-guide",
    title: "Kullanıcılar ve Rol Yetkilendirme",
    subtitle: "Ekip üyelerini, erişim seviyelerini ve şube yetkilerini düzenleyin",
    badgeText: "YÖNETİCİ REHBERİ",
    category: "admin",
    route: "/dashboard/users",
    version: 1,
    isSuperAdminOnly: true,
    steps: [
      {
        id: "users-list",
        title: "Ekip Üyeleri ve Hesap Durumları",
        description: "Sistemde tanımlı tüm kullanıcıları, departmanlarını ve aktif oturum durumlarını yönetin.",
        bullets: [
          "Kullanıcı adı, e-posta ve kurumsal telefon",
          "Aktif / Pasif hesap kontrolü",
          "Şifre sıfırlama ve güvenlik ayarları"
        ],
        image: "/guides/users/list.svg"
      },
      {
        id: "users-roles",
        title: "Rol ve Yetki Matrisi",
        description: "Kullanıcılara modül okuma, yazma ve silme yetkilerini rol mantığıyla tanımlayın.",
        bullets: [
          "En Az Yetki (Least Privilege) prensibi",
          "Şube bazlı rol ve alan kısıtlamaları",
          "Özel güvenlik izin grubu oluşturma"
        ],
        image: "/guides/users/roles.svg"
      }
    ]
  },

  // 6. ŞİRKET VE ŞUBE AYARLARI
  {
    id: "settings-guide",
    title: "Şirket ve Sistem Ayarları",
    subtitle: "Kurumsal bilgilerinizi, marka temanızı ve entegrasyon parametrelerinizi yapılandırın",
    badgeText: "SİSTEM AYARLARI",
    category: "admin",
    route: "/dashboard/settings",
    version: 1,
    requiredPermission: "settings",
    steps: [
      {
        id: "settings-company",
        title: "Kurumsal Kimlik ve Şirket Bilgileri",
        description: "Fatura şablonlarında ve tekliflerde görünecek resmi şirket unvanını, adresini ve logosunu güncelleyin.",
        bullets: [
          "Resmi şirket unvanı ve vergi dairesi",
          "Kurumsal e-posta ve iletişim numarası",
          "Yüksek çözünürlüklü marka logosu"
        ],
        image: "/guides/settings/company.svg"
      },
      {
        id: "settings-preferences",
        title: "Tema ve Bildirim Tercihleri",
        description: "Koyu/Açık tema tercihleri, E-posta ve Web Push bildirim kanallarını konfigüre edin.",
        bullets: [
          "Sistem teması ve accent renk seçimi",
          "Mobil push bildirim aboneliği",
          "Otomatik yedekleme ve güvenlik protokolleri"
        ],
        image: "/guides/settings/preferences.svg"
      }
    ]
  },

  // 7. AJANS KÜTÜPHANESİ
  {
    id: "library-guide",
    title: "Ajans Dijital Arşivi",
    subtitle: "Medya dosyalarını, marka kılavuzlarını ve ajans tasarımlarını depolayın",
    badgeText: "MEDYA MODÜLÜ",
    category: "module",
    route: "/dashboard/ajans-kutuphanesi",
    version: 1,
    requiredPermission: "ajans-kutuphanesi",
    steps: [
      {
        id: "library-grid",
        title: "Dosya Kütüphanesi ve Klasör Hiyerarşisi",
        description: "Tasarım dosyalarınızı, marka logolarını ve kurumsal belgelerinizi düzenli klasör yapısında saklayın.",
        bullets: [
          "Hızlı dosya arama ve tür filtresi",
          "Önizleme ve güvenli indirme bağlantısı",
          "Klasör bazlı erişim yetkilendirmesi"
        ],
        image: "/guides/library/grid.svg"
      }
    ]
  },

  // 8. GELİŞTİRİCİ KONSOLU (DEVELOPER ONLY)
  {
    id: "devconsole-guide",
    title: "Platform Geliştirici Konsolu",
    subtitle: "Sistem durumunu, API loglarını ve altyapı metriklerini denetleyin",
    badgeText: "DEV KONSOLU",
    category: "dev",
    route: "/dashboard/developer-console",
    version: 1,
    isPlatformDevOnly: true,
    steps: [
      {
        id: "dev-metrics",
        title: "Sistem ve Sunucu Metrikleri",
        description: "Geliştirici konsolu üzerinden bellek kullanımı, DB yanıt süreleri ve aktif WebSocket bağlantılarını takip edin.",
        bullets: [
          "Gerçek zamanlı sunucu durum göstergeleri",
          "Gelişmiş Audit Log ve hata izleme",
          "API Yetki ve güvenlik testi paneli"
        ],
        image: "/guides/devconsole/metrics.svg"
      }
    ]
  }
]

/**
 * Filter module guides according to the user's role, permissions, and active route.
 */
export function getAvailableGuides({
  isSuperAdmin = false,
  isPlatformDeveloper = false,
  hasPermission = (_resource: string, _action: string) => true
}: {
  isSuperAdmin?: boolean
  isPlatformDeveloper?: boolean
  hasPermission?: (resource: string, action: string) => boolean
}): ModuleGuide[] {
  return MODULE_GUIDES.filter(guide => {
    // Platform developer only check
    if (guide.isPlatformDevOnly && !isPlatformDeveloper) {
      return false
    }

    // Super admin only check
    if (guide.isSuperAdminOnly && !isSuperAdmin && !isPlatformDeveloper) {
      return false
    }

    // Permission check
    if (guide.requiredPermission && !isSuperAdmin && !isPlatformDeveloper) {
      if (!hasPermission(guide.requiredPermission, "read")) {
        return false
      }
    }

    return true
  })
}

/**
 * Find the most relevant guide for a given pathname.
 */
export function getGuideForRoute(
  pathname: string,
  availableGuides: ModuleGuide[]
): ModuleGuide | null {
  if (!pathname) return null

  // Direct route match (excluding generic welcome guide unless specified)
  const exactMatch = availableGuides.find(
    g => g.category !== "welcome" && g.route === pathname
  )
  if (exactMatch) return exactMatch

  // Prefix match (e.g. /dashboard/tasks/123 -> tasks-guide)
  const prefixMatch = availableGuides.find(
    g => g.category !== "welcome" && g.route !== "/dashboard" && pathname.startsWith(g.route)
  )
  if (prefixMatch) return prefixMatch

  // Fallback to Dashboard guide if on main dashboard page
  if (pathname === "/dashboard") {
    return availableGuides.find(g => g.id === "dashboard-guide") || null
  }

  return null
}
