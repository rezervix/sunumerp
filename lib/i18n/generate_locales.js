const fs = require('fs');
const path = require('path');

const dir = path.join(__dirname, 'locales');

function writeLocaleFile(code, name, data) {
  const fileContent = code === 'tr' 
    ? `// ${name} locale\nexport const tr = ${JSON.stringify(data, null, 2)}\n\nexport type Translations = typeof tr\n`
    : `// ${name} locale\nimport type { Translations } from "./tr"\n\nexport const ${code}: Translations = ${JSON.stringify(data, null, 2)}\n`;
  fs.writeFileSync(path.join(dir, `${code}.ts`), fileContent, 'utf8');
}

const baseTr = {
  language: 'Dil',
  languageName: 'Türkçe',
  common: {
    save: 'Kaydet',
    cancel: 'İptal Et',
    edit: 'Düzenle',
    delete: 'Sil',
    search: 'Ara...',
    searchInSettings: 'Ayarlarda ara...',
    filter: 'Filtrele',
    loading: 'Yükleniyor...',
    saving: 'Kaydediliyor...',
    status: 'Durum',
    actions: 'İşlemler',
    confirm: 'Onayla',
    yes: 'Evet',
    no: 'Hayır',
    success: 'Başarılı',
    error: 'Hata',
    warning: 'Uyarı',
    all: 'Tümü',
    viewAll: 'Tümünü Gör',
    details: 'Detaylar',
    add: 'Ekle',
    addNew: 'Yeni Ekle',
    create: 'Oluştur',
    description: 'Açıklama',
    unsavedChanges: 'Kaydedilmemiş Değişiklikler Var',
    saveChanges: 'Ayarları Kaydet',
    enterpriseVersion: 'v1.0 Kurumsal',
    active: 'Aktif',
    inactive: 'Pasif',
    back: 'Geri',
    close: 'Kapat',
    refresh: 'Yenile',
    copy: 'Kopyala',
    download: 'İndir',
    date: 'Tarih',
    time: 'Zaman',
    type: 'Tür',
    value: 'Değer',
    metric: 'Metrik',
    category: 'Kategori',
    amount: 'Tutar',
    unknown: 'Bilinmiyor',
    noData: 'Veri bulunamadı',
    completed: 'Tamamlandı',
    pending: 'Bekliyor',
    inProgress: 'Devam Ediyor',
    cancelled: 'İptal Edildi',
    high: 'Yüksek',
    medium: 'Orta',
    low: 'Düşük'
  },
  nav: {
    dashboard: 'Dashboard',
    calendar: 'Takvim',
    orders: 'Siparişler',
    store: 'Mağaza',
    customers: 'Müşteriler',
    hr: 'İnsan Kaynakları',
    staffRequests: 'Personel Talepleri',
    projects: 'Projeler',
    leads: 'Potansiyeller',
    cargo: 'Kargo',
    files: 'Dosyalar',
    agencyLibrary: 'Ajans Kütüphanesi',
    contentStore: 'İçerik Mağazası',
    tasks: 'Görevler',
    personelDenetim: 'Ekip Yük Durumu',
    todos: 'Yapılacaklar',
    notes: 'Notlarım',
    calculator: 'Hesaplama Aracı',
    finance: 'Finans',
    socialMedia: 'Sosyal Medya',
    contentCalendar: 'İçerik Takvimi',
    branches: 'Şubeler',
    users: 'Kullanıcılar',
    chat: 'Mesajlaşma',
    endOfDayReport: 'Gün Sonu Raporu',
    customerRequests: 'Müşteri Talepleri',
    technicalSupport: 'Teknik Destek',
    announcements: 'Duyurular',
    management: 'Yönetim',
    communication: 'İletişim',
    settings: 'Ayarlar',
    logout: 'Çıkış Yap',
    expand: 'Genişlet',
    collapse: 'Daralt',
    managementPanel: 'Yönetim Paneli',
    superAdmin: 'Süper Yönetici',
    user: 'Kullanıcı'
  },
  header: {
    search: 'Ara...'
  },
  login: {
    welcome: 'Hoş geldiniz',
    subtitle: 'Devam etmek için hesabınıza giriş yapın',
    managementPanel: 'Yönetim Paneli',
    manageFromOne: 'İşletmenizi tek noktadan yönetin',
    platformDesc: 'CRM, proje yönetimi, İK, finans ve daha fazlasını entegre bir platformda takip edin.',
    copyright: '© 2026 Tüm Hakları Saklıdır.',
    features: {
      customerMgmt: 'Müşteri Yönetimi',
      projectTracking: 'Proje Takibi',
      financeAnalysis: 'Finans Analizi',
      salesCrm: 'Satış & CRM'
    },
    form: {
      username: 'Kullanıcı Adı',
      password: 'Şifre',
      submit: 'Giriş Yap',
      loading: 'Giriş yapılıyor...',
      forgotPassword: 'Şifremi Unuttum'
    }
  },
  settings: {
    systemSettingsTitle: 'Çiçekana ERP — Sistem Ayarları',
    systemSettingsSubtitle: 'Şirket yapılandırması, güvenlik politikaları, marka kiti ve modül parametrelerini merkezi olarak yönetin.',
    tabs: {
      company: { label: 'Genel Şirket Ayarları', description: 'Unvan, adres, vergi ve şube yapılandırması' },
      profile: { label: 'Kişisel Profilim', description: 'Profil resmi, iletişim ve ad soyad bilgileri' },
      security: { label: 'Güvenlik & Şifre Politikası', description: 'Şifre değiştirme, 2FA, IP ve oturum politikası' },
      roles: { label: 'Kullanıcı & Rol Yönetimi', description: 'Şube ve kaynak bazlı yetki matrisi' },
      theme: { label: 'Tema & Marka Kiti', description: 'Kurumsal logo, renk paleti ve karanlık mod' },
      notifications: { label: 'Bildirim Tercihleri', description: 'E-posta, SMS, Push ve sesli uyarı kanalları' },
      integrations: { label: 'Entegrasyonlar', description: 'E-Fatura, Kargo ve İyzico ödeme sistemleri' },
      localization: { label: 'Yerelleştirme & KDV', description: 'Dil, para birimi, tarih formatı ve vergi oranları' },
      numbering: { label: 'Doküman Numaralandırma', description: 'Fatura, sipariş ve proje numarası önekleri' },
      workflows: { label: 'Onay Akışları', description: 'Limit bazlı onay mekanizmaları ve İK akışları' },
      backup: { label: 'Yedekleme & Veri', description: 'Otomatik yedekleme sıklığı ve dışa aktarma' },
      audit: { label: 'Denetim Kaydı (Audit Log)', description: 'Sistemdeki tüm değişikliklerin iz kayıtları' },
      maintenance: { label: 'Sistem Bakım & Banner', description: 'Bakım modu ve duyuru görsel bannerı' },
      danger: { label: 'Tehlikeli Bölge', description: 'Fabrika ayarlarına dönme ve demo veri araçları' }
    },
    companySection: {
      title: 'Genel Şirket ve Şube Kimliği',
      subtitle: 'Çiçekana ERP üzerinde fatura, irsaliye ve resmi sözleşmelerde görüntülenecek kurumsal bilgileri girin.',
      titleLabel: 'Şirket Resmi Unvanı',
      emailLabel: 'E-posta Adresi',
      taxOfficeLabel: 'Vergi Dairesi',
      taxNumberLabel: 'Vergi Numarası (VKN)',
      tradeRegLabel: 'Ticaret Sicil No',
      mersisLabel: 'MERSİS Numarası',
      addressLabel: 'Genel Merkez Adresi',
      multiBranchTitle: 'Çoklu Şube / Depo Desteği',
      multiBranchDesc: 'Aktif edildiğinde veri izolasyonu ve şube bazlı yetki ayrıştırması uygulanır.'
    },
    profileSection: {
      title: 'Kişisel Profil Bilgileri',
      subtitle: 'Sistemde diğer kullanıcılara görüntülenecek ad soyad ve iletişim bilgilerinizi güncelleyin.',
      selectAvatar: 'Profil Fotoğrafı Seç',
      avatarHint: 'PNG, JPG veya WEBP formatında maksimum 5MB görsel.',
      usernameDisabled: 'Kullanıcı Adı (Değiştirilemez)',
      fullName: 'Ad Soyad',
      email: 'E-posta',
      phone: 'Telefon'
    },
    securitySection: {
      title: 'Hesap Güvenliği & Parola Politikası',
      subtitle: 'Şifre yenileme, minimum uzunluk ve iki faktörlü doğrulama (2FA) kurallarını belirleyin.',
      currentPassword: 'Mevcut Şifre',
      newPassword: 'Yeni Şifre',
      confirmPassword: 'Yeni Şifre (Tekrar)',
      changeBtn: 'Şifreyi Değiştir',
      minPasswordLength: 'Minimum Şifre Uzunluğu',
      twoFactorAuth: 'İki Faktörlü Doğrulama (2FA)',
      twoFactorDesc: 'Girişlerde SMS / Authenticator kod onayını zorunlu tut.'
    },
    rolesSection: {
      title: 'Kullanıcı Rol ve Yetki Yönetimi',
      subtitle: 'Şube ve kaynak bazlı yetki matrisini (RBAC) yapılandırın.',
      superAdminRole: 'Süper Yönetici',
      branchManagerRole: 'Şube Müdürü',
      staffRole: 'Personel'
    },
    themeSection: {
      title: 'Marka Kiti ve Görsel Tema Engine',
      subtitle: 'Logonuzu yükleyin ve kurumsal renk paletinizi otomatik çıkartın.',
      brandLogo: 'Kurumsal Logo',
      primaryColor: 'Ana Vurgu Rengi',
      accentColor: 'İkincil Renk'
    },
    notificationsSection: {
      title: 'Sistem ve İşlem Bildirim Tercihleri',
      subtitle: 'E-posta, SMS ve Push bildirim kanallarını yapılandırın.',
      emailNotifs: 'E-posta Bildirimleri',
      smsNotifs: 'SMS Bildirimleri',
      pushNotifs: 'Push Bildirimleri'
    },
    integrationsSection: {
      title: 'Üçüncü Taraf Entegrasyonlar',
      subtitle: 'E-Fatura, Kargo entegrasyonu ve İyzico ödeme altyapısı.',
      efatura: 'E-Fatura Entegrasyonu',
      cargoApi: 'Kargo API Bağlantısı',
      iyzico: 'İyzico Ödeme Altyapısı'
    },
    localizationSection: {
      title: 'Yerelleştirme, Para Birimi ve KDV',
      subtitle: 'Sistem varsayılan dili, finansal para birimi ve vergi oranlarını belirleyin.',
      systemLanguage: 'Sistem Dili',
      currency: 'Para Birimi',
      kdvRate: 'Varsayılan KDV Oranı (%)'
    },
    numberingSection: {
      title: 'Doküman Numaralandırma Şablonları',
      subtitle: 'Fatura, sipariş ve proje numarası önekleri ve sayaç ayarları.',
      invoicePrefix: 'Fatura Öneki',
      orderPrefix: 'Sipariş Öneki',
      projectPrefix: 'Proje Öneki'
    },
    workflowsSection: {
      title: 'Kurumsal Onay Akışları',
      subtitle: 'Limit bazlı harcama ve izin onay hiyerarşisi.',
      expenseLimit: 'Otomatik Onay Limiti (TL)'
    },
    backupSection: {
      title: 'Veri Yedekleme ve Dışa Aktarma',
      subtitle: 'Veritabanı otomatik yedekleme periyotları.',
      autoBackup: 'Otomatik Günlük Yedekleme',
      downloadBackup: 'Veritabanı Yedeği İndir'
    },
    auditSection: {
      title: 'Sistem Denetim Kayıtları (Audit Log)',
      subtitle: 'Sistemde gerçekleştirilen tüm kritik işlemlerin log geçmişi.',
      user: 'Kullanıcı',
      action: 'İşlem',
      ipAddress: 'IP Adresi',
      date: 'Tarih',
      noLogs: 'Henüz denetim kaydı bulunmuyor.'
    },
    maintenanceSection: {
      title: 'Sistem Bakım Modu & Banner',
      subtitle: 'Sistemi bakıma alın veya tüm kullanıcılara duyuru bannerı gösterin.',
      maintenanceMode: 'Bakım Modu Aktif',
      bannerText: 'Duyuru Banner Metni'
    },
    dangerSection: {
      title: 'Tehlikeli Bölge ve Test Araçları',
      subtitle: 'Fabrika ayarlarına sıfırlama ve demo veri yönetimi.',
      loadDemoTitle: 'Mevcut Şubeye Demo Veri Yükle',
      clearDemoTitle: 'Tüm Demo Verilerini Temizle',
      resetSystemTitle: 'Sistemi Fabrika Ayarlarına Sıfırla'
    },
    title: 'Ayarlar',
    subtitle: 'Hesap bilgilerinizi ve güvenlik ayarlarınızı yönetin',
    personalInfo: 'Kişisel Bilgiler',
    personalInfoDesc: 'Ad soyad, e-posta ve telefon bilgilerinizi güncelleyin',
    username: 'Kullanıcı Adı (değiştirilemez)',
    profilePhoto: 'Profil Fotoğrafı',
    selectPhoto: 'Fotoğraf Seç',
    fullName: 'Ad Soyad',
    email: 'E-posta',
    phone: 'Telefon',
    saveInfo: 'Bilgileri Kaydet',
    saving: 'Kaydediliyor...',
    success: 'Başarılı',
    error: 'Hata',
    infoUpdated: 'Bilgiler güncellendi!',
    changePassword: 'Şifre Değiştir',
    changePasswordDesc: 'Hesap güvenliğiniz için düzenli olarak şifre değiştirin',
    currentPassword: 'Mevcut Şifre',
    newPassword: 'Yeni Şifre',
    newPasswordRepeat: 'Yeni Şifre (Tekrar)',
    changePasswordBtn: 'Şifreyi Değiştir',
    changing: 'Değiştiriliyor...',
    passwordChanged: 'Şifre başarıyla değiştirildi!',
    fillAllFields: 'Tüm alanları doldurun',
    passwordsNotMatch: 'Yeni şifreler eşleşmiyor',
    passwordTooShort: 'Şifre en az 6 karakter olmalıdır',
    languageTitle: 'Dil Ayarları',
    languageDesc: 'Panel arayüzünün dilini seçin',
    selectLanguage: 'Dil Seçin',
    languageSaved: 'Dil tercihi kaydedildi',
    devTools: 'Eğitim ve Test Araçları',
    devToolsDesc: 'Sistemi test etmek ve personele eğitim vermek için demo verileri yönetin.',
    loadDemo: 'Mevcut Şubeye Demo Veri Yükle',
    clearDemo: 'Tüm Demo Verilerini Temizle',
    processing: 'İşlem Yapılıyor...',
    clearing: 'Temizleniyor...'
  },
  dashboard: {
    title: 'Gösterge Paneli',
    subtitle: 'İşletme verilerinize genel bakış',
    totalCustomers: 'Toplam Müşteri',
    activeProjects: 'Aktif Projeler',
    leads: 'Potansiyeller',
    monthlyIncome: 'Aylık Gelir',
    monthlyExpense: 'Aylık Gider',
    netProfitLoss: 'Net Kâr/Zarar',
    incomeExpenseAnalysis: 'Gelir / Gider Analizi',
    expenseDistribution: 'Harcama Dağılımı',
    thisMonth: 'Bu ay',
    income: 'Gelir',
    expense: 'Gider',
    general: 'Genel',
    recentActivities: 'Son Aktiviteler',
    noActivities: 'Henüz aktivite yok',
    activitiesHint: 'Etkinlikler burada görüntülenecektir',
    report: 'Rapor',
    downloadReport: 'Rapor İndir',
    reportModalTitle: 'Rapor İndir',
    reportModalSubtitle: 'PDF / CSV formatında özet rapor indirin',
    reportModalDesc: 'Şubenize ait performans, müşteri ve finansal özet verileri Excel uyumlu CSV formatında indirilecektir.'
  }
};

