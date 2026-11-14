/**
 * Sunum ERP — Lojistik Faz 1 Altyapı, Sağlayıcı Adaptörleri, Yetki/Kapsam ve Karakterizasyon Test Paketi
 *
 * Kapsam:
 * 1. Saf Tip / İstemci-Sunucu Ayrımı Kontrolü (lib/logistics/types.ts ve constants.ts içinde fs/db/audit olmaması)
 * 2. Özellik Bayrakları: Varsayılan Kapalı, Şube Geçersiz Kılma, Demo Modu Açık & Menü Görünürlüğü
 * 3. Sağlayıcı Adaptör Mimarisi: Haversine + 2-Opt Key-Free Rota Çözücüsü, E-İrsaliye Demo-DB, Telematik, İade Webhook, POD Depolama
 * 4. Yetki/Rol (RBAC) 5 Lojistik Modülü x 5 İzin (Görüntüle/Oluştur/Düzenle/Sil/Onayla) & Kısıtlı "Tedarikçi" Kapsam Filtresi
 * 5. Additive Migration & Rollback SQL Doğrulaması (20261114153000_lojistik_altyapi_ve_tedarikci_rolu + Lojistik* kuralı)
 * 6. Demo Seed Çerçevesi Güvenlik Kontrolleri:
 *    - Gerçek ortam kilidi (DISABLE_DEMO_MODE=true iken reddetme)
 *    - Idempotency (tekrar çalıştırmada kopya üretmeme)
 *    - Mevcut demo verilerinin korunması (hash & kayıt sayısı doğrulaması)
 *    - Tek komutla geri alma (rollback)
 * 7. Backup & Restore Tatbikatı (SHA-256 birebir eşleşme)
 * 8. Karakterizasyon Testleri (Faz 0 kritik akışları):
 *    - Stok Hareketi & Değerleme (inventoryServerDb + inventoryValuationEngine)
 *    - Depolar Arası Transfer (wmsServerDb: createTransferOrder -> IN_TRANSIT -> RECEIVED)
 *    - Satınalma Talebi & Onay (procurementServerDb)
 *    - Omnichannel Rezervasyon, Parçalı Sevkiyat & E-İrsaliye (omnichannelServerDb)
 *    - Kalite & Tedarikçi Performans (productionQualityServerDb)
 *
 * Çalıştırma:
 *   npx tsx scripts/test-lojistik-faz1-altyapi.ts
 */

process.env.SUNUM_DISABLE_CRON = "1"

import assert from "assert"
import crypto from "crypto"
import fs from "fs"
import path from "path"
import QRCode from "qrcode"
import JsBarcode from "jsbarcode"
import { BrowserMultiFormatReader } from "@zxing/browser"
import { prisma } from "../lib/db"
import {
  DEFAULT_ROLES,
  LOGISTICS_PERMISSION_ACTIONS,
  hasPermission,
  normalizePermissionResource,
} from "../lib/auth/permissions"
import type { UserBranchRole } from "../lib/auth/types"
import {
  DEFAULT_LOGISTICS_FEATURE_FLAGS,
  LOGISTICS_FEATURE_FLAG_KEYS,
  LOGISTICS_MODULES_CATALOG,
  isAnyLogisticsFeatureEnabled,
  isLogisticsFeatureEnabled,
  isLogisticsFleetMenuVisible,
  resolveLogisticsFeatureFlags,
} from "../lib/config/logistics-feature-flags"
import { TEDARIKCI_ROLE_NAME, DEMO_WAREHOUSE_COORDINATES } from "../lib/logistics/constants"
import { createLogisticsProviders } from "../lib/logistics/providers"
import {
  LogisticsDomainError,
  applySupplierScopeFilter,
  assertSupplierRecordAccess,
  buildSupplierPrismaWhere,
  getLogisticsScopeContext,
} from "../lib/logistics/security"
import {
  LogisticsSeedEnvironmentError,
  assertLogisticsDemoSeedAllowed,
} from "../lib/logistics/seed/framework"
import {
  rollbackAllLogisticsDemoSeeds,
  runAllLogisticsDemoSeeds,
} from "../lib/logistics/seed"
import {
  createDatabaseBackup,
  deleteDatabaseBackup,
  restoreDatabaseBackup,
  runBackupRestoreDrill,
} from "../lib/services/databaseBackupService"
import {
  validateAllLogisticsMigrations,
  validateAllUretimMigrations,
  validateLogisticsAdditiveMigrationSql,
} from "../lib/services/migrationStrategyService"
import { calculateItemValuationFromDb } from "../lib/services/inventoryServerDb"
import {
  advanceTransferOrderStatus,
  createTransferOrder,
  getWmsOverviewStats,
} from "../lib/services/wmsServerDb"
import {
  approvePurchaseRequisition,
  createPurchaseRequisition,
  getProcurementOverviewSnapshot,
} from "../lib/services/procurementServerDb"
import {
  createGibEDocument,
  executeSplitShipment,
  getOmnichannelOverviewSnapshot,
  reserveOrderStock,
} from "../lib/services/omnichannelServerDb"
import { getSupplierQualityRatingsReport } from "../lib/services/productionQualityServerDb"
import { getServerLogisticsFeatureFlags } from "../lib/system-config"

