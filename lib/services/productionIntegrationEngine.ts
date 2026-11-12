/**
 * Sunum ERP — Üretim Entegrasyon, Konsolide Dashboard, Bildirim & Raporlama Motoru
 *
 * Saf İş Mantığı ve Matematiksel Hesaplamalar:
 * 1. OTD (Zamanında Teslimat - On-Time Delivery) Oranı
 * 2. Çizelgeye Uyum (Schedule Adherence) & Süre Varyansı
 * 3. Ağırlıklı Fabrika Geneli OEE & Ret/Fire Oranı
 * 4. Olay Bazlı Bildirim Kuralları Değerlendiricisi
 * 5. İş Emri ve Malzeme Maliyet Varyansı Ayrıştırması
 * 6. Kalite Pareto & Bakım Maliyeti Rapor Veri Çıkarıcıları
 * 7. Excel / CSV Dışa Aktarma Formatlayıcısı (UTF-8 BOM)
 */

import { ProductionDomainError } from "./productionAuditAndError"

// ─────────────────────────────────────────────────────────────
// 1. TİPLER VE ENUM'LAR
// ─────────────────────────────────────────────────────────────

export type ProductionEventType =
  | "WORK_ORDER_DELAY"
  | "CAPACITY_OVERLOAD"
  | "QUALITY_REJECTION"
  | "CALIBRATION_EXPIRING"
  | "MAINTENANCE_OVERDUE"
  | "CRITICAL_STOCK_SHORTAGE"

export type ProductionSeverity = "INFO" | "WARNING" | "CRITICAL"

export type NotificationChannel = "IN_APP" | "EMAIL" | "SMS" | "ALL"

export type ProductionRoleView = 
  | "FABRIKA_MUDURU"
  | "PLANLAMA_MUDURU"
  | "ATOLYE_SEFI"
  | "OPERATOR"

export interface ProductionEventPayload {
  eventType: ProductionEventType
  severity: ProductionSeverity
  title: string
  message: string
  entityType: string
  entityId: string
  referenceCode?: string
  metadata?: Record<string, any>
}

export interface NotificationRuleDefinition {
  id: string
  name: string
  eventType: ProductionEventType
  severity: ProductionSeverity
  channel: NotificationChannel
  targetRoles: ProductionRoleView[]
  isActive: boolean
}

export interface OTDCalculationInput {
  completedOrders: Array<{
    id: string
    workOrderNumber: string
    plannedEndDate?: Date | string | null
    actualEndDate?: Date | string | null
    status: string
  }>
}

export interface OTDCalculationResult {
  totalCompleted: number
  onTimeCount: number
  delayedCount: number
  otdPercentage: number // 0 - 100
}

export interface ScheduleAdherenceInput {
  workOrders: Array<{
    plannedQuantity: number
    producedQuantity: number
    status: string
  }>
}

export interface WorkOrderCostVarianceInput {
  workOrderNumber: string
  plannedMaterialCost: number
  actualMaterialCost: number
  plannedLaborCost: number
  actualLaborCost: number
  plannedOverheadCost: number
  actualOverheadCost: number
}

export interface WorkOrderCostVarianceResult {
  workOrderNumber: string
  totalPlannedCost: number
  totalActualCost: number
  varianceAmount: number
  variancePercentage: number
  materialVariance: number
  laborVariance: number
  overheadVariance: number
}

export interface MaterialConsumptionVarianceInput {
  itemCode: string
  itemName: string
  plannedQuantity: number
  actualQuantity: number
  unitCost: number
  unit: string
}

// ─────────────────────────────────────────────────────────────
// 2. OTD (ON-TIME DELIVERY) VE ÇİZELGE UYUMU MATEMATİĞİ
// ─────────────────────────────────────────────────────────────

/**
 * Zamanında Teslimat Oranı (On-Time Delivery - OTD %)
 * Formül: (Zamanında Biten İş Emirleri / Toplam Biten İş Emirleri) * 100
 */
export function calculateOnTimeDeliveryRate(input: OTDCalculationInput): OTDCalculationResult {
  const completed = input.completedOrders.filter(
    (o) => o.status === "COMPLETED" && o.actualEndDate
  )

  if (completed.length === 0) {
    return {
      totalCompleted: 0,
      onTimeCount: 0,
      delayedCount: 0,
      otdPercentage: 100, // Tamamlanmış iş yoksa nötr 100 kabul edilir
    }
  }

  let onTime = 0
  let delayed = 0

  for (const order of completed) {
    if (!order.plannedEndDate) {
      onTime++
      continue
    }

    const plannedTime = new Date(order.plannedEndDate).getTime()
    const actualTime = new Date(order.actualEndDate!).getTime()

    // 1 saatlik tolerans payı
    if (actualTime <= plannedTime + 3600000) {
      onTime++
    } else {
      delayed++
    }
  }

  const otdPercentage = Number(((onTime / completed.length) * 100).toFixed(2))

  return {
    totalCompleted: completed.length,
    onTimeCount: onTime,
    delayedCount: delayed,
    otdPercentage,
  }
}

/**
 * Çizelgeye Uyum Oranı (Schedule Adherence %)
 * Formül: (Toplam Gerçekleşen Üretim / Toplam Planlanan Üretim) * 100
 */
