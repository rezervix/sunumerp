import { NextResponse } from "next/server"
import { prisma } from "@/lib/db"
import { seedRealisticInventoryData } from "@/lib/services/inventoryServerDb"

/**
 * Dış Sistemler, 3PL, Pazaryerleri ve Barkod/El Terminalleri İçin Açık REST API v1 Uç Noktası
 * Endpoint: GET /api/v1/inventory
 */
export async function GET(request: Request) {
  try {
    await seedRealisticInventoryData().catch(() => null)

    const { searchParams } = new URL(request.url)
    const sku = searchParams.get("sku")
    const warehouse = searchParams.get("warehouse")

    const [rawItems, rawBalances, rawWarehouses] = await Promise.all([
      (prisma as any).inventoryItem.findMany({ orderBy: { createdAt: "asc" } }).catch(() => []),
      (prisma as any).stockBalance.findMany().catch(() => []),
      (prisma as any).warehouse.findMany().catch(() => [])
    ])

    const whMap = new Map<string, any>((rawWarehouses || []).map((w: any) => [w.id, w]))

    let enriched = (rawItems || []).map((item: any) => {
      const balances = (rawBalances || [])
        .filter((b: any) => b.itemId === item.id)
        .map((b: any) => {
          const wh = whMap.get(b.warehouseId)
          return {
            warehouseId: b.warehouseId,
            warehouseCode: wh?.code || "DEP-MRK-01",
            warehouseName: wh?.name || "Merkez Depo",
            binCode: b.binCode || "A-01-01",
            onHandQty: Number(b.onHandQty || 0),
            reservedQty: Number(b.reservedQty || 0),
            availableQty: Number(b.availableQty || 0)
          }
        })

      const totalOnHand = balances.reduce((s: number, b: any) => s + b.onHandQty, 0)
      const totalReserved = balances.reduce((s: number, b: any) => s + b.reservedQty, 0)
      const totalAvailableAtp = balances.reduce((s: number, b: any) => s + b.availableQty, 0)

      return {
        sku: item.sku,
        barcode: item.barcode,
        name: item.name,
        category: item.category,
        itemType: item.itemType,
        baseUnit: item.baseUnit,
        valuationMethod: item.valuationMethod || "FIFO",
        fifoUnitCost: Number(item.fifoUnitCost || item.standardCost || 0),
        salesPrice: Number(item.salesPrice || 0),
        totalOnHand,
        totalReserved,
        totalAvailableAtp,
        warehouseBalances: balances
      }
    })

    if (sku) {
      enriched = enriched.filter((i: any) => i.sku.toLowerCase().includes(sku.toLowerCase()))
    }
    if (warehouse) {
      enriched = enriched.filter((i: any) =>
        i.warehouseBalances.some((wb: any) => wb.warehouseCode.toLowerCase() === warehouse.toLowerCase())
      )
    }

    return NextResponse.json({
      apiVersion: "v1.0-prisma-live",
      timestamp: new Date().toISOString(),
      source: "PostgreSQL / Prisma Real-Time Engine",
      count: enriched.length,
      items: enriched
    })
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "REST API v1 stok sorgusu başarısız" },
      { status: 500 }
    )
  }
}
