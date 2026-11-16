# Lojistik Faz 3 — Tedarikçi Yönetimi, RFQ/PO, ASN/EDI, EOQ/ROP ve Tedarikçi Portalı Derinleştirme

## 1. Genel Özet ve Mimari Kararlar

Faz 3 (`feature/lojistik-faz3-tedarikci` dalı, `feature/lojistik-faz2-wms` üzerine kurulu), Sunum ERP içindeki mevcut `/dashboard/satinalma` modülünü silmeden ve public API sözleşmelerini bozmadan yerinde genişletir; ayrıca dış tedarikçi firmalar için rol ve kayıt düzeyinde izole edilmiş hibrit Tedarikçi Portalı'nı (`/tedarikci-portali`, `/portal/tedarikci/[token]`) ve Faz 2 WMS Mal Kabul köprüsünü devreye alır.

Temel ilkeler:
- **Geriye Dönük Uyumluluk:** Mevcut `Supplier`, `ReorderPolicy` ve `PurchaseRequisition` modelleri üzerine yalnızca additive + geri alınabilir kolonlar eklenmiştir. `CriticalStockRopTable` gibi mevcut istemci akışları (`buildLegacyReqInput` adaptasyonu) çalışmaya devam eder.
- **Sağlayıcı Adaptörü (Provider Adapter):** Harici EDI DESADV mesajları (`app/api/edi/asn/route.ts`) `ILogisticsEdiAsnProvider` arayüzü arkasında `demo-db` (`DemoDbEdiAsnProvider`) ve `external-rest` (`ExternalEdiGatewayProvider`) modlarıyla yönetilir.
- **Tek Anahtarla Kapanabilen Demo Katmanı:** Tüm demo hızlı giriş ve admin↔tedarikçi perspektif geçiş bileşenleri `*demo*` dosyalarında izole edilmiştir ve `isDemoEnvironment()` bayrağı ile yönetilir.

---

## 2. Eklenen ve Derinleştirilen Dosyalar

