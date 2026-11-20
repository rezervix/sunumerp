# Sunum ERP — Lojistik, Depo, Filo ve Tedarik Zinciri Kullanıcı Kılavuzu

**Sürüm:** `v1.0.0-lojistik`  
**Hedef Kitle:** Depo Operatörleri, Satınalma Uzmanları, Sevkiyat & Filo Planlayıcıları, Sürücüler, İade Kalite Sorumluları, Dış Tedarikçiler ve Yöneticiler

---

## 1. Ana Yönetim Paneli ve Merkezi Raporlama

### 1.1 Rol Bazlı Lojistik Yönetim Özeti (`/dashboard`)
- Ana gösterge paneline giriş yaptığınızda **Lojistik Yönetim Özeti** alanında yalnızca hesabınızın okuma yetkisine sahip olduğu modüllerin anlık metrik kartları görüntülenir:
  - **Depo & WMS:** Toplam depo, eldeki/kullanılabilir/rezerve/karantina stok miktarları, stok değeri (₺), kritik stok ve açık görev sayıları, raf doluluk yüzdesi.
  - **Satınalma & Tedarik:** Aktif tedarikçi, açık ve gecikmiş satınalma siparişi (PO) sayısı ile tutarı, ortalama tedarikçi skoru ve bekleyen ASN.
  - **Sevkiyat & Rota:** Aktif/tamamlanan seferler, teslim edilen ve başarısız duraklar, zamanında teslimat oranı (OTIF), taslak ve kesilmiş E-Fatura sayaçları.
  - **Araç & Filo:** Hazır/seferde/bakım-arızalı araç dağılımı, yaklaşan belge/muayene uyarısı, yakıt anomalisi ve aylık yakıt/bakım harcamaları.
  - **İade & RMA:** Toplam/açık/KK bekleyen iade talepleri, tamamlanan iadeler ve açık alacak dekontu adetleri.
- Her kart doğrudan ilgili operasyon ekranına geçiş bağlantısı sunar. Sağ üstteki **Raporlar'a Git →** butonu merkezi rapor sayfasını açar.

### 1.2 Merkezi Lojistik Raporları (`/dashboard/lojistik-raporlar`)
1. Sol menüde **Lojistik & Filo → Lojistik Raporları** seçilerek açılır.
2. Üst sekmeden yetkili olduğunuz 5 modül raporundan birini seçin:
   - **Depo Doluluk & Stok Doğruluğu (`wms`)**
   - **Tedarikçi Performansı & Satınalma PO (`satinalma`)**
   - **Sevkiyat Sefer Maliyeti & Rota Optimizasyonu (`sevkiyat`)**
   - **Filo TCO, Yakıt & Tahmini CO₂ Maliyeti (`filo`)**
   - **İade, RMA & Alacak Dekontu Analizi (`omnichannel`)**
3. **Filtreleme:** Tarih aralığı, depo, araç, tedarikçi ve satış kanalı filtrelerini uygulayarak ekrandaki grafik ve özet tabloyu güncelleyin.
4. **Dışa Aktarma:** Sağ üstten **Excel İndir (.xlsx)** (iki sekmeli: Yönetici Özeti + Detay Tablosu) veya **PDF İndir (.pdf)** (yatay A4 rapor çıktısı) indirin. Modül ekranlarının **Analiz** sekmelerindeki küçük **Raporlar'a Git →** bağlantısı doğrudan ilgili raporu önceden seçili olarak açar.

### 1.3 Bildirim Zili & Kişisel Lojistik Uyarı Tercihleri
- Sağ üst **Bildirim Zili (Bell)** çekmecesi 6 otomatik operasyon kuralını listeler (`Geciken Sevkiyat`, `Kritik Stok`, `Gecikmiş PO`, `Araç Belge & Bakım`, `RMA SLA`, `Yakıt Anomalisi`).
- Çekmece üzerindeki dişli ikonundan veya **Ayarlar → Bildirim Tercihleri (`/dashboard/settings`)** sekmesinden her kuralı kendi hesabınız için ayrı ayrı açıp kapatabilir, **Tara** butonu ile manuel değerlendirme tetikleyebilirsiniz.

---

## 2. Depo Yönetim Sistemi (WMS) & El Terminali

