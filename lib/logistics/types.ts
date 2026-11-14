/**
 * Lojistik & Depo Yönetimi — Saf Paylaşılan Tip Tanımları
 *
 * KURALLAR:
 * - Bu dosya hem sunucu hem istemci ("use client") bileşenleri tarafından güvenle import edilebilir.
 * - fs, path, prisma/db veya audit modülleri ASLA import edilmez.
 */

export type LogisticsFeatureFlagKey =
  | "lojistik_wms"
  | "lojistik_sevkiyat_rota"
  | "lojistik_tedarikci"
  | "lojistik_filo"
  | "lojistik_iade"

export type LogisticsFeatureFlagsMap = Record<LogisticsFeatureFlagKey, boolean>

export interface LogisticsFeatureFlagsConfig
  extends Partial<LogisticsFeatureFlagsMap> {
  modules?: Partial<LogisticsFeatureFlagsMap>
  branchOverrides?: Record<string, Partial<LogisticsFeatureFlagsMap>>
  updatedAt?: string
  updatedBy?: string
}

export interface LogisticsModuleCatalogEntry {
  key: LogisticsFeatureFlagKey
  order: number
  title: string
  shortTitle: string
  description: string
  resourceKey: string
  primaryHref: string
  existingScreensExpanded: string[]
  category: "stok" | "lojistik_filo"
}

export type LogisticsPermissionAction =
  | "read"
  | "create"
  | "update"
  | "delete"
  | "approve"

export interface LogisticsScopeContext {
  userId: string
  username: string
  branchId?: string
  roleNames: string[]
  isSuperAdmin: boolean
  isPlatformDeveloper: boolean
  isSupplierScoped: boolean
  supplierId?: string | null
  supplierCode?: string | null
}

// ── Sağlayıcı Adaptör Mimarisi (Karar #5) ────────────────────────────────────

export type LogisticsProviderMode =
  | "demo-db"
  | "external-rest"
  | "webhook"
  | "local-solver"
  | "object-storage"

export interface EDokumanGonderimIstegi {
  documentType: "IRSALIYE" | "E_IRSALIYE" | "E_FATURA" | "E_ARSIV"
  relatedOrderNo?: string
  shipmentWaveNo?: string
  receiverTitle: string
  receiverVknTckn: string
  receiverTaxOffice?: string
  vehiclePlate?: string
  driverName?: string
  driverTckn?: string
  carrierName?: string
  lines: Array<{
    sku: string
    name: string
    quantity: number
    unit: string
    unitPrice?: number
    vatRate?: number
  }>
}

export interface EDokumanGonderimSonucu {
  success: boolean
  providerMode: LogisticsProviderMode
  providerName: string
  ettnUuid: string
  documentNo: string
  gibStatusCode: string
  gibStatusText: string
  dispatchTimestamp: string
}

export interface ILogisticsEDocumentProvider {
  readonly adapterId: string
  readonly displayName: string
  readonly mode: LogisticsProviderMode
  submitEDocument(req: EDokumanGonderimIstegi): Promise<EDokumanGonderimSonucu>
  queryEDocumentStatus(ettnUuid: string): Promise<{
    ettnUuid: string
    gibStatusCode: string
    gibStatusText: string
    checkedAt: string
  }>
  cancelEDocument(
    ettnUuid: string,
    reason: string
  ): Promise<{ success: boolean; cancelledAt: string; message: string }>
}

export interface TelematikKonumVerisi {
  vehicleId: string
  plate: string
  lat: number
  lng: number
  speedKmh: number
  headingDeg: number
  temperatureCelsius: number | null
  humidityPercent: number | null
  doorOpen: boolean
  engineRunning: boolean
  recordedAt: string
  status: "HAREKETTE" | "DURAKTA" | "BEKLEMEDE" | "UYARI"
}

export interface ILogisticsTelematicsProvider {
  readonly adapterId: string
  readonly displayName: string
  readonly mode: LogisticsProviderMode
  getVehicleTelemetry(vehicleId: string): Promise<TelematikKonumVerisi | null>
  listFleetTelemetry(branchId?: string): Promise<TelematikKonumVerisi[]>
  getColdChainAlerts(vehicleId?: string): Promise<
    Array<{
      vehicleId: string
      plate: string
      temperatureCelsius: number
      thresholdMaxCelsius: number
      severity: "WARNING" | "CRITICAL"
      detectedAt: string
    }>
  >
}

export interface GeoCoordinate {
  lat: number
  lng: number
  label?: string
}

export interface RouteStopInput {
  stopId: string
  label: string
  lat: number
  lng: number
  priority?: number
  demandKg?: number
  demandM3?: number
  serviceMinutes?: number
  timeWindowStart?: string
  timeWindowEnd?: string
}

