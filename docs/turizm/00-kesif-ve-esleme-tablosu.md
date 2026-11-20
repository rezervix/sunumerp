# Sunum ERP — Turizm, Araç Kiralama, Konaklama ve B2B Partner Ekosistemi (Faz 0 Keşif ve Eşleme Raporu)

**Tarih:** 20 Kasım 2026  
**Aktif Git Dalı:** `feature/lojistik-faz8-yayin` (`18802fd`)  
**Faz Kuralı:** Bu fazda **hiçbir uygulama kodu, veritabanı şeması veya ayar dosyası değiştirilmemiştir**; yalnızca kaynak kod incelemesi, baz hat doğrulama koşumları ve resmî doküman araştırması yapılmıştır.

---

## Oturum Başlangıcı ve Bitişi Bütünlük Kaydı

- **Çalışma Ağacı (`git status --short` — önceden mevcut kirli dosyalar, dokunulmadı):**
  - `M app/dashboard/lojistik-raporlar/page.tsx`
  - `M lib/logistics/providers/object-storage.ts`
  - `M tsconfig.tsbuildinfo`
- **Veritabanı ve Konfigürasyon SHA-256 Özetleri:**
  - `storage/ajans-kutuphanesi/.local-db.json` (`1.000.661` bayt): `5B59EA07205813232101B2091738E0948EE250D34335ACBCAEDFABDE95B909BF`
  - `storage/system_config.json` (`1.679` bayt): `9031A996602374AFEB6DCAB87B07B0161D1C0165AA94EDFE99F8CC088258991D`
  - *Not:* Test koşumları sırasında geçici olarak değişen JSON veritabanı ve yapılandırma dosyaları, doğrulama sonrasında bayt bayt yukarıdaki başlangıç SHA-256 özetlerine geri yüklenmiştir.

---

## 1. Mevcut Sistem Varlık Envanteri & Çok Firmalılık (Multi-Tenancy) Analizi

### 1.1 Kritik Mimari Bulgu: Çok Firmalılık (Multi-Tenant) vs Tek Firma + Şube Modeli

Sistem kod tabanı (`prisma/schema.prisma`, `lib/system-config.ts`, `lib/auth/server-permission.ts`, `lib/logistics/security.ts`, `app/api/branches/route.ts`) incelendiğinde şu kesin mimari tablo ortaya çıkmıştır:

| Boyut | Mevcut Durum | Kanıt (Dosya / Model) | B2B Partner Ağı İçin Anlamı |
| :--- | :--- | :--- | :--- |
| **Ana Şirket Kimliği** | Tekil (`SystemConfig.company`) | `lib/system-config.ts`, `storage/system_config.json` (`title: "Sunum ERP - Demo"`) | Sistem kurulumu tek bir ana şirket üzerine kuruludur; bağımsız kiracı (tenant) şirketi tutan bir `Company` / `Tenant` modeli yoktur. |
| **Şubeler (`Branch`)** | Dahili operasyon birimleri | `prisma/schema.prisma` (`Branch`: `id`, `code`, `name`, `address`, `phone`, `email`) | Şu an 4 şube vardır (Merkez, Ankara, İzmir, Bursa). `Branch` üzerinde vergi no, VKN/TCKN veya bağımsız kiracı izolasyon alanı **yoktur**. |
| **Kullanıcı & Yetki Kapsamı** | Şube bazlı rol + Küresel Admin | `UserBranchRole`, `lib/auth/server-permission.ts` (`isSuperAdminUser()`) | `Super Admin`, `Yonetim Kurulu Uyesi` ve `Genel Mudur` rolleri tüm şubelerin verisine küresel olarak erişir. Normal personel ise UI'da seçili `currentBranch`'e göre filtrelenir; çoğu API ucu şube içi veri sızıntısına karşı ek kiracı sınırı uygulamaz. |
| **Gerçek Harici Firma İzolasyonu (Tek İstisna)** | `Tedarikçi` rolü ve `supplierId` kapsamı | `User.supplierId`, `lib/logistics/security.ts` (`getLogisticsScopeContext`, `buildSupplierPrismaWhere`, `assertSupplierRecordAccess`), `/tedarikci-portali` | Harici tedarikçi hesapları **fail-closed** çalışır: yalnızca kendi `supplierId` kayıtlarını görür, iç ERP ekran ve API'lerine (`wms`, `filo`, `sevkiyat`, `satinalma`, `omnichannel`, `lojistik-raporlar`) erişimleri HTTP `403 FORBIDDEN_SUPPLIER_SCOPE` ile engellenir. |
| **Eski Modüllerde Tarayıcı Simülasyon Çakışması** | `DemoModeInterceptor` + `mockDatabase` | `components/demo-interceptor.tsx`, `lib/data-controller.ts`, `app/api/customers/route.ts`, `app/api/b2b/*`, `app/api/finance/route.ts`, `app/api/orders/route.ts`, `app/api/hr/route.ts` | Demo modu açıkken eski API'ler veritabanı yerine tarayıcı/sunucu bellek içi `mockDatabase` verisi döner ve yetkilendirme kontrollerini atlar (`isDemoModeActive() ? null : await requirePermission(...)`). |

