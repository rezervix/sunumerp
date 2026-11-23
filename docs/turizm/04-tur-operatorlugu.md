# Sunum ERP — Turizm Faz 4: Tur Operatörlüğü (`turizm_tur`) Raporu

- **Dal (Branch):** `feature/turizm-faz4-tur`
- **Özellik Bayrağı:** `turizm_tur` (gerçek kurulumlarda varsayılan kapalı `false`, demo ortamında açık `true`; Rent-a-Car, Otel PMS, Filo ve mevcut modüllerden tam bağımsız)
- **Ekranlar & API:** `/dashboard/tur`, `/dashboard/tur/rehber`, `/api/tur`

## 1. Kapsam (A–K) ve Yeniden Kullanım

- **A) Tur Paketi & Takvimi:** Günübirlik/konaklamalı 12 tur, gün/saat/lokasyon programı, kapasite, min. katılım, durumlar (`DRAFT`, `ON_SALE`, `GUARANTEED`, `FULL`, `COMPLETED`, `CANCELLED`).
- **B) Dinamik Koltuk Planı:** 4 şema (`OTOBUS_45`, `MIDIBUS_27`, `MINIBUS_16`, `VIP_8`), atomik koltuk kilidi, ayarlanabilir cinsiyet ve aile yan yana kuralları, mevcut `LojistikVehicle` bağlantısı.
- **C) Yolcu Rezervasyonu & Manifesto:** Bireysel/grup rezervasyonu, KVKK maskeleme, kısmi ödeme, `Finance` + `EDocumentRecord` faturalama, imzalı yazdırılabilir PDF manifesto (`GET /api/tur?section=manifesto_pdf`), biniş check-in.
- **D) Biniş Noktaları & Harita:** Durak saatleri, yolcu-durak eşleştirme, mevcut `DispatchRouteMap` harita bileşeni ve "tahmini" ibareli mesafe/süre hesabı.
- **E) Kaynak Çakışma Kontrolü:** Sunucuda araç, şoför (`LojistikDriver`), rehber (`TurizmTourGuide`) için diğer turlar, Filo bakım/arıza (`LojistikVehicle` / `LojistikVehicleMaintenanceWorkOrder`) ve Rent-a-Car kiralamalarıyla (`TurizmRentReservation`) çapraz çakışma engeli (HTTP `409`) + Kaynak × Gün Gantt + çakışma günlüğü ve manuel çözüm.
- **F) Maliyet-Kâr Analizi:** Filo yakıt, rehber, Faz 3 otel, müze, yemek, otoyol giderleri + acenta komisyonu; tur başı & yolcu başı net kâr, `Finance` entegrasyonu.
- **G) Acenta & Kanal Yönetimi:** Ayarlanabilir komisyon oranları, acenta kontenjan limiti ve performans raporu.
- **H) Konaklamalı Tur — Faz 3 Otel & KBS Bağlantısı:** Faz 3 `TurizmHotelAllotment` / `TurizmHotelReservation` grup bloğu ve doğrudan Faz 3 `prepareOrRefreshKbsRecord` yeniden kullanımı (ikinci KBS mekanizması eklenmedi).
- **I) Rehber/Şoför Mobil Ekranı (`/dashboard/tur/rehber`):** Kısıtlı `"Tur Rehberi"` rolü izolasyonu, yoklama, acil not, saha tahsilatı ve IndexedDB + LocalStorage çevrimdışı idempotent kuyruk (`guideOfflineSync.ts`).
- **J & K) Raporlar & Bildirimler:** Doluluk, kârlılık, acenta performansı, iptal oranı, araç kullanım saatleri, Excel (`.xlsx`) & PDF (`.pdf`) dışa aktarma (`exportReports.ts`) ve `createNotificationMany` bildirimleri.

## 2. Migration, Rollback & Demo Seed

- **Additive Migration:** `prisma/migrations/20261123120000_turizm_faz4_tur_operatorlugu/migration.sql` (10 yeni `TurizmTour*` tablosu) ve tam geri alma `rollback.sql`; JSON DB karşılıkları `lib/db.ts` içine eklendi.
- **Demo Seed:** `lib/tourism/seed/faz4-tur-operatorlugu.ts` (`trzm-tur-*` + `role-tur-rehberi`), çalıştırma: `npx tsx scripts/seed-tourism-demo.ts seed` | geri alma: `npx tsx scripts/seed-tourism-demo.ts rollback`.
- **Seed Doğrulaması:** Öncesinde `bkp-20261123-122654-bf30-cli-tourism-seed` yedeği alındı; 1. çalıştırmada 223 kayıt eklendi, 2. çalıştırmada 0 kayıt eklendi (idempotent), mevcut veri bütünlüğü `%100 korundu`.

## 3. Doğrulama & Atlanan Kontroller (Hızlı Teslim Modu)

- **Yapılanlar:** `prisma validate` & `prisma generate` geçti; 14 Faz 4 dosyasının boş/NUL kontrolü ve yalnızca Faz 4 dosyalarına yönelik hedefli TypeScript kontrolü (`0 hata`) geçti; 2x demo seed idempotency doğrulandı.
- **Atlananlar:** Hızlı teslim modu yönergesi gereği `next dev`/`next build`, tarayıcı doğrulaması, canlı HTTP/JWT testleri ve yeni/önceki faz otomatik test paketleri çalıştırılmadı.

## 4. Elle Kontrol Listesi

1. `/dashboard/tur` ekranını açıp 12 turun (dolu, garantili, min. katılım altı, tamamlandı, iptal, taslak) ve KPI kartlarının dolu geldiğini kontrol edin.
2. **Turlar & Takvim** → **Yeni Tur Planla** ile mevcut bir tur/bakım/Rent-a-Car aracıyla çakışan tarih seçip sunucunun HTTP 409 çakışma uyarısı verdiğini deneyin.
3. **Koltuk Planı & Biniş Haritası** sekmesinde `TUR-2026-01` turunu seçip dinamik koltuk yerleşiminde karşı cinsiyet yan koltuk kuralını ve haritadaki "tahmini" mesafe/süre etiketini inceleyin.
4. **Rezervasyon, Manifesto & Otel** sekmesinde **İmzalı Manifesto PDF İndir** ile PDF indirin, kısmi ödemeli yeni yolcu ekleyip **Bakiye Kapat** / **E-Belge Kes** ve konaklamalı turda **Otel Oda Bloğu & KBS Hazırla** butonlarını deneyin.
5. **Kaynak Çakışma & Gantt** sekmesinde Tur + Rent-a-Car (`KİRA`) + Filo Bakım (`BAKIM`) satırlarını ve açık çakışma kaydını **Çözüldü İşaretle** akışını test edin.
6. **Maliyet-Kâr Analizi** ve **Acenta & Rehberler** sekmelerinde `TUR-2026-08` (tamamlanan tur) yolcu başı kârını ve gider eklemeyi, **Raporlar & Dışa Aktar** sekmesinde Excel/PDF indirmeyi doğrulayın.
7. `/dashboard/tur/rehber` mobil ekranında (veya `rehber.kerem` / `demo123` kısıtlı rehber hesabıyla) **Çevrimdışı Mod**a geçip yoklama + acil not + saha tahsilatı kuyruklayıp çevrimiçine geçerek **Senkronize Et** işlemini deneyin.
8. Demo üst çubuğundaki **Perspektif** seçicisinden `Örnek Anadolu Keşif Turizm Ltd.` seçerek yalnızca partner firmaya ait `PRT-TUR-2026-01` turunun izole görüntülendiğini kontrol edin.
