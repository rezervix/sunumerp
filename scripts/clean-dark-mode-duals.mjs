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

function cleanDark(content) {
  let code = content;

  // 1. Common dual-mode pairs to single clean tokens
  code = code.replace(/text-gray-900\s+dark:text-white/g, 'text-[var(--text)]');
  code = code.replace(/text-gray-900\s+dark:text-[var\(--text\)]/g, 'text-[var(--text)]');
  code = code.replace(/text-slate-900\s+dark:text-white/g, 'text-[var(--text)]');
  code = code.replace(/text-slate-800\s+dark:text-white/g, 'text-[var(--text)]');
  code = code.replace(/text-gray-800\s+dark:text-white/g, 'text-[var(--text)]');

  code = code.replace(/text-gray-700\s+dark:text-\[var\(--text-2\)\]/g, 'text-[var(--text-2)]');
  code = code.replace(/text-gray-700\s+dark:text-gray-300/g, 'text-[var(--text-2)]');
  code = code.replace(/text-slate-700\s+dark:text-slate-300/g, 'text-[var(--text-2)]');

  code = code.replace(/text-gray-600\s+dark:text-\[var\(--text-muted\)\]/g, 'text-[var(--text-muted)]');
  code = code.replace(/text-gray-500\s+dark:text-\[var\(--text-muted\)\]/g, 'text-[var(--text-muted)]');
  code = code.replace(/text-gray-600\s+dark:text-gray-400/g, 'text-[var(--text-muted)]');
  code = code.replace(/text-slate-600\s+dark:text-slate-400/g, 'text-[var(--text-muted)]');

  code = code.replace(/border-gray-200\s+dark:border-gray-800/g, 'border-[var(--line)]');
  code = code.replace(/border-gray-200\s+dark:border-gray-700/g, 'border-[var(--line)]');
  code = code.replace(/border-gray-100\s+dark:border-gray-800/g, 'border-[var(--line-soft)]');
  code = code.replace(/border-slate-200\s+dark:border-slate-800/g, 'border-[var(--line)]');
  code = code.replace(/border-slate-100\s+dark:border-slate-800/g, 'border-[var(--line-soft)]');

  code = code.replace(/bg-white\s+dark:bg-\[var\(--bg\)\]/g, 'bg-white');
  code = code.replace(/bg-white\s+dark:bg-slate-900/g, 'bg-white');
  code = code.replace(/bg-white\s+dark:bg-zinc-900/g, 'bg-white');
  code = code.replace(/bg-gray-50\s+dark:bg-\[var\(--muted-bg\)\]/g, 'bg-[var(--muted-bg)]');
  code = code.replace(/bg-gray-50\s+dark:bg-slate-800/g, 'bg-[var(--muted-bg)]');
  code = code.replace(/bg-gray-100\s+dark:bg-slate-800/g, 'bg-[var(--muted-bg)]');

  // 2. Remove any remaining dark: classes (e.g. dark:text-white, dark:bg-black/20, dark:border-gray-800, dark:hover:...)
  // We match dark:[^"'\s`{}]+
  code = code.replace(/\bdark:[a-zA-Z0-9_\-\/\[\]#.]+\b/g, '');

  // 3. Clean up any double spaces introduced in className
  code = code.replace(/className="([^"]*?)"/g, (match, classList) => {
    const cleaned = classList.replace(/\s+/g, ' ').trim();
    return `className="${cleaned}"`;
  });
  code = code.replace(/className={`([^`]*?)`}/g, (match, classList) => {
    const cleaned = classList.replace(/\s+/g, ' ').trim();
    return `className={\`${cleaned}\`}`;
  });

  return code;
}

let changed = 0;
for (const file of allFiles) {
  const content = fs.readFileSync(file, 'utf-8');
  const transformed = cleanDark(content);
  if (transformed !== content) {
    fs.writeFileSync(file, transformed, 'utf-8');
    changed++;
  }
}

console.log(`dark: sınıfları temizlenen dosya sayısı: ${changed}`);
