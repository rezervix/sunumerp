# Sunum ERP — "Berrak Cam & Kurumsal Mavi" Tasarım Sistemi Dökümantasyonu

> **Sürüm:** 2.0.0  
> **Konsept:** Berrak Cam & Kurumsal Mavi (Clear Glass & Corporate Blue)  
> **Temel Felsefe:** Ferah, açık zeminli, kurumsal güven veren, cam yüzeylerle derinlik kazandırılmış, kutu içinde kutu karmaşasından arındırılmış modern ERP deneyimi.

---

## 1. Tasarım Token'ları (Design Tokens)

Tüm arayüz renkleri, yüzeyleri ve aralıkları CSS değişkenleri (`:root`) ve Tailwind CSS semantik sınıfları üzerinden yönetilir. Kod tabanında doğrudan rastgele hex kodları kullanılamaz; tek doğruluk kaynağı aşağıdaki token tablosudur.

### 1.1 Renk Token'ları

| Token | Değer | Tailwind Sınıfı | Kullanım Alanı |
| :--- | :--- | :--- | :--- |
| `--bg` | `#FFFFFF` | `bg-[--bg]` / `bg-white` | Kartlar, tablolar, modal gövdeleri, popover zeminleri |
| `--page` | `#F6F8FB` | `bg-[--page]` | Ana sayfa arka planı, açık nötr bölgeler |
| `--text` | `#0B1B33` | `text-[--text]` | Birincil metin, sayfa başlıkları, büyük metrik rakamları |
| `--text-2` | `#33445E` | `text-[--text-2]` | İkincil metin, veri etiketleri, tablo ikincil satırları |
| `--text-muted` | `#5B6B82` | `text-[--text-muted]` | Yardımcı ipuçları, placeholder metinleri, pasif ikonlar |
| `--navy` | `#07254A` | `text-[--navy]` / `bg-[--navy]` | Marka logosu, modal başlıkları, kurumsal kart vurgusu |
| `--brand` | `#1267E6` | `text-[--brand]` / `bg-[--brand]` | **Tek ana vurgu:** Birincil aksiyonlar, aktif sekmeler, bağlantılar |
| `--brand-hover` | `#0F5FDB` | `hover:bg-[--brand-hover]` | Birincil buton ve etkileşimli alan hover tonu |
| `--blue` | `#1579F9` | `text-[--blue]` / `bg-[--blue]` | Birincil buton gradyanı, grafik serisi |
| `--sky` | `#2A93F3` | `text-[--sky]` / `bg-[--sky]` | İkincil grafik serisi, vadeli / işleme alınan durumlar |
| `--brand-soft` | `#EEF5FF` | `bg-[--brand-soft]` | Aktif satır arka planı, yumuşak hap rozet zemini |
| `--brand-soft-2` | `#DCEAFE` | `bg-[--brand-soft-2]` | Odaklanmış liste öğesi dolgusu |
| `--brand-line` | `#BBD7FD` | `border-[--brand-line]` | Vurgulu öğe kenarlığı, aktif kontrol çevresi |
| `--line` | `#E3E8F0` | `border-[--line]` | Standart kenarlık, kart çerçevesi, ana ayırıcılar |
| `--line-soft` | `#EDF1F6` | `border-[--line-soft]` | Tablo satır çizgileri, hafif ayırıcı çizgiler |
| `--muted-bg` | `#F1F4F9` | `bg-[--muted-bg]` | Pasif giriş alanları, arama inputu, pasif rozet zemini |

### 1.2 Durum Token'ları (Semantik - Kesin Kurallar)

> [!IMPORTANT]
> Yeşil, kehribar ve kırmızı tonları **yalnızca durum ve anlam belirtmek için** kullanılır. Dekoratif amaçlı (buton, kart kenarlığı, ikon arka planı) kullanımı kesinlikle yasaktır.

