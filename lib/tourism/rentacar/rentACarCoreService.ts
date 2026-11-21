/**
 * Sunum ERP — Turizm Faz 2: Araç Kiralama (Rent-a-Car) Çekirdek Servis Katmanı
 *
 * Kapsam:
 * A) Araç sınıfı/kategori, fiyat tarifeleri, ek hizmetler ve ayarlanabilir politika/şablon yönetimi
 * B) Müsaitlik takvimi (Gantt) — kirada, rezerve, bakımda, müsait günler (sınıf ve şube filtreli)
 * C) Müşteri & sürücü kaydı (mevcut Customer modeli üzerinde KVKK maskeleme + yaş/ehliyet yılı doğrulaması)
 * D) Rezervasyon, sunucu tarafı atomik çift rezervasyon & bakım çakışma kilidi, araç değiştirme/uzatma/iptal
 * E) Kiralama sözleşmesi üretimi, şablon değişken yerleştirme ve tarayıcı dijital imza kaydı
 */

import { prisma } from "@/lib/db"
import { checkPermission } from "@/lib/auth/server-permission"
import { DemoDbEDocumentProvider } from "@/lib/logistics/providers/efatura-irsaliye"
import {
  applyCompanyScopeFilter as filterRecordsByCompanyScope,
  buildCompanyPrismaWhere as buildCompanyScopedPrismaWhere,
  logTourismAudit,
  TourismDomainError,
} from "@/lib/tourism/security"
import type { TourismScopeContext } from "@/lib/tourism/types"
import { MAIN_COMPANY_ID } from "@/lib/tourism/constants"
import {
  applyCustomerKvkkMasking,
  buildVehicleAvailabilityGantt,
  calculateRentalPricing,
  DEFAULT_SAMPLE_CONTRACT_TEMPLATE_TEXT,
  doTimeIntervalsOverlap,
  evaluateRenterEligibility,
  resolveEffectiveVehicleClassId,
  type SelectedExtraServiceInput,
} from "./constantsAndHelpers"

// ── Sunucu İçi Atomik Araç Rezervasyon Kilidi (In-Process Per-Vehicle Mutex) ──
const vehicleLockQueues = new Map<string, Promise<unknown>>()

export async function withVehicleReservationLock<T>(
  vehicleId: string,
  task: () => Promise<T>
): Promise<T> {
  const key = String(vehicleId || "global")
  const previous = vehicleLockQueues.get(key) ?? Promise.resolve()

  let releaseNext!: () => void
  const currentGate = new Promise<void>((resolve) => {
    releaseNext = resolve
  })

  const chainedQueue = previous.then(() => currentGate, () => currentGate)
  vehicleLockQueues.set(key, chainedQueue)

  await previous.catch(() => undefined)
  try {
    return await task()
  } finally {
    releaseNext()
    if (vehicleLockQueues.get(key) === chainedQueue) {
      vehicleLockQueues.delete(key)
    }
  }
}

// ── KVKK Yetki Kontrolü (Müşteri TCKN / Pasaport / Ehliyet Açık Görüntüleme) ─

export async function canUserViewRenterKvkkPii(
  scope: TourismScopeContext
): Promise<boolean> {
  if (scope.isPartnerScoped) return false
  if (scope.isSuperAdmin || scope.isPlatformDeveloper) return true
  const [hasRentApprove, hasCustomerApprove] = await Promise.all([
    checkPermission(scope.userId, scope.branchId, "turizm_rentacar", "approve").catch(() => false),
    checkPermission(scope.userId, scope.branchId, "customers", "approve").catch(() => false),
  ])
  return Boolean(hasRentApprove || hasCustomerApprove)
}

// ── A) Araç Sınıfları, Tarifeler, Ek Hizmetler ve Politika Ayarları ──────────

export async function listVehicleClasses(scope: TourismScopeContext) {
  const dbAny = prisma as any
  const classes = await dbAny.turizmRentVehicleClass.findMany({
    orderBy: { sortOrder: "asc" },
  })
  return filterRecordsByCompanyScope(classes, scope)
}

export async function upsertVehicleClass(
  input: Record<string, any>,
  scope: TourismScopeContext
) {
  const dbAny = prisma as any
  const code = String(input.code || "").trim().toUpperCase()
  const name = String(input.name || "").trim()
  if (!code || !name) {
    throw new TourismDomainError(
      "VALIDATION_ERROR",
      "Araç sınıfı kodu ve adı zorunludur.",
      400
    )
  }

  const all = await dbAny.turizmRentVehicleClass.findMany()
  const existing = input.id
    ? all.find((c: any) => c.id === input.id)
    : all.find((c: any) => String(c.code).toUpperCase() === code)

  const payload = {
    code,
    name,
    segmentCode: String(input.segmentCode || existing?.segmentCode || "C").toUpperCase(),
    transmissionDefault: String(
      input.transmissionDefault || existing?.transmissionDefault || "AUTOMATIC"
    ).toUpperCase(),
    fuelTypeDefault: String(
      input.fuelTypeDefault || existing?.fuelTypeDefault || "PETROL"
    ).toUpperCase(),
    minDriverAge: Math.max(18, Number(input.minDriverAge ?? existing?.minDriverAge ?? 21)),
    minLicenseYears: Math.max(0, Number(input.minLicenseYears ?? existing?.minLicenseYears ?? 2)),
    defaultDepositTry: Math.max(
      0,
      Number(input.defaultDepositTry ?? existing?.defaultDepositTry ?? 5000)
    ),
    dailyKmLimit: Math.max(0, Number(input.dailyKmLimit ?? existing?.dailyKmLimit ?? 250)),
    extraKmUnitPriceTry: Math.max(
      0,
      Number(input.extraKmUnitPriceTry ?? existing?.extraKmUnitPriceTry ?? 6.5)
    ),
    lateReturnHourlyTry: Math.max(
      0,
      Number(input.lateReturnHourlyTry ?? existing?.lateReturnHourlyTry ?? 350)
    ),
    missingFuelPricePerPctTry: Math.max(
      0,
      Number(input.missingFuelPricePerPctTry ?? existing?.missingFuelPricePerPctTry ?? 32)
    ),
    seatCountDefault: Math.max(1, Number(input.seatCountDefault ?? existing?.seatCountDefault ?? 5)),
    baggageCountDefault: Math.max(
      0,
      Number(input.baggageCountDefault ?? existing?.baggageCountDefault ?? 3)
    ),
    description: input.description ?? existing?.description ?? null,
    sortOrder: Number(input.sortOrder ?? existing?.sortOrder ?? 10),
    isActive: input.isActive !== undefined ? Boolean(input.isActive) : existing?.isActive ?? true,
    ownerCompanyId: existing?.ownerCompanyId || scope.effectiveCompanyId || MAIN_COMPANY_ID,
    updatedAt: new Date(),
  }

  const saved = existing
    ? await dbAny.turizmRentVehicleClass.update({ where: { id: existing.id }, data: payload })
    : await dbAny.turizmRentVehicleClass.create({
      data: {
        id: input.id || `trzm-rnt-cls-${Date.now().toString(36)}`,
        ...payload,
        createdAt: new Date(),
      },
    })

  await logTourismAudit({
    userId: scope.userId,
    action: existing ? "UPDATE_RENT_VEHICLE_CLASS" : "CREATE_RENT_VEHICLE_CLASS",
    resource: "turizm_rentacar",
    resourceId: saved.id,
    moduleKey: "turizm_rentacar",
    branchId: scope.branchId,
    companyId: scope.effectiveCompanyId,
    metadata: { code: saved.code, name: saved.name },
  })

  return saved
}

export async function listTariffs(
  scope: TourismScopeContext,
  filters?: { branchId?: string; vehicleClassId?: string }
) {
  const dbAny = prisma as any
  let tariffs = await dbAny.turizmRentTariff.findMany({
    include: { vehicleClass: true },
  })
  tariffs = filterRecordsByCompanyScope(tariffs, scope)
  if (filters?.branchId) {
    tariffs = tariffs.filter((t: any) => t.branchId === filters.branchId)
  }
  if (filters?.vehicleClassId) {
    tariffs = tariffs.filter((t: any) => t.vehicleClassId === filters.vehicleClassId)
  }
  return tariffs
}

