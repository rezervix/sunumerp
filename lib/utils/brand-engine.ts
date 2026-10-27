/**
 * Akıllı Logo ve Tema Motoru Yardımcı Kütüphanesi
 * - Color Quantization & Dominant Color Extraction
 * - WCAG 2.1 Contrast Ratio & Relative Luminance Calculation
 * - Automated Logo Background Removal (Alpha Keying & Edge Processing)
 */

export interface ExtractedColor {
  hex: string
  count: number
  hsl: { h: number; s: number; l: number }
  contrastWithWhite: number
  contrastWithDark: number
  recommendedForeground: "#FFFFFF" | "#0F172A"
}

export interface DarkThemePalette {
  background: string
  card: string
  popover: string
  sidebar: string
  header: string
  primary: string
  primaryForeground: "#FFFFFF" | "#0F172A"
  accent: string
  accentForeground: "#FFFFFF" | "#0F172A"
  foreground: string
  mutedForeground: string
  border: string
}

export interface BrandKitAnalysisResult {
  primary: string
  primaryForeground: "#FFFFFF" | "#0F172A"
  accent: string
  accentForeground: "#FFFFFF" | "#0F172A"
  palette: ExtractedColor[]
  darkPalette: DarkThemePalette
  bgRemovedDataUrl?: string
}

/**
 * Calculates relative luminance of an RGB color according to WCAG 2.1 guidelines
 */
export function getLuminance(r: number, g: number, b: number): number {
  const [rs, gs, bs] = [r, g, b].map(v => {
    const s = v / 255
    return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4)
  })
  return 0.2126 * rs + 0.7152 * gs + 0.0722 * bs
}

/**
 * Calculates WCAG 2.1 contrast ratio between two hex colors
 */
export function getContrastRatio(hex1: string, hex2: string): number {
  const rgb1 = hexToRgb(hex1) || { r: 0, g: 0, b: 0 }
  const rgb2 = hexToRgb(hex2) || { r: 255, g: 255, b: 255 }

  const lum1 = getLuminance(rgb1.r, rgb1.g, rgb1.b)
  const lum2 = getLuminance(rgb2.r, rgb2.g, rgb2.b)

  const brightest = Math.max(lum1, lum2)
  const darkest = Math.min(lum1, lum2)

  return (brightest + 0.05) / (darkest + 0.05)
}

/**
 * Helper to convert HEX to RGB
 */
export function hexToRgb(hex: string): { r: number; g: number; b: number } | null {
  const cleaned = hex.replace("#", "")
  if (cleaned.length === 3) {
    const r = parseInt(cleaned[0] + cleaned[0], 16)
    const g = parseInt(cleaned[1] + cleaned[1], 16)
    const b = parseInt(cleaned[2] + cleaned[2], 16)
    return { r, g, b }
  } else if (cleaned.length === 6) {
    const r = parseInt(cleaned.substring(0, 2), 16)
    const g = parseInt(cleaned.substring(2, 4), 16)
    const b = parseInt(cleaned.substring(4, 6), 16)
    return { r, g, b }
  }
  return null
}

/**
 * Helper to convert RGB to HEX
 */
export function rgbToHex(r: number, g: number, b: number): string {
  return "#" + [r, g, b].map(x => Math.min(255, Math.max(0, Math.round(x))).toString(16).padStart(2, "0")).join("")
}

/**
 * Helper to convert RGB to HSL
 */
export function rgbToHsl(r: number, g: number, b: number): { h: number; s: number; l: number } {
  r /= 255
  g /= 255
  b /= 255
  const max = Math.max(r, g, b)
  const min = Math.min(r, g, b)
  let h = 0
  let s = 0
  const l = (max + min) / 2

  if (max !== min) {
    const d = max - min
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min)
    switch (max) {
      case r: h = (g - b) / d + (g < b ? 6 : 0); break
      case g: h = (b - r) / d + 2; break
      case b: h = (r - g) / d + 4; break
    }
    h /= 6
  }

  return {
    h: Math.round(h * 360),
    s: Math.round(s * 100),
    l: Math.round(l * 100)
  }
}

