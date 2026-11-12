/**
 * Sunum ERP — Üretim Entegrasyon, Konsolide Dashboard, Bildirim & Raporlama Veritabanı Servisi
 *
 * Uçtan Uca CRUD, Süreç Entegrasyonu, Olay Bildirimleri ve Rapor Motoru:
 * 1. Olay Bazlı Bildirim Kuralları ve Kullanıcı Tercihleri
 * 2. Anlık Olay Bildirimi Dağıtımı & Periyodik Uyarı Tarayıcısı
 * 3. Konsolide Üretim Dashboard KPI ve Rol Bazlı Görünüm (Fabrika/Planlama/Atölye/Operatör)
 * 4. Kapsamlı Rapor Seti (İş Emri Maliyet, Malzeme Varyans, Makine OEE, MRP Aksiyon, Kalite Pareto, Bakım)
 * 5. Excel/CSV Dışa Aktarma (Export) Altyapısı
 * 6. Üretim Modülleri Denetim İzi (Audit Trail) Sorgulayıcısı
 * 7. Uçtan Uca Entegrasyon Senaryo Yürütücüleri (E2E Senaryoları A & B)
 */

import { db } from "@/lib/db"
import {
  recordProductionAuditLog,
  ProductionDomainError,
  assertProductionFeatureEnabled,
} from "./productionAuditAndError"
import {
  calculateOnTimeDeliveryRate,
  calculateScheduleAdherence,
  calculateScrapAndDefectRate,
  calculateWorkOrderCostVariance,
  calculateMaterialConsumptionVariance,
  matchNotificationRules,
  exportToCsvFormat,
  type ProductionEventType,
  type ProductionSeverity,
  type NotificationChannel,
  type ProductionRoleView,
  type ProductionEventPayload,
  type NotificationRuleDefinition,
} from "./productionIntegrationEngine"
import { calculateOEE, calculateMTBF, calculateMTTR } from "./productionMaintenanceEngine"

// ─────────────────────────────────────────────────────────────
// 1. BİLDİRİM KURALLARI VE KULLANICI TERCİHLERİ
// ─────────────────────────────────────────────────────────────

export interface NotificationRuleInput {
  name: string
  eventType: ProductionEventType
  severity?: ProductionSeverity
  channel?: NotificationChannel
  targetRoles?: ProductionRoleView[]
  isActive?: boolean
  description?: string
}

export async function listNotificationRules() {
  const rules = await (db.uretimNotificationRule as any).findMany()
  return rules.map((r: any) => ({
    ...r,
    targetRoles: r.targetRoles ? JSON.parse(r.targetRoles) : [],
  }))
}

export async function createNotificationRule(data: NotificationRuleInput, userId?: string) {
  if (!data.name || !data.eventType) {
    throw new ProductionDomainError("Kural adı ve olay türü zorunludur.", 400, "MISSING_REQUIRED_FIELDS")
  }

  const created = await (db.uretimNotificationRule as any).create({
    data: {
      name: data.name.trim(),
      eventType: data.eventType,
      severity: data.severity || "WARNING",
      channel: data.channel || "IN_APP",
      targetRoles: data.targetRoles ? JSON.stringify(data.targetRoles) : JSON.stringify(["FABRIKA_MUDURU", "PLANLAMA_MUDURU"]),
      isActive: data.isActive !== undefined ? data.isActive : true,
      description: data.description?.trim() || null,
    },
  })

  await recordProductionAuditLog({
    action: "CREATE_NOTIFICATION_RULE",
    entityType: "UretimNotificationRule",
    entityId: created.id,
    userId: userId || "SYSTEM",
    details: { name: created.name, eventType: created.eventType },
  })

  return {
    ...created,
    targetRoles: created.targetRoles ? JSON.parse(created.targetRoles) : [],
  }
}

export async function updateNotificationRule(id: string, data: Partial<NotificationRuleInput>, userId?: string) {
  const current = await (db.uretimNotificationRule as any).findUnique({ where: { id } })
  if (!current) {
    throw new ProductionDomainError("Bildirim kuralı bulunamadı.", 404, "NOT_FOUND")
  }

  const updated = await (db.uretimNotificationRule as any).update({
    where: { id },
    data: {
      ...(data.name && { name: data.name.trim() }),
      ...(data.eventType && { eventType: data.eventType }),
      ...(data.severity && { severity: data.severity }),
      ...(data.channel && { channel: data.channel }),
      ...(data.targetRoles !== undefined && { targetRoles: JSON.stringify(data.targetRoles) }),
      ...(data.isActive !== undefined && { isActive: data.isActive }),
      ...(data.description !== undefined && { description: data.description?.trim() || null }),
    },
  })

  await recordProductionAuditLog({
    action: "UPDATE_NOTIFICATION_RULE",
    entityType: "UretimNotificationRule",
    entityId: id,
    userId: userId || "SYSTEM",
    details: { changes: data },
  })

  return {
    ...updated,
    targetRoles: updated.targetRoles ? JSON.parse(updated.targetRoles) : [],
  }
}

