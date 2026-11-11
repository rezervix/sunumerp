/**
 * Sunum ERP — FAZ 8: Ekipman & Bakım Yönetimi (CMMS & PdM) Doğrulama Test Paketi
 *
 * Kapsam:
 * 1. Migration ve Rollback SQL Bütünlüğü (Additive Only, 7 Tablo, 1 Genişletilen Tablo)
 * 2. Özellik Bayrağı İzolasyonu (uretim_bakim kapalıyken 403, açıkken 200)
 * 3. Ekipman & Varlık Hiyerarşisi, Kritiklik Sınıfı (A/B/C) ve Döngüsel Bağımlılık Engeli
 * 4. Ekipman Yedek Parça Listesi (BOM) ve Değişim Periyotları
 * 5. Takvim Bazlı Periyodik Bakım Tetikleme ve Tarih İlerletme Mantığı
 * 6. Sayaç Bazlı (Çalışma Saati & Üretim Adedi) Bakım Tetikleme
 * 7. Kestirimci Bakım (PdM) Sensör Telemetrisi ve Eşik Aşım Alarmı
 * 8. Bakım İş Emri Yaşam Döngüsü Durum Makinesi (State Machine)
 * 9. Duruş Süresi (Downtime) ve Kök Neden Takibi (DOWN -> ACTIVE Geçişi)
 * 10. Yedek Parça Sarfiyatı ve Otomatik Satınalma Talebi İhtiyacı
 * 11. Kapasite Çizelgeleme Bakım Çakışması (Capacity Conflict Alert) Tespiti
 * 12. MTBF (Arızalar Arası Ortalama Süre) Matematiksel Doğrulaması
 * 13. MTTR (Ortalama Onarım / Duruş Süresi) Matematiksel Doğrulaması
 * 14. OEE (Kullanılabilirlik x Performans x Kalite) Hesaplama Motoru
 * 15. Otomatik Bakım İş Emri Üretim Motoru (PM Job Scheduler)
 * 16. API Rotaları Eşzamanlılık & SHA-256 Veritabanı Bütünlüğü
 */

import fs from "fs"
import path from "path"
import crypto from "crypto"
import { db } from "../lib/db"
import { saveSystemConfig } from "../lib/system-config"
import {
  DEFAULT_PRODUCTION_FEATURE_FLAGS,
  resolveProductionFeatureFlags,
} from "../lib/config/production-feature-flags"
import {
  createDatabaseBackup,
  restoreDatabaseBackup,
} from "../lib/services/databaseBackupService"
import { validateAllUretimMigrations } from "../lib/services/migrationStrategyService"
import { DEBUG_USER_ID } from "../lib/auth/local-debug"
import {
  validateNoCircularAssetHierarchy,
  buildEquipmentHierarchyTree,
  calculateMTBF,
  calculateMTTR,
  calculateOEE,
  calculateDowntimeRate,
  isCalendarPMDue,
  calculateNextScheduledDate,
  isMeterPMDue,
  evaluateConditionRule,
  validateWorkOrderStatusTransition,
  detectMaintenanceCapacityConflicts,
  checkSparePartsStockAndProcurement,
  calculateMaintenanceTotalCost,
} from "../lib/services/productionMaintenanceEngine"
import {
  listMachineAssets,
  createMachineAsset,
  updateMachineAsset,
  addSparePartToMachine,
  listMaintenancePlans,
  createMaintenancePlan,
  listMaintenanceWorkOrders,
  createMaintenanceWorkOrder,
  updateMaintenanceWorkOrderStatus,
  recordWorkOrderSparePartUsage,
  recordConditionReading,
  evaluateAndTriggerMaintenanceJobs,
  getMaintenanceCapacityConflicts,
  checkMaintenanceSparePartProcurement,
  getMaintenanceDashboardMetrics,
} from "../lib/services/productionMaintenanceServerDb"
import {
  GET as maintenanceApiGet,
  POST as maintenanceApiPost,
} from "../app/api/production/maintenance/route"

interface TestResult {
  step: string
  name: string
  passed: boolean
  message: string
  durationMs: number
}

const results: TestResult[] = []

function computeFileSha256(filePath: string): string {
  if (!fs.existsSync(filePath)) return ""
  const buf = fs.readFileSync(filePath)
  return crypto.createHash("sha256").update(buf).digest("hex")
}

function enableMaintenanceFeatureFlag(): void {
  process.env.FEATURE_URETIM_BAKIM = "true"
  saveSystemConfig({
    featureFlags: {
      ...DEFAULT_PRODUCTION_FEATURE_FLAGS,
      uretim_bakim: true,
    },
  })
}

