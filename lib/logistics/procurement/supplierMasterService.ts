/**
 * Lojistik Faz 3 — Tedarikçi Ana Kart, Belge Kasası, Tek-Kaynak Riski ve EOQ/ROP Servisi
 *
 * - GLN-13 GS1 Mod-10 doğrulaması
 * - Onay / Askı / Kara Liste yaşam döngüsü (kara listede neden zorunluluğu + PO engeli)
 * - Sözleşme & sertifika belge geçerlilik takibi
 * - Tek kaynak (Single-Source) kritik risk tespiti & 1-tık alternatif tedarikçi bağlama
 * - Dinamik EOQ, Güvenlik Stoğu ve ROP hesaplama & öneri üretimi
 */

import { prisma } from "@/lib/db"
import { LogisticsDomainError } from "@/lib/logistics/security"
import {
  computeEoqAndRopMetrics,
  validateGln13,
} from "./constantsAndHelpers"

export function computeDocumentExpiryStatus(expiresAt?: Date | string | null): string {
  if (!expiresAt) return "GECERLI"
  const exp = new Date(expiresAt)
  if (Number.isNaN(exp.getTime())) return "INCELEMEDE"
  const diffDays = (exp.getTime() - Date.now()) / 86_400_000
  if (diffDays < 0) return "SURESI_DOLMUS"
  if (diffDays <= 30) return "YENILEME_YAKIN"
  return "GECERLI"
}

export async function listSuppliersEnriched(filter?: {
  status?: string
  category?: string
  criticality?: string
  search?: string
}) {
  const [suppliers, links, docs, pos, snapshots, invites] = await Promise.all([
    prisma.supplier.findMany({ orderBy: { name: "asc" } }),
    prisma.lojistikSupplierItemLink.findMany(),
    prisma.lojistikSupplierDocument.findMany(),
    prisma.lojistikPurchaseOrder.findMany(),
    prisma.lojistikSupplierScoreSnapshot.findMany({
      where: { periodKey: "LIVE" },
    }),
    prisma.lojistikSupplierPortalInvite.findMany({
      where: { isRevoked: false },
    }),
  ])

  const linkCountMap = new Map<string, number>()
  for (const l of links) {
    if (!l.isActive) continue
    linkCountMap.set(l.supplierId, (linkCountMap.get(l.supplierId) || 0) + 1)
  }

  const docSummaryMap = new Map<
    string,
    { total: number; valid: number; expiringSoon: number; expired: number; docs: any[] }
  >()
  for (const d of docs) {
    const computedStatus =
      d.status === "INCELEMEDE" ? "INCELEMEDE" : computeDocumentExpiryStatus(d.expiresAt)
    const entry = docSummaryMap.get(d.supplierId) || {
      total: 0,
      valid: 0,
      expiringSoon: 0,
      expired: 0,
      docs: [],
    }
    entry.total += 1
    if (computedStatus === "SURESI_DOLMUS") entry.expired += 1
    else if (computedStatus === "YENILEME_YAKIN") entry.expiringSoon += 1
    else entry.valid += 1
    entry.docs.push({ ...d, computedStatus })
    docSummaryMap.set(d.supplierId, entry)
  }

  const poStatsMap = new Map<string, { openCount: number; totalCount: number; openSpend: number }>()
  for (const po of pos) {
    const entry = poStatsMap.get(po.supplierId) || { openCount: 0, totalCount: 0, openSpend: 0 }
    entry.totalCount += 1
    if (!["TAMAMLANDI", "TESLIM_ALINDI", "IPTAL"].includes(po.status)) {
      entry.openCount += 1
      entry.openSpend += Number(po.agreedTotalAmount || 0)
    }
    poStatsMap.set(po.supplierId, entry)
  }

  const liveScoreMap = new Map(snapshots.map((s: any) => [s.supplierId, s]))
  const now = Date.now()
  const inviteCountMap = new Map<string, number>()
  for (const inv of invites) {
    if (new Date(inv.expiresAt).getTime() > now) {
      inviteCountMap.set(inv.supplierId, (inviteCountMap.get(inv.supplierId) || 0) + 1)
    }
  }

  let rows = suppliers.map((s: any) => {
    const docSummary = docSummaryMap.get(s.id) || {
      total: 0,
      valid: 0,
      expiringSoon: 0,
      expired: 0,
      docs: [],
    }
    const poStat = poStatsMap.get(s.id) || { openCount: 0, totalCount: 0, openSpend: 0 }
    const liveScore = liveScoreMap.get(s.id) ?? null
    return {
      ...s,
      approvalStatus: s.approvalStatus || (s.isActive ? "ONAYLI" : "ASKIDA"),
      criticalityLevel: s.criticalityLevel || "ORTA",
      category: s.category || "GENEL",
      paymentTermsLabel: s.paymentTermsLabel || `${s.paymentTermsDays || 30} Gün Vadeli`,
      linkedItemCount: linkCountMap.get(s.id) || 0,
      documentSummary: {
        total: docSummary.total,
        valid: docSummary.valid,
        expiringSoon: docSummary.expiringSoon,
        expired: docSummary.expired,
      },
      openPoCount: poStat.openCount,
      totalPoCount: poStat.totalCount,
      openPoSpendTry: Number(poStat.openSpend.toFixed(2)),
      activeInviteCount: inviteCountMap.get(s.id) || 0,
      liveScorecard: liveScore,
      effectiveScore: liveScore?.compositeScore ?? s.scorecardScore ?? Number((s.rating || 4.5) * 20),
      effectiveTier: liveScore?.tier ?? s.scorecardTier ?? "B",
    }
  })

  if (filter?.status && filter.status !== "ALL") {
    rows = rows.filter((r: any) => r.approvalStatus === filter.status)
  }
  if (filter?.category && filter.category !== "ALL") {
    rows = rows.filter((r: any) => r.category === filter.category)
  }
  if (filter?.criticality && filter.criticality !== "ALL") {
    rows = rows.filter((r: any) => r.criticalityLevel === filter.criticality)
  }
  if (filter?.search?.trim()) {
    const q = filter.search.trim().toLowerCase()
    rows = rows.filter(
      (r: any) =>
        r.name.toLowerCase().includes(q) ||
        r.code.toLowerCase().includes(q) ||
        (r.glnNumber && r.glnNumber.toLowerCase().includes(q)) ||
        (r.contactPerson && r.contactPerson.toLowerCase().includes(q))
    )
  }

  return rows
}

