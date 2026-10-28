const fs = require('fs')
const path = require('path')
const { encode } = require('fast-png')

// 1. Create Modern Vector SVG Logo
const svgLogo = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 120" width="120" height="120" fill="none">
  <defs>
    <linearGradient id="sunumGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#2563EB" />
      <stop offset="60%" stop-color="#3B82F6" />
      <stop offset="100%" stop-color="#4F46E5" />
    </linearGradient>
    <linearGradient id="plateTop" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#FFFFFF" stop-opacity="0.95" />
      <stop offset="100%" stop-color="#E0E7FF" stop-opacity="0.85" />
    </linearGradient>
    <linearGradient id="glowGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#60A5FA" stop-opacity="0.4" />
      <stop offset="100%" stop-color="#818CF8" stop-opacity="0" />
    </linearGradient>
    <filter id="erpShadow" x="-20%" y="-20%" width="140%" height="140%">
      <feDropShadow dx="0" dy="8" stdDeviation="8" flood-color="#1E1B4B" flood-opacity="0.3" />
    </filter>
  </defs>

  <!-- Background rounded card -->
  <rect width="120" height="120" rx="28" fill="url(#sunumGrad)" filter="url(#erpShadow)" />
  <rect x="2" y="2" width="116" height="116" rx="26" stroke="#FFFFFF" stroke-opacity="0.2" stroke-width="2" />
  
  <!-- Subtle diagonal shine -->
  <path d="M0 28 C 0 12 12 0 28 0 L 70 0 L 0 70 Z" fill="#FFFFFF" fill-opacity="0.08" />

  <!-- Isometric Modern ERP Stack / Presentation Layer Icon -->
  <g transform="translate(24, 25)">
    <!-- Bottom layer -->
    <path d="M8 44 L36 58 L64 44 L64 49 L36 63 L8 49 Z" fill="#FFFFFF" fill-opacity="0.45" />
    <!-- Middle layer -->
    <path d="M8 29 L36 43 L64 29 L64 34 L36 48 L8 34 Z" fill="#FFFFFF" fill-opacity="0.75" />
    <!-- Top layer plate -->
    <path d="M36 5 L64 19 L36 33 L8 19 Z" fill="url(#plateTop)" />
    <!-- Top facet left -->
    <path d="M8 19 L36 33 L36 36 L8 22 Z" fill="#DBEAFE" fill-opacity="0.9" />
    <!-- Top facet right -->
    <path d="M64 19 L36 33 L36 36 L64 22 Z" fill="#BFDBFE" fill-opacity="0.9" />
    <!-- Modern center spark / presentation node -->
    <circle cx="36" cy="19" r="4.5" fill="#2563EB" />
    <circle cx="36" cy="19" r="2.5" fill="#FFFFFF" />
  </g>
</svg>`

fs.writeFileSync(path.join(__dirname, '..', 'public', 'images', 'logo.svg'), svgLogo, 'utf8')
fs.writeFileSync(path.join(__dirname, '..', 'public', 'icon.svg'), svgLogo, 'utf8')
fs.writeFileSync(path.join(__dirname, '..', 'public', 'placeholder-logo.svg'), svgLogo, 'utf8')
console.log('✅ SVG logos written')

// 2. Generate crisp 256x256 PNG for public/images/logo.png using fast-png
const size = 256
const data = new Uint8Array(size * size * 4)

for (let y = 0; y < size; y++) {
  for (let x = 0; x < size; x++) {
    const idx = (y * size + x) * 4
    
    // Rounded corner check (radius ~ 56px)
    const r = 56
    let inside = true
    if (x < r && y < r) {
      if ((x - r) ** 2 + (y - r) ** 2 > r ** 2) inside = false
    } else if (x > size - r && y < r) {
      if ((x - (size - r)) ** 2 + (y - r) ** 2 > r ** 2) inside = false
    } else if (x < r && y > size - r) {
      if ((x - r) ** 2 + (y - (size - r)) ** 2 > r ** 2) inside = false
    } else if (x > size - r && y > size - r) {
      if ((x - (size - r)) ** 2 + (y - (size - r)) ** 2 > r ** 2) inside = false
    }

    if (!inside) {
      data[idx] = 0
      data[idx + 1] = 0
      data[idx + 2] = 0
      data[idx + 3] = 0
      continue
    }

    // Gradient background: #2563EB (37, 99, 235) to #4F46E5 (79, 70, 229)
    const t = (x + y) / (size * 2)
    const bgR = Math.round(37 + (79 - 37) * t)
    const bgG = Math.round(99 + (70 - 99) * t)
    const bgB = Math.round(235 + (229 - 235) * t)

    // Inner symbol rendering (isometric stack)
    const cx = size / 2
    const cy = size / 2

    // Simple geometric ERP icon bounds
    const isIconX = x >= cx - 70 && x <= cx + 70
    const isIconY = y >= cy - 60 && y <= cy + 60
    
    // Check if pixel falls inside layers
    let isWhite = false
    let alphaWhite = 0

    // Top diamond: center cx, top cy - 35, bottom cy + 15, width 120
    const dx = Math.abs(x - cx)
    const topDiamondY = cy - 10
    const distTopDiamond = dx / 60 + Math.abs(y - topDiamondY) / 30
    if (distTopDiamond <= 1) {
      isWhite = true
      alphaWhite = 0.95
    }

    // Middle layer slice: top cy + 15 to cy + 30
    const midY = cy + 20
    const distMid = dx / 60 + Math.abs(y - midY) / 30
    if (!isWhite && distMid <= 1.05 && distMid >= 0.75 && y > topDiamondY + 12) {
      isWhite = true
      alphaWhite = 0.75
    }

    // Bottom layer slice
    const botY = cy + 45
    const distBot = dx / 60 + Math.abs(y - botY) / 30
    if (!isWhite && distBot <= 1.05 && distBot >= 0.75 && y > midY + 12) {
      isWhite = true
      alphaWhite = 0.5
    }

    // Center node in top diamond
    const distCenterNode = Math.sqrt((x - cx) ** 2 + (y - topDiamondY) ** 2)
    if (distCenterNode < 9) {
      isWhite = false
    }

    if (isWhite) {
      data[idx] = Math.round(bgR * (1 - alphaWhite) + 255 * alphaWhite)
      data[idx + 1] = Math.round(bgG * (1 - alphaWhite) + 255 * alphaWhite)
      data[idx + 2] = Math.round(bgB * (1 - alphaWhite) + 255 * alphaWhite)
      data[idx + 3] = 255
    } else if (distCenterNode < 9) {
      data[idx] = 37
      data[idx + 1] = 99
      data[idx + 2] = 235
      data[idx + 3] = 255
    } else {
      data[idx] = bgR
      data[idx + 1] = bgG
      data[idx + 2] = bgB
      data[idx + 3] = 255
    }
  }
}

const pngBuffer = encode({ width: size, height: size, data })
fs.writeFileSync(path.join(__dirname, '..', 'public', 'images', 'logo.png'), Buffer.from(pngBuffer))
console.log('✅ PNG logo written to public/images/logo.png (' + pngBuffer.length + ' bytes)')
