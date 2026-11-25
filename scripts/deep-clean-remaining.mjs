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

// Dark hex list to eliminate (Obsidian remnants)
const DARK_HEXES = [
  '0A0D0B', '0C100E', '0D100E', '0B100E', '0B0F0D', '0B0E0C',
  '0B0E0D', '070B09', '121614', '0D100F', '101412', '06120D',
  '07090C', '16252C', '1A1416', '120C18', '070B08', '173024',
  '141812', '141416', '121214', '1C1C1F', '1A1A1D', '18181B',
  '050506', '111113', '1E293B', '090D0B', '1C1613', '171310',
  '061811', '191C1E', '1F2428', '1A1A1A', '1F1F1F', '1E1E1E',
  '111111', '080A09', '0B0F13', '111513', '050505'
];

function transformContent(content, filePath) {
  let code = content;

  // 1. Dark hexes in bg-[#...] or border-[#...]
  for (const h of DARK_HEXES) {
    // bg-[#HEX]
    const bgRegexLower = new RegExp(`bg-\\[#${h.toLowerCase()}\\](?:\\/([0-9]+))?`, 'g');
    const bgRegexUpper = new RegExp(`bg-\\[#${h.toUpperCase()}\\](?:\\/([0-9]+))?`, 'g');
    code = code.replace(bgRegexLower, (match, opacity) => {
      if (opacity && parseInt(opacity) < 50) return 'bg-[var(--muted-bg)]';
      return 'bg-[var(--bg)]';
    });
    code = code.replace(bgRegexUpper, (match, opacity) => {
      if (opacity && parseInt(opacity) < 50) return 'bg-[var(--muted-bg)]';
      return 'bg-[var(--bg)]';
    });

    // border-[#HEX]
    const borderRegexLower = new RegExp(`border-\\[#${h.toLowerCase()}\\](?:\\/([0-9]+))?`, 'g');
    const borderRegexUpper = new RegExp(`border-\\[#${h.toUpperCase()}\\](?:\\/([0-9]+))?`, 'g');
    code = code.replace(borderRegexLower, 'border-[var(--line)]');
    code = code.replace(borderRegexUpper, 'border-[var(--line)]');

    // standalone #HEX
    const hexRegex = new RegExp(`#${h}`, 'gi');
    if (!filePath.includes('design-tokens.ts')) {
      code = code.replace(hexRegex, '#0B1B33');
    }
  }

  // 2. border-white/[...]
  code = code.replace(/border-white\/\[0\.[0-9]+\]/g, 'border-[var(--line-soft)]');
  code = code.replace(/border-white\/[0-9]+/g, 'border-[var(--line-soft)]');
  code = code.replace(/bg-white\/[0-9]+/g, (m) => {
    // If it was bg-white/5, bg-white/10 -> bg-[var(--muted-bg)]
    if (m === 'bg-white/5' || m === 'bg-white/10' || m === 'bg-white/15') return 'bg-[var(--muted-bg)]';
    if (m === 'bg-white/80' || m === 'bg-white/90' || m === 'bg-white/70' || m === 'bg-white/95') return m;
    return 'bg-[var(--muted-bg)]';
  });

  // 3. Inputs, selects, textareas with text-white
  // e.g. <input ... className="... text-white ..." />
  // Replace text-white in input/select/textarea tags with text-[var(--text)]
  code = code.replace(/(<(?:input|select|textarea)[^>]*?className=(?:["'][^"']*?|{[^}]*?))text-white/g, '$1text-[var(--text)]');

  // 4. In forms/modals: input background should be white/muted-bg, text should be text-[var(--text)]
  // e.g. bg-[var(--bg)] border border-[var(--line)] ... text-white -> text-[var(--text)]
  code = code.replace(/(border border-\[var\(--line\)\][^"]*?)text-white/g, '$1text-[var(--text)]');
  code = code.replace(/(border border-\[--line\][^"]*?)text-white/g, '$1text-[var(--text)]');

  // 5. General table headers and cells
  code = code.replace(/(<t[hd][^>]*?className=(?:["'][^"']*?|{[^}]*?))text-white/g, '$1text-[var(--text)]');

  // 6. Fix option elements
  code = code.replace(/<option[^>]*?text-white[^>]*?>/g, (m) => m.replace(/text-white/g, 'text-[var(--text)]').replace(/bg-[^"']+/g, 'bg-white text-[var(--text)]'));

  // 7. Fix remaining purple, violet, teal, cyan, fuchsia
  code = code.replace(/\b(text|bg|border)-(purple|violet|fuchsia|pink|teal|cyan)-([0-9]{2,3})\b/g, (match, type, color, num) => {
    if (type === 'text') return 'text-[var(--brand)]';
    if (type === 'bg') return 'bg-[var(--brand-soft)]';
    if (type === 'border') return 'border-[var(--brand-line)]';
    return match;
  });

  return code;
}

let modified = 0;
for (const file of allFiles) {
  const content = fs.readFileSync(file, 'utf-8');
  const transformed = transformContent(content, file);
  if (transformed !== content) {
    fs.writeFileSync(file, transformed, 'utf-8');
    modified++;
  }
}

console.log(`Tamamlanan derin dönüştürme dosya sayısı: ${modified}`);
