/**
 * SUNUM ERP – Üretim Yönetim Sistemi (Faz 4)
 * MRP (Malzeme İhtiyaç Planlaması) & MPS (Ana Üretim Çizelgesi) Veritabanı Orkestrasyon ve CRUD Servisi
 *
 * - Eşzamanlı MRP çalıştırma koruması (Concurrent run lock)
 * - MPS Planı ve What-If Senaryo Yönetimi (Dondurulmuş ufuk denetimi)
 * - Otomatik Satınalma Talebi (PurchaseRequisition) dönüştürme
 * - Faz 5 İş Emri arayüzü ile uyumlu sözleşme
 * - Aksiyon mesajları ve Pegging (ihtiyaç kaynağı) sorgulama
 */

import { prisma } from "@/lib/db"
import { ProductionDomainError } from "./productionAuditAndError"
import {
  calculateLowLevelCodes,
  calculateMpsMatrix,
  compareWhatIfMpsScenarios,
  executeMrpExplosion,
  offsetWorkDays,
  type BomEdge,
  type IndependentDemandInput,
  type ItemPlanningProfile,
  type MpsBucketInput,
  type MpsCalculatedBucket,
  type MrpActionType,
  type MrpOrderType,
  type MrpRunType,
  type OpenSupplyOrder,
  type WorkCalendarConfig,
} from "./productionMrpMpsEngine"

// ─────────────────────────────────────────────────────────────
// 1. MPS (ANA ÜRETİM ÇİZELGESİ) PLANI İŞLEMLERİ
// ─────────────────────────────────────────────────────────────

export interface ListMpsPlansParams {
  branchId?: string | null
  status?: string
  isWhatIfScenario?: boolean | string
  search?: string
  page?: number | string
  pageSize?: number | string
}

export async function listMpsPlansFromDb(params: ListMpsPlansParams = {}) {
  const page = Math.max(1, parseInt(String(params.page || "1"), 10))
  const pageSize = Math.min(100, Math.max(1, parseInt(String(params.pageSize || "20"), 10)))
  const skip = (page - 1) * pageSize

  const where: any = {}
  if (params.branchId) {
    where.OR = [{ branchId: params.branchId }, { branchId: null }]
  }
  if (params.status && params.status !== "ALL") {
    where.status = params.status
  }
  if (params.isWhatIfScenario !== undefined && params.isWhatIfScenario !== "") {
    where.isWhatIfScenario = String(params.isWhatIfScenario) === "true"
  }
  if (params.search) {
    where.OR = [
      { code: { contains: params.search, mode: "insensitive" } },
      { name: { contains: params.search, mode: "insensitive" } },
      { scenarioName: { contains: params.search, mode: "insensitive" } },
    ]
  }

  const [plans, total] = await Promise.all([
    (prisma as any).uretimMpsPlan.findMany({
      where,
      skip,
      take: pageSize,
      orderBy: { createdAt: "desc" },
      include: {
        _count: { select: { items: true, mrpRuns: true } },
      },
    }),
    (prisma as any).uretimMpsPlan.count({ where }),
  ])

  return {
    plans,
    pagination: {
      page,
      pageSize,
      total,
      totalPages: Math.ceil(total / pageSize),
    },
  }
}

export async function getMpsPlanById(id: string) {
  const plan = await (prisma as any).uretimMpsPlan.findUnique({
    where: { id },
    include: {
      items: {
        include: { item: true },
        orderBy: [{ itemId: "asc" }, { periodIndex: "asc" }],
      },
      mrpRuns: {
        orderBy: { createdAt: "desc" },
        take: 5,
      },
    },
  })

  if (!plan) {
    throw new ProductionDomainError("NOT_FOUND", `MPS Planı bulunamadı (ID: ${id})`)
  }

  return plan
}

export interface CreateMpsPlanInput {
  branchId?: string | null
  code: string
  name: string
  revision?: string
  bucketType?: "DAILY" | "WEEKLY" | "MONTHLY"
  horizonDays?: number
  frozenDays?: number
  isWhatIfScenario?: boolean
  scenarioName?: string | null
  basePlanId?: string | null
  notes?: string | null
}

