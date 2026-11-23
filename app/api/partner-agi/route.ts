/**
 * Sunum ERP — Turizm Faz 5: B2B Partner Ağı (turizm_b2b) Ana API Uç Noktası
 *
 * GÜVENLİK & İZOLASYON (Madde H & J):
 * - `turizm_b2b` bayrağı kapalıysa 403 FEATURE_DISABLED döner.
 * - Her istek sunucu tarafında aktif firma kapsamını (`effectiveCompanyId`) doğrular.
 * - Demo "Firma Perspektifi" (`demoCompanyId`) YALNIZCA `isDemoEnvironment() === true` iken
 *   ve gerçek partner hesabı olmayan demo kullanıcılarında çalışır; `DISABLE_DEMO_MODE=true`
 *   durumunda tamamen reddedilir (`403 DEMO_PERSPECTIVE_DISABLED`).
 * - Demo perspektifi seçildiğinde kullanıcı Süper Yönetici ayrıcalığıyla DEĞİL, kısıtlı tek firma
 *   kapsamıyla (`isPartnerScoped: true`, `isSuperAdmin: false`) sorgulanır.
 */

import { NextResponse } from "next/server"
import { isDemoEnvironment } from "@/lib/config/production-feature-flags"
import {
  handleTourismApiError,
  requireTourismAccess,
  TourismDomainError,
} from "@/lib/tourism/security"
import type { TourismPermissionAction, TourismScopeContext } from "@/lib/tourism/types"
import {
  createAtomicCrossReservation,
  createSettlementPeriod,
  exportPartnerNetworkReportBuffer,
  getPartnerNetworkWorkspaceSnapshot,
  invitePartnerCompany,
  issuePartnerEDocument,
  postPartnerMessage,
  respondOrUpdateCrossReservation,
  respondOrUpdatePartnership,
  respondToSettlement,
  upsertSharedResource,
  withdrawOrToggleSharedResource,
} from "@/lib/tourism/b2b"

function resolveB2bCompanyScope(
  baseScope: TourismScopeContext,
  requestedDemoCompanyId?: string | null
): { effectiveScope: TourismScopeContext; demoPerspectiveActive: boolean } {
  const cleanId = requestedDemoCompanyId?.trim() || ""

  // Canlı/müşteri kurulumunda (DISABLE_DEMO_MODE=true) demo perspektifi kesinlikle reddedilir
  if (cleanId && !isDemoEnvironment()) {
    throw new TourismDomainError(
      "FORBIDDEN_COMPANY_SCOPE",
      "Firma perspektifi değiştirme yalnızca demo ortamında kullanılabilir.",
      403
    )
  }

  // Gerçek partner kullanıcısı başka firmaya geçemez (fail-closed)
  if (baseScope.isPartnerScoped) {
    if (cleanId && cleanId !== baseScope.partnerCompanyId) {
      throw new TourismDomainError(
        "FORBIDDEN_COMPANY_SCOPE",
        "Partner kullanıcıları başka bir firmanın perspektifine geçiş yapamaz.",
        403
      )
    }
    return { effectiveScope: baseScope, demoPerspectiveActive: false }
  }

  // Demo ortamında tek-tık "Firma Perspektifi" (Süper Yönetici DEĞİL, kısıtlı tek firma kapsamı)
  if (isDemoEnvironment() && cleanId) {
    return {
      effectiveScope: {
        ...baseScope,
        partnerCompanyId: cleanId,
        effectiveCompanyId: cleanId,
        isPartnerScoped: true,
        isSuperAdmin: false,
        isPlatformDeveloper: false,
      },
      demoPerspectiveActive: true,
    }
  }

  return { effectiveScope: baseScope, demoPerspectiveActive: false }
}

