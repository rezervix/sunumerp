/**
 * Lojistik Faz 2 — /api/wms Genişletilmiş Sorgu ve İşlem Dağıtıcısı
 * Mevcut GET / POST sözleşmelerini korur, tüm yeni Faz 2 özelliklerini
 * merkezi yetki/audit/idempotency/domain-error güvenceleriyle çalıştırır.
 */

import { NextResponse } from "next/server"
import { prisma } from "@/lib/db"
import {
  requireLogisticsAccess,
  handleLogisticsApiError,
  logLogisticsAudit,
} from "@/lib/logistics/security"
import {
  getWarehouseHierarchyTree,
  upsertWarehouseRecord,
  upsertWarehouseZoneRecord,
  upsertStorageBinRecord,
  toggleStorageBinState,
  savePackagingHierarchy,
  createLicensePlateWithSscc,
  generatePrintableLabelPayload,
  suggestPickAllocation,
  createStockReservation,
  releaseStockReservation,
  listReservationsWithBreakdown,
  listLocationDirectives,
  upsertLocationDirective,
  suggestPutawayBins,
  processGoodsReceiptWithVariance,
  createWavePickTask,
  completeWmsTaskExecution,
  listCrossDockOrders,
  createCrossDockOrder,
  advanceCrossDockOrder,
  listKitOrders,
  createKitOrder,
  executeKitOrder,
  createMultiLineTransferOrder,
  advanceTransferOrderWithTransit,
  reconcileCycleCountSession,
  processOfflineBatchWithConflictCheck,
  ingestRfidTagReads,
  getWarehouseKpiSnapshot,
  queryStockLedger,
  recordStockLedgerEntry,
  createFlexibleWmsTask,
  createCycleCountSession,
} from "./index"

const EXTENDED_GET_SECTIONS = new Set([
  "hierarchy",
  "directives",
  "putaway_suggest",
  "pick_suggest",
  "reservations",
  "lpns",
  "label",
  "cross_dock",
  "kitting",
  "ledger",
  "kpi",
  "rfid",
  "offline_logs",
])

