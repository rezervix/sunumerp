import fs from 'fs';

let code = fs.readFileSync('app/dashboard/b2b/page.tsx', 'utf-8');

// Title & header
code = code.replaceAll('font-semibold text-white mb-1 tracking-tight', 'font-semibold text-[var(--text)] mb-1 tracking-tight');
code = code.replaceAll('text-4xl font-light text-white tracking-tight', 'text-4xl font-light text-[var(--text)] tracking-tight');
code = code.replaceAll('text-zinc-400', 'text-[var(--text-muted)]');
code = code.replaceAll('text-zinc-500', 'text-[var(--text-muted)]');
code = code.replaceAll('text-zinc-300', 'text-[var(--text-2)]');

// Tabs
code = code.replaceAll('activeTab === "products" ? "text-white" : "text-zinc-400 hover:text-white"', 'activeTab === "products" ? "text-[var(--brand)] font-semibold" : "text-[var(--text-muted)] hover:text-[var(--brand)]"');
code = code.replaceAll('activeTab === "requests" ? "text-white" : "text-zinc-400 hover:text-white"', 'activeTab === "requests" ? "text-[var(--brand)] font-semibold" : "text-[var(--text-muted)] hover:text-[var(--brand)]"');
code = code.replaceAll('activeTab === "catalog" ? "text-white" : "text-zinc-400 hover:text-white"', 'activeTab === "catalog" ? "text-[var(--brand)] font-semibold" : "text-[var(--text-muted)] hover:text-[var(--brand)]"');
code = code.replaceAll('activeTab === "services" ? "text-white" : "text-zinc-400 hover:text-white"', 'activeTab === "services" ? "text-[var(--brand)] font-semibold" : "text-[var(--text-muted)] hover:text-[var(--brand)]"');
code = code.replaceAll('bg-white/10 rounded-full border border-[--line]', 'bg-[var(--brand-soft)] rounded-full border border-[var(--brand-line)]');

// Table & card
code = code.replaceAll('bg-[--page] text-[var(--text-muted)] font-semibold border-b border-[--line]', 'bg-[var(--muted-bg)] text-[var(--text-muted)] font-semibold border-b border-[var(--line)]');
code = code.replaceAll('border-b border-white/[0.04]', 'border-b border-[var(--line-soft)]');
code = code.replaceAll('px-6 py-4 font-medium text-white', 'px-6 py-4 font-medium text-[var(--text)]');
code = code.replaceAll('text-lg font-semibold text-white group-hover:text-[--brand]', 'text-lg font-semibold text-[var(--text)] group-hover:text-[--brand]');
code = code.replaceAll('text-xl font-semibold text-white mb-2', 'text-xl font-semibold text-[var(--text)] mb-2');
code = code.replaceAll('text-lg font-semibold text-white', 'text-lg font-semibold text-[var(--text)]');

// Teal removal
code = code.replaceAll('bg-teal-500/10 border border-teal-500/20 text-teal-400', 'bg-[var(--brand-soft)] border border-[var(--brand-line)] text-[var(--brand)]');

// Select options
code = code.replaceAll('className="bg-[white] text-white"', 'className="bg-[var(--bg)] text-[var(--text)]"');

// Modal cancel buttons
code = code.replaceAll('hover:text-white hover:bg-[--muted-bg]', 'hover:text-[var(--brand)] hover:bg-[var(--brand-soft)]');
code = code.replaceAll('hover:bg-white/[0.08] hover:text-white', 'hover:bg-[var(--brand-soft)] hover:text-[var(--brand)]');

// Table hover
code = code.replaceAll('hover:bg-white transition-all', 'hover:bg-[var(--brand-soft)] transition-all');

// General text-white on buttons remain intact
code = code.replaceAll('text-[#1267E6]', 'text-[var(--brand)]');
code = code.replaceAll('bg-[#1267E6]', 'bg-[var(--brand)]');
code = code.replaceAll('bg-[white]', 'bg-[var(--bg)] shadow-sm');
code = code.replaceAll('border border-[--line]', 'border border-[var(--line)]');

fs.writeFileSync('app/dashboard/b2b/page.tsx', code, 'utf-8');
console.log('Successfully updated app/dashboard/b2b/page.tsx');
