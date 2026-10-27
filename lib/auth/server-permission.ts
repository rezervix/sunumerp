/**
 * Backend permission helper — API route'larında kullanılır.
 * Kullanıcının role/permission bilgisini veritabanından doğrular.
 */
import { prisma } from "@/lib/db"
import { cookies, headers } from "next/headers"
import { jwtVerify } from "jose"
import { NextResponse } from "next/server"
import { DEBUG_USER_ID } from "@/lib/auth/local-debug"
import { normalizePermissionResource, normalizePermissionsObject } from "@/lib/auth/permissions"
import { verifyIntegrityHeaders } from "./integrity"
import { getSystemConfig, isSecurityDisabled } from "@/lib/system-config"

const JWT_SECRET = process.env.JWT_SECRET || "super-secret-key-change-this"

export interface AuthPayload {
  userId: string
  username: string
  branchId?: string
  roleName?: string
  sessionId?: string
}

/**
 * Cookie'den JWT token'ı doğrular ve payload döndürür.
 * Oturum durumunu (UserSession) veritabanından doğrular.
 */
export async function getAuthPayload(): Promise<AuthPayload | null> {
  try {
    // 1. API Integrity Check (Phase 3)
    const headersList = await headers()
    if (!verifyIntegrityHeaders(headersList)) {
      console.warn("[getAuthPayload] API Integrity Verification Failed")
      return null
    }

    const cookieStore = await cookies()
    const token = cookieStore.get("auth-token")?.value
    if (!token) return null

    const secret = new TextEncoder().encode(JWT_SECRET)
    const { payload } = await jwtVerify(token, secret)
    const authPayload = payload as unknown as AuthPayload

    // Debug kullanıcısı ise veritabanı kontrolünü atla — yalnızca development ortamında geçerlidir
    if (authPayload.userId === DEBUG_USER_ID && process.env.NODE_ENV !== "production") {
      return authPayload
    }

    // Oturum (Session) geçerlilik kontrolü
    if (authPayload.sessionId) {
      const session = await prisma.userSession.findUnique({
        where: { id: authPayload.sessionId }
      })
      if (!session || !session.isActive || session.revokedAt) {
        console.warn(`[getAuthPayload] Session ${authPayload.sessionId} is inactive or revoked.`)
        return null
      }
    } else {
      // sessionId yoksa (eski token) sadece kullanıcının aktifliğini doğrula
      const user = await prisma.user.findUnique({ where: { id: authPayload.userId } })
      if (!user || !user.isActive) {
        return null
      }
    }

    return authPayload
  } catch {
    return null
  }
}

/**
 * Kullanıcının belirli bir şubedeki rolünü veritabanından getirir.
 * Super Admin ise her zaman true döner.
 */
export async function checkPermission(
  userId: string,
  branchId: string | undefined,
  resource: string,
  action: string
): Promise<boolean> {
  try {
    if (branchId) {
      const userBranchRole = await prisma.userBranchRole.findUnique({
        where: { userId_branchId: { userId, branchId } },
        include: { role: true },
      })

      if (!userBranchRole?.role) return false

      const roleName = userBranchRole.role.name
      if (roleName === "Super Admin" || roleName === "Yonetim Kurulu Uyesi" || roleName === "Genel Mudur") {
        return true
      }

      // Parse permissions JSON
      let permissions: Record<string, string[]> = {}
      try {
        permissions = JSON.parse(userBranchRole.role.permissions)
      } catch {
        return false
      }

      const normalizedPermissions = normalizePermissionsObject(permissions)
      const resourcePerms = normalizedPermissions[resource]
      return Array.isArray(resourcePerms) && resourcePerms.includes(action)
    }

    // Branch-independent permission check: allow if any branch grants this permission.
    const userBranchRoles = await prisma.userBranchRole.findMany({
      where: { userId },
      include: { role: true },
    })

    for (const userBranchRole of userBranchRoles) {
      const roleName = userBranchRole.role?.name
      if (roleName === "Super Admin" || roleName === "Yonetim Kurulu Uyesi" || roleName === "Genel Mudur") {
        return true
      }
      if (!userBranchRole.role) continue

      let permissions: Record<string, string[]> = {}
      try {
        permissions = JSON.parse(userBranchRole.role.permissions)
      } catch {
        continue
      }

      const normalizedPermissions = normalizePermissionsObject(permissions)
      const resourcePerms = normalizedPermissions[resource]
      if (Array.isArray(resourcePerms) && resourcePerms.includes(action)) {
        return true
      }
    }

    return false
  } catch {
    return false
  }
}

/**
 * Kullanıcının Super Admin veya yetkili üst rol olup olmadığını kontrol eder.
 * Herhangi bir şubede Super Admin rolü varsa true döner.
 */
