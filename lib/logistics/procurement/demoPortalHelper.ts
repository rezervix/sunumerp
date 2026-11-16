/**
 * Lojistik Faz 3 — Demo Kolaylık Katmanı (Tedarikçi Portalı Hızlı Giriş & Perspektif Geçişi)
 *
 * ÖNEMLİ İZOLASYON KURALI:
 * - Bu modül YALNIZCA demo kolaylıkları içindir (geliştirme/sunum ortamı).
 * - Tek merkezi şalter olan `isDemoEnvironment()` false döndüğünde TÜM fonksiyonları `403 DEMO_MODE_DISABLED` döner.
 * - Tedarikçi girişi YALNIZCA en kısıtlı "Tedarikçi" rolünü (`tedarikci.royal` -> `sup-holland-01`) verir;
 *   asla Super Admin veya şirket içi yetki vermez.
 * - Perspektif geçişi ("Şirket Yöneticisi <-> Tedarikçi Portalı") SADECE mevcut oturumu doğrulanmış
 *   iç yönetici için kısa ömürlü, HMAC imzalı `admin-return-token` saklar; doğrudan tedarikçi girişinde
 *   asla `admin-return-token` üretilmez.
 */

import crypto from "crypto"
import { SignJWT } from "jose"
import { prisma } from "@/lib/db"
import { isDemoEnvironment } from "@/lib/config/production-feature-flags"
import { getAuthPayload, isPlatformDeveloperUser, isSuperAdminUser } from "@/lib/auth/server-permission"
import { DEBUG_USER_ID } from "@/lib/auth/local-debug"
import { LogisticsDomainError } from "@/lib/logistics/security"
import { issueSupplierPortalSessionToken } from "./portalService"

export const ADMIN_RETURN_COOKIE_NAME = "admin-return-token"
const JWT_SECRET = process.env.JWT_SECRET || "super-secret-key-change-this"
const RETURN_SECRET = process.env.ADMIN_RETURN_SECRET || `${JWT_SECRET}-return-perspective`

interface AdminReturnTokenPayload {
  adminUserId: string
  adminUsername: string
  adminSessionId: string
  exp: number
}

function assertDemoModeActive() {
  if (!isDemoEnvironment()) {
    throw new LogisticsDomainError(
      "DEMO_MODE_DISABLED",
      "Demo kolaylıkları kapalıdır (ENABLE_DEMO_MODE=false / DISABLE_DEMO_MODE=true).",
      403
    )
  }
}

function signAdminReturnToken(payload: AdminReturnTokenPayload): string {
  const b64 = Buffer.from(JSON.stringify(payload), "utf8").toString("base64url")
  const sig = crypto.createHmac("sha256", RETURN_SECRET).update(b64).digest("base64url")
  return `${b64}.${sig}`
}

export function verifyAdminReturnToken(token?: string | null): AdminReturnTokenPayload | null {
  if (!token || !isDemoEnvironment()) return null
  const parts = token.split(".")
  if (parts.length !== 2) return null
  const [b64, sig] = parts
  const expected = crypto.createHmac("sha256", RETURN_SECRET).update(b64).digest("base64url")
  const a = Buffer.from(sig, "utf8")
  const b = Buffer.from(expected, "utf8")
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return null
  try {
    const parsed = JSON.parse(Buffer.from(b64, "base64url").toString("utf8")) as AdminReturnTokenPayload
    if (!parsed?.adminUserId || !parsed?.exp || Math.floor(Date.now() / 1000) > parsed.exp) {
      return null
    }
    return parsed
  } catch {
    return null
  }
}

export async function getDemoPortalPublicState(adminReturnCookie?: string | null) {
  if (!isDemoEnvironment()) {
    return {
      demoModeEnabled: false,
      hasAdminReturnToken: false,
      demoAccounts: [],
    }
  }

  const users = await prisma.user.findMany({
    include: { branches: { include: { role: true } } },
  })
  const suppliers = await prisma.supplier.findMany()
  const supMap = new Map(suppliers.map((s: any) => [s.id, s]))

  const demoAccounts = users
    .filter(
      (u: any) =>
        u.isActive &&
        u.supplierId &&
        (u.branches || []).some((b: any) => b.role?.name === "Tedarikçi")
    )
    .map((u: any) => {
      const s = supMap.get(u.supplierId)
      if (!s || !s.isActive || s.approvalStatus === "KARALISTE") return null
      return {
        username: u.username,
        fullName: u.fullName,
        supplierId: s.id,
        supplierCode: s.code,
        supplierName: s.name,
        category: s.category || "GENEL",
      }
    })
    .filter(Boolean)

  const returnData = verifyAdminReturnToken(adminReturnCookie)

  return {
    demoModeEnabled: true,
    hasAdminReturnToken: Boolean(returnData),
    returnAdminUsername: returnData?.adminUsername ?? null,
    demoAccounts,
  }
}

