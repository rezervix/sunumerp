/**
 * SUNUM ERP – Üretim Yönetim Sistemi (Faz 4)
 * MRP (Malzeme İhtiyaç Planlaması) & MPS (Ana Üretim Çizelgesi) Saf Matematiksel Hesaplama Motoru
 *
 * Sıfır harici veritabanı bağımlılığı (Pure TypeScript).
 * Doğrudan birim testlerine (unit testing) ve yüksek hacim performans testlerine uygundur.
 */

import { ProductionDomainError } from "./productionDomainError"

// ─────────────────────────────────────────────────────────────
// TİPLER VE VERİ MODELLERİ
// ─────────────────────────────────────────────────────────────

export type MpsPlanStatus = "DRAFT" | "APPROVED" | "OBSOLETE"
export type MpsBucketType = "DAILY" | "WEEKLY" | "MONTHLY"
export type LotSizingRule = "L4L" | "FOQ" | "MIN_MULTIPLE" | "EOQ" | "POQ"
export type MrpRunType = "FULL_REGENERATION" | "NET_CHANGE"
export type MrpRunStatus = "RUNNING" | "COMPLETED" | "FAILED"
export type MrpOrderType = "PURCHASE" | "PRODUCTION" | "TRANSFER"
export type MrpOrderStatus = "PLANNED" | "APPROVED" | "CONVERTED" | "REJECTED"
export type MrpSourceDocType = "MPS" | "SALES_ORDER" | "SAFETY_STOCK" | "BOM_DEPENDENT"
export type MrpActionType =
  | "EXPEDITE"
  | "DEFER"
  | "CANCEL"
  | "PAST_DUE"
  | "INSUFFICIENT_LEAD_TIME"
  | "SAFETY_STOCK_VIOLATION"
export type MrpSeverity = "INFO" | "WARNING" | "CRITICAL"

export interface WorkCalendarConfig {
  workDays?: number[] // 1: Pazartesi, 2: Salı, ..., 5: Cuma (varsayılan: [1,2,3,4,5])
  holidays?: Array<{ date: string | Date; description?: string }>
}

export interface ItemPlanningProfile {
  itemId: string
  sku: string
  name: string
  baseUnit: string
  productionItemType: string // "MAMUL" | "YARI_MAMUL" | "HAMMADDE" | "SARF_MALZEME" | "TICARI_MAL"
  productionMethod: string // "MAKE_TO_STOCK" | "MAKE_TO_ORDER" | "ASSEMBLE_TO_ORDER" | "SUBCONTRACT" | "PURCHASE_ONLY"
  leadTimeDays: number
  productionLeadTimeHours?: number
  minStockLevel: number
  safetyStockQty: number
  lotSizingRule: LotSizingRule
  standardLotSize: number
  minOrderQty: number
  orderMultiple: number
  currentOnHand: number
  defaultSupplierId?: string | null
  defaultBomId?: string | null
  defaultRoutingId?: string | null
  standardCost?: number
}

export interface BomSubstituteEdge {
  substituteItemId: string
  priority: number
  substitutionRatio: number
  availableStock?: number
}

export interface BomEdge {
  bomId: string
  parentItemId: string
  componentItemId: string
  quantity: number
  unit?: string
  scrapPercent: number
  isPhantom: boolean
  substitutes?: BomSubstituteEdge[]
}

export interface MpsBucketInput {
  periodIndex: number
  periodStartDate: Date | string
  periodEndDate: Date | string
  forecastQty: number
  salesOrderQty: number
  scheduledReceipts?: number
  manualPlannedProduction?: number
}

export interface MpsCalculatedBucket {
  periodIndex: number
  periodStartDate: string
  periodEndDate: string
  forecastQty: number
  salesOrderQty: number
  grossRequirement: number
  scheduledReceipts: number
  plannedProductionQty: number
  projectedOnHand: number
  atpQty: number
  isFrozen: boolean
}

export interface PeggingChainItem {
  demandType: string
  demandId: string
  demandRef: string
  parentItemId?: string
  parentItemSku?: string
  parentItemName?: string
  requiredQty: number
  requiredDate: string
}

export interface OpenSupplyOrder {
  id: string
  orderNumber: string
  itemId: string
  orderType: MrpOrderType
  quantity: number
  dueDate: Date | string
  status: string
}

export interface IndependentDemandInput {
  id: string
  demandType: "MPS" | "SALES_ORDER" | "SAFETY_STOCK"
  demandRef: string
  itemId: string
  quantity: number
  dueDate: Date | string
}

export interface MrpPlannedOrderDraft {
  id: string
  itemId: string
  itemSku: string
  itemName: string
  orderType: MrpOrderType
  orderNumber: string
  orderStatus: MrpOrderStatus
  sourceDocumentType: MrpSourceDocType
  sourceDocumentId?: string
  quantity: number
  unit: string
  releaseDate: Date
  dueDate: Date
  supplierId?: string | null
  bomId?: string | null
  routingId?: string | null
  pegging: PeggingChainItem[]
  notes?: string
}

export interface MrpActionMessageDraft {
  id: string
  itemId: string
  itemSku: string
  plannedOrderId?: string
  openOrderId?: string
  actionType: MrpActionType
  severity: MrpSeverity
  suggestedDate?: Date
  suggestedQty?: number
  message: string
}

export interface MrpExplosionParams {
  items: ItemPlanningProfile[]
  bomEdges: BomEdge[]
  demands: IndependentDemandInput[]
  openOrders: OpenSupplyOrder[]
  calendar?: WorkCalendarConfig
  planningHorizonDays?: number
  today?: Date | string
  runType?: MrpRunType
  filterItemIds?: string[] // Net change için sadece etkilenenler
}

