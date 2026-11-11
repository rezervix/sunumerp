/**
 * SUNUM ERP — FAZ 6: KAPASİTE PLANLAMA (CRP) & ÇİZELGELEME VERİTABANI ORKESTRASYON KATMANI
 * 
 * Veritabanı sorguları, model zenginleştirmeleri, CRUD operasyonları,
 * plan kalıcılığı, Gantt verisi, CTP simülasyonu ve denetim loglaması.
 */

import { prisma } from "@/lib/db"
import { ProductionDomainError, logProductionAudit } from "@/lib/services/productionAuditAndError"
import {
  CapacityAlertResult,
  CapacityPeriodBucket,
  CapacitySchedulingOptions,
  CtpSimulationInput,
  CtpSimulationResult,
  OperationSchedulingCandidate,
  OperationTimeVarianceSummary,
  ScheduledTaskResult,
  WorkCenterCapacityDefinition,
  calculateCapableToPromise,
  calculateCapacityUtilizationBuckets,
  calculateOperationTimeVariances,
  generateCapacityAlertsFromBuckets,
  runCapacitySchedulingEngine,
} from "./productionCapacityEngine"

// ─────────────────────────────────────────────────────────────
// 1. İŞ MERKEZİ VE KAPASİTE VERİLERİNİ ÇEKME
// ─────────────────────────────────────────────────────────────

export async function getWorkCentersCapacityDefinitions(
  branchId?: string | null
): Promise<Record<string, WorkCenterCapacityDefinition>> {
  const where: any = { isActive: true }
  if (branchId) where.branchId = branchId

  const workCenters = await (prisma as any).uretimWorkCenter.findMany({
    where,
    include: {
      calendar: {
        include: {
          shifts: { where: { isActive: true } },
          holidays: true,
          exceptions: true,
        },
      },
      defaultShift: true,
      calendarExceptions: true,
    },
    orderBy: { code: "asc" },
  })

  const definitions: Record<string, WorkCenterCapacityDefinition> = {}

  for (const wc of workCenters) {
    const calendar = wc.calendar
    let workingDays = ["MON", "TUE", "WED", "THU", "FRI", "SAT"]
    if (calendar?.workingDaysJson) {
      try {
        workingDays = JSON.parse(calendar.workingDaysJson)
      } catch {}
    }

    const holidays: string[] = (calendar?.holidays || []).map((h: any) => h.holidayDate)

    const exceptions = (wc.calendarExceptions || calendar?.exceptions || []).map((e: any) => ({
      date: e.exceptionDate,
      type: e.exceptionType as any,
      availableHours: e.availableHours,
      capacityPercent: e.capacityPercent,
    }))

    // Günlük net çalışma dakikası
    let dailyNetMinutes = 480
    if (wc.defaultShift?.netWorkingMinutes) {
      dailyNetMinutes = wc.defaultShift.netWorkingMinutes
    } else if (calendar?.shifts && calendar.shifts.length > 0) {
      dailyNetMinutes = calendar.shifts.reduce(
        (sum: number, s: any) => sum + (s.netWorkingMinutes || 480),
        0
      )
    }

    definitions[wc.id] = {
      workCenterId: wc.id,
      code: wc.code,
      name: wc.name,
      efficiencyPercent: wc.efficiencyPercent || 100,
      dailyNetWorkingMinutes: dailyNetMinutes,
      workingDays,
      holidays,
      exceptions,
      alternativeGroupCode: wc.alternativeGroupCode || undefined,
    }
  }

  return definitions
}

// ─────────────────────────────────────────────────────────────
// 2. AÇIK İŞ EMİRLERİ VE OPERASYONLARI ÇİZELGELEME İÇİN HAZIRLAMA
// ─────────────────────────────────────────────────────────────