const LOCAL_JSON_DB_PATH = path.join(
  process.cwd(),
  "storage",
  "ajans-kutuphanesi",
  ".local-db.json"
)

interface TestStepResult {
  suite: string
  name: string
  passed: boolean
  detail: string
}

const results: TestStepResult[] = []

async function runStep(
  suite: string,
  name: string,
  fn: () => Promise<string> | string
) {
  try {
    const detail = await fn()
    results.push({ suite, name, passed: true, detail })
    console.log(`  ✅ [${suite}] ${name} — ${detail}`)
  } catch (err: any) {
    const msg = err?.stack || err?.message || String(err)
    results.push({ suite, name, passed: false, detail: msg })
    console.error(`  ❌ [${suite}] ${name} — ${msg}`)
  }
}

async function withSavedEnv<T>(
  overrides: Record<string, string | undefined>,
  fn: () => Promise<T> | T
): Promise<T> {
  const previous: Record<string, string | undefined> = {}
  for (const key of Object.keys(overrides)) {
    previous[key] = process.env[key]
    if (overrides[key] === undefined) {
      delete process.env[key]
    } else {
      process.env[key] = overrides[key]
    }
  }
  try {
    return await fn()
  } finally {
    for (const key of Object.keys(overrides)) {
      if (previous[key] === undefined) {
        delete process.env[key]
      } else {
        process.env[key] = previous[key]
      }
    }
  }
}

