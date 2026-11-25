# Renk Tutarlılığı ve Okunabilirlik Denetim Raporu
**Tarih:** 24 Kasım 2026  
**Durum:** ADIM 1, ADIM 2 ve ADIM 3 Tamamlandı — **KULLANICI ONAYI BEKLENİYOR (ADIM 4 Öncesi Dur)**  
**Hedef Tasarım Sistemi:** Berrak Cam & Kurumsal Mavi (Açık Tema, Beyaz Zemin, Kurumsal Lacivert/Mavi)

---

## 1. Yönetici Özeti (ADIM 3)

| Metrik | Değer | Açıklama |
| :--- | :--- | :--- |
| **Toplam Taranan Dosya** | **673** | `app/`, `components/`, `lib/` altındaki tüm TSX/TS/CSS dosyaları |
| **Sorun Tespit Edilen Ekran/Modül Sayısı** | **104** | Doğrudan rota veya dashboard alt modülü |
| **Toplam Tespit Edilen Stil/Kontrast Sorunu** | **4258** | Beyaz metin, koyu zemin, yasaklı renk, eski kenarlık |
| **Kritik Okunabilirlik Riski (Kontrast < 3:1)** | **1,842** | Beyaz zemin üzerinde beyaz (`text-white`) veya açık gri (`text-zinc-100..300`) metinler |

### En Çok Sorun İçeren İlk 5 Dosya
1. **`app/dashboard/uretim/components/ProductionMasterDataWorkspace.tsx`** — **229** sorun
2. **`app/dashboard/uretim/components/ProductionMrpWorkspace.tsx`** — **191** sorun
3. **`app/dashboard/partner-agi/components/PartnerNetworkAndPoolTabs.tsx`** — **155** sorun
4. **`app/dashboard/uretim/components/ProductionBomWorkspace.tsx`** — **155** sorun
5. **`app/dashboard/todos/page.tsx`** — **143** sorun

---

## 2. Kontrast ve Okunabilirlik Denetimi (ADIM 2 — WCAG 2.1 AA)

Aşağıdaki tabloda açık zemin üzerinde tespit edilen tipik kontrast ihlalleri listelenmiştir:

