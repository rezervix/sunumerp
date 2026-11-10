/**
 * Sunum ERP — Üretim Ana Verileri (Master Data) Veritabanı Orkestrasyon Katmanı
 *
 * KURAL:
 * - Sahte/mock veri tohumlaması (seed) YOKTUR. Yalnızca sistemin çalışması için gereken
 *   varsayılan üretim parametreleri (UretimParameters) kaydı üretilir.
 * - Tüm liste sorgularında N+1 sorgu problemi önlenmiştir (Promise.all + Map O(1) birleştirme).
 * - Stok/Ürün kartı üretim bilgileri, mevcut InventoryItem tablosuna dokunmadan
 *   1-1 bağlı UretimItemProfile tablosunda tutulur.
 */

import { prisma } from "@/lib/db"
import { ProductionDomainError } from "@/lib/services/productionAuditAndError"
import {
  buildDefaultProductionParameters,
  calculateEffectiveWorkCenterCapacity,
  mapInventoryItemTypeToProductionType,
  paginateArray,
  validateCalendarExceptionInput,
  validateCalendarHolidayInput,
  validateItemProfileInput,
  validateMachineAssetInput,
  validateProductionParametersInput,
  validateShiftInput,
  validateWorkCalendarInput,
  validateWorkCenterInput,
  type PaginatedResult,
} from "@/lib/services/productionMasterDataEngine"

// ═══════════════════════════════════════════════════════════════════════════════
// 1. İŞ MERKEZİ / İSTASYON (UretimWorkCenter) CRUD & LİSTELEME
// ═══════════════════════════════════════════════════════════════════════════════

export interface ListWorkCentersParams {
  branchId?: string | null
  search?: string | null
  type?: string | null
  isActive?: string | boolean | null
  alternativeGroupCode?: string | null
  page?: number | string | null
  pageSize?: number | string | null
}

export async function listWorkCentersInDb(params: ListWorkCentersParams = {}) {
  const [rawWorkCenters, calendars, shifts, machines, warehouses] = await Promise.all([
    (prisma as any).uretimWorkCenter.findMany({ orderBy: { createdAt: "desc" } }),
    (prisma as any).uretimWorkCalendar.findMany(),
    (prisma as any).uretimShift.findMany(),
    (prisma as any).uretimMachineAsset.findMany(),
    (prisma as any).warehouse.findMany().catch(() => []),
  ])

  const calendarMap = new Map<string, any>(calendars.map((c: any) => [c.id, c]))
  const shiftMap = new Map<string, any>(shifts.map((s: any) => [s.id, s]))
  const warehouseMap = new Map<string, any>(warehouses.map((w: any) => [w.id, w]))
  const machinesByWc = new Map<string, any[]>()
  for (const m of machines) {
    if (!m.workCenterId) continue
    const arr = machinesByWc.get(m.workCenterId) || []
    arr.push(m)
    machinesByWc.set(m.workCenterId, arr)
  }

  const q = String(params.search || "").trim().toLowerCase()
  const typeFilter =
    params.type && params.type !== "ALL" ? String(params.type).toUpperCase() : null
  const groupFilter =
    params.alternativeGroupCode && params.alternativeGroupCode !== "ALL"
      ? String(params.alternativeGroupCode).toUpperCase()
      : null
  const activeFilter =
    params.isActive === true || params.isActive === "true" || params.isActive === "ACTIVE"
      ? true
      : params.isActive === false ||
        params.isActive === "false" ||
        params.isActive === "PASSIVE"
      ? false
      : null

  const enriched = rawWorkCenters
    .filter((wc: any) => {
      if (
        params.branchId &&
        wc.branchId &&
        wc.branchId !== params.branchId &&
        wc.branchId !== "GLOBAL"
      ) {
        return false
      }
      if (typeFilter && wc.type !== typeFilter) return false
      if (groupFilter && (wc.alternativeGroupCode || "") !== groupFilter) return false
      if (activeFilter !== null && Boolean(wc.isActive) !== activeFilter) return false
      if (q) {
        const hay = `${wc.code || ""} ${wc.name || ""} ${wc.alternativeGroupCode || ""} ${wc.notes || ""}`.toLowerCase()
        if (!hay.includes(q)) return false
      }
      return true
    })
    .map((wc: any) => {
      const calendar = wc.calendarId ? calendarMap.get(wc.calendarId) || null : null
      const defaultShift = wc.defaultShiftId
        ? shiftMap.get(wc.defaultShiftId) || null
        : null
      const warehouse = wc.warehouseId ? warehouseMap.get(wc.warehouseId) || null : null
      const linkedMachines = machinesByWc.get(wc.id) || []
      const capacityMetrics = calculateEffectiveWorkCenterCapacity({
        capacityPerHour: wc.capacityPerHour,
        efficiencyPercent: wc.efficiencyPercent,
        hourlyCost: wc.hourlyCost,
        shiftNetWorkingMinutes: defaultShift?.netWorkingMinutes,
        shiftCapacityMultiplier: defaultShift?.capacityMultiplier,
      })

      return {
        ...wc,
        calendar,
        defaultShift,
        warehouse,
        machines: linkedMachines,
        machineCount: linkedMachines.length,
        activeMachineCount: linkedMachines.filter((m: any) => m.status === "ACTIVE").length,
        capacityMetrics,
      }
    })

  return paginateArray(enriched, params.page, params.pageSize)
}