export async function createMpsPlan(input: CreateMpsPlanInput) {
  if (!input.code || !input.name) {
    throw new ProductionDomainError("VALIDATION_ERROR", "MPS Plan kodu ve adı zorunludur.")
  }

  const existing = await (prisma as any).uretimMpsPlan.findUnique({
    where: { code: input.code.trim() },
  })

  if (existing) {
    throw new ProductionDomainError("CONFLICT", `Bu plan kodu zaten kullanılıyor: ${input.code}`)
  }

  const plan = await (prisma as any).uretimMpsPlan.create({
    data: {
      branchId: input.branchId || null,
      code: input.code.trim().toUpperCase(),
      name: input.name.trim(),
      revision: input.revision || "1.0",
      status: "DRAFT",
      bucketType: input.bucketType || "WEEKLY",
      horizonDays: input.horizonDays ? Math.max(7, input.horizonDays) : 90,
      frozenDays: input.frozenDays !== undefined ? Math.max(0, input.frozenDays) : 14,
      isWhatIfScenario: !!input.isWhatIfScenario,
      scenarioName: input.scenarioName || null,
      basePlanId: input.basePlanId || null,
      notes: input.notes || null,
    },
  })

  return plan
}

export async function approveMpsPlan(id: string, approvedBy: string) {
  const plan = await getMpsPlanById(id)

  if (plan.status === "APPROVED") {
    return plan
  }

  // Eğer bu onaylanan ana bir plansa (senaryo değilse), aynı şubedeki önceki onaylı ana planı OBSOLETE yap
  if (!plan.isWhatIfScenario) {
    await (prisma as any).uretimMpsPlan.updateMany({
      where: {
        branchId: plan.branchId,
        status: "APPROVED",
        isWhatIfScenario: false,
        id: { not: id },
      },
      data: { status: "OBSOLETE" },
    })
  }

  const updated = await (prisma as any).uretimMpsPlan.update({
    where: { id },
    data: {
      status: "APPROVED",
      approvedBy,
      approvedAt: new Date(),
    },
  })

  return updated
}

export async function cloneMpsPlanScenario(
  basePlanId: string,
  scenarioName: string,
  forecastMultiplier: number = 1.0
) {
  const basePlan = await getMpsPlanById(basePlanId)

  const newCode = `${basePlan.code}-SCEN-${Date.now().toString().slice(-4)}`
  const clonedPlan = await (prisma as any).uretimMpsPlan.create({
    data: {
      branchId: basePlan.branchId,
      code: newCode,
      name: `${basePlan.name} (${scenarioName})`,
      revision: `${basePlan.revision}-S`,
      status: "DRAFT",
      bucketType: basePlan.bucketType,
      horizonDays: basePlan.horizonDays,
      frozenDays: basePlan.frozenDays,
      isWhatIfScenario: true,
      scenarioName,
      basePlanId: basePlan.id,
      notes: `${basePlan.code} planından kopyalandı. Talep çarpanı: %${Math.round(forecastMultiplier * 100)}`,
    },
  })

  // Satırları klonla ve çarpanı uygula
  if (basePlan.items && basePlan.items.length > 0) {
    for (const item of basePlan.items) {
      const forecastQty = Number(((item.forecastQty || 0) * forecastMultiplier).toFixed(4))
      const gross = Math.max(forecastQty, item.salesOrderQty || 0)

      await (prisma as any).uretimMpsPlanItem.create({
        data: {
          mpsPlanId: clonedPlan.id,
          itemId: item.itemId,
          periodIndex: item.periodIndex,
          periodStartDate: item.periodStartDate,
          periodEndDate: item.periodEndDate,
          forecastQty,
          salesOrderQty: item.salesOrderQty,
          grossRequirement: gross,
          scheduledReceipts: item.scheduledReceipts,
          plannedProductionQty: item.plannedProductionQty,
          projectedOnHand: item.projectedOnHand,
          atpQty: item.atpQty,
          notes: item.notes,
        },
      })
    }
  }

  return getMpsPlanById(clonedPlan.id)
}

export interface SaveMpsItemsInput {
  mpsPlanId: string
  items: Array<{
    id?: string
    itemId: string
    periodIndex: number
    periodStartDate: string | Date
    periodEndDate: string | Date
    forecastQty: number
    salesOrderQty?: number
    scheduledReceipts?: number
    plannedProductionQty?: number
    notes?: string
  }>
  overrideFrozenHorizon?: boolean
}

