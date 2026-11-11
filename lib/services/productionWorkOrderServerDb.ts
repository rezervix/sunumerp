/**
 * SUNUM ERP – Üretim Yönetim Sistemi (Faz 5)
 * Üretim / İş Emri (Work Order) & Atölye İcra Veritabanı Orkestrasyon ve CRUD Servisi
 *
 * - İş Emri Yaşam Döngüsü ve Durum Makinesi
 * - BOM & Rota Donmuş (Frozen Snapshot) Kaydı
 * - Operasyon Başlatma / Duraklatma / Duruş / Bitirme
 * - Malzeme Rezervasyonu ve Fiili Sarfiyat (Backflush & Manuel)
 * - Stok Entegrasyonu: StockBalance, CostLayer ve StockMovement
 * - Gerçekleşen Maliyet ve Sapma Analizi
 * - Atölye (Shop Floor) Terminal Sorguları ve IoT Staging
 */

import { prisma } from "@/lib/db"
import { ProductionDomainError } from "./productionAuditAndError"
import {
  buildWorkOrderSnapshotAndLines,
  calculateBackflushConsumption,
  calculateWorkOrderActualCostAndVariance,
  calculateWorkOrderMerge,
  calculateWorkOrderOee,
  calculateWorkOrderSplit,
  validateWorkOrderStateTransition,
  type ConsumptionMethod,
  type ScrapReasonCode,
  type StoppageReasonCode,
  type WorkOrderOperationStatus,
  type WorkOrderPriority,
  type WorkOrderStatus,
} from "./productionWorkOrderEngine"

// ─────────────────────────────────────────────────────────────
// 1. İŞ EMRİ OLUŞTURMA & CRUD İŞLEMLERİ
// ─────────────────────────────────────────────────────────────

export interface ListWorkOrdersParams {
  branchId?: string | null
  status?: string
  priority?: string
  itemId?: string
  search?: string
  page?: number | string
  pageSize?: number | string
}

export async function listWorkOrdersFromDb(params: ListWorkOrdersParams = {}) {
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
  if (params.priority && params.priority !== "ALL") {
    where.priority = params.priority
  }
  if (params.itemId) {
    where.itemId = params.itemId
  }
  if (params.search) {
    where.OR = [
      { workOrderNumber: { contains: params.search, mode: "insensitive" } },
      { lotNumber: { contains: params.search, mode: "insensitive" } },
      { item: { name: { contains: params.search, mode: "insensitive" } } },
      { item: { sku: { contains: params.search, mode: "insensitive" } } },
    ]
  }

  const [workOrders, total] = await Promise.all([
    (prisma as any).uretimWorkOrder.findMany({
      where,
      skip,
      take: pageSize,
      orderBy: { createdAt: "desc" },
      include: {
        item: true,
        operations: { orderBy: { operationNumber: "asc" } },
        _count: { select: { materials: true, stoppages: true, laborLogs: true } },
      },
    }),
    (prisma as any).uretimWorkOrder.count({ where }),
  ])

  return {
    workOrders,
    pagination: {
      page,
      pageSize,
      total,
      totalPages: Math.ceil(total / pageSize),
    },
  }
}

export async function getWorkOrderByIdFromDb(id: string) {
  const workOrder = await (prisma as any).uretimWorkOrder.findUnique({
    where: { id },
    include: {
      item: true,
      operations: {
        orderBy: { operationNumber: "asc" },
        include: {
          workCenter: true,
          stoppages: { orderBy: { startedAt: "desc" } },
          laborLogs: { orderBy: { startedAt: "desc" } },
        },
      },
      materials: {
        include: { item: true },
        orderBy: [{ operationId: "asc" }, { createdAt: "asc" }],
      },
      stoppages: { orderBy: { startedAt: "desc" } },
      laborLogs: { orderBy: { startedAt: "desc" } },
      iotRecords: { orderBy: { receivedAt: "desc" }, take: 20 },
    },
  })

  if (!workOrder) {
    throw new ProductionDomainError("NOT_FOUND", `İş emri bulunamadı (ID: ${id})`)
  }

  return workOrder
}

export interface CreateWorkOrderInput {
  branchId?: string | null
  workOrderNumber?: string
  sourceType?: "MANUAL" | "SALES_ORDER" | "MRP"
  sourceDocumentId?: string | null
  sourceDocumentNumber?: string | null
  itemId: string
  bomId?: string | null
  routingId?: string | null
  plannedQuantity: number
  priority?: WorkOrderPriority
  warehouseId?: string
  targetWarehouseId?: string
  productionWarehouseId?: string | null
  plannedStartDate?: Date | string
  plannedDueDate?: Date | string
  lotNumber?: string | null
  notes?: string | null
}