export async function upsertTariff(
  input: Record<string, any>,
  scope: TourismScopeContext
) {
  const dbAny = prisma as any
  const code = String(input.code || `TRF-${Date.now().toString().slice(-5)}`).trim().toUpperCase()
  const name = String(input.name || "").trim()
  const vehicleClassId = String(input.vehicleClassId || "").trim()
  if (!name || !vehicleClassId) {
    throw new TourismDomainError(
      "VALIDATION_ERROR",
      "Tarife adı ve araç sınıfı seçimi zorunludur.",
      400
    )
  }

  const all = await dbAny.turizmRentTariff.findMany()
  const existing = input.id
    ? all.find((t: any) => t.id === input.id)
    : all.find((t: any) => String(t.code).toUpperCase() === code)

  const dailyRateTry = Math.max(0, Number(input.dailyRateTry ?? existing?.dailyRateTry ?? 1800))
  const weeklyDailyRateTry = Math.max(
    0,
    Number(input.weeklyDailyRateTry ?? existing?.weeklyDailyRateTry ?? Math.round(dailyRateTry * 0.9))
  )
  const monthlyDailyRateTry = Math.max(
    0,
    Number(
      input.monthlyDailyRateTry ?? existing?.monthlyDailyRateTry ?? Math.round(dailyRateTry * 0.78)
    )
  )

  const payload = {
    code,
    name,
    vehicleClassId,
    branchId: input.branchId || existing?.branchId || scope.branchId || "local-debug-branch",
    seasonType: String(input.seasonType || existing?.seasonType || "STANDARD").toUpperCase(),
    validFrom: input.validFrom ? new Date(input.validFrom) : existing?.validFrom ?? new Date("2026-01-01T00:00:00.000Z"),
    validTo: input.validTo ? new Date(input.validTo) : existing?.validTo ?? new Date("2027-12-31T23:59:59.000Z"),
    dailyRateTry,
    weeklyDailyRateTry,
    monthlyDailyRateTry,
    dailyKmLimit: Math.max(0, Number(input.dailyKmLimit ?? existing?.dailyKmLimit ?? 250)),
    extraKmRateTry: Math.max(0, Number(input.extraKmRateTry ?? existing?.extraKmRateTry ?? 6.5)),
    depositAmountTry: Math.max(0, Number(input.depositAmountTry ?? existing?.depositAmountTry ?? 5000)),
    currency: String(input.currency || existing?.currency || "TRY").toUpperCase(),
    isActive: input.isActive !== undefined ? Boolean(input.isActive) : existing?.isActive ?? true,
    ownerCompanyId: existing?.ownerCompanyId || scope.effectiveCompanyId || MAIN_COMPANY_ID,
    updatedAt: new Date(),
  }

  const saved = existing
    ? await dbAny.turizmRentTariff.update({ where: { id: existing.id }, data: payload })
    : await dbAny.turizmRentTariff.create({
      data: {
        id: input.id || `trzm-rnt-trf-${Date.now().toString(36)}`,
        ...payload,
        createdAt: new Date(),
      },
    })

  await logTourismAudit({
    userId: scope.userId,
    action: existing ? "UPDATE_RENT_TARIFF" : "CREATE_RENT_TARIFF",
    resource: "turizm_rentacar",
    resourceId: saved.id,
    moduleKey: "turizm_rentacar",
    branchId: scope.branchId,
    companyId: scope.effectiveCompanyId,
    metadata: { code: saved.code, dailyRateTry: saved.dailyRateTry },
  })

  return saved
}

export async function listExtraServices(scope: TourismScopeContext) {
  const dbAny = prisma as any
  const services = await dbAny.turizmRentExtraService.findMany()
  return filterRecordsByCompanyScope(services, scope)
}

export async function upsertExtraService(
  input: Record<string, any>,
  scope: TourismScopeContext
) {
  const dbAny = prisma as any
  const code = String(input.code || `EKH-${Date.now().toString().slice(-4)}`).trim().toUpperCase()
  const name = String(input.name || "").trim()
  if (!name) {
    throw new TourismDomainError("VALIDATION_ERROR", "Ek hizmet adı zorunludur.", 400)
  }

  const all = await dbAny.turizmRentExtraService.findMany()
  const existing = input.id
    ? all.find((s: any) => s.id === input.id)
    : all.find((s: any) => String(s.code).toUpperCase() === code)

  const payload = {
    code,
    name,
    category: String(input.category || existing?.category || "EQUIPMENT").toUpperCase(),
    pricingType: String(input.pricingType || existing?.pricingType || "DAILY").toUpperCase(),
    unitPriceTry: Math.max(0, Number(input.unitPriceTry ?? existing?.unitPriceTry ?? 250)),
    currency: String(input.currency || existing?.currency || "TRY").toUpperCase(),
    isMandatory: Boolean(input.isMandatory ?? existing?.isMandatory ?? false),
    isActive: input.isActive !== undefined ? Boolean(input.isActive) : existing?.isActive ?? true,
    description: input.description ?? existing?.description ?? null,
    ownerCompanyId: existing?.ownerCompanyId || scope.effectiveCompanyId || MAIN_COMPANY_ID,
    updatedAt: new Date(),
  }

  const saved = existing
    ? await dbAny.turizmRentExtraService.update({ where: { id: existing.id }, data: payload })
    : await dbAny.turizmRentExtraService.create({
      data: {
        id: input.id || `trzm-rnt-ext-${Date.now().toString(36)}`,
        ...payload,
        createdAt: new Date(),
      },
    })

  await logTourismAudit({
    userId: scope.userId,
    action: existing ? "UPDATE_RENT_EXTRA_SERVICE" : "CREATE_RENT_EXTRA_SERVICE",
    resource: "turizm_rentacar",
    resourceId: saved.id,
    moduleKey: "turizm_rentacar",
    branchId: scope.branchId,
    companyId: scope.effectiveCompanyId,
    metadata: { code: saved.code, unitPriceTry: saved.unitPriceTry },
  })

  return saved
}

export async function getRentPolicyConfig(branchId = "local-debug-branch") {
  const dbAny = prisma as any
  const all = await dbAny.turizmRentPolicyConfig.findMany()
  const match =
    all.find((p: any) => p.branchId === branchId) ||
    all.find((p: any) => p.branchId === "local-debug-branch") ||
    all[0]

  if (match) return match

  return {
    id: "trzm-rnt-policy-default",
    branchId,
    ownerCompanyId: MAIN_COMPANY_ID,
    minDriverAgeDefault: 21,
    minLicenseYearsDefault: 2,
    gracePeriodMinutes: 60,
    lateHourToFullDayThreshold: 4,
    missingFuelRatePerPctTry: 32,
    cleaningFeeTry: 750,
    adminServiceFeeForPenaltyTry: 250,
    invoiceTimingMode: "ON_RETURN_COMPLETION",
    defaultVatRatePct: 20,
    contractTemplateTitle: "ARAÇ KİRALAMA SÖZLEŞMESİ (ÖRNEK ŞABLON)",
    contractTemplateBodyText: DEFAULT_SAMPLE_CONTRACT_TEMPLATE_TEXT,
    legalReviewNoticeText:
      "Bu metin yalnızca örnek/yer tutucu bir şablondur; canlı kullanımdan önce firmanızın hukuk müşaviri tarafından incelenmesi gerekir.",
  }
}

