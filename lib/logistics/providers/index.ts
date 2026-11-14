/**
 * Lojistik Sağlayıcı Adaptör Fabrikası
 *
 * Tüm dış entegrasyonlar tek noktadan yapılandırma ile seçilir:
 * - Demo / Varsayılan ortamda Demo-DB + Uygulama İçi Rota Çözücüsü (key-free) çalışır.
 * - Gerçek müşteri entegrasyonlarında SystemConfig / ENV değişikliği yeterlidir, kod değişmez.
 */

import { getSystemConfig } from "@/lib/system-config"
import type {
  ILogisticsEDocumentProvider,
  ILogisticsReturnWebhookProvider,
  ILogisticsRoutingProvider,
  ILogisticsStorageProvider,
  ILogisticsTelematicsProvider,
  LogisticsProviderBundleConfig,
  LogisticsProviderMode,
} from "../types"
import {
  DemoDbEDocumentProvider,
  GibIntegratorEDocumentProvider,
} from "./efatura-irsaliye"
import {
  DemoDbTelematicsProvider,
  ExternalTelematicsProvider,
} from "./telematics"
import {
  ExternalRoutingProvider,
  LocalKeyFreeRoutingProvider,
} from "./routing"
import {
  DemoDbReturnWebhookProvider,
  ExternalWebhookReturnProvider,
} from "./ecommerce-returns"
import {
  LocalStorageProofProvider,
  ObjectStorageProofProvider,
} from "./object-storage"

export interface LogisticsProviderBundle {
  config: LogisticsProviderBundleConfig
  eDocument: ILogisticsEDocumentProvider
  telematics: ILogisticsTelematicsProvider
  routing: ILogisticsRoutingProvider
  returnWebhook: ILogisticsReturnWebhookProvider
  storage: ILogisticsStorageProvider
}

function normalizeMode(
  val: string | undefined,
  fallback: LogisticsProviderMode
): LogisticsProviderMode {
  if (
    val === "demo-db" ||
    val === "external-rest" ||
    val === "webhook" ||
    val === "local-solver" ||
    val === "object-storage"
  ) {
    return val
  }
  return fallback
}

export function resolveLogisticsProviderConfig(
  overrides?: Partial<LogisticsProviderBundleConfig>
): LogisticsProviderBundleConfig {
  const sys = getSystemConfig()
  const ext = (sys as any).logisticsProviders as
    | Partial<LogisticsProviderBundleConfig>
    | undefined

  return {
    eDocumentMode: normalizeMode(
      overrides?.eDocumentMode ??
        process.env.LOJISTIK_EDOC_PROVIDER ??
        ext?.eDocumentMode,
      "demo-db"
    ),
    telematicsMode: normalizeMode(
      overrides?.telematicsMode ??
        process.env.LOJISTIK_TELEMATICS_PROVIDER ??
        ext?.telematicsMode,
      "demo-db"
    ),
    routingMode: normalizeMode(
      overrides?.routingMode ??
        process.env.LOJISTIK_ROUTING_PROVIDER ??
        ext?.routingMode,
      "local-solver"
    ),
    returnWebhookMode: normalizeMode(
      overrides?.returnWebhookMode ??
        process.env.LOJISTIK_RETURN_WEBHOOK_PROVIDER ??
        ext?.returnWebhookMode,
      "demo-db"
    ),
    storageMode: normalizeMode(
      overrides?.storageMode ??
        process.env.LOJISTIK_STORAGE_PROVIDER ??
        ext?.storageMode,
      "demo-db"
    ),
    eDocumentApiUrl:
      overrides?.eDocumentApiUrl ??
      process.env.LOJISTIK_EDOC_API_URL ??
      ext?.eDocumentApiUrl,
    telematicsApiUrl:
      overrides?.telematicsApiUrl ??
      process.env.LOJISTIK_TELEMATICS_API_URL ??
      ext?.telematicsApiUrl,
    routingApiUrl:
      overrides?.routingApiUrl ??
      process.env.LOJISTIK_ROUTING_API_URL ??
      ext?.routingApiUrl,
    returnWebhookUrl:
      overrides?.returnWebhookUrl ??
      process.env.LOJISTIK_RETURN_WEBHOOK_URL ??
      ext?.returnWebhookUrl,
    objectStorageBaseUrl:
      overrides?.objectStorageBaseUrl ??
      process.env.LOJISTIK_STORAGE_BASE_URL ??
      ext?.objectStorageBaseUrl,
  }
}

export function createLogisticsProviders(
  overrides?: Partial<LogisticsProviderBundleConfig>
): LogisticsProviderBundle {
  const config = resolveLogisticsProviderConfig(overrides)

  const eDocument: ILogisticsEDocumentProvider =
    config.eDocumentMode === "external-rest" && config.eDocumentApiUrl
      ? new GibIntegratorEDocumentProvider(config.eDocumentApiUrl)
      : new DemoDbEDocumentProvider()

  const telematics: ILogisticsTelematicsProvider =
    config.telematicsMode === "external-rest" && config.telematicsApiUrl
      ? new ExternalTelematicsProvider(config.telematicsApiUrl)
      : new DemoDbTelematicsProvider()

  const routing: ILogisticsRoutingProvider =
    config.routingMode === "external-rest" && config.routingApiUrl
      ? new ExternalRoutingProvider(config.routingApiUrl)
      : new LocalKeyFreeRoutingProvider()

  const returnWebhook: ILogisticsReturnWebhookProvider =
    config.returnWebhookMode === "webhook" && config.returnWebhookUrl
      ? new ExternalWebhookReturnProvider(config.returnWebhookUrl)
      : new DemoDbReturnWebhookProvider()

  const storage: ILogisticsStorageProvider =
    config.storageMode === "object-storage" && config.objectStorageBaseUrl
      ? new ObjectStorageProofProvider(config.objectStorageBaseUrl)
      : new LocalStorageProofProvider()

  return {
    config,
    eDocument,
    telematics,
    routing,
    returnWebhook,
    storage,
  }
}
