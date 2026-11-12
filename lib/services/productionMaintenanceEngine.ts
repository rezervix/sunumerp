/**
 * Sunum ERP — Üretim Ekipman & Bakım Yönetimi (CMMS & Kestirimci Bakım) Motoru
 *
 * Saf İş Mantığı ve Matematiksel Hesaplamalar:
 * 1. Ekipman Hiyerarşisi ve Döngüsel Bağımlılık (Cycle) Kontrolü
 * 2. Ekipman Kritiklik Sınıflandırması (A / B / C) & Risk Analizi
 * 3. MTBF (Arızalar Arası Ortalama Süre) & MTTR (Ortalama Onarım Süresi)
 * 4. OEE (Kullanılabilirlik x Performans x Kalite) Hesaplama Motoru
 * 5. Periyodik Bakım Tetikleme Kuralları (Takvim, Çalışma Saati, Üretim Adedi)
 * 6. Kestirimci Bakım (PdM) Sensör Telemetrisi & Eşik Değer Kontrolü
 * 7. Bakım İş Emri Yaşam Döngüsü Durum Makinesi (State Machine)
 * 8. Yedek Parça BOM, Tüketim Doğrulama ve Satınalma Talebi Tetikleme
 * 9. Kapasite Çizelgeleme Bakım Çakışması (Conflict) Analizi
 * 10. Bakım Maliyeti Dağılımı ve Bütçe Sapma Analizi
 */

import { ProductionDomainError } from "./productionDomainError"

// ─────────────────────────────────────────────────────────────
// 1. TİPLER VE ENUM'LAR
// ─────────────────────────────────────────────────────────────

export type MachineCriticality = "A" | "B" | "C"

export type MaintenancePlanType = "CALENDAR" | "METER_HOURS" | "METER_COUNT" | "CONDITION"

export type MaintenanceWorkOrderType = "PREVENTIVE" | "BREAKDOWN" | "CORRECTIVE" | "IMPROVEMENT"

export type MaintenanceWorkOrderStatus = 
  | "REQUESTED"
  | "EVALUATED"
  | "SCHEDULED"
  | "IN_PROGRESS"
  | "COMPLETED"
  | "CANCELLED"

export type MaintenancePriority = "LOW" | "MEDIUM" | "HIGH" | "CRITICAL"

export type MaintenanceChecklistType = "CHECKBOX" | "NUMERIC" | "TEXT"

export type ConditionOperator = ">" | ">=" | "<" | "<=" | "=" | "!="

export interface HierarchyNode {
  id: string
  code: string
  name: string
  parentAssetId?: string | null
  criticality: MachineCriticality
  category?: string | null
  children: HierarchyNode[]
}

export interface OEECalculationInput {
  plannedOperatingMinutes: number
  unplannedDowntimeMinutes: number
  actualTotalProduced: number
  idealCycleTimeMinutesPerUnit: number
  passedUnits: number
}

export interface OEECalculationResult {
  availability: number // 0 - 1 arası
  performance: number  // 0 - 1 arası
  quality: number      // 0 - 1 arası
  oee: number          // 0 - 100 arası yüzde
  operatingMinutes: number
  runMinutes: number
}

export interface MTBFCalculationResult {
  operatingHours: number
  breakdownCount: number
  mtbfHours: number
}

export interface MTTRCalculationResult {
  totalDowntimeMinutes: number
  breakdownCount: number
  mttrMinutes: number
}

export interface CapacityConflictInput {
  maintenanceWindow: {
    workOrderId?: string
    machineAssetId: string
    workCenterId?: string | null
    plannedStart: Date | string
    plannedEnd: Date | string
  }
  scheduledTasks: Array<{
    id: string
    workOrderId: string
    workOrderNumber?: string
    workCenterId: string
    machineAssetId?: string | null
    plannedStart: Date | string
    plannedEnd: Date | string
    status: string
  }>
}

export interface CapacityConflictAlert {
  workOrderId?: string
  machineAssetId: string
  workCenterId: string
  conflictingTaskId: string
  conflictingWorkOrderNumber?: string
  conflictStartTime: string
  conflictEndTime: string
  message: string
}

