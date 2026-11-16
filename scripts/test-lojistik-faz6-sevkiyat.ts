/**
 * Lojistik Faz 6 (lojistik_sevkiyat_rota — Sevkiyat, Sefer Planlama, CVRPTW Rota,
 * Sürücü Mobil + e-POD, Süreli Müşteri Takip & Onayda E-İrsaliye)
 * Kapsamlı Otomatik Doğrulama Paketi
 *
 * Çalıştırma:
 *   npx cross-env SUNUM_DISABLE_CRON=1 npx tsx scripts/test-lojistik-faz6-sevkiyat.ts
 */

process.env.SUNUM_DISABLE_CRON = "1"

import assert from "node:assert/strict"
import crypto from "node:crypto"
import fs from "node:fs"
import path from "node:path"
import { prisma } from "@/lib/db"
import { validateAllLogisticsMigrations } from "@/lib/services/migrationStrategyService"
import { isDemoEnvironment } from "@/lib/config/production-feature-flags"
import {
  isLogisticsFeatureEnabled,
  isLogisticsFleetMenuVisible,
  resolveLogisticsFeatureFlags,
} from "@/lib/config/logistics-feature-flags"
import { LogisticsDomainError } from "@/lib/logistics/security"
import {
  computeDispatchKpis,
  evaluateDriverVehicleCompatibility,
  evaluateVehicleCapacityLoad,
} from "@/lib/logistics/dispatch/constantsAndHelpers"
import {
  optimizeSingleTripRoute,
  planMultiVehicleTrips,
  type SolverStopInput,
  type SolverVehicleInput,
} from "@/lib/logistics/dispatch/cvrptwSolver"
import {
  approveTripAndTriggerEWaybill,
  createDispatchTrip,
  driverUpdateTripOrStopExecution,
  dynamicReplanTrip,
  extendOrRotateTrackingLink,
  getPublicCustomerTrackingByToken,
  listDispatchOverviewAndReadyPool,
  optimizeExistingTripWithJob,
  reorderTripStopsManually,
  submitStopDeliveryProof,
} from "@/lib/logistics/dispatch/dispatchService"
import {
  LogisticsSeedEnvironmentError,
  assertLogisticsDemoSeedAllowed,
} from "@/lib/logistics/seed/framework"
import {
  rollbackAllLogisticsDemoSeeds,
  runAllLogisticsDemoSeeds,
} from "@/lib/logistics/seed"

const DB_PATH = path.join(process.cwd(), "storage", "ajans-kutuphanesi", ".local-db.json")
const SYS_CFG_PATH = path.join(process.cwd(), "storage", "system_config.json")
const TEST_POD_IMG_BASE64 =
  "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAQAAAAECAIAAAAmkwkpAAAAEElEQVR42mP8z8AARwzEcQAAAP//AwwDAf0AAAAASUVORK5CYII="

async function expectDomainError(
  fn: () => Promise<any>,
  expectedCode: string,
  label: string
) {
  let caught: any = null
  try {
    await fn()
  } catch (err: any) {
    caught = err
  }
  assert.ok(caught, `${label}: hata fırlatılması beklendi.`)
  assert.equal(
    caught.code,
    expectedCode,
    `${label}: beklenen kod '${expectedCode}', gelen '${caught.code || caught.message}'`
  )
}

