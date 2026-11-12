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
  approveMpsPlan,
  bulkConvertPlannedOrders,
  cloneMpsPlanScenario,
  convertPlannedOrderToPurchaseRequisition,
  convertPlannedOrderToWorkOrderContract,
  createMpsPlan,
  getItemTimePhasedWithPegging,
  getMpsGridData,
  getMpsPlanById,
  listActionMessagesFromDb,
  listMpsPlansFromDb,
  listPlannedOrdersFromDb,
  resolveActionMessage,
  runMrpProcess,
  saveMpsPlanItems,
} from "@/lib/services/productionMrpMpsServerDb"
import {
  benchmarkMrpEngine,
  compareWhatIfMpsScenarios,
} from "@/lib/services/productionMrpMpsEngine"
import { prisma } from "@/lib/db"

/**
 * MRP & MPS özellikleri için yetki ve özellik bayrağı (feature flag) denetimi.
 */
export async function verifyProductionMrpMpsAccess(params: {
  userId: string
  branchId?: string | null
  action: "read" | "create" | "update" | "delete" | "approve"
}) {
  const flags = getServerProductionFeatureFlags(params.branchId)
  if (!flags.uretim_mrp_mps) {
    throw new ProductionDomainError(
      "FEATURE_DISABLED",
      "MRP (Malzeme İhtiyaç Planlaması) ve MPS modülü özellik bayrağı kapalıdır.",
      undefined,
      403
    )
  }

  if (params.userId === DEBUG_USER_ID && process.env.NODE_ENV !== "production") {
    return true
  }

  const isSuper = await isSuperAdminUser(params.userId)
  if (isSuper) return true

  const normRes = normalizePermissionResource("uretim_mrp_mps")
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
    `Bu MRP / MPS işlemi için yetkiniz bulunmamaktadır (${normRes}:${normAct}).`,
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

import { isDemoModeActive } from "@/lib/data-controller"
import { mockDatabase } from "@/lib/data/mockDatabase"

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)

    if (isDemoModeActive()) {
      const section = searchParams.get("section") || "mps_plans"
      if (section === "mps_plans") return NextResponse.json(mockDatabase.getProductionMpsPlans())
      if (section === "mps_grid") return NextResponse.json(mockDatabase.getProductionMpsGrid())
      if (section === "mrp_runs") return NextResponse.json(mockDatabase.getProductionMrpRuns())
      if (section === "mrp_run") return NextResponse.json(mockDatabase.getProductionMrpRunDetail())
      if (section === "planned_orders") return NextResponse.json(mockDatabase.getProductionPlannedOrders())
      if (section === "action_messages") return NextResponse.json(mockDatabase.getProductionActionMessages())
      return NextResponse.json(mockDatabase.getProductionMpsPlans())
    }

    const branchId = searchParams.get("branchId") || null
    const flags = getServerProductionFeatureFlags(branchId)

    // 1. Özellik bayrağı kontrolü (auth öncesi 403)
    if (!flags.uretim_mrp_mps) {
      return NextResponse.json(
        {
          success: false,
          error: "MRP & MPS modülü devre dışıdır (özellik bayrağı kapalı).",
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
    await verifyProductionMrpMpsAccess({
      userId: auth.userId,
      branchId: auth.branchId || branchId,
      action: "read",
    })

    const section = searchParams.get("section") || "mps_plans"

    switch (section) {
      case "mps_plans": {
        const result = await listMpsPlansFromDb({
          branchId: auth.branchId || branchId,
          status: searchParams.get("status") || undefined,
          isWhatIfScenario: searchParams.get("isWhatIfScenario") || undefined,
          search: searchParams.get("search") || undefined,
          page: searchParams.get("page") || undefined,
          pageSize: searchParams.get("pageSize") || undefined,
        })
        return NextResponse.json({ success: true, ...result })
      }

      case "mps_plan": {
        const id = searchParams.get("id")
        if (!id) {
          throw new ProductionDomainError("VALIDATION_ERROR", "MPS plan ID'si zorunludur.")
        }
        const plan = await getMpsPlanById(id)
        return NextResponse.json({ success: true, plan })
      }

      case "mps_grid": {
        const planId = searchParams.get("mpsPlanId")
        if (!planId) {
          throw new ProductionDomainError("VALIDATION_ERROR", "mpsPlanId parametresi zorunludur.")
        }
        const gridData = await getMpsGridData(planId)
        return NextResponse.json({ success: true, ...gridData })
      }

      case "compare_scenarios": {
        const basePlanId = searchParams.get("basePlanId")
        const scenarioPlanId = searchParams.get("scenarioPlanId")
        if (!basePlanId || !scenarioPlanId) {
          throw new ProductionDomainError("VALIDATION_ERROR", "basePlanId ve scenarioPlanId zorunludur.")
        }
        const [baseGrid, scenGrid] = await Promise.all([
          getMpsGridData(basePlanId),
          getMpsGridData(scenarioPlanId),
        ])
        const firstBaseItem = baseGrid.grid[0]?.matrix || []
        const firstScenItem = scenGrid.grid[0]?.matrix || []
        const comparison = compareWhatIfMpsScenarios(firstBaseItem, firstScenItem)
        return NextResponse.json({ success: true, comparison, baseGrid, scenGrid })
      }

      case "mrp_runs": {
        const runs = await (prisma as any).uretimMrpRun.findMany({
          orderBy: { startedAt: "desc" },
          take: 20,
          include: {
            mpsPlan: true,
            _count: { select: { plannedOrders: true, actionMessages: true } },
          },
        })
        return NextResponse.json({ success: true, runs })
      }

      case "mrp_run": {
        const id = searchParams.get("id")
        if (!id) throw new ProductionDomainError("VALIDATION_ERROR", "Run ID zorunludur.")
        const run = await (prisma as any).uretimMrpRun.findUnique({
          where: { id },
          include: {
            mpsPlan: true,
            plannedOrders: {
              include: { item: true },
              orderBy: { releaseDate: "asc" },
            },
            actionMessages: {
              include: { item: true },
              orderBy: { createdAt: "desc" },
            },
          },
        })
        if (!run) throw new ProductionDomainError("NOT_FOUND", "MRP Çalıştırması bulunamadı.")
        return NextResponse.json({ success: true, run })
      }

      case "planned_orders": {
        const result = await listPlannedOrdersFromDb({
          mrpRunId: searchParams.get("mrpRunId") || undefined,
          itemId: searchParams.get("itemId") || undefined,
          orderType: searchParams.get("orderType") || undefined,
          orderStatus: searchParams.get("orderStatus") || undefined,
          page: searchParams.get("page") || undefined,
          pageSize: searchParams.get("pageSize") || undefined,
        })
        return NextResponse.json({ success: true, ...result })
      }

      case "action_messages": {
        const result = await listActionMessagesFromDb({
          mrpRunId: searchParams.get("mrpRunId") || undefined,
          itemId: searchParams.get("itemId") || undefined,
          actionType: searchParams.get("actionType") || undefined,
          severity: searchParams.get("severity") || undefined,
          isResolved: searchParams.get("isResolved") || undefined,
          page: searchParams.get("page") || undefined,
          pageSize: searchParams.get("pageSize") || undefined,
        })
        return NextResponse.json({ success: true, ...result })
      }

      case "item_time_phased": {
        const itemId = searchParams.get("itemId")
        if (!itemId) throw new ProductionDomainError("VALIDATION_ERROR", "itemId parametresi zorunludur.")
        const result = await getItemTimePhasedWithPegging(itemId)
        return NextResponse.json({ success: true, ...result })
      }

      case "benchmark": {
        const itemCount = parseInt(searchParams.get("itemCount") || "5000", 10)
        const linkCount = parseInt(searchParams.get("linkCount") || "20000", 10)
        const report = benchmarkMrpEngine(itemCount, linkCount)
        return NextResponse.json({ success: true, report })
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
    const action = body.action || "create_mps_plan"

    // İlgili eyleme göre gerekli izin kontrolü
    let requiredAction: "create" | "update" | "approve" = "create"
    if (action === "approve_mps_plan") requiredAction = "approve"
    else if (action === "save_mps_items" || action === "resolve_action_message") requiredAction = "update"

    await verifyProductionMrpMpsAccess({
      userId: auth.userId,
      branchId: auth.branchId || body.branchId,
      action: requiredAction,
    })

    switch (action) {
      case "create_mps_plan": {
        const plan = await createMpsPlan({
          branchId: auth.branchId || body.branchId,
          code: body.code,
          name: body.name,
          revision: body.revision,
          bucketType: body.bucketType,
          horizonDays: body.horizonDays,
          frozenDays: body.frozenDays,
          isWhatIfScenario: body.isWhatIfScenario,
          scenarioName: body.scenarioName,
          basePlanId: body.basePlanId,
          notes: body.notes,
        })

        await logProductionAudit({
          resource: "URETIM_MRP_MPS",
          action: "CREATE",
          entityId: plan.id,
          entityCode: plan.code,
          userId: auth.userId,
          branchId: auth.branchId || body.branchId,
          details: { name: plan.name, bucketType: plan.bucketType },
        })

        return NextResponse.json({ success: true, plan }, { status: 201 })
      }

      case "save_mps_items": {
        const plan = await saveMpsPlanItems({
          mpsPlanId: body.mpsPlanId,
          items: body.items || [],
          overrideFrozenHorizon: body.overrideFrozenHorizon,
        })

        await logProductionAudit({
          resource: "URETIM_MRP_MPS",
          action: "UPDATE",
          entityId: plan.id,
          entityCode: plan.code,
          userId: auth.userId,
          branchId: auth.branchId,
          details: { updatedItemsCount: body.items?.length || 0 },
        })

        return NextResponse.json({ success: true, plan })
      }

      case "approve_mps_plan": {
        if (!body.planId) throw new ProductionDomainError("VALIDATION_ERROR", "planId zorunludur.")
        const plan = await approveMpsPlan(body.planId, auth.userId)

        await logProductionAudit({
          resource: "URETIM_MRP_MPS",
          action: "APPROVE",
          entityId: plan.id,
          entityCode: plan.code,
          userId: auth.userId,
          branchId: auth.branchId,
          details: { approvedAt: plan.approvedAt },
        })

        return NextResponse.json({ success: true, plan })
      }

      case "clone_mps_scenario": {
        if (!body.basePlanId || !body.scenarioName) {
          throw new ProductionDomainError("VALIDATION_ERROR", "basePlanId ve scenarioName zorunludur.")
        }
        const clonedPlan = await cloneMpsPlanScenario(
          body.basePlanId,
          body.scenarioName,
          body.forecastMultiplier !== undefined ? Number(body.forecastMultiplier) : 1.0
        )

        await logProductionAudit({
          resource: "URETIM_MRP_MPS",
          action: "CREATE",
          entityId: clonedPlan.id,
          entityCode: clonedPlan.code,
          userId: auth.userId,
          branchId: auth.branchId,
          details: { scenarioName: body.scenarioName, basePlanId: body.basePlanId },
        })

        return NextResponse.json({ success: true, plan: clonedPlan }, { status: 201 })
      }

      case "run_mrp": {
        const result = await runMrpProcess({
          branchId: auth.branchId || body.branchId,
          mpsPlanId: body.mpsPlanId || null,
          runType: body.runType || "FULL_REGENERATION",
          triggeredBy: auth.userId,
          filterItemIds: body.filterItemIds,
        })

        await logProductionAudit({
          resource: "URETIM_MRP_MPS",
          action: "RUN_MRP",
          entityId: result.run.id,
          entityCode: result.run.runCode,
          userId: auth.userId,
          branchId: auth.branchId,
          details: result.summary,
        })

        return NextResponse.json({ success: true, ...result })
      }

      case "convert_to_purchase_requisition": {
        if (!body.plannedOrderId) {
          throw new ProductionDomainError("VALIDATION_ERROR", "plannedOrderId zorunludur.")
        }
        const res = await convertPlannedOrderToPurchaseRequisition(
          body.plannedOrderId,
          auth.userId,
          body.targetWarehouseId || "DEFAULT_WAREHOUSE"
        )

        await logProductionAudit({
          resource: "URETIM_MRP_MPS",
          action: "UPDATE",
          entityId: body.plannedOrderId,
          entityCode: res.plannedOrder.orderNumber,
          userId: auth.userId,
          branchId: auth.branchId,
          details: {
            convertedToRequisitionId: res.requisition.id,
            reqNumber: res.requisition.reqNumber,
          },
        })

        return NextResponse.json({ success: true, ...res })
      }

      case "bulk_convert_purchase": {
        if (!body.plannedOrderIds || !Array.isArray(body.plannedOrderIds)) {
          throw new ProductionDomainError("VALIDATION_ERROR", "plannedOrderIds dizisi zorunludur.")
        }
        const res = await bulkConvertPlannedOrders(
          body.plannedOrderIds,
          auth.userId,
          body.targetWarehouseId || "DEFAULT_WAREHOUSE"
        )

        await logProductionAudit({
          resource: "URETIM_MRP_MPS",
          action: "UPDATE",
          entityId: "BULK_CONVERSION",
          entityCode: `CONVERT-${res.successfulCount}-ITEMS`,
          userId: auth.userId,
          branchId: auth.branchId,
          details: { successful: res.successfulCount, failed: res.failedCount },
        })

        return NextResponse.json({ success: true, ...res })
      }

      case "convert_to_work_order_contract": {
        if (!body.plannedOrderId) {
          throw new ProductionDomainError("VALIDATION_ERROR", "plannedOrderId zorunludur.")
        }
        const contract = await convertPlannedOrderToWorkOrderContract(body.plannedOrderId)

        await logProductionAudit({
          resource: "URETIM_MRP_MPS",
          action: "RELEASE",
          entityId: body.plannedOrderId,
          entityCode: contract.workOrderCode,
          userId: auth.userId,
          branchId: auth.branchId,
          details: { contract },
        })

        return NextResponse.json({ success: true, contract })
      }

      case "resolve_action_message": {
        if (!body.messageId) {
          throw new ProductionDomainError("VALIDATION_ERROR", "messageId zorunludur.")
        }
        const msg = await resolveActionMessage(body.messageId, auth.userId)
        return NextResponse.json({ success: true, message: msg })
      }

      default:
        throw new ProductionDomainError("VALIDATION_ERROR", `Bilinmeyen aksiyon: ${action}`)
    }
  } catch (error: any) {
    return handleProductionApiError(error)
  }
}

export async function DELETE(request: Request) {
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

    const { searchParams } = new URL(request.url)
    const id = searchParams.get("id")
    if (!id) throw new ProductionDomainError("VALIDATION_ERROR", "Silinecek plan ID zorunludur.")

    await verifyProductionMrpMpsAccess({
      userId: auth.userId,
      branchId: auth.branchId,
      action: "delete",
    })

    const plan = await getMpsPlanById(id)
    if (plan.status === "APPROVED") {
      throw new ProductionDomainError(
        "INVALID_STATE_TRANSITION",
        "Onaylanmış MPS planları doğrudan silinemez. Arşive kaldırılmalıdır."
      )
    }

    await (prisma as any).uretimMpsPlan.delete({ where: { id } })

    await logProductionAudit({
      resource: "URETIM_MRP_MPS",
      action: "DELETE",
      entityId: id,
      entityCode: plan.code,
      userId: auth.userId,
      branchId: auth.branchId,
      details: { deletedPlanCode: plan.code },
    })

    return NextResponse.json({ success: true, message: "MPS Planı başarıyla silindi." })
  } catch (error: any) {
    return handleProductionApiError(error)
  }
}