export async function createWorkOrderFromDb(input: CreateWorkOrderInput) {
  if (input.plannedQuantity <= 0) {
    throw new ProductionDomainError("VALIDATION_ERROR", "Planlanan üretim miktarı sıfırdan büyük olmalıdır.")
  }

  // Mamulü bul
  const targetItem = await (prisma as any).inventoryItem.findUnique({
    where: { id: input.itemId },
    include: { uretimProfile: true },
  })

  if (!targetItem) {
    throw new ProductionDomainError("NOT_FOUND", `Üretilecek mamul bulunamadı (ID: ${input.itemId})`)
  }

  // BOM ve Rota Seçimi: Girişte verilmediyse ürün profilindeki veya en son onaylı olanı bul
  let bom = null
  if (input.bomId) {
    bom = await (prisma as any).uretimBomHeader.findUnique({
      where: { id: input.bomId },
      include: { components: { include: { componentItem: true } } },
    })
  } else {
    bom = await (prisma as any).uretimBomHeader.findFirst({
      where: { finishedItemId: input.itemId, status: "APPROVED", isActive: true },
      include: { components: { include: { componentItem: true } } },
      orderBy: { revision: "desc" },
    })
  }

  if (!bom) {
    throw new ProductionDomainError(
      "VALIDATION_ERROR",
      `${targetItem.sku} için geçerli onaylı bir Ürün Reçetesi (BOM) bulunamadı. İş emri açılamaz.`
    )
  }

  let routing = null
  if (input.routingId) {
    routing = await (prisma as any).uretimRoutingHeader.findUnique({
      where: { id: input.routingId },
      include: { operations: { include: { workCenter: true } } },
    })
  } else {
    routing = await (prisma as any).uretimRoutingHeader.findFirst({
      where: { finishedItemId: input.itemId, status: "APPROVED", isActive: true },
      include: { operations: { include: { workCenter: true } } },
      orderBy: { revision: "desc" },
    })
  }

  // Depo Kontrolü
  let targetWarehouseId = input.warehouseId || input.targetWarehouseId
  if (!targetWarehouseId) {
    const defaultWh = await (prisma as any).warehouse.findFirst({
      where: { isDefault: true },
    }).catch(() => null)
    targetWarehouseId = defaultWh?.id || "DEFAULT_WAREHOUSE"
  }

  const workOrderNumber =
    input.workOrderNumber || `WO-${Date.now().toString().slice(-6)}-${Math.floor(100 + Math.random() * 900)}`
  const lotNumber =
    input.lotNumber || `LOT-${targetItem.sku}-${Date.now().toString().slice(-6)}`

  // Reçete ve Rota Snapshot Dondurma
  const bomSnapshotInput = {
    bomId: bom.id,
    code: bom.code,
    name: bom.name,
    revision: bom.revision,
    baseQuantity: bom.baseQuantity,
    components: (bom.components || []).map((c: any) => ({
      componentItemId: c.componentItemId,
      sku: c.componentItem?.sku || "SKU",
      name: c.componentItem?.name || "Bileşen",
      quantity: c.quantity,
      unit: c.unit,
      scrapPercent: c.scrapPercent,
      unitCost: c.componentItem?.standardCost || c.componentItem?.currentAvgCost || 0,
      isPhantom: c.isPhantom || false,
      operationSequence: c.operationSequence,
    })),
  }

  const routingSnapshotInput = routing
    ? {
        routingId: routing.id,
        code: routing.code,
        name: routing.name,
        revision: routing.revision,
        operations: (routing.operations || []).map((op: any) => ({
          operationNumber: op.operationNumber || op.sequence || 10,
          name: op.name,
          description: op.description,
          workCenterId: op.workCenterId,
          workCenterCode: op.workCenter?.code,
          workCenterName: op.workCenter?.name,
          workCenterHourlyCost: op.workCenter?.hourlyCost || op.workCenter?.hourlyRate || 0,
          setupTimeMinutes: op.setupTimeMinutes || 0,
          runTimeMinutesPerUnit: op.runTimeMinutes || op.runTimeMinutesPerUnit || 0,
        })),
      }
    : null

  const { bomSnapshotJson, routingSnapshotJson, materials, operations, theoreticalCosts } =
    buildWorkOrderSnapshotAndLines(input.plannedQuantity, bomSnapshotInput, routingSnapshotInput)

  const plannedStartDate = input.plannedStartDate ? new Date(input.plannedStartDate) : new Date()
  const plannedDueDate = input.plannedDueDate
    ? new Date(input.plannedDueDate)
    : new Date(plannedStartDate.getTime() + 7 * 86400000)

  // 1. İş Emri Başlığını Oluştur
  const workOrder = await (prisma as any).uretimWorkOrder.create({
    data: {
      branchId: input.branchId || null,
      workOrderNumber,
      sourceType: input.sourceType || "MANUAL",
      sourceDocumentId: input.sourceDocumentId || null,
      sourceDocumentNumber: input.sourceDocumentNumber || null,
      itemId: input.itemId,
      bomId: bom.id,
      routingId: routing?.id || null,
      bomSnapshotJson,
      routingSnapshotJson,
      plannedQuantity: input.plannedQuantity,
      producedQuantity: 0,
      scrapQuantity: 0,
      unit: targetItem.baseUnit || "Adet",
      status: "PLANNED",
      priority: input.priority || "NORMAL",
      warehouseId: targetWarehouseId,
      productionWarehouseId: input.productionWarehouseId || targetWarehouseId,
      plannedStartDate,
      plannedDueDate,
      lotNumber,
      theoreticalMaterialCost: theoreticalCosts.materialCost,
      theoreticalLaborCost: theoreticalCosts.laborCost,
      theoreticalOverheadCost: theoreticalCosts.overheadCost,
      theoreticalTotalCost: theoreticalCosts.totalCost,
      actualMaterialCost: 0,
      actualLaborCost: 0,
      actualOverheadCost: 0,
      actualScrapCost: 0,
      actualTotalCost: 0,
      costVariance: 0,
      notes: input.notes || null,
    },
  })

  // 2. Operasyon Satırlarını Oluştur
  const createdOpsMap = new Map<number, string>()
  for (const op of operations) {
    const createdOp = await (prisma as any).uretimWorkOrderOperation.create({
      data: {
        workOrderId: workOrder.id,
        operationNumber: op.operationNumber,
        name: op.name,
        description: op.description || null,
        workCenterId: op.workCenterId || null,
        operatorUserId: op.operatorUserId || null,
        status: "PENDING",
        setupTimeMinutes: op.setupTimeMinutes,
        plannedRunMinutes: op.plannedRunMinutes,
        actualRunMinutes: 0,
        actualMachineMinutes: 0,
        plannedQuantity: op.plannedQuantity,
        producedQuantity: 0,
        scrapQuantity: 0,
      },
    })
    createdOpsMap.set(op.operationNumber, createdOp.id)
  }

  // 3. Malzeme Satırlarını Oluştur
  for (const mat of materials) {
    const matchingOpId = mat.operationNumber ? createdOpsMap.get(mat.operationNumber) || null : null
    await (prisma as any).uretimWorkOrderMaterial.create({
      data: {
        workOrderId: workOrder.id,
        operationId: matchingOpId,
        itemId: mat.itemId,
        plannedQuantity: mat.plannedQuantity,
        reservedQuantity: 0,
        consumedQuantity: 0,
        scrapQuantity: 0,
        unit: mat.unit,
        unitCost: mat.unitCost,
        totalCost: Number((mat.plannedQuantity * mat.unitCost).toFixed(2)),
        consumptionMethod: mat.consumptionMethod || "MANUAL",
        lotNumber: mat.lotNumber || null,
      },
    })
  }

  // Eğer MRP planlanan siparişinden dönüştürüldüyse, Faz 4 kaydını güncelle
  if (input.sourceType === "MRP" && input.sourceDocumentId) {
    await (prisma as any).uretimMrpPlannedOrder.update({
      where: { id: input.sourceDocumentId },
      data: {
        orderStatus: "CONVERTED",
        convertedDocType: "WORK_ORDER",
        convertedDocId: workOrder.id,
      },
    }).catch(() => null)
  }

  return getWorkOrderByIdFromDb(workOrder.id)
}

