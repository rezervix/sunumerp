import { NextResponse } from "next/server"
import { cookies } from "next/headers"
import { jwtVerify } from "jose"
import { prisma } from "@/lib/db"
import { handleLogisticsApiError } from "@/lib/logistics/security"
import { authenticateSupplierPortalCredentials, ADMIN_RETURN_COOKIE_NAME } from "@/lib/logistics/procurement"
import {
  checkRateLimit,
  resolveRequestClientIp,
} from "@/lib/security/rateLimiter"

const JWT_SECRET = process.env.JWT_SECRET || "super-secret-key-change-this"

export async function POST(request: Request) {
  try {
    const ip = resolveRequestClientIp(request.headers)
    const rl = checkRateLimit(`portal-auth:${ip}`, 20, 60_000)
    if (!rl.allowed) {
      return NextResponse.json(
        { success: false, code: "RATE_LIMIT_EXCEEDED", error: "Çok fazla giriş denemesi. Lütfen bekleyin." },
        { status: 429, headers: { "Retry-After": String(rl.retryAfterSec) } }
      )
    }

    const body = await request.json()
    const result = await authenticateSupplierPortalCredentials({
      username: String(body.username || ""),
      password: String(body.password || ""),
    })

    const cookieStore = await cookies()
    cookieStore.set("auth-token", result.token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      expires: result.expiresAt,
      path: "/",
    })
    // Doğrudan tedarikçi girişinde asla admin dönüş çerezi taşınmaz
    cookieStore.delete(ADMIN_RETURN_COOKIE_NAME)

    return NextResponse.json({
      success: true,
      user: result.user,
      supplier: result.supplier,
      message: `${result.supplier.name} tedarikçi portalı oturumu açıldı.`,
    })
  } catch (err) {
    return handleLogisticsApiError(err, "Tedarikçi portal girişi başarısız.")
  }
}

export async function DELETE() {
  try {
    const cookieStore = await cookies()
    const token = cookieStore.get("auth-token")?.value
    if (token) {
      try {
        const secret = new TextEncoder().encode(JWT_SECRET)
        const { payload } = await jwtVerify(token, secret)
        if (payload.sessionId) {
          await prisma.userSession.updateMany({
            where: { id: String(payload.sessionId) },
            data: { isActive: false, revokedAt: new Date() },
          })
        }
      } catch {
        // Geçersiz token olsa bile çerezi temizle
      }
    }

    cookieStore.delete("auth-token")
    cookieStore.delete(ADMIN_RETURN_COOKIE_NAME)

    return NextResponse.json({ success: true, message: "Tedarikçi portalı oturumu kapatıldı." })
  } catch (err) {
    return handleLogisticsApiError(err, "Çıkış yapılırken hata oluştu.")
  }
}