export async function getOpenOperationsForScheduling(
  branchId?: string | null
): Promise<OperationSchedulingCandidate[]> {
  const where: any = {
    workOrder: {
      status: { in: ["PLANNED", "APPROVED", "RELEASED", "IN_PROGRESS", "PAUSED"] },
    },
    status: { notIn: ["COMPLETED", "SKIPPED"] },
  }
  if (branchId) where.workOrder.branchId = branchId

  const operations = await (prisma as any).uretimWorkOrderOperation.findMany({
    where,
    orderBy: [
      { workOrderId: "asc" },
      { operationNumber: "asc" },
    ],
    include: {
      workOrder: { include: { item: true } },
      workCenter: {
        include: {
          alternativeOperations: true,
        },
      },
    },
  })

  // Alternatif iş merkezlerini ve selef operasyonları eşleştir
  const candidates: OperationSchedulingCandidate[] = []
  const opsByWorkOrder: Record<string, any[]> = {}

  operations.forEach((op: any) => {
    if (!opsByWorkOrder[op.workOrderId]) opsByWorkOrder[op.workOrderId] = []
    opsByWorkOrder[op.workOrderId].push(op)
  })

  operations.forEach((op: any) => {
    const wo = op.workOrder
    const totalMin =
      op.actualRunMinutes > 0
        ? op.actualRunMinutes
        : (op.setupTimeMinutes || 0) + (op.plannedRunMinutes || 60)

    // Aynı iş emrinde bir önceki operasyonu tespit et
    const orderOps = opsByWorkOrder[op.workOrderId] || []
    const currentIndex = orderOps.findIndex((o) => o.id === op.id)
    const predecessor = currentIndex > 0 ? orderOps[currentIndex - 1] : undefined

    // Alternatif iş merkezleri
    const altIds: string[] = (op.workCenter?.alternativeOperations || []).map(
      (a: any) => a.alternativeWorkCenterId
    )

    candidates.push({
      id: op.id,
      workOrderId: op.workOrderId,
      workOrderNumber: wo.workOrderNumber,
      operationNumber: op.operationNumber,
      name: op.name,
      workCenterId: op.workCenterId || "DEFAULT_WC",
      setupTimeMinutes: op.setupTimeMinutes || 0,
      runTimeMinutes: op.plannedRunMinutes || 60,
      totalMinutes: totalMin,
      plannedQuantity: op.plannedQuantity || wo.plannedQuantity || 1,
      priority: (wo.priority as any) || "NORMAL",
      dueDate: new Date(wo.plannedDueDate || Date.now() + 7 * 86400000),
      createdDate: new Date(op.createdAt || wo.createdAt || Date.now()),
      status: op.status,
      isLocked: Boolean(op.isLocked),
      scheduledStart: op.scheduledStartDate ? new Date(op.scheduledStartDate) : undefined,
      scheduledEnd: op.scheduledEndDate ? new Date(op.scheduledEndDate) : undefined,
      sequenceNumber: op.sequenceNumber || 0,
      alternativeWorkCenterIds: altIds,
      predecessorOperationId: predecessor?.id,
    })
  })

  return candidates
}

// ─────────────────────────────────────────────────────────────
// 3. KAPASİTE PLANI OLUŞTURMA VE VERİTABANINA YAZMA
// ─────────────────────────────────────────────────────────────