export interface SparePartProcurementCheck {
  sparePartId: string
  itemId: string
  itemCode: string
  itemName: string
  requiredQuantity: number
  availableStock: number
  missingQuantity: number
  needsProcurement: boolean
  suggestedRequisitionDate: string
}

// ─────────────────────────────────────────────────────────────
// 2. EKİPMAN HİYERARŞİSİ VE DÖNGÜ KONTROLÜ
// ─────────────────────────────────────────────────────────────

/**
 * Ekipman ağacı oluştururken döngüsel ebeveyn bağımlılığını (cyclic reference) tespit eder.
 */
export function validateNoCircularAssetHierarchy(
  assetId: string,
  targetParentId: string | null | undefined,
  allAssets: Array<{ id: string; parentAssetId?: string | null }>
): void {
  if (!targetParentId) return
  if (assetId === targetParentId) {
    throw new ProductionDomainError(
      "Bir ekipman kendi kendisinin üst varlığı (parent) olamaz.",
      400,
      "INVALID_EQUIPMENT_HIERARCHY"
    )
  }

  const visited = new Set<string>([assetId])
  let currentParentId: string | null | undefined = targetParentId

  while (currentParentId) {
    if (visited.has(currentParentId)) {
      throw new ProductionDomainError(
        "Ekipman hiyerarşisinde döngüsel bağımlılık (circular loop) saptandı.",
        400,
        "CIRCULAR_EQUIPMENT_HIERARCHY"
      )
    }
    visited.add(currentParentId)
    const parentObj = allAssets.find((a) => a.id === currentParentId)
    currentParentId = parentObj?.parentAssetId
  }
}

/**
 * Düz ekipman listesinden iç içe geçmiş ağaç (tree) hiyerarşisi oluşturur.
 */
export function buildEquipmentHierarchyTree(
  assets: Array<{
    id: string
    code: string
    name: string
    parentAssetId?: string | null
    criticality?: string | null
    category?: string | null
  }>
): HierarchyNode[] {
  const nodeMap = new Map<string, HierarchyNode>()
  const rootNodes: HierarchyNode[] = []

  // İlk tur: Tüm düğümleri oluştur
  for (const asset of assets) {
    nodeMap.set(asset.id, {
      id: asset.id,
      code: asset.code,
      name: asset.name,
      parentAssetId: asset.parentAssetId ?? null,
      criticality: (asset.criticality as MachineCriticality) || "B",
      category: asset.category ?? null,
      children: []
    })
  }

  // İkinci tur: Ebeveyn-çocuk ilişkilerini kur
  for (const asset of assets) {
    const node = nodeMap.get(asset.id)!
    if (asset.parentAssetId && nodeMap.has(asset.parentAssetId)) {
      nodeMap.get(asset.parentAssetId)!.children.push(node)
    } else {
      rootNodes.push(node)
    }
  }

  return rootNodes
}

// ─────────────────────────────────────────────────────────────
// 3. MTBF, MTTR VE OEE HESAPLAMA MOTORU
// ─────────────────────────────────────────────────────────────

/**
 * MTBF (Mean Time Between Failures - Arızalar Arası Ortalama Çalışma Süresi)
 * Formül: Toplam Çalışma Saati / Maksimum(1, Arıza Sayısı)
 */
export function calculateMTBF(
  operatingHours: number,
  breakdownCount: number
): MTBFCalculationResult {
  const safeOperating = Math.max(0, operatingHours || 0)
  const safeBreakdowns = Math.max(0, breakdownCount || 0)

  // Arıza 0 ise MTBF toplam çalışma saatidir; arıza varsa bölünür
  const mtbfHours = safeBreakdowns > 0 
    ? Number((safeOperating / safeBreakdowns).toFixed(2))
    : Number(safeOperating.toFixed(2))

  return {
    operatingHours: safeOperating,
    breakdownCount: safeBreakdowns,
    mtbfHours
  }
}

/**
 * MTTR (Mean Time To Repair - Ortalama Onarım / Duruş Süresi)
 * Formül: Toplam Arıza Duruş Dakikası / Maksimum(1, Arıza Sayısı)
 */
