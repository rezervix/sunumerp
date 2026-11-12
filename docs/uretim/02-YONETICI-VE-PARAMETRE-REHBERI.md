# Sunum ERP — Üretim Yönetim Sistemi Yönetici ve Parametre Rehberi

Bu rehber, Sunum ERP sistem yöneticileri ve fabrika operasyon direktörleri için üretim modüllerinin parametrik konfigürasyonunu, özellik bayrağı (feature flag) mimarisini, takvim/vardiya ayarlarını, tolerans eşiklerini ve yetkilendirme kurallarını detaylandırmaktadır.

---

## 1. Özellik Bayrağı (Feature Flag) ve Yayılım Mimarisi

Sunum ERP üretim suite'i, sıfır riskli ve aşamalı canlıya geçiş (canary / staged rollout) için tasarlanmış bağımsız bayraklarla yönetilir.

### 1.1 Bayrak Listesi ve Tanımları

| Bayrak Anahtarı (`key`) | Modül Kapsamı | Varsayılan Değer | Bağımlılık |
| :--- | :--- | :--- | :--- |
| `uretim_bom_rota` | Ürün Reçeteleri ve Operasyonel Rotalar | `false` (Kapalı) | Yok (Temel Katman) |
| `uretim_mrp_mps` | Malzeme İhtiyaç Planlaması & MPS | `false` (Kapalı) | `uretim_bom_rota` |
| `uretim_is_emri` | Üretim İş Emirleri & Operatör Takibi | `false` (Kapalı) | `uretim_bom_rota` |
| `uretim_kapasite` | Kapasite Planlama (CRP) & Çizelgeleme | `false` (Kapalı) | `uretim_is_emri` |
| `uretim_kalite` | Kalite Kontrol & Muayene Yönetimi | `false` (Kapalı) | `uretim_is_emri` |
| `uretim_bakim` | Ekipman & Kestirimci Bakım Yönetimi | `false` (Kapalı) | Yok |

### 1.2 Sistem ve Şube (Branch) Bazlı Geçersiz Kılma
- **Sistem Düzeyi (`system-config.json`):** Fabrika genelinde modülün aktif olup olmadığını belirler.
- **Şube/Firma Düzeyi (`branchOverrides`):** Çok şubeli işletmelerde belirli bir fabrikayı (örn: `BR-BURSA-01`) pilot seçerek modülü yalnızca o şubede devreye alma imkanı sağlar.
- **Çözümleme Önceliği:**
  1. Şube özel bayrak ayarı (`branchOverrides[branchId][flagKey]`)
  2. Ortam değişkeni (`process.env.FEATURE_URETIM_...`)
  3. Sistem konfigürasyon kaydı (`systemConfig.featureFlags[flagKey]`)
  4. Sabit varsayılan (`false`)

---

## 2. Çalışma Takvimleri ve Vardiya Profilleri

MRP teslimat tarihi hesaplamaları ve sonlu kapasite çizelgeleme motoru için doğru çalışma takvimi esastır.

### 2.1 Fabrika Çalışma Takvimi
- **Haftalık Çalışma Günleri:** Varsayılan olarak Pazartesi - Cuma (1-5) veya Pazartesi - Cumartesi (1-6) seçilebilir.
- **Resmi ve İdari Tatiller:** Takvim konfigürasyonuna eklenen tarihlerde makinelerin kapasitesi otomatik olarak `0 dakika` kabul edilir.
- **Özel Mesai Günleri:** Hafta sonu veya tatil günlerinde fazla mesai planlandıysa istasyon bazında ek kapasite tanımlanabilir.

### 2.2 Vardiya Yapılandırması
- **Net Çalışma Süresi:** Tek vardiyada standart brüt 8 saat (480 dakika) üzerinden; 30 dakika yemek ve 2 x 15 dakika çay molası düşüldüğünde net 420 dakika çalışma kapasitesi tanımlanır.
- **Vardiya Katsayıları:**
  - 1. Vardiya (08:00 - 16:00): Standart Verimlilik (%100)
  - 2. Vardiya (16:00 - 24:00): Verimlilik Katsayısı (%95)
  - 3. Gece Vardiyası (00:00 - 08:00): Verimlilik Katsayısı (%85 - %90)

---

## 3. Kapasite ve Çizelgeleme Parametreleri

### 3.1 Yük ve Darboğaz Tolerans Eşikleri
- **Darboğaz Uyarı Eşiği (`thresholdPercent`):** Varsayılan `%95`. Bir istasyonun ilgili periyottaki yükü %95'e ulaştığında sistem sarı uyarı (`WARNING`) üretir.
- **Aşırı Yük Eşiği:** `%100` ve üzeri dolulukta kırmızı kritik alarm (`CRITICAL OVERLOAD`) tetiklenir ve alternatif istasyon yönlendirmesi önerilir.

### 3.2 Dinamik Standart Süre İyileştirme Katsayısı
- Operatörlerin ve makinelerin sahadaki fiili tamamlama süreleri ile mühendislik standart süreleri arasındaki varyans hesaplanır.
- **Öğrenme Katsayısı:**
  $$\text{Yeni Önerilen Standart} = (\text{Fiili Ortalama} \times 0.70) + (\text{Mevcut Standart} \times 0.30)$$
- Bu sayede planlama motoru aşırı iyimser veya kötümser standart süreleri otomatik dengeler.

---

## 4. Kalite Kontrol ve AQL Standartları

### 4.1 ISO 2859-1 Örnekleme Tabloları
- **Muayene Seviyeleri:**
  - Seviye I: Azaltılmış riskli (güvenilir tedarikçiler için).
  - Seviye II: Normal kabul muayenesi (standart fabrika ayarı).
  - Seviye III: Yüksek riskli ve kritik güvenlik parçaları.
