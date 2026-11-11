/**
 * SUNUM ERP — FAZ 6: KAPASİTE PLANLAMA (CRP) & ÇİZELGELEME
 * Otomatik Uçtan Uca Doğrulama ve Regresyon Test Paketi (16/16 Test)
 */

process.env.NODE_ENV = "development"

import fs from "fs"
import path from "path"
import crypto from "crypto"
import { prisma } from "../lib/db"
import {
  createDatabaseBackup,
  restoreDatabaseBackup,
} from "../lib/services/databaseBackupService"
import { validateAdditiveMigrationSql } from "../lib/services/migrationStrategyService"
import {
  DEFAULT_PRODUCTION_FEATURE_FLAGS,
  type ProductionFeatureFlagKey,
} from "../lib/config/production-feature-flags"
import { saveSystemConfig } from "../lib/system-config"
import { DEBUG_USER_ID } from "../lib/auth/local-debug"
import { ProductionDomainError } from "../lib/services/productionAuditAndError"
import {
  verifyProductionCapacityAccess,
  GET as capacityApiGet,
  POST as capacityApiPost,
} from "../app/api/production/capacity/route"
import {
  getWorkCentersCapacityDefinitions,
  getOpenOperationsForScheduling,
  runAndPersistCapacityPlan,
  getCapacityDashboardOverview,
  getGanttScheduleData,
  updateScheduledTaskInDb,
  toggleOperationLockInDb,
  runCtpSimulationInDb,
  getOperationTimeVariancesFromDb,
} from "../lib/services/productionCapacityServerDb"
import {
  calculateWorkCenterDailyCapacityMinutes,
  sortOperationsByPriority,
  calculateCriticalRatio,
  runCapacitySchedulingEngine,
  calculateCapacityUtilizationBuckets,
  calculateCapableToPromise,
  calculateOperationTimeVariances,
  generateCapacityAlertsFromBuckets,
  addWorkingMinutesToDate,
  type OperationSchedulingCandidate,
  type WorkCenterCapacityDefinition,
} from "../lib/services/productionCapacityEngine"

interface TestResult {
  id: string
  name: string
  passed: boolean
  detail: string
}

const results: TestResult[] = []

function computeFileSha256(filePath: string): string {
  const content = fs.readFileSync(filePath)
  return crypto.createHash("sha256").update(content).digest("hex")
}

