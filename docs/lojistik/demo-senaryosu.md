# Sunum ERP — Lojistik & Tedarik Zinciri Müşteri Demo Sunum Senaryosu

**Hazırlık Tarihi:** 17 Kasım 2026  
**Kapsam:** Faz 1 – Faz 7 Uçtan Uca Canlı Gösterim Akışı (Stok/WMS → Satınalma & Tedarikçi Portalı → Sevkiyat & e-POD/E-Fatura → Araç Filosu & Telematik → İade/RMA & Alacak Dekontu → Yönetim Özeti & Birleşik Raporlar)

---

## 0. Sunum Öncesi Kontrol Listesi (Sunucu Başlatma)

1. Uygulamayı başlatın ve demo bayraklarının açık olduğunu doğrulayın (`DISABLE_DEMO_MODE` tanımlı değil veya `false`):
   - Yönetici hesabı ile giriş yapın (`/login` → `admin` / demo yönetici parolası).
   - Yedek/sıfırlama gerekirse yalnızca **demo ortamında** tek komutla geri dönüş ve yeniden yükleme yapılabilir:
     ```bash
     npm run seed:logistics:rollback
     npm run seed:logistics
     ```
2. Sağ üst bildirim zili (**Bell**) ikonunda canlı lojistik uyarı rozetinin göründüğünü teyit edin.

---

## 1. Yönetici Gösterge Paneli ve Bildirim Merkezi (`/dashboard`)

1. **Rol Bazlı Lojistik Yönetim Özeti:**
   - Ana sayfadaki **"Lojistik Yönetim Özeti"** bölümünde yetkili olduğunuz 5 modülün (Depo/WMS, Satınalma, Sevkiyat/Rota, Araç/Filo, İade/RMA) canlı DB KPI kartlarını gösterin.
   - Her modül kartına tıklandığında ilgili operasyon ekranına geçiş yaptığını vurgulayın.
   - Sınırlı yetkili bir kullanıcıda yalnızca kendi rolüne açık modüllerin göründüğünü (ör. Muhasebe/Kreatif kullanıcıda gizli kaldığını) anlatın.
2. **6 Akıllı Bildirim Kuralı & Kişisel Tercihler:**
   - Sağ üst **Bildirim Zili (Bell)** çekmecesini açın:
     - Geciken sevkiyat, gecikmiş PO, yaklaşan araç belgesi/bakımı, RMA SLA ve yakıt anomalisi bildirimlerini gösterin.
     - Çekmece üstündeki **Ayarlar (Dişli)** ikonuna tıklayarak her kullanıcının **6 uyarı kuralını** anlık açıp kapatabildiğini ve **"Tara"** ile 24 saat idempotent değerlendirme tetiklenebildiğini gösterin.
   - Alternatif olarak **Ayarlar → Bildirim Tercihleri (`/dashboard/settings`)** sekmesindeki tam açıklamalı kural listesini de gösterebilirsiniz.

---

## 2. Depo Operasyonları, Stok Defteri & Mutabakat (`/dashboard/wms` ve `/dashboard/stok`)

1. **`/dashboard/wms` → Rezervasyonlar & Stok Defteri Sekmesi:**
   - Tüm ürün/depo çiftlerinde hareket defteri toplamının (`SUM(StockMovement)`) fiziksel stok bakiyesiyle (`StockBalance.onHandQty`) birebir tuttuğunu ve açılış farklarının **"Açılış Bakiyesi (`DEVIR-2026-ACILIS`)"** satırlarıyla denklendiğini gösterin.
   - Filtreden **"Açılış Bakiyesi"** seçerek devir satırlarını izole edin.
2. **`/dashboard/stok` → Ürün Detay Çekmecesi:**
   - Herhangi bir ürünü (ör. `GUL-EKV-01`) açın; karantina stoğunun (`12` adet `Q-01-01`) net göründüğünü ve son stok hareketlerinde **Açılış Bakiyesi (+)** / **Giriş (+)** / **Çıkış (-)** etiketlerinin tutarlı olduğunu vurgulayın.
3. **Analiz Sekmesi:** `Raporlar'a Git →` bağlantısının önceden `wms` modülü seçili şekilde `/dashboard/lojistik-raporlar` sayfasını açtığını gösterin.

---

## 3. Tedarikçi Portalı, Satınalma (PO) → ASN → Mal Kabul → Kalite → Skor Kartı (`/dashboard/satinalma`)

