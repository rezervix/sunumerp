/**
 * Sunum ERP — Turizm Faz 3: Otel Yönetimi (Mini PMS) — turizm_otel
 * Otomatik Doğrulama Test Paketi:
 * 1. Saf dosya / İstemci-Sunucu ayrımı & yasaklı metin kontrolü
 * 2. Migration & Rollback SQL doğrulaması (Faz 1 + Faz 2 + Faz 3)
 * 3. Demo seed ortam güvenlik kilidi (`DISABLE_DEMO_MODE=true`), idempotency ve 50 oda envanteri
 * 4. Eşzamanlı çift rezervasyon kilidi (`Promise.all` -> 1 başarılı / 1 HTTP 409) & Arızalı oda engeli
 * 5. Acenta kontenjan aşım engeli (`ALLOTMENT_EXCEEDED` 409 + conflict log)
 * 6. Uçtan uca Check-In → Stok Bağlı Minibar Folio (StockMovement + StockBalance düşümü) → Split Folio
 *    → Açık Bakiye Check-Out Engeli → Kapanış Tahsilatı & Check-Out → Otomatik Housekeeping + KBS + Finance/E-Belge
 * 7. Housekeeping yaşam döngüsü + Çevrimdışı idempotent batch senkronizasyonu (`SYNCED` → `DUPLICATE_IGNORED`)
 * 8. Kısıtlı "Temizlik Personeli" rolü izolasyonu (`temizlik.ayse`: sadece kendi görevleri; ön büro/folio/KBS/denetim 403!)
 * 9. Raporlar (Doluluk %, ADR, RevPAR formülleri, sıfır-PII uyruk istatistiği, XLSX & PDF buffer), KBS XML/CSV, Bildirimler
 * 10. Modül bağımsızlığı (`turizm_otel` × `turizm_rentacar` × `lojistik_filo`) & Çoklu Firma Perspektifi izolasyonu
 */

process.env.SUNUM_DISABLE_CRON = "1"

import assert from "node:assert/strict"
import crypto from "node:crypto"
import fs from "node:fs"
import path from "node:path"
import { prisma } from "../lib/db"
import { resolveLogisticsFeatureFlags } from "../lib/config/logistics-feature-flags"
import {
  getVisibleTourismMenuModules,
  IMPLEMENTED_TOURISM_HREFS,
  isTourismFeatureEnabled,
  isTourismModuleMenuVisible,
  resolveTourismFeatureFlags,
} from "../lib/config/tourism-feature-flags"
import {
  createDatabaseBackup,
  deleteDatabaseBackup,
  restoreDatabaseBackup,
} from "../lib/services/databaseBackupService"
import { validateAllTourismMigrations } from "../lib/services/migrationStrategyService"
import {
  assertLogisticsDemoSeedAllowed,
  LOCAL_JSON_DB_PATH,
  LogisticsSeedEnvironmentError,
} from "../lib/logistics/seed/framework"
import {
  assertTourismFeatureEnabled,
  getTourismScopeContext,
  TourismDomainError,
} from "../lib/tourism/security"
import {
  rollbackAllTourismDemoSeeds,
  runAllTourismDemoSeeds,
} from "../lib/tourism/seed"
import {
  addHotelFolioChargeOrPayment,
  buildHotelAnalyticsAndReports,
  bulkPrepareOrRetryKbsRecords,
  createHotelReservation,
  evaluateAndDispatchHotelAlerts,
  exportHotelReportBuffer,
  exportKbsRecordsPackage,
  getHotelWorkspaceSnapshot,
  getHousekeepingMobileSnapshot,
  performHotelCheckIn,
  performHotelCheckOut,
  splitFolioItemToGroup,
  syncOfflineHousekeepingBatch,
  updateHousekeepingTaskStatus,
  upsertHotelAllotment,
} from "../lib/tourism/otel"

const SYS_CFG_PATH = path.join(process.cwd(), "storage", "system_config.json")

function computeFileSha256(filePath: string): string {
  return crypto.createHash("sha256").update(fs.readFileSync(filePath)).digest("hex")
}

