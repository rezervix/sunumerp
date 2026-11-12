# Sunum ERP — Üretim Yönetim Sistemi Kullanıcı Kılavuzu (v1.0.0)

Bu kılavuz, Sunum ERP Üretim Yönetim Modülü bünyesindeki 7 temel alt sistemin uçtan uca kullanım adımlarını, ekran akışlarını, iş kurallarını ve en iyi uygulama yöntemlerini içermektedir.

---

## 1. Giriş ve Genel Bakış

Sunum ERP Üretim Yönetim Sistemi; siparişten teslimata, hammadde ihtiyaç patlatımından makine çizelgelemesine, kalite kontrol muayenelerinden kestirimci bakıma kadar tüm üretim operasyonlarını tek bir bütünleşik mimaride yönetir.

Sistem modüler yapıda olup, her bir alt modül bağımsız özellik bayrakları (feature flags) ile izole edilmiştir. Sistem yöneticiniz yetkilendirme ve modül aktivasyonunu tamamladıktan sonra ilgili menü alanları çalışma alanınızda aktif hale gelecektir.

---

## 2. Modül 1: Ürün Reçeteleri (BOM) & Operasyonel Rotalar

### 2.1 Çok Seviyeli Ürün Reçetesi (BOM) Tanımlama
1. **Navigasyon:** `Üretim Yönetimi` → `Reçeteler & Rotalar` sekmesine gidin.
2. **Yeni Reçete:** `+ Yeni Reçete Oluştur` butonuna tıklayın.
3. **Temel Bilgiler:**
   - **Üst Malzeme:** Üretilecek mamul veya yarı mamul stok kartını seçin.
   - **Reçete Kodu / Adı:** Benzersiz bir kod ve açıklayıcı ad girin (Örn: `BOM-MN-001 - Ahşap Masa`).
   - **Temel Miktar ve Birim:** Reçetenin baz aldığı parti büyüklüğünü belirtin (Örn: `1 Adet`).
4. **Bileşen Kalemleri Ekleme:**
   - `Bileşen Ekle` butonu ile hammadde veya alt yarı mamulü seçin.
   - **Net Miktar & Fire Oranı (%):** Üretim sırasında beklenen fire payını tanımlayın.
   - **Hayalet Montaj (Phantom):** Ara stok tutulmadan doğrudan üst montaja akacak alt montajlar için `Hayalet Montaj` kutusunu işaretleyin.
5. **Reçete Onay Yaşam Döngüsü:**
   - Yeni oluşturulan reçete `DRAFT` (Taslak) durumundadır.
   - Mühendislik ve maliyet kontrolü sonrası `IN_REVIEW` (İncelemede) aşamasına alınır.
   - Nihai onay verildiğinde `ACTIVE` durumuna geçer ve üretimde kullanılabilir hale gelir.
   - Yeni bir revizyon yayımlandığında eski reçete `OBSOLETE` (Kullanım Dışı) işaretlenir.

### 2.2 Operasyonel Rota ve İş Merkezi Eşleme
1. **Rota Tanımı:** Reçeteye bağlı olarak ürünün hangi operasyon adımlarından geçeceğini belirleyin.
2. **Operasyon Sırası:**
   - Adım numaraları standart olarak 10'ar artışla verilir (Örn: 10 - Kesim, 20 - Kaynak, 30 - Boya, 40 - Montaj).
3. **Süre Parametreleri:**
   - **Hazırlık Süresi (Setup Time):** İstasyonun üretime hazırlanması için gereken dakika.
   - **Çalışma Süresi (Run Time):** Birim parça başına makine/işçilik çalışma süresi (dakika).
4. **İş Merkezi Seçimi:**
   - İlgili operasyonun icra edileceği birincil iş merkezini ve varsa alternatif iş istasyonlarını tanımlayın.

---

## 3. Modül 2: MPS & MRP (Malzeme İhtiyaç Planlaması)

### 3.1 Ana Üretim Çizelgesi (MPS) Oluşturma
1. **Dönemsel Talep Girişi:** Satış siparişleri, teklif tahminleri ve güvenlik stoğu hedeflerine dayalı olarak mamul düzeyindeki brüt ihtiyaçları haftalık veya günlük periyotlara girin.
2. **Kapasite ve Fizibilite Kontrolü:** İlgili periyottaki kaba kapasite (RCCP) doluluk oranlarını izleyin.
3. **Plan Dondurma:** Belirli bir planlama ufku içerisindeki kesinleşmiş üretimleri dondurarak onaylayın.

