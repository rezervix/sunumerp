/**
 * Lojistik Faz 5 (lojistik_filo) — Güvenli Telematik Webhook Alıcısı
 *
 * Desteklenen Profiller (Onaylı): Traccar, flespi, GpsGate Cloud ve Genel Webhook (özel alan eşlemeli)
 * Güvenlik:
 * - lojistik_filo özellik bayrağı kontrolü
 * - HMAC-SHA256 imza (X-Telematics-Signature / X-Hub-Signature-256) veya X-Api-Key / Authorization token doğrulama
 * - DISABLE_DEMO_MODE=true iken demo gizli anahtar fallback'i tamamen kapalıdır (fail-closed 401)
 */

import { NextResponse } from "next/server"
import {
  assertLogisticsFeatureEnabled,
  handleLogisticsApiError,
} from "@/lib/logistics/security"
import {
  ingestTelematicsPayloads,
  verifyTelematicsWebhookAuth,
} from "@/lib/logistics/fleet"
import {
  checkRateLimit,
  resolveRequestClientIp,
} from "@/lib/security/rateLimiter"

export async function POST(req: Request) {
  try {
    const ip = resolveRequestClientIp(req.headers)
    const rl = checkRateLimit(`webhook-telematics:${ip}`, 180, 60_000)
    if (!rl.allowed) {
      return NextResponse.json(
        { success: false, code: "RATE_LIMIT_EXCEEDED", error: "Telematik hız limiti aşıldı." },
        { status: 429, headers: { "Retry-After": String(rl.retryAfterSec) } }
      )
    }

    assertLogisticsFeatureEnabled("lojistik_filo")

    const { searchParams } = new URL(req.url)
    const providerCode = String(
      searchParams.get("provider") ||
        req.headers.get("x-telematics-provider") ||
        "GENERIC_WEBHOOK"
    )
      .trim()
      .toUpperCase()

    const rawBody = await req.text()
    const authCheck = verifyTelematicsWebhookAuth({
      providerCode,
      rawBody,
      headers: req.headers,
    })

    if (!authCheck.verified) {
      return NextResponse.json(
        {
          success: false,
          code: "UNAUTHORIZED_TELEMATICS_WEBHOOK",
          error: authCheck.reason || "Telematik webhook doğrulaması başarısız.",
        },
        { status: 401 }
      )
    }

    let parsed: any
    try {
      parsed = JSON.parse(rawBody || "{}")
    } catch {
      return NextResponse.json(
        { success: false, code: "INVALID_JSON", error: "Geçersiz JSON gövdesi." },
        { status: 400 }
      )
    }

    const payloads: Array<Record<string, any>> = Array.isArray(parsed)
      ? parsed
      : Array.isArray(parsed.events)
        ? parsed.events
        : Array.isArray(parsed.messages)
          ? parsed.messages
          : [parsed]

    const result = await ingestTelematicsPayloads({
      providerCode,
      payloads,
      sourceOrigin: "WEBHOOK",
      customFieldMapping: parsed.customFieldMapping || null,
    })

    return NextResponse.json({
      success: true,
      authMethod: authCheck.method,
      ...result,
    })
  } catch (error) {
    return handleLogisticsApiError(error, "Telematik webhook işlenemedi.")
  }
}
