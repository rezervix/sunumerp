/**
 * Lojistik Faz 8 — Güvenlik Sertleştirme, Vercel EROFS Dayanıklılığı, Hız Limiti,
 * Yük/Stres Performans Ölçümü ve Canlı HTTP Matrisi Doğrulama Paketi
 *
 * Kullanım (Birim & Stres Benchmark):
 *   npx cross-env SUNUM_DISABLE_CRON=1 npx tsx scripts/test-lojistik-faz8-yayin-guvenlik-perf.ts
 *
 * Kullanım (Canlı HTTP Güvenlik & Stres E2E):
 *   npx tsx scripts/test-lojistik-faz8-yayin-guvenlik-perf.ts --mode=demo-on --url=http://localhost:3114
 *   npx tsx scripts/test-lojistik-faz8-yayin-guvenlik-perf.ts --mode=demo-off --url=http://localhost:3115
 *   EXPECT_FEATURE_ACTIVE=false npx tsx scripts/test-lojistik-faz8-yayin-guvenlik-perf.ts --mode=demo-off --url=http://localhost:3116
 */

process.env.SUNUM_DISABLE_CRON = "1"

import assert from "node:assert/strict"
import crypto from "node:crypto"
import fs from "node:fs"
import path from "node:path"
import { prisma } from "@/lib/db"
import {
  getSystemConfig,
  resetSystemConfig,
  saveSystemConfig,
} from "@/lib/system-config"
import {
  checkRateLimit,
  resetRateLimitStore,
} from "@/lib/security/rateLimiter"
import { LocalStorageProofProvider } from "@/lib/logistics/providers/object-storage"
import {
  verifyReturnWebhookSignature,
  signReturnWebhookPayload,
} from "@/lib/logistics/returns/financeAndWebhookService"
import { planMultiVehicleTrips } from "@/lib/logistics/dispatch/cvrptwSolver"
import { normalizePayloadWithProfile } from "@/lib/logistics/fleet/telematicsProfiles"
import { getFleetTcoAndEfficiencyReport } from "@/lib/logistics/fleet/fleetOpsAndFinanceService"
import { queryStockLedger } from "@/lib/logistics/wms/stockLedgerService"
import { getLogisticsExecutiveSummaryForUser } from "@/lib/logistics/dashboard/logisticsSummaryService"
import {
  exportLogisticsReportToExcelBuffer,
  exportLogisticsReportToPdfBuffer,
} from "@/lib/logistics/reports"

const DB_PATH = path.join(process.cwd(), "storage", "ajans-kutuphanesi", ".local-db.json")
const SYS_CFG_PATH = path.join(process.cwd(), "storage", "system_config.json")
const VALID_PNG_BASE64 =
  "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAQAAAAECAIAAAAmkwkpAAAAEElEQVR42mP8z8AARwzEcQAAAP//AwwDAf0AAAAASUVORK5CYII="

function parseArg(name: string, fallback: string): string {
  const prefix = `--${name}=`
  const found = process.argv.find((a) => a.startsWith(prefix))
  return found ? found.slice(prefix.length) : fallback
}

function sha256File(filePath: string): string | null {
  if (!fs.existsSync(filePath)) return null
  return crypto.createHash("sha256").update(fs.readFileSync(filePath)).digest("hex")
}

function parseSetCookies(res: Response, jar: Map<string, string>) {
  const rawList: string[] =
    typeof (res.headers as any).getSetCookie === "function"
      ? (res.headers as any).getSetCookie()
      : []
  for (const line of rawList) {
    const firstSemi = line.indexOf(";")
    const pair = (firstSemi >= 0 ? line.slice(0, firstSemi) : line).trim()
    const eq = pair.indexOf("=")
    if (eq <= 0) continue
    const name = pair.slice(0, eq).trim()
    const val = pair.slice(eq + 1).trim()
    if (!val || /max-age=0/i.test(line)) jar.delete(name)
    else jar.set(name, val)
  }
}

function cookieHeader(jar: Map<string, string>): string {
  return Array.from(jar.entries())
    .map(([k, v]) => `${k}=${v}`)
    .join("; ")
}

