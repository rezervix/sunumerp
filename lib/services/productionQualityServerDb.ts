/**
 * Sunum ERP — Üretim Kalite Kontrol, Muayene, NCR & Kalibrasyon Veritabanı Servisi
 *
 * Uçtan Uca CRUD, İş Kuralları, Blokaj Yönetimi ve Denetim (Audit) Entegrasyonu:
 * 1. Kalite Planı & Tolerans Maddeleri Yönetimi
 * 2. Ölçüm Cihazı & Kalibrasyon Takibi (Süresi Geçen Cihazla Ölçüm Engeli)
 * 3. Muayene Kayıtları (Mal Kabul, Hat İçi Operasyon, Final Ürün)
 * 4. Ret Durumunda Stok Blokajı & Karantina Yönlendirmesi
 * 5. NCR (Uygunsuzluk) ve DÖF (CAPA) Yaşam Döngüsü Durum Makinesi
 * 6. İki Yönlü Parti/Seri İzlenebilirliği (İleri / Geri) ve Geri Çağırma (Recall) Analizi
 * 7. Kalite İstatistikleri, Pareto ve SPC Rapor Veri Çıkarımı
 */

import { db } from "@/lib/db"
import {
  recordProductionAuditLog,
  ProductionDomainError,
  assertProductionFeatureEnabled,
} from "./productionAuditAndError"
import {
  calculateAqlSamplingPlan,
  evaluateCharacteristicMeasurement,
  determineInspectionDisposition,
  validateNcrStateTransition,
  checkCalibrationDeviceValidity,
  calculateParetoAnalysis,
  calculateSpcXBarRChart,
  calculateSupplierQualityScore,
  type InspectionLevel,
  type SamplingMethod,
  type NcrStatus,
} from "./productionQualityEngine"

// ─────────────────────────────────────────────────────────────
// 1. KALİTE PLANI YÖNETİMİ
// ─────────────────────────────────────────────────────────────

export interface QualityPlanItemInput {
  id?: string
  sequence?: number
  characteristicName: string
  characteristicType?: "VARIABLE" | "ATTRIBUTE"
  nominalValue?: number | null
  minTolerance?: number | null
  maxTolerance?: number | null
  unit?: string | null
  inspectionMethod?: string | null
  calibrationDeviceId?: string | null
  isCritical?: boolean
  notes?: string | null
}

export interface QualityPlanInput {
  id?: string
  code: string
  name: string
  description?: string | null
  targetType?: "ITEM" | "CATEGORY"
  itemId?: string | null
  itemGroup?: string | null
  controlPoint?: "RECEIVING" | "IN_PROCESS" | "FINAL"
  inspectionLevel?: InspectionLevel
  samplingType?: SamplingMethod
  samplingSize?: number | null
  aqlAcceptanceLimit?: number
  version?: number
  isActive?: boolean
  revisionNotes?: string | null
  items?: QualityPlanItemInput[]
}

export async function listQualityPlans(filter?: {
  controlPoint?: string
  itemId?: string
  isActive?: boolean
  search?: string
}) {
  const where: any = {}
  if (filter?.controlPoint) where.controlPoint = filter.controlPoint
  if (filter?.itemId) where.itemId = filter.itemId
  if (filter?.isActive !== undefined) where.isActive = filter.isActive

  const plans = await (db as any).uretimQualityPlan.findMany({
    where,
    include: {
      item: true,
      items: {
        include: {
          calibrationDevice: true,
        },
      },
      inspections: true,
    },
    orderBy: { createdAt: "desc" },
  })

  if (filter?.search) {
    const q = filter.search.toLowerCase()
    return plans.filter(
      (p: any) =>
        p.code?.toLowerCase().includes(q) ||
        p.name?.toLowerCase().includes(q) ||
        p.item?.name?.toLowerCase().includes(q) ||
        p.itemGroup?.toLowerCase().includes(q)
    )
  }

  return plans
}

export async function getQualityPlanById(id: string) {
  const plan = await (db as any).uretimQualityPlan.findUnique({
    where: { id },
    include: {
      item: true,
      items: {
        include: {
          calibrationDevice: true,
        },
      },
      inspections: true,
    },
  })
  if (!plan) {
    throw new ProductionDomainError("NOT_FOUND", `Kalite planı bulunamadı (ID: ${id})`)
  }
  return plan
}

export async function createQualityPlan(input: QualityPlanInput, userId?: string) {
  if (!input.code || !input.name) {
    throw new ProductionDomainError("VALIDATION_ERROR", "Plan kodu ve adı zorunludur.")
  }

  const existing = await (db as any).uretimQualityPlan.findUnique({
    where: { code: input.code.trim() },
  })
  if (existing) {
    throw new ProductionDomainError("CONFLICT", `'${input.code}' kodlu kalite planı zaten mevcut.`)
  }

  const planId = input.id || `qp_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`

  const createdPlan = await (db as any).uretimQualityPlan.create({
    data: {
      id: planId,
      code: input.code.trim(),
      name: input.name.trim(),
      description: input.description || null,
      targetType: input.targetType || "ITEM",
      itemId: input.itemId || null,
      itemGroup: input.itemGroup || null,
      controlPoint: input.controlPoint || "RECEIVING",
      inspectionLevel: input.inspectionLevel || "LEVEL_II",
      samplingType: input.samplingType || "AQL",
      samplingSize: input.samplingSize !== undefined ? Number(input.samplingSize) : null,
      aqlAcceptanceLimit: input.aqlAcceptanceLimit !== undefined ? Number(input.aqlAcceptanceLimit) : 1.5,
      version: input.version || 1,
      isActive: input.isActive !== undefined ? Boolean(input.isActive) : true,
      revisionNotes: input.revisionNotes || null,
      createdById: userId || null,
    },
  })

  // Maddeleri Ekle
  if (input.items && Array.isArray(input.items)) {
    for (let i = 0; i < input.items.length; i++) {
      const itm = input.items[i]
      const itemId = itm.id || `qpi_${Date.now()}_${i}_${Math.random().toString(36).substring(2, 6)}`
      await (db as any).uretimQualityPlanItem.create({
        data: {
          id: itemId,
          planId: createdPlan.id,
          sequence: itm.sequence !== undefined ? itm.sequence : (i + 1) * 10,
          characteristicName: itm.characteristicName,
          characteristicType: itm.characteristicType || "VARIABLE",
          nominalValue: itm.nominalValue !== undefined ? Number(itm.nominalValue) : null,
          minTolerance: itm.minTolerance !== undefined ? Number(itm.minTolerance) : null,
          maxTolerance: itm.maxTolerance !== undefined ? Number(itm.maxTolerance) : null,
          unit: itm.unit || null,
          inspectionMethod: itm.inspectionMethod || null,
          calibrationDeviceId: itm.calibrationDeviceId || null,
          isCritical: Boolean(itm.isCritical),
          notes: itm.notes || null,
        },
      })
    }
  }

  await recordProductionAuditLog({
    userId,
    action: "CREATE",
    resource: "URETIM_KALITE",
    resourceId: createdPlan.id,
    details: { code: createdPlan.code, name: createdPlan.name, controlPoint: createdPlan.controlPoint },
  })

  return getQualityPlanById(createdPlan.id)
}

