/**
 * SUNUM ERP – Üretim Yönetim Sistemi (Faz 3)
 * BOM (Ürün Reçetesi) & Rota (Routing) Saf İş Mantığı ve Matematiksel Hesaplama Motoru
 *
 * Sıfır veritabanı bağımlılığı (Pure TypeScript).
 * Doğrudan birim testlerine (unit testing) uygundur.
 */

import { z } from "zod"
import { ProductionDomainError } from "./productionAuditAndError"

// ─────────────────────────────────────────────────────────────
// TİPLER VE VERİ MODELLERİ
// ─────────────────────────────────────────────────────────────

export type BomStatus = "DRAFT" | "APPROVED" | "OBSOLETE"
export type RoutingStatus = "DRAFT" | "APPROVED" | "OBSOLETE"

export interface BomComponentRecord {
  id: string
  bomId: string
  componentItemId: string
  componentItemCode?: string
  componentItemName?: string
  componentItemType?: string
  lineNumber: number
  quantity: number
  unit: string
  unitConversionFactor: number
  scrapPercent: number
  isPhantom: boolean
  isVariantSpecific: boolean
  variantKey?: string | null
  operationSequence?: number | null
  unitCost?: number
  notes?: string | null
  substitutes?: BomSubstituteRecord[]
}

export interface BomSubstituteRecord {
  id: string
  bomItemId: string
  substituteItemId: string
  substituteItemCode?: string
  substituteItemName?: string
  priority: number
  substitutionRatio: number
  isMandatoryApproval: boolean
  unitCost?: number
  notes?: string | null
}

export interface BomHeaderRecord {
  id: string
  branchId?: string | null
  finishedItemId: string
  finishedItemCode?: string
  finishedItemName?: string
  code: string
  name: string
  revision: string
  status: BomStatus
  effectiveStartDate?: string | null
  effectiveEndDate?: string | null
  baseQuantity: number
  baseUnit: string
  isPhantom: boolean
  variantCode?: string | null
  yieldPercent: number
  totalMaterialCost: number
  totalLaborCost: number
  totalOverheadCost: number
  totalTheoreticalCost: number
  approvedAt?: string | null
  approvedBy?: string | null
  notes?: string | null
  isActive: boolean
  createdAt?: string | Date
  updatedAt?: string | Date
  components?: BomComponentRecord[]
}

export interface RoutingOperationRecord {
  id: string
  routingId: string
  operationNumber: number
  name: string
  description?: string | null
  workCenterId: string
  workCenterCode?: string
  workCenterName?: string
  workCenterHourlyCost?: number
  setupTimeMinutes: number
  runTimeMinutes: number
  waitOrTransportTimeMinutes: number
  workerCount: number
  isSubcontracted: boolean
  subcontractorName?: string | null
  subcontractUnitCost: number
  isQualityControlPoint: boolean
  qualityInspectionType?: string | null
  calculatedHourlyCost: number
  totalOperationCost: number
  alternativeWorkCenters?: {
    id: string
    workCenterId: string
    workCenterCode?: string
    workCenterName?: string
    priority: number
    efficiencyFactor: number
  }[]
  materialAllocations?: {
    bomItemId: string
    consumptionTiming: string
  }[]
}

export interface RoutingHeaderRecord {
  id: string
  branchId?: string | null
  bomId?: string | null
  finishedItemId: string
  finishedItemCode?: string
  finishedItemName?: string
  code: string
  name: string
  revision: string
  status: RoutingStatus
  totalSetupTimeMinutes: number
  totalRunTimeMinutes: number
  totalHourlyCost: number
  totalRoutingCost: number
  approvedAt?: string | null
  approvedBy?: string | null
  notes?: string | null
  isActive: boolean
  createdAt?: string | Date
  updatedAt?: string | Date
  operations?: RoutingOperationRecord[]
}

// ─────────────────────────────────────────────────────────────
// ZOD DOĞRULAMA ŞEMALARI
// ─────────────────────────────────────────────────────────────

export const BomHeaderInputSchema = z.object({
  finishedItemId: z.string().min(1, "Mamul / stok kartı seçimi zorunludur."),
  code: z
    .string()
    .min(2, "Reçete kodu en az 2 karakter olmalıdır.")
    .max(50, "Reçete kodu en fazla 50 karakter olabilir.")
    .regex(/^[A-Z0-9_-]+$/i, "Reçete kodu yalnızca harf, rakam, tire ve alt çizgi içerebilir."),
  name: z.string().min(2, "Reçete adı en az 2 karakter olmalıdır.").max(120),
  revision: z.string().default("01"),
  effectiveStartDate: z.string().optional().nullable(),
  effectiveEndDate: z.string().optional().nullable(),
  baseQuantity: z.number().positive("Üretim temel miktarı 0'dan büyük olmalıdır.").default(1),
  baseUnit: z.string().min(1, "Temel birim zorunludur.").default("Adet"),
  isPhantom: z.boolean().default(false),
  variantCode: z.string().optional().nullable(),
  yieldPercent: z.number().min(1, "Randıman/verim % en az 1 olmalıdır.").max(100, "Randıman %100'ü geçemez.").default(100),
  notes: z.string().optional().nullable(),
  branchId: z.string().optional().nullable(),
})

