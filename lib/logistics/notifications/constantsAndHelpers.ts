/**
 * Lojistik & Operasyon Bildirim Kuralları — Sabitler ve Kullanıcı Tercih Yardımcıları
 * Client ve Server katmanları tarafından güvenle import edilebilir.
 */

import type { LogisticsFeatureFlagKey } from "@/lib/logistics/types"

export type LogisticsAlertRuleKey =
  | "DELAYED_SHIPMENT"
  | "CRITICAL_STOCK_SHORTAGE"
  | "OVERDUE_PURCHASE_ORDER"
  | "FLEET_DOC_MAINT_EXPIRING"
  | "RMA_DEADLINE_EXPIRING"
  | "ANOMALOUS_FUEL_CONSUMPTION"

export interface LogisticsAlertRuleDefinition {
  key: LogisticsAlertRuleKey
  title: string
  description: string
  moduleResource: string
  flagKey: LogisticsFeatureFlagKey
  link: string
  severity: "warning" | "error"
  defaultEnabled: boolean
}

export const LOGISTICS_ALERT_RULE_DEFINITIONS: LogisticsAlertRuleDefinition[] = [
  {
    key: "DELAYED_SHIPMENT",
    title: "Geciken Sevkiyat ve Durak ETA Aşımı",
    description:
      "Aktif sefer veya teslimat duraklarında planlanan varış/tamamlanma süresi aşıldığında uyarır.",
    moduleResource: "lojistik_sevkiyat_rota",
    flagKey: "lojistik_sevkiyat_rota",
    link: "/dashboard/sevkiyat",
    severity: "warning",
    defaultEnabled: true,
  },
  {
    key: "CRITICAL_STOCK_SHORTAGE",
    title: "Kritik Stok / Emniyet Stoku Altı",
    description:
      "Kullanılabilir toplam stok miktarı tanımlı minimum emniyet stok seviyesinin altına düşen ürünleri bildirir.",
    moduleResource: "lojistik_wms",
    flagKey: "lojistik_wms",
    link: "/dashboard/wms",
    severity: "error",
    defaultEnabled: true,
  },
  {
    key: "OVERDUE_PURCHASE_ORDER",
    title: "Gecikmiş Satınalma Siparişi (PO)",
    description:
      "Beklenen veya taahhüt edilen teslim tarihi geçmiş hâlen teslim alınmamış satınalma siparişlerini bildirir.",
    moduleResource: "lojistik_tedarikci",
    flagKey: "lojistik_tedarikci",
    link: "/dashboard/satinalma",
    severity: "warning",
    defaultEnabled: true,
  },
  {
    key: "FLEET_DOC_MAINT_EXPIRING",
    title: "Yaklaşan Araç / Sürücü Belgesi ve Periyodik Bakım",
    description:
      "Muayene, sigorta, SRC, psikoteknik belgeleri veya kilometre/takvim bazlı araç bakımları yaklaştığında uyarır.",
    moduleResource: "lojistik_filo",
    flagKey: "lojistik_filo",
    link: "/dashboard/filo",
    severity: "warning",
    defaultEnabled: true,
  },
  {
    key: "RMA_DEADLINE_EXPIRING",
    title: "SLA / İade Son Tarihi Yaklaşan RMA Talepleri",
    description:
      "İade penceresi bitmek üzere olan veya kalite kontrol incelemesi bekleyen açık RMA kayıtlarını bildirir.",
    moduleResource: "lojistik_iade",
    flagKey: "lojistik_iade",
    link: "/dashboard/iade",
    severity: "warning",
    defaultEnabled: true,
  },
  {
    key: "ANOMALOUS_FUEL_CONSUMPTION",
    title: "Anomalili Yakıt Tüketimi",
    description:
      "Araç bazlı normal tüketim sınırını aşan veya yakıt kartı/fatura uyumsuzluğu tespit edilen dolumları bildirir.",
    moduleResource: "lojistik_filo",
    flagKey: "lojistik_filo",
    link: "/dashboard/filo",
    severity: "error",
    defaultEnabled: true,
  },
]

export const ALL_LOGISTICS_ALERT_RULE_KEYS: LogisticsAlertRuleKey[] =
  LOGISTICS_ALERT_RULE_DEFINITIONS.map((d) => d.key)

