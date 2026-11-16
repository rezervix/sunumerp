/**
 * Lojistik Faz 5 (lojistik_filo) — Ana Filo, Şoför, Belge, Bakım, Yakıt, TCO, CO2 & Telematik API
 *
 * KURALLAR:
 * - Tam bağımsızdır; uretim_bakim veya diğer üretim bayraklarından etkilenmez.
 * - Tedarikçi kapsamındaki dış hesaplar (403 FORBIDDEN_SUPPLIER_SCOPE) engellenir.
 * - Tüm KVKK hassas alan erişimleri sunucuda maskelenir veya yetki + audit log ile açılır.
 */

import { NextResponse } from "next/server"
import { prisma } from "@/lib/db"
import { isDemoEnvironment } from "@/lib/config/production-feature-flags"
import {
  handleLogisticsApiError,
  LogisticsDomainError,
  requireLogisticsAccess,
} from "@/lib/logistics/security"
import type { LogisticsPermissionAction } from "@/lib/logistics/types"
import {
  evaluateAndDispatchFleetExpiryAlerts,
  getDriverDetailWithKvkkLog,
  getFleetTcoAndEfficiencyReport,
  importFuelCardInvoices,
  ingestTelematicsPayloads,
  listCo2EmissionFactors,
  listFleetDocumentsAndPenalties,
  listFleetDrivers,
  listFleetFuelOverview,
  listFleetMaintenanceOverview,
  listFleetVehicles,
  listTelematicsIntegrationsOverview,
  recordFleetWorkOrderSparePart,
  recordFuelLogEntry,
  recordTrafficPenalty,
  saveTelematicsConnectionConfig,
  updateFleetWorkOrderStatus,
  upsertCo2EmissionFactor,
  upsertFleetDriver,
  upsertFleetMaintenancePlan,
  upsertFleetTire,
  upsertFleetVehicle,
  upsertVehicleDocument,
  upsertVehicleTelematicMapping,
  createFleetFaultAndOptionalWorkOrder,
  createFleetWorkOrder,
} from "@/lib/logistics/fleet"

function resolveFleetMapConfig() {
  const rawUrl = process.env.LOJISTIK_MAP_TILE_URL?.trim() || null
  const apiKey = process.env.LOJISTIK_MAP_TILE_KEY?.trim() || null

  let resolvedTileUrl: string | null = null
  if (rawUrl) {
    if (rawUrl.includes("{key}")) {
      resolvedTileUrl = apiKey ? rawUrl.replace("{key}", encodeURIComponent(apiKey)) : null
    } else if (/cartocdn\.com/i.test(rawUrl)) {
      if (rawUrl.includes("key=")) {
        resolvedTileUrl = rawUrl
      } else if (apiKey) {
        resolvedTileUrl = `${rawUrl}${rawUrl.includes("?") ? "&" : "?"}key=${encodeURIComponent(apiKey)}`
      } else {
        // CARTO anahtarsız tile'larda filigran bastığı için anahtar yoksa yerleşik kanvas altlığına düşülür
        resolvedTileUrl = null
      }
    } else {
      resolvedTileUrl = apiKey
        ? `${rawUrl}${rawUrl.includes("?") ? "&" : "?"}key=${encodeURIComponent(apiKey)}`
        : rawUrl
    }
  }

  let attribution = "© Sunum ERP Filo Harita Altlığı (Çevrimdışı Koordinat Kanvası)"
  if (resolvedTileUrl) {
    if (/carto/i.test(resolvedTileUrl)) {
      attribution = "© OpenStreetMap contributors, © CARTO"
    } else if (/openstreetmap/i.test(resolvedTileUrl)) {
      attribution = "© OpenStreetMap contributors"
    } else {
      attribution = process.env.LOJISTIK_MAP_ATTRIBUTION?.trim() || "© Harita Sağlayıcısı"
    }
  }

  return {
    tileUrl: resolvedTileUrl,
    hasExternalTileConfig: Boolean(resolvedTileUrl),
    externalTileConfiguredButMissingKey: Boolean(rawUrl && !resolvedTileUrl),
    attribution,
  }
}

