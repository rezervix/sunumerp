"use client"

import { useRouter } from "next/navigation"
import { useLanguage } from "@/lib/context/LanguageContext"
import { useState, useEffect } from "react"
import { toast } from "sonner"
import { useAuth } from "@/lib/auth/context"
import { FilePicker } from "@/components/shared/file-picker"
import { AnimatedNumber } from "@/components/ui/motion-primitives"
import { 
  FileText, Send, Inbox, Clock, CheckCircle2, Search, Plus, 
  Trash, ArrowRight, User, Building, Paperclip, X, RefreshCw 
} from "lucide-react"

interface Branch {
  id: string
  name: string
}

interface FileDelivery {
  id: string
  fromBranchId?: string
  fromBranchName?: string
  fromUserId?: string
  fromUserName?: string
  toBranchId?: string
  toBranchName?: string
  toUserId?: string
  toUserName?: string
  trackingNumber: string
  title: string
  description?: string
  fileUrls: string[]
  status: "sent" | "received" | "acknowledged" | "completed"
  priority: "low" | "normal" | "high" | "urgent"
  sentAt: string
  receivedAt?: string
  completedAt?: string
}

interface User {
  id: string
  name: string
}

interface CreateDeliveryInput {
  fromBranchId?: string
  fromUserId?: string
  toBranchId?: string
  toUserId?: string
  title: string
  description: string
  fileUrls: string[]
  priority: string
}

