/**
 * Turizm, Araç Kiralama, Konaklama ve B2B Partner Ağı — 4 Bağımsız Modül Özellik Bayrakları
 *
 * Kurallar:
 * - Gerçek müşteri kurulumlarında TÜM bayraklar varsayılan olarak KAPALI (false) başlar.
 * - Canlı Demo ortamında (isDemoEnvironment() === true) bayraklar otomatik AÇIK (true) çözülür.
 * - Her modül tam bağımsızdır; biri kapatıldığında diğer turizm, lojistik ve üretim modülleri etkilenmez.
 * - Müşteri ekranlarında "Özellik bayrağı kapalı / pasif" veya "yakında" gibi teknik metinler ASLA gösterilmez;
 *   kapalı veya henüz ekranı oluşturulmamış modüller menüde hiç render edilmez.
 */

import type {
  TourismFeatureFlagKey,
  TourismFeatureFlagsConfig,
  TourismFeatureFlagsMap,
  TourismModuleCatalogEntry,
  TourismSectorPacketDefinition,
  TourismSectorPacketKey,
} from "../tourism/types"
import { isDemoEnvironment } from "./production-feature-flags"

export type {
  TourismFeatureFlagKey,
  TourismFeatureFlagsConfig,
  TourismFeatureFlagsMap,
  TourismModuleCatalogEntry,
  TourismSectorPacketDefinition,
  TourismSectorPacketKey,
}

export const TOURISM_FEATURE_FLAG_KEYS: readonly TourismFeatureFlagKey[] = [
  "turizm_rentacar",
  "turizm_otel",
  "turizm_tur",
  "turizm_b2b",
] as const

export const DEFAULT_TOURISM_FEATURE_FLAGS: TourismFeatureFlagsMap = {
  turizm_rentacar: false,
  turizm_otel: false,
  turizm_tur: false,
  turizm_b2b: false,
}

export const TOURISM_MODULES_CATALOG: readonly TourismModuleCatalogEntry[] = [
  {
    key: "turizm_rentacar",
    order: 1,
    title: "Araç Kiralama (Rent-a-Car)",
    shortTitle: "Araç Kiralama",
    menuCategoryId: "turizm-rentacar",
    menuCategoryTitle: "Araç Kiralama",
    description:
      "Araç sınıfı, müsaitlik takvimi, rezervasyon, kiralama sözleşmesi, teslim/iade formu, depozito, ceza/HGS eşleştirme ve KABİS hazırlığı",
    resourceKey: "turizm_rentacar",
    primaryHref: "/dashboard/arac-kiralama",
    sortOrder: 401,
  },
  {
    key: "turizm_otel",
    order: 2,
    title: "Otel Yönetimi (Mini PMS)",
    shortTitle: "Otel Yönetimi",
    menuCategoryId: "turizm-otel",
    menuCategoryTitle: "Otel Yönetimi",
    description:
      "Oda envanteri, kat planı, rezervasyon, check-in/out, KBS hazırlığı, housekeeping, oda hesabı (folio), acenta kontenjanı ve doluluk raporları",
    resourceKey: "turizm_otel",
    primaryHref: "/dashboard/otel",
    sortOrder: 402,
  },
  {
    key: "turizm_tur",
    order: 3,
    title: "Tur Operatörlüğü",
    shortTitle: "Tur Operatörlüğü",
    menuCategoryId: "turizm-tur",
    menuCategoryTitle: "Tur Operatörlüğü",
    description:
      "Günübirlik ve konaklamalı tur takvimi, koltuk planı, yolcu manifestosu, biniş noktaları, rehber/şoför/araç çakışma kontrolü ve kâr analizi",
    resourceKey: "turizm_tur",
    primaryHref: "/dashboard/tur",
    sortOrder: 403,
  },
  {
    key: "turizm_b2b",
    order: 4,
    title: "B2B Partner Ağı",
    shortTitle: "Partner Ağı",
    menuCategoryId: "turizm-b2b",
    menuCategoryTitle: "Partner Ağı",
    description:
      "Partner firmalar, karşılıklı onay, ortak kaynak havuzu, white-label rezervasyon, çakışma kilidi, komisyon hakediş ve cari mutabakat",
    resourceKey: "turizm_b2b",
    primaryHref: "/dashboard/partner-agi",
    sortOrder: 404,
  },
] as const

export const TOURISM_SECTOR_PACKETS: readonly TourismSectorPacketDefinition[] = [
  {
    key: "RENTACAR_ONLY",
    title: "Araç Kiralama Paketi",
    description: "Yalnızca Rent-a-Car ve ortak filo altyapısını etkinleştirir.",
    flags: {
      turizm_rentacar: true,
      turizm_otel: false,
      turizm_tur: false,
      turizm_b2b: false,
    },
  },
  {
    key: "HOTEL_ONLY",
    title: "Otel Mini PMS Paketi",
    description: "Yalnızca otel ön büro, kat hizmetleri, folio ve KBS hazırlığını etkinleştirir.",
    flags: {
      turizm_rentacar: false,
      turizm_otel: true,
      turizm_tur: false,
      turizm_b2b: false,
    },
  },
  {
    key: "TOUR_OPERATOR_ONLY",
    title: "Tur Operatörlüğü Paketi",
    description: "Yalnızca tur takvimi, koltuk planı, manifesto ve rehber operasyonunu etkinleştirir.",
    flags: {
      turizm_rentacar: false,
      turizm_otel: false,
      turizm_tur: true,
      turizm_b2b: false,
    },
  },
  {
    key: "HOTEL_AND_TOUR",
    title: "Otel + Tur Paketi",
    description: "Konaklamalı turlar ve otel ön büro operasyonunu birlikte etkinleştirir.",
    flags: {
      turizm_rentacar: false,
      turizm_otel: true,
      turizm_tur: true,
      turizm_b2b: false,
    },
  },
  {
    key: "FULL_TOURISM_ECOSYSTEM",
    title: "Tam Turizm & Partner Ekosistemi",
    description: "Araç Kiralama, Otel Yönetimi, Tur Operatörlüğü ve B2B Partner Ağı modüllerinin tamamını etkinleştirir.",
    flags: {
      turizm_rentacar: true,
      turizm_otel: true,
      turizm_tur: true,
      turizm_b2b: true,
    },
  },
] as const

