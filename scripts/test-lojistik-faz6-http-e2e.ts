/**
 * Lojistik Faz 6 (lojistik_sevkiyat_rota) — Canlı Next.js HTTP API, Güvenlik & Sayfa E2E Doğrulama Betiği
 * Kullanım:
 *   npx tsx scripts/test-lojistik-faz6-http-e2e.ts --mode=demo-on --url=http://localhost:3114
 *   npx tsx scripts/test-lojistik-faz6-http-e2e.ts --mode=demo-off --url=http://localhost:3115
 */

import assert from "node:assert/strict"
import fs from "node:fs"
import path from "node:path"

function parseArg(name: string, fallback: string): string {
  const prefix = `--${name}=`
  const found = process.argv.find((a) => a.startsWith(prefix))
  return found ? found.slice(prefix.length) : fallback
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
    if (!val || /max-age=0/i.test(line)) {
      jar.delete(name)
    } else {
      jar.set(name, val)
    }
  }
}

function cookieHeader(jar: Map<string, string>): string {
  return Array.from(jar.entries())
    .map(([k, v]) => `${k}=${v}`)
    .join("; ")
}

const TEST_PNG_B64 =
  "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAQAAAAECAIAAAAmkwkpAAAAEElEQVR42mP8z8AARwzEcQAAAP//AwwDAf0AAAAASUVORK5CYII="

