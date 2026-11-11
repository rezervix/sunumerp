/**
 * Sunum ERP — Üretim Ekipman & Bakım Yönetimi (CMMS & Kestirimci Bakım) Veritabanı Servisi
 *
 * Uçtan Uca CRUD, İş Kuralları, Otomatik İş Emri Tetikleme ve Denetim (Audit) Entegrasyonu:
 * 1. Ekipman & Varlık Hiyerarşisi (Ağaç Yapısı, Kritiklik A/B/C)
 * 2. Ekipman Yedek Parça Listesi (BOM) & Stok / Tedarik Durumu
 * 3. Bakım Planları & Kontrol Listeleri (Takvim, Sayaç, Durum/Sensör Bazlı)
 * 4. Bakım İş Emirleri Yaşam Döngüsü (Talep -> Planlama -> İcra -> Tamamlama)
 * 5. Kestirimci Bakım (PdM) Sensör Telemetrisi Kaydı ve Eşik Alarmı
 * 6. Kapasite Çizelgeleme & Bakım Duruşu Çakışma Tespiti
 * 7. MTBF, MTTR, OEE ve Bakım Maliyeti KPI Hesaplamaları
 */

import { db } from "@/lib/db"
import {
  recordProductionAuditLog,
  ProductionDomainError,
  assertProductionFeatureEnabled,
} from "./productionAuditAndError"
import {
  validateNoCircularAssetHierarchy,
  buildEquipmentHierarchyTree,
  calculateMTBF,
  calculateMTTR,
  calculateOEE,
  calculateDowntimeRate,
  isCalendarPMDue,
  calculateNextScheduledDate,
  isMeterPMDue,
  evaluateConditionRule,
  validateWorkOrderStatusTransition,
  detectMaintenanceCapacityConflicts,
  checkSparePartsStockAndProcurement,
  calculateMaintenanceTotalCost,
  type MachineCriticality,
  type MaintenancePlanType,
  type MaintenanceWorkOrderType,
  type MaintenanceWorkOrderStatus,
  type MaintenancePriority,
  type ConditionOperator,
  type HierarchyNode,
  type CapacityConflictAlert,
  type SparePartProcurementCheck
} from "./productionMaintenanceEngine"

// ─────────────────────────────────────────────────────────────
// 1. EKİPMAN & VARLIK YÖNETİMİ
// ─────────────────────────────────────────────────────────────

export interface MachineAssetInput {
  id?: string
  code: string
  name: string
  serialNumber?: string | null
  brand?: string | null
  model?: string | null
  location?: string | null
  workCenterId?: string | null
  status?: string
  operatingHours?: number
  productionCount?: number
  criticality?: MachineCriticality
  parentAssetId?: string | null
  category?: string | null
  acquisitionCost?: number | null
  documentUrl?: string | null
}

export async function listMachineAssets(filter?: {
  workCenterId?: string
  criticality?: string
  status?: string
  search?: string
}) {
  await assertProductionFeatureEnabled("uretim_bakim")

  let assets = await (db.uretimMachineAsset as any).findMany({
    include: {
      workCenter: true,
      parentAsset: true,
      subAssets: true,
      spareParts: {
        include: {
          item: true
        }
      },
      maintenancePlans: true
    }
  })

  if (filter?.workCenterId) {
    assets = assets.filter((a: any) => a.workCenterId === filter.workCenterId)
  }
  if (filter?.criticality) {
    assets = assets.filter((a: any) => (a.criticality || "B") === filter.criticality)
  }
  if (filter?.status) {
    assets = assets.filter((a: any) => a.status === filter.status)
  }
  if (filter?.search) {
    const s = filter.search.toLowerCase()
    assets = assets.filter(
      (a: any) =>
        a.code.toLowerCase().includes(s) ||
        a.name.toLowerCase().includes(s) ||
        (a.serialNumber && a.serialNumber.toLowerCase().includes(s))
    )
  }

  return assets
}

export async function getMachineAssetHierarchy(): Promise<HierarchyNode[]> {
  await assertProductionFeatureEnabled("uretim_bakim")

  const assets = await (db.uretimMachineAsset as any).findMany()
  return buildEquipmentHierarchyTree(assets)
}

export async function getMachineAssetDetail(id: string) {
  await assertProductionFeatureEnabled("uretim_bakim")

  const asset = await (db.uretimMachineAsset as any).findUnique({
    where: { id },
    include: {
      workCenter: true,
      parentAsset: true,
      subAssets: true,
      spareParts: {
        include: {
          item: true
        }
      },
      maintenancePlans: {
        include: {
          checklists: true
        }
      },
      maintenanceWorkOrders: {
        include: {
          sparePartsUsed: true,
          checklistResults: true
        }
      },
      conditionReadings: true
    }
  })

  if (!asset) {
    throw new ProductionDomainError("Ekipman bulunamadı.", 404, "ASSET_NOT_FOUND")
  }

  return asset
}

