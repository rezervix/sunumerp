/**
 * Lojistik Raporları — Canlı Veritabanı Hesaplama ve Sunucu Tarafı Yetki/Bayrak Doğrulama Servisi
 */

import { prisma } from "@/lib/db"
import { checkPermission, type AuthPayload } from "@/lib/auth/server-permission"
import { getServerLogisticsFeatureFlags } from "@/lib/system-config"
import { getLogisticsScopeContext, LogisticsDomainError } from "@/lib/logistics/security"
import {
  LOGISTICS_REPORT_MODULE_DEFS,
  formatReportCurrencyTry,
  formatReportDateTr,
  type LogisticsReportChartPoint,
  type LogisticsReportColumn,
  type LogisticsReportFilters,
  type LogisticsReportModuleDefinition,
  type LogisticsReportModuleKey,
  type LogisticsReportPayload,
  type LogisticsReportSummaryCard,
} from "./constantsAndHelpers"

function round2(n: number): number {
  return Math.round((Number.isFinite(n) ? n : 0) * 100) / 100
}

function toDate(value: unknown): Date | null {
  if (!value) return null
  const d = value instanceof Date ? value : new Date(String(value))
  return Number.isNaN(d.getTime()) ? null : d
}

function matchesDateRange(value: unknown, filters: LogisticsReportFilters): boolean {
  if (!filters.dateFrom && !filters.dateTo) return true
  const dt = toDate(value)
  if (!dt) return false
  if (filters.dateFrom) {
    const from = new Date(`${filters.dateFrom}T00:00:00.000Z`)
    if (!Number.isNaN(from.getTime()) && dt.getTime() < from.getTime()) return false
  }
  if (filters.dateTo) {
    const to = new Date(`${filters.dateTo}T23:59:59.999Z`)
    if (!Number.isNaN(to.getTime()) && dt.getTime() > to.getTime()) return false
  }
  return true
}

export async function resolveAuthorizedReportModules(
  payload: AuthPayload,
  branchId?: string | null
): Promise<LogisticsReportModuleDefinition[]> {
  const scope = await getLogisticsScopeContext(payload, branchId ?? undefined)
  if (scope.isSupplierScoped) {
    throw new LogisticsDomainError(
      "FORBIDDEN_SUPPLIER_SCOPE",
      "Dış tedarikçi portal hesapları dahili lojistik raporlarına erişemez.",
      403
    )
  }

  const flags = getServerLogisticsFeatureFlags(branchId)
  const permitted: LogisticsReportModuleDefinition[] = []

  for (const def of LOGISTICS_REPORT_MODULE_DEFS) {
    if (!flags[def.flagKey]) continue
    if (scope.isSuperAdmin || scope.isPlatformDeveloper) {
      permitted.push(def)
      continue
    }
    const allowed = await checkPermission(
      payload.userId,
      branchId ?? payload.branchId,
      def.resource,
      "read"
    )
    if (allowed) permitted.push(def)
  }

  return permitted
}

export async function assertReportModuleAccess(
  payload: AuthPayload,
  moduleKey: LogisticsReportModuleKey,
  branchId?: string | null
): Promise<LogisticsReportModuleDefinition> {
  const def = LOGISTICS_REPORT_MODULE_DEFS.find((d) => d.key === moduleKey)
  if (!def) {
    throw new LogisticsDomainError("VALIDATION_ERROR", `Geçersiz rapor modülü: ${moduleKey}`, 400)
  }

  const scope = await getLogisticsScopeContext(payload, branchId ?? undefined)
  if (scope.isSupplierScoped) {
    throw new LogisticsDomainError(
      "FORBIDDEN_SUPPLIER_SCOPE",
      "Dış tedarikçi portal hesapları lojistik raporlarına erişemez.",
      403
    )
  }

  const flags = getServerLogisticsFeatureFlags(branchId)
  if (!flags[def.flagKey]) {
    throw new LogisticsDomainError(
      "FEATURE_DISABLED",
      `${def.shortTitle} modülü devre dışı olduğundan bu rapora erişilemez (${def.flagKey}).`,
      403,
      { moduleKey }
    )
  }

  if (!scope.isSuperAdmin && !scope.isPlatformDeveloper) {
    const allowed = await checkPermission(
      payload.userId,
      branchId ?? payload.branchId,
      def.resource,
      "read"
    )
    if (!allowed) {
      throw new LogisticsDomainError(
        "FORBIDDEN",
        `${def.shortTitle} raporunu görüntüleme yetkiniz yok.`,
        403,
        { resource: def.resource }
      )
    }
  }

  return def
}