export function calculateMTTR(
  totalDowntimeMinutes: number,
  breakdownCount: number
): MTTRCalculationResult {
  const safeDowntime = Math.max(0, totalDowntimeMinutes || 0)
  const safeBreakdowns = Math.max(0, breakdownCount || 0)

  const mttrMinutes = safeBreakdowns > 0
    ? Number((safeDowntime / safeBreakdowns).toFixed(2))
    : 0

  return {
    totalDowntimeMinutes: safeDowntime,
    breakdownCount: safeBreakdowns,
    mttrMinutes
  }
}

/**
 * OEE (Overall Equipment Effectiveness - Toplam Ekipman Etkinliği)
 * Formül: Kullanılabilirlik (Availability) x Performans (Performance) x Kalite (Quality)
 */
export function calculateOEE(input: OEECalculationInput): OEECalculationResult {
  const plannedOperating = Math.max(0, input.plannedOperatingMinutes || 0)
  const unplannedDowntime = Math.max(0, input.unplannedDowntimeMinutes || 0)
  const actualProduced = Math.max(0, input.actualTotalProduced || 0)
  const idealCycleTime = Math.max(0, input.idealCycleTimeMinutesPerUnit || 0)
  const passedUnits = Math.max(0, input.passedUnits || 0)

  // 1. Kullanılabilirlik (Availability)
  // Gerçek Çalışma Süresi = Planlanan Süre - Plansız Duruşlar
  const operatingMinutes = Math.max(0, plannedOperating - unplannedDowntime)
  const availability = plannedOperating > 0 
    ? Math.max(0, Math.min(1, operatingMinutes / plannedOperating))
    : 1

  // 2. Performans (Performance)
  // İdeal Üretim Süresi = Üretilen Adet x İdeal Çevrim Süresi
  const idealProductionTime = actualProduced * idealCycleTime
  const performance = operatingMinutes > 0
    ? Math.max(0, Math.min(1, idealProductionTime / operatingMinutes))
    : (actualProduced > 0 ? 1 : 0)

  // 3. Kalite (Quality)
  // Sağlam Ürün Oranı = Sağlam Adet / Toplam Üretilen Adet
  const quality = actualProduced > 0
    ? Math.max(0, Math.min(1, passedUnits / actualProduced))
    : 1

  // OEE % = A x P x Q x 100
  const oee = Number((availability * performance * quality * 100).toFixed(2))

  return {
    availability: Number(availability.toFixed(4)),
    performance: Number(performance.toFixed(4)),
    quality: Number(quality.toFixed(4)),
    oee,
    operatingMinutes,
    runMinutes: idealProductionTime
  }
}

/**
 * Plansız Duruş Oranı (%)
 */
export function calculateDowntimeRate(
  plannedOperatingMinutes: number,
  unplannedDowntimeMinutes: number
): number {
  if (plannedOperatingMinutes <= 0) return 0
  const rate = (unplannedDowntimeMinutes / plannedOperatingMinutes) * 100
  return Number(Math.min(100, Math.max(0, rate)).toFixed(2))
}

// ─────────────────────────────────────────────────────────────
// 4. BAKIM TETİKLEME KURALLARI DEĞERLENDİRİCİSİ
// ─────────────────────────────────────────────────────────────

/**
 * Takvim bazlı periyodik bakım tetiklenmeli mi?
 */
export function isCalendarPMDue(
  nextScheduledDate: Date | string | null | undefined,
  currentDate: Date = new Date()
): boolean {
  if (!nextScheduledDate) return false
  const target = new Date(nextScheduledDate)
  return target.getTime() <= currentDate.getTime()
}

/**
 * Sonraki takvim bakım tarihini periyoda göre hesaplar
 */
export function calculateNextScheduledDate(
  baseDate: Date,
  frequencyDays?: number | null,
  periodUnit?: "DAY" | "WEEK" | "MONTH" | "YEAR"
): Date {
  const next = new Date(baseDate)
  if (frequencyDays && frequencyDays > 0) {
    next.setDate(next.getDate() + frequencyDays)
    return next
  }

  switch (periodUnit) {
    case "WEEK":
      next.setDate(next.getDate() + 7)
      break
    case "MONTH":
      next.setMonth(next.getMonth() + 1)
      break
    case "YEAR":
      next.setFullYear(next.getFullYear() + 1)
      break
    case "DAY":
    default:
      next.setDate(next.getDate() + 30) // Varsayılan 30 gün
      break
  }
  return next
}

