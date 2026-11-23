/**
 * Sunum ERP — Turizm Faz 5: B2B Partner Ağı Finans, Mutabakat, İletişim, Raporlar ve Workspace Snapshot
 * (Maddeler E, F, G, I, J)
 */

import crypto from "crypto"
import { prisma } from "@/lib/db"
import { createNotificationMany } from "@/lib/services/notificationService"
import { DemoDbEDocumentProvider } from "@/lib/logistics/providers/efatura-irsaliye"
import {
  exportLogisticsReportToExcelBuffer,
  exportLogisticsReportToPdfBuffer,
} from "@/lib/logistics/reports/exportReports"
import type { LogisticsReportPayload } from "@/lib/logistics/reports/constantsAndHelpers"
import { isDemoEnvironment } from "@/lib/config/production-feature-flags"
import { logTourismAudit, TourismDomainError } from "@/lib/tourism/security"
import type { TourismScopeContext } from "@/lib/tourism/types"
import {
  B2B_RESOURCE_TYPE_META,
  roundMoney,
  verifyReciprocalLedgerBalance,
} from "./constantsAndHelpers"
import { listVisiblePartnerResources } from "./partnerNetworkCoreService"

async function notifyCounterpartyUsers(companyId: string, title: string, message: string) {
  const users: any[] = await (prisma as any).user
    .findMany({ where: { isActive: true } })
    .catch(() => [])
  const ids = users
    .filter((u) => (companyId === "trzm-comp-main" ? !u.partnerCompanyId && !u.supplierId : u.partnerCompanyId === companyId))
    .map((u) => u.id)
    .slice(0, 10)
  if (ids.length === 0) return
  await createNotificationMany(
    ids.map((userId) => ({
      userId,
      type: "INFO",
      title,
      message,
      link: "/dashboard/partner-agi",
    }))
  ).catch(() => {})
}

// ── E) KOMİSYON, DÖNEMSEL HAKEDİŞ / MUTABAKAT VE İTİRAZ AKIŞI ──────────────────

export async function createSettlementPeriod(
  scope: TourismScopeContext,
  input: {
    counterpartyCompanyId: string
    periodLabel: string
    periodStart: string
    periodEnd: string
    notes?: string
  }
) {
  const actorCompanyId = scope.effectiveCompanyId
  const counterpartyId = String(input.counterpartyCompanyId || "").trim()
  if (!counterpartyId || counterpartyId === actorCompanyId) {
    throw new TourismDomainError("VALIDATION_ERROR", "Geçerli bir karşı partner firma seçilmelidir.", 400)
  }

  const periodStart = new Date(input.periodStart)
  const periodEnd = new Date(input.periodEnd)
  if (Number.isNaN(periodStart.getTime()) || Number.isNaN(periodEnd.getTime()) || periodEnd < periodStart) {
    throw new TourismDomainError("VALIDATION_ERROR", "Geçerli bir dönem başlangıç ve bitiş tarihi girin.", 400)
  }

  const allRes: any[] = await (prisma as any).turizmCrossReservation.findMany().catch(() => [])
  const matching = allRes.filter((r) => {
    if (!["CONFIRMED", "COMPLETED"].includes(r.status)) return false
    if (r.settlementId) return false
    const isPair =
      (r.ownerCompanyId === actorCompanyId && r.bookingCompanyId === counterpartyId) ||
      (r.ownerCompanyId === counterpartyId && r.bookingCompanyId === actorCompanyId)
    if (!isPair) return false
    const start = new Date(r.startAt)
    return start >= periodStart && start <= periodEnd
  })

  if (matching.length === 0) {
    throw new TourismDomainError(
      "VALIDATION_ERROR",
      "Seçilen dönem ve partner ikilisi için mutabakata bağlanacak açık çapraz rezervasyon bulunamadı.",
      400
    )
  }

  const ownerCompanyId = matching[0].ownerCompanyId
  const bookingCompanyId = matching[0].bookingCompanyId
  const grossVolumeTry = roundMoney(matching.reduce((s, r) => s + Number(r.grossAmountTry || r.netAmountTry || 0), 0))
  const commissionTotalTry = roundMoney(matching.reduce((s, r) => s + Number(r.commissionAmountTry || 0), 0))
  const ownerNetPayableTry = roundMoney(matching.reduce((s, r) => s + Number(r.ownerNetAmountTry || r.netAmountTry || 0), 0))

  const now = new Date()
  const settlementNo = `MTB-${now.getFullYear()}-${String(Date.now()).slice(-5)}`
  const isActorOwner = actorCompanyId === ownerCompanyId

  const created = await (prisma as any).turizmPartnerSettlement.create({
    data: {
      id: `trzm-b2b-stl-${crypto.randomUUID().slice(0, 8)}`,
      settlementNo,
      periodLabel: input.periodLabel?.trim() || `${periodStart.toISOString().slice(0, 7)} Dönemi`,
      periodStart,
      periodEnd,
      ownerCompanyId,
      bookingCompanyId,
      reservationCount: matching.length,
      grossVolumeTry,
      commissionTotalTry,
      ownerNetPayableTry,
      adjustmentAmountTry: 0,
      status: "PENDING_COUNTERPARTY",
      ownerApprovedAt: isActorOwner ? now : null,
      ownerApprovedBy: isActorOwner ? scope.username : null,
      bookerApprovedAt: !isActorOwner ? now : null,
      bookerApprovedBy: !isActorOwner ? scope.username : null,
      notes: input.notes?.trim() || null,
      createdAt: now,
      updatedAt: now,
    },
  })

  for (const r of matching) {
    await (prisma as any).turizmCrossReservation
      .update({ where: { id: r.id }, data: { settlementId: created.id } })
      .catch(() => {})
  }

  await notifyCounterpartyUsers(
    counterpartyId,
    `Yeni Mutabakat Dönemi (${settlementNo})`,
    `${created.periodLabel} için ${matching.length} rezervasyon içeren (${ownerNetPayableTry.toLocaleString("tr-TR")} ₺ net) mutabakat onayınza sunuldu.`
  )

  await logTourismAudit({
    userId: scope.userId,
    action: "B2B_SETTLEMENT_CREATED",
    resource: "turizm_b2b",
    resourceId: created.id,
    moduleKey: "turizm_b2b",
    branchId: scope.branchId,
    companyId: actorCompanyId,
    metadata: { settlementNo, reservationCount: matching.length, ownerNetPayableTry },
  })

  return created
}

