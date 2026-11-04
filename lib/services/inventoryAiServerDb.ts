/**
 * FAZ 4: Sunucu Tarafı Gerçek Veritabanı (Prisma) Yapay Zekâ & Analitik Servisi
 * Tüm AI tahminleme (Foresight), yönetici anlatı raporları (Narrative), ana stok ekranı
 * 2 cümlelik yönetici özeti bandı ve "Ask Me Anything" (AMA) doğal dil sorgularını
 * gerçek Prisma tablolarından besler.
 */

import { prisma } from "@/lib/db"
import { seedRealisticInventoryData } from "./inventoryServerDb"
import {
  type AiDatabaseDataset,
  computeRealForesightForecasts,
  computeExecutiveAiBanner,
  computeRealNarrativeReports,
  executeRealDatabaseAmaQuery
} from "./inventoryAiEngine"

/**
 * Veritabanındaki tüm ilgili stok, hareket, bakiye, lot/SKT, maliyet ve sipariş tablolarını çeker
 */
export async function loadAiDatabaseDataset(): Promise<AiDatabaseDataset> {
  // İlk çalışmada veritabanı boşsa gerçekçi KOBİ başlangıç verisini garanti altına al
  await seedRealisticInventoryData().catch(() => null)

  const [
    items,
    warehouses,
    stockBalances,
    stockMovements,
    lotSerialRecords,
    costLayers,
    consignmentStocks,
    purchaseRequisitions,
    omnichannelOrders
  ] = await Promise.all([
    (prisma as any).inventoryItem.findMany({ orderBy: { createdAt: "asc" } }).catch(() => []),
    (prisma as any).warehouse.findMany({ orderBy: { createdAt: "asc" } }).catch(() => []),
    (prisma as any).stockBalance.findMany().catch(() => []),
    (prisma as any).stockMovement.findMany({ orderBy: { createdAt: "desc" } }).catch(() => []),
    (prisma as any).lotSerialRecord.findMany({ orderBy: { expiryDate: "asc" } }).catch(() => []),
    (prisma as any).costLayer.findMany({ where: { isExhausted: false } }).catch(() => []),
    (prisma as any).consignmentStock.findMany().catch(() => []),
    (prisma as any).purchaseRequisition
      .findMany({ include: { lines: true }, orderBy: { createdAt: "desc" } })
      .catch(() => []),
    (prisma as any).omnichannelOrder
      .findMany({ include: { shipmentLines: true }, orderBy: { createdAt: "desc" } })
      .catch(() => [])
  ])

  return {
    items: items || [],
    warehouses: warehouses || [],
    stockBalances: stockBalances || [],
    stockMovements: stockMovements || [],
    lotSerialRecords: lotSerialRecords || [],
    costLayers: costLayers || [],
    consignmentStocks: consignmentStocks || [],
    purchaseRequisitions: purchaseRequisitions || [],
    omnichannelOrders: omnichannelOrders || []
  }
}

/**
 * Tüm AI analiz paketini (Tahminler, Yönetici Özeti Bandı, Anlatı Raporları, Varsayılan AMA Sorgusu) döndürür
 */
export async function getInventoryAiDashboardFromDb(initialQuestion?: string) {
  const dataset = await loadAiDatabaseDataset()
  const forecasts = computeRealForesightForecasts(dataset)
  const executiveBanner = computeExecutiveAiBanner(dataset, forecasts)
  const narrativeReports = computeRealNarrativeReports(dataset, forecasts)
  const defaultAmaResult = executeRealDatabaseAmaQuery(
    initialQuestion || "Hangi ürünlerde kritik stok (ROP altı) ve tükenme riski var?",
    dataset,
    forecasts
  )

  return {
    forecasts,
    executiveBanner,
    narrativeReports,
    defaultAmaResult,
    meta: {
      totalItemsAnalyzed: forecasts.length,
      totalMovementsAnalyzed: dataset.stockMovements.length,
      totalLotsAnalyzed: dataset.lotSerialRecords.length,
      totalWarehouses: dataset.warehouses.length
    }
  }
}

/**
 * Doğal dil (AMA) sorusunu gerçek Prisma verileri üzerinde çalıştırır
 */
export async function runRealAmaQueryOnDb(question: string) {
  const dataset = await loadAiDatabaseDataset()
  const forecasts = computeRealForesightForecasts(dataset)
  return executeRealDatabaseAmaQuery(question, dataset, forecasts)
}

/**
 * AI önerisinden tek tıkla gerçek Satın Alma Talebi (PurchaseRequisition) oluşturur
 */
export async function createPurchaseRequisitionFromAiRecommendation(params: {
  itemId?: string
  sku: string
  itemName: string
  recommendedQty: number
  unit: string
  unitCostTry?: number
  reason?: string
}) {
  const reqNo = `PR-AI-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 8999)}`
  const qty = Math.max(1, Number(params.recommendedQty || 10))
  const unitCost = Number(params.unitCostTry || 250)
  const totalCost = Math.round(qty * unitCost * 100) / 100

  let itemRecord = null
  if (params.itemId) {
    itemRecord = await (prisma as any).inventoryItem
      .findUnique({ where: { id: params.itemId } })
      .catch(() => null)
  }
  if (!itemRecord && params.sku) {
    itemRecord = await (prisma as any).inventoryItem
      .findFirst({ where: { sku: params.sku } })
      .catch(() => null)
  }

  const resolvedItemId = itemRecord?.id || params.itemId || "item-ai-req"

  const pr = await (prisma as any).purchaseRequisition.create({
    data: {
      requisitionNo: reqNo,
      sourceType: "AI_FORESIGHT_RECOMMENDATION",
      priority: "HIGH",
      status: "PENDING_APPROVAL",
      requestedBy: "ForesightAI Otomatik Planlama",
      department: "Stok & Tedarik Zinciri",
      neededByDate: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000),
      estimatedTotalCost: totalCost,
      currency: "TRY",
      notes:
        params.reason ||
        `AI Talep Tahmin Motoru tarafından kritik stok / 30 günlük talep tahmini baz alınarak oluşturuldu (${params.sku}).`,
      lines: {
        create: [
          {
            itemId: resolvedItemId,
            sku: params.sku,
            itemName: params.itemName,
            requestedQty: qty,
            unit: params.unit || itemRecord?.baseUnit || "Adet",
            estimatedUnitCost: unitCost,
            estimatedLineTotal: totalCost,
            reason: "AI 30 Günlük Talep & Kritik Stok Tamamlama"
          }
        ]
      }
    },
    include: { lines: true }
  })

  return pr
}

