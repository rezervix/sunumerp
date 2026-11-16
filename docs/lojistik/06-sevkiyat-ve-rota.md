# Lojistik Faz 6 (`lojistik_sevkiyat_rota`) — Sevkiyat, Sefer Planlama, CVRPTW Rota, Sürücü Mobil + e-POD, Müşteri Takip & E-İrsaliye Teslim Raporu

**Tarih:** 2026-11-16  
**Dal (Branch):** `feature/lojistik-faz6-sevkiyat`  
**Özellik Bayrağı:** `lojistik_sevkiyat_rota` (tüm üretim/diğer bayraklardan %100 bağımsız)  
**Ana Rotalar:** `/dashboard/sevkiyat` · `/dashboard/sevkiyat/surucu` · `/takip/[token]` (public)  
**API Uçları:** `/api/sevkiyat` · `/api/takip/[token]` · `/api/logistics/pods/[...key]`

---

## 1. Kapsam, Yeni Paket Sıfır Kuralı ve Yerinde Derinleştirme Özeti

Faz 0 onay kararına uygun olarak **sıfır yeni harici npm paketi** eklenmeden; mevcut ekranlar silinmeden/taşınmadan yerinde derinleştirilmiş, sistemde karşılığı bulunmayan sevk konsolu, sürücü saha akışı ve müşteri takip ekranları eklenmiştir:

| Özellik / Ekran | Mevcut Durum | Uygulanan Karar | Konum |
| :--- | :--- | :--- | :--- |
| Sefer Planlama, Kapasite/Vardiya Kontrolü, CVRPTW Rota & Sürükle-Bırak Durak Sıralama | YOK | **YENİ EKLE** | `/dashboard/sevkiyat` (`DispatchPlanningAndTripsTab.tsx`, `DispatchRouteMap.tsx`) |
| e-POD Teslimat Kanıtı Görüntüleme, Süreli Takip Yönetimi, Optimizasyon Geçmişi & KPI/Sapma | YOK | **YENİ EKLE** | `/dashboard/sevkiyat` (`DispatchPodsAndAnalyticsTab.tsx`) |
| Sürücü Mobil Sefer İcrası (Navigasyon Deep Link, `<canvas>` İmza, Fotoğraf Yükleme, Başarısız Neden) | YOK | **YENİ EKLE** | `/dashboard/sevkiyat/surucu` (`app/dashboard/sevkiyat/surucu/page.tsx`) |
| Kimlik Doğrulamasız Süreli Müşteri Takip Portalı | YOK | **YENİ EKLE** | `/takip/[token]` (`app/takip/[token]/page.tsx`) + `/api/takip/[token]` |
| Kargo ve Kurye Ekranı Sefer Hızlı Bağlantısı | YETERLİ (kargo) | **DERİNLEŞTİR** | `app/dashboard/cargo/page.tsx` (`Sefer & Rota Planlama →` butonu) |
| Omnichannel Siparişlerden Sefere Ekleme & Canlı Takip Linki | YÜZEYSEL | **DERİNLEŞTİR** | `app/dashboard/omnichannel/components/OmnichannelOrdersManager.tsx` |
| E-Belge Listesinde Sefer / Araç Bağlantısı | YÜZEYSEL | **DERİNLEŞTİR** | `app/dashboard/omnichannel/components/EDocumentViewer.tsx` |
| Şube/ERP Siparişlerinden Sefer Planına Aktarım & Takip Linki | YÜZEYSEL | **DERİNLEŞTİR** | `app/dashboard/orders/page.tsx` (`addSourceType=ERP_ORDER`) |
| WMS Dalga Toplama (`WAVE_PICK`) & Paketleme (`PACKING`) Görevlerinden Sefere Aktarım | YÜZEYSEL | **DERİNLEŞTİR** | `app/dashboard/wms/components/WmsWorkflowStepper.tsx` (`Sefer Planına Aktar`) |

> **Önemli Notlar:**  
> * Sürükle-bırak durak sıralama HTML5 Drag & Drop + klavye/buton yukarı-aşağı (`ChevronUp` / `ChevronDown`) ile ek kütüphanesiz yapılmıştır.  
> * E-İmza çizimi doğrudan HTML5 `<canvas>` + Pointer/Touch event'leri ile PNG Data URL üreterek kaydedilir.

---