export async function upsertSupplierRecord(
  input: {
    id?: string
    code?: string
    name: string
    contactPerson?: string
    email?: string
    phone?: string
    taxNumber?: string
    taxOffice?: string
    iban?: string
    address?: string
    glnNumber?: string | null
    category?: string
    criticalityLevel?: string
    approvalStatus?: string
    blacklistedReason?: string | null
    leadTimeDays?: number
    paymentTermsDays?: number
    paymentTermsLabel?: string
    supportsConsignment?: boolean
    supportsDropship?: boolean
    isAlternativeReady?: boolean
    isActive?: boolean
    notes?: string
  },
  actor: string
) {
  if (!input.name?.trim()) {
    throw new LogisticsDomainError("MISSING_SUPPLIER_NAME", "Tedarikçi unvanı zorunludur.", 400)
  }

  const cleanGln = input.glnNumber?.trim() || null
  if (cleanGln) {
    const glnCheck = validateGln13(cleanGln)
    if (!glnCheck.valid) {
      throw new LogisticsDomainError("INVALID_GLN_13", glnCheck.reason || "Geçersiz GLN-13 kodu.", 400)
    }
  }

  const approvalStatus = input.approvalStatus || "ONAYLI"
  const blacklistedReason = input.blacklistedReason?.trim() || null
  if (approvalStatus === "KARALISTE" && !blacklistedReason) {
    throw new LogisticsDomainError(
      "BLACKLIST_REASON_REQUIRED",
      "Kara listeye alınan tedarikçi için gerekçe girilmesi zorunludur.",
      400
    )
  }

  const computedActive =
    approvalStatus === "KARALISTE"
      ? false
      : input.isActive !== undefined
        ? Boolean(input.isActive)
        : approvalStatus !== "ASKIDA"

  const paymentTermsDays = Math.max(0, Number(input.paymentTermsDays ?? 30))
  const paymentTermsLabel =
    input.paymentTermsLabel?.trim() ||
    (paymentTermsDays === 0 ? "Peşin" : `${paymentTermsDays} Gün Vadeli`)

  if (input.id) {
    const existing = await prisma.supplier.findUnique({ where: { id: input.id } })
    if (!existing) {
      throw new LogisticsDomainError("SUPPLIER_NOT_FOUND", "Güncellenecek tedarikçi bulunamadı.", 404)
    }
    return prisma.supplier.update({
      where: { id: input.id },
      data: {
        ...(input.code?.trim() ? { code: input.code.trim().toUpperCase() } : {}),
        name: input.name.trim(),
        contactPerson: input.contactPerson?.trim() ?? existing.contactPerson,
        email: input.email?.trim() ?? existing.email,
        phone: input.phone?.trim() ?? existing.phone,
        taxNumber: input.taxNumber?.trim() ?? existing.taxNumber,
        taxOffice: input.taxOffice?.trim() ?? existing.taxOffice,
        iban: input.iban?.trim() ?? existing.iban,
        address: input.address?.trim() ?? existing.address,
        glnNumber: cleanGln,
        category: input.category || existing.category || "GENEL",
        criticalityLevel: input.criticalityLevel || existing.criticalityLevel || "ORTA",
        approvalStatus,
        blacklistedReason: approvalStatus === "KARALISTE" ? blacklistedReason : null,
        leadTimeDays: Math.max(1, Number(input.leadTimeDays ?? existing.leadTimeDays ?? 5)),
        paymentTermsDays,
        paymentTermsLabel,
        supportsConsignment:
          input.supportsConsignment !== undefined
            ? Boolean(input.supportsConsignment)
            : existing.supportsConsignment,
        supportsDropship:
          input.supportsDropship !== undefined
            ? Boolean(input.supportsDropship)
            : existing.supportsDropship,
        isAlternativeReady:
          input.isAlternativeReady !== undefined
            ? Boolean(input.isAlternativeReady)
            : existing.isAlternativeReady,
        isActive: computedActive,
        notes: input.notes !== undefined ? input.notes : `${existing.notes || ""} [Güncelleyen: ${actor}]`.trim(),
      },
    })
  }

  const cleanCode =
    input.code?.trim().toUpperCase() ||
    `SUP-${input.name
      .trim()
      .toUpperCase()
      .replace(/[^A-Z0-9]/g, "")
      .slice(0, 6)}-${Math.floor(10 + Math.random() * 89)}`

  const duplicate = await prisma.supplier.findFirst({ where: { code: cleanCode } })
  if (duplicate) {
    throw new LogisticsDomainError(
      "DUPLICATE_SUPPLIER_CODE",
      `Bu tedarikçi kodu (${cleanCode}) zaten kayıtlı.`,
      409
    )
  }

  return prisma.supplier.create({
    data: {
      code: cleanCode,
      name: input.name.trim(),
      contactPerson: input.contactPerson?.trim() || null,
      email: input.email?.trim() || null,
      phone: input.phone?.trim() || null,
      taxNumber: input.taxNumber?.trim() || null,
      taxOffice: input.taxOffice?.trim() || null,
      iban: input.iban?.trim() || null,
      address: input.address?.trim() || null,
      glnNumber: cleanGln,
      category: input.category || "GENEL",
      criticalityLevel: input.criticalityLevel || "ORTA",
      approvalStatus,
      blacklistedReason,
      leadTimeDays: Math.max(1, Number(input.leadTimeDays ?? 5)),
      paymentTermsDays,
      paymentTermsLabel,
      supportsConsignment: Boolean(input.supportsConsignment),
      supportsDropship: Boolean(input.supportsDropship),
      isAlternativeReady: input.isAlternativeReady !== undefined ? Boolean(input.isAlternativeReady) : true,
      isActive: computedActive,
      rating: 4.5,
      scorecardScore: 90,
      scorecardTier: "A",
      notes: input.notes?.trim() || `Kaydı oluşturan: ${actor}`,
    },
  })
}

