/**
 * Sunum ERP — Turizm Faz 3: Otel Yönetimi (Mini PMS) — Çekirdek Servis Katmanı
 *
 * Kapsam:
 * A) Oda tipleri, oda envanteri, fiyat tarifeleri (sezon/oda tipi/pansiyon), politika ayarları
 * B) Etkileşimli kat planı tek tıkla oda durumu güncelleme
 * C) Rezervasyon, sunucu tarafı per-room atomik çift rezervasyon kilidi, acenta kontenjan aşım engeli, Oda x Gün Gantt
 * D) Check-In / Check-Out (KVKK maskeli misafir kaydı, oda anahtar/durum, check-out bakiye kontrolü,
 *    otomatik housekeeping görevi, KBS giriş/çıkış hazırlığı ve fatura/E-Belge tetikleyicisi)
 */

import { prisma } from "@/lib/db"
import { checkPermission } from "@/lib/auth/server-permission"
import { DemoDbEDocumentProvider } from "@/lib/logistics/providers/efatura-irsaliye"
import { HOUSEKEEPING_ROLE_NAME, MAIN_COMPANY_ID } from "@/lib/tourism/constants"
import {
  applyCustomerKvkkMasking,
  doTimeIntervalsOverlap,
} from "@/lib/tourism/rentacar/constantsAndHelpers"
import {
  applyCompanyScopeFilter,
  logTourismAudit,
  TourismDomainError,
} from "@/lib/tourism/security"
import type { TourismScopeContext } from "@/lib/tourism/types"
import {
  buildRoomAvailabilityGantt,
  calculateHotelNights,
  computeFolioBalance,
  HOTEL_ROOM_STATUSES,
  type HotelRoomStatus,
} from "./constantsAndHelpers"

// ── Sunucu İçi Atomik Oda Rezervasyon Kilidi (Per-Room Mutex) ────────────────
const roomLockQueues = new Map<string, Promise<unknown>>()

export async function withRoomReservationLock<T>(
  roomId: string,
  task: () => Promise<T>
): Promise<T> {
  const key = String(roomId || "global-room")
  const previous = roomLockQueues.get(key) ?? Promise.resolve()

  let releaseNext!: () => void
  const currentGate = new Promise<void>((resolve) => {
    releaseNext = resolve
  })

  const chainedQueue = previous.then(() => currentGate, () => currentGate)
  roomLockQueues.set(key, chainedQueue)

  await previous.catch(() => undefined)
  try {
    return await task()
  } finally {
    releaseNext()
    if (roomLockQueues.get(key) === chainedQueue) {
      roomLockQueues.delete(key)
    }
  }
}

// ── Kısıtlı Temizlik Personeli (Housekeeping) Rolü Kapsam Koruyucuları ───────

export function isUserHousekeepingScoped(scope: TourismScopeContext): boolean {
  if (scope.isSuperAdmin || scope.isPlatformDeveloper) return false
  return scope.roleNames.includes(HOUSEKEEPING_ROLE_NAME)
}

export function assertNotHousekeepingScoped(
  scope: TourismScopeContext,
  actionLabel = "Bu işlem"
): void {
  if (isUserHousekeepingScoped(scope)) {
    throw new TourismDomainError(
      "FORBIDDEN_HOUSEKEEPING_SCOPE",
      `${actionLabel} yalnızca ön büro ve yönetim yetkisine açıktır; temizlik personeli yalnızca kendisine atanan oda görevlerini görebilir ve güncelleyebilir.`,
      403
    )
  }
}

export async function canUserViewGuestKvkkPii(
  scope: TourismScopeContext
): Promise<boolean> {
  if (scope.isPartnerScoped || isUserHousekeepingScoped(scope)) return false
  if (scope.isSuperAdmin || scope.isPlatformDeveloper) return true
  const [hasOtelApprove, hasCustApprove] = await Promise.all([
    checkPermission(scope.userId, scope.branchId, "turizm_otel", "approve").catch(() => false),
    checkPermission(scope.userId, scope.branchId, "customers", "approve").catch(() => false),
  ])
  return Boolean(hasOtelApprove || hasCustApprove)
}

// ── A) Oda Tipleri, Odalar, Tarifeler, Politika ve Acenta Kontenjanı ─────────

export async function listHotelRoomTypes(scope: TourismScopeContext) {
  const dbAny = prisma as any
  const types = await dbAny.turizmHotelRoomType.findMany({ orderBy: { sortOrder: "asc" } })
  return applyCompanyScopeFilter(types, scope)
}

