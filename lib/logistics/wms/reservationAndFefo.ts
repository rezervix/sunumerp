/**
 * Lojistik Faz 2 — Rezervasyon Yönetimi & FIFO/FEFO Lot/Raf Öneri Motoru
 *
 * KURALLAR:
 * - Mevcut `productionWorkOrderServerDb.ts` ve `omnichannelServerDb.ts` üzerindeki
 *   `StockBalance.reservedQty` alanıyla ASLA çakışmaz; yalnızca bu servise ait
 *   `LojistikStockReservation` satırlarının deltasını StockBalance'a yansıtır.
 * - FEFO politikasında son kullanma tarihi en erken (expiryDate ASC) geçerli ve
 *   karantina dışı lotlar önerilir; süresi dolmuş veya RECALLED/QUARANTINE lotlar atlanır.
 * - FIFO politikasında en eski üretim/giriş tarihli lotlar önerilir.
 */

import { prisma } from "@/lib/db"
import { LogisticsDomainError } from "@/lib/logistics/security"
import { resolveNormalizedBinRole, type WmsPickPolicy, type WmsReservationSourceType } from "./constantsAndHelpers"

export interface PickSuggestionCandidate {
  lotId: string | null
  lotNumber: string | null
  serialNumber: string | null
  expiryDate: string | null
  createdAt: string | null
  warehouseId: string
  storageBinId: string | null
  binCode: string
  aisle: string
  rack: string
  availableQty: number
  suggestedPickQty: number
  policyApplied: WmsPickPolicy
}

/**
 * Bir ürün ve depo için aktif FIFO / FEFO politikasına göre toplanması gereken lot/raf sırasını üretir.
 * Karantina, İade/RMA ve bloklu rafları + süresi dolmuş veya karantinadaki lotları otomatik dışlar.
 */