1. **Satınalma → ASN → WMS Mal Kabul Zinciri:**
   - Bir tedarikçi ASN kaydı üzerinden WMS mal kabulü yapıldığında ilgili PO kaleminin `receivedQty` değerinin, otomatik `RECEIPT` kalite kontrol kaydının ve `recalculateSupplierScorecard` skor snapshotsunun güncellendiğini anlatın.
   - Tedarikçi portalı hesabında (`tedarikci.royal` / `tedarikci.yalova`) yalnızca kendi firmasına ait kayıtların göründüğünü, dahili yönetim özeti ve rapor uçlarının **403** ile kapalı tutulduğunu vurgulayın.

---

## 4. Araç Filosu, Arıza/Bakım → Sevkiyat Etkisi (`/dashboard/filo` & `/dashboard/sevkiyat`)

1. **Bakım / Arıza → Açık Sefer Etkileşimi (Otomatik Silme Yok):**
   - `/dashboard/filo` ekranında aktif bir araca (ör. kritik/yüksek şiddette arıza veya `IN_PROGRESS` iş emri) açıldığında aracın açık seferlerinin **silinmediğini** ve bozulmadığını gösterin.
   - Ardından `/dashboard/sevkiyat` → **Sefer Planlama** sekmesine geçin: etkilenen sefer kartında **"Bakım/Arıza Uyarısı"** rozeti, sefer detayında amber uyarı bandı ve manuel **"Başka Araca Devret →"** aksiyonu hazır bekler; otomatik rota planlayıcı ise arızalı aracı yeni sefere atamaz.

---

## 5. Sevkiyat, Canlı Takip, e-POD → Taslak E-Fatura → Tek Tıkla Kesim (`/dashboard/sevkiyat` & `/takip/[token]`)

1. **Müşteri Takip Ekranı (`/takip/[token]`):**
   - Herhangi bir aktif duraktaki **"Müşteri Takip Linki"**ni açarak harita, ETA, sürücü durumu ve imza/fotoğraf kanıtı özetini gösterin.
2. **e-POD → Taslak E-Fatura → Tek Tıkla Kesim Akışı:**
   - `/dashboard/sevkiyat` → **Teslimatlar & e-POD** sekmesinde `SFR-2026-701` (`OMN-2026-7701`) durağının teslimat sonrası otomatik **`Taslak (GIB2026T0000701)`** satış E-Faturası ürettiğini gösterin.
   - **"Tek Tıkla E-Fatura Kes"** butonuna basın → tek adımda GİB onaylı **`KESILDI (1300)`** statüsüne geçtiğini ve çift tıklamada mükerrer fatura üretilmediğini (idempotency) kanıtlayın.
   - Kısmi teslimatta yalnızca fiilen teslim edilen kalemlerin faturalandığını, `TESLIM_EDILEMEDI` durumda taslak fatura kesilmediğini ve zamanlama politikasının (`ON_DELIVERY_DRAFT` / `ON_WAYBILL_SETTLE` / `MANUAL_ONLY`) `system_config.json` üzerinden yapılandırılabildiğini açıklayın.

---

## 6. İade / RMA → Sevkiyat Bağlantısı & Alacak Dekontu (`/dashboard/iade` & `/dashboard/omnichannel`)

1. Sipariş numarası veya iade kodu arandığında (`lookupOrderForRma`) varsa ilişkili sevkiyat seferi, takip bağlantısı ve E-İrsaliye bilgisinin otomatik eşleştiğini gösterin.
2. KK Kararı → **SAĞLAM STOK** (`RESTOCK_CLEAN`) veya **KARANTİNA** (`QUARANTINE`) sonrası finansal alacak dekontunun (`LojistikRmaCreditNote`) muhasebe onayına geçtiğini gösterin.

---

## 7. Merkezi Lojistik Raporları & Excel / PDF Dışa Aktarma (`/dashboard/lojistik-raporlar`)

1. Sol menüdeki **Lojistik & Filo → Lojistik Raporları** (veya ana sayfadaki **Lojistik Raporları →** butonu) üzerinden birleşik rapor ekranını açın.
2. Yetkiniz olan **5 modül raporu** arasında geçiş yapın:
   - **Depo & WMS:** Depo bazlı stok değerleme, karantina ve hacim doluluğu
   - **Tedarikçi & PO:** Bileşik puan kartları ve OTD % kıyası
   - **Sevkiyat & Rota:** Optimizasyon öncesi vs optimize km kazanımları ve E-Fatura özeti
   - **Filo & TCO:** Yakıt, bakım, km başı maliyet ve tahmini CO₂ emisyonu
   - **İade & RMA:** Neden kodu dağılımı ve alacak dekontu özeti
3. Tarih, depo, araç, tedarikçi veya kanal filtresi uygulayın → grafik ve önizleme tablosunun güncellendiğini gösterin.
4. **"Excel (.xlsx)"** ve **"PDF İndir"** butonlarıyla Türkçe başlıklı, çok sayfalı çalışma kitabı ve PDF rapor çıktısı alarak sunumu tamamlayın.
