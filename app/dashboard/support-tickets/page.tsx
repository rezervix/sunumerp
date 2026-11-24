"use client"

import React, { useState, useEffect } from "react"
import { useLanguage } from "@/lib/context/LanguageContext"
import { useRouter } from "next/navigation"
import { useAuth } from "@/lib/auth/context"
import { toast } from "sonner"
import {
  LifeBuoy, Filter, Eye, Trash2,
  AlertCircle, MessageSquare, Clock, Laptop,
  ExternalLink, Terminal, ChevronLeft, ChevronRight, Send, Loader2,
  Layers, Bug
} from "lucide-react"
import { AnimatedNumber } from "@/components/ui/motion-primitives"

interface SupportTicket {
  id: string
  createdAt: string
  updatedAt: string
  title: string
  description: string
  status: string
  priority: string
  category: string
  pageUrl: string
  moduleName: string
  screenshotUrl: string | null
  browserInfo: {
    userAgent?: string
    screenResolution?: string
    viewportSize?: string
    devicePixelRatio?: number
  }
  consoleLogs: {
    type: "error" | "warn"
    message: string
    timestamp: string
  }[]
  networkLogs: {
    method: string
    url: string
    status: number
    timestamp: string
  }[]
  appVersion: string | null
  assignedTo: string | null
  resolutionNote: string | null
  internalComments: {
    id: string
    userId: string
    fullName: string
    comment: string
    createdAt: string
  }[]
  reporter: {
    id: string
    username: string
    fullName: string
    avatarUrl: string | null
  }
  assignedUser?: {
    id: string
    fullName: string
    avatarUrl: string | null
  } | null
  attachments: {
    id: string
    ticketId: string
    fileName: string
    fileUrl: string
    fileSize: number
    mimeType: string
    createdAt: string
  }[]
}

const CATEGORY_LABELS: Record<string, string> = {
  ui_bug: "Arayüz / UI Hatası",
  backend_error: "Sunucu / API Hatası",
  data_issue: "Hatalı Veri",
  performance: "Performans / Yavaşlık",
  missing_feature: "Eksik Özellik / Öneri",
  other: "Diğer"
}

const PRIORITY_LABELS: Record<string, string> = {
  low: "Düşük",
  medium: "Orta",
  high: "Yüksek",
  critical: "Kritik"
}

const STATUS_LABELS: Record<string, string> = {
  open: "Açık",
  in_progress: "İşlemde",
  needs_info: "Bilgi Bekliyor",
  resolved: "Çözüldü",
  wont_fix: "Yapılmayacak",
  closed: "Kapatıldı"
}