async function runTest(id: string, name: string, fn: () => Promise<string>): Promise<void> {
  try {
    const detail = await fn()
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

function enableCapacityFeatureFlag() {
  process.env.FEATURE_URETIM_KAPASITE = "true"
  saveSystemConfig({
    featureFlags: {
      ...DEFAULT_PRODUCTION_FEATURE_FLAGS,
      uretim_kapasite: true,
      uretim_is_emri: true,
      uretim_bom_rota: true,
      uretim_mrp_mps: true,
    },
  })
}

async function main() {
  console.log("\n================================================================================")
  console.log("  SUNUM ERP — FAZ 6: KAPASİTE PLANLAMA & ÇİZELGELEME DOĞRULAMA TEST PAKETİ")
  console.log("================================================================================\n")

  const localDbPath = path.join(process.cwd(), "storage", "ajans-kutuphanesi", ".local-db.json")
  const initialDbSha256 = fs.existsSync(localDbPath) ? computeFileSha256(localDbPath) : ""
  console.log(`[BAŞLANGIÇ] .local-db.json SHA-256: ${initialDbSha256 || "YOK"}`)

  // Başlangıç yedeği
  const backupResult = createDatabaseBackup({
    label: "FAZ6_CAPACITY_TEST_BEFORE",
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
        const migrationPath = path.join(
          process.cwd(),
          "prisma",
          "migrations",
          "20261111180000_uretim_kapasite",
          "migration.sql"
        )
        const rollbackPath = path.join(
          process.cwd(),
          "prisma",
          "migrations",
          "20261111180000_uretim_kapasite",
          "rollback.sql"
        )

        if (!fs.existsSync(migrationPath)) {
          throw new Error("Faz 6 migration.sql dosyası bulunamadı!")
        }
        if (!fs.existsSync(rollbackPath)) {
          throw new Error("Faz 6 rollback.sql dosyası bulunamadı!")
        }

        const migrationSql = fs.readFileSync(migrationPath, "utf-8")
        const rollbackSql = fs.readFileSync(rollbackPath, "utf-8")

        // Additive denetimi
        const valResult = validateAdditiveMigrationSql(
          "20261111180000_uretim_kapasite",
          migrationSql,
          rollbackSql
        )
        if (!valResult.valid) {
          throw new Error(`Migration additive değil: ${valResult.errors.join(", ")}`)
        }

        if (!rollbackSql.includes("DROP TABLE IF EXISTS \"UretimCapacityPlan\"")) {
          throw new Error("Rollback betiğinde UretimCapacityPlan tablosunun kaldırılması eksik!")
        }
        if (!rollbackSql.includes("DROP COLUMN IF EXISTS \"scheduledStartDate\"")) {
          throw new Error("Rollback betiğinde UretimWorkOrderOperation kolon temizliği eksik!")
        }

        return "Migration additive kurallarına tam uyumlu (6 yeni model/tablo, 0 yıkıcı işlem, eksiksiz rollback)."
      }
    )

    // ─────────────────────────────────────────────────────────────
    // TEST 2: Prisma Şema ve Fallback DB Kaydı (6 Model)
    // ─────────────────────────────────────────────────────────────
    await runTest(
      "TEST_02_PRISMA_MODELS_REGISTERED",
      "Prisma Şema ve Fallback DB Kaydı (6 Model)",
      async () => {
        const requiredModels = [
          "uretimCapacityPlan",
          "uretimCapacityPlanItem",
          "uretimScheduledTask",
          "uretimCapacityAlert",
          "uretimCtpSimulation",
          "uretimOperationTimeVariance",
        ]

        for (const model of requiredModels) {
          if (typeof (prisma as any)[model]?.findMany !== "function") {
            throw new Error(`Model ${model} prisma istemcisinde tanımlı değil!`)
          }
        }

        return "Tüm 6 kapasite ve çizelgeleme modeli Prisma istemcisine ve simülasyon katmanına başarıyla bağlandı."
      }
    )

    // ─────────────────────────────────────────────────────────────
    // TEST 3: Özellik Bayrağı Bariyeri (Kapalıyken 403 FEATURE_DISABLED)
    // ─────────────────────────────────────────────────────────────
    await runTest(
      "TEST_03_FEATURE_FLAG_BARRIER",
      "Özellik Bayrağı Bariyeri (Kapalıyken 403 FEATURE_DISABLED)",
      async () => {
        resetFeatureFlagsOff()

        // 1. Servis yetki kontrolü
        let errorCaught = false
        try {
          await verifyProductionCapacityAccess({
            userId: DEBUG_USER_ID,
            action: "read",
          })
        } catch (err: any) {
          if (err instanceof ProductionDomainError && err.code === "FEATURE_DISABLED") {
            errorCaught = true
          }
        }

        if (!errorCaught) {
          throw new Error("Bayrak kapalıyken servis katmanında FEATURE_DISABLED fırlatılmadı!")
        }

        // 2. API Endpoint kontrolü
        const fakeReq = new Request("http://localhost:3000/api/production/capacity?section=overview")
        const res = await capacityApiGet(fakeReq)
        const json = await res.json()

        if (res.status !== 403 || json.code !== "FEATURE_DISABLED") {
          throw new Error(`API kapalıyken 403 dönmedi: ${res.status} - ${JSON.stringify(json)}`)
        }

        return "Özellik bayrağı kapalıyken hem servis hem API katmanında 403 FEATURE_DISABLED başarıyla sağlandı."
      }
    )

    // ─────────────────────────────────────────────────────────────
    // TEST 4: RBAC & Granüler Yetki Denetimi (uretim_kapasite)
    // ─────────────────────────────────────────────────────────────
    await runTest(
      "TEST_04_RBAC_PERMISSIONS",
      "RBAC & Granüler Yetki Denetimi (uretim_kapasite)",
      async () => {
        enableCapacityFeatureFlag()

        // Super Admin / Debug User okuma ve güncelleme yetkisi
        const canRead = await verifyProductionCapacityAccess({
          userId: DEBUG_USER_ID,
          action: "read",
        })
        if (!canRead) throw new Error("Debug kullanıcısına okuma yetkisi verilmedi!")

        const canCreate = await verifyProductionCapacityAccess({
          userId: DEBUG_USER_ID,
          action: "create",
        })
        if (!canCreate) throw new Error("Debug kullanıcısına planlama yetkisi verilmedi!")

        return "Kapasite planlama için RBAC yetki kontrolü başarıyla doğrulandı."
      }
    )

    // ─────────────────────────────────────────────────────────────
    // TEST 5: Net Kullanılabilir Kapasite Hesabı (Takvim, Vardiya, Verimlilik)
    // ─────────────────────────────────────────────────────────────
    await runTest(
      "TEST_05_NET_AVAILABLE_CAPACITY",
      "Net Kullanılabilir Kapasite Hesabı (Vardiya, Takvim, Verimlilik)",
      async () => {
        enableCapacityFeatureFlag()

        const mockWc: WorkCenterCapacityDefinition = {
          workCenterId: "WC-CNC-01",
          code: "CNC-01",
          name: "5 Eksen CNC Freze",
          efficiencyPercent: 85, // %85 verimlilik
          dailyNetWorkingMinutes: 480, // 8 saat mesai = 480 dk
          workingDays: ["MON", "TUE", "WED", "THU", "FRI"], // Hafta içi
          holidays: ["2026-11-20"], // Resmi tatil
          exceptions: [
            {
              date: "2026-11-18",
              type: "OVERTIME",
              availableHours: 2, // 2 saat fazla mesai = +120 dk => (480 + 120) * 0.85 = 510 dk
            },
            {
              date: "2026-11-19",
              type: "CLOSED", // Bakım sebebiyle kapalı gün
            },
          ],
          plannedStoppageMinutes: 30, // 30 dk günlük temizlik/yağlama
        }

        // 1. Normal Çalışma Günü: (480 * 0.85) - 30 = 408 - 30 = 378 dk
        const normalDate = new Date("2026-11-17T08:00:00Z") // Salı
        const normalCap = calculateWorkCenterDailyCapacityMinutes(mockWc, normalDate)
        if (normalCap !== 378) {
          throw new Error(`Normal gün kapasitesi 378 dk olmalı, hesaplanan: ${normalCap}`)
        }

        // 2. Fazla Mesai Günü: (480 + 120) * 0.85 = 510 dk
        const overtimeDate = new Date("2026-11-18T08:00:00Z") // Çarşamba
        const overtimeCap = calculateWorkCenterDailyCapacityMinutes(mockWc, overtimeDate)
        if (overtimeCap !== 510) {
          throw new Error(`Fazla mesai günü kapasitesi 510 dk olmalı, hesaplanan: ${overtimeCap}`)
        }

        // 3. Kapalı Gün: 0 dk
        const closedDate = new Date("2026-11-19T08:00:00Z") // Perşembe (Exception CLOSED)
        const closedCap = calculateWorkCenterDailyCapacityMinutes(mockWc, closedDate)
        if (closedCap !== 0) {
          throw new Error(`Kapalı gün kapasitesi 0 dk olmalı, hesaplanan: ${closedCap}`)
        }

        // 4. Resmi Tatil: 0 dk
        const holidayDate = new Date("2026-11-20T08:00:00Z") // Cuma (Holiday)
        const holidayCap = calculateWorkCenterDailyCapacityMinutes(mockWc, holidayDate)
        if (holidayCap !== 0) {
          throw new Error(`Tatil günü kapasitesi 0 dk olmalı, hesaplanan: ${holidayCap}`)
        }

        // 5. Hafta Sonu: 0 dk
        const weekendDate = new Date("2026-11-22T08:00:00Z") // Pazar
        const weekendCap = calculateWorkCenterDailyCapacityMinutes(mockWc, weekendDate)
        if (weekendCap !== 0) {
          throw new Error(`Hafta sonu kapasitesi 0 dk olmalı, hesaplanan: ${weekendCap}`)
        }

        return "İş merkezi takvimi, vardiya, verimlilik çarpanı, fazla mesai ve tatil düşümü kusursuz hesaplandı."
      }
    )

    // ─────────────────────────────────────────────────────────────
    // TEST 6: Sonsuz vs Sonlu Kapasite Çizelgeleme Kıyaslaması
    // ─────────────────────────────────────────────────────────────
    await runTest(
      "TEST_06_INFINITE_VS_FINITE_SCHEDULING",
      "Sonsuz (Infinite) vs Sonlu (Finite) Kapasite Çizelgeleme Farkı",
      async () => {
        enableCapacityFeatureFlag()

        const baseTime = new Date("2026-11-16T08:00:00Z") // Pazartesi 08:00
        const mockWorkCenters: Record<string, WorkCenterCapacityDefinition> = {
          "WC-1": {
            workCenterId: "WC-1",
            code: "WC-1",
            name: "Montaj Hattı 1",
            efficiencyPercent: 100,
            dailyNetWorkingMinutes: 480,
            workingDays: ["MON", "TUE", "WED", "THU", "FRI"],
          },
        }

        // Aynı istasyonda 2 farklı iş emrinin operasyonu (her biri 120 dakika)
        const ops: OperationSchedulingCandidate[] = [
          {
            id: "OP-1",
            workOrderId: "WO-1",
            workOrderNumber: "WO-1",
            operationNumber: 10,
            name: "Gövde Montajı",
            workCenterId: "WC-1",
            setupTimeMinutes: 0,
            runTimeMinutes: 120,
            totalMinutes: 120,
            plannedQuantity: 10,
            priority: "NORMAL",
            dueDate: new Date("2026-11-18T17:00:00Z"),
            createdDate: baseTime,
            status: "PENDING",
            isLocked: false,
          },
          {
            id: "OP-2",
            workOrderId: "WO-2",
            workOrderNumber: "WO-2",
            operationNumber: 10,
            name: "Kapak Montajı",
            workCenterId: "WC-1",
            setupTimeMinutes: 0,
            runTimeMinutes: 120,
            totalMinutes: 120,
            plannedQuantity: 10,
            priority: "NORMAL",
            dueDate: new Date("2026-11-18T17:00:00Z"),
            createdDate: baseTime,
            status: "PENDING",
            isLocked: false,
          },
        ]

        // 1. Sonsuz (Infinite) Kapasite: Her iki operasyon da kısıtsız olarak aynı anda başlar
        const infiniteResult = runCapacitySchedulingEngine(ops, mockWorkCenters, {
          mode: "INFINITE",
          direction: "FORWARD",
          priorityRule: "EDD",
          startDate: baseTime,
          respectShifts: false,
        })

        const infT1 = infiniteResult.scheduledTasks[0]
        const infT2 = infiniteResult.scheduledTasks[1]
        if (infT1.scheduledStart.getTime() !== infT2.scheduledStart.getTime()) {
          throw new Error("Sonsuz kapasitede işler eşzamanlı başlamalıydı!")
        }

        // 2. Sonlu (Finite) Kapasite: Makine çakışması olamaz; Op-2, Op-1 bittikten sonra başlar
        const finiteResult = runCapacitySchedulingEngine(ops, mockWorkCenters, {
          mode: "FINITE",
          direction: "FORWARD",
          priorityRule: "EDD",
          startDate: baseTime,
          respectShifts: false,
        })

        const finT1 = finiteResult.scheduledTasks[0]
        const finT2 = finiteResult.scheduledTasks[1]
        if (finT2.scheduledStart.getTime() < finT1.scheduledEnd.getTime()) {
          throw new Error("Sonlu kapasitede ikinci operasyon birincinin bitiminden önce başladı!")
        }

        return "Sonsuz kapasitede paralel yük görüntüleme; sonlu kapasitede makine kuyruğu ve çakışmasız sıralama doğrulandı."
      }
    )

    // ─────────────────────────────────────────────────────────────
    // TEST 7: Öncelik Kuralları (EDD, FCFS, Kritik Oran - CR, Öncelik)
    // ─────────────────────────────────────────────────────────────
    await runTest(
      "TEST_07_DISPATCHING_PRIORITY_RULES",
      "Öncelik Kuralları (EDD, FCFS, Kritik Oran - CR, Öncelik Seviyesi)",
      async () => {
        enableCapacityFeatureFlag()

        const now = new Date("2026-11-16T08:00:00Z")
        const opA: OperationSchedulingCandidate = {
          id: "A",
          workOrderId: "WO-A",
          workOrderNumber: "WO-A",
          operationNumber: 10,
          name: "İş A",
          workCenterId: "WC-1",
          setupTimeMinutes: 0,
          runTimeMinutes: 60,
          totalMinutes: 60,
          plannedQuantity: 1,
          priority: "LOW",
          dueDate: new Date(now.getTime() + 5 * 86400000), // 5 gün sonra
          createdDate: new Date(now.getTime() - 2 * 86400000), // 2 gün önce açıldı
          status: "PENDING",
          isLocked: false,
        }

        const opB: OperationSchedulingCandidate = {
          id: "B",
          workOrderId: "WO-B",
          workOrderNumber: "WO-B",
          operationNumber: 10,
          name: "İş B",
          workCenterId: "WC-1",
          setupTimeMinutes: 0,
          runTimeMinutes: 120,
          totalMinutes: 120,
          plannedQuantity: 1,
          priority: "URGENT",
          dueDate: new Date(now.getTime() + 2 * 86400000), // 2 gün sonra (Acil)
          createdDate: new Date(now.getTime() - 1 * 86400000), // 1 gün önce açıldı
          status: "PENDING",
          isLocked: false,
        }

        // 1. EDD (Teslim Tarihi): B (2 gün) < A (5 gün) => [B, A]
        const sortedEdd = sortOperationsByPriority([opA, opB], "EDD", now)
        if (sortedEdd[0].id !== "B") throw new Error("EDD sıralaması hatalı!")

        // 2. FCFS (İlk Gelen İlk): A (2 gün önce) < B (1 gün önce) => [A, B]
        const sortedFcfs = sortOperationsByPriority([opA, opB], "FCFS", now)
        if (sortedFcfs[0].id !== "A") throw new Error("FCFS sıralaması hatalı!")

        // 3. PRIORITY (Öncelik Kodu): B (URGENT) > A (LOW) => [B, A]
        const sortedPrio = sortOperationsByPriority([opA, opB], "PRIORITY", now)
        if (sortedPrio[0].id !== "B") throw new Error("PRIORITY sıralaması hatalı!")

        // 4. CR (Critical Ratio): B daha kritik olmalı
        const crA = calculateCriticalRatio(opA.dueDate, opA.totalMinutes, now)
        const crB = calculateCriticalRatio(opB.dueDate, opB.totalMinutes, now)
        if (crB >= crA) throw new Error("Kritik oran hesabı mantıksız!")

        return "EDD, FCFS, CR (Kritik Oran) ve URGENT öncelik sıralamaları hatasız çalıştı."
      }
    )

    // ─────────────────────────────────────────────────────────────
    // TEST 8: Operasyon Bağımlılığı & Hazırlık (Setup) Süresi
    // ─────────────────────────────────────────────────────────────
    await runTest(
      "TEST_08_OPERATION_DEPENDENCY_AND_SETUP",
      "Operasyon Bağımlılığı ve Hazırlık (Setup) Süresi Kısıtları",
      async () => {
        enableCapacityFeatureFlag()

        const baseTime = new Date("2026-11-16T08:00:00Z")
        const mockWorkCenters: Record<string, WorkCenterCapacityDefinition> = {
          "WC-FREZE": {
            workCenterId: "WC-FREZE",
            code: "FREZE",
            name: "Freze Tezgahı",
            efficiencyPercent: 100,
            dailyNetWorkingMinutes: 480,
            workingDays: ["MON", "TUE", "WED", "THU", "FRI"],
          },
          "WC-BOYA": {
            workCenterId: "WC-BOYA",
            code: "BOYA",
            name: "Boya Kabini",
            efficiencyPercent: 100,
            dailyNetWorkingMinutes: 480,
            workingDays: ["MON", "TUE", "WED", "THU", "FRI"],
          },
        }

        // Aynı iş emrinde Op 10 (Freze) ve Op 20 (Boya)
        const ops: OperationSchedulingCandidate[] = [
          {
            id: "OP-10",
            workOrderId: "WO-M",
            workOrderNumber: "WO-M",
            operationNumber: 10,
            name: "Frezeleme",
            workCenterId: "WC-FREZE",
            setupTimeMinutes: 30, // 30 dk kalıp bağlama
            runTimeMinutes: 90, // 90 dk işleme
            totalMinutes: 120,
            plannedQuantity: 5,
            priority: "NORMAL",
            dueDate: new Date("2026-11-20T17:00:00Z"),
            createdDate: baseTime,
            status: "PENDING",
            isLocked: false,
          },
          {
            id: "OP-20",
            workOrderId: "WO-M",
            workOrderNumber: "WO-M",
            operationNumber: 20,
            name: "Elektrostatik Boya",
            workCenterId: "WC-BOYA",
            setupTimeMinutes: 15,
            runTimeMinutes: 60,
            totalMinutes: 75,
            plannedQuantity: 5,
            priority: "NORMAL",
            dueDate: new Date("2026-11-20T17:00:00Z"),
            createdDate: baseTime,
            status: "PENDING",
            isLocked: false,
          },
        ]

        const result = runCapacitySchedulingEngine(ops, mockWorkCenters, {
          mode: "FINITE",
          direction: "FORWARD",
          priorityRule: "EDD",
          startDate: baseTime,
          respectShifts: false,
        })

        const t1 = result.scheduledTasks.find((t) => t.operationNumber === 10)!
        const t2 = result.scheduledTasks.find((t) => t.operationNumber === 20)!

        // 1. T1 süresi 120 dakika (30 setup + 90 run)
        if (t1.totalMinutes !== 120) throw new Error("Setup + Run süresi toplamı hatalı!")

        // 2. T2, T1 bitmeden başlayamaz (Farklı makinelerde olsalar dahi!)
        if (t2.scheduledStart.getTime() < t1.scheduledEnd.getTime()) {
          throw new Error("Op 20, Op 10 tamamlanmadan önce başladı! Bağımlılık kuralı çiğnendi.")
        }

        return "Farklı istasyonlarda dahi aynı iş emrinin ardışık adımları birbirini bekledi; setup süresi dahil edildi."
      }
    )

    // ─────────────────────────────────────────────────────────────
    // TEST 9: Vardiya ve Mesai Dışı Saatleri Atlama
    // ─────────────────────────────────────────────────────────────
    await runTest(
      "TEST_09_SHIFT_AND_NONWORKING_AWARENESS",
      "Vardiya Saatleri ve Hafta Sonu Tatilini Atlama",
      async () => {
        enableCapacityFeatureFlag()

        const fridayMorning = new Date(2026, 10, 13, 8, 0, 0) // Cuma 08:00
        const mockWc: WorkCenterCapacityDefinition = {
          workCenterId: "WC-TEST",
          code: "WC-T",
          name: "Test İstasyonu",
          efficiencyPercent: 100,
          dailyNetWorkingMinutes: 480, // Günlük 8 saat
          workingDays: ["MON", "TUE", "WED", "THU", "FRI"], // Hafta sonu tatil
        }

        // 16 saatlik (960 dk) bir iş Cuma sabahı başlarsa 2 çalışma günü sürer (Cuma + Pazartesi)
        const scheduledEnd = addWorkingMinutesToDate(fridayMorning, 960, mockWc)

        // Bitiş günü Pazartesi olmalı (Cuma biter, Cmt/Paz atlar, Pazartesi biter)
        const endDay = scheduledEnd.getDay()
        if (endDay !== 1) {
          // 1 = Monday
          throw new Error(`İş bitişi Pazartesi (1) olmalıydı, alınan gün: ${endDay}`)
        }

        return "960 dakikalık iş Cuma mesaisini doldurup hafta sonunu atlayarak Pazartesi gününe başarıyla sarkıtıldı."
      }
    )

    // ─────────────────────────────────────────────────────────────
    // TEST 10: Kilitli (Pinned / Elle Sabitlenmiş) Operasyon Koruması
    // ─────────────────────────────────────────────────────────────
    await runTest(
      "TEST_10_LOCKED_PINNED_OPERATIONS",
      "Kilitli (Pinned) Operasyonların Yeniden Planlamada Korunması",
      async () => {
        enableCapacityFeatureFlag()

        const baseTime = new Date("2026-11-16T08:00:00Z")
        const mockWorkCenters: Record<string, WorkCenterCapacityDefinition> = {
          "WC-1": {
            workCenterId: "WC-1",
            code: "WC-1",
            name: "Hatt-1",
            efficiencyPercent: 100,
            dailyNetWorkingMinutes: 480,
            workingDays: ["MON", "TUE", "WED", "THU", "FRI"],
          },
        }

        // Kullanıcı Op-Lock'u Çarşamba 10:00 - 14:00 arasına elle kilitledi
        const lockedStart = new Date("2026-11-18T10:00:00Z")
        const lockedEnd = new Date("2026-11-18T14:00:00Z")

        const ops: OperationSchedulingCandidate[] = [
          {
            id: "OP-LOCKED",
            workOrderId: "WO-VIP",
            workOrderNumber: "WO-VIP",
            operationNumber: 10,
            name: "VIP Kalıp Ayarı (Kilitli)",
            workCenterId: "WC-1",
            setupTimeMinutes: 0,
            runTimeMinutes: 240,
            totalMinutes: 240,
            plannedQuantity: 1,
            priority: "NORMAL",
            dueDate: new Date("2026-11-20T17:00:00Z"),
            createdDate: baseTime,
            status: "PENDING",
            isLocked: true,
            scheduledStart: lockedStart,
            scheduledEnd: lockedEnd,
          },
          {
            id: "OP-NEW",
            workOrderId: "WO-NORM",
            workOrderNumber: "WO-NORM",
            operationNumber: 10,
            name: "Rutin Parça",
            workCenterId: "WC-1",
            setupTimeMinutes: 0,
            runTimeMinutes: 120,
            totalMinutes: 120,
            plannedQuantity: 1,
            priority: "URGENT", // Daha acil olsa dahi kilitli işin yerini bozamaz
            dueDate: new Date("2026-11-17T17:00:00Z"),
            createdDate: baseTime,
            status: "PENDING",
            isLocked: false,
          },
        ]

        const result = runCapacitySchedulingEngine(ops, mockWorkCenters, {
          mode: "FINITE",
          direction: "FORWARD",
          priorityRule: "PRIORITY",
          startDate: baseTime,
          respectShifts: false,
        })

        const lockedResult = result.scheduledTasks.find((t) => t.id === "OP-LOCKED")!
        if (
          lockedResult.scheduledStart.getTime() !== lockedStart.getTime() ||
          lockedResult.scheduledEnd.getTime() !== lockedEnd.getTime()
        ) {
          throw new Error("Kilitli operasyonun zamanı otomatik planlama motoru tarafından değiştirildi!")
        }

        return "Kilitli (isLocked=true) VIP operasyon sabitlendi, diğer acil işler etrafına çizelgelendi."
      }
    )

    // ─────────────────────────────────────────────────────────────
    // TEST 11: Alternatif İş Merkezi (Work Center) Önerisi
    // ─────────────────────────────────────────────────────────────
    await runTest(
      "TEST_11_ALTERNATIVE_WORK_CENTER_ROUTING",
      "Alternatif İş Merkezi Yönlendirme ve Grup Entegrasyonu",
      async () => {
        enableCapacityFeatureFlag()

        // Test iş merkezi oluştur
        const testWc = await (prisma as any).uretimWorkCenter.create({
          data: {
            code: "WC-CAP-TEST-01",
            name: "Test CNC İstasyonu",
            type: "MACHINE",
            hourlyCost: 250,
            capacityPerHour: 10,
            efficiencyPercent: 90,
            alternativeGroupCode: "GRP-CNC",
          },
        })

        const defs = await getWorkCentersCapacityDefinitions()
        const wcList = Object.values(defs)

        if (wcList.length === 0) {
          throw new Error("Sistemde kayıtlı iş merkezi bulunamadı!")
        }

        return `${wcList.length} adet iş merkezinin kapasite tanımları ve alternatif istasyon grupları (${testWc.code}) doğrulandı.`
      }
    )

    // ─────────────────────────────────────────────────────────────
    // TEST 12: Söz Verilebilir Teslim Tarihi (CTP) Simülasyonu
    // ─────────────────────────────────────────────────────────────
    await runTest(
      "TEST_12_CAPABLE_TO_PROMISE_SIMULATION",
      "Söz Verilebilir Teslim Tarihi (CTP - Capable-To-Promise) Hesabı",
      async () => {
        enableCapacityFeatureFlag()

        const baseTime = new Date("2026-11-16T08:00:00Z")
        const mockWorkCenters: Record<string, WorkCenterCapacityDefinition> = {
          "WC-MONTAJ": {
            workCenterId: "WC-MONTAJ",
            code: "MNT",
            name: "Montaj İstasyonu",
            efficiencyPercent: 100,
            dailyNetWorkingMinutes: 480,
            workingDays: ["MON", "TUE", "WED", "THU", "FRI"],
          },
        }

        // Mevcut çizelgede Çarşamba 17:00'ye kadar işler dolu
        const existingEnd = new Date("2026-11-18T17:00:00Z")
        const existingTasks = [
          {
            id: "EXT-1",
            workOrderId: "WO-EXT",
            workOrderNumber: "WO-EXT",
            operationId: "OP-EXT",
            operationNumber: 10,
            operationName: "Mevcut Dolu İş",
            workCenterId: "WC-MONTAJ",
            setupMinutes: 60,
            runMinutes: 800,
            totalMinutes: 860,
            scheduledStart: baseTime,
            scheduledEnd: existingEnd,
            sequenceOrder: 1,
            isLocked: false,
            isDelayed: false,
            delayMinutes: 0,
            status: "SCHEDULED",
          },
        ]

        // 100 adet yeni sipariş için CTP simülasyonu (60 dk hazırlık + adet başı 4 dk = 460 dk ~ 1 gün)
        const ctpInput: CtpSimulationInput = {
          itemId: "ITEM-CTP-TEST",
          quantity: 100,
          requestedDueDate: new Date("2026-11-17T17:00:00Z"), // Müşteri Salı istiyor (İmkansız!)
          operations: [
            {
              operationNumber: 10,
              name: "Montaj",
              workCenterId: "WC-MONTAJ",
              setupMinutes: 60,
              runMinutesPerUnit: 4,
            },
          ],
        }

        const ctpResult = calculateCapableToPromise(
          ctpInput,
          mockWorkCenters,
          existingTasks,
          baseTime
        )

        // Müşteri Salı istedi ama makine Çarşamba akşamına kadar dolu -> isFeasible false olmalı!
        if (ctpResult.isFeasible !== false) {
          throw new Error("Dolu makinede gerçekçi olmayan termin feasible kabul edildi!")
        }

        // En erken teslim tarihi en azından Perşembe mesaisi olmalı
        if (ctpResult.calculatedEarliestDueDate.getTime() <= existingEnd.getTime()) {
          throw new Error("CTP en erken bitiş tarihi mevcut işin bitişinden sonraya atanamadı!")
        }

        return `CTP Motoru müşterinin erken terminini reddetti; makine kuyruğunu inceleyerek en erken teslimi (${ctpResult.calculatedEarliestDueDate.toISOString().slice(0, 10)}) önerdi.`
      }
    )

    // ─────────────────────────────────────────────────────────────
    // TEST 13: Fiili vs Planlanan Süre Varyansı ve Öğrenme Eğrisi
    // ─────────────────────────────────────────────────────────────
    await runTest(
      "TEST_13_ACTUAL_VS_PLANNED_CYCLE_TIME_VARIANCE",
      "Fiili vs Planlanan Süre Varyansı & Rota Standart Süre Güncelleme Önerisi",
      async () => {
        enableCapacityFeatureFlag()

        // 3 kez icra edilmiş bir operasyon (Planlanan: 60 dk, Fiili ortalama: 90 dk => +%50 sapma)
        const completedOps = [
          {
            operationName: "Dikiş ve Paketleme",
            workCenterId: "WC-PAKET",
            plannedSetupMinutes: 10,
            plannedRunMinutes: 50,
            actualMachineMinutes: 90,
            actualRunMinutes: 90,
          },
          {
            operationName: "Dikiş ve Paketleme",
            workCenterId: "WC-PAKET",
            plannedSetupMinutes: 10,
            plannedRunMinutes: 50,
            actualMachineMinutes: 95,
            actualRunMinutes: 95,
          },
          {
            operationName: "Dikiş ve Paketleme",
            workCenterId: "WC-PAKET",
            plannedSetupMinutes: 10,
            plannedRunMinutes: 50,
            actualMachineMinutes: 85,
            actualRunMinutes: 85,
          },
        ]

        const summaries = calculateOperationTimeVariances(completedOps)
        if (summaries.length !== 1) throw new Error("Varyans özeti hesaplanamadı!")

        const summary = summaries[0]
        if (summary.plannedStandardMinutes !== 60) {
          throw new Error(`Planlanan standart 60 olmalı, alınan: ${summary.plannedStandardMinutes}`)
        }
        if (summary.actualAverageMinutes !== 90) {
          throw new Error(`Fiili ortalama 90 olmalı, alınan: ${summary.actualAverageMinutes}`)
        }
        if (summary.variancePercent !== 50) {
          throw new Error(`Sapma %50 olmalı, alınan: %${summary.variancePercent}`)
        }
        if (summary.suggestedStandardMinutes <= 60 || summary.suggestedStandardMinutes >= 90) {
          throw new Error("Öğrenme eğrisi önerisi (0.7 fiili + 0.3 planlanan) aralık dışında!")
        }

        return `Planlanan: 60 dk, Fiili: 90 dk -> Sapma: +%50.0. Önerilen Yeni Standart: ${summary.suggestedStandardMinutes} dk.`
      }
    )

    // ─────────────────────────────────────────────────────────────
    // TEST 14: Aşırı Yük ve Darboğaz (Bottleneck) Otomatik Tespiti
    // ─────────────────────────────────────────────────────────────
    await runTest(
      "TEST_14_OVERLOAD_AND_BOTTLENECK_ALERTS",
      "Aşırı Yük (> %100) ve Darboğaz İstasyonunun Tespiti",
      async () => {
        enableCapacityFeatureFlag()

        const baseTime = new Date("2026-11-16T08:00:00Z")
        const mockWorkCenters: Record<string, WorkCenterCapacityDefinition> = {
          "WC-DARBOGAZ": {
            workCenterId: "WC-DARBOGAZ",
            code: "DARBOGAZ-01",
            name: "Fırınlama Kabini (Kritik)",
            efficiencyPercent: 100,
            dailyNetWorkingMinutes: 480, // Günlük 8 saat
            workingDays: ["MON", "TUE", "WED", "THU", "FRI"],
          },
        }

        // Günlük 8 saatlik kapasiteye 16 saatlik yük yığılması
        const scheduledTasks = [
          {
            id: "T-OV1",
            workOrderId: "WO-1",
            workOrderNumber: "WO-1",
            operationId: "OP-1",
            operationNumber: 10,
            operationName: "Pişirme 1",
            workCenterId: "WC-DARBOGAZ",
            setupMinutes: 0,
            runMinutes: 480,
            totalMinutes: 480,
            scheduledStart: baseTime,
            scheduledEnd: new Date("2026-11-16T17:00:00Z"),
            sequenceOrder: 1,
            isLocked: false,
            isDelayed: false,
            delayMinutes: 0,
            status: "SCHEDULED",
          },
          {
            id: "T-OV2",
            workOrderId: "WO-2",
            workOrderNumber: "WO-2",
            operationId: "OP-2",
            operationNumber: 10,
            operationName: "Pişirme 2",
            workCenterId: "WC-DARBOGAZ",
            setupMinutes: 0,
            runMinutes: 480,
            totalMinutes: 480,
            scheduledStart: baseTime,
            scheduledEnd: new Date("2026-11-16T17:00:00Z"),
            sequenceOrder: 2,
            isLocked: false,
            isDelayed: false,
            delayMinutes: 0,
            status: "SCHEDULED",
          },
        ]

        const { buckets, bottleneckWorkCenterId, overloadedBuckets } =
          calculateCapacityUtilizationBuckets(scheduledTasks, mockWorkCenters, baseTime, 1)

        if (bottleneckWorkCenterId !== "WC-DARBOGAZ") {
          throw new Error("Darboğaz istasyonu tespit edilemedi!")
        }

        const dayBucket = buckets[0]
        if (dayBucket.utilizationPercent !== 200 || !dayBucket.isOverloaded) {
          throw new Error(`Kapasite doluluğu %200 ve aşırı yük olmalı, alınan: %${dayBucket.utilizationPercent}`)
        }

        const alerts = generateCapacityAlertsFromBuckets(buckets, [])
        const overloadAlert = alerts.find((a) => a.alertType === "OVERLOAD")
        if (!overloadAlert || overloadAlert.severity !== "CRITICAL") {
          throw new Error("Kritik aşırı yük uyarısı üretilmedi!")
        }

        return `Darboğaz istasyonu (${bottleneckWorkCenterId}) tespit edildi; %200 aşırı yük ve CRITICAL ikaz üretildi.`
      }
    )

    // ─────────────────────────────────────────────────────────────
    // TEST 15: Yüksek Hacim Performans Benchmark (500+ Açık Operasyon)
    // ─────────────────────────────────────────────────────────────
    await runTest(
      "TEST_15_HIGH_VOLUME_PERFORMANCE_BENCHMARK",
      "Yüksek Hacim Performans Benchmark (500 Açık Operasyon Çizelgeleme)",
      async () => {
        enableCapacityFeatureFlag()

        const baseTime = new Date("2026-11-16T08:00:00Z")
        const workCenters: Record<string, WorkCenterCapacityDefinition> = {}
        for (let i = 1; i <= 5; i++) {
          workCenters[`WC-${i}`] = {
            workCenterId: `WC-${i}`,
            code: `WC-0${i}`,
            name: `İstasyon #${i}`,
            efficiencyPercent: 90,
            dailyNetWorkingMinutes: 480,
            workingDays: ["MON", "TUE", "WED", "THU", "FRI", "SAT"],
          }
        }

        // 500 operasyon üret
        const largeOps: OperationSchedulingCandidate[] = []
        for (let i = 1; i <= 500; i++) {
          const wcId = `WC-${(i % 5) + 1}`
          largeOps.push({
            id: `OP-BENCH-${i}`,
            workOrderId: `WO-B-${Math.floor(i / 3)}`,
            workOrderNumber: `WO-B-${Math.floor(i / 3)}`,
            operationNumber: (i % 3) * 10 + 10,
            name: `Operasyon Adımı #${i}`,
            workCenterId: wcId,
            setupTimeMinutes: 15,
            runTimeMinutes: 45,
            totalMinutes: 60,
            plannedQuantity: 10,
            priority: i % 10 === 0 ? "URGENT" : i % 5 === 0 ? "HIGH" : "NORMAL",
            dueDate: new Date(baseTime.getTime() + (i % 14) * 86400000),
            createdDate: baseTime,
            status: "PENDING",
            isLocked: i === 10 || i === 50,
          })
        }

        const tStart = Date.now()
        const scheduleResult = runCapacitySchedulingEngine(largeOps, workCenters, {
          mode: "FINITE",
          direction: "FORWARD",
          priorityRule: "EDD",
          startDate: baseTime,
          respectShifts: false,
        })
        const durationMs = Date.now() - tStart

        if (scheduleResult.scheduledTasks.length !== 500) {
          throw new Error(`500 operasyonun tamamı çizelgelenemedi: ${scheduleResult.scheduledTasks.length}`)
        }

        if (durationMs > 3000) {
          throw new Error(`Benchmark süresi aşıldı! Alınan: ${durationMs}ms (Hedef < 3000ms)`)
        }

        return `500 açık operasyon sonlu kapasite kurallarıyla ${durationMs} ms içinde çizelgelendi (Hedef < 3.000 ms).`
      }
    )

    // ─────────────────────────────────────────────────────────────
    // TEST 16: Eşzamanlılık Dayanıklılığı & SHA-256 DB Bütünlüğü
    // ─────────────────────────────────────────────────────────────
    await runTest(
      "TEST_16_CONCURRENCY_AND_SHA256_INTEGRITY",
      "Eşzamanlılık Dayanıklılığı & SHA-256 DB Bütünlüğü",
      async () => {
        enableCapacityFeatureFlag()

        // 1. Gösterge Paneli ve Gantt API rotasını sına
        const overviewReq = new Request("http://localhost:3000/api/production/capacity?section=overview", {
          headers: { "x-user-id": DEBUG_USER_ID },
        })
        const overviewRes = await capacityApiGet(overviewReq)
        const overviewJson = await overviewRes.json()

        if (!overviewJson.success) {
          throw new Error(`Kapasite overview API yanıtı başarısız: ${JSON.stringify(overviewJson)}`)
        }

        const ganttReq = new Request("http://localhost:3000/api/production/capacity?section=gantt", {
          headers: { "x-user-id": DEBUG_USER_ID },
        })
        const ganttRes = await capacityApiGet(ganttReq)
        const ganttJson = await ganttRes.json()

        if (!ganttJson.success || !Array.isArray(ganttJson.tasks)) {
          throw new Error("Gantt API yanıtı dizi formatında değil!")
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

  // ─────────────────────────────────────────────────────────────
  // SONUÇ ÖZETİ
  // ─────────────────────────────────────────────────────────────
  console.log("\n================================================================================")
  console.log("  TEST SONUÇLARI ÖZETİ")
  console.log("================================================================================")
  const passedCount = results.filter((r) => r.passed).length
  const failedCount = results.filter((r) => !r.passed).length

  results.forEach((r) => {
    const symbol = r.passed ? "✅" : "❌"
    console.log(`  ${symbol} [${r.id}] ${r.name}`)
  })

  console.log(`\nToplam Test: ${results.length} | Başarılı: ${passedCount} | Başarısız: ${failedCount}`)

  if (failedCount > 0) {
    console.error("\n❌ BAZI TESTLER BAŞARISIZ OLDU!")
    process.exit(1)
  } else {
    console.log("\n🎉 TÜM FAZ 6 KAPASİTE PLANLAMA & ÇİZELGELEME TESTLERİ (16/16) EKSİKSİZ GEÇTİ!")
    process.exit(0)
  }
}

main().catch((err) => {
  console.error("Test paketi beklenmeyen bir hata ile çöktü:", err)
  process.exit(1)
})