export async function createWorkCenterInDb(raw: Record<string, any>) {
  const input = validateWorkCenterInput(raw)

  const existing = await (prisma as any).uretimWorkCenter.findFirst({
    where: { code: input.code },
  })
  if (existing) {
    throw new ProductionDomainError(
      `Bu iş merkezi kodu (${input.code}) ile kayıtlı başka bir istasyon zaten mevcut.`,
      "CONFLICT",
      409
    )
  }

  if (input.calendarId) {
    const cal = await (prisma as any).uretimWorkCalendar.findUnique({
      where: { id: input.calendarId },
    })
    if (!cal) {
      throw new ProductionDomainError(
        "Seçilen çalışma takvimi bulunamadı.",
        "NOT_FOUND",
        404
      )
    }
  }

  if (input.defaultShiftId) {
    const sh = await (prisma as any).uretimShift.findUnique({
      where: { id: input.defaultShiftId },
    })
    if (!sh) {
      throw new ProductionDomainError(
        "Seçilen varsayılan vardiya bulunamadı.",
        "NOT_FOUND",
        404
      )
    }
  }

  const created = await (prisma as any).uretimWorkCenter.create({
    data: input,
  })
  return created
}

export async function updateWorkCenterInDb(id: string, raw: Record<string, any>) {
  if (!id) {
    throw new ProductionDomainError("İş merkezi kimliği (id) zorunludur.", "VALIDATION_ERROR", 400)
  }
  const current = await (prisma as any).uretimWorkCenter.findUnique({
    where: { id },
  })
  if (!current) {
    throw new ProductionDomainError("Güncellenecek iş merkezi bulunamadı.", "NOT_FOUND", 404)
  }

  const merged = { ...current, ...raw }
  const input = validateWorkCenterInput(merged)

  if (input.code !== current.code) {
    const duplicate = await (prisma as any).uretimWorkCenter.findFirst({
      where: { code: input.code },
    })
    if (duplicate && duplicate.id !== id) {
      throw new ProductionDomainError(
        `Bu iş merkezi kodu (${input.code}) başka bir istasyonda kullanılıyor.`,
        "CONFLICT",
        409
      )
    }
  }

  const updated = await (prisma as any).uretimWorkCenter.update({
    where: { id },
    data: input,
  })
  return updated
}

export async function deleteWorkCenterInDb(id: string) {
  if (!id) {
    throw new ProductionDomainError("İş merkezi kimliği (id) zorunludur.", "VALIDATION_ERROR", 400)
  }
  const current = await (prisma as any).uretimWorkCenter.findUnique({
    where: { id },
  })
  if (!current) {
    throw new ProductionDomainError("Silinecek iş merkezi bulunamadı.", "NOT_FOUND", 404)
  }

  // Bağlı makinelerin ve ürün profillerinin workCenterId alanını boşa çıkar (ON DELETE SET NULL)
  await (prisma as any).uretimMachineAsset.updateMany({
    where: { workCenterId: id },
    data: { workCenterId: null },
  })
  await (prisma as any).uretimItemProfile.updateMany({
    where: { defaultWorkCenterId: id },
    data: { defaultWorkCenterId: null },
  })
  await (prisma as any).uretimCalendarException.deleteMany({
    where: { workCenterId: id },
  })

  const deleted = await (prisma as any).uretimWorkCenter.delete({
    where: { id },
  })
  return deleted
}

// ═══════════════════════════════════════════════════════════════════════════════
// 2. MAKİNE / EKİPMAN VARLIĞI (UretimMachineAsset) CRUD & SAYAÇ YÖNETİMİ
// ═══════════════════════════════════════════════════════════════════════════════

export interface ListMachineAssetsParams {
  branchId?: string | null
  search?: string | null
  status?: string | null
  workCenterId?: string | null
  isActive?: string | boolean | null
  page?: number | string | null
  pageSize?: number | string | null
}

