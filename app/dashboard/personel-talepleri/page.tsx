"use client"

import { useState, useEffect } from "react"
import { useLanguage } from "@/lib/context/LanguageContext"
import {
  Plus, Search, Bell, Eye, Trash2, Calendar, Wallet, Laptop,
  Building, ShoppingCart, AlertCircle, CheckCircle2, XCircle, Clock,
  ChevronLeft, ChevronRight, Paperclip, Send, FolderClosed, ThumbsUp,
  ThumbsDown, ChevronDown, User, FileText, ArrowRight, CornerDownRight, X
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { cn } from "@/lib/utils"
import { isDemoModeActive, getMockData } from "@/lib/data-controller"

// Kategori Tanımları
const CATEGORIES = [
  { id: "finans", label: "Finans / Avans", icon: Wallet, color: "text-emerald-500 bg-emerald-500/10 border-emerald-500/20" },
  { id: "it", label: "IT / Donanım", icon: Laptop, color: "text-blue-500 bg-blue-500/10 border-blue-500/20" },
  { id: "ik", label: "İzinler / İK", icon: Calendar, color: "text-amber-500 bg-amber-500/10 border-amber-500/20" },
  { id: "ofis", label: "Ofis / Lojistik", icon: Building, color: "text-purple-500 bg-purple-500/10 border-purple-500/20" },
  { id: "satinalma", label: "Satın Alma", icon: ShoppingCart, color: "text-pink-500 bg-pink-500/10 border-pink-500/20" },
]

interface RequestItem {
  id: string
  title: string
  category: string
  summary: string
  description: string
  priority: "Normal" | "Acil" | "Kritik"
  status: "pending" | "approved" | "rejected" | "completed"
  createdAt: string
  updatedAt: string
  uploadedFiles: string[]
  approver: string
  requester: { name: string; avatarUrl: string | null; role: string }
  // Dinamik alanlar
  amount?: number
  reason?: string
  expectedDate?: string
  hardwareType?: string
  brandModel?: string
  leaveType?: string
  startDate?: string
  endDate?: string
  daysCount?: number
  proxyEmployee?: string
  // Karar detayları
  managerComment?: string
  itComment?: string
  decisionDate?: string
}

// Başlangıç Mock Verileri
const INITIAL_REQUESTS: RequestItem[] = [
  {
    id: "REQ-0432",
    title: "Sosyal Medya Lansman Etkinlik Harcamaları",
    category: "finans",
    summary: "Marka lansman lansman etkinliği bütçesi ve ikram avansı talebi.",
    description: "12 Temmuz tarihinde gerçekleştirilecek olan yeni sosyal medya lansman etkinliğinde kullanılmak üzere organizasyon, ikramlık ve basılı görsel harcamaları için avans ihtiyacı bulunmaktadır. Faturalar etkinlik sonrasında İK'ya teslim edilecektir.",
    priority: "Acil",
    status: "pending",
    createdAt: "2026-07-08T11:00:00Z",
    updatedAt: "2026-07-08T11:00:00Z",
    uploadedFiles: ["bütçe_tablosu.xlsx", "lansman_akisi.pdf"],
    approver: "Hakan Yılmaz (Operasyon Direktörü)",
    requester: { name: "Aylin Kaya", avatarUrl: null, role: "Sosyal Medya Takım Lideri" },
    amount: 15000,
    reason: "Proje Harcamaları",
    expectedDate: "2026-07-11",
  },
  {
    id: "REQ-0431",
    title: "Yıllık İzin Talebi - Temmuz Ortası",
    category: "ik",
    summary: "5 günlük yıllık izin kullanımı ve iş teslim planı.",
    description: "Yaz dönemi planlaması dahilinde 5 iş günü sürecek yıllık izin talebidir. İzin süresince acil işler için vekil olarak Melis Şen belirlenmiştir. Gerekli tüm müşteri briefleri ve takvimler planlanıp teslim edilmiştir.",
    priority: "Normal",
    status: "approved",
    createdAt: "2026-07-07T09:30:00Z",
    updatedAt: "2026-07-07T15:20:00Z",
    uploadedFiles: ["izin_devir_notlari.pdf"],
    approver: "Zeynep Demir (IK Müdürü)",
    requester: { name: "Cem Aslan", avatarUrl: null, role: "Kreatif Grup Lideri" },
    leaveType: "Yıllık İzin",
    startDate: "2026-07-20",
    endDate: "2026-07-24",
    daysCount: 5,
    proxyEmployee: "Melis Şen",
    managerComment: "İş planı kontrol edilmiştir, izin onaylanmıştır. İyi tatiller.",
    decisionDate: "2026-07-07T15:20:00Z",
  },
  {
    id: "REQ-0430",
    title: "Yaratıcı Ekip İçin Mac Studio Donanım Yükseltmesi",
    category: "it",
    summary: "3D Render ve Video Kurgu iş istasyonu talebi.",
    description: "Kreatif video ve render ekibinin artan 4K render yükünü karşılamak üzere Mac Studio (M2 Max, 64GB RAM) donanım yükseltmesi talep edilmektedir. Mevcut iMac'ler render sırasında kilitlenerek iş teslim sürelerini geciktirmektedir.",
    priority: "Kritik",
    status: "rejected",
    createdAt: "2026-07-06T08:15:00Z",
    updatedAt: "2026-07-06T17:40:00Z",
    uploadedFiles: ["donanim_teknik_karsilastirma.xlsx"],
    approver: "Ahmet Kurt (IT Departman Sorumlusu)",
    requester: { name: "Volkan Çelik", avatarUrl: null, role: "Video Production Manager" },
    hardwareType: "Masaüstü Bilgisayar (Workstation)",
    brandModel: "Apple Mac Studio M2 Max (64GB, 1TB SSD)",
    managerComment: "Bütçe sınırları nedeniyle bu çeyrekte yeni bilgisayar alımı yapılamamaktadır. Mevcut cihazın RAM kapasitesi IT birimi tarafından 32GB'a yükseltilecektir.",
    decisionDate: "2026-07-06T17:40:00Z",
  },
  {
    id: "REQ-0429",
    title: "Ortak Çalışma Alanı Ergonomik Sandalyeleri",
    category: "ofis",
    summary: "Tasarım ofisi ortak çalışma alanı için 6 adet çalışma sandalyesi.",
    description: "Ortak alanlarda saatlerce çalışan ajans personellerinin omurga sağlığı için yıpranmış taburelerin yerine 6 adet sırt destekli ergonomik çalışma sandalyesi satın alınması talebidir.",
    priority: "Normal",
    status: "completed",
    createdAt: "2026-07-01T10:00:00Z",
    updatedAt: "2026-07-04T11:30:00Z",
    uploadedFiles: ["teklif_proforma.pdf"],
    approver: "Mustafa Kaya (Satın Alma Sorumlusu)",
    requester: { name: "Gizem Kurt", avatarUrl: null, role: "Ofis Koordinatörü" },
    managerComment: "Sandalyeler teslim alınmış ve kurulmuştur.",
    decisionDate: "2026-07-04T11:30:00Z",
  }
]

export default function PersonelTalepleriPage() {
  const { t, tText } = useLanguage()
  const [requests, setRequests] = useState<RequestItem[]>([])

  useEffect(() => {
    if (isDemoModeActive()) {
      setRequests(getMockData("personel_talepleri"))
    } else {
      setRequests([])
    }
  }, [])

  const [searchQuery, setSearchQuery] = useState("")
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState("all")
  const [activeTab, setActiveTab] = useState<"my" | "approved-by-me">("my")
  const [page, setPage] = useState(1)
  const [requestsPerPage] = useState(5)

  // Carousel Carousel State
  const [carouselIndex, setCarouselIndex] = useState(0)

  // Drawer / Form State'leri
  const [formOpen, setFormOpen] = useState(false)
  const [formStep, setFormStep] = useState<1 | 2>(1)
  const [selectedFormCategory, setSelectedFormCategory] = useState<string | null>(null)
  
  // Form Alanları State
  const [formTitle, setFormTitle] = useState("")
  const [formDesc, setFormDesc] = useState("")
  const [formPriority, setFormPriority] = useState<"Normal" | "Acil" | "Kritik">("Normal")
  const [formFiles, setFormFiles] = useState<string[]>([])
  const [dragActive, setDragActive] = useState(false)

  // Kategoriye özel form alanları
  const [amount, setAmount] = useState("")
  const [reason, setReason] = useState("Proje Harcamaları")
  const [expectedDate, setExpectedDate] = useState("")
  const [hardwareType, setHardwareType] = useState("Dizüstü Bilgisayar (Laptop)")
  const [brandModel, setBrandModel] = useState("")
  const [leaveType, setLeaveType] = useState("Yıllık İzin")
  const [startDate, setStartDate] = useState("")
  const [endDate, setEndDate] = useState("")
  const [daysCount, setDaysCount] = useState(1)
  const [proxyEmployee, setProxyEmployee] = useState("")

  // Onaylama / Reddetme Detay Dialog State'leri
  const [detailItem, setDetailItem] = useState<RequestItem | null>(null)
  const [rejectOpen, setRejectOpen] = useState(false)
  const [rejectComment, setRejectComment] = useState("")
  const [approveOpen, setApproveOpen] = useState(false)
  const [approveComment, setApproveComment] = useState("")
  const [internalNote, setInternalNote] = useState("")

  // Başarı Animasyonu State
  const [successAnimation, setSuccessAnimation] = useState(false)

  // Gün hesaplama (İzin için)
  useEffect(() => {
    if (startDate && endDate) {
      const start = new Date(startDate)
      const end = new Date(endDate)
      const diffTime = Math.abs(end.getTime() - start.getTime())
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1
      setDaysCount(isNaN(diffDays) ? 1 : diffDays)
    }
  }, [startDate, endDate])

  // İstatistik Hesaplamaları
  const pendingRequestsCount = requests.filter((r) => r.status === "pending").length
  const monthlyExpensesSum = requests
    .filter((r) => r.category === "finans" && r.status !== "rejected")
    .reduce((sum, r) => sum + (r.amount ?? 0), 0)
  const totalOpenRequests = requests.filter((r) => r.status === "pending" || r.status === "approved").length

  // Arama ve Filtreleme
  const filteredRequests = requests.filter((req) => {
    const matchesSearch =
      req.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
      req.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      req.description.toLowerCase().includes(searchQuery.toLowerCase())
    
    const matchesCategory =
      selectedCategoryFilter === "all" || req.category === selectedCategoryFilter

    return matchesSearch && matchesCategory
  })

  // Sayfalama Hesaplamaları
  const indexOfLastRequest = page * requestsPerPage
  const indexOfFirstRequest = indexOfLastRequest - requestsPerPage
  const currentRequests = filteredRequests.slice(indexOfFirstRequest, indexOfLastRequest)
  const totalPages = Math.ceil(filteredRequests.length / requestsPerPage)

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true)
    } else if (e.type === "dragleave") {
      setDragActive(false)
    }
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setDragActive(false)
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const files = Array.from(e.dataTransfer.files).map(f => f.name)
      setFormFiles(prev => [...prev, ...files])
    }
  }

  const resetForm = () => {
    setFormStep(1)
    setSelectedFormCategory(null)
    setFormTitle("")
    setFormDesc("")
    setFormPriority("Normal")
    setFormFiles([])
    setAmount("")
    setReason("Proje Harcamaları")
    setExpectedDate("")
    setHardwareType("Dizüstü Bilgisayar (Laptop)")
    setBrandModel("")
    setLeaveType("Yıllık İzin")
    setStartDate("")
    setEndDate("")
    setProxyEmployee("")
  }

  const handleCreateRequest = () => {
    if (!formTitle.trim() || !selectedFormCategory) return

    const newRequest: RequestItem = {
      id: `REQ-${Math.floor(1000 + Math.random() * 9000)}`,
      title: formTitle,
      category: selectedFormCategory,
      summary: formDesc.slice(0, 100) + (formDesc.length > 100 ? "..." : ""),
      description: formDesc,
      priority: formPriority,
      status: "pending",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      uploadedFiles: formFiles,
      approver: "Mert Yılmaz (Departman Müdürü)",
      requester: { name: "Talep Sahibi (Siz)", avatarUrl: null, role: "Sistem Kullanıcısı" },
      amount: selectedFormCategory === "finans" ? parseFloat(amount) || 0 : undefined,
      reason: selectedFormCategory === "finans" ? reason : undefined,
      expectedDate: selectedFormCategory === "finans" ? expectedDate : undefined,
      hardwareType: selectedFormCategory === "it" ? hardwareType : undefined,
      brandModel: selectedFormCategory === "it" ? brandModel : undefined,
      leaveType: selectedFormCategory === "ik" ? leaveType : undefined,
      startDate: selectedFormCategory === "ik" ? startDate : undefined,
      endDate: selectedFormCategory === "ik" ? endDate : undefined,
      daysCount: selectedFormCategory === "ik" ? daysCount : undefined,
      proxyEmployee: selectedFormCategory === "ik" ? proxyEmployee : undefined,
    }

    setSuccessAnimation(true)
    setTimeout(() => {
      setRequests(prev => [newRequest, ...prev])
      setSuccessAnimation(false)
      setFormOpen(false)
      resetForm()
    }, 1500)
  }

  const handleCancelRequest = (id: string, e: React.MouseEvent) => {
    e.stopPropagation()
    if (confirm("Bu talebi iptal etmek istediğinizden emin misiniz?")) {
      setRequests(prev => prev.filter(r => r.id !== id))
    }
  }

  const handleApprove = () => {
    if (!detailItem) return
    setRequests(prev =>
      prev.map(r =>
        r.id === detailItem.id
          ? {
              ...r,
              status: "approved",
              managerComment: approveComment,
              decisionDate: new Date().toISOString(),
              updatedAt: new Date().toISOString(),
            }
          : r
      )
    )
    setApproveOpen(false)
    setApproveComment("")
    setDetailItem(null)
  }

  const handleReject = () => {
    if (!detailItem || !rejectComment.trim()) return
    setRequests(prev =>
      prev.map(r =>
        r.id === detailItem.id
          ? {
              ...r,
              status: "rejected",
              managerComment: rejectComment,
              decisionDate: new Date().toISOString(),
              updatedAt: new Date().toISOString(),
            }
          : r
      )
    )
    setRejectOpen(false)
    setRejectComment("")
    setDetailItem(null)
  }

  // Carousel slaytları
  const carouselItems = [
    { title: "Onay Bekleyen Taleplerim", val: `${pendingRequestsCount} Adet`, desc: "Yönetici onayı bekleyen işlemleriniz" },
    { title: "Bu Ayki Harcamalar", val: `${monthlyExpensesSum.toLocaleString("tr")} TL`, desc: "Avans & Masraf onaylanan bütçe" },
    { title: "Toplam Açık Taleplerim", val: `${totalOpenRequests} Adet`, desc: "Aktif süreçleri devam eden talepler" },
  ]

  const nextCarousel = () => setCarouselIndex((prev) => (prev + 1) % carouselItems.length)
  const prevCarousel = () => setCarouselIndex((prev) => (prev - 1 + carouselItems.length) % carouselItems.length)

  return (
    <div className="relative flex flex-col gap-6 p-4 lg:p-6 min-h-[calc(100vh-7rem)] overflow-hidden">
      
      {/* ── Üst Navigasyon Çubuğu (App Bar) ── */}
      <header className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 pb-4 border-b border-border bg-card">
        <div>
          <h1 className="text-xl font-bold text-foreground">Personel Talep Merkezi</h1>
          <p className="text-caption text-muted-foreground mt-0.5">İzin, avans, IT donanım ve ofis lojistik taleplerinizi yönetin</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="relative flex-1 sm:w-64 max-w-sm">
            <Search className="absolute left-3 top-2.5 size-4 text-muted-foreground" />
            <Input
              id="request-search"
              placeholder="Talep ara (#REQ, başlık...)"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 h-9"
            />
          </div>
          <button className="relative size-9 rounded-lg flex items-center justify-center hover:bg-muted border border-border text-muted-foreground transition-all">
            <Bell size={16} />
            {pendingRequestsCount > 0 && (
              <span className="absolute -top-1.5 -right-1.5 size-4 bg-destructive text-[9px] font-bold text-destructive-foreground rounded-full flex items-center justify-center animate-bounce">
                {pendingRequestsCount}
              </span>
            )}
          </button>
          <div className="flex items-center gap-2 border-l border-border pl-3">
            <div className="size-8 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-xs">
              LO
            </div>
          </div>
        </div>
      </header>

      {/* ── Özet Kartları (Summary Cards Carousel) ── */}
      <section className="relative w-full max-w-4xl mx-auto py-2">
        <div className="flex items-center justify-between gap-4">
          <Button variant="outline" size="icon" className="size-9 shrink-0" onClick={prevCarousel}>
            <ChevronLeft size={16} />
          </Button>
          
          <div className="flex-1 overflow-hidden rounded-2xl border border-border bg-gradient-to-br from-card to-muted/20 p-6 shadow-md transition-all duration-300">
            <div className="flex flex-col gap-2">
              <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                {carouselItems[carouselIndex].title}
              </span>
              <h2 className="text-3xl font-extrabold text-foreground tracking-tight transition-all">
                {carouselItems[carouselIndex].val}
              </h2>
              <p className="text-sm text-muted-foreground mt-1">
                {carouselItems[carouselIndex].desc}
              </p>
            </div>
            <div className="flex justify-center gap-1.5 mt-4">
              {carouselItems.map((_, idx) => (
                <button
                  key={idx}
                  className={cn(
                    "size-2 rounded-full transition-all",
                    carouselIndex === idx ? "bg-primary w-4" : "bg-muted-foreground/30 hover:bg-muted-foreground/50"
                  )}
                  onClick={() => setCarouselIndex(idx)}
                />
              ))}
            </div>
          </div>

          <Button variant="outline" size="icon" className="size-9 shrink-0" onClick={nextCarousel}>
            <ChevronRight size={16} />
          </Button>
        </div>
      </section>

      {/* Filtre Barı */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-muted/30 p-3 rounded-xl border border-border">
        <div className="flex flex-wrap items-center gap-1">
          <Button
            variant={selectedCategoryFilter === "all" ? "default" : "ghost"}
            size="sm"
            onClick={() => setSelectedCategoryFilter("all")}
            className="text-xs h-8"
          >
            Tümü
          </Button>
          {CATEGORIES.map((cat) => (
            <Button
              key={cat.id}
              variant={selectedCategoryFilter === cat.id ? "default" : "ghost"}
              size="sm"
              onClick={() => setSelectedCategoryFilter(cat.id)}
              className="text-xs h-8 gap-1.5"
            >
              <cat.icon size={13} />
              {cat.label.split(" / ")[0]}
            </Button>
          ))}
        </div>

        <div className="flex items-center border border-border rounded-lg overflow-hidden h-8">
          <button
            onClick={() => setActiveTab("my")}
            className={cn(
              "px-3 text-xs font-medium h-full transition-all",
              activeTab === "my" ? "bg-primary text-primary-foreground" : "hover:bg-muted text-muted-foreground bg-card"
            )}
          >
            Taleplerim
          </button>
          <button
            onClick={() => setActiveTab("approved-by-me")}
            className={cn(
              "px-3 text-xs font-medium h-full transition-all",
              activeTab === "approved-by-me" ? "bg-primary text-primary-foreground" : "hover:bg-muted text-muted-foreground bg-card"
            )}
          >
            Onay Bekleyenler ({pendingRequestsCount})
          </button>
        </div>
      </div>

      {/* ── Talep Listesi Tablosu (Data Table) ── */}
      <main className="flex-1 bg-card border border-border rounded-xl shadow-sm overflow-hidden flex flex-col">
        <div className="flex-1 overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-border bg-muted/40 text-muted-foreground text-xs font-semibold">
                <th className="px-4 py-3 w-28">Talep ID</th>
                <th className="px-4 py-3 w-40">Kategori</th>
                <th className="px-4 py-3">Talep Başlığı / Özeti</th>
                <th className="px-4 py-3 w-32">Durum</th>
                <th className="px-4 py-3 w-36 text-right">Son Güncelleme</th>
                <th className="px-4 py-3 w-28 text-center">İşlemler</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border text-sm">
              {currentRequests.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-16 text-center text-muted-foreground">
                    <FolderClosed size={36} className="mx-auto text-muted-foreground/50 mb-3" />
                    <p className="font-semibold text-foreground">Talep Bulunamadı</p>
                    <p className="text-caption mt-1">Arama kriterlerinize veya filtrenize uygun talep bulunmamaktadır.</p>
                  </td>
                </tr>
              ) : (
                currentRequests.map((req) => {
                  const cat = CATEGORIES.find(c => c.id === req.category)
                  const CatIcon = cat?.icon ?? FileText
                  return (
                    <tr
                      key={req.id}
                      onClick={() => setDetailItem(req)}
                      className="hover:bg-muted/30 transition-colors cursor-pointer group"
                    >
                      <td className="px-4 py-3.5 font-mono text-xs font-bold text-primary">
                        {req.id}
                      </td>
                      <td className="px-4 py-3.5">
                        <div className="flex items-center gap-2">
                          <div className={cn("size-7 rounded-lg flex items-center justify-center border shrink-0", cat?.color)}>
                            <CatIcon size={14} />
                          </div>
                          <span className="font-medium text-xs truncate">{cat?.label}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3.5 max-w-md">
                        <p className="font-semibold text-foreground truncate group-hover:text-primary transition-colors">
                          {req.title}
                        </p>
                        <p className="text-caption text-muted-foreground truncate mt-0.5">
                          {req.summary}
                        </p>
                      </td>
                      <td className="px-4 py-3.5">
                        <Badge
                          variant="secondary"
                          className={cn(
                            "font-semibold text-xs border uppercase tracking-wider px-2 py-0.5",
                            req.status === "pending" && "bg-yellow-500/10 text-yellow-500 border-yellow-500/20",
                            req.status === "approved" && "bg-green-500/10 text-green-500 border-green-500/20",
                            req.status === "rejected" && "bg-red-500/10 text-red-500 border-red-500/20",
                            req.status === "completed" && "bg-blue-500/10 text-blue-500 border-blue-500/20"
                          )}
                        >
                          {req.status === "pending" && "Beklemede"}
                          {req.status === "approved" && "Onaylandı"}
                          {req.status === "rejected" && "Reddedildi"}
                          {req.status === "completed" && "Tamamlandı"}
                        </Badge>
                      </td>
                      <td className="px-4 py-3.5 text-right font-mono text-xs text-muted-foreground">
                        {new Date(req.updatedAt).toLocaleDateString("tr-TR", {
                          day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit"
                        })}
                      </td>
                      <td className="px-4 py-3.5 text-center" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center justify-center gap-1.5">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="size-7 rounded-lg hover:bg-muted text-muted-foreground"
                            onClick={() => setDetailItem(req)}
                          >
                            <Eye size={14} />
                          </Button>
                          {req.status === "pending" && (
                            <Button
                              variant="ghost"
                              size="icon"
                              className="size-7 rounded-lg hover:bg-destructive/10 text-muted-foreground hover:text-destructive"
                              onClick={(e) => handleCancelRequest(req.id, e)}
                            >
                              <Trash2 size={14} />
                            </Button>
                          )}
                        </div>
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Sayfalama (Pagination) */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between border-t border-border px-4 py-3 bg-muted/20 shrink-0">
            <span className="text-xs text-muted-foreground">
              Toplam {filteredRequests.length} talepten {indexOfFirstRequest + 1}-{Math.min(indexOfLastRequest, filteredRequests.length)} arası gösteriliyor
            </span>
            <div className="flex items-center gap-1.5">
              <Button
                variant="outline"
                size="sm"
                className="h-8 text-xs"
                disabled={page === 1}
                onClick={() => setPage(p => p - 1)}
              >
                Önceki
              </Button>
              <div className="flex items-center gap-1">
                {Array.from({ length: totalPages }).map((_, i) => (
                  <Button
                    key={i}
                    variant={page === i + 1 ? "default" : "outline"}
                    size="sm"
                    className="size-8 text-xs p-0"
                    onClick={() => setPage(i + 1)}
                  >
                    {i + 1}
                  </Button>
                ))}
              </div>
              <Button
                variant="outline"
                size="sm"
                className="h-8 text-xs"
                disabled={page === totalPages}
                onClick={() => setPage(p => p + 1)}
              >
                Sonraki
              </Button>
            </div>
          </div>
        )}
      </main>

      {/* ── Hızlı Eylem Alanı (FAB) ── */}
      <div className="fixed bottom-6 right-6 z-40 group flex flex-col items-end">
        <div className="absolute right-0 bottom-16 opacity-0 translate-y-3 pointer-events-none group-hover:opacity-100 group-hover:translate-y-0 group-hover:pointer-events-auto transition-all duration-300 bg-foreground text-background text-xs font-semibold px-2.5 py-1.5 rounded-lg shadow-xl shrink-0 whitespace-nowrap">
          Yeni Talep Oluştur
        </div>
        <Button
          id="fab-new-request"
          onClick={() => { resetForm(); setFormOpen(true) }}
          className="size-14 rounded-full bg-primary text-primary-foreground shadow-2xl hover:scale-105 hover:rotate-90 active:scale-95 transition-all flex items-center justify-center shrink-0"
        >
          <Plus size={24} />
        </Button>
      </div>

      {/* ── İkinci Ekran: Yeni Talep Oluştur Formu (Drawer) ── */}
      {formOpen && (
        <div
          className="fixed inset-0 z-50 flex justify-end bg-black/50 backdrop-blur-sm transition-opacity duration-300"
          onClick={(e) => { if (e.target === e.currentTarget) setFormOpen(false) }}
        >
          <div className="w-full max-w-xl bg-card border-l border-border h-full flex flex-col shadow-2xl animate-in slide-in-from-right duration-300">
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-border bg-muted/20">
              <div>
                <h2 className="text-lg font-bold">Yeni Talep Oluştur</h2>
                <p className="text-caption text-muted-foreground mt-0.5">Talep detaylarını adım adım girin</p>
              </div>
              <Button variant="ghost" size="icon" className="size-8" onClick={() => setFormOpen(false)}>
                <X size={16} />
              </Button>
            </div>

            {/* İçerik */}
            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              
              {/* Adım Barı */}
              <div className="flex items-center justify-between text-xs text-muted-foreground pb-2 border-b border-border/50">
                <span className={cn("font-semibold", formStep === 1 && "text-primary")}>1. Kategori Seçimi</span>
                <ArrowRight size={12} className="text-muted-foreground/50" />
                <span className={cn("font-semibold", formStep === 2 && "text-primary")}>2. Detaylı Form</span>
              </div>

              {/* ADIM 1: Kategori Seçimi */}
              {formStep === 1 && (
                <div className="space-y-4">
                  <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider block">Bir Kategori Seçin</label>
                  <div className="grid grid-cols-2 gap-3">
                    {CATEGORIES.map((cat) => {
                      const isSelected = selectedFormCategory === cat.id
                      return (
                        <button
                          key={cat.id}
                          onClick={() => {
                            setSelectedFormCategory(cat.id)
                            setFormStep(2)
                          }}
                          className={cn(
                            "flex flex-col items-center justify-center p-5 rounded-2xl border text-center transition-all gap-3 hover:-translate-y-0.5 hover:shadow-md",
                            isSelected
                              ? "border-primary bg-primary/10 text-primary"
                              : "border-border hover:border-primary/50 text-foreground bg-card"
                          )}
                        >
                          <div className={cn("size-12 rounded-2xl flex items-center justify-center border", cat.color)}>
                            <cat.icon size={22} />
                          </div>
                          <span className="text-sm font-semibold">{cat.label}</span>
                        </button>
                      )
                    })}
                  </div>
                </div>
              )}

              {/* ADIM 2: Detaylı Form */}
              {formStep === 2 && selectedFormCategory && (
                <div className="space-y-5">
                  <div className="flex items-center justify-between">
                    <span className="text-caption font-semibold uppercase text-muted-foreground">Form Detayları</span>
                    <button
                      onClick={() => setFormStep(1)}
                      className="text-xs text-primary font-medium hover:underline"
                    >
                      Kategoriyi Değiştir
                    </button>
                  </div>

                  {/* ORTAK ALANLAR */}
                  <div className="space-y-4 border-b border-border/50 pb-5">
                    <div className="space-y-1.5">
                      <label className="text-xs font-semibold">Talep Başlığı</label>
                      <Input
                        placeholder="Kısa ve açıklayıcı bir başlık girin"
                        value={formTitle}
                        onChange={(e) => setFormTitle(e.target.value)}
                        className="h-10"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-xs font-semibold">Açıklama (Markdown / Zengin Metin)</label>
                      <textarea
                        placeholder="Talebin detaylarını ve gerekçesini buraya yazın..."
                        value={formDesc}
                        onChange={(e) => setFormDesc(e.target.value)}
                        rows={5}
                        className="w-full bg-card text-foreground border border-border rounded-lg p-3 text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary/20 transition-all resize-none"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-1.5">
                        <label className="text-xs font-semibold">Öncelik Seviyesi</label>
                        <select
                          value={formPriority}
                          onChange={(e) => setFormPriority(e.target.value as any)}
                          className="w-full bg-card border border-border rounded-lg h-10 px-3 text-sm outline-none focus:border-primary transition-all"
                        >
                          <option value="Normal">Normal</option>
                          <option value="Acil">Acil</option>
                          <option value="Kritik">Kritik</option>
                        </select>
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-xs font-semibold">Varsayılan Onaylayıcı</label>
                        <Input value="Hakan Yılmaz (Operasyon Direktörü)" disabled className="h-10 bg-muted/50 cursor-not-allowed" />
                      </div>
                    </div>
                  </div>

                  {/* DİNAMİK ALANLAR (Kategoriye Göre) */}
                  
                  {/* Finans Talebi */}
                  {selectedFormCategory === "finans" && (
                    <div className="space-y-4">
                      <h3 className="text-xs font-bold uppercase text-primary tracking-wide">Finansal Detaylar</h3>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1.5">
                          <label className="text-xs font-semibold">Tutar (TL)</label>
                          <Input
                            type="number"
                            placeholder="0.00"
                            value={amount}
                            onChange={(e) => setAmount(e.target.value)}
                            className="h-10"
                          />
                        </div>
                        <div className="space-y-1.5">
                          <label className="text-xs font-semibold">Ödeme Neden Tipi</label>
                          <select
                            value={reason}
                            onChange={(e) => setReason(e.target.value)}
                            className="w-full bg-card border border-border rounded-lg h-10 px-3 text-sm outline-none"
                          >
                            <option value="Proje Harcamaları">Proje Harcamaları</option>
                            <option value="Müşteri Ağırlama">Müşteri Ağırlama</option>
                            <option value="Ofis/Kırtasiye">Ofis/Kırtasiye</option>
                            <option value="Seyahat/Ulaşım">Seyahat/Ulaşım</option>
                          </select>
                        </div>
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-xs font-semibold">Beklenen Ödeme Tarihi</label>
                        <Input
                          type="date"
                          value={expectedDate}
                          onChange={(e) => setExpectedDate(e.target.value)}
                          className="h-10"
                        />
                      </div>
                    </div>
                  )}

                  {/* IT Talebi */}
                  {selectedFormCategory === "it" && (
                    <div className="space-y-4">
                      <h3 className="text-xs font-bold uppercase text-primary tracking-wide">IT & Donanım Tercihleri</h3>
                      <div className="space-y-1.5">
                        <label className="text-xs font-semibold">Cihaz / Yazılım Tipi</label>
                        <select
                          value={hardwareType}
                          onChange={(e) => setHardwareType(e.target.value)}
                          className="w-full bg-card border border-border rounded-lg h-10 px-3 text-sm"
                        >
                          <option value="Dizüstü Bilgisayar (Laptop)">Dizüstü Bilgisayar (Laptop)</option>
                          <option value="Masaüstü Bilgisayar (Workstation)">Masaüstü Bilgisayar (Workstation)</option>
                          <option value="Yedek Monitör / Ekran">Yedek Monitör / Ekran</option>
                          <option value="Kulaklık / Donanım Aksesuarı">Kulaklık / Donanım Aksesuarı</option>
                          <option value="Adobe / Figma Lisans Talebi">Adobe / Figma Lisans Talebi</option>
                        </select>
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-xs font-semibold">Tercih Edilen Marka / Model / Özellikler</label>
                        <Input
                          placeholder="Örn: Apple MacBook Pro 16 inç M3 Pro, 36GB RAM"
                          value={brandModel}
                          onChange={(e) => setBrandModel(e.target.value)}
                          className="h-10"
                        />
                      </div>
                    </div>
                  )}

                  {/* İzin Talebi */}
                  {selectedFormCategory === "ik" && (
                    <div className="space-y-4">
                      <h3 className="text-xs font-bold uppercase text-primary tracking-wide">İzin Dönemi Planlaması</h3>
                      <div className="space-y-1.5">
                        <label className="text-xs font-semibold">İzin Türü</label>
                        <select
                          value={leaveType}
                          onChange={(e) => setLeaveType(e.target.value)}
                          className="w-full bg-card border border-border rounded-lg h-10 px-3 text-sm"
                        >
                          <option value="Yıllık İzin">Yıllık İzin</option>
                          <option value="Mazeret İzni">Mazeret İzni</option>
                          <option value="Sağlık İzni / Rapor">Sağlık İzni / Rapor</option>
                          <option value="Ücretsiz İzin">Ücretsiz İzin</option>
                        </select>
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1.5">
                          <label className="text-xs font-semibold">Başlangıç Tarihi</label>
                          <Input
                            type="date"
                            value={startDate}
                            onChange={(e) => setStartDate(e.target.value)}
                            className="h-10"
                          />
                        </div>
                        <div className="space-y-1.5">
                          <label className="text-xs font-semibold">Bitiş Tarihi</label>
                          <Input
                            type="date"
                            value={endDate}
                            onChange={(e) => setEndDate(e.target.value)}
                            className="h-10"
                          />
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1.5">
                          <label className="text-xs font-semibold">Hesaplanan İzin Günü</label>
                          <Input value={`${daysCount} Gün`} disabled className="h-10 bg-muted/50 font-bold" />
                        </div>
                        <div className="space-y-1.5">
                          <label className="text-xs font-semibold">Vekalet Edilecek Çalışan</label>
                          <select
                            value={proxyEmployee}
                            onChange={(e) => setProxyEmployee(e.target.value)}
                            className="w-full bg-card border border-border rounded-lg h-10 px-3 text-sm"
                          >
                            <option value="">Seçin...</option>
                            <option value="Melis Şen">Melis Şen (Kreatif Yazar)</option>
                            <option value="Hakan Kara">Hakan Kara (Geliştirici)</option>
                            <option value="Elif Yıldız">Elif Yıldız (Hesap Yöneticisi)</option>
                          </select>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* DOSYA YÜKLEME ALANI */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold">Dosya Ekle (Drag & Drop)</label>
                    <div
                      onDragEnter={handleDrag}
                      onDragOver={handleDrag}
                      onDragLeave={handleDrag}
                      onDrop={handleDrop}
                      className={cn(
                        "border-2 border-dashed border-border rounded-xl p-6 text-center transition-all cursor-pointer",
                        dragActive ? "border-primary bg-primary/5" : "hover:bg-muted/30"
                      )}
                    >
                      <Paperclip className="mx-auto text-muted-foreground mb-2" size={20} />
                      <p className="text-xs font-medium">Dosyaları buraya sürükleyin veya göz atın</p>
                      <p className="text-[10px] text-muted-foreground mt-0.5">Maksimum dosya boyutu: 25MB</p>
                    </div>

                    {formFiles.length > 0 && (
                      <div className="flex flex-wrap gap-1.5 mt-2">
                        {formFiles.map((file, idx) => (
                          <Badge key={idx} variant="secondary" className="gap-1 pr-1.5 text-xs">
                            <span className="truncate max-w-32">{file}</span>
                            <button
                              onClick={() => setFormFiles(prev => prev.filter((_, i) => i !== idx))}
                              className="size-3.5 rounded-full hover:bg-muted-foreground/30 flex items-center justify-center shrink-0"
                            >
                              <X size={10} />
                            </button>
                          </Badge>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Footer Butonları */}
            {formStep === 2 && (
              <div className="px-6 py-4 border-t border-border bg-muted/20 flex justify-end gap-2 shrink-0">
                <Button variant="outline" className="h-10" onClick={() => setFormOpen(false)}>
                  Taslağı Kaydet
                </Button>
                <Button
                  onClick={handleCreateRequest}
                  disabled={!formTitle.trim() || successAnimation}
                  className="h-10 gap-2 font-semibold min-w-32"
                >
                  {successAnimation ? (
                    <>
                      <CheckCircle2 size={16} className="animate-pulse" />
                      Gönderildi!
                    </>
                  ) : (
                    <>
                      <Send size={15} />
                      Talebi Gönder
                    </>
                  )}
                </Button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── Üçüncü Ekran: Talep Detayları ve Onay Akışı ── */}
      {detailItem && (
        <div
          className="fixed inset-0 z-50 flex justify-end bg-black/50 backdrop-blur-sm transition-opacity duration-300"
          onClick={(e) => { if (e.target === e.currentTarget) setDetailItem(null) }}
        >
          <div className="w-full max-w-xl bg-card border-l border-border h-full flex flex-col shadow-2xl animate-in slide-in-from-right duration-300">
            {/* Üst Durum Çubuğu */}
            <div
              className={cn(
                "h-2 w-full shrink-0",
                detailItem.status === "pending" && "bg-yellow-500",
                detailItem.status === "approved" && "bg-green-500",
                detailItem.status === "rejected" && "bg-red-500",
                detailItem.status === "completed" && "bg-blue-500"
              )}
            />

            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-border bg-muted/20">
              <div>
                <h2 className="text-lg font-bold flex items-center gap-2">
                  <span>Talep Detayı</span>
                  <Badge variant="outline" className="font-mono text-xs">{detailItem.id}</Badge>
                </h2>
                <p className="text-caption text-muted-foreground mt-0.5">Talebin detayları, ekleri ve onay geçmişi</p>
              </div>
              <Button variant="ghost" size="icon" className="size-8" onClick={() => setDetailItem(null)}>
                <X size={16} />
              </Button>
            </div>

            {/* İçerik */}
            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              
              {/* Temel Bilgi Kartı */}
              <div className="bg-muted/30 border border-border p-4 rounded-xl space-y-3">
                <div className="flex items-center gap-3">
                  <div className="size-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold">
                    {detailItem.requester.name.slice(0, 2).toUpperCase()}
                  </div>
                  <div>
                    <p className="text-sm font-semibold">{detailItem.requester.name}</p>
                    <p className="text-caption text-muted-foreground">{detailItem.requester.role}</p>
                  </div>
                  <Badge className="ml-auto capitalize">{detailItem.priority}</Badge>
                </div>
                <div className="h-[1px] w-full bg-border/60" />
                <div className="grid grid-cols-2 gap-y-2.5 gap-x-4 text-xs">
                  <div>
                    <span className="text-muted-foreground">Kategori:</span>
                    <span className="font-medium text-foreground ml-1.5 block sm:inline">
                      {CATEGORIES.find(c => c.id === detailItem.category)?.label}
                    </span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Talep Tarihi:</span>
                    <span className="font-medium text-foreground ml-1.5 block sm:inline">
                      {new Date(detailItem.createdAt).toLocaleDateString("tr-TR")}
                    </span>
                  </div>
                </div>
              </div>

              {/* Detay ve Açıklama */}
              <div className="space-y-2">
                <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-wide">Talep Başlığı & Açıklaması</h3>
                <h4 className="text-base font-bold text-foreground">{detailItem.title}</h4>
                <div className="text-sm text-foreground/80 leading-relaxed bg-muted/10 p-3 rounded-lg border border-border/50 whitespace-pre-line">
                  {detailItem.description}
                </div>
              </div>

              {/* Dinamik Alanlar Gösterimi */}
              {(detailItem.amount || detailItem.hardwareType || detailItem.leaveType) && (
                <div className="bg-primary/5 border border-primary/10 p-4 rounded-xl space-y-3">
                  <h3 className="text-xs font-bold text-primary uppercase tracking-wide">İşlem Detayları</h3>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    {detailItem.amount && (
                      <>
                        <div>
                          <span className="text-xs text-muted-foreground block">Talep Edilen Tutar</span>
                          <span className="font-bold text-foreground">{detailItem.amount.toLocaleString("tr")} TL</span>
                        </div>
                        <div>
                          <span className="text-xs text-muted-foreground block">Beklenen Ödeme Tarihi</span>
                          <span className="font-medium text-foreground">{detailItem.expectedDate}</span>
                        </div>
                      </>
                    )}
                    {detailItem.hardwareType && (
                      <>
                        <div>
                          <span className="text-xs text-muted-foreground block">Donanım Türü</span>
                          <span className="font-semibold text-foreground">{detailItem.hardwareType}</span>
                        </div>
                        <div>
                          <span className="text-xs text-muted-foreground block">Marka / Model Tercihi</span>
                          <span className="font-medium text-foreground">{detailItem.brandModel}</span>
                        </div>
                      </>
                    )}
                    {detailItem.leaveType && (
                      <>
                        <div>
                          <span className="text-xs text-muted-foreground block">İzin Aralığı ({detailItem.daysCount} Gün)</span>
                          <span className="font-semibold text-foreground">{detailItem.startDate} / {detailItem.endDate}</span>
                        </div>
                        <div>
                          <span className="text-xs text-muted-foreground block">Vekil Çalışan</span>
                          <span className="font-medium text-foreground">{detailItem.proxyEmployee || "Belirtilmemiş"}</span>
                        </div>
                      </>
                    )}
                  </div>
                </div>
              )}

              {/* Ekli Dosyalar */}
              {detailItem.uploadedFiles.length > 0 && (
                <div className="space-y-2">
                  <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-wide">Ekli Dosyalar ({detailItem.uploadedFiles.length})</h3>
                  <div className="flex flex-col gap-1.5">
                    {detailItem.uploadedFiles.map((file, idx) => (
                      <div key={idx} className="flex items-center gap-2 p-2 bg-muted/30 border border-border rounded-lg text-xs">
                        <Paperclip size={13} className="text-muted-foreground" />
                        <span className="font-medium flex-1 truncate">{file}</span>
                        <Button variant="ghost" size="sm" className="h-6 text-[10px] text-primary hover:underline px-2 py-0">
                          İndir
                        </Button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* ── Onay Akışı Görünümü (Workflow Stepper) ── */}
              <div className="space-y-4">
                <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-wide">Talep Onay Geçmişi & Akışı</h3>
                <div className="relative pl-6 border-l border-border/80 space-y-6">
                  
                  {/* Adım 1: Çalışan (Başlatıldı) */}
                  <div className="relative">
                    <div className="absolute -left-[31px] top-0 size-4 rounded-full bg-green-500 border-4 border-card" />
                    <div>
                      <div className="flex items-center gap-2 text-xs font-bold">
                        <span>Talep Oluşturuldu</span>
                        <span className="text-[10px] font-normal text-muted-foreground">
                          {new Date(detailItem.createdAt).toLocaleDateString("tr-TR")}
                        </span>
                      </div>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {detailItem.requester.name} tarafından süreç başlatıldı.
                      </p>
                    </div>
                  </div>

                  {/* Adım 2: Departman Yöneticisi */}
                  <div className="relative">
                    <div
                      className={cn(
                        "absolute -left-[31px] top-0 size-4 rounded-full border-4 border-card",
                        detailItem.status === "pending" && "bg-yellow-500",
                        detailItem.status === "approved" && "bg-green-500",
                        detailItem.status === "rejected" && "bg-red-500",
                        detailItem.status === "completed" && "bg-green-500"
                      )}
                    />
                    <div>
                      <div className="flex items-center gap-2 text-xs font-bold">
                        <span>Yönetici Onayı</span>
                        <Badge
                          variant="secondary"
                          className={cn(
                            "text-[9px] px-1 py-0 border",
                            detailItem.status === "pending" && "bg-yellow-500/10 text-yellow-500 border-yellow-500/20",
                            (detailItem.status === "approved" || detailItem.status === "completed") && "bg-green-500/10 text-green-500 border-green-500/20",
                            detailItem.status === "rejected" && "bg-red-500/10 text-red-500 border-red-500/20"
                          )}
                        >
                          {detailItem.status === "pending" ? "Onay Bekliyor" : detailItem.status === "rejected" ? "Reddedildi" : "Onaylandı"}
                        </Badge>
                      </div>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {detailItem.approver}
                      </p>
                      {detailItem.managerComment && (
                        <div className="mt-2 p-2.5 bg-muted/40 rounded-lg border border-border text-xs italic text-muted-foreground">
                          " {detailItem.managerComment} "
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Adım 3: İlgili Birim Operasyon */}
                  <div className="relative">
                    <div
                      className={cn(
                        "absolute -left-[31px] top-0 size-4 rounded-full border-4 border-card",
                        detailItem.status === "completed" ? "bg-green-500" : "bg-muted-foreground/30"
                      )}
                    />
                    <div>
                      <div className="flex items-center gap-2 text-xs font-bold">
                        <span>Birim İşlemi & Kapatma</span>
                        {detailItem.status === "completed" && (
                          <Badge variant="outline" className="text-[9px] px-1 py-0 border-blue-500/20 bg-blue-500/10 text-blue-500">
                            Tamamlandı
                          </Badge>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        İlgili birim (IT/İK/Muhasebe) tarafından işlemin gerçekleştirilmesi ve kapatılması.
                      </p>
                    </div>
                  </div>

                </div>
              </div>
            </div>

            {/* ── Yönetici Aksiyon Alanı ── */}
            <div className="px-6 py-4 border-t border-border bg-muted/30 shrink-0 space-y-4">
              {detailItem.status === "pending" && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between text-xs font-bold text-muted-foreground uppercase tracking-wide">
                    <span>Yönetici Karar Arayüzü</span>
                    <span className="text-[10px] text-primary normal-case">Lütfen karar verin</span>
                  </div>
                  
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      className="flex-1 gap-2 border-red-500/30 text-red-500 hover:bg-red-500/10 hover:text-red-500 font-semibold h-10"
                      onClick={() => setRejectOpen(true)}
                    >
                      <ThumbsDown size={14} />
                      Reddet
                    </Button>
                    <Button
                      className="flex-1 gap-2 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold h-10"
                      onClick={() => setApproveOpen(true)}
                    >
                      <ThumbsUp size={14} />
                      Onayla
                    </Button>
                  </div>
                </div>
              )}

              {/* Dahili Notlar Alanı */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider block">
                  Dahili Notlar (Yalnızca Yönetim Görebilir)
                </label>
                <textarea
                  placeholder="Bu talebe özel dahili notlar ekleyin..."
                  value={internalNote}
                  onChange={(e) => setInternalNote(e.target.value)}
                  rows={2}
                  className="w-full bg-card text-foreground border border-border rounded-lg p-2.5 text-xs outline-none focus:border-primary transition-all resize-none"
                />
              </div>
            </div>

          </div>
        </div>
      )}

      {/* Red Gerekçe Modalı */}
      <Dialog open={rejectOpen} onOpenChange={setRejectOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-red-500">
              <XCircle size={18} />
              Talebi Reddet
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <p className="text-xs text-muted-foreground">
              Lütfen talebi reddetme gerekçenizi yazın. Gerekçe çalışana geri bildirim olarak iletilecektir.
            </p>
            <textarea
              placeholder="Ret gerekçesi (zorunlu)..."
              value={rejectComment}
              onChange={(e) => setRejectComment(e.target.value)}
              rows={4}
              className="w-full bg-card border border-border rounded-lg p-3 text-sm outline-none focus:border-red-500"
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRejectOpen(false)}>{tText("common.cancel", "İptal")}</Button>
            <Button
              variant="destructive"
              onClick={handleReject}
              disabled={!rejectComment.trim()}
            >
              Reddet
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Onay Açıklama Modalı */}
      <Dialog open={approveOpen} onOpenChange={setApproveOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-emerald-600">
              <CheckCircle2 size={18} />
              Talebi Onayla
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <p className="text-xs text-muted-foreground">
              İsteğe bağlı olarak onay notu veya talimat ekleyebilirsiniz.
            </p>
            <textarea
              placeholder="Onay notu (isteğe bağlı)..."
              value={approveComment}
              onChange={(e) => setApproveComment(e.target.value)}
              rows={4}
              className="w-full bg-card border border-border rounded-lg p-3 text-sm outline-none focus:border-emerald-500"
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setApproveOpen(false)}>{tText("common.cancel", "İptal")}</Button>
            <Button
              className="bg-emerald-600 hover:bg-emerald-700 text-white"
              onClick={handleApprove}
            >
              Onayla
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Separetor Separator Line ── */}
      <div className="absolute inset-0 pointer-events-none border border-border/10 rounded-xl" />

    </div>
  )
}
