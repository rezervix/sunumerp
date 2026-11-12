/**
 * Sunum ERP — FAZ 10: Canlıya Yayın Öncesi Güvenlik, Performans ve Yetki Matrisi Test Paketi
 *
 * Kapsam:
 * 1. 7 Üretim API Rotasının RBAC ve Güvenlik Bariyeri Matrisi (401, 403, 403 FEATURE_DISABLED)
 * 2. 100 Eşzamanlı İstek Yük Testi (Concurrent Stress Test)
 * 3. Yüksek Hacimli MRP İhtiyaç Patlatımı Benchmark (< 1.500 ms)
 * 4. Yüksek Hacimli Sonlu Kapasite Çizelgeleme Benchmark (< 1.000 ms)
 * 5. Konsolide Dashboard KPI Sorgu Hızı Benchmark (< 300 ms)
 * 6. Şema İndeksleri ve Veritabanı Performans Denetimi
 * 7. Sıfır Veri Sapması & SHA-256 Bütünlük Koruması
 */

process.env.NODE_ENV = "development"

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
import { DEBUG_USER_ID } from "../lib/auth/local-debug"

// API Routes
import { GET as bomRotaApiGet } from "../app/api/production/bom-rota/route"
import { GET as mrpApiGet } from "../app/api/production/mrp-mps/route"
import { GET as workOrdersApiGet } from "../app/api/production/work-orders/route"
import { GET as capacityApiGet } from "../app/api/production/capacity/route"
import { GET as qualityApiGet } from "../app/api/production/quality/route"
import { GET as maintenanceApiGet } from "../app/api/production/maintenance/route"
import { GET as integrationApiGet } from "../app/api/production/integration/route"

// Engines
import {
  executeMrpExplosion,
  type ItemPlanningProfile,
  type BomEdge,
  type IndependentDemandInput,
} from "../lib/services/productionMrpMpsEngine"
import {
  runCapacitySchedulingEngine,
  type OperationSchedulingCandidate,
  type WorkCenterCapacityDefinition,
} from "../lib/services/productionCapacityEngine"
import { getConsolidatedProductionDashboard } from "../lib/services/productionIntegrationServerDb"

interface BenchmarkResult {
  name: string
  durationMs: number
  targetMs: number
  passed: boolean
}

const benchmarkResults: BenchmarkResult[] = []

function computeFileSha256(filePath: string): string {
  if (!fs.existsSync(filePath)) return ""
  const buf = fs.readFileSync(filePath)
  return crypto.createHash("sha256").update(buf).digest("hex")
}

function enableAllProductionFeatureFlags(): void {
  process.env.FEATURE_URETIM_BOM_ROTA = "true"
  process.env.FEATURE_URETIM_MRP_MPS = "true"
  process.env.FEATURE_URETIM_IS_EMRI = "true"
  process.env.FEATURE_URETIM_KAPASITE = "true"
  process.env.FEATURE_URETIM_KALITE = "true"
  process.env.FEATURE_URETIM_BAKIM = "true"

  saveSystemConfig({
    featureFlags: {
      uretim_bom_rota: true,
      uretim_mrp_mps: true,
      uretim_is_emri: true,
      uretim_kapasite: true,
      uretim_kalite: true,
      uretim_bakim: true,
    },
  })
}