export async function createMachineAsset(data: MachineAssetInput, userId?: string) {
  await assertProductionFeatureEnabled("uretim_bakim")

  if (!data.code || !data.name) {
    throw new ProductionDomainError("Ekipman kodu ve adı zorunludur.", 400, "MISSING_REQUIRED_FIELDS")
  }

  // Kod tekilliği kontrolü
  const existing = await (db.uretimMachineAsset as any).findFirst({
    where: { code: data.code.trim().toUpperCase() }
  })
  if (existing) {
    throw new ProductionDomainError(
      `'${data.code}' kodlu makine/ekipman zaten mevcut.`,
      400,
      "DUPLICATE_ASSET_CODE"
    )
  }

  // Döngüsel hiyerarşi kontrolü
  if (data.parentAssetId) {
    const allAssets = await (db.uretimMachineAsset as any).findMany()
    validateNoCircularAssetHierarchy("NEW_ASSET", data.parentAssetId, allAssets)
  }

  const created = await (db.uretimMachineAsset as any).create({
    data: {
      code: data.code.trim().toUpperCase(),
      name: data.name.trim(),
      serialNumber: data.serialNumber?.trim() || null,
      brand: data.brand?.trim() || null,
      model: data.model?.trim() || null,
      location: data.location?.trim() || null,
      workCenterId: data.workCenterId || null,
      status: data.status || "ACTIVE",
      operatingHours: data.operatingHours || 0,
      productionCount: data.productionCount || 0,
      criticality: data.criticality || "B",
      parentAssetId: data.parentAssetId || null,
      category: data.category?.trim() || null,
      acquisitionCost: data.acquisitionCost || null,
      documentUrl: data.documentUrl?.trim() || null
    }
  })

  await recordProductionAuditLog({
    action: "CREATE_MACHINE_ASSET",
    entityType: "UretimMachineAsset",
    entityId: created.id,
    userId: userId || "SYSTEM",
    details: { code: created.code, name: created.name, criticality: created.criticality }
  })

  return created
}

export async function updateMachineAsset(id: string, data: Partial<MachineAssetInput>, userId?: string) {
  await assertProductionFeatureEnabled("uretim_bakim")

  const current = await (db.uretimMachineAsset as any).findUnique({ where: { id } })
  if (!current) {
    throw new ProductionDomainError("Güncellenecek ekipman bulunamadı.", 404, "ASSET_NOT_FOUND")
  }

  if (data.parentAssetId !== undefined && data.parentAssetId !== current.parentAssetId) {
    const allAssets = await (db.uretimMachineAsset as any).findMany()
    validateNoCircularAssetHierarchy(id, data.parentAssetId, allAssets)
  }

  const updated = await (db.uretimMachineAsset as any).update({
    where: { id },
    data: {
      ...(data.name && { name: data.name.trim() }),
      ...(data.serialNumber !== undefined && { serialNumber: data.serialNumber?.trim() || null }),
      ...(data.brand !== undefined && { brand: data.brand?.trim() || null }),
      ...(data.model !== undefined && { model: data.model?.trim() || null }),
      ...(data.location !== undefined && { location: data.location?.trim() || null }),
      ...(data.workCenterId !== undefined && { workCenterId: data.workCenterId || null }),
      ...(data.status && { status: data.status }),
      ...(data.operatingHours !== undefined && { operatingHours: data.operatingHours }),
      ...(data.productionCount !== undefined && { productionCount: data.productionCount }),
      ...(data.criticality && { criticality: data.criticality }),
      ...(data.parentAssetId !== undefined && { parentAssetId: data.parentAssetId || null }),
      ...(data.category !== undefined && { category: data.category?.trim() || null }),
      ...(data.acquisitionCost !== undefined && { acquisitionCost: data.acquisitionCost }),
      ...(data.documentUrl !== undefined && { documentUrl: data.documentUrl?.trim() || null })
    }
  })

  await recordProductionAuditLog({
    action: "UPDATE_MACHINE_ASSET",
    entityType: "UretimMachineAsset",
    entityId: id,
    userId: userId || "SYSTEM",
    details: { changes: data }
  })

  return updated
}

// ─────────────────────────────────────────────────────────────
// 2. YEDEK PARÇA TANIMLARI
// ─────────────────────────────────────────────────────────────

export interface MachineSparePartInput {
  machineAssetId: string
  itemId: string
  quantityPerUnit?: number
  minStockLevel?: number
  replacementIntervalHours?: number | null
  replacementIntervalCount?: number | null
  leadTimeDays?: number
  isCritical?: boolean
  notes?: string | null
}

export async function addSparePartToMachine(data: MachineSparePartInput, userId?: string) {
  await assertProductionFeatureEnabled("uretim_bakim")

  const asset = await (db.uretimMachineAsset as any).findUnique({ where: { id: data.machineAssetId } })
  if (!asset) {
    throw new ProductionDomainError("Geçersiz makine/ekipman kimliği.", 404, "ASSET_NOT_FOUND")
  }

  const item = await (db.inventoryItem as any).findUnique({ where: { id: data.itemId } })
  if (!item) {
    throw new ProductionDomainError("Geçersiz stok/ürün kimliği.", 404, "ITEM_NOT_FOUND")
  }

  const spare = await (db.uretimMachineSparePart as any).create({
    data: {
      machineAssetId: data.machineAssetId,
      itemId: data.itemId,
      quantityPerUnit: data.quantityPerUnit || 1,
      minStockLevel: data.minStockLevel || 0,
      replacementIntervalHours: data.replacementIntervalHours || null,
      replacementIntervalCount: data.replacementIntervalCount || null,
      leadTimeDays: data.leadTimeDays || 7,
      isCritical: data.isCritical !== undefined ? data.isCritical : false,
      notes: data.notes?.trim() || null
    },
    include: {
      item: true
    }
  })

  await recordProductionAuditLog({
    action: "ADD_SPARE_PART",
    entityType: "UretimMachineSparePart",
    entityId: spare.id,
    userId: userId || "SYSTEM",
    details: { machineAssetId: data.machineAssetId, itemId: data.itemId }
  })

  return spare
}

