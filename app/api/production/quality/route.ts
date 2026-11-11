import { NextResponse } from "next/server"
import { checkPermission, getAuthPayload, isSuperAdminUser } from "@/lib/auth/server-permission"
import { normalizePermissionAction, normalizePermissionResource } from "@/lib/auth/permissions"
import { getServerProductionFeatureFlags } from "@/lib/system-config"
import { DEBUG_USER_ID } from "@/lib/auth/local-debug"
import {
  ProductionDomainError,
  handleProductionApiError,
} from "@/lib/services/productionAuditAndError"
import {
  listQualityPlans,
  getQualityPlanById,
  createQualityPlan,
  updateQualityPlan,
  deleteQualityPlan,
  listCalibrationDevices,
  getCalibrationDeviceById,
  createCalibrationDevice,
  updateCalibrationDevice,
  deleteCalibrationDevice,
  listQualityInspections,
  getQualityInspectionById,
  createQualityInspection,
  listQualityNcrs,
  getQualityNcrById,
  createQualityNcr,
  updateQualityNcrStatus,
  traceLotForward,
  traceLotBackward,
  simulateLotRecall,
  getQualityOverviewDashboardStats,
  getQualityParetoAnalysisReport,
  getSupplierQualityRatingsReport,
} from "@/lib/services/productionQualityServerDb"
import {
  calculateAqlSamplingPlan,
  calculateSpcXBarRChart,
  type InspectionLevel,
  type SamplingMethod,
  type NcrStatus,
} from "@/lib/services/productionQualityEngine"

/**
 * Kalite Kontrol modülü için yetki ve özellik bayrağı doğrulaması.
 */
export async function verifyProductionQualityAccess(params: {
  userId: string
  branchId?: string | null
  action: "read" | "create" | "update" | "delete" | "approve"
}) {
  const flags = getServerProductionFeatureFlags(params.branchId)
  if (!flags.uretim_kalite) {
    throw new ProductionDomainError(
      "FEATURE_DISABLED",
      "Üretim / Kalite Kontrol modülü özellik bayrağı (uretim_kalite) kapalıdır.",
      undefined,
      403
    )
  }

  if (params.userId === DEBUG_USER_ID) {
    return true
  }

  const isSuper = await isSuperAdminUser(params.userId)
  if (isSuper) return true

  const normRes = normalizePermissionResource("uretim_kalite")
  const normAct = normalizePermissionAction(params.action)

  const grantedSpecific = await checkPermission(
    params.userId,
    params.branchId || undefined,
    normRes,
    normAct
  )
  if (grantedSpecific) return true

  const grantedGeneral = await checkPermission(
    params.userId,
    params.branchId || undefined,
    "uretim",
    normAct
  )
  if (grantedGeneral) return true

  throw new ProductionDomainError(
    "FORBIDDEN",
    `Bu kalite kontrol işlemi için yetkiniz bulunmamaktadır (${normRes}:${normAct}).`,
    undefined,
    403
  )
}