export async function updateQualityPlan(id: string, input: Partial<QualityPlanInput>, userId?: string) {
  const plan = await (db as any).uretimQualityPlan.findUnique({ where: { id } })
  if (!plan) {
    throw new ProductionDomainError("NOT_FOUND", `Güncellenecek kalite planı bulunamadı (ID: ${id})`)
  }

  const updateData: any = {}
  if (input.name !== undefined) updateData.name = input.name.trim()
  if (input.description !== undefined) updateData.description = input.description
  if (input.targetType !== undefined) updateData.targetType = input.targetType
  if (input.itemId !== undefined) updateData.itemId = input.itemId
  if (input.itemGroup !== undefined) updateData.itemGroup = input.itemGroup
  if (input.controlPoint !== undefined) updateData.controlPoint = input.controlPoint
  if (input.inspectionLevel !== undefined) updateData.inspectionLevel = input.inspectionLevel
  if (input.samplingType !== undefined) updateData.samplingType = input.samplingType
  if (input.samplingSize !== undefined) updateData.samplingSize = input.samplingSize
  if (input.aqlAcceptanceLimit !== undefined) updateData.aqlAcceptanceLimit = input.aqlAcceptanceLimit
  if (input.version !== undefined) updateData.version = input.version
  if (input.isActive !== undefined) updateData.isActive = input.isActive
  if (input.revisionNotes !== undefined) updateData.revisionNotes = input.revisionNotes

  await (db as any).uretimQualityPlan.update({
    where: { id },
    data: updateData,
  })

  // Eğer yeni items listesi verilmişse eskileri silip yenilerini ekleyelim
  if (input.items && Array.isArray(input.items)) {
    await (db as any).uretimQualityPlanItem.deleteMany({ where: { planId: id } })
    for (let i = 0; i < input.items.length; i++) {
      const itm = input.items[i]
      const itemId = itm.id || `qpi_${Date.now()}_${i}_${Math.random().toString(36).substring(2, 6)}`
      await (db as any).uretimQualityPlanItem.create({
        data: {
          id: itemId,
          planId: id,
          sequence: itm.sequence !== undefined ? itm.sequence : (i + 1) * 10,
          characteristicName: itm.characteristicName,
          characteristicType: itm.characteristicType || "VARIABLE",
          nominalValue: itm.nominalValue !== undefined ? Number(itm.nominalValue) : null,
          minTolerance: itm.minTolerance !== undefined ? Number(itm.minTolerance) : null,
          maxTolerance: itm.maxTolerance !== undefined ? Number(itm.maxTolerance) : null,
          unit: itm.unit || null,
          inspectionMethod: itm.inspectionMethod || null,
          calibrationDeviceId: itm.calibrationDeviceId || null,
          isCritical: Boolean(itm.isCritical),
          notes: itm.notes || null,
        },
      })
    }
  }

  await recordProductionAuditLog({
    userId,
    action: "UPDATE",
    resource: "URETIM_KALITE",
    resourceId: id,
    details: { updatedFields: Object.keys(updateData) },
  })

  return getQualityPlanById(id)
}

export async function deleteQualityPlan(id: string, userId?: string) {
  const plan = await (db as any).uretimQualityPlan.findUnique({ where: { id } })
  if (!plan) {
    throw new ProductionDomainError("NOT_FOUND", `Silinecek kalite planı bulunamadı (ID: ${id})`)
  }

  // Bağlı maddeleri ve muayeneleri güvenle kontrol et
  await (db as any).uretimQualityPlanItem.deleteMany({ where: { planId: id } })
  await (db as any).uretimQualityPlan.delete({ where: { id } })

  await recordProductionAuditLog({
    userId,
    action: "DELETE",
    resource: "URETIM_KALITE",
    resourceId: id,
    details: { code: plan.code, name: plan.name },
  })

  return { success: true, deletedId: id }
}

/**
 * Malzeme ID veya Kategori ve Kontrol Noktasına uyan en uygun aktif kalite planını bulur.
 */
export async function findApplicableQualityPlan(params: {
  itemId?: string
  itemGroup?: string
  controlPoint: "RECEIVING" | "IN_PROCESS" | "FINAL"
}) {
  const allPlans = await (db as any).uretimQualityPlan.findMany({
    where: {
      isActive: true,
      controlPoint: params.controlPoint,
    },
    include: {
      items: {
        include: { calibrationDevice: true },
      },
    },
    orderBy: { version: "desc" },
  })

  // 1. Ürüne özel birebir plan var mı?
  if (params.itemId) {
    const itemPlan = allPlans.find((p: any) => p.itemId === params.itemId)
    if (itemPlan) return itemPlan
  }

  // 2. Ürün grubuna uyan genel plan var mı?
  if (params.itemGroup) {
    const groupPlan = allPlans.find(
      (p: any) => p.targetType === "CATEGORY" && p.itemGroup === params.itemGroup
    )
    if (groupPlan) return groupPlan
  }

  // 3. Herhangi bir ürün için genel tanımlı plan
  const genericPlan = allPlans.find((p: any) => !p.itemId && !p.itemGroup)
  return genericPlan || null
}

// ─────────────────────────────────────────────────────────────
// 2. KALİBRASYON CİHAZI YÖNETİMİ (CİHAZ ENGELİ VE TAKİP)
// ─────────────────────────────────────────────────────────────

export interface CalibrationDeviceInput {
  id?: string
  deviceCode: string
  deviceName: string
  deviceType?: string
  serialNumber?: string | null
  brandModel?: string | null
  location?: string | null
  calibrationPeriodMonths?: number
  lastCalibrationDate: Date | string
  nextCalibrationDate?: Date | string
  certificateNumber?: string | null
  calibratedBy?: string | null
  status?: "ACTIVE" | "EXPIRING_SOON" | "EXPIRED" | "OUT_OF_SERVICE"
  notes?: string | null
}

