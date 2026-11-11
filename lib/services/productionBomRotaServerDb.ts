/**
 * SUNUM ERP – Üretim Yönetim Sistemi (Faz 3)
 * BOM (Ürün Reçetesi) & Rota (Routing) Veritabanı Orkestrasyon ve CRUD Servisi
 *
 * - N+1 sorgusu olmayan optimize edilmiş sorgular
 * - Onaylı revizyon değişmezliği (Immutability guard)
 * - Döngüsel bağımlılık engelleme
 * - "Kopyala ve Değiştir" revizyon türetme
 * - Çok seviyeli patlatma ve ters ağaç (Where-Used) çözümleme
 */

import { prisma } from "@/lib/db"
import { ProductionDomainError } from "./productionAuditAndError"
import {
  calculateTheoreticalBomCost,
  compareBomRevisions,
  detectBomCircularDependency,
  explodeBomTree,
  findWhereUsedInBoms,
  validateBomHeaderInput,
  validateBomItemInput,
  validateBomSubstituteInput,
  validateOperationInput,
  validateRoutingHeaderInput,
  type BomHeaderRecord,
  type RoutingHeaderRecord,
} from "./productionBomRotaEngine"

// ─────────────────────────────────────────────────────────────
// 1. REÇETE (BOM HEADER) CRUD & İŞLEMLERİ
// ─────────────────────────────────────────────────────────────

export interface ListBomsParams {
  branchId?: string | null
  finishedItemId?: string
  status?: string
  search?: string
  isPhantom?: string | boolean
  page?: string | number
  pageSize?: string | number
}

export async function listBomsFromDb(params: ListBomsParams = {}) {
  const page = Math.max(1, parseInt(String(params.page || "1"), 10))
  const pageSize = Math.min(100, Math.max(1, parseInt(String(params.pageSize || "20"), 10)))
  const skip = (page - 1) * pageSize

  const where: any = {}
  if (params.branchId) {
    where.OR = [{ branchId: params.branchId }, { branchId: null }]
  }
  if (params.finishedItemId) {
    where.finishedItemId = params.finishedItemId
  }
  if (params.status && params.status !== "ALL") {
    where.status = params.status
  }
  if (params.isPhantom !== undefined && params.isPhantom !== "") {
    where.isPhantom = String(params.isPhantom) === "true"
  }
  if (params.search) {
    const s = params.search.trim()
    where.OR = [
      { code: { contains: s } },
      { name: { contains: s } },
      { finishedItem: { name: { contains: s } } },
      { finishedItem: { sku: { contains: s } } },
    ]
  }

  const [totalCount, rawItems] = await Promise.all([
    (prisma as any).uretimBomHeader.count({ where }),
    (prisma as any).uretimBomHeader.findMany({
      where,
      skip,
      take: pageSize,
      orderBy: [{ updatedAt: "desc" }, { code: "asc" }],
      include: {
        finishedItem: true,
        components: {
          include: {
            componentItem: true,
            substitutes: {
              include: { substituteItem: true },
            },
          },
        },
        routings: true,
      },
    }),
  ])

  const items: BomHeaderRecord[] = rawItems.map((b: any) => ({
    id: b.id,
    branchId: b.branchId,
    finishedItemId: b.finishedItemId,
    finishedItemCode: b.finishedItem?.sku || b.finishedItem?.code || "",
    finishedItemName: b.finishedItem?.name || "",
    code: b.code,
    name: b.name,
    revision: b.revision,
    status: b.status,
    effectiveStartDate: b.effectiveStartDate,
    effectiveEndDate: b.effectiveEndDate,
    baseQuantity: b.baseQuantity,
    baseUnit: b.baseUnit,
    isPhantom: b.isPhantom,
    variantCode: b.variantCode,
    yieldPercent: b.yieldPercent,
    totalMaterialCost: b.totalMaterialCost,
    totalLaborCost: b.totalLaborCost,
    totalOverheadCost: b.totalOverheadCost,
    totalTheoreticalCost: b.totalTheoreticalCost,
    approvedAt: b.approvedAt,
    approvedBy: b.approvedBy,
    notes: b.notes,
    isActive: b.isActive,
    createdAt: b.createdAt,
    updatedAt: b.updatedAt,
    components: (b.components || []).map((c: any) => ({
      id: c.id,
      bomId: c.bomId,
      componentItemId: c.componentItemId,
      componentItemCode: c.componentItem?.sku || c.componentItem?.code || "",
      componentItemName: c.componentItem?.name || "",
      componentItemType: c.componentItem?.itemType || "HAMMADDE",
      lineNumber: c.lineNumber,
      quantity: c.quantity,
      unit: c.unit,
      unitConversionFactor: c.unitConversionFactor,
      scrapPercent: c.scrapPercent,
      isPhantom: c.isPhantom,
      isVariantSpecific: c.isVariantSpecific,
      variantKey: c.variantKey,
      operationSequence: c.operationSequence,
      unitCost: c.componentItem?.unitCost || 0,
      notes: c.notes,
      substitutes: (c.substitutes || []).map((s: any) => ({
        id: s.id,
        bomItemId: s.bomItemId,
        substituteItemId: s.substituteItemId,
        substituteItemCode: s.substituteItem?.sku || s.substituteItem?.code || "",
        substituteItemName: s.substituteItem?.name || "",
        priority: s.priority,
        substitutionRatio: s.substitutionRatio,
        isMandatoryApproval: s.isMandatoryApproval,
        unitCost: s.substituteItem?.unitCost || 0,
        notes: s.notes,
      })),
    })),
  }))

  return {
    items,
    pagination: {
      page,
      pageSize,
      totalCount,
      totalPages: Math.ceil(totalCount / pageSize) || 1,
    },
  }
}

