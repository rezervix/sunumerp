/**
 * Sunum ERP — Turizm Faz 3: Otel Yönetimi (Mini PMS) — turizm_otel Ana API Uç Noktası
 *
 * KURALLAR:
 * - `turizm_otel` özellik bayrağı kapalıysa 403 FEATURE_DISABLED döner.
 * - Kısıtlı `"Temizlik Personeli"` rolü YALNIZCA `section=housekeeping_mobile` ve kendi
 *   görev güncellemelerine/çevrimdışı senkronizasyonuna erişebilir; rezervasyon, folio,
 *   misafir KVKK, KBS ve finans raporlarına erişimi sunucu tarafında `403 FORBIDDEN_HOUSEKEEPING_SCOPE`
 *   ile kesilir.
 * - Demo kolaylıkları (`demoPerspectiveCompanies`, `demoCompanyId`) YALNIZCA
 *   `isDemoEnvironment() === true` iken aktif olur.
 */

import { NextResponse } from "next/server"
import { prisma } from "@/lib/db"
import { isDemoEnvironment } from "@/lib/config/production-feature-flags"
import {
  handleTourismApiError,
  requireTourismAccess,
  TourismDomainError,
} from "@/lib/tourism/security"
import type { TourismPermissionAction, TourismScopeContext } from "@/lib/tourism/types"
import {
  addHotelFolioChargeOrPayment,
  bulkPrepareOrRetryKbsRecords,
  createHotelReservation,
  createOrAssignHousekeepingTask,
  evaluateAndDispatchHotelAlerts,
  exportHotelReportBuffer,
  exportKbsRecordsPackage,
  getHotelRoomAvailabilityGantt,
  getHotelWorkspaceSnapshot,
  getHousekeepingMobileSnapshot,
  issueHotelFolioInvoice,
  isUserHousekeepingScoped,
  performHotelCheckIn,
  performHotelCheckOut,
  prepareOrRefreshKbsRecord,
  reportRoomTechnicalFault,
  splitFolioItemToGroup,
  syncOfflineHousekeepingBatch,
  updateHotelPolicyConfig,
  updateHotelReservationStatusOrRoom,
  updateHotelRoomStatus,
  updateHousekeepingTaskStatus,
  updateKbsRecordStatus,
  upsertHotelAllotment,
  upsertHotelRoomType,
  upsertHotelTariff,
} from "@/lib/tourism/otel"

const HOUSEKEEPING_ALLOWED_POST_ACTIONS = new Set([
  "update_housekeeping_task",
  "report_room_fault",
  "sync_offline_housekeeping_batch",
  "update_room_status",
])