export async function saveMpsPlanItems(input: SaveMpsItemsInput) {
  const plan = await getMpsPlanById(input.mpsPlanId)

  const planStart = plan.createdAt ? new Date(plan.createdAt) : new Date()
  const frozenCutoff = new Date(planStart.getTime() + plan.frozenDays * 86400000)

  // Dondurulmuş ufuk kontrolü
  if (!input.overrideFrozenHorizon && plan.status === "APPROVED") {
    for (const it of input.items) {
      const pStart = new Date(it.periodStartDate)
      if (pStart.getTime() <= frozenCutoff.getTime()) {
        throw new ProductionDomainError(
          "VALIDATION_ERROR",
          `Dondurulmuş ufuk (${plan.frozenDays} gün) içerisindeki dönemler onaylı planda değiştirilemez. Değiştirmek için 'overrideFrozenHorizon' onayı gereklidir.`
        )
      }
    }
  }

  // Mevcut satırları güncelle veya ekle
  for (const it of input.items) {
    const pStart = new Date(it.periodStartDate)
    const pEnd = new Date(it.periodEndDate)
    const gross = Math.max(it.forecastQty || 0, it.salesOrderQty || 0)

    const existingLine = (plan.items || []).find(
      (pi: any) => pi.itemId === it.itemId && pi.periodIndex === it.periodIndex
    )

    if (existingLine) {
      await (prisma as any).uretimMpsPlanItem.update({
        where: { id: existingLine.id },
        data: {
          periodStartDate: pStart,
          periodEndDate: pEnd,
          forecastQty: it.forecastQty,
          salesOrderQty: it.salesOrderQty ?? existingLine.salesOrderQty,
          grossRequirement: gross,
          scheduledReceipts: it.scheduledReceipts ?? existingLine.scheduledReceipts,
          plannedProductionQty: it.plannedProductionQty ?? existingLine.plannedProductionQty,
          notes: it.notes ?? existingLine.notes,
        },
      })
    } else {
      await (prisma as any).uretimMpsPlanItem.create({
        data: {
          mpsPlanId: plan.id,
          itemId: it.itemId,
          periodIndex: it.periodIndex,
          periodStartDate: pStart,
          periodEndDate: pEnd,
          forecastQty: it.forecastQty,
          salesOrderQty: it.salesOrderQty || 0,
          grossRequirement: gross,
          scheduledReceipts: it.scheduledReceipts || 0,
          plannedProductionQty: it.plannedProductionQty || 0,
          projectedOnHand: 0,
          atpQty: 0,
          notes: it.notes || null,
        },
      })
    }
  }

  return getMpsPlanById(plan.id)
}

// ─────────────────────────────────────────────────────────────
// 2. MPS GRID VE MATRİS HESAPLAMA SORGUSU
// ─────────────────────────────────────────────────────────────

export async function getMpsGridData(mpsPlanId: string) {
  const plan = await getMpsPlanById(mpsPlanId)

  // Planlanan mamulleri ve stok profillerini çek
  const itemIds = Array.from(new Set((plan.items || []).map((it: any) => it.itemId)))

  const inventoryItems = await (prisma as any).inventoryItem.findMany({
    where: { id: { in: itemIds } },
    include: {
      uretimProfile: true,
      stockBalances: true,
    },
  })

  const itemMap = new Map<string, any>()
  inventoryItems.forEach((it: any) => itemMap.set(it.id, it))

  const gridResults: any[] = []

  for (const itemId of itemIds) {
    const rawItem = itemMap.get(itemId)
    if (!rawItem) continue

    const profile = rawItem.uretimProfile || {}
    const onHand = (rawItem.stockBalances || []).reduce((s: number, b: any) => s + (b.availableQty || 0), 0)

    const itemPlanningProfile: ItemPlanningProfile = {
      itemId: rawItem.id,
      sku: rawItem.sku,
      name: rawItem.name,
      baseUnit: rawItem.baseUnit || "Adet",
      productionItemType: profile.productionItemType || "MAMUL",
      productionMethod: profile.productionMethod || "MAKE_TO_STOCK",
      leadTimeDays: profile.leadTimeDays || 3,
      safetyStockQty: profile.safetyStockQty || 0,
      minStockLevel: profile.minStockLevel || 0,
      lotSizingRule: profile.lotSizingRule || "L4L",
      standardLotSize: profile.standardLotSize || 1,
      minOrderQty: profile.minOrderQty || 1,
      orderMultiple: profile.orderMultiple || 1,
      currentOnHand: onHand,
    }

    const itemBuckets: MpsBucketInput[] = (plan.items || [])
      .filter((pi: any) => pi.itemId === itemId)
      .sort((a: any, b: any) => a.periodIndex - b.periodIndex)
      .map((pi: any) => ({
        periodIndex: pi.periodIndex,
        periodStartDate: pi.periodStartDate,
        periodEndDate: pi.periodEndDate,
        forecastQty: pi.forecastQty,
        salesOrderQty: pi.salesOrderQty,
        scheduledReceipts: pi.scheduledReceipts,
        manualPlannedProduction: pi.plannedProductionQty > 0 ? pi.plannedProductionQty : undefined,
      }))

    const calculatedMatrix = calculateMpsMatrix(itemPlanningProfile, itemBuckets, {
      frozenDays: plan.frozenDays,
      planStartDate: plan.createdAt,
    })

    gridResults.push({
      item: {
        id: rawItem.id,
        sku: rawItem.sku,
        name: rawItem.name,
        baseUnit: rawItem.baseUnit,
        currentOnHand: onHand,
        safetyStockQty: itemPlanningProfile.safetyStockQty,
        leadTimeDays: itemPlanningProfile.leadTimeDays,
        lotSizingRule: itemPlanningProfile.lotSizingRule,
      },
      matrix: calculatedMatrix,
    })
  }

  return {
    plan: {
      id: plan.id,
      code: plan.code,
      name: plan.name,
      status: plan.status,
      bucketType: plan.bucketType,
      frozenDays: plan.frozenDays,
      horizonDays: plan.horizonDays,
      isWhatIfScenario: plan.isWhatIfScenario,
      scenarioName: plan.scenarioName,
      createdAt: plan.createdAt,
    },
    grid: gridResults,
  }
}

