"use client"

import React, { Suspense, useCallback, useEffect, useState } from "react"
import Link from "next/link"
import { useSearchParams } from "next/navigation"
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts"
import {
  ArrowRight,
  BarChart3,
  Download,
  FileSpreadsheet,
  FileText,
  RefreshCw,
  ShieldAlert,
} from "lucide-react"
import { toast } from "sonner"
import { useAuth } from "@/lib/auth/context"
import {
  formatReportCellValue,
  formatReportDateTr,
  type LogisticsReportFilters,
  type LogisticsReportModuleDefinition,
  type LogisticsReportModuleKey,
  type LogisticsReportPayload,
} from "@/lib/logistics/reports/constantsAndHelpers"
import {
  downloadLogisticsReportExcel,
  downloadLogisticsReportPdf,
} from "@/lib/logistics/reports/exportReports"

function LojistikRaporlarContent() {
  const { currentBranch } = useAuth()
  const searchParams = useSearchParams()
  const initialModule = searchParams.get("module") as LogisticsReportModuleKey | null

  const [availableModules, setAvailableModules] = useState<LogisticsReportModuleDefinition[]>([])
  const [selectedModule, setSelectedModule] = useState<LogisticsReportModuleKey | null>(
    initialModule
  )
  const [report, setReport] = useState<LogisticsReportPayload | null>(null)
  const [filters, setFilters] = useState<LogisticsReportFilters>({})
  const [loading, setLoading] = useState(true)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  const fetchReport = useCallback(
    async (
      modOverride?: LogisticsReportModuleKey | null,
      filtersOverride?: LogisticsReportFilters
    ) => {
      setLoading(true)
      setErrorMessage(null)
      try {
        const params = new URLSearchParams()
        if (currentBranch?.id) params.set("branchId", currentBranch.id)
        const targetMod = modOverride !== undefined ? modOverride : selectedModule
        if (targetMod) params.set("module", targetMod)

        const activeFilters = filtersOverride ?? filters
        if (activeFilters.dateFrom) params.set("dateFrom", activeFilters.dateFrom)
        if (activeFilters.dateTo) params.set("dateTo", activeFilters.dateTo)
        if (activeFilters.warehouseId) params.set("warehouseId", activeFilters.warehouseId)
        if (activeFilters.vehicleId) params.set("vehicleId", activeFilters.vehicleId)
        if (activeFilters.supplierId) params.set("supplierId", activeFilters.supplierId)
        if (activeFilters.channelCode) params.set("channelCode", activeFilters.channelCode)

        const res = await fetch(`/api/logistics/reports?${params.toString()}`)
        const json = await res.json().catch(() => ({}))

        if (Array.isArray(json.availableModules)) {
          setAvailableModules(json.availableModules)
        }

        if (!res.ok) {
          setReport(null)
          setErrorMessage(
            json.error || "Rapor verilerine erişim yetkiniz bulunmuyor."
          )
          return
        }

        if (json.activeReport) {
          setReport(json.activeReport)
          setSelectedModule(json.activeReport.moduleKey)
        }
      } catch {
        setErrorMessage("Lojistik raporu yüklenirken bağlantı hatası oluştu.")
      } finally {
        setLoading(false)
      }
    },
    [currentBranch?.id, selectedModule, filters]
  )

  useEffect(() => {
    fetchReport(initialModule, {})
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentBranch?.id])

  const handleModuleSwitch = (modKey: LogisticsReportModuleKey) => {
    const cleanFilters: LogisticsReportFilters = {
      dateFrom: filters.dateFrom,
      dateTo: filters.dateTo,
    }
    setFilters(cleanFilters)
    setSelectedModule(modKey)
    fetchReport(modKey, cleanFilters)
  }

  const handleFilterChange = (patch: Partial<LogisticsReportFilters>) => {
    const next = { ...filters, ...patch }
    setFilters(next)
    fetchReport(selectedModule, next)
  }

  const handleResetFilters = () => {
    setFilters({})
    fetchReport(selectedModule, {})
  }

  const activeDef = availableModules.find((m) => m.key === selectedModule)

  return (
    <div className="p-4 sm:p-6 max-w-7xl mx-auto space-y-6">
      {/* Üst Başlık & Dışa Aktarma Aksiyonları */}
      <div className="bg-[#111513] border border-white/[0.06] rounded-[20px] p-6 flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-[11px] uppercase tracking-[0.12em] text-zinc-400 font-medium">
            Lojistik &amp; Tedarik Zinciri Analitiği
          </p>
          <h1 className="text-2xl font-light text-white tracking-tight mt-1 flex items-center gap-2.5">
            <BarChart3 className="w-6 h-6 text-emerald-400" />
            Lojistik Raporları
          </h1>
          <p className="text-xs text-zinc-400 mt-1">
            Yalnızca erişim yetkiniz bulunan ve sistem bayrağı etkin modüllerin canlı veritabanı raporlarını görüntüleyin, Excel veya PDF olarak indirin.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => fetchReport()}
            disabled={loading}
            className="inline-flex items-center gap-1.5 h-9 px-3.5 rounded-full bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.08] text-xs text-zinc-200 transition-colors cursor-pointer disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
            Yenile
          </button>

          <button
            type="button"
            disabled={!report || loading}
            onClick={() => {
              if (!report) return
              downloadLogisticsReportExcel(report)
              toast.success("Excel (.xlsx) raporu indirildi.")
            }}
            className="inline-flex items-center gap-1.5 h-9 px-4 rounded-full bg-emerald-500/15 hover:bg-emerald-500/25 border border-emerald-500/30 text-xs font-medium text-emerald-300 transition-colors cursor-pointer disabled:opacity-40"
          >
            <FileSpreadsheet className="w-3.5 h-3.5" />
            Excel (.xlsx)
          </button>

          <button
            type="button"
            disabled={!report || loading}
            onClick={() => {
              if (!report) return
              downloadLogisticsReportPdf(report)
              toast.success("PDF raporu indirildi.")
            }}
            className="inline-flex items-center gap-1.5 h-9 px-4 rounded-full bg-sky-500/15 hover:bg-sky-500/25 border border-sky-500/30 text-xs font-medium text-sky-300 transition-colors cursor-pointer disabled:opacity-40"
          >
            <Download className="w-3.5 h-3.5" />
            PDF İndir
          </button>
        </div>
      </div>

      {/* Modül Seçici Sekmeler */}
      {availableModules.length > 0 && (
        <div
          className="flex flex-wrap items-center gap-2"
          role="tablist"
          aria-label="Lojistik Rapor Modülleri"
        >
          {availableModules.map((mod) => {
            const isSelected = mod.key === (report?.moduleKey || selectedModule)
            return (
              <button
                key={mod.key}
                type="button"
                role="tab"
                aria-selected={isSelected}
                onClick={() => handleModuleSwitch(mod.key)}
                className={`px-4 py-2 rounded-full text-xs font-medium border transition-colors cursor-pointer ${
                  isSelected
                    ? "bg-emerald-400/20 text-emerald-300 border-emerald-500/40"
                    : "bg-[#111513] text-zinc-400 hover:text-white border-white/[0.06]"
                }`}
              >
                {mod.shortTitle}
              </button>
            )
          })}

          {activeDef && (
            <Link
              href={activeDef.primaryHref}
              className="ml-auto inline-flex items-center gap-1 text-xs text-zinc-400 hover:text-emerald-300 transition-colors"
            >
              Modüle Git
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          )}
        </div>
      )}

      {/* Erişim Yetkisi Bilgilendirmesi */}
      {errorMessage && (
        <div className="bg-[#111513] border border-amber-500/30 rounded-[20px] p-8 flex flex-col items-center text-center gap-3">
          <ShieldAlert className="w-8 h-8 text-amber-400" />
          <p className="text-sm font-medium text-white">{errorMessage}</p>
          <p className="text-xs text-zinc-400 max-w-md">
            Bu raporları görüntülemek için hesabınızda en az bir lojistik okuma yetkisi bulunduğundan emin olun.
          </p>
        </div>
      )}

      {/* Rapor İçeriği */}
      {report && (
        <div className="space-y-6">
          {/* Filtre Çubuğu */}
          <div className="bg-[#111513] border border-white/[0.06] rounded-[20px] p-4 flex flex-wrap items-end gap-3">
            <div className="space-y-1">
              <label className="block text-[11px] text-zinc-400">Başlangıç Tarihi</label>
              <input
                type="date"
                value={filters.dateFrom || ""}
                onChange={(e) => handleFilterChange({ dateFrom: e.target.value || undefined })}
                className="bg-[#0B0F0D] border border-white/[0.1] rounded-xl px-3 py-1.5 text-xs text-white"
              />
            </div>

            <div className="space-y-1">
              <label className="block text-[11px] text-zinc-400">Bitiş Tarihi</label>
              <input
                type="date"
                value={filters.dateTo || ""}
                onChange={(e) => handleFilterChange({ dateTo: e.target.value || undefined })}
                className="bg-[#0B0F0D] border border-white/[0.1] rounded-xl px-3 py-1.5 text-xs text-white"
              />
            </div>

            {report.filterOptions.warehouses && report.filterOptions.warehouses.length > 0 && (
              <div className="space-y-1">
                <label className="block text-[11px] text-zinc-400">Depo</label>
                <select
                  value={filters.warehouseId || ""}
                  onChange={(e) => handleFilterChange({ warehouseId: e.target.value || undefined })}
                  className="bg-[#0B0F0D] border border-white/[0.1] rounded-xl px-3 py-1.5 text-xs text-white min-w-[180px]"
                >
                  <option value="">Tüm Depolar</option>
                  {report.filterOptions.warehouses.map((w) => (
                    <option key={w.id} value={w.id}>
                      {w.label}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {report.filterOptions.vehicles && report.filterOptions.vehicles.length > 0 && (
              <div className="space-y-1">
                <label className="block text-[11px] text-zinc-400">Araç</label>
                <select
                  value={filters.vehicleId || ""}
                  onChange={(e) => handleFilterChange({ vehicleId: e.target.value || undefined })}
                  className="bg-[#0B0F0D] border border-white/[0.1] rounded-xl px-3 py-1.5 text-xs text-white min-w-[180px]"
                >
                  <option value="">Tüm Araçlar</option>
                  {report.filterOptions.vehicles.map((v) => (
                    <option key={v.id} value={v.id}>
                      {v.label}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {report.filterOptions.suppliers && report.filterOptions.suppliers.length > 0 && (
              <div className="space-y-1">
                <label className="block text-[11px] text-zinc-400">Tedarikçi</label>
                <select
                  value={filters.supplierId || ""}
                  onChange={(e) => handleFilterChange({ supplierId: e.target.value || undefined })}
                  className="bg-[#0B0F0D] border border-white/[0.1] rounded-xl px-3 py-1.5 text-xs text-white min-w-[180px]"
                >
                  <option value="">Tüm Tedarikçiler</option>
                  {report.filterOptions.suppliers.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.label}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {report.filterOptions.channels && report.filterOptions.channels.length > 0 && (
              <div className="space-y-1">
                <label className="block text-[11px] text-zinc-400">Satış Kanalı</label>
                <select
                  value={filters.channelCode || ""}
                  onChange={(e) => handleFilterChange({ channelCode: e.target.value || undefined })}
                  className="bg-[#0B0F0D] border border-white/[0.1] rounded-xl px-3 py-1.5 text-xs text-white min-w-[160px]"
                >
                  <option value="">Tüm Kanallar</option>
                  {report.filterOptions.channels.map((ch) => (
                    <option key={ch} value={ch}>
                      {ch}
                    </option>
                  ))}
                </select>
              </div>
            )}

            <button
              type="button"
              onClick={handleResetFilters}
              className="ml-auto h-8 px-3 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.08] text-xs text-zinc-300 cursor-pointer"
            >
              Filtreleri Sıfırla
            </button>
          </div>

          {/* Yönetici Özeti KPI Kartları */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {report.summaryCards.map((card, i) => (
              <div
                key={i}
                className="bg-[#111513] border border-white/[0.06] rounded-[20px] p-4 space-y-1"
              >
                <p className="text-[11px] text-zinc-400">{card.label}</p>
                <p className="text-xl font-light text-white tabular-nums">{card.value}</p>
                {card.hint && <p className="text-[11px] text-zinc-500">{card.hint}</p>}
              </div>
            ))}
          </div>

          {/* Grafik Önizlemesi (Recharts) */}
          {report.chartData.length > 0 && (
            <div className="bg-[#111513] border border-white/[0.06] rounded-[20px] p-5 space-y-3">
              <div className="flex items-center justify-between gap-2">
                <h2 className="text-sm font-medium text-white">{report.chartTitle}</h2>
                <span className="text-[11px] text-zinc-500">
                  Oluşturulma: {formatReportDateTr(report.generatedAt)}
                </span>
              </div>
              <div className="h-[260px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={report.chartData}
                    margin={{ top: 10, right: 16, left: 0, bottom: 8 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
                    <XAxis
                      dataKey="name"
                      tick={{ fill: "#a1a1aa", fontSize: 11 }}
                      axisLine={{ stroke: "rgba(255,255,255,0.1)" }}
                    />
                    <YAxis
                      tick={{ fill: "#a1a1aa", fontSize: 11 }}
                      axisLine={{ stroke: "rgba(255,255,255,0.1)" }}
                    />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "#111513",
                        borderColor: "rgba(255,255,255,0.12)",
                        borderRadius: "12px",
                        color: "#fff",
                        fontSize: "12px",
                      }}
                    />
                    <Legend wrapperStyle={{ fontSize: "12px" }} />
                    <Bar
                      dataKey="primaryValue"
                      name={report.chartData[0]?.primaryLabel || "Değer"}
                      fill="#34D399"
                      radius={[6, 6, 0, 0]}
                    />
                    {report.chartData.some((d) => d.secondaryValue !== undefined) && (
                      <Bar
                        dataKey="secondaryValue"
                        name={report.chartData[0]?.secondaryLabel || "Karşılaştırma"}
                        fill="#38BDF8"
                        radius={[6, 6, 0, 0]}
                      />
                    )}
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}

          {/* Veri Önizleme Tablosu */}
          <div className="bg-[#111513] border border-white/[0.06] rounded-[20px] overflow-hidden">
            <div className="px-5 py-3.5 border-b border-white/[0.06] flex items-center justify-between">
              <div className="flex items-center gap-2 text-xs font-medium text-white">
                <FileText className="w-4 h-4 text-emerald-400" />
                <span>
                  {report.title} ({report.rows.length} kayıt)
                </span>
              </div>
              <span className="text-[11px] text-zinc-500">{report.subtitle}</span>
            </div>

            {report.rows.length === 0 ? (
              <div className="py-12 text-center text-xs text-zinc-500">
                Seçili filtre kriterleriyle eşleşen kayıt bulunamadı.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-white/[0.02] border-b border-white/[0.06] text-[11px] text-zinc-400">
                      {report.columns.map((col) => (
                        <th key={col.key} className="py-3 px-4 font-medium whitespace-nowrap">
                          {col.label}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/[0.05]">
                    {report.rows.map((row, idx) => (
                      <tr key={idx} className="hover:bg-white/[0.02] transition-colors">
                        {report.columns.map((col) => (
                          <td
                            key={col.key}
                            className={`py-2.5 px-4 whitespace-nowrap ${
                              col.format && col.format !== "text"
                                ? "font-mono tabular-nums text-zinc-200"
                                : "text-zinc-200"
                            }`}
                          >
                            {formatReportCellValue(row[col.key], col.format)}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

export default function LojistikRaporlarPage() {
  return (
    <Suspense
      fallback={
        <div className="p-6 max-w-7xl mx-auto text-xs text-zinc-400">
          Lojistik raporları yükleniyor...
        </div>
      }
    >
      <LojistikRaporlarContent />
    </Suspense>
  )
}
