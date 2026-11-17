/**
 * Lojistik Faz 3 — ASN (Ön Sevkiyat Bildirimi) & Faz 2 WMS Mal Kabul Köprüsü
 *
 * - Tedarikçi Portalı, ERP ve Harici EDI DESADV (/api/edi/asn) kanallarından ASN üretimi
 * - Faz 2 WMS Mal Kabul (PO Mal Kabul) ekranı için açık ASN ön-doldurma listesi
 * - Mal kabul tamamlandığında:
 *   1) Faz 2 processGoodsReceiptWithVariance stok defteri & raf bakiyesi & karantina işlemini tetikler
 *   2) ASN satırları & durumu (KABUL_TAMAM) güncellenir
 *   3) Bağlı LojistikPurchaseOrder miktarları & teslimat tarihi & durumu güncellenir
 *   4) Tedarikçi Performans Skor Kartı canlı olarak yeniden hesaplanır
 *   5) EDI kanalından geldiyse APERAK alındı onayı kaydedilir
 */

import { prisma } from "@/lib/db"
import { LogisticsDomainError } from "@/lib/logistics/security"
import { createLogisticsProviders } from "@/lib/logistics/providers"
import type { EdiDesadvInput } from "@/lib/logistics/types"
import { validateGln13 } from "./constantsAndHelpers"
import { recalculateSupplierScorecard } from "./scorecardService"

export async function createSupplierAsn(
  input: {
    poId?: string
    poNumber?: string
    supplierId?: string
    warehouseId?: string
    waybillNo?: string
    trackingNo?: string
    carrierName?: string
    vehiclePlate?: string
    driverName?: string
    ssccPalletCount?: number
    expectedArrivalAt: string
    ediExternalRef?: string | null
    notes?: string
    lines: Array<{
      itemId: string
      poLineId?: string | null
      shippedQty: number
      lotNumber?: string | null
      expiryDate?: string | null
      ssccCode?: string | null
      notes?: string | null
    }>
  },
  actor: string,
  sourceChannel: "PORTAL" | "ERP" | "EDI_DESADV" = "PORTAL"
) {
  let po: any = null
  if (input.poId) {
    po = await prisma.lojistikPurchaseOrder.findUnique({
      where: { id: input.poId },
      include: { lines: true },
    })
  } else if (input.poNumber) {
    po = await prisma.lojistikPurchaseOrder.findFirst({
      where: { poNumber: input.poNumber.trim() },
      include: { lines: true },
    })
  }

  if (!po) {
    throw new LogisticsDomainError(
      "PO_NOT_FOUND",
      `ASN oluşturmak için geçerli bir Satın Alma Emri (PO) bulunamadı (${input.poNumber || input.poId || "-"}).`,
      404
    )
  }

  if (input.supplierId && po.supplierId !== input.supplierId) {
    throw new LogisticsDomainError(
      "FORBIDDEN_SUPPLIER_SCOPE",
      "Seçilen satın alma emri bu tedarikçiye ait değil.",
      403
    )
  }

  const supplier = await prisma.supplier.findUnique({ where: { id: po.supplierId } })
  if (supplier && (supplier.approvalStatus === "KARALISTE" || !supplier.isActive)) {
    throw new LogisticsDomainError(
      "SUPPLIER_BLOCKED",
      `${supplier.name} kara listede/pasif olduğu için sevkiyat bildirimi açılamaz.`,
      400
    )
  }

  if (!input.lines || input.lines.length === 0) {
    throw new LogisticsDomainError("EMPTY_ASN_LINES", "ASN için en az bir ürün kalemi girilmelidir.", 400)
  }

  const items = await prisma.inventoryItem.findMany()
  const itemMap = new Map(items.map((i: any) => [i.id, i]))
  const poLineMap = new Map((po.lines || []).map((l: any) => [l.itemId, l]))

  const asnLinesData: any[] = []
  for (let idx = 0; idx < input.lines.length; idx++) {
    const l = input.lines[idx]
    const item = itemMap.get(l.itemId)
    if (!item) {
      throw new LogisticsDomainError("ITEM_NOT_FOUND", `Stok kalemi bulunamadı (${l.itemId}).`, 404)
    }
    const shippedQty = Math.max(0.01, Number(l.shippedQty || 0))
    const matchedPoLine: any = poLineMap.get(item.id)
    asnLinesData.push({
      poLineId: l.poLineId || matchedPoLine?.id || null,
      itemId: item.id,
      sku: item.sku,
      itemName: item.name,
      shippedQty,
      receivedQty: 0,
      damagedQty: 0,
      unit: item.baseUnit || "Adet",
      lotNumber:
        l.lotNumber?.trim() ||
        (item.trackLot ? `LOT-${item.sku.slice(0, 4)}-${new Date().toISOString().slice(2, 10).replace(/-/g, "")}` : null),
      expiryDate: l.expiryDate ? new Date(l.expiryDate) : null,
      ssccCode:
        l.ssccCode?.trim() ||
        `00869000${String(Date.now()).slice(-7)}${String(idx + 1).padStart(3, "0")}`,
      notes: l.notes?.trim() || null,
    })
  }

  const count = (await prisma.lojistikSupplierAsn.findMany()).length
  const asnNumber = `ASN-${new Date().getFullYear()}-${String(count + 501).padStart(4, "0")}`

  const created = await prisma.lojistikSupplierAsn.create({
    data: {
      asnNumber,
      poId: po.id,
      poNumber: po.poNumber,
      supplierId: po.supplierId,
      warehouseId: input.warehouseId || po.warehouseId,
      waybillNo: input.waybillNo?.trim() || `IRS-${asnNumber}`,
      trackingNo: input.trackingNo?.trim() || null,
      carrierName: input.carrierName?.trim() || "Soğuk Zincir Lojistik",
      vehiclePlate: input.vehiclePlate?.trim() || null,
      driverName: input.driverName?.trim() || null,
      ssccPalletCount: Math.max(1, Number(input.ssccPalletCount || 1)),
      expectedArrivalAt: new Date(input.expectedArrivalAt || Date.now() + 86_400_000),
      status: "ON_IHBAR",
      sourceChannel,
      ediExternalRef: input.ediExternalRef || null,
      notes: input.notes?.trim() || null,
      createdBy: actor,
      lines: { create: asnLinesData },
    },
    include: { lines: true },
  })

  // Eğer PO hâlâ TEDARIKCIYE_ILETILDI durumundaysa tedarikçinin fiilen sevke hazırlandığını işaretle
  if (po.status === "TEDARIKCIYE_ILETILDI") {
    await prisma.lojistikPurchaseOrder.update({
      where: { id: po.id },
      data: {
        status: "TEDARIKCI_ONAYLADI",
        supplierResponseStatus: "ONAYLANDI",
        supplierResponseNote: `${created.asnNumber} sevkiyat ihbarı ile teyit edildi.`,
      },
    })
  }

  return created
}

