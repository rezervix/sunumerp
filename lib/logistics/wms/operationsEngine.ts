/**
 * Lojistik Faz 2 — Operasyon Motorları: Put-Away Kuralları, Mal Kabul, Wave Toplama,
 * Cross-Docking, Kitting, Depolar Arası Transfer, Döngüsel Sayım, Çevrimdışı Çakışma & RFID
 */

import { prisma } from "@/lib/db"
import { LogisticsDomainError } from "@/lib/logistics/security"
import { recordStockLedgerEntry } from "./stockLedgerService"
import { suggestPickAllocation, releaseStockReservation } from "./reservationAndFefo"
import {
  resolveNormalizedBinRole,
  type WmsCrossDockStatus,
  type WmsKitOperationType,
  type WmsWarehouseKpiSnapshot,
} from "./constantsAndHelpers"

// ─────────────────────────────────────────────────────────────────────────────
// 1. PUT-AWAY YERLEŞTİRME DİREKTİF KURALLARI & ÖNERİ MOTORU
// ─────────────────────────────────────────────────────────────────────────────

export async function listLocationDirectives() {
  return await prisma.locationDirective.findMany({ orderBy: { priority: "asc" } })
}

export async function upsertLocationDirective(input: {
  id?: string
  name: string
  directiveType?: string
  warehouseId?: string | null
  itemCategory?: string | null
  abcClassFilter?: string | null
  requiresColdChain?: boolean
  strategy?: string
  targetZoneCode: string
  priority?: number
  isActive?: boolean
}) {
  if (!input.name?.trim() || !input.targetZoneCode?.trim()) {
    throw new LogisticsDomainError("INVALID_DIRECTIVE", "Direktif adı ve hedef bölge kodu/tipi zorunludur.", 400)
  }

  const data = {
    name: input.name.trim(),
    directiveType: input.directiveType || "PUTAWAY",
    warehouseId: input.warehouseId ?? null,
    itemCategory: input.itemCategory ?? null,
    abcClassFilter: input.abcClassFilter ?? null,
    requiresColdChain: Boolean(input.requiresColdChain),
    strategy: input.strategy || "FIXED_BIN_CONSOLIDATE",
    targetZoneCode: input.targetZoneCode.trim(),
    priority: Number(input.priority ?? 10),
    isActive: input.isActive !== undefined ? input.isActive : true,
  }

  if (input.id) {
    return await prisma.locationDirective.update({ where: { id: input.id }, data })
  }
  return await prisma.locationDirective.create({ data })
}

/**
 * Bir ürün ve miktar için LocationDirective kuralları, soğuk zincir/ABC uyumu,
 * kapasite (kg/m³) ve SKU konsolidasyonu kurallarına göre en uygun Put-Away raf gözlerini önerir.
 */
