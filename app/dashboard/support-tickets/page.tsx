"use client"

import React, { useState, useEffect } from "react"
import { useLanguage } from "@/lib/context/LanguageContext"
import { useRouter } from "next/navigation"
import { useAuth } from "@/lib/auth/context"
import { toast } from "sonner"
import {
  LifeBuoy, Search, Filter, Calendar, User, Check, X, Eye, Trash2,
  AlertCircle, ArrowRight, MessageSquare, Clock, ShieldAlert, Laptop,
  ExternalLink, Terminal, Globe, ChevronLeft, ChevronRight, Send, Loader2
} from "lucide-react"

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
        // API response might be wrapped in .data
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
        // Refresh local items
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
        const commentsList = await res.json()
        toast.success("Yorum eklendi.")
        setNewComment("")
        // Update ticket in local lists
        setTickets(prev => prev.map(t => t.id === selectedTicket.id ? { ...t, internalComments: commentsList } : t))
        setSelectedTicket(prev => prev ? { ...prev, internalComments: commentsList } : null)
      } else {
        toast.error("Yorum eklenirken hata oluştu.")
      }
    } catch (e) {
      console.error(e)
      toast.error("Ağ hatası oluştu.")
    }
  }

  // Delete support ticket (Soft delete)
  const handleDeleteTicket = async () => {
    if (!selectedTicket) return
    if (!confirm("Bu destek talebini silmek istediğinize emin misiniz?")) return

    try {
      const res = await fetch(`/api/support-tickets/${selectedTicket.id}`, {
        method: "DELETE"
      })

      if (res.ok) {
        toast.success("Talep başarıyla silindi (Soft Delete).")
        setDetailModalOpen(false)
        setTickets(prev => prev.filter(t => t.id !== selectedTicket.id))
      } else {
        toast.error("Silme işlemi başarısız.")
      }
    } catch (e) {
      console.error(e)
      toast.error("Ağ hatası oluştu.")
    }
  }

  // Dashboard Stats Calculations
  const totalOpen = tickets.filter(t => t.status === "open").length
  const totalInProgress = tickets.filter(t => t.status === "in_progress").length
  const totalNeedsInfo = tickets.filter(t => t.status === "needs_info").length
  // Vibe Coding logic: ui_bug + backend_error
  const vibeBugsCount = tickets.filter(t => t.category === "ui_bug" || t.category === "backend_error").length

  if (authLoading) return null

  return (
    <div className="space-y-6">
      {/* Title */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-foreground flex items-center gap-2">
            <LifeBuoy className="text-primary size-6" />
            Teknik Destek ve Hata Bildirim Talepleri
          </h2>
          <p className="text-sm text-muted-foreground">
            Sistemde kullanıcıların karşılaştığı ekran hataları ve log raporları.
          </p>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Total */}
        <div className="rounded-xl border border-border bg-card p-4 shadow-xs flex items-center gap-4">
          <div className="rounded-lg bg-primary/10 p-2.5 text-primary">
            <LifeBuoy size={20} />
          </div>
          <div>
            <p className="text-xs font-medium text-muted-foreground">Toplam Talep</p>
            <p className="text-lg font-bold text-foreground">{totalCount}</p>
          </div>
        </div>

        {/* Card 2: Open */}
        <div className="rounded-xl border border-border bg-card p-4 shadow-xs flex items-center gap-4">
          <div className="rounded-lg bg-emerald-500/10 p-2.5 text-emerald-500">
            <AlertCircle size={20} />
          </div>
          <div>
            <p className="text-xs font-medium text-muted-foreground">Yeni / Açık Talepler</p>
            <p className="text-lg font-bold text-foreground">
              {tickets.filter(t => t.status === "open").length}
            </p>
          </div>
        </div>

        {/* Card 3: In Progress */}
        <div className="rounded-xl border border-border bg-card p-4 shadow-xs flex items-center gap-4">
          <div className="rounded-lg bg-blue-500/10 p-2.5 text-blue-500">
            <Clock size={20} />
          </div>
          <div>
            <p className="text-xs font-medium text-muted-foreground">İşlemdekiler</p>
            <p className="text-lg font-bold text-foreground">
              {tickets.filter(t => t.status === "in_progress").length}
            </p>
          </div>
        </div>

        {/* Card 4: Vibe Coding Connection Bugs */}
        <div className="rounded-xl border border-border bg-card p-4 shadow-xs flex items-center gap-4 ring-1 ring-amber-500/30 bg-amber-500/5">
          <div className="rounded-lg bg-amber-500/10 p-2.5 text-amber-500">
            <ShieldAlert size={20} />
          </div>
          <div>
            <p className="text-xs font-medium text-amber-800 dark:text-amber-300">Vibe-Coding Hataları</p>
            <p className="text-lg font-bold text-amber-600 dark:text-amber-400">
              {tickets.filter(t => t.category === "ui_bug" || t.category === "backend_error").length}
            </p>
          </div>
        </div>
      </div>

      {/* Filter Options */}
      <div className="rounded-xl border border-border bg-card p-4 shadow-xs space-y-3">
        <div className="flex items-center gap-2 text-sm font-semibold text-foreground border-b border-border/60 pb-2">
          <Filter size={16} className="text-primary" />
          Talepleri Filtrele
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-3">
          {/* Status filter */}
          <div className="flex flex-col gap-1">
            <span className="text-xs text-muted-foreground font-medium">Durum</span>
            <select
              value={statusFilter}
              onChange={(e) => { setStatusFilter(e.target.value); setPage(1) }}
              className="h-9 w-full rounded-md border border-input bg-card px-2.5 text-xs focus:outline-none focus:ring-1 focus:ring-primary cursor-pointer"
            >
              <option value="">Tümü</option>
              {Object.entries(STATUS_LABELS).map(([k, v]) => (
                <option key={k} value={k}>{v}</option>
              ))}
            </select>
          </div>

          {/* Priority filter */}
          <div className="flex flex-col gap-1">
            <span className="text-xs text-muted-foreground font-medium">Öncelik</span>
            <select
              value={priorityFilter}
              onChange={(e) => { setPriorityFilter(e.target.value); setPage(1) }}
              className="h-9 w-full rounded-md border border-input bg-card px-2.5 text-xs focus:outline-none focus:ring-1 focus:ring-primary cursor-pointer"
            >
              <option value="">Tümü</option>
              {Object.entries(PRIORITY_LABELS).map(([k, v]) => (
                <option key={k} value={k}>{v}</option>
              ))}
            </select>
          </div>

          {/* Category filter */}
          <div className="flex flex-col gap-1">
            <span className="text-xs text-muted-foreground font-medium">Kategori</span>
            <select
              value={categoryFilter}
              onChange={(e) => { setCategoryFilter(e.target.value); setPage(1) }}
              className="h-9 w-full rounded-md border border-input bg-card px-2.5 text-xs focus:outline-none focus:ring-1 focus:ring-primary cursor-pointer"
            >
              <option value="">Tümü</option>
              {Object.entries(CATEGORY_LABELS).map(([k, v]) => (
                <option key={k} value={k}>{v}</option>
              ))}
            </select>
          </div>

          {/* Date range filters */}
          <div className="flex flex-col gap-1">
            <span className="text-xs text-muted-foreground font-medium">Başlangıç Tarihi</span>
            <input
              type="date"
              value={dateStart}
              onChange={(e) => { setDateStart(e.target.value); setPage(1) }}
              className="h-9 w-full rounded-md border border-input bg-card px-2 text-xs focus:outline-none focus:ring-1 focus:ring-primary cursor-pointer"
            />
          </div>

          <div className="flex flex-col gap-1">
            <span className="text-xs text-muted-foreground font-medium">Bitiş Tarihi</span>
            <input
              type="date"
              value={dateEnd}
              onChange={(e) => { setDateEnd(e.target.value); setPage(1) }}
              className="h-9 w-full rounded-md border border-input bg-card px-2 text-xs focus:outline-none focus:ring-1 focus:ring-primary cursor-pointer"
            />
          </div>
        </div>
      </div>

      {/* Ticket List Table */}
      <div className="rounded-xl border border-border bg-card shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/30 text-muted-foreground font-medium text-xs">
                <th className="p-3 w-28">Tarih</th>
                <th className="p-3">Bildiren</th>
                <th className="p-3">Hata Başlığı</th>
                <th className="p-3">Modül / Sayfa</th>
                <th className="p-3 w-32">Kategori</th>
                <th className="p-3 w-24">Öncelik</th>
                <th className="p-3 w-28">Durum</th>
                <th className="p-3 w-16 text-center">İncele</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={8} className="p-10 text-center text-muted-foreground">
                    <Loader2 className="animate-spin text-primary size-8 mx-auto mb-2" />
                    Talepler yükleniyor...
                  </td>
                </tr>
              ) : tickets.length === 0 ? (
                <tr>
                  <td colSpan={8} className="p-10 text-center text-muted-foreground">
                    Eşleşen teknik destek talebi bulunamadı.
                  </td>
                </tr>
              ) : (
                tickets.map((ticket) => {
                  // Badge styling logic
                  const priorityColors: Record<string, string> = {
                    low: "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300",
                    medium: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300",
                    high: "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300",
                    critical: "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300 animate-pulse font-bold"
                  }

                  const statusColors: Record<string, string> = {
                    open: "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/30 dark:text-emerald-400 border border-emerald-500/20",
                    in_progress: "bg-blue-100 text-blue-800 dark:bg-blue-950/30 dark:text-blue-400 border border-blue-500/20",
                    needs_info: "bg-amber-100 text-amber-800 dark:bg-amber-950/30 dark:text-amber-400 border border-amber-500/20",
                    resolved: "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300 border border-border",
                    wont_fix: "bg-gray-200 text-gray-500 dark:bg-gray-800 dark:text-gray-400",
                    closed: "bg-gray-200 text-gray-600 dark:bg-gray-800 dark:text-gray-500 line-through"
                  }

                  return (
                    <tr
                      key={ticket.id}
                      className="border-b border-border hover:bg-muted/10 transition-colors"
                    >
                      <td className="p-3 text-xs text-muted-foreground whitespace-nowrap">
                        {new Date(ticket.createdAt).toLocaleDateString("tr-TR")} {new Date(ticket.createdAt).toLocaleTimeString("tr-TR", { hour: '2-digit', minute: '2-digit' })}
                      </td>
                      <td className="p-3">
                        <div className="flex items-center gap-2">
                          {ticket.reporter?.avatarUrl ? (
                            <img
                              src={ticket.reporter.avatarUrl}
                              alt=""
                              className="size-6 rounded-full object-cover border border-border"
                            />
                          ) : (
                            <div className="size-6 rounded-full bg-primary/10 text-primary flex items-center justify-center text-[10px] font-bold">
                              {ticket.reporter?.fullName?.substring(0, 2).toUpperCase() || "US"}
                            </div>
                          )}
                          <span className="font-medium text-foreground truncate max-w-[130px]">
                            {ticket.reporter?.fullName}
                          </span>
                        </div>
                      </td>
                      <td className="p-3 font-semibold text-foreground truncate max-w-[180px]" title={ticket.title}>
                        {ticket.title}
                      </td>
                      <td className="p-3">
                        <div className="text-xs leading-normal">
                          <span className="font-semibold text-foreground">{ticket.moduleName}</span>
                          <span className="block text-muted-foreground truncate max-w-[200px]" title={ticket.pageUrl}>
                            {ticket.pageUrl}
                          </span>
                        </div>
                      </td>
                      <td className="p-3 text-xs font-medium text-muted-foreground">
                        {CATEGORY_LABELS[ticket.category] || ticket.category}
                      </td>
                      <td className="p-3">
                        <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${priorityColors[ticket.priority]}`}>
                          {PRIORITY_LABELS[ticket.priority]}
                        </span>
                      </td>
                      <td className="p-3">
                        <span className={`text-[11px] px-2.5 py-0.5 rounded-full font-semibold ${statusColors[ticket.status]}`}>
                          {STATUS_LABELS[ticket.status]}
                        </span>
                      </td>
                      <td className="p-3 text-center">
                        <button
                          onClick={() => handleOpenDetail(ticket)}
                          className="text-primary hover:text-primary/80 p-1 rounded-md hover:bg-muted/80 transition-all cursor-pointer"
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
          <div className="border-t border-border px-4 py-3 flex items-center justify-between bg-muted/10">
            <span className="text-xs text-muted-foreground">
              Toplam <span className="font-semibold text-foreground">{totalCount}</span> kayıttan {(page - 1) * limit + 1}-{Math.min(page * limit, totalCount)} arası gösteriliyor.
            </span>
            <div className="flex items-center gap-1.5">
              <button
                disabled={page === 1}
                onClick={() => setPage(p => Math.max(p - 1, 1))}
                className="p-1 rounded-md border border-border bg-card text-muted-foreground hover:text-foreground disabled:opacity-40 cursor-pointer"
              >
                <ChevronLeft size={16} />
              </button>
              <span className="text-xs font-semibold px-2">{page} / {totalPages}</span>
              <button
                disabled={page === totalPages}
                onClick={() => setPage(p => Math.min(p + 1, totalPages))}
                className="p-1 rounded-md border border-border bg-card text-muted-foreground hover:text-foreground disabled:opacity-40 cursor-pointer"
              >
                <ChevronRight size={16} />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Ticket Details Inspector Drawer Modal */}
      {detailModalOpen && selectedTicket && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs overflow-y-auto">
          <div className="relative w-full max-w-5xl bg-card border border-border rounded-xl shadow-xl overflow-hidden flex flex-col max-h-[92vh] tw-animate-fade-in">
            {/* Header */}
            <div className="flex items-center justify-between border-b border-border px-5 py-4 bg-muted/40">
              <div className="flex items-center gap-3">
                <LifeBuoy className="text-primary size-5" />
                <div>
                  <h3 className="text-md font-bold text-foreground">Talep Detayı: {selectedTicket.title}</h3>
                  <p className="text-xs text-muted-foreground">ID: {selectedTicket.id}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={handleDeleteTicket}
                  className="text-red-500 hover:text-red-600 hover:bg-red-500/10 p-2 rounded-lg transition-colors cursor-pointer mr-2"
                  title="Talebi Sil"
                >
                  <Trash2 size={16} />
                </button>
                <button
                  onClick={() => setDetailModalOpen(false)}
                  className="text-muted-foreground hover:text-foreground hover:bg-muted/80 p-2 rounded-lg transition-colors cursor-pointer"
                >
                  <X size={18} />
                </button>
              </div>
            </div>

            {/* Content Body Grid */}
            <div className="p-6 overflow-y-auto space-y-6 flex-1 grid grid-cols-1 lg:grid-cols-3 gap-6">
              
              {/* Left Column (2/3 width on large screen): Description & Log data */}
              <div className="lg:col-span-2 space-y-5">
                
                {/* Description Box */}
                <div className="space-y-1.5">
                  <span className="text-xs text-muted-foreground font-semibold uppercase tracking-wider">Hata Açıklaması</span>
                  <div className="border border-border/80 rounded-lg p-4 bg-muted/20 text-sm text-foreground whitespace-pre-wrap leading-relaxed">
                    {selectedTicket.description}
                  </div>
                </div>

                {/* Screenshot Box */}
                {selectedTicket.screenshotUrl && (
                  <div className="space-y-1.5">
                    <span className="text-xs text-muted-foreground font-semibold uppercase tracking-wider">Hata Ekran Görüntüsü</span>
                    <div className="border border-border rounded-lg overflow-hidden bg-muted/10 group relative max-h-[360px] flex items-center justify-center">
                      <img
                        src={selectedTicket.screenshotUrl}
                        alt="Screenshot"
                        className="max-w-full max-h-[360px] object-contain transition-transform duration-200 group-hover:scale-101"
                      />
                      <a
                        href={selectedTicket.screenshotUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="absolute bottom-2 right-2 rounded-md bg-black/60 text-white p-2 hover:bg-black/80 transition-colors flex items-center gap-1.5 text-xs font-medium cursor-pointer"
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
                    <span className="text-xs text-muted-foreground font-semibold uppercase tracking-wider">Ekler ({selectedTicket.attachments.length})</span>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {selectedTicket.attachments.map((att) => (
                        <a
                          key={att.id}
                          href={att.fileUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="flex items-center gap-2 p-2 border border-border rounded-lg hover:bg-muted/40 transition-colors text-xs text-foreground cursor-pointer"
                        >
                          <Laptop size={14} className="text-primary" />
                          <div className="flex-1 truncate">
                            <p className="font-semibold truncate">{att.fileName}</p>
                            <p className="text-[10px] text-muted-foreground">{(att.fileSize / 1024).toFixed(1)} KB</p>
                          </div>
                          <ExternalLink size={12} className="text-muted-foreground" />
                        </a>
                      ))}
                    </div>
                  </div>
                )}

                {/* Log Section - Console & Network (Tabs style or just scrollable blocks) */}
                <div className="space-y-4 pt-2 border-t border-border/80">
                  <h4 className="text-sm font-bold text-foreground flex items-center gap-2">
                    <Terminal size={16} className="text-primary" />
                    Otomatik Toplanan Teknik Veriler (Log Raporları)
                  </h4>

                  {/* Console Logs */}
                  <div className="space-y-1.5">
                    <span className="text-xs font-semibold text-foreground flex items-center gap-1">
                      🖥️ Console Hataları ({selectedTicket.consoleLogs?.length || 0})
                    </span>
                    <div className="rounded-lg border border-border bg-black/90 font-mono text-[11px] text-zinc-300 p-3 overflow-x-auto max-h-[160px] space-y-1 scrollbar-thin">
                      {(!selectedTicket.consoleLogs || selectedTicket.consoleLogs.length === 0) ? (
                        <p className="text-zinc-500 italic">Konsol hata veya uyarı kaydı bulunmuyor.</p>
                      ) : (
                        selectedTicket.consoleLogs.map((log, idx) => (
                          <div key={idx} className="flex gap-2 leading-tight">
                            <span className="text-zinc-500 select-none">[{new Date(log.timestamp).toLocaleTimeString()}]</span>
                            <span className={log.type === "error" ? "text-red-400 font-semibold" : "text-amber-400"}>
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
                    <span className="text-xs font-semibold text-foreground flex items-center gap-1">
                      🌐 Başarısız API İstekleri ({selectedTicket.networkLogs?.length || 0})
                    </span>
                    <div className="rounded-lg border border-border bg-black/90 font-mono text-[11px] text-zinc-300 p-3 overflow-x-auto max-h-[160px] space-y-1 scrollbar-thin">
                      {(!selectedTicket.networkLogs || selectedTicket.networkLogs.length === 0) ? (
                        <p className="text-zinc-500 italic">Başarısız (4xx/5xx) API isteği bulunmuyor.</p>
                      ) : (
                        selectedTicket.networkLogs.map((log, idx) => (
                          <div key={idx} className="flex gap-2 leading-tight">
                            <span className="text-zinc-500 select-none">[{new Date(log.timestamp).toLocaleTimeString()}]</span>
                            <span className="text-red-400 font-semibold">{log.method}</span>
                            <span className="text-zinc-400 font-semibold">({log.status === 0 ? "AĞ HATASI" : log.status})</span>
                            <span className="flex-1 break-all text-zinc-100">{log.url}</span>
                          </div>
                        ))
                      )}
                    </div>
                  </div>

                  {/* Browser Details */}
                  <div className="space-y-1.5">
                    <span className="text-xs font-semibold text-foreground flex items-center gap-1">
                      💻 Tarayıcı ve Sistem Bilgisi
                    </span>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 p-3 bg-muted/40 border border-border/80 rounded-lg text-xs">
                      <div>
                        <span className="text-muted-foreground block">Ekran Çözünürlüğü</span>
                        <span className="font-semibold text-foreground">{selectedTicket.browserInfo?.screenResolution || "Bilinmiyor"}</span>
                      </div>
                      <div>
                        <span className="text-muted-foreground block">Pencere Viewport</span>
                        <span className="font-semibold text-foreground">{selectedTicket.browserInfo?.viewportSize || "Bilinmiyor"}</span>
                      </div>
                      <div>
                        <span className="text-muted-foreground block">Device Pixel Ratio</span>
                        <span className="font-semibold text-foreground">{selectedTicket.browserInfo?.devicePixelRatio || 1}</span>
                      </div>
                      <div className="col-span-2 sm:col-span-3">
                        <span className="text-muted-foreground block">User Agent</span>
                        <span className="font-semibold text-foreground break-all">{selectedTicket.browserInfo?.userAgent || "Bilinmiyor"}</span>
                      </div>
                    </div>
                  </div>

                </div>

              </div>

              {/* Right Column (1/3 width): Actions update & comments */}
              <div className="space-y-6 lg:border-l lg:border-border lg:pl-6">
                
                {/* Meta details */}
                <div className="space-y-2.5 text-xs border-b border-border pb-4">
                  <div>
                    <span className="text-muted-foreground block">Bildiren Kullanıcı</span>
                    <span className="font-bold text-sm text-foreground">{selectedTicket.reporter?.fullName}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground block">Oluşturulma Tarihi</span>
                    <span className="font-semibold text-foreground">
                      {new Date(selectedTicket.createdAt).toLocaleString("tr-TR")}
                    </span>
                  </div>
                  <div>
                    <span className="text-muted-foreground block">Hata Sayfa URL</span>
                    <a
                      href={selectedTicket.pageUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="text-primary font-semibold hover:underline truncate block max-w-[260px] flex items-center gap-1"
                    >
                      {new URL(selectedTicket.pageUrl, typeof window !== "undefined" ? window.location.origin : undefined).pathname}
                      <ExternalLink size={10} />
                    </a>
                  </div>
                </div>

                {/* Developer Updates Form */}
                <form onSubmit={handleUpdateTicket} className="space-y-4">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Geliştirici Güncelleme</h4>

                  {/* Status */}
                  <div className="flex flex-col gap-1">
                    <label className="text-xs font-medium text-foreground">Durum</label>
                    <select
                      value={ticketStatus}
                      onChange={(e) => setTicketStatus(e.target.value)}
                      className="h-9 w-full rounded-md border border-input bg-card px-2.5 text-xs focus:outline-none focus:ring-1 focus:ring-primary cursor-pointer"
                    >
                      {Object.entries(STATUS_LABELS).map(([k, v]) => (
                        <option key={k} value={k}>{v}</option>
                      ))}
                    </select>
                  </div>

                  {/* Priority */}
                  <div className="flex flex-col gap-1">
                    <label className="text-xs font-medium text-foreground">Öncelik</label>
                    <select
                      value={ticketPriority}
                      onChange={(e) => setTicketPriority(e.target.value)}
                      className="h-9 w-full rounded-md border border-input bg-card px-2.5 text-xs focus:outline-none focus:ring-1 focus:ring-primary cursor-pointer"
                    >
                      {Object.entries(PRIORITY_LABELS).map(([k, v]) => (
                        <option key={k} value={k}>{v}</option>
                      ))}
                    </select>
                  </div>

                  {/* Assign to developer */}
                  <div className="flex flex-col gap-1">
                    <label className="text-xs font-medium text-foreground">Atanan Geliştirici</label>
                    <select
                      value={assigneeId}
                      onChange={(e) => setAssigneeId(e.target.value)}
                      className="h-9 w-full rounded-md border border-input bg-card px-2.5 text-xs focus:outline-none focus:ring-1 focus:ring-primary cursor-pointer"
                    >
                      <option value="">Atanmamış</option>
                      {users.map((u) => (
                        <option key={u.id} value={u.id}>{u.fullName} ({u.username})</option>
                      ))}
                    </select>
                  </div>

                  {/* Resolution note */}
                  <div className="flex flex-col gap-1">
                    <label className="text-xs font-medium text-foreground">Çözüm Notu</label>
                    <textarea
                      rows={2}
                      value={resolutionNoteText}
                      onChange={(e) => setResolutionNoteText(e.target.value)}
                      className="w-full rounded-md border border-input bg-transparent px-2.5 py-1.5 text-xs placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                      placeholder="Hatanın nasıl giderildiğini yazın..."
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={updating}
                    className="flex h-9 w-full items-center justify-center gap-1.5 rounded-md bg-primary text-primary-foreground text-xs font-semibold hover:bg-primary/95 disabled:opacity-50 cursor-pointer transition-all"
                  >
                    {updating ? (
                      <>
                        <Loader2 size={12} className="animate-spin" />
                        Kaydediliyor...
                      </>
                    ) : (
                      "Bilgileri Güncelle"
                    )}
                  </button>
                </form>

                {/* Internal comments / Developer notes */}
                <div className="border-t border-border pt-4 space-y-3">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1">
                    <MessageSquare size={12} />
                    Geliştirici Notları / İç Yorumlar ({selectedTicket.internalComments?.length || 0})
                  </h4>

                  {/* Yorumlar Listesi */}
                  <div className="space-y-2 max-h-[180px] overflow-y-auto text-[11px] pr-1">
                    {(!selectedTicket.internalComments || selectedTicket.internalComments.length === 0) ? (
                      <p className="text-muted-foreground italic text-center py-2">Dahili yorum henüz eklenmemiş.</p>
                    ) : (
                      selectedTicket.internalComments.map((comment) => (
                        <div key={comment.id} className="p-2.5 bg-muted/40 border border-border rounded-lg leading-normal">
                          <div className="flex justify-between font-bold text-foreground mb-0.5">
                            <span>{comment.fullName}</span>
                            <span className="font-normal text-[9px] text-muted-foreground">
                              {new Date(comment.createdAt).toLocaleDateString()} {new Date(comment.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </span>
                          </div>
                          <p className="text-muted-foreground break-all">{comment.comment}</p>
                        </div>
                      ))
                    )}
                  </div>

                  {/* Yorum Ekle Formu */}
                  <form onSubmit={handleAddComment} className="flex gap-1.5">
                    <input
                      type="text"
                      placeholder="Yalnızca geliştiricilerin göreceği not..."
                      value={newComment}
                      onChange={(e) => setNewComment(e.target.value)}
                      className="flex-1 h-8 rounded-md border border-input bg-transparent px-2.5 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-primary"
                    />
                    <button
                      type="submit"
                      disabled={!newComment.trim()}
                      className="flex h-8 w-8 items-center justify-center rounded-md bg-primary text-primary-foreground hover:bg-primary/95 disabled:opacity-50 cursor-pointer shrink-0 transition-colors"
                      title="Yorum Gönder"
                    >
                      <Send size={12} />
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
