/**
 * Lojistik Faz 5 (lojistik_filo) — A & B Servisi:
 * - Araç Ana Verisi & Kiralama/Amortisman (LojistikVehicle, LojistikVehicleLease)
 * - Şoför Ana Verisi & KVKK Maskeleme + Erişim Loglama (LojistikDriver)
 * - Araç Belgeleri (Muayene, Trafik Sigortası, Kasko, MTV, Ruhsat, Frigo Kalibrasyon) & Trafik Cezaları
 * - Süre Dolum Uyarıları (Mevcut Notification altyapısı ile)
 */

import { prisma } from "@/lib/db"
import { checkPermission } from "@/lib/auth/server-permission"
import { createNotificationMany } from "@/lib/services/notificationService"
import {
  LogisticsDomainError,
  logLogisticsAudit,
} from "@/lib/logistics/security"
import type { LogisticsScopeContext } from "@/lib/logistics/types"
import {
  applyDriverKvkkMasking,
  evaluateExpiryStatus,
  FLEET_DOCUMENT_TYPE_LABELS,
  type FleetDocumentType,
} from "./constantsAndHelpers"

export async function canUserViewDriverKvkkPii(scope: LogisticsScopeContext): Promise<boolean> {
  if (scope.isSupplierScoped) return false
  if (scope.isSuperAdmin || scope.isPlatformDeveloper) return true
  const [hasHr, hasApprove] = await Promise.all([
    checkPermission(scope.userId, scope.branchId, "hr", "read").catch(() => false),
    checkPermission(scope.userId, scope.branchId, "lojistik_filo", "approve").catch(() => false),
  ])
  return Boolean(hasHr || hasApprove)
}

export async function listFleetVehicles(params?: {
  branchId?: string
  status?: string
  vehicleType?: string
  search?: string
}) {
  const dbAny = prisma as any
  const [vehicles, leases, drivers, docs, maps] = await Promise.all([
    dbAny.lojistikVehicle.findMany(),
    dbAny.lojistikVehicleLease.findMany().catch(() => []),
    dbAny.lojistikDriver.findMany().catch(() => []),
    dbAny.lojistikVehicleDocument.findMany().catch(() => []),
    dbAny.lojistikVehicleTelematicMap.findMany().catch(() => []),
  ])

  const driverById = new Map<string, any>(drivers.map((d: any) => [d.id, d]))
  const leaseByVehicle = new Map<string, any>()
  for (const l of leases) {
    if (l.isActive !== false) leaseByVehicle.set(l.vehicleId, l)
  }

  let filtered = vehicles.filter((v: any) => v.isActive !== false)
  if (params?.branchId) {
    filtered = filtered.filter((v: any) => v.branchId === params.branchId)
  }
  if (params?.status) {
    filtered = filtered.filter((v: any) => v.status === params.status)
  }
  if (params?.vehicleType) {
    filtered = filtered.filter((v: any) => v.vehicleType === params.vehicleType)
  }
  if (params?.search) {
    const q = params.search.trim().toLowerCase()
    filtered = filtered.filter(
      (v: any) =>
        String(v.plate || "").toLowerCase().includes(q) ||
        String(v.code || "").toLowerCase().includes(q) ||
        String(v.brand || "").toLowerCase().includes(q) ||
        String(v.model || "").toLowerCase().includes(q) ||
        String(v.vin || "").toLowerCase().includes(q)
    )
  }

  return filtered.map((v: any) => {
    const drv = v.assignedDriverId ? driverById.get(v.assignedDriverId) : null
    const vDocs = docs.filter((d: any) => d.vehicleId === v.id)
    const expAlerts = vDocs
      .map((d: any) => ({ ...d, evalRes: evaluateExpiryStatus(d.expiresAt, d.reminderDaysBefore || 30) }))
      .filter((d: any) => d.evalRes.status === "EXPIRED" || d.evalRes.status === "EXPIRING_SOON")

    const vMaps = maps.filter((m: any) => m.vehicleId === v.id && m.isActive !== false)
    return {
      ...v,
      activeLease: leaseByVehicle.get(v.id) || null,
      assignedDriverSummary: drv
        ? { id: drv.id, code: drv.code, fullName: drv.fullName, licenseClass: drv.licenseClass }
        : null,
      expiringDocumentCount: expAlerts.length,
      telematicMappings: vMaps,
    }
  })
}

