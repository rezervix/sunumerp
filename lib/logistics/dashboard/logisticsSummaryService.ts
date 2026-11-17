/**
 * Rol Bazlı Lojistik Yönetim Özeti Servisi (/dashboard & /api/logistics/dashboard-summary)
 *
 * KURALLAR:
 * - Yalnızca kullanıcının `read` yetkisine sahip olduğu VE özellik bayrağı açık olan modülleri hesaplar.
 * - Tedarikçi kapsamındaki dış hesaplar için tüm özet engellenir (403).
 * - Rapor indirme / tab mantığı içermez; yalnızca özet KPI kartları ve /dashboard/lojistik-raporlar bağlantısı sağlar.
 */

import { prisma } from "@/lib/db"
import { checkPermission } from "@/lib/auth/server-permission"
import type { AuthPayload } from "@/lib/auth/server-permission"
import { getServerLogisticsFeatureFlags } from "@/lib/system-config"
import { getLogisticsScopeContext, LogisticsDomainError } from "@/lib/logistics/security"
import type { LogisticsFeatureFlagKey } from "@/lib/logistics/types"

export type LogisticsSummaryModuleKey = "wms" | "satinalma" | "sevkiyat" | "filo" | "iade"

export interface LogisticsExecutiveSummaryResponse {
  evaluatedAt: string
  permittedModules: LogisticsSummaryModuleKey[]
  activeFlags: Record<LogisticsFeatureFlagKey, boolean>
  canOpenReports: boolean
  modules: {
    wms?: {
      warehouseCount: number
      totalOnHandQty: number
      totalAvailableQty: number
      totalReservedQty: number
      totalQuarantineQty: number
      inventoryValueTry: number
      criticalStockCount: number
      openTaskCount: number
      activeReservationCount: number
      occupancyRatePct: number
    }
    satinalma?: {
      activeSupplierCount: number
      openPoCount: number
      overduePoCount: number
      openPoAmountTry: number
      avgSupplierScore: number
      pendingAsnCount: number
    }
    sevkiyat?: {
      totalTrips: number
      activeTripCount: number
      completedTripCount: number
      deliveredStopsCount: number
      failedStopsCount: number
      onTimeDeliveryRatePct: number
      draftEInvoiceCount: number
      issuedEInvoiceCount: number
      maintenanceImpactedTripCount: number
    }
    filo?: {
      totalVehicles: number
      activeVehicles: number
      inTransitVehicles: number
      faultOrMaintVehicles: number
      expiringDocsCount: number
      anomalousFuelCount: number
      totalFuelCostTry: number
      totalMaintenanceCostTry: number
    }
    iade?: {
      totalRmaCount: number
      openRmaCount: number
      pendingQcCount: number
      completedRmaCount: number
      totalRefundAmountTry: number
      openCreditNoteCount: number
    }
  }
}

const MODULE_ACCESS_MAP: Array<{
  key: LogisticsSummaryModuleKey
  flagKey: LogisticsFeatureFlagKey
  resource: string
}> = [
  { key: "wms", flagKey: "lojistik_wms", resource: "lojistik_wms" },
  { key: "satinalma", flagKey: "lojistik_tedarikci", resource: "lojistik_tedarikci" },
  { key: "sevkiyat", flagKey: "lojistik_sevkiyat_rota", resource: "lojistik_sevkiyat_rota" },
  { key: "filo", flagKey: "lojistik_filo", resource: "lojistik_filo" },
  { key: "iade", flagKey: "lojistik_iade", resource: "lojistik_iade" },
]

function round2(n: number): number {
  return Math.round((Number.isFinite(n) ? n : 0) * 100) / 100
}

function toDate(value: unknown): Date | null {
  if (!value) return null
  const d = value instanceof Date ? value : new Date(String(value))
  return Number.isNaN(d.getTime()) ? null : d
}

