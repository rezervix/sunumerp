import { NextResponse } from "next/server"
import {
  enterpriseInventoryService,
  ERP_MIGRATION_PRESETS,
  SAAS_TIERS
} from "@/lib/services/enterpriseInventorySuite"

export async function GET() {
  try {
    const state = enterpriseInventoryService.getState()
    return NextResponse.json({
      success: true,
      apiKeys: state.apiKeys,
      webhooks: state.webhooks,
      plugins: state.plugins,
      migrationPresets: ERP_MIGRATION_PRESETS,
      migrationJobs: state.migrationJobs,
      saasTiers: SAAS_TIERS,
      saasUsage: state.saasUsage
    })
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || "Ekosistem verileri alınamadı" },
      { status: 500 }
    )
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { action } = body

    if (action === "toggle_plugin") {
      const plugin = enterpriseInventoryService.togglePluginInstallation(body.pluginId)
      return NextResponse.json({ success: true, data: plugin })
    }

    if (action === "run_migration") {
      const job = enterpriseInventoryService.runErpMigrationJob(
        body.sourceSystem,
        body.entities || ["Stok Kartları", "Depo Bakiyeleri"]
      )
      return NextResponse.json({ success: true, data: job })
    }

    if (action === "update_saas_tier") {
      const usage = enterpriseInventoryService.updateSaasTier(body.tierId)
      return NextResponse.json({ success: true, data: usage })
    }

    return NextResponse.json({ success: true, state: enterpriseInventoryService.getState() })
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || "Ekosistem işlemi başarısız" },
      { status: 500 }
    )
  }
}

