/**
 * Lojistik & Operasyon 6 Akıllı Bildirim Kuralı + Kullanıcı Tercihi & 24 Saat İdempotency Motoru
 *
 * Kurallar:
 * 1. DELAYED_SHIPMENT — Geciken sevkiyat veya ETA aşımı
 * 2. CRITICAL_STOCK_SHORTAGE — Minimum emniyet stoku altına düşen kalemler
 * 3. OVERDUE_PURCHASE_ORDER — Teslim tarihi geçmiş açık satınalma siparişleri
 * 4. FLEET_DOC_MAINT_EXPIRING — Yaklaşan araç/sürücü belgesi veya periyodik bakım
 * 5. RMA_DEADLINE_EXPIRING — SLA/iade süresi dolmak üzere veya bekleyen RMA kayıtları
 * 6. ANOMALOUS_FUEL_CONSUMPTION — Anomalili yakıt tüketim kayıtları
 */

import { prisma } from "@/lib/db"
import { getServerLogisticsFeatureFlags } from "@/lib/system-config"
import { createNotificationMany } from "@/lib/services/notificationService"
import { isPlatformDeveloperUser, isSuperAdminUser } from "@/lib/auth/server-permission"
import { normalizePermissionAction, normalizePermissionResource, normalizePermissionsObject } from "@/lib/auth/permissions"
import { TEDARIKCI_ROLE_NAME } from "@/lib/logistics/constants"
import {
  ALL_LOGISTICS_ALERT_RULE_KEYS,
  LOGISTICS_ALERT_RULE_DEFINITIONS,
  parseUserLogisticsNotificationPrefs,
  type LogisticsAlertRuleDefinition,
  type LogisticsAlertRuleKey,
} from "./constantsAndHelpers"

export interface DetectedLogisticsAlertItem {
  ruleKey: LogisticsAlertRuleKey
  dedupKey: string
  entityId: string
  title: string
  message: string
  type: "warning" | "error"
  link: string
}

export interface LogisticsAlertRuleEvaluationStats {
  detected: number
  dispatched: number
  skippedByPref: number
  skippedByDedup: number
  items: DetectedLogisticsAlertItem[]
}

export interface EvaluateLogisticsAlertsResult {
  evaluatedAt: string
  activeAlertsCount: number
  dispatchesCreated: number
  skippedByPref: number
  skippedByDedup: number
  byRule: Record<LogisticsAlertRuleKey, LogisticsAlertRuleEvaluationStats>
}

interface InternalRecipient {
  userId: string
  username: string
  isSuperOrGlobalAdmin: boolean
  allowedResources: Set<string>
  prefs: ReturnType<typeof parseUserLogisticsNotificationPrefs>
}

const DEDUP_WINDOW_MS = 24 * 60 * 60 * 1000

function toDate(value: unknown): Date | null {
  if (!value) return null
  const d = value instanceof Date ? value : new Date(String(value))
  return Number.isNaN(d.getTime()) ? null : d
}

function formatShortDateTr(d: Date | null): string {
  if (!d) return "-"
  return d.toLocaleDateString("tr-TR", { day: "2-digit", month: "2-digit", year: "numeric" })
}