export async function upsertFleetVehicle(
  input: Record<string, any>,
  actor: { userId: string; branchId?: string }
) {
  const dbAny = prisma as any
  const plate = String(input.plate || "").trim().toUpperCase()
  const brand = String(input.brand || "").trim()
  const model = String(input.model || "").trim()
  if (!plate || !brand || !model) {
    throw new LogisticsDomainError(
      "VALIDATION_ERROR",
      "Araç plakası, marka ve model alanları zorunludur.",
      400
    )
  }

  const allVehicles = await dbAny.lojistikVehicle.findMany()
  const existing = input.id ? allVehicles.find((v: any) => v.id === input.id) : null
  const dupPlate = allVehicles.find(
    (v: any) => String(v.plate).toUpperCase() === plate && v.id !== existing?.id
  )
  if (dupPlate) {
    throw new LogisticsDomainError("CONFLICT", `'${plate}' plakalı araç zaten kayıtlı.`, 409)
  }

  const vin = input.vin ? String(input.vin).trim().toUpperCase() : null
  if (vin) {
    const dupVin = allVehicles.find((v: any) => v.vin === vin && v.id !== existing?.id)
    if (dupVin) {
      throw new LogisticsDomainError("CONFLICT", `'${vin}' şasi numaralı araç zaten kayıtlı.`, 409)
    }
  }

  const code =
    String(input.code || existing?.code || `ARC-${plate.replace(/\s+/g, "-")}`).trim().toUpperCase()

  const payload = {
    code,
    plate,
    vin,
    brand,
    model,
    modelYear: Number(input.modelYear || existing?.modelYear || 2024),
    vehicleType: String(input.vehicleType || existing?.vehicleType || "PANEL_VAN").toUpperCase(),
    fuelType: String(input.fuelType || existing?.fuelType || "DIESEL").toUpperCase(),
    ownershipType: String(input.ownershipType || existing?.ownershipType || "OWNED").toUpperCase(),
    branchId: input.branchId || existing?.branchId || actor.branchId || "local-debug-branch",
    status: String(input.status || existing?.status || "ACTIVE").toUpperCase(),
    capacityKg: Number(input.capacityKg ?? existing?.capacityKg ?? 1500),
    capacityM3: Number(input.capacityM3 ?? existing?.capacityM3 ?? 10),
    palletSlots: Number(input.palletSlots ?? existing?.palletSlots ?? 4),
    isRefrigerated: Boolean(input.isRefrigerated ?? existing?.isRefrigerated ?? false),
    targetTempMinC:
      input.targetTempMinC !== undefined && input.targetTempMinC !== null && input.targetTempMinC !== ""
        ? Number(input.targetTempMinC)
        : existing?.targetTempMinC ?? null,
    targetTempMaxC:
      input.targetTempMaxC !== undefined && input.targetTempMaxC !== null && input.targetTempMaxC !== ""
        ? Number(input.targetTempMaxC)
        : existing?.targetTempMaxC ?? null,
    odometerKm: Math.max(0, Number(input.odometerKm ?? existing?.odometerKm ?? 0)),
    engineHours: Math.max(0, Number(input.engineHours ?? existing?.engineHours ?? 0)),
    expectedLPer100Km: Math.max(1, Number(input.expectedLPer100Km ?? existing?.expectedLPer100Km ?? 12)),
    tankCapacityLiters: Math.max(1, Number(input.tankCapacityLiters ?? existing?.tankCapacityLiters ?? 80)),
    acquisitionCostTry: Number(input.acquisitionCostTry ?? existing?.acquisitionCostTry ?? 0),
    monthlyDepreciationTry: Number(input.monthlyDepreciationTry ?? existing?.monthlyDepreciationTry ?? 0),
    assignedDriverId: input.assignedDriverId !== undefined ? (input.assignedDriverId || null) : existing?.assignedDriverId ?? null,
    notes: input.notes !== undefined ? input.notes : existing?.notes ?? null,
    isActive: true,
    updatedAt: new Date(),
  }

  const saved = existing
    ? await dbAny.lojistikVehicle.update({ where: { id: existing.id }, data: payload })
    : await dbAny.lojistikVehicle.create({
        data: {
          id: input.id || `veh-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
          ...payload,
          createdAt: new Date(),
        },
      })

  // Kiralık sözleşme bilgisi verilmişse kaydet/güncelle
  if ((payload.ownershipType === "LEASED" || payload.ownershipType === "RENTED") && input.lease?.contractNo) {
    const existingLease = await dbAny.lojistikVehicleLease
      .findFirst({ where: { vehicleId: saved.id, isActive: true } })
      .catch(() => null)
    const leasePayload = {
      vehicleId: saved.id,
      lessorName: String(input.lease.lessorName || "Filo Kiralama A.Ş.").trim(),
      contractNo: String(input.lease.contractNo).trim(),
      startDate: new Date(input.lease.startDate || new Date()),
      endDate: new Date(input.lease.endDate || new Date(Date.now() + 365 * 86_400_000)),
      monthlyCostTry: Number(input.lease.monthlyCostTry || 0),
      annualKmLimit: Number(input.lease.annualKmLimit || 50000),
      depreciationMonthlyTry: Number(input.lease.depreciationMonthlyTry || payload.monthlyDepreciationTry || 0),
      isActive: true,
      updatedAt: new Date(),
    }
    if (existingLease) {
      await dbAny.lojistikVehicleLease.update({ where: { id: existingLease.id }, data: leasePayload })
    } else {
      await dbAny.lojistikVehicleLease.create({
        data: { id: `lease-${Date.now()}-${Math.random().toString(36).slice(2, 5)}`, ...leasePayload, createdAt: new Date() },
      })
    }
  }

  await logLogisticsAudit({
    userId: actor.userId,
    action: existing ? "UPDATE_FLEET_VEHICLE" : "CREATE_FLEET_VEHICLE",
    resource: "lojistik_filo",
    resourceId: saved.id,
    moduleKey: "lojistik_filo",
    metadata: { plate: saved.plate, vehicleType: saved.vehicleType, status: saved.status },
  })

  return saved
}

export async function listFleetDrivers(params: {
  scope: LogisticsScopeContext
  branchId?: string
  status?: string
  revealSensitivePii?: boolean
}) {
  const dbAny = prisma as any
  const canViewPii = await canUserViewDriverKvkkPii(params.scope)

  if (params.revealSensitivePii && !canViewPii) {
    await logLogisticsAudit({
      userId: params.scope.userId,
      action: "KVKK_PII_DENIED",
      resource: "lojistik_filo",
      moduleKey: "lojistik_filo",
      metadata: { reason: "INSUFFICIENT_PRIVILEGE" },
    })
    throw new LogisticsDomainError(
      "FORBIDDEN",
      "Şoför KVKK kişisel verilerini açık görüntüleme yetkiniz yok.",
      403
    )
  }

  const shouldUnmask = Boolean(params.revealSensitivePii && canViewPii)
  let drivers = await dbAny.lojistikDriver.findMany()
  drivers = drivers.filter((d: any) => d.isActive !== false)
  if (params.branchId) {
    drivers = drivers.filter((d: any) => d.branchId === params.branchId)
  }
  if (params.status) {
    drivers = drivers.filter((d: any) => d.status === params.status)
  }

  if (shouldUnmask && drivers.length > 0) {
    await logLogisticsAudit({
      userId: params.scope.userId,
      action: "KVKK_PII_UNMASKED_READ",
      resource: "lojistik_filo",
      moduleKey: "lojistik_filo",
      metadata: { driverCount: drivers.length, fields: ["tckn", "phone", "licenseNumber", "srcNumber", "psychotechNumber", "homeAddress"] },
    })
  }

  return {
    canRevealKvkkPii: canViewPii,
    drivers: drivers.map((d: any) => {
      const masked = applyDriverKvkkMasking(d, shouldUnmask)
      const licenseEval = evaluateExpiryStatus(d.licenseExpiresAt, 30)
      const srcEval = evaluateExpiryStatus(d.srcExpiresAt, 30)
      const psychoEval = evaluateExpiryStatus(d.psychotechExpiresAt, 30)
      return {
        ...masked.driver,
        maskedFields: masked.maskedFields,
        compliance: {
          license: licenseEval,
          src: srcEval,
          psychotech: psychoEval,
          hasAlert:
            licenseEval.status === "EXPIRED" ||
            licenseEval.status === "EXPIRING_SOON" ||
            srcEval.status === "EXPIRED" ||
            srcEval.status === "EXPIRING_SOON" ||
            psychoEval.status === "EXPIRED" ||
            psychoEval.status === "EXPIRING_SOON",
        },
      }
    }),
  }
}

export async function getDriverDetailWithKvkkLog(
  driverId: string,
  scope: LogisticsScopeContext,
  revealSensitivePii = false
) {
  const dbAny = prisma as any
  const driver = await dbAny.lojistikDriver.findUnique({ where: { id: driverId } })
  if (!driver) {
    throw new LogisticsDomainError("NOT_FOUND", "Şoför kaydı bulunamadı.", 404)
  }

  const canViewPii = await canUserViewDriverKvkkPii(scope)
  if (revealSensitivePii && !canViewPii) {
    await logLogisticsAudit({
      userId: scope.userId,
      action: "KVKK_PII_DENIED",
      resource: "lojistik_filo",
      resourceId: driver.id,
      moduleKey: "lojistik_filo",
    })
    throw new LogisticsDomainError("FORBIDDEN", "KVKK açık kimlik/adres görüntüleme yetkiniz yok.", 403)
  }

  const unmasked = Boolean(revealSensitivePii && canViewPii)
  const res = applyDriverKvkkMasking(driver, unmasked)

  await logLogisticsAudit({
    userId: scope.userId,
    action: unmasked ? "KVKK_PII_UNMASKED_DETAIL" : "KVKK_PII_MASKED_VIEW",
    resource: "lojistik_filo",
    resourceId: driver.id,
    moduleKey: "lojistik_filo",
    metadata: { unmasked, maskedFields: res.maskedFields },
  })

  return res.driver
}

export async function upsertFleetDriver(
  input: Record<string, any>,
  actor: { userId: string; branchId?: string }
) {
  const dbAny = prisma as any
  const fullName = String(input.fullName || "").trim()
  if (!fullName) {
    throw new LogisticsDomainError("VALIDATION_ERROR", "Şoför ad soyad bilgisi zorunludur.", 400)
  }

  const allDrivers = await dbAny.lojistikDriver.findMany()
  const existing = input.id ? allDrivers.find((d: any) => d.id === input.id) : null
  const code = String(input.code || existing?.code || `SRF-${Date.now().toString().slice(-5)}`).trim().toUpperCase()

  const payload = {
    code,
    userId: input.userId !== undefined ? input.userId || null : existing?.userId ?? null,
    branchId: input.branchId || existing?.branchId || actor.branchId || "local-debug-branch",
    fullName,
    tckn: input.tckn !== undefined ? (input.tckn || null) : existing?.tckn ?? null,
    phone: input.phone !== undefined ? (input.phone || null) : existing?.phone ?? null,
    email: input.email !== undefined ? (input.email || null) : existing?.email ?? null,
    homeAddress: input.homeAddress !== undefined ? (input.homeAddress || null) : existing?.homeAddress ?? null,
    emergencyContact: input.emergencyContact !== undefined ? (input.emergencyContact || null) : existing?.emergencyContact ?? null,
    licenseClass: String(input.licenseClass || existing?.licenseClass || "B").toUpperCase(),
    licenseNumber: input.licenseNumber !== undefined ? (input.licenseNumber || null) : existing?.licenseNumber ?? null,
    licenseExpiresAt: input.licenseExpiresAt ? new Date(input.licenseExpiresAt) : existing?.licenseExpiresAt ?? null,
    srcType: input.srcType !== undefined ? (input.srcType || null) : existing?.srcType ?? "SRC-4",
    srcNumber: input.srcNumber !== undefined ? (input.srcNumber || null) : existing?.srcNumber ?? null,
    srcExpiresAt: input.srcExpiresAt ? new Date(input.srcExpiresAt) : existing?.srcExpiresAt ?? null,
    psychotechNumber: input.psychotechNumber !== undefined ? (input.psychotechNumber || null) : existing?.psychotechNumber ?? null,
    psychotechExpiresAt: input.psychotechExpiresAt ? new Date(input.psychotechExpiresAt) : existing?.psychotechExpiresAt ?? null,
    shiftName: String(input.shiftName || existing?.shiftName || "Gündüz Vardiyası"),
    shiftStart: String(input.shiftStart || existing?.shiftStart || "08:00"),
    shiftEnd: String(input.shiftEnd || existing?.shiftEnd || "17:30"),
    monthlySalaryCostTry: Number(input.monthlySalaryCostTry ?? existing?.monthlySalaryCostTry ?? 0),
    status: String(input.status || existing?.status || "AVAILABLE").toUpperCase(),
    notes: input.notes !== undefined ? input.notes : existing?.notes ?? null,
    isActive: true,
    updatedAt: new Date(),
  }

  const saved = existing
    ? await dbAny.lojistikDriver.update({ where: { id: existing.id }, data: payload })
    : await dbAny.lojistikDriver.create({
        data: {
          id: input.id || `drv-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
          ...payload,
          createdAt: new Date(),
        },
      })

  await logLogisticsAudit({
    userId: actor.userId,
    action: existing ? "UPDATE_FLEET_DRIVER" : "CREATE_FLEET_DRIVER",
    resource: "lojistik_filo",
    resourceId: saved.id,
    moduleKey: "lojistik_filo",
    metadata: { code: saved.code, licenseClass: saved.licenseClass },
  })

  return applyDriverKvkkMasking(saved, false).driver
}