// ─────────────────────────────────────────────────────────────
// 2. İŞ EMRİ DURUM GEÇİŞLERİ VE YAŞAM DÖNGÜSÜ
// ─────────────────────────────────────────────────────────────

export async function updateWorkOrderStatusInDb(
  workOrderId: string,
  targetStatus: WorkOrderStatus,
  userId: string = "SYSTEM"
) {
  const workOrder = await getWorkOrderByIdFromDb(workOrderId)

  validateWorkOrderStateTransition(workOrder.status, targetStatus)

  // 1. Durum: RELEASED (Malzeme Rezervasyonu Tetikleme)
  if (targetStatus === "RELEASED") {
    for (const mat of workOrder.materials || []) {
      const neededQty = mat.plannedQuantity - mat.reservedQuantity
      if (neededQty > 0) {
        // Mevcut depodaki bakiyeyi bul veya oluştur
        let balance = await (prisma as any).stockBalance.findFirst({
          where: { itemId: mat.itemId, warehouseId: workOrder.productionWarehouseId || workOrder.warehouseId },
        })

        if (!balance) {
          balance = await (prisma as any).stockBalance.create({
            data: {
              itemId: mat.itemId,
              warehouseId: workOrder.productionWarehouseId || workOrder.warehouseId,
              onHandQty: 0,
              availableQty: 0,
              reservedQty: 0,
            },
          })
        }

        // Rezervasyon miktarını artır, kullanılabilir miktarı düşür
        await (prisma as any).stockBalance.update({
          where: { id: balance.id },
          data: {
            reservedQty: { increment: neededQty },
            availableQty: { decrement: neededQty },
          },
        })

        await (prisma as any).uretimWorkOrderMaterial.update({
          where: { id: mat.id },
          data: { reservedQuantity: mat.plannedQuantity },
        })
      }
    }
  }

  // 2. Durum: IN_PROGRESS (Üretim Başlatma)
  const actualStart = targetStatus === "IN_PROGRESS" && !workOrder.actualStartDate ? new Date() : workOrder.actualStartDate

  // 3. Durum: COMPLETED (Mamul Stok Girişi & Backflush & Rezervasyon İptali)
  if (targetStatus === "COMPLETED") {
    // A) Backflush malzeme tüketimlerini hesapla ve uygula
    const backflushDeltas = calculateBackflushConsumption(
      workOrder.plannedQuantity,
      workOrder.plannedQuantity,
      workOrder.materials || []
    )

    for (const bDelta of backflushDeltas) {
      await issueMaterialToWorkOrderInDb(
        workOrder.id,
        bDelta.materialId,
        bDelta.requiredBackflushQuantity,
        undefined,
        userId
      )
    }

    // B) Kalan rezervasyonları serbest bırak
    for (const mat of workOrder.materials || []) {
      if (mat.reservedQuantity > 0) {
        const balance = await (prisma as any).stockBalance.findFirst({
          where: { itemId: mat.itemId, warehouseId: workOrder.productionWarehouseId || workOrder.warehouseId },
        })
        if (balance) {
          await (prisma as any).stockBalance.update({
            where: { id: balance.id },
            data: {
              reservedQty: { decrement: mat.reservedQuantity },
              availableQty: { increment: mat.reservedQuantity },
            },
          })
        }
        await (prisma as any).uretimWorkOrderMaterial.update({
          where: { id: mat.id },
          data: { reservedQuantity: 0 },
        })
      }
    }

    // C) Mamul Stok Girişi (PRODUCTION_OUTPUT)
    const producedQty = workOrder.producedQuantity > 0 ? workOrder.producedQuantity : workOrder.plannedQuantity
    let targetBalance = await (prisma as any).stockBalance.findFirst({
      where: { itemId: workOrder.itemId, warehouseId: workOrder.warehouseId },
    })

    if (!targetBalance) {
      targetBalance = await (prisma as any).stockBalance.create({
        data: {
          itemId: workOrder.itemId,
          warehouseId: workOrder.warehouseId,
          onHandQty: 0,
          availableQty: 0,
          reservedQty: 0,
        },
      })
    }

    // Gerçekleşen maliyeti hesapla
    const costSummary = await getWorkOrderCostSummaryFromDb(workOrder.id)
    const finalUnitCost = costSummary.unitActualCost > 0 ? costSummary.unitActualCost : workOrder.theoreticalTotalCost / Math.max(1, workOrder.plannedQuantity)

    // Bakiyeyi artır
    await (prisma as any).stockBalance.update({
      where: { id: targetBalance.id },
      data: {
        onHandQty: { increment: producedQty },
        availableQty: { increment: producedQty },
      },
    })

    // CostLayer aç (FIFO katmanı)
    await (prisma as any).costLayer.create({
      data: {
        itemId: workOrder.itemId,
        warehouseId: workOrder.warehouseId,
        lotNumber: workOrder.lotNumber || null,
        initialQty: producedQty,
        remainingQty: producedQty,
        unitCost: finalUnitCost,
        originDocNo: workOrder.workOrderNumber,
        status: "AVAILABLE",
      },
    })

    // StockMovement günlüğü
    await (prisma as any).stockMovement.create({
      data: {
        itemId: workOrder.itemId,
        warehouseId: workOrder.warehouseId,
        movementType: "PRODUCTION_OUTPUT",
        quantity: producedQty,
        unit: workOrder.unit,
        unitCost: finalUnitCost,
        totalCost: Number((producedQty * finalUnitCost).toFixed(2)),
        referenceDocNo: workOrder.workOrderNumber,
        notes: `İş Emri (${workOrder.workOrderNumber}) tamamlanarak stok girişi yapıldı.`,
      },
    })

    // LotSerialRecord kaydı oluştur/güncelle
    if (workOrder.lotNumber) {
      await (prisma as any).lotSerialRecord.create({
        data: {
          itemId: workOrder.itemId,
          warehouseId: workOrder.warehouseId,
          lotNumber: workOrder.lotNumber,
          initialQty: producedQty,
          remainingQty: producedQty,
          unitCost: finalUnitCost,
          originDocType: "WORK_ORDER",
          originDocNo: workOrder.workOrderNumber,
          manufacturingDate: new Date(),
          status: "AVAILABLE",
          qcStatus: "PASSED",
        },
      }).catch(() => null)
    }
  }

  // 4. Durum: CLOSED
  const closedAt = targetStatus === "CLOSED" ? new Date() : workOrder.closedAt
  const closedBy = targetStatus === "CLOSED" ? userId : workOrder.closedBy

  // 5. Durum: CANCELLED (Rezervasyonları Geri Çek)
  if (targetStatus === "CANCELLED") {
    for (const mat of workOrder.materials || []) {
      if (mat.reservedQuantity > 0) {
        const balance = await (prisma as any).stockBalance.findFirst({
          where: { itemId: mat.itemId, warehouseId: workOrder.productionWarehouseId || workOrder.warehouseId },
        })
        if (balance) {
          await (prisma as any).stockBalance.update({
            where: { id: balance.id },
            data: {
              reservedQty: { decrement: mat.reservedQuantity },
              availableQty: { increment: mat.reservedQuantity },
            },
          })
        }
        await (prisma as any).uretimWorkOrderMaterial.update({
          where: { id: mat.id },
          data: { reservedQuantity: 0 },
        })
      }
    }
  }

  const updated = await (prisma as any).uretimWorkOrder.update({
    where: { id: workOrderId },
    data: {
      status: targetStatus,
      actualStartDate: actualStart,
      actualEndDate: targetStatus === "COMPLETED" ? new Date() : workOrder.actualEndDate,
      closedAt,
      closedBy,
    },
  })

  return getWorkOrderByIdFromDb(updated.id)
}

