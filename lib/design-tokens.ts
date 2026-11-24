/**
 * "Berrak Cam & Kurumsal Mavi" — Faz 1 Tasarım Token Kayıt Defteri
 * Tek doğruluk kaynağı: CSS değişkenleri (`app/globals.css` :root) ve Tailwind `@theme inline` eşlemeleri.
 */

export interface ColorTokenMeta {
  cssVar: string
  hex: string
  tailwindBg: string
  tailwindText?: string
  tailwindBorder?: string
  usage: string
  category: "surface" | "typography" | "brand" | "status"
  contrastAgainst?: "#FFFFFF" | "#F6F8FB" | string
}

export const DESIGN_COLOR_TOKENS: ColorTokenMeta[] = [
  // Yüzey & Kenarlık
  {
    cssVar: "--bg",
    hex: "#FFFFFF",
    tailwindBg: "bg-surface",
    tailwindBorder: "border-surface",
    usage: "Kartlar, yoğun tablo ve modal zemini",
    category: "surface",
    contrastAgainst: "#0B1B33",
  },
  {
    cssVar: "--page",
    hex: "#F6F8FB",
    tailwindBg: "bg-page",
    usage: "Sayfa arka planı (+ sağ üst hafif mavi ambiyans)",
    category: "surface",
    contrastAgainst: "#0B1B33",
  },
  {
    cssVar: "--muted-bg",
    hex: "#F1F4F9",
    tailwindBg: "bg-muted-bg",
    usage: "Pasif alan, nötr rozet zemini, boş stok segmenti",
    category: "surface",
    contrastAgainst: "#33445E",
  },
  {
    cssVar: "--line",
    hex: "#E3E8F0",
    tailwindBg: "bg-line",
    tailwindBorder: "border-line",
    usage: "Ana kart, tablo ve buton kenarlığı",
    category: "surface",
  },
  {
    cssVar: "--line-soft",
    hex: "#EDF1F6",
    tailwindBg: "bg-line-soft",
    tailwindBorder: "border-line-soft",
    usage: "Tablo satır ayırıcı, grafik kılavuz çizgisi",
    category: "surface",
  },

  // Tipografi (Ink)
  {
    cssVar: "--text",
    hex: "#0B1B33",
    tailwindBg: "bg-ink",
    tailwindText: "text-ink",
    usage: "Ana metin, başlıklar, büyük KPI rakamları",
    category: "typography",
    contrastAgainst: "#FFFFFF",
  },
  {
    cssVar: "--text-2",
    hex: "#33445E",
    tailwindBg: "bg-ink-2",
    tailwindText: "text-ink-2",
    usage: "İkincil metin, tablo hücre metni, ikincil buton",
    category: "typography",
    contrastAgainst: "#FFFFFF",
  },
  {
    cssVar: "--text-muted",
    hex: "#5B6B82",
    tailwindBg: "bg-ink-muted",
    tailwindText: "text-ink-muted",
    usage: "Üst karakter etiketler, yardımcı metin, eksen yazıları",
    category: "typography",
    contrastAgainst: "#FFFFFF",
  },

  // Kurumsal Mavi & Marka
  {
    cssVar: "--navy",
    hex: "#07254A",
    tailwindBg: "bg-navy",
    tailwindText: "text-navy",
    usage: "Logo, opsiyonel yan menü zemini, başlık vurgusu, 3. grafik serisi",
    category: "brand",
    contrastAgainst: "#FFFFFF",
  },
  {
    cssVar: "--brand",
    hex: "#1267E6",
    tailwindBg: "bg-brand",
    tailwindText: "text-brand",
    tailwindBorder: "border-brand",
    usage: "Tek ana vurgu: birincil buton, aktif sekme, bağlantı, odak halkası",
    category: "brand",
    contrastAgainst: "#FFFFFF",
  },
  {
    cssVar: "--brand-hover",
    hex: "#0F5FDB",
    tailwindBg: "bg-brand-hover",
    tailwindText: "text-brand-hover",
    usage: "Birincil vurgu hover durumu",
    category: "brand",
    contrastAgainst: "#FFFFFF",
  },
  {
    cssVar: "--blue",
    hex: "#1579F9",
    tailwindBg: "bg-brand-blue",
    tailwindText: "text-brand-blue",
    usage: "Birincil buton gradyan bitişi ve ikincil ton",
    category: "brand",
    contrastAgainst: "#FFFFFF",
  },
  {
    cssVar: "--sky",
    hex: "#2A93F3",
    tailwindBg: "bg-brand-sky",
    tailwindText: "text-brand-sky",
    usage: "Grafik 2. seri tonu",
    category: "brand",
  },
  {
    cssVar: "--brand-soft",
    hex: "#EEF5FF",
    tailwindBg: "bg-brand-soft",
    usage: "Aktif satır, seçili öğe, hafif dolgu",
    category: "brand",
    contrastAgainst: "#1267E6",
  },
  {
    cssVar: "--brand-soft-2",
    hex: "#DCEAFE",
    tailwindBg: "bg-brand-soft-2",
    usage: "Seçili aralık, metin seçimi (::selection), aktif vurgu",
    category: "brand",
    contrastAgainst: "#07254A",
  },
  {
    cssVar: "--brand-line",
    hex: "#BBD7FD",
    tailwindBg: "bg-brand-line",
    tailwindBorder: "border-brand-line",
    usage: "Vurgulu kenarlık, seçili kart/rozet çerçevesi",
    category: "brand",
  },

  // Durum Renkleri (Yalnızca Anlam İçin)
  {
    cssVar: "--ok",
    hex: "#0B7A3E",
    tailwindBg: "bg-ok",
    tailwindText: "text-ok",
    usage: "Olumlu durum metni (yalnızca anlam için)",
    category: "status",
    contrastAgainst: "#E7F6EC",
  },
  {
    cssVar: "--ok-soft",
    hex: "#E7F6EC",
    tailwindBg: "bg-ok-soft",
    usage: "Olumlu durum rozet zemini",
    category: "status",
    contrastAgainst: "#0B7A3E",
  },
  {
    cssVar: "--ok-fill",
    hex: "#16A34A",
    tailwindBg: "bg-ok-fill",
    usage: "Olumlu durum nokta/ikon dolgusu",
    category: "status",
  },
  {
    cssVar: "--warn",
    hex: "#9A5B00",
    tailwindBg: "bg-warn",
    tailwindText: "text-warn",
    usage: "Bekleme / uyarı durum metni (yalnızca anlam için)",
    category: "status",
    contrastAgainst: "#FFF4DC",
  },
  {
    cssVar: "--warn-soft",
    hex: "#FFF4DC",
    tailwindBg: "bg-warn-soft",
    usage: "Bekleme / uyarı rozet zemini",
    category: "status",
    contrastAgainst: "#9A5B00",
  },
  {
    cssVar: "--warn-fill",
    hex: "#F5A524",
    tailwindBg: "bg-warn-fill",
    usage: "Bekleme / uyarı nokta veya gösterge dolgusu",
    category: "status",
  },
  {
    cssVar: "--bad",
    hex: "#C42B31",
    tailwindBg: "bg-bad",
    tailwindText: "text-bad",
    usage: "Kritik / hata durum metni (yalnızca anlam için)",
    category: "status",
    contrastAgainst: "#FDECEC",
  },
  {
    cssVar: "--bad-soft",
    hex: "#FDECEC",
    tailwindBg: "bg-bad-soft",
    usage: "Kritik / hata rozet zemini",
    category: "status",
    contrastAgainst: "#C42B31",
  },
  {
    cssVar: "--bad-fill",
    hex: "#E5484D",
    tailwindBg: "bg-bad-fill",
    usage: "Kritik stok çubuğu segmenti / hata vurgu dolgusu",
    category: "status",
  },
]

