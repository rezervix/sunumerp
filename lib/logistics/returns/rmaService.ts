/**
 * Lojistik Faz 4 — Tersine Lojistik / İade (RMA), Süre/Garanti Takibi, Etiket, El Terminali Kabul & Kalite Karar Servisi
 */

import QRCode from "qrcode"
import { prisma } from "@/lib/db"
import { LogisticsDomainError, logLogisticsAudit } from "@/lib/logistics/security"
import { createLogisticsProviders } from "@/lib/logistics/providers"
import { recordStockLedgerEntry } from "@/lib/logistics/wms/stockLedgerService"
import { resolveNormalizedBinRole } from "@/lib/logistics/wms/constantsAndHelpers"
import {
  createQualityInspection,
  createQualityNcr,
} from "@/lib/services/productionQualityServerDb"
import { recalculateSupplierScorecard } from "@/lib/logistics/procurement/scorecardService"
import {
  LEGAL_MIN_RETURN_DAYS,
  RMA_REASON_CODES,
  RMA_REASON_LABELS,
  RMA_QUALITY_DECISIONS,
  canTransitionRmaStatus,
  evaluateReturnEligibility,
  generateRmaBarcodeValue,
  normalizeLegacyRmaStatus,
  type RmaQualityDecision,
  type RmaReasonCode,
  type RmaWorkflowStatus,
} from "./constantsAndHelpers"

async function resolveDefaultWarehouseId(preferred?: string | null): Promise<string> {
  if (preferred && preferred !== "wh-merkez") {
    const found = await prisma.warehouse.findUnique({ where: { id: preferred } }).catch(() => null)
    if (found) return found.id
  }
  const merkez = await prisma.warehouse.findUnique({ where: { id: "wh-merkez-01" } }).catch(() => null)
  if (merkez) return merkez.id
  const first = await prisma.warehouse.findFirst().catch(() => null)
  return first?.id || "wh-merkez-01"
}

async function resolveQuarantineOrReturnBin(
  warehouseId: string,
  preferredBinCode?: string | null
) {
  const bins = await prisma.storageBin.findMany({ where: { warehouseId } })
  if (preferredBinCode) {
    const exact = bins.find((b: any) => b.code === preferredBinCode)
    if (exact) return exact
  }
  const returnBin = bins.find(
    (b: any) => resolveNormalizedBinRole(b) === "RETURN_RMA" && !b.isBlocked
  )
  if (returnBin) return returnBin
  const qBin = bins.find(
    (b: any) => resolveNormalizedBinRole(b) === "QUARANTINE" && !b.isBlocked
  )
  if (qBin) return qBin
  return bins[0] ?? null
}

async function resolveSellableRestockBin(
  warehouseId: string,
  preferredBinCode?: string | null
) {
  const bins = await prisma.storageBin.findMany({ where: { warehouseId } })
  if (preferredBinCode) {
    const exact = bins.find((b: any) => b.code === preferredBinCode && !b.isBlocked)
    if (exact) {
      const r = resolveNormalizedBinRole(exact)
      if (r !== "QUARANTINE" && r !== "RETURN_RMA") return exact
    }
  }
  const candidates = bins.filter((b: any) => {
    if (b.isBlocked) return false
    const role = resolveNormalizedBinRole(b)
    return role === "FAST_PICK" || role === "COLD_STORAGE" || role === "NORMAL"
  })
  return candidates[0] ?? bins[0] ?? null
}

async function resolveDefaultSupplierIdForItem(itemId?: string | null): Promise<string | null> {
  if (!itemId) return null
  const item = await prisma.inventoryItem.findUnique({ where: { id: itemId } }).catch(() => null)
  if ((item as any)?.defaultSupplierId) return (item as any).defaultSupplierId
  const link = await (prisma as any).lojistikSupplierItemLink
    .findFirst({ where: { itemId, isActive: true }, orderBy: { isPrimary: "desc" } })
    .catch(() => null)
  return link?.supplierId ?? null
}

export async function recordRmaEvent(params: {
  rmaId: string
  eventType: string
  fromStatus?: string | null
  toStatus?: string | null
  actorUserId?: string | null
  actorName?: string | null
  method?: string
  binCode?: string | null
  qtyDelta?: number | null
  note?: string | null
  metadata?: Record<string, any> | null
}) {
  return (prisma as any).lojistikRmaEventLog.create({
    data: {
      rmaId: params.rmaId,
      eventType: params.eventType,
      fromStatus: params.fromStatus ?? null,
      toStatus: params.toStatus ?? null,
      actorUserId: params.actorUserId ?? null,
      actorName: params.actorName ?? "Sistem",
      method: params.method || "WEB",
      binCode: params.binCode ?? null,
      qtyDelta: params.qtyDelta !== undefined ? params.qtyDelta : null,
      note: params.note ?? null,
      metadataJson: params.metadata ? JSON.stringify(params.metadata) : null,
    },
  })
}

export async function listReturnPolicies() {
  return (prisma as any).lojistikReturnPolicy.findMany({
    orderBy: { createdAt: "asc" },
  })
}

export async function upsertReturnPolicy(
  input: {
    id?: string
    policyKey: string
    title: string
    category?: string | null
    itemId?: string | null
    returnWindowDays: number
    warrantyMonths?: number
    restockable?: boolean
    requireInspection?: boolean
    notes?: string | null
    isActive?: boolean
  },
  actorUserId?: string
) {
  const days = Math.floor(Number(input.returnWindowDays || 0))
  if (!Number.isFinite(days) || days < LEGAL_MIN_RETURN_DAYS) {
    throw new LogisticsDomainError(
      "INVALID_RETURN_POLICY",
      `Yasal asgari iade süresi ${LEGAL_MIN_RETURN_DAYS} günden az olamaz.`,
      400
    )
  }
  const key = String(input.policyKey || "").trim()
  if (!key || !input.title?.trim()) {
    throw new LogisticsDomainError("VALIDATION_ERROR", "Politika anahtarı ve başlık zorunludur.", 400)
  }

  const existing = input.id
    ? await (prisma as any).lojistikReturnPolicy.findUnique({ where: { id: input.id } }).catch(() => null)
    : await (prisma as any).lojistikReturnPolicy.findUnique({ where: { policyKey: key } }).catch(() => null)

  const payload = {
    policyKey: key,
    title: input.title.trim(),
    category: input.category || null,
    itemId: input.itemId || null,
    returnWindowDays: days,
    warrantyMonths: Math.max(0, Math.floor(Number(input.warrantyMonths || 0))),
    restockable: input.restockable ?? true,
    requireInspection: input.requireInspection ?? true,
    notes: input.notes ?? null,
    isActive: input.isActive ?? true,
  }

  const saved = existing
    ? await (prisma as any).lojistikReturnPolicy.update({ where: { id: existing.id }, data: payload })
    : await (prisma as any).lojistikReturnPolicy.create({ data: payload })

  await logLogisticsAudit({
    userId: actorUserId || "system",
    action: existing ? "UPDATE" : "CREATE",
    resource: "lojistik_iade",
    resourceId: saved.id,
    moduleKey: "lojistik_iade",
    metadata: { policyKey: saved.policyKey, returnWindowDays: saved.returnWindowDays },
  })

  return saved
}