- **AQL Değerleri:** Kritik kusurlar için AQL %0.65, Majör kusurlar için AQL %1.5 - %2.5, Minör kusurlar için AQL %4.0 uygulanır.

### 4.2 Geçiş Kuralları (Switching Rules)
- **Normalden Sıkıya Geçiş:** Arka arkaya 5 partiden 2'si ilk muayenede reddedilirse sistem otomatik olarak Sıkı Muayeneye (Tightened) geçer.
- **Sıkıdan Normale Dönüş:** Sıkı muayenede arka arkaya 5 parti kabul edilirse Normal Muayeneye dönülür.
- **Normalden Gevşetilmişe Geçiş:** Son 10 parti sorunsuz kabul edilmişse numune adedi azaltılarak Gevşetilmiş Muayeneye (Reduced) geçilir.

---

## 5. Ekipman ve Kestirimci Bakım Alarm Limitleri

### 5.1 Sensör Eşikleri ve Kritiklik Seviyeleri

| Parametre Türü | Birim | Normal Aralık | Uyarı (Warning) | Kritik Tehlike (Alarm) |
| :--- | :--- | :--- | :--- | :--- |
| **Rulman Sıcaklığı** | °C | 30 – 65 | 66 – 80 | > 80 |
| **Gövde Titreşimi (RMS)** | mm/s | 0.5 – 2.8 | 2.9 – 4.5 | > 4.5 |
| **Hidrolik Basınç** | Bar | 120 – 160 | 161 – 180 | > 180 veya < 100 |
| **Motor Akımı** | Amper | 10 – 35 | 36 – 45 | > 45 |

### 5.2 Otomatik Arıza İş Emri Üretimi
- Sensör değeri "Kritik Tehlike" eşiğini aştığında sistem otomatik olarak `Arızi Bakım İş Emri (BREAKDOWN)` açar ve istasyon durumunu `BAKIMDA` olarak günceller.
- Çizelgeleme motoru bu istasyondaki planlı operasyonları alternatif iş merkezine kaydırır.

---

## 6. Olay Bazlı Bildirim ve Uyarı Kuralları

| Olay Kodu | Tetikleyici Durum | Hedef Rol | Kanal |
| :--- | :--- | :--- | :--- |
| `PROD_DELAY_RISK` | Kritik Oran (CR) < 1.0 veya termin aşımı | Planlama Şefi, Vardiya Amiri | Uygulama İçi + E-Posta |
| `PROD_CAPACITY_OVERLOAD` | İstasyon doluluğu > %95 | Planlama Şefi | Uygulama İçi |
| `PROD_QUALITY_REJECTION` | Muayene sonucu RET veya Karantina | Kalite Müdürü, Satınalma | Uygulama İçi + SMS/E-Posta |
| `PROD_CALIBRATION_DUE` | Cihaz kalibrasyonuna 7 gün kaldı | Kalite Teknisyeni | Uygulama İçi |
| `PROD_MAINTENANCE_DUE` | Periyodik bakım saati doldu | Bakım Şefi | Uygulama İçi |
| `PROD_CRITICAL_STOCK_OUT` | MRP patlatımında hammadde temin edilemiyor | Satınalma Sorumlusu | Uygulama İçi + E-Posta |

---

## 7. Rol Tabanlı Erişim Kontrolü (RBAC) Matrisi

| Rol | Reçete/Rota | MRP/MPS | İş Emri | Kapasite | Kalite | Bakım | Dashboard |
| :--- | :---: | :---: | :---: | :---: | :---: | :---: | :---: |
| **FABRIKA_MUDURU** | Tam Yetki | Tam Yetki | Tam Yetki | Tam Yetki | Tam Yetki | Tam Yetki | Tam Yetki |
| **PLANLAMA_SEFI** | Tam Yetki | Tam Yetki | Tam Yetki | Tam Yetki | Okuma | Okuma | Tam Yetki |
| **VARDIYA_AMIRI** | Okuma | Okuma | Güncelleme | Okuma | Güncelleme | Talep Açma | Operasyonel |
| **OPERATOR** | Okuma | - | Başlat/Bitir | - | - | Arıza Bildir | - |
| **KALITE_KONTROL** | Okuma | - | - | - | Tam Yetki | - | Kalite Paneli |
| **BAKIM_ONARIM** | - | - | - | Duruş Gir | - | Tam Yetki | Bakım Paneli |

---

## 8. Canlıya Geçiş ve Geri Alma (Rollback) Prosedürü

1. **Yedek Alma:** Migration öncesi veritabanı yedeği tam olarak alınmalı ve SHA-256 imzası doğrulanmalıdır.
2. **Aşamalı Açılış (Phase-by-Phase Rollout):**
   - Hafta 1: `uretim_bom_rota` açılır (Master veriler girilir ve kontrol edilir).
   - Hafta 2: `uretim_bakim` açılır (Ekipman kartları ve periyodik planlar girilir).
   - Hafta 3: `uretim_mrp_mps` ve `uretim_is_emri` açılır (İlk pilot iş emirleri yürütülür).
   - Hafta 4: `uretim_kapasite` ve `uretim_kalite` açılarak tam entegrasyon sağlanır.
3. **Acil Durum Geri Alma (Instant Kill Switch):**
   - Herhangi bir aksaklık durumunda `saveSystemConfig({ featureFlags: { [flagKey]: false } })` çağrılarak veya arayüzden ilgili anahtar kapatılarak ilgili modül tek saniyede kullanıcı erişiminden gizlenebilir. Bu işlem mevcut hiçbir veriyi silmez.
