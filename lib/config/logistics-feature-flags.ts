/**
 * Lojistik ve Depo Yönetimi — 5 Modül Özellik Bayrakları (Feature Flags)
 *
 * Kurallar:
 * - Gerçek müşteri kurulumlarında TÜM Lojistik modülleri varsayılan olarak KAPALI (false) başlar.
 * - Canlı Demo ortamında (isDemoEnvironment() === true) bayraklar otomatik AÇIK (true) çözülür.
 * - Müşteri ekranlarında "Özellik bayrağı kapalı / pasif" gibi teknik metin ASLA gösterilmez;
 *   kapalı modüller ve altlarındaki boş menü kategorileri hiç render edilmez.
 */

import type {
  LogisticsFeatureFlagKey,
  LogisticsFeatureFlagsConfig,
  LogisticsFeatureFlagsMap,
  LogisticsModuleCatalogEntry,
} from "../logistics/types"
import { isDemoEnvironment } from "./production-feature-flags"

export type {
  LogisticsFeatureFlagKey,
  LogisticsFeatureFlagsConfig,
  LogisticsFeatureFlagsMap,
  LogisticsModuleCatalogEntry,
}

export const LOGISTICS_FEATURE_FLAG_KEYS: readonly LogisticsFeatureFlagKey[] = [
  "lojistik_wms",
  "lojistik_sevkiyat_rota",
  "lojistik_tedarikci",
  "lojistik_filo",
  "lojistik_iade",
] as const

export const DEFAULT_LOGISTICS_FEATURE_FLAGS: LogisticsFeatureFlagsMap = {
  lojistik_wms: false,
  lojistik_sevkiyat_rota: false,
  lojistik_tedarikci: false,
  lojistik_filo: false,
  lojistik_iade: false,
}

export const LOGISTICS_MODULES_CATALOG: readonly LogisticsModuleCatalogEntry[] = [
  {
    key: "lojistik_wms",
    order: 1,
    title: "1. Gelişmiş Depo & WMS",
    shortTitle: "Depo & WMS",
    description:
      "Raf hiyerarşisi, soğuk zincir ısı takibi, yerleştirme/toplama kuralları, cross-docking, konsolidasyon ve el terminali derinleştirmesi",
    resourceKey: "lojistik_wms",
    primaryHref: "/dashboard/wms",
    existingScreensExpanded: [
      "/dashboard/wms",
      "/dashboard/wms/mobil",
      "/dashboard/stok",
    ],
    category: "stok",
  },
  {
    key: "lojistik_sevkiyat_rota",
    order: 2,
    title: "2. Sevkiyat & Rota Planlama",
    shortTitle: "Sevkiyat & Rota",
    description:
      "Sevkiyat dalgası, konsolide araç yükleme, durak optimizasyonu, e-İrsaliye ve sürücü teslimat kanıtı (e-POD)",
    resourceKey: "lojistik_sevkiyat_rota",
    primaryHref: "/dashboard/sevkiyat",
    existingScreensExpanded: [
      "/dashboard/cargo",
      "/dashboard/omnichannel",
      "/dashboard/orders",
    ],
    category: "lojistik_filo",
  },
  {
    key: "lojistik_tedarikci",
    order: 3,
    title: "3. Tedarikçi & RFQ Portalı",
    shortTitle: "Tedarikçi & RFQ",
    description:
      "Çoklu tedarikçi teklif karşılaştırma (RFQ), ASN ön ihbar, OTIF/PPM performans karnesi ve kısıtlı tedarikçi portalı",
    resourceKey: "lojistik_tedarikci",
    primaryHref: "/dashboard/satinalma",
    existingScreensExpanded: ["/dashboard/satinalma"],
    category: "stok",
  },
  {
    key: "lojistik_filo",
    order: 4,
    title: "4. Araç & Sürücü Yönetimi",
    shortTitle: "Filo & Sürücü",
    description:
      "Araç kartları, soğutuculu kasa kapasitesi, sürücü belge/ehliyet/SRC ve yakıt/bakım/sigorta/muayene takibi",
    resourceKey: "lojistik_filo",
    primaryHref: "/dashboard/filo",
    existingScreensExpanded: ["/dashboard/cargo"],
    category: "lojistik_filo",
  },
  {
    key: "lojistik_iade",
    order: 5,
    title: "5. İade & Ters Lojistik (RMA)",
    shortTitle: "İade (RMA)",
    description:
      "İade sebep analizi, karantina/restock/imha kararları, E-Ticaret RMA webhook, tedarikçi rücu ve kargo tazmin takibi",
    resourceKey: "lojistik_iade",
    primaryHref: "/dashboard/omnichannel",
    existingScreensExpanded: ["/dashboard/omnichannel"],
    category: "lojistik_filo",
  },
] as const

const ENV_KEY_MAP: Record<
  LogisticsFeatureFlagKey,
  { server: string; publicKey: string }
> = {
  lojistik_wms: {
    server: "FEATURE_LOJISTIK_WMS",
    publicKey: "NEXT_PUBLIC_FEATURE_LOJISTIK_WMS",
  },
  lojistik_sevkiyat_rota: {
    server: "FEATURE_LOJISTIK_SEVKIYAT_ROTA",
    publicKey: "NEXT_PUBLIC_FEATURE_LOJISTIK_SEVKIYAT_ROTA",
  },
  lojistik_tedarikci: {
    server: "FEATURE_LOJISTIK_TEDARIKCI",
    publicKey: "NEXT_PUBLIC_FEATURE_LOJISTIK_TEDARIKCI",
  },
  lojistik_filo: {
    server: "FEATURE_LOJISTIK_FILO",
    publicKey: "NEXT_PUBLIC_FEATURE_LOJISTIK_FILO",
  },
  lojistik_iade: {
    server: "FEATURE_LOJISTIK_IADE",
    publicKey: "NEXT_PUBLIC_FEATURE_LOJISTIK_IADE",
  },
}

