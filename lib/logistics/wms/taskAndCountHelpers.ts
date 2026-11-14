/**
 * Lojistik Faz 2 — Eski WMS Servisindeki Şema Hatalarını Tamir Eden Yardımcı Katman
 * (app/api/wms/route.ts tarafından kullanılır; mevcut API sözleşmelerini %100 korur)
 */

import { prisma } from "@/lib/db"
import { LogisticsDomainError } from "@/lib/logistics/security"

/**
 * Görev oluşturma (hem CreateWmsTaskModal `taskType/assignedTo/items[]` hem de
 * eski API `workflowStage/assignedOperator/itemId/quantity` formatlarını destekler).
 */
export async function createFlexibleWmsTask(body: Record<string, any>, fallbackUser: string) {
  const workflowStage = String(body.workflowStage || body.taskType || "WAVE_PICK").toUpperCase()
  const assignedOperator = body.assignedOperator || body.assignedTo || fallbackUser || "Atanmadı"
  const warehouseId = body.warehouseId

  if (!warehouseId) {
    throw new LogisticsDomainError("WAREHOUSE_REQUIRED", "Depo seçimi zorunludur.", 400)
  }

  const rawItems: Array<{ itemId: string; quantity: number; targetBinId?: string | null; lotNumber?: string | null }> =
    Array.isArray(body.items) && body.items.length > 0
      ? body.items
      : body.itemId
        ? [{ itemId: body.itemId, quantity: Number(body.quantity || 1), targetBinId: body.targetBinId }]
        : []

  if (rawItems.length === 0) {
    throw new LogisticsDomainError("TASK_ITEMS_REQUIRED", "Görev için en az bir ürün satırı girilmelidir.", 400)
  }

  const bins = await prisma.storageBin.findMany({ where: { warehouseId } })
  const binById = new Map(bins.map((b: any) => [b.id, b]))

  const taskLinesData: any[] = []
  for (const row of rawItems) {
    const item = await prisma.inventoryItem.findUnique({ where: { id: row.itemId } })
    if (!item) continue
    const targetBin = row.targetBinId ? binById.get(row.targetBinId) : null
    taskLinesData.push({
      itemId: item.id,
      sku: item.sku,
      itemName: item.name,
      lotNumber: row.lotNumber ?? null,
      expectedQty: Number(row.quantity || 1),
      processedQty: 0,
      rejectedQty: 0,
      unit: item.baseUnit || "Adet",
      suggestedFromBin: workflowStage === "WAVE_PICK" ? targetBin?.code ?? null : null,
      suggestedToBin: workflowStage === "PUTAWAY" || workflowStage === "GOODS_RECEIPT" ? targetBin?.code ?? null : null,
      status: "OPEN",
    })
  }

  if (taskLinesData.length === 0) {
    throw new LogisticsDomainError("INVALID_TASK_ITEMS", "Geçerli ürün kalemi bulunamadı.", 400)
  }

  const prefixMap: Record<string, string> = {
    GOODS_RECEIPT: "MK",
    PUTAWAY: "PA",
    WAVE_PICK: "PICK",
    PACKING: "PCK",
    SHIPPING: "SVK",
    TRANSFER: "TRN",
    CYCLE_COUNT: "SYM",
  }
  const prefix = prefixMap[workflowStage] || "TSK"
  const taskNumber = `${prefix}-${new Date().getFullYear()}-${Math.floor(10000 + Math.random() * 89999)}`

  return await prisma.wmsTask.create({
    data: {
      taskNumber,
      workflowStage,
      taskCategory: body.taskCategory || (workflowStage === "WAVE_PICK" ? "WAVE_PICK" : "STANDARD"),
      waveNumber: body.waveNumber ?? null,
      warehouseId,
      sourceDocType: body.sourceDocType || "MANUAL",
      sourceDocNo: body.sourceDocNo || taskNumber,
      relatedPoNo: body.relatedPoNo ?? null,
      partnerName: body.partnerName ?? null,
      priority: body.priority || "NORMAL",
      status: "PENDING",
      assignedOperator,
      dueAt: body.dueAt ? new Date(body.dueAt) : new Date(Date.now() + 8 * 3600000),
      totalLines: taskLinesData.length,
      completedLines: 0,
      notes: body.notes ?? null,
      lines: { create: taskLinesData },
    },
    include: { lines: true },
  })
}

