import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';

const PARTI_1_FILES = [
  'app/dashboard/turizm/page.tsx',
  'app/dashboard/turizm/raporlar/page.tsx',
  'app/dashboard/otel/page.tsx',
  'app/dashboard/otel/components/HotelFloorPlanAndGanttTabs.tsx',
  'app/dashboard/otel/components/HotelHkKbsAllotmentAndReportsTabs.tsx',
  'app/dashboard/otel/components/HotelReservationsAndFolioTabs.tsx',
  'app/dashboard/otel/housekeeping/page.tsx',
  'app/dashboard/tur/page.tsx',
  'app/dashboard/tur/components/TourBookingsManifestoAndResourcesTabs.tsx',
  'app/dashboard/tur/components/TourPackagesAndSeatMapTabs.tsx',
  'app/dashboard/tur/components/TourProfitAgenciesAndReportsTabs.tsx',
  'app/dashboard/tur/rehber/page.tsx',
  'app/dashboard/b2b/page.tsx'
];

// Analysis of Parti 1
let totalMatches = 0;
let falsePositives = [];
let trueIssues = [];

const chromeExe = "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";
const screenshotDir = path.resolve('docs/design-migration/screenshots/parti-1');
fs.mkdirSync(screenshotDir, { recursive: true });

PARTI_1_FILES.forEach(relPath => {
  const fullPath = path.resolve(relPath);
  if (!fs.existsSync(fullPath)) return;

  const content = fs.readFileSync(fullPath, 'utf-8');
  const lines = content.split('\n');

  lines.forEach((line, idx) => {
    const lineNum = idx + 1;
    const trimmed = line.trim();

    // Check for tokens of interest
    // a) White/light text
    const whiteMatch = trimmed.match(/\b(text-white|text-zinc-[123]00|text-slate-[123]00|text-gray-[123]00|text-neutral-[123]00)\b/g);
    if (whiteMatch) {
      whiteMatch.forEach(val => {
        totalMatches++;
        // Check if inside a solid dark button/badge
        const isSolidButton = (
          (trimmed.includes('bg-[var(--brand)]') || 
           trimmed.includes('bg-[var(--navy)]') || 
           trimmed.includes('bg-blue-600') ||
           trimmed.includes('bg-emerald-600') ||
           trimmed.includes('bg-red-600') ||
           trimmed.includes('bg-[var(--bad)]') ||
           trimmed.includes('bg-[var(--ok)]')) && val === 'text-white'
        );
        if (isSolidButton) {
          falsePositives.push({ file: relPath, line: lineNum, val, reason: 'Koyu dolgulu buton/rozet içinde beyaz metin (doğru kullanım)', snippet: trimmed.substring(0, 80) });
        } else {
          trueIssues.push({ file: relPath, line: lineNum, category: 'Beyaz/Açık Metin (Okunaksız)', val, snippet: trimmed.substring(0, 80) });
        }
      });
    }

    // b) Dark background remnants
    const darkBgMatch = trimmed.match(/\b(bg-zinc-[789]00|bg-zinc-950|bg-slate-[789]00|bg-slate-950|bg-black(\/[0-9]+)?|bg-white\/[5-9]|bg-white\/10)\b/g);
    if (darkBgMatch) {
      darkBgMatch.forEach(val => {
        totalMatches++;
        trueIssues.push({ file: relPath, line: lineNum, category: 'Koyu Zemin Artığı (Hap/Kutu)', val, snippet: trimmed.substring(0, 80) });
      });
    }

    // c) Decorative colors
    const decorMatch = trimmed.match(/\b(text|bg|border)-(purple|violet|fuchsia|pink|indigo|teal|cyan|orange)-[0-9]{2,3}\b/g);
    if (decorMatch) {
      decorMatch.forEach(val => {
        totalMatches++;
        trueIssues.push({ file: relPath, line: lineNum, category: 'Yasaklı Dekoratif Vurgu Rengi', val, snippet: trimmed.substring(0, 80) });
      });
    }

    // d) Dark borders
    const borderMatch = trimmed.match(/\b(border-black|border-zinc-[789]00|border-zinc-800\/[0-9]+|border-white\/[0-9]+)\b/g);
    if (borderMatch) {
      borderMatch.forEach(val => {
        totalMatches++;
        trueIssues.push({ file: relPath, line: lineNum, category: 'Koyu/Sert Kenarlık', val, snippet: trimmed.substring(0, 80) });
      });
    }

    // e) Dark hover states
    const hoverMatch = trimmed.match(/\b(hover:bg-zinc-[789]00|hover:text-white)\b/g);
    if (hoverMatch) {
      hoverMatch.forEach(val => {
        totalMatches++;
        // If element is already a solid button, hover:text-white might be benign, otherwise it's an issue
        if (trimmed.includes('bg-[var(--brand)]') || trimmed.includes('bg-blue-600')) {
          falsePositives.push({ file: relPath, line: lineNum, val, reason: 'Koyu buton hover durumu', snippet: trimmed.substring(0, 80) });
        } else {
          trueIssues.push({ file: relPath, line: lineNum, category: 'Eski Koyu Hover Durumu', val, snippet: trimmed.substring(0, 80) });
        }
      });
    }
  });
});

console.log('=== PARTİ 1 SORUN VE YANLIŞ ALARM ANALİZİ ===');
console.log(`Parti 1 taranan dosya sayısı: ${PARTI_1_FILES.length}`);
console.log(`Toplam eşleşme sayısı: ${totalMatches}`);
console.log(`Yanlış alarmlar (Doğru buton/rozet kullanımı): ${falsePositives.length}`);
console.log(`GERÇEK DÜZELTİLECEK SORUN SAYISI: ${trueIssues.length}`);

// Group true issues by category
const catCounts = {};
trueIssues.forEach(i => {
  catCounts[i.category] = (catCounts[i.category] || 0) + 1;
});
console.log('\nKategori bazında gerçek sorunlar:');
console.table(catCounts);

// File breakdown
const fileBreakdown = {};
trueIssues.forEach(i => {
  fileBreakdown[i.file] = (fileBreakdown[i.file] || 0) + 1;
});
console.log('\nDosya bazında gerçek sorunlar:');
console.table(fileBreakdown);

// Save report data
fs.writeFileSync('scripts/parti1-analysis.json', JSON.stringify({
  totalMatches,
  falsePositivesCount: falsePositives.length,
  falsePositives,
  trueIssuesCount: trueIssues.length,
  catCounts,
  fileBreakdown,
  trueIssues
}, null, 2));

// Capture screenshots function
const routes = [
  { url: 'http://localhost:3000/dashboard/turizm', name: 'turizm-once.png' },
  { url: 'http://localhost:3000/dashboard/otel', name: 'otel-once.png' },
  { url: 'http://localhost:3000/dashboard/tur', name: 'tur-once.png' },
  { url: 'http://localhost:3000/dashboard/b2b', name: 'b2b-once.png' }
];

console.log('\nEkran görüntüleri alınıyor...');
routes.forEach(r => {
  const outPath = path.join(screenshotDir, r.name);
  try {
    const cmd = `"${chromeExe}" --headless --disable-gpu --window-size=1440,900 --hide-scrollbars --screenshot="${outPath}" "${r.url}"`;
    execSync(cmd, { stdio: 'ignore', timeout: 15000 });
    console.log(`[OK] Ekran görüntüsü alındı: ${r.name}`);
  } catch (err) {
    console.error(`[HATA] ${r.name} alınamadı:`, err.message);
  }
});