async function generateWmsReport(filters: LogisticsReportFilters): Promise<LogisticsReportPayload> {
  const [warehouses, items, balances, movements, countSessions, tasks] = await Promise.all([
    prisma.warehouse.findMany({ where: { isActive: true } }).catch(() => []),
    prisma.inventoryItem.findMany({ where: { isActive: true } }).catch(() => []),
    prisma.stockBalance.findMany().catch(() => []),
    prisma.stockMovement.findMany().catch(() => []),
    prisma.inventoryCountSession.findMany().catch(() => []),
    prisma.wmsTask.findMany().catch(() => []),
  ])

  const filteredWarehouses = filters.warehouseId
    ? warehouses.filter((w: any) => w.id === filters.warehouseId)
    : warehouses

  const itemMap = new Map<string, any>(items.map((i: any) => [i.id, i]))
  const warehouseSet = new Set(filteredWarehouses.map((w: any) => w.id))

  const rows: Array<Record<string, string | number | null>> = []
  const chartData: LogisticsReportChartPoint[] = []

  let totalOnHand = 0
  let totalAvailable = 0
  let totalReserved = 0
  let totalQuarantine = 0
  let totalValueTry = 0
  let totalCapM3 = 0
  let totalUsedM3 = 0

  for (const wh of filteredWarehouses) {
    const whBalances = balances.filter((b: any) => b.warehouseId === wh.id)
    const skuIds = new Set(whBalances.map((b: any) => b.itemId))
    let onHand = 0
    let avail = 0
    let reserved = 0
    let quarantine = 0
    let valTry = 0

    for (const b of whBalances) {
      const q = Number(b.onHandQty || 0)
      onHand += q
      avail += Number(b.availableQty || 0)
      reserved += Number(b.reservedQty || 0)
      quarantine += Number(b.quarantineQty || 0)
      const item = itemMap.get(b.itemId)
      const cost = Number(item?.currentAvgCost || item?.fifoUnitCost || item?.standardCost || 0)
      valTry += q * cost
    }

    const whMovCount = movements.filter(
      (m: any) => m.warehouseId === wh.id && matchesDateRange(m.createdAt, filters)
    ).length

    const cap = Number(wh.capacityVolumeM3 || 0)
    const used = Number(wh.usedVolumeM3 || 0)
    const occPct = cap > 0 ? round2((used / cap) * 100) : 0

    totalOnHand += onHand
    totalAvailable += avail
    totalReserved += reserved
    totalQuarantine += quarantine
    totalValueTry += valTry
    totalCapM3 += cap
    totalUsedM3 += used

    rows.push({
      code: wh.code,
      name: wh.name,
      type: wh.type,
      skuCount: skuIds.size,
      onHandQty: round2(onHand),
      availableQty: round2(avail),
      reservedQty: round2(reserved),
      quarantineQty: round2(quarantine),
      movementCount: whMovCount,
      occupancyPct: occPct,
      inventoryValueTry: round2(valTry),
    })

    chartData.push({
      name: wh.code || wh.name,
      primaryValue: round2(onHand),
      secondaryValue: occPct,
      primaryLabel: "Eldeki Stok (Adet)",
      secondaryLabel: "Doluluk (%)",
    })
  }

  const reconciled = countSessions.filter(
    (c: any) =>
      (!filters.warehouseId || c.warehouseId === filters.warehouseId) &&
      ["APPROVED", "RECONCILED"].includes(String(c.status || ""))
  )
  const stockAccuracyPct =
    reconciled.length > 0
      ? round2(
          reconciled.reduce(
            (s: number, c: any) =>
              s + Math.max(0, 100 - Math.abs(Number(c.variancePercent || 0))),
            0
          ) / reconciled.length
        )
      : 100

  const overallOccPct = totalCapM3 > 0 ? round2((totalUsedM3 / totalCapM3) * 100) : 0
  const openTasks = tasks.filter(
    (t: any) =>
      (!filters.warehouseId || t.warehouseId === filters.warehouseId) &&
      !["COMPLETED", "CANCELLED"].includes(String(t.status || "")) &&
      warehouseSet.size > 0
  ).length

  const summaryCards: LogisticsReportSummaryCard[] = [
    { label: "Toplam Eldeki Stok", value: `${round2(totalOnHand).toLocaleString("tr-TR")} adet`, hint: `${round2(totalAvailable).toLocaleString("tr-TR")} kullanılabilir` },
    { label: "Rezerve / Karantina", value: `${round2(totalReserved)} / ${round2(totalQuarantine)}`, hint: `${openTasks} açık WMS görevi` },
    { label: "Stok Değeri (TRY)", value: formatReportCurrencyTry(totalValueTry), hint: `${filteredWarehouses.length} aktif depo` },
    { label: "Doluluk / Doğruluk", value: `%${overallOccPct} / %${stockAccuracyPct}`, hint: `${reconciled.length} mahsuplaşmış sayım` },
  ]

  const columns: LogisticsReportColumn[] = [
    { key: "code", label: "Depo Kodu" },
    { key: "name", label: "Depo Adı" },
    { key: "type", label: "Tip" },
    { key: "skuCount", label: "Kalem Sayısı", format: "number" },
    { key: "onHandQty", label: "Eldeki", format: "number" },
    { key: "availableQty", label: "Kullanılabilir", format: "number" },
    { key: "reservedQty", label: "Rezerve", format: "number" },
    { key: "quarantineQty", label: "Karantina", format: "number" },
    { key: "movementCount", label: "Hareket", format: "number" },
    { key: "occupancyPct", label: "Doluluk %", format: "percent" },
    { key: "inventoryValueTry", label: "Stok Değeri", format: "currency" },
  ]

  return {
    moduleKey: "wms",
    title: "Depo Doluluk & Stok Doğruluğu Raporu",
    subtitle: "Depo bazlı stok seviyeleri, karantina/rezerve dağılımı ve hacim doluluğu.",
    generatedAt: new Date().toISOString(),
    filtersApplied: filters,
    summaryCards,
    chartTitle: "Depo Bazlı Stok ve Doluluk Dağılımı",
    chartData,
    columns,
    rows,
    filterOptions: {
      warehouses: warehouses.map((w: any) => ({ id: w.id, label: `${w.code} — ${w.name}` })),
    },
  }
}

