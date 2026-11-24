"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import {
  ArrowRight,
  BarChart3,
  Building2,
  Compass,
  Globe,
} from "lucide-react"
import type { TourismExecutiveSummaryResponse } from "@/lib/tourism/dashboard/tourismSummaryService"
import { safeNumber } from "@/lib/utils/safe-display"

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
      className="bg-white/80 backdrop-blur-xl border border-[--line] rounded-[20px] p-6 shadow-sm space-y-4"
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-[11px] uppercase tracking-[0.12em] text-[--text-muted] font-medium">
            Turizm, Konaklama &amp; Partner Ekosistemi
          </p>
          <h2 className="text-lg font-semibold text-[--navy] tracking-tight mt-0.5 flex items-center gap-2">
            <Compass className="w-5 h-5 text-[--brand]" />
            Sektörel Yönetim Panosu
          </h2>
        </div>

        <div className="flex items-center gap-2">
          <Link
            href="/dashboard/turizm"
            className="inline-flex items-center gap-1.5 bg-white text-[--text-2] border border-[--line] hover:bg-[--muted-bg] text-xs h-8 px-3 rounded-full font-medium transition-colors shadow-xs"
          >
            Sektör Detay Panosu
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
          <Link
            href="/dashboard/turizm/raporlar"
            className="inline-flex items-center gap-1.5 bg-[--brand-soft] text-[--brand] border border-[--brand-line] hover:bg-[--brand-soft]/80 text-xs h-8 px-3.5 rounded-full font-medium transition-colors shadow-xs"
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
            className="group bg-white hover:bg-[--brand-soft]/30 border border-[--line] rounded-2xl p-4 transition-all block shadow-xs"
          >
            <div className="flex items-center justify-between text-xs text-[--text-muted]">
              <span>Araç Kiralama (Rent-a-Car)</span>
              <Compass className="w-4 h-4 text-[--brand]" />
            </div>
            <div className="text-2xl font-light text-[--text] tabular-nums mt-2">
              {safeNumber(modules.rentacar.activeRentalsCount, 0)}{" "}
              <span className="text-xs text-[--text-muted]">aktif kiralama</span>
            </div>
            <div className="text-[11px] text-[--text-muted] mt-2 flex items-center justify-between">
              <span>Filo Doluluğu: %{modules.rentacar.utilizationRatePct}</span>
              <span className="text-[--ok] font-semibold">₺{safeNumber(modules.rentacar.monthlyRevenueTry, 0).toLocaleString("tr-TR")}</span>
            </div>
          </Link>
        )}

        {modules.hotel && (
          <Link
            href="/dashboard/otel"
            className="group bg-white hover:bg-[--brand-soft]/30 border border-[--line] rounded-2xl p-4 transition-all block shadow-xs"
          >
            <div className="flex items-center justify-between text-xs text-[--text-muted]">
              <span>Otel Yönetimi (Mini PMS)</span>
              <Building2 className="w-4 h-4 text-[--sky]" />
            </div>
            <div className="text-2xl font-light text-[--text] tabular-nums mt-2">
              %{safeNumber(modules.hotel.occupancyRatePct, 0)}{" "}
              <span className="text-xs text-[--text-muted]">oda doluluğu</span>
            </div>
            <div className="text-[11px] text-[--text-muted] mt-2 flex items-center justify-between">
              <span>Giriş/Çıkış: {modules.hotel.todayCheckInsCount} / {modules.hotel.todayCheckOutsCount}</span>
              <span className="text-[--warn] font-medium">{modules.hotel.dirtyRoomsCount} kirli oda</span>
            </div>
          </Link>
        )}

        {modules.tour && (
          <Link
            href="/dashboard/tur"
            className="group bg-white hover:bg-[--brand-soft]/30 border border-[--line] rounded-2xl p-4 transition-all block shadow-xs"
          >
            <div className="flex items-center justify-between text-xs text-[--text-muted]">
              <span>Tur Operatörlüğü</span>
              <Compass className="w-4 h-4 text-[--navy]" />
            </div>
            <div className="text-2xl font-light text-[--text] tabular-nums mt-2">
              {safeNumber(modules.tour.upcomingToursCount, 0)}{" "}
              <span className="text-xs text-[--text-muted]">yaklaşan tur</span>
            </div>
            <div className="text-[11px] text-[--text-muted] mt-2 flex items-center justify-between">
              <span>Kayıtlı Yolcu: {modules.tour.totalPassengersCount}</span>
              <span className="text-[--text-2] font-medium">{modules.tour.activeGuidesCount} rehber</span>
            </div>
          </Link>
        )}

        {modules.b2b && (
          <Link
            href="/dashboard/partner-agi"
            className="group bg-white hover:bg-[--brand-soft]/30 border border-[--line] rounded-2xl p-4 transition-all block shadow-xs"
          >
            <div className="flex items-center justify-between text-xs text-[--text-muted]">
              <span>B2B Partner Ağı</span>
              <Globe className="w-4 h-4 text-[--brand]" />
            </div>
            <div className="text-2xl font-light text-[--text] tabular-nums mt-2">
              {safeNumber(modules.b2b.approvedPartnersCount, 0)}{" "}
              <span className="text-xs text-[--text-muted]">onaylı partner</span>
            </div>
            <div className="text-[11px] text-[--text-muted] mt-2 flex items-center justify-between">
              <span>Çapraz Rez: {modules.b2b.activeCrossBookingsCount}</span>
              <span className="text-[--ok] font-semibold">₺{safeNumber(modules.b2b.openReceivableTry, 0).toLocaleString("tr-TR")} alacak</span>
            </div>
          </Link>
        )}
      </div>
    </section>
  )
}
