# Sunum ERP — Lojistik, Depo, Filo ve Tedarik Zinciri Modülleri v1.0.0 Sürüm Notları

**Sürüm Etiketi:** `v1.0.0-lojistik`  
**Tamamlanma Tarihi:** 20 Kasım 2026  
**Geliştirme İlkesi:** Mevcut ekranları koruyup yerinde derinleştirme, yalnızca additive (geri alınabilir) veritabanı değişiklikleri, özellik bayrağı izolasyonu (gerçek kurulumlarda kapalı), sıfır gereksiz dış bağımlılık.

---

## Fazlar Bazında Teslim Özeti (Faz 1 – Faz 8)

1. **Faz 1 — Altyapı, 5 Bayrak Mimarisi & Sağlayıcı Adaptörleri (`test-lojistik-faz1-altyapi.ts`):**
   - 5 bağımsız lojistik özellik bayrağı (`lojistik_wms`, `lojistik_sevkiyat_rota`, `lojistik_tedarikci`, `lojistik_filo`, `lojistik_iade`).
   - Harici `Tedarikçi` rolü ve `supplierId` kapsam izolasyonu.
   - 6 sağlayıcı adaptör arayüzü + geri alınabilir `seed:logistics` / `seed:logistics:rollback` çerçevesi.

2. **Faz 2 — Depo Yönetimi (WMS) & El Terminali (`test-lojistik-faz2-wms.ts`):**
   - Çok katmanlı depo/bölge/raf hiyerarşisi (`Cold Chain`, `Q-01-01`), ağırlık/hacim limitleri.
   - Tek doğruluk kaynağı `StockMovement` defteri, `FEFO`/`FIFO`/`LIFO` ayırma kuralları, `LPN/SSCC`, cross-dock, kitting, kör sayım ve `/dashboard/wms/mobil` çevrimdışı el terminali.

3. **Faz 3 — Akıllı Satınalma, RFQ, ASN & Tedarikçi Portalı (`test-lojistik-faz3-*`):**
   - Çoklu teklif karşılaştırma (RFQ), çok kademeli PO onayları, EOQ/ROP ve tek kaynak riski analizi.
   - ASN/EDI `DESADV` kabulü, tedarikçi OTD/PPM skor karneleri ve izole `/tedarikci-portali`.

4. **Faz 4 — İade (RMA), Kalite Kontrol & Alacak Dekontu (`test-lojistik-faz4-*`):**
   - Sipariş/sevkiyat eşleşmeli RMA talebi, yazdırılabilir iade barkodu/etiketi (`/dashboard/omnichannel/rma/[id]/print`).
   - Karantina kabulü, 4 yönlü KK karar matrisi (`RESTOCK_TO_BIN`, `IMHA`, `TEDARIKCI_RUCU`, `KARGO_TAZMIN`), alacak dekontu muhasebesi ve HMAC imzalı iade webhook'u.

5. **Faz 5 — Araç Filosu, Bakım, TCO & 4 Telematik Profili (`test-lojistik-faz5-*`):**
   - Araç/şoför kartları (KVKK maskeli TCKN), belge vade uyarısı, yakıt anomalisi, bakım iş emri parça sarfı, TCO ve veritabanı katsayılı tahmini CO₂.
   - Onaylı deklaratif telematik profilleri: **Traccar**, **flespi**, **GpsGate Cloud** ve **Genel Webhook**.

6. **Faz 6 — Sevkiyat, CVRPTW Rota, e-POD & Müşteri Takip (`test-lojistik-faz6-*`):**
   - Kapasite + zaman pencereli uygulama içi CVRPTW rota optimizasyonu (2-Opt + Or-Opt).
   - Sefer onayı → E-İrsaliye, `/dashboard/sevkiyat/surucu` e-POD ekranı, 192-bit CSPRNG süre sınırlı `/takip/[token]` müşteri takip ekranı.

7. **Faz 7 — Modüller Arası Final Zincirler, Yönetim Özeti, 6 Uyarı & Raporlar (`test-lojistik-faz7-*`):**
   - Yapılandırılabilir teslimat → E-Fatura taslak/tek tıkla kesim zinciri, WMS wave/rezervasyon & ASN→QC→Skor, bakım→sefer güvenlik uyarısı.
   - `/dashboard` Yönetim Özeti, `/dashboard/lojistik-raporlar` (Seçenek B — 5 modül + `.xlsx` + `.pdf`) ve kullanıcı bazlı 6 bildirim kuralı.
   - Tüm stok/hareket çiftlerinde `%100` açılış bakiyesi devri (`OPENING_BALANCE`) ile mutabakat sağlandı.

8. **Faz 8 — Canlı Yayın, Güvenlik Sertleştirme, Vercel Hazırlığı & Dokümantasyon (`test-lojistik-faz8-*`):**
   - **Güvenlik Sertleştirmesi:** `/api/wms` & `/api/omnichannel` ana uçları Demo kapalıyken zorunlu oturum/yetki ve tedarikçi engeli aldı (Demo ON anonim gezinti korunarak), `seed_reset` ve `mockDatabase` dönüşleri yalnızca Demo moduna hapsedildi. Demo kapalıyken tüm pazaryeri webhook olaylarına fail-closed HMAC zorunluluğu getirildi; yükleme uçlarına tür/boyut sınırları (`.svg/.html/.js` engeli) ve `/api/logistics/pods/[...key]` üzerine `nosniff` + `.svg` `sandbox`/`attachment` güvenlik başlıkları eklendi; kayan pencere `429` hız sınırlayıcı devreye alındı.
   - **Vercel Hazırlığı:** `lib/system-config.ts` içine salt-okunur dosya sistemi (`EROFS`) bellek-içi fallback eklendi; `next.config.js` `outputFileTracingIncludes` ile `.local-db.json`, `system_config.json` ve `pod-demo` dosyaları garanti altına alındı.
   - **İstemci & JSON DB İyileştirmeleri:** `wms/satinalma/omnichannel` ekranlarında Demo kapalıyken sahte client fallback engellendi, müşteri ekranlarından bayrak teknik metinleri kaldırıldı, `lib/db.ts` `findMany` okuma karmaşıklığı `O(N)`'den `O(1)`'e düşürüldü.
   - **Tam Dokümantasyon:** `docs/lojistik/08..12` kurumsal doküman seti eklendi.

---

## Bilinen Sınırlamalar ve Sonraki Planlı İşler

- **`npm audit` Paket Yükseltmeleri:** Geriye dönük uyumluluk kararı gereği bu sürümde hiçbir paket sürümü yükseltilmemiştir (`npm audit --omit=dev` çıktısındaki 22 bulgu `docs/lojistik/10-TEKNIK-MIMARI-VE-API-DOKUMANI.md` Bölüm 4'te telafileriyle belgelenmiştir).
- **Eski Üretim / Stok Uçları (`/api/inventory`, `/api/orders`, `/api/production/maintenance`):** Kapsam gereği Faz 8'de değiştirilmemiştir; `test-uretim-bakim.ts` içindeki `TEST_02` demo bypass davranışı ayrı temizlik revizyonunda ele alınacaktır.
- **Kalıcı Serverless Dosya Depolama:** Gerçek müşteri kurulumlarında Vercel geçici dosya sisteminde belge/POD kalıcılığı için S3 / Cloudflare R2 (`LOJISTIK_STORAGE_PROVIDER=object-storage`) bağlanması önerilir.
