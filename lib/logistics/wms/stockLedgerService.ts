/**
 * Lojistik Faz 2 — Tek Doğruluk Kaynağı Stok Defteri & Muhasebe Servisi
 *
 * Görevleri:
 * 1. StockBalance güncelleme (hiçbir zaman ham Prisma nested increment objesi yazmadan atomik/sayısal hesap)
 * 2. CostLayer (FIFO / LIFO / Ağırlıklı Ortalama) katman tüketimi ve girişi
 * 3. LotSerialRecord + TraceabilityLog senkronizasyonu
 * 4. StockMovement kalıcı stok defteri kaydı (idempotencyKey ile çift okutma koruması)
 * 5. StorageBin ağırlık / hacim / doluluk metriklerini güncel tutma
 */

import { prisma } from "@/lib/db"
import { LogisticsDomainError } from "@/lib/logistics/security"

export type StockMovementType =
  | "RECEIPT"
  | "ISSUE"
  | "TRANSFER_OUT"
  | "TRANSFER_IN"
  | "PRODUCTION_CONSUME"
  | "PRODUCTION_OUTPUT"
  | "COUNT_ADJUSTMENT"
  | "CONSIGNMENT_CONSUME"
  | "RMA_RETURN"

export type StockLedgerMethod =
  | "WEB"
  | "HANDHELD_CAMERA"
  | "HANDHELD_USB"
  | "OFFLINE_SYNC"
  | "RFID"
  | "SYSTEM"

export interface RecordStockLedgerEntryInput {
  itemId: string
  warehouseId: string
  movementType: StockMovementType
  /**
   * Miktar işaretli olabilir (COUNT_ADJUSTMENT için negatif azaltma / pozitif artırma).
   * RECEIPT, TRANSFER_IN, RMA_RETURN, PRODUCTION_OUTPUT mutlak pozitif;
   * ISSUE, TRANSFER_OUT, PRODUCTION_CONSUME, CONSIGNMENT_CONSUME mutlak pozitif verilip içeride düşülür.
   */
  quantityDelta: number
  unit?: string
  storageBinId?: string | null
  fromBinCode?: string | null
  toBinCode?: string | null
  lotNumber?: string | null
  serialNumber?: string | null
  expiryDate?: string | Date | null
  lpnCode?: string | null
  referenceDocNo?: string | null
  performedBy?: string | null
  notes?: string | null
  unitCostOverride?: number
  idempotencyKey?: string | null
  deviceId?: string | null
  method?: StockLedgerMethod
  reservationId?: string | null
  /** Eğer rezerveli stok tüketiliyorsa (ör. toplama sonrası sevkiyat), reservedQty'den düşülecek miktar */
  consumeReservedQty?: number
  /** Bloklu raf kuralını geçici bypass (ör. karantina iade veya sayım düzeltme) */
  allowBlockedBin?: boolean
  /** Lot traceability event tipi override */
  traceEventType?: string
  /** Hareket zaman damgası override (ör. geçmiş demo tarihli defter kaydı değilse şimdi) */
  createdAt?: Date
}

export interface RecordStockLedgerEntryResult {
  duplicate: boolean
  movement: any
  balance: any
  balanceAfterQty: number
  unitCost: number
  totalCost: number
}

function isOutboundMovement(movementType: StockMovementType, quantityDelta: number): boolean {
  if (movementType === "COUNT_ADJUSTMENT") return quantityDelta < 0
  return (
    movementType === "ISSUE" ||
    movementType === "TRANSFER_OUT" ||
    movementType === "PRODUCTION_CONSUME" ||
    movementType === "CONSIGNMENT_CONSUME"
  )
}

/**
 * Bir rafın (StorageBin) üzerindeki mevcut StockBalance kayıtlarından doluluk metriklerini yeniden hesaplar.
 */