writeLocaleFile('tr', 'Turkish', baseTr);

// Russian
const ruTr = JSON.parse(JSON.stringify(baseTr));
ruTr.language = 'Язык';
ruTr.languageName = 'Русский';
ruTr.common.save = 'Сохранить';
ruTr.common.cancel = 'Отмена';
ruTr.common.edit = 'Редактировать';
ruTr.common.delete = 'Удалить';
ruTr.common.search = 'Поиск...';
ruTr.common.searchInSettings = 'Поиск в настройках...';
ruTr.common.filter = 'Фильтр';
ruTr.common.loading = 'Загрузка...';
ruTr.common.saving = 'Сохранение...';
ruTr.common.status = 'Статус';
ruTr.common.actions = 'Действия';
ruTr.common.confirm = 'Подтвердить';
ruTr.common.yes = 'Да';
ruTr.common.no = 'Нет';
ruTr.common.success = 'Успешно';
ruTr.common.error = 'Ошибка';
ruTr.common.warning = 'Предупреждение';
ruTr.common.all = 'Все';
ruTr.common.viewAll = 'Посмотреть все';
ruTr.common.details = 'Детали';
ruTr.common.add = 'Добавить';
ruTr.common.addNew = 'Добавить новую';
ruTr.common.create = 'Создать';
ruTr.common.description = 'Описание';
ruTr.common.unsavedChanges = 'Есть несохраненные изменения';
ruTr.common.saveChanges = 'Сохранить настройки';
ruTr.common.enterpriseVersion = 'v1.0 Корпоративная';
ruTr.common.active = 'Активен';
ruTr.common.inactive = 'Неактивен';
ruTr.common.back = 'Назад';
ruTr.common.close = 'Закрыть';
ruTr.common.refresh = 'Обновить';
ruTr.common.copy = 'Копировать';
ruTr.common.download = 'Скачать';
ruTr.common.date = 'Дата';
ruTr.common.time = 'Время';
ruTr.common.type = 'Тип';
ruTr.common.value = 'Значение';
ruTr.common.metric = 'Метрика';
ruTr.common.category = 'Категория';
ruTr.common.amount = 'Сумма';
ruTr.common.unknown = 'Неизвестно';
ruTr.common.noData = 'Данные не найдены';
ruTr.common.completed = 'Завершено';
ruTr.common.pending = 'В ожидании';
ruTr.common.inProgress = 'В процессе';
ruTr.common.cancelled = 'Отменено';
ruTr.common.high = 'Высокий';
ruTr.common.medium = 'Средний';
ruTr.common.low = 'Низкий';

