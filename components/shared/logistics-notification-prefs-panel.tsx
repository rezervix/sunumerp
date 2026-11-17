"use client"

import { useCallback, useEffect, useState } from "react"
import { BellRing, CheckCircle2, RefreshCw, ShieldCheck } from "lucide-react"
import { toast } from "sonner"
import type {
  LogisticsAlertRuleDefinition,
  LogisticsAlertRuleKey,
  UserLogisticsNotificationPreferences,
} from "@/lib/logistics/notifications/constantsAndHelpers"

interface PreferencesPayload {
  preferences: UserLogisticsNotificationPreferences
  ruleDefinitions: LogisticsAlertRuleDefinition[]
  activeFlags: Record<string, boolean>
  allowedRules: Record<LogisticsAlertRuleKey, boolean>
  isSupplierScoped: boolean
  canEvaluateRules: boolean
}

function MiniSwitch({
  checked,
  disabled,
  label,
  onChange,
}: {
  checked: boolean
  disabled?: boolean
  label: string
  onChange: (next: boolean) => void
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={`w-9 h-5 rounded-full transition-all duration-200 p-0.5 flex items-center shrink-0 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed ${
        checked ? "bg-emerald-500 justify-end" : "bg-zinc-700 justify-start"
      }`}
    >
      <span className="size-4 rounded-full bg-white shadow-sm transition-transform" />
    </button>
  )
}

