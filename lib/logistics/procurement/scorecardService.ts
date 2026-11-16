/**
 * Lojistik Faz 3 — Tedarikçi Performans Skor Kartı Servisi
 *
 * KURALLAR:
 * - Tüm skor metrikleri (OTD%, Miktar Uyum%, Kalite Kabul%, Fiyat Sapma)
 *   yalnızca gerçek veritabanı kayıtlarından (PO, ASN, Üretim Giriş Kalite Muayenesi) hesaplanır.
 * - Ağırlıklar yapılandırılabilir ve toplamı 100 olmak zorundadır.
 * - Tek doğruluk kaynağı: computeCompositeScorecard()
 */

import { prisma } from "@/lib/db"
import { LogisticsDomainError } from "@/lib/logistics/security"
import {
  DEFAULT_SCORECARD_WEIGHTS,
  ScorecardWeightsInput,
  computeCompositeScorecard,
} from "./constantsAndHelpers"

export async function getScorecardConfig() {
  const existing = await prisma.lojistikSupplierScoreConfig.findFirst({
    where: { configKey: "DEFAULT" },
  })
  if (existing) return existing

  return prisma.lojistikSupplierScoreConfig.create({
    data: {
      configKey: "DEFAULT",
      otdWeight: DEFAULT_SCORECARD_WEIGHTS.otdWeight,
      qtyWeight: DEFAULT_SCORECARD_WEIGHTS.qtyWeight,
      qualityWeight: DEFAULT_SCORECARD_WEIGHTS.qualityWeight,
      priceWeight: DEFAULT_SCORECARD_WEIGHTS.priceWeight,
      updatedBy: "SYSTEM",
    },
  })
}

export async function updateScorecardWeights(
  weights: ScorecardWeightsInput,
  actor: string
) {
  const otdWeight = Number(weights.otdWeight)
  const qtyWeight = Number(weights.qtyWeight)
  const qualityWeight = Number(weights.qualityWeight)
  const priceWeight = Number(weights.priceWeight)

  if ([otdWeight, qtyWeight, qualityWeight, priceWeight].some((w) => !Number.isFinite(w) || w < 0)) {
    throw new LogisticsDomainError(
      "INVALID_WEIGHTS",
      "Skor kartı ağırlıkları sıfır veya pozitif geçerli sayılar olmalıdır.",
      400
    )
  }

  const sum = Number((otdWeight + qtyWeight + qualityWeight + priceWeight).toFixed(2))
  if (Math.abs(sum - 100) > 0.01) {
    throw new LogisticsDomainError(
      "WEIGHT_SUM_NOT_100",
      `Skor kartı ağırlık toplamı tam 100 olmalıdır (girilen toplam: ${sum}).`,
      400
    )
  }

  const existing = await prisma.lojistikSupplierScoreConfig.findFirst({
    where: { configKey: "DEFAULT" },
  })

  const config = existing
    ? await prisma.lojistikSupplierScoreConfig.update({
        where: { id: existing.id },
        data: {
          otdWeight,
          qtyWeight,
          qualityWeight,
          priceWeight,
          updatedBy: actor,
        },
      })
    : await prisma.lojistikSupplierScoreConfig.create({
        data: {
          configKey: "DEFAULT",
          otdWeight,
          qtyWeight,
          qualityWeight,
          priceWeight,
          updatedBy: actor,
        },
      })

  const recalculated = await recalculateAllSupplierScorecards("LIVE", config)
  return { config, recalculatedCount: recalculated.length }
}