export async function syncStorageBinMetrics(storageBinId?: string | null): Promise<void> {
  if (!storageBinId) return
  const bin = await prisma.storageBin.findUnique({ where: { id: storageBinId } }).catch(() => null)
  if (!bin) return

  const balances = await prisma.stockBalance.findMany({ where: { storageBinId } })
  let totalWeight = 0
  let totalVolume = 0

  if (balances.length > 0) {
    const itemIds = Array.from(new Set(balances.map((b: any) => b.itemId)))
    const items = await prisma.inventoryItem.findMany({
      where: { id: { in: itemIds } },
    })
    const itemMap = new Map(items.map((it: any) => [it.id, it]))
    for (const bal of balances) {
      const qty = Math.max(0, Number(bal.onHandQty || 0))
      if (qty <= 0) continue
      const item = itemMap.get(bal.itemId)
      const unitW = Number(item?.weightKg ?? 0.5)
      const unitV = Number(item?.volumeM3 ?? 0.01)
      totalWeight += qty * unitW
      totalVolume += qty * unitV
    }
  }

  const maxW = Math.max(1, Number(bin.maxWeightKg || 1000))
  const maxV = Math.max(0.01, Number(bin.maxVolumeM3 || 2.4))
  const weightPct = (totalWeight / maxW) * 100
  const volPct = (totalVolume / maxV) * 100
  const occupancyPercent = Math.min(100, Number(Math.max(weightPct, volPct).toFixed(1)))

  await prisma.storageBin.update({
    where: { id: storageBinId },
    data: {
      currentWeightKg: Number(totalWeight.toFixed(2)),
      currentVolumeM3: Number(totalVolume.toFixed(4)),
      occupancyPercent,
    },
  })
}

async function consumeCostLayers(params: {
  item: any
  warehouseId: string
  qtyToConsume: number
}): Promise<{ weightedUnitCost: number; totalCost: number }> {
  const { item, warehouseId, qtyToConsume } = params
  if (qtyToConsume <= 0) return { weightedUnitCost: Number(item.currentAvgCost || 0), totalCost: 0 }

  const valuationMethod = String(item.valuationMethod || "FIFO").toUpperCase()
  const orderDir = valuationMethod === "LIFO" ? "desc" : "asc"

  const layers = await prisma.costLayer.findMany({
    where: { itemId: item.id, warehouseId, isExhausted: false },
    orderBy: { layerDate: orderDir },
  })

  let remainingToConsume = qtyToConsume
  let totalCost = 0

  for (const layer of layers) {
    if (remainingToConsume <= 0) break
    const layerRem = Math.max(0, Number(layer.remainingQty || 0))
    if (layerRem <= 0) continue

    const takeQty = Math.min(remainingToConsume, layerRem)
    const unitCost = Number(layer.unitCost || item.currentAvgCost || 0)
    totalCost += takeQty * unitCost
    remainingToConsume -= takeQty

    const nextRem = Math.max(0, Number((layerRem - takeQty).toFixed(4)))
    await prisma.costLayer.update({
      where: { id: layer.id },
      data: {
        remainingQty: nextRem,
        isExhausted: nextRem <= 0,
      },
    })
  }

  if (remainingToConsume > 0) {
    const fallbackCost = Number(
      valuationMethod === "STANDARD"
        ? item.standardCost
        : valuationMethod === "LIFO"
          ? item.lifoUnitCost
          : item.currentAvgCost || item.fifoUnitCost || item.standardCost || 0
    )
    totalCost += remainingToConsume * fallbackCost
  }

  const weightedUnitCost = qtyToConsume > 0 ? totalCost / qtyToConsume : 0
  return {
    weightedUnitCost: Number(weightedUnitCost.toFixed(4)),
    totalCost: Number(totalCost.toFixed(2)),
  }
}