async function run() {
  const mode = parseArg("mode", "demo-on")
  const baseUrl = parseArg("url", "http://localhost:3114")
  const dbPath = path.join(process.cwd(), "storage", "ajans-kutuphanesi", ".local-db.json")
  const dbSnapshot = fs.existsSync(dbPath) ? fs.readFileSync(dbPath) : null

  let passed = 0
  const check = async (label: string, fn: () => Promise<void>) => {
    await fn()
    passed++
    console.log(`✅ [${mode} #${passed}] ${label}`)
  }

  try {
    if (mode === "demo-on") {
      await check("Kimliksiz Faz 6 API uçları 401 ile korunmalı", async () => {
        const [r1, r2] = await Promise.all([
          fetch(`${baseUrl}/api/sevkiyat?section=overview`),
          fetch(`${baseUrl}/api/sevkiyat`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ action: "create_trip" }),
          }),
        ])
        assert.equal(r1.status, 401)
        assert.equal(r2.status, 401)
      })

      await check("Tedarikçi portal hesabı /api/sevkiyat uçlarına erişememeli (403 FORBIDDEN_SUPPLIER_SCOPE)", async () => {
        const jar = new Map<string, string>()
        const loginRes = await fetch(`${baseUrl}/api/supplier-portal/auth`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            username: "tedarikci.royal",
            password: process.env.DEMO_PORTAL_PASS || "demo123",
          }),
        })
        assert.equal(loginRes.status, 200)
        parseSetCookies(loginRes, jar)
        const r = await fetch(`${baseUrl}/api/sevkiyat?section=overview`, {
          headers: { Cookie: cookieHeader(jar) },
        })
        assert.equal(r.status, 403)
      })

      const adminJar = new Map<string, string>()
      let validTrackingToken = ""
      let expiredTrackingToken = ""

      await check("Admin oturumu: /api/sevkiyat overview (4+ sefer, KPI, adaptör, harita config) + E2E POST aksiyonları", async () => {
        const admLogin = await fetch(`${baseUrl}/api/auth/demo`, { method: "POST" })
        assert.equal(admLogin.status, 200)
        parseSetCookies(admLogin, adminJar)
        const admHeaders = { Cookie: cookieHeader(adminJar), "Content-Type": "application/json" }

        const snapRes = await fetch(`${baseUrl}/api/sevkiyat?section=overview`, {
          headers: { Cookie: cookieHeader(adminJar) },
        })
        assert.equal(snapRes.status, 200)
        const snap = await snapRes.json()
        assert.equal(snap.success, true)
        assert.ok(Array.isArray(snap.trips) && snap.trips.length >= 4)
        assert.ok(Array.isArray(snap.readyPool) && snap.readyPool.length >= 1)
        assert.ok(snap.kpis && snap.kpis.totalTrips >= 4)
        assert.ok(snap.adapterStatus && snap.adapterStatus.routing)

        const trip1 = snap.trips.find((t: any) => t.tripNumber === "SFR-2026-601")
        const trip3 = snap.trips.find((t: any) => t.tripNumber === "SFR-2026-603")
        validTrackingToken = trip1?.stops?.find((s: any) => s.id === "f6-stop-03")?.trackingToken || ""
        expiredTrackingToken = trip3?.stops?.find((s: any) => s.id === "f6-stop-11")?.trackingToken || ""
        assert.ok(validTrackingToken.length >= 32)
        assert.ok(expiredTrackingToken.length >= 32)

        // Draft seferi onayla -> E-İrsaliye kesimi
        const appRes = await fetch(`${baseUrl}/api/sevkiyat`, {
          method: "POST",
          headers: admHeaders,
          body: JSON.stringify({ action: "approve_trip", tripId: "f6-trip-04" }),
        })
        assert.equal(appRes.status, 200)
        const appJson = await appRes.json()
        assert.ok(appJson.eWaybillNo && appJson.eWaybillNo.startsWith("IRS"))

        // e-POD gönderimi
        const podRes = await fetch(`${baseUrl}/api/sevkiyat`, {
          method: "POST",
          headers: admHeaders,
          body: JSON.stringify({
            action: "submit_pod",
            stopId: "f6-stop-03",
            captureMethod: "IMZA_CIZIM",
            recipientName: "E2E Alıcı",
            recipientRelation: "RESEPSIYON",
            signatureUrlOrDataUrl: TEST_PNG_B64,
          }),
        })
        assert.equal(podRes.status, 200)
        const podJson = await podRes.json()
        assert.equal(podJson.stop?.status, "TESLIM_EDILDI")
      })

      await check("Public Müşteri Takip (/api/takip/[token]): aktif 200, bilinmeyen 404, süresi dolmuş 410", async () => {
        const [okRes, notFoundRes, expRes] = await Promise.all([
          fetch(`${baseUrl}/api/takip/${validTrackingToken}`),
          fetch(`${baseUrl}/api/takip/olmayan-token-99999`),
          fetch(`${baseUrl}/api/takip/${expiredTrackingToken}`),
        ])
        assert.equal(okRes.status, 200)
        const okJson = await okRes.json()
        assert.equal(okJson.tracking?.driverShortName, "Cemal K.")

        assert.equal(notFoundRes.status, 404)
        assert.equal(expRes.status, 410)
      })

      await check("Demo e-POD görseli (/api/uploads/pod-sign-01.png?subdir=pod-demo) HTTP 200", async () => {
        const imgRes = await fetch(`${baseUrl}/api/uploads/pod-sign-01.png?subdir=pod-demo`)
        assert.equal(imgRes.status, 200)
      })

      await check("Faz 6 sayfaları & derinleştirilmiş sayfalar HTTP 200 + geçerli HTML dönmeli", async () => {
        const routes = [
          "/dashboard/sevkiyat",
          "/dashboard/sevkiyat/surucu",
          `/takip/${validTrackingToken}`,
          `/takip/${expiredTrackingToken}`,
          "/dashboard/cargo",
          "/dashboard/omnichannel",
          "/dashboard/orders",
          "/dashboard/wms",
          "/dashboard/filo",
          "/dashboard/stok",
          "/dashboard/finance",
        ]
        for (const r of routes) {
          const pageRes = await fetch(`${baseUrl}${r}`, { headers: { Cookie: cookieHeader(adminJar) } })
          assert.equal(pageRes.status, 200, `${r} HTTP 200 bekleniyordu, gelen ${pageRes.status}`)
          const html = await pageRes.text()
          assert.ok(html.length > 500 && !html.includes("__next_error__"), `${r} geçerli HTML döndürmeli.`)
        }
      })
    } else if (mode === "demo-off") {
      await check("Demo OFF: Gerçek login + FEATURE_LOJISTIK_SEVKIYAT_ROTA 200/403 kapısı & /api/takip 404", async () => {
        const [sysRes, portalDemoRes, loginRes, pubMissing] = await Promise.all([
          fetch(`${baseUrl}/api/system-config`),
          fetch(`${baseUrl}/api/supplier-portal/demo`),
          fetch(`${baseUrl}/api/auth/login`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              username: "admin",
              password: process.env.DEMO_ADMIN_PASS || "demo123",
            }),
          }),
          fetch(`${baseUrl}/api/takip/gecersiz-demo-off-token`),
        ])
        assert.equal(sysRes.status, 200)
        const sysJson = await sysRes.json()
        assert.equal(sysJson.logisticsDemoMode, false)
        assert.equal(portalDemoRes.status, 403)
        assert.equal(pubMissing.status, 404)

        assert.equal(loginRes.status, 200)
        const loginJson = await loginRes.json()
        assert.ok(loginJson.token)
        const authCookie = `auth-token=${loginJson.token}`

        const sevRes = await fetch(`${baseUrl}/api/sevkiyat?section=overview`, {
          headers: { Cookie: authCookie },
        })
        if (process.env.EXPECT_FEATURE_ACTIVE === "true") {
          assert.equal(sevRes.status, 200, "Demo OFF + lojistik_sevkiyat_rota=true iken 200 dönmeli.")
        } else {
          assert.equal(sevRes.status, 403)
          const j = await sevRes.json()
          assert.equal(j.code, "FEATURE_DISABLED")
        }
      })
    }
  } finally {
    const podDir = path.join(process.cwd(), "storage", "logistics-pods")
    if (fs.existsSync(podDir)) {
      for (const file of fs.readdirSync(podDir)) {
        if (file.startsWith("pods-")) {
          fs.rmSync(path.join(podDir, file), { force: true })
        }
      }
    }
    if (dbSnapshot !== null) {
      fs.writeFileSync(dbPath, dbSnapshot)
    }
  }

  console.log(`\n🎉 FAZ 6 HTTP DOĞRULAMA (${mode}) TAMAMLANDI (${passed}/${passed})`)
}

run()
  .catch((err) => {
    console.error("❌ FAZ 6 HTTP E2E HATASI:", err)
    process.exit(1)
  })
  .then(() => process.exit(0))