export async function respondToSettlement(
  scope: TourismScopeContext,
  input: {
    settlementId: string
    decision: "APPROVE" | "DISPUTE" | "ADJUST_AND_RESUBMIT" | "MARK_SETTLED"
    note?: string
    adjustmentAmountTry?: number
  }
) {
  const actorCompanyId = scope.effectiveCompanyId
  const stl = await (prisma as any).turizmPartnerSettlement.findUnique({
    where: { id: input.settlementId },
  })
  if (!stl) {
    throw new TourismDomainError("NOT_FOUND", "Mutabakat kaydı bulunamadı.", 404)
  }

  const isOwner = stl.ownerCompanyId === actorCompanyId
  const isBooker = stl.bookingCompanyId === actorCompanyId
  if (!isOwner && !isBooker) {
    throw new TourismDomainError(
      "FORBIDDEN_COMPANY_SCOPE",
      "Yalnızca tarafı olduğunuz mutabakat dönemlerinde işlem yapabilirsiniz.",
      403
    )
  }

  const now = new Date()
  const patch: Record<string, any> = { updatedAt: now }

  if (input.decision === "APPROVE") {
    if (isOwner) {
      patch.ownerApprovedAt = now
      patch.ownerApprovedBy = scope.username
    } else {
      patch.bookerApprovedAt = now
      patch.bookerApprovedBy = scope.username
    }
    const bothApproved =
      Boolean(patch.ownerApprovedAt ?? stl.ownerApprovedAt) &&
      Boolean(patch.bookerApprovedAt ?? stl.bookerApprovedAt)
    patch.status = bothApproved ? "APPROVED_BOTH" : "PENDING_COUNTERPARTY"
    patch.disputeNote = null
  } else if (input.decision === "DISPUTE") {
    if (!input.note?.trim()) {
      throw new TourismDomainError("VALIDATION_ERROR", "İtiraz gerekçesi zorunludur.", 400)
    }
    patch.status = "DISPUTED"
    patch.disputeNote = input.note.trim()
  } else if (input.decision === "ADJUST_AND_RESUBMIT") {
    const adj = roundMoney(Number(input.adjustmentAmountTry ?? 0))
    patch.adjustmentAmountTry = adj
    patch.adjustmentReason = input.note?.trim() || "Düzeltme uygulandı"
    patch.ownerNetPayableTry = roundMoney(Math.max(0, Number(stl.ownerNetPayableTry || 0) + adj))
    patch.status = "PENDING_COUNTERPARTY"
    patch.ownerApprovedAt = isOwner ? now : null
    patch.ownerApprovedBy = isOwner ? scope.username : null
    patch.bookerApprovedAt = !isOwner ? now : null
    patch.bookerApprovedBy = !isOwner ? scope.username : null
    patch.disputeNote = null
  } else if (input.decision === "MARK_SETTLED") {
    if (stl.status !== "APPROVED_BOTH") {
      throw new TourismDomainError(
        "VALIDATION_ERROR",
        "Mahsuplaşma/ödeme kapatma için her iki firmanın da mutabakatı onaylamış olması gerekir.",
        400
      )
    }
    patch.status = "SETTLED"
  }

  const updated = await (prisma as any).turizmPartnerSettlement.update({
    where: { id: stl.id },
    data: patch,
  })

  if (patch.status === "SETTLED") {
    const ledgers: any[] = await (prisma as any).turizmPartnerLedgerEntry
      .findMany({ where: { settlementId: stl.id } })
      .catch(() => [])
    for (const l of ledgers) {
      await (prisma as any).turizmPartnerLedgerEntry
        .update({ where: { id: l.id }, data: { status: "SETTLED" } })
        .catch(() => {})
    }
  }

  const counterpartyId = isOwner ? stl.bookingCompanyId : stl.ownerCompanyId
  await notifyCounterpartyUsers(
    counterpartyId,
    `Mutabakat Güncellendi (${stl.settlementNo})`,
    `${stl.settlementNo} durumu ${updated.status} oldu.${input.note ? ` Not: ${input.note}` : ""}`
  )

  await logTourismAudit({
    userId: scope.userId,
    action: `B2B_SETTLEMENT_${input.decision}`,
    resource: "turizm_b2b",
    resourceId: stl.id,
    moduleKey: "turizm_b2b",
    branchId: scope.branchId,
    companyId: actorCompanyId,
    metadata: { settlementNo: stl.settlementNo, nextStatus: updated.status },
  })

  return updated
}

