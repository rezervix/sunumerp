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
  listMachineAssets,
  getMachineAssetHierarchy,
  getMachineAssetDetail,
  createMachineAsset,
  updateMachineAsset,
  addSparePartToMachine,
  listMaintenancePlans,
  createMaintenancePlan,
  updateMaintenancePlan,
  listMaintenanceWorkOrders,
  getMaintenanceWorkOrderDetail,
  createMaintenanceWorkOrder,
  updateMaintenanceWorkOrderStatus,
  recordWorkOrderSparePartUsage,
  recordConditionReading,
  evaluateAndTriggerMaintenanceJobs,
  getMaintenanceCapacityConflicts,
  checkMaintenanceSparePartProcurement,
  getMaintenanceDashboardMetrics,
} from "@/lib/services/productionMaintenanceServerDb"

/**
 * Bakım & Ekipman Yönetimi modülü için yetki ve özellik bayrağı doğrulaması.
 */
export async function verifyProductionMaintenanceAccess(params: {
  userId: string
  branchId?: string | null
  action: "read" | "create" | "update" | "delete" | "approve"
}) {
  const flags = getServerProductionFeatureFlags(params.branchId)
  if (!flags.uretim_bakim) {
    throw new ProductionDomainError(
      "FEATURE_DISABLED",
      "Üretim / Ekipman & Bakım Yönetimi modülü özellik bayrağı (uretim_bakim) kapalıdır.",
      undefined,
      403
    )
  }

  if (params.userId === DEBUG_USER_ID) {
    return true
  }

  const isSuper = await isSuperAdminUser(params.userId)
  if (isSuper) return true

  const normRes = normalizePermissionResource("uretim_bakim")
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
    `Bu bakım yönetimi işlemi için yetkiniz bulunmamaktadır (${normRes}:${normAct}).`,
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
      const view = searchParams.get("view") || "overview"
      if (view === "work_orders") return NextResponse.json(mockDatabase.getProductionMaintenanceWorkOrders())
      if (view === "plans") return NextResponse.json(mockDatabase.getProductionMaintenancePlans())
      if (view === "machines") return NextResponse.json(mockDatabase.getProductionMaintenanceMachines())
      if (view === "metrics") {
        return NextResponse.json({
          success: true,
          data: {
            mtbf: 580,
            mttr: 1.6,
            oeeImpactPercent: -1.2,
            uptimePercent: 98.4,
          },
        })
      }
      return NextResponse.json(mockDatabase.getProductionMaintenanceOverview())
    }

    const branchId = searchParams.get("branchId") || null
    const flags = getServerProductionFeatureFlags(branchId)

    // 1. Özellik bayrağı kontrolü
    if (!flags.uretim_bakim) {
      return NextResponse.json(
        {
          success: false,
          error: "Üretim / Ekipman & Bakım Yönetimi modülü devre dışıdır (özellik bayrağı kapalı).",
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

    await verifyProductionMaintenanceAccess({
      userId: auth.userId,
      branchId: auth.branchId || branchId,
      action: "read",
    })

    const view = searchParams.get("view") || "overview"

    switch (view) {
      case "overview": {
        const data = await getMaintenanceDashboardMetrics()
        return NextResponse.json({ success: true, data })
      }

      case "assets": {
        const workCenterId = searchParams.get("workCenterId") || undefined
        const criticality = searchParams.get("criticality") || undefined
        const status = searchParams.get("status") || undefined
        const search = searchParams.get("search") || undefined
        const data = await listMachineAssets({ workCenterId, criticality, status, search })
        return NextResponse.json({ success: true, data })
      }

      case "hierarchy": {
        const data = await getMachineAssetHierarchy()
        return NextResponse.json({ success: true, data })
      }

      case "asset_detail": {
        const id = searchParams.get("id")
        if (!id) {
          return NextResponse.json(
            { success: false, error: "Ekipman kimliği (id) zorunludur." },
            { status: 400 }
          )
        }
        const data = await getMachineAssetDetail(id)
        return NextResponse.json({ success: true, data })
      }

      case "plans": {
        const machineAssetId = searchParams.get("machineAssetId") || undefined
        const planType = searchParams.get("planType") || undefined
        const isActiveParam = searchParams.get("isActive")
        const isActive = isActiveParam !== null ? isActiveParam === "true" : undefined
        const data = await listMaintenancePlans({ machineAssetId, planType, isActive })
        return NextResponse.json({ success: true, data })
      }

      case "work_orders": {
        const machineAssetId = searchParams.get("machineAssetId") || undefined
        const workCenterId = searchParams.get("workCenterId") || undefined
        const status = searchParams.get("status") || undefined
        const type = searchParams.get("type") || undefined
        const priority = searchParams.get("priority") || undefined
        const data = await listMaintenanceWorkOrders({ machineAssetId, workCenterId, status, type, priority })
        return NextResponse.json({ success: true, data })
      }

      case "work_order_detail": {
        const id = searchParams.get("id")
        if (!id) {
          return NextResponse.json(
            { success: false, error: "İş emri kimliği (id) zorunludur." },
            { status: 400 }
          )
        }
        const data = await getMaintenanceWorkOrderDetail(id)
        return NextResponse.json({ success: true, data })
      }

      case "conflicts": {
        const data = await getMaintenanceCapacityConflicts()
        return NextResponse.json({ success: true, data })
      }

      case "procurement_check": {
        const machineAssetId = searchParams.get("machineAssetId") || undefined
        const data = await checkMaintenanceSparePartProcurement(machineAssetId)
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

    // 1. Özellik bayrağı kontrolü
    if (!flags.uretim_bakim) {
      return NextResponse.json(
        {
          success: false,
          error: "Üretim / Ekipman & Bakım Yönetimi modülü devre dışıdır (özellik bayrağı kapalı).",
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
      case "create_asset": {
        await verifyProductionMaintenanceAccess({
          userId: auth.userId,
          branchId: auth.branchId || branchId,
          action: "create",
        })
        const data = await createMachineAsset(payload, auth.userId)
        return NextResponse.json({ success: true, data }, { status: 201 })
      }

      case "update_asset": {
        await verifyProductionMaintenanceAccess({
          userId: auth.userId,
          branchId: auth.branchId || branchId,
          action: "update",
        })
        const { id, ...updateData } = payload
        const data = await updateMachineAsset(id, updateData, auth.userId)
        return NextResponse.json({ success: true, data })
      }

      case "add_spare_part": {
        await verifyProductionMaintenanceAccess({
          userId: auth.userId,
          branchId: auth.branchId || branchId,
          action: "create",
        })
        const data = await addSparePartToMachine(payload, auth.userId)
        return NextResponse.json({ success: true, data }, { status: 201 })
      }

      case "create_plan": {
        await verifyProductionMaintenanceAccess({
          userId: auth.userId,
          branchId: auth.branchId || branchId,
          action: "create",
        })
        const data = await createMaintenancePlan(payload, auth.userId)
        return NextResponse.json({ success: true, data }, { status: 201 })
      }

      case "update_plan": {
        await verifyProductionMaintenanceAccess({
          userId: auth.userId,
          branchId: auth.branchId || branchId,
          action: "update",
        })
        const { id, ...updateData } = payload
        const data = await updateMaintenancePlan(id, updateData, auth.userId)
        return NextResponse.json({ success: true, data })
      }

      case "create_work_order": {
        await verifyProductionMaintenanceAccess({
          userId: auth.userId,
          branchId: auth.branchId || branchId,
          action: "create",
        })
        const data = await createMaintenanceWorkOrder(payload, auth.userId)
        return NextResponse.json({ success: true, data }, { status: 201 })
      }

      case "update_work_order_status": {
        await verifyProductionMaintenanceAccess({
          userId: auth.userId,
          branchId: auth.branchId || branchId,
          action: "update",
        })
        const { id, status, options } = payload
        const data = await updateMaintenanceWorkOrderStatus(id, status, options, auth.userId)
        return NextResponse.json({ success: true, data })
      }

      case "record_spare_part_usage": {
        await verifyProductionMaintenanceAccess({
          userId: auth.userId,
          branchId: auth.branchId || branchId,
          action: "update",
        })
        const { workOrderId, parts } = payload
        const data = await recordWorkOrderSparePartUsage(workOrderId, parts, auth.userId)
        return NextResponse.json({ success: true, data })
      }

      case "record_condition_reading": {
        await verifyProductionMaintenanceAccess({
          userId: auth.userId,
          branchId: auth.branchId || branchId,
          action: "create",
        })
        const data = await recordConditionReading(payload, auth.userId)
        return NextResponse.json({ success: true, data }, { status: 201 })
      }

      case "trigger_pm_jobs": {
        await verifyProductionMaintenanceAccess({
          userId: auth.userId,
          branchId: auth.branchId || branchId,
          action: "update",
        })
        const data = await evaluateAndTriggerMaintenanceJobs(payload, auth.userId)
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