export function calculateScheduleAdherence(input: ScheduleAdherenceInput): number {
  if (input.workOrders.length === 0) return 100

  let totalPlanned = 0
  let totalProduced = 0

  for (const wo of input.workOrders) {
    totalPlanned += Math.max(0, wo.plannedQuantity || 0)
    totalProduced += Math.max(0, wo.producedQuantity || 0)
  }

  if (totalPlanned === 0) return 100

  const rate = (totalProduced / totalPlanned) * 100
  return Number(Math.min(100, Math.max(0, rate)).toFixed(2))
}

/**
 * Ret ve Fire Oranı (Scrap / Defect Rate %)
 */
export function calculateScrapAndDefectRate(
  totalProducedUnits: number,
  scrapUnits: number
): number {
  if (totalProducedUnits <= 0) return 0
  const rate = (Math.max(0, scrapUnits) / totalProducedUnits) * 100
  return Number(Math.min(100, Math.max(0, rate)).toFixed(2))
}

// ─────────────────────────────────────────────────────────────
// 3. İŞ EMRİ VE MALZEME MALİYET VARYANSI
// ─────────────────────────────────────────────────────────────

export function calculateWorkOrderCostVariance(
  input: WorkOrderCostVarianceInput
): WorkOrderCostVarianceResult {
  const totalPlanned = Number(
    (input.plannedMaterialCost + input.plannedLaborCost + input.plannedOverheadCost).toFixed(2)
  )
  const totalActual = Number(
    (input.actualMaterialCost + input.actualLaborCost + input.actualOverheadCost).toFixed(2)
  )

  const varianceAmount = Number((totalActual - totalPlanned).toFixed(2))
  const variancePercentage = totalPlanned > 0
    ? Number(((varianceAmount / totalPlanned) * 100).toFixed(2))
    : 0

  const materialVariance = Number((input.actualMaterialCost - input.plannedMaterialCost).toFixed(2))
  const laborVariance = Number((input.actualLaborCost - input.plannedLaborCost).toFixed(2))
  const overheadVariance = Number((input.actualOverheadCost - input.plannedOverheadCost).toFixed(2))

  return {
    workOrderNumber: input.workOrderNumber,
    totalPlannedCost: totalPlanned,
    totalActualCost: totalActual,
    varianceAmount,
    variancePercentage,
    materialVariance,
    laborVariance,
    overheadVariance,
  }
}

export function calculateMaterialConsumptionVariance(
  items: MaterialConsumptionVarianceInput[]
): Array<MaterialConsumptionVarianceInput & {
  varianceQuantity: number
  variancePercentage: number
  varianceCost: number
}> {
  return items.map((item) => {
    const planned = Math.max(0, item.plannedQuantity)
    const actual = Math.max(0, item.actualQuantity)
    const diff = Number((actual - planned).toFixed(2))
    const pct = planned > 0 ? Number(((diff / planned) * 100).toFixed(2)) : 0
    const cost = Number((diff * (item.unitCost || 0)).toFixed(2))

    return {
      ...item,
      varianceQuantity: diff,
      variancePercentage: pct,
      varianceCost: cost,
    }
  })
}

// ─────────────────────────────────────────────────────────────
// 4. OLAY BAZLI BİLDİRİM KURALLARI DEĞERLENDİRİCİSİ
// ─────────────────────────────────────────────────────────────

/**
 * Belirli bir üretim olayına karşılık gelen aktif bildirim kuralını eşleştirir.
 */
export function matchNotificationRules(
  event: ProductionEventPayload,
  activeRules: NotificationRuleDefinition[]
): NotificationRuleDefinition[] {
  return activeRules.filter((rule) => {
    if (!rule.isActive) return false
    if (rule.eventType !== event.eventType) return false

    // Şiddet eşiği kontrolü (CRITICAL kuralı sadece CRITICAL'da tetiklenir)
    if (rule.severity === "CRITICAL" && event.severity !== "CRITICAL") {
      return false
    }

    return true
  })
}

// ─────────────────────────────────────────────────────────────
// 5. EXCEL / CSV DIŞA AKTARMA FORMATLAYICISI
// ─────────────────────────────────────────────────────────────

/**
 * Veri dizisini UTF-8 BOM ile Excel uyumlu Türkçe CSV formatına dönüştürür.
 */
export function exportToCsvFormat(
  headers: Array<{ key: string; label: string }>,
  rows: Array<Record<string, any>>
): string {
  // UTF-8 BOM (Excel'in Türkçe karakterleri düzgün açması için şart)
  const BOM = "\uFEFF"

  const headerLine = headers.map((h) => `"${h.label.replace(/"/g, '""')}"`).join(";")
  const rowLines = rows.map((row) =>
    headers
      .map((h) => {
        const val = row[h.key]
        if (val === null || val === undefined) return '""'
        if (typeof val === "number") return String(val).replace(".", ",")
        if (typeof val === "boolean") return val ? '"Evet"' : '"Hayır"'
        return `"${String(val).replace(/"/g, '""')}"`
      })
      .join(";")
  )

  return BOM + [headerLine, ...rowLines].join("\r\n")
}