export async function suggestPickAllocation(params: {
  itemId: string
  warehouseId: string
  requiredQty: number
  policyOverride?: WmsPickPolicy
  includeQuarantine?: boolean
}): Promise<{
  policyUsed: WmsPickPolicy
  requestedQty: number
  totalAvailableQty: number
  allocatedQty: number
  shortfallQty: number
  suggestions: PickSuggestionCandidate[]
}> {
  const [item, warehouse, bins, balances, lots] = await Promise.all([
    prisma.inventoryItem.findUnique({ where: { id: params.itemId } }),
    prisma.warehouse.findUnique({ where: { id: params.warehouseId } }),
    prisma.storageBin.findMany({ where: { warehouseId: params.warehouseId } }),
    prisma.stockBalance.findMany({
      where: { itemId: params.itemId, warehouseId: params.warehouseId },
    }),
    prisma.lotSerialRecord.findMany({
      where: { itemId: params.itemId, warehouseId: params.warehouseId },
    }),
  ])

  if (!item) {
    throw new LogisticsDomainError("ITEM_NOT_FOUND", "Ürün bulunamadı.", 404)
  }

  // Politika önceliği: açık override > ürün pickPolicy > SKT takibi varsa FEFO > depo pickPolicy > FIFO
  const rawPolicy =
    params.policyOverride ||
    item.pickPolicy ||
    (item.trackExpiry ? "FEFO" : null) ||
    warehouse?.pickPolicy ||
    "FIFO"
  const policyUsed: WmsPickPolicy = String(rawPolicy).toUpperCase() === "FEFO" ? "FEFO" : "FIFO"

  const binMap = new Map(bins.map((b: any) => [b.id, b]))
  const binByCodeMap = new Map(bins.map((b: any) => [b.code, b]))
  const nowMs = Date.now()

  // Geçerli ve bloke olmayan raflardaki kullanılabilir bakiyeler
  const usableBalances = balances.filter((b: any) => {
    const avail = Math.max(0, Number(b.availableQty ?? Number(b.onHandQty || 0) - Number(b.reservedQty || 0)))
    if (avail <= 0) return false
    const bin = b.storageBinId ? binMap.get(b.storageBinId) : binByCodeMap.get(b.binCode)
    if (!bin) return true
    if (bin.isBlocked || bin.isActive === false) return false
    const role = resolveNormalizedBinRole(bin)
    if (!params.includeQuarantine && (role === "QUARANTINE" || role === "RETURN_RMA")) return false
    return true
  })

  const totalAvailableQty = Number(
    usableBalances.reduce(
      (s: number, b: any) =>
        s + Math.max(0, Number(b.availableQty ?? Number(b.onHandQty || 0) - Number(b.reservedQty || 0))),
      0
    ).toFixed(4)
  )

  // Geçerli lot kayıtları
  const validLots = lots
    .filter((l: any) => {
      if (Number(l.remainingQty || 0) <= 0) return false
      if (l.status === "QUARANTINE" || l.status === "RECALLED" || l.status === "EXPIRED" || l.status === "CONSUMED") {
        return false
      }
      if (l.expiryDate && new Date(l.expiryDate).getTime() < nowMs) return false
      const lotBin = l.binCode ? binByCodeMap.get(l.binCode) : null
      if (lotBin && (lotBin.isBlocked || lotBin.isActive === false)) return false
      if (lotBin && !params.includeQuarantine) {
        const role = resolveNormalizedBinRole(lotBin)
        if (role === "QUARANTINE" || role === "RETURN_RMA") return false
      }
      return true
    })
    .sort((a: any, b: any) => {
      if (policyUsed === "FEFO") {
        const expA = a.expiryDate ? new Date(a.expiryDate).getTime() : Number.MAX_SAFE_INTEGER
        const expB = b.expiryDate ? new Date(b.expiryDate).getTime() : Number.MAX_SAFE_INTEGER
        if (expA !== expB) return expA - expB
      }
      const cA = new Date(a.createdAt || a.manufacturingDate || 0).getTime()
      const cB = new Date(b.createdAt || b.manufacturingDate || 0).getTime()
      return cA - cB
    })

  const suggestions: PickSuggestionCandidate[] = []
  let remainingNeed = Math.max(0, Number(params.requiredQty || 0))

  // Önce kullanılabilir bakiye haritasını çıkar (raf kodu -> kalan)
  const availByBinCode = new Map<string, number>()
  for (const b of usableBalances) {
    const code = b.binCode || "GENEL"
    const av = Math.max(0, Number(b.availableQty ?? Number(b.onHandQty || 0) - Number(b.reservedQty || 0)))
    availByBinCode.set(code, (availByBinCode.get(code) || 0) + av)
  }

  for (const lot of validLots) {
    if (remainingNeed <= 0) break
    const binCode = lot.binCode || "GENEL"
    const binObj = binByCodeMap.get(binCode)
    const binCap = availByBinCode.has(binCode) ? availByBinCode.get(binCode)! : Number(lot.remainingQty || 0)
    const lotAvail = Math.min(Number(lot.remainingQty || 0), binCap)
    if (lotAvail <= 0) continue

    const takeQty = Math.min(remainingNeed, lotAvail)
    suggestions.push({
      lotId: lot.id,
      lotNumber: lot.lotNumber,
      serialNumber: lot.serialNumber ?? null,
      expiryDate: lot.expiryDate ? new Date(lot.expiryDate).toISOString() : null,
      createdAt: lot.createdAt ? new Date(lot.createdAt).toISOString() : null,
      warehouseId: params.warehouseId,
      storageBinId: binObj?.id ?? null,
      binCode,
      aisle: binObj?.aisle || "A",
      rack: binObj?.rack || "01",
      availableQty: Number(lotAvail.toFixed(4)),
      suggestedPickQty: Number(takeQty.toFixed(4)),
      policyApplied: policyUsed,
    })

    remainingNeed = Number((remainingNeed - takeQty).toFixed(4))
    if (availByBinCode.has(binCode)) {
      availByBinCode.set(binCode, Math.max(0, availByBinCode.get(binCode)! - takeQty))
    }
  }

  // Lotsuz bakiye kaldıysa koridor sırasıyla raf bakiyelerinden tamamla
  if (remainingNeed > 0) {
    const sortedBalances = [...usableBalances].sort((a: any, b: any) => {
      const binA = a.storageBinId ? binMap.get(a.storageBinId) : null
      const binB = b.storageBinId ? binMap.get(b.storageBinId) : null
      const aisleCmp = String(binA?.aisle || "Z").localeCompare(String(binB?.aisle || "Z"))
      if (aisleCmp !== 0) return aisleCmp
      return String(binA?.code || a.binCode || "").localeCompare(String(binB?.code || b.binCode || ""))
    })

    for (const bal of sortedBalances) {
      if (remainingNeed <= 0) break
      const binCode = bal.binCode || "GENEL"
      const leftInBin = availByBinCode.get(binCode) ?? 0
      if (leftInBin <= 0) continue

      const takeQty = Math.min(remainingNeed, leftInBin)
      const binObj = bal.storageBinId ? binMap.get(bal.storageBinId) : binByCodeMap.get(binCode)
      suggestions.push({
        lotId: null,
        lotNumber: null,
        serialNumber: null,
        expiryDate: null,
        createdAt: null,
        warehouseId: params.warehouseId,
        storageBinId: bal.storageBinId ?? binObj?.id ?? null,
        binCode,
        aisle: binObj?.aisle || "A",
        rack: binObj?.rack || "01",
        availableQty: Number(leftInBin.toFixed(4)),
        suggestedPickQty: Number(takeQty.toFixed(4)),
        policyApplied: policyUsed,
      })

      remainingNeed = Number((remainingNeed - takeQty).toFixed(4))
      availByBinCode.set(binCode, Math.max(0, leftInBin - takeQty))
    }
  }

  const allocatedQty = Number((Number(params.requiredQty || 0) - remainingNeed).toFixed(4))
  return {
    policyUsed,
    requestedQty: Number(params.requiredQty || 0),
    totalAvailableQty,
    allocatedQty,
    shortfallQty: Math.max(0, remainingNeed),
    suggestions,
  }
}