export const BomItemInputSchema = z.object({
  bomId: z.string().min(1, "Reçete kimliği zorunludur."),
  componentItemId: z.string().min(1, "Bileşen malzeme seçimi zorunludur."),
  lineNumber: z.number().int().positive().default(10),
  quantity: z.number().positive("Bileşen miktarı 0'dan büyük olmalıdır."),
  unit: z.string().min(1, "Birim zorunludur.").default("Adet"),
  unitConversionFactor: z.number().positive("Birim dönüşüm katsayısı pozitif olmalıdır.").default(1.0),
  scrapPercent: z.number().min(0, "Fire oranı 0 veya pozitif olmalıdır.").max(100, "Fire %100'ü geçemez.").default(0),
  isPhantom: z.boolean().default(false),
  isVariantSpecific: z.boolean().default(false),
  variantKey: z.string().optional().nullable(),
  operationSequence: z.number().int().positive().optional().nullable(),
  notes: z.string().optional().nullable(),
})

export const BomSubstituteInputSchema = z.object({
  bomItemId: z.string().min(1, "Reçete kalemi zorunludur."),
  substituteItemId: z.string().min(1, "İkame malzeme seçimi zorunludur."),
  priority: z.number().int().min(1, "Öncelik 1 veya daha büyük olmalıdır.").default(1),
  substitutionRatio: z.number().positive("İkame oranı pozitif olmalıdır.").default(1.0),
  isMandatoryApproval: z.boolean().default(false),
  notes: z.string().optional().nullable(),
})

export const RoutingHeaderInputSchema = z.object({
  finishedItemId: z.string().min(1, "Mamul stok kartı seçimi zorunludur."),
  bomId: z.string().optional().nullable(),
  code: z
    .string()
    .min(2, "Rota kodu en az 2 karakter olmalıdır.")
    .max(50)
    .regex(/^[A-Z0-9_-]+$/i, "Rota kodu yalnızca harf, rakam, tire ve alt çizgi içerebilir."),
  name: z.string().min(2, "Rota adı en az 2 karakter olmalıdır.").max(120),
  revision: z.string().default("01"),
  notes: z.string().optional().nullable(),
  branchId: z.string().optional().nullable(),
})

export const OperationInputSchema = z.object({
  routingId: z.string().min(1, "Rota kimliği zorunludur."),
  operationNumber: z.number().int().positive("Operasyon sırası pozitif bir sayı olmalıdır (Örn: 10, 20)."),
  name: z.string().min(2, "Operasyon adı en az 2 karakter olmalıdır.").max(100),
  description: z.string().optional().nullable(),
  workCenterId: z.string().min(1, "İş merkezi seçimi zorunludur."),
  setupTimeMinutes: z.number().min(0, "Hazırlık süresi negatif olamaz.").default(0),
  runTimeMinutes: z.number().min(0, "İşlem süresi negatif olamaz.").default(0),
  waitOrTransportTimeMinutes: z.number().min(0, "Bekleme/taşıma süresi negatif olamaz.").default(0),
  workerCount: z.number().int().min(1, "İşçi sayısı en az 1 olmalıdır.").default(1),
  isSubcontracted: z.boolean().default(false),
  subcontractorName: z.string().optional().nullable(),
  subcontractUnitCost: z.number().min(0).default(0),
  isQualityControlPoint: z.boolean().default(false),
  qualityInspectionType: z.string().optional().nullable(),
})

export function validateBomHeaderInput(input: unknown) {
  const result = BomHeaderInputSchema.safeParse(input)
  if (!result.success) {
    throw new ProductionDomainError(
      "VALIDATION_ERROR",
      result.error.errors.map((e) => e.message).join(", ")
    )
  }
  return result.data
}

export function validateBomItemInput(input: unknown) {
  const result = BomItemInputSchema.safeParse(input)
  if (!result.success) {
    throw new ProductionDomainError(
      "VALIDATION_ERROR",
      result.error.errors.map((e) => e.message).join(", ")
    )
  }
  return result.data
}

export function validateBomSubstituteInput(input: unknown) {
  const result = BomSubstituteInputSchema.safeParse(input)
  if (!result.success) {
    throw new ProductionDomainError(
      "VALIDATION_ERROR",
      result.error.errors.map((e) => e.message).join(", ")
    )
  }
  return result.data
}

export function validateRoutingHeaderInput(input: unknown) {
  const result = RoutingHeaderInputSchema.safeParse(input)
  if (!result.success) {
    throw new ProductionDomainError(
      "VALIDATION_ERROR",
      result.error.errors.map((e) => e.message).join(", ")
    )
  }
  return result.data
}

