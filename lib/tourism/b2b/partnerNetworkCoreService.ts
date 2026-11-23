/**
 * Sunum ERP — Turizm Faz 5: B2B Partner Ağı Çekirdek Servisi (Maddeler A, B, C, D, H)
 *
 * - A) Partner firma ağı: davet, kabul/ret, askıya alma, çıkarma, ilişki geçmişi & audit log
 * - B) Ortak kaynak havuzu: kaynak açma, güncelleme, mevcut onaylı rezervasyonları koruyarak çekme
 * - C) Partner takviminden müsaitlik: sadece APPROVED partnerlere ve görünürlük + veri minimizasyonu ile
 * - D) Atomik çapraz rezervasyon (white-label): kaynak bazlı eşzamanlı çakışma kilidi (HTTP 409 + alternatifler),
 *      alt modül kaydının (Rent-a-Car / Otel / Tur) + çapraz rezervasyonun + karşılıklı cari kayıtlarının
 *      atomik oluşturulması ve hata anında iki taraflı geri alma (rollback).
 */

import crypto from "crypto"
import { prisma } from "@/lib/db"
import { createNotificationMany } from "@/lib/services/notificationService"
import { logTourismAudit, TourismDomainError } from "@/lib/tourism/security"
import type { TourismScopeContext } from "@/lib/tourism/types"
import {
  B2B_RESOURCE_TYPE_META,
  calculateCrossReservationFinancials,
  computeDurationDays,
  parseAllowedPartnerIds,
  rangesOverlap,
  roundMoney,
  sanitizeSharedResourceForViewer,
} from "./constantsAndHelpers"

// Sunucu tarafı kaynak bazlı eşzamanlı çakışma kilidi (in-process mutex)
const activeResourceLocks = new Set<string>()

async function withCrossResourceLock<T>(resourceId: string, fn: () => Promise<T>): Promise<T> {
  if (activeResourceLocks.has(resourceId)) {
    throw new TourismDomainError(
      "CONFLICT",
      "Bu kaynak üzerinde eşzamanlı başka bir çapraz rezervasyon işlemi yürütülüyor. Lütfen tekrar deneyin.",
      409,
      { reason: "CONCURRENT_LOCK", sharedResourceId: resourceId }
    )
  }
  activeResourceLocks.add(resourceId)
  try {
    return await fn()
  } finally {
    activeResourceLocks.delete(resourceId)
  }
}

async function getCompanyUserIds(companyId: string): Promise<string[]> {
  const users: any[] = await (prisma as any).user
    .findMany({ where: { isActive: true } })
    .catch(() => [])
  return users
    .filter((u) => {
      if (companyId === "trzm-comp-main") return !u.partnerCompanyId && !u.supplierId
      return u.partnerCompanyId === companyId
    })
    .map((u) => u.id)
    .slice(0, 10)
}

async function notifyCompanyUsers(params: {
  companyId: string
  type: "INFO" | "WARNING" | "SUCCESS" | "ERROR"
  title: string
  message: string
  link?: string
}) {
  const userIds = await getCompanyUserIds(params.companyId)
  if (userIds.length === 0) return
  await createNotificationMany(
    userIds.map((userId) => ({
      userId,
      type: params.type,
      title: params.title,
      message: params.message,
      link: params.link ?? "/dashboard/partner-agi",
    }))
  ).catch(() => {})
}

export async function getApprovedPartnerCompanyIds(companyId: string): Promise<Set<string>> {
  const all: any[] = await (prisma as any).turizmPartnership
    .findMany({ where: { status: "APPROVED" } })
    .catch(() => [])
  const set = new Set<string>()
  for (const ps of all) {
    if (ps.requesterCompanyId === companyId) set.add(ps.targetCompanyId)
    else if (ps.targetCompanyId === companyId) set.add(ps.requesterCompanyId)
  }
  return set
}

export async function findApprovedPartnershipBetween(
  companyA: string,
  companyB: string
): Promise<any | null> {
  const all: any[] = await (prisma as any).turizmPartnership
    .findMany({ where: { status: "APPROVED" } })
    .catch(() => [])
  return (
    all.find(
      (ps) =>
        (ps.requesterCompanyId === companyA && ps.targetCompanyId === companyB) ||
        (ps.requesterCompanyId === companyB && ps.targetCompanyId === companyA)
    ) ?? null
  )
}

// ── A) PARTNER FİRMA AĞI VE KARŞILIKLI ONAY ────────────────────────────────────

