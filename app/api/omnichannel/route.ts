import { NextResponse } from "next/server"
import { enterpriseInventoryService } from "@/lib/services/enterpriseInventorySuite"

export async function GET() {
  try {
    const state = enterpriseInventoryService.getState()
    return NextResponse.json({
      success: true,
      channels: state.channels,
      omnichannelOrders: state.omnichannelOrders,
      rmaReturns: state.rmaReturns,
      logisticsAdapters: state.logisticsAdapters,
      eDocuments: state.eDocuments
    })
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || "Omnichannel verileri alınamadı" },
      { status: 500 }
    )
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { action } = body

    if (action === "sync_all_channels") {
      const channels = enterpriseInventoryService.triggerOmnichannelSyncAll()
      return NextResponse.json({ success: true, data: channels })
    }

    if (action === "issue_edocument") {
      const doc = enterpriseInventoryService.issueGibEDocument(body.payload || body)
      return NextResponse.json({ success: true, data: doc })
    }

    return NextResponse.json({ success: true, state: enterpriseInventoryService.getState() })
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || "Omnichannel işlemi başarısız" },
      { status: 500 }
    )
  }
}

