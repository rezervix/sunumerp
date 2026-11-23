/**
 * Sunum ERP — Turizm Faz 4: Tur Operatörlüğü (turizm_tur) — Çekirdek Servis Katmanı
 *
 * Kapsam:
 * A) Tur paketi, program kalemleri, kapasite/min katılım, durum geçişleri
 * B) Araç tipi & dinamik koltuk planı, cinsiyet/aile yan yana kuralları, tur-araç ataması
 * D) Biniş noktası/saat planlama ve tahmini mesafe/süre hesaplama
 * E) Sunucu tarafı atomik kaynak çakışma kontrolü (Araç + Şoför + Rehber; diğer turlar,
 *    Filo bakım/arıza iş emirleri ve Faz 2 Rent-a-Car kiralamalarıyla çapraz kontrol + Gantt)
 * G) Acenta ve satış kanalı tanımları
 */

import { prisma } from "@/lib/db"
import { checkPermission } from "@/lib/auth/server-permission"
import { maskDocumentNo, maskPhone, maskTckn } from "@/lib/logistics/fleet/constantsAndHelpers"
import { GUIDE_ROLE_NAME, MAIN_COMPANY_ID } from "@/lib/tourism/constants"
import { doTimeIntervalsOverlap } from "@/lib/tourism/rentacar/constantsAndHelpers"
import {
  applyCompanyScopeFilter,
  logTourismAudit,
  TourismDomainError,
} from "@/lib/tourism/security"
import type { TourismScopeContext } from "@/lib/tourism/types"
import {
  buildSeatSlotsFromLayout,
  buildTourResourceGantt,
  estimateTourRouteMetrics,
  TOUR_STATUSES,
  validateSeatAssignmentRule,
  type TourStatus,
} from "./constantsAndHelpers"

// ── Sunucu İçi Atomik Tur/Kaynak Kilidi ──────────────────────────────────────
const tourLockQueues = new Map<string, Promise<unknown>>()

export async function withTourResourceLock<T>(
  lockKey: string,
  task: () => Promise<T>
): Promise<T> {
  const key = String(lockKey || "global-tour")
  const previous = tourLockQueues.get(key) ?? Promise.resolve()
  let releaseNext!: () => void
  const gate = new Promise<void>((resolve) => {
    releaseNext = resolve
  })
  const chained = previous.then(() => gate, () => gate)
  tourLockQueues.set(key, chained)
  await previous.catch(() => undefined)
  try {
    return await task()
  } finally {
    releaseNext()
    if (tourLockQueues.get(key) === chained) tourLockQueues.delete(key)
  }
}

// ── Kısıtlı "Tur Rehberi" Rolü ve KVKK Koruyucuları ──────────────────────────

export function isUserTourGuideScoped(scope: TourismScopeContext): boolean {
  if (scope.isSuperAdmin || scope.isPlatformDeveloper) return false
  return scope.roleNames.includes(GUIDE_ROLE_NAME)
}

export function assertNotTourGuideScoped(
  scope: TourismScopeContext,
  actionLabel = "Bu işlem"
): void {
  if (isUserTourGuideScoped(scope)) {
    throw new TourismDomainError(
      "FORBIDDEN_GUIDE_SCOPE",
      `${actionLabel} yalnızca tur operasyon ve yönetim yetkisine açıktır; rehber hesabı yalnızca atandığı turların yolcu listesi, yoklama ve saha kayıtlarını görebilir.`,
      403
    )
  }
}

export async function canUserViewPassengerKvkkPii(
  scope: TourismScopeContext
): Promise<boolean> {
  if (scope.isPartnerScoped || isUserTourGuideScoped(scope)) return false
  if (scope.isSuperAdmin || scope.isPlatformDeveloper) return true
  const [hasTurApprove, hasCustApprove] = await Promise.all([
    checkPermission(scope.userId, scope.branchId, "turizm_tur", "approve").catch(() => false),
    checkPermission(scope.userId, scope.branchId, "customers", "approve").catch(() => false),
  ])
  return Boolean(hasTurApprove || hasCustApprove)
}

export function maskPassengerKvkk(pax: any, revealPii: boolean) {
  if (!pax) return pax
  if (revealPii) return pax
  return {
    ...pax,
    tckn: maskTckn(pax.tckn),
    passportNo: maskDocumentNo(pax.passportNo),
    phone: maskPhone(pax.phone),
  }
}

// ── Rehberler, Acentalar ve Koltuk Şemaları ──────────────────────────────────

export async function listTourGuides(scope: TourismScopeContext) {
  const dbAny = prisma as any
  const guides = applyCompanyScopeFilter(
    await dbAny.turizmTourGuide.findMany({ orderBy: { fullName: "asc" } }),
    scope
  )
  return guides.map((g: any) => ({
    ...g,
    phoneMasked: maskPhone(g.phone),
    languages: (() => {
      try {
        return g.languagesJson ? JSON.parse(g.languagesJson) : ["Türkçe"]
      } catch {
        return ["Türkçe"]
      }
    })(),
  }))
}