export async function invitePartnerCompany(
  scope: TourismScopeContext,
  input: {
    targetCompanyId: string
    commissionRatePct?: number
    settlementTermDays?: number
    allowWhiteLabel?: boolean
    notes?: string
  }
) {
  const requesterCompanyId = scope.effectiveCompanyId
  const targetCompanyId = String(input.targetCompanyId || "").trim()

  if (!targetCompanyId) {
    throw new TourismDomainError("VALIDATION_ERROR", "Davet edilecek partner firma seçilmelidir.", 400)
  }
  if (targetCompanyId === requesterCompanyId) {
    throw new TourismDomainError("VALIDATION_ERROR", "Kendi firmanıza partnerlik daveti gönderemezsiniz.", 400)
  }

  const [requester, target] = await Promise.all([
    (prisma as any).turizmPartnerCompany.findUnique({ where: { id: requesterCompanyId } }),
    (prisma as any).turizmPartnerCompany.findUnique({ where: { id: targetCompanyId } }),
  ])
  if (!requester || !target || target.status !== "ACTIVE") {
    throw new TourismDomainError("NOT_FOUND", "Hedef partner firma bulunamadı veya aktif değil.", 404)
  }

  const existingAll: any[] = await (prisma as any).turizmPartnership.findMany().catch(() => [])
  const duplicate = existingAll.find(
    (ps) =>
      ["PENDING", "APPROVED"].includes(ps.status) &&
      ((ps.requesterCompanyId === requesterCompanyId && ps.targetCompanyId === targetCompanyId) ||
        (ps.requesterCompanyId === targetCompanyId && ps.targetCompanyId === requesterCompanyId))
  )
  if (duplicate) {
    throw new TourismDomainError(
      "CONFLICT",
      `Bu firma ile zaten ${duplicate.status === "APPROVED" ? "onaylı" : "bekleyen"} bir partnerlik kaydı (${duplicate.code}) bulunuyor.`,
      409
    )
  }

  const now = new Date()
  const code = `PRT-BAG-${String(Date.now()).slice(-5)}`
  const created = await (prisma as any).turizmPartnership.create({
    data: {
      id: `trzm-ps-${crypto.randomUUID().slice(0, 8)}`,
      code,
      requesterCompanyId,
      targetCompanyId,
      status: "PENDING",
      commissionRatePct: Math.min(40, Math.max(0, Number(input.commissionRatePct ?? target.defaultCommissionRate ?? 10))),
      settlementTermDays: Math.min(90, Math.max(1, Math.floor(Number(input.settlementTermDays ?? 15)))),
      allowWhiteLabel: input.allowWhiteLabel !== false,
      notes: input.notes?.trim() || null,
      requestedAt: now,
      createdAt: now,
      updatedAt: now,
    },
  })

  await (prisma as any).turizmPartnershipHistoryLog.create({
    data: {
      id: `trzm-b2b-ph-${crypto.randomUUID().slice(0, 8)}`,
      partnershipId: created.id,
      fromStatus: null,
      toStatus: "PENDING",
      actorCompanyId: requesterCompanyId,
      actorUserId: scope.userId,
      actorName: scope.username,
      reason: input.notes?.trim() || "Partnerlik daveti gönderildi.",
      createdAt: now,
    },
  })

  await notifyCompanyUsers({
    companyId: targetCompanyId,
    type: "INFO",
    title: "Yeni B2B Partnerlik Daveti",
    message: `${requester.name} firmanızla %${created.commissionRatePct} komisyon oranıyla partnerlik daveti gönderdi (${code}).`,
  })

  await logTourismAudit({
    userId: scope.userId,
    action: "B2B_PARTNERSHIP_INVITED",
    resource: "turizm_b2b",
    resourceId: created.id,
    moduleKey: "turizm_b2b",
    branchId: scope.branchId,
    companyId: requesterCompanyId,
    metadata: { code, targetCompanyId, commissionRatePct: created.commissionRatePct },
  })

  return created
}

export async function respondOrUpdatePartnership(
  scope: TourismScopeContext,
  input: {
    partnershipId: string
    decision: "APPROVE" | "REJECT" | "SUSPEND" | "REACTIVATE" | "REMOVE"
    reason?: string
    confirmAuthorityApproval?: boolean
  }
) {
  const actorCompanyId = scope.effectiveCompanyId
  const ps = await (prisma as any).turizmPartnership.findUnique({
    where: { id: input.partnershipId },
  })
  if (!ps) {
    throw new TourismDomainError("NOT_FOUND", "Partnerlik kaydı bulunamadı.", 404)
  }

  const isRequester = ps.requesterCompanyId === actorCompanyId
  const isTarget = ps.targetCompanyId === actorCompanyId
  if (!isRequester && !isTarget) {
    throw new TourismDomainError(
      "FORBIDDEN_COMPANY_SCOPE",
      "Yalnızca tarafı olduğunuz partnerlik ilişkilerini yönetebilirsiniz.",
      403
    )
  }

  // Hassas kararlarda firma yetkilisi açık onayı (Madde H)
  if (["APPROVE", "SUSPEND", "REMOVE"].includes(input.decision) && input.confirmAuthorityApproval === false) {
    throw new TourismDomainError(
      "VALIDATION_ERROR",
      "Bu hassas partnerlik işlemi için firma yetkilisi onayı gereklidir.",
      400
    )
  }

  if ((input.decision === "APPROVE" || input.decision === "REJECT") && !isTarget) {
    throw new TourismDomainError(
      "FORBIDDEN_PARTNER_SCOPE",
      "Partnerlik davetini yalnızca davet edilen karşı firma onaylayabilir veya reddedebilir.",
      403
    )
  }

  const targetStatusMap: Record<string, string> = {
    APPROVE: "APPROVED",
    REJECT: "REJECTED",
    SUSPEND: "SUSPENDED",
    REACTIVATE: "APPROVED",
    REMOVE: "REMOVED",
  }
  const nextStatus = targetStatusMap[input.decision]
  if (!nextStatus) {
    throw new TourismDomainError("VALIDATION_ERROR", "Geçersiz partnerlik aksiyonu.", 400)
  }

  const prevStatus = ps.status
  const now = new Date()

  const updated = await (prisma as any).turizmPartnership.update({
    where: { id: ps.id },
    data: {
      status: nextStatus,
      respondedAt: now,
      updatedAt: now,
    },
  })

  await (prisma as any).turizmPartnershipHistoryLog.create({
    data: {
      id: `trzm-b2b-ph-${crypto.randomUUID().slice(0, 8)}`,
      partnershipId: ps.id,
      fromStatus: prevStatus,
      toStatus: nextStatus,
      actorCompanyId,
      actorUserId: scope.userId,
      actorName: scope.username,
      reason: input.reason?.trim() || `Durum güncellendi: ${prevStatus} → ${nextStatus}`,
      createdAt: now,
    },
  })

  const counterpartyId = isRequester ? ps.targetCompanyId : ps.requesterCompanyId
  await notifyCompanyUsers({
    companyId: counterpartyId,
    type: nextStatus === "APPROVED" ? "SUCCESS" : "WARNING",
    title: `Partnerlik Durumu Güncellendi (${ps.code})`,
    message: `Partnerlik ilişkisi ${prevStatus} durumundan ${nextStatus} durumuna alındı.${
      input.reason ? ` Not: ${input.reason}` : ""
    }`,
  })

  await logTourismAudit({
    userId: scope.userId,
    action: `B2B_PARTNERSHIP_${input.decision}`,
    resource: "turizm_b2b",
    resourceId: ps.id,
    moduleKey: "turizm_b2b",
    branchId: scope.branchId,
    companyId: actorCompanyId,
    metadata: { code: ps.code, fromStatus: prevStatus, toStatus: nextStatus, reason: input.reason ?? null },
  })

  return updated
}