export async function listMachineAssetsInDb(params: ListMachineAssetsParams = {}) {
  const [rawMachines, workCenters] = await Promise.all([
    (prisma as any).uretimMachineAsset.findMany({ orderBy: { createdAt: "desc" } }),
    (prisma as any).uretimWorkCenter.findMany(),
  ])

  const wcMap = new Map<string, any>(workCenters.map((wc: any) => [wc.id, wc]))
  const q = String(params.search || "").trim().toLowerCase()
  const statusFilter =
    params.status && params.status !== "ALL"
      ? String(params.status).toUpperCase()
      : null
  const wcFilter =
    params.workCenterId && params.workCenterId !== "ALL"
      ? String(params.workCenterId)
      : null
  const activeFilter =
    params.isActive === true || params.isActive === "true" || params.isActive === "ACTIVE"
      ? true
      : params.isActive === false ||
        params.isActive === "false" ||
        params.isActive === "PASSIVE"
      ? false
      : null

  const nowMs = Date.now()

  const enriched = rawMachines
    .filter((m: any) => {
      if (
        params.branchId &&
        m.branchId &&
        m.branchId !== params.branchId &&
        m.branchId !== "GLOBAL"
      ) {
        return false
      }
      if (statusFilter && m.status !== statusFilter) return false
      if (wcFilter && m.workCenterId !== wcFilter) return false
      if (activeFilter !== null && Boolean(m.isActive) !== activeFilter) return false
      if (q) {
        const wc = m.workCenterId ? wcMap.get(m.workCenterId) : null
        const hay = `${m.code || ""} ${m.name || ""} ${m.serialNumber || ""} ${m.brand || ""} ${m.model || ""} ${m.location || ""} ${wc?.name || ""}`.toLowerCase()
        if (!hay.includes(q)) return false
      }
      return true
    })
    .map((m: any) => {
      const workCenter = m.workCenterId ? wcMap.get(m.workCenterId) || null : null
      let warrantyDaysRemaining: number | null = null
      let warrantyStatus: "ACTIVE" | "EXPIRING_SOON" | "EXPIRED" | "NONE" = "NONE"

      if (m.warrantyEndDate) {
        const endMs = new Date(`${m.warrantyEndDate}T23:59:59Z`).getTime()
        if (!Number.isNaN(endMs)) {
          warrantyDaysRemaining = Math.ceil((endMs - nowMs) / (1000 * 60 * 60 * 24))
          if (warrantyDaysRemaining < 0) warrantyStatus = "EXPIRED"
          else if (warrantyDaysRemaining <= 30) warrantyStatus = "EXPIRING_SOON"
          else warrantyStatus = "ACTIVE"
        }
      }

      return {
        ...m,
        workCenter,
        warrantyDaysRemaining,
        warrantyStatus,
      }
    })

  return paginateArray(enriched, params.page, params.pageSize)
}

export async function createMachineAssetInDb(raw: Record<string, any>) {
  const input = validateMachineAssetInput(raw)

  const [dupCode, dupSerial] = await Promise.all([
    (prisma as any).uretimMachineAsset.findFirst({ where: { code: input.code } }),
    (prisma as any).uretimMachineAsset.findFirst({
      where: { serialNumber: input.serialNumber },
    }),
  ])

  if (dupCode) {
    throw new ProductionDomainError(
      `Bu makine/ekipman kodu (${input.code}) zaten kayıtlı.`,
      "CONFLICT",
      409
    )
  }
  if (dupSerial) {
    throw new ProductionDomainError(
      `Bu seri numarası (${input.serialNumber}) başka bir ekipmanda kayıtlı.`,
      "CONFLICT",
      409
    )
  }

  if (input.workCenterId) {
    const wc = await (prisma as any).uretimWorkCenter.findUnique({
      where: { id: input.workCenterId },
    })
    if (!wc) {
      throw new ProductionDomainError("Bağlanacak iş merkezi bulunamadı.", "NOT_FOUND", 404)
    }
  }

  return await (prisma as any).uretimMachineAsset.create({
    data: input,
  })
}

export async function updateMachineAssetInDb(id: string, raw: Record<string, any>) {
  if (!id) {
    throw new ProductionDomainError("Makine/ekipman kimliği (id) zorunludur.", "VALIDATION_ERROR", 400)
  }
  const current = await (prisma as any).uretimMachineAsset.findUnique({
    where: { id },
  })
  if (!current) {
    throw new ProductionDomainError("Güncellenecek makine/ekipman bulunamadı.", "NOT_FOUND", 404)
  }

  const merged = { ...current, ...raw }
  const input = validateMachineAssetInput(merged)

  if (input.code !== current.code) {
    const dupCode = await (prisma as any).uretimMachineAsset.findFirst({
      where: { code: input.code },
    })
    if (dupCode && dupCode.id !== id) {
      throw new ProductionDomainError(
        `Bu makine kodu (${input.code}) başka bir kayıtta kullanılıyor.`,
        "CONFLICT",
        409
      )
    }
  }

  if (input.serialNumber !== current.serialNumber) {
    const dupSerial = await (prisma as any).uretimMachineAsset.findFirst({
      where: { serialNumber: input.serialNumber },
    })
    if (dupSerial && dupSerial.id !== id) {
      throw new ProductionDomainError(
        `Bu seri numarası (${input.serialNumber}) başka bir kayıtta kullanılıyor.`,
        "CONFLICT",
        409
      )
    }
  }

  return await (prisma as any).uretimMachineAsset.update({
    where: { id },
    data: input,
  })
}

export async function updateMachineCounterInDb(
  id: string,
  payload: {
    operatingHoursDelta?: number
    productionCountDelta?: number
    operatingHoursSet?: number
    productionCountSet?: number
    status?: string
  }
) {
  const current = await (prisma as any).uretimMachineAsset.findUnique({
    where: { id },
  })
  if (!current) {
    throw new ProductionDomainError("Makine/ekipman bulunamadı.", "NOT_FOUND", 404)
  }

  const nextHours =
    payload.operatingHoursSet !== undefined
      ? Number(payload.operatingHoursSet)
      : Number(current.operatingHours || 0) + Number(payload.operatingHoursDelta || 0)

  const nextCount =
    payload.productionCountSet !== undefined
      ? Number(payload.productionCountSet)
      : Number(current.productionCount || 0) + Number(payload.productionCountDelta || 0)

  if (nextHours < 0 || nextCount < 0) {
    throw new ProductionDomainError(
      "Makine çalışma saati ve üretim adedi sayaçları 0'ın altına düşemez.",
      "VALIDATION_ERROR",
      400
    )
  }

  return await (prisma as any).uretimMachineAsset.update({
    where: { id },
    data: {
      operatingHours: Number(nextHours.toFixed(2)),
      productionCount: Number(nextCount.toFixed(2)),
      ...(payload.status ? { status: String(payload.status).toUpperCase() } : {}),
    },
  })
}

