# Sunum ERP — Lojistik Yönetici, Parametre, Güvenlik ve Vercel Yayın Rehberi

**Sürüm:** `v1.0.0-lojistik`  
**Hedef Kitle:** Sistem Yöneticileri, DevOps / Cloud Mühendisleri ve Proje Sorumluları

---

## 1. Özellik Bayrağı Mimarisi (5 Lojistik Bayrağı vs 6 Üretim Bayrağı)

Sunum ERP'de iki ayrı, birbirinden bağımsız özellik bayrağı kümesi bulunur:

### 1.1 5 Lojistik Özellik Bayrağı (`lib/config/logistics-feature-flags.ts`)
Gerçek müşteri kurulumlarında **5 bayrağın tamamı varsayılan olarak KAPALI (`false`)** başlar:

| Bayrak Anahtarı | Kapsam | İlgili Menü / Ekranlar | Ortam Değişkeni (`server` / `public`) |
| :--- | :--- | :--- | :--- |
| `lojistik_wms` | Gelişmiş Depo & WMS | `/dashboard/wms`, `/dashboard/wms/mobil`, `/dashboard/stok` | `FEATURE_LOJISTIK_WMS` / `NEXT_PUBLIC_FEATURE_LOJISTIK_WMS` |
| `lojistik_sevkiyat_rota` | Sevkiyat, Rota & e-POD | `/dashboard/sevkiyat`, `/dashboard/sevkiyat/surucu`, `/dashboard/omnichannel`, `/takip/[token]` | `FEATURE_LOJISTIK_SEVKIYAT_ROTA` / `NEXT_PUBLIC_FEATURE_LOJISTIK_SEVKIYAT_ROTA` |
| `lojistik_tedarikci` | Satınalma, RFQ, ASN & Tedarikçi Portalı | `/dashboard/satinalma`, `/tedarikci-portali` | `FEATURE_LOJISTIK_TEDARIKCI` / `NEXT_PUBLIC_FEATURE_LOJISTIK_TEDARIKCI` |
| `lojistik_filo` | Araç Filosu, Telematik, Bakım & TCO | `/dashboard/filo` | `FEATURE_LOJISTIK_FILO` / `NEXT_PUBLIC_FEATURE_LOJISTIK_FILO` |
| `lojistik_iade` | İade (RMA), KK & Alacak Dekontu | `/dashboard/omnichannel` (`rma`), `/dashboard/omnichannel/rma/[id]/print` | `FEATURE_LOJISTIK_IADE` / `NEXT_PUBLIC_FEATURE_LOJISTIK_IADE` |

- **Toplu Bayrak Değişkeni:** `FEATURE_LOJISTIK_ALL` / `NEXT_PUBLIC_FEATURE_LOJISTIK_ALL` (`true` veya `false`).
- **Üretim Bayraklarından Ayrımı:** Üretim modülleri `FEATURE_URETIM_ALL` ve `uretim_bom_rota`, `uretim_mrp_mps`, `uretim_is_emri`, `uretim_kapasite`, `uretim_kalite`, `uretim_bakim` anahtarlarıyla yönetilir; lojistik bayraklarıyla asla karışmaz.
- **Bayrak Çözümleme Sırası (`resolveLogisticsFeatureFlags`):**
  1. Varsayılan: `false` (Kapalı — gerçek kurulum güvenliği)
  2. Genel yapılandırma: `storage/system_config.json` -> `logisticsFeatureFlags`
  3. Firma/Şube override: `logisticsFeatureFlags.branchOverrides[branchId]`
  4. Bireysel Ortam Değişkeni (`FEATURE_LOJISTIK_*`) → Toplu Ortam Değişkeni (`FEATURE_LOJISTIK_ALL`) → Canlı Demo Ortamı (`isDemoEnvironment() === true`)

---

## 2. E-Fatura Kesim Zamanlama Kuralları (`LogisticsInvoiceTimingConfig`)

Hukuki ve mali müşavirlik tercihine göre teslimat sonrası satış E-Faturası oluşturma zamanı ayarlanabilir (`lib/system-config.ts -> getServerLogisticsInvoiceTiming()`):