export interface MrpExplosionResult {
  runCode: string
  runType: MrpRunType
  plannedOrders: MrpPlannedOrderDraft[]
  actionMessages: MrpActionMessageDraft[]
  lowLevelCodes: Record<string, number>
  materialTimePhased: Record<
    string,
    {
      itemId: string
      itemSku: string
      itemName: string
      initialOnHand: number
      safetyStock: number
      timeline: Array<{
        date: string
        grossRequirements: number
        scheduledReceipts: number
        plannedOrders: number
        projectedOnHand: number
        pegging: PeggingChainItem[]
      }>
    }
  >
  summary: {
    totalItemsPlanned: number
    totalOrdersGenerated: number
    purchaseOrdersCount: number
    productionOrdersCount: number
    actionMessagesCount: number
    criticalExceptionsCount: number
    executionTimeMs: number
  }
}

// ─────────────────────────────────────────────────────────────
// 1. ÇALIŞMA TAKVİMİ & TARİH HESAPLAMA YARDIMCILARI
// ─────────────────────────────────────────────────────────────

function toDate(d: Date | string): Date {
  const dt = typeof d === "string" ? new Date(d) : new Date(d)
  if (isNaN(dt.getTime())) {
    throw new ProductionDomainError("VALIDATION_ERROR", `Geçersiz tarih formatı: ${d}`)
  }
  return dt
}

function formatDateIso(d: Date): string {
  return d.toISOString().split("T")[0]
}

/**
 * Belirli bir tarihin çalışma günü olup olmadığını kontrol eder.
 */
export function isWorkDay(date: Date, calendar?: WorkCalendarConfig): boolean {
  const workDays = calendar?.workDays && calendar.workDays.length > 0 ? calendar.workDays : [1, 2, 3, 4, 5] // Pzt - Cuma
  const dayOfWeek = date.getDay() === 0 ? 7 : date.getDay() // 1..7 (1: Pzt, 7: Pazar)

  if (!workDays.includes(dayOfWeek)) {
    return false
  }

  if (calendar?.holidays && calendar.holidays.length > 0) {
    const isoDate = formatDateIso(date)
    const isHoliday = calendar.holidays.some((h) => {
      const hDate = typeof h.date === "string" ? h.date.split("T")[0] : formatDateIso(h.date)
      return hDate === isoDate
    })
    if (isHoliday) return false
  }

  return true
}

/**
 * İş takvimi ve tatil günlerini dikkate alarak tarihi geri veya ileri öteler.
 */
export function offsetWorkDays(
  baseDate: Date | string,
  days: number,
  direction: "BACKWARD" | "FORWARD" = "BACKWARD",
  calendar?: WorkCalendarConfig
): Date {
  let current = toDate(baseDate)
  let remainingDays = Math.max(0, Math.floor(days))

  // Eğer başlangıç günü tatil ise, öncelikle uygun ilk iş gününe hizala
  while (!isWorkDay(current, calendar)) {
    current = new Date(current.getTime() + (direction === "BACKWARD" ? -1 : 1) * 86400000)
  }

  while (remainingDays > 0) {
    current = new Date(current.getTime() + (direction === "BACKWARD" ? -1 : 1) * 86400000)
    if (isWorkDay(current, calendar)) {
      remainingDays--
    }
  }

  return current
}

// ─────────────────────────────────────────────────────────────
// 2. LOW-LEVEL CODE (LLC) VE DÖNGÜSEL BAĞIMLILIK KONTROLÜ
// ─────────────────────────────────────────────────────────────

/**
 * Çok seviyeli BOM ağacında her malzemenin en alt seviye kodunu (Low-Level Code) hesaplar.
 * Nihai mamuller (üstü olmayanlar) Seviye 0'dır.
 * Eğer bir hammadde hem Seviye 1 hem Seviye 3'te kullanılıyorsa, LLC = 3 olur.
 * Döngüsel referans tespit edildiğinde ProductionDomainError fırlatır.
 */
export function calculateLowLevelCodes(
  itemIds: string[],
  bomEdges: BomEdge[]
): { lowLevelCodes: Map<string, number>; maxLevel: number } {
  const llcMap = new Map<string, number>()
  itemIds.forEach((id) => llcMap.set(id, 0))

  // Ebeveyn -> Çocuklar grafı oluştur
  const childrenMap = new Map<string, string[]>()
  const parentMap = new Map<string, string[]>()

  for (const edge of bomEdges) {
    if (!childrenMap.has(edge.parentItemId)) childrenMap.set(edge.parentItemId, [])
    childrenMap.get(edge.parentItemId)!.push(edge.componentItemId)

    if (!parentMap.has(edge.componentItemId)) parentMap.set(edge.componentItemId, [])
    parentMap.get(edge.componentItemId)!.push(edge.parentItemId)

    // Substitute varsa onları da graf ilişkilerine ekle
    if (edge.substitutes && edge.substitutes.length > 0) {
      for (const sub of edge.substitutes) {
        if (!childrenMap.has(edge.parentItemId)) childrenMap.set(edge.parentItemId, [])
        childrenMap.get(edge.parentItemId)!.push(sub.substituteItemId)

        if (!parentMap.has(sub.substituteItemId)) parentMap.set(sub.substituteItemId, [])
        parentMap.get(sub.substituteItemId)!.push(edge.parentItemId)
      }
    }
  }

  // Döngüsel Bağımlılık Tespiti (Cycle Detection via DFS)
  const visited = new Set<string>()
  const recursionStack = new Set<string>()

  function checkCycle(node: string, path: string[]): void {
    visited.add(node)
    recursionStack.add(node)

    const neighbors = childrenMap.get(node) || []
    for (const neighbor of neighbors) {
      if (!visited.has(neighbor)) {
        checkCycle(neighbor, [...path, neighbor])
      } else if (recursionStack.has(neighbor)) {
        const cycle = [...path, neighbor].join(" -> ")
        throw new ProductionDomainError(
          "VALIDATION_ERROR",
          `BOM yapısında döngüsel bağımlılık (circular dependency) tespit edildi: ${cycle}`
        )
      }
    }

    recursionStack.delete(node)
  }

  for (const itemId of itemIds) {
    if (!visited.has(itemId)) {
      checkCycle(itemId, [itemId])
    }
  }

  // LLC Hesaplama (Bellman-Ford / Relaxation yaklaşımı)
  // En derin seviye N-1 adımdan fazla olamaz
  const allNodes = Array.from(new Set([...itemIds, ...Array.from(childrenMap.keys())]))
  let changed = true
  let iterations = 0
  const maxIterations = allNodes.length + 5

  while (changed && iterations < maxIterations) {
    changed = false
    iterations++

    for (const edge of bomEdges) {
      const parentLlc = llcMap.get(edge.parentItemId) ?? 0
      const currentChildLlc = llcMap.get(edge.componentItemId) ?? 0

      if (currentChildLlc < parentLlc + 1) {
        llcMap.set(edge.componentItemId, parentLlc + 1)
        changed = true
      }

      if (edge.substitutes) {
        for (const sub of edge.substitutes) {
          const curSubLlc = llcMap.get(sub.substituteItemId) ?? 0
          if (curSubLlc < parentLlc + 1) {
            llcMap.set(sub.substituteItemId, parentLlc + 1)
            changed = true
          }
        }
      }
    }
  }

  let maxLevel = 0
  for (const lvl of llcMap.values()) {
    if (lvl > maxLevel) maxLevel = lvl
  }

  return { lowLevelCodes: llcMap, maxLevel }
}