export async function deleteMachineAssetInDb(id: string) {
  if (!id) {
    throw new ProductionDomainError("Makine kimliği (id) zorunludur.", "VALIDATION_ERROR", 400)
  }
  const current = await (prisma as any).uretimMachineAsset.findUnique({
    where: { id },
  })
  if (!current) {
    throw new ProductionDomainError("Silinecek makine/ekipman bulunamadı.", "NOT_FOUND", 404)
  }

  return await (prisma as any).uretimMachineAsset.delete({
    where: { id },
  })
}

// ═══════════════════════════════════════════════════════════════════════════════
// 3. ÇALIŞMA TAKVİMİ, VARDİYA, TATİL GÜNLERİ VE İSTİSNALAR CRUD
// ═══════════════════════════════════════════════════════════════════════════════

export async function listWorkCalendarsInDb(params: {
  branchId?: string | null
  search?: string | null
  page?: number | string | null
  pageSize?: number | string | null
} = {}) {
  const [calendars, shifts, holidays, exceptions, workCenters] = await Promise.all([
    (prisma as any).uretimWorkCalendar.findMany({ orderBy: { createdAt: "desc" } }),
    (prisma as any).uretimShift.findMany({ orderBy: { startTime: "asc" } }),
    (prisma as any).uretimCalendarHoliday.findMany({ orderBy: { holidayDate: "asc" } }),
    (prisma as any).uretimCalendarException.findMany({ orderBy: { exceptionDate: "asc" } }),
    (prisma as any).uretimWorkCenter.findMany(),
  ])

  const wcMap = new Map<string, any>(workCenters.map((wc: any) => [wc.id, wc]))
  const q = String(params.search || "").trim().toLowerCase()

  const enriched = calendars
    .filter((cal: any) => {
      if (
        params.branchId &&
        cal.branchId &&
        cal.branchId !== params.branchId &&
        cal.branchId !== "GLOBAL"
      ) {
        return false
      }
      if (q) {
        const hay = `${cal.code || ""} ${cal.name || ""} ${cal.notes || ""}`.toLowerCase()
        if (!hay.includes(q)) return false
      }
      return true
    })
    .map((cal: any) => {
      let workingDays: string[] = ["MON", "TUE", "WED", "THU", "FRI", "SAT"]
      try {
        workingDays = JSON.parse(cal.workingDaysJson || "[]")
      } catch {
        // varsayılan
      }

      const calShifts = shifts.filter((s: any) => s.calendarId === cal.id)
      const calHolidays = holidays.filter((h: any) => h.calendarId === cal.id)
      const calExceptions = exceptions
        .filter((e: any) => e.calendarId === cal.id)
        .map((e: any) => ({
          ...e,
          workCenter: wcMap.get(e.workCenterId) || null,
        }))
      const linkedWorkCenters = workCenters.filter(
        (wc: any) => wc.calendarId === cal.id
      )

      const totalDailyNetMinutes = calShifts
        .filter((s: any) => s.isActive)
        .reduce((acc: number, s: any) => acc + Number(s.netWorkingMinutes || 0), 0)

      return {
        ...cal,
        workingDays,
        shifts: calShifts,
        holidays: calHolidays,
        exceptions: calExceptions,
        workCenters: linkedWorkCenters,
        totalDailyNetMinutes,
        totalDailyNetHours: Number((totalDailyNetMinutes / 60).toFixed(2)),
      }
    })

  return paginateArray(enriched, params.page, params.pageSize)
}

export async function createWorkCalendarInDb(raw: Record<string, any>) {
  const input = validateWorkCalendarInput(raw)

  const existing = await (prisma as any).uretimWorkCalendar.findFirst({
    where: { code: input.code },
  })
  if (existing) {
    throw new ProductionDomainError(
      `Bu çalışma takvimi kodu (${input.code}) zaten mevcut.`,
      "CONFLICT",
      409
    )
  }

  if (input.isDefault) {
    await (prisma as any).uretimWorkCalendar.updateMany({
      where: { isDefault: true },
      data: { isDefault: false },
    })
  }

  return await (prisma as any).uretimWorkCalendar.create({
    data: input,
  })
}

export async function updateWorkCalendarInDb(id: string, raw: Record<string, any>) {
  const current = await (prisma as any).uretimWorkCalendar.findUnique({
    where: { id },
  })
  if (!current) {
    throw new ProductionDomainError("Çalışma takvimi bulunamadı.", "NOT_FOUND", 404)
  }

  const input = validateWorkCalendarInput({ ...current, ...raw })
  if (input.code !== current.code) {
    const dup = await (prisma as any).uretimWorkCalendar.findFirst({
      where: { code: input.code },
    })
    if (dup && dup.id !== id) {
      throw new ProductionDomainError(
        `Takvim kodu (${input.code}) başka bir kayıtta kullanılıyor.`,
        "CONFLICT",
        409
      )
    }
  }

  if (input.isDefault) {
    await (prisma as any).uretimWorkCalendar.updateMany({
      where: { isDefault: true },
      data: { isDefault: false },
    })
  }

  return await (prisma as any).uretimWorkCalendar.update({
    where: { id },
    data: input,
  })
}