/**
 * Recommended foreground text color (#FFFFFF vs #0F172A) for WCAG compliance
 */
export function getReadableForeground(hex: string): "#FFFFFF" | "#0F172A" {
  const contrastWithWhite = getContrastRatio(hex, "#FFFFFF")
  const contrastWithDark = getContrastRatio(hex, "#0F172A")
  return contrastWithWhite >= contrastWithDark ? "#FFFFFF" : "#0F172A"
}

/**
 * Helper to convert HSL to RGB
 */
export function hslToRgb(h: number, s: number, l: number): { r: number; g: number; b: number } {
  h /= 360
  s /= 100
  l /= 100
  let r: number, g: number, b: number

  if (s === 0) {
    r = g = b = l
  } else {
    const hue2rgb = (p: number, q: number, t: number) => {
      if (t < 0) t += 1
      if (t > 1) t -= 1
      if (t < 1 / 6) return p + (q - p) * 6 * t
      if (t < 1 / 2) return q
      if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6
      return p
    }
    const q = l < 0.5 ? l * (1 + s) : l + s - l * s
    const p = 2 * l - q
    r = hue2rgb(p, q, h + 1 / 3)
    g = hue2rgb(p, q, h)
    b = hue2rgb(p, q, h - 1 / 3)
  }

  return {
    r: Math.round(r * 255),
    g: Math.round(g * 255),
    b: Math.round(b * 255)
  }
}

/**
 * Helper to convert HSL to HEX
 */
export function hslToHex(h: number, s: number, l: number): string {
  const { r, g, b } = hslToRgb(h, s, l)
  return rgbToHex(r, g, b)
}

/**
 * Generates a luxury, high-contrast Dark Theme Palette customized to the brand logo's primary & accent hue
 */
export function generateDarkPaletteFromBrandColor(primaryHex: string, accentHex?: string): DarkThemePalette {
  const primaryRgb = hexToRgb(primaryHex) || { r: 211, g: 113, b: 18 }
  const primaryHsl = rgbToHsl(primaryRgb.r, primaryRgb.g, primaryRgb.b)
  
  const { h, s, l } = primaryHsl

  // Calculate surface hues matching the brand logo's chromatic family
  const bgSat = Math.min(s * 0.35, 25)
  const cardSat = Math.min(s * 0.30, 22)
  const popoverSat = Math.min(s * 0.28, 20)
  const sidebarSat = Math.min(s * 0.32, 23)

  const background = hslToHex(h, bgSat, 7)
  const card = hslToHex(h, cardSat, 11)
  const popover = hslToHex(h, popoverSat, 15)
  const sidebar = hslToHex(h, sidebarSat, 9)
  const header = sidebar

  // Optimize primary color for dark background contrast (make it vibrant on dark background)
  const darkPrimaryLum = Math.max(l, 58)
  const darkPrimarySat = Math.min(Math.max(s, 65), 90)
  const darkPrimary = hslToHex(h, darkPrimarySat, darkPrimaryLum)
  const darkPrimaryForeground = getReadableForeground(darkPrimary)

  // Accent color for dark background
  let darkAccent = accentHex || primaryHex
  if (accentHex) {
    const accRgb = hexToRgb(accentHex) || primaryRgb
    const accHsl = rgbToHsl(accRgb.r, accRgb.g, accRgb.b)
    darkAccent = hslToHex(accHsl.h, Math.min(Math.max(accHsl.s, 60), 90), Math.max(accHsl.l, 55))
  } else {
    darkAccent = hslToHex((h + 30) % 360, 75, 60)
  }
  const darkAccentForeground = getReadableForeground(darkAccent)

  // Text and borders
  const foreground = hslToHex(h, Math.min(s * 0.15, 10), 94)
  const mutedForeground = hslToHex(h, Math.min(s * 0.15, 12), 65)
  const border = `rgba(${primaryRgb.r}, ${primaryRgb.g}, ${primaryRgb.b}, 0.15)`

  return {
    background,
    card,
    popover,
    sidebar,
    header,
    primary: darkPrimary,
    primaryForeground: darkPrimaryForeground,
    accent: darkAccent,
    accentForeground: darkAccentForeground,
    foreground,
    mutedForeground,
    border
  }
}