| Mod (`mode`) | Davranış | Yapılandırma Yöntemi |
| :--- | :--- | :--- |
| `ON_DELIVERY_DRAFT` *(Varsayılan)* | Durak `TESLIM_EDILDI` (ve `allowPartialDeliveryDraft: true` ise `KISMI_TESLIM`) e-POD kaydı alındığında otomatik **TASLAK** E-Fatura oluşturulur; yetkili kullanıcı panelden **Tek Tıkla E-Fatura Kes** (`KESILDI`) işlemini onaylar. `TESLIM_EDILEMEDI` için fatura üretilmez. | `LOJISTIK_EFATURA_TIMING_MODE` env veya `storage/system_config.json` |
| `ON_WAYBILL_SETTLE` | Yalnızca sefer/irsaliye mutabakatı kesinleştiğinde E-Fatura taslağı açılır. | `POST /api/sevkiyat` (`update_invoice_timing`) |
| `MANUAL_ONLY` | Otomatik taslak oluşturulmaz; tüm E-Fatura işlemleri manuel tetiklenir. | Yukarıdaki yöntemler (`defaultVatRate` varsayılan `%20`) |

---

## 3. 6 Bildirim Kuralı ve Cron Yönetimi

`lib/logistics/notifications/constantsAndHelpers.ts` ve `logisticsAlertRules.ts` tarafından yönetilen kurallar (`User.logisticsNotificationPrefsJson === null` iken tümü varsayılan açıktır, kullanıcı yetkisi olmayan kurallar filtreli gizlenir):

1. `DELAYED_SHIPMENT` — Planlı ETA / varış süresi aşılmış aktif duraklar
2. `CRITICAL_STOCK_SHORTAGE` — Minimum emniyet stoku (`minStockLevel`) altındaki ürünler
3. `OVERDUE_PURCHASE_ORDER` — Teslim tarihi geçmiş açık satınalma siparişleri
4. `FLEET_DOC_MAINT_EXPIRING` — Süresi yaklaşan araç/sürücü belgesi veya periyodik bakım
5. `RMA_DEADLINE_EXPIRING` — İade son tarihi yaklaşan / QC bekleyen RMA kayıtları
6. `ANOMALOUS_FUEL_CONSUMPTION` — Beklenen tüketim eşiğinin üzerindeki yakıt kayıtları

- **24 Saat Idempotency:** Aynı uyarı aynı kullanıcıya 24 saat penceresinde ikinci kez gönderilmez (`EVALUATE_WINDOW_HOURS`).
- **Arka Plan Tarama Kilidi:** Test ortamları ve Vercel statik build sırasında arka plan cron tetiklemesini kapatmak için `SUNUM_DISABLE_CRON=1` kullanılır.

---

## 4. Rol Bazlı Yetkilendirme (RBAC) & Tedarikçi Kapsamı

- **İç Personel:** `Super Admin`, `Yonetim Kurulu Uyesi` ve `Genel Mudur` tüm şirket içi ekran ve raporlara erişir. Diğer rollerde ilgili kaynak (`wms`, `lojistik_wms`, `lojistik_sevkiyat_rota`, `lojistik_tedarikci`, `lojistik_filo`, `lojistik_iade`, `omnichannel`) üzerinde `read/create/update/delete/approve` yetkileri aranır (`lib/auth/permissions.ts`).
- **Harici Tedarikçi (`Tedarikçi` rolü):**
  - `getLogisticsScopeContext` ile `isSupplierScoped = true` olarak işaretlenir ve kullanıcının bağlı olduğu `supplierId` kapsamına hapsedilir (`buildSupplierPrismaWhere` / `assertSupplierRecordAccess`).
  - `/dashboard/wms`, `/dashboard/satinalma`, `/dashboard/filo`, `/dashboard/sevkiyat`, `/dashboard/omnichannel`, `/dashboard/lojistik-raporlar` ve `/api/logistics/dashboard-summary` uçlarına erişimi **HTTP `403 FORBIDDEN_SUPPLIER_SCOPE`** ile engellenir.
  - Sadece `/tedarikci-portali` ve `/api/supplier-portal*` üzerinden kendi sipariş/RFQ/ASN/belge işlemlerini yürütebilir.

---

## 5. Harita Altlığı ve Sağlayıcı Adaptör Ayarları