export async function getBomByIdFromDb(id: string): Promise<BomHeaderRecord> {
  const b = await (prisma as any).uretimBomHeader.findUnique({
    where: { id },
    include: {
      finishedItem: true,
      components: {
        include: {
          componentItem: true,
          substitutes: {
            include: { substituteItem: true },
          },
        },
      },
      routings: {
        include: {
          operations: {
            include: {
              workCenter: true,
              alternativeWorkCenters: { include: { workCenter: true } },
            },
          },
        },
      },
      revisionLogs: {
        orderBy: { changedAt: "desc" },
      },
    },
  })

  if (!b) {
    throw new ProductionDomainError("NOT_FOUND", `Reçete (${id}) bulunamadı.`, undefined, 404)
  }

  return {
    id: b.id,
    branchId: b.branchId,
    finishedItemId: b.finishedItemId,
    finishedItemCode: b.finishedItem?.sku || b.finishedItem?.code || "",
    finishedItemName: b.finishedItem?.name || "",
    code: b.code,
    name: b.name,
    revision: b.revision,
    status: b.status,
    effectiveStartDate: b.effectiveStartDate,
    effectiveEndDate: b.effectiveEndDate,
    baseQuantity: b.baseQuantity,
    baseUnit: b.baseUnit,
    isPhantom: b.isPhantom,
    variantCode: b.variantCode,
    yieldPercent: b.yieldPercent,
    totalMaterialCost: b.totalMaterialCost,
    totalLaborCost: b.totalLaborCost,
    totalOverheadCost: b.totalOverheadCost,
    totalTheoreticalCost: b.totalTheoreticalCost,
    approvedAt: b.approvedAt,
    approvedBy: b.approvedBy,
    notes: b.notes,
    isActive: b.isActive,
    createdAt: b.createdAt,
    updatedAt: b.updatedAt,
    components: (b.components || []).map((c: any) => ({
      id: c.id,
      bomId: c.bomId,
      componentItemId: c.componentItemId,
      componentItemCode: c.componentItem?.sku || c.componentItem?.code || "",
      componentItemName: c.componentItem?.name || "",
      componentItemType: c.componentItem?.itemType || "HAMMADDE",
      lineNumber: c.lineNumber,
      quantity: c.quantity,
      unit: c.unit,
      unitConversionFactor: c.unitConversionFactor,
      scrapPercent: c.scrapPercent,
      isPhantom: c.isPhantom,
      isVariantSpecific: c.isVariantSpecific,
      variantKey: c.variantKey,
      operationSequence: c.operationSequence,
      unitCost: c.componentItem?.unitCost || 0,
      notes: c.notes,
      substitutes: (c.substitutes || []).map((s: any) => ({
        id: s.id,
        bomItemId: s.bomItemId,
        substituteItemId: s.substituteItemId,
        substituteItemCode: s.substituteItem?.sku || s.substituteItem?.code || "",
        substituteItemName: s.substituteItem?.name || "",
        priority: s.priority,
        substitutionRatio: s.substitutionRatio,
        isMandatoryApproval: s.isMandatoryApproval,
        unitCost: s.substituteItem?.unitCost || 0,
        notes: s.notes,
      })),
    })),
  }
}

export async function createBomInDb(input: unknown, createdBy: string = "system") {
  const valid = validateBomHeaderInput(input)

  // Kod tekilliği kontrolü
  const existing = await (prisma as any).uretimBomHeader.findUnique({
    where: { code: valid.code },
  })
  if (existing) {
    throw new ProductionDomainError(
      "CONFLICT",
      `Bu reçete kodu (${valid.code}) zaten kullanımda.`,
      undefined,
      409
    )
  }

  // Mamul stok kartı kontrolü
  const item = await (prisma as any).inventoryItem.findUnique({
    where: { id: valid.finishedItemId },
  })
  if (!item) {
    throw new ProductionDomainError(
      "NOT_FOUND",
      `Seçilen mamul/ürün kartı (${valid.finishedItemId}) bulunamadı.`,
      undefined,
      404
    )
  }

  const created = await (prisma as any).uretimBomHeader.create({
    data: {
      branchId: valid.branchId || null,
      finishedItemId: valid.finishedItemId,
      code: valid.code.trim().toUpperCase(),
      name: valid.name.trim(),
      revision: valid.revision || "01",
      status: "DRAFT",
      effectiveStartDate: valid.effectiveStartDate || null,
      effectiveEndDate: valid.effectiveEndDate || null,
      baseQuantity: valid.baseQuantity,
      baseUnit: valid.baseUnit || item.unit || "Adet",
      isPhantom: Boolean(valid.isPhantom),
      variantCode: valid.variantCode || null,
      yieldPercent: valid.yieldPercent,
      notes: valid.notes || null,
      isActive: true,
    },
  })

  // Revizyon logu oluştur
  await (prisma as any).uretimBomRevisionLog.create({
    data: {
      bomId: created.id,
      fromRevision: "00",
      toRevision: created.revision,
      action: "CREATE",
      changeSummary: `Reçete oluşturuldu (${created.code} - ${created.name})`,
      changedBy: createdBy,
    },
  })

  return await getBomByIdFromDb(created.id)
}