// ─────────────────────────────────────────────────────────────
// 3. MRP ÇALIŞTIRMA & VERİTABANI İLE SENKRONİZASYON
// ─────────────────────────────────────────────────────────────

export interface RunMrpParams {
  branchId?: string | null
  mpsPlanId?: string | null
  runType?: "FULL_REGENERATION" | "NET_CHANGE"
  triggeredBy?: string
  filterItemIds?: string[]
}

export async function runMrpProcess(params: RunMrpParams) {
  // 1. EŞZAMANLI ÇALIŞTIRMA KİLİDİ (Concurrent Run Lock)
  const activeRuns = await (prisma as any).uretimMrpRun.findMany({
    where: {
      status: "RUNNING",
    },
    orderBy: { startedAt: "desc" },
  })

  // Eğer son 15 dakika içinde başlamış bir koşu varsa engelle, daha eskileri zaman aşımı (stale) kabul et
  const fifteenMinutesAgo = new Date(Date.now() - 15 * 60 * 1000)
  const staleRuns = activeRuns.filter((r: any) => new Date(r.startedAt).getTime() <= fifteenMinutesAgo.getTime())
  const validRunning = activeRuns.filter((r: any) => new Date(r.startedAt).getTime() > fifteenMinutesAgo.getTime())

  if (staleRuns.length > 0) {
    for (const stale of staleRuns) {
      await (prisma as any).uretimMrpRun.update({
        where: { id: stale.id },
        data: {
          status: "FAILED",
          errorMessage: "Zaman aşımı nedeniyle sistem tarafından sonlandırıldı.",
          completedAt: new Date(),
        },
      })
    }
  }

  if (validRunning.length > 0) {
    throw new ProductionDomainError(
      "CONFLICT",
      `Şu anda devam eden bir MRP çalıştırması mevcuttur (Kod: ${validRunning[0].runCode}). Lütfen tamamlanmasını bekleyiniz.`
    )
  }

  // 2. MRP Koşu Kaydı Oluştur
  const runCode = `MRP-${Date.now().toString().slice(-6)}`
  const mrpRun = await (prisma as any).uretimMrpRun.create({
    data: {
      branchId: params.branchId || null,
      mpsPlanId: params.mpsPlanId || null,
      runCode,
      runType: params.runType || "FULL_REGENERATION",
      status: "RUNNING",
      triggeredBy: params.triggeredBy || "SYSTEM",
      parametersJson: JSON.stringify({
        mpsPlanId: params.mpsPlanId,
        runType: params.runType,
        filterItemIds: params.filterItemIds,
      }),
    },
  })

  try {
    // 3. Veritabanından Malzemeleri, BOM'ları, Stok Bakiyelerini ve Açık Siparişleri Topla
    const [allInventoryItems, allBomHeaders, allBomComponents, openSalesOrders, openRequisitions] =
      await Promise.all([
        (prisma as any).inventoryItem.findMany({
          include: {
            uretimProfile: true,
            stockBalances: true,
          },
        }),
        (prisma as any).uretimBomHeader.findMany({
          where: { isActive: true, status: "APPROVED" },
          include: {
            components: {
              include: { substitutes: true },
            },
          },
        }),
        (prisma as any).uretimBomItem.findMany({
          include: { substitutes: true },
        }),
        (prisma as any).order ? (prisma as any).order.findMany({
          where: { status: { in: ["pending", "approved", "in-progress"] } },
          include: { items: true },
        }) : Promise.resolve([]),
        (prisma as any).purchaseRequisition ? (prisma as any).purchaseRequisition.findMany({
          where: { status: { in: ["PENDING", "APPROVED", "ORDERED"] } },
          include: { lines: true },
        }) : Promise.resolve([]),
      ])

    // Malzeme Profillerini Dönüştür
    const itemPlanningProfiles: ItemPlanningProfile[] = allInventoryItems.map((raw: any) => {
      const prof = raw.uretimProfile || {}
      const onHand = (raw.stockBalances || []).reduce((s: number, b: any) => s + (b.availableQty || 0), 0)
      return {
        itemId: raw.id,
        sku: raw.sku,
        name: raw.name,
        baseUnit: raw.baseUnit || "Adet",
        productionItemType: prof.productionItemType || "MAMUL",
        productionMethod: prof.productionMethod || "MAKE_TO_STOCK",
        leadTimeDays: prof.leadTimeDays || 3,
        safetyStockQty: prof.safetyStockQty || 0,
        minStockLevel: prof.minStockLevel || 0,
        lotSizingRule: prof.lotSizingRule || "L4L",
        standardLotSize: prof.standardLotSize || 1,
        minOrderQty: prof.minOrderQty || 1,
        orderMultiple: prof.orderMultiple || 1,
        currentOnHand: onHand,
        defaultSupplierId: raw.supplierId || null,
        defaultBomId: prof.defaultBomId || null,
        defaultRoutingId: null,
      }
    })

    // BOM Ağaç Kenarlarını Dönüştür
    const bomEdges: BomEdge[] = []
    for (const bHeader of allBomHeaders) {
      for (const comp of bHeader.components || []) {
        bomEdges.push({
          bomId: bHeader.id,
          parentItemId: bHeader.finishedItemId,
          componentItemId: comp.componentItemId,
          quantity: comp.quantity,
          unit: comp.unit,
          scrapPercent: comp.scrapPercent || 0,
          isPhantom: comp.isPhantom || false,
          substitutes: (comp.substitutes || []).map((s: any) => ({
            substituteItemId: s.substituteItemId,
            priority: s.priority || 1,
            substitutionRatio: s.substitutionRatio || 1.0,
          })),
        })
      }
    }

    // Talepleri Topla: Varsa MPS planı girdileri veya doğrudan müşteri siparişleri
    const demands: IndependentDemandInput[] = []

    if (params.mpsPlanId) {
      const mpsPlan = await getMpsPlanById(params.mpsPlanId)
      for (const pi of mpsPlan.items || []) {
        const gross = pi.grossRequirement || Math.max(pi.forecastQty || 0, pi.salesOrderQty || 0)
        if (gross > 0) {
          demands.push({
            id: pi.id,
            demandType: "MPS",
            demandRef: `${mpsPlan.code}-P${pi.periodIndex}`,
            itemId: pi.itemId,
            quantity: gross,
            dueDate: pi.periodStartDate,
          })
        }
      }
    } else {
      // MPS seçilmemişse açık müşteri siparişlerini baz al
      for (const order of openSalesOrders) {
        for (const line of order.items || []) {
          demands.push({
            id: line.id || order.id,
            demandType: "SALES_ORDER",
            demandRef: order.orderNumber || order.id,
            itemId: line.itemId || line.productId,
            quantity: line.quantity || 1,
            dueDate: order.deliveryDate || new Date(Date.now() + 7 * 86400000),
          })
        }
      }
    }

    // Açık Tedarik Siparişlerini Topla
    const openOrders: OpenSupplyOrder[] = []
    for (const req of openRequisitions) {
      for (const line of req.lines || []) {
        openOrders.push({
          id: line.id,
          orderNumber: req.reqNumber || req.id,
          itemId: line.itemId,
          orderType: "PURCHASE",
          quantity: line.quantity,
          dueDate: req.expectedDate || new Date(Date.now() + 5 * 86400000),
          status: req.status,
        })
      }
    }

    // 4. Saf Matematik Motorunu Çalıştır
    const explosionResult = executeMrpExplosion({
      items: itemPlanningProfiles,
      bomEdges,
      demands,
      openOrders,
      runType: params.runType || "FULL_REGENERATION",
      filterItemIds: params.filterItemIds,
      today: new Date(),
    })

    // 5. Üretilen Planlanan Siparişleri Veritabanına Yaz
    for (const po of explosionResult.plannedOrders) {
      await (prisma as any).uretimMrpPlannedOrder.create({
        data: {
          mrpRunId: mrpRun.id,
          itemId: po.itemId,
          orderType: po.orderType,
          orderNumber: po.orderNumber,
          orderStatus: po.orderStatus,
          sourceDocumentType: po.sourceDocumentType,
          sourceDocumentId: po.sourceDocumentId || null,
          quantity: po.quantity,
          unit: po.unit,
          releaseDate: po.releaseDate,
          dueDate: po.dueDate,
          supplierId: po.supplierId || null,
          bomId: po.bomId || null,
          routingId: po.routingId || null,
          peggingJson: JSON.stringify(po.pegging),
          notes: po.notes || null,
        },
      })
    }

    // 6. Aksiyon Mesajlarını Veritabanına Yaz
    for (const msg of explosionResult.actionMessages) {
      await (prisma as any).uretimMrpActionMessage.create({
        data: {
          mrpRunId: mrpRun.id,
          itemId: msg.itemId,
          actionType: msg.actionType,
          severity: msg.severity,
          suggestedDate: msg.suggestedDate || null,
          suggestedQty: msg.suggestedQty || null,
          message: msg.message,
          isResolved: false,
        },
      })
    }

    // 7. MRP Koşusunu Başarıyla Tamamla
    const completedRun = await (prisma as any).uretimMrpRun.update({
      where: { id: mrpRun.id },
      data: {
        status: "COMPLETED",
        completedAt: new Date(),
        totalItemsPlanned: explosionResult.summary.totalItemsPlanned,
        totalOrdersGenerated: explosionResult.summary.totalOrdersGenerated,
        totalActionMessages: explosionResult.summary.actionMessagesCount,
        executionTimeMs: explosionResult.summary.executionTimeMs,
      },
    })

    return {
      run: completedRun,
      summary: explosionResult.summary,
      plannedOrdersCount: explosionResult.plannedOrders.length,
      actionMessagesCount: explosionResult.actionMessages.length,
    }
  } catch (error: any) {
    // Hata durumunda koşuyu FAILED olarak işaretle
    await (prisma as any).uretimMrpRun.update({
      where: { id: mrpRun.id },
      data: {
        status: "FAILED",
        completedAt: new Date(),
        errorMessage: error.message || "Bilinmeyen MRP hatası",
      },
    })
    throw error
  }
}

