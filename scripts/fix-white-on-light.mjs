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

function fixWhiteTextOnLight(content) {
  let code = content;

  // 1. Inputs & SelectTriggers with bg-white or border-[--line] and text-white
  code = code.replace(/bg-white\s+border-\[--line\]\s+text-white/g, 'bg-white border-[--line] text-[var(--text)]');
  code = code.replace(/bg-white\s+border-\[var\(--line\)\]\s+text-white/g, 'bg-white border-[var(--line)] text-[var(--text)]');
  code = code.replace(/border-\[--line\]\s+text-white/g, 'border-[--line] text-[var(--text)]');
  code = code.replace(/border-\[var\(--line\)\]\s+text-white/g, 'border-[var(--line)] text-[var(--text)]');
  code = code.replace(/SelectTrigger\s+className="([^"]*?)text-white([^"]*?)"/g, 'SelectTrigger className="$1text-[var(--text)]$2"');
  code = code.replace(/SelectContent\s+className="([^"]*?)text-white([^"]*?)"/g, 'SelectContent className="$1text-[var(--text)]$2"');
  code = code.replace(/SelectItem\s+className="([^"]*?)text-white([^"]*?)"/g, 'SelectItem className="$1text-[var(--text)]$2"');

  // 2. Spans with text-white block or text-white inline
  code = code.replace(/<span className="text-white block">/g, '<span className="text-[var(--text)] block">');
  code = code.replace(/<span className="text-white block font-medium">/g, '<span className="text-[var(--text)] block font-medium">');
  code = code.replace(/<span className="text-white">/g, '<span className="text-[var(--text)]">');
  code = code.replace(/<span className="([^"]*?)text-white([^"]*?)">/g, (match, before, after) => {
    // If it has a solid colored badge background (e.g. bg-blue-600, bg-red-600, bg-[--brand]), keep text-white
    if (before.includes('bg-') || after.includes('bg-')) {
      if (before.includes('bg-[var(--brand)]') || before.includes('bg-[--brand]') || before.includes('bg-[#1267E6]') ||
          before.includes('bg-red-') || before.includes('bg-rose-600') || before.includes('bg-blue-600') ||
          before.includes('bg-emerald-600') || before.includes('bg-green-600') || before.includes('bg-[--ok]')) {
        return match;
      }
    }
    return `<span className="${before}text-[var(--text)]${after}">`;
  });

  // 3. Divs with text-white that don't have solid colored button background
  code = code.replace(/<div className="([^"]*?)text-white([^"]*?)">/g, (match, before, after) => {
    const combined = before + ' ' + after;
    if (combined.includes('bg-[var(--brand)]') || combined.includes('bg-[--brand]') || combined.includes('bg-[#1267E6]') ||
        combined.includes('bg-blue-600') || combined.includes('bg-red-600') || combined.includes('bg-rose-600') ||
        combined.includes('bg-emerald-600') || combined.includes('bg-green-600') || combined.includes('bg-[--ok]') ||
        combined.includes('fixed inset-0') || combined.includes('bg-black/')) {
      return match;
    }
    return `<div className="${before}text-[var(--text)]${after}">`;
  });

  // 4. Paragraphs with text-white
  code = code.replace(/<p className="([^"]*?)text-white([^"]*?)">/g, (match, before, after) => {
    const combined = before + ' ' + after;
    if (combined.includes('bg-[var(--brand)]') || combined.includes('bg-black/')) return match;
    return `<p className="${before}text-[var(--text)]${after}">`;
  });

  // 5. Headings with text-white
  code = code.replace(/<h([1-6]) className="([^"]*?)text-white([^"]*?)">/g, '<h$1 className="$2text-[var(--text)]$3">');

  // 6. Table row hovers: hover:text-white -> hover:text-[var(--brand)]
  code = code.replace(/hover:text-white/g, 'hover:text-[var(--brand)]');

  // 7. Group hovers: group-hover:text-white -> group-hover:text-[var(--brand)]
  code = code.replace(/group-hover:text-white/g, 'group-hover:text-[var(--brand)]');

  return code;
}

let changed = 0;
for (const file of allFiles) {
  const content = fs.readFileSync(file, 'utf-8');
  const transformed = fixWhiteTextOnLight(content);
  if (transformed !== content) {
    fs.writeFileSync(file, transformed, 'utf-8');
    changed++;
  }
}

console.log(`Beyaz metin düzeltilen dosya sayısı: ${changed}`);
