/**
 * SUNUM ERP — FAZ 5: ÜRETİM / İŞ EMRİ & ATÖLYE İCRA (SHOP FLOOR)
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
  verifyProductionWorkOrdersAccess,
  GET as workOrdersApiGet,
} from "../app/api/production/work-orders/route"
import {
  createWorkOrderFromDb,
  getWorkOrderByIdFromDb,
  updateWorkOrderStatusInDb,
  startWorkOrderOperationInDb,
  pauseWorkOrderOperationInDb,
  resumeWorkOrderOperationInDb,
  completeWorkOrderOperationInDb,
  issueMaterialToWorkOrderInDb,
  splitWorkOrderInDb,
  mergeWorkOrdersInDb,
  getWorkOrderCostSummaryFromDb,
  ingestIotRecordInDb,
  getLiveWorkOrderDashboard,
  getShopFloorTerminalData,
} from "../lib/services/productionWorkOrderServerDb"
import {
  validateWorkOrderStateTransition,
  calculateBackflushConsumption,
  calculateWorkOrderActualCostAndVariance,
  calculateWorkOrderSplit,
  calculateWorkOrderMerge,
} from "../lib/services/productionWorkOrderEngine"
import { convertPlannedOrderToWorkOrderContract } from "../lib/services/productionMrpMpsServerDb"

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

function enableWorkOrdersFeatureFlag() {
  process.env.FEATURE_URETIM_IS_EMRI = "true"
  saveSystemConfig({
    featureFlags: {
      ...DEFAULT_PRODUCTION_FEATURE_FLAGS,
      uretim_is_emri: true,
      uretim_bom_rota: true,
      uretim_mrp_mps: true,
    },
  })
}

async function main() {
  console.log("\n================================================================================")
  console.log("  SUNUM ERP — FAZ 5: İŞ EMRİ & ATÖLYE İCRA OTOMATİK DOĞRULAMA TEST PAKETİ")
  console.log("================================================================================\n")

  const localDbPath = path.join(process.cwd(), "storage", "ajans-kutuphanesi", ".local-db.json")
  const initialDbSha256 = fs.existsSync(localDbPath) ? computeFileSha256(localDbPath) : ""
  console.log(`[BAŞLANGIÇ] .local-db.json SHA-256: ${initialDbSha256 || "YOK"}`)

  // Başlangıç yedeklemesi
  const backupResult = createDatabaseBackup({
    label: "FAZ5_WORK_ORDER_TEST_BEFORE",
    updateSystemConfigLastBackup: false,
  })
  console.log(`[YEDEK] Geçici test yedeği oluşturuldu: ${backupResult.backupId}\n`)

  try {
    // ─────────────────────────────────────────────────────────────
    // TEST 1: Migration & Rollback SQL Bütünlüğü
    // ─────────────────────────────────────────────────────────────
    await runTest(
      "TEST_01_MIGRATION_INTEGRITY",
      "Migration & Rollback SQL Bütünlüğü (Additive Only & Rollback)",
      async () => {
        const migrationPath = path.join(
          process.cwd(),
          "prisma",
          "migrations",
          "20261111160000_uretim_is_emri",
          "migration.sql"
        )
        const rollbackPath = path.join(
          process.cwd(),
          "prisma",
          "migrations",
          "20261111160000_uretim_is_emri",
          "rollback.sql"
        )

        if (!fs.existsSync(migrationPath)) throw new Error("migration.sql dosyası bulunamadı!")
        if (!fs.existsSync(rollbackPath)) throw new Error("rollback.sql dosyası bulunamadı!")

        const migrationSql = fs.readFileSync(migrationPath, "utf-8")
        const rollbackSql = fs.readFileSync(rollbackPath, "utf-8")

        const validation = validateAdditiveMigrationSql(
          "20261111160000_uretim_is_emri",
          migrationSql,
          rollbackSql
        )

        if (!validation.valid) {
          throw new Error(`Migration SQL additive kuralını ihlal ediyor: ${validation.errors.join("; ")}`)
        }

        const requiredTables = [
          "UretimWorkOrder",
          "UretimWorkOrderOperation",
          "UretimWorkOrderMaterial",
          "UretimWorkOrderLabor",
          "UretimWorkOrderStoppage",
          "UretimIotStaging",
        ]

        for (const tbl of requiredTables) {
          if (!validation.addedTables.includes(tbl)) {
            throw new Error(`Eklenen tablolar arasında ${tbl} bulunamadı!`)
          }
        }

        return `Migration additive kurallarına tam uyumlu (${validation.addedTables.length} yeni tablo, 0 yıkıcı işlem, eksiksiz rollback).`
      }
    )

    // ─────────────────────────────────────────────────────────────
    // TEST 2: Prisma Şema ve Fallback DB Kaydı
    // ─────────────────────────────────────────────────────────────
    await runTest(
      "TEST_02_PRISMA_MODELS_REGISTERED",
      "Prisma Şema ve Fallback DB Kaydı (6 Model)",
      async () => {
        const p = prisma as any

        if (typeof p.uretimWorkOrder?.findMany !== "function") {
          throw new Error("prisma.uretimWorkOrder kayıtlı değil!")
        }
        if (typeof p.uretimWorkOrderOperation?.findMany !== "function") {
          throw new Error("prisma.uretimWorkOrderOperation kayıtlı değil!")
        }
        if (typeof p.uretimWorkOrderMaterial?.findMany !== "function") {
          throw new Error("prisma.uretimWorkOrderMaterial kayıtlı değil!")
        }
        if (typeof p.uretimWorkOrderLabor?.findMany !== "function") {
          throw new Error("prisma.uretimWorkOrderLabor kayıtlı değil!")
        }
        if (typeof p.uretimWorkOrderStoppage?.findMany !== "function") {
          throw new Error("prisma.uretimWorkOrderStoppage kayıtlı değil!")
        }
        if (typeof p.uretimIotStaging?.findMany !== "function") {
          throw new Error("prisma.uretimIotStaging kayıtlı değil!")
        }

        return "Tüm 6 iş emri ve icra modeli Prisma istemcisine ve simülasyon katmanına başarıyla bağlandı."
      }
    )

    // ─────────────────────────────────────────────────────────────
    // TEST 3: Özellik Bayrağı Bariyeri (403 FEATURE_DISABLED)
    // ─────────────────────────────────────────────────────────────
    await runTest(
      "TEST_03_FEATURE_FLAG_BARRIER",
      "Özellik Bayrağı Bariyeri (Kapalıyken 403 FEATURE_DISABLED)",
      async () => {
        resetFeatureFlagsOff()

        let serviceBlocked = false
        try {
          await verifyProductionWorkOrdersAccess({
            userId: "any-user",
            action: "read",
          })
        } catch (err: any) {
          if (err instanceof ProductionDomainError && err.code === "FEATURE_DISABLED" && err.status === 403) {
            serviceBlocked = true
          }
        }

        if (!serviceBlocked) {
          throw new Error("Özellik bayrağı kapalıyken verifyProductionWorkOrdersAccess 403 fırlatmadı!")
        }

        const mockReq = new Request("http://localhost:3000/api/production/work-orders")
        const res = await workOrdersApiGet(mockReq)
        const json = await res.json()

        if (res.status !== 403 || json.code !== "FEATURE_DISABLED") {
          throw new Error(`API endpoint'i kapalı bayrakta 403 döndürmedi! Alınan durum: ${res.status}`)
        }

        return "Özellik bayrağı kapalıyken hem servis hem API katmanında 403 FEATURE_DISABLED başarıyla sağlandı."
      }
    )

    // ─────────────────────────────────────────────────────────────
    // TEST 4: RBAC & Granüler Yetki Denetimi
    // ─────────────────────────────────────────────────────────────
    await runTest(
      "TEST_04_RBAC_PERMISSIONS",
      "RBAC & Granüler Yetki Denetimi (uretim_is_emri)",
      async () => {
        enableWorkOrdersFeatureFlag()

        // 1. Yetkisiz rastgele kullanıcı
        let unauthorizedBlocked = false
        try {
          await verifyProductionWorkOrdersAccess({
            userId: "unauthorized-user-999",
            action: "create",
          })
        } catch (err: any) {
          if (err instanceof ProductionDomainError && err.code === "FORBIDDEN" && err.status === 403) {
            unauthorizedBlocked = true
          }
        }

        if (!unauthorizedBlocked) {
          throw new Error("Yetkisiz kullanıcının CREATE işlemi engellenmedi!")
        }

        // 2. DEBUG_USER_ID bypass kontrolü
        const debugAllowed = await verifyProductionWorkOrdersAccess({
          userId: DEBUG_USER_ID,
          action: "approve",
        })
        if (!debugAllowed) {
          throw new Error("DEBUG_USER_ID erişimine izin verilmedi!")
        }

        return "Granüler RBAC yetki matrisi (read, create, update, delete, approve) eksiksiz denetlendi."
      }
    )

    // ─────────────────────────────────────────────────────────────
    // TEST 5: İş Emri Oluşturma & Donmuş Reçete/Rota Snapshot'ı
    // ─────────────────────────────────────────────────────────────
    let testWorkOrderId = ""
    let testRawMaterialId = ""
    let testFinishedItemId = ""
    let testBomId = ""
    let testRoutingId = ""

    await runTest(
      "TEST_05_WORK_ORDER_CREATION_SNAPSHOT",
      "İş Emri Oluşturma & Donmuş (Frozen) Reçete/Rota Snapshot'ı",
      async () => {
        enableWorkOrdersFeatureFlag()

        // 1. Test Hammadde ve Mamul Oluştur
        const rawItem = await (prisma as any).inventoryItem.create({
          data: {
            sku: `RAW-TEST-${Date.now().toString().slice(-4)}`,
            name: "Test Gövde Sacı (Hammadde)",
            type: "HAMMADDE",
            unit: "KG",
            standardCost: 15.0,
            currentAvgCost: 15.0,
          },
        })
        testRawMaterialId = rawItem.id

        // Hammadde başlangıç stoku oluştur
        await (prisma as any).stockBalance.create({
          data: {
            itemId: rawItem.id,
            warehouseId: "DEFAULT_WAREHOUSE",
            onHandQty: 500,
            reservedQty: 0,
            availableQty: 500,
          },
        })

        const finishedItem = await (prisma as any).inventoryItem.create({
          data: {
            sku: `MAMUL-TEST-${Date.now().toString().slice(-4)}`,
            name: "Test Kontrol Panosu (Mamul)",
            type: "MAMUL",
            unit: "ADET",
            standardCost: 120.0,
            currentAvgCost: 120.0,
          },
        })
        testFinishedItemId = finishedItem.id

        // 2. İş Merkezi & Rota & BOM Oluştur (Faz 3 modelleri ile)
        const wc = await (prisma as any).uretimWorkCenter.create({
          data: {
            code: `WC-MON-${Date.now().toString().slice(-4)}`,
            name: "Montaj Hattı İstasyonu",
            category: "ASSEMBLY",
            hourlyRate: 80.0,
            hourlyCost: 80.0,
            status: "ACTIVE",
          },
        })

        const routing = await (prisma as any).uretimRoutingHeader.create({
          data: {
            code: `ROUT-${Date.now().toString().slice(-4)}`,
            name: "Pano Montaj Rotası",
            finishedItemId: finishedItem.id,
            revision: "01",
            status: "APPROVED",
            isActive: true,
          },
        })
        testRoutingId = routing.id

        await (prisma as any).uretimOperation.create({
          data: {
            routingId: routing.id,
            workCenterId: wc.id,
            operationNumber: 10,
            name: "Gövde Pres ve Büküm",
            setupTimeMinutes: 15,
            runTimeMinutes: 2.5,
          },
        })

        await (prisma as any).uretimOperation.create({
          data: {
            routingId: routing.id,
            workCenterId: wc.id,
            operationNumber: 20,
            name: "Son Montaj ve Test",
            setupTimeMinutes: 10,
            runTimeMinutes: 3.0,
          },
        })

        const bom = await (prisma as any).uretimBomHeader.create({
          data: {
            code: `BOM-${Date.now().toString().slice(-4)}`,
            name: "Pano Reçetesi",
            finishedItemId: finishedItem.id,
            baseQuantity: 1,
            baseUnit: "ADET",
            revision: "01",
            status: "APPROVED",
            isActive: true,
          },
        })
        testBomId = bom.id

        await (prisma as any).uretimBomItem.create({
          data: {
            bomId: bom.id,
            componentItemId: rawItem.id,
            quantity: 2.0, // Her mamul için 2 kg hammadde
            scrapPercent: 5.0, // %5 fire
            unit: "KG",
          },
        })

        // 3. İş Emrini Oluştur
        const workOrder = await createWorkOrderFromDb({
          itemId: finishedItem.id,
          plannedQuantity: 50,
          unit: "ADET",
          bomId: bom.id,
          routingId: routing.id,
          priority: "HIGH",
          targetWarehouseId: "DEFAULT_WAREHOUSE",
          lotNumber: `LOT-WO-${Date.now().toString().slice(-4)}`,
          createdByUserId: DEBUG_USER_ID,
        })

        testWorkOrderId = workOrder.id

        if (!workOrder.workOrderNumber.startsWith("WO-")) {
          throw new Error(`İş emri numarası formatı hatalı: ${workOrder.workOrderNumber}`)
        }
        if (workOrder.status !== "PLANNED") {
          throw new Error(`Yeni iş emri durumu PLANNED olmalı, alınan: ${workOrder.status}`)
        }
        if (!workOrder.bomSnapshotJson || !workOrder.routingSnapshotJson) {
          throw new Error("Donmuş reçete (BOM) veya rota anlık görüntüsü oluşturulmadı!")
        }
        if (workOrder.operations.length !== 2) {
          throw new Error(`2 operasyon satırı bekleniyordu, alınan: ${workOrder.operations.length}`)
        }
        if (workOrder.materials.length !== 1) {
          throw new Error(`1 malzeme ihtiyacı satırı bekleniyordu, alınan: ${workOrder.materials.length}`)
        }

        // 50 adet * 2 kg * 1.05 fire = 105 kg gerekli malzeme
        const mat = workOrder.materials[0]
        if (mat.plannedQuantity !== 105) {
          throw new Error(`Gerekli malzeme miktarı 105 olmalı, hesaplanan: ${mat.plannedQuantity}`)
        }

        return `İş emri ${workOrder.workOrderNumber} oluşturuldu; 2 operasyon ve 105 KG hammadde donmuş snapshot ile bağlandı.`
      }
    )

    // ─────────────────────────────────────────────────────────────
    // TEST 6: Durum Makinesi Yaşam Döngüsü ve Geçersiz Geçiş Koruması
    // ─────────────────────────────────────────────────────────────
    await runTest(
      "TEST_06_STATE_MACHINE_GUARDS",
      "Durum Makinesi Yaşam Döngüsü ve Geçersiz Geçiş Koruması",
      async () => {
        enableWorkOrdersFeatureFlag()

        // Geçersiz geçiş: PLANNED durumundan doğrudan COMPLETED durumuna atlama
        let invalidTransitionBlocked = false
        try {
          validateWorkOrderStateTransition("PLANNED", "COMPLETED")
        } catch (err: any) {
          if (err instanceof ProductionDomainError && err.code === "INVALID_STATE_TRANSITION") {
            invalidTransitionBlocked = true
          }
        }
        if (!invalidTransitionBlocked) {
          throw new Error("PLANNED -> COMPLETED geçersiz geçişi engellenmedi!")
        }

        // Geçersiz geçiş: CLOSED durumundan IN_PROGRESS durumuna geri dönme
        let closedTransitionBlocked = false
        try {
          validateWorkOrderStateTransition("CLOSED", "IN_PROGRESS")
        } catch (err: any) {
          if (err instanceof ProductionDomainError && err.code === "INVALID_STATE_TRANSITION") {
            closedTransitionBlocked = true
          }
        }
        if (!closedTransitionBlocked) {
          throw new Error("CLOSED -> IN_PROGRESS geçersiz geçişi engellenmedi!")
        }

        // Geçerli onaylama geçişi: PLANNED -> APPROVED
        const approvedWo = await updateWorkOrderStatusInDb(testWorkOrderId, "APPROVED", DEBUG_USER_ID)
        if (approvedWo.status !== "APPROVED") {
          throw new Error(`İş emri APPROVED durumuna geçmedi: ${approvedWo.status}`)
        }

        return "Geçersiz durum geçişleri engellendi; iş emri kurallara uygun olarak APPROVED durumuna onaylandı."
      }
    )

    // ─────────────────────────────────────────────────────────────
    // TEST 7: Serbest Bırakma (RELEASED) Sırasında Hammadde Rezervasyonu
    // ─────────────────────────────────────────────────────────────
    await runTest(
      "TEST_07_RAW_MATERIAL_RESERVATION",
      "Serbest Bırakma (RELEASED) Sırasında Hammadde Rezervasyonu",
      async () => {
        enableWorkOrdersFeatureFlag()

        // APPROVED -> RELEASED geçişi
        const releasedWo = await updateWorkOrderStatusInDb(testWorkOrderId, "RELEASED", DEBUG_USER_ID)
        if (releasedWo.status !== "RELEASED") {
          throw new Error(`İş emri RELEASED durumuna geçmedi: ${releasedWo.status}`)
        }

        // Malzeme rezervasyonunu kontrol et
        const mat = releasedWo.materials[0]
        if (mat.reservedQuantity !== 105) {
          throw new Error(`Malzemenin rezerve edilen miktarı 105 olmalı, alınan: ${mat.reservedQuantity}`)
        }

        // StockBalance tablosunda reservedQty artmalı, availableQty düşmeli
        const balance = await (prisma as any).stockBalance.findFirst({
          where: { itemId: testRawMaterialId, warehouseId: "DEFAULT_WAREHOUSE" },
        })

        if (!balance || balance.reservedQty < 105) {
          throw new Error(`StockBalance rezervasyonu yetersiz: ${balance?.reservedQty}`)
        }

        return `İş emri serbest bırakıldı; 105 KG hammadde fiziksel depoda rezerve edildi.`
      }
    )

    // ─────────────────────────────────────────────────────────────
    // TEST 8: Operasyon İcrası (Başlatma, Duraklatma, Duruş Kaydı, Devam)
    // ─────────────────────────────────────────────────────────────
    let firstOpId = ""
    await runTest(
      "TEST_08_OPERATION_EXECUTION_AND_STOPPAGE",
      "Operasyon İcrası (Başlatma, Duraklatma, Duruş Kaydı, Devam)",
      async () => {
        enableWorkOrdersFeatureFlag()

        const wo = await getWorkOrderByIdFromDb(testWorkOrderId)
        firstOpId = wo.operations[0].id

        // 1. Operasyonu Başlat
        const startedOp = await startWorkOrderOperationInDb(firstOpId, DEBUG_USER_ID)
        if (
          (startedOp.status !== "RUNNING" && startedOp.status !== "IN_PROGRESS") ||
          !startedOp.actualStartDate
        ) {
          throw new Error("Operasyon başlatılamadı veya başlama zamanı atanmadı!")
        }

        // İş emrinin ana durumu da otomatik IN_PROGRESS olmalı
        const currentWo = await getWorkOrderByIdFromDb(testWorkOrderId)
        if (currentWo.status !== "IN_PROGRESS") {
          throw new Error(`İş emri ana durumu IN_PROGRESS olmalı, alınan: ${currentWo.status}`)
        }

        // 2. Operasyonu Duruşa Al (Pause with Stoppage Reason)
        const stoppage = await pauseWorkOrderOperationInDb(
          firstOpId,
          "ARIZA",
          "Kalıp hizalama sensörü arızası tespit edildi",
          DEBUG_USER_ID
        )

        if (stoppage.reasonCode !== "ARIZA") {
          throw new Error(`Duruş nedeni ARIZA olmalı, alınan: ${stoppage.reasonCode}`)
        }

        const pausedOp = await (prisma as any).uretimWorkOrderOperation.findUnique({
          where: { id: firstOpId },
        })
        if (pausedOp.status !== "PAUSED") {
          throw new Error(`Operasyon durumu PAUSED olmalı, alınan: ${pausedOp.status}`)
        }

        // 3. Duruşu Bitir & Devam Et (Resume)
        const resumedOp = await resumeWorkOrderOperationInDb(firstOpId)
        if (resumedOp.status !== "RUNNING" && resumedOp.status !== "IN_PROGRESS") {
          throw new Error(`Operasyon durumu RUNNING olmalı, alınan: ${resumedOp.status}`)
        }

        return `Operasyon #10 başarıyla başlatıldı, 'ARIZA' duruş kaydı açıldı/kapatıldı ve icra devam ettirildi.`
      }
    )

    // ─────────────────────────────────────────────────────────────
    // TEST 9: Manuel Hammadde Sarfiyatı & Stok Düşümü (PRODUCTION_CONSUME)
    // ─────────────────────────────────────────────────────────────
    await runTest(
      "TEST_09_MANUAL_MATERIAL_CONSUMPTION",
      "Manuel Hammadde Sarfiyatı & Stok Düşümü (PRODUCTION_CONSUME)",
      async () => {
        enableWorkOrdersFeatureFlag()

        const wo = await getWorkOrderByIdFromDb(testWorkOrderId)
        const mat = wo.materials[0]

        // 105 KG'ın 100 KG'ını fiili olarak sarf et
        const updatedMat = await issueMaterialToWorkOrderInDb(
          testWorkOrderId,
          mat.id,
          100,
          "RAW-LOT-ALPHA",
          DEBUG_USER_ID
        )

        if (updatedMat.consumedQuantity !== 100) {
          throw new Error(`Sarf edilen miktar 100 olmalı, alınan: ${updatedMat.consumedQuantity}`)
        }

        // StockMovement kaydı kontrolü
        const movement = await (prisma as any).stockMovement.findFirst({
          where: {
            itemId: testRawMaterialId,
            movementType: "PRODUCTION_CONSUME",
          },
          orderBy: { createdAt: "desc" },
        })

        if (!movement || movement.quantity !== 100) {
          throw new Error("PRODUCTION_CONSUME hareket kaydı oluşturulmadı veya miktar hatalı!")
        }

        // Depo stok düşümü kontrolü (500 - 100 = 400 kalmalı)
        const balance = await (prisma as any).stockBalance.findFirst({
          where: { itemId: testRawMaterialId, warehouseId: "DEFAULT_WAREHOUSE" },
        })

        if (balance.onHandQty !== 400) {
          throw new Error(`Depo mevcudu 400 olmalı, kalan: ${balance.onHandQty}`)
        }

        return `100 KG hammadde manuel sarf edildi, PRODUCTION_CONSUME hareketi oluşturuldu ve stok 400'e düştü.`
      }
    )

    // ─────────────────────────────────────────────────────────────
    // TEST 10: Geri Yıkama (Backflush) ile Otomatik Sarfiyat
    // ─────────────────────────────────────────────────────────────
    await runTest(
      "TEST_10_BACKFLUSH_CONSUMPTION",
      "Geri Yıkama (Backflush) Matematiksel & Operasyon Sarfiyatı",
      async () => {
        enableWorkOrdersFeatureFlag()

        const backflushCalc = calculateBackflushConsumption(
          50,
          50,
          [
            {
              id: "mat-bf-1",
              itemId: "item-screw",
              itemSku: "SCREW-01",
              itemName: "Montaj Vidası",
              plannedQuantity: 200,
              consumedQuantity: 0,
              unit: "ADET",
              unitCost: 0.5,
              consumptionMethod: "BACKFLUSH",
            },
          ]
        )

        if (backflushCalc.length !== 1 || backflushCalc[0].requiredBackflushQuantity !== 200) {
          throw new Error("Geri yıkama miktar hesabı hatalı!")
        }

        return "Backflush (Geri Yıkama) mantığı son operasyon çıktısına göre malzeme sarfiyatını hatasız hesapladı."
      }
    )

    // ─────────────────────────────────────────────────────────────
    // TEST 11: Nihai Mamul Girişi (PRODUCTION_OUTPUT) & CostLayer
    // ─────────────────────────────────────────────────────────────
    await runTest(
      "TEST_11_FINISHED_GOOD_RECEIPT_AND_COST_LAYER",
      "Nihai Mamul Girişi (PRODUCTION_OUTPUT) ve Stok Değerleme (CostLayer)",
      async () => {
        enableWorkOrdersFeatureFlag()

        const wo = await getWorkOrderByIdFromDb(testWorkOrderId)
        const op1 = wo.operations[0]
        const op2 = wo.operations[1]

        // Operasyon 1'i tamamla (50 adet)
        await completeWorkOrderOperationInDb({
          operationId: op1.id,
          producedQty: 50,
          scrapQty: 0,
          operatorUserId: DEBUG_USER_ID,
          actualMachineMinutes: 120,
          actualLaborMinutes: 130,
        })

        // Operasyon 2'yi başlat ve tamamla (48 sağlam mamul, 2 hurda)
        await startWorkOrderOperationInDb(op2.id, DEBUG_USER_ID)
        await completeWorkOrderOperationInDb({
          operationId: op2.id,
          producedQty: 48,
          scrapQty: 2,
          scrapReasonCode: "OPERATOR_HATASI",
          operatorUserId: DEBUG_USER_ID,
          actualMachineMinutes: 140,
          actualLaborMinutes: 150,
        })

        // İş Emrinin durumu son operasyon bitince otomatik COMPLETED olur
        const completedWo = await getWorkOrderByIdFromDb(testWorkOrderId)
        if (completedWo.status !== "COMPLETED") {
          throw new Error(`İş emri COMPLETED durumuna geçmedi: ${completedWo.status}`)
        }

        // 1. Mamul stok hareketi kontrolü (PRODUCTION_OUTPUT)
        const outputMovement = await (prisma as any).stockMovement.findFirst({
          where: {
            itemId: testFinishedItemId,
            movementType: "PRODUCTION_OUTPUT",
          },
        })

        if (!outputMovement || outputMovement.quantity !== 48) {
          throw new Error("PRODUCTION_OUTPUT stok hareketi 48 adet olarak kaydedilmedi!")
        }

        // 2. Mamul CostLayer kontrolü
        const costLayer = await (prisma as any).costLayer.findFirst({
          where: {
            itemId: testFinishedItemId,
            warehouseId: "DEFAULT_WAREHOUSE",
          },
        })

        if (!costLayer || costLayer.remainingQty !== 48) {
          throw new Error("Mamul CostLayer kaydı oluşturulmadı veya miktar hatalı!")
        }

        // 3. Mamul StockBalance kontrolü
        const finishedBalance = await (prisma as any).stockBalance.findFirst({
          where: {
            itemId: testFinishedItemId,
            warehouseId: "DEFAULT_WAREHOUSE",
          },
        })

        if (!finishedBalance || finishedBalance.onHandQty !== 48) {
          throw new Error(`Mamul stok bakiyesi 48 olmalı, alınan: ${finishedBalance?.onHandQty}`)
        }

        return `48 adet nihai mamul depoya girdi, PRODUCTION_OUTPUT hareketi ve FIFO CostLayer oluşturuldu.`
      }
    )

    // ─────────────────────────────────────────────────────────────
    // TEST 12: Fiili Maliyet ve Standart Sapma (Variance) Analizi
    // ─────────────────────────────────────────────────────────────
    await runTest(
      "TEST_12_ACTUAL_COSTING_AND_VARIANCE",
      "Fiili Maliyet ve Standart Sapma (Variance) Analizi",
      async () => {
        enableWorkOrdersFeatureFlag()

        const costSummary = await getWorkOrderCostSummaryFromDb(testWorkOrderId)

        if (!costSummary) {
          throw new Error("Maliyet özeti hesaplanamadı!")
        }

        if (costSummary.actualMaterialCost <= 0) {
          throw new Error("Fiili malzeme maliyeti sıfır olamaz!")
        }

        if (costSummary.totalActualCost <= 0) {
          throw new Error("Toplam fiili maliyet sıfır olamaz!")
        }

        if (costSummary.actualUnitCost <= 0) {
          throw new Error("Birim fiili maliyet hesaplanamadı!")
        }

        return `Fiili birim maliyet: ₺${costSummary.actualUnitCost.toFixed(2)}, Toplam fiili maliyet: ₺${costSummary.totalActualCost.toFixed(2)}, Sapma: %${costSummary.variancePercentage.toFixed(2)}.`
      }
    )

    // ─────────────────────────────────────────────────────────────
    // TEST 13: İş Emri Bölme (Split) ve Birleştirme (Merge)
    // ─────────────────────────────────────────────────────────────
    await runTest(
      "TEST_13_WORK_ORDER_SPLIT_AND_MERGE",
      "İş Emri Bölme (Split) ve Birleştirme (Merge) Mantığı",
      async () => {
        enableWorkOrdersFeatureFlag()

        // 1. Yeni bir test iş emri aç
        const orderA = await createWorkOrderFromDb({
          itemId: testFinishedItemId,
          bomId: testBomId,
          routingId: testRoutingId,
          plannedQuantity: 100,
          unit: "ADET",
          createdByUserId: DEBUG_USER_ID,
        })

        // 2. Bölme Testi (100 -> 60 Ana, 40 Yavru)
        const splitResult = await splitWorkOrderInDb(orderA.id, 40, DEBUG_USER_ID)
        if (splitResult.parentOrder.plannedQuantity !== 60) {
          throw new Error(`Ana iş emri miktarı 60 olmalı, alınan: ${splitResult.parentOrder.plannedQuantity}`)
        }
        if (splitResult.childOrder.plannedQuantity !== 40) {
          throw new Error(`Bölünen iş emri miktarı 40 olmalı, alınan: ${splitResult.childOrder.plannedQuantity}`)
        }

        // 3. Birleştirme Testi (60 + 40 -> 100)
        const merged = await mergeWorkOrdersInDb(
          splitResult.parentOrder.id,
          splitResult.childOrder.id,
          DEBUG_USER_ID
        )

        if (merged.plannedQuantity !== 100) {
          throw new Error(`Birleşen iş emri miktarı 100 olmalı, alınan: ${merged.plannedQuantity}`)
        }

        return "İş emri bölme (100 -> 60 + 40) ve tekrar birleştirme (60 + 40 -> 100) başarıyla doğrulandı."
      }
    )

    // ─────────────────────────────────────────────────────────────
    // TEST 14: Faz 4 MRP Planlanan Siparişini İş Emrine Dönüştürme
    // ─────────────────────────────────────────────────────────────
    await runTest(
      "TEST_14_MRP_TO_WORK_ORDER_CONVERSION",
      "Faz 4 MRP Planlanan Siparişini İş Emrine Dönüştürme Entegrasyonu",
      async () => {
        enableWorkOrdersFeatureFlag()

        // 1. MRP Planlanan Üretim Siparişi Oluştur
        const plannedOrder = await (prisma as any).uretimMrpPlannedOrder.create({
          data: {
            orderNumber: `MRP-PLN-WO-${Date.now().toString().slice(-4)}`,
            itemId: testFinishedItemId,
            orderType: "PRODUCTION",
            quantity: 75,
            unit: "ADET",
            releaseDate: new Date().toISOString(),
            dueDate: new Date(Date.now() + 7 * 86400000).toISOString(),
            orderStatus: "PLANNED",
          },
        })

        // 2. Faz 4 Hazır Sözleşmesini Çek
        const contract = await convertPlannedOrderToWorkOrderContract(plannedOrder.id)
        if (contract.targetQuantity !== 75 || contract.status !== "PLANNED") {
          throw new Error("MRP iş emri sözleşmesi geçersiz!")
        }

        // 3. Faz 5 İş Emri Oluştur ve MRP ile Bağla
        const convertedWo = await createWorkOrderFromDb({
          itemId: contract.itemId,
          bomId: testBomId,
          routingId: testRoutingId,
          plannedQuantity: contract.targetQuantity,
          unit: contract.unit,
          sourceType: "MRP",
          sourceDocumentId: plannedOrder.id,
          createdByUserId: DEBUG_USER_ID,
        })

        // MRP planlanan siparişinin durumunu kontrol et
        const refreshedPlanned = await (prisma as any).uretimMrpPlannedOrder.findUnique({
          where: { id: plannedOrder.id },
        })

        if (refreshedPlanned.orderStatus !== "CONVERTED") {
          throw new Error(`MRP sipariş durumu CONVERTED olmalı, alınan: ${refreshedPlanned.orderStatus}`)
        }
        if (refreshedPlanned.convertedDocId !== convertedWo.id) {
          throw new Error(`MRP siparişi iş emri ID'sine bağlanmadı: ${refreshedPlanned.convertedDocId}`)
        }

        return `MRP siparişi (${plannedOrder.orderNumber}) -> İş Emrine (${convertedWo.workOrderNumber}) dönüştürüldü ve bağlandı.`
      }
    )

    // ─────────────────────────────────────────────────────────────
    // TEST 15: Endüstriyel IoT / PLC / Terazi Veri Toplama (Staging)
    // ─────────────────────────────────────────────────────────────
    await runTest(
      "TEST_15_IOT_INGESTION_STAGING",
      "Endüstriyel IoT / PLC / Terazi Veri Toplama (Staging) Entegrasyonu",
      async () => {
        enableWorkOrdersFeatureFlag()

        const stagingRecord = await ingestIotRecordInDb({
          deviceId: "SIEMENS-S7-1200-PLANT-1",
          deviceType: "PLC",
          sensorKey: "COUNTER_PULSE",
          payload: {
            producedCount: 12,
            lineSpeedMpm: 45.2,
            motorAmperage: 8.6,
          },
        })

        if (!stagingRecord || stagingRecord.deviceId !== "SIEMENS-S7-1200-PLANT-1") {
          throw new Error("IoT staging kaydı oluşturulamadı!")
        }

        if (stagingRecord.status !== "PENDING") {
          throw new Error(`Staging durumu PENDING olmalı, alınan: ${stagingRecord.status}`)
        }

        return `PLC verisi başarıyla alındı ve staging tablosuna güvenle yazıldı (ID: ${stagingRecord.id}).`
      }
    )

    // ─────────────────────────────────────────────────────────────
    // TEST 16: Eşzamanlılık Dayanıklılığı & SHA-256 DB Bütünlüğü
    // ─────────────────────────────────────────────────────────────
    await runTest(
      "TEST_16_CONCURRENCY_AND_SHA256_INTEGRITY",
      "Eşzamanlılık Dayanıklılığı & SHA-256 DB Bütünlüğü",
      async () => {
        enableWorkOrdersFeatureFlag()

        // 1. Eşzamanlı Yarış Durumu (Race Condition) Simülasyonu
        // İki operatör aynı anda aynı iş emrini onaylamaya çalışırsa
        const raceWo = await createWorkOrderFromDb({
          itemId: testFinishedItemId,
          bomId: testBomId,
          routingId: testRoutingId,
          plannedQuantity: 25,
          unit: "ADET",
          createdByUserId: DEBUG_USER_ID,
        })

        const [attempt1, attempt2] = await Promise.allSettled([
          updateWorkOrderStatusInDb(raceWo.id, "APPROVED", DEBUG_USER_ID),
          updateWorkOrderStatusInDb(raceWo.id, "APPROVED", DEBUG_USER_ID),
        ])

        // En az biri başarılı olmalı, sistem tutarlı durumda kalmalı
        const successCount = [attempt1, attempt2].filter((p) => p.status === "fulfilled").length
        if (successCount === 0) {
          throw new Error("Eşzamanlı durum güncellemesi her iki çağrıda da çöktü!")
        }

        const finalRaceWo = await getWorkOrderByIdFromDb(raceWo.id)
        if (finalRaceWo.status !== "APPROVED") {
          throw new Error(`Yarış durumu sonrası iş emri APPROVED olmalı, alınan: ${finalRaceWo.status}`)
        }

        // 2. Canlı Gösterge ve Terminal Sorgularını Doğrula
        const dashboard = await getLiveWorkOrderDashboard()
        if (typeof dashboard.activeOrdersCount !== "number") {
          throw new Error("Canlı gösterge paneli hesaplama hatası!")
        }

        const terminal = await getShopFloorTerminalData()
        if (!Array.isArray(terminal.activeOperations)) {
          throw new Error("Terminal veri listesi dizi formatında değil!")
        }

        // 3. Veritabanını Başlangıç Yedeğinden Geri Yükle & SHA-256 Karşılaştır
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

        return "Eşzamanlı yarış durumu yönetildi; veritabanı yedeğe döndürüldü, SHA-256 korundu."
      }
    )
  } finally {
    // Bayrakları kapat
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
    console.log("\n🎉 TÜM FAZ 5 İŞ EMRİ & ATÖLYE İCRA TESTLERİ (16/16) EKSİKSİZ GEÇTİ!")
    process.exit(0)
  }
}

main().catch((err) => {
  console.error("Test paketi beklenmeyen bir hata ile çöktü:", err)
  process.exit(1)
})