// ─────────────────────────────────────────────────────────────
// 3. OPERASYON YÖNETİMİ & ATÖLYE İCRA
// ─────────────────────────────────────────────────────────────

export async function startWorkOrderOperationInDb(
  operationId: string,
  userId: string,
  operatorUserId?: string,
  workCenterId?: string
) {
  const operation = await (prisma as any).uretimWorkOrderOperation.findUnique({
    where: { id: operationId },
    include: { workOrder: true },
  })

  if (!operation) {
    throw new ProductionDomainError("NOT_FOUND", "Operasyon kaydı bulunamadı.")
  }

  if (operation.status === "COMPLETED") {
    throw new ProductionDomainError("INVALID_STATE_TRANSITION", "Tamamlanmış operasyon tekrar başlatılamaz.")
  }

  // Operasyon başlangıcı
  const actualStartDate = operation.actualStartDate || new Date()
  const updatedOp = await (prisma as any).uretimWorkOrderOperation.update({
    where: { id: operationId },
    data: {
      status: "RUNNING",
      operatorUserId: operatorUserId || userId,
      workCenterId: workCenterId || operation.workCenterId,
      actualStartDate,
    },
  })

  // Eğer iş emri henüz IN_PROGRESS değilse otomatik olarak IN_PROGRESS yap
  if (operation.workOrder.status === "RELEASED" || operation.workOrder.status === "APPROVED") {
    await updateWorkOrderStatusInDb(operation.workOrderId, "IN_PROGRESS", userId)
  }

  return updatedOp
}

export async function pauseWorkOrderOperationInDb(
  operationId: string,
  reasonCode: StoppageReasonCode,
  description?: string,
  reportedBy: string = "OPERATOR"
) {
  const operation = await (prisma as any).uretimWorkOrderOperation.findUnique({
    where: { id: operationId },
  })

  if (!operation) throw new ProductionDomainError("NOT_FOUND", "Operasyon bulunamadı.")
  if (operation.status !== "RUNNING") {
    throw new ProductionDomainError("INVALID_STATE_TRANSITION", "Yalnızca çalışan operasyon duraklatılabilir.")
  }

  // Duruş kaydı aç
  const stoppage = await (prisma as any).uretimWorkOrderStoppage.create({
    data: {
      workOrderId: operation.workOrderId,
      operationId: operation.id,
      workCenterId: operation.workCenterId,
      reasonCode,
      description: description || null,
      startedAt: new Date(),
      reportedBy,
      isResolved: false,
    },
  })

  await (prisma as any).uretimWorkOrderOperation.update({
    where: { id: operationId },
    data: { status: "PAUSED" },
  })

  return stoppage
}

