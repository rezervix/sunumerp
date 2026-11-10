/**
 * Sunum ERP — Veritabanı Yedekleme ve Geri Dönüş (Backup & Restore) CLI Aracı
 *
 * Kullanım:
 *   npx tsx scripts/db-backup-restore.ts backup [etiket]
 *   npx tsx scripts/db-backup-restore.ts list
 *   npx tsx scripts/db-backup-restore.ts verify <backupId>
 *   npx tsx scripts/db-backup-restore.ts restore <backupId>
 *   npx tsx scripts/db-backup-restore.ts drill
 */

import {
  createDatabaseBackup,
  listDatabaseBackups,
  restoreDatabaseBackup,
  runBackupRestoreDrill,
  verifyDatabaseBackup,
} from "../lib/services/databaseBackupService"

function main() {
  const [, , command = "drill", arg1] = process.argv

  switch (command) {
    case "backup": {
      const manifest = createDatabaseBackup({
        label: arg1 || "cli-manual",
        updateSystemConfigLastBackup: false,
      })
      console.log("✅ Veritabanı yedeği başarıyla oluşturuldu:")
      console.log(`   Yedek ID      : ${manifest.backupId}`)
      console.log(`   Tarih         : ${manifest.createdAt}`)
      console.log(`   Toplam Kayıt  : ${manifest.totalRecords}`)
      console.log(`   Tablo Sayısı  : ${Object.keys(manifest.collectionCounts).length}`)
      for (const f of manifest.files) {
        console.log(`   Dosya         : ${f.fileName} (${f.sizeBytes} byte | SHA-256: ${f.sha256.slice(0, 16)}...)`)
      }
      break
    }

    case "list": {
      const backups = listDatabaseBackups()
      console.log(`📦 Toplam Yedek Sayısı: ${backups.length}`)
      for (const b of backups) {
        console.log(` - ${b.backupId} | ${b.createdAt} | ${b.totalRecords} kayıt | Etiket: ${b.label}`)
      }
      break
    }

    case "verify": {
      if (!arg1) {
        console.error("❌ Lütfen doğrulanacak yedek kimliğini (backupId) belirtin.")
        process.exit(1)
      }
      const res = verifyDatabaseBackup(arg1)
      if (res.valid) {
        console.log(`✅ Yedek doğrulaması başarılı: ${res.backupId} (${res.checkedFiles} dosya, ${res.totalRecords} kayıt)`)
      } else {
        console.error(`❌ Yedek doğrulaması başarısız (${res.backupId}):`, res.errors)
        process.exit(1)
      }
      break
    }

    case "restore": {
      if (!arg1) {
        console.error("❌ Lütfen geri yüklenecek yedek kimliğini (backupId) belirtin.")
        process.exit(1)
      }
      const res = restoreDatabaseBackup(arg1, {
        createPreRestoreSafetyBackup: true,
        restoreSystemConfig: false,
      })
      console.log("✅ Veritabanı başarıyla geri yüklendi:")
      console.log(`   Geri Yüklenen Yedek : ${res.backupId}`)
      console.log(`   Güvenlik Yedeği     : ${res.safetyBackupId}`)
      console.log(`   Restorasyon Kayıt   : ${res.totalRecordsRestored}`)
      break
    }

    case "drill": {
      console.log("🧪 Geliştirme Ortamı Yedekleme & Geri Dönüş (Backup/Restore) Tatbikatı Başlatılıyor...")
      const drill = runBackupRestoreDrill()
      console.log("✅ Tatbikat Başarıyla Tamamlandı!")
      console.log(`   Koleksiyon Sayısı   : ${drill.collectionCount}`)
      console.log(`   Toplam Kayıt Sayısı : ${drill.totalRecords}`)
      console.log(`   Başlangıç SHA-256   : ${drill.initialHash}`)
      console.log(`   Mutasyon SHA-256    : ${drill.mutatedHash}`)
      console.log(`   Geri Dönüş SHA-256  : ${drill.restoredHash}`)
      console.log(`   Birebir Eşleşme     : ${drill.initialHash === drill.restoredHash ? "EVET (100%)" : "HAYIR"}`)
      break
    }

    default:
      console.error(`❌ Bilinmeyen komut: ${command}. Kullanılabilir komutlar: backup, list, verify, restore, drill`)
      process.exit(1)
  }
}

main()