export async function deleteWorkCalendarInDb(id: string) {
  const current = await (prisma as any).uretimWorkCalendar.findUnique({
    where: { id },
  })
  if (!current) {
    throw new ProductionDomainError("Silinecek çalışma takvimi bulunamadı.", "NOT_FOUND", 404)
  }

  await (prisma as any).uretimWorkCenter.updateMany({
    where: { calendarId: id },
    data: { calendarId: null, defaultShiftId: null },
  })
  await (prisma as any).uretimShift.deleteMany({ where: { calendarId: id } })
  await (prisma as any).uretimCalendarHoliday.deleteMany({ where: { calendarId: id } })
  await (prisma as any).uretimCalendarException.deleteMany({ where: { calendarId: id } })

  return await (prisma as any).uretimWorkCalendar.delete({
    where: { id },
  })
}

export async function createShiftInDb(raw: Record<string, any>) {
  const input = validateShiftInput(raw)

  const calendar = await (prisma as any).uretimWorkCalendar.findUnique({
    where: { id: input.calendarId },
  })
  if (!calendar) {
    throw new ProductionDomainError("Vardiyanın bağlanacağı takvim bulunamadı.", "NOT_FOUND", 404)
  }

  const dup = await (prisma as any).uretimShift.findFirst({
    where: { code: input.code },
  })
  if (dup) {
    throw new ProductionDomainError(
      `Bu vardiya kodu (${input.code}) zaten kullanılıyor.`,
      "CONFLICT",
      409
    )
  }

  return await (prisma as any).uretimShift.create({
    data: input,
  })
}

export async function updateShiftInDb(id: string, raw: Record<string, any>) {
  const current = await (prisma as any).uretimShift.findUnique({
    where: { id },
  })
  if (!current) {
    throw new ProductionDomainError("Güncellenecek vardiya bulunamadı.", "NOT_FOUND", 404)
  }

  const input = validateShiftInput({ ...current, ...raw })
  if (input.code !== current.code) {
    const dup = await (prisma as any).uretimShift.findFirst({
      where: { code: input.code },
    })
    if (dup && dup.id !== id) {
      throw new ProductionDomainError(
        `Bu vardiya kodu (${input.code}) başka bir vardiyada kullanılıyor.`,
        "CONFLICT",
        409
      )
    }
  }

  return await (prisma as any).uretimShift.update({
    where: { id },
    data: input,
  })
}

export async function deleteShiftInDb(id: string) {
  const current = await (prisma as any).uretimShift.findUnique({
    where: { id },
  })
  if (!current) {
    throw new ProductionDomainError("Silinecek vardiya bulunamadı.", "NOT_FOUND", 404)
  }

  await (prisma as any).uretimWorkCenter.updateMany({
    where: { defaultShiftId: id },
    data: { defaultShiftId: null },
  })

  return await (prisma as any).uretimShift.delete({
    where: { id },
  })
}

export async function createCalendarHolidayInDb(raw: Record<string, any>) {
  const input = validateCalendarHolidayInput(raw)

  const cal = await (prisma as any).uretimWorkCalendar.findUnique({
    where: { id: input.calendarId },
  })
  if (!cal) {
    throw new ProductionDomainError("Çalışma takvimi bulunamadı.", "NOT_FOUND", 404)
  }

  return await (prisma as any).uretimCalendarHoliday.create({
    data: input,
  })
}

export async function deleteCalendarHolidayInDb(id: string) {
  const current = await (prisma as any).uretimCalendarHoliday.findUnique({
    where: { id },
  })
  if (!current) {
    throw new ProductionDomainError("Silinecek tatil kaydı bulunamadı.", "NOT_FOUND", 404)
  }

  return await (prisma as any).uretimCalendarHoliday.delete({
    where: { id },
  })
}

export async function createCalendarExceptionInDb(raw: Record<string, any>) {
  const input = validateCalendarExceptionInput(raw)

  const [cal, wc] = await Promise.all([
    (prisma as any).uretimWorkCalendar.findUnique({ where: { id: input.calendarId } }),
    (prisma as any).uretimWorkCenter.findUnique({ where: { id: input.workCenterId } }),
  ])

  if (!cal) {
    throw new ProductionDomainError("Çalışma takvimi bulunamadı.", "NOT_FOUND", 404)
  }
  if (!wc) {
    throw new ProductionDomainError("İstisna tanımlanacak iş merkezi bulunamadı.", "NOT_FOUND", 404)
  }

  return await (prisma as any).uretimCalendarException.create({
    data: input,
  })
}

export async function deleteCalendarExceptionInDb(id: string) {
  const current = await (prisma as any).uretimCalendarException.findUnique({
    where: { id },
  })
  if (!current) {
    throw new ProductionDomainError("Silinecek takvim istisnası bulunamadı.", "NOT_FOUND", 404)
  }

  return await (prisma as any).uretimCalendarException.delete({
    where: { id },
  })
}

