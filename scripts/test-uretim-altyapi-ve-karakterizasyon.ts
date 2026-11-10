/**
 * Sunum ERP — Faz Altyapı & Hazırlık Otomatik Test ve Karakterizasyon Paketi
 *
 * Kapsam:
 * 1. Veritabanı Yedekleme & Geri Dönüş (Backup/Restore) Tatbikat Testi
 * 2. Özellik Bayrağı (Feature Flags) Varsayılan Kapalı, Firma/Şube ve Ortam Bazlı Çözümleme Testleri
 * 3. Additive Migration ve Rollback SQL Doğrulayıcı Testleri
 * 4. Yetki/Rol (RBAC) 6 Üretim Modülü x 5 İzin Kodu (Görüntüle, Oluştur, Düzenle, Sil, Onayla) Testleri
 * 5. Denetim Logu (logProductionAudit) ve Hata Yönetimi (ProductionDomainError) Testleri
 * 6. Karakterizasyon (Davranış Sabitleme) Testleri:
 *    - 6A. Stok Hareketi & FIFO/LIFO Maliyet Katmanı Değerlemesi (convertStockUnit, calculateStockValuation, calculateItemValuationFromDb)
 *    - 6B. Satınalma (calculateDynamicReorderPoint, calculateEoq, createPurchaseRequisition, approvePurchaseRequisition, settleConsignmentStock)
 *    - 6C. Satış Siparişi & Omnichannel Stok Rezervasyonu / Parçalı Sevkiyat (prisma.order, reserveOrderStock, executeSplitShipment)
 *    - 6D. Maliyet (calculateBomRollupCost, calculateBomRollupFromDb & Akıllı Fiyatlandırma Motoru calculatePrice)
 *
 * Çalıştırma:
 *   npx tsx scripts/test-uretim-altyapi-ve-karakterizasyon.ts
 */

import assert from "assert"
import crypto from "crypto"
import fs from "fs"
import path from "path"
import { prisma } from "../lib/db"
import {
  DEFAULT_ROLES,
  PRODUCTION_PERMISSION_ACTIONS,
  hasPermission,
  normalizePermissionResource,
} from "../lib/auth/permissions"
import type { UserBranchRole } from "../lib/auth/types"
import {
  DEFAULT_PRODUCTION_FEATURE_FLAGS,
  PRODUCTION_FEATURE_FLAG_KEYS,
  PRODUCTION_MODULES_CATALOG,
  isAnyProductionFeatureEnabled,
  isProductionFeatureEnabled,
  resolveProductionFeatureFlags,
} from "../lib/config/production-feature-flags"
import {
  applyRounding,
  calculatePrice,
  getProfitMargin,
} from "../lib/services/calculationService"
import {
  createDatabaseBackup,
  deleteDatabaseBackup,
  restoreDatabaseBackup,
  runBackupRestoreDrill,
} from "../lib/services/databaseBackupService"
import {
  calculateBomRollupFromDb,
  calculateItemValuationFromDb,
  convertStockUnitFromDb,
  seedRealisticInventoryData,
} from "../lib/services/inventoryServerDb"
import {
  calculateBomRollupCost,
  calculateStockValuation,
  convertStockUnit,
} from "../lib/services/inventoryValuationEngine"
import { validateAdditiveMigrationSql } from "../lib/services/migrationStrategyService"
import {
  executeSplitShipment,
  getOmnichannelOverviewSnapshot,
  reserveOrderStock,
} from "../lib/services/omnichannelServerDb"
import {
  calculateDynamicReorderPoint,
  calculateEoq,
} from "../lib/services/procurementReorderEngine"
import {
  approvePurchaseRequisition,
  createPurchaseRequisition,
  getProcurementOverviewSnapshot,
  settleConsignmentStock,
} from "../lib/services/procurementServerDb"
import {
  ProductionDomainError,
  assertProductionFeatureEnabled,
  handleProductionApiError,
  logProductionAudit,
} from "../lib/services/productionAuditAndError"
import { getServerProductionFeatureFlags, getSystemConfig } from "../lib/system-config"

const LOCAL_JSON_DB_PATH = path.join(
  process.cwd(),
  "storage",
  "ajans-kutuphanesi",
  ".local-db.json"
)