### Veritabanı & Şema
- [migration.sql](file:///c:/Users/%21/Desktop/Sunum%20ERP/prisma/migrations/20261114190000_lojistik_faz3_tedarikci_ve_satin_alma/migration.sql) & [rollback.sql](file:///c:/Users/%21/Desktop/Sunum%20ERP/prisma/migrations/20261114190000_lojistik_faz3_tedarikci_ve_satin_alma/rollback.sql)
  - `Supplier` (+12 kolon: `glnNumber`, `category`, `criticalityLevel`, `approvalStatus`, `blacklistedReason`, `paymentTermsLabel`, `taxOffice`, `iban`, `notes`, `scorecardScore`, `scorecardTier`, `isAlternativeReady`)
  - `ReorderPolicy` (+4 kolon: `annualDemand`, `orderingCostTry`, `holdingCostTry`, `unitCostTry`)
  - `PurchaseRequisition` (+10 kolon: `poNumber`, `rfqId`, `rfqNo`, `approvalTier`, `requiredApprovalTier`, `dispatchedAt`, `dispatchedChannel`, `supplierConfirmedStatus`, `supplierResponseNote`, `promisedDeliveryDate`)
  - 14 yeni `Lojistik*` tablosu: `LojistikSupplierItemLink`, `LojistikSupplierDocument`, `LojistikRfq`, `LojistikRfqItem`, `LojistikRfqQuote`, `LojistikRfqQuoteLine`, `LojistikPurchaseOrder`, `LojistikPurchaseOrderLine`, `LojistikPoApprovalStep`, `LojistikSupplierAsn`, `LojistikSupplierAsnLine`, `LojistikSupplierScoreConfig`, `LojistikSupplierScoreSnapshot`, `LojistikSupplierPortalInvite`.
- [schema.prisma](file:///c:/Users/%21/Desktop/Sunum%20ERP/prisma/schema.prisma) & [db.ts](file:///c:/Users/%21/Desktop/Sunum%20ERP/lib/db.ts) (JSON DB modelleri ve ilişkili `include` çözümlemeleri)

### Domain Servisleri (`lib/logistics/procurement/`)
- [index.ts](file:///c:/Users/%21/Desktop/Sunum%20ERP/lib/logistics/procurement/index.ts) (ortak dışa aktarım)
- [constantsAndHelpers.ts](file:///c:/Users/%21/Desktop/Sunum%20ERP/lib/logistics/procurement/constantsAndHelpers.ts) (GLN-13 Mod-10, EOQ/SS/ROP, çok kademeli PO onay matrisi, skor kartı bileşik puan yardımcıları)
- [supplierMasterService.ts](file:///c:/Users/%21/Desktop/Sunum%20ERP/lib/logistics/procurement/supplierMasterService.ts) (tedarikçi yaşam döngüsü, belge kasası, SKU-tedarikçi bağlantısı, tek-kaynak riski, EOQ politika güncellemesi)
- [scorecardService.ts](file:///c:/Users/%21/Desktop/Sunum%20ERP/lib/logistics/procurement/scorecardService.ts) (ağırlık toplamı `100` doğrulaması ve `LIVE` + geçmiş aylık skor kartı hesaplaması)
- [rfqAndPoService.ts](file:///c:/Users/%21/Desktop/Sunum%20ERP/lib/logistics/procurement/rfqAndPoService.ts) (çok kalemli RFQ, teklif kıyas matrisi, 1-tık ihale→PO, çok kademeli PO onayı, sevkiyat iletimi, tedarikçi PO yanıtları, `convertReorderPolicyToPo`)
- [asnAndReceivingService.ts](file:///c:/Users/%21/Desktop/Sunum%20ERP/lib/logistics/procurement/asnAndReceivingService.ts) (Portal/ERP ASN, harici EDI DESADV içe aktarma, Faz 2 `receiveAsnIntoWms` köprüsü)
- [inviteToken.ts](file:///c:/Users/%21/Desktop/Sunum%20ERP/lib/logistics/procurement/inviteToken.ts) & [portalService.ts](file:///c:/Users/%21/Desktop/Sunum%20ERP/lib/logistics/procurement/portalService.ts) (HMAC davet tokenı üretme/doğrulama/iptal, tedarikçi portal oturumu, snapshot ve aksiyonlar)
- [demoPortalHelper.ts](file:///c:/Users/%21/Desktop/Sunum%20ERP/lib/logistics/procurement/demoPortalHelper.ts) (`isDemoEnvironment()` korumalı demo hızlı giriş ve admin↔tedarikçi perspektif geçiş yardımcıları)
- [apiHandlers.ts](file:///c:/Users/%21/Desktop/Sunum%20ERP/lib/logistics/procurement/apiHandlers.ts) (`/api/procurement` `GET`/`POST` işleyicileri ve geriye dönük `buildLegacyReqInput` adaptörü)

### Sağlayıcılar, API Rotaları ve Faz 2 Köprüleri
- [edi-asn.ts](file:///c:/Users/%21/Desktop/Sunum%20ERP/lib/logistics/providers/edi-asn.ts), [providers/index.ts](file:///c:/Users/%21/Desktop/Sunum%20ERP/lib/logistics/providers/index.ts), [types.ts](file:///c:/Users/%21/Desktop/Sunum%20ERP/lib/logistics/types.ts)
- [route.ts](file:///c:/Users/%21/Desktop/Sunum%20ERP/app/api/edi/asn/route.ts) (`POST /api/edi/asn` — `InventoryApiKey` `keyPrefix` doğrulamalı veya yetkili ERP kullanıcı oturumlu harici EDI DESADV uç noktası)
- [procurement/route.ts](file:///c:/Users/%21/Desktop/Sunum%20ERP/app/api/procurement/route.ts)
- Tedarikçi Portalı API uçları:
  - [route.ts](file:///c:/Users/%21/Desktop/Sunum%20ERP/app/api/supplier-portal/route.ts)
  - [auth/route.ts](file:///c:/Users/%21/Desktop/Sunum%20ERP/app/api/supplier-portal/auth/route.ts)
  - [demo/route.ts](file:///c:/Users/%21/Desktop/Sunum%20ERP/app/api/supplier-portal/demo/route.ts)
  - [invite/route.ts](file:///c:/Users/%21/Desktop/Sunum%20ERP/app/api/supplier-portal/invite/route.ts)
  - [invite/exchange/route.ts](file:///c:/Users/%21/Desktop/Sunum%20ERP/app/api/supplier-portal/invite/exchange/route.ts)
- Faz 2 WMS & Auth bağlantıları:
  - [operationsEngine.ts](file:///c:/Users/%21/Desktop/Sunum%20ERP/lib/logistics/wms/operationsEngine.ts) & [apiHandlers.ts](file:///c:/Users/%21/Desktop/Sunum%20ERP/lib/logistics/wms/apiHandlers.ts) (`section=open_asns`, `processGoodsReceiptWithVariance` → `applyGoodsReceiptToAsnAndPo`)
  - [app/api/auth/me/route.ts](file:///c:/Users/%21/Desktop/Sunum%20ERP/app/api/auth/me/route.ts), [permissions.ts](file:///c:/Users/%21/Desktop/Sunum%20ERP/lib/auth/permissions.ts), [security.ts](file:///c:/Users/%21/Desktop/Sunum%20ERP/lib/logistics/security.ts)

### Arayüz Modülleri
- [page.tsx](file:///c:/Users/%21/Desktop/Sunum%20ERP/app/dashboard/satinalma/page.tsx) (mevcut satınalma sayfasının 8 sekmeli yerinde genişletmesi)
- [SupplierMasterScorecardTab.tsx](file:///c:/Users/%21/Desktop/Sunum%20ERP/app/dashboard/satinalma/components/SupplierMasterScorecardTab.tsx)
- [RfqComparisonTab.tsx](file:///c:/Users/%21/Desktop/Sunum%20ERP/app/dashboard/satinalma/components/RfqComparisonTab.tsx)
- [MultiTierPoAndEoqTab.tsx](file:///c:/Users/%21/Desktop/Sunum%20ERP/app/dashboard/satinalma/components/MultiTierPoAndEoqTab.tsx)
- [AsnAndRiskTabs.tsx](file:///c:/Users/%21/Desktop/Sunum%20ERP/app/dashboard/satinalma/components/AsnAndRiskTabs.tsx)
- [WmsWorkflowStepper.tsx](file:///c:/Users/%21/Desktop/Sunum%20ERP/app/dashboard/wms/components/WmsWorkflowStepper.tsx) (`PO Mal Kabul` modalında `data-testid="wms-asn-prefill-select"` / `"Açık ASN İhbarından Ön Doldur"`)
- [app/dashboard/layout.tsx](file:///c:/Users/%21/Desktop/Sunum%20ERP/app/dashboard/layout.tsx) (`isSupplierOnlyAccount` kontrolü)
- Tedarikçi Portalı: [tedarikci-portali/layout.tsx](file:///c:/Users/%21/Desktop/Sunum%20ERP/app/tedarikci-portali/layout.tsx), [tedarikci-portali/page.tsx](file:///c:/Users/%21/Desktop/Sunum%20ERP/app/tedarikci-portali/page.tsx), [portal/tedarikci/[token]/page.tsx](file:///c:/Users/%21/Desktop/Sunum%20ERP/app/portal/tedarikci/%5Btoken%5D/page.tsx)
- Demo Portal Bileşenleri: [SupplierPortalDemoComponents.tsx](file:///c:/Users/%21/Desktop/Sunum%20ERP/components/demo/SupplierPortalDemoComponents.tsx)

### Seed ve Test Betikleri
- [faz3-tedarikci-ve-satinalma.ts](file:///c:/Users/%21/Desktop/Sunum%20ERP/lib/logistics/seed/faz3-tedarikci-ve-satinalma.ts) & [seed/index.ts](file:///c:/Users/%21/Desktop/Sunum%20ERP/lib/logistics/seed/index.ts)
- [test-lojistik-faz3-tedarikci.ts](file:///c:/Users/%21/Desktop/Sunum%20ERP/scripts/test-lojistik-faz3-tedarikci.ts)
- [test-lojistik-faz3-http-e2e.ts](file:///c:/Users/%21/Desktop/Sunum%20ERP/scripts/test-lojistik-faz3-http-e2e.ts)

---

## 3. Domain Formülleri ve İş Kuralları

1. **GS1 GLN-13 Mod-10 (`generateGln13`, `validateGln13`):** 13 haneli Global Location Number formatı ve son kontrol basamağı doğrulaması zorunludur; hatalı veya manipüle edilmiş GLN ile tedarikçi kaydı domain hatasıyla reddedilir.
2. **Tedarikçi Durumları & Kara Liste Engeli:** Durumlar `ONAYLI`, `ASKIDA`, `KARALISTE`, `ADAY` olarak yönetilir. `KARALISTE` durumunda `blacklistedReason` alanı zorunludur; kara listedeki veya pasif tedarikçiye RFQ daveti gönderilmesi ve PO açılması engellenir.
3. **RFQ Kıyaslama Matrisi & İhale Ödülü:** Çok kalemli RFQ'ya tedarikçilerden kalem + navlun bazlı teklif (`LojistikRfqQuote`) toplanır; sistem `cheapestQuoteId`, `fastestQuoteId` ve `recommendedQuoteId` metriklerini üretir ve tek tıkla PO'ya dönüştürür (`awardRfqAndConvertToPo`).
4. **Çok Kademeli PO Onay Matrisi (`resolvePoApprovalPlan`):**
   - **Tier 1:** `< ₺25.000` ve `NORMAL` → 1 onay adımı
   - **Tier 2:** `>= ₺25.000` (veya `CRITICAL` tedarikçi için `>= ₺15.000`) → 2 onay adımı
   - **Tier 3:** `>= ₺75.000` → 3 onay adımı
   - İletim kanalları: `PORTAL`, `EMAIL`, `EDI`. Tedarikçi PO yanıtları: `ONAYLANDI`, `KISMI_ONAY`, `RED_BAYRAK` (`RED_BAYRAK` yanıtında gerekçe zorunludur).
5. **ASN + Faz 2 WMS Mal Kabul Köprüsü:** Portal, ERP veya harici EDI DESADV üzerinden gelen ASN kayıtları `/dashboard/wms` ekranındaki `PO Mal Kabul` modalında (`[data-testid="wms-asn-prefill-select"]`, `"Açık ASN İhbarından Ön Doldur"`) seçilebilir. Mal kabul (`processGoodsReceiptWithVariance` → `applyGoodsReceiptToAsnAndPo`) tamamlandığında ASN `KABUL_TAMAM` olur, ilgili PO kabul miktarı/durumu güncellenir, EDI kaynağı için `acknowledgeAsnReceipt` çağrılır ve `recalculateSupplierScorecard` tetiklenir.
6. **Ayarlanabilir Tedarikçi Skor Kartı:** `otdWeight + qtyWeight + qualityWeight + priceWeight === 100` kuralı uygulanır. `recalculateSupplierScorecard`, `LojistikPurchaseOrder` ve `RECEIVING` tipindeki `uretimQualityInspection` kayıtlarından canlı (`LIVE`) ve geçmiş dönem skor özetlerini hesaplar (`computeCompositeScorecard` → puan ve A/B/C/D katmanı).
7. **Tek-Kaynak Riski & EOQ / Güvenlik Stoğu / ROP:** Aktif SKU başına onaylı tedarikçi sayısı `<= 1` ise tek-kaynak riski raporlanır (`getSingleSourceRiskReport`) ve tek tıkla alternatif tedarikçi linklenir. `computeEoqAndRopMetrics` formülü (`EOQ = sqrt(2 * D * S / H)` vb.) ile hesaplanan yenileme ihtiyaçları `convertReorderPolicyToPo` üzerinden tek tıkla PO'ya çevrilir.

---

## 4. `/api/procurement`, `"Tedarikçi"` Rolü Güvenlik Sıkılaştırması ve Geri Alma (Rollback)

Faz 3 ile harici tedarikçi hesaplarının şirket içi ERP modüllerine ve diğer tedarikçilerin verilerine erişmesini önlemek için katmanlı kapsam izolasyonu uygulanmıştır:

- **RBAC Daraltması (`lib/auth/permissions.ts`):** `DEFAULT_ROLES["Tedarikçi"]` içinden `dashboard`, `satinalma` ve `chat` izinleri kaldırılarak yalnızca `lojistik_tedarikci: ["read", "create", "update"]` ve `tedarikci_portali: ["read", "create", "update"]` yetkileri bırakılmıştır.
- **Dashboard Rota Koruması (`app/dashboard/layout.tsx` & `app/api/auth/me/route.ts`):** `/api/auth/me` yanıtına `supplierId` alanı eklendi. `DashboardLayout` içindeki `isSupplierOnlyAccount` kontrolü, süper admin veya platform geliştirici olmayan `"Tedarikçi"` rolündeki oturumları otomatik olarak `/tedarikci-portali` adresine yönlendirir.
- **Kapsam & Cross-Tenant İzolasyonu (`lib/logistics/security.ts`):** `assertSupplierRecordAccess`, `isSupplierScoped` oturumlarda kayıt `supplierId` değerinin oturumun kendi `supplierId` değeriyle eşleşmemesi durumunda `403 FORBIDDEN_SUPPLIER_SCOPE` döndürür. `"Tedarikçi"` rolündeki bir kullanıcı:
  - `/api/procurement` ve `/api/edi/asn` uç noktalarına eriştiğinde `403` alır,
  - Başka bir tedarikçiye ait PO/ASN kaydına `/api/supplier-portal` üzerinden müdahale etmeye çalıştığında `403 FORBIDDEN_SUPPLIER_SCOPE` alır,
  - `/api/supplier-portal/demo` perspektif yükseltme aksiyonlarında `403` ile durdurulur.
- **Gerçek Oturum İptali & Davet Tokenları:** `/api/supplier-portal/auth` üzerinde `bcrypt` şifre doğrulaması yapılır ve `DELETE` çıkışında `UserSession` kaydı `{ isActive: false, revokedAt: new Date() }` olarak iptal edilir; çıkış sonrası eski JWT ile yapılan istekler `401` döner. Süresi dolabilen HMAC imzalı davet linkleri (`/api/supplier-portal/invite` ve `/invite/exchange`) yalnızca hedeflenen `supplierId` kapsamıyla portal oturumu açar ve bu oturum da `/api/procurement` üzerinde `403` ile sınırlandırılır.

### Güvenlik Sıkılaştırması Geri Alma (Rollback) Talimatı
Eski geniş `"Tedarikçi"` rol davranışına dönmek gerekirse:
1. `lib/auth/permissions.ts` içindeki `DEFAULT_ROLES["Tedarikçi"]` nesnesine eski `dashboard: ["read"]`, `satinalma: ["read"]`, `chat: ["read", "create"]` izinlerini geri ekleyin.
2. `app/dashboard/layout.tsx` içindeki `isSupplierOnlyAccount` yönlendirme bloğunu (`router.replace("/tedarikci-portali")`) kaldırın.
3. Veritabanı ve demo verisi geri alması için aşağıdaki rollback komutlarını uygulayın.

---

## 5. Tek Anahtarla Kapanan Demo Katmanı (`isDemoEnvironment()`)

Demo kolaylaştırıcıları ürün kodundan ayrı tutularak yalnızca `*demo*` adlandırmalı dosyalarda konumlandırılmıştır:
- `components/demo/SupplierPortalDemoComponents.tsx`
- `lib/logistics/procurement/demoPortalHelper.ts`
- `app/api/supplier-portal/demo/route.ts`

Ortam değişkenleriyle (`DISABLE_DEMO_MODE=true` veya `ENABLE_DEMO_MODE=false`) demo modu kapatıldığında:
- `GET /api/system-config` yanıtında `logisticsDemoMode: false` döner.
- `/api/supplier-portal/demo` (`GET` ve `POST`) tüm isteklerde HTTP `403` (`code: "DEMO_MODE_DISABLED"`) döner.
- `DemoPortalLoginBox`, `DemoPortalGuideCard`, `ErpPerspectiveSwitchButton` ve `DemoSupplierPerspectiveBar` bileşenleri render edilmez.
- Gerçek kullanıcı adı/şifre ile portal girişi (`POST /api/supplier-portal/auth`) kesintisiz çalışmaya devam eder.

---

## 6. Seed, Rollback ve Demo Kimlikleri

- **Tüm Lojistik Demo Seed'ini Çalıştırma (Idempotent):**
  ```bash
  npm run seed:logistics
  ```
- **Tüm Lojistik Demo Seed'ini Geri Alma:**
  ```bash
  npm run seed:logistics:rollback
  ```
- **Veritabanı SQL Migration Geri Alma:**
  `prisma/migrations/20261114190000_lojistik_faz3_tedarikci_ve_satin_alma/rollback.sql` dosyasını PostgreSQL veritabanında çalıştırın.
- **Demo Tedarikçi Portal Hesapları (Seed sonrası):**
  - `tedarikci.royal` / `demo123` (`sup-holland-01` — Royal Flowers)
  - `tedarikci.yalova` / `demo123` (`sup-yalova-02` — Yalova Fide & Çelik)

---

## 7. Doğrulama Sonuçları ve Bilinen Sınırlar / Blokajlar

- **Seed / Idempotency / Rollback:** `faz3-tedarikci-ve-satinalma.ts` düzeltilmiş haldeyken `npm run seed:logistics:rollback` + `npm run seed:logistics` + idempotent ikinci `npm run seed:logistics` (`atlandı=102`, `Mevcut Veri Bütünlüğü: TAM (%100 korundu)`) çıkış kodu `0` ile doğrulandı; ancak harici bir süreç/düzenleyici tamponu dosyayı sonraki dakikalarda `59384` baytlık eski (`id`, `seededIds`, `moduleId`, `skippedExisting: {}`) haline geri yazmaya devam ettiği için şu an diskteki `faz3-tedarikci-ve-satinalma.ts` ile `npm run seed:logistics` çalıştırıldığında `Cannot convert undefined or null to object` hatası alınmaktadır. Yerel `.local-db.json` veritabanı son başarılı `seed:logistics` koşusundan kalma tam Faz 1+2+3 seed verisini korumaktadır.
- **TypeScript (`tsc --noEmit`):** Düzeltme uygulandığı anda tüm Faz 3 dosya ve dokunulan dosyalarda (`lib/logistics/`, `app/api/procurement`, `app/api/supplier-portal`, `app/api/edi/`, `app/api/auth/me`, `app/dashboard/satinalma`, `app/dashboard/wms`, `app/tedarikci-portali`, `app/portal/tedarikci`, `components/demo`, `scripts/test-lojistik-faz3`, `lib/auth/permissions`, `lib/db.ts`, `app/dashboard/layout.tsx` satır `920`) `0` derleme hatası gözlenmiştir (`faz3-tedarikci-ve-satinalma.ts` dış geri yazma öncesi; geri yazma sonrasında yalnızca `faz3-tedarikci-ve-satinalma.ts` satır `260`'ta `TS2322` raporlanır).
- **Production Build:** `npx next build --webpack` (`VERCEL=1`, `SUNUM_DISABLE_CRON=1`) son kaynak düzenlemelerinin ardından `183/183` rota derlenerek çıkış kodu `0` ile tamamlandı.
- **Otomatik Domain & Güvenlik Test Paketi:** `npx cross-env SUNUM_DISABLE_CRON=1 npx tsx scripts/test-lojistik-faz3-tedarikci.ts` ile `12/12` test senaryosu (Faz 1-3 SQL migration/rollback, GLN-13, EOQ/SS/ROP, Skor Kartı, çok kademeli PO, kara liste engelleri, uçtan uca RFQ→PO→Portal→ASN/EDI→WMS→Skor Kartı, tek-kaynak riski, EOQ→PO, HMAC davet/iptal/sahteleme, Demo kilitleri ve `403 FORBIDDEN_SUPPLIER_SCOPE`) çıkış kodu `0` ile geçti.
- **Canlı Production Sunucusu HTTP E2E Testleri (son `.next` derlemesi üzerinde):**
  - **Demo ON (`http://localhost:3102`):** `npx cross-env SUNUM_DISABLE_CRON=1 npx tsx scripts/test-lojistik-faz3-http-e2e.ts --mode=demo-on --url=http://localhost:3102` → `6/6` başarılı (`401` kimliksiz koruma, Demo ON bayrakları, `tedarikci.royal` gerçek giriş + çıkışta JWT iptali, `tedarikci.yalova` çapraz izolasyon, admin perspektif geçişi/geri dönüşü + EDI/WMS/davet, `/dashboard/*` ve `/tedarikci-portali` HTTP `200 OK`).
  - **Demo OFF (`http://localhost:3103`, `DISABLE_DEMO_MODE=true ENABLE_DEMO_MODE=false`):** `npx cross-env SUNUM_DISABLE_CRON=1 npx tsx scripts/test-lojistik-faz3-http-e2e.ts --mode=demo-off --url=http://localhost:3103` → `2/2` başarılı (`logisticsDemoMode=false`, `/api/supplier-portal/demo` HTTP `403 DEMO_MODE_DISABLED`, gerçek `tedarikci.royal` girişi HTTP `200 OK`); `/tedarikci-portali` ve `/portal/tedarikci/invalid-check` SSR yanıtları HTTP `200 OK`.
- **Tarayıcı Alt Ajanı (Chrome DevTools) Sınırı:** Oturum ortamında uzaktan hata ayıklama portlu Google Chrome çalışmadığından (`Could not find DevToolsActivePort ... ENOENT`) `browser` alt ajanı `BLOCKED` durumuna düştü; bu nedenle buton tıklamaları ve görsel DOM akışları Chrome DevTools üzerinden yürütülemedi.
