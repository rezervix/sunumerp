const fs = require('fs');
const path = require('path');

const targetFile = 'c:/Users/ADEM/Desktop/erparfamedia/erparfamedia/app/dashboard/settings/page.tsx';
let content = fs.readFileSync(targetFile, 'utf8');

// Replace tabs array definition
const oldTabsRegex = /const tabs: SettingTab\[\] = useMemo\(\(\) => \[[\s\S]*?\], \[\]\)/;
const newTabs = `const tabs: SettingTab[] = useMemo(() => [
    { id: "company", label: t.settings.tabs.company.label, description: t.settings.tabs.company.description, icon: Building2 },
    { id: "profile", label: t.settings.tabs.profile.label, description: t.settings.tabs.profile.description, icon: User },
    { id: "security", label: t.settings.tabs.security.label, description: t.settings.tabs.security.description, icon: ShieldCheck },
    { id: "roles", label: t.settings.tabs.roles.label, description: t.settings.tabs.roles.description, icon: Users, badge: "RBAC" },
    { id: "theme", label: t.settings.tabs.theme.label, description: t.settings.tabs.theme.description, icon: Palette },
    { id: "notifications", label: t.settings.tabs.notifications.label, description: t.settings.tabs.notifications.description, icon: Bell },
    { id: "integrations", label: t.settings.tabs.integrations.label, description: t.settings.tabs.integrations.description, icon: KeyRound },
    { id: "localization", label: t.settings.tabs.localization.label, description: t.settings.tabs.localization.description, icon: Globe },
    { id: "numbering", label: t.settings.tabs.numbering.label, description: t.settings.tabs.numbering.description, icon: Hash },
    { id: "workflows", label: t.settings.tabs.workflows.label, description: t.settings.tabs.workflows.description, icon: GitPullRequest },
    { id: "backup", label: t.settings.tabs.backup.label, description: t.settings.tabs.backup.description, icon: Database },
    { id: "audit", label: t.settings.tabs.audit.label, description: t.settings.tabs.audit.description, icon: FileText, badge: "60 FPS" },
    { id: "maintenance", label: t.settings.tabs.maintenance.label, description: t.settings.tabs.maintenance.description, icon: Wrench },
    { id: "danger", label: t.settings.tabs.danger.label, description: t.settings.tabs.danger.description, icon: AlertTriangle, danger: true }
  ], [t])`;

content = content.replace(oldTabsRegex, newTabs);

// Replace hardcoded banner title and subtitle
content = content.replace('Çiçekana ERP — Sistem Ayarları', '{t.settings.systemSettingsTitle}');
content = content.replace('v1.0 Kurumsal', '{t.common.enterpriseVersion}');
content = content.replace('Şirket yapılandırması, güvenlik politikaları, marka kiti ve modül parametrelerini merkezi olarak yönetin.', '{t.settings.systemSettingsSubtitle}');

// Replace header action buttons
content = content.replace('Kaydedilmemiş Değişiklikler Var', '{t.common.unsavedChanges}');
content = content.replace(/İptal Et\r?\n\s*<\/button>/, '{t.common.cancel}\n          </button>');
content = content.replace(/Ayarları Kaydet\r?\n\s*<\/button>/, '{t.common.saveChanges}\n          </button>');

// Replace search input placeholder
content = content.replace('placeholder="Ayarlarda ara..."', 'placeholder={t.common.searchInSettings}');

// Company tab replacements
content = content.replace('Genel Şirket ve Şube Kimliği', '{t.settings.companySection.title}');
content = content.replace('Çiçekana ERP üzerinde fatura, irsaliye ve resmi sözleşmelerde görüntülenecek kurumsal bilgileri girin.', '{t.settings.companySection.subtitle}');
content = content.replace('<label className="text-xs font-semibold text-foreground">Şirket Resmi Unvanı</label>', '<label className="text-xs font-semibold text-foreground">{t.settings.companySection.titleLabel}</label>');
content = content.replace('<label className="text-xs font-semibold text-foreground">E-posta Adresi</label>', '<label className="text-xs font-semibold text-foreground">{t.settings.companySection.emailLabel}</label>');
content = content.replace('<label className="text-xs font-semibold text-foreground">Vergi Dairesi</label>', '<label className="text-xs font-semibold text-foreground">{t.settings.companySection.taxOfficeLabel}</label>');
content = content.replace('<label className="text-xs font-semibold text-foreground">Vergi Numarası (VKN)</label>', '<label className="text-xs font-semibold text-foreground">{t.settings.companySection.taxNumberLabel}</label>');
content = content.replace('<label className="text-xs font-semibold text-foreground">Ticaret Sicil No</label>', '<label className="text-xs font-semibold text-foreground">{t.settings.companySection.tradeRegLabel}</label>');
content = content.replace('<label className="text-xs font-semibold text-foreground">MERSİS Numarası</label>', '<label className="text-xs font-semibold text-foreground">{t.settings.companySection.mersisLabel}</label>');
content = content.replace('<label className="text-xs font-semibold text-foreground">Genel Merkez Adresi</label>', '<label className="text-xs font-semibold text-foreground">{t.settings.companySection.addressLabel}</label>');
content = content.replace('<p className="text-xs font-semibold text-foreground">Çoklu Şube / Depo Desteği</p>', '<p className="text-xs font-semibold text-foreground">{t.settings.companySection.multiBranchTitle}</p>');
content = content.replace('<p className="text-[11px] text-muted-foreground">Aktif edildiğinde veri izolasyonu ve şube bazlı yetki ayrıştırması uygulanır.</p>', '<p className="text-[11px] text-muted-foreground">{t.settings.companySection.multiBranchDesc}</p>');

// Profile tab replacements
content = content.replace('Kişisel Profil Bilgileri', '{t.settings.profileSection.title}');
content = content.replace('Sistemde diğer kullanıcılara görüntülenecek ad soyad ve iletişim bilgilerinizi güncelleyin.', '{t.settings.profileSection.subtitle}');
content = content.replace('label="Profil Fotoğrafı Seç"', 'label={t.settings.profileSection.selectAvatar}');
content = content.replace('PNG, JPG veya WEBP formatında maksimum 5MB görsel.', '{t.settings.profileSection.avatarHint}');
content = content.replace('<label className="text-xs font-semibold text-foreground">Kullanıcı Adı (Değiştirilemez)</label>', '<label className="text-xs font-semibold text-foreground">{t.settings.profileSection.usernameDisabled}</label>');
content = content.replace('<label className="text-xs font-semibold text-foreground">Ad Soyad</label>', '<label className="text-xs font-semibold text-foreground">{t.settings.profileSection.fullName}</label>');
content = content.replace('<label className="text-xs font-semibold text-foreground">E-posta</label>', '<label className="text-xs font-semibold text-foreground">{t.settings.profileSection.email}</label>');
content = content.replace('<label className="text-xs font-semibold text-foreground">Telefon</label>', '<label className="text-xs font-semibold text-foreground">{t.settings.profileSection.phone}</label>');

// Sticky bar replacements
content = content.replace('Sayfada kaydedilmemiş değişiklikleriniz var!', '{t.common.unsavedChanges}');

fs.writeFileSync(targetFile, content, 'utf8');
console.log('settings/page.tsx updated with i18n hooks!');