export async function listFleetDocumentsAndPenalties(vehicleId?: string) {
  const dbAny = prisma as any
  const [docs, penalties, vehicles, drivers] = await Promise.all([
    dbAny.lojistikVehicleDocument.findMany(),
    dbAny.lojistikTrafficPenalty.findMany(),
    dbAny.lojistikVehicle.findMany(),
    dbAny.lojistikDriver.findMany(),
  ])

  const vehMap = new Map<string, any>(vehicles.map((v: any) => [v.id, v]))
  const drvMap = new Map<string, any>(drivers.map((d: any) => [d.id, d]))

  const filteredDocs = vehicleId ? docs.filter((d: any) => d.vehicleId === vehicleId) : docs
  const filteredPen = vehicleId ? penalties.filter((p: any) => p.vehicleId === vehicleId) : penalties

  return {
    documents: filteredDocs.map((d: any) => {
      const evalRes = evaluateExpiryStatus(d.expiresAt, d.reminderDaysBefore || 30)
      const veh = vehMap.get(d.vehicleId)
      return {
        ...d,
        plate: veh?.plate || "Bilinmeyen Araç",
        expiryStatus: evalRes.status,
        daysRemaining: evalRes.daysRemaining,
      }
    }),
    penalties: filteredPen.map((p: any) => {
      const veh = vehMap.get(p.vehicleId)
      const drv = p.driverId ? drvMap.get(p.driverId) : null
      return {
        ...p,
        plate: veh?.plate || "Bilinmeyen Araç",
        driverName: drv?.fullName || null,
      }
    }),
  }
}