export async function upsertHotelRoomType(
  input: Record<string, any>,
  scope: TourismScopeContext
) {
  assertNotHousekeepingScoped(scope, "Oda tipi tanımlama")
  const dbAny = prisma as any
  const code = String(input.code || "").trim().toUpperCase()
  const name = String(input.name || "").trim()
  if (!code || !name) {
    throw new TourismDomainError("VALIDATION_ERROR", "Oda tipi kodu ve adı zorunludur.", 400)
  }

  const all = await dbAny.turizmHotelRoomType.findMany()
  const existing = input.id
    ? all.find((r: any) => r.id === input.id)
    : all.find((r: any) => String(r.code).toUpperCase() === code)

  const payload = {
    code,
    name,
    baseCapacity: Math.max(1, Number(input.baseCapacity ?? existing?.baseCapacity ?? 2)),
    maxAdults: Math.max(1, Number(input.maxAdults ?? existing?.maxAdults ?? 2)),
    maxChildren: Math.max(0, Number(input.maxChildren ?? existing?.maxChildren ?? 1)),
    bedConfiguration: String(
      input.bedConfiguration || existing?.bedConfiguration || "1 Çift Kişilik Yatak"
    ),
    areaSqm: Math.max(10, Number(input.areaSqm ?? existing?.areaSqm ?? 26)),
    amenitiesJson:
      typeof input.amenitiesJson === "string"
        ? input.amenitiesJson
        : Array.isArray(input.amenities)
          ? JSON.stringify(input.amenities)
          : existing?.amenitiesJson ?? JSON.stringify(["Wi-Fi", "Klima", "Minibar", "Kasa"]),
    baseRateTry: Math.max(0, Number(input.baseRateTry ?? existing?.baseRateTry ?? 3500)),
    description: input.description ?? existing?.description ?? null,
    sortOrder: Number(input.sortOrder ?? existing?.sortOrder ?? 10),
    isActive: input.isActive !== undefined ? Boolean(input.isActive) : existing?.isActive ?? true,
    ownerCompanyId: existing?.ownerCompanyId || scope.effectiveCompanyId || MAIN_COMPANY_ID,
    updatedAt: new Date(),
  }

  const saved = existing
    ? await dbAny.turizmHotelRoomType.update({ where: { id: existing.id }, data: payload })
    : await dbAny.turizmHotelRoomType.create({
        data: {
          id: input.id || `trzm-otl-rt-${Date.now().toString(36)}`,
          ...payload,
          createdAt: new Date(),
        },
      })

  await logTourismAudit({
    userId: scope.userId,
    action: existing ? "UPDATE_HOTEL_ROOM_TYPE" : "CREATE_HOTEL_ROOM_TYPE",
    resource: "turizm_otel",
    resourceId: saved.id,
    moduleKey: "turizm_otel",
    branchId: scope.branchId,
    companyId: scope.effectiveCompanyId,
    metadata: { code: saved.code, name: saved.name },
  })

  return saved
}

export async function listHotelRooms(
  params: { floorNumber?: number | null; roomTypeId?: string; status?: string; branchId?: string },
  scope: TourismScopeContext
) {
  const dbAny = prisma as any
  const [rooms, roomTypes, reservations] = await Promise.all([
    dbAny.turizmHotelRoom.findMany({ include: { roomType: true } }),
    dbAny.turizmHotelRoomType.findMany().catch(() => []),
    dbAny.turizmHotelReservation.findMany().catch(() => []),
  ])
  const rtMap = new Map<string, any>(roomTypes.map((rt: any) => [rt.id, rt]))
  const activeStayByRoom = new Map<string, any>()
  for (const r of reservations) {
    if (r.status === "CHECKED_IN") activeStayByRoom.set(r.roomId, r)
  }

  let list = applyCompanyScopeFilter(rooms, scope).filter((r: any) => r.isActive !== false)
  if (params.floorNumber !== undefined && params.floorNumber !== null) {
    list = list.filter((r: any) => Number(r.floorNumber) === Number(params.floorNumber))
  }
  if (params.roomTypeId) {
    list = list.filter((r: any) => r.roomTypeId === params.roomTypeId)
  }
  if (params.status) {
    list = list.filter((r: any) => r.status === params.status)
  }
  if (params.branchId) {
    list = list.filter((r: any) => r.branchId === params.branchId)
  }

  list.sort((a: any, b: any) => String(a.roomNumber).localeCompare(String(b.roomNumber)))

  return list.map((rm: any) => {
    const rt = rm.roomType || rtMap.get(rm.roomTypeId) || null
    const stay = activeStayByRoom.get(rm.id) || null
    return {
      ...rm,
      roomType: rt,
      roomTypeName: rt?.name || "Standart Oda",
      activeStaySummary: stay
        ? {
            reservationId: stay.id,
            reservationNo: stay.reservationNo,
            checkOutDate: stay.checkOutDate,
            balanceDueTry: stay.balanceDueTry,
          }
        : null,
    }
  })
}

export async function updateHotelRoomStatus(
  input: { roomId: string; status: HotelRoomStatus; notes?: string },
  scope: TourismScopeContext
) {
  const dbAny = prisma as any
  const room = await dbAny.turizmHotelRoom.findUnique({ where: { id: input.roomId } })
  if (!room) {
    throw new TourismDomainError("NOT_FOUND", "Durumu güncellenecek oda bulunamadı.", 404)
  }
  if (!HOTEL_ROOM_STATUSES.includes(input.status)) {
    throw new TourismDomainError("VALIDATION_ERROR", `Geçersiz oda durumu: ${input.status}`, 400)
  }

  // Kısıtlı temizlik personeli sadece kendisine atanmış görevdeki odayı CLEANING_IN_PROGRESS / INSPECTION_PENDING yapabilir
  if (isUserHousekeepingScoped(scope)) {
    const tasks = await dbAny.turizmHotelHousekeepingTask.findMany({
      where: { roomId: room.id, assignedToUserId: scope.userId },
    })
    const hasAssignedActiveTask = tasks.some(
      (t: any) => t.status === "PENDING" || t.status === "IN_PROGRESS" || t.status === "COMPLETED"
    )
    if (
      !hasAssignedActiveTask ||
      !["CLEANING_IN_PROGRESS", "INSPECTION_PENDING"].includes(input.status)
    ) {
      throw new TourismDomainError(
        "FORBIDDEN_HOUSEKEEPING_SCOPE",
        "Temizlik personeli yalnızca kendi görevindeki odanın temizlik aşamasını güncelleyebilir.",
        403
      )
    }
  }

  const updated = await dbAny.turizmHotelRoom.update({
    where: { id: room.id },
    data: {
      status: input.status,
      notes: input.notes !== undefined ? input.notes : room.notes,
      updatedAt: new Date(),
    },
  })

  await logTourismAudit({
    userId: scope.userId,
    action: "UPDATE_HOTEL_ROOM_STATUS",
    resource: "turizm_otel",
    resourceId: updated.id,
    moduleKey: "turizm_otel",
    branchId: scope.branchId,
    companyId: scope.effectiveCompanyId,
    metadata: { roomNumber: updated.roomNumber, prevStatus: room.status, nextStatus: input.status },
  })

  return updated
}

