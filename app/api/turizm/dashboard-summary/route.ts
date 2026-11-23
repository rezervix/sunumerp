import { NextResponse } from "next/server"
import { requireTourismAccess, handleTourismApiError } from "@/lib/tourism/security"
import { getTourismExecutiveSummary } from "@/lib/tourism/dashboard/tourismSummaryService"

export async function GET(req: Request) {
  try {
    const url = new URL(req.url)
    const branchId = url.searchParams.get("branchId") || undefined

    const auth = await requireTourismAccess({
      flagKey: "turizm_rentacar",
      resource: "turizm_rentacar",
      action: "read",
      branchId,
      allowPartnerScoped: true,
    })
    if (auth instanceof NextResponse) return auth

    const summary = await getTourismExecutiveSummary(auth.scope)
    return NextResponse.json(summary)
  } catch (error: any) {
    return handleTourismApiError(error)
  }
}
