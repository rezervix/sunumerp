"use client"

import { useState, useEffect } from "react"
import { BarChart, Bar, LineChart, Line, PieChart, Pie, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, Legend } from "recharts"
import { Loader2, TrendingUp, BarChart2, PieChart as PieIcon, FileText, Download, Eye, Award } from "lucide-react"
import { toast } from "sonner"

interface AnalyticsData {
  topViewed: any[]
  topDownloaded: any[]
  nicheDistribution: any[]
  statusRates: any[]
  trendData: any[]
}

const COLORS = ["#3B82F6", "#10B981", "#F59E0B", "#EF4444", "#8B5CF6", "#EC4899"]

export function AnalyticsView() {
  const [loading, setLoading] = useState(true)
  const [data, setData] = useState<AnalyticsData | null>(null)

  useEffect(() => {
    const fetchAnalytics = async () => {
      try {
        const res = await fetch("/api/content-store/analytics")
        if (!res.ok) throw new Error("Analiz verileri alınamadı")
        const stats = await res.json()
        setData(stats)
      } catch (err: any) {
        toast.error(err.message || "Analiz yüklenirken hata oluştu")
      } finally {
        setLoading(false)
      }
    }
    fetchAnalytics()
  }, [])

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-32 gap-3 text-muted-foreground">
        <Loader2 className="animate-spin text-primary size-8" />
        <span className="text-sm font-medium">Analitik verileri hesaplanıyor...</span>
      </div>
    )
  }

  if (!data) return null

  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="rounded-xl border border-border bg-card p-5 shadow-xs flex items-center gap-4">
          <div className="size-12 rounded-lg bg-blue-500/10 flex items-center justify-center text-blue-600 dark:text-blue-400">
            <TrendingUp size={24} />
          </div>
          <div>
            <p className="text-xs text-muted-foreground uppercase font-semibold">Toplam Yükleme Hacmi</p>
            <h3 className="text-2xl font-bold mt-1 text-foreground">
              {data.trendData.reduce((acc, curr) => acc + curr.uploads, 0)}
              <span className="text-xs font-normal text-muted-foreground ml-1">(Son 30 Gün)</span>
            </h3>
          </div>
        </div>

        <div className="rounded-xl border border-border bg-card p-5 shadow-xs flex items-center gap-4">
          <div className="size-12 rounded-lg bg-emerald-500/10 flex items-center justify-center text-emerald-600 dark:text-emerald-400">
            <Award size={24} />
          </div>
          <div>
            <p className="text-xs text-muted-foreground uppercase font-semibold">Onay Hacmi</p>
            <h3 className="text-2xl font-bold mt-1 text-foreground">
              {data.trendData.reduce((acc, curr) => acc + curr.approvals, 0)}
              <span className="text-xs font-normal text-muted-foreground ml-1">(Son 30 Gün)</span>
            </h3>
          </div>
        </div>

        <div className="rounded-xl border border-border bg-card p-5 shadow-xs flex items-center gap-4">
          <div className="size-12 rounded-lg bg-purple-500/10 flex items-center justify-center text-purple-600 dark:text-purple-400">
            <Eye size={24} />
          </div>
          <div>
            <p className="text-xs text-muted-foreground uppercase font-semibold">Toplam İzlenme / İndirme</p>
            <h3 className="text-2xl font-bold mt-1 text-foreground">
              {data.topViewed.reduce((acc, curr) => acc + curr.viewCount, 0)} / {data.topDownloaded.reduce((acc, curr) => acc + curr.downloadCount, 0)}
              <span className="text-xs font-normal text-muted-foreground ml-1">(Top 10 Toplamı)</span>
            </h3>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="rounded-xl border border-border bg-card p-5 shadow-xs space-y-4">
          <div className="flex items-center gap-2 border-b border-border/60 pb-3">
            <TrendingUp className="text-primary size-5" />
            <h4 className="text-sm font-bold text-foreground">Son 30 Günlük Aktivite</h4>
          </div>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={data.trendData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="date" />
                <YAxis allowDecimals={false} />
                <Tooltip />
                <Legend />
                <Line type="monotone" dataKey="uploads" name="Yüklenen" stroke="#3B82F6" strokeWidth={2} activeDot={{ r: 8 }} />
                <Line type="monotone" dataKey="approvals" name="Onaylanan" stroke="#10B981" strokeWidth={2} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="rounded-xl border border-border bg-card p-5 shadow-xs space-y-4">
          <div className="flex items-center gap-2 border-b border-border/60 pb-3">
            <BarChart2 className="text-primary size-5" />
            <h4 className="text-sm font-bold text-foreground">Niş Dağılım Grafiği</h4>
          </div>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data.nicheDistribution}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="name" />
                <YAxis allowDecimals={false} />
                <Tooltip />
                <Bar dataKey="value" name="Dosya Sayısı" fill="#3B82F6" radius={[4, 4, 0, 0]}>
                  {data.nicheDistribution.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="rounded-xl border border-border bg-card p-5 shadow-xs space-y-4">
          <div className="flex items-center gap-2 border-b border-border/60 pb-3">
            <PieIcon className="text-primary size-5" />
            <h4 className="text-sm font-bold text-foreground">Kalite Kontrol / Onay Dağılımı</h4>
          </div>
          <div className="h-72 flex flex-col md:flex-row items-center justify-center">
            {data.statusRates.length === 0 ? (
              <div className="text-muted-foreground text-sm">Veri bulunamadı.</div>
            ) : (
              <>
                <div className="w-full md:w-2/3 h-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={data.statusRates}
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={80}
                        paddingAngle={5}
                        dataKey="value"
                      >
                        {data.statusRates.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <div className="flex flex-col gap-2 shrink-0 md:w-1/3">
                  {data.statusRates.map((entry, index) => (
                    <div key={entry.name} className="flex items-center gap-2">
                      <div className="size-3 rounded-full" style={{ backgroundColor: COLORS[index % COLORS.length] }} />
                      <span className="text-xs font-semibold text-foreground">
                        {entry.name}: {entry.value} adet
                      </span>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
        </div>

        <div className="rounded-xl border border-border bg-card p-5 shadow-xs space-y-4">
          <div className="flex items-center gap-2 border-b border-border/60 pb-3">
            <FileText className="text-primary size-5" />
            <h4 className="text-sm font-bold text-foreground">Popüler İçerik Listesi (İzlenme/İndirme)</h4>
          </div>
          <div className="h-72 overflow-y-auto">
            <table className="w-full text-xs text-left">
              <thead>
                <tr className="border-b border-border bg-muted/30 text-muted-foreground font-bold">
                  <th className="p-2">Dosya Adı</th>
                  <th className="p-2">Görüntüleme</th>
                  <th className="p-2">İndirme</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {data.topViewed.map(item => (
                  <tr key={item.id} className="hover:bg-muted/10">
                    <td className="p-2 font-medium truncate max-w-xs">{item.originalName}</td>
                    <td className="p-2 text-blue-600 font-bold">{item.viewCount || 0}</td>
                    <td className="p-2 text-emerald-600 font-bold">{item.downloadCount || 0}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  )
}
