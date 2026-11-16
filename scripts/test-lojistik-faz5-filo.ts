/**
 * Lojistik Faz 5 (lojistik_filo — Bağımsız Filo, Araç, Şoför, KVKK, Evrak/Ceza,
 * Bağımsız Filo Bakım/Lastik, Yakıt/Kart Mutabakatı, TCO, CO2 & Deklaratif Telematik)
 * Kapsamlı Otomatik Doğrulama Paketi
 *
 * Çalıştırma:
 *   npx cross-env SUNUM_DISABLE_CRON=1 npx tsx scripts/test-lojistik-faz5-filo.ts
 */

process.env.SUNUM_DISABLE_CRON = "1"

import assert from "node:assert/strict"
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
import {
  assertLogisticsFeatureEnabled,
  LogisticsDomainError,
} from "@/lib/logistics/security"
import type { LogisticsScopeContext } from "@/lib/logistics/types"
import {
  maskTckn,
  applyDriverKvkkMasking,
  evaluateExpiryStatus,
  evaluateFleetMaintenanceDue,
  analyzeVehicleFuelLogs,
  computeVehicleTco,
  computeEcoDrivingScore,
  estimateCo2EmissionsFromFactor,
  OFFICIAL_TELEMATICS_PROFILES,
  normalizePayloadWithProfile,
  listFleetVehicles,
  listFleetDrivers,
  getDriverDetailWithKvkkLog,
  evaluateAndDispatchFleetExpiryAlerts,
  listFleetMaintenanceOverview,
  createFleetWorkOrder,
  recordFleetWorkOrderSparePart,
  updateFleetWorkOrderStatus,
  recordFuelLogEntry,
  importFuelCardInvoices,
  listCo2EmissionFactors,
  upsertCo2EmissionFactor,
  getFleetTcoAndEfficiencyReport,
  getConfiguredTelematicsSecret,
  signTelematicsWebhookPayload,
  verifyTelematicsWebhookAuth,
  ingestTelematicsPayloads,
  upsertVehicleTelematicMapping,
} from "@/lib/logistics/fleet"
import {
  LogisticsSeedEnvironmentError,
  assertLogisticsDemoSeedAllowed,
} from "@/lib/logistics/seed/framework"
import {
  rollbackAllLogisticsDemoSeeds,
  runAllLogisticsDemoSeeds,
} from "@/lib/logistics/seed"