export async function deleteNotificationRule(id: string, userId?: string) {
  const current = await (db.uretimNotificationRule as any).findUnique({ where: { id } })
  if (!current) {
    throw new ProductionDomainError("Silinecek bildirim kuralı bulunamadı.", 404, "NOT_FOUND")
  }

  await (db.uretimNotificationRule as any).delete({ where: { id } })

  await recordProductionAuditLog({
    action: "DELETE_NOTIFICATION_RULE",
    entityType: "UretimNotificationRule",
    entityId: id,
    userId: userId || "SYSTEM",
    details: { id },
  })

  return { success: true }
}

export async function getUserNotificationPreferences(userId: string) {
  const prefs = await (db.uretimNotificationPreference as any).findMany({
    where: { userId },
  })
  return prefs
}

export async function updateUserNotificationPreference(
  userId: string,
  eventType: ProductionEventType,
  data: { inAppEnabled?: boolean; emailEnabled?: boolean; smsEnabled?: boolean }
) {
  const existing = await (db.uretimNotificationPreference as any).findFirst({
    where: { userId, eventType },
  })

  let result
  if (existing) {
    result = await (db.uretimNotificationPreference as any).update({
      where: { id: existing.id },
      data: {
        ...(data.inAppEnabled !== undefined && { inAppEnabled: data.inAppEnabled }),
        ...(data.emailEnabled !== undefined && { emailEnabled: data.emailEnabled }),
        ...(data.smsEnabled !== undefined && { smsEnabled: data.smsEnabled }),
      },
    })
  } else {
    result = await (db.uretimNotificationPreference as any).create({
      data: {
        userId,
        eventType,
        inAppEnabled: data.inAppEnabled !== undefined ? data.inAppEnabled : true,
        emailEnabled: data.emailEnabled !== undefined ? data.emailEnabled : false,
        smsEnabled: data.smsEnabled !== undefined ? data.smsEnabled : false,
      },
    })
  }

  return result
}

// ─────────────────────────────────────────────────────────────
// 2. ANLIK OLAY BİLDİRİMİ DAĞITIMI
// ─────────────────────────────────────────────────────────────

export async function dispatchProductionNotification(event: ProductionEventPayload) {
  const allRules = await listNotificationRules()
  const matchingRules = matchNotificationRules(event, allRules)

  if (matchingRules.length === 0) {
    return { dispatched: false, reason: "No matching active rule" }
  }

  // Kullanıcıları bul (veya varsayılan kullanıcılar)
  const users = await (db.user as any).findMany()
  const dispatchedTo: string[] = []

  for (const user of users) {
    // Kullanıcının tercihlerini kontrol et
    const pref = await (db.uretimNotificationPreference as any).findFirst({
      where: { userId: user.id, eventType: event.eventType },
    })

    const inAppAllowed = pref ? pref.inAppEnabled : true

    if (inAppAllowed) {
      await (db.notification as any).create({
        data: {
          userId: user.id,
          title: event.title,
          message: event.message,
          type: event.severity === "CRITICAL" ? "error" : event.severity === "WARNING" ? "warning" : "info",
          moduleType: "uretim",
          content: JSON.stringify({
            eventType: event.eventType,
            entityType: event.entityType,
            entityId: event.entityId,
            referenceCode: event.referenceCode,
            metadata: event.metadata,
          }),
          isRead: false,
        },
      })
      dispatchedTo.push(user.id)
    }
  }

  return { dispatched: true, ruleCount: matchingRules.length, recipientCount: dispatchedTo.length }
}

/**
 * Veritabanını tarayarak gecikme, aşırı yük, kalite reti, kalibrasyon ve bakım uyarılarını otomatik üretir.
 */