// ── B & C) ORTAK KAYNAK HAVUZU VE PARTNER MÜSAİTLİK TAKVİMİ ────────────────────

export async function upsertSharedResource(
  scope: TourismScopeContext,
  input: {
    id?: string
    resourceType: string
    externalRefId?: string | null
    title: string
    category?: string | null
    city?: string | null
    capacity?: number
    netPartnerRateTry: number
    commissionRatePct?: number
    minDurationDays?: number
    visibilityScope?: string
    allowedPartnerIds?: string[]
    approvalMode?: string
    availableFrom?: string | null
    availableTo?: string | null
    hideSensitiveFields?: boolean
    sensitiveMeta?: { plate?: string; vin?: string; contactPhone?: string; internalCode?: string }
    withdrawalRuleNote?: string | null
    notes?: string | null
  }
) {
  const ownerCompanyId = scope.effectiveCompanyId
  const title = String(input.title || "").trim()
  if (!title) {
    throw new TourismDomainError("VALIDATION_ERROR", "Paylaşılacak kaynak başlığı zorunludur.", 400)
  }
  const rate = Number(input.netPartnerRateTry)
  if (!Number.isFinite(rate) || rate <= 0) {
    throw new TourismDomainError("VALIDATION_ERROR", "Partner birim fiyatı 0'dan büyük olmalıdır.", 400)
  }

  const now = new Date()
  const payload = {
    resourceType: input.resourceType || "VEHICLE",
    externalRefId: input.externalRefId?.trim() || null,
    title,
    category: input.category?.trim() || null,
    city: input.city?.trim() || null,
    capacity: Math.max(1, Math.floor(Number(input.capacity ?? 1))),
    netPartnerRateTry: roundMoney(rate),
    currency: "TRY",
    commissionRatePct: Math.min(40, Math.max(0, Number(input.commissionRatePct ?? 10))),
    minDurationDays: Math.max(1, Math.floor(Number(input.minDurationDays ?? 1))),
    visibilityScope: input.visibilityScope || "ALL_APPROVED_PARTNERS",
    allowedPartnerIdsJson:
      input.visibilityScope === "SELECTED_PARTNERS"
        ? JSON.stringify(Array.isArray(input.allowedPartnerIds) ? input.allowedPartnerIds : [])
        : null,
    approvalMode: input.approvalMode === "AUTO" ? "AUTO" : "MANUAL",
    availableFrom: input.availableFrom ? new Date(input.availableFrom) : null,
    availableTo: input.availableTo ? new Date(input.availableTo) : null,
    hideSensitiveFields: input.hideSensitiveFields !== false,
    sensitiveMetaJson: input.sensitiveMeta ? JSON.stringify(input.sensitiveMeta) : null,
    withdrawalRuleNote:
      input.withdrawalRuleNote?.trim() ||
      "Kaynak paylaşımdan çekildiğinde yalnızca yeni talepler kapanır; mevcut onaylı çapraz rezervasyonlar korunur.",
    notes: input.notes?.trim() || null,
    updatedAt: now,
  }

  let saved: any
  if (input.id) {
    const existing = await (prisma as any).turizmSharedResource.findUnique({ where: { id: input.id } })
    if (!existing) {
      throw new TourismDomainError("NOT_FOUND", "Ortak kaynak kaydı bulunamadı.", 404)
    }
    if (existing.ownerCompanyId !== ownerCompanyId) {
      throw new TourismDomainError(
        "FORBIDDEN_COMPANY_SCOPE",
        "Yalnızca kendi firmanıza ait ortak kaynakları düzenleyebilirsiniz.",
        403
      )
    }
    saved = await (prisma as any).turizmSharedResource.update({
      where: { id: existing.id },
      data: payload,
    })
  } else {
    saved = await (prisma as any).turizmSharedResource.create({
      data: {
        id: `trzm-b2b-res-${crypto.randomUUID().slice(0, 8)}`,
        ownerCompanyId,
        status: "ACTIVE",
        ...payload,
        createdAt: now,
      },
    })
  }

  await logTourismAudit({
    userId: scope.userId,
    action: input.id ? "B2B_SHARED_RESOURCE_UPDATED" : "B2B_SHARED_RESOURCE_PUBLISHED",
    resource: "turizm_b2b",
    resourceId: saved.id,
    moduleKey: "turizm_b2b",
    branchId: scope.branchId,
    companyId: ownerCompanyId,
    metadata: {
      title: saved.title,
      resourceType: saved.resourceType,
      visibilityScope: saved.visibilityScope,
      hideSensitiveFields: saved.hideSensitiveFields,
    },
  })

  return saved
}

/**
 * Paylaşımı geri çekme / duraklatma (Madde B):
 * Mevcut CONFIRMED / PENDING_APPROVAL çapraz rezervasyonlar bozulmaz, korunur;
 * yalnızca yeni partner taleplerine kapatılır.
 */
