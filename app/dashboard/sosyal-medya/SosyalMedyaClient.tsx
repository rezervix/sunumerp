"use client"

import { useState, useEffect, useCallback } from "react"
import { useAuth } from "@/lib/auth/context"
import { toast } from "sonner"

// â”€â”€â”€ Types â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

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

// â”€â”€â”€ Constants â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

const PLATFORMS: Platform[] = [
  { id: "instagram",  name: "Instagram",  icon: "photo_camera",      color: "#E1306C", connected: false },
  { id: "twitter",    name: "Twitter/X",  icon: "alternate_email",   color: "#000000", connected: false },
  { id: "facebook",   name: "Facebook",   icon: "thumb_up",          color: "#1877F2", connected: false },
  { id: "linkedin",   name: "LinkedIn",   icon: "business_center",   color: "#0A66C2", connected: false },
  { id: "tiktok",     name: "TikTok",     icon: "music_note",        color: "#010101", connected: false },
  { id: "youtube",    name: "YouTube",    icon: "smart_display",     color: "#FF0000", connected: false },
  { id: "threads",    name: "Threads",    icon: "hub",               color: "#000000", connected: false },
  { id: "pinterest",  name: "Pinterest",  icon: "push_pin",          color: "#E60023", connected: false },
  { id: "discord",    name: "Discord",    icon: "headset_mic",       color: "#5865F2", connected: false },
  { id: "bluesky",    name: "Bluesky",    icon: "cloud",             color: "#0085FF", connected: false },
  { id: "reddit",     name: "Reddit",     icon: "forum",             color: "#FF4500", connected: false },
  { id: "mastodon",   name: "Mastodon",   icon: "share",             color: "#6364FF", connected: false },
  { id: "slack",      name: "Slack",      icon: "message",           color: "#4A154B", connected: false },
]

const MOCK_POSTS: ScheduledPost[] = [
  { id: "1", content: "ğŸš€ Yeni özelliğimizi keşfedin!", platforms: ["instagram", "twitter"], scheduledAt: new Date(Date.now() + 2 * 3600000).toISOString(), status: "scheduled" },
  { id: "2", content: "Müşterilerimizle gurur duyuyoruz ğŸ’™", platforms: ["linkedin", "facebook"], scheduledAt: new Date(Date.now() + 5 * 3600000).toISOString(), status: "scheduled" },
  { id: "3", content: "Haftalık içerik ipuçları #sosyalmedya", platforms: ["instagram"], scheduledAt: new Date(Date.now() - 3600000).toISOString(), status: "published" },
]

const MOCK_ANALYTICS: AnalyticsData[] = [
  { platform: "Instagram",  followers: 12400, engagement: 4.8, reach: 45000, posts: 28, color: "#E1306C" },
  { platform: "Twitter/X",  followers:  8200, engagement: 2.3, reach: 31000, posts: 54, color: "#000000" },
  { platform: "LinkedIn",   followers:  5600, engagement: 5.1, reach: 18000, posts: 12, color: "#0A66C2" },
  { platform: "Facebook",   followers: 15300, engagement: 1.9, reach: 52000, posts: 20, color: "#1877F2" },
  { platform: "TikTok",     followers:  3100, engagement: 8.7, reach: 98000, posts:  8, color: "#010101" },
  { platform: "YouTube",    followers:  1800, engagement: 6.2, reach: 22000, posts:  4, color: "#FF0000" },
]

const MOCK_TEAM: TeamMember[] = [
  { id: "1", fullName: "Ahmet Yılmaz",    email: "ahmet@example.com",    role: "İçerik Yöneticisi", platforms: ["instagram", "twitter", "linkedin"], postsThisMonth: 34 },
  { id: "2", fullName: "Zeynep Kaya",     email: "zeynep@example.com",   role: "Sosyal Medya Uzmanı", platforms: ["facebook", "instagram", "tiktok"], postsThisMonth: 28 },
  { id: "3", fullName: "Emre Demir",      email: "emre@example.com",     role: "Grafik Tasarımcı",  platforms: ["pinterest", "instagram"], postsThisMonth: 16 },
]

// â”€â”€â”€ Helpers â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

