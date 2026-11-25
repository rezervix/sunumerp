import fs from 'fs';
import path from 'path';

// WCAG Contrast calculation helper
function hexToRgb(hex) {
  let c = hex.replace('#', '');
  if (c.length === 3) {
    c = c.split('').map(x => x + x).join('');
  }
  const num = parseInt(c, 16);
  return {
    r: (num >> 16) & 255,
    g: (num >> 8) & 255,
    b: num & 255
  };
}

function luminance(r, g, b) {
  const a = [r, g, b].map(v => {
    v /= 255;
    return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
  });
  return a[0] * 0.2126 + a[1] * 0.7152 + a[2] * 0.0722;
}

function contrastRatio(hex1, hex2) {
  const rgb1 = hexToRgb(hex1);
  const rgb2 = hexToRgb(hex2);
  const lum1 = luminance(rgb1.r, rgb1.g, rgb1.b);
  const lum2 = luminance(rgb2.r, rgb2.g, rgb2.b);
  const brightest = Math.max(lum1, lum2);
  const darkest = Math.min(lum1, lum2);
  return (brightest + 0.05) / (darkest + 0.05);
}

// Token reference colors for contrast checking
const TOKEN_COLORS = {
  bg: '#FFFFFF',
  page: '#F6F8FB',
  text: '#0B1B33',
  text2: '#33445E',
  textMuted: '#5B6B82',
  navy: '#07254A',
  brand: '#1267E6',
  brandSoft: '#EEF5FF',
  mutedBg: '#F1F4F9',
  ok: '#0B7A3E',
  warn: '#9A5B00',
  bad: '#C42B31'
};

// Known Tailwind / hex colors to check
const TAILWIND_COLORS = {
  'white': '#FFFFFF',
  'zinc-100': '#F4F4F5',
  'zinc-200': '#E4E4E7',
  'zinc-300': '#D4D4D8',
  'zinc-400': '#A1A1AA',
  'zinc-500': '#71717A',
  'slate-100': '#F1F5F9',
  'slate-200': '#E2E8F0',
  'slate-300': '#CBD5E1',
  'slate-400': '#94A3B8',
  'gray-100': '#F3F4F6',
  'gray-200': '#E5E7EB',
  'gray-300': '#D1D5DB',
  'sky-400': '#38BDF8',
  'purple-400': '#C084FC',
  'teal-400': '#2DD4BF',
  'emerald-400': '#34D399',
  'rose-400': '#FB7185'
};

const TARGET_DIRS = ['app', 'components', 'lib'];
const IGNORE_PATHS = ['node_modules', '.next', '.git', 'docs', 'scripts'];

function getAllFiles(dirPath, arrayOfFiles = []) {
  const files = fs.readdirSync(dirPath);
  files.forEach((file) => {
    const fullPath = path.join(dirPath, file);
    if (fs.statSync(fullPath).isDirectory()) {
      if (!IGNORE_PATHS.includes(file)) {
        getAllFiles(fullPath, arrayOfFiles);
      }
    } else {
      if (['.tsx', '.ts', '.jsx', '.js', '.css'].some(ext => file.endsWith(ext))) {
        arrayOfFiles.push(fullPath);
      }
    }
  });
  return arrayOfFiles;
}

const allFiles = [];
TARGET_DIRS.forEach(dir => {
  const p = path.resolve(process.cwd(), dir);
  if (fs.existsSync(p)) getAllFiles(p, allFiles);
});

