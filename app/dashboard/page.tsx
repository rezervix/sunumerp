"use client"

import { useState, useEffect } from "react"
import { useAuth } from "@/lib/auth/context"
import { toast } from "sonner"
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, Cell, PieChart, Pie, Legend, ResponsiveContainer,
} from "recharts"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  Download, Plus, Users, FolderOpen, TrendingUp, TrendingDown,
  CreditCard, DollarSign, ShoppingBag, ArrowUpRight, History, X
} from "lucide-react"
import { motion } from "framer-motion"
import { useRouter } from "next/navigation"
import { ContextualHelp } from "@/components/shared/contextual-help"
import { useLanguage } from "@/lib/context/LanguageContext"
import { mockDatabase } from "@/lib/data/mockDatabase"

const PIE_COLORS = ["#10b981", "#f59e0b", "#38bdf8", "#a855f7", "#fb7185"]

const statDef = [
  {
    key: "customers",
    titleKey: "dashboard.totalCustomers",
    fallback: "Toplam Müşteri",
    Icon: Users,
    colorLight: "rgba(56, 189, 248, 0.15)",
    colorDark: "#0c4a6e",
    iconColor: "#38bdf8",
    iconColorDark: "#38bdf8",
    badgeText: "Aktif Portföy",
    deltaValue: 12.4,
  },
  {
    key: "activeProjects",
    titleKey: "dashboard.activeProjects",
    fallback: "Aktif Projeler",
    Icon: ShoppingBag,
    colorLight: "rgba(16, 185, 129, 0.15)",
    colorDark: "#064e3b",
    iconColor: "#34d399",
    iconColorDark: "#34d399",
    badgeText: "Canlı Operasyon",
    deltaValue: 8.2,
  },
  {
    key: "leads",
    titleKey: "dashboard.leads",
    fallback: "Potansiyeller",
    Icon: TrendingUp,
    colorLight: "rgba(245, 158, 11, 0.15)",
    colorDark: "#78350f",
    iconColor: "#fbbf24",
    iconColorDark: "#fbbf24",
    badgeText: "Fırsat Havuzu",
    deltaValue: 15.8,
  },
  {
    key: "income",
    titleKey: "dashboard.monthlyIncome",
    fallback: "Aylık Gelir",
    Icon: DollarSign,
    colorLight: "rgba(16, 185, 129, 0.15)",
    colorDark: "#064e3b",
    iconColor: "#10b981",
    iconColorDark: "#34d399",
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
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-6">
        <div>
          <h1 className="text-3xl lg:text-4xl font-bold text-white tracking-tight flex items-center gap-2">
            {tText("dashboard.title", t.nav.dashboard)}
            <ContextualHelp />
          </h1>
          <p className="text-white/60 mt-1.5 text-sm">
            {currentBranch
              ? `${currentBranch.name} · ${tText("dashboard.subtitle", "İşletme verilerinize genel bakış")}`
              : tText("dashboard.subtitle", "İşletme verilerinize genel bakış")}
          </p>
        </div>
        <div className="flex gap-3 shrink-0 w-full sm:w-auto">
          <Button
            variant="outline"
            size="sm"
            className="gap-2 flex-1 sm:flex-none glass-input hover:bg-white/10 text-white border-white/15 h-9 px-4 cursor-pointer"
            onClick={() => setIsReportOpen(true)}
          >
            <Download size={16} className="text-emerald-400" />
            <span>{tText("dashboard.report", "Rapor")}</span>
          </Button>
        </div>
      </div>

      {/* ── KPI Cards (StatCards) ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 lg:gap-5">
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
            <motion.div
              key={s.key}
              whileHover={{ y: -5 }}
              transition={{ type: "spring", stiffness: 300, damping: 22 }}
              className="glass-card p-6 rounded-2xl relative overflow-hidden group"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-white/60 truncate">
                    {tText(s.titleKey, s.fallback)}
                  </p>
                  <p className="text-2xl font-bold text-white mt-1 tracking-tight">
                    {display}
                  </p>
                </div>
                <div
                  className="size-11 rounded-2xl flex items-center justify-center shrink-0 border border-white/10 transition-transform duration-300 group-hover:scale-110"
                  style={{ backgroundColor: s.colorLight }}
                >
                  <s.Icon size={22} style={{ color: s.iconColor }} />
                </div>
              </div>

              <div className="mt-4 pt-3 border-t border-white/10 flex items-center justify-between text-xs">
                <span
                  className={`inline-flex items-center gap-1 font-semibold ${
                    isPositive ? "text-emerald-400" : "text-rose-400"
                  }`}
                >
                  {isPositive ? (
                    <ArrowUpRight size={14} className="shrink-0" />
                  ) : (
                    <TrendingDown size={14} className="shrink-0" />
                  )}
                  {s.key === "income"
                    ? `${isPositive ? "+" : ""}₺${netDiff.toLocaleString("tr-TR")} Net`
                    : `+${s.deltaValue}%`}
                </span>
                <span className="text-white/45 text-[11px] font-medium">
                  {s.badgeText}
                </span>
              </div>

              <div
                className="absolute bottom-0 left-0 right-0 h-0.5 scale-x-0 origin-left transition-transform duration-300 group-hover:scale-x-100"
                style={{ background: `linear-gradient(90deg, ${s.iconColor}40, ${s.iconColor})` }}
              />
            </motion.div>
          )
        })}
      </div>

      {/* ── Charts + Activity ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 lg:gap-5">

        {/* Bar Chart */}
        <div className="glass-card p-6 rounded-2xl lg:col-span-2 flex flex-col">
          <div className="flex items-center justify-between gap-4 pb-5">
            <div>
              <h2 className="text-lg font-semibold text-white">
                {tText("dashboard.incomeExpenseAnalysis", "Gelir / Gider Analizi")}
              </h2>
              <p className="text-xs text-white/50 mt-0.5">
                {tText("dashboard.netProfitLoss", "Net Kâr/Zarar")}:{" "}
                <span
                  className={
                    (statsData.income || 0) - (statsData.expense || 0) >= 0
                      ? "text-emerald-400 font-semibold"
                      : "text-rose-400 font-semibold"
                  }
                >
                  ₺{((statsData.income || 0) - (statsData.expense || 0)).toLocaleString("tr-TR")}
                </span>
              </p>
            </div>
            <Badge
              variant="secondary"
              className="text-xs px-3 py-1 bg-sky-500/15 text-sky-300 border border-sky-400/25"
            >
              {tText("dashboard.thisMonth", "Bu ay")}
            </Badge>
          </div>
          <div className="h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={barData} barSize={44}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(255, 255, 255, 0.08)" />
                <XAxis
                  dataKey="name"
                  axisLine={false}
                  tickLine={false}
                  tick={{ fontSize: 13, fill: "rgba(255, 255, 255, 0.7)", fontWeight: 500 }}
                />
                <YAxis
                  axisLine={false}
                  tickLine={false}
                  tick={{ fontSize: 12, fill: "rgba(255, 255, 255, 0.55)" }}
                  tickFormatter={v => `₺${v}`}
                  width={68}
                />
                <Tooltip
                  cursor={{ fill: "rgba(255, 255, 255, 0.05)", radius: 8 }}
                  contentStyle={{
                    borderRadius: 14,
                    border: "1px solid rgba(255, 255, 255, 0.15)",
                    background: "rgba(15, 23, 42, 0.9)",
                    backdropFilter: "blur(12px)",
                    color: "#ffffff",
                    boxShadow: "0 8px 32px rgba(0, 0, 0, 0.45)",
                    fontSize: 13,
                    padding: "10px 14px",
                  }}
                  itemStyle={{ color: "#ffffff", fontWeight: 600 }}
                  formatter={(v: number) => [`₺${v.toLocaleString("tr-TR")}`, ""]}
                />
                <Bar dataKey="value" radius={[10, 10, 0, 0]}>
                  <Cell fill="#10b981" />
                  <Cell fill="#f59e0b" />
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Pie Chart */}
        <div className="glass-card p-6 rounded-2xl flex flex-col">
          <div className="pb-5">
            <h2 className="text-lg font-semibold text-white">
              {tText("dashboard.expenseDistribution", "Harcama Dağılımı")}
            </h2>
            <p className="text-xs text-white/50 mt-0.5">
              Kategori bazlı gider kırılımı
            </p>
          </div>
          <div className="h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={pieData}
                  cx="50%"
                  cy="45%"
                  innerRadius={55}
                  outerRadius={85}
                  paddingAngle={4}
                  stroke="rgba(15, 23, 42, 0.6)"
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
                    border: "1px solid rgba(255, 255, 255, 0.15)",
                    background: "rgba(15, 23, 42, 0.9)",
                    backdropFilter: "blur(12px)",
                    color: "#ffffff",
                    fontSize: 13,
                    padding: "10px 14px",
                  }}
                  itemStyle={{ color: "#ffffff", fontWeight: 600 }}
                />
                <Legend
                  verticalAlign="bottom"
                  height={36}
                  iconSize={8}
                  iconType="circle"
                  wrapperStyle={{ paddingTop: "16px" }}
                  formatter={v => <span style={{ color: "rgba(255, 255, 255, 0.75)", fontSize: 12, fontWeight: 500 }}>{v}</span>}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* ── Recent Activity ── */}
      <div className="glass-card p-6 rounded-2xl">
        <div className="flex items-center justify-between gap-4 pb-5">
          <div className="flex items-center gap-3">
            <div className="size-10 rounded-xl bg-sky-500/15 border border-sky-400/25 flex items-center justify-center">
              <History size={18} className="text-sky-400" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-white">
                {tText("dashboard.recentActivities", "Son Aktiviteler")}
              </h2>
              <p className="text-xs text-white/50">Sistem ve şube üzerindeki son işlemler</p>
            </div>
          </div>
          <Button
            onClick={() => router.push("/dashboard/todos")}
            variant="ghost"
            size="sm"
            className="text-emerald-400 hover:text-emerald-300 text-xs h-8 px-3 font-medium bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-400/20 rounded-xl cursor-pointer"
          >
            {tText("common.viewAll", "Tümü")}
            <ArrowUpRight size={14} className="ml-1" />
          </Button>
        </div>

        <div>
          {statsData.recentActivities.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 gap-4">
              <div className="size-14 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center">
                <History size={28} className="text-white/40" />
              </div>
              <div className="text-center">
                <p className="text-sm font-medium text-white/70">
                  {tText("dashboard.noActivities", "Henüz aktivite yok")}
                </p>
                <p className="text-xs text-white/45 mt-1">
                  {tText("dashboard.activitiesHint", "Etkinlikler burada görüntülenecektir")}
                </p>
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              {statsData.recentActivities.map((activity: any, i: number) => (
                <div key={activity.id} className="activity-item relative flex gap-4 pb-4 last:pb-0">
                  {i < statsData.recentActivities.length - 1 && (
                    <div className="activity-line absolute left-[13px] top-9 bottom-0 w-px bg-white/10" />
                  )}
                  <div className="activity-dot size-7 rounded-full bg-emerald-500/15 border border-emerald-400/30 mt-1 shrink-0 z-10 flex items-center justify-center">
                    <div className="size-2 rounded-full bg-emerald-400 shadow-[0_0_8px_#34d399]" />
                  </div>
                  <div className="flex-1 min-w-0 pt-0.5 p-3 rounded-xl bg-white/[0.03] hover:bg-white/[0.06] border border-white/5 transition-colors">
                    <div className="flex items-start justify-between gap-2 mb-1">
                      <Badge
                        variant="secondary"
                        className="text-[10px] h-5 px-2 font-semibold uppercase tracking-wide bg-amber-500/15 text-amber-300 border border-amber-400/25"
                      >
                        {activity.type}
                      </Badge>
                      <span className="text-[11px] text-white/50 shrink-0 font-medium">{activity.time}</span>
                    </div>
                    <p className="text-sm text-white/80 leading-relaxed">{activity.description}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Report Modal */}
      {isReportOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-md">
          <div className="glass-panel rounded-2xl w-full max-w-md overflow-hidden text-white">
            <div className="px-6 py-4 border-b border-white/10 flex items-center justify-between bg-white/5">
              <div>
                <h3 className="text-lg font-bold text-white">
                  {tText("dashboard.reportModalTitle", "Rapor İndir")}
                </h3>
                <p className="text-sm text-white/60">
                  {tText("dashboard.reportModalSubtitle", "Özet rapor indirin")}
                </p>
              </div>
              <button onClick={() => setIsReportOpen(false)} className="text-white/50 hover:text-white cursor-pointer">
                <X size={20} />
              </button>
            </div>
            <div className="p-6">
              <p className="text-sm text-white/80 leading-relaxed">
                {tText("dashboard.reportModalDesc", "Şubenize ait performans, müşteri ve finansal özet verileri Excel uyumlu CSV formatında indirilecektir.")}
              </p>
            </div>
            <div className="px-6 py-4 border-t border-white/10 bg-black/20 flex justify-end gap-3">
              <Button
                variant="outline"
                className="glass-input hover:bg-white/10 text-white border-white/15 cursor-pointer"
                onClick={() => setIsReportOpen(false)}
              >
                {tText("common.close", "Kapat")}
              </Button>
              <Button
                className="bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-semibold cursor-pointer"
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