export async function runAndPersistCapacityPlan(
  options: CapacitySchedulingOptions,
  branchId?: string | null,
  userId: string = "SYSTEM"
) {
  const [workCenters, operations, mrpOrders] = await Promise.all([
    getWorkCentersCapacityDefinitions(branchId),
    getOpenOperationsForScheduling(branchId),
    (prisma as any).uretimMrpPlannedOrder.findMany({
      where: { orderStatus: "PLANNED", orderType: "PRODUCTION" },
    }).catch(() => []),
  ])

  // 1. Motoru Çalıştır
  const schedulingResult = runCapacitySchedulingEngine(operations, workCenters, options)

  // 2. Dönem Bazlı Yük Analizini Yap
  const utilizationResult = calculateCapacityUtilizationBuckets(
    schedulingResult.scheduledTasks,
    workCenters,
    options.startDate,
    14,
    mrpOrders
  )

  // 3. Otomatik Uyarıları Üret
  const generatedAlerts = generateCapacityAlertsFromBuckets(
    utilizationResult.buckets,
    schedulingResult.delayedTasks,
    options.overloadThresholdPercent || 95
  )

  // 4. Veritabanına Plan Kaydı Aç
  const planCode = `CP-${Date.now().toString().slice(-6)}`
  const totalLoadHours = utilizationResult.buckets.reduce((sum, b) => sum + b.totalLoadHours, 0)
  const totalCapHours = utilizationResult.buckets.reduce((sum, b) => sum + b.availableCapacityHours, 0)

  const createdPlan = await (prisma as any).uretimCapacityPlan.create({
    data: {
      branchId: branchId || null,
      code: planCode,
      name: `Kapasite ve Çizelgeleme Planı (${planCode})`,
      startDate: options.startDate,
      endDate: options.endDate || new Date(options.startDate.getTime() + 14 * 86400000),
      schedulingMode: options.mode,
      schedulingDirection: options.direction,
      priorityRule: options.priorityRule,
      status: "ACTIVE",
      totalLoadHours: Number(totalLoadHours.toFixed(2)),
      totalCapacityHours: Number(totalCapHours.toFixed(2)),
      bottleneckWorkCenterId: utilizationResult.bottleneckWorkCenterId || null,
      overloadedWorkCentersJson: JSON.stringify(
        utilizationResult.overloadedBuckets.map((b) => ({
          workCenterId: b.workCenterId,
          code: b.workCenterCode,
          date: b.periodKey,
          utilization: b.utilizationPercent,
        }))
      ),
      notes: `${options.mode} modunda ${options.priorityRule} kuralı ile ${schedulingResult.scheduledTasks.length} operasyon çizelgelendi.`,
    },
  })

  // 5. Plan Satırlarını (Bucket) Kaydet
  for (const b of utilizationResult.buckets) {
    await (prisma as any).uretimCapacityPlanItem.create({
      data: {
        planId: createdPlan.id,
        workCenterId: b.workCenterId,
        periodDate: b.periodKey,
        availableCapacityHours: b.availableCapacityHours,
        plannedLoadHours: b.plannedLoadHours,
        mrpLoadHours: b.mrpLoadHours,
        totalLoadHours: b.totalLoadHours,
        loadPercentage: b.utilizationPercent,
        isOverloaded: b.isOverloaded,
        operationCount: b.operationCount,
      },
    })
  }

  // 6. Çizelgelenen Görevleri (ScheduledTask) Kaydet ve Operasyonları Güncelle
  for (const task of schedulingResult.scheduledTasks) {
    await (prisma as any).uretimScheduledTask.create({
      data: {
        planId: createdPlan.id,
        workOrderId: task.workOrderId,
        operationId: task.operationId,
        workCenterId: task.workCenterId,
        setupMinutes: task.setupMinutes,
        runMinutes: task.runMinutes,
        totalMinutes: task.totalMinutes,
        scheduledStart: task.scheduledStart,
        scheduledEnd: task.scheduledEnd,
        sequenceOrder: task.sequenceOrder,
        isLocked: task.isLocked,
        isDelayed: task.isDelayed,
        delayMinutes: task.delayMinutes,
        status: task.status,
      },
    })

    // UretimWorkOrderOperation üzerinde planlanan zamanları senkronize et
    await (prisma as any).uretimWorkOrderOperation.update({
      where: { id: task.operationId },
      data: {
        scheduledStartDate: task.scheduledStart,
        scheduledEndDate: task.scheduledEnd,
        sequenceNumber: task.sequenceOrder,
      },
    }).catch(() => null)
  }

  // 7. Uyarıları Kaydet
  for (const alert of generatedAlerts) {
    await (prisma as any).uretimCapacityAlert.create({
      data: {
        branchId: branchId || null,
        workCenterId: alert.workCenterId || null,
        workOrderId: alert.workOrderId || null,
        operationId: alert.operationId || null,
        alertType: alert.alertType,
        severity: alert.severity,
        message: alert.message,
        loadPercentage: alert.loadPercentage || null,
        periodDate: alert.periodDate || null,
      },
    }).catch(() => null)
  }

  // Denetim Logu
  await logProductionAudit({
    userId,
    action: "CALCULATE",
    resource: "uretim_kapasite",
    resourceId: createdPlan.id,
    details: {
      planCode: createdPlan.code,
      mode: options.mode,
      priorityRule: options.priorityRule,
      scheduledTaskCount: schedulingResult.scheduledTasks.length,
      delayedTaskCount: schedulingResult.delayedTasks.length,
      bottleneckWorkCenterId: utilizationResult.bottleneckWorkCenterId,
    },
  })

  return {
    plan: createdPlan,
    schedulingResult,
    utilizationResult,
    alerts: generatedAlerts,
  }
}