export async function resolveReturnPolicyForItem(
  item?: { id?: string; category?: string | null; returnWindowDays?: number | null; warrantyMonths?: number | null } | null,
  policies?: any[]
): Promise<{ returnWindowDays: number; warrantyMonths: number; restockable: boolean; policyTitle: string }> {
  const all = policies ?? (await listReturnPolicies().catch(() => []))
  const active = all.filter((p: any) => p.isActive !== false)

  const itemPolicy = item?.id ? active.find((p: any) => p.itemId === item.id) : null
  const catPolicy =
    item?.category && !itemPolicy
      ? active.find((p: any) => p.category === item.category && !p.itemId)
      : null
  const defaultPolicy = active.find((p: any) => p.policyKey === "DEFAULT_LEGAL_14" || (!p.itemId && !p.category))

  const matched = itemPolicy || catPolicy || defaultPolicy
  const rawDays =
    item?.returnWindowDays ?? matched?.returnWindowDays ?? LEGAL_MIN_RETURN_DAYS
  const rawWarranty =
    item?.warrantyMonths ?? matched?.warrantyMonths ?? 0

  return {
    returnWindowDays: Math.max(LEGAL_MIN_RETURN_DAYS, Number(rawDays || LEGAL_MIN_RETURN_DAYS)),
    warrantyMonths: Math.max(0, Number(rawWarranty || 0)),
    restockable: matched?.restockable ?? true,
    policyTitle: matched?.title || "Yasal Asgari 14 Gün İade Politikası",
  }
}

export async function lookupOrderForRma(params: {
  orderNumber?: string
  orderId?: string
  orderSourceType?: "OMNICHANNEL" | "ERP_ORDER"
}) {
  const policies = await listReturnPolicies().catch(() => [])
  const [items, rmas, edocs] = await Promise.all([
    prisma.inventoryItem.findMany(),
    (prisma as any).returnRmaRecord.findMany({ include: { lines: true } }).catch(() => []),
    (prisma as any).eDocumentRecord.findMany().catch(() => []),
  ])
  const itemById = new Map(items.map((i: any) => [i.id, i]))
  const itemBySku = new Map(items.map((i: any) => [i.sku, i]))

  const activeRmasForOrder = (ordNo: string) =>
    rmas.filter(
      (r: any) =>
        r.orderNumber === ordNo &&
        !["REDDEDILDI", "IPTAL"].includes(normalizeLegacyRmaStatus(r))
    )

  const returnedQtyBySku = (ordNo: string) => {
    const map = new Map<string, number>()
    for (const r of activeRmasForOrder(ordNo)) {
      if (Array.isArray(r.lines) && r.lines.length > 0) {
        for (const l of r.lines) {
          map.set(l.sku, (map.get(l.sku) || 0) + Number(l.requestedQty || 0))
        }
      } else if (r.sku) {
        map.set(r.sku, (map.get(r.sku) || 0) + Number(r.returnQty || 0))
      }
    }
    return map
  }

  let omnOrder: any = null
  if (params.orderSourceType !== "ERP_ORDER") {
    if (params.orderId) {
      omnOrder = await (prisma as any).omnichannelOrder
        .findUnique({ where: { id: params.orderId }, include: { shipmentLines: true } })
        .catch(() => null)
    }
    if (!omnOrder && params.orderNumber) {
      omnOrder = await (prisma as any).omnichannelOrder
        .findFirst({ where: { orderNumber: params.orderNumber }, include: { shipmentLines: true } })
        .catch(() => null)
    }
  }

  if (omnOrder) {
    const retMap = returnedQtyBySku(omnOrder.orderNumber)
    const edoc = edocs.find(
      (e: any) =>
        e.relatedOrderNo === omnOrder.orderNumber ||
        e.documentNo === omnOrder.eInvoiceNo
    )
    const deliveredAt = edoc?.dispatchDate || omnOrder.updatedAt || omnOrder.orderDate
    const lines = await Promise.all(
      (omnOrder.shipmentLines || []).map(async (l: any) => {
        const inv = l.itemId ? itemById.get(l.itemId) : itemBySku.get(l.sku)
        const pol = await resolveReturnPolicyForItem(inv, policies)
        const elig = evaluateReturnEligibility({
          deliveredAt,
          policyReturnDays: pol.returnWindowDays,
          warrantyMonths: pol.warrantyMonths,
        })
        const soldQty = Number(l.quantity || 0)
        const alreadyReturned = retMap.get(l.sku) || 0
        return {
          orderLineId: l.id,
          itemId: inv?.id ?? l.itemId ?? null,
          sku: l.sku,
          itemName: l.itemName,
          soldQty,
          shippedQty: Number(l.shippedQty || soldQty),
          alreadyReturnedQty: alreadyReturned,
          maxReturnableQty: Math.max(0, Number((soldQty - alreadyReturned).toFixed(4))),
          unitPrice: Number(l.unitPrice || inv?.salesPrice || 0),
          policy: pol,
          eligibility: elig,
        }
      })
    )

    return {
      found: true,
      orderSourceType: "OMNICHANNEL" as const,
      orderId: omnOrder.id,
      orderNumber: omnOrder.orderNumber,
      channelCode: omnOrder.channelCode,
      customerName: omnOrder.customerName,
      deliveredAt: new Date(deliveredAt).toISOString(),
      invoiceDocId: edoc?.id ?? null,
      invoiceNo: omnOrder.eInvoiceNo || edoc?.documentNo || null,
      lines,
    }
  }

  let erpOrder: any = null
  if (params.orderSourceType !== "OMNICHANNEL") {
    if (params.orderId) {
      erpOrder = await prisma.order
        .findUnique({ where: { id: params.orderId }, include: { customer: true } })
        .catch(() => null)
    }
    if (!erpOrder && params.orderNumber) {
      erpOrder = await prisma.order
        .findFirst({ where: { orderNumber: params.orderNumber }, include: { customer: true } })
        .catch(() => null)
    }
  }

  if (erpOrder) {
    const orderNo = erpOrder.orderNumber || erpOrder.id
    const retMap = returnedQtyBySku(orderNo)
    const edoc = edocs.find((e: any) => e.relatedOrderNo === orderNo)
    const deliveredAt = edoc?.dispatchDate || erpOrder.orderDate || erpOrder.createdAt
    const defaultItem = items[0] ?? null
    const soldQty = Math.max(1, Number(erpOrder.quantity || 1))
    const alreadyReturned = defaultItem ? retMap.get(defaultItem.sku) || 0 : 0
    const pol = await resolveReturnPolicyForItem(defaultItem, policies)
    const elig = evaluateReturnEligibility({
      deliveredAt,
      policyReturnDays: pol.returnWindowDays,
      warrantyMonths: pol.warrantyMonths,
    })

    return {
      found: true,
      orderSourceType: "ERP_ORDER" as const,
      orderId: erpOrder.id,
      orderNumber: orderNo,
      channelCode: "ERP",
      customerName: erpOrder.customer?.name || erpOrder.customerName || "ERP Müşterisi",
      deliveredAt: new Date(deliveredAt).toISOString(),
      invoiceDocId: edoc?.id ?? null,
      invoiceNo: edoc?.documentNo ?? null,
      lines: defaultItem
        ? [
            {
              orderLineId: erpOrder.id,
              itemId: defaultItem.id,
              sku: defaultItem.sku,
              itemName: erpOrder.title || defaultItem.name,
              soldQty,
              shippedQty: soldQty,
              alreadyReturnedQty: alreadyReturned,
              maxReturnableQty: Math.max(0, Number((soldQty - alreadyReturned).toFixed(4))),
              unitPrice:
                erpOrder.totalAmount && soldQty > 0
                  ? Number((Number(erpOrder.totalAmount) / soldQty).toFixed(2))
                  : Number(defaultItem.salesPrice || 0),
              policy: pol,
              eligibility: elig,
            },
          ]
        : [],
    }
  }

  return { found: false }
}