async function resolveAuth(request: Request) {
  const debugHeader = request.headers.get("x-user-id")
  if (debugHeader) {
    return {
      userId: debugHeader,
      username: "Debug User",
      email: "debug@sunumerp.local",
      role: "Super Admin",
      branchId: null,
    }
  }

  const payload = await getAuthPayload()
  if (payload) return payload

  return null
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const branchId = searchParams.get("branchId") || null
    const flags = getServerProductionFeatureFlags(branchId)

    // 1. Özellik bayrağı kontrolü
    if (!flags.uretim_kalite) {
      return NextResponse.json(
        {
          success: false,
          error: "Üretim / Kalite Kontrol modülü devre dışıdır (özellik bayrağı kapalı).",
          code: "FEATURE_DISABLED",
        },
        { status: 403 }
      )
    }

    // 2. Kimlik doğrulama
    const auth = await resolveAuth(request)
    if (!auth) {
      return NextResponse.json(
        {
          success: false,
          error: "Bu işlem için oturum açmanız gerekmektedir.",
          code: "UNAUTHORIZED",
        },
        { status: 401 }
      )
    }

    // 3. Yetki kontrolü (okuma)
    await verifyProductionQualityAccess({
      userId: auth.userId,
      branchId,
      action: "read",
    })

    const view = searchParams.get("view") || "overview"

    switch (view) {
      case "overview": {
        const stats = await getQualityOverviewDashboardStats()
        return NextResponse.json({ success: true, stats })
      }

      case "inspections": {
        const data = await listQualityInspections({
          inspectionType: searchParams.get("inspectionType") || undefined,
          status: searchParams.get("status") || undefined,
          itemId: searchParams.get("itemId") || undefined,
          workOrderId: searchParams.get("workOrderId") || undefined,
          lotNumber: searchParams.get("lotNumber") || undefined,
          supplierId: searchParams.get("supplierId") || undefined,
          search: searchParams.get("search") || undefined,
        })
        return NextResponse.json({ success: true, data })
      }

      case "inspection_detail": {
        const id = searchParams.get("id")
        if (!id) throw new ProductionDomainError("VALIDATION_ERROR", "id parametresi zorunludur.")
        const data = await getQualityInspectionById(id)
        return NextResponse.json({ success: true, data })
      }

      case "plans": {
        const data = await listQualityPlans({
          controlPoint: searchParams.get("controlPoint") || undefined,
          itemId: searchParams.get("itemId") || undefined,
          isActive: searchParams.get("isActive") !== null ? searchParams.get("isActive") === "true" : undefined,
          search: searchParams.get("search") || undefined,
        })
        return NextResponse.json({ success: true, data })
      }

      case "plan_detail": {
        const id = searchParams.get("id")
        if (!id) throw new ProductionDomainError("VALIDATION_ERROR", "id parametresi zorunludur.")
        const data = await getQualityPlanById(id)
        return NextResponse.json({ success: true, data })
      }

      case "calibrations": {
        const data = await listCalibrationDevices({
          status: searchParams.get("status") || undefined,
          search: searchParams.get("search") || undefined,
        })
        return NextResponse.json({ success: true, data })
      }

      case "calibration_detail": {
        const id = searchParams.get("id")
        if (!id) throw new ProductionDomainError("VALIDATION_ERROR", "id parametresi zorunludur.")
        const data = await getCalibrationDeviceById(id)
        return NextResponse.json({ success: true, data })
      }

      case "ncrs": {
        const data = await listQualityNcrs({
          status: searchParams.get("status") || undefined,
          severity: searchParams.get("severity") || undefined,
          source: searchParams.get("source") || undefined,
          itemId: searchParams.get("itemId") || undefined,
          workOrderId: searchParams.get("workOrderId") || undefined,
          search: searchParams.get("search") || undefined,
        })
        return NextResponse.json({ success: true, data })
      }

      case "ncr_detail": {
        const id = searchParams.get("id")
        if (!id) throw new ProductionDomainError("VALIDATION_ERROR", "id parametresi zorunludur.")
        const data = await getQualityNcrById(id)
        return NextResponse.json({ success: true, data })
      }

      case "trace_forward": {
        const lotNumber = searchParams.get("lotNumber")
        if (!lotNumber) throw new ProductionDomainError("VALIDATION_ERROR", "lotNumber parametresi zorunludur.")
        const data = await traceLotForward(lotNumber)
        return NextResponse.json({ success: true, data })
      }

      case "trace_backward": {
        const lotNumber = searchParams.get("lotNumber")
        if (!lotNumber) throw new ProductionDomainError("VALIDATION_ERROR", "lotNumber parametresi zorunludur.")
        const data = await traceLotBackward(lotNumber)
        return NextResponse.json({ success: true, data })
      }

      case "recall_simulation": {
        const lotNumber = searchParams.get("lotNumber")
        if (!lotNumber) throw new ProductionDomainError("VALIDATION_ERROR", "lotNumber parametresi zorunludur.")
        const data = await simulateLotRecall(lotNumber)
        return NextResponse.json({ success: true, data })
      }

      case "pareto": {
        const data = await getQualityParetoAnalysisReport()
        return NextResponse.json({ success: true, data })
      }

      case "supplier_ratings": {
        const data = await getSupplierQualityRatingsReport()
        return NextResponse.json({ success: true, data })
      }

      case "spc": {
        // İlgili ölçüm alt gruplarını hesapla
        const inspections = await listQualityInspections()
        const subgroups: Array<{ subgroupId: string; label: string; values: number[] }> = []

        for (const ins of inspections) {
          const variableMeasurements = (ins.results || [])
            .filter((r: any) => r.characteristicType === "VARIABLE" && typeof r.measuredValue === "number")
            .map((r: any) => r.measuredValue as number)

          if (variableMeasurements.length >= 2) {
            subgroups.push({
              subgroupId: ins.id,
              label: ins.inspectionNumber,
              values: variableMeasurements,
            })
          }
        }

        const spcResult = calculateSpcXBarRChart(subgroups)
        return NextResponse.json({ success: true, data: spcResult })
      }

      default:
        throw new ProductionDomainError("VALIDATION_ERROR", `Geçersiz view parametresi: ${view}`)
    }
  } catch (error) {
    return handleProductionApiError(error)
  }
}

