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
  listNotificationRules,
  createNotificationRule,
  updateNotificationRule,
  deleteNotificationRule,
  getUserNotificationPreferences,
  updateUserNotificationPreference,
  scanAndTriggerAllProductionAlerts,
  getConsolidatedProductionDashboard,
  generateWorkOrderCostReport,
  generateMaterialVarianceReport,
  generateMachineEfficiencyReport,
  generateMaintenanceCostReport,
  exportReportData,
  queryProductionAuditLogs,
  runE2EProductionLifecycleScenario,
  runBreakdownMaintenanceCapacityScenario,
} from "@/lib/services/productionIntegrationServerDb"
import { type ProductionRoleView } from "@/lib/services/productionIntegrationEngine"

/**
 * Üretim Entegrasyon, Dashboard & Raporlama modülü için yetki ve bayrak denetimi.
 */
export async function verifyProductionIntegrationAccess(params: {
  userId: string
  branchId?: string | null
  action: "read" | "create" | "update" | "delete" | "approve"
}) {
  const flags = getServerProductionFeatureFlags(params.branchId)
  const isAnyEnabled = Object.values(flags).some((v) => v === true)

  if (!isAnyEnabled) {
    throw new ProductionDomainError(
      "FEATURE_DISABLED",
      "Üretim modülleri özellik bayrakları kapalıdır. En az bir üretim modülü aktif olmalıdır.",
      undefined,
      403
    )
  }

  if (params.userId === DEBUG_USER_ID) {
    return true
  }

  const isSuper = await isSuperAdminUser(params.userId)
  if (isSuper) return true

  const normAct = normalizePermissionAction(params.action)
  const granted = await checkPermission(
    params.userId,
    params.branchId || undefined,
    "uretim",
    normAct
  )
  if (granted) return true

  throw new ProductionDomainError(
    "FORBIDDEN",
    `Bu işlem için yetkiniz bulunmamaktadır (uretim:${normAct}).`,
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

import { isDemoModeActive } from "@/lib/data-controller"
import { mockDatabase } from "@/lib/data/mockDatabase"

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)

    if (isDemoModeActive()) {
      const view = searchParams.get("view") || "dashboard"
      if (view === "dashboard") return NextResponse.json(mockDatabase.getProductionIntegrationDashboard())
      if (view === "notifications") return NextResponse.json({ success: true, data: [] })
      if (view === "audit_trail") return NextResponse.json({ success: true, data: { logs: [] } })
      if (view === "reports") return NextResponse.json({ success: true, data: [] })
      return NextResponse.json(mockDatabase.getProductionIntegrationDashboard())
    }

    const branchId = searchParams.get("branchId") || null
    const flags = getServerProductionFeatureFlags(branchId)
    const isAnyEnabled = Object.values(flags).some((v) => v === true)

    // 1. Özellik bayrağı kontrolü
    if (!isAnyEnabled) {
      return NextResponse.json(
        {
          success: false,
          error: "Üretim modülleri özellik bayrakları kapalıdır.",
          code: "FEATURE_DISABLED",
        },
        { status: 403 }
      )
    }

    // 2. Kimlik ve yetki doğrulama
    const auth = await resolveAuth(request)
    if (!auth) {
      return NextResponse.json(
        {
          success: false,
          error: "Yetkilendirme gerekli. Lütfen giriş yapınız.",
          code: "UNAUTHORIZED",
        },
        { status: 401 }
      )
    }

    await verifyProductionIntegrationAccess({
      userId: auth.userId,
      branchId: auth.branchId || branchId,
      action: "read",
    })

    const view = searchParams.get("view") || "dashboard"

    switch (view) {
      case "dashboard": {
        const roleView = (searchParams.get("roleView") as ProductionRoleView) || "FABRIKA_MUDURU"
        const data = await getConsolidatedProductionDashboard(roleView)
        return NextResponse.json({ success: true, data })
      }

      case "notifications": {
        const data = await listNotificationRules()
        return NextResponse.json({ success: true, data })
      }

      case "preferences": {
        const data = await getUserNotificationPreferences(auth.userId)
        return NextResponse.json({ success: true, data })
      }

      case "audit_trail": {
        const resource = searchParams.get("resource") || undefined
        const action = searchParams.get("action") || undefined
        const search = searchParams.get("search") || undefined
        const limit = searchParams.get("limit") ? Number(searchParams.get("limit")) : 50
        const offset = searchParams.get("offset") ? Number(searchParams.get("offset")) : 0
        const data = await queryProductionAuditLogs({ resource, action, search, limit, offset })
        return NextResponse.json({ success: true, data })
      }

      case "reports": {
        const reportType = searchParams.get("reportType") || "work_order_cost"
        const format = searchParams.get("format") || "json"

        if (format === "csv") {
          const csvString = await exportReportData(reportType)
          return new NextResponse(csvString, {
            headers: {
              "Content-Type": "text/csv; charset=utf-8",
              "Content-Disposition": `attachment; filename="uretim_${reportType}_${Date.now()}.csv"`,
            },
          })
        }

        let data
        if (reportType === "work_order_cost") {
          data = await generateWorkOrderCostReport()
        } else if (reportType === "material_variance") {
          data = await generateMaterialVarianceReport()
        } else if (reportType === "machine_efficiency") {
          data = await generateMachineEfficiencyReport()
        } else if (reportType === "maintenance_cost") {
          data = await generateMaintenanceCostReport()
        } else {
          return NextResponse.json({ success: false, error: "Bilinmeyen rapor türü" }, { status: 400 })
        }

        return NextResponse.json({ success: true, data })
      }

      default:
        return NextResponse.json(
          { success: false, error: `Bilinmeyen view parametresi: '${view}'` },
          { status: 400 }
        )
    }
  } catch (error: any) {
    return handleProductionApiError(error)
  }
}

