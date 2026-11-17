"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import {
  ArrowRight,
  BarChart3,
  PackageCheck,
  RotateCcw,
  ShoppingCart,
  Truck,
  Warehouse,
} from "lucide-react"
import type { LogisticsExecutiveSummaryResponse } from "@/lib/logistics/dashboard/logisticsSummaryService"

export function LogisticsExecutiveSummarySection({
  branchId,
}: {
  branchId?: string | null
}) {
  const [summary, setSummary] = useState<LogisticsExecutiveSummaryResponse | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let active = true
    async function load() {
      setLoading(true)
      try {
        const qs = branchId ? `?branchId=${encodeURIComponent(branchId)}` : ""
        const res = await fetch(`/api/logistics/dashboard-summary${qs}`)
        if (!res.ok) {
          if (active) setSummary(null)
          return
        }
        const json = (await res.json()) as LogisticsExecutiveSummaryResponse
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
      aria-label="Lojistik Yönetim Özeti"
      data-testid="logistics-executive-summary"
      className="bg-[#111513] border border-white/[0.06] rounded-[20px] p-6 space-y-4"
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-[11px] uppercase tracking-[0.12em] text-zinc-400 font-medium">
            Lojistik &amp; Tedarik Zinciri
          </p>
          <h2 className="text-lg font-light text-white tracking-tight mt-0.5 flex items-center gap-2">
            <PackageCheck className="w-4 h-4 text-emerald-400" />
            Lojistik Yönetim Özeti
          </h2>
        </div>

        {summary.canOpenReports && (
          <Link
            href="/dashboard/lojistik-raporlar"
            className="inline-flex items-center gap-1.5 bg-emerald-400/15 text-emerald-300 border border-emerald-500/25 hover:bg-emerald-400/25 text-xs h-8 px-3.5 rounded-full font-medium transition-colors"
          >
            <BarChart3 className="w-3.5 h-3.5" />
            Lojistik Raporları
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-5 gap-3">
        {modules.wms && (
          <Link
            href="/dashboard/wms"
            className="group bg-white/[0.02] hover:bg-white/[0.04] border border-white/[0.06] rounded-2xl p-4 transition-colors block"
          >
            <div className="flex items-center justify-between text-xs text-zinc-400">
              <span>Depo &amp; WMS</span>
              <Warehouse className="w-4 h-4 text-emerald-400" />
            </div>
            <div className="text-2xl font-light text-white tabular-nums mt-2">
              {modules.wms.totalOnHandQty.toLocaleString("tr-TR")}{" "}
              <span className="text-xs text-zinc-500">adet</span>
            </div>
            <div className="text-[11px] text-zinc-400 mt-1 flex items-center justify-between">
              <span>Stok değeri: ₺{modules.wms.inventoryValueTry.toLocaleString("tr-TR")}</span>
            </div>
            <div className="mt-2 pt-2 border-t border-white/[0.06] flex items-center justify-between text-[11px]">
              <span className="text-zinc-500">{modules.wms.warehouseCount} depo · %{modules.wms.occupancyRatePct} doluluk</span>
              {modules.wms.criticalStockCount > 0 ? (
                <span className="text-rose-400 font-medium">{modules.wms.criticalStockCount} kritik</span>
              ) : (
                <span className="text-emerald-400">Stok normal</span>
              )}
            </div>
          </Link>
        )}

        {modules.satinalma && (
          <Link
            href="/dashboard/satinalma"
            className="group bg-white/[0.02] hover:bg-white/[0.04] border border-white/[0.06] rounded-2xl p-4 transition-colors block"
          >
            <div className="flex items-center justify-between text-xs text-zinc-400">
              <span>Satınalma &amp; Tedarikçi</span>
              <ShoppingCart className="w-4 h-4 text-sky-400" />
            </div>
            <div className="text-2xl font-light text-white tabular-nums mt-2">
              {modules.satinalma.openPoCount}{" "}
              <span className="text-xs text-zinc-500">açık PO</span>
            </div>
            <div className="text-[11px] text-zinc-400 mt-1">
              Tutar: ₺{modules.satinalma.openPoAmountTry.toLocaleString("tr-TR")}
            </div>
            <div className="mt-2 pt-2 border-t border-white/[0.06] flex items-center justify-between text-[11px]">
              <span className="text-zinc-500">Skor: {modules.satinalma.avgSupplierScore}/100</span>
              {modules.satinalma.overduePoCount > 0 ? (
                <span className="text-amber-400 font-medium">{modules.satinalma.overduePoCount} geciken</span>
              ) : (
                <span className="text-emerald-400">Zamanında</span>
              )}
            </div>
          </Link>
        )}

        {modules.sevkiyat && (
          <Link
            href="/dashboard/sevkiyat"
            className="group bg-white/[0.02] hover:bg-white/[0.04] border border-white/[0.06] rounded-2xl p-4 transition-colors block"
          >
            <div className="flex items-center justify-between text-xs text-zinc-400">
              <span>Sevkiyat &amp; Rota</span>
              <Truck className="w-4 h-4 text-emerald-400" />
            </div>
            <div className="text-2xl font-light text-white tabular-nums mt-2">
              %{modules.sevkiyat.onTimeDeliveryRatePct}{" "}
              <span className="text-xs text-zinc-500">OTIF</span>
            </div>
            <div className="text-[11px] text-zinc-400 mt-1">
              {modules.sevkiyat.activeTripCount} aktif sefer · {modules.sevkiyat.deliveredStopsCount} teslimat
            </div>
            <div className="mt-2 pt-2 border-t border-white/[0.06] flex items-center justify-between text-[11px]">
              <span className="text-zinc-500">{modules.sevkiyat.draftEInvoiceCount} taslak E-Fatura</span>
              {modules.sevkiyat.maintenanceImpactedTripCount > 0 ? (
                <span className="text-amber-400 font-medium">
                  {modules.sevkiyat.maintenanceImpactedTripCount} bakım uyarılı
                </span>
              ) : (
                <span className="text-emerald-400">{modules.sevkiyat.issuedEInvoiceCount} kesildi</span>
              )}
            </div>
          </Link>
        )}

        {modules.filo && (
          <Link
            href="/dashboard/filo"
            className="group bg-white/[0.02] hover:bg-white/[0.04] border border-white/[0.06] rounded-2xl p-4 transition-colors block"
          >
            <div className="flex items-center justify-between text-xs text-zinc-400">
              <span>Araç &amp; Filo</span>
              <Truck className="w-4 h-4 text-amber-400" />
            </div>
            <div className="text-2xl font-light text-white tabular-nums mt-2">
              {modules.filo.totalVehicles}{" "}
              <span className="text-xs text-zinc-500">araç</span>
            </div>
            <div className="text-[11px] text-zinc-400 mt-1">
              Yakıt: ₺{modules.filo.totalFuelCostTry.toLocaleString("tr-TR")}
            </div>
            <div className="mt-2 pt-2 border-t border-white/[0.06] flex items-center justify-between text-[11px]">
              <span className="text-zinc-500">{modules.filo.expiringDocsCount} yaklaşan belge</span>
              {modules.filo.faultOrMaintVehicles > 0 ? (
                <span className="text-amber-400 font-medium">
                  {modules.filo.faultOrMaintVehicles} bakım/arıza
                </span>
              ) : (
                <span className="text-emerald-400">{modules.filo.activeVehicles} hazır</span>
              )}
            </div>
          </Link>
        )}

        {modules.iade && (
          <Link
            href="/dashboard/iade"
            className="group bg-white/[0.02] hover:bg-white/[0.04] border border-white/[0.06] rounded-2xl p-4 transition-colors block"
          >
            <div className="flex items-center justify-between text-xs text-zinc-400">
              <span>İade &amp; RMA</span>
              <RotateCcw className="w-4 h-4 text-rose-400" />
            </div>
            <div className="text-2xl font-light text-white tabular-nums mt-2">
              {modules.iade.openRmaCount}{" "}
              <span className="text-xs text-zinc-500">açık RMA</span>
            </div>
            <div className="text-[11px] text-zinc-400 mt-1">
              İade tutarı: ₺{modules.iade.totalRefundAmountTry.toLocaleString("tr-TR")}
            </div>
            <div className="mt-2 pt-2 border-t border-white/[0.06] flex items-center justify-between text-[11px]">
              <span className="text-zinc-500">{modules.iade.pendingQcCount} KK bekliyor</span>
              <span className="text-emerald-400">{modules.iade.completedRmaCount} tamamlandı</span>
            </div>
          </Link>
        )}
      </div>
    </section>
  )
}