function applyDemoCompanyPerspectiveIfAllowed(
  scope: TourismScopeContext,
  requestedDemoCompanyId?: string | null
): TourismScopeContext {
  if (
    !isDemoEnvironment() ||
    scope.isPartnerScoped ||
    isUserHousekeepingScoped(scope) ||
    !requestedDemoCompanyId
  ) {
    return scope
  }
  const cleanId = requestedDemoCompanyId.trim()
  if (!cleanId) return scope
  if (cleanId === "trzm-comp-main") {
    return {
      ...scope,
      effectiveCompanyId: "trzm-comp-main",
      isPartnerScoped: false,
    }
  }
  return {
    ...scope,
    partnerCompanyId: cleanId,
    effectiveCompanyId: cleanId,
    isPartnerScoped: true,
    isSuperAdmin: false,
    isPlatformDeveloper: false,
  }
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const section = searchParams.get("section") || "overview"
    const branchId = searchParams.get("branchId") || undefined
    const floorParam = searchParams.get("floorNumber")
    const floorNumber = floorParam !== null && floorParam !== "" ? Number(floorParam) : null
    const roomTypeId = searchParams.get("roomTypeId") || undefined
    const ganttStartDate = searchParams.get("ganttStartDate") || undefined
    const ganttDays = searchParams.get("ganttDays") ? Number(searchParams.get("ganttDays")) : undefined
    const revealKvkk = searchParams.get("revealKvkk") === "true"
    const demoCompanyId = searchParams.get("demoCompanyId")

    const auth = await requireTourismAccess({
      flagKey: "turizm_otel",
      resource: "turizm_otel",
      action: "read",
      branchId,
      allowPartnerScoped: true,
    })
    if (auth instanceof NextResponse) return auth

    const effectiveScope = applyDemoCompanyPerspectiveIfAllowed(auth.scope, demoCompanyId)

    // Kısıtlı Temizlik Personeli yalnızca housekeeping_mobile bölümünü okuyabilir!
    if (isUserHousekeepingScoped(effectiveScope) && section !== "housekeeping_mobile") {
      throw new TourismDomainError(
        "FORBIDDEN_HOUSEKEEPING_SCOPE",
        "Temizlik personeli yalnızca kendi mobil görev ekranına (/dashboard/otel/housekeeping) erişebilir.",
        403
      )
    }

    if (section === "housekeeping_mobile") {
      const mobileData = await getHousekeepingMobileSnapshot(effectiveScope)
      return NextResponse.json({
        success: true,
        ...mobileData,
        featureFlags: { tourismDemoMode: isDemoEnvironment() },
      })
    }

    if (section === "report_export") {
      const format = searchParams.get("format") === "pdf" ? "pdf" : "xlsx"
      const exported = await exportHotelReportBuffer({ format, branchId }, effectiveScope)
      return new NextResponse(new Uint8Array(exported.buffer), {
        status: 200,
        headers: {
          "Content-Type": exported.mimeType,
          "Content-Disposition": `attachment; filename="${exported.fileName}"`,
          "Cache-Control": "no-store",
        },
      })
    }

    if (section === "kbs_export") {
      const format = (searchParams.get("format") || "XML_SABLON").toUpperCase() as
        | "XML_SABLON"
        | "CSV"
        | "JSON_PAKET"
      const statusFilter = searchParams.get("statusFilter") || undefined
      const pkg = await exportKbsRecordsPackage(
        { format, statusFilter, markAsManualExported: true },
        effectiveScope
      )
      return NextResponse.json({ success: true, ...pkg })
    }

    if (section === "gantt") {
      const gantt = await getHotelRoomAvailabilityGantt(
        { windowStartDate: ganttStartDate, daysCount: ganttDays, floorNumber, roomTypeId },
        effectiveScope
      )
      return NextResponse.json({ success: true, gantt })
    }

    const snapshot = await getHotelWorkspaceSnapshot(
      { branchId, floorNumber, roomTypeId, ganttStartDate, ganttDays, revealKvkk },
      effectiveScope
    )

    const demoMode = isDemoEnvironment()
    let demoPerspectiveCompanies: any[] = []
    if (demoMode) {
      const allCompanies = await (prisma as any).turizmPartnerCompany
        .findMany()
        .catch(() => [])
      demoPerspectiveCompanies = allCompanies.filter(
        (c: any) => c.isMainCompany || c.companyType === "HOTEL"
      )
    }

    return NextResponse.json({
      success: true,
      ...snapshot,
      activeScope: {
        effectiveCompanyId: effectiveScope.effectiveCompanyId,
        isPartnerScoped: effectiveScope.isPartnerScoped,
        branchId: effectiveScope.branchId,
      },
      featureFlags: { tourismDemoMode: demoMode },
      ...(demoMode ? { demoPerspectiveCompanies } : {}),
    })
  } catch (error) {
    return handleTourismApiError(error, "turizm_otel")
  }
}