export async function loginAsDemoSupplier(preferredUsername: string = "tedarikci.royal") {
  assertDemoModeActive()

  const users = await prisma.user.findMany({
    include: { branches: { include: { role: true } } },
  })
  const targetUser =
    users.find((u: any) => u.username === preferredUsername && u.isActive && u.supplierId) ||
    users.find(
      (u: any) =>
        u.isActive &&
        u.supplierId &&
        (u.branches || []).some((b: any) => b.role?.name === "Tedarikçi")
    )

  if (!targetUser) {
    throw new LogisticsDomainError(
      "DEMO_SUPPLIER_NOT_FOUND",
      "Demo tedarikçi kullanıcısı (tedarikci.royal) bulunamadı. Önce Faz 3 demo verisini yükleyin.",
      404
    )
  }

  return issueSupplierPortalSessionToken(targetUser.id)
}

export async function switchAdminPerspectiveToDemoSupplier(preferredUsername: string = "tedarikci.royal") {
  assertDemoModeActive()

  const payload = await getAuthPayload()
  if (!payload) {
    throw new LogisticsDomainError("UNAUTHENTICATED", "Perspektif geçişi için yönetici oturumu gerekir.", 401)
  }

  const adminUser: any = await prisma.user.findUnique({
    where: { id: payload.userId },
    include: { branches: { include: { role: true } } },
  })

  // Local debug user veya gerçek admin kullanıcı olabilir — her iki durumda da Tedarikçi rolünden dönmeye izin verme
  const roleNames = (adminUser?.branches || []).map((b: any) => b.role?.name).filter(Boolean)
  const [superAdmin, platformDev] = await Promise.all([
    isSuperAdminUser(payload.userId),
    isPlatformDeveloperUser(payload.userId, payload.username),
  ])
  const isSupplierOnly = roleNames.includes("Tedarikçi") && !superAdmin && !platformDev

  if (isSupplierOnly) {
    throw new LogisticsDomainError(
      "FORBIDDEN_ESCALATION",
      "Tedarikçi oturumu üzerinden şirket yöneticisi dönüş imzası oluşturulamaz.",
      403
    )
  }

  const returnPayload: AdminReturnTokenPayload = {
    adminUserId: payload.userId,
    adminUsername: payload.username,
    adminSessionId: payload.sessionId || "local-debug-session",
    exp: Math.floor(Date.now() / 1000) + 2 * 3600, // 2 saatlik geri dönüş penceresi
  }
  const returnToken = signAdminReturnToken(returnPayload)
  const supplierSession = await loginAsDemoSupplier(preferredUsername)

  return {
    supplierSession,
    returnToken,
  }
}

export async function restoreAdminPerspective(returnCookieValue?: string | null) {
  assertDemoModeActive()

  const verified = verifyAdminReturnToken(returnCookieValue)
  if (!verified) {
    throw new LogisticsDomainError(
      "INVALID_RETURN_TOKEN",
      "Yönetici görünümüne dönüş anahtarı geçersiz veya süresi dolmuş.",
      401
    )
  }

  if (verified.adminUserId === DEBUG_USER_ID) {
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000)
    const secret = new TextEncoder().encode(JWT_SECRET)
    const adminJwt = await new SignJWT({
      userId: verified.adminUserId,
      username: verified.adminUsername || "admin",
    })
      .setProtectedHeader({ alg: "HS256" })
      .setExpirationTime("24h")
      .sign(secret)
    return {
      token: adminJwt,
      expiresAt,
      username: verified.adminUsername || "admin",
      redirectPath: "/dashboard/satinalma",
    }
  }

  const adminUser: any = await prisma.user.findUnique({
    where: { id: verified.adminUserId },
    include: { branches: { include: { role: true } } },
  })

  if (!adminUser || !adminUser.isActive) {
    throw new LogisticsDomainError("ADMIN_USER_NOT_FOUND", "Dönülecek yönetici hesabı aktif değil.", 401)
  }

  const roleNames = (adminUser.branches || []).map((b: any) => b.role?.name).filter(Boolean)
  if (roleNames.includes("Tedarikçi") && !roleNames.some((r: string) => ["Super Admin", "Genel Mudur", "Branch Admin"].includes(r))) {
    throw new LogisticsDomainError("FORBIDDEN_ESCALATION", "Dönüş hesabı yönetici yetkisine sahip değil.", 403)
  }

  const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000)
  const session = await prisma.userSession.create({
    data: {
      userId: adminUser.id,
      tokenHash: crypto
        .createHash("sha256")
        .update(`admin-return:${adminUser.id}:${Date.now()}:${crypto.randomUUID()}`)
        .digest("hex"),
      expiresAt,
      isActive: true,
    },
  })

  const secret = new TextEncoder().encode(JWT_SECRET)
  const adminJwt = await new SignJWT({
    userId: adminUser.id,
    username: adminUser.username,
    sessionId: session.id,
  })
    .setProtectedHeader({ alg: "HS256" })
    .setExpirationTime("24h")
    .sign(secret)

  return {
    token: adminJwt,
    expiresAt,
    username: adminUser.username,
    redirectPath: "/dashboard/satinalma",
  }
}