export async function listHotelTariffs(scope: TourismScopeContext) {
  const dbAny = prisma as any
  const tariffs = await dbAny.turizmHotelTariff.findMany({ include: { roomType: true } })
  return applyCompanyScopeFilter(tariffs, scope)
}

export async function upsertHotelTariff(
  input: Record<string, any>,
  scope: TourismScopeContext
) {
  assertNotHousekeepingScoped(scope, "Otel fiyat tarifesi yönetimi")
  const dbAny = prisma as any
  const code = String(input.code || `OTRF-${Date.now().toString().slice(-5)}`).trim().toUpperCase()
  const name = String(input.name || "").trim()
  const roomTypeId = String(input.roomTypeId || "").trim()
  if (!name || !roomTypeId) {
    throw new TourismDomainError("VALIDATION_ERROR", "Tarife adı ve oda tipi zorunludur.", 400)
  }

  const all = await dbAny.turizmHotelTariff.findMany()
  const existing = input.id
    ? all.find((t: any) => t.id === input.id)
    : all.find((t: any) => String(t.code).toUpperCase() === code)

  const payload = {
    code,
    name,
    roomTypeId,
    branchId: input.branchId || existing?.branchId || scope.branchId || "local-debug-branch",
    seasonType: String(input.seasonType || existing?.seasonType || "STANDARD").toUpperCase(),
    boardType: String(input.boardType || existing?.boardType || "BB").toUpperCase(),
    validFrom: input.validFrom ? new Date(input.validFrom) : existing?.validFrom ?? new Date("2026-01-01T00:00:00.000Z"),
    validTo: input.validTo ? new Date(input.validTo) : existing?.validTo ?? new Date("2027-12-31T23:59:59.000Z"),
    nightlyRateTry: Math.max(0, Number(input.nightlyRateTry ?? existing?.nightlyRateTry ?? 3500)),
    extraAdultRateTry: Math.max(0, Number(input.extraAdultRateTry ?? existing?.extraAdultRateTry ?? 1000)),
    childRateTry: Math.max(0, Number(input.childRateTry ?? existing?.childRateTry ?? 500)),
    currency: String(input.currency || existing?.currency || "TRY").toUpperCase(),
    isActive: input.isActive !== undefined ? Boolean(input.isActive) : existing?.isActive ?? true,
    ownerCompanyId: existing?.ownerCompanyId || scope.effectiveCompanyId || MAIN_COMPANY_ID,
    updatedAt: new Date(),
  }

  const saved = existing
    ? await dbAny.turizmHotelTariff.update({ where: { id: existing.id }, data: payload })
    : await dbAny.turizmHotelTariff.create({
        data: {
          id: input.id || `trzm-otl-trf-${Date.now().toString(36)}`,
          ...payload,
          createdAt: new Date(),
        },
      })

  await logTourismAudit({
    userId: scope.userId,
    action: existing ? "UPDATE_HOTEL_TARIFF" : "CREATE_HOTEL_TARIFF",
    resource: "turizm_otel",
    resourceId: saved.id,
    moduleKey: "turizm_otel",
    branchId: scope.branchId,
    companyId: scope.effectiveCompanyId,
    metadata: { code: saved.code, nightlyRateTry: saved.nightlyRateTry, boardType: saved.boardType },
  })

  return saved
}

export async function getHotelPolicyConfig(branchId = "local-debug-branch") {
  const dbAny = prisma as any
  const all = await dbAny.turizmHotelPolicyConfig.findMany()
  const match =
    all.find((p: any) => p.branchId === branchId) ||
    all.find((p: any) => p.branchId === "local-debug-branch") ||
    all[0]

  if (match) return match

  return {
    id: "trzm-otl-policy-default",
    branchId,
    hotelDisplayName: "Örnek Kıyı Konaklama & Butik Otel (50 Oda)",
    defaultCheckInTime: "14:00",
    defaultCheckOutTime: "12:00",
    lateCheckOutGraceMinutes: 60,
    lateCheckOutFeePct: 50,
    invoiceTimingMode: "ON_CHECKOUT",
    defaultVatRatePct: 10,
    accommodationExtraRatePct: 2,
    autoCreateHousekeepingOnCheckOut: true,
    requireZeroBalanceOnCheckOut: true,
    ownerCompanyId: MAIN_COMPANY_ID,
  }
}

