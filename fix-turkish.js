const fs = require('fs');
const path = require('path');

const dir = path.join(__dirname, 'app', 'dashboard');

// Turkish to ASCII mapping including garbled ones
const map = {
  'ç': 'c', 'Ç': 'C',
  'ş': 's', 'Ş': 'S',
  'ğ': 'g', 'Ğ': 'G',
  'ı': 'i', 'İ': 'I',
  'ö': 'o', 'Ö': 'O',
  'ü': 'u', 'Ü': 'U',
  'ý': 'i', 'Ý': 'I', // garbled ı/İ
  'þ': 's', 'Þ': 'S', // garbled ş/Ş
  'ð': 'g', 'Ð': 'G'  // garbled ğ/Ğ
};

// Also sometimes garbled maps:
// ý -> ı, þ -> ş, ð -> ğ

function replaceTurkish(text) {
  return text.replace(/[çÇşŞğĞıİöÖüÜýÝþÞðÐ]/g, match => map[match] || match);
}

function processDir(directory) {
  const files = fs.readdirSync(directory);
  for (const file of files) {
    const fullPath = path.join(directory, file);
    const stat = fs.statSync(fullPath);
    if (stat.isDirectory()) {
      processDir(fullPath);
    } else if (fullPath.endsWith('.tsx') || fullPath.endsWith('.ts')) {
      const content = fs.readFileSync(fullPath, 'utf8');
      const newContent = replaceTurkish(content);
      if (content !== newContent) {
        fs.writeFileSync(fullPath, newContent, 'utf8');
        console.log(`Updated: ${fullPath.replace(__dirname, '')}`);
      }
    }
  }
}

processDir(dir);
console.log('Done!');
