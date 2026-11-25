import fs from 'fs';
import path from 'path';

// Target directories
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

console.log(`Toplam taranacak dosya sayısı: ${allFiles.length}`);

// Transform function for a single file
function transformContent(content, filePath) {
  let original = content;
  let code = content;

  // 1. Deprecated hex colors
  code = code.replaceAll('#080A09', 'var(--page)');
  code = code.replaceAll('#080a09', 'var(--page)');
  code = code.replaceAll('#0B0F13', 'var(--page)');
  code = code.replaceAll('#0b0f13', 'var(--page)');
  code = code.replaceAll('#111513', 'var(--bg)');
  code = code.replaceAll('#34D399', 'var(--brand)');
  code = code.replaceAll('#34d399', 'var(--brand)');
  code = code.replaceAll('#10B981', 'var(--brand)');
  code = code.replaceAll('#10b981', 'var(--brand)');
  code = code.replaceAll('#050505', 'var(--page)');
  code = code.replaceAll('#0f172a', 'var(--page)');
  code = code.replaceAll('#0F172A', 'var(--page)');

  // 2. Glow and emerald shadows
  code = code.replaceAll('glow-emerald', 'shadow-sm');
  code = code.replaceAll('shadow-emerald-500/20', 'shadow-sm');
  code = code.replaceAll('shadow-emerald-500/10', 'shadow-sm');

  // 3. Dark card/container backgrounds
  code = code.replaceAll('bg-zinc-950/80', 'bg-[var(--bg)]');
  code = code.replaceAll('bg-zinc-950/90', 'bg-[var(--bg)]');
  code = code.replaceAll('bg-zinc-950/50', 'bg-[var(--muted-bg)]');
  code = code.replaceAll('bg-zinc-950/40', 'bg-[var(--muted-bg)]');
  code = code.replaceAll('bg-zinc-950/30', 'bg-[var(--muted-bg)]');
  code = code.replaceAll('bg-zinc-950', 'bg-[var(--bg)]');

  code = code.replaceAll('bg-zinc-900/90', 'bg-[var(--bg)]');
  code = code.replaceAll('bg-zinc-900/80', 'bg-[var(--bg)]');
  code = code.replaceAll('bg-zinc-900/60', 'bg-[var(--bg)]');
  code = code.replaceAll('bg-zinc-900/50', 'bg-[var(--muted-bg)]');
  code = code.replaceAll('bg-zinc-900/40', 'bg-[var(--muted-bg)]');
  code = code.replaceAll('bg-zinc-900/30', 'bg-[var(--muted-bg)]');
  code = code.replaceAll('bg-zinc-900/20', 'bg-[var(--muted-bg)]');
  code = code.replaceAll('bg-zinc-900', 'bg-[var(--bg)]');

  code = code.replaceAll('bg-slate-950/80', 'bg-[var(--bg)]');
  code = code.replaceAll('bg-slate-950/50', 'bg-[var(--muted-bg)]');
  code = code.replaceAll('bg-slate-950', 'bg-[var(--bg)]');

  code = code.replaceAll('bg-slate-900/90', 'bg-[var(--bg)]');
  code = code.replaceAll('bg-slate-900/80', 'bg-[var(--bg)]');
  code = code.replaceAll('bg-slate-900/60', 'bg-[var(--bg)]');
  code = code.replaceAll('bg-slate-900/50', 'bg-[var(--muted-bg)]');
  code = code.replaceAll('bg-slate-900/40', 'bg-[var(--muted-bg)]');
  code = code.replaceAll('bg-slate-900/30', 'bg-[var(--muted-bg)]');
  code = code.replaceAll('bg-slate-900/20', 'bg-[var(--muted-bg)]');
  code = code.replaceAll('bg-slate-900', 'bg-[var(--bg)]');

  code = code.replaceAll('bg-zinc-800/80', 'bg-[var(--muted-bg)]');
  code = code.replaceAll('bg-zinc-800/60', 'bg-[var(--muted-bg)]');
  code = code.replaceAll('bg-zinc-800/50', 'bg-[var(--muted-bg)]');
  code = code.replaceAll('bg-zinc-800/40', 'bg-[var(--muted-bg)]');
  code = code.replaceAll('bg-zinc-800', 'bg-[var(--muted-bg)]');

  code = code.replaceAll('bg-slate-800/80', 'bg-[var(--muted-bg)]');
  code = code.replaceAll('bg-slate-800/60', 'bg-[var(--muted-bg)]');
  code = code.replaceAll('bg-slate-800/50', 'bg-[var(--muted-bg)]');
  code = code.replaceAll('bg-slate-800/40', 'bg-[var(--muted-bg)]');
  code = code.replaceAll('bg-slate-800', 'bg-[var(--muted-bg)]');

  code = code.replaceAll('bg-gray-900', 'bg-[var(--bg)]');
  code = code.replaceAll('bg-gray-800', 'bg-[var(--muted-bg)]');
  code = code.replaceAll('bg-neutral-900', 'bg-[var(--bg)]');
  code = code.replaceAll('bg-neutral-800', 'bg-[var(--muted-bg)]');

  code = code.replaceAll('bg-white/5', 'bg-[var(--muted-bg)]');
  code = code.replaceAll('bg-white/10', 'bg-[var(--muted-bg)]');
  code = code.replaceAll('bg-black/40', 'bg-[var(--muted-bg)]');
  code = code.replaceAll('bg-black/50', 'bg-[var(--muted-bg)]');

  // 4. Dark/white borders
  code = code.replaceAll('border-zinc-800/80', 'border-[var(--line)]');
  code = code.replaceAll('border-zinc-800/60', 'border-[var(--line-soft)]');
  code = code.replaceAll('border-zinc-800/50', 'border-[var(--line-soft)]');
  code = code.replaceAll('border-zinc-800', 'border-[var(--line)]');
  code = code.replaceAll('border-zinc-700/80', 'border-[var(--line)]');
  code = code.replaceAll('border-zinc-700/60', 'border-[var(--line-soft)]');
  code = code.replaceAll('border-zinc-700/50', 'border-[var(--line-soft)]');
  code = code.replaceAll('border-zinc-700', 'border-[var(--line)]');

  code = code.replaceAll('border-slate-800/80', 'border-[var(--line)]');
  code = code.replaceAll('border-slate-800/60', 'border-[var(--line-soft)]');
  code = code.replaceAll('border-slate-800/50', 'border-[var(--line-soft)]');
  code = code.replaceAll('border-slate-800', 'border-[var(--line)]');
  code = code.replaceAll('border-slate-700/80', 'border-[var(--line)]');
  code = code.replaceAll('border-slate-700/60', 'border-[var(--line-soft)]');
  code = code.replaceAll('border-slate-700/50', 'border-[var(--line-soft)]');
  code = code.replaceAll('border-slate-700', 'border-[var(--line)]');

  code = code.replaceAll('border-white/20', 'border-[var(--line)]');
  code = code.replaceAll('border-white/15', 'border-[var(--line)]');
  code = code.replaceAll('border-white/10', 'border-[var(--line)]');
  code = code.replaceAll('border-white/5', 'border-[var(--line-soft)]');
  code = code.replaceAll('border-white/[0.04]', 'border-[var(--line-soft)]');
  code = code.replaceAll('border-white/[0.05]', 'border-[var(--line-soft)]');
  code = code.replaceAll('border-white/[0.06]', 'border-[var(--line-soft)]');
  code = code.replaceAll('border-white/[0.08]', 'border-[var(--line-soft)]');
  code = code.replaceAll('border-white/[0.1]', 'border-[var(--line)]');
  code = code.replaceAll('border-white/[0.15]', 'border-[var(--line)]');
  code = code.replaceAll('border-white/[0.2]', 'border-[var(--line)]');

  // 5. Muted / Secondary text colors
  code = code.replaceAll('text-zinc-500', 'text-[var(--text-muted)]');
  code = code.replaceAll('text-zinc-400', 'text-[var(--text-muted)]');
  code = code.replaceAll('text-zinc-300', 'text-[var(--text-2)]');
  code = code.replaceAll('text-zinc-200', 'text-[var(--text-2)]');
  code = code.replaceAll('text-zinc-100', 'text-[var(--text)]');

  code = code.replaceAll('text-slate-500', 'text-[var(--text-muted)]');
  code = code.replaceAll('text-slate-400', 'text-[var(--text-muted)]');
  code = code.replaceAll('text-slate-300', 'text-[var(--text-2)]');
  code = code.replaceAll('text-slate-200', 'text-[var(--text-2)]');
  code = code.replaceAll('text-slate-100', 'text-[var(--text)]');

  code = code.replaceAll('text-gray-500', 'text-[var(--text-muted)]');
  code = code.replaceAll('text-gray-400', 'text-[var(--text-muted)]');
  code = code.replaceAll('text-gray-300', 'text-[var(--text-2)]');
  code = code.replaceAll('text-gray-200', 'text-[var(--text-2)]');
  code = code.replaceAll('text-gray-100', 'text-[var(--text)]');

  // 6. Forbidden decorative colors: Purple, Teal, Cyan, Pink, Fuchsia, Violet
  code = code.replaceAll('text-purple-400', 'text-[var(--brand)]');
  code = code.replaceAll('text-purple-500', 'text-[var(--brand)]');
  code = code.replaceAll('text-purple-600', 'text-[var(--brand)]');
  code = code.replaceAll('bg-purple-500/10', 'bg-[var(--brand-soft)]');
  code = code.replaceAll('bg-purple-500/20', 'bg-[var(--brand-soft)]');
  code = code.replaceAll('border-purple-500/20', 'border-[var(--brand-line)]');
  code = code.replaceAll('border-purple-500/30', 'border-[var(--brand-line)]');

  code = code.replaceAll('text-teal-400', 'text-[var(--brand)]');
  code = code.replaceAll('text-teal-500', 'text-[var(--brand)]');
  code = code.replaceAll('text-teal-600', 'text-[var(--brand)]');
  code = code.replaceAll('bg-teal-500/10', 'bg-[var(--brand-soft)]');
  code = code.replaceAll('bg-teal-500/20', 'bg-[var(--brand-soft)]');
  code = code.replaceAll('border-teal-500/20', 'border-[var(--brand-line)]');
  code = code.replaceAll('border-teal-500/30', 'border-[var(--brand-line)]');

  code = code.replaceAll('text-cyan-400', 'text-[var(--brand)]');
  code = code.replaceAll('text-cyan-500', 'text-[var(--brand)]');
  code = code.replaceAll('text-cyan-600', 'text-[var(--brand)]');
  code = code.replaceAll('bg-cyan-500/10', 'bg-[var(--brand-soft)]');
  code = code.replaceAll('bg-cyan-500/20', 'bg-[var(--brand-soft)]');
  code = code.replaceAll('border-cyan-500/20', 'border-[var(--brand-line)]');

  code = code.replaceAll('text-indigo-400', 'text-[var(--brand)]');
  code = code.replaceAll('text-indigo-500', 'text-[var(--brand)]');
  code = code.replaceAll('text-indigo-600', 'text-[var(--brand)]');
  code = code.replaceAll('bg-indigo-500/10', 'bg-[var(--brand-soft)]');
  code = code.replaceAll('bg-indigo-500/20', 'bg-[var(--brand-soft)]');
  code = code.replaceAll('border-indigo-500/20', 'border-[var(--brand-line)]');

  code = code.replaceAll('text-violet-400', 'text-[var(--brand)]');
  code = code.replaceAll('text-violet-500', 'text-[var(--brand)]');
  code = code.replaceAll('text-pink-400', 'text-[var(--brand)]');
  code = code.replaceAll('text-pink-500', 'text-[var(--brand)]');
  code = code.replaceAll('text-fuchsia-400', 'text-[var(--brand)]');
  code = code.replaceAll('text-fuchsia-500', 'text-[var(--brand)]');

  // 7. Emerald classes mapping
  // Status check: if preceded or followed by status terms, make --ok, otherwise --brand
  code = code.replaceAll('text-emerald-400', 'text-[var(--ok)]');
  code = code.replaceAll('text-emerald-500', 'text-[var(--ok)]');
  code = code.replaceAll('text-emerald-600', 'text-[var(--ok)]');
  code = code.replaceAll('bg-emerald-500/10', 'bg-[var(--ok-soft)]');
  code = code.replaceAll('bg-emerald-500/20', 'bg-[var(--ok-soft)]');
  code = code.replaceAll('border-emerald-500/20', 'border-[var(--ok-soft)]');
  code = code.replaceAll('border-emerald-500/30', 'border-[var(--ok-soft)]');
  code = code.replaceAll('border-emerald-500', 'border-[var(--ok)]');

  // 8. Hover states
  code = code.replaceAll('hover:bg-zinc-800', 'hover:bg-[var(--brand-soft)]');
  code = code.replaceAll('hover:bg-zinc-900', 'hover:bg-[var(--brand-soft)]');
  code = code.replaceAll('hover:bg-slate-800', 'hover:bg-[var(--brand-soft)]');
  code = code.replaceAll('hover:bg-slate-900', 'hover:bg-[var(--brand-soft)]');
  code = code.replaceAll('hover:bg-white/5', 'hover:bg-[var(--brand-soft)]');
  code = code.replaceAll('hover:bg-white/10', 'hover:bg-[var(--brand-soft)]');
  code = code.replaceAll('hover:text-white', 'hover:text-[var(--brand)]');

  // 9. Intelligent text-white replacement for headings and labels
  // Replace text-white when used with font-bold / font-semibold / text-2xl / etc. in headings
  code = code.replace(/font-semibold text-white/g, 'font-semibold text-[var(--text)]');
  code = code.replace(/font-bold text-white/g, 'font-bold text-[var(--text)]');
  code = code.replace(/font-medium text-white/g, 'font-medium text-[var(--text)]');
  code = code.replace(/text-white font-semibold/g, 'text-[var(--text)] font-semibold');
  code = code.replace(/text-white font-bold/g, 'text-[var(--text)] font-bold');
  code = code.replace(/text-white font-medium/g, 'text-[var(--text)] font-medium');
  code = code.replace(/text-3xl font-light text-white/g, 'text-3xl font-light text-[var(--text)]');
  code = code.replace(/text-4xl font-light text-white/g, 'text-4xl font-light text-[var(--text)]');
  code = code.replace(/text-2xl font-semibold text-white/g, 'text-2xl font-semibold text-[var(--text)]');
  code = code.replace(/text-xl font-semibold text-white/g, 'text-xl font-semibold text-[var(--text)]');
  code = code.replace(/text-lg font-semibold text-white/g, 'text-lg font-semibold text-[var(--text)]');
  code = code.replace(/text-sm font-semibold text-white/g, 'text-sm font-semibold text-[var(--text)]');
  code = code.replace(/text-xs font-semibold text-white/g, 'text-xs font-semibold text-[var(--text)]');
  code = code.replace(/text-2xl font-bold text-white/g, 'text-2xl font-bold text-[var(--text)]');
  code = code.replace(/text-xl font-bold text-white/g, 'text-xl font-bold text-[var(--text)]');
  code = code.replace(/text-lg font-bold text-white/g, 'text-lg font-bold text-[var(--text)]');

  return code;
}

let modifiedCount = 0;
for (const file of allFiles) {
  const content = fs.readFileSync(file, 'utf-8');
  const transformed = transformContent(content, file);
  if (transformed !== content) {
    fs.writeFileSync(file, transformed, 'utf-8');
    modifiedCount++;
  }
}

console.log(`Dönüştürülen toplam dosya sayısı: ${modifiedCount}`);