export async function recalculateSupplierScorecard(
  supplierId: string,
  periodKey: string = "LIVE",
  weightsOverride?: ScorecardWeightsInput
) {
  const supplier = await prisma.supplier.findUnique({ where: { id: supplierId } })
  if (!supplier) {
    throw new LogisticsDomainError("SUPPLIER_NOT_FOUND", "Tedarikçi bulunamadı.", 404)
  }

  const config = weightsOverride ?? (await getScorecardConfig())
  const weights: ScorecardWeightsInput = {
    otdWeight: Number(config.otdWeight),
    qtyWeight: Number(config.qtyWeight),
    qualityWeight: Number(config.qualityWeight),
    priceWeight: Number(config.priceWeight),
  }

  const [pos, qcInspections, items] = await Promise.all([
    prisma.lojistikPurchaseOrder.findMany({
      where: { supplierId },
      include: { lines: true },
    }),
    prisma.uretimQualityInspection.findMany({
      where: { supplierId },
    }),
    prisma.inventoryItem.findMany(),
  ])

  const itemMap = new Map(items.map((it: any) => [it.id, it]))

  // Yalnızca taslak ve iptal dışı PO'lar performans hesabına dahil edilir
  const activePos = pos.filter(
    (po: any) => po.status !== "TASLAK" && po.status !== "IPTAL"
  )

  const deliveredPos = activePos.filter(
    (po: any) =>
      po.actualDeliveryDate != null ||
      ["KISMI_TESLIM", "TESLIM_ALINDI", "TAMAMLANDI"].includes(po.status)
  )

  let onTimePoCount = 0
  let latePoCount = 0
  let totalOrderedQty = 0
  let totalAbsQtyVariance = 0
  let totalReceivedPhysicalQty = 0
  let totalRejectedQty = 0
  let baselineTotalCost = 0
  let agreedTotalCost = 0

  const deliveredPoIds = new Set<string>()

  for (const po of deliveredPos) {
    deliveredPoIds.add(po.id)
    const expectedMs = new Date(po.expectedDeliveryDate).getTime()
    const actualMs = new Date(po.actualDeliveryDate || po.updatedAt || Date.now()).getTime()
    // 24 saatlik gün sonu toleransı olmaksızın tarihsel OTD kontrolü
    if (actualMs <= expectedMs + 86_400_000 * 0) {
      onTimePoCount++
    } else {
      latePoCount++
    }

    const poLines = Array.isArray((po as any).lines) ? (po as any).lines : []
    for (const line of poLines) {
      const ordQty = Math.max(0, Number(line.orderedQty || 0))
      const recGood = Math.max(0, Number(line.receivedQty || 0))
      const rejQty = Math.max(0, Number(line.rejectedQty || 0))
      const physical = recGood + rejQty

      totalOrderedQty += ordQty
      totalAbsQtyVariance += Math.abs(physical - ordQty)
      totalReceivedPhysicalQty += physical
      totalRejectedQty += rejQty

      const item = itemMap.get(line.itemId)
      const baselineUnit =
        Number(line.baselineUnitCost || 0) > 0
          ? Number(line.baselineUnitCost)
          : Number(item?.standardCost || line.agreedUnitPrice || 0)
      const agreedUnit = Number(line.agreedUnitPrice || baselineUnit)

      baselineTotalCost += ordQty * baselineUnit
      agreedTotalCost += ordQty * agreedUnit
    }
  }

  // Fiyat kıyası henüz teslim edilmemiş onaylı/gönderilmiş PO satırlarını da içersin (teslim edilmiş yoksa veya genel anlaşma sapması için)
  if (deliveredPos.length === 0) {
    for (const po of activePos) {
      const poLines = Array.isArray((po as any).lines) ? (po as any).lines : []
      for (const line of poLines) {
        const ordQty = Math.max(0, Number(line.orderedQty || 0))
        const item = itemMap.get(line.itemId)
        const baselineUnit =
          Number(line.baselineUnitCost || 0) > 0
            ? Number(line.baselineUnitCost)
            : Number(item?.standardCost || line.agreedUnitPrice || 0)
        baselineTotalCost += ordQty * baselineUnit
        agreedTotalCost += ordQty * Number(line.agreedUnitPrice || baselineUnit)
      }
    }
  }

  // Üretim Modülü Mal Kabul ve İade (RECEIVING / RETURN_RMA) Kalite Muayenelerini gerçek veri olarak entegre et
  const receivingQcs = qcInspections.filter(
    (q: any) =>
      (q.inspectionType === "RECEIVING" || q.inspectionType === "RETURN_RMA" || !q.inspectionType) &&
      q.status !== "CANCELLED"
  )

  for (const qc of receivingQcs) {
    const batchQty = Math.max(0, Number(qc.batchQuantity || 0))
    const defects = Math.max(0, Number(qc.totalDefects || 0))
    const qcRejected =
      qc.status === "REJECTED"
        ? Math.max(batchQty, defects)
        : qc.status === "CONDITIONAL_PASSED"
          ? defects > 0
            ? Math.min(batchQty, defects)
            : Number((batchQty * 0.05).toFixed(2))
          : Math.min(batchQty, defects)

    // PO bağlantılı olmayan muayeneler veya PO'da henüz rejected yazılmamış muayeneler
    const linkedToDeliveredPo = qc.purchaseOrderId && deliveredPoIds.has(qc.purchaseOrderId)
    if (!linkedToDeliveredPo && batchQty > 0) {
      totalReceivedPhysicalQty += batchQty
      totalRejectedQty += qcRejected
    } else if (linkedToDeliveredPo && qcRejected > 0 && totalRejectedQty === 0) {
      totalRejectedQty += qcRejected
      if (totalReceivedPhysicalQty === 0) {
        totalReceivedPhysicalQty += batchQty
      }
    }
  }

  const computed = computeCompositeScorecard({
    onTimeCount: onTimePoCount,
    deliveredCount: deliveredPos.length,
    totalOrderedQty,
    totalAbsQtyVariance,
    totalReceivedPhysicalQty,
    totalRejectedQty,
    baselineTotalCost,
    agreedTotalCost,
    weights,
  })

  const existingSnap = await prisma.lojistikSupplierScoreSnapshot.findFirst({
    where: { supplierId, periodKey },
  })

  const snapData = {
    supplierId,
    periodKey,
    otdRate: computed.otdRate,
    qtyComplianceRate: computed.qtyComplianceRate,
    qualityAcceptanceRate: computed.qualityAcceptanceRate,
    priceVarianceScore: computed.priceVarianceScore,
    avgPriceVariancePct: computed.avgPriceVariancePct,
    compositeScore: computed.compositeScore,
    tier: computed.tier,
    poCount: deliveredPos.length,
    onTimePoCount,
    latePoCount,
    totalOrderedQty: Number(totalOrderedQty.toFixed(2)),
    totalReceivedQty: Number(totalReceivedPhysicalQty.toFixed(2)),
    totalRejectedQty: Number(totalRejectedQty.toFixed(2)),
    calculatedAt: new Date(),
    notes:
      deliveredPos.length > 0
        ? `${deliveredPos.length} teslim edilmiş PO ve ${receivingQcs.length} kalite muayenesi üzerinden canlı hesaplandı.`
        : "Henüz kapanmış teslimat bulunmuyor (baz skor 100).",
  }

  const snapshot = existingSnap
    ? await prisma.lojistikSupplierScoreSnapshot.update({
        where: { id: existingSnap.id },
        data: snapData,
      })
    : await prisma.lojistikSupplierScoreSnapshot.create({
        data: snapData,
      })

  if (periodKey === "LIVE") {
    await prisma.supplier.update({
      where: { id: supplierId },
      data: {
        scorecardScore: computed.compositeScore,
        scorecardTier: computed.tier,
        onTimeDeliveryRate: computed.otdRate,
        qualityAcceptance: computed.qualityAcceptanceRate,
        rating: Number(Math.max(1, Math.min(5, computed.compositeScore / 20)).toFixed(2)),
      },
    })
  }

  return snapshot
}