export async function listEligibleSalesOrdersForRma() {
  const [omnOrders, erpOrders] = await Promise.all([
    (prisma as any).omnichannelOrder
      .findMany({ include: { shipmentLines: true }, orderBy: { orderDate: "desc" } })
      .catch(() => []),
    prisma.order.findMany({ include: { customer: true }, orderBy: { orderDate: "desc" }, take: 25 }).catch(() => []),
  ])

  const results: any[] = []
  for (const o of omnOrders) {
    const info = await lookupOrderForRma({ orderId: o.id, orderSourceType: "OMNICHANNEL" })
    if (info.found) results.push(info)
  }
  for (const o of erpOrders) {
    const info = await lookupOrderForRma({ orderId: o.id, orderSourceType: "ERP_ORDER" })
    if (info.found) results.push(info)
  }
  return results
}

export interface CreateRmaInput {
  orderNumber: string
  originalOrderId?: string
  orderSourceType?: "OMNICHANNEL" | "ERP_ORDER"
  channelCode?: string
  customerName?: string
  invoiceDocId?: string | null
  invoiceNo?: string | null
  reasonCode: RmaReasonCode | string
  reasonNote?: string
  returnTrackingNo?: string | null
  returnCarrierCode?: string | null
  deliveredAt?: string | Date | null
  deadlineOverrideApproved?: boolean
  deadlineOverrideReason?: string
  supplierId?: string | null
  poId?: string | null
  idempotencyKey?: string | null
  externalChannelRef?: string | null
  targetWarehouseId?: string | null
  lines: Array<{
    itemId?: string | null
    orderLineId?: string | null
    sku: string
    itemName?: string
    requestedQty: number
    unitPrice?: number
    lotNumber?: string | null
    serialNumber?: string | null
    notes?: string | null
  }>
}

