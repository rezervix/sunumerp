/**
 * Lojistik Faz 5 (lojistik_filo) — C, D, E & H Servisi:
 * - C: Bağımsız Filo Bakım Planları (km/takvim/saat/durum), İş Emirleri, Arıza Kaydı, Lastik & Yedek Parça (InventoryItem)
 *      * Yalnızca productionMaintenanceEngine.ts içindeki SAF matematik yardımcıları (calculateMTBF, calculateMTTR, calculateMaintenanceTotalCost) paylaşılır;
 *      * Hiçbir Uretim* tablosuna veya uretim_bakim bayrağına bağımlılık YOKTUR.
 * - D: Yakıt Kayıtları, Kart Ekstresi İçe Aktarma, L/100km Hesabı, Fatura Mutabakatı & Anormallik Uyarısı
 * - E: Araç Bazlı Km Başı Maliyet (TCO) & Aylık Rapor + Finance Entegrasyonu
 * - H: Sürücü / Araç Ekonomik Sürüş Puanı & Yapılandırılabilir Kaynaktan Tahmini CO2 Hesabı
 */

import { prisma } from "@/lib/db"
import {
  calculateMaintenanceTotalCost,
  calculateMTBF,
  calculateMTTR,
} from "@/lib/services/productionMaintenanceEngine"
import { recordStockLedgerEntry } from "@/lib/logistics/wms/stockLedgerService"
import { LogisticsDomainError, logLogisticsAudit } from "@/lib/logistics/security"
import {
  analyzeVehicleFuelLogs,
  canTransitionFleetWorkOrderStatus,
  computeEcoDrivingScore,
  computeVehicleTco,
  estimateCo2EmissionsFromFactor,
  evaluateFleetMaintenanceDue,
  type Co2FactorRecordInput,
  type FleetMaintWorkOrderStatus,
} from "./constantsAndHelpers"

// ── C: BAĞIMSIZ FİLO BAKIM, ARIZA, LASTİK & YEDEK PARÇA ────────────────────────