async function resolveInternalRecipients(
  filterUserIds?: string[]
): Promise<InternalRecipient[]> {
  const users: any[] = await prisma.user.findMany({ where: { isActive: true } }).catch(() => [])
  const targetSet = filterUserIds && filterUserIds.length > 0 ? new Set(filterUserIds) : null

  const branchRoles: any[] = await prisma.userBranchRole
    .findMany({ include: { role: true } })
    .catch(() => [])

  const rolesByUser = new Map<string, any[]>()
  for (const ubr of branchRoles) {
    const arr = rolesByUser.get(ubr.userId) ?? []
    arr.push(ubr)
    rolesByUser.set(ubr.userId, arr)
  }

  const recipients: InternalRecipient[] = []
  for (const user of users) {
    if (targetSet && !targetSet.has(user.id)) continue

    const userBranches = rolesByUser.get(user.id) ?? []
    const [superAdmin, platformDev] = await Promise.all([
      isSuperAdminUser(user.id),
      isPlatformDeveloperUser(user.id, user.username),
    ])

    const hasSuperRoleName = userBranches.some((ubr) =>
      ["Super Admin", "Yonetim Kurulu Uyesi", "Genel Mudur"].includes(
        String(ubr.role?.name || "")
      )
    )
    const isSuperOrGlobalAdmin = superAdmin || platformDev || hasSuperRoleName
    const hasSupplierRole = userBranches.some((ubr) => ubr.role?.name === TEDARIKCI_ROLE_NAME)
    if (!isSuperOrGlobalAdmin && hasSupplierRole) {
      continue
    }

    const allowedResources = new Set<string>()
    for (const ubr of userBranches) {
      if (!ubr.role?.permissions) continue
      let parsed: Record<string, string[]> = {}
      try {
        parsed = JSON.parse(ubr.role.permissions)
      } catch {
        continue
      }
      const normObj = normalizePermissionsObject(parsed)
      for (const [rawRes, actions] of Object.entries(normObj)) {
        const resKey = normalizePermissionResource(rawRes)
        const hasRead =
          Array.isArray(actions) &&
          actions.some((a) => {
            const act = normalizePermissionAction(a)
            return act === "read" || act === "view" || act === "manage"
          })
        if (hasRead) allowedResources.add(resKey)
      }
    }

    // Dış tedarikçi olmayıp hiç lojistik modül okuma yetkisi yoksa bildirim gönderme
    if (!isSuperOrGlobalAdmin && allowedResources.size === 0) {
      continue
    }

    recipients.push({
      userId: user.id,
      username: user.username,
      isSuperOrGlobalAdmin,
      allowedResources,
      prefs: parseUserLogisticsNotificationPrefs(user.logisticsNotificationPrefsJson),
    })
  }

  return recipients
}

async function detectDelayedShipments(
  now: Date,
  def: LogisticsAlertRuleDefinition
): Promise<DetectedLogisticsAlertItem[]> {
  const [trips, stops] = await Promise.all([
    (prisma as any).lojistikShipmentTrip.findMany().catch(() => []),
    (prisma as any).lojistikShipmentStop.findMany().catch(() => []),
  ])

  const stopsByTrip = new Map<string, any[]>()
  for (const stop of stops) {
    const arr = stopsByTrip.get(stop.tripId) ?? []
    arr.push(stop)
    stopsByTrip.set(stop.tripId, arr)
  }

  const alerts: DetectedLogisticsAlertItem[] = []
  const activeTripStatuses = new Set(["ONAYLANDI", "YUKLENIYOR", "YOLDA", "TESLIMAT_SURUYOR"])
  const activeStopStatuses = new Set(["BEKLIYOR", "YOLDA", "VARISTA"])

  for (const trip of trips) {
    if (!activeTripStatuses.has(String(trip.status || ""))) continue

    const tripStops = stopsByTrip.get(trip.id) ?? []
    const delayedStops = tripStops.filter((s) => {
      if (!activeStopStatuses.has(String(s.status || ""))) return false
      if (Number(s.delayMinutes || 0) > 15) return true
      const eta = toDate(s.plannedEtaAt)
      return Boolean(eta && eta.getTime() < now.getTime() - 15 * 60 * 1000)
    })

    const plannedCompletion = toDate(trip.plannedCompletionAt)
    const tripOverdue = Boolean(
      plannedCompletion && plannedCompletion.getTime() < now.getTime() - 15 * 60 * 1000
    )

    if (!tripOverdue && delayedStops.length === 0) continue

    const maxDelayMin = Math.max(
      0,
      ...delayedStops.map((s) => Number(s.delayMinutes || 0)),
      plannedCompletion
        ? Math.round((now.getTime() - plannedCompletion.getTime()) / 60000)
        : 0
    )

    alerts.push({
      ruleKey: "DELAYED_SHIPMENT",
      dedupKey: `DELAYED_SHIPMENT:${trip.id}`,
      entityId: trip.id,
      title: `Sevkiyat Gecikmesi: ${trip.tripNumber}`,
      message: `${trip.title || trip.tripNumber} (${trip.vehiclePlate || "Araçsız"}) seferinde ${
        delayedStops.length > 0
          ? `${delayedStops.length} durak ETA aşımında`
          : "planlanan bitiş saati aşıldı"
      }${maxDelayMin > 0 ? ` (~${maxDelayMin} dk gecikme)` : ""}.`,
      type: "warning",
      link: def.link,
    })
  }

  return alerts
}

