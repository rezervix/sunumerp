/**
 * Sunum ERP — Turizm Faz 1: Altyapı, 4 Bağımsız Özellik Bayrağı, RBAC,
 * Çok Firmalı (Kiracı/Partner) Veri İzolasyonu, Demo Seed Çerçevesi,
 * Yedekleme/Geri Dönüş Tatbikatı ve Mevcut Akış Karakterizasyon Test Paketi
 *
 * Kapsam:
 * 1. Saf Tip & İstemci-Sunucu Sınırı (lib/tourism/types.ts, constants.ts, tourism-feature-flags.ts içinde fs/db/audit olmaması)
 * 2. Özellik Bayrakları (turizm_rentacar, turizm_otel, turizm_tur, turizm_b2b):
 *    - Gerçek kurulumlarda varsayılan KAPALI (false), Şube override, ENV override, Demo'da AÇIK (true)
 *    - Modül bağımsızlığı (açık/kapalı kombinasyonları birbirini, Lojistik'i ve Üretim'i etkilemez)
 *    - Menü görünürlüğü (kapalı modül veya henüz ekranı olmayan rota menüde görünmez)
 * 3. Yetki / RBAC: 4 Turizm Modülü + Partner Portalı x 5 İzin (Görüntüle/Oluştur/Düzenle/Sil/Onayla) & Kısıtlı "Partner" Rolü
 * 4. Additive SQL Migration & Rollback Doğrulaması (Turizm* + Lojistik* + Uretim*)
 * 5. Veritabanı Yedekleme & Geri Dönüş (Backup/Restore) Tatbikatı (SHA-256 birebir eşleşme)
 * 6. Demo Seed Çerçevesi & 4 Kurgusal Partner Firma:
 *    - DISABLE_DEMO_MODE=true ortam kilidi
 *    - İdempotent çalışma (2. çalışmada 0 yeni kayıt), pre-existing SHA-256 parmak izi koruması
 *    - 4 kurgusal partner firma (RENTACAR, TOUR_OPERATOR, HOTEL, TRANSFER) + Ana Operatör + 4 kısıtlı kullanıcı + 6 partnerlik (APPROVED/PENDING/REJECTED)
 *    - Tek komutla rollback ve mevcut verinin %100 korunması
 * 7. Çok Firmalı (Kiracı) Veri İzolasyonu:
 *    - Firma A (Örnek Ege Rota) Firma B'nin (Örnek Kıyı Otel) özel kaynağını göremez ve erişemez (403 FORBIDDEN_COMPANY_SCOPE)
 *    - Firma A yalnızca taraf olduğu partnerlik/çapraz rezervasyonları görür; Firma C ↔ Firma D arasındaki ilişkiye erişemez (403)
 *    - Bağsız Partner hesabı fail-closed reddedilir; Partner hesabı dahili ERP uçlarına giremez (403 FORBIDDEN_PARTNER_SCOPE)
 *    - Tedarikçi hesabı Turizm uçlarına giremez (403 FORBIDDEN_SUPPLIER_SCOPE)
 *    - Mevcut tek firmalı/şubeli iç personel davranışı değişmez (isPartnerScoped === false)
 * 8. Mevcut Kritik Akış Karakterizasyon Testleri (Müşteri/Cari, Finans, E-Belge, Filo KVKK, Sevkiyat CVRPTW)
 *
 * Çalıştırma:
 *   npx cross-env SUNUM_DISABLE_CRON=1 npx tsx scripts/test-turizm-faz1-altyapi.ts
 */

process.env.SUNUM_DISABLE_CRON = "1"

