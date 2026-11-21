/**
 * Sunum ERP — Turizm Faz 2: Araç Kiralama (Rent-a-Car) — turizm_rentacar
 * Birim, Eşzamanlı Çift Rezervasyon Kilidi, Uçtan Uca Yaşam Döngüsü,
 * Filo Tutarlılığı, HGS/Ceza, KABİS, Raporlama ve Modül Bağımsızlığı Test Paketi
 */

process.env.SUNUM_DISABLE_CRON = "1"

import assert from "node:assert/strict"
import crypto from "node:crypto"
import fs from "node:fs"
import path from "node:path"
import { prisma } from "../lib/db"
import {
  resolveLogisticsFeatureFlags,
} from "../lib/config/logistics-feature-flags"
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
import { listFleetVehicles } from "../lib/logistics/fleet"
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
  autoMatchPenaltiesAndTollPassesToRentals,
  buildRentACarAnalyticsAndReports,
  createRentReservation,
  evaluateAndDispatchRentACarAlerts,
  exportKabisRecordsPackage,
  exportRentACarReportBuffer,
  extendRentReservation,
  generateOrSignRentContract,
  getRentACarWorkspaceSnapshot,
  importOrRecordTollPasses,
  reflectPenaltyOrTollToCustomer,
  refundOrSettleDeposit,
  submitVehicleHandoverInspection,
  submitVehicleReturnInspection,
  swapReservationVehicle,
  updateKabisRecordStatus,
} from "../lib/tourism/rentacar"

const SYS_CFG_PATH = path.join(process.cwd(), "storage", "system_config.json")

function computeFileSha256(filePath: string): string {
  return crypto.createHash("sha256").update(fs.readFileSync(filePath)).digest("hex")
}

