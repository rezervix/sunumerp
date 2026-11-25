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

function replaceRoseAmberTokens(content) {
  let code = content;

  // Table cell text-white
  code = code.replace(/<TableCell className="([^"]*?)text-white([^"]*?)">/g, '<TableCell className="$1text-[var(--text)]$2">');

  // bg-brand-soft with text-white
  code = code.replace(/bg-\[var\(--brand-soft\)\]([^"]*?)text-white/g, 'bg-[var(--brand-soft)]$1text-[var(--brand)] font-medium');
  code = code.replace(/bg-\[--brand-soft\]([^"]*?)text-white/g, 'bg-[--brand-soft]$1text-[var(--brand)] font-medium');

  // Rose replacements
  code = code.replace(/bg-rose-500\/10/g, 'bg-[var(--bad-soft)]');
  code = code.replace(/bg-rose-500\/15/g, 'bg-[var(--bad-soft)]');
  code = code.replace(/bg-rose-500\/20/g, 'bg-[var(--bad-soft)]');
  code = code.replace(/border-rose-500\/20/g, 'border-[var(--bad-line)]');
  code = code.replace(/border-rose-500\/30/g, 'border-[var(--bad-line)]');
  code = code.replace(/border-rose-500\/40/g, 'border-[var(--bad-line)]');
  code = code.replace(/border-rose-500\/50/g, 'border-[var(--bad-line)]');
  code = code.replace(/hover:bg-rose-500\/10/g, 'hover:bg-[var(--bad-soft)]');
  code = code.replace(/hover:bg-rose-500\/20/g, 'hover:bg-[var(--bad-soft)]');

  // Amber replacements
  code = code.replace(/bg-amber-500\/10/g, 'bg-[var(--warn-soft)]');
  code = code.replace(/bg-amber-500\/15/g, 'bg-[var(--warn-soft)]');
  code = code.replace(/bg-amber-500\/20/g, 'bg-[var(--warn-soft)]');
  code = code.replace(/border-amber-500\/20/g, 'border-[var(--warn-line)]');
  code = code.replace(/border-amber-500\/30/g, 'border-[var(--warn-line)]');
  code = code.replace(/border-amber-500\/40/g, 'border-[var(--warn-line)]');
  code = code.replace(/border-amber-500\/50/g, 'border-[var(--warn-line)]');
  code = code.replace(/hover:bg-amber-500\/10/g, 'hover:bg-[var(--warn-soft)]');
  code = code.replace(/hover:bg-amber-500\/20/g, 'hover:bg-[var(--warn-soft)]');

  // Red replacements
  code = code.replace(/bg-red-500\/10/g, 'bg-[var(--bad-soft)]');
  code = code.replace(/bg-red-500\/15/g, 'bg-[var(--bad-soft)]');
  code = code.replace(/bg-red-500\/20/g, 'bg-[var(--bad-soft)]');
  code = code.replace(/border-red-500\/20/g, 'border-[var(--bad-line)]');
  code = code.replace(/border-red-500\/30/g, 'border-[var(--bad-line)]');
  code = code.replace(/hover:bg-red-500\/10/g, 'hover:bg-[var(--bad-soft)]');

  // Orange replacements
  code = code.replace(/bg-orange-500\/10/g, 'bg-[var(--warn-soft)]');
  code = code.replace(/bg-orange-500\/15/g, 'bg-[var(--warn-soft)]');
  code = code.replace(/bg-orange-500\/20/g, 'bg-[var(--warn-soft)]');
  code = code.replace(/border-orange-500\/20/g, 'border-[var(--warn-line)]');
  code = code.replace(/border-orange-500\/30/g, 'border-[var(--warn-line)]');
  code = code.replace(/border-orange-500\/40/g, 'border-[var(--warn-line)]');
  code = code.replace(/hover:bg-orange-500\/10/g, 'hover:bg-[var(--warn-soft)]');
  code = code.replace(/hover:bg-orange-500\/20/g, 'hover:bg-[var(--warn-soft)]');

  return code;
}

let changed = 0;
for (const file of allFiles) {
  const content = fs.readFileSync(file, 'utf-8');
  const transformed = replaceRoseAmberTokens(content);
  if (transformed !== content) {
    fs.writeFileSync(file, transformed, 'utf-8');
    changed++;
  }
}

console.log(`Durum tokenları güncellenen dosya sayısı: ${changed}`);
