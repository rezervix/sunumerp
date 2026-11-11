/**
 * SUNUM ERP – Üretim Yönetim Sistemi (Faz 5)
 * Üretim / İş Emri (Work Order) & Atölye İcra Saf Matematiksel ve İş Mantığı Motoru
 *
 * Sıfır veritabanı bağımlılığı (Pure TypeScript).
 * Doğrudan birim testlerine uygundur.
 */

import { ProductionDomainError } from "./productionAuditAndError"

// ─────────────────────────────────────────────────────────────
// TİPLER VE VERİ MODELLERİ
// ─────────────────────────────────────────────────────────────

export type WorkOrderStatus =
  | "PLANNED" // Planlandı
  | "APPROVED" // Onaylandı
  | "RELEASED" // Malzeme Serbest / Rezerve
  | "IN_PROGRESS" // Üretimde
  | "PAUSED" // Duraklatıldı / Beklemede
  | "COMPLETED" // Üretim Tamamlandı
  | "CLOSED" // Mali Olarak Kapatıldı
  | "CANCELLED" // İptal Edildi

export type WorkOrderPriority = "LOW" | "NORMAL" | "HIGH" | "URGENT"

export type WorkOrderOperationStatus =
  | "PENDING" // Bekliyor
  | "RUNNING" // Çalışıyor
  | "PAUSED" // Duruşta / Beklemede
  | "COMPLETED" // Tamamlandı
  | "SKIPPED" // Atlandı

export type ConsumptionMethod = "MANUAL" | "BACKFLUSH"

export type StoppageReasonCode =
  | "ARIZA"
  | "BAKIM"
  | "MALZEME_BEKLEME"
  | "AYAR_KALIBRASYON"
  | "ELEKTRIK_KESINTISI"
  | "MOLA"
  | "DIGER"

export type ScrapReasonCode =
  | "HAMMADDE_HATASI"
  | "OPERATOR_HATASI"
  | "MAKINE_ARIZASI"
  | "AYAR_FIRESI"
  | "KALITE_STANDART_DISI"
  | "DIGER"

export const STOPPAGE_REASON_LABELS: Record<StoppageReasonCode, string> = {
  ARIZA: "Makine / Ekipman Arızası",
  BAKIM: "Planlı / Acil Bakım",
  MALZEME_BEKLEME: "Hammadde / Malzeme Bekleme",
  AYAR_KALIBRASYON: "Kalıp Değişimi & Ayar / Kalibrasyon",
  ELEKTRIK_KESINTISI: "Enerji / Elektrik Kesintisi",
  MOLA: "Vardiya Molası / Yemek",
  DIGER: "Diğer Duruş Nedeni",
}

export const SCRAP_REASON_LABELS: Record<ScrapReasonCode, string> = {
  HAMMADDE_HATASI: "Kusurlu Hammadde / Malzeme",
  OPERATOR_HATASI: "Operatör / İşçilik Hatası",
  MAKINE_ARIZASI: "Makine / Kalıp Hatası",
  AYAR_FIRESI: "Başlangıç / Ayar Firesi",
  KALITE_STANDART_DISI: "Kalite Kontrol Standart Dışı",
  DIGER: "Diğer Hurda Nedeni",
}

export interface WorkOrderMaterialDraft {
  itemId: string
  itemSku: string
  itemName: string
  operationNumber?: number
  plannedQuantity: number
  reservedQuantity: number
  consumedQuantity: number
  scrapQuantity: number
  unit: string
  unitCost: number
  consumptionMethod: ConsumptionMethod
  lotNumber?: string | null
}

export interface WorkOrderOperationDraft {
  operationNumber: number
  name: string
  description?: string | null
  workCenterId?: string | null
  workCenterCode?: string | null
  workCenterName?: string | null
  workCenterHourlyCost?: number
  setupTimeMinutes: number
  plannedRunMinutes: number
  plannedQuantity: number
  operatorUserId?: string | null
}

export interface WorkOrderLaborLogDraft {
  operationId: string
  userId: string
  userName?: string
  durationMinutes: number
  hourlyRate: number
  startedAt: Date
  endedAt?: Date | null
}

export interface WorkOrderStoppageDraft {
  operationId: string
  workCenterId?: string | null
  reasonCode: StoppageReasonCode
  description?: string | null
  startedAt: Date
  endedAt?: Date | null
  durationMinutes?: number
  reportedBy: string
}