async function buildLiveMapPayload(hoursBack = 48) {
  const dbAny = prisma as any
  const since = new Date(Date.now() - Math.max(1, hoursBack) * 3600_000)
  const [vehicles, drivers, events] = await Promise.all([
    dbAny.lojistikVehicle.findMany(),
    dbAny.lojistikDriver.findMany().catch(() => []),
    dbAny.lojistikTelemetryEvent.findMany({ orderBy: { eventTime: "asc" } }).catch(() => []),
  ])

  const drvById = new Map<string, any>(drivers.map((d: any) => [d.id, d]))
  const trailsByVehicle: Record<string, any[]> = {}

  for (const ev of events) {
    if (ev.lat === null || ev.lat === undefined || ev.lng === null || ev.lng === undefined) continue
    const t = new Date(ev.eventTime)
    if (t < since) continue
    if (!trailsByVehicle[ev.vehicleId]) trailsByVehicle[ev.vehicleId] = []
    trailsByVehicle[ev.vehicleId].push({
      id: ev.id,
      lat: Number(ev.lat),
      lng: Number(ev.lng),
      speedKmh: ev.speedKmh ?? null,
      eventType: ev.eventType,
      temperatureC: ev.temperatureC ?? null,
      ignitionOn: ev.ignitionOn ?? null,
      sourceOrigin: ev.sourceOrigin,
      providerCode: ev.providerCode,
      eventTime: ev.eventTime,
    })
  }

  return {
    mapConfig: resolveFleetMapConfig(),
    hoursWindow: hoursBack,
    vehicles: vehicles
      .filter((v: any) => v.isActive !== false)
      .map((v: any) => {
        const drv = v.assignedDriverId ? drvById.get(v.assignedDriverId) : null
        const trail = trailsByVehicle[v.id] || []
        const latestTrailPoint = trail[trail.length - 1]
        return {
          id: v.id,
          code: v.code,
          plate: v.plate,
          brandModel: `${v.brand} ${v.model}`,
          vehicleType: v.vehicleType,
          fuelType: v.fuelType,
          status: v.status,
          isRefrigerated: Boolean(v.isRefrigerated),
          targetTempMaxC: v.targetTempMaxC ?? null,
          odometerKm: Number(v.odometerKm || 0),
          driverName: drv?.fullName || null,
          lat: latestTrailPoint?.lat ?? v.currentLat ?? null,
          lng: latestTrailPoint?.lng ?? v.currentLng ?? null,
          speedKmh: latestTrailPoint?.speedKmh ?? v.currentSpeedKmh ?? 0,
          headingDeg: v.currentHeadingDeg ?? 0,
          temperatureC: latestTrailPoint?.temperatureC ?? v.currentTempC ?? null,
          lastTelemetryAt: latestTrailPoint?.eventTime ?? v.lastTelemetryAt ?? null,
          lastTelemetryProvider:
            v.lastTelemetryProvider ||
            (latestTrailPoint?.sourceOrigin === "DEMO_DB" ? `DEMO (${latestTrailPoint.providerCode})` : latestTrailPoint?.providerCode) ||
            null,
          sourceOrigin: latestTrailPoint?.sourceOrigin || (isDemoEnvironment() ? "DEMO_DB" : null),
          trail,
        }
      }),
  }
}

