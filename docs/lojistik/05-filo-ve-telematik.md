# Lojistik Faz 5 (`lojistik_filo`) — Filo, Araç, Şoför, Bakım, Yakıt, Maliyet, CO₂ & Telematik Teslim Raporu

**Tarih:** 2026-11-16  
**Dal (Branch):** `feature/lojistik-faz5-filo`  
**Özellik Bayrağı:** `lojistik_filo` (tüm üretim/diğer bayraklardan %100 bağımsız)  
**Ana Rota:** `/dashboard/filo` · **API:** `/api/filo`, `/api/webhooks/telematics`

---

## 1. Kapsam ve Yerinde Derinleştirme Özeti

Onaylı Faz 0 karar tablosuna birebir sadık kalınarak sistemde karşılığı bulunmayan kapsam için tek bir birleşik `/dashboard/filo` modülü eklendi; sistemde karşılığı bulunan ekranlar silinmeden/taşınmadan yerinde derinleştirildi:

| Özellik Grubu | Mevcut Durum | Uygulanan Karar | Dosya / Ekran |
| :--- | :--- | :--- | :--- |
| Araç Master, Kiralama/Amortisman, Şoför (KVKK), Evrak & Cezalar | YOK | **YENİ EKLE** | `/dashboard/filo` (`Vehicles & Drivers`, `Docs & Penalties`) |
| Bağımsız Filo Bakım Planları, İş Emirleri, Arıza, Lastik & Parça | YOK | **YENİ EKLE** | `/dashboard/filo` (`FleetMaintenanceAndFuelTabs.tsx`) |
| Yakıt Fişleri, L/100km Anormallik, Kart Ekstresi Mutabakatı | YOK | **YENİ EKLE** | `/dashboard/filo` + `/api/filo` (`record_fuel`, `import_fuel_cards`) |
| Araç Bazlı TCO (km başı maliyet), Eco-Driving & Tahmini CO₂ | YOK | **YENİ EKLE** | `/dashboard/filo` (`FleetTcoAndTelematicsTabs.tsx`) |
| Deklaratif Telematik Hub (Traccar, flespi, GpsGate, Webhook/CSV) | YÜZEYSEL | **YENİ + ADAPTER** | `telematicsProfiles.ts`, `telematicsEngine.ts`, `/api/webhooks/telematics` |
| Canlı Harita Katmanı (Leaflet + 48s iz + Çevrimdışı Kanvas) | YOK | **YENİ EKLE** | `app/dashboard/filo/components/FleetLiveMap.tsx` |
| Depo Transferlerinde Araç/Şoför Seçici | YÜZEYSEL (serbest metin) | **DERİNLEŞTİR** | `InterWarehouseTransfers.tsx` + `FleetPickerSelect.tsx` |
| E-İrsaliye İçinde Araç/Şoför Bilgisi & Filo Bağlantısı | YÜZEYSEL | **DERİNLEŞTİR** | `EDocumentViewer.tsx` + `FleetPickerSelect.tsx` |
| Kargo Operasyonlarında Filo Hızlı Bağlantısı | YETERLİ (kargo odaklı) | **DERİNLEŞTİR** | `app/dashboard/cargo/page.tsx` |
| Kenar Çubuğu & Bayrak Görünürlüğü (`lojistik_filo`) | HAZIR | **AKTİFLEŞTİR** | `lib/config/logistics-feature-flags.ts` (`IMPLEMENTED_LOGISTICS_FLEET_HREFS`) |

> **Not — Sektörel/Niş Modül Sınıflandırması:** Kod tabanı (`app/api/modules/route.ts`, `app/onboarding/page.tsx`) incelenmiş ve ERP'de sektörel/niş modül kataloğu bulunmadığı teyit edilmiştir; kural gereği eklenmemiştir.

---

## 2. Veritabanı Şeması, Additive Migration & Rollback

* **Migration:** `prisma/migrations/20261116150000_lojistik_faz5_filo/migration.sql` (17.033 bayt)
* **Rollback:** `prisma/migrations/20261116150000_lojistik_faz5_filo/rollback.sql` (1.448 bayt)
* **Mevcut Tablo Etkisi:** Yalnızca 3 tabloya opsiyonel (`NULL` kabul eden) bağlantı kolonları eklenmiştir; hiçbir kolon silinmemiş, yeniden adlandırılmamış veya tipi değiştirilmemiştir:
  * `Finance`: `vehicleId`, `driverId`, `fleetCostCategory`
  * `WarehouseTransferOrder`: `vehicleId`, `driverId`
  * `EDocumentRecord`: `vehicleId`, `driverId`