export function validateOperationInput(input: unknown) {
  const result = OperationInputSchema.safeParse(input)
  if (!result.success) {
    throw new ProductionDomainError(
      "VALIDATION_ERROR",
      result.error.errors.map((e) => e.message).join(", ")
    )
  }
  return result.data
}

// ─────────────────────────────────────────────────────────────
// 1. DÖNGÜSEL REFERANS (CIRCULAR DEPENDENCY) ENGELLEYİCİSİ
// ─────────────────────────────────────────────────────────────

export interface CircularCheckEdge {
  parentItemId: string
  childItemId: string
}

/**
 * Reçeteye yeni bir bileşen eklenmek istendiğinde döngüsel bağımlılık (A -> B -> C -> A)
 * oluşup oluşmayacağını Derinlemesine Arama (DFS) algoritması ile denetler.
 */
export function detectBomCircularDependency(params: {
  parentFinishedItemId: string
  candidateComponentItemId: string
  existingBoms: { finishedItemId: string; components?: { componentItemId: string }[] }[]
}): { hasCycle: boolean; cyclePath: string[]; message?: string } {
  const { parentFinishedItemId, candidateComponentItemId, existingBoms } = params

  // Doğrudan kendi kendine referans: Ürün kendi reçetesinde bileşen olamaz
  if (parentFinishedItemId === candidateComponentItemId) {
    return {
      hasCycle: true,
      cyclePath: [parentFinishedItemId, candidateComponentItemId],
      message: "Bir mamul kendi reçetesinde bileşen olarak kullanılamaz (Doğrudan döngü).",
    }
  }

  // Bağımlılık çizgesi (Adjacency List): FinishedItem -> Set of ComponentItems
  const graph = new Map<string, Set<string>>()
  for (const bom of existingBoms) {
    if (!graph.has(bom.finishedItemId)) {
      graph.set(bom.finishedItemId, new Set())
    }
    for (const comp of bom.components || []) {
      graph.get(bom.finishedItemId)!.add(comp.componentItemId)
    }
  }

  // Aday bağlantıyı çizgeye geçici olarak ekle
  if (!graph.has(parentFinishedItemId)) {
    graph.set(parentFinishedItemId, new Set())
  }
  graph.get(parentFinishedItemId)!.add(candidateComponentItemId)

  // candidateComponentItemId'den başlayarak parentFinishedItemId'ye ulaşılabiliyor mu DFS ile kontrol et
  const visited = new Set<string>()
  const path: string[] = []

  function dfs(curr: string): boolean {
    if (curr === parentFinishedItemId) {
      path.push(curr)
      return true
    }
    visited.add(curr)
    path.push(curr)

    const neighbors = graph.get(curr)
    if (neighbors) {
      for (const next of neighbors) {
        if (!visited.has(next)) {
          if (dfs(next)) return true
        } else if (next === parentFinishedItemId) {
          path.push(next)
          return true
        }
      }
    }

    path.pop()
    return false
  }

  const reached = dfs(candidateComponentItemId)
  if (reached) {
    const fullPath = [parentFinishedItemId, ...path]
    return {
      hasCycle: true,
      cyclePath: fullPath,
      message: `Döngüsel reçete referansı engellendi: ${fullPath.join(" -> ")}`,
    }
  }

  return { hasCycle: false, cyclePath: [] }
}

// ─────────────────────────────────────────────────────────────
// 2. ÇOK SEVİYELİ REÇETE PATLATMA (BOM EXPLOSION) & PHANTOM
// ─────────────────────────────────────────────────────────────

export interface ExplodedTreeNode {
  level: number
  path: string
  itemId: string
  itemCode: string
  itemName: string
  itemType?: string
  unit: string
  unitRequiredQty: number // 1 birim nihai mamul için gereken miktar
  totalRequiredQty: number // İstenen parti için kümülatif miktar
  scrapPercent: number
  grossQtyWithScrap: number // Fire eklenmiş brüt ihtiyaç
  isPhantom: boolean
  unitCost: number
  totalCost: number
  substitutes?: {
    substituteItemId: string
    substituteItemCode: string
    substituteItemName: string
    priority: number
    substitutionRatio: number
  }[]
  children: ExplodedTreeNode[]
}

export interface FlattenedMaterialSummary {
  itemId: string
  itemCode: string
  itemName: string
  itemType?: string
  unit: string
  totalNetQuantity: number
  totalGrossQuantity: number
  estimatedUnitCost: number
  totalEstimatedCost: number
  usedInLevels: number[]
  substitutesCount: number
}

export interface ExplodeBomResult {
  rootFinishedItemId: string
  rootBomCode: string
  rootQuantity: number
  maxDepthReached: number
  tree: ExplodedTreeNode
  flattenedSummary: FlattenedMaterialSummary[]
  totalEstimatedMaterialCost: number
}