export async function createRmaDocument(
  input: CreateRmaInput,
  actorUserId?: string,
  actorName = "Sistem"
) {
  if (!input.orderNumber?.trim()) {
    throw new LogisticsDomainError("VALIDATION_ERROR", "Orijinal satış siparişi veya fatura numarası zorunludur.", 400)
  }
  const reasonCode = String(input.reasonCode || "CAYMA_HAKKI") as RmaReasonCode
  if (!(RMA_REASON_CODES as readonly string[]).includes(reasonCode)) {
    throw new LogisticsDomainError("INVALID_REASON_CODE", `Geçersiz iade neden kodu: ${reasonCode}`, 400)
  }
  if (!Array.isArray(input.lines) || input.lines.length === 0) {
    throw new LogisticsDomainError("VALIDATION_ERROR", "En az bir iade ürün satırı girilmelidir.", 400)
  }

  if (input.idempotencyKey) {
    const existingByKey = await (prisma as any).returnRmaRecord
      .findFirst({
        where: { idempotencyKey: input.idempotencyKey },
        include: { lines: true, events: true, creditNotes: true },
      })
      .catch(() => null)
    if (existingByKey) {
      return { duplicate: true, rma: existingByKey }
    }
  }

  const orderInfo = await lookupOrderForRma({
    orderNumber: input.orderNumber.trim(),
    orderId: input.originalOrderId,
    orderSourceType: input.orderSourceType,
  })

  const [items, policies, existingOrderRmas] = await Promise.all([
    prisma.inventoryItem.findMany(),
    listReturnPolicies().catch(() => []),
    (prisma as any).returnRmaRecord
      .findMany({
        where: { orderNumber: input.orderNumber.trim() },
        include: { lines: true },
      })
      .catch(() => []),
  ])

  const itemById = new Map(items.map((i: any) => [i.id, i]))
  const itemBySku = new Map(items.map((i: any) => [i.sku, i]))

  const activeOrderRmas = existingOrderRmas.filter(
    (r: any) => !["REDDEDILDI", "IPTAL"].includes(normalizeLegacyRmaStatus(r))
  )

  const linePayloads: any[] = []
  let totalRefundAmount = 0
  let totalQty = 0
  let primaryItem: any = null
  let maxWindowDays = LEGAL_MIN_RETURN_DAYS
  let maxWarrantyMonths = 0

  for (const rawLine of input.lines) {
    const qty = Number(rawLine.requestedQty || 0)
    if (!Number.isFinite(qty) || qty <= 0) {
      throw new LogisticsDomainError(
        "INVALID_RETURN_QUANTITY",
        `İade miktarı 0'dan büyük olmalıdır (${rawLine.sku}).`,
        400
      )
    }

    const inv = (rawLine.itemId ? itemById.get(rawLine.itemId) : null) || itemBySku.get(rawLine.sku)
    if (!primaryItem && inv) primaryItem = inv

    if (inv && (inv as any).isReturnable === false) {
      throw new LogisticsDomainError(
        "NON_RETURNABLE_ITEM",
        `${inv.name} (${inv.sku}) iade kapsamı dışındadır.`,
        400
      )
    }

    // Orijinal sipariş kalemi varsa satılan miktardan fazla iadeyi kesin olarak engelle!
    let soldQty = qty
    let orderUnitPrice = Number(rawLine.unitPrice ?? inv?.salesPrice ?? 0)
    let matchedOrderLineId = rawLine.orderLineId ?? null

    if (orderInfo.found && Array.isArray(orderInfo.lines) && orderInfo.lines.length > 0) {
      const ordLine =
        orderInfo.lines.find((ol: any) => ol.sku === rawLine.sku) ||
        (orderInfo.orderSourceType === "ERP_ORDER" ? orderInfo.lines[0] : null)

      if (!ordLine && orderInfo.orderSourceType === "OMNICHANNEL") {
        throw new LogisticsDomainError(
          "SKU_NOT_IN_ORDER",
          `${rawLine.sku} ürünü ${orderInfo.orderNumber} siparişinde bulunamadı.`,
          400
        )
      }

      if (ordLine) {
        soldQty = Number(ordLine.soldQty || 0)
        orderUnitPrice = Number(rawLine.unitPrice ?? ordLine.unitPrice ?? orderUnitPrice)
        matchedOrderLineId = ordLine.orderLineId || matchedOrderLineId

        // Aynı siparişteki önceki açık/tamamlanmış RMA toplamını doğrula
        let prevReturned = 0
        for (const r of activeOrderRmas) {
          if (Array.isArray(r.lines) && r.lines.length > 0) {
            for (const rl of r.lines) {
              if (rl.sku === rawLine.sku) prevReturned += Number(rl.requestedQty || 0)
            }
          } else if (r.sku === rawLine.sku) {
            prevReturned += Number(r.returnQty || 0)
          }
        }

        if (prevReturned + qty > soldQty + 1e-6) {
          throw new LogisticsDomainError(
            "EXCEEDS_SOLD_QUANTITY",
            `Satılandan fazla iade açılamaz (${rawLine.sku}). Satılan: ${soldQty}, Önceki İade: ${prevReturned}, İstenen: ${qty}.`,
            400,
            { sku: rawLine.sku, soldQty, previousReturnedQty: prevReturned, requestedQty: qty }
          )
        }
      }
    }

    const pol = await resolveReturnPolicyForItem(inv, policies)
    if (pol.returnWindowDays > maxWindowDays) maxWindowDays = pol.returnWindowDays
    if (pol.warrantyMonths > maxWarrantyMonths) maxWarrantyMonths = pol.warrantyMonths

    const supId = input.supplierId ?? (await resolveDefaultSupplierIdForItem(inv?.id))

    totalQty += qty
    totalRefundAmount += qty * orderUnitPrice

    linePayloads.push({
      itemId: inv?.id ?? null,
      orderLineId: matchedOrderLineId,
      sku: inv?.sku || rawLine.sku,
      itemName: rawLine.itemName || inv?.name || rawLine.sku,
      soldQty,
      requestedQty: qty,
      receivedQty: 0,
      damagedQty: 0,
      missingQty: 0,
      unitPrice: Number(orderUnitPrice.toFixed(2)),
      vatRate: Number(inv?.taxRate ?? 20),
      lotNumber: rawLine.lotNumber ?? null,
      serialNumber: rawLine.serialNumber ?? null,
      supplierId: supId,
      notes: rawLine.notes ?? null,
    })
  }

  const deliveredAt =
    input.deliveredAt ||
    (orderInfo.found ? orderInfo.deliveredAt : null) ||
    new Date().toISOString()

  const elig = evaluateReturnEligibility({
    deliveredAt,
    policyReturnDays: maxWindowDays,
    warrantyMonths: maxWarrantyMonths,
  })

  if (!elig.isWithinReturnWindow && !elig.isWithinWarranty && !input.deadlineOverrideApproved) {
    throw new LogisticsDomainError(
      "RETURN_WINDOW_EXPIRED",
      `${elig.effectiveWindowDays} günlük yasal iade süresi dolmuştur (Son tarih: ${new Date(elig.returnDeadlineIso).toLocaleDateString("tr-TR")}). İstisna onayı olmadan açılamaz.`,
      400,
      { returnDeadlineAt: elig.returnDeadlineIso, effectiveWindowDays: elig.effectiveWindowDays }
    )
  }

  if (input.deadlineOverrideApproved && !input.deadlineOverrideReason?.trim()) {
    throw new LogisticsDomainError(
      "OVERRIDE_REASON_REQUIRED",
      "Süre dışı iade istisna onayı için gerekçe girilmelidir.",
      400
    )
  }

  const warehouseId = await resolveDefaultWarehouseId(input.targetWarehouseId)
  const qBin = await resolveQuarantineOrReturnBin(warehouseId)
  const rmaCount = await (prisma as any).returnRmaRecord.count().catch(() => 0)
  const rmaNumber = `RMA-2026-${String(rmaCount + 101).padStart(3, "0")}-${Math.floor(10 + Math.random() * 89)}`
  const resolvedSupplierId =
    input.supplierId || linePayloads.find((l) => l.supplierId)?.supplierId || null

  const firstLine = linePayloads[0]
  const humanReason =
    input.reasonNote?.trim() ||
    `${RMA_REASON_LABELS[reasonCode]}${input.lines.length > 1 ? ` (+${input.lines.length - 1} kalem)` : ""}`

  const created = await (prisma as any).returnRmaRecord.create({
    data: {
      rmaNumber,
      orderNumber: orderInfo.found ? orderInfo.orderNumber : input.orderNumber.trim(),
      channelCode:
        input.channelCode ||
        (orderInfo.found ? orderInfo.channelCode : "SUNUM-B2B"),
      customerName:
        input.customerName ||
        (orderInfo.found ? orderInfo.customerName : "Kurumsal Müşteri"),
      sku: firstLine.sku,
      itemName: firstLine.itemName,
      returnQty: Number(totalQty.toFixed(4)),
      returnReason: humanReason,
      qcInspectionResult: "PENDING_INSPECTION",
      targetWarehouseId: warehouseId,
      targetBinCode: qBin?.code || "RMA-01-01",
      refundAmount: Number(totalRefundAmount.toFixed(2)),
      refundStatus: "PENDING",
      returnTrackingNo: input.returnTrackingNo || null,
      returnCarrierCode: input.returnCarrierCode || "YURTICI",
      labelCode: generateRmaBarcodeValue(rmaNumber),
      rmaStatus: "TALEP",
      reasonCode,
      reasonNote: input.reasonNote ?? null,
      orderSourceType: orderInfo.found ? orderInfo.orderSourceType : (input.orderSourceType || "OMNICHANNEL"),
      originalOrderId: orderInfo.found ? orderInfo.orderId : (input.originalOrderId ?? null),
      invoiceDocId: input.invoiceDocId || (orderInfo.found ? orderInfo.invoiceDocId : null),
      invoiceNo: input.invoiceNo || (orderInfo.found ? orderInfo.invoiceNo : null),
      deliveredAt: new Date(elig.deliveredAtIso),
      returnWindowDays: elig.effectiveWindowDays,
      returnDeadlineAt: new Date(elig.returnDeadlineIso),
      warrantyExpiresAt: elig.warrantyExpiresIso ? new Date(elig.warrantyExpiresIso) : null,
      isWithinReturnWindow: elig.isWithinReturnWindow,
      isWithinWarranty: elig.isWithinWarranty,
      deadlineOverrideApproved: Boolean(input.deadlineOverrideApproved),
      deadlineOverrideBy: input.deadlineOverrideApproved ? actorName : null,
      deadlineOverrideReason: input.deadlineOverrideReason ?? null,
      supplierId: resolvedSupplierId,
      poId: input.poId ?? null,
      idempotencyKey: input.idempotencyKey ?? null,
      externalChannelRef: input.externalChannelRef ?? null,
      lines: {
        create: linePayloads,
      },
      events: {
        create: [
          {
            eventType: "RMA_CREATED",
            fromStatus: null,
            toStatus: "TALEP",
            actorUserId: actorUserId ?? null,
            actorName,
            method: input.externalChannelRef ? "WEBHOOK" : "WEB",
            note: `${rmaNumber} oluşturuldu (${RMA_REASON_LABELS[reasonCode]}).${input.deadlineOverrideApproved ? ` Süre istisna onayı: ${input.deadlineOverrideReason}` : ""}`,
          },
        ],
      },
    },
    include: { lines: true, events: true, creditNotes: true },
  })

  await logLogisticsAudit({
    userId: actorUserId || "system",
    action: "CREATE",
    resource: "lojistik_iade",
    resourceId: created.id,
    moduleKey: "lojistik_iade",
    metadata: { rmaNumber: created.rmaNumber, orderNumber: created.orderNumber, reasonCode, totalQty },
  })

  return { duplicate: false, rma: created }
}

