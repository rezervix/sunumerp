/**
 * Lojistik Faz 6 (lojistik_sevkiyat_rota) — Sevkiyat, Sefer Planlama, Rota Optimizasyonu,
 * Sürücü Mobil, e-POD, Otomatik E-İrsaliye & KPI API Uç Noktası
 */

import { NextResponse } from "next/server"
import { prisma } from "@/lib/db"
import { isDemoEnvironment } from "@/lib/config/production-feature-flags"
import {
  handleLogisticsApiError,
  LogisticsDomainError,
  logLogisticsAudit,
  requireLogisticsAccess,
} from "@/lib/logistics/security"
import type { LogisticsPermissionAction } from "@/lib/logistics/types"
import {
  approveTripAndTriggerEWaybill,
  createDispatchTrip,
  driverUpdateTripOrStopExecution,
  dynamicReplanTrip,
  extendOrRotateTrackingLink,
  issueOneClickSalesEInvoiceForStop,
  listDispatchOverviewAndReadyPool,
  optimizeExistingTripWithJob,
  reorderTripStopsManually,
  runMultiVehicleAutoPlanAndPersist,
  submitStopDeliveryProof,
} from "@/lib/logistics/dispatch"
import { getServerLogisticsInvoiceTiming, saveSystemConfig } from "@/lib/system-config"

function resolveDispatchMapConfig() {
  const rawUrl = process.env.LOJISTIK_MAP_TILE_URL?.trim() || null
  const key = process.env.LOJISTIK_MAP_TILE_KEY?.trim() || null
  let resolvedTileUrl: string | null = null
  if (rawUrl) {
    if (rawUrl.includes("{key}")) {
      resolvedTileUrl = key ? rawUrl.replace(/\{key\}/g, key) : null
    } else if (/carto/i.test(rawUrl)) {
      resolvedTileUrl = key ? `${rawUrl}${rawUrl.includes("?") ? "&" : "?"}key=${encodeURIComponent(key)}` : null
    } else {
      resolvedTileUrl = rawUrl
    }
  }
  const attribution = resolvedTileUrl
    ? /carto/i.test(resolvedTileUrl)
      ? "© OpenStreetMap contributors, © CARTO"
      : process.env.LOJISTIK_MAP_ATTRIBUTION?.trim() || "© Harita Sağlayıcısı"
    : "© Sunum ERP Sevkiyat Harita Altlığı (Çevrimdışı Koordinat Kanvası)"

  return {
    tileUrl: resolvedTileUrl,
    hasExternalTileConfig: Boolean(resolvedTileUrl),
    attribution,
  }
}