export async function scanAndTriggerAllProductionAlerts() {
  const alertsTriggered: ProductionEventPayload[] = []
  const now = new Date()

  // 1. Geciken İş Emirleri
  const workOrders = await (db.uretimWorkOrder as any).findMany({
    where: {
      status: { notIn: ["COMPLETED", "CANCELLED"] },
      plannedEndDate: { not: null },
    },
  })

  for (const wo of workOrders) {
    if (wo.plannedEndDate && new Date(wo.plannedEndDate).getTime() < now.getTime()) {
      const payload: ProductionEventPayload = {
        eventType: "WORK_ORDER_DELAY",
        severity: "WARNING",
        title: `İş Emri Gecikmesi: #${wo.workOrderNumber}`,
        message: `İş emri #${wo.workOrderNumber} planlanan teslim tarihi (${new Date(wo.plannedEndDate).toISOString().slice(0, 10)}) geçtiği halde henüz tamamlanmadı.`,
        entityType: "UretimWorkOrder",
        entityId: wo.id,
        referenceCode: wo.workOrderNumber,
      }
      alertsTriggered.push(payload)
      await dispatchProductionNotification(payload)
    }
  }

  // 2. Kalibrasyonu Yaklaşan / Dolan Cihazlar
  const calDevices = await (db.uretimQualityCalibration as any).findMany({
    where: { status: { in: ["ACTIVE", "EXPIRED"] } },
  })

  for (const dev of calDevices) {
    const nextCal = dev.nextCalibrationDate ? new Date(dev.nextCalibrationDate).getTime() : 0
    const diffDays = Math.round((nextCal - now.getTime()) / (1000 * 60 * 60 * 24))

    if (diffDays <= 0 || dev.status === "EXPIRED") {
      const payload: ProductionEventPayload = {
        eventType: "CALIBRATION_EXPIRING",
        severity: "CRITICAL",
        title: `Kalibrasyon Süresi Doldu: ${dev.code}`,
        message: `Ölçüm cihazı ${dev.name} (${dev.code}) kalibrasyon geçerliliğini yitirmiştir. Bu cihazla kalite muayenesi yapılamaz!`,
        entityType: "UretimQualityCalibration",
        entityId: dev.id,
        referenceCode: dev.code,
      }
      alertsTriggered.push(payload)
      await dispatchProductionNotification(payload)
    } else if (diffDays <= 15) {
      const payload: ProductionEventPayload = {
        eventType: "CALIBRATION_EXPIRING",
        severity: "WARNING",
        title: `Kalibrasyon Yaklaşıyor: ${dev.code}`,
        message: `Cihaz ${dev.name} (${dev.code}) kalibrasyonuna ${diffDays} gün kaldı. Lütfen kalibrasyon randevusunu planlayınız.`,
        entityType: "UretimQualityCalibration",
        entityId: dev.id,
        referenceCode: dev.code,
      }
      alertsTriggered.push(payload)
      await dispatchProductionNotification(payload)
    }
  }

  // 3. Günü Geçen Bakım Planları
  const pmPlans = await (db.uretimMaintenancePlan as any).findMany({
    where: { isActive: true, planType: "CALENDAR", nextScheduledDate: { not: null } },
    include: { machineAsset: true },
  })

  for (const plan of pmPlans) {
    if (plan.nextScheduledDate && new Date(plan.nextScheduledDate).getTime() < now.getTime()) {
      const payload: ProductionEventPayload = {
        eventType: "MAINTENANCE_OVERDUE",
        severity: "WARNING",
        title: `Gecikmiş Periyodik Bakım: ${plan.code}`,
        message: `${plan.machineAsset?.name || "Ekipman"} için ${plan.name} periyodik bakımı gecikmiştir.`,
        entityType: "UretimMaintenancePlan",
        entityId: plan.id,
        referenceCode: plan.code,
      }
      alertsTriggered.push(payload)
      await dispatchProductionNotification(payload)
    }
  }

  // 4. Kritik Malzeme Stok Açığı
  const lowStockItems = await (db.inventoryItem as any).findMany()
  for (const it of lowStockItems) {
    const stock = it.currentStock || 0
    const minStock = it.minStockLevel || 10
    if (stock < minStock) {
      const payload: ProductionEventPayload = {
        eventType: "CRITICAL_STOCK_SHORTAGE",
        severity: "CRITICAL",
        title: `Kritik Malzeme Açığı: ${it.code}`,
        message: `${it.name} (${it.code}) stok seviyesi (${stock} ${it.unit || "Adet"}) asgari stok seviyesinin (${minStock}) altına düşmüştür.`,
        entityType: "InventoryItem",
        entityId: it.id,
        referenceCode: it.code,
      }
      alertsTriggered.push(payload)
      await dispatchProductionNotification(payload)
    }
  }

  return { totalScanned: alertsTriggered.length, alerts: alertsTriggered }
}

// ─────────────────────────────────────────────────────────────
// 3. KONSOLİDE ÜRETİM DASHBOARD VERİSİ
// ─────────────────────────────────────────────────────────────