### 2.1 Masaüstü WMS Konsolu (`/dashboard/wms`)
- **Görev Akışı Sihirbazı:** `Mal Kabul (GOODS_RECEIPT)` → `Kalite Kontrol (QC)` → `Raf Yerleştirme (PUTAWAY)` → `Sipariş Toplama (PICK)` → `Paketleme & Sevkiyat` aşamalarını adım adım ilerletin.
- **Depo Hiyerarşisi & Raf Haritası:** Depo → Bölge (`Soğuk Zincir`, `Karantina Q-01-01`, `Yüksek Raf`) → Hücre/Raf (`StorageBin`) hiyerarşisini, sıcaklık limitlerini (`minTempC`/`maxTempC`), ağırlık/hacim kapasite doluluklarını ve hücre blokaj durumunu yönetin.
- **Akıllı Yerleştirme & Toplama Direktifleri:** `LocationDirective` kurallarına göre önerilen rafları ve `FEFO` (SKT öncelikli), `FIFO` veya `LIFO` toplama önerilerini uygulayın.
- **Ambalaj Hiyerarşisi, LPN/SSCC & Barkod/QR Etiket:** Koli/Palet dönüşüm katsayılarını tanımlayın, **LPN/SSCC** palet etiketi oluşturun ve `PrintableLabelModal` ile yazdırın.
- **Rezervasyonlar & Stok Defteri:** Açık sipariş rezervasyonlarını izleyin; **Stok Defteri (Ledger)** sekmesinde tüm hareketlerin (Açılış Bakiyesi `OPENING_BALANCE`, Mal Kabul, Çıkış, Transfer, Sayım Farkı, Üretim Sarf/Çıktı, İade) değişmez defter kayıtlarını depo, raf, lot ve yöntem filtresiyle sorgulayın.
- **Cross-Docking, Kitting/Paketleme, Kör Sayım & RFID:** Doğrudan sevkiyata aktarma (cross-dock), set/demet oluşturma (kit), döngüsel kör sayım mutabakatı ve RFID toplu okuma akışlarını yönetin.

### 2.2 Mobil El Terminali (`/dashboard/wms/mobil`)
- Depo içi tablet/el terminalleri için büyük dokunmatik butonlarla **Barkod/SKU/RMA Okutma** (`?section=lookup` — `RMA|...` kodları dahil), hızlı mal kabul, raf yerleştirme, toplama ve **Çevrimdışı Kuyruk (Offline Sync)** desteği sağlar. İnternet kesildiğinde işlemler tarayıcıda kuyruğa alınır ve bağlantı geldiğinde idempotent toplu senkronizasyonla işlenir.

---

## 3. Akıllı Satınalma & Dış Tedarikçi Portalı

### 3.1 İç Satınalma Yönetimi (`/dashboard/satinalma`)
- **Kritik Stok / ROP & EOQ Önerileri:** Emniyet stokunun altına düşen kalemler ve **Ekonomik Sipariş Miktarı (EOQ)** hesaplamalarına dayalı talep/sipariş önerileri.
- **Tedarikçi Kartları & Tek Kaynak Riski:** Tedarikçi performans karneleri (**OTD %**, kalite kabul oranı, bileşik skor snapshotları), ISO/kalite belge geçerlilik takibi ve kritik ürünlerde tek tedarikçi bağımlılığı uyarıları.
- **Çoklu Teklif Toplama (RFQ):** Birden çok tedarikçiye eşzamanlı teklif isteği gönderin, gelen fiyat/teslimat tekliflerini yan yana karşılaştırıp kazanan teklifi satınalma siparişine çevirin.
- **Çok Kademeli PO Onayı:** Tutar/kategori eşiklerine göre kademeli onay akışları (`Onaylandı`, `Kısmi Onay`, `Kırmızı Bayrak`).
- **ASN (Ön Sevkiyat Bildirimi) & WMS Mal Kabul Entegrasyonu:** Tedarikçiden gelen ASN/EDI (`DESADV`) kaydını onayladığınızda WMS mal kabulü gerçekleşir, PO `receivedQty` güncellenir, otomatik `RECEIPT` kalite kontrol incelemesi açılır ve tedarikçi karnesi yeniden hesaplanır.

### 3.2 Harici Tedarikçi Portalı (`/tedarikci-portali`)
- Dış tedarikçiler yöneticinin gönderdiği tek kullanımlık **Davet Linki** ile oturum açar (veya demo ortamında tanımlı portal kullanıcısıyla giriş yapar).
- Kapsam tamamen kendi `supplierId` kayıtlarıyla sınırlıdır (`403` izolasyonu):
  1. Açık PO'ları onaylama / kısmi veya kırmızı bayrak yanıtı verme,
  2. RFQ tekliflerini girme,
  3. Kargoya verilen sevkiyatlar için **ASN oluşturma**,
  4. Vergi/kalite/sertifika belgelerini güvenli biçimde yükleme (`PDF`, `PNG`, `JPG`, `WEBP`, `DOC/DOCX`, `XLS/XLSX` — en fazla 10 MB; `.svg`/çalıştırılabilir betikler engellenir).

---

## 4. Araç Filosu, Bakım & Telematik Entegrasyonu (`/dashboard/filo`)