export async function recalculateAllSupplierScorecards(
  periodKey: string = "LIVE",
  weightsOverride?: ScorecardWeightsInput
) {
  const suppliers = await prisma.supplier.findMany()
  const config = weightsOverride ?? (await getScorecardConfig())
  const results = []
  for (const sup of suppliers) {
    const snap = await recalculateSupplierScorecard(sup.id, periodKey, {
      otdWeight: Number(config.otdWeight),
      qtyWeight: Number(config.qtyWeight),
      qualityWeight: Number(config.qualityWeight),
      priceWeight: Number(config.priceWeight),
    })
    results.push(snap)
  }
  return results
}

export async function getSupplierScorecardsSummary() {
  const [config, suppliers, snapshots] = await Promise.all([
    getScorecardConfig(),
    prisma.supplier.findMany({ orderBy: { name: "asc" } }),
    prisma.lojistikSupplierScoreSnapshot.findMany({
      orderBy: { periodKey: "asc" },
    }),
  ])

  const supMap = new Map(suppliers.map((s: any) => [s.id, s]))

  const liveSnapshots = snapshots
    .filter((s: any) => s.periodKey === "LIVE")
    .map((s: any) => {
      const sup = supMap.get(s.supplierId)
      return {
        ...s,
        supplierCode: sup?.code ?? "-",
        supplierName: sup?.name ?? "-",
        category: sup?.category ?? "GENEL",
        approvalStatus: sup?.approvalStatus ?? "ONAYLI",
        criticalityLevel: sup?.criticalityLevel ?? "ORTA",
      }
    })
    .sort((a: any, b: any) => Number(b.compositeScore) - Number(a.compositeScore))

  const historyBySupplier: Record<string, any[]> = {}
  const monthlyTrendMap = new Map<
    string,
    { periodKey: string; sumComposite: number; sumOtd: number; sumQuality: number; count: number }
  >()

  for (const snap of snapshots) {
    if (snap.periodKey === "LIVE") continue
    if (!historyBySupplier[snap.supplierId]) {
      historyBySupplier[snap.supplierId] = []
    }
    historyBySupplier[snap.supplierId].push(snap)

    const cur = monthlyTrendMap.get(snap.periodKey) || {
      periodKey: snap.periodKey,
      sumComposite: 0,
      sumOtd: 0,
      sumQuality: 0,
      count: 0,
    }
    cur.sumComposite += Number(snap.compositeScore || 0)
    cur.sumOtd += Number(snap.otdRate || 0)
    cur.sumQuality += Number(snap.qualityAcceptanceRate || 0)
    cur.count += 1
    monthlyTrendMap.set(snap.periodKey, cur)
  }

  const monthlyTrend = Array.from(monthlyTrendMap.values())
    .sort((a, b) => a.periodKey.localeCompare(b.periodKey))
    .map((m) => ({
      periodKey: m.periodKey,
      avgCompositeScore: Number((m.sumComposite / Math.max(1, m.count)).toFixed(1)),
      avgOtdRate: Number((m.sumOtd / Math.max(1, m.count)).toFixed(1)),
      avgQualityRate: Number((m.sumQuality / Math.max(1, m.count)).toFixed(1)),
      supplierCount: m.count,
    }))

  const activeLive = liveSnapshots.filter((s: any) => s.approvalStatus !== "KARALISTE")
  const avgComposite =
    activeLive.length > 0
      ? Number(
          (
            activeLive.reduce((acc: number, s: any) => acc + Number(s.compositeScore || 0), 0) /
            activeLive.length
          ).toFixed(1)
        )
      : 0

  return {
    config,
    liveSnapshots,
    historyBySupplier,
    monthlyTrend,
    avgComposite,
    tierCounts: {
      A: liveSnapshots.filter((s: any) => s.tier === "A").length,
      B: liveSnapshots.filter((s: any) => s.tier === "B").length,
      C: liveSnapshots.filter((s: any) => s.tier === "C").length,
      D: liveSnapshots.filter((s: any) => s.tier === "D").length,
    },
  }
}