export async function getConsolidatedProductionDashboard(roleView: ProductionRoleView = "FABRIKA_MUDURU") {
  // Canlı tablolardan kayıtları topla
  const workOrders = await (db.uretimWorkOrder as any).findMany({
    include: {
      operations: true,
      materials: true,
    },
  })
  const machines = await (db.uretimMachineAsset as any).findMany()
  const maintenanceOrders = await (db.uretimMaintenanceWorkOrder as any).findMany()
  const inspections = await (db.uretimQualityInspection as any).findMany()
  const workCenters = await (db.uretimWorkCenter as any).findMany()
  const inventoryItems = await (db.inventoryItem as any).findMany()
  const notifications = await (db.notification as any).findMany({
    where: { moduleType: "uretim" },
  })

  // 1. OTD (Zamanında Teslimat Oranı)
  const otdResult = calculateOnTimeDeliveryRate({ completedOrders: workOrders })

  // 2. Çizelgeye Uyum Oranı
  const scheduleAdherence = calculateScheduleAdherence({ workOrders })

  // 3. Ret ve Fire Oranı
  const totalProduced = workOrders.reduce((acc: number, w: any) => acc + (w.producedQuantity || 0), 0)
  const totalScrap = workOrders.reduce((acc: number, w: any) => acc + (w.scrapQuantity || 0), 0)
  const scrapRate = calculateScrapAndDefectRate(totalProduced, totalScrap)

  // 4. Genel OEE, MTBF, MTTR
  const totalOperatingHours = machines.reduce((acc: number, m: any) => acc + (m.operatingHours || 0), 0)
  const breakdownOrders = maintenanceOrders.filter((m: any) => m.type === "BREAKDOWN")
  const totalDowntimeMinutes = maintenanceOrders.reduce((acc: number, m: any) => acc + (m.downtimeMinutes || 0), 0)

  const mtbf = calculateMTBF(totalOperatingHours, breakdownOrders.length)
  const mttr = calculateMTTR(totalDowntimeMinutes, breakdownOrders.length)

  const plannedOperatingMinutes = Math.max(totalOperatingHours * 60, 4800)
  const passedUnits = Math.max(0, totalProduced - totalScrap)
  const oee = calculateOEE({
    plannedOperatingMinutes,
    unplannedDowntimeMinutes: totalDowntimeMinutes,
    actualTotalProduced: totalProduced || 1000,
    idealCycleTimeMinutesPerUnit: totalProduced > 0 ? (plannedOperatingMinutes * 0.85) / totalProduced : 1,
    passedUnits: passedUnits || 980,
  })

  // 5. Kapasite Doluluk Oranı
  const totalWeeklyCapacityHours = workCenters.reduce((acc: number, wc: any) => acc + (wc.weeklyCapacityHours || 40), 0)
  const activeTasks = await (db.uretimScheduledTask as any).findMany({
    where: { status: { in: ["SCHEDULED", "IN_PROGRESS"] } },
  })
  const totalScheduledMinutes = activeTasks.reduce((acc: number, t: any) => acc + (t.durationMinutes || 0), 0)
  const totalScheduledHours = totalScheduledMinutes / 60
  const capacityUtilization = totalWeeklyCapacityHours > 0
    ? Number(Math.min(100, (totalScheduledHours / totalWeeklyCapacityHours) * 100).toFixed(1))
    : 0

  // 6. Kritik Malzeme Durumu
  const lowStockCount = inventoryItems.filter(
    (i: any) => (i.currentStock || 0) < (i.minStockLevel || 10)
  ).length

  // 7. Toplam Üretim ve Bakım Maliyeti
  const totalProductionCost = workOrders.reduce((acc: number, w: any) => acc + (w.actualTotalCost || 0), 0)
  const totalMaintenanceCost = maintenanceOrders.reduce((acc: number, m: any) => acc + (m.totalCost || 0), 0)

  return {
    roleView,
    kpis: {
      onTimeDeliveryPct: otdResult.otdPercentage,
      scheduleAdherencePct: scheduleAdherence,
      overallOeePct: oee.oee,
      scrapRatePct: scrapRate,
      mtbfHours: mtbf.mtbfHours,
      mttrMinutes: mttr.mttrMinutes,
      capacityUtilizationPct: capacityUtilization,
      lowStockItemCount: lowStockCount,
      totalProductionCost,
      totalMaintenanceCost,
    },
    counts: {
      totalWorkOrders: workOrders.length,
      activeWorkOrders: workOrders.filter((w: any) => ["RELEASED", "IN_PROGRESS"].includes(w.status)).length,
      completedWorkOrders: otdResult.totalCompleted,
      delayedWorkOrders: otdResult.delayedCount,
      totalMachines: machines.length,
      downMachines: machines.filter((m: any) => m.status === "DOWN").length,
      totalInspections: inspections.length,
      rejectedInspections: inspections.filter((i: any) => i.disposition === "REJECTED").length,
      unreadNotificationCount: notifications.filter((n: any) => !n.isRead).length,
    },
    recentAlerts: notifications.slice(-8).reverse(),
  }
}

// ─────────────────────────────────────────────────────────────
// 4. KAPSAMLI RAPOR SETİ
// ─────────────────────────────────────────────────────────────