export async function upsertTourGuide(
  input: Record<string, any>,
  scope: TourismScopeContext
) {
  assertNotTourGuideScoped(scope, "Rehber tanımlama")
  const dbAny = prisma as any
  const fullName = String(input.fullName || "").trim()
  const code = String(input.code || `RHB-${Date.now().toString().slice(-4)}`).trim().toUpperCase()
  if (!fullName) {
    throw new TourismDomainError("VALIDATION_ERROR", "Rehber ad soyadı zorunludur.", 400)
  }
  const all = await dbAny.turizmTourGuide.findMany()
  const existing = input.id
    ? all.find((g: any) => g.id === input.id)
    : all.find((g: any) => String(g.code).toUpperCase() === code)

  const payload = {
    code,
    userId: input.userId ?? existing?.userId ?? null,
    fullName,
    licenseNo: input.licenseNo ?? existing?.licenseNo ?? null,
    languagesJson: Array.isArray(input.languages)
      ? JSON.stringify(input.languages)
      : existing?.languagesJson ?? JSON.stringify(["Türkçe", "İngilizce"]),
    phone: input.phone ?? existing?.phone ?? null,
    email: input.email ?? existing?.email ?? null,
    dailyFeeTry: Math.max(0, Number(input.dailyFeeTry ?? existing?.dailyFeeTry ?? 3500)),
    status: String(input.status || existing?.status || "ACTIVE").toUpperCase(),
    notes: input.notes ?? existing?.notes ?? null,
    isActive: input.isActive !== undefined ? Boolean(input.isActive) : existing?.isActive ?? true,
    ownerCompanyId: existing?.ownerCompanyId || scope.effectiveCompanyId || MAIN_COMPANY_ID,
    updatedAt: new Date(),
  }

  const saved = existing
    ? await dbAny.turizmTourGuide.update({ where: { id: existing.id }, data: payload })
    : await dbAny.turizmTourGuide.create({
        data: {
          id: input.id || `trzm-tur-gd-${Date.now().toString(36)}`,
          ...payload,
          createdAt: new Date(),
        },
      })

  await logTourismAudit({
    userId: scope.userId,
    action: existing ? "UPDATE_TOUR_GUIDE" : "CREATE_TOUR_GUIDE",
    resource: "turizm_tur",
    resourceId: saved.id,
    moduleKey: "turizm_tur",
    branchId: scope.branchId,
    companyId: scope.effectiveCompanyId,
    metadata: { code: saved.code, fullName: saved.fullName },
  })
  return saved
}

export async function listTourAgencies(scope: TourismScopeContext) {
  const dbAny = prisma as any
  return applyCompanyScopeFilter(
    await dbAny.turizmTourAgency.findMany({ orderBy: { name: "asc" } }),
    scope
  )
}

export async function upsertTourAgency(
  input: Record<string, any>,
  scope: TourismScopeContext
) {
  assertNotTourGuideScoped(scope, "Acenta ve kanal yönetimi")
  const dbAny = prisma as any
  const name = String(input.name || "").trim()
  const code = String(input.code || `ACN-${Date.now().toString().slice(-4)}`).trim().toUpperCase()
  if (!name) {
    throw new TourismDomainError("VALIDATION_ERROR", "Acenta adı zorunludur.", 400)
  }
  const all = await dbAny.turizmTourAgency.findMany()
  const existing = input.id
    ? all.find((a: any) => a.id === input.id)
    : all.find((a: any) => String(a.code).toUpperCase() === code)

  const payload = {
    code,
    name,
    partnerCompanyId: input.partnerCompanyId ?? existing?.partnerCompanyId ?? null,
    contactPerson: input.contactPerson ?? existing?.contactPerson ?? null,
    phone: input.phone ?? existing?.phone ?? null,
    email: input.email ?? existing?.email ?? null,
    commissionRatePct: Math.min(
      50,
      Math.max(0, Number(input.commissionRatePct ?? existing?.commissionRatePct ?? 12))
    ),
    defaultQuotaPerTour: Math.max(
      1,
      Number(input.defaultQuotaPerTour ?? existing?.defaultQuotaPerTour ?? 10)
    ),
    settlementTermDays: Math.max(
      0,
      Number(input.settlementTermDays ?? existing?.settlementTermDays ?? 15)
    ),
    status: String(input.status || existing?.status || "ACTIVE").toUpperCase(),
    notes: input.notes ?? existing?.notes ?? null,
    ownerCompanyId: existing?.ownerCompanyId || scope.effectiveCompanyId || MAIN_COMPANY_ID,
    updatedAt: new Date(),
  }

  const saved = existing
    ? await dbAny.turizmTourAgency.update({ where: { id: existing.id }, data: payload })
    : await dbAny.turizmTourAgency.create({
        data: {
          id: input.id || `trzm-tur-agn-${Date.now().toString(36)}`,
          ...payload,
          createdAt: new Date(),
        },
      })

  await logTourismAudit({
    userId: scope.userId,
    action: existing ? "UPDATE_TOUR_AGENCY" : "CREATE_TOUR_AGENCY",
    resource: "turizm_tur",
    resourceId: saved.id,
    moduleKey: "turizm_tur",
    branchId: scope.branchId,
    companyId: scope.effectiveCompanyId,
    metadata: { code: saved.code, name: saved.name, commissionRatePct: saved.commissionRatePct },
  })
  return saved
}

