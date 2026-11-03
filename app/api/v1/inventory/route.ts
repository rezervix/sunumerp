import { NextResponse } from "next/server"
import { enterpriseInventoryService } from "@/lib/services/enterpriseInventorySuite"

/**
 * FAZ 6: Dış Sistemler, 3PL, Pazaryerleri ve IoT/RFID Cihazları İçin Açık REST API v1 Uç Noktası
 * Endpoint: /api/v1/inventory
 */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const sku = searchParams.get("sku")
  const warehouse = searchParams.get("warehouse")
  const state = enterpriseInventoryService.getState()

  let items = state.items
  if (sku) {
    items = items.filter(i => i.sku.toLowerCase() === sku.toLowerCase())
  }
  if (warehouse) {
    items = items.filter(i =>
      i.warehouseBalances.some(wb => wb.warehouseCode.toLowerCase() === warehouse.toLowerCase())
    )
  }

  return NextResponse.json({
    apiVersion: "v1.0-enterprise",
    timestamp: new Date().toISOString(),
    quotaRemaining: state.saasUsage.maxMonthlyApiCalls - state.saasUsage.currentMonthlyApiCalls,
    count: items.length,
    items: items.map(i => ({
      sku: i.sku,
      barcode: i.barcode,
      gtin: i.gtin,
      name: i.name,
      itemType: i.itemType,
      baseUnit: i.baseUnit,
      valuationMethod: i.valuationMethod,
      fifoUnitCost: i.fifoUnitCost,
      salesPrice: i.salesPrice,
      totalOnHand: i.totalOnHand,
      totalReserved: i.totalReserved,
      totalAvailableAtp: i.totalAvailable,
      warehouseBalances: i.warehouseBalances
    }))
  })
}