export interface ActualCostCalculationResult {
  actualMaterialCost: number
  actualLaborCost: number
  actualOverheadCost: number
  actualScrapCost: number
  actualTotalCost: number
  unitActualCost: number
  theoreticalTotalCost: number
  costVariance: number // Gerçek - Teorik (Pozitif = maliyet aşımı, Negatif = tasarruf)
  variancePercent: number
  isOverBudget: boolean
  varianceAnalysis: {
    materialUsageVariance: number
    laborEfficiencyVariance: number
    overheadVariance: number
  }
}

// ─────────────────────────────────────────────────────────────
// 1. DURUM YAŞAM DÖNGÜSÜ (STATE MACHINE) GEÇİŞ KONTROLLERİ
// ─────────────────────────────────────────────────────────────

const VALID_STATE_TRANSITIONS: Record<WorkOrderStatus, WorkOrderStatus[]> = {
  PLANNED: ["APPROVED", "CANCELLED"],
  APPROVED: ["RELEASED", "PLANNED", "CANCELLED"],
  RELEASED: ["IN_PROGRESS", "APPROVED", "CANCELLED"],
  IN_PROGRESS: ["PAUSED", "COMPLETED", "CANCELLED"],
  PAUSED: ["IN_PROGRESS", "CANCELLED"],
  COMPLETED: ["CLOSED"],
  CLOSED: [], // Değiştirilemez nihai durum
  CANCELLED: [], // Değiştirilemez nihai durum
}

/**
 * İş emri durum geçiş kuralını denetler. Geçersiz geçişte ProductionDomainError fırlatır.
 */
export function validateWorkOrderStateTransition(
  currentStatus: WorkOrderStatus,
  targetStatus: WorkOrderStatus
): boolean {
  if (currentStatus === targetStatus) return true

  const allowed = VALID_STATE_TRANSITIONS[currentStatus] || []
  if (!allowed.includes(targetStatus)) {
    throw new ProductionDomainError(
      "INVALID_STATE_TRANSITION",
      `Geçersiz iş emri durum geçişi: '${currentStatus}' durumundaki bir iş emri '${targetStatus}' durumuna geçirilemez.`
    )
  }

  return true
}

// ─────────────────────────────────────────────────────────────
// 2. REÇETE (BOM) VE ROTA DONDURMA (SNAPSHOT GENERATOR)
// ─────────────────────────────────────────────────────────────

export interface BomSnapshotInput {
  bomId: string
  code: string
  name: string
  revision: string
  baseQuantity: number
  components: Array<{
    componentItemId: string
    sku: string
    name: string
    quantity: number
    unit: string
    scrapPercent: number
    unitCost?: number
    isPhantom: boolean
    operationSequence?: number | null
  }>
}

export interface RoutingSnapshotInput {
  routingId: string
  code: string
  name: string
  revision: string
  operations: Array<{
    operationNumber: number
    name: string
    description?: string | null
    workCenterId?: string | null
    workCenterCode?: string | null
    workCenterName?: string | null
    workCenterHourlyCost?: number
    setupTimeMinutes: number
    runTimeMinutesPerUnit: number
  }>
}

/**
 * İş emri oluşturulurken o anki aktif reçete ve rotayı dondurulmuş (frozen snapshot)
 * yapıya çevirir ve iş emri malzeme/operasyon satırlarını ölçeklendirir.
 */
