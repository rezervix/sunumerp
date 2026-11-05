"use client"

import React, { useState, useEffect } from "react"
import {
  BarChart, Bar, LineChart, Line, AreaChart, Area, PieChart, Pie,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, Legend
} from "recharts"
import { Loader2, TrendingUp, BarChart2, FileText, Download, Eye, Award, Sparkles } from "lucide-react"
import { toast } from "sonner"
import { AnimatedNumber } from "@/components/ui/motion-primitives"

interface AnalyticsData {
  topViewed: any[]
  topDownloaded: any[]
  nicheDistribution: any[]
  statusRates: any[]
  trendData: any[]
}

const GLOW_COLORS = ["#34D399", "#38BDF8", "#FBBF24", "#F43F5E", "#A78BFA", "#2DD4BF"]

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
      <div className="flex flex-col items-center justify-center py-32 gap-3 text-zinc-500">
        <Loader2 className="animate-spin text-emerald-400 size-8" />
        <span className="text-xs font-mono">Analitik metrikleri hesaplanıyor...</span>
      </div>
    )
  }

  if (!data) return null

  const totalUploads = (data.trendData || []).reduce((acc, curr) => acc + (curr.uploads || 0), 0)
  const totalApprovals = (data.trendData || []).reduce((acc, curr) => acc + (curr.approvals || 0), 0)
  const totalViews = (data.topViewed || []).reduce((acc, curr) => acc + (curr.viewCount || 0), 0)
  const totalDownloads = (data.topDownloaded || []).reduce((acc, curr) => acc + (curr.downloadCount || 0), 0)

  return (
    <div className="space-y-6">
      {/* ── KUTUSUZ ÜST KPI ŞERİDİ ── */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8 py-3 border-b border-white/[0.06]">
        <div>
          <div className="flex items-center gap-1.5 text-zinc-400 text-[11px] uppercase tracking-wider">
            <TrendingUp className="size-3.5 text-zinc-400" />
            <span>Toplam Yükleme Hacmi</span>
          </div>
          <div className="flex items-baseline gap-2 mt-1">
            <span className="text-3xl font-light text-white">
              <AnimatedNumber value={totalUploads} />
            </span>
            <span className="text-[11px] font-mono text-sky-400 bg-sky-500/10 px-2 py-0.5 rounded-full border border-sky-500/20">
              Son 30 Gün
            </span>
          </div>
        </div>

        <div>
          <div className="flex items-center gap-1.5 text-zinc-400 text-[11px] uppercase tracking-wider">
            <Award className="size-3.5 text-zinc-400" />
            <span>Onaylanan İçerik</span>
          </div>
          <div className="flex items-baseline gap-2 mt-1">
            <span className="text-3xl font-light text-white">
              <AnimatedNumber value={totalApprovals} />
            </span>
            <span className="text-[11px] font-mono text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">
              Aktif Yayın
            </span>
          </div>
        </div>

        <div>
          <div className="flex items-center gap-1.5 text-zinc-400 text-[11px] uppercase tracking-wider">
            <Eye className="size-3.5 text-zinc-400" />
            <span>İzlenme & İndirme Hacmi</span>
          </div>
          <div className="flex items-baseline gap-2 mt-1">
            <span className="text-3xl font-light text-white">
              <AnimatedNumber value={totalViews} />
            </span>
            <span className="text-xs text-zinc-500 font-mono">/</span>
            <span className="text-xl font-light text-emerald-400">
              <AnimatedNumber value={totalDownloads} /> indirme
            </span>
          </div>
        </div>
      </div>

      {/* ── GRAFİKLER BENTO ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Spline Grafiği */}
        <div className="bg-[#111513]/90 backdrop-blur-xl border border-white/[0.06] rounded-[20px] p-6 shadow-2xl space-y-4">
          <div className="flex items-center justify-between border-b border-white/[0.06] pb-3">
            <div className="flex items-center gap-2">
              <Sparkles className="text-emerald-400 size-4" />
              <h4 className="text-sm font-medium text-white">30 Günlük Yükleme & Onay Eğilimi</h4>
            </div>
            <div className="flex items-center gap-3 text-xs font-mono">
              <span className="flex items-center gap-1 text-sky-400">
                <span className="size-1.5 rounded-full bg-sky-400" /> Yüklenen
              </span>
              <span className="flex items-center gap-1 text-emerald-400">
                <span className="size-1.5 rounded-full bg-emerald-400" /> Onaylanan
              </span>
            </div>
          </div>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={data.trendData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="uploadsGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#38BDF8" stopOpacity={0.25}/>
                    <stop offset="95%" stopColor="#38BDF8" stopOpacity={0}/>
                  </linearGradient>
                  <linearGradient id="approvalsGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#34D399" stopOpacity={0.35}/>
                    <stop offset="95%" stopColor="#34D399" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" vertical={false} />
                <XAxis dataKey="date" stroke="#71717A" tick={{ fill: "#71717A", fontSize: 10 }} />
                <YAxis stroke="#71717A" tick={{ fill: "#71717A", fontSize: 10 }} allowDecimals={false} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "#111513",
                    borderColor: "rgba(255,255,255,0.1)",
                    borderRadius: "12px",
                    color: "#fff",
                  }}
                />
                <Area type="monotone" dataKey="uploads" stroke="#38BDF8" strokeWidth={2} fill="url(#uploadsGrad)" />
                <Area type="monotone" dataKey="approvals" stroke="#34D399" strokeWidth={2.5} fill="url(#approvalsGrad)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Niş Dağılım Grafiği */}
        <div className="bg-[#111513]/90 backdrop-blur-xl border border-white/[0.06] rounded-[20px] p-6 shadow-2xl space-y-4">
          <div className="flex items-center gap-2 border-b border-white/[0.06] pb-3">
            <BarChart2 className="text-emerald-400 size-4" />
            <h4 className="text-sm font-medium text-white">Niş ve Kategori Dağılımı</h4>
          </div>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data.nicheDistribution} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" vertical={false} />
                <XAxis dataKey="name" stroke="#71717A" tick={{ fill: "#71717A", fontSize: 10 }} />
                <YAxis stroke="#71717A" tick={{ fill: "#71717A", fontSize: 10 }} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "#111513",
                    borderColor: "rgba(255,255,255,0.1)",
                    borderRadius: "12px",
                    color: "#fff",
                  }}
                />
                <Bar dataKey="count" fill="#34D399" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  )
}