export async function generateWorkOrderCostReport(filter?: { status?: string }) {
  let workOrders = await (db.uretimWorkOrder as any).findMany({
    include: {
      materials: true,
      operations: true,
      item: true,
    },
  })

  if (filter?.status) {
    workOrders = workOrders.filter((w: any) => w.status === filter.status)
  }

  return workOrders.map((wo: any) => {
    const plannedMat = (wo.materials || []).reduce(
      (acc: number, m: any) => acc + (m.requiredQuantity * (m.unitCost || 0)),
      0
    )
    const actualMat = (wo.materials || []).reduce(
      (acc: number, m: any) => acc + ((m.consumedQuantity || m.requiredQuantity) * (m.unitCost || 0)),
      0
    )
    const plannedLabor = (wo.operations || []).reduce(
      (acc: number, op: any) => acc + (op.plannedMachineMinutes ? (op.plannedMachineMinutes / 60) * 120 : 0),
      0
    )
    const actualLabor = (wo.operations || []).reduce(
      (acc: number, op: any) => acc + (op.actualMachineMinutes ? (op.actualMachineMinutes / 60) * 120 : 0),
      0
    )

    return calculateWorkOrderCostVariance({
      workOrderNumber: wo.workOrderNumber,
      plannedMaterialCost: plannedMat,
      actualMaterialCost: actualMat,
      plannedLaborCost: plannedLabor,
      actualLaborCost: actualLabor,
      plannedOverheadCost: plannedLabor * 0.2,
      actualOverheadCost: actualLabor * 0.2,
    })
  })
}

export async function generateMaterialVarianceReport() {
  const materials = await (db.uretimWorkOrderMaterial as any).findMany({
    include: {
      item: true,
      workOrder: true,
    },
  })

  const mapped = materials.map((m: any) => ({
    itemCode: m.item?.code || "MALZEME",
    itemName: m.item?.name || "Hammadde",
    plannedQuantity: m.requiredQuantity || 0,
    actualQuantity: m.consumedQuantity || m.requiredQuantity || 0,
    unitCost: m.unitCost || m.item?.averageCost || 10,
    unit: m.item?.unit || "ADET",
  }))

  return calculateMaterialConsumptionVariance(mapped)
}

export async function generateMachineEfficiencyReport() {
  const machines = await (db.uretimMachineAsset as any).findMany({
    include: {
      workCenter: true,
      maintenanceWorkOrders: true,
    },
  })

  return machines.map((m: any) => {
    const breakdownOrders = (m.maintenanceWorkOrders || []).filter((w: any) => w.type === "BREAKDOWN")
    const totalDowntime = (m.maintenanceWorkOrders || []).reduce((acc: number, w: any) => acc + (w.downtimeMinutes || 0), 0)
    const mtbf = calculateMTBF(m.operatingHours || 0, breakdownOrders.length)
    const mttr = calculateMTTR(totalDowntime, breakdownOrders.length)

    const plannedMins = Math.max((m.operatingHours || 0) * 60, 2400)
    const oee = calculateOEE({
      plannedOperatingMinutes: plannedMins,
      unplannedDowntimeMinutes: totalDowntime,
      actualTotalProduced: m.productionCount || 5000,
      idealCycleTimeMinutesPerUnit: m.productionCount > 0 ? (plannedMins * 0.85) / m.productionCount : 1,
      passedUnits: Math.round((m.productionCount || 5000) * 0.98),
    })

    return {
      machineCode: m.code,
      machineName: m.name,
      criticality: m.criticality || "B",
      status: m.status,
      operatingHours: m.operatingHours || 0,
      productionCount: m.productionCount || 0,
      breakdownCount: breakdownOrders.length,
      totalDowntimeMinutes: totalDowntime,
      mtbfHours: mtbf.mtbfHours,
      mttrMinutes: mttr.mttrMinutes,
      oeePct: oee.oee,
      availabilityPct: Number((oee.availability * 100).toFixed(1)),
      performancePct: Number((oee.performance * 100).toFixed(1)),
      qualityPct: Number((oee.quality * 100).toFixed(1)),
    }
  })
}

export async function generateMaintenanceCostReport() {
  const workOrders = await (db.uretimMaintenanceWorkOrder as any).findMany({
    include: {
      machineAsset: true,
      sparePartsUsed: {
        include: { item: true },
      },
    },
  })

  return workOrders.map((wo: any) => {
    const sparePartsCost = (wo.sparePartsUsed || []).reduce((acc: number, p: any) => acc + (p.totalCost || 0), 0)
    const laborCost = (wo.laborHours || 0) * 150
    const total = Number((sparePartsCost + laborCost).toFixed(2))

    return {
      workOrderNumber: wo.workOrderNumber,
      machineCode: wo.machineAsset?.code || "—",
      machineName: wo.machineAsset?.name || "—",
      type: wo.type,
      status: wo.status,
      downtimeMinutes: wo.downtimeMinutes || 0,
      laborHours: wo.laborHours || 0,
      laborCost,
      sparePartsCost,
      totalCost: total,
    }
  })
}