export interface CreateReservationInput {
  sourceType: WmsReservationSourceType
  sourceId: string
  sourceRefNo?: string | null
  itemId: string
  warehouseId: string
  storageBinId?: string | null
  lotNumber?: string | null
  serialNumber?: string | null
  quantity: number
  expiresAt?: string | Date | null
  createdBy?: string | null
  notes?: string | null
}

/**
 * Sipariş/Sevkiyat/Transfer/Kit için açık WMS stok rezervasyonu oluşturur.
 * StockBalance.reservedQty değerini güvenli delta kadar artırıp availableQty değerini düşürür;
 * mevcut üretim rezervasyonlarına asla dokunmaz.
 */
export async function createStockReservation(input: CreateReservationInput) {
  const qty = Number(input.quantity || 0)
  if (qty <= 0) {
    throw new LogisticsDomainError("INVALID_QTY", "Rezervasyon miktarı sıfırdan büyük olmalıdır.", 400)
  }

  const item = await prisma.inventoryItem.findUnique({ where: { id: input.itemId } })
  if (!item) throw new LogisticsDomainError("ITEM_NOT_FOUND", "Ürün bulunamadı.", 404)

  // Hedef raf belirtilmişse oradan, yoksa kullanılabilir stok bulunan ilk raftan rezerve et
  let targetBalance = await prisma.stockBalance.findFirst({
    where: {
      itemId: input.itemId,
      warehouseId: input.warehouseId,
      ...(input.storageBinId ? { storageBinId: input.storageBinId } : {}),
    },
    orderBy: { availableQty: "desc" },
  })

  if (!targetBalance) {
    const whBalances = await prisma.stockBalance.findMany({
      where: { itemId: input.itemId, warehouseId: input.warehouseId },
      orderBy: { availableQty: "desc" },
    })
    targetBalance = whBalances[0] ?? null
  }

  if (!targetBalance) {
    throw new LogisticsDomainError(
      "INSUFFICIENT_AVAILABLE_STOCK",
      `${item.sku} için seçilen depoda stok bakiyesi bulunamadı.`,
      409
    )
  }

  const onHand = Number(targetBalance.onHandQty || 0)
  const existingReserved = Number(targetBalance.reservedQty || 0)
  const available = Math.max(0, onHand - existingReserved)

  if (qty > available + 1e-6) {
    throw new LogisticsDomainError(
      "INSUFFICIENT_AVAILABLE_STOCK",
      `${item.sku} için kullanılabilir stok yetersiz. Kullanılabilir: ${available}, İstenen: ${qty}.`,
      409,
      { availableQty: available, requestedQty: qty, totalReservedQty: existingReserved }
    )
  }

  let chosenLot = input.lotNumber ?? null
  if (!chosenLot && item.trackLot) {
    const sug = await suggestPickAllocation({
      itemId: input.itemId,
      warehouseId: input.warehouseId,
      requiredQty: qty,
    })
    chosenLot = sug.suggestions[0]?.lotNumber ?? null
  }

  const nextReserved = Number((existingReserved + qty).toFixed(4))
  const nextAvailable = Math.max(0, Number((onHand - nextReserved).toFixed(4)))

  await prisma.stockBalance.update({
    where: { id: targetBalance.id },
    data: {
      reservedQty: nextReserved,
      availableQty: nextAvailable,
    },
  })

  const reservationNo = `REZ-${new Date().getFullYear()}-${Math.floor(10000 + Math.random() * 89999)}`
  const reservation = await (prisma as any).lojistikStockReservation.create({
    data: {
      reservationNo,
      sourceType: input.sourceType,
      sourceId: input.sourceId,
      sourceRefNo: input.sourceRefNo || input.sourceId,
      itemId: input.itemId,
      warehouseId: input.warehouseId,
      storageBinId: input.storageBinId || targetBalance.storageBinId || null,
      lotNumber: chosenLot,
      serialNumber: input.serialNumber ?? null,
      reservedQty: qty,
      fulfilledQty: 0,
      releasedQty: 0,
      status: "ACTIVE",
      expiresAt: input.expiresAt ? new Date(input.expiresAt) : null,
      createdBy: input.createdBy || "WMS Operatör",
      notes: input.notes ?? null,
    },
  })

  return reservation
}