// ─────────────────────────────────────────────────────────────
// 3. BAKIM PLANLARI VE KONTROL LİSTELERİ
// ─────────────────────────────────────────────────────────────

export interface MaintenancePlanChecklistInput {
  id?: string
  sequence?: number
  itemDescription: string
  checkType?: "CHECKBOX" | "NUMERIC" | "TEXT"
  expectedNumericValue?: number | null
  numericTolerance?: number | null
  unit?: string | null
  isRequired?: boolean
  instructions?: string | null
}

export interface MaintenancePlanInput {
  id?: string
  code: string
  name: string
  description?: string | null
  machineAssetId: string
  planType: MaintenancePlanType
  frequencyDays?: number | null
  frequencyHours?: number | null
  frequencyCount?: number | null
  lastTriggeredHours?: number | null
  lastTriggeredCount?: number | null
  conditionMetric?: string | null
  conditionOperator?: string | null
  conditionThreshold?: number | null
  estimatedDurationMinutes?: number
  priority?: MaintenancePriority
  isActive?: boolean
  nextScheduledDate?: Date | string | null
  checklists?: MaintenancePlanChecklistInput[]
}

export async function listMaintenancePlans(filter?: {
  machineAssetId?: string
  planType?: string
  isActive?: boolean
}) {
  await assertProductionFeatureEnabled("uretim_bakim")

  let plans = await (db.uretimMaintenancePlan as any).findMany({
    include: {
      machineAsset: true,
      checklists: true
    }
  })

  if (filter?.machineAssetId) {
    plans = plans.filter((p: any) => p.machineAssetId === filter.machineAssetId)
  }
  if (filter?.planType) {
    plans = plans.filter((p: any) => p.planType === filter.planType)
  }
  if (filter?.isActive !== undefined) {
    plans = plans.filter((p: any) => p.isActive === filter.isActive)
  }

  return plans
}

export async function createMaintenancePlan(data: MaintenancePlanInput, userId?: string) {
  await assertProductionFeatureEnabled("uretim_bakim")

  if (!data.code || !data.name || !data.machineAssetId || !data.planType) {
    throw new ProductionDomainError(
      "Plan kodu, adı, ekipman seçimi ve plan tipi zorunludur.",
      400,
      "MISSING_REQUIRED_FIELDS"
    )
  }

  // Plan tipine göre doğrulama
  if (data.planType === "CALENDAR" && (!data.frequencyDays || data.frequencyDays <= 0)) {
    throw new ProductionDomainError(
      "Takvim bazlı bakım planında periyot (gün) belirtilmelidir.",
      400,
      "INVALID_FREQUENCY_DAYS"
    )
  }
  if (data.planType === "METER_HOURS" && (!data.frequencyHours || data.frequencyHours <= 0)) {
    throw new ProductionDomainError(
      "Çalışma saati bazlı bakım planında frekans saati belirtilmelidir.",
      400,
      "INVALID_FREQUENCY_HOURS"
    )
  }
  if (data.planType === "METER_COUNT" && (!data.frequencyCount || data.frequencyCount <= 0)) {
    throw new ProductionDomainError(
      "Üretim adedi bazlı bakım planında frekans adedi belirtilmelidir.",
      400,
      "INVALID_FREQUENCY_COUNT"
    )
  }
  if (data.planType === "CONDITION" && (data.conditionThreshold === undefined || data.conditionThreshold === null)) {
    throw new ProductionDomainError(
      "Kestirimci bakım planında sensör eşik değeri zorunludur.",
      400,
      "INVALID_CONDITION_THRESHOLD"
    )
  }

  const asset = await (db.uretimMachineAsset as any).findUnique({ where: { id: data.machineAssetId } })
  if (!asset) {
    throw new ProductionDomainError("Seçilen makine/ekipman bulunamadı.", 404, "ASSET_NOT_FOUND")
  }

  // İlk takvim tarihi hesaplama
  let nextDate = data.nextScheduledDate ? new Date(data.nextScheduledDate) : null
  if (!nextDate && data.planType === "CALENDAR" && data.frequencyDays) {
    nextDate = calculateNextScheduledDate(new Date(), data.frequencyDays)
  }

  const plan = await (db.uretimMaintenancePlan as any).create({
    data: {
      code: data.code.trim().toUpperCase(),
      name: data.name.trim(),
      description: data.description?.trim() || null,
      machineAssetId: data.machineAssetId,
      planType: data.planType,
      frequencyDays: data.frequencyDays || null,
      frequencyHours: data.frequencyHours || null,
      frequencyCount: data.frequencyCount || null,
      conditionMetric: data.conditionMetric?.trim() || null,
      conditionOperator: data.conditionOperator || ">",
      conditionThreshold: data.conditionThreshold !== undefined ? data.conditionThreshold : null,
      estimatedDurationMinutes: data.estimatedDurationMinutes || 60,
      priority: data.priority || "MEDIUM",
      isActive: data.isActive !== undefined ? data.isActive : true,
      nextScheduledDate: nextDate,
      lastTriggeredHours: data.lastTriggeredHours !== undefined && data.lastTriggeredHours !== null ? data.lastTriggeredHours : (asset.operatingHours || 0),
      lastTriggeredCount: data.lastTriggeredCount !== undefined && data.lastTriggeredCount !== null ? data.lastTriggeredCount : (asset.productionCount || 0)
    }
  })

  // Kontrol listesi maddeleri ekleme
  if (data.checklists && data.checklists.length > 0) {
    let seq = 10
    for (const item of data.checklists) {
      await (db.uretimMaintenancePlanChecklist as any).create({
        data: {
          planId: plan.id,
          sequence: item.sequence || seq,
          itemDescription: item.itemDescription.trim(),
          checkType: item.checkType || "CHECKBOX",
          expectedNumericValue: item.expectedNumericValue !== undefined ? item.expectedNumericValue : null,
          numericTolerance: item.numericTolerance !== undefined ? item.numericTolerance : null,
          unit: item.unit?.trim() || null,
          isRequired: item.isRequired !== undefined ? item.isRequired : true,
          instructions: item.instructions?.trim() || null
        }
      })
      seq += 10
    }
  }

  await recordProductionAuditLog({
    action: "CREATE_MAINTENANCE_PLAN",
    entityType: "UretimMaintenancePlan",
    entityId: plan.id,
    userId: userId || "SYSTEM",
    details: { code: plan.code, planType: plan.planType, machineAssetId: plan.machineAssetId }
  })

  return plan
}