export async function listCalibrationDevices(filter?: {
  status?: string
  search?: string
}) {
  const where: any = {}
  if (filter?.status) where.status = filter.status

  const devices = await (db as any).uretimQualityCalibration.findMany({
    where,
    orderBy: { nextCalibrationDate: "asc" },
  })

  const now = new Date()

  // Durum ve kalan günleri dinamik hesaplayarak zenginleştir
  const enriched = devices.map((d: any) => {
    const nextDate = new Date(d.nextCalibrationDate)
    const diffMs = nextDate.getTime() - now.getTime()
    const daysRemaining = Math.ceil(diffMs / (1000 * 60 * 60 * 24))

    let dynamicStatus = d.status
    if (d.status !== "OUT_OF_SERVICE") {
      if (daysRemaining < 0) {
        dynamicStatus = "EXPIRED"
      } else if (daysRemaining <= 30) {
        dynamicStatus = "EXPIRING_SOON"
      } else {
        dynamicStatus = "ACTIVE"
      }
    }

    return {
      ...d,
      daysRemaining,
      calculatedStatus: dynamicStatus,
      isExpired: daysRemaining < 0 || dynamicStatus === "EXPIRED",
      isExpiringSoon: daysRemaining >= 0 && daysRemaining <= 30,
    }
  })

  if (filter?.search) {
    const q = filter.search.toLowerCase()
    return enriched.filter(
      (d: any) =>
        d.deviceCode?.toLowerCase().includes(q) ||
        d.deviceName?.toLowerCase().includes(q) ||
        d.brandModel?.toLowerCase().includes(q) ||
        d.serialNumber?.toLowerCase().includes(q)
    )
  }

  return enriched
}

export async function getCalibrationDeviceById(id: string) {
  const device = await (db as any).uretimQualityCalibration.findUnique({
    where: { id },
  })
  if (!device) {
    throw new ProductionDomainError("NOT_FOUND", `Kalibrasyon cihazı bulunamadı (ID: ${id})`)
  }

  const now = new Date()
  const nextDate = new Date(device.nextCalibrationDate)
  const diffMs = nextDate.getTime() - now.getTime()
  const daysRemaining = Math.ceil(diffMs / (1000 * 60 * 60 * 24))

  return {
    ...device,
    daysRemaining,
    isExpired: daysRemaining < 0 || device.status === "EXPIRED",
    isExpiringSoon: daysRemaining >= 0 && daysRemaining <= 30,
  }
}

