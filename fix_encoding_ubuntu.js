const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

function walkDir(dir, callback) {
  fs.readdirSync(dir).forEach(f => {
    const dirPath = path.join(dir, f);
    const isDirectory = fs.statSync(dirPath).isDirectory();
    if (isDirectory) {
      if (f !== 'node_modules' && f !== '.next' && f !== '.git') {
        walkDir(dirPath, callback);
      }
    } else {
      if (f.endsWith('.ts') || f.endsWith('.tsx') || f.endsWith('.js') || f.endsWith('.jsx')) {
        callback(dirPath);
      }
    }
  });
}

console.log("Scanning files for UTF-8 issues...");

let fixedCount = 0;

walkDir(process.cwd(), (filePath) => {
  try {
    let buf = fs.readFileSync(filePath);
    let changed = false;

    // 1. Remove UTF-8 BOM if present
    if (buf.length >= 3 && buf[0] === 0xEF && buf[1] === 0xBB && buf[2] === 0xBF) {
      buf = buf.subarray(3);
      changed = true;
      console.log(`[BOM Removed] ${filePath}`);
    }

    // 2. Check for invalid UTF-8 byte sequences
    let str = buf.toString('utf8');
    let testBuf = Buffer.from(str, 'utf8');
    
    if (buf.length !== testBuf.length || buf.compare(testBuf) !== 0) {
      // The file contains invalid UTF-8 bytes.
      // We will just write back the testBuf, which replaces invalid bytes with the UTF-8 replacement character
      buf = testBuf;
      changed = true;
      console.log(`[Invalid UTF-8 Fixed] ${filePath}`);
    }

    if (changed) {
      fs.writeFileSync(filePath, buf);
      fixedCount++;
    }
  } catch (err) {
    console.error(`Error reading ${filePath}:`, err.message);
  }
});

console.log(`\nScan complete! Fixed ${fixedCount} files.`);
console.log("You can now run 'npm run build' again.");