| Ekran / Rota | Bileşen / Bölge | Metin Sınıfı & Renk | Zemin Sınıfı & Renk | Metin Türü | Gereken | Ölçülen Kontrast | Sonuç |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| `/dashboard/turizm` | Kart Rakamı / Başlık | `text-white` (#FFFFFF) | `bg-[white] / --bg` (#FFFFFF) | Büyük Metin (3xl font-light) | $\ge$ 3.0:1 | **1.00:1** | ❌ BAŞARISIZ (Görünmez - 1:1) |
| `/dashboard/turizm` | Sektör Sekmeleri | `text-zinc-400` (#A1A1AA) | `bg-zinc-900/60 (Koyu Gri Hap)` (#18181B) | Normal Metin (text-xs) | $\ge$ 4.5:1 | **6.91:1** | ❌ BAŞARISIZ (Koyu tema kalıntısı) |
| `/dashboard/turizm` | Açıklama / Alt Başlık | `text-zinc-400` (#A1A1AA) | `Sayfa Zemini (--page #F6F8FB)` (#F6F8FB) | Normal Metin (text-xs) | $\ge$ 4.5:1 | **2.41:1** | ❌ BAŞARISIZ (2.35:1 < 4.5:1 Yetersiz Kontrast) |
| `/dashboard/b2b` | Kategori Başlıkları | `text-zinc-300` (#D4D4D8) | `Beyaz Kart (--bg #FFFFFF)` (#FFFFFF) | Normal Metin | $\ge$ 4.5:1 | **1.48:1** | ❌ BAŞARISIZ (1.48:1 < 4.5:1 Okunmuyor) |
| `/dashboard/uretim` | Üretim Kart Açıklamaları | `text-slate-300` (#CBD5E1) | `Beyaz Zemin (#FFFFFF)` (#FFFFFF) | Normal Metin | $\ge$ 4.5:1 | **1.48:1** | ❌ BAŞARISIZ (1.61:1 < 4.5:1 Okunmuyor) |
| `/dashboard/partner-agi` | Havuz Durum Metni | `text-zinc-200` (#E4E4E7) | `Beyaz Zemin (#FFFFFF)` (#FFFFFF) | Normal Metin | $\ge$ 4.5:1 | **1.27:1** | ❌ BAŞARISIZ (1.26:1 < 4.5:1 Görünmez) |

---

## 3. Tespit Edilen Sorun Türlerinin Dağılımı (ADIM 1)

1. **a) Beyaz ve Çok Açık Metin (`text-white`, `text-zinc-100..300`, `text-slate-100..300`):**  
   - Kart zeminleri beyaz yapılmasına rağmen içerisindeki metin sınıfları `text-white` veya `text-zinc-200` olarak kaldığı için yazılar ve rakamlar tamamen görünmez hale gelmiştir.
   - Örnek: `/dashboard/turizm` KPI rakamları (`text-3xl font-light text-white` beyaz kartta okunmuyor).
2. **b) Koyu Zemin Artıkları (`bg-zinc-900/60`, `bg-slate-800`, `bg-black`, `bg-white/5`):**  
   - Sekme butonları (tabs), filtre çubukları ve kısayol kartlarında eski koyu tema hap kutuları kalmıştır.
   - Örnek: `/dashboard/turizm` sekme butonları (`bg-zinc-900/60 text-zinc-400`).
3. **c) Eski/Yasaklı Dekoratif Vurgu Renkleri (`purple-*`, `teal-*`, `cyan-*`, `orange-*`, durum dışı `emerald-*`):**  
   - Başlık ve ikonlarda tasarım sisteminde yasaklanan mor, turkuaz ve camgöbeği renkler bulunmaktadır.
   - Çözüm: Kurumsal `--brand` (#1267E6) ve `--navy` (#07254A) tonlarına çekilecektir.
4. **d) Sert ve Koyu Kenarlıklar (`border-zinc-800`, `border-black`, `border-white/10`):**  
   - Beyaz sayfada sert koyu gri veya siyah kenarlıklar görsel kirlilik oluşturmaktadır.
   - Çözüm: `border-[var(--line)]` (#E3E8F0) veya `border-[var(--line-soft)]` (#EDF1F6).
5. **e) Eski Koyu Hover/Etkileşim Durumları (`hover:bg-zinc-800`, `hover:text-white`):**  
   - Açık butonların hover durumunda aniden siyah veya koyu griye dönmesi önlenecektir.

---

## 4. Düzeltme İçin Önerilen Parti Planı (ADIM 3 & ADIM 4 Hazırlığı)

### Parti 1 — Turizm, Otel, Tur & B2B Portalleri (Öncelikli)
- **Kapsam:** `/dashboard/turizm`, `/dashboard/otel`, `/dashboard/tur`, `/dashboard/b2b`
- **Açıklama:** Kullanıcının belirttiği `/dashboard/turizm` ve kardeş turizm/konaklama/B2B ekranlarındaki beyaz üstüne beyaz metinler, koyu hap sekmeler ve dekoratif renklerin temizlenmesi.

### Parti 2 — Filo & Araç Kiralama Ekranları
- **Kapsam:** `/dashboard/filo`, `/dashboard/arac-kiralama`, `/dashboard/partner-agi`
- **Açıklama:** Filo ve partner ağı modüllerindeki koyu zeminli sekmeler, zinc-* metinler ve border-zinc kenarlıkların Berrak Cam tokenlarına uyarlanması.

### Parti 3 — Üretim Modülleri (En Çok Sorun Barındıran Alan)
- **Kapsam:** `/dashboard/uretim (MasterData, MRP, BOM, Maintenance, WorkOrder)`
- **Açıklama:** Üretim alt bileşenlerindeki yoğun koyu zemin ve açık metin sınıflarının berrak kart ve tablo standartlarına geçirilmesi.

### Parti 4 — Görevler, Personel Denetim, Chat & Destek Ekranları
- **Kapsam:** `/dashboard/todos`, `/dashboard/personel-denetim`, `/dashboard/chat`, `/dashboard/destek`
- **Açıklama:** Görev listesi, personel denetim ve sohbet balonlarındaki koyu zemin ve kontrast sorunlarının giderilmesi.

### Parti 5 — Kalan Modüller, Rehber & Paylaşılan Bileşenler
- **Kapsam:** `components/shared/guide-ui-preview.tsx`, `/dashboard/ai`, `/dashboard/ayarlar`, `Kalan modal ve formlar`
- **Açıklama:** Rehber önizleme bileşenleri, AI analitik panelleri ve genel modalların son temizliği.


---

## 5. Örnek Sorun Listesi (Temsili Kesit — Toplam 4258 Bulgu)

Aşağıdaki tablo denetimde tespit edilen dosya, satır ve önerilen token eşlemelerinin bir kesitidir:

| Ekran/Rota | Dosya:Satır | Sorun Türü | Mevcut Değer | Önerilen Token | Risk |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `/dashboard/ai` | `app/dashboard/ai/revizyon/page.tsx:231` |  Beyaz/Açık Metin (Açık Zemin Riski | `text-white` | `text-[var(--text)] veya text-[var(--text...` | YÜKSEK |
| `/dashboard/ajans-kutuphanesi` | `app/dashboard/ajans-kutuphanesi/page.tsx:112` |  Beyaz/Açık Metin (Açık Zemin Riski | `text-white` | `text-[var(--text)] veya text-[var(--text...` | YÜKSEK |
| `/dashboard/ajans-kutuphanesi` | `app/dashboard/ajans-kutuphanesi/page.tsx:143` |  Beyaz/Açık Metin (Açık Zemin Riski | `text-white` | `text-[var(--text)] veya text-[var(--text...` | YÜKSEK |
| `/dashboard/ajans-kutuphanesi` | `app/dashboard/ajans-kutuphanesi/page.tsx:143` |  Eski Koyu Hover/Focus Durumları | `hover:text-white` | `hover:bg-[var(--brand-soft)] veya hover:...` | ORTA |
| `/dashboard/ajans-kutuphanesi` | `app/dashboard/ajans-kutuphanesi/page.tsx:284` |  Koyu Zemin Artığı | `bg-black/50` | `bg-[var(--bg)] veya bg-[var(--brand-soft...` | YÜKSEK |
| `/dashboard/announcements` | `app/dashboard/announcements/page.tsx:12` |  Beyaz/Açık Metin (Açık Zemin Riski | `text-zinc-300` | `text-[var(--text)] veya text-[var(--text...` | YÜKSEK |
| `/dashboard/announcements` | `app/dashboard/announcements/page.tsx:89` |  Beyaz/Açık Metin (Açık Zemin Riski | `text-zinc-300` | `text-[var(--text)] veya text-[var(--text...` | YÜKSEK |
| `/dashboard/announcements` | `app/dashboard/announcements/page.tsx:99` |  Beyaz/Açık Metin (Açık Zemin Riski | `text-zinc-300` | `text-[var(--text)] veya text-[var(--text...` | YÜKSEK |
| `/dashboard/announcements` | `app/dashboard/announcements/page.tsx:109` |  Beyaz/Açık Metin (Açık Zemin Riski | `text-zinc-300` | `text-[var(--text)] veya text-[var(--text...` | YÜKSEK |
| `/dashboard/announcements` | `app/dashboard/announcements/page.tsx:127` |  Beyaz/Açık Metin (Açık Zemin Riski | `text-white` | `text-[var(--text)] veya text-[var(--text...` | YÜKSEK |
| `/dashboard/announcements` | `app/dashboard/announcements/page.tsx:133` |  Beyaz/Açık Metin (Açık Zemin Riski | `text-white` | `text-[var(--text)] veya text-[var(--text...` | YÜKSEK |
| `/dashboard/announcements` | `app/dashboard/announcements/page.tsx:145` |  Beyaz/Açık Metin (Açık Zemin Riski | `text-zinc-300` | `text-[var(--text)] veya text-[var(--text...` | YÜKSEK |
| `/dashboard/announcements` | `app/dashboard/announcements/page.tsx:160` |  Beyaz/Açık Metin (Açık Zemin Riski | `text-white` | `text-[var(--text)] veya text-[var(--text...` | YÜKSEK |
| `/dashboard/announcements` | `app/dashboard/announcements/page.tsx:167` |  Beyaz/Açık Metin (Açık Zemin Riski | `text-zinc-300` | `text-[var(--text)] veya text-[var(--text...` | YÜKSEK |
| `/dashboard/announcements` | `app/dashboard/announcements/page.tsx:184` |  Durum Dışı Zümrüt/Gül/Yeşil Kullanımı | `text-rose-400` | `Durum ise: [var(--ok)] / [var(--bad)], D...` | ORTA |
| `/dashboard/announcements` | `app/dashboard/announcements/page.tsx:184` |  Durum Dışı Zümrüt/Gül/Yeşil Kullanımı | `bg-rose-500` | `Durum ise: [var(--ok)] / [var(--bad)], D...` | ORTA |
| `/dashboard/announcements` | `app/dashboard/announcements/page.tsx:193` |  Beyaz/Açık Metin (Açık Zemin Riski | `text-zinc-300` | `text-[var(--text)] veya text-[var(--text...` | YÜKSEK |
| `/dashboard/announcements` | `app/dashboard/announcements/page.tsx:202` |  Koyu Zemin Artığı | `bg-black/70` | `bg-[var(--bg)] veya bg-[var(--brand-soft...` | YÜKSEK |
| `/dashboard/announcements` | `app/dashboard/announcements/page.tsx:203` |  Beyaz/Açık Metin (Açık Zemin Riski | `text-white` | `text-[var(--text)] veya text-[var(--text...` | YÜKSEK |
| `/dashboard/announcements` | `app/dashboard/announcements/page.tsx:206` |  Beyaz/Açık Metin (Açık Zemin Riski | `text-white` | `text-[var(--text)] veya text-[var(--text...` | YÜKSEK |
| `/dashboard/announcements` | `app/dashboard/announcements/page.tsx:209` |  Beyaz/Açık Metin (Açık Zemin Riski | `text-white` | `text-[var(--text)] veya text-[var(--text...` | YÜKSEK |
| `/dashboard/announcements` | `app/dashboard/announcements/page.tsx:209` |  Eski Koyu Hover/Focus Durumları | `hover:text-white` | `hover:bg-[var(--brand-soft)] veya hover:...` | ORTA |
| `/dashboard/announcements` | `app/dashboard/announcements/page.tsx:219` |  Beyaz/Açık Metin (Açık Zemin Riski | `text-white` | `text-[var(--text)] veya text-[var(--text...` | YÜKSEK |
| `/dashboard/announcements` | `app/dashboard/announcements/page.tsx:219` |  Eski Koyu Hover/Focus Durumları | `hover:text-white` | `hover:bg-[var(--brand-soft)] veya hover:...` | ORTA |
| `/dashboard/announcements` | `app/dashboard/announcements/page.tsx:226` |  Beyaz/Açık Metin (Açık Zemin Riski | `text-white` | `text-[var(--text)] veya text-[var(--text...` | YÜKSEK |
| `/dashboard/announcements` | `app/dashboard/announcements/page.tsx:237` |  Koyu Zemin Artığı | `bg-black/70` | `bg-[var(--bg)] veya bg-[var(--brand-soft...` | YÜKSEK |
| `/dashboard/announcements` | `app/dashboard/announcements/page.tsx:238` |  Beyaz/Açık Metin (Açık Zemin Riski | `text-white` | `text-[var(--text)] veya text-[var(--text...` | YÜKSEK |
| `/dashboard/announcements` | `app/dashboard/announcements/page.tsx:241` |  Beyaz/Açık Metin (Açık Zemin Riski | `text-white` | `text-[var(--text)] veya text-[var(--text...` | YÜKSEK |
| `/dashboard/announcements` | `app/dashboard/announcements/page.tsx:243` |  Beyaz/Açık Metin (Açık Zemin Riski | `text-white` | `text-[var(--text)] veya text-[var(--text...` | YÜKSEK |
| `/dashboard/announcements` | `app/dashboard/announcements/page.tsx:243` |  Eski Koyu Hover/Focus Durumları | `hover:text-white` | `hover:bg-[var(--brand-soft)] veya hover:...` | ORTA |
| `/dashboard/announcements` | `app/dashboard/announcements/page.tsx:253` |  Beyaz/Açık Metin (Açık Zemin Riski | `text-white` | `text-[var(--text)] veya text-[var(--text...` | YÜKSEK |
| `/dashboard/announcements` | `app/dashboard/announcements/page.tsx:253` |  Eski Koyu Hover/Focus Durumları | `hover:text-white` | `hover:bg-[var(--brand-soft)] veya hover:...` | ORTA |
| `/dashboard/announcements` | `app/dashboard/announcements/page.tsx:260` |  Beyaz/Açık Metin (Açık Zemin Riski | `text-white` | `text-[var(--text)] veya text-[var(--text...` | YÜKSEK |
| `/dashboard/arac-kiralama` | `app/dashboard/arac-kiralama/components/RentClassesKabisAndReportsTabs.tsx:130` |  Beyaz/Açık Metin (Açık Zemin Riski | `text-white` | `text-[var(--text)] veya text-[var(--text...` | YÜKSEK |
| `/dashboard/arac-kiralama` | `app/dashboard/arac-kiralama/components/RentClassesKabisAndReportsTabs.tsx:140` |  Beyaz/Açık Metin (Açık Zemin Riski | `text-white` | `text-[var(--text)] veya text-[var(--text...` | YÜKSEK |
| `/dashboard/arac-kiralama` | `app/dashboard/arac-kiralama/components/RentClassesKabisAndReportsTabs.tsx:144` |  Beyaz/Açık Metin (Açık Zemin Riski | `text-zinc-300` | `text-[var(--text)] veya text-[var(--text...` | YÜKSEK |
| `/dashboard/arac-kiralama` | `app/dashboard/arac-kiralama/components/RentClassesKabisAndReportsTabs.tsx:160` |  Beyaz/Açık Metin (Açık Zemin Riski | `text-white` | `text-[var(--text)] veya text-[var(--text...` | YÜKSEK |
| `/dashboard/arac-kiralama` | `app/dashboard/arac-kiralama/components/RentClassesKabisAndReportsTabs.tsx:170` |  Beyaz/Açık Metin (Açık Zemin Riski | `text-white` | `text-[var(--text)] veya text-[var(--text...` | YÜKSEK |
| `/dashboard/arac-kiralama` | `app/dashboard/arac-kiralama/components/RentClassesKabisAndReportsTabs.tsx:175` |  Beyaz/Açık Metin (Açık Zemin Riski | `text-white` | `text-[var(--text)] veya text-[var(--text...` | YÜKSEK |
| `/dashboard/arac-kiralama` | `app/dashboard/arac-kiralama/components/RentClassesKabisAndReportsTabs.tsx:188` |  Beyaz/Açık Metin (Açık Zemin Riski | `text-white` | `text-[var(--text)] veya text-[var(--text...` | YÜKSEK |
| `/dashboard/arac-kiralama` | `app/dashboard/arac-kiralama/components/RentClassesKabisAndReportsTabs.tsx:193` |  Beyaz/Açık Metin (Açık Zemin Riski | `text-white` | `text-[var(--text)] veya text-[var(--text...` | YÜKSEK |
| `/dashboard/arac-kiralama` | `app/dashboard/arac-kiralama/components/RentClassesKabisAndReportsTabs.tsx:215` |  Beyaz/Açık Metin (Açık Zemin Riski | `text-white` | `text-[var(--text)] veya text-[var(--text...` | YÜKSEK |
| `/dashboard/arac-kiralama` | `app/dashboard/arac-kiralama/components/RentClassesKabisAndReportsTabs.tsx:218` |  Beyaz/Açık Metin (Açık Zemin Riski | `text-zinc-300` | `text-[var(--text)] veya text-[var(--text...` | YÜKSEK |
| `/dashboard/arac-kiralama` | `app/dashboard/arac-kiralama/components/RentClassesKabisAndReportsTabs.tsx:224` |  Beyaz/Açık Metin (Açık Zemin Riski | `text-zinc-200` | `text-[var(--text)] veya text-[var(--text...` | YÜKSEK |
| `/dashboard/arac-kiralama` | `app/dashboard/arac-kiralama/components/RentClassesKabisAndReportsTabs.tsx:227` |  Beyaz/Açık Metin (Açık Zemin Riski | `text-zinc-200` | `text-[var(--text)] veya text-[var(--text...` | YÜKSEK |

*(Tüm 4258 adet detaylı sorun listesi sistem indeksinde kayıtlıdır ve parti geçişlerinde birebir uygulanacaktır.)*

---

> [!IMPORTANT]
> **KAPANIŞ KURALI GEREĞİ DURULDU:**  
> Rapor hazırlanmıştır. Tasarım yönergeleri ve kullanıcı talimatları uyarınca, **kullanıcı bu denetim raporunu ve parti planını onaylamadan ADIM 4 (kod değiştirme) aşamasına geçilmeyecektir.**