export function buildWorkOrderSnapshotAndLines(
  plannedQuantity: number,
  bom: BomSnapshotInput,
  routing?: RoutingSnapshotInput | null,
  options?: { defaultConsumptionMethod?: ConsumptionMethod }
): {
  bomSnapshotJson: string
  routingSnapshotJson: string | null
  materials: WorkOrderMaterialDraft[]
  operations: WorkOrderOperationDraft[]
  theoreticalCosts: {
    materialCost: number
    laborCost: number
    overheadCost: number
    totalCost: number
  }
} {
  if (plannedQuantity <= 0) {
    throw new ProductionDomainError("VALIDATION_ERROR", "Planlanan miktar 0'dan büyük olmalıdır.")
  }

  const baseQty = Math.max(1, bom.baseQuantity || 1)
  const multiplier = plannedQuantity / baseQty

  let theoreticalMaterialCost = 0
  const materials: WorkOrderMaterialDraft[] = []

  for (const comp of bom.components) {
    // Hayalet montaj alt bileşenleri zaten ana reçetede düzleştirilmiş kabul edilir
    if (comp.isPhantom) continue

    const scrapFactor = 1 + (comp.scrapPercent || 0) / 100
    const lineQty = Number((comp.quantity * multiplier * scrapFactor).toFixed(4))
    const unitCost = comp.unitCost || 0
    theoreticalMaterialCost += lineQty * unitCost

    materials.push({
      itemId: comp.componentItemId,
      itemSku: comp.sku,
      itemName: comp.name,
      operationNumber: comp.operationSequence || undefined,
      plannedQuantity: lineQty,
      reservedQuantity: 0,
      consumedQuantity: 0,
      scrapQuantity: 0,
      unit: comp.unit || "Adet",
      unitCost,
      consumptionMethod: options?.defaultConsumptionMethod || "MANUAL",
    })
  }

  let theoreticalLaborCost = 0
  let theoreticalOverheadCost = 0
  const operations: WorkOrderOperationDraft[] = []

  if (routing && routing.operations && routing.operations.length > 0) {
    for (const op of routing.operations) {
      const plannedRun = Number((op.runTimeMinutesPerUnit * plannedQuantity).toFixed(2))
      const totalOpMinutes = (op.setupTimeMinutes || 0) + plannedRun
      const hourlyCost = op.workCenterHourlyCost || 0
      const opCost = (totalOpMinutes / 60) * hourlyCost

      theoreticalOverheadCost += opCost
      // Varsayılan işçilik maliyeti genel üretimle orantılı modellenir
      theoreticalLaborCost += opCost * 0.4

      operations.push({
        operationNumber: op.operationNumber,
        name: op.name,
        description: op.description,
        workCenterId: op.workCenterId,
        workCenterCode: op.workCenterCode,
        workCenterName: op.workCenterName,
        workCenterHourlyCost: hourlyCost,
        setupTimeMinutes: op.setupTimeMinutes || 0,
        plannedRunMinutes: plannedRun,
        plannedQuantity,
      })
    }
  }

  theoreticalMaterialCost = Number(theoreticalMaterialCost.toFixed(2))
  theoreticalLaborCost = Number(theoreticalLaborCost.toFixed(2))
  theoreticalOverheadCost = Number(theoreticalOverheadCost.toFixed(2))
  const theoreticalTotalCost = Number(
    (theoreticalMaterialCost + theoreticalLaborCost + theoreticalOverheadCost).toFixed(2)
  )

  return {
    bomSnapshotJson: JSON.stringify(bom),
    routingSnapshotJson: routing ? JSON.stringify(routing) : null,
    materials,
    operations,
    theoreticalCosts: {
      materialCost: theoreticalMaterialCost,
      laborCost: theoreticalLaborCost,
      overheadCost: theoreticalOverheadCost,
      totalCost: theoreticalTotalCost,
    },
  }
}

// ─────────────────────────────────────────────────────────────
// 3. GERİ YIKAMA (BACKFLUSH) SARFİYAT HESAPLAYICI
// ─────────────────────────────────────────────────────────────

export interface BackflushCalculationItem {
  materialId: string
  itemId: string
  itemSku: string
  itemName: string
  unit: string
  currentConsumed: number
  requiredBackflushQuantity: number
  unitCost: number
  totalCost: number
}

/**
 * Operasyon veya iş emri tamamlandığında üretilen miktar oranında
 * otomatik düşülecek hammadde sarfiyat miktarlarını hesaplar.
 */
export function calculateBackflushConsumption(
  completedBatchQuantity: number,
  totalPlannedQuantity: number,
  materials: Array<{
    id: string
    itemId: string
    itemSku: string
    itemName: string
    plannedQuantity: number
    consumedQuantity: number
    unit: string
    unitCost: number
    consumptionMethod: ConsumptionMethod
  }>
): BackflushCalculationItem[] {
  if (completedBatchQuantity <= 0 || totalPlannedQuantity <= 0) return []

  const progressRatio = Math.min(1.0, completedBatchQuantity / totalPlannedQuantity)
  const results: BackflushCalculationItem[] = []

  for (const mat of materials) {
    if (mat.consumptionMethod !== "BACKFLUSH") continue

    const targetTotalConsumption = Number((mat.plannedQuantity * progressRatio).toFixed(4))
    const deltaToConsume = Math.max(0, targetTotalConsumption - mat.consumedQuantity)

    if (deltaToConsume > 0) {
      results.push({
        materialId: mat.id,
        itemId: mat.itemId,
        itemSku: mat.itemSku,
        itemName: mat.itemName,
        unit: mat.unit,
        currentConsumed: mat.consumedQuantity,
        requiredBackflushQuantity: Number(deltaToConsume.toFixed(4)),
        unitCost: mat.unitCost,
        totalCost: Number((deltaToConsume * mat.unitCost).toFixed(2)),
      })
    }
  }

  return results
}

// ─────────────────────────────────────────────────────────────
// 4. FİİLİ MALİYET & TEORİK SAPMA (ACTUAL COSTING & VARIANCE)
// ─────────────────────────────────────────────────────────────