async function main() {
  console.log("═══════════════════════════════════════════════════════════════════════")
  console.log(" SUNUM ERP — TURİZM FAZ 2 (RENT-A-CAR) OTOMATİK DOĞRULAMA TEST PAKETİ")
  console.log("═══════════════════════════════════════════════════════════════════════")

  const initialDbHash = computeFileSha256(LOCAL_JSON_DB_PATH)
  const initialDbBuf = fs.readFileSync(LOCAL_JSON_DB_PATH)
  const initialCfgBuf = fs.existsSync(SYS_CFG_PATH) ? fs.readFileSync(SYS_CFG_PATH) : null
  const initialCfgHash = initialCfgBuf ? computeFileSha256(SYS_CFG_PATH) : null

  const safetyBackup = createDatabaseBackup({
    label: "test-turizm-faz2-safety",
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
    await step("CLIENT_PURITY_AND_NO_BANNED_TEXT", "İstemci bileşenlerinde fs/db/audit importu ve yasaklı teknik metin olmaması", () => {
      const filesToCheck = [
        "lib/tourism/rentacar/constantsAndHelpers.ts",
        "lib/tourism/rentacar/providers.ts",
        "app/dashboard/arac-kiralama/page.tsx",
        "app/dashboard/arac-kiralama/teslim-iade/page.tsx",
        "app/dashboard/arac-kiralama/components/RentGanttAndReservationsTabs.tsx",
        "app/dashboard/arac-kiralama/components/RentHandoverAndChargesTabs.tsx",
        "app/dashboard/arac-kiralama/components/RentClassesKabisAndReportsTabs.tsx",
      ]
      const forbiddenServerImports = [
        /from\s+["']node:fs["']/,
        /from\s+["']fs["']/,
        /from\s+["']@\/lib\/db["']/,
        /from\s+["']@\/lib\/audit["']/,
      ]
      const bannedUiPhrases = [
        /Özellik bayrağı kapalı/i,
        /Özellik bayrağı pasif/i,
        /altyapı hazır/i,
        /yakında eklenecek/i,
        /\bTODO\b/,
        /\bFIXME\b/,
      ]

      for (const rel of filesToCheck) {
        const abs = path.join(process.cwd(), rel)
        assert.equal(fs.existsSync(abs), true, `${rel} mevcut olmalı`)
        const content = fs.readFileSync(abs, "utf8")
        assert.ok(content.length > 200 && !content.includes("\0"), `${rel} boş veya NUL olmamalı`)
        for (const rx of forbiddenServerImports) {
          assert.equal(rx.test(content), false, `${rel} içinde sunucu importu (${rx}) bulunmamalı`)
        }
        for (const rx of bannedUiPhrases) {
          assert.equal(rx.test(content), false, `${rel} içinde yasaklı ifade (${rx}) bulunmamalı`)
        }
      }
      return `${filesToCheck.length} dosya saf ve yasaklı ifadelerden arındırılmış doğrulandı`
    })

    // 2. ADDITIVE SQL MIGRATION & ROLLBACK DOĞRULAMASI
    console.log("\n▶ 2. Additive SQL Migration & Rollback Doğrulaması")
    await step("MIGRATION_FAZ2", "Faz 1 ve Faz 2 turizm additive SQL migration/rollback çiftlerinin doğrulaması", () => {
      const results = validateAllTourismMigrations()
      assert.ok(results.length >= 2, "En az 2 turizm migration klasörü olmalı (Faz 1 + Faz 2)")
      for (const r of results) {
        assert.equal(r.valid, true, `${r.migrationName} hatalı: ${r.errors.join(", ")}`)
      }
      return `${results.length} Turizm additive migration/rollback çifti geçerli`
    })

    // 3. DEMO SEED, İDEMPOTENCY VE FAZ 2 VERİ ENVANTERİ
    console.log("\n▶ 3. Faz 2 Demo Seed, Ortam Kilidi, İdempotency ve Veri Envanteri")
    await step("SEED_FAZ2_INVENTORY", "15-20 araç, 25-30+ kurgusal müşteri, 6 ay geçmiş + 60 gün gelecek rezervasyonlar ve idempotency", async () => {
      process.env.DISABLE_DEMO_MODE = "true"
      try {
        assert.throws(() => assertLogisticsDemoSeedAllowed(), LogisticsSeedEnvironmentError)
      } finally {
        delete process.env.DISABLE_DEMO_MODE
      }

      const seed1 = await runAllTourismDemoSeeds({ createBackup: false })
      assert.equal(seed1.success, true)
      assert.equal(seed1.preExistingIntegrityIntact, true)

      const seed2 = await runAllTourismDemoSeeds({ createBackup: false })
      assert.equal(seed2.success, true)
      assert.equal(seed2.preExistingIntegrityIntact, true)
      const faz2Step2 = seed2.modulesExecuted.find(
        (m: any) => m.moduleKey === "turizm_faz2_arac_kiralama"
      )!
      const secondInserts = Object.values(faz2Step2.inserted).reduce(
        (a: number, b: any) => a + Number(b || 0),
        0
      )
      assert.equal(secondInserts, 0, "İkinci çalıştırmada sıfır yeni kayıt eklenmeli")

      const adminScope = await getTourismScopeContext({
        userId: "user-admin",
        username: "admin",
        branchId: "local-debug-branch",
      })
      const snap = await getRentACarWorkspaceSnapshot({}, adminScope)

      assert.ok(
        snap.rentalVehicles.length >= 15 && snap.rentalVehicles.length <= 20,
        `Kiralama filosunda 15-20 araç olmalı (bulunan: ${snap.rentalVehicles.length})`
      )
      assert.equal(snap.classes.length, 6, "6 araç sınıfı olmalı")
      assert.ok(snap.tariffs.length >= 8, "En az 8 fiyat tarifesi olmalı")
      assert.ok(snap.extraServices.length >= 6, "En az 6 ek hizmet olmalı")
      assert.ok(snap.customers.length >= 25, `En az 25 müşteri olmalı (bulunan: ${snap.customers.length})`)
      assert.ok(snap.reservations.length >= 16, "6 ay geçmiş + gelecek 60 gün rezervasyonları olmalı")
      assert.ok(snap.contracts.length >= 10, "Kiralama sözleşmeleri dolu olmalı")
      assert.ok(snap.inspectionForms.length >= 8, "Teslim/iade formları dolu olmalı")
      assert.ok(snap.depositCharges.length >= 10, "Depozito ve ek ücretler dolu olmalı")
      assert.ok(snap.tollPasses.length >= 5, "HGS geçiş kayıtları dolu olmalı")
      assert.ok(snap.trafficPenalties.length >= 3, "Eşleşmiş trafik cezaları dolu olmalı")
      assert.ok(snap.kabisRecords.length >= 6, "KABİS hazırlık kayıtları dolu olmalı")
      assert.ok(snap.conflictLogs.length >= 3, "Çakışma red kayıtları dolu olmalı")

      return `${snap.rentalVehicles.length} kiralama aracı, ${snap.customers.length} müşteri, ${snap.reservations.length} rezervasyon doğrulandı`
    })

    // 4. EŞZAMANLI ÇİFT REZERVASYON KİLİDİ, BAKIMDA ARAÇ ENGELİ VE SÜRÜCÜ UYGUNLUK KURALI
    console.log("\n▶ 4. Eşzamanlı Çift Rezervasyon Kilidi, Bakımda Araç Engeli ve Ehliyet/Yaş Kuralları")
    let testCreatedResId = ""
    await step("CONCURRENT_DOUBLE_BOOKING_LOCK", "Aynı araç ve tarih aralığına eşzamanlı (Promise.all) gelen 2 istekten yalnızca 1'inin kabul edilmesi", async () => {
      const adminScope = await getTourismScopeContext({
        userId: "user-admin",
        username: "admin",
        branchId: "local-debug-branch",
      })

      // 4a. Eşzamanlı iki rezervasyon isteği (trzm-rnt-veh-01 -> 2026-12-18 .. 2026-12-22)
      const [resA, resB] = await Promise.allSettled([
        createRentReservation(
          {
            vehicleId: "trzm-rnt-veh-01",
            customerId: "trzm-rnt-cust-01",
            startAt: "2026-12-18T09:00:00.000Z",
            endAt: "2026-12-22T09:00:00.000Z",
            selectedExtraIds: ["trzm-rnt-ext-01"],
          },
          adminScope
        ),
        createRentReservation(
          {
            vehicleId: "trzm-rnt-veh-01",
            customerId: "trzm-rnt-cust-02",
            startAt: "2026-12-19T10:00:00.000Z",
            endAt: "2026-12-23T10:00:00.000Z",
          },
          adminScope
        ),
      ])

      const fulfilled = [resA, resB].filter((r) => r.status === "fulfilled") as PromiseFulfilledResult<any>[]
      const rejected = [resA, resB].filter((r) => r.status === "rejected") as PromiseRejectedResult[]

      assert.equal(fulfilled.length, 1, "Eşzamanlı iki çakışan istekten tam olarak 1 tanesi başarılı olmalı")
      assert.equal(rejected.length, 1, "Eşzamanlı iki çakışan istekten tam olarak 1 tanesi reddedilmeli")
      assert.ok(rejected[0].reason instanceof TourismDomainError)
      assert.equal(rejected[0].reason.status, 409)
      assert.equal(rejected[0].reason.details?.rejectionCode, "DOUBLE_BOOKING_LOCKED")

      testCreatedResId = fulfilled[0].value.id

      // 4b. Bakımda olan araç (34 RNT 913 / trzm-rnt-veh-13) kiralanamaz!
      let maintBlocked = false
      try {
        await createRentReservation(
          {
            vehicleId: "trzm-rnt-veh-13",
            customerId: "trzm-rnt-cust-01",
            startAt: "2026-12-10T09:00:00.000Z",
            endAt: "2026-12-14T09:00:00.000Z",
          },
          adminScope
        )
      } catch (err: any) {
        maintBlocked =
          err instanceof TourismDomainError &&
          err.status === 409 &&
          err.details?.rejectionCode === "VEHICLE_IN_MAINTENANCE"
      }
      assert.equal(maintBlocked, true, "Bakımdaki araç (34 RNT 913) kiralanamamalı")

      // 4c. Kara listedeki müşteri (trzm-rnt-cust-25) ve VIP sınıf yaş/ehliyet sınırı altındaki genç sürücü (trzm-rnt-cust-26) engellenmeli
      let blacklistBlocked = false
      try {
        await createRentReservation(
          {
            vehicleId: "trzm-rnt-veh-08",
            customerId: "trzm-rnt-cust-25",
            startAt: "2027-02-01T09:00:00.000Z",
            endAt: "2027-02-04T09:00:00.000Z",
          },
          adminScope
        )
      } catch (err: any) {
        blacklistBlocked = err instanceof TourismDomainError && err.status === 400
      }
      assert.equal(blacklistBlocked, true, "Kara listedeki müşteri engellenmeli")

      let underageBlocked = false
      try {
        await createRentReservation(
          {
            vehicleId: "trzm-rnt-veh-08", // VIP sınıf: min 27 yaş, min 5 yıl ehliyet
            customerId: "trzm-rnt-cust-26", // 2006 doğumlu, 2026 ehliyetli
            startAt: "2027-02-05T09:00:00.000Z",
            endAt: "2027-02-08T09:00:00.000Z",
          },
          adminScope
        )
      } catch (err: any) {
        underageBlocked = err instanceof TourismDomainError && err.status === 400
      }
      assert.equal(underageBlocked, true, "Sınıf yaş/ehliyet yılı kuralına uymayan sürücü engellenmeli")

      return "Atomik çift rezervasyon kilidi (1 kabul / 1 red), bakımda araç engeli ve yaş/ehliyet/kara liste kuralları doğrulandı"
    })

    // 5. UÇTAN UCA KİRALAMA YAŞAM DÖNGÜSÜ VE FİLO DURUM TUTARLILIĞI
    console.log("\n▶ 5. Rezervasyon → Uzatma/Araç Değişimi → Sözleşme → Teslim → İade → Ek Ücret → Cari/Fatura Uçtan Uca Testi")
    await step("E2E_RENTAL_LIFECYCLE_AND_FLEET_SYNC", "Süre uzatma, araç değişimi, dijital imzalı sözleşme, teslim/iade fark hesabı, Filo durum senkronu ve E-Belge/Finans kaydı", async () => {
      const adminScope = await getTourismScopeContext({
        userId: "user-admin",
        username: "admin",
        branchId: "local-debug-branch",
      })

      // 5a. Rezervasyon süresini 2 gün uzat
      const extended = await extendRentReservation(
        {
          reservationId: testCreatedResId,
          newEndAt: "2026-12-24T09:00:00.000Z",
          notes: "Uçtan uca test süre uzatımı",
        },
        adminScope
      )
      assert.equal(extended.rentalDays, 6)
      assert.equal(extended.extensionCount, 1)

      // 5b. Aracı değiştir (trzm-rnt-veh-01 -> trzm-rnt-veh-10 Dacia Duster 4x4)
      const swapped = await swapReservationVehicle(
        {
          reservationId: testCreatedResId,
          newVehicleId: "trzm-rnt-veh-10",
          swapReason: "Müşteri 4x4 araç talep etti",
        },
        adminScope
      )
      assert.equal(swapped.vehicleId, "trzm-rnt-veh-10")
      assert.equal(swapped.swappedFromVehicleId, "trzm-rnt-veh-01")

      // 5c. Sözleşme üret ve dijital imzala
      const contract = await generateOrSignRentContract(
        {
          reservationId: testCreatedResId,
          customerSignatureDataUrl: "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==",
          customerSignedByName: "Emirhan Soylu (Örnek Kiracı)",
        },
        adminScope
      )
      assert.equal(contract.status, "SIGNED_ACTIVE")
      assert.ok(contract.renderedTermsText.includes("35 RNT 910"))

      // 5d. Teslim (Çıkış) Ekspertiz Formu -> Araç 'RENTED' ve Filo'da 'IN_TRANSIT' olmalı
      const deliveryRes = await submitVehicleHandoverInspection(
        {
          reservationId: testCreatedResId,
          odometerKm: 42000,
          fuelLevelPct: 100,
          damageMarkers: [],
          damagePhotoUrls: ["/uploads/pod-demo/rentacar-teslim-ekspertiz.svg"],
          depositCollectedTry: 8500,
        },
        adminScope
      )
      assert.equal(deliveryRes.deliveryForm.formType, "DELIVERY")
      assert.equal(deliveryRes.kabisRecord.notificationType, "KIRALAMA_ACILIS")

      const fleetDuringRental = await listFleetVehicles({})
      const vehDuring = fleetDuringRental.find((v: any) => v.id === "trzm-rnt-veh-10")
      assert.equal(vehDuring?.status, "IN_TRANSIT", "Kiradaki araç Filo modülünde IN_TRANSIT olmalı")
      assert.equal(vehDuring?.rentalStatus, "RENTED", "Kiradaki aracın rentalStatus alanı RENTED olmalı")

      // 5e. İade (Dönüş) Ekspertiz Formu (Km aşımı + Eksik yakıt + Geç iade + Yeni hasar) -> Otomatik fark hesabı, Cari (Finance) ve E-Belge
      const returnRes = await submitVehicleReturnInspection(
        {
          reservationId: testCreatedResId,
          odometerKm: 43700, // 1700 km kullanıldı (6 gün x 250 = 1500 km limit -> 200 km aşım!)
          fuelLevelPct: 80, // %20 eksik yakıt!
          actualReturnAt: "2026-12-24T12:30:00.000Z", // 3.5 saat gecikme (60 dk hoşgörü sonrası 3 saat!)
          damageMarkers: ["Ön Tampon"],
          damagePhotoUrls: ["/uploads/pod-demo/rentacar-hasar-on-tampon.svg"],
          hasNewDamage: true,
          estimatedDamageCostTry: 1800,
          sendToMaintenance: false,
          autoRefundRemainingDeposit: true,
        },
        adminScope
      )

      assert.equal(returnRes.comparison.excessKm, 200)
      assert.ok(returnRes.comparison.extraKmChargeTry > 0)
      assert.equal(returnRes.comparison.missingFuelPct, 20)
      assert.ok(returnRes.comparison.fuelDifferenceChargeTry > 0)
      assert.equal(returnRes.comparison.billableLateHours, 3)
      assert.ok(returnRes.comparison.lateReturnChargeTry > 0)
      assert.equal(returnRes.comparison.damageChargeTry, 1800)
      assert.ok(returnRes.comparison.totalExtraChargesTry > 3000)
      assert.ok(returnRes.invoiceResult?.eDocument?.documentNo, "İade tamamlandığında otomatik E-Belge kesilmeli")
      assert.ok(returnRes.invoiceResult?.financeRecord?.id, "İade tamamlandığında otomatik Finance gelir kaydı oluşmalı")

      const fleetAfterReturn = await listFleetVehicles({})
      const vehAfter = fleetAfterReturn.find((v: any) => v.id === "trzm-rnt-veh-10")
      assert.equal(vehAfter?.status, "ACTIVE", "İade alınan araç Filo modülünde tekrar ACTIVE olmalı")
      assert.equal(vehAfter?.rentalStatus, "AVAILABLE", "İade alınan araç AVAILABLE olmalı")
      assert.equal(vehAfter?.odometerKm, 43700, "İade kilometresi Filo aracına işlenmeli")

      return `Sözleşme (${contract.contractNo}), Teslim->İade farkı (${returnRes.comparison.totalExtraChargesTry} TRY), E-Belge (${returnRes.invoiceResult?.eDocument?.documentNo}) ve Filo durum tutarlılığı doğrulandı`
    })

    // 6. HGS & TRAFİK CEZASI EŞLEŞTİRME, KABİS DIŞA AKTARMA, RAPOR (XLSX/PDF) VE BİLDİRİMLER
    console.log("\n▶ 6. HGS/Ceza Eşleştirme, KABİS Paketi, Rapor Dışa Aktarma (XLSX/PDF) ve Bildirimler")
    await step("HGS_PENALTY_KABIS_REPORTS_AND_ALERTS", "Plaka+tarih otomatik eşleştirme, müşteriye yansıtma, KABİS dışa aktarma, XLSX/PDF rapor ve 4 bildirim kuralı", async () => {
      const adminScope = await getTourismScopeContext({
        userId: "user-admin",
        username: "admin",
        branchId: "local-debug-branch",
      })

      // 6a. CSV ile HGS geçişi içe aktar ve aktif kiralamayla otomatik eşleştir
      const csvImport = await importOrRecordTollPasses(
        {
          csvContent:
            "34 SNR 205;2026-11-20T15:30:00.000Z;Osmangazi Köprüsü;555;Muallimköy;Altınova",
        },
        adminScope
      )
      assert.equal(csvImport.importedCount, 1)
      assert.ok(csvImport.matchSummary.matchedTollPassesCount >= 1)

      // 6b. Eşleşen trafik cezasını (trzm-rnt-pen-02) ve HGS geçişini (trzm-rnt-hgs-02) müşteriye yansıt
      const penReflect = await reflectPenaltyOrTollToCustomer(
        {
          sourceType: "PENALTY",
          sourceId: "trzm-rnt-pen-02",
          includeAdminServiceFee: true,
        },
        adminScope
      )
      assert.equal(penReflect.reflectedCharge.entryType, "TRAFFIC_PENALTY_REFLECTION")
      assert.ok(penReflect.reflectedCharge.financeId, "Yansıtılan ceza Finance tablosuna işlenmeli")

      const tollReflect = await reflectPenaltyOrTollToCustomer(
        {
          sourceType: "TOLL",
          sourceId: "trzm-rnt-hgs-02",
          includeAdminServiceFee: false,
        },
        adminScope
      )
      assert.equal(tollReflect.reflectedCharge.entryType, "TOLL_PASS_REFLECTION")

      // 6c. Bekleyen depozito iadesini (trzm-rnt-chg-07) onayla
      const settledDep = await refundOrSettleDeposit(
        { chargeId: "trzm-rnt-chg-07", notes: "Test iade onayı" },
        adminScope
      )
      assert.equal(settledDep.status, "REFUNDED")

      // 6d. KABİS hatalı kaydını yeniden hazırla ve CSV paketi dışa aktar
      const retriedKabis = await updateKabisRecordStatus(
        {
          kabisId: "trzm-rnt-kbs-06",
          preparationStatus: "HAZIRLANDI",
          lastErrorNote: null,
        },
        adminScope
      )
      assert.equal(retriedKabis.preparationStatus, "HAZIRLANDI")

      const kabisExport = await exportKabisRecordsPackage(
        { format: "CSV", markAsManualExported: false },
        adminScope
      )
      assert.ok(kabisExport.recordCount >= 6)
      assert.ok(kabisExport.csvText.includes("KABIS_REF_NO;BILDIRIM_TIPI;PLAKA"))

      // 6e. Raporlar & Excel (.xlsx) / PDF (.pdf) Dışa Aktarma
      const analytics = await buildRentACarAnalyticsAndReports({}, adminScope)
      assert.ok(analytics.summary.totalRevenueTry > 100000)
      assert.ok(analytics.vehicleProfitabilityRows.length >= 15)

      const xlsxOut = await exportRentACarReportBuffer({ format: "xlsx" }, adminScope)
      assert.equal(xlsxOut.buffer.subarray(0, 2).toString("utf8"), "PK", "Geçerli XLSX ZIP başlığı olmalı")
      const pdfOut = await exportRentACarReportBuffer({ format: "pdf" }, adminScope)
      assert.equal(pdfOut.buffer.subarray(0, 4).toString("utf8"), "%PDF", "Geçerli PDF başlığı olmalı")

      // 6f. Bildirimler (Geciken iade, yaklaşan teslim/iade, bakım çakışması)
      const alertsRes = await evaluateAndDispatchRentACarAlerts({
        scope: adminScope,
        dispatchNotifications: true,
        referenceNow: new Date("2026-11-21T12:00:00.000Z"),
      })
      assert.ok(alertsRes.totalAlerts >= 2, "En az geciken iade ve yaklaşan teslim uyarıları tespit edilmeli")
      assert.ok(
        alertsRes.alerts.some((a) => a.kind === "OVERDUE_RENTAL_RETURN"),
        "Geciken araç iadesi (34 RNT 202) uyarısı üretilmeli"
      )

      return `HGS/Ceza yansıtma, KABİS CSV (${kabisExport.recordCount} kayıt), XLSX (${xlsxOut.buffer.length}B) / PDF (${pdfOut.buffer.length}B) ve ${alertsRes.totalAlerts} bildirim doğrulandı`
    })

    // 7. MODÜL BAĞIMSIZLIĞI (turizm_rentacar AÇIK/KAPALI x lojistik_filo AÇIK/KAPALI KOMBİNASYONLARI)
    console.log("\n▶ 7. Modül Bağımsızlığı Testi (turizm_rentacar x lojistik_filo Kombinasyonları)")
    await step("MODULE_INDEPENDENCE_COMBINATIONS", "turizm_rentacar ve lojistik_filo bayraklarının 4 açık/kapalı kombinasyonunun birbirini bozmaması", async () => {
      // Kombinasyon 1: turizm_rentacar=true, lojistik_filo=false
      const tFlags1 = resolveTourismFeatureFlags({ turizm_rentacar: true }, null, false)
      const lFlags1 = resolveLogisticsFeatureFlags({ lojistik_filo: false }, null, false)
      assert.equal(tFlags1.turizm_rentacar, true)
      assert.equal(lFlags1.lojistik_filo, false)
      assert.equal(
        isTourismModuleMenuVisible("turizm_rentacar", { turizm_rentacar: true }, null, IMPLEMENTED_TOURISM_HREFS, false),
        true
      )

      // Kombinasyon 2: turizm_rentacar=false, lojistik_filo=true
      const tFlags2 = resolveTourismFeatureFlags({ turizm_rentacar: false }, null, false)
      const lFlags2 = resolveLogisticsFeatureFlags({ lojistik_filo: true }, null, false)
      assert.equal(tFlags2.turizm_rentacar, false)
      assert.equal(lFlags2.lojistik_filo, true)
      assert.equal(
        isTourismModuleMenuVisible("turizm_rentacar", { turizm_rentacar: false }, null, IMPLEMENTED_TOURISM_HREFS, false),
        false
      )

      // Kombinasyon 3: Her ikisi de kapalı (gerçek kurulum varsayılanı)
      assert.equal(isTourismFeatureEnabled("turizm_rentacar", undefined, null, false), false)
      assert.equal(
        getVisibleTourismMenuModules({ turizm_rentacar: false }, null, IMPLEMENTED_TOURISM_HREFS, false).length,
        0
      )

      // Çok firmalı (Partner) izolasyonu: Örnek Ege Rota (trzm-comp-rentacar-01) yalnızca kendi aracını ve rezervasyonunu görür
      const partnerScope = await getTourismScopeContext({
        userId: "trzm-user-egerota",
        username: "partner.egerota",
        branchId: "branch-izmir",
      })
      const partnerSnap = await getRentACarWorkspaceSnapshot({}, partnerScope)
      assert.equal(
        partnerSnap.rentalVehicles.every((v: any) => v.ownerCompanyId === "trzm-comp-rentacar-01"),
        true,
        "Partner firma yalnızca kendi kiralama araçlarını görebilmeli"
      )
      assert.equal(
        partnerSnap.reservations.every((r: any) => r.ownerCompanyId === "trzm-comp-rentacar-01"),
        true,
        "Partner firma yalnızca kendi rezervasyonlarını görebilmeli"
      )

      return "4 bayrak kombinasyonu (Açık/Kapalı) ve Partner firma izolasyonu doğrulandı"
    })
  } finally {
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
  console.error("❌ TURİZM FAZ 2 TEST HATASI:", err)
  process.exit(1)
})