// ─────────────────────────────────────────────────────────────
// 4. PLANLANAN SİPARİŞLER VE DÖNÜŞTÜRME SERVİSLERİ
// ─────────────────────────────────────────────────────────────

export interface ListPlannedOrdersParams {
  mrpRunId?: string
  itemId?: string
  orderType?: string
  orderStatus?: string
  page?: number | string
  pageSize?: number | string
}

export async function listPlannedOrdersFromDb(params: ListPlannedOrdersParams = {}) {
  const page = Math.max(1, parseInt(String(params.page || "1"), 10))
  const pageSize = Math.min(100, Math.max(1, parseInt(String(params.pageSize || "20"), 10)))
  const skip = (page - 1) * pageSize

  const where: any = {}
  if (params.mrpRunId) where.mrpRunId = params.mrpRunId
  if (params.itemId) where.itemId = params.itemId
  if (params.orderType && params.orderType !== "ALL") where.orderType = params.orderType
  if (params.orderStatus && params.orderStatus !== "ALL") where.orderStatus = params.orderStatus

  const [orders, total] = await Promise.all([
    (prisma as any).uretimMrpPlannedOrder.findMany({
      where,
      skip,
      take: pageSize,
      orderBy: { releaseDate: "asc" },
      include: {
        item: true,
        actionMessages: true,
      },
    }),
    (prisma as any).uretimMrpPlannedOrder.count({ where }),
  ])

  return {
    orders,
    pagination: {
      page,
      pageSize,
      total,
      totalPages: Math.ceil(total / pageSize),
    },
  }
}