### 3.2 MRP Patlatma ve Hesaplama Motoru
1. **MRP Çalıştırma:** `Planlama` → `MRP Motoru` ekranından `MRP Hesapla (Net Değişim / Yeniden Üretim)` butonuna tıklayın.
2. **Hesaplama Mekanizması:**
   - Düşük Seviye Kodu (Low-Level Code - LLC) sıralamasına göre en üst seviyeden hammadde seviyesine doğru patlatma yapılır.
   - Mevcut eldeki net stok, açık satınalma siparişleri ve devam eden iş emirleri brüt ihtiyaçtan düşülür.
3. **Lot Büyüklüğü Kuralları:**
   - `L4L (Lot-for-Lot):` Yalnızca ihtiyaç miktarı kadar sipariş açar.
   - `FOQ (Fixed Order Qty):` Sabit parti büyüklüklerinde katlayarak sipariş önerir.
   - `EOQ (Ekonomik Sipariş Miktarı):` Yıllık talep, sipariş maliyeti ve elde tutma maliyetine dayalı matematiksel parti hesabı yapar.
4. **Planlı Siparişlerin Onaylanması:**
   - Üretim ihtiyaçları için `Planlı İş Emri (PPO)`, dış tedarik ihtiyaçları için `Satınalma Talebi (PR)` oluşturulur.
   - Toplu veya tekil onay ile bu öneriler kesin üretim/satınalma kayıtlarına dönüştürülür.

### 3.3 What-If (Senaryo) Analizi
- Mevcut onaylı planı klonlayarak talep artışı veya tedarik gecikmesi gibi alternatif parametrelerle yeni senaryo çalıştırın. İki senaryo arasındaki malzeme açığı ve termin sapmalarını karşılaştırma tablosunda inceleyin.

---

## 4. Modül 3: Üretim İş Emirleri & Operasyon Takibi

### 4.1 İş Emri Başlatma ve Malzeme Rezervasyonu
1. **İş Emri Açma:** Onaylanan bir MRP önerisinden veya `+ Yeni İş Emri` butonundan doğrudan mamul, miktar ve termin seçerek iş emri oluşturun.
2. **Serbest Bırakma (Release):**
   - İş emri `RELEASED` durumuna alındığında, reçetedeki hammadde ve yarı mamuller ilgili depoda rezerve edilir.
   - Stokta eksik malzeme varsa sistem kırmızı uyarı verir ve eksik kalemleri listeler.

### 4.2 Saha Operatör Terminali ve Barkodlu Takip
1. **Operasyon Başlatma:** Operatör, iş emri rotasındaki operasyon kartından `Başlat` butonuna basar veya barkod okutur.
2. **Duruş / Mola Bildirimi:** Operasyon sırasında arıza, malzeme bekleme veya kalıp değişimi nedeniyle duruş oluşursa neden kodu seçilerek duruş başlatılır.
3. **Operasyon Tamamlama:**
   - Üretilen sağlam miktar ve varsa ıskarta (hurda) miktarı girilir.
   - Hurda için neden kodu seçilir (Örn: Ölçü Kaçıklığı, Çatlak, Ayar Firesi).
4. **Maliyet Tahakkuku:** Operasyon süresince gerçekleşen fiili işçilik ve makine süreleri doğrudan iş emrinin gerçekleşen maliyet havuzuna işlenir.

---

## 5. Modül 4: Kapasite Planlama (CRP) & Çizelgeleme

### 5.1 Çizelgeleme Motorunun Çalıştırılması
1. **Yöntem Seçimi:**
   - **Sonsuz Kapasite (Infinite):** İstasyon sınırlarını gözetmeksizin sadece proses sürelerine göre teorik takvimi gösterir.
   - **Sonlu Kapasite (Finite):** İstasyonların gerçek vardiya saatlerini, verimlilik katsayılarını ve bakım duruşlarını hesaba katarak çakışmasız planlama yapar.
2. **Öncelik Kuralı Seçimi:**
   - `EDD (Earliest Due Date):` En erken teslim tarihli işe öncelik verir.
   - `Critical Ratio (Kritik Oran):` Teslimat süresi / Kalan operasyon süresi oranına göre gecikme riski yüksek işleri öne alır.
   - `Öncelik Seviyesi:` Acil (Urgent) ve Yüksek (High) bayraklı iş emirlerini sıralamada en başa yerleştirir.

### 5.2 Gantt Şeması ve Kilitli (Pinned) Görevler
- Çizelgelenen işler istasyon bazında etkileşimli Gantt tablosunda görüntülenir.
- Operasyonun başlama zamanını sabitlemek ve otomatik yeniden çizelgelemeden korumak için `Kilitle (Pin)` düğmesini kullanın.