export async function updateHotelPolicyConfig(
  input: Record<string, any>,
  scope: TourismScopeContext
) {
  assertNotHousekeepingScoped(scope, "Otel politika ve oran ayarları")
  const dbAny = prisma as any
  const branchId = String(input.branchId || scope.branchId || "local-debug-branch")
  const all = await dbAny.turizmHotelPolicyConfig.findMany()
  const existing = all.find((p: any) => p.branchId === branchId)

  const payload = {
    branchId,
    hotelDisplayName: String(
      input.hotelDisplayName || existing?.hotelDisplayName || "Örnek Kıyı Konaklama & Butik Otel"
    ).trim(),
    defaultCheckInTime: String(input.defaultCheckInTime || existing?.defaultCheckInTime || "14:00"),
    defaultCheckOutTime: String(input.defaultCheckOutTime || existing?.defaultCheckOutTime || "12:00"),
    lateCheckOutGraceMinutes: Math.max(
      0,
      Number(input.lateCheckOutGraceMinutes ?? existing?.lateCheckOutGraceMinutes ?? 60)
    ),
    lateCheckOutFeePct: Math.max(
      0,
      Number(input.lateCheckOutFeePct ?? existing?.lateCheckOutFeePct ?? 50)
    ),
    invoiceTimingMode: String(
      input.invoiceTimingMode || existing?.invoiceTimingMode || "ON_CHECKOUT"
    ).toUpperCase(),
    defaultVatRatePct: Math.max(
      0,
      Number(input.defaultVatRatePct ?? existing?.defaultVatRatePct ?? 10)
    ),
    accommodationExtraRatePct: Math.max(
      0,
      Number(input.accommodationExtraRatePct ?? existing?.accommodationExtraRatePct ?? 2)
    ),
    autoCreateHousekeepingOnCheckOut:
      input.autoCreateHousekeepingOnCheckOut !== undefined
        ? Boolean(input.autoCreateHousekeepingOnCheckOut)
        : existing?.autoCreateHousekeepingOnCheckOut ?? true,
    requireZeroBalanceOnCheckOut:
      input.requireZeroBalanceOnCheckOut !== undefined
        ? Boolean(input.requireZeroBalanceOnCheckOut)
        : existing?.requireZeroBalanceOnCheckOut ?? true,
    updatedBy: scope.userId,
    ownerCompanyId: existing?.ownerCompanyId || scope.effectiveCompanyId || MAIN_COMPANY_ID,
    updatedAt: new Date(),
  }

  const saved = existing
    ? await dbAny.turizmHotelPolicyConfig.update({ where: { id: existing.id }, data: payload })
    : await dbAny.turizmHotelPolicyConfig.create({
        data: {
          id: `trzm-otl-policy-${branchId}`,
          ...payload,
          createdAt: new Date(),
        },
      })

  await logTourismAudit({
    userId: scope.userId,
    action: "UPDATE_HOTEL_POLICY_CONFIG",
    resource: "turizm_otel",
    resourceId: saved.id,
    moduleKey: "turizm_otel",
    branchId: scope.branchId,
    companyId: scope.effectiveCompanyId,
    metadata: { invoiceTimingMode: saved.invoiceTimingMode },
  })

  return saved
}

// ── H) Acenta Kontenjanı (Allotment) ─────────────────────────────────────────

export async function listHotelAllotments(scope: TourismScopeContext) {
  const dbAny = prisma as any
  const allotments = await dbAny.turizmHotelAllotment.findMany({
    include: { roomType: true },
  })
  return applyCompanyScopeFilter(allotments, scope).map((a: any) => {
    const periodDays = Math.max(1, calculateHotelNights(a.validFrom, a.validTo))
    const totalRoomNightCap = periodDays * Math.max(1, Number(a.allocatedRoomsPerNight || 1))
    const used = Math.max(0, Number(a.usedRoomNights || 0))
    const usagePct = Number(Math.min(100, (used / Math.max(1, totalRoomNightCap)) * 100).toFixed(1))
    const remainingRoomNights = Math.max(0, totalRoomNightCap - used)
    return {
      ...a,
      periodDays,
      totalRoomNightCap,
      usagePct,
      remainingRoomNights,
      isNearLimit: usagePct >= Number(a.warningThresholdPct || 80),
    }
  })
}

export async function upsertHotelAllotment(
  input: Record<string, any>,
  scope: TourismScopeContext
) {
  assertNotHousekeepingScoped(scope, "Acenta kontenjan yönetimi")
  const dbAny = prisma as any
  const code = String(input.code || `KNT-${Date.now().toString().slice(-5)}`).trim().toUpperCase()
  const agencyName = String(input.agencyName || "").trim()
  const roomTypeId = String(input.roomTypeId || "").trim()
  if (!agencyName || !roomTypeId) {
    throw new TourismDomainError("VALIDATION_ERROR", "Acenta adı ve oda tipi zorunludur.", 400)
  }

  const all = await dbAny.turizmHotelAllotment.findMany()
  const existing = input.id
    ? all.find((a: any) => a.id === input.id)
    : all.find((a: any) => String(a.code).toUpperCase() === code)

  const validFrom = input.validFrom
    ? new Date(input.validFrom)
    : existing?.validFrom ?? new Date("2026-11-01T00:00:00.000Z")
  const validTo = input.validTo
    ? new Date(input.validTo)
    : existing?.validTo ?? new Date("2027-01-31T23:59:59.000Z")
  const releaseDaysBefore = Math.max(0, Number(input.releaseDaysBefore ?? existing?.releaseDaysBefore ?? 7))
  const releaseDeadlineAt = input.releaseDeadlineAt
    ? new Date(input.releaseDeadlineAt)
    : new Date(validFrom.getTime() - releaseDaysBefore * 86_400_000)

  const payload = {
    code,
    agencyName,
    agencyCompanyId: input.agencyCompanyId ?? existing?.agencyCompanyId ?? null,
    roomTypeId,
    branchId: input.branchId || existing?.branchId || scope.branchId || "local-debug-branch",
    validFrom,
    validTo,
    allocatedRoomsPerNight: Math.max(
      1,
      Number(input.allocatedRoomsPerNight ?? existing?.allocatedRoomsPerNight ?? 5)
    ),
    usedRoomNights: Math.max(0, Number(input.usedRoomNights ?? existing?.usedRoomNights ?? 0)),
    releaseDaysBefore,
    releaseDeadlineAt,
    netRatePerNightTry: Math.max(
      0,
      Number(input.netRatePerNightTry ?? existing?.netRatePerNightTry ?? 3000)
    ),
    warningThresholdPct: Math.min(
      100,
      Math.max(10, Number(input.warningThresholdPct ?? existing?.warningThresholdPct ?? 80))
    ),
    status: String(input.status || existing?.status || "ACTIVE").toUpperCase(),
    notes: input.notes ?? existing?.notes ?? null,
    ownerCompanyId: existing?.ownerCompanyId || scope.effectiveCompanyId || MAIN_COMPANY_ID,
    updatedAt: new Date(),
  }

  const saved = existing
    ? await dbAny.turizmHotelAllotment.update({ where: { id: existing.id }, data: payload })
    : await dbAny.turizmHotelAllotment.create({
        data: {
          id: input.id || `trzm-otl-allot-${Date.now().toString(36)}`,
          ...payload,
          createdAt: new Date(),
        },
      })

  await logTourismAudit({
    userId: scope.userId,
    action: existing ? "UPDATE_HOTEL_ALLOTMENT" : "CREATE_HOTEL_ALLOTMENT",
    resource: "turizm_otel",
    resourceId: saved.id,
    moduleKey: "turizm_otel",
    branchId: scope.branchId,
    companyId: scope.effectiveCompanyId,
    metadata: { code: saved.code, agencyName: saved.agencyName, allocatedRoomsPerNight: saved.allocatedRoomsPerNight },
  })

  return saved
}

