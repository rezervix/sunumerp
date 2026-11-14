# Lojistik ve Depo Yönetimi — Faz 2: Depo & WMS Derinleştirmesi ve Stok Defteri

**Tarih:** 2026-11-14  
**Dal (Branch):** `feature/lojistik-faz2-wms`  
**Temel (Base):** Faz 1 (`feature/lojistik-faz1-altyapi`)  
**Kapsam:** Faz 2 (`lojistik_wms`) — Mevcut `/dashboard/wms`, `/dashboard/wms/mobil` ve `/dashboard/stok` ekranlarının korunarak yerinde derinleştirilmesi; 4 seviyeli depo hiyerarşisi ve 7 lokasyon rolü; FIFO/FEFO ve karantina/SKT/blokaj izolasyonu; üretim rezervasyonlarıyla çakışmasız açık `LojistikStockReservation`; GS1 Mod-10 SSCC-18 ve yazdırılabilir QR/Code-128 etiketleme; Cross-Docking, Kitting, Put-Away, Wave Pick, `IN_TRANSIT`/`DISCREPANCY` transfer, toleranslı döngüsel sayım ve değişmez stok defteri (`idempotencyKey`); `@zxing/browser` kameralı el terminali ve çakışma kontrollü çevrimdışı eşitleme; `/api/wms/rfid` ve gerçek veritabanı KPI hesaplaması.

---

## 1. Değiştirilen ve Eklenen Dosyalar Envanteri

### 1.1 Yeni Oluşturulan Dosyalar

| Dosya | Sorumluluk |
| --- | --- |
| `prisma/migrations/20261114170000_lojistik_faz2_wms_ve_defter/migration.sql` | Mevcut 11 WMS/stok tablosuna eklemeli (nullable/default) kolonlar ve 5 yeni `Lojistik*` tablosu ekler. |
| `prisma/migrations/20261114170000_lojistik_faz2_wms_ve_defter/rollback.sql` | Eklenen 5 `Lojistik*` tablosunu, indeksleri ve kolonları geri alan rollback SQL dosyası. |
| `lib/logistics/wms/constantsAndHelpers.ts` | Client-safe WMS tipleri (`WmsBinRole`, `WmsPickPolicy`, `WmsReservationStatus`, `WmsReservationSourceType`, `WmsCrossDockStatus`, `WmsKitStatus`), `WMS_BIN_ROLE_LABELS`, GS1 Mod-10 check-digit ve `generateSscc18Code` / `validateSscc18Code` yardımcıları. |
| `lib/logistics/wms/stockLedgerService.ts` | Tek doğruluk kaynaklı `recordStockLedgerEntry`, FIFO/LIFO/Ortalama maliyet katmanı güncellemesi, `LotSerialRecord` + izlenebilirlik eşitlemesi, `StorageBin` doluluk güncellemesi, `idempotencyKey` tekilleştirmesi ve sayfalanabilir `queryStockLedger`. |
| `lib/logistics/wms/hierarchyAndLabels.ts` | 4 seviyeli depo ağacı (`getWarehouseHierarchyTree`), Depo/Bölge/Raf CRUD (`upsertWarehouseRecord`, `upsertWarehouseZoneRecord`, `upsertStorageBinRecord`, `toggleStorageBinState`), ambalaj hiyerarşisi (`savePackagingHierarchy`), `createLicensePlateWithSscc` ve `qrcode` SVG tabanlı `generatePrintableLabelPayload`. |
| `lib/logistics/wms/reservationAndFefo.ts` | FIFO/FEFO toplama önerisi (`suggestPickAllocation`; karantina, bloklu raf, süresi dolmuş/geri çağrılmış lotları hariç tutar) ve `createStockReservation` / `releaseStockReservation` / `listReservationsWithBreakdown`. |
| `lib/logistics/wms/operationsEngine.ts` | `LocationDirective` Put-Away önerisi (`suggestPutawayBins`), PO mal kabul (`processGoodsReceiptWithVariance`), Wave Pick (`createWavePickTask`, `completeWmsTaskExecution`), Cross-Dock (`createCrossDockOrder`, `advanceCrossDockOrder`), Kitting (`createKitOrder`, `executeKitOrder`), Transfer (`createMultiLineTransferOrder`, `advanceTransferOrderWithTransit`), Sayım tolerans mutabakatı (`reconcileCycleCountSession`), Çevrimdışı senkronizasyon (`processOfflineBatchWithConflictCheck`), RFID (`ingestRfidTagReads`) ve gerçek DB KPI (`getWarehouseKpiSnapshot`). |
| `lib/logistics/wms/taskAndCountHelpers.ts` | Esnek WMS görev oluşturucu (`createFlexibleWmsTask`) ve bölge/ABC/ürün/tolerans filtreli sayım oturumu oluşturucu (`createCycleCountSession`). |
| `lib/logistics/wms/apiHandlers.ts` | `/api/wms` için genişletilmiş GET (`hierarchy`, `directives`, `putaway_suggest`, `pick_suggest`, `reservations`, `lpns`, `label`, `cross_dock`, `kitting`, `ledger`, `kpi`, `rfid`, `offline_logs`) ve aksiyon bazlı RBAC/audit yönlendiricisi. |
| `lib/logistics/wms/index.ts` | WMS alan modülleri tek giriş (`barrel`) dosyası. |
| `app/api/wms/rfid/route.ts` | RFID portal donanım anahtarı (`x-wms-rfid-key` -> `WMS_RFID_API_KEY` env veya aktif `InventoryApiKey` tablosu) ve operatör oturumuyla çalışan `/api/wms/rfid` GET/POST uç noktası. |
| `app/dashboard/wms/components/PrintableLabelModal.tsx` | `BIN`, `LPN` ve `ITEM` için QR (`svg`) + `JsBarcode` Code-128 + SSCC-18 check-digit rozetli yazdırılabilir etiket penceresi. |
| `app/dashboard/wms/components/WmsPackagingAndSsccTab.tsx` | 4 seviyeli ambalaj birim çevrimi (Ti-Hi, ağırlık/hacim) ve SSCC-18 LPN yönetim sekmesi. |
| `app/dashboard/wms/components/WmsCrossDockAndKitTab.tsx` | Cross-Docking ve Kitting (Paketleme / Bozma) emirleri yönetim sekmesi. |
| `app/dashboard/wms/components/WmsReservationAndLedgerTab.tsx` | Aktif stok rezervasyonları (Fiziksel / Rezerve / Kullanılabilir + üretim rezervasyonu izolasyonu) ve filtrelenebilir/sayfalanabilir Değişmez Stok Defteri sekmesi. |
| `app/dashboard/wms/components/WmsKpiAndRfidTab.tsx` | Gerçek veritabanı Depo KPI kartları, RFID okuma günlüğü, canlı test formu ve REST entegrasyon dokümantasyonu sekmesi. |
| `lib/logistics/seed/faz2-wms-derinlestirme.ts` | Faz 0 anomalilerini güvenli onaran, 21 koleksiyonda 75 tutarlı Faz 2 WMS kaydı ekleyen idempotent demo seed modülü. |
| `scripts/test-lojistik-faz2-wms.ts` | Migration, SSCC-18, hiyerarşi, uçtan uca depo akışları, idempotency, Cross-Dock/Kit, çevrimdışı çakışma, üretim rezervasyon izolasyonu, RFID/KPI ve canlı HTTP yetki test paketi. |