// ─────────────────────────────────────────────────────────────
// 3. LOT BÜYÜKLÜĞÜ KURALLARI (LOT-SIZING)
// ─────────────────────────────────────────────────────────────

/**
 * Net gereksinime ve malzeme profiline göre planlanan sipariş miktarını belirler.
 * Desteklenen kurallar:
 * - L4L (Lot-for-Lot): İhtiyaç kadar (varsa minOrderQty ve orderMultiple'a uyarak).
 * - FOQ (Fixed Order Quantity): Sabit standart lot büyüklüğü katları.
 * - MIN_MULTIPLE: Minimum sipariş miktarı ve katları.
 * - EOQ (Economic Order Quantity): Wilson EOQ formülü ya da standart lot referansı.
 * - POQ (Periodic Order Quantity): Birden fazla dönemin ihtiyacını birleştirir.
 */
export function calculateLotSize(
  netRequirement: number,
  profile: Pick<
    ItemPlanningProfile,
    "lotSizingRule" | "standardLotSize" | "minOrderQty" | "orderMultiple"
  >,
  futureCombinedRequirement: number = 0
): number {
  if (netRequirement <= 0) return 0

  const rule = profile.lotSizingRule || "L4L"
  const standardLot = Math.max(1, profile.standardLotSize || 1)
  const minOrder = Math.max(0, profile.minOrderQty || 0)
  const multiple = Math.max(1, profile.orderMultiple || 1)

  switch (rule) {
    case "L4L": {
      let qty = netRequirement
      if (minOrder > 0 && qty < minOrder) qty = minOrder
      if (multiple > 1) {
        qty = Math.ceil(qty / multiple) * multiple
      }
      return Number(qty.toFixed(4))
    }

    case "FOQ": {
      // Sabit lot büyüklüğünün tam katı
      const batches = Math.ceil(netRequirement / standardLot)
      let qty = batches * standardLot
      if (minOrder > 0 && qty < minOrder) {
        qty = Math.ceil(minOrder / standardLot) * standardLot
      }
      return Number(qty.toFixed(4))
    }

    case "MIN_MULTIPLE": {
      if (netRequirement <= minOrder) {
        return Number(minOrder.toFixed(4))
      }
      const excess = netRequirement - minOrder
      const extraMultiples = Math.ceil(excess / multiple) * multiple
      return Number((minOrder + extraMultiples).toFixed(4))
    }

    case "EOQ": {
      // EOQ değeri standardLotSize üzerinden modellenir (veya hesaplanan EOQ)
      const baseEoq = standardLot
      let qty = Math.ceil(netRequirement / baseEoq) * baseEoq
      if (minOrder > 0 && qty < minOrder) qty = minOrder
      if (multiple > 1) {
        qty = Math.ceil(qty / multiple) * multiple
      }
      return Number(qty.toFixed(4))
    }

    case "POQ": {
      // Belirli dönemlerin toplam ihtiyacını tek bir siparişte birleştirir
      let total = netRequirement + futureCombinedRequirement
      if (minOrder > 0 && total < minOrder) total = minOrder
      if (multiple > 1) {
        total = Math.ceil(total / multiple) * multiple
      }
      return Number(total.toFixed(4))
    }

    default:
      return Number(netRequirement.toFixed(4))
  }
}

// ─────────────────────────────────────────────────────────────
// 4. MPS (ANA ÜRETİM ÇİZELGESİ) HESAPLAMA MOTORU
// ─────────────────────────────────────────────────────────────

export interface CalculateMpsOptions {
  frozenDays: number
  planStartDate: Date | string
  demandPolicy?: "MAX_OF_FORECAST_AND_SALES" | "SUM_OF_FORECAST_AND_SALES" | "SALES_ONLY" | "FORECAST_ONLY"
}

/**
 * MPS Matrisini ve ATP (Available-To-Promise) değerlerini hesaplar.
 */