export async function advanceAsnStatus(
  asnId: string,
  newStatus: "ON_IHBAR" | "YOLDA" | "KAPI_GIRIS" | "IPTAL",
  actor: string
) {
  const asn = await prisma.lojistikSupplierAsn.findUnique({ where: { id: asnId } })
  if (!asn) throw new LogisticsDomainError("ASN_NOT_FOUND", "ASN kaydı bulunamadı.", 404)
  if (asn.status === "KABUL_TAMAM") {
    throw new LogisticsDomainError("ASN_ALREADY_RECEIVED", "Mal kabulü tamamlanmış ASN durumu geri alınamaz.", 400)
  }

  return prisma.lojistikSupplierAsn.update({
    where: { id: asn.id },
    data: {
      status: newStatus,
      notes: `${asn.notes ? asn.notes + " | " : ""}Durum: ${newStatus} (${actor})`,
    },
    include: { lines: true },
  })
}

export async function ingestExternalEdiAsn(rawDesadv: EdiDesadvInput, actor: string = "EDI_ADAPTER") {
  if (rawDesadv.supplierGln) {
    const glnCheck = validateGln13(rawDesadv.supplierGln)
    if (!glnCheck.valid) {
      throw new LogisticsDomainError("INVALID_GLN_13", glnCheck.reason || "EDI GLN-13 geçersiz.", 400)
    }
  }

  const providers = createLogisticsProviders()
  const normalized = await providers.ediAsn.ingestDesadv({
    ...rawDesadv,
    externalRef: rawDesadv.externalRef || (rawDesadv as any).externalMessageId,
  })

  const [suppliers, items] = await Promise.all([
    prisma.supplier.findMany(),
    prisma.inventoryItem.findMany(),
  ])

  const matchedSupplier = suppliers.find(
    (s: any) =>
      (normalized.supplierGln && s.glnNumber === normalized.supplierGln) ||
      (normalized.supplierCode && s.code.toUpperCase() === normalized.supplierCode.toUpperCase())
  )

  if (!matchedSupplier) {
    throw new LogisticsDomainError(
      "EDI_SUPPLIER_NOT_MAPPED",
      `EDI mesajındaki tedarikçi eşleştirilemedi (GLN: ${normalized.supplierGln || "-"}, Kod: ${normalized.supplierCode || "-"}).`,
      404
    )
  }

  const itemBySku = new Map(items.map((i: any) => [i.sku.toUpperCase(), i]))
  const resolvedLines = normalized.lines.map((l) => {
    const found = itemBySku.get(l.sku.toUpperCase())
    if (!found) {
      throw new LogisticsDomainError("EDI_SKU_NOT_FOUND", `EDI satırındaki SKU sistemde bulunamadı: ${l.sku}`, 400)
    }
    return {
      itemId: found.id,
      shippedQty: l.shippedQty,
      lotNumber: l.lotNumber || null,
      expiryDate: l.expiryDate || null,
      ssccCode: l.ssccCode || null,
    }
  })

  const asn = await createSupplierAsn(
    {
      poNumber: normalized.poNumber,
      supplierId: matchedSupplier.id,
      waybillNo: normalized.waybillNo,
      trackingNo: normalized.externalRef,
      carrierName: normalized.carrierName || "EDI DESADV Taşıyıcı",
      vehiclePlate: normalized.vehiclePlate,
      expectedArrivalAt: normalized.expectedArrivalAt,
      ediExternalRef: normalized.externalRef,
      notes: `EDI DESADV adaptörü (${normalized.providerName}) üzerinden otomatik içe aktarıldı.`,
      lines: resolvedLines,
    },
    actor,
    "EDI_DESADV"
  )

  return { providerNormalized: normalized, asn }
}