export async function resolvePermittedLogisticsModulesForUser(
  payload: AuthPayload,
  branchId?: string | null
) {
  const scope = await getLogisticsScopeContext(payload, branchId ?? undefined)
  if (scope.isSupplierScoped) {
    throw new LogisticsDomainError(
      "FORBIDDEN_SUPPLIER_SCOPE",
      "Dış tedarikçi portal hesapları dahili lojistik özetine erişemez.",
      403
    )
  }

  const activeFlags = getServerLogisticsFeatureFlags(branchId)
  const permittedModules: LogisticsSummaryModuleKey[] = []

  for (const mod of MODULE_ACCESS_MAP) {
    if (!activeFlags[mod.flagKey]) continue
    if (scope.isSuperAdmin || scope.isPlatformDeveloper) {
      permittedModules.push(mod.key)
      continue
    }
    const allowed = await checkPermission(
      payload.userId,
      branchId ?? payload.branchId,
      mod.resource,
      "read"
    )
    if (allowed) permittedModules.push(mod.key)
  }

  return { scope, activeFlags, permittedModules }
}

export async function getLogisticsExecutiveSummaryForUser(
  payload: AuthPayload,
  branchId?: string | null
): Promise<LogisticsExecutiveSummaryResponse> {
  const { activeFlags, permittedModules } = await resolvePermittedLogisticsModulesForUser(
    payload,
    branchId
  )
  const permittedSet = new Set(permittedModules)
  const now = new Date()

  const modules: LogisticsExecutiveSummaryResponse["modules"] = {}

  if (permittedSet.has("wms")) {
    const [warehouses, items, balances, tasks, reservations] = await Promise.all([
      prisma.warehouse.findMany({ where: { isActive: true } }).catch(() => []),
      prisma.inventoryItem.findMany({ where: { isActive: true } }).catch(() => []),
      prisma.stockBalance.findMany().catch(() => []),
      prisma.wmsTask.findMany().catch(() => []),
      (prisma as any).lojistikStockReservation.findMany().catch(() => []),
    ])

    const itemById = new Map<string, any>(items.map((i: any) => [i.id, i]))
    const availByItem = new Map<string, number>()
    let totalOnHandQty = 0
    let totalAvailableQty = 0
    let totalReservedQty = 0
    let totalQuarantineQty = 0
    let inventoryValueTry = 0

    for (const b of balances) {
      const onHand = Number(b.onHandQty || 0)
      const avail = Number(b.availableQty || 0)
      const res = Number(b.reservedQty || 0)
      const quar = Number(b.quarantineQty || 0)
      totalOnHandQty += onHand
      totalAvailableQty += avail
      totalReservedQty += res
      totalQuarantineQty += quar
      availByItem.set(b.itemId, (availByItem.get(b.itemId) ?? 0) + avail)

      const item = itemById.get(b.itemId)
      const unitCost = Number(
        item?.currentAvgCost || item?.fifoUnitCost || item?.standardCost || 0
      )
      inventoryValueTry += onHand * unitCost
    }

    let criticalStockCount = 0
    for (const item of items) {
      if (Number(item.minStockLevel || 0) > 0 && availByItem.has(item.id)) {
        if ((availByItem.get(item.id) ?? 0) < Number(item.minStockLevel)) {
          criticalStockCount++
        }
      }
    }

    const totalCapM3 = warehouses.reduce((s: number, w: any) => s + Number(w.capacityVolumeM3 || 0), 0)
    const totalUsedM3 = warehouses.reduce((s: number, w: any) => s + Number(w.usedVolumeM3 || 0), 0)
    const occupancyRatePct = totalCapM3 > 0 ? round2((totalUsedM3 / totalCapM3) * 100) : 0

    const openTaskCount = tasks.filter(
      (t: any) => !["COMPLETED", "CANCELLED"].includes(String(t.status || ""))
    ).length
    const activeReservationCount = reservations.filter((r: any) =>
      ["ACTIVE", "PARTIAL"].includes(String(r.status || ""))
    ).length

    modules.wms = {
      warehouseCount: warehouses.length,
      totalOnHandQty: round2(totalOnHandQty),
      totalAvailableQty: round2(totalAvailableQty),
      totalReservedQty: round2(totalReservedQty),
      totalQuarantineQty: round2(totalQuarantineQty),
      inventoryValueTry: round2(inventoryValueTry),
      criticalStockCount,
      openTaskCount,
      activeReservationCount,
      occupancyRatePct,
    }
  }

  if (permittedSet.has("satinalma")) {
    const [suppliers, pos, snapshots, asns] = await Promise.all([
      prisma.supplier.findMany().catch(() => []),
      (prisma as any).lojistikPurchaseOrder.findMany().catch(() => []),
      (prisma as any).lojistikSupplierScoreSnapshot.findMany().catch(() => []),
      (prisma as any).lojistikSupplierAsn.findMany().catch(() => []),
    ])

    const closedPoStatuses = new Set(["TESLIM_ALINDI", "TAMAMLANDI", "IPTAL"])
    const openPos = pos.filter((p: any) => !closedPoStatuses.has(String(p.status || "")))
    const overduePos = openPos.filter((p: any) => {
      const due = toDate(p.promisedDeliveryDate) || toDate(p.expectedDeliveryDate)
      return Boolean(due && due.getTime() < now.getTime())
    })
    const openPoAmountTry = openPos.reduce(
      (s: number, p: any) => s + Number(p.agreedTotalAmount || 0),
      0
    )

    const liveSnapshots = snapshots.filter((s: any) => s.periodKey === "LIVE")
    const usedSnapshots = liveSnapshots.length > 0 ? liveSnapshots : snapshots
    const avgSupplierScore =
      usedSnapshots.length > 0
        ? round2(
            usedSnapshots.reduce((s: number, sn: any) => s + Number(sn.compositeScore || 0), 0) /
              usedSnapshots.length
          )
        : 0

    const pendingAsnCount = asns.filter(
      (a: any) => !["KABUL_TAMAM", "IPTAL"].includes(String(a.status || ""))
    ).length

    modules.satinalma = {
      activeSupplierCount: suppliers.filter((s: any) => s.isActive !== false).length,
      openPoCount: openPos.length,
      overduePoCount: overduePos.length,
      openPoAmountTry: round2(openPoAmountTry),
      avgSupplierScore,
      pendingAsnCount,
    }
  }

  if (permittedSet.has("sevkiyat")) {
    const [trips, stops, edocs] = await Promise.all([
      (prisma as any).lojistikShipmentTrip.findMany().catch(() => []),
      (prisma as any).lojistikShipmentStop.findMany().catch(() => []),
      prisma.eDocumentRecord.findMany().catch(() => []),
    ])

    const activeTripCount = trips.filter((t: any) =>
      ["ONAYLANDI", "YUKLENIYOR", "YOLDA", "TESLIMAT_SURUYOR"].includes(String(t.status || ""))
    ).length
    const completedTripCount = trips.filter((t: any) => t.status === "TAMAMLANDI").length
    const deliveredStops = stops.filter((s: any) =>
      ["TESLIM_EDILDI", "KISMI_TESLIM"].includes(String(s.status || ""))
    )
    const failedStopsCount = stops.filter((s: any) => s.status === "TESLIM_EDILEMEDI").length
    const onTimeDelivered = deliveredStops.filter((s: any) => Number(s.delayMinutes || 0) <= 15).length
    const onTimeDeliveryRatePct =
      deliveredStops.length > 0 ? round2((onTimeDelivered / deliveredStops.length) * 100) : 0

    const salesInvoices = edocs.filter((d: any) => d.documentType === "E_FATURA")
    const draftEInvoiceCount = salesInvoices.filter(
      (d: any) => (d.documentStatus || "KESILDI") === "TASLAK"
    ).length
    const issuedEInvoiceCount = salesInvoices.filter(
      (d: any) => (d.documentStatus || "KESILDI") === "KESILDI"
    ).length
    const maintenanceImpactedTripCount = trips.filter(
      (t: any) => Boolean(t.maintenanceImpactWarning) && !["TAMAMLANDI", "IPTAL"].includes(String(t.status || ""))
    ).length

    modules.sevkiyat = {
      totalTrips: trips.length,
      activeTripCount,
      completedTripCount,
      deliveredStopsCount: deliveredStops.length,
      failedStopsCount,
      onTimeDeliveryRatePct,
      draftEInvoiceCount,
      issuedEInvoiceCount,
      maintenanceImpactedTripCount,
    }
  }

  if (permittedSet.has("filo")) {
    const [vehicles, docs, fuelLogs, workOrders] = await Promise.all([
      (prisma as any).lojistikVehicle.findMany().catch(() => []),
      (prisma as any).lojistikVehicleDocument.findMany().catch(() => []),
      (prisma as any).lojistikFuelLog.findMany().catch(() => []),
      (prisma as any).lojistikVehicleMaintenanceWorkOrder.findMany().catch(() => []),
    ])

    const thirtyDaysMs = 30 * 24 * 60 * 60 * 1000
    const expiringDocsCount = docs.filter((d: any) => {
      const exp = toDate(d.expiresAt)
      return Boolean(exp && exp.getTime() <= now.getTime() + thirtyDaysMs)
    }).length

    const anomalousFuelCount = fuelLogs.filter((f: any) => Boolean(f.isAnomaly)).length
    const totalFuelCostTry = round2(
      fuelLogs.reduce((s: number, f: any) => s + Number(f.totalAmountTry || 0), 0)
    )
    const totalMaintenanceCostTry = round2(
      workOrders.reduce((s: number, w: any) => s + Number(w.actualCostTry || w.estimatedCostTry || 0), 0)
    )

    modules.filo = {
      totalVehicles: vehicles.length,
      activeVehicles: vehicles.filter((v: any) => v.status === "ACTIVE").length,
      inTransitVehicles: vehicles.filter((v: any) => v.status === "IN_TRANSIT").length,
      faultOrMaintVehicles: vehicles.filter((v: any) =>
        ["FAULT", "MAINTENANCE", "OUT_OF_SERVICE"].includes(String(v.status || ""))
      ).length,
      expiringDocsCount,
      anomalousFuelCount,
      totalFuelCostTry,
      totalMaintenanceCostTry,
    }
  }

  if (permittedSet.has("iade")) {
    const [rmas, creditNotes] = await Promise.all([
      prisma.returnRmaRecord.findMany().catch(() => []),
      (prisma as any).lojistikRmaCreditNote.findMany().catch(() => []),
    ])

    const closedRmaStatuses = new Set(["TAMAMLANDI", "REDDEDILDI", "IPTAL", "IADE_ODENDI"])
    const openRmaCount = rmas.filter((r: any) => !closedRmaStatuses.has(String(r.rmaStatus || ""))).length
    const pendingQcCount = rmas.filter(
      (r: any) => !closedRmaStatuses.has(String(r.rmaStatus || "")) && r.qcInspectionResult === "PENDING_INSPECTION"
    ).length
    const completedRmaCount = rmas.filter((r: any) =>
      ["TAMAMLANDI", "IADE_ODENDI"].includes(String(r.rmaStatus || ""))
    ).length
    const totalRefundAmountTry = round2(
      rmas.reduce((s: number, r: any) => s + Number(r.refundAmount || 0), 0)
    )
    const openCreditNoteCount = creditNotes.filter(
      (c: any) => !["IADE_ODENDI", "REDDEDILDI"].includes(String(c.status || ""))
    ).length

    modules.iade = {
      totalRmaCount: rmas.length,
      openRmaCount,
      pendingQcCount,
      completedRmaCount,
      totalRefundAmountTry,
      openCreditNoteCount,
    }
  }

  return {
    evaluatedAt: now.toISOString(),
    permittedModules,
    activeFlags,
    canOpenReports: permittedModules.length > 0,
    modules,
  }
}
