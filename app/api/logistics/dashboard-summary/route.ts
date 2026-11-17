import { NextResponse } from "next/server"
import { getAuthPayload } from "@/lib/auth/server-permission"
import { handleLogisticsApiError } from "@/lib/logistics/security"
import { getLogisticsExecutiveSummaryForUser } from "@/lib/logistics/dashboard"

export async function GET(req: Request) {
  try {
    const payload = await getAuthPayload()
    if (!payload) {
      return NextResponse.json({ error: "Oturum açmanız gerekiyor." }, { status: 401 })
    }

    const url = new URL(req.url)
    const branchId = url.searchParams.get("branchId") || payload.branchId

    const summary = await getLogisticsExecutiveSummaryForUser(payload, branchId)
    return NextResponse.json(summary)
  } catch (error) {
    return handleLogisticsApiError(error)
  }
}
