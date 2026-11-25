import fs from 'fs';
import path from 'path';

const DIRS = ['app', 'components', 'lib'];
const IGNORE = ['node_modules', '.next', '.git', 'docs', 'scripts'];

function walk(dir, fileList = []) {
  if (!fs.existsSync(dir)) return fileList;
  const files = fs.readdirSync(dir);
  for (const f of files) {
    if (IGNORE.includes(f)) continue;
    const full = path.join(dir, f);
    const stat = fs.statSync(full);
    if (stat.isDirectory()) {
      walk(full, fileList);
    } else if (/\.(tsx|ts|jsx|js|css)$/.test(f)) {
      fileList.push(full);
    }
  }
  return fileList;
}

const allFiles = [];
for (const d of DIRS) {
  walk(d, allFiles);
}

function cleanLegacyGhostButtons(content) {
  let code = content;

  // 1. Ghost buttons with bg-white/[0.08] text-white
  code = code.replace(/bg-white\/\[0\.08\]\s+hover:bg-white\/\[0\.14\]\s+text-white/g, 'bg-[var(--brand-soft)] hover:bg-[var(--brand-soft-2)] text-[var(--brand)] font-medium');
  code = code.replace(/bg-white\/\[0\.08\]\s+text-white/g, 'bg-[var(--brand-soft)] text-[var(--brand)] font-medium');
  code = code.replace(/hover:bg-white\/\[0\.14\]\s+text-white/g, 'hover:bg-[var(--brand-soft)] text-[var(--brand)]');
  code = code.replace(/hover:bg-white\/\[0\.12\]\s+text-white/g, 'hover:bg-[var(--brand-soft)] text-[var(--brand)]');
  code = code.replace(/hover:bg-white\/\[0\.1\]\s+text-white/g, 'hover:bg-[var(--brand-soft)] text-[var(--brand)]');

  // 2. strong tags with text-white
  code = code.replace(/<strong className="text-white block mb-0\.5">/g, '<strong className="text-[var(--text)] block mb-0.5">');
  code = code.replace(/<strong className="text-white block">/g, '<strong className="text-[var(--text)] block">');
  code = code.replace(/<strong className="text-white">/g, '<strong className="text-[var(--text)]">');

  // 3. Status badges with bg-rose-400 or bg-emerald-400
  code = code.replace(/bg-rose-400 text-\[var\(--text\)\]/g, 'bg-[var(--bad-soft)] text-[var(--bad)]');
  code = code.replace(/bg-emerald-400 text-\[var\(--text\)\]/g, 'bg-[var(--ok-soft)] text-[var(--ok)]');

  // 4. Muted bg with text-white
  code = code.replace(/bg-\[--muted-bg\]([^"]*?)text-white/g, 'bg-[--muted-bg]$1text-[var(--text)]');
  code = code.replace(/bg-\[var\(--muted-bg\)\]([^"]*?)text-white/g, 'bg-[var(--muted-bg)]$1text-[var(--text)]');

  // 5. General gradient buttons: check from-[--brand]
  // from-[--brand] to-[--blue] text-white is valid button text-white

  return code;
}

let modified = 0;
for (const file of allFiles) {
  const content = fs.readFileSync(file, 'utf-8');
  const transformed = cleanLegacyGhostButtons(content);
  if (transformed !== content) {
    fs.writeFileSync(file, transformed, 'utf-8');
    modified++;
  }
}

console.log(`Temizlenen dosya sayısı: ${modified}`);
