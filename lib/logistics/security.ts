/**
 * Lojistik & Depo Yönetimi — Sunucu Tarafı Güvenlik, Özellik Bayrağı, Denetim ve Tedarikçi Kapsam Kuralı
 *
 * KURALLAR:
 * - Yalnızca sunucu (API Route / Server Service) katmanında import edilir.
 * - "Tedarikçi" rolündeki dış kullanıcılar SADECE kendi bağlı oldukları supplierId kapsamındaki
 *   satınalma/sevkiyat/ASN/RFQ kayıtlarına erişebilir (Karar #4).
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
import { TEDARIKCI_ROLE_NAME } from "./constants"
import type {
  LogisticsFeatureFlagKey,
  LogisticsPermissionAction,
  LogisticsScopeContext,
} from "./types"
import { getServerLogisticsFeatureFlags } from "@/lib/system-config"

export type LogisticsErrorCode =
  | "FEATURE_DISABLED"
  | "FORBIDDEN_SUPPLIER_SCOPE"
  | "VALIDATION_ERROR"
  | "NOT_FOUND"
  | "INTERNAL_ERROR"

export class LogisticsDomainError extends Error {
  constructor(
    public readonly code: LogisticsErrorCode,
    message: string,
    public readonly status: number = 400,
    public readonly details?: Record<string, unknown>
  ) {
    super(message)
    this.name = "LogisticsDomainError"
  }
}

export function assertLogisticsFeatureEnabled(
  flagKey: LogisticsFeatureFlagKey,
  branchOrCompanyId?: string | null
): void {
  const flags = getServerLogisticsFeatureFlags(branchOrCompanyId)
  if (!flags[flagKey]) {
    throw new LogisticsDomainError(
      "FEATURE_DISABLED",
      `Bu işlem şu anda etkin değil (${flagKey}).`,
      403,
      { moduleKey: flagKey }
    )
  }
}

export async function logLogisticsAudit(params: {
  userId: string
  action: string
  resource: string
  resourceId?: string
  moduleKey?: LogisticsFeatureFlagKey | string
  branchId?: string
  supplierId?: string | null
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
      supplierId: params.supplierId ?? undefined,
      ...(params.metadata ?? {}),
      loggedAt: new Date().toISOString(),
    },
  })
}

/**
 * Kullanıcının Lojistik & Tedarikçi kapsam bağlamını çözümler.
 * Eğer kullanıcı "Tedarikçi" rolündeyse (ve üst yönetici değilse) isSupplierScoped=true döner.
 */
export async function getLogisticsScopeContext(
  payload: AuthPayload,
  branchId?: string
): Promise<LogisticsScopeContext> {
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

  const hasSupplierRole = roleNames.includes(TEDARIKCI_ROLE_NAME)
  const isSupplierScoped = !superAdmin && !platformDev && hasSupplierRole

  let supplierId: string | null = user?.supplierId ?? null
  let supplierCode: string | null = null

  if (isSupplierScoped && supplierId) {
    const sup = await (prisma as any).supplier
      .findUnique({ where: { id: supplierId } })
      .catch(() => null)
    supplierCode = sup?.code ?? null
  }

  return {
    userId: payload.userId,
    username: payload.username,
    branchId: branchId ?? payload.branchId,
    roleNames,
    isSuperAdmin: superAdmin,
    isPlatformDeveloper: platformDev,
    isSupplierScoped,
    supplierId,
    supplierCode,
  }
}

/**
 * Kısıtlı Tedarikçi kullanıcısı için bellek içi liste/kayıt dizisini filtreler.
 * Yalnızca kendi supplierId değerine sahip kayıtlar görünür kalır.
 */
export function applySupplierScopeFilter<T extends Record<string, any>>(
  records: T[],
  scope: LogisticsScopeContext,
  supplierIdField: string = "supplierId"
): T[] {
  if (!scope.isSupplierScoped) return records
  if (!scope.supplierId) return []
  return records.filter((rec) => rec?.[supplierIdField] === scope.supplierId)
}

/**
 * Prisma sorgusu için otomatik kapsam where koşulu üretir (fail-closed).
 */
export function buildSupplierPrismaWhere(
  scope: LogisticsScopeContext,
  baseWhere: Record<string, any> = {},
  supplierIdField: string = "supplierId"
): Record<string, any> {
  if (!scope.isSupplierScoped) return baseWhere
  if (!scope.supplierId) {
    return { ...baseWhere, [supplierIdField]: "__UNBOUND_SUPPLIER_DENIED__" }
  }
  return { ...baseWhere, [supplierIdField]: scope.supplierId }
}

/**
 * Tekil bir kayda erişimde tedarikçi kapsam sınırını doğrular.
 */
export function assertSupplierRecordAccess(
  scope: LogisticsScopeContext,
  recordSupplierId?: string | null
): void {
  if (!scope.isSupplierScoped) return
  if (!scope.supplierId || recordSupplierId !== scope.supplierId) {
    throw new LogisticsDomainError(
      "FORBIDDEN_SUPPLIER_SCOPE",
      "Yalnızca kendi firmanıza atanmış satınalma ve sevkiyat kayıtlarına erişebilirsiniz.",
      403,
      { expectedSupplierId: scope.supplierId ?? null }
    )
  }
}

/**
 * Tüm yeni Lojistik API endpoint'leri için tek noktadan Özellik Bayrağı + RBAC Yetki + Kapsam Guard'ı.
 */
export async function requireLogisticsAccess(params: {
  flagKey: LogisticsFeatureFlagKey
  resource: string
  action: LogisticsPermissionAction
  branchId?: string
}): Promise<{ payload: AuthPayload; scope: LogisticsScopeContext } | NextResponse> {
  const auth = await requirePermission(params.resource, params.action, params.branchId)
  if (auth instanceof NextResponse) return auth

  try {
    assertLogisticsFeatureEnabled(
      params.flagKey,
      params.branchId ?? auth.payload.branchId
    )
    const scope = await getLogisticsScopeContext(
      auth.payload,
      params.branchId ?? auth.payload.branchId
    )
    return { payload: auth.payload, scope }
  } catch (err) {
    return handleLogisticsApiError(err)
  }
}

export function handleLogisticsApiError(
  error: unknown,
  fallbackMessage = "Lojistik servisi işlemi sırasında beklenmeyen bir hata oluştu."
): NextResponse {
  if (error instanceof LogisticsDomainError) {
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
        code: "INTERNAL_ERROR" satisfies LogisticsErrorCode,
      },
      { status: 500 }
    )
  }

  return NextResponse.json(
    {
      error: fallbackMessage,
      code: "INTERNAL_ERROR" satisfies LogisticsErrorCode,
    },
    { status: 500 }
  )
}