/**
 * Sayaç (Çalışma Saati veya Üretilen Adet) bazlı bakım tetiklenmeli mi?
 */
export function isMeterPMDue(params: {
  planType: "METER_HOURS" | "METER_COUNT"
  currentHours: number
  lastTriggeredHours?: number | null
  frequencyHours?: number | null
  currentCount: number
  lastTriggeredCount?: number | null
  frequencyCount?: number | null
}): boolean {
  if (params.planType === "METER_HOURS") {
    const freq = params.frequencyHours || 0
    if (freq <= 0) return false
    const last = params.lastTriggeredHours || 0
    return (params.currentHours - last) >= freq
  }

  if (params.planType === "METER_COUNT") {
    const freq = params.frequencyCount || 0
    if (freq <= 0) return false
    const last = params.lastTriggeredCount || 0
    return (params.currentCount - last) >= freq
  }

  return false
}

/**
 * Kestirimci Bakım: Sensör Telemetrisi Eşik Değer Kontrolü
 */
export function evaluateConditionRule(
  readingValue: number,
  operator: ConditionOperator | string,
  threshold: number
): boolean {
  switch (operator) {
    case ">":
      return readingValue > threshold
    case ">=":
      return readingValue >= threshold
    case "<":
      return readingValue < threshold
    case "<=":
      return readingValue <= threshold
    case "=":
    case "==":
      return Math.abs(readingValue - threshold) < 0.0001
    case "!=":
      return Math.abs(readingValue - threshold) >= 0.0001
    default:
      return false
  }
}

// ─────────────────────────────────────────────────────────────
// 5. İŞ EMRİ DURUM MAKİNESİ (STATE MACHINE)
// ─────────────────────────────────────────────────────────────

const VALID_STATUS_TRANSITIONS: Record<MaintenanceWorkOrderStatus, MaintenanceWorkOrderStatus[]> = {
  REQUESTED: ["EVALUATED", "IN_PROGRESS", "CANCELLED"], // Acil arızalarda doğrudan IN_PROGRESS'e izin verilir
  EVALUATED: ["SCHEDULED", "IN_PROGRESS", "CANCELLED"],
  SCHEDULED: ["IN_PROGRESS", "CANCELLED"],
  IN_PROGRESS: ["COMPLETED", "CANCELLED"],
  COMPLETED: [], // Terminal durum
  CANCELLED: []  // Terminal durum
}

export function validateWorkOrderStatusTransition(
  currentStatus: MaintenanceWorkOrderStatus,
  nextStatus: MaintenanceWorkOrderStatus,
  type?: MaintenanceWorkOrderType
): void {
  if (currentStatus === nextStatus) return

  const allowed = VALID_STATUS_TRANSITIONS[currentStatus] || []
  if (!allowed.includes(nextStatus)) {
    throw new ProductionDomainError(
      `Geçersiz bakım iş emri durum geçişi: '${currentStatus}' -> '${nextStatus}'. İzin verilen durumlar: [${allowed.join(", ")}]`,
      400,
      "INVALID_WORK_ORDER_TRANSITION"
    )
  }

  // İş emri tamamlanırken kontrol listesi veya kapanış zorunlulukları
  if (nextStatus === "COMPLETED") {
    // Tamamlama için ilave iş kuralı kontrolleri çağrılabilir
  }
}

// ─────────────────────────────────────────────────────────────
// 6. KAPASİTE ÇİZELGEYLE BAKIM ÇAKIŞMASI TESPİTİ
// ─────────────────────────────────────────────────────────────

/**
 * Planlanan bakım zaman aralığı ile çizelgelenmiş üretim görevleri arasında çakışma arar.
 */