function parseEnvBoolean(value: string | undefined): boolean | undefined {
  if (!value) return undefined
  const normalized = value.trim().toLowerCase()
  if (normalized === "true" || normalized === "1" || normalized === "yes" || normalized === "on") {
    return true
  }
  if (normalized === "false" || normalized === "0" || normalized === "no" || normalized === "off") {
    return false
  }
  return undefined
}

function readEnvFlagOverride(
  flag: LogisticsFeatureFlagKey,
  demoModeOverride?: boolean
): boolean | undefined {
  if (typeof process === "undefined" || !process.env) return undefined
  const { server, publicKey } = ENV_KEY_MAP[flag]
  const direct = parseEnvBoolean(process.env[server] ?? process.env[publicKey])
  if (direct !== undefined) return direct

  const globalAll = parseEnvBoolean(
    process.env.FEATURE_LOJISTIK_ALL ?? process.env.NEXT_PUBLIC_FEATURE_LOJISTIK_ALL
  )
  if (globalAll !== undefined) return globalAll

  const demoActive =
    typeof demoModeOverride === "boolean" ? demoModeOverride : isDemoEnvironment()
  if (demoActive) {
    return true
  }

  return undefined
}

/**
 * 5 Lojistik özellik bayrağını çözümler.
 * Öncelik Sırası:
 * 1. Varsayılan: false (KAPALI — gerçek kurulum güvenliği)
 * 2. Genel sistem yapılandırması (config[key] veya config.modules[key])
 * 3. Firma / Şube bazlı geçersiz kılma (config.branchOverrides[branchId][key])
 * 4. Ortam değişkeni (FEATURE_LOJISTIK_*) / Demo ortamı (isDemoEnvironment() === true)
 */
export function resolveLogisticsFeatureFlags(
  config?: Partial<LogisticsFeatureFlagsConfig> | null,
  branchOrCompanyId?: string | null,
  demoModeOverride?: boolean
): LogisticsFeatureFlagsMap {
  const resolved: LogisticsFeatureFlagsMap = { ...DEFAULT_LOGISTICS_FEATURE_FLAGS }

  for (const key of LOGISTICS_FEATURE_FLAG_KEYS) {
    if (config && typeof config[key] === "boolean") {
      resolved[key] = config[key] as boolean
    } else if (config?.modules && typeof config.modules[key] === "boolean") {
      resolved[key] = config.modules[key] as boolean
    }

    if (
      branchOrCompanyId &&
      config?.branchOverrides?.[branchOrCompanyId] &&
      typeof config.branchOverrides[branchOrCompanyId][key] === "boolean"
    ) {
      resolved[key] = config.branchOverrides[branchOrCompanyId][key] as boolean
    }

    const envVal = readEnvFlagOverride(key, demoModeOverride)
    if (envVal !== undefined) {
      resolved[key] = envVal
    }
  }

  return resolved
}

export function isLogisticsFeatureEnabled(
  flag: LogisticsFeatureFlagKey,
  config?: Partial<LogisticsFeatureFlagsConfig> | null,
  branchOrCompanyId?: string | null,
  demoModeOverride?: boolean
): boolean {
  return resolveLogisticsFeatureFlags(config, branchOrCompanyId, demoModeOverride)[flag]
}

export function isAnyLogisticsFeatureEnabled(
  config?: Partial<LogisticsFeatureFlagsConfig> | null,
  branchOrCompanyId?: string | null,
  demoModeOverride?: boolean
): boolean {
  const flags = resolveLogisticsFeatureFlags(config, branchOrCompanyId, demoModeOverride)
  return LOGISTICS_FEATURE_FLAG_KEYS.some((key) => flags[key])
}

/**
 * Kenar çubuğundaki "Lojistik & Filo" kategorisinin hangi rotaları göstereceğini belirler.
 * Yalnızca ilgili bayrağı açık VE rotası uygulama içinde fiilen oluşturulmuş sayfalar listelenir;
 * böylece henüz fazı gelmemiş (404 / yarım) ekran linki kullanıcıya asla görünmez.
 */
export const IMPLEMENTED_LOGISTICS_FLEET_HREFS: readonly string[] = [
  // Faz 4: "/dashboard/filo" eklenecek
  // Faz 5: "/dashboard/sevkiyat", "/dashboard/sevkiyat/surucu" eklenecek
  // Faz 6: "/dashboard/tedarikci-portali" (veya satinalma sekmesi) eklenecek
] as const

export function isLogisticsFleetMenuVisible(
  config?: Partial<LogisticsFeatureFlagsConfig> | null,
  branchOrCompanyId?: string | null,
  implementedHrefs: readonly string[] = IMPLEMENTED_LOGISTICS_FLEET_HREFS,
  demoModeOverride?: boolean
): boolean {
  const flags = resolveLogisticsFeatureFlags(config, branchOrCompanyId, demoModeOverride)
  return LOGISTICS_MODULES_CATALOG.some(
    (mod) =>
      mod.category === "lojistik_filo" &&
      flags[mod.key] &&
      implementedHrefs.includes(mod.primaryHref)
  )
}
