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
import { useLanguage } from "@/lib/context/LanguageContext"
import { mockDatabase } from "@/lib/data/mockDatabase"
import {
  AnimatedNumber,
  StaggerContainer,
  StaggerItem,
} from "@/components/ui/motion-primitives"

const PIE_COLORS = ["#34D399", "#2DD4BF", "#10B981", "#14B8A6", "#6EE7B7"]

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
    colorLight: "rgba(52, 211, 153, 0.12)",
    colorDark: "#064e3b",
    iconColor: "#34D399",
    iconColorDark: "#34D399",
    badgeText: "Aktif Portföy",
    deltaValue: 12.4,
  },
  {
    key: "activeProjects",
    titleKey: "dashboard.activeProjects",
    fallback: "Aktif Projeler",
    Icon: ShoppingBag,
    colorLight: "rgba(45, 212, 191, 0.12)",
    colorDark: "#064e3b",
    iconColor: "#2DD4BF",
    iconColorDark: "#2DD4BF",
    badgeText: "Canlı Operasyon",
    deltaValue: 8.2,
  },
  {
    key: "leads",
    titleKey: "dashboard.leads",
    fallback: "Potansiyeller",
    Icon: TrendingUp,
    colorLight: "rgba(52, 211, 153, 0.12)",
    colorDark: "#064e3b",
    iconColor: "#34D399",
    iconColorDark: "#34D399",
    badgeText: "Fırsat Havuzu",
    deltaValue: 15.8,
  },
  {
    key: "income",
    titleKey: "dashboard.monthlyIncome",
    fallback: "Aylık Gelir",
    Icon: DollarSign,
    colorLight: "rgba(52, 211, 153, 0.12)",
    colorDark: "#064e3b",
    iconColor: "#34D399",
    iconColorDark: "#34D399",
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
    <div className="backdrop-blur-md bg-[#111513]/90 border border-white/10 rounded-xl p-3 shadow-2xl min-w-[175px]">
      <p className="text-[11px] uppercase tracking-[0.12em] text-zinc-400 font-medium mb-2">
        {label}
      </p>
      <div className="space-y-1.5 text-xs">
        <div className="flex items-center justify-between gap-4">
          <span className="flex items-center gap-1.5 text-zinc-300">
            <span className="w-2 h-2 rounded-full bg-[#34D399] shadow-[0_0_8px_#34D399]" />
            Gelir
          </span>
          <span className="font-light text-white tabular-nums">
            ₺{incVal.toLocaleString("tr-TR")}
          </span>
        </div>
        <div className="flex items-center justify-between gap-4">
          <span className="flex items-center gap-1.5 text-zinc-300">
            <span className="w-2 h-2 rounded-full bg-[#2DD4BF] shadow-[0_0_8px_#2DD4BF]" />
            Gider
          </span>
          <span className="font-light text-white tabular-nums">
            ₺{expVal.toLocaleString("tr-TR")}
          </span>
        </div>
        <div className="pt-1.5 mt-1 border-t border-white/[0.06] flex items-center justify-between gap-4">
          <span className="text-zinc-400">Net Fark</span>
          <span className="font-medium text-emerald-400 tabular-nums">
            +₺{(incVal - expVal).toLocaleString("tr-TR")}
          </span>
        </div>
      </div>
    </div>
  )
}