// ── F) FİNANS & E-BELGE TETİKLEME (DemoDbEDocumentProvider) ────────────────────

export async function issuePartnerEDocument(
  scope: TourismScopeContext,
  input: {
    targetType: "CROSS_RESERVATION" | "SETTLEMENT"
    targetId: string
    vatRatePct?: number
  }
) {
  const actorCompanyId = scope.effectiveCompanyId
  const vatRate = Math.min(20, Math.max(0, Number(input.vatRatePct ?? 20)))
  const provider = new DemoDbEDocumentProvider()

  if (input.targetType === "CROSS_RESERVATION") {
    const res = await (prisma as any).turizmCrossReservation.findUnique({ where: { id: input.targetId } })
    if (!res) throw new TourismDomainError("NOT_FOUND", "Çapraz rezervasyon bulunamadı.", 404)
    if (res.ownerCompanyId !== actorCompanyId && res.bookingCompanyId !== actorCompanyId) {
      throw new TourismDomainError("FORBIDDEN_COMPANY_SCOPE", "Bu rezervasyon için belge kesme yetkiniz yok.", 403)
    }
    if (res.eDocumentRefNo) {
      return { alreadyIssued: true, documentNo: res.eDocumentRefNo }
    }

    const counterpartyId = res.ownerCompanyId === actorCompanyId ? res.bookingCompanyId : res.ownerCompanyId
    const counterparty = await (prisma as any).turizmPartnerCompany.findUnique({ where: { id: counterpartyId } })
    const netAmount = roundMoney(res.ownerNetAmountTry || res.netAmountTry || 0)

    const docResult = await provider.submitEDocument({
      documentType: "E_FATURA",
      relatedOrderNo: res.reservationNo,
      receiverTitle: counterparty?.name ?? counterpartyId,
      receiverVknTckn: counterparty?.taxNumber ?? "9100000000",
      receiverTaxOffice: counterparty?.taxOffice ?? "Merkez V.D.",
      lines: [
        {
          sku: res.resourceType,
          name: `B2B Partner Kaynak Paylaşım Hizmeti (${res.reservationNo})`,
          quantity: 1,
          unit: "ADET",
          unitPrice: netAmount,
          vatRate,
        },
      ],
    })

    const docNo = docResult.documentNo
    await (prisma as any).turizmCrossReservation.update({
      where: { id: res.id },
      data: { eDocumentRefNo: docNo, eDocumentIssuedAt: new Date() },
    })

    // Mevcut Finance tablosuna gelir/gider kaydı (yalnızca tek yönlü ilgili firma perspektifinde)
    const fin = await (prisma as any).finance
      .create({
        data: {
          type: res.ownerCompanyId === actorCompanyId ? "INCOME" : "EXPENSE",
          category: "B2B Partner Paylaşım",
          amount: netAmount,
          description: `${res.reservationNo} — B2B Partner e-Belge (${docNo})`,
          date: new Date(),
          branchId: scope.branchId || "local-debug-branch",
        },
      })
      .catch(() => null)

    await logTourismAudit({
      userId: scope.userId,
      action: "B2B_EDOCUMENT_ISSUED",
      resource: "turizm_b2b",
      resourceId: res.id,
      moduleKey: "turizm_b2b",
      branchId: scope.branchId,
      companyId: actorCompanyId,
      metadata: { documentNo: docNo, financeId: fin?.id ?? null, amountTry: netAmount },
    })

    return { alreadyIssued: false, documentNo: docNo, financeId: fin?.id ?? null }
  }

  const stl = await (prisma as any).turizmPartnerSettlement.findUnique({ where: { id: input.targetId } })
  if (!stl) throw new TourismDomainError("NOT_FOUND", "Mutabakat dönemi bulunamadı.", 404)
  if (stl.ownerCompanyId !== actorCompanyId && stl.bookingCompanyId !== actorCompanyId) {
    throw new TourismDomainError("FORBIDDEN_COMPANY_SCOPE", "Bu mutabakat için belge kesme yetkiniz yok.", 403)
  }
  if (stl.eDocumentRefNo) {
    return { alreadyIssued: true, documentNo: stl.eDocumentRefNo }
  }

  const counterpartyId = stl.ownerCompanyId === actorCompanyId ? stl.bookingCompanyId : stl.ownerCompanyId
  const counterparty = await (prisma as any).turizmPartnerCompany.findUnique({ where: { id: counterpartyId } })
  const netAmount = roundMoney(stl.ownerNetPayableTry || 0)

  const docResult = await provider.submitEDocument({
    documentType: "E_FATURA",
    relatedOrderNo: stl.settlementNo,
    receiverTitle: counterparty?.name ?? counterpartyId,
    receiverVknTckn: counterparty?.taxNumber ?? "9100000000",
    receiverTaxOffice: counterparty?.taxOffice ?? "Merkez V.D.",
    lines: [
      {
        sku: "B2B-SETTLEMENT",
        name: `B2B Dönemsel Partner Mutabakatı (${stl.periodLabel} / ${stl.settlementNo})`,
        quantity: 1,
        unit: "ADET",
        unitPrice: netAmount,
        vatRate,
      },
    ],
  })

  await (prisma as any).turizmPartnerSettlement.update({
    where: { id: stl.id },
    data: { eDocumentRefNo: docResult.documentNo, updatedAt: new Date() },
  })

  await logTourismAudit({
    userId: scope.userId,
    action: "B2B_SETTLEMENT_EDOCUMENT_ISSUED",
    resource: "turizm_b2b",
    resourceId: stl.id,
    moduleKey: "turizm_b2b",
    branchId: scope.branchId,
    companyId: actorCompanyId,
    metadata: { documentNo: docResult.documentNo, settlementNo: stl.settlementNo, amountTry: netAmount },
  })

  return { alreadyIssued: false, documentNo: docResult.documentNo }
}