async function main() {
  console.log("🚀 Lojistik & Depo Yönetimi — Faz 1 Altyapı & Karakterizasyon Testleri\n")

  // Test öncesi .local-db.json tam ham byte kopyası al (test sonunda geri yüklenir)
  const initialDbRawBuffer = fs.readFileSync(LOCAL_JSON_DB_PATH)
  const initialDbSha = crypto.createHash("sha256").update(initialDbRawBuffer).digest("hex")
  const safetyBackup = createDatabaseBackup({
    label: "faz1-test-safety",
    updateSystemConfigLastBackup: false,
  })

  try {
    // 1. İstemci/Sunucu Ayrımı
    console.log("▶ 1. Saf Tip ve İstemci-Sunucu Import Ayrımı")
    await runStep("PURE_TYPES", "Client-safe dosyalarda fs/db/audit importu olmaması", () => {
      const pureFiles = [
        "lib/logistics/types.ts",
        "lib/logistics/constants.ts",
        "lib/config/logistics-feature-flags.ts",
      ]
      const forbiddenPattern =
        /from\s+["'](?:fs|path|node:fs|node:path|@\/lib\/db|@\/lib\/audit|@\/lib\/system-config)["']/
      for (const rel of pureFiles) {
        const content = fs.readFileSync(path.join(process.cwd(), rel), "utf8")
        assert.strictEqual(
          forbiddenPattern.test(content),
          false,
          `${rel} sunucuya özel modül import etmemeli!`
        )
      }
      return `${pureFiles.length} paylaşılan dosya tamamen saf doğrulandı`
    })

    // 2. Özellik Bayrakları & Menü Görünürlüğü
    console.log("\n▶ 2. Özellik Bayrakları (5 Modül) ve Menü Görünürlüğü")
    await runStep("FEATURE_FLAGS", "Gerçek kurulumda tüm lojistik bayraklarının varsayılan KAPALI olması", async () => {
      await withSavedEnv(
        {
          DISABLE_DEMO_MODE: "true",
          FEATURE_LOJISTIK_ALL: undefined,
          FEATURE_LOJISTIK_WMS: undefined,
          FEATURE_LOJISTIK_SEVKIYAT_ROTA: undefined,
          FEATURE_LOJISTIK_TEDARIKCI: undefined,
          FEATURE_LOJISTIK_FILO: undefined,
          FEATURE_LOJISTIK_IADE: undefined,
        },
        () => {
          assert.strictEqual(LOGISTICS_FEATURE_FLAG_KEYS.length, 5)
          const resolved = resolveLogisticsFeatureFlags(undefined, "branch-prod")
          for (const key of LOGISTICS_FEATURE_FLAG_KEYS) {
            assert.strictEqual(DEFAULT_LOGISTICS_FEATURE_FLAGS[key], false)
            assert.strictEqual(resolved[key], false)
          }
          assert.strictEqual(isAnyLogisticsFeatureEnabled(undefined, "branch-prod"), false)
          assert.strictEqual(isLogisticsFleetMenuVisible(undefined, "branch-prod"), false)

          // Şube bazlı açma + demo dışı ENV override testi
          const cfg = {
            branchOverrides: {
              "branch-pilot": { lojistik_filo: true },
            },
          }
          assert.strictEqual(isLogisticsFeatureEnabled("lojistik_filo", cfg, "branch-pilot"), true)
          assert.strictEqual(isLogisticsFeatureEnabled("lojistik_wms", cfg, "branch-pilot"), false)
          // Henüz sayfa dosyası eklenmediği için Faz 1'de boş Lojistik & Filo menüsü kapalı kalmalı
          assert.strictEqual(isLogisticsFleetMenuVisible(cfg, "branch-pilot"), false)
          // Sayfa rotası eklendiğinde (Faz 4 simülasyonu) menü görünür olmalı
          assert.strictEqual(
            isLogisticsFleetMenuVisible(cfg, "branch-pilot", ["/dashboard/filo"]),
            true
          )
        }
      )
      return "Gerçek ortam varsayılan false, şube geçersiz kılma ve boş menü gizleme kuralı doğrulandı"
    })

    await runStep("FEATURE_FLAGS_DEMO", "Demo modunda 5 lojistik bayrağının tamamının AÇIK çözülmesi", async () => {
      await withSavedEnv({ DISABLE_DEMO_MODE: undefined, ENABLE_DEMO_MODE: undefined }, () => {
        const flags = getServerLogisticsFeatureFlags("local-debug-branch")
        for (const key of LOGISTICS_FEATURE_FLAG_KEYS) {
          assert.strictEqual(flags[key], true, `${key} demo modunda true olmalı`)
        }
      })
      return "Demo modunda 5/5 lojistik bayrağı aktif"
    })

    // 3. Sağlayıcı Adaptör Mimarisi (Karar #5)
    console.log("\n▶ 3. Sağlayıcı Adaptör Mimarisi ve Key-Free Rota Motoru")
    await runStep("PROVIDERS_ROUTING", "Haversine + 2-Opt uygulama içi rota optimizasyonu", async () => {
      const bundle = createLogisticsProviders()
      assert.strictEqual(bundle.routing.mode, "local-solver")
      assert.strictEqual(bundle.eDocument.mode, "demo-db")
      assert.strictEqual(bundle.telematics.mode, "demo-db")

      const depot = DEMO_WAREHOUSE_COORDINATES["wh-merkez-01"]
      const route = await bundle.routing.optimizeStops(
        depot,
        [
          { stopId: "s-besiktas", label: "Beşiktaş Zorlu", lat: 41.0668, lng: 29.0174 },
          { stopId: "s-kadikoy", label: "Kadıköy Merkez", lat: 40.9901, lng: 29.0291 },
          { stopId: "s-atasehir", label: "Ataşehir Hub", lat: 40.9833, lng: 29.1277 },
          { stopId: "s-pendik", label: "Pendik Marina", lat: 40.8732, lng: 29.2248 },
        ],
        { avgSpeedKmh: 40, returnToDepot: false }
      )
      assert.strictEqual(route.orderedStops.length, 4)
      // Tuzla'dan en yakın başlangıç durağı Pendik olmalı
      assert.strictEqual(route.orderedStops[0].stopId, "s-pendik")
      assert.ok(route.totalDistanceKm > 20 && route.totalDistanceKm < 80)
      assert.ok(route.estimatedDurationMinutes > 30)
      assert.strictEqual(route.polylinePoints.length, 5)
      return `4 durak sıralandı: ${route.orderedStops.map((s) => s.label).join(" -> ")} (${route.totalDistanceKm} km)`
    })

    await runStep("PROVIDERS_ADAPTERS", "E-İrsaliye / Telematik / İade Webhook / POD Depolama adaptörleri", async () => {
      const bundle = createLogisticsProviders()
      const edoc = await bundle.eDocument.submitEDocument({
        documentType: "E_IRSALIYE",
        relatedOrderNo: "TEST-WAVE-001",
        receiverTitle: "Demo Otelcilik A.Ş.",
        receiverVknTckn: "1234567890",
        vehiclePlate: "34 SNR 808",
        driverName: "Cemal Kaya",
        lines: [{ sku: "GUL-EKV-01", name: "Ekvator Gülü", quantity: 10, unit: "Demet", unitPrice: 120 }],
      })
      assert.strictEqual(edoc.success, true)
      assert.strictEqual(edoc.gibStatusCode, "1300")
      const statusRes = await bundle.eDocument.queryEDocumentStatus(edoc.ettnUuid)
      assert.strictEqual(statusRes.ettnUuid, edoc.ettnUuid)

      const fleetTelemetry = await bundle.telematics.listFleetTelemetry()
      assert.ok(Array.isArray(fleetTelemetry))

      const podRes = await bundle.storage.saveProofArtifact({
        fileName: "pod-test.txt",
        mimeType: "text/plain",
        base64OrDataUrl: Buffer.from("POD-IMZA-TEST").toString("base64"),
        category: "POD_SIGNATURE",
        referenceId: "stop-test-1",
      })
      assert.ok(podRes.checksumSha256.length === 64)
      // Geçici POD dosyasını test sonrası temizle
      const podDiskPath = path.join(process.cwd(), "storage", "logistics-pods", podRes.storageKey)
      if (fs.existsSync(podDiskPath)) fs.unlinkSync(podDiskPath)

      return `E-İrsaliye (${edoc.documentNo}), ${fleetTelemetry.length} telemetri ve POD checksum doğrulandı`
    })

    // 4. RBAC & Tedarikçi Rolü Kapsam Filtresi
    console.log("\n▶ 4. RBAC 5 Modül İzinleri ve Kısıtlı Tedarikçi Kapsam Filtresi")
    await runStep("RBAC", "5 Lojistik modülü x 5 aksiyon & Tedarikçi kapsam kuralı", async () => {
      assert.deepStrictEqual([...LOGISTICS_PERMISSION_ACTIONS], ["read", "create", "update", "delete", "approve"])
      for (const mod of LOGISTICS_MODULES_CATALOG) {
        assert.strictEqual(normalizePermissionResource(mod.resourceKey), mod.resourceKey)
        assert.deepStrictEqual(DEFAULT_ROLES["Super Admin"][mod.resourceKey], [
          "read",
          "create",
          "update",
          "delete",
          "approve",
        ])
      }

      const supplierRole: UserBranchRole[] = [
        {
          id: "ubr-sup",
          userId: "user-tedarikci-flora",
          branchId: "local-debug-branch",
          roleId: "role-tedarikci",
          assignedAt: new Date().toISOString(),
          role: {
            id: "role-tedarikci",
            name: TEDARIKCI_ROLE_NAME,
            permissions: DEFAULT_ROLES[TEDARIKCI_ROLE_NAME],
          },
        },
      ]
      assert.strictEqual(hasPermission(supplierRole, "local-debug-branch", "tedarikci_portali", "görüntüle"), true)
      assert.strictEqual(hasPermission(supplierRole, "local-debug-branch", "tedarikci_portali", "create"), true)
      assert.strictEqual(hasPermission(supplierRole, "local-debug-branch", "lojistik_filo", "read"), false)
      assert.strictEqual(hasPermission(supplierRole, "local-debug-branch", "lojistik_wms", "delete"), false)

      // Kapsam filtresi testi: demo seed sonrası kullanıcının bağlı olduğu tedarikçi dışında erişim engellenmeli
      await runAllLogisticsDemoSeeds({ createBackup: false })
      const scope = await getLogisticsScopeContext(
        { userId: "user-tedarikci-flora", username: "tedarikci.royal", branchId: "local-debug-branch" },
        "local-debug-branch"
      )
      assert.strictEqual(scope.isSupplierScoped, true)
      assert.strictEqual(scope.supplierId, "sup-holland-01")

      const sampleRecords = [
        { id: "po-1", supplierId: "sup-holland-01" },
        { id: "po-2", supplierId: "sup-yalova-02" },
      ]
      const filtered = applySupplierScopeFilter(sampleRecords, scope)
      assert.strictEqual(filtered.length, 1)
      assert.strictEqual(filtered[0].id, "po-1")
      assert.deepStrictEqual(buildSupplierPrismaWhere(scope, { status: "OPEN" }), {
        status: "OPEN",
        supplierId: "sup-holland-01",
      })
      assert.throws(() => assertSupplierRecordAccess(scope, "sup-yalova-02"), LogisticsDomainError)

      return "5 modül x 5 aksiyon, Tedarikçi rolü izinleri ve fail-closed supplierId filtresi doğrulandı"
    })

    // 5. Additive Migration & Rollback SQL
    console.log("\n▶ 5. Additive Migration ve Rollback SQL Doğrulaması")
    await runStep("MIGRATION", "Lojistik & Üretim additive migration + rollback doğrulaması", () => {
      const logResults = validateAllLogisticsMigrations()
      assert.ok(logResults.length >= 1, "En az 1 lojistik migration klasörü bulunmalı")
      for (const r of logResults) {
        assert.strictEqual(r.valid, true, `${r.migrationName}: ${r.errors.join(", ")}`)
      }

      const invalid = validateLogisticsAdditiveMigrationSql(
        "test_bad_lojistik",
        `CREATE TABLE "FleetVehicle" ("id" TEXT); ALTER TABLE "User" DROP COLUMN "email";`,
        ``
      )
      assert.strictEqual(invalid.valid, false)

      const uretimResults = validateAllUretimMigrations()
      for (const r of uretimResults) {
        assert.strictEqual(r.valid, true, `${r.migrationName}: ${r.errors.join(", ")}`)
      }
      return `${logResults.length} Lojistik + ${uretimResults.length} Üretim migration çifti temiz doğrulandı`
    })

    // 6. Demo Seed Çerçevesi & Rollback
    console.log("\n▶ 6. Demo Seed Güvenlik Kilidi, Idempotency ve Rollback Testi")
    await runStep("SEED_FRAMEWORK", "DISABLE_DEMO_MODE=true iken seed reddi + idempotency + rollback", async () => {
      await withSavedEnv({ DISABLE_DEMO_MODE: "true" }, () => {
        assert.throws(() => assertLogisticsDemoSeedAllowed(), LogisticsSeedEnvironmentError)
      })

      // Temiz başla: rollback çalıştır, seed 1. kez, seed 2. kez idempotency kontrolü, sonra tekrar rollback
      const rb1 = rollbackAllLogisticsDemoSeeds({ createSafetyBackup: false })
      assert.strictEqual(rb1.preExistingIntegrityIntact, true)

      const seed1 = await runAllLogisticsDemoSeeds({ createBackup: false })
      assert.strictEqual(seed1.preExistingIntegrityIntact, true)
      const inserted1 = Object.values(seed1.modulesExecuted[0].inserted).reduce((a, b) => a + b, 0)
      assert.strictEqual(inserted1, 3)

      const seed2 = await runAllLogisticsDemoSeeds({ createBackup: false })
      assert.strictEqual(seed2.preExistingIntegrityIntact, true)
      const inserted2 = Object.values(seed2.modulesExecuted[0].inserted).reduce((a, b) => a + b, 0)
      assert.strictEqual(inserted2, 0, "İkinci çalıştırmada sıfır yeni kayıt eklenmeli (idempotent)")

      const rb2 = rollbackAllLogisticsDemoSeeds({ createSafetyBackup: false })
      assert.strictEqual(rb2.preExistingIntegrityIntact, true)
      assert.strictEqual(rb2.removedByCollection.user, 1)
      assert.strictEqual(rb2.removedByCollection.role, 1)

      return "Gerçek ortam reddi, idempotency (3->0 ekleme), veri bütünlüğü ve tek komut rollback doğrulandı"
    })

    // 7. Backup & Restore Tatbikatı
    console.log("\n▶ 7. Backup & Restore SHA-256 Tatbikatı")
    await runStep("BACKUP_DRILL", "runBackupRestoreDrill SHA-256 birebir doğrulaması", () => {
      const drill = runBackupRestoreDrill()
      assert.strictEqual(drill.initialHash, drill.restoredHash)
      assert.notStrictEqual(drill.initialHash, drill.mutatedHash)
      return `Tatbikat başarılı (${drill.collectionCount} koleksiyon, ${drill.totalRecords} kayıt, SHA-256 eşleşti)`
    })

    // 8. Mevcut Akış Karakterizasyon Testleri
    console.log("\n▶ 8. Karakterizasyon Testleri — Mevcut Kritik Akışlar")
    await runStep("CHAR_STOK", "Stok Değerleme (calculateItemValuationFromDb)", async () => {
      const gul = await (prisma as any).inventoryItem.findFirst({ where: { sku: "GUL-EKV-01" } })
      assert.ok(gul, "GUL-EKV-01 mevcut olmalı")
      const valRes = await calculateItemValuationFromDb(gul.id, 10, "FIFO")
      assert.strictEqual(valRes.success, true)
      assert.ok((valRes.valuation?.fifoTotalCost ?? 0) > 0)
      return `GUL-EKV-01 FIFO değerleme (${valRes.valuation?.fifoTotalCost} TRY) sabitlendi`
    })

    await runStep("CHAR_WMS", "Depolar Arası Transfer Akışı (createTransferOrder -> IN_TRANSIT -> RECEIVED)", async () => {
      const stats = await getWmsOverviewStats()
      assert.ok(stats.totalBins > 0)
      const warehouses = await (prisma as any).warehouse.findMany({ take: 2 })
      const item = await (prisma as any).inventoryItem.findFirst({ where: { sku: "GUL-EKV-01" } })
      if (warehouses.length >= 2 && item) {
        const created = await createTransferOrder({
          fromWarehouseId: warehouses[0].id,
          toWarehouseId: warehouses[1].id,
          itemId: item.id,
          quantity: 2,
          driverName: "Cemal Kaya",
          vehiclePlate: "34 SNR 808",
        })
        assert.strictEqual(created.success, true)
        assert.ok(created.transferOrder?.id)
        const transit = await advanceTransferOrderStatus(created.transferOrder.id, "IN_TRANSIT")
        assert.strictEqual(transit.success, true)
        const received = await advanceTransferOrderStatus(created.transferOrder.id, "RECEIVED")
        assert.strictEqual(received.success, true)
        return `Transfer (${created.transferOrder.transferNumber}) APPROVED -> IN_TRANSIT -> RECEIVED doğrulandı`
      }
      return `WMS özet (${stats.totalBins} raf) doğrulandı`
    })

    await runStep("CHAR_PROCUREMENT", "Satınalma Snapshot -> PR Oluşturma -> Onay", async () => {
      const snap = await getProcurementOverviewSnapshot()
      assert.strictEqual(snap.success, true)
      assert.ok(snap.suppliers.length > 0 && snap.allItems.length > 0)
      const pr = await createPurchaseRequisition({
        supplierId: snap.suppliers[0].id,
        itemId: snap.allItems[0].id,
        quantity: 20,
        unitCost: 45,
        priority: "NORMAL",
        notes: "Faz 1 karakterizasyon PR",
      })
      assert.strictEqual(pr.success, true)
      const appr = await approvePurchaseRequisition(pr.requisition.id, "Test Yöneticisi")
      assert.strictEqual(appr.success, true)
      assert.strictEqual(appr.requisition.status, "APPROVED_PO_SENT")
      return `PR (${pr.requisition.reqNumber} -> APPROVED_PO_SENT) sabitlendi`
    })

    await runStep("CHAR_OMNICHANNEL", "Omnichannel Rezervasyon, Parçalı Sevkiyat ve E-İrsaliye", async () => {
      const snap = await getOmnichannelOverviewSnapshot()
      assert.strictEqual(snap.success, true)
      assert.ok(snap.orders.length > 0)
      const order = snap.orders[0]
      const reserved = await reserveOrderStock(order.id)
      assert.strictEqual(reserved.success, true)
      if (order.shipmentLines?.length > 0) {
        const line = order.shipmentLines[0]
        if (Number(line.quantity) > Number(line.shippedQty || 0)) {
          const split = await executeSplitShipment({
            orderId: order.id,
            lineId: line.id,
            shipQuantity: 1,
            carrierName: "Yurtiçi Kargo",
            trackingNumber: "TRK-FAZ1-CHAR",
          })
          assert.strictEqual(split.success, true)
        }
      }
      const edoc = await createGibEDocument({
        documentType: "E_IRSALIYE",
        relatedOrderNo: order.orderNumber,
        receiverTitle: order.customerName,
        receiverVkn: "1111111111",
        vehiclePlate: "34 SNR 720",
        driverName: "Kemal Öztürk",
        totalNetTry: 300,
      })
      assert.strictEqual(edoc.success, true)
      assert.ok(edoc.doc?.documentNo)
      return `Sipariş (${order.orderNumber}) ve GİB E-İrsaliye (${edoc.doc.documentNo}) sabitlendi`
    })

    await runStep("CHAR_QUALITY", "Kalite Kontrol & Tedarikçi Performans Raporu Uyumu", async () => {
      const ratings = await getSupplierQualityRatingsReport()
      assert.ok(Array.isArray(ratings))
      return `Tedarikçi kalite karnesi (${ratings.length} tedarikçi kaydı) doğrulandı`
    })

    // 9. Harita / QR / Barkod / Kamera Paket Uyumluluk ve Lisans Kontrolü
    console.log("\n▶ 9. Paket Uyumluluk, API & Ticari Lisans Kontrolü (Karar #2)")
    await runStep("PACKAGE_SMOKE", "Leaflet, QRCode, JsBarcode ve ZXing Browser çalışma doğrulaması", async () => {
      const qrSvg = await QRCode.toString("SSCC-386900010000001234", { type: "svg" })
      assert.ok(qrSvg.includes("<svg"), "QRCode SVG üretimi çalışmalı")
      assert.strictEqual(typeof JsBarcode, "function", "JsBarcode fonksiyonu yüklenmeli")
      assert.strictEqual(typeof BrowserMultiFormatReader, "function", "ZXing tarayıcı okuyucu sınıfı yüklenmeli")
      assert.ok(
        fs.existsSync(path.join(process.cwd(), "node_modules", "leaflet", "dist", "leaflet.css")),
        "Leaflet CSS dosyası mevcut olmalı"
      )
      assert.ok(
        fs.existsSync(path.join(process.cwd(), "node_modules", "leaflet", "dist", "leaflet.js")),
        "Leaflet bundle dosyası mevcut olmalı"
      )

      const requiredLicenses: Record<string, string[]> = {
        leaflet: ["BSD-2-Clause", "MIT"],
        qrcode: ["MIT"],
        jsbarcode: ["MIT"],
        "@zxing/browser": ["MIT"],
        "@zxing/library": ["Apache-2.0", "MIT"],
      }
      for (const [pkgName, allowed] of Object.entries(requiredLicenses)) {
        const pkgJson = JSON.parse(
          fs.readFileSync(path.join(process.cwd(), "node_modules", ...pkgName.split("/"), "package.json"), "utf8")
        )
        assert.ok(allowed.includes(pkgJson.license), `${pkgName} lisansı (${pkgJson.license}) uyumlu olmalı`)
      }
      return "Leaflet (BSD-2), QRCode/JsBarcode/ZXing (MIT/Apache-2.0) API ve SVG üretimi doğrulandı"
    })
  } finally {
    // Test mutasyonlarını geri yükle -> başlangıçtaki ham byte/LF durumunu %100 koru
    restoreDatabaseBackup(safetyBackup.backupId, {
      createPreRestoreSafetyBackup: false,
      restoreSystemConfig: false,
    })
    fs.writeFileSync(LOCAL_JSON_DB_PATH, initialDbRawBuffer)
    const afterRestoreSha = crypto
      .createHash("sha256")
      .update(fs.readFileSync(LOCAL_JSON_DB_PATH))
      .digest("hex")
    deleteDatabaseBackup(safetyBackup.backupId)
    console.log(
      `\n♻️  Veritabanı test öncesi durumuna döndürüldü (SHA-256 eşleşmesi: ${afterRestoreSha === initialDbSha ? "EVET" : "HAYIR"})`
    )
  }

  const passedCount = results.filter((r) => r.passed).length
  console.log(`\n═══════════════════════════════════════════════════════════════`)
  console.log(` SONUÇ: ${passedCount}/${results.length} test adımı başarılı.`)
  console.log(`═══════════════════════════════════════════════════════════════`)
  if (passedCount !== results.length) {
    process.exit(1)
  }
}

main().catch((err) => {
  console.error("Kritik test hatası:", err)
  process.exit(1)
})