export async function withdrawOrToggleSharedResource(
  scope: TourismScopeContext,
  input: {
    sharedResourceId: string
    nextStatus: "ACTIVE" | "PAUSED" | "ARCHIVED"
    reason?: string
  }
) {
  const ownerCompanyId = scope.effectiveCompanyId
  const existing = await (prisma as any).turizmSharedResource.findUnique({
    where: { id: input.sharedResourceId },
  })
  if (!existing) {
    throw new TourismDomainError("NOT_FOUND", "Ortak kaynak bulunamadı.", 404)
  }
  if (existing.ownerCompanyId !== ownerCompanyId) {
    throw new TourismDomainError(
      "FORBIDDEN_COMPANY_SCOPE",
      "Yalnızca kendi firmanızın paylaştığı kaynakların durumunu değiştirebilirsiniz.",
      403
    )
  }

  const activeBookings: any[] = (
    await (prisma as any).turizmCrossReservation
      .findMany({ where: { sharedResourceId: existing.id } })
      .catch(() => [])
  ).filter((b: any) => ["CONFIRMED", "PENDING_APPROVAL", "HOLD"].includes(b.status))

  const updated = await (prisma as any).turizmSharedResource.update({
    where: { id: existing.id },
    data: {
      status: input.nextStatus,
      withdrawalRuleNote:
        input.reason?.trim() ||
        existing.withdrawalRuleNote ||
        "Paylaşım kapatıldı; mevcut onaylı çapraz rezervasyonlar aynen korunur.",
      updatedAt: new Date(),
    },
  })

  await logTourismAudit({
    userId: scope.userId,
    action: "B2B_SHARED_RESOURCE_STATUS_CHANGED",
    resource: "turizm_b2b",
    resourceId: existing.id,
    moduleKey: "turizm_b2b",
    branchId: scope.branchId,
    companyId: ownerCompanyId,
    metadata: {
      fromStatus: existing.status,
      toStatus: input.nextStatus,
      preservedActiveReservations: activeBookings.length,
    },
  })

  return {
    resource: updated,
    preservedActiveReservationCount: activeBookings.length,
    notice:
      activeBookings.length > 0 && input.nextStatus !== "ACTIVE"
        ? `Kaynak yeni taleplere kapatıldı; mevcut ${activeBookings.length} adet aktif çapraz rezervasyon korundu.`
        : "Kaynak paylaşım durumu güncellendi.",
  }
}

export async function listVisiblePartnerResources(
  scope: TourismScopeContext,
  filters?: {
    resourceType?: string
    city?: string
    startAt?: string
    endAt?: string
    search?: string
  }
) {
  const viewerCompanyId = scope.effectiveCompanyId
  const [approvedPartnerIds, allResources, allCrossBookings, companies] = await Promise.all([
    getApprovedPartnerCompanyIds(viewerCompanyId),
    (prisma as any).turizmSharedResource.findMany().catch(() => []),
    (prisma as any).turizmCrossReservation.findMany().catch(() => []),
    (prisma as any).turizmPartnerCompany.findMany().catch(() => []),
  ])

  const companyMap = new Map<string, any>(companies.map((c: any) => [c.id, c]))

  const ownResources: any[] = []
  const partnerPoolResources: any[] = []

  for (const res of allResources) {
    const ownerComp = companyMap.get(res.ownerCompanyId)
    const activeReservationsForRes = allCrossBookings.filter(
      (b: any) =>
        b.sharedResourceId === res.id &&
        ["HOLD", "PENDING_APPROVAL", "CONFIRMED"].includes(b.status)
    )

    // Tarih aralığı verilmişse müsaitlik hesapla
    let isAvailableForRange = res.status === "ACTIVE"
    if (filters?.startAt && filters?.endAt) {
      if (res.availableFrom && new Date(filters.startAt) < new Date(res.availableFrom)) {
        isAvailableForRange = false
      }
      if (res.availableTo && new Date(filters.endAt) > new Date(res.availableTo)) {
        isAvailableForRange = false
      }
      const hasOverlap = activeReservationsForRes.some((b: any) =>
        rangesOverlap(filters.startAt!, filters.endAt!, b.startAt, b.endAt)
      )
      if (hasOverlap) isAvailableForRange = false
    }

    const sanitized = sanitizeSharedResourceForViewer(res, viewerCompanyId)
    const enriched = {
      ...sanitized,
      ownerCompanyName: ownerComp?.name ?? res.ownerCompanyId,
      ownerCompanyCode: ownerComp?.code ?? "",
      ownerCompanyCity: ownerComp?.city ?? "",
      activeCrossBookingCount: activeReservationsForRes.length,
      bookedWindows: activeReservationsForRes.map((b: any) => ({
        startAt: b.startAt,
        endAt: b.endAt,
        status: b.status,
      })),
      isAvailableForRange,
    }

    if (res.ownerCompanyId === viewerCompanyId) {
      ownResources.push(enriched)
      continue
    }

    // SADECE APPROVED partnerlerin ACTIVE ve bu firmaya açık kaynakları görünür (Madde A & C)
    if (res.status !== "ACTIVE") continue
    if (!approvedPartnerIds.has(res.ownerCompanyId)) continue
    if (res.visibilityScope === "PRIVATE") continue
    if (res.visibilityScope === "SELECTED_PARTNERS") {
      const allowed = parseAllowedPartnerIds(res.allowedPartnerIdsJson)
      if (!allowed.includes(viewerCompanyId)) continue
    }

    if (filters?.resourceType && filters.resourceType !== "ALL" && res.resourceType !== filters.resourceType) {
      continue
    }
    if (
      filters?.city &&
      filters.city !== "ALL" &&
      String(res.city || "").toLocaleLowerCase("tr-TR") !== filters.city.toLocaleLowerCase("tr-TR")
    ) {
      continue
    }
    if (filters?.search) {
      const q = filters.search.trim().toLocaleLowerCase("tr-TR")
      const haystack = `${res.title} ${res.category ?? ""} ${res.city ?? ""} ${ownerComp?.name ?? ""}`.toLocaleLowerCase("tr-TR")
      if (!haystack.includes(q)) continue
    }

    partnerPoolResources.push(enriched)
  }

  return { ownResources, partnerPoolResources }
}

// ── D) ATOMİK ÇAPRAZ REZERVASYON (WHITE-LABEL) + ÇAKIŞMA KİLİDİ + ROLLBACK ───