export async function transitionRmaStatus(params: {
  rmaId: string
  toStatus: RmaWorkflowStatus
  note?: string
  returnTrackingNo?: string
  returnCarrierCode?: string
  actorUserId?: string
  actorName?: string
  syncChannel?: boolean
}) {
  const rma = await (prisma as any).returnRmaRecord.findUnique({
    where: { id: params.rmaId },
    include: { lines: true },
  })
  if (!rma) {
    throw new LogisticsDomainError("RMA_NOT_FOUND", "İade (RMA) kaydı bulunamadı.", 404)
  }

  const fromStatus = normalizeLegacyRmaStatus(rma)
  if (!canTransitionRmaStatus(fromStatus, params.toStatus)) {
    throw new LogisticsDomainError(
      "INVALID_RMA_TRANSITION",
      `RMA durumu '${fromStatus}' aşamasından '${params.toStatus}' aşamasına geçirilemez.`,
      400
    )
  }

  if (params.toStatus === "REDDEDILDI" && !params.note?.trim()) {
    throw new LogisticsDomainError("REJECTION_REASON_REQUIRED", "Red kararı için açıklama zorunludur.", 400)
  }

  const now = new Date()
  const patch: Record<string, any> = {
    rmaStatus: params.toStatus,
    ...(params.returnTrackingNo ? { returnTrackingNo: params.returnTrackingNo } : {}),
    ...(params.returnCarrierCode ? { returnCarrierCode: params.returnCarrierCode } : {}),
  }

  if (params.toStatus === "INCELEMEDE") patch.inspectedAt = now
  if (params.toStatus === "KAPANDI") {
    patch.closedAt = now
    patch.cycleHours = Number(
      ((now.getTime() - new Date(rma.createdAt).getTime()) / 3_600_000).toFixed(2)
    )
  }

  const updated = await (prisma as any).returnRmaRecord.update({
    where: { id: rma.id },
    data: patch,
    include: { lines: true, events: true, creditNotes: true },
  })

  await recordRmaEvent({
    rmaId: rma.id,
    eventType: "STATUS_CHANGED",
    fromStatus,
    toStatus: params.toStatus,
    actorUserId: params.actorUserId,
    actorName: params.actorName || "Yetkili",
    note: params.note || `Durum güncellendi: ${fromStatus} -> ${params.toStatus}`,
  })

  let webhookSync: any = null
  if (params.syncChannel !== false && rma.channelCode && rma.channelCode !== "ERP") {
    const providers = createLogisticsProviders()
    webhookSync = await providers.returnWebhook
      .pushReturnStatus(rma.rmaNumber, rma.channelCode, params.toStatus)
      .catch((err: any) => ({ synced: false, note: err?.message || "Hata" }))

    await (prisma as any).lojistikRmaWebhookLog
      .create({
        data: {
          direction: "OUTBOUND",
          channelCode: rma.channelCode,
          eventType: "RMA_STATUS_PUSH",
          externalRef: rma.externalChannelRef ?? null,
          rmaId: rma.id,
          rmaNumber: rma.rmaNumber,
          signatureVerified: true,
          status: webhookSync?.synced ? "ACCEPTED" : "FAILED",
          payloadJson: JSON.stringify({ rmaNumber: rma.rmaNumber, status: params.toStatus }),
          responseNote: webhookSync?.note || null,
        },
      })
      .catch(() => null)
  }

  await logLogisticsAudit({
    userId: params.actorUserId || "system",
    action: "UPDATE",
    resource: "lojistik_iade",
    resourceId: rma.id,
    moduleKey: "lojistik_iade",
    metadata: { fromStatus, toStatus: params.toStatus },
  })

  return { rma: updated, webhookSync }
}

export async function generateRmaLabelPayload(rmaId: string) {
  const rma = await (prisma as any).returnRmaRecord.findUnique({
    where: { id: rmaId },
    include: { lines: true },
  })
  if (!rma) {
    throw new LogisticsDomainError("RMA_NOT_FOUND", "İade (RMA) kaydı bulunamadı.", 404)
  }

  const whId = await resolveDefaultWarehouseId(rma.targetWarehouseId)
  const warehouse = await prisma.warehouse.findUnique({ where: { id: whId } }).catch(() => null)
  const barcodeValue = rma.labelCode || generateRmaBarcodeValue(rma.rmaNumber)
  const trackingNo = rma.returnTrackingNo || `RTN-${rma.rmaNumber.replace(/[^A-Z0-9]/gi, "")}`

  const qrText = JSON.stringify({
    type: "SUNUM_RMA_LABEL",
    rmaNumber: rma.rmaNumber,
    orderNumber: rma.orderNumber,
    trackingNo,
    sku: rma.sku,
    qty: rma.returnQty,
    warehouseCode: warehouse?.code || "DEP-MRK-01",
  })
  const qrSvg = await QRCode.toString(qrText, {
    type: "svg",
    margin: 1,
    width: 148,
    color: { dark: "#090d0b", light: "#ffffff" },
  })

  return {
    rmaId: rma.id,
    rmaNumber: rma.rmaNumber,
    orderNumber: rma.orderNumber,
    invoiceNo: rma.invoiceNo || null,
    channelCode: rma.channelCode,
    customerName: rma.customerName,
    carrierCode: rma.returnCarrierCode || "YURTICI",
    trackingNo,
    barcodeValue,
    qrSvg,
    reasonCode: rma.reasonCode || "CAYMA_HAKKI",
    reasonLabel:
      RMA_REASON_LABELS[(rma.reasonCode || "CAYMA_HAKKI") as RmaReasonCode] ||
      rma.returnReason,
    returnDeadlineAt: rma.returnDeadlineAt || null,
    targetWarehouse: {
      id: whId,
      code: warehouse?.code || "DEP-MRK-01",
      name: warehouse?.name || "Merkez Soğuk Hava & Lojistik Deposu",
      address: warehouse?.address || "Tuzla Lojistik Merkezi / İstanbul",
    },
    targetBinCode: rma.targetBinCode || "RMA-01-01",
    lines:
      Array.isArray(rma.lines) && rma.lines.length > 0
        ? rma.lines
        : [
            {
              sku: rma.sku,
              itemName: rma.itemName,
              requestedQty: rma.returnQty,
            },
          ],
    generatedAt: new Date().toISOString(),
  }
}

