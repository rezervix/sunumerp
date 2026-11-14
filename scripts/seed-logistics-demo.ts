/**
 * Sunum ERP — Lojistik Demo Verisi Ekleme ve Geri Alma CLI Aracı
 *
 * NOT: Mevcut scripts/seed-demo-database.js dosyasına DOKUNMAZ; yalnızca lojistik
 * modülünün eklemeli (additive) ve geri alınabilir demo verisini yönetir.
 *
 * Kullanım:
 *   npx tsx scripts/seed-logistics-demo.ts seed
 *   npx tsx scripts/seed-logistics-demo.ts rollback
 */

process.env.SUNUM_DISABLE_CRON = "1"

import {
  rollbackAllLogisticsDemoSeeds,
  runAllLogisticsDemoSeeds,
} from "../lib/logistics/seed"

async function main() {
  const [, , command = "seed"] = process.argv

  if (command === "seed") {
    const report = await runAllLogisticsDemoSeeds({
      createBackup: true,
      backupLabel: "cli-logistics-seed",
    })
    console.log("✅ Lojistik demo seed işlemi başarıyla tamamlandı.")
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
    const res = rollbackAllLogisticsDemoSeeds({ createSafetyBackup: true })
    console.log("↩️  Lojistik demo seed kayıtları geri alındı.")
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
  console.error("❌ Lojistik seed hatası:", err instanceof Error ? err.message : err)
  process.exit(1)
})
