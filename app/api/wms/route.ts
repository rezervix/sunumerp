import { NextResponse } from "next/server"
import { prisma } from "@/lib/db"
import { mockDatabase } from "@/lib/data/mockDatabase"
import {
  seedRealisticWmsData,
  getWmsOverviewStats,
  advanceWmsTaskStage,
  submitCountLine,
  reconcileCountSession,
  createTransferOrder,
  advanceTransferOrderStatus,
  processOfflineWmsOperations
} from "@/lib/services/wmsServerDb"

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const section = searchParams.get("section") || "all"

    // 1. Veritabanı boşsa otomatik tohumla
    const taskCount = await (prisma as any).wmsTask.count().catch(() => 0)
    if (taskCount === 0) {
      await seedRealisticWmsData()
    }

    // A. BARKOD / SKU / ÜRÜN SORGULAMA (Mobil El Terminali ve Barkod Tabancası İçin)
    if (section === "lookup") {
      const barcode = searchParams.get("barcode") || searchParams.get("sku") || searchParams.get("q")
      if (!barcode) {
        return NextResponse.json({ success: false, error: "Barkod veya SKU girilmedi." }, { status: 400 })
      }

      const cleanCode = barcode.trim()
      const item = await (prisma as any).inventoryItem.findFirst({
        where: {
          OR: [
            { barcode: cleanCode },
            { sku: cleanCode },
            { name: { contains: cleanCode } }
          ]
        },
        include: {
          stockBalances: {
            include: {
              warehouse: true,
              storageBin: true
            }
          },
          lotSerials: true,
          unitConversions: true
        }
      })

      if (!item) {
        return NextResponse.json({
          success: false,
          error: `Barkod veya SKU bulunamadı: ${cleanCode}`
        }, { status: 404 })
      }

      const totalStock = (item.stockBalances || []).reduce((sum: number, b: any) => sum + Number(b.onHandQty || 0), 0)
      const currentBins = (item.stockBalances || []).filter((b: any) => b.storageBin).map((b: any) => ({
        binCode: b.storageBin.code,
        binPosition: b.storageBin.binPosition,
        warehouseName: b.warehouse?.name || "Depo",
        onHandQty: b.onHandQty
      }))

      return NextResponse.json({
        success: true,
        item: {
          id: item.id,
          sku: item.sku,
          name: item.name,
          barcode: item.barcode,
          baseUnit: item.baseUnit,
          category: item.category,
          salesPrice: item.salesPrice,
          totalStock,
          bins: currentBins,
          lotSerials: item.lotSerials || []
        }
      })
    }

    // B. TÜM GÖREVLER
    if (section === "tasks") {
      const tasks = await (prisma as any).wmsTask.findMany({
        include: { lines: true, warehouse: true },
        orderBy: { createdAt: "desc" }
      })
      return NextResponse.json({ success: true, tasks })
    }

    // C. RAF HÜCRELERİ & BÖLGELER
    if (section === "bins") {
      const bins = await (prisma as any).storageBin.findMany({
        include: {
          zone: true,
          warehouse: true,
          stockBalances: true
        },
        orderBy: { code: "asc" }
      })
      return NextResponse.json({ success: true, bins })
    }

    // D. SAYIM OTURUMLARI
    if (section === "counts") {
      const countSessions = await (prisma as any).inventoryCountSession.findMany({
        include: {
          warehouse: true,
          lines: true
        },
        orderBy: { createdAt: "desc" }
      })
      return NextResponse.json({ success: true, countSessions })
    }

    // E. DEPOLAR ARASI TRANSFERLER
    if (section === "transfers") {
      const transfers = await (prisma as any).warehouseTransferOrder.findMany({
        include: {
          lines: true,
          fromWarehouse: true,
          toWarehouse: true
        },
        orderBy: { createdAt: "desc" }
      })
      return NextResponse.json({ success: true, transfers })
    }

    // F. VARSAYILAN: TÜM WMS GENEL SNAPSHOT
    const [tasks, bins, zones, countSessions, transfers, warehouses, stats, items] = await Promise.all([
      (prisma as any).wmsTask.findMany({
        include: { lines: true, warehouse: true },
        orderBy: { createdAt: "desc" }
      }).catch(() => []),
      (prisma as any).storageBin.findMany({
        include: {
          zone: true,
          warehouse: true,
          stockBalances: true
        },
        orderBy: { code: "asc" }
      }).catch(() => []),
      (prisma as any).warehouseZone.findMany({
        include: { bins: true },
        orderBy: { code: "asc" }
      }).catch(() => []),
      (prisma as any).inventoryCountSession.findMany({
        include: { lines: true, warehouse: true },
        orderBy: { createdAt: "desc" }
      }).catch(() => []),
      (prisma as any).warehouseTransferOrder.findMany({
        include: { lines: true, fromWarehouse: true, toWarehouse: true },
        orderBy: { createdAt: "desc" }
      }).catch(() => []),
      (prisma as any).warehouse.findMany().catch(() => []),
      getWmsOverviewStats(),
      (prisma as any).inventoryItem.findMany({
        select: { id: true, name: true, sku: true, barcode: true, baseUnit: true },
        orderBy: { name: "asc" }
      }).catch(() => [])
    ])

    if (tasks.length === 0) {
      return NextResponse.json(mockDatabase.getWmsOverview())
    }

    return NextResponse.json({
      success: true,
      stats,
      tasks,
      bins,
      zones,
      countSessions,
      transfers,
      warehouses,
      items
    })
  } catch (error: any) {
    console.warn("GET /api/wms fallback to mockDatabase:", error)
    return NextResponse.json(mockDatabase.getWmsOverview())
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { action } = body

    // 1. GÖREVİ İLERLET (Adım Adım Sihirbaz)
    if (action === "advance_task") {
      if (!body.taskId) {
        return NextResponse.json({ success: false, error: "taskId parametresi zorunludur" }, { status: 400 })
      }
      const result = await advanceWmsTaskStage(body.taskId, body.notes)
      return NextResponse.json(result)
    }

    // 2. YENİ WMS GÖREVİ OLUŞTUR
    if (action === "create_task") {
      const count = await (prisma as any).wmsTask.count().catch(() => 0)
      const taskNumber = `TSK-${body.workflowStage?.slice(0, 3) || "GEN"}-${Date.now().toString().slice(-4)}`

      const task = await (prisma as any).wmsTask.create({
        data: {
          taskNumber,
          workflowStage: body.workflowStage || "GOODS_RECEIPT",
          warehouseId: body.warehouseId || "wh-merkez-01",
          sourceDocType: body.sourceDocType || "MANUAL_ORDER",
          sourceDocNo: body.sourceDocNo || `DOC-${Date.now().toString().slice(-5)}`,
          partnerName: body.partnerName || "Genel Tedarik / Müşteri",
          priority: body.priority || "NORMAL",
          status: "PENDING",
          assignedOperator: body.assignedOperator || "Saha Personeli",
          notes: body.notes || "",
          totalLines: 1,
          completedLines: 0
        }
      })

      if (body.itemId) {
        const item = await (prisma as any).inventoryItem.findUnique({ where: { id: body.itemId } }).catch(() => null)
        await (prisma as any).wmsTaskLine.create({
          data: {
            taskId: task.id,
            itemId: body.itemId,
            sku: item?.sku || body.sku || "SKU-GEN",
            itemName: item?.name || body.itemName || "Ürün",
            expectedQty: Number(body.quantity || 1),
            processedQty: 0,
            unit: item?.baseUnit || body.unit || "Adet",
            suggestedFromBin: body.suggestedFromBin || "R-01-01",
            suggestedToBin: body.suggestedToBin || "A-01-01",
            status: "OPEN"
          }
        })
      }

      return NextResponse.json({ success: true, message: `${taskNumber} görevi oluşturuldu.`, task })
    }

    // 3. SAYIM SATIRI KAYDET
    if (action === "save_count_line") {
      const { sessionId, lineId, countedQty, countedBy } = body
      if (!lineId || countedQty === undefined) {
        return NextResponse.json({ success: false, error: "lineId ve countedQty zorunludur" }, { status: 400 })
      }
      const result = await submitCountLine(sessionId, lineId, Number(countedQty), countedBy)
      return NextResponse.json(result)
    }

    // 4. SAYIM OTURUMUNU MAHSUPLAŞTIR (Envanter & Finans Eşitleme)
    if (action === "reconcile_count") {
      if (!body.sessionId) {
        return NextResponse.json({ success: false, error: "sessionId zorunludur" }, { status: 400 })
      }
      const result = await reconcileCountSession(body.sessionId, body.reconciledBy)
      return NextResponse.json(result)
    }

    // 5. YENİ SAYIM OTURUMU BAŞLAT
    if (action === "create_count_session") {
      const count = await (prisma as any).inventoryCountSession.count().catch(() => 0)
      const sessionNumber = `SYM-2026-${String(count + 1).padStart(3, "0")}`
      const whId = body.warehouseId || "wh-merkez-01"

      const session = await (prisma as any).inventoryCountSession.create({
        data: {
          sessionNumber,
          warehouseId: whId,
          countType: body.countType || "FULL_COUNT",
          hideSystemQty: body.countType === "BLIND_COUNT" || Boolean(body.hideSystemQty),
          status: "IN_PROGRESS",
          assignedCounters: body.assignedCounters || "Saha Ekibi",
          totalBinsCounted: 0,
          accuracyPercent: 100
        }
      })

      // Depodaki mevcut bakiyelerden otomatik sayım satırları üret
      const balances = await (prisma as any).stockBalance.findMany({
        where: { warehouseId: whId },
        include: { item: true }
      }).catch(() => [])

      for (const b of balances) {
        if (!b.item) continue
        await (prisma as any).inventoryCountLine.create({
          data: {
            sessionId: session.id,
            itemId: b.itemId,
            sku: b.item.sku,
            itemName: b.item.name,
            binCode: b.binCode || "A-01-01",
            systemQty: Number(b.onHandQty || 0),
            unitCost: Number(b.item.currentAvgCost || b.item.standardCost || 0),
            scanMethod: "BARCODE",
            isReconciled: false
          }
        }).catch(() => null)
      }

      return NextResponse.json({
        success: true,
        message: `${sessionNumber} Sayım Oturumu Başlatıldı.`,
        session
      })
    }

    // 6. DEPOLAR ARASI TRANSFER OLUŞTUR
    if (action === "create_transfer") {
      const result = await createTransferOrder({
        fromWarehouseId: body.fromWarehouseId,
        toWarehouseId: body.toWarehouseId,
        itemId: body.itemId,
        quantity: Number(body.quantity || 1),
        transferReason: body.transferReason,
        driverName: body.driverName,
        vehiclePlate: body.vehiclePlate
      })
      return NextResponse.json(result)
    }

    // 7. TRANSFER DURUMUNU İLERLET (Sevk Et / Teslim Al)
    if (action === "advance_transfer") {
      if (!body.transferOrderId || !body.newStatus) {
        return NextResponse.json({ success: false, error: "transferOrderId ve newStatus zorunludur" }, { status: 400 })
      }
      const result = await advanceTransferOrderStatus(body.transferOrderId, body.newStatus)
      return NextResponse.json(result)
    }

    // 8. ÇEVRİMDIŞI (OFFLINE) MOBİL KUYRUK TOPLU SENKRONİZASYONU
    if (action === "offline_batch_sync") {
      const operations = Array.isArray(body.operations) ? body.operations : []
      const result = await processOfflineWmsOperations(operations)
      return NextResponse.json(result)
    }

    // 9. TOHUM VERİLERİNİ SIFIRLA / YENİDEN OLUŞTUR
    if (action === "seed_reset") {
      const result = await seedRealisticWmsData()
      return NextResponse.json(result)
    }

    return NextResponse.json({ success: false, error: "Bilinmeyen WMS aksiyonu" }, { status: 400 })
  } catch (error: any) {
    console.error("POST /api/wms error:", error)
    return NextResponse.json(
      { success: false, error: error.message || "WMS işlemi gerçekleştirilemedi" },
      { status: 500 }
    )
  }
}