export async function listSeatLayouts(scope: TourismScopeContext) {
  const dbAny = prisma as any
  const layouts = applyCompanyScopeFilter(await dbAny.turizmTourSeatLayout.findMany(), scope)
  return layouts.map((l: any) => ({
    ...l,
    slots: buildSeatSlotsFromLayout(l),
  }))
}

export async function upsertSeatLayout(
  input: Record<string, any>,
  scope: TourismScopeContext
) {
  assertNotTourGuideScoped(scope, "Araç koltuk şeması tanımlama")
  const dbAny = prisma as any
  const name = String(input.name || "").trim()
  const code = String(input.code || `KLT-${Date.now().toString().slice(-4)}`).trim().toUpperCase()
  if (!name) {
    throw new TourismDomainError("VALIDATION_ERROR", "Koltuk şeması adı zorunludur.", 400)
  }
  const totalSeats = Math.max(4, Number(input.totalSeats ?? 16))
  const seatsPerRow = Math.max(2, Math.min(5, Number(input.seatsPerRow ?? 4)))
  const aisleAfterCol = Math.max(1, Math.min(seatsPerRow - 1, Number(input.aisleAfterCol ?? 2)))
  const rowsCount = Math.ceil(totalSeats / seatsPerRow)
  const slots = buildSeatSlotsFromLayout({ totalSeats, rowsCount, seatsPerRow, aisleAfterCol })

  const all = await dbAny.turizmTourSeatLayout.findMany()
  const existing = input.id
    ? all.find((l: any) => l.id === input.id)
    : all.find((l: any) => String(l.code).toUpperCase() === code)

  const payload = {
    code,
    name,
    vehicleCategory: String(input.vehicleCategory || existing?.vehicleCategory || "OTOBUS").toUpperCase(),
    totalSeats,
    rowsCount,
    seatsPerRow,
    aisleAfterCol,
    seatMapJson: JSON.stringify(slots),
    enforceGenderRuleDefault:
      input.enforceGenderRuleDefault !== undefined
        ? Boolean(input.enforceGenderRuleDefault)
        : existing?.enforceGenderRuleDefault ?? true,
    allowFamilyAdjacentDefault:
      input.allowFamilyAdjacentDefault !== undefined
        ? Boolean(input.allowFamilyAdjacentDefault)
        : existing?.allowFamilyAdjacentDefault ?? true,
    isActive: true,
    ownerCompanyId: existing?.ownerCompanyId || scope.effectiveCompanyId || MAIN_COMPANY_ID,
    updatedAt: new Date(),
  }

  return existing
    ? await dbAny.turizmTourSeatLayout.update({ where: { id: existing.id }, data: payload })
    : await dbAny.turizmTourSeatLayout.create({
        data: {
          id: input.id || `trzm-tur-lay-${Date.now().toString(36)}`,
          ...payload,
          createdAt: new Date(),
        },
      })
}

// ── E) Sunucu Tarafı Çapraz Kaynak Çakışma Denetimi (Araç + Şoför + Rehber) ──

async function recordTourConflictLog(data: {
  tourId?: string | null
  tourCode?: string | null
  resourceType: string
  resourceId?: string | null
  resourceLabel: string
  attemptedStartAt: Date
  attemptedEndAt: Date
  conflictSource: string
  conflictRefNo?: string | null
  rejectionCode: string
  rejectionMessage: string
  actorUserId: string
  ownerCompanyId: string
}) {
  const dbAny = prisma as any
  await dbAny.turizmTourConflictLog.create({
    data: {
      id: `trzm-tur-cnf-${Date.now()}-${Math.random().toString(36).slice(2, 5)}`,
      ...data,
      resolved: false,
      attemptedAt: new Date(),
    },
  })
}

