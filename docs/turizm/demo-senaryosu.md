# Sunum ERP — Turizm & Ağırlama Ekosistemi Demo Sunum Senaryosu

Bu belge, müşteri sunumlarında personelin veya potansiyel müşterinin kendi başına sistemi adım adım deneyimlemesi için hazırlanmış **resmî demo kılavuzudur**.

---

## 🌟 Demo Öncesi Hazırlık ve Hızlı Bilgi

- **Giriş URL**: `/dashboard`
- **Demo Kullanıcısı**: `admin` / `demo123` (veya `partner.egerota` / `partner.anadolukesif` / `partner.kiyiotel` kısıtlı partner oturumları)
- **Özellik Bayrakları**: Demo ortamında 4 turizm modülü (`turizm_rentacar`, `turizm_otel`, `turizm_tur`, `turizm_b2b`) otomatik olarak etkindir.
- **Konsolide Sektör Panosu**: `/dashboard/turizm`
- **Birleşik Raporlar**: `/dashboard/turizm/raporlar`

---

## 🚗 Senaryo 1: Araç Kiralama (Rent-a-Car) Operasyonu

> **Amaç:** Müşteriye araç filosu müsaitlik takvimini (Gantt), sözleşme üretimini, teslim/iade formunu ve KABİS kolluk kuvveti hazırlığını göstermek.

1. **Ana Menüden Erişim:**
   - Sol menüden **Araç Kiralama** (`/dashboard/arac-kiralama`) bağlantısına tıklayın.
2. **Müsaitlik Gantt Takvimi:**
   - Ekranın üstündeki **Müsaitlik Takvimi & Rezervasyonlar** sekmesinde araç sınıflarını (VIP Minibüs, C Segment, SUV) ve kiralama bloklarını inceleyin.
   - Boş bir tarih aralığına tıklayarak veya **Yeni Rezervasyon** butonuna basarak kiralama açın.
3. **Kiralama Sözleşmesi ve Depozito:**
   - Onaylanan rezervasyon kartında **Sözleşmeyi Görüntüle** butonuna tıklayın; dijital sözleşme şablonu, km sınırı ve depozito blokesini gösterin.
4. **Teslim / İade Ekspertiz Formu:**
   - **Teslim & İade** sekmesine geçin. Araç teslim formunda başlangıç km, yakıt seviyesi (%) ve hasar kontrolünü doldurup **Teslim Al** işlemini tamamlayın.
5. **KABİS Bildirim Hazırlığı:**
   - **KABİS Bildirimleri** sekmesine geçin. Emniyet Genel Müdürlüğü KABİS sistemine aktarılmak üzere hazırlanmış listeyi XML / Excel formatında dışa aktarın.

---

## 🏨 Senaryo 2: Butik Otel & Mini PMS Operasyonu

> **Amaç:** Kat planı (Room Rack), KBS kolluk bildirimi, oda hesabı (folio), minibar stok düşümü ve kat hizmetleri (housekeeping) akışını sergilemek.

1. **Otel Yönetimi Ekranı:**
   - Sol menüden **Otel Yönetimi** (`/dashboard/otel`) bağlantısına tıklayın.
2. **Görsel Kat Planı & Oda Durumu (Room Rack):**
   - 1. Kat ve 2. Kat odalarını; yeşil (Temiz), kırmızı (Dolu), sarı (Kirli/Temizlik Bekliyor) durum rozetlerini inceleyin.
3. **Misafir Check-In & KBS Hazırlığı:**
   - Rezervasyon listesinde **Check-In** butonuna basın. Misafir kimlik bilgisi maskelenmiş olarak sisteme kaydedilir ve **KBS Bildirimi** sekmesinde 1774 sayılı kanun formatında hazır hale gelir.
4. **Oda Hesabı (Folio) ve Minibar Stok Tüketimi:**
   - İlgili odayı açıp **Folio (Oda Hesabı)** sekmesine bakın; minibar tüketimi veya oda servisi eklendiğinde WMS stok modülünden otomatik düşüş gerçekleştiğini vurgulayın.
5. **Check-Out & Kat Hizmetleri Otomasyonu:**
   - **Check-Out** yapın. Oda otomatik olarak **KIRLI** durumuna geçer; `/dashboard/otel/housekeeping` ekranında kat görevlisine anında temizlik görevi üretilir. Temizlik onaylandığında oda yeniden **TEMIZ** olur.

