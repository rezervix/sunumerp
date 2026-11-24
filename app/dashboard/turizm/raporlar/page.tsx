"use client"

import React, { useEffect, useState } from "react"
import Link from "next/link"
import {
  ArrowRight,
  BarChart3,
  Building2,
  CalendarDays,
  Compass,
  Download,
  FileSpreadsheet,
  FileText,
  Globe,
  RefreshCw,
  Search,
  Users,
} from "lucide-react"
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts"
import type { LogisticsReportPayload } from "@/lib/logistics/reports/constantsAndHelpers"
import { formatReportCellValue } from "@/lib/logistics/reports/constantsAndHelpers"

type ReportType = "CONSOLIDATED" | "RENTACAR" | "HOTEL" | "TOUR" | "B2B"

export default function TurizmReportsPage() {
  const [selectedType, setSelectedType] = useState<ReportType>("CONSOLIDATED")
  const [reportData, setReportData] = useState<LogisticsReportPayload | null>(null)
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState("")

  async function loadReport(type: ReportType) {
    setLoading(true)
    try {
      const res = await fetch(`/api/turizm/raporlar?type=${type}`)
      if (res.ok) {
        const json = await res.json()
        setReportData(json.data)
      }
    } catch {
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadReport(selectedType)
  }, [selectedType])

  const rows = reportData?.rows || []
  const filteredRows = searchQuery
    ? rows.filter((r) =>
        Object.values(r).some((val) =>
          String(val || "").toLowerCase().includes(searchQuery.toLowerCase())
        )
      )
    : rows

  return (
    <div className="space-y-6 p-4 md:p-6 text-zinc-100">
      {/* ÜST BAŞLIK VE EYLEMLER */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <Link
              href="/dashboard/turizm"
              className="rounded-lg p-1 text-zinc-400 hover:bg-zinc-800 hover:text-zinc-100"
            >
              <ArrowRight className="h-5 w-5 rotate-180" />
            </Link>
            <BarChart3 className="h-6 w-6 text-[--brand]" />
            <h1 className="text-xl font-bold tracking-tight text-white">
              Birleşik Turizm &amp; Sektör Raporları
            </h1>
          </div>
          <p className="text-xs text-zinc-400 mt-1 ml-7">
            Rent-a-Car, Otel PMS, Tur Operatörlüğü ve B2B Partner Ağı tek raporda birleştirilmiş ve dışa aktarılabilir.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <a
            href={`/api/turizm/raporlar?type=${selectedType}&format=xlsx`}
            className="inline-flex items-center gap-1.5 rounded-lg border border-[--brand-line] bg-[--brand]/10 px-3.5 py-2 text-xs font-medium text-[--brand] hover:bg-[--brand]/20"
          >
            <FileSpreadsheet className="h-4 w-4" />
            Excel (.xlsx) İndir
          </a>
          <a
            href={`/api/turizm/raporlar?type=${selectedType}&format=pdf`}
            className="inline-flex items-center gap-1.5 rounded-lg border border-sky-500/40 bg-sky-500/10 px-3.5 py-2 text-xs font-medium text-sky-300 hover:bg-sky-500/20"
          >
            <FileText className="h-4 w-4" />
            PDF (.pdf) İndir
          </a>
          <button
            type="button"
            disabled={loading}
            onClick={() => loadReport(selectedType)}
            className="rounded-lg border border-zinc-700 bg-zinc-900 p-2 text-zinc-300 hover:bg-zinc-800"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
          </button>
        </div>
      </div>

      {/* RAPOR TİPİ SEÇİCİ */}
      <div className="flex flex-wrap gap-2 border-b border-zinc-800 pb-3">
        {[
          { key: "CONSOLIDATED", label: "Konsolide Rapor", icon: Compass },
          { key: "RENTACAR", label: "Araç Kiralama (Rent-a-Car)", icon: Compass },
          { key: "HOTEL", label: "Otel Doluluk & Gelir", icon: Building2 },
          { key: "TOUR", label: "Tur Satış & Manifesto", icon: Users },
          { key: "B2B", label: "B2B Partner Hakediş", icon: Globe },
        ].map(({ key, label, icon: Icon }) => (
          <button
            key={key}
            type="button"
            onClick={() => setSelectedType(key as ReportType)}
            className={`inline-flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-medium transition ${
              selectedType === key
                ? "bg-[--brand] text-white shadow-sm"
                : "bg-zinc-900/60 text-zinc-400 hover:bg-zinc-800 hover:text-zinc-200"
            }`}
          >
            <Icon className="h-4 w-4" />
            {label}
          </button>
        ))}
      </div>

      {/* ÖZET GÖSTERGELERİ */}
      {reportData?.summaryCards && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-3">
          {reportData.summaryCards.map((card, idx) => (
            <div
              key={idx}
              className="rounded-xl border border-zinc-800 bg-[white] p-4 space-y-1"
            >
              <span className="block text-[11px] text-zinc-400 font-medium">{card.label}</span>
              <div className="text-xl font-semibold text-white tracking-tight">{card.value}</div>
              {card.hint && <span className="block text-[10px] text-zinc-500">{card.hint}</span>}
            </div>
          ))}
        </div>
      )}

      {/* GRAFİK BÖLÜMÜ */}
      {reportData?.chartData && reportData.chartData.length > 0 && (
        <div className="rounded-2xl border border-zinc-800 bg-[white] p-5 space-y-3">
          <h2 className="text-xs font-semibold text-zinc-300 uppercase tracking-wider">
            {reportData.chartTitle || "Sektörel Dağılım Grafiği"}
          </h2>
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={reportData.chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#27272a" vertical={false} />
                <XAxis dataKey="name" stroke="#71717a" fontSize={11} tickLine={false} />
                <YAxis stroke="#71717a" fontSize={11} tickLine={false} />
                <Tooltip
                  contentStyle={{ backgroundColor: "#18181b", borderColor: "#3f3f46", borderRadius: "8px", fontSize: "12px" }}
                  formatter={(val: any) => [`₺${Number(val).toLocaleString("tr-TR")}`, "Tutar"]}
                />
                <Bar dataKey="primaryValue" fill="#1267E6" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* TABLO BÖLÜMÜ */}
      <div className="rounded-2xl border border-zinc-800 bg-[white] p-5 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h3 className="text-sm font-semibold text-white">{reportData?.title || "Rapor Detayları"}</h3>
            <p className="text-[11px] text-zinc-400 mt-0.5">Toplam {filteredRows.length} kayıt listeleniyor.</p>
          </div>

          <div className="relative">
            <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-zinc-500" />
            <input
              type="text"
              placeholder="Tabloda filtrele..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="rounded-lg border border-zinc-700 bg-zinc-900/80 pl-9 pr-3 py-1.5 text-xs text-white placeholder-zinc-500 focus:border-[--brand] focus:outline-none w-56"
            />
          </div>
        </div>

        <div className="overflow-x-auto rounded-xl border border-zinc-800/80">
          <table className="w-full text-left text-xs">
            <thead className="bg-zinc-900/90 text-zinc-400 border-b border-zinc-800">
              <tr>
                {reportData?.columns.map((col) => (
                  <th key={col.key} className="px-3.5 py-2.5 font-medium">
                    {col.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800/60 bg-zinc-950/40">
              {filteredRows.map((row, idx) => (
                <tr key={idx} className="hover:bg-zinc-900/40 transition">
                  {reportData?.columns.map((col) => (
                    <td key={col.key} className="px-3.5 py-2.5 text-zinc-300">
                      {formatReportCellValue(row[col.key], col.format)}
                    </td>
                  ))}
                </tr>
              ))}
              {filteredRows.length === 0 && (
                <tr>
                  <td
                    colSpan={reportData?.columns.length || 4}
                    className="p-8 text-center text-zinc-500 text-xs"
                  >
                    Kayıt bulunamadı.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
