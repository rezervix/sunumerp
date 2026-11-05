"use client"

import React, { useState, useEffect } from "react"
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, LineChart, Line, AreaChart, Area, Legend
} from "recharts"
import { TrendingUp, Download, Eye, Package, Loader2, CheckCircle2, Clock, XCircle, Sparkles } from "lucide-react"
import { AnimatedNumber } from "@/components/ui/motion-primitives"

const STATUS_COLORS: Record<string, string> = {
  approved: "#34D399",
  pending_approval: "#FBBF24",
  rejected: "#F43F5E",
  draft: "#71717A",
}

const CHART_COLORS = ["#34D399", "#38BDF8", "#FBBF24", "#F43F5E", "#A78BFA", "#2DD4BF"]

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
      <Loader2 size={28} className="animate-spin text-emerald-400" />
    </div>
  )

  if (error) return (
    <div className="flex items-center justify-center py-20 text-rose-400 text-xs font-mono">{error}</div>
  )

  if (!data) return null

  return (
    <div className="space-y-6 py-2">
      {/* Kutusuz Üst KPI Şeridi */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-8 py-3 border-b border-white/[0.06]">
        <div>
          <div className="flex items-center gap-1.5 text-zinc-400 text-[11px] uppercase tracking-wider">
            <Package size={13} className="text-zinc-400" />
            <span>Toplam İçerik</span>
          </div>
          <div className="flex items-baseline gap-2 mt-1">
            <span className="text-3xl font-light text-white">
              <AnimatedNumber value={data.totals.totalContent} />
            </span>
            <span className="text-[11px] font-mono text-zinc-400 bg-white/[0.05] px-2 py-0.5 rounded-full border border-white/[0.08]">
              Varlık
            </span>
          </div>
        </div>

        <div>
          <div className="flex items-center gap-1.5 text-zinc-400 text-[11px] uppercase tracking-wider">
            <Eye size={13} className="text-zinc-400" />
            <span>Toplam Görüntülenme</span>
          </div>
          <div className="flex items-baseline gap-2 mt-1">
            <span className="text-3xl font-light text-white">
              <AnimatedNumber value={data.totals.totalViews} />
            </span>
            <span className="text-[11px] font-mono text-sky-400 bg-sky-500/10 px-2 py-0.5 rounded-full border border-sky-500/20">
              Görüntüleme
            </span>
          </div>
        </div>

        <div>
          <div className="flex items-center gap-1.5 text-zinc-400 text-[11px] uppercase tracking-wider">
            <Download size={13} className="text-zinc-400" />
            <span>Toplam İndirme</span>
          </div>
          <div className="flex items-baseline gap-2 mt-1">
            <span className="text-3xl font-light text-white">
              <AnimatedNumber value={data.totals.totalDownloads} />
            </span>
            <span className="text-[11px] font-mono text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">
              İndirildi
            </span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Günlük Yükleme */}
        {data.dailyUploads.length > 0 && (
          <div className="bg-[#111513]/90 backdrop-blur-xl border border-white/[0.06] rounded-[20px] p-6 shadow-2xl">
            <h3 className="font-medium text-white text-sm mb-4 flex items-center gap-2">
              <TrendingUp size={16} className="text-emerald-400" />
              Son 30 Gün Yükleme & Onay Eğilimi
            </h3>
            <div className="h-52">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={data.dailyUploads}>
                  <defs>
                    <linearGradient id="uploadsDaily" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#38BDF8" stopOpacity={0.25}/>
                      <stop offset="95%" stopColor="#38BDF8" stopOpacity={0}/>
                    </linearGradient>
                    <linearGradient id="approvedDaily" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#34D399" stopOpacity={0.35}/>
                      <stop offset="95%" stopColor="#34D399" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" vertical={false} />
                  <XAxis dataKey="date" stroke="#71717A" tick={{ fill: "#71717A", fontSize: 10 }} tickFormatter={v => v.slice(5)} />
                  <YAxis stroke="#71717A" tick={{ fill: "#71717A", fontSize: 10 }} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "#111513",
                      borderColor: "rgba(255,255,255,0.1)",
                      borderRadius: "12px",
                      color: "#fff",
                    }}
                    formatter={(val: any, name: string) => [val, name === "uploads" ? "Toplam Yükleme" : "Onaylanan"]}
                    labelFormatter={v => `Tarih: ${v}`}
                  />
                  <Area type="monotone" dataKey="uploads" stroke="#38BDF8" strokeWidth={2} fill="url(#uploadsDaily)" />
                  <Area type="monotone" dataKey="approved" stroke="#34D399" strokeWidth={2.5} fill="url(#approvedDaily)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}

        {/* Niş Dağılımı */}
        {data.nicheStats.length > 0 && (
          <div className="bg-[#111513]/90 backdrop-blur-xl border border-white/[0.06] rounded-[20px] p-6 shadow-2xl">
            <h3 className="font-medium text-white text-sm mb-4 flex items-center gap-2">
              <Package size={16} className="text-emerald-400" />
              Niş Bazlı Dağılım
            </h3>
            <div className="h-52">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={data.nicheStats} cx="50%" cy="50%" innerRadius={40} outerRadius={70} dataKey="count" nameKey="nicheName">
                    {data.nicheStats.map((_, i) => <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} stroke="rgba(0,0,0,0.5)" />)}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "#111513",
                      borderColor: "rgba(255,255,255,0.1)",
                      borderRadius: "12px",
                      color: "#fff",
                    }}
                    formatter={(val: any, name: string) => [`${val} içerik`, name]}
                  />
                  <Legend verticalAlign="bottom" height={28} iconSize={8} iconType="circle" wrapperStyle={{ fontSize: 10, color: "#9CA3AF" }} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
