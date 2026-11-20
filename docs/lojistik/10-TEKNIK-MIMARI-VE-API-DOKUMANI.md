# Sunum ERP — Lojistik Suite Teknik Mimari, API Referansı & Güvenlik/Performans Raporu

**Sürüm:** `v1.0.0-lojistik`  
**Kapsam:** Faz 1 – Faz 8 Mimari Katmanları, Sağlayıcı Adaptörleri, Veri Modeli, API Sözleşmeleri, Güvenlik Sertleştirmeleri, `npm audit` Risk Raporu ve Ölçülen Yük/Stres Sonuçları

---

## 1. Katmanlı Mimari & Sağlayıcı Adaptör Tasarımı

```
┌──────────────────────────────────────────────────────────────────────────┐
│ 1. UI KATMANI (Next.js App Router — Dark Emerald / Zinc Tasarım Dili)    │
│ /dashboard, /wms, /wms/mobil, /satinalma, /filo, /sevkiyat, /surucu,     │
│ /omnichannel, /lojistik-raporlar, /tedarikci-portali, /takip/[token]     │
└──────────────────────────────────────────────────────────────────────────┘
                                    │ HTTP JSON / FormData
                                    ▼
┌──────────────────────────────────────────────────────────────────────────┐
│ 2. API & GÜVENLİK KATMANI (app/api/**)                                   │
│ - requireLogisticsAccess / requirePermission (401/403 + RBAC + Tedarikçi)│
│ - Feature Flag Bariyeri (5 Lojistik Bayrağı, Demo OFF varsayılan kapalı) │
│ - Kayan Pencere Hız Sınırlayıcı (lib/security/rateLimiter.ts -> 429)     │
│ - HMAC-SHA256 / API Key / CSPRNG Token Doğrulama + Upload/SVG Koruması   │
└──────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌──────────────────────────────────────────────────────────────────────────┐
│ 3. ALAN SERVİSLERİ & SAF MOTORLAR (lib/logistics/*)                      │
│ - wms/*       : Hiyerarşi, FEFO/FIFO, LPN/SSCC, Stok Defteri             │
│ - procurement/*: RFQ, Çok Kademeli PO, ASN, EOQ/ROP, OTD/PPM Skor        │
│ - returns/*   : RMA İade Politikası, KK, Alacak Dekontu, E-Ticaret Hook  │
│ - fleet/*     : Araç/Şoför KVKK, Yakıt Anomali, TCO/CO₂, 4 Telematik     │
│ - dispatch/*  : CVRPTW Rota Çözücü (2-Opt + Or-Opt), e-POD, Takip, E-Doc │
│ - notifications/* & reports/* & dashboard/*: 6 Uyarı Kuralı + XLSX/PDF   │
│ - providers/* : 6 Tak-Çalıştır Dış Entegrasyon Adaptörü                  │
└──────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌──────────────────────────────────────────────────────────────────────────┐
│ 4. VERİ ERİŞİM & SERVERLESS DAYANIKLILIK (lib/db.ts + lib/system-config) │
│ - PostgreSQL (Prisma ORM, 7 adet additive + rollback SQL migration)      │
│ - DevResilience JSON DB (.local-db.json) + EROFS Bellek Fallback         │
└──────────────────────────────────────────────────────────────────────────┘
```

### 1.1 6 Sağlayıcı Adaptör Arayüzü (`lib/logistics/providers/`)
1. `ILogisticsEDocumentProvider` (`efatura-irsaliye.ts`): `DemoDbEDocumentProvider` / `GibIntegratorEDocumentProvider`
2. `ILogisticsTelematicsProvider` (`telematics.ts` + `telematicsProfiles.ts`): Onaylı deklaratif profiller:
   - **Traccar:** `https://www.traccar.org/api-ref/` (Bearer token)
   - **flespi (Gurtam):** `https://flespi.io/docs/` (`FlespiToken` header)
   - **GpsGate Cloud:** `https://support.gpsgate.com/` (REST API token)
   - **Genel Webhook / CSV-JSON İçe Aktarma:** `INTERNAL` şema (HMAC-SHA256 / API Key, özel alan yolu eşleme destekli)
3. `ILogisticsRoutingProvider` (`routing.ts` + `cvrptwSolver.ts`): `LocalKeyFreeRoutingProvider` (saf TypeScript CVRPTW, zaman penceresi + kapasite + 2-Opt/Or-Opt) / `ExternalRoutingProvider`
4. `ILogisticsReturnWebhookProvider` (`ecommerce-returns.ts`): `DemoDbReturnWebhookProvider` / `ExternalWebhookReturnProvider`
5. `ILogisticsStorageProvider` (`object-storage.ts`): `LocalStorageProofProvider` (5 MB + PNG/JPG/WEBP/PDF sıkı doğrulama) / `ObjectStorageProofProvider` (S3/R2)
6. `ILogisticsEdiAsnProvider` (`edi-asn.ts`): `DemoDbEdiAsnProvider` / `ExternalEdiGatewayProvider`