/**
 * Gerçekleşen malzeme, işçilik, makine ve fire maliyetlerini hesaplar,
 * teorik standart maliyetle karşılaştırarak varyans analizini çıkarır.
 */
export function calculateWorkOrderActualCostAndVariance(params: {
  plannedQuantity: number
  producedQuantity: number
  theoreticalMaterialCost: number
  theoreticalLaborCost: number
  theoreticalOverheadCost: number
  materials: Array<{ consumedQuantity: number; unitCost: number; scrapQuantity?: number }>
  laborLogs: Array<{ durationMinutes: number; hourlyRate: number }>
  operations: Array<{ actualMachineMinutes: number; workCenterHourlyCost?: number }>
  finishedItemScrapCost?: number
}): ActualCostCalculationResult {
  const { plannedQuantity, producedQuantity, theoreticalMaterialCost, theoreticalLaborCost, theoreticalOverheadCost } =
    params

  // 1. Fiili Malzeme Maliyeti
  let actualMaterialCost = 0
  let actualScrapCost = params.finishedItemScrapCost || 0

  for (const m of params.materials) {
    actualMaterialCost += m.consumedQuantity * (m.unitCost || 0)
    if (m.scrapQuantity && m.scrapQuantity > 0) {
      actualScrapCost += m.scrapQuantity * (m.unitCost || 0)
    }
  }

  // 2. Fiili İşçilik Maliyeti
  let actualLaborCost = 0
  for (const l of params.laborLogs) {
    actualLaborCost += (l.durationMinutes / 60) * (l.hourlyRate || 0)
  }

  // 3. Fiili Makine / Genel Üretim Maliyeti
  let actualOverheadCost = 0
  for (const op of params.operations) {
    actualOverheadCost += (op.actualMachineMinutes / 60) * (op.workCenterHourlyCost || 0)
  }

  actualMaterialCost = Number(actualMaterialCost.toFixed(2))
  actualLaborCost = Number(actualLaborCost.toFixed(2))
  actualOverheadCost = Number(actualOverheadCost.toFixed(2))
  actualScrapCost = Number(actualScrapCost.toFixed(2))

  const actualTotalCost = Number(
    (actualMaterialCost + actualLaborCost + actualOverheadCost + actualScrapCost).toFixed(2)
  )

  const theoreticalTotalCost = Number(
    (theoreticalMaterialCost + theoreticalLaborCost + theoreticalOverheadCost).toFixed(2)
  )

  // Fiili üretilen miktara göre orantılanmış teorik maliyet
  const scale = plannedQuantity > 0 ? producedQuantity / plannedQuantity : 1
  const scaledTheoretical = theoreticalTotalCost * scale

  const costVariance = Number((actualTotalCost - scaledTheoretical).toFixed(2))
  const variancePercent =
    scaledTheoretical > 0 ? Number(((costVariance / scaledTheoretical) * 100).toFixed(2)) : 0

  const unitActualCost =
    producedQuantity > 0 ? Number((actualTotalCost / producedQuantity).toFixed(2)) : 0

  // Varyans Ayrıştırması
  const scaledTheoreticalMat = theoreticalMaterialCost * scale
  const scaledTheoreticalLab = theoreticalLaborCost * scale
  const scaledTheoreticalOver = theoreticalOverheadCost * scale

  return {
    actualMaterialCost,
    actualLaborCost,
    actualOverheadCost,
    actualScrapCost,
    actualTotalCost,
    unitActualCost,
    theoreticalTotalCost,
    costVariance,
    variancePercent,
    isOverBudget: costVariance > 0,
    varianceAnalysis: {
      materialUsageVariance: Number((actualMaterialCost - scaledTheoreticalMat).toFixed(2)),
      laborEfficiencyVariance: Number((actualLaborCost - scaledTheoreticalLab).toFixed(2)),
      overheadVariance: Number((actualOverheadCost - scaledTheoreticalOver).toFixed(2)),
    },
  }
}

// ─────────────────────────────────────────────────────────────
// 5. İŞ EMRİ BÖLME (SPLIT) VE BİRLEŞTİRME (MERGE)
// ─────────────────────────────────────────────────────────────

/**
 * Bir iş emrini acil parti veya parti boyutu optimizasyonu için ikiye böler.
 */
