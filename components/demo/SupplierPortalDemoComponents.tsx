"use client"

import React, { useEffect, useState } from "react"
import {
  Sparkles,
  RefreshCw,
  KeyRound,
  Building2,
  ShieldCheck,
  Info,
  ArrowRight,
  RotateCcw,
} from "lucide-react"

interface DemoAccountInfo {
  username: string
  fullName: string
  supplierId: string
  supplierCode: string
  supplierName: string
  category: string
}

interface DemoStatePayload {
  demoModeEnabled: boolean
  hasAdminReturnToken: boolean
  returnAdminUsername?: string | null
  demoAccounts: DemoAccountInfo[]
}

/**
 * Tek merkezi demo şalterini (`/api/system-config` -> `logisticsDemoMode`) okur;
 * yalnızca açıksa `/api/supplier-portal/demo` üzerinden hesap listesini getirir.
 */
export function useSupplierDemoState() {
  const [state, setState] = useState<DemoStatePayload>({
    demoModeEnabled: false,
    hasAdminReturnToken: false,
    demoAccounts: [],
  })
  const [loaded, setLoaded] = useState(false)

  useEffect(() => {
    let active = true
    async function load() {
      try {
        const cfgRes = await fetch("/api/system-config")
        if (!cfgRes.ok) {
          if (active) setLoaded(true)
          return
        }
        const cfg = await cfgRes.json()
        if (!cfg?.logisticsDemoMode) {
          if (active) {
            setState({ demoModeEnabled: false, hasAdminReturnToken: false, demoAccounts: [] })
            setLoaded(true)
          }
          return
        }

        const demoRes = await fetch("/api/supplier-portal/demo")
        if (demoRes.ok) {
          const d = await demoRes.json()
          if (active && d.demoModeEnabled) {
            setState({
              demoModeEnabled: true,
              hasAdminReturnToken: Boolean(d.hasAdminReturnToken),
              returnAdminUsername: d.returnAdminUsername ?? null,
              demoAccounts: Array.isArray(d.demoAccounts) ? d.demoAccounts : [],
            })
          }
        }
      } catch {
        // Demo durumu okunamazsa sessizce kapalı kalır
      } finally {
        if (active) setLoaded(true)
      }
    }
    load()
    return () => {
      active = false
    }
  }, [])

  return { ...state, loaded }
}

/**
 * `/dashboard/satinalma` başlığında yalnızca demo modunda gösterilen
 * "Şirket Yöneticisi <-> Tedarikçi Portalı" perspektif geçiş butonu.
 */
export function ErpPerspectiveSwitchButton({
  onSwitched,
}: {
  onSwitched?: () => void
}) {
  const { demoModeEnabled, demoAccounts } = useSupplierDemoState()
  const [selectedUsername, setSelectedUsername] = useState("tedarikci.royal")
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState("")

  useEffect(() => {
    if (demoAccounts.length > 0 && !demoAccounts.some((a) => a.username === selectedUsername)) {
      setSelectedUsername(demoAccounts[0].username)
    }
  }, [demoAccounts, selectedUsername])

  if (!demoModeEnabled) return null

  const handleSwitch = async () => {
    setBusy(true)
    setErr("")
    try {
      const res = await fetch("/api/supplier-portal/demo", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "switch_to_supplier",
          username: selectedUsername,
        }),
      })
      const data = await res.json()
      if (!res.ok || !data.success) {
        setErr(data.error || "Perspektif geçişi yapılamadı.")
        return
      }
      onSwitched?.()
      window.location.href = data.redirectTo || "/tedarikci-portali"
    } catch {
      setErr("Ağ hatası nedeniyle geçiş yapılamadı.")
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      {demoAccounts.length > 1 && (
        <select
          value={selectedUsername}
          onChange={(e) => setSelectedUsername(e.target.value)}
          aria-label="Demo Tedarikçi Hesabı Seç"
          className="h-9 rounded-xl border border-amber-500/30 bg-[#121614] px-2.5 text-xs text-amber-200 focus:outline-none focus:border-amber-400"
        >
          {demoAccounts.map((acc) => (
            <option key={acc.username} value={acc.username}>
              {acc.supplierName} ({acc.username})
            </option>
          ))}
        </select>
      )}
      <button
        type="button"
        onClick={handleSwitch}
        disabled={busy}
        data-testid="demo-perspective-switch-btn"
        className="inline-flex items-center gap-1.5 h-9 px-3.5 rounded-xl text-xs font-semibold border border-amber-500/35 bg-amber-500/10 text-amber-300 hover:bg-amber-500/20 transition-colors disabled:opacity-50"
      >
        <RefreshCw className={`size-3.5 ${busy ? "animate-spin" : ""}`} />
        {busy ? "Portal Açılıyor..." : "Perspektif Geçişi: Tedarikçi Portalı"}
        <ArrowRight className="size-3.5" />
      </button>
      {err && <span className="text-[11px] text-rose-400">{err}</span>}
    </div>
  )
}

