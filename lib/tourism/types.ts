/**
 * Turizm, Araç Kiralama, Konaklama ve B2B Partner Ekosistemi — Saf Paylaşılan Tip Tanımları
 *
 * KURALLAR:
 * - Hem sunucu hem istemci ("use client") bileşenleri tarafından güvenle import edilebilir.
 * - fs, path, prisma/db veya audit modülleri ASLA import edilmez.
 */

export type TourismFeatureFlagKey =
  | "turizm_rentacar"
  | "turizm_otel"
  | "turizm_tur"
  | "turizm_b2b"

export type TourismFeatureFlagsMap = Record<TourismFeatureFlagKey, boolean>

export interface TourismFeatureFlagsConfig
  extends Partial<TourismFeatureFlagsMap> {
  modules?: Partial<TourismFeatureFlagsMap>
  branchOverrides?: Record<string, Partial<TourismFeatureFlagsMap>>
  activeSectorPacket?: TourismSectorPacketKey | null
  updatedAt?: string
  updatedBy?: string
}

export type TourismSectorPacketKey =
  | "RENTACAR_ONLY"
  | "HOTEL_ONLY"
  | "TOUR_OPERATOR_ONLY"
  | "HOTEL_AND_TOUR"
  | "FULL_TOURISM_ECOSYSTEM"

export interface TourismSectorPacketDefinition {
  key: TourismSectorPacketKey
  title: string
  description: string
  flags: TourismFeatureFlagsMap
}

export interface TourismModuleCatalogEntry {
  key: TourismFeatureFlagKey
  order: number
  title: string
  shortTitle: string
  menuCategoryId: string
  menuCategoryTitle: string
  description: string
  resourceKey: string
  primaryHref: string
  sortOrder: number
}

export type TourismPermissionAction =
  | "read"
  | "create"
  | "update"
  | "delete"
  | "approve"

export type PartnerCompanyType =
  | "MAIN_OPERATOR"
  | "RENTACAR"
  | "TOUR_OPERATOR"
  | "HOTEL"
  | "TRANSFER"

export type PartnerCompanyStatus = "ACTIVE" | "SUSPENDED" | "INACTIVE"

export type PartnershipStatus =
  | "PENDING"
  | "APPROVED"
  | "REJECTED"
  | "SUSPENDED"

export type SharedResourceType =
  | "VEHICLE"
  | "DRIVER"
  | "GUIDE"
  | "ROOM_ALLOTMENT"
  | "TRANSFER_SLOT"

export type SharedResourceVisibility =
  | "ALL_APPROVED_PARTNERS"
  | "SELECTED_PARTNERS"
  | "PRIVATE"

export type SharedResourceStatus = "ACTIVE" | "PAUSED" | "ARCHIVED"

export type CrossReservationStatus =
  | "HOLD"
  | "PENDING_APPROVAL"
  | "CONFIRMED"
  | "REJECTED"
  | "CANCELLED"
  | "COMPLETED"

/**
 * Sunucu tarafı çok firmalı (kiracı) & partner kapsam bağlamı.
 * Mevcut tek firmalı/şubeli iç personel için `isPartnerScoped = false` döner.
 */
export interface TourismScopeContext {
  userId: string
  username: string
  branchId?: string
  roleNames: string[]
  isSuperAdmin: boolean
  isPlatformDeveloper: boolean
  isSupplierScoped: boolean
  supplierId?: string | null
  isPartnerScoped: boolean
  partnerCompanyId: string | null
  partnerCompanyCode?: string | null
  partnerCompanyName?: string | null
  partnerCompanyType?: PartnerCompanyType | null
  effectiveCompanyId: string
}

// ── Dış Kurum / Resmî Hazırlık Sağlayıcı Adaptör Arayüzleri (Faz 0 Karar #4) ──
// Not: Resmî kurumlara gerçek bağlantı yapılmaz; erişim/doküman geldiğinde yalnız yapılandırma eklenir.

export type TourismProviderMode = "export-prep" | "external-configured"

export interface TourismComplianceExportResult {
  providerMode: TourismProviderMode
  format: "CSV" | "XLSX" | "XML" | "JSON"
  recordCount: number
  generatedAt: string
  warnings: string[]
}

export interface IKabisProvider {
  readonly adapterId: string
  readonly displayName: string
  readonly mode: TourismProviderMode
  prepareNotificationBatch(records: Array<Record<string, unknown>>): Promise<TourismComplianceExportResult>
}

export interface IKbsProvider {
  readonly adapterId: string
  readonly displayName: string
  readonly mode: TourismProviderMode
  readonly jurisdiction: "EGM" | "JANDARMA"
  prepareGuestBatch(records: Array<Record<string, unknown>>): Promise<TourismComplianceExportResult>
}

export interface IHgsProvider {
  readonly adapterId: string
  readonly displayName: string
  readonly mode: TourismProviderMode
  parseImportedPassages(rows: Array<Record<string, unknown>>): Promise<{
    acceptedCount: number
    rejectedCount: number
    processedAt: string
  }>
}

export interface ITrafficPenaltyProvider {
  readonly adapterId: string
  readonly displayName: string
  readonly mode: TourismProviderMode
  parseImportedPenalties(rows: Array<Record<string, unknown>>): Promise<{
    acceptedCount: number
    rejectedCount: number
    processedAt: string
  }>
}
