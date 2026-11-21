/**
 * Sunum ERP — Turizm Modülleri Demo Verisi Ekleme ve Geri Alma CLI Aracı
 *
 * NOT: Mevcut scripts/seed-demo-database.js dosyasına DOKUNMAZ; yalnızca turizm
 * modüllerinin eklemeli (additive) ve geri alınabilir demo verisini yönetir.
 *
 * Kullanım:
 *   npm run seed:tourism
 *   npm run seed:tourism:rollback
 */

process.env.SUNUM_DISABLE_CRON = "1"

import {
  rollbackAllTourismDemoSeeds,
  runAllTourismDemoSeeds,
} from "../lib/tourism/seed"

async function main() {
  const args = process.argv.slice(2)
  const noBackup = args.includes("--no-backup")
  const command = args.find((a) => !a.startsWith("--")) ?? "seed"

  if (command === "seed") {
    const report = await runAllTourismDemoSeeds({
      createBackup: !noBackup,
      backupLabel: "cli-tourism-seed",
    })
    console.log("✅ Turizm demo seed işlemi başarıyla tamamlandı.")
    console.log(`   Ortam               : ${report.environment}`)
    console.log(`   Alınan Yedek ID     : ${report.backupId ?? "YOK"}`)
    console.log(
      `   Mevcut Veri Bütünlüğü: ${report.preExistingIntegrityIntact ? "TAM (%100 korundu)" : "HATA"}`
    )
    for (const step of report.modulesExecuted) {
      console.log(
        `   - ${step.moduleKey}: eklendi=${JSON.stringify(step.inserted)}, atlandı=${step.skippedExisting}`
      )
    }
    return
  }

  if (command === "rollback") {
    const res = rollbackAllTourismDemoSeeds({
      createSafetyBackup: true,
      backupLabel: "cli-tourism-rollback",
    })
    console.log("↩️  Turizm demo seed kayıtları geri alındı.")
    console.log(`   Güvenlik Yedeği     : ${res.backupId ?? "YOK"}`)
    console.log(`   Kaldırılan Kayıtlar : ${JSON.stringify(res.removedByCollection)}`)
    console.log(
      `   Mevcut Veri Bütünlüğü: ${res.preExistingIntegrityIntact ? "TAM (%100 korundu)" : "HATA"}`
    )
    return
  }

  console.error(`❌ Bilinmeyen komut: ${command}. Kullanım: seed | rollback`)
  process.exit(1)
}

main().catch((err) => {
  console.error("❌ Turizm seed hatası:", err instanceof Error ? err.message : err)
  process.exit(1)
})