async function createUnderlyingModuleLockRecord(params: {
  resource: any
  reservationNo: string
  bookingCompanyName: string
  guestOrCustomerLabel: string
  startAt: Date
  endAt: Date
  grossAmountTry: number
}): Promise<{ moduleType: string; recordId: string | null }> {
  const meta = B2B_RESOURCE_TYPE_META[params.resource.resourceType] ?? {
    moduleType: "TRANSFER",
  }
  const moduleType = meta.moduleType

  // Alt modülle atomik kayıt bağlantısı (Rent-a-Car / Otel). Kaynak gerçek bir araç/oda kaydına
  // (`externalRefId`) bağlıysa ilgili modülün takvimine CONFIRMED kayıt yazılır; bağlı değilse
  // çapraz rezervasyonun kendisi kaynak takvim kilidi olarak kullanılır.
  const refId = params.resource.externalRefId ? String(params.resource.externalRefId) : ""
  if (!refId) return { moduleType, recordId: null }

  const customers: any[] = await (prisma as any).customer.findMany({ take: 1 }).catch(() => [])
  const customerId = customers[0]?.id
  if (!customerId) return { moduleType, recordId: null }

  const nights = computeDurationDays(params.startAt, params.endAt)
  const noteText = `B2B Çapraz Rezervasyon (${params.reservationNo}) — ${params.bookingCompanyName} / ${params.guestOrCustomerLabel}`

  if (moduleType === "RENTACAR") {
    const vehicle = await (prisma as any).lojistikVehicle.findUnique({ where: { id: refId } }).catch(() => null)
    const vehicleClassId = vehicle?.rentalClassId
    if (vehicle && vehicleClassId) {
      const rec = await (prisma as any).turizmRentReservation.create({
        data: {
          id: `trzm-b2b-link-rnt-${crypto.randomUUID().slice(0, 8)}`,
          reservationNo: `B2B-${params.reservationNo}`,
          vehicleId: refId,
          vehicleClassId,
          customerId,
          startAt: params.startAt,
          endAt: params.endAt,
          rentalDays: nights,
          status: "CONFIRMED",
          dailyRateTry: params.resource.netPartnerRateTry,
          baseRentalAmountTry: params.grossAmountTry,
          totalEstimatedTry: params.grossAmountTry,
          finalTotalTry: params.grossAmountTry,
          notes: noteText,
          ownerCompanyId: params.resource.ownerCompanyId,
          createdBy: "turizm-b2b",
        },
      })
      return { moduleType, recordId: rec.id }
    }
  }

  if (moduleType === "HOTEL") {
    const room = await (prisma as any).turizmHotelRoom.findUnique({ where: { id: refId } }).catch(() => null)
    if (room?.roomTypeId) {
      const rec = await (prisma as any).turizmHotelReservation.create({
        data: {
          id: `trzm-b2b-link-otl-${crypto.randomUUID().slice(0, 8)}`,
          reservationNo: `B2B-${params.reservationNo}`,
          roomId: refId,
          roomTypeId: room.roomTypeId,
          customerId,
          channelSource: "AGENCY_B2B",
          agencyName: params.bookingCompanyName,
          checkInDate: params.startAt,
          checkOutDate: params.endAt,
          nightsCount: nights,
          status: "CONFIRMED",
          nightlyRateTry: params.resource.netPartnerRateTry,
          roomTotalTry: params.grossAmountTry,
          balanceDueTry: params.grossAmountTry,
          notes: noteText,
          ownerCompanyId: params.resource.ownerCompanyId,
          createdBy: "turizm-b2b",
        },
      })
      return { moduleType, recordId: rec.id }
    }
  }

  return { moduleType, recordId: null }
}

async function rollbackUnderlyingModuleRecord(moduleType: string | null, recordId: string | null) {
  if (!moduleType || !recordId) return
  if (moduleType === "RENTACAR") {
    await (prisma as any).turizmRentReservation.delete({ where: { id: recordId } }).catch(() => {})
  } else if (moduleType === "HOTEL") {
    await (prisma as any).turizmHotelReservation.delete({ where: { id: recordId } }).catch(() => {})
  }
}