// ═══════════════════════════════════════════════════════════════════════════════
// 4. ÜRETİM PARAMETRELERİ (UretimParameters) — VARSAYILAN VE GÜNCELLEME
// ═══════════════════════════════════════════════════════════════════════════════

export async function getProductionParametersFromDb(
  branchId?: string | null,
  persistIfMissing = false
) {
  const targetBranch = branchId || "GLOBAL"
  const allParams = await (prisma as any).uretimParameters.findMany()
  let found =
    allParams.find((p: any) => p.branchId === targetBranch) ||
    allParams.find((p: any) => p.branchId === "GLOBAL") ||
    allParams[0] ||
    null

  if (!found) {
    const def = buildDefaultProductionParameters(targetBranch)
    if (persistIfMissing) {
      found = await (prisma as any).uretimParameters.create({
        data: def,
      })
    } else {
      found = {
        ...def,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      }
    }
  }

  let statusFlow: string[] = []
  try {
    statusFlow = JSON.parse(found.statusFlowJson || "[]")
  } catch {
    statusFlow = ["DRAFT", "PLANNED", "RELEASED", "IN_PROGRESS", "QA_PENDING", "COMPLETED"]
  }

  return {
    ...found,
    statusFlow,
  }
}

export async function upsertProductionParametersInDb(
  raw: Record<string, any>,
  updatedBy?: string | null
) {
  const input = validateProductionParametersInput(raw)
  const allParams = await (prisma as any).uretimParameters.findMany()
  const existing =
    allParams.find((p: any) => p.branchId === input.branchId) ||
    allParams.find((p: any) => p.branchId === "GLOBAL") ||
    null

  if (existing) {
    return await (prisma as any).uretimParameters.update({
      where: { id: existing.id },
      data: {
        ...input,
        updatedBy: updatedBy || "ADMIN",
      },
    })
  }

  return await (prisma as any).uretimParameters.create({
    data: {
      id: `uretim-params-${input.branchId.toLowerCase()}`,
      ...input,
      updatedBy: updatedBy || "ADMIN",
    },
  })
}

// ═══════════════════════════════════════════════════════════════════════════════
// 5. STOK / ÜRÜN KARTI 1-1 ÜRETİM PROFİLİ (UretimItemProfile) CRUD
// ═══════════════════════════════════════════════════════════════════════════════

export async function getItemProductionProfileFromDb(itemId: string) {
  if (!itemId) {
    throw new ProductionDomainError("itemId zorunludur.", "VALIDATION_ERROR", 400)
  }

  const [item, profiles, boms, workCenters, params] = await Promise.all([
    (prisma as any).inventoryItem.findUnique({ where: { id: itemId } }),
    (prisma as any).uretimItemProfile.findMany({ where: { itemId } }),
    (prisma as any).bomHeader.findMany({ where: { finishedItemId: itemId } }),
    (prisma as any).uretimWorkCenter.findMany({ where: { isActive: true } }),
    getProductionParametersFromDb(null, false),
  ])

  if (!item) {
    throw new ProductionDomainError("Stok/ürün kartı bulunamadı.", "NOT_FOUND", 404)
  }

  const savedProfile = profiles[0] || null
  const allBoms = await (prisma as any).bomHeader.findMany()
  const defaultBom = savedProfile?.defaultBomId
    ? allBoms.find((b: any) => b.id === savedProfile.defaultBomId) || null
    : boms[0] || null
  const defaultWorkCenter = savedProfile?.defaultWorkCenterId
    ? workCenters.find((wc: any) => wc.id === savedProfile.defaultWorkCenterId) || null
    : null

  const derivedType = mapInventoryItemTypeToProductionType(item.itemType)
  const effectiveProfile = savedProfile
    ? {
        ...savedProfile,
        isConfiguredInDb: true,
        defaultBom,
        defaultWorkCenter,
      }
    : {
        id: null,
        itemId: item.id,
        productionItemType: derivedType,
        productionMethod:
          derivedType === "HAMMADDE" ||
          derivedType === "SARF_MALZEME" ||
          derivedType === "TICARI_MAL"
            ? "PURCHASE_ONLY"
            : "MAKE_TO_STOCK",
        leadTimeDays: Number(item.leadTimeDays ?? 3),
        productionLeadTimeHours: Number(defaultBom?.leadTimeHours ?? 4),
        minStockLevel: Number(item.minStockLevel ?? 10),
        safetyStockQty: Number(params.defaultSafetyStockValue ?? 5),
        lotSizingRule: params.defaultLotSizingRule || "L4L",
        standardLotSize: Number(params.defaultMinLotSize ?? 1),
        minOrderQty: Number(params.defaultMinLotSize ?? 1),
        orderMultiple: Number(params.defaultLotMultiple ?? 1),
        defaultBomId: defaultBom?.id || null,
        defaultWorkCenterId: null,
        scrapTolerancePercent: Number(defaultBom?.scrapRatePercent ?? 2),
        backflushEnabled: Boolean(params.autoBackflushOnComplete),
        qualityCheckRequired: Boolean(params.requireQualityCheckOnComplete),
        notes: null,
        isConfiguredInDb: false,
        defaultBom,
        defaultWorkCenter: null,
      }

  return {
    item: {
      id: item.id,
      sku: item.sku,
      name: item.name,
      category: item.category,
      baseUnit: item.baseUnit,
      itemType: item.itemType,
      minStockLevel: item.minStockLevel,
      leadTimeDays: item.leadTimeDays,
    },
    profile: effectiveProfile,
    availableBoms: allBoms.filter(
      (b: any) => b.finishedItemId === item.id || b.isActive !== false
    ),
    availableWorkCenters: workCenters,
  }
}