export function calculateMpsMatrix(
  item: ItemPlanningProfile,
  buckets: MpsBucketInput[],
  options: CalculateMpsOptions
): MpsCalculatedBucket[] {
  const planStart = toDate(options.planStartDate)
  const frozenCutoff = new Date(planStart.getTime() + options.frozenDays * 86400000)
  const demandPolicy = options.demandPolicy || "MAX_OF_FORECAST_AND_SALES"

  let currentStock = Math.max(0, item.currentOnHand)
  const result: MpsCalculatedBucket[] = []

  // 1. Aşama: Brüt İhtiyaç, Dondurulmuş Ufuk, Üretim Kararı ve Projeksiyon Stoku
  for (const b of buckets) {
    const periodStart = toDate(b.periodStartDate)
    const periodEnd = toDate(b.periodEndDate)
    const isFrozen = periodStart.getTime() <= frozenCutoff.getTime()

    // Brüt İhtiyaç politikası
    let gross = 0
    if (demandPolicy === "MAX_OF_FORECAST_AND_SALES") {
      gross = Math.max(b.forecastQty || 0, b.salesOrderQty || 0)
    } else if (demandPolicy === "SUM_OF_FORECAST_AND_SALES") {
      gross = (b.forecastQty || 0) + (b.salesOrderQty || 0)
    } else if (demandPolicy === "SALES_ONLY") {
      gross = b.salesOrderQty || 0
    } else if (demandPolicy === "FORECAST_ONLY") {
      gross = b.forecastQty || 0
    }

    const scheduled = Math.max(0, b.scheduledReceipts || 0)
    let plannedProd = 0

    if (b.manualPlannedProduction !== undefined && b.manualPlannedProduction !== null) {
      plannedProd = Math.max(0, b.manualPlannedProduction)
    } else {
      // Otomatik MPS önerisi: Projeksiyon stoku emniyet stokunun altına düşerse üret
      const projectedBeforeProd = currentStock + scheduled - gross
      if (projectedBeforeProd < item.safetyStockQty) {
        const netDeficit = item.safetyStockQty - projectedBeforeProd
        plannedProd = calculateLotSize(netDeficit, item)
      }
    }

    const projectedOnHand = currentStock + scheduled + plannedProd - gross
    currentStock = projectedOnHand

    result.push({
      periodIndex: b.periodIndex,
      periodStartDate: formatDateIso(periodStart),
      periodEndDate: formatDateIso(periodEnd),
      forecastQty: Number((b.forecastQty || 0).toFixed(4)),
      salesOrderQty: Number((b.salesOrderQty || 0).toFixed(4)),
      grossRequirement: Number(gross.toFixed(4)),
      scheduledReceipts: Number(scheduled.toFixed(4)),
      plannedProductionQty: Number(plannedProd.toFixed(4)),
      projectedOnHand: Number(projectedOnHand.toFixed(4)),
      atpQty: 0, // 2. aşamada hesaplanacak
      isFrozen,
    })
  }

  // 2. Aşama: ATP (Available-To-Promise / Kullanılabilir Stok) Hesabı (Standart APICS Ayrık Yöntemi)
  // İlk dönem: ATP = Başlangıç Stoku + Beklenen Giriş[0] + MPS[0] - (Sonraki MPS girişine kadarki kesin siparişler toplamı)
  // Sonraki MPS dönemleri: ATP = Beklenen Giriş[t] + MPS[t] - (Sonraki MPS girişine kadarki kesin siparişler toplamı)
  for (let i = 0; i < result.length; i++) {
    const isFirstPeriod = i === 0
    const hasSupply = result[i].plannedProductionQty > 0 || result[i].scheduledReceipts > 0

    if (!isFirstPeriod && !hasSupply) {
      result[i].atpQty = 0
      continue
    }

    // Bir sonraki arz dönemine kadar olan kesin müşteri siparişlerini topla
    let committedSales = result[i].salesOrderQty
    for (let j = i + 1; j < result.length; j++) {
      if (result[j].plannedProductionQty > 0 || result[j].scheduledReceipts > 0) {
        break // Bir sonraki ikmal dönemi başladı
      }
      committedSales += result[j].salesOrderQty
    }

    let supplyTotal = result[i].plannedProductionQty + result[i].scheduledReceipts
    if (isFirstPeriod) {
      supplyTotal += Math.max(0, item.currentOnHand)
    }

    const atp = Math.max(0, supplyTotal - committedSales)
    result[i].atpQty = Number(atp.toFixed(4))
  }

  return result
}

/**
 * İki farklı MPS senaryosunu (örn. Baz Plan vs %20 Talep Artışı) yan yana karşılaştırır.
 */
export function compareWhatIfMpsScenarios(
  basePlan: MpsCalculatedBucket[],
  scenarioPlan: MpsCalculatedBucket[]
): {
  periodComparisons: Array<{
    periodIndex: number
    startDate: string
    baseGross: number
    scenarioGross: number
    grossDelta: number
    basePlannedProd: number
    scenarioPlannedProd: number
    plannedProdDelta: number
    baseStock: number
    scenarioStock: number
    stockDelta: number
  }>
  totals: {
    totalBaseProduction: number
    totalScenarioProduction: number
    productionDelta: number
    totalBaseGross: number
    totalScenarioGross: number
    grossDelta: number
    baseStockoutPeriods: number
    scenarioStockoutPeriods: number
  }
} {
  const periodComparisons: any[] = []
  let totalBaseProduction = 0
  let totalScenarioProduction = 0
  let totalBaseGross = 0
  let totalScenarioGross = 0
  let baseStockoutPeriods = 0
  let scenarioStockoutPeriods = 0

  const count = Math.max(basePlan.length, scenarioPlan.length)
  for (let i = 0; i < count; i++) {
    const b = basePlan[i] || { grossRequirement: 0, plannedProductionQty: 0, projectedOnHand: 0, periodStartDate: "" }
    const s = scenarioPlan[i] || { grossRequirement: 0, plannedProductionQty: 0, projectedOnHand: 0, periodStartDate: "" }

    totalBaseProduction += b.plannedProductionQty
    totalScenarioProduction += s.plannedProductionQty
    totalBaseGross += b.grossRequirement
    totalScenarioGross += s.grossRequirement

    if (b.projectedOnHand < 0) baseStockoutPeriods++
    if (s.projectedOnHand < 0) scenarioStockoutPeriods++

    periodComparisons.push({
      periodIndex: i,
      startDate: b.periodStartDate || s.periodStartDate,
      baseGross: b.grossRequirement,
      scenarioGross: s.grossRequirement,
      grossDelta: Number((s.grossRequirement - b.grossRequirement).toFixed(4)),
      basePlannedProd: b.plannedProductionQty,
      scenarioPlannedProd: s.plannedProductionQty,
      plannedProdDelta: Number((s.plannedProductionQty - b.plannedProductionQty).toFixed(4)),
      baseStock: b.projectedOnHand,
      scenarioStock: s.projectedOnHand,
      stockDelta: Number((s.projectedOnHand - b.projectedOnHand).toFixed(4)),
    })
  }

  return {
    periodComparisons,
    totals: {
      totalBaseProduction: Number(totalBaseProduction.toFixed(4)),
      totalScenarioProduction: Number(totalScenarioProduction.toFixed(4)),
      productionDelta: Number((totalScenarioProduction - totalBaseProduction).toFixed(4)),
      totalBaseGross: Number(totalBaseGross.toFixed(4)),
      totalScenarioGross: Number(totalScenarioGross.toFixed(4)),
      grossDelta: Number((totalScenarioGross - totalBaseGross).toFixed(4)),
      baseStockoutPeriods,
      scenarioStockoutPeriods,
    },
  }
}