export async function GET(req: Request) {
  try {
    const access = await requireLogisticsAccess({
      flagKey: "lojistik_sevkiyat_rota",
      resource: "lojistik_sevkiyat_rota",
      action: "read",
    })
    if (access instanceof NextResponse) return access

    if (access.scope.isSupplierScoped) {
      throw new LogisticsDomainError(
        "FORBIDDEN_SUPPLIER_SCOPE",
        "Dış tedarikçi portal hesapları sevkiyat ve rota planlama modülüne erişemez.",
        403
      )
    }

    const { searchParams } = new URL(req.url)
    const section = searchParams.get("section") || "overview"
    const branchId = searchParams.get("branchId") || undefined
    const status = searchParams.get("status") || undefined
    const driverId = searchParams.get("driverId") || undefined

    const data = await listDispatchOverviewAndReadyPool({ branchId, status })

    if (section === "driver_day") {
      const activeTrips = data.trips.filter(
        (t: any) =>
          t.status !== "IPTAL" &&
          (!driverId || t.driverId === driverId)
      )
      return NextResponse.json({
        success: true,
        trips: activeTrips,
        drivers: data.drivers,
        failureReasons: data.failureReasons,
        featureFlags: { logisticsDemoMode: isDemoEnvironment() },
      })
    }

    if (section === "opt_jobs") {
      return NextResponse.json({
        success: true,
        optJobs: data.optJobs,
      })
    }

    if (section === "kpis") {
      return NextResponse.json({
        success: true,
        kpis: data.kpis,
        adapterStatus: data.adapterStatus,
      })
    }

    return NextResponse.json({
      success: true,
      ...data,
      mapConfig: resolveDispatchMapConfig(),
      featureFlags: {
        logisticsDemoMode: isDemoEnvironment(),
      },
    })
  } catch (error) {
    return handleLogisticsApiError(error, "Sevkiyat ve rota verileri alınamadı.")
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json()
    const action = String(body.action || "").trim()

    const permissionMap: Record<string, LogisticsPermissionAction> = {
      create_trip: "create",
      auto_plan_trips: "create",
      optimize_trip: "update",
      reorder_stops: "update",
      replan_trip: "update",
      approve_and_issue_ewaybill: "approve",
      issue_stop_efatura: "approve",
      update_invoice_timing: "approve",
      driver_update_stop: "update",
      submit_pod: "create",
      extend_tracking: "update",
      cancel_trip: "delete",
    }

    const reqAction: LogisticsPermissionAction = permissionMap[action] || "create"
    const access = await requireLogisticsAccess({
      flagKey: "lojistik_sevkiyat_rota",
      resource: "lojistik_sevkiyat_rota",
      action: reqAction,
      branchId: body.branchId,
    })
    if (access instanceof NextResponse) return access

    if (access.scope.isSupplierScoped) {
      throw new LogisticsDomainError(
        "FORBIDDEN_SUPPLIER_SCOPE",
        "Dış tedarikçi hesapları şirket sevkiyatları üzerinde işlem yapamaz.",
        403
      )
    }

    const actor = {
      userId: access.payload.userId,
      branchId: access.payload.branchId,
      username: access.payload.username || access.payload.userId,
    }

    switch (action) {
      case "create_trip": {
        const res = await createDispatchTrip(body, actor)
        return NextResponse.json({
          success: true,
          ...res,
          message: `Sefer planı oluşturuldu (${res.trip.tripNumber}, ${res.stops.length} durak).`,
        })
      }
      case "auto_plan_trips": {
        const res = await runMultiVehicleAutoPlanAndPersist(
          {
            originWarehouseId: body.originWarehouseId,
            stopItems: Array.isArray(body.stopItems) ? body.stopItems : [],
            vehicleIds: Array.isArray(body.vehicleIds) ? body.vehicleIds : undefined,
            plannedDepartureAt: body.plannedDepartureAt,
            persistTrips: body.persistTrips !== false,
          },
          actor
        )
        return NextResponse.json({
          success: true,
          ...res,
          message: `${res.plan.trips.length} araç için otomatik sefer önerisi hesaplandı (${res.plan.totalStopsAssigned}/${res.plan.totalStopsInput} sipariş).`,
        })
      }
      case "optimize_trip": {
        const res = await optimizeExistingTripWithJob(body.tripId, actor, {
          timeBudgetMs: body.timeBudgetMs,
          returnToDepot: body.returnToDepot,
        })
        return NextResponse.json({
          success: true,
          ...res,
          message: `Rota optimize edildi: ${res.optimization.baselineUnoptimizedDistanceKm} km → ${res.optimization.optimizedDistanceKm} km.`,
        })
      }
      case "reorder_stops": {
        const res = await reorderTripStopsManually(
          { tripId: body.tripId, orderedStopIds: body.orderedStopIds || [] },
          actor
        )
        return NextResponse.json({
          success: true,
          ...res,
          message: `Durak sırası ve ETA güncellendi (${res.schedule.optimizedDistanceKm} km).`,
        })
      }
      case "replan_trip": {
        const res = await dynamicReplanTrip(
          {
            tripId: body.tripId,
            reason: body.reason || "Operasyonel yeniden planlama",
            targetVehicleId: body.targetVehicleId,
            targetDriverId: body.targetDriverId,
            delayOffsetMinutes: body.delayOffsetMinutes,
            stopIdsToMove: body.stopIdsToMove,
          },
          actor
        )
        return NextResponse.json({
          success: true,
          ...res,
          message:
            res.mode === "REASSIGNED_VEHICLE"
              ? `${res.movedCount} durak yeni sefere aktarıldı.`
              : `${res.movedCount} durak gecikme sonrası yeniden sıralandı.`,
        })
      }
      case "approve_and_issue_ewaybill": {
        const res = await approveTripAndTriggerEWaybill(body.tripId, actor)
        return NextResponse.json({
          success: true,
          ...res,
          message: `Sefer onaylandı ve ${res.eWaybillNo} numaralı E-İrsaliye kesildi.`,
        })
      }
      case "issue_stop_efatura": {
        const res = await issueOneClickSalesEInvoiceForStop(body.stopId, actor)
        return NextResponse.json({
          success: true,
          ...res,
          message: res.alreadyIssued
            ? `${res.eInvoiceNo} numaralı E-Fatura daha önce kesilmiş.`
            : `${res.eInvoiceNo} numaralı satış E-Faturası kesildi.`,
        })
      }
      case "update_invoice_timing": {
        const current = getServerLogisticsInvoiceTiming()
        const allowedModes = ["ON_DELIVERY_DRAFT", "ON_WAYBILL_SETTLE", "MANUAL_ONLY"] as const
        const mode = allowedModes.includes(body.mode) ? body.mode : current.mode
        const saved = saveSystemConfig({
          logisticsInvoiceTiming: {
            mode,
            autoDraftOnDelivery:
              typeof body.autoDraftOnDelivery === "boolean"
                ? body.autoDraftOnDelivery
                : current.autoDraftOnDelivery,
            allowPartialDeliveryDraft:
              typeof body.allowPartialDeliveryDraft === "boolean"
                ? body.allowPartialDeliveryDraft
                : current.allowPartialDeliveryDraft,
            defaultVatRate:
              Number.isFinite(Number(body.defaultVatRate)) && Number(body.defaultVatRate) >= 0
                ? Number(body.defaultVatRate)
                : current.defaultVatRate,
            updatedAt: new Date().toISOString(),
            updatedBy: actor.username || actor.userId,
          },
        })
        await logLogisticsAudit({
          userId: actor.userId,
          action: "UPDATE_INVOICE_TIMING_POLICY",
          resource: "lojistik_sevkiyat_rota",
          moduleKey: "lojistik_sevkiyat_rota",
          metadata: { mode },
        })
        return NextResponse.json({
          success: true,
          invoiceTimingConfig: saved.logisticsInvoiceTiming,
          message: "E-Fatura zamanlama ayarı güncellendi.",
        })
      }
      case "driver_update_stop": {
        const res = await driverUpdateTripOrStopExecution(
          {
            tripId: body.tripId,
            stopId: body.stopId,
            status: body.status,
            failureReasonCode: body.failureReasonCode,
            failureReasonNote: body.failureReasonNote,
            driverNote: body.driverNote,
            lat: body.lat,
            lng: body.lng,
            actualDistanceKm: body.actualDistanceKm,
          },
          actor
        )
        return NextResponse.json({
          success: true,
          ...res,
          message: `Durak durumu güncellendi: ${res.stop.status}.`,
        })
      }
      case "submit_pod": {
        const res = await submitStopDeliveryProof(body, actor)
        return NextResponse.json({
          success: true,
          ...res,
          message: `Teslimat kanıtı (e-POD) kaydedildi — ${res.proof.recipientName}.`,
        })
      }
      case "extend_tracking": {
        const stop = await extendOrRotateTrackingLink(
          {
            stopId: body.stopId,
            extendHours: body.extendHours,
            regenerateToken: body.regenerateToken,
          },
          actor
        )
        return NextResponse.json({
          success: true,
          stop,
          message: "Müşteri takip bağlantısı güncellendi.",
        })
      }
      case "cancel_trip": {
        const dbAny = prisma as any
        const trip = await dbAny.lojistikShipmentTrip.findUnique({ where: { id: body.tripId } })
        if (!trip) throw new LogisticsDomainError("NOT_FOUND", "Sefer bulunamadı.", 404)
        const updated = await dbAny.lojistikShipmentTrip.update({
          where: { id: trip.id },
          data: { status: "IPTAL", notes: body.reason || trip.notes, updatedAt: new Date() },
        })
        await logLogisticsAudit({
          userId: actor.userId,
          action: "CANCEL_DISPATCH_TRIP",
          resource: "lojistik_sevkiyat_rota",
          resourceId: trip.id,
          moduleKey: "lojistik_sevkiyat_rota",
          metadata: { tripNumber: trip.tripNumber },
        })
        return NextResponse.json({ success: true, trip: updated, message: "Sefer iptal edildi." })
      }
      default:
        return NextResponse.json({ success: false, error: `Bilinmeyen sevkiyat işlemi: ${action}` }, { status: 400 })
    }
  } catch (error) {
    return handleLogisticsApiError(error, "Sevkiyat işlemi sırasında hata oluştu.")
  }
}