export async function GET(req: Request) {
  try {
    const url = new URL(req.url)
    const section = url.searchParams.get("section") || "overview"
    const requestedDemoCompanyId = url.searchParams.get("demoCompanyId")

    const auth = await requireTourismAccess({
      flagKey: "turizm_b2b",
      resource: "turizm_b2b",
      action: "read",
      allowPartnerScoped: true,
    })
    if (auth instanceof NextResponse) return auth
    const baseScope = auth.scope

    const { effectiveScope, demoPerspectiveActive } = resolveB2bCompanyScope(
      baseScope,
      requestedDemoCompanyId
    )

    if (section === "export_report") {
      const format = url.searchParams.get("format") === "pdf" ? "pdf" : "xlsx"
      const result = await exportPartnerNetworkReportBuffer(effectiveScope, format)
      return new NextResponse(new Uint8Array(result.buffer), {
        status: 200,
        headers: {
          "Content-Type": result.contentType,
          "Content-Disposition": `attachment; filename="${result.filename}"`,
        },
      })
    }

    const snapshot = await getPartnerNetworkWorkspaceSnapshot(effectiveScope, {
      resourceType: url.searchParams.get("resourceType") || undefined,
      city: url.searchParams.get("city") || undefined,
      startAt: url.searchParams.get("startAt") || undefined,
      endAt: url.searchParams.get("endAt") || undefined,
      search: url.searchParams.get("search") || undefined,
    })

    // Demo perspektifi açıkken dahi (gerçek kullanıcı iç yöneticiyse) switcher listesini koru
    let demoPerspectiveCompanies = snapshot.demoPerspectiveCompanies
    if (isDemoEnvironment() && !baseScope.isPartnerScoped && demoPerspectiveCompanies.length === 0) {
      const { prisma } = await import("@/lib/db")
      const allComps: any[] = await (prisma as any).turizmPartnerCompany.findMany().catch(() => [])
      demoPerspectiveCompanies = allComps.map((c) => ({
        id: c.id,
        code: c.code,
        name: c.name,
        companyType: c.companyType,
        city: c.city,
      }))
    }

    return NextResponse.json({
      success: true,
      data: {
        ...snapshot,
        demoPerspectiveActive,
        demoPerspectiveCompanies,
      },
    })
  } catch (error) {
    return handleTourismApiError(error)
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}))
    const actionName = String(body?.action || "").trim()
    if (!actionName) {
      throw new TourismDomainError("VALIDATION_ERROR", "İşlem tipi (`action`) belirtilmelidir.", 400)
    }

    const createActions = new Set([
      "invite_partner",
      "upsert_shared_resource",
      "create_cross_reservation",
      "create_settlement",
      "post_message",
      "issue_edocument",
    ])
    const permAction: TourismPermissionAction = createActions.has(actionName) ? "create" : "update"

    const auth = await requireTourismAccess({
      flagKey: "turizm_b2b",
      resource: "turizm_b2b",
      action: permAction,
      allowPartnerScoped: true,
    })
    if (auth instanceof NextResponse) return auth
    const baseScope = auth.scope

    const { effectiveScope } = resolveB2bCompanyScope(baseScope, body?.demoCompanyId)

    let data: unknown
    switch (actionName) {
      case "invite_partner":
        data = await invitePartnerCompany(effectiveScope, body)
        break
      case "respond_partnership":
        data = await respondOrUpdatePartnership(effectiveScope, body)
        break
      case "upsert_shared_resource":
        data = await upsertSharedResource(effectiveScope, body)
        break
      case "toggle_shared_resource":
        data = await withdrawOrToggleSharedResource(effectiveScope, body)
        break
      case "create_cross_reservation":
        data = await createAtomicCrossReservation(effectiveScope, body)
        break
      case "respond_cross_reservation":
        data = await respondOrUpdateCrossReservation(effectiveScope, body)
        break
      case "create_settlement":
        data = await createSettlementPeriod(effectiveScope, body)
        break
      case "respond_settlement":
        data = await respondToSettlement(effectiveScope, body)
        break
      case "issue_edocument":
        data = await issuePartnerEDocument(effectiveScope, body)
        break
      case "post_message":
        data = await postPartnerMessage(effectiveScope, body)
        break
      default:
        throw new TourismDomainError("VALIDATION_ERROR", `Desteklenmeyen B2B işlemi: ${actionName}`, 400)
    }

    return NextResponse.json({ success: true, data })
  } catch (error) {
    return handleTourismApiError(error)
  }
}
