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
  completeWorkOrderOperationInDb,
  createWorkOrderFromDb,
  getLiveWorkOrderDashboard,
  getShopFloorTerminalData,
  getWorkOrderByIdFromDb,
  getWorkOrderCostSummaryFromDb,
  ingestIotRecordInDb,
  issueMaterialToWorkOrderInDb,
  listWorkOrdersFromDb,
  mergeWorkOrdersInDb,
  pauseWorkOrderOperationInDb,
  resumeWorkOrderOperationInDb,
  splitWorkOrderInDb,
  startWorkOrderOperationInDb,
  updateWorkOrderStatusInDb,
} from "@/lib/services/productionWorkOrderServerDb"

/**
 * İş Emirleri & Atölye İcra özellikleri için yetki ve özellik bayrağı (feature flag) denetimi.
 */
export async function verifyProductionWorkOrdersAccess(params: {
  userId: string
  branchId?: string | null
  action: "read" | "create" | "update" | "delete" | "approve"
}) {
  const flags = getServerProductionFeatureFlags(params.branchId)
  if (!flags.uretim_is_emri) {
    throw new ProductionDomainError(
      "FEATURE_DISABLED",
      "Üretim / İş Emri modülü özellik bayrağı (uretim_is_emri) kapalıdır.",
      undefined,
      403
    )
  }

  if (params.userId === DEBUG_USER_ID && process.env.NODE_ENV !== "production") {
    return true
  }

  const isSuper = await isSuperAdminUser(params.userId)
  if (isSuper) return true

  const normRes = normalizePermissionResource("uretim_is_emri")
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
    `Bu üretim emri işlemi için yetkiniz bulunmamaktadır (${normRes}:${normAct}).`,
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
      const section = searchParams.get("section")
      if (section === "dashboard") return NextResponse.json(mockDatabase.getProductionWorkOrderDashboard())
      if (section === "terminal") return NextResponse.json(mockDatabase.getProductionTerminalData())
      if (section === "cost_summary" || section === "work_order") {
        return NextResponse.json({
          success: true,
          workOrder: mockDatabase.getProductionWorkOrders().workOrders[0],
          costSummary: {
            theoreticalMaterialCost: 23000,
            theoreticalLaborCost: 4400,
            theoreticalOverheadCost: 1600,
            theoreticalTotalCost: 29000,
            actualMaterialCost: 16100,
            actualLaborCost: 3200,
            actualOverheadCost: 1100,
            actualTotalCost: 20400,
            costVariance: 8600,
            scrapCost: 0,
          },
        })
      }
      return NextResponse.json(mockDatabase.getProductionWorkOrders())
    }

    const branchId = searchParams.get("branchId") || null
    const flags = getServerProductionFeatureFlags(branchId)

    // 1. Özellik bayrağı kontrolü (auth öncesi 403)
    if (!flags.uretim_is_emri) {
      return NextResponse.json(
        {
          success: false,
          error: "Üretim / İş Emri modülü devre dışıdır (özellik bayrağı kapalı).",
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
    await verifyProductionWorkOrdersAccess({
      userId: auth.userId,
      branchId: auth.branchId || branchId,
      action: "read",
    })

    const section = searchParams.get("section") || "work_orders"

    switch (section) {
      case "work_orders": {
        const result = await listWorkOrdersFromDb({
          branchId: auth.branchId || branchId,
          status: searchParams.get("status") || undefined,
          priority: searchParams.get("priority") || undefined,
          itemId: searchParams.get("itemId") || undefined,
          search: searchParams.get("search") || undefined,
          page: searchParams.get("page") || undefined,
          pageSize: searchParams.get("pageSize") || undefined,
        })
        return NextResponse.json({ success: true, ...result })
      }

      case "work_order": {
        const id = searchParams.get("id")
        if (!id) {
          throw new ProductionDomainError("VALIDATION_ERROR", "id parametresi zorunludur.")
        }
        const workOrder = await getWorkOrderByIdFromDb(id)
        return NextResponse.json({ success: true, workOrder })
      }

      case "dashboard": {
        const dashboard = await getLiveWorkOrderDashboard()
        return NextResponse.json({ success: true, dashboard })
      }

      case "terminal": {
        const workCenterId = searchParams.get("workCenterId") || undefined
        const operatorUserId = searchParams.get("operatorUserId") || undefined
        const terminalData = await getShopFloorTerminalData(workCenterId, operatorUserId)
        return NextResponse.json({ success: true, terminalData })
      }

      case "cost_summary": {
        const id = searchParams.get("id")
        if (!id) {
          throw new ProductionDomainError("VALIDATION_ERROR", "id parametresi zorunludur.")
        }
        const costSummary = await getWorkOrderCostSummaryFromDb(id)
        return NextResponse.json({ success: true, costSummary })
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
    const action = body.action || "create_work_order"

    // İlgili eyleme göre yetki eşleşmesi
    let requiredAction: "create" | "update" | "approve" = "create"
    if (
      action === "update_status" &&
      (body.targetStatus === "APPROVED" || body.targetStatus === "CLOSED")
    ) {
      requiredAction = "approve"
    } else if (
      action === "start_operation" ||
      action === "pause_operation" ||
      action === "resume_operation" ||
      action === "complete_operation" ||
      action === "issue_material" ||
      action === "split" ||
      action === "merge" ||
      action === "update_status"
    ) {
      requiredAction = "update"
    }

    await verifyProductionWorkOrdersAccess({
      userId: auth.userId,
      branchId: auth.branchId || body.branchId,
      action: requiredAction,
    })

    switch (action) {
      case "create_work_order": {
        const workOrder = await createWorkOrderFromDb({
          branchId: auth.branchId || body.branchId,
          itemId: body.itemId,
          plannedQuantity: body.plannedQuantity,
          unit: body.unit,
          bomId: body.bomId,
          routingId: body.routingId,
          priority: body.priority,
          sourceType: body.sourceType,
          sourceDocumentId: body.sourceDocumentId,
          plannedStartDate: body.plannedStartDate,
          plannedEndDate: body.plannedEndDate,
          targetWarehouseId: body.targetWarehouseId,
          lotNumber: body.lotNumber,
          notes: body.notes,
          createdByUserId: auth.userId,
        })

        await logProductionAudit({
          resource: "URETIM_IS_EMRI",
          action: "CREATE",
          entityId: workOrder.id,
          entityCode: workOrder.workOrderNumber,
          userId: auth.userId,
          branchId: auth.branchId,
          details: {
            itemId: workOrder.itemId,
            plannedQuantity: workOrder.plannedQuantity,
            sourceType: workOrder.sourceType,
          },
        })

        return NextResponse.json({ success: true, workOrder }, { status: 201 })
      }

      case "update_status": {
        if (!body.workOrderId || !body.targetStatus) {
          throw new ProductionDomainError(
            "VALIDATION_ERROR",
            "workOrderId ve targetStatus parametreleri zorunludur."
          )
        }
        const updated = await updateWorkOrderStatusInDb(
          body.workOrderId,
          body.targetStatus,
          auth.userId,
          body.reason
        )

        await logProductionAudit({
          resource: "URETIM_IS_EMRI",
          action: "UPDATE",
          entityId: updated.id,
          entityCode: updated.workOrderNumber,
          userId: auth.userId,
          branchId: auth.branchId,
          details: {
            previousStatus: body.targetStatus,
            newStatus: updated.status,
            reason: body.reason,
          },
        })

        return NextResponse.json({ success: true, workOrder: updated })
      }

      case "start_operation": {
        if (!body.operationId) {
          throw new ProductionDomainError("VALIDATION_ERROR", "operationId zorunludur.")
        }
        const operation = await startWorkOrderOperationInDb(
          body.operationId,
          auth.userId,
          body.workCenterId
        )

        await logProductionAudit({
          resource: "URETIM_IS_EMRI",
          action: "START_OPERATION",
          entityId: operation.id,
          entityCode: `OP-${operation.operationNumber}`,
          userId: auth.userId,
          branchId: auth.branchId,
          details: { workOrderId: operation.workOrderId, workCenterId: body.workCenterId },
        })

        return NextResponse.json({ success: true, operation })
      }

      case "pause_operation": {
        if (!body.operationId || !body.reasonCode) {
          throw new ProductionDomainError(
            "VALIDATION_ERROR",
            "operationId ve reasonCode parametreleri zorunludur."
          )
        }
        const stoppage = await pauseWorkOrderOperationInDb(
          body.operationId,
          body.reasonCode,
          body.notes,
          auth.userId
        )

        await logProductionAudit({
          resource: "URETIM_IS_EMRI",
          action: "UPDATE",
          entityId: stoppage.id,
          entityCode: stoppage.reasonCode,
          userId: auth.userId,
          branchId: auth.branchId,
          details: { operationId: body.operationId, notes: body.notes },
        })

        return NextResponse.json({ success: true, stoppage })
      }

      case "resume_operation": {
        if (!body.operationId) {
          throw new ProductionDomainError("VALIDATION_ERROR", "operationId zorunludur.")
        }
        const resumed = await resumeWorkOrderOperationInDb(body.operationId)

        await logProductionAudit({
          resource: "URETIM_IS_EMRI",
          action: "UPDATE",
          entityId: resumed.id,
          entityCode: `OP-${resumed.operationNumber}`,
          userId: auth.userId,
          branchId: auth.branchId,
          details: { status: resumed.status },
        })

        return NextResponse.json({ success: true, operation: resumed })
      }

      case "complete_operation": {
        if (!body.operationId || body.producedQty === undefined) {
          throw new ProductionDomainError(
            "VALIDATION_ERROR",
            "operationId ve producedQty parametreleri zorunludur."
          )
        }
        const completed = await completeWorkOrderOperationInDb({
          operationId: body.operationId,
          producedQty: Number(body.producedQty),
          scrapQty: body.scrapQty !== undefined ? Number(body.scrapQty) : 0,
          scrapReasonCode: body.scrapReasonCode,
          operatorUserId: auth.userId,
          actualMachineMinutes: body.actualMachineMinutes,
          actualLaborMinutes: body.actualLaborMinutes,
        })

        await logProductionAudit({
          resource: "URETIM_IS_EMRI",
          action: "COMPLETE_OPERATION",
          entityId: completed.id,
          entityCode: `OP-${completed.operationNumber}`,
          userId: auth.userId,
          branchId: auth.branchId,
          details: {
            producedQty: body.producedQty,
            scrapQty: body.scrapQty,
            scrapReasonCode: body.scrapReasonCode,
          },
        })

        return NextResponse.json({ success: true, operation: completed })
      }

      case "issue_material": {
        if (!body.materialId || body.quantity === undefined) {
          throw new ProductionDomainError(
            "VALIDATION_ERROR",
            "materialId ve quantity parametreleri zorunludur."
          )
        }
        const material = await issueMaterialToWorkOrderInDb(
          body.materialId,
          Number(body.quantity),
          auth.userId,
          body.lotNumber,
          body.serialNumber
        )

        await logProductionAudit({
          resource: "URETIM_IS_EMRI",
          action: "CONSUME_MATERIAL",
          entityId: material.id,
          entityCode: material.item?.sku || "MATERIAL",
          userId: auth.userId,
          branchId: auth.branchId,
          details: {
            workOrderId: material.workOrderId,
            issuedQty: body.quantity,
            lotNumber: body.lotNumber,
          },
        })

        return NextResponse.json({ success: true, material })
      }

      case "split": {
        if (!body.workOrderId || !body.splitQuantity) {
          throw new ProductionDomainError(
            "VALIDATION_ERROR",
            "workOrderId ve splitQuantity parametreleri zorunludur."
          )
        }
        const splitResult = await splitWorkOrderInDb(
          body.workOrderId,
          Number(body.splitQuantity),
          auth.userId
        )

        await logProductionAudit({
          resource: "URETIM_IS_EMRI",
          action: "UPDATE",
          entityId: splitResult.parentOrder.id,
          entityCode: splitResult.parentOrder.workOrderNumber,
          userId: auth.userId,
          branchId: auth.branchId,
          details: {
            childOrderNumber: splitResult.childOrder.workOrderNumber,
            splitQuantity: body.splitQuantity,
          },
        })

        return NextResponse.json({ success: true, ...splitResult })
      }

      case "merge": {
        if (!body.firstOrderId || !body.secondOrderId) {
          throw new ProductionDomainError(
            "VALIDATION_ERROR",
            "firstOrderId ve secondOrderId parametreleri zorunludur."
          )
        }
        const merged = await mergeWorkOrdersInDb(
          body.firstOrderId,
          body.secondOrderId,
          auth.userId
        )

        await logProductionAudit({
          resource: "URETIM_IS_EMRI",
          action: "UPDATE",
          entityId: merged.id,
          entityCode: merged.workOrderNumber,
          userId: auth.userId,
          branchId: auth.branchId,
          details: {
            mergedWith: body.secondOrderId,
            newQuantity: merged.plannedQuantity,
          },
        })

        return NextResponse.json({ success: true, workOrder: merged })
      }

      case "ingest_iot": {
        const staging = await ingestIotRecordInDb({
          deviceId: body.deviceId,
          deviceType: body.deviceType || "PLC",
          workOrderId: body.workOrderId,
          operationId: body.operationId,
          sensorKey: body.sensorKey,
          payload: body.payload || {},
        })

        return NextResponse.json({ success: true, staging }, { status: 201 })
      }

      default:
        throw new ProductionDomainError("VALIDATION_ERROR", `Geçersiz action parametresi: ${action}`)
    }
  } catch (error: any) {
    return handleProductionApiError(error)
  }
}