export async function listAsnsEnriched(filter?: {
  status?: string
  supplierId?: string
  warehouseId?: string
}) {
  const [asns, suppliers, warehouses] = await Promise.all([
    prisma.lojistikSupplierAsn.findMany({
      ...(filter?.supplierId ? { where: { supplierId: filter.supplierId } } : {}),
      include: { lines: true },
      orderBy: { createdAt: "desc" },
    }),
    prisma.supplier.findMany(),
    prisma.warehouse.findMany(),
  ])

  const supMap = new Map(suppliers.map((s: any) => [s.id, s]))
  const whMap = new Map(warehouses.map((w: any) => [w.id, w]))

  let rows = asns.map((a: any) => ({
    ...a,
    supplierCode: supMap.get(a.supplierId)?.code ?? "-",
    supplierName: supMap.get(a.supplierId)?.name ?? "-",
    warehouseName: whMap.get(a.warehouseId)?.name ?? a.warehouseId,
    totalShippedQty: (a.lines || []).reduce((s: number, l: any) => s + Number(l.shippedQty || 0), 0),
    totalReceivedQty: (a.lines || []).reduce((s: number, l: any) => s + Number(l.receivedQty || 0), 0),
  }))

  if (filter?.status && filter.status !== "ALL") {
    rows = rows.filter((r: any) => r.status === filter.status)
  }
  if (filter?.warehouseId && filter.warehouseId !== "ALL") {
    rows = rows.filter((r: any) => r.warehouseId === filter.warehouseId)
  }

  return rows
}

export async function getOpenAsnsForWmsReceiving(warehouseId?: string) {
  const rows = await listAsnsEnriched({
    ...(warehouseId && warehouseId !== "ALL" ? { warehouseId } : {}),
  })
  return rows.filter((r: any) => ["ON_IHBAR", "YOLDA", "KAPI_GIRIS"].includes(r.status))
}

/**
 * Faz 2 `processGoodsReceiptWithVariance` ile ASN + PO + Skor Kartını atomik/senkronize günceller.
 */