/**
 * `/tedarikci-portali` giriş ekranında yalnızca demo modunda gösterilen hızlı test kutusu.
 * Kesinlikle Super Admin yetkisi VERMEZ; sadece `Tedarikçi` rolünü açar.
 */
export function DemoPortalLoginBox({
  onLoggedIn,
}: {
  onLoggedIn: () => Promise<void> | void
}) {
  const { demoModeEnabled, demoAccounts } = useSupplierDemoState()
  const [busyUser, setBusyUser] = useState<string | null>(null)
  const [err, setErr] = useState("")

  if (!demoModeEnabled) return null

  const handleDemoLogin = async (username: string) => {
    setBusyUser(username)
    setErr("")
    try {
      const res = await fetch("/api/supplier-portal/demo", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "demo_supplier_login", username }),
      })
      const data = await res.json()
      if (!res.ok || !data.success) {
        setErr(data.error || "Demo tedarikçi girişi başarısız.")
        return
      }
      await onLoggedIn()
    } catch {
      setErr("Sunucuya erişilemedi.")
    } finally {
      setBusyUser(null)
    }
  }

  const primaryList =
    demoAccounts.length > 0
      ? demoAccounts
      : [
          {
            username: "tedarikci.royal",
            fullName: "Royal Holland Flora",
            supplierId: "sup-holland-01",
            supplierCode: "SUP-FLORA-01",
            supplierName: "Royal Holland Flora BV",
            category: "KESME_CICEK",
          },
        ]

  return (
    <div className="rounded-[18px] border border-amber-500/25 bg-amber-500/[0.06] p-4 space-y-3">
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2 text-amber-300 text-xs font-semibold">
          <Sparkles className="size-4 shrink-0" />
          <span>Demo Ortamı Hızlı Erişim (Kısıtlı Tedarikçi Rolü)</span>
        </div>
        <span className="rounded-md bg-amber-500/15 border border-amber-500/30 px-2 py-0.5 text-[10px] font-medium text-amber-200">
          DEMO AKTİF
        </span>
      </div>

      <p className="text-[11px] text-zinc-400 leading-relaxed">
        Bu kutu yalnızca demo sunumunda görünür ve{" "}
        <span className="text-amber-200 font-medium">DISABLE_DEMO_MODE=true</span> ile kapanır.
        Yalnızca ilgili tedarikçiye izole portal yetkisi verir (şirket içi ERP kapalı kalır).
      </p>

      <div className="space-y-2">
        {primaryList.map((acc) => (
          <div
            key={acc.username}
            className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-white/[0.07] bg-[#0B0E0D]/80 px-3 py-2"
          >
            <div className="min-w-0">
              <div className="flex items-center gap-1.5 text-xs font-medium text-zinc-100">
                <Building2 className="size-3.5 text-[#34D399]" />
                <span className="truncate">{acc.supplierName}</span>
              </div>
              <div className="text-[11px] text-zinc-400 font-mono mt-0.5">
                Kullanıcı: <span className="text-zinc-200">{acc.username}</span> · Şifre:{" "}
                <span className="text-zinc-200">demo123</span>
              </div>
            </div>
            <button
              type="button"
              disabled={busyUser !== null}
              onClick={() => handleDemoLogin(acc.username)}
              data-testid={`demo-supplier-login-${acc.username}`}
              className="inline-flex items-center gap-1.5 h-8 px-3 rounded-lg bg-[#34D399] hover:bg-[#2ec18b] text-[#06120D] text-xs font-semibold transition-colors disabled:opacity-50"
            >
              <KeyRound className="size-3.5" />
              {busyUser === acc.username ? "Giriş Yapılıyor..." : "Demo Tedarikçi ile Dene"}
            </button>
          </div>
        ))}
      </div>

      {err && <p className="text-xs text-rose-400">{err}</p>}
    </div>
  )
}