/**
 * Planlanan bir Satınalma Siparişini mevcut Satınalma Talebi (PurchaseRequisition) sistemine dönüştürür.
 * Mevcut satınalma sözleşmesine sıfır zarar vererek standart PurchaseRequisition ve Line kayıtları oluşturur.
 */
export async function convertPlannedOrderToPurchaseRequisition(
  plannedOrderId: string,
  userId: string = "MRP_SYSTEM",
  targetWarehouseId: string = "DEFAULT_WAREHOUSE"
) {
  const plannedOrder = await (prisma as any).uretimMrpPlannedOrder.findUnique({
    where: { id: plannedOrderId },
    include: { item: true },
  })

  if (!plannedOrder) {
    throw new ProductionDomainError("NOT_FOUND", `Planlanan sipariş bulunamadı (ID: ${plannedOrderId})`)
  }

  if (plannedOrder.orderType !== "PURCHASE") {
    throw new ProductionDomainError(
      "VALIDATION_ERROR",
      `Yalnızca SATINALMA (PURCHASE) tipindeki planlanan siparişler Satınalma Talebine dönüştürülebilir. Bu siparişin tipi: ${plannedOrder.orderType}`
    )
  }

  if (plannedOrder.orderStatus === "CONVERTED") {
    throw new ProductionDomainError(
      "CONFLICT",
      `Bu planlanan sipariş zaten dönüştürülmüştür. (Belge: ${plannedOrder.convertedDocType} - ${plannedOrder.convertedDocId})`
    )
  }

  const reqNumber = `PR-MRP-${Date.now().toString().slice(-6)}`
  const itemCost = plannedOrder.item?.standardCost || plannedOrder.item?.currentAvgCost || 0
  const totalAmount = Number((plannedOrder.quantity * itemCost).toFixed(2))

  // 1. Mevcut PurchaseRequisition Kaydı Oluştur
  const requisition = await (prisma as any).purchaseRequisition.create({
    data: {
      reqNumber,
      warehouseId: targetWarehouseId,
      supplierId: plannedOrder.supplierId || null,
      supplierName: plannedOrder.supplierId ? "MRP Tedarikçisi" : "Belirtilmedi",
      triggerSource: "MRP_AUTO",
      status: "PENDING",
      priority: "HIGH",
      totalAmount,
      currency: plannedOrder.item?.currency || "TRY",
      expectedDate: plannedOrder.dueDate,
      notes: `MRP Planned Order (${plannedOrder.orderNumber}) üzerinden otomatik oluşturuldu.`,
    },
  })

  // 2. Mevcut PurchaseRequisitionLine Kaydı Oluştur
  await (prisma as any).purchaseRequisitionLine.create({
    data: {
      requisitionId: requisition.id,
      itemId: plannedOrder.itemId,
      sku: plannedOrder.item?.sku || "SKU",
      itemName: plannedOrder.item?.name || "Malzeme",
      quantity: plannedOrder.quantity,
      unit: plannedOrder.unit || "Adet",
      estimatedCost: itemCost,
      totalCost: totalAmount,
      notes: `MRP İhtiyaç Tarihi: ${new Date(plannedOrder.dueDate).toISOString().split("T")[0]}`,
    },
  })

  // 3. Planlanan Siparişin Durumunu CONVERTED Olarak Güncelle
  const updatedPlannedOrder = await (prisma as any).uretimMrpPlannedOrder.update({
    where: { id: plannedOrderId },
    data: {
      orderStatus: "CONVERTED",
      convertedDocType: "PURCHASE_REQUISITION",
      convertedDocId: requisition.id,
    },
  })

  return {
    requisition,
    plannedOrder: updatedPlannedOrder,
  }
}