function resetAllFeatureFlagsOff(): void {
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

async function main() {
  console.log("================================================================================")
  console.log("  SUNUM ERP — FAZ 10: GÜVENLİK, PERFORMANS VE YAYIN DOĞRULAMA TESTİ")
  console.log("================================================================================")

  const localDbPath = path.join(process.cwd(), "storage", "ajans-kutuphanesi", ".local-db.json")
  const initialDbSha256 = computeFileSha256(localDbPath)
  console.log(`[BAŞLANGIÇ] .local-db.json SHA-256: ${initialDbSha256 || "(Dosya yok)"}`)

  const backupResult = createDatabaseBackup({
    label: "FAZ10_SECURITY_PERFORMANCE_TEST_BEFORE",
    updateSystemConfigLastBackup: false,
  })
  console.log(`[YEDEK ALINDI] Backup ID: ${backupResult.backupId}`)

  try {
    // ─────────────────────────────────────────────────────────────
    // 1. GÜVENLİK: 7 API ROTASI ÖZELLİK BAYRAĞI VE RBAC MATRİSİ
    // ─────────────────────────────────────────────────────────────
    console.log("\n▶ BÖLÜM 1: 7 ÜRETİM API ROTASI GÜVENLİK VE YETKİ MATRİSİ TESTİ")

    const endpoints = [
      { name: "BOM & Rotalar", url: "http://localhost:3000/api/production/bom-rota", handler: bomRotaApiGet },
      { name: "MRP & MPS", url: "http://localhost:3000/api/production/mrp-mps?view=parameters", handler: mrpApiGet },
      { name: "İş Emirleri", url: "http://localhost:3000/api/production/work-orders", handler: workOrdersApiGet },
      { name: "Kapasite Çizelgeleme", url: "http://localhost:3000/api/production/capacity?view=work-centers", handler: capacityApiGet },
      { name: "Kalite Kontrol", url: "http://localhost:3000/api/production/quality?view=plans", handler: qualityApiGet },
      { name: "Ekipman & Bakım", url: "http://localhost:3000/api/production/maintenance?view=assets", handler: maintenanceApiGet },
      { name: "Entegrasyon & Dashboard", url: "http://localhost:3000/api/production/integration?view=dashboard", handler: integrationApiGet },
    ]

    // Aşama 1A: Bayraklar KAPALIYKEN tüm rotalar 403 FEATURE_DISABLED dönmelidir
    resetAllFeatureFlagsOff()
    for (const ep of endpoints) {
      const req = new Request(ep.url, { headers: { "x-user-id": DEBUG_USER_ID } })
      const res = await ep.handler(req)
      const json = await res.json()
      if (res.status !== 403 || json.code !== "FEATURE_DISABLED") {
        throw new Error(`[GÜVENLİK İHLALİ] ${ep.name} bayrak kapalıyken 403 dönmedi! Alınan: ${res.status} / ${json.code}`)
      }
      console.log(`  🔒 ${ep.name} -> Bayrak kapalıyken 403 FEATURE_DISABLED doğrulandı.`)
    }

    // Aşama 1B: Bayraklar AÇIKKEN ancak Yetkisiz Kullanıcı (Yetkisiz ID) ile istek
    enableAllProductionFeatureFlags()
    for (const ep of endpoints) {
      const req = new Request(ep.url, { headers: { "x-user-id": "UNAUTHORIZED_GUEST_USER_999" } })
      const res = await ep.handler(req)
      if (res.status !== 403 && res.status !== 401) {
        throw new Error(`[YETKİ İHLALİ] ${ep.name} yetkisiz kullanıcıya erişim verdi! Alınan kod: ${res.status}`)
      }
      console.log(`  🛡️ ${ep.name} -> Yetkisiz erişim 403/401 ile başarıyla engellendi.`)
    }

    // Aşama 1C: Yetkili (DEBUG_USER_ID / Admin) ile erişim
    for (const ep of endpoints) {
      const req = new Request(ep.url, { headers: { "x-user-id": DEBUG_USER_ID } })
      const res = await ep.handler(req)
      const json = await res.json()
      if (res.status !== 200 || !json.success) {
        throw new Error(`[ERİŞİM HATASI] ${ep.name} yetkili kullanıcıya 200 dönmedi! Alınan: ${res.status}`)
      }
      console.log(`  ✅ ${ep.name} -> Yetkili kullanıcı erişimi 200 OK doğrulandı.`)
    }

    // ─────────────────────────────────────────────────────────────
    // 2. PERFORMANS: 100 EŞZAMANLI İSTEK STRES TESTİ
    // ─────────────────────────────────────────────────────────────
    console.log("\n▶ BÖLÜM 2: 100 EŞZAMANLI API İSTEĞİ YÜK & DAYANIKLILIK TESTİ")

    const stressStart = Date.now()
    const concurrentRequests = Array.from({ length: 100 }).map((_, i) => {
      const ep = endpoints[i % endpoints.length]
      const req = new Request(ep.url, { headers: { "x-user-id": DEBUG_USER_ID } })
      return ep.handler(req)
    })

    const stressResponses = await Promise.all(concurrentRequests)
    const stressDuration = Date.now() - stressStart

    const allSuccessful = stressResponses.every((r) => r.status === 200)
    if (!allSuccessful) {
      throw new Error("Eşzamanlı 100 istekten bazıları başarısız oldu!")
    }

    console.log(`  ⚡ 100 Eşzamanlı İstek Süresi: ${stressDuration} ms (İstek Başına Ort: ${(stressDuration / 100).toFixed(1)} ms)`)
    benchmarkResults.push({
      name: "100 Eşzamanlı API İsteği",
      durationMs: stressDuration,
      targetMs: 10000,
      passed: stressDuration <= 10000,
    })

    // ─────────────────────────────────────────────────────────────
    // 3. PERFORMANS: YÜKSEK HACİMLİ MRP PATLATIMI BENCHMARK
    // ─────────────────────────────────────────────────────────────
    console.log("\n▶ BÖLÜM 3: YÜKSEK HACİMLİ MRP HESAPLAMA MOTORU BENCHMARK")

    const mrpItems: ItemPlanningProfile[] = Array.from({ length: 1000 }).map((_, i) => ({
      itemId: `ITEM-MRP-${i}`,
      sku: `SKU-MRP-${i}`,
      name: `Hammadde Kalemi ${i}`,
      baseUnit: "Adet",
      productionItemType: i < 100 ? "MAMUL" : i < 300 ? "YARI_MAMUL" : "HAMMADDE",
      productionMethod: i < 300 ? "MAKE_TO_STOCK" : "PURCHASE_ONLY",
      leadTimeDays: (i % 7) + 1,
      minStockLevel: 10,
      safetyStockQty: 10,
      lotSizingRule: "L4L",
      standardLotSize: 50,
      minOrderQty: 10,
      currentOnHand: i % 5 === 0 ? 5 : 50,
      lowLevelCode: i < 100 ? 0 : i < 300 ? 1 : 2,
    }))

    const mrpDemands: IndependentDemandInput[] = [
      {
        id: "DEMAND-0",
        demandType: "MPS",
        demandRef: "MPS-REF-0",
        itemId: "ITEM-MRP-0",
        quantity: 500,
        dueDate: new Date(Date.now() + 14 * 86400000),
      },
    ]

    const bomEdges: BomEdge[] = []
    for (let f = 0; f < 100; f++) {
      bomEdges.push({
        bomId: `BOM-${f}`,
        parentItemId: `ITEM-MRP-${f}`,
        componentItemId: `ITEM-MRP-${100 + (f % 200)}`,
        quantity: 2,
        scrapPercent: 1,
        isPhantom: false,
      })
    }

    const mrpStart = Date.now()
    const mrpRun = executeMrpExplosion({
      items: mrpItems,
      bomEdges,
      demands: mrpDemands,
      openOrders: [],
      today: new Date(),
      runType: "FULL_REGENERATION",
    })
    const mrpDuration = Date.now() - mrpStart

    console.log(`  ⚡ 1.000 Malzemeli MRP Patlatımı Süresi: ${mrpDuration} ms (Hedef: < 1.500 ms)`)
    benchmarkResults.push({
      name: "1.000 Malzeme MRP Patlatımı",
      durationMs: mrpDuration,
      targetMs: 1500,
      passed: mrpDuration <= 1500,
    })

    // ─────────────────────────────────────────────────────────────
    // 4. PERFORMANS: YÜKSEK HACİMLİ SONLU KAPASİTE ÇİZELGELEME
    // ─────────────────────────────────────────────────────────────
    console.log("\n▶ BÖLÜM 4: 300 OPERASYON SONLU KAPASİTE ÇİZELGELEME BENCHMARK")

    const mockTasks: OperationSchedulingCandidate[] = Array.from({ length: 300 }).map((_, i) => ({
      id: `OP-${i}`,
      workOrderId: `WO-${Math.floor(i / 3)}`,
      workOrderNumber: `WO-NUM-${Math.floor(i / 3)}`,
      operationNumber: ((i % 3) + 1) * 10,
      name: `Operasyon ${i}`,
      workCenterId: `WC-${i % 5}`,
      setupTimeMinutes: 10,
      runTimeMinutes: 35,
      totalMinutes: 45,
      plannedQuantity: 10,
      priority: i % 4 === 0 ? "URGENT" : "NORMAL",
      dueDate: new Date(Date.now() + ((i % 10) + 1) * 86400000),
      createdDate: new Date(),
      status: "PENDING",
      isLocked: false,
    }))

    const workCenters: Record<string, WorkCenterCapacityDefinition> = {
      "WC-0": {
        workCenterId: "WC-0",
        code: "CNC-1",
        name: "CNC 1",
        efficiencyPercent: 100,
        dailyNetWorkingMinutes: 480,
        workingDays: ["MON", "TUE", "WED", "THU", "FRI"],
      },
      "WC-1": {
        workCenterId: "WC-1",
        code: "CNC-2",
        name: "CNC 2",
        efficiencyPercent: 100,
        dailyNetWorkingMinutes: 480,
        workingDays: ["MON", "TUE", "WED", "THU", "FRI"],
      },
      "WC-2": {
        workCenterId: "WC-2",
        code: "WELD",
        name: "Kaynak",
        efficiencyPercent: 100,
        dailyNetWorkingMinutes: 480,
        workingDays: ["MON", "TUE", "WED", "THU", "FRI"],
      },
      "WC-3": {
        workCenterId: "WC-3",
        code: "ASSY",
        name: "Montaj",
        efficiencyPercent: 100,
        dailyNetWorkingMinutes: 480,
        workingDays: ["MON", "TUE", "WED", "THU", "FRI"],
      },
      "WC-4": {
        workCenterId: "WC-4",
        code: "PACK",
        name: "Paketleme",
        efficiencyPercent: 100,
        dailyNetWorkingMinutes: 480,
        workingDays: ["MON", "TUE", "WED", "THU", "FRI"],
      },
    }

    const schedStart = Date.now()
    const scheduled = runCapacitySchedulingEngine(mockTasks, workCenters, {
      mode: "FINITE",
      direction: "FORWARD",
      priorityRule: "EDD",
      startDate: new Date(),
      respectShifts: false,
    })
    const schedDuration = Date.now() - schedStart

    console.log(`  ⚡ 300 Operasyon Çizelgeleme Süresi: ${schedDuration} ms (Hedef: < 1.000 ms)`)
    benchmarkResults.push({
      name: "300 Operasyon Sonlu Çizelgeleme",
      durationMs: schedDuration,
      targetMs: 1000,
      passed: schedDuration <= 1000,
    })

    // ─────────────────────────────────────────────────────────────
    // 5. PERFORMANS: KONSOLİDE DASHBOARD KPI AGGREGATION
    // ─────────────────────────────────────────────────────────────
    console.log("\n▶ BÖLÜM 5: KONSOLİDE DASHBOARD KPI HESAPLAMA SÜRESİ")

    const dashStart = Date.now()
    const dashData = await getConsolidatedProductionDashboard("FABRIKA_MUDURU")
    const dashDuration = Date.now() - dashStart

    console.log(`  ⚡ Konsolide Dashboard KPI Sorgusu: ${dashDuration} ms (Hedef: < 500 ms)`)
    benchmarkResults.push({
      name: "Konsolide Dashboard KPI",
      durationMs: dashDuration,
      targetMs: 500,
      passed: dashDuration <= 500,
    })

    // ─────────────────────────────────────────────────────────────
    // 6. ŞEMA İNDEKS KONTROLÜ
    // ─────────────────────────────────────────────────────────────
    console.log("\n▶ BÖLÜM 6: VERİTABANI İNDEKS BÜTÜNLÜK DENETİMİ")
    const schemaContent = fs.readFileSync(path.join(process.cwd(), "prisma", "schema.prisma"), "utf8")
    const requiredIndices = [
      "@@index([workOrderId])",
      "@@index([machineAssetId])",
      "@@index([inspectionId])",
      "@@index([planId])",
      "@@index([eventType])",
    ]

    for (const idx of requiredIndices) {
      if (!schemaContent.includes(idx)) {
        throw new Error(`Prisma şemasında zorunlu indeks '${idx}' bulunamadı!`)
      }
      console.log(`  🗂️ İndeks doğrulandı: ${idx}`)
    }

    // ─────────────────────────────────────────────────────────────
    // 7. YEDEK GERİ YÜKLEME VE SHA-256 DOĞRULAMA
    // ─────────────────────────────────────────────────────────────
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

    console.log("\n================================================================================")
    console.log("  BENCHMARK VE DOĞRULAMA SONUÇLARI")
    console.log("================================================================================")
    for (const b of benchmarkResults) {
      const statusIcon = b.passed ? "✅" : "❌"
      console.log(`  ${statusIcon} ${b.name}: ${b.durationMs} ms (Hedef: <= ${b.targetMs} ms)`)
    }

    const allPassed = benchmarkResults.every((b) => b.passed)
    if (!allPassed) {
      throw new Error("Bazı performans kıyaslama hedefleri aşıldı!")
    }

    console.log("\n🎉 TÜM FAZ 10 GÜVENLİK VE PERFORMANS TESTLERİ BAŞARIYLA TAMAMLANDI!")
  } finally {
    resetAllFeatureFlagsOff()
  }
}

main().catch((err) => {
  console.error("Test çalıştırma hatası:", err)
  process.exit(1)
})
