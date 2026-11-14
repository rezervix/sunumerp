# Lojistik ve Depo Yönetimi — Faz 1: Altyapı, Güvenlik, Bayraklar ve Demo Zemini

**Tarih:** 2026-11-14  
**Dal (Branch):** `feature/lojistik-faz1-altyapi`  
**Önceki Referans Commit:** `840209b` (`docs/lojistik/00-kesif-ve-esleme-tablosu.md`)  
**Kapsam:** Faz 1 — Salt eklemeli (additive) veritabanı migration zemini, 5 modüllü özellik bayrağı ve menü gizleme kuralı, 5 aksiyonlu RBAC + `"Tedarikçi"` kapsam güvenliği, sağlayıcı adaptör mimarisi + anahtarsız rota motoru, Vercel salt-okunur dosya sistemi / `DATABASE_URL`-siz JSON DB dayanıklılığı, yedekleme-geri yükleme + tek komut geri alınabilir demo seed çerçevesi, paket lisans doğrulaması ve mevcut akış karakterizasyon testleri.

---

## 1. Değiştirilen ve Eklenen Dosyalar Envanteri

### 1.1 Yeni Oluşturulan Dosyalar

| Dosya | Sorumluluk |
| --- | --- |
| `lib/logistics/types.ts` | İstemci ve sunucunun ortak kullandığı saf TypeScript tipleri ve sağlayıcı adaptör arayüzleri (`fs`/`db`/`audit` importu içermez). |
| `lib/logistics/constants.ts` | Saf paylaşılan sabitler, Türkçe durum/aksiyon etiketleri, `TEDARIKCI_ROLE_NAME`, `DEMO_WAREHOUSE_COORDINATES` ve `formatTryCurrency` (`fs`/`db`/`audit` importu içermez). |
| `lib/config/logistics-feature-flags.ts` | 5 modüllü özellik bayrağı (`lojistik_wms`, `lojistik_sevkiyat_rota`, `lojistik_tedarikci`, `lojistik_filo`, `lojistik_iade`), `resolveLogisticsFeatureFlags`, `IMPLEMENTED_LOGISTICS_FLEET_HREFS` ve `isLogisticsFleetMenuVisible` (saf, client-safe). |
| `lib/logistics/security.ts` | Sunucu tarafı yetki, özellik bayrağı, denetim kaydı ve fail-closed `"Tedarikçi"` kapsam filtresi (`requireLogisticsAccess`, `getLogisticsScopeContext`, `applySupplierScopeFilter`, `buildSupplierPrismaWhere`, `assertSupplierRecordAccess`, `assertLogisticsFeatureEnabled`, `logLogisticsAudit`, `handleLogisticsApiError`). |
| `lib/logistics/providers/index.ts` | Tek noktadan sağlayıcı adaptör fabrikası (`resolveLogisticsProviderConfig`, `createLogisticsProviders`, `LogisticsProviderBundle`). |
| `lib/logistics/providers/efatura-irsaliye.ts` | E-İrsaliye / E-Fatura adaptörleri (`DemoDbEDocumentProvider`, `GibIntegratorEDocumentProvider`). |
| `lib/logistics/providers/routing.ts` | Anahtarsız uygulama içi Haversine + En Yakın Komşu + 2-Opt rota çözücüsü (`LocalKeyFreeRoutingProvider`, `calculateRoadDistanceKm`) ve harici REST adaptörü (`ExternalRoutingProvider`). |
| `lib/logistics/providers/telematics.ts` | Telematik / soğuk zincir telemetri adaptörleri (`DemoDbTelematicsProvider`, `ExternalTelematicsProvider`). |
| `lib/logistics/providers/ecommerce-returns.ts` | E-ticaret RMA iade webhook adaptörleri (`DemoDbReturnWebhookProvider`, `ExternalWebhookReturnProvider`). |
| `lib/logistics/providers/object-storage.ts` | e-POD belge/fotoğraf/imza depolama adaptörleri (`LocalStorageProofProvider`, `ObjectStorageProofProvider`). |
| `lib/logistics/seed/framework.ts` | Ortam güvenlik kilitli (`isDemoEnvironment()`), çalışma öncesi yedek alan, idempotent ve tek komutla geri alınabilir (`rollback`) lojistik demo seed motoru (`assertLogisticsDemoSeedAllowed`, `readRawLocalDb`, `writeRawLocalDb`). |
| `lib/logistics/seed/faz1-tedarikci-rol-ve-kullanici.ts` | Kısıtlı `Tedarikçi` rolünü (`role-tedarikci`), demo tedarikçi kullanıcısını (`user-tedarikci-flora` / `tedarikci.royal` → `sup-holland-01`) ve şube-rol atamasını (`ubr-tedarikci-flora-1`) eklemeli olarak tohumlar. |
| `lib/logistics/seed/index.ts` | Lojistik seed modülleri kaydı ve toplu çalıştırma/geri alma giriş noktası (`runAllLogisticsDemoSeeds`, `rollbackAllLogisticsDemoSeeds`). |
| `scripts/seed-logistics-demo.ts` | `seed:logistics` ve `seed:logistics:rollback` CLI yürütücüsü. |
| `prisma/migrations/20261114153000_lojistik_altyapi_ve_tedarikci_rolu/migration.sql` | `User` tablosuna nullable `supplierId` kolonu ve indeks ekleyen additive migration SQL. |
| `prisma/migrations/20261114153000_lojistik_altyapi_ve_tedarikci_rolu/rollback.sql` | Eklenen indeksi ve `supplierId` kolonunu geri alan rollback SQL. |
| `scripts/test-lojistik-faz1-altyapi.ts` | 15 adımlı Faz 1 altyapı, sağlayıcı, RBAC, migration, seed, yedek tatbikatı, lisans ve mevcut akış karakterizasyon test paketi. |

