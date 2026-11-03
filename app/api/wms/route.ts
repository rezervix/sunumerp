import { NextResponse } from "next/server"
import { prisma } from "@/lib/db"
import { enterpriseInventoryService } from "@/lib/services/enterpriseInventorySuite"

export async function GET() {
  try {
    const state = enterpriseInventoryService.getState()
    return NextResponse.json({
      success: true,
      warehouses: state.warehouses,
      wmsBins: state.wmsBins,
      directives: state.directives,
      wmsTasks: state.wmsTasks,
      licensePlates: state.licensePlates,
      transferOrders: state.transferOrders,
      countSessions: state.countSessions
    })
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || "WMS verileri alınamadı" },
      { status: 500 }
    )
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { action } = body

    if (action === "advance_task") {
      const updated = enterpriseInventoryService.advanceWmsTaskStage(body.taskId)
      return NextResponse.json({ success: true, data: updated })
    }

    if (action === "reconcile_count") {
      const reconciled = enterpriseInventoryService.reconcileCountSession(body.sessionId)
      return NextResponse.json({ success: true, data: reconciled })
    }

    if (action === "offline_batch_sync") {
      const operations = Array.isArray(body.operations) ? body.operations : []
      for (const op of operations) {
        await (prisma as any).wmsOfflineSyncLog?.create({
          data: {
            deviceId: op.deviceId || "ZEBRA-TC58",
            operatorName: op.operatorName || "Saha Operatörü",
            operationType: op.operationType || "BARCODE_SCAN",
            payloadJson: JSON.stringify(op),
            queuedAt: new Date(op.queuedAt || Date.now()),
            status: "SYNCED"
          }
        }).catch(() => null)
      }
      return NextResponse.json({
        success: true,
        syncedCount: operations.length,
        syncedAt: new Date().toISOString()
      })
    }

    return NextResponse.json({ success: true, state: enterpriseInventoryService.getState() })
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || "WMS işlemi başarısız" },
      { status: 500 }
    )
  }
}