## 2. Veritabanı Şeması, Additive Migration & Rollback SQL

* **Migration:** `prisma/migrations/20261116180000_lojistik_faz6_sevkiyat_rota/migration.sql` (8.898 bayt)
* **Rollback:** `prisma/migrations/20261116180000_lojistik_faz6_sevkiyat_rota/rollback.sql` (1.243 bayt)
* **Mevcut Tablolara Eklenen Opsiyonel (`NULL`) Alanlar:**
  * `Order`: `shipmentTripId`, `trackingToken`
  * `OmnichannelOrder`: `shipmentTripId`, `trackingToken`, `shippingLat`, `shippingLng`, `timeWindowStart`, `timeWindowEnd`, `estimatedWeightKg`, `estimatedVolumeM3`, `palletCount`
  * `EDocumentRecord`: `shipmentTripId`, `shipmentStopId`
* **5 Yeni `Lojistik*` Tablosu:**
  * `LojistikShipmentTrip`: Sefer başlığı, kalkış deposu, araç/şoför, kapasite doluluğu, ham vs optimize km/dakika, polyline, E-İrsaliye ve yeniden planlama geçmişi
  * `LojistikShipmentStop`: Sıralı duraklar, kaynak (`OMNICHANNEL_ORDER` / `ERP_ORDER` / `WMS_TRANSFER` / `WMS_WAVE` / `MANUAL`), zaman penceresi, ETA, gecikme dk, başarısızlık neden kodu ve 192-bit CSPRNG süreli `trackingToken`
  * `LojistikDeliveryProof`: e-POD teslim alan, yakınlık derecesi, imza/fotoğraf URL'leri, SHA-256 checksum, GPS konumu
  * `LojistikRouteOptimizationJob`: Aşama/ilerleme yüzdesi, ham vs optimize mesafe, zaman penceresi ihlalleri ve süre (`durationMs`) kayıtları
  * `LojistikTrackingEvent`: Müşteri zaman çizelgesi ve operasyonel olay günlüğü
* **JSON DB Uyumu (`lib/db.ts`):** `JsonDbData`, `initialData` ve `fallbackModels` listelerine 5 yeni model eklenmiştir.

---

## 3. Uygulama İçi CVRPTW Rota Motoru & Harici Mesafe Matrisi Adaptörü

* **Çözücü (`lib/logistics/dispatch/cvrptwSolver.ts`):**
  1. `buildLocalCoordinateMatrix`: Depo + duraklar arası yol kıvrım katsayılı Haversine mesafe ve ortalama hız bazlı süre matrisi (`Float64Array` ön hesaplı O(1) arama).
  2. `optimizeSingleTripRoute`: Zaman penceresi boşluğu (TW-Slack) öncelikli En Yakın Ekleme + zaman bütçeli **2-Opt + Or-Opt** yerel iyileştirmesi. Çapraz durakları çözer ve sabah sıkı pencereleri önceliklendirir.
  3. `recalculateFixedStopSequence`: Kullanıcının manuel sürükle-bırak/buton ile verdiği sırayı bozmadan leg mesafelerini, kümülatif km'yi ve yeni ETA/gecikme değerlerini günceller.
  4. `planMultiVehicleTrips`: Çoklu araç atamasında ağırlık (`kg`), hacim (`m³`), palet ve soğuk zincir (`isRefrigerated`) kısıtlarını zorunlu tutar.
  * **Gözlemlenen Benchmark (`test-lojistik-faz6-sevkiyat.ts`):** 100 durak / 10 araç dağıtımı (25 soğuk zincir durağı dahil) **`38–46 ms`** aralığında, `%0` kapasite aşımıyla ve sıfır harici çözücüyle tamamlanmıştır.
* **Harici Matris Adaptörü (`lib/logistics/providers/routing.ts`):**
  * Varsayılan motor: Anahtarsız çalışan `LOCAL_COORDINATE`.
  * Ortam değişkenleriyle (`LOJISTIK_ROUTING_ENGINE`, `LOJISTIK_OSRM_URL`, `LOJISTIK_GOOGLE_ROUTES_KEY`, `LOJISTIK_HERE_ROUTING_KEY`, `LOJISTIK_TOMTOM_ROUTING_KEY`) **OSRM**, **Google Routes**, **HERE Routing** veya **TomTom Matrix** bağlanabilir; anahtar yoksa güvenli şekilde yerel çözücüye düşer.
  * **Açık Durum Notu:** Bu depoda canlı harici trafik/mesafe API anahtarı yapılandırılmamıştır; canlı trafik destekli sürüş süresi değil koordinat + kıvrım katsayılı Haversine hesaplaması aktif kullanılmaktadır.