// ─────────────────────────────────────────────────────────────
// 4. GÖSTERGE PANELİ VE CANLI ÖZET (OVERVIEW)
// ─────────────────────────────────────────────────────────────

export async function getCapacityDashboardOverview(branchId?: string | null) {
  const [workCentersDef, openOps, activePlan, recentAlerts] = await Promise.all([
    getWorkCentersCapacityDefinitions(branchId),
    getOpenOperationsForScheduling(branchId),
    (prisma as any).uretimCapacityPlan.findFirst({
      where: { status: "ACTIVE" },
      orderBy: { createdAt: "desc" },
      include: { items: true },
    }).catch(() => null),
    (prisma as any).uretimCapacityAlert.findMany({
      where: { isAcknowledged: false },
      take: 10,
      orderBy: { createdAt: "desc" },
      include: { workCenter: true, workOrder: true },
    }).catch(() => []),
  ])

  const totalWorkCentersCount = Object.keys(workCentersDef).length
  const totalOpenOperationsCount = openOps.length
  const lockedOperationsCount = openOps.filter((o) => o.isLocked).length

  // Anlık hızlı yük hesabı
  const activeTasks = await (prisma as any).uretimScheduledTask.findMany({
    where: { planId: activePlan?.id || undefined },
    take: 500,
  }).catch(() => [])

  const delayedCount = activeTasks.filter((t: any) => t.isDelayed).length

  return {
    totalWorkCentersCount,
    totalOpenOperationsCount,
    lockedOperationsCount,
    delayedCount,
    activePlan,
    recentAlerts,
    workCenters: Object.values(workCentersDef),
  }
}

// ─────────────────────────────────────────────────────────────
// 5. GANTT ŞEMASI VE GÖRSEL ÇİZELGE VERİSİ
// ─────────────────────────────────────────────────────────────

export async function getGanttScheduleData(params: {
  branchId?: string | null
  workCenterId?: string
  startDate?: string
  endDate?: string
}) {
  const workCentersDef = await getWorkCentersCapacityDefinitions(params.branchId)

  const where: any = {}
  if (params.workCenterId) where.workCenterId = params.workCenterId
  if (params.startDate) where.scheduledEnd = { gte: new Date(params.startDate) }
  if (params.endDate) where.scheduledStart = { lte: new Date(params.endDate) }

  const tasks = await (prisma as any).uretimScheduledTask.findMany({
    where,
    orderBy: { scheduledStart: "asc" },
    include: {
      workOrder: { include: { item: true } },
      operation: true,
      workCenter: true,
    },
  })

  // Çakışma Kontrolü (Conflict Detection: Aynı iş merkezinde aynı anda iki iş çakışıyor mu?)
  const conflicts: Array<{ taskAId: string; taskBId: string; workCenterId: string; overlapMinutes: number }> = []
  const tasksByWc: Record<string, any[]> = {}
  tasks.forEach((t: any) => {
    if (!tasksByWc[t.workCenterId]) tasksByWc[t.workCenterId] = []
    tasksByWc[t.workCenterId].push(t)
  })

  Object.entries(tasksByWc).forEach(([wcId, wcTasks]) => {
    for (let i = 0; i < wcTasks.length; i++) {
      for (let j = i + 1; j < wcTasks.length; j++) {
        const t1 = wcTasks[i]
        const t2 = wcTasks[j]
        const start1 = new Date(t1.scheduledStart).getTime()
        const end1 = new Date(t1.scheduledEnd).getTime()
        const start2 = new Date(t2.scheduledStart).getTime()
        const end2 = new Date(t2.scheduledEnd).getTime()

        // Çakışma: [start1, end1] ile [start2, end2] kesişimi
        const overlap = Math.min(end1, end2) - Math.max(start1, start2)
        if (overlap > 0) {
          conflicts.push({
            taskAId: t1.id,
            taskBId: t2.id,
            workCenterId: wcId,
            overlapMinutes: Math.round(overlap / 60000),
          })
        }
      }
    }
  })

  return {
    workCenters: Object.values(workCentersDef),
    tasks,
    conflicts,
    hasConflicts: conflicts.length > 0,
  }
}

