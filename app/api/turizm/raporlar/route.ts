import { NextResponse } from "next/server"
import { requireTourismAccess, handleTourismApiError } from "@/lib/tourism/security"
import {
  buildTourismReportPayload,
  exportTourismReportBuffer,
  type TourismReportType,
} from "@/lib/tourism/reports/tourismReportsService"

export async function GET(req: Request) {
  try {
    const url = new URL(req.url)
    const branchId = url.searchParams.get("branchId") || undefined
    const reportType = (url.searchParams.get("type") || "CONSOLIDATED") as TourismReportType
    const format = url.searchParams.get("format") // "xlsx" | "pdf" | undefined

    const auth = await requireTourismAccess({
      flagKey: "turizm_rentacar",
      resource: "turizm_rentacar",
      action: "read",
      branchId,
      allowPartnerScoped: true,
    })
    if (auth instanceof NextResponse) return auth

    if (format === "xlsx" || format === "pdf") {
      const result = await exportTourismReportBuffer(auth.scope, reportType, format)
      return new NextResponse(new Uint8Array(result.buffer), {
        status: 200,
        headers: {
          "Content-Type": result.contentType,
          "Content-Disposition": `attachment; filename="${result.filename}"`,
        },
      })
    }

    const reportData = await buildTourismReportPayload(auth.scope, reportType)
    return NextResponse.json({ success: true, data: reportData })
  } catch (error: any) {
    return handleTourismApiError(error)
  }
}