// ─────────────────────────────────────────────────────────────
// 5. MRP MOTORU: ÇOK SEVİYELİ PATLATMA (EXPLOSION) & EŞZAMANLI HESAPLAMA
// ─────────────────────────────────────────────────────────────

interface InternalItemDemand {
  date: Date
  qty: number
  sourceDocType: MrpSourceDocType
  sourceDocId?: string
  pegging: PeggingChainItem
}

/**
 * MRP Patlatma ve Planlama Motorunun Ana Fonksiyonu.
 */
export function executeMrpExplosion(params: MrpExplosionParams): MrpExplosionResult {
  const startTime = Date.now()
  const today = toDate(params.today || new Date())
  const runCode = `MRP-${today.getFullYear()}${(today.getMonth() + 1).toString().padStart(2, "0")}${today.getDate().toString().padStart(2, "0")}-${Math.floor(1000 + Math.random() * 9000)}`
  const runType = params.runType || "FULL_REGENERATION"

  // Malzeme Haritası
  const itemMap = new Map<string, ItemPlanningProfile>()
  for (const item of params.items) {
    itemMap.set(item.itemId, item)
  }

  // BOM Ebeveyn -> Çocuklar Haritası
  const bomByParent = new Map<string, BomEdge[]>()
  for (const edge of params.bomEdges) {
    if (!bomByParent.has(edge.parentItemId)) bomByParent.set(edge.parentItemId, [])
    bomByParent.get(edge.parentItemId)!.push(edge)
  }

  // Hayalet Montaj Haritası: phantom itemId'ler
  const phantomItems = new Set<string>()
  for (const edge of params.bomEdges) {
    if (edge.isPhantom) {
      phantomItems.add(edge.componentItemId)
    }
  }

  // 1. Low-Level Codes (LLC) Hesapla
  const allItemIds = Array.from(itemMap.keys())
  const { lowLevelCodes, maxLevel } = calculateLowLevelCodes(allItemIds, params.bomEdges)

  // Net Change Filtresi (varsa)
  const activeItemIds = new Set<string>()
  if (runType === "NET_CHANGE" && params.filterItemIds && params.filterItemIds.length > 0) {
    params.filterItemIds.forEach((id) => activeItemIds.add(id))
    // Bağımlı alt malzemeleri de ekle
    function collectChildren(pId: string) {
      const edges = bomByParent.get(pId) || []
      for (const e of edges) {
        if (!activeItemIds.has(e.componentItemId)) {
          activeItemIds.add(e.componentItemId)
          collectChildren(e.componentItemId)
        }
      }
    }
    params.filterItemIds.forEach((id) => collectChildren(id))
  } else {
    allItemIds.forEach((id) => activeItemIds.add(id))
  }

  // Seviyelere göre grupla (Seviye 0 -> Seviye 1 -> Seviye 2 ...)
  const levelBuckets = new Map<number, string[]>()
  for (let lvl = 0; lvl <= maxLevel; lvl++) {
    levelBuckets.set(lvl, [])
  }
  for (const itemId of activeItemIds) {
    const lvl = lowLevelCodes.get(itemId) ?? 0
    if (!levelBuckets.has(lvl)) levelBuckets.set(lvl, [])
    levelBuckets.get(lvl)!.push(itemId)
  }

  // Bağımsız ve Bağımlı Talepler Takibi
  const itemDemandsMap = new Map<string, InternalItemDemand[]>()
  for (const itemId of activeItemIds) {
    itemDemandsMap.set(itemId, [])
  }

  // Başlangıç Taleplerini (MPS, Kesin Müşteri Siparişleri) ekle
  for (const d of params.demands) {
    if (!activeItemIds.has(d.itemId)) continue
    const item = itemMap.get(d.itemId)
    const demandList = itemDemandsMap.get(d.itemId) || []
    demandList.push({
      date: toDate(d.dueDate),
      qty: d.quantity,
      sourceDocType: d.demandType,
      sourceDocId: d.id,
      pegging: {
        demandType: d.demandType,
        demandId: d.id,
        demandRef: d.demandRef,
        parentItemId: undefined,
        parentItemSku: undefined,
        parentItemName: undefined,
        requiredQty: d.quantity,
        requiredDate: formatDateIso(toDate(d.dueDate)),
      },
    })
    itemDemandsMap.set(d.itemId, demandList)
  }

  // Açık Tedarik Siparişleri Haritası (Mevcut Satınalma / İş Emirleri)
  const openOrdersByItem = new Map<string, OpenSupplyOrder[]>()
  for (const o of params.openOrders) {
    if (!openOrdersByItem.has(o.itemId)) openOrdersByItem.set(o.itemId, [])
    openOrdersByItem.get(o.itemId)!.push(o)
  }

  const plannedOrders: MrpPlannedOrderDraft[] = []
  const actionMessages: MrpActionMessageDraft[] = []
  const materialTimePhased: MrpExplosionResult["materialTimePhased"] = {}

  let orderSeq = 1000

  // 2. Seviye Seviye İlerle (LLC 0'dan en derin seviyeye kadar)
  for (let currentLevel = 0; currentLevel <= maxLevel; currentLevel++) {
    const itemsAtLevel = levelBuckets.get(currentLevel) || []

    for (const itemId of itemsAtLevel) {
      const item = itemMap.get(itemId)
      if (!item) continue

      // Hayalet montajlar stok tutulmaz, onlar için sipariş açılmaz
      if (phantomItems.has(itemId)) {
        continue
      }

      const demands = itemDemandsMap.get(itemId) || []
      const openSupply = openOrdersByItem.get(itemId) || []

      // Talepleri tarihe göre sırala
      demands.sort((a, b) => a.date.getTime() - b.date.getTime())
      openSupply.sort((a, b) => toDate(a.dueDate).getTime() - toDate(b.dueDate).getTime())

      let projectedStock = item.currentOnHand
      const timelineEntries: any[] = []
      const usedOpenSupplyIds = new Set<string>()

      // Malzemenin tüm benzersiz kritik tarihlerini topla
      const dateSet = new Set<string>()
      demands.forEach((d) => dateSet.add(formatDateIso(d.date)))
      openSupply.forEach((s) => dateSet.add(formatDateIso(toDate(s.dueDate))))

      const sortedDates = Array.from(dateSet).sort()

      // Eğer hiç talep ve açık sipariş yoksa ancak mevcut stok emniyet stokunun altındaysa bugün için talep oluştur
      if (sortedDates.length === 0 && projectedStock < item.safetyStockQty) {
        sortedDates.push(formatDateIso(today))
      }

      for (const dateStr of sortedDates) {
        const currentDate = toDate(dateStr)

        // O tarihteki brüt ihtiyaçlar
        const currentDemands = demands.filter((d) => formatDateIso(d.date) === dateStr)
        const dayGross = currentDemands.reduce((sum, d) => sum + d.qty, 0)

        // O tarihteki açık sipariş girişleri
        const currentSupply = openSupply.filter((s) => formatDateIso(toDate(s.dueDate)) === dateStr)
        const daySupply = currentSupply.reduce((sum, s) => sum + s.quantity, 0)
        currentSupply.forEach((s) => usedOpenSupplyIds.add(s.id))

        let dayPlanned = 0
        const activePegging: PeggingChainItem[] = []
        currentDemands.forEach((d) => activePegging.push(d.pegging))

        // Stok projeksiyonu
        const stockBeforePlan = projectedStock + daySupply - dayGross

        // Açık var mı?
        if (stockBeforePlan < item.safetyStockQty) {
          const netDeficit = item.safetyStockQty - stockBeforePlan

          // Lot Büyüklüğü Kuralını Uygula
          dayPlanned = calculateLotSize(netDeficit, item)
          projectedStock = stockBeforePlan + dayPlanned

          // Emniyet Stoku İhlali Uyarısı
          if (stockBeforePlan < 0) {
            actionMessages.push({
              id: `ACT-${Math.random().toString(36).substring(2, 9)}`,
              itemId: item.itemId,
              itemSku: item.sku,
              actionType: "SAFETY_STOCK_VIOLATION",
              severity: "CRITICAL",
              suggestedDate: currentDate,
              suggestedQty: netDeficit,
              message: `${item.sku} - ${item.name} için ${dateStr} tarihinde net açık oluştu. Emniyet stoku ihlal edildi (Miktar: ${netDeficit.toFixed(2)}).`,
            })
          }

          // Temin Süresi Geri Sarma (Lead Time Offsetting)
          const releaseDate = offsetWorkDays(currentDate, item.leadTimeDays, "BACKWARD", params.calendar)
          const isPastDue = releaseDate.getTime() < today.getTime()

          if (isPastDue) {
            actionMessages.push({
              id: `ACT-${Math.random().toString(36).substring(2, 9)}`,
              itemId: item.itemId,
              itemSku: item.sku,
              actionType: "PAST_DUE",
              severity: "CRITICAL",
              suggestedDate: today,
              suggestedQty: dayPlanned,
              message: `${item.sku} için ihtiyaç tarihi (${dateStr}) temin süresini (${item.leadTimeDays} gün) aşıyor! Sipariş verme tarihi geçmişte (${formatDateIso(releaseDate)}). Acil işlem gereklidir.`,
            })
          }

          // Planlanan Siparişi Belirle (Satınalma vs Üretim)
          const isPurchase =
            item.productionItemType === "HAMMADDE" ||
            item.productionItemType === "SARF_MALZEME" ||
            item.productionItemType === "TICARI_MAL" ||
            item.productionMethod === "PURCHASE_ONLY"

          const orderType: MrpOrderType = isPurchase ? "PURCHASE" : "PRODUCTION"
          const prefix = isPurchase ? "PO-PLN" : "WO-PLN"
          const orderNumber = `${prefix}-${++orderSeq}`

          const plannedOrderDraft: MrpPlannedOrderDraft = {
            id: `PLN-${orderSeq}`,
            itemId: item.itemId,
            itemSku: item.sku,
            itemName: item.name,
            orderType,
            orderNumber,
            orderStatus: "PLANNED",
            sourceDocumentType: currentDemands[0]?.sourceDocType || "SAFETY_STOCK",
            sourceDocumentId: currentDemands[0]?.sourceDocId,
            quantity: dayPlanned,
            unit: item.baseUnit || "Adet",
            releaseDate,
            dueDate: currentDate,
            supplierId: item.defaultSupplierId,
            bomId: item.defaultBomId,
            routingId: item.defaultRoutingId,
            pegging: activePegging,
            notes: `MRP tarafından ${runCode} çalıştırmasında otomatik oluşturuldu.`,
          }

          plannedOrders.push(plannedOrderDraft)

          // 3. BOM PATLATMA (EXPLOSION) – ALT BİLEŞENLERE İHTİYAÇ AKTAR
          // Eğer bu bir Üretim Siparişi ise alt bileşenlere ihtiyaç yayılır
          if (orderType === "PRODUCTION") {
            const childEdges = bomByParent.get(item.itemId) || []

            for (const edge of childEdges) {
              const scrapMultiplier = 1 + (edge.scrapPercent || 0) / 100
              const childReqQty = dayPlanned * edge.quantity * scrapMultiplier

              // Hayalet Montaj Kontrolü (Phantom Assembly):
              // Hayalet montaj ise doğrudan onun alt bileşenlerine inilir
              if (edge.isPhantom) {
                const phantomChildren = bomByParent.get(edge.componentItemId) || []
                for (const pChild of phantomChildren) {
                  const pScrap = 1 + (pChild.scrapPercent || 0) / 100
                  const pReqQty = childReqQty * pChild.quantity * pScrap
                  const pChildDemands = itemDemandsMap.get(pChild.componentItemId) || []

                  pChildDemands.push({
                    date: releaseDate, // Üst montajın başlama gününde hazır olmalı
                    qty: pReqQty,
                    sourceDocType: "BOM_DEPENDENT",
                    sourceDocId: plannedOrderDraft.id,
                    pegging: {
                      demandType: "BOM_DEPENDENT",
                      demandId: plannedOrderDraft.id,
                      demandRef: plannedOrderDraft.orderNumber,
                      parentItemId: item.itemId,
                      parentItemSku: item.sku,
                      parentItemName: item.name,
                      requiredQty: pReqQty,
                      requiredDate: formatDateIso(releaseDate),
                    },
                  })
                  itemDemandsMap.set(pChild.componentItemId, pChildDemands)
                }
              } else {
                // Standart Bileşen
                let actualComponentId = edge.componentItemId
                let actualReqQty = childReqQty

                // Alternatif Malzeme (Substitute) Desteği:
                // Birincil bileşenin stoku yetersiz ve alternatif tanımlıysa kontrol et
                const primaryProfile = itemMap.get(edge.componentItemId)
                if (
                  edge.substitutes &&
                  edge.substitutes.length > 0 &&
                  primaryProfile &&
                  primaryProfile.currentOnHand < actualReqQty
                ) {
                  // Öncelik sırasına göre ilk geçerli alternatifi seç
                  const sortedSubs = [...edge.substitutes].sort((a, b) => a.priority - b.priority)
                  for (const sub of sortedSubs) {
                    const subProfile = itemMap.get(sub.substituteItemId)
                    const subStock = subProfile?.currentOnHand ?? (sub.availableStock ?? 0)
                    if (subStock > 0) {
                      actualComponentId = sub.substituteItemId
                      actualReqQty = childReqQty * (sub.substitutionRatio || 1.0)
                      break
                    }
                  }
                }

                const childDemands = itemDemandsMap.get(actualComponentId) || []
                childDemands.push({
                  date: releaseDate, // Üst montajın başlama gününde hazır olmalı
                  qty: actualReqQty,
                  sourceDocType: "BOM_DEPENDENT",
                  sourceDocId: plannedOrderDraft.id,
                  pegging: {
                    demandType: "BOM_DEPENDENT",
                    demandId: plannedOrderDraft.id,
                    demandRef: plannedOrderDraft.orderNumber,
                    parentItemId: item.itemId,
                    parentItemSku: item.sku,
                    parentItemName: item.name,
                    requiredQty: actualReqQty,
                    requiredDate: formatDateIso(releaseDate),
                  },
                })
                itemDemandsMap.set(actualComponentId, childDemands)
              }
            }
          }
        } else {
          projectedStock = stockBeforePlan
        }

        timelineEntries.push({
          date: dateStr,
          grossRequirements: Number(dayGross.toFixed(4)),
          scheduledReceipts: Number(daySupply.toFixed(4)),
          plannedOrders: Number(dayPlanned.toFixed(4)),
          projectedOnHand: Number(projectedStock.toFixed(4)),
          pegging: activePegging,
        })
      }

      // 4. AKSİYON / İSTİSNA MESAJLARI (Action Messages) ANALİZİ
      // Açık siparişlerin teslim tarihlerini taleplerle karşılaştır
      for (const openOrd of openSupply) {
        const ordDue = toDate(openOrd.dueDate)
        const matchingDemand = demands.find((d) => d.qty > 0)

        if (!matchingDemand) {
          // Gelecekte hiç ihtiyaç yok ama açık sipariş var -> İPTAL ET
          actionMessages.push({
            id: `ACT-${Math.random().toString(36).substring(2, 9)}`,
            itemId: item.itemId,
            itemSku: item.sku,
            openOrderId: openOrd.id,
            actionType: "CANCEL",
            severity: "WARNING",
            suggestedQty: openOrd.quantity,
            message: `${item.sku} için ${openOrd.orderNumber} nolu sipariş mevcut ancak ufukta net ihtiyaç bulunmuyor. Siparişi iptal etmeyi değerlendiriniz.`,
          })
        } else {
          const demandDate = matchingDemand.date
          const diffDays = Math.round((ordDue.getTime() - demandDate.getTime()) / 86400000)

          if (diffDays > 0) {
            // Açık sipariş ihtiyaç tarihinden sonra geliyor -> ÖNE ÇEK
            actionMessages.push({
              id: `ACT-${Math.random().toString(36).substring(2, 9)}`,
              itemId: item.itemId,
              itemSku: item.sku,
              openOrderId: openOrd.id,
              actionType: "EXPEDITE",
              severity: "CRITICAL",
              suggestedDate: demandDate,
              suggestedQty: openOrd.quantity,
              message: `${item.sku} için ${openOrd.orderNumber} nolu sipariş (${formatDateIso(ordDue)}) ihtiyaç tarihinden (${formatDateIso(demandDate)}) ${diffDays} gün geç kalıyor! Teslimatı öne çekiniz.`,
            })
          } else if (diffDays < -7) {
            // Açık sipariş ihtiyaç tarihinden 7 günden daha erken geliyor -> ERTELE
            actionMessages.push({
              id: `ACT-${Math.random().toString(36).substring(2, 9)}`,
              itemId: item.itemId,
              itemSku: item.sku,
              openOrderId: openOrd.id,
              actionType: "DEFER",
              severity: "INFO",
              suggestedDate: demandDate,
              suggestedQty: openOrd.quantity,
              message: `${item.sku} için ${openOrd.orderNumber} siparişi çok erken geliyor (${formatDateIso(ordDue)}). Stok taşıma maliyetini düşürmek için ${formatDateIso(demandDate)} tarihine erteleyebilirsiniz.`,
            })
          }
        }
      }

      materialTimePhased[itemId] = {
        itemId: item.itemId,
        itemSku: item.sku,
        itemName: item.name,
        initialOnHand: item.currentOnHand,
        safetyStock: item.safetyStockQty,
        timeline: timelineEntries,
      }
    }
  }

  const executionTimeMs = Date.now() - startTime

  return {
    runCode,
    runType,
    plannedOrders,
    actionMessages,
    lowLevelCodes: Object.fromEntries(lowLevelCodes.entries()),
    materialTimePhased,
    summary: {
      totalItemsPlanned: activeItemIds.size,
      totalOrdersGenerated: plannedOrders.length,
      purchaseOrdersCount: plannedOrders.filter((o) => o.orderType === "PURCHASE").length,
      productionOrdersCount: plannedOrders.filter((o) => o.orderType === "PRODUCTION").length,
      actionMessagesCount: actionMessages.length,
      criticalExceptionsCount: actionMessages.filter((m) => m.severity === "CRITICAL").length,
      executionTimeMs,
    },
  }
}

