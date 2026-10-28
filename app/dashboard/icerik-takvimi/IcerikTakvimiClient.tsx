"use client"

import { useState, useEffect, useCallback, useMemo, useRef } from "react"
import { useAuth } from "@/lib/auth/context"
import { toast } from "sonner"
import {
  ChevronLeft, ChevronRight, Plus, Filter, Search, Calendar,
  List, Grid3X3, Clock, Camera, Edit3, CheckCircle2, XCircle,
  AlertCircle, CalendarCheck2, Loader2, RefreshCw, SlidersHorizontal,
  LayoutGrid, Columns3, Users, Building2, Instagram, Youtube,
  Facebook, Linkedin, X, Globe, Video, Image as ImageIcon,
  FileText, TrendingUp, Eye, ChevronDown, Tag, MoreHorizontal, Upload,
  Download
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select"
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuSeparator, DropdownMenuTrigger, DropdownMenuLabel,
} from "@/components/ui/dropdown-menu"
import ContentItemModal from "./components/ContentItemModal"
import ContentDetailPanel from "./components/ContentDetailPanel"
import ShootModal from "./components/ShootModal"
import WorkloadDashboard from "./components/WorkloadDashboard"
import { MonthlyCalendarPDFTemplate } from "./components/MonthlyCalendarPDFTemplate"

import {
  ContentItem, ProductionShoot, STATUS_META, PLATFORM_META, CONTENT_TYPE_LABELS
} from "./shared-types"

// ─── SABİTLER ─────────────────────────────────────────────────────────

const TURKISH_MONTHS = [
  "Ocak","Şubat","Mart","Nisan","Mayıs","Haziran",
  "Temmuz","Ağustos","Eylül","Ekim","Kasım","Aralık"
]
const TURKISH_DAYS = ["Pzt","Sal","Çar","Per","Cum","Cmt","Paz"]

type ViewMode = "month" | "week" | "list" | "reports"

// ─── YARDIMCI FONKSİYONLAR ────────────────────────────────────────────

function getMonthDays(year: number, month: number): Date[] {
  const firstDay = new Date(year, month, 1)
  const lastDay = new Date(year, month + 1, 0)

  // Pazartesi'den başla
  let startDow = firstDay.getDay() // 0=Pazar
  startDow = startDow === 0 ? 6 : startDow - 1 // 0=Pzt

  const days: Date[] = []
  for (let i = startDow; i > 0; i--) {
    days.push(new Date(year, month, 1 - i))
  }
  for (let d = 1; d <= lastDay.getDate(); d++) {
    days.push(new Date(year, month, d))
  }
  while (days.length % 7 !== 0) {
    days.push(new Date(year, month + 1, days.length - lastDay.getDate() - startDow + 1))
  }
  return days
}

function getWeekDays(anchor: Date): Date[] {
  const dow = anchor.getDay()
  const mondayOffset = dow === 0 ? -6 : 1 - dow
  const monday = new Date(anchor)
  monday.setDate(anchor.getDate() + mondayOffset)
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(monday)
    d.setDate(monday.getDate() + i)
    return d
  })
}

function isSameDay(a: Date, b: Date) {
  return a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
}