async function generateProcurementReport(filters: LogisticsReportFilters): Promise<LogisticsReportPayload> {
  const [suppliers, pos, snapshots] = await Promise.all([
    prisma.supplier.findMany().catch(() => []),
    (prisma as any).lojistikPurchaseOrder.findMany().catch(() => []),
    (prisma as any).lojistikSupplierScoreSnapshot.findMany().catch(() => []),
  ])

  const filteredSuppliers = filters.supplierId
    ? suppliers.filter((s: any) => s.id === filters.supplierId)
    : suppliers

  const snapshotBySupplier = new Map<string, any>()
  for (const sn of snapshots) {
    if (sn.periodKey === "LIVE" || !snapshotBySupplier.has(sn.supplierId)) {
      snapshotBySupplier.set(sn.supplierId, sn)
    }
  }

  const now = new Date()
  const rows: Array<Record<string, string | number | null>> = []
  const chartData: LogisticsReportChartPoint[] = []

  let totalPoCount = 0
  let openPoCount = 0
  let overduePoCount = 0
  let totalPoAmount = 0

  for (const sup of filteredSuppliers) {
    const supPos = pos.filter(
      (p: any) =>
        p.supplierId === sup.id &&
        (!filters.warehouseId || p.warehouseId === filters.warehouseId) &&
        matchesDateRange(p.createdAt || p.expectedDeliveryDate, filters)
    )
    const closedStatuses = new Set(["TESLIM_ALINDI", "TAMAMLANDI", "IPTAL"])
    const openPos = supPos.filter((p: any) => !closedStatuses.has(String(p.status || "")))
    const overdue = openPos.filter((p: any) => {
      const due = toDate(p.promisedDeliveryDate) || toDate(p.expectedDeliveryDate)
      return Boolean(due && due.getTime() < now.getTime())
    })
    const amount = supPos.reduce((s: number, p: any) => s + Number(p.agreedTotalAmount || 0), 0)

    totalPoCount += supPos.length
    openPoCount += openPos.length
    overduePoCount += overdue.length
    totalPoAmount += amount

    const snap = snapshotBySupplier.get(sup.id)
    const otdRate = Number(snap?.otdRate ?? 100)
    const qualityRate = Number(snap?.qualityAcceptanceRate ?? 100)
    const compositeScore = Number(snap?.compositeScore ?? 100)
    const tier = snap?.tier || "B"

    rows.push({
      code: sup.code || sup.id.slice(0, 8),
      name: sup.name,
      tier,
      poCount: supPos.length,
      openPoCount: openPos.length,
      overduePoCount: overdue.length,
      totalAmountTry: round2(amount),
      otdRate: round2(otdRate),
      qualityRate: round2(qualityRate),
      compositeScore: round2(compositeScore),
    })

    chartData.push({
      name: sup.name.slice(0, 18),
      primaryValue: round2(compositeScore),
      secondaryValue: round2(otdRate),
      primaryLabel: "Bileşik Skor",
      secondaryLabel: "OTD (%)",
    })
  }

  const avgScore =
    rows.length > 0
      ? round2(rows.reduce((s, r) => s + Number(r.compositeScore || 0), 0) / rows.length)
      : 0
  const avgOtd =
    rows.length > 0
      ? round2(rows.reduce((s, r) => s + Number(r.otdRate || 0), 0) / rows.length)
      : 0

  return {
    moduleKey: "satinalma",
    title: "Tedarikçi Performansı & Satınalma (PO) Raporu",
    subtitle: "Tedarikçi zamanında teslim (OTD), kalite kabul oranları ve PO hacim özeti.",
    generatedAt: new Date().toISOString(),
    filtersApplied: filters,
    summaryCards: [
      { label: "Aktif Tedarikçi", value: String(filteredSuppliers.length), hint: `Ort. bileşik skor ${avgScore}/100` },
      { label: "Toplam / Açık PO", value: `${totalPoCount} / ${openPoCount}`, hint: `${overduePoCount} geciken PO` },
      { label: "Toplam PO Hacmi", value: formatReportCurrencyTry(totalPoAmount), hint: "Onaylı & açık sözleşmeler" },
      { label: "Ortalama OTD %", value: `%${avgOtd}`, hint: "Teslim zamanında uyum oranı" },
    ],
    chartTitle: "Tedarikçi Bileşik Skor & OTD Kıyaslaması",
    chartData,
    columns: [
      { key: "code", label: "Kod" },
      { key: "name", label: "Tedarikçi Ünvanı" },
      { key: "tier", label: "Seviye" },
      { key: "poCount", label: "PO Adedi", format: "number" },
      { key: "openPoCount", label: "Açık PO", format: "number" },
      { key: "overduePoCount", label: "Geciken", format: "number" },
      { key: "totalAmountTry", label: "Toplam Tutar", format: "currency" },
      { key: "otdRate", label: "OTD %", format: "percent" },
      { key: "qualityRate", label: "Kalite %", format: "percent" },
      { key: "compositeScore", label: "Bileşik Skor", format: "number" },
    ],
    rows,
    filterOptions: {
      suppliers: suppliers.map((s: any) => ({ id: s.id, label: s.name })),
    },
  }
}

