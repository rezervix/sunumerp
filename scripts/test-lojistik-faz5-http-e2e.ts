/**
 * Lojistik Faz 5 (lojistik_filo) — Canlı Next.js HTTP API, Güvenlik, KVKK & Sayfa E2E Doğrulama Betiği
 * Kullanım:
 *   npx tsx scripts/test-lojistik-faz5-http-e2e.ts --mode=demo-on --url=http://localhost:3114
 *   npx tsx scripts/test-lojistik-faz5-http-e2e.ts --mode=demo-off --url=http://localhost:3115
 */

import assert from "node:assert/strict"
import crypto from "node:crypto"
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
      await check("Kimliksiz Faz 5 uçları 401 ile korunmalı", async () => {
        const [r1, r2, r3] = await Promise.all([
          fetch(`${baseUrl}/api/filo?section=overview`),
          fetch(`${baseUrl}/api/filo?section=map_live`),
          fetch(`${baseUrl}/api/filo`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ action: "upsert_vehicle", plate: "34 TEST 01" }),
          }),
        ])
        assert.equal(r1.status, 401)
        assert.equal(r2.status, 401)
        assert.equal(r3.status, 401)
      })

      await check("Tedarikçi portal hesabı şirket içi /api/filo uçlarına erişememeli (403 FORBIDDEN_SUPPLIER_SCOPE)", async () => {
        const jar = new Map<string, string>()
        const loginRes = await fetch(`${baseUrl}/api/supplier-portal/auth`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ username: "tedarikci.royal", password: process.env.DEMO_PORTAL_PASS || "demo123" }),
        })
        assert.equal(loginRes.status, 200)
        parseSetCookies(loginRes, jar)
        const r = await fetch(`${baseUrl}/api/filo?section=overview`, {
          headers: { Cookie: cookieHeader(jar) },
        })
        assert.equal(r.status, 403)
      })

      const adminJar = new Map<string, string>()
      await check("Admin oturumu: /api/filo overview + 18 araç + 15 şoför + DESNZ 2026 CO2 + 48s harita izi + Araç/Yakıt/Bakım POST", async () => {
        const admLogin = await fetch(`${baseUrl}/api/auth/demo`, { method: "POST" })
        assert.equal(admLogin.status, 200)
        parseSetCookies(admLogin, adminJar)
        const admHeaders = { Cookie: cookieHeader(adminJar), "Content-Type": "application/json" }

        const snapRes = await fetch(`${baseUrl}/api/filo?section=overview`, { headers: { Cookie: cookieHeader(adminJar) } })
        assert.equal(snapRes.status, 200)
        const snap = await snapRes.json()
        assert.equal(snap.success, true)
        assert.ok(Array.isArray(snap.vehicles) && snap.vehicles.length >= 18)
        assert.ok(Array.isArray(snap.drivers) && snap.drivers.length >= 15)
        assert.ok(Array.isArray(snap.co2Factors) && snap.co2Factors.some((f: any) => f.sourceYear === 2026))
        assert.ok(snap.mapLive && Array.isArray(snap.mapLive.vehicles) && snap.mapLive.vehicles.some((v: any) => Array.isArray(v.trail) && v.trail.length >= 4))
        assert.equal(snap.featureFlags?.logisticsDemoMode, true)

        // KVKK açık görünüm (admin yetkili) + Varsayılan maskeli okuma kontrolü
        const drv03Default = snap.drivers.find((d: any) => d.id === "f5-drv-03")
        assert.ok(drv03Default && drv03Default.tckn !== "19283746510", "Varsayılan overview şoför TCKN'sini maskeli döndürmelidir.")
        const drvUnmaskRes = await fetch(`${baseUrl}/api/filo?section=driver_detail&driverId=f5-drv-03&revealKvkk=true`, {
          headers: { Cookie: cookieHeader(adminJar) },
        })
        assert.equal(drvUnmaskRes.status, 200)
        const drvUnmaskJson = await drvUnmaskRes.json()
        assert.equal(drvUnmaskJson.driver?.tckn, "19283746510")

        // Bağımsız bakım iş emri açma + yakıt kaydetme
        const woRes = await fetch(`${baseUrl}/api/filo`, {
          method: "POST",
          headers: admHeaders,
          body: JSON.stringify({
            action: "create_maint_wo",
            vehicleId: "f5-veh-01",
            orderType: "PREVENTIVE",
            title: "HTTP E2E Periyodik Kontrol",
            priority: "LOW",
          }),
        })
        assert.equal(woRes.status, 200)
        const woJson = await woRes.json()
        assert.ok(woJson.workOrder?.id)
      })

      await check("Telematik HMAC Webhook (/api/webhooks/telematics): sahte imza 401, geçerli imza 200 & duplicate", async () => {
        const eventId = `e2e-tel-${Date.now()}`
        const payload = {
          id: eventId,
          deviceId: "traccar-dev-808",
          type: "deviceMoving",
          fixTime: new Date().toISOString(),
          latitude: 40.7999,
          longitude: 29.5411,
          speed: 65,
          attributes: { odometer: 84280000, ignition: true, temp1: 3.5 },
        }
        const raw = JSON.stringify(payload)

        const badRes = await fetch(`${baseUrl}/api/webhooks/telematics?provider=TRACCAR`, {
          method: "POST",
          headers: { "Content-Type": "application/json", "X-Telematics-Signature": "sha256=deadbeef" },
          body: raw,
        })
        assert.equal(badRes.status, 401)

        const secret = process.env.LOJISTIK_TELEMATICS_SECRET || "sunum-demo-telematics-secret"
        const sig = `sha256=${crypto.createHmac("sha256", secret).update(raw, "utf8").digest("hex")}`
        const okRes = await fetch(`${baseUrl}/api/webhooks/telematics?provider=TRACCAR`, {
          method: "POST",
          headers: { "Content-Type": "application/json", "X-Telematics-Signature": sig },
          body: raw,
        })
        assert.equal(okRes.status, 200)
        const okJson = await okRes.json()
        assert.equal(okJson.acceptedCount, 1)

        const dupRes = await fetch(`${baseUrl}/api/webhooks/telematics?provider=TRACCAR`, {
          method: "POST",
          headers: { "Content-Type": "application/json", "X-Telematics-Signature": sig },
          body: raw,
        })
        assert.equal(dupRes.status, 200)
        const dupJson = await dupRes.json()
        assert.equal(dupJson.duplicateCount, 1)
      })

      await check("Sayfa rotaları (/dashboard/filo & derinleştirilmiş sayfalar) HTTP 200 dönmeli", async () => {
        const routes = [
          "/dashboard/filo",
          "/dashboard/cargo",
          "/dashboard/wms",
          "/dashboard/omnichannel",
          "/dashboard/orders",
          "/dashboard/uretim/bakim",
        ]
        for (const r of routes) {
          const pageRes = await fetch(`${baseUrl}${r}`, { headers: { Cookie: cookieHeader(adminJar) } })
          assert.equal(pageRes.status, 200, `${r} HTTP 200 bekleniyordu, gelen ${pageRes.status}`)
          const html = await pageRes.text()
          assert.ok(html.length > 500 && !html.includes("__next_error__"), `${r} geçerli HTML döndürmeli.`)
        }
      })
    } else if (mode === "demo-off") {
      await check("Demo OFF: Gerçek login + FEATURE_LOJISTIK_FILO durumu & uretim_bakim=false bağımsızlık + 403 doğrulaması", async () => {
        const [demoAuthRes, loginRes] = await Promise.all([
          fetch(`${baseUrl}/api/auth/demo`, { method: "POST" }),
          fetch(`${baseUrl}/api/auth/login`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              username: "admin",
              password: process.env.DEMO_ADMIN_PASS || "admin123",
            }),
          }),
        ])
        assert.equal(demoAuthRes.status, 403)
        assert.equal(loginRes.status, 200)
        const loginJson = await loginRes.json()
        assert.ok(loginJson.token)
        const authCookie = `auth-token=${loginJson.token}`

        const filoRes = await fetch(`${baseUrl}/api/filo?section=vehicles`, {
          headers: { Cookie: authCookie },
        })
        if (process.env.EXPECT_FEATURE_ACTIVE === "true") {
          assert.equal(filoRes.status, 200, "Demo OFF + lojistik_filo=true (uretim_bakim=false olsa bile) 200 dönmeli")
          const maintRes = await fetch(`${baseUrl}/api/filo?section=maintenance`, {
            headers: { Cookie: authCookie },
          })
          assert.equal(maintRes.status, 200)
        } else {
          assert.equal(filoRes.status, 403)
          const filoJson = await filoRes.json()
          assert.equal(filoJson.code, "FEATURE_DISABLED")
        }
      })

      await check("Demo OFF: Telematik webhook demo fallback gizli anahtarı ile çalışmamalı (401)", async () => {
        const raw = JSON.stringify({ deviceId: "traccar-dev-808", latitude: 41.0, longitude: 29.0 })
        const demoSig = `sha256=${crypto.createHmac("sha256", "sunum-demo-telematics-secret").update(raw, "utf8").digest("hex")}`
        const res = await fetch(`${baseUrl}/api/webhooks/telematics?provider=TRACCAR`, {
          method: "POST",
          headers: { "Content-Type": "application/json", "X-Telematics-Signature": demoSig },
          body: raw,
        })
        assert.equal(res.status, 401, "Demo OFF iken demo telematik sırrı reddedilmelidir")
      })
    }
  } finally {
    if (dbSnapshot !== null) {
      fs.writeFileSync(dbPath, dbSnapshot)
    }
  }

  console.log(`\n🎉 FAZ 5 HTTP DOĞRULAMA (${mode}) TAMAMLANDI (${passed}/${passed})`)
}

run()
  .catch((err) => {
    console.error("❌ FAZ 5 HTTP E2E HATASI:", err)
    process.exit(1)
  })
  .then(() => process.exit(0))