export async function updateRentPolicyConfig(
  input: Record<string, any>,
  scope: TourismScopeContext
) {
  const dbAny = prisma as any
  const branchId = String(input.branchId || scope.branchId || "local-debug-branch")
  const all = await dbAny.turizmRentPolicyConfig.findMany()
  const existing = all.find((p: any) => p.branchId === branchId)

  const payload = {
    branchId,
    ownerCompanyId: existing?.ownerCompanyId || scope.effectiveCompanyId || MAIN_COMPANY_ID,
    minDriverAgeDefault: Math.max(18, Number(input.minDriverAgeDefault ?? existing?.minDriverAgeDefault ?? 21)),
    minLicenseYearsDefault: Math.max(0, Number(input.minLicenseYearsDefault ?? existing?.minLicenseYearsDefault ?? 2)),
    gracePeriodMinutes: Math.max(0, Number(input.gracePeriodMinutes ?? existing?.gracePeriodMinutes ?? 60)),
    lateHourToFullDayThreshold: Math.max(
      1,
      Number(input.lateHourToFullDayThreshold ?? existing?.lateHourToFullDayThreshold ?? 4)
    ),
    missingFuelRatePerPctTry: Math.max(
      0,
      Number(input.missingFuelRatePerPctTry ?? existing?.missingFuelRatePerPctTry ?? 32)
    ),
    cleaningFeeTry: Math.max(0, Number(input.cleaningFeeTry ?? existing?.cleaningFeeTry ?? 750)),
    adminServiceFeeForPenaltyTry: Math.max(
      0,
      Number(input.adminServiceFeeForPenaltyTry ?? existing?.adminServiceFeeForPenaltyTry ?? 250)
    ),
    invoiceTimingMode: String(
      input.invoiceTimingMode || existing?.invoiceTimingMode || "ON_RETURN_COMPLETION"
    ).toUpperCase(),
    defaultVatRatePct: Math.max(0, Number(input.defaultVatRatePct ?? existing?.defaultVatRatePct ?? 20)),
    contractTemplateTitle:
      String(input.contractTemplateTitle || existing?.contractTemplateTitle || "ARAÇ KİRALAMA SÖZLEŞMESİ (ÖRNEK ŞABLON)").trim(),
    contractTemplateBodyText:
      String(input.contractTemplateBodyText || existing?.contractTemplateBodyText || DEFAULT_SAMPLE_CONTRACT_TEMPLATE_TEXT),
    legalReviewNoticeText:
      String(
        input.legalReviewNoticeText ||
        existing?.legalReviewNoticeText ||
        "Bu metin yalnızca örnek/yer tutucu bir şablondur; canlı kullanımdan önce firmanızın hukuk müşaviri tarafından incelenmesi gerekir."
      ),
    updatedBy: scope.userId,
    updatedAt: new Date(),
  }

  const saved = existing
    ? await dbAny.turizmRentPolicyConfig.update({ where: { id: existing.id }, data: payload })
    : await dbAny.turizmRentPolicyConfig.create({
      data: {
        id: `trzm-rnt-policy-${branchId}`,
        ...payload,
        createdAt: new Date(),
      },
    })

  await logTourismAudit({
    userId: scope.userId,
    action: "UPDATE_RENT_POLICY_CONFIG",
    resource: "turizm_rentacar",
    resourceId: saved.id,
    moduleKey: "turizm_rentacar",
    branchId: scope.branchId,
    companyId: scope.effectiveCompanyId,
    metadata: { invoiceTimingMode: saved.invoiceTimingMode },
  })

  return saved
}

// ── Ortak Filo Araçları (LojistikVehicle) Üzerinde Kiralama Havuzu & Durum Tutarlılığı ──

export async function listRentalFleetVehicles(
  params: {
    branchId?: string
    rentalClassId?: string
    rentalStatus?: string
    search?: string
    includeNonPoolFleet?: boolean
  },
  scope: TourismScopeContext
) {
  const dbAny = prisma as any
  const [vehicles, classes, reservations, workOrders] = await Promise.all([
    dbAny.lojistikVehicle.findMany(),
    dbAny.turizmRentVehicleClass.findMany().catch(() => []),
    dbAny.turizmRentReservation.findMany().catch(() => []),
    dbAny.lojistikVehicleMaintenanceWorkOrder.findMany().catch(() => []),
  ])

  const classMap = new Map<string, any>(classes.map((c: any) => [c.id, c]))
  const activeResByVehicle = new Map<string, any>()
  for (const r of reservations) {
    if (r.status === "ACTIVE") {
      activeResByVehicle.set(r.vehicleId, r)
    } else if (r.status === "CONFIRMED" && !activeResByVehicle.has(r.vehicleId)) {
      activeResByVehicle.set(r.vehicleId, r)
    }
  }

  let list = filterRecordsByCompanyScope(vehicles, scope).filter((v: any) => v.isActive !== false)
  if (!params.includeNonPoolFleet) {
    list = list.filter(
      (v: any) =>
        v.isRentalPool === true ||
        Boolean(v.rentalClassId) ||
        v.vehicleType === "PASSENGER" ||
        v.vehicleType === "MINIBUS"
    )
  }
  if (params.branchId) {
    list = list.filter((v: any) => v.branchId === params.branchId)
  }
  if (params.rentalClassId) {
    list = list.filter((v: any) => resolveEffectiveVehicleClassId(v) === params.rentalClassId)
  }
  if (params.search) {
    const q = params.search.trim().toLowerCase()
    list = list.filter(
      (v: any) =>
        String(v.plate || "").toLowerCase().includes(q) ||
        String(v.brand || "").toLowerCase().includes(q) ||
        String(v.model || "").toLowerCase().includes(q) ||
        String(v.code || "").toLowerCase().includes(q)
    )
  }

  return list.map((v: any) => {
    const effClassId = resolveEffectiveVehicleClassId(v)
    const cls = effClassId ? classMap.get(effClassId) : null
    const activeRes = activeResByVehicle.get(v.id) || null
    const openWo = workOrders.find(
      (wo: any) =>
        wo.vehicleId === v.id &&
        (wo.status === "IN_PROGRESS" || wo.status === "SCHEDULED")
    )

    // Filo durumu ile kiralama durumu arasında %100 tutarlılık:
    let effectiveRentalStatus = v.rentalStatus || "AVAILABLE"
    if (v.status === "MAINTENANCE" || v.status === "FAULT" || v.status === "OUT_OF_SERVICE") {
      effectiveRentalStatus = "MAINTENANCE"
    } else if (activeRes?.status === "ACTIVE") {
      effectiveRentalStatus = "RENTED"
    } else if (activeRes?.status === "CONFIRMED") {
      effectiveRentalStatus = "RESERVED"
    }

    return {
      ...v,
      rentalClassId: effClassId,
      rentalStatus: effectiveRentalStatus,
      vehicleClass: cls || null,
      vehicleClassName: cls?.name || "Genel Kiralama Filosu",
      activeReservation: activeRes,
      openMaintenanceWorkOrder: openWo || null,
    }
  })
}

export async function assignVehicleToRentalPool(
  input: {
    vehicleId: string
    isRentalPool: boolean
    rentalClassId?: string | null
    transmissionType?: string
    seatCount?: number
    doorCount?: number
    baggageCapacity?: number
    currentFuelPct?: number
  },
  scope: TourismScopeContext
) {
  const dbAny = prisma as any
  const vehicle = await dbAny.lojistikVehicle.findUnique({ where: { id: input.vehicleId } })
  if (!vehicle) {
    throw new TourismDomainError("NOT_FOUND", "Filo aracı bulunamadı.", 404)
  }

  const updated = await dbAny.lojistikVehicle.update({
    where: { id: vehicle.id },
    data: {
      isRentalPool: Boolean(input.isRentalPool),
      rentalClassId: input.rentalClassId ?? vehicle.rentalClassId ?? null,
      transmissionType: input.transmissionType || vehicle.transmissionType || "AUTOMATIC",
      seatCount: Number(input.seatCount ?? vehicle.seatCount ?? 5),
      doorCount: Number(input.doorCount ?? vehicle.doorCount ?? 4),
      baggageCapacity: Number(input.baggageCapacity ?? vehicle.baggageCapacity ?? 3),
      currentFuelPct: Number(input.currentFuelPct ?? vehicle.currentFuelPct ?? 100),
      updatedAt: new Date(),
    },
  })

  await logTourismAudit({
    userId: scope.userId,
    action: "ASSIGN_VEHICLE_RENTAL_POOL",
    resource: "turizm_rentacar",
    resourceId: updated.id,
    moduleKey: "turizm_rentacar",
    branchId: scope.branchId,
    companyId: scope.effectiveCompanyId,
    metadata: {
      plate: updated.plate,
      isRentalPool: updated.isRentalPool,
      rentalClassId: updated.rentalClassId,
    },
  })

  return updated
}

// ── B) Müsaitlik Takvimi (Gantt) ─────────────────────────────────────────────

