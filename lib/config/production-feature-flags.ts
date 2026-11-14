/**
 * Sunum ERP — Üretim Modülleri Özellik Bayrağı (Feature Flag) ve Modül Kataloğu
 *
 * KURAL: Tüm bayraklar varsayılan olarak KAPALI (false) durumdadır.
 * Firma/şube bazında (system_config.json -> featureFlags.branchOverrides) veya
 * ortam bazında (FEATURE_URETIM_* / NEXT_PUBLIC_FEATURE_URETIM_* env değişkenleri)
 * ya da genel sistem ayarlarından (system_config.json -> featureFlags) açılabilir.
 */

export const PRODUCTION_FEATURE_FLAG_KEYS = [
  "uretim_bom_rota",
  "uretim_mrp_mps",
  "uretim_is_emri",
  "uretim_kapasite",
  "uretim_kalite",
  "uretim_bakim",
] as const

export type ProductionFeatureFlagKey = (typeof PRODUCTION_FEATURE_FLAG_KEYS)[number]

export type ProductionFeatureFlagsMap = Record<ProductionFeatureFlagKey, boolean>

export interface ProductionFeatureFlagsConfig extends ProductionFeatureFlagsMap {
  /**
   * Firma veya şube bazında (branchId veya company vergi no / kod) bayrak geçersiz kılmaları.
   */
  branchOverrides?: Record<string, Partial<ProductionFeatureFlagsMap>>
}

export const DEFAULT_PRODUCTION_FEATURE_FLAGS: ProductionFeatureFlagsMap = {
  uretim_bom_rota: false,
  uretim_mrp_mps: false,
  uretim_is_emri: false,
  uretim_kapasite: false,
  uretim_kalite: false,
  uretim_bakim: false,
}

export interface ProductionModuleCatalogEntry {
  key: ProductionFeatureFlagKey
  slug: string
  href: string
  label: string
  menuLabel: string
  description: string
  auditResource: string
  sortOrder: number
}

export const PRODUCTION_MODULES_CATALOG: readonly ProductionModuleCatalogEntry[] = [
  {
    key: "uretim_bom_rota",
    slug: "bom-rota",
    href: "/dashboard/uretim/bom-rota",
    label: "Üretim: Ürün Ağacı (BOM) & Rotalar",
    menuLabel: "1. Ürün Ağacı (BOM) & Rotalar",
    description:
      "Çok seviyeli ürün reçeteleri (BOM), versiyonlama, iş merkezleri ve operasyon rotaları yönetimi.",
    auditResource: "URETIM_BOM_ROTA",
    sortOrder: 30,
  },
  {
    key: "uretim_mrp_mps",
    slug: "mrp-mps",
    href: "/dashboard/uretim/mrp-mps",
    label: "Üretim: MRP & Ana Üretim Planlama",
    menuLabel: "2. MRP & Ana Üretim Planlama",
    description:
      "Ana üretim planı (MPS), malzeme ihtiyaç patlatımı (MRP) ve otomatik satınalma/üretim önerileri.",
    auditResource: "URETIM_MRP_MPS",
    sortOrder: 31,
  },
  {
    key: "uretim_is_emri",
    slug: "is-emirleri",
    href: "/dashboard/uretim/is-emirleri",
    label: "Üretim: İş Emirleri & Atölye İcra",
    menuLabel: "3. Üretim Emirleri & Atölye",
    description:
      "Üretim emri yaşam döngüsü, hammadde rezervasyonu, sarfiyat (backflush) ve mamul stok girişi.",
    auditResource: "URETIM_IS_EMRI",
    sortOrder: 32,
  },
  {
    key: "uretim_kapasite",
    slug: "kapasite",
    href: "/dashboard/uretim/kapasite",
    label: "Üretim: İş Merkezleri & Kapasite",
    menuLabel: "4. İş Merkezleri & Kapasite",
    description:
      "İstasyon ve vardiya kapasite yük analizi, darboğaz tespiti ve sonlu kapasite çizelgeleme.",
    auditResource: "URETIM_KAPASITE",
    sortOrder: 33,
  },
  {
    key: "uretim_kalite",
    slug: "kalite",
    href: "/dashboard/uretim/kalite",
    label: "Üretim: Kalite Kontrol & Fire",
    menuLabel: "5. Kalite Kontrol & Fire",
    description:
      "Girdi, süreç içi ve son kalite kontrol muayeneleri, kabul/red/rework ve fire/hurda analizi.",
    auditResource: "URETIM_KALITE",
    sortOrder: 34,
  },
  {
    key: "uretim_bakim",
    slug: "bakim",
    href: "/dashboard/uretim/bakim",
    label: "Üretim: Ekipman & Bakım Yönetimi",
    menuLabel: "6. Ekipman & Bakım Yönetimi",
    description:
      "Tezgah ve atölye ekipmanları için periyodik/önleyici bakım planları, arıza ve duruş takibi.",
    auditResource: "URETIM_BAKIM",
    sortOrder: 35,
  },
] as const