/**
 * Advanced Color Quantization & Dominant Color Extractor from Image Canvas
 */
export function extractBrandColorsFromImage(imgElement: HTMLImageElement): BrandKitAnalysisResult {
  const canvas = document.createElement("canvas")
  const ctx = canvas.getContext("2d")

  const defaultPrimary = "#D37112"
  const defaultAccent = "#D32F28"

  if (!ctx) {
    return {
      primary: defaultPrimary,
      primaryForeground: getReadableForeground(defaultPrimary),
      accent: defaultAccent,
      accentForeground: getReadableForeground(defaultAccent),
      palette: [],
      darkPalette: generateDarkPaletteFromBrandColor(defaultPrimary, defaultAccent)
    }
  }

  // Scale down for rapid processing (< 50ms)
  const sampleSize = 96
  canvas.width = sampleSize
  canvas.height = sampleSize
  ctx.drawImage(imgElement, 0, 0, sampleSize, sampleSize)

  const imgData = ctx.getImageData(0, 0, sampleSize, sampleSize).data
  const colorBuckets: { [bucketKey: string]: { rSum: number; gSum: number; bSum: number; count: number } } = {}

  for (let i = 0; i < imgData.length; i += 4) {
    const r = imgData[i]
    const g = imgData[i + 1]
    const b = imgData[i + 2]
    const a = imgData[i + 3]

    // Skip fully or mostly transparent pixels
    if (a < 50) continue

    // Skip pure white or off-white background pixels (R,G,B all > 235)
    if (r > 235 && g > 235 && b > 235) continue

    // Quantize into buckets by rounding RGB to nearest multiple of 16
    const qr = Math.round(r / 16) * 16
    const qg = Math.round(g / 16) * 16
    const qb = Math.round(b / 16) * 16
    const bucketKey = `${qr},${qg},${qb}`

    if (!colorBuckets[bucketKey]) {
      colorBuckets[bucketKey] = { rSum: 0, gSum: 0, bSum: 0, count: 0 }
    }
    colorBuckets[bucketKey].rSum += r
    colorBuckets[bucketKey].gSum += g
    colorBuckets[bucketKey].bSum += b
    colorBuckets[bucketKey].count++
  }

  // Convert buckets to ExtractedColor array
  const extractedList: ExtractedColor[] = []
  for (const bucket of Object.values(colorBuckets)) {
    const avgR = Math.round(bucket.rSum / bucket.count)
    const avgG = Math.round(bucket.gSum / bucket.count)
    const avgB = Math.round(bucket.bSum / bucket.count)

    const hex = rgbToHex(avgR, avgG, avgB)
    const hsl = rgbToHsl(avgR, avgG, avgB)
    const cWhite = getContrastRatio(hex, "#FFFFFF")
    const cDark = getContrastRatio(hex, "#0F172A")
    const fg = cWhite >= cDark ? "#FFFFFF" : "#0F172A"

    extractedList.push({
      hex,
      count: bucket.count,
      hsl,
      contrastWithWhite: Math.round(cWhite * 10) / 10,
      contrastWithDark: Math.round(cDark * 10) / 10,
      recommendedForeground: fg
    })
  }

  // Sort by count (frequency) & saturation weight
  extractedList.sort((a, b) => {
    // Score combines frequency and saturation (vibrant colors preferred over dull grays)
    const scoreA = a.count * (1 + a.hsl.s / 100)
    const scoreB = b.count * (1 + b.hsl.s / 100)
    return scoreB - scoreA
  })

  // Filter top distinct colors (minimum color distance)
  const palette: ExtractedColor[] = []
  for (const item of extractedList) {
    if (palette.length >= 5) break
    const isTooClose = palette.some(p => {
      const rgb1 = hexToRgb(p.hex)!
      const rgb2 = hexToRgb(item.hex)!
      const dist = Math.sqrt(
        Math.pow(rgb1.r - rgb2.r, 2) +
        Math.pow(rgb1.g - rgb2.g, 2) +
        Math.pow(rgb1.b - rgb2.b, 2)
      )
      return dist < 45
    })
    if (!isTooClose) {
      palette.push(item)
    }
  }

  let primary = defaultPrimary
  let accent = defaultAccent

  if (palette.length > 0) {
    primary = palette[0].hex
    if (palette.length > 1) {
      // Pick highest saturation or distinct second color for accent
      const accentCandidate = palette.slice(1).sort((a, b) => b.hsl.s - a.hsl.s)[0]
      accent = accentCandidate.hex
    } else {
      accent = palette[0].hex
    }
  }

  return {
    primary,
    primaryForeground: getReadableForeground(primary),
    accent,
    accentForeground: getReadableForeground(accent),
    palette,
    darkPalette: generateDarkPaletteFromBrandColor(primary, accent)
  }
}

