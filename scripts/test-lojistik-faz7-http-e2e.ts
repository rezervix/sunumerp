/**
 * Lojistik Faz 7 — Canlı Next.js HTTP API, Yetki & Sayfa E2E Doğrulama Betiği
 *
 * Kullanım:
 *   npx tsx scripts/test-lojistik-faz7-http-e2e.ts --mode=demo-on --url=http://localhost:3114
 *   npx tsx scripts/test-lojistik-faz7-http-e2e.ts --mode=demo-off --url=http://localhost:3115
 *   EXPECT_FEATURE_ACTIVE=false npx tsx scripts/test-lojistik-faz7-http-e2e.ts --mode=demo-off --url=http://localhost:3116
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
    if (!val || /max-age=0/i.test(line)) jar.delete(name)
    else jar.set(name, val)
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
      await check("Kimliksiz Faz 7 API uçları 401 döndürmeli", async () => {
        const [r1, r2, r3] = await Promise.all([
          fetch(`${baseUrl}/api/logistics/dashboard-summary`),
          fetch(`${baseUrl}/api/logistics/reports`),
          fetch(`${baseUrl}/api/notifications/preferences`),
        ])
        assert.equal(r1.status, 401)
        assert.equal(r2.status, 401)
        assert.equal(r3.status, 401)
      })

      await check("Tedarikçi portalı Faz 7 iç uçlarına erişememeli (403)", async () => {
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
        const headers = { Cookie: cookieHeader(jar) }

        const [sRes, repRes] = await Promise.all([
          fetch(`${baseUrl}/api/logistics/dashboard-summary`, { headers }),
          fetch(`${baseUrl}/api/logistics/reports?module=wms`, { headers }),
        ])
        assert.equal(sRes.status, 403)
        assert.equal(repRes.status, 403)
      })

      const adminJar = new Map<string, string>()

      await check("Admin oturumu: /api/logistics/dashboard-summary + /api/logistics/reports (5 modül)", async () => {
        const admLogin = await fetch(`${baseUrl}/api/auth/demo`, { method: "POST" })
        assert.equal(admLogin.status, 200)
        parseSetCookies(admLogin, adminJar)
        const headers = { Cookie: cookieHeader(adminJar) }

        const sumRes = await fetch(`${baseUrl}/api/logistics/dashboard-summary`, { headers })
        assert.equal(sumRes.status, 200)
        const sumJson = await sumRes.json()
        assert.equal(sumJson.permittedModules.length, 5)
        assert.ok(sumJson.modules.wms && sumJson.modules.sevkiyat && sumJson.modules.filo)

        for (const mod of ["wms", "satinalma", "sevkiyat", "filo", "omnichannel"]) {
          const repRes = await fetch(`${baseUrl}/api/logistics/reports?module=${mod}`, { headers })
          assert.equal(repRes.status, 200, `/api/logistics/reports?module=${mod} HTTP 200 dönmeli`)
          const repJson = await repRes.json()
          assert.ok(repJson.activeReport?.rows?.length > 0, `${mod} raporu canlı satır döndürmeli`)
        }
      })

      await check("Admin oturumu: /api/notifications/preferences PUT & GET kalıcılığı + Tek Tıkla E-Fatura Kes HTTP", async () => {
        const headers = {
          Cookie: cookieHeader(adminJar),
          "Content-Type": "application/json",
        }

        const putRes = await fetch(`${baseUrl}/api/notifications/preferences`, {
          method: "PUT",
          headers,
          body: JSON.stringify({ rules: { DELAYED_SHIPMENT: false } }),
        })
        assert.equal(putRes.status, 200)
        const putJson = await putRes.json()
        assert.equal(putJson.preferences.rules.DELAYED_SHIPMENT, false)

        const getRes = await fetch(`${baseUrl}/api/notifications/preferences`, { headers })
        assert.equal(getRes.status, 200)
        const getJson = await getRes.json()
        assert.equal(getJson.preferences.rules.DELAYED_SHIPMENT, false)

        // Demo taslak durak için Tek Tıkla E-Fatura Kes aksiyonunu doğrula
        const invRes = await fetch(`${baseUrl}/api/sevkiyat`, {
          method: "POST",
          headers,
          body: JSON.stringify({
            action: "issue_stop_efatura",
            stopId: "f7-stop-01",
          }),
        })
        assert.equal(invRes.status, 200)
        const invJson = await invRes.json()
        assert.equal(invJson.success, true)
        assert.equal(invJson.eDocument?.documentStatus || invJson.eInvoiceStatus, "KESILDI")
      })

      await check("Faz 7 sayfaları (/dashboard, /dashboard/lojistik-raporlar, /dashboard/settings) HTTP 200 + geçerli HTML", async () => {
        const headers = { Cookie: cookieHeader(adminJar) }
        for (const r of [
          "/dashboard",
          "/dashboard/lojistik-raporlar",
          "/dashboard/settings",
          "/dashboard/wms",
          "/dashboard/sevkiyat",
          "/dashboard/filo",
          "/dashboard/satinalma",
          "/dashboard/omnichannel",
        ]) {
          const res = await fetch(`${baseUrl}${r}`, { headers })
          assert.equal(res.status, 200, `${r} HTTP 200 dönmeli, gelen ${res.status}`)
          const html = await res.text()
          assert.ok(html.length > 500 && !html.includes("__next_error__"), `${r} geçerli HTML döndürmeli`)
        }
      })
    } else if (mode === "demo-off") {
      await check("Demo OFF: /api/logistics/reports + /api/logistics/dashboard-summary bayrak kapısı (200 vs 403)", async () => {
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
        assert.ok(loginJson.token)
        const authCookie = `auth-token=${loginJson.token}`

        const [sumRes, repRes] = await Promise.all([
          fetch(`${baseUrl}/api/logistics/dashboard-summary`, { headers: { Cookie: authCookie } }),
          fetch(`${baseUrl}/api/logistics/reports?module=wms`, { headers: { Cookie: authCookie } }),
        ])
        assert.equal(sumRes.status, 200)
        const sumJson = await sumRes.json()

        if (process.env.EXPECT_FEATURE_ACTIVE === "true") {
          assert.ok(sumJson.permittedModules.length >= 1)
          assert.equal(repRes.status, 200)
        } else {
          assert.equal(sumJson.permittedModules.length, 0)
          assert.equal(repRes.status, 403)
        }
      })
    }
  } finally {
    if (dbSnapshot !== null) {
      fs.writeFileSync(dbPath, dbSnapshot)
    }
  }

  console.log(`\n🎉 FAZ 7 HTTP DOĞRULAMA (${mode}) TAMAMLANDI (${passed}/${passed})`)
}

run()
  .catch((err) => {
    console.error("❌ FAZ 7 HTTP E2E HATASI:", err)
    process.exit(1)
  })
  .then(() => process.exit(0))