export async function assertTourResourcesAvailable(params: {
  tourId?: string
  tourCode?: string
  startAt: Date
  endAt: Date
  vehicleId?: string | null
  driverId?: string | null
  guideId?: string | null
  actorUserId: string
  ownerCompanyId: string
}) {
  const dbAny = prisma as any
  const [tours, vehicles, drivers, guides, maintWos, rentRes] = await Promise.all([
    dbAny.turizmTourPackage.findMany(),
    dbAny.lojistikVehicle.findMany().catch(() => []),
    dbAny.lojistikDriver.findMany().catch(() => []),
    dbAny.turizmTourGuide.findMany().catch(() => []),
    dbAny.lojistikVehicleMaintenanceWorkOrder.findMany().catch(() => []),
    dbAny.turizmRentReservation.findMany().catch(() => []),
  ])

  const activeOtherTours = tours.filter(
    (t: any) =>
      t.status !== "CANCELLED" &&
      (!params.tourId || t.id !== params.tourId) &&
      doTimeIntervalsOverlap(params.startAt, params.endAt, t.startAt, t.endAt)
  )

  // 1. Araç çakışma denetimi (Bakım/Arıza + Diğer Tur + Rent-a-Car)
  if (params.vehicleId) {
    const veh = vehicles.find((v: any) => v.id === params.vehicleId)
    const vehLabel = veh ? `${veh.plate} (${veh.brand} ${veh.model})` : params.vehicleId

    if (
      veh &&
      (veh.status === "MAINTENANCE" || veh.status === "FAULT" || veh.status === "OUT_OF_SERVICE")
    ) {
      const msg = `Araç çakışması: ${vehLabel} şu anda Filo'da '${veh.status}' (Bakımda/Arızalı/Servis Dışı) olduğundan tura atanamaz.`
      await recordTourConflictLog({
        tourId: params.tourId || null,
        tourCode: params.tourCode || null,
        resourceType: "VEHICLE",
        resourceId: veh.id,
        resourceLabel: vehLabel,
        attemptedStartAt: params.startAt,
        attemptedEndAt: params.endAt,
        conflictSource: "FLEET_MAINTENANCE",
        conflictRefNo: veh.plate,
        rejectionCode: "VEHICLE_MAINTENANCE_OR_FAULT",
        rejectionMessage: msg,
        actorUserId: params.actorUserId,
        ownerCompanyId: params.ownerCompanyId,
      })
      throw new TourismDomainError("CONFLICT", msg, 409, {
        rejectionCode: "VEHICLE_MAINTENANCE_OR_FAULT",
      })
    }

    const activeWo = maintWos.find(
      (w: any) =>
        w.vehicleId === params.vehicleId &&
        (w.status === "IN_PROGRESS" || w.status === "SCHEDULED") &&
        doTimeIntervalsOverlap(
          params.startAt,
          params.endAt,
          w.startedAt || w.plannedDate || w.createdAt,
          w.completedAt ||
            new Date(new Date(w.startedAt || w.plannedDate || w.createdAt).getTime() + 24 * 3_600_000)
        )
    )
    if (activeWo) {
      const msg = `Araç bakım çakışması: ${vehLabel} için '${activeWo.workOrderNo || activeWo.id}' planlı bakım iş emriyle tarih çakışması tespit edildi.`
      await recordTourConflictLog({
        tourId: params.tourId || null,
        tourCode: params.tourCode || null,
        resourceType: "VEHICLE",
        resourceId: params.vehicleId,
        resourceLabel: vehLabel,
        attemptedStartAt: params.startAt,
        attemptedEndAt: params.endAt,
        conflictSource: "FLEET_MAINTENANCE",
        conflictRefNo: activeWo.workOrderNo || activeWo.id,
        rejectionCode: "VEHICLE_MAINTENANCE_OR_FAULT",
        rejectionMessage: msg,
        actorUserId: params.actorUserId,
        ownerCompanyId: params.ownerCompanyId,
      })
      throw new TourismDomainError("CONFLICT", msg, 409, {
        rejectionCode: "VEHICLE_MAINTENANCE_OR_FAULT",
      })
    }

    const overlapTour = activeOtherTours.find((t: any) => t.vehicleId === params.vehicleId)
    if (overlapTour) {
      const msg = `Araç tur çakışması: ${vehLabel} seçilen tarihlerde '${overlapTour.code} — ${overlapTour.title}' turuna atanmıştır.`
      await recordTourConflictLog({
        tourId: params.tourId || null,
        tourCode: params.tourCode || null,
        resourceType: "VEHICLE",
        resourceId: params.vehicleId,
        resourceLabel: vehLabel,
        attemptedStartAt: params.startAt,
        attemptedEndAt: params.endAt,
        conflictSource: "TOUR_OVERLAP",
        conflictRefNo: overlapTour.code,
        rejectionCode: "VEHICLE_OVERLAP",
        rejectionMessage: msg,
        actorUserId: params.actorUserId,
        ownerCompanyId: params.ownerCompanyId,
      })
      throw new TourismDomainError("CONFLICT", msg, 409, { rejectionCode: "VEHICLE_OVERLAP" })
    }

    const overlapRent = rentRes.find(
      (r: any) =>
        r.vehicleId === params.vehicleId &&
        (r.status === "PENDING" || r.status === "CONFIRMED" || r.status === "ACTIVE") &&
        doTimeIntervalsOverlap(params.startAt, params.endAt, r.startAt, r.endAt)
    )
    if (overlapRent) {
      const msg = `Araç Rent-a-Car çakışması: ${vehLabel} seçilen tarihlerde '${overlapRent.reservationNo}' numaralı araç kiralama rezervasyonunda kullanımdadır.`
      await recordTourConflictLog({
        tourId: params.tourId || null,
        tourCode: params.tourCode || null,
        resourceType: "VEHICLE",
        resourceId: params.vehicleId,
        resourceLabel: vehLabel,
        attemptedStartAt: params.startAt,
        attemptedEndAt: params.endAt,
        conflictSource: "RENTACAR_OVERLAP",
        conflictRefNo: overlapRent.reservationNo,
        rejectionCode: "VEHICLE_RENTACAR_OVERLAP",
        rejectionMessage: msg,
        actorUserId: params.actorUserId,
        ownerCompanyId: params.ownerCompanyId,
      })
      throw new TourismDomainError("CONFLICT", msg, 409, {
        rejectionCode: "VEHICLE_RENTACAR_OVERLAP",
      })
    }
  }

  // 2. Şoför çakışma denetimi
  if (params.driverId) {
    const drv = drivers.find((d: any) => d.id === params.driverId)
    const drvLabel = drv?.fullName || params.driverId
    const overlapDrv = activeOtherTours.find((t: any) => t.driverId === params.driverId)
    if (overlapDrv) {
      const msg = `Şoför çakışması: ${drvLabel} seçilen tarihlerde '${overlapDrv.code} — ${overlapDrv.title}' turunda görevlidir.`
      await recordTourConflictLog({
        tourId: params.tourId || null,
        tourCode: params.tourCode || null,
        resourceType: "DRIVER",
        resourceId: params.driverId,
        resourceLabel: drvLabel,
        attemptedStartAt: params.startAt,
        attemptedEndAt: params.endAt,
        conflictSource: "TOUR_OVERLAP",
        conflictRefNo: overlapDrv.code,
        rejectionCode: "DRIVER_OVERLAP",
        rejectionMessage: msg,
        actorUserId: params.actorUserId,
        ownerCompanyId: params.ownerCompanyId,
      })
      throw new TourismDomainError("CONFLICT", msg, 409, { rejectionCode: "DRIVER_OVERLAP" })
    }
  }

  // 3. Rehber çakışma denetimi
  if (params.guideId) {
    const gd = guides.find((g: any) => g.id === params.guideId)
    const gdLabel = gd?.fullName || params.guideId
    const overlapGd = activeOtherTours.find((t: any) => t.guideId === params.guideId)
    if (overlapGd) {
      const msg = `Rehber çakışması: ${gdLabel} seçilen tarihlerde '${overlapGd.code} — ${overlapGd.title}' turunda görevlidir.`
      await recordTourConflictLog({
        tourId: params.tourId || null,
        tourCode: params.tourCode || null,
        resourceType: "GUIDE",
        resourceId: params.guideId,
        resourceLabel: gdLabel,
        attemptedStartAt: params.startAt,
        attemptedEndAt: params.endAt,
        conflictSource: "TOUR_OVERLAP",
        conflictRefNo: overlapGd.code,
        rejectionCode: "GUIDE_OVERLAP",
        rejectionMessage: msg,
        actorUserId: params.actorUserId,
        ownerCompanyId: params.ownerCompanyId,
      })
      throw new TourismDomainError("CONFLICT", msg, 409, { rejectionCode: "GUIDE_OVERLAP" })
    }
  }
}