export async function updateBomInDb(id: string, input: any, updatedBy: string = "system") {
  const current = await getBomByIdFromDb(id)

  // Onaylı reçete değişmezliği (Immutability) kuralı!
  if (current.status === "APPROVED") {
    throw new ProductionDomainError(
      "INVALID_STATE_TRANSITION",
      "Onaylanmış (APPROVED) bir ürün reçetesi doğrudan düzenlenemez. Lütfen 'Kopyala ve Değiştir' seçeneği ile yeni bir revizyon oluşturun.",
      undefined,
      409
    )
  }

  const updateData: any = {}
  if (input.name !== undefined) updateData.name = String(input.name).trim()
  if (input.baseQuantity !== undefined) updateData.baseQuantity = Number(input.baseQuantity)
  if (input.baseUnit !== undefined) updateData.baseUnit = String(input.baseUnit)
  if (input.isPhantom !== undefined) updateData.isPhantom = Boolean(input.isPhantom)
  if (input.variantCode !== undefined) updateData.variantCode = input.variantCode
  if (input.yieldPercent !== undefined) updateData.yieldPercent = Number(input.yieldPercent)
  if (input.effectiveStartDate !== undefined) updateData.effectiveStartDate = input.effectiveStartDate
  if (input.effectiveEndDate !== undefined) updateData.effectiveEndDate = input.effectiveEndDate
  if (input.notes !== undefined) updateData.notes = input.notes
  if (input.isActive !== undefined) updateData.isActive = Boolean(input.isActive)

  const updated = await (prisma as any).uretimBomHeader.update({
    where: { id },
    data: updateData,
  })

  return await getBomByIdFromDb(updated.id)
}

export async function deleteBomInDb(id: string) {
  const current = await getBomByIdFromDb(id)

  if (current.status === "APPROVED") {
    throw new ProductionDomainError(
      "INVALID_STATE_TRANSITION",
      "Onaylı statüdeki bir reçete silinemez. Önce statüsünü OBSOLETE (Pasif) yapınız.",
      undefined,
      409
    )
  }

  await (prisma as any).uretimBomHeader.delete({ where: { id } })
  return current
}

// ─────────────────────────────────────────────────────────────
// 2. REÇETE ONAYLAMA & YENİ REVİZYON OLUŞTURMA (IMMUTABILITY)
// ─────────────────────────────────────────────────────────────

export async function approveBomInDb(id: string, approvedBy: string) {
  const bom = await getBomByIdFromDb(id)

  if (bom.status === "APPROVED") {
    return bom // Zaten onaylı
  }

  if (!bom.components || bom.components.length === 0) {
    throw new ProductionDomainError(
      "VALIDATION_ERROR",
      "Bileşeni olmayan boş bir reçete onaylanamaz. En az 1 hammadde/bileşen ekleyin.",
      undefined,
      400
    )
  }

  // Aynı mamul için daha önce onaylanmış aktif bir reçete varsa onu OBSOLETE yap
  const priorApproved = await (prisma as any).uretimBomHeader.findMany({
    where: {
      finishedItemId: bom.finishedItemId,
      status: "APPROVED",
      id: { not: bom.id },
    },
  })

  for (const prev of priorApproved) {
    await (prisma as any).uretimBomHeader.update({
      where: { id: prev.id },
      data: { status: "OBSOLETE" },
    })
    await (prisma as any).uretimBomRevisionLog.create({
      data: {
        bomId: prev.id,
        fromRevision: prev.revision,
        toRevision: prev.revision,
        action: "OBSOLETE",
        changeSummary: `Reçete ${bom.code} (${bom.revision}) onaylandığı için bu önceki revizyon pasife (OBSOLETE) alındı.`,
        changedBy: approvedBy,
      },
    })
  }

  // Reçeteyi onayla
  const updated = await (prisma as any).uretimBomHeader.update({
    where: { id },
    data: {
      status: "APPROVED",
      approvedAt: new Date(),
      approvedBy,
    },
  })

  await (prisma as any).uretimBomRevisionLog.create({
    data: {
      bomId: id,
      fromRevision: bom.revision,
      toRevision: bom.revision,
      action: "APPROVE",
      changeSummary: `Reçete revizyonu onaylandı ve üretim için serbest bırakıldı.`,
      changedBy: approvedBy,
    },
  })

  // Otomatik maliyet roll-up hesapla
  await recalculateBomCostInDb(id)

  return await getBomByIdFromDb(id)
}

/**
 * "Kopyala ve Değiştir": Onaylı veya mevcut bir reçeteden yeni bir taslak (DRAFT) revizyon üretir.
 */