export interface OptimizedRouteResult {
  providerMode: LogisticsProviderMode
  solverName: string
  origin: GeoCoordinate
  orderedStops: Array<
    RouteStopInput & {
      sequenceNo: number
      legDistanceKm: number
      cumulativeDistanceKm: number
      estimatedArrivalMinutes: number
    }
  >
  totalDistanceKm: number
  estimatedDurationMinutes: number
  polylinePoints: Array<[number, number]>
}

export interface ILogisticsRoutingProvider {
  readonly adapterId: string
  readonly displayName: string
  readonly mode: LogisticsProviderMode
  optimizeStops(
    origin: GeoCoordinate,
    stops: RouteStopInput[],
    options?: {
      avgSpeedKmh?: number
      returnToDepot?: boolean
    }
  ): Promise<OptimizedRouteResult>
}

export interface ReturnWebhookPayload {
  channelCode: "TRENDYOL" | "HEPSIBURADA" | "SHOPIFY" | "SUNUM-B2B" | string
  externalRmaRef: string
  orderNumber: string
  sku: string
  quantity: number
  reason: string
  customerName?: string
  requestedAt: string
}

export interface ILogisticsReturnWebhookProvider {
  readonly adapterId: string
  readonly displayName: string
  readonly mode: LogisticsProviderMode
  ingestReturnWebhook(payload: ReturnWebhookPayload): Promise<{
    accepted: boolean
    normalizedRmaNo: string
    channelCode: string
    receivedAt: string
  }>
  pushReturnStatus(
    rmaNumber: string,
    channelCode: string,
    status: string
  ): Promise<{ synced: boolean; syncedAt: string; note: string }>
}

export interface StoredProofObject {
  storageKey: string
  publicUrl: string
  mimeType: string
  sizeBytes: number
  checksumSha256: string
  storedAt: string
}

export interface ILogisticsStorageProvider {
  readonly adapterId: string
  readonly displayName: string
  readonly mode: LogisticsProviderMode
  saveProofArtifact(input: {
    fileName: string
    mimeType: string
    base64OrDataUrl: string
    category: "POD_PHOTO" | "POD_SIGNATURE" | "INSPECTION" | "EDOC_PDF" | "ASN_DOC"
    referenceId: string
  }): Promise<StoredProofObject>
  resolveArtifactUrl(storageKey: string): string
}

export interface LogisticsProviderBundleConfig {
  eDocumentMode: LogisticsProviderMode
  telematicsMode: LogisticsProviderMode
  routingMode: LogisticsProviderMode
  returnWebhookMode: LogisticsProviderMode
  storageMode: LogisticsProviderMode
  eDocumentApiUrl?: string
  telematicsApiUrl?: string
  routingApiUrl?: string
  returnWebhookUrl?: string
  objectStorageBaseUrl?: string
}

// ── Domain Durum & Seed Tipleri ──────────────────────────────────────────────

export type VehicleStatus =
  | "MUSAYIT"
  | "SEVK_HALINDE"
  | "BAKIMDA"
  | "PASIF"

export type ShipmentWaveStatus =
  | "PLANLANDI"
  | "YUKLENIYOR"
  | "YOLDA"
  | "TESLIMAT_SURUYOR"
  | "TAMAMLANDI"
  | "IPTAL"

export type ShipmentStopStatus =
  | "BEKLIYOR"
  | "YOLDA"
  | "VARIS"
  | "TESLIM_EDILDI"
  | "KISMI_TESLIM"
  | "TESLIM_EDILEMEDI"

export type PodCaptureMethod = "IMZA_CIZIM" | "FOTOGRAF" | "QR_KOD" | "PIN_ONAY"

export type RfqStatus =
  | "TASLAK"
  | "TEKLIFE_ACIK"
  | "DEGERLENDIRMEDE"
  | "SONUCLANDI"
  | "IPTAL"

export type AsnStatus =
  | "ON_IHBAR"
  | "YOLDA"
  | "KAPI_GIRIS"
  | "KABUL_TAMAM"
  | "IPTAL"

export interface LogisticsSeedStepResult {
  moduleKey: string
  inserted: Record<string, number>
  skippedExisting: number
  notes: string[]
}

export interface LogisticsSeedExecutionReport {
  success: boolean
  environment: "demo"
  backupId: string | null
  executedAt: string
  modulesExecuted: LogisticsSeedStepResult[]
  preExistingCounts: Record<string, number>
  postCounts: Record<string, number>
  preExistingIntegrityIntact: boolean
}