export default function FilesPage() {
  const { t, tText } = useLanguage()
  const { hasPermission, isSuperAdmin, loading: authLoading, currentBranch, userBranches } = useAuth()
  const router = useRouter()

  useEffect(() => {
    if (!authLoading && !hasPermission("dosyalar", "read") && !isSuperAdmin) {
      router.replace("/dashboard")
    }
  }, [authLoading, hasPermission, isSuperAdmin, router])
  
  const [deliveries, setDeliveries] = useState<FileDelivery[]>([])
  const [branches, setBranches] = useState<Branch[]>([])
  const [users, setUsers] = useState<User[]>([])
  const [searchQuery, setSearchQuery] = useState("")
  const [activeTab, setActiveTab] = useState("all")
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false)
  const [isStatusDialogOpen, setIsStatusDialogOpen] = useState(false)
  const [selectedDelivery, setSelectedDelivery] = useState<FileDelivery | null>(null)
  const [loading, setLoading] = useState(false)
  const [targetType, setTargetType] = useState<"branch" | "user">("branch")

  const [formData, setFormData] = useState<CreateDeliveryInput>({
    fromBranchId: "",
    toBranchId: "",
    toUserId: "",
    title: "",
    description: "",
    fileUrls: [],
    priority: "normal",
  })

  const [statusUpdate, setStatusUpdate] = useState({
    status: "" as FileDelivery["status"],
    notes: "",
  })

  useEffect(() => {
    if (currentBranch) {
      loadData()
      loadBranches()
      loadUsers()
    }
  }, [currentBranch])

  const loadBranches = async () => {
    try {
      const res = await fetch("/api/branches")
      if (res.ok) {
        const data = await res.json()
        setBranches(Array.isArray(data) ? data : [])
      }
    } catch (error) {
      console.error("Error loading branches:", error)
    }
  }

  const loadUsers = async () => {
    try {
      const res = await fetch("/api/users")
      if (res.ok) {
        const data = await res.json()
        setUsers(Array.isArray(data) ? data : [])
      }
    } catch (error) {
      console.error("Error loading users:", error)
    }
  }

  const loadData = async () => {
    if (!currentBranch) return
    setLoading(true)
    try {
      const res = await fetch(`/api/files?branchId=${currentBranch.id}`)
      if (res.ok) {
        const data = await res.json()
        setDeliveries(Array.isArray(data) ? data : [])
      }
    } catch (error) {
      console.error("Error loading deliveries:", error)
    } finally {
      setLoading(false)
    }
  }

  const handleCreate = async () => {
    if (!formData.title || (!formData.toBranchId && !formData.toUserId) || formData.fileUrls.length === 0) {
      toast.error("Lütfen gerekli alanları doldurun")
      return
    }

    setLoading(true)
    try {
      const payload = {
        ...formData,
        fromBranchId: currentBranch?.id,
        toBranchId: targetType === "branch" ? formData.toBranchId : undefined,
        toUserId: targetType === "user" ? formData.toUserId : undefined,
      }

      const res = await fetch("/api/files", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      })

      if (res.ok) {
        await loadData()
        setIsCreateDialogOpen(false)
        resetForm()
        toast.success("Dosya gönderimi başarıyla başlatıldı")
      }
    } catch (error) {
      console.error("Error creating delivery:", error)
      toast.error("Dosya gönderilemedi")
    } finally {
      setLoading(false)
    }
  }

  const handleStatusUpdate = async () => {
    if (!selectedDelivery || !statusUpdate.status) return

    setLoading(true)
    try {
      const res = await fetch("/api/files", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: selectedDelivery.id,
          status: statusUpdate.status,
        }),
      })

      if (res.ok) {
        await loadData()
        setIsStatusDialogOpen(false)
        setSelectedDelivery(null)
        setStatusUpdate({ status: "" as FileDelivery["status"], notes: "" })
        toast.success("Teslimat durumu güncellendi")
      }
    } catch (error) {
      console.error("Error updating delivery:", error)
      toast.error("Durum güncellenemedi")
    } finally {
      setLoading(false)
    }
  }

  const resetForm = () => {
    setFormData({
      fromBranchId: currentBranch?.id || "",
      toBranchId: "",
      toUserId: "",
      title: "",
      description: "",
      fileUrls: [],
      priority: "normal",
    })
    setTargetType("branch")
  }

  const filteredDeliveries = deliveries.filter((delivery) => {
    const matchesSearch =
      delivery.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      delivery.trackingNumber.toLowerCase().includes(searchQuery.toLowerCase())

    if (activeTab === "sent") {
      return matchesSearch && delivery.fromBranchId === currentBranch?.id
    } else if (activeTab === "received") {
      return matchesSearch && (delivery.toBranchId === currentBranch?.id || delivery.toUserId)
    }

    return matchesSearch
  })

  const stats = {
    sent: deliveries.filter((d) => d.fromBranchId === currentBranch?.id).length,
    received: deliveries.filter((d) => d.toBranchId === currentBranch?.id || d.toUserId).length,
    pending: deliveries.filter((d) => d.status === "sent" && (d.toBranchId === currentBranch?.id || d.toUserId)).length,
  }

  const getStatusBadge = (status: FileDelivery["status"]) => {
    switch (status) {
      case "sent":
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-white/5 text-zinc-300 border border-white/10">
            <Send className="w-3 h-3 text-zinc-400" /> Gönderildi
          </span>
        )
      case "received":
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-amber-500/10 text-amber-300 border border-amber-500/20">
            <Inbox className="w-3 h-3 text-amber-400" /> Alındı
          </span>
        )
      case "acknowledged":
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
            <Clock className="w-3 h-3 text-emerald-400" /> Onaylandı
          </span>
        )
      case "completed":
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
            <CheckCircle2 className="w-3 h-3 text-emerald-400" /> Tamamlandı
          </span>
        )
    }
  }

  const getPriorityBadge = (priority: FileDelivery["priority"]) => {
    switch (priority) {
      case "urgent":
        return <span className="text-[10px] font-medium text-rose-300 bg-rose-500/10 border border-rose-500/20 px-2 py-0.5 rounded-full uppercase">Acil</span>
      case "high":
        return <span className="text-[10px] font-medium text-amber-300 bg-amber-500/10 border border-amber-500/20 px-2 py-0.5 rounded-full uppercase">Yüksek</span>
      case "normal":
        return <span className="text-[10px] font-medium text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded-full uppercase">Normal</span>
      default:
        return <span className="text-[10px] font-medium text-zinc-400 bg-white/5 border border-white/10 px-2 py-0.5 rounded-full uppercase">Düşük</span>
    }
  }

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-8 max-w-[1600px] mx-auto text-white">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight text-white flex items-center gap-2.5">
            <FileText className="w-7 h-7 text-emerald-400" />
            Dosya Teslimatı
          </h1>
          <p className="text-xs sm:text-sm text-zinc-400 mt-1">Şubeler ve personeller arası güvenli dosya transferi ve takip sistemi</p>
        </div>
      </div>

      {/* Kutusuz (Borderless) Üst KPI Şeridi */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-8 py-4 border-b border-white/[0.06]">
        <div>
          <div className="flex items-center gap-1.5 text-zinc-400 text-xs font-medium uppercase tracking-wider">
            <Send className="w-3.5 h-3.5 text-emerald-400" />
            Gönderilen Dosyalar
          </div>
          <div className="text-4xl font-light text-white tracking-tight mt-1">
            <AnimatedNumber value={stats.sent} />
          </div>
        </div>

        <div>
          <div className="flex items-center gap-1.5 text-zinc-400 text-xs font-medium uppercase tracking-wider">
            <Inbox className="w-3.5 h-3.5 text-emerald-400" />
            Alınan Dosyalar
          </div>
          <div className="text-4xl font-light text-white tracking-tight mt-1">
            <AnimatedNumber value={stats.received} />
          </div>
        </div>

        <div>
          <div className="flex items-center gap-1.5 text-zinc-400 text-xs font-medium uppercase tracking-wider">
            <Clock className="w-3.5 h-3.5 text-amber-400" />
            Bekleyen Teslimatlar
          </div>
          <div className="text-4xl font-light text-amber-400 tracking-tight mt-1">
            <AnimatedNumber value={stats.pending} />
          </div>
        </div>
      </div>

      {/* Tablo Konteyneri */}
      <div className="bg-[#111513]/90 rounded-[20px] border border-white/[0.06] shadow-xl flex flex-col overflow-hidden">
        <div className="p-4 sm:p-5 border-b border-white/[0.06] flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="flex gap-1 p-1 bg-white/5 border border-white/10 rounded-full">
              <button
                onClick={() => setActiveTab("all")}
                className={`px-4 py-1.5 text-xs font-medium rounded-full transition-all ${activeTab === 'all' ? 'bg-white/10 text-white shadow-sm' : 'text-zinc-400 hover:text-white'}`}
              >
                Tümü
              </button>
              <button
                onClick={() => setActiveTab("sent")}
                className={`px-4 py-1.5 text-xs font-medium rounded-full transition-all ${activeTab === 'sent' ? 'bg-white/10 text-white shadow-sm' : 'text-zinc-400 hover:text-white'}`}
              >
                Gönderilen
              </button>
              <button
                onClick={() => setActiveTab("received")}
                className={`px-4 py-1.5 text-xs font-medium rounded-full transition-all ${activeTab === 'received' ? 'bg-white/10 text-white shadow-sm' : 'text-zinc-400 hover:text-white'}`}
              >
                Alınan
              </button>
            </div>
          </div>
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-500 w-4 h-4" />
              <input
                type="text"
                placeholder="Dosya veya takip no ara..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full sm:w-64 pl-9 pr-4 py-2 bg-white/[0.03] border border-white/10 rounded-full text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-emerald-500/50 transition-all"
              />
            </div>
            <button
              onClick={() => setIsCreateDialogOpen(true)}
              className="inline-flex items-center justify-center gap-1.5 bg-emerald-400 hover:bg-emerald-300 text-black font-semibold px-5 py-2 rounded-full text-xs transition shadow-[0_0_15px_rgba(52,211,153,0.2)] active:scale-95"
            >
              <Plus className="w-4 h-4" />
              Yeni Gönderim
            </button>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-white/[0.02] border-b border-white/[0.06] text-zinc-400 uppercase text-[11px] tracking-wider">
                <th className="px-6 py-4 font-medium">Takip No</th>
                <th className="px-6 py-4 font-medium">Başlık</th>
                <th className="px-6 py-4 font-medium">Gönderen → Alan</th>
                <th className="px-6 py-4 font-medium">Dosyalar</th>
                <th className="px-6 py-4 font-medium">Öncelik</th>
                <th className="px-6 py-4 font-medium">Durum</th>
                <th className="px-6 py-4 text-right font-medium">İşlem</th>
              </tr>
            </thead>
            <tbody>
              {filteredDeliveries.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center text-zinc-500">
                    <FileText className="w-8 h-8 mx-auto mb-2 text-zinc-600" />
                    Kayıtlı dosya transferi bulunamadı.
                  </td>
                </tr>
              ) : (
                filteredDeliveries.map((delivery) => (
                  <tr key={delivery.id} className="border-b border-white/[0.04] border-l-2 border-l-transparent hover:border-l-emerald-400 hover:bg-white/[0.02] transition-colors group">
                    <td className="px-6 py-4">
                      <div className="font-mono text-xs text-zinc-400 bg-white/5 py-1 px-2.5 rounded-lg border border-white/10 inline-block">{delivery.trackingNumber}</div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="font-medium text-white">{delivery.title}</div>
                      {delivery.description && (
                        <div className="text-[11px] text-zinc-500 line-clamp-1 mt-0.5 italic">{delivery.description}</div>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-1.5 text-xs text-zinc-300">
                        <span>{delivery.fromUserName || delivery.fromBranchName}</span>
                        <ArrowRight className="w-3 h-3 text-zinc-600" />
                        <span className="text-emerald-400 font-medium">{delivery.toUserName || delivery.toBranchName}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-1.5 text-xs text-zinc-400">
                        <Paperclip className="w-3.5 h-3.5 text-zinc-500" />
                        {delivery.fileUrls.length} Dosya
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      {getPriorityBadge(delivery.priority)}
                    </td>
                    <td className="px-6 py-4">
                      {getStatusBadge(delivery.status)}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 max-lg:opacity-100 transition-opacity">
                        <button
                          onClick={() => {
                            setSelectedDelivery(delivery)
                            setStatusUpdate({ status: delivery.status, notes: "" })
                            setIsStatusDialogOpen(true)
                          }}
                          className="px-3 py-1 bg-white/5 hover:bg-white/10 text-zinc-300 border border-white/10 rounded-full text-xs font-medium transition"
                        >
                          Durum
                        </button>
                        <button
                          onClick={async () => {
                            if (confirm("Bu teslimatı silmek istediğinize emin misiniz?")) {
                              try {
                                const res = await fetch(`/api/files?id=${delivery.id}`, { method: "DELETE" })
                                if (res.ok) {
                                  loadData()
                                  toast.success("Teslimat silindi")
                                }
                              } catch (error) {
                                console.error("Error deleting delivery:", error)
                                toast.error("Silinemedi")
                              }
                            }
                          }}
                          className="p-1.5 text-zinc-500 hover:text-rose-400 rounded-full transition"
                        >
                          <Trash className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Create Delivery Modal */}
      {isCreateDialogOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in">
          <div className="bg-[#111513] border border-white/[0.06] rounded-[20px] w-full max-w-lg overflow-hidden shadow-2xl flex flex-col max-h-[90vh] text-white">
            <div className="px-6 py-4 border-b border-white/[0.06] flex items-center justify-between">
              <div>
                <h3 className="text-base font-semibold text-white">Yeni Dosya Gönderimi</h3>
                <p className="text-xs text-zinc-400">Şubeye veya personele güvenli dosya paylaşımı başlatın</p>
              </div>
              <button onClick={() => setIsCreateDialogOpen(false)} className="text-zinc-500 hover:text-white p-1">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 overflow-y-auto space-y-4 flex-1">
              <div className="space-y-2">
                <label className="text-xs font-medium text-zinc-400">Alıcı Türü</label>
                <div className="flex gap-2">
                  <button
                    onClick={() => setTargetType("branch")}
                    className={`flex-1 py-2 px-4 rounded-xl text-xs font-medium transition-all border ${targetType === 'branch' ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400' : 'bg-white/[0.02] border-white/10 text-zinc-400'}`}
                  >
                    <Building className="w-3.5 h-3.5 inline mr-1.5" />
                    Şube
                  </button>
                  <button
                    onClick={() => setTargetType("user")}
                    className={`flex-1 py-2 px-4 rounded-xl text-xs font-medium transition-all border ${targetType === 'user' ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400' : 'bg-white/[0.02] border-white/10 text-zinc-400'}`}
                  >
                    <User className="w-3.5 h-3.5 inline mr-1.5" />
                    Personel
                  </button>
                </div>
              </div>

              {targetType === "branch" ? (
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-zinc-400">Hedef Şube *</label>
                  <select
                    value={formData.toBranchId}
                    onChange={(e) => setFormData({ ...formData, toBranchId: e.target.value })}
                    className="w-full px-3.5 py-2.5 bg-[#111513] border border-white/10 rounded-xl text-xs text-white focus:outline-none focus:border-emerald-500/50"
                  >
                    <option value="">Şube seçin</option>
                    {branches
                      .filter((b) => b.id !== currentBranch?.id)
                      .map((branch) => (
                        <option key={branch.id} value={branch.id}>
                          {branch.name}
                        </option>
                      ))}
                  </select>
                </div>
              ) : (
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-zinc-400">Hedef Personel *</label>
                  <select
                    value={formData.toUserId}
                    onChange={(e) => setFormData({ ...formData, toUserId: e.target.value })}
                    className="w-full px-3.5 py-2.5 bg-[#111513] border border-white/10 rounded-xl text-xs text-white focus:outline-none focus:border-emerald-500/50"
                  >
                    <option value="">Personel seçin</option>
                    {users.map((user) => (
                      <option key={user.id} value={user.id}>
                        {user.name}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div className="space-y-1.5">
                <label className="text-xs font-medium text-zinc-400">Başlık *</label>
                <input
                  type="text"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  placeholder="Gönderim konusu..."
                  className="w-full px-3.5 py-2.5 bg-white/[0.03] border border-white/10 rounded-xl text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-emerald-500/50"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-medium text-zinc-400">Açıklama</label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Ek detaylar ve talimatlar..."
                  rows={2}
                  className="w-full px-3.5 py-2.5 bg-white/[0.03] border border-white/10 rounded-xl text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-emerald-500/50 resize-none"
                />
              </div>

              <div className="space-y-1.5">
                <FilePicker
                  label="Dosyalar *"
                  maxFiles={5}
                  onFilesSelected={(urls) => setFormData(prev => ({ ...prev, fileUrls: urls }))}
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-medium text-zinc-400">Öncelik</label>
                <select
                  value={formData.priority}
                  onChange={(e) => setFormData({ ...formData, priority: e.target.value })}
                  className="w-full px-3.5 py-2.5 bg-[#111513] border border-white/10 rounded-xl text-xs text-white focus:outline-none focus:border-emerald-500/50"
                >
                  <option value="low">Düşük</option>
                  <option value="normal">Normal</option>
                  <option value="high">Yüksek</option>
                  <option value="urgent">Acil</option>
                </select>
              </div>
            </div>

            <div className="px-6 py-4 border-t border-white/[0.06] bg-[#0d100e] flex justify-end gap-3 mt-auto">
              <button
                onClick={() => setIsCreateDialogOpen(false)}
                className="px-4 py-2 text-xs font-medium text-zinc-300 hover:text-white border border-white/10 bg-white/5 rounded-full transition-colors"
              >
                Vazgeç
              </button>
              <button
                onClick={handleCreate}
                disabled={loading || !formData.title || (!formData.toBranchId && !formData.toUserId) || formData.fileUrls.length === 0}
                className="px-5 py-2 text-xs font-semibold text-black bg-emerald-400 hover:bg-emerald-300 rounded-full transition shadow-[0_0_15px_rgba(52,211,153,0.2)] disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? "Hazırlanıyor..." : "Gönderimi Başlat"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Status Update Modal */}
      {isStatusDialogOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in">
          <div className="bg-[#111513] border border-white/[0.06] rounded-[20px] w-full max-w-md overflow-hidden shadow-2xl text-white">
            <div className="px-6 py-4 border-b border-white/[0.06] flex items-center justify-between">
              <div>
                <h3 className="text-base font-semibold text-white">Durum Güncelle</h3>
                <p className="text-xs text-zinc-400 font-mono mt-0.5">
                  {selectedDelivery?.trackingNumber}
                </p>
              </div>
              <button onClick={() => setIsStatusDialogOpen(false)} className="text-zinc-500 hover:text-white p-1">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-zinc-400">Yeni Durum</label>
                <select
                  value={statusUpdate.status}
                  onChange={(e) => setStatusUpdate({ ...statusUpdate, status: e.target.value as FileDelivery["status"] })}
                  className="w-full px-3.5 py-2.5 bg-[#111513] border border-white/10 rounded-xl text-xs text-white focus:outline-none focus:border-emerald-500/50"
                >
                  <option value="sent">Gönderildi</option>
                  <option value="received">Alındı</option>
                  <option value="acknowledged">Onaylandı</option>
                  <option value="completed">Tamamlandı</option>
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-medium text-zinc-400">İşlem Notu</label>
                <textarea
                  value={statusUpdate.notes}
                  onChange={(e) => setStatusUpdate({ ...statusUpdate, notes: e.target.value })}
                  placeholder="Değişiklik sebebi veya transfer notu..."
                  rows={3}
                  className="w-full px-3.5 py-2.5 bg-white/[0.03] border border-white/10 rounded-xl text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-emerald-500/50 resize-none"
                />
              </div>
            </div>

            <div className="px-6 py-4 border-t border-white/[0.06] bg-[#0d100e] flex justify-end gap-3">
              <button
                onClick={() => setIsStatusDialogOpen(false)}
                className="px-4 py-2 text-xs font-medium text-zinc-300 hover:text-white border border-white/10 bg-white/5 rounded-full transition-colors"
              >
                Vazgeç
              </button>
              <button
                onClick={handleStatusUpdate}
                disabled={loading || !statusUpdate.status}
                className="px-5 py-2 text-xs font-semibold text-black bg-emerald-400 hover:bg-emerald-300 rounded-full transition shadow-[0_0_15px_rgba(52,211,153,0.2)] disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? "Kaydediliyor..." : "Durumu Kaydet"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