async function detectCriticalStockShortages(
  def: LogisticsAlertRuleDefinition
): Promise<DetectedLogisticsAlertItem[]> {
  const [items, balances] = await Promise.all([
    prisma.inventoryItem.findMany({ where: { isActive: true } }).catch(() => []),
    prisma.stockBalance.findMany().catch(() => []),
  ])

  const availableByItem = new Map<string, number>()
  const balanceCountByItem = new Map<string, number>()

  for (const b of balances) {
    availableByItem.set(b.itemId, (availableByItem.get(b.itemId) ?? 0) + Number(b.availableQty || 0))
    balanceCountByItem.set(b.itemId, (balanceCountByItem.get(b.itemId) ?? 0) + 1)
  }

  const alerts: DetectedLogisticsAlertItem[] = []
  for (const item of items) {
    const minLevel = Number(item.minStockLevel || 0)
    if (minLevel <= 0) continue
    // Stok hareketi/bakiyesi tanımlanmış aktif ürünleri değerlendir
    if (!balanceCountByItem.has(item.id)) continue
    const totalAvail = availableByItem.get(item.id) ?? 0
    if (totalAvail < minLevel) {
      alerts.push({
        ruleKey: "CRITICAL_STOCK_SHORTAGE",
        dedupKey: `CRITICAL_STOCK_SHORTAGE:${item.id}`,
        entityId: item.id,
        title: `Kritik Stok Uyarısı: ${item.sku}`,
        message: `${item.name} (${item.sku}) kullanılabilir toplam stoğu ${totalAvail} ${item.baseUnit}, minimum emniyet stokunun (${minLevel} ${item.baseUnit}) altına düştü.`,
        type: "error",
        link: def.link,
      })
    }
  }

  return alerts
}

async function detectOverduePurchaseOrders(
  now: Date,
  def: LogisticsAlertRuleDefinition
): Promise<DetectedLogisticsAlertItem[]> {
  const pos: any[] = await (prisma as any).lojistikPurchaseOrder.findMany().catch(() => [])
  const closedStatuses = new Set(["TESLIM_ALINDI", "TAMAMLANDI", "IPTAL"])
  const alerts: DetectedLogisticsAlertItem[] = []

  for (const po of pos) {
    if (closedStatuses.has(String(po.status || ""))) continue
    const dueDate = toDate(po.promisedDeliveryDate) || toDate(po.expectedDeliveryDate)
    if (!dueDate || dueDate.getTime() >= now.getTime()) continue

    const overdueDays = Math.max(1, Math.floor((now.getTime() - dueDate.getTime()) / (24 * 60 * 60 * 1000)))
    alerts.push({
      ruleKey: "OVERDUE_PURCHASE_ORDER",
      dedupKey: `OVERDUE_PURCHASE_ORDER:${po.id}`,
      entityId: po.id,
      title: `Gecikmiş Satınalma Siparişi: ${po.poNumber}`,
      message: `${po.poNumber} numaralı PO teslim tarihi (${formatShortDateTr(
        dueDate
      )}) ${overdueDays} gün gecikti. Güncel durum: ${po.status}.`,
      type: "warning",
      link: def.link,
    })
  }

  return alerts
}

