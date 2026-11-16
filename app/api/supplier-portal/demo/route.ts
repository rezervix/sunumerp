import { NextResponse } from "next/server"
import { cookies } from "next/headers"
import { isDemoEnvironment } from "@/lib/config/production-feature-flags"
import { handleLogisticsApiError } from "@/lib/logistics/security"
import {
  ADMIN_RETURN_COOKIE_NAME,
  getDemoPortalPublicState,
  loginAsDemoSupplier,
  restoreAdminPerspective,
  switchAdminPerspectiveToDemoSupplier,
} from "@/lib/logistics/procurement/demoPortalHelper"

function demoDisabledResponse() {
  return NextResponse.json(
    {
      success: false,
      code: "DEMO_MODE_DISABLED",
      error: "Demo kolaylıkları kapalıdır (ENABLE_DEMO_MODE=false / DISABLE_DEMO_MODE=true).",
    },
    { status: 403 }
  )
}

export async function GET() {
  if (!isDemoEnvironment()) {
    return demoDisabledResponse()
  }
  try {
    const cookieStore = await cookies()
    const returnCookie = cookieStore.get(ADMIN_RETURN_COOKIE_NAME)?.value
    const state = await getDemoPortalPublicState(returnCookie)
    return NextResponse.json({ success: true, ...state })
  } catch (err) {
    return handleLogisticsApiError(err, "Demo durumu alınamadı.")
  }
}

export async function POST(request: Request) {
  if (!isDemoEnvironment()) {
    return demoDisabledResponse()
  }

  try {
    const body = await request.json()
    const action = String(body.action || "")
    const cookieStore = await cookies()

    if (action === "demo_supplier_login") {
      const res = await loginAsDemoSupplier(body.username || "tedarikci.royal")
      cookieStore.set("auth-token", res.token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        expires: res.expiresAt,
        path: "/",
      })
      cookieStore.delete(ADMIN_RETURN_COOKIE_NAME)
      return NextResponse.json({
        success: true,
        user: res.user,
        supplier: res.supplier,
        message: `Demo tedarikçi (${res.supplier.name}) portalına giriş yapıldı.`,
      })
    }

    if (action === "switch_to_supplier") {
      const res = await switchAdminPerspectiveToDemoSupplier(body.username || "tedarikci.royal")
      cookieStore.set("auth-token", res.supplierSession.token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        expires: res.supplierSession.expiresAt,
        path: "/",
      })
      cookieStore.set(ADMIN_RETURN_COOKIE_NAME, res.returnToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        expires: new Date(Date.now() + 2 * 3600 * 1000),
        path: "/",
      })
      return NextResponse.json({
        success: true,
        supplier: res.supplierSession.supplier,
        redirectTo: "/tedarikci-portali",
        message: `Perspektif ${res.supplierSession.supplier.name} tedarikçi portalına geçildi.`,
      })
    }

    if (action === "restore_admin") {
      const returnToken = cookieStore.get(ADMIN_RETURN_COOKIE_NAME)?.value
      const res = await restoreAdminPerspective(returnToken)
      cookieStore.set("auth-token", res.token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        expires: res.expiresAt,
        path: "/",
      })
      cookieStore.delete(ADMIN_RETURN_COOKIE_NAME)
      return NextResponse.json({
        success: true,
        username: res.username,
        redirectTo: res.redirectPath,
        message: "Şirket Yöneticisi ERP görünümüne dönüldü.",
      })
    }

    return NextResponse.json(
      { success: false, error: `Bilinmeyen demo işlemi: ${action}` },
      { status: 400 }
    )
  } catch (err) {
    return handleLogisticsApiError(err, "Demo portal işlemi başarısız.")
  }
}