---

## 2. Veritabanı Şeması ve Katkı Sağlayıcı (Additive) Migration Kaydı

Mevcut tablolarda hiçbir kolon silinmemiş, yeniden adlandırılmamış veya tipi değiştirilmemiştir. Tüm Lojistik migration'larının geri alma (`rollback.sql`) betikleri yazılmış ve doğrulanmıştır:

| Sıra | Migration Klasörü (`prisma/migrations/`) | Kapsam Özeti |
| :--- | :--- | :--- |
| 1 | `20261114153000_lojistik_altyapi_ve_tedarikci_rolu` | `Tedarikçi` rolü ve kapsam alanları (`User.supplierId` vb.) |
| 2 | `20261114170000_lojistik_faz2_wms_ve_defter` | Raf limitleri, `LojistikStockReservation`, `LojistikCrossDockOrder`, `LojistikKitOrder*`, `LojistikRfidTagEvent` |
| 3 | `20261114190000_lojistik_faz3_tedarikci_ve_satin_alma` | `LojistikSupplierItemLink`, `LojistikSupplierDocument`, `LojistikRfq*`, `LojistikPurchaseOrder*`, `LojistikSupplierAsn*`, `LojistikSupplierScore*`, `LojistikSupplierPortalInvite` |
| 4 | `20261116100000_lojistik_faz4_iade_ve_rma` | `LojistikRmaLine`, `LojistikRmaEventLog`, `LojistikRmaCreditNote`, `LojistikReturnPolicy`, `LojistikRmaWebhookLog` |
| 5 | `20261116150000_lojistik_faz5_filo` | `LojistikVehicle*`, `LojistikDriver`, `LojistikTrafficPenalty`, `LojistikVehicleMaintenance*`, `LojistikVehicleFaultLog`, `LojistikVehicleTire`, `LojistikFuelLog`, `LojistikCo2EmissionFactor`, `LojistikTelematic*` |
| 6 | `20261116180000_lojistik_faz6_sevkiyat_rota` | `LojistikShipmentTrip`, `LojistikShipmentStop`, `LojistikDeliveryProof`, `LojistikRouteOptimizationJob`, `LojistikTrackingEvent` |
| 7 | `20261117100000_lojistik_faz7_final` | `User.logisticsNotificationPrefsJson`, `EDocumentRecord.documentStatus` / `eInvoiceTimingMode`, `LojistikShipmentTrip.maintenanceImpactWarning`, `LojistikShipmentStop.eInvoice*`, `Order.eInvoice*` |

---

## 3. Lojistik API Uç Noktaları Sözleşmesi