// ── A) Tur Paketi & Hareket Takvimi CRUD ─────────────────────────────────────

export async function upsertTourPackage(
  input: Record<string, any>,
  scope: TourismScopeContext
) {
  assertNotTourGuideScoped(scope, "Tur paketi tanımlama/düzenleme")
  const title = String(input.title || "").trim()
  const destinationCity = String(input.destinationCity || "").trim()
  if (!title || !destinationCity) {
    throw new TourismDomainError("VALIDATION_ERROR", "Tur adı ve hedef destinasyon zorunludur.", 400)
  }

  const startAt = new Date(input.startAt)
  const endAt = new Date(input.endAt)
  if (Number.isNaN(startAt.getTime()) || Number.isNaN(endAt.getTime()) || endAt <= startAt) {
    throw new TourismDomainError(
      "VALIDATION_ERROR",
      "Geçerli hareket ve dönüş tarih-saati giriniz (dönüş hareketten sonra olmalıdır).",
      400
    )
  }

  const lockKey = `tour-res:${input.vehicleId || "nv"}:${input.driverId || "nd"}:${input.guideId || "ng"}`
  return await withTourResourceLock(lockKey, async () => {
    const dbAny = prisma as any
    const allTours = await dbAny.turizmTourPackage.findMany()
    const existing = input.id ? allTours.find((t: any) => t.id === input.id) : null
    const code =
      String(input.code || existing?.code || "").trim().toUpperCase() ||
      `TUR-2026-${String(Date.now()).slice(-4)}`

    const nextStatus = String(input.status || existing?.status || "ON_SALE").toUpperCase()
    if (!TOUR_STATUSES.includes(nextStatus as TourStatus)) {
      throw new TourismDomainError("VALIDATION_ERROR", `Geçersiz tur durumu: ${nextStatus}`, 400)
    }

    if (nextStatus !== "CANCELLED") {
      await assertTourResourcesAvailable({
        tourId: existing?.id,
        tourCode: code,
        startAt,
        endAt,
        vehicleId: input.vehicleId !== undefined ? input.vehicleId : existing?.vehicleId,
        driverId: input.driverId !== undefined ? input.driverId : existing?.driverId,
        guideId: input.guideId !== undefined ? input.guideId : existing?.guideId,
        actorUserId: scope.userId,
        ownerCompanyId: scope.effectiveCompanyId || MAIN_COMPANY_ID,
      })
    }

    const durationDays = Math.max(
      1,
      Number(
        input.durationDays ??
          Math.ceil((endAt.getTime() - startAt.getTime()) / 86_400_000)
      )
    )
    const tourType = String(
      input.tourType || existing?.tourType || (durationDays > 1 ? "MULTI_DAY" : "DAY_TRIP")
    ).toUpperCase()

    const payload = {
      code,
      title,
      destinationCity,
      departureCity: String(input.departureCity || existing?.departureCity || "İstanbul").trim(),
      tourType,
      durationDays,
      startAt,
      endAt,
      itineraryJson: Array.isArray(input.itinerary)
        ? JSON.stringify(input.itinerary)
        : typeof input.itineraryJson === "string"
          ? input.itineraryJson
          : existing?.itineraryJson ?? JSON.stringify([]),
      adultPriceTry: Math.max(0, Number(input.adultPriceTry ?? existing?.adultPriceTry ?? 2500)),
      childPriceTry: Math.max(0, Number(input.childPriceTry ?? existing?.childPriceTry ?? 1750)),
      capacity: Math.max(1, Number(input.capacity ?? existing?.capacity ?? 45)),
      minParticipants: Math.max(1, Number(input.minParticipants ?? existing?.minParticipants ?? 15)),
      status: nextStatus,
      branchId: input.branchId || existing?.branchId || scope.branchId || "local-debug-branch",
      vehicleId: input.vehicleId !== undefined ? input.vehicleId || null : existing?.vehicleId ?? null,
      driverId: input.driverId !== undefined ? input.driverId || null : existing?.driverId ?? null,
      guideId: input.guideId !== undefined ? input.guideId || null : existing?.guideId ?? null,
      seatLayoutId:
        input.seatLayoutId !== undefined ? input.seatLayoutId || null : existing?.seatLayoutId ?? null,
      hotelAllotmentId:
        input.hotelAllotmentId !== undefined
          ? input.hotelAllotmentId || null
          : existing?.hotelAllotmentId ?? null,
      hotelRoomIdsJson: Array.isArray(input.hotelRoomIds)
        ? JSON.stringify(input.hotelRoomIds)
        : existing?.hotelRoomIdsJson ?? null,
      hotelNightlyCostPerRoomTry: Math.max(
        0,
        Number(input.hotelNightlyCostPerRoomTry ?? existing?.hotelNightlyCostPerRoomTry ?? 0)
      ),
      agencyQuotasJson: Array.isArray(input.agencyQuotas)
        ? JSON.stringify(input.agencyQuotas)
        : existing?.agencyQuotasJson ?? null,
      enforceGenderSeatRule:
        input.enforceGenderSeatRule !== undefined
          ? Boolean(input.enforceGenderSeatRule)
          : existing?.enforceGenderSeatRule ?? true,
      allowFamilySeatOverride:
        input.allowFamilySeatOverride !== undefined
          ? Boolean(input.allowFamilySeatOverride)
          : existing?.allowFamilySeatOverride ?? true,
      estimatedDistanceKm: Math.max(
        0,
        Number(input.estimatedDistanceKm ?? existing?.estimatedDistanceKm ?? 0)
      ),
      estimatedDurationMinutes: Math.max(
        0,
        Number(input.estimatedDurationMinutes ?? existing?.estimatedDurationMinutes ?? 0)
      ),
      notes: input.notes !== undefined ? input.notes : existing?.notes ?? null,
      ownerCompanyId: existing?.ownerCompanyId || scope.effectiveCompanyId || MAIN_COMPANY_ID,
      updatedAt: new Date(),
    }

    const saved = existing
      ? await dbAny.turizmTourPackage.update({ where: { id: existing.id }, data: payload })
      : await dbAny.turizmTourPackage.create({
          data: {
            id: input.id || `trzm-tur-pkg-${Date.now().toString(36)}`,
            ...payload,
            createdBy: scope.userId,
            createdAt: new Date(),
          },
        })

    await logTourismAudit({
      userId: scope.userId,
      action: existing ? "UPDATE_TOUR_PACKAGE" : "CREATE_TOUR_PACKAGE",
      resource: "turizm_tur",
      resourceId: saved.id,
      moduleKey: "turizm_tur",
      branchId: scope.branchId,
      companyId: scope.effectiveCompanyId,
      metadata: {
        code: saved.code,
        status: saved.status,
        vehicleId: saved.vehicleId,
        driverId: saved.driverId,
        guideId: saved.guideId,
      },
    })

    return saved
  })
}

