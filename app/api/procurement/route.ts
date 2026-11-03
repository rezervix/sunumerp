import { NextResponse } from "next/server"
import {
  enterpriseInventoryService,
  calculateDynamicReorderPoint
} from "@/lib/services/enterpriseInventorySuite"

export async function GET() {
  try {
    const state = enterpriseInventoryService.getState()
    return NextResponse.json({
      success: true,
      suppliers: state.suppliers,
      reorderPolicies: state.reorderPolicies,
      purchaseRequisitions: state.purchaseRequisitions,
      consignmentStocks: state.consignmentStocks
    })
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || "Satın alma verileri alınamadı" },
      { status: 500 }
    )
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { action } = body

    if (action === "calculate_rop") {
      const result = calculateDynamicReorderPoint(body.payload || body)
      return NextResponse.json({ success: true, data: result })
    }

    if (action === "approve_requisition") {
      const updated = enterpriseInventoryService.approvePurchaseRequisition(body.reqId)
      return NextResponse.json({ success: true, data: updated })
    }

    if (action === "settle_consignment") {
      const updated = enterpriseInventoryService.settleConsignmentStock(
        body.consignId,
        Number(body.consumeQty || 0)
      )
      return NextResponse.json({ success: true, data: updated })
    }

    return NextResponse.json({ success: true, state: enterpriseInventoryService.getState() })
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || "Satın alma işlemi başarısız" },
      { status: 500 }
    )
  }
}