/**
 * Verilen bir reçeteyi N seviye derinliğe kadar özyineli (recursive) patlatır.
 * - Phantom (Hayalet) yarı mamulleri tespit edip alt bileşenlerini üst seviyeye taşır.
 * - Seviyeler arası miktar çarpanlarını ve fire (scrap) oranlarını kümülatif hesaplar.
 * - Çift yönde hem hiyerarşik ağaç hem de düzleştirilmiş (flattened) hammadde özeti üretir.
 */
export function explodeBomTree(params: {
  rootBom: BomHeaderRecord
  targetQuantity?: number
  allBoms: BomHeaderRecord[]
  itemCostMap?: Record<string, number>
  maxDepth?: number
}): ExplodeBomResult {
  const { rootBom, allBoms, itemCostMap = {}, maxDepth = 15 } = params
  const targetQuantity = params.targetQuantity && params.targetQuantity > 0 ? params.targetQuantity : rootBom.baseQuantity

  // Hızlı erişim için mamul/yarı-mamul bazlı onaylı veya aktif reçete tablosu
  const bomMapByFinishedItem = new Map<string, BomHeaderRecord>()
  for (const b of allBoms) {
    if (b.isActive && b.status !== "OBSOLETE") {
      // Eğer daha önce yoksa veya onaylıysa tercih et
      if (!bomMapByFinishedItem.has(b.finishedItemId) || b.status === "APPROVED") {
        bomMapByFinishedItem.set(b.finishedItemId, b)
      }
    }
  }

  let maxDepthReached = 0
  const flattenedMap = new Map<string, FlattenedMaterialSummary>()

  function explodeNode(
    itemId: string,
    itemCode: string,
    itemName: string,
    itemType: string | undefined,
    multiplier: number,
    level: number,
    currentPath: string
  ): ExplodedTreeNode {
    if (level > maxDepthReached) maxDepthReached = level

    const childBom = bomMapByFinishedItem.get(itemId)
    const nodeUnitCost = itemCostMap[itemId] || 0
    const nodeTotalCost = multiplier * nodeUnitCost

    const node: ExplodedTreeNode = {
      level,
      path: currentPath,
      itemId,
      itemCode,
      itemName,
      itemType,
      unit: childBom ? childBom.baseUnit : "Adet",
      unitRequiredQty: multiplier / targetQuantity,
      totalRequiredQty: multiplier,
      scrapPercent: 0,
      grossQtyWithScrap: multiplier,
      isPhantom: Boolean(childBom?.isPhantom),
      unitCost: nodeUnitCost,
      totalCost: nodeTotalCost,
      children: [],
    }

    if (!childBom || !childBom.components || childBom.components.length === 0 || level >= maxDepth) {
      // Yaprak bileşen (Leaf component / hammadde veya en alt seviye)
      const existing = flattenedMap.get(itemId)
      if (existing) {
        existing.totalNetQuantity += multiplier
        existing.totalGrossQuantity += multiplier
        existing.totalEstimatedCost += multiplier * existing.estimatedUnitCost
        if (!existing.usedInLevels.includes(level)) existing.usedInLevels.push(level)
      } else {
        flattenedMap.set(itemId, {
          itemId,
          itemCode,
          itemName,
          itemType,
          unit: node.unit,
          totalNetQuantity: multiplier,
          totalGrossQuantity: multiplier,
          estimatedUnitCost: nodeUnitCost,
          totalEstimatedCost: multiplier * nodeUnitCost,
          usedInLevels: [level],
          substitutesCount: 0,
        })
      }
      return node
    }

    for (const comp of childBom.components) {
      const compUnit = comp.unit || "Adet"
      const compScrap = comp.scrapPercent || 0
      const compFactor = comp.unitConversionFactor || 1.0
      // 1 üst birim için gereken miktar * çarpan
      const netQtyForComp = (comp.quantity * compFactor * multiplier) / childBom.baseQuantity
      const grossQtyForComp = netQtyForComp * (1 + compScrap / 100)

      const compItemCode = comp.componentItemCode || comp.componentItemId
      const compItemName = comp.componentItemName || comp.componentItemId
      const compPath = `${currentPath} > ${compItemCode}`

      // Phantom (Hayalet yarı mamul) kontrolü: Eğer bileşenin kendi reçetesi phantom ise
      const subBom = bomMapByFinishedItem.get(comp.componentItemId)
      const isPhantomComponent = comp.isPhantom || Boolean(subBom?.isPhantom)

      const childNode = explodeNode(
        comp.componentItemId,
        compItemCode,
        compItemName,
        comp.componentItemType,
        grossQtyForComp,
        level + 1,
        compPath
      )

      childNode.scrapPercent = compScrap
      childNode.grossQtyWithScrap = grossQtyForComp
      childNode.isPhantom = isPhantomComponent
      childNode.unit = compUnit

      // İkameleri ata
      if (comp.substitutes && comp.substitutes.length > 0) {
        childNode.substitutes = comp.substitutes.map((s) => ({
          substituteItemId: s.substituteItemId,
          substituteItemCode: s.substituteItemCode || s.substituteItemId,
          substituteItemName: s.substituteItemName || s.substituteItemId,
          priority: s.priority,
          substitutionRatio: s.substitutionRatio,
        }))
        const flat = flattenedMap.get(comp.componentItemId)
        if (flat) flat.substitutesCount = comp.substitutes.length
      }

      node.children.push(childNode)
    }

    return node
  }

  const rootNode = explodeNode(
    rootBom.finishedItemId,
    rootBom.finishedItemCode || rootBom.code,
    rootBom.finishedItemName || rootBom.name,
    "MAMUL",
    targetQuantity,
    0,
    rootBom.code
  )

  const flattenedSummary = Array.from(flattenedMap.values()).sort((a, b) =>
    a.itemCode.localeCompare(b.itemCode)
  )

  const totalEstimatedMaterialCost = flattenedSummary.reduce(
    (sum, m) => sum + m.totalEstimatedCost,
    0
  )

  return {
    rootFinishedItemId: rootBom.finishedItemId,
    rootBomCode: rootBom.code,
    rootQuantity: targetQuantity,
    maxDepthReached,
    tree: rootNode,
    flattenedSummary,
    totalEstimatedMaterialCost,
  }
}

