# Lojistik Faz 4 (`lojistik_iade`) — İade ve Tersine Lojistik (RMA)

**Durum:** Tamamlandı (elektrik kesintisi kurtarması + doğrulamalar sonrası güncel)  
**Özellik Bayrağı:** `lojistik_iade`  
**Önkoşul Fazlar:** Faz 1 (Altyapı & RBAC), Faz 2 (WMS & Stok Defteri), Faz 3 (Tedarikçi & Skor Kartı)  
**Kurtarma Kaydı:** [04-iade-kurtarma-durum-raporu.md](./04-iade-kurtarma-durum-raporu.md)

---

## 1. Mimari Özet ve Kapsam (A–H Maddeleri)

| Kod | Özellik | Uygulanan Bileşenler |
|---|---|---|
| **A** | Çok kalemli RMA & 9 durumlu akış | `lib/logistics/returns/constantsAndHelpers.ts`, `lib/logistics/returns/rmaService.ts`, `RmaReturnManager.tsx`, `RmaCreateModal.tsx`, `RmaDetailAndDecisionDrawer.tsx`, `app/dashboard/orders/page.tsx` (`OmnichannelOrder` + çekirdek `Order` (`ERP_ORDER`), satılandan fazla iade engeli, `TALEP -> ONAYLANDI -> YOLDA -> TESLIM_ALINDI -> INCELEMEDE -> KARARA_BAGLANDI -> KAPANDI` + `REDDEDILDI` / `IPTAL`) |
| **B** | 14 gün sayacı, kategori/ürün politikaları, istisna onayı | `LojistikReturnPolicy`, `LEGAL_MIN_RETURN_DAYS = 14`, `evaluateReturnEligibility`, `listReturnPolicies`, `upsertReturnPolicy`, `resolveReturnPolicyForItem`, `RmaPoliciesAndAnalyticsPanels.tsx` (`RmaPoliciesPanel`), geri sayım rozetleri ve süresi dolmuş taleplerde yetkili istisna onayı |
| **C** | İade etiketi / fişi yazdırma | `app/dashboard/omnichannel/rma/[id]/print/page.tsx`, `GET /api/omnichannel?section=rma_label`, `generateRmaLabelPayload` (`qrcode` SVG + `jsbarcode` CODE128) |
| **D** | El terminali iade mal kabul (`RMA_RETURN_RECEIPT`) | `app/dashboard/wms/mobil/page.tsx` (`6. İade Kabul (RMA)`), `GET /api/wms?section=lookup` (`lookupType: "RMA"`), `lib/wms/offlineSyncEngine.ts`, `lib/logistics/wms/operationsEngine.ts`, `receiveRmaIntoQuarantine` (fark/hasarlı miktar kaydı ve karantina lokasyonuna otomatik stok defteri hareketi) |
| **E** | Kalite muayenesi, NCR, FEFO/SKT ve Tedarikçi Skoru | `decideRmaInspection` — ikinci bir kalite sistemi kurulmadan mevcut `uretimQualityInspection` ve `uretimQualityNcr` tabloları yeniden kullanılır; `RESTOCK_TO_BIN`, `REPAIR_REFURBISH`, `RETURN_TO_VENDOR`, `SCRAP` kararları, SKT/lot yeniden değerlendirme ve `RETURN_TO_VENDOR` kararlarının Faz 3 `lojistikSupplierScoreSnapshot` skor kartına yansıtılması |
| **F** | Mali bağlantı, sunucu sert bloğu & kredi notası | `isRmaEligibleForRefundTrigger`, `processCreditNoteAction`, `RmaCreditNotesPanel` — `TESLIM_ALINDI` + `KARARA_BAGLANDI` olmadan sunucuda sert blok; onay sonrası `Finance` gider/iade kaydı ve `eDocumentRecord` GİB iade e-belgesi |
| **G** | E-ticaret iade webhook'u | `app/api/webhooks/omnichannel/route.ts`, `lib/logistics/returns/financeAndWebhookService.ts` (`ingestSecureReturnWebhook`, `verifyReturnWebhookSignature`, `signReturnWebhookPayload`, `getConfiguredWebhookSecret`, `pushChannelReturnStatusSync`), HMAC-SHA256 imza doğrulama, `lojistikRmaWebhookLog` ile idempotency, yalnızca `isDemoEnvironment()` açıkken aktif `simulate_return_webhook` |
| **H** | İade analiz raporları | `getReturnsAnalyticsReport`, `RmaAnalyticsPanel` — veritabanındaki gerçek RMA/satır/kredi notası kayıtlarından iade oranı, neden dağılımı, ürün/tedarikçi bazlı dağılım, çevrim süresi ve iade maliyeti |