// ── C) Rezervasyon, Atomik Çift Rezervasyon Kilidi, Kontenjan Aşım Kontrolü & Gantt ──

export async function getHotelRoomAvailabilityGantt(
  params: {
    windowStartDate?: string | Date
    daysCount?: number
    floorNumber?: number | null
    roomTypeId?: string
  },
  scope: TourismScopeContext
) {
  const dbAny = prisma as any
  const [rooms, roomTypes, reservations, customers] = await Promise.all([
    dbAny.turizmHotelRoom.findMany(),
    dbAny.turizmHotelRoomType.findMany().catch(() => []),
    dbAny.turizmHotelReservation.findMany().catch(() => []),
    dbAny.customer.findMany().catch(() => []),
  ])

  const roomTypesById = new Map<string, any>(roomTypes.map((rt: any) => [rt.id, rt]))
  const customersById = new Map<string, any>(customers.map((c: any) => [c.id, c]))

  return buildRoomAvailabilityGantt({
    rooms: applyCompanyScopeFilter(rooms, scope),
    roomTypesById,
    reservations: applyCompanyScopeFilter(reservations, scope),
    customersById,
    windowStartDate: params.windowStartDate || new Date("2026-11-18T00:00:00.000Z"),
    daysCount: params.daysCount ?? 14,
    filterFloor: params.floorNumber,
    filterRoomTypeId: params.roomTypeId,
  })
}

