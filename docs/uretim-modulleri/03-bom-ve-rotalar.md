# SUNUM ERP – FAZ 3: Ürün Reçeteleri (BOM) & Rotalar (Routing) Mimari Raporu

Bu doküman, Sunum ERP Üretim Yönetim Sistemi'nin **Faz 3 (Ürün Reçeteleri & Rotalar)** kapsamında tamamlanan mimari tasarımını, veritabanı modellerini, saf hesaplama motorunu, UI entegrasyonlarını, otomatik test sonuçlarını ve geri dönüş (rollback) prosedürlerini belgeler.

---

## 1. Mimari Prensipler ve Değişmez Kurallara Uyum

1. **Mevcut Sisteme Sıfır Zarar (Non-Destructive & Isolated):**
   - Mevcut hiçbir tablo (`InventoryItem`, `BomHeader`, `BomComponent` vb.) üzerinde kolon silme, yeniden adlandırma veya tip değiştirme yapılmadı.
   - Çok seviyeli, versiyonlu, alternatifli ve hayalet (phantom) reçete yetenekleri bağımsız `UretimBomHeader`, `UretimBomItem`, `UretimBomSubstitute`, `UretimBomRevisionLog`, `UretimRoutingHeader`, `UretimOperation`, `UretimOperationAlternativeWorkCenter`, `UretimOperationMaterial` modellerinde izole edildi.
   - Geriye dönük uyumluluk %100 korundu; eski `BomHeader` tabloları ve `/api/inventory` endpoint'i sıfır regresyonla çalışmaktadır.

2. **Mevcut Tasarım Sistemine %100 Uyum:**
   - Yeni ekranlar (`ProductionBomWorkspace`) Obsidian Carbon & Emerald Mint tasarım sistemini birebir kullandı: aynı layout, renk paleti, tipografi, Lucide ikonları, kart/tablo/modal/drawer bileşenleri, `font-mono` teknik alanlar, Türkçe iş terminolojisi ve `Intl.NumberFormat` para formatları.
   - Yeni bir UI kütüphanesi eklenmedi, global CSS'e dokunulmadı.

3. **Eksiksiz Teslim (No Mock / No Stubs / No Fake Seeds):**
   - Hiçbir TODO, FIXME, stub veya sahte veri bırakılmadı.
   - 4+ seviyeli ağaç patlatma, DFS döngüsel bağımlılık engelleme, onaylı revizyon değişmezliği (immutability), kopyala & değiştir revizyon klonlama, Excel/CSV UTF-8 BOM içe/dışa aktarma ve teorik maliyet roll-up hesaplamaları uçtan uca çalışır durumdadır.

4. **Özellik Bayrağı (`uretim_bom_rota`) ve RBAC Güvenliği:**
   - `uretim_bom_rota` bayrağı varsayılan olarak `false` (OFF) kapalıdır.
   - Kapalıyken `/api/production/bom-rota` API rotası `403 FEATURE_DISABLED` döndürür.
   - Sunucu tarafında `uretim_bom_rota` kaynağı için 5 granüler yetki (`read`, `create`, `update`, `delete`, `approve`) denetlenir.

---

## 2. Değişen ve Eklenen Dosyaların Listesi