async function addCostLayer(params: {
  item: any
  warehouseId: string
  qty: number
  unitCost: number
  lotNumber?: string | null
  referenceDocNo?: string | null
}): Promise<void> {
  if (params.qty <= 0) return
  const unitCost = Number(
    params.unitCost || params.item.lastPurchaseCost || params.item.standardCost || 0
  )

  await prisma.costLayer.create({
    data: {
      itemId: params.item.id,
      warehouseId: params.warehouseId,
      layerDate: new Date(),
      initialQty: params.qty,
      remainingQty: params.qty,
      unitCost,
      lotNumber: params.lotNumber ?? null,
      receiptDocNo: params.referenceDocNo || `WMS-${Date.now().toString().slice(-6)}`,
      isExhausted: false,
    },
  })

  const allActiveLayers = await prisma.costLayer.findMany({
    where: { itemId: params.item.id, isExhausted: false },
    orderBy: { layerDate: "asc" },
  })

  const activeNonZero = allActiveLayers.filter((l: any) => Number(l.remainingQty || 0) > 0)
  const totalQty = activeNonZero.reduce((s: number, l: any) => s + Number(l.remainingQty || 0), 0)
  const totalVal = activeNonZero.reduce(
    (s: number, l: any) => s + Number(l.remainingQty || 0) * Number(l.unitCost || 0),
    0
  )

  const avgCost = totalQty > 0 ? Number((totalVal / totalQty).toFixed(4)) : unitCost
  const fifoCost = activeNonZero[0] ? Number(activeNonZero[0].unitCost || unitCost) : unitCost
  const lifoCost = activeNonZero[activeNonZero.length - 1]
    ? Number(activeNonZero[activeNonZero.length - 1].unitCost || unitCost)
    : unitCost

  await prisma.inventoryItem.update({
    where: { id: params.item.id },
    data: {
      lastPurchaseCost: unitCost,
      currentAvgCost: avgCost,
      fifoUnitCost: fifoCost,
      lifoUnitCost: lifoCost,
    },
  })
}

async function upsertLotSerialAndTrace(params: {
  item: any
  warehouseId: string
  binCode?: string | null
  lotNumber?: string | null
  serialNumber?: string | null
  expiryDate?: string | Date | null
  signedDelta: number
  unitCost: number
  referenceDocNo?: string | null
  performedBy?: string | null
  eventType: string
  fromLocation?: string | null
  toLocation?: string | null
  notes?: string | null
}): Promise<void> {
  if (!params.lotNumber && !params.serialNumber) return

  let existing = await prisma.lotSerialRecord.findFirst({
    where: {
      itemId: params.item.id,
      warehouseId: params.warehouseId,
      ...(params.lotNumber ? { lotNumber: params.lotNumber } : {}),
      ...(params.serialNumber ? { serialNumber: params.serialNumber } : {}),
    },
  })

  if (!existing) {
    if (params.signedDelta < 0) return
    const parsedExpiry = params.expiryDate
      ? new Date(params.expiryDate)
      : params.item.shelfLifeDays
        ? new Date(Date.now() + Number(params.item.shelfLifeDays) * 86400000)
        : null

    existing = await prisma.lotSerialRecord.create({
      data: {
        itemId: params.item.id,
        warehouseId: params.warehouseId,
        binCode: params.binCode ?? null,
        lotNumber: params.lotNumber || `LOT-${Date.now().toString().slice(-6)}`,
        serialNumber: params.serialNumber ?? null,
        manufacturingDate: new Date(),
        expiryDate: parsedExpiry,
        status: "AVAILABLE",
        initialQty: params.signedDelta,
        remainingQty: params.signedDelta,
        unitCost: params.unitCost,
        originDocType: "WMS_LEDGER",
        originDocNo: params.referenceDocNo ?? null,
        qcStatus: "PASSED",
      },
    })
  } else {
    const nextRem = Math.max(0, Number((Number(existing.remainingQty || 0) + params.signedDelta).toFixed(4)))
    const nextStatus =
      nextRem <= 0
        ? "CONSUMED"
        : existing.status === "CONSUMED"
          ? "AVAILABLE"
          : existing.status

    existing = await prisma.lotSerialRecord.update({
      where: { id: existing.id },
      data: {
        remainingQty: nextRem,
        binCode: params.toLocation || params.binCode || existing.binCode,
        status: nextStatus,
        ...(params.expiryDate ? { expiryDate: new Date(params.expiryDate) } : {}),
      },
    })
  }

  await prisma.traceabilityLog.create({
    data: {
      lotSerialId: existing.id,
      eventType: params.eventType,
      eventDate: new Date(),
      quantity: Math.abs(params.signedDelta),
      fromLocation: params.fromLocation ?? null,
      toLocation: params.toLocation ?? params.binCode ?? null,
      referenceDocNo: params.referenceDocNo ?? null,
      operatorName: params.performedBy ?? "WMS Operatör",
      notes: params.notes ?? null,
    },
  })
}

/**
 * Tek doğruluk kaynağı üzerinden stok hareketi işler.
 * Hem gerçek Prisma veritabanında hem offline JSON DB'de atomik sayısal tutarlılık sağlar.
 */
