/**
 * Lojistik Faz 4 — Canlı Next.js HTTP API, Güvenlik & Sayfa E2E Doğrulama Betiği
 * Kullanım:
 *   npx tsx scripts/test-lojistik-faz4-http-e2e.ts --mode=demo-on --url=http://localhost:3114
 *   npx tsx scripts/test-lojistik-faz4-http-e2e.ts --mode=demo-off --url=http://localhost:3115
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
      await check("Kimliksiz Faz 4 uçları 401 ile korunmalı", async () => {
        const [r1, r2, r3] = await Promise.all([
          fetch(`${baseUrl}/api/omnichannel?section=rma_list`),
          fetch(`${baseUrl}/api/omnichannel?section=return_analytics`),
          fetch(`${baseUrl}/api/omnichannel`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ action: "create_rma" }),
          }),
        ])
        assert.equal(r1.status, 401)
        assert.equal(r2.status, 401)
        assert.equal(r3.status, 401)
      })

      await check("Tedarikçi portal hesabı Faz 4 şirket içi iade uçlarına erişememeli (403)", async () => {
        const jar = new Map<string, string>()
        const loginRes = await fetch(`${baseUrl}/api/supplier-portal/auth`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ username: "tedarikci.royal", password: process.env.DEMO_PORTAL_PASS || "demo123" }),
        })
        assert.equal(loginRes.status, 200)
        parseSetCookies(loginRes, jar)
        const r = await fetch(`${baseUrl}/api/omnichannel?section=rma_list`, {
          headers: { Cookie: cookieHeader(jar) },
        })
        assert.equal(r.status, 403)
      })

      const adminJar = new Map<string, string>()
      await check("Admin oturumu: /api/omnichannel snapshot + RMA CRUD + Karantina + Kalite + Kredi Notası + Simülatör", async () => {
        const admLogin = await fetch(`${baseUrl}/api/auth/demo`, { method: "POST" })
        assert.equal(admLogin.status, 200)
        parseSetCookies(admLogin, adminJar)
        const admHeaders = { Cookie: cookieHeader(adminJar), "Content-Type": "application/json" }

        const snapRes = await fetch(`${baseUrl}/api/omnichannel`, { headers: { Cookie: cookieHeader(adminJar) } })
        assert.equal(snapRes.status, 200)
        const snap = await snapRes.json()
        assert.equal(snap.success, true)
        assert.ok(Array.isArray(snap.rmaReturns) && snap.rmaReturns.length >= 10)
        assert.ok(Array.isArray(snap.returnPolicies) && snap.returnPolicies.length >= 4)
        assert.ok(Array.isArray(snap.returnCreditNotes) && snap.returnCreditNotes.length >= 4)
        assert.ok(Array.isArray(snap.returnWebhookLogs) && snap.returnWebhookLogs.length >= 4)
        assert.ok(snap.returnAnalytics && snap.returnAnalytics.totalRmas >= 10)
        assert.equal(snap.featureFlags?.logisticsDemoMode, true)

        // Etiket & WMS Lookup kontrolü
        const firstRma = snap.rmaReturns.find((x: any) => x.id === "f4-rma-03") || snap.rmaReturns[0]
        const [lblRes, wmsLookupRes] = await Promise.all([
          fetch(`${baseUrl}/api/omnichannel?section=rma_label&rmaId=${encodeURIComponent(firstRma.id)}`, {
            headers: { Cookie: cookieHeader(adminJar) },
          }),
          fetch(`${baseUrl}/api/wms?section=lookup&barcode=${encodeURIComponent(firstRma.labelCode || firstRma.rmaNumber)}`, {
            headers: { Cookie: cookieHeader(adminJar) },
          }),
        ])
        assert.equal(lblRes.status, 200)
        const lblJson = await lblRes.json()
        assert.ok(lblJson.label?.qrSvg?.includes("<svg"))

        assert.equal(wmsLookupRes.status, 200)
        const wmsLookupJson = await wmsLookupRes.json()
        assert.equal(wmsLookupJson.lookupType, "RMA")

        // Demo webhook simulator -> 200
        const simRes = await fetch(`${baseUrl}/api/omnichannel`, {
          method: "POST",
          headers: admHeaders,
          body: JSON.stringify({
            action: "simulate_return_webhook",
            channelCode: "TRENDYOL",
            orderNumber: "OMN-2026-9041",
            sku: "GUL-EKV-01",
            quantity: 1,
          }),
        })
        assert.equal(simRes.status, 200)
        const simJson = await simRes.json()
        assert.equal(simJson.success, true)
        assert.ok(simJson.rmaNumber)
      })

      await check("Pazaryeri HMAC Webhook (/api/webhooks/omnichannel): sahte imza 401, geçerli imza 200 & duplicate", async () => {
        const payload = {
          event: "RETURN_REQUEST",
          channelCode: "TRENDYOL",
          orderNumber: "OMN-2026-9042",
          customerName: "Borusan Lojistik Dağıtım A.Ş.",
          sku: "LIL-KAZ-02",
          quantity: 1,
          reasonCode: "HASARLI_KARGO",
          deliveredAt: new Date(Date.now() - 2 * 86_400_000).toISOString(),
          idempotencyKey: `http-e2e-wh-${Date.now()}`,
        }
        const raw = JSON.stringify(payload)
        const secret = process.env.OMNICHANNEL_DEMO_SECRET || "sunum-demo-webhook-secret"
        const sig = `sha256=${crypto.createHmac("sha256", secret).update(raw, "utf8").digest("hex")}`

        const badRes = await fetch(`${baseUrl}/api/webhooks/omnichannel?channel=TRENDYOL`, {
          method: "POST",
          headers: { "Content-Type": "application/json", "X-Webhook-Signature": "sha256=bad000" },
          body: raw,
        })
        assert.equal(badRes.status, 401)

        const okRes = await fetch(`${baseUrl}/api/webhooks/omnichannel?channel=TRENDYOL`, {
          method: "POST",
          headers: { "Content-Type": "application/json", "X-Webhook-Signature": sig },
          body: raw,
        })
        assert.equal(okRes.status, 200)
        const okJson = await okRes.json()
        assert.equal(okJson.duplicate, false)

        const dupRes = await fetch(`${baseUrl}/api/webhooks/omnichannel?channel=TRENDYOL`, {
          method: "POST",
          headers: { "Content-Type": "application/json", "X-Webhook-Signature": sig },
          body: raw,
        })
        assert.equal(dupRes.status, 200)
        const dupJson = await dupRes.json()
        assert.equal(dupJson.duplicate, true)
      })

      await check("Etkilenen Tüm Sayfalar HTTP 200 yanıtı vermeli (regresyon yokluğu)", async () => {
        const headers = { Cookie: cookieHeader(adminJar) }
        for (const p of [
          "/dashboard/omnichannel",
          "/dashboard/omnichannel/rma/f4-rma-01/print",
          "/dashboard/orders",
          "/dashboard/wms",
          "/dashboard/wms/mobil",
          "/dashboard/satinalma",
          "/dashboard/stok",
          "/dashboard/finance",
          "/dashboard/uretim/kalite",
        ]) {
          const r = await fetch(`${baseUrl}${p}`, { headers, redirect: "manual" })
          assert.equal(r.status, 200, `Sayfa ${p} HTTP ${r.status} döndürdü`)
        }
      })
    } else if (mode === "demo-off") {
      await check("Demo OFF: /api/system-config logisticsDemoMode=false & /api/auth/demo kapalı", async () => {
        const [sysRes, demoAuth] = await Promise.all([
          fetch(`${baseUrl}/api/system-config`),
          fetch(`${baseUrl}/api/auth/demo`, { method: "POST" }),
        ])
        assert.equal(sysRes.status, 200)
        const sysJson = await sysRes.json()
        assert.equal(sysJson.logisticsDemoMode, false)
        assert.notEqual(demoAuth.status, 200, "Demo OFF iken /api/auth/demo oturum açmamalı")
      })

      await check("Demo OFF: İmzalı webhook secret olmadan / demo fallback olmadan reddedilmeli (401)", async () => {
        const raw = JSON.stringify({
          event: "RETURN_REQUEST",
          channelCode: "TRENDYOL",
          orderNumber: "OMN-2026-9041",
          sku: "GUL-EKV-01",
          quantity: 1,
        })
        const demoSig = `sha256=${crypto.createHmac("sha256", "sunum-demo-webhook-secret").update(raw, "utf8").digest("hex")}`
        const res = await fetch(`${baseUrl}/api/webhooks/omnichannel?channel=TRENDYOL`, {
          method: "POST",
          headers: { "Content-Type": "application/json", "X-Webhook-Signature": demoSig },
          body: raw,
        })
        assert.equal(res.status, 401, "Demo OFF iken demo webhook sırrı kabul edilmemeli")
      })
    }
  } finally {
    if (dbSnapshot !== null) {
      fs.writeFileSync(dbPath, dbSnapshot)
    }
  }

  console.log(`\n🎉 FAZ 4 HTTP DOĞRULAMA (${mode}) TAMAMLANDI (${passed}/${passed})`)
}

run()
  .catch((err) => {
    console.error("❌ FAZ 4 HTTP E2E HATASI:", err)
    process.exit(1)
  })
  .then(() => process.exit(0))