function resolveRequiredActionForHotelOperation(action: string): TourismPermissionAction {
  switch (action) {
    case "update_policy_config":
    case "issue_folio_invoice":
      return "approve"
    case "create_reservation":
    case "check_in":
    case "check_out":
    case "add_folio_entry":
    case "create_housekeeping_task":
    case "prepare_or_refresh_kbs":
    case "bulk_prepare_or_retry_kbs":
      return "create"
    case "upsert_room_type":
    case "upsert_tariff":
    case "upsert_allotment":
    case "update_room_status":
    case "update_reservation":
    case "split_folio_item":
    case "update_housekeeping_task":
    case "report_room_fault":
    case "sync_offline_housekeeping_batch":
    case "update_kbs_status":
      return "update"
    default:
      return "read"
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}))
    const action = String(body.action || "").trim()
    if (!action) {
      throw new TourismDomainError("VALIDATION_ERROR", "İşlem tipi (action) belirtilmedi.", 400)
    }

    const requiredPerm = resolveRequiredActionForHotelOperation(action)
    const auth = await requireTourismAccess({
      flagKey: "turizm_otel",
      resource: "turizm_otel",
      action: requiredPerm,
      branchId: body.branchId,
      allowPartnerScoped: true,
    })
    if (auth instanceof NextResponse) return auth

    const scope = applyDemoCompanyPerspectiveIfAllowed(auth.scope, body.demoCompanyId)

    // Kısıtlı Temizlik Personeli aksiyon beyaz listesi
    if (isUserHousekeepingScoped(scope) && !HOUSEKEEPING_ALLOWED_POST_ACTIONS.has(action)) {
      throw new TourismDomainError(
        "FORBIDDEN_HOUSEKEEPING_SCOPE",
        "Temizlik personeli bu ön büro/finans/KBS işlemini gerçekleştiremez.",
        403
      )
    }

    switch (action) {
      case "upsert_room_type": {
        const saved = await upsertHotelRoomType(body, scope)
        return NextResponse.json({ success: true, roomType: saved })
      }
      case "upsert_tariff": {
        const saved = await upsertHotelTariff(body, scope)
        return NextResponse.json({ success: true, tariff: saved })
      }
      case "update_policy_config": {
        const saved = await updateHotelPolicyConfig(body, scope)
        return NextResponse.json({ success: true, policyConfig: saved })
      }
      case "upsert_allotment": {
        const saved = await upsertHotelAllotment(body, scope)
        return NextResponse.json({ success: true, allotment: saved })
      }
      case "update_room_status": {
        const saved = await updateHotelRoomStatus(body, scope)
        return NextResponse.json({ success: true, room: saved })
      }
      case "create_reservation": {
        const saved = await createHotelReservation(body, scope)
        return NextResponse.json({ success: true, reservation: saved })
      }
      case "update_reservation": {
        const saved = await updateHotelReservationStatusOrRoom(body, scope)
        return NextResponse.json({ success: true, reservation: saved })
      }
      case "check_in": {
        const res = await performHotelCheckIn(body, scope)
        return NextResponse.json({ success: true, ...res })
      }
      case "check_out": {
        const res = await performHotelCheckOut(body, scope)
        return NextResponse.json({ success: true, ...res })
      }
      case "add_folio_entry": {
        const res = await addHotelFolioChargeOrPayment(body, scope)
        return NextResponse.json({ success: true, ...res })
      }
      case "split_folio_item": {
        const res = await splitFolioItemToGroup(body, scope)
        return NextResponse.json({ success: true, ...res })
      }
      case "issue_folio_invoice": {
        const res = await issueHotelFolioInvoice(body, scope)
        return NextResponse.json({ success: true, ...res })
      }
      case "create_housekeeping_task": {
        const saved = await createOrAssignHousekeepingTask(body, scope)
        return NextResponse.json({ success: true, task: saved })
      }
      case "update_housekeeping_task": {
        const saved = await updateHousekeepingTaskStatus(body, scope)
        return NextResponse.json({ success: true, task: saved })
      }
      case "report_room_fault": {
        const res = await reportRoomTechnicalFault(body, scope)
        return NextResponse.json({ success: true, ...res })
      }
      case "sync_offline_housekeeping_batch": {
        const res = await syncOfflineHousekeepingBatch(body, scope)
        return NextResponse.json({ success: true, ...res })
      }
      case "prepare_or_refresh_kbs": {
        const saved = await prepareOrRefreshKbsRecord(body, scope)
        return NextResponse.json({ success: true, kbsRecord: saved })
      }
      case "update_kbs_status": {
        const saved = await updateKbsRecordStatus(body, scope)
        return NextResponse.json({ success: true, kbsRecord: saved })
      }
      case "bulk_prepare_or_retry_kbs": {
        const res = await bulkPrepareOrRetryKbsRecords(body, scope)
        return NextResponse.json({ success: true, ...res })
      }
      case "export_kbs_package": {
        const res = await exportKbsRecordsPackage(body, scope)
        return NextResponse.json({ success: true, ...res })
      }
      case "dispatch_alerts": {
        const res = await evaluateAndDispatchHotelAlerts({
          scope,
          dispatchNotifications: true,
        })
        return NextResponse.json({ success: true, ...res })
      }
      default:
        throw new TourismDomainError(
          "VALIDATION_ERROR",
          `Tanımsız otel PMS işlemi: ${action}`,
          400
        )
    }
  } catch (error) {
    return handleTourismApiError(error, "turizm_otel")
  }
}
