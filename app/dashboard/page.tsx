"use client"

import { useState, useEffect, useMemo } from "react"
import { useAuth } from "@/lib/auth/context"
import { toast } from "sonner"
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer,
} from "recharts"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  Download, Users, TrendingUp,
  DollarSign, ShoppingBag, ArrowUpRight, History, X
} from "lucide-react"
import { motion } from "framer-motion"
import { useRouter } from "next/navigation"
import { ContextualHelp } from "@/components/shared/contextual-help"
import { LogisticsExecutiveSummarySection } from "./components/LogisticsExecutiveSummarySection"
import { TourismExecutiveSummarySection } from "./components/TourismExecutiveSummarySection"
import { useLanguage } from "@/lib/context/LanguageContext"
import { mockDatabase } from "@/lib/data/mockDatabase"
import {
  AnimatedNumber,
  StaggerContainer,
  StaggerItem,
} from "@/components/ui/motion-primitives"
import { safeNumber } from "@/lib/utils/safe-display"

const PIE_COLORS = ["#1267E6", "#1579F9", "#2A93F3", "#07254A", "#BBD7FD"]

function formatCompactCurrency(v: number): string {
  const abs = Math.abs(v)
  if (abs >= 1_000_000) {
    const m = (v / 1_000_000).toFixed(1).replace(/\.0$/, "")
    return `₺${m}M`
  }
  if (abs >= 1_000) {
    const b = Math.round(v / 1_000)
    return `₺${b}B`
  }
  return `₺${v}`
}

const statDef = [
  {
    key: "customers",
    titleKey: "dashboard.totalCustomers",
    fallback: "Toplam Müşteri",
    Icon: Users,
    badgeText: "Aktif Portföy",
    deltaValue: 12.4,
  },
  {
    key: "activeProjects",
    titleKey: "dashboard.activeProjects",
    fallback: "Aktif Projeler",
    Icon: ShoppingBag,
    badgeText: "Canlı Operasyon",
    deltaValue: 8.2,
  },
  {
    key: "leads",
    titleKey: "dashboard.leads",
    fallback: "Potansiyeller",
    Icon: TrendingUp,
    badgeText: "Fırsat Havuzu",
    deltaValue: 15.8,
  },
  {
    key: "income",
    titleKey: "dashboard.monthlyIncome",
    fallback: "Aylık Gelir",
    Icon: DollarSign,
    isCurrency: true,
    badgeText: "Aylık Ciro",
    deltaValue: 18.6,
  },
]

function WaveChartTooltip({ active, payload, label }: any) {
  if (!active || !payload || payload.length === 0) return null
  const incomeItem = payload.find((p: any) => p.dataKey === "income")
  const expenseItem = payload.find((p: any) => p.dataKey === "expense")
  const incVal = Number(incomeItem?.value || 0)
  const expVal = Number(expenseItem?.value || 0)

  return (
    <div className="backdrop-blur-md bg-white/95 border border-[--line] rounded-xl p-3 shadow-xl min-w-[175px]">
      <p className="text-[11px] uppercase tracking-[0.12em] text-[--text-muted] font-medium mb-2">
        {label}
      </p>
      <div className="space-y-1.5 text-xs">
        <div className="flex items-center justify-between gap-4">
          <span className="flex items-center gap-1.5 text-[--text-2]">
            <span className="w-2 h-2 rounded-full bg-[--brand]" />
            Gelir
          </span>
          <span className="font-medium text-[--text] tabular-nums">
            ₺{incVal.toLocaleString("tr-TR")}
          </span>
        </div>
        <div className="flex items-center justify-between gap-4">
          <span className="flex items-center gap-1.5 text-[--text-2]">
            <span className="w-2 h-2 rounded-full bg-[--sky]" />
            Gider
          </span>
          <span className="font-medium text-[--text] tabular-nums">
            ₺{expVal.toLocaleString("tr-TR")}
          </span>
        </div>
        <div className="pt-1.5 mt-1 border-t border-[--line] flex items-center justify-between gap-4">
          <span className="text-[--text-muted]">Net Fark</span>
          <span className="font-semibold text-[--brand] tabular-nums">
            +₺{(incVal - expVal).toLocaleString("tr-TR")}
          </span>
        </div>
      </div>
    </div>
  )
}