---

## 2. Additive Veritabanı Şeması ve Geri Alma (Rollback)

- **Prisma Şeması:** `prisma/schema.prisma`
  - Mevcut `ReturnRmaRecord` ve `InventoryItem` modellerine yalnızca additive (mevcut sütunları kırmayan) iade/garanti/RMA yaşam döngüsü alanları eklendi.
  - Yeni modeller: `LojistikRmaLine`, `LojistikRmaEventLog`, `LojistikRmaCreditNote`, `LojistikReturnPolicy`, `LojistikRmaWebhookLog`.
- **SQL Migration & Rollback:**
  - `prisma/migrations/20261116100000_lojistik_faz4_iade_ve_rma/migration.sql` (`9,916 B`)
  - `prisma/migrations/20261116100000_lojistik_faz4_iade_ve_rma/rollback.sql` (`2,403 B`)
- **Not:** Bu geliştirme/doğrulama ortamında PostgreSQL çevrimdışı olduğu için `lib/db.ts` otomatik olarak `storage/ajans-kutuphanesi/.local-db.json` yedek yerel JSON deposu üzerinden çalışmaktadır.

---

## 3. Güvenlik, Yetki ve Ertelenen Kapsam

- **Yeni Faz 4 API Uçları (`app/api/omnichannel/route.ts` & `lib/logistics/returns/apiHandlers.ts`):**
  - Tüm `FAZ4_GET_SECTIONS` ve `FAZ4_POST_ACTIONS` çağrıları `requireLogisticsAccess({ flagKey: "lojistik_iade", resource: "lojistik_iade", action })` ile korunur.
  - Her kritik işlem `logLogisticsAudit` ile denetim günlüğüne yazılır.
  - Harici tedarikçi portal hesapları şirket içi Faz 4 iade uçlarında `403 FORBIDDEN_SUPPLIER_SCOPE` ile reddedilir.
- **Webhook Güvenliği (`app/api/webhooks/omnichannel/route.ts`):**
  - `RETURN_REQUEST` yükleri HMAC-SHA256 (`x-webhook-signature` / `x-hub-signature-256`) veya kanal gizli anahtarı (`x-channel-secret`) doğrular.
  - `DISABLE_DEMO_MODE=true` (`isDemoEnvironment() === false`) olduğunda `sunum-demo-webhook-secret` demo fallback'i devre dışı kalır ve sahte/demo imzalar `401` ile reddedilir; ayrıca `simulate_return_webhook` aksiyonu `403 DEMO_MODE_DISABLED` döner.
- **Ertelenmiş Konu (`ertelendi`):**
  - `/api/omnichannel` içindeki **eski aksiyonlar** (`reserve_order_stock`, `split_shipment`, `suggest_substitute`, `apply_substitute`, `backorder_order`, `process_rma`, `sync_all_channels`, `issue_edocument`, `seed_reset`) mevcut çalışma uyumluluğunu korumak için bu fazda yetki sarmalaması kapsamı dışında bırakılmıştır; ayrı yapılacak temizlik ve güvenlik revizyonuna **ertelenmiştir**.

---

## 4. Demo Seed Modülü ve Tek Anahtar Politikası

- **Modül:** `lib/logistics/seed/faz4-iade-ve-rma.ts` (`LogisticsSeedModule` arayüzüne uygun, idempotent, yalnızca `isDemoEnvironment()` açıkken çalışır).
- **Kayıt Kapsamı (`63` `f4-*` kaydı / `12` koleksiyon):**
  - `lojistikReturnPolicy` (`4`), `returnRmaRecord` (`11` — son 90 gün ve 9 farklı RMA durumu, süresi 1–2 gün kalmış talepler ve istisna onaylı örnek dahil), `lojistikRmaLine` (`12`), `lojistikRmaEventLog` (`11`), `uretimQualityInspection` (`4`), `uretimQualityNcr` (`3`), `lojistikRmaCreditNote` (`4`), `eDocumentRecord` (`3`), `finance` (`3`), `stockBalance` (`2`), `stockMovement` (`2`), `lojistikRmaWebhookLog` (`4`).
- **Komutlar:**
  - Yükleme: `npm run seed:logistics`
  - Geri alma: `npm run seed:logistics:rollback`
- **Tek Anahtar:** `DISABLE_DEMO_MODE=true` / `ENABLE_DEMO_MODE=false` (`isDemoEnvironment() === false`) ayarlandığında `/api/system-config` ve `/api/omnichannel` `featureFlags.logisticsDemoMode` değerini `false` döner, UI üzerindeki demo webhook simülatörü gizlenir ve sunucu tarafında demo yardımcıları `403 DEMO_MODE_DISABLED` ile engellenir.