/**
 * Birden fazla planlanan satınalma siparişini toplu olarak dönüştürür.
 */
export async function bulkConvertPlannedOrders(
  plannedOrderIds: string[],
  userId: string = "MRP_SYSTEM",
  targetWarehouseId: string = "DEFAULT_WAREHOUSE"
) {
  const results: any[] = []
  const errors: any[] = []

  for (const id of plannedOrderIds) {
    try {
      const res = await convertPlannedOrderToPurchaseRequisition(id, userId, targetWarehouseId)
      results.push(res)
    } catch (err: any) {
      errors.push({ id, error: err.message })
    }
  }

  return {
    successfulCount: results.length,
    failedCount: errors.length,
    conversions: results,
    errors,
  }
}

/**
 * Faz 5 (İş Emri) modülü için hazır dönüştürme sözleşmesi.
 * Planlanan üretim siparişini doğrular ve iş emri oluşturma kontratını hazırlar.
 */
export async function convertPlannedOrderToWorkOrderContract(plannedOrderId: string) {
  const plannedOrder = await (prisma as any).uretimMrpPlannedOrder.findUnique({
    where: { id: plannedOrderId },
    include: { item: true },
  })

  if (!plannedOrder) {
    throw new ProductionDomainError("NOT_FOUND", `Planlanan sipariş bulunamadı (ID: ${plannedOrderId})`)
  }

  if (plannedOrder.orderType !== "PRODUCTION") {
    throw new ProductionDomainError(
      "VALIDATION_ERROR",
      `Yalnızca ÜRETİM (PRODUCTION) tipindeki planlanan siparişler İş Emrine dönüştürülebilir.`
    )
  }

  // Faz 5 İş Emri Servisine iletilecek hazır sözleşme
  const workOrderDraft = {
    workOrderCode: `WO-${Date.now().toString().slice(-6)}`,
    plannedOrderId: plannedOrder.id,
    itemId: plannedOrder.itemId,
    sku: plannedOrder.item?.sku,
    name: plannedOrder.item?.name,
    targetQuantity: plannedOrder.quantity,
    unit: plannedOrder.unit,
    plannedStartDate: plannedOrder.releaseDate,
    plannedDueDate: plannedOrder.dueDate,
    bomId: plannedOrder.bomId,
    routingId: plannedOrder.routingId,
    status: "PLANNED",
    peggingJson: plannedOrder.peggingJson,
  }

  // Durumu güncellendi olarak işaretle
  await (prisma as any).uretimMrpPlannedOrder.update({
    where: { id: plannedOrderId },
    data: {
      orderStatus: "APPROVED",
      convertedDocType: "WORK_ORDER_CONTRACT",
    },
  })

  return workOrderDraft
}