export async function getRentalAvailabilityGantt(
  params: {
    windowStartDate?: string | Date
    daysCount?: number
    vehicleClassId?: string
    branchId?: string
  },
  scope: TourismScopeContext
) {
  const dbAny = prisma as any
  const [vehicles, classes, reservations, workOrders, customers] = await Promise.all([
    dbAny.lojistikVehicle.findMany(),
    dbAny.turizmRentVehicleClass.findMany().catch(() => []),
    dbAny.turizmRentReservation.findMany().catch(() => []),
    dbAny.lojistikVehicleMaintenanceWorkOrder.findMany().catch(() => []),
    dbAny.customer.findMany().catch(() => []),
  ])

  const classesById = new Map<string, any>(classes.map((c: any) => [c.id, c]))
  const customersById = new Map<string, any>(customers.map((c: any) => [c.id, c]))

  return buildVehicleAvailabilityGantt({
    vehicles: filterRecordsByCompanyScope(vehicles, scope),
    classesById,
    reservations: filterRecordsByCompanyScope(reservations, scope),
    maintenanceWorkOrders: workOrders,
    customersById,
    windowStartDate: params.windowStartDate || new Date(),
    daysCount: params.daysCount ?? 21,
    filterClassId: params.vehicleClassId,
    filterBranchId: params.branchId,
  })
}

// ── C) Müşteri & Sürücü Kaydı (KVKK Maskeleme + Erişim Loglama) ──────────────

export async function listRentalCustomers(params: {
  scope: TourismScopeContext
  branchId?: string
  search?: string
  revealSensitivePii?: boolean
}) {
  const dbAny = prisma as any
  const canViewPii = await canUserViewRenterKvkkPii(params.scope)

  if (params.revealSensitivePii && !canViewPii) {
    await logTourismAudit({
      userId: params.scope.userId,
      action: "KVKK_PII_DENIED",
      resource: "turizm_rentacar",
      moduleKey: "turizm_rentacar",
      branchId: params.scope.branchId,
      companyId: params.scope.effectiveCompanyId,
      metadata: { reason: "INSUFFICIENT_PRIVILEGE_FOR_RENTER_PII" },
    })
    throw new TourismDomainError(
      "FORBIDDEN_COMPANY_SCOPE",
      "Kiracı kimlik, pasaport ve ehliyet KVKK verilerini açık görüntüleme yetkiniz yok.",
      403
    )
  }

  const shouldUnmask = Boolean(params.revealSensitivePii && canViewPii)
  if (shouldUnmask) {
    await logTourismAudit({
      userId: params.scope.userId,
      action: "KVKK_PII_REVEALED",
      resource: "turizm_rentacar",
      moduleKey: "turizm_rentacar",
      branchId: params.scope.branchId,
      companyId: params.scope.effectiveCompanyId,
      metadata: { entity: "Customer" },
    })
  }

  let customers = await dbAny.customer.findMany()
  customers = filterRecordsByCompanyScope(customers, params.scope)

  if (params.branchId) {
    customers = customers.filter((c: any) => c.branchId === params.branchId)
  }
  if (params.search) {
    const q = params.search.trim().toLowerCase()
    customers = customers.filter(
      (c: any) =>
        String(c.name || "").toLowerCase().includes(q) ||
        String(c.company || "").toLowerCase().includes(q) ||
        String(c.email || "").toLowerCase().includes(q) ||
        String(c.phone || "").toLowerCase().includes(q)
    )
  }

  return {
    canViewPii,
    isUnmasked: shouldUnmask,
    customers: customers.map((c: any) => applyCustomerKvkkMasking(c, shouldUnmask).customer),
  }
}

export async function upsertRentalCustomer(
  input: Record<string, any>,
  scope: TourismScopeContext
) {
  const dbAny = prisma as any
  const name = String(input.name || "").trim()
  if (!name) {
    throw new TourismDomainError("VALIDATION_ERROR", "Müşteri / sürücü ad soyad alanı zorunludur.", 400)
  }

  const all = await dbAny.customer.findMany()
  const existing = input.id ? all.find((c: any) => c.id === input.id) : null

  const payload = {
    branchId: input.branchId || existing?.branchId || scope.branchId || "local-debug-branch",
    name,
    company: input.company !== undefined ? input.company : existing?.company ?? null,
    email: input.email !== undefined ? input.email : existing?.email ?? null,
    phone: input.phone !== undefined ? input.phone : existing?.phone ?? null,
    address: input.address !== undefined ? input.address : existing?.address ?? null,
    status: input.status || existing?.status || "active",
    segment: input.segment || existing?.segment || "Rent-a-Car",
    tckn: input.tckn !== undefined ? input.tckn : existing?.tckn ?? null,
    passportNo: input.passportNo !== undefined ? input.passportNo : existing?.passportNo ?? null,
    nationality: String(input.nationality || existing?.nationality || "TR").toUpperCase(),
    birthDate: input.birthDate ? new Date(input.birthDate) : existing?.birthDate ?? null,
    driverLicenseNo:
      input.driverLicenseNo !== undefined ? input.driverLicenseNo : existing?.driverLicenseNo ?? null,
    driverLicenseClass: String(
      input.driverLicenseClass || existing?.driverLicenseClass || "B"
    ).toUpperCase(),
    driverLicenseIssuedAt: input.driverLicenseIssuedAt
      ? new Date(input.driverLicenseIssuedAt)
      : existing?.driverLicenseIssuedAt ?? null,
    driverLicenseExpiresAt: input.driverLicenseExpiresAt
      ? new Date(input.driverLicenseExpiresAt)
      : existing?.driverLicenseExpiresAt ?? null,
    isBlacklisted:
      input.isBlacklisted !== undefined
        ? Boolean(input.isBlacklisted)
        : existing?.isBlacklisted ?? false,
    blacklistReason:
      input.blacklistReason !== undefined ? input.blacklistReason : existing?.blacklistReason ?? null,
    ownerCompanyId: existing?.ownerCompanyId || scope.effectiveCompanyId || MAIN_COMPANY_ID,
    updatedAt: new Date(),
  }

  const saved = existing
    ? await dbAny.customer.update({ where: { id: existing.id }, data: payload })
    : await dbAny.customer.create({
      data: {
        id: input.id || `trzm-rnt-cust-${Date.now().toString(36)}`,
        ...payload,
        createdAt: new Date(),
      },
    })

  await logTourismAudit({
    userId: scope.userId,
    action: existing ? "UPDATE_RENTAL_CUSTOMER" : "CREATE_RENTAL_CUSTOMER",
    resource: "turizm_rentacar",
    resourceId: saved.id,
    moduleKey: "turizm_rentacar",
    branchId: scope.branchId,
    companyId: scope.effectiveCompanyId,
    metadata: { customerName: saved.name, isBlacklisted: saved.isBlacklisted },
  })

  return applyCustomerKvkkMasking(saved, false).customer
}

// ── D) Rezervasyon, Atomik Çift Rezervasyon & Bakım Çakışma Kilidi ────────────

