"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import {
  ArrowRight,
  BarChart3,
  Building2,
  CalendarDays,
  Compass,
  FileSpreadsheet,
  Globe,
  ShieldCheck,
  Users,
} from "lucide-react"
import type { TourismExecutiveSummaryResponse } from "@/lib/tourism/dashboard/tourismSummaryService"

export function TourismExecutiveSummarySection({
  branchId,
}: {
  branchId?: string | null
}) {
  const [summary, setSummary] = useState<TourismExecutiveSummaryResponse | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let active = true
    async function load() {
      setLoading(true)
      try {
        const qs = branchId ? `?branchId=${encodeURIComponent(branchId)}` : ""
        const res = await fetch(`/api/turizm/dashboard-summary${qs}`)
        if (!res.ok) {
          if (active) setSummary(null)
          return
        }
        const json = (await res.json()) as TourismExecutiveSummaryResponse
        if (active) setSummary(json)
      } catch {
        if (active) setSummary(null)
      } finally {
        if (active) setLoading(false)
      }
    }
    load()
    return () => {
      active = false
    }
  }, [branchId])

  if (loading || !summary || summary.permittedModules.length === 0) {
    return null
  }

  const { modules } = summary

  return (
    <section
      aria-label="Turizm ve Ağırlama Yönetim Özeti"
      data-testid="tourism-executive-summary"
      className="bg-[#111513] border border-white/[0.06] rounded-[20px] p-6 space-y-4"
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-[11px] uppercase tracking-[0.12em] text-zinc-400 font-medium">
            Turizm, Konaklama &amp; Partner Ekosistemi
          </p>
          <h2 className="text-lg font-light text-white tracking-tight mt-0.5 flex items-center gap-2">
            <Compass className="w-4 h-4 text-emerald-400" />
            Sektörel Yönetim Panosu
          </h2>
        </div>

        <div className="flex items-center gap-2">
          <Link
            href="/dashboard/turizm"
            className="inline-flex items-center gap-1.5 bg-white/[0.05] text-zinc-200 border border-white/[0.1] hover:bg-white/[0.1] text-xs h-8 px-3 rounded-full font-medium transition-colors"
          >
            Sektör Detay Panosu
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
          <Link
            href="/dashboard/turizm/raporlar"
            className="inline-flex items-center gap-1.5 bg-emerald-400/15 text-emerald-300 border border-emerald-500/25 hover:bg-emerald-400/25 text-xs h-8 px-3.5 rounded-full font-medium transition-colors"
          >
            <BarChart3 className="w-3.5 h-3.5" />
            Birleşik Turizm Raporları
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-3">
        {modules.rentacar && (
          <Link
            href="/dashboard/arac-kiralama"
            className="group bg-white/[0.02] hover:bg-white/[0.04] border border-white/[0.06] rounded-2xl p-4 transition-colors block"
          >
            <div className="flex items-center justify-between text-xs text-zinc-400">
              <span>Araç Kiralama (Rent-a-Car)</span>
              <Compass className="w-4 h-4 text-emerald-400" />
            </div>
            <div className="text-2xl font-light text-white tabular-nums mt-2">
              {modules.rentacar.activeRentalsCount}{" "}
              <span className="text-xs text-zinc-500">aktif kiralama</span>
            </div>
            <div className="text-[11px] text-zinc-400 mt-2 flex items-center justify-between">
              <span>Filo Doluluğu: %{modules.rentacar.utilizationRatePct}</span>
              <span className="text-emerald-400 font-medium">₺{modules.rentacar.monthlyRevenueTry.toLocaleString("tr-TR")}</span>
            </div>
          </Link>
        )}

        {modules.hotel && (
          <Link
            href="/dashboard/otel"
            className="group bg-white/[0.02] hover:bg-white/[0.04] border border-white/[0.06] rounded-2xl p-4 transition-colors block"
          >
            <div className="flex items-center justify-between text-xs text-zinc-400">
              <span>Otel Yönetimi (Mini PMS)</span>
              <Building2 className="w-4 h-4 text-sky-400" />
            </div>
            <div className="text-2xl font-light text-white tabular-nums mt-2">
              %{modules.hotel.occupancyRatePct}{" "}
              <span className="text-xs text-zinc-500">oda doluluğu</span>
            </div>
            <div className="text-[11px] text-zinc-400 mt-2 flex items-center justify-between">
              <span>Giriş/Çıkış: {modules.hotel.todayCheckInsCount} / {modules.hotel.todayCheckOutsCount}</span>
              <span className="text-amber-400">{modules.hotel.dirtyRoomsCount} kirli oda</span>
            </div>
          </Link>
        )}

        {modules.tour && (
          <Link
            href="/dashboard/tur"
            className="group bg-white/[0.02] hover:bg-white/[0.04] border border-white/[0.06] rounded-2xl p-4 transition-colors block"
          >
            <div className="flex items-center justify-between text-xs text-zinc-400">
              <span>Tur Operatörlüğü</span>
              <Compass className="w-4 h-4 text-purple-400" />
            </div>
            <div className="text-2xl font-light text-white tabular-nums mt-2">
              {modules.tour.upcomingToursCount}{" "}
              <span className="text-xs text-zinc-500">yaklaşan tur</span>
            </div>
            <div className="text-[11px] text-zinc-400 mt-2 flex items-center justify-between">
              <span>Kayıtlı Yolcu: {modules.tour.totalPassengersCount}</span>
              <span className="text-purple-400">{modules.tour.activeGuidesCount} rehber</span>
            </div>
          </Link>
        )}

        {modules.b2b && (
          <Link
            href="/dashboard/partner-agi"
            className="group bg-white/[0.02] hover:bg-white/[0.04] border border-white/[0.06] rounded-2xl p-4 transition-colors block"
          >
            <div className="flex items-center justify-between text-xs text-zinc-400">
              <span>B2B Partner Ağı</span>
              <Globe className="w-4 h-4 text-teal-400" />
            </div>
            <div className="text-2xl font-light text-white tabular-nums mt-2">
              {modules.b2b.approvedPartnersCount}{" "}
              <span className="text-xs text-zinc-500">onaylı partner</span>
            </div>
            <div className="text-[11px] text-zinc-400 mt-2 flex items-center justify-between">
              <span>Çapraz Rez: {modules.b2b.activeCrossBookingsCount}</span>
              <span className="text-emerald-400 font-medium">₺{modules.b2b.openReceivableTry.toLocaleString("tr-TR")} alacak</span>
            </div>
          </Link>
        )}
      </div>
    </section>
  )
}
