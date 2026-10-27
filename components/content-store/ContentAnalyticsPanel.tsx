"use client"

import { useState, useEffect } from "react"
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line, Legend } from "recharts"
import { TrendingUp, Download, Eye, Package, Loader2, CheckCircle, Clock, XCircle } from "lucide-react"

const STATUS_COLORS: Record<string, string> = {
  approved: "#10b981",
  pending_approval: "#f59e0b",
  rejected: "#ef4444",
  draft: "#6b7280",
}

const CHART_COLORS = ["#6366f1","#8b5cf6","#ec4899","#f59e0b","#10b981","#3b82f6","#f97316","#14b8a6"]

interface AnalyticsData {
  topViewed: { id: string; originalName: string; viewCount: number; downloadCount: number; type: string; niche: { name: string } }[]
  nicheStats: { nicheName: string; count: number }[]
  dailyUploads: { date: string; uploads: number; approved: number }[]
  statusStats: { status: string; count: number }[]
  totals: { totalContent: number; totalViews: number; totalDownloads: number }
}

export function ContentAnalyticsPanel() {
  const [data, setData] = useState<AnalyticsData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetch("/api/content-store/analytics")
      .then(r => r.json())
      .then(d => { setData(d); setLoading(false) })
      .catch(e => { setError(e.message); setLoading(false) })
  }, [])

  if (loading) return (
    <div className="flex items-center justify-center py-20">
      <Loader2 size={32} className="animate-spin text-primary" />
    </div>
  )

  if (error) return (
    <div className="flex items-center justify-center py-20 text-red-500 text-sm">{error}</div>
  )

  if (!data) return null

  const statusMap: Record<string, { label: string; icon: React.ReactNode }> = {
    approved: { label: "Onaylı", icon: <CheckCircle size={14} className="text-emerald-500" /> },
    pending_approval: { label: "Onay Bekliyor", icon: <Clock size={14} className="text-amber-500" /> },
    rejected: { label: "Reddedildi", icon: <XCircle size={14} className="text-red-500" /> },
    draft: { label: "Taslak", icon: <Package size={14} className="text-muted-foreground" /> },
  }

  return (
    <div className="space-y-6 py-2">
      {/* Özet Kartları */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-card border border-border rounded-2xl p-5 flex items-center gap-4">
          <div className="size-12 rounded-xl bg-primary/10 flex items-center justify-center"><Package size={22} className="text-primary" /></div>
          <div>
            <p className="text-2xl font-bold">{data.totals.totalContent}</p>
            <p className="text-xs text-muted-foreground">Toplam İçerik</p>
          </div>
        </div>
        <div className="bg-card border border-border rounded-2xl p-5 flex items-center gap-4">
          <div className="size-12 rounded-xl bg-blue-500/10 flex items-center justify-center"><Eye size={22} className="text-blue-500" /></div>
          <div>
            <p className="text-2xl font-bold">{data.totals.totalViews.toLocaleString()}</p>
            <p className="text-xs text-muted-foreground">Toplam Görüntülenme</p>
          </div>
        </div>
        <div className="bg-card border border-border rounded-2xl p-5 flex items-center gap-4">
          <div className="size-12 rounded-xl bg-emerald-500/10 flex items-center justify-center"><Download size={22} className="text-emerald-500" /></div>
          <div>
            <p className="text-2xl font-bold">{data.totals.totalDownloads.toLocaleString()}</p>
            <p className="text-xs text-muted-foreground">Toplam İndirme</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Günlük Yükleme */}
        {data.dailyUploads.length > 0 && (
          <div className="bg-card border border-border rounded-2xl p-5">
            <h3 className="font-bold text-sm mb-4 flex items-center gap-2"><TrendingUp size={16} className="text-primary" /> Son 30 Gün Yükleme Hacmi</h3>
            <ResponsiveContainer width="100%" height={200}>
              <LineChart data={data.dailyUploads}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                <XAxis dataKey="date" tick={{ fontSize: 10 }} tickFormatter={v => v.slice(5)} />
                <YAxis tick={{ fontSize: 10 }} />
                <Tooltip formatter={(val: any, name: string) => [val, name === "uploads" ? "Toplam Yükleme" : "Onaylanan"]} labelFormatter={v => `Tarih: ${v}`} />
                <Legend formatter={v => v === "uploads" ? "Toplam Yükleme" : "Onaylanan"} wrapperStyle={{ fontSize: 11 }} />
                <Line type="monotone" dataKey="uploads" stroke="#6366f1" strokeWidth={2} dot={false} />
                <Line type="monotone" dataKey="approved" stroke="#10b981" strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}

        {/* Niş Dağılımı */}
        {data.nicheStats.length > 0 && (
          <div className="bg-card border border-border rounded-2xl p-5">
            <h3 className="font-bold text-sm mb-4 flex items-center gap-2"><Package size={16} className="text-primary" /> Niş Bazlı İçerik Dağılımı</h3>
            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie data={data.nicheStats} cx="50%" cy="50%" outerRadius={75} dataKey="count" nameKey="nicheName">
                  {data.nicheStats.map((_, i) => <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />)}
                </Pie>
                <Tooltip formatter={(val: any, name: string) => [`${val} içerik`, name]} />
                <Legend wrapperStyle={{ fontSize: 11 }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>

      {/* Durum Dağılımı */}
      {data.statusStats.length > 0 && (
        <div className="bg-card border border-border rounded-2xl p-5">
          <h3 className="font-bold text-sm mb-4">Durum Dağılımı</h3>
          <div className="flex flex-wrap gap-3">
            {data.statusStats.map(s => (
              <div key={s.status} className="flex items-center gap-2 bg-muted/40 border border-border rounded-xl px-4 py-3">
                {statusMap[s.status]?.icon}
                <div>
                  <p className="font-bold text-lg">{s.count}</p>
                  <p className="text-xs text-muted-foreground">{statusMap[s.status]?.label || s.status}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* En Çok Görüntülenen */}
      {data.topViewed.length > 0 && (
        <div className="bg-card border border-border rounded-2xl p-5">
          <h3 className="font-bold text-sm mb-4 flex items-center gap-2"><Eye size={16} className="text-primary" /> En Çok Görüntülenen İçerikler</h3>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={data.topViewed.slice(0, 8)} layout="vertical" margin={{ left: 0, right: 20 }}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
              <XAxis type="number" tick={{ fontSize: 10 }} />
              <YAxis type="category" dataKey="originalName" tick={{ fontSize: 10 }} width={100} tickFormatter={v => v.length > 18 ? v.substring(0, 18) + "..." : v} />
              <Tooltip formatter={(val: any, name: string) => [val, name === "viewCount" ? "Görüntülenme" : "İndirme"]} />
              <Legend formatter={v => v === "viewCount" ? "Görüntülenme" : "İndirme"} wrapperStyle={{ fontSize: 11 }} />
              <Bar dataKey="viewCount" fill="#6366f1" radius={[0, 4, 4, 0]} />
              <Bar dataKey="downloadCount" fill="#10b981" radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  )
}