- **Araç & Şoför Kartları:** Öz mal/kiralık/leasing araçlar, soğutucu kasa sıcaklık eşikleri, ruhsat/sigorta/muayene/K-belgesi tarihleri; şoför ehliyet/SRC/psikoteknik süre takibi ve **KVKK uyumlu maskelenmiş TCKN** gösterimi.
- **Canlı Telematik Haritası & 4 Sağlayıcı Profili:** Onaylı **Traccar**, **flespi**, **GpsGate Cloud** ve **Genel Webhook / CSV-JSON İçe Aktarma** profilleri üzerinden son konum, hız ihlali, rölanti, soğuk zincir sıcaklığı ve gezi izi izlenir. Harita altlık adresi yapılandırılmışsa canlı harita karoları, tanımlı değilse yerleşik koyu tema koordinat haritası görüntülenir.
- **Bakım & Arıza İş Emirleri → Sevkiyat Bağlantısı:** Periyodik km/gün bakım planları, sürücü arıza bildirimleri ve bakım iş emri parça sarfı yönetilir. Kritik arıza veya açık bakım iş emri açıldığında aracın mevcut açık seferleri **silinmez**; sevkiyat ekranında uyarı rozeti ve *"Başka Araca Devret"* seçeneği çıkar, otomatik planlayıcıysa bakım bitene dek bu araca yeni sefer atamaz.
- **Yakıt Anomalisi, TCO & Tahmini CO₂ Raporu:** Yakıt faturası içe aktarma, litre/100 km anomali algılama, km başı Toplam Sahip Olma Maliyeti (TCO) ve veritabanındaki yakıt emisyon faktörlerine dayalı tahmini CO₂ emisyonu takibi.

---

## 5. Sevkiyat Planlama, Sürücü e-POD, Takip Linki & E-Fatura

### 5.1 Sevkiyat & Rota Konsolu (`/dashboard/sevkiyat`)
- **Durak Havuzu & Çok Araçlı CVRPTW Rota Optimizasyonu:** Teslim edilecek ERP/Omnichannel siparişlerini veya depo transferlerini tek veya çoklu araçlara kapasite (kg, m³, palet), soğutuculu araç uyumu ve müşteri zaman penceresi kısıtlarıyla optimize ederek dağıtın.
- **Sefer Onayı & E-İrsaliye:** Onaylanan sefer için otomatik GİB E-İrsaliye (`eDocumentRecord`) kaydı oluşturulur.

### 5.2 Sürücü Teslimat Ekranı (`/dashboard/sevkiyat/surucu`)
- Sürücü aktif seferindeki durakları sırayla takip eder (`Yola Çık` → `Varışta` → `Teslimat Kanıtı Topla`).
- **e-POD (Teslimat Kanıtı):** Ekrandan dijital imza çizer (`PNG`), teslimat fotoğrafı çeker/yükler (maks. 5 MB, yalnızca güvenli görsel/PDF), alıcı adı-soyadı ve ilişkisini girer (`TESLIM_EDILDI` / `KISMI_TESLIM` / `TESLIM_EDILEMEDI`).
- Teslimat tamamlandığında yapılandırılan **E-Fatura Zamanlama Politikası** uyarınca taslak satış E-Faturası hazırlanır ve **Sevkiyat → POD & Analitik** sekmesinden **"Tek Tıkla E-Fatura Kes"** ile resmîleştirilir.

### 5.3 Müşteri Sipariş Takip Linki (`/takip/[token]`)
- Giriş gerektirmeyen, 192-bit tahmin edilemez token ile korunan ve süre sınırlı (`410 GONE` desteğiyle) müşteri takip sayfasıdır. Sipariş durumu, tahmini varış ve gizliliği korunmuş teslimat adımlarını gösterir (iç maliyet veya hassas personel verisi gösterilmez).

---

## 6. Çok Kanallı Sipariş, İade (RMA) & Alacak Dekontu (`/dashboard/omnichannel`)

- **Pazaryeri & Kanal Senkronizasyonu:** Trendyol, Hepsiburada, Shopify vb. kanallardan gelen siparişleri yönetin, parçalı sevkiyat (`split_shipment`), muadil ürün önerme, backorder ve E-Belge oluşturma işlemlerini gerçekleştirin.
- **RMA Yaşam Döngüsü:**
  1. Mevcut sipariş, sevkiyat veya takip numarasından iade talebi açın; yazdırılabilir **RMA İade Etiketi & Barkodu (`/dashboard/omnichannel/rma/[id]/print`)** üretin.
  2. İade paketi depoya geldiğinde **Karantina (`Q-01-01`)** rafına teslim alın.
  3. **Kalite Kontrol Karar Matrisi:** Sağlam stoğu `RESTOCK_TO_BIN` (kullanılabilir stoka geri alma + FIFO katmanı), kusurlu ürünleri `IMHA` (hurda), `TEDARIKCI_RUCU` veya kargo hasarlıları `KARGO_TAZMIN` olarak sonuçlandırın.
  4. Onaylanan kararlar otomatik olarak **Alacak Dekontu (`LojistikRmaCreditNote`)** ve Finans/GİB E-Belge kaydına bağlanır.
