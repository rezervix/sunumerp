import fs from 'fs';
import path from 'path';

const TARGET_DIRS = ['app', 'components', 'lib'];
const EXTENSIONS = ['.tsx', '.ts', '.jsx', '.js', '.css'];

// Excluded paths
const IGNORE_PATHS = [
  'node_modules',
  '.next',
  '.git',
  'docs',
  'scripts'
];

// Patterns to search for
const RULES = [
  {
    id: 'white_text_risk',
    category: 'a) Beyaz/Çok Açık Metin',
    regex: /\b(text-white|text-slate-[5123]00|text-gray-[123]00|text-zinc-[123]00|text-neutral-[123]00|text-white\/[0-9]+)\b/g,
    description: 'Açık zeminde görünmezlik/kontrast riski olan beyaz veya çok açık metin sınıfı',
    recommended: 'text-[var(--text)] veya text-[var(--text-muted)] (veya koyu buton içinde ise text-white kalabilir)',
    risk: 'Yüksek (Kontrast hatası)'
  },
  {
    id: 'dark_bg_remnant',
    category: 'b) Koyu Zemin Artığı',
    regex: /\b(bg-slate-[789]00|bg-slate-950|bg-gray-[789]00|bg-gray-950|bg-zinc-[789]00|bg-zinc-950|bg-black|bg-neutral-[89]00|bg-neutral-950|bg-\[#0[0-9a-fA-F]{5}\]|bg-\[#1[0-9a-fA-F]{5}\]|bg-white\/[5-9]|bg-white\/10|bg-black\/[0-9]+)\b/g,
    description: 'Eski koyu tema zemin kalıntısı',
    recommended: 'bg-[var(--bg)] veya bg-[var(--brand-soft)] veya bg-[var(--muted-bg)]',
    risk: 'Yüksek (Eski tema kutusu/butonu)'
  },
  {
    id: 'decorative_accent',
    category: 'c) Eski/Dekoratif Vurgu Rengi',
    regex: /\b(text|bg|border)-(purple|violet|fuchsia|pink|indigo|teal|cyan|orange)-[0-9]{2,3}\b/g,
    description: 'Yasaklı dekoratif renk (mor, turkuaz, turuncu, camgöbeği, pembe vb.)',
    recommended: 'text-[var(--brand)] veya text-[var(--navy)] veya nötr/durum tokeni',
    risk: 'Orta (Tasarım dili tutarsızlığı)'
  },
  {
    id: 'non_status_emerald_rose',
    category: 'c) Eski Vurgu Rengi (Zümrüt/Gül kalıntısı)',
    regex: /\b(text|bg|border)-(emerald|rose)-[456]00\b/g,
    description: 'Eski zümrüt veya dekoratif gül/kırmızı rengi (yalnızca durum için olmalı)',
    recommended: 'Durum ise: text-[var(--ok)] / text-[var(--bad)], Dekoratif ise: text-[var(--brand)]',
    risk: 'Orta'
  },
  {
    id: 'dark_borders',
    category: 'd) Koyu/Uyumsuz Kenarlık',
    regex: /\b(border-black|border-slate-[789]00|border-zinc-[789]00|border-zinc-800\/[0-9]+|border-white\/[0-9]+)\b/g,
    description: 'Koyu veya eski opak kenarlık',
    recommended: 'border-[var(--line)] veya border-[var(--line-soft)] veya border-[var(--brand-line)]',
    risk: 'Orta (Görsel kirlilik)'
  },
  {
    id: 'dark_mode_prefix',
    category: 'e) Koyu Tema Sınıfı',
    regex: /\bdark:[a-zA-Z0-9_\-\/\[\]#]+\b/g,
    description: 'dark: önekli sınıf (sistem açık temaya sabitlendi)',
    recommended: 'Kaldırılmalı veya standart token sınıfı haline getirilmeli',
    risk: 'Düşük'
  }
];

function getAllFiles(dirPath, arrayOfFiles = []) {
  const files = fs.readdirSync(dirPath);

  files.forEach((file) => {
    const fullPath = path.join(dirPath, file);
    if (fs.statSync(fullPath).isDirectory()) {
      if (!IGNORE_PATHS.includes(file)) {
        getAllFiles(fullPath, arrayOfFiles);
      }
    } else {
      if (EXTENSIONS.some(ext => file.endsWith(ext))) {
        arrayOfFiles.push(fullPath);
      }
    }
  });

  return arrayOfFiles;
}

const allFiles = [];
TARGET_DIRS.forEach(dir => {
  const p = path.resolve(process.cwd(), dir);
  if (fs.existsSync(p)) {
    getAllFiles(p, allFiles);
  }
});

console.log(`Toplam taranan dosya sayısı: ${allFiles.length}`);

const reportItems = [];
const fileStats = {};

allFiles.forEach(file => {
  const relPath = path.relative(process.cwd(), file).replace(/\\/g, '/');
  const content = fs.readFileSync(file, 'utf-8');
  const lines = content.split('\n');

  lines.forEach((lineText, idx) => {
    const lineNum = idx + 1;

    RULES.forEach(rule => {
      let match;
      rule.regex.lastIndex = 0;
      while ((match = rule.regex.exec(lineText)) !== null) {
        const matchedVal = match[0];
        
        // Context filtering: if text-white is inside a primary button with bg-[var(--brand)] or bg-emerald/bg-red/bg-blue, it might be intentional
        let isLikelySafe = false;
        if (rule.id === 'white_text_risk') {
          if (
            (lineText.includes('bg-[var(--brand)]') || 
             lineText.includes('bg-[var(--navy)]') || 
             lineText.includes('bg-[var(--bad)]') || 
             lineText.includes('bg-[var(--ok)]') ||
             lineText.includes('bg-blue-600') ||
             lineText.includes('bg-red-600')) &&
            matchedVal === 'text-white'
          ) {
            isLikelySafe = true; // Button with solid dark background
          }
        }

        if (!isLikelySafe) {
          if (!fileStats[relPath]) {
            fileStats[relPath] = { count: 0, issues: [] };
          }
          fileStats[relPath].count++;

          reportItems.push({
            file: relPath,
            line: lineNum,
            category: rule.category,
            matchedVal,
            description: rule.description,
            recommended: rule.recommended,
            risk: rule.risk,
            snippet: lineText.trim().substring(0, 100)
          });
        }
      }
    });
  });
});

console.log(`Toplam bulunan sorun adedi: ${reportItems.length}`);

// Sort files by issue count descending
const sortedFiles = Object.entries(fileStats)
  .sort((a, b) => b[1].count - a[1].count);

console.log('\nEn çok sorun bulunan ilk 15 dosya:');
sortedFiles.slice(0, 15).forEach(([f, stat]) => {
  console.log(`- ${f}: ${stat.count} sorun`);
});

// Write raw audit data to json
fs.writeFileSync('scripts/audit-results.json', JSON.stringify({ reportItems, sortedFiles }, null, 2));
