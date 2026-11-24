#!/usr/bin/env node
/**
 * Design Token Linter & CI Guard
 * "Berrak Cam & Kurumsal Mavi" Tasarım Sistemi Token Koruma Betiği
 * 
 * Bu betik kod tabanında yasaklanmış olan eski Obsidian & Emerald token'larını
 * ve yetkisiz hex renk kullanımlarını denetler.
 */

import fs from 'fs';
import path from 'path';

const FORBIDDEN_PATTERNS = [
  { pattern: /#080A09/i, label: 'Eski koyu zemin (#080A09) -> --page / --bg kullanın' },
  { pattern: /#0B0F13/i, label: 'Eski koyu zemin (#0B0F13) -> --page / --bg kullanın' },
  { pattern: /#111513/i, label: 'Eski kart zemini (#111513) -> bg-white/80 backdrop-blur-xl kullanın' },
  { pattern: /#34D399/i, label: 'Eski zümrüt vurgusu (#34D399) -> --brand (#1267E6) kullanın' },
  { pattern: /#10B981/i, label: 'Eski zümrüt vurgusu (#10B981) -> --brand (#1267E6) kullanın' },
  { pattern: /\bemerald-[0-9]{2,3}\b/i, label: 'Eski emerald Tailwind sınıfları -> --brand / --ok tokenları kullanın' },
  { pattern: /\bglow-emerald\b/i, label: 'Eski yeşil glow efektleri -> --shadow-brand kullanın' },
];

const SCAN_DIRS = ['app', 'components', 'lib'];
const IGNORE_FILES = ['node_modules', '.next', '.git', 'check-design-tokens.mjs', 'docs'];

function scanDirectory(dir) {
  let issues = [];
  if (!fs.existsSync(dir)) return issues;

  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (IGNORE_FILES.some(ignore => fullPath.includes(ignore))) continue;

    if (entry.isDirectory()) {
      issues = issues.concat(scanDirectory(fullPath));
    } else if (entry.isFile() && /\.(tsx|ts|jsx|js|css)$/.test(entry.name)) {
      const content = fs.readFileSync(fullPath, 'utf-8');
      const lines = content.split('\n');

      lines.forEach((line, lineIndex) => {
        // Skip comment lines or definition lines in design-tokens.ts itself
        if (fullPath.includes('design-tokens.ts') && line.includes('DEPRECATED_MAPPINGS')) return;

        for (const { pattern, label } of FORBIDDEN_PATTERNS) {
          if (pattern.test(line)) {
            issues.push({
              file: fullPath,
              line: lineIndex + 1,
              code: line.trim(),
              reason: label
            });
          }
        }
      });
    }
  }
  return issues;
}

console.log('🔍 "Berrak Cam & Kurumsal Mavi" Token Denetimi Başlatılıyor...');
let allIssues = [];
for (const dir of SCAN_DIRS) {
  allIssues = allIssues.concat(scanDirectory(dir));
}

if (allIssues.length === 0) {
  console.log('✅ Harika! Kod tabanında hiçbir eski Obsidian / Emerald tokenı bulunamadı. Tasarım sistemi %100 uyumlu.');
  process.exit(0);
} else {
  console.warn(`⚠️  Toplam ${allIssues.length} adet token uyumsuzluğu bulundu:\n`);
  allIssues.slice(0, 30).forEach(({ file, line, code, reason }) => {
    console.warn(`  ${file}:${line}`);
    console.warn(`    Hata: ${reason}`);
    console.warn(`    Kod:  ${code.slice(0, 80)}...\n`);
  });
  if (allIssues.length > 30) {
    console.warn(`  ...ve ${allIssues.length - 30} diğer dosya.`);
  }
  process.exit(1);
}