export async function applyGoodsReceiptToAsnAndPo(params: {
  asnId?: string | null
  relatedPoNo?: string | null
  wmsTaskNo: string
  lines: Array<{
    itemId: string
    receivedGoodQty: number
    damagedQty?: number
  }>
}) {
  let asn: any = null
  if (params.asnId) {
    asn = await prisma.lojistikSupplierAsn.findUnique({
      where: { id: params.asnId },
      include: { lines: true },
    })
  } else if (params.relatedPoNo) {
    const candidates = await prisma.lojistikSupplierAsn.findMany({
      where: { poNumber: params.relatedPoNo.trim() },
      include: { lines: true },
    })
    asn = candidates.find((c: any) => ["ON_IHBAR", "YOLDA", "KAPI_GIRIS"].includes(c.status)) ?? null
  }

  const poNumberToFind = asn?.poNumber || params.relatedPoNo?.trim()
  let po: any = null
  if (asn?.poId) {
    po = await prisma.lojistikPurchaseOrder.findUnique({
      where: { id: asn.poId },
      include: { lines: true },
    })
  } else if (poNumberToFind) {
    po = await prisma.lojistikPurchaseOrder.findFirst({
      where: { poNumber: poNumberToFind },
      include: { lines: true },
    })
  }

  const qtyByItem = new Map<string, { good: number; damaged: number }>()
  for (const l of params.lines) {
    const prev = qtyByItem.get(l.itemId) || { good: 0, damaged: 0 }
    prev.good += Math.max(0, Number(l.receivedGoodQty || 0))
    prev.damaged += Math.max(0, Number(l.damagedQty || 0))
    qtyByItem.set(l.itemId, prev)
  }

  if (asn) {
    for (const aLine of asn.lines || []) {
      const rec = qtyByItem.get(aLine.itemId)
      if (!rec) continue
      await prisma.lojistikSupplierAsnLine.update({
        where: { id: aLine.id },
        data: {
          receivedQty: Number(aLine.receivedQty || 0) + rec.good,
          damagedQty: Number(aLine.damagedQty || 0) + rec.damaged,
        },
      })
    }

    await prisma.lojistikSupplierAsn.update({
      where: { id: asn.id },
      data: {
        status: "KABUL_TAMAM",
        actualArrivalAt: new Date(),
        wmsTaskNo: params.wmsTaskNo,
      },
    })

    if (asn.sourceChannel === "EDI_DESADV") {
      try {
        const providers = createLogisticsProviders()
        await providers.ediAsn.acknowledgeAsnReceipt({
          asnNumber: asn.asnNumber,
          poNumber: asn.poNumber,
          externalRef: asn.ediExternalRef || null,
          acceptedQty: params.lines.reduce((s, l) => s + Number(l.receivedGoodQty || 0), 0),
          damagedQty: params.lines.reduce((s, l) => s + Number(l.damagedQty || 0), 0),
        })
      } catch {
        // EDI APERAK log hatası mal kabulü kesmemeli
      }
    }
  }

  if (po) {
    let allSatisfied = true
    let sumReceived = 0
    let sumRejected = 0

    for (const pLine of po.lines || []) {
      const rec = qtyByItem.get(pLine.itemId)
      const nextRec = Number(pLine.receivedQty || 0) + (rec?.good || 0)
      const nextRej = Number(pLine.rejectedQty || 0) + (rec?.damaged || 0)
      if (rec) {
        await prisma.lojistikPurchaseOrderLine.update({
          where: { id: pLine.id },
          data: {
            receivedQty: nextRec,
            rejectedQty: nextRej,
          },
        })
      }
      sumReceived += nextRec
      sumRejected += nextRej
      if (nextRec + nextRej < Number(pLine.orderedQty || 0)) {
        allSatisfied = false
      }
    }

    await prisma.lojistikPurchaseOrder.update({
      where: { id: po.id },
      data: {
        totalReceivedQty: Number(sumReceived.toFixed(2)),
        totalRejectedQty: Number(sumRejected.toFixed(2)),
        actualDeliveryDate: new Date(),
        status: allSatisfied ? "TESLIM_ALINDI" : "KISMI_TESLIM",
      },
    })

    // Mal kabul kalite muayenesi kaydını (RECEIVING) otomatik üret -> Tedarikçi Skor Kartına doğrudan besle
    const batchGood = params.lines.reduce((s, l) => s + Math.max(0, Number(l.receivedGoodQty || 0)), 0)
    const batchDamaged = params.lines.reduce((s, l) => s + Math.max(0, Number(l.damagedQty || 0)), 0)
    const qcRefNo = `QC-REC-${params.wmsTaskNo || Date.now()}`
    const existingQc = await prisma.uretimQualityInspection
      .findFirst({ where: { inspectionNumber: qcRefNo } })
      .catch(() => null)
    if (!existingQc && batchGood + batchDamaged > 0) {
      const firstLine = (po.lines || [])[0]
      const supplierObj = await prisma.supplier.findUnique({ where: { id: po.supplierId } }).catch(() => null)
      await prisma.uretimQualityInspection
        .create({
          data: {
            inspectionNumber: qcRefNo,
            inspectionType: "RECEIVING",
            itemId: firstLine?.itemId || params.lines[0]?.itemId || null,
            supplierId: po.supplierId,
            supplierName: supplierObj?.name || null,
            purchaseOrderId: po.id,
            batchQuantity: Number((batchGood + batchDamaged).toFixed(2)),
            sampleQuantity: Number(Math.max(1, Math.min(20, batchGood + batchDamaged)).toFixed(2)),
            status:
              batchDamaged > 0
                ? batchGood > 0
                  ? "CONDITIONAL_PASSED"
                  : "FAILED"
                : "PASSED",
            totalDefects: Math.round(batchDamaged),
            isStockBlocked: batchDamaged > 0 && batchGood === 0,
            inspectionDate: new Date(),
            decisionNotes:
              batchDamaged > 0
                ? `Mal kabul sırasında ${batchDamaged} hasarlı/reddedilen kalem tespit edildi (${params.wmsTaskNo}).`
                : `Mal kabul kalite kontrolü tam sağlam geçti (${params.wmsTaskNo}).`,
          },
        })
        .catch(() => null)
    }

    // Tedarikçi Skor Kartını mal kabul + kalite muayene verileriyle anında güncelle
    await recalculateSupplierScorecard(po.supplierId, "LIVE")
  }

  return {
    asnUpdatedId: asn?.id ?? null,
    poUpdatedId: po?.id ?? null,
    supplierId: po?.supplierId ?? asn?.supplierId ?? null,
  }
}