export async function cloneBomAsNewRevisionInDb(params: {
  sourceBomId: string
  newRevision: string
  newCode?: string
  clonedBy: string
}) {
  const { sourceBomId, newRevision, newCode, clonedBy } = params
  const source = await getBomByIdFromDb(sourceBomId)

  const targetCode = (newCode || `${source.code}-R${newRevision}`).trim().toUpperCase()

  // Kod çakışma kontrolü
  const existing = await (prisma as any).uretimBomHeader.findUnique({
    where: { code: targetCode },
  })
  if (existing) {
    throw new ProductionDomainError(
      "CONFLICT",
      `Bu reçete kodu (${targetCode}) zaten mevcut. Lütfen farklı bir kod veya revizyon no belirleyin.`,
      undefined,
      409
    )
  }

  const createdHeader = await (prisma as any).uretimBomHeader.create({
    data: {
      branchId: source.branchId,
      finishedItemId: source.finishedItemId,
      code: targetCode,
      name: `${source.name} (Rev ${newRevision})`,
      revision: newRevision,
      status: "DRAFT",
      baseQuantity: source.baseQuantity,
      baseUnit: source.baseUnit,
      isPhantom: source.isPhantom,
      variantCode: source.variantCode,
      yieldPercent: source.yieldPercent,
      totalMaterialCost: source.totalMaterialCost,
      totalLaborCost: source.totalLaborCost,
      totalOverheadCost: source.totalOverheadCost,
      totalTheoreticalCost: source.totalTheoreticalCost,
      notes: `Revizyon ${source.revision} üzerinden klonlandı.`,
      isActive: true,
    },
  })

  // Kalemleri ve ikameleri klonla
  for (const comp of source.components || []) {
    const createdComp = await (prisma as any).uretimBomItem.create({
      data: {
        bomId: createdHeader.id,
        componentItemId: comp.componentItemId,
        lineNumber: comp.lineNumber,
        quantity: comp.quantity,
        unit: comp.unit,
        unitConversionFactor: comp.unitConversionFactor,
        scrapPercent: comp.scrapPercent,
        isPhantom: comp.isPhantom,
        isVariantSpecific: comp.isVariantSpecific,
        variantKey: comp.variantKey,
        operationSequence: comp.operationSequence,
        notes: comp.notes,
      },
    })

    for (const sub of comp.substitutes || []) {
      await (prisma as any).uretimBomSubstitute.create({
        data: {
          bomItemId: createdComp.id,
          substituteItemId: sub.substituteItemId,
          priority: sub.priority,
          substitutionRatio: sub.substitutionRatio,
          isMandatoryApproval: sub.isMandatoryApproval,
          notes: sub.notes,
        },
      })
    }
  }

  // Revizyon logu
  await (prisma as any).uretimBomRevisionLog.create({
    data: {
      bomId: createdHeader.id,
      fromRevision: source.revision,
      toRevision: newRevision,
      action: "COPY",
      changeSummary: `${source.code} (${source.revision}) reçetesinden yeni revizyon kopyalandı.`,
      changedBy: clonedBy,
    },
  })

  return await getBomByIdFromDb(createdHeader.id)
}

// ─────────────────────────────────────────────────────────────
// 3. REÇETE KALEMLERİ (BOM ITEMS) VE İKAME MALZEME CRUD
// ─────────────────────────────────────────────────────────────

export async function addBomItemToDb(input: unknown) {
  const valid = validateBomItemInput(input)
  const bom = await getBomByIdFromDb(valid.bomId)

  if (bom.status === "APPROVED") {
    throw new ProductionDomainError(
      "INVALID_STATE_TRANSITION",
      "Onaylanmış reçeteye doğrudan kalem eklenemez. Yeni revizyon oluşturun.",
      undefined,
      409
    )
  }

  // Döngüsel referans engelleme
  const allBoms = await (prisma as any).uretimBomHeader.findMany({
    include: { components: true },
  })
  const cycleCheck = detectBomCircularDependency({
    parentFinishedItemId: bom.finishedItemId,
    candidateComponentItemId: valid.componentItemId,
    existingBoms: allBoms,
  })

  if (cycleCheck.hasCycle) {
    throw new ProductionDomainError(
      "VALIDATION_ERROR",
      cycleCheck.message || "Döngüsel reçete referansı tespit edildi.",
      { cyclePath: cycleCheck.cyclePath },
      400
    )
  }

  // Aynı bileşen reçetede zaten var mı?
  const duplicate = (bom.components || []).find((c) => c.componentItemId === valid.componentItemId)
  if (duplicate) {
    throw new ProductionDomainError(
      "CONFLICT",
      "Bu bileşen malzeme zaten reçetede mevcut. Miktarını güncelleyiniz.",
      undefined,
      409
    )
  }

  const created = await (prisma as any).uretimBomItem.create({
    data: {
      bomId: valid.bomId,
      componentItemId: valid.componentItemId,
      lineNumber: valid.lineNumber,
      quantity: valid.quantity,
      unit: valid.unit,
      unitConversionFactor: valid.unitConversionFactor,
      scrapPercent: valid.scrapPercent,
      isPhantom: valid.isPhantom,
      isVariantSpecific: valid.isVariantSpecific,
      variantKey: valid.variantKey || null,
      operationSequence: valid.operationSequence || null,
      notes: valid.notes || null,
    },
  })

  await recalculateBomCostInDb(valid.bomId)
  return created
}

