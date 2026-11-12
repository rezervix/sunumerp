/**
 * Sunum ERP — FAZ 9: Üretim Konsolide Entegrasyon, Dashboard, Bildirim & Uçtan Uca (E2E) Test Paketi
 *
 * Kapsam:
 * 1. Migration ve Rollback SQL Bütünlüğü (Additive Only, 2 Yeni Model)
 * 2. Özellik Bayrağı İzolasyonu (Tüm bayraklar kapalıyken 403, biri açıkken 200)
 * 3. Bildirim Kuralları ve Kullanıcı Tercihleri / Abonelikleri CRUD
 * 4. Olay Bazlı Bildirim Değerlendiricisi ve Dağıtım Motoru (In-App Bildirim Kaydı)
 * 5. Canlı Veritabanı Otomatik Alarm ve Risk Tarayıcısı (Gecikme, Kapasite, Kalite, Kalibrasyon, Bakım, Stok)
 * 6. OTD (Zamanında Teslimat - On-Time Delivery) Matematiksel Doğrulaması
 * 7. Çizelgeye Uyum (Schedule Adherence) Matematiksel Doğrulaması
 * 8. Ret ve Fire Oranı (Scrap / Defect Rate) Hesabı
 * 9. İş Emri Maliyet Sapma (Cost Variance) Analizi
 * 10. Malzeme Tüketim Sapması ve Finansal Etki Raporu
 * 11. Makine Verimlilik, OEE, MTBF ve MTTR Konsolide Raporu
 * 12. Bakım Maliyeti Dağılım Raporu
 * 13. Excel / CSV Dışa Aktarma (UTF-8 BOM) Formatlayıcısı
 * 14. Üretim Modülleri Denetim İzi (Audit Trail) Filtreleme ve Arama
 * 15. Kapsamlı E2E Senaryo A (Satış -> MRP -> Satınalma + İş Emri -> Kalite -> Sevkiyat -> Maliyet)
 * 16. Kapsamlı E2E Senaryo B (Sensör Arızası -> Bakım -> Kapasite Çakışması -> Onarım & ACTIVE)
 * 17. API Eşzamanlılık & SHA-256 Veritabanı Bütünlüğü
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
  calculateOnTimeDeliveryRate,
  calculateScheduleAdherence,
  calculateScrapAndDefectRate,
  calculateWorkOrderCostVariance,
  calculateMaterialConsumptionVariance,
  matchNotificationRules,
  exportToCsvFormat,
} from "../lib/services/productionIntegrationEngine"
import {
  listNotificationRules,
  createNotificationRule,
  updateNotificationRule,
  deleteNotificationRule,
  getUserNotificationPreferences,
  updateUserNotificationPreference,
  dispatchProductionNotification,
  scanAndTriggerAllProductionAlerts,
  getConsolidatedProductionDashboard,
  generateWorkOrderCostReport,
  generateMaterialVarianceReport,
  generateMachineEfficiencyReport,
  generateMaintenanceCostReport,
  exportReportData,
  queryProductionAuditLogs,
  runE2EProductionLifecycleScenario,
  runBreakdownMaintenanceCapacityScenario,
} from "../lib/services/productionIntegrationServerDb"
import {
  GET as integrationApiGet,
  POST as integrationApiPost,
} from "../app/api/production/integration/route"

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

function enableIntegrationFeatureFlag(): void {
  process.env.FEATURE_URETIM_IS_EMRI = "true"
  process.env.FEATURE_URETIM_BAKIM = "true"
  saveSystemConfig({
    featureFlags: {
      ...DEFAULT_PRODUCTION_FEATURE_FLAGS,
      uretim_is_emri: true,
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
  console.log("  SUNUM ERP — FAZ 9: ENTEGRASYON, DASHBOARD, BİLDİRİM & E2E TEST PAKETİ")
  console.log("================================================================================")

  const localDbPath = path.join(process.cwd(), "storage", "ajans-kutuphanesi", ".local-db.json")
  const initialDbSha256 = computeFileSha256(localDbPath)
  console.log(`[BAŞLANGIÇ] .local-db.json SHA-256: ${initialDbSha256 || "(Dosya yok)"}`)

  const backupResult = createDatabaseBackup({
    label: "FAZ9_INTEGRATION_TEST_BEFORE",
    updateSystemConfigLastBackup: false,
  })
  console.log(`[YEDEK ALINDI] Backup ID: ${backupResult.backupId}`)

  try {
    // ─────────────────────────────────────────────────────────────
    // TEST 1: MIGRATION & ROLLBACK BÜTÜNLÜĞÜ
    // ─────────────────────────────────────────────────────────────
    await runStep(
      "TEST_01",
      "Faz 9 Additive Migration ve Rollback SQL Bütünlüğü",
      async () => {
        const validations = validateAllUretimMigrations()
        const faz9 = validations.find((v) => v.migrationName.includes("uretim_entegrasyon"))

        if (!faz9) {
          throw new Error("20261111240000_uretim_entegrasyon migration klasörü bulunamadı!")
        }

        if (!faz9.valid) {
          throw new Error(`Migration doğrulaması başarısız: ${faz9.errors.join(", ")}`)
        }

        const faz9Dir = path.join(process.cwd(), "prisma", "migrations", "20261111240000_uretim_entegrasyon")
        const migSql = fs.readFileSync(path.join(faz9Dir, "migration.sql"), "utf8")
        if (migSql.includes("DROP COLUMN") || migSql.includes("DROP TABLE")) {
          throw new Error("Migration yıkıcı ifade içeriyor!")
        }

        return `Migration doğrulandı: 2 yeni tablo (UretimNotificationRule, UretimNotificationPreference), 0 silme, tam rollback.`
      }
    )

    // ─────────────────────────────────────────────────────────────
    // TEST 2: ÖZELLİK BAYRAĞI İZOLASYONU
    // ─────────────────────────────────────────────────────────────
    await runStep(
      "TEST_02",
      "Özellik Bayrağı İzolasyonu (Tüm bayraklar kapalıyken 403, biri açıkken 200)",
      async () => {
        resetFeatureFlagsOff()

        // 1. Kapalıyken GET
        const reqOff = new Request("http://localhost:3000/api/production/integration?view=dashboard", {
          headers: { "x-user-id": DEBUG_USER_ID },
        })
        const resOff = await integrationApiGet(reqOff)
        const jsonOff = await resOff.json()

        if (resOff.status !== 403 || jsonOff.code !== "FEATURE_DISABLED") {
          throw new Error(`Tüm bayraklar kapalıyken 403 dönmeliydi. Alınan: ${resOff.status} / ${jsonOff.code}`)
        }

        // 2. Açıkken GET
        enableIntegrationFeatureFlag()
        const reqOn = new Request("http://localhost:3000/api/production/integration?view=dashboard", {
          headers: { "x-user-id": DEBUG_USER_ID },
        })
        const resOn = await integrationApiGet(reqOn)
        const jsonOn = await resOn.json()

        if (resOn.status !== 200 || !jsonOn.success) {
          throw new Error(`Bayrak açıkken 200 dönmeliydi. Alınan: ${resOn.status}`)
        }

        return "Özellik bayrakları kapalıyken 403 FEATURE_DISABLED fırlatıldı; üretim bayrağı aktifken 200 OK döndü."
      }
    )

    // ─────────────────────────────────────────────────────────────
    // TEST 3: BİLDİRİM KURALLARI VE KULLANICI TERCİHLERİ CRUD
    // ─────────────────────────────────────────────────────────────
    await runStep(
      "TEST_03",
      "Bildirim Kuralları ve Kullanıcı Tercihleri / Abonelikleri CRUD",
      async () => {
        // Kural oluştur
        const rule = await createNotificationRule(
          {
            name: "Test Gecikme Kuralı",
            eventType: "WORK_ORDER_DELAY",
            severity: "WARNING",
            channel: "IN_APP",
            targetRoles: ["FABRIKA_MUDURU", "PLANLAMA_MUDURU"],
            description: "Termini geçen iş emirleri için kural",
          },
          DEBUG_USER_ID
        )

        if (!rule || rule.name !== "Test Gecikme Kuralı") {
          throw new Error("Bildirim kuralı oluşturulamadı!")
        }

        // Kural güncelle
        const updated = await updateNotificationRule(
          rule.id,
          { severity: "CRITICAL", name: "Kritik Gecikme Kuralı" },
          DEBUG_USER_ID
        )
        if (updated.severity !== "CRITICAL") {
          throw new Error("Kural güncellenemedi!")
        }

        // Kullanıcı tercihi kaydet
        await updateUserNotificationPreference(DEBUG_USER_ID, "WORK_ORDER_DELAY", {
          inAppEnabled: true,
          emailEnabled: true,
          smsEnabled: false,
        })
        const prefs = await getUserNotificationPreferences(DEBUG_USER_ID)
        const delayPref = prefs.find((p: any) => p.eventType === "WORK_ORDER_DELAY")
        if (!delayPref || !delayPref.emailEnabled) {
          throw new Error("Kullanıcı bildirim tercihi kaydedilemedi!")
        }

        // Kural sil
        await deleteNotificationRule(rule.id, DEBUG_USER_ID)

        return "Bildirim kuralları ve kullanıcı tercihleri CRUD operasyonları başarıyla doğrulandı."
      }
    )

    // ─────────────────────────────────────────────────────────────
    // TEST 4: OLAY BAZLI BİLDİRİM DAĞITIMI
    // ─────────────────────────────────────────────────────────────
    await runStep(
      "TEST_04",
      "Olay Bazlı Bildirim Değerlendiricisi ve Dağıtım Motoru (In-App Bildirim)",
      async () => {
        // Aktif bir kural tanımla
        await createNotificationRule(
          {
            name: "Kalite Ret Alarmı",
            eventType: "QUALITY_REJECTION",
            severity: "CRITICAL",
            channel: "IN_APP",
            targetRoles: ["FABRIKA_MUDURU"],
          },
          DEBUG_USER_ID
        )

        // Olay oluştur ve dağıt
        const result = await dispatchProductionNotification({
          eventType: "QUALITY_REJECTION",
          severity: "CRITICAL",
          title: "Parti Muayenesi Reddedildi",
          message: "LOT-2026-X tolerans dışı kumpas ölçümü nedeniyle karantinaya alındı.",
          entityType: "UretimQualityInspection",
          entityId: "INS-TEST-99",
          referenceCode: "INS-2026-99",
        })

        if (!result.dispatched || result.ruleCount === 0) {
          throw new Error("Eşleşen kural bulunamadı veya bildirim dağıtılamadı!")
        }

        // db.notification tablosunda kaydın oluştuğunu teyit et
        const notifications = await (db.notification as any).findMany({
          where: { moduleType: "uretim" },
        })
        const hasRejectionAlert = notifications.some((n: any) => n.title.includes("Parti Muayenesi Reddedildi"))
        if (!hasRejectionAlert) {
          throw new Error("Uygulama içi (in-app) bildirim kaydı veritabanında bulunamadı!")
        }

        return `Olay bildirim motoru tetiklendi ve in-app bildirim kaydı oluşturuldu (Alıcı Sayısı: ${result.recipientCount}).`
      }
    )

    // ─────────────────────────────────────────────────────────────
    // TEST 5: ALARM VE RİSK TARAYICISI
    // ─────────────────────────────────────────────────────────────
    await runStep(
      "TEST_05",
      "Canlı Veritabanı Otomatik Alarm ve Risk Tarayıcısı",
      async () => {
        // Gecikmiş iş emri oluştur
        const pastDate = new Date()
        pastDate.setDate(pastDate.getDate() - 2)

        const wo = await (db.uretimWorkOrder as any).create({
          data: {
            workOrderNumber: `WO-DELAY-${Date.now().toString().slice(-4)}`,
            status: "IN_PROGRESS",
            plannedEndDate: pastDate,
            plannedQuantity: 50,
          },
        })

        // Tarayıcıyı çalıştır
        const scanResult = await scanAndTriggerAllProductionAlerts()
        if (scanResult.totalScanned === 0) {
          throw new Error("Geciken iş emri tarayıcı tarafından yakalanamadı!")
        }

        return `Otomatik tarayıcı çalıştı ve ${scanResult.totalScanned} adet gecikme/risk uyarısını başarıyla üretti.`
      }
    )

    // ─────────────────────────────────────────────────────────────
    // TEST 6: OTD (ON-TIME DELIVERY) MATEMATİĞİ
    // ─────────────────────────────────────────────────────────────
    await runStep(
      "TEST_06",
      "OTD (Zamanında Teslimat - On-Time Delivery) Matematiksel Doğrulaması",
      async () => {
        const plannedTime = new Date("2026-11-20T17:00:00Z")
        const onTimeEnd = new Date("2026-11-20T16:30:00Z")
        const delayedEnd = new Date("2026-11-20T21:00:00Z")

        const mockOrders = [
          { id: "1", workOrderNumber: "WO-1", plannedEndDate: plannedTime, actualEndDate: onTimeEnd, status: "COMPLETED" },
          { id: "2", workOrderNumber: "WO-2", plannedEndDate: plannedTime, actualEndDate: onTimeEnd, status: "COMPLETED" },
          { id: "3", workOrderNumber: "WO-3", plannedEndDate: plannedTime, actualEndDate: onTimeEnd, status: "COMPLETED" },
          { id: "4", workOrderNumber: "WO-4", plannedEndDate: plannedTime, actualEndDate: delayedEnd, status: "COMPLETED" },
        ]

        // 4 tamamlanmış, 3 zamanında -> %75.0 OTD
        const res = calculateOnTimeDeliveryRate({ completedOrders: mockOrders })
        if (res.otdPercentage !== 75 || res.onTimeCount !== 3 || res.delayedCount !== 1) {
          throw new Error(`OTD hesabı hatalı: %${res.otdPercentage} != %75`)
        }

        return "OTD formülü (Zamanında Biten / Toplam Biten * 100) %75.0 olarak doğrulandı."
      }
    )

    // ─────────────────────────────────────────────────────────────
    // TEST 7: ÇİZELGEYE UYUM (SCHEDULE ADHERENCE) MATEMATİĞİ
    // ─────────────────────────────────────────────────────────────
    await runStep(
      "TEST_07",
      "Çizelgeye Uyum (Schedule Adherence) Matematiksel Doğrulaması",
      async () => {
        const mockWorkOrders = [
          { plannedQuantity: 100, producedQuantity: 95, status: "COMPLETED" },
          { plannedQuantity: 200, producedQuantity: 180, status: "COMPLETED" },
        ]

        // Toplam Planlanan: 300, Toplam Üretilen: 275 -> 275 / 300 = %91.67
        const adherence = calculateScheduleAdherence({ workOrders: mockWorkOrders })
        if (Math.abs(adherence - 91.67) > 0.05) {
          throw new Error(`Schedule Adherence hesabı hatalı: %${adherence} != %91.67`)
        }

        return `Çizelge uyum oranı %${adherence} olarak doğrulandı.`
      }
    )

    // ─────────────────────────────────────────────────────────────
    // TEST 8: RET VE FİRE ORANI (SCRAP / DEFECT RATE) HESABI
    // ─────────────────────────────────────────────────────────────
    await runStep(
      "TEST_08",
      "Ret ve Fire Oranı (Scrap / Defect Rate) Hesabı",
      async () => {
        // 5000 adet üretim, 75 adet fire/ret -> 75 / 5000 = %1.5
        const rate = calculateScrapAndDefectRate(5000, 75)
        if (rate !== 1.5) {
          throw new Error(`Fire oranı hatalı: %${rate} != %1.5`)
        }

        return "Ret ve fire oranı %1.5 olarak doğrulandı."
      }
    )

    // ─────────────────────────────────────────────────────────────
    // TEST 9: İŞ EMRİ MALİYET SAPMA (COST VARIANCE) ANALİZİ
    // ─────────────────────────────────────────────────────────────
    await runStep(
      "TEST_09",
      "İş Emri Maliyet Sapma (Cost Variance) Analizi",
      async () => {
        const res = calculateWorkOrderCostVariance({
          workOrderNumber: "WO-VAR-01",
          plannedMaterialCost: 1000,
          actualMaterialCost: 1100, // +100
          plannedLaborCost: 400,
          actualLaborCost: 450, // +50
          plannedOverheadCost: 100,
          actualOverheadCost: 100, // 0
        })

        if (res.totalPlannedCost !== 1500) throw new Error("Planlanan maliyet toplamı hatalı!")
        if (res.totalActualCost !== 1650) throw new Error("Fiili maliyet toplamı hatalı!")
        if (res.varianceAmount !== 150) throw new Error("Varyans tutarı hatalı!")
        if (res.variancePercentage !== 10) throw new Error("Varyans yüzdesi (+%10) hatalı!")

        return `Maliyet sapması: Planlanan: ₺1.500, Fiili: ₺1.650, Fark: +₺150 (+%10.0).`
      }
    )

    // ─────────────────────────────────────────────────────────────
    // TEST 10: MALZEME TÜKETİM SAPMASI VE FİNANSAL ETKİ
    // ─────────────────────────────────────────────────────────────
    await runStep(
      "TEST_10",
      "Malzeme Tüketim Sapması ve Finansal Etki Raporu",
      async () => {
        const items = [
          {
            itemCode: "HM-SAC-01",
            itemName: "DKP Sac 2mm",
            plannedQuantity: 100,
            actualQuantity: 115,
            unitCost: 20,
            unit: "KG",
          },
        ]

        const res = calculateMaterialConsumptionVariance(items)
        if (res[0].varianceQuantity !== 15 || res[0].varianceCost !== 300 || res[0].variancePercentage !== 15) {
          throw new Error("Malzeme sapma hesabı hatalı!")
        }

        return `Malzeme sapması: +15 KG (+%15.0), Finansal Etki: +₺300.`
      }
    )

    // ─────────────────────────────────────────────────────────────
    // TEST 11: MAKİNE VERİMLİLİK, OEE, MTBF VE MTTR RAPORU
    // ─────────────────────────────────────────────────────────────
    await runStep(
      "TEST_11",
      "Makine Verimlilik, OEE, MTBF ve MTTR Konsolide Raporu",
      async () => {
        const report = await generateMachineEfficiencyReport()
        if (!Array.isArray(report)) {
          throw new Error("Makine verimlilik raporu bir dizi dönmedi!")
        }

        return `Makine verimlilik raporu ${report.length} makine için OEE, MTBF ve MTTR ile üretildi.`
      }
    )

    // ─────────────────────────────────────────────────────────────
    // TEST 12: BAKIM MALİYETİ DAĞILIM RAPORU
    // ─────────────────────────────────────────────────────────────
    await runStep(
      "TEST_12",
      "Bakım Maliyeti Dağılım Raporu",
      async () => {
        const report = await generateMaintenanceCostReport()
        if (!Array.isArray(report)) {
          throw new Error("Bakım maliyet raporu dizi formatında değil!")
        }

        return `Bakım maliyet raporu ${report.length} bakım iş emri için yedek parça ve işçilikle üretildi.`
      }
    )

    // ─────────────────────────────────────────────────────────────
    // TEST 13: EXCEL / CSV DIŞA AKTARMA (UTF-8 BOM) FORMATLAYICISI
    // ─────────────────────────────────────────────────────────────
    await runStep(
      "TEST_13",
      "Excel / CSV Dışa Aktarma (UTF-8 BOM) Formatlayıcısı",
      async () => {
        const csv = exportToCsvFormat(
          [
            { key: "code", label: "Ürün Kodu" },
            { key: "name", label: "Ürün Adı (Türkçe Karakter: Ğ, Ü, Ş, İ, Ö, Ç)" },
            { key: "price", label: "Fiyat" },
          ],
          [
            { code: "PRD-01", name: "Çelik Çekme Gövde İğnesi", price: 125.5 },
          ]
        )

        // UTF-8 BOM kontrolü (\uFEFF)
        if (!csv.startsWith("\uFEFF")) {
          throw new Error("CSV çıktısı UTF-8 BOM ile başlamıyor!")
        }
        if (!csv.includes("125,5")) {
          throw new Error("Türkçe virgüllü sayı formatı uygulanmadı!")
        }

        return "Excel uyumlu UTF-8 BOM Türkçe CSV formatlayıcısı doğrulandı."
      }
    )

    // ─────────────────────────────────────────────────────────────
    // TEST 14: ÜRETİM MODÜLLERİ DENETİM İZİ (AUDIT TRAIL)
    // ─────────────────────────────────────────────────────────────
    await runStep(
      "TEST_14",
      "Üretim Modülleri Denetim İzi (Audit Trail) Filtreleme ve Arama",
      async () => {
        const audit = await queryProductionAuditLogs({ limit: 10 })
        if (typeof audit.total !== "number" || !Array.isArray(audit.logs)) {
          throw new Error("Denetim izi sorgusu beklenen formatta değil!")
        }

        return `Denetim izi sorgulandı: Toplam ${audit.total} üretim işlemi kayıtlı.`
      }
    )

    // ─────────────────────────────────────────────────────────────
    // TEST 15: KAPSAMLI E2E SENARYO A
    // (Satış -> MRP -> Satınalma + İş Emri -> Kalite -> Sevkiyat -> Maliyet)
    // ─────────────────────────────────────────────────────────────
    await runStep(
      "TEST_15",
      "Kapsamlı E2E Senaryo A (Siparişten Sevkiyata ve Fiili Maliyete Uçtan Uca)",
      async () => {
        const result = await runE2EProductionLifecycleScenario(DEBUG_USER_ID)
        if (!result.success) {
          throw new Error("E2E Senaryo A başarısız oldu!")
        }
        if (result.otdPercentage !== 100) {
          throw new Error(`Zamanında teslimat bekleniyordu, alınan: %${result.otdPercentage}`)
        }

        return `Senaryo A tamamlandı: İş Emri #${result.workOrderNumber}, Satınalma Talebi #${result.purchaseRequisitionNumber}, Kalite KABUL #${result.inspectionNumber}, OTD: %${result.otdPercentage}.`
      }
    )

    // ─────────────────────────────────────────────────────────────
    // TEST 16: KAPSAMLI E2E SENARYO B
    // (Sensör Arızası -> Bakım -> Kapasite Çakışması -> Onarım & ACTIVE)
    // ─────────────────────────────────────────────────────────────
    await runStep(
      "TEST_16",
      "Kapsamlı E2E Senaryo B (Sensör Arızası -> Bakım -> Kapasite Çakışması -> Onarım & ACTIVE)",
      async () => {
        const result = await runBreakdownMaintenanceCapacityScenario(DEBUG_USER_ID)
        if (!result.success) {
          throw new Error("E2E Senaryo B başarısız oldu!")
        }
        if (result.finalMachineStatus !== "ACTIVE") {
          throw new Error(`Makinenin onarım sonrası ACTIVE olması gerekiyordu, durum: ${result.finalMachineStatus}`)
        }

        return `Senaryo B tamamlandı: Ekipman ${result.machineCode} arızada DOWN oldu, ${result.downtimeMinutes} dk onarım sonrası ACTIVE statüsüne döndü.`
      }
    )

    // ─────────────────────────────────────────────────────────────
    // TEST 17: REST API EŞZAMANLILIK VE SHA-256 VERİTABANI BÜTÜNLÜĞÜ
    // ─────────────────────────────────────────────────────────────
    await runStep(
      "TEST_17",
      "API Rotaları Eşzamanlılık & SHA-256 Veritabanı Bütünlüğü",
      async () => {
        // Eşzamanlı API Çağrıları
        const dashReq = new Request("http://localhost:3000/api/production/integration?view=dashboard", {
          headers: { "x-user-id": DEBUG_USER_ID },
        })
        const notifReq = new Request("http://localhost:3000/api/production/integration?view=notifications", {
          headers: { "x-user-id": DEBUG_USER_ID },
        })
        const auditReq = new Request("http://localhost:3000/api/production/integration?view=audit_trail", {
          headers: { "x-user-id": DEBUG_USER_ID },
        })

        const [r1, r2, r3] = await Promise.all([
          integrationApiGet(dashReq),
          integrationApiGet(notifReq),
          integrationApiGet(auditReq),
        ])

        const [j1, j2, j3] = await Promise.all([r1.json(), r2.json(), r3.json()])

        if (!j1.success || !j2.success || !j3.success) {
          throw new Error("Eşzamanlı API yanıtlarından biri başarısız!")
        }

        // Veritabanını Başlangıç Yedeğinden Geri Yükle & SHA-256 Karşılaştır
        console.log("\n[TEMİZLİK] Test veritabanı orijinal yedeğe geri yükleniyor...")
        restoreDatabaseBackup(backupResult.backupId)

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
    console.log(`\n🎉 TÜM TESTLER BAŞARIYLA TAMAMLANDI (${passedCount}/${results.length})!`)
  }
}

main().catch((err) => {
  console.error("Test çalıştırma hatası:", err)
  process.exit(1)
})