// ─────────────────────────────────────────────────────────────
// 5. AKSİYON VE İSTİSNA MESAJLARI İŞLEMLERİ
// ─────────────────────────────────────────────────────────────

export interface ListActionMessagesParams {
  mrpRunId?: string
  itemId?: string
  actionType?: string
  severity?: string
  isResolved?: boolean | string
  page?: number | string
  pageSize?: number | string
}

export async function listActionMessagesFromDb(params: ListActionMessagesParams = {}) {
  const page = Math.max(1, parseInt(String(params.page || "1"), 10))
  const pageSize = Math.min(100, Math.max(1, parseInt(String(params.pageSize || "20"), 10)))
  const skip = (page - 1) * pageSize

  const where: any = {}
  if (params.mrpRunId) where.mrpRunId = params.mrpRunId
  if (params.itemId) where.itemId = params.itemId
  if (params.actionType && params.actionType !== "ALL") where.actionType = params.actionType
  if (params.severity && params.severity !== "ALL") where.severity = params.severity
  if (params.isResolved !== undefined && params.isResolved !== "") {
    where.isResolved = String(params.isResolved) === "true"
  }

  const [messages, total] = await Promise.all([
    (prisma as any).uretimMrpActionMessage.findMany({
      where,
      skip,
      take: pageSize,
      orderBy: [{ severity: "desc" }, { createdAt: "desc" }],
      include: {
        item: true,
        plannedOrder: true,
      },
    }),
    (prisma as any).uretimMrpActionMessage.count({ where }),
  ])

  return {
    messages,
    pagination: {
      page,
      pageSize,
      total,
      totalPages: Math.ceil(total / pageSize),
    },
  }
}

export async function resolveActionMessage(id: string, resolvedBy: string) {
  const updated = await (prisma as any).uretimMrpActionMessage.update({
    where: { id },
    data: {
      isResolved: true,
      resolvedAt: new Date(),
      resolvedBy,
    },
  })
  return updated
}

// ─────────────────────────────────────────────────────────────
// 6. MALZEME ZAMAN ÇİZELGESİ VE PEGGING SORGUSU
// ─────────────────────────────────────────────────────────────

export async function getItemTimePhasedWithPegging(itemId: string) {
  const [item, plannedOrders, actionMessages] = await Promise.all([
    (prisma as any).inventoryItem.findUnique({
      where: { id: itemId },
      include: {
        uretimProfile: true,
        stockBalances: true,
      },
    }),
    (prisma as any).uretimMrpPlannedOrder.findMany({
      where: { itemId },
      orderBy: { dueDate: "asc" },
    }),
    (prisma as any).uretimMrpActionMessage.findMany({
      where: { itemId, isResolved: false },
    }),
  ])

  if (!item) {
    throw new ProductionDomainError("NOT_FOUND", `Malzeme bulunamadı (ID: ${itemId})`)
  }

  const onHand = (item.stockBalances || []).reduce((s: number, b: any) => s + (b.availableQty || 0), 0)

  // Pegging kayıtlarını topla
  const peggingTree: any[] = []
  for (const po of plannedOrders) {
    if (po.peggingJson) {
      try {
        const parsed = JSON.parse(po.peggingJson)
        peggingTree.push({
          orderNumber: po.orderNumber,
          orderType: po.orderType,
          quantity: po.quantity,
          dueDate: po.dueDate,
          sources: parsed,
        })
      } catch {}
    }
  }

  return {
    item: {
      id: item.id,
      sku: item.sku,
      name: item.name,
      baseUnit: item.baseUnit,
      currentOnHand: onHand,
      profile: item.uretimProfile,
    },
    plannedOrders,
    actionMessages,
    peggingTree,
  }
}