export async function updateBomItemInDb(id: string, input: any) {
  const item = await (prisma as any).uretimBomItem.findUnique({
    where: { id },
    include: { bom: true },
  })
  if (!item) {
    throw new ProductionDomainError("NOT_FOUND", "Reçete kalemi bulunamadı.", undefined, 404)
  }

  if (item.bom.status === "APPROVED") {
    throw new ProductionDomainError(
      "INVALID_STATE_TRANSITION",
      "Onaylı reçetenin kalemleri değiştirilemez.",
      undefined,
      409
    )
  }

  const data: any = {}
  if (input.lineNumber !== undefined) data.lineNumber = Number(input.lineNumber)
  if (input.quantity !== undefined) data.quantity = Number(input.quantity)
  if (input.unit !== undefined) data.unit = String(input.unit)
  if (input.unitConversionFactor !== undefined) data.unitConversionFactor = Number(input.unitConversionFactor)
  if (input.scrapPercent !== undefined) data.scrapPercent = Number(input.scrapPercent)
  if (input.isPhantom !== undefined) data.isPhantom = Boolean(input.isPhantom)
  if (input.isVariantSpecific !== undefined) data.isVariantSpecific = Boolean(input.isVariantSpecific)
  if (input.variantKey !== undefined) data.variantKey = input.variantKey
  if (input.operationSequence !== undefined) data.operationSequence = input.operationSequence ? Number(input.operationSequence) : null
  if (input.notes !== undefined) data.notes = input.notes

  const updated = await (prisma as any).uretimBomItem.update({
    where: { id },
    data,
  })

  await recalculateBomCostInDb(item.bomId)
  return updated
}

export async function deleteBomItemInDb(id: string) {
  const item = await (prisma as any).uretimBomItem.findUnique({
    where: { id },
    include: { bom: true },
  })
  if (!item) {
    throw new ProductionDomainError("NOT_FOUND", "Silinecek reçete kalemi bulunamadı.", undefined, 404)
  }

  if (item.bom.status === "APPROVED") {
    throw new ProductionDomainError(
      "INVALID_STATE_TRANSITION",
      "Onaylı reçetenin kalemleri silinemez.",
      undefined,
      409
    )
  }

  await (prisma as any).uretimBomItem.delete({ where: { id } })
  await recalculateBomCostInDb(item.bomId)
  return item
}

export async function addBomSubstituteInDb(input: unknown) {
  const valid = validateBomSubstituteInput(input)

  const bomItem = await (prisma as any).uretimBomItem.findUnique({
    where: { id: valid.bomItemId },
    include: { bom: true },
  })
  if (!bomItem) {
    throw new ProductionDomainError("NOT_FOUND", "Reçete kalemi bulunamadı.", undefined, 404)
  }
  if (bomItem.bom.status === "APPROVED") {
    throw new ProductionDomainError(
      "INVALID_STATE_TRANSITION",
      "Onaylı reçeteye ikame eklenemez.",
      undefined,
      409
    )
  }

  // Orijinal malzeme ile ikame malzeme aynı olamaz
  if (bomItem.componentItemId === valid.substituteItemId) {
    throw new ProductionDomainError(
      "VALIDATION_ERROR",
      "Bir malzeme kendisinin ikamesi olarak tanımlanamaz.",
      undefined,
      400
    )
  }

  const created = await (prisma as any).uretimBomSubstitute.create({
    data: {
      bomItemId: valid.bomItemId,
      substituteItemId: valid.substituteItemId,
      priority: valid.priority,
      substitutionRatio: valid.substitutionRatio,
      isMandatoryApproval: valid.isMandatoryApproval,
      notes: valid.notes || null,
    },
  })

  return created
}

export async function deleteBomSubstituteInDb(id: string) {
  const sub = await (prisma as any).uretimBomSubstitute.findUnique({
    where: { id },
    include: { bomItem: { include: { bom: true } } },
  })
  if (!sub) {
    throw new ProductionDomainError("NOT_FOUND", "İkame malzeme kaydı bulunamadı.", undefined, 404)
  }
  if (sub.bomItem?.bom?.status === "APPROVED") {
    throw new ProductionDomainError(
      "INVALID_STATE_TRANSITION",
      "Onaylı reçetenin ikamesi silinemez.",
      undefined,
      409
    )
  }

  await (prisma as any).uretimBomSubstitute.delete({ where: { id } })
  return sub
}

// ─────────────────────────────────────────────────────────────
// 4. ROTA VE OPERASYON (ROUTING & OPERATIONS) CRUD
// ─────────────────────────────────────────────────────────────

export interface ListRoutingsParams {
  branchId?: string | null
  finishedItemId?: string
  bomId?: string
  status?: string
  search?: string
  page?: string | number
  pageSize?: string | number
}

