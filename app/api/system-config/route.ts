import { NextResponse } from "next/server"
import { getSystemConfig, saveSystemConfig, resetSystemConfig } from "@/lib/system-config"
import { verifyIntegrity } from "@/lib/auth/integrity"
import { createAuditLog } from "@/lib/audit"
import { cookies } from "next/headers"
import { jwtVerify } from "jose"
import { isSuperAdminUser, isPlatformDeveloperUser } from "@/lib/auth/server-permission"

const JWT_SECRET = process.env.JWT_SECRET || "super-secret-key-change-this"

async function getAuthUser() {
  try {
    const cookieStore = await cookies()
    const token = cookieStore.get("auth-token")?.value
    if (!token) return null
    const secret = new TextEncoder().encode(JWT_SECRET)
    const { payload } = await jwtVerify(token, secret)
    return payload
  } catch {
    return null
  }
}

/**
 * Hassas alanları yanıttan çıkarır.
 * logoUrl (base64 büyük veri), API anahtarları ve kullanıcıya gösterilmemesi
 * gereken alanlar kaldırılır.
 */
function maskSensitiveFields(config: ReturnType<typeof getSystemConfig>) {
  const { integrations, logoUrl, bgRemovedLogoUrl, ...safe } = config
  return {
    ...safe,
    // logo URL'lerini meta veriye indir (base64 ham veriyi döndürme)
    hasLogo: Boolean(logoUrl),
    hasBgRemovedLogo: Boolean(bgRemovedLogoUrl),
    // Integration alan adlarını açıkla ama değerlerini maskele
    integrations: integrations ? {
      efaturaProvider: integrations.efaturaProvider || "",
      kargoProvider: integrations.kargoProvider || "",
      // API anahtarlarını maskeliyoruz — frontend'e ham key gönderme
      hasEfaturaApiKey: Boolean(integrations.efaturaApiKey),
      hasKargoApiKey: Boolean(integrations.kargoApiKey),
      hasIyzicoApiKey: Boolean(integrations.iyzicoApiKey),
      hasIyzicoSecretKey: Boolean(integrations.iyzicoSecretKey),
    } : undefined,
  }
}

/**
 * GET /api/system-config
 * Public sistem yapılandırması — hassas alanlar maskelenir.
 * Yalnızca API Integrity imzası doğrulaması gerekir (session gerekmez,
 * çünkü login sayfası gibi auth öncesi ekranlar da bu endpoint'i kullanır).
 */
export async function GET(req: Request) {
  if (!verifyIntegrity(req)) {
    return NextResponse.json({ error: "API Integrity Verification Failed" }, { status: 403 })
  }

  const config = getSystemConfig()
  return NextResponse.json(maskSensitiveFields(config))
}

/**
 * POST /api/system-config
 * Sistem ayarlarını günceller.
 * Yalnızca Super Admin veya Platform Developer güncelleyebilir.
 */
export async function POST(req: Request) {
  if (!verifyIntegrity(req)) {
    return NextResponse.json({ error: "API Integrity Verification Failed" }, { status: 403 })
  }

  try {
    const user = await getAuthUser()
    if (!user?.userId) {
      return NextResponse.json({ error: "Yetkisiz erişim: Oturum açmanız gerekiyor." }, { status: 401 })
    }

    // Yalnızca Super Admin veya Platform Developer ayar güncelleyebilir
    const [isSA, isDev] = await Promise.all([
      isSuperAdminUser(user.userId as string),
      isPlatformDeveloperUser(user.userId as string, user.username as string | undefined)
    ])

    if (!isSA && !isDev) {
      return NextResponse.json(
        { error: "Bu işlem için yetkiniz bulunmuyor. Yalnızca Süper Yönetici veya Platform Geliştiricisi sistem ayarlarını değiştirebilir." },
        { status: 403 }
      )
    }

    const body = await req.json()
    const updated = saveSystemConfig(body)

    await createAuditLog({
      userId: user.userId as string,
      action: "UPDATE_SYSTEM_CONFIG",
      resource: "SYSTEM_SETTINGS",
      details: { updatedKeys: Object.keys(body), role: isSA ? "super_admin" : "platform_developer" }
    })

    // Yanıtta da hassas alanları maskele
    return NextResponse.json(maskSensitiveFields(updated))
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Sistem yapılandırması güncellenemedi." }, { status: 500 })
  }
}

/**
 * DELETE /api/system-config
 * Fabrika sıfırlama — YALNIZCA Platform Developer.
 * Super Admin kasıtlı olarak hariç tutulmuştur:
 * Süper yönetici operasyonel bir roldür; altyapı/yapılandırma sıfırlama yetkisi platform
 * geliştiricisine aittir. (bkz. Nihai Kabul Raporu — Madde 6 Ürün Kararı)
 */
export async function DELETE(req: Request) {
  if (!verifyIntegrity(req)) {
    return NextResponse.json({ error: "API Integrity Verification Failed" }, { status: 403 })
  }

  try {
    const user = await getAuthUser()
    if (!user?.userId) {
      return NextResponse.json({ error: "Yetkisiz erişim" }, { status: 401 })
    }

    // Fabrika sıfırlama YALNIZCA Platform Developer yetkisiyle
    const isDev = await isPlatformDeveloperUser(user.userId as string, user.username as string | undefined)

    if (!isDev) {
      return NextResponse.json(
        { error: "Erişim Reddedildi: Fabrika sıfırlama yalnızca Platform Geliştirici yetkisi gerektirir." },
        { status: 403 }
      )
    }

    const reset = resetSystemConfig()

    // Kritik destructive işlem: audit log oluşturulamazsa işlemi yine de tamamla (best-effort)
    // ancak hata logla. Fabrika sıfırlama için audit zorunluluğu üretim politikasına bırakılır.
    try {
      await createAuditLog({
        userId: user.userId as string,
        action: "RESET_SYSTEM_CONFIG",
        resource: "SYSTEM_SETTINGS",
        details: { reset: true, timestamp: new Date().toISOString() }
      })
    } catch (auditErr) {
      console.error("[CRITICAL] Fabrika sıfırlama audit log oluşturulamadı:", auditErr)
      // Audit kaydı oluşturulamazsa işlemi geri almıyoruz (best-effort politikası)
      // Strict politika için bu bloğu: throw auditErr yapın ve üstte try'ı kaldırın.
    }

    return NextResponse.json({ message: "Sistem yapılandırması başarıyla sıfırlandı.", config: maskSensitiveFields(reset) })
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Sistem yapılandırması sıfırlanamadı." }, { status: 500 })
  }
}
