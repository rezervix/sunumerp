"use client"

import { useState, useEffect } from "react"
import { useAuth } from "@/lib/auth/context"
import { toast } from "sonner"
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, Cell, PieChart, Pie, Legend, ResponsiveContainer,
} from "recharts"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  Download, Users, TrendingUp,
  DollarSign, ShoppingBag, ArrowUpRight, History, X
} from "lucide-react"
import { useRouter } from "next/navigation"
import { ContextualHelp } from "@/components/shared/contextual-help"
import { useLanguage } from "@/lib/context/LanguageContext"
import { mockDatabase } from "@/lib/data/mockDatabase"

const PIE_COLORS = ["#34D399", "#2DD4BF", "#10B981", "#14B8A6", "#6EE7B7"]

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

  const pieData =
    statsData.spendingByKind.length > 0
      ? statsData.spendingByKind
      : [{ name: tText("dashboard.general", "Genel"), value: statsData.expense || 0 }]

  return (
    <div className="space-y-6">

      {/* ── Page Header ── */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
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
      </div>

      {/* ── 1. KUTUSUZ (BORDERLESS) ÜST KPI ŞERİDİ ── */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-8 py-4 border-b border-white/[0.06]">
        {statDef.map(s => {
          const rawVal = statsData[s.key as keyof typeof statsData]
          const numVal = Number(rawVal) || 0
          const display = s.isCurrency
            ? `₺${numVal.toLocaleString("tr-TR")}`
            : String(rawVal)

          const netDiff = s.key === "income"
            ? (statsData.income || 0) - (statsData.expense || 0)
            : numVal
          const isPositive = netDiff >= 0

          return (
            <div key={s.key} className="flex flex-col gap-2">
              <div className="flex items-center gap-1.5 text-[11px] uppercase tracking-wider text-zinc-400 font-medium">
                <s.Icon size={13} className="text-zinc-500 shrink-0" />
                <span className="truncate">{tText(s.titleKey, s.fallback)}</span>
              </div>
              <div className="flex items-baseline gap-2.5 flex-wrap">
                <span className="text-4xl font-light text-white tracking-tight tabular-nums">
                  {display}
                </span>
                <span
                  className={
                    isPositive
                      ? "bg-emerald-500/10 text-emerald-400 text-xs px-2 py-0.5 rounded-full font-medium tabular-nums"
                      : "bg-rose-500/10 text-rose-400 text-xs px-2 py-0.5 rounded-full font-medium tabular-nums"
                  }
                >
                  {isPositive ? `+${s.deltaValue}%` : `-${s.deltaValue}%`}
                </span>
              </div>
            </div>
          )
        })}
      </div>

      {/* ── 2. GRAFİK VE BENTO KARTLARI ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 lg:gap-5">

        {/* Bar Chart Bento Card */}
        <div className="bg-[#111513] border border-white/[0.06] rounded-[20px] p-6 lg:col-span-2 flex flex-col">
          <div className="flex items-start justify-between gap-4 pb-6">
            <div>
              <p className="text-[11px] uppercase tracking-[0.12em] text-zinc-400 font-medium">
                {tText("dashboard.incomeExpenseAnalysis", "Gelir / Gider Analizi")} · {tText("dashboard.netProfitLoss", "Net Kâr/Zarar")}
              </p>
              <div className="flex items-baseline gap-2.5 mt-1">
                <span className="font-light text-2xl text-white tracking-tight tabular-nums">
                  ₺{((statsData.income || 0) - (statsData.expense || 0)).toLocaleString("tr-TR")}
                </span>
                <span className="bg-emerald-500/10 text-emerald-400 text-xs px-2 py-0.5 rounded-full font-medium">
                  Net Bilanço
                </span>
              </div>
            </div>

            {/* 7G | 30G | 90G Pill Filter */}
            <div className="bg-[#080A09] border border-white/[0.06] rounded-full p-1 flex items-center gap-0.5 text-[11px] text-zinc-400 shrink-0 select-none">
              <span className="px-2.5 py-0.5 rounded-full hover:text-white transition-colors cursor-pointer">7G</span>
              <span className="px-2.5 py-0.5 rounded-full bg-white/10 text-white font-medium">30G</span>
              <span className="px-2.5 py-0.5 rounded-full hover:text-white transition-colors cursor-pointer">90G</span>
            </div>
          </div>

          <div className="h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={barData} barSize={44}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(255, 255, 255, 0.05)" />
                <XAxis
                  dataKey="name"
                  axisLine={false}
                  tickLine={false}
                  tick={{ fontSize: 12, fill: "#a1a1aa", fontWeight: 400 }}
                />
                <YAxis
                  axisLine={false}
                  tickLine={false}
                  tick={{ fontSize: 11, fill: "#71717a" }}
                  tickFormatter={v => `₺${v}`}
                  width={68}
                />
                <Tooltip
                  cursor={{ fill: "rgba(255, 255, 255, 0.03)", radius: 8 }}
                  contentStyle={{
                    borderRadius: 14,
                    border: "1px solid rgba(255, 255, 255, 0.06)",
                    background: "rgba(17, 21, 19, 0.95)",
                    backdropFilter: "blur(12px)",
                    color: "#ffffff",
                    boxShadow: "0 12px 32px rgba(0, 0, 0, 0.55)",
                    fontSize: 12,
                    padding: "8px 12px",
                  }}
                  itemStyle={{ color: "#34D399", fontWeight: 500 }}
                  formatter={(v: number) => [`₺${v.toLocaleString("tr-TR")}`, ""]}
                />
                <Bar dataKey="value" radius={[10, 10, 0, 0]}>
                  <Cell fill="#34D399" />
                  <Cell fill="#2DD4BF" />
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Pie Chart Bento Card */}
        <div className="bg-[#111513] border border-white/[0.06] rounded-[20px] p-6 flex flex-col">
          <div className="flex items-start justify-between gap-3 pb-5">
            <div>
              <p className="text-[11px] uppercase tracking-[0.12em] text-zinc-400 font-medium">
                {tText("dashboard.expenseDistribution", "Harcama Dağılımı")}
              </p>
              <p className="font-light text-2xl text-white tracking-tight tabular-nums mt-1">
                ₺{(statsData.expense || 0).toLocaleString("tr-TR")}
              </p>
            </div>

            {/* 7G | 30G | 90G Pill Filter */}
            <div className="bg-[#080A09] border border-white/[0.06] rounded-full p-1 flex items-center gap-0.5 text-[11px] text-zinc-400 shrink-0 select-none">
              <span className="px-2 py-0.5 rounded-full hover:text-white transition-colors cursor-pointer">7G</span>
              <span className="px-2 py-0.5 rounded-full bg-white/10 text-white font-medium">30G</span>
              <span className="px-2 py-0.5 rounded-full hover:text-white transition-colors cursor-pointer">90G</span>
            </div>
          </div>

          <div className="h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={pieData}
                  cx="50%"
                  cy="45%"
                  innerRadius={56}
                  outerRadius={84}
                  paddingAngle={4}
                  stroke="#111513"
                  strokeWidth={2}
                  dataKey="value"
                >
                  {pieData.map((_, i) => (
                    <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{
                    borderRadius: 14,
                    border: "1px solid rgba(255, 255, 255, 0.06)",
                    background: "rgba(17, 21, 19, 0.95)",
                    backdropFilter: "blur(12px)",
                    color: "#ffffff",
                    fontSize: 12,
                    padding: "8px 12px",
                  }}
                  itemStyle={{ color: "#34D399", fontWeight: 500 }}
                />
                <Legend
                  verticalAlign="bottom"
                  height={36}
                  iconSize={8}
                  iconType="circle"
                  wrapperStyle={{ paddingTop: "16px" }}
                  formatter={v => <span style={{ color: "#a1a1aa", fontSize: 12, fontWeight: 400 }}>{v}</span>}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* ── Recent Activity Bento Card ── */}
      <div className="bg-[#111513] border border-white/[0.06] rounded-[20px] p-6">
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
            <div className="divide-y divide-white/[0.06]">
              {statsData.recentActivities.map((activity: any) => (
                <div key={activity.id} className="py-3.5 first:pt-0 last:pb-0 flex items-start justify-between gap-4">
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
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

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

    </div>
  )
}