async function detectFleetDocAndMaintExpiring(
  now: Date,
  def: LogisticsAlertRuleDefinition
): Promise<DetectedLogisticsAlertItem[]> {
  const [vehicles, docs, drivers, plans] = await Promise.all([
    (prisma as any).lojistikVehicle.findMany().catch(() => []),
    (prisma as any).lojistikVehicleDocument.findMany().catch(() => []),
    (prisma as any).lojistikDriver.findMany({ where: { isActive: true } }).catch(() => []),
    (prisma as any).lojistikVehicleMaintenancePlan.findMany({ where: { isActive: true } }).catch(() => []),
  ])

  const vehicleById = new Map<string, any>(vehicles.map((v: any) => [v.id, v]))
  const alerts: DetectedLogisticsAlertItem[] = []

  for (const doc of docs) {
    const expiresAt = toDate(doc.expiresAt)
    if (!expiresAt) continue
    const vehicle = vehicleById.get(doc.vehicleId)
    if (vehicle && vehicle.status === "OUT_OF_SERVICE") continue

    const reminderDays = Math.max(15, Number(doc.reminderDaysBefore || 30))
    const cutoff = now.getTime() + reminderDays * 24 * 60 * 60 * 1000
    if (expiresAt.getTime() <= cutoff) {
      const daysLeft = Math.ceil((expiresAt.getTime() - now.getTime()) / (24 * 60 * 60 * 1000))
      alerts.push({
        ruleKey: "FLEET_DOC_MAINT_EXPIRING",
        dedupKey: `FLEET_DOC_MAINT_EXPIRING:doc:${doc.id}`,
        entityId: doc.id,
        title: `Araç Belge Süresi: ${vehicle?.plate || doc.vehicleId}`,
        message: `${vehicle?.plate || "Araç"} için ${doc.docType} belgesinin bitiş tarihi (${formatShortDateTr(
          expiresAt
        )}) ${daysLeft < 0 ? `${Math.abs(daysLeft)} gün geçti` : `${daysLeft} gün içinde doluyor`}.`,
        type: daysLeft <= 0 ? "error" : "warning",
        link: def.link,
      })
    }
  }

  const thirtyDaysMs = 30 * 24 * 60 * 60 * 1000
  for (const driver of drivers) {
    const checks: Array<{ field: string; label: string; dt: Date | null }> = [
      { field: "license", label: "Ehliyet", dt: toDate(driver.licenseExpiresAt) },
      { field: "src", label: "SRC Belgesi", dt: toDate(driver.srcExpiresAt) },
      { field: "psychotech", label: "Psikoteknik", dt: toDate(driver.psychotechExpiresAt) },
    ]
    for (const c of checks) {
      if (!c.dt) continue
      if (c.dt.getTime() <= now.getTime() + thirtyDaysMs) {
        const daysLeft = Math.ceil((c.dt.getTime() - now.getTime()) / (24 * 60 * 60 * 1000))
        alerts.push({
          ruleKey: "FLEET_DOC_MAINT_EXPIRING",
          dedupKey: `FLEET_DOC_MAINT_EXPIRING:driver:${driver.id}:${c.field}`,
          entityId: `${driver.id}:${c.field}`,
          title: `Sürücü Belge Uyarısı: ${driver.fullName}`,
          message: `${driver.fullName} sürücüsünün ${c.label} geçerlilik tarihi (${formatShortDateTr(
            c.dt
          )}) ${daysLeft < 0 ? `${Math.abs(daysLeft)} gün geçmiş` : `${daysLeft} gün kaldı`}.`,
          type: daysLeft <= 0 ? "error" : "warning",
          link: def.link,
        })
      }
    }
  }

  const fourteenDaysMs = 14 * 24 * 60 * 60 * 1000
  for (const plan of plans) {
    const vehicle = plan.vehicleId ? vehicleById.get(plan.vehicleId) : null
    if (vehicle && vehicle.status === "OUT_OF_SERVICE") continue
    const nextDate = toDate(plan.nextScheduledDate)
    const dateDue = Boolean(nextDate && nextDate.getTime() <= now.getTime() + fourteenDaysMs)
    const kmRemaining =
      vehicle && Number(plan.frequencyKm || 0) > 0
        ? (Number(plan.lastTriggeredKm || 0) + Number(plan.frequencyKm)) - Number(vehicle.odometerKm || 0)
        : null
    const kmDue = kmRemaining !== null && kmRemaining <= 750

    if (!dateDue && !kmDue) continue

    alerts.push({
      ruleKey: "FLEET_DOC_MAINT_EXPIRING",
      dedupKey: `FLEET_DOC_MAINT_EXPIRING:plan:${plan.id}`,
      entityId: plan.id,
      title: `Yaklaşan Periyodik Bakım: ${vehicle?.plate || plan.code}`,
      message: `${plan.name} (${vehicle?.plate || "Genel"}) bakım planı ${
        kmDue && kmRemaining !== null
          ? `yaklaşık ${Math.max(0, Math.round(kmRemaining))} km içinde`
          : `${formatShortDateTr(nextDate)} tarihinde`
      } yapılmalıdır.`,
      type: "warning",
      link: def.link,
    })
  }

  return alerts
}