async function generateDispatchReport(filters: LogisticsReportFilters): Promise<LogisticsReportPayload> {
  const [trips, stops, vehicles, edocs] = await Promise.all([
    (prisma as any).lojistikShipmentTrip.findMany().catch(() => []),
    (prisma as any).lojistikShipmentStop.findMany().catch(() => []),
    (prisma as any).lojistikVehicle.findMany().catch(() => []),
    prisma.eDocumentRecord.findMany().catch(() => []),
  ])

  const filteredTrips = trips.filter(
    (t: any) =>
      (!filters.vehicleId || t.vehicleId === filters.vehicleId) &&
      (!filters.warehouseId || t.originWarehouseId === filters.warehouseId) &&
      matchesDateRange(t.plannedDepartureAt || t.createdAt, filters)
  )

  const stopsByTrip = new Map<string, any[]>()
  for (const st of stops) {
    const arr = stopsByTrip.get(st.tripId) ?? []
    arr.push(st)
    stopsByTrip.set(st.tripId, arr)
  }

  const invoiceByTrip = new Map<string, { draft: number; issued: number }>()
  for (const doc of edocs) {
    if (doc.documentType !== "E_FATURA" || !doc.shipmentTripId) continue
    const entry = invoiceByTrip.get(doc.shipmentTripId) ?? { draft: 0, issued: 0 }
    if ((doc.documentStatus || "KESILDI") === "TASLAK") entry.draft++
    else entry.issued++
    invoiceByTrip.set(doc.shipmentTripId, entry)
  }

  const rows: Array<Record<string, string | number | null>> = []
  const chartData: LogisticsReportChartPoint[] = []

  let totalBaselineKm = 0
  let totalPlannedKm = 0
  let totalStops = 0
  let deliveredStops = 0
  let draftInvoices = 0
  let issuedInvoices = 0

  for (const trip of filteredTrips) {
    const tripStops = stopsByTrip.get(trip.id) ?? []
    const deliv = tripStops.filter((s: any) =>
      ["TESLIM_EDILDI", "KISMI_TESLIM"].includes(String(s.status || ""))
    ).length
    const baseKm = Number(trip.baselineUnoptimizedDistanceKm || trip.plannedDistanceKm || 0)
    const planKm = Number(trip.plannedDistanceKm || 0)
    const savingKm = Math.max(0, baseKm - planKm)
    const invCounts = invoiceByTrip.get(trip.id) ?? { draft: 0, issued: 0 }

    totalBaselineKm += baseKm
    totalPlannedKm += planKm
    totalStops += tripStops.length
    deliveredStops += deliv
    draftInvoices += invCounts.draft
    issuedInvoices += invCounts.issued

    rows.push({
      tripNumber: trip.tripNumber,
      title: trip.title,
      vehiclePlate: trip.vehiclePlate || "-",
      status: trip.status,
      plannedDate: trip.plannedDepartureAt,
      stopsSummary: `${deliv}/${tripStops.length}`,
      baselineKm: round2(baseKm),
      plannedKm: round2(planKm),
      savingKm: round2(savingKm),
      loadPct: round2(Number(trip.capacityLoadPct || 0)),
      invoiceSummary: `${invCounts.issued} Kesin / ${invCounts.draft} Taslak`,
    })

    chartData.push({
      name: trip.tripNumber,
      primaryValue: round2(planKm),
      secondaryValue: round2(baseKm),
      primaryLabel: "Optimize Plan Km",
      secondaryLabel: "Optimizasyon Öncesi Km",
    })
  }

  const totalSavingKm = round2(Math.max(0, totalBaselineKm - totalPlannedKm))
  const savingPct = totalBaselineKm > 0 ? round2((totalSavingKm / totalBaselineKm) * 100) : 0
  const stopSuccessPct = totalStops > 0 ? round2((deliveredStops / totalStops) * 100) : 0

  return {
    moduleKey: "sevkiyat",
    title: "Sevkiyat Sefer Maliyeti & Rota Optimizasyonu Raporu",
    subtitle: "Sefer kilometre kazanımları, durak teslim başarı oranları ve E-Fatura durumları.",
    generatedAt: new Date().toISOString(),
    filtersApplied: filters,
    summaryCards: [
      { label: "Sefer Sayısı", value: String(filteredTrips.length), hint: `${deliveredStops}/${totalStops} durak teslim` },
      { label: "Planlanan / Kazanım Km", value: `${round2(totalPlannedKm)} km`, hint: `${totalSavingKm} km tasarruf (%${savingPct})` },
      { label: "Durak Teslim Başarısı", value: `%${stopSuccessPct}`, hint: `${totalStops} toplam durak` },
      { label: "E-Fatura (Kesin / Taslak)", value: `${issuedInvoices} / ${draftInvoices}`, hint: "e-POD kaynaklı faturalar" },
    ],
    chartTitle: "Sefer Bazlı Optimize vs Başlangıç Kilometre Kıyaslaması",
    chartData,
    columns: [
      { key: "tripNumber", label: "Sefer No" },
      { key: "title", label: "Sefer Başlığı" },
      { key: "vehiclePlate", label: "Plaka" },
      { key: "status", label: "Durum" },
      { key: "plannedDate", label: "Plan Tarihi", format: "date" },
      { key: "stopsSummary", label: "Durak (Teslim/Top.)" },
      { key: "baselineKm", label: "Opt. Öncesi Km", format: "number" },
      { key: "plannedKm", label: "Plan Km", format: "number" },
      { key: "savingKm", label: "Tasarruf Km", format: "number" },
      { key: "loadPct", label: "Doluluk %", format: "percent" },
      { key: "invoiceSummary", label: "E-Fatura" },
    ],
    rows,
    filterOptions: {
      vehicles: vehicles.map((v: any) => ({ id: v.id, label: `${v.plate} (${v.brand} ${v.model})` })),
    },
  }
}

