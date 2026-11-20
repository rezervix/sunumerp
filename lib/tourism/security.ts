/**
 * Turizm, Araç Kiralama, Konaklama ve B2B Partner Ekosistemi —
 * Sunucu Tarafı Güvenlik, Özellik Bayrağı, Denetim ve Çok Firmalı (Kiracı) Kapsam Koruyucuları
 *
 * KURALLAR:
 * - Yalnızca sunucu (API Route / Server Service) katmanında import edilir; istemci bileşenleri import etmez.
 * - "Partner" rolündeki veya `partnerCompanyId` bağlı dış firma kullanıcıları SADECE kendi firmasına ait
 *   (veya tarafı oldukları onaylı partnerlik/çapraz rezervasyon) kayıtlarına erişebilir (fail-closed).
 * - Mevcut tek firmalı/şubeli iç personel davranışı bozulmaz (`isPartnerScoped = false`).
 * - Dış tedarikçi (`Tedarikçi`) hesapları turizm modüllerine erişemez (`403 FORBIDDEN_SUPPLIER_SCOPE`).
 */

import { NextResponse } from "next/server"
import { createAuditLog } from "@/lib/audit"
import { prisma } from "@/lib/db"
import {
  isPlatformDeveloperUser,
  isSuperAdminUser,
  requirePermission,
  type AuthPayload,
} from "@/lib/auth/server-permission"
import { getServerTourismFeatureFlags } from "@/lib/system-config"
import { TEDARIKCI_ROLE_NAME } from "@/lib/logistics/constants"
import { MAIN_COMPANY_ID, PARTNER_ROLE_NAME } from "./constants"
import type {
  PartnerCompanyType,
  TourismFeatureFlagKey,
  TourismPermissionAction,
  TourismScopeContext,
} from "./types"

export type TourismErrorCode =
  | "FEATURE_DISABLED"
  | "FORBIDDEN_COMPANY_SCOPE"
  | "FORBIDDEN_PARTNER_SCOPE"
  | "FORBIDDEN_SUPPLIER_SCOPE"
  | "VALIDATION_ERROR"
  | "NOT_FOUND"
  | "CONFLICT"
  | "UNAUTHORIZED"
  | "INTERNAL_ERROR"
  | (string & {})

export class TourismDomainError extends Error {
  constructor(
    public readonly code: TourismErrorCode,
    message: string,
    public readonly status: number = 400,
    public readonly details?: Record<string, unknown>
  ) {
    super(message)
    this.name = "TourismDomainError"
  }
}

export function assertTourismFeatureEnabled(
  flagKey: TourismFeatureFlagKey,
  branchOrCompanyId?: string | null
): void {
  const flags = getServerTourismFeatureFlags(branchOrCompanyId)
  if (!flags[flagKey]) {
    throw new TourismDomainError(
      "FEATURE_DISABLED",
      `Bu modül şu anda etkin değil (${flagKey}).`,
      403,
      { moduleKey: flagKey }
    )
  }
}

export async function logTourismAudit(params: {
  userId: string
  action: string
  resource: string
  resourceId?: string
  moduleKey?: TourismFeatureFlagKey | string
  branchId?: string
  companyId?: string | null
  metadata?: Record<string, unknown>
}) {
  return await createAuditLog({
    userId: params.userId,
    action: params.action,
    resource: params.resource,
    resourceId: params.resourceId,
    details: {
      moduleKey: params.moduleKey,
      branchId: params.branchId,
      companyId: params.companyId ?? undefined,
      ...(params.metadata ?? {}),
      loggedAt: new Date().toISOString(),
    },
  })
}

/**
 * Kullanıcının Çok Firmalı (Kiracı / Partner) kapsam bağlamını çözümler.
 * - Üst yöneticiler (`Super Admin`, `Yonetim Kurulu Uyesi`, `Genel Mudur`) ve iç personel:
 *   `isPartnerScoped = false`, `effectiveCompanyId = MAIN_COMPANY_ID`.
 * - "Partner" rolündeki veya `partnerCompanyId` bağlı harici firma kullanıcıları:
 *   `isPartnerScoped = true`, `partnerCompanyId = user.partnerCompanyId`.
 *   Eğer bağlı firma aktif değilse veya bulunamazsa `partnerCompanyId = null` döner (fail-closed).
 */