### 1.2 Cerrahi Olarak Güncellenen Mevcut Dosyalar

| Dosya | Değişiklik Nedeni ve Kapsamı |
| --- | --- |
| `prisma/schema.prisma` | `User` modeline yalnızca `supplierId String?` ve `@@index([supplierId])` eklendi; mevcut sütun ve ilişkilere dokunulmadı. |
| `lib/config/production-feature-flags.ts` | Mevcut `isDemoEnvironment` yardımcı fonksiyonu dışa aktarıldı (`export`). |
| `lib/system-config.ts` | `SystemConfigData` tipine eklemeli olarak `logisticsFeatureFlags`, `branchLogisticsFeatureFlags` ve `logisticsProviders` ile sunucu okuyucusu `getServerLogisticsFeatureFlags` eklendi; üretim bayrakları değiştirilmedi. |
| `app/api/system-config/route.ts` | Yanıta `logisticsFeatureFlags`, `branchLogisticsFeatureFlags` ve `logisticsDemoMode: isDemoEnvironment()` alanları eklendi. |
| `app/dashboard/layout.tsx` | Sistem yapılandırmasından lojistik bayrakları okunup `isLogisticsFleetMenuVisible` ile henüz sayfası oluşturulmamış `"Lojistik & Filo"` kategorisinin erken/boş görünmesi engellendi; `Gauge` ikonu yerine `Truck` kullanıldı. |
| `lib/auth/types.ts` | İzin ve kullanıcı tip tanımlarına opsiyonel `supplierId` ve lojistik izin anahtarları eklendi. |
| `lib/auth/permissions.ts` | `Tedarikçi` rolü (`TEDARIKCI_ROLE_NAME`), 5 lojistik modülü (`lojistik_wms`, `lojistik_sevkiyat_rota`, `lojistik_tedarikci`, `lojistik_filo`, `lojistik_iade`) + `tedarikci_portali`, 5 aksiyon (`read`, `create`, `update`, `delete`, `approve` + Türkçe alias eşlemeleri) tanımlandı. |
| `lib/auth/context.tsx` | İstemci yetki yardımcıları Türkçe/İngilizce aksiyon ve yeni lojistik kaynaklarıyla uyumlu hale getirildi. |
| `lib/auth/server-permission.ts` | Sunucu tarafı yetki doğrulaması ve aksiyon normalizasyonu (`PRODUCTION_PERMISSION_ACTIONS` / `LOGISTICS_PERMISSION_ACTIONS`) genişletildi. |
| `app/dashboard/settings/roles/page.tsx` | Rol matrisi ekranına `stok`, `wms`, `satinalma`, `omnichannel`, 5 `lojistik_*` modülü, `tedarikci_portali` ve Türkçe aksiyon etiketleri (`Görüntüle`, `Oluştur`, `Düzenle`, `Sil`, `Onayla`) eklendi. |
| `lib/services/migrationStrategyService.ts` | `LOJISTIK_TABLE_PREFIX`, `validateLogisticsAdditiveMigrationSql` ve `validateAllLogisticsMigrations` eklendi; mevcut `Uretim*` doğrulayıcıları korundu. |
| `lib/db.ts` | (1) `SUNUM_DISABLE_CRON=1` ile CLI betiklerinde cron servisinin otomatik başlamasını kapatan koruma; (2) `lojistikTelemetryLog?: any[]` tipi; (3) `uretim*` ve `lojistik*` için `isLazyModuleCollection` okumaları; (4) `EROFS`/`EACCES`/`EPERM` (Vercel salt-okunur dosya sistemi) için `globalThis.__sunumEphemeralJsonDb` bellek katmanı; (5) `userBranchRole` ilişkisel zenginleştirmesi (`role`, `branch`, `user`); (6) `!process.env.DATABASE_URL` veya `isPrismaOfflineError` (`PrismaClientInitializationError`, `Environment variable not found: DATABASE_URL`, `P1001`–`P1003`, `ECONNREFUSED`, `ETIMEDOUT`, `ENOTFOUND`) durumlarında `.local-db.json` `ModelSimulate` ve `simulateQueryRawFallback` yönlendirmesi eklendi. |
| `package.json` / `package-lock.json` | 5 yönetim komutu (`seed:logistics`, `seed:logistics:rollback`, `db:backup`, `db:restore`, `db:drill`) ve ticari kullanıma uygun harita/barkod/QR paketleri eklendi. |
| `.gitignore` | `storage/backups/` ve `storage/logistics-pods/` yerel/üretilen klasörleri eklendi. |
| `storage/ajans-kutuphanesi/.local-db.json` | Mevcut 128 koleksiyon ve kayıtlar %100 korunarak Faz 1 demo tedarikçi rol/kullanıcı kayıtları (`role-tedarikci`, `user-tedarikci-flora`, `ubr-tedarikci-flora-1`) eklemeli olarak eklendi. |