async function detectRmaDeadlineExpiring(
  now: Date,
  def: LogisticsAlertRuleDefinition
): Promise<DetectedLogisticsAlertItem[]> {
  const rmas: any[] = await (prisma as any).returnRmaRecord.findMany().catch(() => [])
  const closedStatuses = new Set(["TAMAMLANDI", "REDDEDILDI", "IPTAL", "IADE_ODENDI"])
  const threeDaysMs = 3 * 24 * 60 * 60 * 1000
  const alerts: DetectedLogisticsAlertItem[] = []

  for (const rma of rmas) {
    if (closedStatuses.has(String(rma.rmaStatus || ""))) continue
    const deadlineAt = toDate(rma.returnDeadlineAt)
    const createdAt = toDate(rma.createdAt)
    const nearDeadline = Boolean(deadlineAt && deadlineAt.getTime() <= now.getTime() + threeDaysMs)
    const agingPendingQc = Boolean(
      rma.qcInspectionResult === "PENDING_INSPECTION" &&
        createdAt &&
        now.getTime() - createdAt.getTime() >= 48 * 60 * 60 * 1000
    )
    if (!nearDeadline && !agingPendingQc) continue

    alerts.push({
      ruleKey: "RMA_DEADLINE_EXPIRING",
      dedupKey: `RMA_DEADLINE_EXPIRING:${rma.id}`,
      entityId: rma.id,
      title: `RMA SLA / İnceleme Uyarısı: ${rma.rmaNumber}`,
      message: `${rma.rmaNumber} (${rma.customerName}) iade kaydında ${
        nearDeadline && deadlineAt
          ? `iade son tarihi (${formatShortDateTr(deadlineAt)}) yaklaştı/doldu`
          : "kalite kontrol incelemesi 48 saati aştı"
      }.`,
      type: "warning",
      link: def.link,
    })
  }

  return alerts
}

async function detectAnomalousFuelConsumption(
  def: LogisticsAlertRuleDefinition
): Promise<DetectedLogisticsAlertItem[]> {
  const [fuelLogs, vehicles] = await Promise.all([
    (prisma as any).lojistikFuelLog.findMany().catch(() => []),
    (prisma as any).lojistikVehicle.findMany().catch(() => []),
  ])
  const vehicleById = new Map<string, any>(vehicles.map((v: any) => [v.id, v]))
  const alerts: DetectedLogisticsAlertItem[] = []

  for (const log of fuelLogs) {
    const vehicle = vehicleById.get(log.vehicleId)
    const expected = Number(vehicle?.expectedLPer100Km || 0)
    const calc = Number(log.calculatedLPer100Km || 0)
    const highRatio = expected > 0 && calc > expected * 1.25
    if (!log.isAnomaly && !highRatio) continue

    alerts.push({
      ruleKey: "ANOMALOUS_FUEL_CONSUMPTION",
      dedupKey: `ANOMALOUS_FUEL_CONSUMPTION:${log.id}`,
      entityId: log.id,
      title: `Anomalili Yakıt Tüketimi: ${vehicle?.plate || log.vehicleId}`,
      message: `${vehicle?.plate || "Araç"} yakıt kaydında (${formatShortDateTr(
        toDate(log.fuelDate)
      )}) ${log.liters} L tüketim tespit edildi${
        calc > 0 ? ` (${calc.toFixed(1)} L/100km)` : ""
      }${log.anomalyNote ? ` — ${log.anomalyNote}` : ""}.`,
      type: "error",
      link: def.link,
    })
  }

  return alerts
}

function buildRecentDedupIndex(recentNotifications: any[], cutoffMs: number): Set<string> {
  const keys = new Set<string>()
  for (const n of recentNotifications) {
    const createdAt = toDate(n.createdAt)
    if (!createdAt || createdAt.getTime() < cutoffMs) continue

    if (typeof n.content === "string" && n.content.trim().startsWith("{")) {
      try {
        const parsed = JSON.parse(n.content)
        if (parsed?.dedupKey) {
          keys.add(`${n.userId}::${parsed.dedupKey}`)
        }
      } catch {
        // ignore non-json content
      }
    }
    if (n.title && n.moduleType === "lojistik") {
      keys.add(`${n.userId}::TITLE::${n.title}`)
    }
  }
  return keys
}