### 5.3 CTP (Söz Verilebilir Teslim Tarihi) Simülatörü
- Müşteriden gelen yeni bir sipariş miktarı ve istenen tarih için mevcut çizelgeyi bozmadan `CTP Simülasyonu` çalıştırın. Sistem fabrikanın mevcut yük durumuna göre en erken teslim edilebilir gerçekçi tarihi hesaplar.

---

## 6. Modül 5: Kalite Kontrol & Muayene Yönetimi

### 6.1 Muayene Planları Tanımlama
1. **Aşama Seçimi:** `GİRİŞ MUAYENESİ` (Satınalma), `SÜREÇ KONTROLÜ` (Operasyon Arası), `SON KONTROL` (Sevkiyat Öncesi).
2. **Örnekleme Kuralı:** ISO 2859-1 standartlarına uygun AQL seviyesi (Örn: %1.0, %2.5, %4.0) ve Muayene Seviyesi (I, II, III) belirleyin.
3. **Kontrol Parametreleri:** Ölçülebilir sayısal kriterler (tolerans alt/üst sınırları) ve görsel kriterler (Var/Yok) ekleyin.

### 6.2 Muayene Yürütme ve Karar Alma
1. **Muayene Kaydı:** Parti büyüklüğüne göre hesaplanan numune adedi kadar ölçüm değeri sisteme girilir.
2. **Otomatik Karar:**
   - Ölçümler tolerans içindeyse ve kusurlu numune sayısı kabul sınırının altındaysa sistem `KABUL` önerir.
   - Hata tespit edilirse `ŞARTLI KABUL` veya `RET` kararı verilir.
3. **Karantina ve Depo Hareketi:** Ret kararı verilen partiler otomatik olarak `Karantina Deposu`na transfer edilir.
4. **DÖF / CAPA Başlatma:** Kritik ret durumlarında aynı ekrandan tek tıkla Düzeltici ve Önleyici Faaliyet başlatılarak ilgili birime aksiyon atanır.

---

## 7. Modül 6: Ekipman, Varlık & Bakım Yönetimi

### 7.1 Ekipman Kartı ve Durum İzleme
1. **Varlık Tanımı:** Makine kodu, marka, model, seri numarası, kritiklik derecesi (A/B/C) ve sorumlu iş merkezi kaydedilir.
2. **Durum Parametreleri:** Makine çalışma saati, toplam vuruş sayısı, sıcaklık ve titreşim sensör verileri işlenir.

### 7.2 Periyodik ve Arızi Bakım Yönetimi
1. **Periyodik Bakım:** Takvim bazlı (30 gün, 90 gün) veya sayaç bazlı (500 saat, 10.000 döngü) otomatik bakım iş emri oluşturulur.
2. **Kontrol Listesi (Checklist):** Bakım teknisyeni yağ kontrolü, filtre değişimi, cıvata tork kontrolü gibi adımları sırayla tamamlar.
3. **Yedek Parça Sarfı:** Kullanılan rulman, kayış ve yağ gibi parçalar iş emrinden düşülerek stoktan otomatik sarf edilir.

### 7.3 Bakım Performans Metrikleri (MTBF, MTTR, OEE)
- **MTBF (Mean Time Between Failures):** İki arıza arasındaki ortalama çalışma süresi.
- **MTTR (Mean Time To Repair):** Arıza başlangıcından makinenin tekrar devreye alınmasına kadar geçen ortalama onarım süresi.
- **OEE (Genel Ekipman Verimliliği):** Kullanılabilirlik x Performans x Kalite formülü ile istasyon bazında hesaplanır.

---

## 8. Modül 7: Konsolide Üretim Dashboard'u & Entegrasyon

### 8.1 Rol Bazlı Paneller
- **Fabrika Müdürü:** Genel OEE, zamanında teslimat oranı, toplam hurda maliyeti, kritik makine arıza durumu.
- **Planlama Şefi:** MRP aksiyon mesajları, kapasite darboğazları, CTP simülasyonları, açık iş emri yükü.
- **Vardiya Amiri:** İstasyon dolulukları, devam eden iş emirleri, duruş süreleri ve vardiya tamamlama yüzdesi.
- **Kalite Yöneticisi:** PPM hata oranları, karantina stoğu, açık DÖF'ler ve tedarikçi giriş kalite skorları.

### 8.2 Raporlar ve Dışa Aktarma
- Tüm veri listeleri `Excel` ve `PDF` formatında dışa aktarılabilir.
- Filtreleme seçenekleri ile tarih aralığı, iş merkezi, malzeme grubu ve sipariş bazında özelleştirilmiş analizler alınabilir.