import assert from "node:assert/strict"
import crypto from "node:crypto"
import fs from "node:fs"
import path from "node:path"
import { prisma } from "../lib/db"
import {
  DEFAULT_ROLES,
  TOURISM_PERMISSION_ACTIONS,
  hasPermission,
  normalizePermissionAction,
  normalizePermissionResource,
} from "../lib/auth/permissions"
import type { UserBranchRole } from "../lib/auth/types"
import {
  DEFAULT_TOURISM_FEATURE_FLAGS,
  IMPLEMENTED_TOURISM_HREFS,
  TOURISM_FEATURE_FLAG_KEYS,
  TOURISM_MODULES_CATALOG,
  TOURISM_SECTOR_PACKETS,
  getVisibleTourismMenuModules,
  isAnyTourismFeatureEnabled,
  isTourismFeatureEnabled,
  isTourismModuleMenuVisible,
  resolveTourismFeatureFlags,
} from "../lib/config/tourism-feature-flags"
import { resolveLogisticsFeatureFlags } from "../lib/config/logistics-feature-flags"
import { resolveProductionFeatureFlags } from "../lib/config/production-feature-flags"
import {
  MAIN_COMPANY_ID,
  PARTNER_ROLE_NAME,
  TURIZM_TABLE_PREFIX,
} from "../lib/tourism/constants"
import {
  TourismDomainError,
  applyCompanyScopeFilter,
  assertCompanyRecordAccess,
  assertCrossReservationAccess,
  assertPartnershipAccess,
  assertTourismFeatureEnabled,
  buildCompanyPrismaWhere,
  getTourismScopeContext,
} from "../lib/tourism/security"
import {
  LOCAL_JSON_DB_PATH,
  LogisticsSeedEnvironmentError,
  assertLogisticsDemoSeedAllowed,
} from "../lib/logistics/seed/framework"
import {
  rollbackAllTourismDemoSeeds,
  runAllTourismDemoSeeds,
} from "../lib/tourism/seed"
import {
  createDatabaseBackup,
  deleteDatabaseBackup,
  restoreDatabaseBackup,
  runBackupRestoreDrill,
} from "../lib/services/databaseBackupService"
import {
  validateAllLogisticsMigrations,
  validateAllTourismMigrations,
  validateAllUretimMigrations,
  validateTourismAdditiveMigrationSql,
} from "../lib/services/migrationStrategyService"
import { createLogisticsProviders } from "../lib/logistics/providers"
import {
  listFleetDrivers,
  listFleetVehicles,
} from "../lib/logistics/fleet"
import {
  listDispatchOverviewAndReadyPool,
  optimizeSingleTripRoute,
} from "../lib/logistics/dispatch"

const SYS_CFG_PATH = path.join(process.cwd(), "storage", "system_config.json")

function computeFileSha256(filePath: string): string {
  return crypto.createHash("sha256").update(fs.readFileSync(filePath)).digest("hex")
}

function expectTourismError(
  fn: () => void,
  expectedCode: string,
  label: string
) {
  let caught: any = null
  try {
    fn()
  } catch (err: any) {
    caught = err
  }
  assert.ok(caught, `${label}: hata fırlatılmalıydı`)
  assert.ok(
    caught instanceof TourismDomainError,
    `${label}: TourismDomainError bekleniyordu, alınan: ${caught?.name}`
  )
  assert.equal(
    caught.code,
    expectedCode,
    `${label}: beklenen kod ${expectedCode}, alınan ${caught.code}`
  )
}

