"use client"

import React, { useState, useEffect } from "react"
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend
} from "recharts"
import { Loader2, TrendingUp, TrendingDown, Users, Layers, Award, Sparkles, Film, CheckCircle2 } from "lucide-react"
import { AnimatedNumber } from "@/components/ui/motion-primitives"

interface WorkloadDashboardProps {
  branchId: string
}

const GLOW_COLORS = ["#34D399", "#38BDF8", "#FBBF24", "#F43F5E", "#A78BFA", "#2DD4BF", "#FB923C"]

const STATUS_LABELS: Record<string, string> = {
  draft: "Taslak",
  awaiting_shoot: "Çekim Bekleniyor",
  in_editing: "Editleniyor",
  pending_approval: "Onay Bekliyor",
  scheduled: "Planlandı",
  published: "Yayınlandı",
  cancelled: "İptal Edildi",
  missed: "Kaçırıldı",
}

const PLATFORM_LABELS: Record<string, string> = {
  instagram: "Instagram",
  tiktok: "TikTok",
  youtube: "YouTube",
  facebook: "Facebook",
  linkedin: "LinkedIn",
  x: "X (Twitter)",
  other: "Diğer",
}

export default function WorkloadDashboard({ branchId }: WorkloadDashboardProps) {
  const [data, setData] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchReports = async () => {
      setLoading(true)
      try {
        const res = await fetch(`/api/icerik-takvimi/reports?branchId=${branchId}`)
        if (res.ok) {
          const reportData = await res.json()
          setData(reportData)
        }
      } catch (err) {
        console.error("Reports loading error:", err)
      } finally {
        setLoading(false)
      }
    }
    fetchReports()
  }, [branchId])

  if (loading) {
    return (
      <div className="flex items-center justify-center h-80">
        <Loader2 size={28} className="animate-spin text-emerald-400" />
      </div>
    )
  }

  if (!data) {
    return (
      <div className="text-center py-12 text-zinc-500 text-sm">
        Rapor verileri bulunamadı.
      </div>
    )
  }

  const { comparison, statusDistribution, platformDistribution, teamWorkload } = data

  const statusData = (statusDistribution || []).map((item: any) => ({
    name: STATUS_LABELS[item.status] || item.status,
    value: item.count,
  }))

  const platformData = (platformDistribution || []).map((item: any) => ({
    name: PLATFORM_LABELS[item.platform] || item.platform,
    Değer: item.count,
  }))

  const topPlatform = platformData.length > 0
    ? [...platformData].sort((a: any, b: any) => b.Değer - a.Değer)[0]?.name
    : "Belirsiz"

  return (
    <div className="space-y-6">
      {/* ── KUTUSUZ ÜST KPI ŞERİDİ ── */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-8 py-3 border-b border-white/[0.06]">
        <div>
          <div className="flex items-center gap-1.5 text-zinc-400 text-[11px] uppercase tracking-wider">
            <Sparkles className="size-3.5 text-zinc-400" />
            <span>Bu Ay Oluşturulan İçerik</span>
          </div>
          <div className="flex items-baseline gap-2 mt-1">
            <span className="text-3xl font-light text-white">
              <AnimatedNumber value={comparison?.thisMonth ?? 0} />
            </span>
            <span className={`text-[11px] font-mono px-2 py-0.5 rounded-full border ${
              (comparison?.changePercentage ?? 0) >= 0
                ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
                : "bg-rose-500/10 text-rose-400 border-rose-500/20"
            }`}>
              {comparison?.changePercentage >= 0 ? "+" : ""}{comparison?.changePercentage ?? 0}% vs geçen ay
            </span>
          </div>
        </div>

        <div>
          <div className="flex items-center gap-1.5 text-zinc-400 text-[11px] uppercase tracking-wider">
            <Users className="size-3.5 text-zinc-400" />
            <span>Aktif Üretim Personeli</span>
          </div>
          <div className="flex items-baseline gap-2 mt-1">
            <span className="text-3xl font-light text-white">
              <AnimatedNumber value={(teamWorkload?.shooters?.length ?? 0) + (teamWorkload?.editors?.length ?? 0)} />
            </span>
            <span className="text-[11px] font-mono text-sky-400 bg-sky-500/10 px-2 py-0.5 rounded-full border border-sky-500/20">
              Çekim & Kurgu
            </span>
          </div>
        </div>

        <div>
          <div className="flex items-center gap-1.5 text-zinc-400 text-[11px] uppercase tracking-wider">
            <Layers className="size-3.5 text-zinc-400" />
            <span>Ana Paylaşım Platformu</span>
          </div>
          <div className="flex items-baseline gap-2 mt-1">
            <span className="text-2xl font-light text-white uppercase tracking-wide">
              {topPlatform}
            </span>
            <span className="text-[11px] font-mono text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">
              En Çok Dağıtılan
            </span>
          </div>
        </div>
      </div>

      {/* ── GRAFİKLER SATIRI 1 ── */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Durum Dağılımı (Pie Chart) */}
        <div className="bg-[#111513]/90 backdrop-blur-xl border border-white/[0.06] rounded-[20px] p-6 shadow-2xl">
          <h3 className="text-sm font-medium text-white mb-4">İçerik Tamamlanma & Durum Dağılımı</h3>
          <div className="h-64">
            {statusData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={statusData}
                    cx="50%"
                    cy="50%"
                    innerRadius={55}
                    outerRadius={80}
                    paddingAngle={3}
                    dataKey="value"
                  >
                    {statusData.map((_entry: any, index: number) => (
                      <Cell key={`cell-${index}`} fill={GLOW_COLORS[index % GLOW_COLORS.length]} stroke="rgba(0,0,0,0.5)" />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "#111513",
                      borderColor: "rgba(255,255,255,0.1)",
                      borderRadius: "12px",
                      color: "#fff",
                    }}
                    formatter={(value) => [`${value} adet`, "Miktar"]}
                  />
                  <Legend verticalAlign="bottom" height={36} iconSize={8} iconType="circle" wrapperStyle={{ fontSize: 11, color: "#9CA3AF" }} />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-full text-xs text-zinc-500">Gösterilecek durum verisi bulunamadı</div>
            )}
          </div>
        </div>

        {/* Platform Dağılımı (Bar Chart) */}
        <div className="bg-[#111513]/90 backdrop-blur-xl border border-white/[0.06] rounded-[20px] p-6 shadow-2xl">
          <h3 className="text-sm font-medium text-white mb-4">Platformlara Göre İçerik Hacmi</h3>
          <div className="h-64">
            {platformData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={platformData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
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
                  <Bar dataKey="Değer" fill="#34D399" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-full text-xs text-zinc-500">Gösterilecek platform verisi bulunamadı</div>
            )}
          </div>
        </div>
      </div>

      {/* ── GRAFİKLER SATIRI 2: EKİP İŞ YÜKÜ ── */}
      <div className="bg-[#111513]/90 backdrop-blur-xl border border-white/[0.06] rounded-[20px] p-6 shadow-2xl space-y-6">
        <div className="flex items-center gap-2 border-b border-white/[0.06] pb-3">
          <Award size={16} className="text-emerald-400" />
          <h3 className="text-sm font-medium text-white">Ekip İş Yükü ve Görev Dağılımı</h3>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Çekim Uzmanları */}
          <div>
            <h4 className="text-xs font-medium text-zinc-400 mb-3 flex items-center gap-1.5">
              <Film className="size-3.5 text-amber-400" />
              Video & Prodüksiyon Çekim Sorumluları
            </h4>
            <div className="h-44">
              {teamWorkload?.shooters?.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={teamWorkload.shooters} layout="vertical" margin={{ top: 5, right: 10, left: 10, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" horizontal={false} />
                    <XAxis type="number" stroke="#71717A" tick={{ fill: "#71717A", fontSize: 10 }} />
                    <YAxis dataKey="name" type="category" stroke="#71717A" tick={{ fill: "#71717A", fontSize: 10 }} width={80} />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "#111513",
                        borderColor: "rgba(255,255,255,0.1)",
                        borderRadius: "12px",
                        color: "#fff",
                      }}
                    />
                    <Bar dataKey="count" fill="#FBBF24" name="Çekim Görevi" radius={[0, 4, 4, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex items-center justify-center h-full text-xs text-zinc-500">Aktif çekim görevi bulunamadı</div>
              )}
            </div>
          </div>

          {/* Editörler */}
          <div>
            <h4 className="text-xs font-medium text-zinc-400 mb-3 flex items-center gap-1.5">
              <CheckCircle2 className="size-3.5 text-emerald-400" />
              Kurgu & Editörler
            </h4>
            <div className="h-44">
              {teamWorkload?.editors?.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={teamWorkload.editors} layout="vertical" margin={{ top: 5, right: 10, left: 10, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" horizontal={false} />
                    <XAxis type="number" stroke="#71717A" tick={{ fill: "#71717A", fontSize: 10 }} />
                    <YAxis dataKey="name" type="category" stroke="#71717A" tick={{ fill: "#71717A", fontSize: 10 }} width={80} />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "#111513",
                        borderColor: "rgba(255,255,255,0.1)",
                        borderRadius: "12px",
                        color: "#fff",
                      }}
                    />
                    <Bar dataKey="count" fill="#34D399" name="Edit Görevi" radius={[0, 4, 4, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex items-center justify-center h-full text-xs text-zinc-500">Aktif edit görevi bulunamadı</div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