const DB_PATH = path.join(process.cwd(), "storage", "ajans-kutuphanesi", ".local-db.json")
const SYS_CFG_PATH = path.join(process.cwd(), "storage", "ajans-kutuphanesi", "system_config.json")

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
    FEATURE_LOJISTIK_FILO: process.env.FEATURE_LOJISTIK_FILO,
    FEATURE_LOJISTIK_ALL: process.env.FEATURE_LOJISTIK_ALL,
    FEATURE_URETIM_BAKIM: process.env.FEATURE_URETIM_BAKIM,
    FEATURE_URETIM_ALL: process.env.FEATURE_URETIM_ALL,
    LOJISTIK_TELEMATICS_SECRET: process.env.LOJISTIK_TELEMATICS_SECRET,
  }

  let passed = 0
  const check = async (name: string, fn: () => Promise<void> | void) => {
    await fn()
    passed++
    console.log(`✅ [${passed}] ${name}`)
  }

  try {
    // 1. Additive Migration & Rollback Bütünlüğü
    await check("Faz 1–5 SQL Migration & Rollback bütünlüğü", () => {
      const results = validateAllLogisticsMigrations()
      assert.equal(results.length, 5, "Tam 5 lojistik migration bekleniyordu.")
      for (const r of results) {
        assert.equal(r.valid, true, `Migration '${r.migrationName}' geçersiz: ${r.errors.join("; ")}`)
      }
      const faz5 = results.find((r) => r.migrationName.includes("faz5"))
      assert.ok(faz5, "Faz 5 migration dizini bulunamadı.")
      assert.equal(faz5!.addedTables.length, 17, "Faz 5'te 17 yeni Lojistik* tablosu bekleniyordu.")
      assert.equal(faz5!.rollbackTables.length, 17, "Faz 5 rollback'te 17 DROP TABLE bekleniyordu.")
    })

    // 2. Demo Seed İdempotency, Rollback & Veri Zenginliği
    await check("Faz 5 Demo Seed: İdempotency, Tam Rollback & Veri Zenginliği (18 araç, 15 şoför, 48s telematik, DESNZ 2026)", async () => {
      const r1 = await runAllLogisticsDemoSeeds({ createBackup: false })
      const f5Step1 = r1.modulesExecuted.find((s) => s.moduleKey === "faz5_filo_ve_telematik")
      assert.ok(f5Step1, "faz5_filo_ve_telematik seed adımı bulunamadı.")

      const r2 = await runAllLogisticsDemoSeeds({ createBackup: false })
      const f5Step2 = r2.modulesExecuted.find((s) => s.moduleKey === "faz5_filo_ve_telematik")
      assert.ok(f5Step2, "İkinci seed çalışmasında Faz 5 adımı bulunamadı.")
      const totalReinserted = Object.values(f5Step2!.inserted).reduce((a, b) => a + b, 0)
      assert.equal(totalReinserted, 0, "İdempotent seed ikinci çalışmada yeni kayıt eklememeliydi.")

      const dbAny = prisma as any
      const [vehicles, drivers, fuelLogs, events, co2] = await Promise.all([
        dbAny.lojistikVehicle.findMany(),
        dbAny.lojistikDriver.findMany(),
        dbAny.lojistikFuelLog.findMany(),
        dbAny.lojistikTelemetryEvent.findMany(),
        dbAny.lojistikCo2EmissionFactor.findMany(),
      ])
      assert.ok(vehicles.length >= 18, `En az 18 araç bekleniyordu, bulunan: ${vehicles.length}`)
      assert.ok(drivers.length >= 15, `En az 15 şoför bekleniyordu, bulunan: ${drivers.length}`)
      assert.ok(fuelLogs.some((l: any) => l.isAnomaly), "Anormal yakıt tüketimi kaydı bekleniyordu.")
      assert.ok(events.length >= 48, `En az 48 telematik olayı bekleniyordu, bulunan: ${events.length}`)
      assert.ok(co2.length >= 4 && co2.every((f: any) => f.sourceYear === 2026), "DESNZ 2026 CO2 katsayıları eksik.")

      // Mevcut transfer ve e-İrsaliye plakaları korunuyor mu?
      const plates = new Set(vehicles.map((v: any) => v.plate))
      assert.ok(plates.has("34 SNR 808") && plates.has("34 LJS 402") && plates.has("34 SNR 720"))

      // Rollback temizliği + tekrar seed
      rollbackAllLogisticsDemoSeeds({ createSafetyBackup: false })
      const afterRbVeh = await dbAny.lojistikVehicle.findMany()
      assert.equal(afterRbVeh.filter((v: any) => String(v.id).startsWith("f5-")).length, 0, "Rollback sonrası f5-* araç kalmamalı.")
      await runAllLogisticsDemoSeeds({ createBackup: false })
    })

    // 3. Modül Bağımsızlığı (uretim_bakim=false iken lojistik_filo TAM ÇALIŞIR)
    await check("Modül Bağımsızlığı: uretim_bakim=false iken lojistik_filo tüm bakım/yedek parça işlevleri tam çalışır; lojistik_filo=false iken 403", async () => {
      process.env.FEATURE_URETIM_BAKIM = "false"
      process.env.FEATURE_URETIM_ALL = "false"
      process.env.DISABLE_DEMO_MODE = "true"
      process.env.FEATURE_LOJISTIK_FILO = "true"

      // Filo bakım ekranları ve yazma işlemleri uretim_bakim kapalıyken sorunsuz çalışmalı
      assertLogisticsFeatureEnabled("lojistik_filo")
      const flags = resolveLogisticsFeatureFlags({ lojistik_filo: true }, null, false)
      assert.equal(flags.lojistik_filo, true)
      assert.equal(isLogisticsFleetMenuVisible({ lojistik_filo: true }, null, ["/dashboard/filo"], false), true)

      const maintOverview = await listFleetMaintenanceOverview()
      assert.ok(maintOverview.workOrders.length >= 12, "Filo iş emirleri listelenebilmeli.")
      const preUretimWoCount = await (prisma as any).uretimMaintenanceWorkOrder.findMany().then((r: any[]) => r.length).catch(() => 0)

      const newWo = await createFleetWorkOrder(
        {
          vehicleId: "f5-veh-01",
          orderType: "PREVENTIVE",
          title: "Bağımsızlık Testi Periyodik Bakım",
          priority: "MEDIUM",
        },
        { userId: "local-debug-user" }
      )
      assert.ok(newWo.id, "Yeni filo iş emri oluşturulabilmeli.")

      // InventoryItem yedek parça çıkışı + maliyet yansıması (Uretim* dokunulmadan)
      const spareRes = await recordFleetWorkOrderSparePart({
        workOrderId: newWo.id,
        itemId: "item-sng-04",
        quantityUsed: 1,
        warehouseId: "wh-merkez-01",
        unitCostOverride: 500,
        actorUserId: "local-debug-user",
      })
      assert.ok(spareRes.stockMovementId, "Stok hareket kaydı oluşmalı.")
      assert.ok(spareRes.part.totalCostTry > 0, "Yedek parça maliyeti > 0 olmalı.")

      await expectDomainError(
        () =>
          updateFleetWorkOrderStatus({
            workOrderId: newWo.id,
            nextStatus: "COMPLETED",
            actorUserId: "local-debug-user",
          }),
        "CONFLICT",
        "REQUESTED -> COMPLETED atlamalı geçiş engeli"
      )

      await updateFleetWorkOrderStatus({
        workOrderId: newWo.id,
        nextStatus: "IN_PROGRESS",
        actorUserId: "local-debug-user",
      })

      const closedWo = await updateFleetWorkOrderStatus({
        workOrderId: newWo.id,
        nextStatus: "COMPLETED",
        downtimeMinutes: 45,
        laborHours: 1.5,
        hourlyRateTry: 400,
        postToFinance: true,
        actorUserId: "local-debug-user",
      })
      assert.equal(closedWo.status, "COMPLETED")
      assert.equal(closedWo.totalCostTry, Number((spareRes.sparePartCostTry + 600).toFixed(2)))

      const postUretimWoCount = await (prisma as any).uretimMaintenanceWorkOrder.findMany().then((r: any[]) => r.length).catch(() => 0)
      assert.equal(postUretimWoCount, preUretimWoCount, "Filo bakımı UretimMaintenanceWorkOrder tablosuna dokunmamalı.")

      // lojistik_filo kapalıysa sert blok
      process.env.FEATURE_LOJISTIK_FILO = "false"
      assert.equal(isLogisticsFeatureEnabled("lojistik_filo", { lojistik_filo: false }, null, false), false)
      await expectDomainError(async () => {
        assertLogisticsFeatureEnabled("lojistik_filo")
      }, "FEATURE_DISABLED", "lojistik_filo=false bayrak engeli")

      // Env sıfırla
      process.env.DISABLE_DEMO_MODE = savedEnv.DISABLE_DEMO_MODE
      process.env.FEATURE_LOJISTIK_FILO = savedEnv.FEATURE_LOJISTIK_FILO
      process.env.FEATURE_URETIM_BAKIM = savedEnv.FEATURE_URETIM_BAKIM
      process.env.FEATURE_URETIM_ALL = savedEnv.FEATURE_URETIM_ALL
    })

    // 4. Saf Yardımcılar: KVKK, Evrak Süreleri, Bakım Eşiği, Yakıt Anormalliği, TCO, CO2, Eco
    await check("Saf yardımcılar: KVKK maskeleme, evrak/bakım süresi, L/100km & kart farkı, TCO, Eco-Driving & DESNZ 2026 CO2", () => {
      assert.equal(maskTckn("19283746510"), "192*****510")
      const drvRes = applyDriverKvkkMasking({
        id: "d1",
        fullName: "Kemal Öztürk",
        tckn: "19283746510",
        phone: "+90 533 612 73 40",
        homeAddress: "Levent Cad No 9",
        licenseNumber: "TR-IST-550912",
      }, false)
      assert.notEqual(drvRes.driver.tckn, "19283746510")
      assert.ok(drvRes.maskedFields.includes("tckn"))

      const expPast = evaluateExpiryStatus(new Date(Date.now() - 5 * 86_400_000), 30)
      const expSoon = evaluateExpiryStatus(new Date(Date.now() + 10 * 86_400_000), 30)
      assert.equal(expPast.status, "EXPIRED")
      assert.equal(expSoon.status, "EXPIRING_SOON")

      const maintDue = evaluateFleetMaintenanceDue(
        { planType: "METER_KM", frequencyKm: 15000, lastTriggeredKm: 75000 },
        91500,
        2100
      )
      assert.equal(maintDue.isDue, true)

      const fuelEval = analyzeVehicleFuelLogs(
        "v1",
        [
          { vehicleId: "v1", fuelDate: "2026-10-01", odometerKm: 10000, liters: 60, totalAmountTry: 2700, fullTank: true, invoiceLiters: 60 },
          { vehicleId: "v1", fuelDate: "2026-10-15", odometerKm: 11000, liters: 120, totalAmountTry: 5400, fullTank: true, invoiceLiters: 120 },
          { vehicleId: "v1", fuelDate: "2026-11-01", odometerKm: 12000, liters: 280, totalAmountTry: 12600, fullTank: true, invoiceLiters: 300 },
        ],
        12.0
      )
      assert.ok(fuelEval.anomalyCount >= 1, "28 L/100km sıçraması anomali olarak tespit edilmeli.")
      assert.equal(fuelEval.literVariance, 20, "20L fatura farkı tespit edilmeli.")
      assert.equal(fuelEval.reconciliationStatus, "VARIANCE_WARNING", ">%3 fatura farkı uyuşmazlık uyarısı vermeli.")

      const tco = computeVehicleTco({
        fuelCostTry: 12000,
        maintenanceCostTry: 4000,
        leaseDepreciationTry: 20000,
        driverCostTry: 35000,
        penaltyCostTry: 1500,
        insuranceTaxTry: 2500,
      }, 5000)
      assert.equal(tco.totalCostTry, 75000)
      assert.equal(tco.costPerKmTry, 15)

      const eco = computeEcoDrivingScore({
        idleMinutes: 90,
        speedViolationCount: 3,
        harshBrakeCount: 2,
        harshAccelCount: 1,
        distanceKm: 1000,
      })
      assert.ok(eco.score < 90 && eco.score >= 0)

      const co2 = estimateCo2EmissionsFromFactor(100, {
        fuelType: "DIESEL",
        unit: "L",
        kgCo2ePerUnit: 2.58354,
        sourceName: "UK DESNZ / DEFRA 2026",
        sourceYear: 2026,
      })
      assert.equal(co2.totalKgCo2e, 258.35)
    })

    // 5. Evrak / Ehliyet / SRC / Psikoteknik / Bakım Uyarıları & Notification Tetikleme
    await check("Evrak, ehliyet, SRC, psikoteknik & bakım eşiği uyarıları + createNotificationMany entegrasyonu", async () => {
      const res = await evaluateAndDispatchFleetExpiryAlerts({
        dispatchNotifications: true,
        recipientUserId: "local-debug-user",
      })
      assert.ok(res.totalAlerts >= 5, `En az 5 filo uyum/süre uyarısı bekleniyordu, bulunan: ${res.totalAlerts}`)
      assert.ok(res.expiredCount >= 2, "Süresi dolmuş evrak/psikoteknik uyarısı bekleniyordu.")
      assert.ok(res.notificationsSent >= 1, "Notification tablosuna en az 1 yeni uyarı gönderilmeli.")
    })

    // 6. KVKK Yetki Reddi, Maskeli Varsayılan Okuma & Açık Okuma Audit Logları
    await check("KVKK PII Erişim Kontrolü: Yetkisiz ret (KVKK_PII_DENIED) + Yetkili açık görüntüleme (KVKK_PII_UNMASKED_DETAIL)", async () => {
      const restrictedScope: LogisticsScopeContext = {
        userId: "user-copywriter",
        username: "cem.aslan",
        branchId: "local-debug-branch",
        roles: ["USER"],
        isSuperAdmin: false,
        isPlatformDeveloper: false,
        isSupplierScoped: false,
        supplierId: null,
      }
      const hrAdminScope: LogisticsScopeContext = {
        userId: "user-admin",
        username: "admin",
        branchId: "local-debug-branch",
        roles: ["ADMIN"],
        isSuperAdmin: true,
        isPlatformDeveloper: false,
        isSupplierScoped: false,
        supplierId: null,
      }

      // Maskeli okuma herkes için güvenli
      const maskedList = await listFleetDrivers({ scope: restrictedScope, revealSensitivePii: false })
      const drv03Masked = maskedList.drivers.find((d: any) => d.id === "f5-drv-03")
      assert.ok(drv03Masked && drv03Masked.tckn !== "19283746510", "Varsayılan okuma TCKN'yi maskelemelidir.")

      // Yetkisiz açık okuma reddi + audit log
      await expectDomainError(
        () => getDriverDetailWithKvkkLog("f5-drv-03", restrictedScope, true),
        "FORBIDDEN",
        "Yetkisiz kullanıcı açık KVKK PII talebi"
      )

      // Yetkili açık okuma + audit log
      const unmaskedDetail = await getDriverDetailWithKvkkLog("f5-drv-03", hrAdminScope, true)
      assert.equal(unmaskedDetail.tckn, "19283746510", "Yetkili kullanıcı açık TCKN görebilmeli.")

      const logs = await (prisma as any).auditLog.findMany()
      assert.ok(logs.some((l: any) => l.action === "KVKK_PII_DENIED"), "KVKK_PII_DENIED audit log yazılmalı.")
      assert.ok(logs.some((l: any) => l.action === "KVKK_PII_UNMASKED_DETAIL"), "KVKK_PII_UNMASKED_DETAIL audit log yazılmalı.")
    })

    // 7. Yakıt Kaydı, Kart İçe Aktarma & Anormallik Tespiti
    await check("Yakıt yönetimi: Yeni dolum kaydetme, kart ekstresi CSV mutabakatı & anormallik bayrağı", async () => {
      const createdFuel = await recordFuelLogEntry(
        {
          vehicleId: "f5-veh-06",
          fuelDate: new Date().toISOString(),
          odometerKm: 59300,
          liters: 260,
          unitPriceTry: 45.2,
          invoiceRef: "PO-TEST-991",
          invoiceLiters: 260,
          invoiceAmountTry: 260 * 45.2,
        },
        { userId: "local-debug-user", branchId: "branch-izmir" }
      )
      assert.equal(createdFuel.isAnomaly, true, "1000km'de 260L (26 L/100km) anormallik olarak bayraklanmalı.")

      const imp = await importFuelCardInvoices(
        [{ plate: "35 IZM 309", invoiceRef: "PO-TEST-991", invoiceLiters: 272, invoiceAmountTry: 12294.4 }],
        { userId: "local-debug-user", branchId: "branch-izmir" }
      )
      assert.equal(imp.reconciled, 1, "Mevcut PO-TEST-991 faturasıyla mutabakat yapılmalı.")
    })

    // 8. Deklaratif Telematik Profilleri (Resmî Doküman Örnek Payloadları) + Idempotency + Backfill + Fiyat Yasağı
    await check("Deklaratif telematik profilleri (Traccar, flespi, GpsGate, Generic), idempotency, backfill koruması ve sıfır fiyat bilgisi", async () => {
      // Fiyat bilgisi yasağı
      const profileJson = JSON.stringify(OFFICIAL_TELEMATICS_PROFILES)
      assert.equal(/pricing|priceUsd|monthlyFee|subscriptionFee|\$\d/i.test(profileJson), false, "Profillerde fiyat bilgisi bulunmamalı.")

      // Traccar (/api/positions & events resmi biçimi)
      const traccarNorm = normalizePayloadWithProfile("TRACCAR", {
        id: 981234,
        deviceId: "traccar-dev-808",
        type: "deviceOverspeed",
        fixTime: "2026-11-16T11:30:00Z",
        latitude: 40.7911,
        longitude: 29.4955,
        speed: 98.4,
        course: 112,
        attributes: { ignition: true, odometer: 84265000, temp1: 3.5 },
      })
      assert.equal(traccarNorm.eventType, "SPEED_VIOLATION")
      assert.equal(traccarNorm.odometerKm, 84265)
      assert.equal(traccarNorm.lat, 40.7911)

      // flespi (message resmi biçimi: unix timestamp seconds + dotted keys)
      const flespiNorm = normalizePayloadWithProfile("FLESPI", {
        ident: "flespi-402",
        "message.id": "fls-9001",
        "event.type": "harsh_braking",
        timestamp: 1794828600,
        "position.latitude": 40.9801,
        "position.longitude": 29.1302,
        "position.speed": 21,
        "engine.ignition.status": true,
        "vehicle.mileage": 112412,
      })
      assert.equal(flespiNorm.eventType, "HARSH_BRAKE")
      assert.equal(flespiNorm.odometerKm, 112412)
      assert.equal(flespiNorm.ignitionOn, true)

      // GpsGate Cloud (/status resmi biçimi)
      const gpsgateNorm = normalizePayloadWithProfile("GPSGATE_CLOUD", {
        userId: "gpsgate-412",
        eventType: "Idling",
        trackPoint: {
          id: "gg-77",
          utcTimestamp: "2026-11-16T12:00:00Z",
          position: { latitude: 41.0091, longitude: 29.1512 },
          velocity: { groundSpeed: 0, heading: 90 },
          variables: { engineOn: true, odometer: 93410, fuelLevel: 44 },
        },
      })
      assert.equal(gpsgateNorm.eventType, "IDLE_ALERT")
      assert.equal(gpsgateNorm.odometerKm, 93410)

      // Özel alan eşlemeli Generic Webhook
      const genericNorm = normalizePayloadWithProfile(
        "GENERIC_WEBHOOK",
        {
          imei: "TR-8899",
          aracPlaka: "34 SNR 640",
          tarih: "2026-11-16T12:15:00Z",
          konum: { enlem: 41.0511, boylam: 29.0702 },
          hizKm: 55,
          sicaklikC: 7.9,
        },
        {
          deviceIdPaths: ["imei"],
          platePaths: ["aracPlaka"],
          timestampPaths: ["tarih"],
          timestampFormat: "ISO",
          latPaths: ["konum.enlem"],
          lngPaths: ["konum.boylam"],
          speedPaths: ["hizKm"],
          temperaturePaths: ["sicaklikC"],
        }
      )
      assert.equal(genericNorm.lat, 41.0511)
      assert.equal(genericNorm.temperatureC, 7.9)

      // Eşleme, Idempotency ve Sıra Dışı Backfill Koruması (eski olay mevcut canlı konumu ezmemeli!)
      await upsertVehicleTelematicMapping({
        vehicleId: "f5-veh-16",
        providerCode: "GENERIC_WEBHOOK",
        externalDeviceId: "TR-8899",
        actorUserId: "local-debug-user",
      })

      const newerTime = new Date(Date.now() - 2 * 60_000).toISOString()
      const olderTime = new Date(Date.now() - 3 * 3600_000).toISOString()

      const res1 = await ingestTelematicsPayloads({
        providerCode: "TRACCAR",
        payloads: [{ id: "idem-1", deviceId: "traccar-dev-808", fixTime: newerTime, latitude: 40.8123, longitude: 29.5566, speed: 74, attributes: { odometer: 84270000 } }],
        sourceOrigin: "WEBHOOK",
      })
      assert.equal(res1.acceptedCount, 1)

      // Aynı payload tekrar -> DUPLICATE
      const resDup = await ingestTelematicsPayloads({
        providerCode: "TRACCAR",
        payloads: [{ id: "idem-1", deviceId: "traccar-dev-808", fixTime: newerTime, latitude: 40.8123, longitude: 29.5566, speed: 74 }],
        sourceOrigin: "WEBHOOK",
      })
      assert.equal(resDup.duplicateCount, 1)

      // Geçmişe dönük (bağlantı kopukluğu backfill) eski koordinat
      const resBackfill = await ingestTelematicsPayloads({
        providerCode: "TRACCAR",
        payloads: [{ id: "idem-backfill-0", deviceId: "traccar-dev-808", fixTime: olderTime, latitude: 40.5000, longitude: 29.1000, speed: 50 }],
        sourceOrigin: "WEBHOOK",
      })
      assert.equal(resBackfill.backfillCount, 1, "Eski zaman damgalı olay isBackfill olarak işaretlenmeli.")

      const updatedVeh = await (prisma as any).lojistikVehicle.findUnique({ where: { id: "f5-veh-01" } })
      assert.equal(updatedVeh.currentLat, 40.8123, "Backfill olayı aracın daha yeni canlı konumunu ezmemelidir.")

      // Webhook HMAC imza doğrulama + Demo OFF fail-closed
      const bodyStr = JSON.stringify({ test: true })
      const secret = getConfiguredTelematicsSecret("TRACCAR")
      const sig = signTelematicsWebhookPayload(bodyStr, secret)
      assert.equal(
        verifyTelematicsWebhookAuth({
          providerCode: "TRACCAR",
          rawBody: bodyStr,
          headers: new Headers({ "x-telematics-signature": sig }),
        }).verified,
        true
      )
      assert.equal(
        verifyTelematicsWebhookAuth({
          providerCode: "TRACCAR",
          rawBody: bodyStr,
          headers: new Headers({ "x-telematics-signature": "sha256=deadbeef" }),
        }).verified,
        false
      )

      process.env.DISABLE_DEMO_MODE = "true"
      delete process.env.LOJISTIK_TELEMATICS_SECRET
      assert.equal(getConfiguredTelematicsSecret("TRACCAR"), "", "Demo OFF iken varsayılan demo secret dönülmemeli.")
      process.env.DISABLE_DEMO_MODE = savedEnv.DISABLE_DEMO_MODE
    })

    // 9. TCO & Yapılandırılabilir CO2 Faktör Güncelleme Testi
    await check("TCO (km başı maliyet) ve yapılandırılabilir CO2 katsayısı dinamik hesaplama", async () => {
      const beforeTco = await getFleetTcoAndEfficiencyReport()
      assert.ok(beforeTco.summary.totalVehiclesEvaluated >= 18)
      assert.ok(beforeTco.summary.totalEstimatedCo2Kg > 0)
      assert.ok(beforeTco.co2DisclaimerNote.includes("DESNZ/DEFRA"), "Yasal dipnot raporda bulunmalı.")

      const initialFactors = await listCo2EmissionFactors()
      assert.ok(initialFactors.length >= 4)

      await upsertCo2EmissionFactor(
        {
          fuelType: "DIESEL",
          unit: "L",
          kgCo2ePerUnit: 2.6,
          sourceName: "Güncellenmiş Özel Test Katsayısı",
          sourceYear: 2026,
          sourceVersion: "Test",
        },
        { userId: "local-debug-user" }
      )
      const afterTco = await getFleetTcoAndEfficiencyReport()
      assert.notEqual(
        afterTco.summary.totalEstimatedCo2Kg,
        beforeTco.summary.totalEstimatedCo2Kg,
        "Katsayı değiştirildiğinde toplam tahmini CO2 hemen güncellenmeli."
      )
    })

    // 10. Üretim Dışı Ortam Seed Kilidi
    await check("Güvenlik kilidi: Demo dışı ortamda Faz 5 seed çalıştırılamaz", () => {
      process.env.DISABLE_DEMO_MODE = "true"
      assert.equal(isDemoEnvironment(), false)
      assert.throws(() => assertLogisticsDemoSeedAllowed(), LogisticsSeedEnvironmentError)
      process.env.DISABLE_DEMO_MODE = savedEnv.DISABLE_DEMO_MODE
    })

    console.log(`\n🎉 TÜM FAZ 5 TESTLERİ BAŞARIYLA GEÇTİ (${passed}/${passed})!`)
  } finally {
    process.env.DISABLE_DEMO_MODE = savedEnv.DISABLE_DEMO_MODE
    process.env.ENABLE_DEMO_MODE = savedEnv.ENABLE_DEMO_MODE
    process.env.FEATURE_LOJISTIK_FILO = savedEnv.FEATURE_LOJISTIK_FILO
    process.env.FEATURE_LOJISTIK_ALL = savedEnv.FEATURE_LOJISTIK_ALL
    process.env.FEATURE_URETIM_BAKIM = savedEnv.FEATURE_URETIM_BAKIM
    process.env.FEATURE_URETIM_ALL = savedEnv.FEATURE_URETIM_ALL
    process.env.LOJISTIK_TELEMATICS_SECRET = savedEnv.LOJISTIK_TELEMATICS_SECRET

    if (snapshotRaw) fs.writeFileSync(DB_PATH, snapshotRaw)
    if (sysCfgRaw) fs.writeFileSync(SYS_CFG_PATH, sysCfgRaw)
  }
}

runSuite()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error("❌ Faz 5 Test Hatası:", err)
    process.exit(1)
  })