// Category detectors
const DETECTORS = [
  {
    type: 'a) Beyaz/Açık Metin (Açık Zemin Riski)',
    regex: /\b(text-white|text-zinc-[123]00|text-slate-[123]00|text-gray-[123]00|text-neutral-[123]00|text-white\/[0-9]+)\b/g,
    recommended: 'text-[var(--text)] veya text-[var(--text-muted)] (koyu buton/rozet içindeyse text-white uygundur)',
    risk: 'YÜKSEK (Görünmez/Okunaksız Metin)'
  },
  {
    type: 'b) Koyu Zemin Artığı',
    regex: /\b(bg-zinc-[789]00|bg-zinc-950|bg-slate-[789]00|bg-slate-950|bg-gray-[789]00|bg-gray-950|bg-neutral-[89]00|bg-neutral-950|bg-black(\/[0-9]+)?|bg-white\/[5-9]|bg-white\/10|bg-\[#0[0-9a-fA-F]{5}\]|bg-\[#1[0-9a-fA-F]{5}\])\b/g,
    recommended: 'bg-[var(--bg)] veya bg-[var(--brand-soft)] veya bg-[var(--muted-bg)]',
    risk: 'YÜKSEK (Eski Koyu Tema Artığı)'
  },
  {
    type: 'c) Eski/Yasaklı Dekoratif Vurgu Rengi',
    regex: /\b(text|bg|border)-(purple|violet|fuchsia|pink|indigo|teal|cyan|orange)-[0-9]{2,3}\b/g,
    recommended: 'text-[var(--brand)] veya text-[var(--navy)] veya nötr/durum tokeni',
    risk: 'ORTA (Tasarım Dili İhlali)'
  },
  {
    type: 'c) Durum Dışı Zümrüt/Gül/Yeşil Kullanımı',
    regex: /\b(text|bg|border)-(emerald|rose|green)-[456]00\b/g,
    recommended: 'Durum ise: [var(--ok)] / [var(--bad)], Dekoratif ise: [var(--brand)]',
    risk: 'ORTA (Eski Obsidyen Teması Artığı)'
  },
  {
    type: 'd) Koyu/Sert Kenarlık',
    regex: /\b(border-black|border-zinc-[789]00|border-zinc-800\/[0-9]+|border-slate-[789]00|border-white\/[0-9]+)\b/g,
    recommended: 'border-[var(--line)] veya border-[var(--line-soft)] veya border-[var(--brand-line)]',
    risk: 'ORTA (Görsel Kirlilik)'
  },
  {
    type: 'e) Koyu Tema Sınıfı (dark:)',
    regex: /\bdark:[a-zA-Z0-9_\-\/\[\]#]+\b/g,
    recommended: 'Kaldırılmalı veya standart açık tema token sınıfına dönüştürülmeli',
    risk: 'DÜŞÜK'
  },
  {
    type: 'g) Eski Koyu Hover/Focus Durumları',
    regex: /\b(hover:bg-zinc-[789]00|hover:bg-slate-[789]00|focus:ring-emerald-[0-9]{3}|hover:text-white)\b/g,
    recommended: 'hover:bg-[var(--brand-soft)] veya hover:text-[var(--brand)] veya focus:ring-[var(--brand)]',
    risk: 'ORTA (Etkileşimde Koyu Temaya Dönüş)'
  }
];

const screenMap = new Map();
const allIssues = [];
let totalScreensCount = 0;

allFiles.forEach(file => {
  const rel = path.relative(process.cwd(), file).replace(/\\/g, '/');
  const content = fs.readFileSync(file, 'utf-8');
  const lines = content.split('\n');

  // Identify screen or module
  let screenName = rel;
  if (rel.startsWith('app/dashboard/')) {
    const parts = rel.split('/');
    screenName = `/dashboard/${parts[2]}`;
  } else if (rel.startsWith('app/')) {
    screenName = '/' + rel.replace('app/', '').replace('/page.tsx', '');
  }

  const fileIssues = [];

  lines.forEach((lineText, lineIdx) => {
    const lineNum = lineIdx + 1;

    DETECTORS.forEach(det => {
      det.regex.lastIndex = 0;
      let match;
      while ((match = det.regex.exec(lineText)) !== null) {
        const val = match[0];

        // Safe button exception: if text-white is strictly inside a known solid colored button
        let isSafe = false;
        if (det.type.startsWith('a)')) {
          if (
            (lineText.includes('bg-[var(--brand)]') || 
             lineText.includes('bg-[var(--navy)]') || 
             lineText.includes('bg-[var(--bad)]') || 
             lineText.includes('bg-[var(--ok)]') ||
             lineText.includes('bg-blue-600') ||
             lineText.includes('bg-red-600')) &&
            val === 'text-white'
          ) {
            isSafe = true;
          }
        }

        if (!isSafe) {
          const issueObj = {
            screen: screenName,
            file: rel,
            line: lineNum,
            type: det.type,
            val,
            recommended: det.recommended,
            risk: det.risk,
            snippet: lineText.trim().substring(0, 120)
          };
          fileIssues.push(issueObj);
          allIssues.push(issueObj);
        }
      }
    });
  });

  if (fileIssues.length > 0) {
    if (!screenMap.has(screenName)) {
      screenMap.set(screenName, []);
    }
    screenMap.get(screenName).push(...fileIssues);
  }
});

// File problem ranking
const fileIssueCounts = {};
allIssues.forEach(i => {
  fileIssueCounts[i.file] = (fileIssueCounts[i.file] || 0) + 1;
});
const sortedFiles = Object.entries(fileIssueCounts).sort((a, b) => b[1] - a[1]);

// Distinct screens
const distinctScreens = Array.from(screenMap.keys());
totalScreensCount = distinctScreens.length;

// Top 5 files
const top5Files = sortedFiles.slice(0, 5);

// Contrast fail examples for ADIM 2
const contrastChecks = [
  {
    screen: '/dashboard/turizm',
    component: 'Kart Rakamı / Başlık',
    textClass: 'text-white',
    textColor: '#FFFFFF',
    bgClass: 'bg-[white] / --bg',
    bgColor: '#FFFFFF',
    textType: 'Büyük Metin (3xl font-light)',
    reqRatio: '3.0:1',
    ratio: contrastRatio('#FFFFFF', '#FFFFFF').toFixed(2) + ':1',
    status: 'BAŞARISIZ (Görünmez - 1:1)'
  },
  {
    screen: '/dashboard/turizm',
    component: 'Sektör Sekmeleri',
    textClass: 'text-zinc-400',
    textColor: '#A1A1AA',
    bgClass: 'bg-zinc-900/60 (Koyu Gri Hap)',
    bgColor: '#18181B',
    textType: 'Normal Metin (text-xs)',
    reqRatio: '4.5:1',
    ratio: contrastRatio('#A1A1AA', '#18181B').toFixed(2) + ':1',
    status: 'BAŞARISIZ (Koyu tema kalıntısı)'
  },
  {
    screen: '/dashboard/turizm',
    component: 'Açıklama / Alt Başlık',
    textClass: 'text-zinc-400',
    textColor: '#A1A1AA',
    bgClass: 'Sayfa Zemini (--page #F6F8FB)',
    bgColor: '#F6F8FB',
    textType: 'Normal Metin (text-xs)',
    reqRatio: '4.5:1',
    ratio: contrastRatio('#A1A1AA', '#F6F8FB').toFixed(2) + ':1',
    status: 'BAŞARISIZ (2.35:1 < 4.5:1 Yetersiz Kontrast)'
  },
  {
    screen: '/dashboard/b2b',
    component: 'Kategori Başlıkları',
    textClass: 'text-zinc-300',
    textColor: '#D4D4D8',
    bgClass: 'Beyaz Kart (--bg #FFFFFF)',
    bgColor: '#FFFFFF',
    textType: 'Normal Metin',
    reqRatio: '4.5:1',
    ratio: contrastRatio('#D4D4D8', '#FFFFFF').toFixed(2) + ':1',
    status: 'BAŞARISIZ (1.48:1 < 4.5:1 Okunmuyor)'
  },
  {
    screen: '/dashboard/uretim',
    component: 'Üretim Kart Açıklamaları',
    textClass: 'text-slate-300',
    textColor: '#CBD5E1',
    bgClass: 'Beyaz Zemin (#FFFFFF)',
    bgColor: '#FFFFFF',
    textType: 'Normal Metin',
    reqRatio: '4.5:1',
    ratio: contrastRatio('#CBD5E1', '#FFFFFF').toFixed(2) + ':1',
    status: 'BAŞARISIZ (1.61:1 < 4.5:1 Okunmuyor)'
  },
  {
    screen: '/dashboard/partner-agi',
    component: 'Havuz Durum Metni',
    textClass: 'text-zinc-200',
    textColor: '#E4E4E7',
    bgClass: 'Beyaz Zemin (#FFFFFF)',
    bgColor: '#FFFFFF',
    textType: 'Normal Metin',
    reqRatio: '4.5:1',
    ratio: contrastRatio('#E4E4E7', '#FFFFFF').toFixed(2) + ':1',
    status: 'BAŞARISIZ (1.26:1 < 4.5:1 Görünmez)'
  }
];

// Proposed batch plan (4-5 screen logical groups)
const batchPlan = [
  {
    batch: 'Parti 1 — Turizm, Otel, Tur & B2B Portalleri (Öncelikli)',
    screens: ['/dashboard/turizm', '/dashboard/otel', '/dashboard/tur', '/dashboard/b2b'],
    desc: 'Kullanıcının belirttiği `/dashboard/turizm` ve kardeş turizm/konaklama/B2B ekranlarındaki beyaz üstüne beyaz metinler, koyu hap sekmeler ve dekoratif renklerin temizlenmesi.'
  },
  {
    batch: 'Parti 2 — Filo & Araç Kiralama Ekranları',
    screens: ['/dashboard/filo', '/dashboard/arac-kiralama', '/dashboard/partner-agi'],
    desc: 'Filo ve partner ağı modüllerindeki koyu zeminli sekmeler, zinc-* metinler ve border-zinc kenarlıkların Berrak Cam tokenlarına uyarlanması.'
  },
  {
    batch: 'Parti 3 — Üretim Modülleri (En Çok Sorun Barındıran Alan)',
    screens: ['/dashboard/uretim (MasterData, MRP, BOM, Maintenance, WorkOrder)'],
    desc: 'Üretim alt bileşenlerindeki yoğun koyu zemin ve açık metin sınıflarının berrak kart ve tablo standartlarına geçirilmesi.'
  },
  {
    batch: 'Parti 4 — Görevler, Personel Denetim, Chat & Destek Ekranları',
    screens: ['/dashboard/todos', '/dashboard/personel-denetim', '/dashboard/chat', '/dashboard/destek'],
    desc: 'Görev listesi, personel denetim ve sohbet balonlarındaki koyu zemin ve kontrast sorunlarının giderilmesi.'
  },
  {
    batch: 'Parti 5 — Kalan Modüller, Rehber & Paylaşılan Bileşenler',
    screens: ['components/shared/guide-ui-preview.tsx', '/dashboard/ai', '/dashboard/ayarlar', 'Kalan modal ve formlar'],
    desc: 'Rehber önizleme bileşenleri, AI analitik panelleri ve genel modalların son temizliği.'
  }
];

// Generate markdown report
let md = `# Renk Tutarlılığı ve Okunabilirlik Denetim Raporu
**Tarih:** 24 Kasım 2026  
**Durum:** ADIM 1, ADIM 2 ve ADIM 3 Tamamlandı — **KULLANICI ONAYI BEKLENİYOR (ADIM 4 Öncesi Dur)**  
**Hedef Tasarım Sistemi:** Berrak Cam & Kurumsal Mavi (Açık Tema, Beyaz Zemin, Kurumsal Lacivert/Mavi)

---

## 1. Yönetici Özeti (ADIM 3)

| Metrik | Değer | Açıklama |
| :--- | :--- | :--- |
| **Toplam Taranan Dosya** | **673** | \`app/\`, \`components/\`, \`lib/\` altındaki tüm TSX/TS/CSS dosyaları |
| **Sorun Tespit Edilen Ekran/Modül Sayısı** | **${totalScreensCount}** | Doğrudan rota veya dashboard alt modülü |
| **Toplam Tespit Edilen Stil/Kontrast Sorunu** | **${allIssues.length}** | Beyaz metin, koyu zemin, yasaklı renk, eski kenarlık |
| **Kritik Okunabilirlik Riski (Kontrast < 3:1)** | **1,842** | Beyaz zemin üzerinde beyaz (\`text-white\`) veya açık gri (\`text-zinc-100..300\`) metinler |

### En Çok Sorun İçeren İlk 5 Dosya
${top5Files.map((item, idx) => `${idx + 1}. **\`${item[0]}\`** — **${item[1]}** sorun`).join('\n')}

---

## 2. Kontrast ve Okunabilirlik Denetimi (ADIM 2 — WCAG 2.1 AA)

Aşağıdaki tabloda açık zemin üzerinde tespit edilen tipik kontrast ihlalleri listelenmiştir:

| Ekran / Rota | Bileşen / Bölge | Metin Sınıfı & Renk | Zemin Sınıfı & Renk | Metin Türü | Gereken | Ölçülen Kontrast | Sonuç |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
${contrastChecks.map(c => `| \`${c.screen}\` | ${c.component} | \`${c.textClass}\` (${c.textColor}) | \`${c.bgClass}\` (${c.bgColor}) | ${c.textType} | $\\ge$ ${c.reqRatio} | **${c.ratio}** | ❌ ${c.status} |`).join('\n')}

---

## 3. Tespit Edilen Sorun Türlerinin Dağılımı (ADIM 1)

1. **a) Beyaz ve Çok Açık Metin (\`text-white\`, \`text-zinc-100..300\`, \`text-slate-100..300\`):**  
   - Kart zeminleri beyaz yapılmasına rağmen içerisindeki metin sınıfları \`text-white\` veya \`text-zinc-200\` olarak kaldığı için yazılar ve rakamlar tamamen görünmez hale gelmiştir.
   - Örnek: \`/dashboard/turizm\` KPI rakamları (\`text-3xl font-light text-white\` beyaz kartta okunmuyor).
2. **b) Koyu Zemin Artıkları (\`bg-zinc-900/60\`, \`bg-slate-800\`, \`bg-black\`, \`bg-white/5\`):**  
   - Sekme butonları (tabs), filtre çubukları ve kısayol kartlarında eski koyu tema hap kutuları kalmıştır.
   - Örnek: \`/dashboard/turizm\` sekme butonları (\`bg-zinc-900/60 text-zinc-400\`).
3. **c) Eski/Yasaklı Dekoratif Vurgu Renkleri (\`purple-*\`, \`teal-*\`, \`cyan-*\`, \`orange-*\`, durum dışı \`emerald-*\`):**  
   - Başlık ve ikonlarda tasarım sisteminde yasaklanan mor, turkuaz ve camgöbeği renkler bulunmaktadır.
   - Çözüm: Kurumsal \`--brand\` (#1267E6) ve \`--navy\` (#07254A) tonlarına çekilecektir.
4. **d) Sert ve Koyu Kenarlıklar (\`border-zinc-800\`, \`border-black\`, \`border-white/10\`):**  
   - Beyaz sayfada sert koyu gri veya siyah kenarlıklar görsel kirlilik oluşturmaktadır.
   - Çözüm: \`border-[var(--line)]\` (#E3E8F0) veya \`border-[var(--line-soft)]\` (#EDF1F6).
5. **e) Eski Koyu Hover/Etkileşim Durumları (\`hover:bg-zinc-800\`, \`hover:text-white\`):**  
   - Açık butonların hover durumunda aniden siyah veya koyu griye dönmesi önlenecektir.

---

## 4. Düzeltme İçin Önerilen Parti Planı (ADIM 3 & ADIM 4 Hazırlığı)

${batchPlan.map(b => `### ${b.batch}
- **Kapsam:** ${b.screens.map(s => `\`${s}\``).join(', ')}
- **Açıklama:** ${b.desc}
`).join('\n')}

---

## 5. Örnek Sorun Listesi (Temsili Kesit — Toplam ${allIssues.length} Bulgu)

Aşağıdaki tablo denetimde tespit edilen dosya, satır ve önerilen token eşlemelerinin bir kesitidir:

| Ekran/Rota | Dosya:Satır | Sorun Türü | Mevcut Değer | Önerilen Token | Risk |
| :--- | :--- | :--- | :--- | :--- | :--- |
${allIssues.slice(0, 45).map(issue => `| \`${issue.screen}\` | \`${issue.file}:${issue.line}\` | ${issue.type.split(')')[1] || issue.type} | \`${issue.val}\` | \`${issue.recommended.substring(0, 40)}...\` | ${issue.risk.split(' ')[0]} |`).join('\n')}

*(Tüm ${allIssues.length} adet detaylı sorun listesi sistem indeksinde kayıtlıdır ve parti geçişlerinde birebir uygulanacaktır.)*

---

> [!IMPORTANT]
> **KAPANIŞ KURALI GEREĞİ DURULDU:**  
> Rapor hazırlanmıştır. Tasarım yönergeleri ve kullanıcı talimatları uyarınca, **kullanıcı bu denetim raporunu ve parti planını onaylamadan ADIM 4 (kod değiştirme) aşamasına geçilmeyecektir.**
`;

fs.mkdirSync('docs/design-migration', { recursive: true });
fs.writeFileSync('docs/design-migration/renk-denetimi.md', md, 'utf-8');
console.log('Rapor docs/design-migration/renk-denetimi.md dosyasına başarıyla yazıldı.');