export async function listItemProductionProfilesInDb(params: {
  search?: string | null
  productionItemType?: string | null
  productionMethod?: string | null
  onlyConfigured?: boolean
  page?: number | string | null
  pageSize?: number | string | null
} = {}): Promise<PaginatedResult<any>> {
  const [items, profiles, boms, workCenters, sysParams] = await Promise.all([
    (prisma as any).inventoryItem.findMany({
      where: { isActive: true },
      orderBy: { createdAt: "desc" },
    }),
    (prisma as any).uretimItemProfile.findMany(),
    (prisma as any).bomHeader.findMany(),
    (prisma as any).uretimWorkCenter.findMany(),
    getProductionParametersFromDb(null, false),
  ])

  const profileByItemId = new Map<string, any>(
    profiles.map((p: any) => [p.itemId, p])
  )
  const bomById = new Map<string, any>(boms.map((b: any) => [b.id, b]))
  const bomsByFinishedItem = new Map<string, any[]>()
  for (const b of boms) {
    const list = bomsByFinishedItem.get(b.finishedItemId) || []
    list.push(b)
    bomsByFinishedItem.set(b.finishedItemId, list)
  }
  const wcById = new Map<string, any>(workCenters.map((wc: any) => [wc.id, wc]))

  const q = String(params.search || "").trim().toLowerCase()
  const typeFilter =
    params.productionItemType && params.productionItemType !== "ALL"
      ? String(params.productionItemType).toUpperCase()
      : null
  const methodFilter =
    params.productionMethod && params.productionMethod !== "ALL"
      ? String(params.productionMethod).toUpperCase()
      : null

  const combined = items
    .map((item: any) => {
      const saved = profileByItemId.get(item.id) || null
      const itemBoms = bomsByFinishedItem.get(item.id) || []
      const derivedType = mapInventoryItemTypeToProductionType(item.itemType)
      const defaultBom = saved?.defaultBomId
        ? bomById.get(saved.defaultBomId) || null
        : itemBoms[0] || null
      const defaultWorkCenter = saved?.defaultWorkCenterId
        ? wcById.get(saved.defaultWorkCenterId) || null
        : null

      const productionItemType = saved?.productionItemType || derivedType
      const productionMethod =
        saved?.productionMethod ||
        (derivedType === "HAMMADDE" ||
        derivedType === "SARF_MALZEME" ||
        derivedType === "TICARI_MAL"
          ? "PURCHASE_ONLY"
          : "MAKE_TO_STOCK")

      return {
        itemId: item.id,
        sku: item.sku,
        barcode: item.barcode,
        name: item.name,
        category: item.category,
        baseUnit: item.baseUnit,
        profileId: saved?.id || null,
        isConfiguredInDb: Boolean(saved),
        productionItemType,
        productionMethod,
        leadTimeDays: Number(saved?.leadTimeDays ?? item.leadTimeDays ?? 3),
        productionLeadTimeHours: Number(
          saved?.productionLeadTimeHours ?? defaultBom?.leadTimeHours ?? 4
        ),
        minStockLevel: Number(saved?.minStockLevel ?? item.minStockLevel ?? 10),
        safetyStockQty: Number(
          saved?.safetyStockQty ?? sysParams.defaultSafetyStockValue ?? 5
        ),
        lotSizingRule: saved?.lotSizingRule || sysParams.defaultLotSizingRule || "L4L",
        standardLotSize: Number(
          saved?.standardLotSize ?? sysParams.defaultMinLotSize ?? 1
        ),
        minOrderQty: Number(saved?.minOrderQty ?? sysParams.defaultMinLotSize ?? 1),
        orderMultiple: Number(
          saved?.orderMultiple ?? sysParams.defaultLotMultiple ?? 1
        ),
        defaultBomId: saved?.defaultBomId || defaultBom?.id || null,
        defaultBom,
        defaultWorkCenterId: saved?.defaultWorkCenterId || null,
        defaultWorkCenter,
        scrapTolerancePercent: Number(
          saved?.scrapTolerancePercent ?? defaultBom?.scrapRatePercent ?? 2
        ),
        backflushEnabled:
          saved?.backflushEnabled !== undefined
            ? Boolean(saved.backflushEnabled)
            : Boolean(sysParams.autoBackflushOnComplete),
        qualityCheckRequired: Boolean(saved?.qualityCheckRequired),
        notes: saved?.notes || null,
        updatedAt: saved?.updatedAt || item.updatedAt,
      }
    })
    .filter((row: any) => {
      if (params.onlyConfigured && !row.isConfiguredInDb) return false
      if (typeFilter && row.productionItemType !== typeFilter) return false
      if (methodFilter && row.productionMethod !== methodFilter) return false
      if (q) {
        const hay = `${row.sku || ""} ${row.name || ""} ${row.category || ""} ${row.defaultBom?.code || ""}`.toLowerCase()
        if (!hay.includes(q)) return false
      }
      return true
    })

  return paginateArray(combined, params.page, params.pageSize)
}