export async function resumeWorkOrderOperationInDb(operationId: string) {
  const operation = await (prisma as any).uretimWorkOrderOperation.findUnique({
    where: { id: operationId },
  })

  if (!operation) throw new ProductionDomainError("NOT_FOUND", "Operasyon bulunamadı.")
  if (operation.status !== "PAUSED") {
    throw new ProductionDomainError("INVALID_STATE_TRANSITION", "Yalnızca duraklatılmış operasyon devam ettirilebilir.")
  }

  // Açık duruş kaydını bul ve kapat
  const openStoppage = await (prisma as any).uretimWorkOrderStoppage.findFirst({
    where: { operationId, isResolved: false },
    orderBy: { startedAt: "desc" },
  })

  if (openStoppage) {
    const endedAt = new Date()
    const diffMinutes = Math.max(0, (endedAt.getTime() - new Date(openStoppage.startedAt).getTime()) / 60000)

    await (prisma as any).uretimWorkOrderStoppage.update({
      where: { id: openStoppage.id },
      data: {
        endedAt,
        durationMinutes: Number(diffMinutes.toFixed(1)),
        isResolved: true,
      },
    })
  }

  const updatedOp = await (prisma as any).uretimWorkOrderOperation.update({
    where: { id: operationId },
    data: { status: "RUNNING" },
  })

  return updatedOp
}

export interface CompleteOperationInput {
  operationId: string
  producedQuantity?: number
  producedQty?: number
  scrapQuantity?: number
  scrapQty?: number
  scrapReasonCode?: ScrapReasonCode | null
  actualMachineMinutes?: number
  actualLaborMinutes?: number
  operatorUserId?: string
  hourlyRate?: number
  notes?: string
}

export async function completeWorkOrderOperationInDb(input: CompleteOperationInput) {
  const operation = await (prisma as any).uretimWorkOrderOperation.findUnique({
    where: { id: input.operationId },
    include: { workOrder: true },
  })

  if (!operation) throw new ProductionDomainError("NOT_FOUND", "Operasyon bulunamadı.")

  const now = new Date()
  const scrapQty = Math.max(0, input.scrapQuantity !== undefined ? input.scrapQuantity : (input.scrapQty || 0))
  const producedQty = Math.max(0, input.producedQuantity !== undefined ? input.producedQuantity : (input.producedQty || 0))

  // Operatör işçilik kaydı ekle
  if (input.actualLaborMinutes && input.actualLaborMinutes > 0 && input.operatorUserId) {
    const hourly = input.hourlyRate || 150
    const laborCost = Number(((input.actualLaborMinutes / 60) * hourly).toFixed(2))

    await (prisma as any).uretimWorkOrderLabor.create({
      data: {
        workOrderId: operation.workOrderId,
        operationId: operation.id,
        userId: input.operatorUserId,
        durationMinutes: input.actualLaborMinutes,
        hourlyRate: hourly,
        totalLaborCost: laborCost,
        startedAt: operation.actualStartDate || now,
        endedAt: now,
      },
    })
  }

  // Operasyonu tamamla
  const updatedOp = await (prisma as any).uretimWorkOrderOperation.update({
    where: { id: input.operationId },
    data: {
      status: "COMPLETED",
      producedQuantity: producedQty,
      scrapQuantity: scrapQty,
      scrapReasonCode: input.scrapReasonCode || null,
      actualMachineMinutes: input.actualMachineMinutes || operation.plannedRunMinutes,
      actualRunMinutes: input.actualLaborMinutes || operation.plannedRunMinutes,
      actualEndDate: now,
      notes: input.notes || operation.notes,
    },
  })

  // Tüm operasyonlar bitti mi kontrol et
  const allOps = await (prisma as any).uretimWorkOrderOperation.findMany({
    where: { workOrderId: operation.workOrderId },
  })

  const allCompleted = allOps.every((o: any) => o.status === "COMPLETED" || o.status === "SKIPPED")

  // İş emrinin toplam üretilen ve hurda miktarını güncelle
  // Son operasyon mamul çıktısını belirler; önceki operasyonlar yarı mamul adımıdır
  const isFinalOp = allOps.every((o: any) => o.operationNumber <= operation.operationNumber)
  if (isFinalOp) {
    await (prisma as any).uretimWorkOrder.update({
      where: { id: operation.workOrderId },
      data: {
        producedQuantity: producedQty,
        scrapQuantity: { increment: scrapQty },
      },
    })
  } else {
    await (prisma as any).uretimWorkOrder.update({
      where: { id: operation.workOrderId },
      data: {
        scrapQuantity: { increment: scrapQty },
      },
    })
  }

  if (allCompleted) {
    await updateWorkOrderStatusInDb(operation.workOrderId, "COMPLETED")
  }

  return updatedOp
}

// ─────────────────────────────────────────────────────────────
// 4. MALZEME ÇIKIŞI & FİİLİ SARFİYAT (STOCK INTEGRATION)
// ─────────────────────────────────────────────────────────────