export async function handleWmsExtendedGet(
  section: string,
  searchParams: URLSearchParams
): Promise<NextResponse | null> {
  if (!EXTENDED_GET_SECTIONS.has(section)) return null

  const access = await requireLogisticsAccess({
    flagKey: "lojistik_wms",
    resource: "inventory",
    action: "read",
  })
  if (access instanceof NextResponse) return access

  try {
    const warehouseId = searchParams.get("warehouseId") || undefined

    if (section === "hierarchy") {
      const tree = await getWarehouseHierarchyTree(
        warehouseId && warehouseId !== "ALL" ? warehouseId : undefined
      )
      return NextResponse.json({ success: true, warehouses: tree })
    }

    if (section === "directives") {
      const directives = await listLocationDirectives()
      return NextResponse.json({ success: true, directives })
    }

    if (section === "putaway_suggest") {
      const itemId = searchParams.get("itemId") || ""
      const whId = warehouseId && warehouseId !== "ALL" ? warehouseId : "wh-merkez-01"
      const quantity = Number(searchParams.get("quantity") || 1)
      const result = await suggestPutawayBins({ warehouseId: whId, itemId, quantity })
      return NextResponse.json({ success: true, ...result })
    }

    if (section === "pick_suggest") {
      const itemId = searchParams.get("itemId") || ""
      const whId = warehouseId && warehouseId !== "ALL" ? warehouseId : "wh-merkez-01"
      const requiredQty = Number(searchParams.get("quantity") || 1)
      const policyOverride = searchParams.get("policy") as "FEFO" | "FIFO" | null
      const result = await suggestPickAllocation({
        itemId,
        warehouseId: whId,
        requiredQty,
        ...(policyOverride ? { policyOverride } : {}),
      })
      return NextResponse.json({ success: true, ...result })
    }

    if (section === "reservations") {
      const data = await listReservationsWithBreakdown(warehouseId)
      return NextResponse.json({ success: true, ...data })
    }

    if (section === "lpns") {
      const [lpns, items, warehouses] = await Promise.all([
        prisma.licensePlate.findMany({
          ...(warehouseId && warehouseId !== "ALL" ? { where: { warehouseId } } : {}),
          include: { contents: true },
          orderBy: { createdAt: "desc" },
        }),
        prisma.inventoryItem.findMany(),
        prisma.warehouse.findMany(),
      ])
      const whMap = new Map(warehouses.map((w: any) => [w.id, w]))
      const itemMap = new Map(items.map((i: any) => [i.id, i]))
      const enriched = lpns.map((l: any) => ({
        ...l,
        warehouseName: whMap.get(l.warehouseId)?.name || "-",
        contents: (l.contents || []).map((c: any) => ({
          ...c,
          itemName: itemMap.get(c.itemId)?.name || c.sku || "-",
          sku: c.sku || itemMap.get(c.itemId)?.sku || "-",
        })),
      }))
      return NextResponse.json({ success: true, licensePlates: enriched })
    }

    if (section === "label") {
      const entityType = (searchParams.get("entityType") || "BIN") as "BIN" | "LPN" | "ITEM"
      const id = searchParams.get("id") || ""
      const payload = await generatePrintableLabelPayload({ entityType, id })
      return NextResponse.json({ success: true, label: payload })
    }

    if (section === "cross_dock") {
      const orders = await listCrossDockOrders(warehouseId)
      return NextResponse.json({ success: true, crossDockOrders: orders })
    }

    if (section === "kitting") {
      const orders = await listKitOrders(warehouseId)
      return NextResponse.json({ success: true, kitOrders: orders })
    }

    if (section === "ledger") {
      const result = await queryStockLedger({
        warehouseId: warehouseId || undefined,
        itemId: searchParams.get("itemId") || undefined,
        movementType: searchParams.get("movementType") || undefined,
        lotNumber: searchParams.get("lotNumber") || undefined,
        binCode: searchParams.get("binCode") || undefined,
        referenceDocNo: searchParams.get("referenceDocNo") || undefined,
        method: searchParams.get("method") || undefined,
        search: searchParams.get("search") || undefined,
        page: Number(searchParams.get("page") || 1),
        pageSize: Number(searchParams.get("pageSize") || 30),
      })
      return NextResponse.json({ success: true, ...result })
    }

    if (section === "kpi") {
      const kpi = await getWarehouseKpiSnapshot(warehouseId)
      return NextResponse.json({ success: true, kpi })
    }

    if (section === "rfid") {
      const events = await (prisma as any).lojistikRfidTagEvent.findMany({
        ...(warehouseId && warehouseId !== "ALL" ? { where: { warehouseId } } : {}),
        orderBy: { scannedAt: "desc" },
        take: 50,
      })
      return NextResponse.json({ success: true, events })
    }

    if (section === "offline_logs") {
      const logs = await prisma.wmsOfflineSyncLog.findMany({
        orderBy: { syncedAt: "desc" },
        take: 40,
      })
      return NextResponse.json({ success: true, logs })
    }

    return null
  } catch (err) {
    return handleLogisticsApiError(err, "WMS sorgusu işlenemedi.")
  }
}

const EXTENDED_POST_ACTIONS = new Set([
  "upsert_warehouse",
  "create_warehouse",
  "update_warehouse",
  "upsert_zone",
  "create_zone",
  "upsert_bin",
  "create_bin",
  "update_bin",
  "toggle_bin_block",
  "upsert_directive",
  "create_directive",
  "save_packaging_hierarchy",
  "create_lpn",
  "update_lpn_status",
  "create_reservation",
  "release_reservation",
  "process_goods_receipt",
  "create_wave_pick",
  "complete_task_execution",
  "create_cross_dock",
  "advance_cross_dock",
  "create_kit_order",
  "execute_kit_order",
  "record_ledger_movement",
  "ingest_rfid",
  "create_task",
  "create_transfer",
  "advance_transfer",
  "create_count_session",
  "reconcile_count",
  "approve_count",
  "offline_batch_sync",
])