ruTr.nav = {
  dashboard: 'Панель управления',
  calendar: 'Календарь',
  orders: 'Заказы',
  store: 'Магазин',
  customers: 'Клиенты',
  hr: 'Кадры (HR)',
  staffRequests: 'Запросы персонала',
  projects: 'Проекты',
  leads: 'Лиды',
  cargo: 'Доставка',
  files: 'Файлы',
  agencyLibrary: 'Библиотека агентства',
  contentStore: 'Магазин контента',
  tasks: 'Задачи',
  personelDenetim: 'Загрузка команды',
  todos: 'Список дел',
  notes: 'Мои заметки',
  calculator: 'Калькулятор',
  finance: 'Финансы',
  socialMedia: 'Социальные сети',
  contentCalendar: 'Контент-календарь',
  branches: 'Филиалы',
  users: 'Пользователи',
  chat: 'Чаты',
  endOfDayReport: 'Отчет за день',
  customerRequests: 'Запросы клиентов',
  technicalSupport: 'Техподдержка',
  announcements: 'Объявления',
  management: 'Управление',
  communication: 'Связь',
  settings: 'Настройки',
  logout: 'Выйти',
  expand: 'Развернуть',
  collapse: 'Свернуть',
  managementPanel: 'Панель управления',
  superAdmin: 'Супер-администратор',
  user: 'Пользователь'
};