export async function updateMaintenancePlan(id: string, data: Partial<MaintenancePlanInput>, userId?: string) {
  await assertProductionFeatureEnabled("uretim_bakim")

  const current = await (db.uretimMaintenancePlan as any).findUnique({ where: { id } })
  if (!current) {
    throw new ProductionDomainError("Güncellenecek bakım planı bulunamadı.", 404, "PLAN_NOT_FOUND")
  }

  const updated = await (db.uretimMaintenancePlan as any).update({
    where: { id },
    data: {
      ...(data.name && { name: data.name.trim() }),
      ...(data.description !== undefined && { description: data.description?.trim() || null }),
      ...(data.frequencyDays !== undefined && { frequencyDays: data.frequencyDays }),
      ...(data.frequencyHours !== undefined && { frequencyHours: data.frequencyHours }),
      ...(data.frequencyCount !== undefined && { frequencyCount: data.frequencyCount }),
      ...(data.conditionMetric !== undefined && { conditionMetric: data.conditionMetric?.trim() || null }),
      ...(data.conditionOperator !== undefined && { conditionOperator: data.conditionOperator }),
      ...(data.conditionThreshold !== undefined && { conditionThreshold: data.conditionThreshold }),
      ...(data.estimatedDurationMinutes !== undefined && { estimatedDurationMinutes: data.estimatedDurationMinutes }),
      ...(data.priority && { priority: data.priority }),
      ...(data.isActive !== undefined && { isActive: data.isActive }),
      ...(data.nextScheduledDate !== undefined && {
        nextScheduledDate: data.nextScheduledDate ? new Date(data.nextScheduledDate) : null
      })
    }
  })

  await recordProductionAuditLog({
    action: "UPDATE_MAINTENANCE_PLAN",
    entityType: "UretimMaintenancePlan",
    entityId: id,
    userId: userId || "SYSTEM",
    details: { changes: data }
  })

  return updated
}

// ─────────────────────────────────────────────────────────────
// 4. BAKIM İŞ EMİRLERİ (WORK ORDERS) YAŞAM DÖNGÜSÜ
// ─────────────────────────────────────────────────────────────

export interface MaintenanceWorkOrderInput {
  workOrderNumber?: string
  planId?: string | null
  machineAssetId: string
  workCenterId?: string | null
  type?: MaintenanceWorkOrderType
  priority?: MaintenancePriority
  title: string
  description?: string | null
  requestedBy?: string | null
  assignedTo?: string | null
  plannedStartDate?: Date | string | null
  plannedEndDate?: Date | string | null
  failureReason?: string | null
}