export function calculateWorkOrderSplit(
  originalWorkOrder: {
    workOrderNumber: string
    plannedQuantity: number
    producedQuantity: number
    status: WorkOrderStatus
  },
  splitQuantity: number
): {
  parentNewPlannedQuantity: number
  childPlannedQuantity: number
  childWorkOrderNumber: string
} {
  if (originalWorkOrder.status === "CLOSED" || originalWorkOrder.status === "CANCELLED") {
    throw new ProductionDomainError(
      "INVALID_STATE_TRANSITION",
      "Kapanmış veya iptal edilmiş iş emirleri bölünemez."
    )
  }

  const remainingQty = originalWorkOrder.plannedQuantity - originalWorkOrder.producedQuantity
  if (splitQuantity <= 0 || splitQuantity >= remainingQty) {
    throw new ProductionDomainError(
      "VALIDATION_ERROR",
      `Bölünecek miktar 0 ile kalan miktar (${remainingQty}) arasında olmalıdır.`
    )
  }

  const parentNewPlannedQuantity = Number(
    (originalWorkOrder.plannedQuantity - splitQuantity).toFixed(4)
  )
  const childPlannedQuantity = Number(splitQuantity.toFixed(4))
  const childWorkOrderNumber = `${originalWorkOrder.workOrderNumber}-B`

  return {
    parentNewPlannedQuantity,
    childPlannedQuantity,
    childWorkOrderNumber,
  }
}

/**
 * Aynı ürün ve reçeteye sahip iki planlanan iş emrini birleştirir.
 */
export function calculateWorkOrderMerge(
  firstOrder: { id: string; itemId: string; bomId?: string | null; status: WorkOrderStatus; plannedQuantity: number },
  secondOrder: { id: string; itemId: string; bomId?: string | null; status: WorkOrderStatus; plannedQuantity: number }
): {
  consolidatedQuantity: number
} {
  if (firstOrder.status !== "PLANNED" || secondOrder.status !== "PLANNED") {
    throw new ProductionDomainError(
      "INVALID_STATE_TRANSITION",
      "Yalnızca 'PLANLANDI' (PLANNED) durumundaki iş emirleri birleştirilebilir."
    )
  }

  if (firstOrder.itemId !== secondOrder.itemId) {
    throw new ProductionDomainError(
      "VALIDATION_ERROR",
      "Farklı mamullere ait iş emirleri birleştirilemez."
    )
  }

  if (firstOrder.bomId !== secondOrder.bomId) {
    throw new ProductionDomainError(
      "VALIDATION_ERROR",
      "Farklı ürün reçetelerine (BOM) sahip iş emirleri birleştirilemez."
    )
  }

  return {
    consolidatedQuantity: Number((firstOrder.plannedQuantity + secondOrder.plannedQuantity).toFixed(4)),
  }
}

// ─────────────────────────────────────────────────────────────
// 6. OEE & ATÖLYE VERİMLİLİK HESAPLAYICI
// ─────────────────────────────────────────────────────────────

export interface WorkOrderOeeResult {
  availabilityPercent: number // Kullanılabilirlik (Çalışma Süresi / Planlanan Süre)
  performancePercent: number // Performans (Gerçek Hız / İdeal Hız)
  qualityPercent: number // Kalite (Sağlam Miktar / Toplam Üretim)
  oeePercent: number // OEE = A * P * Q
  totalStoppageMinutes: number
}

export function calculateWorkOrderOee(params: {
  plannedRunMinutes: number
  actualRunMinutes: number
  totalStoppageMinutes: number
  producedQuantity: number
  scrapQuantity: number
}): WorkOrderOeeResult {
  const { plannedRunMinutes, actualRunMinutes, totalStoppageMinutes, producedQuantity, scrapQuantity } =
    params

  const operatingMinutes = Math.max(0, actualRunMinutes - totalStoppageMinutes)
  const totalPlannedWithStoppage = plannedRunMinutes + totalStoppageMinutes

  // Kullanılabilirlik (Availability)
  const availability =
    totalPlannedWithStoppage > 0 ? Math.min(1.0, operatingMinutes / totalPlannedWithStoppage) : 1.0

  // Performans (Performance)
  const performance =
    actualRunMinutes > 0 ? Math.min(1.2, plannedRunMinutes / Math.max(1, operatingMinutes)) : 1.0

  // Kalite (Quality)
  const totalOutput = producedQuantity + scrapQuantity
  const quality = totalOutput > 0 ? Math.max(0, producedQuantity / totalOutput) : 1.0

  const oee = availability * performance * quality

  return {
    availabilityPercent: Number((availability * 100).toFixed(1)),
    performancePercent: Number((performance * 100).toFixed(1)),
    qualityPercent: Number((quality * 100).toFixed(1)),
    oeePercent: Number((oee * 100).toFixed(1)),
    totalStoppageMinutes,
  }
}