---

## 4. e-POD Depolama, Demo Görselleri & Şoför Mobil İcra (`/dashboard/sevkiyat/surucu`)

* Sürücü mobil sayfası; sefer başlatma (`START_TRIP`), varış (`VARISTA`), Google Maps / Apple Maps / Yandex Navi deep-link yönlendirmesi (`buildNavigationDeepLinks`), zorunlu neden kodlu başarısız teslimat (`TESLIM_EDILEMEDI`) ve `<canvas>` e-imza + fotoğraf yüklemeli e-POD kaydı sunar.
* Yüklenen veriler `POST /api/upload` veya `submitStopDeliveryProof` (`ILogisticsStorageProvider`) aracılığıyla kaydedilir; her teslimat kanıtında dosya SHA-256 özeti (`checksumSha256`) tutulur.
* Demo veritabanı için gerçek ikili PNG dosyaları git tarafından izlenen **`public/uploads/pod-demo/`** dizininde saklanır (`pod-sign-01..03.png`, `pod-photo-01..02.png`) ve `/api/uploads/<dosya>?subdir=pod-demo` üzerinden sunulur (`.gitignore` altındaki `storage/logistics-pods/` klasörüne demo bağımlılığı bırakılmamıştır).

---

## 5. Kimlik Doğrulamasız Süreli Müşteri Takip Portalı (`/takip/[token]`)

* `generateSecureTrackingToken()`: `crypto.randomBytes(24)` (192 bit entropi) üretir.
* `GET /api/takip/[token]`:
  * Geçerli ve süresi dolmamış tokenda **HTTP 200** (`Cache-Control: no-store`), şoför soyadını maskeleyerek (ör. `"Cemal K."`) gösterir; dahili maliyet, TCKN veya telefon gibi hassas şirket verilerini döndürmez.
  * Bilinmeyen tokenda **HTTP 404**, geçerlilik tarihi (`trackingExpiresAt`) geçmiş tokenda **HTTP 410 GONE** döndürür.
* Yetkili kullanıcılar `/dashboard/sevkiyat` → *Teslimat Kanıtları (e-POD) & Takip* sekmesinden link süresini uzatabilir veya token döndürebilir (`extend_tracking`).
* **Teknik Düzeltme (`ce09827`):** `node_modules/lucide-react/index.js` CommonJS `Proxy` yapısının Next.js 16 Turbopack SSR'ında `undefined` dönmesini önlemek amacıyla `app/takip/[token]/page.tsx` kendi 7 ikonunu sıfır-bağımlılık inline SVG bileşeni olarak render edecek şekilde güncellenmiştir.

---

## 6. Sefer Onayında Otomatik E-İrsaliye Tetikleyicisi (`approveTripAndTriggerEWaybill`)

* Sefer onaylandığında mevcut `createLogisticsProviders().eDocument.submitEDocument(...)` adaptörü aracılığıyla `DOCUMENT_TYPE = E_IRSALIYE` belgesi kesilir (`ETTN`, belge no, araç plakası, sürücü TCKN, kalem listesi), `EDocumentRecord` kaydına `shipmentTripId` bağlanır ve ilişkili `OmnichannelOrder` kayıtlarına `eWaybillNo` işlenir.
* İdempotent çalışır: Aynı sefere ikinci onay isteğinde yeni irsaliye açmaz, mevcut `eWaybillNo` bilgisini döndürür.
* **Açık Entegrasyon Notu:** Sistem ayarlarında (`app/dashboard/settings/page.tsx`) canlı bir GİB özel entegratör API anahtarı bulunmadığından varsayılan mod `DemoDbEDocumentProvider` (`mode: "demo-db"`) ile `EDocumentRecord` üretir; canlı kurulumda `LOJISTIK_EDOC_PROVIDER=external-rest` + entegratör URL/anahtar ortam değişkenleri ile `GibIntegratorEDocumentProvider` devreye girer.

---

## 7. Harita Altlığı & Sevkiyat KPI Formülleri