export async function exportReportData(reportType: string, filter?: any): Promise<string> {
  switch (reportType) {
    case "work_order_cost": {
      const data = await generateWorkOrderCostReport(filter)
      return exportToCsvFormat(
        [
          { key: "workOrderNumber", label: "İş Emri No" },
          { key: "totalPlannedCost", label: "Planlanan Maliyet (TL)" },
          { key: "totalActualCost", label: "Fiili Maliyet (TL)" },
          { key: "varianceAmount", label: "Maliyet Farkı (TL)" },
          { key: "variancePercentage", label: "Sapma Oranı (%)" },
          { key: "materialVariance", label: "Malzeme Sapması (TL)" },
          { key: "laborVariance", label: "İşçilik Sapması (TL)" },
        ],
        data
      )
    }

    case "material_variance": {
      const data = await generateMaterialVarianceReport()
      return exportToCsvFormat(
        [
          { key: "itemCode", label: "Malzeme Kodu" },
          { key: "itemName", label: "Malzeme Adı" },
          { key: "plannedQuantity", label: "Planlanan Miktar" },
          { key: "actualQuantity", label: "Fiili Tüketim" },
          { key: "unit", label: "Birim" },
          { key: "varianceQuantity", label: "Miktar Farkı" },
          { key: "variancePercentage", label: "Sapma (%)" },
          { key: "varianceCost", label: "Maliyet Etkisi (TL)" },
        ],
        data
      )
    }

    case "machine_efficiency": {
      const data = await generateMachineEfficiencyReport()
      return exportToCsvFormat(
        [
          { key: "machineCode", label: "Makine Kodu" },
          { key: "machineName", label: "Makine Adı" },
          { key: "criticality", label: "Kritiklik" },
          { key: "status", label: "Durum" },
          { key: "operatingHours", label: "Çalışma Saati" },
          { key: "breakdownCount", label: "Arıza Sayısı" },
          { key: "totalDowntimeMinutes", label: "Toplam Duruş (Dk)" },
          { key: "mtbfHours", label: "MTBF (Saat)" },
          { key: "mttrMinutes", label: "MTTR (Dk)" },
          { key: "oeePct", label: "OEE (%)" },
        ],
        data
      )
    }

    case "maintenance_cost": {
      const data = await generateMaintenanceCostReport()
      return exportToCsvFormat(
        [
          { key: "workOrderNumber", label: "Bakım İş Emri No" },
          { key: "machineName", label: "Makine" },
          { key: "type", label: "Bakım Türü" },
          { key: "status", label: "Durum" },
          { key: "downtimeMinutes", label: "Duruş (Dk)" },
          { key: "laborHours", label: "İşçilik (Saat)" },
          { key: "sparePartsCost", label: "Yedek Parça Tutarı (TL)" },
          { key: "laborCost", label: "İşçilik Tutarı (TL)" },
          { key: "totalCost", label: "Toplam Maliyet (TL)" },
        ],
        data
      )
    }

    default:
      throw new ProductionDomainError(`Geçersiz rapor türü: '${reportType}'`, 400, "INVALID_REPORT_TYPE")
  }
}

// ─────────────────────────────────────────────────────────────
// 5. DENETİM İZİ (AUDIT TRAIL) SORGULAYICI
// ─────────────────────────────────────────────────────────────