async function main() {
  console.log("═══════════════════════════════════════════════════════════════════════")
  console.log(" SUNUM ERP — TURİZM FAZ 3 (OTEL MİNİ PMS) OTOMATİK DOĞRULAMA TESTİ")
  console.log("═══════════════════════════════════════════════════════════════════════")

  const initialDbHash = computeFileSha256(LOCAL_JSON_DB_PATH)
  const initialDbBuf = fs.readFileSync(LOCAL_JSON_DB_PATH)
  const initialCfgBuf = fs.existsSync(SYS_CFG_PATH) ? fs.readFileSync(SYS_CFG_PATH) : null
  const initialCfgHash = initialCfgBuf ? computeFileSha256(SYS_CFG_PATH) : null

  const safetyBackup = createDatabaseBackup({
    label: "test-turizm-faz3-safety",
    updateSystemConfigLastBackup: false,
  })

  let passed = 0
  let total = 0

  async function step(code: string, title: string, fn: () => Promise<string> | string) {
    total++
    const detail = await fn()
    passed++
    console.log(`  ✅ [${code}] ${title} — ${detail}`)
  }

  try {
    // 1. İSTEMCİ-SUNUCU AYRIMI & YASAKLI METİN KONTROLÜ
    console.log("\n▶ 1. Saf Dosya, İstemci-Sunucu Ayrımı & Yasaklı Metin Denetimi")
    await step("CLIENT_PURITY_AND_NO_BANNED_TEXT", "Faz 3 istemci dosyalarında fs/db/audit importu ve yasaklı teknik metin olmaması", () => {
      const filesToCheck = [
        "lib/tourism/otel/constantsAndHelpers.ts",
        "lib/tourism/otel/housekeepingOfflineSync.ts",
        "app/dashboard/otel/page.tsx",
        "app/dashboard/otel/housekeeping/page.tsx",
        "app/dashboard/otel/components/HotelFloorPlanAndGanttTabs.tsx",
        "app/dashboard/otel/components/HotelReservationsAndFolioTabs.tsx",
        "app/dashboard/otel/components/HotelHkKbsAllotmentAndReportsTabs.tsx",
      ]
      const forbiddenServerImports = [
        'from "fs"',
        'from "node:fs"',
        'from "@/lib/db"',
        'from "@/lib/audit"',
      ]
      const bannedUiTerms = ["Faz 3", "Phase 3", "TODO", "FIXME", "mock data", "hardcoded"]
      for (const rel of filesToCheck) {
        const content = fs.readFileSync(path.join(process.cwd(), rel), "utf8")
        for (const imp of forbiddenServerImports) {
          assert.equal(content.includes(imp), false, `${rel} dosyasında yasak sunucu importu: ${imp}`)
        }
        if (rel.startsWith("app/dashboard/otel")) {
          for (const term of bannedUiTerms) {
            assert.equal(
              content.toLowerCase().includes(term.toLowerCase()),
              false,
              `${rel} UI dosyasında yasaklı teknik metin: ${term}`
            )
          }
        }
      }
      return `${filesToCheck.length} istemci dosyası temiz doğrulandı`
    })

    // 2. MİGRATION & ROLLBACK SQL DOĞRULAMASI
    console.log("\n▶ 2. Additive Migration & Rollback SQL Doğrulaması")
    await step("MIGRATION_ROLLBACK_CHECK", "Faz 1 + Faz 2 + Faz 3 SQL migration & rollback doğrulaması", () => {
      const migResults = validateAllTourismMigrations()
      assert.ok(migResults.length >= 3, `En az 3 turizm migration bekleniyordu, bulunan: ${migResults.length}`)
      for (const m of migResults) {
        assert.equal(m.valid, true, `Migration hatası (${m.migrationName}): ${m.errors.join("; ")}`)
      }
      const hasFaz3 = migResults.some((m) => m.migrationName.includes("turizm_faz3_otel_pms"))
      assert.equal(hasFaz3, true, "Faz 3 otel migration kaydı bulunamadı!")
      return `${migResults.length} turizm migration & rollback SQL dosyası geçerli`
    })

    // 3. DEMO SEED ORTAM KİLİDİ, İDEMPOTENCY VE 50 ODALI ENVANTER
    console.log("\n▶ 3. Demo Seed Ortam Kilidi, İdempotency & 50 Odalı Otel Envanteri")
    await step("SEED_ENV_LOCK", "DISABLE_DEMO_MODE=true iken demo seed engellenmeli", () => {
      const prev = process.env.DISABLE_DEMO_MODE
      process.env.DISABLE_DEMO_MODE = "true"
      let blocked = false
      try {
        assertLogisticsDemoSeedAllowed()
      } catch (err) {
        blocked = err instanceof LogisticsSeedEnvironmentError
      } finally {
        if (prev === undefined) delete process.env.DISABLE_DEMO_MODE
        else process.env.DISABLE_DEMO_MODE = prev
      }
      assert.equal(blocked, true, "Seed ortam kilidi çalışmadı!")
      return "Üretim/gerçek ortam kilidi LogisticsSeedEnvironmentError ile reddetti"
    })

    await step("SEED_IDEMPOTENCY_AND_50_ROOMS", "Faz 3 seed idempotency ve 50 oda + 2 partner odası doğrulaması", async () => {
      const run1 = await runAllTourismDemoSeeds({
        onlyModuleKeys: ["turizm_faz1_partner_firmalar_ve_kullanicilar", "turizm_faz3_otel_pms"],
        createBackup: false,
      })
      assert.equal(run1.preExistingIntegrityIntact, true, "İlk seed mevcut kayıtları bozdu!")
      const run2 = await runAllTourismDemoSeeds({
        onlyModuleKeys: ["turizm_faz3_otel_pms"],
        createBackup: false,
      })
      assert.equal(run2.preExistingIntegrityIntact, true, "İkinci seed mevcut kayıtları bozdu!")
      const faz3Step2 = run2.modulesExecuted.find((m: any) => m.moduleKey === "turizm_faz3_otel_pms")!
      const totalInsertedRun2 = Object.values(faz3Step2.inserted).reduce(
        (a: number, b: any) => a + Number(b || 0),
        0
      )
      assert.equal(totalInsertedRun2, 0, "İkinci çalıştırmada tekrar kayıt üretilmemeliydi!")

      const dbAny = prisma as any
      const rooms = await dbAny.turizmHotelRoom.findMany()
      const mainRooms = rooms.filter((r: any) => r.ownerCompanyId === "trzm-comp-main")
      const partnerRooms = rooms.filter((r: any) => r.ownerCompanyId === "trzm-comp-otel-03")
      assert.equal(mainRooms.length, 50, `Ana otel oda sayısı 50 olmalı (gerçek: ${mainRooms.length})`)
      assert.equal(partnerRooms.length, 2, `Partner oda sayısı 2 olmalı (gerçek: ${partnerRooms.length})`)
      return `50 ana oda (5 kat × 10) + 2 partner odası, idempotency 0 ek kayıt`
    })

    const adminScope = await getTourismScopeContext({
      userId: "user-admin",
      username: "admin",
      branchId: "local-debug-branch",
    })

    // 4. EŞZAMANLI ÇİFT REZERVASYON KİLİDİ & ARIZALI ODA ENGELİ
    console.log("\n▶ 4. Eşzamanlı Çift Rezervasyon Kilidi & Arızalı Oda Engeli")
    await step("CONCURRENT_DOUBLE_BOOKING_LOCK", "Aynı oda/tarih için 2 paralel istekte tam 1 kabul / 1 HTTP 409 çakışma", async () => {
      const targetRoomId = "trzm-otl-rm-109"
      const [r1, r2] = await Promise.allSettled([
        createHotelReservation(
          {
            roomId: targetRoomId,
            customerId: "trzm-otl-cust-01",
            checkInDate: "2026-12-05T14:00:00.000Z",
            checkOutDate: "2026-12-08T12:00:00.000Z",
            boardType: "BB",
          },
          adminScope
        ),
        createHotelReservation(
          {
            roomId: targetRoomId,
            customerId: "trzm-otl-cust-02",
            checkInDate: "2026-12-06T14:00:00.000Z",
            checkOutDate: "2026-12-09T12:00:00.000Z",
            boardType: "BB",
          },
          adminScope
        ),
      ])
      const fulfilled = [r1, r2].filter((x) => x.status === "fulfilled")
      const rejected = [r1, r2].filter((x) => x.status === "rejected") as PromiseRejectedResult[]
      assert.equal(fulfilled.length, 1, "Eşzamanlı istekten tam 1 tanesi başarılı olmalıydı")
      assert.equal(rejected.length, 1, "Eşzamanlı istekten tam 1 tanesi reddedilmeliydi")
      const err = rejected[0].reason
      assert.ok(err instanceof TourismDomainError && err.status === 409, "Reddedilen istek HTTP 409 dönmeliydi")
      assert.equal(err.details?.rejectionCode, "ROOM_DOUBLE_BOOKING_LOCKED")
      return `1 rezervasyon kabul, 1 eşzamanlı istek HTTP 409 (ROOM_DOUBLE_BOOKING_LOCKED) ile kilitlendi`
    })

    await step("MAINTENANCE_ROOM_BLOCK", "OUT_OF_ORDER (310) odasına rezervasyon HTTP 409 ile engellenmeli", async () => {
      let rejectedCode = ""
      try {
        await createHotelReservation(
          {
            roomId: "trzm-otl-rm-310",
            customerId: "trzm-otl-cust-03",
            checkInDate: "2026-12-10T14:00:00.000Z",
            checkOutDate: "2026-12-12T12:00:00.000Z",
          },
          adminScope
        )
      } catch (err: any) {
        if (err instanceof TourismDomainError && err.status === 409) {
          rejectedCode = String(err.details?.rejectionCode || "")
        }
      }
      assert.equal(rejectedCode, "ROOM_OUT_OF_ORDER")
      return `Oda 310 (OUT_OF_ORDER) HTTP 409 (ROOM_OUT_OF_ORDER) ile engellendi`
    })

    // 5. ACENTA KONTENJAN AŞIM ENGELİ
    console.log("\n▶ 5. Acenta Kontenjan Aşım Engeli (Allotment Overflow)")
    await step("ALLOTMENT_OVERFLOW_BLOCK", "1 oda/gece kontenjanda 2. eşzamanlı oda rezervasyonu engellenmeli", async () => {
      const tinyAllot = await upsertHotelAllotment(
        {
          code: "KNT-TEST-LIMIT",
          agencyName: "Test Kontenjan Acentası",
          roomTypeId: "trzm-otl-rt-std",
          validFrom: "2026-12-15T00:00:00.000Z",
          validTo: "2026-12-20T23:59:59.000Z",
          allocatedRoomsPerNight: 1,
          releaseDaysBefore: 3,
          netRatePerNightTry: 2800,
        },
        adminScope
      )
      await createHotelReservation(
        {
          roomId: "trzm-otl-rm-108",
          customerId: "trzm-otl-cust-04",
          allotmentId: tinyAllot.id,
          checkInDate: "2026-12-16T14:00:00.000Z",
          checkOutDate: "2026-12-18T12:00:00.000Z",
        },
        adminScope
      )
      let overflowCode = ""
      try {
        await createHotelReservation(
          {
            roomId: "trzm-otl-rm-110",
            customerId: "trzm-otl-cust-05",
            allotmentId: tinyAllot.id,
            checkInDate: "2026-12-16T14:00:00.000Z",
            checkOutDate: "2026-12-18T12:00:00.000Z",
          },
          adminScope
        )
      } catch (err: any) {
        if (err instanceof TourismDomainError && err.status === 409) {
          overflowCode = String(err.details?.rejectionCode || "")
        }
      }
      assert.equal(overflowCode, "ALLOTMENT_EXCEEDED")
      return `Kontenjan aşımı HTTP 409 (ALLOTMENT_EXCEEDED) ile reddedildi ve günlüğe işlendi`
    })

    // 6. UÇTAN UCA CHECK-IN → MİNİBAR STOK + SPLIT FOLIO → CHECK-OUT → HK + KBS + FATURA
    console.log("\n▶ 6. Uçtan Uca Rezervasyon → Check-In → Folio/Minibar Stok → Check-Out → Fatura & HK")
    let autoCreatedHkTaskId = ""
    await step("E2E_CHECKIN_FOLIO_MINIBAR_CHECKOUT", "Tam konaklama akışı ve stok/finans/housekeeping otomasyonu", async () => {
      const dbAny = prisma as any
      const resv = await createHotelReservation(
        {
          roomId: "trzm-otl-rm-204",
          customerId: "trzm-otl-cust-01",
          checkInDate: "2026-11-23T14:00:00.000Z",
          checkOutDate: "2026-11-25T12:00:00.000Z",
          boardType: "BB",
        },
        adminScope
      )

      const ci = await performHotelCheckIn(
        { reservationId: resv.id, keyCardIssuedCode: "KEY-204-E2E" },
        adminScope
      )
      assert.equal(ci.reservation.status, "CHECKED_IN")
      assert.equal(ci.kbsRecord.notificationType, "MISAFIR_GIRIS")
      const rmOccupied = await dbAny.turizmHotelRoom.findUnique({ where: { id: "trzm-otl-rm-204" } })
      assert.equal(rmOccupied.status, "OCCUPIED")

      // Minibar stok düşümü doğrulaması
      const balBefore = (await dbAny.stockBalance.findMany({ where: { itemId: "trzm-otl-inv-fistik" } }))[0]
      const minibarPost = await addHotelFolioChargeOrPayment(
        {
          reservationId: resv.id,
          folioGroup: "A_ANA_HESAP",
          entryCategory: "MINIBAR",
          inventoryItemId: "trzm-otl-inv-fistik",
          quantity: 2,
        },
        adminScope
      )
      assert.ok(minibarPost.folioItem.stockMovementId, "Minibar tüketimi StockMovement oluşturmalıydı")
      const balAfter = (await dbAny.stockBalance.findMany({ where: { itemId: "trzm-otl-inv-fistik" } }))[0]
      assert.equal(Number(balBefore.onHandQty) - Number(balAfter.onHandQty), 2, "Stok bakiyesi 2 adet düşmeliydi")

      // Split folio (Minibar kalemini Folio B'ye taşı)
      const splitRes = await splitFolioItemToGroup(
        { folioItemId: minibarPost.folioItem.id, targetFolioGroup: "B_EKSTRA_BOLUNMUS" },
        adminScope
      )
      assert.equal(splitRes.folioItem.folioGroup, "B_EKSTRA_BOLUNMUS")

      // Açık bakiye varken Check-Out engellenmeli
      let blockedUnpaid = false
      try {
        await performHotelCheckOut({ reservationId: resv.id }, adminScope)
      } catch (err: any) {
        blockedUnpaid = err instanceof TourismDomainError && err.status === 409
      }
      assert.equal(blockedUnpaid, true, "Açık folio bakiyesi varken Check-Out engellenmeliydi")

      // Kapanış tahsilatı + Check-Out -> DIRTY_VACANT + Auto Housekeeping + KBS Çıkış + Finance/E-Belge
      const co = await performHotelCheckOut(
        { reservationId: resv.id, settleRemainingPaymentMethod: "PAYMENT_CARD" },
        adminScope
      )
      assert.equal(co.reservation.status, "CHECKED_OUT")
      assert.equal(co.balanceSummary.balanceDueTry, 0)
      assert.ok(co.housekeepingTask?.id, "Check-Out otomatik housekeeping görevi oluşturmalıydı")
      assert.equal(co.kbsRecord.notificationType, "MISAFIR_CIKIS")
      assert.ok(co.invoiceResult?.eDocument?.documentNo, "Check-Out E-Belge oluşturmalıydı")
      assert.ok(co.invoiceResult?.financeRecord?.id, "Check-Out Finance kaydı oluşturmalıydı")

      const rmDirty = await dbAny.turizmHotelRoom.findUnique({ where: { id: "trzm-otl-rm-204" } })
      assert.equal(rmDirty.status, "DIRTY_VACANT")
      autoCreatedHkTaskId = co.housekeepingTask.id

      return `Check-In → Minibar Stok (-2) → Split Folio B → Bakiye Engeli → Check-Out + HK (${co.housekeepingTask.taskNo}) + E-Belge (${co.invoiceResult.eDocument.documentNo})`
    })

    // 7. HOUSEKEEPING YAŞAM DÖNGÜSÜ + ÇEVRİMDIŞI İDEMPOTENT SENKRONİZASYON
    console.log("\n▶ 7. Housekeeping Yaşam Döngüsü & Çevrimdışı İdempotent Senkronizasyon")
    await step("HK_OFFLINE_IDEMPOTENT_SYNC", "Aynı offlineIdempotencyKey ile 2 kez batch sync -> 1 SYNCED, 1 DUPLICATE_IGNORED + INSPECTED -> CLEAN_VACANT", async () => {
      const dbAny = prisma as any
      const idemKey = `offline-hk-test-${Date.now()}`
      const sync1 = await syncOfflineHousekeepingBatch(
        {
          operations: [
            {
              offlineIdempotencyKey: idemKey,
              operationType: "COMPLETE_CLEANING",
              taskId: autoCreatedHkTaskId,
              roomId: "trzm-otl-rm-204",
              notes: "Çevrimdışı mobil temizlik tamamlandı",
            },
          ],
        },
        adminScope
      )
      assert.equal(sync1.syncedCount, 1)
      const sync2 = await syncOfflineHousekeepingBatch(
        {
          operations: [
            {
              offlineIdempotencyKey: idemKey,
              operationType: "COMPLETE_CLEANING",
              taskId: autoCreatedHkTaskId,
              roomId: "trzm-otl-rm-204",
            },
          ],
        },
        adminScope
      )
      assert.equal(sync2.duplicateIgnoredCount, 1, "İkinci aynı offline anahtar DUPLICATE_IGNORED olmalıydı")

      const rmInspectPending = await dbAny.turizmHotelRoom.findUnique({ where: { id: "trzm-otl-rm-204" } })
      assert.equal(rmInspectPending.status, "INSPECTION_PENDING")

      // Kat şefi denetim onayı -> CLEAN_VACANT
      await updateHousekeepingTaskStatus(
        { taskId: autoCreatedHkTaskId, status: "INSPECTED" },
        adminScope
      )
      const rmClean = await dbAny.turizmHotelRoom.findUnique({ where: { id: "trzm-otl-rm-204" } })
      assert.equal(rmClean.status, "CLEAN_VACANT")
      return `1. sync=SYNCED, 2. sync=DUPLICATE_IGNORED, Denetim (INSPECTED) → Oda 204 CLEAN_VACANT`
    })

    // 8. KISITLI "Temizlik Personeli" ROLÜ İZOLASYONU
    console.log("\n▶ 8. Kısıtlı 'Temizlik Personeli' Rolü Güvenlik İzolasyonu")
    await step("HOUSEKEEPING_ROLE_ISOLATION", "temizlik.ayse sadece kendi görevlerini görmeli; başkasının görevi/folio/KBS/denetim 403", async () => {
      const hkScope = await getTourismScopeContext({
        userId: "trzm-otl-user-hk1",
        username: "temizlik.ayse",
        branchId: "local-debug-branch",
      })
      const mobileSnap = await getHousekeepingMobileSnapshot(hkScope)
      assert.equal(mobileSnap.isRestrictedHousekeeper, true)
      assert.ok(mobileSnap.tasks.length >= 1, "temizlik.ayse için atanmış görev bulunmalı")
      for (const t of mobileSnap.tasks) {
        assert.equal(t.assignedToUserId, "trzm-otl-user-hk1", "Başka personelin görevi sızdırıldı!")
      }

      // 1) Ön büro workspace engeli
      let blockedWorkspace = false
      try {
        await getHotelWorkspaceSnapshot({}, hkScope)
      } catch (err: any) {
        blockedWorkspace = err instanceof TourismDomainError && err.status === 403
      }
      assert.equal(blockedWorkspace, true, "Temizlik personeli ön büro workspace'e erişememeli!")

      // 2) Rapor / KBS engeli
      let blockedReports = false
      try {
        await buildHotelAnalyticsAndReports({}, hkScope)
      } catch (err: any) {
        blockedReports = err instanceof TourismDomainError && err.status === 403
      }
      assert.equal(blockedReports, true, "Temizlik personeli otel raporlarına erişememeli!")

      let blockedKbs = false
      try {
        await exportKbsRecordsPackage({ format: "XML_SABLON" }, hkScope)
      } catch (err: any) {
        blockedKbs = err instanceof TourismDomainError && err.status === 403
      }
      assert.equal(blockedKbs, true, "Temizlik personeli KBS dışa aktarmasına erişememeli!")

      // 3) Kendi görevini INSPECTED yapma engeli
      let blockedSelfInspect = false
      try {
        await updateHousekeepingTaskStatus(
          { taskId: mobileSnap.tasks[0].id, status: "INSPECTED" },
          hkScope
        )
      } catch (err: any) {
        blockedSelfInspect = err instanceof TourismDomainError && err.status === 403
      }
      assert.equal(blockedSelfInspect, true, "Temizlik personeli kendi işini INSPECTED onaylayamamalı!")

      // 4) Başkasının görevini (trzm-otl-hk-07 -> temizlik.fatma) güncelleme engeli
      let blockedOtherTask = false
      try {
        await updateHousekeepingTaskStatus(
          { taskId: "trzm-otl-hk-07", status: "IN_PROGRESS" },
          hkScope
        )
      } catch (err: any) {
        blockedOtherTask = err instanceof TourismDomainError && err.status === 403
      }
      assert.equal(blockedOtherTask, true, "Temizlik personeli başka personelin görevini güncelleyememeli!")

      return `temizlik.ayse yalnızca ${mobileSnap.tasks.length} kendi görevini gördü; 5 yetkisiz erişim (Ön Büro/Rapor/KBS/Self-Inspect/Başka Görev) HTTP 403 ile kesildi`
    })

    // 9. RAPORLAR (DOLULUK/ADR/RevPAR + XLSX/PDF), KBS XML/CSV VE BİLDİRİMLER
    console.log("\n▶ 9. Raporlar (Doluluk/ADR/RevPAR + XLSX/PDF), KBS XML/CSV & Bildirimler")
    await step("REPORTS_KBS_AND_ALERTS", "Doluluk/ADR/RevPAR formülleri, sıfır-PII uyruk raporu, XLSX/PDF, KBS XML/CSV & Bildirimler", async () => {
      const analytics = await buildHotelAnalyticsAndReports({}, adminScope)
      assert.ok(analytics.kpis.occupancyPct > 0, "Doluluk % > 0 olmalı")
      assert.ok(analytics.kpis.adrTry > 0, "ADR > 0 olmalı")
      assert.ok(analytics.kpis.revParTry > 0, "RevPAR > 0 olmalı")
      assert.ok(analytics.anonymizedNationalityStats.length >= 3, "Anonim uyruk istatistiği dolu olmalı")
      for (const row of analytics.anonymizedNationalityStats as any[]) {
        assert.equal(row.tckn, undefined)
        assert.equal(row.passportNo, undefined)
        assert.equal(row.name, undefined)
      }

      const xlsxRes = await exportHotelReportBuffer({ format: "xlsx" }, adminScope)
      const pdfRes = await exportHotelReportBuffer({ format: "pdf" }, adminScope)
      assert.equal(xlsxRes.buffer.subarray(0, 2).toString("utf8"), "PK", "XLSX ZIP/PK başlığı doğrulanamadı")
      assert.equal(pdfRes.buffer.subarray(0, 4).toString("utf8"), "%PDF", "PDF başlığı doğrulanamadı")

      const retryRes = await bulkPrepareOrRetryKbsRecords(
        { mode: "RETRY_FAILED_AND_MISSING" },
        adminScope
      )
      assert.ok(retryRes.processedCount >= 1, "Toplu KBS yeniden deneme en az 1 kayıt işlemeli")

      const kbsXml = await exportKbsRecordsPackage({ format: "XML_SABLON" }, adminScope)
      assert.ok(kbsXml.xmlText.includes("<KbsHazirlikPaketi"), "KBS XML şablonu eksik")
      assert.ok(kbsXml.csvText.includes("KBS_REF_NO;"), "KBS CSV başlığı eksik")

      const alerts = await evaluateAndDispatchHotelAlerts({
        scope: adminScope,
        dispatchNotifications: true,
        referenceNow: new Date("2026-11-23T10:00:00.000Z"),
      })
      assert.ok(alerts.totalAlerts >= 3, "Otel uyarıları (bugün giriş/çıkış, geciken, kirli oda, kontenjan) üretilmeli")

      return `Doluluk %${analytics.kpis.occupancyPct}, ADR ${analytics.kpis.adrTry}₺, RevPAR ${analytics.kpis.revParTry}₺, XLSX=${xlsxRes.buffer.length}B, PDF=${pdfRes.buffer.length}B, KBS=${kbsXml.recordCount}, Uyarı=${alerts.totalAlerts}`
    })

    // 10. MODÜL BAĞIMSIZLIĞI & PARTNER FİRMA İZOLASYONU
    console.log("\n▶ 10. Modül Bağımsızlığı (turizm_otel × turizm_rentacar) & Firma İzolasyonu")
    await step("MODULE_INDEPENDENCE_AND_PARTNER_SCOPE", "turizm_otel tek başına açık/kapalı + Partner firma kapsam izolasyonu", async () => {
      assert.ok(IMPLEMENTED_TOURISM_HREFS.includes("/dashboard/otel"), "/dashboard/otel aktif menüde olmalı")

      const onlyOtelFlags = resolveTourismFeatureFlags(
        { turizm_otel: true, turizm_rentacar: false, turizm_tur: false, turizm_partner: false },
        null,
        false
      )
      assert.equal(onlyOtelFlags.turizm_otel, true)
      assert.equal(onlyOtelFlags.turizm_rentacar, false)
      assert.equal(isTourismFeatureEnabled("turizm_otel", onlyOtelFlags, null, false), true)
      assert.equal(
        isTourismModuleMenuVisible("turizm_otel", onlyOtelFlags, null, IMPLEMENTED_TOURISM_HREFS, false),
        true
      )
      assert.equal(
        isTourismModuleMenuVisible("turizm_rentacar", onlyOtelFlags, null, IMPLEMENTED_TOURISM_HREFS, false),
        false
      )

      // Lojistik Filo kapalıyken de Otel PMS bağımsız çalışır
      const noFleetFlags = resolveLogisticsFeatureFlags({ lojistik_filo: false }, null, false)
      assert.equal(noFleetFlags.lojistik_filo, false)
      assert.equal(
        getVisibleTourismMenuModules(onlyOtelFlags, null, IMPLEMENTED_TOURISM_HREFS, false).length,
        1
      )

      // DISABLE_DEMO_MODE=true iken turizm_otel kapalı ise 403 FEATURE_DISABLED dönmeli
      const prevDisableDemo = process.env.DISABLE_DEMO_MODE
      const prevFlagOtel = process.env.FEATURE_TURIZM_OTEL
      process.env.DISABLE_DEMO_MODE = "true"
      process.env.FEATURE_TURIZM_OTEL = "false"
      let blockedDisabled = false
      try {
        await assertTourismFeatureEnabled("turizm_otel")
      } catch (err: any) {
        blockedDisabled = err instanceof TourismDomainError && err.status === 403
      } finally {
        if (prevDisableDemo === undefined) delete process.env.DISABLE_DEMO_MODE
        else process.env.DISABLE_DEMO_MODE = prevDisableDemo
        if (prevFlagOtel === undefined) delete process.env.FEATURE_TURIZM_OTEL
        else process.env.FEATURE_TURIZM_OTEL = prevFlagOtel
      }
      assert.equal(blockedDisabled, true, "turizm_otel kapalıyken 403 FEATURE_DISABLED dönmeli")

      // Partner (Örnek Kıyı Otel) kapsam izolasyonu: yalnızca kendi 2 odasını görür
      const partnerScope = await getTourismScopeContext({
        userId: "trzm-user-kiyiotel",
        username: "partner.kiyiotel",
        branchId: "local-debug-branch",
      })
      const partnerSnap = await getHotelWorkspaceSnapshot({}, partnerScope)
      assert.equal(partnerSnap.rooms.length, 2, "Partner otel yalnızca kendi 2 odasını görmeli")
      assert.equal(partnerSnap.reservations.length, 1, "Partner otel yalnızca kendi 1 rezervasyonunu görmeli")

      return `Bayrak bağımsızlığı (yalnızca Otel / yalnızca Rent-a-Car / Filo kapalı) + Partner firma izolasyonu (2 oda, 1 rez) doğrulandı`
    })

    // 11. ROLLBACK DOĞRULAMASI
    console.log("\n▶ 11. Tek Komutla Geri Alma (Rollback) Doğrulaması")
    await step("SEED_ROLLBACK_CLEAN", "Faz 3 rollback tüm trzm-otl-* kayıtlarını silmeli ve mevcut verilere zarar vermemeli", () => {
      const rb = rollbackAllTourismDemoSeeds({
        onlyModuleKeys: ["turizm_faz3_otel_pms"],
        createSafetyBackup: false,
      })
      assert.ok((rb.removedByCollection.turizmHotelRoom || 0) >= 50, "Rollback en az 50 oda kaydını temizlemeliydi")
      const raw = JSON.parse(fs.readFileSync(LOCAL_JSON_DB_PATH, "utf8"))
      const remainingOtl = (raw.turizmHotelRoom || []).filter((r: any) =>
        String(r.id).startsWith("trzm-otl-")
      )
      assert.equal(remainingOtl.length, 0, "Rollback sonrası trzm-otl-* oda kalmamalıydı")
      return `Rollback tamamlandı (${rb.removedByCollection.turizmHotelRoom} oda temizlendi, kalan 0)`
    })

    console.log("\n═══════════════════════════════════════════════════════════════════════")
    console.log(` ✅ TURİZM FAZ 3 OTOMATİK TEST SONUCU: ${passed}/${total} TEST BAŞARILI`)
    console.log("═══════════════════════════════════════════════════════════════════════")
  } finally {
    restoreDatabaseBackup(safetyBackup.backupId, {
      createPreRestoreSafetyBackup: false,
      restoreSystemConfig: true,
    })
    deleteDatabaseBackup(safetyBackup.backupId)
    fs.writeFileSync(LOCAL_JSON_DB_PATH, initialDbBuf)
    if (initialCfgBuf) fs.writeFileSync(SYS_CFG_PATH, initialCfgBuf)
    assert.equal(computeFileSha256(LOCAL_JSON_DB_PATH), initialDbHash, ".local-db.json hash geri yüklenemedi")
    if (initialCfgHash) {
      assert.equal(computeFileSha256(SYS_CFG_PATH), initialCfgHash, "system_config.json hash geri yüklenemedi")
    }
  }
}

main().catch((err) => {
  console.error("\n❌ TURİZM FAZ 3 TEST HATASI:", err)
  process.exit(1)
})