export async function evaluateAndDispatchLogisticsAlerts(params?: {
  now?: Date
  recipientUserIds?: string[]
  dryRun?: boolean
  respectFlags?: boolean
  ruleFilter?: LogisticsAlertRuleKey[]
}): Promise<EvaluateLogisticsAlertsResult> {
  const now = params?.now ?? new Date()
  const respectFlags = params?.respectFlags ?? true
  const flags = getServerLogisticsFeatureFlags()
  const ruleFilterSet = params?.ruleFilter ? new Set(params.ruleFilter) : null

  const byRule = {} as Record<LogisticsAlertRuleKey, LogisticsAlertRuleEvaluationStats>
  for (const key of ALL_LOGISTICS_ALERT_RULE_KEYS) {
    byRule[key] = { detected: 0, dispatched: 0, skippedByPref: 0, skippedByDedup: 0, items: [] }
  }

  const allDetected: DetectedLogisticsAlertItem[] = []
  for (const def of LOGISTICS_ALERT_RULE_DEFINITIONS) {
    if (ruleFilterSet && !ruleFilterSet.has(def.key)) continue
    if (respectFlags && !flags[def.flagKey]) continue

    let items: DetectedLogisticsAlertItem[] = []
    if (def.key === "DELAYED_SHIPMENT") items = await detectDelayedShipments(now, def)
    else if (def.key === "CRITICAL_STOCK_SHORTAGE") items = await detectCriticalStockShortages(def)
    else if (def.key === "OVERDUE_PURCHASE_ORDER") items = await detectOverduePurchaseOrders(now, def)
    else if (def.key === "FLEET_DOC_MAINT_EXPIRING") items = await detectFleetDocAndMaintExpiring(now, def)
    else if (def.key === "RMA_DEADLINE_EXPIRING") items = await detectRmaDeadlineExpiring(now, def)
    else if (def.key === "ANOMALOUS_FUEL_CONSUMPTION") items = await detectAnomalousFuelConsumption(def)

    byRule[def.key].detected = items.length
    byRule[def.key].items = items
    allDetected.push(...items)
  }

  const recipients = await resolveInternalRecipients(params?.recipientUserIds)
  const cutoffMs = now.getTime() - DEDUP_WINDOW_MS
  const existingNotifications: any[] = await prisma.notification
    .findMany({ where: { moduleType: "lojistik" } })
    .catch(() => [])
  const dedupIndex = buildRecentDedupIndex(existingNotifications, cutoffMs)

  const defMap = new Map(LOGISTICS_ALERT_RULE_DEFINITIONS.map((d) => [d.key, d]))
  const toDispatch: Array<{
    ruleKey: LogisticsAlertRuleKey
    payload: {
      userId: string
      title: string
      message: string
      type: string
      moduleType: string
      content: string
      link: string
    }
  }> = []

  let skippedByPref = 0
  let skippedByDedup = 0

  for (const alert of allDetected) {
    const def = defMap.get(alert.ruleKey)!
    for (const recipient of recipients) {
      if (!recipient.isSuperOrGlobalAdmin && !recipient.allowedResources.has(normalizePermissionResource(def.moduleResource))) {
        continue
      }
      if (!recipient.prefs.inAppEnabled || !recipient.prefs.rules[alert.ruleKey]) {
        skippedByPref++
        byRule[alert.ruleKey].skippedByPref++
        continue
      }
      const userDedupKey = `${recipient.userId}::${alert.dedupKey}`
      const userTitleKey = `${recipient.userId}::TITLE::${alert.title}`
      if (dedupIndex.has(userDedupKey) || dedupIndex.has(userTitleKey)) {
        skippedByDedup++
        byRule[alert.ruleKey].skippedByDedup++
        continue
      }

      dedupIndex.add(userDedupKey)
      toDispatch.push({
        ruleKey: alert.ruleKey,
        payload: {
          userId: recipient.userId,
          title: alert.title,
          message: alert.message,
          type: alert.type,
          moduleType: "lojistik",
          content: JSON.stringify({
            ruleKey: alert.ruleKey,
            dedupKey: alert.dedupKey,
            entityId: alert.entityId,
            evaluatedAt: now.toISOString(),
          }),
          link: alert.link,
        },
      })
    }
  }

  let dispatchesCreated = 0
  if (!params?.dryRun && toDispatch.length > 0) {
    const created = await createNotificationMany(toDispatch.map((d) => d.payload))
    dispatchesCreated = created.length
    for (const item of toDispatch) {
      byRule[item.ruleKey].dispatched++
    }
  }

  return {
    evaluatedAt: now.toISOString(),
    activeAlertsCount: allDetected.length,
    dispatchesCreated,
    skippedByPref,
    skippedByDedup,
    byRule,
  }
}
