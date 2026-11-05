"use client"

import React, { useState, useEffect, useCallback } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { useAuth } from "@/lib/auth/context"
import { toast } from "sonner"
import {
  Calendar as CalendarIcon,
  Send,
  BarChart3,
  Share2,
  Users,
  CheckCircle2,
  AlertCircle,
  Clock,
  Sparkles,
  Plus,
  RefreshCw,
  Edit,
  Eye,
  TrendingUp,
  Tag,
  ChevronLeft,
  ChevronRight,
  ExternalLink,
  Layers,
  Smile,
  ShieldCheck,
  Radio,
} from "lucide-react"
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from "recharts"
import { AnimatedNumber, StaggerContainer, StaggerItem } from "@/components/ui/motion-primitives"

// ─── Types ────────────────────────────────────────────────────────────

type TabId = "takvim" | "gonderiler" | "analitik" | "platformlar" | "ekip"

interface Platform {
  id: string
  name: string
  icon: string
  color: string
  connected: boolean
  handle?: string
  followers?: number
}

interface ScheduledPost {
  id: string
  content: string
  platforms: string[]
  scheduledAt: string
  status: "scheduled" | "published" | "failed" | "draft"
  imageUrl?: string
}

interface AnalyticsData {
  platform: string
  followers: number
  engagement: number
  reach: number
  posts: number
  color: string
}

interface TeamMember {
  id: string
  fullName: string
  email?: string
  role: string
  platforms: string[]
  postsThisMonth: number
}

// ─── Constants ────────────────────────────────────────────────────────

const PLATFORMS: Platform[] = [
  { id: "instagram",  name: "Instagram",  icon: "instagram", color: "#E1306C", connected: false },
  { id: "twitter",    name: "Twitter/X",  icon: "x",         color: "#71717A", connected: false },
  { id: "facebook",   name: "Facebook",   icon: "facebook",  color: "#1877F2", connected: false },
  { id: "linkedin",   name: "LinkedIn",   icon: "linkedin",  color: "#0A66C2", connected: false },
  { id: "tiktok",     name: "TikTok",     icon: "tiktok",    color: "#2DD4BF", connected: false },
  { id: "youtube",    name: "YouTube",    icon: "youtube",   color: "#EF4444", connected: false },
  { id: "threads",    name: "Threads",    icon: "threads",   color: "#A1A1AA", connected: false },
  { id: "pinterest",  name: "Pinterest",  icon: "pinterest", color: "#E60023", connected: false },
  { id: "discord",    name: "Discord",    icon: "discord",   color: "#5865F2", connected: false },
  { id: "bluesky",    name: "Bluesky",    icon: "cloud",     color: "#0085FF", connected: false },
]

const MOCK_POSTS: ScheduledPost[] = [
  { id: "1", content: "🚀 Yeni özelliğimizi keşfedin! Yapay zeka destekli içerik motoru şimdi aktif.", platforms: ["instagram", "twitter"], scheduledAt: new Date(Date.now() + 2 * 3600000).toISOString(), status: "scheduled" },
  { id: "2", content: "Müşterilerimizle gurur duyuyoruz. Q3 başarı hikayeleri yayında 📈", platforms: ["linkedin", "facebook"], scheduledAt: new Date(Date.now() + 5 * 3600000).toISOString(), status: "scheduled" },
  { id: "3", content: "Haftalık içerik ipuçları ve reel trendleri #sosyalmedya", platforms: ["instagram"], scheduledAt: new Date(Date.now() - 3600000).toISOString(), status: "published" },
]

const MOCK_ANALYTICS: AnalyticsData[] = [
  { platform: "Instagram",  followers: 12400, engagement: 4.8, reach: 45000, posts: 28, color: "#E1306C" },
  { platform: "Twitter/X",  followers:  8200, engagement: 2.3, reach: 31000, posts: 54, color: "#71717A" },
  { platform: "LinkedIn",   followers:  5600, engagement: 5.1, reach: 18000, posts: 12, color: "#0A66C2" },
  { platform: "Facebook",   followers: 15300, engagement: 1.9, reach: 52000, posts: 20, color: "#1877F2" },
  { platform: "TikTok",     followers:  3100, engagement: 8.7, reach: 98000, posts:  8, color: "#2DD4BF" },
  { platform: "YouTube",    followers:  1800, engagement: 6.2, reach: 22000, posts:  4, color: "#EF4444" },
]

const MOCK_WEEKLY_TRENDS = [
  { day: "Pzt", erisim: 24000, etkilesim: 1850 },
  { day: "Sal", erisim: 31000, etkilesim: 2420 },
  { day: "Çar", erisim: 42000, etkilesim: 3600 },
  { day: "Per", erisim: 38000, etkilesim: 2950 },
  { day: "Cum", erisim: 51000, etkilesim: 4100 },
  { day: "Cmt", erisim: 62000, etkilesim: 5300 },
  { day: "Paz", erisim: 48000, etkilesim: 3800 },
]

const MOCK_TEAM: TeamMember[] = [
  { id: "1", fullName: "Ahmet Yılmaz",    email: "ahmet@example.com",    role: "İçerik Yöneticisi", platforms: ["instagram", "twitter", "linkedin"], postsThisMonth: 34 },
  { id: "2", fullName: "Zeynep Kaya",     email: "zeynep@example.com",   role: "Sosyal Medya Uzmanı", platforms: ["facebook", "instagram", "tiktok"], postsThisMonth: 28 },
  { id: "3", fullName: "Emre Demir",      email: "emre@example.com",     role: "Grafik Tasarımcı",  platforms: ["pinterest", "instagram"], postsThisMonth: 16 },
]