const ENV_KEY_MAP: Record<
  TourismFeatureFlagKey,
  { server: string; publicKey: string }
> = {
  turizm_rentacar: {
    server: "FEATURE_TURIZM_RENTACAR",
    publicKey: "NEXT_PUBLIC_FEATURE_TURIZM_RENTACAR",
  },
  turizm_otel: {
    server: "FEATURE_TURIZM_OTEL",
    publicKey: "NEXT_PUBLIC_FEATURE_TURIZM_OTEL",
  },
  turizm_tur: {
    server: "FEATURE_TURIZM_TUR",
    publicKey: "NEXT_PUBLIC_FEATURE_TURIZM_TUR",
  },
  turizm_b2b: {
    server: "FEATURE_TURIZM_B2B",
    publicKey: "NEXT_PUBLIC_FEATURE_TURIZM_B2B",
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
  flag: TourismFeatureFlagKey,
  demoModeOverride?: boolean
): boolean | undefined {
  if (typeof process === "undefined" || !process.env) return undefined
  const { server, publicKey } = ENV_KEY_MAP[flag]
  const direct = parseEnvBoolean(process.env[server] ?? process.env[publicKey])
  if (direct !== undefined) return direct

  const globalAll = parseEnvBoolean(
    process.env.FEATURE_TURIZM_ALL ?? process.env.NEXT_PUBLIC_FEATURE_TURIZM_ALL
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
 * 4 bağımsız turizm özellik bayrağını çözümler.
 * Öncelik Sırası (Lojistik kalıbıyla birebir):
 * 1. Varsayılan: false (KAPALI — gerçek müşteri kurulumu güvenliği)
 * 2. Sistem yapılandırması (config[key] veya config.modules[key])
 * 3. Şube / Firma bazlı geçersiz kılma (config.branchOverrides[branchId][key])
 * 4. Ortam değişkeni (FEATURE_TURIZM_*) / Toplu ENV (FEATURE_TURIZM_ALL) / Demo ortamı (isDemoEnvironment() === true)
 */
export function resolveTourismFeatureFlags(
  config?: Partial<TourismFeatureFlagsConfig> | null,
  branchOrCompanyId?: string | null,
  demoModeOverride?: boolean
): TourismFeatureFlagsMap {
  const resolved: TourismFeatureFlagsMap = { ...DEFAULT_TOURISM_FEATURE_FLAGS }

  for (const key of TOURISM_FEATURE_FLAG_KEYS) {
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

export function isTourismFeatureEnabled(
  flag: TourismFeatureFlagKey,
  config?: Partial<TourismFeatureFlagsConfig> | null,
  branchOrCompanyId?: string | null,
  demoModeOverride?: boolean
): boolean {
  return resolveTourismFeatureFlags(config, branchOrCompanyId, demoModeOverride)[flag]
}

export function isAnyTourismFeatureEnabled(
  config?: Partial<TourismFeatureFlagsConfig> | null,
  branchOrCompanyId?: string | null,
  demoModeOverride?: boolean
): boolean {
  const flags = resolveTourismFeatureFlags(config, branchOrCompanyId, demoModeOverride)
  return TOURISM_FEATURE_FLAG_KEYS.some((key) => flags[key])
}

/**
 * Kenar çubuğunda gösterilecek tamamlanmış turizm rotalarının beyaz listesi.
 * Faz 1'de henüz modül sayfaları eklenmediği için boştur; böylece 404/yarım ekran linki
 * kullanıcıya asla görünmez. Sonraki fazlarda ilgili ekran tamamlandıkça rotası buraya eklenir.
 */
export const IMPLEMENTED_TOURISM_HREFS: readonly string[] = [
  "/dashboard/arac-kiralama",
  "/dashboard/otel",
  "/dashboard/tur",
] as const

export function isTourismModuleMenuVisible(
  flag: TourismFeatureFlagKey,
  config?: Partial<TourismFeatureFlagsConfig> | null,
  branchOrCompanyId?: string | null,
  implementedHrefs: readonly string[] = IMPLEMENTED_TOURISM_HREFS,
  demoModeOverride?: boolean
): boolean {
  const mod = TOURISM_MODULES_CATALOG.find((m) => m.key === flag)
  if (!mod) return false
  if (!implementedHrefs.includes(mod.primaryHref)) return false
  return isTourismFeatureEnabled(flag, config, branchOrCompanyId, demoModeOverride)
}

export function getVisibleTourismMenuModules(
  config?: Partial<TourismFeatureFlagsConfig> | null,
  branchOrCompanyId?: string | null,
  implementedHrefs: readonly string[] = IMPLEMENTED_TOURISM_HREFS,
  demoModeOverride?: boolean
): TourismModuleCatalogEntry[] {
  const flags = resolveTourismFeatureFlags(config, branchOrCompanyId, demoModeOverride)
  return TOURISM_MODULES_CATALOG.filter(
    (mod) => flags[mod.key] && implementedHrefs.includes(mod.primaryHref)
  )
}
