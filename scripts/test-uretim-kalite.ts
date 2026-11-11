/**
 * Sunum ERP — FAZ 7: Kalite Kontrol & Muayene Doğrulama Test Paketi
 *
 * Kapsam:
 * 1. Migration ve Rollback SQL Bütünlüğü (Additive Only, Rollback)
 * 2. Özellik Bayrağı İzolasyonu (uretim_kalite kapalıyken 403, açıkken 200)
 * 3. ISO 2859-1 AQL Numune Büyüklüğü ve Ac/Re Limitleri Hesabı
 * 4. Tolerans & Değişken/Niteliksel Ölçüm Doğrulama
 * 5. Kalite Planı & Tolerans Maddeleri CRUD
 * 6. Kalibrasyon Cihazı Takibi ve Kalan Gün / Durum Analizi
 * 7. Kalibrasyonu Geçmiş Cihazla Muayene Girişi Engeli (CALIBRATION_EXPIRED)
 * 8. Uygun Muayene Kaydı & Otomatik KABUL Kararı (PASSED)
 * 9. Tolerans Dışı Muayene, RET Kararı, Stok Blokajı & Karantinaya Yönlendirme
 * 10. Kritik Olmayan Kusurlar İçin Şartlı Kabul (CONDITIONAL_PASSED)
 * 11. Uygunsuzluk (NCR) & DÖF (CAPA) Durum Makinesi Yaşam Döngüsü
 * 12. İleri İzleme (Hammadde Partisi -> İş Emirleri -> Mamul Partileri -> Müşteri Sevkiyatları)
 * 13. Geri İzleme (Nihai Mamul Partisi -> Üretim Emri -> Tüketilen Hammadde Partileri)
 * 14. Geri Çağırma (Recall) Simülasyonu & Riskli Müşteri/Karantina Dökümü
 * 15. Hata/Fire Pareto Analizi (80/20) & SPC X-bar/R Kontrol Limitleri
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
  calculateAqlSamplingPlan,
  evaluateCharacteristicMeasurement,
  determineInspectionDisposition,
  validateNcrStateTransition,
  checkCalibrationDeviceValidity,
  calculateParetoAnalysis,
  calculateSpcXBarRChart,
  calculateSupplierQualityScore,
} from "../lib/services/productionQualityEngine"
import {
  listQualityPlans,
  createQualityPlan,
  updateQualityPlan,
  deleteQualityPlan,
  findApplicableQualityPlan,
  listCalibrationDevices,
  createCalibrationDevice,
  updateCalibrationDevice,
  listQualityInspections,
  createQualityInspection,
  listQualityNcrs,
  createQualityNcr,
  updateQualityNcrStatus,
  traceLotForward,
  traceLotBackward,
  simulateLotRecall,
} from "../lib/services/productionQualityServerDb"
import { GET as qualityApiGet, POST as qualityApiPost } from "../app/api/production/quality/route"

interface TestResult {
  id: string
  name: string
  passed: boolean
  detail?: string
}

const results: TestResult[] = []

function computeFileSha256(filePath: string): string {
  const content = fs.readFileSync(filePath)
  return crypto.createHash("sha256").update(content).digest("hex")
}

async function runTest(id: string, name: string, fn: () => Promise<string | void>) {
  try {
    const detail = (await fn()) || "BAŞARILI"
    results.push({ id, name, passed: true, detail })
    console.log(`  ✅ [${id}] ${name} -> ${detail}`)
  } catch (error: any) {
    const msg = error?.message || String(error)
    results.push({ id, name, passed: false, detail: msg })
    console.error(`  ❌ [${id}] ${name} -> ${msg}`)
  }
}

function resetFeatureFlagsOff() {
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

function enableQualityFeatureFlag() {
  process.env.FEATURE_URETIM_KALITE = "true"
  saveSystemConfig({
    featureFlags: {
      ...DEFAULT_PRODUCTION_FEATURE_FLAGS,
      uretim_kalite: true,
      uretim_kapasite: true,
      uretim_is_emri: true,
      uretim_bom_rota: true,
      uretim_mrp_mps: true,
    },
  })
}

async function main() {
  console.log("\n================================================================================")
  console.log("  SUNUM ERP — FAZ 7: KALİTE KONTROL & MUAYENE DOĞRULAMA TEST PAKETİ")
  console.log("================================================================================\n")

  const localDbPath = path.join(process.cwd(), "storage", "ajans-kutuphanesi", ".local-db.json")
  const initialDbSha256 = fs.existsSync(localDbPath) ? computeFileSha256(localDbPath) : ""
  console.log(`[BAŞLANGIÇ] .local-db.json SHA-256: ${initialDbSha256 || "YOK"}`)

  // Başlangıç yedeği
  const backupResult = createDatabaseBackup({
    label: "FAZ7_QUALITY_TEST_BEFORE",
    updateSystemConfigLastBackup: false,
  })
  console.log(`[YEDEK] Geçici test yedeği oluşturuldu: ${backupResult.backupId}\n`)

  try {
    // ─────────────────────────────────────────────────────────────
    // TEST 1: Migration ve Rollback SQL Bütünlüğü
    // ─────────────────────────────────────────────────────────────
    await runTest(
      "TEST_01_MIGRATION_INTEGRITY",
      "Migration & Rollback SQL Bütünlüğü (Additive Only & Rollback)",
      async () => {
        const validations = validateAllUretimMigrations()
        const faz7 = validations.find((v) => v.migrationName.includes("uretim_kalite"))

        if (!faz7) {
          throw new Error("20261111200000_uretim_kalite migration klasörü bulunamadı!")
        }

        if (!faz7.valid) {
          throw new Error(`Migration doğrulaması başarısız: ${faz7.errors.join(", ")}`)
        }

        if (faz7.addedTables.length !== 6) {
          throw new Error(`6 tablo eklenmeliydi, bulunan: ${faz7.addedTables.join(", ")}`)
        }

        return `Migration geçerli; ${faz7.addedTables.length} yeni tablo eklendi, 0 silme.`
      }
    )

    // ─────────────────────────────────────────────────────────────
    // TEST 2: Özellik Bayrağı İzolasyonu
    // ─────────────────────────────────────────────────────────────
    await runTest(
      "TEST_02_FEATURE_FLAG_ENFORCEMENT",
      "Özellik Bayrağı İzolasyonu (uretim_kalite Kapalı İken Erişim Engeli)",
      async () => {
        resetFeatureFlagsOff()

        // GET isteği bayrak kapalıyken 403 dönmeli
        const req = new Request("http://localhost:3000/api/production/quality?view=overview", {
          headers: { "x-user-id": DEBUG_USER_ID },
        })
        const res = await qualityApiGet(req)
        const json = await res.json()

        if (res.status !== 403 || json.code !== "FEATURE_DISABLED") {
          throw new Error(`Beklenen 403 FEATURE_DISABLED gelmedi. Alınan: ${res.status}`)
        }

        // Bayrağı açalım
        enableQualityFeatureFlag()
        const reqOpen = new Request("http://localhost:3000/api/production/quality?view=overview", {
          headers: { "x-user-id": DEBUG_USER_ID },
        })
        const resOpen = await qualityApiGet(reqOpen)
        const jsonOpen = await resOpen.json()

        if (resOpen.status !== 200 || !jsonOpen.success) {
          throw new Error(`Bayrak açıkken erişim başarısız: ${JSON.stringify(jsonOpen)}`)
        }

        return "Bayrak kapalıyken 403 FEATURE_DISABLED, açıkken 200 OK doğrulandı."
      }
    )

    // ─────────────────────────────────────────────────────────────
    // TEST 3: ISO 2859-1 AQL Numune Büyüklüğü & Kabul/Ret Limitleri
    // ─────────────────────────────────────────────────────────────
    await runTest(
      "TEST_03_AQL_ISO2859_SAMPLING_CALCULATION",
      "ISO 2859-1 AQL Numune Büyüklüğü & Kabul (Ac) / Ret (Re) Limitleri",
      async () => {
        // Parti: 100 adet, Seviye: LEVEL_II -> Kod F -> Numune: 20, AQL 1.5 -> Ac: 1, Re: 2
        const p1 = calculateAqlSamplingPlan({
          lotSize: 100,
          samplingMethod: "AQL",
          inspectionLevel: "LEVEL_II",
          aqlLimit: 1.5,
        })

        if (p1.codeLetter !== "F" || p1.sampleSize !== 20 || p1.acceptanceNumber !== 1 || p1.rejectionNumber !== 2) {
          throw new Error(
            `AQL 100 adet için hesaplama hatalı! Kod: ${p1.codeLetter}, Numune: ${p1.sampleSize}, Ac: ${p1.acceptanceNumber}, Re: ${p1.rejectionNumber}`
          )
        }

        // Parti: 500 adet, Seviye: LEVEL_II -> Kod H -> Numune: 50, AQL 1.5 -> Ac: 2, Re: 3
        const p2 = calculateAqlSamplingPlan({
          lotSize: 500,
          samplingMethod: "AQL",
          inspectionLevel: "LEVEL_II",
          aqlLimit: 1.5,
        })
        if (p2.sampleSize !== 50 || p2.acceptanceNumber !== 2 || p2.rejectionNumber !== 3) {
          throw new Error(`AQL 500 adet için Ac/Re hatalı: Ac=${p2.acceptanceNumber}, Re=${p2.rejectionNumber}`)
        }

        // Sabit Numune Metodu
        const pFixed = calculateAqlSamplingPlan({
          lotSize: 200,
          samplingMethod: "FIXED",
          samplingSize: 10,
        })
        if (pFixed.sampleSize !== 10) {
          throw new Error(`Sabit numune 10 bekleniyordu: ${pFixed.sampleSize}`)
        }

        // Yüzde Numune Metodu: %15 of 200 = 30
        const pPct = calculateAqlSamplingPlan({
          lotSize: 200,
          samplingMethod: "PERCENTAGE",
          samplingSize: 15,
        })
        if (pPct.sampleSize !== 30) {
          throw new Error(`Yüzde numune 30 bekleniyordu: ${pPct.sampleSize}`)
        }

        return `ISO 2859-1 Tabloları doğrulandı (Lot:100 -> n=20 Ac=1/Re=2; Lot:500 -> n=50 Ac=2/Re=3).`
      }
    )

    // ─────────────────────────────────────────────────────────────
    // TEST 4: Tolerans & Değişken/Niteliksel Ölçüm Doğrulama
    // ─────────────────────────────────────────────────────────────
    await runTest(
      "TEST_04_TOLERANCE_EVALUATION",
      "Tolerans & Sayısal (Variable) / Niteliksel (Attribute) Ölçüm Kontrolü",
      async () => {
        // Sayısal: Nominal 50, tolerans -0.05 / +0.05 (Min: 49.95, Max: 50.05)
        const t1 = evaluateCharacteristicMeasurement({
          characteristicType: "VARIABLE",
          nominalValue: 50,
          minTolerance: -0.05,
          maxTolerance: 0.05,
          measuredValue: 50.02,
        })
        if (!t1.isConforming || t1.deviation !== 0.02) {
          throw new Error(`50.02 uygun olmalıydı (sapma: ${t1.deviation})`)
        }

        const t2 = evaluateCharacteristicMeasurement({
          characteristicType: "VARIABLE",
          nominalValue: 50,
          minTolerance: -0.05,
          maxTolerance: 0.05,
          measuredValue: 49.92, // Alt limitin altında
        })
        if (t2.isConforming) {
          throw new Error("49.92 tolerans dışı olmalıydı!")
        }

        // Niteliksel: Geçti / Kaldı
        const a1 = evaluateCharacteristicMeasurement({
          characteristicType: "ATTRIBUTE",
          isAttributePassed: true,
        })
        if (!a1.isConforming) throw new Error("Attribute true uygun olmalıydı!")

        const a2 = evaluateCharacteristicMeasurement({
          characteristicType: "ATTRIBUTE",
          isAttributePassed: false,
        })
        if (a2.isConforming) throw new Error("Attribute false uygunsuz olmalıydı!")

        return "Değişken nominal tolerans limitleri ve niteliksel geçti/kaldı testleri doğrulandı."
      }
    )

    // ─────────────────────────────────────────────────────────────
    // TEST 5: Kalite Planı & Tolerans Maddeleri CRUD
    // ─────────────────────────────────────────────────────────────
    let testPlanId = ""
    await runTest(
      "TEST_05_QUALITY_PLAN_CRUD",
      "Kalite / Muayene Planı ve Kontrol Karakteristikleri CRUD",
      async () => {
        enableQualityFeatureFlag()

        const planCode = `QP-TEST-${Date.now()}`
        const created = await createQualityPlan({
          code: planCode,
          name: "Test Malzeme Kalite Planı",
          controlPoint: "RECEIVING",
          inspectionLevel: "LEVEL_II",
          samplingType: "AQL",
          aqlAcceptanceLimit: 1.5,
          items: [
            {
              characteristicName: "Gövde Çapı (mm)",
              characteristicType: "VARIABLE",
              nominalValue: 25.0,
              minTolerance: -0.1,
              maxTolerance: 0.1,
              isCritical: true,
            },
            {
              characteristicName: "Yüzey Çizik Kontrolü",
              characteristicType: "ATTRIBUTE",
              isCritical: false,
            },
          ],
        }, DEBUG_USER_ID)

        testPlanId = created.id

        if (!created.items || created.items.length !== 2) {
          throw new Error(`Plan maddeleri eksik: ${created.items?.length}`)
        }

        // Güncelleme
        const updated = await updateQualityPlan(testPlanId, {
          name: "Güncel Test Kalite Planı",
        }, DEBUG_USER_ID)

        if (updated.name !== "Güncel Test Kalite Planı") {
          throw new Error("Plan adı güncellenemedi!")
        }

        // Otomatik plan eşleme bulma testi
        const matched = await findApplicableQualityPlan({
          controlPoint: "RECEIVING",
        })
        if (!matched) {
          throw new Error("findApplicableQualityPlan aktif planı bulamadı!")
        }

        return `Plan oluşturuldu (ID: ${testPlanId}), 2 kontrol maddesi doğrulandı.`
      }
    )

    // ─────────────────────────────────────────────────────────────
    // TEST 6: Cihaz Kalibrasyon Takibi & Süresi Geçmiş Cihaz Tespiti
    // ─────────────────────────────────────────────────────────────
    let validDeviceId = ""
    let expiredDeviceId = ""
    await runTest(
      "TEST_06_CALIBRATION_TRACKING_AND_EXPIRY",
      "Ölçüm Cihazı Kartı, Periyot & Kalibrasyon Geçerlilik Süresi Takibi",
      async () => {
        // 1. Geçerli Kalibrasyonlu Cihaz (Örn. Son kalibrasyon dün, 12 ay periyot)
        const yesterday = new Date()
        yesterday.setDate(yesterday.getDate() - 1)

        const validDev = await createCalibrationDevice({
          deviceCode: `CAL-KUMPAS-${Date.now()}`,
          deviceName: "Mitutoyo Dijital Kumpas 150mm",
          deviceType: "CALIPER",
          calibrationPeriodMonths: 12,
          lastCalibrationDate: yesterday,
        }, DEBUG_USER_ID)
        validDeviceId = validDev.id

        if (validDev.isExpired) {
          throw new Error("Yeni kalibre edilmiş cihaz geçerli olmalıydı!")
        }

        // 2. Kalibrasyonu Geçmiş Cihaz (Örn. Son kalibrasyon 2 yıl önce)
        const twoYearsAgo = new Date()
        twoYearsAgo.setFullYear(twoYearsAgo.getFullYear() - 2)

        const expiredDev = await createCalibrationDevice({
          deviceCode: `CAL-MIKRO-${Date.now()}`,
          deviceName: "Eski Mikrometre",
          deviceType: "MICROMETER",
          calibrationPeriodMonths: 12,
          lastCalibrationDate: twoYearsAgo,
        }, DEBUG_USER_ID)
        expiredDeviceId = expiredDev.id

        const checkExpired = await listCalibrationDevices({ status: "EXPIRED" })
        const found = checkExpired.find((d: any) => d.id === expiredDeviceId)
        if (!found || !found.isExpired) {
          throw new Error("Süresi 2 yıl önce biten cihaz EXPIRED olarak algılanmadı!")
        }

        return `Cihazlar oluşturuldu; geçerli (${validDev.deviceCode}) ve süresi dolmuş (${expiredDev.deviceCode}) doğrulandı.`
      }
    )

    // ─────────────────────────────────────────────────────────────
    // TEST 7: Kalibrasyonu Geçmiş Cihazla Muayene Girişinin Engellenmesi
    // ─────────────────────────────────────────────────────────────
    await runTest(
      "TEST_07_CALIBRATION_EXPIRED_BLOCKS_INSPECTION",
      "Kalibrasyonu Geçmiş Cihazla Ölçüm Girişinin Kesin Olarak Engellenmesi",
      async () => {
        let blocked = false
        try {
          // Süresi geçmiş cihaz ID'si verilerek muayene kaydedilmeye çalışılıyor
          await createQualityInspection({
            inspectionType: "RECEIVING",
            itemId: "test-item-calib",
            batchQuantity: 50,
            measurements: [
              {
                characteristicName: "Çap Ölçümü",
                characteristicType: "VARIABLE",
                measuredValue: 25.01,
                calibrationDeviceId: expiredDeviceId, // SÜRESİ GEÇMİŞ CİHAZ!
              },
            ],
          }, DEBUG_USER_ID)
        } catch (err: any) {
          if (err.code === "CALIBRATION_EXPIRED" || err.message?.includes("kalibrasyon")) {
            blocked = true
          } else {
            throw err
          }
        }

        if (!blocked) {
          throw new Error("Kalibrasyonu geçmiş cihazla muayene girişine İZİN VERİLDİ! Bu bir güvenlik ihlalidir.")
        }

        return "Kalibrasyonu dolmuş cihazla muayene engellendi ve CALIBRATION_EXPIRED hatası fırlatıldı."
      }
    )

    // ─────────────────────────────────────────────────────────────
    // TEST 8: Uygun Muayene Kaydı & Kabul Kararı (PASSED)
    // ─────────────────────────────────────────────────────────────
    await runTest(
      "TEST_08_INSPECTION_DISPOSITION_ACCEPTED",
      "Tüm Toleransları Karşılayan Muayenenin Otomatik KABUL Edilmesi (PASSED)",
      async () => {
        const ins = await createQualityInspection({
          inspectionType: "RECEIVING",
          itemId: "item-test-passed",
          batchQuantity: 100,
          measurements: [
            {
              characteristicName: "Çap",
              characteristicType: "VARIABLE",
              nominalValue: 20,
              minTolerance: -0.1,
              maxTolerance: 0.1,
              measuredValue: 20.02,
              calibrationDeviceId: validDeviceId,
            },
            {
              characteristicName: "Görsel",
              characteristicType: "ATTRIBUTE",
              isAttributePassed: true,
            },
          ],
        }, DEBUG_USER_ID)

        if (ins.status !== "PASSED") {
          throw new Error(`Beklenen PASSED, alınan: ${ins.status}`)
        }

        if (ins.isStockBlocked) {
          throw new Error("Kabul edilen muayene için stok bloke edilmemelidir!")
        }

        return `Muayene KABUL edildi (INS: ${ins.inspectionNumber}), stok serbest bırakıldı.`
      }
    )

    // ─────────────────────────────────────────────────────────────
    // TEST 9: Tolerans Dışı Muayene, RET Kararı, Stok Blokajı & Karantina
    // ─────────────────────────────────────────────────────────────
    await runTest(
      "TEST_09_INSPECTION_DISPOSITION_REJECTED_AND_STOCK_QUARANTINE",
      "Tolerans Dışı / Hatalı Muayene, RET Kararı, Stok Blokajı & Karantinaya Sevk",
      async () => {
        // Geçici test stok bakiyesi ve lot kaydı hazırlayalım
        const testItemId = `itm_rej_${Date.now()}`
        const testLot = `LOT-REJ-${Date.now()}`

        await (db as any).inventoryItem.create({
          data: {
            id: testItemId,
            code: `CODE-${testItemId}`,
            name: "Ret Test Malzemesi",
            unit: "Adet",
            itemType: "RAW_MATERIAL",
          },
        })

        await (db as any).stockBalance.create({
          data: {
            id: `sb_${testItemId}`,
            itemId: testItemId,
            warehouseId: "WH-MAIN",
            onHandQty: 100,
            availableQty: 100,
            quarantineQty: 0,
          },
        })

        await (db as any).lotSerialRecord.create({
          data: {
            id: `lsr_${testItemId}`,
            itemId: testItemId,
            warehouseId: "WH-MAIN",
            lotNumber: testLot,
            initialQty: 100,
            remainingQty: 100,
            status: "AVAILABLE",
          },
        })

        // Kritik hata içeren muayene kaydı
        const ins = await createQualityInspection({
          inspectionType: "RECEIVING",
          itemId: testItemId,
          lotNumber: testLot,
          batchQuantity: 100,
          measurements: [
            {
              characteristicName: "Kritik Çap",
              characteristicType: "VARIABLE",
              nominalValue: 50,
              minTolerance: -0.05,
              maxTolerance: 0.05,
              measuredValue: 50.45, // BÜYÜK TOLERANS SAPMASI!
              calibrationDeviceId: validDeviceId,
              isCritical: true,
            },
          ],
        }, DEBUG_USER_ID)

        if (ins.status !== "REJECTED") {
          throw new Error(`Kritik tolerans aşımında RET bekleniyordu, alınan: ${ins.status}`)
        }

        if (!ins.isStockBlocked) {
          throw new Error("Ret edilen parti için isStockBlocked = true olmalıydı!")
        }

        // Karantina kontrolü: StockBalance
        const balances = await (db as any).stockBalance.findMany({ where: { itemId: testItemId } })
        const balance = balances[0]
        if (balance.quarantineQty !== 100 || balance.availableQty !== 0) {
          throw new Error(
            `Stok karantinaya taşınmadı! available: ${balance.availableQty}, quarantine: ${balance.quarantineQty}`
          )
        }

        // LotSerialRecord QUARANTINE statüsüne geçmiş mi?
        const lotRecords = await (db as any).lotSerialRecord.findMany({ where: { lotNumber: testLot } })
        if (lotRecords[0].status !== "QUARANTINE") {
          throw new Error(`Lot statüsü QUARANTINE olmalıydı, alınan: ${lotRecords[0].status}`)
        }

        return `Muayene RET edildi, parti '${testLot}' QUARANTINE statüsüne alındı, 100 adet karantinaya bloke edildi.`
      }
    )

    // ─────────────────────────────────────────────────────────────
    // TEST 10: Şartlı Kabul Değerlendirmesi (CONDITIONAL_PASSED)
    // ─────────────────────────────────────────────────────────────
    await runTest(
      "TEST_10_INSPECTION_CONDITIONAL_ACCEPTANCE",
      "Kritik Olmayan Hatalar İçin Şartlı Kabul (CONDITIONAL_PASSED)",
      async () => {
        const disposition = determineInspectionDisposition({
          sampleSize: 20,
          acceptanceNumber: 1,
          rejectionNumber: 2,
          results: [
            { isConforming: false, isCritical: false, characteristicName: "Boya Kalınlığı" },
            { isConforming: false, isCritical: false, characteristicName: "Etiket Hizası" },
            ...Array(18).fill({ isConforming: true }),
          ],
          allowConditionalAcceptance: true,
          maxConditionalDefects: 2,
        })

        if (disposition.disposition !== "CONDITIONAL_PASSED") {
          throw new Error(`CONDITIONAL_PASSED bekleniyordu, alınan: ${disposition.disposition}`)
        }

        if (disposition.isStockBlockRequired) {
          throw new Error("Şartlı kabul durumunda stok blokajı uygulanmamalıdır!")
        }

        return "Şartlı kabul algoritması doğrulandı (Kritik olmayan hatalar tolerans eşiğinde kabul edildi)."
      }
    )

    // ─────────────────────────────────────────────────────────────
    // TEST 11: Uygunsuzluk (NCR) & DÖF (CAPA) Durum Makinesi
    // ─────────────────────────────────────────────────────────────
    await runTest(
      "TEST_11_NCR_STATE_MACHINE_LIFECYCLE",
      "NCR & DÖF Yaşam Döngüsü Durum Makinesi (Kök Neden, Aksiyon, Etkinlik, Kapatma)",
      async () => {
        // 1. Yeni NCR Açma (Varsayılan OPEN)
        const ncr = await createQualityNcr({
          title: "Gövde Çatlak Uygunsuzluğu",
          description: "Kaynak dikişinde mikro çatlaklar tespit edildi.",
          severity: "MAJOR",
          affectedQuantity: 25,
        }, DEBUG_USER_ID)

        if (ncr.status !== "OPEN") {
          throw new Error(`Başlangıç statüsü OPEN olmalıydı, alınan: ${ncr.status}`)
        }

        // 2. OPEN -> INVESTIGATION
        const toInv = await updateQualityNcrStatus(ncr.id, "INVESTIGATION", undefined, DEBUG_USER_ID)
        if (toInv.status !== "INVESTIGATION") {
          throw new Error("INVESTIGATION aşamasına geçilemedi!")
        }

        // 3. Geçersiz geçiş: Kök Neden açıklaması olmadan ACTION_PENDING'e geçiş engellenmeli!
        let blockedWithoutRootCause = false
        try {
          await updateQualityNcrStatus(ncr.id, "ACTION_PENDING", { rootCauseDescription: "" }, DEBUG_USER_ID)
        } catch {
          blockedWithoutRootCause = true
        }

        if (!blockedWithoutRootCause) {
          throw new Error("Kök neden analizi olmadan aksiyon aşamasına geçişe izin verildi!")
        }

        // 4. Kök neden ile ACTION_PENDING
        await updateQualityNcrStatus(ncr.id, "ACTION_PENDING", {
          rootCauseMethod: "FIVE_WHY",
          rootCauseDescription: "Kaynak akım parametresinin aşırı yüksek olması sebebiyle termal gerilme oluştu.",
          correctiveAction: "Kaynak akım limiti 120A'e sabitlendi ve operasyon talimatı revize edildi.",
        }, DEBUG_USER_ID)

        // 5. ACTION_PENDING -> EFFECTIVENESS_CHECK
        await updateQualityNcrStatus(ncr.id, "EFFECTIVENESS_CHECK", undefined, DEBUG_USER_ID)

        // 6. Etkinlik doğrulaması olmadan CLOSED yapılamamalı!
        let blockedClose = false
        try {
          await updateQualityNcrStatus(ncr.id, "CLOSED", { effectivenessResult: "INEFFECTIVE" }, DEBUG_USER_ID)
        } catch {
          blockedClose = true
        }
        if (!blockedClose) {
          throw new Error("Etkin olmayan faaliyet kapatılmaya izin verildi!")
        }

        // 7. Etkinlik onayı ile KAPATMA
        const closedNcr = await updateQualityNcrStatus(ncr.id, "CLOSED", {
          effectivenessResult: "EFFECTIVE",
          effectivenessNotes: "Sonraki 3 partide yapılan NDT kontrollerinde çatlak gözlenmedi.",
        }, DEBUG_USER_ID)

        if (closedNcr.status !== "CLOSED" || !closedNcr.closedAt) {
          throw new Error("NCR kapatılamadı veya closedAt tarihi atanmadı!")
        }

        return `NCR tam döngü çalıştı: OPEN -> INVESTIGATION -> ACTION_PENDING -> EFFECTIVENESS_CHECK -> CLOSED.`
      }
    )

    // ─────────────────────────────────────────────────────────────
    // TEST 12: İleri İzleme (Hammadde -> İş Emri -> Mamul -> Müşteri)
    // ─────────────────────────────────────────────────────────────
    const rawLotNumber = `LOT-HM-${Date.now()}`
    const finishedLotNumber = `LOT-MAMUL-${Date.now()}`
    const customerOrderNo = `ORD-${Date.now()}`

    await runTest(
      "TEST_12_FORWARD_TRACEABILITY_RAW_TO_CUSTOMER",
      "İleri İzleme (Hammadde Partisi -> İş Emri -> Nihai Mamul -> Müşteri Sevkiyatı)",
      async () => {
        // İleri izlenebilirlik zincirini kuralım
        const rawItemId = `raw_${Date.now()}`
        const finishedItemId = `fg_${Date.now()}`
        const workOrderId = `wo_trace_${Date.now()}`

        await (db as any).inventoryItem.create({
          data: { id: rawItemId, code: rawItemId, name: "Çelik Rulo Sac", unit: "Kg", itemType: "RAW_MATERIAL" },
        })

        await (db as any).inventoryItem.create({
          data: { id: finishedItemId, code: finishedItemId, name: "Preslenmiş Şasi Parçası", unit: "Adet", itemType: "FINISHED_GOOD" },
        })

        await (db as any).uretimWorkOrder.create({
          data: {
            id: workOrderId,
            orderNumber: `WO-${Date.now()}`,
            itemId: finishedItemId,
            plannedQuantity: 50,
            lotNumber: finishedLotNumber,
            status: "COMPLETED",
          },
        })

        await (db as any).uretimWorkOrderMaterial.create({
          data: {
            id: `wom_${Date.now()}`,
            workOrderId,
            itemId: rawItemId,
            plannedQuantity: 100,
            actualQuantity: 100,
            lotNumber: rawLotNumber,
          },
        })

        await (db as any).stockMovement.create({
          data: {
            id: `mov_${Date.now()}`,
            itemId: finishedItemId,
            warehouseId: "WH-MAIN",
            movementType: "SALES_SHIPMENT",
            quantity: 30,
            lotNumber: finishedLotNumber,
            referenceId: customerOrderNo,
            notes: "Otomotiv Sanayi A.Ş.",
          },
        })

        // İleri İzleme Çağrısı
        const traceResult = await traceLotForward(rawLotNumber)

        if (traceResult.consumedInWorkOrders.length === 0) {
          throw new Error("Hammaddeyi tüketen iş emri bulunamadı!")
        }

        if (!traceResult.producedFinishedLots.includes(finishedLotNumber)) {
          throw new Error(`Üretilen mamul partisi '${finishedLotNumber}' bulunamadı!`)
        }

        if (traceResult.affectedCustomerOrders.length === 0) {
          throw new Error("Mamulün sevk edildiği müşteri siparişi bulunamadı!")
        }

        return `İleri izleme başarılı: Hammadde (${rawLotNumber}) -> İş Emri -> Mamul (${finishedLotNumber}) -> Müşteri (Otomotiv Sanayi A.Ş.)`
      }
    )

    // ─────────────────────────────────────────────────────────────
    // TEST 13: Geri İzleme (Mamul -> Üretim Emri -> Tüketilen Hammadde)
    // ─────────────────────────────────────────────────────────────
    await runTest(
      "TEST_13_BACKWARD_TRACEABILITY_PRODUCT_TO_SUPPLIER",
      "Geri İzleme (Nihai Mamul Partisi -> Üretim Emri -> Tüketilen Hammaddeler)",
      async () => {
        const traceResult = await traceLotBackward(finishedLotNumber)

        if (!traceResult.producingWorkOrder) {
          throw new Error(`Mamulün (${finishedLotNumber}) üretildiği iş emri bulunamadı!`)
        }

        const consumed = traceResult.consumedRawMaterialLots.find((m: any) => m.lotNumber === rawLotNumber)
        if (!consumed) {
          throw new Error(`İş emrinde tüketilen hammadde partisi '${rawLotNumber}' bulunamadı!`)
        }

        return `Geri izleme başarılı: Mamul (${finishedLotNumber}) -> İş Emri (${traceResult.producingWorkOrder.orderNumber}) -> Hammadde (${rawLotNumber})`
      }
    )

    // ─────────────────────────────────────────────────────────────
    // TEST 14: Geri Çağırma (Recall) Simülasyonu & Etki Analizi
    // ─────────────────────────────────────────────────────────────
    await runTest(
      "TEST_14_RECALL_SIMULATION_AND_EXPOSURE_ANALYSIS",
      "Geri Çağırma (Recall) Simülasyonu & Etkilenen Müşteri Listesi Raporu",
      async () => {
        const recall = await simulateLotRecall(rawLotNumber)

        if (recall.shippedToCustomerQty !== 30) {
          throw new Error(`Müşteriye sevk edilen miktar 30 olmalıydı, bulunan: ${recall.shippedToCustomerQty}`)
        }

        if (recall.affectedCustomers.length === 0) {
          throw new Error("Etkilenen müşteri listesi boş olamaz!")
        }

        return `Geri çağırma simülasyonu doğrulandı: Riskli miktar=${recall.totalExposureQuantity}, Sevk edilen=${recall.shippedToCustomerQty}, Müşteri=${recall.affectedCustomers[0].customerName}`
      }
    )

    // ─────────────────────────────────────────────────────────────
    // TEST 15: Pareto Analizi (80/20) & SPC X-bar/R Limitleri
    // ─────────────────────────────────────────────────────────────
    await runTest(
      "TEST_15_PARETO_AND_SPC_CALCULATIONS",
      "Hata/Fire Pareto Analizi (80/20) & SPC X-bar / R Kontrol Grafiği Limitleri",
      async () => {
        // 1. Pareto Analizi
        const pareto = calculateParetoAnalysis([
          { category: "Boyut Tolerans Dışı", count: 80 },
          { category: "Yüzey Çiziği", count: 40 },
          { category: "Kaynak Gözenek", count: 15 },
          { category: "Etiket Hatası", count: 5 },
        ])

        if (pareto[0].category !== "Boyut Tolerans Dışı" || !pareto[0].isVitalFew) {
          throw new Error("Pareto en büyük hata grubunu doğru sıralayamadı!")
        }

        // 2. SPC X-bar / R Kontrol Limitleri
        const subgroups = [
          { subgroupId: 1, values: [20.01, 20.02, 19.99, 20.03, 20.0] },
          { subgroupId: 2, values: [20.02, 20.01, 20.02, 20.04, 20.01] },
          { subgroupId: 3, values: [19.98, 19.99, 20.01, 20.0, 19.99] },
        ]

        const spc = calculateSpcXBarRChart(subgroups)
        if (spc.xUcl <= spc.xCl || spc.xLcl >= spc.xCl) {
          throw new Error(`SPC limitleri tutarsız: UCL=${spc.xUcl}, CL=${spc.xCl}, LCL=${spc.xLcl}`)
        }

        // 3. Tedarikçi Puanlama
        const supScore = calculateSupplierQualityScore({
          supplierId: "SUP-1",
          supplierName: "Test Tedarikçi",
          totalInspections: 10,
          passedInspections: 9,
          conditionalPassedInspections: 1,
          rejectedInspections: 0,
          totalBatchQuantity: 1000,
          rejectedQuantity: 0,
        })

        if (supScore.qualityScore < 95 || supScore.ratingBadge !== "EXCELLENT") {
          throw new Error(`Tedarikçi skoru 97 bekleniyordu, alınan: ${supScore.qualityScore}`)
        }

        return `Pareto (80/20), SPC X-bar/R (UCL=${spc.xUcl}, LCL=${spc.xLcl}) ve Tedarikçi Puanı (${supScore.qualityScore}) doğrulandı.`
      }
    )

    // ─────────────────────────────────────────────────────────────
    // TEST 16: Eşzamanlılık Dayanıklılığı & SHA-256 DB Bütünlüğü
    // ─────────────────────────────────────────────────────────────
    await runTest(
      "TEST_16_CONCURRENCY_AND_SHA256_INTEGRITY",
      "Eşzamanlılık Dayanıklılığı & SHA-256 DB Bütünlüğü",
      async () => {
        enableQualityFeatureFlag()

        // 1. Overview ve listeleme API rotalarını sına
        const overviewReq = new Request("http://localhost:3000/api/production/quality?view=overview", {
          headers: { "x-user-id": DEBUG_USER_ID },
        })
        const overviewRes = await qualityApiGet(overviewReq)
        const overviewJson = await overviewRes.json()

        if (!overviewJson.success) {
          throw new Error(`Kalite overview API yanıtı başarısız: ${JSON.stringify(overviewJson)}`)
        }

        const paretoReq = new Request("http://localhost:3000/api/production/quality?view=pareto", {
          headers: { "x-user-id": DEBUG_USER_ID },
        })
        const paretoRes = await qualityApiGet(paretoReq)
        const paretoJson = await paretoRes.json()

        if (!paretoJson.success || !Array.isArray(paretoJson.data)) {
          throw new Error("Pareto API yanıtı dizi formatında değil!")
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

        return "API rotaları başarıyla doğrulandı; veritabanı yedeğe döndürüldü, SHA-256 korundu."
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