// ── G) REZERVASYON BAZLI PARTNER MESAJ / NOT AKIŞI ────────────────────────────

export async function postPartnerMessage(
  scope: TourismScopeContext,
  input: {
    crossReservationId: string
    messageType?: "NOTE" | "APPROVAL_REQUEST" | "CHANGE_REQUEST"
    body: string
  }
) {
  const actorCompanyId = scope.effectiveCompanyId
  const body = String(input.body || "").trim()
  if (!body) {
    throw new TourismDomainError("VALIDATION_ERROR", "Mesaj içeriği boş olamaz.", 400)
  }

  const res = await (prisma as any).turizmCrossReservation.findUnique({
    where: { id: input.crossReservationId },
  })
  if (!res) throw new TourismDomainError("NOT_FOUND", "Çapraz rezervasyon bulunamadı.", 404)
  if (res.ownerCompanyId !== actorCompanyId && res.bookingCompanyId !== actorCompanyId) {
    throw new TourismDomainError(
      "FORBIDDEN_COMPANY_SCOPE",
      "Yalnızca tarafı olduğunuz çapraz rezervasyonlara mesaj yazabilirsiniz.",
      403
    )
  }

  const senderComp = await (prisma as any).turizmPartnerCompany.findUnique({ where: { id: actorCompanyId } })
  const created = await (prisma as any).turizmPartnerMessage.create({
    data: {
      id: `trzm-b2b-msg-${crypto.randomUUID().slice(0, 8)}`,
      crossReservationId: res.id,
      senderCompanyId: actorCompanyId,
      senderUserId: scope.userId,
      senderName: `${scope.username} (${senderComp?.name ?? actorCompanyId})`,
      messageType: input.messageType || "NOTE",
      body,
      createdAt: new Date(),
    },
  })

  const counterpartyId = res.ownerCompanyId === actorCompanyId ? res.bookingCompanyId : res.ownerCompanyId
  await notifyCounterpartyUsers(
    counterpartyId,
    `Yeni Partner Mesajı (${res.reservationNo})`,
    `${senderComp?.name ?? actorCompanyId}: "${body.slice(0, 120)}"`
  )

  return created
}