### 1.2 Cerrahi Olarak Genişletilen Mevcut Dosyalar

| Dosya | Değişiklik Özeti |
| --- | --- |
| `prisma/schema.prisma` | `Warehouse`, `InventoryItem`, `UnitConversion`, `StorageBin`, `StockMovement`, `WmsTask`, `WmsTaskLine`, `WarehouseTransferOrder`, `TransferOrderLine`, `LicensePlate`, `InventoryCountSession`, `InventoryCountLine`, `WmsOfflineSyncLog` modellerine additive alanlar + 5 yeni `Lojistik*` modeli eklendi. |
| `lib/db.ts` | Yeni `lojistik*` koleksiyonları kaydedildi; `lojistikKitOrder` include desteği ile JSON yedek motorunda iç içe `create` (`persistNestedCreates`) ve `create`/`update`/`upsert` `include` zenginleştirmesi eklendi. |
| `lib/logistics/security.ts` | WMS yetki/kapsam kontrolleriyle uyumlu merkezi güvenlik güncellemesi. |
| `lib/logistics/seed/framework.ts` & `lib/logistics/seed/index.ts` | Anlık görüntü öncesi tek seferlik güvenli `repairAnomalies` kancası eklendi ve `faz2WmsSeedModule` kayıt listesine bağlandı. |
| `app/api/wms/route.ts` & `app/api/inventory/route.ts` | Merkezi `requireLogisticsAccess` + `logLogisticsAudit` + Faz 2 WMS handler bağlantısı ve stok kalemlerinde `pickPolicy` / `trackSerial` / `rfidEpcPrefix` / aktif rezervasyon desteği eklendi. |
| `app/dashboard/wms/page.tsx` | Global depo filtresi (`selectedWarehouseId`), 8 sekmeli yapı (`wizard-flow`, `bin-map`, `counts`, `transfers`, `packaging-sscc`, `crossdock-kit`, `reservations-ledger`, `kpi-rfid`) ve alt bileşen prop bağlantıları eklendi. |
| `app/dashboard/wms/components/StorageBinGrid.tsx` | Izgara / 4 seviyeli Hiyerarşi Ağacı görünümü, 7 raf rolü filtresi, `+ Depo`/`+ Bölge`/`+ Hücre` CRUD, çekmecede `Blokla/Kilidi Aç` ve QR/Code-128 etiket baskı modalı eklendi. |
| `app/dashboard/wms/components/WmsWorkflowStepper.tsx` | `PO Mal Kabul` (sağlam/hasarlı/fark + Put-Away önizleme), `Put-Away Kuralları` (`LocationDirective`), `Dalga Toplama` (Wave Pick) ve görev satırı `Kısmi / Eksik` tamamlama modalı eklendi. |
| `app/dashboard/wms/components/InterWarehouseTransfers.tsx` | Çok satırlı transfer, `DRAFT -> APPROVED`, `IN_TRANSIT` `inTransitQty` görünümü ve kısmi/uyuşmazlıklı teslim alma (`DISCREPANCY`) eklendi. |
| `app/dashboard/wms/components/InventoryCountManager.tsx` | Bölge (`zoneId`), ABC filtresi, planlanan tarih, tolerans (%) parametreleri ve tolerans dışı farklarda `PENDING_APPROVAL -> Yönetici Onayı ile Mahsuplaştır` (`approve_count`) akışı eklendi. |
| `lib/wms/offlineSyncEngine.ts` & `app/dashboard/wms/mobil/page.tsx` | Benzersiz `idempotencyKey`, sunucu `CONFLICT`/`DUPLICATE_IGNORED` raporlama, canlı görev kuyruğu çubuğu, 5. mod (`SSCC_SCAN`) ve `@zxing/browser` `BrowserMultiFormatReader` kamera barkod/QR okuyucu eklendi. |
| `app/dashboard/stok/components/{CreateItemModal,QuickStockMovementModal,ItemDetailDrawer}.tsx` | `pickPolicy` (`FEFO`/`FIFO`), `trackSerial`, `rfidEpcPrefix`, `serialNumber`, Fiziksel/Rezerve/Kullanılabilir aktif WMS rezervasyon dökümü ve `Etiket` yazdırma düğmesi eklendi. |