// ─── Helpers ──────────────────────────────────────────────────────────

function getStatusBadge(status: ScheduledPost["status"]) {
  switch (status) {
    case "scheduled":
      return <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-sky-500/10 text-sky-400 border border-sky-500/20">Planlandı</span>
    case "published":
      return <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">Yayınlandı</span>
    case "failed":
      return <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-rose-500/10 text-rose-400 border border-rose-500/20">Başarısız</span>
    case "draft":
      return <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-zinc-500/10 text-zinc-400 border border-zinc-500/20">Taslak</span>
  }
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleString("tr-TR", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" })
}

// ─── Sub-components ───────────────────────────────────────────────────

function PlatformIcon({ platformId, className = "size-4" }: { platformId: string; className?: string }) {
  const pl = PLATFORMS.find(x => x.id === platformId)
  if (!pl) return <Share2 className={className} />
  return (
    <span
      className={`inline-flex items-center justify-center font-bold text-[10px] uppercase rounded px-1 py-0.2 select-none ${className}`}
      style={{ color: pl.color }}
    >
      {pl.name.slice(0, 2)}
    </span>
  )
}

// ─── TabCalendar ──────────────────────────────────────────────────────

function TabCalendar({ posts }: { posts: ScheduledPost[] }) {
  const today = new Date()
  const [currentDate, setCurrentDate] = useState(today)

  const year  = currentDate.getFullYear()
  const month = currentDate.getMonth()

  const firstDay    = new Date(year, month, 1).getDay()
  const daysInMonth = new Date(year, month + 1, 0).getDate()
  const offset      = firstDay === 0 ? 6 : firstDay - 1 // Mon-start

  const monthName = currentDate.toLocaleString("tr-TR", { month: "long", year: "numeric" })

  const postsOnDay = (day: number) =>
    posts.filter(p => {
      const d = new Date(p.scheduledAt)
      return d.getFullYear() === year && d.getMonth() === month && d.getDate() === day
    })

  return (
    <div className="space-y-6">
      {/* Calendar nav & grid card */}
      <div className="bg-[#111513]/90 backdrop-blur-xl border border-white/[0.06] rounded-[20px] p-6 shadow-2xl">
        <div className="flex items-center justify-between mb-6">
          <button
            onClick={() => setCurrentDate(new Date(year, month - 1, 1))}
            className="p-2 rounded-xl border border-white/[0.06] bg-white/[0.02] text-zinc-400 hover:text-white hover:border-emerald-500/30 transition-colors"
          >
            <ChevronLeft className="size-4" />
          </button>
          <h3 className="text-lg font-light tracking-wide text-white capitalize">{monthName}</h3>
          <button
            onClick={() => setCurrentDate(new Date(year, month + 1, 1))}
            className="p-2 rounded-xl border border-white/[0.06] bg-white/[0.02] text-zinc-400 hover:text-white hover:border-emerald-500/30 transition-colors"
          >
            <ChevronRight className="size-4" />
          </button>
        </div>

        <div className="overflow-x-auto">
          <div className="min-w-[640px]">
            {/* Day headers */}
            <div className="grid grid-cols-7 gap-2 mb-2">
              {["Pzt","Sal","Çar","Per","Cum","Cmt","Paz"].map(d => (
                <div key={d} className="text-center text-[11px] font-medium tracking-wider uppercase text-zinc-500 py-1">{d}</div>
              ))}
            </div>

            {/* Grid */}
            <div className="grid grid-cols-7 gap-2">
              {Array.from({ length: offset }).map((_, i) => (
                <div key={`empty-${i}`} className="min-h-[84px] rounded-xl bg-white/[0.01] border border-white/[0.02] opacity-40" />
              ))}

              {Array.from({ length: daysInMonth }).map((_, i) => {
                const day      = i + 1
                const isToday  = day === today.getDate() && month === today.getMonth() && year === today.getFullYear()
                const dayPosts = postsOnDay(day)

                return (
                  <div
                    key={day}
                    className={`min-h-[84px] p-2 rounded-xl border transition-all cursor-pointer ${
                      isToday
                        ? "border-emerald-500/40 bg-emerald-500/10 shadow-[0_0_15px_rgba(16,185,129,0.12)]"
                        : "border-white/[0.05] bg-white/[0.02] hover:bg-white/[0.04] hover:border-white/[0.12]"
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1.5">
                      <span className={`text-xs font-semibold ${isToday ? "text-emerald-400" : "text-zinc-400"}`}>
                        {day}
                      </span>
                      {dayPosts.length > 0 && (
                        <span className="size-1.5 rounded-full bg-emerald-400 shadow-[0_0_6px_#34D399]" />
                      )}
                    </div>
                    <div className="space-y-1">
                      {dayPosts.slice(0, 2).map(p => (
                        <div key={p.id} className="text-[10px] bg-emerald-500/15 text-emerald-300 border border-emerald-500/20 rounded px-1.5 py-0.5 truncate">
                          {p.content}
                        </div>
                      ))}
                      {dayPosts.length > 2 && (
                        <div className="text-[10px] text-zinc-500">+{dayPosts.length - 2} daha</div>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      </div>

      {/* Upcoming posts card */}
      <div className="bg-[#111513]/90 backdrop-blur-xl border border-white/[0.06] rounded-[20px] shadow-2xl overflow-hidden">
        <div className="p-5 border-b border-white/[0.06] flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Clock className="size-4 text-emerald-400" />
            <h3 className="font-medium text-white text-sm">Yaklaşan Planlanmış Gönderiler</h3>
          </div>
          <span className="text-xs text-zinc-400">{posts.filter(p => p.status === "scheduled").length} gönderi</span>
        </div>
        <div className="divide-y divide-white/[0.04]">
          {posts.filter(p => p.status === "scheduled").map(p => (
            <div key={p.id} className="px-5 py-3.5 flex items-center gap-4 hover:bg-white/[0.02] transition-colors">
              <div className="flex -space-x-1 shrink-0">
                {p.platforms.map(pid => (
                  <PlatformIcon key={pid} platformId={pid} />
                ))}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm text-zinc-200 truncate">{p.content}</p>
              </div>
              <span className="text-xs text-zinc-400 font-mono whitespace-nowrap">{formatDate(p.scheduledAt)}</span>
              {getStatusBadge(p.status)}
            </div>
          ))}
          {posts.filter(p => p.status === "scheduled").length === 0 && (
            <div className="px-5 py-8 text-center text-zinc-500 text-sm">Planlanmış gönderi bulunmuyor.</div>
          )}
        </div>
      </div>
    </div>
  )
}

// ─── TabGonderiler ────────────────────────────────────────────────────

function TabGonderiler({ posts }: { posts: ScheduledPost[] }) {
  const [content, setContent]               = useState("")
  const [selectedPlatforms, setSelected]   = useState<string[]>([])
  const [scheduleDate, setScheduleDate]    = useState("")
  const [scheduleTime, setScheduleTime]    = useState("")
  const [aiPrompt, setAiPrompt]            = useState("")
  const [aiLoading, setAiLoading]          = useState(false)
  const [tab, setTab]                      = useState<"compose" | "list">("compose")
  const [charCount, setCharCount]          = useState(0)

  const togglePlatform = (id: string) =>
    setSelected(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id])

  const handleContentChange = (val: string) => {
    setContent(val)
    setCharCount(val.length)
  }

  const generateWithAI = async () => {
    if (!aiPrompt.trim()) { toast.error("Lütfen bir konu girin."); return }
    setAiLoading(true)
    try {
      const res = await fetch("/api/social-media/ai/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt: aiPrompt, platforms: selectedPlatforms }),
      })
      if (res.ok) {
        const { text } = await res.json()
        setContent(text)
        setCharCount(text.length)
        toast.success("AI ile sosyal medya içeriği hazırlandı!")
      } else {
        toast.error("İçerik oluşturulamadı.")
      }
    } catch {
      toast.error("Ağ hatası oluştu.")
    } finally {
      setAiLoading(false)
    }
  }

  const handleSchedule = async () => {
    if (!content.trim())               { toast.error("İçerik boş olamaz."); return }
    if (selectedPlatforms.length === 0){ toast.error("En az bir platform seçin."); return }
    if (!scheduleDate)                 { toast.error("Tarih seçin."); return }

    try {
      const res = await fetch("/api/social-media/posts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          content,
          platforms: selectedPlatforms,
          scheduledAt: scheduleDate && scheduleTime ? `${scheduleDate}T${scheduleTime}` : scheduleDate,
          status: scheduleDate ? "scheduled" : "draft",
        }),
      })
      if (res.ok) {
        toast.success("Gönderi başarıyla planlandı!")
        setContent(""); setSelected([]); setScheduleDate(""); setScheduleTime(""); setAiPrompt("")
        setCharCount(0)
      } else {
        const d = await res.json()
        toast.error(d.error || "Gönderi planlanamadı.")
      }
    } catch {
      toast.error("Ağ hatası oluştu.")
    }
  }

  return (
    <div className="space-y-6">
      {/* Sub tab switcher */}
      <div className="flex gap-1 bg-[#111513] border border-white/[0.06] p-1 rounded-xl w-fit">
        {(["compose", "list"] as const).map(t => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
              tab === t ? "bg-white/[0.08] text-white shadow-sm" : "text-zinc-400 hover:text-white"
            }`}
          >
            {t === "compose" ? "Yeni Gönderi Oluştur" : "Tüm Gönderiler"}
          </button>
        ))}
      </div>

      {tab === "compose" ? (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left 2 Cols: Compose */}
          <div className="lg:col-span-2 space-y-4">
            {/* AI Assistant Box */}
            <div className="bg-[#111513]/90 backdrop-blur-xl border border-emerald-500/25 rounded-[20px] p-5 shadow-2xl relative overflow-hidden">
              <div className="absolute top-0 right-0 w-48 h-48 bg-emerald-500/5 rounded-full blur-2xl pointer-events-none" />
              <div className="flex items-center gap-2 mb-3">
                <Sparkles className="size-4 text-emerald-400" />
                <h3 className="font-medium text-white text-sm">Gemini AI ile İçerik Oluştur</h3>
              </div>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={aiPrompt}
                  onChange={e => setAiPrompt(e.target.value)}
                  onKeyDown={e => e.key === "Enter" && generateWithAI()}
                  placeholder="Konu veya açıklama girin (örn: Sonbahar koleksiyonu lansmanı)..."
                  className="flex-1 px-4 py-2.5 bg-white/[0.03] border border-white/[0.08] rounded-xl text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-emerald-500/50 transition-all"
                />
                <button
                  onClick={generateWithAI}
                  disabled={aiLoading}
                  className="px-4 py-2.5 bg-emerald-500 hover:bg-emerald-400 text-black text-sm font-medium rounded-xl transition-all disabled:opacity-50 flex items-center gap-2 shrink-0 shadow-[0_0_15px_rgba(16,185,129,0.2)]"
                >
                  {aiLoading ? (
                    <RefreshCw className="size-4 animate-spin" />
                  ) : (
                    <Sparkles className="size-4" />
                  )}
                  {aiLoading ? "Yazılıyor..." : "Oluştur"}
                </button>
              </div>
            </div>

            {/* Content Editor */}
            <div className="bg-[#111513]/90 backdrop-blur-xl border border-white/[0.06] rounded-[20px] p-5 shadow-2xl space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="font-medium text-white text-sm">Gönderi Metni</h3>
                <span className={`text-xs font-mono ${charCount > 280 ? "text-rose-400" : "text-zinc-500"}`}>
                  {charCount} karakter
                </span>
              </div>
              <textarea
                value={content}
                onChange={e => handleContentChange(e.target.value)}
                rows={7}
                placeholder="Gönderi içeriğinizi buraya yazın veya AI ile oluşturun…"
                className="w-full px-4 py-3 bg-white/[0.02] border border-white/[0.08] rounded-xl text-sm text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-emerald-500/50 transition-all resize-none leading-relaxed"
              />
              <div className="flex items-center gap-3 pt-1">
                <button
                  type="button"
                  onClick={() => toast.info("Hashtag önerisi yakında eklenecek.")}
                  className="text-xs text-zinc-400 hover:text-emerald-400 flex items-center gap-1.5 transition-colors"
                >
                  <Tag className="size-3.5" />
                  Hashtag Öner
                </button>
                <button
                  type="button"
                  onClick={() => toast.info("Emoji paneli yakında eklenecek.")}
                  className="text-xs text-zinc-400 hover:text-emerald-400 flex items-center gap-1.5 transition-colors"
                >
                  <Smile className="size-3.5" />
                  Emoji Ekle
                </button>
              </div>
            </div>

            {/* Schedule & Actions */}
            <div className="bg-[#111513]/90 backdrop-blur-xl border border-white/[0.06] rounded-[20px] p-5 shadow-2xl space-y-4">
              <h3 className="font-medium text-white text-sm flex items-center gap-2">
                <Clock className="size-4 text-emerald-400" />
                Zamanlama Ayarı
              </h3>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs text-zinc-400">Yayın Tarihi</label>
                  <input
                    type="date"
                    value={scheduleDate}
                    onChange={e => setScheduleDate(e.target.value)}
                    className="w-full px-3 py-2 bg-white/[0.03] border border-white/[0.08] rounded-xl text-sm text-white focus:outline-none focus:border-emerald-500/50"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs text-zinc-400">Saat</label>
                  <input
                    type="time"
                    value={scheduleTime}
                    onChange={e => setScheduleTime(e.target.value)}
                    className="w-full px-3 py-2 bg-white/[0.03] border border-white/[0.08] rounded-xl text-sm text-white focus:outline-none focus:border-emerald-500/50"
                  />
                </div>
              </div>
              <div className="flex gap-3 pt-2">
                <button
                  onClick={() => { setScheduleDate(""); setScheduleTime(""); handleSchedule(); }}
                  className="flex-1 px-4 py-2.5 border border-white/[0.08] hover:bg-white/[0.04] text-zinc-300 rounded-xl text-sm font-medium transition-colors"
                >
                  Taslak Olarak Kaydet
                </button>
                <button
                  onClick={handleSchedule}
                  className="flex-1 px-4 py-2.5 bg-emerald-500 hover:bg-emerald-400 text-black rounded-xl text-sm font-medium transition-all shadow-[0_0_15px_rgba(16,185,129,0.25)] flex items-center justify-center gap-2"
                >
                  <Send className="size-4" />
                  {scheduleDate ? "Planla ve Sıraya Al" : "Hemen Paylaş"}
                </button>
              </div>
            </div>
          </div>

          {/* Right Col: Platform Picker & Live Preview */}
          <div className="space-y-4">
            <div className="bg-[#111513]/90 backdrop-blur-xl border border-white/[0.06] rounded-[20px] p-5 shadow-2xl">
              <h3 className="font-medium text-white text-sm mb-4">Paylaşılacak Platformlar</h3>
              <div className="space-y-2">
                {PLATFORMS.map(p => {
                  const isChecked = selectedPlatforms.includes(p.id)
                  return (
                    <label
                      key={p.id}
                      className={`flex items-center justify-between p-2.5 rounded-xl cursor-pointer border transition-all ${
                        isChecked
                          ? "bg-emerald-500/10 border-emerald-500/30 text-white"
                          : "bg-white/[0.02] border-white/[0.05] text-zinc-400 hover:text-zinc-200 hover:bg-white/[0.04]"
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => togglePlatform(p.id)}
                          className="rounded border-zinc-700 bg-zinc-900 text-emerald-500 focus:ring-0"
                        />
                        <span className="text-sm font-medium">{p.name}</span>
                      </div>
                      <span className="size-2 rounded-full" style={{ backgroundColor: p.color }} />
                    </label>
                  )
                })}
              </div>
            </div>

            {/* Live Preview Card */}
            {content && (
              <div className="bg-[#111513]/90 backdrop-blur-xl border border-white/[0.06] rounded-[20px] p-5 shadow-2xl space-y-3">
                <div className="flex items-center justify-between border-b border-white/[0.06] pb-3">
                  <h3 className="font-medium text-white text-xs uppercase tracking-wider">Canlı Önizleme</h3>
                  <Eye className="size-3.5 text-zinc-500" />
                </div>
                <div className="bg-black/40 rounded-xl p-4 border border-white/[0.04]">
                  <div className="flex items-center gap-2 mb-3">
                    <div className="size-8 rounded-full bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 flex items-center justify-center text-xs font-bold">
                      SE
                    </div>
                    <div>
                      <p className="text-xs font-semibold text-white">@sunum_erp</p>
                      <p className="text-[10px] text-zinc-500 font-mono">
                        {scheduleDate ? formatDate(`${scheduleDate}T${scheduleTime || "00:00"}`) : "Şimdi"}
                      </p>
                    </div>
                  </div>
                  <p className="text-sm text-zinc-200 whitespace-pre-wrap leading-relaxed">{content}</p>
                </div>
              </div>
            )}
          </div>
        </div>
      ) : (
        /* Post List Table */
        <div className="bg-[#111513]/90 backdrop-blur-xl border border-white/[0.06] rounded-[20px] shadow-2xl overflow-hidden">
          <div className="p-5 border-b border-white/[0.06] flex items-center justify-between">
            <h3 className="font-medium text-white text-sm">Tüm Sosyal Medya Gönderileri</h3>
            <span className="text-xs text-zinc-400">{posts.length} kayıt</span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="bg-white/[0.02] text-zinc-400 text-xs font-medium border-b border-white/[0.06]">
                <tr>
                  <th className="px-5 py-3">İçerik</th>
                  <th className="px-5 py-3">Platformlar</th>
                  <th className="px-5 py-3">Tarih</th>
                  <th className="px-5 py-3">Durum</th>
                  <th className="px-5 py-3 text-right">İşlem</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/[0.04]">
                {posts.map(p => (
                  <tr key={p.id} className="hover:bg-white/[0.02] transition-colors group">
                    <td className="px-5 py-4 max-w-sm">
                      <p className="truncate text-zinc-200">{p.content}</p>
                    </td>
                    <td className="px-5 py-4">
                      <div className="flex gap-1.5">
                        {p.platforms.map(pid => (
                          <PlatformIcon key={pid} platformId={pid} />
                        ))}
                      </div>
                    </td>
                    <td className="px-5 py-4 text-zinc-400 font-mono text-xs whitespace-nowrap">{formatDate(p.scheduledAt)}</td>
                    <td className="px-5 py-4">{getStatusBadge(p.status)}</td>
                    <td className="px-5 py-4 text-right">
                      <button
                        onClick={() => toast.info("Düzenleme paneli hazırlanıyor.")}
                        className="opacity-0 group-hover:opacity-100 p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-white/[0.06] transition-all"
                      >
                        <Edit className="size-3.5" />
                      </button>
                    </td>
                  </tr>
                ))}
                {posts.length === 0 && (
                  <tr>
                    <td colSpan={5} className="px-5 py-8 text-center text-zinc-500">Kayıtlı gönderi bulunamadı.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}

// ─── TabAnalitik ──────────────────────────────────────────────────────

function TabAnalitik() {
  const totalFollowers  = MOCK_ANALYTICS.reduce((s, a) => s + a.followers, 0)
  const totalReach      = MOCK_ANALYTICS.reduce((s, a) => s + a.reach, 0)
  const avgEngagement   = (MOCK_ANALYTICS.reduce((s, a) => s + a.engagement, 0) / MOCK_ANALYTICS.length).toFixed(1)
  const totalPosts      = MOCK_ANALYTICS.reduce((s, a) => s + a.posts, 0)

  return (
    <div className="space-y-6">
      {/* Spline Chart: Haftalık Trend */}
      <div className="bg-[#111513]/90 backdrop-blur-xl border border-white/[0.06] rounded-[20px] p-6 shadow-2xl">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="font-medium text-white text-base">Haftalık Erişim ve Etkileşim Eğilimi</h3>
            <p className="text-xs text-zinc-400 mt-0.5">Parlayan Zümrüt spline analitiği</p>
          </div>
          <div className="flex items-center gap-4 text-xs font-mono">
            <span className="flex items-center gap-1.5 text-emerald-400">
              <span className="size-2 rounded-full bg-emerald-400 shadow-[0_0_8px_#34D399]" />
              Erişim
            </span>
            <span className="flex items-center gap-1.5 text-sky-400">
              <span className="size-2 rounded-full bg-sky-400 shadow-[0_0_8px_#38BDF8]" />
              Etkileşim
            </span>
          </div>
        </div>
        <div className="h-64 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={MOCK_WEEKLY_TRENDS} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <defs>
                <linearGradient id="emeraldGlow" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#10B981" stopOpacity={0.35}/>
                  <stop offset="95%" stopColor="#10B981" stopOpacity={0}/>
                </linearGradient>
                <linearGradient id="skyGlow" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#38BDF8" stopOpacity={0.25}/>
                  <stop offset="95%" stopColor="#38BDF8" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
              <XAxis dataKey="day" stroke="#71717A" tick={{ fill: "#71717A", fontSize: 11 }} />
              <YAxis stroke="#71717A" tick={{ fill: "#71717A", fontSize: 11 }} />
              <Tooltip
                contentStyle={{
                  backgroundColor: "#111513",
                  borderColor: "rgba(255,255,255,0.1)",
                  borderRadius: "12px",
                  color: "#fff",
                  boxShadow: "0 10px 25px -5px rgba(0, 0, 0, 0.5)",
                }}
              />
              <Area
                type="monotone"
                dataKey="erisim"
                stroke="#34D399"
                strokeWidth={2.5}
                fillOpacity={1}
                fill="url(#emeraldGlow)"
              />
              <Area
                type="monotone"
                dataKey="etkilesim"
                stroke="#38BDF8"
                strokeWidth={2}
                fillOpacity={1}
                fill="url(#skyGlow)"
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Per-Platform Table */}
      <div className="bg-[#111513]/90 backdrop-blur-xl border border-white/[0.06] rounded-[20px] shadow-2xl overflow-hidden">
        <div className="p-5 border-b border-white/[0.06]">
          <h3 className="font-medium text-white text-sm">Platform Bazlı Dağılım ve Başarı Skoru</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="bg-white/[0.02] text-zinc-400 text-xs font-medium border-b border-white/[0.06]">
              <tr>
                <th className="px-5 py-3">Platform</th>
                <th className="px-5 py-3 text-right">Takipçi</th>
                <th className="px-5 py-3 text-right">Erişim</th>
                <th className="px-5 py-3 text-right">Etkileşim Oranı</th>
                <th className="px-5 py-3 text-right">Gönderi</th>
                <th className="px-5 py-3">Doluluk</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/[0.04]">
              {MOCK_ANALYTICS.map(a => (
                <tr key={a.platform} className="hover:bg-white/[0.02] transition-colors">
                  <td className="px-5 py-3.5">
                    <div className="flex items-center gap-2">
                      <span className="size-2 rounded-full shrink-0" style={{ backgroundColor: a.color }} />
                      <span className="font-medium text-white">{a.platform}</span>
                    </div>
                  </td>
                  <td className="px-5 py-3.5 text-right font-mono text-zinc-300">{a.followers.toLocaleString("tr-TR")}</td>
                  <td className="px-5 py-3.5 text-right font-mono text-zinc-300">{a.reach.toLocaleString("tr-TR")}</td>
                  <td className="px-5 py-3.5 text-right font-mono text-emerald-400">%{a.engagement}</td>
                  <td className="px-5 py-3.5 text-right font-mono text-zinc-400">{a.posts}</td>
                  <td className="px-5 py-3.5">
                    <div className="flex items-center gap-2">
                      <div className="w-24 h-1.5 bg-white/[0.06] rounded-full overflow-hidden">
                        <motion.div
                          className="h-full rounded-full bg-emerald-400"
                          initial={{ width: 0 }}
                          animate={{ width: `${Math.min(a.engagement * 10, 100)}%` }}
                          transition={{ duration: 0.8, ease: "easeOut" }}
                        />
                      </div>
                      <span className="text-[11px] text-zinc-400 font-mono">%{a.engagement}</span>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

// ─── TabPlatformlar ───────────────────────────────────────────────────

function TabPlatformlar() {
  const [platforms, setPlatforms] = useState<Platform[]>(PLATFORMS)
  const [connecting, setConnecting] = useState<string | null>(null)

  const handleConnect = async (id: string) => {
    setConnecting(id)
    try {
      const res = await fetch(`/api/social-media/platforms/${id}/connect`, { method: "POST" })
      if (res.ok) {
        const { authUrl } = await res.json()
        if (authUrl) {
          window.open(authUrl, "_blank", "width=600,height=700")
          toast.success(`${platforms.find(p => p.id === id)?.name} bağlantısı başlatıldı.`)
        } else {
          setPlatforms(prev => prev.map(p => p.id === id ? { ...p, connected: true, handle: "@hesap_adi" } : p))
          toast.success(`${platforms.find(p => p.id === id)?.name} bağlandı!`)
        }
      } else {
        const d = await res.json()
        toast.error(d.error || "Bağlantı kurulamadı.")
      }
    } catch {
      toast.error("Ağ hatası. Postiz backend bağlı mı?")
    } finally {
      setConnecting(null)
    }
  }

  const handleDisconnect = async (id: string) => {
    if (!confirm(`${platforms.find(p => p.id === id)?.name} bağlantısını kesmek istiyor musunuz?`)) return
    try {
      const res = await fetch(`/api/social-media/platforms/${id}/disconnect`, { method: "DELETE" })
      if (res.ok) {
        setPlatforms(prev => prev.map(p => p.id === id ? { ...p, connected: false, handle: undefined } : p))
        toast.success("Bağlantı kesildi.")
      } else {
        toast.error("Bağlantı kesilemedi.")
      }
    } catch {
      toast.error("Ağ hatası.")
    }
  }

  const connected    = platforms.filter(p => p.connected)
  const disconnected = platforms.filter(p => !p.connected)

  return (
    <div className="space-y-6">
      {connected.length > 0 && (
        <div>
          <h3 className="text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-3">
            Bağlı Platformlar ({connected.length})
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {connected.map(p => (
              <div key={p.id} className="bg-[#111513]/90 backdrop-blur-xl border border-emerald-500/30 rounded-[20px] p-5 shadow-2xl">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="size-10 rounded-xl flex items-center justify-center bg-white/[0.05]">
                      <span className="font-bold text-xs uppercase" style={{ color: p.color }}>{p.name.slice(0, 2)}</span>
                    </div>
                    <div>
                      <p className="font-medium text-white text-sm">{p.name}</p>
                      {p.handle && <p className="text-xs text-zinc-400">{p.handle}</p>}
                    </div>
                  </div>
                  <span className="size-2 rounded-full bg-emerald-400 shadow-[0_0_8px_#34D399]" />
                </div>
                <button
                  onClick={() => handleDisconnect(p.id)}
                  className="mt-4 w-full text-xs text-rose-400 hover:text-rose-300 hover:bg-rose-500/10 py-1.5 rounded-lg border border-rose-500/20 transition-colors"
                >
                  Bağlantıyı Kes
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      <div>
        <h3 className="text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-3">
          {connected.length > 0 ? "Kullanılabilir Platformlar" : "Tüm Platformlar"} ({disconnected.length})
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {disconnected.map(p => (
            <div key={p.id} className="bg-[#111513]/90 backdrop-blur-xl border border-white/[0.06] hover:border-white/[0.12] rounded-[20px] p-5 shadow-2xl transition-all">
              <div className="flex items-center gap-3 mb-4">
                <div className="size-10 rounded-xl flex items-center justify-center bg-white/[0.03]">
                  <span className="font-bold text-xs uppercase" style={{ color: p.color }}>{p.name.slice(0, 2)}</span>
                </div>
                <div>
                  <p className="font-medium text-white text-sm">{p.name}</p>
                  <p className="text-xs text-zinc-500">Bağlı değil</p>
                </div>
              </div>
              <button
                onClick={() => handleConnect(p.id)}
                disabled={connecting === p.id}
                className="w-full py-2 text-xs font-medium text-zinc-200 hover:text-white bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.08] rounded-xl transition-all disabled:opacity-50 flex items-center justify-center gap-1.5"
              >
                {connecting === p.id ? (
                  <><RefreshCw className="size-3.5 animate-spin" /> Bağlanıyor…</>
                ) : (
                  <><Plus className="size-3.5" /> Bağlantı Kur</>
                )}
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

// ─── TabEkip ──────────────────────────────────────────────────────────

function TabEkip() {
  const maxPosts = Math.max(...MOCK_TEAM.map(x => x.postsThisMonth), 1)

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-medium text-white text-base">Ekip ve Sorumlular</h3>
          <p className="text-xs text-zinc-400 mt-0.5">{MOCK_TEAM.length} aktif içerik üreticisi</p>
        </div>
        <button
          onClick={() => toast.info("Ekip üyesi davet paneli yakında aktif edilecek.")}
          className="flex items-center gap-2 px-4 py-2 bg-emerald-500 hover:bg-emerald-400 text-black text-xs font-semibold rounded-xl transition-all shadow-[0_0_15px_rgba(16,185,129,0.2)]"
        >
          <Plus className="size-3.5" />
          Üye Davet Et
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {MOCK_TEAM.map(member => (
          <div key={member.id} className="bg-[#111513]/90 backdrop-blur-xl border border-white/[0.06] rounded-[20px] p-5 shadow-2xl">
            <div className="flex items-start gap-3.5">
              <div className="size-10 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 flex items-center justify-center font-bold text-sm shrink-0">
                {member.fullName.substring(0, 2).toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2">
                  <p className="font-medium text-white text-sm truncate">{member.fullName}</p>
                  <span className="text-[11px] px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 shrink-0">
                    {member.role}
                  </span>
                </div>
                {member.email && <p className="text-xs text-zinc-400 mt-0.5">{member.email}</p>}

                <div className="flex items-center gap-3 mt-3">
                  <div className="flex gap-1">
                    {member.platforms.map(pid => (
                      <PlatformIcon key={pid} platformId={pid} />
                    ))}
                  </div>
                  <span className="text-xs text-zinc-500 font-mono">• {member.postsThisMonth} gönderi (bu ay)</span>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Activity Bar Chart */}
      <div className="bg-[#111513]/90 backdrop-blur-xl border border-white/[0.06] rounded-[20px] p-6 shadow-2xl space-y-4">
        <h3 className="font-medium text-white text-sm">Ekip Üretim Performansı (Bu Ay)</h3>
        <div className="space-y-3">
          {MOCK_TEAM.sort((a, b) => b.postsThisMonth - a.postsThisMonth).map(m => (
            <div key={m.id} className="flex items-center gap-3">
              <span className="text-xs text-zinc-300 w-36 truncate">{m.fullName}</span>
              <div className="flex-1 h-2 bg-white/[0.04] rounded-full overflow-hidden">
                <motion.div
                  className="h-full rounded-full bg-emerald-400 shadow-[0_0_8px_#34D399]"
                  initial={{ width: 0 }}
                  animate={{ width: `${(m.postsThisMonth / maxPosts) * 100}%` }}
                  transition={{ duration: 0.8, ease: "easeOut" }}
                />
              </div>
              <span className="text-xs font-mono text-zinc-400 w-16 text-right">{m.postsThisMonth} post</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

// ─── Main Component ───────────────────────────────────────────────────

export default function SosyalMedyaClient() {
  const { currentBranch }           = useAuth()
  const [activeTab, setActiveTab]   = useState<TabId>("takvim")
  const [posts, setPosts]           = useState<ScheduledPost[]>(MOCK_POSTS)
  const [backendStatus, setStatus]  = useState<"checking" | "online" | "offline">("checking")

  // Check Postiz backend connectivity
  useEffect(() => {
    const check = async () => {
      try {
        const res = await fetch("/api/social-media/health", { signal: AbortSignal.timeout(4000) })
        setStatus(res.ok ? "online" : "offline")
      } catch {
        setStatus("offline")
      }
    }
    check()
  }, [])

  // Load real posts when backend is online
  useEffect(() => {
    if (backendStatus !== "online") return
    const loadPosts = async () => {
      try {
        const res = await fetch("/api/social-media/posts")
        if (res.ok) {
          const data = await res.json()
          if (Array.isArray(data) && data.length > 0) setPosts(Array.isArray(data) ? data : [])
        }
      } catch { /* keep mock data */ }
    }
    loadPosts()
  }, [backendStatus])

  const tabs: { id: TabId; label: string; icon: React.ReactNode }[] = [
    { id: "takvim",    label: "Takvim",    icon: <CalendarIcon className="size-4" /> },
    { id: "gonderiler",label: "Gönderiler",icon: <Send className="size-4" />         },
    { id: "analitik",  label: "Analitik",  icon: <BarChart3 className="size-4" />     },
    { id: "platformlar",label:"Platformlar",icon: <Share2 className="size-4" />       },
    { id: "ekip",      label: "Ekip",      icon: <Users className="size-4" />        },
  ]

  const totalScheduled  = posts.filter(p => p.status === "scheduled").length
  const totalPublished  = posts.filter(p => p.status === "published").length

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-2">
        <div>
          <h1 className="text-2xl font-light tracking-wide text-white">Sosyal Medya Yönetimi</h1>
          <p className="text-xs text-zinc-400 mt-1">
            {currentBranch ? `${currentBranch.name} · Çok Kanallı Sosyal Medya Ekosistemi` : "Tüm platformlar tek ekranda senkronize"}
          </p>
        </div>

        <div className="flex items-center gap-3">
          {/* Backend Status */}
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-mono border border-white/[0.08] bg-white/[0.02]">
            <span className={`size-2 rounded-full ${
              backendStatus === "online" ? "bg-emerald-400 shadow-[0_0_8px_#34D399]" : backendStatus === "offline" ? "bg-rose-500" : "bg-amber-400 animate-pulse"
            }`} />
            <span className="text-zinc-300">
              {backendStatus === "online" ? "Postiz Bağlı" : backendStatus === "offline" ? "Postiz Çevrimdışı" : "Kontrol ediliyor"}
            </span>
          </div>

          <button
            onClick={() => setActiveTab("gonderiler")}
            className="bg-emerald-500 hover:bg-emerald-400 text-black px-4 py-2 rounded-xl text-xs font-semibold flex items-center gap-1.5 shadow-[0_0_15px_rgba(16,185,129,0.25)] transition-all"
          >
            <Plus className="size-4" />
            Yeni Gönderi
          </button>
        </div>
      </div>

      {/* Kutusuz (Borderless) Üst KPI Şeridi */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-8 py-3 border-b border-white/[0.06]">
        <div>
          <div className="flex items-center gap-1.5 text-zinc-400 text-[11px] uppercase tracking-wider">
            <Clock className="size-3.5 text-zinc-400" />
            <span>Planlanmış</span>
          </div>
          <div className="flex items-baseline gap-2 mt-1">
            <span className="text-3xl font-light text-white">
              <AnimatedNumber value={totalScheduled} />
            </span>
            <span className="text-[11px] font-mono text-sky-400 bg-sky-500/10 px-2 py-0.5 rounded-full border border-sky-500/20">
              Bekleyen
            </span>
          </div>
        </div>

        <div>
          <div className="flex items-center gap-1.5 text-zinc-400 text-[11px] uppercase tracking-wider">
            <CheckCircle2 className="size-3.5 text-zinc-400" />
            <span>Yayınlandı</span>
          </div>
          <div className="flex items-baseline gap-2 mt-1">
            <span className="text-3xl font-light text-white">
              <AnimatedNumber value={totalPublished} />
            </span>
            <span className="text-[11px] font-mono text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">
              Canlıda
            </span>
          </div>
        </div>

        <div>
          <div className="flex items-center gap-1.5 text-zinc-400 text-[11px] uppercase tracking-wider">
            <Share2 className="size-3.5 text-zinc-400" />
            <span>Aktif Platform</span>
          </div>
          <div className="flex items-baseline gap-2 mt-1">
            <span className="text-3xl font-light text-white">
              <AnimatedNumber value={PLATFORMS.length} />
            </span>
            <span className="text-[11px] font-mono text-zinc-400 bg-white/[0.05] px-2 py-0.5 rounded-full border border-white/[0.08]">
              Kanal
            </span>
          </div>
        </div>

        <div>
          <div className="flex items-center gap-1.5 text-zinc-400 text-[11px] uppercase tracking-wider">
            <Users className="size-3.5 text-zinc-400" />
            <span>Ekip Üyesi</span>
          </div>
          <div className="flex items-baseline gap-2 mt-1">
            <span className="text-3xl font-light text-white">
              <AnimatedNumber value={MOCK_TEAM.length} />
            </span>
            <span className="text-[11px] font-mono text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">
              Aktif
            </span>
          </div>
        </div>
      </div>

      {/* Sliding Pill Tab Switcher */}
      <div className="flex gap-1 border-b border-white/[0.06] pb-2 overflow-x-auto scrollbar-none">
        {tabs.map(t => {
          const isActive = activeTab === t.id
          return (
            <button
              key={t.id}
              onClick={() => setActiveTab(t.id)}
              className={`relative flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-medium transition-colors ${
                isActive ? "text-white" : "text-zinc-400 hover:text-zinc-200"
              }`}
            >
              {isActive && (
                <motion.div
                  layoutId="socialMediaActiveTab"
                  className="absolute inset-0 bg-white/[0.08] border border-white/[0.08] rounded-xl"
                  transition={{ type: "spring", stiffness: 350, damping: 30 }}
                />
              )}
              <span className="relative z-10">{t.icon}</span>
              <span className="relative z-10">{t.label}</span>
            </button>
          )
        })}
      </div>

      {/* Active Tab Content */}
      <AnimatePresence mode="wait">
        <motion.div
          key={activeTab}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }}
          transition={{ duration: 0.18 }}
        >
          {activeTab === "takvim"     && <TabCalendar posts={posts} />}
          {activeTab === "gonderiler" && <TabGonderiler posts={posts} />}
          {activeTab === "analitik"   && <TabAnalitik />}
          {activeTab === "platformlar"&& <TabPlatformlar />}
          {activeTab === "ekip"       && <TabEkip />}
        </motion.div>
      </AnimatePresence>
    </div>
  )
}