export const DESIGN_ELEVATION_AND_MOTION_TOKENS = {
  radius: {
    card: { cssVar: "--radius-card", value: "20px", tailwind: "rounded-card" },
    control: { cssVar: "--radius-control", value: "12px", tailwind: "rounded-control" },
    pill: { cssVar: "--radius-pill", value: "9999px", tailwind: "rounded-pill" },
  },
  shadows: {
    card: {
      cssVar: "--shadow-card",
      value: "0 1px 2px rgba(11,27,51,.04), 0 12px 32px -16px rgba(11,27,51,.12)",
      tailwind: "shadow-card",
    },
    brand: {
      cssVar: "--shadow-brand",
      value: "0 8px 24px -8px rgba(18,103,230,.28)",
      tailwind: "shadow-brand",
    },
    modal: {
      cssVar: "--shadow-modal",
      value: "0 4px 12px rgba(11,27,51,.06), 0 24px 48px -12px rgba(11,27,51,.16)",
      tailwind: "shadow-modal",
    },
  },
  blur: {
    glass: { cssVar: "--blur-glass", value: "24px", tailwind: "backdrop-blur-glass" },
    tooltip: { cssVar: "--blur-tooltip", value: "12px", tailwind: "backdrop-blur-tooltip" },
  },
  motion: {
    fast: { cssVar: "--duration-fast", value: "150ms" },
    normal: { cssVar: "--duration-normal", value: "220ms" },
    slow: { cssVar: "--duration-slow", value: "300ms" },
    staggerChildren: 0.04,
  },
  charts: {
    series1: "var(--brand)",
    series2: "var(--sky)",
    series3: "var(--navy)",
    grid: "var(--line-soft)",
    axisText: "var(--text-muted)",
  },
} as const