- **Harita:** `LOJISTIK_MAP_TILE_URL` tanımlıysa (örn. OpenStreetMap veya kurumsal vektör sunucu), `FleetLiveMap` bileşeninde dış harita katmanı aktif olur. İsteğe bağlı `LOJISTIK_MAP_TILE_KEY` ve `LOJISTIK_MAP_ATTRIBUTION` tanımlanabilir. Tanımlı değilse sistem harici API anahtarı gerektirmeyen yerleşik koyu tema koordinat haritasını kullanır.
- **Sağlayıcı Adaptörleri (`createLogisticsProviders`):**
  - Varsayılan olarak tüm modüller anahtarsız (`demo-db` ve `local-solver`) çalışır.
  - Gerçek entegrasyon için `LOJISTIK_EDOC_PROVIDER`, `LOJISTIK_TELEMATICS_PROVIDER`, `LOJISTIK_ROUTING_PROVIDER`, `LOJISTIK_RETURN_WEBHOOK_PROVIDER`, `LOJISTIK_STORAGE_PROVIDER` ve `LOJISTIK_EDI_ASN_PROVIDER` değişkenlerini ayarlayın.
  - Telematik sağlayıcı profilleri (`TRACCAR`, `FLESPI`, `GPSGATE_CLOUD`, `GENERIC_WEBHOOK`) için yalnızca kullanıcı token/API anahtarı başlığı yeterlidir.

---

## 6. Vercel & Gerçek Müşteri Dağıtım Rehberi ve Tam Ortam Değişkenleri Listesi

### 6.1 Vercel Salt-Okunur Dosya Sistemi & Paketleme (Seçenek A)
Sunum ERP'nin mevcut demo veritabanıyla Vercel üzerinde kesintisiz çalışması için Faz 8'de şu iki temel iyileştirme yapılmıştır:
1. **`lib/system-config.ts` (`EROFS` Bellek Yedekleme):** Vercel serverless fonksiyonlarının salt-okunur dosya sisteminde (`EROFS` / `EACCES` / `EPERM`) `saveSystemConfig` ve `resetSystemConfig` hata vermek yerine yapılandırmayı runtime bellek önbelleğinde (`__sunumEphemeralSystemConfig`) saklar (`lib/db.ts` içindeki `__sunumEphemeralJsonDb` kalıbıyla aynı).
2. **`next.config.js` (`outputFileTracingIncludes`):** Vercel serverless paketlerine `.local-db.json`, `storage/system_config.json` ve `public/uploads/pod-demo/**/*` demo teslimat kanıtı görsellerinin dahil edilmesini garanti eder.

### 6.2 Tüm Ortam Değişkenleri Referans Tablosu *(Gizli Değer İçermez)*