---

## 2. Additive Veritabanı Migration ve Rollback Tasarımı

* **Migration:** `prisma/migrations/20261114170000_lojistik_faz2_wms_ve_defter/migration.sql`
  * Mevcut tablolarda kolon silme, tip değiştirme veya yeniden adlandırma yoktur; yalnızca `IF NOT EXISTS` eklemeli kolonlar ve indeksler eklenmiştir (`Warehouse`, `InventoryItem`, `UnitConversion`, `StorageBin`, `StockMovement`, `WmsTask`, `WmsTaskLine`, `WarehouseTransferOrder`, `TransferOrderLine`, `LicensePlate`, `InventoryCountSession`, `InventoryCountLine`, `WmsOfflineSyncLog`).
  * 5 yeni `Lojistik*` tablosu oluşturulmuştur:
    * `LojistikStockReservation` (`reservationNo` unique, `(itemId, warehouseId)`, `(sourceType, sourceId)`, `status` indeksleri)
    * `LojistikCrossDockOrder` (`crossDockNo` unique, `(warehouseId, status)` indeksi)
    * `LojistikKitOrder` (`kitOrderNo` unique, `(warehouseId, status)` indeksi)
    * `LojistikKitOrderComponent` (`kitOrderId` FK cascade + indeks)
    * `LojistikRfidTagEvent` (`epcCode`, `readerId`, `idempotencyKey` indeksleri)
* **Rollback:** `prisma/migrations/20261114170000_lojistik_faz2_wms_ve_defter/rollback.sql` yeni oluşturulan 5 tabloyu, eklenen 3 indeksi ve eklemeli tüm kolonları güvenli sırayla geri alır.

---

## 3. Mimari Öne Çıkanlar