export function LogisticsNotificationPrefsPanel({
  compact = false,
  onNotificationsRefreshed,
}: {
  compact?: boolean
  onNotificationsRefreshed?: () => void
}) {
  const [data, setData] = useState<PreferencesPayload | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [scanning, setScanning] = useState(false)
  const [lastSavedText, setLastSavedText] = useState<string | null>(null)

  const loadPrefs = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch("/api/notifications/preferences")
      if (res.ok) {
        const json = (await res.json()) as PreferencesPayload
        setData(json)
      }
    } catch {
      // silent
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadPrefs()
  }, [loadPrefs])

  const persistPatch = async (patch: {
    rules?: Partial<Record<LogisticsAlertRuleKey, boolean>>
    inAppEnabled?: boolean
    emailDigestEnabled?: boolean
    soundEnabled?: boolean
  }) => {
    if (!data) return
    const optimistic: UserLogisticsNotificationPreferences = {
      ...data.preferences,
      inAppEnabled: patch.inAppEnabled ?? data.preferences.inAppEnabled,
      emailDigestEnabled: patch.emailDigestEnabled ?? data.preferences.emailDigestEnabled,
      soundEnabled: patch.soundEnabled ?? data.preferences.soundEnabled,
      rules: {
        ...data.preferences.rules,
        ...(patch.rules ?? {}),
      },
    }
    setData({ ...data, preferences: optimistic })
    setSaving(true)
    try {
      const res = await fetch("/api/notifications/preferences", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(patch),
      })
      if (!res.ok) {
        await loadPrefs()
        toast.error("Bildirim tercihleri kaydedilemedi.")
        return
      }
      const json = await res.json()
      setData((prev) => (prev ? { ...prev, preferences: json.preferences } : prev))
      setLastSavedText("Tercihler kaydedildi")
      if (!compact) toast.success("Lojistik bildirim tercihleriniz kaydedildi.")
    } catch {
      await loadPrefs()
      toast.error("Bildirim tercihleri kaydedilirken hata oluştu.")
    } finally {
      setSaving(false)
    }
  }

  const handleEvaluateNow = async () => {
    setScanning(true)
    try {
      const res = await fetch("/api/notifications/preferences", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "evaluate_rules" }),
      })
      const json = await res.json().catch(() => ({}))
      if (!res.ok) {
        toast.error(json?.error || "Kurallar değerlendirilemedi.")
        return
      }
      const count = json?.evaluation?.dispatchesCreated ?? 0
      const active = json?.evaluation?.activeAlertsCount ?? 0
      toast.success(
        count > 0
          ? `${active} aktif uyarı kontrol edildi, ${count} yeni bildirim oluşturuldu.`
          : `${active} aktif durum tarandı (yeni tekrar bildirimi yok).`
      )
      onNotificationsRefreshed?.()
    } catch {
      toast.error("Uyarı taraması sırasında hata oluştu.")
    } finally {
      setScanning(false)
    }
  }

  if (loading) {
    return (
      <div className="p-4 text-xs text-zinc-400 text-center">
        Bildirim kuralları yükleniyor...
      </div>
    )
  }

  if (!data) {
    return (
      <div className="p-4 text-xs text-zinc-400 text-center">
        Kişisel bildirim tercihleri şu an alınamadı.
      </div>
    )
  }

  if (data.isSupplierScoped) {
    return (
      <div className="p-4 rounded-xl border border-white/[0.06] bg-white/[0.02] text-xs text-zinc-400">
        Dış tedarikçi portal hesabında dahili operasyon uyarı kuralları kapalıdır.
      </div>
    )
  }

  const wrapperClass = compact
    ? "p-3 space-y-2.5"
    : "bg-card rounded-2xl border border-border p-6 space-y-5 shadow-xs"

  return (
    <div className={wrapperClass} data-testid="logistics-notification-prefs-panel">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h4 className={`${compact ? "text-xs" : "text-base"} font-bold flex items-center gap-2 text-foreground`}>
            <BellRing className={`${compact ? "w-3.5 h-3.5" : "w-5 h-5"} text-emerald-400`} />
            Lojistik &amp; Operasyon Uyarı Kuralları (6 Kural)
          </h4>
          {!compact && (
            <p className="text-xs text-muted-foreground mt-1">
              Her kural için bildirim alma tercihinizi kişisel hesabınıza özel olarak açıp kapatabilirsiniz. Aynı olay 24 saat içinde yalnızca bir kez bildirilir.
            </p>
          )}
        </div>

        {data.canEvaluateRules && (
          <button
            type="button"
            disabled={scanning}
            onClick={handleEvaluateNow}
            className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[11px] font-medium bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20 border border-emerald-500/20 transition-colors cursor-pointer disabled:opacity-50 shrink-0"
          >
            <RefreshCw className={`w-3 h-3 ${scanning ? "animate-spin" : ""}`} />
            {compact ? "Tara" : "Kuralları Şimdi Tara"}
          </button>
        )}
      </div>

      {/* Master In-App + Sound Switches */}
      <div className={`grid ${compact ? "grid-cols-2" : "grid-cols-1 sm:grid-cols-2"} gap-2`}>
        <div className="flex items-center justify-between gap-2 p-2.5 rounded-xl bg-background/60 border border-white/[0.06]">
          <span className="text-[11px] font-medium text-foreground">Uygulama İçi Uyarı</span>
          <MiniSwitch
            checked={data.preferences.inAppEnabled}
            disabled={saving}
            label="Uygulama içi lojistik uyarıları"
            onChange={(val) => persistPatch({ inAppEnabled: val })}
          />
        </div>
        <div className="flex items-center justify-between gap-2 p-2.5 rounded-xl bg-background/60 border border-white/[0.06]">
          <span className="text-[11px] font-medium text-foreground">Sesli Uyarı</span>
          <MiniSwitch
            checked={data.preferences.soundEnabled}
            disabled={saving}
            label="Sesli lojistik uyarıları"
            onChange={(val) => persistPatch({ soundEnabled: val })}
          />
        </div>
      </div>

      {/* 6 Rule Rows */}
      <div className="space-y-2">
        {data.ruleDefinitions.map((def) => {
          const isFlagActive = Boolean(data.activeFlags[def.flagKey])
          const isPermitted = Boolean(data.allowedRules[def.key])
          const isChecked = Boolean(data.preferences.rules[def.key])

          return (
            <div
              key={def.key}
              className={`flex items-center justify-between gap-3 ${
                compact ? "p-2.5" : "p-3.5"
              } rounded-xl bg-background border border-white/[0.06]`}
            >
              <div className="min-w-0">
                <div className="flex items-center gap-1.5 flex-wrap">
                  <span className="text-xs font-semibold text-foreground">{def.title}</span>
                  {!isFlagActive && (
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-zinc-800 text-zinc-400">
                      Modül Kapalı
                    </span>
                  )}
                  {isFlagActive && !isPermitted && (
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-400">
                      Yetki Dışı
                    </span>
                  )}
                </div>
                {!compact && (
                  <p className="text-[11px] text-muted-foreground mt-0.5">{def.description}</p>
                )}
              </div>

              <MiniSwitch
                checked={isChecked}
                disabled={saving || !data.preferences.inAppEnabled}
                label={def.title}
                onChange={(val) =>
                  persistPatch({
                    rules: { [def.key]: val },
                  })
                }
              />
            </div>
          )
        })}
      </div>

      {lastSavedText && (
        <div className="flex items-center gap-1.5 text-[11px] text-emerald-400">
          <CheckCircle2 className="w-3.5 h-3.5" />
          <span>{lastSavedText}</span>
          <ShieldCheck className="w-3.5 h-3.5 ml-auto text-zinc-500" />
        </div>
      )}
    </div>
  )
}