export async function listRoutingsFromDb(params: ListRoutingsParams = {}) {
  const page = Math.max(1, parseInt(String(params.page || "1"), 10))
  const pageSize = Math.min(100, Math.max(1, parseInt(String(params.pageSize || "20"), 10)))
  const skip = (page - 1) * pageSize

  const where: any = {}
  if (params.branchId) {
    where.OR = [{ branchId: params.branchId }, { branchId: null }]
  }
  if (params.finishedItemId) {
    where.finishedItemId = params.finishedItemId
  }
  if (params.bomId) {
    where.bomId = params.bomId
  }
  if (params.status && params.status !== "ALL") {
    where.status = params.status
  }
  if (params.search) {
    const s = params.search.trim()
    where.OR = [
      { code: { contains: s } },
      { name: { contains: s } },
      { finishedItem: { name: { contains: s } } },
      { finishedItem: { sku: { contains: s } } },
    ]
  }

  const [totalCount, rawItems] = await Promise.all([
    (prisma as any).uretimRoutingHeader.count({ where }),
    (prisma as any).uretimRoutingHeader.findMany({
      where,
      skip,
      take: pageSize,
      orderBy: [{ updatedAt: "desc" }, { code: "asc" }],
      include: {
        finishedItem: true,
        bom: true,
        operations: {
          include: {
            workCenter: true,
            alternativeWorkCenters: { include: { workCenter: true } },
          },
          orderBy: { operationNumber: "asc" },
        },
      },
    }),
  ])

  const items: RoutingHeaderRecord[] = rawItems.map((r: any) => ({
    id: r.id,
    branchId: r.branchId,
    bomId: r.bomId,
    finishedItemId: r.finishedItemId,
    finishedItemCode: r.finishedItem?.sku || r.finishedItem?.code || "",
    finishedItemName: r.finishedItem?.name || "",
    code: r.code,
    name: r.name,
    revision: r.revision,
    status: r.status,
    totalSetupTimeMinutes: r.totalSetupTimeMinutes,
    totalRunTimeMinutes: r.totalRunTimeMinutes,
    totalHourlyCost: r.totalHourlyCost,
    totalRoutingCost: r.totalRoutingCost,
    approvedAt: r.approvedAt,
    approvedBy: r.approvedBy,
    notes: r.notes,
    isActive: r.isActive,
    createdAt: r.createdAt,
    updatedAt: r.updatedAt,
    operations: (r.operations || []).map((op: any) => ({
      id: op.id,
      routingId: op.routingId,
      operationNumber: op.operationNumber,
      name: op.name,
      description: op.description,
      workCenterId: op.workCenterId,
      workCenterCode: op.workCenter?.code || "",
      workCenterName: op.workCenter?.name || "",
      workCenterHourlyCost: op.workCenter?.hourlyCost || 0,
      setupTimeMinutes: op.setupTimeMinutes,
      runTimeMinutes: op.runTimeMinutes,
      waitOrTransportTimeMinutes: op.waitOrTransportTimeMinutes,
      workerCount: op.workerCount,
      isSubcontracted: op.isSubcontracted,
      subcontractorName: op.subcontractorName,
      subcontractUnitCost: op.subcontractUnitCost,
      isQualityControlPoint: op.isQualityControlPoint,
      qualityInspectionType: op.qualityInspectionType,
      calculatedHourlyCost: op.calculatedHourlyCost,
      totalOperationCost: op.totalOperationCost,
      alternativeWorkCenters: (op.alternativeWorkCenters || []).map((alt: any) => ({
        id: alt.id,
        workCenterId: alt.workCenterId,
        workCenterCode: alt.workCenter?.code || "",
        workCenterName: alt.workCenter?.name || "",
        priority: alt.priority,
        efficiencyFactor: alt.efficiencyFactor,
      })),
    })),
  }))

  return {
    items,
    pagination: {
      page,
      pageSize,
      totalCount,
      totalPages: Math.ceil(totalCount / pageSize) || 1,
    },
  }
}

export async function getRoutingByIdFromDb(id: string): Promise<RoutingHeaderRecord> {
  const r = await (prisma as any).uretimRoutingHeader.findUnique({
    where: { id },
    include: {
      finishedItem: true,
      bom: true,
      operations: {
        include: {
          workCenter: true,
          alternativeWorkCenters: { include: { workCenter: true } },
          materialAllocations: true,
        },
        orderBy: { operationNumber: "asc" },
      },
    },
  })

  if (!r) {
    throw new ProductionDomainError("NOT_FOUND", `Rota (${id}) bulunamadı.`, undefined, 404)
  }

  return {
    id: r.id,
    branchId: r.branchId,
    bomId: r.bomId,
    finishedItemId: r.finishedItemId,
    finishedItemCode: r.finishedItem?.sku || r.finishedItem?.code || "",
    finishedItemName: r.finishedItem?.name || "",
    code: r.code,
    name: r.name,
    revision: r.revision,
    status: r.status,
    totalSetupTimeMinutes: r.totalSetupTimeMinutes,
    totalRunTimeMinutes: r.totalRunTimeMinutes,
    totalHourlyCost: r.totalHourlyCost,
    totalRoutingCost: r.totalRoutingCost,
    approvedAt: r.approvedAt,
    approvedBy: r.approvedBy,
    notes: r.notes,
    isActive: r.isActive,
    createdAt: r.createdAt,
    updatedAt: r.updatedAt,
    operations: (r.operations || []).map((op: any) => ({
      id: op.id,
      routingId: op.routingId,
      operationNumber: op.operationNumber,
      name: op.name,
      description: op.description,
      workCenterId: op.workCenterId,
      workCenterCode: op.workCenter?.code || "",
      workCenterName: op.workCenter?.name || "",
      workCenterHourlyCost: op.workCenter?.hourlyCost || 0,
      setupTimeMinutes: op.setupTimeMinutes,
      runTimeMinutes: op.runTimeMinutes,
      waitOrTransportTimeMinutes: op.waitOrTransportTimeMinutes,
      workerCount: op.workerCount,
      isSubcontracted: op.isSubcontracted,
      subcontractorName: op.subcontractorName,
      subcontractUnitCost: op.subcontractUnitCost,
      isQualityControlPoint: op.isQualityControlPoint,
      qualityInspectionType: op.qualityInspectionType,
      calculatedHourlyCost: op.calculatedHourlyCost,
      totalOperationCost: op.totalOperationCost,
      alternativeWorkCenters: (op.alternativeWorkCenters || []).map((alt: any) => ({
        id: alt.id,
        workCenterId: alt.workCenterId,
        workCenterCode: alt.workCenter?.code || "",
        workCenterName: alt.workCenter?.name || "",
        priority: alt.priority,
        efficiencyFactor: alt.efficiencyFactor,
      })),
    })),
  }
}