export function detectMaintenanceCapacityConflicts(
  input: CapacityConflictInput
): CapacityConflictAlert[] {
  const { maintenanceWindow, scheduledTasks } = input
  const alerts: CapacityConflictAlert[] = []

  const pmStart = new Date(maintenanceWindow.plannedStart).getTime()
  const pmEnd = new Date(maintenanceWindow.plannedEnd).getTime()

  if (pmStart >= pmEnd) {
    throw new ProductionDomainError(
      "Planlanan bakım bitiş zamanı başlangıç zamanından sonra olmalıdır.",
      400,
      "INVALID_DATE_RANGE"
    )
  }

  for (const task of scheduledTasks) {
    // Tamamlanmış veya iptal edilmiş görevleri atla
    if (task.status === "COMPLETED" || task.status === "CANCELLED") continue

    // İş merkezi veya makine bazında eşleşme
    const isSameWorkCenter = maintenanceWindow.workCenterId && task.workCenterId === maintenanceWindow.workCenterId
    const isSameMachine = maintenanceWindow.machineAssetId && task.machineAssetId === maintenanceWindow.machineAssetId

    if (isSameWorkCenter || isSameMachine) {
      const taskStart = new Date(task.plannedStart).getTime()
      const taskEnd = new Date(task.plannedEnd).getTime()

      // Zaman kesişimi: (StartA < EndB) && (EndA > StartB)
      const isOverlapping = taskStart < pmEnd && taskEnd > pmStart

      if (isOverlapping) {
        const overlapStart = new Date(Math.max(pmStart, taskStart)).toISOString()
        const overlapEnd = new Date(Math.min(pmEnd, taskEnd)).toISOString()

        alerts.push({
          workOrderId: maintenanceWindow.workOrderId,
          machineAssetId: maintenanceWindow.machineAssetId,
          workCenterId: task.workCenterId,
          conflictingTaskId: task.id,
          conflictingWorkOrderNumber: task.workOrderNumber,
          conflictStartTime: overlapStart,
          conflictEndTime: overlapEnd,
          message: `Bakım planı ile üretim iş emri #${task.workOrderNumber || task.workOrderId} zaman aralığı çakışıyor (${overlapStart.slice(0, 16)} - ${overlapEnd.slice(0, 16)}).`
        })
      }
    }
  }

  return alerts
}

// ─────────────────────────────────────────────────────────────
// 7. YEDEK PARÇA STOK KONTROLÜ VE SATINALMA TALEBİ MANTIĞI
// ─────────────────────────────────────────────────────────────

export function checkSparePartsStockAndProcurement(
  requiredParts: Array<{
    sparePartId: string
    itemId: string
    itemCode: string
    itemName: string
    requiredQuantity: number
    availableStock: number
    leadTimeDays?: number | null
  }>,
  targetMaintenanceDate: Date = new Date()
): SparePartProcurementCheck[] {
  return requiredParts.map((part) => {
    const required = Math.max(0, part.requiredQuantity)
    const available = Math.max(0, part.availableStock)
    const missing = Math.max(0, required - available)
    const needsProcurement = missing > 0

    // Teslim süresini hesaba katarak satınalma talep tarihi önerisi
    const leadTime = part.leadTimeDays || 7
    const suggestedDate = new Date(targetMaintenanceDate)
    suggestedDate.setDate(suggestedDate.getDate() - leadTime)

    return {
      sparePartId: part.sparePartId,
      itemId: part.itemId,
      itemCode: part.itemCode,
      itemName: part.itemName,
      requiredQuantity: required,
      availableStock: available,
      missingQuantity: missing,
      needsProcurement,
      suggestedRequisitionDate: suggestedDate.toISOString()
    }
  })
}

// ─────────────────────────────────────────────────────────────
// 8. BAKIM MALİYETİ HESAPLAMA
// ─────────────────────────────────────────────────────────────

export interface MaintenanceCostInput {
  sparePartsCost: number
  laborHours: number
  hourlyLaborRate: number
  externalServiceCost?: number
}

export function calculateMaintenanceTotalCost(input: MaintenanceCostInput): {
  sparePartsCost: number
  laborCost: number
  externalServiceCost: number
  totalCost: number
} {
  const parts = Math.max(0, input.sparePartsCost || 0)
  const hours = Math.max(0, input.laborHours || 0)
  const rate = Math.max(0, input.hourlyLaborRate || 0)
  const external = Math.max(0, input.externalServiceCost || 0)

  const laborCost = Number((hours * rate).toFixed(2))
  const totalCost = Number((parts + laborCost + external).toFixed(2))

  return {
    sparePartsCost: parts,
    laborCost,
    externalServiceCost: external,
    totalCost
  }
}

