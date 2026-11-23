# Sunum ERP — Turizm Faz 3: Otel Yönetimi (Mini PMS) — `turizm_otel` Uygulama Raporu

- **Dal (Branch):** `feature/turizm-faz3-otel`
- **Modül Bayrağı:** `turizm_otel` (gerçek müşteri kurulumlarında varsayılan kapalı `false`; demo ortamında açık `true`; diğer tüm turizm, lojistik ve üretim modüllerinden tam bağımsız)
- **Ana Ekranlar:**
  - Ön Büro & Mini PMS: `/dashboard/otel`
  - Kat Hizmetleri (Housekeeping) Mobil & Çevrimdışı Ekranı: `/dashboard/otel/housekeeping`
  - API Uç Noktası: `/api/otel`

---

## 1. Kapsam ve Teslim Edilen Özellikler (A–J)

| Alan | Uygulanan Kapsam | Ana Dosyalar |
| --- | --- | --- |
| **A. Oda Tipleri, Envanter, Tarifeler & Politika** | 5 ana + 1 partner oda tipi, 50 ana + 2 partner fiziksel oda (`CLEAN_VACANT`, `OCCUPIED`, `DIRTY_VACANT`, `CLEANING_IN_PROGRESS`, `INSPECTION_PENDING`, `MAINTENANCE`, `OUT_OF_ORDER`), sezon × oda tipi × pansiyon (`RO`/`BB`/`HB`/`FB`/`AI`) tarifeleri, ayarlanabilir faturalama zamanı ve oran politikası | `prisma/schema.prisma`, `lib/tourism/otel/hotelCoreService.ts`, `app/dashboard/otel/components/HotelHkKbsAllotmentAndReportsTabs.tsx` |
| **B. Etkileşimli Kat Planı** | Kat bazlı oda kartları/ızgarası, renk = oda durumu, kat/tip/durum/arama filtreleri, tek tıkla oda durumu güncelleme, hızlı rezervasyon ve folio geçişi | `app/dashboard/otel/components/HotelFloorPlanAndGanttTabs.tsx` |
| **C. Rezervasyon, Atomik Kilit & Gantt** | Tarih aralığı, oda atama, sunucu tarafı per-room atomik mutex (`withRoomReservationLock` → HTTP `409 ROOM_DOUBLE_BOOKING_LOCKED`), arızalı/bakımdaki oda engeli (`ROOM_OUT_OF_ORDER`), Oda × Gün Gantt takvimi, çakışma günlüğü (`TurizmHotelConflictAttemptLog`) | `lib/tourism/otel/hotelCoreService.ts`, `lib/tourism/otel/constantsAndHelpers.ts` |
| **D. Check-In / Check-Out** | KVKK veri minimizasyonlu misafir güncelleme (**kimlik fotokopisi alınmaz/saklanmaz**), anahtar kart kodu, oda temizlik/istisna kontrolü, check-out bakiye kontrolü ve anlık kapanış tahsilatı | `lib/tourism/otel/hotelOpsAndReportsService.ts`, `app/dashboard/otel/components/HotelReservationsAndFolioTabs.tsx` |
| **E. KBS Kimlik Bildirimi Hazırlığı** | Check-in/out verisinden eksik alan doğrulama, XML şablon / CSV / JSON dışa aktarma, toplu yeniden deneme, 4 durum (`HAZIRLANDI`, `GONDERILDI_MANUEL`, `HATALI`, `EKSIK_VERI`). **Canlı EGM/Jandarma KBS bağlantısı kurulmaz** (EGMSEC/sabit IP gereksinimi; doküman erişim tarihi: `2026-11-20`) | `lib/tourism/otel/providers.ts`, `lib/tourism/otel/hotelOpsAndReportsService.ts` |
| **F. Housekeeping, Teknik Arıza & Çevrimdışı Senkron** | Check-out sonrası otomatik `CHECKOUT_CLEANING` görevi, `PENDING → IN_PROGRESS → COMPLETED → INSPECTED` yaşam döngüsü, teknik arıza bildirimi, mobil ekran (`/dashboard/otel/housekeeping`), IndexedDB + LocalStorage çevrimdışı kuyruk + idempotent toplu senkronizasyon (`offlineIdempotencyKey`), kısıtlı **`"Temizlik Personeli"`** rolü izolasyonu | `lib/tourism/otel/housekeepingOfflineSync.ts`, `lib/tourism/otel/hotelOpsAndReportsService.ts`, `app/dashboard/otel/housekeeping/page.tsx` |
| **G. Oda Hesabı (Folio), Minibar Stok & E-Belge** | Mevcut `InventoryItem` + `StockBalance` + `StockMovement` ile minibar stok düşümü, restoran/çamaşırhane/spa ekstraları, kısmi tahsilatlar, bölünmüş folio (`A_ANA_HESAP`, `B_EKSTRA_BOLUNMUS`, `C_ACENTA_FATURASI`), mevcut `Finance` + `EDocumentRecord` (`DemoDbEDocumentProvider`) bağlantısı | `lib/tourism/otel/hotelOpsAndReportsService.ts`, `app/dashboard/otel/components/HotelReservationsAndFolioTabs.tsx` |
| **H. Acenta Kontenjanı (Allotment)** | Dönemlik ve gecelik oda kontenjanı, kullanım çubuğu, dolmaya yakın (`NEAR_LIMIT`) uyarı eşiği, serbest bırakma (release) tarihi ve sunucu tarafı kontenjan aşım engeli (`409 ALLOTMENT_EXCEEDED`) | `lib/tourism/otel/hotelCoreService.ts`, `app/dashboard/otel/components/HotelHkKbsAllotmentAndReportsTabs.tsx` |
| **I. Raporlar & Analitik** | Açık formüllü **Doluluk %**, **ADR**, **RevPAR**, kanal/acenta gelir dağılımı, günlük ön büro özeti, sıfır-PII anonimleştirilmiş uyruk istatistiği, mevcut `exportReports.ts` üzerinden gerçek **Excel (`.xlsx`)** ve **PDF (`.pdf`)** indirme | `lib/tourism/otel/constantsAndHelpers.ts`, `lib/tourism/otel/hotelOpsAndReportsService.ts` |
| **J. Bildirimler** | Bugün giriş/çıkış, geciken check-out, kirli odalar ve dolmaya yakın acenta kontenjanları için mevcut `createNotificationMany` / `Notification` altyapısına bildirim iletimi | `lib/tourism/otel/hotelOpsAndReportsService.ts` |