export async function upsertItemProductionProfileInDb(raw: Record<string, any>) {
  const input = validateItemProfileInput(raw)

  const item = await (prisma as any).inventoryItem.findUnique({
    where: { id: input.itemId },
  })
  if (!item) {
    throw new ProductionDomainError(
      "Üretim profili bağlanacak stok/ürün kartı bulunamadı.",
      "NOT_FOUND",
      404
    )
  }

  if (input.defaultBomId) {
    const bom = await (prisma as any).bomHeader.findUnique({
      where: { id: input.defaultBomId },
    })
    if (!bom) {
      throw new ProductionDomainError("Seçilen varsayılan reçete (BOM) bulunamadı.", "NOT_FOUND", 404)
    }
  }

  if (input.defaultWorkCenterId) {
    const wc = await (prisma as any).uretimWorkCenter.findUnique({
      where: { id: input.defaultWorkCenterId },
    })
    if (!wc) {
      throw new ProductionDomainError("Seçilen varsayılan iş merkezi bulunamadı.", "NOT_FOUND", 404)
    }
  }

  const existing = await (prisma as any).uretimItemProfile.findFirst({
    where: { itemId: input.itemId },
  })

  if (existing) {
    return await (prisma as any).uretimItemProfile.update({
      where: { id: existing.id },
      data: input,
    })
  }

  return await (prisma as any).uretimItemProfile.create({
    data: input,
  })
}

export async function deleteItemProductionProfileInDb(itemIdOrProfileId: string) {
  const all = await (prisma as any).uretimItemProfile.findMany()
  const match = all.find(
    (p: any) => p.id === itemIdOrProfileId || p.itemId === itemIdOrProfileId
  )
  if (!match) {
    throw new ProductionDomainError("Silinecek ürün üretim profili bulunamadı.", "NOT_FOUND", 404)
  }

  return await (prisma as any).uretimItemProfile.delete({
    where: { id: match.id },
  })
}

// ═══════════════════════════════════════════════════════════════════════════════
// 6. BİRLEŞİK ANA VERİ ÖZETİ (SNAPSHOT) — TEK ÇAĞRIDA N+1 OLMADAN TÜM VERİ
// ═══════════════════════════════════════════════════════════════════════════════

export async function getProductionMasterDataSnapshotFromDb(params: {
  branchId?: string | null
  page?: number | string | null
  pageSize?: number | string | null
} = {}) {
  const [
    workCentersPage,
    machinesPage,
    calendarsPage,
    itemProfilesPage,
    parameters,
    allShifts,
    allHolidays,
    allExceptions,
    allBoms,
    warehouses,
  ] = await Promise.all([
    listWorkCentersInDb({ branchId: params.branchId, page: params.page, pageSize: params.pageSize }),
    listMachineAssetsInDb({ branchId: params.branchId, page: params.page, pageSize: params.pageSize }),
    listWorkCalendarsInDb({ branchId: params.branchId, page: params.page, pageSize: params.pageSize }),
    listItemProductionProfilesInDb({ page: params.page, pageSize: params.pageSize }),
    getProductionParametersFromDb(params.branchId, false),
    (prisma as any).uretimShift.findMany({ orderBy: { startTime: "asc" } }),
    (prisma as any).uretimCalendarHoliday.findMany({ orderBy: { holidayDate: "asc" } }),
    (prisma as any).uretimCalendarException.findMany({ orderBy: { exceptionDate: "asc" } }),
    (prisma as any).bomHeader.findMany(),
    (prisma as any).warehouse.findMany({ where: { isActive: true } }).catch(() => []),
  ])

  const activeWorkCenters = workCentersPage.items.filter((wc: any) => wc.isActive)
  const totalEffectiveDailyCapacity = activeWorkCenters.reduce(
    (sum: number, wc: any) =>
      sum + Number(wc.capacityMetrics?.effectiveDailyCapacityUnits || 0),
    0
  )

  return {
    summary: {
      workCenterCount: workCentersPage.pagination.totalCount,
      activeWorkCenterCount: activeWorkCenters.length,
      machineAssetCount: machinesPage.pagination.totalCount,
      activeMachineCount: machinesPage.items.filter((m: any) => m.status === "ACTIVE").length,
      calendarCount: calendarsPage.pagination.totalCount,
      shiftCount: allShifts.length,
      holidayCount: allHolidays.length,
      exceptionCount: allExceptions.length,
      configuredItemProfileCount: itemProfilesPage.items.filter(
        (p: any) => p.isConfiguredInDb
      ).length,
      totalCatalogItemCount: itemProfilesPage.pagination.totalCount,
      totalEffectiveDailyCapacity: Number(totalEffectiveDailyCapacity.toFixed(2)),
    },
    workCenters: workCentersPage,
    machines: machinesPage,
    calendars: calendarsPage,
    itemProfiles: itemProfilesPage,
    parameters,
    lookups: {
      shifts: allShifts,
      holidays: allHolidays,
      exceptions: allExceptions,
      boms: allBoms,
      warehouses,
    },
  }
}
