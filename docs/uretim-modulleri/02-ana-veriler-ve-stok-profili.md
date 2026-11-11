# SUNUM ERP – FAZ 2: Üretim Ana Verileri (Master Data) & Stok Kartı 1-1 Üretim Profili Raporu

Bu doküman, Sunum ERP Üretim Yönetim Sistemi'nin **Faz 2 (Üretim Ana Verileri)** kapsamında tamamlanan mimari tasarımını, veritabanı modellerini, saf hesaplama motorunu, UI entegrasyonlarını, otomatik test sonuçlarını ve geri dönüş (rollback) prosedürlerini belgeler.

---

## 1. Mimari Prensipler ve Değişmez Kurallara Uyum

1. **Mevcut Sisteme Sıfır Zarar (Non-Destructive & Isolated):**
   - Mevcut `InventoryItem` tablosundaki hiçbir kolon silinmedi, yeniden adlandırılmadı veya tipi değiştirilmedi.
   - Stok kartı üretim nitelikleri (üretim tipi, temin yöntemi, parti kuralı, emniyet stoku, fire toleransı vb.) bağımsız `UretimItemProfile` tablosunda **1-1 yabancı anahtar (`itemId`)** ile izole edildi.
   - Özellik bayrağı kapalıyken `/api/inventory?section=item` çıktısında `uretimProfile` alanı kesinlikle yer almaz; sistem bugünkü çalışma şeklini birebir sürdürür.

2. **Mevcut Tasarım Sistemine %100 Uyum:**
   - Yeni ekranlar (`ProductionMasterDataWorkspace`, `ItemProductionProfileTab`) mevcut Tailwind sınıflarını, Lucide ikonlarını, kart/tablo/diyalog/çekmece (drawer) bileşenlerini ve Türkçe iş terminolojisini kullandı.
   - Yeni harici UI kütüphanesi eklenmedi, global CSS değiştirilmedi.

3. **Eksiksiz Teslim (No Mock / No Stubs / No Fake Seeds):**
   - Rastgele sahte test verisi (`IST-001`, `CNC-MOCK` vb.) veritabanına kalıcı olarak tohumlanmadı (seed edilmedi).
   - Yalnızca sistemin matematiksel olarak çalışması için zorunlu olan küresel varsayılan `UretimParameters` kaydı desteklendi.
   - 5 ana veri alanı (İş Merkezleri, Makineler, Takvimler, Parametreler, 1-1 Ürün Profilleri) uçtan uca çalışır durumdadır.

4. **Özellik Bayrağı (Feature Flag) ve RBAC Güvenliği:**
   - Tüm üretim bayrakları varsayılan olarak `false` (OFF) kapalıdır.
   - Bayrak kapalıyken API rotası (`/api/production/master-data`) `403 FEATURE_DISABLED` döndürür.
   - Super Admin, branch admin veya atanmış yetkisi olmayan kullanıcılar için sunucu tarafında `403 FORBIDDEN` RBAC denetimi yapılır.

---

## 2. Değişen ve Eklenen Dosyaların Listesi