// ─────────────────────────────────────────────────────────────
// 6. İNTERAKTİF GÖREV TAŞIMA / SÜRÜKLE-BIRAK VE KİLİTLEME
// ─────────────────────────────────────────────────────────────

export async function updateScheduledTaskInDb(params: {
  taskId?: string
  operationId?: string
  newStartDate: Date
  newEndDate: Date
  workCenterId?: string
  isLocked?: boolean
  userId?: string
}) {
  const opId = params.operationId
  let task: any = null

  if (params.taskId) {
    task = await (prisma as any).uretimScheduledTask.findUnique({ where: { id: params.taskId } })
  } else if (opId) {
    task = await (prisma as any).uretimScheduledTask.findFirst({
      where: { operationId: opId },
      orderBy: { createdAt: "desc" },
    })
  }

  const targetOpId = opId || task?.operationId
  if (!targetOpId) {
    throw new ProductionDomainError("VALIDATION_ERROR", "Operasyon veya Görev kimliği belirtilmelidir.")
  }

  const durationMin = Math.max(
    1,
    Math.round((params.newEndDate.getTime() - params.newStartDate.getTime()) / 60000)
  )

  // 1. Operasyonu Güncelle
  const updatedOp = await (prisma as any).uretimWorkOrderOperation.update({
    where: { id: targetOpId },
    data: {
      scheduledStartDate: params.newStartDate,
      scheduledEndDate: params.newEndDate,
      workCenterId: params.workCenterId || undefined,
      isLocked: params.isLocked !== undefined ? params.isLocked : true, // Elle taşınan operasyon varsayılan olarak kilitlenir
    },
  })

  // 2. ScheduledTask Varsa Güncelle, Yoksa Oluştur
  let updatedTask: any
  if (task) {
    updatedTask = await (prisma as any).uretimScheduledTask.update({
      where: { id: task.id },
      data: {
        scheduledStart: params.newStartDate,
        scheduledEnd: params.newEndDate,
        totalMinutes: durationMin,
        workCenterId: params.workCenterId || task.workCenterId,
        isLocked: params.isLocked !== undefined ? params.isLocked : true,
      },
    })
  }

  // Denetim Logu
  await logProductionAudit({
    userId: params.userId || "SYSTEM",
    action: "UPDATE",
    resource: "uretim_kapasite",
    resourceId: targetOpId,
    details: {
      newStart: params.newStartDate,
      newEnd: params.newEndDate,
      workCenterId: params.workCenterId,
      isLocked: params.isLocked,
    },
  })

  return { operation: updatedOp, task: updatedTask }
}

export async function toggleOperationLockInDb(
  operationId: string,
  isLocked: boolean,
  userId: string = "SYSTEM"
) {
  const updated = await (prisma as any).uretimWorkOrderOperation.update({
    where: { id: operationId },
    data: { isLocked },
  })

  // Varsa ilgili ScheduledTask'ı da güncelle
  await (prisma as any).uretimScheduledTask.updateMany({
    where: { operationId },
    data: { isLocked },
  }).catch(() => null)

  await logProductionAudit({
    userId,
    action: "UPDATE",
    resource: "uretim_kapasite",
    resourceId: operationId,
    details: { isLocked },
  })

  return updated
}

// ─────────────────────────────────────────────────────────────
// 7. SÖZ VERİLEBİLİR TESLİM TARİHİ (CTP) VERİTABANI ENTEGRASYONU
// ─────────────────────────────────────────────────────────────