function resolveRequiredPermissionAction(
  action: string
): "read" | "create" | "update" | "delete" | "approve" {
  if (
    action === "reconcile_count" ||
    action === "approve_count" ||
    action === "advance_transfer" ||
    action === "execute_kit_order"
  ) {
    return "approve"
  }
  if (
    action.startsWith("create_") ||
    action === "save_packaging_hierarchy" ||
    action === "process_goods_receipt" ||
    action === "ingest_rfid"
  ) {
    return "create"
  }
  return "update"
}

export async function handleWmsExtendedPost(
  action: string,
  body: Record<string, any>
): Promise<NextResponse | null> {
  if (!EXTENDED_POST_ACTIONS.has(action)) return null

  const permAction = resolveRequiredPermissionAction(action)
  const access = await requireLogisticsAccess({
    flagKey: "lojistik_wms",
    resource: "inventory",
    action: permAction,
  })
  if (access instanceof NextResponse) return access

  const actor = access.payload.username || "WMS Operatör"
  const actorUserId = access.payload.userId
  const branchId = access.payload.branchId

  try {
    if (action === "upsert_warehouse" || action === "create_warehouse" || action === "update_warehouse") {
      const wh = await upsertWarehouseRecord(body as any)
      await logLogisticsAudit({
        userId: actorUserId,
        action: body.id ? "WAREHOUSE_UPDATED" : "WAREHOUSE_CREATED",
        resource: "wms",
        resourceId: wh.id,
        moduleKey: "lojistik_wms",
        branchId,
        metadata: { code: wh.code, name: wh.name },
      })
      return NextResponse.json({ success: true, warehouse: wh, message: `${wh.name} kaydedildi.` })
    }

    if (action === "upsert_zone" || action === "create_zone") {
      const zone = await upsertWarehouseZoneRecord(body as any)
      await logLogisticsAudit({
        userId: actorUserId,
        action: "ZONE_SAVED",
        resource: "wms",
        resourceId: zone.id,
        moduleKey: "lojistik_wms",
        branchId,
        metadata: { code: zone.code, name: zone.name },
      })
      return NextResponse.json({ success: true, zone, message: `${zone.name} bölgesi kaydedildi.` })
    }

    if (action === "upsert_bin" || action === "create_bin" || action === "update_bin") {
      const bin = await upsertStorageBinRecord(body as any)
      await logLogisticsAudit({
        userId: actorUserId,
        action: "BIN_SAVED",
        resource: "wms",
        resourceId: bin.id,
        moduleKey: "lojistik_wms",
        branchId,
        metadata: { code: bin.code, binRole: bin.binRole || bin.binType },
      })
      return NextResponse.json({ success: true, bin, message: `${bin.code} raf hücresi kaydedildi.` })
    }

    if (action === "toggle_bin_block") {
      const bin = await toggleStorageBinState({
        binId: body.binId,
        isBlocked: body.isBlocked,
        blockReason: body.blockReason,
        isActive: body.isActive,
      })
      await logLogisticsAudit({
        userId: actorUserId,
        action: "BIN_STATE_TOGGLED",
        resource: "wms",
        resourceId: bin.id,
        moduleKey: "lojistik_wms",
        branchId,
        metadata: { code: bin.code, isBlocked: bin.isBlocked, isActive: bin.isActive },
      })
      return NextResponse.json({ success: true, bin, message: `${bin.code} raf durumu güncellendi.` })
    }

    if (action === "upsert_directive" || action === "create_directive") {
      const directive = await upsertLocationDirective(body as any)
      await logLogisticsAudit({
        userId: actorUserId,
        action: "DIRECTIVE_SAVED",
        resource: "wms",
        resourceId: directive.id,
        moduleKey: "lojistik_wms",
        branchId,
        metadata: { name: directive.name, targetZoneCode: directive.targetZoneCode },
      })
      return NextResponse.json({ success: true, directive, message: "Yerleştirme direktifi kaydedildi." })
    }

    if (action === "save_packaging_hierarchy") {
      const tiers = await savePackagingHierarchy({
        itemId: body.itemId,
        tiers: Array.isArray(body.tiers) ? body.tiers : [],
      })
      await logLogisticsAudit({
        userId: actorUserId,
        action: "PACKAGING_HIERARCHY_SAVED",
        resource: "wms",
        resourceId: body.itemId,
        moduleKey: "lojistik_wms",
        branchId,
        metadata: { tierCount: tiers.length },
      })
      return NextResponse.json({
        success: true,
        unitConversions: tiers,
        message: "Ambalaj hiyerarşisi kaydedildi.",
      })
    }

    if (action === "create_lpn") {
      const lpn = await createLicensePlateWithSscc({
        warehouseId: body.warehouseId,
        currentBinCode: body.currentBinCode,
        containerType: body.containerType,
        customLpnCode: body.customLpnCode,
        parentLpnCode: body.parentLpnCode,
        rfidTagEpc: body.rfidTagEpc,
        createdBy: actor,
        contents: body.contents,
      })
      await logLogisticsAudit({
        userId: actorUserId,
        action: "LPN_CREATED",
        resource: "wms",
        resourceId: lpn.id,
        moduleKey: "lojistik_wms",
        branchId,
        metadata: { lpnCode: lpn.lpnCode },
      })
      return NextResponse.json({ success: true, licensePlate: lpn, message: `LPN (${lpn.lpnCode}) oluşturuldu.` })
    }

    if (action === "update_lpn_status") {
      const lpn = await prisma.licensePlate.update({
        where: { id: body.lpnId },
        data: {
          ...(body.status ? { status: body.status } : {}),
          ...(body.currentBinCode ? { currentBinCode: body.currentBinCode } : {}),
        },
      })
      return NextResponse.json({ success: true, licensePlate: lpn, message: "LPN güncellendi." })
    }

    if (action === "create_reservation") {
      const reservation = await createStockReservation({
        sourceType: body.sourceType || "ORDER",
        sourceId: body.sourceId || `ORD-${Date.now().toString().slice(-6)}`,
        sourceRefNo: body.sourceRefNo,
        itemId: body.itemId,
        warehouseId: body.warehouseId,
        storageBinId: body.storageBinId,
        lotNumber: body.lotNumber,
        serialNumber: body.serialNumber,
        quantity: Number(body.quantity),
        expiresAt: body.expiresAt,
        createdBy: actor,
        notes: body.notes,
      })
      await logLogisticsAudit({
        userId: actorUserId,
        action: "RESERVATION_CREATED",
        resource: "wms",
        resourceId: reservation.id,
        moduleKey: "lojistik_wms",
        branchId,
        metadata: { reservationNo: reservation.reservationNo, qty: reservation.reservedQty },
      })
      return NextResponse.json({
        success: true,
        reservation,
        message: `Rezervasyon (${reservation.reservationNo}) oluşturuldu.`,
      })
    }

    if (action === "release_reservation") {
      const reservation = await releaseStockReservation({
        reservationId: body.reservationId,
        releaseQty: body.releaseQty ? Number(body.releaseQty) : undefined,
        markStatus: body.markStatus || "RELEASED",
        performedBy: actor,
      })
      await logLogisticsAudit({
        userId: actorUserId,
        action: "RESERVATION_RELEASED",
        resource: "wms",
        resourceId: reservation.id,
        moduleKey: "lojistik_wms",
        branchId,
        metadata: { reservationNo: reservation.reservationNo, status: reservation.status },
      })
      return NextResponse.json({
        success: true,
        reservation,
        message: `${reservation.reservationNo} güncellendi.`,
      })
    }

    if (action === "process_goods_receipt") {
      const result = await processGoodsReceiptWithVariance({
        warehouseId: body.warehouseId,
        relatedPoNo: body.relatedPoNo,
        partnerName: body.partnerName,
        performedBy: actor,
        method: body.method || "WEB",
        deviceId: body.deviceId,
        idempotencyKey: body.idempotencyKey,
        lines: Array.isArray(body.lines) ? body.lines : [],
      })
      await logLogisticsAudit({
        userId: actorUserId,
        action: "GOODS_RECEIPT_PROCESSED",
        resource: "wms",
        resourceId: result.task.id,
        moduleKey: "lojistik_wms",
        branchId,
        metadata: { taskNumber: result.task.taskNumber, movementCount: result.movements.length },
      })
      return NextResponse.json({
        success: true,
        ...result,
        message: `Mal kabul (${result.task.taskNumber}) stok defterine işlendi.`,
      })
    }

    if (action === "create_wave_pick") {
      const task = await createWavePickTask({
        warehouseId: body.warehouseId,
        waveNumber: body.waveNumber,
        assignedOperator: body.assignedOperator,
        priority: body.priority,
        dueAt: body.dueAt,
        lines: Array.isArray(body.lines) ? body.lines : [],
      })
      await logLogisticsAudit({
        userId: actorUserId,
        action: "WAVE_PICK_CREATED",
        resource: "wms",
        resourceId: task.id,
        moduleKey: "lojistik_wms",
        branchId,
        metadata: { waveNumber: task.waveNumber, taskNumber: task.taskNumber },
      })
      return NextResponse.json({
        success: true,
        task,
        data: task,
        message: `Dalga toplama (${task.waveNumber}) planlandı.`,
      })
    }

    if (action === "complete_task_execution") {
      const task = await completeWmsTaskExecution({
        taskId: body.taskId,
        performedBy: actor,
        pickedQtyByLineId: body.pickedQtyByLineId,
        shortPickReasonByLineId: body.shortPickReasonByLineId,
        method: body.method || "WEB",
        deviceId: body.deviceId,
        idempotencyKey: body.idempotencyKey,
      })
      return NextResponse.json({ success: true, task, message: `Görev (${task.taskNumber}) tamamlandı.` })
    }

    if (action === "create_cross_dock") {
      const order = await createCrossDockOrder({
        warehouseId: body.warehouseId,
        inboundPoNo: body.inboundPoNo,
        inboundReceivingBinId: body.inboundReceivingBinId,
        outboundOrderRef: body.outboundOrderRef,
        outboundRampBinId: body.outboundRampBinId,
        itemId: body.itemId,
        plannedQty: Number(body.plannedQty),
        lotNumber: body.lotNumber,
        lpnCode: body.lpnCode,
        priority: body.priority,
        assignedTo: body.assignedTo,
        notes: body.notes,
      })
      return NextResponse.json({ success: true, crossDockOrder: order, message: `${order.crossDockNo} oluşturuldu.` })
    }

    if (action === "advance_cross_dock") {
      const order = await advanceCrossDockOrder({
        crossDockId: body.crossDockId,
        nextStatus: body.nextStatus,
        quantity: body.quantity ? Number(body.quantity) : undefined,
        performedBy: actor,
        idempotencyKey: body.idempotencyKey,
      })
      return NextResponse.json({ success: true, crossDockOrder: order, message: `${order.crossDockNo} -> ${order.status}` })
    }

    if (action === "create_kit_order") {
      const order = await createKitOrder({
        operationType: body.operationType || "ASSEMBLE",
        warehouseId: body.warehouseId,
        kitItemId: body.kitItemId,
        targetBinId: body.targetBinId,
        plannedQty: Number(body.plannedQty),
        bomId: body.bomId,
        components: body.components,
        performedBy: actor,
        notes: body.notes,
      })
      return NextResponse.json({ success: true, kitOrder: order, message: `Kitting emri (${order.kitOrderNo}) oluşturuldu.` })
    }

    if (action === "execute_kit_order") {
      const order = await executeKitOrder({
        kitOrderId: body.kitOrderId,
        performedBy: actor,
        idempotencyKey: body.idempotencyKey,
      })
      return NextResponse.json({ success: true, kitOrder: order, message: `${order.kitOrderNo} tamamlandı.` })
    }

    if (action === "record_ledger_movement") {
      const res = await recordStockLedgerEntry({
        ...(body as any),
        performedBy: actor,
      })
      return NextResponse.json({
        success: true,
        ...res,
        message: res.duplicate
          ? "Çift okutma algılandı — mükerrer stok kaydı önlendi."
          : "Stok defteri hareketi işlendi.",
      })
    }

    if (action === "ingest_rfid") {
      const res = await ingestRfidTagReads({
        readerId: body.readerId || "PORTAL-RFID-01",
        antennaPort: body.antennaPort ? Number(body.antennaPort) : 1,
        warehouseId: body.warehouseId,
        countSessionId: body.countSessionId,
        reads: Array.isArray(body.reads) ? body.reads : [],
      })
      return NextResponse.json({ success: true, ...res, message: `${res.receivedCount} RFID okuması işlendi.` })
    }

    if (action === "create_task") {
      const task = await createFlexibleWmsTask(body, actor)
      await logLogisticsAudit({
        userId: actorUserId,
        action: "WMS_TASK_CREATED",
        resource: "wms",
        resourceId: task.id,
        moduleKey: "lojistik_wms",
        branchId,
        metadata: { taskNumber: task.taskNumber, workflowStage: task.workflowStage },
      })
      return NextResponse.json({ success: true, message: "WMS görevi oluşturuldu.", task, data: task })
    }

    if (action === "create_transfer") {
      const lines =
        Array.isArray(body.items) && body.items.length > 0
          ? body.items
          : body.itemId
            ? [{ itemId: body.itemId, quantity: Number(body.quantity || 1) }]
            : []
      const transferOrder = await createMultiLineTransferOrder({
        fromWarehouseId: body.fromWarehouseId,
        toWarehouseId: body.toWarehouseId,
        transferReason: body.transferReason || body.notes,
        vehiclePlate: body.vehiclePlate,
        driverName: body.driverName,
        driverPhone: body.driverPhone,
        requestedBy: actor,
        notes: body.notes,
        lines,
      })
      return NextResponse.json({
        success: true,
        transferOrder,
        data: { ...transferOrder, orderNumber: transferOrder.transferNumber },
        message: `Transfer emri (${transferOrder.transferNumber}) oluşturuldu.`,
      })
    }

    if (action === "advance_transfer") {
      const transferOrderId = body.transferOrderId || body.transferId
      const updated = await advanceTransferOrderWithTransit({
        transferOrderId,
        newStatus: body.newStatus,
        receivedQtyByLineId: body.receivedQtyByLineId,
        discrepancyNotes: body.discrepancyNotes,
        performedBy: actor,
      })
      return NextResponse.json({
        success: true,
        transferOrder: updated,
        data: updated,
        message: `Transfer durumu '${updated.status}' olarak güncellendi.`,
      })
    }

    if (action === "create_count_session") {
      const session = await createCycleCountSession(body, actor)
      return NextResponse.json({
        success: true,
        session,
        message: `Sayım oturumu (${session.sessionNumber}) başlatıldı.`,
      })
    }

    if (action === "reconcile_count" || action === "approve_count") {
      const reconciled = await reconcileCycleCountSession({
        sessionId: body.sessionId,
        performedBy: actor,
        forceApproveBeyondTolerance: Boolean(body.forceApproveBeyondTolerance || action === "approve_count"),
      })
      return NextResponse.json({
        success: true,
        session: reconciled,
        message:
          reconciled.status === "PENDING_APPROVAL"
            ? "Tolerans sınırı aşıldığı için yönetici onayı bekleniyor."
            : "Sayım mahsuplaşması stok defterine işlendi.",
      })
    }

    if (action === "offline_batch_sync") {
      const queueItems = Array.isArray(body.queueItems)
        ? body.queueItems
        : Array.isArray(body.offlineQueue)
          ? body.offlineQueue.map((q: any, idx: number) => ({
              idempotencyKey: q.idempotencyKey || q.id || `LEG-${idx}-${Date.now()}`,
              operationType: q.operationType || "WAVE_PICK",
              payload: q.payload || {
                taskId: q.taskId,
                itemId: q.itemId,
                warehouseId: q.warehouseId,
                quantity: q.quantity,
                lineId: q.lineId,
                countedQty: q.countedQty,
              },
              queuedAt: q.queuedAt || new Date().toISOString(),
            }))
          : []

      const syncReport = await processOfflineBatchWithConflictCheck({
        deviceId: body.deviceId || "EL-TERMINAL-01",
        operatorName: body.operatorName || actor,
        queueItems,
      })
      return NextResponse.json({
        success: true,
        ...syncReport,
        message: `${syncReport.syncedCount} işlem senkronize edildi, ${syncReport.conflictCount} çakışma tespit edildi.`,
      })
    }

    return null
  } catch (err) {
    return handleLogisticsApiError(err, "WMS işlemi sırasında hata oluştu.")
  }
}
