/**
 * Sunum ERP — Turizm Faz 4: Tur Operatörlüğü (turizm_tur) Ana API Uç Noktası
 *
 * KURALLAR:
 * - `turizm_tur` bayrağı kapalıysa 403 FEATURE_DISABLED döner.
 * - Kısıtlı `"Tur Rehberi"` rolü yalnızca `section=guide_mobile` ve saha yoklama/not/tahsilat
 *   aksiyonlarına erişir; kâr analizi, acenta yönetimi, tur silme/iptal ve yönetim paneline
 *   erişim sunucuda `403 FORBIDDEN_GUIDE_SCOPE` ile kesilir.
 * - Demo perspektif geçişi (`demoCompanyId`) YALNIZCA `isDemoEnvironment() === true` iken aktif olur.
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
  addTourExpenseItem,
  assignTourPassengerSeat,
  buildSignedManifestoPdfBuffer,
  cancelTourBooking,
  createTourBookingWithPassengers,
  evaluateAndDispatchTourAlerts,
  exportTourReportBuffer,
  getTourGuideMobileSnapshot,
  getTourResourceAvailabilityGantt,
  getTourWorkspaceSnapshot,
  issueTourBookingInvoice,
  isUserTourGuideScoped,
  recordBookingPayment,
  recordGuideFieldLogOrCollection,
  resolveTourConflictLog,
  syncOfflineGuideBatch,
  syncOvernightTourHotelAndKbs,
  updatePassengerBoardingStatus,
  upsertSeatLayout,
  upsertTourAgency,
  upsertTourGuide,
  upsertTourPackage,
  upsertTourPickupStop,
} from "@/lib/tourism/tur"

const GUIDE_ALLOWED_POST_ACTIONS = new Set([
  "update_boarding_status",
  "record_guide_field_log",
  "sync_offline_guide_batch",
])

function applyDemoCompanyPerspectiveIfAllowed(
  scope: TourismScopeContext,
  requestedDemoCompanyId?: string | null
): TourismScopeContext {
  if (
    !isDemoEnvironment() ||
    scope.isPartnerScoped ||
    isUserTourGuideScoped(scope) ||
    !requestedDemoCompanyId
  ) {
    return scope
  }
  const cleanId = requestedDemoCompanyId.trim()
  if (!cleanId) return scope
  if (cleanId === "trzm-comp-main") {
    return { ...scope, effectiveCompanyId: "trzm-comp-main", isPartnerScoped: false }
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
    const ganttStartDate = searchParams.get("ganttStartDate") || undefined
    const ganttDays = searchParams.get("ganttDays") ? Number(searchParams.get("ganttDays")) : undefined
    const revealKvkk = searchParams.get("revealKvkk") === "true"
    const demoCompanyId = searchParams.get("demoCompanyId")

    const auth = await requireTourismAccess({
      flagKey: "turizm_tur",
      resource: "turizm_tur",
      action: "read",
      branchId,
      allowPartnerScoped: true,
    })
    if (auth instanceof NextResponse) return auth

    const effectiveScope = applyDemoCompanyPerspectiveIfAllowed(auth.scope, demoCompanyId)

    if (
      isUserTourGuideScoped(effectiveScope) &&
      section !== "guide_mobile" &&
      section !== "manifesto_pdf"
    ) {
      throw new TourismDomainError(
        "FORBIDDEN_GUIDE_SCOPE",
        "Tur rehberi yalnızca mobil saha ekranına (/dashboard/tur/rehber) ve manifesto çıktısına erişebilir.",
        403
      )
    }

    if (section === "guide_mobile") {
      const mobile = await getTourGuideMobileSnapshot(effectiveScope)
      return NextResponse.json({
        success: true,
        ...mobile,
        featureFlags: { tourismDemoMode: isDemoEnvironment() },
      })
    }

    if (section === "manifesto_pdf") {
      const tourId = searchParams.get("tourId") || ""
      if (!tourId) {
        throw new TourismDomainError("VALIDATION_ERROR", "Manifesto için tourId zorunludur.", 400)
      }
      const pdf = await buildSignedManifestoPdfBuffer(tourId, effectiveScope)
      return new NextResponse(new Uint8Array(pdf.buffer), {
        status: 200,
        headers: {
          "Content-Type": "application/pdf",
          "Content-Disposition": `attachment; filename="${pdf.fileName}"`,
          "Cache-Control": "no-store",
        },
      })
    }

    if (section === "report_export") {
      const format = searchParams.get("format") === "pdf" ? "pdf" : "xlsx"
      const exported = await exportTourReportBuffer({ format }, effectiveScope)
      return new NextResponse(new Uint8Array(exported.buffer), {
        status: 200,
        headers: {
          "Content-Type": exported.mimeType,
          "Content-Disposition": `attachment; filename="${exported.fileName}"`,
          "Cache-Control": "no-store",
        },
      })
    }

    if (section === "gantt") {
      const gantt = await getTourResourceAvailabilityGantt(
        { windowStartDate: ganttStartDate, daysCount: ganttDays },
        effectiveScope
      )
      return NextResponse.json({ success: true, gantt })
    }

    const snapshot = await getTourWorkspaceSnapshot(
      { ganttStartDate, ganttDays, revealKvkk },
      effectiveScope
    )

    const demoMode = isDemoEnvironment()
    let demoPerspectiveCompanies: any[] = []
    if (demoMode) {
      const allCompanies = await (prisma as any).turizmPartnerCompany
        .findMany()
        .catch(() => [])
      demoPerspectiveCompanies = allCompanies.filter(
        (c: any) => c.isMainCompany || c.companyType === "TOUR_OPERATOR"
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
    return handleTourismApiError(error, "turizm_tur")
  }
}

function resolveRequiredActionForTourOperation(action: string): TourismPermissionAction {
  switch (action) {
    case "issue_booking_invoice":
      return "approve"
    case "upsert_tour":
    case "create_booking":
    case "add_expense":
    case "upsert_pickup_stop":
    case "sync_overnight_hotel_kbs":
      return "create"
    case "upsert_guide":
    case "upsert_agency":
    case "upsert_seat_layout":
    case "assign_seat":
    case "record_payment":
    case "cancel_booking":
    case "resolve_conflict":
    case "update_boarding_status":
    case "record_guide_field_log":
    case "sync_offline_guide_batch":
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

    const requiredPerm = resolveRequiredActionForTourOperation(action)
    const auth = await requireTourismAccess({
      flagKey: "turizm_tur",
      resource: "turizm_tur",
      action: requiredPerm,
      branchId: body.branchId,
      allowPartnerScoped: true,
    })
    if (auth instanceof NextResponse) return auth

    const scope = applyDemoCompanyPerspectiveIfAllowed(auth.scope, body.demoCompanyId)

    if (isUserTourGuideScoped(scope) && !GUIDE_ALLOWED_POST_ACTIONS.has(action)) {
      throw new TourismDomainError(
        "FORBIDDEN_GUIDE_SCOPE",
        "Tur rehberi bu yönetim/finans işlemini gerçekleştiremez.",
        403
      )
    }

    switch (action) {
      case "upsert_tour": {
        const saved = await upsertTourPackage(body, scope)
        return NextResponse.json({ success: true, tour: saved })
      }
      case "upsert_guide": {
        const saved = await upsertTourGuide(body, scope)
        return NextResponse.json({ success: true, guide: saved })
      }
      case "upsert_agency": {
        const saved = await upsertTourAgency(body, scope)
        return NextResponse.json({ success: true, agency: saved })
      }
      case "upsert_seat_layout": {
        const saved = await upsertSeatLayout(body, scope)
        return NextResponse.json({ success: true, seatLayout: saved })
      }
      case "upsert_pickup_stop": {
        const res = await upsertTourPickupStop(body, scope)
        return NextResponse.json({ success: true, ...res })
      }
      case "assign_seat": {
        const saved = await assignTourPassengerSeat(body, scope)
        return NextResponse.json({ success: true, passenger: saved })
      }
      case "create_booking": {
        const res = await createTourBookingWithPassengers(body, scope)
        return NextResponse.json({ success: true, ...res })
      }
      case "record_payment": {
        const saved = await recordBookingPayment(body, scope)
        return NextResponse.json({ success: true, booking: saved })
      }
      case "cancel_booking": {
        const saved = await cancelTourBooking(body, scope)
        return NextResponse.json({ success: true, booking: saved })
      }
      case "issue_booking_invoice": {
        const res = await issueTourBookingInvoice(body, scope)
        return NextResponse.json({ success: true, ...res })
      }
      case "add_expense": {
        const saved = await addTourExpenseItem(body, scope)
        return NextResponse.json({ success: true, expense: saved })
      }
      case "sync_overnight_hotel_kbs": {
        const res = await syncOvernightTourHotelAndKbs(body, scope)
        return NextResponse.json({ success: true, ...res })
      }
      case "resolve_conflict": {
        const saved = await resolveTourConflictLog(body, scope)
        return NextResponse.json({ success: true, conflictLog: saved })
      }
      case "update_boarding_status": {
        const saved = await updatePassengerBoardingStatus(body, scope)
        return NextResponse.json({ success: true, passenger: saved })
      }
      case "record_guide_field_log": {
        const res = await recordGuideFieldLogOrCollection(body, scope)
        return NextResponse.json({ success: true, ...res })
      }
      case "sync_offline_guide_batch": {
        const res = await syncOfflineGuideBatch(body, scope)
        return NextResponse.json({ success: true, ...res })
      }
      case "dispatch_alerts": {
        const res = await evaluateAndDispatchTourAlerts({
          scope,
          dispatchNotifications: true,
        })
        return NextResponse.json({ success: true, ...res })
      }
      default:
        throw new TourismDomainError("VALIDATION_ERROR", `Tanımsız tur işlemi: ${action}`, 400)
    }
  } catch (error) {
    return handleTourismApiError(error, "turizm_tur")
  }
}