export async function getTourismScopeContext(
  payload: AuthPayload,
  branchId?: string
): Promise<TourismScopeContext> {
  const [superAdmin, platformDev, user, branchRoles] = await Promise.all([
    isSuperAdminUser(payload.userId),
    isPlatformDeveloperUser(payload.userId, payload.username),
    (prisma as any).user
      .findUnique({ where: { id: payload.userId } })
      .catch(() => null),
    prisma.userBranchRole
      .findMany({
        where: branchId
          ? { userId: payload.userId, branchId }
          : { userId: payload.userId },
        include: { role: true },
      })
      .catch(() => []),
  ])

  const roleNames = Array.from(
    new Set(
      (branchRoles || [])
        .map((ubr: any) => ubr?.role?.name)
        .filter((n: unknown): n is string => typeof n === "string")
    )
  )

  const effectiveSuperAdmin =
    superAdmin ||
    roleNames.some((n) =>
      ["Super Admin", "Yonetim Kurulu Uyesi", "Genel Mudur"].includes(n)
    )

  const hasSupplierRole = roleNames.includes(TEDARIKCI_ROLE_NAME)
  const isSupplierScoped = !effectiveSuperAdmin && !platformDev && hasSupplierRole

  const rawPartnerCompanyId: string | null = user?.partnerCompanyId ?? null
  const hasPartnerRole = roleNames.includes(PARTNER_ROLE_NAME)
  const isPartnerScoped =
    !effectiveSuperAdmin && !platformDev && (hasPartnerRole || Boolean(rawPartnerCompanyId))

  let partnerCompanyId: string | null = null
  let partnerCompanyCode: string | null = null
  let partnerCompanyName: string | null = null
  let partnerCompanyType: PartnerCompanyType | null = null

  if (isPartnerScoped && rawPartnerCompanyId) {
    const comp = await (prisma as any).turizmPartnerCompany
      .findUnique({ where: { id: rawPartnerCompanyId } })
      .catch(() => null)
    if (comp && comp.status === "ACTIVE") {
      partnerCompanyId = comp.id
      partnerCompanyCode = comp.code ?? null
      partnerCompanyName = comp.name ?? null
      partnerCompanyType = (comp.companyType as PartnerCompanyType) ?? null
    }
  }

  return {
    userId: payload.userId,
    username: payload.username,
    branchId: branchId ?? payload.branchId,
    roleNames,
    isSuperAdmin: effectiveSuperAdmin,
    isPlatformDeveloper: platformDev,
    isSupplierScoped,
    supplierId: user?.supplierId ?? null,
    isPartnerScoped,
    partnerCompanyId,
    partnerCompanyCode,
    partnerCompanyName,
    partnerCompanyType,
    effectiveCompanyId: isPartnerScoped
      ? partnerCompanyId ?? "__UNBOUND_PARTNER_DENIED__"
      : MAIN_COMPANY_ID,
  }
}

/**
 * Bellek içi kayıt dizisini firma kapsamına göre filtreler (fail-closed).
 * - İç personel / tek firmalı çalışma: `isPartnerScoped === false` iken tüm kayıtlar korunur (mevcut davranış).
 * - Harici Partner kullanıcısı: yalnızca kendi `partnerCompanyId` kaydına (veya izin verilmiş karşı-taraf alanına)
 *   uyan kayıtları görür; bağlı firması yoksa `[]` döner.
 */
export function applyCompanyScopeFilter<T extends Record<string, any>>(
  records: T[],
  scope: TourismScopeContext,
  options?: {
    ownerField?: string
    counterpartyFields?: string[]
  }
): T[] {
  if (!scope.isPartnerScoped) return records
  if (!scope.partnerCompanyId) return []

  const ownerField = options?.ownerField ?? "ownerCompanyId"
  const counterpartyFields = options?.counterpartyFields ?? []

  return records.filter((rec) => {
    if (!rec) return false
    if (rec[ownerField] === scope.partnerCompanyId) return true
    return counterpartyFields.some((f) => rec[f] === scope.partnerCompanyId)
  })
}

/**
 * Prisma sorgusu için otomatik çok-firmalı (kiracı) where koşulu üretir (fail-closed).
 */
export function buildCompanyPrismaWhere(
  scope: TourismScopeContext,
  baseWhere: Record<string, any> = {},
  options?: {
    ownerField?: string
    counterpartyFields?: string[]
  }
): Record<string, any> {
  if (!scope.isPartnerScoped) return baseWhere

  const ownerField = options?.ownerField ?? "ownerCompanyId"
  if (!scope.partnerCompanyId) {
    return { ...baseWhere, [ownerField]: "__UNBOUND_PARTNER_DENIED__" }
  }

  const counterpartyFields = options?.counterpartyFields ?? []
  if (counterpartyFields.length === 0) {
    return { ...baseWhere, [ownerField]: scope.partnerCompanyId }
  }

  const scopeOr = [
    { [ownerField]: scope.partnerCompanyId },
    ...counterpartyFields.map((f) => ({ [f]: scope.partnerCompanyId })),
  ]

  if (baseWhere.AND && Array.isArray(baseWhere.AND)) {
    return { ...baseWhere, AND: [...baseWhere.AND, { OR: scopeOr }] }
  }
  if (baseWhere.OR) {
    return { AND: [baseWhere, { OR: scopeOr }] }
  }
  return { ...baseWhere, OR: scopeOr }
}