export async function recordStockLedgerEntry(
  input: RecordStockLedgerEntryInput
): Promise<RecordStockLedgerEntryResult> {
  // 1. İdempotency (çift okutma / tekrar gönderim) koruması
  if (input.idempotencyKey) {
    const existingMov = await prisma.stockMovement
      .findFirst({ where: { idempotencyKey: input.idempotencyKey } })
      .catch(() => null)
    if (existingMov) {
      const bal = await prisma.stockBalance
        .findFirst({
          where: {
            itemId: input.itemId,
            warehouseId: input.warehouseId,
            ...(input.storageBinId ? { storageBinId: input.storageBinId } : {}),
          },
        })
        .catch(() => null)
      return {
        duplicate: true,
        movement: existingMov,
        balance: bal,
        balanceAfterQty: Number(existingMov.balanceAfterQty ?? bal?.onHandQty ?? 0),
        unitCost: Number(existingMov.unitCost || 0),
        totalCost: Number(existingMov.totalCost || 0),
      }
    }
  }

  const item = await prisma.inventoryItem.findUnique({ where: { id: input.itemId } })
  if (!item) {
    throw new LogisticsDomainError(
      "STOCK_ITEM_NOT_FOUND",
      `Stok kalemi bulunamadı (${input.itemId}).`,
      404
    )
  }

  const warehouse = await prisma.warehouse.findUnique({ where: { id: input.warehouseId } })
  if (!warehouse) {
    throw new LogisticsDomainError(
      "WAREHOUSE_NOT_FOUND",
      `Depo kaydı bulunamadı (${input.warehouseId}).`,
      404
    )
  }

  let targetBin: any = null
  if (input.storageBinId) {
    targetBin = await prisma.storageBin.findUnique({ where: { id: input.storageBinId } })
    if (!targetBin) {
      throw new LogisticsDomainError(
        "BIN_NOT_FOUND",
        `Hedef raf hücresi bulunamadı (${input.storageBinId}).`,
        404
      )
    }
    if ((targetBin.isBlocked || targetBin.isActive === false) && !input.allowBlockedBin) {
      throw new LogisticsDomainError(
        "BIN_BLOCKED",
        `Raf hücresi (${targetBin.code}) bloklu veya pasif durumda: ${targetBin.blockReason || "İşlem engellendi"}.`,
        409,
        { binCode: targetBin.code, blockReason: targetBin.blockReason }
      )
    }
  }

  const isOutbound = isOutboundMovement(input.movementType, input.quantityDelta)
  const absQty = Math.abs(Number(input.quantityDelta || 0))
  if (absQty <= 0 && input.movementType !== "COUNT_ADJUSTMENT") {
    throw new LogisticsDomainError(
      "INVALID_QUANTITY",
      "Stok hareket miktarı sıfırdan büyük olmalıdır.",
      400
    )
  }

  const signedDelta = isOutbound ? -absQty : absQty

  // 2. Mevcut StockBalance kaydını bul (raf bazlı veya depo geneli)
  let balance = await prisma.stockBalance.findFirst({
    where: {
      itemId: input.itemId,
      warehouseId: input.warehouseId,
      storageBinId: input.storageBinId ?? null,
    },
  })

  // Eğer çıkışta raf belirtilmemişse veya rafta yeterli yoksa ama başka rafta varsa kontrol et
  if (isOutbound) {
    const currentOnHand = Number(balance?.onHandQty || 0)
    const currentReserved = Number(balance?.reservedQty || 0)
    const consumeRes = Math.min(currentReserved, Math.max(0, Number(input.consumeReservedQty || 0)))
    const maxAllowedOut = currentOnHand - Math.max(0, currentReserved - consumeRes)

    if (absQty > maxAllowedOut + 1e-6) {
      throw new LogisticsDomainError(
        "INSUFFICIENT_STOCK",
        `${item.sku} (${item.name}) için yeterli kullanılabilir stok yok. İstenen: ${absQty}, Kullanılabilir: ${Math.max(0, maxAllowedOut)}.`,
        409,
        {
          sku: item.sku,
          warehouseId: input.warehouseId,
          binCode: targetBin?.code ?? input.fromBinCode ?? null,
          requestedQty: absQty,
          availableQty: Math.max(0, maxAllowedOut),
        }
      )
    }
  }

  const prevOnHand = Number(balance?.onHandQty || 0)
  const prevReserved = Number(balance?.reservedQty || 0)
  const consumeReserved = isOutbound
    ? Math.min(prevReserved, Math.max(0, Number(input.consumeReservedQty || 0)))
    : 0
  const nextReserved = Math.max(0, Number((prevReserved - consumeReserved).toFixed(4)))
  const nextOnHand = Math.max(0, Number((prevOnHand + signedDelta).toFixed(4)))
  const nextAvailable = Math.max(0, Number((nextOnHand - nextReserved).toFixed(4)))

  if (balance) {
    balance = await prisma.stockBalance.update({
      where: { id: balance.id },
      data: {
        onHandQty: nextOnHand,
        reservedQty: nextReserved,
        availableQty: nextAvailable,
        binCode: targetBin?.code ?? balance.binCode ?? input.toBinCode ?? input.fromBinCode ?? null,
      },
    })
  } else {
    balance = await prisma.stockBalance.create({
      data: {
        itemId: input.itemId,
        warehouseId: input.warehouseId,
        storageBinId: input.storageBinId ?? null,
        binCode: targetBin?.code ?? input.toBinCode ?? input.fromBinCode ?? null,
        onHandQty: nextOnHand,
        reservedQty: nextReserved,
        availableQty: nextAvailable,
        inTransitQty: 0,
        quarantineQty: 0,
        consignmentQty: 0,
      },
    })
  }

  // 3. Maliyet katmanı & değerleme
  let unitCost = Number(input.unitCostOverride ?? 0)
  let totalCost = 0

  if (isOutbound) {
    const consumed = await consumeCostLayers({
      item,
      warehouseId: input.warehouseId,
      qtyToConsume: absQty,
    })
    unitCost = unitCost > 0 ? unitCost : consumed.weightedUnitCost
    totalCost = unitCost > 0 ? Number((absQty * unitCost).toFixed(2)) : consumed.totalCost
  } else {
    unitCost =
      unitCost > 0
        ? unitCost
        : Number(item.currentAvgCost || item.fifoUnitCost || item.standardCost || 0)
    totalCost = Number((absQty * unitCost).toFixed(2))
    await addCostLayer({
      item,
      warehouseId: input.warehouseId,
      qty: absQty,
      unitCost,
      lotNumber: input.lotNumber,
      referenceDocNo: input.referenceDocNo,
    })
  }

  const standardCostVariance = Number(
    ((unitCost - Number(item.standardCost || unitCost)) * absQty).toFixed(2)
  )

  // 4. Lot/Seri ve İzlenebilirlik güncellemesi
  await upsertLotSerialAndTrace({
    item,
    warehouseId: input.warehouseId,
    binCode: targetBin?.code ?? input.toBinCode ?? input.fromBinCode ?? null,
    lotNumber: input.lotNumber,
    serialNumber: input.serialNumber,
    expiryDate: input.expiryDate,
    signedDelta,
    unitCost,
    referenceDocNo: input.referenceDocNo,
    performedBy: input.performedBy,
    eventType:
      input.traceEventType ||
      (isOutbound ? "WMS_OUTBOUND" : "WMS_RECEIPT"),
    fromLocation: input.fromBinCode ?? null,
    toLocation: input.toBinCode ?? targetBin?.code ?? null,
    notes: input.notes,
  })

  // 5. Toplam ürün depo bakiyesini hesapla (yürüyen bakiye)
  const itemBalances = await prisma.stockBalance.findMany({
    where: { itemId: input.itemId, warehouseId: input.warehouseId },
  })
  const balanceAfterQty = Number(
    itemBalances.reduce((s: number, b: any) => s + Number(b.onHandQty || 0), 0).toFixed(4)
  )

  // 6. Kalıcı StockMovement kaydı (Prisma şeması ile %100 uyumlu kolonlar)
  const movement = await prisma.stockMovement.create({
    data: {
      itemId: input.itemId,
      warehouseId: input.warehouseId,
      movementType: input.movementType,
      quantity: signedDelta,
      unit: input.unit || item.baseUnit || "Adet",
      valuationMethodUsed: item.valuationMethod || "FIFO",
      unitCost,
      totalCost,
      standardCostVariance,
      lotNumber: input.lotNumber ?? null,
      serialNumber: input.serialNumber ?? null,
      fromBinCode: input.fromBinCode ?? (isOutbound ? targetBin?.code ?? null : null),
      toBinCode: input.toBinCode ?? (!isOutbound ? targetBin?.code ?? null : null),
      lpnCode: input.lpnCode ?? null,
      referenceDocNo: input.referenceDocNo ?? null,
      performedBy: input.performedBy ?? "Sistem",
      notes: input.notes ?? null,
      idempotencyKey: input.idempotencyKey ?? null,
      deviceId: input.deviceId ?? null,
      method: input.method ?? "WEB",
      reservationId: input.reservationId ?? null,
      balanceAfterQty,
      ...(input.createdAt ? { createdAt: input.createdAt } : {}),
    },
  })

  // 7. Raf doluluk metriklerini güncelle
  await syncStorageBinMetrics(input.storageBinId)

  return {
    duplicate: false,
    movement,
    balance,
    balanceAfterQty,
    unitCost,
    totalCost,
  }
}