export async function issueMaterialToWorkOrderInDb(
  firstArg: string,
  secondArg: string | number,
  thirdArg?: number | string,
  fourthArg?: string,
  fifthArg: string = "SYSTEM"
) {
  let resolvedWorkOrderId: string = ""
  let resolvedMaterialLineId: string = ""
  let quantityToConsume: number = 0
  let lotNumber: string | undefined = undefined
  let userId: string = "SYSTEM"

  if (typeof secondArg === "number") {
    // issueMaterialToWorkOrderInDb(materialLineId, quantity, userId?, lotNumber?)
    resolvedMaterialLineId = firstArg
    quantityToConsume = secondArg
    if (typeof thirdArg === "string") userId = thirdArg
    lotNumber = fourthArg
    const mat = await (prisma as any).uretimWorkOrderMaterial.findUnique({
      where: { id: resolvedMaterialLineId },
    })
    if (!mat) throw new ProductionDomainError("NOT_FOUND", "Malzeme satırı bulunamadı.")
    resolvedWorkOrderId = mat.workOrderId
  } else {
    // issueMaterialToWorkOrderInDb(workOrderId, materialLineId, quantity, lotNumber?, userId?)
    resolvedWorkOrderId = firstArg
    resolvedMaterialLineId = String(secondArg)
    quantityToConsume = Number(thirdArg || 0)
    lotNumber = fourthArg
    if (fifthArg) userId = fifthArg
  }

  if (quantityToConsume <= 0) {
    throw new ProductionDomainError("VALIDATION_ERROR", "Sarf edilecek miktar sıfırdan büyük olmalıdır.")
  }

  const [workOrder, materialLine] = await Promise.all([
    (prisma as any).uretimWorkOrder.findUnique({ where: { id: resolvedWorkOrderId } }),
    (prisma as any).uretimWorkOrderMaterial.findUnique({
      where: { id: resolvedMaterialLineId },
      include: { item: true },
    }),
  ])

  if (!workOrder || !materialLine) {
    throw new ProductionDomainError("NOT_FOUND", "İş emri veya malzeme satırı bulunamadı.")
  }

  const warehouseId = workOrder.productionWarehouseId || workOrder.warehouseId
  const itemId = materialLine.itemId

  // 1. Stok Bakiyesi Kontrolü
  let balance = await (prisma as any).stockBalance.findFirst({
    where: { itemId, warehouseId },
  })

  if (!balance) {
    throw new ProductionDomainError("INSUFFICIENT_STOCK", `Depoda bu malzeme için stok bakiyesi bulunmuyor (${materialLine.item?.name}).`)
  }

  const currentOnHand = Number(balance.onHandQty || 0)
  if (currentOnHand < quantityToConsume) {
    throw new ProductionDomainError(
      "INSUFFICIENT_STOCK",
      `Yetersiz stok! Mevcut eldeki miktar: ${currentOnHand}, talep edilen sarfiyat: ${quantityToConsume}`
    )
  }

  // 2. Bakiyeden Düşüm (Rezervasyonu da sıfırın altına düşmeyecek şekilde tüket)
  const reservedDeduct = Math.min(Number(balance.reservedQty || 0), quantityToConsume)
  await (prisma as any).stockBalance.update({
    where: { id: balance.id },
    data: {
      onHandQty: { decrement: quantityToConsume },
      availableQty: { decrement: Math.max(0, quantityToConsume - reservedDeduct) },
      reservedQty: { decrement: reservedDeduct },
    },
  })

  // 3. FIFO Katman Tüketimi (CostLayer)
  let remainingToDeduct = quantityToConsume
  const costLayers = await (prisma as any).costLayer.findMany({
    where: { itemId, warehouseId, isExhausted: false },
    orderBy: { layerDate: "asc" }, // FIFO
  })

  let totalConsumedCost = 0
  for (const layer of costLayers) {
    if (remainingToDeduct <= 0) break
    const available = Number(layer.remainingQty || 0)
    const deduct = Math.min(available, remainingToDeduct)
    const newRem = available - deduct
    remainingToDeduct -= deduct
    totalConsumedCost += deduct * Number(layer.unitCost || 0)

    await (prisma as any).costLayer.update({
      where: { id: layer.id },
      data: {
        remainingQty: newRem,
        isExhausted: newRem <= 0,
      },
    })
  }

  if (totalConsumedCost === 0 && quantityToConsume > 0) {
    const fallbackUnit = Number(materialLine.unitCost || materialLine.item?.standardCost || 15.0)
    totalConsumedCost = Number((quantityToConsume * fallbackUnit).toFixed(2))
  }

  const effectiveUnitCost =
    quantityToConsume > 0 ? Number((totalConsumedCost / quantityToConsume).toFixed(2)) : Number(materialLine.unitCost || 15.0)

  // 4. StockMovement Kaydı
  await (prisma as any).stockMovement.create({
    data: {
      itemId,
      warehouseId,
      movementType: "PRODUCTION_CONSUME",
      quantity: quantityToConsume,
      unit: materialLine.unit,
      unitCost: effectiveUnitCost,
      totalCost: totalConsumedCost,
      referenceDocNo: workOrder.workOrderNumber,
      notes: `İş Emri (${workOrder.workOrderNumber}) üretimi için hammadde sarfiyatı.`,
    },
  })

  // 5. Malzeme Satırını Güncelle
  const newConsumedTotal = Number((materialLine.consumedQuantity + quantityToConsume).toFixed(4))
  const isOver = newConsumedTotal > materialLine.plannedQuantity

  const updatedLine = await (prisma as any).uretimWorkOrderMaterial.update({
    where: { id: resolvedMaterialLineId },
    data: {
      consumedQuantity: newConsumedTotal,
      unitCost: effectiveUnitCost,
      totalCost: { increment: totalConsumedCost },
      isOverConsumed: isOver,
      lotNumber: lotNumber || materialLine.lotNumber,
    },
  })

  // 6. İş Emrinin Fiili Malzeme Maliyetini Güncelle
  await (prisma as any).uretimWorkOrder.update({
    where: { id: resolvedWorkOrderId },
    data: {
      actualMaterialCost: { increment: totalConsumedCost },
      actualTotalCost: { increment: totalConsumedCost },
    },
  })

  return updatedLine
}