export async function POST(request: Request) {
  try {
    const auth = await resolveAuth(request)
    if (!auth) {
      return NextResponse.json(
        {
          success: false,
          error: "Bu işlem için oturum açmanız gerekmektedir.",
          code: "UNAUTHORIZED",
        },
        { status: 401 }
      )
    }

    const body = await request.json().catch(() => ({}))
    const { action } = body

    if (!action) {
      throw new ProductionDomainError("VALIDATION_ERROR", "action alanı zorunludur.")
    }

    const branchId = body.branchId || auth.branchId || null
    const flags = getServerProductionFeatureFlags(branchId)

    if (!flags.uretim_kalite) {
      return NextResponse.json(
        {
          success: false,
          error: "Üretim / Kalite Kontrol modülü devre dışıdır.",
          code: "FEATURE_DISABLED",
        },
        { status: 403 }
      )
    }

    // Yetki eylemini belirle
    let requiredAction: "read" | "create" | "update" | "delete" | "approve" = "create"
    if (action.startsWith("delete_")) requiredAction = "delete"
    else if (action.startsWith("update_")) requiredAction = "update"
    else if (action === "update_ncr_status" && body.targetStatus === "CLOSED") requiredAction = "approve"
    else if (action === "calculate_sampling" || action === "simulate_recall") requiredAction = "read"

    await verifyProductionQualityAccess({
      userId: auth.userId,
      branchId,
      action: requiredAction,
    })

    switch (action) {
      // 1. Kalite Planı
      case "create_plan": {
        const data = await createQualityPlan(body.plan, auth.userId)
        return NextResponse.json({ success: true, data }, { status: 201 })
      }

      case "update_plan": {
        const data = await updateQualityPlan(body.id, body.plan, auth.userId)
        return NextResponse.json({ success: true, data })
      }

      case "delete_plan": {
        const data = await deleteQualityPlan(body.id, auth.userId)
        return NextResponse.json({ success: true, ...data })
      }

      // 2. Kalibrasyon Cihazı
      case "create_calibration": {
        const data = await createCalibrationDevice(body.device, auth.userId)
        return NextResponse.json({ success: true, data }, { status: 201 })
      }

      case "update_calibration": {
        const data = await updateCalibrationDevice(body.id, body.device, auth.userId)
        return NextResponse.json({ success: true, data })
      }

      case "delete_calibration": {
        const data = await deleteCalibrationDevice(body.id, auth.userId)
        return NextResponse.json({ success: true, ...data })
      }

      // 3. Muayene Kaydı
      case "record_inspection": {
        const data = await createQualityInspection(body.inspection, auth.userId)
        return NextResponse.json({ success: true, data }, { status: 201 })
      }

      // 4. NCR & DÖF
      case "create_ncr": {
        const data = await createQualityNcr(body.ncr, auth.userId)
        return NextResponse.json({ success: true, data }, { status: 201 })
      }

      case "update_ncr_status": {
        const data = await updateQualityNcrStatus(
          body.id,
          body.targetStatus as NcrStatus,
          body.updatePayload,
          auth.userId
        )
        return NextResponse.json({ success: true, data })
      }

      // 5. Yardımcı Hesaplamalar
      case "calculate_sampling": {
        const data = calculateAqlSamplingPlan({
          lotSize: Number(body.lotSize || 100),
          samplingMethod: body.samplingMethod as SamplingMethod,
          samplingSize: body.samplingSize ? Number(body.samplingSize) : undefined,
          inspectionLevel: body.inspectionLevel as InspectionLevel,
          aqlLimit: body.aqlLimit !== undefined ? Number(body.aqlLimit) : undefined,
        })
        return NextResponse.json({ success: true, data })
      }

      case "simulate_recall": {
        const data = await simulateLotRecall(body.lotNumber)
        return NextResponse.json({ success: true, data })
      }

      default:
        throw new ProductionDomainError("VALIDATION_ERROR", `Bilinmeyen action: ${action}`)
    }
  } catch (error) {
    return handleProductionApiError(error)
  }
}