export default function DashboardPage() {
  const { currentBranch } = useAuth()
  const { t, tText, locale } = useLanguage()
  const router = useRouter()
  const [isReportOpen, setIsReportOpen] = useState(false)
  const [statsData, setStatsData] = useState(() => mockDatabase.getStats())

  useEffect(() => {
    loadStats()
  }, [currentBranch])

  useEffect(() => {
    const handleDbChange = () => setStatsData(mockDatabase.getStats())
    window.addEventListener("sunum-mockdb-change", handleDbChange)
    return () => window.removeEventListener("sunum-mockdb-change", handleDbChange)
  }, [])

  const loadStats = async () => {
    try {
      const branchParam = currentBranch?.id ? `?branchId=${currentBranch.id}` : ""
      const res = await fetch(`/api/stats${branchParam}`)
      if (res.ok) {
        const data = await res.json()
        if (data && (data.customers || data.income)) {
          setStatsData(data)
        } else {
          setStatsData(mockDatabase.getStats())
        }
      } else {
        setStatsData(mockDatabase.getStats())
      }
    } catch {
      setStatsData(mockDatabase.getStats())
    }
  }

  const handleDownloadReport = () => {
    try {
      const csvRows = []
      csvRows.push(`${tText("dashboard.report", "Rapor")}: ${tText("dashboard.title", "Gösterge Paneli")} ${tText("common.details", "Özet Verileri")}`)
      csvRows.push(`${tText("common.date", "Tarih")}: ${new Date().toLocaleDateString(locale === "tr" ? "tr-TR" : "en-US")}`)
      csvRows.push(`${t.nav.branches || "Şube"}: ${currentBranch?.name || tText("common.unknown", "Bilinmiyor")}`)
      csvRows.push("")
      csvRows.push(`${tText("common.metric", "Metrik")},${tText("common.value", "Değer")}`)
      csvRows.push(`${tText("dashboard.totalCustomers", "Toplam Müşteri")},${statsData.customers}`)
      csvRows.push(`${tText("dashboard.activeProjects", "Aktif Projeler")},${statsData.activeProjects}`)
      csvRows.push(`${tText("dashboard.leads", "Potansiyel Müşteriler (Leads)")},${statsData.leads}`)
      csvRows.push(`${tText("dashboard.monthlyIncome", "Aylık Toplam Gelir")},${statsData.income} ₺`)
      csvRows.push(`${tText("dashboard.monthlyExpense", "Aylık Toplam Gider")},${statsData.expense} ₺`)
      csvRows.push(`${tText("dashboard.netProfitLoss", "Net Kâr/Zarar")},${statsData.income - statsData.expense} ₺`)
      csvRows.push("")

      if (statsData.spendingByKind.length > 0) {
        csvRows.push(tText("dashboard.expenseDistribution", "Kategoriye Göre Harcamalar"))
        csvRows.push(`${tText("common.category", "Kategori")},${tText("common.amount", "Tutar (₺)")}`)
        statsData.spendingByKind.forEach(item => {
          csvRows.push(`"${item.name}",${item.value}`)
        })
        csvRows.push("")
      }

      if (statsData.recentActivities.length > 0) {
        csvRows.push(tText("dashboard.recentActivities", "Son Aktiviteler"))
        csvRows.push(`${tText("common.type", "Tür")},${tText("common.time", "Zaman")},${tText("common.description", "Açıklama")}`)
        statsData.recentActivities.forEach(act => {
          csvRows.push(`"${act.type}","${act.time}","${(act.description || "").replace(/"/g, '""')}"`)
        })
      }

      const csvContent = "data:text/csv;charset=utf-8,\uFEFF" + csvRows.join("\n")
      const encodedUri = encodeURI(csvContent)
      const link = document.createElement("a")
      link.setAttribute("href", encodedUri)
      link.setAttribute("download", `sube_rapor_${currentBranch?.code || "rapor"}.csv`)
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)

      toast.success(tText("common.success", "Rapor başarıyla indirildi."))
      setIsReportOpen(false)
    } catch {
      toast.error(tText("common.error", "Rapor oluşturulurken hata oluştu."))
    }
  }

  const waveData = useMemo(() => {
    const inc = Number(statsData.income) || 1250000
    const exp = Number(statsData.expense) || 480000
    return [
      { period: "01 Kas", income: Math.round(inc * 0.58), expense: Math.round(exp * 0.62) },
      { period: "05 Kas", income: Math.round(inc * 0.72), expense: Math.round(exp * 0.54) },
      { period: "10 Kas", income: Math.round(inc * 0.66), expense: Math.round(exp * 0.71) },
      { period: "15 Kas", income: Math.round(inc * 0.84), expense: Math.round(exp * 0.68) },
      { period: "20 Kas", income: Math.round(inc * 0.79), expense: Math.round(exp * 0.82) },
      { period: "25 Kas", income: Math.round(inc * 0.93), expense: Math.round(exp * 0.88) },
      { period: "Bugün", income: inc, expense: exp },
    ]
  }, [statsData.income, statsData.expense])

  const pieData =
    statsData.spendingByKind.length > 0
      ? statsData.spendingByKind
      : [{ name: tText("dashboard.general", "Genel"), value: statsData.expense || 0 }]

  const totalExpenseSum = useMemo(() => {
    const s = pieData.reduce((acc, item) => acc + (Number(item.value) || 0), 0)
    return s > 0 ? s : 1
  }, [pieData])

  const expenseToIncomeRatio = useMemo(() => {
    const inc = Number(statsData.income) || 1
    const exp = Number(statsData.expense) || 0
    return Math.min(Math.max(exp / inc, 0.08), 0.95)
  }, [statsData.income, statsData.expense])

  const netProfitValue = (statsData.income || 0) - (statsData.expense || 0)

  return (
    <StaggerContainer className="space-y-8">

      {/* ── Page Header ── */}
      <StaggerItem className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl lg:text-3xl font-semibold text-[--text] tracking-tight flex items-center gap-2">
            {tText("dashboard.title", t.nav.dashboard)}
            <ContextualHelp />
          </h1>
          <p className="text-[--text-muted] mt-1 text-sm">
            {currentBranch
              ? `${currentBranch.name} · ${tText("dashboard.subtitle", "İşletme verilerinize genel bakış")}`
              : tText("dashboard.subtitle", "İşletme verilerinize genel bakış")}
          </p>
        </div>
        <div className="flex gap-3 shrink-0 w-full sm:w-auto">
          <button
            type="button"
            className="inline-flex items-center justify-center gap-2 flex-1 sm:flex-none bg-white hover:bg-[--muted-bg] text-[--text-2] border border-[--line] rounded-full h-9 px-4 text-xs font-medium transition-colors cursor-pointer shadow-sm"
            onClick={() => setIsReportOpen(true)}
          >
            <Download size={14} className="text-[--brand]" />
            <span>{tText("dashboard.report", "Rapor")}</span>
          </button>
        </div>
      </StaggerItem>

      {/* ── 1. KUTUSUZ (BORDERLESS) ÜST KPI ŞERİDİ ── */}
      <StaggerItem className="grid grid-cols-2 md:grid-cols-4 gap-6 lg:gap-8 py-4 border-b border-[--line]">
        {statDef.map(s => {
          const rawVal = statsData[s.key as keyof typeof statsData]
          const numVal = safeNumber(Number(rawVal), 0)

          const netDiff = s.key === "income"
            ? (statsData.income || 0) - (statsData.expense || 0)
            : numVal
          const isPositive = netDiff >= 0

          return (
            <div key={s.key} className="flex flex-col gap-2 min-w-0">
              <div className="flex items-center gap-1.5 text-[11px] uppercase tracking-[0.12em] text-[--text-muted] font-medium">
                <s.Icon size={14} className="text-[--brand] shrink-0" />
                <span className="truncate">{tText(s.titleKey, s.fallback)}</span>
              </div>
              <div className="flex items-baseline gap-2.5 flex-nowrap whitespace-nowrap">
                <AnimatedNumber
                  value={numVal}
                  prefix={s.isCurrency ? "₺" : ""}
                  className="text-3xl xl:text-4xl font-light text-[--text] tracking-tight tabular-nums whitespace-nowrap"
                />
                <span
                  className={
                    isPositive
                      ? "bg-[--brand-soft] text-[--brand] border border-[--brand-line] text-xs px-2 py-0.5 rounded-full font-medium tabular-nums shrink-0 whitespace-nowrap"
                      : "bg-[--bad-soft] text-[--bad] border border-[--bad-soft] text-xs px-2 py-0.5 rounded-full font-medium tabular-nums shrink-0 whitespace-nowrap"
                  }
                >
                  {isPositive ? `+${s.deltaValue}%` : `-${s.deltaValue}%`}
                </span>
              </div>
            </div>
          )
        })}
      </StaggerItem>

      {/* ── 2. GRAFİK VE BENTO KARTLARI ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* Dual-Layer Monotone Spline AreaChart Card */}
        <StaggerItem className="bg-white/80 backdrop-blur-xl border border-[--line] rounded-[20px] p-6 shadow-sm lg:col-span-2 flex flex-col">
          <div className="flex items-start justify-between gap-4 pb-6">
            <div>
              <p className="text-[11px] uppercase tracking-[0.12em] text-[--text-muted] font-medium">
                {tText("dashboard.incomeExpenseAnalysis", "Gelir / Gider Analizi")} · {tText("dashboard.netProfitLoss", "Net Kâr/Zarar")}
              </p>
              <div className="flex items-baseline gap-2.5 mt-1 flex-nowrap whitespace-nowrap">
                <AnimatedNumber
                  value={safeNumber(netProfitValue, 0)}
                  prefix="₺"
                  className="font-light text-2xl text-[--text] tracking-tight tabular-nums"
                />
                <span className="bg-[--brand-soft] text-[--brand] border border-[--brand-line] text-xs px-2 py-0.5 rounded-full font-medium shrink-0">
                  Net Bilanço
                </span>
              </div>
            </div>

            <div className="flex items-center gap-3 shrink-0">
              <div className="hidden sm:flex items-center gap-3 text-[11px] text-[--text-muted]">
                <span className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-[--brand]" />
                  Gelir
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-[--sky]" />
                  Gider
                </span>
              </div>

              {/* 7G | 30G | 90G Pill Filter */}
              <div className="bg-[--muted-bg] border border-[--line] rounded-full p-1 flex items-center gap-0.5 text-[11px] text-[--text-muted] shrink-0 select-none">
                <span className="px-2.5 py-0.5 rounded-full hover:text-[--text] transition-colors cursor-pointer">7G</span>
                <span className="px-2.5 py-0.5 rounded-full bg-white text-[--navy] font-semibold shadow-xs">30G</span>
                <span className="px-2.5 py-0.5 rounded-full hover:text-[--text] transition-colors cursor-pointer">90G</span>
              </div>
            </div>
          </div>

          <div className="relative h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={waveData} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="brandWaveGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#1267E6" stopOpacity={0.28} />
                    <stop offset="70%" stopColor="#1267E6" stopOpacity={0.05} />
                    <stop offset="100%" stopColor="#1267E6" stopOpacity={0.0} />
                  </linearGradient>
                  <linearGradient id="skyWaveGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#2A93F3" stopOpacity={0.20} />
                    <stop offset="70%" stopColor="#2A93F3" stopOpacity={0.03} />
                    <stop offset="100%" stopColor="#2A93F3" stopOpacity={0.0} />
                  </linearGradient>
                </defs>
                <CartesianGrid
                  strokeDasharray="3 3"
                  vertical={false}
                  horizontal={true}
                  stroke="#E3E8F0"
                />
                <XAxis
                  dataKey="period"
                  axisLine={false}
                  tickLine={false}
                  tick={{ fontSize: 11, fill: "#5B6B82", fontWeight: 400 }}
                  dy={6}
                />
                <YAxis
                  axisLine={false}
                  tickLine={false}
                  tick={{ fontSize: 11, fill: "#5B6B82" }}
                  tickFormatter={formatCompactCurrency}
                  width={56}
                />
                <Tooltip
                  cursor={{ stroke: "#BBD7FD", strokeWidth: 1, strokeDasharray: "4 4" }}
                  content={<WaveChartTooltip />}
                />
                <Area
                  type="monotone"
                  dataKey="income"
                  stroke="#1267E6"
                  strokeWidth={2.5}
                  fill="url(#brandWaveGrad)"
                  isAnimationActive={true}
                  animationDuration={1500}
                  animationEasing="ease-out"
                  activeDot={{
                    r: 5,
                    fill: "#1267E6",
                    stroke: "#FFFFFF",
                    strokeWidth: 2,
                  }}
                />
                <Area
                  type="monotone"
                  dataKey="expense"
                  stroke="#2A93F3"
                  strokeWidth={2}
                  fill="url(#skyWaveGrad)"
                  isAnimationActive={true}
                  animationDuration={1500}
                  animationEasing="ease-out"
                  activeDot={{
                    r: 4,
                    fill: "#2A93F3",
                    stroke: "#FFFFFF",
                    strokeWidth: 2,
                  }}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </StaggerItem>

        {/* Expense Distribution Card */}
        <StaggerItem className="bg-white/80 backdrop-blur-xl border border-[--line] rounded-[20px] p-6 shadow-sm flex flex-col justify-between">
          <div className="flex items-start justify-between gap-3 pb-3">
            <div>
              <p className="text-[11px] uppercase tracking-[0.12em] text-[--text-muted] font-medium">
                {tText("dashboard.expenseDistribution", "Harcama Dağılımı")}
              </p>
              <div className="mt-1">
                <AnimatedNumber
                  value={safeNumber(statsData.expense, 0)}
                  prefix="₺"
                  className="font-light text-2xl text-[--text] tracking-tight tabular-nums"
                />
              </div>
            </div>

            {/* 7G | 30G | 90G Pill Filter */}
            <div className="bg-[--muted-bg] border border-[--line] rounded-full p-1 flex items-center gap-0.5 text-[11px] text-[--text-muted] shrink-0 select-none">
              <span className="px-2 py-0.5 rounded-full hover:text-[--text] transition-colors cursor-pointer">7G</span>
              <span className="px-2 py-0.5 rounded-full bg-white text-[--navy] font-semibold shadow-xs">30G</span>
              <span className="px-2 py-0.5 rounded-full hover:text-[--text] transition-colors cursor-pointer">90G</span>
            </div>
          </div>

          {/* Animated Semi-Circle Radial Gauge */}
          <div className="relative flex flex-col items-center justify-center pt-1 pb-3">
            <svg viewBox="0 0 220 120" className="w-full max-w-[220px] overflow-visible">
              <defs>
                <linearGradient id="radialGaugeGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                  <stop offset="0%" stopColor="#1267E6" />
                  <stop offset="100%" stopColor="#2A93F3" />
                </linearGradient>
              </defs>

              {/* Outer Segmented Radial Ticks */}
              {Array.from({ length: 25 }).map((_, i) => {
                const ratio = i / 24
                const angle = Math.PI * (1 - ratio)
                const rInner = 86
                const rOuter = 93
                const x1 = 110 + rInner * Math.cos(angle)
                const y1 = 104 - rInner * Math.sin(angle)
                const x2 = 110 + rOuter * Math.cos(angle)
                const y2 = 104 - rOuter * Math.sin(angle)
                const isLit = ratio <= expenseToIncomeRatio
                return (
                  <line
                    key={i}
                    x1={x1}
                    y1={y1}
                    x2={x2}
                    y2={y2}
                    stroke={isLit ? "#1267E6" : "#E3E8F0"}
                    strokeWidth={1.75}
                    strokeLinecap="round"
                  />
                )
              })}

              {/* Background Track Arc */}
              <path
                d="M 32 104 A 78 78 0 0 1 188 104"
                fill="none"
                stroke="#EDF1F6"
                strokeWidth={10}
                strokeLinecap="round"
              />

              {/* Animated Foreground Arc */}
              <motion.path
                d="M 32 104 A 78 78 0 0 1 188 104"
                fill="none"
                stroke="url(#radialGaugeGrad)"
                strokeWidth={10}
                strokeLinecap="round"
                initial={{ pathLength: 0 }}
                animate={{ pathLength: expenseToIncomeRatio }}
                transition={{ duration: 1.5, ease: "easeOut" }}
                style={{ filter: "drop-shadow(0 4px 12px rgba(18, 103, 230, 0.2))" } as any}
              />
            </svg>

            <div className="-mt-11 text-center">
              <AnimatedNumber
                value={Math.round(expenseToIncomeRatio * 100)}
                suffix="%"
                className="text-2xl font-light text-[--text] tracking-tight tabular-nums"
              />
              <p className="text-[10px] uppercase tracking-[0.12em] text-[--text-muted] mt-0.5 font-medium">
                Gider / Ciro Oranı
              </p>
            </div>
          </div>

          {/* Segmented LED Bars for Expense Categories */}
          <div className="space-y-3 pt-2 border-t border-[--line]">
            {pieData.slice(0, 4).map((item, idx) => {
              const val = Number(item.value) || 0
              const share = Math.min(Math.max(val / totalExpenseSum, 0.05), 1)
              const totalSegments = 20
              const litSegments = Math.max(1, Math.round(share * totalSegments))
              const accentColor = PIE_COLORS[idx % PIE_COLORS.length]

              return (
                <div key={item.name + idx} className="space-y-1.5">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-[--text-2] truncate font-medium">{item.name}</span>
                    <div className="flex items-center gap-2 shrink-0 tabular-nums">
                      <AnimatedNumber
                        value={safeNumber(val, 0)}
                        prefix="₺"
                        className="text-[--text] font-medium"
                      />
                      <span className="text-[10px] text-[--text-muted] w-8 text-right">
                        %{Math.round(share * 100)}
                      </span>
                    </div>
                  </div>

                  {/* 20-Segment LED Bar */}
                  <div className="grid grid-cols-[repeat(20,minmax(0,1fr))] gap-1 h-2">
                    {Array.from({ length: totalSegments }).map((_, segIdx) => {
                      const active = segIdx < litSegments
                      return (
                        <motion.span
                          key={segIdx}
                          initial={{ opacity: 0.15, scaleY: 0.5 }}
                          animate={{ opacity: 1, scaleY: 1 }}
                          transition={{
                            delay: segIdx * 0.025 + idx * 0.06,
                            duration: 0.25,
                          }}
                          className="h-full rounded-[2px]"
                          style={
                            (active
                              ? {
                                backgroundColor: accentColor,
                              }
                              : {
                                backgroundColor: "#EDF1F6",
                              }) as any
                          }
                        />
                      )
                    })}
                  </div>
                </div>
              )
            })}
          </div>
        </StaggerItem>
      </div>

      {/* ── Rol Bazlı Lojistik Yönetim Özeti ── */}
      <LogisticsExecutiveSummarySection branchId={currentBranch?.id} />

      {/* ── Rol ve Sektör Bazlı Turizm & Ağırlama Yönetim Özeti ── */}
      <TourismExecutiveSummarySection branchId={currentBranch?.id} />

      {/* ── Recent Activity Bento Card ── */}
      <StaggerItem className="bg-white/80 backdrop-blur-xl border border-[--line] rounded-[20px] p-6 shadow-sm">
        <div className="flex items-center justify-between gap-4 pb-5 border-b border-[--line]">
          <div>
            <p className="text-[11px] uppercase tracking-[0.12em] text-[--text-muted] font-medium">
              Operasyon Günlüğü
            </p>
            <h2 className="text-lg font-semibold text-[--navy] tracking-tight mt-0.5">
              {tText("dashboard.recentActivities", "Son Aktiviteler")}
            </h2>
          </div>
          <button
            type="button"
            onClick={() => router.push("/dashboard/todos")}
            className="inline-flex items-center gap-1 bg-[--brand-soft] text-[--brand] border border-[--brand-line] hover:bg-[--brand-soft]/80 text-xs h-8 px-3.5 rounded-full font-medium transition-colors cursor-pointer shadow-xs"
          >
            {tText("common.viewAll", "Tümü")}
            <ArrowUpRight size={13} />
          </button>
        </div>

        <div className="pt-4">
          {statsData.recentActivities.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 gap-3">
              <div className="size-12 rounded-full bg-[--muted-bg] flex items-center justify-center text-[--text-muted]">
                <History size={22} />
              </div>
              <div className="text-center">
                <p className="text-sm font-medium text-[--text]">
                  {tText("dashboard.noActivities", "Henüz aktivite yok")}
                </p>
                <p className="text-xs text-[--text-muted] mt-1">
                  {tText("dashboard.activitiesHint", "Etkinlikler burada görüntülenecektir")}
                </p>
              </div>
            </div>
          ) : (
            <StaggerContainer className="divide-y divide-[--line]">
              {statsData.recentActivities.map((activity: any) => (
                <StaggerItem
                  key={activity.id}
                  className="py-3.5 first:pt-0 last:pb-0 flex items-start justify-between gap-4 hover:bg-[--brand-soft]/20 rounded-xl px-2 transition-colors"
                >
                  <div className="flex items-start gap-3 min-w-0">
                    <span className="w-1.5 h-1.5 rounded-full bg-[--brand] mt-2 shrink-0" />
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <Badge
                          variant="secondary"
                          className="text-[10px] h-5 px-2 font-medium uppercase tracking-wider bg-[--brand-soft] text-[--brand] border border-[--brand-line] rounded-full"
                        >
                          {activity.type}
                        </Badge>
                        <p className="text-sm text-[--text] truncate">{activity.description}</p>
                      </div>
                    </div>
                  </div>
                  <span className="text-xs text-[--text-muted] shrink-0 tabular-nums">{activity.time}</span>
                </StaggerItem>
              ))}
            </StaggerContainer>
          )}
        </div>
      </StaggerItem>

      {/* Report Modal */}
      {isReportOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#0B1B33]/40 backdrop-blur-sm">
          <div className="bg-white border border-[--line] rounded-[20px] w-full max-w-md overflow-hidden text-[--text] shadow-2xl">
            <div className="px-6 py-4 border-b border-[--line] bg-[--page] flex items-center justify-between">
              <div>
                <h3 className="text-base font-semibold text-[--navy]">
                  {tText("dashboard.reportModalTitle", "Rapor İndir")}
                </h3>
                <p className="text-xs text-[--text-muted] mt-0.5">
                  {tText("dashboard.reportModalSubtitle", "Özet rapor indirin")}
                </p>
              </div>
              <button onClick={() => setIsReportOpen(false)} className="text-[--text-muted] hover:text-[--text] cursor-pointer">
                <X size={18} />
              </button>
            </div>
            <div className="p-6">
              <p className="text-sm text-[--text-2] leading-relaxed">
                {tText("dashboard.reportModalDesc", "Şubenize ait performans, müşteri ve finansal özet verileri Excel uyumlu CSV formatında indirilecektir.")}
              </p>
            </div>
            <div className="px-6 py-4 border-t border-[--line] bg-[--page] flex justify-end gap-2.5">
              <Button
                variant="outline"
                className="rounded-full cursor-pointer border border-[--line] text-[--text-2] bg-white hover:bg-[--muted-bg]"
                onClick={() => setIsReportOpen(false)}
              >
                {tText("common.close", "Kapat")}
              </Button>
              <Button
                className="bg-gradient-to-r from-[--brand] to-[--blue] text-white hover:opacity-90 font-medium rounded-full cursor-pointer shadow-sm"
                onClick={handleDownloadReport}
              >
                {tText("common.download", "İndir")}
              </Button>
            </div>
          </div>
        </div>
      )}

    </StaggerContainer>
  )
}
