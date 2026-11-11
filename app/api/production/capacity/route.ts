import { NextResponse } from "next/server"
import { checkPermission, getAuthPayload, isSuperAdminUser } from "@/lib/auth/server-permission"
import { normalizePermissionAction, normalizePermissionResource } from "@/lib/auth/permissions"
import { getServerProductionFeatureFlags } from "@/lib/system-config"
import { DEBUG_USER_ID } from "@/lib/auth/local-debug"
import {
  ProductionDomainError,
  handleProductionApiError,
  logProductionAudit,
} from "@/lib/services/productionAuditAndError"
import {
  acknowledgeCapacityAlertInDb,
  getCapacityDashboardOverview,
  getGanttScheduleData,
  getOperationTimeVariancesFromDb,
  runAndPersistCapacityPlan,
  runCtpSimulationInDb,
  toggleOperationLockInDb,
  updateScheduledTaskInDb,
} from "@/lib/services/productionCapacityServerDb"

/**
 * Kapasite Planlama & Çizelgeleme için yetki ve özellik bayrağı denetimi.
 */
export async function verifyProductionCapacityAccess(params: {
  userId: string
  branchId?: string | null
  action: "read" | "create" | "update" | "delete" | "approve"
}) {
  const flags = getServerProductionFeatureFlags(params.branchId)
  if (!flags.uretim_kapasite) {
    throw new ProductionDomainError(
      "FEATURE_DISABLED",
      "Üretim / Kapasite Planlama modülü özellik bayrağı (uretim_kapasite) kapalıdır.",
      undefined,
      403
    )
  }

  if (params.userId === DEBUG_USER_ID && process.env.NODE_ENV !== "production") {
    return true
  }

  const isSuper = await isSuperAdminUser(params.userId)
  if (isSuper) return true

  const normRes = normalizePermissionResource("uretim_kapasite")
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
    `Bu kapasite planlama işlemi için yetkiniz bulunmamaktadır (${normRes}:${normAct}).`,
    undefined,
    403
  )
}

async function resolveAuth(request: Request) {
  const payload = await getAuthPayload()
  if (payload) return payload

  if (process.env.NODE_ENV !== "production") {
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
  }
  return null
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const branchId = searchParams.get("branchId") || null
    const flags = getServerProductionFeatureFlags(branchId)

    // 1. Özellik bayrağı kontrolü
    if (!flags.uretim_kapasite) {
      return NextResponse.json(
        {
          success: false,
          error: "Üretim / Kapasite Planlama modülü devre dışıdır (özellik bayrağı kapalı).",
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
    await verifyProductionCapacityAccess({
      userId: auth.userId,
      branchId: auth.branchId || branchId,
      action: "read",
    })

    const section = searchParams.get("section") || "overview"

    switch (section) {
      case "overview": {
        const overview = await getCapacityDashboardOverview(auth.branchId || branchId)
        return NextResponse.json({ success: true, ...overview })
      }

      case "gantt": {
        const gantt = await getGanttScheduleData({
          branchId: auth.branchId || branchId,
          workCenterId: searchParams.get("workCenterId") || undefined,
          startDate: searchParams.get("startDate") || undefined,
          endDate: searchParams.get("endDate") || undefined,
        })
        return NextResponse.json({ success: true, ...gantt })
      }

      case "variance": {
        const variances = await getOperationTimeVariancesFromDb(auth.branchId || branchId)
        return NextResponse.json({ success: true, variances })
      }

      default:
        throw new ProductionDomainError("VALIDATION_ERROR", `Geçersiz section parametresi: ${section}`)
    }
  } catch (error: any) {
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

    if (!flags.uretim_kapasite) {
      return NextResponse.json(
        {
          success: false,
          error: "Üretim / Kapasite Planlama modülü devre dışıdır.",
          code: "FEATURE_DISABLED",
        },
        { status: 403 }
      )
    }

    // Gerekli yetkiyi eyleme göre belirle
    const requiredAction =
      action === "calculate_capacity" || action === "simulate_ctp"
        ? "create"
        : action === "update_task_schedule" || action === "toggle_lock" || action === "acknowledge_alert"
        ? "update"
        : "read"

    await verifyProductionCapacityAccess({
      userId: auth.userId,
      branchId,
      action: requiredAction,
    })

    switch (action) {
      case "calculate_capacity": {
        const startDate = body.startDate ? new Date(body.startDate) : new Date()
        const endDate = body.endDate ? new Date(body.endDate) : new Date(startDate.getTime() + 14 * 86400000)

        const result = await runAndPersistCapacityPlan(
          {
            mode: body.mode || "FINITE",
            direction: body.direction || "FORWARD",
            priorityRule: body.priorityRule || "EDD",
            startDate,
            endDate,
            overloadThresholdPercent: body.overloadThresholdPercent || 95,
          },
          branchId,
          auth.userId
        )

        return NextResponse.json({ success: true, ...result }, { status: 201 })
      }

      case "update_task_schedule": {
        if (!body.newStartDate || !body.newEndDate) {
          throw new ProductionDomainError("VALIDATION_ERROR", "newStartDate ve newEndDate zorunludur.")
        }

        const updated = await updateScheduledTaskInDb({
          taskId: body.taskId,
          operationId: body.operationId,
          newStartDate: new Date(body.newStartDate),
          newEndDate: new Date(body.newEndDate),
          workCenterId: body.workCenterId,
          isLocked: body.isLocked,
          userId: auth.userId,
        })

        return NextResponse.json({ success: true, ...updated })
      }

      case "toggle_lock": {
        if (!body.operationId) {
          throw new ProductionDomainError("VALIDATION_ERROR", "operationId zorunludur.")
        }

        const lockedOp = await toggleOperationLockInDb(
          body.operationId,
          Boolean(body.isLocked),
          auth.userId
        )

        return NextResponse.json({ success: true, operation: lockedOp })
      }

      case "simulate_ctp": {
        if (!body.itemId || !body.quantity) {
          throw new ProductionDomainError("VALIDATION_ERROR", "itemId ve quantity zorunludur.")
        }

        const ctpResult = await runCtpSimulationInDb({
          itemId: body.itemId,
          quantity: Number(body.quantity),
          requestedDueDate: body.requestedDueDate,
          branchId,
          userId: auth.userId,
        })

        return NextResponse.json({ success: true, ctp: ctpResult })
      }

      case "acknowledge_alert": {
        if (!body.alertId) {
          throw new ProductionDomainError("VALIDATION_ERROR", "alertId zorunludur.")
        }

        const acknowledged = await acknowledgeCapacityAlertInDb(body.alertId, auth.userId)
        return NextResponse.json({ success: true, alert: acknowledged })
      }

      default:
        throw new ProductionDomainError("VALIDATION_ERROR", `Bilinmeyen eylem: ${action}`)
    }
  } catch (error: any) {
    return handleProductionApiError(error)
  }
}
