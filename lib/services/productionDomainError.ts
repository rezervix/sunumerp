/**
 * Sunum ERP — Üretim Domain Hata Sınıfı (Saf / Pure TypeScript)
 * 
 * Bu dosya veritabanından, denetim logundan ve sunucu modüllerinden (fs, next/server vb.)
 * tamamen bağımsızdır. Hem istemci (client) hem sunucu (server) ortamlarında güvenle kullanılabilir.
 */

export type ProductionErrorCode =
  | "FEATURE_DISABLED"
  | "UNAUTHORIZED"
  | "FORBIDDEN"
  | "VALIDATION_ERROR"
  | "NOT_FOUND"
  | "CONFLICT"
  | "INVALID_STATE_TRANSITION"
  | "INSUFFICIENT_STOCK"
  | "CAPACITY_EXCEEDED"
  | "CALIBRATION_EXPIRED"
  | "INTERNAL_ERROR"

export const DEFAULT_ERROR_STATUS: Record<ProductionErrorCode, number> = {
  FEATURE_DISABLED: 403,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  VALIDATION_ERROR: 400,
  NOT_FOUND: 404,
  CONFLICT: 409,
  INVALID_STATE_TRANSITION: 409,
  INSUFFICIENT_STOCK: 422,
  CAPACITY_EXCEEDED: 422,
  CALIBRATION_EXPIRED: 422,
  INTERNAL_ERROR: 500,
}

/**
 * Üretim modülleri için standart alan (domain) hata sınıfı.
 * Hem (code, message, details?, statusOverride?) hem de
 * (message, code?, detailsOrStatus?, statusOverride?) imzalarını destekler.
 */
export class ProductionDomainError extends Error {
  public readonly code: ProductionErrorCode
  public readonly status: number
  public readonly details?: Record<string, unknown>

  constructor(
    first: ProductionErrorCode | string,
    second?: string | ProductionErrorCode,
    third?: Record<string, unknown> | number,
    fourth?: number
  ) {
    const KNOWN_CODES = new Set<string>([
      "FEATURE_DISABLED",
      "UNAUTHORIZED",
      "FORBIDDEN",
      "VALIDATION_ERROR",
      "NOT_FOUND",
      "CONFLICT",
      "INVALID_STATE_TRANSITION",
      "INSUFFICIENT_STOCK",
      "CAPACITY_EXCEEDED",
      "CALIBRATION_EXPIRED",
      "INTERNAL_ERROR",
    ])

    let resolvedCode: ProductionErrorCode = "INTERNAL_ERROR"
    let resolvedMessage = ""
    let resolvedDetails: Record<string, unknown> | undefined = undefined
    let resolvedStatus: number | undefined = undefined

    if (KNOWN_CODES.has(first)) {
      // (code, message, details?, statusOverride?)
      resolvedCode = first as ProductionErrorCode
      resolvedMessage = typeof second === "string" ? second : first
      if (typeof third === "number") {
        resolvedStatus = third
      } else if (typeof third === "object" && third !== null) {
        resolvedDetails = third as Record<string, unknown>
        if (typeof fourth === "number") resolvedStatus = fourth
      }
    } else {
      // (message, code?, detailsOrStatus?, statusOverride?)
      resolvedMessage = first
      if (second && KNOWN_CODES.has(second)) {
        resolvedCode = second as ProductionErrorCode
      } else {
        resolvedCode = "VALIDATION_ERROR"
      }
      if (typeof third === "number") {
        resolvedStatus = third
      } else if (typeof third === "object" && third !== null) {
        resolvedDetails = third as Record<string, unknown>
        if (typeof fourth === "number") resolvedStatus = fourth
      }
    }

    super(resolvedMessage)
    this.name = "ProductionDomainError"
    this.code = resolvedCode
    this.status = resolvedStatus ?? DEFAULT_ERROR_STATUS[resolvedCode] ?? 400
    this.details = resolvedDetails
  }
}

