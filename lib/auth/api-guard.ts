import { NextResponse } from "next/server"
import { verifyIntegrity } from "./integrity"
import { getSystemConfig, isSecurityDisabled } from "../system-config"
import { verifyLicenseFingerprint } from "./fingerprint"
import { executeSelfDestruct } from "./self-destruct"

/**
 * Backend License & Subscription Guard Middleware
 * Protects all API endpoints against:
 * 1. HMAC API tampering / replay attacks (Layer 2 Integrity)
 * 2. Hardware / Domain cloning breaches (Layer 3 Fingerprint Verification)
 * 3. Unpaid or restricted subscription tier access (Subscription Paywall Guard)
 */
export async function apiGuard(req: Request, options: { bypassSubscription?: boolean } = {}): Promise<NextResponse | null> {
  // 1. Layer 2: API Integrity HMAC Signature Check
  if (!verifyIntegrity(req)) {
    console.warn(`[API Guard] Integrity signature check failed for route: ${req.url}`)
    return NextResponse.json({ error: "API Bütünlük Doğrulaması Başarısız" }, { status: 403 })
  }

  // 2. Layer 3: Hardware & Domain Fingerprint Verification
  if (!isSecurityDisabled() && !verifyLicenseFingerprint()) {
    console.error(`[API Guard] Hardware/Domain license fingerprint mismatch for route: ${req.url}`)
    await executeSelfDestruct()
    return NextResponse.json({ error: "Yetkisiz donanım veya sunucu kopyası tespit edildi. Sistem kilitlendi." }, { status: 403 })
  }

  // 3. Subscription Paywall & Tier Access Guard
  if (!options.bypassSubscription) {
    const config = getSystemConfig()

    // Permanent quarantine lockdown check
    if (config.tamperDetected && !isSecurityDisabled()) {
      return NextResponse.json({ error: "Güvenlik karantinası aktif. Hesap kilitlendi." }, { status: 403 })
    }

    const sub = config.subscription
    const isInactive = sub.status === "inactive" || sub.status === "suspended"

    if (isInactive) {
      return NextResponse.json({ error: "Aktif abonelik bulunmamaktadır. Lütfen ödeme yapın." }, { status: 403 })
    }

    // Paket 1 (Free) Tier limitations (Only 3 basic areas allowed)
    if (sub.plan === "free") {
      const url = new URL(req.url, "http://localhost")
      const path = url.pathname

      // Allowed APIs for Free tier
      const allowedPaths = [
        "/api/stats",
        "/api/settings",
        "/api/support-tickets",
        "/api/auth",
        "/api/system-config",
        "/api/iyzico"
      ]

      const isAllowed = allowedPaths.some(p => path.startsWith(p))
      if (!isAllowed) {
        console.warn(`[API Guard] Restricted route ${path} blocked on Free tier`)
        return NextResponse.json({ error: "Bu özelliğe erişmek için paketinizi yükseltin." }, { status: 403 })
      }
    }
  }

  return null
}