export async function createCalibrationDevice(input: CalibrationDeviceInput, userId?: string) {
  if (!input.deviceCode || !input.deviceName || !input.lastCalibrationDate) {
    throw new ProductionDomainError(
      "VALIDATION_ERROR",
      "Cihaz kodu, cihaz adı ve son kalibrasyon tarihi zorunludur."
    )
  }

  const existing = await (db as any).uretimQualityCalibration.findUnique({
    where: { deviceCode: input.deviceCode.trim() },
  })
  if (existing) {
    throw new ProductionDomainError("CONFLICT", `'${input.deviceCode}' kodlu kalibrasyon cihazı zaten kayıtlı.`)
  }

  const periodMonths = input.calibrationPeriodMonths || 12
  const lastDate = new Date(input.lastCalibrationDate)

  let nextDate = input.nextCalibrationDate ? new Date(input.nextCalibrationDate) : new Date(lastDate)
  if (!input.nextCalibrationDate) {
    nextDate.setMonth(nextDate.getMonth() + periodMonths)
  }

  const now = new Date()
  const diffDays = Math.ceil((nextDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
  let initialStatus = input.status || "ACTIVE"
  if (initialStatus !== "OUT_OF_SERVICE") {
    if (diffDays < 0) initialStatus = "EXPIRED"
    else if (diffDays <= 30) initialStatus = "EXPIRING_SOON"
  }

  const deviceId = input.id || `cal_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`

  const created = await (db as any).uretimQualityCalibration.create({
    data: {
      id: deviceId,
      deviceCode: input.deviceCode.trim(),
      deviceName: input.deviceName.trim(),
      deviceType: input.deviceType || "CALIPER",
      serialNumber: input.serialNumber || null,
      brandModel: input.brandModel || null,
      location: input.location || null,
      calibrationPeriodMonths: periodMonths,
      lastCalibrationDate: lastDate,
      nextCalibrationDate: nextDate,
      certificateNumber: input.certificateNumber || null,
      calibratedBy: input.calibratedBy || null,
      status: initialStatus,
      notes: input.notes || null,
      createdById: userId || null,
    },
  })

  await recordProductionAuditLog({
    userId,
    action: "CREATE",
    resource: "URETIM_KALITE",
    resourceId: created.id,
    details: { deviceCode: created.deviceCode, deviceName: created.deviceName },
  })

  return getCalibrationDeviceById(created.id)
}

export async function updateCalibrationDevice(
  id: string,
  input: Partial<CalibrationDeviceInput>,
  userId?: string
) {
  const device = await (db as any).uretimQualityCalibration.findUnique({ where: { id } })
  if (!device) {
    throw new ProductionDomainError("NOT_FOUND", `Güncellenecek cihaz bulunamadı (ID: ${id})`)
  }

  const updateData: any = {}
  if (input.deviceName !== undefined) updateData.deviceName = input.deviceName.trim()
  if (input.deviceType !== undefined) updateData.deviceType = input.deviceType
  if (input.serialNumber !== undefined) updateData.serialNumber = input.serialNumber
  if (input.brandModel !== undefined) updateData.brandModel = input.brandModel
  if (input.location !== undefined) updateData.location = input.location
  if (input.calibrationPeriodMonths !== undefined) updateData.calibrationPeriodMonths = input.calibrationPeriodMonths
  if (input.lastCalibrationDate !== undefined) updateData.lastCalibrationDate = new Date(input.lastCalibrationDate)
  if (input.nextCalibrationDate !== undefined) updateData.nextCalibrationDate = new Date(input.nextCalibrationDate)
  if (input.certificateNumber !== undefined) updateData.certificateNumber = input.certificateNumber
  if (input.calibratedBy !== undefined) updateData.calibratedBy = input.calibratedBy
  if (input.status !== undefined) updateData.status = input.status
  if (input.notes !== undefined) updateData.notes = input.notes

  // Yeniden kalibrasyon yapılmışsa otomatik nextCalibrationDate ve statü hesapla
  if (input.lastCalibrationDate && !input.nextCalibrationDate) {
    const period = input.calibrationPeriodMonths || device.calibrationPeriodMonths || 12
    const nxt = new Date(input.lastCalibrationDate)
    nxt.setMonth(nxt.getMonth() + period)
    updateData.nextCalibrationDate = nxt

    const now = new Date()
    const diffDays = Math.ceil((nxt.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
    if (diffDays < 0) updateData.status = "EXPIRED"
    else if (diffDays <= 30) updateData.status = "EXPIRING_SOON"
    else updateData.status = "ACTIVE"
  }

  await (db as any).uretimQualityCalibration.update({
    where: { id },
    data: updateData,
  })

  await recordProductionAuditLog({
    userId,
    action: "UPDATE",
    resource: "URETIM_KALITE",
    resourceId: id,
    details: { updatedFields: Object.keys(updateData) },
  })

  return getCalibrationDeviceById(id)
}

export async function deleteCalibrationDevice(id: string, userId?: string) {
  const device = await (db as any).uretimQualityCalibration.findUnique({ where: { id } })
  if (!device) {
    throw new ProductionDomainError("NOT_FOUND", `Silinecek kalibrasyon cihazı bulunamadı (ID: ${id})`)
  }

  await (db as any).uretimQualityCalibration.delete({ where: { id } })

  await recordProductionAuditLog({
    userId,
    action: "DELETE",
    resource: "URETIM_KALITE",
    resourceId: id,
    details: { deviceCode: device.deviceCode },
  })

  return { success: true, deletedId: id }
}

// ─────────────────────────────────────────────────────────────
// 3. MUAYENE KAYDI & RET BLOKAJ İŞLEMLERİ
// ─────────────────────────────────────────────────────────────

export interface InspectionMeasurementInput {
  planItemId?: string | null
  sampleIndex?: number
  characteristicName: string
  characteristicType?: "VARIABLE" | "ATTRIBUTE"
  nominalValue?: number | null
  minTolerance?: number | null
  maxTolerance?: number | null
  minValue?: number | null
  maxValue?: number | null
  measuredValue?: number | null
  isAttributePassed?: boolean | null
  calibrationDeviceId?: string | null
  defectType?: string | null
  notes?: string | null
  isCritical?: boolean
}

export interface InspectionCreationInput {
  id?: string
  inspectionNumber?: string
  planId?: string | null
  inspectionType: "RECEIVING" | "IN_PROCESS" | "FINAL"
  itemId: string
  workOrderId?: string | null
  workOrderOperationId?: string | null
  supplierId?: string | null
  supplierName?: string | null
  purchaseOrderId?: string | null
  goodsReceiptId?: string | null
  lotNumber?: string | null
  serialNumber?: string | null
  batchQuantity: number
  sampleQuantity?: number
  samplingMethod?: SamplingMethod
  inspectionLevel?: InspectionLevel
  aqlAcceptanceLimit?: number
  inspectorUserId?: string | null
  decisionNotes?: string | null
  allowConditionalAcceptance?: boolean
  maxConditionalDefects?: number
  measurements: InspectionMeasurementInput[]
}

export async function listQualityInspections(filter?: {
  inspectionType?: string
  status?: string
  itemId?: string
  workOrderId?: string
  lotNumber?: string
  supplierId?: string
  search?: string
}) {
  const where: any = {}
  if (filter?.inspectionType) where.inspectionType = filter.inspectionType
  if (filter?.status) where.status = filter.status
  if (filter?.itemId) where.itemId = filter.itemId
  if (filter?.workOrderId) where.workOrderId = filter.workOrderId
  if (filter?.lotNumber) where.lotNumber = filter.lotNumber
  if (filter?.supplierId) where.supplierId = filter.supplierId

  const inspections = await (db as any).uretimQualityInspection.findMany({
    where,
    include: {
      item: true,
      plan: true,
      workOrder: true,
      workOrderOperation: true,
      results: {
        include: {
          calibrationDevice: true,
          planItem: true,
        },
      },
      ncrs: true,
    },
    orderBy: { createdAt: "desc" },
  })

  if (filter?.search) {
    const q = filter.search.toLowerCase()
    return inspections.filter(
      (ins: any) =>
        ins.inspectionNumber?.toLowerCase().includes(q) ||
        ins.lotNumber?.toLowerCase().includes(q) ||
        ins.item?.name?.toLowerCase().includes(q) ||
        ins.supplierName?.toLowerCase().includes(q)
    )
  }

  return inspections
}

export async function getQualityInspectionById(id: string) {
  const inspection = await (db as any).uretimQualityInspection.findUnique({
    where: { id },
    include: {
      item: true,
      plan: true,
      workOrder: true,
      workOrderOperation: true,
      results: {
        include: {
          calibrationDevice: true,
          planItem: true,
        },
      },
      ncrs: true,
    },
  })
  if (!inspection) {
    throw new ProductionDomainError("NOT_FOUND", `Muayene kaydı bulunamadı (ID: ${id})`)
  }
  return inspection
}

/**
 * Muayene kaydı oluşturur, kalibrasyon kontrolü yapar, toleransları doğrular ve
 * sonuca göre kabul/şartlı kabul/ret kararı vererek stok blokajını uygular.
 */
export async function createQualityInspection(input: InspectionCreationInput, userId?: string) {
  if (!input.itemId || !input.batchQuantity || input.batchQuantity <= 0) {
    throw new ProductionDomainError("VALIDATION_ERROR", "Malzeme seçimi ve geçerli parti miktarı zorunludur.")
  }

  // 1. Kalite Planını Çözümle
  let plan = null
  if (input.planId) {
    plan = await (db as any).uretimQualityPlan.findUnique({
      where: { id: input.planId },
      include: { items: true },
    })
  } else {
    // Malzeme bilgisine göre otomatik plan bul
    const item = await (db as any).inventoryItem.findUnique({ where: { id: input.itemId } })
    plan = await findApplicableQualityPlan({
      itemId: input.itemId,
      itemGroup: item?.category || undefined,
      controlPoint: input.inspectionType,
    })
  }

  // 2. AQL Numune Büyüklüğü Hesapla
  const samplingResult = calculateAqlSamplingPlan({
    lotSize: input.batchQuantity,
    samplingMethod: input.samplingMethod || plan?.samplingType || "AQL",
    samplingSize: input.sampleQuantity || plan?.samplingSize,
    inspectionLevel: input.inspectionLevel || plan?.inspectionLevel || "LEVEL_II",
    aqlLimit: input.aqlAcceptanceLimit !== undefined ? input.aqlAcceptanceLimit : plan?.aqlAcceptanceLimit,
  })

  // 3. Kalibrasyon Cihazı Denetimi: Ölçümlerde kullanılan cihazların kalibrasyon geçerliliğini doğrula!
  const usedDeviceIds = Array.from(
    new Set(
      input.measurements
        .map((m) => m.calibrationDeviceId)
        .filter((devId): devId is string => Boolean(devId))
    )
  )

  for (const devId of usedDeviceIds) {
    const device = await (db as any).uretimQualityCalibration.findUnique({ where: { id: devId } })
    if (device) {
      // Kalibrasyon geçerliliği denetlenir; süresi geçmişse ProductionDomainError("CALIBRATION_EXPIRED") fırlatılır!
      checkCalibrationDeviceValidity(device)
    }
  }

  // 4. Ölçüm Sonuçlarını Değerlendir
  const evaluatedResults: Array<{
    itemInput: InspectionMeasurementInput
    evaluation: ReturnType<typeof evaluateCharacteristicMeasurement>
  }> = []

  for (const m of input.measurements) {
    const evalRes = evaluateCharacteristicMeasurement({
      characteristicType: m.characteristicType || "VARIABLE",
      nominalValue: m.nominalValue,
      minTolerance: m.minTolerance,
      maxTolerance: m.maxTolerance,
      minValue: m.minValue,
      maxValue: m.maxValue,
      measuredValue: m.measuredValue,
      isAttributePassed: m.isAttributePassed,
    })

    evaluatedResults.push({
      itemInput: m,
      evaluation: evalRes,
    })
  }

  // 5. Nihai Kararı Belirle (Kabul / Şartlı Kabul / Ret)
  const dispositionResult = determineInspectionDisposition({
    sampleSize: samplingResult.sampleSize,
    acceptanceNumber: samplingResult.acceptanceNumber,
    rejectionNumber: samplingResult.rejectionNumber,
    results: evaluatedResults.map((er) => ({
      isConforming: er.evaluation.isConforming,
      isCritical: Boolean(er.itemInput.isCritical),
      deviation: er.evaluation.deviation,
      characteristicName: er.itemInput.characteristicName,
    })),
    allowConditionalAcceptance: input.allowConditionalAcceptance,
    maxConditionalDefects: input.maxConditionalDefects,
  })

  // 6. Muayene Kaydını Oluştur
  const inspectionNumber =
    input.inspectionNumber ||
    `INS-${new Date().getFullYear()}-${Math.floor(100000 + Math.random() * 900000)}`
  const inspectionId = input.id || `ins_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`

  const createdInspection = await (db as any).uretimQualityInspection.create({
    data: {
      id: inspectionId,
      inspectionNumber,
      planId: plan?.id || null,
      inspectionType: input.inspectionType,
      itemId: input.itemId,
      workOrderId: input.workOrderId || null,
      workOrderOperationId: input.workOrderOperationId || null,
      supplierId: input.supplierId || null,
      supplierName: input.supplierName || null,
      purchaseOrderId: input.purchaseOrderId || null,
      goodsReceiptId: input.goodsReceiptId || null,
      lotNumber: input.lotNumber || null,
      serialNumber: input.serialNumber || null,
      batchQuantity: input.batchQuantity,
      sampleQuantity: samplingResult.sampleSize,
      status: dispositionResult.disposition,
      totalDefects: dispositionResult.defectCount,
      isStockBlocked: dispositionResult.isStockBlockRequired,
      quarantineWarehouseId: dispositionResult.isStockBlockRequired ? "QUARANTINE_WH" : null,
      inspectorUserId: userId || input.inspectorUserId || null,
      inspectionDate: new Date(),
      decisionNotes: input.decisionNotes || dispositionResult.decisionReason,
    },
  })

  // Ölçüm satırlarını kaydet
  for (let i = 0; i < evaluatedResults.length; i++) {
    const { itemInput, evaluation } = evaluatedResults[i]
    const resultId = `qir_${Date.now()}_${i}_${Math.random().toString(36).substring(2, 6)}`
    await (db as any).uretimQualityInspectionResult.create({
      data: {
        id: resultId,
        inspectionId: createdInspection.id,
        planItemId: itemInput.planItemId || null,
        sampleIndex: itemInput.sampleIndex || 1,
        characteristicName: itemInput.characteristicName,
        characteristicType: itemInput.characteristicType || "VARIABLE",
        nominalValue: itemInput.nominalValue !== undefined ? itemInput.nominalValue : null,
        minValue: evaluation.effectiveMin !== undefined ? evaluation.effectiveMin : null,
        maxValue: evaluation.effectiveMax !== undefined ? evaluation.effectiveMax : null,
        measuredValue: itemInput.measuredValue !== undefined ? itemInput.measuredValue : null,
        isAttributePassed: itemInput.isAttributePassed !== undefined ? itemInput.isAttributePassed : null,
        isConforming: evaluation.isConforming,
        deviation: evaluation.deviation !== undefined ? evaluation.deviation : null,
        calibrationDeviceId: itemInput.calibrationDeviceId || null,
        defectType: !evaluation.isConforming ? itemInput.defectType || "TOLERANS_DISI" : null,
        notes: itemInput.notes || evaluation.reason || null,
      },
    })
  }

  // 7. RET VE BLOKAJ YÖNETİMİ: Stok Karantinaya Alma & Blokaj Uygulama
  if (dispositionResult.isStockBlockRequired) {
    // A) Eğer Lot/Seri No varsa, LotSerialRecord'u QUARANTINE statüsüne al
    if (input.lotNumber) {
      const lotRecords = await (db as any).lotSerialRecord.findMany({
        where: {
          lotNumber: input.lotNumber,
          itemId: input.itemId,
        },
      })
      for (const lr of lotRecords) {
        await (db as any).lotSerialRecord.update({
          where: { id: lr.id },
          data: { status: "QUARANTINE" },
        })
      }
    }

    // B) StockBalance'ta karantina miktarını arttır ve kullanılabilir miktarı düşür
    const balances = await (db as any).stockBalance.findMany({
      where: { itemId: input.itemId },
    })
    if (balances.length > 0) {
      const targetBalance = balances[0]
      const blockedQty = Math.min(targetBalance.availableQty, input.batchQuantity)
      await (db as any).stockBalance.update({
        where: { id: targetBalance.id },
        data: {
          availableQty: Math.max(0, targetBalance.availableQty - blockedQty),
          quarantineQty: targetBalance.quarantineQty + blockedQty,
        },
      })
    }

    // C) Eğer İş Emri Operasyonundaysa operasyon kalite durumunu güncelle
    if (input.workOrderOperationId) {
      await (db as any).uretimWorkOrderOperation.update({
        where: { id: input.workOrderOperationId },
        data: { qualityInspectionStatus: "REJECTED" },
      })
    }
  } else {
    // Kabul durumu: Eğer İş Emri Operasyonundaysa kalite onaylandı olarak işaretle
    if (input.workOrderOperationId) {
      await (db as any).uretimWorkOrderOperation.update({
        where: { id: input.workOrderOperationId },
        data: { qualityInspectionStatus: "PASSED" },
      })
    }
  }

  // 8. Audit Log
  await recordProductionAuditLog({
    userId,
    action: dispositionResult.disposition === "REJECTED" ? "QA_FAIL" : "QA_PASS",
    resource: "URETIM_KALITE",
    resourceId: createdInspection.id,
    details: {
      inspectionNumber: createdInspection.inspectionNumber,
      disposition: dispositionResult.disposition,
      totalDefects: dispositionResult.defectCount,
      isStockBlocked: dispositionResult.isStockBlockRequired,
      lotNumber: input.lotNumber,
    },
  })

  return getQualityInspectionById(createdInspection.id)
}

// ─────────────────────────────────────────────────────────────
// 4. UYGUNSUZLUK (NCR) & DÖF (CAPA) İŞ AKIŞI
// ─────────────────────────────────────────────────────────────

export interface QualityNcrInput {
  id?: string
  ncrNumber?: string
  inspectionId?: string | null
  workOrderId?: string | null
  itemId?: string | null
  lotNumber?: string | null
  source?: "INSPECTION" | "CUSTOMER_COMPLAINT" | "INTERNAL_AUDIT" | "PRODUCTION_LINE"
  severity?: "MINOR" | "MAJOR" | "CRITICAL"
  defectCategory?: string
  title: string
  description: string
  affectedQuantity?: number
  rootCauseMethod?: string | null
  rootCauseDescription?: string | null
  correctiveAction?: string | null
  preventiveAction?: string | null
  assignedToUserId?: string | null
  targetDate?: Date | string | null
  costImpact?: number
}

export async function listQualityNcrs(filter?: {
  status?: string
  severity?: string
  source?: string
  itemId?: string
  workOrderId?: string
  search?: string
}) {
  const where: any = {}
  if (filter?.status) where.status = filter.status
  if (filter?.severity) where.severity = filter.severity
  if (filter?.source) where.source = filter.source
  if (filter?.itemId) where.itemId = filter.itemId
  if (filter?.workOrderId) where.workOrderId = filter.workOrderId

  const ncrs = await (db as any).uretimQualityNcr.findMany({
    where,
    include: {
      inspection: true,
      workOrder: true,
      item: true,
    },
    orderBy: { createdAt: "desc" },
  })

  if (filter?.search) {
    const q = filter.search.toLowerCase()
    return ncrs.filter(
      (n: any) =>
        n.ncrNumber?.toLowerCase().includes(q) ||
        n.title?.toLowerCase().includes(q) ||
        n.description?.toLowerCase().includes(q) ||
        n.lotNumber?.toLowerCase().includes(q)
    )
  }

  return ncrs
}

export async function getQualityNcrById(id: string) {
  const ncr = await (db as any).uretimQualityNcr.findUnique({
    where: { id },
    include: {
      inspection: true,
      workOrder: true,
      item: true,
    },
  })
  if (!ncr) {
    throw new ProductionDomainError("NOT_FOUND", `NCR kaydı bulunamadı (ID: ${id})`)
  }
  return ncr
}

export async function createQualityNcr(input: QualityNcrInput, userId?: string) {
  if (!input.title || !input.description) {
    throw new ProductionDomainError("VALIDATION_ERROR", "NCR başlığı ve uygunsuzluk açıklaması zorunludur.")
  }

  const ncrNumber =
    input.ncrNumber || `NCR-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`
  const ncrId = input.id || `ncr_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`

  const createdNcr = await (db as any).uretimQualityNcr.create({
    data: {
      id: ncrId,
      ncrNumber,
      inspectionId: input.inspectionId || null,
      workOrderId: input.workOrderId || null,
      itemId: input.itemId || null,
      lotNumber: input.lotNumber || null,
      source: input.source || "INSPECTION",
      severity: input.severity || "MAJOR",
      defectCategory: input.defectCategory || "DIMENSION",
      title: input.title.trim(),
      description: input.description.trim(),
      affectedQuantity: input.affectedQuantity !== undefined ? Number(input.affectedQuantity) : 0,
      rootCauseMethod: input.rootCauseMethod || null,
      rootCauseDescription: input.rootCauseDescription || null,
      correctiveAction: input.correctiveAction || null,
      preventiveAction: input.preventiveAction || null,
      assignedToUserId: input.assignedToUserId || null,
      targetDate: input.targetDate ? new Date(input.targetDate) : null,
      status: "OPEN",
      costImpact: input.costImpact !== undefined ? Number(input.costImpact) : 0,
    },
  })

  await recordProductionAuditLog({
    userId,
    action: "CREATE",
    resource: "URETIM_KALITE",
    resourceId: createdNcr.id,
    details: { ncrNumber: createdNcr.ncrNumber, title: createdNcr.title, severity: createdNcr.severity },
  })

  return getQualityNcrById(createdNcr.id)
}

/**
 * NCR durum geçişini iş kuralı ve durum makinesi (state machine) ile günceller.
 */
export async function updateQualityNcrStatus(
  id: string,
  targetStatus: NcrStatus,
  updatePayload?: Partial<QualityNcrInput> & {
    effectivenessResult?: "PENDING" | "EFFECTIVE" | "INEFFECTIVE"
    effectivenessNotes?: string
  },
  userId?: string
) {
  const ncr = await (db as any).uretimQualityNcr.findUnique({ where: { id } })
  if (!ncr) {
    throw new ProductionDomainError("NOT_FOUND", `NCR kaydı bulunamadı (ID: ${id})`)
  }

  const currentStatus = ncr.status as NcrStatus

  // Durum geçişini doğrula
  const transitionCheck = validateNcrStateTransition(currentStatus, targetStatus, {
    rootCauseDescription: updatePayload?.rootCauseDescription || ncr.rootCauseDescription,
    correctiveAction: updatePayload?.correctiveAction || ncr.correctiveAction,
    assignedToUserId: updatePayload?.assignedToUserId || ncr.assignedToUserId,
    effectivenessResult: updatePayload?.effectivenessResult || ncr.effectivenessResult,
  })

  if (!transitionCheck.valid) {
    throw new ProductionDomainError(
      "INVALID_STATE_TRANSITION",
      transitionCheck.error || "Geçersiz NCR durum geçişi."
    )
  }

  const updateData: any = {
    status: targetStatus,
  }

  if (updatePayload?.rootCauseMethod !== undefined) updateData.rootCauseMethod = updatePayload.rootCauseMethod
  if (updatePayload?.rootCauseDescription !== undefined) updateData.rootCauseDescription = updatePayload.rootCauseDescription
  if (updatePayload?.correctiveAction !== undefined) updateData.correctiveAction = updatePayload.correctiveAction
  if (updatePayload?.preventiveAction !== undefined) updateData.preventiveAction = updatePayload.preventiveAction
  if (updatePayload?.assignedToUserId !== undefined) updateData.assignedToUserId = updatePayload.assignedToUserId
  if (updatePayload?.targetDate !== undefined) updateData.targetDate = updatePayload.targetDate ? new Date(updatePayload.targetDate) : null
  if (updatePayload?.costImpact !== undefined) updateData.costImpact = Number(updatePayload.costImpact)
  if (updatePayload?.effectivenessResult !== undefined) updateData.effectivenessResult = updatePayload.effectivenessResult
  if (updatePayload?.effectivenessNotes !== undefined) updateData.effectivenessNotes = updatePayload.effectivenessNotes

  if (targetStatus === "CLOSED") {
    updateData.closedAt = new Date()
    updateData.closedByUserId = userId || null
  }

  await (db as any).uretimQualityNcr.update({
    where: { id },
    data: updateData,
  })

  await recordProductionAuditLog({
    userId,
    action: targetStatus === "CLOSED" ? "APPROVE" : "UPDATE",
    resource: "URETIM_KALITE",
    resourceId: id,
    details: { oldStatus: currentStatus, newStatus: targetStatus },
  })

  return getQualityNcrById(id)
}

// ─────────────────────────────────────────────────────────────
// 5. İKİ YÖNLÜ PARTİ İZLENEBİLİRLİĞİ & GERİ ÇAĞIRMA (RECALL)
// ─────────────────────────────────────────────────────────────

export interface TraceNode {
  type: "RAW_MATERIAL" | "WORK_ORDER" | "FINISHED_GOOD" | "SALES_ORDER" | "SUPPLIER"
  id: string
  code: string
  name: string
  lotNumber?: string
  quantity?: number
  date?: string | Date
  details?: Record<string, unknown>
  children?: TraceNode[]
}

/**
 * İleri İzleme (Forward Traceability):
 * Hammadde parti no verilir -> Hangi iş emirlerinde kullanıldı -> Hangi mamul partileri üretildi -> Hangi müşterilere satıldı/sevk edildi.
 */
export async function traceLotForward(lotNumber: string): Promise<{
  rootLotNumber: string
  direction: "FORWARD"
  consumedInWorkOrders: any[]
  producedFinishedLots: string[]
  affectedCustomerOrders: any[]
  traceTree: TraceNode
}> {
  // 1. Bu lot numarasının tüketildiği İş Emri Malzemelerini bul
  const consumedMaterials = await (db as any).uretimWorkOrderMaterial.findMany({
    where: { lotNumber },
    include: {
      workOrder: {
        include: { item: true },
      },
      item: true,
    },
  })

  const workOrdersMap = new Map<string, any>()
  const finishedLotsSet = new Set<string>()

  for (const cm of consumedMaterials) {
    if (cm.workOrder) {
      workOrdersMap.set(cm.workOrder.id, cm.workOrder)
      if (cm.workOrder.lotNumber) {
        finishedLotsSet.add(cm.workOrder.lotNumber)
      }
    }
  }

  const finishedLots = Array.from(finishedLotsSet)

  // 2. Bu mamul partilerinin sevk edildiği siparişleri bul
  const affectedOrders: any[] = []
  if (finishedLots.length > 0) {
    const movements = await (db as any).stockMovement.findMany({
      where: {
        lotNumber: { in: finishedLots },
        movementType: "SALES_SHIPMENT",
      },
      include: {
        item: true,
      },
    })
    for (const mov of movements) {
      affectedOrders.push({
        orderId: mov.referenceId || "ORD-REF",
        customerName: mov.notes || "Müşteri Kaydı",
        lotNumber: mov.lotNumber,
        shippedQty: mov.quantity,
        date: mov.createdAt,
      })
    }
  }

  const rootNode: TraceNode = {
    type: "RAW_MATERIAL",
    id: `lot_${lotNumber}`,
    code: lotNumber,
    name: `Hammadde Partisi: ${lotNumber}`,
    lotNumber,
    children: Array.from(workOrdersMap.values()).map((wo) => ({
      type: "WORK_ORDER",
      id: wo.id,
      code: wo.orderNumber,
      name: `İş Emri: ${wo.orderNumber} (${wo.item?.name || "Mamul"})`,
      lotNumber: wo.lotNumber,
      quantity: wo.plannedQuantity,
      date: wo.createdAt,
      children: affectedOrders
        .filter((o) => o.lotNumber === wo.lotNumber)
        .map((ord) => ({
          type: "SALES_ORDER",
          id: ord.orderId,
          code: ord.orderId,
          name: `Müşteri Sevkiyatı: ${ord.customerName}`,
          lotNumber: ord.lotNumber,
          quantity: ord.shippedQty,
          date: ord.date,
        })),
    })),
  }

  return {
    rootLotNumber: lotNumber,
    direction: "FORWARD",
    consumedInWorkOrders: Array.from(workOrdersMap.values()),
    producedFinishedLots: finishedLots,
    affectedCustomerOrders: affectedOrders,
    traceTree: rootNode,
  }
}

/**
 * Geri İzleme (Backward Traceability):
 * Mamul parti no verilir -> Hangi iş emrinde üretildi -> Hangi operasyonlardan geçti -> Hangi hammadde partileri ve tedarikçilerden geldi.
 */
export async function traceLotBackward(lotNumber: string): Promise<{
  rootLotNumber: string
  direction: "BACKWARD"
  producingWorkOrder: any | null
  operations: any[]
  consumedRawMaterialLots: any[]
  traceTree: TraceNode
}> {
  // Mamulün üretildiği iş emrini bul
  const workOrders = await (db as any).uretimWorkOrder.findMany({
    where: { lotNumber },
    include: {
      item: true,
      operations: {
        include: { workCenter: true },
      },
      materials: {
        include: { item: true },
      },
    },
  })

  const wo = workOrders.length > 0 ? workOrders[0] : null
  const operations = wo?.operations || []
  const materials = wo?.materials || []

  const rawLots = materials.map((m: any) => ({
    itemId: m.itemId,
    itemName: m.item?.name || "Hammadde",
    lotNumber: m.lotNumber || "BELİRTİLMEMİŞ",
    quantity: m.actualQuantity || m.plannedQuantity,
    unit: m.unit || "Adet",
  }))

  const rootNode: TraceNode = {
    type: "FINISHED_GOOD",
    id: `fg_${lotNumber}`,
    code: lotNumber,
    name: `Nihai Mamul Partisi: ${lotNumber} (${wo?.item?.name || "Bilinmiyor"})`,
    lotNumber,
    quantity: wo?.producedQuantity || wo?.plannedQuantity,
    date: wo?.actualEndDate || wo?.createdAt,
    children: [
      {
        type: "WORK_ORDER",
        id: wo?.id || "wo_na",
        code: wo?.orderNumber || "N/A",
        name: `Üretim Emri: ${wo?.orderNumber || "N/A"}`,
        children: rawLots.map((rl: any) => ({
          type: "RAW_MATERIAL",
          id: `rm_${rl.lotNumber}`,
          code: rl.lotNumber,
          name: `${rl.itemName} (Lot: ${rl.lotNumber})`,
          lotNumber: rl.lotNumber,
          quantity: rl.quantity,
        })),
      },
    ],
  }

  return {
    rootLotNumber: lotNumber,
    direction: "BACKWARD",
    producingWorkOrder: wo,
    operations,
    consumedRawMaterialLots: rawLots,
    traceTree: rootNode,
  }
}

/**
 * Geri Çağırma (Recall) Simülasyonu & Etki Analizi:
 * Riskli parti numarası verildiğinde stoktaki miktar, üretimdeki miktar ve müşterilere sevk edilmiş riskli kayıt listesini çıkarır.
 */
export async function simulateLotRecall(lotNumber: string): Promise<{
  lotNumber: string
  totalExposureQuantity: number
  inStockQuarantinedQty: number
  inProgressWipQty: number
  shippedToCustomerQty: number
  affectedCustomers: Array<{
    customerName: string
    orderId: string
    shippedQty: number
    shipmentDate: string | Date
  }>
  recommendedAction: string
}> {
  // İleri izleme ile müşterileri ve mamulleri çıkar
  const forward = await traceLotForward(lotNumber)

  // Mevcut depodaki miktar
  const lotRecords = await (db as any).lotSerialRecord.findMany({
    where: { lotNumber },
  })
  const inStockQuarantinedQty = lotRecords.reduce((sum: number, r: any) => sum + (r.remainingQty || 0), 0)

  // Devam eden iş emirlerindeki miktar
  let inProgressWipQty = 0
  for (const wo of forward.consumedInWorkOrders) {
    if (wo.status === "RUNNING" || wo.status === "RELEASED") {
      inProgressWipQty += wo.plannedQuantity || 0
    }
  }

  // Müşterilere sevk edilen miktar
  let shippedToCustomerQty = 0
  const affectedCustomers = forward.affectedCustomerOrders.map((o) => {
    shippedToCustomerQty += o.shippedQty || 0
    return {
      customerName: o.customerName,
      orderId: o.orderId,
      shippedQty: o.shippedQty || 0,
      shipmentDate: o.date,
    }
  })

  const totalExposureQuantity = inStockQuarantinedQty + inProgressWipQty + shippedToCustomerQty

  let recommendedAction = "Acil Müşteri İletişimi ve Karantina Blokajı Uygulanmalı."
  if (shippedToCustomerQty === 0) {
    recommendedAction = "Ürün henüz müşterilere sevk edilmemiş. Depodaki parti karantinaya alınıp bertaraf edilmelidir."
  }

  return {
    lotNumber,
    totalExposureQuantity,
    inStockQuarantinedQty,
    inProgressWipQty,
    shippedToCustomerQty,
    affectedCustomers,
    recommendedAction,
  }
}

// ─────────────────────────────────────────────────────────────
// 6. KALİTE RAPORLARI, PARETO & SPC METRİKLERİ
// ─────────────────────────────────────────────────────────────

export async function getQualityOverviewDashboardStats() {
  const allInspections = await (db as any).uretimQualityInspection.findMany()
  const allNcrs = await (db as any).uretimQualityNcr.findMany()
  const allDevices = await (db as any).uretimQualityCalibration.findMany()

  const totalInspections = allInspections.length
  const passedCount = allInspections.filter(
    (i: any) => i.status === "PASSED" || i.status === "CONDITIONAL_PASSED"
  ).length
  const rejectedCount = allInspections.filter((i: any) => i.status === "REJECTED").length
  const passRate = totalInspections > 0 ? Number(((passedCount / totalInspections) * 100).toFixed(1)) : 100

  const activeNcrs = allNcrs.filter((n: any) => n.status !== "CLOSED" && n.status !== "CANCELLED").length
  const criticalNcrs = allNcrs.filter((n: any) => n.severity === "CRITICAL" && n.status !== "CLOSED").length

  const now = new Date()
  let expiredDevicesCount = 0
  let expiringSoonDevicesCount = 0

  for (const d of allDevices) {
    const nextDate = new Date(d.nextCalibrationDate)
    const diffDays = Math.ceil((nextDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
    if (d.status === "OUT_OF_SERVICE" || d.status === "EXPIRED" || diffDays < 0) {
      expiredDevicesCount++
    } else if (diffDays <= 30) {
      expiringSoonDevicesCount++
    }
  }

  return {
    totalInspections,
    passedCount,
    rejectedCount,
    passRate,
    activeNcrs,
    criticalNcrs,
    totalDevices: allDevices.length,
    expiredDevicesCount,
    expiringSoonDevicesCount,
  }
}

export async function getQualityParetoAnalysisReport() {
  const allResults = await (db as any).uretimQualityInspectionResult.findMany({
    where: { isConforming: false },
  })
  const allNcrs = await (db as any).uretimQualityNcr.findMany()

  const categoryMap = new Map<string, number>()

  for (const r of allResults) {
    const cat = r.defectType || "TOLERANS_DISI"
    categoryMap.set(cat, (categoryMap.get(cat) || 0) + 1)
  }

  for (const n of allNcrs) {
    const cat = n.defectCategory || "GENEL_UYGUNSUZLUK"
    categoryMap.set(cat, (categoryMap.get(cat) || 0) + 1)
  }

  const items = Array.from(categoryMap.entries()).map(([category, count]) => ({
    category,
    count,
  }))

  return calculateParetoAnalysis(items)
}

export async function getSupplierQualityRatingsReport() {
  const receivingInspections = await (db as any).uretimQualityInspection.findMany({
    where: { inspectionType: "RECEIVING" },
  })

  const supplierMap = new Map<string, {
    supplierId: string
    supplierName: string
    total: number
    passed: number
    conditional: number
    rejected: number
    batchQty: number
    rejectedQty: number
  }>()

  for (const ins of receivingInspections) {
    const supId = ins.supplierId || "SUP-UNKNOWN"
    const supName = ins.supplierName || "Genel Tedarikçi"

    if (!supplierMap.has(supId)) {
      supplierMap.set(supId, {
        supplierId: supId,
        supplierName: supName,
        total: 0,
        passed: 0,
        conditional: 0,
        rejected: 0,
        batchQty: 0,
        rejectedQty: 0,
      })
    }

    const s = supplierMap.get(supId)!
    s.total++
    s.batchQty += ins.batchQuantity || 0

    if (ins.status === "PASSED") s.passed++
    else if (ins.status === "CONDITIONAL_PASSED") s.conditional++
    else if (ins.status === "REJECTED") {
      s.rejected++
      s.rejectedQty += ins.batchQuantity || 0
    }
  }

  return Array.from(supplierMap.values()).map((s) =>
    calculateSupplierQualityScore({
      supplierId: s.supplierId,
      supplierName: s.supplierName,
      totalInspections: s.total,
      passedInspections: s.passed,
      conditionalPassedInspections: s.conditional,
      rejectedInspections: s.rejected,
      totalBatchQuantity: s.batchQty,
      rejectedQuantity: s.rejectedQty,
    })
  )
}