**Sonuç:** Sistem mevcut haliyle **"Tek Ana Firma + Çoklu İç Şube + İzole Harici Tedarikçi Portalı"** mimarisindedir; **"Birbirine rakip/bağımsız birden çok şirketin aynı ekranda kendi araç/oda/tur verisini kiracı izolasyonu ile yönettiği çok kiracılı (multi-tenant) SaaS"** yapısında değildir.  
B2B Partner Ağı için iki temiz yol vardır:
1. Tedarikçi Portalı kalıbını genelleştirip eklemeli `PartnerCompany` + `companyId` kapsamı ile her harici partnere izole Partner Portalı + ana ERP kullanıcısı için partner ağı yönetim ekranı kurmak (mevcut tek-şirket ERP ekranlarını hiç bozmadan), veya
2. Tüm temel tablolara (`Branch`, `Vehicle`, `Reservation`, `Finance`, vb.) opsiyonel `ownerCompanyId` ekleyip çok-firmalı perspektif kurmak (Bkz. **SORU #1**).

---

### 1.2 Altyapı ve Yeniden Kullanılabilir Modüller Envanteri

| Altyapı Alanı | Mevcut Dosyalar / Modeller | Mevcut Yetenekler | Turizm / Rent-a-Car / Otel / B2B İçin Eksik Kalanlar |
| :--- | :--- | :--- | :--- |
| **Araç & Filo (`lojistik_filo`)** | `app/dashboard/filo/page.tsx`, `FleetVehiclesAndDriversTabs.tsx`, `FleetMaintenanceAndFuelTabs.tsx`, `FleetTcoAndTelematicsTabs.tsx`, `FleetLiveMap.tsx`, `lib/logistics/fleet/*`, `app/api/filo/route.ts`, `LojistikVehicle*`, `LojistikDriver`, `LojistikVehicleDocument`, `LojistikTrafficPenalty`, `LojistikFuelLog` | 18 araç (kamyonet, panelvan, `MINIBUS` `34 SNR 118` ve 3 adet `PASSENGER` binek dahil), 15 şoför (TCKN/Ehliyet/SRC/Psikoteknik KVKK maskeli), belge vade uyarıları, bakım plan/iş emri/parça/lastik, arıza günlüğü, yakıt anomali, TCO/CO₂, 4 telematik profili (Traccar/flespi/GpsGate/Webhook), manuel trafik cezası -> `Finance` gider kaydı | Araç sınıfı/kategorisi, günlük/sezonluk/km-limitli kiralama tarifesi, müsaitlik Gantt takvimi, kiralama sözleşmesi, teslim/iade ekspertizi, HGS/OGS geçiş tablosu, cezanın kiracı müşteriye yansıtılması (rücu), KABİS dışa aktarımı, araç bazlı kiralama geliri/kârlılığı. |
| **Sevkiyat & Sürücü Mobil (`lojistik_sevkiyat_rota`)** | `app/dashboard/sevkiyat/page.tsx`, `surucu/page.tsx`, `DispatchRouteMap.tsx`, `lib/logistics/dispatch/*`, `/api/sevkiyat`, `/takip/[token]`, `LojistikShipmentTrip`, `LojistikShipmentStop`, `LojistikDeliveryProof` | Çok duraklı sefer planı, CVRPTW çözücüsü, kritik bakım/arıza->sefer uyarı senkronu, onayda otomatik E-İrsaliye, mobil sürücü ekranı (canvas imza + kamera fotoğrafı upload + navigasyon linki), 192-bit CSPRNG süreli takip | Mobil teslim/iade **araç ekspertiz formu** (hasar işaretleri, yakıt göstergesi %, başlangıç/bitiş km) ve **tur rehberi mobil operasyonu** (yolcu yoklama, biniş noktası listesi, konaklama/ekstra bildirim) için doğrudan UI kalıbı olarak kullanılabilir ama yeni iş akışları gerekir. |
| **Müşteri / CRM / Adaylar** | `app/dashboard/customers/page.tsx`, `relation-tabs.tsx`, `app/dashboard/leads/page.tsx`, `Customer`, `CustomerNote/Chat/Document/Task/Contact`, `Lead` | Müşteri kartı, kara liste bayrağı, CSV/VCF içe aktarma, not/görev/belge/kişi sekmeleri, manuel iletişim kanalı günlüğü (WhatsApp/SMS/E-posta) | Kiracı/misafir için TCKN, pasaport no, uyruk, doğum tarihi, ehliyet bilgileri, KVKK sunucu maskelemesi ve erişim audit log'u **yok**; B2B cari hesap ekstresi yok; eski API'ler `mockDatabase` bypass'ına takılıyor. |
| **Takvim & Rezervasyon Benzeri Yapılar** | `app/dashboard/takvim/page.tsx`, `app/api/appointments/*`, `app/api/calendar/events/route.ts`, `Appointment`, `IcerikTakvimi`, WMS `LojistikStockReservation` | Ay/hafta/ajanda randevu görünümü (`Appointment`, finans vadeleri, hatırlatma, yapılacaklar); WMS stok rezervasyonu | Kaynak bazlı zaman çizelgesi (araç Gantt, otel oda rack, tur takvimi) **yok**; çakışma/double-booking kilidi **yok**; `/api/calendar/events` demo bypass'lı. |
| **Personel & İK Kayıtları** | `app/dashboard/users/page.tsx`, `app/dashboard/hr/page.tsx`, `app/dashboard/personel-denetim/*`, `app/dashboard/personel-talepleri/*`, `User`, `Candidate` | Sistem kullanıcıları listesi (`User`) ve İK işe alım aday Kanban'ı (`Candidate`) | Aktif personel özlük dosyası, kokartlı tur rehberi kartı (dil bilgisi, kokart no/vadesi, bölge uzmanlığı), housekeeper vardiya/görev atama ve çakışma kontrolü **yok**. |
| **Stok & Ürün Kataloğu** | `app/dashboard/stok/page.tsx`, `app/dashboard/wms/*`, `app/dashboard/b2b/page.tsx`, `Warehouse`, `InventoryItem`, `StockBalance`, `StockMovement`, `Product`, `BranchPrice`, `StockRequest` | Depo/bölge/raf bazlı stok bakiyesi ve tam denetlenebilir `StockMovement` defteri (FEFO/FIFO); B2B ekranında ise dahili şubeler arası sabit IT hizmeti + temel stok talebi | Minibar ve ekstra otel/tur harcamaları için mevcut `InventoryItem` + `StockMovement` (ve şube/kat deposu) doğrudan yeniden kullanılabilir; şubeler arası `B2B Mağaza` ise bağımsız firmalar arası partner ağı değildir. |
| **Finans, E-Belge & Ödeme** | `app/dashboard/finance/FinanceClient.tsx`, `EDocumentViewer.tsx`, `lib/logistics/providers/efatura-irsaliye.ts`, `lib/iyzico.ts`, `Finance`, `EDocumentRecord`, `Order` | Gelir/gider/borç/alacak takibi (`Finance` üzerinde `vehicleId`, `driverId` alanları mevcut), E-Fatura / E-İrsaliye adaptörü + viewer + tek-tıkla taslak/kesim politikası (`LogisticsInvoiceTimingConfig`), `iyzico` abonelik yardımcısı | Rezervasyon/kiralama/oda/tur folyo bazlı cari bakiye, depozito/ön provizyon hareketi, partner hakediş/komisyon mahsuplaşması ve KDV oranı/konaklama kalem ayrımları **yok**. Eski `/api/finance` demo bypass'ına takılıyor. |
| **Bildirim Altyapısı** | `lib/notifications/service.ts`, `catalog.ts`, `lib/logistics/notifications/logisticsAlertRules.ts`, `app/api/notifications/*`, `Notification` | Web Push + SSE canlı akış + kullanıcı tercihli ve 24 saat idempotent akıllı alarm tarama çerçevesi (6 lojistik kuralı) | Mevcut kurallar sadece lojistik için; geciken araç iadesi, KABİS/KBS bekleyen bildirimler, check-in/out uyarısı, partner talepleri ve çakışma uyarıları için yeni kurallar eklenebilir. |
| **Dosya & Fotoğraf Yükleme** | `app/api/upload/route.ts`, `components/shared/file-picker.tsx`, `lib/logistics/providers/object-storage.ts`, `app/api/logistics/pods/[...key]/route.ts`, `app/dashboard/ajans-kutuphanesi/*` | Uzantı/MIME beyaz listesi + 5–20 MB boyut sınırı + `.svg` sandbox/attachment koruması + yerel veya S3/R2 nesne depolama adaptörü | Teslim/iade araç hasar fotoğrafları, dijital sözleşme PDF'leri ve tur/partner ekleri mevcut `object-storage` + `upload` + `/api/logistics/pods/[...key]` kalıbıyla doğrudan saklanabilir. *(Not: KVKK gereği kimlik/pasaport fotokopisi saklanmayacaktır.)* |
| **Harita Bileşeni** | `app/dashboard/filo/components/FleetLiveMap.tsx`, `app/dashboard/sevkiyat/components/DispatchRouteMap.tsx`, `lib/logistics/providers/routing.ts` | `leaflet` tabanlı koyu tema canlı konum + rota polylineları + API anahtarsız çevrimdışı koordinat kanvası / opsiyonel tile server desteği | Tur rotası durak/biniş noktaları görselleştirmesi ve teslim/iade konum işaretlemesi için doğrudan yeniden kullanılabilir. |
| **Rapor & Dışa Aktarma** | `app/dashboard/lojistik-raporlar/page.tsx`, `lib/logistics/reports/logisticsReportsService.ts`, `exportReports.ts` | Sunucu tarafı RBAC + bayrak doğrulamalı rapor motoru, `Recharts` grafikleri ve `xlsx` (Excel) + `jspdf` (PDF) çıktı üreteçleri | Rent-a-Car, Otel Doluluk/ADR, Tur Kârlılık/Manifesto, B2B Hakediş ve KABİS/KBS hazırlık tabloları için aynı motor genişletilebilir veya modüler raporlar tanımlanabilir. |
| **Sektör / Modül Kataloğu** | `lib/actions/niche-actions.ts` (`Niche`), `app/api/modules/route.ts`, `lib/config/production-feature-flags.ts`, `lib/config/logistics-feature-flags.ts` | `Niche` sadece içerik mağazası etiketi; `PRODUCTION_MODULES_CATALOG` (6 bayrak) + `LOGISTICS_MODULES_CATALOG` (5 bayrak); DB `Module` (22 eski kayıt) | Ayarlar ekranında müşterinin sektörüne göre (Rent-a-Car / Otel / Tur / B2B Partner) modül paketi seçebileceği merkezi bir **Sektör & Modül Paketleme** arayüzü/yapılandırması **yok**. |

---

## 2. Özellik Bazlı Keşif ve Karar Tablosu

> **Tablo İlkeleri (Kural 2 & Kural 4):** Var olan ekran/tablo varsa yerine yenisi açılmaz (**DERİNLEŞTİR**); sistemde karşılığı hiç yoksa modül bayrağıyla izole edilmek üzere **YENİ EKLE** kararı verilir; mevcut modüllerin çalışan davranışlarına **DOKUNMA** uygulanır. Filo ortak katmanı (`LojistikVehicle`, `LojistikDriver`) bayraktan bağımsız ortak altyapı olarak paylaşıma açılır.

### 2.1 RENT-A-CAR Modülü (`turizm_rentacar`)

| Özellik | Mevcut ekran / dosya yolu | URL | Menü yolu | Durum | Yüzeysel / Eksik Nedeni | Karar |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| Araç sınıfı/kategori ve müsaitlik takvimi (Gantt) | `app/dashboard/filo/page.tsx` (`LojistikVehicle`), `app/dashboard/takvim/page.tsx` | `/dashboard/filo`, `/dashboard/takvim` | Lojistik > Araç Filosu, Genel > Takvim | YÜZEYSEL | `LojistikVehicle` `PASSENGER`/`MINIBUS` tiplerini ve araç durumunu tutuyor fakat kiralama sınıfı (Ekonomik/SUV/VIP vb.), günlük saat/tarih aralığına göre müsaitlik Gantt zaman çizelgesi yok; `takvim` genel ajanda ekranı. | **YENİ EKLE** *(Rent-a-Car çalışma alanında Gantt; ortak `LojistikVehicle` kartına sınıf/kiralanabilirlik alanları **DERİNLEŞTİR**)* |
| Müşteri ve sürücü kaydı | `app/dashboard/customers/page.tsx` (`Customer`), `FleetVehiclesAndDriversTabs.tsx` (`LojistikDriver`) | `/dashboard/customers`, `/dashboard/filo` | Satış > Müşteriler, Lojistik > Filo (Şoförler) | YÜZEYSEL | `Customer` kartında ehliyet sınıfı/no/geçerlilik, pasaport, uyruk, TCKN, kara liste sebebi ve KVKK maskeleme yok; ek sürücü ilişkisi yok. `LojistikDriver` sadece şirket kadrolu şoförler için var. | **DERİNLEŞTİR** *(Mevcut `Customer` modeline KVKK maskeli kiracı/ek sürücü alanları eklenir; şoförlü kiralamada `LojistikDriver` yeniden kullanılır)* |
| Rezervasyon ve çift rezervasyon engeli | Karşılığı yok (`Appointment` yalnızca randevu; `Order` genel sipariş) | — | — | YOK | Kiralama rezervasyonu, saat/tarih aralığı blokajı, atomik çakışma kontrolü (double-booking lock) ve durum makinesi (`TASLAK`, `ONAYLI`, `TESLIM_EDILDI`, `IADE_ALINDI`, `IPTAL`) yok. | **YENİ EKLE** |
| Kiralama sözleşmesi | Karşılığı yok (`Order` yazdır/teklif şablonu, `VehicleLease` ise sadece tedarikçiden uzun dönem filo kiralaması) | — | — | YOK | Müşteriye verilen kısa/orta dönem araç kiralama sözleşmesi, km/yakıt/sigorta koşulları, müşteri dijital imza ve yazdırılabilir PDF sözleşme çıktısı yok. | **YENİ EKLE** |
| Fiyatlandırma (günlük/haftalık/sezon, km limiti, ek hizmet) | Karşılığı yok (`lib/services/calculationService.ts` genel marj hesaplayıcı) | — | — | YOK | Araç sınıfı bazlı sezon tarifesi, günlük/haftalık/aylık kademeli fiyat, günlük km limiti + aşım tarifesi, ek hizmet (çocuk koltuğu, ek şoför, tam güvence, teslimat) hesaplama motoru yok. | **YENİ EKLE** |
| Teslim/iade formu (km, yakıt, hasar fotoğrafı, imza) | `app/dashboard/sevkiyat/surucu/page.tsx` (e-POD imza + fotoğraf upload kalıbı var) | `/dashboard/sevkiyat/surucu` *(referans kalıp)* | Sevkiyat > Sürücü | YÜZEYSEL | Yalnızca teslimat e-POD'u mevcut; araç teslim ve iadesindeki başlangıç/dönüş km, yakıt yüzdesi (8'lik dilim/%), karoser hasar notları, fotoğraflar ve çift taraflı imza karşılaştırması yok. | **YENİ EKLE** *(Mevcut canvas imza ve `object-storage` fotoğraf upload kalıbı yeniden kullanılır)* |
| Depozito ve ek ücretler (yakıt farkı, gecikme, hasar) | `app/dashboard/finance/FinanceClient.tsx` (`Finance` tablosu) | `/dashboard/finance` | Finans > Gelir & Giderler | YÜZEYSEL | Genel gelir/gider kaydediyor; kiralama sözleşmesine bağlı depozito tahsil/bloke/iade takibi, otomatik yakıt farkı, gecikme saati/günü ve hasar kesintisi mahsuplaşması yok. | **YENİ EKLE** *(Finans entegrasyonu ile `Finance` tablosuna hareket işleyerek **DERİNLEŞTİR**)* |
| Ceza ve HGS/OGS plaka eşleştirmesi ve müşteriye yansıtma | `FleetVehiclesAndDriversTabs.tsx` (`LojistikTrafficPenalty`, `upsert` & `record_penalty`) | `/dashboard/filo` *(Evrak/Ceza sekmesi)* | Lojistik > Araç Filosu > Evrak & Ceza | YÜZEYSEL | Manuel trafik cezası girişi ve şirket gideri (`Finance` EXPENSE) kaydı var; ancak HGS/OGS geçiş tablosu, plaka+tarih-saat aralığına göre cezayı/geçişi aktif kiralama sözleşmesi ve müşterisiyle eşleştirip müşteriye rücu (yansıtma) faturası/folyo kalemi kesme akışı yok. | **DERİNLEŞTİR** *(Mevcut `LojistikTrafficPenalty` üzerine kiralama/müşteri yansıtma ve HGS/OGS kayıt+eşleştirme sekmesi/alanı eklenir)* |
| KABİS bildirim hazırlığı | Karşılığı yok | — | — | YOK | EGM KABİS portalına (`arackiralama.egm.gov.tr`) aktarılmak üzere kiralama açılış/kapanış/ek sürücü bildirim hazırlık listesi, doğrulama, kurum formatında dışa aktarma ve adaptör taslağı yok (Bkz. Bölüm 6). | **YENİ EKLE** |
| Bakım/sigorta/muayene uyarıları | `FleetMasterService` (`evaluateAndDispatchFleetExpiryAlerts`), `logisticsAlertRules.ts`, `FleetMaintenanceAndFuelTabs.tsx` | `/dashboard/filo` | Lojistik > Araç Filosu | YETERLİ *(ortak altyapı)* | `LojistikVehicleDocument` (Muayene, Sigorta, Kasko, MTV) ve periyodik bakım vade + bildirim kuralları çalışıyor. Sadece bayrak açıldığında değil Rent-a-Car açıkken de erişilebilir ortak katmana çekilmesi yeterli. | **DOKUNMA / ORTAK KATMAN OLARAK REUSE** *(Yalnızca `turizm_rentacar` için tarih aralığı bakım çakışma uyarısı eklenir)* |
| Gelir/gider raporları | `app/dashboard/lojistik-raporlar/page.tsx` (`filo` modülü), `FleetTcoAndEfficiencyTab.tsx` | `/dashboard/lojistik-raporlar?module=filo` | Lojistik > Lojistik Raporlar | YÜZEYSEL | Araç bazlı yakıt/bakım/ceza/amortisman maliyetini (TCO gider) hesaplıyor fakat kiralama sözleşmelerinden gelen gelir, doluluk oranı (utilization) ve araç net kârlılığı yok. | **DERİNLEŞTİR** *(Mevcut rapor motoru + yeni Rent-a-Car gelir kalemleriyle birleştirilir)* |
| Mobil teslim/iade ekranı | `app/dashboard/sevkiyat/surucu/page.tsx` & `app/dashboard/wms/mobil/page.tsx` *(referans mobil düzen)* | `/dashboard/sevkiyat/surucu` *(referans)* | — | YOK | Saha personelinin telefon/tablet üzerinden bugünkü teslim ve iade görevlerini görüp km/yakıt/fotoğraf/imza ile anlık tamamladığı dokunmatik Rent-a-Car ekranı yok. | **YENİ EKLE** |

