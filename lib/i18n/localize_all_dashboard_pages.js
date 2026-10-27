const fs = require('fs');
const path = require('path');

const pageConfigs = [
  { file: 'app/dashboard/customers/page.tsx', navKey: 'customers', defaultTitle: 'Müşteriler', defaultSub: 'Detaylı müşteri, b2b ve firma yönetimi' },
  { file: 'app/dashboard/projects/page.tsx', navKey: 'projects', defaultTitle: 'Projeler', defaultSub: 'Devam eden ve tamamlanan projeler' },
  { file: 'app/dashboard/orders/page.tsx', navKey: 'orders', defaultTitle: 'Siparişler', defaultSub: 'Sipariş takibi ve teslimat durumları' },
  { file: 'app/dashboard/finance/page.tsx', navKey: 'finance', defaultTitle: 'Finans', defaultSub: 'Gelir, gider ve fatura takibi' },
  { file: 'app/dashboard/users/page.tsx', navKey: 'users', defaultTitle: 'Kullanıcılar', defaultSub: 'Kullanıcı ve yetki yönetimi' },
  { file: 'app/dashboard/branches/page.tsx', navKey: 'branches', defaultTitle: 'Şubeler', defaultSub: 'Şube yönetimi ve yapılandırması' },
  { file: 'app/dashboard/hr/page.tsx', navKey: 'hr', defaultTitle: 'İnsan Kaynakları', defaultSub: 'Personel ve İK yönetimi' },
  { file: 'app/dashboard/chat/page.tsx', navKey: 'chat', defaultTitle: 'Mesajlaşma', defaultSub: 'Dahili sohbet ve iletişim' },
  { file: 'app/dashboard/cargo/page.tsx', navKey: 'cargo', defaultTitle: 'Kargo', defaultSub: 'Kargo ve teslimat takibi' },
  { file: 'app/dashboard/files/page.tsx', navKey: 'files', defaultTitle: 'Dosyalar', defaultSub: 'Dosya transferi ve dijital arşiv' },
  { file: 'app/dashboard/todos/page.tsx', navKey: 'todos', defaultTitle: 'Yapılacaklar', defaultSub: 'Kişisel yapılacaklar listesi' },
  { file: 'app/dashboard/notes/page.tsx', navKey: 'notes', defaultTitle: 'Notlarım', defaultSub: 'Kişisel notlar ve hatırlatmalar' },
  { file: 'app/dashboard/leads/page.tsx', navKey: 'leads', defaultTitle: 'Potansiyeller', defaultSub: 'Satış hunisi ve aday müşteriler' },
  { file: 'app/dashboard/b2b/page.tsx', navKey: 'store', defaultTitle: 'B2B Mağaza', defaultSub: 'Toptan ürün ve stok talepleri' },
  { file: 'app/dashboard/takvim/page.tsx', navKey: 'calendar', defaultTitle: 'Takvim', defaultSub: 'Etkinlik ve iş takvimi' },
  { file: 'app/dashboard/support-tickets/page.tsx', navKey: 'technicalSupport', defaultTitle: 'Teknik Destek', defaultSub: 'Destek biletleri ve sorun çözümü' },
  { file: 'app/dashboard/announcements/page.tsx', navKey: 'announcements', defaultTitle: 'Duyurular', defaultSub: 'Şirket içi duyurular' },
  { file: 'app/dashboard/hesaplama-araci/page.tsx', navKey: 'calculator', defaultTitle: 'Hesaplama Aracı', defaultSub: 'Akıllı teklif ve maliyet hesaplayıcı' },
  { file: 'app/dashboard/personel-denetim/page.tsx', navKey: 'personelDenetim', defaultTitle: 'Ekip Yük Durumu', defaultSub: 'Çalışan görev ve yük denetimi' },
  { file: 'app/dashboard/personel-talepleri/page.tsx', navKey: 'staffRequests', defaultTitle: 'Personel Talepleri', defaultSub: 'İzin ve operasyonel talepler' },
  { file: 'app/dashboard/ajans-kutuphanesi/page.tsx', navKey: 'agencyLibrary', defaultTitle: 'Ajans Kütüphanesi', defaultSub: 'Kurumsal döküman ve şablonlar' },
  { file: 'app/dashboard/icerik-magazasi/page.tsx', navKey: 'contentStore', defaultTitle: 'İçerik Mağazası', defaultSub: 'Onaylı medya ve içerik deposu' },
  { file: 'app/dashboard/icerik-takvimi/page.tsx', navKey: 'contentCalendar', defaultTitle: 'İçerik Takvimi', defaultSub: 'Sosyal medya içerik planlaması' },
  { file: 'app/dashboard/sosyal-medya/page.tsx', navKey: 'socialMedia', defaultTitle: 'Sosyal Medya', defaultSub: 'Marka ve kanal yönetimi' },
  { file: 'app/dashboard/trash/page.tsx', navKey: 'trash', defaultTitle: 'Geri Dönüşüm Kutusu', defaultSub: 'Silinen öğeler ve kurtarma' },
];

const basePath = 'c:/Users/ADEM/Desktop/erparfamedia/erparfamedia';

pageConfigs.forEach(cfg => {
  const fullPath = path.join(basePath, cfg.file);
  if (!fs.existsSync(fullPath)) return;

  let content = fs.readFileSync(fullPath, 'utf8');

  if (!content.includes('useLanguage')) {
    // Add import
    if (content.includes('import {')) {
      content = content.replace(/(import\s+[\s\S]*?from\s+["'].*?["'];?)/, '$1\nimport { useLanguage } from "@/lib/context/LanguageContext"');
    } else {
      content = 'import { useLanguage } from "@/lib/context/LanguageContext"\n' + content;
    }

    // Add hook call inside main component export default function
    const compRegex = /export\s+default\s+function\s+([A-Za-z0-9_]+)\s*\(([^)]*)\)\s*\{/;
    content = content.replace(compRegex, (match) => `${match}\n  const { t, tText } = useLanguage()`);
  }

  // Replace common Turkish action strings in UI
  content = content.replace(/>\s*İçe Aktar\s*</g, '>{tText("common.import", "İçe Aktar")}<');
  content = content.replace(/>\s*Dışa Aktar\s*</g, '>{tText("common.export", "Dışa Aktar")}<');
  content = content.replace(/>\s*Yeni Ekle\s*</g, '>{tText("common.addNew", "Yeni Ekle")}<');
  content = content.replace(/>\s*Filtrele\s*</g, '>{tText("common.filter", "Filtrele")}<');
  content = content.replace(/>\s*Arama\s*</g, '>{tText("common.search", "Arama")}<');
  content = content.replace(/placeholder="Ara\.\.\."/g, 'placeholder={tText("common.search", "Ara...")}');
  content = content.replace(/placeholder="Arama\.\.\."/g, 'placeholder={tText("common.search", "Arama...")}');
  content = content.replace(/>\s*Kaydet\s*</g, '>{tText("common.save", "Kaydet")}<');
  content = content.replace(/>\s*İptal\s*</g, '>{tText("common.cancel", "İptal")}<');
  content = content.replace(/>\s*Sil\s*</g, '>{tText("common.delete", "Sil")}<');
  content = content.replace(/>\s*Kapat\s*</g, '>{tText("common.close", "Kapat")}<');

  fs.writeFileSync(fullPath, content, 'utf8');
  console.log('Processed:', cfg.file);
});