export async function receiveRmaIntoQuarantine(params: {
  rmaId?: string
  rmaNumber?: string
  trackingNo?: string
  warehouseId?: string
  targetBinCode?: string
  method?: "WEB" | "HANDHELD_CAMERA" | "HANDHELD_USB" | "OFFLINE_SYNC"
  deviceId?: string | null
  idempotencyKey?: string | null
  note?: string
  actorUserId?: string
  actorName?: string
  receivedLines?: Array<{
    lineId?: string
    sku?: string
    receivedQty: number
    damagedQty?: number
    lotNumber?: string | null
  }>
}) {
  let rma: any = null
  if (params.rmaId) {
    rma = await (prisma as any).returnRmaRecord.findUnique({
      where: { id: params.rmaId },
      include: { lines: true },
    })
  } else if (params.rmaNumber) {
    rma = await (prisma as any).returnRmaRecord.findFirst({
      where: { rmaNumber: params.rmaNumber.trim() },
      include: { lines: true },
    })
  } else if (params.trackingNo) {
    rma = await (prisma as any).returnRmaRecord.findFirst({
      where: { returnTrackingNo: params.trackingNo.trim() },
      include: { lines: true },
    })
  }

  if (!rma) {
    throw new LogisticsDomainError("RMA_NOT_FOUND", "İade belgesi veya takip kodu bulunamadı.", 404)
  }

  const currentStatus = normalizeLegacyRmaStatus(rma)
  if (["REDDEDILDI", "IPTAL", "KAPANDI"].includes(currentStatus)) {
    throw new LogisticsDomainError(
      "RMA_CLOSED_OR_CANCELLED",
      `Bu RMA (${rma.rmaNumber}) durumu (${currentStatus}) mal kabule uygun değildir.`,
      400
    )
  }

  if (params.idempotencyKey) {
    const prevMov = await prisma.stockMovement
      .findFirst({ where: { idempotencyKey: `${params.idempotencyKey}-L0` } })
      .catch(() => null)
    if (prevMov) {
      return { duplicate: true, rma, movements: [] }
    }
  }

  const whId = await resolveDefaultWarehouseId(params.warehouseId || rma.targetWarehouseId)
  const qBin = await resolveQuarantineOrReturnBin(whId, params.targetBinCode)
  const items = await prisma.inventoryItem.findMany()
  const itemById = new Map(items.map((i: any) => [i.id, i]))
  const itemBySku = new Map(items.map((i: any) => [i.sku, i]))

  const rmaLines: any[] =
    Array.isArray(rma.lines) && rma.lines.length > 0
      ? rma.lines
      : [
          {
            id: null,
            itemId: itemBySku.get(rma.sku)?.id ?? null,
            sku: rma.sku,
            itemName: rma.itemName,
            requestedQty: Number(rma.returnQty || 0),
          },
        ]

  const movements: any[] = []
  let totalReceived = 0
  let totalDamaged = 0
  let totalMissing = 0

  for (let idx = 0; idx < rmaLines.length; idx++) {
    const line = rmaLines[idx]
    const override = params.receivedLines?.find(
      (rl) => (line.id && rl.lineId === line.id) || rl.sku === line.sku
    )
    const reqQty = Number(line.requestedQty || rma.returnQty || 0)
    const recGoodQty = override ? Math.max(0, Number(override.receivedQty || 0)) : reqQty
    const dmgQty = override ? Math.max(0, Number(override.damagedQty || 0)) : 0
    const physicalQty = recGoodQty + dmgQty
    const missingQty = Math.max(0, Number((reqQty - physicalQty).toFixed(4)))

    totalReceived += recGoodQty
    totalDamaged += dmgQty
    totalMissing += missingQty

    if (line.id) {
      await (prisma as any).lojistikRmaLine.update({
        where: { id: line.id },
        data: {
          receivedQty: recGoodQty,
          damagedQty: dmgQty,
          missingQty,
          targetBinCode: qBin?.code || rma.targetBinCode || "Q-01-01",
          ...(override?.lotNumber ? { lotNumber: override.lotNumber } : {}),
        },
      })
    }

    const inv = (line.itemId ? itemById.get(line.itemId) : null) || itemBySku.get(line.sku)
    if (inv && physicalQty > 0) {
      const ledgerRes = await recordStockLedgerEntry({
        itemId: inv.id,
        warehouseId: whId,
        movementType: "RMA_RETURN",
        quantityDelta: physicalQty,
        quarantineDelta: physicalQty,
        allowBlockedBin: true,
        storageBinId: qBin?.id ?? null,
        toBinCode: qBin?.code ?? "Q-01-01",
        lotNumber: override?.lotNumber || line.lotNumber || null,
        referenceDocNo: rma.rmaNumber,
        performedBy: params.actorName || "Depo Operatörü",
        idempotencyKey: params.idempotencyKey ? `${params.idempotencyKey}-L${idx}` : null,
        deviceId: params.deviceId ?? null,
        method: params.method || "WEB",
        traceEventType: "RMA_QUARANTINE_RECEIPT",
        notes: `İade Mal Kabul (${rma.rmaNumber}) -> Karantina Rafı (${qBin?.code || "Q-01-01"})${missingQty > 0 ? ` · Eksik: ${missingQty}` : ""}`,
      })
      movements.push(ledgerRes.movement)
    }
  }

  const now = new Date()
  const updated = await (prisma as any).returnRmaRecord.update({
    where: { id: rma.id },
    data: {
      rmaStatus: "TESLIM_ALINDI",
      qcInspectionResult: "PENDING_INSPECTION",
      targetWarehouseId: whId,
      targetBinCode: qBin?.code || "Q-01-01",
      receivedWarehouseId: whId,
      receivedBinCode: qBin?.code || "Q-01-01",
      receivedAt: now,
      receivedBy: params.actorName || "Depo Operatörü",
    },
    include: { lines: true, events: true, creditNotes: true },
  })

  await recordRmaEvent({
    rmaId: rma.id,
    eventType: "RMA_PHYSICAL_RECEIPT",
    fromStatus: currentStatus,
    toStatus: "TESLIM_ALINDI",
    actorUserId: params.actorUserId,
    actorName: params.actorName || "Depo Operatörü",
    method: params.method || "WEB",
    binCode: qBin?.code || "Q-01-01",
    qtyDelta: totalReceived + totalDamaged,
    note:
      params.note ||
      `Mal kabul karantinaya (${qBin?.code || "Q-01-01"}) alındı. Sağlam: ${totalReceived}, Hasarlı: ${totalDamaged}, Eksik: ${totalMissing}.`,
    metadata: { totalReceived, totalDamaged, totalMissing, deviceId: params.deviceId ?? null },
  })

  await logLogisticsAudit({
    userId: params.actorUserId || "system",
    action: "UPDATE",
    resource: "lojistik_iade",
    resourceId: rma.id,
    moduleKey: "lojistik_iade",
    metadata: { event: "RMA_PHYSICAL_RECEIPT", totalReceived, totalDamaged, totalMissing, binCode: qBin?.code },
  })

  return { duplicate: false, rma: updated, movements, totalReceived, totalDamaged, totalMissing }
}