// ─────────────────────────────────────────────────────────────
// 3. TEORİK BİRİM MALİYET (ROLL-UP) HESAPLAYICISI
// ─────────────────────────────────────────────────────────────

export interface BomCostRollupCalculationResult {
  bomId: string
  baseQuantity: number
  baseUnit: string
  totalMaterialCost: number
  totalLaborCost: number
  totalOverheadCost: number
  totalSubcontractCost: number
  totalTheoreticalCost: number
  unitTheoreticalCost: number
  materialCostBreakdown: {
    componentItemId: string
    componentItemCode: string
    componentItemName: string
    quantity: number
    scrapPercent: number
    unitCost: number
    totalCost: number
  }[]
  operationCostBreakdown: {
    operationNumber: number
    operationName: string
    workCenterCode: string
    setupCost: number
    runCost: number
    subcontractCost: number
    totalOperationCost: number
  }[]
}

/**
 * Malzeme birim maliyetleri, fire oranları ve rota operasyon sürelerinden
 * hareketle kurumsal standart reçete maliyetini (Rollup Cost) hesaplar.
 */
export function calculateTheoreticalBomCost(params: {
  bom: BomHeaderRecord
  routing?: RoutingHeaderRecord | null
  itemCostMap: Record<string, number>
  workCenterHourlyCostMap?: Record<string, number>
}): BomCostRollupCalculationResult {
  const { bom, routing, itemCostMap, workCenterHourlyCostMap = {} } = params
  const baseQty = bom.baseQuantity > 0 ? bom.baseQuantity : 1

  // 1. Malzeme Maliyetleri
  let totalMaterialCost = 0
  const materialCostBreakdown: BomCostRollupCalculationResult["materialCostBreakdown"] = []

  for (const comp of bom.components || []) {
    const unitCost = itemCostMap[comp.componentItemId] ?? comp.unitCost ?? 0
    const factor = comp.unitConversionFactor || 1.0
    const scrapMultiplier = 1 + (comp.scrapPercent || 0) / 100
    const effectiveQty = comp.quantity * factor * scrapMultiplier
    const lineCost = effectiveQty * unitCost

    totalMaterialCost += lineCost
    materialCostBreakdown.push({
      componentItemId: comp.componentItemId,
      componentItemCode: comp.componentItemCode || comp.componentItemId,
      componentItemName: comp.componentItemName || comp.componentItemId,
      quantity: comp.quantity,
      scrapPercent: comp.scrapPercent || 0,
      unitCost,
      totalCost: Number(lineCost.toFixed(2)),
    })
  }

  // 2. Operasyonel İşçilik, Makine ve Dış Kaynak Maliyetleri (Rota)
  let totalLaborCost = 0
  let totalOverheadCost = 0
  let totalSubcontractCost = 0
  const operationCostBreakdown: BomCostRollupCalculationResult["operationCostBreakdown"] = []

  if (routing && routing.operations && routing.operations.length > 0) {
    for (const op of routing.operations) {
      const hourlyRate =
        workCenterHourlyCostMap[op.workCenterId] ??
        op.workCenterHourlyCost ??
        op.calculatedHourlyCost ??
        0

      // Hazırlık maliyeti: (Hazırlık dk / 60) * Saatlik Ücret (partiye bölünür)
      const setupHours = (op.setupTimeMinutes || 0) / 60
      const setupCost = setupHours * hourlyRate

      // İşlem süresi maliyeti: (İşlem dk / 60) * Saatlik Ücret * İşçi Sayısı
      const runHours = (op.runTimeMinutes || 0) / 60
      const workers = op.workerCount > 0 ? op.workerCount : 1
      const runCost = runHours * hourlyRate * workers

      // Fason maliyeti
      const subcontractCost = op.isSubcontracted ? (op.subcontractUnitCost || 0) * baseQty : 0

      const opTotal = setupCost + runCost + subcontractCost

      totalLaborCost += runCost
      totalOverheadCost += setupCost
      totalSubcontractCost += subcontractCost

      operationCostBreakdown.push({
        operationNumber: op.operationNumber,
        operationName: op.name,
        workCenterCode: op.workCenterCode || op.workCenterId,
        setupCost: Number(setupCost.toFixed(2)),
        runCost: Number(runCost.toFixed(2)),
        subcontractCost: Number(subcontractCost.toFixed(2)),
        totalOperationCost: Number(opTotal.toFixed(2)),
      })
    }
  }

  // Randıman / Fire toleransı düzeltmesi
  const yieldFactor = (bom.yieldPercent || 100) / 100
  const adjustedMaterialCost = totalMaterialCost / yieldFactor

  const totalCost = adjustedMaterialCost + totalLaborCost + totalOverheadCost + totalSubcontractCost
  const unitTheoreticalCost = totalCost / baseQty

  return {
    bomId: bom.id,
    baseQuantity: baseQty,
    baseUnit: bom.baseUnit || "Adet",
    totalMaterialCost: Number(adjustedMaterialCost.toFixed(2)),
    totalLaborCost: Number(totalLaborCost.toFixed(2)),
    totalOverheadCost: Number(totalOverheadCost.toFixed(2)),
    totalSubcontractCost: Number(totalSubcontractCost.toFixed(2)),
    totalTheoreticalCost: Number(totalCost.toFixed(2)),
    unitTheoreticalCost: Number(unitTheoreticalCost.toFixed(2)),
    materialCostBreakdown,
    operationCostBreakdown,
  }
}