export async function GET(req: Request) {
  try {
    const access = await requireLogisticsAccess({
      flagKey: "lojistik_filo",
      resource: "lojistik_filo",
      action: "read",
    })
    if (access instanceof NextResponse) return access

    if (access.scope.isSupplierScoped) {
      throw new LogisticsDomainError(
        "FORBIDDEN_SUPPLIER_SCOPE",
        "Dış tedarikçi portal hesapları şirket içi filo modülüne erişemez.",
        403
      )
    }

    const { searchParams } = new URL(req.url)
    const section = searchParams.get("section") || "overview"
    const branchId = searchParams.get("branchId") || undefined
    const vehicleId = searchParams.get("vehicleId") || undefined
    const revealKvkk = searchParams.get("revealKvkk") === "true"

    if (section === "pickers") {
      const vehicles = await listFleetVehicles({ branchId })
      const driversRes = await listFleetDrivers({ scope: access.scope, branchId, revealSensitivePii: false })
      return NextResponse.json({
        success: true,
        vehicles: vehicles.map((v: any) => ({
          id: v.id,
          plate: v.plate,
          brandModel: `${v.brand} ${v.model}`,
          status: v.status,
          assignedDriverId: v.assignedDriverId || null,
        })),
        drivers: driversRes.drivers.map((d: any) => ({
          id: d.id,
          code: d.code,
          fullName: d.fullName,
          phoneMasked: d.phone,
          licenseClass: d.licenseClass,
          status: d.status,
        })),
      })
    }

    if (section === "vehicles") {
      const vehicles = await listFleetVehicles({
        branchId,
        status: searchParams.get("status") || undefined,
        vehicleType: searchParams.get("vehicleType") || undefined,
        search: searchParams.get("search") || undefined,
      })
      return NextResponse.json({ success: true, vehicles })
    }

    if (section === "drivers") {
      const res = await listFleetDrivers({
        scope: access.scope,
        branchId,
        status: searchParams.get("status") || undefined,
        revealSensitivePii: revealKvkk,
      })
      return NextResponse.json({ success: true, ...res })
    }

    if (section === "driver_detail") {
      const driverId = searchParams.get("driverId") || ""
      const driver = await getDriverDetailWithKvkkLog(driverId, access.scope, revealKvkk)
      return NextResponse.json({ success: true, driver })
    }

    if (section === "documents_penalties") {
      const data = await listFleetDocumentsAndPenalties(vehicleId)
      return NextResponse.json({ success: true, ...data })
    }

    if (section === "alerts") {
      const alerts = await evaluateAndDispatchFleetExpiryAlerts()
      return NextResponse.json({ success: true, ...alerts })
    }

    if (section === "maintenance") {
      const maintenance = await listFleetMaintenanceOverview(vehicleId)
      return NextResponse.json({ success: true, ...maintenance })
    }

    if (section === "fuel") {
      const fuel = await listFleetFuelOverview(vehicleId)
      return NextResponse.json({ success: true, ...fuel })
    }

    if (section === "co2_factors") {
      const factors = await listCo2EmissionFactors()
      return NextResponse.json({ success: true, factors })
    }

    if (section === "tco_efficiency") {
      const month = searchParams.get("month") || undefined
      const tcoReport = await getFleetTcoAndEfficiencyReport({ month })
      return NextResponse.json({ success: true, ...tcoReport })
    }

    if (section === "telematics") {
      const telematics = await listTelematicsIntegrationsOverview()
      return NextResponse.json({ success: true, ...telematics })
    }

    if (section === "map_live") {
      const hours = Number(searchParams.get("hours") || 48)
      const mapLive = await buildLiveMapPayload(hours)
      return NextResponse.json({ success: true, ...mapLive })
    }

    // Default: Tam Filo Snapshot (overview)
    const [
      vehicles,
      driversRes,
      docsPen,
      alerts,
      maintenance,
      fuel,
      tcoReport,
      telematics,
      mapLive,
      co2Factors,
    ] = await Promise.all([
      listFleetVehicles({ branchId }),
      listFleetDrivers({ scope: access.scope, branchId, revealSensitivePii: revealKvkk }),
      listFleetDocumentsAndPenalties(vehicleId),
      evaluateAndDispatchFleetExpiryAlerts(),
      listFleetMaintenanceOverview(vehicleId),
      listFleetFuelOverview(vehicleId),
      getFleetTcoAndEfficiencyReport({ month: searchParams.get("month") || undefined }),
      listTelematicsIntegrationsOverview(),
      buildLiveMapPayload(Number(searchParams.get("hours") || 48)),
      listCo2EmissionFactors(),
    ])

    return NextResponse.json({
      success: true,
      vehicles,
      drivers: driversRes.drivers,
      canRevealKvkkPii: driversRes.canRevealKvkkPii,
      documents: docsPen.documents,
      penalties: docsPen.penalties,
      expiryAlerts: alerts,
      maintenance,
      fuel,
      tcoReport,
      telematics,
      mapLive,
      co2Factors,
      featureFlags: {
        logisticsDemoMode: isDemoEnvironment(),
      },
    })
  } catch (error) {
    return handleLogisticsApiError(error, "Filo modülü verileri alınamadı.")
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json()
    const action = String(body.action || "").trim()

    const permissionMap: Record<string, LogisticsPermissionAction> = {
      upsert_vehicle: "update",
      upsert_driver: "update",
      upsert_document: "create",
      record_penalty: "create",
      dispatch_expiry_alerts: "create",
      upsert_maint_plan: "update",
      create_fault: "create",
      create_maint_wo: "create",
      update_maint_wo_status: "update",
      record_spare_part: "update",
      upsert_tire: "update",
      record_fuel: "create",
      import_fuel_cards: "create",
      upsert_co2_factor: "approve",
      save_telematic_connection: "approve",
      upsert_telematic_mapping: "update",
      import_telematic_events: "create",
    }

    const reqAction: LogisticsPermissionAction = permissionMap[action] || "create"
    const access = await requireLogisticsAccess({
      flagKey: "lojistik_filo",
      resource: "lojistik_filo",
      action: reqAction,
      branchId: body.branchId,
    })
    if (access instanceof NextResponse) return access

    if (access.scope.isSupplierScoped) {
      throw new LogisticsDomainError(
        "FORBIDDEN_SUPPLIER_SCOPE",
        "Dış tedarikçi portal hesapları filo üzerinde değişiklik yapamaz.",
        403
      )
    }

    const actor = { userId: access.payload.userId, branchId: access.payload.branchId }

    switch (action) {
      case "upsert_vehicle": {
        const vehicle = await upsertFleetVehicle(body, actor)
        return NextResponse.json({ success: true, vehicle, message: `${vehicle.plate} aracı kaydedildi.` })
      }
      case "upsert_driver": {
        const driver = await upsertFleetDriver(body, actor)
        return NextResponse.json({ success: true, driver, message: `Şoför kaydı güncellendi: ${driver.fullName}` })
      }
      case "upsert_document": {
        const document = await upsertVehicleDocument(body, actor)
        return NextResponse.json({ success: true, document, message: "Araç belgesi kaydedildi." })
      }
      case "record_penalty": {
        const penalty = await recordTrafficPenalty(body, actor)
        return NextResponse.json({ success: true, penalty, message: `Trafik cezası işlendi (${penalty.penaltyNo}).` })
      }
      case "dispatch_expiry_alerts": {
        const result = await evaluateAndDispatchFleetExpiryAlerts({
          dispatchNotifications: true,
          recipientUserId: body.recipientUserId || actor.userId,
        })
        return NextResponse.json({
          success: true,
          ...result,
          message: `${result.totalAlerts} uyarı tarandı, ${result.notificationsSent} yeni bildirim gönderildi.`,
        })
      }
      case "upsert_maint_plan": {
        const plan = await upsertFleetMaintenancePlan(body, actor)
        return NextResponse.json({ success: true, plan, message: `Bakım planı kaydedildi: ${plan.code}` })
      }
      case "create_fault": {
        const result = await createFleetFaultAndOptionalWorkOrder(body, actor)
        return NextResponse.json({ success: true, ...result, message: `Arıza kaydı oluşturuldu (#${result.fault.faultCode}).` })
      }
      case "create_maint_wo": {
        const workOrder = await createFleetWorkOrder(body, actor)
        return NextResponse.json({ success: true, workOrder, message: `Bakım iş emri açıldı (#${workOrder.workOrderNumber}).` })
      }
      case "update_maint_wo_status": {
        const workOrder = await updateFleetWorkOrderStatus({
          workOrderId: body.workOrderId,
          nextStatus: body.nextStatus,
          downtimeMinutes: body.downtimeMinutes,
          laborHours: body.laborHours,
          hourlyRateTry: body.hourlyRateTry,
          externalServiceCostTry: body.externalServiceCostTry,
          checklistResults: body.checklistResults,
          rootCause: body.rootCause,
          postToFinance: body.postToFinance,
          actorUserId: actor.userId,
        })
        return NextResponse.json({ success: true, workOrder, message: `İş emri durumu '${workOrder.status}' oldu.` })
      }
      case "record_spare_part": {
        const result = await recordFleetWorkOrderSparePart({
          workOrderId: body.workOrderId,
          itemId: body.itemId,
          quantityUsed: Number(body.quantityUsed || 1),
          warehouseId: body.warehouseId,
          unitCostOverride: body.unitCostOverride,
          actorUserId: actor.userId,
        })
        return NextResponse.json({ success: true, ...result, message: "Yedek parça sarfiyatı ve maliyet işlendi." })
      }
      case "upsert_tire": {
        const tire = await upsertFleetTire(body, actor)
        return NextResponse.json({ success: true, tire, message: "Lastik kaydı güncellendi." })
      }
      case "record_fuel": {
        const log = await recordFuelLogEntry(body, actor)
        return NextResponse.json({
          success: true,
          log,
          message: log.isAnomaly
            ? `Yakıt kaydedildi — DİKKAT: Anormal tüketim (${log.calculatedLPer100Km} L/100km)`
            : "Yakıt kaydı işlendi.",
        })
      }
      case "import_fuel_cards": {
        const rows = Array.isArray(body.rows) ? body.rows : []
        const result = await importFuelCardInvoices(rows, actor)
        return NextResponse.json({
          success: true,
          ...result,
          message: `${result.imported} yeni içe aktarım, ${result.reconciled} fatura mutabakatı tamamlandı.`,
        })
      }
      case "upsert_co2_factor": {
        const factor = await upsertCo2EmissionFactor(body, actor)
        return NextResponse.json({ success: true, factor, message: `${factor.fuelType} CO2 katsayısı güncellendi.` })
      }
      case "save_telematic_connection": {
        const connection = await saveTelematicsConnectionConfig({
          providerCode: body.providerCode,
          baseUrl: body.baseUrl,
          isEnabled: body.isEnabled,
          fieldMapping: body.fieldMapping,
          actorUserId: actor.userId,
          actorName: access.payload.username || actor.userId,
        })
        return NextResponse.json({ success: true, connection, message: `${connection.displayName} yapılandırması kaydedildi.` })
      }
      case "upsert_telematic_mapping": {
        const mapping = await upsertVehicleTelematicMapping({
          vehicleId: body.vehicleId,
          providerCode: body.providerCode,
          externalDeviceId: body.externalDeviceId,
          externalVehicleRef: body.externalVehicleRef,
          actorUserId: actor.userId,
        })
        return NextResponse.json({ success: true, mapping, message: "Araç-cihaz eşlemesi kaydedildi." })
      }
      case "import_telematic_events": {
        const payloads = Array.isArray(body.events) ? body.events : Array.isArray(body.payloads) ? body.payloads : [body]
        const res = await ingestTelematicsPayloads({
          providerCode: body.providerCode || "GENERIC_WEBHOOK",
          payloads,
          sourceOrigin: body.sourceOrigin || "CSV_JSON_IMPORT",
          customFieldMapping: body.customFieldMapping || null,
          actorUserId: actor.userId,
        })
        return NextResponse.json({
          success: true,
          ...res,
          message: `Telematik içe aktarım: ${res.acceptedCount} yeni, ${res.duplicateCount} tekrar, ${res.backfillCount} geçmiş doldurma, ${res.errorCount} hata.`,
        })
      }
      default:
        return NextResponse.json({ success: false, error: `Bilinmeyen filo işlemi: ${action}` }, { status: 400 })
    }
  } catch (error) {
    return handleLogisticsApiError(error, "Filo işlemi sırasında hata oluştu.")
  }
}