export async function createRoutingInDb(input: unknown) {
  const valid = validateRoutingHeaderInput(input)

  const existing = await (prisma as any).uretimRoutingHeader.findUnique({
    where: { code: valid.code },
  })
  if (existing) {
    throw new ProductionDomainError(
      "CONFLICT",
      `Bu rota kodu (${valid.code}) zaten kullanımda.`,
      undefined,
      409
    )
  }

  const created = await (prisma as any).uretimRoutingHeader.create({
    data: {
      branchId: valid.branchId || null,
      bomId: valid.bomId || null,
      finishedItemId: valid.finishedItemId,
      code: valid.code.trim().toUpperCase(),
      name: valid.name.trim(),
      revision: valid.revision || "01",
      status: "DRAFT",
      notes: valid.notes || null,
      isActive: true,
    },
  })

  return await getRoutingByIdFromDb(created.id)
}

export async function addOperationToRoutingInDb(input: unknown) {
  const valid = validateOperationInput(input)
  const routing = await getRoutingByIdFromDb(valid.routingId)

  if (routing.status === "APPROVED") {
    throw new ProductionDomainError(
      "INVALID_STATE_TRANSITION",
      "Onaylanmış rotaya doğrudan operasyon eklenemez. Yeni revizyon oluşturun.",
      undefined,
      409
    )
  }

  // İş merkezi kontrolü
  const wc = await (prisma as any).uretimWorkCenter.findUnique({
    where: { id: valid.workCenterId },
  })
  if (!wc) {
    throw new ProductionDomainError(
      "NOT_FOUND",
      `Seçilen iş merkezi (${valid.workCenterId}) bulunamadı.`,
      undefined,
      404
    )
  }

  // Operasyon numarası tekilliği kontrolü
  const dupOp = (routing.operations || []).find((o) => o.operationNumber === valid.operationNumber)
  if (dupOp) {
    throw new ProductionDomainError(
      "CONFLICT",
      `Operasyon numarası (${valid.operationNumber}) bu rotada zaten kullanılıyor.`,
      undefined,
      409
    )
  }

  const hourlyCost = wc.hourlyCost || 0
  const setupHours = valid.setupTimeMinutes / 60
  const runHours = valid.runTimeMinutes / 60
  const laborMachineCost = (setupHours + runHours * valid.workerCount) * hourlyCost
  const totalCost = laborMachineCost + (valid.isSubcontracted ? valid.subcontractUnitCost : 0)

  const created = await (prisma as any).uretimOperation.create({
    data: {
      routingId: valid.routingId,
      operationNumber: valid.operationNumber,
      name: valid.name.trim(),
      description: valid.description || null,
      workCenterId: valid.workCenterId,
      setupTimeMinutes: valid.setupTimeMinutes,
      runTimeMinutes: valid.runTimeMinutes,
      waitOrTransportTimeMinutes: valid.waitOrTransportTimeMinutes,
      workerCount: valid.workerCount,
      isSubcontracted: valid.isSubcontracted,
      subcontractorName: valid.subcontractorName || null,
      subcontractUnitCost: valid.subcontractUnitCost,
      isQualityControlPoint: valid.isQualityControlPoint,
      qualityInspectionType: valid.qualityInspectionType || null,
      calculatedHourlyCost: hourlyCost,
      totalOperationCost: Number(totalCost.toFixed(2)),
    },
  })

  // Rota toplamlarını güncelle
  await recalculateRoutingTotals(valid.routingId)

  return created
}

export async function updateOperationInDb(id: string, input: any) {
  const op = await (prisma as any).uretimOperation.findUnique({
    where: { id },
    include: { routing: true },
  })
  if (!op) {
    throw new ProductionDomainError("NOT_FOUND", "Operasyon kaydı bulunamadı.", undefined, 404)
  }
  if (op.routing?.status === "APPROVED") {
    throw new ProductionDomainError(
      "INVALID_STATE_TRANSITION",
      "Onaylı rotanın operasyonları düzenlenemez.",
      undefined,
      409
    )
  }

  const data: any = {}
  if (input.name !== undefined) data.name = String(input.name).trim()
  if (input.description !== undefined) data.description = input.description
  if (input.workCenterId !== undefined) data.workCenterId = input.workCenterId
  if (input.setupTimeMinutes !== undefined) data.setupTimeMinutes = Number(input.setupTimeMinutes)
  if (input.runTimeMinutes !== undefined) data.runTimeMinutes = Number(input.runTimeMinutes)
  if (input.waitOrTransportTimeMinutes !== undefined) data.waitOrTransportTimeMinutes = Number(input.waitOrTransportTimeMinutes)
  if (input.workerCount !== undefined) data.workerCount = Number(input.workerCount)
  if (input.isSubcontracted !== undefined) data.isSubcontracted = Boolean(input.isSubcontracted)
  if (input.subcontractorName !== undefined) data.subcontractorName = input.subcontractorName
  if (input.subcontractUnitCost !== undefined) data.subcontractUnitCost = Number(input.subcontractUnitCost)
  if (input.isQualityControlPoint !== undefined) data.isQualityControlPoint = Boolean(input.isQualityControlPoint)
  if (input.qualityInspectionType !== undefined) data.qualityInspectionType = input.qualityInspectionType

  const updated = await (prisma as any).uretimOperation.update({
    where: { id },
    data,
  })

  await recalculateRoutingTotals(op.routingId)
  return updated
}