// ─────────────────────────────────────────────────────────────
// 5. İŞ EMRİ BÖLME, BİRLEŞTİRME VE ÖNCELİK DEĞİŞTİRME
// ─────────────────────────────────────────────────────────────

export async function splitWorkOrderInDb(workOrderId: string, splitQuantity: number, userId: string = "SYSTEM") {
  const original = await getWorkOrderByIdFromDb(workOrderId)

  const { parentNewPlannedQuantity, childPlannedQuantity, childWorkOrderNumber } =
    calculateWorkOrderSplit(original, splitQuantity)

  // Ana iş emrinin miktarını düşür
  await (prisma as any).uretimWorkOrder.update({
    where: { id: workOrderId },
    data: { plannedQuantity: parentNewPlannedQuantity },
  })

  // Yeni çocuk iş emrini oluştur
  const child = await createWorkOrderFromDb({
    branchId: original.branchId,
    workOrderNumber: childWorkOrderNumber,
    sourceType: "MANUAL",
    sourceDocumentId: original.id,
    sourceDocumentNumber: original.workOrderNumber,
    itemId: original.itemId,
    bomId: original.bomId,
    routingId: original.routingId,
    plannedQuantity: childPlannedQuantity,
    priority: original.priority,
    warehouseId: original.warehouseId,
    productionWarehouseId: original.productionWarehouseId,
    plannedStartDate: original.plannedStartDate,
    plannedDueDate: original.plannedDueDate,
    notes: `${original.workOrderNumber} iş emrinden bölündü.`,
  })

  const refreshedParent = await getWorkOrderByIdFromDb(original.id)
  return {
    parent: refreshedParent,
    parentOrder: refreshedParent,
    child,
    childOrder: child,
  }
}

export async function mergeWorkOrdersInDb(firstOrderId: string, secondOrderId: string, userId: string = "SYSTEM") {
  const [first, second] = await Promise.all([
    getWorkOrderByIdFromDb(firstOrderId),
    getWorkOrderByIdFromDb(secondOrderId),
  ])

  const { consolidatedQuantity } = calculateWorkOrderMerge(first, second)

  // İlk iş emrini güncelle
  const updatedFirst = await (prisma as any).uretimWorkOrder.update({
    where: { id: firstOrderId },
    data: {
      plannedQuantity: consolidatedQuantity,
      notes: `${first.notes || ""} (${second.workOrderNumber} ile birleştirildi)`,
    },
  })

  // İkinci iş emrini iptal et
  await (prisma as any).uretimWorkOrder.update({
    where: { id: secondOrderId },
    data: {
      status: "CANCELLED",
      notes: `${first.workOrderNumber} ile birleştirilerek iptal edildi.`,
    },
  })

  return getWorkOrderByIdFromDb(updatedFirst.id)
}

// ─────────────────────────────────────────────────────────────
// 6. GERÇEKLEŞEN MALİYET & RAPORLAR
// ─────────────────────────────────────────────────────────────

export async function getWorkOrderCostSummaryFromDb(workOrderId: string) {
  const workOrder = await getWorkOrderByIdFromDb(workOrderId)

  const summary = calculateWorkOrderActualCostAndVariance({
    plannedQuantity: workOrder.plannedQuantity,
    producedQuantity: workOrder.producedQuantity,
    theoreticalMaterialCost: workOrder.theoreticalMaterialCost,
    theoreticalLaborCost: workOrder.theoreticalLaborCost,
    theoreticalOverheadCost: workOrder.theoreticalOverheadCost,
    materials: (workOrder.materials || []).map((m: any) => ({
      consumedQuantity: m.consumedQuantity,
      unitCost: m.unitCost,
      scrapQuantity: m.scrapQuantity,
    })),
    laborLogs: (workOrder.laborLogs || []).map((l: any) => ({
      durationMinutes: l.durationMinutes,
      hourlyRate: l.hourlyRate,
    })),
    operations: (workOrder.operations || []).map((op: any) => ({
      actualMachineMinutes: op.actualMachineMinutes,
      workCenterHourlyCost: op.workCenter?.hourlyCost || 0,
    })),
  })

  // Veritabanındaki toplam maliyet alanlarını güncelle
  await (prisma as any).uretimWorkOrder.update({
    where: { id: workOrderId },
    data: {
      actualMaterialCost: summary.actualMaterialCost,
      actualLaborCost: summary.actualLaborCost,
      actualOverheadCost: summary.actualOverheadCost,
      actualScrapCost: summary.actualScrapCost,
      actualTotalCost: summary.actualTotalCost,
      costVariance: summary.costVariance,
    },
  })

  return {
    ...summary,
    actualUnitCost: summary.unitActualCost,
    variancePercentage: summary.variancePercent,
    varianceAmount: summary.costVariance,
    totalActualCost: summary.actualTotalCost,
    totalPlannedCost: summary.theoreticalTotalCost,
  }
}