// ─────────────────────────────────────────────────────────────
// 4. REVİZYON KARŞILAŞTIRMA (DIFF) MOTORU
// ─────────────────────────────────────────────────────────────

export interface BomRevisionDiffResult {
  bomIdA: string
  revisionA: string
  bomIdB: string
  revisionB: string
  addedComponents: BomComponentRecord[]
  removedComponents: BomComponentRecord[]
  modifiedComponents: {
    componentItemId: string
    componentItemCode: string
    componentItemName: string
    oldQuantity: number
    newQuantity: number
    oldScrapPercent: number
    newScrapPercent: number
    oldUnit: string
    newUnit: string
  }[]
  costDifference: {
    materialCostDelta: number
    totalCostDelta: number
    percentageChange: number
  }
  unchangedCount: number
}

/**
 * İki farklı reçete revizyonunu karşılaştırıp eklenen, silinen ve
 * miktarı/firesi değişen kalemleri analiz eder.
 */
export function compareBomRevisions(
  bomA: BomHeaderRecord,
  bomB: BomHeaderRecord
): BomRevisionDiffResult {
  const mapA = new Map<string, BomComponentRecord>()
  for (const c of bomA.components || []) {
    mapA.set(c.componentItemId, c)
  }

  const mapB = new Map<string, BomComponentRecord>()
  for (const c of bomB.components || []) {
    mapB.set(c.componentItemId, c)
  }

  const addedComponents: BomComponentRecord[] = []
  const removedComponents: BomComponentRecord[] = []
  const modifiedComponents: BomRevisionDiffResult["modifiedComponents"] = []
  let unchangedCount = 0

  for (const [itemId, compB] of mapB.entries()) {
    if (!mapA.has(itemId)) {
      addedComponents.push(compB)
    } else {
      const compA = mapA.get(itemId)!
      const qtyChanged = compA.quantity !== compB.quantity
      const scrapChanged = compA.scrapPercent !== compB.scrapPercent
      const unitChanged = compA.unit !== compB.unit

      if (qtyChanged || scrapChanged || unitChanged) {
        modifiedComponents.push({
          componentItemId: itemId,
          componentItemCode: compB.componentItemCode || itemId,
          componentItemName: compB.componentItemName || itemId,
          oldQuantity: compA.quantity,
          newQuantity: compB.quantity,
          oldScrapPercent: compA.scrapPercent || 0,
          newScrapPercent: compB.scrapPercent || 0,
          oldUnit: compA.unit,
          newUnit: compB.unit,
        })
      } else {
        unchangedCount++
      }
    }
  }

  for (const [itemId, compA] of mapA.entries()) {
    if (!mapB.has(itemId)) {
      removedComponents.push(compA)
    }
  }

  const costA = bomA.totalTheoreticalCost || 0
  const costB = bomB.totalTheoreticalCost || 0
  const totalCostDelta = Number((costB - costA).toFixed(2))
  const percentageChange = costA > 0 ? Number((((costB - costA) / costA) * 100).toFixed(1)) : 0

  return {
    bomIdA: bomA.id,
    revisionA: bomA.revision,
    bomIdB: bomB.id,
    revisionB: bomB.revision,
    addedComponents,
    removedComponents,
    modifiedComponents,
    costDifference: {
      materialCostDelta: Number(((bomB.totalMaterialCost || 0) - (bomA.totalMaterialCost || 0)).toFixed(2)),
      totalCostDelta,
      percentageChange,
    },
    unchangedCount,
  }
}