export async function listFleetMaintenanceOverview(vehicleId?: string) {
  const dbAny = prisma as any
  const [vehicles, plans, workOrders, spareParts, checklists, faults, tires, items] =
    await Promise.all([
      dbAny.lojistikVehicle.findMany(),
      dbAny.lojistikVehicleMaintenancePlan.findMany(),
      dbAny.lojistikVehicleMaintenanceWorkOrder.findMany(),
      dbAny.lojistikVehicleMaintenanceSparePart.findMany(),
      dbAny.lojistikVehicleMaintenanceChecklistResult.findMany().catch(() => []),
      dbAny.lojistikVehicleFaultLog.findMany(),
      dbAny.lojistikVehicleTire.findMany(),
      dbAny.inventoryItem.findMany().catch(() => []),
    ])

  const vehMap = new Map<string, any>(vehicles.map((v: any) => [v.id, v]))
  const itemMap = new Map<string, any>(items.map((i: any) => [i.id, i]))

  const filterByVeh = <T extends { vehicleId?: string | null }>(arr: T[]) =>
    vehicleId ? arr.filter((x) => x.vehicleId === vehicleId) : arr

  const enrichedPlans = filterByVeh(plans).map((p: any) => {
    const veh = p.vehicleId ? vehMap.get(p.vehicleId) : null
    const dueEval = veh
      ? evaluateFleetMaintenanceDue(p, Number(veh.odometerKm || 0), Number(veh.engineHours || 0))
      : { isDue: false, isSoon: false, reason: null, remainingKm: null, remainingDays: null }
    return {
      ...p,
      plate: veh?.plate || null,
      vehicleOdometerKm: veh?.odometerKm ?? null,
      ...dueEval,
    }
  })

  const enrichedOrders = filterByVeh(workOrders)
    .sort((a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .map((wo: any) => {
      const veh = vehMap.get(wo.vehicleId)
      const parts = spareParts
        .filter((sp: any) => sp.workOrderId === wo.id)
        .map((sp: any) => ({
          ...sp,
          itemSku: itemMap.get(sp.itemId)?.sku || itemMap.get(sp.itemId)?.code || sp.itemId,
          itemName: itemMap.get(sp.itemId)?.name || "Yedek Parça",
        }))
      const checks = checklists.filter((c: any) => c.workOrderId === wo.id)
      return {
        ...wo,
        plate: veh?.plate || "Bilinmeyen Araç",
        vehicleName: veh ? `${veh.brand} ${veh.model}` : "",
        spareParts: parts,
        checklistResults: checks,
      }
    })

  const enrichedFaults = filterByVeh(faults)
    .sort((a: any, b: any) => new Date(b.reportedAt).getTime() - new Date(a.reportedAt).getTime())
    .map((f: any) => ({ ...f, plate: vehMap.get(f.vehicleId)?.plate || null }))

  const enrichedTires = filterByVeh(tires).map((t: any) => ({
    ...t,
    plate: vehMap.get(t.vehicleId)?.plate || null,
    treadWarning: Number(t.currentTreadDepthMm || 0) <= Number(t.minTreadDepthMm || 3) + 1.0,
  }))

  // MTBF & MTTR hesabı saf productionMaintenanceEngine yardımcılarıyla yapılır
  const targetVehicles = vehicleId ? vehicles.filter((v: any) => v.id === vehicleId) : vehicles
  const totalOperatingHours = targetVehicles.reduce(
    (s: number, v: any) => s + Number(v.engineHours || Math.round((v.odometerKm || 0) / 42)),
    0
  )
  const breakdownOrders = enrichedOrders.filter((w: any) => w.orderType === "BREAKDOWN")
  const totalDowntimeMinutes = enrichedOrders.reduce((s: number, w: any) => s + Number(w.downtimeMinutes || 0), 0)
  const mtbf = calculateMTBF(totalOperatingHours, breakdownOrders.length)
  const mttr = calculateMTTR(totalDowntimeMinutes, breakdownOrders.length)
  const totalMaintenanceCostTry = enrichedOrders.reduce((s: number, w: any) => s + Number(w.totalCostTry || 0), 0)

  return {
    plans: enrichedPlans,
    workOrders: enrichedOrders,
    faultLogs: enrichedFaults,
    tires: enrichedTires,
    sparePartItems: items.map((i: any) => ({
      id: i.id,
      sku: i.sku || i.code,
      name: i.name,
      unit: i.unit || "Adet",
      unitCost: Number(i.currentAvgCost || i.fifoUnitCost || i.standardCost || 0),
    })),
    kpis: {
      totalPlans: enrichedPlans.length,
      dueOrOverduePlanCount: enrichedPlans.filter((p: any) => p.isDue).length,
      soonPlanCount: enrichedPlans.filter((p: any) => p.isSoon).length,
      openWorkOrderCount: enrichedOrders.filter((w: any) => !["COMPLETED", "CANCELLED"].includes(w.status)).length,
      openFaultCount: enrichedFaults.filter((f: any) => f.status !== "RESOLVED").length,
      wornTireCount: enrichedTires.filter((t: any) => t.treadWarning || t.status === "NEEDS_REPLACEMENT").length,
      breakdownCount: breakdownOrders.length,
      totalDowntimeMinutes,
      mtbfHours: mtbf.mtbfHours,
      mttrMinutes: mttr.mttrMinutes,
      totalMaintenanceCostTry: Number(totalMaintenanceCostTry.toFixed(2)),
    },
  }
}

export async function upsertFleetMaintenancePlan(
  input: Record<string, any>,
  actor: { userId: string }
) {
  const dbAny = prisma as any
  if (!input.name) {
    throw new LogisticsDomainError("VALIDATION_ERROR", "Bakım planı adı zorunludur.", 400)
  }

  let vehicle: any = null
  if (input.vehicleId) {
    vehicle = await dbAny.lojistikVehicle.findUnique({ where: { id: input.vehicleId } })
    if (!vehicle) throw new LogisticsDomainError("NOT_FOUND", "Plan bağlanacak araç bulunamadı.", 404)
  }

  const planType = String(input.planType || "METER_KM").toUpperCase()
  const code = String(input.code || `FPLN-${Date.now().toString().slice(-6)}`).trim().toUpperCase()
  const existing = input.id
    ? await dbAny.lojistikVehicleMaintenancePlan.findUnique({ where: { id: input.id } }).catch(() => null)
    : null

  const payload = {
    code,
    name: String(input.name).trim(),
    vehicleId: vehicle ? vehicle.id : existing?.vehicleId ?? null,
    vehicleTypeFilter: input.vehicleTypeFilter || existing?.vehicleTypeFilter || null,
    planType,
    frequencyDays: input.frequencyDays ? Number(input.frequencyDays) : existing?.frequencyDays ?? null,
    frequencyKm: input.frequencyKm ? Number(input.frequencyKm) : existing?.frequencyKm ?? null,
    frequencyHours: input.frequencyHours ? Number(input.frequencyHours) : existing?.frequencyHours ?? null,
    conditionParameter: input.conditionParameter || existing?.conditionParameter || null,
    conditionThreshold: input.conditionThreshold !== undefined ? Number(input.conditionThreshold) : existing?.conditionThreshold ?? null,
    lastTriggeredDate: input.lastTriggeredDate ? new Date(input.lastTriggeredDate) : existing?.lastTriggeredDate ?? new Date(),
    lastTriggeredKm:
      input.lastTriggeredKm !== undefined
        ? Number(input.lastTriggeredKm)
        : existing?.lastTriggeredKm ?? (vehicle ? Number(vehicle.odometerKm || 0) : 0),
    lastTriggeredHours:
      input.lastTriggeredHours !== undefined
        ? Number(input.lastTriggeredHours)
        : existing?.lastTriggeredHours ?? (vehicle ? Number(vehicle.engineHours || 0) : 0),
    nextScheduledDate: input.nextScheduledDate
      ? new Date(input.nextScheduledDate)
      : planType === "CALENDAR" && input.frequencyDays
        ? new Date(Date.now() + Number(input.frequencyDays) * 86_400_000)
        : existing?.nextScheduledDate ?? null,
    estimatedCostTry: Number(input.estimatedCostTry ?? existing?.estimatedCostTry ?? 0),
    checklistJson: input.checklistJson ?? existing?.checklistJson ?? null,
    isActive: input.isActive !== undefined ? Boolean(input.isActive) : true,
    notes: input.notes !== undefined ? input.notes : existing?.notes ?? null,
    updatedAt: new Date(),
  }

  const saved = existing
    ? await dbAny.lojistikVehicleMaintenancePlan.update({ where: { id: existing.id }, data: payload })
    : await dbAny.lojistikVehicleMaintenancePlan.create({
        data: { id: `fpln-${Date.now()}-${Math.random().toString(36).slice(2, 5)}`, ...payload, createdAt: new Date() },
      })

  await logLogisticsAudit({
    userId: actor.userId,
    action: existing ? "UPDATE_FLEET_MAINT_PLAN" : "CREATE_FLEET_MAINT_PLAN",
    resource: "lojistik_filo",
    resourceId: saved.id,
    moduleKey: "lojistik_filo",
    metadata: { code: saved.code, planType, vehicleId: saved.vehicleId },
  })

  return saved
}

export async function createFleetFaultAndOptionalWorkOrder(
  input: Record<string, any>,
  actor: { userId: string }
) {
  const dbAny = prisma as any
  const vehicle = await dbAny.lojistikVehicle.findUnique({ where: { id: input.vehicleId } })
  if (!vehicle) throw new LogisticsDomainError("NOT_FOUND", "Araç bulunamadı.", 404)
  if (!input.title) throw new LogisticsDomainError("VALIDATION_ERROR", "Arıza başlığı zorunludur.", 400)

  const faultCode = String(input.faultCode || `FARZ-${Date.now().toString().slice(-6)}`).trim().toUpperCase()
  const severity = String(input.severity || "HIGH").toUpperCase()

  const fault = await dbAny.lojistikVehicleFaultLog.create({
    data: {
      id: `ffault-${Date.now()}-${Math.random().toString(36).slice(2, 5)}`,
      faultCode,
      vehicleId: vehicle.id,
      driverId: input.driverId || vehicle.assignedDriverId || null,
      reportedAt: input.reportedAt ? new Date(input.reportedAt) : new Date(),
      odometerKm: Number(input.odometerKm ?? vehicle.odometerKm ?? 0),
      severity,
      category: String(input.category || "MEKANIK").toUpperCase(),
      title: String(input.title).trim(),
      description: input.description?.trim() || null,
      status: input.createWorkOrder ? "WORK_ORDER_CREATED" : "OPEN",
      linkedWorkOrderId: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
  })

  if (severity === "CRITICAL" || severity === "HIGH") {
    await dbAny.lojistikVehicle.update({
      where: { id: vehicle.id },
      data: { status: "FAULT", updatedAt: new Date() },
    })
  }

  let workOrder: any = null
  if (input.createWorkOrder) {
    workOrder = await createFleetWorkOrder(
      {
        vehicleId: vehicle.id,
        orderType: "BREAKDOWN",
        priority: severity,
        title: `[Arıza #${faultCode}] ${fault.title}`,
        description: fault.description,
        failureReasonCode: fault.category,
      },
      actor
    )
    await dbAny.lojistikVehicleFaultLog.update({
      where: { id: fault.id },
      data: { linkedWorkOrderId: workOrder.id },
    })
    fault.linkedWorkOrderId = workOrder.id
  }

  return { fault, workOrder }
}

export async function createFleetWorkOrder(
  input: Record<string, any>,
  actor: { userId: string }
) {
  const dbAny = prisma as any
  const vehicle = await dbAny.lojistikVehicle.findUnique({ where: { id: input.vehicleId } })
  if (!vehicle) throw new LogisticsDomainError("NOT_FOUND", "İş emri açılacak araç bulunamadı.", 404)
  if (!input.title) throw new LogisticsDomainError("VALIDATION_ERROR", "İş emri başlığı zorunludur.", 400)

  const orderType = String(input.orderType || "PREVENTIVE").toUpperCase()
  const woNum = String(input.workOrderNumber || `FBKM-${Date.now().toString().slice(-6)}`).trim().toUpperCase()

  const wo = await dbAny.lojistikVehicleMaintenanceWorkOrder.create({
    data: {
      id: `fwo-${Date.now()}-${Math.random().toString(36).slice(2, 5)}`,
      workOrderNumber: woNum,
      vehicleId: vehicle.id,
      planId: input.planId || null,
      orderType,
      priority: String(input.priority || (orderType === "BREAKDOWN" ? "HIGH" : "MEDIUM")).toUpperCase(),
      status: "REQUESTED",
      title: String(input.title).trim(),
      description: input.description?.trim() || null,
      serviceProviderName: input.serviceProviderName?.trim() || "Sunum Yetkili Filo Servisi",
      odometerKmAtService: Number(input.odometerKmAtService ?? vehicle.odometerKm ?? 0),
      engineHoursAtService: Number(input.engineHoursAtService ?? vehicle.engineHours ?? 0),
      downtimeMinutes: Number(input.downtimeMinutes || 0),
      laborHours: Number(input.laborHours || 0),
      laborCostTry: Number(input.laborCostTry || 0),
      sparePartCostTry: 0,
      externalServiceCostTry: Number(input.externalServiceCostTry || 0),
      totalCostTry: Number(input.laborCostTry || 0) + Number(input.externalServiceCostTry || 0),
      failureReasonCode: input.failureReasonCode || null,
      plannedDate: input.plannedDate ? new Date(input.plannedDate) : new Date(),
      createdBy: actor.userId,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
  })

  if (orderType === "BREAKDOWN" && vehicle.status === "ACTIVE") {
    await dbAny.lojistikVehicle.update({
      where: { id: vehicle.id },
      data: { status: "MAINTENANCE", updatedAt: new Date() },
    })
  }

  await logLogisticsAudit({
    userId: actor.userId,
    action: "CREATE_FLEET_WORK_ORDER",
    resource: "lojistik_filo",
    resourceId: wo.id,
    moduleKey: "lojistik_filo",
    metadata: { workOrderNumber: woNum, vehicleId: vehicle.id, orderType },
  })

  return wo
}

export async function recordFleetWorkOrderSparePart(params: {
  workOrderId: string
  itemId: string
  quantityUsed: number
  warehouseId?: string | null
  unitCostOverride?: number
  actorUserId: string
}) {
  const dbAny = prisma as any
  const wo = await dbAny.lojistikVehicleMaintenanceWorkOrder.findUnique({
    where: { id: params.workOrderId },
  })
  if (!wo) throw new LogisticsDomainError("NOT_FOUND", "Bakım iş emri bulunamadı.", 404)

  const item = await dbAny.inventoryItem.findUnique({ where: { id: params.itemId } })
  if (!item) throw new LogisticsDomainError("NOT_FOUND", "Yedek parça stok kartı (InventoryItem) bulunamadı.", 404)

  const qty = Math.max(0.01, Number(params.quantityUsed || 1))
  let unitCostTry = Number(
    params.unitCostOverride ?? item.currentAvgCost ?? item.fifoUnitCost ?? item.standardCost ?? 0
  )
  let totalCostTry = Number((qty * unitCostTry).toFixed(2))
  let stockMovementId: string | null = null

  // Stok bakiyesi olan depo belirtildiyse mevcut stok defterinden (Faz 2) düş
  const balances = await prisma.stockBalance.findMany({ where: { itemId: item.id } }).catch(() => [])
  const targetWhId =
    params.warehouseId ||
    balances.find((b: any) => Number(b.availableQty || b.onHandQty || 0) >= qty)?.warehouseId

  if (targetWhId) {
    const ledgerRes = await recordStockLedgerEntry({
      itemId: item.id,
      warehouseId: targetWhId,
      movementType: "ISSUE",
      quantityDelta: qty,
      referenceDocNo: wo.workOrderNumber,
      performedBy: params.actorUserId,
      notes: `Filo bakım yedek parça kullanımı (${wo.workOrderNumber})`,
      idempotencyKey: `fleet-wo-part-${wo.id}-${item.id}-${Date.now()}`,
      method: "SYSTEM",
      unitCostOverride: params.unitCostOverride,
    })
    stockMovementId = ledgerRes.movement?.id || null
    if (ledgerRes.totalCost > 0) {
      totalCostTry = ledgerRes.totalCost
      unitCostTry = ledgerRes.unitCost
    }
  }

  const partRec = await dbAny.lojistikVehicleMaintenanceSparePart.create({
    data: {
      id: `fwosp-${Date.now()}-${Math.random().toString(36).slice(2, 5)}`,
      workOrderId: wo.id,
      itemId: item.id,
      quantityUsed: qty,
      unitCostTry,
      totalCostTry,
      stockMovementId,
      createdAt: new Date(),
    },
  })

  const allParts = await dbAny.lojistikVehicleMaintenanceSparePart.findMany({ where: { workOrderId: wo.id } })
  const sparePartCostTry = Number(
    allParts.reduce((s: number, p: any) => s + Number(p.totalCostTry || 0), 0).toFixed(2)
  )
  const totalCost = Number(
    (sparePartCostTry + Number(wo.laborCostTry || 0) + Number(wo.externalServiceCostTry || 0)).toFixed(2)
  )

  await dbAny.lojistikVehicleMaintenanceWorkOrder.update({
    where: { id: wo.id },
    data: { sparePartCostTry, totalCostTry: totalCost, updatedAt: new Date() },
  })

  return { part: partRec, sparePartCostTry, totalCostTry: totalCost, stockMovementId }
}

export async function updateFleetWorkOrderStatus(params: {
  workOrderId: string
  nextStatus: FleetMaintWorkOrderStatus
  downtimeMinutes?: number
  laborHours?: number
  hourlyRateTry?: number
  externalServiceCostTry?: number
  checklistResults?: Array<{ sequence: number; instruction: string; isPassed: boolean; measuredVal?: string }>
  rootCause?: string
  postToFinance?: boolean
  actorUserId: string
}) {
  const dbAny = prisma as any
  const wo = await dbAny.lojistikVehicleMaintenanceWorkOrder.findUnique({
    where: { id: params.workOrderId },
  })
  if (!wo) throw new LogisticsDomainError("NOT_FOUND", "Filo bakım iş emri bulunamadı.", 404)

  if (!canTransitionFleetWorkOrderStatus(wo.status as FleetMaintWorkOrderStatus, params.nextStatus)) {
    throw new LogisticsDomainError(
      "CONFLICT",
      `Geçersiz filo bakım iş emri durum geçişi: ${wo.status} -> ${params.nextStatus}`,
      409
    )
  }

  const vehicle = await dbAny.lojistikVehicle.findUnique({ where: { id: wo.vehicleId } })
  const updates: Record<string, any> = {
    status: params.nextStatus,
    updatedAt: new Date(),
  }

  if (params.nextStatus === "IN_PROGRESS") {
    updates.startedAt = wo.startedAt || new Date()
    if (vehicle && vehicle.status === "ACTIVE") {
      await dbAny.lojistikVehicle.update({ where: { id: vehicle.id }, data: { status: "MAINTENANCE" } })
    }
  }

  if (params.nextStatus === "COMPLETED") {
    updates.completedAt = new Date()
    const laborH = Number(params.laborHours ?? wo.laborHours ?? 1)
    const downtime = Number(params.downtimeMinutes ?? wo.downtimeMinutes ?? 0)
    const extCost = Number(params.externalServiceCostTry ?? wo.externalServiceCostTry ?? 0)
    const spareCost = Number(wo.sparePartCostTry || 0)
    const breakdown = calculateMaintenanceTotalCost({
      sparePartsCost: spareCost,
      laborHours: laborH,
      hourlyLaborRate: Number(params.hourlyRateTry || 350),
      externalServiceCost: extCost,
    })

    updates.downtimeMinutes = downtime
    updates.laborHours = laborH
    updates.laborCostTry = breakdown.laborCost
    updates.externalServiceCostTry = extCost
    updates.totalCostTry = breakdown.totalCost
    if (params.rootCause) updates.rootCause = params.rootCause

    if (Array.isArray(params.checklistResults) && params.checklistResults.length > 0) {
      for (const item of params.checklistResults) {
        await dbAny.lojistikVehicleMaintenanceChecklistResult.create({
          data: {
            id: `fchk-${Date.now()}-${Math.random().toString(36).slice(2, 5)}`,
            workOrderId: wo.id,
            sequence: item.sequence,
            instruction: item.instruction,
            isPassed: Boolean(item.isPassed),
            measuredVal: item.measuredVal || null,
            checkedAt: new Date(),
          },
        })
      }
    }

    if (wo.planId) {
      const plan = await dbAny.lojistikVehicleMaintenancePlan.findUnique({ where: { id: wo.planId } }).catch(() => null)
      if (plan) {
        await dbAny.lojistikVehicleMaintenancePlan.update({
          where: { id: plan.id },
          data: {
            lastTriggeredDate: new Date(),
            lastTriggeredKm: vehicle?.odometerKm ?? wo.odometerKmAtService,
            lastTriggeredHours: vehicle?.engineHours ?? wo.engineHoursAtService,
            nextScheduledDate:
              plan.frequencyDays && Number(plan.frequencyDays) > 0
                ? new Date(Date.now() + Number(plan.frequencyDays) * 86_400_000)
                : plan.nextScheduledDate,
            updatedAt: new Date(),
          },
        })
      }
    }

    if (vehicle) {
      await dbAny.lojistikVehicle.update({
        where: { id: vehicle.id },
        data: { status: "ACTIVE", updatedAt: new Date() },
      })
    }

    if (params.postToFinance !== false && breakdown.totalCost > 0 && !wo.financeId) {
      const fin = await (prisma as any).finance.create({
        data: {
          branchId: vehicle?.branchId || "local-debug-branch",
          type: "EXPENSE",
          amount: breakdown.totalCost,
          category: "Bakım Onarım",
          description: `${vehicle?.plate || wo.vehicleId} — Filo Bakım İş Emri (${wo.workOrderNumber}: ${wo.title})`,
          status: "approved",
          approvedBy: params.actorUserId,
          vehicleId: wo.vehicleId,
          driverId: vehicle?.assignedDriverId || null,
          fleetCostCategory: "MAINTENANCE",
          date: new Date(),
        },
      })
      updates.financeId = fin.id
    }
  }

  const saved = await dbAny.lojistikVehicleMaintenanceWorkOrder.update({
    where: { id: wo.id },
    data: updates,
  })

  await logLogisticsAudit({
    userId: params.actorUserId,
    action: "UPDATE_FLEET_WORK_ORDER_STATUS",
    resource: "lojistik_filo",
    resourceId: saved.id,
    moduleKey: "lojistik_filo",
    metadata: { workOrderNumber: saved.workOrderNumber, status: saved.status, totalCostTry: saved.totalCostTry },
  })

  return saved
}

export async function upsertFleetTire(input: Record<string, any>, actor: { userId: string }) {
  const dbAny = prisma as any
  const vehicle = await dbAny.lojistikVehicle.findUnique({ where: { id: input.vehicleId } })
  if (!vehicle) throw new LogisticsDomainError("NOT_FOUND", "Lastik tanımlanacak araç bulunamadı.", 404)

  const tread = Number(input.currentTreadDepthMm ?? 8.0)
  const minTread = Number(input.minTreadDepthMm ?? 3.0)
  const status = String(
    input.status || (tread <= minTread ? "NEEDS_REPLACEMENT" : "ACTIVE")
  ).toUpperCase()

  const existing = input.id
    ? await dbAny.lojistikVehicleTire.findUnique({ where: { id: input.id } }).catch(() => null)
    : null

  const payload = {
    vehicleId: vehicle.id,
    serialOrDot: String(input.serialOrDot || existing?.serialOrDot || `DOT-${Date.now().toString().slice(-6)}`).toUpperCase(),
    brandModel: String(input.brandModel || existing?.brandModel || "Michelin Agilis").trim(),
    sizeCode: String(input.sizeCode || existing?.sizeCode || "215/65R16C").trim(),
    position: String(input.position || existing?.position || "FRONT_LEFT").toUpperCase(),
    installedOdometerKm: Number(input.installedOdometerKm ?? existing?.installedOdometerKm ?? vehicle.odometerKm ?? 0),
    currentTreadDepthMm: tread,
    minTreadDepthMm: minTread,
    status,
    lastInspectedAt: new Date(),
    costTry: Number(input.costTry ?? existing?.costTry ?? 0),
    notes: input.notes !== undefined ? input.notes : existing?.notes ?? null,
    updatedAt: new Date(),
  }

  return existing
    ? await dbAny.lojistikVehicleTire.update({ where: { id: existing.id }, data: payload })
    : await dbAny.lojistikVehicleTire.create({
        data: { id: `tire-${Date.now()}-${Math.random().toString(36).slice(2, 5)}`, ...payload, createdAt: new Date() },
      })
}

// ── D: YAKIT KAYITLARI, İTHALAT, L/100KM & FATURA MUTABAKATI ──────────────────

export async function listFleetFuelOverview(vehicleId?: string) {
  const dbAny = prisma as any
  const [vehicles, drivers, fuelLogs] = await Promise.all([
    dbAny.lojistikVehicle.findMany(),
    dbAny.lojistikDriver.findMany(),
    dbAny.lojistikFuelLog.findMany(),
  ])

  const vehMap = new Map<string, any>(vehicles.map((v: any) => [v.id, v]))
  const drvMap = new Map<string, any>(drivers.map((d: any) => [d.id, d]))
  const targetVehicles = vehicleId ? vehicles.filter((v: any) => v.id === vehicleId) : vehicles

  const vehicleSummaries = targetVehicles.map((v: any) => {
    const analysis = analyzeVehicleFuelLogs(v.id, fuelLogs, Number(v.expectedLPer100Km || 14))
    return {
      ...analysis,
      plate: v.plate,
      brandModel: `${v.brand} ${v.model}`,
      fuelType: v.fuelType,
      expectedLPer100Km: Number(v.expectedLPer100Km || 14),
    }
  })

  const filteredLogs = (vehicleId ? fuelLogs.filter((l: any) => l.vehicleId === vehicleId) : fuelLogs)
    .sort((a: any, b: any) => new Date(b.fuelDate).getTime() - new Date(a.fuelDate).getTime())
    .map((l: any) => ({
      ...l,
      plate: vehMap.get(l.vehicleId)?.plate || l.vehicleId,
      driverName: l.driverId ? drvMap.get(l.driverId)?.fullName || null : null,
    }))

  return {
    logs: filteredLogs,
    vehicleSummaries,
    anomalyLogs: filteredLogs.filter((l: any) => l.isAnomaly),
  }
}

export async function recordFuelLogEntry(
  input: Record<string, any>,
  actor: { userId: string; branchId?: string }
) {
  const dbAny = prisma as any
  const vehicle = await dbAny.lojistikVehicle.findUnique({ where: { id: input.vehicleId } })
  if (!vehicle) throw new LogisticsDomainError("NOT_FOUND", "Yakıt kaydedilecek araç bulunamadı.", 404)

  const odometerKm = Number(input.odometerKm || 0)
  const liters = Math.max(0.1, Number(input.liters || 0))
  const totalAmountTry = Number(
    input.totalAmountTry ?? Number(input.unitPriceTry || 0) * liters
  )
  const unitPriceTry =
    Number(input.unitPriceTry || 0) > 0
      ? Number(input.unitPriceTry)
      : Number((totalAmountTry / liters).toFixed(2))

  const existingLogs = await dbAny.lojistikFuelLog.findMany({ where: { vehicleId: vehicle.id } })
  const tempId = `fuel-${Date.now()}-${Math.random().toString(36).slice(2, 5)}`
  const candidate = {
    id: tempId,
    vehicleId: vehicle.id,
    driverId: input.driverId || vehicle.assignedDriverId || null,
    fuelDate: new Date(input.fuelDate || new Date()),
    fuelType: String(input.fuelType || vehicle.fuelType || "DIESEL").toUpperCase(),
    odometerKm,
    liters,
    unitPriceTry,
    totalAmountTry: Number(totalAmountTry.toFixed(2)),
    fullTank: input.fullTank !== undefined ? Boolean(input.fullTank) : true,
    stationName: input.stationName?.trim() || "Anlaşmalı İstasyon",
    fuelCardNo: input.fuelCardNo?.trim() || null,
    invoiceRef: input.invoiceRef?.trim() || null,
    invoiceLiters: input.invoiceLiters !== undefined && input.invoiceLiters !== null && input.invoiceLiters !== ""
      ? Number(input.invoiceLiters)
      : null,
    invoiceAmountTry: input.invoiceAmountTry !== undefined && input.invoiceAmountTry !== null && input.invoiceAmountTry !== ""
      ? Number(input.invoiceAmountTry)
      : null,
    source: String(input.source || "MANUAL").toUpperCase(),
  }

  const analysis = analyzeVehicleFuelLogs(
    vehicle.id,
    [...existingLogs, candidate],
    Number(vehicle.expectedLPer100Km || 14)
  )
  const seg = analysis.segments.find((s) => s.logId === tempId)

  let financeId: string | null = null
  if (candidate.totalAmountTry > 0 && input.postToFinance !== false) {
    const fin = await (prisma as any).finance.create({
      data: {
        branchId: vehicle.branchId || actor.branchId || "local-debug-branch",
        type: "EXPENSE",
        amount: candidate.totalAmountTry,
        category: "Araç & Yakıt",
        description: `${vehicle.plate} — Yakıt Alımı (${liters.toFixed(1)} L, ${candidate.stationName})`,
        status: "approved",
        approvedBy: actor.userId,
        vehicleId: vehicle.id,
        driverId: candidate.driverId,
        fleetCostCategory: "FUEL",
        date: candidate.fuelDate,
      },
    })
    financeId = fin.id
  }

  const saved = await dbAny.lojistikFuelLog.create({
    data: {
      ...candidate,
      calculatedLPer100Km: seg?.litersPer100Km ?? null,
      isAnomaly: Boolean(seg?.isAnomaly),
      anomalyNote: seg?.isAnomaly
        ? `Beklenen ${vehicle.expectedLPer100Km} L/100km sınırının %${seg.anomalyRatioPct} üzerinde (${seg.litersPer100Km} L/100km).`
        : null,
      financeId,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
  })

  if (odometerKm > Number(vehicle.odometerKm || 0)) {
    await dbAny.lojistikVehicle.update({
      where: { id: vehicle.id },
      data: { odometerKm, updatedAt: new Date() },
    })
  }

  await logLogisticsAudit({
    userId: actor.userId,
    action: "CREATE_FUEL_LOG",
    resource: "lojistik_filo",
    resourceId: saved.id,
    moduleKey: "lojistik_filo",
    metadata: { plate: vehicle.plate, liters, lPer100Km: saved.calculatedLPer100Km, isAnomaly: saved.isAnomaly },
  })

  return saved
}

export async function importFuelCardInvoices(
  rows: Array<Record<string, any>>,
  actor: { userId: string; branchId?: string }
) {
  const dbAny = prisma as any
  const vehicles = await dbAny.lojistikVehicle.findMany()
  const existingLogs = await dbAny.lojistikFuelLog.findMany()

  let imported = 0
  let reconciled = 0
  let unmatched = 0

  for (const r of rows) {
    const plate = String(r.plate || "").trim().toUpperCase()
    const vehicle = vehicles.find((v: any) => String(v.plate).toUpperCase() === plate)
    if (!vehicle) {
      unmatched++
      continue
    }

    const invRef = r.invoiceRef ? String(r.invoiceRef).trim() : null
    const invLiters = Number(r.invoiceLiters ?? r.liters ?? 0)
    const invAmount = Number(r.invoiceAmountTry ?? r.totalAmountTry ?? 0)

    const matchExisting = invRef
      ? existingLogs.find((l: any) => l.vehicleId === vehicle.id && l.invoiceRef === invRef)
      : null

    if (matchExisting) {
      await dbAny.lojistikFuelLog.update({
        where: { id: matchExisting.id },
        data: {
          invoiceLiters: invLiters,
          invoiceAmountTry: invAmount,
          fuelCardNo: r.fuelCardNo || matchExisting.fuelCardNo,
          updatedAt: new Date(),
        },
      })
      reconciled++
    } else {
      await recordFuelLogEntry(
        {
          vehicleId: vehicle.id,
          fuelDate: r.fuelDate || new Date().toISOString(),
          fuelType: vehicle.fuelType,
          odometerKm: Number(r.odometerKm ?? Number(vehicle.odometerKm || 0) + 250),
          liters: invLiters,
          totalAmountTry: invAmount,
          stationName: r.stationName || "Yakıt Kartı Ekstresi",
          fuelCardNo: r.fuelCardNo || null,
          invoiceRef: invRef,
          invoiceLiters: invLiters,
          invoiceAmountTry: invAmount,
          source: "FUEL_CARD_IMPORT",
          postToFinance: false,
        },
        actor
      )
      imported++
    }
  }

  return { imported, reconciled, unmatched, totalProcessed: rows.length }
}

// ── E & H: CO2 KATSAYILARI, TCO (KM BAŞI MALİYET) & VERİMLİLİK RAPORLARI ─────

export async function listCo2EmissionFactors() {
  const dbAny = prisma as any
  return await dbAny.lojistikCo2EmissionFactor.findMany()
}

export async function upsertCo2EmissionFactor(
  input: Co2FactorRecordInput & { notes?: string | null },
  actor: { userId: string }
) {
  const dbAny = prisma as any
  const fuelType = String(input.fuelType || "").trim().toUpperCase()
  if (!fuelType || !input.sourceName || !input.sourceYear) {
    throw new LogisticsDomainError(
      "VALIDATION_ERROR",
      "Yakıt tipi, kaynak adı ve kaynak yılı zorunludur.",
      400
    )
  }

  const existing = await dbAny.lojistikCo2EmissionFactor
    .findFirst({ where: { fuelType } })
    .catch(() => null)
  const payload = {
    fuelType,
    unit: input.unit || "L",
    kgCo2ePerUnit: Number(input.kgCo2ePerUnit || 0),
    sourceName: String(input.sourceName).trim(),
    sourceYear: Number(input.sourceYear),
    sourceVersion: input.sourceVersion || null,
    sourceUrl: input.sourceUrl || null,
    isActive: true,
    updatedBy: actor.userId,
    updatedAt: new Date(),
  }

  return existing
    ? await dbAny.lojistikCo2EmissionFactor.update({ where: { id: existing.id }, data: payload })
    : await dbAny.lojistikCo2EmissionFactor.create({
        data: { id: `co2-${fuelType.toLowerCase()}`, ...payload, createdAt: new Date() },
      })
}

export async function getFleetTcoAndEfficiencyReport(params?: { month?: string }) {
  const dbAny = prisma as any
  const [vehicles, drivers, leases, docs, penalties, workOrders, fuelLogs, finances, telemetryEvents, co2Factors] =
    await Promise.all([
      dbAny.lojistikVehicle.findMany(),
      dbAny.lojistikDriver.findMany(),
      dbAny.lojistikVehicleLease.findMany(),
      dbAny.lojistikVehicleDocument.findMany(),
      dbAny.lojistikTrafficPenalty.findMany(),
      dbAny.lojistikVehicleMaintenanceWorkOrder.findMany(),
      dbAny.lojistikFuelLog.findMany(),
      (prisma as any).finance.findMany().catch(() => []),
      dbAny.lojistikTelemetryEvent.findMany(),
      dbAny.lojistikCo2EmissionFactor.findMany(),
    ])

  const filterMonth = params?.month?.trim() // YYYY-MM
  const matchesMonth = (dtVal: any) => {
    if (!filterMonth || !dtVal) return true
    const iso = new Date(dtVal).toISOString().slice(0, 7)
    return iso === filterMonth
  }

  const factorByFuel = new Map<string, any>(
    co2Factors.map((f: any) => [String(f.fuelType).toUpperCase(), f])
  )
  const drvMap = new Map<string, any>(drivers.map((d: any) => [d.id, d]))

  const vehicleRows = vehicles.map((v: any) => {
    const vFuels = fuelLogs.filter((l: any) => l.vehicleId === v.id && matchesMonth(l.fuelDate))
    const vWos = workOrders.filter((w: any) => w.vehicleId === v.id && matchesMonth(w.completedAt || w.createdAt))
    const vDocs = docs.filter((d: any) => d.vehicleId === v.id && matchesMonth(d.issuedAt || d.createdAt))
    const vPen = penalties.filter((p: any) => p.vehicleId === v.id && matchesMonth(p.violationDate))
    const vLease = leases.find((l: any) => l.vehicleId === v.id && l.isActive !== false)
    const vFinances = finances.filter((f: any) => f.vehicleId === v.id && matchesMonth(f.date))
    const drv = v.assignedDriverId ? drvMap.get(v.assignedDriverId) : null

    const fuelCostTry = vFuels.reduce((s: number, l: any) => s + Number(l.totalAmountTry || 0), 0)
    const maintenanceCostTry = vWos.reduce((s: number, w: any) => s + Number(w.totalCostTry || 0), 0)
    const penaltyCostTry = vPen.reduce((s: number, p: any) => s + Number(p.amountTry || 0), 0)
    const insuranceTaxTry = vDocs.reduce((s: number, d: any) => s + Number(d.costTry || 0), 0)
    const leaseDepreciationTry = vLease
      ? Number(vLease.monthlyCostTry || 0) + Number(vLease.depreciationMonthlyTry || 0)
      : Number(v.monthlyDepreciationTry || 0)
    const driverCostTry = drv ? Number(drv.monthlySalaryCostTry || 0) : 0

    // Yakıt fişlerinden gelen veya telematik odometreden hesaplanan dönem mesafesi
    const fuelAnalysis = analyzeVehicleFuelLogs(v.id, vFuels, Number(v.expectedLPer100Km || 14))
    const vEvents = telemetryEvents.filter((e: any) => e.vehicleId === v.id && matchesMonth(e.eventTime))
    const odoVals = vEvents
      .map((e: any) => Number(e.odometerKm || 0))
      .filter((n: number) => n > 0)
    const telDist = odoVals.length >= 2 ? Math.max(...odoVals) - Math.min(...odoVals) : 0
    const effectiveDistanceKm = Math.max(fuelAnalysis.totalDistanceKm, telDist, vFuels.length > 0 ? 1200 : 0)

    const tco = computeVehicleTco(
      {
        fuelCostTry,
        maintenanceCostTry,
        leaseDepreciationTry,
        driverCostTry,
        penaltyCostTry,
        insuranceTaxTry,
      },
      effectiveDistanceKm
    )

    // Sürüş davranışı metrikleri (DB telematik olaylarından)
    const idleMinutes = vEvents.reduce((s: number, e: any) => s + Number(e.idleMinutes || 0), 0)
    const speedViolationCount = vEvents.filter((e: any) => e.eventType === "SPEED_VIOLATION").length
    const harshBrakeCount = vEvents.filter((e: any) => e.eventType === "HARSH_BRAKE").length
    const harshAccelCount = vEvents.filter((e: any) => e.eventType === "HARSH_ACCEL").length
    const eco = computeEcoDrivingScore({
      idleMinutes,
      speedViolationCount,
      harshBrakeCount,
      harshAccelCount,
      distanceKm: Math.max(effectiveDistanceKm, 100),
    })

    // CO2 Tahmini (yapılandırılabilir DB katsayılarından)
    const factorKey = String(v.fuelType || "DIESEL").toUpperCase() === "HYBRID" ? "HYBRID" : String(v.fuelType || "DIESEL").toUpperCase()
    const co2Factor = factorByFuel.get(factorKey) || factorByFuel.get("PETROL") || factorByFuel.get("DIESEL")
    const totalLiters = fuelAnalysis.totalLitersLogged
    const co2 = co2Factor ? estimateCo2EmissionsFromFactor(totalLiters, co2Factor) : null

    return {
      vehicleId: v.id,
      plate: v.plate,
      vehicleType: v.vehicleType,
      fuelType: v.fuelType,
      ownershipType: v.ownershipType,
      driverName: drv?.fullName || null,
      financeLinkedCount: vFinances.length,
      avgLPer100Km: fuelAnalysis.avgLitersPer100Km,
      totalLiters,
      ...tco,
      ecoScore: eco.score,
      ecoGrade: eco.grade,
      idleMinutes: eco.idleMinutes,
      speedViolationCount: eco.speedViolationCount,
      harshBrakeCount: eco.harshBrakeCount,
      harshAccelCount: eco.harshAccelCount,
      co2Estimate: co2,
    }
  })

  const totalFleetCostTry = Number(vehicleRows.reduce((s: number, r: any) => s + r.totalCostTry, 0).toFixed(2))
  const totalFleetDistanceKm = Number(vehicleRows.reduce((s: number, r: any) => s + r.totalDistanceKm, 0).toFixed(1))
  const avgCostPerKmTry = totalFleetDistanceKm > 0 ? Number((totalFleetCostTry / totalFleetDistanceKm).toFixed(2)) : 0
  const totalEstimatedCo2Kg = Number(
    vehicleRows.reduce((s: number, r: any) => s + Number(r.co2Estimate?.totalKgCo2e || 0), 0).toFixed(2)
  )

  return {
    month: filterMonth || "ALL",
    summary: {
      totalVehiclesEvaluated: vehicleRows.length,
      totalFleetCostTry,
      totalFleetDistanceKm,
      avgCostPerKmTry,
      totalEstimatedCo2Kg,
      totalEstimatedCo2Tonnes: Number((totalEstimatedCo2Kg / 1000).toFixed(4)),
    },
    co2Factors,
    co2DisclaimerNote:
      "Tahmini CO₂ değerleridir. Katsayılar Birleşik Krallık (DESNZ/DEFRA) tablolarına dayanır, Türkiye'ye özgü değildir.",
    vehicles: vehicleRows,
  }
}