const ENV_KEY_MAP: Record<ProductionFeatureFlagKey, { server: string; publicKey: string }> = {
  uretim_bom_rota: {
    server: "FEATURE_URETIM_BOM_ROTA",
    publicKey: "NEXT_PUBLIC_FEATURE_URETIM_BOM_ROTA",
  },
  uretim_mrp_mps: {
    server: "FEATURE_URETIM_MRP_MPS",
    publicKey: "NEXT_PUBLIC_FEATURE_URETIM_MRP_MPS",
  },
  uretim_is_emri: {
    server: "FEATURE_URETIM_IS_EMRI",
    publicKey: "NEXT_PUBLIC_FEATURE_URETIM_IS_EMRI",
  },
  uretim_kapasite: {
    server: "FEATURE_URETIM_KAPASITE",
    publicKey: "NEXT_PUBLIC_FEATURE_URETIM_KAPASITE",
  },
  uretim_kalite: {
    server: "FEATURE_URETIM_KALITE",
    publicKey: "NEXT_PUBLIC_FEATURE_URETIM_KALITE",
  },
  uretim_bakim: {
    server: "FEATURE_URETIM_BAKIM",
    publicKey: "NEXT_PUBLIC_FEATURE_URETIM_BAKIM",
  },
}

function parseEnvBoolean(raw: string | undefined): boolean | undefined {
  if (raw === undefined || raw === "") return undefined
  const normalized = raw.trim().toLowerCase()
  if (normalized === "true" || normalized === "1" || normalized === "on") return true
  if (normalized === "false" || normalized === "0" || normalized === "off") return false
  return undefined
}

export function isDemoEnvironment(): boolean {
  if (typeof process === "undefined" || !process.env) return true
  const disableDemo = process.env.DISABLE_DEMO_MODE
  const envDemo = process.env.ENABLE_DEMO_MODE
  const publicEnvDemo = process.env.NEXT_PUBLIC_ENABLE_DEMO_MODE
  const publicUseMock = process.env.NEXT_PUBLIC_USE_MOCK_DATA

  if (disableDemo === "true" || envDemo === "false" || publicEnvDemo === "false" || publicUseMock === "false") {
    return false
  }
  return true
}

function readEnvFlagOverride(flag: ProductionFeatureFlagKey): boolean | undefined {
  if (typeof process === "undefined" || !process.env) return undefined
  const { server, publicKey } = ENV_KEY_MAP[flag]
  const direct = parseEnvBoolean(process.env[server] ?? process.env[publicKey])
  if (direct !== undefined) return direct

  const globalAll = parseEnvBoolean(
    process.env.FEATURE_URETIM_ALL ?? process.env.NEXT_PUBLIC_FEATURE_URETIM_ALL
  )
  if (globalAll !== undefined) return globalAll

  // Canlı Demo / Public Showcase ortamında tüm modüller varsayılan olarak açık gelir
  if (isDemoEnvironment()) {
    return true
  }

  return undefined
}

/**
 * Verilen sistem yapılandırması ve opsiyonel firma/şube kimliği (branchId) için
 * 6 üretim özellik bayrağının etkin durumunu çözümler.
 *
 * Öncelik Sırası:
 * 1. Ortam değişkeni (FEATURE_URETIM_* / NEXT_PUBLIC_FEATURE_URETIM_*)
 * 2. Firma/Şube bazlı geçersiz kılma (config.branchOverrides[branchOrCompanyId][flag])
 * 3. Genel sistem yapılandırması (config[flag])
 * 4. Varsayılan: false (KAPALI)
 */
export function resolveProductionFeatureFlags(
  config?: Partial<ProductionFeatureFlagsConfig> | null,
  branchOrCompanyId?: string | null
): ProductionFeatureFlagsMap {
  const resolved: ProductionFeatureFlagsMap = { ...DEFAULT_PRODUCTION_FEATURE_FLAGS }

  for (const key of PRODUCTION_FEATURE_FLAG_KEYS) {
    // 1. Genel config değeri
    if (config && typeof config[key] === "boolean") {
      resolved[key] = config[key] as boolean
    }

    // 2. Firma / Şube bazlı override
    if (
      branchOrCompanyId &&
      config?.branchOverrides &&
      config.branchOverrides[branchOrCompanyId] &&
      typeof config.branchOverrides[branchOrCompanyId][key] === "boolean"
    ) {
      resolved[key] = config.branchOverrides[branchOrCompanyId][key] as boolean
    }

    // 3. Ortam (Environment) değişkeni override
    const envVal = readEnvFlagOverride(key)
    if (envVal !== undefined) {
      resolved[key] = envVal
    }
  }

  return resolved
}

/**
 * Tek bir üretim özellik bayrağının açık olup olmadığını kontrol eder.
 */
export function isProductionFeatureEnabled(
  flag: ProductionFeatureFlagKey,
  config?: Partial<ProductionFeatureFlagsConfig> | null,
  branchOrCompanyId?: string | null
): boolean {
  const flags = resolveProductionFeatureFlags(config, branchOrCompanyId)
  return Boolean(flags[flag])
}

/**
 * Üretim bayraklarından EN AZ BİRİNİN açık olup olmadığını döner.
 * Sol menüdeki "Üretim" ana kategorisinin görünürlüğünü kontrol etmek için kullanılır.
 */
export function isAnyProductionFeatureEnabled(
  config?: Partial<ProductionFeatureFlagsConfig> | null,
  branchOrCompanyId?: string | null
): boolean {
  const flags = resolveProductionFeatureFlags(config, branchOrCompanyId)
  return PRODUCTION_FEATURE_FLAG_KEYS.some((key) => flags[key] === true)
}

/**
 * URL slug değerine (örn. "bom-rota") karşılık gelen üretim modülü tanımını bulur.
 */
export function getProductionModuleBySlug(
  slug: string
): ProductionModuleCatalogEntry | undefined {
  return PRODUCTION_MODULES_CATALOG.find((m) => m.slug === slug || m.key === slug)
}