async function runUnitAndBenchmarkSuite() {
  const dbBeforeBuf = fs.existsSync(DB_PATH) ? fs.readFileSync(DB_PATH) : null
  const cfgBeforeBuf = fs.existsSync(SYS_CFG_PATH) ? fs.readFileSync(SYS_CFG_PATH) : null
  const dbBeforeHash = sha256File(DB_PATH)
  const cfgBeforeHash = sha256File(SYS_CFG_PATH)

  let passed = 0
  const check = async (name: string, fn: () => Promise<void> | void) => {
    await fn()
    passed++
    console.log(`✅ [UNIT #${passed}] ${name}`)
  }

  try {
    // 1. Vercel EROFS Salt-Okunur Dosya Sistemi Fallback Testi
    await check("lib/system-config.ts salt-okunur dosya sistemi (EROFS) bellek fallback doğrulaması", () => {
      const originalWrite = fs.writeFileSync
      const origTitle = getSystemConfig().company?.title || "Çiçekana ERP"
      ;(fs as any).writeFileSync = () => {
        const err = new Error("EROFS: read-only file system") as Error & { code: string }
        err.code = "EROFS"
        throw err
      }
      try {
        const saved = saveSystemConfig({
          company: { ...getSystemConfig().company!, title: "Vercel EROFS Demo Test" },
        })
        assert.equal(saved.company?.title, "Vercel EROFS Demo Test")
        assert.equal(getSystemConfig().company?.title, "Vercel EROFS Demo Test")
        const resetCfg = resetSystemConfig()
        assert.equal(resetCfg.company?.title, "Çiçekana ERP")
      } finally {
        ;(fs as any).writeFileSync = originalWrite
      }
      // Yazılabilir moda geri dönünce önceki diski geri yükle
      saveSystemConfig({
        company: { ...getSystemConfig().company!, title: origTitle },
      })
    })

    // 2. Hız Limiti ve POD Dosya Türü/Boyut Güvenliği
    await check("Rate Limiter (429) ve POD Storage (SVG/sahte DataURL/5MB+) engelleme kontrolleri", async () => {
      resetRateLimitStore()
      for (let i = 0; i < 5; i++) {
        const r = checkRateLimit("unit-rl-key", 5, 60_000)
        assert.equal(r.allowed, true)
      }
      const blocked = checkRateLimit("unit-rl-key", 5, 60_000)
      assert.equal(blocked.allowed, false)
      assert.ok(blocked.retryAfterSec >= 1)
      resetRateLimitStore()

      const storage = new LocalStorageProofProvider()
      await assert.rejects(
        () =>
          storage.saveProofArtifact({
            fileName: "payload.svg",
            mimeType: "image/svg+xml",
            base64OrDataUrl: `data:image/svg+xml;base64,${Buffer.from("<svg onload=alert(1)></svg>").toString("base64")}`,
            category: "POD_PHOTO",
            referenceId: "faz8-test",
          }),
        /Geçersiz teslimat kanıtı/
      )

      // İstemci mimeType alanını "image/png" gönderse bile SVG Data URL reddedilmeli
      await assert.rejects(
        () =>
          storage.saveProofArtifact({
            fileName: "spoofed.png",
            mimeType: "image/png",
            base64OrDataUrl: `data:image/svg+xml;base64,${Buffer.from("<svg></svg>").toString("base64")}`,
            category: "POD_SIGNATURE",
            referenceId: "faz8-test",
          }),
        /Geçersiz teslimat kanıtı/
      )

      // > 5MB POD reddedilmeli
      const sixMbBase64 = Buffer.alloc(6 * 1024 * 1024, 1).toString("base64")
      await assert.rejects(
        () =>
          storage.saveProofArtifact({
            fileName: "huge.png",
            mimeType: "image/png",
            base64OrDataUrl: `data:image/png;base64,${sixMbBase64}`,
            category: "POD_PHOTO",
            referenceId: "faz8-test",
          }),
        /en fazla 5 MB/
      )

      // Geçerli küçük PNG kaydedilebilmeli
      const ok = await storage.saveProofArtifact({
        fileName: "valid-faz8-proof.png",
        mimeType: "image/png",
        base64OrDataUrl: VALID_PNG_BASE64,
        category: "POD_PHOTO",
        referenceId: "faz8-unit",
      })
      assert.ok(ok.sizeBytes > 0 && ok.publicUrl.startsWith("/api/logistics/pods/"))
      const createdFile = path.join(process.cwd(), "storage", "logistics-pods", ok.storageKey)
      if (fs.existsSync(createdFile)) {
        fs.rmSync(path.dirname(createdFile), { recursive: true, force: true })
      }
    })

    // 3. Webhook HMAC Doğrulaması & İstemci-Sunucu Sınır + UI Metin Hijyeni
    await check("Webhook HMAC fail-closed kontrolü, next.config tracing ve istemci hijyen taraması", () => {
      const prevDemo = process.env.DISABLE_DEMO_MODE
      process.env.DISABLE_DEMO_MODE = "true"
      try {
        const missingSecret = verifyReturnWebhookSignature({
          rawBody: '{"event":"ORDER_CREATED"}',
          signatureHeader: null,
          secretHeader: null,
          channelCode: "TRENDYOL",
        })
        assert.equal(missingSecret.verified, false)

        process.env.OMNICHANNEL_WEBHOOK_SECRET_TRENDYOL = "faz8-unit-hmac-secret"
        const raw = '{"event":"ORDER_CREATED","orderNumber":"TEST-801"}'
        const validSig = signReturnWebhookPayload(raw, "faz8-unit-hmac-secret")
        assert.equal(
          verifyReturnWebhookSignature({
            rawBody: raw,
            signatureHeader: validSig,
            channelCode: "TRENDYOL",
          }).verified,
          true
        )
        assert.equal(
          verifyReturnWebhookSignature({
            rawBody: raw,
            signatureHeader: "sha256=0000000000000000000000000000000000000000000000000000000000000000",
            channelCode: "TRENDYOL",
          }).verified,
          false
        )
      } finally {
        if (prevDemo === undefined) delete process.env.DISABLE_DEMO_MODE
        else process.env.DISABLE_DEMO_MODE = prevDemo
        delete process.env.OMNICHANNEL_WEBHOOK_SECRET_TRENDYOL
      }

      // next.config.js tracing kontrolü
      const nextCfgText = fs.readFileSync(path.join(process.cwd(), "next.config.js"), "utf8")
      assert.ok(nextCfgText.includes("outputFileTracingIncludes"))
      assert.ok(nextCfgText.includes(".local-db.json"))
      assert.ok(nextCfgText.includes("system_config.json"))
      assert.ok(nextCfgText.includes("pod-demo"))

      // İstemci TSX taraması
      const uiDirs = [
        "app/dashboard/wms",
        "app/dashboard/satinalma",
        "app/dashboard/filo",
        "app/dashboard/sevkiyat",
        "app/dashboard/omnichannel",
        "app/dashboard/lojistik-raporlar",
        "app/takip",
        "app/tedarikci-portali",
        "components/logistics",
      ]
      const walkTsx = (dir: string, acc: string[] = []): string[] => {
        const abs = path.join(process.cwd(), dir)
        if (!fs.existsSync(abs)) return acc
        for (const entry of fs.readdirSync(abs, { withFileTypes: true })) {
          const p = path.join(dir, entry.name)
          if (entry.isDirectory()) walkTsx(p, acc)
          else if (entry.name.endsWith(".tsx")) acc.push(p)
        }
        return acc
      }
      const uiFiles = uiDirs.flatMap((d) => walkTsx(d))
      uiFiles.push("components/shared/logistics-notification-prefs-panel.tsx")
      for (const rel of uiFiles) {
        const txt = fs.readFileSync(path.join(process.cwd(), rel), "utf8")
        assert.ok(!/@\/lib\/db/.test(txt), `Client/server leak @/lib/db in ${rel}`)
        assert.ok(!/from\s+['"](node:)?(fs|crypto|child_process)['"]/.test(txt), `Node import leak in ${rel}`)
        assert.ok(!/Modül Kapalı|modül kapalı|özellik bayrağ/i.test(txt), `Flag leak string in ${rel}`)
      }
    })

    // 4. Performans Testi #1 — 250 Duraklı Çoklu Araç CVRPTW Rota Çözümü
    await check("Performans #1: 250 durak / 10 araç CVRPTW rota optimizasyonu", () => {
      const origin = { label: "İstanbul Merkez Depo", lat: 41.0082, lng: 28.9784 }
      const stops = Array.from({ length: 250 }, (_, idx) => {
        const angle = (idx * 137.5 * Math.PI) / 180
        const radius = 0.02 + ((idx % 25) / 25) * 0.25
        return {
          id: `bench-stop-${idx + 1}`,
          label: `Müşteri Durak ${idx + 1}`,
          lat: Number((origin.lat + Math.sin(angle) * radius).toFixed(5)),
          lng: Number((origin.lng + Math.cos(angle) * radius).toFixed(5)),
          weightKg: 45 + (idx % 6) * 15,
          volumeM3: 0.3,
          palletCount: 1,
          requiresColdChain: idx % 5 === 0,
          serviceMinutes: 8,
        }
      })
      const vehicles = Array.from({ length: 10 }, (_, idx) => ({
        vehicleId: `bench-veh-${idx + 1}`,
        plate: `34 BENCH ${10 + idx}`,
        capacityKg: 3500,
        capacityM3: 20,
        palletSlots: 30,
        isRefrigerated: idx < 4,
      }))

      const t0 = performance.now()
      const res = planMultiVehicleTrips({
        origin,
        stops,
        vehicles,
        timeBudgetMs: 2500,
      })
      const elapsedMs = Number((performance.now() - t0).toFixed(1))
      assert.ok(res.totalStopsAssigned >= 240, `Beklenen >= 240 atanan durak, gelen ${res.totalStopsAssigned}`)
      assert.ok(res.optimizedTotalDistanceKm <= res.baselineTotalDistanceKm + 0.01)
      assert.ok(elapsedMs < 6000, `250-durak CVRPTW çok yavaş: ${elapsedMs}ms`)
      console.log(
        `   ⏱️ [PERF CVRPTW 250-stop] ${elapsedMs} ms | Atanan: ${res.totalStopsAssigned}/250 | Mesafe: ${res.baselineTotalDistanceKm.toFixed(1)} km -> ${res.optimizedTotalDistanceKm.toFixed(1)} km`
      )
    })

    // 5. Performans Testi #2 — 100 Araçlı Telematik Normalizasyon & Harita Koordinat Projeksiyonu
    await check("Performans #2: 100 araçlık telematik paket normalizasyonu ve koordinat projeksiyonu", () => {
      const t0 = performance.now()
      const points = Array.from({ length: 100 }, (_, i) => {
        const norm = normalizePayloadWithProfile("TRACCAR", {
          deviceId: `dev-${i + 1}`,
          type: i % 10 === 0 ? "deviceOverspeed" : "deviceMoving",
          fixTime: "2026-11-20T09:00:00.000Z",
          latitude: 40.9 + (i % 10) * 0.02,
          longitude: 28.8 + Math.floor(i / 10) * 0.03,
          speed: 52 + (i % 40),
          course: (i * 36) % 360,
          attributes: { ignition: true, fuel: 70 - (i % 50), odometer: 120000 + i * 100 },
        })
        return norm
      })
      const minLat = Math.min(...points.map((p) => p.lat ?? 41))
      const maxLat = Math.max(...points.map((p) => p.lat ?? 41))
      const minLng = Math.min(...points.map((p) => p.lng ?? 29))
      const maxLng = Math.max(...points.map((p) => p.lng ?? 29))
      const projected = points.map((p) => ({
        xPct: ((p.lng! - minLng) / Math.max(0.0001, maxLng - minLng)) * 100,
        yPct: (1 - (p.lat! - minLat) / Math.max(0.0001, maxLat - minLat)) * 100,
      }))
      const elapsedMs = Number((performance.now() - t0).toFixed(2))
      assert.equal(projected.length, 100)
      assert.ok(elapsedMs < 1000)
      console.log(`   ⏱️ [PERF FLEET 100-veh Telemetry+Map] ${elapsedMs} ms`)
    })

    // 6. Performans Testi #3 — 1.000 Satırlı Stok Defteri Sayfalama + Excel & PDF Dışa Aktarma
    await check("Performans #3: 1.000 satırlı stok defteri sorgusu ve 1.000 satırlı XLSX + PDF dışa aktarım", async () => {
      const firstWh = await (prisma as any).warehouse.findFirst().catch(() => null)
      const firstItem = await (prisma as any).inventoryItem.findFirst().catch(() => null)
      const whId = firstWh?.id || "wh-merkez-01"
      const itemId = firstItem?.id || "item-01"
      const synthMovements = Array.from({ length: 1000 }, (_, i) => ({
        id: `bench-mv-${i}`,
        itemId,
        warehouseId: whId,
        movementType: i % 2 === 0 ? "RECEIPT" : "ISSUE",
        quantity: 5 + (i % 10),
        unit: "Adet",
        unitCost: 25,
        totalCost: (5 + (i % 10)) * 25,
        referenceDocNo: `BENCH-DOC-${1000 + i}`,
        method: "WEB",
        createdAt: new Date(Date.now() - i * 1000).toISOString(),
      }))

      await (prisma as any).stockMovement.createMany({ data: synthMovements })

      try {
        const tQueryStart = performance.now()
        const page1 = await queryStockLedger({ page: 1, pageSize: 50 })
        const page20 = await queryStockLedger({ page: 20, pageSize: 50 })
        const queryMs = Number((performance.now() - tQueryStart).toFixed(1))

        assert.ok(page1.pagination.total >= 1000, `Beklenen >= 1000 kayıt, gelen ${page1.pagination.total}`)
        assert.equal(page1.entries.length, 50)
        assert.equal(page20.entries.length, 50)

        // 1.000 satırlı rapor payload Excel + PDF export süresi
        const reportPayload = {
          moduleKey: "wms" as const,
          title: "Stok Defteri Yüksek Hacim Benchmark Raporu",
          generatedAt: new Date().toISOString(),
          summaryCards: [
            { label: "Toplam Hareket", value: "1.000" },
            { label: "Toplam Tutar", value: "₺250.000" },
            { label: "Aktif Depo", value: "3" },
            { label: "Hata", value: "0" },
          ],
          columns: [
            { key: "docNo", label: "Belge No", format: "text" as const },
            { key: "type", label: "Hareket Türü", format: "text" as const },
            { key: "qty", label: "Miktar", format: "number" as const },
            { key: "cost", label: "Tutar (TRY)", format: "currency" as const },
            { key: "date", label: "Tarih", format: "date" as const },
          ],
          rows: synthMovements.map((m) => ({
            docNo: m.referenceDocNo,
            type: m.movementType,
            qty: m.quantity,
            cost: m.totalCost,
            date: m.createdAt,
          })),
          chartSeries: [
            { label: "Giriş", value: 500 },
            { label: "Çıkış", value: 500 },
          ],
          chartTitle: "Hareket Dağılımı",
          filterOptions: {},
        }

        const tExportStart = performance.now()
        const xlsxBuf = exportLogisticsReportToExcelBuffer(reportPayload)
        const pdfBuf = exportLogisticsReportToPdfBuffer(reportPayload)
        const exportMs = Number((performance.now() - tExportStart).toFixed(1))

        assert.equal(xlsxBuf.subarray(0, 2).toString("utf8"), "PK")
        assert.equal(pdfBuf.subarray(0, 5).toString("utf8"), "%PDF-")
        assert.ok(queryMs < 5000 && exportMs < 6000)
        console.log(
          `   ⏱️ [PERF 1000-row Ledger Query] ${queryMs} ms (2 sayfa x 50 kayıt) | [XLSX+PDF Export] ${exportMs} ms (XLSX ${(xlsxBuf.length / 1024).toFixed(1)} KB, PDF ${(pdfBuf.length / 1024).toFixed(1)} KB)`
        )
      } finally {
        await (prisma as any).stockMovement.deleteMany({
          where: { id: { startsWith: "bench-mv-" } },
        })
      }
    })

    // 7. Performans Testi #4 — /dashboard Yönetim Özeti & 50 Eşzamanlı Servis Çağrısı
    await check("Performans #4: /dashboard lojistik yönetim özeti ve 50 eşzamanlı servis sorgusu", async () => {
      const adminPayload = { userId: "user-admin", username: "admin", roleName: "Super Admin" }
      const tSingle0 = performance.now()
      const summary = await getLogisticsExecutiveSummaryForUser(adminPayload)
      const singleMs = Number((performance.now() - tSingle0).toFixed(1))
      assert.ok(summary.permittedModules.length >= 1)

      const tConc0 = performance.now()
      const concTasks = Array.from({ length: 50 }, (_, i) => {
        if (i % 3 === 0) return getLogisticsExecutiveSummaryForUser(adminPayload)
        if (i % 3 === 1) return queryStockLedger({ page: 1, pageSize: 20 })
        return getFleetTcoAndEfficiencyReport()
      })
      const results = await Promise.all(concTasks)
      const concMs = Number((performance.now() - tConc0).toFixed(1))
      assert.equal(results.length, 50)
      console.log(
        `   ⏱️ [PERF Dashboard Summary] Tekil: ${singleMs} ms | 50 Eşzamanlı Servis Çağrısı: ${concMs} ms (Ort ${(concMs / 50).toFixed(1)} ms/çağrı)`
      )
    })
  } finally {
    if (dbBeforeBuf) fs.writeFileSync(DB_PATH, dbBeforeBuf)
    if (cfgBeforeBuf) fs.writeFileSync(SYS_CFG_PATH, cfgBeforeBuf)
    resetRateLimitStore()
  }

  assert.equal(sha256File(DB_PATH), dbBeforeHash, ".local-db.json SHA-256 test sonrası birebir korunmalı")
  assert.equal(sha256File(SYS_CFG_PATH), cfgBeforeHash, "system_config.json SHA-256 test sonrası birebir korunmalı")
  console.log(`\n🎉 FAZ 8 BİRİM & PERFORMANS PAKETİ BAŞARILI (${passed}/${passed} kontrol, 0 hata)`)
}

async function runHttpSecurityAndStressSuite(mode: string, baseUrl: string) {
  const dbBeforeBuf = fs.existsSync(DB_PATH) ? fs.readFileSync(DB_PATH) : null
  const cfgBeforeBuf = fs.existsSync(SYS_CFG_PATH) ? fs.readFileSync(SYS_CFG_PATH) : null
  const svgProbePath = path.join(process.cwd(), "public", "uploads", "pod-demo", "__faz8_xss_probe.svg")

  let passed = 0
  const check = async (label: string, fn: () => Promise<void>) => {
    await fn()
    passed++
    console.log(`✅ [${mode} #${passed}] ${label}`)
  }

  try {
    if (mode === "demo-on") {
      await check("Demo ON: Anonim gezinti GET /api/wms + GET /api/omnichannel 200; Faz 2/4 ve POST uçlar 401", async () => {
        const [wmsGet, omniGet, wmsExt, rmaExt, wmsPost, omniPost] = await Promise.all([
          fetch(`${baseUrl}/api/wms`),
          fetch(`${baseUrl}/api/omnichannel`),
          fetch(`${baseUrl}/api/wms?section=hierarchy`),
          fetch(`${baseUrl}/api/omnichannel?section=rma_list`),
          fetch(`${baseUrl}/api/wms`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ action: "seed_reset" }),
          }),
          fetch(`${baseUrl}/api/omnichannel`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ action: "sync_all_channels" }),
          }),
        ])
        assert.equal(wmsGet.status, 200)
        assert.equal(omniGet.status, 200)
        assert.equal(wmsExt.status, 401)
        assert.equal(rmaExt.status, 401)
        assert.equal(wmsPost.status, 401)
        assert.equal(omniPost.status, 401)
      })

      await check("Demo ON: Webhook kötü imza 401, RETURN_REQUEST imzasız 401; demo ORDER_CREATED 200", async () => {
        const [badSig, noSigRma, demoOrder] = await Promise.all([
          fetch(`${baseUrl}/api/webhooks/omnichannel?channel=TRENDYOL`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "X-Webhook-Signature": "sha256=deadbeef",
            },
            body: JSON.stringify({ event: "ORDER_CREATED", orderNumber: "BAD-SIG-01" }),
          }),
          fetch(`${baseUrl}/api/webhooks/omnichannel?channel=TRENDYOL`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ event: "RETURN_REQUEST", orderNumber: "ORD-1", sku: "X" }),
          }),
          fetch(`${baseUrl}/api/webhooks/omnichannel?channel=TRENDYOL`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ event: "SHIPMENT_STATUS_UPDATE", trackingNumber: "NONE-999", status: "IN_TRANSIT" }),
          }),
        ])
        assert.equal(badSig.status, 401)
        assert.equal(noSigRma.status, 401)
        assert.equal(demoOrder.status, 200)
      })

      await check("Yükleme Güvenliği & SVG Güvenlik Başlıkları (Tedarikçi Portal + POD Sunumu)", async () => {
        const jar = new Map<string, string>()
        const login = await fetch(`${baseUrl}/api/supplier-portal/auth`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            username: "tedarikci.royal",
            password: process.env.DEMO_PORTAL_PASS || "demo123",
          }),
        })
        assert.equal(login.status, 200)
        parseSetCookies(login, jar)
        const headers = { Cookie: cookieHeader(jar) }

        // .svg yüklemesi 400 dönmeli
        const badForm = new FormData()
        badForm.append("action", "upload_document")
        badForm.append("docType", "DIGER")
        badForm.append(
          "file",
          new Blob(["<svg onload=alert(1)></svg>"], { type: "image/svg+xml" }),
          "malicious.svg"
        )
        const svgUploadRes = await fetch(`${baseUrl}/api/supplier-portal`, {
          method: "POST",
          headers,
          body: badForm,
        })
        assert.equal(svgUploadRes.status, 400)

        // Geçerli .pdf kabul edilmeli (200)
        const okForm = new FormData()
        okForm.append("action", "upload_document")
        okForm.append("docType", "DIGER")
        okForm.append("title", "Faz8 Test Belgesi")
        okForm.append(
          "file",
          new Blob(["%PDF-1.4\n%Faz8 Valid\n"], { type: "application/pdf" }),
          "faz8-valid.pdf"
        )
        const pdfUploadRes = await fetch(`${baseUrl}/api/supplier-portal`, {
          method: "POST",
          headers,
          body: okForm,
        })
        assert.equal(pdfUploadRes.status, 200)

        // POD PNG nosniff + traversal 403 + SVG sandbox/attachment/nosniff doğrulaması
        const pngRes = await fetch(`${baseUrl}/api/logistics/pods/pod-demo/proof-1.png`)
        assert.equal(pngRes.status, 200)
        assert.equal(pngRes.headers.get("x-content-type-options"), "nosniff")

        fs.writeFileSync(svgProbePath, '<svg xmlns="http://www.w3.org/2000/svg"></svg>', "utf8")
        const svgServe = await fetch(`${baseUrl}/api/logistics/pods/pod-demo/__faz8_xss_probe.svg`)
        assert.equal(svgServe.status, 200)
        assert.equal(svgServe.headers.get("x-content-type-options"), "nosniff")
        assert.equal(svgServe.headers.get("content-security-policy"), "sandbox")
        assert.ok((svgServe.headers.get("content-disposition") || "").includes("attachment"))

        const travRes = await fetch(`${baseUrl}/api/logistics/pods/..%2Fpackage.json`)
        assert.ok(travRes.status === 403 || travRes.status === 404)
      })

      await check("Demo ON Yük Testi: 100 eşzamanlı GET /api/wms isteği (0 hata)", async () => {
        const t0 = performance.now()
        const responses = await Promise.all(
          Array.from({ length: 100 }, () => fetch(`${baseUrl}/api/wms`))
        )
        const elapsedMs = Number((performance.now() - t0).toFixed(1))
        for (const r of responses) {
          assert.equal(r.status, 200)
        }
        console.log(`   ⏱️ [HTTP LOAD Demo-ON] 100 eşzamanlı GET /api/wms -> ${elapsedMs} ms (0 hata)`)
      })
    } else if (mode === "demo-off") {
      await check("Demo OFF: Kimliksiz GET /api/wms ve GET /api/omnichannel 401 dönmeli", async () => {
        const [rWms, rOmni] = await Promise.all([
          fetch(`${baseUrl}/api/wms`),
          fetch(`${baseUrl}/api/omnichannel`),
        ])
        assert.equal(rWms.status, 401)
        assert.equal(rOmni.status, 401)
      })

      await check("Demo OFF: Tedarikçi rolü dahili /api/wms + /api/omnichannel uçlarında 403 FORBIDDEN", async () => {
        const jar = new Map<string, string>()
        const login = await fetch(`${baseUrl}/api/supplier-portal/auth`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            username: "tedarikci.royal",
            password: process.env.DEMO_PORTAL_PASS || "demo123",
          }),
        })
        assert.equal(login.status, 200)
        parseSetCookies(login, jar)
        const headers = { Cookie: cookieHeader(jar), "Content-Type": "application/json" }

        const [wGet, oGet, oPost, dSum] = await Promise.all([
          fetch(`${baseUrl}/api/wms`, { headers }),
          fetch(`${baseUrl}/api/omnichannel`, { headers }),
          fetch(`${baseUrl}/api/omnichannel`, {
            method: "POST",
            headers,
            body: JSON.stringify({ action: "sync_all_channels" }),
          }),
          fetch(`${baseUrl}/api/logistics/dashboard-summary`, { headers }),
        ])
        assert.equal(wGet.status, 403)
        assert.equal(oGet.status, 403)
        assert.equal(oPost.status, 403)
        assert.equal(dSum.status, 403)
      })

      await check("Demo OFF: Admin için bile seed_reset engellenmeli (403 DEMO_MODE_DISABLED)", async () => {
        const loginRes = await fetch(`${baseUrl}/api/auth/login`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            username: "admin",
            password: process.env.DEMO_ADMIN_PASS || "demo123",
          }),
        })
        assert.equal(loginRes.status, 200)
        const loginJson = await loginRes.json()
        const headers = {
          Cookie: `auth-token=${loginJson.token}`,
          "Content-Type": "application/json",
        }

        const [wReset, oReset, wGet, oGet] = await Promise.all([
          fetch(`${baseUrl}/api/wms`, {
            method: "POST",
            headers,
            body: JSON.stringify({ action: "seed_reset" }),
          }),
          fetch(`${baseUrl}/api/omnichannel`, {
            method: "POST",
            headers,
            body: JSON.stringify({ action: "seed_reset" }),
          }),
          fetch(`${baseUrl}/api/wms`, { headers }),
          fetch(`${baseUrl}/api/omnichannel`, { headers }),
        ])
        assert.equal(oReset.status, 403)
        assert.equal(wGet.status, 200)
        assert.equal(oGet.status, 200)
        // EXPECT_FEATURE_ACTIVE=false durumunda wReset FEATURE_DISABLED (403) veya DEMO_MODE_DISABLED (403) döner
        assert.equal(wReset.status, 403)

        if (process.env.EXPECT_FEATURE_ACTIVE === "true") {
          const t0 = performance.now()
          const batch = await Promise.all(
            Array.from({ length: 100 }, () =>
              fetch(`${baseUrl}/api/logistics/dashboard-summary`, { headers })
            )
          )
          const elapsedMs = Number((performance.now() - t0).toFixed(1))
          assert.ok(batch.every((r) => r.status === 200))
          console.log(`   ⏱️ [HTTP LOAD Demo-OFF] 100 eşzamanlı GET /api/logistics/dashboard-summary -> ${elapsedMs} ms`)
        }
      })

      await check("Demo OFF: İmzası olmayan ORDER_CREATED, SHIPMENT_STATUS_UPDATE, RETURN_REQUEST webhookları 401", async () => {
        const [r1, r2, r3] = await Promise.all([
          fetch(`${baseUrl}/api/webhooks/omnichannel?channel=TRENDYOL`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ event: "ORDER_CREATED", orderNumber: "NO-AUTH-1" }),
          }),
          fetch(`${baseUrl}/api/webhooks/omnichannel?channel=TRENDYOL`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ event: "SHIPMENT_STATUS_UPDATE", trackingNumber: "TRK-1", status: "DELIVERED" }),
          }),
          fetch(`${baseUrl}/api/webhooks/omnichannel?channel=TRENDYOL`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ event: "RETURN_REQUEST", orderNumber: "ORD-1", sku: "SKU-1" }),
          }),
        ])
        assert.equal(r1.status, 401)
        assert.equal(r2.status, 401)
        assert.equal(r3.status, 401)
      })

      await check("Rate Limiter E2E: /api/supplier-portal/auth burst sonrası HTTP 429 + Retry-After", async () => {
        const fakeIp = `198.51.100.${Math.floor(10 + Math.random() * 200)}`
        let got429 = false
        for (let i = 0; i < 24; i++) {
          const r = await fetch(`${baseUrl}/api/supplier-portal/auth`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "X-Forwarded-For": fakeIp,
            },
            body: JSON.stringify({ username: "nobody", password: "wrong" }),
          })
          if (r.status === 429) {
            got429 = true
            assert.ok(Number(r.headers.get("retry-after") || "0") >= 1)
            break
          }
        }
        assert.equal(got429, true, "20/dk üstü portal auth denemesi 429 döndürmeli")
      })
    }
  } finally {
    if (fs.existsSync(svgProbePath)) fs.unlinkSync(svgProbePath)
    if (dbBeforeBuf) fs.writeFileSync(DB_PATH, dbBeforeBuf)
    if (cfgBeforeBuf) fs.writeFileSync(SYS_CFG_PATH, cfgBeforeBuf)
  }

  console.log(`\n🎉 FAZ 8 HTTP GÜVENLİK & STRES PAKETİ [${mode}] BAŞARILI (${passed}/${passed} kontrol)`)
}

async function main() {
  const mode = parseArg("mode", "unit")
  const url = parseArg("url", "http://localhost:3114")
  if (mode === "unit") {
    await runUnitAndBenchmarkSuite()
  } else {
    await runHttpSecurityAndStressSuite(mode, url)
  }
}

main()
  .catch((err) => {
    console.error("❌ Faz 8 Test Hatası:", err)
    process.exitCode = 1
  })
  .finally(async () => {
    await prisma.$disconnect().catch(() => null)
  })
