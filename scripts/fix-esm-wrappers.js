const fs = require('fs');
const path = require('path');

function makeEsmWrapper(cjsPath, mjsPath) {
  const absCjs = path.resolve(cjsPath);
  const absMjs = path.resolve(mjsPath);
  if (!fs.existsSync(absCjs)) return;
  const cjs = require(absCjs);
  const keys = Object.keys(cjs).filter(k => k !== 'default' && !k.startsWith('__'));
  const lines = [
    `import cjs from "./${path.basename(cjsPath)}";`,
    ...keys.map(k => `export const ${k} = cjs.${k};`),
    `export default cjs;`
  ];
  fs.writeFileSync(absMjs, lines.join('\n'), 'utf8');
  console.log(`Created ESM wrapper for ${path.basename(mjsPath)} with keys: ${keys.join(', ')}`);
}

makeEsmWrapper('./node_modules/tailwind-merge/dist/bundle-cjs.js', './node_modules/tailwind-merge/dist/bundle-mjs.mjs');
makeEsmWrapper('./node_modules/sonner/dist/index.js', './node_modules/sonner/dist/index.mjs');
makeEsmWrapper('./node_modules/cmdk/dist/index.js', './node_modules/cmdk/dist/index.mjs');
makeEsmWrapper('./node_modules/input-otp/dist/index.js', './node_modules/input-otp/dist/index.mjs');