function sha256File(filePath: string): string {
  return crypto.createHash("sha256").update(fs.readFileSync(filePath)).digest("hex")
}

interface TestResult {
  suite: string
  name: string
  passed: boolean
  detail: string
}

const results: TestResult[] = []

async function runStep(suite: string, name: string, fn: () => Promise<string> | string) {
  try {
    const detail = await fn()
    results.push({ suite, name, passed: true, detail })
    console.log(`  ✅ [${suite}] ${name} -> ${detail}`)
  } catch (err: any) {
    const msg = err?.message || String(err)
    results.push({ suite, name, passed: false, detail: msg })
    console.error(`  ❌ [${suite}] ${name} -> HATA: ${msg}`)
    throw err
  }
}

async function main() {
  console.log("═══════════════════════════════════════════════════════════════════════════")
  console.log("🧪 SUNUM ERP — ÜRETİM ALTYAPI & KARAKTERİZASYON TEST PAKETİ BAŞLATILIYOR")
  console.log("═══════════════════════════════════════════════════════════════════════════\n")

  const initialDbHash = sha256File(LOCAL_JSON_DB_PATH)
  const safetyBackup = createDatabaseBackup({
    label: "test-suite-isolation",
    updateSystemConfigLastBackup: false,
  })

  try {
    // ─────────────────────────────────────────────────────────────────────────
    // BÖLÜM 1: VERİTABANI YEDEKLEME VE GERİ DÖNÜŞ (BACKUP & RESTORE) TESTLERİ
    // ─────────────────────────────────────────────────────────────────────────
    console.log("▶ 1. Veritabanı Yedekleme ve Geri Dönüş (Backup/Restore) Testleri")
    await runStep("YEDEKLEME", "SHA-256 doğrulamalı yedek alma, mutasyon ve geri yükleme tatbikatı", () => {
      const drill = runBackupRestoreDrill()
      assert.strictEqual(drill.passed, true)
      assert.strictEqual(drill.initialHash, drill.restoredHash)
      assert.notStrictEqual(drill.initialHash, drill.mutatedHash)
      return `${drill.collectionCount} tablo, ${drill.totalRecords} kayıt, SHA-256 %100 eşleşti (${drill.restoredHash.slice(0, 12)}...)`
    })

    // ─────────────────────────────────────────────────────────────────────────
    // BÖLÜM 2: ÖZELLİK BAYRAĞI (FEATURE FLAG) MEKANİZMASI TESTLERİ
    // ─────────────────────────────────────────────────────────────────────────
    console.log("\n▶ 2. Özellik Bayrağı (Feature Flags) Mekanizması Testleri")
    await runStep("FEATURE_FLAG", "6 üretim bayrağının tamamı varsayılan olarak KAPALI (false) olmalı", () => {
      const expectedKeys = [
        "uretim_bom_rota",
        "uretim_mrp_mps",
        "uretim_is_emri",
        "uretim_kapasite",
        "uretim_kalite",
        "uretim_bakim",
      ]
      assert.deepStrictEqual([...PRODUCTION_FEATURE_FLAG_KEYS], expectedKeys)
      const resolvedDefault = resolveProductionFeatureFlags(undefined, null)
      for (const key of expectedKeys) {
        assert.strictEqual(
          DEFAULT_PRODUCTION_FEATURE_FLAGS[key as keyof typeof DEFAULT_PRODUCTION_FEATURE_FLAGS],
          false
        )
        assert.strictEqual(resolvedDefault[key as keyof typeof resolvedDefault], false)
      }
      assert.strictEqual(isAnyProductionFeatureEnabled(undefined, null), false)

      // Mevcut sistem yapılandırmasında da tüm bayrakların kapalı olduğunu doğrula
      const liveServerFlags = getServerProductionFeatureFlags()
      for (const key of expectedKeys) {
        assert.strictEqual(liveServerFlags[key as keyof typeof liveServerFlags], false)
      }
      return "Tüm 6 bayrak (uretim_bom_rota, uretim_mrp_mps, uretim_is_emri, uretim_kapasite, uretim_kalite, uretim_bakim) varsayılan KAPALI"
    })

    await runStep("FEATURE_FLAG", "Firma/Şube bazında (branchOverrides) ve ortam bazında (env) açılabilme", () => {
      const mockConfig = {
        ...DEFAULT_PRODUCTION_FEATURE_FLAGS,
        uretim_bom_rota: false,
        branchOverrides: {
          "sube-ankara-01": {
            uretim_bom_rota: true,
            uretim_is_emri: true,
          },
          "sube-izmir-02": {
            uretim_kalite: true,
          },
        },
      }

      // Merkez şube için kapalı
      assert.strictEqual(isProductionFeatureEnabled("uretim_bom_rota", mockConfig, "sube-merkez"), false)
      assert.strictEqual(isAnyProductionFeatureEnabled(mockConfig, "sube-merkez"), false)

      // Ankara şubesi için sadece bom_rota ve is_emri açık
      assert.strictEqual(isProductionFeatureEnabled("uretim_bom_rota", mockConfig, "sube-ankara-01"), true)
      assert.strictEqual(isProductionFeatureEnabled("uretim_is_emri", mockConfig, "sube-ankara-01"), true)
      assert.strictEqual(isProductionFeatureEnabled("uretim_mrp_mps", mockConfig, "sube-ankara-01"), false)
      assert.strictEqual(isAnyProductionFeatureEnabled(mockConfig, "sube-ankara-01"), true)

      // Ortam değişkeni (ENV) geçersiz kılma testi
      process.env.FEATURE_URETIM_MRP_MPS = "true"
      try {
        assert.strictEqual(isProductionFeatureEnabled("uretim_mrp_mps", mockConfig, "sube-merkez"), true)
      } finally {
        delete process.env.FEATURE_URETIM_MRP_MPS
      }
      assert.strictEqual(isProductionFeatureEnabled("uretim_mrp_mps", mockConfig, "sube-merkez"), false)

      return "Firma/şube (branchOverrides) ve ortam (ENV) bazlı bayrak çözümleme doğrulandı"
    })

    // ─────────────────────────────────────────────────────────────────────────
    // BÖLÜM 3: MIGRATION STRATEJİSİ DOĞRULAYICI TESTLERİ
    // ─────────────────────────────────────────────────────────────────────────
    console.log("\n▶ 3. Additive Migration ve Rollback Stratejisi Testleri")
    await runStep("MIGRATION", "Geçerli additive Uretim* migration ve rollback SQL doğrulaması", () => {
      const validUpSql = `
        CREATE TABLE IF NOT EXISTS "UretimWorkCenter" (
          "id" TEXT NOT NULL,
          "code" TEXT NOT NULL,
          "name" TEXT NOT NULL,
          CONSTRAINT "UretimWorkCenter_pkey" PRIMARY KEY ("id")
        );
        ALTER TABLE "BomHeader" ADD COLUMN IF NOT EXISTS "routingId" TEXT;
      `
      const validDownSql = `
        ALTER TABLE "BomHeader" DROP COLUMN IF EXISTS "routingId";
        DROP TABLE IF EXISTS "UretimWorkCenter" CASCADE;
      `
      const check = validateAdditiveMigrationSql("20261110_uretim_faz1", validUpSql, validDownSql)
      assert.strictEqual(check.valid, true, check.errors.join(", "))
      assert.deepStrictEqual(check.addedTables, ["UretimWorkCenter"])
      assert.deepStrictEqual(check.alteredTables, ["BomHeader"])
      return "Uretim önekli CREATE TABLE IF NOT EXISTS ve rollback.sql doğrulandı"
    })

    await runStep("MIGRATION", "Yıkıcı (DROP COLUMN / yanlış önek / eksik rollback) migration reddi", () => {
      const invalidUpSql = `
        CREATE TABLE IF NOT EXISTS "WorkCenter" ("id" TEXT NOT NULL);
        ALTER TABLE "InventoryItem" DROP COLUMN "sku";
      `
      const incompleteDownSql = `-- eksik rollback`
      const check = validateAdditiveMigrationSql("invalid_mig", invalidUpSql, incompleteDownSql)
      assert.strictEqual(check.valid, false)
      assert.ok(check.errors.some((e) => e.includes("DROP COLUMN")))
      assert.ok(check.errors.some((e) => e.includes("Uretim")))
      assert.ok(check.errors.some((e) => e.includes("rollback.sql")))
      return `Yıkıcı SQL ve yanlış önek başarıyla engellendi (${check.errors.length} kural yakalandı)`
    })

    // ─────────────────────────────────────────────────────────────────────────
    // BÖLÜM 4: YETKİ / ROL (RBAC) İZİN KODLARI TESTLERİ
    // ─────────────────────────────────────────────────────────────────────────
    console.log("\n▶ 4. Yetki/Rol (RBAC) 6 Üretim Modülü ve 5 İzin Kodu Testleri")
    await runStep("RBAC_YETKI", "6 üretim modülü için görüntüle, oluştur, düzenle, sil, onayla izinlerinin doğrulanması", () => {
      assert.deepStrictEqual(
        [...PRODUCTION_PERMISSION_ACTIONS],
        ["read", "create", "update", "delete", "approve"]
      )

      // Super Admin tüm 6 modülde 5 iznin tamamına sahip olmalı
      for (const mod of PRODUCTION_MODULES_CATALOG) {
        assert.strictEqual(normalizePermissionResource(mod.key), mod.key)
        const saPerms = DEFAULT_ROLES["Super Admin"][mod.key]
        assert.deepStrictEqual(saPerms, ["read", "create", "update", "delete", "approve"])
      }

      // Özel üretim rolü ile Türkçe/İngilizce aksiyon takma adlarını test et
      const mockUserRoles: UserBranchRole[] = [
        {
          id: "ubr-1",
          userId: "u-uretim-1",
          branchId: "br-1",
          roleId: "r-uretim-sef",
          role: {
            id: "r-uretim-sef",
            name: "Üretim Şefi",
            description: "Atölye Sorumlusu",
            permissions: {
              uretim_is_emri: ["read", "create", "update", "approve"],
              uretim_kalite: ["read", "approve"],
            },
          },
        },
      ]

      assert.strictEqual(hasPermission(mockUserRoles, "br-1", "uretim_is_emri", "read"), true)
      assert.strictEqual(hasPermission(mockUserRoles, "br-1", "uretim_is_emri", "goruntule"), true)
      assert.strictEqual(hasPermission(mockUserRoles, "br-1", "uretim_is_emri", "olustur"), true)
      assert.strictEqual(hasPermission(mockUserRoles, "br-1", "uretim_is_emri", "duzenle"), true)
      assert.strictEqual(hasPermission(mockUserRoles, "br-1", "uretim_is_emri", "onayla"), true)
      assert.strictEqual(hasPermission(mockUserRoles, "br-1", "uretim_is_emri", "sil"), false)
      assert.strictEqual(hasPermission(mockUserRoles, "br-1", "uretim_is_emri", "delete"), false)
      assert.strictEqual(hasPermission(mockUserRoles, "br-1", "uretim_bakim", "read"), false)

      return "6 üretim modülü x 5 aksiyon (read/görüntüle, create/oluştur, update/düzenle, delete/sil, approve/onayla) doğrulandı"
    })

    // ─────────────────────────────────────────────────────────────────────────
    // BÖLÜM 5: DENETİM LOGU (AUDIT) VE HATA YÖNETİMİ TESTLERİ
    // ─────────────────────────────────────────────────────────────────────────
    console.log("\n▶ 5. Denetim Logu (Audit Log) ve Hata Yönetimi Testleri")
    await runStep("AUDIT_ERROR", "Kapalı özellik bayrağında 403 FEATURE_DISABLED ve AuditLog kaydı", async () => {
      let caughtError: ProductionDomainError | null = null
      try {
        assertProductionFeatureEnabled("uretim_is_emri", "br-1")
      } catch (err) {
        if (err instanceof ProductionDomainError) {
          caughtError = err
        }
      }
      assert.ok(caughtError, "Kapalı bayrakta ProductionDomainError fırlatılmalıydı")
      assert.strictEqual(caughtError!.code, "FEATURE_DISABLED")
      assert.strictEqual(caughtError!.status, 403)

      const response = handleProductionApiError(caughtError)
      assert.strictEqual(response.status, 403)
      const body = await response.json()
      assert.strictEqual(body.code, "FEATURE_DISABLED")

      const auditEntry = await logProductionAudit({
        userId: "test-audit-user",
        action: "FEATURE_FLAG_BLOCKED",
        resource: "URETIM_IS_EMRI",
        moduleKey: "uretim_is_emri",
        branchId: "br-1",
        metadata: { reason: "Bayrak kapalı testi" },
      })
      assert.ok(auditEntry && auditEntry.id, "AuditLog kaydı oluşturulmalı")
      return `403 FEATURE_DISABLED yanıtı ve AuditLog (ID: ${auditEntry.id}) doğrulandı`
    })

    // ─────────────────────────────────────────────────────────────────────────
    // BÖLÜM 6: KARAKTERİZASYON (DAVRANIŞ SABİTLEME) TESTLERİ
    // ─────────────────────────────────────────────────────────────────────────
    console.log("\n▶ 6. Karakterizasyon (Davranış Sabitleme) Testleri — Mevcut Kritik Akışlar")

    // 6A. STOK HAREKETİ & FIFO/LIFO KATMAN DEĞERLEMESİ
    await runStep("KARAKTERİZASYON_STOK", "Birim dönüşümü (convertStockUnit) ve FIFO/LIFO değerleme (calculateStockValuation)", () => {
      const mockItem: any = {
        id: "itm-test",
        sku: "GUL-TEST-01",
        name: "Ekvator Kırmızı Gül",
        baseUnit: "Adet",
        unitConversions: [
          {
            id: "uc-1",
            fromUnit: "Koli",
            toUnit: "Adet",
            multiplier: 24,
            barcode: "869-KOLI",
            weightKg: 4.8,
            volumeM3: 0.048,
            isDefaultPurchase: true,
            isDefaultSales: false,
          },
          {
            id: "uc-2",
            fromUnit: "Demet",
            toUnit: "Adet",
            multiplier: 12,
            barcode: "869-DEMET",
            weightKg: 2.4,
            volumeM3: 0.024,
            isDefaultPurchase: false,
            isDefaultSales: true,
          },
        ],
      }

      const convKoliToAdet = convertStockUnit(mockItem, 2, "Koli", "Adet")
      assert.strictEqual(convKoliToAdet.convertedQty, 48)
      const convKoliToDemet = convertStockUnit(mockItem, 2, "Koli", "Demet")
      assert.strictEqual(convKoliToDemet.convertedQty, 4)

      const layers: any[] = [
        {
          id: "L1",
          receiptDocNo: "GRN-01",
          layerDate: "2026-01-01",
          warehouseCode: "DEP-01",
          lotNumber: "LOT-01",
          initialQty: 10,
          remainingQty: 10,
          unitCost: 100,
        },
        {
          id: "L2",
          receiptDocNo: "GRN-02",
          layerDate: "2026-02-01",
          warehouseCode: "DEP-01",
          lotNumber: "LOT-02",
          initialQty: 10,
          remainingQty: 10,
          unitCost: 150,
        },
      ]

      // 15 adet çıkış için:
      // FIFO Maliyet = (10 * 100) + (5 * 150) = 1750 TL
      // LIFO Maliyet = (10 * 150) + (5 * 100) = 2000 TL
      // Ağırlıklı Ortalama Birim Maliyet = (1000 + 1500) / 20 = 125 TL -> 15 * 125 = 1875 TL
      const valFifo = calculateStockValuation(layers, "FIFO", 110, 15)
      assert.strictEqual(valFifo.fifoTotalCost, 1750)
      assert.strictEqual(valFifo.lifoTotalCost, 2000)
      assert.strictEqual(valFifo.weightedAvgUnitCost, 125)
      assert.strictEqual(valFifo.weightedAvgTotalCost, 1875)
      assert.strictEqual(valFifo.cogsForSimulatedIssue, 1750)

      return `Birim çevrimi (2 Koli = 48 Adet = 4 Demet) ve Değerleme (FIFO: ₺1.750, LIFO: ₺2.000, Ort: ₺1.875) sabitlendi`
    })

    await runStep("KARAKTERİZASYON_STOK_DB", "Canlı veritabanı stok tohumlama, bakiye, maliyet katmanı ve stok hareketi akışı", async () => {
      await seedRealisticInventoryData()

      const itemGul = await (prisma as any).inventoryItem.findFirst({
        where: { sku: "GUL-EKV-01" },
        include: { stockBalances: true },
      })
      assert.ok(itemGul, "Tohumlanmış GUL-EKV-01 ürünü mevcut olmalı")

      const valFromDb = await calculateItemValuationFromDb(itemGul.id, 10, "FIFO")
      assert.strictEqual(valFromDb.success, true)
      assert.ok(valFromDb.valuation.fifoTotalCost > 0)

      const unitFromDb = await convertStockUnitFromDb(itemGul.id, 2, "Koli", "Demet")
      assert.strictEqual(unitFromDb.success, true)

      // Stok hareketi (PRODUCTION_CONSUME ve PRODUCTION_OUTPUT) kaydı ve bakiye güncelleme
      const balance = itemGul.stockBalances[0]
      const initialOnHand = Number(balance.onHandQty)
      await (prisma as any).stockBalance.update({
        where: { id: balance.id },
        data: {
          onHandQty: initialOnHand - 5,
          availableQty: Math.max(0, initialOnHand - 5 - Number(balance.reservedQty || 0)),
        },
      })
      const mov = await (prisma as any).stockMovement.create({
        data: {
          itemId: itemGul.id,
          warehouseId: balance.warehouseId,
          movementType: "PRODUCTION_CONSUME",
          quantity: 5,
          unitCost: Number(itemGul.fifoUnitCost || 45),
          totalCost: 5 * Number(itemGul.fifoUnitCost || 45),
          documentType: "WORK_ORDER",
          documentNo: "WO-CHAR-001",
          notes: "Karakterizasyon üretim sarfiyat testi",
        },
      })
      assert.strictEqual(mov.movementType, "PRODUCTION_CONSUME")

      return `GUL-EKV-01 canlı değerleme (FIFO: ₺${valFromDb.valuation.fifoTotalCost}) ve PRODUCTION_CONSUME hareketi (${mov.documentNo}) doğrulandı`
    })

    // 6B. SATINALMA & ROP/EOQ VE KONSİNYE MUTABAKAT
    await runStep("KARAKTERİZASYON_SATINALMA", "Dinamik ROP/EOQ hesabı, Satınalma Talebi (PR), Onay ve Konsinye Mutabakatı", async () => {
      // 1. ROP & EOQ matematiksel kontrol
      const ropResult = calculateDynamicReorderPoint({
        avgDailyDemand: 20,
        demandStdDev: 4,
        leadTimeDays: 4,
        serviceLevelPercent: 95,
        seasonalityMultiplier: 1.0,
        currentAvailableQty: 30,
        onOrderQty: 0,
        minOrderQtyMoq: 50,
      })
      assert.ok(ropResult.safetyStock > 0)
      assert.ok(ropResult.reorderPointRop > 80)
      assert.strictEqual(ropResult.status, "BELOW_ROP")

      const eoq = calculateEoq(7300, 250, 15)
      assert.strictEqual(eoq, 493)

      // 2. Satınalma snapshot ve PR yaşam döngüsü
      const procSnap = await getProcurementOverviewSnapshot()
      assert.strictEqual(procSnap.success, true)
      assert.ok(procSnap.suppliers.length > 0)
      assert.ok(procSnap.allItems.length > 0)

      const targetSupplier = procSnap.suppliers[0]
      const targetItem = procSnap.allItems[0]

      const createdPr = await createPurchaseRequisition({
        supplierId: targetSupplier.id,
        itemId: targetItem.id,
        quantity: 40,
        unitCost: 55,
        priority: "HIGH",
        notes: "Karakterizasyon satınalma talebi",
        triggerSource: "MRP_ENGINE",
      })
      assert.strictEqual(createdPr.success, true)
      assert.strictEqual(createdPr.requisition.status, "PENDING_APPROVAL")

      const approvedPr = await approvePurchaseRequisition(
        createdPr.requisition.id,
        "Satınalma Müdürü Test"
      )
      assert.strictEqual(approvedPr.success, true)
      assert.strictEqual(approvedPr.requisition.status, "APPROVED_PO_SENT")

      // 3. Konsinye stok tüketim mutabakatı
      if (procSnap.consignmentStocks.length > 0) {
        const consign = procSnap.consignmentStocks[0]
        const beforeAvail = Number(consign.availableConsignQty)
        const settled = await settleConsignmentStock(consign.id, 2, "Üretimde konsinye kullanımı")
        assert.strictEqual(settled.success, true)
        assert.strictEqual(Number(settled.data.availableConsignQty), beforeAvail - 2)
      }

      return `ROP=${ropResult.reorderPointRop} (SS=${ropResult.safetyStock}), EOQ=${eoq}, Talep (${createdPr.requisition.reqNumber} -> APPROVED_PO_SENT) & Konsinye mutabakatı sabitlendi`
    })

    // 6C. SATIŞ SİPARİŞİ & OMNICHANNEL STOK REZERVASYONU / PARÇALI SEVKİYAT
    await runStep("KARAKTERİZASYON_SIPARIS", "Çekirdek Satış Siparişi (Order) ve Omnichannel Stok Rezervasyonu / Parçalı Sevkiyat", async () => {
      const createdOrder = await prisma.order.create({
        data: {
          branchId: "local-debug-branch",
          title: "Kurumsal Aranjman Siparişi",
          orderType: "corporate",
          quantity: 5,
          priority: "high",
          orderNumber: "ORD-CHAR-9001",
          status: "pending",
          paymentStatus: "unpaid",
          totalAmount: 4500,
          customerName: "Test Müşteri A.Ş.",
          orderDate: new Date(),
        },
      })
      assert.strictEqual(createdOrder.orderNumber, "ORD-CHAR-9001")

      const updatedOrder = await prisma.order.update({
        where: { id: createdOrder.id },
        data: { status: "processing" },
      })
      assert.strictEqual(updatedOrder.status, "processing")

      // Omnichannel sipariş rezervasyonu ve parçalı sevkiyat
      const omniSnap = await getOmnichannelOverviewSnapshot()
      assert.strictEqual(omniSnap.success, true)
      assert.ok(omniSnap.orders.length > 0)

      const targetOmniOrder = omniSnap.orders[0]
      const resStock = await reserveOrderStock(targetOmniOrder.id)
      assert.strictEqual(resStock.success, true)
      assert.strictEqual(resStock.order.status, "RESERVED")

      if (targetOmniOrder.shipmentLines && targetOmniOrder.shipmentLines.length > 0) {
        const line = targetOmniOrder.shipmentLines[0]
        const remainingToShip = Number(line.quantity) - Number(line.shippedQty || 0)
        if (remainingToShip > 0) {
          const splitRes = await executeSplitShipment({
            orderId: targetOmniOrder.id,
            lineId: line.id,
            shipQuantity: 1,
            carrierName: "Yurtiçi Kargo",
            trackingNumber: "YK-CHAR-1001",
          })
          assert.strictEqual(splitRes.success, true)
        }
      }

      return `Satış Siparişi (${createdOrder.orderNumber}) ve Omnichannel Rezervasyon/Sevkiyat (${targetOmniOrder.orderNumber}) sabitlendi`
    })

    // 6D. MALİYET (BOM ROLLUP & AKILLI FİYATLANDIRMA MOTORU)
    await runStep("KARAKTERİZASYON_MALIYET", "Ürün Reçetesi (BOM) maliyet patlatımı ve Akıllı Fiyatlandırma Motoru", async () => {
      // 1. Saf BOM Rollup Maliyet Motoru (inventoryValuationEngine.ts)
      const mockBom: any = {
        id: "bom-test-1",
        code: "BOM-TEST-001",
        name: "Standart Lüks Buket Reçetesi",
        version: "v1.0",
        finishedItemId: "fin-1",
        finishedSku: "BUK-TEST-01",
        finishedName: "Lüks Gül Buketi",
        outputQty: 1,
        outputUnit: "Adet",
        laborCostPerBatch: 120,
        overheadCostPerBatch: 80,
        scrapRatePercent: 0,
        leadTimeHours: 2,
        isActive: true,
        components: [
          {
            id: "c-1",
            componentItemId: "raw-1",
            componentSku: "HAM-GUL-01",
            componentName: "Kırmızı Gül",
            itemType: "RAW_MATERIAL",
            quantity: 10,
            unit: "Dal",
            scrapPercent: 10, // Efektif miktar: 11 Dal
            fifoUnitCost: 20, // 11 * 20 = 220 TL
            lifoUnitCost: 22, // 11 * 22 = 242 TL
            avgUnitCost: 21,  // 11 * 21 = 231 TL
            standardUnitCost: 20,
            availableStock: 55, // 55 / 10 = Maksimum 5 parti üretilebilir
            operationStep: "10 - Gül Hazırlık",
          },
        ],
      }

      const rollup = calculateBomRollupCost(mockBom, 1)
      // FIFO Parti Maliyeti: 220 (malzeme) + 120 (işçilik) + 80 (genel gider) = 420 TL
      assert.strictEqual(rollup.fifoBatchCost, 420)
      assert.strictEqual(rollup.lifoBatchCost, 442)
      assert.strictEqual(rollup.avgBatchCost, 431)
      assert.strictEqual(rollup.maxProducibleBatches, 5)
      assert.ok(rollup.bottleneckComponentSku.includes("HAM-GUL-01"))

      // 2. Veritabanı üzerindeki gerçek BOM kaydından Rollup hesabı (calculateBomRollupFromDb)
      const dbBom = await (prisma as any).bomHeader.findFirst()
      if (dbBom) {
        const dbRollupRes = await calculateBomRollupFromDb(dbBom.id, 2)
        assert.strictEqual(dbRollupRes.success, true)
        assert.ok(dbRollupRes.rollup!.fifoBatchCost > 0)
      }

      // 3. Akıllı Fiyatlandırma Motoru (calculationService.ts)
      assert.strictEqual(getProfitMargin(400), 170)
      assert.strictEqual(getProfitMargin(800), 150)
      assert.strictEqual(getProfitMargin(2500), 135)
      assert.strictEqual(getProfitMargin(5000), 125)
      assert.strictEqual(getProfitMargin(15000), 110)

      assert.strictEqual(applyRounding(1440, "hundred"), 1400)
      assert.strictEqual(applyRounding(1440, "90"), 1490)
      assert.strictEqual(applyRounding(1440, "99"), 1499)

      const priceCalc = calculatePrice({
        productCost: 400,
        shippingCost: 100, // baseCost = 500
        vatRate: 20,       // vat = 100
        commissionRate: 10,// commission = 50 -> totalCost = 650 (Marj: %150)
        roundingStrategy: "none",
      })
      assert.strictEqual(priceCalc.baseCost, 500)
      assert.strictEqual(priceCalc.totalCost, 650)
      assert.strictEqual(priceCalc.appliedProfitRate, 150)
      assert.strictEqual(priceCalc.calculatedPrice, 1625)

      return `BOM Rollup (FIFO: ₺${rollup.fifoBatchCost}, Maks Parti: ${rollup.maxProducibleBatches}) & Fiyat Motoru (₺${priceCalc.calculatedPrice}) sabitlendi`
    })
  } finally {
    // ─────────────────────────────────────────────────────────────────────────
    // İZOLASYON GERİ YÜKLEMESİ: Veritabanını test öncesi birebir durumuna döndür
    // ─────────────────────────────────────────────────────────────────────────
    restoreDatabaseBackup(safetyBackup.backupId, {
      createPreRestoreSafetyBackup: false,
      restoreSystemConfig: true,
    })
    deleteDatabaseBackup(safetyBackup.backupId)
  }

  // Son doğrulama: Veritabanı SHA-256 özeti ve özellik bayrakları Faz 0 ile birebir aynı mı?
  const finalDbHash = sha256File(LOCAL_JSON_DB_PATH)
  assert.strictEqual(
    finalDbHash,
    initialDbHash,
    "Test paketi sonrasında veritabanı SHA-256 özeti Faz 0 başlangıç durumuyla birebir aynı olmalıdır!"
  )

  const finalConfig = getSystemConfig()
  const finalFlags = resolveProductionFeatureFlags(finalConfig.featureFlags)
  for (const key of PRODUCTION_FEATURE_FLAG_KEYS) {
    assert.strictEqual(finalFlags[key], false, `Bayrak '${key}' kapalı kalmalıdır!`)
  }

  await prisma.$disconnect()

  console.log("\n═══════════════════════════════════════════════════════════════════════════")
  console.log(`🎉 TÜM TESTLER BAŞARIYLA GEÇTİ (${results.length}/${results.length})`)
  console.log(`🔒 Veritabanı İzolasyon SHA-256 : ${finalDbHash} (Faz 0 ile %100 Birebir Aynı)`)
  console.log(`🚩 Özellik Bayrakları Durumu    : Tümü KAPALI (false)`)
  console.log("═══════════════════════════════════════════════════════════════════════════")
}

main().catch((err) => {
  console.error("\n❌ TEST PAKETİ BAŞARISIZ OLDU:", err)
  process.exit(1)
})