| Token | Değer | Anlamı | Rozet Kullanımı |
| :--- | :--- | :--- | :--- |
| `--ok` / `--ok-soft` | `#0B7A3E` / `#E7F6EC` | Başarılı, tamamlandı, onaylandı, pozitif nakit | `bg-[--ok-soft] text-[--ok] border border-[--ok]/20` |
| `--warn` / `--warn-soft` | `#9A5B00` / `#FFF4DC` | Beklemede, inceleme gerekiyor, risk uyarısı | `bg-[--warn-soft] text-[--warn] border border-[--warn]/20` |
| `--bad` / `--bad-soft` | `#C42B31` / `#FDECEC` | İptal, kritik hata, gecikmiş, reddedildi | `bg-[--bad-soft] text-[--bad] border border-[--bad]/20` |

### 1.3 Yüzey, Radius ve Gölge Token'ları

- **Sayfa Zemini:** `bg-[#F6F8FB]` + sağ üstten gelen yumuşak mavi ambiyans gradyanı (`radial-gradient(circle at 100% 0%, rgba(18,103,230,0.06) 0%, transparent 55%)`).
- **Cam Kart Yüzeyi:** `bg-white/80 backdrop-blur-xl border border-[#E3E8F0] rounded-[20px] shadow-sm`
- **Gölge Hiyerarşisi:**
  - Kart/Panel: `0 1px 2px rgba(11,27,51,0.04), 0 12px 32px -16px rgba(11,27,51,0.12)` (`shadow-sm`)
  - Modal/Açılır Menü: `0 4px 12px rgba(11,27,51,0.06), 0 24px 48px -12px rgba(11,27,51,0.16)` (`shadow-2xl`)
  - Birincil Buton Vurgusu: `0 8px 24px -8px rgba(18,103,230,0.28)`

---

## 2. Temel Yerleşim ve Kompozisyon Kuralları

### 2.1 3-Bölge Sayfa Mimarisi
Her ekran katı bir 3 bölge hiyerarşisine uyar:
1. **Başlık & Kutusuz KPI Şeridi:**
   - Sol: Sayfa başlığı (`text-2xl sm:text-3xl font-semibold tracking-tight text-[--text]`) + alt açıklama (`text-xs text-[--text-muted]`).
   - Sağ: Sayfa başına **tek birincil aksiyon butonu** (`bg-gradient-to-r from-[--brand] to-[--blue] text-white rounded-full shadow-sm`).
   - Altında: Kutusuz 4'lü / 5'li KPI ızgarası (`grid grid-cols-2 md:grid-cols-4 gap-8 py-4 border-b border-[--line]`).
2. **Filtre ve Arama Çubuğu:**
   - Sol: Tekil arama girişi (`bg-white border border-[--line] rounded-full text-xs`).
   - Sağ: Kategori hapları (`bg-[--muted-bg] p-1 rounded-full`), durum seçiciler ve dışa aktar/özelleştir butonları.
3. **Ana İçerik Bölgesi (Tablo / Bento Grid / Grafikler):**
   - Tablolar: Dış kapsayıcı `bg-white/80 backdrop-blur-xl border border-[--line] rounded-[20px] shadow-sm`, satırlar düz beyaz `bg-white hover:bg-[--muted-bg]/50 transition-colors`.
   - Grafikler: Çizgi/alan spline yumuşak eğrileri, eksen etiketleri kısaltılmış (₺1,4M), tooltip beyaz cam (`bg-white/95 backdrop-blur-md border border-[--line] shadow-xl text-[--text]`).

### 2.2 Kutusuz (Borderless) KPI Şeridi
Büyük kutular içine hapsedilmiş rakamlar kaldırılmıştır. KPI'lar düz çizgiler arasında ferahça nefes alır:
- **Etiket:** `text-[11px] uppercase tracking-[0.12em] font-medium text-[--text-muted]`
- **Değer:** `text-3xl font-light text-[--text] tracking-tight tabular-nums` (AnimatedNumber / useSpring)
- **Rozet:** Değerin yanında küçük hap rozet (`bg-[--brand-soft] text-[--brand] text-[10px] px-2 py-0.5 rounded-full`)

---

## 3. Bileşen Kullanım Standartları