function getStatusStyles(status: ScheduledPost["status"]) {
  switch (status) {
    case "scheduled":  return "bg-blue-50  dark:bg-blue-500/10  text-blue-700  dark:text-blue-400"
    case "published":  return "bg-green-50 dark:bg-green-500/10 text-green-700 dark:text-green-400"
    case "failed":     return "bg-red-50   dark:bg-red-500/10   text-red-700   dark:text-red-400"
    case "draft":      return "bg-gray-50  dark:bg-gray-500/10  text-gray-700  dark:text-gray-400"
  }
}

function getStatusLabel(status: ScheduledPost["status"]) {
  switch (status) {
    case "scheduled": return "Planlandı"
    case "published": return "Yayınlandı"
    case "failed":    return "Başarısız"
    case "draft":     return "Taslak"
  }
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleString("tr-TR", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" })
}

// â”€â”€â”€ Sub-components â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

function PageHeader({ title, subtitle, action }: { title: string; subtitle: string; action?: React.ReactNode }) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
      <div>
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-1">{title}</h1>
        <p className="text-sm text-gray-500">{subtitle}</p>
      </div>
      {action && <div className="flex items-center gap-3">{action}</div>}
    </div>
  )
}

function Card({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={`bg-white dark:bg-[#1e1e1e] border border-gray-200 dark:border-gray-800 rounded-2xl shadow-sm ${className}`}>
      {children}
    </div>
  )
}

function StatCard({ icon, label, value, iconColor }: { icon: string; label: string; value: string | number; iconColor: string }) {
  return (
    <Card className="p-5">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-medium text-gray-500">{label}</h3>
        <span className={`material-symbols-outlined ${iconColor}`}>{icon}</span>
      </div>
      <div className="text-2xl font-bold text-gray-900 dark:text-white">{value}</div>
    </Card>
  )
}