// ── WORKSPACE SNAPSHOT + I) ANALİTİK & RAPOR DIŞA AKTARMA ─────────────────────

export async function getPartnerNetworkWorkspaceSnapshot(
  scope: TourismScopeContext,
  filters?: {
    resourceType?: string
    city?: string
    startAt?: string
    endAt?: string
    search?: string
  }
) {
  const activeCompanyId = scope.effectiveCompanyId
  const demoMode = isDemoEnvironment()

  const [
    companies,
    allPartnerships,
    allHistory,
    allCrossRes,
    allSettlements,
    allLedger,
    allMessages,
    allConflicts,
    poolData,
  ] = await Promise.all([
    (prisma as any).turizmPartnerCompany.findMany().catch(() => []),
    (prisma as any).turizmPartnership.findMany().catch(() => []),
    (prisma as any).turizmPartnershipHistoryLog.findMany().catch(() => []),
    (prisma as any).turizmCrossReservation.findMany().catch(() => []),
    (prisma as any).turizmPartnerSettlement.findMany().catch(() => []),
    (prisma as any).turizmPartnerLedgerEntry.findMany().catch(() => []),
    (prisma as any).turizmPartnerMessage.findMany().catch(() => []),
    (prisma as any).turizmPartnerConflictLog.findMany().catch(() => []),
    listVisiblePartnerResources(scope, filters),
  ])

  const companyMap = new Map<string, any>(companies.map((c: any) => [c.id, c]))
  const activeCompany = companyMap.get(activeCompanyId) ?? {
    id: activeCompanyId,
    code: "FIRMA",
    name: scope.partnerCompanyName ?? "Aktif Firma",
    companyType: scope.partnerCompanyType ?? "MAIN_OPERATOR",
  }

  // Firma kapsamlı partnerlikler
  const myPartnerships = allPartnerships
    .filter((p: any) => p.requesterCompanyId === activeCompanyId || p.targetCompanyId === activeCompanyId)
    .map((p: any) => {
      const isIncoming = p.targetCompanyId === activeCompanyId
      const counterpartyId = isIncoming ? p.requesterCompanyId : p.targetCompanyId
      const cp = companyMap.get(counterpartyId)
      const history = allHistory
        .filter((h: any) => h.partnershipId === p.id)
        .sort((a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      return {
        ...p,
        direction: isIncoming ? "INCOMING" : "OUTGOING",
        counterpartyCompanyId: counterpartyId,
        counterpartyCompanyName: cp?.name ?? counterpartyId,
        counterpartyCompanyCode: cp?.code ?? "",
        counterpartyCompanyType: cp?.companyType ?? "",
        counterpartyCity: cp?.city ?? "",
        history,
      }
    })
    .sort((a: any, b: any) => new Date(b.updatedAt || b.createdAt).getTime() - new Date(a.updatedAt || a.createdAt).getTime())

  // Davet edilebilir diğer aktif firmalar
  const existingPairCompanyIds = new Set(
    myPartnerships
      .filter((p: any) => ["APPROVED", "PENDING"].includes(p.status))
      .map((p: any) => p.counterpartyCompanyId)
  )
  const invitableCompanies = companies.filter(
    (c: any) => c.id !== activeCompanyId && c.status === "ACTIVE" && !existingPairCompanyIds.has(c.id)
  )

  // Firma kapsamlı çapraz rezervasyonlar (gelen talepler + giden rezervasyonlar)
  const allResourcesMap = new Map<string, any>([
    ...poolData.ownResources.map((r: any) => [r.id, r] as [string, any]),
    ...poolData.partnerPoolResources.map((r: any) => [r.id, r] as [string, any]),
  ])

  const myCrossReservations = allCrossRes
    .filter((r: any) => r.ownerCompanyId === activeCompanyId || r.bookingCompanyId === activeCompanyId)
    .map((r: any) => {
      const roleForViewer = r.ownerCompanyId === activeCompanyId ? "OWNER" : "BOOKER"
      const ownerComp = companyMap.get(r.ownerCompanyId)
      const bookingComp = companyMap.get(r.bookingCompanyId)
      const resObj = allResourcesMap.get(r.sharedResourceId)
      const messages = allMessages
        .filter((m: any) => m.crossReservationId === r.id)
        .sort((a: any, b: any) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime())
      return {
        ...r,
        roleForViewer,
        ownerCompanyName: ownerComp?.name ?? r.ownerCompanyId,
        bookingCompanyName: bookingComp?.name ?? r.bookingCompanyId,
        resourceTitle: resObj?.title ?? B2B_RESOURCE_TYPE_META[r.resourceType]?.label ?? r.resourceType,
        messages,
      }
    })
    .sort((a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())

  // Firma kapsamlı mutabakatlar
  const mySettlements = allSettlements
    .filter((s: any) => s.ownerCompanyId === activeCompanyId || s.bookingCompanyId === activeCompanyId)
    .map((s: any) => ({
      ...s,
      roleForViewer: s.ownerCompanyId === activeCompanyId ? "OWNER" : "BOOKER",
      ownerCompanyName: companyMap.get(s.ownerCompanyId)?.name ?? s.ownerCompanyId,
      bookingCompanyName: companyMap.get(s.bookingCompanyId)?.name ?? s.bookingCompanyId,
    }))
    .sort((a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())

  // Firma kapsamlı cari hareketler — HER FİRMA SADECE KENDİ TARAFINI GÖRÜR (Madde F & H)
  const myLedgerEntries = allLedger
    .filter((l: any) => l.companyId === activeCompanyId)
    .map((l: any) => ({
      ...l,
      counterpartyCompanyName: companyMap.get(l.counterpartyCompanyId)?.name ?? l.counterpartyCompanyId,
    }))
    .sort((a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())

  // Sistem geneli karşılıklı cari denge özeti (yalnızca tutarlılık metriği, karşı taraf kaydı sızdırmadan)
  const relevantPairKeys = new Set(myLedgerEntries.map((l: any) => l.pairKey))
  const ledgerBalanceAudit = verifyReciprocalLedgerBalance(
    allLedger.filter((l: any) => relevantPairKeys.has(l.pairKey))
  )

  const myConflicts = allConflicts
    .filter((c: any) => c.ownerCompanyId === activeCompanyId || c.bookingCompanyId === activeCompanyId)
    .sort((a: any, b: any) => new Date(b.attemptedAt).getTime() - new Date(a.attemptedAt).getTime())

  // KPI & Analitik (Madde I)
  const activeConfirmedOrDone = myCrossReservations.filter((r: any) =>
    ["CONFIRMED", "COMPLETED"].includes(r.status)
  )
  const ownerRevenueTry = roundMoney(
    activeConfirmedOrDone
      .filter((r: any) => r.roleForViewer === "OWNER")
      .reduce((s: number, r: any) => s + Number(r.ownerNetAmountTry || r.netAmountTry || 0), 0)
  )
  const bookerVolumeTry = roundMoney(
    activeConfirmedOrDone
      .filter((r: any) => r.roleForViewer === "BOOKER")
      .reduce((s: number, r: any) => s + Number(r.grossAmountTry || r.netAmountTry || 0), 0)
  )
  const totalCommissionTry = roundMoney(
    activeConfirmedOrDone.reduce((s: number, r: any) => s + Number(r.commissionAmountTry || 0), 0)
  )
  const openReceivableTry = roundMoney(
    myLedgerEntries
      .filter((l: any) => l.status === "OPEN" && l.entryType === "RECEIVABLE")
      .reduce((s: number, l: any) => s + Number(l.amountTry || 0), 0)
  )
  const openPayableTry = roundMoney(
    myLedgerEntries
      .filter((l: any) => l.status === "OPEN" && l.entryType === "PAYABLE")
      .reduce((s: number, l: any) => s + Number(l.amountTry || 0), 0)
  )

  // Partner bazlı hacim kırılımı
  const partnerVolumeMap = new Map<
    string,
    {
      partnerCompanyId: string
      partnerCompanyName: string
      reservationCount: number
      grossVolumeTry: number
      commissionTry: number
      netBalanceTry: number
    }
  >()
  for (const r of activeConfirmedOrDone) {
    const cpId = r.roleForViewer === "OWNER" ? r.bookingCompanyId : r.ownerCompanyId
    const cpName = r.roleForViewer === "OWNER" ? r.bookingCompanyName : r.ownerCompanyName
    const cur = partnerVolumeMap.get(cpId) ?? {
      partnerCompanyId: cpId,
      partnerCompanyName: cpName,
      reservationCount: 0,
      grossVolumeTry: 0,
      commissionTry: 0,
      netBalanceTry: 0,
    }
    cur.reservationCount += 1
    cur.grossVolumeTry = roundMoney(cur.grossVolumeTry + Number(r.grossAmountTry || r.netAmountTry || 0))
    cur.commissionTry = roundMoney(cur.commissionTry + Number(r.commissionAmountTry || 0))
    cur.netBalanceTry = roundMoney(
      cur.netBalanceTry +
        (r.roleForViewer === "OWNER"
          ? Number(r.ownerNetAmountTry || r.netAmountTry || 0)
          : -Number(r.ownerNetAmountTry || r.netAmountTry || 0))
    )
    partnerVolumeMap.set(cpId, cur)
  }

  const activeOwnResources = poolData.ownResources.filter((r: any) => r.status === "ACTIVE")
  const utilizedOwnResources = activeOwnResources.filter((r: any) => r.activeCrossBookingCount > 0)
  const resourceUtilizationPct =
    activeOwnResources.length > 0
      ? Math.round((utilizedOwnResources.length / activeOwnResources.length) * 100)
      : 0

  const rejectedCount = myCrossReservations.filter((r: any) => r.status === "REJECTED").length

  const analytics = {
    approvedPartnerCount: myPartnerships.filter((p: any) => p.status === "APPROVED").length,
    pendingPartnerCount: myPartnerships.filter((p: any) => p.status === "PENDING").length,
    ownSharedResourceCount: poolData.ownResources.length,
    visiblePartnerResourceCount: poolData.partnerPoolResources.length,
    totalCrossReservationCount: myCrossReservations.length,
    pendingApprovalCount: myCrossReservations.filter((r: any) => r.status === "PENDING_APPROVAL").length,
    ownerRevenueTry,
    bookerVolumeTry,
    totalCommissionTry,
    openReceivableTry,
    openPayableTry,
    netPositionTry: roundMoney(openReceivableTry - openPayableTry),
    resourceUtilizationPct,
    conflictCount: myConflicts.length,
    rejectedCount,
    partnerBreakdown: Array.from(partnerVolumeMap.values()).sort((a, b) => b.grossVolumeTry - a.grossVolumeTry),
  }

  return {
    isDemoMode: demoMode,
    activeCompany: {
      id: activeCompany.id,
      code: activeCompany.code,
      name: activeCompany.name,
      companyType: activeCompany.companyType,
      city: activeCompany.city ?? null,
    },
    // Madde J: Demo "Firma Perspektifi" listesi SADECE demo modunda ve gerçek partner hesabı değilken döner
    demoPerspectiveCompanies:
      demoMode && !scope.isPartnerScoped
        ? companies.map((c: any) => ({
            id: c.id,
            code: c.code,
            name: c.name,
            companyType: c.companyType,
            city: c.city,
          }))
        : [],
    partnerships: myPartnerships,
    invitableCompanies,
    ownResources: poolData.ownResources,
    partnerPoolResources: poolData.partnerPoolResources,
    crossReservations: myCrossReservations,
    settlements: mySettlements,
    ledgerEntries: myLedgerEntries,
    ledgerBalanceAudit,
    conflicts: myConflicts,
    analytics,
  }
}

export async function exportPartnerNetworkReportBuffer(
  scope: TourismScopeContext,
  format: "xlsx" | "pdf"
): Promise<{ buffer: Buffer; filename: string; contentType: string }> {
  const snapshot = await getPartnerNetworkWorkspaceSnapshot(scope)
  const rows = snapshot.analytics.partnerBreakdown.map((p) => ({
    partnerCompanyName: p.partnerCompanyName,
    reservationCount: p.reservationCount,
    grossVolumeTry: p.grossVolumeTry,
    commissionTry: p.commissionTry,
    netBalanceTry: p.netBalanceTry,
  }))

  const payload: LogisticsReportPayload = {
    moduleKey: "turizm_b2b" as any,
    title: `B2B Partner Ağı Paylaşım & Mutabakat Raporu — ${snapshot.activeCompany.name}`,
    subtitle: `Onaylı Partner: ${snapshot.analytics.approvedPartnerCount} | Çapraz Rezervasyon: ${snapshot.analytics.totalCrossReservationCount} | Çakışma/Ret: ${snapshot.analytics.conflictCount}/${snapshot.analytics.rejectedCount}`,
    generatedAt: new Date().toISOString(),
    filtersApplied: {
      channelCode: snapshot.activeCompany.code,
    },
    chartTitle: "Partner Bazlı Paylaşım Hacmi (TRY)",
    chartData: rows.map((r) => ({
      name: r.partnerCompanyName,
      primaryValue: r.grossVolumeTry,
      primaryLabel: "Brüt Hacim (TRY)",
      secondaryValue: r.commissionTry,
      secondaryLabel: "Komisyon (TRY)",
    })),
    filterOptions: {},
    summaryCards: [
      { label: "Paylaşım Geliri (Net)", value: `${snapshot.analytics.ownerRevenueTry.toLocaleString("tr-TR")} ₺`, hint: "Kaynak sahibi olarak" },
      { label: "White-Label Kullanım Hacmi", value: `${snapshot.analytics.bookerVolumeTry.toLocaleString("tr-TR")} ₺`, hint: "Partner kaynak kullanımı" },
      { label: "Toplam Komisyon", value: `${snapshot.analytics.totalCommissionTry.toLocaleString("tr-TR")} ₺`, hint: "Onaylı & tamamlanan" },
      { label: "Kaynak Kullanım Oranı", value: `%${snapshot.analytics.resourceUtilizationPct}`, hint: "Aktif paylaşılan kaynaklar" },
      { label: "Açık Cari Alacak / Borç", value: `${snapshot.analytics.openReceivableTry.toLocaleString("tr-TR")} / ${snapshot.analytics.openPayableTry.toLocaleString("tr-TR")} ₺`, hint: "Yalnızca kendi firma tarafı" },
    ],
    columns: [
      { key: "partnerCompanyName", label: "Partner Firma", format: "text" },
      { key: "reservationCount", label: "Rezervasyon Adedi", format: "number" },
      { key: "grossVolumeTry", label: "Brüt Hacim (TRY)", format: "currency" },
      { key: "commissionTry", label: "Komisyon (TRY)", format: "currency" },
      { key: "netBalanceTry", label: "Net Pozisyon (TRY)", format: "currency" },
    ],
    rows: rows as unknown as Array<Record<string, string | number | null>>,
  }

  const dateTag = new Date().toISOString().slice(0, 10)
  if (format === "pdf") {
    const buffer = exportLogisticsReportToPdfBuffer(payload)
    return {
      buffer,
      filename: `b2b-partner-agi-raporu-${dateTag}.pdf`,
      contentType: "application/pdf",
    }
  }

  const buffer = exportLogisticsReportToExcelBuffer(payload)
  return {
    buffer,
    filename: `b2b-partner-agi-raporu-${dateTag}.xlsx`,
    contentType: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  }
}