/**
 * Şirket yöneticisi perspektif geçişi ile portalda geziniyorsa üstte ince dönüş çubuğu gösterir.
 */
export function DemoSupplierPerspectiveBar({
  supplierName,
  returnAdminUsername,
  demoModeEnabled,
  hasAdminReturnToken,
}: {
  supplierName: string
  returnAdminUsername?: string | null
  demoModeEnabled: boolean
  hasAdminReturnToken: boolean
}) {
  const [busy, setBusy] = useState(false)

  if (!demoModeEnabled || !hasAdminReturnToken) return null

  const handleRestore = async () => {
    setBusy(true)
    try {
      const res = await fetch("/api/supplier-portal/demo", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "restore_admin" }),
      })
      const data = await res.json()
      if (res.ok && data.success) {
        window.location.href = data.redirectTo || "/dashboard/satinalma"
      }
    } finally {
      setBusy(false)
    }
  }

  return (
    <div
      data-testid="demo-perspective-return-bar"
      className="border-b border-amber-500/30 bg-amber-500/10 px-4 py-2 text-xs text-amber-200"
    >
      <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <ShieldCheck className="size-4 text-amber-300 shrink-0" />
          <span>
            <strong>Perspektif Görünümü (Demo):</strong> Şu anda{" "}
            <span className="text-white font-semibold">{supplierName}</span> harici tedarikçi
            oturumuyla geziniyorsunuz.
          </span>
        </div>
        <button
          type="button"
          onClick={handleRestore}
          disabled={busy}
          data-testid="demo-restore-admin-btn"
          className="inline-flex items-center gap-1.5 h-7 px-3 rounded-lg bg-amber-400 hover:bg-amber-300 text-[#0B0E0D] font-semibold transition-colors disabled:opacity-60"
        >
          <RotateCcw className={`size-3.5 ${busy ? "animate-spin" : ""}`} />
          {busy
            ? "ERP'ye Dönülüyor..."
            : `ERP Yönetici Görünümüne Dön (${returnAdminUsername || "Yönetici"})`}
        </button>
      </div>
    </div>
  )
}

/**
 * Tedarikçi Portalı içinde yalnızca demo modunda görünen kısa kullanım rehberi.
 */
export function DemoPortalGuideCard({ demoModeEnabled }: { demoModeEnabled: boolean }) {
  const [open, setOpen] = useState(true)
  if (!demoModeEnabled || !open) return null

  return (
    <div className="rounded-2xl border border-emerald-500/20 bg-emerald-500/[0.04] px-4 py-3 text-xs text-zinc-300">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-2.5">
          <Info className="size-4 text-[#34D399] shrink-0 mt-0.5" />
          <div className="space-y-1">
            <div className="font-semibold text-[#34D399]">
              Bu Ekranda Ne Yapabilirsiniz? (Tedarikçi Self-Servis Demo Rehberi)
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2 text-[11px] text-zinc-400">
              <span>1. İletilen PO siparişlerini onaylayın veya gecikme riski (Kırmızı Bayrak) bildirin.</span>
              <span>2. Davet edildiğiniz açık RFQ ihalelerine birim fiyat ve nakliye dahil teklif verin.</span>
              <span>3. Onaylı PO için lot/SKT/SSCC içeren ASN ön sevkiyat ihbarı gönderin (WMS'e düşer).</span>
              <span>4. Sertifika/sözleşme yükleyin ve OTD/Kalite skor kartınızı canlı izleyin.</span>
            </div>
          </div>
        </div>
        <button
          type="button"
          onClick={() => setOpen(false)}
          className="text-[11px] text-zinc-400 hover:text-zinc-200 px-2 py-0.5 rounded border border-white/10"
        >
          Gizle
        </button>
      </div>
    </div>
  )
}
