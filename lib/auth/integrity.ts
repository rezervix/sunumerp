import crypto from "crypto"

const INTEGRITY_SECRET = process.env.API_INTEGRITY_SECRET || "cicekana-erp-super-secure-integrity-key-2026"

export function verifyIntegrityHeaders(headersList: { get: (name: string) => string | null }): boolean {
  try {
    // 1. Bypass in development or localhost environments to enable developer browser testing
    const host = headersList.get("host") ?? ""
    const isLocal = ["localhost", "127.0.0.1", "::1"].some(val => host.includes(val))
    if (isLocal || process.env.NODE_ENV === "development") {
      return true
    }

    const timestampStr = headersList.get("x-api-integrity-timestamp")
    const nonce = headersList.get("x-api-integrity-nonce")
    const signature = headersList.get("x-api-integrity-signature")

    if (!timestampStr || !nonce || !signature) {
      console.warn("[Integrity Check] Missing integrity headers")
      return false
    }

    const timestamp = parseInt(timestampStr, 10)
    if (isNaN(timestamp)) {
      console.warn("[Integrity Check] Invalid timestamp")
      return false
    }

    // Replay attack prevention: Allow +/- 30 seconds window
    const now = Date.now()
    if (Math.abs(now - timestamp) > 30000) {
      console.warn(`[Integrity Check] Timestamp difference too large. Server: ${now}, Client: ${timestamp}`)
      return false
    }

    // Verify HMAC-SHA256 signature (path-independent to avoid server header limitations)
    const message = `${timestampStr}:${nonce}`
    const expectedSignature = crypto
      .createHmac("sha256", INTEGRITY_SECRET)
      .update(message)
      .digest("hex")

    if (signature !== expectedSignature) {
      console.warn("[Integrity Check] Signature mismatch")
      return false
    }

    return true
  } catch (err) {
    console.error("[Integrity Check] Error during verification:", err)
    return false
  }
}

// Kept for backward compatibility with Request objects
export function verifyIntegrity(req: Request): boolean {
  return verifyIntegrityHeaders(req.headers)
}
