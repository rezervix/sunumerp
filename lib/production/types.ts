/**
 * Sunum ERP — Üretim Modülleri Saf Tip ve Sabit Tanımları (Pure TypeScript)
 * 
 * Bu dosya hiçbir sunucu modülü (fs, next/server, prisma, audit vb.) import etmez.
 * Hem istemci ("use client") hem de sunucu tarafında güvenle import edilebilir.
 */

// ═══════════════════════════════════════════════════════════════════════════════
// 1. ANA VERİ (MASTER DATA) SABİTLERİ VE ETİKETLERİ
// ═══════════════════════════════════════════════════════════════════════════════

export const WORK_CENTER_TYPES = ["MACHINE", "MANUAL", "OUTSOURCE"] as const
export type WorkCenterType = (typeof WORK_CENTER_TYPES)[number]

export const WORK_CENTER_TYPE_LABELS: Record<WorkCenterType, string> = {
  MACHINE: "Makine / Otomatik İstasyon",
  MANUAL: "Manuel / El İşçiliği İstasyonu",
  OUTSOURCE: "Dış Kaynak / Fason İstasyon",
}

export const MACHINE_STATUSES = [
  "ACTIVE",
  "MAINTENANCE",
  "FAULT",
  "STANDBY",
  "DECOMMISSIONED",
] as const
export type MachineStatus = (typeof MACHINE_STATUSES)[number]

export const MACHINE_STATUS_LABELS: Record<MachineStatus, string> = {
  ACTIVE: "Çalışıyor (Aktif)",
  MAINTENANCE: "Periyodik Bakımda",
  FAULT: "Arızalı / Duruşta",
  STANDBY: "Beklemede (Yedek)",
  DECOMMISSIONED: "Kullanım Dışı",
}

export const CALENDAR_EXCEPTION_TYPES = [
  "OVERTIME",
  "CLOSED",
  "REDUCED_CAPACITY",
  "SHIFT_OVERRIDE",
] as const
export type CalendarExceptionType = (typeof CALENDAR_EXCEPTION_TYPES)[number]

export const CALENDAR_EXCEPTION_TYPE_LABELS: Record<CalendarExceptionType, string> = {
  OVERTIME: "Fazla Mesai (+)",
  CLOSED: "Kapalı / Planlı Duruş",
  REDUCED_CAPACITY: "Kısıtlı Kapasite",
  SHIFT_OVERRIDE: "Özel Vardiya",
}

export const WEEKDAY_CODES = ["MON", "TUE", "WED", "THU", "FRI", "SAT", "SUN"] as const
export type WeekdayCode = (typeof WEEKDAY_CODES)[number]

export const WEEKDAY_LABELS: Record<WeekdayCode, string> = {
  MON: "Pazartesi",
  TUE: "Salı",
  WED: "Çarşamba",
  THU: "Perşembe",
  FRI: "Cuma",
  SAT: "Cumartesi",
  SUN: "Pazar",
}

export const PLANNING_BUCKETS = ["DAILY", "WEEKLY", "MONTHLY"] as const
export type PlanningBucket = (typeof PLANNING_BUCKETS)[number]

export const PLANNING_BUCKET_LABELS: Record<PlanningBucket, string> = {
  DAILY: "Günlük Dilim",
  WEEKLY: "Haftalık Dilim",
  MONTHLY: "Aylık Dilim",
}

export const LOT_SIZING_RULES = ["L4L", "FOQ", "EOQ", "POQ"] as const
export type LotSizingRule = (typeof LOT_SIZING_RULES)[number]

export const LOT_SIZING_RULE_LABELS: Record<LotSizingRule, string> = {
  L4L: "Lot-for-Lot (Birebir İhtiyaç)",
  FOQ: "Sabit Sipariş Miktarı (FOQ)",
  EOQ: "Ekonomik Sipariş Miktarı (EOQ)",
  POQ: "Periyodik Sipariş Miktarı (POQ)",
}

export const SAFETY_STOCK_RULES = ["FIXED", "DAYS_OF_SUPPLY", "PERCENTAGE"] as const
export type SafetyStockRule = (typeof SAFETY_STOCK_RULES)[number]

export const SAFETY_STOCK_RULE_LABELS: Record<SafetyStockRule, string> = {
  FIXED: "Sabit Güvenlik Stoğu",
  DAYS_OF_SUPPLY: "Günlük Tedarik Karşılığı (Gün)",
  PERCENTAGE: "Talep Yüzdesi (%)",
}

export const PRODUCTION_ITEM_TYPES = [
  "HAMMADDE",
  "YARI_MAMUL",
  "MAMUL",
  "SARF_MALZEME",
  "TICARI_MAL",
] as const
export type ProductionItemType = (typeof PRODUCTION_ITEM_TYPES)[number]

export const PRODUCTION_ITEM_TYPE_LABELS: Record<ProductionItemType, string> = {
  HAMMADDE: "Hammadde",
  YARI_MAMUL: "Yarı Mamul",
  MAMUL: "Mamul (Bitmiş Ürün)",
  SARF_MALZEME: "Sarf Malzeme",
  TICARI_MAL: "Ticari Mal",
}

export const PRODUCTION_METHODS = [
  "MAKE_TO_STOCK",
  "MAKE_TO_ORDER",
  "ASSEMBLE_TO_ORDER",
  "SUBCONTRACT",
  "PURCHASE_ONLY",
] as const
export type ProductionMethod = (typeof PRODUCTION_METHODS)[number]

export const PRODUCTION_METHOD_LABELS: Record<ProductionMethod, string> = {
  MAKE_TO_STOCK: "Stok İçin Üretim (MTS)",
  MAKE_TO_ORDER: "Siparişe Göre Üretim (MTO)",
  ASSEMBLE_TO_ORDER: "Siparişe Göre Montaj (ATO)",
  SUBCONTRACT: "Dış Kaynak / Fason Üretim",
  PURCHASE_ONLY: "Sadece Satınalma (Üretilmez)",
}

export const WORK_ORDER_STATUS_FLOW_DEFAULT = [
  "DRAFT",
  "PLANNED",
  "RELEASED",
  "IN_PROGRESS",
  "QA_PENDING",
  "COMPLETED",
] as const

export const WORK_ORDER_STATUS_LABELS: Record<string, string> = {
  DRAFT: "Taslak",
  PLANNED: "Planlandı",
  RELEASED: "Serbest Bırakıldı",
  IN_PROGRESS: "Üretimde",
  QA_PENDING: "Kalite Kontrol Bekliyor",
  COMPLETED: "Tamamlandı",
  CANCELLED: "İptal Edildi",
}

// ═══════════════════════════════════════════════════════════════════════════════
// 2. ÜRÜN REÇETESİ (BOM) & ROTA TİPLERİ
// ═══════════════════════════════════════════════════════════════════════════════

export type BomStatus = "DRAFT" | "APPROVED" | "OBSOLETE"
export type RoutingStatus = "DRAFT" | "APPROVED" | "OBSOLETE"

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

export interface ExplodedTreeNode {
  level: number
  bomId?: string
  bomCode?: string
  itemId: string
  itemCode: string
  itemName: string
  itemType?: string
  unit: string
  unitRequiredQty: number
  totalRequiredQty: number
  scrapPercent: number
  grossQtyWithScrap: number
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