async function assertRoomAndAllotmentAvailable(params: {
  room: any
  checkInDate: Date
  checkOutDate: Date
  nightsCount: number
  allotmentId?: string | null
  excludeReservationId?: string
  customerId?: string
  actorUserId: string
  ownerCompanyId: string
}) {
  const dbAny = prisma as any
  const { room, checkInDate, checkOutDate, nightsCount } = params

  // 1. Bakımda veya arızalı odaya rezervasyon yapılamaz
  if (room.status === "MAINTENANCE" || room.status === "OUT_OF_ORDER") {
    const msg = `${room.roomNumber} numaralı oda şu anda '${room.status}' (Bakımda/Arızalı) durumunda olduğu için rezerve edilemez.`
    await dbAny.turizmHotelConflictAttemptLog.create({
      data: {
        id: `trzm-otl-cnf-${Date.now()}-${Math.random().toString(36).slice(2, 5)}`,
        roomId: room.id,
        roomNumber: room.roomNumber,
        attemptedCheckIn: checkInDate,
        attemptedCheckOut: checkOutDate,
        conflictingSourceType: "ROOM_MAINTENANCE",
        conflictingSourceId: room.id,
        conflictingRefNo: `ODA-${room.roomNumber}`,
        customerId: params.customerId || null,
        rejectionCode: "ROOM_OUT_OF_ORDER",
        rejectionMessage: msg,
        actorUserId: params.actorUserId,
        ownerCompanyId: params.ownerCompanyId,
        attemptedAt: new Date(),
      },
    })
    throw new TourismDomainError("CONFLICT", msg, 409, {
      rejectionCode: "ROOM_OUT_OF_ORDER",
      roomNumber: room.roomNumber,
    })
  }

  // 2. Aynı oda için çakışan PENDING / CONFIRMED / CHECKED_IN rezervasyon kontrolü
  const existingRes = await dbAny.turizmHotelReservation.findMany({
    where: { roomId: room.id },
  })
  const overlap = existingRes.find((r: any) => {
    if (params.excludeReservationId && r.id === params.excludeReservationId) return false
    if (r.status !== "PENDING" && r.status !== "CONFIRMED" && r.status !== "CHECKED_IN") {
      return false
    }
    return doTimeIntervalsOverlap(checkInDate, checkOutDate, r.checkInDate, r.checkOutDate)
  })

  if (overlap) {
    const msg = `Çift rezervasyon engellendi: ${room.roomNumber} numaralı oda ${new Date(
      overlap.checkInDate
    )
      .toISOString()
      .slice(0, 10)} – ${new Date(overlap.checkOutDate)
      .toISOString()
      .slice(0, 10)} tarihleri arasında '${overlap.reservationNo}' rezervasyonu ile doludur.`
    await dbAny.turizmHotelConflictAttemptLog.create({
      data: {
        id: `trzm-otl-cnf-${Date.now()}-${Math.random().toString(36).slice(2, 5)}`,
        roomId: room.id,
        roomNumber: room.roomNumber,
        attemptedCheckIn: checkInDate,
        attemptedCheckOut: checkOutDate,
        conflictingSourceType: "RESERVATION",
        conflictingSourceId: overlap.id,
        conflictingRefNo: overlap.reservationNo,
        customerId: params.customerId || null,
        rejectionCode: "ROOM_DOUBLE_BOOKING_LOCKED",
        rejectionMessage: msg,
        actorUserId: params.actorUserId,
        ownerCompanyId: params.ownerCompanyId,
        attemptedAt: new Date(),
      },
    })
    throw new TourismDomainError("CONFLICT", msg, 409, {
      rejectionCode: "ROOM_DOUBLE_BOOKING_LOCKED",
      conflictingReservationNo: overlap.reservationNo,
    })
  }

  // 3. Acenta kontenjanı bağlıysa kontenjan aşım ve serbest bırakma kontrolü
  if (params.allotmentId) {
    const allotment = await dbAny.turizmHotelAllotment.findUnique({
      where: { id: params.allotmentId },
    })
    if (!allotment) {
      throw new TourismDomainError("NOT_FOUND", "Seçilen acenta kontenjanı bulunamadı.", 404)
    }
    if (allotment.status === "RELEASED") {
      throw new TourismDomainError(
        "CONFLICT",
        `'${allotment.code}' acenta kontenjanının serbest bırakma (release) süresi dolmuştur.`,
        409,
        { rejectionCode: "ALLOTMENT_EXCEEDED" }
      )
    }
    const periodDays = Math.max(1, calculateHotelNights(allotment.validFrom, allotment.validTo))
    const maxNights = periodDays * Math.max(1, Number(allotment.allocatedRoomsPerNight || 1))
    const projectedUsed = Number(allotment.usedRoomNights || 0) + nightsCount

    // Ayrıca aynı gecede bu kontenjandan aktif oda sayısı allocatedRoomsPerNight'ı aşmamalı
    const allotRes = await dbAny.turizmHotelReservation.findMany({
      where: { allotmentId: allotment.id },
    })
    const concurrentInAllot = allotRes.filter((r: any) => {
      if (params.excludeReservationId && r.id === params.excludeReservationId) return false
      if (r.status === "CANCELLED" || r.status === "NO_SHOW") return false
      return doTimeIntervalsOverlap(checkInDate, checkOutDate, r.checkInDate, r.checkOutDate)
    }).length

    if (
      projectedUsed > maxNights ||
      concurrentInAllot + 1 > Number(allotment.allocatedRoomsPerNight || 1)
    ) {
      const msg = `Acenta kontenjan aşımı engellendi: ${allotment.agencyName} (${allotment.code}) için gecelik ${allotment.allocatedRoomsPerNight} oda / dönemlik ${maxNights} oda-gece kontenjan sınırı dolmuştur.`
      await dbAny.turizmHotelConflictAttemptLog.create({
        data: {
          id: `trzm-otl-cnf-${Date.now()}-${Math.random().toString(36).slice(2, 5)}`,
          roomId: room.id,
          roomNumber: room.roomNumber,
          attemptedCheckIn: checkInDate,
          attemptedCheckOut: checkOutDate,
          conflictingSourceType: "ALLOTMENT_OVERFLOW",
          conflictingSourceId: allotment.id,
          conflictingRefNo: allotment.code,
          customerId: params.customerId || null,
          rejectionCode: "ALLOTMENT_EXCEEDED",
          rejectionMessage: msg,
          actorUserId: params.actorUserId,
          ownerCompanyId: params.ownerCompanyId,
          attemptedAt: new Date(),
        },
      })
      throw new TourismDomainError("CONFLICT", msg, 409, {
        rejectionCode: "ALLOTMENT_EXCEEDED",
        allotmentCode: allotment.code,
      })
    }
  }
}