export async function isSuperAdminUser(userId: string): Promise<boolean> {
  // DEBUG_USER_ID bypass yalnızca development ortamında etkin
  if (userId === DEBUG_USER_ID && process.env.NODE_ENV !== "production") return true

  try {
    const adminRoles = await prisma.userBranchRole.findFirst({
      where: {
        userId,
        role: {
          name: {
            in: ["Super Admin", "Yonetim Kurulu Uyesi", "Genel Mudur"],
          },
        },
      },
    })
    return !!adminRoles
  } catch {
    return false
  }
}

/**
 * Platform Geliştiricisi yetkisi kontrolü.
 *
 * Öncelik sırası (Tier sistemi):
 *   1. DB Rolü (PRIMARY): "Platform Developer", "Developer", "Geliştirici"
 *   2. DEVELOPER_USERNAMES env (EMERGENCY FALLBACK): Yalnızca açıkça tanımlandıysa aktif.
 *      Production'da varsayılan olarak KAPALI. .env'e `DEVELOPER_USERNAMES=kullanici1,kullanici2`
 *      şeklinde eklenmedikçe etkisiz.
 *   3. DEBUG bypass (SADECE development): NODE_ENV !== "production" koşulunda local-debug user.
 */
export async function isPlatformDeveloperUser(userId: string, username?: string): Promise<boolean> {
  // Tier 3: DEBUG bypass — yalnızca development ortamında aktif
  if (userId === DEBUG_USER_ID && process.env.NODE_ENV !== "production") return true

  // Tier 1: DB Rolü — her ortamda birincil kontrol
  try {
    const devRole = await prisma.userBranchRole.findFirst({
      where: {
        userId,
        role: {
          name: {
            // Super Admin bilerek hariç: süper yönetici ≠ platform geliştirici
            in: ["Platform Developer", "Developer", "Geliştirici"],
          },
        },
      },
    })
    if (devRole) return true
  } catch {
    // DB hatası → Tier 2'ye geç
  }

  // Tier 2: DEVELOPER_USERNAMES env — acil durum fallback, explicit opt-in gerekli
  // Bu env değişkeni tanımlanmamışsa (boş string veya yok) hiçbir username eşleşmez.
  const rawEnv = process.env.DEVELOPER_USERNAMES ?? ""
  if (rawEnv.trim() && username) {
    const envUsernames = rawEnv.split(",").map(u => u.trim().toLowerCase()).filter(Boolean)
    if (envUsernames.includes(username.toLowerCase())) {
      return true
    }
  }

  return false
}


/**
 * Geliştirici Konsolu API endpoint'leri için özel guard.
 */
export async function requirePlatformDeveloper(): Promise<{ payload: AuthPayload } | NextResponse> {
  const payload = await getAuthPayload()
  if (!payload) {
    return NextResponse.json({ error: "Yetkisiz erişim" }, { status: 401 })
  }

  const isDev = await isPlatformDeveloperUser(payload.userId, payload.username)
  if (!isDev) {
    return NextResponse.json({ error: "Erişim Reddedildi: Yalnızca platform geliştiricisi bu alana erişebilir." }, { status: 403 })
  }

  return { payload }
}

/**
 * Route handler için hazır permission guard.
 * Yetkisizse 403 NextResponse döndürür, yetkililiyse null döner.
 */
export async function requirePermission(
  resource: string,
  action: string,
  branchId?: string
): Promise<{ payload: AuthPayload } | NextResponse> {
  const payload = await getAuthPayload()
  if (!payload) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  // 2. Subscription & Tamper Quarantine Check (Phase 2 & Phase 4)
  const config = getSystemConfig()
  if (config.tamperDetected && !isSecurityDisabled()) {
    return NextResponse.json({ error: "Hesap kilitlendi: Guvenlik Ihlali Tespit Edildi" }, { status: 403 })
  }

  const sub = config.subscription
  const isInactive = sub.status === "inactive" || sub.status === "suspended"
  
  if (isInactive) {
    return NextResponse.json({ error: "Aktif abonelik bulunmamaktadir. Lutfen odeme yapin." }, { status: 403 })
  }

  if (sub.plan === "free") {
    const allowedResources = ["dashboard", "settings", "support-tickets", "technicalSupport"]
    if (!allowedResources.includes(resource)) {
      return NextResponse.json({ error: "Bu kuruluma erismek icin paketinizi yukseltin." }, { status: 403 })
    }
  }

  // Local debug kullanıcısı otomatik olarak tüm yetkilere sahip olur — yalnızca development
  if (payload.userId === DEBUG_USER_ID && process.env.NODE_ENV !== "production") {
    return { payload }
  }

  // Super admin kontrolü
  const superAdmin = await isSuperAdminUser(payload.userId)
  if (superAdmin) return { payload }

  // Branch-specific or branch-independent permission kontrolü
  const targetBranchId = branchId || payload.branchId
  const normalizedResource = normalizePermissionResource(resource)
  const allowed = await checkPermission(payload.userId, targetBranchId, normalizedResource, action)
  if (!allowed) {
    return NextResponse.json(
      { error: "Bu islem icin yetkiniz bulunmamaktadir" },
      { status: 403 }
    )
  }

  return { payload }
}
