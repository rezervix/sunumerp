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

function finalizeContent(content, filePath) {
  let code = content;

  // 1. Production & KPI number text-white
  code = code.replace(/text-white tabular-nums/g, 'text-[var(--text)] tabular-nums');
  code = code.replace(/<strong className="text-white">/g, '<strong className="text-[var(--text)]">');
  code = code.replace(/<strong className="text-white font-medium">/g, '<strong className="text-[var(--text)] font-medium">');
  code = code.replace(/<span className="text-white font-medium">/g, '<span className="text-[var(--text)] font-medium">');
  code = code.replace(/<span className="text-white font-semibold">/g, '<span className="text-[var(--text)] font-semibold">');
  code = code.replace(/<span className="text-white text-xs">/g, '<span className="text-[var(--text)] text-xs">');
  code = code.replace(/<span className="text-white text-sm">/g, '<span className="text-[var(--text)] text-sm">');
  code = code.replace(/<span className="text-white">/g, '<span className="text-[var(--text)]">');
  code = code.replace(/color:\s*['"]text-white['"]/g, "color: 'text-[var(--text)]'");

  // 2. Headings and labels with text-white
  code = code.replace(/<h([1-6])[^>]*?text-white/g, (m) => m.replace('text-white', 'text-[var(--text)]'));
  code = code.replace(/<label[^>]*?text-white/g, (m) => m.replace('text-white', 'text-[var(--text)]'));
  code = code.replace(/<th[^>]*?text-white/g, (m) => m.replace('text-white', 'text-[var(--text)]'));
  code = code.replace(/<td[^>]*?text-white/g, (m) => m.replace('text-white', 'text-[var(--text)]'));
  code = code.replace(/<caption[^>]*?text-white/g, (m) => m.replace('text-white', 'text-[var(--text)]'));

  // 3. Inputs & textareas
  code = code.replace(/(<(?:input|textarea)[^>]*?)text-white/g, '$1text-[var(--text)]');

  // 4. Badges: rose / bad
  code = code.replace(/text-rose-400 hover:bg-rose-500\/10/g, 'text-[var(--bad)] hover:bg-[var(--bad-soft)]');
  code = code.replace(/text-rose-500 hover:bg-rose-500\/10/g, 'text-[var(--bad)] hover:bg-[var(--bad-soft)]');
  code = code.replace(/bg-rose-500\/15 text-rose-300 border-rose-500\/30/g, 'bg-[var(--bad-soft)] text-[var(--bad)] border-[var(--bad-line)]');
  code = code.replace(/bg-rose-500\/10 text-rose-400 border border-rose-500\/20/g, 'bg-[var(--bad-soft)] text-[var(--bad)] border border-[var(--bad-line)]');
  code = code.replace(/bg-rose-500\/10 text-rose-400/g, 'bg-[var(--bad-soft)] text-[var(--bad)]');
  code = code.replace(/bg-rose-500\/20 text-rose-300/g, 'bg-[var(--bad-soft)] text-[var(--bad)]');
  code = code.replace(/text-rose-300/g, 'text-[var(--bad)]');
  code = code.replace(/text-rose-400/g, 'text-[var(--bad)]');
  code = code.replace(/text-rose-500/g, 'text-[var(--bad)]');

  // 5. Badges: amber / warn
  code = code.replace(/bg-amber-500\/15 text-amber-300 border-amber-500\/30/g, 'bg-[var(--warn-soft)] text-[var(--warn)] border-[var(--warn-line)]');
  code = code.replace(/bg-amber-500\/10 text-amber-400 border border-amber-500\/20/g, 'bg-[var(--warn-soft)] text-[var(--warn)] border border-[var(--warn-line)]');
  code = code.replace(/bg-amber-500\/10 text-amber-400/g, 'bg-[var(--warn-soft)] text-[var(--warn)]');
  code = code.replace(/bg-amber-500\/20 text-amber-300/g, 'bg-[var(--warn-soft)] text-[var(--warn)]');
  code = code.replace(/text-amber-300/g, 'text-[var(--warn)]');
  code = code.replace(/text-amber-400/g, 'text-[var(--warn)]');

  // 6. Badges: emerald / ok
  code = code.replace(/bg-emerald-500\/10 text-emerald-400/g, 'bg-[var(--ok-soft)] text-[var(--ok)]');
  code = code.replace(/bg-emerald-500\/15 text-emerald-300/g, 'bg-[var(--ok-soft)] text-[var(--ok)]');
  code = code.replace(/bg-emerald-500\/20 text-emerald-400/g, 'bg-[var(--ok-soft)] text-[var(--ok)]');
  code = code.replace(/text-emerald-400/g, 'text-[var(--ok)]');
  code = code.replace(/text-emerald-500/g, 'text-[var(--ok)]');
  code = code.replace(/text-emerald-600/g, 'text-[var(--ok)]');

  // 7. Zinc remnants in partner-agi / components
  code = code.replace(/bg-zinc-700 text-\[var\(--text-2\)\] border-zinc-600/g, 'bg-[var(--muted-bg)] text-[var(--text-2)] border-[var(--line)]');
  code = code.replace(/bg-zinc-700/g, 'bg-[var(--muted-bg)]');
  code = code.replace(/border-zinc-600/g, 'border-[var(--line)]');
  code = code.replace(/border-zinc-500/g, 'border-[var(--line)]');
  code = code.replace(/bg-zinc-600/g, 'bg-[var(--muted-bg)]');
  code = code.replace(/bg-zinc-500/g, 'bg-[var(--muted-bg)]');

  // 8. Active tab backgrounds with white/0.08
  code = code.replace(/bg-white\/\[0\.08\] text-white/g, 'bg-[var(--brand-soft)] text-[var(--brand)] font-semibold');

  return code;
}

let modified = 0;
for (const file of allFiles) {
  const content = fs.readFileSync(file, 'utf-8');
  const transformed = finalizeContent(content, file);
  if (transformed !== content) {
    fs.writeFileSync(file, transformed, 'utf-8');
    modified++;
  }
}

console.log(`Son temizlik yapılan dosya sayısı: ${modified}`);
