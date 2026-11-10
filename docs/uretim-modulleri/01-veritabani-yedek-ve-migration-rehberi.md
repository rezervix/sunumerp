# Sunum ERP — Veritabanı Yedekleme, Geri Dönüş (Restore) ve Üretim Migration Rehberi

> **Belge Kodu:** `01-veritabani-yedek-ve-migration-rehberi.md`  
> **İlgili Servisler:** [`lib/services/databaseBackupService.ts`](file:///c:/Users/!/Desktop/Sunum%20ERP/lib/services/databaseBackupService.ts), [`lib/services/migrationStrategyService.ts`](file:///c:/Users/!/Desktop/Sunum%20ERP/lib/services/migrationStrategyService.ts), [`scripts/db-backup-restore.ts`](file:///c:/Users/!/Desktop/Sunum%20ERP/scripts/db-backup-restore.ts)

---

## 1. Veritabanı Yedekleme ve Geri Dönüş (Backup & Restore) Prosedürü

### 1.1. Yedekleme Kapsamı
Sunum ERP'nin hibrit veritabanı mimarisine (`PostgreSQL` + `DEVRESILIENCE` yerel JSON veritabanı) uygun olarak her yedekleme işlemi `storage/backups/bkp-<YYYYMMDD-HHmmss>-<nonce>-<etiket>/` dizini altında aşağıdaki dosyaları üretir:
1. **`local-db.backup.json`**: `storage/ajans-kutuphanesi/.local-db.json` dosyasının birebir kopyası.
2. **`system_config.backup.json`**: `storage/system_config.json` dosyasının birebir kopyası.
3. **`manifest.json`**: Yedek kimliği, oluşturulma zamanı, ortam bilgisi, her dosyanın boyutu, **SHA-256** özet değeri (`sha256`), tablo bazlı kayıt sayıları (`collectionCounts`) ve toplam kayıt sayısı (`totalRecords`).

### 1.2. Komut Satırı (CLI) Kullanımı

| İşlem | Komut | Açıklama |
| :--- | :--- | :--- |
| **Manuel Yedek Alma** | `npx tsx scripts/db-backup-restore.ts backup faz1-oncesi` | Etiketli tam yedek alır ve SHA-256 manifest oluşturur. |
| **Yedekleri Listeleme** | `npx tsx scripts/db-backup-restore.ts list` | `storage/backups/` altındaki tüm yedekleri yeniden eskiye listeler. |
| **Yedek Doğrulama** | `npx tsx scripts/db-backup-restore.ts verify <backupId>` | Yedek dosyalarının SHA-256 bütünlüğünü ve JSON geçerliliğini denetler. |
| **Geri Yükleme (Restore)** | `npx tsx scripts/db-backup-restore.ts restore <backupId>` | Önce mevcut durumun `pre-restore-safety` yedeğini alır, ardından hedef yedeği atomik olarak geri yükler. |
| **Otomatik Tatbikat (Drill)** | `npx tsx scripts/db-backup-restore.ts drill` | Yedek al → Geçici veri ekle → Geri yükle → SHA-256 birebir eşleşmesini doğrula → Geçici yedeği temizle adımlarını çalıştırır. |

---

## 2. Üretim Modülleri Migration Stratejisi

### 2.1. Tablo ve Model İsimlendirme Standardı (`Uretim` Öneki)
Mevcut `prisma/schema.prisma` şemasında modül bazlı PascalCase önek standardı (`WmsWave`, `WmsDirective`, `AiKnowledgeChunk`, `ContentStore`) kullanılmaktadır. Ayrıca `ProductionShoot` tablosu Sosyal Medya Çekim Takvimi için kullanıldığından, **tüm yeni üretim/imalat tablolarında `Uretim` öneki zorunludur**:

| Faz / Modül | Prisma Model Adı & PostgreSQL Tablo Adı | `lib/db.ts` (`DEVRESILIENCE`) Koleksiyon Anahtarı |
| :--- | :--- | :--- |
| **Faz 1: BOM & Rota** | `UretimWorkCenter`, `UretimRouting`, `UretimRoutingOperation` *(Mevcut `BomHeader` ve `BomComponent` korunur)* | `uretimWorkCenter`, `uretimRouting`, `uretimRoutingOperation` |
| **Faz 2: MRP & MPS** | `UretimMpsPlan`, `UretimMrpRun`, `UretimMrpProposal` | `uretimMpsPlan`, `uretimMrpRun`, `uretimMrpProposal` |
| **Faz 3: İş Emirleri** | `UretimWorkOrder`, `UretimWorkOrderMaterial`, `UretimWorkOrderOperation` | `uretimWorkOrder`, `uretimWorkOrderMaterial`, `uretimWorkOrderOperation` |
| **Faz 4: Kapasite** | `UretimCapacityShift`, `UretimCapacityLoad` | `uretimCapacityShift`, `uretimCapacityLoad` |
| **Faz 5: Kalite** | `UretimQualityPlan`, `UretimQualityInspection`, `UretimScrapRecord` | `uretimQualityPlan`, `uretimQualityInspection`, `uretimScrapRecord` |
| **Faz 6: Bakım** | `UretimMaintenancePlan`, `UretimMaintenanceWorkOrder` | `uretimMaintenancePlan`, `uretimMaintenanceWorkOrder` |

### 2.2. Değişmez Migration Kuralları (Additive-Only & Rollback)
1. **Sadece Ekleme (Additive-Only):**
   - `migration.sql` (UP) dosyalarında `DROP TABLE`, `DROP COLUMN`, `RENAME COLUMN`, `ALTER COLUMN ... TYPE`, `TRUNCATE`, `DELETE FROM` ifadeleri **kesinlikle yasaktır**.
   - Tüm tablo oluşturma ifadeleri `CREATE TABLE IF NOT EXISTS "Uretim..."` kalıbında, kolon ekleme ifadeleri `ALTER TABLE "..." ADD COLUMN IF NOT EXISTS` kalıbında yazılır.
2. **Zorunlu Rollback (`rollback.sql`):**
   - Her `prisma/migrations/<YYYYMMDDHHMMSS>_uretim_<faz>/` klasöründe `migration.sql` ile birlikte `rollback.sql` dosyası bulunmak zorundadır.
   - `rollback.sql` dosyası yalnızca ilgili fazda eklenen `Uretim*` tablolarını (`DROP TABLE IF EXISTS "Uretim..." CASCADE;`) ve eklenen opsiyonel kolonları (`ALTER TABLE "..." DROP COLUMN IF EXISTS "...";`) geri alır.
3. **Otomatik Denetim:**
   - [`validateAdditiveMigrationSql`](file:///c:/Users/!/Desktop/Sunum%20ERP/lib/services/migrationStrategyService.ts) fonksiyonu her fazın test setinde çalıştırılarak SQL dosyalarının kurallara uygunluğu otomatik olarak doğrulanır.