export async function receiveAsnIntoWms(
  input: {
    asnId: string
    performedBy: string
    linesOverride?: Array<{
      itemId: string
      receivedGoodQty: number
      damagedQty?: number
      targetBinId?: string | null
      lotNumber?: string | null
      expiryDate?: string | null
      lpnCode?: string | null
    }>
  }
) {
  const asn: any = await prisma.lojistikSupplierAsn.findUnique({
    where: { id: input.asnId },
    include: { lines: true },
  })
  if (!asn) throw new LogisticsDomainError("ASN_NOT_FOUND", "ASN bulunamadı.", 404)
  if (asn.status === "KABUL_TAMAM" || asn.status === "IPTAL") {
    throw new LogisticsDomainError("ASN_CLOSED", `${asn.asnNumber} zaten kapatılmış (${asn.status}).`, 400)
  }

  const supplier = await prisma.supplier.findUnique({ where: { id: asn.supplierId } })
  const overrideMap = new Map((input.linesOverride || []).map((l) => [l.itemId, l]))

  // Döngüsel bağımlılığı önlemek için dinamik import
  const { processGoodsReceiptWithVariance } = await import("@/lib/logistics/wms/operationsEngine")

  const receiptLines = (asn.lines || []).map((al: any) => {
    const ov = overrideMap.get(al.itemId)
    return {
      itemId: al.itemId,
      expectedQty: Number(al.shippedQty),
      receivedGoodQty: ov ? Number(ov.receivedGoodQty) : Number(al.shippedQty),
      damagedQty: ov ? Number(ov.damagedQty || 0) : 0,
      lotNumber: ov?.lotNumber ?? al.lotNumber ?? null,
      expiryDate: ov?.expiryDate ?? (al.expiryDate ? new Date(al.expiryDate).toISOString() : null),
      lpnCode: ov?.lpnCode ?? al.ssccCode ?? null,
      targetBinId: ov?.targetBinId ?? null,
    }
  })

  const wmsResult = await processGoodsReceiptWithVariance({
    warehouseId: asn.warehouseId,
    relatedPoNo: asn.poNumber,
    partnerName: supplier?.name || "Tedarikçi",
    performedBy: input.performedBy,
    asnId: asn.id,
    lines: receiptLines,
  })

  return {
    asnId: asn.id,
    asnNumber: asn.asnNumber,
    poNumber: asn.poNumber,
    ...wmsResult,
  }
}