export async function upsertVehicleDocument(
  input: Record<string, any>,
  actor: { userId: string; branchId?: string }
) {
  const dbAny = prisma as any
  const vehicle = await dbAny.lojistikVehicle.findUnique({ where: { id: input.vehicleId } })
  if (!vehicle) {
    throw new LogisticsDomainError("NOT_FOUND", "Belge eklenecek araç bulunamadı.", 404)
  }

  const docType = String(input.docType || "MUAYENE").toUpperCase() as FleetDocumentType
  const costTry = Math.max(0, Number(input.costTry || 0))
  const existing = input.id
    ? await dbAny.lojistikVehicleDocument.findUnique({ where: { id: input.id } }).catch(() => null)
    : null

  let financeId = existing?.financeId || null
  if (!existing && costTry > 0 && input.postToFinance !== false) {
    const finCategory =
      docType === "MTV_VERGI"
        ? "Vergi & Harç"
        : docType === "KASKO" || docType === "TRAFIK_SIGORTASI"
          ? "Sigorta"
          : "Bakım Onarım"
    const fin = await (prisma as any).finance.create({
      data: {
        branchId: vehicle.branchId || actor.branchId || "local-debug-branch",
        type: "EXPENSE",
        amount: costTry,
        category: finCategory,
        description: `${vehicle.plate} — ${FLEET_DOCUMENT_TYPE_LABELS[docType] || docType} (${input.documentNo || "Belge"})`,
        status: "approved",
        approvedBy: actor.userId,
        vehicleId: vehicle.id,
        driverId: vehicle.assignedDriverId || null,
        fleetCostCategory: "INSURANCE_TAX",
        date: new Date(),
      },
    })
    financeId = fin.id
  }

  const expiresAt = input.expiresAt ? new Date(input.expiresAt) : existing?.expiresAt ?? null
  const evalRes = evaluateExpiryStatus(expiresAt, Number(input.reminderDaysBefore || 30))

  const payload = {
    vehicleId: vehicle.id,
    docType,
    documentNo: input.documentNo?.trim() || existing?.documentNo || null,
    issuer: input.issuer?.trim() || existing?.issuer || null,
    issuedAt: input.issuedAt ? new Date(input.issuedAt) : existing?.issuedAt ?? new Date(),
    expiresAt,
    costTry,
    reminderDaysBefore: Number(input.reminderDaysBefore ?? existing?.reminderDaysBefore ?? 30),
    financeId,
    notes: input.notes !== undefined ? input.notes : existing?.notes ?? null,
    status: evalRes.status === "EXPIRED" ? "EXPIRED" : "VALID",
    updatedAt: new Date(),
  }

  const saved = existing
    ? await dbAny.lojistikVehicleDocument.update({ where: { id: existing.id }, data: payload })
    : await dbAny.lojistikVehicleDocument.create({
        data: { id: `vdoc-${Date.now()}-${Math.random().toString(36).slice(2, 5)}`, ...payload, createdAt: new Date() },
      })

  await logLogisticsAudit({
    userId: actor.userId,
    action: existing ? "UPDATE_VEHICLE_DOCUMENT" : "CREATE_VEHICLE_DOCUMENT",
    resource: "lojistik_filo",
    resourceId: saved.id,
    moduleKey: "lojistik_filo",
    metadata: { plate: vehicle.plate, docType, expiresAt: saved.expiresAt },
  })

  return { ...saved, expiryStatus: evalRes.status, daysRemaining: evalRes.daysRemaining }
}