async function runSuite() {
  const snapshotRaw = fs.existsSync(DB_PATH) ? fs.readFileSync(DB_PATH) : null
  const sysCfgRaw = fs.existsSync(SYS_CFG_PATH) ? fs.readFileSync(SYS_CFG_PATH) : null

  const savedEnv = {
    DISABLE_DEMO_MODE: process.env.DISABLE_DEMO_MODE,
    ENABLE_DEMO_MODE: process.env.ENABLE_DEMO_MODE,
    FEATURE_LOJISTIK_SEVKIYAT_ROTA: process.env.FEATURE_LOJISTIK_SEVKIYAT_ROTA,
    FEATURE_LOJISTIK_ALL: process.env.FEATURE_LOJISTIK_ALL,
    FEATURE_URETIM_BAKIM: process.env.FEATURE_URETIM_BAKIM,
  }

  let passed = 0
  const createdStorageFiles: string[] = []
  const step = async (label: string, fn: () => Promise<void> | void) => {
    await fn()
    passed++
    console.log(`✅ [${passed}] ${label}`)
  }

  try {
    // Önce temiz Faz 1-6 demo seed tabanını garantile
    rollbackAllLogisticsDemoSeeds({ createSafetyBackup: false })
    await runAllLogisticsDemoSeeds({ createBackup: false })

    // 1. Migration & Rollback Doğrulaması
    await step("Faz 6 migration ve rollback doğrulaması (6/6 valid)", async () => {
      const results = validateAllLogisticsMigrations()
      assert.equal(results.length, 6, "Toplam 6 lojistik migration bekleniyordu.")
      for (const r of results) {
        assert.equal(r.valid, true, `Migration '${r.migrationName}' geçersiz: ${r.errors.join("; ")}`)
      }
      const faz6 = results.find((r) => r.migrationName.includes("20261116180000_lojistik_faz6_sevkiyat_rota"))
      assert.ok(faz6, "Faz 6 migration kaydı bulunamadı.")
      assert.equal(faz6!.addedTables.length, 5, "Faz 6'da 5 yeni Lojistik* tablosu bekleniyordu.")
      assert.equal(faz6!.rollbackTables.length, 5, "Faz 6 rollback'te 5 DROP TABLE bekleniyordu.")
    })

    // 2. Özellik Bayrağı & Menü Doğrulaması
    await step("Özellik bayrağı matrisi (lojistik_sevkiyat_rota) & Demo OFF kilidi", () => {
      process.env.DISABLE_DEMO_MODE = "true"
      delete process.env.FEATURE_LOJISTIK_SEVKIYAT_ROTA
      delete process.env.FEATURE_LOJISTIK_ALL
      assert.equal(isDemoEnvironment(), false)
      assert.equal(isLogisticsFeatureEnabled("lojistik_sevkiyat_rota"), false)
      assert.equal(isLogisticsFleetMenuVisible(null, null, ["/dashboard/sevkiyat"]), false)

      process.env.FEATURE_LOJISTIK_SEVKIYAT_ROTA = "true"
      assert.equal(resolveLogisticsFeatureFlags().lojistik_sevkiyat_rota, true)
      assert.equal(isLogisticsFeatureEnabled("lojistik_sevkiyat_rota"), true)
      assert.equal(isLogisticsFleetMenuVisible(null, null, ["/dashboard/sevkiyat"]), true)

      delete process.env.DISABLE_DEMO_MODE
      delete process.env.FEATURE_LOJISTIK_SEVKIYAT_ROTA
      assert.equal(isDemoEnvironment(), true)
      assert.equal(isLogisticsFeatureEnabled("lojistik_sevkiyat_rota"), true)
    })

    // 3. CVRPTW Matematiksel Kıyaslama Testleri (Çapraz Rota Çözümü & Zaman Penceresi Sıralaması)
    await step("CVRPTW Tek Araç Kıyaslaması: Çapraz durak kısaltma + dar zaman penceresi önceliği", () => {
      const origin = { label: "Tuzla Merkez Depo", lat: 40.8224, lng: 29.3665 }
      const crissCrossStops: SolverStopInput[] = [
        { id: "s1", label: "Beylikdüzü", lat: 41.0021, lng: 28.6412, weightKg: 100 },
        { id: "s2", label: "Pendik", lat: 40.8794, lng: 29.2581, weightKg: 100 },
        { id: "s3", label: "Avcılar", lat: 40.9792, lng: 28.7215, weightKg: 100 },
        { id: "s4", label: "Maltepe", lat: 40.9339, lng: 29.1304, weightKg: 100 },
        { id: "s5", label: "Bakırköy", lat: 40.9808, lng: 28.8721, weightKg: 100 },
      ]
      const crossOpt = optimizeSingleTripRoute({
        origin,
        stops: crissCrossStops,
        plannedDepartureAt: "2026-11-16T08:00:00.000Z",
        avgSpeedKmh: 40,
        timeBudgetMs: 250,
      })
      assert.ok(
        crossOpt.optimizedDistanceKm < crossOpt.baselineUnoptimizedDistanceKm * 0.75,
        `Çapraz rota ciddi kısalmalıydı: ham=${crossOpt.baselineUnoptimizedDistanceKm}km -> opt=${crossOpt.optimizedDistanceKm}km`
      )

      // Zaman penceresi sıralaması: uzak veya ters girilmiş dar pencere (08:30-09:15) öne alınmalı
      const twStops: SolverStopInput[] = [
        {
          id: "late-stop",
          label: "Öğleden Sonra Müşteri",
          lat: 40.94,
          lng: 29.12,
          timeWindowStart: "14:00",
          timeWindowEnd: "16:30",
          serviceMinutes: 10,
        },
        {
          id: "early-stop",
          label: "Sabah Sıkı Pencere",
          lat: 41.02,
          lng: 29.05,
          timeWindowStart: "08:30",
          timeWindowEnd: "09:20",
          serviceMinutes: 10,
        },
      ]
      const twRes = optimizeSingleTripRoute({
        origin,
        stops: twStops,
        plannedDepartureAt: new Date(new Date().setHours(8, 0, 0, 0)),
        avgSpeedKmh: 40,
        timeBudgetMs: 150,
      })
      assert.equal(twRes.orderedStopIds[0], "early-stop", "Sabah dar zaman pencereli durak ilk sıraya alınmalı.")
      assert.equal(twRes.timeWindowViolations, 0, "Sabah önceliklendirme ile pencere ihlali 0 olmalı.")
    })

    // 4. Performans Testi: 100 Durak / 10 Araç Kapasite + Soğuk Zincir + Süre Benchmark
    await step("CVRPTW Ölçek Testi: 100 durak / 10 araç < 2000ms ve %0 kapasite aşımı", () => {
      const origin = { label: "Tuzla Depo", lat: 40.8224, lng: 29.3665 }
      const stops100: SolverStopInput[] = Array.from({ length: 100 }, (_, i) => {
        const angle = (i * 0.6180339887) * Math.PI * 2
        const r = 0.04 + (i % 10) * 0.022
        return {
          id: `bench-stop-${i + 1}`,
          label: `Durak ${i + 1}`,
          lat: Number((40.98 + Math.sin(angle) * r * 0.6).toFixed(5)),
          lng: Number((29.06 + Math.cos(angle) * r).toFixed(5)),
          weightKg: 95 + (i % 5) * 15,
          volumeM3: 0.6 + (i % 4) * 0.25,
          palletCount: 1,
          requiresColdChain: i % 4 === 0, // 25 adet soğuk zincir durağı
          timeWindowStart: i % 3 === 0 ? "09:00" : "11:00",
          timeWindowEnd: i % 3 === 0 ? "13:30" : "17:30",
          serviceMinutes: 8,
        }
      })

      const vehicles10: SolverVehicleInput[] = Array.from({ length: 10 }, (_, v) => ({
        vehicleId: `bench-veh-${v + 1}`,
        plate: `34 BNC ${100 + v}`,
        driverId: `bench-drv-${v + 1}`,
        driverName: `Test Sürücü ${v + 1}`,
        capacityKg: 2600,
        capacityM3: 22,
        palletSlots: 16,
        isRefrigerated: v < 4, // 4 frigo araç (toplam 64 palet kapasitesi > 25 frigo durak)
        shiftStart: "08:00",
        shiftEnd: "19:30",
      }))

      const t0 = Date.now()
      const batch = planMultiVehicleTrips({
        origin,
        stops: stops100,
        vehicles: vehicles10,
        plannedDepartureAt: new Date(new Date().setHours(8, 0, 0, 0)),
        avgSpeedKmh: 38,
        timeBudgetMs: 1200,
      })
      const elapsed = Date.now() - t0

      assert.equal(batch.totalStopsAssigned, 100, `100 durak tamamen atanmalı (atanan=${batch.totalStopsAssigned}).`)
      assert.equal(batch.unassignedStops.length, 0)
      assert.ok(elapsed < 2000, `100 durak/10 araç 2000ms altında bitmeli (gerçek=${elapsed}ms).`)

      const vehMap = new Map(vehicles10.map((v) => [v.vehicleId, v]))
      const stopMap = new Map(stops100.map((s) => [s.id, s]))
      for (const t of batch.trips) {
        const veh = vehMap.get(t.vehicleId)!
        assert.ok(t.totalWeightKg <= veh.capacityKg, `${t.plate} ağırlık aşıldı`)
        assert.ok(t.totalVolumeM3 <= veh.capacityM3, `${t.plate} hacim aşıldı`)
        assert.ok(t.totalPallets <= veh.palletSlots, `${t.plate} palet aşıldı`)
        if (!veh.isRefrigerated) {
          for (const sid of t.stopIds) {
            assert.equal(stopMap.get(sid)?.requiresColdChain, false, `Soğuk zincir yükü kuru araca (${t.plate}) atanamaz.`)
          }
        }
      }
      console.log(`   ℹ Benchmark: 100 durak / 10 araç -> ${batch.trips.length} sefer, ${elapsed}ms, ${batch.optimizedTotalDistanceKm} km`)
    })

    // 5. Kapasite Aşımı & Şoför/Araç Ehliyet/Evrak Uyumluluk Reddi
    await step("Kapasite aşımı, soğuk zincir ihlali ve şoför ehliyet/evrak uyumluluk kontrolleri", async () => {
      // Kuru kasa araca soğuk zincir yükü reddi
      await expectDomainError(
        () =>
          createDispatchTrip(
            {
              originWarehouseId: "wh-merkez-01",
              vehicleId: "f5-veh-10", // PICKUP, 1050kg, 1 palet, frigo=false
              driverId: "f5-drv-10",
              stops: [
                {
                  customerName: "Soğuk Zincir Test",
                  addressText: "Kadıköy / İstanbul",
                  weightKg: 250,
                  volumeM3: 1.2,
                  palletCount: 1,
                  requiresColdChain: true,
                },
              ],
            },
            { userId: "usr-admin-01" }
          ),
        "CAPACITY_EXCEEDED",
        "Kuru araca frigo durak"
      )

      // Kapasite fazlası (palet/kg aşımı) reddi
      const capCheck = evaluateVehicleCapacityLoad(
        { capacityKg: 1000, capacityM3: 5, palletSlots: 2, isRefrigerated: true },
        [{ weightKg: 800, volumeM3: 3, palletCount: 3, requiresColdChain: false }]
      )
      assert.equal(capCheck.isValid, false)
      assert.ok(capCheck.warnings.some((w) => w.includes("palet") || w.includes("Palet")))

      // B sınıfı şoförün ağır tonaj kamyon (TRUCK >= 3500kg) + bakım durumu + vardiya dışı saat kontrolü
      const drvCompat = evaluateDriverVehicleCompatibility(
        {
          licenseClass: "B",
          licenseExpiresAt: "2024-01-01T00:00:00.000Z", // Süresi geçmiş ehliyet
          shiftStart: "08:30",
          shiftEnd: "18:00",
        },
        { vehicleType: "TRUCK", capacityKg: 5400, status: "MAINTENANCE" },
        "2026-11-16T21:30:00.000Z",
        60,
        new Date("2026-11-16T10:00:00.000Z")
      )
      assert.equal(drvCompat.compatible, false)
      assert.ok(drvCompat.reasons.length >= 3)

      await expectDomainError(
        () =>
          createDispatchTrip(
            {
              originWarehouseId: "wh-merkez-01",
              vehicleId: "f5-veh-08", // 5400kg TRUCK MAINTENANCE
              driverId: "f5-drv-04", // B sınıfı şoför
              stops: [
                {
                  customerName: "Uyumsuz Araç Şoför Testi",
                  addressText: "Kadıköy / İstanbul",
                  weightKg: 200,
                },
              ],
            },
            { userId: "usr-admin-01" }
          ),
        "DRIVER_VEHICLE_INCOMPATIBLE",
        "Bakımdaki ağır kamyon + B sınıfı ehliyet reddi"
      )
    })

    // 6. Sefer Oluşturma, Manuel Sıra Değişikliği & CVRPTW Optimizasyon İşi
    let testTripId = ""
    let testStopIds: string[] = []
    await step("Sefer oluşturma, CVRPTW optimize işi ve manuel durak sırası güncelleme", async () => {
      const created = await createDispatchTrip(
        {
          originWarehouseId: "wh-online-03",
          vehicleId: "f5-veh-06", // ACTIVE 1450kg
          driverId: "f5-drv-06", // AVAILABLE
          title: "Faz 6 Otomatik Test Seferi",
          plannedDepartureAt: new Date(new Date().setHours(9, 0, 0, 0)).toISOString(),
          ignoreShiftWarning: true,
          stops: [
            {
              customerName: "Durak A Kadıköy",
              addressText: "Kadıköy / İstanbul",
              lat: 40.985,
              lng: 29.028,
              weightKg: 180,
              volumeM3: 1.2,
              palletCount: 1,
              requiresColdChain: false,
            },
            {
              customerName: "Durak B Beşiktaş",
              addressText: "Beşiktaş / İstanbul",
              lat: 41.044,
              lng: 29.005,
              weightKg: 210,
              volumeM3: 1.5,
              palletCount: 1,
              requiresColdChain: false,
            },
            {
              customerName: "Durak C Bakırköy",
              addressText: "Bakırköy / İstanbul",
              lat: 40.981,
              lng: 28.872,
              weightKg: 140,
              volumeM3: 0.9,
              palletCount: 1,
              requiresColdChain: false,
            },
          ],
          autoOptimize: true,
        },
        { userId: "usr-admin-01", username: "admin" }
      )
      testTripId = created.trip.id
      testStopIds = created.stops.map((s: any) => s.id)
      assert.equal(testStopIds.length, 3)

      const optRes = await optimizeExistingTripWithJob(testTripId, {
        userId: "usr-admin-01",
        username: "admin",
      })
      assert.equal(optRes.job.jobStatus, "COMPLETED")
      assert.ok(optRes.trip.plannedDistanceKm > 0)

      // Manuel ters sıralama
      const reversed = [...testStopIds].reverse()
      const manualRes = await reorderTripStopsManually(
        { tripId: testTripId, orderedStopIds: reversed },
        { userId: "usr-admin-01", username: "admin" }
      )
      assert.equal(manualRes.schedule.stops[0].id, reversed[0])
      assert.equal(manualRes.schedule.stops[0].sequenceNo, 1)
    })

    // 7. Dinamik Yeniden Planlama (ETA Kaydırma & Başka Araca Devir)
    let reassignedTripId = ""
    let reassignedStopId = ""
    await step("Dinamik yeniden planlama: gecikme öteleme + başka araca devir", async () => {
      const delayRes = await dynamicReplanTrip(
        {
          tripId: testTripId,
          reason: "Köprü bakım çalışması (+35 dk)",
          delayOffsetMinutes: 35,
        },
        { userId: "usr-admin-01", username: "admin" }
      )
      assert.equal(delayRes.mode, "RESEQUENCED_SAME_VEHICLE")

      // Duraklardan 2 tanesini başka araca (f5-veh-09) devret
      const reassignRes = await dynamicReplanTrip(
        {
          tripId: testTripId,
          reason: "Araç kapasite dengeleme devri",
          targetVehicleId: "f5-veh-09",
          targetDriverId: "f5-drv-09",
          stopIdsToMove: testStopIds.slice(0, 2),
        },
        { userId: "usr-admin-01", username: "admin" }
      )
      assert.equal(reassignRes.mode, "REASSIGNED_VEHICLE")
      reassignedTripId = reassignRes.newTrip!.id
      const overview = await listDispatchOverviewAndReadyPool()
      const movedTrip = overview.trips.find((t: any) => t.id === reassignedTripId)
      assert.ok(movedTrip && movedTrip.stops.length === 2)
      reassignedStopId = movedTrip.stops[0].id
    })

    // 8. Onay Akışında Otomatik E-İrsaliye Kesimi & İdempotency
    await step("Sefer onayında otomatik E-İrsaliye kesimi ve çift kesim önleme (idempotency)", async () => {
      const app1 = await approveTripAndTriggerEWaybill("f6-trip-04", {
        userId: "usr-admin-01",
        username: "admin",
      })
      assert.equal(app1.trip.status, "ONAYLANDI")
      assert.ok(app1.eWaybillNo && app1.eWaybillNo.startsWith("IRS"))

      const countBefore = await (prisma as any).eDocumentRecord.count()
      const app2 = await approveTripAndTriggerEWaybill("f6-trip-04", {
        userId: "usr-admin-01",
        username: "admin",
      })
      const countAfter = await (prisma as any).eDocumentRecord.count()
      assert.equal(app2.eWaybillNo, app1.eWaybillNo, "Aynı sefer ikinci kez onaylandığında aynı irsaliye dönmeli.")
      assert.equal(countAfter, countBefore, "Çift E-İrsaliye kaydı açılmamalı.")
    })

    // 9. Sürücü Yürütme + Başarısız Teslimat Nedeni + e-POD İmza/Fotoğraf + SHA-256
    await step("Sürücü teslimat akışı, başarısız neden zorunluluğu ve e-POD imza/SHA-256 kaydı", async () => {
      await driverUpdateTripOrStopExecution(
        { tripId: reassignedTripId, stopId: reassignedStopId, status: "START_TRIP" },
        { userId: "usr-drv-09", username: "İsmail Yılmaz" }
      )
      await driverUpdateTripOrStopExecution(
        { stopId: reassignedStopId, status: "VARISTA", lat: 41.0, lng: 29.0 },
        { userId: "usr-drv-09", username: "İsmail Yılmaz" }
      )

      // Nedensiz TESLIM_EDILEMEDI reddedilmeli
      await expectDomainError(
        () =>
          driverUpdateTripOrStopExecution(
            { stopId: reassignedStopId, status: "TESLIM_EDILEMEDI" },
            { userId: "usr-drv-09" }
          ),
        "VALIDATION_ERROR",
        "Nedensiz teslim edilemedi"
      )

      // e-POD ile gerçek teslimat & checksum
      const podRes = await submitStopDeliveryProof(
        {
          stopId: reassignedStopId,
          captureMethod: "IMZA_CIZIM",
          recipientName: "Ayşe Test",
          recipientRelation: "RESEPSIYON",
          signatureUrlOrDataUrl: TEST_POD_IMG_BASE64,
          photoUrlsOrDataUrls: [TEST_POD_IMG_BASE64],
          capturedLat: 41.001,
          capturedLng: 29.002,
        },
        { userId: "usr-drv-09", username: "İsmail Yılmaz" }
      )
      assert.equal(podRes.stop.status, "TESLIM_EDILDI")
      assert.ok(podRes.proof.checksumSha256 && podRes.proof.checksumSha256.length === 64)
      if (podRes.proof.signatureFileUrl) {
        createdStorageFiles.push(podRes.proof.signatureFileUrl)
      }
      const photos = JSON.parse(podRes.proof.photoFileUrlsJson || "[]")
      for (const u of photos) createdStorageFiles.push(u)
    })

    // 10. Müşteri Takip Portalı Güvenliği (/takip/[token] — Aktif / 404 / 410 / Token Döndürme)
    await step("Müşteri takip güvenliği: CSPRNG token 200 & PII maskeleme, bilinmeyen 404, süresi dolmuş 410 & rotation", async () => {
      const activeStop = await (prisma as any).lojistikShipmentStop.findUnique({ where: { id: "f6-stop-03" } })
      assert.ok(activeStop?.trackingToken && activeStop.trackingToken.length >= 32)
      const okTrack = await getPublicCustomerTrackingByToken(activeStop.trackingToken)
      assert.equal(okTrack.found, true)
      assert.equal(okTrack.expired, false)
      assert.equal(okTrack.tracking?.driverShortName, "Cemal K.", "Şoför soyadı maskelenmelidir.")

      const missingTrack = await getPublicCustomerTrackingByToken("gecersiz-rastgele-token-0000")
      assert.equal(missingTrack.found, false)

      const expStop = await (prisma as any).lojistikShipmentStop.findUnique({ where: { id: "f6-stop-11" } })
      const expTrack = await getPublicCustomerTrackingByToken(expStop.trackingToken)
      assert.equal(expTrack.found, true)
      assert.equal(expTrack.expired, true)

      const rotated = await extendOrRotateTrackingLink(
        { stopId: "f6-stop-03", extendHours: 48, regenerateToken: true },
        { userId: "usr-admin-01" }
      )
      assert.notEqual(rotated.trackingToken, activeStop.trackingToken)
      assert.equal((await getPublicCustomerTrackingByToken(activeStop.trackingToken)).found, false)
      assert.equal((await getPublicCustomerTrackingByToken(rotated.trackingToken)).expired, false)
    })

    // 11. Gerçek Kayıt Tabanlı KPI Doğrulaması & Seed Güvenlik Kilidi
    await step("KPI hesaplaması (DB kayıtlarından) & DISABLE_DEMO_MODE=true demo seed kilidi", async () => {
      const ov = await listDispatchOverviewAndReadyPool()
      const allStops = ov.trips.flatMap((t: any) => t.stops || [])
      const kpis = computeDispatchKpis(ov.trips, allStops)
      assert.ok(kpis.totalTrips >= 4)
      assert.ok(ov.kpis.eWaybillIssuedTrips >= 3)
      assert.ok(ov.kpis.podCapturedStops >= 4)
      assert.ok(kpis.optimizationSavedKm > 0)

      process.env.DISABLE_DEMO_MODE = "true"
      assert.throws(
        () => assertLogisticsDemoSeedAllowed(),
        (err: any) => err instanceof LogisticsSeedEnvironmentError
      )
      delete process.env.DISABLE_DEMO_MODE
    })
  } finally {
    // Test sırasında diske yazılan geçici POD görsellerini temizle
    const podDir = path.join(process.cwd(), "storage", "logistics-pods")
    if (fs.existsSync(podDir)) {
      for (const file of fs.readdirSync(podDir)) {
        if (file.startsWith("pods-")) {
          fs.rmSync(path.join(podDir, file), { force: true })
        }
      }
    }

    // Ortam değişkenlerini geri yükle
    for (const [k, v] of Object.entries(savedEnv)) {
      if (v === undefined) delete process.env[k]
      else process.env[k] = v
    }

    // Veritabanı ve sistem yapılandırmasını bayt düzeyinde geri yükle
    if (snapshotRaw !== null) fs.writeFileSync(DB_PATH, snapshotRaw)
    if (sysCfgRaw !== null) fs.writeFileSync(SYS_CFG_PATH, sysCfgRaw)
  }

  console.log(`\n🎉 FAZ 6 DOĞRULAMA PAKETİ TAMAMLANDI (${passed}/${passed})`)
}

runSuite()
  .catch((err) => {
    console.error("❌ FAZ 6 TEST HATASI:", err)
    process.exit(1)
  })
  .then(() => process.exit(0))