export async function decideRmaInspection(params: {
  rmaId: string
  decision: RmaQualityDecision
  targetBinCode?: string
  warehouseId?: string
  newExpiryDate?: string | null
  inspectorNote?: string
  severity?: "MINOR" | "MAJOR" | "CRITICAL"
  defectCategory?: string
  supplierId?: string | null
  actorUserId?: string
  actorName?: string
  allowLegacyPendingBypass?: boolean
}) {
  if (!(RMA_QUALITY_DECISIONS as readonly string[]).includes(params.decision)) {
    throw new LogisticsDomainError("INVALID_QUALITY_DECISION", `Geçersiz kalite kararı: ${params.decision}`, 400)
  }

  const rma = await (prisma as any).returnRmaRecord.findUnique({
    where: { id: params.rmaId },
    include: { lines: true, creditNotes: true },
  })
  if (!rma) {
    throw new LogisticsDomainError("RMA_NOT_FOUND", "İade (RMA) kaydı bulunamadı.", 404)
  }

  const currentStatus = normalizeLegacyRmaStatus(rma)
  if (!["TESLIM_ALINDI", "INCELEMEDE"].includes(currentStatus)) {
    if (!params.allowLegacyPendingBypass) {
      throw new LogisticsDomainError(
        "RECEIPT_REQUIRED_BEFORE_INSPECTION",
        `Kalite inceleme kararı vermeden önce fiziksel mal kabul (${rma.rmaNumber}) yapılmalıdır (Mevcut durum: ${currentStatus}).`,
        400
      )
    }
  }

  const whId = await resolveDefaultWarehouseId(
    params.warehouseId || rma.receivedWarehouseId || rma.targetWarehouseId
  )
  const items = await prisma.inventoryItem.findMany()
  const itemById = new Map(items.map((i: any) => [i.id, i]))
  const itemBySku = new Map(items.map((i: any) => [i.sku, i]))

  const rmaLines: any[] =
    Array.isArray(rma.lines) && rma.lines.length > 0
      ? rma.lines
      : [
          {
            id: null,
            itemId: itemBySku.get(rma.sku)?.id ?? null,
            sku: rma.sku,
            itemName: rma.itemName,
            requestedQty: Number(rma.returnQty || 0),
            receivedQty: Number(rma.returnQty || 0),
            damagedQty: 0,
            unitPrice:
              Number(rma.returnQty || 1) > 0
                ? Number(rma.refundAmount || 0) / Number(rma.returnQty || 1)
                : 0,
            supplierId: rma.supplierId ?? null,
          },
        ]

  const primaryLine = rmaLines[0]
  const primaryItem =
    (primaryLine.itemId ? itemById.get(primaryLine.itemId) : null) ||
    itemBySku.get(primaryLine.sku)

  let resolvedSupplierId =
    params.supplierId ||
    rma.supplierId ||
    primaryLine.supplierId ||
    (await resolveDefaultSupplierIdForItem(primaryItem?.id))

  if (params.decision === "RETURN_TO_VENDOR" && !resolvedSupplierId) {
    throw new LogisticsDomainError(
      "SUPPLIER_REQUIRED_FOR_RTV",
      "Tedarikçiye iade (RTV) kararı için ürün veya RMA kaydında tedarikçi belirtilmelidir.",
      400
    )
  }

  const supplierRec = resolvedSupplierId
    ? await prisma.supplier.findUnique({ where: { id: resolvedSupplierId } }).catch(() => null)
    : null

  // FEFO / SKT kontrolü: Süresi geçmiş lot yeniden satışa alınamaz!
  if (params.decision === "RESTOCK_TO_BIN") {
    for (const line of rmaLines) {
      if (!line.lotNumber) continue
      const lotRec = await prisma.lotSerialRecord
        .findFirst({ where: { lotNumber: line.lotNumber } })
        .catch(() => null)
      const effectiveExp = params.newExpiryDate || lotRec?.expiryDate
      if (effectiveExp && new Date(effectiveExp).getTime() < Date.now()) {
        throw new LogisticsDomainError(
          "EXPIRED_LOT_CANNOT_RESTOCK",
          `Lot (${line.lotNumber}) son kullanma tarihi geçtiği için yeniden satışa alınamaz; Hurda veya Tedarikçiye İade seçilmelidir.`,
          400
        )
      }
      if (lotRec && (params.newExpiryDate || lotRec.status === "QUARANTINE")) {
        await prisma.lotSerialRecord.update({
          where: { id: lotRec.id },
          data: {
            status: "ACTIVE",
            ...(params.newExpiryDate ? { expiryDate: new Date(params.newExpiryDate) } : {}),
          },
        })
      }
    }
  }

  const totalPhysicalQty = Math.max(
    1,
    rmaLines.reduce(
      (s, l) => s + Number((Number(l.receivedQty || 0) + Number(l.damagedQty || 0)) || l.requestedQty || 0),
      0
    )
  )

  // Mevcut Üretim/Kalite modülüne gerçek muayene kaydı aç
  let inspection: any = null
  if (primaryItem) {
    inspection = await createQualityInspection(
      {
        inspectionType: "RETURN_RMA",
        skipAutoStockBlock: true,
        itemId: primaryItem.id,
        supplierId: resolvedSupplierId,
        supplierName: supplierRec?.name ?? null,
        purchaseOrderId: rma.poId ?? null,
        goodsReceiptId: rma.rmaNumber,
        lotNumber: primaryLine.lotNumber ?? null,
        batchQuantity: totalPhysicalQty,
        allowConditionalAcceptance: params.decision === "REPAIR_REFURBISH",
        decisionNotes:
          params.inspectorNote ||
          `${rma.rmaNumber} İade Kalite Kararı: ${params.decision}`,
        measurements: [
          {
            characteristicName: "İade Fiziki / Fonksiyonel Uygunluk",
            characteristicType: "ATTRIBUTE",
            isAttributePassed: params.decision === "RESTOCK_TO_BIN",
            defectType: params.decision !== "RESTOCK_TO_BIN" ? rma.reasonCode : null,
            isCritical: params.decision === "SCRAP",
            notes: params.inspectorNote ?? rma.returnReason,
          },
        ],
      },
      params.actorUserId
    ).catch(() => null)
  }

  // Uygunsuzluk (NCR) kaydı: Hurda, Tedarikçiye İade veya Tamir durumlarında mevcut Kalite NCR modülüne yaz
  let ncr: any = null
  let totalCostImpact = 0
  let totalRecoveredValue = 0

  const quarantineBin = await resolveQuarantineOrReturnBin(whId, rma.receivedBinCode || rma.targetBinCode)
  const sellableBin =
    params.decision === "RESTOCK_TO_BIN"
      ? await resolveSellableRestockBin(whId, params.targetBinCode)
      : null

  for (let idx = 0; idx < rmaLines.length; idx++) {
    const line = rmaLines[idx]
    const inv = (line.itemId ? itemById.get(line.itemId) : null) || itemBySku.get(line.sku)
    const linePhysical = Number(
      (Number(line.receivedQty || 0) + Number(line.damagedQty || 0)) ||
        line.requestedQty ||
        rma.returnQty ||
        0
    )
    const unitCost = Number(inv?.currentAvgCost || inv?.standardCost || line.unitPrice || 0)

    if (inv && linePhysical > 0) {
      // Karantina rafında tutulmuş stok bakiyesi varsa karantinadan düş
      const qBalance = quarantineBin
        ? await prisma.stockBalance
            .findFirst({ where: { itemId: inv.id, warehouseId: whId, storageBinId: quarantineBin.id } })
            .catch(() => null)
        : null
      const qtyInQuarantine = Math.min(
        linePhysical,
        Math.max(0, Number(qBalance?.onHandQty || 0))
      )

      if (params.decision === "RESTOCK_TO_BIN") {
        // Karantinadan çıkarıp satılabilir rafa yerleştir
        if (qtyInQuarantine > 0 && quarantineBin) {
          await recordStockLedgerEntry({
            itemId: inv.id,
            warehouseId: whId,
            movementType: "TRANSFER_OUT",
            quantityDelta: qtyInQuarantine,
            quarantineDelta: -qtyInQuarantine,
            allowBlockedBin: true,
            storageBinId: quarantineBin.id,
            fromBinCode: quarantineBin.code,
            toBinCode: sellableBin?.code ?? "A-01-01",
            lotNumber: line.lotNumber ?? null,
            referenceDocNo: rma.rmaNumber,
            performedBy: params.actorName || "Kalite Ekibi",
            traceEventType: "RMA_RELEASE_FROM_QUARANTINE",
            notes: `İade Muayene Geçti: Karantinadan satılabilir rafa transfer (${rma.rmaNumber})`,
          })
        }
        await recordStockLedgerEntry({
          itemId: inv.id,
          warehouseId: whId,
          movementType: qtyInQuarantine > 0 ? "TRANSFER_IN" : "RMA_RETURN",
          quantityDelta: linePhysical,
          storageBinId: sellableBin?.id ?? null,
          fromBinCode: quarantineBin?.code ?? null,
          toBinCode: sellableBin?.code ?? "A-01-01",
          lotNumber: line.lotNumber ?? null,
          expiryDate: params.newExpiryDate ?? null,
          referenceDocNo: rma.rmaNumber,
          performedBy: params.actorName || "Kalite Ekibi",
          traceEventType: "RMA_RESTOCK_APPROVED",
          notes: `İade Stoğa Alındı (${rma.rmaNumber}) -> ${sellableBin?.code || "A-01-01"}`,
        })
        totalRecoveredValue += linePhysical * Number(line.unitPrice || unitCost)
      } else if (params.decision === "REPAIR_REFURBISH") {
        // Tamir / yenileme: fiziki olarak RMA/Karantina rafında kalır, karar güncellenir
        totalRecoveredValue += linePhysical * unitCost * 0.7
        totalCostImpact += linePhysical * unitCost * 0.3
      } else if (params.decision === "RETURN_TO_VENDOR" || params.decision === "SCRAP") {
        if (qtyInQuarantine > 0 && quarantineBin) {
          await recordStockLedgerEntry({
            itemId: inv.id,
            warehouseId: whId,
            movementType: "ISSUE",
            quantityDelta: qtyInQuarantine,
            quarantineDelta: -Math.min(qtyInQuarantine, Number(qBalance?.quarantineQty || 0)),
            allowBlockedBin: true,
            storageBinId: quarantineBin.id,
            fromBinCode: quarantineBin.code,
            lotNumber: line.lotNumber ?? null,
            referenceDocNo: rma.rmaNumber,
            performedBy: params.actorName || "Kalite Ekibi",
            traceEventType: params.decision === "SCRAP" ? "RMA_SCRAP_DISPOSAL" : "RMA_RETURN_TO_VENDOR",
            notes:
              params.decision === "SCRAP"
                ? `Hurda / İmha Çıkışı (${rma.rmaNumber})`
                : `Tedarikçiye İade Çıkışı (${rma.rmaNumber} -> ${supplierRec?.name || resolvedSupplierId})`,
          })
        }
        if (params.decision === "SCRAP" && line.lotNumber) {
          await prisma.lotSerialRecord
            .updateMany({ where: { lotNumber: line.lotNumber }, data: { status: "SCRAP" } })
            .catch(() => null)
        }
        totalCostImpact += linePhysical * unitCost
      }
    }

    if (line.id) {
      await (prisma as any).lojistikRmaLine.update({
        where: { id: line.id },
        data: {
          disposition: params.decision,
          targetBinCode: sellableBin?.code ?? quarantineBin?.code ?? rma.targetBinCode,
          inspectionId: inspection?.id ?? null,
          supplierId: resolvedSupplierId ?? line.supplierId ?? null,
        },
      })
    }
  }

  if (params.decision !== "RESTOCK_TO_BIN") {
    ncr = await createQualityNcr(
      {
        inspectionId: inspection?.id ?? null,
        itemId: primaryItem?.id ?? null,
        lotNumber: primaryLine.lotNumber ?? null,
        source: "CUSTOMER_COMPLAINT",
        severity:
          params.severity ||
          (params.decision === "SCRAP"
            ? "CRITICAL"
            : params.decision === "RETURN_TO_VENDOR"
              ? "MAJOR"
              : "MINOR"),
        defectCategory: params.defectCategory || "MATERIAL",
        title: `${rma.rmaNumber} — ${params.decision} Uygunsuzluğu`,
        description:
          params.inspectorNote ||
          `${rma.orderNumber} siparişi iadesi (${rma.returnReason}) kalite muayenesinde ${params.decision} olarak karara bağlandı.`,
        affectedQuantity: totalPhysicalQty,
        costImpact: Number(totalCostImpact.toFixed(2)),
      },
      params.actorUserId
    ).catch(() => null)
  }

  // Faz 3 Tedarikçi Skor Kartına kalite etkisini yansıt
  let updatedScorecard: any = null
  if (resolvedSupplierId) {
    updatedScorecard = await recalculateSupplierScorecard(resolvedSupplierId, "LIVE").catch(() => null)
  }

  const now = new Date()
  const finalBin =
    sellableBin?.code ?? quarantineBin?.code ?? params.targetBinCode ?? rma.targetBinCode
  const legacyQcCode =
    params.decision === "RESTOCK_TO_BIN" ? "RESTOCK_TO_BIN" : "QUARANTINE_REPAIR"

  const updated = await (prisma as any).returnRmaRecord.update({
    where: { id: rma.id },
    data: {
      rmaStatus: "KARARA_BAGLANDI",
      qcInspectionResult: legacyQcCode,
      qualityDecision: params.decision,
      inspectionId: inspection?.id ?? null,
      ncrId: ncr?.id ?? null,
      supplierId: resolvedSupplierId ?? null,
      targetWarehouseId: whId,
      targetBinCode: finalBin,
      inspectedAt: rma.inspectedAt || now,
      decidedAt: now,
      estimatedCostTry: Number(totalCostImpact.toFixed(2)),
      recoveredValueTry: Number(totalRecoveredValue.toFixed(2)),
      cycleHours: Number(
        ((now.getTime() - new Date(rma.createdAt).getTime()) / 3_600_000).toFixed(2)
      ),
    },
    include: { lines: true, events: true, creditNotes: true },
  })

  await recordRmaEvent({
    rmaId: rma.id,
    eventType: "RMA_QUALITY_DECISION",
    fromStatus: currentStatus,
    toStatus: "KARARA_BAGLANDI",
    actorUserId: params.actorUserId,
    actorName: params.actorName || "Kalite Ekibi",
    binCode: finalBin,
    note: `Kalite kararı: ${params.decision}${inspection ? ` (${inspection.inspectionNumber})` : ""}${ncr ? ` / ${ncr.ncrNumber}` : ""}`,
    metadata: {
      decision: params.decision,
      inspectionId: inspection?.id ?? null,
      ncrId: ncr?.id ?? null,
      supplierId: resolvedSupplierId,
      totalCostImpact,
      totalRecoveredValue,
    },
  })

  await logLogisticsAudit({
    userId: params.actorUserId || "system",
    action: "APPROVE",
    resource: "lojistik_iade",
    resourceId: rma.id,
    moduleKey: "lojistik_iade",
    supplierId: resolvedSupplierId,
    metadata: {
      decision: params.decision,
      inspectionId: inspection?.id ?? null,
      ncrId: ncr?.id ?? null,
      supplierId: resolvedSupplierId,
    },
  })

  return { rma: updated, inspection, ncr, updatedScorecard }
}