export async function getLiveWorkOrderDashboard() {
  const [counts, activeWorkOrders, recentStoppages] = await Promise.all([
    (prisma as any).uretimWorkOrder.groupBy({
      by: ["status"],
      _count: { id: true },
    }).catch(() => []),
    (prisma as any).uretimWorkOrder.findMany({
      where: { status: { in: ["PLANNED", "APPROVED", "RELEASED", "IN_PROGRESS", "PAUSED"] } },
      orderBy: { plannedDueDate: "asc" },
      take: 20,
      include: { item: true, operations: true },
    }),
    (prisma as any).uretimWorkOrderStoppage.findMany({
      where: { isResolved: false },
      take: 10,
      orderBy: { startedAt: "desc" },
      include: { workOrder: { include: { item: true } }, operation: true },
    }),
  ])

  const statusMap: Record<string, number> = {}
  counts.forEach((c: any) => {
    statusMap[c.status] = c._count.id
  })

  const mappedActive = activeWorkOrders.map((wo: any) => ({
    id: wo.id,
    workOrderNumber: wo.workOrderNumber,
    item: wo.item,
    itemSku: wo.item?.sku,
    itemName: wo.item?.name,
    plannedQuantity: wo.plannedQuantity,
    producedQuantity: wo.producedQuantity,
    unit: wo.unit,
    progressPercent:
      wo.plannedQuantity > 0 ? Number(((wo.producedQuantity / wo.plannedQuantity) * 100).toFixed(1)) : 0,
    status: wo.status,
    priority: wo.priority,
    plannedDueDate: wo.plannedDueDate,
    isDelayed: new Date(wo.plannedDueDate).getTime() < Date.now() && wo.status !== "COMPLETED",
  }))

  const activeOrdersCount = mappedActive.length
  const inProgressOperationsCount = mappedActive.filter((w: any) => w.status === "IN_PROGRESS").length
  const delayedOrdersCount = mappedActive.filter((w: any) => w.isDelayed).length
  const totalOrdersCount = Object.values(statusMap).reduce((a: number, b: any) => a + Number(b || 0), 0)
  const averageCompletionRate =
    activeOrdersCount > 0
      ? Math.round(mappedActive.reduce((sum: number, w: any) => sum + (w.progressPercent || 0), 0) / activeOrdersCount)
      : 0

  return {
    activeOrdersCount,
    totalOrdersCount,
    inProgressOperationsCount,
    delayedOrdersCount,
    averageCompletionRate,
    activeOrders: mappedActive,
    activeWorkOrders: mappedActive,
    statusCounts: {
      planned: statusMap["PLANNED"] || 0,
      approved: statusMap["APPROVED"] || 0,
      released: statusMap["RELEASED"] || 0,
      inProgress: statusMap["IN_PROGRESS"] || 0,
      paused: statusMap["PAUSED"] || 0,
      completed: statusMap["COMPLETED"] || 0,
      closed: statusMap["CLOSED"] || 0,
      cancelled: statusMap["CANCELLED"] || 0,
      PLANNED: statusMap["PLANNED"] || 0,
      APPROVED: statusMap["APPROVED"] || 0,
      RELEASED: statusMap["RELEASED"] || 0,
      IN_PROGRESS: statusMap["IN_PROGRESS"] || 0,
      PAUSED: statusMap["PAUSED"] || 0,
      COMPLETED: statusMap["COMPLETED"] || 0,
      CLOSED: statusMap["CLOSED"] || 0,
      CANCELLED: statusMap["CANCELLED"] || 0,
    },
    recentStoppages,
  }
}

// ─────────────────────────────────────────────────────────────
// 7. ATÖLYE TERMİNALİ VE IOT ENTEGRASYON SORGULARI
// ─────────────────────────────────────────────────────────────

export async function getShopFloorTerminalData(workCenterId?: string, operatorUserId?: string) {
  const where: any = {
    status: { in: ["PENDING", "RUNNING", "PAUSED"] },
  }
  if (workCenterId) where.workCenterId = workCenterId
  if (operatorUserId) where.operatorUserId = operatorUserId

  const [operations, workCenters, recentIotLogs] = await Promise.all([
    (prisma as any).uretimWorkOrderOperation.findMany({
      where,
      orderBy: { operationNumber: "asc" },
      include: {
        workOrder: { include: { item: true, materials: true } },
        workCenter: true,
        stoppages: { where: { isResolved: false } },
      },
    }),
    (prisma as any).uretimWorkCenter.findMany({
      where: { isActive: true },
      orderBy: { code: "asc" },
    }).catch(() => []),
    (prisma as any).uretimIotStaging.findMany({
      take: 10,
      orderBy: { createdAt: "desc" },
    }).catch(() => []),
  ])

  return {
    activeOperations: operations || [],
    workCenters: workCenters || [],
    recentIotLogs: recentIotLogs || [],
  }
}

export interface IngestIotRecordInput {
  deviceId: string
  deviceType?: string
  workOrderId?: string
  operationId?: string
  metricType: "PRODUCTION_COUNT" | "SCRAP_COUNT" | "CYCLE_TIME" | "WEIGHT" | "TEMPERATURE" | "STOPPAGE"
  metricValue: number
  unit?: string
  rawPayloadJson?: string
}

export async function ingestIotRecordInDb(input: IngestIotRecordInput) {
  const staging = await (prisma as any).uretimIotStaging.create({
    data: {
      deviceId: input.deviceId,
      deviceType: input.deviceType || "PLC",
      workOrderId: input.workOrderId || null,
      operationId: input.operationId || null,
      metricType: input.metricType,
      metricValue: input.metricValue,
      unit: input.unit || null,
      rawPayloadJson: input.rawPayloadJson || null,
      status: "PENDING",
    },
  })

  // Eğer doğrudan aktif bir operasyona üretim sayısı geliyorsa operasyona ekle
  if (input.operationId && input.metricType === "PRODUCTION_COUNT") {
    await (prisma as any).uretimWorkOrderOperation.update({
      where: { id: input.operationId },
      data: {
        producedQuantity: { increment: input.metricValue },
      },
    }).catch(() => null)

    await (prisma as any).uretimIotStaging.update({
      where: { id: staging.id },
      data: { status: "PROCESSED", processedAt: new Date() },
    })
  }

  return staging
}