---

## 5. Doğrulama Sonuçları (Gözlemlenen Somut Çıktılar)

| Kontrol | Komut / Ortam | Gözlemlenen Sonuç |
|---|---|---|
| **TypeScript** | `npx tsc --noEmit --incremental false` | Toplam `166` hata (önceki modüller/`lib/i18n/locales`); Faz 1–4 / lojistik / omnichannel / WMS / DB dosyalarında `0` hata (`FAZ1_4_ERRORS=0`) |
| **Production Build** | `subst Z:` üzerinden `VERCEL=1 SUNUM_DISABLE_CRON=1 npx next build --webpack` | **Başarılı (`exit 0`)**, `183/183` sayfa/rota üretildi (`@google/generative-ai` mevcut uyarısı dışında hatasız) |
| **Dev Server (Turbopack)** | `subst Z:` üzerinden `npx next dev --turbopack -p 3113` | `/dashboard/omnichannel`, `?tab=rma`, `/dashboard/omnichannel/rma/f4-rma-01/print`, `/dashboard/orders`, `/dashboard/wms/mobil`, `/dashboard/wms`, `/api/omnichannel?section=rma_list` tümü HTTP `200`, `clean` (`__next_error__` yok) |
| **Canlı Tarayıcı Kontrolü** | `browser` alt ajanı (`http://localhost:3113`) | **Engellendi (yapılamadı):** `C:\Users\!\AppData\Local\Google\Chrome\User Data\DevToolsActivePort` bulunamadığı (`ENOENT`) için Chrome DevTools MCP bağlanamadı |
| **HTTP E2E — Demo ON** | `next start -p 3114` -> `test-lojistik-faz4-http-e2e.ts` & `faz3` | Faz 4: **`5/5` (`exit 0`)** · Faz 3: **`6/6` (`exit 0`)** |
| **HTTP E2E — Demo OFF (Varsayılan Bayraklar)** | `next start -p 3115` (`DISABLE_DEMO_MODE=true`, `ENABLE_DEMO_MODE=false`) | Faz 4: **`2/2` (`exit 0`)** (`logisticsDemoMode=false`, `rma_list` & `simulate_return_webhook` `403 FEATURE_DISABLED`, demo webhook imzası `401`) · Faz 3: **`2/2` (`exit 0`)** |
| **HTTP E2E — Demo OFF + Özellik Açık** | `next start -p 3116` (`DISABLE_DEMO_MODE=true`, `FEATURE_LOJISTIK_ALL=true`, `EXPECT_FEATURE_ACTIVE=true`) | Faz 4: **`2/2` (`exit 0`)** (`logisticsDemoMode=false`, `rma_list` `200`, `simulate_return_webhook` `403 DEMO_MODE_DISABLED`, demo webhook imzası `401`) |
| **Seed Rollback & Idempotency** | `seed:logistics:rollback` -> `seed:logistics` (x2) | Rollback %100 temiz; 1. seed `3 + 75 + 102 + 63 = 243` ekledi; 2. seed `eklendi=0, atlandı=243` |
| **Faz 1–4 Birim / Entegrasyon Testleri** | `scripts/test-lojistik-faz{1,2,3,4}*.ts` | Faz 1: **`14/15` (`exit 1`)** (yalnızca satır 412'de Faz 1 beklediği `user === 1` vs Faz 3'ün eklediği 2. kullanıcı `2`) · Faz 2: **`9/9` (`exit 0`)** · Faz 3: **`12/12` (`exit 0`)** · Faz 4: **`10/10` (`exit 0`)** |

---

## 6. Kritik Dosya Boyut ve SHA-256 Envanteri

