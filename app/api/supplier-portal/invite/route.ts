import { NextResponse } from "next/server"
import { handleLogisticsApiError } from "@/lib/logistics/security"
import { verifySupplierPortalInviteToken } from "@/lib/logistics/procurement"

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const token = searchParams.get("token") || ""
    const verified = await verifySupplierPortalInviteToken(token)

    return NextResponse.json({
      success: true,
      invite: {
        id: verified.invite.id,
        purpose: verified.invite.purpose,
        relatedRef: verified.invite.relatedRef,
        expiresAt: verified.invite.expiresAt,
        invitedBy: verified.invite.invitedBy,
      },
      supplier: {
        id: verified.supplier.id,
        code: verified.supplier.code,
        name: verified.supplier.name,
        category: verified.supplier.category || "GENEL",
      },
    })
  } catch (err) {
    return handleLogisticsApiError(err, "Portal davet bağlantısı doğrulanamadı.")
  }
}