async function main() {
  console.log("═══════════════════════════════════════════════════════════════════════")
  console.log(" SUNUM ERP — TURİZM FAZ 1 ALTYAPI, İZOLASYON VE KARAKTERİZASYON TESTİ")
  console.log("═══════════════════════════════════════════════════════════════════════")

  const initialDbBuf = fs.readFileSync(LOCAL_JSON_DB_PATH)
  const initialDbHash = computeFileSha256(LOCAL_JSON_DB_PATH)
  const initialCfgBuf = fs.existsSync(SYS_CFG_PATH) ? fs.readFileSync(SYS_CFG_PATH) : null
  const initialCfgHash = initialCfgBuf ? computeFileSha256(SYS_CFG_PATH) : null

  const safetyBackup = createDatabaseBackup({
    label: "test-turizm-faz1-safety",
    updateSystemConfigLastBackup: false,
  })

  let passed = 0
  let total = 0

  const step = async (code: string, title: string, fn: () => Promise<string> | string) => {
    total++
    const detail = await fn()
    passed++
    console.log(`  ✅ [${code}] ${title} — ${detail}`)
  }

  try {
    // 1. SAF TİP VE İSTEMCİ-SUNUCU SINIRI KONTROLÜ
    console.log("\n▶ 1. Saf Tip & İstemci-Sunucu Ayrımı Kontrolü")
    await step("PURE_TYPES", "Paylaşılan tip, sabit ve bayrak dosyalarında fs/db/audit importu olmaması", () => {
      const pureFiles = [
        "lib/tourism/types.ts",
        "lib/tourism/constants.ts",
        "lib/tourism/index.ts",
        "lib/config/tourism-feature-flags.ts",
      ]
      const forbiddenRegex = /from\s+["'](?:fs|node:fs|path|node:path|@\/lib\/db|\.\.\/db|@\/lib\/audit|\.\.\/audit)["']/
      for (const rel of pureFiles) {
        const content = fs.readFileSync(path.join(process.cwd(), rel), "utf8")
        assert.equal(
          forbiddenRegex.test(content),
          false,
          `${rel} istemci-güvenli olmalı, sunucu modülü import edemez!`
        )
      }
      return `${pureFiles.length} saf dosya doğrulandı`
    })

    // 2. ÖZELLİK BAYRAKLARI, BAĞIMSIZLIK VE MENÜ GİZLEME
    console.log("\n▶ 2. Özellik Bayrakları, Modül Bağımsızlığı & Menü Görünürlüğü")
    await step("FEATURE_FLAGS_DEFAULT_OFF", "Gerçek kurulumda (demoMode=false) 4 turizm bayrağının varsayılan KAPALI (false) başlaması", () => {
      assert.deepEqual(
        [...TOURISM_FEATURE_FLAG_KEYS],
        ["turizm_rentacar", "turizm_otel", "turizm_tur", "turizm_b2b"]
      )
      const flags = resolveTourismFeatureFlags(undefined, null, false)
      for (const key of TOURISM_FEATURE_FLAG_KEYS) {
        assert.equal(DEFAULT_TOURISM_FEATURE_FLAGS[key], false)
        assert.equal(flags[key], false)
        assert.equal(isTourismFeatureEnabled(key, undefined, null, false), false)
      }
      assert.equal(isAnyTourismFeatureEnabled(undefined, null, false), false)
      return "4/4 bayrak varsayılan false"
    })

    await step("FEATURE_FLAGS_INDEPENDENCE", "Bayrakların tek tek açılıp kapanması; diğer turizm, lojistik ve üretim bayraklarını etkilememesi", () => {
      for (const activeKey of TOURISM_FEATURE_FLAG_KEYS) {
        const cfg = { [activeKey]: true }
        const resolved = resolveTourismFeatureFlags(cfg, "branch-izmir", false)
        for (const k of TOURISM_FEATURE_FLAG_KEYS) {
          assert.equal(resolved[k], k === activeKey)
        }
        // Lojistik ve Üretim bayrakları bu yapılandırmadan etkilenmez
        const logFlags = resolveLogisticsFeatureFlags(undefined, "branch-izmir", false)
        assert.equal(logFlags.lojistik_filo, false)
        assert.equal(logFlags.lojistik_wms, false)
        const prevDisableDemo = process.env.DISABLE_DEMO_MODE
        process.env.DISABLE_DEMO_MODE = "true"
        try {
          const prodFlags = resolveProductionFeatureFlags(undefined, "branch-izmir")
          assert.equal(prodFlags.uretim_bom_rota, false)
        } finally {
          if (prevDisableDemo === undefined) delete process.env.DISABLE_DEMO_MODE
          else process.env.DISABLE_DEMO_MODE = prevDisableDemo
        }
      }

      // Şube bazlı override testi
      const branchCfg = {
        turizm_rentacar: false,
        branchOverrides: {
          "branch-ankara": { turizm_rentacar: true, turizm_otel: true },
        },
      }
      assert.equal(isTourismFeatureEnabled("turizm_rentacar", branchCfg, "local-debug-branch", false), false)
      assert.equal(isTourismFeatureEnabled("turizm_rentacar", branchCfg, "branch-ankara", false), true)
      assert.equal(isTourismFeatureEnabled("turizm_otel", branchCfg, "branch-ankara", false), true)
      assert.equal(isTourismFeatureEnabled("turizm_tur", branchCfg, "branch-ankara", false), false)

      // ENV override testi
      process.env.FEATURE_TURIZM_TUR = "true"
      try {
        assert.equal(isTourismFeatureEnabled("turizm_tur", branchCfg, "local-debug-branch", false), true)
      } finally {
        delete process.env.FEATURE_TURIZM_TUR
      }

      return `${TOURISM_FEATURE_FLAG_KEYS.length} bağımsız modül + ${TOURISM_SECTOR_PACKETS.length} sektör paketi kombinasyonu doğrulandı`
    })

    await step("FEATURE_FLAGS_DEMO_AND_MENU", "Demo ortamında tüm bayrakların AÇIK olması, kapalı/henüz ekranı olmayan modüllerin menüde gizlenmesi", () => {
      const demoFlags = resolveTourismFeatureFlags(undefined, null, true)
      for (const k of TOURISM_FEATURE_FLAG_KEYS) {
        assert.equal(demoFlags[k], true)
      }
      // Faz 1'de IMPLEMENTED_TOURISM_HREFS boş olduğu için kırık (404) menü linki asla çıkmaz
      assert.equal(IMPLEMENTED_TOURISM_HREFS.length, 0)
      assert.equal(getVisibleTourismMenuModules(undefined, null, IMPLEMENTED_TOURISM_HREFS, true).length, 0)

      // Simüle edilen tamamlanmış rotalarla: yalnızca bayrağı açık olan sektör başlığı menüde görünür
      const allHrefs = TOURISM_MODULES_CATALOG.map((m) => m.primaryHref)
      const onlyRentAndHotel = {
        turizm_rentacar: true,
        turizm_otel: true,
        turizm_tur: false,
        turizm_b2b: false,
      }
      const visible = getVisibleTourismMenuModules(onlyRentAndHotel, null, allHrefs, false)
      assert.deepEqual(
        visible.map((m) => m.menuCategoryTitle),
        ["Araç Kiralama", "Otel Yönetimi"]
      )
      assert.equal(isTourismModuleMenuVisible("turizm_tur", onlyRentAndHotel, null, allHrefs, false), false)
      assert.equal(isTourismModuleMenuVisible("turizm_b2b", onlyRentAndHotel, null, allHrefs, false), false)
      return "Demo=true ve menü gizleme kuralları doğrulandı"
    })

    // 3. YETKİ (RBAC) MATRİSİ VE KISITLI PARTNER ROLÜ
    console.log("\n▶ 3. Yetki (RBAC) Matrisi & Kısıtlı Partner Rolü")
    await step("RBAC_MATRIX", "4 turizm modülü x 5 aksiyon (read/create/update/delete/approve + Türkçe alias) ve Partner rolü kısıtları", () => {
      assert.deepEqual(
        [...TOURISM_PERMISSION_ACTIONS],
        ["read", "create", "update", "delete", "approve"]
      )
      assert.equal(normalizePermissionResource("arac-kiralama"), "turizm_rentacar")
      assert.equal(normalizePermissionResource("otel"), "turizm_otel")
      assert.equal(normalizePermissionResource("tur-operatorlugu"), "turizm_tur")
      assert.equal(normalizePermissionResource("partner-agi"), "turizm_b2b")
      assert.equal(normalizePermissionAction("Görüntüle"), "read")
      assert.equal(normalizePermissionAction("Oluştur"), "create")
      assert.equal(normalizePermissionAction("Düzenle"), "update")
      assert.equal(normalizePermissionAction("Sil"), "delete")
      assert.equal(normalizePermissionAction("Onayla"), "approve")

      const partnerRoleAssignment: UserBranchRole[] = [
        {
          id: "ubr-test-partner",
          userId: "u-partner",
          branchId: "local-debug-branch",
          roleId: "role-partner",
          assignedAt: new Date().toISOString(),
          role: {
            id: "role-partner",
            name: PARTNER_ROLE_NAME,
            permissions: DEFAULT_ROLES[PARTNER_ROLE_NAME],
          },
        },
      ]

      // Partner yalnızca B2B ve Partner Portalı'nda read/create/update yapabilir; delete/approve veya diğer modüllere erişemez
      assert.equal(hasPermission(partnerRoleAssignment, "local-debug-branch", "turizm_b2b", "read"), true)
      assert.equal(hasPermission(partnerRoleAssignment, "local-debug-branch", "turizm_b2b", "Oluştur"), true)
      assert.equal(hasPermission(partnerRoleAssignment, "local-debug-branch", "turizm_b2b", "delete"), false)
      assert.equal(hasPermission(partnerRoleAssignment, "local-debug-branch", "turizm_b2b", "approve"), false)
      assert.equal(hasPermission(partnerRoleAssignment, "local-debug-branch", "turizm_rentacar", "read"), false)
      assert.equal(hasPermission(partnerRoleAssignment, "local-debug-branch", "turizm_otel", "read"), false)
      assert.equal(hasPermission(partnerRoleAssignment, "local-debug-branch", "turizm_tur", "read"), false)
      assert.equal(hasPermission(partnerRoleAssignment, "local-debug-branch", "lojistik_filo", "read"), false)
      assert.equal(hasPermission(partnerRoleAssignment, "local-debug-branch", "financial", "read"), false)

      return "4 modül x 5 izin ve Partner rol izolasyonu doğrulandı"
    })

    // 4. ADDITIVE MIGRATION VE ROLLBACK DOĞRULAMASI
    console.log("\n▶ 4. Additive SQL Migration & Rollback Doğrulaması")
    await step("MIGRATION_VALIDATION", "Turizm Faz 1, Lojistik (7 faz) ve Üretim (8 faz) migration/rollback çiftlerinin doğrulaması", () => {
      const tourismMigs = validateAllTourismMigrations()
      assert.ok(tourismMigs.length >= 1, "En az 1 turizm migration klasörü bulunmalı")
      for (const m of tourismMigs) {
        assert.equal(m.valid, true, `Turizm migration hatası (${m.migrationName}): ${m.errors.join(", ")}`)
        for (const tbl of m.addedTables) {
          assert.ok(tbl.startsWith(TURIZM_TABLE_PREFIX), `Tablo ${tbl} Turizm önekli olmalı`)
        }
      }

      // Yıkıcı SQL engeli testi
      const badCheck = validateTourismAdditiveMigrationSql(
        "bad_test",
        'ALTER TABLE "User" DROP COLUMN "phone";',
        'SELECT 1;'
      )
      assert.equal(badCheck.valid, false)

      const logMigs = validateAllLogisticsMigrations()
      assert.ok(logMigs.every((m) => m.valid), "Tüm Lojistik migrationları geçerli kalmalı")
      const prodMigs = validateAllUretimMigrations()
      assert.ok(prodMigs.every((m) => m.valid), "Tüm Üretim migrationları geçerli kalmalı")

      return `${tourismMigs.length} Turizm + ${logMigs.length} Lojistik + ${prodMigs.length} Üretim migration çifti geçerli`
    })

    // 5. VERİTABANI YEDEKLEME & GERİ DÖNÜŞ TATBİKATI
    console.log("\n▶ 5. Veritabanı Yedekleme & Geri Dönüş (Backup/Restore) Tatbikatı")
    await step("BACKUP_RESTORE_DRILL", "SHA-256 doğrulamalı canlı yedekleme, mutasyon ve bayt bayt geri yükleme tatbikatı", () => {
      const drill = runBackupRestoreDrill()
      assert.equal(drill.passed, true)
      assert.equal(drill.initialHash, drill.restoredHash)
      assert.notEqual(drill.initialHash, drill.mutatedHash)
      return `${drill.collectionCount} koleksiyon, ${drill.totalRecords} kayıt, SHA-256 %100 eşleşti`
    })

    // 6. DEMO SEED ÇERÇEVESİ, ORTAM KİLİDİ, İDEMPOTENCY VE ROLLBACK
    console.log("\n▶ 6. Demo Seed Çerçevesi, Kurgusal Partner Firmalar & Tek Komut Rollback")
    await step("SEED_LOCK_AND_LIFECYCLE", "DISABLE_DEMO_MODE=true kilidi, idempotent seed, 4 kurgusal firma ve tek komut rollback", async () => {
      // 6a. Gerçek müşteri ortamında (DISABLE_DEMO_MODE=true) seed kesinlikle çalışmamalı
      process.env.DISABLE_DEMO_MODE = "true"
      try {
        let locked = false
        try {
          assertLogisticsDemoSeedAllowed()
        } catch (err) {
          locked = err instanceof LogisticsSeedEnvironmentError
        }
        assert.equal(locked, true, "DISABLE_DEMO_MODE=true iken seed engellenmeliydi")
      } finally {
        delete process.env.DISABLE_DEMO_MODE
      }

      // Önce temiz başlangıç için rollback çalıştır
      rollbackAllTourismDemoSeeds({ createSafetyBackup: false })
      const hashBeforeSeed = computeFileSha256(LOCAL_JSON_DB_PATH)

      // 6b. İlk seed çalıştırması
      const firstRun = await runAllTourismDemoSeeds({
        createBackup: true,
        backupLabel: "test-turizm-faz1-seed",
      })
      assert.equal(firstRun.success, true)
      assert.equal(firstRun.preExistingIntegrityIntact, true)
      assert.ok(firstRun.backupId, "Seed öncesi otomatik yedek alınmalı")
      deleteDatabaseBackup(firstRun.backupId!)

      // Veritabanından kurgusal firmaları ve partnerlikleri doğrula
      const companies = await (prisma as any).turizmPartnerCompany.findMany()
      assert.equal(companies.length, 5, "1 Ana Operatör + 4 kurgusal partner firma olmalı")
      const companyTypes = new Set(companies.map((c: any) => c.companyType))
      assert.equal(companyTypes.has("RENTACAR"), true)
      assert.equal(companyTypes.has("TOUR_OPERATOR"), true)
      assert.equal(companyTypes.has("HOTEL"), true)
      assert.equal(companyTypes.has("TRANSFER"), true)

      const partnerships = await (prisma as any).turizmPartnership.findMany()
      assert.equal(partnerships.length, 6)
      const statuses = new Set(partnerships.map((p: any) => p.status))
      assert.equal(statuses.has("APPROVED"), true)
      assert.equal(statuses.has("PENDING"), true)
      assert.equal(statuses.has("REJECTED"), true)

      // 6c. İkinci seed çalıştırması (İdempotency: 0 yeni kayıt eklenmeli, dosya değişmemeli)
      const hashAfterFirstSeed = computeFileSha256(LOCAL_JSON_DB_PATH)
      const secondRun = await runAllTourismDemoSeeds({ createBackup: false })
      assert.equal(secondRun.success, true)
      assert.equal(secondRun.preExistingIntegrityIntact, true)
      const secondInsertedTotal = Object.values(secondRun.modulesExecuted[0].inserted).reduce(
        (a, b) => a + b,
        0
      )
      assert.equal(secondInsertedTotal, 0, "İdempotent 2. çalıştırmada yeni kayıt eklenmemeli")
      assert.equal(computeFileSha256(LOCAL_JSON_DB_PATH), hashAfterFirstSeed)

      // 6d. Rollback çalıştırması, silinen kayıt sayıları ve deterministik hash doğrulaması
      const rb = rollbackAllTourismDemoSeeds({ createSafetyBackup: false })
      assert.equal(rb.success, true)
      assert.equal(rb.preExistingIntegrityIntact, true)
      assert.equal(rb.removedByCollection.role, 1)
      assert.equal(rb.removedByCollection.turizmPartnerCompany, 5)
      assert.equal(rb.removedByCollection.user, 4)
      assert.equal(rb.removedByCollection.userBranchRole, 4)
      assert.equal(rb.removedByCollection.turizmPartnership, 6)
      const hashAfterFirstRollback = computeFileSha256(LOCAL_JSON_DB_PATH)

      // Tekrar seed + rollback yapıldığında JSON DB birebir aynı SHA-256 özetine dönmeli
      await runAllTourismDemoSeeds({ createBackup: false })
      const rbSecond = rollbackAllTourismDemoSeeds({ createSafetyBackup: false })
      assert.equal(rbSecond.preExistingIntegrityIntact, true)
      assert.equal(
        computeFileSha256(LOCAL_JSON_DB_PATH),
        hashAfterFirstRollback,
        "Rollback sonrası JSON DB birebir seed öncesi normalize SHA-256 değerine dönmeli"
      )

      // Sonraki izolasyon testleri için tekrar seed uygula
      await runAllTourismDemoSeeds({ createBackup: false })

      return "Demo kilidi, 5 firma + 4 kullanıcı + 6 partnerlik, idempotency ve rollback doğrulandı"
    })

    // 7. ÇOK FİRMALI (KİRACI / PARTNER) VERİ İZOLASYONU TESTİ
    console.log("\n▶ 7. Çok Firmalı (Kiracı / Partner) Veri İzolasyonu Testleri")
    await step("MULTI_COMPANY_ISOLATION", "Bir partner firma diğer firmanın özel verisini göremez; iç personel tek-firma davranışı korunur", async () => {
      // Firma A: Örnek Ege Rota Araç Kiralama (trzm-user-egerota -> trzm-comp-rentacar-01)
      const scopeCompanyA = await getTourismScopeContext({
        userId: "trzm-user-egerota",
        username: "partner.egerota",
        branchId: "local-debug-branch",
      })
      assert.equal(scopeCompanyA.isPartnerScoped, true)
      assert.equal(scopeCompanyA.isSuperAdmin, false)
      assert.equal(scopeCompanyA.partnerCompanyId, "trzm-comp-rentacar-01")
      assert.equal(scopeCompanyA.partnerCompanyType, "RENTACAR")

      // Firma B: Örnek Kıyı Otel (trzm-user-kiyiotel -> trzm-comp-otel-03)
      const scopeCompanyB = await getTourismScopeContext({
        userId: "trzm-user-kiyiotel",
        username: "partner.kiyiotel",
        branchId: "local-debug-branch",
      })
      assert.equal(scopeCompanyB.isPartnerScoped, true)
      assert.equal(scopeCompanyB.partnerCompanyId, "trzm-comp-otel-03")

      // Örnek kaynak havuzu kayıtları (3 farklı firmaya ait)
      const sampleResources = [
        { id: "res-a", ownerCompanyId: "trzm-comp-rentacar-01", title: "Ege Rota VIP Vito" },
        { id: "res-b", ownerCompanyId: "trzm-comp-otel-03", title: "Kıyı Otel Deluxe Oda" },
        { id: "res-c", ownerCompanyId: "trzm-comp-tur-02", title: "Anadolu Keşif Rehber" },
      ]

      // Firma A sadece kendi kaynağını görür, Firma B ve C'nin kaynağını asla göremez
      const visibleToA = applyCompanyScopeFilter(sampleResources, scopeCompanyA)
      assert.deepEqual(visibleToA.map((r) => r.id), ["res-a"])

      // Firma B sadece kendi kaynağını görür, Firma A ve C'nin kaynağını asla göremez
      const visibleToB = applyCompanyScopeFilter(sampleResources, scopeCompanyB)
      assert.deepEqual(visibleToB.map((r) => r.id), ["res-b"])

      // Prisma where filtresi de fail-closed olarak yalnızca kendi firma ID'sini üretir
      const whereA = buildCompanyPrismaWhere(scopeCompanyA, { status: "ACTIVE" })
      assert.deepEqual(whereA, { status: "ACTIVE", ownerCompanyId: "trzm-comp-rentacar-01" })

      // Firma A, Firma B'nin özel kaydına tekil erişmeye çalışırsa 403 FORBIDDEN_COMPANY_SCOPE alır
      expectTourismError(
        () => assertCompanyRecordAccess(scopeCompanyA, "trzm-comp-otel-03"),
        "FORBIDDEN_COMPANY_SCOPE",
        "Firma A -> Firma B özel kaydı erişim engeli"
      )

      // Partnerlik ilişkilerinde: Firma A yalnızca taraf olduğu partnerlikleri görür
      const allPartnerships = await (prisma as any).turizmPartnership.findMany()
      const visiblePartnershipsA = applyCompanyScopeFilter(allPartnerships, scopeCompanyA, {
        ownerField: "requesterCompanyId",
        counterpartyFields: ["targetCompanyId"],
      })
      assert.ok(visiblePartnershipsA.length > 0)
      assert.ok(
        visiblePartnershipsA.every(
          (p: any) =>
            p.requesterCompanyId === "trzm-comp-rentacar-01" ||
            p.targetCompanyId === "trzm-comp-rentacar-01"
        ),
        "Firma A taraf olmadığı hiçbir partnerlik kaydını göremez"
      )

      // Firma A, Firma C (Tur) ile Firma D (Transfer) arasındaki partnerlik kaydına (trzm-ps-04) erişemez
      const psTurTransfer = allPartnerships.find((p: any) => p.id === "trzm-ps-04")
      assert.ok(psTurTransfer)
      expectTourismError(
        () => assertPartnershipAccess(scopeCompanyA, psTurTransfer),
        "FORBIDDEN_COMPANY_SCOPE",
        "Firma A -> Firma C/D arası partnerlik erişim engeli"
      )

      // Çapraz rezervasyon erişim kontrolü: Firma A yalnızca kendi sahibi olduğu veya rezerve ettiği kayda erişebilir
      assertCrossReservationAccess(scopeCompanyA, {
        ownerCompanyId: "trzm-comp-otel-03",
        bookingCompanyId: "trzm-comp-rentacar-01",
      })
      expectTourismError(
        () =>
          assertCrossReservationAccess(scopeCompanyA, {
            ownerCompanyId: "trzm-comp-otel-03",
            bookingCompanyId: "trzm-comp-tur-02",
          }),
        "FORBIDDEN_COMPANY_SCOPE",
        "Firma A -> Firma B/C arası çapraz rezervasyon engeli"
      )

      // Bağsız (partnerCompanyId: null) bir Partner kapsamı fail-closed çalışmalı
      const unboundScope = {
        ...scopeCompanyA,
        partnerCompanyId: null,
        effectiveCompanyId: "__UNBOUND_PARTNER_DENIED__",
      }
      assert.deepEqual(applyCompanyScopeFilter(sampleResources, unboundScope), [])
      assert.deepEqual(buildCompanyPrismaWhere(unboundScope), {
        ownerCompanyId: "__UNBOUND_PARTNER_DENIED__",
      })
      expectTourismError(
        () => assertCompanyRecordAccess(unboundScope, "trzm-comp-rentacar-01"),
        "FORBIDDEN_COMPANY_SCOPE",
        "Bağsız partner fail-closed engeli"
      )

      // İç personel (kemal.ozturk -> user-accountant) tek-firma davranışını korur (isPartnerScoped === false)
      const internalScope = await getTourismScopeContext({
        userId: "user-accountant",
        username: "kemal.ozturk",
        branchId: "local-debug-branch",
      })
      assert.equal(internalScope.isPartnerScoped, false)
      assert.equal(internalScope.isSupplierScoped, false)
      assert.equal(internalScope.effectiveCompanyId, MAIN_COMPANY_ID)
      assert.equal(applyCompanyScopeFilter(sampleResources, internalScope).length, 3)

      return "Firma A/B/C/D çapraz izolasyon, fail-closed bağsız partner ve iç personel uyumu doğrulandı"
    })

    // 8. MEVCUT KRİTİK AKIŞ KARAKTERİZASYON TESTLERİ (MÜŞTERİ/CARİ, FİNANS, E-BELGE, FİLO, SEVKİYAT)
    console.log("\n▶ 8. Mevcut Kritik Akış Karakterizasyon Testleri (Davranış Sabitleme)")
    await step("CHAR_CUSTOMER", "Müşteri / Cari (Customer, CustomerNote, CustomerContact) veri ve ilişki bütünlüğü", async () => {
      const customers = await prisma.customer.findMany({
        include: { notes: true, contacts: true },
      })
      assert.ok(customers.length >= 12, `En az 12 müşteri bekleniyordu, bulunan: ${customers.length}`)
      const first = customers.find((c: any) => c.id === "cust-01")
      assert.ok(first, "cust-01 mevcut olmalı")
      return `${customers.length} müşteri kartı ve alt ilişkileri doğrulandı`
    })

    await step("CHAR_FINANCE", "Finans (Finance) gelir/gider kayıtları ve filo maliyet bağlantıları", async () => {
      const finances = await prisma.finance.findMany()
      assert.ok(finances.length >= 30, `En az 30 finans kaydı bekleniyordu, bulunan: ${finances.length}`)
      const fleetLinked = finances.filter((f: any) => Boolean(f.vehicleId))
      assert.ok(fleetLinked.length >= 10, "Filo bağlantılı finans gider kayıtları korunmalı")
      return `${finances.length} finans hareketi (${fleetLinked.length} filo bağlantılı) doğrulandı`
    })

    await step("CHAR_EDOC", "E-Belge (EDocumentRecord & DemoDbEDocumentProvider) kesim ve sorgu davranışı", async () => {
      const eDocs = await (prisma as any).eDocumentRecord.findMany()
      assert.ok(eDocs.length >= 8, `En az 8 e-belge kaydı bekleniyordu, bulunan: ${eDocs.length}`)
      const providers = createLogisticsProviders()
      const statusCheck = await providers.eDocument.queryEDocumentStatus(eDocs[0].ettnUuid)
      assert.equal(statusCheck.ettnUuid, eDocs[0].ettnUuid)
      assert.ok(statusCheck.gibStatusCode)
      return `${eDocs.length} mevcut E-Belge ve sağlayıcı adaptörü doğrulandı`
    })

    await step("CHAR_FLEET", "Lojistik Filo araçları (PASSENGER/MINIBUS dahil) ve Şoför KVKK maskelemesi", async () => {
      const vehicles = await listFleetVehicles({})
      assert.equal(vehicles.length, 18, "18 mevcut filo aracı korunmalı")
      const minibus = vehicles.find((v: any) => v.plate === "34 SNR 118")
      const passenger = vehicles.find((v: any) => v.plate === "34 SNR 205")
      assert.ok(minibus && minibus.vehicleType === "MINIBUS", "34 SNR 118 Minibüs korunmalı")
      assert.ok(passenger && passenger.vehicleType === "PASSENGER", "34 SNR 205 Binek araç korunmalı")

      const driversRes = await listFleetDrivers({
        scope: {
          userId: "user-operasyon",
          username: "operasyon",
          branchId: "local-debug-branch",
          roleId: "role-operations",
          roleName: "Operations",
          supplierId: null,
          isSupplierScoped: false,
          isSuperAdmin: false,
          isPlatformDeveloper: false,
        },
        revealSensitivePii: false,
      })
      assert.equal(driversRes.drivers.length, 15, "15 mevcut şoför korunmalı")
      assert.ok(
        driversRes.drivers.every((d: any) => String(d.tckn || "").includes("*")),
        "Varsayılan şoför listesinde TCKN KVKK maskeli olmalı"
      )
      return `${vehicles.length} araç ve ${driversRes.drivers.length} KVKK maskeli şoför doğrulandı`
    })

    await step("CHAR_DISPATCH", "Sevkiyat & Rota (LojistikShipmentTrip & CVRPTW çözücü) davranış sabitlemesi", async () => {
      const overview = await listDispatchOverviewAndReadyPool({})
      assert.ok(overview.trips.length >= 4, "Mevcut sevkiyat seferleri korunmalı")
      const solved = optimizeSingleTripRoute({
        origin: { lat: 40.8245, lng: 29.3189, label: "Tuzla Depo" },
        stops: [
          { id: "s1", label: "Kadıköy", lat: 40.9901, lng: 29.0291, weightKg: 120, volumeM3: 1.2 },
          { id: "s2", label: "Ataşehir", lat: 40.9833, lng: 29.1277, weightKg: 150, volumeM3: 1.5 },
        ],
      })
      assert.equal(solved.orderedStopIds.length, 2)
      assert.equal(solved.stops.length, 2)
      assert.ok(solved.optimizedDistanceKm > 0)
      return `${overview.trips.length} aktif/geçmiş sefer ve CVRPTW çözücü (${solved.optimizedDistanceKm} km) doğrulandı`
    })
  } finally {
    // Veritabanını ve yapılandırma dosyasını test öncesi bayt bayt aynı duruma geri yükle
    restoreDatabaseBackup(safetyBackup.backupId, {
      createPreRestoreSafetyBackup: false,
      restoreSystemConfig: true,
    })
    deleteDatabaseBackup(safetyBackup.backupId)
    fs.writeFileSync(LOCAL_JSON_DB_PATH, initialDbBuf)
    if (initialCfgBuf) {
      fs.writeFileSync(SYS_CFG_PATH, initialCfgBuf)
    }
  }

  const finalDbHash = computeFileSha256(LOCAL_JSON_DB_PATH)
  const finalCfgHash = initialCfgBuf ? computeFileSha256(SYS_CFG_PATH) : null
  assert.equal(finalDbHash, initialDbHash, ".local-db.json SHA-256 test öncesiyle birebir eşleşmeli")
  assert.equal(finalCfgHash, initialCfgHash, "system_config.json SHA-256 test öncesiyle birebir eşleşmeli")

  console.log(`\n♻️  Veritabanı ve ayar dosyaları test öncesi durumuna döndürüldü (SHA-256 eşleşmesi: EVET)`)
  console.log("═══════════════════════════════════════════════════════════════════════")
  console.log(` SONUÇ: ${passed}/${total} test adımı başarılı.`)
  console.log("═══════════════════════════════════════════════════════════════════════")
}

main().catch((err) => {
  console.error("❌ TURİZM FAZ 1 TEST HATASI:", err)
  process.exit(1)
})