/**
 * Automatic Background Removal Algorithm for Logos (White/Solid Box Background Keying)
 * Removes solid or near-solid corner background color (typically white/light gray)
 * and returns a transparent PNG base64 Data URL.
 */
export function removeLogoBackground(imgElement: HTMLImageElement, tolerance: number = 32): string {
  const canvas = document.createElement("canvas")
  const ctx = canvas.getContext("2d")

  if (!ctx) return imgElement.src

  canvas.width = imgElement.naturalWidth || imgElement.width || 400
  canvas.height = imgElement.naturalHeight || imgElement.height || 400

  ctx.drawImage(imgElement, 0, 0, canvas.width, canvas.height)

  const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height)
  const data = imgData.data
  const width = canvas.width
  const height = canvas.height

  // Sample corner pixels to detect the background color
  const cornerCoords = [
    [0, 0],
    [width - 1, 0],
    [0, height - 1],
    [width - 1, height - 1]
  ]

  let bgR = 255
  let bgG = 255
  let bgB = 255
  let cornerSamples = 0
  let rSum = 0, gSum = 0, bSum = 0

  for (const [x, y] of cornerCoords) {
    const idx = (y * width + x) * 4
    const a = data[idx + 3]
    if (a > 200) {
      rSum += data[idx]
      gSum += data[idx + 1]
      bSum += data[idx + 2]
      cornerSamples++
    }
  }

  if (cornerSamples > 0) {
    bgR = Math.round(rSum / cornerSamples)
    bgG = Math.round(gSum / cornerSamples)
    bgB = Math.round(bSum / cornerSamples)
  }

  // Iterate over all pixels and key out background color within tolerance distance
  for (let i = 0; i < data.length; i += 4) {
    const r = data[i]
    const g = data[i + 1]
    const b = data[i + 2]
    const a = data[i + 3]

    if (a === 0) continue

    // Euclidean distance to background color
    const dist = Math.sqrt(
      Math.pow(r - bgR, 2) +
      Math.pow(g - bgG, 2) +
      Math.pow(b - bgB, 2)
    )

    if (dist < tolerance) {
      // Smooth alpha falloff near boundary
      if (dist < tolerance * 0.6) {
        data[i + 3] = 0 // fully transparent
      } else {
        const alphaRatio = (dist - tolerance * 0.6) / (tolerance * 0.4)
        data[i + 3] = Math.round(alphaRatio * 255)
      }
    }
  }

  ctx.putImageData(imgData, 0, 0)
  return canvas.toDataURL("image/png")
}
