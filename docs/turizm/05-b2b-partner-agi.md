# Turizm Faz 5: B2B Partner Ağı (`turizm_b2b`)

## 1. Kapsam ve Bağımsızlık
- **Özellik Bayrağı**: `turizm_b2b` (varsayılan `false`, yalnızca demo ortamında otomatik açık). Kapalıyken Rent-a-Car, Otel PMS, Tur Operatörlüğü ve tüm çekirdek ERP modülleri etkilenmeden çalışır.
- **Rota**: `/dashboard/partner-agi`
- **API**: `/api/partner-agi` (`GET` & `POST`)

## 2. Veri Modeli (Additive + Geri Alınabilir)
- **Migration**: `prisma/migrations/20261123140000_turizm_faz5_b2b_partner_agi/migration.sql`
- **Rollback**: `prisma/migrations/20261123140000_turizm_faz5_b2b_partner_agi/rollback.sql`
- **Genişletilen Faz 1 Tabloları**: `TurizmSharedResource` (paylaşım penceresi, komisyon %, min. gün, onay modu, görünürlük listesi, `hideSensitiveFields`, `sensitiveMetaJson`, çekilme kuralı) ve `TurizmCrossReservation` (brüt/komisyon/net tutarlar, alt modül atomik referansı, onay/ret/mutabakat/e-Belge alanları).
- **Yeni Tablolar**: `TurizmPartnershipHistoryLog`, `TurizmPartnerSettlement`, `TurizmPartnerLedgerEntry`, `TurizmPartnerMessage`, `TurizmPartnerConflictLog`.
- **JSON DB**: 5 yeni koleksiyon `lib/db.ts` içine eklendi.

## 3. Güvenlik, İzolasyon ve Atomik İş Kuralları
- **Partnerlik Onayı**: Ortak havuzda yalnızca `APPROVED` partnerlerin açık kaynakları listelenir; `PENDING` / `REJECTED` / `SUSPENDED` / `REMOVED` partnerler kaynak göremez.
- **Veri Minimizasyonu**: `hideSensitiveFields = true` iken plaka, şasi no ve dahili telefon alanları sunucu tarafında (`sanitizeSharedResourceForViewer`) maskelenir.
- **Atomik Çapraz Rezervasyon & Çakışma Kilidi**: `withCrossResourceLock` eşzamanlı çakışmaları engeller; tarih çakışmasında HTTP `409` ve alternatif kaynak önerisi döner, `TurizmPartnerConflictLog` kaydeder. Alt modül kilidi + çapraz rezervasyon + karşılıklı cari çifti (`pairKey` ile A alacağı === B borcu) atomik yazılır, hata anında iki taraf da geri alınır.
- **Karşılıklı Cari & Mutabakat**: Her firma yalnızca kendi tarafındaki cari kayıtları görür. Mutabakat dönemleri çift taraflı onay (`ownerApprovedAt` + `bookerApprovedAt`), itiraz ve düzeltme akışını destekler; e-Belge kaydı `DemoDbEDocumentProvider` ile kesilir.
- **Demo "Firma Perspektifi"**: Yalnızca `isDemoEnvironment() === true` iken aktif olur ve Süper Yönetici ayrıcalığı yerine kısıtlı tek firma kapsamı (`isPartnerScoped: true`, `isSuperAdmin: false`) uygular. `DISABLE_DEMO_MODE=true` olduğunda hem UI'dan kalkar hem API'de `403` ile reddedilir.

## 4. Demo Seed ve Geri Alma
- **Seed Modülü**: `lib/tourism/seed/faz5-b2b-partner-agi.ts` (`trzm-b2b-*` ön eki; Faz 1–4 kayıtlarına dokunmaz).
- **Çalıştırma**: `npx tsx scripts/seed-tourism-demo.ts seed`
- **Geri Alma**: `npx tsx scripts/seed-tourism-demo.ts rollback`
