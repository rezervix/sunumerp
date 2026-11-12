import { NextResponse } from "next/server"
import { createAuditLog } from "@/lib/audit"
import {
  PRODUCTION_MODULES_CATALOG,
  type ProductionFeatureFlagKey,
} from "@/lib/config/production-feature-flags"
import { getServerProductionFeatureFlags } from "@/lib/system-config"
import {
  ProductionDomainError,
  DEFAULT_ERROR_STATUS,
  type ProductionErrorCode,
} from "./productionDomainError"

export {
  ProductionDomainError,
  DEFAULT_ERROR_STATUS,
  type ProductionErrorCode,
}

export type ProductionAuditResource =
  | "URETIM_ALTYAPI"
  | "URETIM_BOM_ROTA"
  | "URETIM_MRP_MPS"
  | "URETIM_IS_EMRI"
  | "URETIM_KAPASITE"
  | "URETIM_KALITE"
  | "URETIM_BAKIM"

export type ProductionAuditAction =
  | "VIEW"
  | "CREATE"
  | "UPDATE"
  | "DELETE"
  | "APPROVE"
  | "REJECT"
  | "RELEASE"
  | "START_OPERATION"
  | "COMPLETE_OPERATION"
  | "CONSUME_MATERIAL"
  | "PRODUCE_OUTPUT"
  | "RECORD_SCRAP"
  | "QA_PASS"
  | "QA_FAIL"
  | "RUN_MRP"
  | "FEATURE_FLAG_BLOCKED"



/**
 * Özellik bayrağının (feature flag) sunucu tarafında açık olduğunu doğrular.
 * Kapalıysa 403 FEATURE_DISABLED fırlatır.
 */
export function assertProductionFeatureEnabled(
  flag: ProductionFeatureFlagKey,
  branchOrCompanyId?: string | null
): void {
  const flags = getServerProductionFeatureFlags(branchOrCompanyId)
  if (!flags[flag]) {
    const modInfo = PRODUCTION_MODULES_CATALOG.find((m) => m.key === flag)
    throw new ProductionDomainError(
      "FEATURE_DISABLED",
      `${modInfo?.label || flag} modülü şu anda devre dışıdır (özellik bayrağı kapalı).`,
      { flag, branchOrCompanyId: branchOrCompanyId || null }
    )
  }
}

export interface LogProductionAuditInput {
  userId: string
  action: ProductionAuditAction
  resource: ProductionAuditResource
  resourceId?: string
  branchId?: string | null
  moduleKey?: ProductionFeatureFlagKey
  documentNo?: string
  previousState?: unknown
  newState?: unknown
  beforeData?: unknown
  afterData?: unknown
  metadata?: Record<string, unknown>
}

/**
 * Mevcut lib/audit.ts (createAuditLog) yapısını bozmadan üretim modülleri için
 * zenginleştirilmiş denetim kaydı (AuditLog) oluşturur.
 */
export async function logProductionAudit(input: LogProductionAuditInput) {
  return await createAuditLog({
    userId: input.userId,
    action: input.action,
    resource: input.resource,
    resourceId: input.resourceId,
    details: {
      domain: "URETIM",
      moduleKey: input.moduleKey || null,
      branchId: input.branchId || null,
      documentNo: input.documentNo || null,
      previousState: input.previousState ?? input.beforeData ?? null,
      newState: input.newState ?? input.afterData ?? null,
      ...(input.metadata || {}),
      loggedAt: new Date().toISOString(),
    },
  })
}

export const recordProductionAuditLog = logProductionAudit

/**
 * Üretim API rotalarında yakalanan hataları mevcut sistem sözleşmesine uygun
 * ({ error: string, code: ProductionErrorCode, details?: ... }) JSON yanıtına dönüştürür.
 */
export function handleProductionApiError(
  error: unknown,
  fallbackMessage: string = "Üretim servisi işlemi sırasında beklenmeyen bir hata oluştu."
): NextResponse {
  if (error instanceof ProductionDomainError) {
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
    if (error.message.includes("Yetersiz stok bakiyesi")) {
      return NextResponse.json(
        {
          error: error.message,
          code: "INSUFFICIENT_STOCK" satisfies ProductionErrorCode,
        },
        { status: 422 }
      )
    }
    return NextResponse.json(
      {
        error: error.message || fallbackMessage,
        code: "INTERNAL_ERROR" satisfies ProductionErrorCode,
      },
      { status: 500 }
    )
  }

  return NextResponse.json(
    {
      error: fallbackMessage,
      code: "INTERNAL_ERROR" satisfies ProductionErrorCode,
    },
    { status: 500 }
  )
}