export async function resolveTourConflictLog(
  input: { conflictId: string; resolutionNote: string },
  scope: TourismScopeContext
) {
  assertNotTourGuideScoped(scope, "Çakışma kaydı çözümleme")
  const dbAny = prisma as any
  const rec = await dbAny.turizmTourConflictLog.findUnique({ where: { id: input.conflictId } })
  if (!rec) throw new TourismDomainError("NOT_FOUND", "Çakışma kaydı bulunamadı.", 404)
  return await dbAny.turizmTourConflictLog.update({
    where: { id: rec.id },
    data: {
      resolved: true,
      resolutionNote: String(input.resolutionNote || "Manuel kaynak değişimi ile çözüldü."),
    },
  })
}

// ── B) Atomik Koltuk Seçimi / Atama ──────────────────────────────────────────

export async function assignTourPassengerSeat(
  input: {
    tourId: string
    passengerId: string
    seatNumber: string
    familyGroupCode?: string | null
  },
  scope: TourismScopeContext
) {
  return await withTourResourceLock(`tour-seat:${input.tourId}`, async () => {
    const dbAny = prisma as any
    const [tour, passenger, allTourPassengers, layouts] = await Promise.all([
      dbAny.turizmTourPackage.findUnique({ where: { id: input.tourId } }),
      dbAny.turizmTourPassenger.findUnique({ where: { id: input.passengerId } }),
      dbAny.turizmTourPassenger.findMany({ where: { tourId: input.tourId } }),
      dbAny.turizmTourSeatLayout.findMany(),
    ])
    if (!tour || !passenger) {
      throw new TourismDomainError("NOT_FOUND", "Tur veya yolcu kaydı bulunamadı.", 404)
    }

    const layout =
      layouts.find((l: any) => l.id === tour.seatLayoutId) || {
        totalSeats: tour.capacity,
        seatsPerRow: 4,
        aisleAfterCol: 2,
      }

    // Yalnızca aktif (iptal edilmemiş) rezervasyonlardaki yolcular koltuk tutar
    const bookings = await dbAny.turizmTourBooking.findMany({ where: { tourId: tour.id } })
    const cancelledBookingIds = new Set(
      bookings
        .filter((b: any) => b.status === "CANCELLED" || b.status === "NO_SHOW")
        .map((b: any) => b.id)
    )
    const activePassengers = allTourPassengers.filter(
      (p: any) => !cancelledBookingIds.has(p.bookingId)
    )

    const check = validateSeatAssignmentRule({
      seatNumber: String(input.seatNumber),
      passengerGender: passenger.gender || "UNSPECIFIED",
      familyGroupCode:
        input.familyGroupCode !== undefined ? input.familyGroupCode : passenger.familyGroupCode,
      layout,
      occupiedPassengers: activePassengers,
      excludePassengerId: passenger.id,
      enforceGenderRule: tour.enforceGenderSeatRule !== false,
      allowFamilyOverride: tour.allowFamilySeatOverride !== false,
    })

    if (!check.ok) {
      await recordTourConflictLog({
        tourId: tour.id,
        tourCode: tour.code,
        resourceType: "SEAT",
        resourceId: String(input.seatNumber),
        resourceLabel: `Koltuk ${input.seatNumber}`,
        attemptedStartAt: new Date(tour.startAt),
        attemptedEndAt: new Date(tour.endAt),
        conflictSource:
          check.code === "SEAT_GENDER_RULE_VIOLATION" ? "SEAT_GENDER_RULE" : "SEAT_LOCK",
        conflictRefNo: tour.code,
        rejectionCode: check.code,
        rejectionMessage: check.message,
        actorUserId: scope.userId,
        ownerCompanyId: scope.effectiveCompanyId || MAIN_COMPANY_ID,
      })
      throw new TourismDomainError("CONFLICT", check.message, 409, { rejectionCode: check.code })
    }

    const updated = await dbAny.turizmTourPassenger.update({
      where: { id: passenger.id },
      data: {
        seatNumber: String(input.seatNumber),
        familyGroupCode:
          input.familyGroupCode !== undefined ? input.familyGroupCode : passenger.familyGroupCode,
        updatedAt: new Date(),
      },
    })

    await logTourismAudit({
      userId: scope.userId,
      action: "ASSIGN_TOUR_PASSENGER_SEAT",
      resource: "turizm_tur",
      resourceId: updated.id,
      moduleKey: "turizm_tur",
      branchId: scope.branchId,
      companyId: scope.effectiveCompanyId,
      metadata: { tourCode: tour.code, seatNumber: updated.seatNumber },
    })

    return updated
  })
}

