/**
 * Sunum ERP — Turizm Faz 2: Araç Kiralama (Rent-a-Car) — turizm_rentacar Ana API Uç Noktası
 *
 * KURALLAR:
 * - `turizm_rentacar` özellik bayrağı kapalıysa 403 FEATURE_DISABLED döner.
 * - Her işlem aksiyonuna göre sunucu tarafında RBAC (`read`, `create`, `update`, `delete`, `approve`)
 *   ve çok firmalı kapsam (`getTourismScopeContext`) doğrulaması çalıştırır.
 * - Demo kolaylıkları (`demoPerspectiveCompanies`, `demoCompanyId` perspektif filtresi) YALNIZCA
 *   `isDemoEnvironment() === true` iken aktif olur; gerçek ortamda (`DISABLE_DEMO_MODE=true`)
 *   sunucu tarafından tamamen devre dışı bırakılır.
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
  assignVehicleToRentalPool,
  autoMatchPenaltiesAndTollPassesToRentals,
  createRentReservation,
  evaluateAndDispatchRentACarAlerts,
  exportKabisRecordsPackage,
  exportRentACarReportBuffer,
  extendRentReservation,
  generateOrSignRentContract,
  getRentACarWorkspaceSnapshot,
  getRentalAvailabilityGantt,
  importOrRecordTollPasses,
  issueRentalInvoiceAndFinanceEntry,
  prepareOrRefreshKabisRecord,
  recordDepositOrExtraCharge,
  reflectPenaltyOrTollToCustomer,
  refundOrSettleDeposit,
  submitVehicleHandoverInspection,
  submitVehicleReturnInspection,
  swapReservationVehicle,
  updateKabisRecordStatus,
  updateRentPolicyConfig,
  updateRentReservationStatus,
  upsertExtraService,
  upsertRentalCustomer,
  upsertTariff,
  upsertVehicleClass,
} from "@/lib/tourism/rentacar"

function applyDemoCompanyPerspectiveIfAllowed(
  scope: TourismScopeContext,
  requestedDemoCompanyId?: string | null
): TourismScopeContext {
  // Gerçek müşteri ortamında veya zaten kısıtlı partner oturumunda perspektif geçişine izin verilmez
  if (!isDemoEnvironment() || scope.isPartnerScoped || !requestedDemoCompanyId) {
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
  // Demo'da başka bir kurgusal firmanın (ör. Örnek Ege Rota Araç Kiralama) izole perspektifini önizleme
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
    const vehicleClassId = searchParams.get("vehicleClassId") || undefined
    const ganttStartDate = searchParams.get("ganttStartDate") || undefined
    const ganttDays = searchParams.get("ganttDays")
      ? Number(searchParams.get("ganttDays"))
      : undefined
    const revealKvkk = searchParams.get("revealKvkk") === "true"
    const demoCompanyId = searchParams.get("demoCompanyId")

    const auth = await requireTourismAccess(
      "turizm_rentacar",
      "read",
      { branchId, allowPartnerScope: true },
      request
    )
    if (!auth.ok) return auth.response

    const effectiveScope = applyDemoCompanyPerspectiveIfAllowed(
      auth.context.scope,
      demoCompanyId
    )

    if (section === "report_export") {
      const format = searchParams.get("format") === "pdf" ? "pdf" : "xlsx"
      const exported = await exportRentACarReportBuffer(
        { format, branchId },
        effectiveScope
      )
      return new NextResponse(new Uint8Array(exported.buffer), {
        status: 200,
        headers: {
          "Content-Type": exported.mimeType,
          "Content-Disposition": `attachment; filename="${exported.fileName}"`,
          "Cache-Control": "no-store",
        },
      })
    }

    if (section === "kabis_export") {
      const format = (searchParams.get("format") || "CSV").toUpperCase() as
        | "CSV"
        | "EXCEL"
        | "JSON_PAKET"
      const statusFilter = searchParams.get("statusFilter") || undefined
      const pkg = await exportKabisRecordsPackage(
        { format, statusFilter, markAsManualExported: true },
        effectiveScope
      )
      return NextResponse.json({ success: true, ...pkg })
    }

    if (section === "gantt") {
      const gantt = await getRentalAvailabilityGantt(
        {
          windowStartDate: ganttStartDate,
          daysCount: ganttDays,
          vehicleClassId,
          branchId,
        },
        effectiveScope
      )
      return NextResponse.json({ success: true, gantt })
    }

    const snapshot = await getRentACarWorkspaceSnapshot(
      {
        branchId,
        vehicleClassId,
        ganttStartDate,
        ganttDays,
        revealKvkk,
      },
      effectiveScope
    )

    const demoMode = isDemoEnvironment()
    let demoPerspectiveCompanies: any[] = []
    if (demoMode) {
      const allCompanies = await (prisma as any).turizmPartnerCompany
        .findMany()
        .catch(() => [])
      demoPerspectiveCompanies = allCompanies.filter(
        (c: any) => c.isMainCompany || c.companyType === "RENTACAR"
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
      featureFlags: {
        tourismDemoMode: demoMode,
      },
      ...(demoMode ? { demoPerspectiveCompanies } : {}),
    })
  } catch (error) {
    return handleTourismApiError(error, "turizm_rentacar")
  }
}

function resolveRequiredActionForOperation(action: string): TourismPermissionAction {
  switch (action) {
    case "update_policy_config":
    case "refund_or_settle_deposit":
    case "issue_rental_invoice":
    case "reflect_penalty_or_toll":
      return "approve"
    case "create_reservation":
    case "upsert_customer":
    case "generate_or_sign_contract":
    case "submit_delivery_inspection":
    case "submit_return_inspection":
    case "record_charge_or_deposit":
    case "import_or_record_toll_pass":
    case "prepare_or_refresh_kabis":
      return "create"
    case "upsert_vehicle_class":
    case "upsert_tariff":
    case "upsert_extra_service":
    case "assign_vehicle_rental_pool":
    case "extend_reservation":
    case "swap_vehicle":
    case "update_reservation_status":
    case "auto_match_penalties_and_tolls":
    case "update_kabis_status":
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

    const requiredPerm = resolveRequiredActionForOperation(action)
    const auth = await requireTourismAccess(
      "turizm_rentacar",
      requiredPerm,
      { branchId: body.branchId, allowPartnerScope: true },
      request
    )
    if (!auth.ok) return auth.response

    const scope = applyDemoCompanyPerspectiveIfAllowed(
      auth.context.scope,
      body.demoCompanyId
    )

    switch (action) {
      case "upsert_vehicle_class": {
        const saved = await upsertVehicleClass(body, scope)
        return NextResponse.json({ success: true, vehicleClass: saved })
      }
      case "upsert_tariff": {
        const saved = await upsertTariff(body, scope)
        return NextResponse.json({ success: true, tariff: saved })
      }
      case "upsert_extra_service": {
        const saved = await upsertExtraService(body, scope)
        return NextResponse.json({ success: true, extraService: saved })
      }
      case "update_policy_config": {
        const saved = await updateRentPolicyConfig(body, scope)
        return NextResponse.json({ success: true, policyConfig: saved })
      }
      case "assign_vehicle_rental_pool": {
        const saved = await assignVehicleToRentalPool(body, scope)
        return NextResponse.json({ success: true, vehicle: saved })
      }
      case "upsert_customer": {
        const saved = await upsertRentalCustomer(body, scope)
        return NextResponse.json({ success: true, customer: saved })
      }
      case "create_reservation": {
        const saved = await createRentReservation(body, scope)
        return NextResponse.json({ success: true, reservation: saved })
      }
      case "extend_reservation": {
        const saved = await extendRentReservation(body, scope)
        return NextResponse.json({ success: true, reservation: saved })
      }
      case "swap_vehicle": {
        const saved = await swapReservationVehicle(body, scope)
        return NextResponse.json({ success: true, reservation: saved })
      }
      case "update_reservation_status": {
        const saved = await updateRentReservationStatus(body, scope)
        return NextResponse.json({ success: true, reservation: saved })
      }
      case "generate_or_sign_contract": {
        const saved = await generateOrSignRentContract(body, scope)
        return NextResponse.json({ success: true, contract: saved })
      }
      case "submit_delivery_inspection": {
        const res = await submitVehicleHandoverInspection(body, scope)
        return NextResponse.json({ success: true, ...res })
      }
      case "submit_return_inspection": {
        const res = await submitVehicleReturnInspection(body, scope)
        return NextResponse.json({ success: true, ...res })
      }
      case "record_charge_or_deposit": {
        const saved = await recordDepositOrExtraCharge(body, scope)
        return NextResponse.json({ success: true, charge: saved })
      }
      case "refund_or_settle_deposit": {
        const saved = await refundOrSettleDeposit(body, scope)
        return NextResponse.json({ success: true, charge: saved })
      }
      case "issue_rental_invoice": {
        const res = await issueRentalInvoiceAndFinanceEntry(body, scope)
        return NextResponse.json({ success: true, ...res })
      }
      case "import_or_record_toll_pass": {
        const res = await importOrRecordTollPasses(body, scope)
        return NextResponse.json({ success: true, ...res })
      }
      case "auto_match_penalties_and_tolls": {
        const res = await autoMatchPenaltiesAndTollPassesToRentals(scope)
        return NextResponse.json({ success: true, ...res })
      }
      case "reflect_penalty_or_toll": {
        const res = await reflectPenaltyOrTollToCustomer(body, scope)
        return NextResponse.json({ success: true, ...res })
      }
      case "prepare_or_refresh_kabis": {
        const saved = await prepareOrRefreshKabisRecord(body, scope)
        return NextResponse.json({ success: true, kabisRecord: saved })
      }
      case "update_kabis_status": {
        const saved = await updateKabisRecordStatus(body, scope)
        return NextResponse.json({ success: true, kabisRecord: saved })
      }
      case "export_kabis_package": {
        const res = await exportKabisRecordsPackage(body, scope)
        return NextResponse.json({ success: true, ...res })
      }
      case "dispatch_alerts": {
        const res = await evaluateAndDispatchRentACarAlerts({
          scope,
          dispatchNotifications: true,
        })
        return NextResponse.json({ success: true, ...res })
      }
      default:
        throw new TourismDomainError(
          "VALIDATION_ERROR",
          `Tanımsız araç kiralama işlemi: ${action}`,
          400
        )
    }
  } catch (error) {
    return handleTourismApiError(error, "turizm_rentacar")
  }
}