async function generateFleetReport(filters: LogisticsReportFilters): Promise<LogisticsReportPayload> {
  const [vehicles, fuelLogs, workOrders, leases, docs, penalties, co2Factors] = await Promise.all([
    (prisma as any).lojistikVehicle.findMany().catch(() => []),
    (prisma as any).lojistikFuelLog.findMany().catch(() => []),
    (prisma as any).lojistikVehicleMaintenanceWorkOrder.findMany().catch(() => []),
    (prisma as any).lojistikVehicleLease.findMany().catch(() => []),
    (prisma as any).lojistikVehicleDocument.findMany().catch(() => []),
    (prisma as any).lojistikTrafficPenalty.findMany().catch(() => []),
    (prisma as any).lojistikCo2EmissionFactor.findMany().catch(() => []),
  ])

  const filteredVehicles = filters.vehicleId
    ? vehicles.filter((v: any) => v.id === filters.vehicleId)
    : vehicles

  const co2ByFuelType = new Map<string, number>()
  for (const cf of co2Factors) {
    co2ByFuelType.set(String(cf.fuelType || "DIESEL"), Number(cf.kgCo2ePerLiter || 2.68))
  }

  const rows: Array<Record<string, string | number | null>> = []
  const chartData: LogisticsReportChartPoint[] = []

  let totalFuelTry = 0
  let totalMaintTry = 0
  let totalFixedTry = 0
  let totalTcoTry = 0
  let totalCo2Kg = 0
  let totalKm = 0
  let totalAnomalies = 0

  for (const v of filteredVehicles) {
    const vFuels = fuelLogs.filter(
      (f: any) => f.vehicleId === v.id && matchesDateRange(f.fuelDate || f.createdAt, filters)
    )
    const vMaint = workOrders.filter(
      (w: any) => w.vehicleId === v.id && matchesDateRange(w.openedAt || w.createdAt, filters)
    )
    const vLeases = leases.filter((l: any) => l.vehicleId === v.id)
    const vDocs = docs.filter((d: any) => d.vehicleId === v.id)
    const vPenalties = penalties.filter((p: any) => p.vehicleId === v.id)

    const fuelTry = vFuels.reduce((s: number, f: any) => s + Number(f.totalAmountTry || 0), 0)
    const liters = vFuels.reduce((s: number, f: any) => s + Number(f.liters || 0), 0)
    const anomalies = vFuels.filter((f: any) => Boolean(f.isAnomaly)).length
    const maintTry = vMaint.reduce(
      (s: number, w: any) => s + Number(w.actualCostTry || w.estimatedCostTry || 0),
      0
    )
    const fixedTry =
      vLeases.reduce((s: number, l: any) => s + Number(l.monthlyInstallmentTry || 0), 0) +
      Number(v.monthlyDepreciationTry || 0) +
      vDocs.reduce((s: number, d: any) => s + Number(d.costTry || 0), 0) +
      vPenalties.reduce((s: number, p: any) => s + Number(p.amountTry || 0), 0)

    const tco = fuelTry + maintTry + fixedTry
    const odo = Number(v.odometerKm || 0)
    const costPerKm = odo > 0 ? tco / odo : 0
    const factor = co2ByFuelType.get(String(v.fuelType || "DIESEL")) ?? 2.68
    const co2Kg = liters * factor

    totalFuelTry += fuelTry
    totalMaintTry += maintTry
    totalFixedTry += fixedTry
    totalTcoTry += tco
    totalCo2Kg += co2Kg
    totalKm += odo
    totalAnomalies += anomalies

    rows.push({
      plate: v.plate,
      model: `${v.brand} ${v.model}`,
      status: v.status,
      odometerKm: round2(odo),
      fuelCostTry: round2(fuelTry),
      maintenanceCostTry: round2(maintTry),
      fixedAndPenaltyTry: round2(fixedTry),
      totalTcoTry: round2(tco),
      costPerKmTry: round2(costPerKm),
      co2Kg: round2(co2Kg),
    })

    chartData.push({
      name: v.plate,
      primaryValue: round2(fuelTry + maintTry),
      secondaryValue: round2(tco),
      primaryLabel: "Yakıt + Bakım (TRY)",
      secondaryLabel: "Toplam TCO (TRY)",
    })
  }

  const avgCostPerKm = totalKm > 0 ? round2(totalTcoTry / totalKm) : 0

  return {
    moduleKey: "filo",
    title: "Filo TCO, Yakıt & Tahmini CO₂ Maliyet Raporu",
    subtitle: "Araç bazlı işletme maliyeti, yakıt tüketim anomalileri ve DEFRA katsayılı CO₂ emisyonu.",
    generatedAt: new Date().toISOString(),
    filtersApplied: filters,
    summaryCards: [
      { label: "Toplam Filo TCO", value: formatReportCurrencyTry(totalTcoTry), hint: `Ort. ${formatReportCurrencyTry(avgCostPerKm)} / km` },
      { label: "Yakıt / Bakım", value: formatReportCurrencyTry(totalFuelTry), hint: `Bakım: ${formatReportCurrencyTry(totalMaintTry)}` },
      { label: "Sabit / Kira / Belge", value: formatReportCurrencyTry(totalFixedTry), hint: `${totalAnomalies} yakıt anomalisi` },
      { label: "Tahmini CO₂ Emisyonu *", value: `${round2(totalCo2Kg).toLocaleString("tr-TR")} kg`, hint: `${round2(totalKm).toLocaleString("tr-TR")} toplam km` },
    ],
    chartTitle: "Araç Bazlı TCO Maliyet Dağılımı (TRY)",
    chartData,
    columns: [
      { key: "plate", label: "Plaka" },
      { key: "model", label: "Marka / Model" },
      { key: "status", label: "Durum" },
      { key: "odometerKm", label: "Kilometre", format: "number" },
      { key: "fuelCostTry", label: "Yakıt", format: "currency" },
      { key: "maintenanceCostTry", label: "Bakım", format: "currency" },
      { key: "fixedAndPenaltyTry", label: "Sabit/Belge/Ceza", format: "currency" },
      { key: "totalTcoTry", label: "Toplam TCO", format: "currency" },
      { key: "costPerKmTry", label: "Km Başı", format: "currency" },
      { key: "co2Kg", label: "Tahmini CO₂ (kg)", format: "number" },
    ],
    rows,
    filterOptions: {
      vehicles: vehicles.map((v: any) => ({ id: v.id, label: `${v.plate} (${v.brand} ${v.model})` })),
    },
  }
}