export async function createHotelReservation(
  input: Record<string, any>,
  scope: TourismScopeContext
) {
  assertNotHousekeepingScoped(scope, "Otel rezervasyonu oluşturma")
  const roomId = String(input.roomId || "").trim()
  const customerId = String(input.customerId || "").trim()
  if (!roomId || !customerId) {
    throw new TourismDomainError(
      "VALIDATION_ERROR",
      "Rezervasyon için oda ve misafir seçimi zorunludur.",
      400
    )
  }

  const checkInDate = new Date(input.checkInDate)
  const checkOutDate = new Date(input.checkOutDate)
  if (
    Number.isNaN(checkInDate.getTime()) ||
    Number.isNaN(checkOutDate.getTime()) ||
    checkOutDate <= checkInDate
  ) {
    throw new TourismDomainError(
      "VALIDATION_ERROR",
      "Geçerli giriş ve çıkış tarihleri giriniz (çıkış tarihi girişten sonra olmalıdır).",
      400
    )
  }

  const nightsCount = calculateHotelNights(checkInDate, checkOutDate)

  return await withRoomReservationLock(roomId, async () => {
    const dbAny = prisma as any
    const [room, customer, policy] = await Promise.all([
      dbAny.turizmHotelRoom.findUnique({ where: { id: roomId }, include: { roomType: true } }),
      dbAny.customer.findUnique({ where: { id: customerId } }),
      getHotelPolicyConfig(input.branchId || scope.branchId),
    ])

    if (!room) {
      throw new TourismDomainError("NOT_FOUND", "Seçilen oda bulunamadı.", 404)
    }
    if (!customer) {
      throw new TourismDomainError("NOT_FOUND", "Seçilen misafir kaydı bulunamadı.", 404)
    }

    await assertRoomAndAllotmentAvailable({
      room,
      checkInDate,
      checkOutDate,
      nightsCount,
      allotmentId: input.allotmentId || null,
      customerId: customer.id,
      actorUserId: scope.userId,
      ownerCompanyId: scope.effectiveCompanyId || MAIN_COMPANY_ID,
    })

    const boardType = String(input.boardType || "BB").toUpperCase()
    const tariffs = await dbAny.turizmHotelTariff.findMany({
      where: { roomTypeId: room.roomTypeId },
    })
    const matchedTariff =
      (input.tariffId ? tariffs.find((t: any) => t.id === input.tariffId) : null) ||
      tariffs.find((t: any) => t.boardType === boardType && t.isActive !== false) ||
      tariffs[0] ||
      null

    let allotment = null
    if (input.allotmentId) {
      allotment = await dbAny.turizmHotelAllotment.findUnique({
        where: { id: input.allotmentId },
      })
    }

    const nightlyRateTry = Math.max(
      0,
      Number(
        input.nightlyRateTry ??
          allotment?.netRatePerNightTry ??
          matchedTariff?.nightlyRateTry ??
          room.roomType?.baseRateTry ??
          3500
      )
    )
    const roomTotalTry = Number((nightlyRateTry * nightsCount).toFixed(2))
    const reservationNo =
      String(input.reservationNo || "").trim().toUpperCase() ||
      `OTL-2026-${String(Date.now()).slice(-5)}-${Math.random().toString(36).slice(2, 4).toUpperCase()}`
    const now = new Date()

    const created = await dbAny.turizmHotelReservation.create({
      data: {
        id: input.id || `trzm-otl-res-${Date.now()}-${Math.random().toString(36).slice(2, 5)}`,
        reservationNo,
        branchId: input.branchId || room.branchId || scope.branchId || "local-debug-branch",
        roomId: room.id,
        roomTypeId: room.roomTypeId,
        tariffId: matchedTariff?.id || null,
        allotmentId: allotment?.id || null,
        customerId: customer.id,
        channelSource: String(
          input.channelSource || (allotment ? "AGENCY_B2B" : "DIRECT_WEB")
        ).toUpperCase(),
        agencyName: input.agencyName || allotment?.agencyName || null,
        boardType,
        checkInDate,
        checkOutDate,
        nightsCount,
        adultsCount: Math.max(1, Number(input.adultsCount ?? 2)),
        childrenCount: Math.max(0, Number(input.childrenCount ?? 0)),
        status: String(input.status || "CONFIRMED").toUpperCase(),
        nightlyRateTry,
        roomTotalTry,
        extrasTotalTry: 0,
        paidTotalTry: 0,
        balanceDueTry: roomTotalTry,
        additionalGuestsJson: Array.isArray(input.additionalGuests)
          ? JSON.stringify(input.additionalGuests)
          : null,
        conflictLockKey: `${room.id}:${checkInDate.toISOString()}:${checkOutDate.toISOString()}`,
        notes: input.notes || null,
        ownerCompanyId: scope.effectiveCompanyId || MAIN_COMPANY_ID,
        createdBy: scope.userId,
        createdAt: now,
        updatedAt: now,
      },
    })

    // Oda konaklama kalemini otomatik Folio A'ya işle
    const vatRate = Number(policy.defaultVatRatePct ?? 10)
    await dbAny.turizmHotelFolioItem.create({
      data: {
        id: `trzm-otl-fol-${Date.now()}-${Math.random().toString(36).slice(2, 5)}`,
        entryNo: `FOL-ODA-${String(Date.now()).slice(-6)}`,
        reservationId: created.id,
        roomId: room.id,
        customerId: customer.id,
        folioGroup: allotment ? "C_ACENTA_FATURASI" : "A_ANA_HESAP",
        entryCategory: "ROOM_NIGHT",
        isPayment: false,
        description: `Oda ${room.roomNumber} Konaklama (${nightsCount} Gece · ${boardType})`,
        quantity: nightsCount,
        unitPriceTry: nightlyRateTry,
        amountTry: roomTotalTry,
        vatRatePct: vatRate,
        totalWithVatTry: roomTotalTry,
        postedByUserId: scope.userId,
        postedAt: now,
        ownerCompanyId: scope.effectiveCompanyId || MAIN_COMPANY_ID,
        createdAt: now,
      },
    })

    // Kontenjan kullanım sayacını ve uyarı durumunu güncelle
    if (allotment) {
      const nextUsed = Number(allotment.usedRoomNights || 0) + nightsCount
      const periodDays = Math.max(1, calculateHotelNights(allotment.validFrom, allotment.validTo))
      const maxNights = periodDays * Math.max(1, Number(allotment.allocatedRoomsPerNight || 1))
      const ratioPct = (nextUsed / Math.max(1, maxNights)) * 100
      const nextStatus =
        nextUsed >= maxNights
          ? "EXHAUSTED"
          : ratioPct >= Number(allotment.warningThresholdPct || 80)
            ? "NEAR_LIMIT"
            : "ACTIVE"
      await dbAny.turizmHotelAllotment.update({
        where: { id: allotment.id },
        data: { usedRoomNights: nextUsed, status: nextStatus, updatedAt: now },
      })
    }

    await logTourismAudit({
      userId: scope.userId,
      action: "CREATE_HOTEL_RESERVATION",
      resource: "turizm_otel",
      resourceId: created.id,
      moduleKey: "turizm_otel",
      branchId: scope.branchId,
      companyId: scope.effectiveCompanyId,
      metadata: {
        reservationNo: created.reservationNo,
        roomNumber: room.roomNumber,
        nightsCount,
        roomTotalTry,
        allotmentId: allotment?.id || null,
      },
    })

    return created
  })
}