export async function createAtomicCrossReservation(
  scope: TourismScopeContext,
  input: {
    sharedResourceId: string
    startAt: string
    endAt: string
    quantity?: number
    isWhiteLabel?: boolean
    guestOrCustomerLabel?: string
    notes?: string
    simulateFailureForRollbackTest?: boolean
  }
) {
  const bookingCompanyId = scope.effectiveCompanyId
  const sharedResourceId = String(input.sharedResourceId || "").trim()
  if (!sharedResourceId) {
    throw new TourismDomainError("VALIDATION_ERROR", "Rezerve edilecek ortak kaynak seçilmelidir.", 400)
  }

  const startAt = new Date(input.startAt)
  const endAt = new Date(input.endAt)
  if (Number.isNaN(startAt.getTime()) || Number.isNaN(endAt.getTime()) || endAt <= startAt) {
    throw new TourismDomainError("VALIDATION_ERROR", "Geçerli bir başlangıç ve bitiş tarihi girilmelidir.", 400)
  }

  return await withCrossResourceLock(sharedResourceId, async () => {
    const resource = await (prisma as any).turizmSharedResource.findUnique({
      where: { id: sharedResourceId },
    })
    if (!resource || resource.status !== "ACTIVE") {
      throw new TourismDomainError("NOT_FOUND", "Ortak kaynak bulunamadı veya paylaşıma kapalı.", 404)
    }
    if (resource.ownerCompanyId === bookingCompanyId) {
      throw new TourismDomainError(
        "VALIDATION_ERROR",
        "Kendi firmanıza ait bir kaynak için B2B çapraz rezervasyon açamazsınız.",
        400
      )
    }

    // 1. Onaylı partnerlik + görünürlük doğrulaması (fail-closed)
    const partnership = await findApprovedPartnershipBetween(bookingCompanyId, resource.ownerCompanyId)
    if (!partnership) {
      throw new TourismDomainError(
        "FORBIDDEN_PARTNER_SCOPE",
        "Bu kaynak sahibi firma ile onaylı (APPROVED) bir partnerlik anlaşmanız bulunmuyor.",
        403
      )
    }
    if (resource.visibilityScope === "PRIVATE") {
      throw new TourismDomainError("FORBIDDEN_PARTNER_SCOPE", "Bu kaynak partner paylaşımına kapalıdır.", 403)
    }
    if (resource.visibilityScope === "SELECTED_PARTNERS") {
      const allowed = parseAllowedPartnerIds(resource.allowedPartnerIdsJson)
      if (!allowed.includes(bookingCompanyId)) {
        throw new TourismDomainError(
          "FORBIDDEN_PARTNER_SCOPE",
          "Bu kaynak yalnızca kaynak sahibinin seçtiği partnerlere açıktır.",
          403
        )
      }
    }

    const durationDays = computeDurationDays(startAt, endAt)
    if (durationDays < (resource.minDurationDays || 1)) {
      throw new TourismDomainError(
        "VALIDATION_ERROR",
        `Bu kaynak için minimum kiralama/kullanım süresi ${resource.minDurationDays} gündür.`,
        400
      )
    }
    if (resource.availableFrom && startAt < new Date(resource.availableFrom)) {
      throw new TourismDomainError("VALIDATION_ERROR", "Seçilen tarih kaynağın paylaşım başlangıcından öncedir.", 400)
    }
    if (resource.availableTo && endAt > new Date(resource.availableTo)) {
      throw new TourismDomainError("VALIDATION_ERROR", "Seçilen tarih kaynağın paylaşım bitişinden sonradır.", 400)
    }

    // 2. Çakışma kontrolü (çapraz rezervasyonlar) + alternatif kaynak önerisi
    const allCrossBookings: any[] = await (prisma as any).turizmCrossReservation.findMany().catch(() => [])
    const conflict = allCrossBookings.find(
      (b) =>
        b.sharedResourceId === sharedResourceId &&
        ["HOLD", "PENDING_APPROVAL", "CONFIRMED"].includes(b.status) &&
        rangesOverlap(startAt, endAt, b.startAt, b.endAt)
    )

    if (conflict) {
      // Aynı tipte müsait alternatif ortak kaynakları öner
      const { partnerPoolResources } = await listVisiblePartnerResources(scope, {
        resourceType: resource.resourceType,
        startAt: startAt.toISOString(),
        endAt: endAt.toISOString(),
      })
      const alternatives = partnerPoolResources
        .filter((r) => r.id !== sharedResourceId && r.isAvailableForRange)
        .slice(0, 3)
        .map((r) => ({
          id: r.id,
          title: r.title,
          ownerCompanyName: r.ownerCompanyName,
          city: r.city,
          netPartnerRateTry: r.netPartnerRateTry,
        }))

      await (prisma as any).turizmPartnerConflictLog.create({
        data: {
          id: `trzm-b2b-cnf-${crypto.randomUUID().slice(0, 8)}`,
          sharedResourceId,
          resourceTitle: resource.title,
          ownerCompanyId: resource.ownerCompanyId,
          bookingCompanyId,
          attemptedStartAt: startAt,
          attemptedEndAt: endAt,
          conflictReservationNo: conflict.reservationNo,
          rejectionCode: "RESOURCE_TIME_CONFLICT",
          rejectionMessage: `Kaynak ${conflict.reservationNo} numaralı rezervasyonla çakışıyor.`,
          alternativesSuggestedCount: alternatives.length,
          actorUserId: scope.userId,
          attemptedAt: new Date(),
        },
      })

      throw new TourismDomainError(
        "CONFLICT",
        `Seçilen tarih aralığında "${resource.title}" başka bir çapraz rezervasyon (${conflict.reservationNo}) ile çakışıyor.`,
        409,
        {
          conflictReservationNo: conflict.reservationNo,
          alternatives,
        }
      )
    }

    // 3. Finansal hesaplama (komisyon + sahip net hakediş)
    const effectiveCommissionPct =
      typeof resource.commissionRatePct === "number"
        ? resource.commissionRatePct
        : partnership.commissionRatePct ?? 10
    const financials = calculateCrossReservationFinancials({
      unitRateTry: resource.netPartnerRateTry,
      durationDays,
      quantity: input.quantity ?? 1,
      commissionRatePct: effectiveCommissionPct,
    })

    const [ownerComp, bookingComp] = await Promise.all([
      (prisma as any).turizmPartnerCompany.findUnique({ where: { id: resource.ownerCompanyId } }),
      (prisma as any).turizmPartnerCompany.findUnique({ where: { id: bookingCompanyId } }),
    ])

    const now = new Date()
    const reservationNo = `CRZ-${now.getFullYear()}-${String(Date.now()).slice(-6)}`
    const initialStatus = resource.approvalMode === "AUTO" ? "CONFIRMED" : "PENDING_APPROVAL"
    const guestLabel = input.guestOrCustomerLabel?.trim() || "White-Label Müşteri"

    // 4. ATOMİK YAZMA + İKİ TARAFLI ROLLBACK GARANTİSİ
    let createdUnderlying: { moduleType: string; recordId: string | null } = {
      moduleType: B2B_RESOURCE_TYPE_META[resource.resourceType]?.moduleType ?? "TRANSFER",
      recordId: null,
    }
    let createdCrossRes: any = null
    const createdLedgerIds: string[] = []

    try {
      // 4a. Alt modül takvim/kayıt kilidi
      createdUnderlying = await createUnderlyingModuleLockRecord({
        resource,
        reservationNo,
        bookingCompanyName: bookingComp?.name ?? bookingCompanyId,
        guestOrCustomerLabel: guestLabel,
        startAt,
        endAt,
        grossAmountTry: financials.grossAmountTry,
      })

      // 4b. Çapraz rezervasyon kaydı
      createdCrossRes = await (prisma as any).turizmCrossReservation.create({
        data: {
          id: `trzm-b2b-crz-${crypto.randomUUID().slice(0, 8)}`,
          reservationNo,
          ownerCompanyId: resource.ownerCompanyId,
          bookingCompanyId,
          partnershipId: partnership.id,
          sharedResourceId: resource.id,
          resourceType: resource.resourceType,
          startAt,
          endAt,
          status: initialStatus,
          isWhiteLabel: input.isWhiteLabel !== false,
          quantity: financials.quantity,
          guestOrCustomerLabel: guestLabel,
          grossAmountTry: financials.grossAmountTry,
          netAmountTry: financials.ownerNetAmountTry,
          ownerNetAmountTry: financials.ownerNetAmountTry,
          commissionRatePct: financials.commissionRatePct,
          commissionAmountTry: financials.commissionAmountTry,
          currency: "TRY",
          underlyingModuleType: createdUnderlying.moduleType,
          underlyingRecordId: createdUnderlying.recordId,
          approvedAt: initialStatus === "CONFIRMED" ? now : null,
          approvedByUserId: initialStatus === "CONFIRMED" ? "AUTO_APPROVAL" : null,
          notes: input.notes?.trim() || null,
          createdAt: now,
          updatedAt: now,
        },
      })

      if (input.simulateFailureForRollbackTest) {
        throw new Error("SIMULATED_ATOMIC_FAILURE")
      }

      // 4c. Otomatik onaylı ise karşılıklı cari çiftini (A alacağı == B borcu) atomik yaz
      if (initialStatus === "CONFIRMED") {
        const pairKey = `pair-${createdCrossRes.id}`
        const dueDate = new Date(now.getTime() + (partnership.settlementTermDays || 15) * 86400000)

        const ownerEntry = await (prisma as any).turizmPartnerLedgerEntry.create({
          data: {
            id: `trzm-b2b-ldg-${crypto.randomUUID().slice(0, 8)}`,
            entryNo: `LDG-R-${String(Date.now()).slice(-6)}`,
            pairKey,
            companyId: resource.ownerCompanyId,
            counterpartyCompanyId: bookingCompanyId,
            crossReservationId: createdCrossRes.id,
            entryType: "RECEIVABLE",
            direction: "DEBIT",
            amountTry: financials.ownerNetAmountTry,
            currency: "TRY",
            status: "OPEN",
            dueDate,
            description: `${reservationNo} — ${resource.title} partner paylaşım alacağı (Net, %${financials.commissionRatePct} komisyon düşülmüş)`,
            createdAt: now,
          },
        })
        createdLedgerIds.push(ownerEntry.id)

        const bookerEntry = await (prisma as any).turizmPartnerLedgerEntry.create({
          data: {
            id: `trzm-b2b-ldg-${crypto.randomUUID().slice(0, 8)}`,
            entryNo: `LDG-P-${String(Date.now()).slice(-6)}`,
            pairKey,
            companyId: bookingCompanyId,
            counterpartyCompanyId: resource.ownerCompanyId,
            crossReservationId: createdCrossRes.id,
            entryType: "PAYABLE",
            direction: "CREDIT",
            amountTry: financials.ownerNetAmountTry,
            currency: "TRY",
            status: "OPEN",
            dueDate,
            description: `${reservationNo} — ${resource.title} white-label kullanım borcu (Sahip: ${ownerComp?.name ?? resource.ownerCompanyId})`,
            createdAt: now,
          },
        })
        createdLedgerIds.push(bookerEntry.id)
      }

      // 4d. Sistem başlangıç mesajı
      await (prisma as any).turizmPartnerMessage.create({
        data: {
          id: `trzm-b2b-msg-${crypto.randomUUID().slice(0, 8)}`,
          crossReservationId: createdCrossRes.id,
          senderCompanyId: bookingCompanyId,
          senderUserId: scope.userId,
          senderName: `${scope.username} (${bookingComp?.name ?? "Partner"})`,
          messageType: initialStatus === "CONFIRMED" ? "SYSTEM" : "APPROVAL_REQUEST",
          body:
            initialStatus === "CONFIRMED"
              ? `${reservationNo} otomatik onay kuralı ile kesinleşti ve karşılıklı cari kayıtları açıldı.`
              : `${reservationNo} için çapraz rezervasyon talebi iletildi. Sahip firma onayı bekleniyor.`,
          createdAt: now,
        },
      })
    } catch (err: any) {
      // Compensating rollback: iki tarafı da temizle
      for (const lid of createdLedgerIds) {
        await (prisma as any).turizmPartnerLedgerEntry.delete({ where: { id: lid } }).catch(() => {})
      }
      if (createdCrossRes?.id) {
        await (prisma as any).turizmCrossReservation.delete({ where: { id: createdCrossRes.id } }).catch(() => {})
      }
      await rollbackUnderlyingModuleRecord(createdUnderlying.moduleType, createdUnderlying.recordId)

      throw new TourismDomainError(
        "INTERNAL_ERROR",
        `Çapraz rezervasyon atomik yazımı sırasında hata oluştu; her iki tarafın kayıtları geri alındı (${err?.message || "bilinmeyen hata"}).`,
        500
      )
    }

    await notifyCompanyUsers({
      companyId: resource.ownerCompanyId,
      type: initialStatus === "CONFIRMED" ? "SUCCESS" : "INFO",
      title:
        initialStatus === "CONFIRMED"
          ? `Otomatik Onaylı Çapraz Rezervasyon (${reservationNo})`
          : `Yeni Çapraz Rezervasyon Talebi (${reservationNo})`,
      message: `${bookingComp?.name ?? bookingCompanyId}, "${resource.title}" kaynağınız için ${durationDays} günlük çapraz rezervasyon oluşturdu.`,
    })

    await logTourismAudit({
      userId: scope.userId,
      action: "B2B_CROSS_RESERVATION_CREATED",
      resource: "turizm_b2b",
      resourceId: createdCrossRes.id,
      moduleKey: "turizm_b2b",
      branchId: scope.branchId,
      companyId: bookingCompanyId,
      metadata: {
        reservationNo,
        ownerCompanyId: resource.ownerCompanyId,
        sharedResourceId,
        status: initialStatus,
        grossAmountTry: financials.grossAmountTry,
        ownerNetAmountTry: financials.ownerNetAmountTry,
        underlyingRecordId: createdUnderlying.recordId,
      },
    })

    return createdCrossRes
  })
}

