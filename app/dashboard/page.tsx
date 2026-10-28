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
import { Download, Plus, Users, FolderOpen, TrendingUp, CreditCard, History, X } from "lucide-react"
import { useRouter } from "next/navigation"
import { ContextualHelp } from "@/components/shared/contextual-help"
import { useLanguage } from "@/lib/context/LanguageContext"
import { mockDatabase } from "@/lib/data/mockDatabase"

const PIE_COLORS = ["#004aad", "#3b82f6", "#60a5fa", "#93c5fd", "#bfdbfe"]

const statDef = [
  {
    key: "customers",
    titleKey: "dashboard.totalCustomers",
    fallback: "Toplam Müşteri",
    Icon: Users,
    colorLight: "#EEF3FB",
    colorDark: "#1E2E4A",
    iconColor: "#004aad",
    iconColorDark: "#4B8EF0",
  },
  {
    key: "activeProjects",
    titleKey: "dashboard.activeProjects",
    fallback: "Aktif Projeler",
    Icon: FolderOpen,
    colorLight: "#ECFDF5",
    colorDark: "#0F2B1E",
    iconColor: "#059669",
    iconColorDark: "#34D399",
  },
  {
    key: "leads",
    titleKey: "dashboard.leads",
    fallback: "Potansiyeller",
    Icon: TrendingUp,
    colorLight: "#FFFBEB",
    colorDark: "#2B1F07",
    iconColor: "#D97706",
    iconColorDark: "#FBBF24",
  },
  {
    key: "income",
    titleKey: "dashboard.monthlyIncome",
    fallback: "Aylık Gelir",
    Icon: CreditCard,
    colorLight: "#FDF4FF",
    colorDark: "#23103A",
    iconColor: "#9333EA",
    iconColorDark: "#C084FC",
    isCurrency: true,
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
          <h1 className="text-3xl lg:text-4xl font-bold text-foreground tracking-tight flex items-center gap-1">
            {tText("dashboard.title", t.nav.dashboard)}
            <ContextualHelp />
          </h1>
          <p className="text-muted-foreground mt-2">
            {currentBranch
              ? `${currentBranch.name} · ${tText("dashboard.subtitle", "İşletme verilerinize genel bakış")}`
              : tText("dashboard.subtitle", "İşletme verilerinize genel bakış")}
          </p>
        </div>
        <div className="flex gap-3 shrink-0 w-full sm:w-auto">
          <Button variant="outline" size="sm" className="gap-2 flex-1 sm:flex-none" onClick={() => setIsReportOpen(true)}>
            <Download size={16} />
            <span>{tText("dashboard.report", "Rapor")}</span>
          </Button>
        </div>
      </div>

      {/* ── KPI Cards (Bento) ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 lg:gap-5">
        {statDef.map(s => {
          const rawVal = statsData[s.key as keyof typeof statsData]
          const display = s.isCurrency
            ? `₺${Number(rawVal).toLocaleString("tr-TR")}`
            : String(rawVal)

          return (
            <Card key={s.key} className="kpi-card group border-border overflow-hidden transition-all duration-300 hover:shadow-lg">
              <CardContent className="p-5 lg:p-6">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2 truncate">
                      {tText(s.titleKey, s.fallback)}
                    </p>
                    <p className="text-2xl sm:text-3xl lg:text-4xl font-bold text-foreground tracking-tight">{display}</p>
                  </div>
                  <div
                    className="kpi-icon size-11 sm:size-12 rounded-2xl flex items-center justify-center shrink-0 transition-all duration-300 group-hover:scale-110 group-hover:shadow-md"
                    style={{ backgroundColor: s.colorLight }}
                  >
                    <s.Icon size={24} style={{ color: s.iconColor }} />
                  </div>
                </div>
              </CardContent>
              <div
                className="kpi-accent absolute bottom-0 left-0 right-0 h-1 scale-x-0 origin-left transition-transform duration-300 group-hover:scale-x-100"
                style={{ background: `linear-gradient(90deg, ${s.iconColor}60, ${s.iconColor})` }}
              />
            </Card>
          )
        })}
      </div>

      {/* ── Charts + Activity ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 lg:gap-5">

        {/* Bar Chart */}
        <Card className="lg:col-span-2 border-border shadow-soft">
          <CardHeader className="pb-4 lg:pb-6">
            <div className="flex items-center justify-between gap-4">
              <CardTitle className="text-lg font-semibold">
                {tText("dashboard.incomeExpenseAnalysis", "Gelir / Gider Analizi")}
              </CardTitle>
              <Badge variant="secondary" className="text-xs px-3 py-1">
                {tText("dashboard.thisMonth", "Bu ay")}
              </Badge>
            </div>
          </CardHeader>
          <CardContent>
            <div className="h-72 w-full -mx-6 px-6">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={barData} barSize={40}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border)" />
                  <XAxis
                    dataKey="name"
                    axisLine={false}
                    tickLine={false}
                    tick={{ fontSize: 13, fill: "var(--muted-foreground)", fontWeight: 500 }}
                  />
                  <YAxis
                    axisLine={false}
                    tickLine={false}
                    tick={{ fontSize: 12, fill: "var(--muted-foreground)" }}
                    tickFormatter={v => `₺${v}`}
                    width={65}
                  />
                  <Tooltip
                    cursor={{ fill: "var(--muted)", opacity: 0.5, radius: 8 }}
                    contentStyle={{
                      borderRadius: 12,
                      border: "1px solid var(--border)",
                      background: "var(--card)",
                      color: "var(--foreground)",
                      boxShadow: "var(--shadow-lg)",
                      fontSize: 14,
                      padding: "12px 16px",
                    }}
                    formatter={(v: number) => [`₺${v.toLocaleString("tr-TR")}`, ""]}
                  />
                  <Bar dataKey="value" radius={[8, 8, 0, 0]}>
                    <Cell fill="var(--primary)" />
                    <Cell fill="var(--destructive)" />
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Pie Chart */}
        <Card className="border-border shadow-soft">
          <CardHeader className="pb-4 lg:pb-6">
            <CardTitle className="text-lg font-semibold">
              {tText("dashboard.expenseDistribution", "Harcama Dağılımı")}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-72 w-full -mx-6 px-6">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={pieData}
                    cx="50%"
                    cy="45%"
                    innerRadius={55}
                    outerRadius={85}
                    paddingAngle={4}
                    dataKey="value"
                  >
                    {pieData.map((_, i) => (
                      <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      borderRadius: 12,
                      border: "1px solid var(--border)",
                      background: "var(--card)",
                      color: "var(--foreground)",
                      fontSize: 14,
                      padding: "12px 16px",
                    }}
                  />
                  <Legend
                    verticalAlign="bottom"
                    height={36}
                    iconSize={8}
                    iconType="circle"
                    wrapperStyle={{ paddingTop: "16px" }}
                    formatter={v => <span style={{ color: "var(--muted-foreground)", fontSize: 13, fontWeight: 500 }}>{v}</span>}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* ── Recent Activity ── */}
      <Card className="border-border shadow-soft">
        <CardHeader className="pb-4 lg:pb-6">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="activity-icon size-9 rounded-xl bg-secondary flex items-center justify-center">
                <History size={18} className="text-secondary-foreground" />
              </div>
              <CardTitle className="text-lg font-semibold">
                {tText("dashboard.recentActivities", "Son Aktiviteler")}
              </CardTitle>
            </div>
            <Button onClick={() => router.push("/dashboard/todos")} variant="ghost" size="sm" className="text-primary text-xs h-8 px-3 font-medium hover:bg-primary/10">
              {tText("common.viewAll", "Tümü")}
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {statsData.recentActivities.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 gap-4">
              <div className="size-14 rounded-2xl bg-muted/60 flex items-center justify-center">
                <History size={28} className="text-muted-foreground/60" />
              </div>
              <div className="text-center">
                <p className="text-sm font-medium text-muted-foreground">
                  {tText("dashboard.noActivities", "Henüz aktivite yok")}
                </p>
                <p className="text-xs text-muted-foreground/70 mt-1">
                  {tText("dashboard.activitiesHint", "Etkinlikler burada görüntülenecektir")}
                </p>
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              {statsData.recentActivities.map((activity: any, i: number) => (
                <div key={activity.id} className="activity-item relative flex gap-4 pb-4 last:pb-0">
                  {i < statsData.recentActivities.length - 1 && (
                    <div className="activity-line absolute left-[13px] top-10 bottom-0 w-0.5 bg-border" />
                  )}
                  <div className="activity-dot size-7 rounded-full bg-primary/15 ring-2 ring-card mt-1 shrink-0 z-10 flex items-center justify-center">
                    <div className="size-2.5 rounded-full bg-primary" />
                  </div>
                  <div className="flex-1 min-w-0 pt-0.5">
                    <div className="flex items-start justify-between gap-2 mb-1">
                      <Badge variant="secondary" className="text-[10px] h-5 px-2 font-semibold uppercase tracking-wide">
                        {activity.type}
                      </Badge>
                      <span className="text-[11px] text-muted-foreground shrink-0 font-medium">{activity.time}</span>
                    </div>
                    <p className="text-sm text-muted-foreground leading-relaxed">{activity.description}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Report Modal */}
      {isReportOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-card border border-border rounded-2xl w-full max-w-md overflow-hidden shadow-2xl">
            <div className="px-6 py-4 border-b border-border flex items-center justify-between">
              <div>
                <h3 className="text-lg font-bold text-foreground">
                  {tText("dashboard.reportModalTitle", "Rapor İndir")}
                </h3>
                <p className="text-sm text-muted-foreground">
                  {tText("dashboard.reportModalSubtitle", "Özet rapor indirin")}
                </p>
              </div>
              <button onClick={() => setIsReportOpen(false)} className="text-muted-foreground hover:text-foreground">
                <X size={20} />
              </button>
            </div>
            <div className="p-6">
              <p className="text-sm text-foreground">
                {tText("dashboard.reportModalDesc", "Şubenize ait performans, müşteri ve finansal özet verileri Excel uyumlu CSV formatında indirilecektir.")}
              </p>
            </div>
            <div className="px-6 py-4 border-t border-border bg-muted/30 flex justify-end gap-3">
              <Button variant="outline" onClick={() => setIsReportOpen(false)}>
                {tText("common.close", "Kapat")}
              </Button>
              <Button onClick={handleDownloadReport}>
                {tText("common.download", "İndir")}
              </Button>
            </div>
          </div>
        </div>
      )}

    </div>
  )
}