export default function DashboardPage() {
  const { currentBranch, isSuperAdmin, loading: authLoading } = useAuth()
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

  const barData = [
    { name: tText("dashboard.income", "Gelir"), value: statsData.income },
    { name: tText("dashboard.expense", "Gider"), value: statsData.expense || 0 },
  ]

  // Multi-point spline series anchored to real statsData.income & statsData.expense
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
    <StaggerContainer className="space-y-6">

      {/* ── Page Header ── */}
      <StaggerItem className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-light text-white tracking-tight flex items-center gap-2">
            {tText("dashboard.title", t.nav.dashboard)}
            <ContextualHelp />
          </h1>
          <p className="text-zinc-400 mt-1 text-xs">
            {currentBranch
              ? `${currentBranch.name} · ${tText("dashboard.subtitle", "İşletme verilerinize genel bakış")}`
              : tText("dashboard.subtitle", "İşletme verilerinize genel bakış")}
          </p>
        </div>
        <div className="flex gap-3 shrink-0 w-full sm:w-auto">
          <button
            type="button"
            className="inline-flex items-center justify-center gap-2 flex-1 sm:flex-none bg-[#111513] hover:bg-white/[0.06] text-zinc-200 border border-white/[0.06] rounded-full h-9 px-4 text-xs font-medium transition-colors cursor-pointer"
            onClick={() => setIsReportOpen(true)}
          >
            <Download size={14} className="text-emerald-400" />
            <span>{tText("dashboard.report", "Rapor")}</span>
          </button>
        </div>
      </StaggerItem>

      {/* ── 1. KUTUSUZ (BORDERLESS) ÜST KPI ŞERİDİ (AnimatedNumber + Tek Satır Rozet Hizası) ── */}
      <StaggerItem className="grid grid-cols-2 md:grid-cols-4 gap-6 lg:gap-8 py-4 border-b border-white/[0.06]">
        {statDef.map(s => {
          const rawVal = statsData[s.key as keyof typeof statsData]
          const numVal = Number(rawVal) || 0

          const netDiff = s.key === "income"
            ? (statsData.income || 0) - (statsData.expense || 0)
            : numVal
          const isPositive = netDiff >= 0

          return (
            <div key={s.key} className="flex flex-col gap-2 min-w-0">
              <div className="flex items-center gap-1.5 text-[11px] uppercase tracking-wider text-zinc-400 font-medium">
                <s.Icon size={13} className="text-zinc-500 shrink-0" />
                <span className="truncate">{tText(s.titleKey, s.fallback)}</span>
              </div>
              <div className="flex items-baseline gap-2.5 flex-nowrap whitespace-nowrap">
                <AnimatedNumber
                  value={numVal}
                  prefix={s.isCurrency ? "₺" : ""}
                  className="text-3xl xl:text-4xl font-light text-white tracking-tight tabular-nums whitespace-nowrap"
                />
                <span
                  className={
                    isPositive
                      ? "bg-emerald-500/10 text-emerald-400 text-xs px-2 py-0.5 rounded-full font-medium tabular-nums shrink-0 whitespace-nowrap"
                      : "bg-rose-500/10 text-rose-400 text-xs px-2 py-0.5 rounded-full font-medium tabular-nums shrink-0 whitespace-nowrap"
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
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 lg:gap-5">

        {/* Dual-Layer Monotone Spline AreaChart Card */}
        <StaggerItem className="bg-[#111513] border border-white/[0.06] rounded-[20px] p-6 lg:col-span-2 flex flex-col">
          <div className="flex items-start justify-between gap-4 pb-6">
            <div>
              <p className="text-[11px] uppercase tracking-[0.12em] text-zinc-400 font-medium">
                {tText("dashboard.incomeExpenseAnalysis", "Gelir / Gider Analizi")} · {tText("dashboard.netProfitLoss", "Net Kâr/Zarar")}
              </p>
              <div className="flex items-baseline gap-2.5 mt-1 flex-nowrap whitespace-nowrap">
                <AnimatedNumber
                  value={netProfitValue}
                  prefix="₺"
                  className="font-light text-2xl text-white tracking-tight tabular-nums"
                />
                <span className="bg-emerald-500/10 text-emerald-400 text-xs px-2 py-0.5 rounded-full font-medium shrink-0">
                  Net Bilanço
                </span>
              </div>
            </div>

            <div className="flex items-center gap-3 shrink-0">
              <div className="hidden sm:flex items-center gap-3 text-[11px] text-zinc-400">
                <span className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-[#34D399] shadow-[0_0_8px_#34D399]" />
                  Gelir
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-[#2DD4BF] shadow-[0_0_8px_#2DD4BF]" />
                  Gider
                </span>
              </div>

              {/* 7G | 30G | 90G Pill Filter */}
              <div className="bg-[#080A09] border border-white/[0.06] rounded-full p-1 flex items-center gap-0.5 text-[11px] text-zinc-400 shrink-0 select-none">
                <span className="px-2.5 py-0.5 rounded-full hover:text-white transition-colors cursor-pointer">7G</span>
                <span className="px-2.5 py-0.5 rounded-full bg-white/10 text-white font-medium">30G</span>
                <span className="px-2.5 py-0.5 rounded-full hover:text-white transition-colors cursor-pointer">90G</span>
              </div>
            </div>
          </div>

          {/* Subtle Vertical Guide Columns + Dual-Layer Spline AreaChart */}
          <div className="relative h-72 w-full">
            {/* Background Faint Vertical Guide Columns */}
            <div
              className="pointer-events-none absolute inset-x-12 inset-y-2 grid grid-cols-7 gap-3 opacity-35"
              aria-hidden="true"
            >
              {Array.from({ length: 7 }).map((_, idx) => (
                <div
                  key={idx}
                  className="h-full rounded-lg bg-gradient-to-b from-white/[0.03] via-white/[0.015] to-transparent border-x border-white/[0.02]"
                />
              ))}
            </div>

            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={waveData} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="emeraldWaveGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#34D399" stopOpacity={0.34} />
                    <stop offset="65%" stopColor="#34D399" stopOpacity={0.08} />
                    <stop offset="100%" stopColor="#34D399" stopOpacity={0.0} />
                  </linearGradient>
                  <linearGradient id="turquoiseWaveGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#2DD4BF" stopOpacity={0.26} />
                    <stop offset="70%" stopColor="#2DD4BF" stopOpacity={0.05} />
                    <stop offset="100%" stopColor="#2DD4BF" stopOpacity={0.0} />
                  </linearGradient>
                </defs>
                <CartesianGrid
                  strokeDasharray="3 3"
                  vertical={true}
                  horizontal={true}
                  stroke="rgba(255, 255, 255, 0.04)"
                />
                <XAxis
                  dataKey="period"
                  axisLine={false}
                  tickLine={false}
                  tick={{ fontSize: 11, fill: "#71717a", fontWeight: 400 }}
                  dy={6}
                />
                <YAxis
                  axisLine={false}
                  tickLine={false}
                  tick={{ fontSize: 11, fill: "#71717a" }}
                  tickFormatter={formatCompactCurrency}
                  width={56}
                />
                <Tooltip
                  cursor={{ stroke: "rgba(52, 211, 153, 0.25)", strokeWidth: 1, strokeDasharray: "4 4" }}
                  content={<WaveChartTooltip />}
                />
                <Area
                  type="monotone"
                  dataKey="income"
                  stroke="#34D399"
                  strokeWidth={2.5}
                  fill="url(#emeraldWaveGrad)"
                  isAnimationActive={true}
                  animationDuration={1500}
                  animationEasing="ease-out"
                  activeDot={{
                    r: 5,
                    fill: "#34D399",
                    stroke: "#080A09",
                    strokeWidth: 2,
                  }}
                />
                <Area
                  type="monotone"
                  dataKey="expense"
                  stroke="#2DD4BF"
                  strokeWidth={2}
                  fill="url(#turquoiseWaveGrad)"
                  isAnimationActive={true}
                  animationDuration={1500}
                  animationEasing="ease-out"
                  activeDot={{
                    r: 4,
                    fill: "#2DD4BF",
                    stroke: "#080A09",
                    strokeWidth: 2,
                  }}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </StaggerItem>

        {/* Expense Distribution Card: Radial Half-Circle Gauge + Segmented LED Bars */}
        <StaggerItem className="bg-[#111513] border border-white/[0.06] rounded-[20px] p-6 flex flex-col justify-between">
          <div className="flex items-start justify-between gap-3 pb-3">
            <div>
              <p className="text-[11px] uppercase tracking-[0.12em] text-zinc-400 font-medium">
                {tText("dashboard.expenseDistribution", "Harcama Dağılımı")}
              </p>
              <div className="mt-1">
                <AnimatedNumber
                  value={statsData.expense || 0}
                  prefix="₺"
                  className="font-light text-2xl text-white tracking-tight tabular-nums"
                />
              </div>
            </div>

            {/* 7G | 30G | 90G Pill Filter */}
            <div className="bg-[#080A09] border border-white/[0.06] rounded-full p-1 flex items-center gap-0.5 text-[11px] text-zinc-400 shrink-0 select-none">
              <span className="px-2 py-0.5 rounded-full hover:text-white transition-colors cursor-pointer">7G</span>
              <span className="px-2 py-0.5 rounded-full bg-white/10 text-white font-medium">30G</span>
              <span className="px-2 py-0.5 rounded-full hover:text-white transition-colors cursor-pointer">90G</span>
            </div>
          </div>

          {/* Animated Semi-Circle Radial Gauge (%0 -> Hedef Oran) */}
          <div className="relative flex flex-col items-center justify-center pt-1 pb-3">
            <svg viewBox="0 0 220 120" className="w-full max-w-[220px] overflow-visible">
              <defs>
                <linearGradient id="radialGaugeGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                  <stop offset="0%" stopColor="#34D399" />
                  <stop offset="100%" stopColor="#2DD4BF" />
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
                    stroke={isLit ? "#34D399" : "rgba(255,255,255,0.08)"}
                    strokeWidth={1.75}
                    strokeLinecap="round"
                  />
                )
              })}

              {/* Background Track Arc */}
              <path
                d="M 32 104 A 78 78 0 0 1 188 104"
                fill="none"
                stroke="rgba(255, 255, 255, 0.06)"
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
                className="drop-shadow-[0_0_8px_rgba(52,211,153,0.35)]"
              />
            </svg>

            <div className="-mt-11 text-center">
              <AnimatedNumber
                value={Math.round(expenseToIncomeRatio * 100)}
                suffix="%"
                className="text-2xl font-light text-white tracking-tight tabular-nums"
              />
              <p className="text-[10px] uppercase tracking-[0.12em] text-zinc-500 mt-0.5">
                Gider / Ciro Oranı
              </p>
            </div>
          </div>

          {/* Segmented LED Bars for Expense Categories */}
          <div className="space-y-3 pt-2 border-t border-white/[0.06]">
            {pieData.slice(0, 4).map((item, idx) => {
              const val = Number(item.value) || 0
              const share = Math.min(Math.max(val / totalExpenseSum, 0.05), 1)
              const totalSegments = 20
              const litSegments = Math.max(1, Math.round(share * totalSegments))
              const accentColor = PIE_COLORS[idx % PIE_COLORS.length]

              return (
                <div key={item.name + idx} className="space-y-1.5">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-zinc-300 truncate">{item.name}</span>
                    <div className="flex items-center gap-2 shrink-0 tabular-nums">
                      <AnimatedNumber
                        value={val}
                        prefix="₺"
                        className="text-zinc-200 font-light"
                      />
                      <span className="text-[10px] text-zinc-500 w-8 text-right">
                        %{Math.round(share * 100)}
                      </span>
                    </div>
                  </div>

                  {/* 20-Segment LED Bar */}
                  <div className="grid grid-cols-[repeat(20,minmax(0,1fr))] gap-1 h-2">
                    {Array.from({ length: totalSegments }).map((_, segIdx) => {
                      const active = segIdx < litSegments
                      const activeClass =
                        idx % 2 === 0
                          ? "bg-[#34D399] shadow-[0_0_6px_rgba(52,211,153,0.35)]"
                          : "bg-[#2DD4BF] shadow-[0_0_6px_rgba(45,212,191,0.35)]"
                      return (
                        <motion.span
                          key={segIdx}
                          initial={{ opacity: 0.15, scaleY: 0.5 }}
                          animate={{ opacity: 1, scaleY: 1 }}
                          transition={{
                            delay: segIdx * 0.025 + idx * 0.06,
                            duration: 0.25,
                          }}
                          className={`h-full rounded-[2px] ${
                            active ? activeClass : "bg-white/[0.05]"
                          }`}
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

      {/* ── Recent Activity Bento Card ── */}
      <StaggerItem className="bg-[#111513] border border-white/[0.06] rounded-[20px] p-6">
        <div className="flex items-center justify-between gap-4 pb-5">
          <div>
            <p className="text-[11px] uppercase tracking-[0.12em] text-zinc-400 font-medium">
              Operasyon Günlüğü
            </p>
            <h2 className="text-lg font-light text-white tracking-tight mt-0.5">
              {tText("dashboard.recentActivities", "Son Aktiviteler")}
            </h2>
          </div>
          <button
            type="button"
            onClick={() => router.push("/dashboard/todos")}
            className="inline-flex items-center gap-1 bg-emerald-400/15 text-emerald-300 border border-emerald-500/25 hover:bg-emerald-400/25 text-xs h-8 px-3.5 rounded-full font-medium transition-colors cursor-pointer"
          >
            {tText("common.viewAll", "Tümü")}
            <ArrowUpRight size={13} />
          </button>
        </div>

        <div>
          {statsData.recentActivities.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 gap-3">
              <div className="size-12 rounded-full bg-white/[0.04] flex items-center justify-center">
                <History size={22} className="text-zinc-500" />
              </div>
              <div className="text-center">
                <p className="text-sm font-medium text-zinc-300">
                  {tText("dashboard.noActivities", "Henüz aktivite yok")}
                </p>
                <p className="text-xs text-zinc-500 mt-1">
                  {tText("dashboard.activitiesHint", "Etkinlikler burada görüntülenecektir")}
                </p>
              </div>
            </div>
          ) : (
            <StaggerContainer className="divide-y divide-white/[0.06]">
              {statsData.recentActivities.map((activity: any) => (
                <StaggerItem
                  key={activity.id}
                  className="py-3.5 first:pt-0 last:pb-0 flex items-start justify-between gap-4"
                >
                  <div className="flex items-start gap-3 min-w-0">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 mt-2 shrink-0" />
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <Badge
                          variant="secondary"
                          className="text-[10px] h-5 px-2 font-medium uppercase tracking-wider bg-emerald-500/10 text-emerald-400 border-0 rounded-full"
                        >
                          {activity.type}
                        </Badge>
                        <p className="text-sm text-zinc-200 truncate">{activity.description}</p>
                      </div>
                    </div>
                  </div>
                  <span className="text-xs text-zinc-500 shrink-0 tabular-nums">{activity.time}</span>
                </StaggerItem>
              ))}
            </StaggerContainer>
          )}
        </div>
      </StaggerItem>

      {/* Report Modal */}
      {isReportOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-md">
          <div className="bg-[#111513] border border-white/[0.06] rounded-[20px] w-full max-w-md overflow-hidden text-white shadow-2xl">
            <div className="px-6 py-4 border-b border-white/[0.06] flex items-center justify-between">
              <div>
                <h3 className="text-base font-medium text-white">
                  {tText("dashboard.reportModalTitle", "Rapor İndir")}
                </h3>
                <p className="text-xs text-zinc-400 mt-0.5">
                  {tText("dashboard.reportModalSubtitle", "Özet rapor indirin")}
                </p>
              </div>
              <button onClick={() => setIsReportOpen(false)} className="text-zinc-500 hover:text-white cursor-pointer">
                <X size={18} />
              </button>
            </div>
            <div className="p-6">
              <p className="text-sm text-zinc-300 leading-relaxed">
                {tText("dashboard.reportModalDesc", "Şubenize ait performans, müşteri ve finansal özet verileri Excel uyumlu CSV formatında indirilecektir.")}
              </p>
            </div>
            <div className="px-6 py-4 border-t border-white/[0.06] bg-[#080A09]/60 flex justify-end gap-2.5">
              <Button
                variant="outline"
                className="rounded-full cursor-pointer"
                onClick={() => setIsReportOpen(false)}
              >
                {tText("common.close", "Kapat")}
              </Button>
              <Button
                className="bg-[#34D399] text-[#061811] font-medium rounded-full cursor-pointer"
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