---

## 2. KPI Formülleri (Şeffaf Tanım)

- **Doluluk Oranı (%):** `(Satılan Oda-Gece / Satılabilir Aktif Oda-Gece) × 100`
- **ADR (Ortalama Günlük Oda Fiyatı):** `Toplam Oda Konaklama Geliri / Satılan Oda-Gece`
- **RevPAR (Mevcut Oda Başı Gelir):** `Toplam Oda Konaklama Geliri / Satılabilir Aktif Oda-Gece`

---

## 3. Veritabanı Şeması, Migration ve Demo Seed

- **Additive Migration:** `prisma/migrations/20261121150000_turizm_faz3_otel_pms/migration.sql` ve tam geri alma `rollback.sql` (10 yeni `TurizmHotel*` tablosu; mevcut tablolarda yıkıcı değişiklik yok).
- **JSON DB Karşılığı:** `lib/db.ts` içine 10 yeni `turizmHotel*` koleksiyonu eklendi.
- **Demo Seed (`lib/tourism/seed/faz3-otel-pms.ts`):**
  - Yalnızca `isDemoEnvironment() === true` iken çalışır; `DISABLE_DEMO_MODE=true` iken `LogisticsSeedEnvironmentError` ile kilitlenir.
  - Tüm kayıtlar `trzm-otl-*` öneki (ve `role-housekeeping` rolü) taşır; idempotent çalışır ve tek komutla geri alınabilir.
  - Envanter: 1 kısıtlı `"Temizlik Personeli"` rolü, 2 temizlik kullanıcısı (`temizlik.ayse`, `temizlik.fatma`, şifre `demo123`), 6 oda tipi, 50 ana + 2 partner odası, 8 tarife, 1 politika kaydı, 4 minibar `InventoryItem` + `StockBalance` + açılış `StockMovement` (bakiye=hareket eşitliği korunur), 4 acenta kontenjanı, 10 kurgusal misafir, 24 rezervasyon, 47 folio kalemi, 4 finans geliri, 10 housekeeping/arıza görevi, 8 KBS hazırlık kaydı ve 3 çakışma günlüğü.

---

## 4. Mevcut Dosyalarda Yapılan Cerrahi Değişiklikler