---

### 2.2 OTEL (MİNİ PMS) Modülü (`turizm_otel`)

| Özellik | Mevcut ekran / dosya yolu | URL | Menü yolu | Durum | Yüzeysel / Eksik Nedeni | Karar |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| Oda tipi ve oda envanteri | Karşılığı yok | — | — | YOK | Oda tipi (Standart, Deluxe, Süit vb.), yatak/kişi kapasitesi, özellikler ve fiziksel oda numarası/kat envanteri yok. | **YENİ EKLE** |
| Kat planı ve oda durumu | Karşılığı yok | — | — | YOK | Kat bazlı görsel oda tahtası (Room Rack / Floor Plan) ve gerçek zamanlı oda durumu (`TEMIZ`, `KIRLI`, `KONTROL_BEKLIYOR`, `DOLU`, `BAKIMDA`) yok. | **YENİ EKLE** |
| Rezervasyon, check-in / check-out | Karşılığı yok | — | — | YOK | Otel konaklama rezervasyonu, oda atama, çakışma kilidi, check-in, erken/geç çıkış, oda değişikliği ve no-show/iptal akışları yok. | **YENİ EKLE** |
| Misafir kaydı ve KBS bildirim hazırlığı | `app/dashboard/customers/page.tsx` | `/dashboard/customers` | Satış > Müşteriler | YOK *(otel bağlamında)* | Müşteri tablosunda kimlik/pasaport/uyruk/doğum tarihi/giriş-çıkış saati alanları ve KVKK maskelemesi ile EGM/Jandarma KBS (1774 sayılı kanun) bildirim hazırlık/XML-Excel dışa aktarma ekranı yok (Bkz. Bölüm 6). | **YENİ EKLE** *(Ana misafir carisinde `Customer` ile bağlanır)* |
| Housekeeping (temizlik) görevleri ve mobil ekran | `components/tasks/*` (genel iş tahtası) | `/dashboard/tasks` *(genel)* | Genel > Görevler | YOK *(otel bağlamında)* | Check-out sonrası otomatik oda temizlik görevi üretimi, kat görevlisi atama, arıza/bakım bildirimi, oda hazır onayı ve mobil kat görevlisi ekranı yok. | **YENİ EKLE** |
| Oda hesabı (folio), minibar/restoran/ekstra harcama, fatura | `app/dashboard/stok/page.tsx` (`InventoryItem`/`StockMovement`), `EDocumentViewer.tsx` (`EDocumentRecord`), `FinanceClient.tsx` | `/dashboard/stok`, `/dashboard/omnichannel`, `/dashboard/finance` | Stok, Omnichannel, Finans | YOK / YÜZEYSEL *(altyapı var)* | Stok ve E-Belge altyapısı mevcut ancak odaya/misafire bağlı açık hesap (**Folio**), gecelik oda ücreti basımı, minibar tüketiminde `StockMovement` düşümü, kısmi tahsilat ve çıkışta folio->fatura/E-Belge kesimi yok. | **YENİ EKLE** *(Stok düşümü için `InventoryItem`/`StockMovement`, fatura için `EDocumentRecord` ve `Finance` yeniden kullanılır)* |
| Acenta kontenjanı (allotment) | Karşılığı yok (`LojistikStockReservation` sadece depo SKU rezervasyonudur) | — | — | YOK | Tur operatörü/acenta bazlı oda tipi kontenjan taahhüdü, release (serbest kalma) günü ve anlaşmalı net/komisyonlu fiyat tanımları yok. | **YENİ EKLE** |
| Doluluk / ADR raporları | `app/dashboard/lojistik-raporlar/page.tsx` *(tasarım/export motoru)* | — | — | YOK | Tarih/oda tipi bazlı Doluluk %, ADR (Ortalama Günlük Oda Fiyatı), RevPAR ve kaynak dağılımını veritabanından hesaplayan raporlar ve `.xlsx`/`.pdf` çıktısı yok. | **YENİ EKLE** *(`exportReports.ts` motoru yeniden kullanılır)* |

---

### 2.3 TUR OPERATÖRLÜĞÜ Modülü (`turizm_tur`)

