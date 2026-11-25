"use client"

import React, { useEffect, useState } from "react"
import Link from "next/link"
import {
  ArrowRight,
  BarChart3,
  Building2,
  CalendarDays,
  Compass,
  FileSpreadsheet,
  FileText,
  Globe,
  Plus,
  RefreshCw,
  ShieldCheck,
  TrendingUp,
  Users,
} from "lucide-react"
import type { TourismExecutiveSummaryResponse } from "@/lib/tourism/dashboard/tourismSummaryService"

type SectorTab = "all" | "rentacar" | "hotel" | "tour" | "b2b"

export default function TurizmDashboardHubPage() {
  const [activeTab, setActiveTab] = useState<SectorTab>("all")
  const [summary, setSummary] = useState<TourismExecutiveSummaryResponse | null>(null)
  const [loading, setLoading] = useState(true)

  async function loadData() {
    setLoading(true)
    try {
      const res = await fetch("/api/turizm/dashboard-summary")
      if (res.ok) {
        const json = await res.json()
        setSummary(json)
      }
    } catch {
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [])

  const m = summary?.modules

  return (
    <div className="space-y-6 p-4 md:p-6 text-[var(--text)]">
      {/* BAŞLIK VE HIZLI EYLEMLER */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <Compass className="h-6 w-6 text-[var(--brand)]" />
            <h1 className="text-xl font-bold tracking-tight text-[var(--text)]">
              Turizm &amp; Ağırlama Sektörel Yönetim Panosu
            </h1>
          </div>
          <p className="text-xs text-[var(--text-muted)] mt-1">
            Araç kiralama, otel PMS, tur operasyonu ve B2B partner ağının tek merkezden konsolide yönetimi.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <Link
            href="/dashboard/turizm/raporlar"
            className="inline-flex items-center gap-1.5 rounded-lg border border-[var(--brand-line)] bg-[var(--brand-soft)] px-3.5 py-2 text-xs font-medium text-[var(--brand)] hover:bg-[var(--brand-soft-2)] transition-colors"
          >
            <BarChart3 className="h-4 w-4" />
            Konsolide Raporlar
          </Link>
          <button
            type="button"
            disabled={loading}
            onClick={loadData}
            className="inline-flex items-center gap-1.5 rounded-lg border border-[var(--line)] bg-[var(--bg)] px-3 py-2 text-xs text-[var(--text-2)] hover:bg-[var(--muted-bg)] transition-colors"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
            Yenile
          </button>
        </div>
      </div>

      {/* SEKTÖR SEÇİCİ SEKMELER */}
      <div className="flex flex-wrap gap-2 border-b border-[var(--line)] pb-3">
        {[
          { key: "all", label: "Konsolide Görünüm", icon: Compass },
          { key: "rentacar", label: "Araç Kiralama (Rent-a-Car)", icon: Compass },
          { key: "hotel", label: "Otel Yönetimi (Mini PMS)", icon: Building2 },
          { key: "tour", label: "Tur Operatörlüğü", icon: Users },
          { key: "b2b", label: "B2B Partner Ağı", icon: Globe },
        ].map(({ key, label, icon: Icon }) => (
          <button
            key={key}
            type="button"
            onClick={() => setActiveTab(key as SectorTab)}
            className={`inline-flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-medium transition ${ activeTab === key ? "bg-[var(--brand)] text-white shadow-sm" : "bg-[var(--muted-bg)] text-[var(--text-muted)] hover:bg-[var(--brand-soft)] hover:text-[var(--brand)]" }`}
          >
            <Icon className="h-4 w-4" />
            {label}
          </button>
        ))}
      </div>

      {/* KPI KARTLARI */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
        {/* RENT-A-CAR KART */}
        {(activeTab === "all" || activeTab === "rentacar") && m?.rentacar && (
          <div className="rounded-2xl border border-[var(--line)] bg-[var(--bg)] p-5 space-y-3 shadow-sm">
            <div className="flex items-center justify-between text-xs text-[var(--text-muted)]">
              <span className="font-semibold text-[var(--brand)]">Rent-a-Car Operasyonu</span>
              <Compass className="h-4 w-4 text-[var(--brand)]" />
            </div>
            <div className="text-3xl font-light text-[var(--text)] tracking-tight">
              {m.rentacar.activeRentalsCount}{" "}
              <span className="text-xs text-[var(--text-muted)] font-normal">aktif kiralama</span>
            </div>
            <div className="grid grid-cols-2 gap-2 pt-2 border-t border-[var(--line-soft)] text-xs text-[var(--text-muted)]">
              <div>
                <span className="block text-[10px] text-[var(--text-muted)]">Müsait Araç</span>
                <span className="text-[var(--text-2)] font-medium">{m.rentacar.availableVehiclesCount} araç</span>
              </div>
              <div>
                <span className="block text-[10px] text-[var(--text-muted)]">Aylık Hacim</span>
                <span className="text-[var(--brand)] font-medium">₺{m.rentacar.monthlyRevenueTry.toLocaleString("tr-TR")}</span>
              </div>
            </div>
            <Link
              href="/dashboard/arac-kiralama"
              className="mt-2 block text-center rounded-lg bg-[var(--muted-bg)] py-1.5 text-xs text-[var(--text-2)] hover:bg-[var(--brand-soft)] hover:text-[var(--brand)] transition-colors"
            >
              Kiralama Yönetimine Git →
            </Link>
          </div>
        )}

        {/* OTEL PMS KART */}
        {(activeTab === "all" || activeTab === "hotel") && m?.hotel && (
          <div className="rounded-2xl border border-[var(--line)] bg-[var(--bg)] p-5 space-y-3 shadow-sm">
            <div className="flex items-center justify-between text-xs text-[var(--text-muted)]">
              <span className="font-semibold text-[var(--brand)]">Otel &amp; Konaklama (Mini PMS)</span>
              <Building2 className="h-4 w-4 text-[var(--brand)]" />
            </div>
            <div className="text-3xl font-light text-[var(--text)] tracking-tight">
              %{m.hotel.occupancyRatePct}{" "}
              <span className="text-xs text-[var(--text-muted)] font-normal">oda doluluğu</span>
            </div>
            <div className="grid grid-cols-2 gap-2 pt-2 border-t border-[var(--line-soft)] text-xs text-[var(--text-muted)]">
              <div>
                <span className="block text-[10px] text-[var(--text-muted)]">Giriş / Çıkış</span>
                <span className="text-[var(--text-2)] font-medium">{m.hotel.todayCheckInsCount} / {m.hotel.todayCheckOutsCount}</span>
              </div>
              <div>
                <span className="block text-[10px] text-[var(--text-muted)]">Açık Folyo</span>
                <span className="text-[var(--warn)] font-medium">₺{m.hotel.openFoliosBalanceTry.toLocaleString("tr-TR")}</span>
              </div>
            </div>
            <Link
              href="/dashboard/otel"
              className="mt-2 block text-center rounded-lg bg-[var(--muted-bg)] py-1.5 text-xs text-[var(--text-2)] hover:bg-[var(--brand-soft)] hover:text-[var(--brand)] transition-colors"
            >
              Ön Büro &amp; Odalara Git →
            </Link>
          </div>
        )}

        {/* TUR OPERATÖRLÜĞÜ KART */}
        {(activeTab === "all" || activeTab === "tour") && m?.tour && (
          <div className="rounded-2xl border border-[var(--line)] bg-[var(--bg)] p-5 space-y-3 shadow-sm">
            <div className="flex items-center justify-between text-xs text-[var(--text-muted)]">
              <span className="font-semibold text-[var(--brand)]">Tur Operasyonları</span>
              <Compass className="h-4 w-4 text-[var(--brand)]" />
            </div>
            <div className="text-3xl font-light text-[var(--text)] tracking-tight">
              {m.tour.upcomingToursCount}{" "}
              <span className="text-xs text-[var(--text-muted)] font-normal">yaklaşan tur</span>
            </div>
            <div className="grid grid-cols-2 gap-2 pt-2 border-t border-[var(--line-soft)] text-xs text-[var(--text-muted)]">
              <div>
                <span className="block text-[10px] text-[var(--text-muted)]">Kayıtlı Yolcu</span>
                <span className="text-[var(--text-2)] font-medium">{m.tour.totalPassengersCount} yolcu</span>
              </div>
              <div>
                <span className="block text-[10px] text-[var(--text-muted)]">Ortalama Kâr</span>
                <span className="text-[var(--ok)] font-medium">%{m.tour.averageProfitMarginPct} marj</span>
              </div>
            </div>
            <Link
              href="/dashboard/tur"
              className="mt-2 block text-center rounded-lg bg-[var(--muted-bg)] py-1.5 text-xs text-[var(--text-2)] hover:bg-[var(--brand-soft)] hover:text-[var(--brand)] transition-colors"
            >
              Tur Takvimi &amp; Manifestoya Git →
            </Link>
          </div>
        )}

        {/* B2B PARTNER AĞI KART */}
        {(activeTab === "all" || activeTab === "b2b") && m?.b2b && (
          <div className="rounded-2xl border border-[var(--line)] bg-[var(--bg)] p-5 space-y-3 shadow-sm">
            <div className="flex items-center justify-between text-xs text-[var(--text-muted)]">
              <span className="font-semibold text-[var(--brand)]">B2B Partner Ekosistemi</span>
              <Globe className="h-4 w-4 text-[var(--brand)]" />
            </div>
            <div className="text-3xl font-light text-[var(--text)] tracking-tight">
              {m.b2b.approvedPartnersCount}{" "}
              <span className="text-xs text-[var(--text-muted)] font-normal">onaylı partner</span>
            </div>
            <div className="grid grid-cols-2 gap-2 pt-2 border-t border-[var(--line-soft)] text-xs text-[var(--text-muted)]">
              <div>
                <span className="block text-[10px] text-[var(--text-muted)]">Çapraz Rezervasyon</span>
                <span className="text-[var(--text-2)] font-medium">{m.b2b.activeCrossBookingsCount} aktif</span>
              </div>
              <div>
                <span className="block text-[10px] text-[var(--text-muted)]">Açık Cari Alacak</span>
                <span className="text-[var(--brand)] font-medium">₺{m.b2b.openReceivableTry.toLocaleString("tr-TR")}</span>
              </div>
            </div>
            <Link
              href="/dashboard/partner-agi"
              className="mt-2 block text-center rounded-lg bg-[var(--muted-bg)] py-1.5 text-xs text-[var(--text-2)] hover:bg-[var(--brand-soft)] hover:text-[var(--brand)] transition-colors"
            >
              Partner Ağı &amp; Mutabakata Git →
            </Link>
          </div>
        )}
      </div>

      {/* HIZLI BAĞLANTILAR VE OPERASYON REHBERİ */}
      <div className="rounded-2xl border border-[var(--line)] bg-[var(--bg)] p-6 space-y-4 shadow-sm">
        <h2 className="text-sm font-semibold text-[var(--text)]">Entegre Sektörel Modül Kısayolları</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-3">
          <Link
            href="/dashboard/arac-kiralama"
            className="flex items-start gap-3 rounded-xl border border-[var(--line)] bg-[var(--page)] p-3.5 hover:border-[var(--brand-line)] hover:bg-[var(--brand-soft)] transition"
          >
            <Compass className="h-5 w-5 text-[var(--brand)] shrink-0 mt-0.5" />
            <div>
              <div className="text-xs font-semibold text-[var(--text)]">Araç Kiralama</div>
              <p className="text-[11px] text-[var(--text-muted)] mt-0.5">Müsaitlik Gantt, sözleşme, teslim/iade ve KABİS hazırlığı.</p>
            </div>
          </Link>

          <Link
            href="/dashboard/otel"
            className="flex items-start gap-3 rounded-xl border border-[var(--line)] bg-[var(--page)] p-3.5 hover:border-[var(--brand-line)] hover:bg-[var(--brand-soft)] transition"
          >
            <Building2 className="h-5 w-5 text-[var(--brand)] shrink-0 mt-0.5" />
            <div>
              <div className="text-xs font-semibold text-[var(--text)]">Otel Mini PMS</div>
              <p className="text-[11px] text-[var(--text-muted)] mt-0.5">Kat planı, KBS kolluk bildirimi, folio ve housekeeping.</p>
            </div>
          </Link>

          <Link
            href="/dashboard/tur"
            className="flex items-start gap-3 rounded-xl border border-[var(--line)] bg-[var(--page)] p-3.5 hover:border-[var(--brand-line)] hover:bg-[var(--brand-soft)] transition"
          >
            <Compass className="h-5 w-5 text-[var(--brand)] shrink-0 mt-0.5" />
            <div>
              <div className="text-xs font-semibold text-[var(--text)]">Tur Operatörlüğü</div>
              <p className="text-[11px] text-[var(--text-muted)] mt-0.5">Koltuk planı, yolcu manifestosu, rehber ve kâr analizi.</p>
            </div>
          </Link>

          <Link
            href="/dashboard/partner-agi"
            className="flex items-start gap-3 rounded-xl border border-[var(--line)] bg-[var(--page)] p-3.5 hover:border-[var(--brand-line)] hover:bg-[var(--brand-soft)] transition"
          >
            <Globe className="h-5 w-5 text-[var(--brand)] shrink-0 mt-0.5" />
            <div>
              <div className="text-xs font-semibold text-[var(--text)]">B2B Partner Ağı</div>
              <p className="text-[11px] text-[var(--text-muted)] mt-0.5">Kaynak havuzu, çift taraflı cari, çakışma kilidi ve mutabakat.</p>
            </div>
          </Link>
        </div>
      </div>
    </div>
  )
}