async function generateReturnsReport(filters: LogisticsReportFilters): Promise<LogisticsReportPayload> {
  const [rmas, creditNotes] = await Promise.all([
    prisma.returnRmaRecord.findMany().catch(() => []),
    (prisma as any).lojistikRmaCreditNote.findMany().catch(() => []),
  ])

  const channels = Array.from(new Set(rmas.map((r: any) => String(r.channelCode || "GENEL"))))
  const filteredRmas = rmas.filter(
    (r: any) =>
      (!filters.channelCode || r.channelCode === filters.channelCode) &&
      matchesDateRange(r.createdAt, filters)
  )

  const creditByRma = new Map<string, any>(creditNotes.map((c: any) => [c.rmaId, c]))
  const byReason = new Map<string, { count: number; amount: number }>()

  const rows: Array<Record<string, string | number | null>> = []
  let totalRefundTry = 0
  let restockCount = 0
  let quarantineOrScrapCount = 0

  for (const rma of filteredRmas) {
    const refund = Number(rma.refundAmount || 0)
    totalRefundTry += refund
    if (rma.qcInspectionResult === "RESTOCK_CLEAN") restockCount++
    if (["QUARANTINE", "SCRAP", "SUPPLIER_CLAIM"].includes(String(rma.qcInspectionResult || ""))) {
      quarantineOrScrapCount++
    }

    const rKey = rma.reasonCode || "DIGER"
    const prev = byReason.get(rKey) ?? { count: 0, amount: 0 }
    prev.count += 1
    prev.amount += refund
    byReason.set(rKey, prev)

    const cn = creditByRma.get(rma.id)

    rows.push({
      rmaNumber: rma.rmaNumber,
      orderNumber: rma.orderNumber,
      channelCode: rma.channelCode,
      customerName: rma.customerName,
      sku: rma.sku,
      returnQty: Number(rma.returnQty || 0),
      reasonCode: rma.reasonCode || "-",
      qcResult: rma.qcInspectionResult,
      rmaStatus: rma.rmaStatus,
      refundAmountTry: round2(refund),
      creditNoteStatus: cn?.status || "-",
    })
  }

  const chartData: LogisticsReportChartPoint[] = Array.from(byReason.entries()).map(
    ([reason, stats]) => ({
      name: reason,
      primaryValue: round2(stats.amount),
      secondaryValue: stats.count,
      primaryLabel: "İade Tutarı (TRY)",
      secondaryLabel: "RMA Adedi",
    })
  )

  const approvedCreditSum = creditNotes
    .filter((c: any) => ["ONAYLANDI", "IADE_ODENDI"].includes(String(c.status || "")))
    .reduce((s: number, c: any) => s + Number(c.grossAmount || 0), 0)

  return {
    moduleKey: "omnichannel",
    title: "İade, RMA & Alacak Dekontu Analiz Raporu",
    subtitle: "İade talepleri, kalite kontrol nihai kararları ve alacak dekontu mahsuplaşmaları.",
    generatedAt: new Date().toISOString(),
    filtersApplied: filters,
    summaryCards: [
      { label: "Toplam RMA Talebi", value: String(filteredRmas.length), hint: `${restockCount} sağlam stoğa alındı` },
      { label: "Karantina / Hurda", value: String(quarantineOrScrapCount), hint: "KK sonrası ayrıştırılan" },
      { label: "Toplam İade Tutarı", value: formatReportCurrencyTry(totalRefundTry), hint: `Onaylı dekont: ${formatReportCurrencyTry(approvedCreditSum)}` },
      { label: "Rapor Tarihi", value: formatReportDateTr(new Date()), hint: `${channels.length} aktif satış kanalı` },
    ],
    chartTitle: "İade Neden Koduna Göre Tutar ve Adet Dağılımı",
    chartData,
    columns: [
      { key: "rmaNumber", label: "RMA No" },
      { key: "orderNumber", label: "Sipariş No" },
      { key: "channelCode", label: "Kanal" },
      { key: "customerName", label: "Müşteri" },
      { key: "sku", label: "SKU" },
      { key: "returnQty", label: "Adet", format: "number" },
      { key: "reasonCode", label: "Neden Kodu" },
      { key: "qcResult", label: "KK Kararı" },
      { key: "rmaStatus", label: "Durum" },
      { key: "refundAmountTry", label: "İade Tutarı", format: "currency" },
      { key: "creditNoteStatus", label: "Dekont" },
    ],
    rows,
    filterOptions: {
      channels,
    },
  }
}

export async function generateLogisticsReport(
  moduleKey: LogisticsReportModuleKey,
  filters: LogisticsReportFilters = {}
): Promise<LogisticsReportPayload> {
  if (moduleKey === "wms") return generateWmsReport(filters)
  if (moduleKey === "satinalma") return generateProcurementReport(filters)
  if (moduleKey === "sevkiyat") return generateDispatchReport(filters)
  if (moduleKey === "filo") return generateFleetReport(filters)
  return generateReturnsReport(filters)
}