// ── D) Biniş Noktaları & Tahmini Rota Metrikleri ─────────────────────────────

export async function upsertTourPickupStop(
  input: {
    id?: string
    tourId: string
    sequenceNo?: number
    stopName: string
    district?: string
    address?: string
    pickupTime: string
    lat: number
    lng: number
  },
  scope: TourismScopeContext
) {
  assertNotTourGuideScoped(scope, "Biniş noktası planlama")
  const dbAny = prisma as any
  const tour = await dbAny.turizmTourPackage.findUnique({ where: { id: input.tourId } })
  if (!tour) throw new TourismDomainError("NOT_FOUND", "Tur kaydı bulunamadı.", 404)

  const existingStops = await dbAny.turizmTourPickupStop.findMany({ where: { tourId: tour.id } })
  const existing = input.id ? existingStops.find((s: any) => s.id === input.id) : null
  const payload = {
    tourId: tour.id,
    sequenceNo: Math.max(1, Number(input.sequenceNo ?? existing?.sequenceNo ?? existingStops.length + 1)),
    stopName: String(input.stopName || "").trim(),
    district: input.district ?? existing?.district ?? null,
    address: input.address ?? existing?.address ?? null,
    pickupTime: String(input.pickupTime || "07:00"),
    lat: Number(input.lat || 41.0082),
    lng: Number(input.lng || 28.9784),
    ownerCompanyId: scope.effectiveCompanyId || MAIN_COMPANY_ID,
  }

  const saved = existing
    ? await dbAny.turizmTourPickupStop.update({ where: { id: existing.id }, data: payload })
    : await dbAny.turizmTourPickupStop.create({
        data: {
          id: `trzm-tur-stp-${Date.now()}-${Math.random().toString(36).slice(2, 5)}`,
          ...payload,
          createdAt: new Date(),
        },
      })

  // Tahmini mesafe ve süreyi tüm duraklara göre yeniden hesapla
  const updatedStops = await dbAny.turizmTourPickupStop.findMany({ where: { tourId: tour.id } })
  const est = estimateTourRouteMetrics(updatedStops)
  await dbAny.turizmTourPackage.update({
    where: { id: tour.id },
    data: {
      estimatedDistanceKm: est.estimatedDistanceKm,
      estimatedDurationMinutes: est.estimatedDurationMinutes,
      updatedAt: new Date(),
    },
  })

  return { stop: saved, routeEstimate: est }
}