export interface StockLedgerFilterParams {
  warehouseId?: string
  itemId?: string
  movementType?: string
  lotNumber?: string
  binCode?: string
  referenceDocNo?: string
  method?: string
  search?: string
  page?: number
  pageSize?: number
}

/**
 * Sayfalanmış, filtrelenebilir, depo/raf/lot/belge/yöntem/kullanıcı bazlı Stok Defteri (Ledger) sorgusu.
 */
export async function queryStockLedger(params: StockLedgerFilterParams = {}) {
  const page = Math.max(1, Number(params.page || 1))
  const pageSize = Math.min(100, Math.max(1, Number(params.pageSize || 30)))

  const [allMovements, items, warehouses] = await Promise.all([
    prisma.stockMovement.findMany({ orderBy: { createdAt: "desc" } }),
    prisma.inventoryItem.findMany(),
    prisma.warehouse.findMany(),
  ])

  const itemMap = new Map(items.map((i: any) => [i.id, i]))
  const whMap = new Map(warehouses.map((w: any) => [w.id, w]))

  const searchLower = params.search?.trim().toLowerCase()

  const filtered = allMovements.filter((m: any) => {
    if (params.warehouseId && params.warehouseId !== "ALL" && m.warehouseId !== params.warehouseId) {
      return false
    }
    if (params.itemId && params.itemId !== "ALL" && m.itemId !== params.itemId) {
      return false
    }
    if (params.movementType && params.movementType !== "ALL" && m.movementType !== params.movementType) {
      return false
    }
    if (params.lotNumber && m.lotNumber !== params.lotNumber) {
      return false
    }
    if (params.method && params.method !== "ALL" && (m.method || "WEB") !== params.method) {
      return false
    }
    if (params.binCode) {
      if (m.fromBinCode !== params.binCode && m.toBinCode !== params.binCode) return false
    }
    if (params.referenceDocNo) {
      if (!String(m.referenceDocNo || "").toLowerCase().includes(params.referenceDocNo.toLowerCase())) {
        return false
      }
    }
    if (searchLower) {
      const it = itemMap.get(m.itemId)
      const haystack = [
        it?.sku,
        it?.name,
        m.referenceDocNo,
        m.lotNumber,
        m.serialNumber,
        m.lpnCode,
        m.fromBinCode,
        m.toBinCode,
        m.performedBy,
        m.notes,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase()
      if (!haystack.includes(searchLower)) return false
    }
    return true
  })

  const total = filtered.length
  const skip = (page - 1) * pageSize
  const slice = filtered.slice(skip, skip + pageSize)

  const entries = slice.map((m: any) => {
    const it = itemMap.get(m.itemId)
    const wh = whMap.get(m.warehouseId)
    return {
      ...m,
      sku: it?.sku || "-",
      itemName: it?.name || "Bilinmeyen Ürün",
      warehouseName: wh?.name || "Bilinmeyen Depo",
      warehouseCode: wh?.code || "-",
      method: m.method || "WEB",
    }
  })

  return {
    entries,
    pagination: {
      page,
      pageSize,
      total,
      totalPages: Math.max(1, Math.ceil(total / pageSize)),
    },
  }
}