---

## 2. Veritabanı Migration ve Rollback Tasarımı

* **Migration:** `prisma/migrations/20261114153000_lojistik_altyapi_ve_tedarikci_rolu/migration.sql`
  ```sql
  ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "supplierId" TEXT;
  CREATE INDEX IF NOT EXISTS "User_supplierId_idx" ON "User"("supplierId");
  ```
* **Rollback:** `prisma/migrations/20261114153000_lojistik_altyapi_ve_tedarikci_rolu/rollback.sql`
  ```sql
  DROP INDEX IF EXISTS "User_supplierId_idx";
  ALTER TABLE "User" DROP COLUMN IF EXISTS "supplierId";
  ```
* `validateAllLogisticsMigrations` ve `validateAllUretimMigrations` tüm lojistik ve üretim migration çiftlerini (1 Lojistik + 8 Üretim) yıkıcı SQL (`DROP COLUMN`, `RENAME COLUMN` vb.) içermeyecek şekilde doğrular.

---

## 3. Özellik Bayrakları ve Menü Görünürlüğü

* **5 Modül Bayrağı (`LOGISTICS_FEATURE_FLAG_KEYS`):**
  1. `lojistik_wms` (`FEATURE_LOJISTIK_WMS`)
  2. `lojistik_sevkiyat_rota` (`FEATURE_LOJISTIK_SEVKIYAT_ROTA`)
  3. `lojistik_tedarikci` (`FEATURE_LOJISTIK_TEDARIKCI`)
  4. `lojistik_filo` (`FEATURE_LOJISTIK_FILO`)
  5. `lojistik_iade` (`FEATURE_LOJISTIK_IADE`)
* **Çözümleme Önceliği:** Varsayılan `false` (gerçek müşteri kurulumlarında kapalı başlar) → sistem/şube geçersiz kılmaları → ortam değişkenleri → canlı demo modu (`isDemoEnvironment() === true` iken tümü otomatik `true`).
* **Müşteri Sunumu Kuralı:** Henüz UI rotası oluşturulmamış modüller (`IMPLEMENTED_LOGISTICS_FLEET_HREFS` boşken `"Lojistik & Filo"` kategorisi) sol menüde render edilmez; ekranlarda `"Özellik bayrağı kapalı/pasif"`, `"0 / 6"` veya `"yakında"` gibi geliştirici ifadeleri görünmez.

---

## 4. Güvenlik, 5 Aksiyonlu RBAC ve `"Tedarikçi"` Kapsamı

* **5 Standart Aksiyon (`LOGISTICS_PERMISSION_ACTIONS`):** `read` (`Görüntüle`), `create` (`Oluştur`), `update` (`Düzenle`), `delete` (`Sil`), `approve` (`Onayla`).
* **Kısıtlı `"Tedarikçi"` Rolü (`TEDARIKCI_ROLE_NAME`):**
  * Yalnızca `tedarikci_portali` modülünde yetkilidir; iç lojistik/filo/WMS modüllerine erişemez.
  * Sunucu tarafında `getLogisticsScopeContext`, `applySupplierScopeFilter`, `buildSupplierPrismaWhere` ve `assertSupplierRecordAccess` ile yalnızca kendi bağlı olduğu `supplierId` (`sup-holland-01` — Royal Flora Holland) kayıtlarını görür; aksi durumda `LogisticsDomainError` (`FORBIDDEN_SUPPLIER_SCOPE`) ile engellenir.
  * Demo giriş bilgileri (eklemeli seed): kullanıcı adı `tedarikci.royal`, şifre `demo123` (`user-tedarikci-flora` → `role-tedarikci` → `ubr-tedarikci-flora-1` / `local-debug-branch`).

