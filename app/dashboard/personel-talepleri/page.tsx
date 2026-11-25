"use client"

import { useState, useEffect } from "react"
import { motion } from "framer-motion"
import { useLanguage } from "@/lib/context/LanguageContext"
import {
  Plus, Search, Eye, Trash2, Calendar, Wallet, Laptop,
  Building, ShoppingCart, CheckCircle2, XCircle, Clock,
  Paperclip, Send, FolderClosed, ThumbsUp,
  ThumbsDown, FileText, ArrowRight, X
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { cn } from "@/lib/utils"
import { isDemoModeActive, getMockData } from "@/lib/data-controller"
import { mockDatabase } from "@/lib/data/mockDatabase"
import { AnimatedNumber, StaggerContainer, StaggerItem } from "@/components/ui/motion-primitives"

// Kategori Tanımları
const CATEGORIES = [
  { id: "finans", label: "Finans / Avans", icon: Wallet, color: "text-[--brand] bg-[--brand-soft] border-[--brand-line]" },
  { id: "it", label: "IT / Donanım", icon: Laptop, color: "text-[--sky] bg-[--brand-soft] border-[--brand-line]" },
  { id: "ik", label: "İzinler / İK", icon: Calendar, color: "text-[--warn] bg-[--warn-soft] border-[--warn]/20" },
  { id: "ofis", label: "Ofis / Lojistik", icon: Building, color: "text-[--text-2] bg-[--muted-bg] border-[--line]" },
  { id: "satinalma", label: "Satın Alma", icon: ShoppingCart, color: "text-[--brand] bg-[--brand-soft] border-[--brand-line]" },
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
  const [requests, setRequests] = useState<RequestItem[]>(() => mockDatabase.getHRRequests() as any)

  useEffect(() => {
    const handleDbChange = () => setRequests(mockDatabase.getHRRequests() as any)
    window.addEventListener("sunum-mockdb-change", handleDbChange)
    return () => window.removeEventListener("sunum-mockdb-change", handleDbChange)
  }, [])

  useEffect(() => {
    if (isDemoModeActive()) {
      const data = getMockData("personel_talepleri")
      if (Array.isArray(data) && data.length > 0) {
        setRequests(data)
      } else {
        setRequests(mockDatabase.getHRRequests() as any)
      }
    }
  }, [])

  const [searchQuery, setSearchQuery] = useState("")
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState("all")
  const [activeTab, setActiveTab] = useState<"my" | "approved-by-me">("my")
  const [page, setPage] = useState(1)
  const [requestsPerPage] = useState(5)

  // Carousel State (preserved for business logic compatibility)
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

  // Bento Özet Kartları
  const carouselItems = [
    { title: "Onay Bekleyen Taleplerim", val: pendingRequestsCount, suffix: " Adet", desc: "Yönetici onayı bekleyen işlemleriniz", badge: "Bekleyen", badgeClass: "bg-[--warn-soft] text-[--warn] border border-[--warn]/20" },
    { title: "Bu Ayki Harcamalar", val: monthlyExpensesSum, prefix: "₺", desc: "Avans & Masraf onaylanan bütçe", badge: "Finans", badgeClass: "bg-[--brand-soft] text-[--brand] border border-[--brand-line]" },
    { title: "Toplam Açık Taleplerim", val: totalOpenRequests, suffix: " Adet", desc: "Aktif süreçleri devam eden talepler", badge: "Aktif", badgeClass: "bg-[--brand-soft] text-[--brand] border border-[--brand-line]" },
    { title: "Toplam Talep Kaydı", val: requests.length, suffix: " Adet", desc: "Sistemdeki tüm dönem talepleri", badge: "Arşiv", badgeClass: "bg-[--muted-bg] text-[--text-muted] border border-[--line]" },
  ]

  const nextCarousel = () => setCarouselIndex((prev) => (prev + 1) % carouselItems.length)
  const prevCarousel = () => setCarouselIndex((prev) => (prev - 1 + carouselItems.length) % carouselItems.length)

  return (
    <div className="space-y-6">

      {/* ── Sayfa Başlığı & Arama / Aksiyon Barı ── */}
      <header className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-semibold text-[--text] tracking-tight">Personel Talep Merkezi</h1>
          <p className="text-xs text-[--text-muted] mt-1">İzin, avans, IT donanım ve ofis lojistik taleplerinizi yönetin</p>
        </div>
        <div className="flex items-center gap-3 w-full sm:w-auto">
          <div className="relative flex-1 sm:w-64">
            <Search className="absolute left-3.5 top-2.5 size-4 text-[--text-muted]" />
            <input
              id="request-search"
              placeholder="Talep ara (#REQ, başlık...)"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-white border border-[--line] focus:border-[--brand] focus:ring-1 focus:ring-[--brand] rounded-full pl-9 pr-4 py-1.5 text-sm text-[--text] placeholder-[--text-muted] outline-none transition-all shadow-xs"
            />
          </div>
          <Button
            onClick={() => { resetForm(); setFormOpen(true) }}
            className="bg-gradient-to-r from-[--brand] to-[--blue] hover:from-[--brand-hover] hover:to-[--brand] text-[--text] font-medium rounded-full px-4 h-9 text-xs gap-1.5 shrink-0 shadow-sm cursor-pointer"
          >
            <Plus size={15} />
            <span>Yeni Talep</span>
          </Button>
        </div>
      </header>

      {/* ── 4 Kompakt Bento Özet Kartı (Devasa Slider Kaldırıldı) ── */}
      <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {carouselItems.map((item, idx) => (
          <div
            key={idx}
            className="bg-white/80 backdrop-blur-xl border border-[--line] rounded-[20px] p-5 flex flex-col justify-between shadow-sm"
          >
            <div className="flex items-center justify-between gap-2">
              <span className="text-[11px] uppercase tracking-[0.12em] text-[--text-muted] font-medium truncate">
                {item.title}
              </span>
              <span className={cn("text-[10px] px-2 py-0.5 rounded-full font-medium shrink-0", item.badgeClass)}>
                {item.badge}
              </span>
            </div>
            <div className="mt-3">
              <p className="text-3xl font-semibold text-[--text] tracking-tight tabular-nums">
                <AnimatedNumber value={item.val} prefix={item.prefix || ""} suffix={item.suffix || ""} />
              </p>
              <p className="text-xs text-[--text-muted] mt-1 truncate">
                {item.desc}
              </p>
            </div>
          </div>
        ))}
      </section>

      {/* ── Modern Yuvarlak Hap Filtre Barı (Sarı Sekmeler Kaldırıldı) ── */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        {/* Kategori Hap Filtreleri */}
        <div className="bg-[--muted-bg] p-1 rounded-full border border-[--line] flex flex-wrap items-center gap-1">
          <button
            type="button"
            onClick={() => setSelectedCategoryFilter("all")}
            className={cn(
              "relative px-3.5 py-1.5 text-xs rounded-full transition-colors cursor-pointer",
              selectedCategoryFilter === "all"
                ? "text-[--brand] font-medium"
                : "text-[--text-muted] hover:text-[--text]"
            )}
          >
            {selectedCategoryFilter === "all" && (
              <motion.div
                layoutId="categoryActivePill"
                className="absolute inset-0 bg-white rounded-full shadow-xs"
                transition={{ type: "spring", stiffness: 350, damping: 30 }}
              />
            )}
            <span className="relative z-10">Tümü</span>
          </button>
          {CATEGORIES.map((cat) => {
            const isSelected = selectedCategoryFilter === cat.id
            return (
              <button
                key={cat.id}
                type="button"
                onClick={() => setSelectedCategoryFilter(cat.id)}
                className={cn(
                  "relative px-3.5 py-1.5 text-xs rounded-full transition-colors flex items-center gap-1.5 cursor-pointer",
                  isSelected
                    ? "text-[--brand] font-medium"
                    : "text-[--text-muted] hover:text-[--text]"
                )}
              >
                {isSelected && (
                  <motion.div
                    layoutId="categoryActivePill"
                    className="absolute inset-0 bg-white rounded-full shadow-xs"
                    transition={{ type: "spring", stiffness: 350, damping: 30 }}
                  />
                )}
                <span className="relative z-10"><cat.icon size={13} /></span>
                <span className="relative z-10">{cat.label.split(" / ")[0]}</span>
              </button>
            )
          })}
        </div>

        {/* Taleplerim / Onay Bekleyenler Hap Sekmeleri */}
        <div className="bg-[--muted-bg] p-1 rounded-full border border-[--line] flex items-center gap-1">
          <button
            type="button"
            onClick={() => setActiveTab("my")}
            className={cn(
              "relative px-4 py-1.5 text-xs rounded-full transition-colors cursor-pointer",
              activeTab === "my"
                ? "text-[--brand] font-medium"
                : "text-[--text-muted] hover:text-[--text]"
            )}
          >
            {activeTab === "my" && (
              <motion.div
                layoutId="requestTabActivePill"
                className="absolute inset-0 bg-white rounded-full shadow-xs"
                transition={{ type: "spring", stiffness: 350, damping: 30 }}
              />
            )}
            <span className="relative z-10">Taleplerim</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("approved-by-me")}
            className={cn(
              "relative px-4 py-1.5 text-xs rounded-full transition-colors cursor-pointer",
              activeTab === "approved-by-me"
                ? "text-[--brand] font-medium"
                : "text-[--text-muted] hover:text-[--text]"
            )}
          >
            {activeTab === "approved-by-me" && (
              <motion.div
                layoutId="requestTabActivePill"
                className="absolute inset-0 bg-white rounded-full shadow-xs"
                transition={{ type: "spring", stiffness: 350, damping: 30 }}
              />
            )}
            <span className="relative z-10">Onay Bekleyenler ({pendingRequestsCount})</span>
          </button>
        </div>
      </div>

      {/* ── Talep Listesi Tablosu (Data Table) ── */}
      <main className="bg-white/80 backdrop-blur-xl border border-[--line] rounded-[20px] shadow-sm overflow-hidden flex flex-col">
        <div className="flex-1 overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-[--line] bg-white text-[--text-muted] text-[11px] uppercase tracking-[0.12em] font-medium">
                <th className="px-5 py-3.5 w-28">Talep ID</th>
                <th className="px-5 py-3.5 w-44">Kategori</th>
                <th className="px-5 py-3.5">Talep Başlığı / Özeti</th>
                <th className="px-5 py-3.5 w-32">Durum</th>
                <th className="px-5 py-3.5 w-40 text-right">Son Güncelleme</th>
                <th className="px-5 py-3.5 w-28 text-center">İşlemler</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/[0.06] text-sm">
              {currentRequests.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-16 text-center text-[--text-muted]">
                    <FolderClosed size={32} className="mx-auto text-zinc-600 mb-3" />
                    <p className="font-medium text-[--text-2]">Talep Bulunamadı</p>
                    <p className="text-xs text-[--text-muted] mt-1">Arama kriterlerinize veya filtrenize uygun talep bulunmamaktadır.</p>
                  </td>
                </tr>
              ) : (
                currentRequests.map((req, idx) => {
                  const cat = CATEGORIES.find(c => c.id === req.category)
                  const CatIcon = cat?.icon ?? FileText
                  return (
                    <motion.tr
                      key={req.id}
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.25, delay: idx * 0.04 }}
                      onClick={() => setDetailItem(req)}
                      className="hover:bg-white transition-colors cursor-pointer group"
                    >
                      <td className="px-5 py-4 font-mono text-xs font-medium text-[--brand] tabular-nums">
                        {req.id}
                      </td>
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-2.5">
                          <div className={cn("size-7 rounded-lg flex items-center justify-center border shrink-0", cat?.color)}>
                            <CatIcon size={14} />
                          </div>
                          <span className="font-normal text-xs text-[--text-2] truncate">{cat?.label}</span>
                        </div>
                      </td>
                      <td className="px-5 py-4 max-w-md">
                        <p className="font-medium text-[--text] truncate group-hover:text-[--brand] transition-colors">
                          {req.title}
                        </p>
                        <p className="text-xs text-[--text-muted] truncate mt-0.5">
                          {req.summary}
                        </p>
                      </td>
                      <td className="px-5 py-4">
                        <span
                          className={cn(
                            "inline-flex items-center text-[11px] font-medium px-2.5 py-0.5 rounded-full",
                            req.status === "pending" && "bg-[var(--warn-soft)] text-[var(--warn)]",
                            req.status === "approved" && "bg-[--brand-soft] text-[--brand]",
                            req.status === "rejected" && "bg-[var(--bad-soft)] text-[var(--bad)]",
                            req.status === "completed" && "bg-[--brand-soft] text-[--brand]"
                          )}
                        >
                          {req.status === "pending" && "Beklemede"}
                          {req.status === "approved" && "Onaylandı"}
                          {req.status === "rejected" && "Reddedildi"}
                          {req.status === "completed" && "Tamamlandı"}
                        </span>
                      </td>
                      <td className="px-5 py-4 text-right font-mono text-xs text-[--text-muted] tabular-nums">
                        {new Date(req.updatedAt).toLocaleDateString("tr-TR", {
                          day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit"
                        })}
                      </td>
                      <td className="px-5 py-4 text-center" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center justify-center gap-1.5">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="size-7 rounded-full hover:bg-white/[0.06] text-[--text-muted] hover:text-[--text]"
                            onClick={() => setDetailItem(req)}
                          >
                            <Eye size={14} />
                          </Button>
                          {req.status === "pending" && (
                            <Button
                              variant="ghost"
                              size="icon"
                              className="size-7 rounded-full hover:bg-[var(--bad-soft)] text-[--text-muted] hover:text-[var(--bad)]"
                              onClick={(e) => handleCancelRequest(req.id, e)}
                            >
                              <Trash2 size={14} />
                            </Button>
                          )}
                        </div>
                      </td>
                    </motion.tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Sayfalama (Pagination) */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between border-t border-[--line] px-5 py-3 bg-white/[0.01] shrink-0">
            <span className="text-xs text-[--text-muted]">
              Toplam {filteredRequests.length} talepten {indexOfFirstRequest + 1}-{Math.min(indexOfLastRequest, filteredRequests.length)} arası gösteriliyor
            </span>
            <div className="flex items-center gap-1.5">
              <Button
                variant="outline"
                size="sm"
                className="h-8 text-xs rounded-full"
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
                    className="size-8 text-xs p-0 rounded-full"
                    onClick={() => setPage(i + 1)}
                  >
                    {i + 1}
                  </Button>
                ))}
              </div>
              <Button
                variant="outline"
                size="sm"
                className="h-8 text-xs rounded-full"
                disabled={page === totalPages}
                onClick={() => setPage(p => p + 1)}
              >
                Sonraki
              </Button>
            </div>
          </div>
        )}
      </main>

      {/* ── İkinci Ekran: Yeni Talep Oluştur Formu (Drawer) ── */}
      {formOpen && (
        <div
          className="fixed inset-0 z-50 flex justify-end bg-[#0B1B33]/40 backdrop-blur-sm transition-opacity duration-300"
          onClick={(e) => { if (e.target === e.currentTarget) setFormOpen(false) }}
        >
          <div className="w-full max-w-xl bg-white text-[--text] border-l border-[--line] h-full flex flex-col shadow-2xl animate-in slide-in-from-right duration-300 text-[--text]">
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-[--line]">
              <div>
                <h2 className="text-lg font-light tracking-tight text-[--text]">Yeni Talep Oluştur</h2>
                <p className="text-xs text-[--text-muted] mt-0.5">Talep detaylarını adım adım girin</p>
              </div>
              <Button variant="ghost" size="icon" className="size-8 rounded-full" onClick={() => setFormOpen(false)}>
                <X size={16} />
              </Button>
            </div>

            {/* İçerik */}
            <div className="flex-1 overflow-y-auto p-6 space-y-6">

              {/* Adım Barı */}
              <div className="flex items-center justify-between text-xs text-[--text-muted] pb-3 border-b border-[--line]">
                <span className={cn("font-medium", formStep === 1 && "text-[--brand]")}>1. Kategori Seçimi</span>
                <ArrowRight size={12} className="text-zinc-600" />
                <span className={cn("font-medium", formStep === 2 && "text-[--brand]")}>2. Detaylı Form</span>
              </div>

              {/* ADIM 1: Kategori Seçimi */}
              {formStep === 1 && (
                <div className="space-y-4">
                  <label className="text-[11px] font-medium text-[--text-muted] uppercase tracking-[0.12em] block">Bir Kategori Seçin</label>
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
                            "flex flex-col items-center justify-center p-5 rounded-[20px] border text-center transition-all gap-3 cursor-pointer",
                            isSelected
                              ? "border-[--brand-line] bg-[--brand-soft] text-[--brand]"
                              : "border-[--line] hover:border-[--line] text-[--text] bg-[--page]"
                          )}
                        >
                          <div className={cn("size-11 rounded-xl flex items-center justify-center border", cat.color)}>
                            <cat.icon size={20} />
                          </div>
                          <span className="text-xs font-medium">{cat.label}</span>
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
                    <span className="text-[11px] font-medium uppercase tracking-[0.12em] text-[--text-muted]">Form Detayları</span>
                    <button
                      onClick={() => setFormStep(1)}
                      className="text-xs text-[--brand] font-medium hover:underline cursor-pointer"
                    >
                      Kategoriyi Değiştir
                    </button>
                  </div>

                  {/* ORTAK ALANLAR */}
                  <div className="space-y-4 border-b border-[--line] pb-5">
                    <div className="space-y-1.5">
                      <label className="text-xs font-medium text-[--text-2]">Talep Başlığı</label>
                      <Input
                        placeholder="Kısa ve açıklayıcı bir başlık girin"
                        value={formTitle}
                        onChange={(e) => setFormTitle(e.target.value)}
                        className="h-10 glass-input"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-xs font-medium text-[--text-2]">Açıklama</label>
                      <textarea
                        placeholder="Talebin detaylarını ve gerekçesini buraya yazın..."
                        value={formDesc}
                        onChange={(e) => setFormDesc(e.target.value)}
                        rows={4}
                        className="w-full glass-input p-3 text-sm outline-none resize-none"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-1.5">
                        <label className="text-xs font-medium text-[--text-2]">Öncelik Seviyesi</label>
                        <select
                          value={formPriority}
                          onChange={(e) => setFormPriority(e.target.value as any)}
                          className="w-full glass-input h-10 px-3 text-sm outline-none"
                        >
                          <option value="Normal" className="bg-white text-[--text]">Normal</option>
                          <option value="Acil" className="bg-white text-[--text]">Acil</option>
                          <option value="Kritik" className="bg-white text-[--text]">Kritik</option>
                        </select>
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-xs font-medium text-[--text-2]">Varsayılan Onaylayıcı</label>
                        <Input value="Hakan Yılmaz (Operasyon Direktörü)" disabled className="h-10 glass-input opacity-60 cursor-not-allowed" />
                      </div>
                    </div>
                  </div>

                  {/* Finans Talebi */}
                  {selectedFormCategory === "finans" && (
                    <div className="space-y-4">
                      <h3 className="text-[11px] font-medium uppercase tracking-[0.12em] text-[--brand]">Finansal Detaylar</h3>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1.5">
                          <label className="text-xs font-medium text-[--text-2]">Tutar (TL)</label>
                          <Input
                            type="number"
                            placeholder="0.00"
                            value={amount}
                            onChange={(e) => setAmount(e.target.value)}
                            className="h-10 glass-input"
                          />
                        </div>
                        <div className="space-y-1.5">
                          <label className="text-xs font-medium text-[--text-2]">Ödeme Neden Tipi</label>
                          <select
                            value={reason}
                            onChange={(e) => setReason(e.target.value)}
                            className="w-full glass-input h-10 px-3 text-sm outline-none"
                          >
                            <option value="Proje Harcamaları" className="bg-white text-[--text]">Proje Harcamaları</option>
                            <option value="Müşteri Ağırlama" className="bg-white text-[--text]">Müşteri Ağırlama</option>
                            <option value="Ofis/Kırtasiye" className="bg-white text-[--text]">Ofis/Kırtasiye</option>
                            <option value="Seyahat/Ulaşım" className="bg-white text-[--text]">Seyahat/Ulaşım</option>
                          </select>
                        </div>
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-xs font-medium text-[--text-2]">Beklenen Ödeme Tarihi</label>
                        <Input
                          type="date"
                          value={expectedDate}
                          onChange={(e) => setExpectedDate(e.target.value)}
                          className="h-10 glass-input"
                        />
                      </div>
                    </div>
                  )}

                  {/* IT Talebi */}
                  {selectedFormCategory === "it" && (
                    <div className="space-y-4">
                      <h3 className="text-[11px] font-medium uppercase tracking-[0.12em] text-[--brand]">IT & Donanım Tercihleri</h3>
                      <div className="space-y-1.5">
                        <label className="text-xs font-medium text-[--text-2]">Cihaz / Yazılım Tipi</label>
                        <select
                          value={hardwareType}
                          onChange={(e) => setHardwareType(e.target.value)}
                          className="w-full glass-input h-10 px-3 text-sm"
                        >
                          <option value="Dizüstü Bilgisayar (Laptop)" className="bg-white text-[--text]">Dizüstü Bilgisayar (Laptop)</option>
                          <option value="Masaüstü Bilgisayar (Workstation)" className="bg-white text-[--text]">Masaüstü Bilgisayar (Workstation)</option>
                          <option value="Yedek Monitör / Ekran" className="bg-white text-[--text]">Yedek Monitör / Ekran</option>
                          <option value="Kulaklık / Donanım Aksesuarı" className="bg-white text-[--text]">Kulaklık / Donanım Aksesuarı</option>
                          <option value="Adobe / Figma Lisans Talebi" className="bg-white text-[--text]">Adobe / Figma Lisans Talebi</option>
                        </select>
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-xs font-medium text-[--text-2]">Tercih Edilen Marka / Model</label>
                        <Input
                          placeholder="Örn: Apple MacBook Pro 16 inç M3 Pro, 36GB RAM"
                          value={brandModel}
                          onChange={(e) => setBrandModel(e.target.value)}
                          className="h-10 glass-input"
                        />
                      </div>
                    </div>
                  )}

                  {/* İzin Talebi */}
                  {selectedFormCategory === "ik" && (
                    <div className="space-y-4">
                      <h3 className="text-[11px] font-medium uppercase tracking-[0.12em] text-[--brand]">İzin Dönemi Planlaması</h3>
                      <div className="space-y-1.5">
                        <label className="text-xs font-medium text-[--text-2]">İzin Türü</label>
                        <select
                          value={leaveType}
                          onChange={(e) => setLeaveType(e.target.value)}
                          className="w-full glass-input h-10 px-3 text-sm"
                        >
                          <option value="Yıllık İzin" className="bg-white text-[--text]">Yıllık İzin</option>
                          <option value="Mazeret İzni" className="bg-white text-[--text]">Mazeret İzni</option>
                          <option value="Sağlık İzni / Rapor" className="bg-white text-[--text]">Sağlık İzni / Rapor</option>
                          <option value="Ücretsiz İzin" className="bg-white text-[--text]">Ücretsiz İzin</option>
                        </select>
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1.5">
                          <label className="text-xs font-medium text-[--text-2]">Başlangıç Tarihi</label>
                          <Input
                            type="date"
                            value={startDate}
                            onChange={(e) => setStartDate(e.target.value)}
                            className="h-10 glass-input"
                          />
                        </div>
                        <div className="space-y-1.5">
                          <label className="text-xs font-medium text-[--text-2]">Bitiş Tarihi</label>
                          <Input
                            type="date"
                            value={endDate}
                            onChange={(e) => setEndDate(e.target.value)}
                            className="h-10 glass-input"
                          />
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1.5">
                          <label className="text-xs font-medium text-[--text-2]">Hesaplanan İzin Günü</label>
                          <Input value={`${daysCount} Gün`} disabled className="h-10 glass-input font-medium" />
                        </div>
                        <div className="space-y-1.5">
                          <label className="text-xs font-medium text-[--text-2]">Vekalet Edilecek Çalışan</label>
                          <select
                            value={proxyEmployee}
                            onChange={(e) => setProxyEmployee(e.target.value)}
                            className="w-full glass-input h-10 px-3 text-sm"
                          >
                            <option value="" className="bg-white text-[--text]">Seçin...</option>
                            <option value="Melis Şen" className="bg-white text-[--text]">Melis Şen (Kreatif Yazar)</option>
                            <option value="Hakan Kara" className="bg-white text-[--text]">Hakan Kara (Geliştirici)</option>
                            <option value="Elif Yıldız" className="bg-white text-[--text]">Elif Yıldız (Hesap Yöneticisi)</option>
                          </select>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* DOSYA YÜKLEME ALANI */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-[--text-2]">Dosya Ekle (Drag & Drop)</label>
                    <div
                      onDragEnter={handleDrag}
                      onDragOver={handleDrag}
                      onDragLeave={handleDrag}
                      onDrop={handleDrop}
                      className={cn(
                        "border border-dashed border-[var(--line-soft)] rounded-[20px] p-6 text-center transition-all cursor-pointer",
                        dragActive ? "border-[--brand-line] bg-[--brand-soft]" : "hover:bg-white"
                      )}
                    >
                      <Paperclip className="mx-auto text-[--text-muted] mb-2" size={18} />
                      <p className="text-xs font-medium text-[--text-2]">Dosyaları buraya sürükleyin veya göz atın</p>
                      <p className="text-[11px] text-[--text-muted] mt-0.5">Maksimum dosya boyutu: 25MB</p>
                    </div>

                    {formFiles.length > 0 && (
                      <div className="flex flex-wrap gap-1.5 mt-2">
                        {formFiles.map((file, idx) => (
                          <Badge key={idx} variant="secondary" className="gap-1 pr-1.5 text-xs bg-white/[0.06] text-[--text] border-0">
                            <span className="truncate max-w-32">{file}</span>
                            <button
                              onClick={() => setFormFiles(prev => prev.filter((_, i) => i !== idx))}
                              className="size-3.5 rounded-full hover:bg-[var(--muted-bg)] flex items-center justify-center shrink-0"
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
              <div className="px-6 py-4 border-t border-[--line] bg-[--page] flex justify-end gap-2.5 shrink-0">
                <Button variant="outline" className="h-9 rounded-full" onClick={() => setFormOpen(false)}>
                  Taslağı Kaydet
                </Button>
                <Button
                  onClick={handleCreateRequest}
                  disabled={!formTitle.trim() || successAnimation}
                  className="h-9 gap-2 bg-gradient-to-r from-[--brand] to-[--blue] hover:from-[--brand-hover] hover:to-[--brand] text-[--text] font-medium rounded-full min-w-32 shadow-sm"
                >
                  {successAnimation ? (
                    <>
                      <CheckCircle2 size={15} className="animate-pulse" />
                      Gönderildi!
                    </>
                  ) : (
                    <>
                      <Send size={14} />
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
          className="fixed inset-0 z-50 flex justify-end bg-[#0B1B33]/40 backdrop-blur-sm transition-opacity duration-300"
          onClick={(e) => { if (e.target === e.currentTarget) setDetailItem(null) }}
        >
          <div className="w-full max-w-xl bg-white text-[--text] border-l border-[--line] h-full flex flex-col shadow-2xl animate-in slide-in-from-right duration-300 text-[--text]">
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-[--line]">
              <div>
                <h2 className="text-lg font-light tracking-tight flex items-center gap-2 text-[--text]">
                  <span>Talep Detayı</span>
                  <span className="font-mono text-xs bg-[--brand-soft] text-[--brand] px-2.5 py-0.5 rounded-full">{detailItem.id}</span>
                </h2>
                <p className="text-xs text-[--text-muted] mt-0.5">Talebin detayları, ekleri ve onay geçmişi</p>
              </div>
              <Button variant="ghost" size="icon" className="size-8 rounded-full" onClick={() => setDetailItem(null)}>
                <X size={16} />
              </Button>
            </div>

            {/* İçerik */}
            <div className="flex-1 overflow-y-auto p-6 space-y-6">

              {/* Temel Bilgi Kartı */}
              <div className="bg-[--page] border border-[--line] p-4 rounded-[20px] space-y-3">
                <div className="flex items-center gap-3">
                  <div className="size-9 rounded-full bg-[--brand-soft] border border-[--brand-line] flex items-center justify-center text-[--brand] font-medium text-xs">
                    {detailItem.requester.name.slice(0, 2).toUpperCase()}
                  </div>
                  <div>
                    <p className="text-sm font-medium text-[--text]">{detailItem.requester.name}</p>
                    <p className="text-xs text-[--text-muted]">{detailItem.requester.role}</p>
                  </div>
                  <span className="ml-auto text-xs px-2.5 py-0.5 rounded-full bg-white/[0.06] text-[--text-2] font-medium">
                    {detailItem.priority}
                  </span>
                </div>
                <div className="h-px w-full bg-white/[0.06]" />
                <div className="grid grid-cols-2 gap-y-2 gap-x-4 text-xs">
                  <div>
                    <span className="text-[--text-muted]">Kategori:</span>
                    <span className="font-medium text-[--text] ml-1.5">
                      {CATEGORIES.find(c => c.id === detailItem.category)?.label}
                    </span>
                  </div>
                  <div>
                    <span className="text-[--text-muted]">Talep Tarihi:</span>
                    <span className="font-medium text-[--text] ml-1.5 tabular-nums">
                      {new Date(detailItem.createdAt).toLocaleDateString("tr-TR")}
                    </span>
                  </div>
                </div>
              </div>

              {/* Detay ve Açıklama */}
              <div className="space-y-2">
                <h3 className="text-[11px] font-medium text-[--text-muted] uppercase tracking-[0.12em]">Talep Başlığı & Açıklaması</h3>
                <h4 className="text-base font-medium text-[--text]">{detailItem.title}</h4>
                <div className="text-sm text-[--text-2] leading-relaxed bg-[--page] p-4 rounded-[20px] border border-[--line] whitespace-pre-line">
                  {detailItem.description}
                </div>
              </div>

              {/* Dinamik Alanlar Gösterimi */}
              {(detailItem.amount || detailItem.hardwareType || detailItem.leaveType) && (
                <div className="bg-[--brand-soft] border border-[--brand-line] p-4 rounded-[20px] space-y-3">
                  <h3 className="text-[11px] font-medium text-[--brand] uppercase tracking-[0.12em]">İşlem Detayları</h3>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    {detailItem.amount && (
                      <>
                        <div>
                          <span className="text-xs text-[--text-muted] block">Talep Edilen Tutar</span>
                          <span className="font-light text-xl text-[--text] tabular-nums">₺{detailItem.amount.toLocaleString("tr-TR")}</span>
                        </div>
                        <div>
                          <span className="text-xs text-[--text-muted] block">Beklenen Ödeme Tarihi</span>
                          <span className="font-medium text-[--text] tabular-nums">{detailItem.expectedDate}</span>
                        </div>
                      </>
                    )}
                    {detailItem.hardwareType && (
                      <>
                        <div>
                          <span className="text-xs text-[--text-muted] block">Donanım Türü</span>
                          <span className="font-medium text-[--text]">{detailItem.hardwareType}</span>
                        </div>
                        <div>
                          <span className="text-xs text-[--text-muted] block">Marka / Model Tercihi</span>
                          <span className="font-medium text-[--text]">{detailItem.brandModel}</span>
                        </div>
                      </>
                    )}
                    {detailItem.leaveType && (
                      <>
                        <div>
                          <span className="text-xs text-[--text-muted] block">İzin Aralığı ({detailItem.daysCount} Gün)</span>
                          <span className="font-medium text-[--text] tabular-nums">{detailItem.startDate} / {detailItem.endDate}</span>
                        </div>
                        <div>
                          <span className="text-xs text-[--text-muted] block">Vekil Çalışan</span>
                          <span className="font-medium text-[--text]">{detailItem.proxyEmployee || "Belirtilmemiş"}</span>
                        </div>
                      </>
                    )}
                  </div>
                </div>
              )}

              {/* Ekli Dosyalar */}
              {detailItem.uploadedFiles.length > 0 && (
                <div className="space-y-2">
                  <h3 className="text-[11px] font-medium text-[--text-muted] uppercase tracking-[0.12em]">Ekli Dosyalar ({detailItem.uploadedFiles.length})</h3>
                  <div className="flex flex-col gap-1.5">
                    {detailItem.uploadedFiles.map((file, idx) => (
                      <div key={idx} className="flex items-center gap-2 p-2.5 bg-[--page] border border-[--line] rounded-xl text-xs">
                        <Paperclip size={13} className="text-[--text-muted]" />
                        <span className="font-medium text-[--text] flex-1 truncate">{file}</span>
                        <button type="button" className="text-[11px] text-[--brand] hover:underline px-2">
                          İndir
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* ── Onay Akışı Görünümü (Workflow Stepper) ── */}
              <div className="space-y-4">
                <h3 className="text-[11px] font-medium text-[--text-muted] uppercase tracking-[0.12em]">Talep Onay Geçmişi & Akışı</h3>
                <div className="relative pl-6 border-l border-[--line] space-y-6">

                  {/* Adım 1: Çalışan (Başlatıldı) */}
                  <div className="relative">
                    <div className="absolute -left-[29px] top-1 size-3 rounded-full bg-[--brand] ring-4 ring-white" />
                    <div>
                      <div className="flex items-center gap-2 text-xs font-medium text-[--text]">
                        <span>Talep Oluşturuldu</span>
                        <span className="text-[11px] font-normal text-[--text-muted] tabular-nums">
                          {new Date(detailItem.createdAt).toLocaleDateString("tr-TR")}
                        </span>
                      </div>
                      <p className="text-xs text-[--text-muted] mt-0.5">
                        {detailItem.requester.name} tarafından süreç başlatıldı.
                      </p>
                    </div>
                  </div>

                  {/* Adım 2: Departman Yöneticisi */}
                  <div className="relative">
                    <div
                      className={cn(
                        "absolute -left-[29px] top-1 size-3 rounded-full ring-4 ring-white",
                        detailItem.status === "pending" && "bg-amber-400",
                        detailItem.status === "approved" && "bg-[--brand]",
                        detailItem.status === "rejected" && "bg-rose-400",
                        detailItem.status === "completed" && "bg-[--brand]"
                      )}
                    />
                    <div>
                      <div className="flex items-center gap-2 text-xs font-medium text-[--text]">
                        <span>Yönetici Onayı</span>
                        <span
                          className={cn(
                            "text-[10px] px-2 py-0.5 rounded-full font-medium",
                            detailItem.status === "pending" && "bg-[var(--warn-soft)] text-[var(--warn)]",
                            (detailItem.status === "approved" || detailItem.status === "completed") && "bg-[--brand-soft] text-[--brand]",
                            detailItem.status === "rejected" && "bg-[var(--bad-soft)] text-[var(--bad)]"
                          )}
                        >
                          {detailItem.status === "pending" ? "Onay Bekliyor" : detailItem.status === "rejected" ? "Reddedildi" : "Onaylandı"}
                        </span>
                      </div>
                      <p className="text-xs text-[--text-muted] mt-0.5">
                        {detailItem.approver}
                      </p>
                      {detailItem.managerComment && (
                        <div className="mt-2 p-3 bg-[--page] rounded-xl border border-[--line] text-xs italic text-[--text-2]">
                          &ldquo;{detailItem.managerComment}&rdquo;
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Adım 3: İlgili Birim Operasyon */}
                  <div className="relative">
                    <div
                      className={cn(
                        "absolute -left-[29px] top-1 size-3 rounded-full ring-4 ring-white",
                        detailItem.status === "completed" ? "bg-[--brand]" : "bg-[var(--muted-bg)]"
                      )}
                    />
                    <div>
                      <div className="flex items-center gap-2 text-xs font-medium text-[--text]">
                        <span>Birim İşlemi & Kapatma</span>
                        {detailItem.status === "completed" && (
                          <span className="text-[10px] px-2 py-0.5 rounded-full bg-[--brand-soft] text-[--brand]">
                            Tamamlandı
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-[--text-muted] mt-0.5">
                        İlgili birim (IT/İK/Muhasebe) tarafından işlemin gerçekleştirilmesi ve kapatılması.
                      </p>
                    </div>
                  </div>

                </div>
              </div>
            </div>

            {/* ── Yönetici Aksiyon Alanı ── */}
            <div className="px-6 py-4 border-t border-[--line] bg-[--page] shrink-0 space-y-4">
              {detailItem.status === "pending" && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between text-[11px] font-medium text-[--text-muted] uppercase tracking-[0.12em]">
                    <span>Yönetici Karar Arayüzü</span>
                    <span className="text-[11px] text-[--brand] normal-case tracking-normal">Lütfen karar verin</span>
                  </div>

                  <div className="flex gap-2.5">
                    <Button
                      variant="outline"
                      className="flex-1 gap-2 border-rose-500/25 bg-[var(--bad-soft)] text-[var(--bad)] hover:bg-[var(--bad-soft)] rounded-full h-9"
                      onClick={() => setRejectOpen(true)}
                    >
                      <ThumbsDown size={14} />
                      Reddet
                    </Button>
                    <Button
                      className="flex-1 gap-2 bg-gradient-to-r from-[--brand] to-[--blue] hover:from-[--brand-hover] hover:to-[--brand] text-[--text] font-medium rounded-full h-9 shadow-sm"
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
                <label className="text-[10px] font-medium text-[--text-muted] uppercase tracking-[0.12em] block">
                  Dahili Notlar (Yalnızca Yönetim Görebilir)
                </label>
                <textarea
                  placeholder="Bu talebe özel dahili notlar ekleyin..."
                  value={internalNote}
                  onChange={(e) => setInternalNote(e.target.value)}
                  rows={2}
                  className="w-full glass-input p-2.5 text-xs outline-none resize-none"
                />
              </div>
            </div>

          </div>
        </div>
      )}

      {/* Red Gerekçe Modalı */}
      <Dialog open={rejectOpen} onOpenChange={setRejectOpen}>
        <DialogContent className="max-w-md glass-panel border-[--line] text-[--text]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-[var(--bad)] font-medium">
              <XCircle size={18} />
              Talebi Reddet
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <p className="text-xs text-[--text-muted]">
              Lütfen talebi reddetme gerekçenizi yazın. Gerekçe çalışana geri bildirim olarak iletilecektir.
            </p>
            <textarea
              placeholder="Ret gerekçesi (zorunlu)..."
              value={rejectComment}
              onChange={(e) => setRejectComment(e.target.value)}
              rows={4}
              className="w-full glass-input p-3 text-sm outline-none"
            />
          </div>
          <DialogFooter>
            <Button variant="outline" className="rounded-full" onClick={() => setRejectOpen(false)}>{tText("common.cancel", "İptal")}</Button>
            <Button
              variant="destructive"
              className="rounded-full"
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
        <DialogContent className="max-w-md glass-panel border-[--line] text-[--text]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-[--brand] font-medium">
              <CheckCircle2 size={18} />
              Talebi Onayla
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <p className="text-xs text-[--text-muted]">
              İsteğe bağlı olarak onay notu veya talimat ekleyebilirsiniz.
            </p>
            <textarea
              placeholder="Onay notu (isteğe bağlı)..."
              value={approveComment}
              onChange={(e) => setApproveComment(e.target.value)}
              rows={4}
              className="w-full glass-input p-3 text-sm outline-none"
            />
          </div>
          <DialogFooter>
            <Button variant="outline" className="rounded-full" onClick={() => setApproveOpen(false)}>{tText("common.cancel", "İptal")}</Button>
            <Button
              className="bg-gradient-to-r from-[--brand] to-[--blue] hover:from-[--brand-hover] hover:to-[--brand] text-[--text] font-medium rounded-full shadow-sm"
              onClick={handleApprove}
            >
              Onayla
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

    </div>
  )
}