| Dosya | Boyut | SHA-256 |
|---|---:|---|
| `prisma/schema.prisma` | 186,618 B | `1FD9DC0C95BB02E58C96662D43F767805954FB6E0D9B41A75914B827EFB94E27` |
| `prisma/migrations/20261116100000_lojistik_faz4_iade_ve_rma/migration.sql` | 9,916 B | `7436E03798687A0FD68D762CF0309B09FABD681613DFF79DA258133DAB731891` |
| `prisma/migrations/20261116100000_lojistik_faz4_iade_ve_rma/rollback.sql` | 2,403 B | `A43BA9FEAD03DDE89EBC58F6BF077AEBE3518EB3C27C7369D92033DCDB6C46D9` |
| `lib/logistics/returns/constantsAndHelpers.ts` | 7,876 B | `60FA72083B03B592AF9AA1331E68A8A715B048ACA2E8C728979BE3748C6B80D7` |
| `lib/logistics/returns/rmaService.ts` | 51,236 B | `E97E02A683FAAF7E25E9E538FA1BEFC04F0AFE8781EC56EFEEE50A5C3F442E7E` |
| `lib/logistics/returns/financeAndWebhookService.ts` | 35,142 B | `04EAE108A1392404B0B5CE23DAF60EB740E98A74C86C1925747809DFCA9A0E08` |
| `lib/logistics/returns/apiHandlers.ts` | 15,665 B | `7ED76CC5976CB6D1AF8F319E2E0525859801D92485DBBB27E37AC240AF3158DD` |
| `lib/services/omnichannelServerDb.ts` | 29,266 B | `B8A9B6E5B04FF000578F4CF468AE55F167DFE02606526CACD83AC35AF2F47D15` |
| `lib/logistics/wms/operationsEngine.ts` | 69,948 B | `2CDC0644B1ACBFCC5DD9A0040A68209FB76764765AA061C762F6E004C9CF6CEA` |
| `lib/wms/offlineSyncEngine.ts` | 11,055 B | `619FD383EC78FBE23F5BF71D06FF68AA27454681B27DE0A57A323FB9A6B94907` |
| `app/api/omnichannel/route.ts` | 4,089 B | `982EDF270809A331F76BB89FDC1FC02B2847F17308FA5EFF216E1DCAE64B0EFB` |
| `app/api/webhooks/omnichannel/route.ts` | 6,418 B | `89108E8735AA8230FE6B0C38314E53EE2BD5E7149E7D52E1BBDA18B4B32D97EB` |
| `app/api/wms/route.ts` | 14,628 B | `0F133D6B7AB75FE93EA1A7B91900ABD66080FCAE2C918EE6D99E66D830278A11` |
| `app/dashboard/wms/mobil/page.tsx` | 44,228 B | `7D1FED8523D785CEADB8E70971DD81727D198CB6C2736889EEEA2BCD9447B5E4` |
| `app/dashboard/omnichannel/page.tsx` | 14,186 B | `6CE51C6CF72A491042FF9F10B7D2080914608FB8BF9B98418D4A7E12988D4172` |
| `app/dashboard/omnichannel/components/RmaReturnManager.tsx` | 21,751 B | `6C0CE0DFA9F1AA195D036BB8E84D51910C340BFAF4418DFE471E81351838E462` |
| `app/dashboard/omnichannel/components/RmaCreateModal.tsx` | 22,153 B | `897B2333592B43436C70535E46462F68F0BF69B075715EA2B5B0DDB8A1AD0B63` |
| `app/dashboard/omnichannel/components/RmaDetailAndDecisionDrawer.tsx` | 36,393 B | `5FF32899E89C261E50B9A3FF6204AC95C152AAB3492851DB79AC18667D3F768F` |
| `app/dashboard/omnichannel/components/RmaPoliciesAndAnalyticsPanels.tsx` | 31,517 B | `5E2240DAC035C4FE4DDE0E2A553163A1B62519D65D18DDB7423DB11E9366A912` |
| `app/dashboard/omnichannel/rma/[id]/print/page.tsx` | 11,829 B | `CC287C8FC34D870BD9F3B8E6B59064B361FAD03AB2F65ED55ED761FFEDB56ED1` |
| `app/dashboard/orders/page.tsx` | 50,242 B | `62C173213147E27E2827037CC4907AA188100CC9044A1CDE64AC462B650FAD9C` |
| `lib/logistics/seed/faz4-iade-ve-rma.ts` | 46,138 B | `E19BC7F9D130B9B52C8D763E65E39D39A9AD373CF378CC7C33CCB79AA9FE116F` |
| `lib/logistics/seed/index.ts` | 1,126 B | `FB0BA150F1A495BBC18CE091393A18AE702AEDFA0266D5670700DDF12CBB2A4E` |
| `scripts/test-lojistik-faz4-iade.ts` | 16,810 B | `E0324C596C54B973929F3D95113A39B46B7B4022C9BA609BBE7DCBA70BA99A76` |
| `scripts/test-lojistik-faz4-http-e2e.ts` | 12,275 B | `F7041C356D19223A2E1CF4764D058B16FDDC3CE9A4B8BD52C2B6779981346964` |
| `storage/ajans-kutuphanesi/.local-db.json` | 748,608 B | `FB84D9BE3E5AB836E440835DFC119E4312EFDDDF823BB64C4749BE5160EA9ADE` |
| `storage/system_config.json` | 1,679 B | `9031A996602374AFEB6DCAB87B07B0161D1C0165AA94EDFE99F8CC088258991D` |