export async function recordTrafficPenalty(
  input: Record<string, any>,
  actor: { userId: string; branchId?: string }
) {
  const dbAny = prisma as any
  const vehicle = await dbAny.lojistikVehicle.findUnique({ where: { id: input.vehicleId } })
  if (!vehicle) {
    throw new LogisticsDomainError("NOT_FOUND", "Ceza kaydedilecek araç bulunamadı.", 404)
  }

  const penaltyNo = String(input.penaltyNo || `CEZ-${Date.now().toString().slice(-6)}`).trim().toUpperCase()
  const amountTry = Math.max(0, Number(input.amountTry || 0))
  const driverId = input.driverId || vehicle.assignedDriverId || null

  let financeId: string | null = null
  if (amountTry > 0 && input.postToFinance !== false) {
    const fin = await (prisma as any).finance.create({
      data: {
        branchId: vehicle.branchId || actor.branchId || "local-debug-branch",
        type: "EXPENSE",
        amount: amountTry,
        category: "Vergi & Harç",
        description: `${vehicle.plate} — Trafik Cezası (${penaltyNo}: ${input.reason || input.violationType})`,
        status: "approved",
        approvedBy: actor.userId,
        vehicleId: vehicle.id,
        driverId,
        fleetCostCategory: "PENALTY",
        date: new Date(input.violationDate || new Date()),
      },
    })
    financeId = fin.id
  }

  const saved = await dbAny.lojistikTrafficPenalty.create({
    data: {
      id: `pen-${Date.now()}-${Math.random().toString(36).slice(2, 5)}`,
      penaltyNo,
      vehicleId: vehicle.id,
      driverId,
      violationDate: new Date(input.violationDate || new Date()),
      dueDate: input.dueDate ? new Date(input.dueDate) : null,
      location: input.location?.trim() || null,
      violationType: String(input.violationType || "HIZ_IHLALI").toUpperCase(),
      reason: String(input.reason || "Trafik kuralı ihlali").trim(),
      amountTry,
      discountedAmountTry: input.discountedAmountTry ? Number(input.discountedAmountTry) : null,
      paidAt: input.paymentStatus === "PAID" ? new Date() : null,
      paymentStatus: String(input.paymentStatus || "UNPAID").toUpperCase(),
      financeId,
      notes: input.notes || null,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
  })

  await logLogisticsAudit({
    userId: actor.userId,
    action: "CREATE_TRAFFIC_PENALTY",
    resource: "lojistik_filo",
    resourceId: saved.id,
    moduleKey: "lojistik_filo",
    metadata: { plate: vehicle.plate, penaltyNo, amountTry },
  })

  return saved
}

export async function evaluateAndDispatchFleetExpiryAlerts(params?: {
  dispatchNotifications?: boolean
  recipientUserId?: string
  referenceNow?: Date
}) {
  const dbAny = prisma as any
  const refNow = params?.referenceNow || new Date()
  const [vehicles, drivers, docs, maintPlans, existingNotifs] = await Promise.all([
    dbAny.lojistikVehicle.findMany(),
    dbAny.lojistikDriver.findMany(),
    dbAny.lojistikVehicleDocument.findMany(),
    dbAny.lojistikVehicleMaintenancePlan.findMany().catch(() => []),
    prisma.notification.findMany({ take: 100, orderBy: { createdAt: "desc" } }).catch(() => []),
  ])

  const vehById = new Map<string, any>(vehicles.map((v: any) => [v.id, v]))
  const alerts: Array<{
    kind: "VEHICLE_DOC" | "DRIVER_DOC" | "MAINTENANCE_DUE"
    severity: "EXPIRED" | "EXPIRING_SOON"
    entityId: string
    title: string
    message: string
    daysRemaining: number | null
  }> = []

  for (const d of docs) {
    const res = evaluateExpiryStatus(d.expiresAt, d.reminderDaysBefore || 30, refNow)
    if (res.status === "EXPIRED" || res.status === "EXPIRING_SOON") {
      const veh = vehById.get(d.vehicleId)
      const plate = veh?.plate || d.vehicleId
      const label = FLEET_DOCUMENT_TYPE_LABELS[d.docType as FleetDocumentType] || d.docType
      alerts.push({
        kind: "VEHICLE_DOC",
        severity: res.status,
        entityId: d.id,
        title: `${plate} — ${label} ${res.status === "EXPIRED" ? "Süresi Doldu" : "Süresi Yaklaşıyor"}`,
        message:
          res.status === "EXPIRED"
            ? `${plate} plakalı aracın ${label} belgesi ${Math.abs(res.daysRemaining ?? 0)} gün önce dolmuştur.`
            : `${plate} plakalı aracın ${label} belgesinin bitmesine ${res.daysRemaining} gün kaldı.`,
        daysRemaining: res.daysRemaining,
      })
    }
  }

  for (const drv of drivers) {
    if (drv.isActive === false) continue
    const checks: Array<[string, any]> = [
      ["Ehliyet", drv.licenseExpiresAt],
      ["SRC Belgesi", drv.srcExpiresAt],
      ["Psikoteknik Raporu", drv.psychotechExpiresAt],
    ]
    for (const [docLabel, dt] of checks) {
      const res = evaluateExpiryStatus(dt, 30, refNow)
      if (res.status === "EXPIRED" || res.status === "EXPIRING_SOON") {
        alerts.push({
          kind: "DRIVER_DOC",
          severity: res.status,
          entityId: `${drv.id}:${docLabel}`,
          title: `${drv.fullName} — ${docLabel} ${res.status === "EXPIRED" ? "Süresi Doldu" : "Yenileme Uyarısı"}`,
          message:
            res.status === "EXPIRED"
              ? `${drv.fullName} şoförünün ${docLabel} süresi ${Math.abs(res.daysRemaining ?? 0)} gün geçmiştir.`
              : `${drv.fullName} şoförünün ${docLabel} bitimine ${res.daysRemaining} gün kaldı.`,
          daysRemaining: res.daysRemaining,
        })
      }
    }
  }

  for (const p of maintPlans) {
    if (p.isActive === false || !p.vehicleId) continue
    const veh = vehById.get(p.vehicleId)
    if (!veh) continue
    const curKm = Number(veh.odometerKm || 0)
    const freqKm = Number(p.frequencyKm || 0)
    const lastKm = Number(p.lastTriggeredKm || 0)
    const kmDue = p.planType === "METER_KM" && freqKm > 0 && curKm - lastKm >= freqKm
    const calEval = p.nextScheduledDate ? evaluateExpiryStatus(p.nextScheduledDate, 14, refNow) : null
    if (kmDue || calEval?.status === "EXPIRED" || calEval?.status === "EXPIRING_SOON") {
      alerts.push({
        kind: "MAINTENANCE_DUE",
        severity: kmDue || calEval?.status === "EXPIRED" ? "EXPIRED" : "EXPIRING_SOON",
        entityId: p.id,
        title: `${veh.plate} — ${p.name} Bakım Uyarısı`,
        message: kmDue
          ? `${veh.plate} bakım kilometresi eşiğine ulaştı (${curKm.toLocaleString("tr-TR")} km).`
          : `${veh.plate} periyodik bakım tarihi ${calEval?.status === "EXPIRED" ? "geçti" : `${calEval?.daysRemaining} gün içinde`}.`,
        daysRemaining: calEval?.daysRemaining ?? 0,
      })
    }
  }

  let notificationsSent = 0
  if (params?.dispatchNotifications && alerts.length > 0 && params.recipientUserId) {
    const existingTitles = new Set(existingNotifs.map((n: any) => n.title))
    const toSend = alerts
      .filter((a) => !existingTitles.has(a.title))
      .slice(0, 15)
      .map((a) => ({
        userId: params.recipientUserId!,
        title: a.title,
        message: a.message,
        type: a.severity === "EXPIRED" ? "error" : "warning",
        moduleType: "LOJISTIK_FILO",
        link: "/dashboard/filo",
      }))
    if (toSend.length > 0) {
      const sent = await createNotificationMany(toSend)
      notificationsSent = sent.length
    }
  }

  return {
    totalAlerts: alerts.length,
    expiredCount: alerts.filter((a) => a.severity === "EXPIRED").length,
    expiringSoonCount: alerts.filter((a) => a.severity === "EXPIRING_SOON").length,
    notificationsSent,
    alerts,
  }
}
