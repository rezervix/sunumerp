"use client"

import { useRouter } from "next/navigation"


import { useState, useEffect, useCallback } from "react"
import { useAuth } from "@/lib/auth/context"
import { toast } from "sonner"
import { ChevronLeft, ChevronRight, Plus, X, Calendar, Clock, MapPin, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { getUpcomingSpecialDays, getSpecialDaysForDate, SPECIAL_DAYS, type SpecialDay } from "@/lib/data/special-days"
import type { CalendarEvent } from "@/app/api/calendar/events/route"
import { mockDatabase } from "@/lib/data/mockDatabase"

// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
// Yardımcı
// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

const TURKISH_MONTHS = [
  "Ocak","Åubat","Mart","Nisan","Mayıs","Haziran",
  "Temmuz","Ağustos","Eylül","Ekim","Kasım","Aralık",
]
const TURKISH_DAYS_SHORT = ["Pzt","Sal","Çar","Per","Cum","Cmt","Paz"]

function isSameDay(a: Date, b: Date) {
  return a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
}

function formatTime(isoStr: string) {
  const d = new Date(isoStr)
  return d.toLocaleTimeString("tr-TR", { hour: "2-digit", minute: "2-digit" })
}

function formatDateLabel(isoStr: string) {
  const d = new Date(isoStr)
  return d.toLocaleDateString("tr-TR", { weekday: "long", day: "numeric", month: "long", year: "numeric" })
}

// Kategoriye göre renk/etiket
function eventTypeMeta(type: CalendarEvent["type"]) {
  const map: Record<CalendarEvent["type"], { label: string; bg: string; text: string }> = {
    appointment:     { label: "Randevu",       bg: "bg-blue-100  dark:bg-blue-900/40",   text: "text-blue-700   dark:text-blue-300" },
    income_payment:  { label: "Alınacak Ödeme",bg: "bg-emerald-100 dark:bg-emerald-900/40", text: "text-emerald-700 dark:text-emerald-300" },
    expense_payment: { label: "Yapılacak Ödeme",bg: "bg-red-100  dark:bg-red-900/40",     text: "text-red-700    dark:text-red-300" },
    reminder:        { label: "Hatırlatıcı",   bg: "bg-amber-100  dark:bg-amber-900/40",  text: "text-amber-700  dark:text-amber-300" },
    todo:            { label: "Yapılacak",      bg: "bg-violet-100 dark:bg-violet-900/40", text: "text-violet-700 dark:text-violet-300" },
    content_calendar: { label: "İçerik Planı",  bg: "bg-fuchsia-100 dark:bg-fuchsia-900/40", text: "text-fuchsia-700 dark:text-fuchsia-300" },
  }
  return map[type]
}

function specialDayColor(sd: SpecialDay) {
  return sd.color
}

// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
// Randevu Oluştur Modal
// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

interface AppointmentModalProps {
  date: Date | null
  branchId: string
  onClose: () => void
  onSaved: () => void
}

function AppointmentModal({ date, branchId, onClose, onSaved }: AppointmentModalProps) {
  const [title, setTitle] = useState("")
  const [description, setDescription] = useState("")
  const [customerName, setCustomerName] = useState("")
  const [location, setLocation] = useState("")
  const [startTime, setStartTime] = useState("09:00")
  const [endTime, setEndTime] = useState("10:00")
  const [color, setColor] = useState("#3B82F6")
  const [saving, setSaving] = useState(false)

  const dateStr = date
    ? date.toISOString().split("T")[0]
    : new Date().toISOString().split("T")[0]

  const COLORS = [
    { hex: "#3B82F6", label: "Mavi" },
    { hex: "#10b981", label: "Yeşil" },
    { hex: "#f59e0b", label: "Sarı" },
    { hex: "#ef4444", label: "Kırmızı" },
    { hex: "#8b5cf6", label: "Mor" },
    { hex: "#ec4899", label: "Pembe" },
    { hex: "#0891b2", label: "Turkuaz" },
    { hex: "#d97706", label: "Turuncu" },
  ]

  const handleSave = async () => {
    if (!title.trim()) { toast.error("Başlık gerekli"); return }
    setSaving(true)
    try {
      const res = await fetch("/api/appointments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title,
          description,
          customerName,
          location,
          startDate: `${dateStr}T${startTime}:00`,
          endDate: `${dateStr}T${endTime}:00`,
          color,
          branchId,
          allDay: false,
        }),
      })
      if (!res.ok) throw new Error("Kayıt başarısız")
      toast.success("Randevu oluşturuldu!")
      onSaved()
      onClose()
    } catch {
      toast.error("Randevu oluşturulamadı")
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />

      <div className="relative z-10 w-full max-w-md bg-white dark:bg-[#1f2428] rounded-2xl shadow-2xl border border-border overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-border bg-primary/5">
          <div className="flex items-center gap-2">
            <Calendar size={18} className="text-primary" />
            <h2 className="font-semibold text-foreground">Yeni Randevu</h2>
          </div>
          <button onClick={onClose} className="size-7 flex items-center justify-center rounded-lg hover:bg-muted transition-colors">
            <X size={16} className="text-muted-foreground" />
          </button>
        </div>

        <div className="p-5 space-y-4">
          {/* Tarih bilgisi */}
          <div className="text-sm text-muted-foreground flex items-center gap-1.5">
            <Clock size={14} />
            {date ? formatDateLabel(date.toISOString()) : "â€”"}
          </div>

          {/* Başlık */}
          <div className="space-y-1">
            <label className="text-xs font-semibold text-foreground">Başlık *</label>
            <input
              type="text"
              value={title}
              onChange={e => setTitle(e.target.value)}
              placeholder="Randevu başlığı..."
              className="w-full px-3 py-2 bg-muted/50 border border-border rounded-lg text-sm outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all text-foreground"
            />
          </div>

          {/* Müşteri */}
          <div className="space-y-1">
            <label className="text-xs font-semibold text-foreground">Müşteri Adı (opsiyonel)</label>
            <input
              type="text"
              value={customerName}
              onChange={e => setCustomerName(e.target.value)}
              placeholder="Müşteri / Firma adı..."
              className="w-full px-3 py-2 bg-muted/50 border border-border rounded-lg text-sm outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all text-foreground"
            />
          </div>

          {/* Saatler */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-xs font-semibold text-foreground">Başlangıç Saati</label>
              <input
                type="time"
                value={startTime}
                onChange={e => setStartTime(e.target.value)}
                className="w-full px-3 py-2 bg-muted/50 border border-border rounded-lg text-sm outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all text-foreground"
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-semibold text-foreground">Bitiş Saati</label>
              <input
                type="time"
                value={endTime}
                onChange={e => setEndTime(e.target.value)}
                className="w-full px-3 py-2 bg-muted/50 border border-border rounded-lg text-sm outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all text-foreground"
              />
            </div>
          </div>

          {/* Konum */}
          <div className="space-y-1">
            <label className="text-xs font-semibold text-foreground flex items-center gap-1">
              <MapPin size={12} /> Konum (opsiyonel)
            </label>
            <input
              type="text"
              value={location}
              onChange={e => setLocation(e.target.value)}
              placeholder="Konum veya link..."
              className="w-full px-3 py-2 bg-muted/50 border border-border rounded-lg text-sm outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all text-foreground"
            />
          </div>

          {/* Açıklama */}
          <div className="space-y-1">
            <label className="text-xs font-semibold text-foreground">Açıklama</label>
            <textarea
              rows={2}
              value={description}
              onChange={e => setDescription(e.target.value)}
              placeholder="Notlar veya detaylar..."
              className="w-full px-3 py-2 bg-muted/50 border border-border rounded-lg text-sm outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all resize-none text-foreground"
            />
          </div>

          {/* Renk Seçimi */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-foreground">Randevu Rengi</label>
            <div className="flex gap-2 flex-wrap">
              {COLORS.map(c => (
                <button
                  key={c.hex}
                  title={c.label}
                  onClick={() => setColor(c.hex)}
                  className="size-7 rounded-full border-2 transition-all hover:scale-110"
                  style={{
                    backgroundColor: c.hex,
                    borderColor: color === c.hex ? "white" : "transparent",
                    boxShadow: color === c.hex ? `0 0 0 2px ${c.hex}` : "none",
                  }}
                />
              ))}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex gap-2 p-5 pt-0">
          <Button variant="outline" className="flex-1" onClick={onClose}>İptal</Button>
          <Button className="flex-1" onClick={handleSave} disabled={saving}>
            {saving ? <><Loader2 size={14} className="animate-spin mr-1" />Kaydediliyor...</> : "Kaydet"}
          </Button>
        </div>
      </div>
    </div>
  )
}

// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
// Ana Takvim Sayfası
// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

type ViewMode = "month" | "week" | "agenda"

export default function TakvimPage() {
  const { hasPermission, isSuperAdmin, loading: authLoading, currentBranch, session } = useAuth()
  const router = useRouter()

  useEffect(() => {
    if (!authLoading && !hasPermission("takvim", "read") && !isSuperAdmin) {
      router.replace("/dashboard")
    }
  }, [authLoading, hasPermission, isSuperAdmin, router])

  const [currentDate, setCurrentDate] = useState(new Date())
  const [viewMode, setViewMode] = useState<ViewMode>("month")
  const [events, setEvents] = useState<CalendarEvent[]>(() => mockDatabase.getCalendarEvents())

  useEffect(() => {
    const handleDbChange = () => setEvents(mockDatabase.getCalendarEvents())
    window.addEventListener("sunum-mockdb-change", handleDbChange)
    return () => window.removeEventListener("sunum-mockdb-change", handleDbChange)
  }, [])
  const [loading, setLoading] = useState(false)
  const [selectedDate, setSelectedDate] = useState<Date | null>(null)
  const [showModal, setShowModal] = useState(false)
  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null)
  const [specialDayAlertShown, setSpecialDayAlertShown] = useState(false)
  const [deleting, setDeleting] = useState(false)

  const year = currentDate.getFullYear()
  const month = currentDate.getMonth()

  // â”€â”€ Yaklaşan Özel Günler Bildirimi â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  useEffect(() => {
    if (specialDayAlertShown) return
    const upcoming = getUpcomingSpecialDays(3)
    if (upcoming.length > 0) {
      upcoming.forEach((sd) => {
        toast(
          sd.daysLeft === 1
            ? `ğŸ‰ Yarın: ${sd.title}`
            : `ğŸ“… ${sd.daysLeft} gün sonra: ${sd.title}`,
          {
            description: sd.description || "",
            duration: 6000,
            style: { borderLeft: `4px solid ${sd.color}` },
          }
        )
      })
      setSpecialDayAlertShown(true)
    }
  }, [specialDayAlertShown])

  // â”€â”€ Event Yükle â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  const loadEvents = useCallback(async () => {
    const branchId = currentBranch?.id || "local-debug-branch"
    setLoading(true)
    try {
      const from = new Date(year, month, 1).toISOString().split("T")[0]
      const to = new Date(year, month + 1, 0).toISOString().split("T")[0]
      const res = await fetch(`/api/calendar/events?branchId=${branchId}&from=${from}&to=${to}`)
      if (res.ok) {
        const data = await res.json()
        setEvents(Array.isArray(data) && data.length > 0 ? data : mockDatabase.getCalendarEvents())
      } else {
        setEvents(mockDatabase.getCalendarEvents())
      }
    } catch {
      toast.error("Takvim verileri yüklenemedi")
    } finally {
      setLoading(false)
    }
  }, [currentBranch, year, month])

  useEffect(() => { loadEvents() }, [loadEvents])

  // â”€â”€ Takvim Izgara Oluştur â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  function buildCalendarDays(): Date[] {
    const firstDay = new Date(year, month, 1)
    // Pazartesi bazlı (0=Pzt)
    let startDow = firstDay.getDay() - 1
    if (startDow < 0) startDow = 6
    const daysInMonth = new Date(year, month + 1, 0).getDate()

    const days: Date[] = []
    // Önceki aydan dolgu
    for (let i = startDow - 1; i >= 0; i--) {
      days.push(new Date(year, month, -i))
    }
    for (let d = 1; d <= daysInMonth; d++) {
      days.push(new Date(year, month, d))
    }
    // Sonraki aydan dolgu (6 satır = 42 gün)
    while (days.length < 42) {
      days.push(new Date(year, month + 1, days.length - startDow - daysInMonth + 1))
    }
    return days
  }

  function eventsForDay(day: Date): CalendarEvent[] {
    return events.filter(e => isSameDay(new Date(e.date), day))
  }

  function specialDaysForDay(day: Date): SpecialDay[] {
    return getSpecialDaysForDate(day)
  }

  const today = new Date()

  const calendarDays = buildCalendarDays()

  const prev = () => setCurrentDate(new Date(year, month - 1, 1))
  const next = () => setCurrentDate(new Date(year, month + 1, 1))
  const goToday = () => setCurrentDate(new Date())

  // â”€â”€ Agenda View â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  function AgendaView() {
    const grouped: Record<string, (CalendarEvent | (SpecialDay & { isSpecial: true }))[]> = {}

    events.forEach(e => {
      const dk = e.date.split("T")[0]
      if (!grouped[dk]) grouped[dk] = []
      grouped[dk].push(e)
    })

    // Özel günleri de ekle (Bu ay için)
    calendarDays.filter(d => d.getMonth() === month).forEach(d => {
      const sds = getSpecialDaysForDate(d)
      sds.forEach(sd => {
        const dk = d.toISOString().split("T")[0]
        if (!grouped[dk]) grouped[dk] = []
        grouped[dk].push({ ...sd, isSpecial: true })
      })
    })

    const sorted = Object.entries(grouped).sort(([a], [b]) => a.localeCompare(b))

    return (
      <div className="space-y-4">
        {sorted.length === 0 && (
          <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
            <Calendar size={40} className="mb-3 opacity-30" />
            <p className="text-sm">Bu ay için etkinlik bulunamadı</p>
          </div>
        )}
        {sorted.map(([dk, entries]) => (
          <div key={dk}>
            <div className="flex items-center gap-3 mb-2">
              <div className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
                {new Date(dk + "T12:00:00").toLocaleDateString("tr-TR", { weekday: "long", day: "numeric", month: "long" })}
              </div>
              <div className="flex-1 h-px bg-border" />
            </div>
            <div className="space-y-1.5 pl-1">
              {entries.map((entry, i) => {
                if ("isSpecial" in entry && entry.isSpecial) {
                  return (
                    <div key={i} className="flex items-center gap-2 px-3 py-2 rounded-lg" style={{ backgroundColor: `${entry.color}15`, borderLeft: `3px solid ${entry.color}` }}>
                      <span className="text-sm font-medium" style={{ color: entry.color }}>ğŸ‰ {entry.title}</span>
                    </div>
                  )
                }
                const ev = entry as CalendarEvent
                const meta = eventTypeMeta(ev.type)
                return (
                  <div key={i} className={`flex items-center gap-3 px-3 py-2 rounded-lg cursor-pointer hover:brightness-95 transition-all ${meta.bg}`} onClick={() => setSelectedEvent(ev)}>
                    <div className="size-2 rounded-full shrink-0" style={{ backgroundColor: ev.color }} />
                    <span className={`text-sm font-medium flex-1 ${meta.text}`}>{ev.title}</span>
                    {!ev.allDay && <span className="text-xs text-muted-foreground">{formatTime(ev.date)}</span>}
                    {ev.amount && <span className="text-xs font-semibold text-foreground">â‚º{ev.amount.toLocaleString("tr-TR")}</span>}
                  </div>
                )
              })}
            </div>
          </div>
        ))}
      </div>
    )
  }

  // â”€â”€ Event Detay Paneli â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  function EventDetail() {
    if (!selectedEvent) return null
    const meta = eventTypeMeta(selectedEvent.type)
    const handleDelete = async () => {
      // Backend yetki kontrolune guveniyor, frontend ID prefix kontrolu kaldirildi
      const realId = selectedEvent.id.startsWith("appointment-")
        ? selectedEvent.id.replace("appointment-", "")
        : selectedEvent.id
      setDeleting(true)
      try {
        const res = await fetch(`/api/appointments/${realId}`, { method: "DELETE" })
        if (res.ok) {
          toast.success("Randevu silindi")
          setSelectedEvent(null)
          loadEvents()
        } else if (res.status === 403) {
          toast.error("Bu islemi yapma yetkiniz yok")
        } else {
          toast.error("Silme islemi basarisiz")
        }
      } catch {
        toast.error("Bir hata olustu, lutfen tekrar deneyin.")
      } finally {
        setDeleting(false)
      }
    }

    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setSelectedEvent(null)} />
        <div className="relative z-10 w-full max-w-sm bg-white dark:bg-[#1f2428] rounded-2xl shadow-2xl border border-border overflow-hidden animate-in fade-in zoom-in-95 duration-200">
          <div className="h-1.5 w-full" style={{ backgroundColor: selectedEvent.color }} />
          <div className="p-5">
            <div className="flex items-start justify-between gap-3 mb-4">
              <div>
                <span className={`inline-block text-xs font-semibold px-2 py-0.5 rounded-full mb-2 ${meta.bg} ${meta.text}`}>{meta.label}</span>
                <h3 className="font-semibold text-foreground text-lg leading-tight">{selectedEvent.title}</h3>
              </div>
              <button onClick={() => setSelectedEvent(null)} className="size-7 flex items-center justify-center rounded-lg hover:bg-muted transition-colors shrink-0">
                <X size={16} className="text-muted-foreground" />
              </button>
            </div>

            <div className="space-y-2.5 text-sm text-muted-foreground">
              <div className="flex items-center gap-2">
                <Clock size={14} />
                <span>{formatDateLabel(selectedEvent.date)}</span>
              </div>
              {selectedEvent.endDate && (
                <div className="flex items-center gap-2">
                  <Clock size={14} />
                  <span>Bitiş: {formatTime(selectedEvent.endDate)}</span>
                </div>
              )}
              {selectedEvent.location && (
                <div className="flex items-center gap-2">
                  <MapPin size={14} />
                  <span>{selectedEvent.location}</span>
                </div>
              )}
              {selectedEvent.amount && (
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-foreground text-base">â‚º{selectedEvent.amount.toLocaleString("tr-TR")}</span>
                </div>
              )}
              {selectedEvent.description && (
                <p className="text-sm pt-1 border-t border-border">{selectedEvent.description}</p>
              )}
            </div>

            {selectedEvent.type === "appointment" && (
              <div className="mt-4 pt-3 border-t border-border flex gap-2">
                <Button
                  variant="destructive"
                  size="sm"
                  className="w-full"
                  onClick={handleDelete}
                  disabled={deleting}
                >
                  {deleting
                    ? <><span className="inline-block w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin mr-2" />Siliniyor...</>
                    : "Randevuyu Sil"
                  }
                </Button>
              </div>
            )}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-6">

      {/* â”€â”€ Sayfa Başlığı â”€â”€ */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-4 justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">Takvim</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Randevularınızı, ödemelerinizi ve özel günleri takip edin.
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {/* Görünüm Seçici */}
          <div className="flex items-center gap-1 bg-muted rounded-lg p-1">
            {(["month", "week", "agenda"] as ViewMode[]).map(v => (
              <button
                key={v}
                onClick={() => setViewMode(v)}
                className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all ${viewMode === v ? "bg-white dark:bg-[#1f2428] text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"}`}
              >
                {v === "month" ? "Ay" : v === "week" ? "Hafta" : "Ajanda"}
              </button>
            ))}
          </div>
          <Button variant="outline" size="sm" onClick={goToday}>Bugün</Button>
          <Button size="sm" className="gap-1.5" onClick={() => { setSelectedDate(new Date()); setShowModal(true) }}>
            <Plus size={14} />Randevu Ekle
          </Button>
        </div>
      </div>

      {/* â”€â”€ Legend â”€â”€ */}
      <div className="flex flex-wrap gap-3 text-xs font-medium">
        {[
          { color: "#3B82F6", label: "Müşteri Randevusu" },
          { color: "#10b981", label: "Alınacak Ödeme" },
          { color: "#ef4444", label: "Yapılacak Ödeme" },
          { color: "#f59e0b", label: "Hatırlatıcı" },
          { color: "#d97706", label: "Özel Gün / Tatil" },
        ].map(l => (
          <div key={l.label} className="flex items-center gap-1.5">
            <div className="size-3 rounded-full" style={{ backgroundColor: l.color }} />
            <span className="text-muted-foreground">{l.label}</span>
          </div>
        ))}
      </div>

      {/* â”€â”€ Ana Takvim Kartı â”€â”€ */}
      <div className="bg-white dark:bg-[#1f2428] rounded-2xl shadow-sm border border-border overflow-hidden">

        {/* Navigasyon Başlığı */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border">
          <button onClick={prev} className="size-8 flex items-center justify-center rounded-lg hover:bg-muted transition-colors">
            <ChevronLeft size={18} className="text-muted-foreground" />
          </button>
          <div className="text-center">
            <h2 className="text-lg font-bold text-foreground">
              {TURKISH_MONTHS[month]} {year}
            </h2>
            {loading && <div className="flex justify-center mt-1"><Loader2 size={12} className="animate-spin text-primary" /></div>}
          </div>
          <button onClick={next} className="size-8 flex items-center justify-center rounded-lg hover:bg-muted transition-colors">
            <ChevronRight size={18} className="text-muted-foreground" />
          </button>
        </div>

        <div className="p-4">
          {viewMode === "agenda" ? (
            <AgendaView />
          ) : (
            <div className="overflow-x-auto">
              <div className="min-w-[600px]">
              {/* Gün başlıkları */}
              <div className="grid grid-cols-7 mb-2">
                {TURKISH_DAYS_SHORT.map(d => (
                  <div key={d} className="text-center text-xs font-semibold text-muted-foreground py-2">{d}</div>
                ))}
              </div>

              {/* Gün hücreleri */}
              <div className="grid grid-cols-7 gap-1">
                {calendarDays.map((day, idx) => {
                  const isCurrentMonth = day.getMonth() === month
                  const isToday = isSameDay(day, today)
                  const dayEvents = eventsForDay(day)
                  const daySpecials = specialDaysForDay(day)
                  const isSelected = selectedDate ? isSameDay(day, selectedDate) : false

                  return (
                    <div
                      key={idx}
                      onClick={() => { setSelectedDate(day); if (isCurrentMonth) setShowModal(true) }}
                      className={[
                        "min-h-[80px] md:min-h-[100px] p-1.5 rounded-xl cursor-pointer transition-all",
                        "hover:bg-muted/60",
                        isCurrentMonth ? "" : "opacity-30",
                        isSelected ? "ring-2 ring-primary" : "",
                        isToday ? "bg-primary/5" : "",
                      ].join(" ")}
                    >
                      {/* Gün numarası */}
                      <div className={[
                        "size-7 flex items-center justify-center rounded-full text-sm font-semibold mb-1 mx-auto",
                        isToday ? "bg-primary text-white" : "text-foreground",
                      ].join(" ")}>
                        {day.getDate()}
                      </div>

                      {/* Özel günler */}
                      {daySpecials.map(sd => (
                        <div
                          key={sd.id}
                          className="text-[9px] md:text-[10px] font-medium px-1 py-0.5 rounded truncate mb-0.5 leading-tight"
                          style={{ backgroundColor: `${sd.color}25`, color: sd.color }}
                          title={sd.title}
                        >
                          ğŸ‰ {sd.title}
                        </div>
                      ))}

                      {/* Eventler */}
                      {dayEvents.slice(0, 3).map((ev, i) => (
                        <div
                          key={i}
                          className="text-[10px] md:text-[11px] font-medium px-1 py-0.5 rounded truncate mb-0.5 leading-tight cursor-pointer hover:opacity-80"
                          style={{ backgroundColor: `${ev.color}25`, color: ev.color }}
                          title={ev.title}
                          onClick={(e) => { e.stopPropagation(); setSelectedEvent(ev) }}
                        >
                          {ev.title}
                        </div>
                      ))}
                      {dayEvents.length > 3 && (
                        <div className="text-[10px] text-muted-foreground text-center">+{dayEvents.length - 3} daha</div>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>
            </div>
          )}
        </div>
      </div>

      {/* â”€â”€ Yaklaşan Etkinlikler â”€â”€ */}
      {events.filter(e => {
        const d = new Date(e.date)
        const diff = Math.ceil((d.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
        return diff >= 0 && diff <= 7
      }).length > 0 && (
        <div className="bg-white dark:bg-[#1f2428] rounded-2xl shadow-sm border border-border p-5">
          <h3 className="font-semibold text-foreground mb-4 flex items-center gap-2">
            <Clock size={16} className="text-primary" />
            Yaklaşan 7 Gün
          </h3>
          <div className="space-y-2">
            {events
              .filter(e => {
                const diff = Math.ceil((new Date(e.date).getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
                return diff >= 0 && diff <= 7
              })
              .slice(0, 8)
              .map((ev, i) => {
                const meta = eventTypeMeta(ev.type)
                return (
                  <div
                    key={i}
                    className={`flex items-center gap-3 p-3 rounded-xl cursor-pointer hover:brightness-95 transition-all ${meta.bg}`}
                    onClick={() => setSelectedEvent(ev)}
                  >
                    <div className="size-2 rounded-full shrink-0" style={{ backgroundColor: ev.color }} />
                    <span className={`text-sm font-medium flex-1 ${meta.text}`}>{ev.title}</span>
                    <span className="text-xs text-muted-foreground shrink-0">
                      {new Date(ev.date).toLocaleDateString("tr-TR", { day: "numeric", month: "short" })}
                    </span>
                    {ev.amount && (
                      <span className="text-xs font-semibold text-foreground">â‚º{ev.amount.toLocaleString("tr-TR")}</span>
                    )}
                  </div>
                )
              })}
          </div>
        </div>
      )}

      {/* Modallar */}
      {showModal && selectedDate && currentBranch && (
        <AppointmentModal
          date={selectedDate}
          branchId={currentBranch.id}
          onClose={() => setShowModal(false)}
          onSaved={loadEvents}
        />
      )}
      {selectedEvent && <EventDetail />}
    </div>
  )
}
