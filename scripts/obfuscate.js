const fs = require('fs');
const path = require('path');
let JavaScriptObfuscator;

try {
  JavaScriptObfuscator = require('javascript-obfuscator');
} catch (e) {
  console.warn('[Obfuscator] javascript-obfuscator package not installed. Skipping JS Obfuscation.');
}

const OBFUSCATION_OPTIONS = {
  compact: true,
  controlFlowFlattening: false, // Performance optimization for production node runtime
  deadCodeInjection: false,
  debugProtection: false,
  disableConsoleOutput: false,
  identifierNamesGenerator: 'hexadecimal',
  log: false,
  numbersToExpressions: false,
  renameGlobals: false,
  selfDefending: false,
  simplify: true,
  splitStrings: true,
  stringArray: true,
  stringArrayCallsTransform: true,
  stringArrayEncoding: ['base64'],
  stringArrayThreshold: 0.8,
  unicodeEscapeSequence: false
};

function obfuscateFile(filePath) {
  if (!fs.existsSync(filePath)) {
    return false;
  }

  if (!JavaScriptObfuscator) {
    console.log(`[Obfuscator] Skipping obfuscation for ${filePath} (module not loaded).`);
    return false;
  }

  try {
    console.log(`[Obfuscator] Obfuscating ${filePath}...`);
    const code = fs.readFileSync(filePath, 'utf8');
    const obfuscatedResult = JavaScriptObfuscator.obfuscate(code, OBFUSCATION_OPTIONS);
    fs.writeFileSync(filePath, obfuscatedResult.getObfuscatedCode(), 'utf8');
    console.log(`[Obfuscator] Successfully obfuscated ${filePath}`);
    return true;
  } catch (err) {
    console.error(`[Obfuscator] Failed to obfuscate ${filePath}:`, err.message);
    return false;
  }
}

async function run() {
  console.log('=== Starting Postbuild Code Obfuscation Pipeline ===');

  const targets = [
    path.join(process.cwd(), '.next', 'standalone', 'server.js'),
    path.join(process.cwd(), 'dist', 'main.js'),
    path.join(process.cwd(), 'build', 'electron', 'main.js')
  ];

  targets.forEach(targetPath => {
    if (fs.existsSync(targetPath)) {
      obfuscateFile(targetPath);
    }
  });

  console.log('=== Postbuild Code Obfuscation Pipeline Completed ===');
}

run().catch(err => {
  console.error('Security pipeline failed:', err);
});