ruTr.dashboard = {
  title: 'Панель управления',
  subtitle: 'Общий обзор бизнеса и метрики в реальном времени',
  totalCustomers: 'Всего клиентов',
  activeProjects: 'Активные проекты',
  leads: 'Потенциальные клиенты',
  monthlyIncome: 'Ежемесячный доход',
  monthlyExpense: 'Ежемесячный расход',
  netProfitLoss: 'Чистая прибыль / убыток',
  incomeExpenseAnalysis: 'Анализ доходов и расходов',
  expenseDistribution: 'Распределение расходов',
  thisMonth: 'В этом месяце',
  income: 'Доход',
  expense: 'Расход',
  general: 'Общие',
  recentActivities: 'Последняя активность',
  noActivities: 'Пока нет активности',
  activitiesHint: 'События будут отображаться здесь',
  report: 'Отчет',
  downloadReport: 'Скачать отчет',
  reportModalTitle: 'Скачать отчет',
  reportModalSubtitle: 'Скачать сводный отчет в формате PDF / CSV',
  reportModalDesc: 'Сводные данные о производительности, клиентах и финансах вашего филиала будут скачаны в формате CSV, совместимом с Excel.'
};

writeLocaleFile('ru', 'Russian', ruTr);

// English
const enTr = JSON.parse(JSON.stringify(baseTr));
enTr.language = 'Language';
enTr.languageName = 'English';
enTr.common.save = 'Save';
enTr.common.cancel = 'Cancel';
enTr.common.edit = 'Edit';
enTr.common.delete = 'Delete';
enTr.common.search = 'Search...';
enTr.common.searchInSettings = 'Search in settings...';
enTr.common.filter = 'Filter';
enTr.common.loading = 'Loading...';
enTr.common.saving = 'Saving...';
enTr.common.status = 'Status';
enTr.common.actions = 'Actions';
enTr.common.confirm = 'Confirm';
enTr.common.yes = 'Yes';
enTr.common.no = 'No';
enTr.common.success = 'Success';
enTr.common.error = 'Error';
enTr.common.warning = 'Warning';
enTr.common.all = 'All';
enTr.common.viewAll = 'View All';
enTr.common.details = 'Details';
enTr.common.add = 'Add';
enTr.common.addNew = 'Add New';
enTr.common.create = 'Create';
enTr.common.description = 'Description';
enTr.common.unsavedChanges = 'Unsaved Changes Exist';
enTr.common.saveChanges = 'Save Settings';
enTr.common.enterpriseVersion = 'v1.0 Enterprise';
enTr.common.active = 'Active';
enTr.common.inactive = 'Inactive';
enTr.common.back = 'Back';
enTr.common.close = 'Close';
enTr.common.refresh = 'Refresh';
enTr.common.copy = 'Copy';
enTr.common.download = 'Download';
enTr.common.date = 'Date';
enTr.common.time = 'Time';
enTr.common.type = 'Type';
enTr.common.value = 'Value';
enTr.common.metric = 'Metric';
enTr.common.category = 'Category';
enTr.common.amount = 'Amount';
enTr.common.unknown = 'Unknown';
enTr.common.noData = 'No data found';
enTr.common.completed = 'Completed';
enTr.common.pending = 'Pending';
enTr.common.inProgress = 'In Progress';
enTr.common.cancelled = 'Cancelled';
enTr.common.high = 'High';
enTr.common.medium = 'Medium';
enTr.common.low = 'Low';