| Uç Nokta | Metodlar | Yetki / Koruma Katmanı | İşlev Özeti |
| :--- | :--- | :--- | :--- |
| `/api/wms` | `GET`, `POST` | Demo OFF: Oturum + `wms`/`inventory` `read` (`401`/`403`); Faz 2 `?section=` ve tüm `POST` daima `requireLogisticsAccess` + non-supplier (`403`); `seed_reset` sadece Demo ON | WMS hiyerarşisi, görev sihirbazı, stok defteri (`queryStockLedger`), FEFO/FIFO, rezervasyon, cross-dock, LPN/SSCC, etiket, el terminali arama/sync |
| `/api/procurement` | `GET`, `POST` | `requireLogisticsAccess(lojistik_tedarikci)` + non-supplier (`403`) | Tedarikçi kartları, RFQ, çok kademeli PO, ASN kabul/kalite, EOQ/ROP, tek kaynak riski |
| `/api/omnichannel` | `GET`, `POST` | Demo OFF: Oturum + `omnichannel`/`lojistik_iade` `read` (`401`/`403`); Faz 4 `?section=` daima `requireLogisticsAccess`; `POST` her zaman yetkili iç personel (`401`/`403`); `seed_reset` sadece Demo ON | Kanal senkronizasyonu, parçalı sevkiyat, RMA yaşam döngüsü, kalite muayenesi, alacak dekontu, E-Belge, RMA etiket payload |
| `/api/filo` | `GET`, `POST` | `requireLogisticsAccess(lojistik_filo)` + non-supplier (`403`) | Araç/şoför CRUD (KVKK maskeli), bakım plan/iş emri, arıza→sefer uyarı senkronu, yakıt/TCO/CO₂, 4 telematik profili & cihaz eşleme |
| `/api/sevkiyat` | `GET`, `POST` | `requireLogisticsAccess(lojistik_sevkiyat_rota)` (sürücü kapsam desteğiyle) + non-supplier (`403`) | Durak havuzu, CVRPTW tek/çok araç rota planlama, sefer onay + E-İrsaliye, sürücü e-POD, "Tek Tıkla E-Fatura Kes", zamanlama politikası ayarı |
| `/api/logistics/dashboard-summary` | `GET` | Oturum (`401`) + non-supplier (`403`) + rol/bayrak filtrelemesi | Kullanıcının yetkili olduğu açık modüllerin anlık KPI özeti |
| `/api/logistics/reports` | `GET` | Oturum (`401`) + non-supplier (`403`) + modül yetki/bayrak doğrulaması (`403`) | 5 modül raporu önizleme, grafik serisi ve filtre seçenekleri |
| `/api/notifications/preferences` | `GET`, `PATCH`, `POST` | Oturum (`401`) | 6 lojistik bildirim kuralı kişisel tercih yönetimi ve manuel tarama |
| `/api/logistics/pods/[...key]` | `GET` | Dizin geçişi (`..`) blokajı (`403`), izinli uzantı beyaz listesi (`403`), `X-Content-Type-Options: nosniff`, `.svg` için `Content-Security-Policy: sandbox` & `Content-Disposition: attachment` | e-POD imza/fotoğraf/belge güvenli sunumu |
| `/api/supplier-portal` | `GET`, `POST` | `requireSupplierPortalScope` + `checkRateLimit(40/dk)` + 10 MB / beyaz liste (`pdf,png,jpg,jpeg,webp,doc,docx,xls,xlsx`) | Dış tedarikçinin yalnız kendi PO/RFQ/ASN/belge işlemleri |
| `/api/supplier-portal/auth` & `invite/exchange` | `POST`, `DELETE` | `checkRateLimit(20/dk -> 429)`, CSPRNG tek kullanımlık davet jetonu | Dış tedarikçi oturum yönetimi |
| `/api/takip/[token]` | `GET` | `assertLogisticsFeatureEnabled(lojistik_sevkiyat_rota)`, `checkRateLimit(60/dk -> 429)`, 192-bit CSPRNG token, süre aşımında `410 GONE` | Harici müşteri sipariş takip görünümü |
| `/api/webhooks/omnichannel` | `GET`, `POST` | `checkRateLimit(60/dk -> 429)`; `RETURN_REQUEST` her ortamda HMAC; Demo OFF'ta `ORDER_CREATED` ve `SHIPMENT_STATUS_UPDATE` dahil fail-closed HMAC (`401`) | Trendyol/Hepsiburada/Shopify/Kargo webhook alıcısı |
| `/api/webhooks/telematics` | `POST` | `assertLogisticsFeatureEnabled(lojistik_filo)`, `checkRateLimit(180/dk -> 429)`, HMAC-SHA256 / API Key / Bearer (`401`) | 4 onaylı telematik profili webhook alıcısı |
| `/api/edi/asn` | `POST` | `x-edi-api-key` (`401`) veya `requireLogisticsAccess(lojistik_tedarikci)`, `checkRateLimit(60/dk -> 429)` | Harici EDI `DESADV` ASN alıcısı |

---

## 4. `npm audit --omit=dev` Güvenlik Risk Raporu (Paket Yükseltmesiz)

Faz 8 kararı uyarınca mevcut bağımlılıklar geriye dönük uyumluluğu korumak adına yükseltilmemiştir; `npm audit --omit=dev` çalıştırmasından gözlemlenen mevcut **22 açık bulgu (10 moderate, 12 high)** aşağıda risk/telafi durumuyla belgelenmiştir:

| Paket | Önem | Bulgu Özeti | Uygulanan Mimari Telafi & Öneri |
| :--- | :--- | :--- | :--- |
| `next` (`16.0.0 - 16.4.4`) | Moderate | `use cache`/Edge çerez ve SVG görsel iyileştirme atlatmaları | ERP dinamik oturum API'lerinde `no-store`/per-request oturum doğrulaması ve `images: { unoptimized: true }` kullanılmakta; bakım penceresinde kararlı minor sürüme yükseltilebilir. |
| `xlsx` (`0.18.5`) | High | SheetJS Prototype Pollution & ReDoS (`GHSA-4r6h-8v6p-xvw6`, `GHSA-5pgg-2g8v-p4x9`) | **Yalnızca sunucu verisinden dışa aktarım (`XLSX.write` / `json_to_sheet`) için kullanılır; güvensiz kullanıcı `.xlsx` dosyası sunucuda ayrıştırılmaz.** |
| `sharp` (`<=0.35.5-rc.1`) | High | `libvips`/`libheif`/`librsvg` yerli kütüphane açıkları | Görsel optimizasyon kapalıdır (`unoptimized: true`) ve e-POD/portal yüklemeleri `.svg` yüklemesini reddeder. |
| `dompurify` (`<=3.4.16`) | Moderate | Rawtext/SMIL/shadow-root edge XSS bulguları | Harici dosya sunumunda `nosniff` + `sandbox` uygulanır; gelecek minor güncelleme ile kapatılabilir. |
| `@tiptap/core`, `prosemirror-view`, `markdown-it`, `linkify-it` | High | Editör / Markdown parse ReDoS ve paste XSS | Zengin metin alanları şirket içi doğrulamalı kullanıcılara kısıtlıdır; lojistik modülleri düz/tiplendirilmiş veri alanları kullanır. |
| `zod` (`<4.6.6`) | High | Dev boyutlu koleksiyon bellek tüketimi | Tüm harici/portal API uçlarında yük boyutu ve kayan pencere `429` hız sınırı uygulanır. |
| `glob`, `minimatch`, `archiver`, `archiver-utils`, `zip-stream`, `brace-expansion`, `browserslist`, `baseline-browser-mapping`, `file-type`, `js-yaml`, `lodash`, `source-map-js`, `uuid` | Mod/High | Ağırlıklı olarak derleme, yedekleme arşiv araçları ve geçişli (transitive) bağımlılıklar | Sadece iç/admin veya build süreçlerinde yer alır; genel internet trafiğine açık yollarda doğrudan çalıştırılmaz. Planlı bakım penceresinde major/minor güncelleme önerilir. |

---

## 5. Ölçülen Performans ve Yük/Stres Sonuçları (`scripts/test-lojistik-faz8-yayin-guvenlik-perf.ts`)

Tüm ölçümler `Sunum ERP` gerçek servisleri ve JSON DB katmanı üzerinde (`lib/db.ts` `findMany` `O(N)->O(1)` tek-okuma iyileştirmesi sonrası) doğrudan kaydedilmiştir:

| Benchmark Senaryosu | Test Kapsamı / Hacim | Ölçülen Süre | Sonuç / Not |
| :--- | :--- | :--- | :--- |
| **CVRPTW Çok Araçlı Rota Çözümü** | 250 Durak, 10 Araç, kapasite + soğutucu + zaman penceresi (`timeBudgetMs: 2500`) | **157.9 ms** | 250/250 durak atandı (`3171.2 km → 1925.3 km`) |
| **Filo Telematik & Harita Projeksiyonu** | 100 araçlık `TRACCAR` paketi + Mercator normalizasyon | **8.11 ms** | Doğrusal ölçekli, 0 hata |
| **1.000 Satırlı Stok Defteri Sayfalama** | 1.000 sentetik hareket içinde sayfa 1 & sayfa 20 (`pageSize: 50`) | **220.8 ms** | `lib/db.ts` tek-okuma `findMany` sonrası 0 takılma |
| **1.000 Satırlı Rapor Excel + PDF Export** | 1.000 satırlı rapor -> `.xlsx` (`204.5 KB`) + `.pdf` (`533.6 KB`) | **1425.7 ms** | Geçerli `PK` (ZIP) ve `%PDF-` ikili çıktıları |
| **Tekil `/dashboard` Yönetim Özeti** | `getLogisticsExecutiveSummaryForUser` (5 modül KPI) | **562.7 ms** | Rol + bayrak filtreli canlı toplama |
| **50 Eşzamanlı Karışık Servis Çağrısı** | `Promise.all` (Yönetim Özeti + Defter + Filo TCO) | **14597.7 ms** *(Ort. `292.0 ms/çağrı`)* | 50/50 başarılı (`220.8 ms` defter, `1425.7 ms` XLSX+PDF, `562.7 ms` tekil özet) |
| **HTTP Yük — Demo ON (100 İstek)** | `http://localhost:3114` üzerinde 100 eşzamanlı `GET /api/wms` (`next start`) | **32043.2 ms** | 100/100 HTTP `200`, 0 hata |
| **HTTP Yük — Demo OFF Aktif (100 İstek)** | `http://localhost:3115` üzerinde 100 eşzamanlı yetkili `GET /api/logistics/dashboard-summary` | **58413.4 ms** | 100/100 HTTP `200`, 0 hata |