---

## 🗺️ Senaryo 3: Tur Operatörlüğü & Yolcu Manifestosu

> **Amaç:** Tur paketleri, koltuk yerleşim planı, rehber/şoför/araç çakışma kontrolü ve yazdırılabilir yolcu manifestosunu sunmak.

1. **Tur Operatörlüğü Ekranı:**
   - Sol menüden **Tur Operatörlüğü** (`/dashboard/tur`) sayfasına geçin.
2. **Tur Takvimi ve Koltuk Planı:**
   - Günübirlik veya konaklamalı turları listeleyin. Örnek turun **Koltuk Planı** butonuna tıklayarak 2+1 otobüs veya VIP minibüs koltuk yerleşiminde dolu/boş koltukları inceleyin.
3. **Yolcu Manifestosu:**
   - Tur kartındaki **Manifesto (.pdf)** butonuna tıklayın; biniş durakları, yolcu isimleri, koltuk no ve rehber bilgilerini içeren resmî manifesto çıktısını gösterin.
4. **Çakışma Kontrolü:**
   - Serviste olan bir aracı veya başka turda görevli bir rehberi atamaya çalıştığınızda sistemin çakışma uyarısı vererek çift atamayı (double-booking) engellediğini gösterin.

---

## 🤝 Senaryo 4: B2B Partner Ağı ve "Firma Perspektifi" (En Çok İlgi Çeken Bölüm!)

> **Amaç:** İki bağımsız firmanın aynı rezervasyonun iki tarafını (kaynak sahibi alacaklı ↔ rezerve eden borçlu) kısıtlı tek-firma izolasyonuyla incelemesini sağlamak.

1. **Partner Ağına Giriş:**
   - Sol menüden **Partner Ağı** (`/dashboard/partner-agi`) ekranını açın.
2. **Firma Perspektifi Çubuğu (Demo Kolaylığı):**
   - Sayfanın üstündeki yeşil **Firma Perspektifi** bandına dikkat çekin.
   - **Örnek Ege Rota Araç Kiralama** firmasını seçin:
     - `Çapraz Rezervasyonlar` sekmesinde `CRZ-2026-B2B001` rezervasyonunu **Kaynak Sahibi (Alacaklı)** rolünde görün.
     - `Karşılıklı Cari` sekmesinde bu işlem için oluşan **+4.200 ₺ Alacak** kaydını gösterin.
3. **Tek Tıkla Karşı Tarafa Geçiş:**
   - Üst çubuktan **Örnek Anadolu Keşif Turizm** firmasına tıklayın:
     - Sayfa anında güncellenir; aynı `CRZ-2026-B2B001` kaydı bu kez **Rezerve Eden (Borçlu)** tarafında görünür.
     - Mesajlaşma sekmesinde iki firma yetkilisinin konuşma geçmişi yer alır.
     - `Karşılıklı Cari` sekmesinde birebir kuruşu kuruşuna eşit **-4.200 ₺ Borç** kaydı listelenir (A alacağı = B borcu denkliği).
4. **Veri Minimizasyonu:**
   - `Ortak Kaynak Havuzu` sekmesinde plaka, şasi no ve dahili telefonun kaynak sahibi tarafından gizlendiğini (`Veri minimizasyonu`) gösterin.
5. **Dönemsel Mutabakat ve e-Belge:**
   - `Komisyon & Mutabakat` sekmesinde onay, itiraz ve tek tıkla e-Belge kesim akışını gösterin.

---

## 📊 Senaryo 5: Konsolide Sektör Panosu & Birleşik Raporlama

1. **Sektörel Yönetim Panosu:**
   - `/dashboard/turizm` ekranını açın. 4 sektörün (Rent-a-car, Otel, Tur, B2B) konsolide KPI kartlarını, filo kullanım oranını, oda doluluk yüzdesini ve açık partner bakiyelerini tek ekranda inceleyin.
2. **Birleşik Raporlar ve Dışa Aktarma:**
   - `/dashboard/turizm/raporlar` ekranına geçin.
   - Üstteki sekmelerden modül seçimi yapın (Konsolide, Rent-a-car, Otel PMS, Tur Operatörlüğü, B2B Partner Hakediş).
   - **Excel (.xlsx)** ve **PDF (.pdf)** indirme butonlarına basarak raporların tek tıkla cihazınıza indiğini doğrulayın.
