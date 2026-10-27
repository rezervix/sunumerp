#!/usr/bin/env node
/**
 * Ubuntu Server Encoding Fix Script
 * Bu script sunucuda çalıştırılarak tüm UTF-8 encoding sorunlarını çözer.
 * Kullanim: node fix_server.js
 */

const fs = require('fs');
const path = require('path');

const SKIP_DIRS = new Set(['node_modules', '.next', '.git', 'public', 'dist', '.vscode']);
const SOURCE_EXTENSIONS = new Set(['.ts', '.tsx', '.js', '.jsx', '.mjs', '.cjs', '.json', '.css', '.prisma']);

let totalScanned = 0;
let totalFixed = 0;
const fixedFiles = [];

function walkDir(dir, callback) {
  let entries;
  try {
    entries = fs.readdirSync(dir);
  } catch (e) {
    return;
  }

  for (const entry of entries) {
    if (SKIP_DIRS.has(entry)) continue;
    const fullPath = path.join(dir, entry);
    let stat;
    try {
      stat = fs.statSync(fullPath);
    } catch (e) {
      continue;
    }

    if (stat.isDirectory()) {
      walkDir(fullPath, callback);
    } else if (SOURCE_EXTENSIONS.has(path.extname(entry).toLowerCase())) {
      callback(fullPath);
    }
  }
}

function fixFile(filePath) {
  totalScanned++;
  let buf;
  try {
    buf = fs.readFileSync(filePath);
  } catch (e) {
    console.error(`[ERROR] Cannot read: ${filePath} - ${e.message}`);
    return;
  }

  const rel = path.relative(process.cwd(), filePath);
  let changed = false;
  const reasons = [];

  // 1. Remove UTF-16 LE BOM (FF FE)
  if (buf.length >= 2 && buf[0] === 0xFF && buf[1] === 0xFE) {
    // Decode as UTF-16 LE, re-encode as UTF-8
    const str = buf.toString('utf16le');
    buf = Buffer.from(str, 'utf8');
    changed = true;
    reasons.push('UTF-16 LE -> UTF-8 converted');
  }
  // 2. Remove UTF-16 BE BOM (FE FF)
  else if (buf.length >= 2 && buf[0] === 0xFE && buf[1] === 0xFF) {
    const str = buf.swap16().toString('utf16le');
    buf = Buffer.from(str, 'utf8');
    changed = true;
    reasons.push('UTF-16 BE -> UTF-8 converted');
  }
  // 3. Remove UTF-8 BOM (EF BB BF)
  else if (buf.length >= 3 && buf[0] === 0xEF && buf[1] === 0xBB && buf[2] === 0xBF) {
    buf = buf.subarray(3);
    changed = true;
    reasons.push('BOM removed');
  }

  // 4. Check for invalid UTF-8 sequences by round-tripping
  const str = buf.toString('utf8');
  const roundTrip = Buffer.from(str, 'utf8');
  if (!changed && buf.length !== roundTrip.length) {
    // Has invalid bytes - replace them
    buf = roundTrip;
    changed = true;
    reasons.push('Invalid UTF-8 bytes replaced');
  }

  // 5. Convert Windows CRLF to LF (Linux standard)
  if (buf.includes(0x0D)) { // has CR
    const content = buf.toString('utf8');
    if (content.includes('\r\n')) {
      buf = Buffer.from(content.replace(/\r\n/g, '\n'), 'utf8');
      changed = true;
      reasons.push('CRLF -> LF');
    }
  }

  if (changed) {
    try {
      fs.writeFileSync(filePath, buf);
      totalFixed++;
      fixedFiles.push({ file: rel, reasons });
      console.log(`[FIXED] ${rel} (${reasons.join(', ')})`);
    } catch (e) {
      console.error(`[ERROR] Cannot write: ${rel} - ${e.message}`);
    }
  }
}

console.log('='.repeat(60));
console.log('  Ubuntu Server Encoding Fix Script');
console.log('='.repeat(60));
console.log(`Working directory: ${process.cwd()}`);
console.log('');

walkDir(process.cwd(), fixFile);

console.log('');
console.log('='.repeat(60));
console.log(`Scan complete! Scanned: ${totalScanned} files, Fixed: ${totalFixed} files`);
if (fixedFiles.length > 0) {
  console.log('\nFixed files:');
  fixedFiles.forEach(f => console.log(`  - ${f.file}: ${f.reasons.join(', ')}`));
}
console.log('');
console.log('Next step: Run "npm run build"');
console.log('='.repeat(60));