function formatDateKey(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`
}

// ─── ANA BİLEŞEN ──────────────────────────────────────────────────────

export default function IcerikTakvimiClient() {
  const { session, currentBranch, userBranches } = useAuth()

  // Durum
  const [items, setItems] = useState<ContentItem[]>([])
  const [shoots, setShoots] = useState<ProductionShoot[]>([])
  const [loading, setLoading] = useState(true)
  const [viewMode, setViewMode] = useState<ViewMode>("month")
  const [currentDate, setCurrentDate] = useState(new Date())

  // PDF Export States & Ref
  const [pdfLoading, setPdfLoading] = useState(false)
  const [pdfItems, setPdfItems] = useState<ContentItem[]>([])
  const pdfRef = useRef<HTMLDivElement>(null)

  // Filtreler
  const [selectedBranchId, setSelectedBranchId] = useState<string>("all")
  const [statusFilter, setStatusFilter] = useState("all")
  const [platformFilter, setPlatformFilter] = useState("all")
  const [contentTypeFilter, setContentTypeFilter] = useState("all")
  const [assignedToFilter, setAssignedToFilter] = useState("all")
  const [searchQuery, setSearchQuery] = useState("")
  const [showShoots, setShowShoots] = useState(true)

  // Modallar
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [showShootModal, setShowShootModal] = useState(false)
  const [selectedItem, setSelectedItem] = useState<ContentItem | null>(null)
  const [selectedDate, setSelectedDate] = useState<Date | null>(null)
  const [detailPanelOpen, setDetailPanelOpen] = useState(false)
  const [selectedShoot, setSelectedShoot] = useState<ProductionShoot | null>(null)

  // Kullanıcı listesi (atama için)
  const [users, setUsers] = useState<{ id: string; fullName: string; position?: string; department?: string; branches?: { branchId: string; roleName: string }[] }[]>([])

  // ─── VERİ YÜKLEME ───────────────────────────────────────────────────

  const fetchData = useCallback(async () => {
    setLoading(true)
    try {
      // Tarih aralığı — görünüme göre belirle
      let fromDate: Date
      let toDate: Date

      if (viewMode === "month") {
        fromDate = new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1)
        toDate = new Date(currentDate.getFullYear(), currentDate.getMonth() + 2, 0)
      } else if (viewMode === "week") {
        const weekDays = getWeekDays(currentDate)
        fromDate = weekDays[0]
        toDate = weekDays[6]
      } else {
        // Liste: 3 aylık aralık
        fromDate = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1)
        toDate = new Date(currentDate.getFullYear(), currentDate.getMonth() + 3, 0)
      }

      const params = new URLSearchParams({
        from: fromDate.toISOString(),
        to: toDate.toISOString(),
      })
      if (selectedBranchId !== "all") params.set("branchId", selectedBranchId)
      if (statusFilter !== "all") params.set("status", statusFilter)
      if (platformFilter !== "all") params.set("platform", platformFilter)
      if (contentTypeFilter !== "all") params.set("contentType", contentTypeFilter)
      if (assignedToFilter !== "all") params.set("assignedTo", assignedToFilter)
      if (searchQuery.trim()) params.set("search", searchQuery.trim())

      const [itemsRes, shootsRes] = await Promise.all([
        fetch(`/api/icerik-takvimi?${params}`),
        fetch(`/api/icerik-takvimi/cekim?${params}`),
      ])

      if (itemsRes.ok) {
        const data = await itemsRes.json()
        setItems(Array.isArray(data) ? data : [])
      }
      if (shootsRes.ok) {
        const data = await shootsRes.json()
        setShoots(Array.isArray(data) ? data : [])
      }
    } catch {
      toast.error("Veriler yüklenirken bir hata oluştu")
    } finally {
      setLoading(false)
    }
  }, [viewMode, currentDate, selectedBranchId, statusFilter, platformFilter, contentTypeFilter, searchQuery, assignedToFilter])

  const fetchUsers = useCallback(async () => {
    try {
      const res = await fetch("/api/users")
      if (res.ok) {
        const json = await res.json()
        const usersList = json.data || (Array.isArray(json) ? json : [])
        setUsers(usersList)
      }
    } catch {}
  }, [])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  useEffect(() => {
    fetchUsers()
  }, [fetchUsers])

  // ─── PDF DIŞA AKTARMA FONKSİYONU ────────────────────────────────────
  const handleExportPDF = async () => {
    if (selectedBranchId === "all") {
      toast.warning("Lütfen PDF çıktısı almak için önce bir firma seçin.")
      return
    }

    const selectedBranch = userBranches.find((b) => b.id === selectedBranchId)
    if (!selectedBranch) {
      toast.error("Seçili firma bulunamadı.")
      return
    }

    setPdfLoading(true)
    try {
      const year = currentDate.getFullYear()
      const month = currentDate.getMonth()
      const calendarDays = getMonthDays(year, month)
      const fromDate = calendarDays[0]
      const toDate = calendarDays[calendarDays.length - 1]

      const params = new URLSearchParams({
        from: fromDate.toISOString(),
        to: toDate.toISOString(),
        branchId: selectedBranchId,
      })

      const res = await fetch(`/api/icerik-takvimi?${params}`)
      if (!res.ok) throw new Error("İçerik verileri yüklenemedi")

      const fetchedItems: ContentItem[] = await res.json()
      setPdfItems(fetchedItems)

      // React DOM'un güncellenmesi için yarım saniye beklet
      await new Promise((resolve) => setTimeout(resolve, 500))

      if (!pdfRef.current) {
        throw new Error("PDF şablonu bulunamadı")
      }

      // @ts-ignore
      const html2canvasPro = (await import("html2canvas-pro")).default
      // @ts-ignore
      const { jsPDF } = await import("jspdf")

      const canvas = await html2canvasPro(pdfRef.current, {
        scale: 2.5,
        useCORS: true,
        logging: false,
        backgroundColor: "#f3f4f5"
      })

      const imgData = canvas.toDataURL("image/jpeg", 1.0)
      const pdf = new jsPDF({
        orientation: "landscape",
        unit: "mm",
        format: "a4"
      })

      pdf.addImage(imgData, "JPEG", 0, 0, 297, 210)
      
      // Add vendor watermark/footer badge
      pdf.setFont("helvetica", "normal")
      pdf.setFontSize(8)
      pdf.setTextColor(120, 120, 120)
      pdf.text("Generated via Sunum ERP System", 10, 206)

      pdf.save(`${selectedBranch.name}_${TURKISH_MONTHS[month]}_${year}_Icerik_Takvimi.pdf`)
      toast.success("PDF başarıyla oluşturuldu ve indirildi.")
    } catch (err: any) {
      console.error("PDF export error:", err)
      toast.error("PDF oluşturulurken bir hata oluştu: " + (err.message || err))
    } finally {
      setPdfLoading(false)
    }
  }

  // ─── GÜN BAZLI VERİ HARİTASI ────────────────────────────────────────

  const itemsByDay = useMemo(() => {
    const map = new Map<string, ContentItem[]>()
    for (const item of items) {
      const key = formatDateKey(new Date(item.scheduledDate))
      if (!map.has(key)) map.set(key, [])
      map.get(key)!.push(item)
    }
    return map
  }, [items])

  const shootsByDay = useMemo(() => {
    const map = new Map<string, ProductionShoot[]>()
    for (const shoot of shoots) {
      const key = formatDateKey(new Date(shoot.shootDate))
      if (!map.has(key)) map.set(key, [])
      map.get(key)!.push(shoot)
    }
    return map
  }, [shoots])

  // ─── ÖZET İSTATİSTİKLER ─────────────────────────────────────────────

  const todayStats = useMemo(() => {
    const todayKey = formatDateKey(new Date())
    const todayItems = itemsByDay.get(todayKey) || []
    const todayShoots = shootsByDay.get(todayKey) || []
    return {
      total: todayItems.length,
      shoots: todayShoots.length,
      pending: items.filter((i) => i.status === "pending_approval").length,
      published: items.filter((i) => i.status === "published").length,
    }
  }, [items, shoots, itemsByDay, shootsByDay])

  // ─── NAVİGASYON ─────────────────────────────────────────────────────

  const navigatePrev = () => {
    const d = new Date(currentDate)
    if (viewMode === "month") d.setMonth(d.getMonth() - 1)
    else if (viewMode === "week") d.setDate(d.getDate() - 7)
    else d.setMonth(d.getMonth() - 1)
    setCurrentDate(d)
  }

  const navigateNext = () => {
    const d = new Date(currentDate)
    if (viewMode === "month") d.setMonth(d.getMonth() + 1)
    else if (viewMode === "week") d.setDate(d.getDate() + 7)
    else d.setMonth(d.getMonth() + 1)
    setCurrentDate(d)
  }

  const navigateTitle = useMemo(() => {
    if (viewMode === "month") {
      return `${TURKISH_MONTHS[currentDate.getMonth()]} ${currentDate.getFullYear()}`
    } else if (viewMode === "week") {
      const days = getWeekDays(currentDate)
      const first = days[0]
      const last = days[6]
      if (first.getMonth() === last.getMonth()) {
        return `${first.getDate()}–${last.getDate()} ${TURKISH_MONTHS[first.getMonth()]} ${first.getFullYear()}`
      }
      return `${first.getDate()} ${TURKISH_MONTHS[first.getMonth()]} – ${last.getDate()} ${TURKISH_MONTHS[last.getMonth()]}`
    }
    return `${TURKISH_MONTHS[currentDate.getMonth()]} ${currentDate.getFullYear()}`
  }, [viewMode, currentDate])

  // ─── RENDER ─────────────────────────────────────────────────────────

  return (
    <div className="flex flex-col h-full min-h-screen bg-background">
      {/* ── BAŞLIK VE ARAÇ ÇUBUĞU ── */}
      <div className="sticky top-0 z-20 bg-background/95 backdrop-blur border-b border-border">
        <div className="flex flex-col gap-3 px-4 pt-4 pb-3">
          {/* Üst satır: başlık + aksiyonlar */}
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <div className="flex items-center gap-3">
              <div className="flex items-center justify-center w-9 h-9 rounded-xl bg-primary/10">
                <CalendarCheck2 size={20} className="text-primary" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h1 className="text-xl font-semibold leading-none">İçerik Takvimi</h1>
                  {process.env.NEXT_PUBLIC_USE_MOCK_DATA === "true" && (
                    <Badge variant="outline" className="bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400 border-amber-200 animate-pulse text-[10px] py-0.5 px-1.5 font-medium rounded-full shrink-0">
                      ⚠️ Demo Modu Aktif
                    </Badge>
                  )}
                </div>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {items.length} içerik · {shoots.length} çekim
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              <Button
                variant="outline"
                size="sm"
                onClick={fetchData}
                disabled={loading}
                className="gap-1.5"
              >
                <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
                {loading ? "Yükleniyor..." : "Yenile"}
              </Button>

              <Button
                size="sm"
                variant="outline"
                onClick={() => setShowShootModal(true)}
                className="gap-1.5"
              >
                <Camera size={14} />
                Çekim Ekle
              </Button>

              <Button
                size="sm"
                variant="outline"
                onClick={handleExportPDF}
                disabled={pdfLoading}
                className="gap-1.5"
              >
                {pdfLoading ? (
                  <Loader2 size={14} className="animate-spin" />
                ) : (
                  <Download size={14} />
                )}
                {pdfLoading ? "Hazırlanıyor..." : "PDF Aktar"}
              </Button>

              <Button
                size="sm"
                onClick={() => { setSelectedItem(null); setShowCreateModal(true) }}
                className="gap-1.5"
              >
                <Plus size={14} />
                İçerik Ekle
              </Button>
            </div>
          </div>

          {/* Filtreler satırı */}
          <div className="flex items-center gap-2 flex-wrap">
            {/* Firma seçici */}
            <Select value={selectedBranchId} onValueChange={setSelectedBranchId}>
              <SelectTrigger className="h-8 w-44 text-xs">
                <Building2 size={12} className="mr-1 shrink-0 text-muted-foreground" />
                <SelectValue placeholder="Tüm Firmalar" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tüm Firmalar</SelectItem>
                {userBranches.map((b) => (
                  <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* Durum filtresi */}
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="h-8 w-40 text-xs">
                <SelectValue placeholder="Tüm Durumlar" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tüm Durumlar</SelectItem>
                {Object.entries(STATUS_META).map(([k, v]) => (
                  <SelectItem key={k} value={k}>{v.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* Platform filtresi */}
            <Select value={platformFilter} onValueChange={setPlatformFilter}>
              <SelectTrigger className="h-8 w-36 text-xs">
                <SelectValue placeholder="Tüm Platformlar" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tüm Platformlar</SelectItem>
                {Object.entries(PLATFORM_META).map(([k, v]) => (
                  <SelectItem key={k} value={k}>{v.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* İçerik tipi */}
            <Select value={contentTypeFilter} onValueChange={setContentTypeFilter}>
              <SelectTrigger className="h-8 w-36 text-xs">
                <SelectValue placeholder="Tüm Tipler" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tüm Tipler</SelectItem>
                {Object.entries(CONTENT_TYPE_LABELS).map(([k, v]) => (
                  <SelectItem key={k} value={k}>{v}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* Sorumlu Filtresi */}
            <Select value={assignedToFilter} onValueChange={setAssignedToFilter}>
              <SelectTrigger className="h-8 w-40 text-xs">
                <SelectValue placeholder="Tüm Çalışanlar" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tüm Çalışanlar</SelectItem>
                {users.map((u) => (
                  <SelectItem key={u.id} value={u.id}>{u.fullName}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* Arama */}
            <div className="relative">
              <Search size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Ara..."
                className="h-8 pl-8 w-40 text-xs"
              />
            </div>

            {/* Çekim göster/gizle */}
            <Button
              size="sm"
              variant={showShoots ? "secondary" : "ghost"}
              className="h-8 gap-1.5 text-xs"
              onClick={() => setShowShoots(!showShoots)}
            >
              <Camera size={12} />
              Çekimler {showShoots ? "✓" : ""}
            </Button>
          </div>
        </div>

        {/* ── TAKVİM NAVİGASYONU ── */}
        <div className="flex items-center justify-between px-4 py-2 border-t border-border/50">
          <div className="flex items-center gap-1">
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={navigatePrev}>
              <ChevronLeft size={16} />
            </Button>
            <Button variant="ghost" size="sm" className="h-8 px-3 font-medium" onClick={() => setCurrentDate(new Date())}>
              Bugün
            </Button>
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={navigateNext}>
              <ChevronRight size={16} />
            </Button>
            <span className="ml-2 text-sm font-semibold">{navigateTitle}</span>
          </div>

          <div className="flex items-center gap-1 bg-muted/50 rounded-lg p-1">
            {(["month", "week", "list", "reports"] as const).map((mode) => (
              <Button
                key={mode}
                variant={viewMode === mode ? "default" : "ghost"}
                size="sm"
                className="h-7 px-3 text-xs"
                onClick={() => setViewMode(mode)}
              >
                {mode === "month" ? <><Grid3X3 size={12} className="mr-1" />Ay</> :
                 mode === "week"  ? <><Columns3 size={12} className="mr-1" />Hafta</> :
                 mode === "list"  ? <><List size={12} className="mr-1" />Liste</> :
                                    <><TrendingUp size={12} className="mr-1" />Raporlar</>}
              </Button>
            ))}
          </div>
        </div>
      </div>

      {/* ── ÖZET DASHBOARD ── */}
      <div className="flex gap-3 px-4 py-3 border-b border-border/50 flex-wrap">
        {[
          { label: "Bugün Toplam", value: todayStats.total, color: "text-primary", icon: <Calendar size={14} /> },
          { label: "Bugün Çekim", value: todayStats.shoots, color: "text-amber-500", icon: <Camera size={14} /> },
          { label: "Onay Bekleyen", value: todayStats.pending, color: "text-violet-500", icon: <AlertCircle size={14} /> },
          { label: "Bu Ay Yayınlanan", value: todayStats.published, color: "text-emerald-500", icon: <CheckCircle2 size={14} /> },
        ].map((stat) => (
          <div key={stat.label} className="flex items-center gap-2 bg-muted/40 rounded-lg px-3 py-2 min-w-[120px]">
            <span className={stat.color}>{stat.icon}</span>
            <div>
              <div className={`text-lg font-bold leading-none ${stat.color}`}>{stat.value}</div>
              <div className="text-[10px] text-muted-foreground leading-tight mt-0.5">{stat.label}</div>
            </div>
          </div>
        ))}
      </div>

      {/* ── TAKVİM GÖRÜNÜMLERİ ── */}
      <div className="flex-1 overflow-auto">
        {loading && viewMode !== "reports" ? (
          <div className="flex items-center justify-center h-64">
            <Loader2 size={32} className="animate-spin text-muted-foreground" />
          </div>
        ) : viewMode === "month" ? (
          <MonthView
            currentDate={currentDate}
            itemsByDay={itemsByDay}
            shootsByDay={shootsByDay}
            showShoots={showShoots}
            onDayClick={(date) => {
              setSelectedDate(date)
              setShowCreateModal(true)
            }}
            onItemClick={(item) => {
              setSelectedItem(item)
              setDetailPanelOpen(true)
            }}
            onShootClick={(shoot) => {
              setSelectedShoot(shoot)
              setShowShootModal(true)
            }}
          />
        ) : viewMode === "week" ? (
          <WeekView
            currentDate={currentDate}
            itemsByDay={itemsByDay}
            shootsByDay={shootsByDay}
            showShoots={showShoots}
            onDayClick={(date) => {
              setSelectedDate(date)
              setShowCreateModal(true)
            }}
            onItemClick={(item) => {
              setSelectedItem(item)
              setDetailPanelOpen(true)
            }}
            onShootClick={(shoot) => {
              setSelectedShoot(shoot)
              setShowShootModal(true)
            }}
          />
        ) : viewMode === "list" ? (
          <ListView
            items={items}
            shoots={shoots}
            showShoots={showShoots}
            onItemClick={(item) => {
              setSelectedItem(item)
              setDetailPanelOpen(true)
            }}
            onShootClick={(shoot) => {
              setSelectedShoot(shoot)
              setShowShootModal(true)
            }}
          />
        ) : (
          <WorkloadDashboard branchId={selectedBranchId} />
        )}
      </div>

      {/* ── MODALLAR ── */}
      {showCreateModal && (
        <ContentItemModal
          open={showCreateModal}
          initialDate={selectedDate}
          initialBranchId={selectedBranchId !== "all" ? selectedBranchId : currentBranch?.id}
          editItem={null}
          users={users}
          branches={userBranches}
          onClose={() => { setShowCreateModal(false); setSelectedDate(null) }}
          onSaved={() => { setShowCreateModal(false); setSelectedDate(null); fetchData() }}
        />
      )}

      {showShootModal && (
        <ShootModal
          open={showShootModal}
          initialBranchId={selectedBranchId !== "all" ? selectedBranchId : currentBranch?.id}
          users={users}
          branches={userBranches}
          contentItems={items}
          editShoot={selectedShoot}
          onClose={() => { setShowShootModal(false); setSelectedShoot(null) }}
          onSaved={() => { setShowShootModal(false); setSelectedShoot(null); fetchData() }}
        />
      )}

      {detailPanelOpen && selectedItem && (
        <ContentDetailPanel
          item={selectedItem}
          users={users}
          open={detailPanelOpen}
          onClose={() => { setDetailPanelOpen(false); setSelectedItem(null) }}
          onUpdated={(updated: ContentItem) => {
            setItems((prev) => prev.map((i) => i.id === updated.id ? updated : i))
            setSelectedItem(updated)
          }}
          onDeleted={() => {
            setItems((prev) => prev.filter((i) => i.id !== selectedItem.id))
            setDetailPanelOpen(false)
            setSelectedItem(null)
          }}
          onEditShoot={(shoot: any) => {
            setDetailPanelOpen(false)
            setSelectedItem(null)
            setSelectedShoot(shoot)
            setShowShootModal(true)
          }}
        />
      )}

      {/* Invisible PDF container for html2pdf capture */}
      <div style={{ position: "fixed", top: 0, left: 0, opacity: 0, zIndex: -50, pointerEvents: "none" }}>
        <div
          ref={pdfRef}
          style={{
            width: "297mm",
            height: "210mm",
            boxSizing: "border-box",
            overflow: "hidden"
          }}
        >
          {selectedBranchId !== "all" && (
            <MonthlyCalendarPDFTemplate
              branch={userBranches.find((b) => b.id === selectedBranchId)}
              items={pdfItems}
              currentDate={currentDate}
            />
          )}
        </div>
      </div>
    </div>
  )
}

// ─── AY GÖRÜNÜMÜ ──────────────────────────────────────────────────────

function MonthView({
  currentDate, itemsByDay, shootsByDay, showShoots,
  onDayClick, onItemClick, onShootClick,
}: {
  currentDate: Date
  itemsByDay: Map<string, ContentItem[]>
  shootsByDay: Map<string, ProductionShoot[]>
  showShoots: boolean
  onDayClick: (date: Date) => void
  onItemClick: (item: ContentItem) => void
  onShootClick: (shoot: ProductionShoot) => void
}) {
  const days = getMonthDays(currentDate.getFullYear(), currentDate.getMonth())
  const today = new Date()

  return (
    <div className="px-3 py-3 overflow-x-auto">
      <div className="min-w-[650px]">
        {/* Gün başlıkları */}
        <div className="grid grid-cols-7 mb-1">
        {TURKISH_DAYS.map((d) => (
          <div key={d} className="text-center text-[11px] font-medium text-muted-foreground py-1.5">
            {d}
          </div>
        ))}
      </div>

      {/* Günler */}
      <div className="grid grid-cols-7 gap-px bg-border rounded-xl overflow-hidden">
        {days.map((day, idx) => {
          const key = formatDateKey(day)
          const dayItems = itemsByDay.get(key) || []
          const dayShoots = shootsByDay.get(key) || []
          const isToday = isSameDay(day, today)
          const isCurrentMonth = day.getMonth() === currentDate.getMonth()
          const hasContent = dayItems.length > 0 || (showShoots && dayShoots.length > 0)

          return (
            <div
              key={idx}
              className={[
                "min-h-[110px] bg-background p-1.5 cursor-pointer group transition-colors",
                "hover:bg-muted/40",
                !isCurrentMonth ? "opacity-40" : "",
              ].join(" ")}
              onClick={() => onDayClick(day)}
            >
              {/* Gün numarası */}
              <div className="flex items-center justify-between mb-1">
                <span className={[
                  "text-xs font-medium w-6 h-6 flex items-center justify-center rounded-full",
                  isToday ? "bg-primary text-primary-foreground" : "text-foreground",
                ].join(" ")}>
                  {day.getDate()}
                </span>
                {hasContent && (
                  <span className="text-[9px] text-muted-foreground group-hover:text-foreground transition-colors">
                    +Ekle
                  </span>
                )}
              </div>

              {/* Çekim rozetleri */}
              {showShoots && dayShoots.map((shoot) => (
                <div
                  key={shoot.id}
                  className="mb-0.5 px-1.5 py-0.5 rounded text-[10px] font-medium bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-300 flex items-center gap-1 truncate cursor-pointer hover:opacity-85"
                  onClick={(e) => { e.stopPropagation(); onShootClick(shoot) }}
                >
                  <Camera size={9} />
                  <span className="truncate">{shoot.branch.name}</span>
                </div>
              ))}

              {/* İçerik rozetleri (maksimum 3, fazlası +N) */}
              {dayItems.slice(0, 3).map((item) => {
                const statusM = STATUS_META[item.status] || STATUS_META.draft
                const branchColor = item.branch.themeColor || "#3B82F6"
                return (
                  <div
                    key={item.id}
                    className={`mb-0.5 px-1.5 py-0.5 rounded text-[10px] font-medium truncate flex items-center gap-1 cursor-pointer hover:opacity-80 transition-opacity ${statusM.bg} ${statusM.color}`}
                    onClick={(e) => { e.stopPropagation(); onItemClick(item) }}
                    title={item.title}
                  >
                    <span
                      className="w-1.5 h-1.5 rounded-full shrink-0"
                      style={{ backgroundColor: branchColor }}
                    />
                    <span className="truncate">{item.title}</span>
                  </div>
                )
              })}
              {dayItems.length > 3 && (
                <div className="text-[10px] text-muted-foreground pl-1">
                  +{dayItems.length - 3} daha
                </div>
              )}
            </div>
          )
        })}
      </div>
      </div>
    </div>
  )
}

// ─── HAFTA GÖRÜNÜMÜ ────────────────────────────────────────────────────

function WeekView({
  currentDate, itemsByDay, shootsByDay, showShoots,
  onDayClick, onItemClick, onShootClick,
}: {
  currentDate: Date
  itemsByDay: Map<string, ContentItem[]>
  shootsByDay: Map<string, ProductionShoot[]>
  showShoots: boolean
  onDayClick: (date: Date) => void
  onItemClick: (item: ContentItem) => void
  onShootClick: (shoot: ProductionShoot) => void
}) {
  const days = getWeekDays(currentDate)
  const today = new Date()

  return (
    <div className="px-3 py-3 overflow-x-auto">
      <div className="min-w-[650px] grid grid-cols-7 gap-2">
        {days.map((day, idx) => {
          const key = formatDateKey(day)
          const dayItems = itemsByDay.get(key) || []
          const dayShoots = shootsByDay.get(key) || []
          const isToday = isSameDay(day, today)

          return (
            <div key={idx} className="flex flex-col gap-1">
              {/* Başlık */}
              <div
                className={[
                  "text-center py-2 rounded-lg cursor-pointer transition-colors hover:bg-muted",
                  isToday ? "bg-primary/10" : "",
                ].join(" ")}
                onClick={() => onDayClick(day)}
              >
                <div className="text-[10px] text-muted-foreground">{TURKISH_DAYS[idx]}</div>
                <div className={[
                  "text-sm font-bold mt-0.5",
                  isToday ? "text-primary" : "text-foreground",
                ].join(" ")}>
                  {day.getDate()}
                </div>
              </div>

              {/* Çekimler */}
              {showShoots && dayShoots.map((shoot) => (
                <div
                  key={shoot.id}
                  className="p-2 rounded-lg bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 cursor-pointer hover:opacity-80 transition-opacity"
                  onClick={(e) => { e.stopPropagation(); onShootClick(shoot) }}
                >
                  <div className="flex items-center gap-1 text-amber-700 dark:text-amber-400 text-[10px] font-semibold mb-1">
                    <Camera size={10} />
                    Çekim
                  </div>
                  <div className="text-[10px] text-amber-600 dark:text-amber-300 truncate">{shoot.branch.name}</div>
                  {shoot.location && <div className="text-[9px] text-muted-foreground truncate">{shoot.location}</div>}
                </div>
              ))}

              {/* İçerikler */}
              {dayItems.map((item) => {
                const statusM = STATUS_META[item.status] || STATUS_META.draft
                return (
                  <div
                    key={item.id}
                    className={`p-2 rounded-lg border cursor-pointer hover:opacity-80 transition-opacity ${statusM.bg}`}
                    style={{ borderColor: item.branch.themeColor + "40" }}
                    onClick={() => onItemClick(item)}
                  >
                    <div className="flex items-center gap-1 mb-1">
                      <span
                        className="w-2 h-2 rounded-full shrink-0"
                        style={{ backgroundColor: item.branch.themeColor }}
                      />
                      <span className={`text-[10px] font-medium ${statusM.color}`}>{statusM.label}</span>
                    </div>
                    <div className="text-[11px] font-medium text-foreground truncate">{item.title}</div>
                    <div className="text-[9px] text-muted-foreground truncate mt-0.5">{item.branch.name}</div>
                    {item.scheduledTime && (
                      <div className="text-[9px] text-muted-foreground flex items-center gap-0.5 mt-0.5">
                        <Clock size={8} /> {item.scheduledTime}
                      </div>
                    )}
                    {/* Platform ikonları */}
                    <div className="flex gap-0.5 mt-1 flex-wrap">
                      {item.platforms.slice(0, 3).map((p) => (
                        <span key={p} className="text-muted-foreground" title={PLATFORM_META[p]?.label}>
                          {PLATFORM_META[p]?.icon}
                        </span>
                      ))}
                    </div>
                  </div>
                )
              })}

              {dayItems.length === 0 && dayShoots.length === 0 && (
                <button
                  className="h-16 rounded-lg border-2 border-dashed border-border text-muted-foreground text-[10px] hover:border-primary/40 hover:text-primary/60 transition-colors"
                  onClick={() => onDayClick(day)}
                >
                  + Ekle
                </button>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ─── LİSTE GÖRÜNÜMÜ ────────────────────────────────────────────────────

function ListView({
  items, shoots, showShoots, onItemClick, onShootClick,
}: {
  items: ContentItem[]
  shoots: ProductionShoot[]
  showShoots: boolean
  onItemClick: (item: ContentItem) => void
  onShootClick: (shoot: ProductionShoot) => void
}) {
  // Günlere göre grupla
  const grouped = useMemo(() => {
    const map = new Map<string, { items: ContentItem[]; shoots: ProductionShoot[] }>()

    for (const item of items) {
      const key = formatDateKey(new Date(item.scheduledDate))
      if (!map.has(key)) map.set(key, { items: [], shoots: [] })
      map.get(key)!.items.push(item)
    }

    if (showShoots) {
      for (const shoot of shoots) {
        const key = formatDateKey(new Date(shoot.shootDate))
        if (!map.has(key)) map.set(key, { items: [], shoots: [] })
        map.get(key)!.shoots.push(shoot)
      }
    }

    return Array.from(map.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([key, data]) => ({ date: new Date(key + "T00:00:00"), ...data }))
  }, [items, shoots, showShoots])

  const today = new Date()

  if (grouped.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-64 text-muted-foreground gap-3">
        <CalendarCheck2 size={48} className="opacity-20" />
        <p className="text-sm">Bu dönemde içerik bulunamadı</p>
      </div>
    )
  }

  return (
    <div className="px-4 py-3 space-y-4 max-w-4xl mx-auto">
      {grouped.map(({ date, items: dayItems, shoots: dayShoots }) => {
        const isToday = isSameDay(date, today)
        const isPast = date < today && !isToday
        const dateLabel = date.toLocaleDateString("tr-TR", {
          weekday: "long", day: "numeric", month: "long",
        })

        return (
          <div key={formatDateKey(date)} className={isPast ? "opacity-70" : ""}>
            {/* Tarih başlığı */}
            <div className="flex items-center gap-3 mb-2">
              <div className={[
                "text-sm font-semibold",
                isToday ? "text-primary" : "text-foreground",
              ].join(" ")}>
                {isToday ? "Bugün — " : ""}{dateLabel}
              </div>
              <div className="flex-1 h-px bg-border" />
              <span className="text-xs text-muted-foreground">
                {dayItems.length} içerik{dayShoots.length > 0 ? ` · ${dayShoots.length} çekim` : ""}
              </span>
            </div>

            <div className="space-y-2">
              {/* Çekimler */}
              {dayShoots.map((shoot) => (
                <div
                  key={shoot.id}
                  className="flex items-start gap-3 p-3 rounded-xl bg-amber-50 dark:bg-amber-900/10 border border-amber-200 dark:border-amber-800/50 cursor-pointer hover:border-amber-300 transition-all"
                  onClick={() => onShootClick(shoot)}
                >
                  <div className="mt-0.5 text-amber-500">
                    <Camera size={16} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-medium text-sm">Çekim Günü</span>
                      <Badge variant="outline" className="text-[10px] border-amber-300 text-amber-600">
                        {shoot.status === "planned" ? "Planlandı" :
                         shoot.status === "shot" ? "Çekildi" :
                         shoot.status === "cancelled" ? "İptal" : shoot.status}
                      </Badge>
                    </div>
                    <div className="text-xs text-muted-foreground mt-0.5">{shoot.branch.name}</div>
                    {shoot.location && (
                      <div className="text-xs text-amber-600 mt-0.5">📍 {shoot.location}</div>
                    )}
                    {shoot.contentItems.length > 0 && (
                      <div className="text-xs text-muted-foreground mt-1">
                        {shoot.contentItems.length} içerik planlanıyor
                      </div>
                    )}
                  </div>
                  {shoot.shootTime && (
                    <div className="text-xs text-muted-foreground flex items-center gap-1">
                      <Clock size={11} /> {shoot.shootTime}
                    </div>
                  )}
                </div>
              ))}

              {/* İçerikler */}
              {dayItems.map((item) => {
                const statusM = STATUS_META[item.status] || STATUS_META.draft
                return (
                  <div
                    key={item.id}
                    className="flex items-start gap-3 p-3 rounded-xl bg-card border border-border hover:border-primary/30 hover:bg-muted/30 cursor-pointer transition-all group"
                    onClick={() => onItemClick(item)}
                  >
                    {/* Firma renk çizgisi */}
                    <div
                      className="w-1 self-stretch rounded-full shrink-0"
                      style={{ backgroundColor: item.branch.themeColor || "#3B82F6" }}
                    />

                    {/* Thumbnail */}
                    {item.media.length > 0 && (
                      <div className="w-12 h-12 rounded-lg bg-muted overflow-hidden shrink-0 border border-border">
                        {item.media[0].fileType === "image" ? (
                          <img
                            src={item.media[0].fileUrl}
                            alt={item.title}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-muted-foreground">
                            <Video size={18} />
                          </div>
                        )}
                      </div>
                    )}

                    {/* Detaylar */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start gap-2 justify-between">
                        <div className="min-w-0">
                          <div className="font-medium text-sm truncate">{item.title}</div>
                          <div className="text-xs text-muted-foreground">{item.branch.name}</div>
                        </div>
                        <div className="flex items-center gap-1.5 shrink-0">
                          <span className={`flex items-center gap-1 text-[10px] font-medium px-2 py-0.5 rounded-full ${statusM.bg} ${statusM.color}`}>
                            {statusM.icon}
                            {statusM.label}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-3 mt-1.5 flex-wrap">
                        {/* Saat */}
                        {item.scheduledTime && (
                          <span className="text-[10px] text-muted-foreground flex items-center gap-0.5">
                            <Clock size={10} /> {item.scheduledTime}
                          </span>
                        )}

                        {/* İçerik tipi */}
                        <span className="text-[10px] text-muted-foreground flex items-center gap-0.5">
                          <Tag size={10} /> {CONTENT_TYPE_LABELS[item.contentType] || item.contentType}
                        </span>

                        {/* Platform ikonları */}
                        <div className="flex gap-1 flex-wrap">
                          {item.platforms.map((p) => (
                            <span
                              key={p}
                              className="text-[10px] flex items-center gap-0.5 px-1.5 py-0.5 rounded bg-muted text-muted-foreground"
                              title={PLATFORM_META[p]?.label}
                            >
                              {PLATFORM_META[p]?.icon}
                              {PLATFORM_META[p]?.label}
                            </span>
                          ))}
                        </div>

                        {/* Medya sayısı */}
                        {item._count.media > 0 && (
                          <span className="text-[10px] text-muted-foreground flex items-center gap-0.5">
                            <ImageIcon size={10} /> {item._count.media} medya
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )
      })}
    </div>
  )
}