// â”€â”€â”€ TabCalendar â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

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
    <div className="space-y-4">
      {/* Calendar nav */}
      <Card className="p-6">
        <div className="flex items-center justify-between mb-6">
          <button
            onClick={() => setCurrentDate(new Date(year, month - 1, 1))}
            className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
          >
            <span className="material-symbols-outlined text-[20px] text-gray-500">chevron_left</span>
          </button>
          <h3 className="text-lg font-bold text-gray-900 dark:text-white capitalize">{monthName}</h3>
          <button
            onClick={() => setCurrentDate(new Date(year, month + 1, 1))}
            className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
          >
            <span className="material-symbols-outlined text-[20px] text-gray-500">chevron_right</span>
          </button>
        </div>

        <div className="overflow-x-auto">
          <div className="min-w-[600px]">
            {/* Day headers */}
            <div className="grid grid-cols-7 gap-1 mb-2">
              {["Pzt","Sal","Çar","Per","Cum","Cmt","Paz"].map(d => (
                <div key={d} className="text-center text-xs font-semibold text-gray-400 py-2">{d}</div>
              ))}
            </div>

            {/* Grid */}
            <div className="grid grid-cols-7 gap-1">
              {/* Empty offset cells */}
              {Array.from({ length: offset }).map((_, i) => <div key={`e${i}`} />)}

              {/* Day cells */}
              {Array.from({ length: daysInMonth }).map((_, i) => {
                const day      = i + 1
                const isToday  = day === today.getDate() && month === today.getMonth() && year === today.getFullYear()
                const dayPosts = postsOnDay(day)

                return (
                  <div
                    key={day}
                    className={`min-h-[70px] p-1.5 rounded-xl border transition-colors cursor-pointer hover:border-primary/30 ${
                      isToday
                        ? "border-primary bg-blue-50/50 dark:bg-blue-500/5"
                        : "border-transparent hover:bg-gray-50 dark:hover:bg-gray-800/50"
                    }`}
                  >
                    <span className={`text-xs font-semibold block mb-1 ${isToday ? "text-primary" : "text-gray-600 dark:text-gray-400"}`}>
                      {day}
                    </span>
                    <div className="space-y-0.5">
                      {dayPosts.slice(0, 2).map(p => (
                        <div key={p.id} className="text-[10px] bg-primary/10 text-primary dark:text-blue-400 rounded px-1 py-0.5 truncate">
                          {p.content.substring(0, 20)}…
                        </div>
                      ))}
                      {dayPosts.length > 2 && (
                        <div className="text-[10px] text-gray-400">+{dayPosts.length - 2} daha</div>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      </Card>

      {/* Upcoming posts */}
      <Card>
        <div className="p-5 border-b border-gray-100 dark:border-gray-800">
          <h3 className="font-bold text-gray-900 dark:text-white">Yaklaşan Gönderiler</h3>
        </div>
        <div className="divide-y divide-gray-100 dark:divide-gray-800">
          {posts.filter(p => p.status === "scheduled").map(p => (
            <div key={p.id} className="px-5 py-4 flex items-center gap-4">
              <div className="flex -space-x-1">
                {p.platforms.map(pid => {
                  const pl = PLATFORMS.find(x => x.id === pid)
                  return pl ? (
                    <span key={pid} title={pl.name} className="material-symbols-outlined text-[16px]" style={{ color: pl.color }}>
                      {pl.icon}
                    </span>
                  ) : null
                })}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm text-gray-700 dark:text-gray-300 truncate">{p.content}</p>
              </div>
              <span className="text-xs text-gray-400 whitespace-nowrap">{formatDate(p.scheduledAt)}</span>
              <span className={`text-xs px-2 py-1 rounded-full font-medium ${getStatusStyles(p.status)}`}>
                {getStatusLabel(p.status)}
              </span>
            </div>
          ))}
          {posts.filter(p => p.status === "scheduled").length === 0 && (
            <div className="px-5 py-8 text-center text-gray-400 text-sm">Planlanmış gönderi yok.</div>
          )}
        </div>
      </Card>
    </div>
  )
}

// â”€â”€â”€ TabGonderiler â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

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
        toast.success("İçerik oluşturuldu!")
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
    if (!content.trim())              { toast.error("İçerik boş olamaz."); return }
    if (selectedPlatforms.length === 0){ toast.error("En az bir platform seçin."); return }
    if (!scheduleDate)                { toast.error("Tarih seçin."); return }

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
        toast.success("Gönderi planlandı!")
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
    <div className="space-y-4">
      {/* Inner tab switcher */}
      <div className="flex gap-1 bg-gray-100 dark:bg-gray-800/50 p-1 rounded-xl w-fit">
        {(["compose", "list"] as const).map(t => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
              tab === t ? "bg-white dark:bg-[#1e1e1e] text-primary shadow-sm" : "text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
            }`}
          >
            {t === "compose" ? "Oluştur" : "Tüm Gönderiler"}
          </button>
        ))}
      </div>

      {tab === "compose" ? (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left: Compose */}
          <div className="lg:col-span-2 space-y-4">
            {/* AI Assistant */}
            <Card className="p-5">
              <div className="flex items-center gap-2 mb-3">
                <span className="material-symbols-outlined text-primary text-[20px]">auto_awesome</span>
                <h3 className="font-bold text-gray-900 dark:text-white text-sm">Gemini AI ile İçerik Oluştur</h3>
              </div>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={aiPrompt}
                  onChange={e => setAiPrompt(e.target.value)}
                  onKeyDown={e => e.key === "Enter" && generateWithAI()}
                  placeholder="Konu veya açıklama girin (ör: yeni ürün lansmanı)"
                  className="flex-1 px-4 py-2 bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-gray-800 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all"
                />
                <button
                  onClick={generateWithAI}
                  disabled={aiLoading}
                  className="px-4 py-2 bg-primary hover:bg-blue-600 text-white text-sm font-medium rounded-xl transition-colors disabled:opacity-50 flex items-center gap-2"
                >
                  {aiLoading ? (
                    <span className="material-symbols-outlined text-[18px] animate-spin">sync</span>
                  ) : (
                    <span className="material-symbols-outlined text-[18px]">auto_awesome</span>
                  )}
                  {aiLoading ? "Oluşturuluyor…" : "Oluştur"}
                </button>
              </div>
            </Card>

            {/* Content editor */}
            <Card className="p-5">
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-bold text-gray-900 dark:text-white">İçerik</h3>
                <span className={`text-xs ${charCount > 280 ? "text-red-500" : "text-gray-400"}`}>{charCount} karakter</span>
              </div>
              <textarea
                value={content}
                onChange={e => handleContentChange(e.target.value)}
                rows={8}
                placeholder="Gönderi içeriğinizi buraya yazın veya AI ile oluşturun…"
                className="w-full px-4 py-3 bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-gray-800 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all resize-none leading-relaxed"
              />
              {/* Quick action buttons */}
              <div className="flex gap-2 mt-3">
                <button
                  onClick={() => selectedPlatforms.includes("twitter") && charCount > 280
                    ? toast.error("Twitter için 280 karakter sınırı aşıldı!")
                    : toast.info("Hashtag önerisi yakında eklenecek.")
                  }
                  className="text-xs text-gray-500 hover:text-primary flex items-center gap-1 transition-colors"
                >
                  <span className="material-symbols-outlined text-[14px]">tag</span>
                  Hashtag Ekle
                </button>
                <button
                  onClick={() => toast.info("Emoji seçici yakında eklenecek.")}
                  className="text-xs text-gray-500 hover:text-primary flex items-center gap-1 transition-colors"
                >
                  <span className="material-symbols-outlined text-[14px]">sentiment_satisfied</span>
                  Emoji
                </button>
              </div>
            </Card>

            {/* Schedule */}
            <Card className="p-5">
              <h3 className="font-bold text-gray-900 dark:text-white mb-3">Planlama</h3>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-medium text-gray-500">Tarih</label>
                  <input
                    type="date"
                    value={scheduleDate}
                    onChange={e => setScheduleDate(e.target.value)}
                    className="w-full px-3 py-2 bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-gray-800 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-medium text-gray-500">Saat</label>
                  <input
                    type="time"
                    value={scheduleTime}
                    onChange={e => setScheduleTime(e.target.value)}
                    className="w-full px-3 py-2 bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-gray-800 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
                  />
                </div>
              </div>
              <div className="flex gap-3 mt-4">
                <button
                  onClick={() => { setScheduleDate(""); setScheduleTime(""); handleSchedule(); }}
                  className="flex-1 px-4 py-2.5 border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 rounded-xl text-sm font-medium hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                >
                  <span className="flex items-center justify-center gap-1.5">
                    <span className="material-symbols-outlined text-[16px]">save</span>
                    Taslak Kaydet
                  </span>
                </button>
                <button
                  onClick={handleSchedule}
                  className="flex-1 px-4 py-2.5 bg-primary hover:bg-blue-600 text-white rounded-xl text-sm font-medium transition-colors shadow-sm"
                >
                  <span className="flex items-center justify-center gap-1.5">
                    <span className="material-symbols-outlined text-[16px]">schedule_send</span>
                    {scheduleDate ? "Planla" : "Şimdi Yayınla"}
                  </span>
                </button>
              </div>
            </Card>
          </div>

          {/* Right: Platform selector + Preview */}
          <div className="space-y-4">
            <Card className="p-5">
              <h3 className="font-bold text-gray-900 dark:text-white mb-4">Platform Seç</h3>
              <div className="space-y-2">
                {PLATFORMS.map(p => (
                  <label key={p.id} className="flex items-center gap-3 p-2.5 rounded-xl cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
                    <input
                      type="checkbox"
                      checked={selectedPlatforms.includes(p.id)}
                      onChange={() => togglePlatform(p.id)}
                      className="rounded text-primary"
                    />
                    <span className="material-symbols-outlined text-[18px]" style={{ color: p.color }}>{p.icon}</span>
                    <span className="text-sm text-gray-700 dark:text-gray-300">{p.name}</span>
                  </label>
                ))}
              </div>
            </Card>

            {/* Live preview */}
            {content && (
              <Card className="p-5">
                <h3 className="font-bold text-gray-900 dark:text-white mb-3 text-sm">Önizleme</h3>
                <div className="bg-gray-50 dark:bg-white/5 rounded-xl p-4">
                  <div className="flex items-center gap-2 mb-3">
                    <div className="size-8 rounded-full bg-primary/10 text-primary flex items-center justify-center text-xs font-bold">
                      SM
                    </div>
                    <div>
                      <p className="text-xs font-semibold text-gray-800 dark:text-white">@sizin_hesabiiniz</p>
                      <p className="text-[10px] text-gray-400">{scheduleDate ? formatDate(`${scheduleDate}T${scheduleTime || "00:00"}`) : "Şimdi"}</p>
                    </div>
                  </div>
                  <p className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap">{content}</p>
                </div>
              </Card>
            )}
          </div>
        </div>
      ) : (
        /* Post list */
        <Card>
          <div className="p-5 border-b border-gray-100 dark:border-gray-800">
            <h3 className="font-bold text-gray-900 dark:text-white">Tüm Gönderiler</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="bg-gray-50/50 dark:bg-white/5 text-gray-500 text-xs font-medium border-b border-gray-100 dark:border-gray-800">
                <tr>
                  <th className="px-5 py-3">İçerik</th>
                  <th className="px-5 py-3">Platformlar</th>
                  <th className="px-5 py-3">Tarih</th>
                  <th className="px-5 py-3">Durum</th>
                  <th className="px-5 py-3"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                {posts.map(p => (
                  <tr key={p.id} className="hover:bg-gray-50/50 dark:hover:bg-gray-800/30 transition-colors group">
                    <td className="px-5 py-4 max-w-xs">
                      <p className="truncate text-gray-700 dark:text-gray-300">{p.content}</p>
                    </td>
                    <td className="px-5 py-4">
                      <div className="flex gap-1">
                        {p.platforms.map(pid => {
                          const pl = PLATFORMS.find(x => x.id === pid)
                          return pl ? (
                            <span key={pid} title={pl.name} className="material-symbols-outlined text-[16px]" style={{ color: pl.color }}>{pl.icon}</span>
                          ) : null
                        })}
                      </div>
                    </td>
                    <td className="px-5 py-4 text-gray-500 whitespace-nowrap">{formatDate(p.scheduledAt)}</td>
                    <td className="px-5 py-4">
                      <span className={`inline-flex px-2.5 py-1 rounded-full text-xs font-medium ${getStatusStyles(p.status)}`}>
                        {getStatusLabel(p.status)}
                      </span>
                    </td>
                    <td className="px-5 py-4">
                      <button
                        onClick={() => toast.info("Düzenleme yakında eklenecek.")}
                        className="opacity-0 group-hover:opacity-100 p-1.5 rounded-lg text-gray-400 hover:text-primary hover:bg-primary/5 transition-all"
                      >
                        <span className="material-symbols-outlined text-[16px]">edit</span>
                      </button>
                    </td>
                  </tr>
                ))}
                {posts.length === 0 && (
                  <tr><td colSpan={5} className="px-5 py-8 text-center text-gray-400">Gönderi bulunamadı.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </div>
  )
}

// â”€â”€â”€ TabAnalitik â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

function TabAnalitik() {
  const totalFollowers  = MOCK_ANALYTICS.reduce((s, a) => s + a.followers, 0)
  const totalReach      = MOCK_ANALYTICS.reduce((s, a) => s + a.reach, 0)
  const avgEngagement   = (MOCK_ANALYTICS.reduce((s, a) => s + a.engagement, 0) / MOCK_ANALYTICS.length).toFixed(1)
  const totalPosts      = MOCK_ANALYTICS.reduce((s, a) => s + a.posts, 0)

  return (
    <div className="space-y-6">
      {/* KPI row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard icon="group"          label="Toplam Takipçi"    value={totalFollowers.toLocaleString("tr-TR")} iconColor="text-blue-500" />
        <StatCard icon="visibility"     label="Toplam Erişim"     value={totalReach.toLocaleString("tr-TR")}     iconColor="text-green-500" />
        <StatCard icon="thumb_up"       label="Ort. Etkileşim"   value={`%${avgEngagement}`}                     iconColor="text-amber-500" />
        <StatCard icon="article"        label="Toplam Gönderi"   value={totalPosts}                              iconColor="text-purple-500" />
      </div>

      {/* Per-platform table */}
      <Card>
        <div className="p-5 border-b border-gray-100 dark:border-gray-800">
          <h3 className="font-bold text-gray-900 dark:text-white">Platform Bazlı Analitik</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="bg-gray-50/50 dark:bg-white/5 text-gray-500 text-xs font-medium border-b border-gray-100 dark:border-gray-800">
              <tr>
                <th className="px-5 py-3">Platform</th>
                <th className="px-5 py-3 text-right">Takipçi</th>
                <th className="px-5 py-3 text-right">Erişim</th>
                <th className="px-5 py-3 text-right">Etkileşim</th>
                <th className="px-5 py-3 text-right">Gönderi</th>
                <th className="px-5 py-3">Etkileşim Oranı</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
              {MOCK_ANALYTICS.map(a => (
                <tr key={a.platform} className="hover:bg-gray-50/50 dark:hover:bg-gray-800/30 transition-colors">
                  <td className="px-5 py-4">
                    <div className="flex items-center gap-2">
                      <span className="size-2 rounded-full shrink-0" style={{ backgroundColor: a.color }} />
                      <span className="font-medium text-gray-800 dark:text-white">{a.platform}</span>
                    </div>
                  </td>
                  <td className="px-5 py-4 text-right text-gray-600 dark:text-gray-300">{a.followers.toLocaleString("tr-TR")}</td>
                  <td className="px-5 py-4 text-right text-gray-600 dark:text-gray-300">{a.reach.toLocaleString("tr-TR")}</td>
                  <td className="px-5 py-4 text-right text-gray-600 dark:text-gray-300">{a.engagement.toLocaleString("tr-TR")}</td>
                  <td className="px-5 py-4 text-right text-gray-600 dark:text-gray-300">{a.posts}</td>
                  <td className="px-5 py-4">
                    <div className="flex items-center gap-2">
                      <div className="flex-1 h-1.5 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
                        <div className="h-full rounded-full bg-primary" style={{ width: `${Math.min(a.engagement * 10, 100)}%` }} />
                      </div>
                      <span className="text-xs text-gray-500 w-8 text-right">%{a.engagement}</span>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Follower distribution bars */}
      <Card className="p-6">
        <h3 className="font-bold text-gray-900 dark:text-white mb-5">Takipçi Dağılımı</h3>
        <div className="space-y-3">
          {MOCK_ANALYTICS.sort((a, b) => b.followers - a.followers).map(a => (
            <div key={a.platform} className="flex items-center gap-3">
              <span className="text-sm text-gray-600 dark:text-gray-400 w-24 shrink-0">{a.platform}</span>
              <div className="flex-1 h-2 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full transition-all duration-700"
                  style={{ width: `${(a.followers / totalFollowers) * 100}%`, backgroundColor: a.color }}
                />
              </div>
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300 w-16 text-right">
                {a.followers.toLocaleString("tr-TR")}
              </span>
            </div>
          ))}
        </div>
      </Card>

      <div className="bg-blue-50 dark:bg-blue-500/10 border border-blue-200 dark:border-blue-500/20 rounded-2xl p-4 flex items-start gap-3">
        <span className="material-symbols-outlined text-blue-500 mt-0.5">info</span>
        <div>
          <p className="text-sm font-medium text-blue-700 dark:text-blue-400">Gerçek Zamanlı Analitik</p>
          <p className="text-xs text-blue-600/80 dark:text-blue-400/70 mt-0.5">
            Gerçek veriler için Postiz backend bağlı olmalı ve sosyal medya hesaplarınız Platformlar sekmesinden bağlanmış olmalıdır.
          </p>
        </div>
      </div>
    </div>
  )
}

// â”€â”€â”€ TabPlatformlar â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

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
          toast.success(`${platforms.find(p => p.id === id)?.name} bağlantısı başlatıldı. Yetkilendirme penceresini tamamlayın.`)
        } else {
          setPlatforms(prev => prev.map(p => p.id === id ? { ...p, connected: true, handle: "@hesap_adı" } : p))
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
          <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3">Bağlı Platformlar ({connected.length})</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {connected.map(p => (
              <Card key={p.id} className="p-5">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="size-10 rounded-xl flex items-center justify-center" style={{ backgroundColor: `${p.color}15` }}>
                      <span className="material-symbols-outlined text-[20px]" style={{ color: p.color }}>{p.icon}</span>
                    </div>
                    <div>
                      <p className="font-semibold text-gray-900 dark:text-white text-sm">{p.name}</p>
                      {p.handle && <p className="text-xs text-gray-500">{p.handle}</p>}
                    </div>
                  </div>
                  <span className="size-2 rounded-full bg-green-500 mt-1.5" />
                </div>
                {p.followers && (
                  <div className="mt-3 pt-3 border-t border-gray-100 dark:border-gray-800 flex items-center gap-1">
                    <span className="material-symbols-outlined text-[14px] text-gray-400">group</span>
                    <span className="text-xs text-gray-500">{p.followers.toLocaleString("tr-TR")} takipçi</span>
                  </div>
                )}
                <button
                  onClick={() => handleDisconnect(p.id)}
                  className="mt-3 w-full text-xs text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-500/10 py-1.5 rounded-lg transition-colors"
                >
                  Bağlantıyı Kes
                </button>
              </Card>
            ))}
          </div>
        </div>
      )}

      <div>
        <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3">
          {connected.length > 0 ? "Bağlanabilir Platformlar" : "Tüm Platformlar"} ({disconnected.length})
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {disconnected.map(p => (
            <Card key={p.id} className="p-5 hover:border-primary/30 transition-colors">
              <div className="flex items-center gap-3 mb-4">
                <div className="size-10 rounded-xl flex items-center justify-center" style={{ backgroundColor: `${p.color}15` }}>
                  <span className="material-symbols-outlined text-[20px]" style={{ color: p.color }}>{p.icon}</span>
                </div>
                <div>
                  <p className="font-semibold text-gray-900 dark:text-white text-sm">{p.name}</p>
                  <p className="text-xs text-gray-400">Bağlı değil</p>
                </div>
              </div>
              <button
                onClick={() => handleConnect(p.id)}
                disabled={connecting === p.id}
                className="w-full py-2 text-sm font-medium text-primary border border-primary/30 hover:bg-primary/5 rounded-xl transition-colors disabled:opacity-50 flex items-center justify-center gap-1.5"
              >
                {connecting === p.id ? (
                  <><span className="material-symbols-outlined text-[16px] animate-spin">sync</span> Bağlanıyor…</>
                ) : (
                  <><span className="material-symbols-outlined text-[16px]">add_link</span> Bağlan</>
                )}
              </button>
            </Card>
          ))}
        </div>
      </div>

      <div className="bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/20 rounded-2xl p-4 flex items-start gap-3">
        <span className="material-symbols-outlined text-amber-500 mt-0.5">warning</span>
        <div>
          <p className="text-sm font-medium text-amber-700 dark:text-amber-400">Postiz Backend Gerekli</p>
          <p className="text-xs text-amber-600/80 dark:text-amber-400/70 mt-0.5">
            Platformları bağlamak için Postiz sunucunuzun çalışır olması ve <code className="bg-amber-100 dark:bg-amber-500/20 px-1 rounded">POSTIZ_BACKEND_URL</code> ortam değişkeninin ayarlanmış olması gerekir.
          </p>
        </div>
      </div>
    </div>
  )
}

// â”€â”€â”€ TabEkip â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

function TabEkip() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-bold text-gray-900 dark:text-white">Ekip Üyeleri</h3>
          <p className="text-xs text-gray-500 mt-0.5">{MOCK_TEAM.length} aktif üye</p>
        </div>
        <button
          onClick={() => toast.info("Davet özelliği yakında eklenecek.")}
          className="flex items-center gap-2 px-4 py-2 bg-primary hover:bg-blue-600 text-white text-sm font-medium rounded-xl transition-colors shadow-sm"
        >
          <span className="material-symbols-outlined text-[16px]">person_add</span>
          Üye Davet Et
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {MOCK_TEAM.map(member => (
          <Card key={member.id} className="p-5">
            <div className="flex items-start gap-4">
              <div className="size-10 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-sm shrink-0">
                {member.fullName.substring(0, 2).toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2">
                  <p className="font-semibold text-gray-900 dark:text-white text-sm truncate">{member.fullName}</p>
                  <span className="text-xs px-2 py-0.5 rounded-full bg-blue-50 dark:bg-blue-500/10 text-blue-600 dark:text-blue-400 whitespace-nowrap shrink-0">
                    {member.role}
                  </span>
                </div>
                {member.email && <p className="text-xs text-gray-500 mt-0.5">{member.email}</p>}

                <div className="flex items-center gap-3 mt-3">
                  <div className="flex gap-1">
                    {member.platforms.map(pid => {
                      const pl = PLATFORMS.find(p => p.id === pid)
                      return pl ? (
                        <span key={pid} title={pl.name} className="material-symbols-outlined text-[14px]" style={{ color: pl.color }}>{pl.icon}</span>
                      ) : null
                    })}
                  </div>
                  <span className="text-xs text-gray-400">•</span>
                  <span className="text-xs text-gray-500">{member.postsThisMonth} gönderi (bu ay)</span>
                </div>
              </div>
            </div>
          </Card>
        ))}
      </div>

      {/* Activity summary */}
      <Card className="p-6">
        <h3 className="font-bold text-gray-900 dark:text-white mb-4">Ekip Aktivitesi (Bu Ay)</h3>
        <div className="space-y-3">
          {MOCK_TEAM.sort((a, b) => b.postsThisMonth - a.postsThisMonth).map(m => (
            <div key={m.id} className="flex items-center gap-3">
              <div className="size-6 rounded-full bg-primary/10 text-primary flex items-center justify-center text-[10px] font-bold shrink-0">
                {m.fullName.substring(0, 2).toUpperCase()}
              </div>
              <span className="text-sm text-gray-600 dark:text-gray-400 w-36 truncate">{m.fullName}</span>
              <div className="flex-1 h-1.5 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full bg-primary transition-all duration-700"
                  style={{ width: `${(m.postsThisMonth / Math.max(...MOCK_TEAM.map(x => x.postsThisMonth))) * 100}%` }}
                />
              </div>
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300 w-12 text-right">{m.postsThisMonth} pst</span>
            </div>
          ))}
        </div>
      </Card>
    </div>
  )
}

// â”€â”€â”€ Main Component â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

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

  const tabs: { id: TabId; label: string; icon: string }[] = [
    { id: "takvim",    label: "Takvim",    icon: "calendar_month" },
    { id: "gonderiler",label: "Gönderiler",icon: "send"           },
    { id: "analitik",  label: "Analitik",  icon: "bar_chart"      },
    { id: "platformlar",label:"Platformlar",icon: "share"         },
    { id: "ekip",      label: "Ekip",      icon: "group"          },
  ]

  const totalScheduled  = posts.filter(p => p.status === "scheduled").length
  const totalPublished  = posts.filter(p => p.status === "published").length

  return (
    <div className="space-y-6">
      {/* Page header */}
      <PageHeader
        title="Sosyal Medya"
        subtitle={currentBranch ? `${currentBranch.name} Â· Çok Platformlu İçerik Yönetimi` : "Çok Platformlu Sosyal Medya Yönetimi"}
        action={
          <>
            {/* Backend status badge */}
            <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border ${
              backendStatus === "online"
                ? "bg-green-50 dark:bg-green-500/10 text-green-700 dark:text-green-400 border-green-200 dark:border-green-500/20"
                : backendStatus === "offline"
                ? "bg-red-50   dark:bg-red-500/10   text-red-700   dark:text-red-400   border-red-200   dark:border-red-500/20"
                : "bg-gray-50  dark:bg-gray-500/10  text-gray-500                        border-gray-200"
            }`}>
              <span className={`size-1.5 rounded-full ${
                backendStatus === "online" ? "bg-green-500" : backendStatus === "offline" ? "bg-red-500" : "bg-gray-400 animate-pulse"
              }`} />
              {backendStatus === "online" ? "Postiz Bağlı" : backendStatus === "offline" ? "Postiz Bağlı Değil" : "Kontrol ediliyor…"}
            </div>

            <button
              onClick={() => setActiveTab("gonderiler")}
              className="bg-primary hover:bg-blue-600 text-white px-4 py-2 rounded-xl text-sm font-medium flex items-center gap-2 shadow-sm transition-all"
            >
              <span className="material-symbols-outlined text-[18px]">add</span>
              Yeni Gönderi
            </button>
          </>
        }
      />

      {/* Quick stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard icon="schedule_send" label="Planlanmış"   value={totalScheduled}                          iconColor="text-blue-500"   />
        <StatCard icon="check_circle"  label="Yayınlandı"   value={totalPublished}                          iconColor="text-green-500"  />
        <StatCard icon="share"         label="Platform"      value={PLATFORMS.length}                        iconColor="text-purple-500" />
        <StatCard icon="group"         label="Ekip Üyesi"   value={MOCK_TEAM.length}                        iconColor="text-amber-500"  />
      </div>

      {/* Tab bar */}
      <div className="flex gap-1 overflow-x-auto scrollbar-none">
        {tabs.map(t => (
          <button
            key={t.id}
            onClick={() => setActiveTab(t.id)}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium whitespace-nowrap transition-all border ${
              activeTab === t.id
                ? "bg-white dark:bg-[#1e1e1e] border-gray-200 dark:border-gray-700 text-primary shadow-sm"
                : "border-transparent text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 hover:bg-white/60 dark:hover:bg-gray-800/50"
            }`}
          >
            <span className={`material-symbols-outlined text-[18px] ${activeTab === t.id ? "text-primary" : "text-gray-400"}`}>
              {t.icon}
            </span>
            {t.label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      {activeTab === "takvim"     && <TabCalendar posts={posts} />}
      {activeTab === "gonderiler" && <TabGonderiler posts={posts} />}
      {activeTab === "analitik"   && <TabAnalitik />}
      {activeTab === "platformlar"&& <TabPlatformlar />}
      {activeTab === "ekip"       && <TabEkip />}
    </div>
  )
}