| Değişken Adı | Zorunlu mu? | Canlı Demo (Vercel) Önerisi | Gerçek Müşteri (Prod) Önerisi | Açıklama |
| :--- | :--- | :--- | :--- | :--- |
| `DISABLE_DEMO_MODE` | Evet (Prod) | Tanımsız veya `false` | **`true`** *(Zorunlu)* | `true` iken demo seed, demo webhook fallback, anonim `/api/wms` & `/api/omnichannel` ve `mockDatabase` UI fallback tamamen kapatılır. |
| `ENABLE_DEMO_MODE` | İsteğe bağlı | `true` | **`false`** | Demo ortamını açık/kapalı belirleyen sunucu bayrağı. |
| `NEXT_PUBLIC_ENABLE_DEMO_MODE` | İsteğe bağlı | `true` | **`false`** | İstemci tarafı demo şalter uyumluluk bayrağı. |
| `NEXT_PUBLIC_USE_MOCK_DATA` | İsteğe bağlı | Tanımsız veya `true` | **`false`** | İstemci tarafında mock veri fallback'ini devre dışı bırakır. |
| `FEATURE_LOJISTIK_ALL` | Önerilen | Tanımsız (Demo açık) | Modül durumuna göre (`false` veya `true`) | 5 lojistik modülünü toplu açıp kapatır (`NEXT_PUBLIC_FEATURE_LOJISTIK_ALL` ile eşlenik). |
| `FEATURE_LOJISTIK_WMS` / `_SEVKIYAT_ROTA` / `_TEDARIKCI` / `_FILO` / `_IADE` | İsteğe bağlı | Tanımsız | Modül bazlı `true` / `false` | Tek tek lojistik modül bayrakları (`NEXT_PUBLIC_FEATURE_LOJISTIK_*` karşılıkları mevcuttur). |
| `FEATURE_URETIM_ALL` *(ve 6 alt bayrak)* | İsteğe bağlı | `true` | Modül bazlı `true` / `false` | Üretim modülleri (`NEXT_PUBLIC_FEATURE_URETIM_ALL`). |
| `DATABASE_URL` | Evet (Prod) | Tanımsız (`.local-db.json`) | PostgreSQL bağlantı URI'si | Kalıcı PostgreSQL bağlantısı. Demo modunda boş bırakılırsa yerel JSON DB paketlenir. |
| `JWT_SECRET` | **Evet** | Güçlü rastgele dize (`<en-az-32-bayt>`) | Güçlü rastgele dize (`<en-az-32-bayt>`) | Oturum JWT token imzalama gizli anahtarı. |
| `API_INTEGRITY_SECRET` | **Evet (Prod)** | `<en-az-32-bayt>` | `<en-az-32-bayt>` | İstemci-sunucu bütünlük HMAC anahtarı. |
| `ADMIN_RETURN_SECRET` | Önerilen | `<rastgele-32-bayt>` | `<rastgele-32-bayt>` | Demo içi admin ↔ tedarikçi perspektif geçiş imzası. |
| `SUPPLIER_PORTAL_SECRET` | **Evet (Portal)** | `<rastgele-32-bayt>` | `<rastgele-32-bayt>` | Tedarikçi portalı davet token karma/imza anahtarı. |
| `OMNICHANNEL_WEBHOOK_SECRET` *(ve `OMNICHANNEL_WEBHOOK_SECRET_<KANAL>`)* | **Evet (Prod Webhook)** | İsteğe bağlı | Pazaryeri gizli anahtarları | Demo kapalıyken tüm pazaryeri webhook olaylarında (`ORDER_CREATED`, `SHIPMENT_STATUS_UPDATE`, `RETURN_REQUEST`) HMAC/Secret zorunludur. |
| `LOJISTIK_TELEMATICS_SECRET` *(ve `LOJISTIK_TELEMATICS_<SAGLAYICI>_SECRET`)* | **Evet (Prod Telematik)** | İsteğe bağlı | Sağlayıcı HMAC / API Token | `/api/webhooks/telematics` imzalı webhook doğrulaması (`401` fail-closed). |
| `EDI_ASN_WEBHOOK_KEY` / `ERP_INTEGRATION_KEY` | **Evet (EDI/B2B)** | İsteğe bağlı | Güçlü API anahtarı | `/api/edi/asn` harici EDI `DESADV` uç noktası erişim anahtarı. |
| `WMS_RFID_API_KEY` | İsteğe bağlı | İsteğe bağlı | RFID okuyucu köprü anahtarı | Fiziksel RFID geçitlerinden gelen toplu okuma yetkilendirmesi. |
| `LOJISTIK_EFATURA_TIMING_MODE` | İsteğe bağlı | `ON_DELIVERY_DRAFT` | Kurumsal tercihe göre | `ON_DELIVERY_DRAFT` / `ON_WAYBILL_SETTLE` / `MANUAL_ONLY`. |
| `LOJISTIK_MAP_TILE_URL`, `LOJISTIK_MAP_TILE_KEY`, `LOJISTIK_MAP_ATTRIBUTION` | İsteğe bağlı | Tanımsız (Yerleşik koyu harita) | Kurumsal Tile Server URL + Key | Filo canlı haritası dış karo sunucusu yapılandırması. |
| `LOJISTIK_EDOC_PROVIDER`, `_API_URL`, `_API_KEY` | İsteğe bağlı | `demo-db` | `external-rest` + GİB/Entegratör | E-İrsaliye / E-Fatura sağlayıcı adaptör seçimi. |
| `LOJISTIK_ROUTING_PROVIDER`, `_API_URL`, `_API_KEY`, `LOJISTIK_ROUTING_ENGINE` | İsteğe bağlı | `local-solver` | `external-rest` (OSRM/Google vb.) | Rota matrisi sağlayıcısı. |
| `LOJISTIK_STORAGE_PROVIDER`, `LOJISTIK_STORAGE_BASE_URL` | İsteğe bağlı | `demo-db` | `object-storage` (S3/R2 URL) | Kalıcı S3/R2 e-POD & belge depolama hedefi (Vercel'de tavsiye edilir). |
| `LOJISTIK_TELEMATICS_PROVIDER`, `_API_URL` | İsteğe bağlı | `demo-db` | `external-rest` | Periyodik çekim (pull) modunda telematik sunucu adresi. |
| `LOJISTIK_RETURN_WEBHOOK_PROVIDER`, `_URL`, `LOJISTIK_EDI_ASN_PROVIDER`, `_API_URL` | İsteğe bağlı | `demo-db` | `webhook` / `external-rest` | İade geri bildirimi ve EDI ASN dış uç noktaları. |
| `SUNUM_DISABLE_CRON` | Evet (Build/Test) | İhtiyaca göre | Genelde tanımlı değil (`1` yalnızca build/test) | Arka plan zamanlanmış görev taramalarını bastırır. |
| `ALLOW_DEMO_SEED` | Hayır *(Tehlikeli)* | `false` / tanımsız | **Asla `true` yapmayın** | Harici PostgreSQL algılandığında demo seed güvenlik kilidini korur. |
| `DEVELOPER_USERNAMES` | İsteğe bağlı | Tanımsız | Yalnızca onaylı teknik hesaplar | Geliştirici konsolu ek kullanıcı listesi. |
| `NEXT_PUBLIC_VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`, `VAPID_SUBJECT` | İsteğe bağlı | İsteğe bağlı | Web Push VAPID çifti | Tarayıcı anlık bildirim abonelikleri. |

### 6.3 Adım Adım Vercel Dağıtım Prosedürü

#### A. Vercel Canlı Demo Dağıtımı (Sunum Ortamı)
1. Vercel projesinde **Framework Preset: Next.js**, Node sürümü **20.x+** seçin.
2. Build Command: `npx prisma generate && npx next build --webpack` (`VERCEL=1` Vercel tarafından otomatik atanır).
3. Environment Variables bölümünde `JWT_SECRET`, `API_INTEGRITY_SECRET` ve isteğe bağlı `LOJISTIK_MAP_TILE_URL` tanımlayın; `DISABLE_DEMO_MODE` değişkenini **tanımlamayın** (veya `false` bırakın) ve `DATABASE_URL`'i boş bırakın (paketlenen `.local-db.json` + `system_config.json` + `public/uploads/pod-demo` `outputFileTracingIncludes` ile taşınır).
4. **Canlı Demo Doğrulaması:**
   - `/dashboard/wms`, `/dashboard/satinalma`, `/dashboard/sevkiyat`, `/dashboard/filo`, `/dashboard/omnichannel` ve `/dashboard/lojistik-raporlar` menüde görünür ve demo gezintisi çalışır.
   - `GET /api/system-config` yanıtında `logisticsDemoMode: true` ve tüm `logisticsFeatureFlags` anahtarları `true` çözülür.

#### B. Gerçek Müşteri Production Dağıtımı (Vercel veya Docker/VPS)
1. Yönetilen PostgreSQL veritabanı (`DATABASE_URL`) oluşturun ve tüm migration'ları (`npx prisma migrate deploy`) çalıştırın.
2. Environment Variables altında **kesinlikle** şunları tanımlayın:
   - `DISABLE_DEMO_MODE=true`
   - `ENABLE_DEMO_MODE=false`
   - `NEXT_PUBLIC_ENABLE_DEMO_MODE=false`
   - `NEXT_PUBLIC_USE_MOCK_DATA=false`
   - Benzersiz `JWT_SECRET`, `API_INTEGRITY_SECRET`, `SUPPLIER_PORTAL_SECRET`, `OMNICHANNEL_WEBHOOK_SECRET`, `LOJISTIK_TELEMATICS_SECRET`, `EDI_ASN_WEBHOOK_KEY`.
   - Kalıcı dosya yüklemeleri için `LOJISTIK_STORAGE_PROVIDER=object-storage` ve `LOJISTIK_STORAGE_BASE_URL`.
   - Başlangıçta yalnızca müşterinin satın aldığı modüllerin bayraklarını açın (`FEATURE_LOJISTIK_ALL=false` tutup sadece gerekli modülü `true` yapın).
3. **Production Güvenlik Doğrulaması:**
   - Kimliksiz `GET /api/wms` ve `GET /api/omnichannel` -> HTTP **`401 Unauthorized`**.
   - İmzası olmayan `POST /api/webhooks/omnichannel` (`ORDER_CREATED`, `SHIPMENT_STATUS_UPDATE`, `RETURN_REQUEST`) ve `POST /api/webhooks/telematics` -> HTTP **`401`**.
   - `seed_reset` veya `npm run seed:logistics` çalıştırıldığında güvenlik kilidi tarafından **reddedilmelidir** (`403 DEMO_MODE_DISABLED` / `LogisticsSeedEnvironmentError`).
   - Satın alınmayan modül ekranlarına istek atıldığında API **`403 FEATURE_DISABLED`** dönmeli ve sol menüde o modül hiç gösterilmemelidir.