* **17 Yeni `Lojistik*` Tablosu:** `LojistikVehicle`, `LojistikVehicleLease`, `LojistikDriver`, `LojistikVehicleDocument`, `LojistikTrafficPenalty`, `LojistikVehicleMaintenancePlan`, `LojistikVehicleMaintenanceWorkOrder`, `LojistikVehicleMaintenanceSparePart`, `LojistikVehicleMaintenanceChecklistResult`, `LojistikVehicleFaultLog`, `LojistikVehicleTire`, `LojistikFuelLog`, `LojistikCo2EmissionFactor`, `LojistikTelematicConnection`, `LojistikVehicleTelematicMap`, `LojistikTelemetryEvent`, `LojistikTelematicErrorLog`.
* **JSON DB Uyumu (`lib/db.ts`):** 17 yeni koleksiyonun tamamı `JsonDbData`, `initialData` ve `fallbackModels` listelerine eklenmiştir.

---

## 3. Tam Modül Bağımsızlığı (`lojistik_filo` vs `uretim_bakim`)

* `UretimMachineAsset`, `UretimMaintenancePlan`, `UretimMaintenanceWorkOrder` tablolarının hiçbirine **dokunulmamıştır**.
* Yalnızca `lib/services/productionMaintenanceEngine.ts` içindeki saf matematik fonksiyonları (`calculateMTBF`, `calculateMTTR`, `calculateMaintenanceTotalCost`) ile paylaşımlı ERP stok/defter altyapısı (`InventoryItem` + `stockLedgerService`) kullanılmıştır.
* `scripts/test-lojistik-faz5-filo.ts` Adım 3 ve canlı `next start` `3115` testi ile **`FEATURE_URETIM_BAKIM=false` iken** `lojistik_filo` modülünün bakım planı, iş emri açma/kapatma, `InventoryItem` yedek parça sarfiyatı ve TCO raporlarının %100 çalıştığı, buna karşılık `lojistik_filo=false` iken `403 FEATURE_DISABLED` döndüğü kanıtlanmıştır.

---

## 4. KVKK Kişisel Veri Maskeleme & Denetim Kaydı

* Varsayılan okumalarda (`listFleetDrivers` / `/api/filo?section=overview`) `TCKN`, telefon, ev adresi, ehliyet no, SRC no ve psikoteknik belge numaraları maskelenir (ör. `192*****510`).
* Açık veri görüntüleme (`revealKvkk=true` / `getDriverDetailWithKvkkLog`) yalnızca `hr:read` veya `lojistik_filo:approve` yetkisine sahip dahili kullanıcılara açılır ve her başarılı erişimde **`KVKK_PII_UNMASKED_READ`** / **`KVKK_PII_UNMASKED_DETAIL`**, yetkisiz talepte ise **`KVKK_PII_DENIED`** (`403`) denetim kaydı yazılır.
* Dış tedarikçi portal hesapları `403 FORBIDDEN_SUPPLIER_SCOPE` ile tüm `/api/filo` uçlarından engellenmiştir.

---

## 5. Telematik Mimarisi, Onaylı Profiller & Güvenlik

**Önemli Uyarı:** **Canlı harici telematik hesabıyla test EDİLMEDİ.** Tüm profiller yalnızca herkese açık resmî API dokümantasyonundaki örnek payload biçimleriyle birim ve entegrasyon testlerinden geçirilmiştir. Demo ortamında olaylar yalnızca yerel demo veritabanından (`LojistikTelemetryEvent`) okunur ve arayüzde `"Demo DB"` kaynağı olarak etiketlenir. Fiyat/ticari paket bilgisi hiçbir dosyada veya arayüzde yer almaz.