/**
 * Sayım oturumu başlatma (ABC filtresi, Bölge filtresi, Planlanan Tarih & Tolerans % destekli).
 */
export async function createCycleCountSession(body: Record<string, any>, fallbackUser: string) {
  const warehouseId = body.warehouseId
  if (!warehouseId) {
    throw new LogisticsDomainError("WAREHOUSE_REQUIRED", "Sayım deposu seçilmelidir.", 400)
  }

  const [balances, items, bins] = await Promise.all([
    prisma.stockBalance.findMany({ where: { warehouseId } }),
    prisma.inventoryItem.findMany(),
    prisma.storageBin.findMany({ where: { warehouseId } }),
  ])

  const itemMap = new Map(items.map((i: any) => [i.id, i]))
  const binMap = new Map(bins.map((b: any) => [b.id, b]))

  const zoneFilter = body.zoneFilter && body.zoneFilter !== "ALL" ? String(body.zoneFilter) : null
  const abcFilter = body.abcClassFilter && body.abcClassFilter !== "ALL" ? String(body.abcClassFilter) : null
  const countType = body.countType || "BLIND_COUNT"
  const itemIdSet =
    Array.isArray(body.itemIds) && body.itemIds.length > 0
      ? new Set(body.itemIds.map((id: any) => String(id)))
      : null

  const targetBalances = balances
    .filter((b: any) => {
      const it = itemMap.get(b.itemId)
      if (!it) return false
      if (itemIdSet && !itemIdSet.has(it.id)) return false
      const bin = b.storageBinId ? binMap.get(b.storageBinId) : null
      if (zoneFilter && bin && bin.zoneId !== zoneFilter) return false
      if (abcFilter && it.abcClass !== abcFilter) return false
      if (countType === "CYCLE_SMART_COUNT" && !abcFilter && it.abcClass !== "A") return false
      return Number(b.onHandQty || 0) >= 0
    })
    .sort((a: any, b: any) => Number(b.availableQty || 0) - Number(a.availableQty || 0))

  const linesData = targetBalances.slice(0, 50).map((b: any) => {
    const it = itemMap.get(b.itemId)
    return {
      itemId: it.id,
      sku: it.sku,
      itemName: it.name,
      binCode: b.binCode || (b.storageBinId ? binMap.get(b.storageBinId)?.code : null) || "GENEL",
      systemQty: Number(b.onHandQty || 0),
      unitCost: Number(it.currentAvgCost || it.fifoUnitCost || it.standardCost || 0),
      scanMethod: "BARCODE",
      varianceQty: 0,
      varianceAmount: 0,
      isReconciled: false,
    }
  })

  if (linesData.length === 0) {
    // Depoda bakiye yoksa aktif ürünlerden başlangıç satırı üret
    const fallbackItems = itemIdSet ? items.filter((it: any) => itemIdSet.has(it.id)) : items.slice(0, 3)
    for (const it of fallbackItems) {
      linesData.push({
        itemId: it.id,
        sku: it.sku,
        itemName: it.name,
        binCode: bins[0]?.code || "GENEL",
        systemQty: 0,
        unitCost: Number(it.currentAvgCost || it.standardCost || 0),
        scanMethod: "BARCODE",
        varianceQty: 0,
        varianceAmount: 0,
        isReconciled: false,
      })
    }
  }

  const sessionNumber = `SYM-${new Date().getFullYear()}-${Math.floor(10000 + Math.random() * 89999)}`
  const initialStatus = body.scheduledDate && body.status === "PLANNED" ? "PLANNED" : "IN_PROGRESS"

  return await prisma.inventoryCountSession.create({
    data: {
      sessionNumber,
      warehouseId,
      zoneFilter,
      abcClassFilter: abcFilter || (countType === "CYCLE_SMART_COUNT" ? "A" : "ALL"),
      countType,
      hideSystemQty: countType === "BLIND_COUNT" || Boolean(body.hideSystemQty),
      status: initialStatus,
      assignedCounters: body.assignedCounters || fallbackUser || "Sayım Ekibi",
      scheduledDate: body.scheduledDate ? new Date(body.scheduledDate) : new Date(),
      tolerancePercent: body.tolerancePercent !== undefined ? Number(body.tolerancePercent) : 5.0,
      totalBinsCounted: linesData.length,
      accuracyPercent: 100,
      totalVarianceValue: 0,
      lines: { create: linesData },
    },
    include: { lines: true, warehouse: true },
  })
}