// ─────────────────────────────────────────────────────────────
// 5. NEREDE KULLANILIYOR (WHERE-USED) TERS AĞAÇ SORGUSU
// ─────────────────────────────────────────────────────────────

export interface WhereUsedResultItem {
  level: number
  bomId: string
  bomCode: string
  bomName: string
  revision: string
  finishedItemId: string
  finishedItemCode: string
  finishedItemName: string
  quantityUsed: number
  unit: string
  isDirect: boolean
}

/**
 * Belirli bir hammadde veya yarı mamulün Sunum ERP içindeki hangi mamullerin
 * reçetelerinde kullanıldığını (ters ağaç) hiyerarşik olarak bulur.
 */
export function findWhereUsedInBoms(params: {
  targetItemId: string
  allBoms: BomHeaderRecord[]
  maxDepth?: number
}): WhereUsedResultItem[] {
  const { targetItemId, allBoms, maxDepth = 10 } = params
  const results: WhereUsedResultItem[] = []
  const visited = new Set<string>()

  function traceUpwards(currentSearchItemId: string, level: number) {
    if (level > maxDepth) return

    for (const b of allBoms) {
      if (!b.isActive) continue
      const matchComp = (b.components || []).find((c) => c.componentItemId === currentSearchItemId)
      if (matchComp) {
        const key = `${b.id}-${currentSearchItemId}-${level}`
        if (!visited.has(key)) {
          visited.add(key)
          results.push({
            level,
            bomId: b.id,
            bomCode: b.code,
            bomName: b.name,
            revision: b.revision,
            finishedItemId: b.finishedItemId,
            finishedItemCode: b.finishedItemCode || b.code,
            finishedItemName: b.finishedItemName || b.name,
            quantityUsed: matchComp.quantity,
            unit: matchComp.unit,
            isDirect: level === 1,
          })
          // Bu üst mamul başka bir yerde bileşen olarak kullanılıyor mu?
          traceUpwards(b.finishedItemId, level + 1)
        }
      }
    }
  }

  traceUpwards(targetItemId, 1)
  return results.sort((a, b) => a.level - b.level || a.finishedItemCode.localeCompare(b.finishedItemCode))
}

// ─────────────────────────────────────────────────────────────
// 6. CSV & EXCEL UYUMLU İÇE / DIŞA AKTARMA (IMPORT / EXPORT)
// ─────────────────────────────────────────────────────────────

export interface BomCsvExportRow {
  ReçeteKodu: string
  ReçeteAdı: string
  Revizyon: string
  MamulKodu: string
  TemelMiktar: number
  TemelBirim: string
  HayaletReçete: string
  KalemSıraNo: number
  BileşenKodu: string
  BileşenMiktarı: number
  BileşenBirimi: string
  FireYüzdesi: number
  OperasyonAdımı?: string | number
  Açıklama?: string
}

export function generateBomCsvContent(boms: BomHeaderRecord[]): string {
  // Excel UTF-8 BOM byte marker
  let csv = "\uFEFF"
  const headers = [
    "ReçeteKodu",
    "ReçeteAdı",
    "Revizyon",
    "MamulKodu",
    "TemelMiktar",
    "TemelBirim",
    "HayaletReçete",
    "KalemSıraNo",
    "BileşenKodu",
    "BileşenMiktarı",
    "BileşenBirimi",
    "FireYüzdesi",
    "OperasyonSırası",
    "Açıklama",
  ]
  csv += headers.join(";") + "\r\n"

  for (const bom of boms) {
    const comps = bom.components || []
    if (comps.length === 0) {
      csv +=
        [
          `"${bom.code}"`,
          `"${bom.name}"`,
          `"${bom.revision}"`,
          `"${bom.finishedItemCode || bom.finishedItemId}"`,
          bom.baseQuantity,
          `"${bom.baseUnit}"`,
          bom.isPhantom ? "EVET" : "HAYIR",
          10,
          '""',
          0,
          '""',
          0,
          "",
          `"${bom.notes || ""}"`,
        ].join(";") + "\r\n"
      continue
    }

    for (const c of comps) {
      csv +=
        [
          `"${bom.code}"`,
          `"${bom.name}"`,
          `"${bom.revision}"`,
          `"${bom.finishedItemCode || bom.finishedItemId}"`,
          bom.baseQuantity,
          `"${bom.baseUnit}"`,
          bom.isPhantom ? "EVET" : "HAYIR",
          c.lineNumber,
          `"${c.componentItemCode || c.componentItemId}"`,
          c.quantity,
          `"${c.unit}"`,
          c.scrapPercent || 0,
          c.operationSequence || "",
          `"${c.notes || ""}"`,
        ].join(";") + "\r\n"
    }
  }

  return csv
}