export async function POST(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const branchId = searchParams.get("branchId") || null
    const flags = getServerProductionFeatureFlags(branchId)
    const isAnyEnabled = Object.values(flags).some((v) => v === true)

    // 1. Özellik bayrağı kontrolü
    if (!isAnyEnabled) {
      return NextResponse.json(
        {
          success: false,
          error: "Üretim modülleri özellik bayrakları kapalıdır.",
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
          error: "Yetkilendirme gerekli. Lütfen giriş yapınız.",
          code: "UNAUTHORIZED",
        },
        { status: 401 }
      )
    }

    const body = await request.json()
    const { action, payload } = body

    if (!action) {
      return NextResponse.json(
        { success: false, error: "'action' parametresi zorunludur." },
        { status: 400 }
      )
    }

    switch (action) {
      case "create_notification_rule": {
        await verifyProductionIntegrationAccess({
          userId: auth.userId,
          branchId: auth.branchId || branchId,
          action: "create",
        })
        const data = await createNotificationRule(payload, auth.userId)
        return NextResponse.json({ success: true, data }, { status: 201 })
      }

      case "update_notification_rule": {
        await verifyProductionIntegrationAccess({
          userId: auth.userId,
          branchId: auth.branchId || branchId,
          action: "update",
        })
        const { id, ...ruleData } = payload
        const data = await updateNotificationRule(id, ruleData, auth.userId)
        return NextResponse.json({ success: true, data })
      }

      case "delete_notification_rule": {
        await verifyProductionIntegrationAccess({
          userId: auth.userId,
          branchId: auth.branchId || branchId,
          action: "delete",
        })
        const { id } = payload
        const data = await deleteNotificationRule(id, auth.userId)
        return NextResponse.json({ success: true, data })
      }

      case "update_preference": {
        const { eventType, ...prefData } = payload
        const data = await updateUserNotificationPreference(auth.userId, eventType, prefData)
        return NextResponse.json({ success: true, data })
      }

      case "trigger_alerts_scan": {
        await verifyProductionIntegrationAccess({
          userId: auth.userId,
          branchId: auth.branchId || branchId,
          action: "update",
        })
        const data = await scanAndTriggerAllProductionAlerts()
        return NextResponse.json({ success: true, data })
      }

      case "run_scenario_a": {
        await verifyProductionIntegrationAccess({
          userId: auth.userId,
          branchId: auth.branchId || branchId,
          action: "create",
        })
        const data = await runE2EProductionLifecycleScenario(auth.userId)
        return NextResponse.json({ success: true, data })
      }

      case "run_scenario_b": {
        await verifyProductionIntegrationAccess({
          userId: auth.userId,
          branchId: auth.branchId || branchId,
          action: "create",
        })
        const data = await runBreakdownMaintenanceCapacityScenario(auth.userId)
        return NextResponse.json({ success: true, data })
      }

      default:
        return NextResponse.json(
          { success: false, error: `Bilinmeyen action: '${action}'` },
          { status: 400 }
        )
    }
  } catch (error: any) {
    return handleProductionApiError(error)
  }
}