| Özellik | Mevcut ekran / dosya yolu | URL | Menü yolu | Durum | Yüzeysel / Eksik Nedeni | Karar |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| Tur paketi ve tur takvimi (günübirlik/konaklamalı) | `app/dashboard/takvim/page.tsx` (genel ajanda) | `/dashboard/takvim` | Genel > Takvim | YOK | Tur şablonları (günübirlik/konaklamalı, güzergâh, dahil/hariç hizmetler, yaş grubu fiyatları) ve kalkış tarihli tur seferi (`TourDeparture`) takvimi yok. | **YENİ EKLE** |
| Araç tipi ve koltuk planı | `LojistikVehicle` (`MINIBUS` / `PASSENGER`) | `/dashboard/filo` | Lojistik > Araç Filosu | YÜZEYSEL | Araçta koltuk sayısı ve 2+1 / 2+2 / VIP minibüs / midibüs koltuk yerleşim matrisi (sıra/koridor/numara/durum) verisi yok. | **YENİ EKLE** *(Koltuk plan şablonu + `LojistikVehicle` kapasite bağlaması)* |
| Yolcu rezervasyonu ve manifesto | `app/dashboard/orders/page.tsx` (genel sipariş) | `/dashboard/orders` | Satış > Siparişler | YOK | Yolcu bazlı rezervasyon, koltuk seçimi/kilitlenmesi, refakatçi/çocuk indirimi, kimlik/pasaport bilgisi (KVKK maskeli) ve yazdırılabilir yolcu manifestosu PDF'i yok. | **YENİ EKLE** |
| Biniş noktası / saat | `DispatchRouteMap.tsx`, `LojistikShipmentStop` *(lojistik durak)* | `/dashboard/sevkiyat` *(referans)* | Sevkiyat > Planlama | YOK *(turizm bağlamında)* | Lojistik durak mantığı yük teslimatı içindir; otelden/duraktan yolcu alma saati, koordinat, araç/rehber görevi sıralaması ve harita üzerinde yolcu biniş rotası yok. | **YENİ EKLE** *(`DispatchRouteMap` / Leaflet kalıbı yeniden kullanılır)* |
| Rehber / şoför / araç çakışma kontrolü | `LojistikDriver` (`FleetMasterService`), `hr/page.tsx` (`Candidate`), `users/page.tsx` | `/dashboard/filo`, `/dashboard/hr` | Lojistik > Filo, İK | YÜZEYSEL | Aktif kokartlı tur rehberi kadrosu (dil, kokart no, geçerlilik, çalışma bölgesi) yok; aynı tarih/saat aralığında bir aracın, şoförün (Rent-a-Car + Sevkiyat + Tur dahil) veya rehberin çift atanmasını önleyen çakışma kilidi yok. | **YENİ EKLE** *(Şoför/araç kaynağı Filo'dan okunur; rehber kartı ve ortak zaman-aralığı çakışma motoru eklenir)* |
| Tur maliyet–kâr analizi | `FinanceClient.tsx` | `/dashboard/finance` | Finans > Gelir & Giderler | YOK | Kalkış bazlı araç/yakıt/şoför/rehber yevmiye/müze/otel/yemek maliyetleriyle yolcu tahsilatlarını birleştirip net kâr hesaplayan tur maliyet defteri yok. | **YENİ EKLE** *(Gider/gelir satırları `Finance` ile entegre edilir)* |
| Acenta komisyonu | Karşılığı yok | — | — | YOK | Alt acenta / satış temsilcisi bazlı kademeli/yüzdelik komisyon hesaplama, tahakkuk ve cari ödeme takibi yok. | **YENİ EKLE** |
| Konaklamalı turlarda KBS verisi | Karşılığı yok | — | — | YOK | Konaklamalı turlarda otel check-in/KBS bildirimi için yolcu manifestosunun otel veya kolluk formatında KVKK kontrollü dışa aktarımı / tur–otel PMS eşleştirmesi yok. | **YENİ EKLE** *(Otel KBS hazırlık motoruyla paylaşılır)* |
| Mobil rehber ekranı | `app/dashboard/sevkiyat/surucu/page.tsx` *(referans kalıp)* | `/dashboard/sevkiyat/surucu` *(referans)* | — | YOK | Tur rehberinin sahada biniş noktası bazlı yolcu check-in (bindi/gelmedi), acil yolcu telefonu (maskeli), program adımları, ekstra satış/gider girişi yapacağı mobil sayfa yok. | **YENİ EKLE** |
| Tur raporları | `app/dashboard/lojistik-raporlar/page.tsx` *(motor kalıbı)* | — | — | YOK | Tur bazlı doluluk, gelir–maliyet–kâr, acenta komisyon hak edişi ve manifesto Excel/PDF dışa aktarım raporu yok. | **YENİ EKLE** |

---

### 2.4 B2B PARTNER AĞI Modülü (`turizm_b2b_partner`)

| Özellik | Mevcut ekran / dosya yolu | URL | Menü yolu | Durum | Yüzeysel / Eksik Nedeni | Karar |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| Partner firma kaydı ve karşılıklı onay | `app/dashboard/b2b/page.tsx`, `app/dashboard/branches/page.tsx`, `app/dashboard/satinalma/page.tsx` (`Supplier`) | `/dashboard/b2b`, `/dashboard/branches`, `/dashboard/satinalma` | Satış > Mağaza (B2B), Sistem > Şubeler, Lojistik > Satınalma | YÜZEYSEL | `/dashboard/b2b` sadece tek şirketin iç şubelerine yönelik ürün kataloğu ve sabit ajans hizmetleri ekranıdır; `branches` iç şube yönetimidir; `Supplier` ise tek yönlü mal tedarikçisi kaydıdır. Bağımsız iki şirketin karşılıklı davet, sözleşme onayı ve ortaklık durumu (`BEKLEMEDE`, `ONAYLI`, `ASKIDA`) modeli yok. | **YENİ EKLE** *(Mevcut `/dashboard/b2b` iç şube mağazasına dokunulmaz)* |
| Ortak kaynak havuzu (araç/şoför/rehber/oda paylaşımı) | Karşılığı yok | — | — | YOK | Partner firmaların hangi araçları, şoförleri, rehberleri veya otel oda kontenjanlarını B2B havuzuna hangi net partner fiyatı/müsaitlik kuralıyla açtığını tanımlayan ortak envanter katmanı yok. | **YENİ EKLE** |
| Partner takviminden müsaitlik görme ve rezerve etme (white-label kiralama) | `/tedarikci-portali` *(izole harici portal mimarisi)* | `/tedarikci-portali` *(referans kalıp)* | Harici Portal | YOK | Partner firmanın karşı partner havuzundan anlık müsaitlik görüp kendi son müşterisi adına (white-label) ön rezervasyon / tahsis açması ve onay süreci yok. | **YENİ EKLE** *(İzole harici oturum & perspektif barı kalıbı `/tedarikci-portali`'ndan örnek alınır)* |
| Çakışma kontrolü ve kilit | Karşılığı yok (`LojistikStockReservation` stok için) | — | — | YOK | Aynı aracın/odanın/rehberin hem ana firmada hem birden fazla partner talebinde eşzamanlı rezerve edilmesini engelleyen atomik zaman-aralığı kilidi (`hold/lock`) yok. | **YENİ EKLE** |
| Komisyon ve hakediş | Karşılığı yok | — | — | YOK | Sağlayıcı partner vs satıcı acenta/partner arasındaki komisyon oranı, net maliyet, iptal kesintisi ve hak ediş hesaplama defteri yok. | **YENİ EKLE** |
| Cari ve otomatik fatura/mutabakat | `EDocumentViewer.tsx` (`EDocumentRecord`), `FinanceClient.tsx` | `/dashboard/omnichannel`, `/dashboard/finance` | Omnichannel, Finans | YÜZEYSEL | Genel E-Belge ve Finans kayıtları var; ancak partner firmalar arası borç/alacak cari ekstresi, dönem sonu otomatik mutabakat tablosu ve tek tıkla B2B mahsup faturası üretimi yok. | **YENİ EKLE** *(Mevcut `EDocumentRecord` + `Finance` altyapısı kullanılarak bağlanır)* |
| Firmalar arası veri izolasyonu ve yetki | `lib/logistics/security.ts` (`supplierId` scope) | `/api/supplier-portal*` *(referans)* | — | YÜZEYSEL | Yalnızca Tedarikçi rolü için `supplierId` kapsam izolasyonu mevcut; genel `Branch`/`Customer`/`Filo`/`Otel`/`Tur` sorgularında bağımsız firmaları (`companyId`/`partnerId`) ayıran çok-kiracılı koruma yok. | **YENİ EKLE** *(Yeni tüm partner/sektör uçlarında zorunlu `companyId`/`partnerId` fail-closed kapsam kilidi uygulanır)* |
| Partner iletişimi / bildirimi | `app/dashboard/chat/page.tsx`, `lib/notifications/service.ts` | `/dashboard/chat` | İletişim > Kurumsal Chat | YÜZEYSEL | Chat iç kullanıcılar arasında; harici partner hesaplarının kendi aralarındaki rezervasyon/tahsis değişiklikleri üzerine mesajlaşması ve olay bildirimleri (onay/red/iptal) yok. | **YENİ EKLE** *(Mevcut bildirim motoru ve izole partner mesaj akışı ile bağlanır)* |

---

### 2.5 ORTAK Modüller ve Platform Katmanları

| Özellik | Mevcut ekran / dosya yolu | URL | Menü yolu | Durum | Yüzeysel / Eksik Nedeni | Karar |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| Kurumsal iletişim kanalı (WhatsApp yerine CRM'de takip) | `app/dashboard/customers/relation-tabs.tsx` (`CustomerChat`), `app/dashboard/chat/page.tsx` (`ChatConversation`), `lib/services/whatsappParser.ts`, `/api/eod/customer-requests` | `/dashboard/customers`, `/dashboard/chat`, `/dashboard/personel-denetim/musteri-talepleri` | Satış > Müşteriler > Sohbet, İletişim > Kurumsal Chat | YÜZEYSEL | Müşteriler altındaki `Sohbet` sekmesi yalnızca manuel log ekler; `Kurumsal Chat` dahili personel sohbetidir; `personel-denetim` ise harici bot/EOD akışlıdır. Teklif, rezervasyon, sözleşme, onay ve operasyon notlarının WhatsApp dışı tek merkezli CRM zaman tünelinde takip/doğrulama akışı parçalıdır. | **DERİNLEŞTİR** *(Mevcut `CustomerChat` + iç `Chat`/`Notification` altyapısı rezervasyon/sözleşme/tur/partner olaylarına bağlanır; eski `mockDatabase` bypass'ından arındırılmış uçlar kullanılır)* |
| Bildirimler | `lib/notifications/service.ts`, `catalog.ts`, `lib/logistics/notifications/logisticsAlertRules.ts`, `components/shared/logistics-notification-prefs-panel.tsx` | `/dashboard` *(Zil ikonu + Ayarlar)* | Üst Bar Bildirim Çanı | YETERLİ *(genişletmeye hazır)* | Tercih yönetimi, 24s idempotency ve Web Push altyapısı eksiksiz. Yalnızca turizm/kiralama/otel/partner için yeni uyarı kuralları eklenmelidir. | **DERİNLEŞTİR** *(Yeni sektör alarm kuralları eklenir)* |
| Pano (Dashboard yönetim özeti) | `app/dashboard/page.tsx`, `LogisticsExecutiveSummarySection.tsx` | `/dashboard` | Genel > Dashboard | YÜZEYSEL *(turizm yok)* | `LogisticsExecutiveSummarySection` bayrağı açık modüllerin KPI kartlarını temiz bir blokta gösteriyor; ancak Rent-a-Car aktif kiralama/doluluk, Otel günlük check-in/oda doluluk, Tur bugünkü kalkışlar ve B2B partner bakiyesi yok. | **DERİNLEŞTİR** *(Açık turizm bayraklarına göre koşullu Özet Bölümü eklenir)* |
| Rapor dışa aktarma (xlsx/pdf) | `app/dashboard/lojistik-raporlar/page.tsx`, `lib/logistics/reports/exportReports.ts` | `/dashboard/lojistik-raporlar` | Lojistik > Lojistik Raporlar | YETERLİ *(kalıp)* | Canlı DB raporları için Excel (`xlsx`) ve PDF (`jspdf`) üretim motoru hazır ve testli; sektör raporları için yeniden kullanılabilir. | **DERİNLEŞTİR / REUSE** *(Turizm modülleri için aynı `exportReports.ts` motoru ve yeni sektör rapor ekranı/sekmesi kullanılır)* |
| Sektöre göre modül paketleme / seçimi | `lib/actions/niche-actions.ts` (`Niche`), `app/api/modules/route.ts`, `lib/config/logistics-feature-flags.ts`, `app/dashboard/settings/page.tsx` | `/dashboard/settings` | Yönetim > Ayarlar | YÜZEYSEL | Üretim (6) ve Lojistik (5) kod tabanlı özellik bayrağı kalıbı çok sağlam olsa da, Ayarlar ekranında yöneticinin firmasına göre paket seçebileceği ("Rent-a-Car", "Otel", "Tur Operatörü", "B2B Partner", " Karma") bir UI/ayar sihirbazı ve merkezi modül kataloğu birleştirmesi yoktur. | **DERİNLEŞTİR** *(Ayarlar ekranına modül/sektör paketleme sekmesi ve bayraklarla tam senkronize katalog API'si eklenir)* |

---

## 3. Demo Mekanizması, Vercel Dağıtımı, Seed Çerçevesi ve Mevcut Kayıt Envanteri

### 3.1 Demo Veritabanı Konumu ve Çift Katmanlı Demo Mekanizması

Sistemde iki farklı demo katmanı eş zamanlı olarak bulunmaktadır:
1. **Modern Kalıcı JSON Veritabanı Katmanı (`lib/db.ts` -> `DEVRESILIENCE`):**
   - PostgreSQL (`DATABASE_URL`) erişilemediğinde veya boş bırakıldığında tüm Prisma modelleri otomatik olarak **`storage/ajans-kutuphanesi/.local-db.json`** dosyasına yönlendirilir (`lib/db.ts`).
   - Yapılandırma ve aktif özellik bayrakları **`storage/system_config.json`** dosyasında tutulur (`lib/system-config.ts`).
   - Tüm Lojistik modülleri (`wms`, `satinalma`, `filo`, `sevkiyat`, `omnichannel`, `lojistik-raporlar`) ve Üretim modülleri veriyi **gerçek sunucu API'leri + bu JSON DB üzerinden** okur ve yazar.
2. **Eski İstemci Tarafı Mock Simülasyon Katmanı (`DemoModeInterceptor` & `mockDatabase`):**
   - `app/dashboard/layout.tsx` içinde `<DemoModeInterceptor />` render edilir (`components/demo-interceptor.tsx`) ve `.env` üzerinde `NEXT_PUBLIC_USE_MOCK_DATA="true"` tanımlıdır.
   - `lib/data-controller.ts -> isDemoModeActive()` true döndüğünde eski API'ler (`/api/customers`, `/api/orders`, `/api/finance`, `/api/hr`, `/api/b2b/products`, `/api/b2b/requests`, `/api/calendar/events`, `/api/cargo`) JSON DB yerine bellek içi statik `mockDatabase` (`lib/data/mockDatabase.ts`) verisini döner ve `requirePermission` yetki kontrolünü atlar.
   - *Kritik Uyarı (Kural 6 & Kural 7):* Yeni eklenecek Rent-a-Car, Otel, Tur ve B2B Partner ekranları asla `mockDatabase` veya sabit dizi kullanmamalı, yalnızca veritabanından (`.local-db.json` / PostgreSQL) okumalı ve tüm API'lerinde yetki doğrulaması çalıştırmalıdır. Ayrıca `app/api/auth/demo/route.ts` mevcut haliyle koşulsuz `"Super Admin"` oturumu açtığından yeni demo akışlarında doğrudan kullanılmamalı, Lojistik Faz 3'teki `lib/logistics/procurement/demoPortalHelper.ts` + `DISABLE_DEMO_MODE` kilitli kısıtlı demo rolü / perspektif geçişi kalıbı izlenmelidir.

### 3.2 Canlı Sitede (Vercel) Dağıtım Mekanizması

- **`vercel.json`:** `{"framework": "nextjs"}`.
- **`next.config.js`:**
  - `output: process.env.VERCEL ? undefined : "standalone"`.
  - `outputFileTracingIncludes`: `"/**"` rotası için `./storage/ajans-kutuphanesi/.local-db.json`, `./storage/system_config.json` ve `./public/uploads/pod-demo/**/*` dosyalarını serverless paketlere dahil eder.
  - `typescript: { ignoreBuildErrors: true }`.
- **Salt-Okunur Dosya Sistemi (`EROFS`) Dayanıklılığı:**
  - `lib/db.ts` (`__sunumEphemeralJsonDb`) ve `lib/system-config.ts` (`__sunumEphemeralSystemConfig`), Vercel serverless fonksiyonlarında `EROFS`/`EACCES`/`EPERM` hatası alındığında disk yazımı yerine runtime bellek önbelleğine düşerek demo etkileşimlerinin hata vermeden çalışmasını sağlar.
  - Gerçek müşteri (production) kurulumlarında `DISABLE_DEMO_MODE=true`, `DATABASE_URL=<PostgreSQL>`, ve kalıcı medya için `LOJISTIK_STORAGE_PROVIDER=object-storage` (S3/R2) zorunludur.

### 3.3 Seed Çerçevesi

- **Kullanılacak Mevcut Kalıp (`lib/logistics/seed/framework.ts` & `index.ts`):**
  - Her faz/modül `LogisticsSeedModule` arayüzünü uygular (`moduleKey`, `phase`, `seededIdsByCollection`, `seed(db)`, `rollback(db)`).
  - `assertLogisticsDemoSeedAllowed()`: `isDemoEnvironment()` (`DISABLE_DEMO_MODE !== "true"` vb.) kontrolü yapar; harici PostgreSQL algılandığında `ALLOW_DEMO_SEED=true` yoksa reddeder.
  - Çalışmadan önce `databaseBackupService.createDatabaseBackup()` ile `storage/backups/` altında SHA-256 manifestli tam yedek alır.
  - Sabit ID önekleri (ör. `f5-*`, `f6-*`) ile **idempotent** çalışır, mevcut kayıtların SHA-256 parmak izini doğrular ve `rollback` ile eklediği tüm kayıtları tek komutla (`npx tsx scripts/seed-logistics-demo.ts rollback`) geri alabilir.
- **Dokunulmayacak Eski Araç:** `npm run seed:demo` ve `scripts/seed-demo-database.js` mevcut verileri silme riski nedeniyle kesinlikle çalıştırılmamalı ve değiştirilmemelidir.

### 3.4 Mevcut Demo Veritabanı (`.local-db.json`) Envanteri

Toplam **176 koleksiyon** tanımının **131'i dolu**, **45'i boştur**. Mevcut kritik ana kayıtlar aşağıdadır:

#### A) Şubeler (4 Kayıt)
| ID | Kod | Adı | Adres | Aktif |
| :--- | :--- | :--- | :--- | :--- |
| `local-debug-branch` | `HQ` | Merkez Şube (İstanbul Levent) | Büyükdere Cad. No:193 Kanyon Ofis K:14, Levent / İstanbul | `true` |
| `branch-ankara` | `ANK-001` | Ankara Çankaya Şubesi | Turan Güneş Bulvarı No:82/B Çankaya / Ankara | `true` |
| `branch-izmir` | `IZM-001` | İzmir Alsancak Şubesi | Atatürk Cad. No:140/A Alsancak / İzmir | `true` |
| `branch-bursa` | `BUR-001` | Bursa Nilüfer Şubesi | FSM Bulvarı No:45 Nilüfer / Bursa | `true` |

#### B) Roller (7 Kayıt) ve Kullanıcılar (15 Kayıt)
- **Roller:** `role-super-admin` (`Super Admin`), `role-branch-admin` (`Şube Müdürü`), `role-saha-satis` (`Saha Satış`), `role-muhasebe` (`Muhasebe & Finans`), `role-ik` (`İnsan Kaynakları`), `role-kreatif` (`Kreatif & Tasarım`), `role-tedarikci` (`Tedarikçi` — `lojistik_tedarikci` kaynaklı dizi izinli).
- **Kullanıcılar:** `local-debug-user` (`cicekana.dev`), `user-admin` (`admin`), `user-art-director` (`melis.sen`), `user-copywriter` (`cem.aslan`), `user-developer` (`emre.yildirim`), `user-accountant` (`kemal.ozturk`), `user-hr` (`zeynep.demir`), `user-sales` (`burak.celik`), `user-social` (`selin.aydin`), `user-video` (`deniz.arda`), `user-it` (`ahmet.kurt`), `user-ankara-mgr` (`volkan.koc`), `user-izmir-mgr` (`ece.tan`), `user-tedarikci-flora` (`tedarikci.royal` -> `sup-holland-01`), `f3-user-tedarikci-yalova` (`tedarikci.yalova` -> `sup-yalova-02`).

#### C) Araçlar (`lojistikVehicle` — 18 Kayıt)
| ID | Kod | Plaka | Marka / Model | Tip | Yakıt | Mülkiyet | Durum | Şube | Atanan Şoför |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| `f5-veh-01` | `ARC-001` | `34 SNR 808` | Ford Transit Custom Frigo (2024) | `FRIGO_VAN` | `DIESEL` | `OWNED` | `IN_TRANSIT` | `local-debug-branch` | `f5-drv-01` |
| `f5-veh-02` | `ARC-002` | `34 LJS 402` | Iveco Daily 35S16 Kamyonet (2023) | `TRUCK` | `DIESEL` | `LEASED` | `IN_TRANSIT` | `local-debug-branch` | `f5-drv-02` |
| `f5-veh-03` | `ARC-003` | `34 SNR 720` | Mercedes-Benz Sprinter 317 CDI Frigo (2025) | `FRIGO_VAN` | `DIESEL` | `OWNED` | `IN_TRANSIT` | `local-debug-branch` | `f5-drv-03` |
| `f5-veh-04` | `ARC-004` | `34 SNR 412` | Renault Master L2H2 Van (2023) | `PANEL_VAN` | `DIESEL` | `LEASED` | `ACTIVE` | `local-debug-branch` | `f5-drv-04` |
| `f5-veh-05` | `ARC-005` | `06 ANK 514` | Ford Transit 350L Frigo (2024) | `FRIGO_VAN` | `DIESEL` | `OWNED` | `IN_TRANSIT` | `branch-ankara` | `f5-drv-05` |
| `f5-veh-06` | `ARC-006` | `35 IZM 309` | Fiat Ducato Maxi Panel (2023) | `PANEL_VAN` | `DIESEL` | `LEASED` | `ACTIVE` | `branch-izmir` | `f5-drv-06` |
| `f5-veh-07` | `ARC-007` | `16 BRS 218` | Peugeot Boxer Soğutmalı (2024) | `FRIGO_VAN` | `DIESEL` | `OWNED` | `IN_TRANSIT` | `branch-bursa` | `f5-drv-07` |
| `f5-veh-08` | `ARC-008` | `34 SNR 915` | Isuzu NPR10 Long Kamyonet (2022) | `TRUCK` | `DIESEL` | `OWNED` | `MAINTENANCE` | `local-debug-branch` | `f5-drv-08` |
| `f5-veh-09` | `ARC-009` | `34 SNR 622` | Fiat Ducato Van L3H2 (2024) | `PANEL_VAN` | `DIESEL` | `RENTED` | `ACTIVE` | `local-debug-branch` | `f5-drv-09` |
| `f5-veh-10` | `ARC-010` | `34 SNR 304` | Ford Ranger Wildtrak 4x4 (2023) | `PICKUP` | `DIESEL` | `OWNED` | `ACTIVE` | `local-debug-branch` | `f5-drv-10` |
| `f5-veh-11` | `ARC-011` | `34 SNR 118` | Volkswagen Crafter Minibüs (2023) | `MINIBUS` | `DIESEL` | `LEASED` | `IN_TRANSIT` | `local-debug-branch` | `f5-drv-11` |
| `f5-veh-12` | `ARC-012` | `34 SNR 205` | Toyota Corolla 1.8 Hybrid (2025) | `PASSENGER` | `HYBRID` | `LEASED` | `ACTIVE` | `local-debug-branch` | `f5-drv-12` |
| `f5-veh-13` | `ARC-013` | `34 SNR 209` | Renault Megane Sedan 1.3 TCe (2024) | `PASSENGER` | `PETROL` | `OWNED` | `ACTIVE` | `local-debug-branch` | `f5-drv-13` |
| `f5-veh-14` | `ARC-014` | `34 SNR 214` | Dacia Dokker Express LPG (2022) | `PANEL_VAN` | `LPG` | `OWNED` | `FAULT` | `local-debug-branch` | `—` |
| `f5-veh-15` | `ARC-015` | `34 SNR 510` | Mitsubishi Fuso Canter 7C15 Kamyon (2022) | `TRUCK` | `DIESEL` | `OWNED` | `IN_TRANSIT` | `local-debug-branch` | `f5-drv-14` |
| `f5-veh-16` | `ARC-016` | `34 SNR 640` | Peugeot Boxer L3H2 Frigo (2024) | `FRIGO_VAN` | `DIESEL` | `LEASED` | `ACTIVE` | `local-debug-branch` | `—` |
| `f5-veh-17` | `ARC-017` | `06 ANK 882` | Fiat Doblo Maxi LPG (2023) | `PICKUP` | `LPG` | `RENTED` | `ACTIVE` | `branch-ankara` | `f5-drv-15` |
| `f5-veh-18` | `ARC-018` | `34 SNR 990` | Honda Civic 1.5 i-VTEC (2021) | `PASSENGER` | `PETROL` | `OWNED` | `OUT_OF_SERVICE` | `local-debug-branch` | `—` |

> *Önemli Not:* Filoda hâlihazırda 1 `MINIBUS` (`34 SNR 118` Crafter Minibüs) ve 3 `PASSENGER` (`34 SNR 205` Toyota Corolla Hybrid, `34 SNR 209` Renault Megane, `34 SNR 990` Honda Civic) kayıtlıdır. Rent-a-Car ve Tur seed verileri bu kayıtları kopyalamadan doğrudan yeniden kullanacak, ek filo araçları farklı plakalarla tamamlayacaktır.

#### D) Şoförler (`lojistikDriver` — 15 Kayıt, KVKK gereği kimlik/telefon hariç)
`f5-drv-01` Cemal Kaya (`CE`/`SRC-4`, `ON_ROUTE`), `f5-drv-02` Kadir Şahin (`C`/`SRC-4`, `ON_ROUTE`), `f5-drv-03` Kemal Öztürk (`B`/`SRC-2`, `ON_ROUTE`), `f5-drv-04` Murat Yıldız (`B`/`SRC-4`, `AVAILABLE`), `f5-drv-05` Serkan Aydın (`C`/`SRC-4`, `ON_ROUTE`), `f5-drv-06` Hasan Demir (`B`/`SRC-4`, `AVAILABLE`), `f5-drv-07` Ali Vural (`C`/`SRC-3`, `ON_ROUTE`), `f5-drv-08` Emre Çelik (`CE`/`SRC-4`, `AVAILABLE`), `f5-drv-09` İsmail Yılmaz (`B`/`SRC-4`, `AVAILABLE`), `f5-drv-10` Hakan Arslan (`B`/`SRC-2`, `AVAILABLE`), `f5-drv-11` Mehmet Koç (`D`/`SRC-2`, `ON_ROUTE` — Personel Ring / Minibüs şoförü), `f5-drv-12` Selim Şen (`B`, `AVAILABLE`), `f5-drv-13` Burhan Aksoy (`B`, `AVAILABLE`), `f5-drv-14` Tolga Çakır (`C`/`SRC-4`, `ON_ROUTE`), `f5-drv-15` Yusuf Tekin (`B`/`SRC-4`, `OFF_DUTY`).

#### E) Müşteriler (`customer` — 12 Kayıt) ve Tedarikçiler (`supplier` — 13 Kayıt)
- **Müşteriler (`cust-01` .. `cust-12`):** Ziraat Bankası A.Ş., Çiçek Sepeti A.Ş., Vodafone Türkiye, Garanti BBVA, Koç Holding A.Ş., Teknosa İç ve Dış Ticaret, Hepsiburada, Pegasus Hava Taşımacılığı (`local-debug-branch`), Defacto Perakende A.Ş. (`branch-ankara`), Şölen Çikolata A.Ş., Vestel Elektronik Sanayi (`branch-izmir`), Anadolu Efes Spor Kulübü (`local-debug-branch`). *(Kural 6 uyarınca yeni eklenecek turizm/otel/rent-a-car B2B partnerleri, otelleri ve tur yolcuları için kesinlikle gerçek firma/kişi adı kullanılmayacak, tamamen kurgusal ve açıkça örnek kayıtlar üretilecektir.)*
- **Tedarikçiler:** 10 `ONAYLI` (`sup-holland-01`, `sup-yalova-02`, `sup-pasabahce-03`, `sup-ambalaj-04`, `f3-sup-ant-05` .. `f3-sup-izm-10`), 1 `ASKIDA` (`f3-sup-ask-11`), 1 `ADAY` (`f3-sup-ady-12`), 1 `KARALISTE` (`f3-sup-blk-13`).

---

## 4. Çapraz Mimari Standartlar Özeti

1. **Özellik Bayrakları (`lib/config/logistics-feature-flags.ts` & `production-feature-flags.ts`):**
   - Gerçek müşteri ortamında her bayrak varsayılan olarak **`false` (KAPALI)** başlar.
   - Çözümleme önceliği (`resolveLogisticsFeatureFlags`): `varsayılan (false)` -> `system_config.json` -> `branchOverrides[branchId]` -> bireysel ENV (`FEATURE_*`) -> toplu ENV -> `isDemoEnvironment()`.
   - Kapalı modüller sol menüden (`app/dashboard/layout.tsx`) tamamen gizlenir; API uçları `403 FEATURE_DISABLED` döner.
2. **Yetki & Audit Log (`lib/auth/permissions.ts`, `server-permission.ts`, `lib/logistics/security.ts`, `lib/audit.ts`):**
   - 5 standart işlem: `read`, `create`, `update`, `delete`, `approve`.
   - Yeni uçlarda sunucu tarafı `requirePermission` + bayrak kontrolü + kiracı/partner kapsamı + her mutasyon/KVKK okumasında `AuditLog` yazımı uygulanır. Eski API'lerin yetki kurallarına dokunulmaz.
3. **Modül Kataloğu (`app/api/modules/route.ts`, `PRODUCTION_MODULES_CATALOG`, `LOGISTICS_MODULES_CATALOG`):**
   - Şu an `app/api/modules/route.ts` yalnızca DB `Module` tablosu ile `PRODUCTION_MODULES_CATALOG`'u birleştirmektedir; Lojistik katalogları ve yeni Turizm/Rent-a-Car/Otel/B2B paket tanımları aynı katalog kalıbıyla genişletilmeye uygundur.
4. **Tasarım Sistemi (`app/globals.css`, `components/ui/*`):**
   - **Tema:** Obsidian Carbon & Emerald Mint (`#080A09` zemin, `#111513/90` kart, `#34D399` emerald vurgu, `glass-panel`, `glass-card`, `glass-input`, `btn-primary-emerald`, `badge-*` sınıfları).
   - **Tipografi & Veri:** `Inter`, `tabular-nums`, Türkçe `tr-TR` tarih/para (`₺`) formatı.
   - **Hazır Kütüphaneler:** `lucide-react`, `recharts`, `leaflet`, `framer-motion`, `sonner`, `zod`, `xlsx`, `jspdf`, `@radix-ui/*` tabanlı `components/ui/*` bileşen seti (Button, Card, Dialog, Sheet, Drawer, Tabs, Table, Select, Calendar, Popover, Tooltip vb.) mevcuttur; yeni UI kütüphanesi gerekmez.
5. **KVKK Maskeleme Kalıbı (`lib/logistics/fleet/constantsAndHelpers.ts` & `fleetMasterService.ts`):**
   - `maskTckn`, `maskPhone`, `maskDocumentNo`, `maskAddress` fonksiyonları kimlik/iletişim verisini varsayılan olarak sunucuda maskeler.
   - Açık görünüm talebi yalnızca yetkili rollerde (`canUserViewDriverKvkkPii`) sunucuda kontrol edilir ve her açma/reddetme denemesi `AuditLog` içine (`KVKK_PII_UNMASKED_DETAIL` / `KVKK_PII_DENIED`) yazılır.
   - Kimlik/pasaport fotokopisi veya özel nitelikli veri saklanmaz; sadece yasal bildirim (KABİS/KBS) için gereken asgari alanlar şifreli/maskeli tutulur.

---

## 5. Mevcut Doğrulama & Test Referans Sonuçları (Faz 0 Baz Hattı)

| Kontrol / Test Paketi | Sonuç / Çıkış Kodu | Gözlemlenen Ayrıntı |
| :--- | :--- | :--- |
| **`npx prisma validate`** | **BAŞARILI (`EXIT 0`)** | `prisma/schema.prisma` şeması geçerli. |
| **`npx tsc --noEmit`** | **BAŞARISIZ (`EXIT 2`)** | **170 önceden mevcut TypeScript hatası:** Lojistik (`lib/logistics/*`, `/api/filo`, `/api/sevkiyat`, `/api/wms`, `/api/procurement`, `/api/omnichannel`) dosyalarında **0 hata**; mevcut hatalar Üretim modülü servis/API/çalışma alanlarında (`productionMaintenanceServerDb.ts` 29, `production/work-orders/route.ts` 12, `mrp-mps/route.ts` 9, `QualityServerDb.ts` 9, `IntegrationServerDb.ts` 9 vb.), `lucide-react` eksik ikonlarında (`Factory`, `Hammer`, `Gauge`, `FolderTree`, `Target`, `AlertOctagon`), `stok-ai/page.tsx` (8), `ExecutiveAiBanner.tsx` (3), `jsPDF` tiplerinde (`IcerikTakvimiClient`, `personel-denetim`), `i18n` çevirilerinde (`es/de/ru/fr/it`) ve `@google/generative-ai` / `tailwind-merge` bildirimlerindedir. |
| **`npm run build` (`next build --webpack`)** | **BAŞARISIZ (`EXIT 1`)** | Proje yolundaki ünlem (`C:\Users\!\Desktop\Sunum ERP`) karakteri nedeniyle Webpack `ValidationError` fırlatarak derlemeyi başlatmadan durmaktadır. |
| **`npx next build --turbopack`** | **BAŞARISIZ (`EXIT 1`)** | Turbopack `!` yol engelini aşmıştır (7 tracing/config uyarısı + Next.js 16.4.3 güvenlik güncellemesi bildirimi), ancak **2 önceden mevcut hatada** durmuştur: `lib/gemini.ts:1` ve `app/api/social-media/ai/generate/route.ts:4` (`Export GoogleGenerativeAI doesn't exist in @google/generative-ai/dist/index.mjs`). |
| **`scripts/test-lojistik-faz1-altyapi.ts`** | **15/15 BAŞARILI (`EXIT 0`)** | Altyapı, 5 bayrak, RBAC, seed/rollback, backup SHA-256 ve karakterizasyon geçti. |
| **`scripts/test-lojistik-faz2-wms.ts`** | **9/9 BAŞARILI (`EXIT 0`)** | WMS hiyerarşi, FEFO, SSCC-18, cross-dock, kitting, çevrimdışı senkron geçti. |
| **`scripts/test-lojistik-faz3-tedarikci.ts`** | **12/12 BAŞARILI (`EXIT 0`)** | RFQ, PO onay, ASN/EDI, EOQ, skor kartı, Tedarikçi Portalı kapsam izolasyonu geçti. |
| **`scripts/test-lojistik-faz4-iade.ts`** | **7/8 (`EXIT 1` — 1 başarısız)** | `#1–#7` geçti; `#8 E-Ticaret İade Webhook` testinde sabit tarihli `OMN-2026-9042` siparişinin 14 günlük iade süresi `18.11.2026`'da dolduğu için bugün (`20.11.2026`) `RETURN_WINDOW_EXPIRED` hatası alındı. |
| **`scripts/test-lojistik-faz5-filo.ts`** | **10/10 BAŞARILI (`EXIT 0`)** | Filo araç/şoför, KVKK erişim/log, yakıt, 4 telematik profili, TCO/CO₂, demo kilidi geçti. |
| **`scripts/test-lojistik-faz6-sevkiyat.ts`** | **11/11 BAŞARILI (`EXIT 0`)** | Sefer, CVRPTW rota, dinamik yeniden planlama, E-İrsaliye, e-POD, CSPRNG takip geçti. |
| **`scripts/test-lojistik-faz7-e2e-ve-butunluk.ts`** | **10/10 BAŞARILI (`EXIT 0`)** | Zincir entegrasyonlar, Yönetim Özeti, 6 bildirim kuralı, 5 modül XLSX/PDF raporu geçti. |
| **`scripts/test-lojistik-faz8-yayin-guvenlik-perf.ts`** | **7/7 BAŞARILI (`EXIT 0`)** | EROFS fallback, HMAC fail-closed, upload/pod güvenliği, rate limit ve performans benchmarkları geçti. |
| **`scripts/test-audit-log.ts`** & **`test-auth-matrix.ts`** | **`EXIT 0`** | Audit log yazma/okuma geçti (`test-audit-log.ts` JSON DB'ye test kaydı yazar; geri yüklendi). `test-auth-matrix.ts` DB'de özel `Platform Developer` rolü bulamadığı için ilgili satırda beklenen vs gerçek farkını loglayarak `0` ile çıktı. |
| **Üretim Test Paketi (10 betik: `test-uretim-*.ts`)** | **Kısmi (`EXIT 1`)** | `ana-veriler` (12/16), `bom-rota` (13/16), `mrp-mps` (15/16), `is-emri` (15/16), `kapasite` (14/16), `kalite` (14/16), `bakim` (15/16), `entegrasyon` (16/17), `altyapi` ve `final-yayin` koşumları `storage/system_config.json` içindeki `uretim_*` bayraklarının canlı demo gereği `true` (açık) olması ve demo ortamında bayrak assertion'larının `false` beklemesi nedeniyle hata verdi. |

---

## 6. Resmî Entegrasyon Araştırması (Kamu / Kurumsal Sistemler)

> **Erişim Tarihi:** 20 Kasım 2026 (`2026-11-20`)  
> **İlke:** Kamuya açık standart teknik REST/SOAP/XSD dokümanı bulunmayan hiçbir resmî kuruma sahte endpoint veya protokol uydurulmamıştır; ilgili modüllerde "resmî erişim/doküman gerekiyor" ilkesiyle **kurum formatında dışa aktarma / hazırlık ekranı + yapılandırılabilir sağlayıcı adaptörü** kurulacaktır.

### 6.1 KABİS (Kiralık Araç Bildirim Sistemi — EGM)
- **Resmî Portal / Kaynaklar:** `https://arackiralama.egm.gov.tr/` (Polis sorumluluk bölgesi; ayrıca il emniyet/belediye-oda duyuruları: `kocaeli.pol.tr`, `ftso.org.tr` vb., erişim tarihi: `2026-11-20`). Jandarma bölgesindeki işletmeler için Jandarma birimleri/vatandaş portalı yönlendirmesi uygulanmaktadır.
- **Kamuya Açık Teknik API Dokümanı:** **Bulunamadı / kamuya açık değil.** Dış yazılımların bağlanabileceği herkese açık bir REST/SOAP API dokümanı veya test sandbox'ı EGM tarafından internet üzerinden paylaşılmamaktadır.
- **Kimlere Açık:** 1774 sayılı Kimlik Bildirme Kanunu Ek Madde 3 kapsamında resmi işyeri açma ve çalışma ruhsatına sahip araç kiralama işletmeleri.
- **Gerekli İzin / Sertifika / IP Şartları:**
  - İnternet servis sağlayıcısından temin edilmiş **Sabit (Statik) IP** zorunludur; sistem yalnızca yetkili sabit IP üzerinden erişime izin verir.
  - Emniyet tarafından atanan Üye Kodu, kullanıcı hesabı ve geçici parola (ayrıca kurumsal yazılım entegrasyonları için EGM bilgi işlem / güvenlik protokolleri gerektirir).
- **Başvuru Süreci:** Dijitalden tek başına kayıt yapılamaz. İşyeri ruhsatı, vergi levhası, imza sirküsü/kimlik ve sabit IP bilgisiyle bağlı bulunulan **İl/İlçe Emniyet Müdürlüğü Asayiş Şube / Polis Merkezi Kimlik Bildirme Büro Amirliği'ne** (jandarma bölgesinde ilgili Jandarma Komutanlığına) **Ek-2 (Firma)** ve **Ek-3 (Kullanıcı)** formlarıyla bizzat başvurulur.
- **Sistem Mimari Kararı:** **Resmî erişim/doküman gerekiyor.** İlk teslimde kiralama açılış/teslim/iade kayıtlarından **KABİS Bildirim Hazırlık Ekranı**, eksik alan denetimi (TCKN/Pasaport, plaka, alış/iade zamanı), durum takibi (`BEKLIYOR`, `AKTARILDI`) ve dışa aktarma (Excel/CSV) sunulur; ileride kurum entegrasyon sözleşmesi açılırsa `IKabisProvider` adaptörü üzerinden bağlanır.

### 6.2 KBS (Kimlik Bildirme Sistemi — EGM & Jandarma Konaklama)
- **Resmî Portal / Kaynaklar (Erişim tarihi: `2026-11-20`):**
  - **EGM (Polis Bölgesi):** `https://kbs.egm.gov.tr/` (`egm.gov.tr` üzerinde **EGMSEC** iki faktörlü OTP doğrulama kılavuzları mevcut; açık genel public web servis XSD/endpoint dokümanı herkese açık **bulunamadı**).
  - **Jandarma (Jandarma Bölgesi):** `jandarma.gov.tr` (*KBS Tesis 2 Uygulama / Web Servis Tanım Dokümanları*, portal içi `Dokümanlar` bölümü) ve e-Devlet girişi (`turkiye.gov.tr/jandarma-kimlik-bildirim-sistemi`).
- **Kimlere Açık:** 1774 sayılı Kimlik Bildirme Kanunu kapsamındaki ruhsatlı otel, motel, pansiyon, kamp vb. konaklama tesisleri.
- **Gerekli İzin / Sertifika / IP Şartları:**
  - **EGM KBS:** Kurumsal kullanıcı kodu/parola + **EGMSEC** mobil 2FA/OTP doğrulaması + statik IP / ilçe emniyet yetkilendirmesi. Standart kamuya açık REST API yerine tesis içi otomasyonlar ya kurum içi dokümanlarla ya da tarayıcı/entegratör yardımcılarıyla çalışır.
  - **Jandarma KBS Tesis 2:** Tesis kaydı sonrası portalın `Web Servis İşlemleri` ekranından alınan özel web servis şifresi/token, Tesis Kodu, yetkili TCKN ve genellikle **Statik IP tanımlaması** gerekir. XML/Web servis teknik dokümanı sadece yetkili tesisin portal girişi içindeki `Dokümanlar` sekmesinden indirilebilir (dışarıya ham teknik doküman açık değildir).
- **Başvuru Süreci:** İşyeri açma ruhsatı, vergi levhası, imza sirküsü ve dilekçe (Jandarma'da Geçiş Bildirim Formu) ile ilgili Emniyet veya Jandarma karakol/komutanlığına şahsen müracaat.
- **Sistem Mimari Kararı:** **Resmî erişim/doküman gerekiyor.** İlk teslimde check-in / konaklamalı tur misafir listelerinden kimlik minimizasyonu ile **KBS Hazırlık Ekranı**, eksik veri doğrulaması, kurum formatına uyumlu XML/Excel dışa aktarım şablonu ve `IKbsProvider` adaptör arayüzü kurulur; gerçek XML servis şeması yetkili tesis portalından alındığında adaptör doldurulur.

### 6.3 HGS / OGS (Geçiş & İhlal Takibi — PTT / KGM / Bankalar)
- **Resmî Portallar / Kaynaklar (Erişim tarihi: `2026-11-20`):**
  - **PTT HGS Müşteri Hizmetleri:** `https://hgsmusteri.ptt.gov.tr/` (`ptt.gov.tr`)
  - **KGM İhlalli Geçiş Sorgulama:** `https://www.kgm.gov.tr/` (web UI üzerinden plaka + VKN/TCKN sorgulama)
  - **e-Devlet:** `turkiye.gov.tr` (*Hızlı Geçiş Sistemi HGS İhlalli Geçiş Bilgileri Sorgulama*)
  - **Kurumsal Banka API Portalı (Örnek):** İş Bankası Geliştirici Portalı (`https://developer.isbank.com.tr/`, `isbank.com.tr` kurumsal HGS geçiş/bakiye ürünleri)
  - *(Not: OGS sistemi kaldırılarak HGS altyapısıyla birleştirilmiştir.)*
- **Kamuya Açık Kamu API Durumu:** PTT ve KGM tarafından tüm geliştiricilere açık ücretsiz, standart **kamu REST/SOAP API dokümanı bulunamadı.** e-Devlet kapısı arka planda Türksat B2B web servislerini yalnızca yetkili kamu/kurum anlaşmalarına sunar. Filo şirketleri otomatik entegrasyonu ya **PTT Genel Müdürlüğü ile kurumsal sözleşme** üzerinden ya da çalıştıkları **anlaşmalı bankaların (ör. İş Bankası Developer Portal Sandbox) kurumsal HGS API ürünleri** üzerinden VKN/Client ID-Secret ile yaparlar.
- **Sistem Mimari Kararı:** **Resmî kurum/banka API sözleşmesi gerekiyor.** İlk teslimde plaka + tarih/saat bazlı **HGS/OGS Geçiş & İhlal İçe Aktarma (Excel/CSV + Manuel) Ekranı**, kiralama sözleşmesiyle otomatik plaka+zaman aralığı eşleştirme ve kiracıya yansıtma akışı + `IHgsProvider` adaptörü kurulur; banka veya PTT API anahtarı alındığında otomatik çekim bağlanır.

### 6.4 Trafik İdari Para Cezası Sorgulama (EGM / GİB / e-Devlet)
- **Resmî Portallar / Kaynaklar (Erişim tarihi: `2026-11-20`):**
  - **e-Devlet Tüzel Kişi / Gerçek Kişi:** `turkiye.gov.tr` (*EGM Araç Plakasına Yazılan Ceza Sorgulama (Tüzel Kişi)*, *GİB Trafik Para Cezası Borcu Sorgulama*)
  - **GİB Dijital Vergi Dairesi:** `dijital.gib.gov.tr` / `gib.gov.tr` (Hızlı Ödemeler > MTV ve Trafik Para Cezası Ödeme; TCKN/VKN + plaka + tescil/sahiplik belge tarihi ile)
  - **EGM:** `egm.gov.tr` (e-Devlet yönlendirmeli sorgu)
- **Kamuya Açık API Durumu:** **Bulunamadı.** EGM ve GİB tarafından özel araç kiralama veya filo firmalarına toplu plaka cezası sorgulama için kamuya açık REST/SOAP API anahtarı **verilmemektedir** (KVKK ve gizlilik gerekçesi). e-Devlet B2B Gateway yalnızca kanunla yetkilendirilmiş kamu kurumlarına/sigorta vb. özel statülü yapılara açıktır.
- **Sistem Mimari Kararı:** **Resmî açık API bulunmamaktadır; gerçek sorgulama denemesi veya ekran kazıma/CAPTCHA otomasyonu yapılmayacaktır.** Mevcut `LojistikTrafficPenalty` (Filo Evrak/Ceza ekranı) derinleştirilerek ceza kaydının **plaka + ihlal tarihi/saati** üzerinden ilgili Rent-a-Car sözleşmesiyle (veya şoförle) otomatik eşleştirilmesi, müşteriye yansıtma (fatura/depozito kesintisi) ve itiraz/ödeme takibi kurulacaktır; dış entegratör erişimi gelirse `ITrafficPenaltyProvider` adaptörü hazır tutulacaktır.

---

## SORU

Onayınıza sunulan kritik mimari ve kapsam kararları (sade özet ve önerimizle):

1. **B2B Partner Ağı Nasıl Çalışsın? (Çok Firmalı Yapı Kararı)**
   Sistem şu an tek bir ana şirketin 4 şubesini yönetiyor; dışarıdaki firmalardan sadece tedarikçilerin izole bir portalı (`/tedarikci-portali`) var. B2B Partner Ağı'nda sisteme dışarıdan katılacak diğer turizm, otel ve araç kiralama firmaları için iki seçeneğimiz var:
   - **Seçenek A *(Önerilen)*:** Mevcut ana ERP yapısını hiç bozmadan, her partner firmaya yalnızca kendi ortak kaynaklarını, taleplerini ve cari hesabını görebildiği ayrı ve kapalı bir **Partner Portalı** (demoda "Firma Perspektifi" geçiş düğmesiyle tek tıkla gezilebilen) kurmak.
   - **Seçenek B:** Ana yönetim panelinin tamamını birden fazla şirketi destekleyecek şekilde baştan uyarlayıp üstten firma değiştirmeli bir yapıya geçmek.

2. **Eski Ekranlardaki Sabit Sahte Veri (`mockDatabase`) ve Demo Giriş Güvenliği**
   Müşteriler, Takvim, Siparişler, B2B Mağaza ve Finans ekranları şu an demo açıkken gerçek demo veritabanı yerine tarayıcıdaki eski sabit listeleri okuyor ve hızlı demo girişi (`/api/auth/demo`) herkesi doğrudan Süper Yönetici yapıyor.
   - **Seçenek A *(Önerilen)*:** Tüm yeni modülleri (Rent-a-Car, Otel, Tur, B2B Partner) baştan itibaren sadece gerçek demo veritabanına ve kısıtlı demo yetkilendirmesine bağlamak; eski ekranlardaki mevcut akışa ise bu aşamada dokunmayıp sonraki ayrı bir temizlikte düzeltmek.
   - **Seçenek B:** Eski Müşteriler, Takvim ve Finans ekranlarını da hemen şimdi gerçek demo veritabanına bağlamak (mevcut sayfalarda ilave düzenleme gerektirir).

3. **Sektör Paketleme (Ayarlardan Modül Açma/Kapama) Nasıl Sunulsun?**
   Müşterilere yalnızca kendi sektörüne göre satış yapabilmek için Ayarlar'da modül seçimi nasıl olmalı?
   - **Seçenek A *(Önerilen)*:** Teknik olarak 4 yeni modülü de (`Rent-a-Car`, `Otel PMS`, `Tur Operatörlüğü`, `B2B Partner Ağı`) birbirinden tamamen bağımsız bayraklarla koruyup, Ayarlar ekranına tek tıkla hazır sektör paketleri ("Rent-a-Car Paketi", "Otel + Tur Paketi", "Tam Turizm Ekosistemi") seçen yönetim arayüzü eklemek.
   - **Seçenek B:** Yalnızca geliştirici/sunucu ayar dosyasından bayrakları açıp kapatmak, arayüze paket seçici eklememek.

4. **Online Ödeme/Depozito ve Resmî Kurum Bildirimleri (KABİS, KBS, HGS, Ceza) Kapsamı**
   KABİS, KBS, HGS/OGS ve Trafik Cezası için kurumların herkese açık genel bir API'si bulunmuyor; ayrıca kredi kartı ön provizyonu (depozito blokesi) için gerçek banka/ödeme firması anahtarı gerekiyor.
   - **Seçenek A *(Önerilen)*:** İlk fazlarda bunları sahte bağlantı kurmadan "kurum formatında bildirim hazırlık ve dışa aktarma ekranları + tahsilat/depozito/ceza eşleştirme defteri" olarak uçtan uca çalıştırmak; gerçek API/banka anahtarı geldiğinde sadece ayar girilecek adaptörleri hazır bırakmak.
   - **Seçenek B:** Belirli bir ödeme sağlayıcı (`iyzico` vb.) veya harici entegratör için canlı test anahtarlarını hemen bu fazlarda tanımlayıp entegrasyon yazmamızı istemek.

5. **Uygulama Sırası ve Eski Modüllerde Görülen Bazı Test/Derleme Bulguları**
   Bugünkü başlangıç kontrollerinde Lojistik testlerinin neredeyse tamamının (yalnızca bir eski iade testinde 14 günlük tarih süresi dolduğu için 1 adım hariç) geçtiğini, ancak önceki Üretim modülünden ve Webpack `!` klasör yolundan/Gemini kütüphanesinden kalan önceden mevcut derleme/test uyumsuzlukları bulunduğunu gördük.
   - **Seçenek A *(Önerilen)*:** Eski hata ve paketlere hiç dokunmadan (Turbopack derleme uyumlu ve temiz ayrı git dallarında ilerleyerek) faz sırasını şu şekilde uygulamak: **Faz 1 (Ortak Altyapı + Sektör Bayrakları/Paketleme + Demo Perspektif Çerçevesi)** → **Faz 2 (Rent-a-Car)** → **Faz 3 (Otel Mini PMS)** → **Faz 4 (Tur Operatörlüğü)** → **Faz 5 (B2B Partner Ağı & Ortak Kaynak Havuzu)**.
   - **Seçenek B:** Yukarıdaki sıralamayı değiştirmek (örneğin Otel veya Tur'u önce almak) ya da yeni fazlara başlamadan önce eski derleme/test hatalarını temizlememizi istemek.

---

ONAY BEKLİYOR