export async function updateHotelReservationStatusOrRoom(
  input: {
    reservationId: string
    status?: "PENDING" | "CONFIRMED" | "CANCELLED" | "NO_SHOW"
    newRoomId?: string
    cancelReason?: string
  },
  scope: TourismScopeContext
) {
  assertNotHousekeepingScoped(scope, "Rezervasyon değişikliği / iptal")
  const dbAny = prisma as any
  const reservation = await dbAny.turizmHotelReservation.findUnique({
    where: { id: input.reservationId },
  })
  if (!reservation) {
    throw new TourismDomainError("NOT_FOUND", "Rezervasyon bulunamadı.", 404)
  }

  const targetRoomId = input.newRoomId || reservation.roomId
  return await withRoomReservationLock(targetRoomId, async () => {
    const updateData: Record<string, any> = { updatedAt: new Date() }

    if (input.newRoomId && input.newRoomId !== reservation.roomId) {
      const targetRoom = await dbAny.turizmHotelRoom.findUnique({
        where: { id: input.newRoomId },
      })
      if (!targetRoom) {
        throw new TourismDomainError("NOT_FOUND", "Yeni oda bulunamadı.", 404)
      }
      await assertRoomAndAllotmentAvailable({
        room: targetRoom,
        checkInDate: new Date(reservation.checkInDate),
        checkOutDate: new Date(reservation.checkOutDate),
        nightsCount: Number(reservation.nightsCount || 1),
        excludeReservationId: reservation.id,
        customerId: reservation.customerId,
        actorUserId: scope.userId,
        ownerCompanyId: scope.effectiveCompanyId || MAIN_COMPANY_ID,
      })
      updateData.roomId = targetRoom.id
      updateData.roomTypeId = targetRoom.roomTypeId
    }

    if (input.status) {
      updateData.status = input.status
      if (input.status === "CANCELLED" || input.status === "NO_SHOW") {
        updateData.cancelReason = input.cancelReason || "Müşteri / acenta iptali"
        if (reservation.allotmentId) {
          const allot = await dbAny.turizmHotelAllotment
            .findUnique({ where: { id: reservation.allotmentId } })
            .catch(() => null)
          if (allot) {
            const reduced = Math.max(
              0,
              Number(allot.usedRoomNights || 0) - Number(reservation.nightsCount || 1)
            )
            await dbAny.turizmHotelAllotment.update({
              where: { id: allot.id },
              data: { usedRoomNights: reduced, status: "ACTIVE", updatedAt: new Date() },
            })
          }
        }
      }
    }

    const updated = await dbAny.turizmHotelReservation.update({
      where: { id: reservation.id },
      data: updateData,
    })

    await logTourismAudit({
      userId: scope.userId,
      action: "UPDATE_HOTEL_RESERVATION",
      resource: "turizm_otel",
      resourceId: updated.id,
      moduleKey: "turizm_otel",
      branchId: scope.branchId,
      companyId: scope.effectiveCompanyId,
      metadata: {
        reservationNo: updated.reservationNo,
        status: updated.status,
        roomId: updated.roomId,
      },
    })

    return updated
  })
}

export async function recomputeReservationFolioTotals(reservationId: string) {
  const dbAny = prisma as any
  const items = await dbAny.turizmHotelFolioItem.findMany({
    where: { reservationId },
  })
  const summary = computeFolioBalance(items)
  await dbAny.turizmHotelReservation.update({
    where: { id: reservationId },
    data: {
      roomTotalTry: summary.roomChargesTry,
      extrasTotalTry: summary.extraChargesTry,
      paidTotalTry: summary.totalPaymentsTry,
      balanceDueTry: summary.balanceDueTry,
      updatedAt: new Date(),
    },
  })
  return summary
}

export async function listHotelGuestsKvkk(params: {
  scope: TourismScopeContext
  search?: string
  revealSensitivePii?: boolean
}) {
  assertNotHousekeepingScoped(params.scope, "Misafir KVKK kayıtları")
  const dbAny = prisma as any
  const canViewPii = await canUserViewGuestKvkkPii(params.scope)

  if (params.revealSensitivePii && !canViewPii) {
    await logTourismAudit({
      userId: params.scope.userId,
      action: "KVKK_PII_DENIED",
      resource: "turizm_otel",
      moduleKey: "turizm_otel",
      branchId: params.scope.branchId,
      companyId: params.scope.effectiveCompanyId,
      metadata: { reason: "INSUFFICIENT_PRIVILEGE_FOR_GUEST_PII" },
    })
    throw new TourismDomainError(
      "FORBIDDEN_COMPANY_SCOPE",
      "Misafir TCKN/pasaport KVKK verilerini açık görüntüleme yetkiniz yok.",
      403
    )
  }

  const shouldUnmask = Boolean(params.revealSensitivePii && canViewPii)
  if (shouldUnmask) {
    await logTourismAudit({
      userId: params.scope.userId,
      action: "KVKK_PII_REVEALED",
      resource: "turizm_otel",
      moduleKey: "turizm_otel",
      branchId: params.scope.branchId,
      companyId: params.scope.effectiveCompanyId,
      metadata: { entity: "HotelGuestCustomer" },
    })
  }

  let customers = await dbAny.customer.findMany()
  customers = applyCompanyScopeFilter(customers, params.scope)
  if (params.search) {
    const q = params.search.trim().toLowerCase()
    customers = customers.filter(
      (c: any) =>
        String(c.name || "").toLowerCase().includes(q) ||
        String(c.company || "").toLowerCase().includes(q) ||
        String(c.nationality || "").toLowerCase().includes(q)
    )
  }

  return {
    canViewPii,
    isUnmasked: shouldUnmask,
    guests: customers.map((c: any) => applyCustomerKvkkMasking(c, shouldUnmask).customer),
  }
}