export async function listSupplierItemLinks(filter?: { supplierId?: string; itemId?: string }) {
  const [links, suppliers, items] = await Promise.all([
    prisma.lojistikSupplierItemLink.findMany({
      ...(filter?.supplierId ? { where: { supplierId: filter.supplierId } } : {}),
      orderBy: { isPrimary: "desc" },
    }),
    prisma.supplier.findMany(),
    prisma.inventoryItem.findMany(),
  ])

  const supMap = new Map(suppliers.map((s: any) => [s.id, s]))
  const itemMap = new Map(items.map((i: any) => [i.id, i]))

  return links
    .filter((l: any) => (!filter?.itemId ? true : l.itemId === filter.itemId))
    .map((l: any) => {
      const sup = supMap.get(l.supplierId)
      const item = itemMap.get(l.itemId)
      return {
        ...l,
        supplierCode: sup?.code ?? "-",
        supplierName: sup?.name ?? "-",
        supplierApprovalStatus: sup?.approvalStatus ?? "ONAYLI",
        supplierScore: sup?.scorecardScore ?? null,
        sku: item?.sku ?? "-",
        itemName: item?.name ?? "-",
        baseUnit: item?.baseUnit ?? "Adet",
      }
    })
}

export async function upsertSupplierItemLink(input: {
  supplierId: string
  itemId: string
  supplierSku?: string | null
  unitCost: number
  currency?: string
  moq?: number
  leadTimeDays?: number
  isPrimary?: boolean
  isActive?: boolean
  notes?: string | null
}) {
  const [supplier, item] = await Promise.all([
    prisma.supplier.findUnique({ where: { id: input.supplierId } }),
    prisma.inventoryItem.findUnique({ where: { id: input.itemId } }),
  ])

  if (!supplier) {
    throw new LogisticsDomainError("SUPPLIER_NOT_FOUND", "Tedarikçi bulunamadı.", 404)
  }
  if (supplier.approvalStatus === "KARALISTE" || !supplier.isActive) {
    throw new LogisticsDomainError(
      "SUPPLIER_BLOCKED",
      `${supplier.name} aktif/onaylı değil (${supplier.approvalStatus}); ürün kataloğuna bağlanamaz.`,
      400
    )
  }
  if (!item) {
    throw new LogisticsDomainError("ITEM_NOT_FOUND", "Stok kalemi bulunamadı.", 404)
  }

  if (input.isPrimary) {
    const others = await prisma.lojistikSupplierItemLink.findMany({
      where: { itemId: input.itemId },
    })
    for (const row of others) {
      if (row.supplierId !== input.supplierId && row.isPrimary) {
        await prisma.lojistikSupplierItemLink.update({
          where: { id: row.id },
          data: { isPrimary: false },
        })
      }
    }
  }

  const existing = await prisma.lojistikSupplierItemLink.findFirst({
    where: { supplierId: input.supplierId, itemId: input.itemId },
  })

  const payload = {
    supplierId: input.supplierId,
    itemId: input.itemId,
    supplierSku: input.supplierSku?.trim() || `${supplier.code}-${item.sku}`,
    unitCost: Math.max(0, Number(input.unitCost ?? item.standardCost ?? 0)),
    currency: input.currency || "TRY",
    moq: Math.max(1, Number(input.moq ?? 1)),
    leadTimeDays: Math.max(1, Number(input.leadTimeDays ?? supplier.leadTimeDays ?? 3)),
    isPrimary: Boolean(input.isPrimary),
    isActive: input.isActive !== undefined ? Boolean(input.isActive) : true,
    lastQuotedAt: new Date(),
    notes: input.notes?.trim() || null,
  }

  if (existing) {
    return prisma.lojistikSupplierItemLink.update({
      where: { id: existing.id },
      data: payload,
    })
  }
  return prisma.lojistikSupplierItemLink.create({ data: payload })
}

