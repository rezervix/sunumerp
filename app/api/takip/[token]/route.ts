/**
 * Lojistik Faz 6 — Herkese Açık, Tahmin Edilemez & Süreli Müşteri Takip API'si
 *
 * Kurallar:
 * - Kimlik doğrulamasız çalışır ancak yalnızca CSPRNG 192-bit token bilinen durak bilgisini döndürür.
 * - Şirket içi maliyet/TCKN gibi hassas veriler asla açılmaz.
 * - Süresi dolmuş bağlantılarda HTTP 410 GONE döner.
 */

import { NextResponse } from "next/server"
import {
  assertLogisticsFeatureEnabled,
  handleLogisticsApiError,
} from "@/lib/logistics/security"
import { getPublicCustomerTrackingByToken } from "@/lib/logistics/dispatch"
import {
  checkRateLimit,
  resolveRequestClientIp,
} from "@/lib/security/rateLimiter"

export async function GET(
  req: Request,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const ip = resolveRequestClientIp(req.headers)
    const rl = checkRateLimit(`public-tracking:${ip}`, 60, 60_000)
    if (!rl.allowed) {
      return NextResponse.json(
        { success: false, code: "RATE_LIMIT_EXCEEDED", error: "Çok fazla takip sorgusu gönderildi." },
        { status: 429, headers: { "Retry-After": String(rl.retryAfterSec) } }
      )
    }

    assertLogisticsFeatureEnabled("lojistik_sevkiyat_rota")
    const { token } = await params
    const res = await getPublicCustomerTrackingByToken(token)

    if (!res.found) {
      return NextResponse.json(
        { success: false, code: "TRACKING_NOT_FOUND", error: "Takip bağlantısı bulunamadı." },
        { status: 404 }
      )
    }

    if (res.expired) {
      return NextResponse.json(
        {
          success: false,
          code: "TRACKING_EXPIRED",
          error: "Bu teslimat takip bağlantısının geçerlilik süresi dolmuştur.",
          orderRef: res.orderRef,
          expiredAt: res.expiredAt,
        },
        { status: 410 }
      )
    }

    return NextResponse.json(
      { success: true, tracking: res.tracking },
      { headers: { "Cache-Control": "no-store" } }
    )
  } catch (error) {
    return handleLogisticsApiError(error, "Takip bilgisi alınamadı.")
  }
}