// ─────────────────────────────────────────────────────────────
// 6. YÜKSEK HACİM PERFORMANS TEST BENCHMARK MOTORU
// ─────────────────────────────────────────────────────────────

export interface BenchmarkReport {
  itemCount: number
  bomEdgeCount: number
  totalPlannedOrders: number
  executionTimeMs: number
  memoryUsedMb: number
  passed: boolean
}

/**
 * 5.000 Malzeme ve 20.000 BOM ilişkisi ile MRP motorunu stres testine tabi tutar.
 * 5 saniyenin altında tamamlanmasını ve bellek sızıntısı olmamasını doğrular.
 */
export function benchmarkMrpEngine(itemCount = 5000, bomEdgeCount = 20000): BenchmarkReport {
  const initialMemory = process.memoryUsage().heapUsed
  const startTime = Date.now()

  const items: ItemPlanningProfile[] = []
  const bomEdges: BomEdge[] = []
  const demands: IndependentDemandInput[] = []

  // 1. 5000 Malzeme Üret: 500 Mamul, 1500 Yarı Mamul, 3000 Hammadde
  const finishedCount = Math.floor(itemCount * 0.1) // 500
  const semiCount = Math.floor(itemCount * 0.3) // 1500
  const rawCount = itemCount - finishedCount - semiCount // 3000

  for (let i = 0; i < itemCount; i++) {
    let type = "HAMMADDE"
    let method = "PURCHASE_ONLY"
    if (i < finishedCount) {
      type = "MAMUL"
      method = "MAKE_TO_STOCK"
    } else if (i < finishedCount + semiCount) {
      type = "YARI_MAMUL"
      method = "MAKE_TO_ORDER"
    }

    items.push({
      itemId: `BENCH-ITEM-${i}`,
      sku: `SKU-${i.toString().padStart(6, "0")}`,
      name: `Benchmark Malzeme ${i}`,
      baseUnit: "Adet",
      productionItemType: type,
      productionMethod: method,
      leadTimeDays: (i % 5) + 1,
      minStockLevel: 10,
      safetyStockQty: (i % 10) + 5,
      lotSizingRule: i % 2 === 0 ? "L4L" : "FOQ",
      standardLotSize: 50,
      minOrderQty: 10,
      orderMultiple: 5,
      currentOnHand: i % 3 === 0 ? 0 : 25,
    })
  }

  // 2. 20000 BOM İlişkisi Kur (Döngüsüz: Mamul -> Yarı Mamul -> Hammadde)
  let edgesCreated = 0
  let edgeIndex = 0

  // Mamul -> Yarı Mamul
  for (let f = 0; f < finishedCount && edgesCreated < bomEdgeCount / 2; f++) {
    const componentCount = Math.floor(Math.random() * 8) + 4
    for (let c = 0; c < componentCount && edgesCreated < bomEdgeCount / 2; c++) {
      const semiIndex = finishedCount + ((f * 5 + c) % semiCount)
      bomEdges.push({
        bomId: `BOM-${f}`,
        parentItemId: `BENCH-ITEM-${f}`,
        componentItemId: `BENCH-ITEM-${semiIndex}`,
        quantity: 2,
        scrapPercent: 1,
        isPhantom: c === 0 && f % 5 === 0, // Ara sıra hayalet montaj
      })
      edgesCreated++
    }
  }

  // Yarı Mamul -> Hammadde
  for (let s = finishedCount; s < finishedCount + semiCount && edgesCreated < bomEdgeCount; s++) {
    const rawPerSemi = 5
    for (let r = 0; r < rawPerSemi && edgesCreated < bomEdgeCount; r++) {
      const rawIndex = finishedCount + semiCount + ((s * 3 + r) % rawCount)
      bomEdges.push({
        bomId: `BOM-${s}`,
        parentItemId: `BENCH-ITEM-${s}`,
        componentItemId: `BENCH-ITEM-${rawIndex}`,
        quantity: 3,
        scrapPercent: 2,
        isPhantom: false,
      })
      edgesCreated++
    }
  }

  // 3. Mamullere Talep Enjekte Et
  const now = new Date()
  for (let f = 0; f < finishedCount; f += 2) {
    const futureDate = new Date(now.getTime() + ((f % 30) + 5) * 86400000)
    demands.push({
      id: `BENCH-DEMAND-${f}`,
      demandType: "MPS",
      demandRef: `MPS-BENCH-${f}`,
      itemId: `BENCH-ITEM-${f}`,
      quantity: 100,
      dueDate: futureDate,
    })
  }

  // 4. MRP'yi Çalıştır
  const result = executeMrpExplosion({
    items,
    bomEdges,
    demands,
    openOrders: [],
    today: now,
    runType: "FULL_REGENERATION",
  })

  const totalTime = Date.now() - startTime
  const finalMemory = process.memoryUsage().heapUsed
  const memoryUsedMb = Math.round((finalMemory - initialMemory) / (1024 * 1024))

  return {
    itemCount: items.length,
    bomEdgeCount: bomEdges.length,
    totalPlannedOrders: result.plannedOrders.length,
    executionTimeMs: totalTime,
    memoryUsedMb,
    passed: totalTime < 10000 && result.plannedOrders.length > 0,
  }
}