/**
 * Aktif veya kısmi rezervasyonu iptal edip StockBalance.reservedQty üzerinden yalnızca kendi payını geri çözer.
 */
export async function releaseStockReservation(params: {
  reservationId: string
  releaseQty?: number
  markStatus?: "RELEASED" | "CANCELLED" | "EXPIRED" | "FULFILLED"
  performedBy?: string
}) {
  const res = await (prisma as any).lojistikStockReservation.findUnique({
    where: { id: params.reservationId },
  })
  if (!res) {
    throw new LogisticsDomainError("RESERVATION_NOT_FOUND", "Rezervasyon kaydı bulunamadı.", 404)
  }
  if (res.status === "RELEASED" || res.status === "CANCELLED" || res.status === "FULFILLED") {
    return res
  }

  const openQty = Math.max(
    0,
    Number(res.reservedQty || 0) - Number(res.fulfilledQty || 0) - Number(res.releasedQty || 0)
  )
  const qtyToRelease = params.releaseQty ? Math.min(openQty, Number(params.releaseQty)) : openQty

  if (qtyToRelease > 0) {
    const balance = await prisma.stockBalance.findFirst({
      where: {
        itemId: res.itemId,
        warehouseId: res.warehouseId,
        ...(res.storageBinId ? { storageBinId: res.storageBinId } : {}),
      },
    })

    if (balance) {
      const onHand = Number(balance.onHandQty || 0)
      const currentRes = Number(balance.reservedQty || 0)
      const nextRes = Math.max(0, Number((currentRes - qtyToRelease).toFixed(4)))
      const nextAvail = Math.max(0, Number((onHand - nextRes).toFixed(4)))
      await prisma.stockBalance.update({
        where: { id: balance.id },
        data: {
          reservedQty: nextRes,
          availableQty: nextAvail,
        },
      })
    }
  }

  const nextReleased =
    params.markStatus === "FULFILLED"
      ? Number(res.releasedQty || 0)
      : Number((Number(res.releasedQty || 0) + qtyToRelease).toFixed(4))
  const nextFulfilled =
    params.markStatus === "FULFILLED"
      ? Number((Number(res.fulfilledQty || 0) + qtyToRelease).toFixed(4))
      : Number(res.fulfilledQty || 0)

  const remaining = Math.max(0, Number(res.reservedQty || 0) - nextFulfilled - nextReleased)
  const finalStatus =
    remaining <= 1e-6
      ? params.markStatus || "RELEASED"
      : "PARTIAL"

  return await (prisma as any).lojistikStockReservation.update({
    where: { id: res.id },
    data: {
      releasedQty: nextReleased,
      fulfilledQty: nextFulfilled,
      status: finalStatus,
      notes: params.performedBy
        ? `${res.notes ? res.notes + " | " : ""}${finalStatus} (${params.performedBy})`
        : res.notes,
    },
  })
}

