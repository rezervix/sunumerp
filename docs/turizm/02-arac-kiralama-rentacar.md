# Sunum ERP — Turizm Faz 2: Araç Kiralama (Rent-a-Car) — `turizm_rentacar`

- **Faz**: Faz 2 (Araç Kiralama / Rent-a-Car Modülü)
- **Özellik Bayrağı**: `turizm_rentacar` (Gerçek kurulumda varsayılan `false`, DEMO ortamında `true`; Lojistik Filo'dan ve diğer turizm modüllerinden tam bağımsız)
- **Dal (Branch)**: `feature/turizm-faz2-rentacar`
- **Dayanak**: Onaylı Faz 0 Keşif ve Eşleme Raporu (`docs/turizm/00-kesif-ve-esleme-tablosu.md`) ve Faz 1 Ortak Altyapı Raporu (`docs/turizm/01-altyapi-ve-demo-zemini.md`)

---

## 1. Yeniden Kullanılan Mevcut Altyapılar (Kopya Kurulmadı)

| Mevcut Altyapı | Kullanım Şekli |
|---|---|
| **Lojistik Filo (`LojistikVehicle`, `LojistikDriver`, `LojistikVehicleMaintenanceWorkOrder`, `LojistikFuelLog`, `LojistikVehicleDocument`, `LojistikVehicleLease`, `LojistikTrafficPenalty`)** | İkinci araç/şoför/bakım/ceza sistemi kurulmadı. Mevcut Filo araçları (`34 SNR 118` Crafter Minibüs, `34 SNR 205` Toyota Corolla Hybrid, `34 SNR 209` Renault Megane Sedan, `34 SNR 990` Honda Civic) ve şoförleri (`f5-drv-11` Mehmet Koç) doğrudan kiralama havuzuna bağlandı; 13 ek kurgusal kiralama aracı (`trzm-rnt-veh-01`..`13`, biri `MAINTENANCE` durumunda) aynı `LojistikVehicle` tablosuna additive olarak eklendi. Araç teslim alındığında `LojistikVehicle.status = "IN_TRANSIT"` & `rentalStatus = "RENTED"`, iade alındığında `status = "ACTIVE"` & `rentalStatus = "AVAILABLE"` olarak senkronize edilir. Filo TCO giderleri araç başı kârlılık raporuna doğrudan yansır. |
| **Müşteri / CRM (`Customer`)** | Kiracı ve sürücüler mevcut `Customer` tablosuna additive nullable alanlarla (`tckn`, `passportNo`, `nationality`, `birthDate`, `driverLicenseNo`, `driverLicenseClass`, `driverLicenseIssuedAt`, `driverLicenseExpiresAt`, `isBlacklisted`, `blacklistReason`) bağlandı. Sunucu tarafında KVKK maskeleme (`applyCustomerKvkkMasking`) ve açık görüntülemede denetim logu (`KVKK_PII_REVEALED` / `KVKK_PII_DENIED`) uygulanır; kimlik fotokopisi saklanmaz. |
| **Finans & E-Belge (`Finance`, `EDocumentRecord`, `DemoDbEDocumentProvider`)** | Kiralama bedeli, ek ücretler (km aşımı, yakıt farkı, gecikme, hasar) ve müşteriye yansıtılan HGS/trafik cezaları `Finance` (`INCOME`, `vehicleId` bağlantılı) ve `EDocumentRecord` (`E_FATURA`/`E_ARSIV`) olarak işlenir. Faturalama zamanlaması (`ON_CONTRACT_APPROVAL`, `ON_RETURN_COMPLETION`, `MANUAL`) ayarlanabilir. |
| **Bildirim Altyapısı (`createNotificationMany` / `Notification`)** | Yaklaşan teslim/iade, geciken araç iadesi, bakım/belge çakışması ve bekleyen depozito iadesi uyarıları mevcut `Notification` tablosuna idempotent olarak gönderilir. |
| **Dosya / Fotoğraf Yükleme & Rapor Dışa Aktarma (`/api/upload`, `xlsx`, `jspdf`)** | Teslim/iade hasar fotoğrafları mevcut `/api/upload` ve `public/uploads/pod-demo/` depolamasını, Excel/PDF raporları mevcut `exportReports.ts` motorunu kullanır; yeni UI/PDF/imza kütüphanesi eklenmedi. |

---

## 2. Additive SQL Migration, Rollback ve Demo Seed Komutları

### 2.1 SQL Migration & Rollback
- **İleri Migration**: `prisma/migrations/20261121120000_turizm_faz2_rentacar/migration.sql`
  - Mevcut `Customer`, `LojistikVehicle` ve `LojistikTrafficPenalty` tablolarına yalnızca additive nullable kolonlar ve indeksler eklendi (kolon silme/yeniden adlandırma/tip değiştirme YOK).
  - 11 yeni tablo eklendi: `TurizmRentVehicleClass`, `TurizmRentTariff`, `TurizmRentExtraService`, `TurizmRentPolicyConfig`, `TurizmRentReservation`, `TurizmRentConflictAttemptLog`, `TurizmRentContract`, `TurizmRentInspectionForm`, `TurizmRentDepositAndCharge`, `TurizmRentTollPassLog`, `TurizmRentKabisRecord`.
- **Geri Alma (Rollback)**: `prisma/migrations/20261121120000_turizm_faz2_rentacar/rollback.sql`
  - Tüm yeni tabloları ve additive kolonları temiz biçimde geri alır (`validateAllTourismMigrations()` ile otomatik doğrulandı).

### 2.2 Demo Seed Modülü & Komutları (`turizm_faz2_arac_kiralama`)
- **Dosya**: `lib/tourism/seed/faz2-arac-kiralama.ts` (Kayıtlı: `lib/tourism/seed/index.ts`, `scripts/seed-demo-database.js` dosyasına dokunulmadı).
- **Komutlar**:
  ```bash
  # Seed uygula (DISABLE_DEMO_MODE=true iken güvenlik kilidi çalışır, idempotenttir)
  npm run seed:tourism

  # Tek komutla geri al (yalnızca trzm-* kayıtlarını temizler, mevcut veriye dokunmaz)
  npm run seed:tourism:rollback
  ```
- **Eklenen Demo Envanteri (138 additive kayıt)**:
  - **6 Araç Sınıfı**: Ekonomik Şehir (`SNF-EKO`), Kompakt (`SNF-KOM`), Konfor & Hibrit Sedan (`SNF-SED`), SUV & 4x4 (`SNF-SUV`), VIP Executive (`SNF-VIP`), Minibüs & Grup (`SNF-MIN`).
  - **8 Fiyat Tarifesi** (Standart, Yüksek Sezon, Kış Kampanyası, Kurumsal; günlük/haftalık/aylık kademeli) ve **6 Ek Hizmet**.
  - **17 Kiralama Aracı** (13 yeni `trzm-rnt-veh-01`..`13` + 4 mevcut Filo binek/minibüs aracı; `34 RNT 913` bakımda + aktif bakım iş emri `BKM-RNT-2026-0913`; `35 EGR 112` partner firma `Örnek Ege Rota Araç Kiralama A.Ş.` kapsamında).
  - **26 Yeni Kurgusal Kiracı Müşteri** (mevcut 12 kurumsal müşteriyle toplam 38 müşteri; 1 kara liste ve 1 genç sürücü örnek kaydı dahil).
  - **18 Rezervasyon** (Mayıs 2026–Kasım 2026 6 aylık geçmiş + Kasım 2026 aktif/geciken/uzatılmış/şoförlü + Ocak 2027'ye kadar 60 günlük gelecek rezervasyonlar; `COMPLETED`, `ACTIVE`, `CONFIRMED`, `PENDING`, `CANCELLED`, `NO_SHOW`).
  - **12 Kiralama Sözleşmesi**, **8 Teslim/İade Ekspertiz Formu** (hasar fotoğraflı: `rentacar-hasar-on-tampon.svg`, `rentacar-hasar-sag-kapi.svg`, `rentacar-teslim-ekspertiz.svg`), **10 Depozito & Ek Ücret Kaydı**, **7 Gelir (`Finance`) Kaydı**, **6 HGS Geçişi**, **3 Trafik Cezası**, **6 KABİS Hazırlık Kaydı** (`HAZIRLANDI`, `GONDERILDI_MANUEL`, `HATALI`), **3 Reddedilmiş Çakışma Girişimi Kaydı**.

---

## 3. Eklenen ve Cerrahi Olarak Değiştirilen Dosyalar

### 3.1 Yeni Eklenen Dosyalar
1. `prisma/migrations/20261121120000_turizm_faz2_rentacar/migration.sql` & `rollback.sql`
2. `lib/tourism/rentacar/constantsAndHelpers.ts`: İstemci-güvenli (saf) sabitler, KVKK müşteri maskeleme, yaş/ehliyet uygunluk kontrolü, fiyat hesaplama motoru, teslim/iade karşılaştırma ve fark hesabı, Gantt müsaitlik matrisi.
3. `lib/tourism/rentacar/providers.ts`: KABİS hazırlık/dışa aktarma (`LocalKabisPreparationAdapter`) ve HGS CSV içe aktarma (`LocalHgsTollImportAdapter`) sağlayıcı adaptörleri (resmî kurumlara gerçek bağlantı denemez).
4. `lib/tourism/rentacar/rentACarCoreService.ts`: Sınıf/tarife/ek hizmet/politika yönetimi, Gantt müsaitlik, KVKK müşteri yönetimi, sunucu tarafı per-vehicle atomik mutex kilitli rezervasyon (`withVehicleReservationLock`), süre uzatma, araç değiştirme, sözleşme üretimi & dijital imza.
5. `lib/tourism/rentacar/rentACarOpsFinanceAndReportsService.ts`: Teslim/iade ekspertiz formları, Filo durum senkronu, depozito/ek ücret -> `Finance`/`EDocumentRecord`, HGS/Filo trafik cezası otomatik plaka+tarih eşleştirme & müşteriye yansıtma, KABİS paket dışa aktarma, Filo TCO entegre kârlılık analitiği (XLSX/PDF), bildirim tarayıcısı.
6. `lib/tourism/rentacar/index.ts`
7. `lib/tourism/seed/faz2-arac-kiralama.ts`
8. `app/api/arac-kiralama/route.ts`: RBAC + özellik bayrağı + çok firmalı kapsam + demo perspektif korumalı ana API uç noktası.
9. `app/dashboard/arac-kiralama/page.tsx`, `app/dashboard/arac-kiralama/teslim-iade/page.tsx` ve `app/dashboard/arac-kiralama/components/{RentGanttAndReservationsTabs,RentHandoverAndChargesTabs,RentClassesKabisAndReportsTabs}.tsx`
10. `public/uploads/pod-demo/rentacar-{teslim-ekspertiz,hasar-on-tampon,hasar-sag-kapi}.svg`
11. `scripts/test-turizm-faz2-rentacar.ts`
12. `docs/turizm/02-arac-kiralama-rentacar.md`

### 3.2 Cerrahi Olarak Değiştirilen Mevcut Dosyalar
1. `prisma/schema.prisma` & `lib/db.ts`: Additive `TurizmRent*` modelleri ve `Customer`/`LojistikVehicle`/`LojistikTrafficPenalty` nullable genişletme alanları ile yerel JSON DB ilişkileri eklendi.
2. `lib/config/tourism-feature-flags.ts` & `app/dashboard/layout.tsx`: `IMPLEMENTED_TOURISM_HREFS` listesine `"/dashboard/arac-kiralama"` eklendi; yan menüde `"Araç Kiralama"` altına `"Araç Kiralama Yönetimi"` ve `"Mobil Teslim & İade Formu"` eklendi.
3. `lib/tourism/seed/index.ts`: `faz2RentACarSeedModule` turizm seed kayıt defterine bağlandı.
4. `scripts/test-turizm-faz1-altyapi.ts`: Additive araç ve tamamlanmış rota beyaz listesi kontrolleri Faz 2 uyumlu hale getirildi.
5. `storage/ajans-kutuphanesi/.local-db.json`: Faz 2 demo seed kayıtları additive olarak işlendi (`SHA-256: E2BA0C37FBA4184772AE2FCA2D19F1ECAB16B79F219D4EC9C55EF48689A31859`).

---

## 4. Doğrulama Kanıtları ve Kabul Kriterleri

| # | Kabul Kriteri | Durum | Kanıt / Gözlenen Sonuç |
|---|---|---|---|
| 1 | Eşzamanlı çift rezervasyon testi (`Promise.all`) & bakımda araç engeli | ✅ | `CONCURRENT_DOUBLE_BOOKING_LOCK`: Aynı araç/tarih için eşzamanlı 2 istekten tam 1'i kabul, 1'i HTTP `409 DOUBLE_BOOKING_LOCKED` ile reddedildi ve `TurizmRentConflictAttemptLog` yazıldı. Bakımdaki `34 RNT 913` `409 VEHICLE_IN_MAINTENANCE` ile engellendi. Kara liste ve yaş/ehliyet kuralları reddetti. |
| 2 | Rezervasyon → Uzatma/Araç Değişimi → Sözleşme → Teslim → İade → Ek Ücret → Cari/Fatura uçtan uca testi | ✅ | `E2E_RENTAL_LIFECYCLE_AND_FLEET_SYNC`: Sözleşme (`SZL-2026-*`), dijital imza, teslim/iade karşılaştırması (200 km aşım + %20 yakıt farkı + 3 saat geç iade + 1.800 TRY hasar = 5.200 TRY), otomatik `Finance` gelir kaydı ve `EDocumentRecord` (`FTR2026*`) doğrulandı. |
| 3 | Filo bakım/durum tutarlılığı | ✅ | Teslimde `LojistikVehicle` `status="IN_TRANSIT"` & `rentalStatus="RENTED"`, iade sonrası `status="ACTIVE"` & `rentalStatus="AVAILABLE"` ve güncel kilometre (`43700 km`) doğrulandı. |
| 4 | HGS/Ceza otomatik plaka+tarih eşleştirme, KABİS hazırlık/dışa aktarma, XLSX/PDF raporlar ve bildirimler | ✅ | `HGS_PENALTY_KABIS_REPORTS_AND_ALERTS`: CSV HGS içe aktarma & eşleştirme, `trzm-rnt-pen-02` ceza & `trzm-rnt-hgs-02` HGS müşteriye yansıtma, KABİS CSV (8 kayıt), XLSX (`23,042 B`, `PK`), PDF (`17,733 B`, `%PDF`) ve geciken iade/yaklaşan teslim bildirimleri doğrulandı. |
| 5 | Bayrak ve modül bağımsızlığı (`turizm_rentacar` x `lojistik_filo` açık/kapalı kombinasyonları) | ✅ | `MODULE_INDEPENDENCE_COMBINATIONS`: 4 kombinasyon ve Partner firma izolasyonu (`Örnek Ege Rota`: yalnızca kendi 1 aracı ve 1 rezervasyonu) geçti. |
| 6 | TypeScript (`tsc --noEmit`) & Prisma doğrulaması | ✅ | `npx prisma validate` ve `npx prisma generate` başarılı; Faz 2 dosyalarında **0 TypeScript hatası** (toplam eski hata sayısı Faz 0'daki 170'ten 163'e düştü). |
| 7 | Canlı Turbopack sunucusu (`http://localhost:3035`) HTTP & API doğrulaması | ✅ | `/dashboard/arac-kiralama`, `/dashboard/arac-kiralama/teslim-iade`, `/dashboard/filo`, `/dashboard/sevkiyat`, `/dashboard/wms`, `/dashboard/satinalma`, `/dashboard/omnichannel`, `/dashboard/customers`, `/dashboard/finance`, `/dashboard/settings/roles`, `/dashboard` — tamamı HTTP `200`, `NEXT_ERROR: false`, yasaklı metin yok; `/api/arac-kiralama` tam veri (17 araç, 38 müşteri, 18 rezervasyon, 12 sözleşme, 8 ekspertiz, 10 depozito/ücret, 6 HGS, 4 ceza, 6 KABİS, 3 çakışma, 2 firma perspektifi) ve XLSX/PDF 200 döndü. |
| 8 | Mevcut tüm Lojistik, Filo, Sevkiyat, E2E ve Turizm Faz 1 regresyon testleri | ✅ | `test-turizm-faz2-rentacar.ts` (`7/7`), `test-turizm-faz1-altyapi.ts` (`14/14`), `test-lojistik-faz5-filo.ts` (`10/10`), `test-lojistik-faz6-sevkiyat.ts` (`11/11`), `test-lojistik-faz7-e2e-ve-butunluk.ts` (`10/10`), `test-lojistik-faz8-yayin-guvenlik-perf.ts` (`7/7`), `test-demo-queries.js` (49 koleksiyon, 1134 kayıt) tamamı geçti. |

---

## 5. Açık Kalan Riskler, Dış Bağımlılıklar ve Elle Tarayıcı Kontrol Listesi

1. **Gerçek Tarayıcı Otomasyonu Notu**: Chrome uzak hata ayıklama portu (`DevToolsActivePort`) bu oturumda açık olmadığından görsel ekranlar gerçek Chrome penceresinde otomatik açılamamış, yerine canlı Turbopack sunucusu (`http://localhost:3035`) üzerinden tüm SSR HTML ve kimlik doğrulamalı API uçları doğrulanmıştır. Görsel kontrol için şu iki adresi tarayıcınızdan inceleyebilirsiniz:
   - `http://localhost:3000/dashboard/arac-kiralama` (Müsaitlik Gantt, Rezervasyon/Sözleşme imza alanı, Teslim/İade karşılaştırma, HGS/Ceza yansıtma, KABİS, TCO Kârlılık ve Demo Firma Perspektifi geçişi)
   - `http://localhost:3000/dashboard/arac-kiralama/teslim-iade` (Mobil uyumlu teslim/iade ekspertiz formu)
2. **Resmî Kurum Erişimi (KABİS, HGS/OGS, Trafik Cezası)**: Faz 0 araştırmasında belgelendiği üzere bu kurumların kamuya açık genel REST/SOAP API dokümanı bulunmadığından gerçek bağlantı kurulmamış; **hazırlık/dışa aktarma + CSV içe aktarma + adaptör arayüzü** teslim edilmiştir. Kurumsal sabit IP / banka HGS API sözleşmesi sağlandığında yalnızca adaptör yapılandırması gerekir.
3. **Sözleşme Şablon Metni**: Sistemdeki varsayılan metin açıkça `[ÖRNEK ŞABLON — HUKUKİ İNCELEME GEREKTİRİR]` olarak işaretlenmiştir; canlı kullanıma geçmeden önce şirket hukuk müşavirliği tarafından düzenlenip `"Sınıflar, Tarifeler & Şablon"` sekmesinden kaydedilmelidir.
4. **Önceden Mevcut Build Kısıtları**: Proje klasör yolundaki `!` karakteri nedeniyle Webpack `next build --webpack` engeli ve `lib/gemini.ts` içindeki önceden mevcut `@google/generative-ai` import hatası Faz 0 baz hattından devam etmektedir (mevcut dosyalara dokunulmamıştır).