export default function SupportTicketsPage() {
  const { t, tText } = useLanguage()
  const { isSuperAdmin, loading: authLoading } = useAuth()
  const router = useRouter()

  // Data state
  const [tickets, setTickets] = useState<SupportTicket[]>([])
  const [users, setUsers] = useState<any[]>([])
  const [totalCount, setTotalCount] = useState(0)
  const [totalPages, setTotalPages] = useState(1)
  const [loading, setLoading] = useState(true)

  // Filters state
  const [page, setPage] = useState(1)
  const [limit] = useState(10)
  const [statusFilter, setStatusFilter] = useState("")
  const [priorityFilter, setPriorityFilter] = useState("")
  const [categoryFilter, setCategoryFilter] = useState("")
  const [dateStart, setDateStart] = useState("")
  const [dateEnd, setDateEnd] = useState("")

  // Modal / Detail state
  const [selectedTicket, setSelectedTicket] = useState<SupportTicket | null>(null)
  const [detailModalOpen, setDetailModalOpen] = useState(false)
  const [newComment, setNewComment] = useState("")
  const [resolutionNoteText, setResolutionNoteText] = useState("")
  const [assigneeId, setAssigneeId] = useState("")
  const [ticketStatus, setTicketStatus] = useState("")
  const [ticketPriority, setTicketPriority] = useState("")
  const [updating, setUpdating] = useState(false)

  // Auth Guard
  useEffect(() => {
    if (!authLoading && !isSuperAdmin) {
      router.replace("/dashboard")
      toast.error("Bu sayfaya erişim yetkiniz bulunmamaktadır.")
    }
  }, [authLoading, isSuperAdmin, router])

  // Load tickets and developers list
  useEffect(() => {
    if (isSuperAdmin) {
      loadTickets()
      loadUsers()
    }
  }, [isSuperAdmin, page, statusFilter, priorityFilter, categoryFilter, dateStart, dateEnd])

  const loadTickets = async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams({
        page: String(page),
        limit: String(limit),
        status: statusFilter,
        priority: priorityFilter,
        category: categoryFilter,
        dateStart,
        dateEnd
      })

      const res = await fetch(`/api/support-tickets?${params.toString()}`)
      if (res.ok) {
        const data = await res.json()
        setTickets(data.tickets || [])
        setTotalCount(data.pagination?.totalCount || 0)
        setTotalPages(data.pagination?.totalPages || 1)
      } else {
        toast.error("Talepler yüklenirken bir hata oluştu.")
      }
    } catch (e) {
      console.error(e)
      toast.error("Ağ hatası oluştu.")
    } finally {
      setLoading(false)
    }
  }

  const loadUsers = async () => {
    try {
      const res = await fetch("/api/users")
      if (res.ok) {
        const data = await res.json()
        const usersList = data.data || data
        setUsers(usersList || [])
      }
    } catch (e) {
      console.error("Failed to load users:", e)
    }
  }

  // Handle row inspection
  const handleOpenDetail = (ticket: SupportTicket) => {
    setSelectedTicket(ticket)
    setTicketStatus(ticket.status)
    setTicketPriority(ticket.priority)
    setAssigneeId(ticket.assignedTo || "")
    setResolutionNoteText(ticket.resolutionNote || "")
    setNewComment("")
    setDetailModalOpen(true)
  }

  // Update ticket details (status, priority, assignee, resolution note)
  const handleUpdateTicket = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedTicket) return
    setUpdating(true)

    try {
      const res = await fetch(`/api/support-tickets/${selectedTicket.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status: ticketStatus,
          priority: ticketPriority,
          assignedTo: assigneeId || null,
          resolutionNote: resolutionNoteText
        })
      })

      if (res.ok) {
        const updated = await res.json()
        toast.success("Talep başarıyla güncellendi.")
        setTickets(prev => prev.map(t => t.id === updated.id ? { ...t, ...updated } : t))
        setSelectedTicket(prev => prev ? { ...prev, ...updated } : null)
      } else {
        const err = await res.json()
        toast.error(err.error || "Güncelleme sırasında hata oluştu.")
      }
    } catch (e) {
      console.error(e)
      toast.error("Ağ hatası oluştu.")
    } finally {
      setUpdating(false)
    }
  }

  // Add internal developer comment
  const handleAddComment = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedTicket || !newComment.trim()) return

    try {
      const res = await fetch(`/api/support-tickets/${selectedTicket.id}/comments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ comment: newComment })
      })

      if (res.ok) {
        const commentData = await res.json()
        toast.success("Yorum eklendi.")
        setSelectedTicket(prev => {
          if (!prev) return null
          return {
            ...prev,
            internalComments: [...(prev.internalComments || []), commentData]
          }
        })
        setNewComment("")
      } else {
        const err = await res.json()
        toast.error(err.error || "Yorum eklenemedi.")
      }
    } catch (e) {
      console.error(e)
      toast.error("Ağ hatası oluştu.")
    }
  }

  // Delete ticket
  const handleDeleteTicket = async () => {
    if (!selectedTicket) return
    if (!confirm("Bu destek talebini silmek istediğinize emin misiniz?")) return

    try {
      const res = await fetch(`/api/support-tickets/${selectedTicket.id}`, {
        method: "DELETE"
      })

      if (res.ok) {
        toast.success("Talep silindi.")
        setTickets(prev => prev.filter(t => t.id !== selectedTicket.id))
        setDetailModalOpen(false)
        setSelectedTicket(null)
      } else {
        const err = await res.json()
        toast.error(err.error || "Silinemedi.")
      }
    } catch (e) {
      console.error(e)
      toast.error("Ağ hatası oluştu.")
    }
  }

  const totalOpen = tickets.filter(t => t.status === "open").length
  const totalInProgress = tickets.filter(t => t.status === "in_progress").length
  const vibeBugsCount = tickets.filter(t => t.category === "ui_bug" || t.category === "backend_error").length

  if (authLoading) return null

  return (
    <div className="space-y-6">
      {/* Title */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-[--text] flex items-center gap-2">
            <LifeBuoy className="text-[--brand] size-6" />
            Teknik Destek ve Hata Bildirim Talepleri
          </h2>
          <p className="text-sm text-[--text-muted]">
            Sistemde kullanıcıların karşılaştığı ekran hataları ve telemetri log raporları.
          </p>
        </div>
      </div>

      {/* Borderless KPI Strip */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-6 py-4 border-b border-[--line]">
        <div>
          <div className="flex items-center gap-2 text-[--text-muted] mb-1">
            <Layers className="size-4 text-[--text-muted]" />
            <span className="text-[11px] font-medium uppercase tracking-wider">TOPLAM TALEP</span>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-4xl font-light text-[--text] tracking-tight tabular-nums">
              <AnimatedNumber value={totalCount} />
            </span>
            <span className="text-[10px] text-[--text-muted] font-medium px-2 py-0.5 rounded-full bg-[--muted-bg]">
              Kayıtlı
            </span>
          </div>
        </div>

        <div>
          <div className="flex items-center gap-2 text-[--text-muted] mb-1">
            <AlertCircle className="size-4 text-[--brand]" />
            <span className="text-[11px] font-medium uppercase tracking-wider">AÇIK TALEPLER</span>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-4xl font-light text-[--brand] tracking-tight tabular-nums">
              <AnimatedNumber value={totalOpen} />
            </span>
            <span className="text-[10px] text-[--brand] font-medium px-2 py-0.5 rounded-full bg-[--brand-soft] border border-[--brand-line]">
              Beklemede
            </span>
          </div>
        </div>

        <div>
          <div className="flex items-center gap-2 text-[--text-muted] mb-1">
            <Clock className="size-4 text-[--sky]" />
            <span className="text-[11px] font-medium uppercase tracking-wider">İŞLEMDEKİLER</span>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-4xl font-light text-[--sky] tracking-tight tabular-nums">
              <AnimatedNumber value={totalInProgress} />
            </span>
            <span className="text-[10px] text-[--sky] font-medium px-2 py-0.5 rounded-full bg-[--brand-soft] border border-[--brand-line]">
              Geliştirme
            </span>
          </div>
        </div>

        <div>
          <div className="flex items-center gap-2 text-[--text-muted] mb-1">
            <Bug className="size-4 text-[--bad]" />
            <span className="text-[11px] font-medium uppercase tracking-wider">UI / API HATALARI</span>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-4xl font-light text-[--bad] tracking-tight tabular-nums">
              <AnimatedNumber value={vibeBugsCount} />
            </span>
            <span className="text-[10px] text-[--bad] font-medium px-2 py-0.5 rounded-full bg-[--bad-soft] border border-[--bad]/20">
              Kritik
            </span>
          </div>
        </div>
      </div>

      {/* Filter Options */}
      <div className="rounded-[20px] border border-[--line] bg-white/80 backdrop-blur-xl p-5 shadow-sm space-y-4">
        <div className="flex items-center gap-2 text-sm font-semibold text-[--text] border-b border-[--line-soft] pb-3">
          <Filter size={16} className="text-[--brand]" />
          Talepleri Filtrele
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-3">
          {/* Status filter */}
          <div className="flex flex-col gap-1.5">
            <span className="text-xs text-[--text-muted] font-medium">Durum</span>
            <select
              value={statusFilter}
              onChange={(e) => { setStatusFilter(e.target.value); setPage(1) }}
              className="h-10 w-full rounded-xl border border-[--line] bg-white px-3 text-xs text-[--text] focus:outline-none focus:border-[--brand] focus:ring-1 focus:ring-[--brand] cursor-pointer shadow-xs"
            >
              <option value="">Tümü</option>
              {Object.entries(STATUS_LABELS).map(([k, v]) => (
                <option key={k} value={k}>{v}</option>
              ))}
            </select>
          </div>

          {/* Priority filter */}
          <div className="flex flex-col gap-1.5">
            <span className="text-xs text-[--text-muted] font-medium">Öncelik</span>
            <select
              value={priorityFilter}
              onChange={(e) => { setPriorityFilter(e.target.value); setPage(1) }}
              className="h-10 w-full rounded-xl border border-[--line] bg-white px-3 text-xs text-[--text] focus:outline-none focus:border-[--brand] focus:ring-1 focus:ring-[--brand] cursor-pointer shadow-xs"
            >
              <option value="">Tümü</option>
              {Object.entries(PRIORITY_LABELS).map(([k, v]) => (
                <option key={k} value={k}>{v}</option>
              ))}
            </select>
          </div>

          {/* Category filter */}
          <div className="flex flex-col gap-1.5">
            <span className="text-xs text-[--text-muted] font-medium">Kategori</span>
            <select
              value={categoryFilter}
              onChange={(e) => { setCategoryFilter(e.target.value); setPage(1) }}
              className="h-10 w-full rounded-xl border border-[--line] bg-white px-3 text-xs text-[--text] focus:outline-none focus:border-[--brand] focus:ring-1 focus:ring-[--brand] cursor-pointer shadow-xs"
            >
              <option value="">Tümü</option>
              {Object.entries(CATEGORY_LABELS).map(([k, v]) => (
                <option key={k} value={k}>{v}</option>
              ))}
            </select>
          </div>

          {/* Date range filters */}
          <div className="flex flex-col gap-1.5">
            <span className="text-xs text-[--text-muted] font-medium">Başlangıç Tarihi</span>
            <input
              type="date"
              value={dateStart}
              onChange={(e) => { setDateStart(e.target.value); setPage(1) }}
              className="h-10 w-full rounded-xl border border-[--line] bg-white px-3 text-xs text-[--text] focus:outline-none focus:border-[--brand] focus:ring-1 focus:ring-[--brand] cursor-pointer shadow-xs"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <span className="text-xs text-[--text-muted] font-medium">Bitiş Tarihi</span>
            <input
              type="date"
              value={dateEnd}
              onChange={(e) => { setDateEnd(e.target.value); setPage(1) }}
              className="h-10 w-full rounded-xl border border-[--line] bg-white px-3 text-xs text-[--text] focus:outline-none focus:border-[--brand] focus:ring-1 focus:ring-[--brand] cursor-pointer shadow-xs"
            />
          </div>
        </div>
      </div>

      {/* Ticket List Table */}
      <div className="rounded-[20px] border border-[--line] bg-white/80 backdrop-blur-xl shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-sm">
            <thead>
              <tr className="border-b border-[--line] bg-[--page] text-[--text-muted] font-medium text-xs">
                <th className="p-4 w-32">Tarih</th>
                <th className="p-4">Bildiren</th>
                <th className="p-4">Hata Başlığı</th>
                <th className="p-4">Modül / Sayfa</th>
                <th className="p-4 w-32">Kategori</th>
                <th className="p-4 w-24">Öncelik</th>
                <th className="p-4 w-28">Durum</th>
                <th className="p-4 w-16 text-center">İncele</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[--line-soft]">
              {loading ? (
                <tr>
                  <td colSpan={8} className="p-12 text-center text-[--text-muted]">
                    <Loader2 className="animate-spin text-[--brand] size-8 mx-auto mb-2" />
                    Talepler yükleniyor...
                  </td>
                </tr>
              ) : tickets.length === 0 ? (
                <tr>
                  <td colSpan={8} className="p-12 text-center text-[--text-muted]">
                    Eşleşen teknik destek talebi bulunamadı.
                  </td>
                </tr>
              ) : (
                tickets.map((ticket) => {
                  const priorityColors: Record<string, string> = {
                    low: "bg-[--muted-bg] text-[--text-muted] border border-[--line]",
                    medium: "bg-[--brand-soft] text-[--brand] border border-[--brand-line]",
                    high: "bg-[--warn-soft] text-[--warn] border border-[--warn]/20",
                    critical: "bg-[--bad-soft] text-[--bad] border border-[--bad]/20 font-semibold"
                  }

                  const statusColors: Record<string, string> = {
                    open: "bg-[--brand-soft] text-[--brand] border border-[--brand-line]",
                    in_progress: "bg-[--brand-soft] text-[--sky] border border-[--brand-line]",
                    needs_info: "bg-[--warn-soft] text-[--warn] border border-[--warn]/20",
                    resolved: "bg-[--ok-soft] text-[--ok] border border-[--ok]/20",
                    wont_fix: "bg-[--muted-bg] text-[--text-muted] border border-[--line]",
                    closed: "bg-[--muted-bg] text-[--text-muted] line-through border border-[--line]"
                  }

                  return (
                    <tr
                      key={ticket.id}
                      className="hover:bg-[--muted-bg]/50 transition-colors"
                    >
                      <td className="p-4 text-xs text-[--text-muted] whitespace-nowrap font-mono">
                        {new Date(ticket.createdAt).toLocaleDateString("tr-TR")} {new Date(ticket.createdAt).toLocaleTimeString("tr-TR", { hour: '2-digit', minute: '2-digit' })}
                      </td>
                      <td className="p-4">
                        <div className="flex items-center gap-2.5">
                          {ticket.reporter?.avatarUrl ? (
                            <img
                              src={ticket.reporter.avatarUrl}
                              alt=""
                              className="size-7 rounded-full object-cover border border-[--line]"
                            />
                          ) : (
                            <div className="size-7 rounded-full bg-[--brand-soft] text-[--brand] flex items-center justify-center text-[10px] font-bold border border-[--brand-line]">
                              {ticket.reporter?.fullName?.substring(0, 2).toUpperCase() || "US"}
                            </div>
                          )}
                          <span className="font-medium text-[--text] truncate max-w-[130px]">
                            {ticket.reporter?.fullName}
                          </span>
                        </div>
                      </td>
                      <td className="p-4 font-medium text-[--text] truncate max-w-[200px]" title={ticket.title}>
                        {ticket.title}
                      </td>
                      <td className="p-4">
                        <div className="text-xs leading-normal">
                          <span className="font-semibold text-[--text]">{ticket.moduleName}</span>
                          <span className="block text-[--text-muted] truncate max-w-[200px]" title={ticket.pageUrl}>
                            {ticket.pageUrl}
                          </span>
                        </div>
                      </td>
                      <td className="p-4 text-xs font-medium text-[--text-muted]">
                        {CATEGORY_LABELS[ticket.category] || ticket.category}
                      </td>
                      <td className="p-4">
                        <span className={`text-[10px] px-2.5 py-0.5 rounded-full font-medium ${priorityColors[ticket.priority]}`}>
                          {PRIORITY_LABELS[ticket.priority]}
                        </span>
                      </td>
                      <td className="p-4">
                        <span className={`text-[11px] px-2.5 py-0.5 rounded-full font-semibold ${statusColors[ticket.status]}`}>
                          {STATUS_LABELS[ticket.status]}
                        </span>
                      </td>
                      <td className="p-4 text-center">
                        <button
                          onClick={() => handleOpenDetail(ticket)}
                          className="text-[--brand] hover:text-[--brand-hover] p-2 rounded-lg hover:bg-[--brand-soft] transition-all cursor-pointer"
                          title="Detayları İncele"
                        >
                          <Eye size={16} />
                        </button>
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Table Pagination */}
        {totalPages > 1 && (
          <div className="border-t border-[--line] px-5 py-3.5 flex items-center justify-between bg-[--page]">
            <span className="text-xs text-[--text-muted]">
              Toplam <span className="font-semibold text-[--text]">{totalCount}</span> kayıttan {(page - 1) * limit + 1}-{Math.min(page * limit, totalCount)} arası gösteriliyor.
            </span>
            <div className="flex items-center gap-2">
              <button
                disabled={page === 1}
                onClick={() => setPage(p => Math.max(p - 1, 1))}
                className="p-1.5 rounded-lg border border-[--line] bg-white text-[--text-2] hover:bg-[--muted-bg] disabled:opacity-30 cursor-pointer"
              >
                <ChevronLeft size={16} />
              </button>
              <span className="text-xs font-semibold px-2 text-[--text]">{page} / {totalPages}</span>
              <button
                disabled={page === totalPages}
                onClick={() => setPage(p => Math.min(p + 1, totalPages))}
                className="p-1.5 rounded-lg border border-[--line] bg-white text-[--text-2] hover:bg-[--muted-bg] disabled:opacity-30 cursor-pointer"
              >
                <ChevronRight size={16} />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Ticket Details Inspector Drawer Modal */}
      {detailModalOpen && selectedTicket && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#0B1B33]/40 backdrop-blur-sm overflow-y-auto">
          <div className="relative w-full max-w-5xl bg-white border border-[--line] rounded-[24px] shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
            {/* Header */}
            <div className="flex items-center justify-between border-b border-[--line] px-6 py-4 bg-[--page]">
              <div className="flex items-center gap-3">
                <LifeBuoy className="text-[--brand] size-5" />
                <div>
                  <h3 className="text-base font-bold text-[--navy]">Talep Detayı: {selectedTicket.title}</h3>
                  <p className="text-xs text-[--text-muted]">ID: {selectedTicket.id}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={handleDeleteTicket}
                  className="text-[--bad] hover:text-[--bad] hover:bg-[--bad-soft] p-2 rounded-lg transition-colors cursor-pointer mr-2"
                  title="Talebi Sil"
                >
                  <Trash2 size={16} />
                </button>
                <button
                  onClick={() => setDetailModalOpen(false)}
                  className="text-[--text-muted] hover:text-[--text] hover:bg-[--muted-bg] p-2 rounded-lg transition-colors cursor-pointer"
                >
                  <ChevronLeft size={18} />
                </button>
              </div>
            </div>

            {/* Content Body Grid */}
            <div className="p-6 overflow-y-auto space-y-6 flex-1 grid grid-cols-1 lg:grid-cols-3 gap-6">
              
              {/* Left Column (2/3 width on large screen): Description & Log data */}
              <div className="lg:col-span-2 space-y-5">
                
                {/* Description Box */}
                <div className="space-y-1.5">
                  <span className="text-xs text-[--text-muted] font-semibold uppercase tracking-wider">Hata Açıklaması</span>
                  <div className="border border-[--line] rounded-xl p-4 bg-[--page] text-sm text-[--text] whitespace-pre-wrap leading-relaxed">
                    {selectedTicket.description}
                  </div>
                </div>

                {/* Screenshot Box */}
                {selectedTicket.screenshotUrl && (
                  <div className="space-y-1.5">
                    <span className="text-xs text-[--text-muted] font-semibold uppercase tracking-wider">Hata Ekran Görüntüsü</span>
                    <div className="border border-[--line] rounded-xl overflow-hidden bg-black/5 group relative max-h-[360px] flex items-center justify-center">
                      <img
                        src={selectedTicket.screenshotUrl}
                        alt="Screenshot"
                        className="max-w-full max-h-[360px] object-contain transition-transform duration-200 group-hover:scale-101"
                      />
                      <a
                        href={selectedTicket.screenshotUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="absolute bottom-3 right-3 rounded-lg bg-white/90 border border-[--line] text-[--text] px-3 py-1.5 hover:bg-white transition-colors flex items-center gap-1.5 text-xs font-medium cursor-pointer shadow-sm"
                      >
                        <ExternalLink size={12} />
                        Tam Boyut Gör
                      </a>
                    </div>
                  </div>
                )}

                {/* Additional Attachments */}
                {selectedTicket.attachments && selectedTicket.attachments.length > 0 && (
                  <div className="space-y-2">
                    <span className="text-xs text-[--text-muted] font-semibold uppercase tracking-wider">Ekler ({selectedTicket.attachments.length})</span>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {selectedTicket.attachments.map((att) => (
                        <a
                          key={att.id}
                          href={att.fileUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="flex items-center gap-2 p-3 border border-[--line] rounded-xl bg-white hover:bg-[--muted-bg] transition-colors text-xs text-[--text] cursor-pointer"
                        >
                          <Laptop size={14} className="text-[--brand]" />
                          <div className="flex-1 truncate">
                            <p className="font-medium truncate">{att.fileName}</p>
                            <p className="text-[10px] text-[--text-muted]">{(att.fileSize / 1024).toFixed(1)} KB</p>
                          </div>
                          <ExternalLink size={12} className="text-[--text-muted]" />
                        </a>
                      ))}
                    </div>
                  </div>
                )}

                {/* Log Section - Console & Network */}
                <div className="space-y-4 pt-3 border-t border-[--line]">
                  <h4 className="text-sm font-bold text-[--text] flex items-center gap-2">
                    <Terminal size={16} className="text-[--brand]" />
                    Otomatik Toplanan Teknik Veriler (Log Raporları)
                  </h4>

                  {/* Console Logs */}
                  <div className="space-y-1.5">
                    <span className="text-xs font-semibold text-[--text-2] flex items-center gap-1">
                      🖥️ Console Hataları ({selectedTicket.consoleLogs?.length || 0})
                    </span>
                    <div className="rounded-xl border border-[--line] bg-[--page] font-mono text-[11px] text-[--text-2] p-3.5 overflow-x-auto max-h-[160px] space-y-1">
                      {(!selectedTicket.consoleLogs || selectedTicket.consoleLogs.length === 0) ? (
                        <p className="text-[--text-muted] italic">Konsol hata veya uyarı kaydı bulunmuyor.</p>
                      ) : (
                        selectedTicket.consoleLogs.map((log, idx) => (
                          <div key={idx} className="flex gap-2 leading-tight">
                            <span className="text-[--text-muted] select-none">[{new Date(log.timestamp).toLocaleTimeString()}]</span>
                            <span className={log.type === "error" ? "text-[--bad] font-semibold" : "text-[--warn]"}>
                              [{log.type.toUpperCase()}]
                            </span>
                            <span className="flex-1 break-all">{log.message}</span>
                          </div>
                        ))
                      )}
                    </div>
                  </div>

                  {/* Network Logs */}
                  <div className="space-y-1.5">
                    <span className="text-xs font-semibold text-[--text-2] flex items-center gap-1">
                      🌐 Başarısız API İstekleri ({selectedTicket.networkLogs?.length || 0})
                    </span>
                    <div className="rounded-xl border border-[--line] bg-[--page] font-mono text-[11px] text-[--text-2] p-3.5 overflow-x-auto max-h-[160px] space-y-1">
                      {(!selectedTicket.networkLogs || selectedTicket.networkLogs.length === 0) ? (
                        <p className="text-[--text-muted] italic">Başarısız (4xx/5xx) API isteği bulunmuyor.</p>
                      ) : (
                        selectedTicket.networkLogs.map((log, idx) => (
                          <div key={idx} className="flex gap-2 leading-tight">
                            <span className="text-[--text-muted] select-none">[{new Date(log.timestamp).toLocaleTimeString()}]</span>
                            <span className="text-[--bad] font-semibold">{log.method}</span>
                            <span className="text-[--text-muted] font-semibold">({log.status === 0 ? "AĞ HATASI" : log.status})</span>
                            <span className="flex-1 break-all text-[--text]">{log.url}</span>
                          </div>
                        ))
                      )}
                    </div>
                  </div>

                  {/* Browser Details */}
                  <div className="space-y-1.5">
                    <span className="text-xs font-semibold text-[--text-2] flex items-center gap-1">
                      💻 Tarayıcı ve Sistem Bilgisi
                    </span>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 p-3.5 bg-[--page] border border-[--line] rounded-xl text-xs">
                      <div>
                        <span className="text-[--text-muted] block">Ekran Çözünürlüğü</span>
                        <span className="font-semibold text-[--text]">{selectedTicket.browserInfo?.screenResolution || "Bilinmiyor"}</span>
                      </div>
                      <div>
                        <span className="text-[--text-muted] block">Pencere Viewport</span>
                        <span className="font-semibold text-[--text]">{selectedTicket.browserInfo?.viewportSize || "Bilinmiyor"}</span>
                      </div>
                      <div>
                        <span className="text-[--text-muted] block">Device Pixel Ratio</span>
                        <span className="font-semibold text-[--text]">{selectedTicket.browserInfo?.devicePixelRatio || 1}</span>
                      </div>
                      <div className="col-span-2 sm:col-span-3">
                        <span className="text-[--text-muted] block">User Agent</span>
                        <span className="font-semibold text-[--text] break-all">{selectedTicket.browserInfo?.userAgent || "Bilinmiyor"}</span>
                      </div>
                    </div>
                  </div>

                </div>

              </div>

              {/* Right Column (1/3 width): Actions update & comments */}
              <div className="space-y-6 lg:border-l lg:border-[--line] lg:pl-6">
                
                {/* Meta details */}
                <div className="space-y-2.5 text-xs border-b border-[--line] pb-4">
                  <div>
                    <span className="text-[--text-muted] block">Bildiren Kullanıcı</span>
                    <span className="font-bold text-sm text-[--navy]">{selectedTicket.reporter?.fullName}</span>
                  </div>
                  <div>
                    <span className="text-[--text-muted] block">Oluşturulma Tarihi</span>
                    <span className="font-medium text-[--text-2]">
                      {new Date(selectedTicket.createdAt).toLocaleString("tr-TR")}
                    </span>
                  </div>
                  <div>
                    <span className="text-[--text-muted] block">Hata Sayfa URL</span>
                    <a
                      href={selectedTicket.pageUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="text-[--brand] font-semibold hover:underline truncate block max-w-[260px] flex items-center gap-1"
                    >
                      {new URL(selectedTicket.pageUrl, typeof window !== "undefined" ? window.location.origin : undefined).pathname}
                      <ExternalLink size={10} />
                    </a>
                  </div>
                </div>

                {/* Developer Updates Form */}
                <form onSubmit={handleUpdateTicket} className="space-y-4">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-[--text-muted]">Geliştirici Güncelleme</h4>

                  {/* Status */}
                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-medium text-[--text]">Durum</label>
                    <select
                      value={ticketStatus}
                      onChange={(e) => setTicketStatus(e.target.value)}
                      className="h-10 w-full rounded-xl border border-[--line] bg-white px-3 text-xs text-[--text] focus:outline-none focus:border-[--brand] focus:ring-1 focus:ring-[--brand] cursor-pointer shadow-xs"
                    >
                      {Object.entries(STATUS_LABELS).map(([k, v]) => (
                        <option key={k} value={k}>{v}</option>
                      ))}
                    </select>
                  </div>

                  {/* Priority */}
                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-medium text-[--text]">Öncelik</label>
                    <select
                      value={ticketPriority}
                      onChange={(e) => setTicketPriority(e.target.value)}
                      className="h-10 w-full rounded-xl border border-[--line] bg-white px-3 text-xs text-[--text] focus:outline-none focus:border-[--brand] focus:ring-1 focus:ring-[--brand] cursor-pointer shadow-xs"
                    >
                      {Object.entries(PRIORITY_LABELS).map(([k, v]) => (
                        <option key={k} value={k}>{v}</option>
                      ))}
                    </select>
                  </div>

                  {/* Assign to developer */}
                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-medium text-[--text]">Atanan Geliştirici</label>
                    <select
                      value={assigneeId}
                      onChange={(e) => setAssigneeId(e.target.value)}
                      className="h-10 w-full rounded-xl border border-[--line] bg-white px-3 text-xs text-[--text] focus:outline-none focus:border-[--brand] focus:ring-1 focus:ring-[--brand] cursor-pointer shadow-xs"
                    >
                      <option value="">Atanmamış</option>
                      {users.map((u) => (
                        <option key={u.id} value={u.id}>{u.fullName} ({u.username})</option>
                      ))}
                    </select>
                  </div>

                  {/* Resolution note */}
                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-medium text-[--text]">Çözüm Notu</label>
                    <textarea
                      rows={2}
                      value={resolutionNoteText}
                      onChange={(e) => setResolutionNoteText(e.target.value)}
                      className="w-full rounded-xl border border-[--line] bg-white px-3 py-2 text-xs text-[--text] placeholder-[--text-muted] focus:outline-none focus:border-[--brand] focus:ring-1 focus:ring-[--brand] shadow-xs"
                      placeholder="Hatanın nasıl giderildiğini yazın..."
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={updating}
                    className="flex h-10 w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-[--brand] to-[--blue] hover:from-[--brand-hover] hover:to-[--brand] text-white font-medium text-xs transition-all cursor-pointer shadow-sm disabled:opacity-50"
                  >
                    {updating ? (
                      <>
                        <Loader2 size={14} className="animate-spin" />
                        Kaydediliyor...
                      </>
                    ) : (
                      "Bilgileri Güncelle"
                    )}
                  </button>
                </form>

                {/* Internal comments / Developer notes */}
                <div className="border-t border-[--line] pt-4 space-y-3">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-[--text-muted] flex items-center gap-1.5">
                    <MessageSquare size={13} className="text-[--brand]" />
                    Geliştirici Notları / Yorumlar ({selectedTicket.internalComments?.length || 0})
                  </h4>

                  {/* Yorumlar Listesi */}
                  <div className="space-y-2 max-h-[180px] overflow-y-auto text-[11px] pr-1">
                    {(!selectedTicket.internalComments || selectedTicket.internalComments.length === 0) ? (
                      <p className="text-[--text-muted] italic text-center py-2">Dahili yorum henüz eklenmemiş.</p>
                    ) : (
                      selectedTicket.internalComments.map((comment) => (
                        <div key={comment.id} className="p-3 bg-[--page] border border-[--line] rounded-xl leading-normal">
                          <div className="flex justify-between font-bold text-[--text] mb-1">
                            <span>{comment.fullName}</span>
                            <span className="font-normal text-[9px] text-[--text-muted]">
                              {new Date(comment.createdAt).toLocaleDateString()} {new Date(comment.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </span>
                          </div>
                          <p className="text-[--text-2] break-all">{comment.comment}</p>
                        </div>
                      ))
                    )}
                  </div>

                  {/* Yorum Ekle Formu */}
                  <form onSubmit={handleAddComment} className="flex gap-2">
                    <input
                      type="text"
                      placeholder="Yalnızca geliştiricilerin göreceği not..."
                      value={newComment}
                      onChange={(e) => setNewComment(e.target.value)}
                      className="flex-1 h-9 rounded-xl border border-[--line] bg-white px-3 py-1 text-xs text-[--text] placeholder-[--text-muted] focus:outline-none focus:border-[--brand] focus:ring-1 focus:ring-[--brand] shadow-xs"
                    />
                    <button
                      type="submit"
                      disabled={!newComment.trim()}
                      className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-r from-[--brand] to-[--blue] hover:from-[--brand-hover] hover:to-[--brand] text-white disabled:opacity-50 cursor-pointer shrink-0 transition-all shadow-xs"
                      title="Yorum Gönder"
                    >
                      <Send size={13} />
                    </button>
                  </form>
                </div>

              </div>

            </div>
          </div>
        </div>
      )}
    </div>
  )
}