async function assertVehicleAvailableForWindow(params: {
  vehicle: any
  startAt: Date
  endAt: Date
  excludeReservationId?: string
  customerId?: string
  actorUserId: string
  ownerCompanyId: string
}) {
  const dbAny = prisma as any
  const { vehicle, startAt, endAt } = params

  // 1. Araç şu an Bakımda / Arızalı / Servis Dışı ise kiralanamaz
  if (
    vehicle.status === "MAINTENANCE" ||
    vehicle.status === "FAULT" ||
    vehicle.status === "OUT_OF_SERVICE" ||
    vehicle.rentalStatus === "MAINTENANCE"
  ) {
    const msg = `${vehicle.plate} plakalı araç şu anda '${vehicle.status}' (Bakımda/Arızalı) durumunda olduğu için kiralanamaz.`
    await dbAny.turizmRentConflictAttemptLog.create({
      data: {
        id: `trzm-rnt-cnf-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        vehicleId: vehicle.id,
        vehiclePlate: vehicle.plate,
        attemptedStartAt: startAt,
        attemptedEndAt: endAt,
        conflictingSourceType: "VEHICLE_STATUS_MAINTENANCE",
        conflictingSourceId: vehicle.id,
        conflictingRefNo: vehicle.code || vehicle.plate,
        customerId: params.customerId || null,
        rejectionCode: "VEHICLE_IN_MAINTENANCE",
        rejectionMessage: msg,
        actorUserId: params.actorUserId,
        ownerCompanyId: params.ownerCompanyId,
        attemptedAt: new Date(),
      },
    })
    throw new TourismDomainError("CONFLICT", msg, 409, {
      rejectionCode: "VEHICLE_IN_MAINTENANCE",
      vehicleId: vehicle.id,
      plate: vehicle.plate,
    })
  }

  // 2. Seçilen tarih aralığında aktif/planlı Bakım İş Emri (LojistikVehicleMaintenanceWorkOrder) çakışması
  const workOrders = await dbAny.lojistikVehicleMaintenanceWorkOrder
    .findMany({ where: { vehicleId: vehicle.id } })
    .catch(() => [])
  const overlappingWo = workOrders.find((wo: any) => {
    if (wo.status !== "IN_PROGRESS" && wo.status !== "SCHEDULED") return false
    const woStart = wo.startedAt || wo.plannedDate || wo.createdAt
    if (!woStart) return false
    const woEnd =
      wo.completedAt ||
      new Date(
        new Date(woStart).getTime() +
        Math.max(24, Number(wo.downtimeMinutes || 1440) / 60) * 3_600_000
      )
    return doTimeIntervalsOverlap(startAt, endAt, woStart, woEnd)
  })

  if (overlappingWo) {
    const msg = `${vehicle.plate} plakalı aracın seçilen tarih aralığında planlı bakım iş emri (${overlappingWo.workOrderNumber}) bulunduğundan kiralanamaz.`
    await dbAny.turizmRentConflictAttemptLog.create({
      data: {
        id: `trzm-rnt-cnf-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        vehicleId: vehicle.id,
        vehiclePlate: vehicle.plate,
        attemptedStartAt: startAt,
        attemptedEndAt: endAt,
        conflictingSourceType: "MAINTENANCE_WORK_ORDER",
        conflictingSourceId: overlappingWo.id,
        conflictingRefNo: overlappingWo.workOrderNumber,
        customerId: params.customerId || null,
        rejectionCode: "VEHICLE_IN_MAINTENANCE",
        rejectionMessage: msg,
        actorUserId: params.actorUserId,
        ownerCompanyId: params.ownerCompanyId,
        attemptedAt: new Date(),
      },
    })
    throw new TourismDomainError("CONFLICT", msg, 409, {
      rejectionCode: "VEHICLE_IN_MAINTENANCE",
      conflictingWorkOrderNo: overlappingWo.workOrderNumber,
    })
  }

  // 3. Aynı araç için mevcut PENDING / CONFIRMED / ACTIVE rezervasyon çakışması
  const existingReservations = await dbAny.turizmRentReservation.findMany({
    where: { vehicleId: vehicle.id },
  })

  const conflictingRes = existingReservations.find((r: any) => {
    if (params.excludeReservationId && r.id === params.excludeReservationId) return false
    if (r.status !== "PENDING" && r.status !== "CONFIRMED" && r.status !== "ACTIVE") {
      return false
    }
    return doTimeIntervalsOverlap(startAt, endAt, r.startAt, r.endAt)
  })

  if (conflictingRes) {
    const msg = `Çift rezervasyon engellendi: ${vehicle.plate} plakalı araç ${new Date(
      conflictingRes.startAt
    )
      .toISOString()
      .slice(0, 10)} – ${new Date(conflictingRes.endAt)
        .toISOString()
        .slice(0, 10)} aralığında '${conflictingRes.reservationNo}' numaralı rezervasyon ile dolu.`

    await dbAny.turizmRentConflictAttemptLog.create({
      data: {
        id: `trzm-rnt-cnf-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        vehicleId: vehicle.id,
        vehiclePlate: vehicle.plate,
        attemptedStartAt: startAt,
        attemptedEndAt: endAt,
        conflictingSourceType: "RESERVATION",
        conflictingSourceId: conflictingRes.id,
        conflictingRefNo: conflictingRes.reservationNo,
        customerId: params.customerId || null,
        rejectionCode: "DOUBLE_BOOKING_LOCKED",
        rejectionMessage: msg,
        actorUserId: params.actorUserId,
        ownerCompanyId: params.ownerCompanyId,
        attemptedAt: new Date(),
      },
    })

    throw new TourismDomainError("CONFLICT", msg, 409, {
      rejectionCode: "DOUBLE_BOOKING_LOCKED",
      conflictingReservationId: conflictingRes.id,
      conflictingReservationNo: conflictingRes.reservationNo,
    })
  }
}

export async function createRentReservation(
  input: Record<string, any>,
  scope: TourismScopeContext
) {
  const vehicleId = String(input.vehicleId || "").trim()
  const customerId = String(input.customerId || "").trim()
  if (!vehicleId || !customerId) {
    throw new TourismDomainError(
      "VALIDATION_ERROR",
      "Rezervasyon için araç ve müşteri seçimi zorunludur.",
      400
    )
  }

  const startAt = new Date(input.startAt)
  const endAt = new Date(input.endAt)
  if (Number.isNaN(startAt.getTime()) || Number.isNaN(endAt.getTime()) || endAt <= startAt) {
    throw new TourismDomainError(
      "VALIDATION_ERROR",
      "Geçerli bir alış ve iade tarih/saat aralığı giriniz (iade zamanı alıştan sonra olmalıdır).",
      400
    )
  }

  return await withVehicleReservationLock(vehicleId, async () => {
    const dbAny = prisma as any
    const [vehicle, customer, policy] = await Promise.all([
      dbAny.lojistikVehicle.findUnique({ where: { id: vehicleId } }),
      dbAny.customer.findUnique({ where: { id: customerId } }),
      getRentPolicyConfig(input.branchId || scope.branchId),
    ])

    if (!vehicle) {
      throw new TourismDomainError("NOT_FOUND", "Seçilen araç bulunamadı.", 404)
    }
    if (!customer) {
      throw new TourismDomainError("NOT_FOUND", "Seçilen müşteri kaydı bulunamadı.", 404)
    }

    const vehicleClassId = String(
      input.vehicleClassId || vehicle.rentalClassId || "trzm-rnt-cls-sedan"
    )
    const vehicleClass = await dbAny.turizmRentVehicleClass
      .findUnique({ where: { id: vehicleClassId } })
      .catch(() => null)

    // Sürücü yaş, ehliyet yılı, ehliyet geçerlilik ve kara liste kontrolü
    const eligibility = evaluateRenterEligibility({
      birthDate: customer.birthDate,
      driverLicenseIssuedAt: customer.driverLicenseIssuedAt,
      driverLicenseExpiresAt: customer.driverLicenseExpiresAt,
      isBlacklisted: customer.isBlacklisted,
      blacklistReason: customer.blacklistReason,
      rentalStartAt: startAt,
      rentalEndAt: endAt,
      minDriverAge: Number(vehicleClass?.minDriverAge ?? policy.minDriverAgeDefault ?? 21),
      minLicenseYears: Number(
        vehicleClass?.minLicenseYears ?? policy.minLicenseYearsDefault ?? 2
      ),
    })

    if (!eligibility.eligible && input.bypassEligibilityCheck !== true) {
      throw new TourismDomainError(
        "VALIDATION_ERROR",
        `Sürücü uygunluk kuralı engeli: ${eligibility.violations.join(" ")}`,
        400,
        { violations: eligibility.violations }
      )
    }

    // Atomik çift rezervasyon ve bakım çakışma kontrolü
    await assertVehicleAvailableForWindow({
      vehicle,
      startAt,
      endAt,
      customerId: customer.id,
      actorUserId: scope.userId,
      ownerCompanyId: scope.effectiveCompanyId || MAIN_COMPANY_ID,
    })

    // Tarife çözümleme
    let tariff = null
    if (input.tariffId) {
      tariff = await dbAny.turizmRentTariff.findUnique({ where: { id: input.tariffId } })
    }
    if (!tariff) {
      const classTariffs = await dbAny.turizmRentTariff.findMany({
        where: { vehicleClassId },
      })
      tariff = classTariffs.find((t: any) => t.isActive !== false) || classTariffs[0] || null
    }

    // Seçilen ek hizmetleri çözümle
    const allExtras = await dbAny.turizmRentExtraService.findMany()
    const extrasById = new Map<string, any>(allExtras.map((e: any) => [e.id, e]))
    const selectedExtras: SelectedExtraServiceInput[] = []

    if (Array.isArray(input.selectedExtraIds)) {
      for (const exId of input.selectedExtraIds) {
        const found = extrasById.get(String(exId))
        if (found) {
          selectedExtras.push({
            serviceId: found.id,
            code: found.code,
            name: found.name,
            pricingType: found.pricingType,
            unitPriceTry: found.unitPriceTry,
            quantity: 1,
          })
        }
      }
    } else if (Array.isArray(input.selectedExtras)) {
      selectedExtras.push(...input.selectedExtras)
    }

    const pricing = calculateRentalPricing({
      startAt,
      endAt,
      dailyRateTry: Number(input.dailyRateTry ?? tariff?.dailyRateTry ?? 2200),
      weeklyDailyRateTry: tariff?.weeklyDailyRateTry ?? null,
      monthlyDailyRateTry: tariff?.monthlyDailyRateTry ?? null,
      dailyKmLimit: Number(
        input.dailyKmLimit ?? tariff?.dailyKmLimit ?? vehicleClass?.dailyKmLimit ?? 250
      ),
      extraKmRateTry: Number(
        input.extraKmRateTry ??
        tariff?.extraKmRateTry ??
        vehicleClass?.extraKmUnitPriceTry ??
        6.5
      ),
      depositAmountTry: Number(
        input.depositRequiredTry ??
        tariff?.depositAmountTry ??
        vehicleClass?.defaultDepositTry ??
        5000
      ),
      selectedExtras,
      discountAmountTry: Number(input.discountAmountTry || 0),
    })

    const reservationNo =
      String(input.reservationNo || "").trim().toUpperCase() ||
      `RNT-2026-${String(Date.now()).slice(-5)}-${Math.random().toString(36).slice(2, 4).toUpperCase()}`

    const status = String(input.status || "CONFIRMED").toUpperCase()
    const lockKey = `${vehicle.id}:${startAt.toISOString()}:${endAt.toISOString()}`

    const created = await dbAny.turizmRentReservation.create({
      data: {
        id: input.id || `trzm-rnt-res-${Date.now()}-${Math.random().toString(36).slice(2, 5)}`,
        reservationNo,
        branchId: input.branchId || vehicle.branchId || scope.branchId || "local-debug-branch",
        pickupBranchId:
          input.pickupBranchId || input.branchId || vehicle.branchId || "local-debug-branch",
        returnBranchId:
          input.returnBranchId || input.branchId || vehicle.branchId || "local-debug-branch",
        pickupLocationLabel: input.pickupLocationLabel || "Merkez Kiralama Ofisi",
        returnLocationLabel: input.returnLocationLabel || "Merkez Kiralama Ofisi",
        vehicleId: vehicle.id,
        vehicleClassId,
        tariffId: tariff?.id || null,
        customerId: customer.id,
        additionalDriverName: input.additionalDriverName || null,
        additionalDriverTckn: input.additionalDriverTckn || null,
        additionalDriverLicenseNo: input.additionalDriverLicenseNo || null,
        additionalDriverLicenseClass: input.additionalDriverLicenseClass || null,
        additionalDriverLicenseExpiresAt: input.additionalDriverLicenseExpiresAt
          ? new Date(input.additionalDriverLicenseExpiresAt)
          : null,
        withChauffeur: Boolean(input.withChauffeur),
        chauffeurDriverId: input.chauffeurDriverId || null,
        startAt,
        endAt,
        originalEndAt: endAt,
        rentalDays: pricing.rentalDays,
        status,
        dailyRateTry: pricing.appliedDailyRateTry,
        baseRentalAmountTry: pricing.baseRentalAmountTry,
        extrasTotalTry: pricing.extrasTotalTry,
        discountAmountTry: pricing.discountAmountTry,
        totalEstimatedTry: pricing.totalEstimatedTry,
        finalTotalTry: pricing.totalEstimatedTry,
        depositRequiredTry: pricing.depositRequiredTry,
        dailyKmLimit: pricing.dailyKmLimit,
        totalKmLimit: pricing.totalKmLimit,
        extraKmRateTry: pricing.extraKmRateTry,
        extrasJson: JSON.stringify(pricing.extrasBreakdown),
        extensionCount: 0,
        conflictLockKey: lockKey,
        notes: input.notes || null,
        ownerCompanyId: scope.effectiveCompanyId || MAIN_COMPANY_ID,
        createdBy: scope.userId,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    })

    // Araç durumunu rezervasyon durumuna göre senkronla
    if (status === "ACTIVE") {
      await dbAny.lojistikVehicle.update({
        where: { id: vehicle.id },
        data: { status: "IN_TRANSIT", rentalStatus: "RENTED", isRentalPool: true },
      })
    } else if (status === "CONFIRMED" && vehicle.rentalStatus !== "RENTED") {
      await dbAny.lojistikVehicle.update({
        where: { id: vehicle.id },
        data: { rentalStatus: "RESERVED", isRentalPool: true },
      })
    }

    await logTourismAudit({
      userId: scope.userId,
      action: "CREATE_RENT_RESERVATION",
      resource: "turizm_rentacar",
      resourceId: created.id,
      moduleKey: "turizm_rentacar",
      branchId: scope.branchId,
      companyId: scope.effectiveCompanyId,
      metadata: {
        reservationNo: created.reservationNo,
        plate: vehicle.plate,
        startAt: startAt.toISOString(),
        endAt: endAt.toISOString(),
        totalEstimatedTry: created.totalEstimatedTry,
      },
    })

    return created
  })
}

export async function extendRentReservation(
  input: { reservationId: string; newEndAt: string | Date; notes?: string },
  scope: TourismScopeContext
) {
  const dbAny = prisma as any
  const reservation = await dbAny.turizmRentReservation.findUnique({
    where: { id: input.reservationId },
  })
  if (!reservation) {
    throw new TourismDomainError("NOT_FOUND", "Uzatılacak rezervasyon bulunamadı.", 404)
  }
  if (reservation.status === "CANCELLED" || reservation.status === "COMPLETED") {
    throw new TourismDomainError(
      "VALIDATION_ERROR",
      "İptal edilmiş veya tamamlanmış rezervasyon uzatılamaz.",
      400
    )
  }

  const newEndAt = new Date(input.newEndAt)
  const currentEndAt = new Date(reservation.endAt)
  if (Number.isNaN(newEndAt.getTime()) || newEndAt <= currentEndAt) {
    throw new TourismDomainError(
      "VALIDATION_ERROR",
      "Yeni iade tarihi mevcut iade tarihinden sonra olmalıdır.",
      400
    )
  }

  return await withVehicleReservationLock(reservation.vehicleId, async () => {
    const vehicle = await dbAny.lojistikVehicle.findUnique({
      where: { id: reservation.vehicleId },
    })

    await assertVehicleAvailableForWindow({
      vehicle,
      startAt: new Date(reservation.startAt),
      endAt: newEndAt,
      excludeReservationId: reservation.id,
      customerId: reservation.customerId,
      actorUserId: scope.userId,
      ownerCompanyId: scope.effectiveCompanyId || MAIN_COMPANY_ID,
    })

    let parsedExtras: SelectedExtraServiceInput[] = []
    try {
      parsedExtras = reservation.extrasJson ? JSON.parse(reservation.extrasJson) : []
    } catch {
      parsedExtras = []
    }

    const pricing = calculateRentalPricing({
      startAt: reservation.startAt,
      endAt: newEndAt,
      dailyRateTry: reservation.dailyRateTry,
      dailyKmLimit: reservation.dailyKmLimit,
      extraKmRateTry: reservation.extraKmRateTry,
      depositAmountTry: reservation.depositRequiredTry,
      selectedExtras: parsedExtras,
      discountAmountTry: reservation.discountAmountTry,
    })

    const updated = await dbAny.turizmRentReservation.update({
      where: { id: reservation.id },
      data: {
        endAt: newEndAt,
        rentalDays: pricing.rentalDays,
        baseRentalAmountTry: pricing.baseRentalAmountTry,
        extrasTotalTry: pricing.extrasTotalTry,
        totalEstimatedTry: pricing.totalEstimatedTry,
        finalTotalTry: pricing.totalEstimatedTry,
        totalKmLimit: pricing.totalKmLimit,
        extensionCount: Number(reservation.extensionCount || 0) + 1,
        notes: input.notes
          ? `${reservation.notes ? `${reservation.notes} | ` : ""}Uzatma: ${input.notes}`
          : reservation.notes,
        updatedAt: new Date(),
      },
    })

    // Varsa bağlı sözleşmenin bitiş tarihini ve tutarını da güncelle
    const contract = await dbAny.turizmRentContract
      .findUnique({ where: { reservationId: reservation.id } })
      .catch(() => null)
    if (contract) {
      await dbAny.turizmRentContract.update({
        where: { id: contract.id },
        data: {
          endAt: newEndAt,
          agreedTotalTry: pricing.totalEstimatedTry,
          totalKmLimit: pricing.totalKmLimit,
          updatedAt: new Date(),
        },
      })
    }

    await logTourismAudit({
      userId: scope.userId,
      action: "EXTEND_RENT_RESERVATION",
      resource: "turizm_rentacar",
      resourceId: updated.id,
      moduleKey: "turizm_rentacar",
      branchId: scope.branchId,
      companyId: scope.effectiveCompanyId,
      metadata: {
        reservationNo: updated.reservationNo,
        previousEndAt: currentEndAt.toISOString(),
        newEndAt: newEndAt.toISOString(),
        extensionCount: updated.extensionCount,
      },
    })

    return updated
  })
}

export async function swapReservationVehicle(
  input: { reservationId: string; newVehicleId: string; swapReason: string },
  scope: TourismScopeContext
) {
  const dbAny = prisma as any
  const reservation = await dbAny.turizmRentReservation.findUnique({
    where: { id: input.reservationId },
  })
  if (!reservation) {
    throw new TourismDomainError("NOT_FOUND", "Araç değiştirilecek rezervasyon bulunamadı.", 404)
  }
  if (reservation.vehicleId === input.newVehicleId) {
    throw new TourismDomainError("VALIDATION_ERROR", "Yeni araç mevcut araçla aynı olamaz.", 400)
  }

  return await withVehicleReservationLock(input.newVehicleId, async () => {
    const newVehicle = await dbAny.lojistikVehicle.findUnique({
      where: { id: input.newVehicleId },
    })
    if (!newVehicle) {
      throw new TourismDomainError("NOT_FOUND", "Yeni atanacak araç bulunamadı.", 404)
    }

    await assertVehicleAvailableForWindow({
      vehicle: newVehicle,
      startAt: new Date(reservation.startAt),
      endAt: new Date(reservation.endAt),
      excludeReservationId: reservation.id,
      customerId: reservation.customerId,
      actorUserId: scope.userId,
      ownerCompanyId: scope.effectiveCompanyId || MAIN_COMPANY_ID,
    })

    const oldVehicleId = reservation.vehicleId
    const updated = await dbAny.turizmRentReservation.update({
      where: { id: reservation.id },
      data: {
        vehicleId: newVehicle.id,
        vehicleClassId: newVehicle.rentalClassId || reservation.vehicleClassId,
        swappedFromVehicleId: oldVehicleId,
        swapReason: input.swapReason || "Operasyonel ikame / araç değişimi",
        updatedAt: new Date(),
      },
    })

    // Eski aracın durumunu serbest bırak (eğer bakımda değilse)
    const oldVehicle = await dbAny.lojistikVehicle
      .findUnique({ where: { id: oldVehicleId } })
      .catch(() => null)
    if (
      oldVehicle &&
      oldVehicle.status !== "MAINTENANCE" &&
      oldVehicle.status !== "FAULT"
    ) {
      await dbAny.lojistikVehicle.update({
        where: { id: oldVehicle.id },
        data: { status: "ACTIVE", rentalStatus: "AVAILABLE" },
      })
    }

    // Yeni aracın durumunu rezervasyon durumuna göre senkronla
    if (reservation.status === "ACTIVE") {
      await dbAny.lojistikVehicle.update({
        where: { id: newVehicle.id },
        data: { status: "IN_TRANSIT", rentalStatus: "RENTED", isRentalPool: true },
      })
    } else if (reservation.status === "CONFIRMED") {
      await dbAny.lojistikVehicle.update({
        where: { id: newVehicle.id },
        data: { rentalStatus: "RESERVED", isRentalPool: true },
      })
    }

    // Sözleşmedeki vehicleId'yi de güncelle
    const contract = await dbAny.turizmRentContract
      .findUnique({ where: { reservationId: reservation.id } })
      .catch(() => null)
    if (contract) {
      await dbAny.turizmRentContract.update({
        where: { id: contract.id },
        data: { vehicleId: newVehicle.id, updatedAt: new Date() },
      })
    }

    await logTourismAudit({
      userId: scope.userId,
      action: "SWAP_RESERVATION_VEHICLE",
      resource: "turizm_rentacar",
      resourceId: updated.id,
      moduleKey: "turizm_rentacar",
      branchId: scope.branchId,
      companyId: scope.effectiveCompanyId,
      metadata: {
        reservationNo: updated.reservationNo,
        oldVehicleId,
        newVehicleId: newVehicle.id,
        newPlate: newVehicle.plate,
        swapReason: updated.swapReason,
      },
    })

    return updated
  })
}

export async function updateRentReservationStatus(
  input: {
    reservationId: string
    status: "PENDING" | "CONFIRMED" | "ACTIVE" | "COMPLETED" | "CANCELLED" | "NO_SHOW"
    cancelReason?: string
  },
  scope: TourismScopeContext
) {
  const dbAny = prisma as any
  const reservation = await dbAny.turizmRentReservation.findUnique({
    where: { id: input.reservationId },
  })
  if (!reservation) {
    throw new TourismDomainError("NOT_FOUND", "Rezervasyon bulunamadı.", 404)
  }

  const nextStatus = String(input.status).toUpperCase()
  const updated = await dbAny.turizmRentReservation.update({
    where: { id: reservation.id },
    data: {
      status: nextStatus,
      cancelReason:
        nextStatus === "CANCELLED" || nextStatus === "NO_SHOW"
          ? input.cancelReason || "Müşteri talebi / iptal"
          : reservation.cancelReason,
      updatedAt: new Date(),
    },
  })

  // Filo araç durumu senkronizasyonu
  const vehicle = await dbAny.lojistikVehicle
    .findUnique({ where: { id: reservation.vehicleId } })
    .catch(() => null)
  if (vehicle) {
    if (nextStatus === "ACTIVE") {
      await dbAny.lojistikVehicle.update({
        where: { id: vehicle.id },
        data: { status: "IN_TRANSIT", rentalStatus: "RENTED" },
      })
    } else if (
      (nextStatus === "CANCELLED" || nextStatus === "NO_SHOW" || nextStatus === "COMPLETED") &&
      vehicle.status !== "MAINTENANCE" &&
      vehicle.status !== "FAULT"
    ) {
      await dbAny.lojistikVehicle.update({
        where: { id: vehicle.id },
        data: { status: "ACTIVE", rentalStatus: "AVAILABLE" },
      })
    }
  }

  await logTourismAudit({
    userId: scope.userId,
    action: "UPDATE_RENT_RESERVATION_STATUS",
    resource: "turizm_rentacar",
    resourceId: updated.id,
    moduleKey: "turizm_rentacar",
    branchId: scope.branchId,
    companyId: scope.effectiveCompanyId,
    metadata: { reservationNo: updated.reservationNo, status: nextStatus },
  })

  return updated
}

// ── E) Kiralama Sözleşmesi Üretimi ve Dijital İmza ───────────────────────────

export function renderContractTemplateText(params: {
  templateText: string
  companyName: string
  customerName: string
  vehiclePlate: string
  vehicleBrandModel: string
  startDate: string
  endDate: string
  rentalDays: number
  dailyKmLimit: number
  totalKmLimit: number
  extraKmRateTry: number
  dailyRateTry: number
  totalAmountTry: number
  depositAmountTry: number
  deliveryFuelPct: number
}): string {
  const replacements: Record<string, string> = {
    "{{COMPANY_NAME}}": params.companyName,
    "{{CUSTOMER_NAME}}": params.customerName,
    "{{VEHICLE_PLATE}}": params.vehiclePlate,
    "{{VEHICLE_BRAND_MODEL}}": params.vehicleBrandModel,
    "{{START_DATE}}": params.startDate,
    "{{END_DATE}}": params.endDate,
    "{{RENTAL_DAYS}}": String(params.rentalDays),
    "{{DAILY_KM_LIMIT}}": String(params.dailyKmLimit),
    "{{TOTAL_KM_LIMIT}}": String(params.totalKmLimit),
    "{{EXTRA_KM_RATE}}": params.extraKmRateTry.toLocaleString("tr-TR"),
    "{{DAILY_RATE}}": params.dailyRateTry.toLocaleString("tr-TR"),
    "{{TOTAL_AMOUNT}}": params.totalAmountTry.toLocaleString("tr-TR"),
    "{{DEPOSIT_AMOUNT}}": params.depositAmountTry.toLocaleString("tr-TR"),
    "{{DELIVERY_FUEL_PCT}}": String(params.deliveryFuelPct),
  }

  let rendered = params.templateText || DEFAULT_SAMPLE_CONTRACT_TEMPLATE_TEXT
  for (const [placeholder, val] of Object.entries(replacements)) {
    rendered = rendered.split(placeholder).join(val)
  }
  return rendered
}

export async function generateOrSignRentContract(
  input: {
    reservationId: string
    customerSignatureDataUrl?: string | null
    customerSignedByName?: string | null
    staffSignedByName?: string | null
  },
  scope: TourismScopeContext
) {
  const dbAny = prisma as any
  const reservation = await dbAny.turizmRentReservation.findUnique({
    where: { id: input.reservationId },
    include: { vehicle: true, customer: true },
  })
  if (!reservation) {
    throw new TourismDomainError("NOT_FOUND", "Sözleşme üretilecek rezervasyon bulunamadı.", 404)
  }

  const vehicle =
    reservation.vehicle ||
    (await dbAny.lojistikVehicle.findUnique({ where: { id: reservation.vehicleId } }))
  const customer =
    reservation.customer ||
    (await dbAny.customer.findUnique({ where: { id: reservation.customerId } }))
  const policy = await getRentPolicyConfig(reservation.branchId)

  const renderedTermsText = renderContractTemplateText({
    templateText: policy.contractTemplateBodyText,
    companyName: "Sunum ERP Araç Kiralama Operasyonu (Örnek Şablon)",
    customerName: customer?.name || customer?.company || "Kiracı Müşteri",
    vehiclePlate: vehicle?.plate || "-",
    vehicleBrandModel: vehicle ? `${vehicle.brand} ${vehicle.model} (${vehicle.modelYear})` : "-",
    startDate: new Date(reservation.startAt).toISOString().slice(0, 10),
    endDate: new Date(reservation.endAt).toISOString().slice(0, 10),
    rentalDays: Number(reservation.rentalDays || 1),
    dailyKmLimit: Number(reservation.dailyKmLimit || 250),
    totalKmLimit: Number(reservation.totalKmLimit || 250),
    extraKmRateTry: Number(reservation.extraKmRateTry || 6.5),
    dailyRateTry: Number(reservation.dailyRateTry || 0),
    totalAmountTry: Number(reservation.totalEstimatedTry || 0),
    depositAmountTry: Number(reservation.depositRequiredTry || 0),
    deliveryFuelPct: Number(vehicle?.currentFuelPct ?? 100),
  })

  const existing = await dbAny.turizmRentContract
    .findUnique({ where: { reservationId: reservation.id } })
    .catch(() => null)

  const hasSignature = Boolean(
    input.customerSignatureDataUrl || existing?.customerSignatureDataUrl
  )
  const nextStatus = hasSignature ? "SIGNED_ACTIVE" : "DRAFT"
  const now = new Date()

  let financeId = existing?.financeId || null
  let eDocumentId = existing?.eDocumentId || null
  let eDocumentNo = existing?.eDocumentNo || null

  // Faturalama zamanlaması ON_CONTRACT_APPROVAL ise sözleşme imzalandığında otomatik cari + E-Belge oluştur
  if (
    hasSignature &&
    !financeId &&
    policy.invoiceTimingMode === "ON_CONTRACT_APPROVAL" &&
    Number(reservation.totalEstimatedTry) > 0
  ) {
    const fin = await dbAny.finance.create({
      data: {
        branchId: reservation.branchId || scope.branchId || "local-debug-branch",
        type: "INCOME",
        amount: Number(reservation.totalEstimatedTry),
        category: "Araç Kiralama Geliri",
        description: `${vehicle?.plate || "Araç"} — Kiralama Sözleşmesi (${reservation.reservationNo})`,
        status: "approved",
        approvedBy: scope.userId,
        vehicleId: reservation.vehicleId,
        date: now,
      },
    })
    financeId = fin.id

    const edocProvider = new DemoDbEDocumentProvider()
    const edocRes = await edocProvider.submitEDocument({
      documentType: "E_FATURA",
      relatedOrderNo: reservation.reservationNo,
      receiverTitle: customer?.company || customer?.name || "Kiracı Müşteri",
      receiverVknTckn: customer?.tckn || "11111111111",
      vehiclePlate: vehicle?.plate || undefined,
      lines: [
        {
          sku: `KIRA-${vehicle?.plate || "ARAC"}`,
          name: `${vehicle?.plate || "Araç"} Kiralama Bedeli (${reservation.rentalDays} Gün)`,
          quantity: Number(reservation.rentalDays || 1),
          unit: "Gün",
          unitPrice: Number(reservation.dailyRateTry || reservation.totalEstimatedTry),
          vatRate: Number(policy.defaultVatRatePct || 20),
        },
      ],
    })
    eDocumentNo = edocRes.documentNo
    eDocumentId = edocRes.ettnUuid
  }

  const contractNo =
    existing?.contractNo ||
    `SZL-2026-${reservation.reservationNo.replace(/^RNT-\d+-/, "")}`

  const payload = {
    contractNo,
    reservationId: reservation.id,
    vehicleId: reservation.vehicleId,
    customerId: reservation.customerId,
    branchId: reservation.branchId || scope.branchId || "local-debug-branch",
    status: nextStatus,
    templateVersionLabel: "ÖRNEK ŞABLON v1.0 (Hukuki İnceleme Gerektirir)",
    renderedTermsText,
    startAt: new Date(reservation.startAt),
    endAt: new Date(reservation.endAt),
    agreedDailyRateTry: Number(reservation.dailyRateTry || 0),
    agreedTotalTry: Number(reservation.totalEstimatedTry || 0),
    depositAmountTry: Number(reservation.depositRequiredTry || 0),
    dailyKmLimit: Number(reservation.dailyKmLimit || 250),
    totalKmLimit: Number(reservation.totalKmLimit || 250),
    extraKmRateTry: Number(reservation.extraKmRateTry || 6.5),
    customerSignatureDataUrl:
      input.customerSignatureDataUrl ?? existing?.customerSignatureDataUrl ?? null,
    customerSignedByName:
      input.customerSignedByName ||
      existing?.customerSignedByName ||
      customer?.name ||
      null,
    customerSignedAt: hasSignature ? existing?.customerSignedAt || now : null,
    staffSignedByUserId: scope.userId,
    staffSignedByName: input.staffSignedByName || scope.username || "Operasyon Yetkilisi",
    staffSignedAt: now,
    financeId,
    eDocumentId,
    eDocumentNo,
    ownerCompanyId: scope.effectiveCompanyId || MAIN_COMPANY_ID,
    updatedAt: now,
  }

  const saved = existing
    ? await dbAny.turizmRentContract.update({ where: { id: existing.id }, data: payload })
    : await dbAny.turizmRentContract.create({
      data: {
        id: `trzm-rnt-cnt-${Date.now()}-${Math.random().toString(36).slice(2, 5)}`,
        ...payload,
        createdAt: now,
      },
    })

  await logTourismAudit({
    userId: scope.userId,
    action: existing ? "SIGN_OR_UPDATE_RENT_CONTRACT" : "GENERATE_RENT_CONTRACT",
    resource: "turizm_rentacar",
    resourceId: saved.id,
    moduleKey: "turizm_rentacar",
    branchId: scope.branchId,
    companyId: scope.effectiveCompanyId,
    metadata: {
      contractNo: saved.contractNo,
      reservationNo: reservation.reservationNo,
      status: saved.status,
      eDocumentNo: saved.eDocumentNo,
    },
  })

  return saved
}