1. `prisma/schema.prisma`: 10 `TurizmHotel*` modeli ve `Customer` üzerinde 3 opsiyonel ilişki alanı eklendi.
2. `lib/db.ts`: 10 `turizmHotel*` koleksiyonu JSON DB tipine, başlangıç dizilerine, `enrichItem` ve `fallbackModels` listesine eklendi.
3. `lib/tourism/constants.ts`: `HOUSEKEEPING_ROLE_NAME = "Temizlik Personeli"` sabiti eklendi.
4. `lib/auth/permissions.ts`: `"Temizlik Personeli"` rolü `ROLE_HIERARCHY` ve `DEFAULT_ROLES` içine eklendi.
5. `lib/config/tourism-feature-flags.ts`: `"/dashboard/otel"` `IMPLEMENTED_TOURISM_HREFS` listesine eklendi.
6. `app/dashboard/layout.tsx`: `"Otel Yönetimi"` menüsü (`/dashboard/otel`, `/dashboard/otel/housekeeping`) ve kısıtlı `"Temizlik Personeli"` sidebar izolasyonu eklendi.
7. `lib/tourism/seed/index.ts`: `faz3HotelPmsSeedModule` kayıt defterine eklendi.
8. `scripts/test-turizm-faz1-altyapi.ts`: Faz 3'ün eklediği kısıtlı rol/kullanıcılar sonrası tam turizm rollback kontrolü için satır 419–422 `>=` esnekliğine güncellendi.

---

## 5. Doğrulama Sonuçları (Doğrudan Çalıştırılan Kontroller)

- **Prisma Şema & İstemci:** `npx prisma validate` ve `npx prisma generate` başarılı (`exit 0`).
- **TypeScript Denetimi (`npx tsc --noEmit`):** Faz 3 dosyalarında **0 hata**; repo geneli hata sayısı önceden var olan baz değer olan **163** seviyesinde korundu.
- **Demo Seed & İdempotency:** `scripts/seed-tourism-demo.ts seed --no-backup` iki kez çalıştırıldı — 1. çalıştırmada 194 Faz 3 kaydı eklendi, 2. çalıştırmada 0 kayıt eklendi, mevcut veri bütünlüğü `%100 korundu`.
- **Otomatik Test Paketleri:**
  - `scripts/test-turizm-faz3-otel.ts`: **13/13** geçti (saf dosya/yasaklı metin, 3 migration, seed kilidi, 50+2 oda, paralel `Promise.all` çift rezervasyon 409 kilidi, arızalı oda 409, kontenjan aşımı 409, Check-In→Minibar Stok(-2)→Split Folio→Check-Out→HK+KBS+E-Belge E2E, çevrimdışı idempotent sync `SYNCED`/`DUPLICATE_IGNORED`, `temizlik.ayse` rol izolasyonu 5×403, Doluluk/ADR/RevPAR + XLSX/PDF + KBS XML/CSV + Bildirimler, modül bağımsızlığı ve partner izolasyonu, rollback).
  - `scripts/test-turizm-faz2-rentacar.ts`: **7/7** geçti.
  - `scripts/test-turizm-faz1-altyapi.ts`: **14/14** geçti.
  - `scripts/test-lojistik-faz5-filo.ts`: **10/10** geçti.
  - `scripts/test-lojistik-faz7-e2e-ve-butunluk.ts`: **10/10** geçti (%100 `StockMovement == StockBalance` eşitliği dahil).
  - `node scripts/test-demo-queries.js`: **Başarılı** (`exit 0`).
- **Canlı Turbopack Dev Sunucu Doğrulaması (`localhost:3036`):**
  - SSR/HTTP 200 ve sıfır `__next_error__`: `/dashboard/otel`, `/dashboard/otel/housekeeping`, `/dashboard/arac-kiralama`, `/dashboard/filo`, `/dashboard/wms`, `/dashboard/customers`, `/dashboard/finance`, `/dashboard`.
  - Kimlik doğrulamasız `GET /api/otel?section=overview`: **HTTP 401**.
  - Yönetici `GET /api/otel?section=overview`: **HTTP 200** (`rooms=52`, `resv=24`, `hk=10`, `kbs=8`, `allot=4`, `adr=5594.81`).
  - Demo Firma Perspektifi (`demoCompanyId=trzm-comp-otel-03`): **HTTP 200** (`rooms=2`, `resv=1`).
  - Rapor Dışa Aktarma (`report_export`): Excel **HTTP 200 (`PK`, 19.425 B)**, PDF **HTTP 200 (`%PDF`, 9.413 B)**.
  - *Not:* Kısıtlı `temizlik.ayse` / `partner.kiyiotel` kullanıcılarının servis düzeyindeki izolasyonu `test-turizm-faz3-otel.ts` içinde tam doğrulanmıştır; canlı HTTP/JWT katmanı kontrolü kullanıcı isteğiyle atlanmıştır. Tarayıcı görsel incelemesi için Chrome Remote Debugging bu ortamda etkin olmadığından manuel tarayıcı kontrolü önerilir (`/dashboard/otel` ve `/dashboard/otel/housekeeping`).
