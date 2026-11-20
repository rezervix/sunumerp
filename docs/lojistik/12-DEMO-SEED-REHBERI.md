# Sunum ERP — Lojistik Demo Seed, Veri Bütünlüğü ve Geri Alma (Rollback) Rehberi

**Sürüm:** `v1.0.0-lojistik`  
**İlgili Kaynaklar:** `lib/logistics/seed/` (`faz1..faz7`, `framework.ts`, `index.ts`), `docs/lojistik/demo-senaryosu.md`

---

## 1. Demo Seed Çerçevesi Nasıl Çalışır?

Tüm Lojistik & Tedarik Zinciri demo verileri modüler ve **yalnızca eklemeli (additive-only)** biçimde 7 faza ayrılmıştır (`LOGISTICS_SEED_MODULES`):

1. `faz1-tedarikci-rol-ve-kullanici.ts`: `Tedarikçi` rolü ve dış portal demo kullanıcıları (`tedarikci.royal`, `tedarikci.yalova`).
2. `faz2-wms-derinlestirme.ts`: Depo hiyerarşisi (`4` depo, `9` bölge, `17` raf), `3` yönlendirme direktifi, `9` WMS görevi, rezervasyon/cross-dock/kitting/LPN/RFID ve `StockMovement` kayıtları.
3. `faz3-tedarikci-ve-satinalma.ts`: `13` tedarikçi, `9` SKU-tedarikçi eşlemesi, RFQ, onay adımlı PO (`9`), ASN (`3`) ve `23` tedarikçi performans snapshot'ı.
4. `faz4-iade-ve-rma.ts`: `13` RMA iade kaydı, `4` iade politikası, kalite olay günlüğü, `4` alacak dekontu ve iade webhook günlükleri.
5. `faz5-filo-ve-telematik.ts`: `18` araç, `15` şoför, leasing/belge/ceza/lastik kayıtları, bakım plan & iş emirleri (`12`), `36` yakıt kaydı, `4` CO₂ emisyon faktörü ve `48` telematik olayı.
6. `faz6-sevkiyat-ve-rota.ts`: `5` sevkiyat seferi, `15` teslimat durağı, `4` örnek e-POD (`public/uploads/pod-demo/` altında gerçek PNG dosyaları), `4` rota optimizasyon işi ve müşteri takip linkleri.
7. `faz7-final-ve-denetim.ts`: Taslak E-Fatura demo akışı, başlangıç lojistik uyarıları (`Notification`), `OPENING_BALANCE` (`DEVIR-2026-ACILIS`) açılış bakiyesi devir kayıtları (`StockBalance.onHandQty` ↔ `StockMovement` tam mutabakatı) ve eski tutarsızlık onarımları.

*(Mevcut `scripts/seed-demo-database.js` ana ERP seed dosyasına kesinlikle dokunulmamıştır.)*

---

## 2. Güvenlik Kilidi: Gerçek Müşteri Veritabanı Koruması

`lib/logistics/seed/framework.ts -> assertLogisticsDemoSeedAllowed()` aşağıdaki hallerde çalışmayı **sert biçimde durdurur** (`LogisticsSeedEnvironmentError`):
- `isDemoEnvironment() === false` (`DISABLE_DEMO_MODE=true`, `ENABLE_DEMO_MODE=false`, `NEXT_PUBLIC_ENABLE_DEMO_MODE=false` veya `NEXT_PUBLIC_USE_MOCK_DATA=false` tanımlıysa).
- Harici/production `DATABASE_URL` (`localhost`/`127.0.0.1` dışı) ve `VERCEL_ENV=production` algılanırsa (`ALLOW_DEMO_SEED=true` açıkça verilmedikçe).
- HTTP API uçlarında (`POST /api/wms` ve `POST /api/omnichannel`) `action: "seed_reset"` çağrısı demo kapalıyken **HTTP `403 DEMO_MODE_DISABLED`** döndürür.

---

## 3. CLI Komutları: Tohumlama, Geri Alma (Rollback) & Mutabakat

| İşlem | Komut (`package.json`) | Etki & Güvence |
| :--- | :--- | :--- |
| **Lojistik Demo Verisini Yükle** | `npm run seed:logistics` | Başlamadan önce `.local-db.json` güvenlik yedeği alır, **idempotenttir** (ikinci çalışmada aynı ID'leri atlar: `diffs=0`), önceki demo parmak izini doğrular. |
| **Tüm Lojistik Seed'i Geri Al** | `npm run seed:logistics:rollback` | Yalnızca `faz1..faz7` modüllerinin eklediği ID ve önekleri güvenle siler; mevcut temel ERP ürün, sipariş, kullanıcı ve üretim verilerine dokunmaz. |
| **Yedekleme & Tatbikat** | `npm run db:backup` / `npm run db:drill` | Yerel JSON DB yedek alma ve bütünlük doğrulaması. |

### Vercel Canlı Demo Paketleme Mekanizması
Vercel dağıtımlarında veritabanı sunucusu kurmaya gerek kalmadan demo verilerinin eksiksiz açılması için `next.config.js` içerisindeki `outputFileTracingIncludes` ayarı aşağıdaki üç varlığı serverless paketlerine otomatik olarak gömer:
1. `./storage/ajans-kutuphanesi/.local-db.json` (önceden `npm run seed:logistics` uygulanmış temiz demo veritabanı)
2. `./storage/system_config.json` (varsayılan tema, şirket ve sistem ayarları)
3. `./public/uploads/pod-demo/**/*` (e-POD imza ve teslimat fotoğrafı demo görselleri)

Sunum sırasındaki çalışma zamanı değişiklikleri Vercel salt-okunur dosya sisteminde `lib/db.ts` (`__sunumEphemeralJsonDb`) ve `lib/system-config.ts` (`__sunumEphemeralSystemConfig`) üzerinden oturum boyunca bellekte kesintisiz çalışır; container soğuk başlangıcında temiz demo verisine döner.
