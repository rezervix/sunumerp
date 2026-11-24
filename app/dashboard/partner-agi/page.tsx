"use client"

import React, { useCallback, useEffect, useState } from "react"
import {
  AlertTriangle,
  ArrowRight,
  Building2,
  CheckCircle2,
  CreditCard,
  FileSpreadsheet,
  Globe,
  HelpCircle,
  RefreshCw,
  ShieldCheck,
  Users,
  X,
} from "lucide-react"
import { B2B_COMPANY_TYPE_LABELS, formatTryB2b } from "@/lib/tourism/b2b/constantsAndHelpers"
import { PartnerNetworkAndPoolTabs } from "./components/PartnerNetworkAndPoolTabs"
import { CrossReservationsAndMessagesTabs } from "./components/CrossReservationsAndMessagesTabs"
import { PartnerLedgerSettlementsAndReportsTabs } from "./components/PartnerLedgerSettlementsAndReportsTabs"

type B2bTabKey = "partners" | "pool" | "reservations" | "settlements" | "ledger" | "reports"

export default function PartnerAgiDashboardPage() {
  const [activeTab, setActiveTab] = useState<B2bTabKey>("pool")
  const [demoCompanyId, setDemoCompanyId] = useState<string>("")
  const [data, setData] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const [noticeMsg, setNoticeMsg] = useState<string | null>(null)
  const [showGuide, setShowGuide] = useState(false)
  const [poolFilters, setPoolFilters] = useState({
    resourceType: "ALL",
    search: "",
    startAt: "",
    endAt: "",
  })

  const fetchSnapshot = useCallback(
    async (overrideCompanyId?: string, overrideFilters?: typeof poolFilters) => {
      setLoading(true)
      setErrorMsg(null)
      try {
        const cid = overrideCompanyId !== undefined ? overrideCompanyId : demoCompanyId
        const flt = overrideFilters ?? poolFilters
        const params = new URLSearchParams()
        if (cid) params.set("demoCompanyId", cid)
        if (flt.resourceType && flt.resourceType !== "ALL") params.set("resourceType", flt.resourceType)
        if (flt.search.trim()) params.set("search", flt.search.trim())
        if (flt.startAt) params.set("startAt", `${flt.startAt}T09:00:00.000Z`)
        if (flt.endAt) params.set("endAt", `${flt.endAt}T18:00:00.000Z`)

        const res = await fetch(`/api/partner-agi?${params.toString()}`, { cache: "no-store" })
        const json = await res.json().catch(() => ({}))
        if (!res.ok || !json.success) {
          setErrorMsg(json?.error || "B2B Partner Ağı verileri yüklenemedi.")
          return
        }
        setData(json.data)
      } catch (err: any) {
        setErrorMsg(err?.message || "Bağlantı hatası oluştu.")
      } finally {
        setLoading(false)
      }
    },
    [demoCompanyId, poolFilters]
  )

  useEffect(() => {
    fetchSnapshot()
  }, [fetchSnapshot])

  const handleAction = async (action: string, payload: Record<string, any>): Promise<boolean> => {
    setBusy(true)
    setErrorMsg(null)
    setNoticeMsg(null)
    try {
      const res = await fetch("/api/partner-agi", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action,
          ...payload,
          ...(demoCompanyId ? { demoCompanyId } : {}),
        }),
      })
      const json = await res.json().catch(() => ({}))
      if (!res.ok || !json.success) {
        const altList = json?.details?.alternatives
        const altText =
          Array.isArray(altList) && altList.length > 0
            ? ` Önerilen alternatifler: ${altList.map((a: any) => `${a.title} (${a.ownerCompanyName})`).join(", ")}`
            : ""
        setErrorMsg(`${json?.error || "İşlem başarısız oldu."}${altText}`)
        return false
      }
      setNoticeMsg(json?.data?.notice || "İşlem başarıyla tamamlandı.")
      await fetchSnapshot()
      return true
    } catch (err: any) {
      setErrorMsg(err?.message || "İşlem sırasında hata oluştu.")
      return false
    } finally {
      setBusy(false)
    }
  }

  const switchDemoPerspective = (companyId: string) => {
    setDemoCompanyId(companyId)
    setNoticeMsg(null)
    setErrorMsg(null)
    fetchSnapshot(companyId)
  }

  const analytics = data?.analytics || {}
  const perspectiveList: any[] = data?.demoPerspectiveCompanies || []

  return (
    <div className="space-y-5 p-4 md:p-6 text-zinc-100">
      {/* ÜST BAŞLIK */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <Globe className="h-5 w-5 text-[--brand]" />
            <h1 className="text-xl font-bold tracking-tight text-zinc-100">B2B Partner Ağı</h1>
            {data?.activeCompany && (
              <span className="rounded-full border border-sky-500/30 bg-sky-500/10 px-2.5 py-0.5 text-xs font-medium text-sky-300">
                Aktif Firma: {data.activeCompany.name}
              </span>
            )}
          </div>
          <p className="text-xs text-zinc-400 mt-0.5">
            Partner firmalar arası ortak kaynak havuzu, white-label çapraz rezervasyon, çakışma kilidi, komisyon hakediş ve karşılıklı cari mutabakat.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {data?.isDemoMode && (
            <button
              type="button"
              onClick={() => setShowGuide((v) => !v)}
              className="inline-flex items-center gap-1.5 rounded-lg border border-sky-500/40 bg-sky-500/10 px-3 py-1.5 text-xs text-sky-300 hover:bg-sky-500/20"
            >
              <HelpCircle className="h-3.5 w-3.5" /> Bu ekranda neler yapabilirsiniz?
            </button>
          )}
          <button
            type="button"
            disabled={loading || busy}
            onClick={() => fetchSnapshot()}
            className="inline-flex items-center gap-1.5 rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-1.5 text-xs text-zinc-200 hover:bg-zinc-800"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} /> Yenile
          </button>
        </div>
      </div>

      {/* MADDE J: DEMO "FİRMA PERSPEKTİFİ" GEÇİŞ ÇUBUĞU (Yalnızca Demo Modunda Görünür) */}
      {data?.isDemoMode && perspectiveList.length > 0 && (
        <div className="rounded-xl border border-[--brand-line] bg-[--brand-soft] p-3.5 space-y-2">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2 text-xs font-semibold text-[--brand]">
              <Building2 className="h-4 w-4" />
              <span>Demo Kolaylığı — Firma Perspektifi (Kısıtlı Tek-Firma İzolasyonu)</span>
            </div>
            <span className="text-[11px] text-zinc-400">
              Tek tıkla firmalar arasında geçiş yapıp aynı çapraz rezervasyonun ve carinin (A alacağı = B borcu) iki tarafını inceleyin.
            </span>
          </div>
          <div className="flex flex-wrap gap-2">
            {perspectiveList.map((comp) => {
              const isSelected = data?.activeCompany?.id === comp.id
              return (
                <button
                  key={comp.id}
                  type="button"
                  disabled={loading || busy}
                  onClick={() => switchDemoPerspective(comp.id)}
                  className={`rounded-lg border px-3 py-1.5 text-xs transition ${
                    isSelected
                      ? "border-[--brand] bg-[--brand] text-white font-semibold"
                      : "border-zinc-700 bg-zinc-900/80 text-zinc-300 hover:border-[--brand-line] hover:text-zinc-100"
                  }`}
                >
                  {comp.name}
                  <span className="ml-1.5 text-[10px] opacity-75">
                    ({B2B_COMPANY_TYPE_LABELS[comp.companyType]?.split(" ")[0] || comp.companyType})
                  </span>
                </button>
              )
            })}
          </div>
        </div>
      )}

      {/* DEMO REHBERİ (Sadece Demo Modunda) */}
      {data?.isDemoMode && showGuide && (
        <div className="rounded-xl border border-sky-500/30 bg-zinc-900/90 p-4 text-xs text-zinc-300 space-y-2">
          <div className="flex items-center justify-between">
            <strong className="text-sky-300">Hızlı Demo Senaryoları (2 Dakikada Çift Taraflı B2B Akışı)</strong>
            <button type="button" onClick={() => setShowGuide(false)} className="text-zinc-400 hover:text-zinc-100">
              <X className="h-4 w-4" />
            </button>
          </div>
          <ol className="list-decimal list-inside space-y-1 text-zinc-300">
            <li>
              Yukarıdaki <strong>Firma Perspektifi</strong> çubuğundan <strong>Örnek Ege Rota Araç Kiralama</strong> seçin →{" "}
              <em>Çapraz Rezervasyonlar</em> sekmesinde <code>CRZ-2026-B2B001</code> kaydını <strong>Kaynak Sahibi (Alacaklı)</strong> olarak görün.
            </li>
            <li>
              Tek tıkla <strong>Örnek Anadolu Keşif Turizm</strong> perspektifine geçin → Aynı <code>CRZ-2026-B2B001</code> kaydının{" "}
              <strong>Rezerve Eden (Borçlu)</strong> tarafını, mesajlaşmayı ve <em>Karşılıklı Cari</em> sekmesindeki birebir eşit borç kaydını görün.
            </li>
            <li>
              <em>Ortak Kaynak Havuzu</em> sekmesinde plaka/şasi alanlarının veri minimizasyonu ile maskelendiğini kontrol edip yeni bir white-label rezervasyon açın.
            </li>
          </ol>
        </div>
      )}

      {/* UYARI / BİLGİ BANNERLARI */}
      {errorMsg && (
        <div className="flex items-center justify-between gap-2 rounded-xl border border-rose-500/40 bg-rose-500/10 px-4 py-2.5 text-xs text-rose-200">
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 shrink-0 text-rose-400" />
            <span>{errorMsg}</span>
          </div>
          <button type="button" onClick={() => setErrorMsg(null)}><X className="h-3.5 w-3.5" /></button>
        </div>
      )}
      {noticeMsg && (
        <div className="flex items-center justify-between gap-2 rounded-xl border border-[--brand-line] bg-[--brand]/10 px-4 py-2.5 text-xs text-[--text]">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 shrink-0 text-[--brand]" />
            <span>{noticeMsg}</span>
          </div>
          <button type="button" onClick={() => setNoticeMsg(null)}><X className="h-3.5 w-3.5" /></button>
        </div>
      )}

      {/* KPI ŞERİDİ */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <div className="rounded-xl border border-zinc-800 bg-zinc-900/70 p-3.5">
          <div className="text-[11px] text-zinc-400">Onaylı / Bekleyen Partner</div>
          <div className="text-lg font-bold text-zinc-100 mt-1">
            {analytics.approvedPartnerCount ?? 0} <span className="text-xs font-normal text-amber-400">/ {analytics.pendingPartnerCount ?? 0}</span>
          </div>
        </div>
        <div className="rounded-xl border border-zinc-800 bg-zinc-900/70 p-3.5">
          <div className="text-[11px] text-zinc-400">Erişilebilir Partner Kaynağı</div>
          <div className="text-lg font-bold text-[--brand] mt-1">{analytics.visiblePartnerResourceCount ?? 0}</div>
        </div>
        <div className="rounded-xl border border-zinc-800 bg-zinc-900/70 p-3.5">
          <div className="text-[11px] text-zinc-400">Çapraz Rezervasyon</div>
          <div className="text-lg font-bold text-sky-300 mt-1">
            {analytics.totalCrossReservationCount ?? 0}
            {analytics.pendingApprovalCount > 0 && (
              <span className="ml-1.5 text-xs font-normal text-amber-400">({analytics.pendingApprovalCount} onay bekliyor)</span>
            )}
          </div>
        </div>
        <div className="rounded-xl border border-zinc-800 bg-zinc-900/70 p-3.5">
          <div className="text-[11px] text-zinc-400">Açık Alacak / Borç</div>
          <div className="text-sm font-bold mt-1">
            <span className="text-[--brand]">{formatTryB2b(analytics.openReceivableTry)}</span>
            <span className="text-zinc-500 mx-1">/</span>
            <span className="text-rose-300">{formatTryB2b(analytics.openPayableTry)}</span>
          </div>
        </div>
        <div className="rounded-xl border border-zinc-800 bg-zinc-900/70 p-3.5">
          <div className="text-[11px] text-zinc-400">Kaynak Kullanım / Çakışma</div>
          <div className="text-lg font-bold text-zinc-100 mt-1">
            %{analytics.resourceUtilizationPct ?? 0}{" "}
            <span className="text-xs font-normal text-amber-400">({analytics.conflictCount ?? 0} blokaj)</span>
          </div>
        </div>
      </div>

      {/* SEKMELER */}
      <div className="flex flex-wrap gap-1.5 border-b border-zinc-800 pb-2">
        {(
          [
            ["pool", "Ortak Kaynak Havuzu & Takvim", Globe],
            ["reservations", "Çapraz Rezervasyonlar & Mesajlar", ArrowRight],
            ["partners", "Partner Firmalar & Onay", Users],
            ["settlements", "Komisyon & Mutabakat", ShieldCheck],
            ["ledger", "Karşılıklı Cari", CreditCard],
            ["reports", "Raporlar & Dışa Aktar", FileSpreadsheet],
          ] as const
        ).map(([key, label, Icon]) => (
          <button
            key={key}
            type="button"
            onClick={() => setActiveTab(key)}
            className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-medium transition ${
              activeTab === key
                ? "bg-[--brand] text-white"
                : "text-zinc-400 hover:bg-zinc-900 hover:text-zinc-100"
            }`}
          >
            <Icon className="h-3.5 w-3.5" />
            {label}
          </button>
        ))}
      </div>

      {/* SEKME İÇERİĞİ */}
      {loading && !data ? (
        <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-10 text-center text-xs text-zinc-400">
          B2B Partner Ağı yükleniyor...
        </div>
      ) : data ? (
        <>
          {(activeTab === "partners" || activeTab === "pool") && (
            <PartnerNetworkAndPoolTabs
              activeTab={activeTab}
              data={data}
              busy={busy}
              onAction={handleAction}
              onFilterPool={(next) => {
                setPoolFilters(next)
                fetchSnapshot(undefined, next)
              }}
            />
          )}
          {activeTab === "reservations" && (
            <CrossReservationsAndMessagesTabs data={data} busy={busy} onAction={handleAction} />
          )}
          {(activeTab === "settlements" || activeTab === "ledger" || activeTab === "reports") && (
            <PartnerLedgerSettlementsAndReportsTabs
              activeTab={activeTab}
              data={data}
              busy={busy}
              demoCompanyId={demoCompanyId}
              onAction={handleAction}
            />
          )}
        </>
      ) : null}
    </div>
  )
}
