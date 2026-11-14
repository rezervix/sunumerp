# Lojistik ve Depo Yönetimi — Faz 0 Keşif ve Özellik Eşleme Raporu

**Tarih:** 2026-11-14  
**Dal (Branch):** `feature/uretim-yayin-hazirlik`  
**Kapsam:** Faz 0 — Salt Okunur İnceleme, Sistem Envanteri, Özellik Eşleme Tablosu ve Karar Matrisi  
**Durum:** Uygulama kodunda, Prisma şemasında, yapılandırmada ve `.local-db.json` demo veritabanında **tek satır değişiklik yapılmamıştır**.

---

## 1. Mevcut Sistem Envanteri

Kaynak sistem (**Sunum ERP — Çiçekana Kurumsal ERP**), stok/depo/satınalma/çok kanallı sevkiyat özelliklerini ağırlıklı olarak `"Stok ve Depo Yönetimi"` (`stok`) grubundaki 5 ekran (+ `/dashboard/wms/mobil`), `"Satış & Müşteriler"` grubundaki kargo/sipariş/B2B ekranları ve `"Üretim"` grubundaki kalite/bakım ekranları üzerinden yürütmektedir.

### 1.1 Menü ve URL Yapısı

| Menü Grubu (`app/dashboard/layout.tsx`) | Menü Etiketi | URL | İzin Kaynağı (`resource`) | Özellik Bayrağı |
| --- | --- | --- | --- | --- |
| Satış & Müşteriler | Siparişler | `/dashboard/orders` | `orders` | Yok |
| Satış & Müşteriler | B2B Mağaza | `/dashboard/b2b` | — | Yok |
| Satış & Müşteriler | Kargo Takip | `/dashboard/cargo` | `cargo` | Yok |
| Stok ve Depo Yönetimi | 1. Stok Kartları & Envanter | `/dashboard/stok` | `stok` (menüde tanımlı, API'de kapalı/eksik) | Yok |
| Stok ve Depo Yönetimi | 2. Depo Operasyonları & Sayım (WMS) | `/dashboard/wms` | `wms` | Yok |
| *(WMS içi buton)* | Mobil Saha Terminali *(menüde ayrı satır yok)* | `/dashboard/wms/mobil` | — | Yok |
| Stok ve Depo Yönetimi | 3. Satın Alma & Otomatik Sipariş | `/dashboard/satinalma` | `satinalma` | Yok |
| Stok ve Depo Yönetimi | 4. Çok Kanallı Satış & Sevkiyat | `/dashboard/omnichannel` | `omnichannel` | Yok |
| Stok ve Depo Yönetimi | 5. AI Analiz & Ayarlar | `/dashboard/stok-ai` | `stok-ai` | Yok |
| *(Nav dışı doğrudan rota)* | Envanter Ekosistem & API | `/dashboard/envanter-ekosistem` | — | Yok |
| Üretim | 5. Kalite Kontrol & Fire | `/dashboard/uretim/kalite` | `uretim_kalite` | `uretim_kalite` |
| Üretim | 6. Ekipman & Bakım Yönetimi *(fabrika makineleri)* | `/dashboard/uretim/bakim` | `uretim_bakim` | `uretim_bakim` |
| Üretim | Üretim Saha Terminali *(PLC/tezgâh)* | `/dashboard/uretim/terminal` | `uretim_is_emri` | `uretim_is_emri` |

**Sekme (Navigasyon) Notu:** `app/dashboard/stok/components/InventoryModuleNav.tsx` üst yatay modül çubuğu yukarıdaki 5 ana Stok/WMS sekmesini (`/dashboard/stok`, `/dashboard/wms`, `/dashboard/satinalma`, `/dashboard/omnichannel`, `/dashboard/stok-ai`) içerir; `/dashboard/envanter-ekosistem` ve `/dashboard/cargo` bu sekme çubuğuna bağlı değildir.

### 1.2 Sayfa ve UI Bileşenleri

* **Stok Kartları (`/dashboard/stok`):** `app/dashboard/stok/page.tsx`, `StockSummaryCards.tsx`, `StockTable.tsx`, `ItemDetailDrawer.tsx`, `CreateItemModal.tsx`, `QuickStockMovementModal.tsx`, `ExecutiveAiBanner.tsx`, `ItemProductionProfileTab.tsx`.
  * Özellikler: 6 sütunlu tablo, 5 segmentli LED stok seviyesi, varyant/BOM rozetleri, barkod otomatik üretici (`869...`), Lot/SKT sekmesi, düz çoklu birim çevrim sekmesi, çekmece içinde hareket geçmişi ve birim maliyet.
* **WMS (`/dashboard/wms` ve `/dashboard/wms/mobil`):**
  * Sekmeler: `wizard-flow` (`WmsWorkflowStepper.tsx`: 5 sabit aşama: `GOODS_RECEIPT`, `QC_INSPECTION`, `PUTAWAY`, `WAVE_PICK`, `PACKING`), `bin-map` (`StorageBinGrid.tsx`), `counts` (`InventoryCountManager.tsx`), `transfers` (`InterWarehouseTransfers.tsx`), `CreateWmsTaskModal.tsx`, `WmsSummaryCards.tsx`.
  * El terminali: `app/dashboard/wms/mobil/page.tsx` — USB/klavye barkod okuma alanı, Web Audio bip sesi, `IndexedDB` + `localStorage` çevrimdışı kuyruk (`lib/wms/offlineSyncEngine.ts`).
* **Satın Alma (`/dashboard/satinalma`):**
  * Sekmeler: `critical-rop` (`CriticalStockRopTable.tsx`), `requisitions` (`PurchaseRequisitionsList.tsx`), `consignment` (`ConsignmentStockManager.tsx`), `ProcurementSummaryCards.tsx`, `CreateRequisitionModal.tsx`.
* **Çok Kanallı Satış & Sevkiyat (`/dashboard/omnichannel`):**
  * Sekmeler: `orders` (`OmnichannelOrdersManager.tsx`: stok rezervasyonu, muadil önerme/uygulama, parçalı sevk, backorder), `rma` (`RmaReturnManager.tsx`: sadece `RESTOCK_TO_BIN` ve `QUARANTINE_REPAIR` aksiyonları), `channels` (`SalesChannelsAndLogistics.tsx`: kanal kartları, webhook kopyalama, kargo adaptör kartları), `edoc` (`EDocumentViewer.tsx`: GİB UBL-TR 2.1 E-İrsaliye / E-Fatura görüntüleme ve manuel kesim modalı).
* **Kargo ve Kurye (`/dashboard/cargo`):** `app/dashboard/cargo/page.tsx` — iki sekme: `cargo` (`CargoTracking` listesi: firma, takip no, durum `in_transit | delivered | returned | lost`, şube, notlar) ve `files` (`FileDelivery`: şubeler/kullanıcılar arası fiziksel evrak teslimi).
* **Siparişler ve B2B (`/dashboard/orders`, `/dashboard/b2b`):** `app/dashboard/orders/page.tsx`, `app/dashboard/orders/[id]/print/page.tsx` (yazdırılabilir sipariş fişi), `app/dashboard/b2b/page.tsx` (`StockRequest` / ürün kataloğu).
* **Stok AI ve Ekosistem (`/dashboard/stok-ai`, `/dashboard/envanter-ekosistem`):**
  * `stok-ai`: `ask-me-anything`, `foresight-forecasting`, `narrative-reporting`, `api-settings` (Gemini opsiyonel özetleme).
  * `envanter-ekosistem`: `api-webhooks`, `plugin-marketplace`, `migration-training`, `saas-licensing`.
* **Üretim Kalite & Bakım (`/dashboard/uretim/kalite`, `/dashboard/uretim/bakim`):**
  * `ProductionQualityWorkspace.tsx`: `inspections` (giriş mal kabul dahil muayeneler), `plans`, `ncrs` (uygunsuzluk/karantina/CAPA), `calibrations`, `traceability` (ileri/geri lot izleme & geri çağırma simülasyonu), `reports` (Pareto & `Tedarikçi Kalite Skor Kartı` tablosu).
  * `ProductionMaintenanceWorkspace.tsx`: yalnızca üretim hattı makine/iş istasyonu varlıkları (`UretimMachineAsset`) ve CMMS bakım iş emirleri — taşıt/filo ile ilişkisi yoktur.

### 1.3 API Uç Noktaları ve Güvenlik Durumu

| Endpoint | İşlevi | Yetki Kontrolü (`requirePermission`) | Audit Log |
| --- | --- | --- | --- |
| `app/api/inventory/route.ts` | Ürün/stok listesi, hızlı giriş/çıkış, birim çevrimi, BOM | **YOK** (açık) | **YOK** |
| `app/api/wms/route.ts` | Depo/raf/görev/sayım/transfer/offline sync | **YOK** (açık) | **YOK** |
| `app/api/procurement/route.ts` | ROP özeti, PR oluştur/onayla, konsinye mutabakatı | **YOK** (açık) | **YOK** |
| `app/api/omnichannel/route.ts` | Sipariş rezerve, parçalı sevk, muadil, backorder, RMA, GİB E-Belge | **YOK** (açık) | **YOK** |
| `app/api/webhooks/omnichannel/route.ts` | `ORDER_CREATED`, `SHIPMENT_STATUS_UPDATE`, `RETURN_REQUEST` | Yok (webhook imza doğrulaması da **YOK**) | **YOK** |
| `app/api/inventory-ai/route.ts` | AI talep tahmini, NLQ sorgu, AI PR oluşturma | **YOK** (açık) | **YOK** |
| `app/api/ecosystem/route.ts` | API anahtarı, webhook, eklenti, ERP göç işi | **YOK** (açık) | **YOK** |
| `app/api/v1/inventory/route.ts` | Dış API stok sorgusu | Yok (API key doğrulaması kısmi) | **YOK** |
| `app/api/cargo/route.ts` | `CargoTracking` CRUD | Var (`cargo`) | Kısmi / Mock bypass'lı |
| `app/api/file-delivery/route.ts` | Evrak kurye teslimi (`FileDelivery`) | Var (`files`) | Var |
| `app/api/orders/route.ts` & `[id]/route.ts` | Sipariş CRUD | Var (`orders`) | Var |
| `app/api/production/quality/route.ts` | Üretim/mal kabul kalite, NCR, izlenebilirlik, tedarikçi skoru | Var (`uretim_kalite` + bayrak) | Var (`logProductionAudit`) |
| `app/api/production/maintenance/route.ts` | Makine varlık, bakım planı, iş emri, PdM | Var (`uretim_bakim` + bayrak) | Var (`logProductionAudit`) |
| `app/api/production/iot-ingest/route.ts` | Üretim PLC/terazi IoT veri alımı | Header key (`production`) + `uretim_is_emri` | Var |
| `app/api/upload/route.ts`, `uploads/[filename]/route.ts` | Dosya yükleme/sunma (`/storage/uploads` veya `/tmp`) | Var | — |

### 1.4 Servis ve Motor Katmanı

* **Envanter & Değerleme:** `lib/services/inventoryServerDb.ts`, `lib/services/inventoryValuationEngine.ts` (`convertStockUnit`, `calculateStockValuation` FIFO/LIFO/WEIGHTED_AVERAGE/STANDARD, `calculateBomRollupCost`).
* **WMS:** `lib/services/wmsServerDb.ts` (`seedRealisticWmsData`, `getWmsOverviewStats`, `advanceWmsTaskStage`, `submitCountLine`, `reconcileCountSession`, `createTransferOrder`, `advanceTransferOrderStatus`, `processOfflineWmsOperations`), `lib/services/wmsDirectiveEngine.ts` (arayüzler + `INITIAL_*` demo sabitleri), `lib/wms/offlineSyncEngine.ts` (`IndexedDB` + `localStorage`).
* **Satın Alma:** `lib/services/procurementServerDb.ts`, `lib/services/procurementReorderEngine.ts` (`calculateDynamicReorderPoint`, `calculateEoq`).
* **Omnichannel & Tersine Lojistik:** `lib/services/omnichannelServerDb.ts`, `lib/services/omnichannelFulfillmentEngine.ts`.
* **Üretim Kalite / Bakım:** `lib/services/productionQualityServerDb.ts` (`getSupplierQualityRatingsReport` dahil), `lib/services/productionMaintenanceServerDb.ts`.

### 1.5 Veritabanı Modelleri (`prisma/schema.prisma`)

* **Stok & İzlenebilirlik:** `Warehouse`, `WarehouseZone`, `StorageBin`, `LocationDirective`, `InventoryItem`, `StockBalance`, `UnitConversion`, `AlternativeProduct`, `LotSerialRecord`, `TraceabilityLog`, `BomHeader`, `BomComponent`, `CostLayer`, `StockMovement`.
* **WMS:** `WmsTask`, `WmsTaskLine`, `WarehouseTransferOrder`, `TransferOrderLine`, `LicensePlate`, `LicensePlateContent`, `InventoryCountSession`, `InventoryCountLine`, `WmsOfflineSyncLog`.
* **Tedarik & Omnichannel & İade:** `Supplier`, `ReorderPolicy`, `LowStockAlert`, `PurchaseRequisition`, `PurchaseRequisitionLine`, `ConsignmentStock`, `SalesChannel`, `OmnichannelOrder`, `OrderShipmentLine`, `ReturnRmaRecord`, `LogisticsAdapterConfig`, `EDocumentRecord`.
* **Sipariş & Kargo & Evrak:** `Order`, `CargoTracking`, `FileDelivery`, `StockRequest`.
* **Üretim Kalite & Bakım (Yalnız Fabrika):** `UretimQualityPlan`, `UretimQualityPlanItem`, `UretimQualityCalibration`, `UretimQualityInspection`, `UretimQualityInspectionResult`, `UretimQualityNcr`, `UretimMachineAsset`, `UretimMachineSparePart`, `UretimMaintenancePlan`, `UretimMaintenancePlanChecklist`, `UretimMaintenanceWorkOrder`, `UretimMaintenanceWorkOrderSparePart`, `UretimMaintenanceChecklistResult`, `UretimMaintenanceConditionReading`.
* **Şemada HİÇ OLMAYAN Modeller:** Filo/Araç (`Vehicle`, `Driver`, `FuelLog`, `VehicleMaintenance`, `TelematicEvent`, `TrafficPenalty`, `VehicleInsurance`, `VehicleInspection`), Sevkiyat/Rota (`DispatchPlan` / `RouteTrip`, `RouteStop`, `DeliveryProof` foto/imza), RFQ/Teklif/ASN (`RfqRequest`, `SupplierQuotation`, `SupplierAsn`).

### 1.6 Doğrudan Gözlemlenen Mevcut Hata ve Tutarsızlıklar

1. **Modal–API Parametre Uyumsuzluğu (`wms`):** `CreateWmsTaskModal.tsx` gövdede `taskType`, `assignedTo`, `items` alanlarını gönderirken, `app/api/wms/route.ts` `workflowStage`, `assignedOperator`, `itemId` alanlarını beklemektedir.
2. **Transfer Durum Güncelleme Alan Uyuşmazlığı:** `InterWarehouseTransfers.tsx` `transferId` gönderirken, `app/api/wms/route.ts` `transferOrderId` beklemektedir.
3. **Veritabanı Bozuk Bakiye Kaydı:** `.local-db.json` içinde `stockBalance` koleksiyonunda `item-ork-05` kaydı `onHandQty: { "increment": 5 }`, `availableQty: { "increment": 5 }` şeklinde çözümlenmemiş Prisma atomik artırım nesnesi olarak saklanmış durumdadır.
4. **Olmayan Depo ID Referansı:** `omnichannelServerDb.ts` ve `.local-db.json` içindeki bazı `stockMovement` / `returnRmaRecord` kayıtları `"wh-merkez"` değerini kullanmaktadır; sistemdeki gerçek depo kaydı `"wh-merkez-01"` şeklindedir.
5. **Yinelenen Depo Adı & Kopuk `zoneId`:** `.local-db.json` içinde `wh-atolye-03` (`DEP-ATL-03`) kaydının adı `wh-online-03` ile birebir aynı (`"E-Ticaret & Hızlı Dağıtım Hub"`); ayrıca `bin-mrk-gul`, `bin-mrk-lil`, `bin-mrk-vaz`, `bin-mrk-sng`, `bin-kdk-show` kayıtlarının `zoneId` değerleri (`"zone-cold"`, `"zone-dry"`, `"zone-store"`) gerçek `WarehouseZone.id` (`"zone-cold-01"`, `"zone-dry-01"`, `"zone-kdk-01"`) ile eşleşmemektedir.
6. **Ölü / Bağlanmamış Motor Fonksiyonları & Tablolar:** `procurementReorderEngine.ts` içindeki `calculateEoq` fonksiyonu servis/API/UI tarafından hiç çağrılmaz; `LocationDirective`, `LicensePlate`, `LicensePlateContent`, `TraceabilityLog`, `ReorderPolicy`, `LowStockAlert` tabloları `.local-db.json` içinde 0 satırdır.

---

## 2. Modül Bazlı Özellik Eşleme ve Karar Tablosu (53 Özellik)

> **Durum Tanımları:**  
> - **YOK:** Sistemde işlevsel DB/API/UI karşılığı bulunmuyor (yalnızca pasif TS arayüzü veya statik örnek metin olsa bile).  
> - **YÜZEYSEL:** Temel tablo, kısmi ekran veya tek butonlu akış var; ancak gerçek iş kuralı, CRUD, doğrulama veya uçtan uca entegrasyon eksik.  
> - **YETERLİ:** Eksiksiz üretim kalitesinde çalışıyor.

### 2.1 WMS — Depo Yönetim Sistemi (19 Öğe)

| Özellik | Mevcut Ekran / Dosya Yolu | URL | Menü Yolu | Durum | Yüzeysel Olma / Eksik Nedeni | Karar |
| --- | --- | --- | --- | --- | --- | --- |
| 1. Depo→Bölge→Raf→Göz hiyerarşisi | [`StorageBinGrid.tsx`](file:///c:/Users/!/Desktop/Sunum%20ERP/app/dashboard/wms/components/StorageBinGrid.tsx), [`schema.prisma`](file:///c:/Users/!/Desktop/Sunum%20ERP/prisma/schema.prisma) (`Warehouse`, `WarehouseZone`, `StorageBin`) | `/dashboard/wms` | Stok ve Depo → 2. Depo Operasyonları & Sayım | **YÜZEYSEL** | Sadece düz raf kartı ızgarası + filtre var; 4 seviyeli ağaç görünümü, Depo/Bölge/Raf/Göz oluşturma-düzenleme CRUD'u yok; seed `zoneId` referansları kopuk. | **DERİNLEŞTİR** |
| 2. Lokasyon tipleri | [`StorageBinGrid.tsx`](file:///c:/Users/!/Desktop/Sunum%20ERP/app/dashboard/wms/components/StorageBinGrid.tsx), [`wmsDirectiveEngine.ts`](file:///c:/Users/!/Desktop/Sunum%20ERP/lib/services/wmsDirectiveEngine.ts) | `/dashboard/wms` | Stok ve Depo → 2. Depo Operasyonları & Sayım | **YÜZEYSEL** | `COLD_STORAGE`/`COLD_CELL`/`RAMP`/`SHOWCASE` gibi dağınık enum metinleri var; Karantina, İade/RMA, Sevkiyat Peronu, Cross-Dock, Hurda tipleri ile kural tanımlama ve `LocationDirective` UI/API bağlantısı yok. | **DERİNLEŞTİR** |
| 3. Lot / Seri / SKT | [`CreateItemModal.tsx`](file:///c:/Users/!/Desktop/Sunum%20ERP/app/dashboard/stok/components/CreateItemModal.tsx), [`ItemDetailDrawer.tsx`](file:///c:/Users/!/Desktop/Sunum%20ERP/app/dashboard/stok/components/ItemDetailDrawer.tsx), [`ProductionQualityWorkspace.tsx`](file:///c:/Users/!/Desktop/Sunum%20ERP/app/dashboard/uretim/components/ProductionQualityWorkspace.tsx) | `/dashboard/stok`, `/dashboard/uretim/kalite` | Stok ve Depo → 1. Stok Kartları; Üretim → 5. Kalite | **YÜZEYSEL** | Şemada `trackSerial` / `serialNumber` olmasına rağmen stok/WMS UI'da seri no takibi yok; SKT yaklaşan/geçen stok alarmı ve karantina kilidi yok; `TraceabilityLog` boş (0 satır). | **DERİNLEŞTİR** |
| 4. FIFO / FEFO | [`inventoryValuationEngine.ts`](file:///c:/Users/!/Desktop/Sunum%20ERP/lib/services/inventoryValuationEngine.ts), [`inventoryServerDb.ts`](file:///c:/Users/!/Desktop/Sunum%20ERP/lib/services/inventoryServerDb.ts), [`WmsWorkflowStepper.tsx`](file:///c:/Users/!/Desktop/Sunum%20ERP/app/dashboard/wms/components/WmsWorkflowStepper.tsx) | `/dashboard/stok`, `/dashboard/wms` | Stok ve Depo → 1. Stok Kartları / 2. WMS | **YÜZEYSEL** | `CostLayer` FIFO muhasebe maliyetini hesaplıyor; ancak fiziksel WMS toplama/sevkiyatta `LotSerialRecord.expiryDate` sırasına göre raf/lot önerisi veya zorunlu FEFO çıkışı uygulanmıyor (`"FEFO Öncelikli Çıkış"` statik metin). | **DERİNLEŞTİR** |
| 5. Rezervasyon | [`omnichannelServerDb.ts`](file:///c:/Users/!/Desktop/Sunum%20ERP/lib/services/omnichannelServerDb.ts) (`reserveOrderStock`), [`OmnichannelOrdersManager.tsx`](file:///c:/Users/!/Desktop/Sunum%20ERP/app/dashboard/omnichannel/components/OmnichannelOrdersManager.tsx) | `/dashboard/omnichannel` | Stok ve Depo → 4. Çok Kanallı Satış & Sevkiyat | **YÜZEYSEL** | Yalnızca depo geneli `StockBalance.reservedQty` artırılıyor; lot/raf bazlı sert rezervasyon, süre aşımı/serbest bırakma UI'ı ve `/dashboard/orders` entegrasyonu yok. | **DERİNLEŞTİR** |
| 6. Birim dönüşümü ve ambalaj seviyeleri (adet/koli/palet) | [`CreateItemModal.tsx`](file:///c:/Users/!/Desktop/Sunum%20ERP/app/dashboard/stok/components/CreateItemModal.tsx), [`inventoryValuationEngine.ts`](file:///c:/Users/!/Desktop/Sunum%20ERP/lib/services/inventoryValuationEngine.ts) (`convertStockUnit`) | `/dashboard/stok` | Stok ve Depo → 1. Stok Kartları & Envanter | **YÜZEYSEL** | Yalnızca tek katman `fromUnit → toUnit` çarpanı var; hiyerarşik Adet→İç Kutu→Koli→Palet ambalaj ağacı, ağırlık/hacim/Ti-Hi ve mal kabul/toplamada otomatik birim çevrimi yok. | **DERİNLEŞTİR** |
| 7. SSCC / GS1 etiket | [`schema.prisma`](file:///c:/Users/!/Desktop/Sunum%20ERP/prisma/schema.prisma) (`LicensePlate`), [`wmsDirectiveEngine.ts`](file:///c:/Users/!/Desktop/Sunum%20ERP/lib/services/wmsDirectiveEngine.ts) | `/dashboard/wms` | Stok ve Depo → 2. Depo Operasyonları & Sayım | **YÜZEYSEL** | `LicensePlate` ve `LicensePlateContent` tabloları 0 kayıt; `/api/wms` içinde CRUD yok; SSCC-18 check-digit / GS1-128 AI barkod üretimi ve yazdırılabilir etiket ekranı yok. | **DERİNLEŞTİR** |
| 8. Mal kabul | [`WmsWorkflowStepper.tsx`](file:///c:/Users/!/Desktop/Sunum%20ERP/app/dashboard/wms/components/WmsWorkflowStepper.tsx), [`CreateWmsTaskModal.tsx`](file:///c:/Users/!/Desktop/Sunum%20ERP/app/dashboard/wms/components/CreateWmsTaskModal.tsx) | `/dashboard/wms` | Stok ve Depo → 2. Depo Operasyonları & Sayım | **YÜZEYSEL** | Sadece tek tık `"İlerlet"` butonu var; PO/ASN eşleştirme, eksik/fazla/hasarlı miktar girişi, kabul anında lot/SKT/SSCC üretimi ve modal–API payload uyumu yok. | **DERİNLEŞTİR** |
| 9. Put-away (yerleştirme) | [`WmsWorkflowStepper.tsx`](file:///c:/Users/!/Desktop/Sunum%20ERP/app/dashboard/wms/components/WmsWorkflowStepper.tsx), [`wmsServerDb.ts`](file:///c:/Users/!/Desktop/Sunum%20ERP/lib/services/wmsServerDb.ts), `LocationDirective` | `/dashboard/wms` | Stok ve Depo → 2. Depo Operasyonları & Sayım | **YÜZEYSEL** | `LocationDirective` kuralları (ABC sınıfı, sıcaklık, ağırlık/hacim kapasite sınırı) dinamik çalışmıyor; kural yönetimi UI'ı ve hedef raf onay/değişiklik adımı yok. | **DERİNLEŞTİR** |
| 10. Toplama (picking, wave/batch) | [`WmsWorkflowStepper.tsx`](file:///c:/Users/!/Desktop/Sunum%20ERP/app/dashboard/wms/components/WmsWorkflowStepper.tsx) (`WAVE_PICK`) | `/dashboard/wms` | Stok ve Depo → 2. Depo Operasyonları & Sayım | **YÜZEYSEL** | Siparişleri dalga/parti (wave/batch) halinde gruplayan algoritma, koridor sırasına göre rota sıralama, eksik toplama (short-pick) yönetimi ve FEFO lot önerisi yok. | **DERİNLEŞTİR** |
| 11. Cross-docking | Yok (kod tabanında 0 eşleşme) | — | — | **YOK** | Mal kabul rampasından açık sipariş/transfer ihtiyacına rafa koymadan doğrudan çıkış peronuna aktarım kuralı ve akışı yok. | **YENİ EKLE** *(WMS içi sekme/akış)* |
| 12. Kitting | Yok (yalnız üretim `BomHeader` / `UretimBomHeader` var) | — | — | **YOK** | Depo içinde satış seti/hediye kutusu/kit birleştirme ve bozma (`KitOrder`) iş emri ve alt bileşenden dinamik düşüm ekranı yok. | **YENİ EKLE** *(WMS/Stok içi sekme)* |
| 13. Transfer | [`InterWarehouseTransfers.tsx`](file:///c:/Users/!/Desktop/Sunum%20ERP/app/dashboard/wms/components/InterWarehouseTransfers.tsx), [`wmsServerDb.ts`](file:///c:/Users/!/Desktop/Sunum%20ERP/lib/services/wmsServerDb.ts) | `/dashboard/wms` | Stok ve Depo → 2. Depo Operasyonları & Sayım | **YÜZEYSEL** | `transferId` vs `transferOrderId` API hatası mevcut; çok kalemli transfer modalı yok; eksik/farklı teslim (`DISCREPANCY`) onay akışı ve Filo FK bağlantısı yok. | **DERİNLEŞTİR** |
| 14. Döngüsel sayım | [`InventoryCountManager.tsx`](file:///c:/Users/!/Desktop/Sunum%20ERP/app/dashboard/wms/components/InventoryCountManager.tsx), [`wmsServerDb.ts`](file:///c:/Users/!/Desktop/Sunum%20ERP/lib/services/wmsServerDb.ts) | `/dashboard/wms` | Stok ve Depo → 2. Depo Operasyonları & Sayım | **YÜZEYSEL** | ABC hızına göre periyodik sayım planlama/zamanlama, lokasyon/lot filtreli oturum açma ve fark tolerans eşiği onay kuralı yok. | **DERİNLEŞTİR** |
| 15. Stok defteri ve olay logu | [`ItemDetailDrawer.tsx`](file:///c:/Users/!/Desktop/Sunum%20ERP/app/dashboard/stok/components/ItemDetailDrawer.tsx), `StockMovement`, `AuditLog` | `/dashboard/stok` | Stok ve Depo → 1. Stok Kartları & Envanter | **YÜZEYSEL** | Hareketler yalnızca tek ürün detay çekmecesinde görünüyor; tarih/depo/lot/işlem tipi filtreli tüm depo Stok Defteri (yürüyen bakiye ile) ve WMS/Stok API audit log kaydı yok. | **DERİNLEŞTİR** |
| 16. El terminali ekranı | [`app/dashboard/wms/mobil/page.tsx`](file:///c:/Users/!/Desktop/Sunum%20ERP/app/dashboard/wms/mobil/page.tsx), [`offlineSyncEngine.ts`](file:///c:/Users/!/Desktop/Sunum%20ERP/lib/wms/offlineSyncEngine.ts) | `/dashboard/wms/mobil` | WMS içindeki `"Mobil Saha Terminali"` butonu | **YÜZEYSEL** | Sabit örnek listelerle manuel okuma simülasyonu yapıyor; gerçek atanmış `WmsTask` / sayım / transfer kuyruğunu çekip barkod doğrulayarak adım adım ilerletmiyor; kamera tarama yok. | **DERİNLEŞTİR** |
| 17. RFID okuma girişi | Sadece string/type izi ([`wmsDirectiveEngine.ts`](file:///c:/Users/!/Desktop/Sunum%20ERP/lib/services/wmsDirectiveEngine.ts), [`ecosystemSaasEngine.ts`](file:///c:/Users/!/Desktop/Sunum%20ERP/lib/services/ecosystemSaasEngine.ts)) | — | — | **YOK** | Çalışan API endpoint'i, veritabanı okuma tablosu, toplu EPC okuma/eşleştirme ekranı veya okuyucu adaptörü yok. | **YENİ EKLE** *(WMS + Mobil içi EPC girişi & adaptör)* |
| 18. Çoklu depo | `Warehouse`, `StockBalance`, [`StorageBinGrid.tsx`](file:///c:/Users/!/Desktop/Sunum%20ERP/app/dashboard/wms/components/StorageBinGrid.tsx) | `/dashboard/stok`, `/dashboard/wms` | Stok ve Depo → 1. Stok / 2. WMS | **YÜZEYSEL** | Depo ekleme/düzenleme/pasife alma UI'ı yok; şube bazlı yetki/veri izolasyonu API'de yok; seed'de mükerrer depo adı ve `wh-merkez` tutarsızlığı mevcut. | **DERİNLEŞTİR** |
| 19. Depo KPI'ları | [`WmsSummaryCards.tsx`](file:///c:/Users/!/Desktop/Sunum%20ERP/app/dashboard/wms/components/WmsSummaryCards.tsx), [`StockSummaryCards.tsx`](file:///c:/Users/!/Desktop/Sunum%20ERP/app/dashboard/stok/components/StockSummaryCards.tsx) | `/dashboard/stok`, `/dashboard/wms` | Stok ve Depo → 1. Stok / 2. WMS | **YÜZEYSEL** | Yalnızca ham sayaçlar (görev adedi, doluluk %, son sayım doğruluk %); OTIF, Dock-to-Stock, sipariş karşılama (Fill Rate), stok devir hızı, ölü/SKT riski tutarı yok. | **DERİNLEŞTİR** |

### 2.2 Sevkiyat / Rota / Dağıtım (9 Öğe)

| Özellik | Mevcut Ekran / Dosya Yolu | URL | Menü Yolu | Durum | Yüzeysel Olma / Eksik Nedeni | Karar |
| --- | --- | --- | --- | --- | --- | --- |
| 20. Sevkiyat / sefer planı | [`app/dashboard/cargo/page.tsx`](file:///c:/Users/!/Desktop/Sunum%20ERP/app/dashboard/cargo/page.tsx), [`OmnichannelOrdersManager.tsx`](file:///c:/Users/!/Desktop/Sunum%20ERP/app/dashboard/omnichannel/components/OmnichannelOrdersManager.tsx) | `/dashboard/cargo`, `/dashboard/omnichannel` | Satış → Kargo Takip; Stok → 4. Çok Kanallı Satış & Sevkiyat | **YÜZEYSEL** | Yalnızca dış kargo takip numarası (`Yurtiçi/Aras`) ve metin tabanlı `WarehouseTransferOrder` plaka alanı var; araç/şoför/durak gruplu Sefer Planı (`Trip`/`DispatchPlan`) entity'si ve konsolide yükleme ekranı yok. | **DERİNLEŞTİR** *(Bkz. Konsolidasyon Notu & SORU-1)* |
| 21. Araç kapasitesi | Yok | — | — | **YOK** | Araç bazlı max kg, max m³, palet/koli slotu, soğuk zincir bölmesi doluluk hesaplama ve aşırı yükleme engeli yok. | **YENİ EKLE** |
| 22. Çok duraklı rota optimizasyonu | Yok | — | — | **YOK** | Durak sıralama algoritması (en yakın komşu/2-opt vb.), mesafe/süre hesaplama veya harici rota motoru adaptörü yok. | **YENİ EKLE** |
| 23. Zaman pencereleri | Yok | — | — | **YOK** | Müşteri teslimat zaman penceresi (`timeWindowStart–End`), soğuk zincir SLA penceresi ve ihlal uyarısı yok. | **YENİ EKLE** |
| 24. Sürücü mobil ekranı | Yok (`/dashboard/wms/mobil` yalnız depo içi) | — | — | **YOK** | Sürücüye özel günlük sefer listesi, durak sırası, teslimat/teslim edilememe durum güncellemesi ve navigasyon bağlantısı içeren mobil ekran yok. | **YENİ EKLE** |
| 25. Teslimat kanıtı (foto/imza) | Yok (yalnız genel `/api/upload`) | — | — | **YOK** | Teslim anı imza tuvali (signature pad), fotoğraf çekme/yükleme, alıcı TCKN/ad soyad ve zaman/konum damgası yok. | **YENİ EKLE** |
| 26. ETA / gecikme | Yok | — | — | **YOK** | Durak bazlı tahmini varış (ETA), gerçek varış kıyaslaması ve gecikme alarmı/müşteri bildirimi yok. | **YENİ EKLE** |
| 27. Yeniden planlama | Yok | — | — | **YOK** | Gecikme, araç arızası veya kapalı adres durumunda kalan durakları başka araca/sonraki güne devretme akışı yok. | **YENİ EKLE** |
| 28. E-İrsaliye tetikleme | [`EDocumentViewer.tsx`](file:///c:/Users/!/Desktop/Sunum%20ERP/app/dashboard/omnichannel/components/EDocumentViewer.tsx), [`omnichannelServerDb.ts`](file:///c:/Users/!/Desktop/Sunum%20ERP/lib/services/omnichannelServerDb.ts) (`createGibEDocument`) | `/dashboard/omnichannel` (`edoc`) | Stok ve Depo → 4. Çok Kanallı Satış & Sevkiyat | **YÜZEYSEL** | `createGibEDocument` mevcut ama yalnızca manuel modal ile E-İrsaliye kesiliyor; sefer/parçalı sevk/depo transfer çıkışında otomatik E-İrsaliye taslağı/kesimi ve gerçek karekod/UBL XML önizleme yok. | **DERİNLEŞTİR** |

### 2.3 Tedarikçi Yönetimi (9 Öğe)

| Özellik | Mevcut Ekran / Dosya Yolu | URL | Menü Yolu | Durum | Yüzeysel Olma / Eksik Nedeni | Karar |
| --- | --- | --- | --- | --- | --- | --- |
| 29. Ana veri ve sınıflandırma (GLN dahil) | `Supplier` modeli, [`CreateRequisitionModal.tsx`](file:///c:/Users/!/Desktop/Sunum%20ERP/app/dashboard/satinalma/components/CreateRequisitionModal.tsx), [`procurementReorderEngine.ts`](file:///c:/Users/!/Desktop/Sunum%20ERP/lib/services/procurementReorderEngine.ts) | `/dashboard/satinalma` | Stok ve Depo → 3. Satın Alma & Otomatik Sipariş | **YÜZEYSEL** | Tedarikçiler yalnızca PR açılırken dropdown'da görünüyor; Tedarikçi listesi/CRUD ekranı, **GLN** (Global Location Number), segment/tier (Stratejik/Onaylı/Riskli), belge/sertifika ve `SupplierItem` ürün-fiyat matrisi yok. | **DERİNLEŞTİR** |
| 30. RFQ / teklif karşılaştırma | Yok | — | — | **YOK** | Çoklu tedarikçiye teklif talebi (RFQ) gönderme, fiyat/termin/vade tekliflerini yan yana karşılaştırma ve kazananı PO'ya dönüştürme yok. | **YENİ EKLE** *(Satın Alma içi yeni sekme)* |
| 31. Satınalma siparişi onay akışı | [`PurchaseRequisitionsList.tsx`](file:///c:/Users/!/Desktop/Sunum%20ERP/app/dashboard/satinalma/components/PurchaseRequisitionsList.tsx), [`procurementServerDb.ts`](file:///c:/Users/!/Desktop/Sunum%20ERP/lib/services/procurementServerDb.ts) | `/dashboard/satinalma` | Stok ve Depo → 3. Satın Alma & Otomatik Sipariş | **YÜZEYSEL** | Talep (`PR`) ve Sipariş (`PO`) ayrımı yok; sabit `"Satın Alma Müdürü"` metniyle tek tuş onay atıyor; tutar bazlı çok kademeli onay, red/revizyon nedeni, RBAC ve PO→Mal Kabul kapama yok. | **DERİNLEŞTİR** |
| 32. ASN (sevk bildirimi) | Yok | — | — | **YOK** | Tedarikçiden gelecek yükleme bildirimi (`ASN`: irsaliye no, beklenen koli/SSCC, lot/SKT, araç plakası, ETA) ve bunun tek tıkla WMS Mal Kabul görevine çevrilmesi yok. | **YENİ EKLE** *(Satın Alma + WMS Mal Kabul entegreli)* |
| 33. Performans (zamanında teslim, kalite, fiyat) | [`procurementReorderEngine.ts`](file:///c:/Users/!/Desktop/Sunum%20ERP/lib/services/procurementReorderEngine.ts), [`productionQualityServerDb.ts`](file:///c:/Users/!/Desktop/Sunum%20ERP/lib/services/productionQualityServerDb.ts) (`getSupplierQualityRatingsReport`) | `/dashboard/uretim/kalite` | Üretim → 5. Kalite Kontrol | **YÜZEYSEL** | `Supplier.onTimeDeliveryRate` veritabanında/sabitte statik; gerçek PO termin vs GRN teslim tarihi sapmasından hesaplanmıyor; fiyat uyum/sapma metriği hiç yok; kalite verisi yalnızca üretim modülünde. | **DERİNLEŞTİR** |
| 34. Skor kartı | [`ProductionQualityWorkspace.tsx`](file:///c:/Users/!/Desktop/Sunum%20ERP/app/dashboard/uretim/components/ProductionQualityWorkspace.tsx) (`Tedarikçi Kalite Skor Kartı`) | `/dashboard/uretim/kalite` (`reports`) | Üretim → 5. Kalite Kontrol | **YÜZEYSEL** | Yalnızca mal kabul muayene kabul oranını gösteriyor; OTD % + Kalite % + Fiyat % + Termin Uyum % ağırlıklı bütünsel Satın Alma Skor Kartı `/dashboard/satinalma` altında yok. | **DERİNLEŞTİR** |
| 35. Tek tedarikçi risk uyarısı | Yok (`InventoryItem.defaultSupplierId` tek FK) | — | — | **YOK** | Kritik/A sınıfı ürünlerde alternatif onaylı tedarikçi eksikliği veya tek kaynağa >%80 bağımlılık tespit eden risk kuralı ve uyarı listesi yok. | **YENİ EKLE** |
| 36. EOQ / yeniden sipariş noktası ve otomatik sipariş önerisi | [`CriticalStockRopTable.tsx`](file:///c:/Users/!/Desktop/Sunum%20ERP/app/dashboard/satinalma/components/CriticalStockRopTable.tsx), [`procurementReorderEngine.ts`](file:///c:/Users/!/Desktop/Sunum%20ERP/lib/services/procurementReorderEngine.ts) (`calculateEoq`) | `/dashboard/satinalma` | Stok ve Depo → 3. Satın Alma & Otomatik Sipariş | **YÜZEYSEL** | `calculateDynamicReorderPoint` çalışıyor ancak motordaki `calculateEoq` servis/UI tarafından hiç çağrılmıyor; `ReorderPolicy` tablosu boş (0 satır) ve parametre (sipariş/elde tutma maliyeti) düzenleme UI'ı yok. | **DERİNLEŞTİR** |
| 37. Tedarikçi portalı | Yok | — | — | **YOK** | Tedarikçilerin açık PO'ları görüp teyit edeceği, RFQ fiyat teklifi vereceği, ASN keseceği ve kendi skor kartını izleyeceği portal arayüzü yok. | **YENİ EKLE** |

### 2.4 Filo ve Araç Takip (7 Öğe)

> **Önemli Ayrım:** Sistemdeki [`app/dashboard/uretim/bakim/page.tsx`](file:///c:/Users/!/Desktop/Sunum%20ERP/app/dashboard/uretim/bakim/page.tsx) ekranı yalnızca fabrika üretim makineleri içindir (`UretimMachineAsset`). Karayolu araç filosu ve sürücü yönetimi sistemde **hiç yoktur**.

| Özellik | Mevcut Ekran / Dosya Yolu | URL | Menü Yolu | Durum | Yüzeysel Olma / Eksik Nedeni | Karar |
| --- | --- | --- | --- | --- | --- | --- |
| 38. Araç / şoför ana verisi | Yok (yalnız `WarehouseTransferOrder` & `EDocumentRecord` serbest metin plaka/ad) | — | — | **YOK** | Plaka, şasi/ruhsat, taşıma kapasitesi (kg/m³), soğuk zincir donanımı, sürücü ehliyet/SRC/psikoteknik kayıtları yok. | **YENİ EKLE** |
| 39. Bakım takvimi ve uyarıları | Yok (`uretim/bakim` fabrika makineleri içindir) | — | — | **YOK** | Araç km ve tarih bazlı periyodik servis/lastik/frigorifik bakım takvimi ve vadesi yaklaşan servis uyarısı yok. | **YENİ EKLE** |
| 40. Yakıt kayıtları ve mutabakat | Yok (`FinanceClient.tsx` yalnız `"Araç & Yakıt"` gider etiketi içerir) | — | — | **YOK** | Yakıt fişi/istasyon kartı dolum kaydı, litre/tutar/km tüketim (L/100km) ve filo kartı ekstre mutabakatı yok. | **YENİ EKLE** |
| 41. Km başı maliyet | Yok | — | — | **YOK** | Yakıt + bakım + sigorta/vergi + kiralama/amortisman toplamının araç/sefer kat edilen km'ye bölündüğü TCO analizi yok. | **YENİ EKLE** |
| 42. Telematik veri alımı (konum/yakıt olayları) | Yok (`/api/production/iot-ingest` yalnız üretim PLC içindir) | — | — | **YOK** | Araç GPS koordinatı, hız, soğuk kasa içi sıcaklık ve yakıt/kontak olaylarını alan telematik ingest API + sağlayıcı adaptörü yok. | **YENİ EKLE** |
| 43. Harita üzerinde canlı filo | Yok (projede harita kütüphanesi yok) | — | — | **YOK** | Aktif araçları, son telematik konumlarını, durakları ve soğutucu/gecikme durumlarını gösteren canlı harita bileşeni yok. | **YENİ EKLE** |
| 44. Ceza / sigorta / muayene takibi | Yok | — | — | **YOK** | Trafik cezası (sürücü/araç eşleşmeli), Kasko/Trafik sigortası, TÜVTÜRK muayene ve ehliyet geçerlilik tarihi takibi ile yaklaşan süre alarmları yok. | **YENİ EKLE** |

### 2.5 Tersine Lojistik / İade (9 Öğe)

| Özellik | Mevcut Ekran / Dosya Yolu | URL | Menü Yolu | Durum | Yüzeysel Olma / Eksik Nedeni | Karar |
| --- | --- | --- | --- | --- | --- | --- |
| 45. RMA belgesi | [`RmaReturnManager.tsx`](file:///c:/Users/!/Desktop/Sunum%20ERP/app/dashboard/omnichannel/components/RmaReturnManager.tsx), `ReturnRmaRecord` | `/dashboard/omnichannel` (`rma`) | Stok ve Depo → 4. Çok Kanallı Satış & Sevkiyat | **YÜZEYSEL** | Yalnızca seed veya webhook kayıtları listeleniyor; yeni RMA belgesi oluşturma modalı, lot/seri bağlantısı, çok kalemli RMA ve yazdırılabilir iade formu yok. | **DERİNLEŞTİR** |
| 46. İade neden kodları | [`RmaReturnManager.tsx`](file:///c:/Users/!/Desktop/Sunum%20ERP/app/dashboard/omnichannel/components/RmaReturnManager.tsx) (`returnReason` metni) | `/dashboard/omnichannel` (`rma`) | Stok ve Depo → 4. Çok Kanallı Satış & Sevkiyat | **YÜZEYSEL** | Standart enum/katalog (`HASARLI_KARGO`, `YANLIS_URUN`, `CAYMA_HAKKI`, `KALITE_HATASI`, `SKT_SORUNU`, `TESLIM_EDILEMEDI`) yerine serbest metin alanı kullanılıyor. | **DERİNLEŞTİR** |
| 47. İade mal kabul | [`RmaReturnManager.tsx`](file:///c:/Users/!/Desktop/Sunum%20ERP/app/dashboard/omnichannel/components/RmaReturnManager.tsx) | `/dashboard/omnichannel` (`rma`) | Stok ve Depo → 4. Çok Kanallı Satış & Sevkiyat | **YÜZEYSEL** | Fiziksel iade paketini teslim alma, hasar fotoğrafı ekleme ve depoda iade/karantina girişi (`RMA_INBOUND`) oluşturma adımı yok. | **DERİNLEŞTİR** |
| 48. Karantina / kalite kontrol | [`RmaReturnManager.tsx`](file:///c:/Users/!/Desktop/Sunum%20ERP/app/dashboard/omnichannel/components/RmaReturnManager.tsx), [`omnichannelServerDb.ts`](file:///c:/Users/!/Desktop/Sunum%20ERP/lib/services/omnichannelServerDb.ts) | `/dashboard/omnichannel` (`rma`) | Stok ve Depo → 4. Çok Kanallı Satış & Sevkiyat | **YÜZEYSEL** | `"Karantinaya Al"` butonu sadece `ReturnRmaRecord.qcInspectionResult` string'ini güncelliyor; stok bakiyesini karantina rafına almıyor, lotu kilitlemiyor ve kalite NCR kaydına bağlamıyor. | **DERİNLEŞTİR** |
| 49. Yeniden stoklama / tamir / hurda yönlendirmesi | [`RmaReturnManager.tsx`](file:///c:/Users/!/Desktop/Sunum%20ERP/app/dashboard/omnichannel/components/RmaReturnManager.tsx), [`omnichannelFulfillmentEngine.ts`](file:///c:/Users/!/Desktop/Sunum%20ERP/lib/services/omnichannelFulfillmentEngine.ts) | `/dashboard/omnichannel` (`rma`) | Stok ve Depo → 4. Çok Kanallı Satış & Sevkiyat | **YÜZEYSEL** | `RESTOCK_TO_BIN` hatalı `"wh-merkez"` ID'sine stok atıyor; `Tamir/Yenileme (REPAIR)`, `Hurda/İmha (SCRAP)` ve `Tedarikçiye İade (RETURN_TO_VENDOR)` aksiyonları ile stok/maliyet yansımaları eksik. | **DERİNLEŞTİR** |
| 50. Kredi notası tetikleme | [`RmaReturnManager.tsx`](file:///c:/Users/!/Desktop/Sunum%20ERP/app/dashboard/omnichannel/components/RmaReturnManager.tsx) (`refundAmount`, `refundStatus`) | `/dashboard/omnichannel` (`rma`) | Stok ve Depo → 4. Çok Kanallı Satış & Sevkiyat | **YÜZEYSEL** | `APPROVED_CREDITED` yalnızca statik metin etiketi; onayda `Finance` modülüne gerçek iade/alacak dekontu veya gider kaydı yazmıyor. | **DERİNLEŞTİR** |
| 51. 14 gün iade süresi takibi | Yok | — | — | **YOK** | Sipariş teslim tarihine göre yasal 14 günlük cayma hakkı son tarihini hesaplama, kalan gün sayacı ve süresi dolan iadelerde istisna onayı yok. | **YENİ EKLE** *(Omnichannel `rma` sekmesi içinde)* |
| 52. E-ticaret iade webhook'u | [`app/api/webhooks/omnichannel/route.ts`](file:///c:/Users/!/Desktop/Sunum%20ERP/app/api/webhooks/omnichannel/route.ts) (`RETURN_REQUEST`) | `/api/webhooks/omnichannel` | — | **YÜZEYSEL** | Gelen JSON'dan RMA kaydı oluşturuyor ancak HMAC imza doğrulaması, idempotency (mükerrer olay engeli), kanal bazlı payload adaptörleri, log geçmişi UI'ı ve geri bildirim callback'i yok. | **DERİNLEŞTİR** |
| 53. İade analiz raporu | Yok | — | — | **YOK** | Neden koduna göre iade oranı, kanal/ürün/taşıyıcı bazlı iade maliyeti, geri kazanım vs hurda oranı analitiği yok. | **YENİ EKLE** *(Omnichannel `rma` sekmesi içinde)* |

### 2.6 Ekran Konsolidasyonu & Yerleşim Önerisi (Kural 2 Uyarınca)

* **WMS (Cross-docking, Kitting, SSCC/LPN, RFID, LocationDirective):** Yeni menü eklemek yerine `/dashboard/wms` ekranına yeni sekmeler eklenmeli; `/dashboard/wms/mobil` görev güdümlü + RFID/kamera destekli derinleştirilmeli.
* **Tedarikçi (Ana veri/GLN, RFQ, Onay, ASN, Skor Kartı, Risk, Portal):** Yeni menü yerine `/dashboard/satinalma` sekmeleri genişletilmeli (Tedarikçiler & Skor Kartı, RFQ/Teklif, ASN Mal Kabul, Risk Analizi); Tedarikçi Portalı için rol/token tabanlı ayrık görünüm (`SORU-4` onayına göre) eklenebilir.
* **Tersine Lojistik:** `/dashboard/omnichannel` içindeki `İade & RMA` sekmesi yerinde derinleştirilmeli (RMA açma, neden kodları, 14 gün sayacı, karantina→tamir/hurda/RTV yönlendirme, `Finance` kredi notası tetiği, webhook log ve iade analiz raporu).
* **Sevkiyat/Rota ve Filo:** `/dashboard/cargo` (dış kargo + `FileDelivery`) ve `/dashboard/omnichannel` (e-ticaret/B2B sipariş sevkiyatı + E-İrsaliye) korunmalı; ancak sistemde hiçbir karşılığı olmayan **Araç/Şoför/Bakım/Yakıt/Telematik/Canlı Harita (Filo)** ve **Çok Duraklı Sefer/Rota + Sürücü Mobil + POD** için kullanıcı onayıyla net konumlandırma yapılmalıdır *(Bkz. SORU-1)*.

---

## 3. Demo Mekanizması ve Canlı (Vercel) Dağıtım Analizi

Sistemde şu anda **iki farklı ve birbirinden kopuk demo veri mekanizması** birlikte çalışmaktadır:

### 3.1 Yol A — İstemci `DemoInterceptor` + `mockDatabase`

* **Kontrol Değişkeni:** [`lib/data-controller.ts`](file:///c:/Users/!/Desktop/Sunum%20ERP/lib/data-controller.ts) içindeki `isDemoModeActive()` fonksiyonu, `.env` içinde tanımlı `NEXT_PUBLIC_USE_MOCK_DATA="true"` değerine veya `sessionStorage`/`cookie` demo bayrağına göre `true` döner.
* **İstemci Müdahalesi:** [`components/demo-interceptor.tsx`](file:///c:/Users/!/Desktop/Sunum%20ERP/components/demo-interceptor.tsx) tarayıcıdaki `window.fetch` çağrılarını yakalar ve veriyi `localStorage` + `lib/data/mockDatabase.ts` üzerinden simüle eder; **ancak** `/api/inventory`, `/api/wms`, `/api/procurement`, `/api/omnichannel`, `/api/inventory-ai`, `/api/ecosystem`, `/api/v1/` yollarını açıkça **muaf tutar** ve gerçek Next.js API rotalarına geçirir.
* **Sunucu Tarafı `isDemoModeActive()` Sapması:** `app/api/cargo/route.ts`, `app/api/orders/route.ts`, `app/api/production/quality/route.ts` ve `app/api/production/maintenance/route.ts` içinde sunucu tarafı `if (isDemoModeActive()) return mockDatabase...` kontrolü bulunduğu için Prisma/JSON DB atlanmaktadır.
* **5 Yeni Stok/WMS Sayfasındaki Hibrit Davranış:** `/dashboard/stok`, `/dashboard/wms`, `/dashboard/satinalma`, `/dashboard/omnichannel` ve `/dashboard/stok-ai` sayfaları başlangıç `useState` değerini `mockDatabase` (`lib/data/mockInventoryData.ts`) ile doldurup ardından `/api/...` isteği atar; API boş/hatalı dönerse `mockDatabase` verisine geri düşer.

### 3.2 Yol B — Sunucu `DEVRESILIENCE` JSON DB (`.local-db.json`)

* **Bağlantı Fallback Mekanizması (`lib/db.ts`):** Ortamda `localhost:5432` üzerinde çalışan bir PostgreSQL sunucusu olmadığından Prisma `P1001` ("Can't reach database server") hatası alır. `lib/db.ts` içindeki `Proxy` katmanı (`DEVRESILIENCE`) bu hatayı yakalar ve tüm `prisma.<model>` çağrılarını [`storage/ajans-kutuphanesi/.local-db.json`](file:///c:/Users/!/Desktop/Sunum%20ERP/storage/ajans-kutuphanesi/.local-db.json) dosyası üzerinde çalıştıran `ModelSimulate` sınıfına yönlendirir.
* **Çalışma Zamanı Otomatik Tohumlama (Runtime Seeders):** Stok, WMS, Satınalma ve Omnichannel GET uç noktaları, ilgili tablo boşsa servis katmanındaki `seedRealisticInventoryData`, `seedRealisticWmsData`, `seedRealisticProcurementData`, `seedRealisticOmnichannelData` fonksiyonlarını çağırıp kayıtları doğrudan `.local-db.json` (veya bağlıysa PostgreSQL) içine yazar.

### 3.3 Canlı Sitede (Vercel) Dağıtım ve Kalıcılık Durumu

* `.gitignore` içinde `.local-db.json` dışlanmamıştır (depo git geçmişine doğrudan dâhildir, **604 KB**); `.vercelignore` yalnızca `/prisma/dev.db` ve `/storage/backups` gibi yerel artifaktları dışlar.
* **Kritik Kalıcılık Kısıtı (`lib/db.ts` satır 365–372):** Vercel Serverless Functions dosya sistemi **salt okunurdur (EROFS)** (sadece `/tmp` yazılabilir ancak kalıcı değildir). `writeJsonDb()` hatayı `try/catch` ile yutar (`console.error("[DEVRESILIENCE] JSON DB yazma hatası:", err)`). Bu nedenle:
  1. Deployment paketine gömülü `.local-db.json` içindeki **başlangıç demo verisi Vercel'de %100 okunur ve her ekranda görünür**.
  2. Ancak Vercel'de PostgreSQL (`DATABASE_URL`) tanımlı değilse, canlı sitede demo sırasında kullanıcı tarafından yapılan **yeni kayıt/güncelleme işlemleri kalıcı olmaz** (bir sonraki cold start'ta `.local-db.json` başlangıç haline döner; yalnızca `app/api/webhooks/omnichannel` veya `upload` gibi işlemler disk yazma hatası almaz görünse de persist etmez).

### 3.4 Mevcut Seed Betikleri ve Kritik Veri Silme Riski

| Betik | Hedef | Mevcut Durum ve Risk |
| --- | --- | --- |
| [`scripts/seed-demo-database.js`](file:///c:/Users/!/Desktop/Sunum%20ERP/scripts/seed-demo-database.js) (`npm run seed:demo`) | `.local-db.json` | **KRİTİK RİSK:** Dosyayı sıfırdan üzerine yazar ve yalnızca **49 çekirdek koleksiyonu** oluşturur (`branch`, `user`, `customer`, `order`, `cargoTracking` vb.). Çalıştırıldığında **tüm stok/WMS/satınalma/omnichannel/üretim koleksiyonlarını SİLER** (ve mevcut 2026-11-04 tarihli lojistik demo verisi uçabilir). |
| [`scripts/seed-local-json.js`](file:///c:/Users/!/Desktop/Sunum%20ERP/scripts/seed-local-json.js) | `.local-db.json` | Var olan JSON DB'ye varsayılan 5 rol + 17 modül ekler (`Depo Lojistik` dahil); ancak gerçek `.local-db.json` içinde şu an farklı 6 rol ve 22 modül kayıtlıdır. |
| [`scripts/seed.js`](file:///c:/Users/!/Desktop/Sunum%20ERP/scripts/seed.js) | Prisma DB | Yalnızca temel roller/kullanıcılar için klasik Prisma seed betiğidir. |

### 3.5 `.local-db.json` Mevcut Demo Kayıtları Özeti (128 Koleksiyon)

* **Organizasyon ve Kimlik:**
  * `branch (4)`: `local-debug-branch` (`HQ` - Merkez Şube İstanbul Levent), `branch-ankara` (`ANK-001`), `branch-izmir` (`IZM-001`), `branch-bursa` (`BUR-001`).
  * `user (13)`: `cicekana.dev`, `admin`, `melis.sen`, `cem.aslan`, `emre.yildirim`, `kemal.ozturk`, `zeynep.demir`, `burak.celik`, `selin.aydin`, `deniz.arda`, `ahmet.kurt`, `volkan.koc`, `ece.tan`.
  * `role (6)`: `Super Admin`, `Şube Müdürü`, `Saha Satış`, `Muhasebe & Finans`, `İnsan Kaynakları`, `Kreatif & Tasarım`. (`module (22)`: `dashboard`..`ajans-kutuphanesi` — yeni lojistik/stok/üretim modül anahtarları DB `role`/`module` tablolarında henüz kayıtlı değildir).
* **Depolar, Bölgeler ve Raflar:**
  * `warehouse (4)`: `wh-merkez-01` (`DEP-MRK-01`, Merkez Soğuk Hava & Lojistik Deposu +4°C, Tuzla), `wh-kadikoy-02` (`DEP-KDK-02`, Kadıköy Butik Mağaza & Showroom), `wh-online-03` (`DEP-ETC-03`, E-Ticaret & Hızlı Dağıtım Hub, Ümraniye), `wh-atolye-03` (`DEP-ATL-03`, Ataşehir — adı yinelenmiş).
  * `warehouseZone (5)`: `zone-cold-01` (`Z-SOGUK`, +2/+4°C), `zone-fast-01` (`Z-HIZLI`), `zone-qc-01` (`Z-RAMPA`), `zone-dry-01` (`Z-KURU`), `zone-kdk-01` (`Z-KDK-MAG`).
  * `storageBin (9)`: `A-01-01`, `A-01-02`, `B-01-01`, `B-01-02`, `MAG-01`, `R-01-01`, `C-01-01`, `M-01-01`, `T-01-01`.
* **Ürün, Bakiye, Lot ve Hareketler:**
  * `inventoryItem (10)`: `GUL-EKV-01` (Ekvator Kırmızı Gül), `LIL-KAZ-02` (Beyaz Kazablanka Lilyum), `VAZ-ANT-03` (Mat Antrasit Seramik Vazo), `SNG-OAS-04` (Oasis Çiçek Süngeri), `ORK-MOR-05` (Mor Orkide), `BKT-PST-06` + `PUD`/`BEY` varyantları (Gelin Buketi), `ARJ-VIP-07` (VIP Seramik Aranjman - reçeteli), `PAP-KIR-08` (Papatya Kır Buketi). (`product (23)` ise B2B/legacy sipariş ürün kataloğudur).
  * `stockBalance (10)`, `unitConversion (2)`, `lotSerialRecord (3)` (`LOT-GUL-2026-A` SKT `2026-11-10`, `LOT-LIL-2026-B` SKT `2026-11-08`, `LOT-TEST-01`), `costLayer (8)`, `stockMovement (8)`, `bomHeader (1)`, `bomComponent (4)`.
* **WMS Operasyonları:**
  * `wmsTask (4)`: `TSK-RCV-2026-001` (`GOODS_RECEIPT`), `TSK-QC-2026-002` (`QC_INSPECTION`), `TSK-PUT-2026-003` (`WAVE_PICK`), `TSK-PCK-2026-004` (`WAVE_PICK`).
  * `warehouseTransferOrder (1)`: `TRF-2026-001` (`wh-merkez-01` → `wh-kadikoy-02`, `IN_TRANSIT`, Taşıyıcı: `"Sunum Lojistik Filo"`, Plaka: `"34 SNR 808"`, Şoför: `"Cemal Kaya"`).
  * `inventoryCountSession (1)`: `SYM-2026-11-01` (`BLIND_COUNT`, `RECONCILED`), `inventoryCountLine (2)`, `wmsOfflineSyncLog (1)`.
* **Tedarik, Omnichannel, İade ve Kargo:**
  * `supplier (4)`: `SUP-FLORA-01` (Royal Flora Holland), `SUP-YALOVA-02` (Yalova Çiçek Kooperatifi), `SUP-PASA-03` (Paşabahçe & Paşa Cam), `SUP-AMB-04` (Marmara Kraft Ambalaj).
  * `purchaseRequisition (1)` (`PR-2026-001`), `consignmentStock (2)` (`KSN-2026-FLORA-001`, `KSN-2026-PASA-002`).
  * `salesChannel (4)` (`TRENDYOL`, `HEPSIBURADA`, `SHOPIFY`, `SUNUM-B2B`), `omnichannelOrder (4)` (`OMN-2026-9041` KoçSistem, `9042` Borusan, `9043` Eczacıbaşı Monrol, `TY-TEST-9921` Ayşe Yılmaz), `orderShipmentLine (5)`.
  * `returnRmaRecord (2)` (`RMA-2026-001` Tekfen, `RMA-2026-002` Anadolu Efes), `logisticsAdapterConfig (3)` (`YURTICI`, `ARAS`, `UPS`), `eDocumentRecord (1)` (`IRS2026000000891` — Plaka: `"34 SNR 720"`, Şoför: `"Kemal Öztürk"`).
  * `customer (12)`, `order (14)`, `cargoTracking (6)` (`cargo-01`..`cargo-06`).
* **Boş (0 Kayıtlı) Tablolar:** `alternativeProduct`, `traceabilityLog`, `locationDirective`, `licensePlate`, `licensePlateContent`, `reorderPolicy`, `lowStockAlert`, `demandForecastRecord`, `aiNarrativeReport`, `inventoryApiKey`, `inventoryWebhook`, `marketplacePlugin`, `erpMigrationJob` ve tüm `uretim*` tabloları.

---

## 4. Yatay Altyapı Özetleri

### 4.1 Özellik Bayrağı Mekanizması

* **Dosyalar:** [`lib/system-config.ts`](file:///c:/Users/!/Desktop/Sunum%20ERP/lib/system-config.ts), [`lib/config/production-feature-flags.ts`](file:///c:/Users/!/Desktop/Sunum%20ERP/lib/config/production-feature-flags.ts), [`storage/system_config.json`](file:///c:/Users/!/Desktop/Sunum%20ERP/storage/system_config.json), `app/api/system-config/route.ts`.
* **İşleyiş:** Şu anda bayrak yapısı 6 üretim anahtarına (`uretim_bom_rota`, `uretim_mrp_mps`, `uretim_is_emri`, `uretim_kapasite`, `uretim_kalite`, `uretim_bakim`) bağlıdır; şube bazlı `branchOverrides` ve ortam değişkeni (`FEATURE_*`) destekler. Mevcut ortamda `storage/system_config.json` içinde bu 6 bayrağın tamamı **`true`** olarak ayarlıdır.
* **Lojistik/WMS Durumu:** Mevcut Stok/WMS/Satınalma/Omnichannel sayfaları özellik bayrağı kullanmamaktadır. Yeni eklenecek Lojistik/Filo/Rota/Portal/Tersine Lojistik özellikleri için aynı `system_config.json` yapısını genişleterek demo ortamında varsayılan AÇIK (`true`), müşteri ekranında gizli bayrak mimarisi kurulabilir.

### 4.2 Yetki Sistemi (RBAC)

* **Dosyalar:** [`lib/auth/permissions.ts`](file:///c:/Users/!/Desktop/Sunum%20ERP/lib/auth/permissions.ts), [`lib/auth/server-permission.ts`](file:///c:/Users/!/Desktop/Sunum%20ERP/lib/auth/server-permission.ts), [`lib/auth/context.tsx`](file:///c:/Users/!/Desktop/Sunum%20ERP/lib/auth/context.tsx), [`app/dashboard/settings/roles/page.tsx`](file:///c:/Users/!/Desktop/Sunum%20ERP/app/dashboard/settings/roles/page.tsx).
* **Tespit Edilen Açıklar:**
  1. `/api/inventory`, `/api/wms`, `/api/procurement`, `/api/omnichannel`, `/api/inventory-ai`, `/api/ecosystem` uç noktalarının **hiçbirinde** `requirePermission` çağrısı yoktur (oturumsuz/yetkisiz istek engellenmiyor).
  2. `.local-db.json` içindeki `role` ve `module` tablolarında `stok`, `wms`, `satinalma`, `omnichannel`, `filo`, `sevkiyat` izin kaynakları henüz kayıtlı değildir.
  3. Baz (`baseline`) test çıktısında `isSuperAdminUser()` fonksiyonu `Super Admin` kullanıcısı `cicekana.dev` için `false` döndürmüştür (`scripts/test-auth-matrix.ts` çıktısı).

### 4.3 Tasarım Sistemi ve UI Bileşen Envanteri

* **Tema & Görsel Dil (Obsidian Carbon & Emerald Mint):**
  * Kart/yüzeyler: `bg-[#111513]/90 backdrop-blur-xl border border-white/[0.06] rounded-[20px] shadow-2xl`.
  * Vurgu ve birincil butonlar: `#34D399` (Emerald), butonlarda `rounded-full` ve koyu metin (`text-[#061811]` / `text-black`), ikincil butonlarda `bg-white/[0.04] border-white/[0.08]`.
  * Sekme çubukları: `bg-[#111513] p-1 rounded-full border border-white/[0.06]` ve `framer-motion` `layoutId="activeTab"`.
  * Tablolar: `bg-white/[0.02]` başlık, `text-[11px] uppercase tracking-wider text-zinc-400`, satırlarda `border-l-2 border-l-transparent hover:border-l-emerald-400`.
  * Animasyon & ikonlar: `lucide-react` + `material-symbols-outlined`, `AnimatedNumber`, `StaggerItem` (`components/ui/motion-primitives.tsx`), `sonner` (`toast`), Türkçe lokalizasyon (`tr-TR` tarih ve `TRY` para formatı).
* **Hazır `components/ui/*` Envanteri (62 dosya):** `accordion`, `alert`, `alert-dialog`, `aspect-ratio`, `avatar`, `badge`, `breadcrumb`, `button`, `button-group`, `calendar`, `card`, `carousel`, `chart`, `checkbox`, `collapsible`, `command`, `context-menu`, `dialog`, `drawer`, `dropdown-menu`, `empty`, `field`, `form`, `glass-folder-cards`, `hover-card`, `input`, `input-group`, `input-otp`, `item`, `kbd`, `label`, `menubar`, `motion-primitives`, `navigation-menu`, `pagination`, `popover`, `progress`, `radio-group`, `resizable`, `scroll-area`, `select`, `separator`, `sheet`, `sidebar`, `skeleton`, `slider`, `sonner`, `spinner`, `switch`, `system-banner`, `system-modal`, `table`, `tabs`, `textarea`, `toast`, `toaster`, `toggle`, `toggle-group`, `tooltip`, `use-mobile`, `use-toast`, `virtual-list`.

### 4.4 Bildirim Altyapısı

* `lib/notifications/service.ts`, [`lib/notifications/catalog.ts`](file:///c:/Users/!/Desktop/Sunum%20ERP/lib/notifications/catalog.ts), `lib/services/notificationService.ts` (`createNotification`, `createNotificationMany`), `lib/webpush.ts`, [`components/notification-panel.tsx`](file:///c:/Users/!/Desktop/Sunum%20ERP/components/notification-panel.tsx) (30 sn polling ile `/api/notifications`), `/api/notifications/stream` (SSE).

### 4.5 Dosya ve Fotoğraf Yükleme Altyapısı

* `app/api/upload/route.ts` & `app/api/uploads/[filename]/route.ts`, [`app/api/files/route.ts`](file:///c:/Users/!/Desktop/Sunum%20ERP/app/api/files/route.ts), `app/api/file-delivery/route.ts`, `components/shared/file-picker.tsx`, ayrıca Ajans Kütüphanesi chunked upload (`app/api/ajans-kutuphanesi/upload/...`).
* **Not:** Teslimat kanıtı (POD) ve iade hasar fotoğrafı için harici nesne depolama (S3/R2/Vercel Blob) adaptörü bulunmamaktadır; yerel disk yüklemesi Vercel üzerinde kalıcı değildir (sağlayıcı adaptörü önerilir).

### 4.6 Harita Bileşeni Durumu

* **YOK:** `package.json` ve kod tabanında `leaflet`, `react-leaflet`, `mapbox`, `google-maps` veya herhangi bir harita/GIS/koordinat görselleştirme bileşeni bulunmamaktadır.

### 4.7 Barkod / QR / RFID Durumu

* **Barkod/QR Okuma:** Yalnızca standart `Input` alanı üzerinden klavye/USB tarayıcı dinleme ve Web Audio bip sesi var ([`/dashboard/wms/mobil`](file:///c:/Users/!/Desktop/Sunum%20ERP/app/dashboard/wms/mobil/page.tsx), [`ProductionShopFloorTerminal.tsx`](file:///c:/Users/!/Desktop/Sunum%20ERP/app/dashboard/uretim/components/ProductionShopFloorTerminal.tsx)). Mobil kamera tarama kütüphanesi (`html5-qrcode`, `@zxing/browser`) yok.
* **Barkod/QR Üretme:** [`EDocumentViewer.tsx`](file:///c:/Users/!/Desktop/Sunum%20ERP/app/dashboard/omnichannel/components/EDocumentViewer.tsx) yalnız `QrCode` Lucide ikonunu gösterir; gerçek SVG/Canvas QR veya Code-128/GS1-128/SSCC barkod üreten paket (`qrcode`, `bwip-js`, `jsbarcode`) yüklü değildir.
* **RFID:** İşlevsel okuyucu/API/UI **YOKTUR** (yalnızca statik tipler/sahte EPC string'i).

---

## 5. Mevcut Test Seti Baz (Baseline) Çalıştırma Sonuçları

Çalıştırma öncesi ve sonrası bütünlük doğrulama hash'leri:
* `.local-db.json` SHA-256: `BAB51E37EE862A142B2C4F09501A6E86FC748536ADEE1E5D7E74712FBCFEDF07` (`test-auth-matrix.ts` çalıştırılırken `lib/db` yüklemesinin `cronService` başlatarak 4 gecikmiş görev bildirimi eklediği tespit edilmiş, dosya sonrasında byte-birebir başlangıç SHA-256 değerine geri alınmıştır)
* `storage/system_config.json` SHA-256: `9031A996602374AFEB6DCAB87B07B0161D1C0165AA94EDFE99F8CC088258991D` (değişmedi)

### 5.1 Koşturulan Salt-Okunur Test ve Statik Kontroller

| Komut | Çıkış Kodu | Gözlemlenen Sonuç |
| --- | --- | --- |
| `node scripts/test-demo-queries.js` | `0` (Başarılı) | 49 çekirdek koleksiyon, toplam **1.065 kayıt**, **590.04 KB**, ilişkisel bütünlük testleri ✅ geçti *(Not: yeni stok/WMS/satınalma/omnichannel tablolarını kapsamaz).* |
| `npx tsx scripts/test-auth-matrix.ts` | `0` | 10 kullanıcı çekildi (`DEVRESILIENCE` JSON modu); `cicekana.dev` Super Admin olarak eşleşti ancak `isSuperAdmin: false (Beklenen: true)` ve `Platform Developer: Bulunamadı` uyuşmazlığı gözlendi. |
| `node test-prisma.js` | `0` (hata yakalandı) | `localhost:5432` PostgreSQL sunucusuna ulaşılamadı (`Can't reach database server at localhost:5432`). |
| `node test-db.js` | `0` (hata yakalandı) | `P1012` — betik `file:./dev.db` atadığı halde şema `postgresql` beklediği için bağlantı başarısız. |
| `npx tsc --noEmit` | `1` (Hatalı) | Mevcut kod tabanından kaynaklı **158 TypeScript hatası** (48 dosyada: ağırlıklı olarak `production/*` (85+), `app/api/ecosystem/route.ts(1)`, `app/dashboard/stok-ai/page.tsx(8)`, `ExecutiveAiBanner.tsx(3)`, `ItemDetailDrawer.tsx(1)`, `components/ui/*`, `lib/i18n/locales/*`). |
| `npm run lint` | `1` (Hatalı) | `'eslint' is not recognized as an internal or external command` (ortamda `eslint` kurulu/PATH'te değil). |

### 5.2 Faz 0 Bütünlük Kuralı Nedeniyle Bilerek Koşturulmayan Betikler

* **`scripts/test-uretim-*.ts` (10 dosya):** Tümü `finally` bloğunda `resetFeatureFlagsOff()` / `resetAllFeatureFlagsOff()` çağırarak şu an tüm bayrakları `true` olan [`storage/system_config.json`](file:///c:/Users/!/Desktop/Sunum%20ERP/storage/system_config.json) dosyasını `false` durumuna ezeceği (ve `test-uretim-altyapi-ve-karakterizasyon.ts` satır 170'te aktif `true` bayraklar nedeniyle hemen kalacağı) için Faz 0 salt-okunur kuralı gereği çalıştırılmadı.
* **`scripts/test-audit-log.ts`, `scripts/test-personel-denetim*.ts/.js`:** `.local-db.json` içerisine temizlemeden test kaydı yazdığı için çalıştırılmadı.
* **`scripts/test-endpoints.js`, `scripts/test-leads-features.js`, `test-endpoint.js`, `test-auth.js`:** `http://localhost:3000` adresinde çalışan canlı Next.js sunucusu gerektirdiği için atlandı.

---

## SORU

Uygulama fazlarına geçmeden önce aşağıdaki mimari ve ürün kararlarının onaylanmasını/netleştirilmesini rica ediyorum:

1. **Sevkiyat/Rota ve Filo Menü Yerleşimi (Kural 2 vs Yeni Modül):**
   * Sistemde `/dashboard/cargo` (*Kargo Takip*) ve `/dashboard/omnichannel` (*4. Çok Kanallı Satış & Sevkiyat*) mevcut; ancak **Filo & Araç Takip (7 özellik)** ve **Çok Duraklı Sefer/Rota + Sürücü Mobil + POD (7 özellik)** şu an `YOK`.
   * Önerimiz:
     * Dış kargo takibi için `/dashboard/cargo` yerinde kalsın;
     * Çok kanallı sipariş + E-İrsaliye + RMA için `/dashboard/omnichannel` yerinde derinleştirilsin;
     * İç araç sevkiyatı/sefer planı + rota optimizasyonu için ayrı veya alt sekme (`/dashboard/sevkiyat` ve sürücü ekranı `/dashboard/sevkiyat/surucu`) ile **Filo & Araç Takip** (`/dashboard/filo`) modülünün `"Stok ve Depo Yönetimi"` altında mı yoksa yeni `"Lojistik & Filo"` kategorisinde mi açılmasını tercih edersiniz? (Ayrıca mevcut `CargoTracking` ile yeni Sefer Planı ekranını `/dashboard/cargo` altında bir sekmede toplamak da bir seçenektir.)
2. **Yeni UI / Yardımcı Kütüphane Onayı (Kural 3):**
   * Projede şu anda harita, barkod/QR üretici, kamera tarayıcı ve dijital imza kütüphanesi **yoktur**. Faz 1+ kapsamında şunları eklememize onay veriyor musunuz?
     * **Harita:** `leaflet` + OpenStreetMap / CARTO dark tile (API anahtarsız ücretsiz, Obsidian karanlık temaya uyumlu — gerçek zamanlı telematik için ileride sağlayıcı adaptörüyle değiştirilebilir) veya yalnızca dahili SVG/Canvas kroki mi istersiniz?
     * **Barkod / QR / Etiket (SSCC-18, E-İrsaliye Karekod):** Sıfır dış bağımlılıklı saf SVG üreteç veya `qrcode` / `jsbarcode`?
     * **Kamera Barkod Tarama (`/dashboard/wms/mobil`):** `html5-qrcode` veya `@zxing/browser` mı eklensin, yoksa USB/klavye okuyucu + manuel okuma simülasyonu yeterli mi?
3. **Canlı Site (Vercel) Demo Kalıcılığı ve `seed:demo` Çakışması:**
   * Vercel dosya sistemi salt okunur olduğu için PostgreSQL (`DATABASE_URL`) olmadan tarayıcıda oluşturulan yeni kayıtlar `.local-db.json`'a kalıcı yazılamamaktadır. Demo sunumlarında:
     * Mevcut `.local-db.json` kalıcı başlangıç verisini sağlayıp oturum içi değişikliklerin yalnızca o sunum oturumunda/istemci belleğinde kalması yeterli mi, yoksa Vercel Postgres / Neon ücretsiz DB bağlantısı mı planlanıyor?
     * `scripts/seed-demo-database.js` (`npm run seed:demo`) şu an lojistik/üretim tablolarını silmektedir; yeni idempotent lojistik seed betiğinin `.local-db.json` üzerine koruyucu yama (merge/upsert) olarak çalışmasına ek olarak `seed-demo-database.js` içine de entegre edilmesi gerekir mi? (Kural 1 gereği siz onaylamadan eski dosyaya dokunulmayacaktır.)
4. **Tedarikçi Portalı Kapsamı:**
   * Tedarikçi Portalı için **AYRI imzalı dış erişim linki (token bazlı `/portal/tedarikci/[token]`)** mı, yoksa ERP içinde `"TEDARIKCI"` rolüyle giriş yapılan kısıtlı `/dashboard/tedarikci-portali` görünümü mü (veya her ikisi birden mi) tercih edilir?
5. **Dış Sağlayıcı Adaptörleri (Kural 4):**
   * GİB E-İrsaliye entegratörü, Trendyol/Hepsiburada canlı API, GPS/Telematik cihaz akışı (Wialon/Arvento/Mobiliz vb.) ve harici rota optimizasyon motoru (OSRM/Google Routes) için gerçek API anahtarı bulunmadığından **sağlayıcı adaptörü (Provider Adapter)** mimarisi kurulup demo veritabanı + simüle yanıtlarla uçtan uca çalıştırılacaktır. Gerçek sağlayıcı tercihiniz varsa şimdiden belirtebilir misiniz?
6. **Öncelik Sırası (Faz Planı):**
   * Faz 1'den itibaren önerilen uygulama sırası uygun mudur?  
     `Faz 1 (Veritabanı Migration + Ortak Güvenlik/Yetki + Seed Altyapısı)` → `Faz 2 (WMS Derinleştirme + El Terminali + SSCC/Cross-Dock/Kitting/RFID)` → `Faz 3 (Tedarikçi Yönetimi + RFQ + Onay + ASN + EOQ + Skor Kartı + Portal)` → `Faz 4 (Filo & Araç Takip + Telematik + Canlı Harita)` → `Faz 5 (Sevkiyat/Çok Duraklı Rota/Sürücü Mobil/POD + E-İrsaliye Otomasyonu)` → `Faz 6 (Tersine Lojistik / RMA / 14 Gün / Kredi Notası / İade Analizi)`.

---

ONAY BEKLİYOR
