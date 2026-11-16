import { NextResponse } from "next/server"
import { cookies } from "next/headers"
import { handleLogisticsApiError } from "@/lib/logistics/security"
import {
  ADMIN_RETURN_COOKIE_NAME,
  exchangeInviteTokenForPortalSession,
} from "@/lib/logistics/procurement"

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const token = String(body.token || "")
    const result = await exchangeInviteTokenForPortalSession(token)

    const cookieStore = await cookies()
    cookieStore.set("auth-token", result.token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      expires: result.expiresAt,
      path: "/",
    })
    // Davet linkiyle giriş yapan harici tedarikçide asla admin dönüş çerezi kalmaz
    cookieStore.delete(ADMIN_RETURN_COOKIE_NAME)

    return NextResponse.json({
      success: true,
      user: result.user,
      supplier: result.supplier,
      invitePurpose: result.invitePurpose,
      inviteRelatedRef: result.inviteRelatedRef,
      redirectTo: "/tedarikci-portali",
      message: `${result.supplier.name} portal erişimi etkinleştirildi.`,
    })
  } catch (err) {
    return handleLogisticsApiError(err, "Davet bağlantısı ile oturum açılamadı.")
  }
}
