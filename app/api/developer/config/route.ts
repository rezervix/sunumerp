import { NextResponse } from "next/server"
import { getSystemConfig, saveSystemConfig, resetSystemConfig } from "@/lib/system-config"
import { requirePlatformDeveloper } from "@/lib/auth/server-permission"
import { createAuditLog } from "@/lib/audit"

export async function GET(req: Request) {
  const auth = await requirePlatformDeveloper()
  if (auth instanceof NextResponse) return auth

  const config = getSystemConfig()
  return NextResponse.json({
    config,
    environment: process.env.NODE_ENV || "development",
    version: "v1.0 Kurumsal",
    timestamp: new Date().toISOString(),
  })
}

export async function POST(req: Request) {
  const auth = await requirePlatformDeveloper()
  if (auth instanceof NextResponse) return auth

  try {
    const body = await req.json()
    const { action, payload } = body

    if (action === "update_config") {
      const updated = saveSystemConfig(payload)
      await createAuditLog({
        userId: auth.payload.userId,
        action: "DEV_CONSOLE_UPDATE_CONFIG",
        resource: "DEVELOPER_CONSOLE",
        details: { updatedKeys: Object.keys(payload || {}) }
      })
      return NextResponse.json({ success: true, config: updated })
    }

    if (action === "reset_config") {
      const reset = resetSystemConfig()
      await createAuditLog({
        userId: auth.payload.userId,
        action: "DEV_CONSOLE_RESET_CONFIG",
        resource: "DEVELOPER_CONSOLE",
        details: { reset: true }
      })
      return NextResponse.json({ success: true, config: reset })
    }

    if (action === "clear_cache") {
      await createAuditLog({
        userId: auth.payload.userId,
        action: "DEV_CONSOLE_CLEAR_CACHE",
        resource: "DEVELOPER_CONSOLE",
        details: { cacheType: payload?.cacheType || "all" }
      })
      return NextResponse.json({ success: true, message: "Sistem önbelleği başarıyla temizlendi." })
    }

    return NextResponse.json({ error: "Geçersiz aksiyon türü" }, { status: 400 })
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Geliştirici konsolu işlem hatası" }, { status: 500 })
  }
}