enTr.nav = {
  dashboard: 'Dashboard',
  calendar: 'Calendar',
  orders: 'Orders',
  store: 'Store',
  customers: 'Customers',
  hr: 'Human Resources',
  staffRequests: 'Staff Requests',
  projects: 'Projects',
  leads: 'Leads',
  cargo: 'Cargo',
  files: 'Files',
  agencyLibrary: 'Agency Library',
  contentStore: 'Content Store',
  tasks: 'Tasks',
  personelDenetim: 'Team Workload',
  todos: 'To-Do',
  notes: 'My Notes',
  calculator: 'Calculator',
  finance: 'Finance',
  socialMedia: 'Social Media',
  contentCalendar: 'Content Calendar',
  branches: 'Branches',
  users: 'Users',
  chat: 'Chat',
  endOfDayReport: 'End of Day Report',
  customerRequests: 'Customer Requests',
  technicalSupport: 'Technical Support',
  announcements: 'Announcements',
  management: 'Management',
  communication: 'Communication',
  settings: 'Settings',
  logout: 'Log Out',
  expand: 'Expand',
  collapse: 'Collapse',
  managementPanel: 'Management Panel',
  superAdmin: 'Super Admin',
  user: 'User'
};

enTr.dashboard = {
  title: 'Dashboard',
  subtitle: 'Overview of your business metrics',
  totalCustomers: 'Total Customers',
  activeProjects: 'Active Projects',
  leads: 'Leads',
  monthlyIncome: 'Monthly Income',
  monthlyExpense: 'Monthly Expense',
  netProfitLoss: 'Net Profit / Loss',
  incomeExpenseAnalysis: 'Income / Expense Analysis',
  expenseDistribution: 'Expense Distribution',
  thisMonth: 'This month',
  income: 'Income',
  expense: 'Expense',
  general: 'General',
  recentActivities: 'Recent Activities',
  noActivities: 'No activities yet',
  activitiesHint: 'Events will be displayed here',
  report: 'Report',
  downloadReport: 'Download Report',
  reportModalTitle: 'Download Report',
  reportModalSubtitle: 'Download summary report in PDF / CSV format',
  reportModalDesc: 'Performance, customer, and financial summary data for your branch will be downloaded in Excel-compatible CSV format.'
};

writeLocaleFile('en', 'English', enTr);

// Generate de, es, fr, it with fallback to English
['de', 'es', 'fr', 'it'].forEach(code => {
  const cloned = JSON.parse(JSON.stringify(enTr));
  if (code === 'de') cloned.languageName = 'Deutsch';
  if (code === 'es') cloned.languageName = 'Español';
  if (code === 'fr') cloned.languageName = 'Français';
  if (code === 'it') cloned.languageName = 'Italiano';
  writeLocaleFile(code, cloned.languageName, cloned);
});

console.log('All 7 locale files generated successfully!');