export async function listSupplierDocuments(supplierId?: string) {
  const [docs, suppliers] = await Promise.all([
    prisma.lojistikSupplierDocument.findMany({
      ...(supplierId ? { where: { supplierId } } : {}),
      orderBy: { createdAt: "desc" },
    }),
    prisma.supplier.findMany(),
  ])
  const supMap = new Map(suppliers.map((s: any) => [s.id, s]))
  return docs.map((d: any) => ({
    ...d,
    status: d.status === "INCELEMEDE" ? "INCELEMEDE" : computeDocumentExpiryStatus(d.expiresAt),
    supplierName: supMap.get(d.supplierId)?.name ?? "-",
    supplierCode: supMap.get(d.supplierId)?.code ?? "-",
  }))
}

export async function createSupplierDocument(input: {
  supplierId: string
  docType: string
  title: string
  fileName: string
  fileUrl: string
  mimeType?: string | null
  fileSizeBytes?: number | null
  validFrom?: string | null
  expiresAt?: string | null
  uploadedBy: string
  uploadedVia?: "ERP" | "PORTAL"
  notes?: string | null
}) {
  const sup = await prisma.supplier.findUnique({ where: { id: input.supplierId } })
  if (!sup) {
    throw new LogisticsDomainError("SUPPLIER_NOT_FOUND", "Tedarikçi bulunamadı.", 404)
  }
  if (!input.title?.trim() || !input.fileName?.trim()) {
    throw new LogisticsDomainError("MISSING_DOC_FIELDS", "Belge başlığı ve dosya adı zorunludur.", 400)
  }

  const validFromDate = input.validFrom ? new Date(input.validFrom) : new Date()
  const expiresDate = input.expiresAt ? new Date(input.expiresAt) : null
  const status =
    input.uploadedVia === "PORTAL"
      ? "INCELEMEDE"
      : computeDocumentExpiryStatus(expiresDate)

  return prisma.lojistikSupplierDocument.create({
    data: {
      supplierId: input.supplierId,
      docType: input.docType || "DIGER",
      title: input.title.trim(),
      fileName: input.fileName.trim(),
      fileUrl: input.fileUrl?.trim() || `/uploads/supplier-docs/${encodeURIComponent(input.fileName.trim())}`,
      mimeType: input.mimeType || "application/pdf",
      fileSizeBytes: input.fileSizeBytes ? Number(input.fileSizeBytes) : null,
      validFrom: validFromDate,
      expiresAt: expiresDate,
      status,
      uploadedBy: input.uploadedBy,
      uploadedVia: input.uploadedVia || "ERP",
      notes: input.notes?.trim() || null,
    },
  })
}

