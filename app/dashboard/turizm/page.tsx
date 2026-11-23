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
    <div className="space-y-6 p-4 md:p-6 text-zinc-100">
      {/* BAŞLIK VE HIZLI EYLEMLER */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <Compass className="h-6 w-6 text-emerald-400" />
            <h1 className="text-xl font-bold tracking-tight text-white">
              Turizm &amp; Ağırlama Sektörel Yönetim Panosu
            </h1>
          </div>
          <p className="text-xs text-zinc-400 mt-1">
            Araç kiralama, otel PMS, tur operasyonu ve B2B partner ağının tek merkezden konsolide yönetimi.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <Link
            href="/dashboard/turizm/raporlar"
            className="inline-flex items-center gap-1.5 rounded-lg border border-emerald-500/40 bg-emerald-500/10 px-3.5 py-2 text-xs font-medium text-emerald-300 hover:bg-emerald-500/20 transition-colors"
          >
            <BarChart3 className="h-4 w-4" />
            Konsolide Raporlar
          </Link>
          <button
            type="button"
            disabled={loading}
            onClick={loadData}
            className="inline-flex items-center gap-1.5 rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-xs text-zinc-300 hover:bg-zinc-800"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
            Yenile
          </button>
        </div>
      </div>

      {/* SEKTÖR SEÇİCİ SEKMELER */}
      <div className="flex flex-wrap gap-2 border-b border-zinc-800 pb-3">
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
            className={`inline-flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-medium transition ${
              activeTab === key
                ? "bg-emerald-600 text-white shadow-sm"
                : "bg-zinc-900/60 text-zinc-400 hover:bg-zinc-800 hover:text-zinc-200"
            }`}
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
          <div className="rounded-2xl border border-zinc-800 bg-[#111513] p-5 space-y-3">
            <div className="flex items-center justify-between text-xs text-zinc-400">
              <span className="font-semibold text-emerald-400">Rent-a-Car Operasyonu</span>
              <Compass className="h-4 w-4 text-emerald-400" />
            </div>
            <div className="text-3xl font-light text-white tracking-tight">
              {m.rentacar.activeRentalsCount}{" "}
              <span className="text-xs text-zinc-500 font-normal">aktif kiralama</span>
            </div>
            <div className="grid grid-cols-2 gap-2 pt-2 border-t border-zinc-800/80 text-xs text-zinc-400">
              <div>
                <span className="block text-[10px] text-zinc-500">Müsait Araç</span>
                <span className="text-zinc-200 font-medium">{m.rentacar.availableVehiclesCount} araç</span>
              </div>
              <div>
                <span className="block text-[10px] text-zinc-500">Aylık Hacim</span>
                <span className="text-emerald-400 font-medium">₺{m.rentacar.monthlyRevenueTry.toLocaleString("tr-TR")}</span>
              </div>
            </div>
            <Link
              href="/dashboard/arac-kiralama"
              className="mt-2 block text-center rounded-lg bg-white/[0.04] py-1.5 text-xs text-zinc-300 hover:bg-white/[0.08]"
            >
              Kiralama Yönetimine Git →
            </Link>
          </div>
        )}

        {/* OTEL PMS KART */}
        {(activeTab === "all" || activeTab === "hotel") && m?.hotel && (
          <div className="rounded-2xl border border-zinc-800 bg-[#111513] p-5 space-y-3">
            <div className="flex items-center justify-between text-xs text-zinc-400">
              <span className="font-semibold text-sky-400">Otel &amp; Konaklama (Mini PMS)</span>
              <Building2 className="h-4 w-4 text-sky-400" />
            </div>
            <div className="text-3xl font-light text-white tracking-tight">
              %{m.hotel.occupancyRatePct}{" "}
              <span className="text-xs text-zinc-500 font-normal">oda doluluğu</span>
            </div>
            <div className="grid grid-cols-2 gap-2 pt-2 border-t border-zinc-800/80 text-xs text-zinc-400">
              <div>
                <span className="block text-[10px] text-zinc-500">Giriş / Çıkış</span>
                <span className="text-zinc-200 font-medium">{m.hotel.todayCheckInsCount} / {m.hotel.todayCheckOutsCount}</span>
              </div>
              <div>
                <span className="block text-[10px] text-zinc-500">Açık Folyo</span>
                <span className="text-amber-400 font-medium">₺{m.hotel.openFoliosBalanceTry.toLocaleString("tr-TR")}</span>
              </div>
            </div>
            <Link
              href="/dashboard/otel"
              className="mt-2 block text-center rounded-lg bg-white/[0.04] py-1.5 text-xs text-zinc-300 hover:bg-white/[0.08]"
            >
              Ön Büro &amp; Odalara Git →
            </Link>
          </div>
        )}

        {/* TUR OPERATÖRLÜĞÜ KART */}
        {(activeTab === "all" || activeTab === "tour") && m?.tour && (
          <div className="rounded-2xl border border-zinc-800 bg-[#111513] p-5 space-y-3">
            <div className="flex items-center justify-between text-xs text-zinc-400">
              <span className="font-semibold text-purple-400">Tur Operasyonları</span>
              <Compass className="h-4 w-4 text-purple-400" />
            </div>
            <div className="text-3xl font-light text-white tracking-tight">
              {m.tour.upcomingToursCount}{" "}
              <span className="text-xs text-zinc-500 font-normal">yaklaşan tur</span>
            </div>
            <div className="grid grid-cols-2 gap-2 pt-2 border-t border-zinc-800/80 text-xs text-zinc-400">
              <div>
                <span className="block text-[10px] text-zinc-500">Kayıtlı Yolcu</span>
                <span className="text-zinc-200 font-medium">{m.tour.totalPassengersCount} yolcu</span>
              </div>
              <div>
                <span className="block text-[10px] text-zinc-500">Ortalama Kâr</span>
                <span className="text-purple-400 font-medium">%{m.tour.averageProfitMarginPct} marj</span>
              </div>
            </div>
            <Link
              href="/dashboard/tur"
              className="mt-2 block text-center rounded-lg bg-white/[0.04] py-1.5 text-xs text-zinc-300 hover:bg-white/[0.08]"
            >
              Tur Takvimi &amp; Manifestoya Git →
            </Link>
          </div>
        )}

        {/* B2B PARTNER AĞI KART */}
        {(activeTab === "all" || activeTab === "b2b") && m?.b2b && (
          <div className="rounded-2xl border border-zinc-800 bg-[#111513] p-5 space-y-3">
            <div className="flex items-center justify-between text-xs text-zinc-400">
              <span className="font-semibold text-teal-400">B2B Partner Ekosistemi</span>
              <Globe className="h-4 w-4 text-teal-400" />
            </div>
            <div className="text-3xl font-light text-white tracking-tight">
              {m.b2b.approvedPartnersCount}{" "}
              <span className="text-xs text-zinc-500 font-normal">onaylı partner</span>
            </div>
            <div className="grid grid-cols-2 gap-2 pt-2 border-t border-zinc-800/80 text-xs text-zinc-400">
              <div>
                <span className="block text-[10px] text-zinc-500">Çapraz Rezervasyon</span>
                <span className="text-zinc-200 font-medium">{m.b2b.activeCrossBookingsCount} aktif</span>
              </div>
              <div>
                <span className="block text-[10px] text-zinc-500">Açık Cari Alacak</span>
                <span className="text-teal-400 font-medium">₺{m.b2b.openReceivableTry.toLocaleString("tr-TR")}</span>
              </div>
            </div>
            <Link
              href="/dashboard/partner-agi"
              className="mt-2 block text-center rounded-lg bg-white/[0.04] py-1.5 text-xs text-zinc-300 hover:bg-white/[0.08]"
            >
              Partner Ağı &amp; Mutabakata Git →
            </Link>
          </div>
        )}
      </div>

      {/* HIZLI BAĞLANTILAR VE OPERASYON REHBERİ */}
      <div className="rounded-2xl border border-zinc-800 bg-[#111513] p-6 space-y-4">
        <h2 className="text-sm font-semibold text-zinc-200">Entegre Sektörel Modül Kısayolları</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-3">
          <Link
            href="/dashboard/arac-kiralama"
            className="flex items-start gap-3 rounded-xl border border-zinc-800/80 bg-zinc-900/60 p-3.5 hover:border-emerald-500/40 transition"
          >
            <Compass className="h-5 w-5 text-emerald-400 shrink-0 mt-0.5" />
            <div>
              <div className="text-xs font-semibold text-zinc-100">Araç Kiralama</div>
              <p className="text-[11px] text-zinc-400 mt-0.5">Müsaitlik Gantt, sözleşme, teslim/iade ve KABİS hazırlığı.</p>
            </div>
          </Link>

          <Link
            href="/dashboard/otel"
            className="flex items-start gap-3 rounded-xl border border-zinc-800/80 bg-zinc-900/60 p-3.5 hover:border-sky-500/40 transition"
          >
            <Building2 className="h-5 w-5 text-sky-400 shrink-0 mt-0.5" />
            <div>
              <div className="text-xs font-semibold text-zinc-100">Otel Mini PMS</div>
              <p className="text-[11px] text-zinc-400 mt-0.5">Kat planı, KBS kolluk bildirimi, folio ve housekeeping.</p>
            </div>
          </Link>

          <Link
            href="/dashboard/tur"
            className="flex items-start gap-3 rounded-xl border border-zinc-800/80 bg-zinc-900/60 p-3.5 hover:border-purple-500/40 transition"
          >
            <Compass className="h-5 w-5 text-purple-400 shrink-0 mt-0.5" />
            <div>
              <div className="text-xs font-semibold text-zinc-100">Tur Operatörlüğü</div>
              <p className="text-[11px] text-zinc-400 mt-0.5">Koltuk planı, yolcu manifestosu, rehber ve kâr analizi.</p>
            </div>
          </Link>

          <Link
            href="/dashboard/partner-agi"
            className="flex items-start gap-3 rounded-xl border border-zinc-800/80 bg-zinc-900/60 p-3.5 hover:border-teal-500/40 transition"
          >
            <Globe className="h-5 w-5 text-teal-400 shrink-0 mt-0.5" />
            <div>
              <div className="text-xs font-semibold text-zinc-100">B2B Partner Ağı</div>
              <p className="text-[11px] text-zinc-400 mt-0.5">Kaynak havuzu, çift taraflı cari, çakışma kilidi ve mutabakat.</p>
            </div>
          </Link>
        </div>
      </div>
    </div>
  )
}