export interface UserLogisticsNotificationPreferences {
  rules: Record<LogisticsAlertRuleKey, boolean>
  inAppEnabled: boolean
  emailDigestEnabled: boolean
  soundEnabled: boolean
  updatedAt?: string
}

export function createDefaultUserLogisticsNotificationPrefs(): UserLogisticsNotificationPreferences {
  return {
    rules: {
      DELAYED_SHIPMENT: true,
      CRITICAL_STOCK_SHORTAGE: true,
      OVERDUE_PURCHASE_ORDER: true,
      FLEET_DOC_MAINT_EXPIRING: true,
      RMA_DEADLINE_EXPIRING: true,
      ANOMALOUS_FUEL_CONSUMPTION: true,
    },
    inAppEnabled: true,
    emailDigestEnabled: false,
    soundEnabled: true,
  }
}

export const DEFAULT_LOGISTICS_USER_NOTIFICATION_PREFS: UserLogisticsNotificationPreferences =
  createDefaultUserLogisticsNotificationPrefs()

/**
 * Kullanıcının DB'deki `logisticsNotificationPrefsJson` alanını ayrıştırır.
 * Değer NULL veya boşsa güvenli varsayılan olarak 6/6 kuralın tamamı etkin döner.
 */
export function parseUserLogisticsNotificationPrefs(
  rawJson?: string | Record<string, unknown> | null
): UserLogisticsNotificationPreferences {
  const defaults = createDefaultUserLogisticsNotificationPrefs()
  if (!rawJson) return defaults

  let parsed: Record<string, unknown> | null = null
  if (typeof rawJson === "string") {
    try {
      const candidate = JSON.parse(rawJson)
      if (candidate && typeof candidate === "object" && !Array.isArray(candidate)) {
        parsed = candidate as Record<string, unknown>
      }
    } catch {
      return defaults
    }
  } else if (typeof rawJson === "object" && !Array.isArray(rawJson)) {
    parsed = rawJson
  }

  if (!parsed) return defaults

  const rawRules =
    parsed.rules && typeof parsed.rules === "object" && !Array.isArray(parsed.rules)
      ? (parsed.rules as Record<string, unknown>)
      : {}

  const rules: Record<LogisticsAlertRuleKey, boolean> = { ...defaults.rules }
  for (const key of ALL_LOGISTICS_ALERT_RULE_KEYS) {
    if (typeof rawRules[key] === "boolean") {
      rules[key] = rawRules[key] as boolean
    }
  }

  return {
    rules,
    inAppEnabled:
      typeof parsed.inAppEnabled === "boolean"
        ? parsed.inAppEnabled
        : defaults.inAppEnabled,
    emailDigestEnabled:
      typeof parsed.emailDigestEnabled === "boolean"
        ? parsed.emailDigestEnabled
        : defaults.emailDigestEnabled,
    soundEnabled:
      typeof parsed.soundEnabled === "boolean"
        ? parsed.soundEnabled
        : defaults.soundEnabled,
    updatedAt: typeof parsed.updatedAt === "string" ? parsed.updatedAt : undefined,
  }
}

export function mergeUserLogisticsNotificationPrefs(
  existingRaw: string | Record<string, unknown> | null | undefined,
  patch: {
    rules?: Partial<Record<LogisticsAlertRuleKey, boolean>>
    inAppEnabled?: boolean
    emailDigestEnabled?: boolean
    soundEnabled?: boolean
  }
): UserLogisticsNotificationPreferences {
  const current = parseUserLogisticsNotificationPrefs(existingRaw)
  const nextRules: Record<LogisticsAlertRuleKey, boolean> = { ...current.rules }

  if (patch.rules && typeof patch.rules === "object") {
    for (const key of ALL_LOGISTICS_ALERT_RULE_KEYS) {
      if (typeof patch.rules[key] === "boolean") {
        nextRules[key] = patch.rules[key] as boolean
      }
    }
  }

  return {
    rules: nextRules,
    inAppEnabled:
      typeof patch.inAppEnabled === "boolean"
        ? patch.inAppEnabled
        : current.inAppEnabled,
    emailDigestEnabled:
      typeof patch.emailDigestEnabled === "boolean"
        ? patch.emailDigestEnabled
        : current.emailDigestEnabled,
    soundEnabled:
      typeof patch.soundEnabled === "boolean"
        ? patch.soundEnabled
        : current.soundEnabled,
    updatedAt: new Date().toISOString(),
  }
}