* **Harita Altlığı (`DispatchRouteMap.tsx`):** Faz 5 ile aynı güvenli mimari kullanılır; harici anahtar yoksa Leaflet koyu koordinat/bölge kanvası + zorunlu atıf çubuğu çalışır, `LOJISTIK_MAP_TILE_URL` / `LOJISTIK_MAP_TILE_KEY` tanımlandığında karo katmanı eklenir.
* **KPI Hesaplama (`computeDispatchKpis`):** Tüm göstergeler doğrudan DB'deki iptal edilmemiş sefer/durak/kanıt kayıtlarından hesaplanır (hiçbir sabit uydurma yüzde yoktur):
  * **Zamanında Teslimat Oranı (`%`):** `delayMinutes <= 10` olan teslimatlar / toplam teslim edilen durak.
  * **Teslim Edilemeyen Oranı (`%`):** `TESLIM_EDILEMEDI` / kapanan durak.
  * **Ortalama Durak / Araç / Gün:** Aktif durak toplamı / `(araç_x_gün)` tekil kombinasyonu.
  * **Rota Tasarrufu (`km` & `%`):** `SUM(baselineUnoptimizedDistanceKm - plannedDistanceKm)` (gerçek çözücü öncesi/sonrası kıyaslaması).
  * **Plan–Gerçek Km Sapması:** `actualDistanceKm > 0` olan tamamlanmış/yürütülen seferlerde `actual - planned`.

---

## 8. Doğrulama Matrisi & Dosya Bütünlük Tablosu

| Kontrol / Test Paketi | Sonuç | Kapsam / Not |
| :--- | :--- | :--- |
| `scripts/test-lojistik-faz6-sevkiyat.ts` | **11/11 GEÇTİ** | 6/6 migration/rollback, `lojistik_sevkiyat_rota` bayrak matrisi, CVRPTW çapraz & dar TW kıyaslama, **100 durak/10 araç (40 ms)**, kapasite/soğuk-zincir & ehliyet reddi, manuel reorder, dinamik replan (ETA kaydırma & araç devir), idempotent E-İrsaliye onayı, sürücü e-POD + SHA-256, 192-bit token `200/404/410` + PII maskeleme + rotation, KPI & `DISABLE_DEMO_MODE=true` kilidi |
| `scripts/test-lojistik-faz6-http-e2e.ts` (`3113` Dev Turbopack) | **6/6 GEÇTİ** | Unauth `401`, tedarikçi `403`, admin overview + approve/e-POD POST, `/api/takip` `200/404/410`, `/api/uploads/...pod-demo`, 11 sayfa HTTP `200` |
| `scripts/test-lojistik-faz6-http-e2e.ts` (`3114` Prod `next start`, Demo ON) | **6/6 GEÇTİ** | Production build üzerinde tüm API & sayfa kontrolleri |
| `scripts/test-lojistik-faz6-http-e2e.ts` (`3115` Prod, Demo OFF + Flag ON) | **1/1 GEÇTİ** | Gerçek auth + `/api/sevkiyat` `200` & `/api/takip/...` `404` & demo endpoints `403` |
| `scripts/test-lojistik-faz6-http-e2e.ts` (`3116` Prod, Demo OFF + Flag LOCKED) | **1/1 GEÇTİ** | `/api/sevkiyat` `403 FEATURE_DISABLED` & `/api/takip/...` `403 FEATURE_DISABLED` |
| Tam Regresyon (`faz1`..`faz6`) | **67/67 GEÇTİ** | Faz 1 (`15/15`), Faz 2 (`9/9`), Faz 3 (`12/12`), Faz 4 (`10/10`), Faz 5 (`10/10`), Faz 6 (`11/11`) |
| Hedefli TypeScript Kontrolü (Faz 6 + seed + testler + derinleştirme) | **0 FAZ 6 HATASI** | Yalnızca repo geneli önceden var olan üretim/locale TS hataları hariç Faz 6 dosyaları tertemiz |
| Production Derlemesi (`VERCEL=1 npx next build --webpack`) | **BAŞARILI (`exit 0`)** | 189 statik/dinamik sayfa + `/dashboard/sevkiyat`, `/dashboard/sevkiyat/surucu`, `/takip/[token]`, `/api/sevkiyat`, `/api/takip/[token]`, `/api/logistics/pods/[...key]` |
| Tarayıcı Doğrulaması (`browser` alt ajanı) | **ENGELLENDİ (CHROME)** | `DevToolsActivePort` `ENOENT` (uzak hata ayıklama portu açık değil); SSR/HTML doğrulaması hem `next dev (3113)` hem `next start (3114)` üzerinde HTTP `200` ile doğrulandı |
| NUL / Boş Dosya Taraması (`1.152` izlenen dosya) | **TEMİZ** | ERP/Faz 1–6 kaynaklarında 0 NUL / 0 boş dosya |