| Sağlayıcı Profili | Erişim Şekli & Kimlik Doğrulama | Resmî Dokümantasyon Bağlantısı | Erişim Tarihi |
| :--- | :--- | :--- | :--- |
| **Traccar** | Self-servis Bearer Token (`Authorization: Bearer <TOKEN>`) — REST JSON & Webhook | https://www.traccar.org/api-ref/ | 2026-11-16 |
| **flespi (Gurtam)** | Self-servis `Authorization: FlespiToken <TOKEN>` — HTTP Stream / Webhook Array | https://flespi.io/docs/ · https://flespi.com/kb/how-to-get-flespi-token | 2026-11-16 |
| **GpsGate Cloud** | REST API Token (`Authorization: <TOKEN>`) — `/comGpsGate/api/v.1/.../status` | https://support.gpsgate.com/ · https://support.gpsgate.com/hc/en-us/articles/360000838999-REST-API-documentation | 2026-11-16 |
| **Genel Webhook / CSV-JSON** | HMAC-SHA256 (`X-Telematics-Signature: sha256=...`) veya `X-Api-Key` + kullanıcı tanımlı JSON path | Yerleşik (`telematicsProfiles.ts`) | 2026-11-16 |

* **Dayanıklılık:** `idempotencyKey` tekilleştirmesi (`duplicateCount`), sıra dışı / bağlantı kopukluğu sonrası gelen eski olaylarda **`isBackfill: true`** koruması (daha yeni canlı araç koordinatını ezmez, tarihsel iz listesine ekler), eşlenmemiş cihazlar için `LojistikTelematicErrorLog` günlüğü.
* **Demo OFF Koruması:** `DISABLE_DEMO_MODE=true` iken gizli anahtar (`LOJISTIK_TELEMATICS_SECRET` / `LOJISTIK_TELEMATICS_<PROVIDER>_SECRET`) tanımlı değilse demo fallback kapalıdır ve imzalı istekler **`401 UNAUTHORIZED_TELEMATICS_WEBHOOK`** ile reddedilir (`lojistik_filo` bayrağı kapalıysa önce `403 FEATURE_DISABLED` döner).

---

## 6. CO₂ Emisyon Katsayıları (UK DESNZ / DEFRA 2026)

* Katsayılar kod içine gömülmemiş, yapılandırılabilir **`LojistikCo2EmissionFactor`** tablosuna taşınmıştır (`GET /api/filo?section=co2_factors`, `POST` `upsert_co2_factor`).
* Kullanılan resmî set: **UK DESNZ / DEFRA Greenhouse Gas Reporting Conversion Factors — 2026 v1.0 (Scope 1)** (`https://www.gov.uk/government/publications/greenhouse-gas-reporting-conversion-factors-2026`):
  * **Dizel (`DIESEL`):** `2,58354 kg CO₂e / L`
  * **Benzin (`PETROL`):** `2,07500 kg CO₂e / L`
  * **LPG (`LPG`):** `1,55713 kg CO₂e / L`
  * **Hibrit (`HYBRID`):** `2,07500 kg CO₂e / L` (benzinli hibrit esaslı; salt elektrikli araç eklenmediği için ayrı kWh katsayısı zorunlu tutulmamıştır)
* Ekranda her sonuç **"tahmini"** olarak işaretlenir ve şu dipnot gösterilir:
  > *"Tahmini CO₂ değerleridir. Katsayılar Birleşik Krallık (DESNZ/DEFRA) tablolarına dayanır, Türkiye'ye özgü değildir."*

---

## 7. Harita Altlığı & Vercel Ortam Değişkenleri Adım Adım Kurulumu

Varsayılan kurulumda hiçbir harici harita API anahtarı gerekmez; `FleetLiveMap.tsx` doğrudan Leaflet üzerinde yerleşik koyu tema `L.GridLayer` koordinat/bölge kanvasını ve atıf çubuğunu kullanır. Üretim ortamında harici harita karoları (ör. CARTO veya ticari lisanslı harita sağlayıcısı) bağlamak için:

1. Vercel panelinde projenizi açın → **Settings** → **Environment Variables** menüsüne girin.
2. Aşağıdaki değişkenleri **Production** (ve gerekirse **Preview**) ortamları için tanımlayın:
   * `LOJISTIK_MAP_TILE_URL`: Harita karo şablonu URL'si (ör. `https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png` veya `{key}` yer tutuculu adres).
   * `LOJISTIK_MAP_TILE_KEY`: Sağlayıcıdan aldığınız API anahtarı (`{key}` yer tutucusu varsa sunucu otomatik doldurur; anahtarı asla kaynak koda yazmayın).
   * `LOJISTIK_MAP_ATTRIBUTION` *(opsiyonel)*: Özel sağlayıcı kullanıyorsanız zorunlu telif/atıf metni.
   * Telematik webhook doğrulaması için:
     * `LOJISTIK_TELEMATICS_SECRET`: Güçlü rastgele HMAC/API gizli anahtarı (`openssl rand -hex 32`).
     * İsteğe bağlı sağlayıcıya özel anahtarlar: `LOJISTIK_TELEMATICS_TRACCAR_SECRET`, `LOJISTIK_TELEMATICS_FLESPI_SECRET`, `LOJISTIK_TELEMATICS_GPSGATE_CLOUD_SECRET`.
   * Üretimde `lojistik_filo` modülünü açmak için: `FEATURE_LOJISTIK_FILO=true` (veya `system_config.json` / yönetim arayüzü).
3. **Save** ile kaydedin ve Vercel **Deployments** ekranından **Redeploy** başlatın; yeni ortam değişkenleri derleme ve çalışma zamanına yansıyacaktır.

---

## 8. Öncelikli Bakım KPI Düzeltmesi & Bilinen Sorunlar

* **Düzeltme (`cf22d46`):** `lib/services/productionMaintenanceServerDb.ts` (satır 1147–1148) içinde `getMaintenanceDashboardMetrics()` çift uyumlu hale getirildi:
  * `(w.orderType ?? w.type) === "BREAKDOWN"`
  * `Number(w.totalDowntimeMinutes ?? w.downtimeMinutes ?? 0)`
* **Doğrudan `getMaintenanceDashboardMetrics()` Önce / Sonra Kanıtı (JSON DB kayıtlarıyla):**
  * **ÖNCE:** `breakdownCount: 1`, `totalDowntimeMinutes: 60`, `mtbfHours: 400`, `mttrMinutes: 60`
  * **SONRA:** `breakdownCount: 2`, `totalDowntimeMinutes: 180`, `mtbfHours: 200`, `mttrMinutes: 90`
* **Demo Modu Ekran Notu:** `/dashboard/uretim/bakim` sayfası demo modunda (`NEXT_PUBLIC_USE_MOCK_DATA="true"`) `/api/production/maintenance?view=overview` üzerinden mock yanıt döndürmektedir (gözlemlenen değerler: `totalMachines: 6`, `mtbfHours: 580`, `mttrHours: 1.6`, `activeWorkOrders: 3`, `scheduledPlans: 4`, `overallEquipmentHealth: 94.2`). Bu nedenle yukarıdaki gerçek KPI düzeltmesi demo mock ekranında görünmez; gerçek/JSON DB modunda aktif olur.
* **Bilinen Sorun (`TEST_02`):** `scripts/test-uretim-bakim.ts` koşusunda **`TEST_02`**, `.env` içindeki `NEXT_PUBLIC_USE_MOCK_DATA="true"` mock bypass sebebiyle 403 yerine 200 dönmektedir (`15/16` geçer, `TEST_02` fail). Onay gereği bu kural gevşetilmemiş ve sorun ayrı temizlik işi için **bilinen sorun** olarak bırakılmıştır.
* **Eski API Endpoint'leri:** Kapsam dışı eski uçlara dokunulmamış, kimlik doğrulama sarmalaması **ertelendi** olarak tutulmuştur.

---

## 9. Doğrulama Matrisi & Dosya Bütünlüğü