### 3.1 Butonlar (Buttons)
- **Birincil (Primary):** `bg-gradient-to-r from-[--brand] to-[--blue] hover:from-[--brand-hover] hover:to-[--brand] text-white text-xs font-medium rounded-full shadow-sm`
- **İkincil (Secondary):** `bg-white border border-[--line] text-[--text-2] hover:bg-[--muted-bg] text-xs font-medium rounded-full`
- **Hayalet (Ghost):** `hover:bg-[--muted-bg] text-[--text-muted] hover:text-[--text] text-xs font-medium rounded-full`
- **Tehlike (Destructive):** `bg-[--bad-soft] text-[--bad] border border-[--bad]/20 hover:bg-[--bad]/10 text-xs font-medium rounded-full`

### 3.2 Form Girdileri (Inputs / Selects / Textareas)
- Zemin: `bg-white`
- Kenarlık: `border border-[--line]`
- Odak: `focus:outline-none focus:border-[--brand] focus:ring-1 focus:ring-[--brand]`
- Radius: `rounded-xl`
- Metin: `text-xs text-[--text] placeholder:text-[--text-muted]`

### 3.3 Modal ve Çekmeceler (Dialog / Sheet)
- **Overlay:** `bg-[#0B1B33]/40 backdrop-blur-sm` (koyu lacivert geçirgen cam)
- **Modal Gövdesi:** `bg-white border border-[--line] rounded-[24px] shadow-2xl overflow-hidden`
- **Başlık Alanı:** `bg-[--page] border-b border-[--line] px-6 py-4 text-[--navy]`
- **Alt Buton Alanı:** `bg-[--page] border-t border-[--line] px-6 py-4 flex justify-end gap-2.5`

### 3.4 Yazdırma Görünümleri (@media print)
- Saf beyaz arka plan (`background: #ffffff !important`).
- Simsiyah yüksek kontrastlı metin (`color: #000000 !important`).
- Sıfır cam/blur efekti, sıfır gölge (`box-shadow: none !important`).
- Sade gri ince kenarlıklar (`border: 1px solid #d0d7de !important`).

---

## 4. Yapılması ve Yapılmaması Gerekenler (Do's & Don'ts)

| Yapılması Gerekenler (DO) | Yapılmaması Gerekenler (DON'T) |
| :--- | :--- |
| Her sayfa başına tek birincil buton koyun. | Sayfa üstünde 3-4 farklı renkli birincil buton yığmayın. |
| Rakamlarda `tabular-nums` ve `font-light` kullanın. | Rakamları monospace olmayan orantısız fontlarla göstermeyin. |
| Durum rozetlerinde sadece `--ok`, `--warn`, `--bad` kullanın. | Dekoratif amaçlı mor, turuncu, neon zümrüt veya camgöbeği kullanmayın. |
| Arama kutusunu üst bar ya da tablo üstünde tekilleştirin. | Hem üst barda hem tablo üstünde çift arama kutusu koymayın. |
| Boş veya eksik sayısal verilerde güvenli fallback (`safeNumber`, `safeText`, `—`) gösterin. | Ekranda `undefined`, `NaN`, `null` veya ham hata string'leri bırakmayın. |
| Satır içi aksiyon butonlarını satır hover'ında gösterin. | Her satıra sabit renkli 5 ayrı buton doldurarak arayüzü kalabalıklaştırmayın. |

---

## 5. Token Koruma ve CI Denetimi

Kod tabanında gelecekte eski zümrüt veya koyu tema renklerinin yanlışlıkla eklenmesini engellemek için CI koruma komutu eklenmiştir:

```bash
# Tasarım token uyumluluğunu doğrula
npm run check:tokens
```

Bu betik `app/`, `components/` ve `lib/` dizinlerini tarayarak yasaklı renk kalıplarını uyarır ve CI sürecinde derlemeyi denetler.

---

## 6. Sürüm ve Geri Alma (Rollback) Planı

1. **Geri Alma:** Sistemde bir sorun yaşanması durumunda Git üzerinden `git revert` ile ilgili etiketli commit geri alınabilir.
2. **Çalışma Güvencesi:** Tüm prisma şemaları, veri tabanı sorguları ve API backend fonksiyonları %100 korunmuş, yalnızca sunum ve CSS katmanı dönüştürülmüştür.