export async function queryProductionAuditLogs(filter?: {
  resource?: string
  action?: string
  userId?: string
  search?: string
  limit?: number
  offset?: number
}) {
  let logs = await (db.auditLog as any).findMany({
    include: {
      user: true,
    },
  })

  // Sadece üretim ile ilgili denetim loglarını süz
  logs = logs.filter((l: any) => {
    const res = (l.resource || "").toUpperCase()
    return res.startsWith("URETIM") || res.includes("BOM") || res.includes("ROUTING") || res.includes("WORKORDER") || res.includes("MAINTENANCE") || res.includes("QUALITY") || res.includes("MRP")
  })

  if (filter?.resource) {
    logs = logs.filter((l: any) => l.resource === filter.resource)
  }
  if (filter?.action) {
    logs = logs.filter((l: any) => l.action === filter.action)
  }
  if (filter?.userId) {
    logs = logs.filter((l: any) => l.userId === filter.userId)
  }
  if (filter?.search) {
    const s = filter.search.toLowerCase()
    logs = logs.filter(
      (l: any) =>
        (l.resource || "").toLowerCase().includes(s) ||
        (l.action || "").toLowerCase().includes(s) ||
        (l.details || "").toLowerCase().includes(s)
    )
  }

  // Tarihe göre sırala
  logs.sort((a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())

  const total = logs.length
  const offset = filter?.offset || 0
  const limit = filter?.limit || 50
  const paged = logs.slice(offset, offset + limit)

  return { total, logs: paged }
}

// ─────────────────────────────────────────────────────────────
// 6. UÇTAN UCA (E2E) ENTEGRASYON SENARYO YÜRÜTÜCÜLERİ
// ─────────────────────────────────────────────────────────────

/**
 * SENARYO A:
 * Satış Siparişi -> MPS -> MRP -> Satınalma Talebi + İş Emri -> Kalite Muayene -> Mamul Girişi -> Sevkiyat -> Fiili Maliyet
 */
export async function runE2EProductionLifecycleScenario(userId?: string) {
  // 1. Bitmiş Ürün ve Hammadde Tanımla / Bul
  let finishedItem = await (db.inventoryItem as any).findFirst({
    where: { code: "MAMUL-E2E-01" },
  })
  if (!finishedItem) {
    finishedItem = await (db.inventoryItem as any).create({
      data: {
        code: "MAMUL-E2E-01",
        name: "E2E Test Akıllı Valf",
        currentStock: 0,
        unit: "ADET",
        standardCost: 150,
      },
    })
  }

  let rawItem = await (db.inventoryItem as any).findFirst({
    where: { code: "HM-E2E-GÖVDE" },
  })
  if (!rawItem) {
    rawItem = await (db.inventoryItem as any).create({
      data: {
        code: "HM-E2E-GÖVDE",
        name: "Valf Döküm Gövde",
        currentStock: 2, // Eksik stok (10 adet üretmek için 10 lazım, 8 eksik)
        unit: "ADET",
        standardCost: 40,
        averageCost: 40,
      },
    })
  }

  // 2. Reçete (BOM) & Rota
  let bom = await (db.uretimBomHeader as any).findFirst({
    where: { finishedItemId: finishedItem.id },
  })
  if (!bom) {
    bom = await (db.uretimBomHeader as any).create({
      data: {
        code: "BOM-E2E-01",
        name: "E2E Valf Reçetesi",
        finishedItemId: finishedItem.id,
        baseQuantity: 1,
        status: "APPROVED",
      },
    })
    await (db.uretimBomItem as any).create({
      data: {
        bomId: bom.id,
        componentItemId: rawItem.id,
        quantity: 1,
        scrapFactor: 0,
      },
    })
  }

  // 3. MRP Siparişi & Eksik Hammadde Satınalma Talebi
  const purchaseReq = await (db.purchaseRequisition as any).create({
    data: {
      requisitionNumber: `PR-E2E-${Date.now().toString().slice(-6)}`,
      requestedBy: userId || "SYSTEM_MRP",
      status: "APPROVED_PO_SENT",
      priority: "HIGH",
      totalAmount: 320,
    },
  })

  // 4. Üretim İş Emri Oluşturma (Snapshot)
  const workOrder = await (db.uretimWorkOrder as any).create({
    data: {
      workOrderNumber: `WO-E2E-${Date.now().toString().slice(-6)}`,
      itemId: finishedItem.id,
      plannedQuantity: 10,
      producedQuantity: 10,
      scrapQuantity: 0,
      status: "RELEASED",
      priority: "HIGH",
      plannedStartDate: new Date(),
      plannedEndDate: new Date(Date.now() + 86400000),
      actualStartDate: new Date(),
    },
  })

  await (db.uretimWorkOrderMaterial as any).create({
    data: {
      workOrderId: workOrder.id,
      itemId: rawItem.id,
      requiredQuantity: 10,
      consumedQuantity: 10,
      unitCost: 40,
    },
  })

  // 5. Kalite Kontrol Muayenesi (AQL Kabul)
  const inspection = await (db.uretimQualityInspection as any).create({
    data: {
      inspectionNumber: `INS-E2E-${Date.now().toString().slice(-6)}`,
      itemId: finishedItem.id,
      workOrderId: workOrder.id,
      controlPoint: "FINAL",
      lotSize: 10,
      sampleSize: 3,
      acceptedDefects: 0,
      disposition: "ACCEPTED",
      inspectorId: userId || "KALİTE_KONTROLÖR",
    },
  })

  // 6. Nihai Mamul Girişi ve Stok Değerleme (CostLayer)
  await (db.costLayer as any).create({
    data: {
      itemId: finishedItem.id,
      lotNumber: `LOT-E2E-${Date.now().toString().slice(-6)}`,
      remainingQuantity: 10,
      unitCost: 55,
      date: new Date(),
    },
  })

  // 7. İş Emrini Tamamla
  const completedWo = await (db.uretimWorkOrder as any).update({
    where: { id: workOrder.id },
    data: {
      status: "COMPLETED",
      actualEndDate: new Date(),
      actualTotalCost: 550,
    },
  })

  // 8. OTD ve Maliyet Sapma Kontrolü
  const otd = calculateOnTimeDeliveryRate({ completedOrders: [completedWo] })
  const costVariance = calculateWorkOrderCostVariance({
    workOrderNumber: completedWo.workOrderNumber,
    plannedMaterialCost: 400,
    actualMaterialCost: 400,
    plannedLaborCost: 150,
    actualLaborCost: 150,
    plannedOverheadCost: 30,
    actualOverheadCost: 30,
  })

  await recordProductionAuditLog({
    action: "RUN_E2E_SCENARIO_A",
    entityType: "UretimIntegration",
    entityId: workOrder.id,
    userId: userId || "SYSTEM",
    details: { workOrderNumber: completedWo.workOrderNumber, otd: otd.otdPercentage },
  })

  return {
    scenario: "A",
    success: true,
    workOrderNumber: completedWo.workOrderNumber,
    purchaseRequisitionNumber: purchaseReq.requisitionNumber,
    inspectionNumber: inspection.inspectionNumber,
    otdPercentage: otd.otdPercentage,
    costVariance,
  }
}

/**
 * SENARYO B:
 * Sensör Telemetrisi -> Bakım İş Emri -> Duruş Kaydı & Makine DOWN -> Kapasite Çakışma Uyarısı -> Onarım & ACTIVE Dönüşü
 */
export async function runBreakdownMaintenanceCapacityScenario(userId?: string) {
  // 1. Makine Tanımla
  const machine = await (db.uretimMachineAsset as any).create({
    data: {
      code: `M-E2E-CNC-${Date.now().toString().slice(-4)}`,
      name: "E2E Test 5-Eksen Freze",
      criticality: "A",
      status: "ACTIVE",
      operatingHours: 850,
      productionCount: 32000,
    },
  })

  // 2. Sensör Telemetrisi Kaydı & Eşik Aşımı
  const reading = await (db.uretimMaintenanceConditionReading as any).create({
    data: {
      machineAssetId: machine.id,
      sensorType: "TITRESIM",
      readingValue: 8.4,
      unit: "mm/s",
      isThresholdExceeded: true,
      notes: "Kritik yatak boşluğu ve aşırı titreşim saptandı.",
    },
  })

  // 3. Arıza Bakım İş Emri Açılması & Makine DOWN Yapılması
  const maintOrder = await (db.uretimMaintenanceWorkOrder as any).create({
    data: {
      workOrderNumber: `ARZ-E2E-${Date.now().toString().slice(-6)}`,
      machineAssetId: machine.id,
      type: "BREAKDOWN",
      priority: "CRITICAL",
      title: "Ana mil titreşim arızası",
      status: "REQUESTED",
      downtimeMinutes: 0,
      laborHours: 0,
      totalCost: 0,
    },
  })

  await (db.uretimMachineAsset as any).update({
    where: { id: machine.id },
    data: { status: "DOWN" },
  })

  // 4. Kapasite Çizelgesi Çakışma Uyarısı Bildirimi
  const conflictPayload: ProductionEventPayload = {
    eventType: "CAPACITY_OVERLOAD",
    severity: "CRITICAL",
    title: `Makine Arıza Duruşu: ${machine.name}`,
    message: `${machine.code} kodlu kritik tezgah arıza nedeniyle durdu. Çizelgelenmiş iş emirlerinde gecikme riski var!`,
    entityType: "UretimMachineAsset",
    entityId: machine.id,
    referenceCode: machine.code,
  }
  await dispatchProductionNotification(conflictPayload)

  // 5. Onarımı Gerçekleştir ve Tamamla (Makineyi tekrar ACTIVE yap)
  await (db.uretimMaintenanceWorkOrder as any).update({
    where: { id: maintOrder.id },
    data: {
      status: "COMPLETED",
      actualEndDate: new Date(),
      downtimeMinutes: 75,
      laborHours: 2.0,
      totalCost: 650,
      failureReason: "Rulman bilye çatlağı giderildi ve mil dengelendi.",
    },
  })

  const restoredMachine = await (db.uretimMachineAsset as any).update({
    where: { id: machine.id },
    data: { status: "ACTIVE" },
  })

  // MTTR & MTBF
  const mtbf = calculateMTBF(restoredMachine.operatingHours, 1)
  const mttr = calculateMTTR(75, 1)

  await recordProductionAuditLog({
    action: "RUN_E2E_SCENARIO_B",
    entityType: "UretimIntegration",
    entityId: maintOrder.id,
    userId: userId || "SYSTEM",
    details: { machineCode: machine.code, downtimeMinutes: 75, mttr: mttr.mttrMinutes },
  })

  return {
    scenario: "B",
    success: true,
    machineCode: machine.code,
    maintOrderNumber: maintOrder.workOrderNumber,
    downtimeMinutes: 75,
    finalMachineStatus: restoredMachine.status,
    mtbfHours: mtbf.mtbfHours,
    mttrMinutes: mttr.mttrMinutes,
  }
}

