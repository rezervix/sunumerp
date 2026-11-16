/**
 * Lojistik Faz 3 — RFQ (Teklif İsteme), Teklif Karşılaştırma ve Çok Kademeli PO Servisi
 *
 * - Çok kalemli RFQ oluşturma, kara liste / askıdaki tedarikçi koruması
 * - ERP içi veya Tedarikçi Portalından teklif gönderme (birim fiyat, nakliye, vade, teslim süresi)
 * - Yan yana teklif matrisi (en düşük TCO, en hızlı termin, en yüksek bileşik öneri skoru)
 * - Kazanan teklifi tek tıkla PO'ya dönüştürme
 * - Çok kademeli PO onay akışı (Tutar/Aciliyet kuralına göre 1/2/3 adım) + Sevk + Tedarikçi Onay/Kırmızı Bayrak
 * - EOQ/ROP önerisinden tek tıkla PO oluşturma
 */

import { prisma } from "@/lib/db"
import { LogisticsDomainError } from "@/lib/logistics/security"
import { resolvePoApprovalPlan } from "./constantsAndHelpers"

function parseJsonArray<T = string>(raw: string | null | undefined): T[] {
  if (!raw) return []
  try {
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

export async function listRfqsEnriched(filter?: {
  status?: string
  supplierScopeId?: string | null
}) {
  const [rfqs, warehouses, suppliers] = await Promise.all([
    prisma.lojistikRfq.findMany({
      include: { items: true, quotes: { include: { lines: true } } },
      orderBy: { createdAt: "desc" },
    }),
    prisma.warehouse.findMany(),
    prisma.supplier.findMany(),
  ])

  const whMap = new Map(warehouses.map((w: any) => [w.id, w]))
  const supMap = new Map(suppliers.map((s: any) => [s.id, s]))

  let rows = rfqs.map((r: any) => {
    const invitedIds = parseJsonArray<string>(r.invitedSuppliers)
    const invitedNames = invitedIds.map((id) => ({
      supplierId: id,
      code: supMap.get(id)?.code ?? "-",
      name: supMap.get(id)?.name ?? id,
    }))
    const quotes = (r.quotes || []).map((q: any) => ({
      ...q,
      supplierCode: supMap.get(q.supplierId)?.code ?? "-",
      supplierName: supMap.get(q.supplierId)?.name ?? "-",
      supplierScore: supMap.get(q.supplierId)?.scorecardScore ?? null,
    }))

    return {
      ...r,
      warehouseName: whMap.get(r.warehouseId)?.name ?? r.warehouseId,
      invitedSupplierIds: invitedIds,
      invitedSupplierList: invitedNames,
      quotes,
      quoteCount: quotes.length,
      itemCount: (r.items || []).length,
    }
  })

  if (filter?.status && filter.status !== "ALL") {
    rows = rows.filter((r: any) => r.status === filter.status)
  }

  if (filter?.supplierScopeId) {
    const sid = filter.supplierScopeId
    rows = rows
      .filter(
        (r: any) =>
          (r.status === "TEKLIFE_ACIK" || r.status === "DEGERLENDIRMEDE" || r.status === "SONUCLANDI") &&
          (r.invitedSupplierIds.length === 0 || r.invitedSupplierIds.includes(sid))
      )
      .map((r: any) => ({
        ...r,
        // Portal tedarikçisi SADECE kendi gönderdiği teklifi görebilir; rakip teklifleri GÖREMEZ!
        quotes: (r.quotes || []).filter((q: any) => q.supplierId === sid),
        myQuote: (r.quotes || []).find((q: any) => q.supplierId === sid) ?? null,
      }))
  }

  return rows
}

export async function createRfq(
  input: {
    title: string
    warehouseId: string
    dueDate: string
    currency?: string
    invitedSuppliers?: string[]
    notes?: string
    items: Array<{
      itemId: string
      requestedQty: number
      targetUnitPrice?: number
      notes?: string
    }>
  },
  actor: string
) {
  if (!input.title?.trim()) {
    throw new LogisticsDomainError("MISSING_RFQ_TITLE", "RFQ başlığı zorunludur.", 400)
  }
  if (!input.items || input.items.length === 0) {
    throw new LogisticsDomainError("EMPTY_RFQ_ITEMS", "RFQ için en az bir stok kalemi seçilmelidir.", 400)
  }

  const invitedIds = Array.from(new Set((input.invitedSuppliers || []).filter(Boolean)))
  if (invitedIds.length > 0) {
    const sups = await prisma.supplier.findMany()
    const supMap = new Map(sups.map((s: any) => [s.id, s]))
    for (const sid of invitedIds) {
      const sup = supMap.get(sid)
      if (!sup) {
        throw new LogisticsDomainError("SUPPLIER_NOT_FOUND", `Davet edilen tedarikçi bulunamadı (${sid}).`, 404)
      }
      if (sup.approvalStatus === "KARALISTE" || !sup.isActive) {
        throw new LogisticsDomainError(
          "BLOCKED_SUPPLIER_INVITE",
          `${sup.name} kara listede/pasif olduğu için teklife davet edilemez.`,
          400
        )
      }
    }
  }

  const allItems = await prisma.inventoryItem.findMany()
  const itemMap = new Map(allItems.map((i: any) => [i.id, i]))
  const rfqItemsData: any[] = []

  for (const row of input.items) {
    const item = itemMap.get(row.itemId)
    if (!item) {
      throw new LogisticsDomainError("ITEM_NOT_FOUND", `Stok kalemi bulunamadı (${row.itemId}).`, 404)
    }
    const qty = Math.max(1, Number(row.requestedQty || 0))
    rfqItemsData.push({
      itemId: item.id,
      sku: item.sku,
      itemName: item.name,
      requestedQty: qty,
      unit: item.baseUnit || "Adet",
      targetUnitPrice: row.targetUnitPrice ? Number(row.targetUnitPrice) : Number(item.standardCost || 0),
      notes: row.notes?.trim() || null,
    })
  }

  const existingCount = (await prisma.lojistikRfq.findMany()).length
  const rfqNumber = `RFQ-${new Date().getFullYear()}-${String(existingCount + 101).padStart(4, "0")}`

  return prisma.lojistikRfq.create({
    data: {
      rfqNumber,
      title: input.title.trim(),
      warehouseId: input.warehouseId || "wh-merkez-01",
      status: "TEKLIFE_ACIK",
      dueDate: new Date(input.dueDate || Date.now() + 5 * 86_400_000),
      currency: input.currency || "TRY",
      invitedSuppliers: JSON.stringify(invitedIds),
      notes: input.notes?.trim() || null,
      createdBy: actor,
      items: { create: rfqItemsData },
    },
    include: { items: true, quotes: true },
  })
}

export async function submitRfqQuote(
  input: {
    rfqId: string
    supplierId: string
    leadTimeDays: number
    paymentTerms?: string
    shippingCost?: number
    validityDate?: string | null
    notes?: string
    lines: Array<{
      rfqItemId: string
      unitPrice: number
      offeredQty?: number
      leadTimeDays?: number
      notes?: string
    }>
  },
  actor: string,
  submittedVia: "ERP" | "PORTAL" = "ERP"
) {
  const [rfq, supplier] = await Promise.all([
    prisma.lojistikRfq.findUnique({
      where: { id: input.rfqId },
      include: { items: true },
    }),
    prisma.supplier.findUnique({ where: { id: input.supplierId } }),
  ])

  if (!rfq) throw new LogisticsDomainError("RFQ_NOT_FOUND", "RFQ kaydı bulunamadı.", 404)
  if (rfq.status === "SONUCLANDI" || rfq.status === "IPTAL") {
    throw new LogisticsDomainError("RFQ_CLOSED", `Bu RFQ (${rfq.rfqNumber}) teklife kapatılmıştır.`, 400)
  }
  if (!supplier) throw new LogisticsDomainError("SUPPLIER_NOT_FOUND", "Tedarikçi bulunamadı.", 404)
  if (supplier.approvalStatus === "KARALISTE" || !supplier.isActive) {
    throw new LogisticsDomainError(
      "SUPPLIER_BLACKLISTED",
      `${supplier.name} kara listede/pasif olduğundan teklif veremez.`,
      400
    )
  }

  const invitedIds = parseJsonArray<string>(rfq.invitedSuppliers)
  if (submittedVia === "PORTAL" && invitedIds.length > 0 && !invitedIds.includes(supplier.id)) {
    throw new LogisticsDomainError(
      "FORBIDDEN_SUPPLIER_SCOPE",
      "Bu RFQ için davetli tedarikçiler arasında değilsiniz.",
      403
    )
  }

  const rfqItemMap = new Map((rfq.items || []).map((i: any) => [i.id, i]))
  if (!input.lines || input.lines.length === 0) {
    throw new LogisticsDomainError("EMPTY_QUOTE_LINES", "En az bir teklif satırı girilmelidir.", 400)
  }

  const quoteLinesData: any[] = []
  let totalQuotedAmount = 0

  for (const l of input.lines) {
    const rItem: any = rfqItemMap.get(l.rfqItemId)
    if (!rItem) {
      throw new LogisticsDomainError("RFQ_ITEM_NOT_FOUND", `RFQ kalemi bulunamadı (${l.rfqItemId}).`, 400)
    }
    const unitPrice = Math.max(0.01, Number(l.unitPrice || 0))
    const offeredQty = Math.max(1, Number(l.offeredQty ?? rItem.requestedQty))
    const lineTotal = Number((unitPrice * offeredQty).toFixed(2))
    totalQuotedAmount += lineTotal
    quoteLinesData.push({
      rfqItemId: rItem.id,
      itemId: rItem.itemId,
      unitPrice,
      offeredQty,
      leadTimeDays: l.leadTimeDays ? Number(l.leadTimeDays) : Number(input.leadTimeDays || supplier.leadTimeDays || 3),
      lineTotal,
      notes: l.notes?.trim() || null,
    })
  }

  totalQuotedAmount = Number(totalQuotedAmount.toFixed(2))
  const shippingCost = Math.max(0, Number(input.shippingCost || 0))
  const tcoTotal = Number((totalQuotedAmount + shippingCost).toFixed(2))
  const leadTimeDays = Math.max(1, Number(input.leadTimeDays || supplier.leadTimeDays || 3))

  const existing = await prisma.lojistikRfqQuote.findFirst({
    where: { rfqId: rfq.id, supplierId: supplier.id },
  })

  let savedQuote: any
  if (existing) {
    await prisma.lojistikRfqQuoteLine.deleteMany({ where: { quoteId: existing.id } })
    savedQuote = await prisma.lojistikRfqQuote.update({
      where: { id: existing.id },
      data: {
        status: "TEKLIF_VERILDI",
        leadTimeDays,
        validityDate: input.validityDate ? new Date(input.validityDate) : new Date(Date.now() + 14 * 86_400_000),
        paymentTerms: input.paymentTerms?.trim() || supplier.paymentTermsLabel || "30 Gün Vadeli",
        shippingCost,
        totalQuotedAmount,
        tcoTotal,
        submittedBy: actor,
        submittedVia,
        notes: input.notes?.trim() || null,
        submittedAt: new Date(),
        lines: { create: quoteLinesData },
      },
      include: { lines: true },
    })
  } else {
    const count = (await prisma.lojistikRfqQuote.findMany()).length
    const quoteNumber = `TKL-${new Date().getFullYear()}-${String(count + 201).padStart(4, "0")}`
    savedQuote = await prisma.lojistikRfqQuote.create({
      data: {
        rfqId: rfq.id,
        supplierId: supplier.id,
        quoteNumber,
        status: "TEKLIF_VERILDI",
        leadTimeDays,
        validityDate: input.validityDate ? new Date(input.validityDate) : new Date(Date.now() + 14 * 86_400_000),
        paymentTerms: input.paymentTerms?.trim() || supplier.paymentTermsLabel || "30 Gün Vadeli",
        shippingCost,
        totalQuotedAmount,
        tcoTotal,
        submittedBy: actor,
        submittedVia,
        notes: input.notes?.trim() || null,
        lines: { create: quoteLinesData },
      },
      include: { lines: true },
    })
  }

  if (rfq.status === "TEKLIFE_ACIK") {
    await prisma.lojistikRfq.update({
      where: { id: rfq.id },
      data: { status: "DEGERLENDIRMEDE" },
    })
  }

  return savedQuote
}

export async function getRfqComparisonMatrix(rfqId: string) {
  const [rfq, suppliers] = await Promise.all([
    prisma.lojistikRfq.findUnique({
      where: { id: rfqId },
      include: {
        items: true,
        quotes: { include: { lines: true } },
      },
    }),
    prisma.supplier.findMany(),
  ])

  if (!rfq) throw new LogisticsDomainError("RFQ_NOT_FOUND", "RFQ bulunamadı.", 404)
  const supMap = new Map(suppliers.map((s: any) => [s.id, s]))

  const quotes = (rfq.quotes || []).filter((q: any) => q.status !== "GERI_CEKILDI")
  const minTco = quotes.length > 0 ? Math.min(...quotes.map((q: any) => Number(q.tcoTotal || 0))) : 0
  const minLead = quotes.length > 0 ? Math.min(...quotes.map((q: any) => Number(q.leadTimeDays || 1))) : 0

  const enrichedQuotes = quotes.map((q: any) => {
    const sup = supMap.get(q.supplierId)
    const supplierScore = Number(sup?.scorecardScore ?? (sup?.rating || 4.5) * 20)
    // Maliyet skoru (%55) + Termin hızı (%20) + Tedarikçi Kalite/Skor Kartı (%25)
    const costRatioScore = q.tcoTotal > 0 ? Math.min(100, (minTco / Number(q.tcoTotal)) * 100) : 0
    const leadRatioScore = q.leadTimeDays > 0 ? Math.min(100, (minLead / Number(q.leadTimeDays)) * 100) : 0
    const compositeEvaluationScore = Number(
      (costRatioScore * 0.55 + leadRatioScore * 0.2 + supplierScore * 0.25).toFixed(1)
    )
    const lineByRfqItem: Record<string, any> = {}
    for (const ql of q.lines || []) {
      lineByRfqItem[ql.rfqItemId] = ql
    }

    return {
      ...q,
      supplierCode: sup?.code ?? "-",
      supplierName: sup?.name ?? "-",
      supplierScore,
      supplierTier: sup?.scorecardTier ?? "B",
      compositeEvaluationScore,
      lineByRfqItem,
    }
  })

  enrichedQuotes.sort((a: any, b: any) => b.compositeEvaluationScore - a.compositeEvaluationScore)

  const cheapestQuote =
    enrichedQuotes.length > 0
      ? [...enrichedQuotes].sort((a, b) => Number(a.tcoTotal) - Number(b.tcoTotal))[0]
      : null
  const fastestQuote =
    enrichedQuotes.length > 0
      ? [...enrichedQuotes].sort((a, b) => Number(a.leadTimeDays) - Number(b.leadTimeDays))[0]
      : null
  const recommendedQuote = enrichedQuotes[0] ?? null

  const itemMatrix = (rfq.items || []).map((item: any) => {
    const prices = enrichedQuotes
      .map((q: any) => q.lineByRfqItem[item.id]?.unitPrice)
      .filter((v: any) => typeof v === "number")
    const bestUnitPrice = prices.length > 0 ? Math.min(...prices) : null

    return {
      ...item,
      bestUnitPrice,
      offersByQuoteId: enrichedQuotes.reduce((acc: Record<string, any>, q: any) => {
        const cell = q.lineByRfqItem[item.id]
        acc[q.id] = cell
          ? {
              unitPrice: cell.unitPrice,
              offeredQty: cell.offeredQty,
              lineTotal: cell.lineTotal,
              leadTimeDays: cell.leadTimeDays,
              isBestPrice: bestUnitPrice !== null && cell.unitPrice === bestUnitPrice,
            }
          : null
        return acc
      }, {}),
    }
  })

  return {
    rfq,
    quotes: enrichedQuotes,
    itemMatrix,
    highlights: {
      cheapestQuoteId: cheapestQuote?.id ?? null,
      fastestQuoteId: fastestQuote?.id ?? null,
      recommendedQuoteId: recommendedQuote?.id ?? null,
    },
  }
}

export async function awardRfqAndConvertToPo(
  input: { rfqId: string; quoteId: string; priority?: string; notes?: string },
  actor: string
) {
  const rfq = await prisma.lojistikRfq.findUnique({
    where: { id: input.rfqId },
    include: {
      items: true,
      quotes: { include: { lines: true } },
    },
  })
  if (!rfq) throw new LogisticsDomainError("RFQ_NOT_FOUND", "RFQ bulunamadı.", 404)
  if (rfq.status === "SONUCLANDI") {
    throw new LogisticsDomainError("RFQ_ALREADY_AWARDED", "Bu RFQ zaten sonuçlandırılmış.", 400)
  }

  const winningQuote: any = (rfq.quotes || []).find((q: any) => q.id === input.quoteId)
  if (!winningQuote) {
    throw new LogisticsDomainError("QUOTE_NOT_FOUND", "Kazanan teklif bulunamadı.", 404)
  }

  const rfqItemMap = new Map((rfq.items || []).map((i: any) => [i.id, i]))
  const poLines = (winningQuote.lines || []).map((ql: any) => {
    const rItem: any = rfqItemMap.get(ql.rfqItemId)
    return {
      itemId: ql.itemId,
      orderedQty: Number(ql.offeredQty || rItem?.requestedQty || 1),
      agreedUnitPrice: Number(ql.unitPrice),
      notes: ql.notes || null,
    }
  })

  const po = await createLojistikPurchaseOrder(
    {
      supplierId: winningQuote.supplierId,
      warehouseId: rfq.warehouseId,
      sourceType: "RFQ_AWARD",
      sourceRefNo: rfq.rfqNumber,
      rfqId: rfq.id,
      priority: input.priority || "NORMAL",
      paymentTerms: winningQuote.paymentTerms,
      expectedDeliveryDate: new Date(
        Date.now() + Number(winningQuote.leadTimeDays || 3) * 86_400_000
      ).toISOString(),
      notes: input.notes || `${rfq.rfqNumber} ihalesi kazananı (${winningQuote.quoteNumber}) üzerinden üretildi.`,
      lines: poLines,
      autoSubmit: true,
    },
    actor
  )

  for (const q of rfq.quotes || []) {
    await prisma.lojistikRfqQuote.update({
      where: { id: q.id },
      data: { status: q.id === winningQuote.id ? "KAZANDI" : "ELENDI" },
    })
  }

  await prisma.lojistikRfq.update({
    where: { id: rfq.id },
    data: {
      status: "SONUCLANDI",
      awardedSupplierId: winningQuote.supplierId,
      awardedQuoteId: winningQuote.id,
      convertedPoNo: po.poNumber,
    },
  })

  return { rfqId: rfq.id, quoteId: winningQuote.id, purchaseOrder: po }
}

export async function createLojistikPurchaseOrder(
  input: {
    supplierId: string
    warehouseId?: string
    sourceType?: "AUTO_ROP" | "RFQ_AWARD" | "MANUAL" | "PR_CONVERT"
    sourceRefNo?: string | null
    rfqId?: string | null
    requisitionId?: string | null
    priority?: string
    paymentTerms?: string
    expectedDeliveryDate?: string | null
    autoSubmit?: boolean
    notes?: string | null
    lines: Array<{
      itemId: string
      orderedQty: number
      agreedUnitPrice?: number
      notes?: string | null
    }>
  },
  actor: string
) {
  const supplier = await prisma.supplier.findUnique({ where: { id: input.supplierId } })
  if (!supplier) {
    throw new LogisticsDomainError("SUPPLIER_NOT_FOUND", "Tedarikçi bulunamadı.", 404)
  }
  if (supplier.approvalStatus === "KARALISTE" || !supplier.isActive) {
    throw new LogisticsDomainError(
      "SUPPLIER_BLOCKED",
      `${supplier.name} kara listede/pasif olduğundan yeni satın alma emri (PO) açılamaz.`,
      400
    )
  }
  if (supplier.approvalStatus === "ASKIDA") {
    throw new LogisticsDomainError(
      "SUPPLIER_SUSPENDED",
      `${supplier.name} askıya alınmış durumda; önce tedarikçi onayı aktif edilmelidir.`,
      400
    )
  }
  if (!input.lines || input.lines.length === 0) {
    throw new LogisticsDomainError("EMPTY_PO_LINES", "PO oluşturmak için en az bir kalem gerekir.", 400)
  }

  const allItems = await prisma.inventoryItem.findMany()
  const itemMap = new Map(allItems.map((i: any) => [i.id, i]))

  const poLinesData: any[] = []
  let agreedTotalAmount = 0
  let baselineTotalAmount = 0
  let totalOrderedQty = 0

  for (const row of input.lines) {
    const item = itemMap.get(row.itemId)
    if (!item) {
      throw new LogisticsDomainError("ITEM_NOT_FOUND", `Stok kalemi bulunamadı (${row.itemId}).`, 404)
    }
    const orderedQty = Math.max(1, Number(row.orderedQty || 0))
    const baselineUnitCost = Math.max(0, Number(item.standardCost || row.agreedUnitPrice || 0))
    const agreedUnitPrice = Math.max(0.01, Number(row.agreedUnitPrice ?? baselineUnitCost))
    const lineTotal = Number((orderedQty * agreedUnitPrice).toFixed(2))

    agreedTotalAmount += lineTotal
    baselineTotalAmount += orderedQty * baselineUnitCost
    totalOrderedQty += orderedQty

    poLinesData.push({
      itemId: item.id,
      sku: item.sku,
      itemName: item.name,
      orderedQty,
      receivedQty: 0,
      rejectedQty: 0,
      unit: item.baseUnit || "Adet",
      agreedUnitPrice,
      baselineUnitCost,
      lineTotal,
      notes: row.notes?.trim() || null,
    })
  }

  agreedTotalAmount = Number(agreedTotalAmount.toFixed(2))
  baselineTotalAmount = Number(baselineTotalAmount.toFixed(2))

  const approvalPlan = resolvePoApprovalPlan(agreedTotalAmount, input.priority)
  const existingPos = await prisma.lojistikPurchaseOrder.findMany()
  const poNumber = `PO-${new Date().getFullYear()}-${String(existingPos.length + 1001).padStart(4, "0")}`
  const expectedDate = input.expectedDeliveryDate
    ? new Date(input.expectedDeliveryDate)
    : new Date(Date.now() + Number(supplier.leadTimeDays || 5) * 86_400_000)

  return prisma.lojistikPurchaseOrder.create({
    data: {
      poNumber,
      supplierId: supplier.id,
      warehouseId: input.warehouseId || "wh-merkez-01",
      sourceType: input.sourceType || "MANUAL",
      sourceRefNo: input.sourceRefNo || null,
      rfqId: input.rfqId || null,
      requisitionId: input.requisitionId || null,
      status: input.autoSubmit === false ? "TASLAK" : "ONAY_BEKLIYOR",
      priority: input.priority || "NORMAL",
      currentApprovalStep: 1,
      requiredApprovalSteps: approvalPlan.length,
      agreedTotalAmount,
      baselineTotalAmount,
      currency: "TRY",
      paymentTerms: input.paymentTerms?.trim() || supplier.paymentTermsLabel || "30 Gün Vadeli",
      expectedDeliveryDate: expectedDate,
      supplierResponseStatus: "BEKLIYOR",
      totalOrderedQty,
      totalReceivedQty: 0,
      totalRejectedQty: 0,
      createdBy: actor,
      notes: input.notes?.trim() || null,
      lines: { create: poLinesData },
      approvals: {
        create: approvalPlan.map((step) => ({
          stepOrder: step.stepOrder,
          approverRole: step.approverRole,
          thresholdMin: step.thresholdMin,
          status: "BEKLIYOR",
        })),
      },
    },
    include: { lines: true, approvals: true },
  })
}

export async function processPoApprovalStep(
  input: {
    poId: string
    decision: "ONAYLA" | "REDDET"
    decisionNote?: string
    autoDispatchOnFinal?: boolean
    dispatchChannel?: "PORTAL" | "EMAIL" | "EDI"
  },
  actor: string
) {
  const po: any = await prisma.lojistikPurchaseOrder.findUnique({
    where: { id: input.poId },
    include: { lines: true, approvals: true },
  })
  if (!po) throw new LogisticsDomainError("PO_NOT_FOUND", "Satın alma emri (PO) bulunamadı.", 404)
  if (po.status !== "ONAY_BEKLIYOR" && po.status !== "TASLAK") {
    throw new LogisticsDomainError(
      "INVALID_PO_APPROVAL_STATE",
      `${po.poNumber} şu anda onay aşamasında değil (Durum: ${po.status}).`,
      400
    )
  }

  const approvals = [...(po.approvals || [])].sort((a: any, b: any) => a.stepOrder - b.stepOrder)
  const pendingStep =
    approvals.find((a: any) => a.stepOrder === po.currentApprovalStep && a.status === "BEKLIYOR") ||
    approvals.find((a: any) => a.status === "BEKLIYOR")

  if (!pendingStep) {
    throw new LogisticsDomainError("NO_PENDING_APPROVAL_STEP", "Bekleyen onay adımı kalmamış.", 400)
  }

  if (input.decision === "REDDET") {
    await prisma.lojistikPoApprovalStep.update({
      where: { id: pendingStep.id },
      data: {
        status: "REDDEDILDI",
        approvedBy: actor,
        decisionNote: input.decisionNote?.trim() || "Reddedildi",
        decidedAt: new Date(),
      },
    })
    return prisma.lojistikPurchaseOrder.update({
      where: { id: po.id },
      data: {
        status: "IPTAL",
        notes: `${po.notes ? po.notes + " | " : ""}Onay reddedildi (${actor}): ${input.decisionNote || "-"}`,
      },
      include: { lines: true, approvals: true },
    })
  }

  await prisma.lojistikPoApprovalStep.update({
    where: { id: pendingStep.id },
    data: {
      status: "ONAYLANDI",
      approvedBy: actor,
      decisionNote: input.decisionNote?.trim() || "Onaylandı",
      decidedAt: new Date(),
    },
  })

  const isFinalStep = pendingStep.stepOrder >= po.requiredApprovalSteps
  if (!isFinalStep) {
    return prisma.lojistikPurchaseOrder.update({
      where: { id: po.id },
      data: {
        status: "ONAY_BEKLIYOR",
        currentApprovalStep: pendingStep.stepOrder + 1,
      },
      include: { lines: true, approvals: true },
    })
  }

  const shouldDispatch = input.autoDispatchOnFinal !== false
  return prisma.lojistikPurchaseOrder.update({
    where: { id: po.id },
    data: {
      status: shouldDispatch ? "TEDARIKCIYE_ILETILDI" : "TEDARIKCIYE_ILETILDI",
      currentApprovalStep: po.requiredApprovalSteps,
      dispatchedAt: new Date(),
      dispatchedChannel: input.dispatchChannel || "PORTAL",
    },
    include: { lines: true, approvals: true },
  })
}

export async function dispatchPoToSupplier(
  input: { poId: string; channel?: "PORTAL" | "EMAIL" | "EDI" },
  actor: string
) {
  const po: any = await prisma.lojistikPurchaseOrder.findUnique({
    where: { id: input.poId },
    include: { approvals: true },
  })
  if (!po) throw new LogisticsDomainError("PO_NOT_FOUND", "PO bulunamadı.", 404)

  const supplier = await prisma.supplier.findUnique({ where: { id: po.supplierId } })
  if (supplier && (supplier.approvalStatus === "KARALISTE" || !supplier.isActive)) {
    throw new LogisticsDomainError(
      "SUPPLIER_BLOCKED",
      `${supplier.name} kara listeye alındığı için PO iletilemez.`,
      400
    )
  }

  const unapproved = (po.approvals || []).filter((a: any) => a.status !== "ONAYLANDI")
  if (unapproved.length > 0) {
    throw new LogisticsDomainError(
      "APPROVAL_INCOMPLETE",
      `Sevk etmeden önce ${unapproved.length} onay adımı tamamlanmalıdır.`,
      400
    )
  }

  return prisma.lojistikPurchaseOrder.update({
    where: { id: po.id },
    data: {
      status: "TEDARIKCIYE_ILETILDI",
      dispatchedAt: new Date(),
      dispatchedChannel: input.channel || "PORTAL",
      notes: `${po.notes ? po.notes + " | " : ""}İletildi (${actor} - ${input.channel || "PORTAL"})`,
    },
    include: { lines: true, approvals: true },
  })
}

export async function recordSupplierPoResponse(
  input: {
    poId: string
    decision: "ONAYLANDI" | "KISMI_ONAY" | "RED_BAYRAK"
    promisedDeliveryDate?: string | null
    note?: string
    redFlagReason?: string
  },
  actor: string
) {
  const po = await prisma.lojistikPurchaseOrder.findUnique({ where: { id: input.poId } })
  if (!po) throw new LogisticsDomainError("PO_NOT_FOUND", "PO bulunamadı.", 404)

  if (["TESLIM_ALINDI", "TAMAMLANDI", "IPTAL"].includes(po.status)) {
    throw new LogisticsDomainError(
      "PO_ALREADY_CLOSED",
      `${po.poNumber} kapatıldığı için tedarikçi yanıtı güncellenemez.`,
      400
    )
  }

  if (input.decision === "RED_BAYRAK" && !input.redFlagReason?.trim() && !input.note?.trim()) {
    throw new LogisticsDomainError(
      "RED_FLAG_REASON_REQUIRED",
      "Kırmızı bayrak / teslimat sorunu bildirimi için açıklama zorunludur.",
      400
    )
  }

  const nextStatus =
    input.decision === "ONAYLANDI"
      ? "TEDARIKCI_ONAYLADI"
      : input.decision === "KISMI_ONAY"
        ? "KISMI_ONAY"
        : "RED_BAYRAK"

  return prisma.lojistikPurchaseOrder.update({
    where: { id: po.id },
    data: {
      status: nextStatus,
      supplierResponseStatus: input.decision,
      supplierResponseNote: input.note?.trim() || `Yanıtlayan: ${actor}`,
      redFlagReason:
        input.decision === "RED_BAYRAK"
          ? input.redFlagReason?.trim() || input.note?.trim() || "Tedarikçi stok/termin engeli"
          : null,
      promisedDeliveryDate: input.promisedDeliveryDate ? new Date(input.promisedDeliveryDate) : po.promisedDeliveryDate,
    },
    include: { lines: true, approvals: true },
  })
}

export async function listPurchaseOrdersEnriched(filter?: {
  status?: string
  supplierId?: string
  warehouseId?: string
}) {
  const [pos, suppliers, warehouses, asns] = await Promise.all([
    prisma.lojistikPurchaseOrder.findMany({
      ...(filter?.supplierId ? { where: { supplierId: filter.supplierId } } : {}),
      include: { lines: true, approvals: true },
      orderBy: { createdAt: "desc" },
    }),
    prisma.supplier.findMany(),
    prisma.warehouse.findMany(),
    prisma.lojistikSupplierAsn.findMany(),
  ])

  const supMap = new Map(suppliers.map((s: any) => [s.id, s]))
  const whMap = new Map(warehouses.map((w: any) => [w.id, w]))
  const asnByPo = new Map<string, any[]>()
  for (const a of asns) {
    const arr = asnByPo.get(a.poNumber) || []
    arr.push(a)
    asnByPo.set(a.poNumber, arr)
  }

  let rows = pos.map((po: any) => {
    const sup = supMap.get(po.supplierId)
    const wh = whMap.get(po.warehouseId)
    const approvals = [...(po.approvals || [])].sort((a: any, b: any) => a.stepOrder - b.stepOrder)
    const currentStepObj = approvals.find((a: any) => a.stepOrder === po.currentApprovalStep) ?? null
    return {
      ...po,
      supplierCode: sup?.code ?? "-",
      supplierName: sup?.name ?? "-",
      supplierGln: sup?.glnNumber ?? null,
      supplierApprovalStatus: sup?.approvalStatus ?? "ONAYLI",
      warehouseName: wh?.name ?? po.warehouseId,
      approvals,
      currentApproverRole: currentStepObj?.approverRole ?? "Tamamlandı",
      asnCount: (asnByPo.get(po.poNumber) || []).length,
    }
  })

  if (filter?.status && filter.status !== "ALL") {
    rows = rows.filter((r: any) => r.status === filter.status)
  }
  if (filter?.warehouseId && filter.warehouseId !== "ALL") {
    rows = rows.filter((r: any) => r.warehouseId === filter.warehouseId)
  }

  return rows
}

export async function convertReorderPolicyToPo(
  input: {
    policyId: string
    overrideQty?: number
    priority?: string
  },
  actor: string
) {
  const pol = await prisma.reorderPolicy.findUnique({ where: { id: input.policyId } })
  if (!pol) throw new LogisticsDomainError("POLICY_NOT_FOUND", "EOQ/ROP politikası bulunamadı.", 404)

  const qty = Math.max(
    1,
    Math.round(Number(input.overrideQty ?? pol.economicOrderQty ?? pol.minOrderQtyMoq ?? 25))
  )

  return createLojistikPurchaseOrder(
    {
      supplierId: pol.supplierId,
      warehouseId: pol.warehouseId,
      sourceType: "AUTO_ROP",
      sourceRefNo: `EOQ-${pol.id.slice(0, 8)}`,
      priority: input.priority || "HIGH",
      notes: `EOQ (${pol.economicOrderQty}) / ROP (${pol.calculatedRop}) otomasyon motorundan üretildi.`,
      lines: [
        {
          itemId: pol.itemId,
          orderedQty: qty,
          agreedUnitPrice: pol.unitCostTry || undefined,
        },
      ],
      autoSubmit: true,
    },
    actor
  )
}
