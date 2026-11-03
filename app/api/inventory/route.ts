import { NextResponse } from "next/server"
import { prisma } from "@/lib/db"
import {
  enterpriseInventoryService,
  calculateStockValuation,
  calculateBomRollupCost,
  convertStockUnit
} from "@/lib/services/enterpriseInventorySuite"

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const section = searchParams.get("section") || "all"
    const state = enterpriseInventoryService.getState()

    // Eşzamanlı olarak yerel/Prisma veritabanında da kayıt varsa birleştir
    const dbWarehouses = await (prisma as any).warehouse?.findMany().catch(() => [])
    const dbItems = await (prisma as any).inventoryItem?.findMany().catch(() => [])

    if (section === "valuation") {
      const itemId = searchParams.get("itemId") || state.items[0]?.id
      const qty = Number(searchParams.get("qty") || 25)
      const item = state.items.find(i => i.id === itemId) || state.items[0]
      return NextResponse.json({
        success: true,
        valuation: calculateStockValuation(item, qty)
      })
    }

    if (section === "bom") {
      const bomId = searchParams.get("bomId") || state.bomRecipes[0]?.id
      const batches = Number(searchParams.get("batches") || 1)
      const bom = state.bomRecipes.find(b => b.id === bomId) || state.bomRecipes[0]
      return NextResponse.json({
        success: true,
        bom,
        rollup: calculateBomRollupCost(bom, batches)
      })
    }

    return NextResponse.json({
      success: true,
      warehouses: dbWarehouses?.length ? dbWarehouses : state.warehouses,
      items: dbItems?.length ? dbItems : state.items,
      alternatives: state.alternatives,
      lotBatches: state.lotBatches,
      bomRecipes: state.bomRecipes
    })
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || "Stok verileri alınamadı" },
      { status: 500 }
    )
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { action } = body

    if (action === "create_item") {
      const created = enterpriseInventoryService.addInventoryItem(body.payload || body)
      await (prisma as any).inventoryItem?.create({
        data: {
          id: created.id,
          sku: created.sku,
          barcode: created.barcode,
          name: created.name,
          category: created.category,
          brand: created.brand,
          itemType: created.itemType,
          parentItemId: created.parentItemId,
          baseUnit: created.baseUnit,
          valuationMethod: created.valuationMethod,
          standardCost: created.standardCost,
          salesPrice: created.salesPrice,
          trackLot: created.trackLot,
          trackSerial: created.trackSerial,
          trackExpiry: created.trackExpiry
        }
      }).catch(() => null)
      return NextResponse.json({ success: true, data: created })
    }

    if (action === "generate_matrix_variant") {
      const created = enterpriseInventoryService.generateMatrixVariants(body.payload || body)
      return NextResponse.json({ success: true, data: created })
    }

    if (action === "create_lot_batch") {
      const created = enterpriseInventoryService.addLotBatchRecord(body.payload || body)
      return NextResponse.json({ success: true, data: created })
    }

    if (action === "convert_unit") {
      const { itemId, quantity, fromUnit, toUnit } = body.payload || body
      const state = enterpriseInventoryService.getState()
      const item = state.items.find(i => i.id === itemId) || state.items[0]
      const result = convertStockUnit(item, Number(quantity || 1), fromUnit, toUnit)
      return NextResponse.json({ success: true, data: result })
    }

    return NextResponse.json({ success: true, state: enterpriseInventoryService.getState() })
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || "Stok işlemi başarısız" },
      { status: 500 }
    )
  }
}