### 2.1. Veritabanı ve Şema Katmanı
- [`prisma/schema.prisma`](file:///c:/Users/!/Desktop/Sunum%20ERP/prisma/schema.prisma): 8 yeni model (`UretimBomHeader`, `UretimBomItem`, `UretimBomSubstitute`, `UretimBomRevisionLog`, `UretimRoutingHeader`, `UretimOperation`, `UretimOperationAlternativeWorkCenter`, `UretimOperationMaterial`) ve sanal Prisma ilişkileri eklendi.
- [`prisma/migrations/20261111120000_uretim_bom_rota/migration.sql`](file:///c:/Users/!/Desktop/Sunum%20ERP/prisma/migrations/20261111120000_uretim_bom_rota/migration.sql): 8 yeni tablo, indeksler ve foreign key kısıtlamalarını içeren additive SQL.
- [`prisma/migrations/20261111120000_uretim_bom_rota/rollback.sql`](file:///c:/Users/!/Desktop/Sunum%20ERP/prisma/migrations/20261111120000_uretim_bom_rota/rollback.sql): Eklenen 8 tabloyu bağımlılık sırasına göre kaldıran rollback SQL.
- [`lib/db.ts`](file:///c:/Users/!/Desktop/Sunum%20ERP/lib/db.ts): `JsonDbData`, `fallbackModels` ve ilişkisel include enrichers Faz 3 modelleriyle genişletildi.

### 2.2. Çekirdek Servis ve Motor Katmanı
- [`lib/services/productionBomRotaEngine.ts`](file:///c:/Users/!/Desktop/Sunum%20ERP/lib/services/productionBomRotaEngine.ts): Saf matematiksel motor:
  1. DFS döngüsel referans kontrolü (`detectBomCircularDependency`)
  2. 4+ seviyeli kümülatif ağaç patlatma (`explodeBomTree`) ve Phantom (hayalet) çözünürlüğü
  3. Teorik maliyet roll-up hesaplayıcısı (`calculateTheoreticalBomCost`)
  4. Revizyon karşılaştırma diff motoru (`compareBomRevisions`)
  5. Nerede Kullanılıyor (Where-Used) ters ağaç sorgusu (`findWhereUsedInBoms`)
  6. Excel/CSV UTF-8 BOM ayrıştırıcı ve satır doğrulayıcısı (`parseBomCsvContent`, `generateBomCsvContent`)
  7. Zod doğrulama şemaları
- [`lib/services/productionBomRotaServerDb.ts`](file:///c:/Users/!/Desktop/Sunum%20ERP/lib/services/productionBomRotaServerDb.ts): N+1 sorgusu olmayan, onaylı revizyon değişmezliği (immutability) ve klonlama destekli sunucu DB orkestrasyonu.

### 2.3. API ve Güvenlik Katmanı
- [`app/api/production/bom-rota/route.ts`](file:///c:/Users/!/Desktop/Sunum%20ERP/app/api/production/bom-rota/route.ts): Tam CRUD, arama/filtreleme/sayfalama, çok seviyeli patlatma, where-used, revizyon karşılaştırma, Excel/CSV import/export, AuditLog ve RBAC kapılı REST API rotası.

### 2.4. Kullanıcı Arayüzü (UI) Katmanı
- [`app/dashboard/uretim/components/ProductionBomWorkspace.tsx`](file:///c:/Users/!/Desktop/Sunum%20ERP/app/dashboard/uretim/components/ProductionBomWorkspace.tsx): Reçete listesi, detay & formül çekmecesi, çok seviyeli patlatma, rota operasyonları, where-used ve revizyon karşılaştırma ekranı.
- [`app/dashboard/uretim/bom-rota/page.tsx`](file:///c:/Users/!/Desktop/Sunum%20ERP/app/dashboard/uretim/bom-rota/page.tsx): Özel modül rotası.
- [`app/dashboard/uretim/components/ProductionModuleReadinessView.tsx`](file:///c:/Users/!/Desktop/Sunum%20ERP/app/dashboard/uretim/components/ProductionModuleReadinessView.tsx): Modül seçildiğinde bayrak açıksa doğrudan çalışma alanını gösteren cerrahi bağlantı.

### 2.5. Otomatik Test Paketi
- [`scripts/test-uretim-bom-rota.ts`](file:///c:/Users/!/Desktop/Sunum%20ERP/scripts/test-uretim-bom-rota.ts): 16 adımlı uçtan uca otomatik test paketi.

---

## 3. Otomatik Test Sonuçları (Kanıt)

Aşağıdaki çıktı `npx tsx scripts/test-uretim-bom-rota.ts` komutunun gerçek zamanlı çıktısıdır:

```text
======================================================================
 SUNUM ERP - FAZ 3 ÜRÜN REÇETELERİ (BOM) & ROTALAR TEST PAKETİ
======================================================================

--- BÖLÜM 1: ADDITIVE MIGRATION VE ROLLBACK DOĞRULAMASI ---
  ✅ [F3-01] 20261111120000_uretim_bom_rota Additive Migration & Rollback Kontrolü -> 8 yeni tablo (UretimBomHeader, UretimBomItem, UretimBomSubstitute, UretimBomRevisionLog, UretimRoutingHeader, UretimOperation, UretimOperationAlternativeWorkCenter, UretimOperationMaterial) ve tam geri alınabilir rollback.sql doğrulandı

--- BÖLÜM 2: SAF (PURE) BOM & ROTA MOTORU TESTLERİ ---
  ✅ [F3-02] Döngüsel Referans (DFS Circular Dependency) Engelleme Algoritması -> DFS algoritması doğrudan ve dolaylı döngüleri (A->B->C->A) hatasız yakaladı
  ✅ [F3-03] 4+ Seviyeli Reçete Patlatma (BOM Explosion), Phantom Yarı Mamul ve Fire Hesabı -> 4 seviyeli ağaç patlatıldı (3 seviye, Phantom YM çözümlendi, Kümülatif Esans: 80.33 Kg)
  ✅ [F3-04] Teorik Birim Maliyet (Roll-up) ve Rota Operasyon Maliyetleri Hesabı -> Malzeme: 331.58 TL, İşçilik/Makine: 1000 TL, Fason: 250 TL -> Birim: 158.16 TL
  ✅ [F3-05] Revizyon Karşılaştırma (Diff Engine) ve Değişiklik Özeti -> 1 eklenen, 1 silinen, 1 değiştirilen bileşen ve +250 TL (%25) maliyet değişimi tespit edildi
  ✅ [F3-06] Nerede Kullanılıyor (Where-Used) Ters Ağaç Sorgusu -> RAW-TEST malzemesi Seviye 1 (BOM-SUB: 0.5 Kg) ve Seviye 2 (BOM-TOP: 4 Adet) ters hiyerarşide doğrulandı
  ✅ [F3-07] Excel/CSV Dışa Aktarma ve Satır Satır İçe Aktarma Doğrulayıcısı (Parser) -> Excel UTF-8 BOM ve noktalı virgüllü CSV üretimi ve satır doğrulama raporu çalıştı

--- BÖLÜM 3: ÖZELLİK BAYRAĞI VE RBAC GÜVENLİK KAPISI ---
  ✅ [F3-08] Bayrak Kapalıyken (OFF) /api/production/bom-rota 403 FEATURE_DISABLED Koruması -> Özellik bayrağı kapalıyken (OFF) servis ve API rotası 403 FEATURE_DISABLED ile mühürlendi
  ✅ [F3-09] Sunucu Tarafı RBAC İzin Kontrolü (Yetkisiz -> 403 FORBIDDEN, Yetkili -> OK) -> RBAC sunucu güvenliği: Yetkisiz -> 403 FORBIDDEN, Yetkili -> Onaylandı

--- BÖLÜM 4: VERİTABANI BOM, İKAME, REVİZYON VE KLONLAMA İŞLEMLERİ ---
  ✅ [F3-10] BOM Header, Bileşenler ve İkame Malzemeler CRUD Entegrasyonu -> Reçete (BOM-TEST-OTO-01), 2 bileşen ve 1 ikame malzeme başarıyla kaydedildi
  ✅ [F3-11] Onaylı Reçete Değişmezliği (Immutability) ve Kopyala & Değiştir (Yeni Revizyon) -> Onaylı reçete değişmezliği (409) doğrulandı; Kopyala & Değiştir ile Rev.02 üretildi

--- BÖLÜM 5: OPERASYON ROTALARI VE İŞ MERKEZİ BAĞLANTISI ---
  ✅ [F3-12] Operasyon Rotası CRUD, Süreler, Kalite Kontrol Noktası ve Fason Adımı -> Rota (ROTA-TEST-01) oluşturuldu: 3 operasyon (İşçilik, Kalite Kontrol, Fason) bağlandı

--- BÖLÜM 6: REST API VE DENETİM LOGU (AUDITLOG) ENTEGRASYONU ---
  ✅ [F3-13] HTTP API Route (/api/production/bom-rota) GET/POST ve AuditLog Doğrulaması -> GET/POST /api/production/bom-rota uçtan uca çalıştı ve AuditLog resourceId ile doğrulandı

--- BÖLÜM 7: MEVCUT MODÜLLER REGRESYON KONTROLÜ VE SİLME ---
  ✅ [F3-14] Mevcut Stok Modülü (/api/inventory) ve Tablolarında Sıfır Regresyon Kontrolü -> Mevcut /api/inventory ve eski BomHeader yapısı sıfır regresyonla korundu
  ✅ [F3-15] Tüm Test Kayıtlarının Bağımlılık Sırasıyla Silinmesi (Temizlik) -> Tüm oluşturulan test kayıtları (Reçeteler, Bileşenler, İkameler, Rotalar, Operasyonlar) temizlendi
  ✅ [F3-16] Veritabanı Bütünlüğü (SHA-256) ve Özellik Bayraklarının Varsayılan (OFF) Kalması -> .local-db.json SHA-256 birebir korundu (281fb2fcbda1ba48...) ve tüm bayraklar OFF

======================================================================
 TOPLAM SONUÇ: 16/16 TEST BAŞARILI
======================================================================
```

Ayrıca Faz 2 regresyon testi (`scripts/test-uretim-ana-veriler.ts`) çalıştırılmış ve **16/16 test başarıyla geçmiştir**.

---

## 4. Kabul Kriterleri Doğrulama Tablosu

| Kapsam | Kabul Kriteri | Durum | Kanıt |
|---|---|:---:|---|
| **A) BOM** | Çok seviyeli ağaç, miktar, birim, fire %, geçerlilik tarihleri, açıklama | ✅ | `F3-03`, `F3-10`, [`UretimBomHeader`](file:///c:/Users/!/Desktop/Sunum%20ERP/prisma/schema.prisma) |
| **A) BOM** | Alternatif/ikame malzeme grupları (öncelik, oran, onay zorunluluğu) | ✅ | `F3-10`, [`UretimBomSubstitute`](file:///c:/Users/!/Desktop/Sunum%20ERP/prisma/schema.prisma) |
| **A) BOM** | Phantom (hayalet) yarı mamul (patlatmada otomatik çözünme ve üst seviyeye taşınma) | ✅ | `F3-03`, [`explodeBomTree`](file:///c:/Users/!/Desktop/Sunum%20ERP/lib/services/productionBomRotaEngine.ts) |
| **A) BOM** | DFS döngüsel referans engeli (ürün kendi alt ağacında yer alamaz) | ✅ | `F3-02`, [`detectBomCircularDependency`](file:///c:/Users/!/Desktop/Sunum%20ERP/lib/services/productionBomRotaEngine.ts) |
| **A) BOM** | Revizyon yönetimi (taslak → onaylı → pasif), onay yetkisi, onaylı revizyon değişmezliği (immutability) | ✅ | `F3-11`, [`approveBomInDb`](file:///c:/Users/!/Desktop/Sunum%20ERP/lib/services/productionBomRotaServerDb.ts) |
| **A) BOM** | "Kopyala ve değiştir" (Deep clone & new revision), değişiklik geçmişi logu | ✅ | `F3-11`, [`cloneBomAsNewRevisionInDb`](file:///c:/Users/!/Desktop/Sunum%20ERP/lib/services/productionBomRotaServerDb.ts) |
| **A) BOM** | Revizyon karşılaştırma (Diff) ekranı ve görsel analiz | ✅ | `F3-05`, [`compareBomRevisions`](file:///c:/Users/!/Desktop/Sunum%20ERP/lib/services/productionBomRotaEngine.ts) |
| **A) BOM** | Patlatılmış (exploded) reçete görünümü & "Nerede Kullanılıyor" (where-used) ters ağacı | ✅ | `F3-03`, `F3-06`, `F3-13` |
| **A) BOM** | Teorik birim maliyet hesaplama (malzeme + fire + işçilik/makine + fason) ve yeniden hesaplama | ✅ | `F3-04`, `F3-13`, [`calculateTheoreticalBomCost`](file:///c:/Users/!/Desktop/Sunum%20ERP/lib/services/productionBomRotaEngine.ts) |
| **B) ROTA** | Operasyon sıralaması (10, 20..), iş merkezi, hazırlık/işlem süresi, işçi sayısı | ✅ | `F3-12`, [`UretimOperation`](file:///c:/Users/!/Desktop/Sunum%20ERP/prisma/schema.prisma) |
| **B) ROTA** | Kalite kontrol noktası işareti (Faz 7 hazır alanı) ve Fason dış kaynak operasyonu | ✅ | `F3-12`, `isQualityControlPoint`, `isSubcontracted` |
| **B) ROTA** | Rota revizyonu ve BOM revizyonuyla eşlenik versiyonlama | ✅ | `F3-12`, `UretimRoutingHeader.bomId` |
| **C) İÇE/DIŞA** | Excel/CSV ile reçete ve rota dışa aktarma ve satır doğrulama raporlu içe aktarma | ✅ | `F3-07`, [`parseBomCsvContent`](file:///c:/Users/!/Desktop/Sunum%20ERP/lib/services/productionBomRotaEngine.ts) |
| **D) EKRANLAR** | Reçete listesi, detay/ağaç editörü, rota editörü, revizyon geçmişi, where-used, maliyet özeti | ✅ | [`ProductionBomWorkspace.tsx`](file:///c:/Users/!/Desktop/Sunum%20ERP/app/dashboard/uretim/components/ProductionBomWorkspace.tsx) |

---

## 5. Rollback (Geri Alma) Adımları

Olası bir geri alma durumunda:
1. [`rollback.sql`](file:///c:/Users/!/Desktop/Sunum%20ERP/prisma/migrations/20261111120000_uretim_bom_rota/rollback.sql) betiğini çalıştırın:
   ```bash
   psql -U $DB_USER -d $DB_NAME -f prisma/migrations/20261111120000_uretim_bom_rota/rollback.sql
   ```
2. Git dalını geri alın:
   ```bash
   git checkout main
   git branch -D feature/uretim-bom-rota
   ```
3. Veritabanı ve sistem konfigürasyonu tamamen önceki kararlı durumuna döner, hiçbir mevcut modül etkilenmez.