export async function deleteOperationInDb(id: string) {
  const op = await (prisma as any).uretimOperation.findUnique({
    where: { id },
    include: { routing: true },
  })
  if (!op) {
    throw new ProductionDomainError("NOT_FOUND", "Silinecek operasyon bulunamadı.", undefined, 404)
  }
  if (op.routing?.status === "APPROVED") {
    throw new ProductionDomainError(
      "INVALID_STATE_TRANSITION",
      "Onaylı rotanın operasyonu silinemez.",
      undefined,
      409
    )
  }

  await (prisma as any).uretimOperation.delete({ where: { id } })
  await recalculateRoutingTotals(op.routingId)
  return op
}

async function recalculateRoutingTotals(routingId: string) {
  const ops = await (prisma as any).uretimOperation.findMany({
    where: { routingId },
    include: { workCenter: true },
  })

  let totalSetup = 0
  let totalRun = 0
  let totalCost = 0

  for (const o of ops) {
    totalSetup += o.setupTimeMinutes || 0
    totalRun += o.runTimeMinutes || 0
    const wcCost = o.workCenter?.hourlyCost || 0
    const opLaborMachine = ((o.setupTimeMinutes + o.runTimeMinutes * o.workerCount) / 60) * wcCost
    const subCost = o.isSubcontracted ? o.subcontractUnitCost || 0 : 0
    totalCost += opLaborMachine + subCost
  }

  await (prisma as any).uretimRoutingHeader.update({
    where: { id: routingId },
    data: {
      totalSetupTimeMinutes: Number(totalSetup.toFixed(2)),
      totalRunTimeMinutes: Number(totalRun.toFixed(2)),
      totalRoutingCost: Number(totalCost.toFixed(2)),
    },
  })
}

// ─────────────────────────────────────────────────────────────
// 5. MALİYET ROLL-UP, PATLATMA VE WHERE-USED HESAPLAMA SORGULARI
// ─────────────────────────────────────────────────────────────

export async function recalculateBomCostInDb(bomId: string) {
  const bom = await getBomByIdFromDb(bomId)

  // Bağlı rota varsa çek
  let routing: RoutingHeaderRecord | null = null
  const routings = await (prisma as any).uretimRoutingHeader.findMany({
    where: {
      OR: [{ bomId: bom.id }, { finishedItemId: bom.finishedItemId, status: "APPROVED" }],
    },
    include: {
      operations: { include: { workCenter: true } },
    },
  })
  if (routings.length > 0) {
    routing = routings[0] as any
  }

  // Malzeme birim maliyetleri haritası
  const componentItemIds = (bom.components || []).map((c) => c.componentItemId)
  const items = await (prisma as any).inventoryItem.findMany({
    where: { id: { in: componentItemIds } },
  })
  const costMap: Record<string, number> = {}
  for (const it of items) {
    costMap[it.id] = it.unitCost || 0
  }

  const calculated = calculateTheoreticalBomCost({
    bom,
    routing,
    itemCostMap: costMap,
  })

  await (prisma as any).uretimBomHeader.update({
    where: { id: bomId },
    data: {
      totalMaterialCost: calculated.totalMaterialCost,
      totalLaborCost: calculated.totalLaborCost,
      totalOverheadCost: calculated.totalOverheadCost,
      totalTheoreticalCost: calculated.totalTheoreticalCost,
    },
  })

  return calculated
}

export async function getExplodedBomFromDb(bomId: string, targetQuantity?: number) {
  const rootBom = await getBomByIdFromDb(bomId)
  const allBoms = (await listBomsFromDb({ pageSize: 1000 })).items

  // Tüm hammadde ve yarı mamul maliyetlerini tek sorguda çek
  const allItems = await (prisma as any).inventoryItem.findMany()
  const itemCostMap: Record<string, number> = {}
  for (const it of allItems) {
    itemCostMap[it.id] = it.unitCost || 0
  }

  return explodeBomTree({
    rootBom,
    targetQuantity,
    allBoms,
    itemCostMap,
  })
}

export async function getWhereUsedFromDb(itemId: string) {
  const allBoms = (await listBomsFromDb({ pageSize: 1000 })).items
  return findWhereUsedInBoms({
    targetItemId: itemId,
    allBoms,
  })
}

export async function compareBomRevisionsFromDb(bomIdA: string, bomIdB: string) {
  const [bomA, bomB] = await Promise.all([getBomByIdFromDb(bomIdA), getBomByIdFromDb(bomIdB)])
  return compareBomRevisions(bomA, bomB)
}