### 2.1. Veritabanı ve Şema Katmanı
- [`prisma/schema.prisma`](file:///c:/Users/!/Desktop/Sunum%20ERP/prisma/schema.prisma): 8 yeni model (`UretimWorkCalendar`, `UretimShift`, `UretimCalendarHoliday`, `UretimWorkCenter`, `UretimCalendarException`, `UretimMachineAsset`, `UretimParameters`, `UretimItemProfile`) ve `InventoryItem` tablosuna additive `uretimProfile` ilişkisi.
- [`prisma/migrations/20261110183500_uretim_ana_veriler/migration.sql`](file:///c:/Users/!/Desktop/Sunum%20ERP/prisma/migrations/20261110183500_uretim_ana_veriler/migration.sql): 8 yeni tablo, indeksler ve foreign key kısıtlamalarını içeren additive SQL.
- [`prisma/migrations/20261110183500_uretim_ana_veriler/rollback.sql`](file:///c:/Users/!/Desktop/Sunum%20ERP/prisma/migrations/20261110183500_uretim_ana_veriler/rollback.sql): Eklenen 8 tabloyu güvenle silen (`DROP TABLE IF EXISTS`) ters yönlü rollback SQL.

### 2.2. Çekirdek Servis ve Motor Katmanı
- [`lib/services/productionMasterDataEngine.ts`](file:///c:/Users/!/Desktop/Sunum%20ERP/lib/services/productionMasterDataEngine.ts): Saf (pure) matematiksel hesaplama ve doğrulama motoru (Vardiya süresi, Efektif kapasite, Takvim uygunluğu, 6 farklı Zod doğrulayıcısı).
- [`lib/services/productionMasterDataServerDb.ts`](file:///c:/Users/!/Desktop/Sunum%20ERP/lib/services/productionMasterDataServerDb.ts): N+1 sorgusu olmayan, ilişkisel çözümlemeli ve yerel dev veritabanı dirençli CRUD operasyonları.
- [`lib/services/productionAuditAndError.ts`](file:///c:/Users/!/Desktop/Sunum%20ERP/lib/services/productionAuditAndError.ts): Polimorfik `ProductionDomainError` ve denetim logu (`logProductionAudit`) entegrasyonu.
- [`lib/auth/permissions.ts`](file:///c:/Users/!/Desktop/Sunum%20ERP/lib/auth/permissions.ts): İzin normalizasyon köprüsü (`normalizePermissionAction`).

### 2.3. API ve Entegrasyon Rotaları
- [`app/api/production/master-data/route.ts`](file:///c:/Users/!/Desktop/Sunum%20ERP/app/api/production/master-data/route.ts): Tam CRUD, arama/filtre/sayfalama, RBAC ve özellik bayrağı kapılı REST API uç noktası.
- [`app/api/inventory/route.ts`](file:///c:/Users/!/Desktop/Sunum%20ERP/app/api/inventory/route.ts): Bayrak açıkken `uretimProfile` dahil eden, kapalıyken mevcut davranışı koruyan cerrahi entegrasyon.

### 2.4. Kullanıcı Arayüzü (UI) Katmanı
- [`app/dashboard/uretim/components/ProductionMasterDataWorkspace.tsx`](file:///c:/Users/!/Desktop/Sunum%20ERP/app/dashboard/uretim/components/ProductionMasterDataWorkspace.tsx): İş Merkezleri, Makineler, Çalışma Takvimleri & Vardiyalar, Üretim Parametreleri ve 1-1 Ürün Profilleri sekmelerini barındıran tam teşekküllü çalışma alanı.
- [`app/dashboard/stok/components/ItemProductionProfileTab.tsx`](file:///c:/Users/!/Desktop/Sunum%20ERP/app/dashboard/stok/components/ItemProductionProfileTab.tsx): Stok kartı detay çekmecesi ve yeni ürün modalında çalışan 1-1 üretim profili sekmesi.
- [`app/dashboard/stok/components/ItemDetailDrawer.tsx`](file:///c:/Users/!/Desktop/Sunum%20ERP/app/dashboard/stok/components/ItemDetailDrawer.tsx): Yalnızca özellik bayrağı açıkken 5. sekme olarak "Üretim Profili"ni gösteren cerrahi entegrasyon.
- [`app/dashboard/stok/components/CreateItemModal.tsx`](file:///c:/Users/!/Desktop/Sunum%20ERP/app/dashboard/stok/components/CreateItemModal.tsx): Yeni stok kartı oluştururken bayrak açıksa üretim profilini toplayıp kaydeden entegrasyon.

### 2.5. Otomatik Test Paketi
- [`scripts/test-uretim-ana-veriler.ts`](file:///c:/Users/!/Desktop/Sunum%20ERP/scripts/test-uretim-ana-veriler.ts): 16 test adımı içeren birim, entegrasyon ve regresyon test paketi.

---

## 3. Otomatik Test Sonuçları (Kanıt)

Aşağıdaki çıktı `npx tsx scripts/test-uretim-ana-veriler.ts` komutunun gerçek zamanlı çıktısıdır:

```text
======================================================================
 SUNUM ERP - FAZ 2 ÜRETİM ANA VERİLERİ VE STOK 1-1 PROFİL TEST PAKETİ
======================================================================

--- BÖLÜM 1: KATMANLI MİGRATION VE ROLLBACK DOĞRULAMASI ---
  ✅ [F2-01] 20261110183500_uretim_ana_veriler Additive Migration & Rollback Kontrolü -> 8 yeni tablo (UretimWorkCalendar, UretimShift, UretimCalendarHoliday, UretimWorkCenter, UretimCalendarException, UretimMachineAsset, UretimParameters, UretimItemProfile) ve tam geri alınabilir rollback.sql doğrulandı

--- BÖLÜM 2: SAF (PURE) ÜRETİM ANA VERİ MOTORU TESTLERİ ---
  ✅ [F2-02] Vardiya Net Çalışma Süresi (Gündüz ve Gece Devreden Vardiya) Hesabı -> Gündüz vardiyası: 540 dk (9 saat), Gece vardiyası: 450 dk (7.5 saat)
  ✅ [F2-03] İş Merkezi Efektif Kapasite, Günlük Kapasite ve Birim Maliyet Hesabı -> Efektif Kapasite: 17/saat, Günlük: 153/gün, Birim Maliyet: 40 TL
  ✅ [F2-04] Takvim / Tatil / İstisna Gün Uygunluk Değerlendiricisi -> Normal gün: 9s, Tatil: 0s, Bakım İstisnası: 3s
  ✅ [F2-05] Girdi Doğrulama (Validation) Kuralları Negatif Testleri -> 6 ana veri doğrulayıcısı (İş Merkezi, Makine, Vardiya, Takvim, 1-1 Profil, Parametreler) negatif testleri geçti

--- BÖLÜM 3: ÖZELLİK BAYRAĞI KAPISI, YETKİ VE "SEED YOK" KONTROLÜ ---
  ✅ [F2-06] Bayraklar Kapalıyken (OFF) API ve Erişim Kapısı 403 FEATURE_DISABLED Kontrolü -> Bayraklar kapalıyken (false) servis ve API 403 FEATURE_DISABLED ile korundu
  ✅ [F2-07] Sunucu Tarafı RBAC Yetki Kontrolü (Yetkisiz Rol -> 403 FORBIDDEN, Yetkili -> OK) -> RBAC kontrolü: Yetkisiz kullanıcı -> 403 FORBIDDEN, Yetkili kullanıcı -> 200 OK
  ✅ [F2-08] Sahte Veri Seed'i YOK Kontrolü (Sadece Varsayılan Üretim Parametreleri Mevcut) -> 0 sahte seed kaydı doğrulandı; yalnızca sistem çalışması için gereken varsayılan UretimParameters aktif

--- BÖLÜM 4: 5 ANA VERİ ALANI TAM CRUD, ARAMA, FİLTRE VE SAYFALAMA ---
  ✅ [F2-09] Çalışma Takvimi ve Vardiyalar CRUD, Gece Vardiyası ve Tatil Günleri -> Takvim, 2 Vardiya ve 1 Tatil Günü oluşturuldu; silme kısıtı (409) doğrulandı
  ✅ [F2-10] İş Merkezi / İstasyon CRUD, Kod Tekilliği (409 CONFLICT), Sayfalama ve Takvim İstisnası -> 2 İş Merkezi oluşturuldu, mükerrer kod (409) engellendi, sayfalama (1/2) ve filtreleme doğrulandı
  ✅ [F2-11] Makine / Ekipman (Varlık) CRUD, Seri No Tekilliği, Sayaç Güncelleme ve Garanti Durumu -> Makine (MAK-DMG-01) oluşturuldu, seri no tekilliği (409), garanti durumu ve sayaç (+12.5 saat/+340 adet) doğrulandı
  ✅ [F2-12] Üretim Parametreleri Güncelleme (Ufuk, Parti Büyüklüğü, Emniyet Stoku, Statü Akışı) -> Üretim Parametreleri güncellendi (Ufuk: 120 gün, Kova: DAILY, Lot: FOQ)

--- BÖLÜM 5: STOK KARTI 1-1 ÜRETİM PROFİLİ VE BAYRAK KAPALI/AÇIK DAVRANIŞI ---
  ✅ [F2-13] Mevcut InventoryItem Kolonlarına Dokunmadan 1-1 UretimItemProfile Kaydı ve İzolasyonu -> Stok kartı (Yumuşatıcı 5L) kolonları %100 korundu; bayrak açık/kapalı /api/inventory davranışı doğrulandı
  ✅ [F2-14] HTTP API Route (/api/production/master-data) ve Denetim Logu (AuditLog) Entegrasyon Testi -> GET/POST /api/production/master-data uçtan uca çalıştı ve AuditLog kaydı doğrulandı
  ✅ [F2-15] Oluşturulan Tüm Test Kayıtlarının Silinmesi (Delete CRUD) ve Temizlik -> Tüm test kayıtları (Makine, İstisna, İş Merkezi, Tatil, Vardiya, Takvim) CRUD delete ile temizlendi
  ✅ [F2-16] Veritabanı Bütünlüğü (SHA-256) ve Özellik Bayraklarının Varsayılan (OFF) Kalması -> .local-db.json SHA-256 birebir korundu (281fb2fcbda1ba48...) ve tüm bayraklar OFF

======================================================================
 TOPLAM SONUÇ: 16/16 TEST BAŞARILI
======================================================================
```

---

## 4. Kabul Kriterleri Doğrulama Tablosu

| No | Kabul Kriteri | Durum | Kanıt |
|---|---|:---:|---|
| 1 | İş Merkezi / İstasyon: kod, ad, tip, maliyet, kapasite, verim, vardiya/takvim bağlantısı | ✅ | F2-03, F2-10, `UretimWorkCenter` CRUD |
| 2 | Makine / Ekipman: kod, seri no, marka, model, garanti, sayaç (saat/adet) | ✅ | F2-11, `UretimMachineAsset` CRUD & Sayaç Delta |
| 3 | Çalışma Takvimi & Vardiyalar: haftalık çalışma günleri, mola, net çalışma süresi, resmi tatil ve istisnalar | ✅ | F2-02, F2-04, F2-09 |
| 4 | Stok Kartı ile 1-1 İlişki: Mevcut stok kartı bozulmadan üretim tipi, lead time, emniyet stoku, parti büyüklüğü kuralı, fire toleransı | ✅ | F2-13, `UretimItemProfile` & SHA-256 kontrolü |
| 5 | Üretim Parametreleri: Planlama ufku, kova, varsayılan kurallar, onay zorunlulukları, statü akışı | ✅ | F2-08, F2-12, `UretimParameters` CRUD |
| 6 | Arama, filtreleme, sayfalama ve N+1 sorgu optimizasyonu | ✅ | F2-10, F2-14, ServerDb tekil map ilişkileri |
| 7 | Sunucu tarafı doğrulama (Validation) ve anlamlı hata mesajları | ✅ | F2-05, Zod doğrulayıcıları |
| 8 | RBAC yetki kontrolü ve AuditLog (Denetim Logu) kaydı | ✅ | F2-07, F2-14, AuditLog `resourceId` doğrulaması |
| 9 | Özellik bayrağı kapalıyken 403 FEATURE_DISABLED ve stok kartında uretimProfile gizlenmesi | ✅ | F2-06, F2-13, F2-16 |
| 10 | Geri Alınabilir (Rollback) Migration ve Sıfır Şema Bozulması | ✅ | F2-01, `rollback.sql`, SHA-256: `281fb2fcbda1ba48...` |

---

## 5. Rollback (Geri Dönüş) Adımları

Olası bir geri alma durumunda:
1. `prisma/migrations/20261110183500_uretim_ana_veriler/rollback.sql` betiğini çalıştırın:
   ```bash
   # PostgreSQL / SQL CLI:
   psql -U $DB_USER -d $DB_NAME -f prisma/migrations/20261110183500_uretim_ana_veriler/rollback.sql
   ```
2. Git dalını geri alın:
   ```bash
   git checkout main
   git branch -D feature/uretim-ana-veriler
   ```
3. Veritabanı ve sistem konfigürasyonu tamamen ilk durumuna döner, hiçbir mevcut modül etkilenmez.

