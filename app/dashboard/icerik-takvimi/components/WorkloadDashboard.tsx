"use client"

import { useState, useEffect } from "react"
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend
} from "recharts"
import { Loader2, TrendingUp, TrendingDown, Eye, Users, Layers, Award } from "lucide-react"

interface WorkloadDashboardProps {
  branchId: string
}

const COLORS = ["#0088FE", "#00C49F", "#FFBB28", "#FF8042", "#8884d8", "#82ca9d", "#ffc658"]

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
      <div className="flex items-center justify-center h-96">
        <Loader2 size={32} className="animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (!data) {
    return (
      <div className="text-center py-12 text-muted-foreground text-sm">
        Rapor verileri yüklenemedi.
      </div>
    )
  }

  const { comparison, statusDistribution, platformDistribution, teamWorkload } = data

  // Recharts için verileri formatla
  const statusData = statusDistribution.map((item: any) => ({
    name: STATUS_LABELS[item.status] || item.status,
    value: item.count,
  }))

  const platformData = platformDistribution.map((item: any) => ({
    name: PLATFORM_LABELS[item.platform] || item.platform,
    Değer: item.count,
  }))

  return (
    <div className="p-4 space-y-6 max-w-5xl mx-auto">
      {/* ── ÜST ÖZET KARTLARI ── */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Aylık İçerik Değişimi */}
        <div className="p-4 rounded-xl border border-border bg-card shadow-xs flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-xs text-muted-foreground font-semibold">Bu Ay Oluşturulan</span>
            <div className="text-2xl font-bold">{comparison.thisMonth} İçerik</div>
            <p className="text-[10px] text-muted-foreground">Geçen ay: {comparison.lastMonth}</p>
          </div>
          <div className={`p-3 rounded-lg flex items-center gap-1 text-xs font-bold ${
            comparison.changePercentage >= 0
              ? "bg-emerald-500/10 text-emerald-600"
              : "bg-red-500/10 text-red-600"
          }`}>
            {comparison.changePercentage >= 0 ? <TrendingUp size={16} /> : <TrendingDown size={16} />}
            {Math.abs(comparison.changePercentage)}%
          </div>
        </div>

        {/* Toplam Aktif Görevler */}
        <div className="p-4 rounded-xl border border-border bg-card shadow-xs flex items-center gap-4">
          <div className="p-3 rounded-xl bg-primary/10 text-primary">
            <Users size={20} />
          </div>
          <div className="space-y-0.5">
            <span className="text-xs text-muted-foreground font-semibold">Ekip Dağılımı</span>
            <div className="text-lg font-bold">
              {teamWorkload.shooters.length + teamWorkload.editors.length} Aktif Personel
            </div>
            <p className="text-[10px] text-muted-foreground">Çekim ve Kurgu personelleri</p>
          </div>
        </div>

        {/* En Popüler Platform */}
        <div className="p-4 rounded-xl border border-border bg-card shadow-xs flex items-center gap-4">
          <div className="p-3 rounded-xl bg-amber-500/10 text-amber-600">
            <Layers size={20} />
          </div>
          <div className="space-y-0.5">
            <span className="text-xs text-muted-foreground font-semibold">Ana Paylaşım Platformu</span>
            <div className="text-lg font-bold uppercase">
              {platformData.length > 0
                ? platformData.sort((a: any, b: any) => b.Değer - a.Değer)[0]?.name
                : "Belirsiz"}
            </div>
            <p className="text-[10px] text-muted-foreground">En yüksek paylaşılan kanal</p>
          </div>
        </div>
      </div>

      {/* ── GRAFİKLER SATIRI 1 ── */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Durum Dağılımı (Pie Chart) */}
        <div className="p-4 rounded-xl border border-border bg-card shadow-xs">
          <h3 className="text-sm font-semibold mb-4 text-foreground/80">İçerik Tamamlanma & Durum Oranları</h3>
          <div className="h-64">
            {statusData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={statusData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={80}
                    paddingAngle={3}
                    dataKey="value"
                  >
                    {statusData.map((_entry: any, index: number) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value) => [`${value} içerik`, "Miktar"]} />
                  <Legend verticalAlign="bottom" height={36} iconSize={10} iconType="circle" wrapperStyle={{ fontSize: 10 }} />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-full text-xs text-muted-foreground">Gösterilecek durum verisi bulunamadı</div>
            )}
          </div>
        </div>

        {/* Platform Dağılımı (Bar Chart) */}
        <div className="p-4 rounded-xl border border-border bg-card shadow-xs">
          <h3 className="text-sm font-semibold mb-4 text-foreground/80">Platformlara Göre Dağılım</h3>
          <div className="h-64">
            {platformData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={platformData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="name" tick={{ fontSize: 10 }} />
                  <YAxis tick={{ fontSize: 10 }} />
                  <Tooltip />
                  <Bar dataKey="Değer" fill="#3B82F6" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-full text-xs text-muted-foreground">Gösterilecek platform verisi bulunamadı</div>
            )}
          </div>
        </div>
      </div>

      {/* ── GRAFİKLER SATIRI 2: EKİP İŞ YÜKÜ ── */}
      <div className="p-4 rounded-xl border border-border bg-card shadow-xs">
        <h3 className="text-sm font-semibold mb-4 text-foreground/80 flex items-center gap-1.5">
          <Award size={16} className="text-primary" />
          Ekip İş Yükü ve Görev Atamaları (Editör / Kurgu / Çekim)
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Videoçekim Uzmanları İş Yükü */}
          <div>
            <h4 className="text-xs font-semibold mb-2 text-muted-foreground">Videoçekim Uzmanları (Shooters)</h4>
            <div className="h-48">
              {teamWorkload.shooters.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={teamWorkload.shooters} layout="vertical" margin={{ top: 5, right: 5, left: 10, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                    <XAxis type="number" tick={{ fontSize: 9 }} />
                    <YAxis dataKey="name" type="category" tick={{ fontSize: 9 }} width={70} />
                    <Tooltip />
                    <Bar dataKey="count" fill="#F59E0B" name="Çekim Görevi" radius={[0, 4, 4, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex items-center justify-center h-full text-xs text-muted-foreground">Aktif çekim görevi bulunamadı</div>
              )}
            </div>
          </div>

          {/* Editörler İş Yükü */}
          <div>
            <h4 className="text-xs font-semibold mb-2 text-muted-foreground">Editörler / Kurgu (Editors)</h4>
            <div className="h-48">
              {teamWorkload.editors.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={teamWorkload.editors} layout="vertical" margin={{ top: 5, right: 5, left: 10, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                    <XAxis type="number" tick={{ fontSize: 9 }} />
                    <YAxis dataKey="name" type="category" tick={{ fontSize: 9 }} width={70} />
                    <Tooltip />
                    <Bar dataKey="count" fill="#10B981" name="Edit Görevi" radius={[0, 4, 4, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex items-center justify-center h-full text-xs text-muted-foreground">Aktif edit görevi bulunamadı</div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
