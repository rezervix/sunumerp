/**
 * Lojistik Faz 3 — Canlı Next.js HTTP API & Güvenlik Sınırı Doğrulama Betiği
 * Kullanım:
 *   npx tsx scripts/test-lojistik-faz3-http-e2e.ts --mode=demo-on --url=http://localhost:3102
 *   npx tsx scripts/test-lojistik-faz3-http-e2e.ts --mode=demo-off --url=http://localhost:3103
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
    // Max-Age=0 veya boş değer -> sil
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
  const baseUrl = parseArg("url", "http://localhost:3102")
  const dbPath = path.join(process.cwd(), "storage", "ajans-kutuphanesi", ".local-db.json")
  const dbSnapshot = fs.existsSync(dbPath) ? fs.readFileSync(dbPath, "utf8") : null

  let passed = 0
  const check = async (label: string, fn: () => Promise<void>) => {
    await fn()
    passed++
    console.log(`✅ [${mode} #${passed}] ${label}`)
  }

  try {
    if (mode === "demo-on") {
      await check("Kimliksiz istekler korunmalı (401)", async () => {
        const [r1, r2, r3] = await Promise.all([
          fetch(`${baseUrl}/api/procurement`),
          fetch(`${baseUrl}/api/supplier-portal`),
          fetch(`${baseUrl}/api/edi/asn`, { method: "POST", headers: { "Content-Type": "application/json" }, body: "{}" }),
        ])
        assert.equal(r1.status, 401)
        assert.equal(r2.status, 401)
        assert.equal(r3.status, 401)
      })

      await check("/api/system-config & /api/supplier-portal/demo Demo ON durumunu raporlamalı", async () => {
        const [sysRes, demoRes] = await Promise.all([
          fetch(`${baseUrl}/api/system-config`),
          fetch(`${baseUrl}/api/supplier-portal/demo`),
        ])
        assert.equal(sysRes.status, 200)
        const sysJson = await sysRes.json()
        assert.equal(sysJson.logisticsDemoMode, true)

        assert.equal(demoRes.status, 200)
        const demoJson = await demoRes.json()
        assert.equal(demoJson.demoModeEnabled, true)
        assert.ok(Array.isArray(demoJson.demoAccounts) && demoJson.demoAccounts.length >= 2)
      })

      await check("Portal kullanıcısı (tedarikci.royal) gerçek şifre ile giriş & kapsam izolasyonu (403)", async () => {
        const jar = new Map<string, string>()
        const loginRes = await fetch(`${baseUrl}/api/supplier-portal/auth`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ username: "tedarikci.royal", password: process.env.DEMO_PORTAL_PASS || "demo123" }),
        })
        assert.equal(loginRes.status, 200)
        parseSetCookies(loginRes, jar)
        assert.ok(jar.get("auth-token"), "auth-token çerezi dönmeli")
        assert.equal(jar.get("admin-return-token"), undefined, "Doğrudan girişte admin-return-token olmamalı")

        const headers = { Cookie: cookieHeader(jar) }
        const [portalRes, procRes, ediRes, escalRes, crossPoRes] = await Promise.all([
          fetch(`${baseUrl}/api/supplier-portal`, { headers }),
          fetch(`${baseUrl}/api/procurement`, { headers }),
          fetch(`${baseUrl}/api/edi/asn`, {
            method: "POST",
            headers: { ...headers, "Content-Type": "application/json" },
            body: "{}",
          }),
          fetch(`${baseUrl}/api/supplier-portal/demo`, {
            method: "POST",
            headers: { ...headers, "Content-Type": "application/json" },
            body: JSON.stringify({ action: "switch_to_supplier" }),
          }),
          // Yalova PO'suna Royal hesabıyla erişim -> 403 FORBIDDEN_SUPPLIER_SCOPE
          fetch(`${baseUrl}/api/supplier-portal`, {
            method: "POST",
            headers: { ...headers, "Content-Type": "application/json" },
            body: JSON.stringify({ action: "respond_po", poId: "f3-po-conf-yalova", decision: "ONAYLANDI" }),
          }),
        ])

        assert.equal(portalRes.status, 200)
        const portalJson = await portalRes.json()
        assert.equal(portalJson.supplier.id, "sup-holland-01")
        assert.ok(portalJson.purchaseOrders.every((p: any) => p.supplierId === "sup-holland-01"))

        assert.equal(procRes.status, 403)
        assert.equal(ediRes.status, 403)
        assert.equal(escalRes.status, 403)
        assert.equal(crossPoRes.status, 403)

        // Çıkış -> Oturum gerçekten iptal edilmeli (eski JWT 401 dönmeli!)
        const logoutRes = await fetch(`${baseUrl}/api/supplier-portal/auth`, {
          method: "DELETE",
          headers,
        })
        assert.equal(logoutRes.status, 200)
        const afterLogout = await fetch(`${baseUrl}/api/supplier-portal`, { headers })
        assert.equal(afterLogout.status, 401, "Çıkış sonrası eski portal JWT geçersizleşmeli")
      })

      await check("İkinci tedarikçi (tedarikci.yalova) yalnızca Yalova verisini görmeli", async () => {
        const jar = new Map<string, string>()
        const loginRes = await fetch(`${baseUrl}/api/supplier-portal/auth`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ username: "tedarikci.yalova", password: process.env.DEMO_PORTAL_PASS || "demo123" }),
        })
        assert.equal(loginRes.status, 200)
        parseSetCookies(loginRes, jar)
        const res = await fetch(`${baseUrl}/api/supplier-portal`, { headers: { Cookie: cookieHeader(jar) } })
        assert.equal(res.status, 200)
        const json = await res.json()
        assert.equal(json.supplier.id, "sup-yalova-02")
        assert.ok(json.purchaseOrders.some((p: any) => p.id === "f3-po-conf-yalova"))
      })

      await check("Admin oturumu: /api/procurement, /api/wms?section=open_asns, davet tokenı, perspektif geçişi & dönüş", async () => {
        const adminJar = new Map<string, string>()
        const admLogin = await fetch(`${baseUrl}/api/auth/demo`, { method: "POST" })
        assert.equal(admLogin.status, 200)
        parseSetCookies(admLogin, adminJar)
        assert.ok(adminJar.get("auth-token"))

        const admHeaders = { Cookie: cookieHeader(adminJar) }
        const [procRes, wmsAsnRes] = await Promise.all([
          fetch(`${baseUrl}/api/procurement`, { headers: admHeaders }),
          fetch(`${baseUrl}/api/wms?section=open_asns`, { headers: admHeaders }),
        ])
        assert.equal(procRes.status, 200)
        const procJson = await procRes.json()
        assert.ok(procJson.suppliers.length >= 10)
        assert.ok(procJson.rfqs.length >= 2)
        assert.ok(procJson.purchaseOrders.length >= 8)
        assert.ok(procJson.eoqPolicies.length >= 4)

        assert.equal(wmsAsnRes.status, 200)
        const wmsAsnJson = await wmsAsnRes.json()
        assert.ok(Array.isArray(wmsAsnJson.asns) && wmsAsnJson.asns.length >= 2)

        // Admin oturumu ile harici EDI DESADV adaptör testi -> 200
        const targetPo = procJson.purchaseOrders.find(
          (p: any) =>
            p.supplierId === "sup-holland-01" &&
            !["TESLIM_ALINDI", "TAMAMLANDI", "IPTAL"].includes(p.status) &&
            Array.isArray(p.lines) &&
            p.lines.length > 0
        )
        assert.ok(targetPo, "EDI testi için uygun açık Holland PO bulunamadı")
        const ediAdmRes = await fetch(`${baseUrl}/api/edi/asn`, {
          method: "POST",
          headers: { ...admHeaders, "Content-Type": "application/json" },
          body: JSON.stringify({
            externalRef: `DESADV-HTTP-${Date.now()}`,
            supplierCode: "SUP-FLORA-01",
            poNumber: targetPo.poNumber,
            waybillNo: "IRS-HTTP-EDI",
            expectedArrivalAt: new Date(Date.now() + 86_400_000).toISOString(),
            lines: [{ sku: targetPo.lines[0].sku, shippedQty: 15, lotNumber: "LOT-HTTP-01" }],
          }),
        })
        assert.equal(ediAdmRes.status, 200)
        const ediAdmJson = await ediAdmRes.json()
        assert.equal(ediAdmJson.asn?.sourceChannel, "EDI_DESADV")

        // Davet linki üret & exchange sonrası yetki sınırını doğrula
        const invCreate = await fetch(`${baseUrl}/api/procurement`, {
          method: "POST",
          headers: { ...admHeaders, "Content-Type": "application/json" },
          body: JSON.stringify({
            action: "create_portal_invite",
            supplierId: "sup-pasabahce-03",
            purpose: "PORTAL_ACCESS",
          }),
        })
        assert.equal(invCreate.status, 200)
        const invJson = await invCreate.json()
        assert.ok(invJson.token)

        const invVerify = await fetch(
          `${baseUrl}/api/supplier-portal/invite?token=${encodeURIComponent(invJson.token)}`
        )
        assert.equal(invVerify.status, 200)

        const invJar = new Map<string, string>()
        const invEx = await fetch(`${baseUrl}/api/supplier-portal/invite/exchange`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ token: invJson.token }),
        })
        assert.equal(invEx.status, 200)
        parseSetCookies(invEx, invJar)
        const invProcCheck = await fetch(`${baseUrl}/api/procurement`, {
          headers: { Cookie: cookieHeader(invJar) },
        })
        assert.equal(invProcCheck.status, 403, "Davet tokenından üretilen oturum ERP içi API'ye erişememeli")

        // Perspektif Geçişi (Admin -> Demo Tedarikçi -> Geri Dönüş)
        const swRes = await fetch(`${baseUrl}/api/supplier-portal/demo`, {
          method: "POST",
          headers: { ...admHeaders, "Content-Type": "application/json" },
          body: JSON.stringify({ action: "switch_to_supplier", username: "tedarikci.royal" }),
        })
        assert.equal(swRes.status, 200)
        const swJar = new Map<string, string>(adminJar)
        parseSetCookies(swRes, swJar)
        assert.ok(swJar.get("admin-return-token"), "Perspektif geçişinde admin-return-token ayarlanmalı")

        const swHeaders = { Cookie: cookieHeader(swJar) }
        const [swProcRes, swPortalRes] = await Promise.all([
          fetch(`${baseUrl}/api/procurement`, { headers: swHeaders }),
          fetch(`${baseUrl}/api/supplier-portal`, { headers: swHeaders }),
        ])
        assert.equal(swProcRes.status, 403, "Tedarikçi perspektifindeyken ERP satınalma API'si 403 dönmeli")
        assert.equal(swPortalRes.status, 200)

        const restoreRes = await fetch(`${baseUrl}/api/supplier-portal/demo`, {
          method: "POST",
          headers: { ...swHeaders, "Content-Type": "application/json" },
          body: JSON.stringify({ action: "restore_admin" }),
        })
        assert.equal(restoreRes.status, 200)
        const restJar = new Map<string, string>(swJar)
        parseSetCookies(restoreRes, restJar)
        assert.equal(restJar.get("admin-return-token"), undefined)

        const backProcRes = await fetch(`${baseUrl}/api/procurement`, {
          headers: { Cookie: cookieHeader(restJar) },
        })
        assert.equal(backProcRes.status, 200, "Admin perspektifine dönüş sonrası /api/procurement tekrar 200 dönmeli")
      })

      await check("Sayfa SSR yanıt kodları (200 OK): /dashboard/* & /tedarikci-portali", async () => {
        const admJar = new Map<string, string>()
        const admLogin = await fetch(`${baseUrl}/api/auth/demo`, { method: "POST" })
        parseSetCookies(admLogin, admJar)
        const headers = { Cookie: cookieHeader(admJar) }

        for (const p of [
          "/dashboard/satinalma",
          "/dashboard/wms",
          "/dashboard/stok",
          "/dashboard/omnichannel",
          "/dashboard/uretim",
          "/tedarikci-portali",
        ]) {
          const r = await fetch(`${baseUrl}${p}`, { headers, redirect: "manual" })
          assert.equal(r.status, 200, `Sayfa ${p} HTTP ${r.status} döndürdü`)
        }
      })
    } else if (mode === "demo-off") {
      await check("Demo OFF: /api/system-config logisticsDemoMode=false & /api/supplier-portal/demo 403", async () => {
        const [sysRes, demoGet, demoPostLogin, demoPostSwitch] = await Promise.all([
          fetch(`${baseUrl}/api/system-config`),
          fetch(`${baseUrl}/api/supplier-portal/demo`),
          fetch(`${baseUrl}/api/supplier-portal/demo`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ action: "demo_supplier_login" }),
          }),
          fetch(`${baseUrl}/api/supplier-portal/demo`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ action: "switch_to_supplier" }),
          }),
        ])

        assert.equal(sysRes.status, 200)
        const sysJson = await sysRes.json()
        assert.equal(sysJson.logisticsDemoMode, false)

        for (const r of [demoGet, demoPostLogin, demoPostSwitch]) {
          assert.equal(r.status, 403, `Demo OFF iken demo endpoint ${r.status} yerine 403 dönmeli`)
          const j = await r.json()
          assert.equal(j.code, "DEMO_MODE_DISABLED")
        }
      })

      await check("Demo OFF iken gerçek kullanıcı adı/şifre portal girişi çalışmaya devam etmeli", async () => {
        const jar = new Map<string, string>()
        const loginRes = await fetch(`${baseUrl}/api/supplier-portal/auth`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ username: "tedarikci.royal", password: process.env.DEMO_PORTAL_PASS || "demo123" }),
        })
        assert.equal(loginRes.status, 200)
        parseSetCookies(loginRes, jar)
        const portalRes = await fetch(`${baseUrl}/api/supplier-portal`, {
          headers: { Cookie: cookieHeader(jar) },
        })
        assert.equal(portalRes.status, 200)
        const portalJson = await portalRes.json()
        assert.equal(portalJson.supplier.id, "sup-holland-01")
      })
    }
  } finally {
    if (dbSnapshot !== null) {
      fs.writeFileSync(dbPath, dbSnapshot, "utf8")
    }
  }

  console.log(`\n🎉 HTTP DOĞRULAMA (${mode}) TAMAMLANDI (${passed}/${passed})`)
}

run()
  .catch((err) => {
    console.error("❌ HTTP E2E HATASI:", err)
    process.exit(1)
  })
  .then(() => process.exit(0))