export async function suggestPutawayBins(params: {
  warehouseId: string
  itemId: string
  quantity: number
}) {
  const [item, zones, bins, balances, directives] = await Promise.all([
    prisma.inventoryItem.findUnique({ where: { id: params.itemId } }),
    prisma.warehouseZone.findMany({ where: { warehouseId: params.warehouseId } }),
    prisma.storageBin.findMany({ where: { warehouseId: params.warehouseId } }),
    prisma.stockBalance.findMany({ where: { warehouseId: params.warehouseId } }),
    prisma.locationDirective.findMany({
      where: { directiveType: "PUTAWAY", isActive: true },
      orderBy: { priority: "asc" },
    }),
  ])

  if (!item) throw new LogisticsDomainError("ITEM_NOT_FOUND", "Ürün bulunamadı.", 404)

  const zoneMap = new Map(zones.map((z: any) => [z.id, z]))
  const requiredWeight = Number(params.quantity || 1) * Number(item.weightKg ?? 0.5)
  const requiredVolume = Number(params.quantity || 1) * Number(item.volumeM3 ?? 0.01)

  const matchingDirectives = directives.filter((d: any) => {
    const whOk = !d.warehouseId || d.warehouseId === params.warehouseId
    const catOk =
      !d.itemCategory ||
      d.itemCategory === "ALL" ||
      String(item.category || "").toLowerCase().includes(String(d.itemCategory).toLowerCase())
    const abcOk = !d.abcClassFilter || d.abcClassFilter === "ALL" || d.abcClassFilter === item.abcClass
    return whOk && catOk && abcOk
  })

  const usableBins = bins.filter((b: any) => {
    if (b.isBlocked || b.isActive === false) return false
    const role = resolveNormalizedBinRole(b)
    if (role === "QUARANTINE" || role === "RETURN_RMA" || role === "SHIPPING") return false
    const remWeight = Number(b.maxWeightKg || 1200) - Number(b.currentWeightKg || 0)
    const remVolume = Number(b.maxVolumeM3 || 2.4) - Number(b.currentVolumeM3 || 0)
    return remWeight >= requiredWeight && remVolume >= requiredVolume
  })

  const scored = usableBins.map((bin: any) => {
    const zone = zoneMap.get(bin.zoneId)
    const binBalances = balances.filter(
      (bal: any) => bal.storageBinId === bin.id && Number(bal.onHandQty || 0) > 0
    )
    const hasSameSku = binBalances.some((bal: any) => bal.itemId === item.id)
    const isEmpty = binBalances.length === 0
    const role = resolveNormalizedBinRole(bin)

    let score = 100
    const reasons: string[] = []

    const topDir = matchingDirectives[0]
    if (topDir) {
      if (
        zone?.code === topDir.targetZoneCode ||
        zone?.zoneType === topDir.targetZoneCode
      ) {
        score += 40
        reasons.push(`Direktif uyumu (${topDir.name})`)
      }
      if (
        (topDir.strategy === "FIXED_BIN_CONSOLIDATE" || topDir.strategy === "FEFO_FIRST") &&
        hasSameSku
      ) {
        score += 30
        reasons.push("Aynı SKU konsolidasyonu")
      }
      if (topDir.strategy === "EMPTY_BIN_LOWEST_LEVEL" && isEmpty) {
        score += 25
        reasons.push("Boş raf tercihi")
      }
    } else if (item.defaultPutawayZoneType && zone?.zoneType === item.defaultPutawayZoneType) {
      score += 35
      reasons.push("Varsayılan ürün bölge tipi")
    }

    if (item.trackExpiry && (zone?.zoneType === "COLD" || role === "COLD_STORAGE")) {
      score += 25
      reasons.push("SKT / Soğuk zincir uyumu")
    }
    if (bin.abcVelocity === item.abcClass) {
      score += 15
      reasons.push(`ABC (${item.abcClass}) hız sınıfı eşleşmesi`)
    }
    if (!bin.allowMixedSku && !isEmpty && !hasSameSku) {
      score -= 80
    }
    score -= Number(bin.occupancyPercent || 0) * 0.2

    return {
      binId: bin.id,
      binCode: bin.code,
      zoneName: zone?.name || "-",
      zoneType: zone?.zoneType || "AMBIENT",
      binRole: role,
      aisle: bin.aisle,
      rack: bin.rack,
      remainingWeightKg: Number((Number(bin.maxWeightKg || 1200) - Number(bin.currentWeightKg || 0)).toFixed(1)),
      remainingVolumeM3: Number((Number(bin.maxVolumeM3 || 2.4) - Number(bin.currentVolumeM3 || 0)).toFixed(3)),
      occupancyPercent: Number(bin.occupancyPercent || 0),
      hasSameSku,
      score: Number(score.toFixed(1)),
      reasons: reasons.length > 0 ? reasons : ["Uygun kapasiteli boş/müsait raf"],
    }
  })

  scored.sort((a, b) => b.score - a.score)
  return {
    appliedDirective: matchingDirectives[0] ?? null,
    candidates: scored.slice(0, 6),
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// 2. SATINALMA BAĞLANTILI & FARKLI MAL KABUL + WAVE/BATCH TOPLAMA
// ─────────────────────────────────────────────────────────────────────────────

export async function processGoodsReceiptWithVariance(params: {
  warehouseId: string
  relatedPoNo?: string | null
  partnerName?: string | null
  performedBy: string
  method?: "WEB" | "HANDHELD_CAMERA" | "HANDHELD_USB" | "OFFLINE_SYNC"
  deviceId?: string | null
  idempotencyKey?: string | null
  lines: Array<{
    itemId: string
    expectedQty: number
    receivedGoodQty: number
    damagedQty?: number
    lotNumber?: string | null
    serialNumber?: string | null
    expiryDate?: string | null
    targetBinId?: string | null
    quarantineBinId?: string | null
    lpnCode?: string | null
    unitCost?: number
  }>
}) {
  if (!params.lines || params.lines.length === 0) {
    throw new LogisticsDomainError("EMPTY_RECEIPT", "En az bir mal kabul satırı girilmelidir.", 400)
  }

  const taskNumber = `MK-${new Date().getFullYear()}-${Math.floor(10000 + Math.random() * 89999)}`
  const docRef = params.relatedPoNo?.trim() || taskNumber

  const bins = await prisma.storageBin.findMany({ where: { warehouseId: params.warehouseId } })
  const quarantineFallbackBin =
    bins.find((b: any) => resolveNormalizedBinRole(b) === "QUARANTINE" && !b.isBlocked) ?? null

  const taskLinesData: any[] = []
  const movements: any[] = []

  for (let i = 0; i < params.lines.length; i++) {
    const line = params.lines[i]
    const item = await prisma.inventoryItem.findUnique({ where: { id: line.itemId } })
    if (!item) throw new LogisticsDomainError("ITEM_NOT_FOUND", `Ürün bulunamadı (${line.itemId}).`, 404)

    const goodQty = Math.max(0, Number(line.receivedGoodQty || 0))
    const damagedQty = Math.max(0, Number(line.damagedQty || 0))
    const expectedQty = Math.max(0, Number(line.expectedQty || goodQty + damagedQty))
    const totalPhysical = goodQty + damagedQty
    const varianceQty = Number((totalPhysical - expectedQty).toFixed(4))
    const varianceReason =
      damagedQty > 0
        ? "DAMAGED"
        : varianceQty < 0
          ? "SHORT"
          : varianceQty > 0
            ? "OVER"
            : "NONE"

    let targetBinId = line.targetBinId ?? null
    if (!targetBinId && goodQty > 0) {
      const sug = await suggestPutawayBins({
        warehouseId: params.warehouseId,
        itemId: item.id,
        quantity: goodQty,
      })
      targetBinId = sug.candidates[0]?.binId ?? null
    }

    const chosenBin = targetBinId ? bins.find((b: any) => b.id === targetBinId) : null
    const lotNumber =
      line.lotNumber?.trim() ||
      (item.trackLot ? `LOT-${item.sku.slice(0, 4)}-${Date.now().toString().slice(-4)}` : null)

    if (goodQty > 0) {
      const ledgerRes = await recordStockLedgerEntry({
        itemId: item.id,
        warehouseId: params.warehouseId,
        movementType: "RECEIPT",
        quantityDelta: goodQty,
        unit: item.baseUnit,
        storageBinId: targetBinId,
        toBinCode: chosenBin?.code ?? "MAL_KABUL",
        lotNumber,
        serialNumber: line.serialNumber ?? null,
        expiryDate: line.expiryDate ?? null,
        lpnCode: line.lpnCode ?? null,
        referenceDocNo: docRef,
        performedBy: params.performedBy,
        unitCostOverride: line.unitCost,
        idempotencyKey: params.idempotencyKey ? `${params.idempotencyKey}-L${i}-GOOD` : null,
        deviceId: params.deviceId ?? null,
        method: params.method || "WEB",
        traceEventType: "SUPPLIER_RECEIPT",
        notes: `Mal Kabul (${docRef})${varianceQty !== 0 ? ` · Fark: ${varianceQty}` : ""}`,
      })
      movements.push(ledgerRes.movement)
    }

    if (damagedQty > 0) {
      const qBinId = line.quarantineBinId || quarantineFallbackBin?.id || null
      const qBin = qBinId ? bins.find((b: any) => b.id === qBinId) : null
      if (qBinId && qBin) {
        const qBal = await prisma.stockBalance.findFirst({
          where: { itemId: item.id, warehouseId: params.warehouseId, storageBinId: qBinId },
        })
        const nextOnHand = Number(qBal?.onHandQty || 0) + damagedQty
        const nextQuar = Number(qBal?.quarantineQty || 0) + damagedQty
        if (qBal) {
          await prisma.stockBalance.update({
            where: { id: qBal.id },
            data: { onHandQty: nextOnHand, quarantineQty: nextQuar },
          })
        } else {
          await prisma.stockBalance.create({
            data: {
              itemId: item.id,
              warehouseId: params.warehouseId,
              storageBinId: qBinId,
              binCode: qBin.code,
              onHandQty: damagedQty,
              reservedQty: 0,
              availableQty: 0,
              inTransitQty: 0,
              quarantineQty: damagedQty,
              consignmentQty: 0,
            },
          })
        }
      }

      const allItemBals = await prisma.stockBalance.findMany({
        where: { itemId: item.id, warehouseId: params.warehouseId },
      })
      const balanceAfterQty = Number(
        allItemBals.reduce((s: number, b: any) => s + Number(b.onHandQty || 0), 0).toFixed(4)
      )
      const qUnitCost = Number(line.unitCost || item.standardCost || 0)
      const qMove = await prisma.stockMovement.create({
        data: {
          itemId: item.id,
          warehouseId: params.warehouseId,
          movementType: "RECEIPT",
          quantity: damagedQty,
          unit: item.baseUnit || "Adet",
          valuationMethodUsed: item.valuationMethod || "FIFO",
          unitCost: qUnitCost,
          totalCost: Number((damagedQty * qUnitCost).toFixed(2)),
          lotNumber,
          serialNumber: line.serialNumber ?? null,
          toBinCode: qBin?.code ?? "KARANTINA",
          lpnCode: line.lpnCode ?? null,
          referenceDocNo: docRef,
          performedBy: params.performedBy,
          notes: `Hasarlı / Karantina Mal Kabulü (${docRef})`,
          idempotencyKey: params.idempotencyKey ? `${params.idempotencyKey}-L${i}-DAMAGED` : null,
          deviceId: params.deviceId ?? null,
          method: params.method || "WEB",
          balanceAfterQty,
        },
      })
      movements.push(qMove)
    }

    taskLinesData.push({
      itemId: item.id,
      sku: item.sku,
      itemName: item.name,
      lotNumber,
      serialNumber: line.serialNumber ?? null,
      expiryDate: line.expiryDate ? new Date(line.expiryDate) : null,
      expectedQty,
      processedQty: goodQty,
      rejectedQty: damagedQty,
      varianceQty,
      varianceReason,
      unit: item.baseUnit,
      suggestedToBin: chosenBin?.code ?? "MAL_KABUL",
      actualBin: chosenBin?.code ?? "MAL_KABUL",
      lpnCode: line.lpnCode ?? null,
      qcResult: damagedQty > 0 ? "PARTIAL_QC_HOLD" : "PASSED",
      scanMethod: params.method || "WEB",
      status: "COMPLETED",
    })
  }

  const task = await prisma.wmsTask.create({
    data: {
      taskNumber,
      workflowStage: "PUTAWAY",
      taskCategory: "STANDARD",
      warehouseId: params.warehouseId,
      sourceDocType: params.relatedPoNo ? "PURCHASE_ORDER" : "DIRECT_RECEIPT",
      sourceDocNo: docRef,
      relatedPoNo: params.relatedPoNo ?? null,
      partnerName: params.partnerName ?? null,
      priority: "HIGH",
      status: "COMPLETED",
      assignedOperator: params.performedBy,
      totalLines: taskLinesData.length,
      completedLines: taskLinesData.length,
      startedAt: new Date(),
      completedAt: new Date(),
      notes: `Mal kabul işlendi (${docRef})`,
      lines: { create: taskLinesData },
    },
    include: { lines: true },
  })

  return { task, movements }
}

/**
 * Sipariş/Talep satırlarını birleştirip Wave Picking (Dalga Toplama) ve Koridor Sıralı + FEFO rotalı görev üretir.
 */
export async function createWavePickTask(params: {
  warehouseId: string
  waveNumber?: string
  assignedOperator?: string
  priority?: string
  dueAt?: string | null
  lines: Array<{
    itemId: string
    quantity: number
    sourceOrderRef?: string
  }>
}) {
  if (!params.lines || params.lines.length === 0) {
    throw new LogisticsDomainError("EMPTY_WAVE", "Dalga toplama için en az bir kalem gerekir.", 400)
  }

  const waveNumber =
    params.waveNumber?.trim() ||
    `WV-${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, "0")}-${Math.floor(100 + Math.random() * 899)}`

  // Aynı SKU taleplerini toplu dalgada birleştir (Batch/Wave konsolidasyonu)
  const aggregated = new Map<string, { itemId: string; quantity: number; refs: string[] }>()
  for (const row of params.lines) {
    const qty = Number(row.quantity || 0)
    if (qty <= 0) continue
    const prev = aggregated.get(row.itemId) || { itemId: row.itemId, quantity: 0, refs: [] }
    prev.quantity += qty
    if (row.sourceOrderRef) prev.refs.push(row.sourceOrderRef)
    aggregated.set(row.itemId, prev)
  }

  const pickTaskLines: any[] = []
  for (const req of aggregated.values()) {
    const item = await prisma.inventoryItem.findUnique({ where: { id: req.itemId } })
    if (!item) continue
    const allocation = await suggestPickAllocation({
      itemId: req.itemId,
      warehouseId: params.warehouseId,
      requiredQty: req.quantity,
    })

    if (allocation.suggestions.length === 0) {
      throw new LogisticsDomainError(
        "NO_PICKABLE_STOCK",
        `${item.sku} için toplanabilir stok bulunamadı (Karantina veya bloklu stok harici kullanılabilir bakiye yok).`,
        409
      )
    }

    for (const sug of allocation.suggestions) {
      pickTaskLines.push({
        itemId: item.id,
        sku: item.sku,
        itemName: item.name,
        lotNumber: sug.lotNumber,
        suggestedLotNumber: sug.lotNumber,
        serialNumber: sug.serialNumber,
        expiryDate: sug.expiryDate ? new Date(sug.expiryDate) : null,
        expectedQty: sug.suggestedPickQty,
        processedQty: 0,
        rejectedQty: 0,
        unit: item.baseUnit || "Adet",
        suggestedFromBin: sug.binCode,
        suggestedToBin: "PACK-STAGING-01",
        status: "OPEN",
        aisleSort: `${sug.aisle}-${sug.rack}-${sug.binCode}`,
      })
    }
  }

  // Koridor/Raf sırasına göre en kısa yürüme rotası sıralaması
  pickTaskLines.sort((a, b) => String(a.aisleSort).localeCompare(String(b.aisleSort)))

  const cleanLines = pickTaskLines.map(({ aisleSort, ...rest }) => rest)
  const taskNumber = `PICK-${new Date().getFullYear()}-${Math.floor(10000 + Math.random() * 89999)}`

  return await prisma.wmsTask.create({
    data: {
      taskNumber,
      workflowStage: "WAVE_PICK",
      taskCategory: cleanLines.length > 1 ? "WAVE_PICK" : "STANDARD",
      waveNumber,
      warehouseId: params.warehouseId,
      sourceDocType: "WAVE_ORDER",
      sourceDocNo: waveNumber,
      priority: params.priority || "HIGH",
      status: "PENDING",
      assignedOperator: params.assignedOperator || "Atanmadı",
      dueAt: params.dueAt ? new Date(params.dueAt) : new Date(Date.now() + 4 * 3600000),
      totalLines: cleanLines.length,
      completedLines: 0,
      notes: `FEFO/FIFO uyumlu koridor sıralı toplama dalgası (${waveNumber})`,
      lines: { create: cleanLines },
    },
    include: { lines: true },
  })
}

/**
 * Görev satırı tamamlama (Short-Pick / Eksik Toplama veya Put-Away/Packing/Shipping ilerletme destekli)
 */
export async function completeWmsTaskExecution(params: {
  taskId: string
  performedBy: string
  pickedQtyByLineId?: Record<string, number>
  shortPickReasonByLineId?: Record<string, string>
  method?: "WEB" | "HANDHELD_CAMERA" | "HANDHELD_USB" | "OFFLINE_SYNC"
  deviceId?: string | null
  idempotencyKey?: string | null
}) {
  const task = await prisma.wmsTask.findUnique({
    where: { id: params.taskId },
    include: { lines: true },
  })
  if (!task) throw new LogisticsDomainError("TASK_NOT_FOUND", "WMS görevi bulunamadı.", 404)
  if (task.status === "COMPLETED") {
    throw new LogisticsDomainError(
      "TASK_ALREADY_COMPLETED",
      `Görev (${task.taskNumber}) zaten tamamlanmış.`,
      409
    )
  }

  const bins = await prisma.storageBin.findMany({ where: { warehouseId: task.warehouseId } })
  const binByCode = new Map(bins.map((b: any) => [b.code, b]))

  for (const line of task.lines || []) {
    const qtyInput =
      params.pickedQtyByLineId && params.pickedQtyByLineId[line.id] !== undefined
        ? Number(params.pickedQtyByLineId[line.id])
        : Number(line.expectedQty || 0)
    const variance = Number((qtyInput - Number(line.expectedQty || 0)).toFixed(4))

    const sourceBin = line.suggestedFromBin ? binByCode.get(line.suggestedFromBin) : null
    if (task.workflowStage === "WAVE_PICK" || task.workflowStage === "SHIPPING") {
      if (qtyInput > 0) {
        await recordStockLedgerEntry({
          itemId: line.itemId,
          warehouseId: task.warehouseId,
          movementType: "ISSUE",
          quantityDelta: qtyInput,
          unit: line.unit || "Adet",
          storageBinId: sourceBin?.id ?? null,
          fromBinCode: line.suggestedFromBin ?? null,
          lotNumber: line.lotNumber ?? null,
          serialNumber: line.serialNumber ?? null,
          lpnCode: line.lpnCode ?? null,
          referenceDocNo: task.taskNumber,
          performedBy: params.performedBy,
          idempotencyKey: params.idempotencyKey
            ? `${params.idempotencyKey}-${line.id}`
            : `TASK-COMPLETE-${task.id}-${line.id}`,
          deviceId: params.deviceId ?? null,
          method: params.method || "WEB",
          traceEventType: task.workflowStage === "SHIPPING" ? "CUSTOMER_SHIPMENT" : "PICK_PACK",
          notes:
            variance < 0
              ? `Kısmi/Eksik Toplama (${params.shortPickReasonByLineId?.[line.id] || "SHORT_PICK"})`
              : `${task.workflowStage} tamamlandı`,
        })
      }
    }

    await prisma.wmsTaskLine.update({
      where: { id: line.id },
      data: {
        processedQty: qtyInput,
        varianceQty: variance,
        varianceReason: variance < 0 ? params.shortPickReasonByLineId?.[line.id] || "SHORT" : "NONE",
        status: "COMPLETED",
        scanMethod: params.method || "WEB",
      },
    })
  }

  return await prisma.wmsTask.update({
    where: { id: task.id },
    data: {
      status: "COMPLETED",
      completedLines: task.lines?.length || task.totalLines,
      startedAt: task.startedAt || new Date(),
      completedAt: new Date(),
      assignedOperator: task.assignedOperator === "Atanmadı" ? params.performedBy : task.assignedOperator,
    },
    include: { lines: true },
  })
}

// ─────────────────────────────────────────────────────────────────────────────
// 3. CROSS-DOCKING İŞ AKIŞI
// ─────────────────────────────────────────────────────────────────────────────

export async function listCrossDockOrders(warehouseId?: string) {
  const [orders, items, warehouses, bins] = await Promise.all([
    (prisma as any).lojistikCrossDockOrder.findMany({
      ...(warehouseId && warehouseId !== "ALL" ? { where: { warehouseId } } : {}),
      orderBy: { createdAt: "desc" },
    }),
    prisma.inventoryItem.findMany(),
    prisma.warehouse.findMany(),
    prisma.storageBin.findMany(),
  ])
  const itemMap = new Map(items.map((i: any) => [i.id, i]))
  const whMap = new Map(warehouses.map((w: any) => [w.id, w]))
  const binMap = new Map(bins.map((b: any) => [b.id, b]))

  return orders.map((o: any) => ({
    ...o,
    sku: itemMap.get(o.itemId)?.sku || "-",
    itemName: itemMap.get(o.itemId)?.name || "-",
    warehouseName: whMap.get(o.warehouseId)?.name || "-",
    inboundBinCode: o.inboundReceivingBinId ? binMap.get(o.inboundReceivingBinId)?.code || "-" : "KABUL-RAMP",
    outboundRampCode: o.outboundRampBinId ? binMap.get(o.outboundRampBinId)?.code || "-" : "SEVK-RAMP",
  }))
}

export async function createCrossDockOrder(params: {
  warehouseId: string
  inboundPoNo?: string
  inboundReceivingBinId?: string | null
  outboundOrderRef: string
  outboundRampBinId?: string | null
  itemId: string
  plannedQty: number
  lotNumber?: string | null
  lpnCode?: string | null
  priority?: string
  assignedTo?: string
  notes?: string
}) {
  const item = await prisma.inventoryItem.findUnique({ where: { id: params.itemId } })
  if (!item) throw new LogisticsDomainError("ITEM_NOT_FOUND", "Ürün bulunamadı.", 404)
  if (Number(params.plannedQty || 0) <= 0) {
    throw new LogisticsDomainError("INVALID_QTY", "Planlanan Cross-Dock miktarı pozitif olmalıdır.", 400)
  }

  const crossDockNo = `XD-${new Date().getFullYear()}-${Math.floor(10000 + Math.random() * 89999)}`
  return await (prisma as any).lojistikCrossDockOrder.create({
    data: {
      crossDockNo,
      warehouseId: params.warehouseId,
      inboundPoNo: params.inboundPoNo ?? null,
      inboundReceivingBinId: params.inboundReceivingBinId ?? null,
      outboundOrderRef: params.outboundOrderRef.trim(),
      outboundRampBinId: params.outboundRampBinId ?? null,
      itemId: params.itemId,
      plannedQty: Number(params.plannedQty),
      receivedQty: 0,
      dispatchedQty: 0,
      unit: item.baseUnit || "Adet",
      lotNumber: params.lotNumber ?? null,
      lpnCode: params.lpnCode ?? null,
      status: "PLANNED",
      priority: params.priority || "URGENT",
      assignedTo: params.assignedTo || "Cross-Dock Ekibi",
      notes: params.notes ?? "Rafa kaldırmadan doğrudan sevkiyat rampasına yönlendir",
    },
  })
}

export async function advanceCrossDockOrder(params: {
  crossDockId: string
  nextStatus: WmsCrossDockStatus
  quantity?: number
  performedBy: string
  idempotencyKey?: string
}) {
  const order = await (prisma as any).lojistikCrossDockOrder.findUnique({
    where: { id: params.crossDockId },
  })
  if (!order) throw new LogisticsDomainError("CROSS_DOCK_NOT_FOUND", "Cross-Dock emri bulunamadı.", 404)

  const qty = Number(params.quantity || order.plannedQty)
  const rampBin = order.outboundRampBinId
    ? await prisma.storageBin.findUnique({ where: { id: order.outboundRampBinId } }).catch(() => null)
    : null
  const inBin = order.inboundReceivingBinId
    ? await prisma.storageBin.findUnique({ where: { id: order.inboundReceivingBinId } }).catch(() => null)
    : null

  if (params.nextStatus === "RECEIVING_DOCK" && order.status === "PLANNED") {
    await recordStockLedgerEntry({
      itemId: order.itemId,
      warehouseId: order.warehouseId,
      movementType: "RECEIPT",
      quantityDelta: qty,
      unit: order.unit,
      storageBinId: inBin?.id ?? null,
      toBinCode: inBin?.code ?? "XD-KABUL",
      lotNumber: order.lotNumber,
      lpnCode: order.lpnCode,
      referenceDocNo: order.crossDockNo,
      performedBy: params.performedBy,
      idempotencyKey: params.idempotencyKey || `XD-IN-${order.id}`,
      method: "WEB",
      traceEventType: "CROSS_DOCK_RECEIPT",
      notes: `Cross-Dock rampa kabulü -> ${order.outboundOrderRef}`,
    })
    return await (prisma as any).lojistikCrossDockOrder.update({
      where: { id: order.id },
      data: { status: "RECEIVING_DOCK", receivedQty: qty },
    })
  }

  if (params.nextStatus === "STAGED_AT_RAMP") {
    return await (prisma as any).lojistikCrossDockOrder.update({
      where: { id: order.id },
      data: { status: "STAGED_AT_RAMP" },
    })
  }

  if (params.nextStatus === "DISPATCHED") {
    // Eğer henüz rampa kabulü yapılmadıysa önce giriş, sonra çıkış yaz (tek stok defteri kuralı)
    if (order.status === "PLANNED") {
      await recordStockLedgerEntry({
        itemId: order.itemId,
        warehouseId: order.warehouseId,
        movementType: "RECEIPT",
        quantityDelta: qty,
        unit: order.unit,
        storageBinId: inBin?.id ?? null,
        toBinCode: inBin?.code ?? "XD-KABUL",
        lotNumber: order.lotNumber,
        lpnCode: order.lpnCode,
        referenceDocNo: order.crossDockNo,
        performedBy: params.performedBy,
        idempotencyKey: `XD-AUTOIN-${order.id}`,
        method: "WEB",
        notes: `Cross-Dock otomatik kabul (${order.crossDockNo})`,
      })
    }

    await recordStockLedgerEntry({
      itemId: order.itemId,
      warehouseId: order.warehouseId,
      movementType: "ISSUE",
      quantityDelta: qty,
      unit: order.unit,
      storageBinId: inBin?.id ?? null,
      fromBinCode: inBin?.code ?? "XD-KABUL",
      toBinCode: rampBin?.code ?? "SEVK-RAMP",
      lotNumber: order.lotNumber,
      lpnCode: order.lpnCode,
      referenceDocNo: order.crossDockNo,
      performedBy: params.performedBy,
      idempotencyKey: params.idempotencyKey || `XD-OUT-${order.id}`,
      method: "WEB",
      traceEventType: "CROSS_DOCK_DISPATCH",
      notes: `Cross-Dock doğrudan sevk (${order.outboundOrderRef})`,
    })

    return await (prisma as any).lojistikCrossDockOrder.update({
      where: { id: order.id },
      data: {
        status: "DISPATCHED",
        receivedQty: order.receivedQty > 0 ? order.receivedQty : qty,
        dispatchedQty: qty,
      },
    })
  }

  return await (prisma as any).lojistikCrossDockOrder.update({
    where: { id: order.id },
    data: { status: params.nextStatus },
  })
}

// ─────────────────────────────────────────────────────────────────────────────
// 4. KITTING (SET BİRLEŞTİRME & BOZMA) İŞ AKIŞI
// ─────────────────────────────────────────────────────────────────────────────

export async function listKitOrders(warehouseId?: string) {
  const [orders, items, warehouses] = await Promise.all([
    (prisma as any).lojistikKitOrder.findMany({
      ...(warehouseId && warehouseId !== "ALL" ? { where: { warehouseId } } : {}),
      include: { components: true },
      orderBy: { createdAt: "desc" },
    }),
    prisma.inventoryItem.findMany(),
    prisma.warehouse.findMany(),
  ])
  const itemMap = new Map(items.map((i: any) => [i.id, i]))
  const whMap = new Map(warehouses.map((w: any) => [w.id, w]))

  return orders.map((o: any) => ({
    ...o,
    kitSku: itemMap.get(o.kitItemId)?.sku || "-",
    kitItemName: itemMap.get(o.kitItemId)?.name || "-",
    warehouseName: whMap.get(o.warehouseId)?.name || "-",
    components: (o.components || []).map((c: any) => ({
      ...c,
      componentSku: c.componentItem?.sku || itemMap.get(c.componentItemId)?.sku || "-",
      componentName: c.componentItem?.name || itemMap.get(c.componentItemId)?.name || "-",
    })),
  }))
}

export async function createKitOrder(params: {
  operationType: WmsKitOperationType
  warehouseId: string
  kitItemId: string
  targetBinId?: string | null
  plannedQty: number
  bomId?: string | null
  components?: Array<{
    componentItemId: string
    requiredPerKit: number
    sourceBinId?: string | null
    lotNumber?: string | null
  }>
  performedBy?: string
  notes?: string
}) {
  const kitItem = await prisma.inventoryItem.findUnique({ where: { id: params.kitItemId } })
  if (!kitItem) throw new LogisticsDomainError("ITEM_NOT_FOUND", "Set ürünü bulunamadı.", 404)
  const qty = Number(params.plannedQty || 0)
  if (qty <= 0) throw new LogisticsDomainError("INVALID_QTY", "Set miktarı pozitif olmalıdır.", 400)

  let componentsInput = params.components || []
  if (componentsInput.length === 0) {
    const bom = await prisma.bomHeader.findFirst({
      where: { finishedItemId: params.kitItemId, isActive: true },
      include: { components: true },
    })
    if (bom?.components?.length) {
      componentsInput = bom.components.map((c: any) => ({
        componentItemId: c.componentItemId,
        requiredPerKit: Number(c.quantity || 1),
      }))
    }
  }

  if (componentsInput.length === 0) {
    throw new LogisticsDomainError(
      "KIT_COMPONENTS_REQUIRED",
      "Set birleştirme/bozma için en az bir bileşen kalemi (veya aktif BOM) gereklidir.",
      400
    )
  }

  const kitOrderNo = `KIT-${new Date().getFullYear()}-${Math.floor(10000 + Math.random() * 89999)}`
  const order = await (prisma as any).lojistikKitOrder.create({
    data: {
      kitOrderNo,
      operationType: params.operationType || "ASSEMBLE",
      warehouseId: params.warehouseId,
      kitItemId: params.kitItemId,
      targetBinId: params.targetBinId ?? null,
      plannedQty: qty,
      completedQty: 0,
      unit: kitItem.baseUnit || "Adet",
      lotNumber: `KITLOT-${Date.now().toString().slice(-5)}`,
      status: "PLANNED",
      bomId: params.bomId ?? null,
      performedBy: params.performedBy || "Depo Kitting Ekibi",
      notes: params.notes ?? null,
    },
  })

  for (const comp of componentsInput) {
    const cItem = await prisma.inventoryItem.findUnique({ where: { id: comp.componentItemId } })
    await (prisma as any).lojistikKitOrderComponent.create({
      data: {
        kitOrderId: order.id,
        componentItemId: comp.componentItemId,
        requiredPerKit: Number(comp.requiredPerKit || 1),
        totalRequiredQty: Number((qty * Number(comp.requiredPerKit || 1)).toFixed(4)),
        actualQty: 0,
        unit: cItem?.baseUnit || "Adet",
        sourceBinId: comp.sourceBinId ?? null,
        lotNumber: comp.lotNumber ?? null,
      },
    })
  }

  return await (prisma as any).lojistikKitOrder.findUnique({
    where: { id: order.id },
    include: { components: true },
  })
}

export async function executeKitOrder(params: {
  kitOrderId: string
  performedBy: string
  idempotencyKey?: string
}) {
  const order = await (prisma as any).lojistikKitOrder.findUnique({
    where: { id: params.kitOrderId },
    include: { components: true },
  })
  if (!order) throw new LogisticsDomainError("KIT_ORDER_NOT_FOUND", "Kitting emri bulunamadı.", 404)
  if (order.status === "COMPLETED") {
    throw new LogisticsDomainError("ALREADY_COMPLETED", "Bu kitting emri zaten tamamlanmış.", 409)
  }

  const isAssemble = order.operationType === "ASSEMBLE"
  const qty = Number(order.plannedQty || 0)

  // Hedef/Kaynak bakiye raflarını çöz
  const pickDefaultBinIdForItem = async (itemId: string) => {
    const bal = await prisma.stockBalance.findFirst({
      where: { itemId, warehouseId: order.warehouseId },
      orderBy: { availableQty: "desc" },
    })
    return bal?.storageBinId ?? null
  }

  if (isAssemble) {
    // Önce bileşenleri stoktan düş (PRODUCTION_CONSUME), sonra set ürünü giriş yap (PRODUCTION_OUTPUT)
    for (const comp of order.components || []) {
      const binId = comp.sourceBinId || (await pickDefaultBinIdForItem(comp.componentItemId))
      const compRes = await recordStockLedgerEntry({
        itemId: comp.componentItemId,
        warehouseId: order.warehouseId,
        movementType: "PRODUCTION_CONSUME",
        quantityDelta: Number(comp.totalRequiredQty || 0),
        unit: comp.unit || "Adet",
        storageBinId: binId,
        lotNumber: comp.lotNumber ?? null,
        referenceDocNo: order.kitOrderNo,
        performedBy: params.performedBy,
        idempotencyKey: `${params.idempotencyKey || order.id}-COMP-${comp.id}`,
        method: "WEB",
        notes: `Kitting Set Birleştirme sarfı (${order.kitOrderNo})`,
      })
      await (prisma as any).lojistikKitOrderComponent.update({
        where: { id: comp.id },
        data: { actualQty: Number(comp.totalRequiredQty || 0) },
      })
      void compRes
    }

    const kitTargetBin = order.targetBinId || (await pickDefaultBinIdForItem(order.kitItemId))
    await recordStockLedgerEntry({
      itemId: order.kitItemId,
      warehouseId: order.warehouseId,
      movementType: "PRODUCTION_OUTPUT",
      quantityDelta: qty,
      unit: order.unit || "Adet",
      storageBinId: kitTargetBin,
      lotNumber: order.lotNumber,
      referenceDocNo: order.kitOrderNo,
      performedBy: params.performedBy,
      idempotencyKey: `${params.idempotencyKey || order.id}-KITOUT`,
      method: "WEB",
      notes: `Kitting Set Birleştirme çıktısı (${order.kitOrderNo})`,
    })
  } else {
    // DISASSEMBLE: Set stoktan çık, bileşenleri geri stoğa al
    const kitSourceBin = order.targetBinId || (await pickDefaultBinIdForItem(order.kitItemId))
    await recordStockLedgerEntry({
      itemId: order.kitItemId,
      warehouseId: order.warehouseId,
      movementType: "ISSUE",
      quantityDelta: qty,
      unit: order.unit || "Adet",
      storageBinId: kitSourceBin,
      lotNumber: order.lotNumber,
      referenceDocNo: order.kitOrderNo,
      performedBy: params.performedBy,
      idempotencyKey: `${params.idempotencyKey || order.id}-KITDIS`,
      method: "WEB",
      notes: `Kitting Set Bozma çıkışı (${order.kitOrderNo})`,
    })

    for (const comp of order.components || []) {
      const binId = comp.sourceBinId || (await pickDefaultBinIdForItem(comp.componentItemId))
      await recordStockLedgerEntry({
        itemId: comp.componentItemId,
        warehouseId: order.warehouseId,
        movementType: "RECEIPT",
        quantityDelta: Number(comp.totalRequiredQty || 0),
        unit: comp.unit || "Adet",
        storageBinId: binId,
        lotNumber: comp.lotNumber ?? null,
        referenceDocNo: order.kitOrderNo,
        performedBy: params.performedBy,
        idempotencyKey: `${params.idempotencyKey || order.id}-COMPBACK-${comp.id}`,
        method: "WEB",
        notes: `Kitting Set Bozma iade girişi (${order.kitOrderNo})`,
      })
      await (prisma as any).lojistikKitOrderComponent.update({
        where: { id: comp.id },
        data: { actualQty: Number(comp.totalRequiredQty || 0) },
      })
    }
  }

  return await (prisma as any).lojistikKitOrder.update({
    where: { id: order.id },
    data: {
      status: "COMPLETED",
      completedQty: qty,
      performedBy: params.performedBy,
      completedAt: new Date(),
    },
    include: { components: true },
  })
}

// ─────────────────────────────────────────────────────────────────────────────
// 5. DEPOLAR ARASI TRANSFER (IN_TRANSIT + ÇOKLU SATIR + UYUŞMAZLIK)
// ─────────────────────────────────────────────────────────────────────────────

async function attachTransferWarehouses<T extends { fromWarehouseId: string; toWarehouseId: string }>(
  order: T
): Promise<T & { fromWarehouse: any; toWarehouse: any }> {
  const warehouses = await prisma.warehouse.findMany({
    where: { id: { in: [order.fromWarehouseId, order.toWarehouseId] } },
  })
  const whMap = new Map(warehouses.map((w: any) => [w.id, w]))
  return {
    ...order,
    fromWarehouse: whMap.get(order.fromWarehouseId) ?? null,
    toWarehouse: whMap.get(order.toWarehouseId) ?? null,
  }
}

export async function createMultiLineTransferOrder(params: {
  fromWarehouseId: string
  toWarehouseId: string
  transferReason?: string
  vehiclePlate?: string
  driverName?: string
  driverPhone?: string
  requestedBy: string
  notes?: string
  lines: Array<{ itemId: string; quantity: number; lotNumber?: string | null }>
}) {
  if (params.fromWarehouseId === params.toWarehouseId) {
    throw new LogisticsDomainError("SAME_WAREHOUSE", "Çıkış ve hedef depo aynı olamaz.", 400)
  }
  if (!params.lines || params.lines.length === 0) {
    throw new LogisticsDomainError("EMPTY_TRANSFER", "En az bir transfer kalemi seçilmelidir.", 400)
  }

  const orderLines: any[] = []
  const jsonLines: any[] = []

  for (const row of params.lines) {
    const qty = Number(row.quantity || 0)
    if (qty <= 0) continue
    const item = await prisma.inventoryItem.findUnique({ where: { id: row.itemId } })
    if (!item) throw new LogisticsDomainError("ITEM_NOT_FOUND", `Ürün bulunamadı (${row.itemId}).`, 404)

    orderLines.push({
      itemId: item.id,
      sku: item.sku,
      itemName: item.name,
      requestedQty: qty,
      shippedQty: 0,
      receivedQty: 0,
      inTransitQty: 0,
      damagedQty: 0,
      unit: item.baseUnit || "Adet",
      lotNumber: row.lotNumber ?? null,
    })
    jsonLines.push({ sku: item.sku, itemName: item.name, requestedQty: qty })
  }

  const transferNumber = `TR-${new Date().getFullYear()}-${Math.floor(10000 + Math.random() * 89999)}`
  const created = await prisma.warehouseTransferOrder.create({
    data: {
      transferNumber,
      fromWarehouseId: params.fromWarehouseId,
      toWarehouseId: params.toWarehouseId,
      status: "DRAFT",
      transferReason: params.transferReason || "Depo İkmal & Dağıtım",
      vehiclePlate: params.vehiclePlate || null,
      driverName: params.driverName || null,
      driverPhone: params.driverPhone || null,
      requestedBy: params.requestedBy,
      itemsJson: JSON.stringify(jsonLines),
      discrepancyNotes: params.notes ?? null,
      lines: { create: orderLines },
    },
    include: { lines: true },
  })
  return await attachTransferWarehouses(created)
}

export async function advanceTransferOrderWithTransit(params: {
  transferOrderId: string
  newStatus: "APPROVED" | "PICKED" | "IN_TRANSIT" | "RECEIVED" | "DISCREPANCY"
  receivedQtyByLineId?: Record<string, number>
  discrepancyNotes?: string
  performedBy: string
}) {
  const order = await prisma.warehouseTransferOrder.findUnique({
    where: { id: params.transferOrderId },
    include: { lines: true },
  })
  if (!order) throw new LogisticsDomainError("TRANSFER_NOT_FOUND", "Transfer emri bulunamadı.", 404)

  const lines = order.lines || []

  if (params.newStatus === "IN_TRANSIT" && order.status !== "IN_TRANSIT" && order.status !== "RECEIVED") {
    for (const line of lines) {
      const qty = Number(line.requestedQty || 0)
      const fromBal = await prisma.stockBalance.findFirst({
        where: { itemId: line.itemId, warehouseId: order.fromWarehouseId },
        orderBy: { availableQty: "desc" },
      })
      await recordStockLedgerEntry({
        itemId: line.itemId,
        warehouseId: order.fromWarehouseId,
        movementType: "TRANSFER_OUT",
        quantityDelta: qty,
        unit: line.unit || "Adet",
        storageBinId: fromBal?.storageBinId ?? null,
        fromBinCode: fromBal?.binCode ?? "SEVK",
        toBinCode: "IN_TRANSIT",
        lotNumber: line.lotNumber ?? null,
        referenceDocNo: order.transferNumber,
        performedBy: params.performedBy,
        idempotencyKey: `TR-OUT-${order.id}-${line.id}`,
        method: "WEB",
        traceEventType: "TRANSFER",
        notes: `Depolar arası transfer çıkışı (${order.transferNumber})`,
      })

      // Hedef depoda inTransitQty takibini artır
      let toBal = await prisma.stockBalance.findFirst({
        where: { itemId: line.itemId, warehouseId: order.toWarehouseId },
      })
      if (toBal) {
        await prisma.stockBalance.update({
          where: { id: toBal.id },
          data: { inTransitQty: Number((Number(toBal.inTransitQty || 0) + qty).toFixed(4)) },
        })
      } else {
        await prisma.stockBalance.create({
          data: {
            itemId: line.itemId,
            warehouseId: order.toWarehouseId,
            storageBinId: null,
            binCode: "TRANSIT",
            onHandQty: 0,
            reservedQty: 0,
            availableQty: 0,
            inTransitQty: qty,
            quarantineQty: 0,
            consignmentQty: 0,
          },
        })
      }

      await prisma.transferOrderLine.update({
        where: { id: line.id },
        data: { shippedQty: qty, inTransitQty: qty },
      })
    }

    const updatedTransit = await prisma.warehouseTransferOrder.update({
      where: { id: order.id },
      data: { status: "IN_TRANSIT", shippedAt: new Date() },
      include: { lines: true },
    })
    return await attachTransferWarehouses(updatedTransit)
  }

  if (params.newStatus === "RECEIVED" || params.newStatus === "DISCREPANCY") {
    let hasDiscrepancy = params.newStatus === "DISCREPANCY"

    for (const line of lines) {
      const shippedQty = Number(line.shippedQty || line.requestedQty || 0)
      const receivedQty =
        params.receivedQtyByLineId && params.receivedQtyByLineId[line.id] !== undefined
          ? Math.max(0, Number(params.receivedQtyByLineId[line.id]))
          : shippedQty
      const missingOrDamaged = Math.max(0, Number((shippedQty - receivedQty).toFixed(4)))
      if (missingOrDamaged > 0) hasDiscrepancy = true

      // Hedef depo rafı (TRANSIT satırını temizle)
      const toBal = await prisma.stockBalance.findFirst({
        where: { itemId: line.itemId, warehouseId: order.toWarehouseId },
      })
      if (toBal) {
        await prisma.stockBalance.update({
          where: { id: toBal.id },
          data: { inTransitQty: Math.max(0, Number((Number(toBal.inTransitQty || 0) - shippedQty).toFixed(4))) },
        })
      }

      if (receivedQty > 0) {
        const destSuggest = await suggestPutawayBins({
          warehouseId: order.toWarehouseId,
          itemId: line.itemId,
          quantity: receivedQty,
        })
        const destBin = destSuggest.candidates[0]
        await recordStockLedgerEntry({
          itemId: line.itemId,
          warehouseId: order.toWarehouseId,
          movementType: "TRANSFER_IN",
          quantityDelta: receivedQty,
          unit: line.unit || "Adet",
          storageBinId: destBin?.binId ?? null,
          fromBinCode: "IN_TRANSIT",
          toBinCode: destBin?.binCode ?? "KABUL",
          lotNumber: line.lotNumber ?? null,
          referenceDocNo: order.transferNumber,
          performedBy: params.performedBy,
          idempotencyKey: `TR-IN-${order.id}-${line.id}`,
          method: "WEB",
          traceEventType: "TRANSFER",
          notes:
            missingOrDamaged > 0
              ? `Transfer kabulü — ${missingOrDamaged} eksik/hasarlı fark kaydı`
              : `Transfer eksiksiz teslim alındı (${order.transferNumber})`,
        })
      }

      await prisma.transferOrderLine.update({
        where: { id: line.id },
        data: {
          receivedQty,
          inTransitQty: 0,
          damagedQty: missingOrDamaged,
        },
      })
    }

    const finalStatus = hasDiscrepancy ? "DISCREPANCY" : "RECEIVED"
    const updatedReceived = await prisma.warehouseTransferOrder.update({
      where: { id: order.id },
      data: {
        status: finalStatus,
        receivedAt: new Date(),
        discrepancyNotes:
          params.discrepancyNotes ||
          (hasDiscrepancy ? "Gönderilen ve teslim alınan miktar arasında fark tespit edildi." : order.discrepancyNotes),
      },
      include: { lines: true },
    })
    return await attachTransferWarehouses(updatedReceived)
  }

  const updatedOther = await prisma.warehouseTransferOrder.update({
    where: { id: order.id },
    data: {
      status: params.newStatus,
      ...(params.newStatus === "APPROVED" ? { approvedBy: params.performedBy } : {}),
    },
    include: { lines: true },
  })
  return await attachTransferWarehouses(updatedOther)
}

// ─────────────────────────────────────────────────────────────────────────────
// 6. DÖNGÜSEL SAYIM PLANLAMA, TOLERANS KONTROLÜ & TEK KAYNAK MAHSUPLAŞMA
// ─────────────────────────────────────────────────────────────────────────────

export async function reconcileCycleCountSession(params: {
  sessionId: string
  performedBy: string
  forceApproveBeyondTolerance?: boolean
}) {
  const session = await prisma.inventoryCountSession.findUnique({
    where: { id: params.sessionId },
    include: { lines: true },
  })
  if (!session) throw new LogisticsDomainError("COUNT_SESSION_NOT_FOUND", "Sayım oturumu bulunamadı.", 404)
  if (session.status === "RECONCILED") return session

  const tolerancePct = Number(session.tolerancePercent ?? 5.0)
  let totalAbsVariance = 0
  let totalSystemQty = 0
  let totalVarianceValue = 0
  let requiresApproval = false

  const bins = await prisma.storageBin.findMany({ where: { warehouseId: session.warehouseId } })
  const binByCode = new Map(bins.map((b: any) => [b.code, b]))

  for (const line of session.lines || []) {
    const sysQty = Number(line.systemQty || 0)
    const counted = line.countedQty !== null && line.countedQty !== undefined ? Number(line.countedQty) : sysQty
    const diff = Number((counted - sysQty).toFixed(4))
    const lineVariancePct = sysQty > 0 ? (Math.abs(diff) / sysQty) * 100 : Math.abs(diff) > 0 ? 100 : 0
    const withinTolerance = lineVariancePct <= tolerancePct

    if (!withinTolerance) requiresApproval = true
    totalSystemQty += sysQty
    totalAbsVariance += Math.abs(diff)
    totalVarianceValue += diff * Number(line.unitCost || 0)
  }

  // Tolerans dışı fark varsa ve yönetici zorunlu onayı gelmemişse PENDING_APPROVAL beklet
  if (requiresApproval && !params.forceApproveBeyondTolerance && session.status !== "PENDING_APPROVAL") {
    return await prisma.inventoryCountSession.update({
      where: { id: session.id },
      data: {
        status: "PENDING_APPROVAL",
        requiresApproval: true,
        totalVarianceValue: Number(totalVarianceValue.toFixed(2)),
      },
      include: { lines: true, warehouse: true },
    })
  }

  const adjDocNo = `ADJ-${new Date().getFullYear()}-${Math.floor(10000 + Math.random() * 89999)}`

  for (const line of session.lines || []) {
    if (line.isReconciled) continue
    const sysQty = Number(line.systemQty || 0)
    const counted = line.countedQty !== null && line.countedQty !== undefined ? Number(line.countedQty) : sysQty
    const diff = Number((counted - sysQty).toFixed(4))
    const lineVariancePct = sysQty > 0 ? (Math.abs(diff) / sysQty) * 100 : Math.abs(diff) > 0 ? 100 : 0

    if (Math.abs(diff) > 1e-6) {
      const binObj = line.binCode ? binByCode.get(line.binCode) : null
      await recordStockLedgerEntry({
        itemId: line.itemId,
        warehouseId: session.warehouseId,
        movementType: "COUNT_ADJUSTMENT",
        quantityDelta: diff,
        storageBinId: binObj?.id ?? null,
        fromBinCode: diff < 0 ? line.binCode : null,
        toBinCode: diff > 0 ? line.binCode : null,
        lotNumber: line.lotNumber ?? null,
        lpnCode: line.lpnCode ?? null,
        referenceDocNo: adjDocNo,
        performedBy: params.performedBy,
        idempotencyKey: `CNT-ADJ-${session.id}-${line.id}`,
        method: line.scanMethod === "RFID" ? "RFID" : "WEB",
        allowBlockedBin: true,
        traceEventType: "CYCLE_COUNT_ADJUSTMENT",
        notes: `Sayım Mahsuplaşması (${session.sessionNumber}): Sistem ${sysQty} -> Sayılan ${counted}`,
      })
    }

    await prisma.inventoryCountLine.update({
      where: { id: line.id },
      data: {
        countedQty: counted,
        varianceQty: diff,
        varianceAmount: Number((diff * Number(line.unitCost || 0)).toFixed(2)),
        withinTolerance: lineVariancePct <= tolerancePct,
        isReconciled: true,
        adjustmentDocNo: Math.abs(diff) > 1e-6 ? adjDocNo : "ESIT",
      },
    })
  }

  const accuracyPercent =
    totalSystemQty > 0
      ? Number(Math.max(0, 100 - (totalAbsVariance / totalSystemQty) * 100).toFixed(1))
      : 100

  return await prisma.inventoryCountSession.update({
    where: { id: session.id },
    data: {
      status: "RECONCILED",
      accuracyPercent,
      totalBinsCounted: session.lines?.length || 0,
      totalVarianceValue: Number(totalVarianceValue.toFixed(2)),
      requiresApproval: false,
      approvedBy: params.performedBy,
      reconciledJournalNo: adjDocNo,
      reconciledAt: new Date(),
      reconciledBy: params.performedBy,
    },
    include: { lines: true, warehouse: true },
  })
}

// ─────────────────────────────────────────────────────────────────────────────
// 7. ÇEVRİMDIŞI KUYRUK ÇAKIŞMA KONTROLLÜ SENKRONİZASYON
// ─────────────────────────────────────────────────────────────────────────────

export async function processOfflineBatchWithConflictCheck(params: {
  deviceId: string
  operatorName: string
  queueItems: Array<{
    idempotencyKey: string
    operationType: "RECEIVE" | "PUTAWAY" | "WAVE_PICK" | "CYCLE_COUNT" | "TRANSFER"
    payload: Record<string, any>
    queuedAt: string
  }>
}) {
  const results: Array<{
    idempotencyKey: string
    status: "SYNCED" | "CONFLICT" | "DUPLICATE_IGNORED"
    reason?: string
    detail?: string
  }> = []

  for (const q of params.queueItems || []) {
    const key = q.idempotencyKey
    if (!key) {
      results.push({
        idempotencyKey: "MISSING_KEY",
        status: "CONFLICT",
        reason: "MISSING_IDEMPOTENCY_KEY",
        detail: "Çevrimdışı işlemde benzersiz idempotencyKey bulunamadı.",
      })
      continue
    }

    const prevSync = await prisma.wmsOfflineSyncLog
      .findFirst({ where: { idempotencyKey: key } })
      .catch(() => null)
    const prevMov = await prisma.stockMovement
      .findFirst({ where: { idempotencyKey: key } })
      .catch(() => null)

    if (prevSync?.status === "SYNCED" || prevMov) {
      results.push({
        idempotencyKey: key,
        status: "DUPLICATE_IGNORED",
        reason: "ALREADY_PROCESSED",
        detail: "Bu barkod taraması daha önce sunucu tarafından başarıyla işlenmiş (çift işlem engellendi).",
      })
      continue
    }

    let syncStatus: "SYNCED" | "CONFLICT" = "SYNCED"
    let conflictReason: string | null = null
    let resolutionNote = "Senkronize edildi"

    try {
      const p = q.payload || {}
      if (q.operationType === "WAVE_PICK" || q.operationType === "RECEIVE" || q.operationType === "PUTAWAY") {
        if (p.taskId) {
          await completeWmsTaskExecution({
            taskId: p.taskId,
            performedBy: params.operatorName,
            pickedQtyByLineId: p.pickedQtyByLineId,
            method: "OFFLINE_SYNC",
            deviceId: params.deviceId,
            idempotencyKey: key,
          })
        } else if (p.itemId && p.warehouseId && p.quantity) {
          let resolvedBinId = p.storageBinId ?? null
          if (!resolvedBinId && p.binCode) {
            const matchedBin = await prisma.storageBin
              .findFirst({ where: { warehouseId: p.warehouseId, code: p.binCode } })
              .catch(() => null)
            resolvedBinId = matchedBin?.id ?? null
          }
          const isInboundOp = q.operationType === "RECEIVE" || q.operationType === "PUTAWAY"
          await recordStockLedgerEntry({
            itemId: p.itemId,
            warehouseId: p.warehouseId,
            movementType: isInboundOp ? "RECEIPT" : "ISSUE",
            quantityDelta: Number(p.quantity),
            storageBinId: resolvedBinId,
            toBinCode: isInboundOp ? p.binCode ?? null : null,
            fromBinCode: !isInboundOp ? p.binCode ?? null : null,
            lotNumber: p.lotNumber ?? null,
            lpnCode: p.lpnCode ?? null,
            referenceDocNo: p.referenceDocNo ?? `MOB-${key.slice(-6)}`,
            performedBy: params.operatorName,
            idempotencyKey: key,
            deviceId: params.deviceId,
            method: "OFFLINE_SYNC",
          })
        } else {
          throw new LogisticsDomainError("INCOMPLETE_OFFLINE_PAYLOAD", "Eksik ürün/depo bilgisi.", 400)
        }
      } else if (q.operationType === "CYCLE_COUNT" && p.lineId && p.countedQty !== undefined) {
        const line = await prisma.inventoryCountLine.findUnique({ where: { id: p.lineId } })
        if (!line) throw new LogisticsDomainError("COUNT_LINE_NOT_FOUND", "Sayım satırı bulunamadı.", 404)
        if (line.isReconciled) {
          throw new LogisticsDomainError(
            "COUNT_ALREADY_RECONCILED",
            "Siz çevrimdışıyken bu sayım oturumu mahsuplaştırılmış.",
            409
          )
        }
        const counted = Number(p.countedQty)
        const variance = Number((counted - Number(line.systemQty || 0)).toFixed(4))
        await prisma.inventoryCountLine.update({
          where: { id: line.id },
          data: {
            countedQty: counted,
            varianceQty: variance,
            varianceAmount: Number((variance * Number(line.unitCost || 0)).toFixed(2)),
            scanMethod: "OFFLINE_SYNC",
            countedBy: params.operatorName,
            countedAt: new Date(q.queuedAt || Date.now()),
          },
        })
      }
    } catch (err: any) {
      syncStatus = "CONFLICT"
      conflictReason = err?.code || "CONFLICT"
      resolutionNote = err?.message || "Çevrimdışı işlem çakışması"
    }

    await prisma.wmsOfflineSyncLog.create({
      data: {
        deviceId: params.deviceId,
        operatorName: params.operatorName,
        operationType: q.operationType,
        idempotencyKey: key,
        payloadJson: JSON.stringify(q.payload || {}),
        queuedAt: new Date(q.queuedAt || Date.now()),
        status: syncStatus,
        conflictReason,
        resolutionNote,
      },
    })

    results.push({
      idempotencyKey: key,
      status: syncStatus,
      ...(conflictReason ? { reason: conflictReason, detail: resolutionNote } : {}),
    })
  }

  return {
    totalProcessed: results.length,
    syncedCount: results.filter((r) => r.status === "SYNCED").length,
    duplicateCount: results.filter((r) => r.status === "DUPLICATE_IGNORED").length,
    conflictCount: results.filter((r) => r.status === "CONFLICT").length,
    results,
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// 8. RFID OKUYUCU ENTEGRASYONU & GERÇEK DB KPI HESAPLAYICISI
// ─────────────────────────────────────────────────────────────────────────────

export async function ingestRfidTagReads(params: {
  readerId: string
  antennaPort?: number
  warehouseId?: string
  countSessionId?: string
  reads: Array<{
    epcCode: string
    rssi?: number
    scannedAt?: string
    idempotencyKey?: string
  }>
}) {
  if (!params.readerId?.trim() || !params.reads?.length) {
    throw new LogisticsDomainError("INVALID_RFID_PAYLOAD", "Okuyucu ID ve en az bir EPC etiketi gerekir.", 400)
  }

  const [items, bins, lpns] = await Promise.all([
    prisma.inventoryItem.findMany(),
    prisma.storageBin.findMany(),
    prisma.licensePlate.findMany(),
  ])

  const events: any[] = []
  let matchedCount = 0

  for (const r of params.reads) {
    const epc = String(r.epcCode || "").trim().toUpperCase()
    if (!epc) continue

    const idemKey = r.idempotencyKey || `${params.readerId}:${epc}:${r.scannedAt || "now"}`
    const existing = await (prisma as any).lojistikRfidTagEvent
      .findFirst({ where: { idempotencyKey: idemKey } })
      .catch(() => null)
    if (existing) {
      events.push({ ...existing, duplicate: true })
      continue
    }

    const matchedLpn = lpns.find((l: any) => String(l.rfidTagEpc || "").toUpperCase() === epc)
    const matchedBin = bins.find((b: any) => String(b.rfidGateTag || "").toUpperCase() === epc)
    const matchedItem = items.find(
      (it: any) =>
        it.rfidEpcPrefix && epc.startsWith(String(it.rfidEpcPrefix).toUpperCase())
    )

    let matchedType: "LPN" | "BIN" | "ITEM" | "UNMATCHED" = "UNMATCHED"
    let matchedEntityId: string | null = null
    let matchedLabel: string | null = null

    if (matchedLpn) {
      matchedType = "LPN"
      matchedEntityId = matchedLpn.id
      matchedLabel = `Palet/LPN ${matchedLpn.lpnCode} (${matchedLpn.currentBinCode})`
      matchedCount++
    } else if (matchedBin) {
      matchedType = "BIN"
      matchedEntityId = matchedBin.id
      matchedLabel = `Raf ${matchedBin.code}`
      matchedCount++
    } else if (matchedItem) {
      matchedType = "ITEM"
      matchedEntityId = matchedItem.id
      matchedLabel = `${matchedItem.sku} — ${matchedItem.name}`
      matchedCount++
    }

    // Aktif sayım oturumu bağlıysa eşleşen satırın scanMethod bilgisini RFID olarak işaretle
    if (params.countSessionId && matchedItem) {
      const targetLine = await prisma.inventoryCountLine.findFirst({
        where: { sessionId: params.countSessionId, itemId: matchedItem.id },
      })
      if (targetLine && !targetLine.isReconciled) {
        const nextCounted = Number(targetLine.countedQty || 0) + 1
        const nextVar = Number((nextCounted - Number(targetLine.systemQty || 0)).toFixed(4))
        await prisma.inventoryCountLine.update({
          where: { id: targetLine.id },
          data: {
            countedQty: nextCounted,
            varianceQty: nextVar,
            varianceAmount: Number((nextVar * Number(targetLine.unitCost || 0)).toFixed(2)),
            scanMethod: "RFID",
            countedBy: `RFID (${params.readerId})`,
            countedAt: new Date(),
          },
        })
      }
    }

    const ev = await (prisma as any).lojistikRfidTagEvent.create({
      data: {
        idempotencyKey: idemKey,
        readerId: params.readerId,
        antennaPort: params.antennaPort ?? 1,
        epcCode: epc,
        rssi: r.rssi ?? -48.5,
        matchedType,
        matchedEntityId,
        matchedLabel,
        warehouseId: params.warehouseId || matchedLpn?.warehouseId || matchedBin?.warehouseId || null,
        storageBinId: matchedBin?.id ?? null,
        lpnId: matchedLpn?.id ?? null,
        itemId: matchedItem?.id ?? null,
        countSessionId: params.countSessionId ?? null,
        scannedAt: r.scannedAt ? new Date(r.scannedAt) : new Date(),
      },
    })
    events.push(ev)
  }

  return {
    receivedCount: params.reads.length,
    matchedCount,
    events,
  }
}

/**
 * %100 Veritabanı kayıtlarından canlı hesaplanan Depo KPI özeti.
 */
export async function getWarehouseKpiSnapshot(warehouseId?: string): Promise<WmsWarehouseKpiSnapshot> {
  const whFilter = warehouseId && warehouseId !== "ALL" ? { warehouseId } : undefined
  const [sessions, tasks, bins, balances, reservations, crossDocks, rfidEvents] = await Promise.all([
    prisma.inventoryCountSession.findMany(whFilter ? { where: whFilter } : undefined),
    prisma.wmsTask.findMany(whFilter ? { where: whFilter } : undefined),
    prisma.storageBin.findMany(whFilter ? { where: whFilter } : undefined),
    prisma.stockBalance.findMany(whFilter ? { where: whFilter } : undefined),
    (prisma as any).lojistikStockReservation.findMany(whFilter ? { where: whFilter } : undefined),
    (prisma as any).lojistikCrossDockOrder.findMany(whFilter ? { where: whFilter } : undefined),
    (prisma as any).lojistikRfidTagEvent.findMany(whFilter ? { where: whFilter } : undefined),
  ])

  const reconciledSessions = sessions.filter((s: any) => s.status === "RECONCILED")
  const stockAccuracyPercent =
    reconciledSessions.length > 0
      ? Number(
          (
            reconciledSessions.reduce((s: number, c: any) => s + Number(c.accuracyPercent ?? 100), 0) /
            reconciledSessions.length
          ).toFixed(1)
        )
      : 100

  const completedPick = tasks.filter(
    (t: any) =>
      (t.workflowStage === "WAVE_PICK" || t.workflowStage === "PACKING") &&
      t.status === "COMPLETED" &&
      t.startedAt &&
      t.completedAt
  )
  const avgPickDurationMinutes =
    completedPick.length > 0
      ? Number(
          (
            completedPick.reduce(
              (s: number, t: any) =>
                s + Math.max(1, (new Date(t.completedAt).getTime() - new Date(t.startedAt).getTime()) / 60000),
              0
            ) / completedPick.length
          ).toFixed(1)
        )
      : 0

  const completedReceiving = tasks.filter(
    (t: any) =>
      (t.workflowStage === "GOODS_RECEIPT" || t.workflowStage === "PUTAWAY") &&
      t.status === "COMPLETED" &&
      t.startedAt &&
      t.completedAt
  )
  const avgReceivingDurationMinutes =
    completedReceiving.length > 0
      ? Number(
          (
            completedReceiving.reduce(
              (s: number, t: any) =>
                s + Math.max(1, (new Date(t.completedAt).getTime() - new Date(t.startedAt).getTime()) / 60000),
              0
            ) / completedReceiving.length
          ).toFixed(1)
        )
      : 0

  const activeBins = bins.filter((b: any) => b.isActive !== false)
  const occupiedBins = activeBins.filter((b: any) => Number(b.occupancyPercent || 0) > 0 || Number(b.currentWeightKg || 0) > 0).length
  const blockedBins = bins.filter((b: any) => b.isBlocked).length
  const binOccupancyRatePercent =
    activeBins.length > 0 ? Number(((occupiedBins / activeBins.length) * 100).toFixed(1)) : 0

  const nowMs = Date.now()
  const overdueTasksCount = tasks.filter(
    (t: any) =>
      t.status !== "COMPLETED" &&
      t.status !== "CANCELLED" &&
      t.dueAt &&
      new Date(t.dueAt).getTime() < nowMs
  ).length

  const activeWmsReservedQty = reservations
    .filter((r: any) => r.status === "ACTIVE" || r.status === "PARTIAL")
    .reduce(
      (s: number, r: any) =>
        s + Math.max(0, Number(r.reservedQty || 0) - Number(r.fulfilledQty || 0) - Number(r.releasedQty || 0)),
      0
    )

  const totalBalanceReserved = balances.reduce((s: number, b: any) => s + Number(b.reservedQty || 0), 0)
  const productionReservedQty = Math.max(0, Number((totalBalanceReserved - activeWmsReservedQty).toFixed(2)))

  const crossDockThroughputQty = crossDocks
    .filter((cd: any) => cd.status === "DISPATCHED")
    .reduce((s: number, cd: any) => s + Number(cd.dispatchedQty || 0), 0)

  const oneDayAgo = nowMs - 86400000
  const rfidReadsLast24h = rfidEvents.filter(
    (e: any) => new Date(e.scannedAt || e.createdAt).getTime() >= oneDayAgo
  ).length

  return {
    computedAt: new Date().toISOString(),
    warehouseId: warehouseId || "ALL",
    stockAccuracyPercent,
    reconciledCountSessions: reconciledSessions.length,
    avgPickDurationMinutes,
    completedPickTasks: completedPick.length,
    avgReceivingDurationMinutes,
    completedReceivingTasks: completedReceiving.length,
    binOccupancyRatePercent,
    occupiedBins,
    totalActiveBins: activeBins.length,
    blockedBins,
    overdueTasksCount,
    activeReservationsQty: Number(activeWmsReservedQty.toFixed(2)),
    productionReservedQty,
    crossDockThroughputQty: Number(crossDockThroughputQty.toFixed(2)),
    rfidReadsLast24h,
  }
}