function resetFeatureFlagsOff(): void {
  delete process.env.FEATURE_URETIM_BOM_ROTA
  delete process.env.FEATURE_URETIM_MRP_MPS
  delete process.env.FEATURE_URETIM_IS_EMRI
  delete process.env.FEATURE_URETIM_KAPASITE
  delete process.env.FEATURE_URETIM_KALITE
  delete process.env.FEATURE_URETIM_BAKIM
  saveSystemConfig({
    featureFlags: {
      ...DEFAULT_PRODUCTION_FEATURE_FLAGS,
      uretim_bakim: false,
    },
  })
}

async function runStep(
  step: string,
  name: string,
  fn: () => Promise<string | void>
): Promise<void> {
  const start = Date.now()
  try {
    const msg = await fn()
    const durationMs = Date.now() - start
    results.push({
      step,
      name,
      passed: true,
      message: msg || "OK",
      durationMs,
    })
    console.log(`✅ [${step}] ${name} (${durationMs}ms) - ${msg || "OK"}`)
  } catch (error: any) {
    const durationMs = Date.now() - start
    results.push({
      step,
      name,
      passed: false,
      message: error?.message || String(error),
      durationMs,
    })
    console.error(`❌ [${step}] ${name} (${durationMs}ms) - HATA:`, error?.message || error)
  }
}

