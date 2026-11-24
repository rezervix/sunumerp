# Faz 4 Hazırlık Notu — Üçüncü Parti Bileşenlerin Token'lara Bağlanması

> **Durum:** Faz 1 hazırlık dokümanı (Uygulama **Faz 4** kapsamında gerçekleştirilecektir).  
> **Tek Doğruluk Kaynağı:** `app/globals.css` (`:root` B1–B7 token'ları) ve `lib/design-tokens.ts`.

Bu doküman; projede kullanılan üçüncü parti grafik, tarih seçici ve bildirim (toast/modal) bileşenlerinin **"Berrak Cam & Kurumsal Mavi"** açık tema token sistemine geçirilirken izlenecek teknik eşlemeleri tanımlar.

---

## 1. Grafik Bileşenleri (`recharts` v2.15.4)

### Etkilenen Dosyalar
- `components/ui/chart.tsx` (`ChartContainer`, `ChartStyle`, `ChartTooltipContent`, `ChartLegendContent`)
- Modül grafik ekranları (`app/dashboard/page.tsx`, `app/dashboard/finance/`, `app/dashboard/lojistik-raporlar/`, `app/dashboard/turizm/raporlar/`, `app/dashboard/stok-ai/` vb.)
- Stok tablolarındaki segmentli/LED stok çubukları (`app/dashboard/stok/components/StockTable.tsx` vb.)

### Mevcut Durum Tespiti
- `ChartContainer` ve sayfa içi grafiklerde sabit koyu/zümrüt değerler (`#34D399`, `#2DD4BF`, `#10B981`, `#111513`) ve dekoratif çok renkli diziler (`PIE_COLORS`) kullanılıyor.
- Tooltip bileşenleri koyu zeminli (`bg-[#111513]/90 border-white/10`) ve `font-mono` rakam gösterimine sahip.

### Faz 4 Uygulama Kuralları (B6 & B7)
| Grafik Öğesi | Faz 4 Token Eşlemesi | Uygulama Detayı |
| :--- | :--- | :--- |
| **1. Seri (Ana Veri)** | `var(--brand)` (`#1267E6`) | `type="monotone"`, `strokeWidth={2}`, alan dolgusu `var(--brand)` (`stopOpacity={0.18}`) → `rgba(18,103,230,0)` (`stopOpacity={0}`) |
| **2. Seri** | `var(--sky)` (`#2A93F3`) | İkincil karşılaştırma serisi (gradyan veya düz çizgi) |
| **3. Seri** | `var(--navy)` (`#07254A`) | Üçüncül seri / hedef / referans çizgisi |
| **Durum Serileri** | `var(--ok-fill)` / `var(--warn-fill)` / `var(--bad-fill)` | **Yalnızca durum anlamı taşıdığında** (ör. SLA ihlali, kritik stok, geciken sevkiyat); dekoratif kullanım yasak |
| **Kılavuz Çizgileri (`CartesianGrid`)** | `var(--line-soft)` (`#EDF1F6`) | `vertical={false}`, `strokeDasharray="3 3"` |
| **Eksen Etiketleri (`XAxis`, `YAxis`)** | `var(--text-muted)` (`#5B6B82`) | `fontSize={11}`, `tickLine={false}`, `axisLine={false}`, değerler kısaltılmış (`₺1,4M`, `₺820B`) ve `tabular-nums` |
| **Hover Tooltip** | `.tooltip-glass` | `bg-white/88 backdrop-blur-md border border-[var(--line)] rounded-[12px] shadow-[var(--shadow-card)] text-[var(--text)]`; rakamlarda `font-sans tabular-nums` (`font-mono` kaldırılacak) |
| **LED / Segmentli Stok Çubuğu** | `var(--brand)` / `var(--muted-bg)` / `var(--bad-fill)` | Normal dolu segment `var(--brand)`, boş segment `var(--muted-bg)`, kritik eşik altında dolu segment `var(--bad-fill)` |

---

## 2. Tarih Seçici (`react-day-picker` v9.8.0)

### Etkilenen Dosyalar
- `components/ui/calendar.tsx` (`Calendar`, `CalendarDayButton`)
- `components/ui/popover.tsx` (Tarih seçici açılır çerçevesi)

### Mevcut Durum Tespiti
- `Calendar` bileşeni `bg-background`, `bg-primary`, `bg-accent`, `text-muted-foreground`, `border-input` değişkenlerini kullanıyor.
- Açılır takvim (`PopoverContent`) yoğun okunabilirlik gerektiren katman olduğu için B3 kuralına göre opak `--bg` zemin kullanmalıdır.

### Faz 4 Uygulama Kuralları (B1 & B3)
| Takvim Öğesi | Faz 4 Token Eşlemesi | Uygulama Detayı |
| :--- | :--- | :--- |
| **Dış Çerçeve / Popover** | `--bg` (`#FFFFFF`) + `--line` (`#E3E8F0`) | Opak beyaz zemin, `rounded-[20px]` (`rounded-card`) veya `rounded-[12px]` (`rounded-control`), `shadow-card` |
| **Ay Başlığı & Gün Rakamları** | `--text` (`#0B1B33`) | `text-sm font-medium` başlık; gün hücrelerinde `tabular-nums` |
| **Hafta Günleri & Ay Dışı Günler** | `--text-muted` (`#5B6B82`) | `weekday` ve `outside` sınıfları; devre dışı günlerde `opacity-45` |
| **Seçili Gün / Aralık Uçları** | `--brand` (`#1267E6`) + `#FFFFFF` | `data-[selected-single=true]`, `data-[range-start=true]`, `data-[range-end=true]` → `bg-brand text-white hover:bg-brand-hover` |
| **Tarih Aralığı Ortası (`range_middle`)** | `--brand-soft` (`#EEF5FF`) + `--navy` (`#07254A`) | Yumuşak mavi aralık vurgusu, yüksek okunabilirlik (WCAG AAA) |
| **Bugün (`today`)** | `--brand-soft-2` (`#DCEAFE`) + `--brand` (`#1267E6`) | Seçili değilken hafif mavi vurgu |
| **Klavye Odak Halkası** | `--brand` (`#1267E6`) | `focus-visible:ring-2 focus-visible:ring-brand` |

---

## 3. Toast ve Sistem Bildirimleri (`sonner` v1.7.4 & `@radix-ui/react-toast`)

### Etkilenen Dosyalar
- `components/ui/sonner.tsx` (`SonnerToaster`)
- `components/ui/toast.tsx` & `components/ui/toaster.tsx` (Radix Toast)
- `components/ui/system-modal.tsx` (`SystemModal`)

### Mevcut Durum Tespiti
- `components/ui/sonner.tsx` içinde `useTheme()` ile `.dark` teması okunuyor ve `richColors` prop'u Sonner'ın kendi varsayılan yeşil/sarı/kırmızı/mavi renklerini enjekte ediyor.
- `components/ui/toast.tsx` ve `components/ui/system-modal.tsx` içinde Tailwind'in ham `emerald-600`, `amber-600`, `rose-600`, `red-300` sınıfları bulunuyor.

### Faz 4 Uygulama Kuralları (B1 & B3)
1. **`components/ui/sonner.tsx`:**
   - `theme="light"` sabitlenecek.
   - Sonner CSS değişkenleri doğrudan B1 token'larına bağlanacak (varsayılan `richColors` paletinin B1 dışı ton üretmesi engellenecek):
     ```tsx
     style={{
       '--normal-bg': 'var(--bg)',
       '--normal-text': 'var(--text)',
       '--normal-border': 'var(--line)',
       '--success-bg': 'var(--ok-soft)',
       '--success-text': 'var(--ok)',
       '--success-border': 'color-mix(in srgb, var(--ok-fill) 28%, transparent)',
       '--warning-bg': 'var(--warn-soft)',
       '--warning-text': 'var(--warn)',
       '--warning-border': 'color-mix(in srgb, var(--warn-fill) 32%, transparent)',
       '--error-bg': 'var(--bad-soft)',
       '--error-text': 'var(--bad)',
       '--error-border': 'color-mix(in srgb, var(--bad-fill) 28%, transparent)',
       '--info-bg': 'var(--brand-soft)',
       '--info-text': 'var(--brand)',
       '--info-border': 'var(--brand-line)',
     } as React.CSSProperties}
     ```
   - Kart stili: `rounded-control` (`12px`) veya `rounded-card` (`20px`), `shadow-card`, `font-sans`.
2. **`components/ui/toast.tsx` (Radix Toast):**
   - `default` varyantı: `bg-surface text-ink border-line shadow-card`.
   - `destructive` varyantı: `bg-bad-soft text-bad border-bad-fill/30` (WCAG AA >= 4.5:1 kontrast garantili).
3. **`components/ui/system-modal.tsx`:**
   - Opak `--bg` modal zemini (`surface-opaque`), durum ikonlarında `.badge-ok`, `.badge-warn`, `.badge-bad`, `.badge-brand` semantik eşlemeleri ve tek birincil aksiyon butonu (`.btn-brand-primary` veya kritik silme işleminde `bg-bad-fill text-white`).

---

## 4. Ek Faz 4 Kontrol Noktası: `SaasManager` Dinamik Tema Enjeksiyonu

- `components/saas-manager.tsx` içindeki `#dynamic-brand-kit` `<style>` bloğu şu anda `storage/system_config.json` içindeki eski koyu tema renklerini (`#0d0d0c`, `#dada4e` vb.) `:root` ve `.dark` içindeki `--primary` / `--ring` değişkenlerine yazmaktadır.
- Faz 4'te `<html className="dark">` kaldırılırken `SaasManager` güncellenerek B1 token'larının (`--brand`, `--ring`, `--primary`) ezilmesi engellenecek ve tek doğruluk kaynağı korunacaktır.