// ── E) Kaynak × Gün Gantt ────────────────────────────────────────────────────

export async function getTourResourceAvailabilityGantt(
  params: { windowStartDate?: string | Date; daysCount?: number },
  scope: TourismScopeContext
) {
  const dbAny = prisma as any
  const [vehicles, drivers, guides, tours, rentReservations] = await Promise.all([
    dbAny.lojistikVehicle.findMany().catch(() => []),
    dbAny.lojistikDriver.findMany().catch(() => []),
    dbAny.turizmTourGuide.findMany().catch(() => []),
    dbAny.turizmTourPackage.findMany().catch(() => []),
    dbAny.turizmRentReservation.findMany().catch(() => []),
  ])

  const tourVehicles = applyCompanyScopeFilter(vehicles, scope).filter(
    (v: any) =>
      v.isActive !== false &&
      (v.vehicleType === "BUS" ||
        v.vehicleType === "MIDIBUS" ||
        v.vehicleType === "MINIBUS" ||
        v.id === "f5-veh-11" ||
        String(v.id).startsWith("trzm-tur-veh-") ||
        String(v.id).startsWith("trzm-rnt-veh-07"))
  )

  return buildTourResourceGantt({
    vehicles: tourVehicles,
    drivers: drivers.filter((d: any) => d.isActive !== false),
    guides: applyCompanyScopeFilter(guides, scope),
    tours: applyCompanyScopeFilter(tours, scope),
    rentReservations: applyCompanyScopeFilter(rentReservations, scope),
    windowStartDate: params.windowStartDate || new Date("2026-11-20T00:00:00.000Z"),
    daysCount: params.daysCount ?? 14,
  })
}
