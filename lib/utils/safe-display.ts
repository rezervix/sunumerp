/**
 * Presentation-Only Display Guards (FAZ 4 & Güvenli Görünüm Politikası)
 *
 * Kural:
 * Ekranda undefined, NaN, null, Invalid Date, X gibi ham değerler görünüyorsa
 * SADECE sunum katmanında güvenli varsayılan göster (— veya 0).
 * Veri ve hesap mantığına ASLA dokunulmaz.
 */

/**
 * Güvenli Metin Gösterici
 */
export function safeText(val: any, fallback = "—"): string {
  if (val === null || val === undefined) return fallback
  const s = String(val).trim()
  if (!s || s === "undefined" || s === "null" || s === "NaN" || s === "X") return fallback
  return s
}

/**
 * Güvenli Sayı Gösterici
 */
export function safeNumber(val: any, fallback = 0): number {
  if (val === null || val === undefined) return fallback
  const n = typeof val === "number" ? val : Number(val)
  if (isNaN(n) || !isFinite(n)) return fallback
  return n
}

/**
 * Güvenli Para Birimi Formatlayıcı (TRY)
 */
export function safeCurrency(val: any, fallback = "₺0,00"): string {
  const n = safeNumber(val, NaN)
  if (isNaN(n)) return fallback
  return new Intl.NumberFormat("tr-TR", {
    style: "currency",
    currency: "TRY",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(n)
}

/**
 * Güvenli Kısaltılmış Para Birimi Formatlayıcı (ör. ₺1,4M, ₺450K)
 */
export function safeCompactCurrency(val: any, fallback = "₺0"): string {
  const n = safeNumber(val, NaN)
  if (isNaN(n)) return fallback

  const abs = Math.abs(n)
  const sign = n < 0 ? "-" : ""

  if (abs >= 1_000_000) {
    const formatted = (abs / 1_000_000).toLocaleString("tr-TR", {
      maximumFractionDigits: 1
    })
    return `${sign}₺${formatted}M`
  }
  if (abs >= 1_000) {
    const formatted = (abs / 1_000).toLocaleString("tr-TR", {
      maximumFractionDigits: 1
    })
    return `${sign}₺${formatted}K`
  }

  return `${sign}₺${abs.toLocaleString("tr-TR", { maximumFractionDigits: 0 })}`
}

/**
 * Güvenli Tarih Formatlayıcı
 */
export function safeDate(val: any, fallback = "—"): string {
  if (!val) return fallback
  try {
    const d = new Date(val)
    if (isNaN(d.getTime())) return fallback
    return d.toLocaleDateString("tr-TR")
  } catch {
    return fallback
  }
}

/**
 * Güvenli Oran Gösterici (ör. "3.2x")
 */
export function safeRateX(val: any, fallback = "1.0x"): string {
  const n = safeNumber(val, NaN)
  if (isNaN(n)) return fallback
  return `${n.toFixed(1)}x`
}