export async function runCtpSimulationInDb(params: {
  itemId: string
  quantity: number
  requestedDueDate?: string
  branchId?: string | null
  userId?: string
}): Promise<CtpSimulationResult & { simulationId: string; simulationNumber: string }> {
  const [item, workCenters, activeTasks] = await Promise.all([
    (prisma as any).inventoryItem.findUnique({
      where: { id: params.itemId },
      include: {
        uretimRoutings: {
          where: { isDefault: true },
          include: { operations: { orderBy: { operationNumber: "asc" } } },
        },
      },
    }),
    getWorkCentersCapacityDefinitions(params.branchId),
    (prisma as any).uretimScheduledTask.findMany({
      where: { status: { in: ["SCHEDULED", "IN_PROGRESS"] } },
      take: 200,
    }).catch(() => []),
  ])

  if (!item) {
    throw new ProductionDomainError("NOT_FOUND", "Mamul bulunamadı.")
  }

  // Varsayılan rotayı al
  const routing = item.uretimRoutings?.[0]
  const operations: any[] = []

  if (routing?.operations && routing.operations.length > 0) {
    routing.operations.forEach((op: any) => {
      operations.push({
        operationNumber: op.operationNumber,
        name: op.name,
        workCenterId: op.workCenterId || Object.keys(workCenters)[0],
        setupMinutes: op.setupTimeMinutes || 30,
        runMinutesPerUnit: op.runTimeMinutes || 2,
      })
    })
  } else {
    // Rota yoksa varsayılan tek operasyon kabul et
    const firstWcId = Object.keys(workCenters)[0] || "WC-DEF"
    operations.push({
      operationNumber: 10,
      name: `${item.name} Üretimi`,
      workCenterId: firstWcId,
      setupMinutes: 30,
      runMinutesPerUnit: 5,
    })
  }

  const mappedTasks: ScheduledTaskResult[] = (activeTasks || []).map((t: any) => ({
    id: t.id,
    workOrderId: t.workOrderId,
    workOrderNumber: "WO-SIM",
    operationId: t.operationId,
    operationNumber: 10,
    operationName: "Mevcut İş",
    workCenterId: t.workCenterId,
    setupMinutes: t.setupMinutes,
    runMinutes: t.runMinutes,
    totalMinutes: t.totalMinutes,
    scheduledStart: new Date(t.scheduledStart),
    scheduledEnd: new Date(t.scheduledEnd),
    sequenceOrder: t.sequenceOrder,
    isLocked: t.isLocked,
    isDelayed: t.isDelayed,
    delayMinutes: t.delayMinutes,
    status: t.status,
  }))

  const ctpResult = calculateCapableToPromise(
    {
      itemId: item.id,
      itemSku: item.sku,
      itemName: item.name,
      quantity: params.quantity,
      requestedDueDate: params.requestedDueDate ? new Date(params.requestedDueDate) : undefined,
      operations,
    },
    workCenters,
    mappedTasks
  )

  const simNumber = `CTP-${Date.now().toString().slice(-6)}`

  const savedSimulation = await (prisma as any).uretimCtpSimulation.create({
    data: {
      branchId: params.branchId || null,
      simulationNumber: simNumber,
      itemId: item.id,
      quantity: params.quantity,
      requestedDueDate: params.requestedDueDate ? new Date(params.requestedDueDate) : null,
      calculatedEarliestDueDate: ctpResult.calculatedEarliestDueDate,
      isFeasible: ctpResult.isFeasible,
      bottleneckWorkCenterId: ctpResult.bottleneckWorkCenterId || null,
      criticalPathDays: ctpResult.criticalPathDays,
      simulatedScheduleJson: JSON.stringify(ctpResult.schedule),
      createdByUserId: params.userId || null,
    },
  })

  return {
    ...ctpResult,
    simulationId: savedSimulation.id,
    simulationNumber: simNumber,
  }
}

// ─────────────────────────────────────────────────────────────
// 8. FİİLİ SÜRE VARYANSI VE STANDART ÖNERİLERİ
// ─────────────────────────────────────────────────────────────

export async function getOperationTimeVariancesFromDb(branchId?: string | null) {
  const completedOps = await (prisma as any).uretimWorkOrderOperation.findMany({
    where: { status: "COMPLETED" },
    take: 200,
    orderBy: { updatedAt: "desc" },
  })

  const mapped = completedOps.map((op: any) => ({
    operationName: op.name,
    workCenterId: op.workCenterId || "DEFAULT_WC",
    plannedSetupMinutes: op.setupTimeMinutes || 0,
    plannedRunMinutes: op.plannedRunMinutes || 60,
    actualMachineMinutes: op.actualMachineMinutes || 0,
    actualRunMinutes: op.actualRunMinutes || 0,
  }))

  const variances = calculateOperationTimeVariances(mapped)
  return variances
}

export async function acknowledgeCapacityAlertInDb(alertId: string, userId: string = "SYSTEM") {
  const updated = await (prisma as any).uretimCapacityAlert.update({
    where: { id: alertId },
    data: {
      isAcknowledged: true,
      acknowledgedBy: userId,
      acknowledgedAt: new Date(),
    },
  })
  return updated
}