/**
 * Tekil bir kayda erişimde firma/kiracı sınırını doğrular.
 * Partner kullanıcısı başka bir firmanın kaydına erişmeye çalışırsa `403 FORBIDDEN_COMPANY_SCOPE` fırlatır.
 */
export function assertCompanyRecordAccess(
  scope: TourismScopeContext,
  recordOwnerCompanyId?: string | null,
  options?: {
    allowedCounterpartyCompanyIds?: Array<string | null | undefined>
  }
): void {
  if (!scope.isPartnerScoped) return
  if (!scope.partnerCompanyId) {
    throw new TourismDomainError(
      "FORBIDDEN_COMPANY_SCOPE",
      "Hesabınız aktif bir partner firmasına bağlı olmadığı için bu kayda erişemezsiniz.",
      403
    )
  }

  const isOwner = recordOwnerCompanyId === scope.partnerCompanyId
  const isCounterparty = (options?.allowedCounterpartyCompanyIds ?? []).some(
    (cid) => Boolean(cid) && cid === scope.partnerCompanyId
  )

  if (!isOwner && !isCounterparty) {
    throw new TourismDomainError(
      "FORBIDDEN_COMPANY_SCOPE",
      "Yalnızca kendi firmanıza ait veya tarafı olduğunuz partnerlik kayıtlarına erişebilirsiniz.",
      403,
      { expectedCompanyId: scope.partnerCompanyId }
    )
  }
}

/**
 * İki firma arasındaki partnerlik kaydına erişim denetimi.
 */
export function assertPartnershipAccess(
  scope: TourismScopeContext,
  partnership: { requesterCompanyId?: string | null; targetCompanyId?: string | null }
): void {
  assertCompanyRecordAccess(scope, partnership.requesterCompanyId, {
    allowedCounterpartyCompanyIds: [partnership.targetCompanyId],
  })
}

/**
 * Firmalar arası çapraz rezervasyon kaydına erişim denetimi.
 */
export function assertCrossReservationAccess(
  scope: TourismScopeContext,
  reservation: { ownerCompanyId?: string | null; bookingCompanyId?: string | null }
): void {
  assertCompanyRecordAccess(scope, reservation.ownerCompanyId, {
    allowedCounterpartyCompanyIds: [reservation.bookingCompanyId],
  })
}

/**
 * Tüm yeni Turizm / Rent-a-Car / Otel / Partner Ağı API endpoint'leri için tek noktadan
 * Özellik Bayrağı + RBAC Yetki + Çok Firmalı Kapsam Guard'ı.
 */
export async function requireTourismAccess(params: {
  flagKey: TourismFeatureFlagKey
  resource: string
  action: TourismPermissionAction
  branchId?: string
  allowPartnerScoped?: boolean
}): Promise<{ payload: AuthPayload; scope: TourismScopeContext } | NextResponse> {
  const auth = await requirePermission(params.resource, params.action, params.branchId)
  if (auth instanceof NextResponse) return auth

  try {
    assertTourismFeatureEnabled(
      params.flagKey,
      params.branchId ?? auth.payload.branchId
    )
    const scope = await getTourismScopeContext(
      auth.payload,
      params.branchId ?? auth.payload.branchId
    )

    if (scope.isSupplierScoped) {
      throw new TourismDomainError(
        "FORBIDDEN_SUPPLIER_SCOPE",
        "Dış tedarikçi portal hesapları turizm ve partner ağı modüllerine erişemez.",
        403
      )
    }

    if (scope.isPartnerScoped && !params.allowPartnerScoped) {
      throw new TourismDomainError(
        "FORBIDDEN_PARTNER_SCOPE",
        "Dış partner hesapları dahili işletme ekranlarına erişemez; yalnızca Partner Ağı uçlarını kullanabilir.",
        403
      )
    }

    if (scope.isPartnerScoped && !scope.partnerCompanyId) {
      throw new TourismDomainError(
        "FORBIDDEN_COMPANY_SCOPE",
        "Partner kullanıcı hesabına aktif bir firma atanmamış.",
        403
      )
    }

    return { payload: auth.payload, scope }
  } catch (err) {
    return handleTourismApiError(err)
  }
}

export function handleTourismApiError(
  error: unknown,
  fallbackMessage = "Turizm servisi işlemi sırasında beklenmeyen bir hata oluştu."
): NextResponse {
  if (error instanceof TourismDomainError) {
    return NextResponse.json(
      {
        error: error.message,
        code: error.code,
        ...(error.details ? { details: error.details } : {}),
      },
      { status: error.status }
    )
  }

  if (error instanceof Error) {
    return NextResponse.json(
      {
        error: error.message || fallbackMessage,
        code: "INTERNAL_ERROR" satisfies TourismErrorCode,
      },
      { status: 500 }
    )
  }

  return NextResponse.json(
    {
      error: fallbackMessage,
      code: "INTERNAL_ERROR" satisfies TourismErrorCode,
    },
    { status: 500 }
  )
}
