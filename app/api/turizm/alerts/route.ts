import { NextResponse } from "next/server"
import { requireTourismAccess, handleTourismApiError } from "@/lib/tourism/security"
import { evaluateAndDispatchTourismAlerts } from "@/lib/tourism/notifications/tourismAlertRules"

export async function GET(req: Request) {
  try {
    const auth = await requireTourismAccess({
      flagKey: "turizm_rentacar",
      resource: "turizm_rentacar",
      action: "read",
      allowPartnerScoped: true,
    })
    if (auth instanceof NextResponse) return auth

    const result = await evaluateAndDispatchTourismAlerts()
    return NextResponse.json({ success: true, data: result })
  } catch (error: any) {
    return handleTourismApiError(error)
  }
}

export async function POST(req: Request) {
  try {
    const auth = await requireTourismAccess({
      flagKey: "turizm_rentacar",
      resource: "turizm_rentacar",
      action: "read",
      allowPartnerScoped: true,
    })
    if (auth instanceof NextResponse) return auth

    const result = await evaluateAndDispatchTourismAlerts()
    return NextResponse.json({ success: true, data: result })
  } catch (error: any) {
    return handleTourismApiError(error)
  }
}