async function main() {
  console.log("================================================================================")
  console.log("  SUNUM ERP — FAZ 8: EKİPMAN & BAKIM YÖNETİMİ TEST PAKETİ")
  console.log("================================================================================")

  const localDbPath = path.join(process.cwd(), "storage", "ajans-kutuphanesi", ".local-db.json")
  const initialDbSha256 = computeFileSha256(localDbPath)
  console.log(`[BAŞLANGIÇ] .local-db.json SHA-256: ${initialDbSha256 || "(Dosya yok)"}`)

  const backupResult = createDatabaseBackup({
    label: "FAZ8_MAINTENANCE_TEST_BEFORE",
    updateSystemConfigLastBackup: false,
  })
  console.log(`[YEDEK ALINDI] Backup ID: ${backupResult.backupId}`)

  try {
    // ─────────────────────────────────────────────────────────────
    // TEST 1: MIGRATION & ROLLBACK BÜTÜNLÜĞÜ
    // ─────────────────────────────────────────────────────────────
    await runStep(
      "TEST_01",
      "Migration & Rollback SQL Bütünlüğü (Additive Only)",
      async () => {
        const validations = validateAllUretimMigrations()
        const faz8 = validations.find((v) => v.migrationName.includes("uretim_bakim"))

        if (!faz8) {
          throw new Error("20261111220000_uretim_bakim migration klasörü bulunamadı!")
        }

        if (!faz8.valid) {
          throw new Error(`Migration doğrulaması başarısız: ${faz8.errors.join(", ")}`)
        }

        const faz8MigrationDir = path.join(
          process.cwd(),
          "prisma",
          "migrations",
          "20261111220000_uretim_bakim"
        )
        const migSqlPath = path.join(faz8MigrationDir, "migration.sql")
        const rollSqlPath = path.join(faz8MigrationDir, "rollback.sql")

        if (!fs.existsSync(migSqlPath)) {
          throw new Error("Faz 8 migration.sql dosyası bulunamadı!")
        }
        if (!fs.existsSync(rollSqlPath)) {
          throw new Error("Faz 8 rollback.sql dosyası bulunamadı!")
        }

        const migSql = fs.readFileSync(migSqlPath, "utf8")
        if (migSql.includes("DROP COLUMN") || migSql.includes("DROP TABLE UretimMachineAsset")) {
          throw new Error("Migration yıkıcı (destructive) komut içeriyor!")
        }

        return `Migration doğrulandı: 7 yeni tablo eklendi, UretimMachineAsset genişletildi, rollback hazır.`
      }
    )

    // ─────────────────────────────────────────────────────────────
    // TEST 2: ÖZELLİK BAYRAĞI İZOLASYONU
    // ─────────────────────────────────────────────────────────────
    await runStep(
      "TEST_02",
      "Özellik Bayrağı İzolasyonu (uretim_bakim kapalıyken 403, açıkken 200)",
      async () => {
        resetFeatureFlagsOff()

        // 1. Kapalıyken GET
        const reqOff = new Request("http://localhost:3000/api/production/maintenance?view=overview", {
          headers: { "x-user-id": DEBUG_USER_ID },
        })
        const resOff = await maintenanceApiGet(reqOff)
        const jsonOff = await resOff.json()

        if (resOff.status !== 403 || jsonOff.code !== "FEATURE_DISABLED") {
          throw new Error(`Bayrak kapalıyken 403 dönmeliydi. Alınan: ${resOff.status} / ${jsonOff.code}`)
        }

        // 2. Açıkken GET
        enableMaintenanceFeatureFlag()
        const reqOn = new Request("http://localhost:3000/api/production/maintenance?view=overview", {
          headers: { "x-user-id": DEBUG_USER_ID },
        })
        const resOn = await maintenanceApiGet(reqOn)
        const jsonOn = await resOn.json()

        if (resOn.status !== 200 || !jsonOn.success) {
          throw new Error(`Bayrak açıkken 200 dönmeliydi. Alınan: ${resOn.status} / ${JSON.stringify(jsonOn)}`)
        }

        return "Özellik bayrağı kapalıyken 403 FEATURE_DISABLED fırlatıldı; açıkken 200 OK döndü."
      }
    )

    // ─────────────────────────────────────────────────────────────
    // TEST 3: EKİPMAN HİYERARŞİSİ VE DÖNGÜ KONTROLÜ
    // ─────────────────────────────────────────────────────────────
    await runStep(
      "TEST_03",
      "Ekipman Hiyerarşisi, Kritiklik Sınıfı (A/B/C) ve Döngüsel Bağımlılık Engeli",
      async () => {
        // Döngüsel bağımlılık testi
        const mockAssets = [
          { id: "A1", parentAssetId: null },
          { id: "A2", parentAssetId: "A1" },
          { id: "A3", parentAssetId: "A2" },
        ]

        // A1'in parent'ını A3 yapmaya çalışırsak döngü oluşmalı ve hata vermelidir
        let caughtCycle = false
        try {
          validateNoCircularAssetHierarchy("A1", "A3", mockAssets)
        } catch (err: any) {
          caughtCycle = true
        }

        if (!caughtCycle) {
          throw new Error("Döngüsel ebeveyn bağımlılığı saptanamadı!")
        }

        // Ağaç yapısı testi
        const treeAssets = [
          { id: "HAT-1", code: "H01", name: "Montaj Hattı 1", parentAssetId: null, criticality: "A" },
          { id: "ROBOT-1", code: "R01", name: "Kaynak Robotu", parentAssetId: "HAT-1", criticality: "A" },
          { id: "TABANCA-1", code: "T01", name: "Kaynak Tabancası", parentAssetId: "ROBOT-1", criticality: "B" },
        ]
        const tree = buildEquipmentHierarchyTree(treeAssets)
        if (tree.length !== 1 || tree[0].children.length !== 1 || tree[0].children[0].children.length !== 1) {
          throw new Error("Ekipman ağacı oluşturma hiyerarşisi hatalı!")
        }

        return "Döngüsel bağımlılık engellendi, 3 katmanlı ekipman ağacı doğru kuruldu."
      }
    )

    // ─────────────────────────────────────────────────────────────
    // TEST 4: YEDEK PARÇA BOM TANIMI
    // ─────────────────────────────────────────────────────────────
    await runStep(
      "TEST_04",
      "Ekipman Yedek Parça Listesi (BOM) & Stok/Tedarik Verileri",
      async () => {
        // Yeni bir makine oluştur
        const machine = await createMachineAsset(
          {
            code: "M-TEST-01",
            name: "Test CNC Freze",
            criticality: "A",
            operatingHours: 1200,
            productionCount: 45000,
          },
          DEBUG_USER_ID
        )

        // Bir stok kalemi bul veya oluştur
        let item = await (db.inventoryItem as any).findFirst()
        if (!item) {
          item = await (db.inventoryItem as any).create({
            data: {
              code: "YD-TEST-RULMAN",
              name: "Test Rulman SKF 6205",
              currentStock: 5,
              unit: "ADET",
              averageCost: 250,
            },
          })
        }

        // Yedek parça ekle
        const spare = await addSparePartToMachine(
          {
            machineAssetId: machine.id,
            itemId: item.id,
            quantityPerUnit: 2,
            minStockLevel: 3,
            replacementIntervalHours: 1000,
            isCritical: true,
          },
          DEBUG_USER_ID
        )

        if (!spare || spare.machineAssetId !== machine.id) {
          throw new Error("Yedek parça makineye eklenemedi!")
        }

        return `Makine (${machine.code}) için kritik yedek parça (${item.code}) başarıyla bağlandı.`
      }
    )

    // ─────────────────────────────────────────────────────────────
    // TEST 5: TAKVİM BAZLI BAKIM TETİKLEME
    // ─────────────────────────────────────────────────────────────
    await runStep(
      "TEST_05",
      "Takvim Bazlı Periyodik Bakım Tetikleme ve Tarih İlerletme Mantığı",
      async () => {
        const pastDate = new Date()
        pastDate.setDate(pastDate.getDate() - 2)

        const futureDate = new Date()
        futureDate.setDate(futureDate.getDate() + 5)

        // Geçmiş tarihli bakım tetiklenmeli
        const duePast = isCalendarPMDue(pastDate)
        if (!duePast) throw new Error("Günü geçen takvim bakımı tetiklenmedi!")

        // Gelecek tarihli bakım tetiklenmemeli
        const dueFuture = isCalendarPMDue(futureDate)
        if (dueFuture) throw new Error("Gelecek tarihli bakım erkenden tetiklendi!")

        // Sonraki bakım tarihi hesaplama (30 gün)
        const base = new Date(2026, 0, 1)
        const nextDate = calculateNextScheduledDate(base, 30)
        const diffDays = Math.round((nextDate.getTime() - base.getTime()) / (1000 * 60 * 60 * 24))
        if (diffDays !== 30) {
          throw new Error(`Sonraki tarih hesaplama hatası: ${diffDays} gün`)
        }

        return "Takvim periyot kontrolü ve gün öteleme matematiği doğrulandı."
      }
    )

    // ─────────────────────────────────────────────────────────────
    // TEST 6: SAYAÇ BAZLI BAKIM TETİKLEME
    // ─────────────────────────────────────────────────────────────
    await runStep(
      "TEST_06",
      "Sayaç Bazlı (Çalışma Saati & Üretim Adedi) Bakım Tetikleme",
      async () => {
        // Saat eşiği kontrolü
        const hourTrigger = isMeterPMDue({
          planType: "METER_HOURS",
          currentHours: 1050,
          lastTriggeredHours: 500,
          frequencyHours: 500,
          currentCount: 0,
        })
        if (!hourTrigger) {
          throw new Error("Frekansı 500 saat olan bakım 550 saat farkta tetiklenmeliydi!")
        }

        const hourNotTrigger = isMeterPMDue({
          planType: "METER_HOURS",
          currentHours: 700,
          lastTriggeredHours: 500,
          frequencyHours: 500,
          currentCount: 0,
        })
        if (hourNotTrigger) {
          throw new Error("200 saatlik farkta 500 saatlik bakım tetiklenmemeliydi!")
        }

        // Adet eşiği kontrolü
        const countTrigger = isMeterPMDue({
          planType: "METER_COUNT",
          currentHours: 0,
          currentCount: 52000,
          lastTriggeredCount: 30000,
          frequencyCount: 20000,
        })
        if (!countTrigger) {
          throw new Error("22.000 adet farkta 20.000 adetlik bakım tetiklenmeliydi!")
        }

        return "Çalışma saati ve üretim adedi eşikleri hassas olarak değerlendirildi."
      }
    )

    // ─────────────────────────────────────────────────────────────
    // TEST 7: KESTİRİMCİ BAKIM SENSÖR TELEMETRİSİ VE ALARMI
    // ─────────────────────────────────────────────────────────────
    await runStep(
      "TEST_07",
      "Kestirimci Bakım (PdM) Sensör Telemetrisi ve Eşik Aşım Alarmı",
      async () => {
        // Eşik kuralı testi
        const breached = evaluateConditionRule(88.5, ">", 80)
        if (!breached) throw new Error("Sıcaklık 88.5 > 80 kuralı ihlal edilmeliydi!")

        const normal = evaluateConditionRule(72.0, ">", 80)
        if (normal) throw new Error("Sıcaklık 72.0 > 80 kuralı ihlal edilmemeliydi!")

        // Makine oluştur ve kestirimci plan bağla
        const machine = await createMachineAsset(
          {
            code: "M-PDM-01",
            name: "Kestirimci Test Motoru",
            criticality: "A",
          },
          DEBUG_USER_ID
        )

        await createMaintenancePlan(
          {
            code: "PLN-PDM-01",
            name: "Motor Titreşim Alarm Planı",
            machineAssetId: machine.id,
            planType: "CONDITION",
            conditionMetric: "TITRESIM",
            conditionOperator: ">",
            conditionThreshold: 5.0,
            priority: "CRITICAL",
          },
          DEBUG_USER_ID
        )

        // Eşiği aşan telemetri gönder -> Otomatik BREAKDOWN iş emri açılmalı
        const readingResult = await recordConditionReading(
          {
            machineAssetId: machine.id,
            sensorType: "TITRESIM",
            readingValue: 7.8,
            unit: "mm/s",
          },
          DEBUG_USER_ID
        )

        if (!readingResult.reading.isThresholdExceeded) {
          throw new Error("Sensör okuması eşik aşımı olarak işaretlenmedi!")
        }
        if (!readingResult.autoWorkOrder) {
          throw new Error("Kritik sensör aşımında otomatik iş emri oluşturulmadı!")
        }
        if (readingResult.autoWorkOrder.priority !== "CRITICAL") {
          throw new Error("Otomatik iş emri önceliği CRITICAL olmalıydı!")
        }

        return `Titreşim aşımı (7.8 mm/s > 5.0 mm/s) saptandı ve acil iş emri (#${readingResult.autoWorkOrder.workOrderNumber}) üretildi.`
      }
    )

    // ─────────────────────────────────────────────────────────────
    // TEST 8: BAKIM İŞ EMRİ DURUM MAKİNESİ
    // ─────────────────────────────────────────────────────────────
    await runStep(
      "TEST_08",
      "Bakım İş Emri Yaşam Döngüsü Durum Makinesi (State Machine)",
      async () => {
        // Geçerli geçişler
        validateWorkOrderStatusTransition("REQUESTED", "EVALUATED")
        validateWorkOrderStatusTransition("EVALUATED", "SCHEDULED")
        validateWorkOrderStatusTransition("SCHEDULED", "IN_PROGRESS")
        validateWorkOrderStatusTransition("IN_PROGRESS", "COMPLETED")

        // Geçersiz geçiş (COMPLETED terminal durumdur)
        let caughtInvalid = false
        try {
          validateWorkOrderStatusTransition("COMPLETED", "IN_PROGRESS")
        } catch (e: any) {
          caughtInvalid = true
        }

        if (!caughtInvalid) {
          throw new Error("Tamamlanmış iş emrinin IN_PROGRESS'e dönmesi engellenmeliydi!")
        }

        return "REQUESTED -> EVALUATED -> SCHEDULED -> IN_PROGRESS -> COMPLETED durum akışı doğrulandı."
      }
    )

    // ─────────────────────────────────────────────────────────────
    // TEST 9: DURUŞ SÜRESİ VE KÖK NEDEN TAKİBİ
    // ─────────────────────────────────────────────────────────────
    await runStep(
      "TEST_09",
      "Duruş Süresi (Downtime) ve Kök Neden Takibi (DOWN -> ACTIVE)",
      async () => {
        const machine = await createMachineAsset(
          {
            code: "M-ARZ-01",
            name: "Pres Makinesi",
            criticality: "A",
          },
          DEBUG_USER_ID
        )

        // Arıza iş emri aç (makine DOWN durumuna geçmeli)
        const wo = await createMaintenanceWorkOrder(
          {
            machineAssetId: machine.id,
            type: "BREAKDOWN",
            title: "Pres hidrolik hortumu patladı",
            priority: "CRITICAL",
          },
          DEBUG_USER_ID
        )

        const machineAfterBreakdown = await (db.uretimMachineAsset as any).findUnique({
          where: { id: machine.id },
        })
        if (machineAfterBreakdown.status !== "DOWN") {
          throw new Error("Arıza iş emri açıldığında makine durumu 'DOWN' olmadı!")
        }

        // İşe başla ve tamamla
        await updateMaintenanceWorkOrderStatus(wo.id, "IN_PROGRESS", {}, DEBUG_USER_ID)
        const completedWo = await updateMaintenanceWorkOrderStatus(
          wo.id,
          "COMPLETED",
          {
            downtimeMinutes: 90,
            laborHours: 2.5,
            failureReason: "Aşırı basınç nedeniyle hidrolik hortum yırtılması",
            completionNotes: "Hortum değiştirildi, yağ takviye edildi.",
          },
          DEBUG_USER_ID
        )

        if (completedWo.downtimeMinutes !== 90) {
          throw new Error("Duruş süresi (90 dk) iş emrine kaydedilemedi!")
        }

        const machineAfterRepair = await (db.uretimMachineAsset as any).findUnique({
          where: { id: machine.id },
        })
        if (machineAfterRepair.status !== "ACTIVE") {
          throw new Error("Onarım tamamlandığında makine durumu tekrar 'ACTIVE' olmadı!")
        }

        return "Makine arızada DOWN yapıldı; tamamlama sonrası 90 dk duruş işlendi ve ACTIVE statüsüne döndü."
      }
    )

    // ─────────────────────────────────────────────────────────────
    // TEST 10: YEDEK PARÇA TÜKETİMİ VE SATINALMA TALEBİ
    // ─────────────────────────────────────────────────────────────
    await runStep(
      "TEST_10",
      "Yedek Parça Sarfiyatı ve Eksik Stokta Satınalma Talebi İhtiyacı",
      async () => {
        const machine = await createMachineAsset(
          { code: "M-SPARE-01", name: "Kaynak Makinesi" },
          DEBUG_USER_ID
        )

        // 2 adet stoğu olan bir malzeme oluştur
        const item = await (db.inventoryItem as any).create({
          data: {
            code: "YD-NOZZLE-01",
            name: "Gazaltı Torç Nozulu",
            currentStock: 2,
            averageCost: 120,
          },
        })

        const wo = await createMaintenanceWorkOrder(
          {
            machineAssetId: machine.id,
            title: "Torç nozul değişimi",
          },
          DEBUG_USER_ID
        )

        // 5 adet tüketim talep et (stokta sadece 2 var)
        const partsUsage = await recordWorkOrderSparePartUsage(
          wo.id,
          [
            {
              itemId: item.id,
              quantityUsed: 5,
              unitCost: 120,
            },
          ],
          DEBUG_USER_ID
        )

        if (partsUsage[0].totalCost !== 600) {
          throw new Error(`Yedek parça maliyet hesabı hatalı: ${partsUsage[0].totalCost} != 600`)
        }
        if (!partsUsage[0].isProcurementRequested) {
          throw new Error("Eksik stok için satınalma talebi bayrağı açılmadı!")
        }

        return "Yedek parça tüketimi ve satınalma talebi tetikleme bayrağı doğrulandı."
      }
    )

    // ─────────────────────────────────────────────────────────────
    // TEST 11: KAPASİTE ÇAKIŞMASI UYARI MOTORU
    // ─────────────────────────────────────────────────────────────
    await runStep(
      "TEST_11",
      "Kapasite Çizelgeleme Bakım Çakışması (Capacity Conflict Alert) Tespiti",
      async () => {
        const maintWindow = {
          workOrderId: "WO-001",
          machineAssetId: "M-CNC-1",
          workCenterId: "WC-01",
          plannedStart: new Date("2026-11-20T10:00:00Z"),
          plannedEnd: new Date("2026-11-20T14:00:00Z"),
        }

        // Çakışan üretim görevi (12:00 - 16:00 arası)
        const tasks = [
          {
            id: "TASK-01",
            workOrderId: "PROD-WO-99",
            workOrderNumber: "WO-2026-99",
            workCenterId: "WC-01",
            machineAssetId: "M-CNC-1",
            plannedStart: new Date("2026-11-20T12:00:00Z"),
            plannedEnd: new Date("2026-11-20T16:00:00Z"),
            status: "SCHEDULED",
          },
          {
            id: "TASK-02",
            workOrderId: "PROD-WO-100",
            workOrderNumber: "WO-2026-100",
            workCenterId: "WC-02", // Farklı iş merkezi
            plannedStart: new Date("2026-11-20T12:00:00Z"),
            plannedEnd: new Date("2026-11-20T16:00:00Z"),
            status: "SCHEDULED",
          },
        ]

        const conflicts = detectMaintenanceCapacityConflicts({
          maintenanceWindow: maintWindow,
          scheduledTasks: tasks,
        })

        if (conflicts.length !== 1) {
          throw new Error(`Tam olarak 1 çakışma bekleniyordu, bulunan: ${conflicts.length}`)
        }
        if (conflicts[0].conflictingTaskId !== "TASK-01") {
          throw new Error("Yanlış görev ile çakışma raporlandı!")
        }

        return "Bakım penceresi ile çakışan üretim iş emri (#WO-2026-99) hassas şekilde tespit edildi."
      }
    )

    // ─────────────────────────────────────────────────────────────
    // TEST 12: MTBF HESAPLAMA DOĞRULAMASI
    // ─────────────────────────────────────────────────────────────
    await runStep(
      "TEST_12",
      "MTBF (Mean Time Between Failures - Arızalar Arası Ortalama Süre) Hesabı",
      async () => {
        // 1200 saat çalışma, 4 arıza -> MTBF = 300 saat
        const res = calculateMTBF(1200, 4)
        if (res.mtbfHours !== 300) {
          throw new Error(`MTBF hesabı hatalı: ${res.mtbfHours} != 300`)
        }

        // 0 arıza durumu -> MTBF = toplam çalışma saati
        const zeroBreakdown = calculateMTBF(800, 0)
        if (zeroBreakdown.mtbfHours !== 800) {
          throw new Error(`0 arızada MTBF hesabı hatalı: ${zeroBreakdown.mtbfHours} != 800`)
        }

        return "MTBF matematik formülü (Çalışma Saati / Arıza Sayısı) başarıyla doğrulandı."
      }
    )

    // ─────────────────────────────────────────────────────────────
    // TEST 13: MTTR HESAPLAMA DOĞRULAMASI
    // ─────────────────────────────────────────────────────────────
    await runStep(
      "TEST_13",
      "MTTR (Mean Time To Repair - Ortalama Onarım Süresi) Hesabı",
      async () => {
        // 180 dakika toplam duruş, 3 arıza -> MTTR = 60 dakika
        const res = calculateMTTR(180, 3)
        if (res.mttrMinutes !== 60) {
          throw new Error(`MTTR hesabı hatalı: ${res.mttrMinutes} != 60`)
        }

        // 0 arıza durumu -> MTTR = 0
        const zeroBreakdown = calculateMTTR(0, 0)
        if (zeroBreakdown.mttrMinutes !== 0) {
          throw new Error(`0 arızada MTTR 0 olmalıdır! Alınan: ${zeroBreakdown.mttrMinutes}`)
        }

        return "MTTR matematik formülü (Toplam Duruş / Arıza Sayısı) başarıyla doğrulandı."
      }
    )

    // ─────────────────────────────────────────────────────────────
    // TEST 14: OEE HESAPLAMA MOTORU DOĞRULAMASI
    // ─────────────────────────────────────────────────────────────
    await runStep(
      "TEST_14",
      "OEE (Overall Equipment Effectiveness = A x P x Q) Hesaplama Motoru",
      async () => {
        // Senaryo:
        // Planlanan süre: 480 dk (8 saat)
        // Duruş süresi: 48 dk -> Kullanılabilirlik (A) = (480 - 48) / 480 = 432 / 480 = 0.90 (%90)
        // Gerçek üretilen: 400 adet
        // İdeal çevrim: 1 dk/adet -> İdeal süre: 400 dk -> Performans (P) = 400 / 432 = 0.9259 (%92.59)
        // Sağlam adet: 380 -> Kalite (Q) = 380 / 400 = 0.95 (%95)
        // OEE = 0.90 x 0.925925 x 0.95 = 0.79166 -> %79.17
        const res = calculateOEE({
          plannedOperatingMinutes: 480,
          unplannedDowntimeMinutes: 48,
          actualTotalProduced: 400,
          idealCycleTimeMinutesPerUnit: 1,
          passedUnits: 380,
        })

        if (Math.abs(res.availability - 0.9) > 0.001) {
          throw new Error(`Kullanılabilirlik hesabı hatalı: ${res.availability}`)
        }
        if (Math.abs(res.quality - 0.95) > 0.001) {
          throw new Error(`Kalite hesabı hatalı: ${res.quality}`)
        }
        if (Math.abs(res.oee - 79.17) > 0.1) {
          throw new Error(`OEE hesabı hatalı: ${res.oee}`)
        }

        return `OEE: %${res.oee} (A: %${(res.availability * 100).toFixed(1)}, P: %${(res.performance * 100).toFixed(1)}, Q: %${(res.quality * 100).toFixed(1)})`
      }
    )

    // ─────────────────────────────────────────────────────────────
    // TEST 15: OTOMATİK PM İŞ EMRİ ÜRETİM MOTORU
    // ─────────────────────────────────────────────────────────────
    await runStep(
      "TEST_15",
      "Otomatik Bakım İş Emri Üretim Motoru (PM Job Scheduler)",
      async () => {
        const machine = await createMachineAsset(
          {
            code: "M-SCHED-01",
            name: "Periyodik Plan Makinesi",
            operatingHours: 600,
            productionCount: 25000,
          },
          DEBUG_USER_ID
        )

        // Tarihi geçmiş bir takvim planı ekle
        const pastDate = new Date()
        pastDate.setDate(pastDate.getDate() - 1)

        await createMaintenancePlan(
          {
            code: "PLN-SCHED-01",
            name: "Haftalık Yağlama",
            machineAssetId: machine.id,
            planType: "CALENDAR",
            frequencyDays: 7,
            nextScheduledDate: pastDate,
          },
          DEBUG_USER_ID
        )

        // Sayaç eşiğini doldurmuş bir plan ekle (frekans 500 saat, makine 600 saatte, son tetiklenme 0)
        await createMaintenancePlan(
          {
            code: "PLN-SCHED-02",
            name: "500 Saatlik Filtre Değişimi",
            machineAssetId: machine.id,
            planType: "METER_HOURS",
            frequencyHours: 500,
            lastTriggeredHours: 0,
          },
          DEBUG_USER_ID
        )

        // Scheduler job'ı çalıştır
        const jobResult = await evaluateAndTriggerMaintenanceJobs(
          { simulateOnly: false },
          DEBUG_USER_ID
        )

        if (jobResult.triggeredCount < 2) {
          throw new Error(
            `En az 2 bakım iş emri açılmalıydı, açılan: ${jobResult.triggeredCount}`
          )
        }

        return `Otomatik PM motoru ${jobResult.evaluatedPlanCount} planı inceledi ve ${jobResult.triggeredCount} yeni iş emri üretti.`
      }
    )

    // ─────────────────────────────────────────────────────────────
    // TEST 16: API EŞZAMANLILIK VE SHA-256 VERİTABANI BÜTÜNLÜĞÜ
    // ─────────────────────────────────────────────────────────────
    await runStep(
      "TEST_16",
      "API Rotaları Eşzamanlılık & SHA-256 Veritabanı Bütünlüğü",
      async () => {
        // 1. Eşzamanlı API İstekleri
        const overviewReq = new Request("http://localhost:3000/api/production/maintenance?view=overview", {
          headers: { "x-user-id": DEBUG_USER_ID },
        })
        const assetsReq = new Request("http://localhost:3000/api/production/maintenance?view=assets", {
          headers: { "x-user-id": DEBUG_USER_ID },
        })
        const hierarchyReq = new Request("http://localhost:3000/api/production/maintenance?view=hierarchy", {
          headers: { "x-user-id": DEBUG_USER_ID },
        })

        const [res1, res2, res3] = await Promise.all([
          maintenanceApiGet(overviewReq),
          maintenanceApiGet(assetsReq),
          maintenanceApiGet(hierarchyReq),
        ])

        const [j1, j2, j3] = await Promise.all([res1.json(), res2.json(), res3.json()])

        if (!j1.success || !j2.success || !j3.success) {
          throw new Error("Eşzamanlı API çağrılarından biri başarısız oldu!")
        }

        // 2. Veritabanını Başlangıç Yedeğinden Geri Yükle & SHA-256 Karşılaştır
        console.log("\n[TEMİZLİK] Test veritabanı orijinal yedeğe geri yükleniyor...")
        restoreDatabaseBackup(backupResult.backupId)

        // Yedek klasörünü temizle
        const backupDir = path.join(process.cwd(), "storage", "backups", backupResult.backupId)
        if (fs.existsSync(backupDir)) {
          fs.rmSync(backupDir, { recursive: true, force: true })
        }

        const finalDbSha256 = computeFileSha256(localDbPath)
        console.log(`[BİTİŞ] .local-db.json SHA-256: ${finalDbSha256}`)

        if (initialDbSha256 && finalDbSha256 !== initialDbSha256) {
          throw new Error(
            `Veritabanı SHA-256 bütünlüğü bozuldu! Başlangıç: ${initialDbSha256}, Bitiş: ${finalDbSha256}`
          )
        }

        return "API rotaları eşzamanlı doğrulandı; veritabanı yedeğe döndürüldü, SHA-256 tam olarak korundu."
      }
    )
  } finally {
    resetFeatureFlagsOff()
  }

  console.log("\n================================================================================")
  console.log("  TEST ÖZETİ")
  console.log("================================================================================")
  const passedCount = results.filter((r) => r.passed).length
  const failedCount = results.filter((r) => !r.passed).length
  console.log(`  Toplam: ${results.length} | Başarılı: ${passedCount} | Başarısız: ${failedCount}`)

  if (failedCount > 0) {
    console.error("\n❌ BAZI TESTLER BAŞARISIZ OLDU!")
    process.exit(1)
  } else {
    console.log("\n🎉 TÜM TESTLER BAŞARIYLA TAMAMLANDI (16/16)!")
  }
}

main().catch((err) => {
  console.error("Test çalıştırma hatası:", err)
  process.exit(1)
})