export async function reviewSupplierDocumentStatus(
  docId: string,
  decision: "ONAYLA" | "SURESI_DOLMUS" | "INCELEMEDE"
) {
  const doc = await prisma.lojistikSupplierDocument.findUnique({ where: { id: docId } })
  if (!doc) {
    throw new LogisticsDomainError("DOC_NOT_FOUND", "Tedarikçi belgesi bulunamadı.", 404)
  }
  const nextStatus =
    decision === "ONAYLA"
      ? computeDocumentExpiryStatus(doc.expiresAt)
      : decision === "SURESI_DOLMUS"
        ? "SURESI_DOLMUS"
        : "INCELEMEDE"

  return prisma.lojistikSupplierDocument.update({
    where: { id: docId },
    data: { status: nextStatus },
  })
}

function doesCategoryMatchItem(supplierCategory: string | null | undefined, itemCategory: string | null | undefined): boolean {
  const sc = (supplierCategory || "").toUpperCase()
  const ic = (itemCategory || "").toUpperCase()
  if (sc === "KESME_CICEK" && (ic.includes("CICEK") || ic.includes("ÇİÇEK") || ic.includes("BUKET"))) return true
  if (sc === "SAKSI_BITKI" && (ic.includes("SAKSI") || ic.includes("ORKIDE") || ic.includes("BİTKİ"))) return true
  if (sc === "CAM_SERAMIK" && (ic.includes("VAZO") || ic.includes("CAM") || ic.includes("SERAMIK"))) return true
  if (sc === "AMBALAJ_KOLI" && (ic.includes("AMBALAJ") || ic.includes("KOLI") || ic.includes("SUNGER"))) return true
  if (sc === "LOJISTIK_SARF" && (ic.includes("SARF") || ic.includes("AMBALAJ"))) return true
  return sc === "GENEL"
}