export async function listMaintenanceWorkOrders(filter?: {
  machineAssetId?: string
  workCenterId?: string
  status?: string
  type?: string
  priority?: string
}) {
  await assertProductionFeatureEnabled("uretim_bakim")

  let orders = await (db.uretimMaintenanceWorkOrder as any).findMany({
    include: {
      machineAsset: true,
      workCenter: true,
      plan: true,
      sparePartsUsed: {
        include: {
          item: true
        }
      },
      checklistResults: true
    }
  })

  if (filter?.machineAssetId) {
    orders = orders.filter((o: any) => o.machineAssetId === filter.machineAssetId)
  }
  if (filter?.workCenterId) {
    orders = orders.filter((o: any) => o.workCenterId === filter.workCenterId)
  }
  if (filter?.status) {
    orders = orders.filter((o: any) => o.status === filter.status)
  }
  if (filter?.type) {
    orders = orders.filter((o: any) => o.type === filter.type)
  }
  if (filter?.priority) {
    orders = orders.filter((o: any) => o.priority === filter.priority)
  }

  // Tarihe göre ters sıralama
  orders.sort((a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())

  return orders
}

export async function getMaintenanceWorkOrderDetail(id: string) {
  await assertProductionFeatureEnabled("uretim_bakim")

  const order = await (db.uretimMaintenanceWorkOrder as any).findUnique({
    where: { id },
    include: {
      machineAsset: true,
      workCenter: true,
      plan: {
        include: {
          checklists: true
        }
      },
      sparePartsUsed: {
        include: {
          item: true
        }
      },
      checklistResults: true
    }
  })

  if (!order) {
    throw new ProductionDomainError("Bakım iş emri bulunamadı.", 404, "WORK_ORDER_NOT_FOUND")
  }

  return order
}

export async function createMaintenanceWorkOrder(data: MaintenanceWorkOrderInput, userId?: string) {
  await assertProductionFeatureEnabled("uretim_bakim")

  if (!data.machineAssetId || !data.title) {
    throw new ProductionDomainError(
      "Ekipman ve iş emri başlığı zorunludur.",
      400,
      "MISSING_REQUIRED_FIELDS"
    )
  }

  const asset = await (db.uretimMachineAsset as any).findUnique({ where: { id: data.machineAssetId } })
  if (!asset) {
    throw new ProductionDomainError("Ekipman bulunamadı.", 404, "ASSET_NOT_FOUND")
  }

  const type = data.type || "PREVENTIVE"
  const prefix = type === "BREAKDOWN" ? "ARZ" : type === "PREVENTIVE" ? "BKM" : "REV"
  const orderNumber = data.workOrderNumber || `${prefix}-${Date.now().toString().slice(-6)}`

  const workOrder = await (db.uretimMaintenanceWorkOrder as any).create({
    data: {
      workOrderNumber: orderNumber,
      planId: data.planId || null,
      machineAssetId: data.machineAssetId,
      workCenterId: data.workCenterId || asset.workCenterId || null,
      type,
      status: "REQUESTED",
      priority: data.priority || (type === "BREAKDOWN" ? "HIGH" : "MEDIUM"),
      title: data.title.trim(),
      description: data.description?.trim() || null,
      requestedBy: data.requestedBy || userId || "OPERATOR",
      assignedTo: data.assignedTo || null,
      plannedStartDate: data.plannedStartDate ? new Date(data.plannedStartDate) : null,
      plannedEndDate: data.plannedEndDate ? new Date(data.plannedEndDate) : null,
      failureReason: data.failureReason?.trim() || null,
      downtimeMinutes: 0,
      laborHours: 0,
      totalCost: 0
    }
  })

  // Eğer plan bağlıysa ve kontrol listesi varsa, iş emrine kopyala
  if (data.planId) {
    const checklists = await (db.uretimMaintenancePlanChecklist as any).findMany({
      where: { planId: data.planId }
    })
    for (const cl of checklists) {
      await (db.uretimMaintenanceChecklistResult as any).create({
        data: {
          workOrderId: workOrder.id,
          checklistId: cl.id,
          itemDescription: cl.itemDescription,
          checkType: cl.checkType,
          isPassed: false
        }
      })
    }
  }

  // Arıza ise makinenin durumunu DOWN yapabiliriz
  if (type === "BREAKDOWN") {
    await (db.uretimMachineAsset as any).update({
      where: { id: asset.id },
      data: { status: "DOWN" }
    })
  }

  await recordProductionAuditLog({
    action: "CREATE_MAINTENANCE_WORK_ORDER",
    entityType: "UretimMaintenanceWorkOrder",
    entityId: workOrder.id,
    userId: userId || "SYSTEM",
    details: { workOrderNumber: orderNumber, type, machineAssetId: data.machineAssetId }
  })

  return workOrder
}

export async function updateMaintenanceWorkOrderStatus(
  id: string,
  newStatus: MaintenanceWorkOrderStatus,
  options?: {
    assignedTo?: string | null
    downtimeMinutes?: number
    laborHours?: number
    laborHourlyRate?: number
    externalServiceCost?: number
    failureReason?: string
    completionNotes?: string
  },
  userId?: string
) {
  await assertProductionFeatureEnabled("uretim_bakim")

  const current = await (db.uretimMaintenanceWorkOrder as any).findUnique({
    where: { id },
    include: {
      sparePartsUsed: true,
      machineAsset: true
    }
  })

  if (!current) {
    throw new ProductionDomainError("Bakım iş emri bulunamadı.", 404, "WORK_ORDER_NOT_FOUND")
  }

  validateWorkOrderStatusTransition(
    current.status as MaintenanceWorkOrderStatus,
    newStatus,
    current.type as MaintenanceWorkOrderType
  )

  const updateData: any = {
    status: newStatus
  }

  if (options?.assignedTo !== undefined) {
    updateData.assignedTo = options.assignedTo
  }
  if (options?.failureReason !== undefined) {
    updateData.failureReason = options.failureReason
  }

  const now = new Date()
  if (newStatus === "IN_PROGRESS" && !current.actualStartDate) {
    updateData.actualStartDate = now
  }

  if (newStatus === "COMPLETED") {
    updateData.actualEndDate = now
    if (options?.completionNotes) {
      updateData.completionNotes = options.completionNotes
    }

    const downtime = options?.downtimeMinutes !== undefined ? options.downtimeMinutes : (current.downtimeMinutes || 0)
    const laborH = options?.laborHours !== undefined ? options.laborHours : (current.laborHours || 0)
    updateData.downtimeMinutes = downtime
    updateData.laborHours = laborH

    // Maliyet hesabı
    const sparePartsCost = (current.sparePartsUsed || []).reduce(
      (acc: number, p: any) => acc + (p.totalCost || 0),
      0
    )
    const costBreakdown = calculateMaintenanceTotalCost({
      sparePartsCost,
      laborHours: laborH,
      hourlyLaborRate: options?.laborHourlyRate || 150, // Varsayılan saatlik işçilik
      externalServiceCost: options?.externalServiceCost || 0
    })
    updateData.totalCost = costBreakdown.totalCost

    // Makine durumunu tekrar ACTIVE yap
    if (current.machineAssetId) {
      await (db.uretimMachineAsset as any).update({
        where: { id: current.machineAssetId },
        data: { status: "ACTIVE" }
      })
    }
  }

  const updated = await (db.uretimMaintenanceWorkOrder as any).update({
    where: { id },
    data: updateData
  })

  await recordProductionAuditLog({
    action: "UPDATE_MAINTENANCE_WORK_ORDER_STATUS",
    entityType: "UretimMaintenanceWorkOrder",
    entityId: id,
    userId: userId || "SYSTEM",
    details: { fromStatus: current.status, toStatus: newStatus, ...options }
  })

  return updated
}

// ─────────────────────────────────────────────────────────────
// 5. YEDEK PARÇA KULLANIMI VE SATINALMA TALEBİ ENTEGRASYONU
// ─────────────────────────────────────────────────────────────

export async function recordWorkOrderSparePartUsage(
  workOrderId: string,
  parts: Array<{
    itemId: string
    quantityUsed: number
    unitCost?: number
    notes?: string
  }>,
  userId?: string
) {
  await assertProductionFeatureEnabled("uretim_bakim")

  const workOrder = await (db.uretimMaintenanceWorkOrder as any).findUnique({ where: { id: workOrderId } })
  if (!workOrder) {
    throw new ProductionDomainError("Bakım iş emri bulunamadı.", 404, "WORK_ORDER_NOT_FOUND")
  }

  const records = []
  for (const part of parts) {
    const item = await (db.inventoryItem as any).findUnique({ where: { id: part.itemId } })
    if (!item) {
      throw new ProductionDomainError(`Yedek parça (${part.itemId}) bulunamadı.`, 404, "ITEM_NOT_FOUND")
    }

    const unitCost = part.unitCost ?? (item.averageCost || item.standardCost || 0)
    const totalCost = Number(((part.quantityUsed || 1) * unitCost).toFixed(2))

    // Stok yeterli mi kontrol et
    const currentStock = item.currentStock || 0
    const isProcurementRequested = currentStock < part.quantityUsed

    const record = await (db.uretimMaintenanceWorkOrderSparePart as any).create({
      data: {
        workOrderId,
        itemId: part.itemId,
        quantityPlanned: part.quantityUsed,
        quantityUsed: part.quantityUsed,
        unitCost,
        totalCost,
        isProcurementRequested,
        notes: part.notes?.trim() || null
      }
    })
    records.push(record)
  }

  await recordProductionAuditLog({
    action: "RECORD_SPARE_PART_USAGE",
    entityType: "UretimMaintenanceWorkOrder",
    entityId: workOrderId,
    userId: userId || "SYSTEM",
    details: { partCount: parts.length }
  })

  return records
}

// ─────────────────────────────────────────────────────────────
// 6. TELEMETRİ & KESTİRİMCİ BAKIM SENSÖR OKUMALARI
// ─────────────────────────────────────────────────────────────

export interface ConditionReadingInput {
  machineAssetId: string
  sensorType: string
  readingValue: number
  unit?: string
  thresholdExceeded?: boolean
  notes?: string
}

export async function recordConditionReading(data: ConditionReadingInput, userId?: string) {
  await assertProductionFeatureEnabled("uretim_bakim")

  const asset = await (db.uretimMachineAsset as any).findUnique({ where: { id: data.machineAssetId } })
  if (!asset) {
    throw new ProductionDomainError("Ekipman bulunamadı.", 404, "ASSET_NOT_FOUND")
  }

  // Kestirimci bakım planlarını kontrol et
  const conditionPlans = await (db.uretimMaintenancePlan as any).findMany({
    where: {
      machineAssetId: data.machineAssetId,
      planType: "CONDITION",
      isActive: true
    }
  })

  let isThresholdExceeded = data.thresholdExceeded || false
  let triggeredPlan: any = null

  for (const plan of conditionPlans) {
    if (plan.conditionThreshold !== null && plan.conditionThreshold !== undefined) {
      const breached = evaluateConditionRule(
        data.readingValue,
        plan.conditionOperator || ">",
        plan.conditionThreshold
      )
      if (breached) {
        isThresholdExceeded = true
        triggeredPlan = plan
        break
      }
    }
  }

  const reading = await (db.uretimMaintenanceConditionReading as any).create({
    data: {
      machineAssetId: data.machineAssetId,
      sensorType: data.sensorType.trim().toUpperCase(),
      readingValue: data.readingValue,
      unit: data.unit?.trim() || "unit",
      isThresholdExceeded,
      notes: data.notes?.trim() || (isThresholdExceeded ? "Sensör kritik eşik değerini aştı." : null)
    }
  })

  // Eğer eşik aşıldıysa otomatik Arıza/Kestirimci Bakım İş Emri tetikle
  let autoWorkOrder = null
  if (isThresholdExceeded) {
    const existingOpen = await (db.uretimMaintenanceWorkOrder as any).findFirst({
      where: {
        machineAssetId: data.machineAssetId,
        status: { in: ["REQUESTED", "EVALUATED", "SCHEDULED", "IN_PROGRESS"] },
        type: { in: ["BREAKDOWN", "CORRECTIVE"] }
      }
    })

    if (!existingOpen) {
      autoWorkOrder = await createMaintenanceWorkOrder(
        {
          machineAssetId: data.machineAssetId,
          planId: triggeredPlan?.id || null,
          type: "BREAKDOWN",
          priority: "CRITICAL",
          title: `[PdM Sensör Uyarısı] ${asset.name} - ${data.sensorType} Aşımı (${data.readingValue} ${data.unit || ""})`,
          description: `Sensör ${data.sensorType} değeri ${data.readingValue} olarak ölçülerek izin verilen limit aşıldı. Acil inceleme gereklidir.`,
          requestedBy: "SENSÖR_PdM_MOTORU"
        },
        userId
      )
    }
  }

  return { reading, autoWorkOrder }
}

// ─────────────────────────────────────────────────────────────
// 7. OTOMATİK PERİYODİK BAKIM İŞ EMRİ MOTORU (PM SCHEDULER JOB)
// ─────────────────────────────────────────────────────────────

export async function evaluateAndTriggerMaintenanceJobs(options?: { simulateOnly?: boolean }, userId?: string) {
  await assertProductionFeatureEnabled("uretim_bakim")

  const activePlans = await (db.uretimMaintenancePlan as any).findMany({
    where: { isActive: true },
    include: {
      machineAsset: true
    }
  })

  const triggeredOrders: any[] = []
  const now = new Date()

  for (const plan of activePlans) {
    const asset = plan.machineAsset
    if (!asset) continue

    let shouldTrigger = false
    let triggerReason = ""

    // 1. Takvim kontrolü
    if (plan.planType === "CALENDAR") {
      if (isCalendarPMDue(plan.nextScheduledDate, now)) {
        shouldTrigger = true
        triggerReason = `Takvim süresi doldu (Sonraki Tarih: ${new Date(plan.nextScheduledDate).toISOString().slice(0, 10)})`
      }
    }

    // 2. Çalışma saati kontrolü
    if (plan.planType === "METER_HOURS") {
      if (isMeterPMDue({
        planType: "METER_HOURS",
        currentHours: asset.operatingHours || 0,
        lastTriggeredHours: plan.lastTriggeredHours || 0,
        frequencyHours: plan.frequencyHours
      })) {
        shouldTrigger = true
        triggerReason = `Çalışma saati eşiğine ulaşıldı (${asset.operatingHours} saat)`
      }
    }

    // 3. Üretim adedi kontrolü
    if (plan.planType === "METER_COUNT") {
      if (isMeterPMDue({
        planType: "METER_COUNT",
        currentHours: 0,
        currentCount: asset.productionCount || 0,
        lastTriggeredCount: plan.lastTriggeredCount || 0,
        frequencyCount: plan.frequencyCount
      })) {
        shouldTrigger = true
        triggerReason = `Üretilen adet eşiğine ulaşıldı (${asset.productionCount} adet)`
      }
    }

    if (shouldTrigger) {
      if (options?.simulateOnly) {
        triggeredOrders.push({
          planId: plan.id,
          planCode: plan.code,
          planName: plan.name,
          machineAssetId: asset.id,
          machineName: asset.name,
          triggerReason
        })
      } else {
        // Yeni bakım iş emri oluştur
        const wo = await createMaintenanceWorkOrder(
          {
            planId: plan.id,
            machineAssetId: asset.id,
            workCenterId: asset.workCenterId,
            type: "PREVENTIVE",
            priority: plan.priority || "MEDIUM",
            title: `[Periyodik Bakım] ${plan.name} - ${asset.name}`,
            description: `Otomatik bakım tetikleyici tarafından oluşturuldu. ${triggerReason}`,
            plannedStartDate: now,
            plannedEndDate: new Date(now.getTime() + (plan.estimatedDurationMinutes || 60) * 60000)
          },
          userId
        )

        // Plan sayaç ve takvimini güncelle
        const updatePlanData: any = {
          lastTriggeredDate: now,
          lastTriggeredHours: asset.operatingHours || 0,
          lastTriggeredCount: asset.productionCount || 0
        }
        if (plan.planType === "CALENDAR" && plan.frequencyDays) {
          updatePlanData.nextScheduledDate = calculateNextScheduledDate(now, plan.frequencyDays)
        }

        await (db.uretimMaintenancePlan as any).update({
          where: { id: plan.id },
          data: updatePlanData
        })

        triggeredOrders.push(wo)
      }
    }
  }

  return {
    evaluatedPlanCount: activePlans.length,
    triggeredCount: triggeredOrders.length,
    triggeredOrders
  }
}

// ─────────────────────────────────────────────────────────────
// 8. KAPASİTE ÇAKIŞMA TESPİTİ VE UYARI MOTORU
// ─────────────────────────────────────────────────────────────

export async function getMaintenanceCapacityConflicts(): Promise<CapacityConflictAlert[]> {
  await assertProductionFeatureEnabled("uretim_bakim")

  // Gelecekteki planlı bakım iş emirlerini getir
  const pendingOrders = await (db.uretimMaintenanceWorkOrder as any).findMany({
    where: {
      status: { in: ["REQUESTED", "EVALUATED", "SCHEDULED"] },
      plannedStartDate: { not: null },
      plannedEndDate: { not: null }
    }
  })

  // Çizelgelenmiş üretim görevlerini getir
  const scheduledTasks = await (db.uretimScheduledTask as any).findMany({
    where: {
      status: { in: ["SCHEDULED", "IN_PROGRESS"] }
    }
  })

  const allAlerts: CapacityConflictAlert[] = []

  for (const wo of pendingOrders) {
    if (!wo.plannedStartDate || !wo.plannedEndDate) continue

    const conflicts = detectMaintenanceCapacityConflicts({
      maintenanceWindow: {
        workOrderId: wo.id,
        machineAssetId: wo.machineAssetId,
        workCenterId: wo.workCenterId,
        plannedStart: wo.plannedStartDate,
        plannedEnd: wo.plannedEndDate
      },
      scheduledTasks
    })

    allAlerts.push(...conflicts)
  }

  return allAlerts
}

// ─────────────────────────────────────────────────────────────
// 9. YEDEK PARÇA TEDARİK VE EKSİK STOK KONTROLÜ
// ─────────────────────────────────────────────────────────────

export async function checkMaintenanceSparePartProcurement(machineAssetId?: string): Promise<SparePartProcurementCheck[]> {
  await assertProductionFeatureEnabled("uretim_bakim")

  let spareParts = await (db.uretimMachineSparePart as any).findMany({
    include: {
      item: true
    }
  })

  if (machineAssetId) {
    spareParts = spareParts.filter((sp: any) => sp.machineAssetId === machineAssetId)
  }

  const partsToCheck = spareParts.map((sp: any) => ({
    sparePartId: sp.id,
    itemId: sp.itemId,
    itemCode: sp.item?.code || "STOK-KOD",
    itemName: sp.item?.name || "Yedek Parça",
    requiredQuantity: sp.minStockLevel || sp.quantityPerUnit || 1,
    availableStock: sp.item?.currentStock || 0,
    leadTimeDays: sp.leadTimeDays || 7
  }))

  return checkSparePartsStockAndProcurement(partsToCheck)
}

// ─────────────────────────────────────────────────────────────
// 10. GÖSTERGE PANELİ VE OEE / MTBF / MTTR ANALİZİ
// ─────────────────────────────────────────────────────────────

export async function getMaintenanceDashboardMetrics() {
  await assertProductionFeatureEnabled("uretim_bakim")

  const assets = await (db.uretimMachineAsset as any).findMany()
  const workOrders = await (db.uretimMaintenanceWorkOrder as any).findMany()
  const plans = await (db.uretimMaintenancePlan as any).findMany()
  const conditionReadings = await (db.uretimMaintenanceConditionReading as any).findMany()

  // 1. MTBF ve MTTR Hesaplaması
  const totalOperatingHours = assets.reduce((acc: number, a: any) => acc + (a.operatingHours || 0), 0)
  const breakdownOrders = workOrders.filter((w: any) => w.type === "BREAKDOWN")
  const totalDowntimeMinutes = workOrders.reduce((acc: number, w: any) => acc + (w.downtimeMinutes || 0), 0)

  const mtbf = calculateMTBF(totalOperatingHours, breakdownOrders.length)
  const mttr = calculateMTTR(totalDowntimeMinutes, breakdownOrders.length)

  // 2. OEE Hesaplaması
  // Faz 5 iş emirleri varsa gerçek veriden, yoksa toplanan duruş ve çalışma saatinden
  const plannedOperatingMinutes = Math.max(totalOperatingHours * 60, 6000)
  const actualTotalProduced = assets.reduce((acc: number, a: any) => acc + (a.productionCount || 0), 0)
  const passedUnits = Math.round(actualTotalProduced * 0.98) // %98 standart kalite oranı varsayımı
  const idealCycleTime = actualTotalProduced > 0 ? (plannedOperatingMinutes * 0.85) / actualTotalProduced : 1

  const oee = calculateOEE({
    plannedOperatingMinutes,
    unplannedDowntimeMinutes: totalDowntimeMinutes,
    actualTotalProduced: actualTotalProduced || 1000,
    idealCycleTimeMinutesPerUnit: idealCycleTime,
    passedUnits: passedUnits || 980
  })

  const downtimeRate = calculateDowntimeRate(plannedOperatingMinutes, totalDowntimeMinutes)

  // 3. Maliyet Dağılımı
  const totalMaintenanceCost = workOrders.reduce((acc: number, w: any) => acc + (w.totalCost || 0), 0)

  // 4. Durum Dağılımı
  const statusCounts: Record<string, number> = {}
  for (const wo of workOrders) {
    statusCounts[wo.status] = (statusCounts[wo.status] || 0) + 1
  }

  // 5. Kritiklik Dağılımı
  const criticalityCounts: Record<string, number> = { A: 0, B: 0, C: 0 }
  for (const asset of assets) {
    const c = (asset.criticality || "B") as "A" | "B" | "C"
    criticalityCounts[c] = (criticalityCounts[c] || 0) + 1
  }

  // 6. Son Alarmlar
  const criticalReadings = conditionReadings
    .filter((r: any) => r.isThresholdExceeded)
    .slice(-10)
    .reverse()

  return {
    summary: {
      totalAssets: assets.length,
      activeAssets: assets.filter((a: any) => a.status === "ACTIVE").length,
      downAssets: assets.filter((a: any) => a.status === "DOWN").length,
      totalPlans: plans.length,
      activePlans: plans.filter((p: any) => p.isActive).length,
      totalWorkOrders: workOrders.length,
      openWorkOrders: workOrders.filter((w: any) => !["COMPLETED", "CANCELLED"].includes(w.status)).length,
      breakdownCount: breakdownOrders.length,
      totalDowntimeMinutes,
      totalMaintenanceCost
    },
    kpis: {
      mtbfHours: mtbf.mtbfHours,
      mttrMinutes: mttr.mttrMinutes,
      oeePct: oee.oee,
      availabilityPct: Number((oee.availability * 100).toFixed(1)),
      performancePct: Number((oee.performance * 100).toFixed(1)),
      qualityPct: Number((oee.quality * 100).toFixed(1)),
      downtimeRatePct: downtimeRate
    },
    statusCounts,
    criticalityCounts,
    recentAlerts: criticalReadings
  }
}