export async function respondOrUpdateCrossReservation(
  scope: TourismScopeContext,
  input: {
    crossReservationId: string
    decision: "APPROVE" | "REJECT" | "CANCEL" | "COMPLETE"
    reason?: string
  }
) {
  const actorCompanyId = scope.effectiveCompanyId
  const res = await (prisma as any).turizmCrossReservation.findUnique({
    where: { id: input.crossReservationId },
  })
  if (!res) {
    throw new TourismDomainError("NOT_FOUND", "Çapraz rezervasyon bulunamadı.", 404)
  }

  const isOwner = res.ownerCompanyId === actorCompanyId
  const isBooker = res.bookingCompanyId === actorCompanyId
  if (!isOwner && !isBooker) {
    throw new TourismDomainError(
      "FORBIDDEN_COMPANY_SCOPE",
      "Yalnızca tarafı olduğunuz çapraz rezervasyonlarda işlem yapabilirsiniz.",
      403
    )
  }

  if ((input.decision === "APPROVE" || input.decision === "REJECT" || input.decision === "COMPLETE") && !isOwner) {
    throw new TourismDomainError(
      "FORBIDDEN_PARTNER_SCOPE",
      "Onay, ret ve tamamlama işlemleri yalnızca kaynak sahibi firma tarafından yapılabilir.",
      403
    )
  }

  const now = new Date()
  const statusMap: Record<string, string> = {
    APPROVE: "CONFIRMED",
    REJECT: "REJECTED",
    CANCEL: "CANCELLED",
    COMPLETE: "COMPLETED",
  }
  const nextStatus = statusMap[input.decision]
  if (!nextStatus) {
    throw new TourismDomainError("VALIDATION_ERROR", "Geçersiz rezervasyon aksiyonu.", 400)
  }

  const updated = await (prisma as any).turizmCrossReservation.update({
    where: { id: res.id },
    data: {
      status: nextStatus,
      approvedAt: input.decision === "APPROVE" ? now : res.approvedAt,
      approvedByUserId: input.decision === "APPROVE" ? scope.userId : res.approvedByUserId,
      rejectedReason: input.decision === "REJECT" || input.decision === "CANCEL" ? input.reason?.trim() || null : res.rejectedReason,
      updatedAt: now,
    },
  })

  // Onaylandığında karşılıklı cari çifti yoksa atomik oluştur
  if (input.decision === "APPROVE") {
    const existingLedger: any[] = await (prisma as any).turizmPartnerLedgerEntry
      .findMany({ where: { crossReservationId: res.id } })
      .catch(() => [])
    if (existingLedger.length === 0) {
      const pairKey = `pair-${res.id}`
      const netAmount = roundMoney(res.ownerNetAmountTry || res.netAmountTry || 0)
      const dueDate = new Date(now.getTime() + 15 * 86400000)

      await (prisma as any).turizmPartnerLedgerEntry.create({
        data: {
          id: `trzm-b2b-ldg-${crypto.randomUUID().slice(0, 8)}`,
          entryNo: `LDG-R-${String(Date.now()).slice(-6)}`,
          pairKey,
          companyId: res.ownerCompanyId,
          counterpartyCompanyId: res.bookingCompanyId,
          crossReservationId: res.id,
          entryType: "RECEIVABLE",
          direction: "DEBIT",
          amountTry: netAmount,
          currency: "TRY",
          status: "OPEN",
          dueDate,
          description: `${res.reservationNo} — Onaylanan çapraz rezervasyon alacağı`,
          createdAt: now,
        },
      })
      await (prisma as any).turizmPartnerLedgerEntry.create({
        data: {
          id: `trzm-b2b-ldg-${crypto.randomUUID().slice(0, 8)}`,
          entryNo: `LDG-P-${String(Date.now()).slice(-6)}`,
          pairKey,
          companyId: res.bookingCompanyId,
          counterpartyCompanyId: res.ownerCompanyId,
          crossReservationId: res.id,
          entryType: "PAYABLE",
          direction: "CREDIT",
          amountTry: netAmount,
          currency: "TRY",
          status: "OPEN",
          dueDate,
          description: `${res.reservationNo} — Onaylanan çapraz rezervasyon borcu`,
          createdAt: now,
        },
      })
    }
  }

  // Reddedildi veya iptal edildiyse alt modül kilidini serbest bırak ve açık cari çiftini VOID yap
  if (input.decision === "REJECT" || input.decision === "CANCEL") {
    await rollbackUnderlyingModuleRecord(res.underlyingModuleType ?? null, res.underlyingRecordId ?? null)
    const ledgers: any[] = await (prisma as any).turizmPartnerLedgerEntry
      .findMany({ where: { crossReservationId: res.id } })
      .catch(() => [])
    for (const l of ledgers) {
      if (l.status === "OPEN") {
        await (prisma as any).turizmPartnerLedgerEntry
          .update({ where: { id: l.id }, data: { status: "VOID" } })
          .catch(() => {})
      }
    }
  }

  await (prisma as any).turizmPartnerMessage.create({
    data: {
      id: `trzm-b2b-msg-${crypto.randomUUID().slice(0, 8)}`,
      crossReservationId: res.id,
      senderCompanyId: actorCompanyId,
      senderUserId: scope.userId,
      senderName: scope.username,
      messageType: "SYSTEM",
      body: `Rezervasyon durumu ${nextStatus} olarak güncellendi.${input.reason ? ` Not: ${input.reason}` : ""}`,
      createdAt: now,
    },
  })

  const counterpartyId = isOwner ? res.bookingCompanyId : res.ownerCompanyId
  await notifyCompanyUsers({
    companyId: counterpartyId,
    type: nextStatus === "CONFIRMED" || nextStatus === "COMPLETED" ? "SUCCESS" : "WARNING",
    title: `Çapraz Rezervasyon Güncellendi (${res.reservationNo})`,
    message: `${res.reservationNo} durumu ${nextStatus} olarak işlendi.${input.reason ? ` (${input.reason})` : ""}`,
  })

  await logTourismAudit({
    userId: scope.userId,
    action: `B2B_CROSS_RESERVATION_${input.decision}`,
    resource: "turizm_b2b",
    resourceId: res.id,
    moduleKey: "turizm_b2b",
    branchId: scope.branchId,
    companyId: actorCompanyId,
    metadata: { reservationNo: res.reservationNo, nextStatus, reason: input.reason ?? null },
  })

  return updated
}