export interface BomCsvImportResult {
  totalRows: number
  validRowCount: number
  errorRowCount: number
  parsedBoms: {
    code: string
    name: string
    revision: string
    finishedItemCode: string
    baseQuantity: number
    baseUnit: string
    isPhantom: boolean
    components: {
      lineNumber: number
      componentItemCode: string
      quantity: number
      unit: string
      scrapPercent: number
      operationSequence?: number
      notes?: string
    }[]
  }[]
  errors: { row: number; field?: string; message: string }[]
}

/**
 * Excel / CSV'den gelen reçete verisini satır satır ayrıştırır ve doğrulama raporu üretir.
 */
export function parseBomCsvContent(csvString: string): BomCsvImportResult {
  const clean = csvString.replace(/^\uFEFF/, "").trim()
  const lines = clean.split(/\r?\n/).filter((l) => l.trim().length > 0)

  if (lines.length < 2) {
    return {
      totalRows: 0,
      validRowCount: 0,
      errorRowCount: 0,
      parsedBoms: [],
      errors: [{ row: 1, message: "CSV dosyası başlık veya veri satırı içermiyor." }],
    }
  }

  // Ayırıcı tespit et (; veya ,)
  const delimiter = lines[0].includes(";") ? ";" : ","
  const headerTokens = lines[0].split(delimiter).map((h) => h.replace(/["\r\n]/g, "").trim())

  const bomsMap = new Map<string, any>()
  const errors: { row: number; field?: string; message: string }[] = []
  let validRowCount = 0

  for (let i = 1; i < lines.length; i++) {
    const rowNum = i + 1
    const rawLine = lines[i]
    // Basit tırnak içi ayırıcı korumalı split
    const tokens = rawLine.split(delimiter).map((t) => t.replace(/^["']|["']$/g, "").trim())

    const rowObj: Record<string, string> = {}
    for (let c = 0; c < headerTokens.length; c++) {
      rowObj[headerTokens[c]] = tokens[c] || ""
    }

    const bomCode = rowObj["ReçeteKodu"] || rowObj["code"]
    const bomName = rowObj["ReçeteAdı"] || rowObj["name"] || bomCode
    const finishedItemCode = rowObj["MamulKodu"] || rowObj["finishedItemCode"]
    const compCode = rowObj["BileşenKodu"] || rowObj["componentItemCode"]
    const qtyStr = rowObj["BileşenMiktarı"] || rowObj["quantity"]

    if (!bomCode) {
      errors.push({ row: rowNum, field: "ReçeteKodu", message: "Reçete kodu boş olamaz." })
      continue
    }

    if (!finishedItemCode) {
      errors.push({ row: rowNum, field: "MamulKodu", message: "Mamul kodu boş olamaz." })
      continue
    }

    const qty = parseFloat(qtyStr?.replace(",", ".") || "0")
    if (compCode && (isNaN(qty) || qty <= 0)) {
      errors.push({ row: rowNum, field: "BileşenMiktarı", message: `Geçersiz miktar: ${qtyStr}` })
      continue
    }

    if (!bomsMap.has(bomCode)) {
      const baseQty = parseFloat(rowObj["TemelMiktar"]?.replace(",", ".") || "1") || 1
      bomsMap.set(bomCode, {
        code: bomCode,
        name: bomName,
        revision: rowObj["Revizyon"] || "01",
        finishedItemCode,
        baseQuantity: baseQty,
        baseUnit: rowObj["TemelBirim"] || "Adet",
        isPhantom: (rowObj["HayaletReçete"] || "").toUpperCase() === "EVET",
        components: [],
      })
    }

    if (compCode) {
      const lineNo = parseInt(rowObj["KalemSıraNo"] || "10", 10) || 10
      const scrap = parseFloat(rowObj["FireYüzdesi"]?.replace(",", ".") || "0") || 0
      const opSeq = parseInt(rowObj["OperasyonSırası"] || "0", 10) || undefined

      bomsMap.get(bomCode)!.components.push({
        lineNumber: lineNo,
        componentItemCode: compCode,
        quantity: qty,
        unit: rowObj["BileşenBirimi"] || "Adet",
        scrapPercent: scrap,
        operationSequence: opSeq,
        notes: rowObj["Açıklama"] || undefined,
      })
    }

    validRowCount++
  }

  return {
    totalRows: lines.length - 1,
    validRowCount,
    errorRowCount: errors.length,
    parsedBoms: Array.from(bomsMap.values()),
    errors,
  }
}