### Önemli Dosya Bütünlük Özeti (SHA-256)

| Dosya Yolu | Boyut (Bayt) | SHA-256 |
| :--- | :--- | :--- |
| `storage/ajans-kutuphanesi/.local-db.json` | 958.578 | `9AD3B9EAC8FB4F6DC8D8D490107A832CF41039630EF1CFE056D63CC06A32507F` |
| `storage/system_config.json` | 1.679 | `9031A996602374AFEB6DCAB87B07B0161D1C0165AA94EDFE99F8CC088258991D` |
| `prisma/schema.prisma` | 210.275 | `4CA2A211C0E9D438A46328832398E8D9F05517289755265BB16A5C50507C1DB7` |
| `prisma/migrations/20261116180000_lojistik_faz6_sevkiyat_rota/migration.sql` | 8.898 | `CBE0711843334E9D5A53BD9139946DC49E948A5FC58C39627FB16DDEEBEC084A` |
| `prisma/migrations/20261116180000_lojistik_faz6_sevkiyat_rota/rollback.sql` | 1.243 | `622B3AAD8FA60F1352193EF217C1759927DB0D40991D5E1DFF25B64B2568D64A` |
| `lib/logistics/dispatch/cvrptwSolver.ts` | 26.153 | `3F57110B603C2E11210CD4A31655A787EE28E2315060917F23266A78EB492FB3` |
| `lib/logistics/dispatch/dispatchService.ts` | 62.537 | `38561AAF76D5CC118FB711D8C2E5005585691FCCDFA0029579AAC4910A55B5CC` |
| `app/api/sevkiyat/route.ts` | 10.435 | `3A7B848AB5E42A803E12F77D2E2D66FCCCB313BA50DBA63626DBDC042C013BB6` |
| `app/api/takip/[token]/route.ts` | 1.602 | `74E4336AF0DC64BF22A924EABEC3F9A8304AED0A7E569D7E3A039655EA4DCB9F` |
| `app/dashboard/sevkiyat/page.tsx` | 12.100 | `E6BDC9FE1C62D47D4F554F9346927EE6A992F3B335BB5F305299D39C9A15FB3E` |
| `app/dashboard/sevkiyat/surucu/page.tsx` | 27.914 | `42ABF06681B096CC09F356D6C653A26F87ACF313FE3B638F7E8EF01E575B16CA` |
| `app/takip/[token]/page.tsx` | 10.932 | `046EDB5788D092F840AEBEC39F18CE77A38E3A90DFDC0C68CF7AE2B606A1E183` |
| `lib/logistics/seed/faz6-sevkiyat-ve-rota.ts` | 47.807 | `E7AC6E8A5DD58AC3E216D2502E34A3970B326A89F450A48EF22FE5FFAE65A14B` |
| `public/uploads/pod-demo/pod-sign-01.png` | 1.227 | `7AA23D07E8AA7D711DCF37FCC511298455340B43380F60FC2424D2DA6739FE3C` |
| `public/uploads/pod-demo/pod-sign-02.png` | 1.254 | `8FC7623E2209BF354CE5850669BE89933AE31EFFB24A16A61B4F31BF70CC469D` |
| `public/uploads/pod-demo/pod-sign-03.png` | 1.286 | `601F97298982C31F448C164940665BD532A39CE0AAF44EDDE14FAA31A6E8A44A` |
| `public/uploads/pod-demo/pod-photo-01.png` | 1.620 | `EEF6585CE0A8B35102E46AEEE9CCCFE756F56651C0AC40C713A883EA34834677` |
| `public/uploads/pod-demo/pod-photo-02.png` | 1.619 | `32F1B6B400BCEFB10D77E858A0F03BDD9B7358E10EAE67F44CD48E07EA30AAA5` |
