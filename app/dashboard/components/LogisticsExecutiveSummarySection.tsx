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
import { safeNumber, safeText } from "@/lib/utils/safe-display"

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
      className="bg-white/80 backdrop-blur-xl border border-[--line] rounded-[20px] p-6 shadow-sm space-y-4"
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-[11px] uppercase tracking-[0.12em] text-[--text-muted] font-medium">
            Lojistik &amp; Tedarik Zinciri
          </p>
          <h2 className="text-lg font-semibold text-[--navy] tracking-tight mt-0.5 flex items-center gap-2">
            <PackageCheck className="w-5 h-5 text-[--brand]" />
            Lojistik Yönetim Özeti
          </h2>
        </div>

        {summary.canOpenReports && (
          <Link
            href="/dashboard/lojistik-raporlar"
            className="inline-flex items-center gap-1.5 bg-[--brand-soft] text-[--brand] border border-[--brand-line] hover:bg-[--brand-soft]/80 text-xs h-8 px-3.5 rounded-full font-medium transition-colors shadow-xs"
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
            className="group bg-white hover:bg-[--brand-soft]/30 border border-[--line] rounded-2xl p-4 transition-all block shadow-xs"
          >
            <div className="flex items-center justify-between text-xs text-[--text-muted]">
              <span>Depo &amp; WMS</span>
              <Warehouse className="w-4 h-4 text-[--brand]" />
            </div>
            <div className="text-2xl font-light text-[--text] tabular-nums mt-2">
              {safeNumber(modules.wms.totalOnHandQty, 0).toLocaleString("tr-TR")}{" "}
              <span className="text-xs text-[--text-muted]">adet</span>
            </div>
            <div className="text-[11px] text-[--text-muted] mt-1 flex items-center justify-between">
              <span>Stok değeri: ₺{safeNumber(modules.wms.inventoryValueTry, 0).toLocaleString("tr-TR")}</span>
            </div>
            <div className="mt-2 pt-2 border-t border-[--line] flex items-center justify-between text-[11px]">
              <span className="text-[--text-muted]">{modules.wms.warehouseCount} depo · %{modules.wms.occupancyRatePct} doluluk</span>
              {modules.wms.criticalStockCount > 0 ? (
                <span className="text-[--bad] font-medium">{modules.wms.criticalStockCount} kritik</span>
              ) : (
                <span className="text-[--ok] font-medium">Stok normal</span>
              )}
            </div>
          </Link>
        )}

        {modules.satinalma && (
          <Link
            href="/dashboard/satinalma"
            className="group bg-white hover:bg-[--brand-soft]/30 border border-[--line] rounded-2xl p-4 transition-all block shadow-xs"
          >
            <div className="flex items-center justify-between text-xs text-[--text-muted]">
              <span>Satınalma &amp; Tedarikçi</span>
              <ShoppingCart className="w-4 h-4 text-[--sky]" />
            </div>
            <div className="text-2xl font-light text-[--text] tabular-nums mt-2">
              {safeNumber(modules.satinalma.openPoCount, 0)}{" "}
              <span className="text-xs text-[--text-muted]">açık PO</span>
            </div>
            <div className="text-[11px] text-[--text-muted] mt-1">
              Tutar: ₺{safeNumber(modules.satinalma.openPoAmountTry, 0).toLocaleString("tr-TR")}
            </div>
            <div className="mt-2 pt-2 border-t border-[--line] flex items-center justify-between text-[11px]">
              <span className="text-[--text-muted]">Skor: {modules.satinalma.avgSupplierScore}/100</span>
              {modules.satinalma.overduePoCount > 0 ? (
                <span className="text-[--warn] font-medium">{modules.satinalma.overduePoCount} geciken</span>
              ) : (
                <span className="text-[--ok] font-medium">Zamanında</span>
              )}
            </div>
          </Link>
        )}

        {modules.sevkiyat && (
          <Link
            href="/dashboard/sevkiyat"
            className="group bg-white hover:bg-[--brand-soft]/30 border border-[--line] rounded-2xl p-4 transition-all block shadow-xs"
          >
            <div className="flex items-center justify-between text-xs text-[--text-muted]">
              <span>Sevkiyat &amp; Rota</span>
              <Truck className="w-4 h-4 text-[--brand]" />
            </div>
            <div className="text-2xl font-light text-[--text] tabular-nums mt-2">
              %{safeNumber(modules.sevkiyat.onTimeDeliveryRatePct, 0)}{" "}
              <span className="text-xs text-[--text-muted]">OTIF</span>
            </div>
            <div className="text-[11px] text-[--text-muted] mt-1">
              {modules.sevkiyat.activeTripCount} aktif sefer · {modules.sevkiyat.deliveredStopsCount} teslimat
            </div>
            <div className="mt-2 pt-2 border-t border-[--line] flex items-center justify-between text-[11px]">
              <span className="text-[--text-muted]">{modules.sevkiyat.draftEInvoiceCount} taslak E-Fatura</span>
              {modules.sevkiyat.maintenanceImpactedTripCount > 0 ? (
                <span className="text-[--warn] font-medium">
                  {modules.sevkiyat.maintenanceImpactedTripCount} bakım uyarılı
                </span>
              ) : (
                <span className="text-[--ok] font-medium">{modules.sevkiyat.issuedEInvoiceCount} kesildi</span>
              )}
            </div>
          </Link>
        )}

        {modules.filo && (
          <Link
            href="/dashboard/filo"
            className="group bg-white hover:bg-[--brand-soft]/30 border border-[--line] rounded-2xl p-4 transition-all block shadow-xs"
          >
            <div className="flex items-center justify-between text-xs text-[--text-muted]">
              <span>Araç &amp; Filo</span>
              <Truck className="w-4 h-4 text-[--navy]" />
            </div>
            <div className="text-2xl font-light text-[--text] tabular-nums mt-2">
              {safeNumber(modules.filo.totalVehicles, 0)}{" "}
              <span className="text-xs text-[--text-muted]">araç</span>
            </div>
            <div className="text-[11px] text-[--text-muted] mt-1">
              Yakıt: ₺{safeNumber(modules.filo.totalFuelCostTry, 0).toLocaleString("tr-TR")}
            </div>
            <div className="mt-2 pt-2 border-t border-[--line] flex items-center justify-between text-[11px]">
              <span className="text-[--text-muted]">{modules.filo.expiringDocsCount} yaklaşan belge</span>
              {modules.filo.faultOrMaintVehicles > 0 ? (
                <span className="text-[--warn] font-medium">
                  {modules.filo.faultOrMaintVehicles} bakım/arıza
                </span>
              ) : (
                <span className="text-[--ok] font-medium">{modules.filo.activeVehicles} hazır</span>
              )}
            </div>
          </Link>
        )}

        {modules.iade && (
          <Link
            href="/dashboard/omnichannel?tab=rma"
            className="group bg-white hover:bg-[--brand-soft]/30 border border-[--line] rounded-2xl p-4 transition-all block shadow-xs"
          >
            <div className="flex items-center justify-between text-xs text-[--text-muted]">
              <span>İade &amp; RMA</span>
              <RotateCcw className="w-4 h-4 text-[--bad]" />
            </div>
            <div className="text-2xl font-light text-[--text] tabular-nums mt-2">
              {safeNumber(modules.iade.openRmaCount, 0)}{" "}
              <span className="text-xs text-[--text-muted]">açık RMA</span>
            </div>
            <div className="text-[11px] text-[--text-muted] mt-1">
              İade tutarı: ₺{safeNumber(modules.iade.totalRefundAmountTry, 0).toLocaleString("tr-TR")}
            </div>
            <div className="mt-2 pt-2 border-t border-[--line] flex items-center justify-between text-[11px]">
              <span className="text-[--text-muted]">{modules.iade.pendingQcCount} KK bekliyor</span>
              <span className="text-[--ok] font-medium">{modules.iade.completedRmaCount} tamamlandı</span>
            </div>
          </Link>
        )}
      </div>
    </section>
  )
}