| Test Paketi / Kontrol | Sonuç | Not |
| :--- | :--- | :--- |
| `scripts/test-lojistik-faz5-filo.ts` | **10/10 GEÇTİ** | Migration, 18 araç/15 şoför seed idempotency/rollback, `uretim_bakim=false` bağımsızlığı, KVKK audit, yakıt anormallik/kart farkı, 4 telematik profili + backfill, TCO/CO₂ 2026 |
| `scripts/test-lojistik-faz5-http-e2e.ts` (`3114` Demo ON) | **5/5 GEÇTİ** | 401/403 izolasyon, 18 araç/15 şoför/DESNZ 2026, KVKK reveal, `/api/webhooks/telematics` HMAC, 6 sayfa HTTP 200 |
| `scripts/test-lojistik-faz5-http-e2e.ts` (`3115` Demo OFF, `lojistik_filo=true`, `uretim_bakim=false`) | **2/2 GEÇTİ** | Üretim bakım kapalıyken `/api/filo` `200`, demo secret ile webhook `401` ret |
| `scripts/test-lojistik-faz5-http-e2e.ts` (`3116` Demo OFF, bayraklar kapalı) | **2/2 GEÇTİ** | `/api/filo` `403 FEATURE_DISABLED`, `/api/webhooks/telematics` `403 FEATURE_DISABLED` |
| `scripts/test-lojistik-faz1-altyapi.ts` | **15/15 GEÇTİ** | Faz 5 sonrası canlı `/dashboard/filo` rota & seed sayısı güncellendi (`73952ff`) |
| `scripts/test-lojistik-faz2-wms.ts` | **9/9 GEÇTİ** | Regresyon yok |
| `scripts/test-lojistik-faz3-tedarikci.ts` | **12/12 GEÇTİ** | Regresyon yok |
| `scripts/test-lojistik-faz4-iade.ts` | **10/10 GEÇTİ** | Regresyon yok |
| `scripts/test-uretim-bakim.ts` | **15/16 (`TEST_02` fail)** | Bilinen sorun (`NEXT_PUBLIC_USE_MOCK_DATA="true"` bypass) |
| TypeScript (`tsc --noEmit`) | **0 Faz 5 hatası** | Toplam 166 önceden var olan locale/repo hatası; Faz 5/lojistik dosyaları **0** |
| Üretim Derlemesi (`VERCEL=1 npx next build --webpack`) | **BAŞARILI (`exit 0`)** | 186 statik sayfa + `/dashboard/filo`, `/api/filo`, `/api/webhooks/telematics` |
| Tarayıcı Doğrulaması (`browser` alt ajanı) | **ENGELLENDİ (CHROME)** | `DevToolsActivePort` `ENOENT` (headless/remote debugging port yok); tüm sayfalar `localhost:3113` & `3114` HTTP 200 HTML ile doğrulandı |
| NUL / Boş Dosya Taraması (`1.128` izlenen dosya) | **TEMİZ** | Faz 1–5 ERP dosyalarında 0 NUL / 0 boş dosya (yalnızca pre-existing `README.md` + `fingpt/` markırları) |

### Önemli Dosya Bütünlük Özeti (SHA-256)

| Dosya Yolu | Boyut (Bayt) | SHA-256 |
| :--- | :--- | :--- |
| `storage/ajans-kutuphanesi/.local-db.json` | 915.402 | `28148264AB8978E3AED328D6195C4773179CE582EE50F36775231DE730644CF3` |
| `storage/system_config.json` | 1.679 | `9031A996602374AFEB6DCAB87B07B0161D1C0165AA94EDFE99F8CC088258991D` |
| `lib/services/productionMaintenanceServerDb.ts` | 42.938 | `19D628EE1ABAE1D889FC20A1D3F545CA89D0FC1CABD90FC8EB817D2E5FC2F4D4` |
| `prisma/schema.prisma` | 203.349 | `7D3E9BD662EC5DC59AD3AEDFCB9FC0BF5E7B90603070AACF10E50FF10E2859B1` |
| `prisma/migrations/20261116150000_lojistik_faz5_filo/migration.sql` | 17.033 | `ADF8516BDA8668AE23F89D71CF0278443ACCE7DE80F7A936584C49EB460D797A` |
| `prisma/migrations/20261116150000_lojistik_faz5_filo/rollback.sql` | 1.448 | `42B0DFAE6F60752A74C4A5AB49A6E70CE9150E86DCC820908B14FDCE3D3251B7` |
| `app/api/filo/route.ts` | 18.919 | `14D692D62AFEA05E14B3F78BF83492A967A6D70D6540FF90C48EDF08160DA41C` |
| `app/api/webhooks/telematics/route.ts` | 2.390 | `7779C36E7E734EDA95AAD24D9B10D9C3A9D4C8BEECE76A70CA1BCDA6250BBF58` |
| `app/dashboard/filo/page.tsx` | 11.519 | `43BD5D1602C79CC6E2B1EFFFEC9DE0F02D5072AF8CB1EAC2E6934B3277CFEFEB` |
| `lib/logistics/seed/faz5-filo-ve-telematik.ts` | 86.588 | `009458A981032AA404C7CA06882C5785259211092995117CE1DDCBF1427E7FCB` |