export async function getSingleSourceRiskReport() {
  const [items, suppliers, links, policies, balances] = await Promise.all([
    prisma.inventoryItem.findMany(),
    prisma.supplier.findMany(),
    prisma.lojistikSupplierItemLink.findMany(),
    prisma.reorderPolicy.findMany(),
    prisma.stockBalance.findMany(),
  ])

  const supMap = new Map(suppliers.map((s: any) => [s.id, s]))
  const activeApprovedSuppliers = suppliers.filter(
    (s: any) => s.isActive && (s.approvalStatus || "ONAYLI") === "ONAYLI"
  )

  const availByItem = new Map<string, number>()
  for (const b of balances) {
    availByItem.set(b.itemId, (availByItem.get(b.itemId) || 0) + Number(b.availableQty || 0))
  }

  const ropByItem = new Map<string, number>()
  for (const p of policies) {
    ropByItem.set(p.itemId, Math.max(ropByItem.get(p.itemId) || 0, Number(p.calculatedRop || 0)))
  }

  const linksByItem = new Map<string, any[]>()
  for (const l of links) {
    if (!l.isActive) continue
    const arr = linksByItem.get(l.itemId) || []
    arr.push(l)
    linksByItem.set(l.itemId, arr)
  }
  for (const p of policies) {
    const arr = linksByItem.get(p.itemId) || []
    if (!arr.some((x) => x.supplierId === p.supplierId)) {
      arr.push({
        id: `pol-${p.id}`,
        supplierId: p.supplierId,
        itemId: p.itemId,
        unitCost: Number(p.unitCostTry || 0),
        moq: Number(p.minOrderQtyMoq || 1),
        leadTimeDays: Number(p.leadTimeDays || 5),
        isPrimary: true,
        isActive: true,
        fromReorderPolicy: true,
      })
      linksByItem.set(p.itemId, arr)
    }
  }

  const riskItems: any[] = []
  let multiSourceSafeCount = 0

  for (const item of items) {
    if (item.isActive === false) continue
    const rawLinks = linksByItem.get(item.id) || []

    const approvedLinks = rawLinks.filter((l) => {
      const s = supMap.get(l.supplierId)
      return s && s.isActive && (s.approvalStatus || "ONAYLI") === "ONAYLI"
    })
    const inactiveOrBlockedLinks = rawLinks.filter((l) => {
      const s = supMap.get(l.supplierId)
      return !s || !s.isActive || (s.approvalStatus || "ONAYLI") !== "ONAYLI"
    })

    const approvedSupIds = new Set(approvedLinks.map((l) => l.supplierId))
    if (approvedSupIds.size >= 2) {
      multiSourceSafeCount += 1
      continue
    }

    const availableQty = Number((availByItem.get(item.id) || 0).toFixed(2))
    const maxRop = ropByItem.get(item.id) || 0
    const primaryLink = approvedLinks[0]
    const primarySup = primaryLink ? supMap.get(primaryLink.supplierId) : null
    const isCriticalVendor = primarySup?.criticalityLevel === "KRITIK"

    const riskLevel =
      approvedSupIds.size === 0
        ? "KRITIK_TEDARIKCISIZ"
        : availableQty <= maxRop || isCriticalVendor
          ? "KRITIK_TEK_KAYNAK"
          : "YUKSEK_TEK_KAYNAK"

    const candidates = activeApprovedSuppliers
      .filter((s: any) => !approvedSupIds.has(s.id) && s.isAlternativeReady !== false)
      .map((s: any) => {
        const catMatch = doesCategoryMatchItem(s.category, item.category)
        const baseScore = Number(s.scorecardScore ?? (s.rating || 4.5) * 20)
        const matchScore = Number((baseScore + (catMatch ? 18 : 0) - Number(s.leadTimeDays || 5) * 1.5).toFixed(1))
        return {
          supplierId: s.id,
          code: s.code,
          name: s.name,
          category: s.category || "GENEL",
          leadTimeDays: Number(s.leadTimeDays || 5),
          scorecardScore: baseScore,
          tier: s.scorecardTier || "B",
          categoryMatch: catMatch,
          matchScore,
          suggestedUnitCost: Number(item.standardCost || 0),
        }
      })
      .sort((a: any, b: any) => b.matchScore - a.matchScore)
      .slice(0, 4)

    riskItems.push({
      itemId: item.id,
      sku: item.sku,
      itemName: item.name,
      category: item.category,
      availableQty,
      reorderPoint: maxRop,
      approvedSupplierCount: approvedSupIds.size,
      blockedOrSuspendedCount: inactiveOrBlockedLinks.length,
      riskLevel,
      currentSuppliers: approvedLinks.map((l) => {
        const s = supMap.get(l.supplierId)
        return {
          supplierId: l.supplierId,
          code: s?.code ?? "-",
          name: s?.name ?? "-",
          criticalityLevel: s?.criticalityLevel ?? "ORTA",
          leadTimeDays: l.leadTimeDays ?? s?.leadTimeDays ?? 5,
          unitCost: l.unitCost || item.standardCost || 0,
        }
      }),
      alternativeCandidates: candidates,
    })
  }

  riskItems.sort((a, b) => a.approvedSupplierCount - b.approvedSupplierCount)

  return {
    totalActiveItems: riskItems.length + multiSourceSafeCount,
    multiSourceSafeCount,
    singleSourceRiskCount: riskItems.filter((r) => r.approvedSupplierCount === 1).length,
    noApprovedSupplierCount: riskItems.filter((r) => r.approvedSupplierCount === 0).length,
    riskItems,
  }
}