/**
 * Süresi dolmuş aktif rezervasyonları otomatik çözer ve üretim/WMS ayrımını koruyarak listeler.
 */
export async function listReservationsWithBreakdown(warehouseId?: string) {
  const now = new Date()
  const allRes = await (prisma as any).lojistikStockReservation.findMany({
    ...(warehouseId && warehouseId !== "ALL" ? { where: { warehouseId } } : {}),
    orderBy: { createdAt: "desc" },
  })

  // Süresi dolmuş olanları otomatik serbest bırak
  for (const r of allRes) {
    if (
      (r.status === "ACTIVE" || r.status === "PARTIAL") &&
      r.expiresAt &&
      new Date(r.expiresAt).getTime() < now.getTime()
    ) {
      await releaseStockReservation({
        reservationId: r.id,
        markStatus: "EXPIRED",
        performedBy: "Süre Dolumu Otomasyonu",
      }).catch(() => null)
    }
  }

  const [freshRes, balances, items, warehouses] = await Promise.all([
    (prisma as any).lojistikStockReservation.findMany({
      ...(warehouseId && warehouseId !== "ALL" ? { where: { warehouseId } } : {}),
      orderBy: { createdAt: "desc" },
    }),
    prisma.stockBalance.findMany(
      warehouseId && warehouseId !== "ALL" ? { where: { warehouseId } } : undefined
    ),
    prisma.inventoryItem.findMany(),
    prisma.warehouse.findMany(),
  ])

  const itemMap = new Map(items.map((i: any) => [i.id, i]))
  const whMap = new Map(warehouses.map((w: any) => [w.id, w]))

  const activeWmsByItemWh = new Map<string, number>()
  for (const r of freshRes) {
    if (r.status === "ACTIVE" || r.status === "PARTIAL") {
      const open = Math.max(0, Number(r.reservedQty || 0) - Number(r.fulfilledQty || 0) - Number(r.releasedQty || 0))
      const key = `${r.itemId}::${r.warehouseId}`
      activeWmsByItemWh.set(key, (activeWmsByItemWh.get(key) || 0) + open)
    }
  }

  const stockBreakdownMap = new Map<string, any>()
  for (const bal of balances) {
    const key = `${bal.itemId}::${bal.warehouseId}`
    const prev = stockBreakdownMap.get(key) || {
      itemId: bal.itemId,
      warehouseId: bal.warehouseId,
      sku: itemMap.get(bal.itemId)?.sku || "-",
      itemName: itemMap.get(bal.itemId)?.name || "-",
      warehouseName: whMap.get(bal.warehouseId)?.name || "-",
      onHandQty: 0,
      totalReservedQty: 0,
      wmsReservedQty: activeWmsByItemWh.get(key) || 0,
      productionOrOtherReservedQty: 0,
      availableQty: 0,
    }
    prev.onHandQty += Number(bal.onHandQty || 0)
    prev.totalReservedQty += Number(bal.reservedQty || 0)
    prev.availableQty += Math.max(0, Number(bal.onHandQty || 0) - Number(bal.reservedQty || 0))
    prev.productionOrOtherReservedQty = Math.max(0, prev.totalReservedQty - prev.wmsReservedQty)
    stockBreakdownMap.set(key, prev)
  }

  const enrichedReservations = freshRes.map((r: any) => ({
    ...r,
    sku: itemMap.get(r.itemId)?.sku || "-",
    itemName: itemMap.get(r.itemId)?.name || "-",
    baseUnit: itemMap.get(r.itemId)?.baseUnit || "Adet",
    warehouseName: whMap.get(r.warehouseId)?.name || "-",
    openQty: Math.max(0, Number(r.reservedQty || 0) - Number(r.fulfilledQty || 0) - Number(r.releasedQty || 0)),
  }))

  return {
    reservations: enrichedReservations,
    stockBreakdown: Array.from(stockBreakdownMap.values()),
  }
}
