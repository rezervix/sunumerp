# Sunum ERP — Turizm, Araç Kiralama, Konaklama ve B2B Partner Ekosistemi
## Faz 1: Ortak Altyapı, Özellik Bayrakları, RBAC, Çok Firmalı/Partner Veri İzolasyonu Zemini ve Demo Seed Çerçevesi

- **Faz**: Faz 1 (Ortak Altyapı ve Demo Zemini)
- **Dal (Branch)**: `feature/turizm-faz1-altyapi`
- **Dayanak**: Onaylı Faz 0 Keşif ve Eşleme Raporu (`docs/turizm/00-kesif-ve-esleme-tablosu.md`, Karar #1–#4 onaylı)

---

## 1. Yedekleme, Geri Dönüş (Backup / Restore) ve Additive Migration Prosedürü

### 1.1 Veritabanı ve Veri Dosyası Yedekleme & Geri Yükleme
Mevcut yedekleme servisi (`lib/services/dbBackupService.ts`) ve CLI aracı (`scripts/db-backup-restore.ts`) kullanılarak yerel JSON veritabanı (`storage/ajans-kutuphanesi/.local-db.json`) ve sistem yapılandırması (`storage/system_config.json`) SHA-256 bütünlük kontrolüyle yedeklenir ve geri yüklenir:

```bash
# 1. Anlık yedek alma (SHA-256 manifest ile storage/backups/ altına yazar)
npm run db:backup -- turizm-faz1-oncesi

# 2. Mevcut yedekleri listeleme
npm run db:backups

# 3. Belirli bir yedeğe bayt bayt geri dönme
npm run db:restore -- <backupId>

# 4. Canlı yedekleme + mutasyon + geri yükleme SHA-256 tatbikatı
npm run db:drill
```

**Tatbikat Kanıtı (`npm run db:drill`)**:
- Koleksiyon sayısı: `176`, Toplam kayıt sayısı: `1705`
- Başlangıç SHA-256: `5b59ea07205813232101b2091738e0948ee250d34335acbcaedfabde95b909bf` (`1,000,661` bayt)
- Mutasyon SHA-256: `32ed8ba0a896bdad45e0e513510bf072df973a7c319eb49f92f83b0a3038c323`
- Geri Dönüş SHA-256: `5b59ea07205813232101b2091738e0948ee250d34335acbcaedfabde95b909bf` (**%100 birebir eşleşme**)
- `storage/system_config.json` SHA-256: `9031A996602374AFEB6DCAB87B07B0161D1C0165AA94EDFE99F8CC088258991D` (`1,679` bayt, değişmedi)

### 1.2 Additive SQL Migration ve Rollback Adımları
Mevcut hiçbir tablo veya kolon silinmemiş, yeniden adlandırılmamış veya tipi değiştirilmemiştir:
- **İleri Migration**: `prisma/migrations/20261120163000_turizm_faz1_altyapi_ve_partner_zemini/migration.sql`
  - `User` tablosuna yalnızca nullable `partnerCompanyId TEXT` kolonu, indeksi ve `ON DELETE SET NULL` yabancı anahtarı eklendi.
  - 4 yeni temel tablo (`TurizmPartnerCompany`, `TurizmPartnership`, `TurizmSharedResource`, `TurizmCrossReservation`) eklendi.
- **Geri Alma (Rollback)**: `prisma/migrations/20261120163000_turizm_faz1_altyapi_ve_partner_zemini/rollback.sql`
  - Sırasıyla `TurizmCrossReservation`, `TurizmSharedResource`, `TurizmPartnership`, `User.partnerCompanyId` FK/indeks/kolon ve `TurizmPartnerCompany` tablosunu kaldırır.
- **Otomatik Doğrulama**: `lib/services/migrationStrategyService.ts` içerisine `validateTourismAdditiveMigrationSql()` ve `validateAllTourismMigrations()` eklendi; yıkıcı SQL ifadeleri (`DROP TABLE`, `DROP COLUMN`, `RENAME`, `ALTER COLUMN TYPE`, `TRUNCATE`) otomatik reddedilir.

---

## 2. Özellik Bayrakları, Sektör Paketleri ve Menü Görünürlüğü

### 2.1 4 Bağımsız Modül Bayrağı (`lib/config/tourism-feature-flags.ts`)
| Bayrak Anahtarı | Modül Başlığı | Menü Başlığı | Birincil Rota | Gerçek Kurulum Varsayılanı | Demo Ortamı (`isDemoEnvironment()`) |
|---|---|---|---|---|---|
| `turizm_rentacar` | Araç Kiralama (Rent-a-Car) | `Araç Kiralama` | `/dashboard/arac-kiralama` | `false` (KAPALI) | `true` (AÇIK) |
| `turizm_otel` | Otel Yönetimi (Mini PMS) | `Otel Yönetimi` | `/dashboard/otel` | `false` (KAPALI) | `true` (AÇIK) |
| `turizm_tur` | Tur Operatörlüğü | `Tur Operatörlüğü` | `/dashboard/tur` | `false` (KAPALI) | `true` (AÇIK) |
| `turizm_b2b` | B2B Partner Ağı | `Partner Ağı` | `/dashboard/partner-agi` | `false` (KAPALI) | `true` (AÇIK) |

- **Öncelik Sırası**:
  1. Ortam değişkeni (`FEATURE_TURIZM_RENTACAR`, `FEATURE_TURIZM_OTEL`, `FEATURE_TURIZM_TUR`, `FEATURE_TURIZM_B2B` veya toplu `FEATURE_TURIZM_ALL` / `NEXT_PUBLIC_FEATURE_TURIZM_*`)
  2. Şube/Firma bazlı `system_config.json -> tourismFeatureFlags.branchOverrides[branchId]`
  3. Global `system_config.json -> tourismFeatureFlags`
  4. Canlı Demo ortamı (`isDemoEnvironment() === true` ise `true`, gerçek kurulumda `false`)
- **5 Sektör Paketi Ön Tanımı (`TOURISM_SECTOR_PACKETS`)**:
  - `PAKET_RENTACAR_SOLO` (`turizm_rentacar`)
  - `PAKET_OTEL_SOLO` (`turizm_otel`)
  - `PAKET_TUR_OPERATORU` (`turizm_tur`)
  - `PAKET_RENTACAR_VE_B2B` (`turizm_rentacar` + `turizm_b2b`)
  - `PAKET_TAM_TURIZM_EKOSISTEMI` (4 modül birlikte)
- **Menü ve Katalog Kuralları**:
  - `IMPLEMENTED_TOURISM_HREFS` Faz 1'de boş dizi (`[]`) olarak tanımlıdır; böylece Faz 2–5 ekranları yazılıncaya kadar yan menüde kırık (`404`) link veya `"Özellik bayrağı kapalı"` / `"yakında"` / `"0 / 4"` gibi teknik ifadeler **asla görünmez**.
  - İlgili faz ekranı tamamlandığında rotası `IMPLEMENTED_TOURISM_HREFS` listesine eklenecek ve yalnızca bayrağı açık olan sektör başlığı (`"Araç Kiralama"`, `"Otel Yönetimi"`, `"Tur Operatörlüğü"`, `"Partner Ağı"`) yan menüde (`app/dashboard/layout.tsx`) belirecektir.
  - `app/api/modules/route.ts` mevcut `PRODUCTION_MODULES_CATALOG` ve `LOGISTICS_MODULES_CATALOG` kalıbını izleyerek etkin turizm modüllerini katalog yanıtına ekler. Yeni bir niş/katalog sistemi yazılmamış, mevcut yapı korunmuştur.

---

## 3. Yetki (RBAC) Matrisi ve Kısıtlı "Partner" Rolü

`lib/auth/types.ts`, `lib/auth/permissions.ts` ve `app/dashboard/settings/roles/page.tsx` dosyalarında 4 modül için 5 aksiyon (`read`/`Görüntüle`, `create`/`Oluştur`, `update`/`Düzenle`, `delete`/`Sil`, `approve`/`Onayla`) tanımlanmıştır:

| Rol | `turizm_rentacar` | `turizm_otel` | `turizm_tur` | `turizm_b2b` |
|---|---|---|---|---|
| `Super Admin` / `Yonetim Kurulu Uyesi` / `Genel Mudur` | Tüm izinler (`read, create, update, delete, approve`) | Tüm izinler | Tüm izinler | Tüm izinler |
| `Operations` / `Operasyon Muduru` | Tüm izinler | Tüm izinler | Tüm izinler | Tüm izinler |
| `Depo ve Lojistik Muduru` | `read, create, update, approve` | `read` | `read, create, update, approve` | `read, create, update` |
| `Satis ve Pazarlama Muduru` | `read, create, update` | `read, create, update` | `read, create, update` | `read, create, update` |
| `Finans ve Muhasebe Muduru` | `read, approve` | `read, approve` | `read, approve` | `read, approve` |
| `Sube Muduru` | `read, create, update, approve` | `read, create, update, approve` | `read, create, update, approve` | `read, create, update` |
| `Personel` | `read, create` | `read, create` | `read, create` | `read` |
| `Tedarikçi` (Lojistik Dış Rolü) | Yok (`[]`) | Yok (`[]`) | Yok (`[]`) | Yok (`[]`) |
| **`Partner` (`role-partner`)** | **Yok (`[]`)** | **Yok (`[]`)** | **Yok (`[]`)** | **`read, create, update`** (Yalnızca kendi firma kapsamı) |

---

## 4. Çok Firmalı (Kiracı / Partner) Veri İzolasyonu ve Mevcut API Denetim Raporu

### 4.1 Turizm & Partner Güvenlik Katmanı (`lib/tourism/security.ts`)
- **`getTourismScopeContext(user)`**: Oturumdaki kullanıcının rollerini ve `User.partnerCompanyId` bağını çözümler.
  - İç personel ve yöneticilerde `isPartnerScoped = false`, `effectiveCompanyId = "trzm-comp-main"` döner; mevcut tek-firma/çok-şube davranışı hiç değişmez.
  - `"Partner"` rolündeki veya `partnerCompanyId` atanmış kullanıcılarda `isPartnerScoped = true` döner.
- **Fail-Closed Korumalar**:
  - `Tedarikçi` rolündeki kullanıcılar turizm/partner uç noktalarına erişmeye çalışırsa `403 FORBIDDEN_SUPPLIER_SCOPE` ile reddedilir.
  - `"Partner"` rolünde olup `partnerCompanyId` bağı olmayan veya pasif (`SUSPENDED`/`INACTIVE`) firmaya bağlı kullanıcılar tüm liste sorgularında boş sonuç (`__UNBOUND_PARTNER_FAIL_CLOSED__`), tekil kayıt erişimlerinde `403 FORBIDDEN_PARTNER_SCOPE` alır.
  - `filterRecordsByCompanyScope()`, `buildCompanyScopedPrismaWhere()`, `assertCompanyRecordAccess()`, `filterPartnershipsByScope()`, `filterCrossReservationsByScope()`, `assertCrossReservationAccess()` fonksiyonları sunucu tarafında Firma A'nın Firma B'ye ait özel kayıtları görmesini veya değiştirmesini kesin olarak engeller.

### 4.2 Mevcut (Eski) API'lerdeki İzolasyon Durumu Raporu (Eski API Yetkilerine Dokunulmadı)
Faz 1 kuralı gereği mevcut API'lerin sözleşmelerine ve yetki mantığına dokunulmamış, ancak çok firmalı/partner kullanım açısından mevcut durum incelenerek aşağıda sade Türkçe ile raporlanmıştır:
1. **`/api/customers`, `/api/orders`, `/api/finance`, `/api/hr`**: Bu uç noktalar oturum (`requireAuth` / `getSessionUser`) ve RBAC modül izni kontrolü yapar. `"Partner"` rolüne `customers`, `orders`, `finance`, `hr` izinleri **verilmediği** için RBAC kontrolü olan uç noktalarda Partner rolü engellenir; ancak `GET /api/customers` gibi yalnızca `requireAuth()` çağırıp `checkPermission` çağırmayan eski uç noktalarda şube (`branchId`) filtresi bulunsa da firma (`partnerCompanyId`) filtresi yoktur.
2. **`/api/b2b/orders`, `/api/b2b/dealers`, `/api/b2b/credit-check`**: Mevcut B2B bayi sipariş uç noktaları oturum kontrolü olmadan doğrudan `prisma.order` / `prisma.customer` sorgulamaktadır (mevcut iç bayi ekranı tasarımı). Turizm B2B Partner Ağı bu uç noktaları kullanmayacak, Faz 5'te kendi `requireTourismAccess("turizm_b2b", ...)` korumalı servis ve API'lerini kullanacaktır.
3. **`/api/calendar/events`**: Oturum açmış kullanıcılar için tüm `appointment` ve `reminder` kayıtlarını döndürür; kullanıcı veya firma bazlı kapsam filtresi içermez.
4. **`/api/auth/demo`**: Yalnızca `isDemoEnvironment() === true` iken çalışan hızlı demo giriş uç noktasıdır; gerçek kurulumda (`DISABLE_DEMO_MODE=true`) devre dışıdır.

---

## 5. Demo Seed Çerçevesi, Vercel Doğrulaması ve Kurgusal Partner Firmalar

### 5.1 Seed Çerçevesi ve Komutlar
`lib/logistics/seed/framework.ts` ortak seed motoru genişletilerek `runTourismSeedModules()` ve `rollbackTourismSeedModules()` eklenmiş; `scripts/seed-demo-database.js` dosyasına **hiç dokunulmamıştır**:
- **Ortam Kilidi**: `DISABLE_DEMO_MODE=true` (gerçek müşteri ortamı) iken `LogisticsSeedEnvironmentError` fırlatarak çalışmayı reddeder.
- **Otomatik Yedek ve Bütünlük**: Seed öncesi yedek alır ve mevcut tüm koleksiyonların kayıtlarının korunduğunu (`preExistingIntegrityIntact: true`) doğrular.
- **İdempotent & Tek Komut Rollback**:
  - `npm run seed:tourism` (veya `npx tsx scripts/seed-tourism-demo.ts seed`)
  - `npm run seed:tourism:rollback` (veya `npx tsx scripts/seed-tourism-demo.ts rollback`)
- **Vercel / Serverless Paketleme Doğrulaması**: `next.config.js` içerisindeki `experimental.outputFileTracingIncludes` ayarı `./storage/ajans-kutuphanesi/.local-db.json` ve `./storage/system_config.json` dosyalarını tüm `app/api/**/*` fonksiyonlarına dahil etmektedir; yeni koleksiyonlar aynı `.local-db.json` içinde tutulduğundan Vercel serverless ortamında ek dosya yolu gerektirmez.

### 5.2 Faz 1 Kurgusal Demo Firmaları ve Kısıtlı Kullanıcıları (`turizm_faz1_partner_firmalar_ve_kullanicilar`)
| Firma ID | Kod | Kurgusal Firma Adı | Tip (`companyType`) | Şehir / İlçe | Kısıtlı Demo Kullanıcısı (`şifre: demo123`) | Rolü |
|---|---|---|---|---|---|---|
| `trzm-comp-main` | `ANA-000` | Sunum ERP Merkez Operasyon (Örnek Ana Firma) | `MAIN_OPERATOR` | İstanbul / Beşiktaş | *(Mevcut iç personel hesapları)* | İç Roller |
| `trzm-comp-rentacar-01` | `PRT-RNT-01` | Örnek Ege Rota Araç Kiralama A.Ş. | `RENTACAR` | İzmir / Alsancak | `partner.egerota` (`trzm-user-egerota`) | `Partner` (`role-partner`) |
| `trzm-comp-tur-02` | `PRT-TUR-02` | Örnek Anadolu Keşif Turizm Ltd. | `TOUR_OPERATOR` | İstanbul / Şişli | `partner.anadolukesif` (`trzm-user-anadolukesif`) | `Partner` (`role-partner`) |
| `trzm-comp-otel-03` | `PRT-OTL-03` | Örnek Kıyı Konaklama & Butik Otel A.Ş. | `HOTEL` | Muğla / Bodrum | `partner.kiyiotel` (`trzm-user-kiyiotel`) | `Partner` (`role-partner`) |
| `trzm-comp-transfer-04` | `PRT-TRF-04` | Örnek Marmara VIP Transfer & Ortak Filo Ltd. | `TRANSFER` | İstanbul / Ataşehir | `partner.marmaratransfer` (`trzm-user-marmaratransfer`) | `Partner` (`role-partner`) |

**Kurgusal Partnerlik İskelet Kayıtları (`turizmPartnership` — 6 Kayıt)**:
- `trzm-ps-01` (`PRT-BAG-001`): `trzm-comp-main` ↔ `trzm-comp-rentacar-01` — **`APPROVED`** (%12 komisyon, 15 gün vade)
- `trzm-ps-02` (`PRT-BAG-002`): `trzm-comp-main` ↔ `trzm-comp-tur-02` — **`APPROVED`** (%15 komisyon, 15 gün vade)
- `trzm-ps-03` (`PRT-BAG-003`): `trzm-comp-main` ↔ `trzm-comp-otel-03` — **`APPROVED`** (%10 komisyon, 30 gün vade)
- `trzm-ps-04` (`PRT-BAG-004`): `trzm-comp-tur-02` ↔ `trzm-comp-transfer-04` — **`APPROVED`** (%10 komisyon, 15 gün vade)
- `trzm-ps-05` (`PRT-BAG-005`): `trzm-comp-rentacar-01` → `trzm-comp-otel-03` — **`PENDING`** (%11 komisyon, 15 gün vade)
- `trzm-ps-06` (`PRT-BAG-006`): `trzm-comp-transfer-04` → `trzm-comp-rentacar-01` — **`REJECTED`** (%18 komisyon, 45 gün vade)

---

## 6. Eklenen ve Değiştirilen Dosyalar Özeti

### 6.1 Yeni Eklenen Dosyalar
1. `lib/tourism/types.ts`: İstemci-güvenli (saf) turizm özellik bayrağı, sektör paketi, partner firma, partnerlik, ortak kaynak havuzu ve çok firmalı kapsam tipleri.
2. `lib/tourism/constants.ts`: İstemci-güvenli sabitler, Türkçe etiketler, izin aksiyon etiketleri ve `MAIN_COMPANY_ID` / `PARTNER_ROLE_NAME`.
3. `lib/config/tourism-feature-flags.ts`: 4 turizm özellik bayrağı (`turizm_rentacar`, `turizm_otel`, `turizm_tur`, `turizm_b2b`), 5 sektör paketi, ortam/şube/demo çözümleyicisi ve menü görünürlük yardımcıları.
4. `lib/tourism/security.ts`: Sunucu tarafı özellik bayrağı kontrolü, RBAC + çok firmalı (kiracı/partner) kapsam çözümleyici (`getTourismScopeContext`), fail-closed firma filtreleri ve denetim logu (`logTourismAudit`).
5. `lib/tourism/index.ts`: Saf tip ve sabitlerin merkezi dışa aktarımı.
6. `lib/tourism/seed/faz1-partner-firmalar-ve-kullanicilar.ts`: Faz 1 idempotent demo seed modülü (`role-partner`, 5 firma, 4 kullanıcı, 4 şube-rol, 6 partnerlik).
7. `lib/tourism/seed/index.ts`: Turizm seed modül kayıt defteri ve çalıştırma/geri alma sarmalayıcıları.
8. `scripts/seed-tourism-demo.ts`: `npm run seed:tourism` ve `npm run seed:tourism:rollback` CLI aracı.
9. `prisma/migrations/20261120163000_turizm_faz1_altyapi_ve_partner_zemini/migration.sql` & `rollback.sql`: Additive SQL migration ve tam geri alma betiği.
10. `scripts/test-turizm-faz1-altyapi.ts`: 14 adımlı Faz 1 birim, özellik bayrağı, RBAC, additive migration, yedekleme tatbikatı, seed yaşam döngüsü, çok firmalı izolasyon ve mevcut akış karakterizasyon testi.
11. `docs/turizm/01-altyapi-ve-demo-zemini.md`: Bu faz raporu.

### 6.2 Cerrahi Olarak Güncellenen Mevcut Dosyalar
1. `lib/system-config.ts`: `SystemConfig` tipine `tourismFeatureFlags` ve `getServerTourismFeatureFlags()` / `updateServerTourismFeatureFlags()` eklendi.
2. `app/api/system-config/route.ts`: `GET` yanıtına `resolvedTourismFeatureFlags` ve `tourismDemoMode`; `PUT` gövdesine `tourismFeatureFlags` desteği eklendi.
3. `app/api/modules/route.ts`: Etkin turizm modüllerinin mevcut katalog yapısıyla döndürülmesi sağlandı.
4. `app/dashboard/layout.tsx`: Yan menüye bayrak + tamamlanmış rota (`IMPLEMENTED_TOURISM_HREFS`) kontrollü 4 sektör kategorisi (`Araç Kiralama`, `Otel Yönetimi`, `Tur Operatörlüğü`, `Partner Ağı`) bağlandı.
5. `lib/auth/types.ts`, `lib/auth/permissions.ts`, `app/dashboard/settings/roles/page.tsx`: 4 turizm izin kaynağı, rol varsayılanları, kısıtlı `"Partner"` rolü ve Rol/Yetki matrisi UI etiketleri eklendi.
6. `prisma/schema.prisma` & `lib/db.ts`: `User.partnerCompanyId` alanı ve 4 yeni model (`TurizmPartnerCompany`, `TurizmPartnership`, `TurizmSharedResource`, `TurizmCrossReservation`) ile JSON DB ilişkisel çözümleyicisi eklendi.
7. `lib/services/migrationStrategyService.ts`: Turizm additive migration doğrulayıcısı eklendi.
8. `lib/logistics/seed/framework.ts` & `package.json`: Turizm seed/rollback fonksiyonları ve `seed:tourism` / `seed:tourism:rollback` script'leri eklendi.
9. `storage/ajans-kutuphanesi/.local-db.json`: Faz 1 kurgusal demo partner firmaları, kullanıcıları ve partnerlik iskeletleri additive olarak işlendi (`SHA-256: 8DBB986F8F7D88B2F0037ACF7D11667A4ADCF549475496501D6D456CFB5E06CA`).

---

## 7. Test Sonuçları ve Kabul Kriterleri Doğrulaması

| # | Kabul Kriteri | Durum | Kanıt / Gözlenen Sonuç |
|---|---|---|---|
| 1 | Veritabanı ve veri dosyası yedekleme + geri dönüş prosedürü yazılıp test edildi | ✅ | `npm run db:drill`: 176 koleksiyon, 1705 kayıt, başlangıç ve geri dönüş SHA-256 (`5b59ea07...`) %100 birebir eşleşti |
| 2 | 4 turizm özellik bayrağı gerçek kurulumda `false`, DEMO ortamında `true`; kapalı/ekransız modül menüde gizli | ✅ | `FEATURE_FLAGS_DEFAULT_OFF`, `FEATURE_FLAGS_INDEPENDENCE`, `FEATURE_FLAGS_DEMO_AND_MENU` testleri geçti |
| 3 | Her bayrak tek tek açılıp kapandığında diğer turizm, lojistik ve üretim modülleri etkilenmiyor | ✅ | 4 modül + 5 sektör paketi + şube/ENV override kombinasyonları doğrulandı |
| 4 | RBAC izin kodları (`read/create/update/delete/approve` + Türkçe alias) ve kısıtlı `"Partner"` rolü tanımlı | ✅ | `RBAC_MATRIX` testi: 4 modül x 5 aksiyon ve Partner rol izolasyonu doğrulandı |
| 5 | Çok firmalı/partner veri izolasyonu: Firma A, Firma B'nin özel verisini göremez; iç personel davranışı bozulmaz | ✅ | `MULTI_COMPANY_ISOLATION` testi: Firma A/B/C/D çapraz izolasyon, fail-closed bağsız partner ve iç personel uyumu doğrulandı |
| 6 | Demo seed gerçek ortamda (`DISABLE_DEMO_MODE=true`) kilitli, idempotent ve tek komutla geri alınabilir | ✅ | `SEED_LOCK_AND_LIFECYCLE` + `seed-tourism-demo.ts`: 1. çalıştırma 20 kayıt ekledi, 2. çalıştırma 0 kayıt ekledi (`atlandı=20`), rollback tam temizledi |
| 7 | En az 4 kurgusal partner firma (`RENTACAR`, `TOUR_OPERATOR`, `HOTEL`, `TRANSFER`), kısıtlı kullanıcıları ve partnerlik iskeletleri eklendi | ✅ | `.local-db.json` içine 5 firma (1 ana + 4 partner), 4 kısıtlı kullanıcı (`role-partner`) ve 6 partnerlik (`APPROVED`/`PENDING`/`REJECTED`) işlendi |
| 8 | Mevcut kritik akışlar (Müşteri/Cari, Finans, E-Belge, Filo, Sevkiyat) karakterizasyon testleriyle sabitlendi | ✅ | `CHAR_CUSTOMER` (12 cari), `CHAR_FINANCE` (33 hareket), `CHAR_EDOC` (8 e-belge), `CHAR_FLEET` (18 araç, 15 KVKK maskeli şoför), `CHAR_DISPATCH` (5 sefer, 41.2 km CVRPTW) geçti |
| 9 | Mevcut Lojistik Faz 1 ve Demo Veritabanı doğrulama paketleri %100 geçmeye devam ediyor | ✅ | `node scripts/test-demo-queries.js` (49 koleksiyon, 1101 kayıt) ve `npx tsx scripts/test-lojistik-faz1-altyapi.ts` (`15/15`) başarılı |