---

## 5. Sağlayıcı Adaptör Mimarisi (Dış Sistem Bağımlılıksız)

Tüm harici entegrasyonlar `createLogisticsProviders()` üzerinden yapılandırma odaklı adaptörlerle ayrıştırılmıştır:

| Alan | Varsayılan Demo / Yerleşik Adaptör | Harici Üretim Adaptörü |
| --- | --- | --- |
| E-İrsaliye / E-Fatura (`efatura-irsaliye.ts`) | `DemoDbEDocumentProvider` | `GibIntegratorEDocumentProvider` |
| Rota Optimizasyonu (`routing.ts`) | `LocalKeyFreeRoutingProvider` (Haversine + En Yakın Komşu + 2-Opt, anahtarsız) | `ExternalRoutingProvider` |
| Araç Telematiği (`telematics.ts`) | `DemoDbTelematicsProvider` | `ExternalTelematicsProvider` |
| E-Ticaret İade Webhook (`ecommerce-returns.ts`) | `DemoDbReturnWebhookProvider` | `ExternalWebhookReturnProvider` |
| e-POD Belge Depolama (`object-storage.ts`) | `LocalStorageProofProvider` | `ObjectStorageProofProvider` |

---

## 6. Demo Seed, Yedekleme ve Vercel Salt-Okunur Dayanıklılığı

* **Komutlar (`package.json`):**
  * `npm run seed:logistics` — Ortam kilidini (`isDemoEnvironment()`) doğrular, başlangıç yedeği alır, eklemeli/idempotent tohumu çalıştırır.
  * `npm run seed:logistics:rollback` — Eklenen kayıtları tek komutla geri alır.
  * `npm run db:backup` / `npm run db:restore` / `npm run db:drill` — SHA-256 doğrulamalı yedekleme ve kurtarma tatbikatı (`storage/backups/` `.gitignore` ile hariç tutulur; başlangıç yedeği `bkp-20261114-154036-2303-cli-logistics-seed`).
* **Vercel Salt-Okunur ve `DATABASE_URL`-siz Çalışma (`lib/db.ts`):**
  * `DATABASE_URL` ortam değişkeni tanımlı olmadığında veya Prisma `PrismaClientInitializationError` / `P1001`–`P1003` / bağlantı hatası fırlattığında çağrılar doğrudan `.local-db.json` üzerindeki `ModelSimulate` katmanına yönlendirilir.
  * Vercel gibi salt-okunur dosya sistemlerinde (`EROFS` / `EACCES` / `EPERM`) demo yazma işlemleri hata fırlatmak yerine `globalThis.__sunumEphemeralJsonDb` oturum belleği katmanı üzerinden yürütülür.

---

## 7. Kurulu Paketler ve Ticari Lisans Kontrolü

| Paket | Sürüm | Lisans | Kullanım Amacı |
| --- | --- | --- | --- |
| `leaflet` | `1.9.4` | `BSD-2-Clause` | Harita ve rota görselleştirme |
| `@types/leaflet` | `1.9.22` | `MIT` | Leaflet TypeScript tanımları |
| `qrcode` | `1.5.4` | `MIT` | e-POD / etiket QR üretimi |
| `@types/qrcode` | `1.5.6` | `MIT` | QRCode TypeScript tanımları |
| `jsbarcode` | `3.12.3` | `MIT` | GS1/Code128 barkod SVG üretimi |
| `@zxing/browser` | `0.2.1` | `MIT` | Kamera tabanlı el terminali tarama |
| `@zxing/library` | `0.23.0` | `Apache-2.0` | ZXing çekirdek çözücü |

---

## 8. Doğrulama ve Test Kanıtları

Aşağıdaki tüm doğrulamalar son kod düzenlemesi sonrasında yeniden çalıştırılarak gözlemlenmiştir:

1. **Faz 1 Altyapı & Karakterizasyon Paketi** (`$env:SUNUM_DISABLE_CRON='1'; npx tsx scripts/test-lojistik-faz1-altyapi.ts`):
   * **Sonuç:** **15/15 adım başarılı (`exit code 0`)**, test sonrası veritabanı birebir önceki duruma döndürüldü (`SHA-256 eşleşmesi: EVET`).
   * **Kapsam:** `[PURE_TYPES]`, `[FEATURE_FLAGS]`, `[FEATURE_FLAGS_DEMO]`, `[PROVIDERS_ROUTING]` (4 durak 52.74 km), `[PROVIDERS_ADAPTERS]`, `[RBAC]`, `[MIGRATION]` (1 Lojistik + 8 Üretim çifti), `[SEED_FRAMEWORK]` (`DISABLE_DEMO_MODE=true` reddi, idempotency `3->0`, tek komut rollback), `[BACKUP_DRILL]` (128 koleksiyon, 1174 kayıt SHA-256 tatbikatı), 5 mevcut akış karakterizasyon testi (`CHAR_STOK`, `CHAR_WMS`, `CHAR_PROCUREMENT`, `CHAR_OMNICHANNEL`, `CHAR_QUALITY`) ve `[PACKAGE_SMOKE]`.
2. **Demo Veritabanı Sorgu & Bütünlük Doğrulaması** (`node scripts/test-demo-queries.js`):
   * **Sonuç:** **PASS (`exit code 0`)** — 49 çekirdek koleksiyon, 1068 kayıt, tüm ilişkisel bağlantılar doğrulandı. (`.local-db.json` genel toplamı 128 koleksiyondur.)
3. **TypeScript Kontrolü** (`npx tsc --noEmit`):
   * **Sonuç:** `TS_ERROR_COUNT=166` (Faz 0'daki mevcut 158 repo hatası + `next build` sonrası `.next/types/app/api/production/*.ts` altında üretilen 8 hata; Faz 1'de eklenen/güncellenen dosyalarda **0 yeni TS hatası**).
4. **Production Webpack Build (`VERCEL=1`)** (`next build --webpack`, Windows `!` karakterli kök yol nedeniyle geçici `subst Z:` sürücüsü üzerinden):
   * **Sonuç:** **PASS (`exit code 0`)**, 175/175 statik ve dinamik sayfa/API rotası derlendi (`⚠ Compiled with warnings`: önceden mevcut `@google/generative-ai` / `GoogleGenerativeAI` uyarısı). *(Not: Repo yolundaki `!` karakteri nedeniyle `next build --webpack` Windows'ta `!` içermeyen bir sanal sürücü/`subst` yolu veya Linux/Vercel ortamı gerektirir; build sonrası oluşan `next-env.d.ts` ve `tsconfig.tsbuildinfo` değişiklikleri çalışma ağacı temizliği için geri alınmıştır.)*
5. **Canlı Production Sunucu HTTP & API Duman Doğrulaması** (`VERCEL=1`, `SUNUM_DISABLE_CRON=1`, `npx next start -p 3020`):
   * `/`, `/dashboard`, `/dashboard/stok`, `/dashboard/wms`, `/dashboard/wms/mobil`, `/dashboard/satinalma`, `/dashboard/omnichannel`, `/dashboard/cargo`, `/dashboard/orders`, `/dashboard/finance`, `/dashboard/settings/roles`, `/dashboard/uretim/kalite` sayfalarının tamamı **HTTP 200** döndü; yanıt HTML'inde erken `"Lojistik & Filo"` menüsü veya `"Özellik bayrağı kapalı"` / `"0 / 6"` / `"yakında"` sızıntısı görülmedi (`leaks=0`).
   * `POST /api/auth/demo` (`200`), `POST /api/auth/login` (`tedarikci.royal` → `200`), `GET /api/system-config` (`200`, `logisticsDemoMode=true`), `GET /api/roles` (`200`, 7 rol, `hasTedarikci=true`), `GET /api/inventory`, `GET /api/wms`, `GET /api/procurement`, `GET /api/omnichannel`, `GET /api/cargo`, `GET /api/orders?branchId=local-debug-branch`, `GET /api/finance`, `GET /api/production/quality?type=dashboard` (**tümü HTTP 200**) ve sunucu günlüğünde `DEVRESILIENCE` JSON DB yönlendirmesi doğrulandı.
   * **Gözlemsel Not (Tarayıcı UI):** Otomatik tarayıcı alt ajanı (`browser`) Chrome uzaktan hata ayıklama portu açık olmadığı için (`Could not find DevToolsActivePort` / `chrome://inspect/#remote-debugging`) canlı Chrome penceresi açılıp istemci-tarafı konsol event'leri tarayıcı içinde yürütülemedi; sunucu tarafı SSR, kimlik doğrulama ve API doğrulaması yukarıdaki şekilde tamamlandı.