export async function recalculateEoqPoliciesAndSuggestions(warehouseId?: string) {
  const [policies, items, warehouses, suppliers, balances, openPos] = await Promise.all([
    prisma.reorderPolicy.findMany({
      ...(warehouseId && warehouseId !== "ALL" ? { where: { warehouseId } } : {}),
    }),
    prisma.inventoryItem.findMany(),
    prisma.warehouse.findMany(),
    prisma.supplier.findMany(),
    prisma.stockBalance.findMany(),
    prisma.lojistikPurchaseOrder.findMany({
      include: { lines: true },
    }),
  ])

  const itemMap = new Map(items.map((i: any) => [i.id, i]))
  const whMap = new Map(warehouses.map((w: any) => [w.id, w]))
  const supMap = new Map(suppliers.map((s: any) => [s.id, s]))

  const availMap = new Map<string, number>()
  for (const b of balances) {
    const k = `${b.itemId}::${b.warehouseId}`
    availMap.set(k, (availMap.get(k) || 0) + Number(b.availableQty || 0))
  }

  // Açık PO'lardaki henüz teslim alınmamış beklenen miktarlar (stok pozisyonu = mevcut + yoldaki)
  const onOrderMap = new Map<string, number>()
  for (const po of openPos) {
    if (["TAMAMLANDI", "TESLIM_ALINDI", "IPTAL"].includes(po.status)) continue
    for (const line of po.lines || []) {
      const rem = Math.max(0, Number(line.orderedQty || 0) - Number(line.receivedQty || 0))
      const k = `${line.itemId}::${po.warehouseId}`
      onOrderMap.set(k, (onOrderMap.get(k) || 0) + rem)
    }
  }

  const enriched: any[] = []
  for (const pol of policies) {
    const item = itemMap.get(pol.itemId)
    const wh = whMap.get(pol.warehouseId)
    const sup = supMap.get(pol.supplierId)
    if (!item || !sup) continue

    const annualDemand =
      Number(pol.annualDemand || 0) > 0
        ? Number(pol.annualDemand)
        : Math.max(365, Math.round(Number(pol.avgDailyDemand || 10) * 365))
    const orderingCostTry = Number(pol.orderingCostTry || 450)
    const unitCostTry = Number(pol.unitCostTry || item.standardCost || 25)
    const holdingCostTry =
      Number(pol.holdingCostTry || 0) > 0
        ? Number(pol.holdingCostTry)
        : Math.max(1, Number((unitCostTry * 0.22).toFixed(2)))

    const avail = Number((availMap.get(`${pol.itemId}::${pol.warehouseId}`) || 0).toFixed(2))
    const onOrder = Number((onOrderMap.get(`${pol.itemId}::${pol.warehouseId}`) || 0).toFixed(2))

    const calc = computeEoqAndRopMetrics({
      annualDemand,
      orderingCostTry,
      holdingCostTry,
      avgDailyDemand: Number(pol.avgDailyDemand || 10),
      demandStdDev: Number(pol.demandStdDev || 2.5),
      leadTimeDays: Number(pol.leadTimeDays || sup.leadTimeDays || 5),
      serviceLevelPercent: Number(pol.serviceLevelZ) >= 2.3 ? 99 : Number(pol.serviceLevelZ) >= 2.0 ? 98 : 95,
      seasonalityMultiplier: Number(pol.seasonalityMultiplier || 1),
      currentAvailableQty: avail,
      onOrderQty: onOrder,
      minOrderQtyMoq: Number(pol.minOrderQtyMoq || 25),
    })

    await prisma.reorderPolicy.update({
      where: { id: pol.id },
      data: {
        calculatedSafetyStock: calc.safetyStock,
        calculatedRop: calc.rop,
        economicOrderQty: calc.eoq > 0 ? calc.eoq : pol.economicOrderQty,
        annualDemand,
        orderingCostTry,
        holdingCostTry,
        unitCostTry,
        lastCalculatedAt: new Date(),
      },
    })

    enriched.push({
      id: pol.id,
      itemId: pol.itemId,
      sku: item.sku,
      itemName: item.name,
      baseUnit: item.baseUnit || "Adet",
      warehouseId: pol.warehouseId,
      warehouseName: wh?.name ?? pol.warehouseId,
      supplierId: pol.supplierId,
      supplierCode: sup.code,
      supplierName: sup.name,
      supplierStatus: sup.approvalStatus || "ONAYLI",
      avgDailyDemand: Number(pol.avgDailyDemand),
      demandStdDev: Number(pol.demandStdDev),
      leadTimeDays: Number(pol.leadTimeDays),
      seasonalityMultiplier: Number(pol.seasonalityMultiplier || 1),
      annualDemand,
      orderingCostTry,
      holdingCostTry,
      unitCostTry,
      minOrderQtyMoq: Number(pol.minOrderQtyMoq || 1),
      availableQty: avail,
      onOrderQty: onOrder,
      netPosition: calc.netPosition,
      safetyStock: calc.safetyStock,
      rop: calc.rop,
      eoq: calc.eoq,
      needsReorder: calc.needsReorder,
      suggestedOrderQty: calc.suggestedOrderQty,
      estimatedOrderCostTry: Number((calc.suggestedOrderQty * unitCostTry).toFixed(2)),
    })
  }

  enriched.sort((a, b) => Number(b.needsReorder) - Number(a.needsReorder) || a.netPosition - a.rop - (b.netPosition - b.rop))
  return enriched
}