1. **Üretim Rezervasyonlarıyla Çakışmasız WMS Rezervasyonu:** `createStockReservation` ve `releaseStockReservation` işlemleri açık `LojistikStockReservation` kayıtları üzerinden `StockBalance.reservedQty` ve `availableQty` alanlarını yalnızca kendi açık delta miktarı kadar günceller; üretim iş emirleri veya omnichannel tarafından doğrudan ayrılmış rezerve stoklara dokunmaz.
2. **Stok Defteri Tek Doğruluk Kaynağı & Çift Okutma Koruması:** `recordStockLedgerEntry` tüm hareketleri `StockMovement` defterine kullanıcı, zaman, depo/raf, belge ve yöntem (`WEB`, `HANDHELD_CAMERA`, `HANDHELD_USB`, `OFFLINE_SYNC`, `RFID`, `SYSTEM`) bilgileriyle kaydeder. Aynı `idempotencyKey` tekrar gönderildiğinde yeni hareket üretmeden `duplicate: true` döner; PO mal kabulde hasarlı miktar ayrıca karantina bakiyesine (`availableQty = 0`, `quarantineQty`) ve karantina defter hareketine yazılır.
3. **GS1 SSCC-18 & Yazdırılabilir Etiketler:** `generateSscc18Code` ilk 17 haneden GS1 Mod-10 kontrol hanesini üretir, `validateSscc18Code` 18/20 (`00` AI önekli) barkodları kontrol eder ve tek hane bozulduğunda reddeder. `PrintableLabelModal` istemcide `JsBarcode` Code-128 ile sunucudan gelen `QRCode` SVG yükünü birlikte yazdırır.
4. **RFID Donanım Güvenliği:** `/api/wms/rfid` sabit/tahmin edilebilir bir demo parolası kabul etmez; yalnızca geçerli `WMS_RFID_API_KEY` ortam değişkeni, `InventoryApiKey` tablosundaki aktif anahtar kaydı veya `lojistik_wms` yetkili operatör oturumu ile `200 OK` döner.

---

## 4. Demo Seed, Onarım ve Geri Alma (Rollback)

`lib/logistics/seed/faz2-wms-derinlestirme.ts` yalnızca `isDemoEnvironment()` doğrulanmış ortamda çalışır ve anlık görüntü almadan önce `repairAnomalies` kancasıyla Faz 0 JSON verisindeki 3 bozuk kaydı (obje kalmış `onHandQty`, uyumsuz `zoneId`, yinelenen depo adı) güvenli biçimde normalleştirir. Ardından 21 koleksiyonda toplam **75** Faz 2 kaydı ekler:

```powershell
# Faz 1 + Faz 2 demo kayıtlarını geri al (öncesinde storage/backups/ altına tam yedek alır)
npm run seed:logistics:rollback

# Faz 1 + Faz 2 demo kayıtlarını eklemeli & idempotent uygula
npm run seed:logistics
```

* İdempotency doğrulaması: `seed:logistics:rollback` + arka arkaya iki kez `seed:logistics` çalıştırıldığında 1. çalıştırmada Faz 1 (`3`) + Faz 2 (`75`) kayıtları eklenmiş, 2. çalıştırmada `eklendi=0` / `atlandı=75` (Faz 1 için `atlandı=3`) ile **Mevcut Veri Bütünlüğü: TAM (%100 korundu)** raporu alınmıştır.

---

## 5. Doğrulama Sonuçları

| Kontrol | Kapsam | Sonuç |
| --- | --- | --- |
| `npx prisma validate` & `npx prisma generate` | Şema geçerliliği | Başarılı (0 hata) |
| `validateAllLogisticsMigrations()` | Faz 1 + Faz 2 additive `migration.sql` & `rollback.sql` | Başarılı |
| `npx tsc --noEmit` | Faz 2 dosyaları (`app/dashboard/wms/**`, `lib/logistics/**`, `lib/wms/**`, `app/api/wms/**`, `lib/db.ts`, `scripts/test-lojistik-faz2-wms.ts`) | Faz 2 dosyalarında **0 TS hatası** (repo geneli önceden mevcut hatalarla toplam 166) |
| `VERCEL=1 npx next build --webpack` (`subst Z:`) | Tüm App Router sayfaları ve API rotaları | Başarılı (exit 0; 176/176 sayfa derlendi) |
| `npx tsx scripts/test-lojistik-faz2-wms.ts` (`TEST_BASE_URL=http://127.0.0.1:3099`) | 9 alan/entegrasyon testi + canlı `/api/wms`, `/api/wms/rfid` (401 / yanlış anahtar 401 / `InventoryApiKey` 200 / `Tedarikçi` 403 / Admin 200), 12 GET uç noktası ve `/api/inventory` | **10/10 başarılı** (`🎉 TÜM DOĞRULAMA TESTLERİ GEÇTİ (10/10 başarılı)`) |
| Canlı Chrome Tarayıcı E2E Kontrolü | `chrome_devtools` alt ajanı ile görsel/DOM etkileşim testi | **Engellendi:** Makinede Chrome uzak hata ayıklama aktif değil (`C:\Users\!\AppData\Local\Google\Chrome\User Data\DevToolsActivePort ENOENT`); tarayıcı DOM kontrolü `chrome://inspect/#remote-debugging` açıldıktan sonra çalıştırılabilir. |
