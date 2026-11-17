import { NextResponse } from "next/server"
import { getAuthPayload } from "@/lib/auth/server-permission"
import { handleLogisticsApiError } from "@/lib/logistics/security"
import {
  assertReportModuleAccess,
  generateLogisticsReport,
  resolveAuthorizedReportModules,
  type LogisticsReportFilters,
  type LogisticsReportModuleKey,
} from "@/lib/logistics/reports"

export async function GET(req: Request) {
  try {
    const payload = await getAuthPayload()
    if (!payload) {
      return NextResponse.json({ error: "Oturum açmanız gerekiyor." }, { status: 401 })
    }

    const url = new URL(req.url)
    const branchId = url.searchParams.get("branchId") || payload.branchId
    const requestedModule = url.searchParams.get("module") as LogisticsReportModuleKey | null

    const filters: LogisticsReportFilters = {
      dateFrom: url.searchParams.get("dateFrom") || undefined,
      dateTo: url.searchParams.get("dateTo") || undefined,
      warehouseId: url.searchParams.get("warehouseId") || undefined,
      vehicleId: url.searchParams.get("vehicleId") || undefined,
      supplierId: url.searchParams.get("supplierId") || undefined,
      channelCode: url.searchParams.get("channelCode") || undefined,
    }

    const availableModules = await resolveAuthorizedReportModules(payload, branchId)

    if (requestedModule) {
      await assertReportModuleAccess(payload, requestedModule, branchId)
      const activeReport = await generateLogisticsReport(requestedModule, filters)
      return NextResponse.json({
        availableModules,
        activeReport,
      })
    }

    if (availableModules.length === 0) {
      return NextResponse.json(
        {
          error: "Aktif ve yetkili olduğunuz lojistik raporu bulunmamaktadır.",
          availableModules: [],
          activeReport: null,
        },
        { status: 403 }
      )
    }

    const firstModule = availableModules[0].key
    const activeReport = await generateLogisticsReport(firstModule, filters)

    return NextResponse.json({
      availableModules,
      activeReport,
    })
  } catch (error) {
    return handleLogisticsApiError(error)
  }
}
