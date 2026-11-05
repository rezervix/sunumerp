"use client"

import { useRouter } from "next/navigation"
import { useLanguage } from "@/lib/context/LanguageContext"
import { useState, useEffect, useRef } from "react"
import { motion } from "framer-motion"
import { toast } from "sonner"
import { useAuth } from "@/lib/auth/context"
import { ContextualHelp } from "@/components/shared/contextual-help"
import { mockDatabase } from "@/lib/data/mockDatabase"

const statusColors = {
  pending: {
    bg: "bg-amber-500/15 text-amber-300 border border-amber-500/30",
    icon: "schedule"
  },
  approved: {
    bg: "bg-sky-500/15 text-sky-300 border border-sky-500/30",
    icon: "check_circle"
  },
  "in-progress": {
    bg: "bg-purple-500/15 text-purple-300 border border-purple-500/30",
    icon: "loop"
  },
  delivered: {
    bg: "bg-emerald-500/15 text-emerald-300 border border-emerald-500/30",
    icon: "task_alt"
  },
  rejected: {
    bg: "bg-rose-500/15 text-rose-300 border border-rose-500/30",
    icon: "cancel"
  },
}

const statusLabels: Record<string, string> = {
  pending: "Bekliyor",
  approved: "Onaylandi",
  "in-progress": "Islemde",
  delivered: "Teslim Edildi",
  rejected: "Reddedildi",
}

const priorityColors = {
  low: { bg: "bg-slate-500/15 text-slate-300 border border-slate-500/30", label: "Dusuk" },
  normal: { bg: "bg-sky-500/15 text-sky-300 border border-sky-500/30", label: "Normal" },
  high: { bg: "bg-amber-500/15 text-amber-300 border border-amber-500/30", label: "Yuksek" },
  urgent: { bg: "bg-rose-500/15 text-rose-300 border border-rose-500/30", label: "Acil" },
}

interface BranchOrder {
  id: string
  branchId: string
  orderNumber: string
  title: string
  description?: string
  orderType: string
  quantity?: number
  priority: "low" | "normal" | "high" | "urgent"
  status: "pending" | "approved" | "in-progress" | "delivered" | "rejected"
  paymentStatus: "paid" | "unpaid" | "partial"
  totalAmount?: number
  customerName?: string
  companyName?: string
  customerPhone?: string
  files?: string // JSON array of file objects
  orderDate: string
  customerId?: string
  customer?: { id: string; name: string; company?: string }
}

interface FileData {
  name: string
  url: string
  type: string
  size: number
}

interface CreateOrderInput {
  branchId: string
  orderType: string
  title: string
  description: string
  quantity?: number
  priority: string
  customerId?: string
  orderNumber: string
  orderDate: string
  paymentStatus: string
  totalAmount?: number
  customerName: string
  companyName: string
  customerPhone: string
  files: FileData[]
}

export default function OrdersPage() {
  const { t, tText } = useLanguage()
  const { hasPermission, isSuperAdmin, loading: authLoading, currentBranch } = useAuth()
  const router = useRouter()

  const [orders, setOrders] = useState<BranchOrder[]>(() => mockDatabase.getOrders() as any)
  const [loading, setLoading] = useState(false)
  const [searchQuery, setSearchQuery] = useState("")
  const [statusFilter, setStatusFilter] = useState("all")
  
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false)
  const [editOrderId, setEditOrderId] = useState<string | null>(null)
  const [selectedOrder, setSelectedOrder] = useState<BranchOrder | null>(null)
  const [isStatusDialogOpen, setIsStatusDialogOpen] = useState(false)
  
  const [customers, setCustomers] = useState<{id: string, name: string, company?: string}[]>(() => mockDatabase.getCustomers() as any)

  useEffect(() => {
    const handleDbChange = () => {
      setOrders(mockDatabase.getOrders() as any)
      setCustomers(mockDatabase.getCustomers() as any)
    }
    window.addEventListener("sunum-mockdb-change", handleDbChange)
    return () => window.removeEventListener("sunum-mockdb-change", handleDbChange)
  }, [])
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [isUploading, setIsUploading] = useState(false)

  const [formData, setFormData] = useState<CreateOrderInput>({
    branchId: "",
    orderType: "",
    title: "",
    description: "",
    priority: "normal",
    orderNumber: "",
    orderDate: new Date().toISOString().split('T')[0],
    paymentStatus: "unpaid",
    customerName: "",
    companyName: "",
    customerPhone: "",
    files: []
  })
  
  const [statusUpdate, setStatusUpdate] = useState({ status: "pending" as BranchOrder["status"], notes: "" })

  useEffect(() => {
    if (!authLoading && !hasPermission("orders", "read") && !isSuperAdmin) {
      router.replace("/dashboard")
    }
  }, [authLoading, hasPermission, isSuperAdmin, router])

  useEffect(() => {
    if (currentBranch?.id) {
      loadOrders()
      loadCustomers()
    }
  }, [currentBranch])

  const loadOrders = async () => {
    try {
      const branchId = currentBranch?.id || "local-debug-branch"
      const res = await fetch(`/api/orders?branchId=${branchId}&take=100`)
      if (res.ok) {
        const json = await res.json()
        const list = json.data || json
        if (Array.isArray(list) && list.length > 0) {
          setOrders(list)
        } else {
          setOrders(mockDatabase.getOrders() as any)
        }
      } else {
        setOrders(mockDatabase.getOrders() as any)
      }
    } catch {
      setOrders(mockDatabase.getOrders() as any)
    } finally {
      setLoading(false)
    }
  }

  const loadCustomers = async () => {
    try {
      const branchId = currentBranch?.id || "local-debug-branch"
      const res = await fetch(`/api/customers?branchId=${branchId}`)
      if (res.ok) {
        const json = await res.json()
        const list = json.data || json
        if (Array.isArray(list) && list.length > 0) {
          setCustomers(list)
        } else {
          setCustomers(mockDatabase.getCustomers() as any)
        }
      } else {
        setCustomers(mockDatabase.getCustomers() as any)
      }
    } catch {
      setCustomers(mockDatabase.getCustomers() as any)
    }
  }

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement> | React.DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    let filesToUpload: FileList | File[] | null = null
    
    if ('dataTransfer' in e) {
        filesToUpload = e.dataTransfer.files
    } else if (e.target && 'files' in e.target) {
        filesToUpload = (e.target as HTMLInputElement).files
    }

    if (!filesToUpload || filesToUpload.length === 0) return

    setIsUploading(true)
    const uploadData = new FormData()
    Array.from(filesToUpload).forEach(file => {
      uploadData.append("files", file)
    })

    try {
      const res = await fetch('/api/upload', {
        method: 'POST',
        body: uploadData
      })
      
      if (res.ok) {
        const data = await res.json()
        const newFiles: FileData[] = Array.from(filesToUpload).map((file, idx) => ({
          name: file.name,
          url: data.urls[idx],
          type: file.type || "application/octet-stream",
          size: file.size
        }))
        
        setFormData(prev => ({
          ...prev,
          files: [...prev.files, ...newFiles]
        }))
        toast.success(`${newFiles.length} dosya başarıyla yüklendi`)
      } else {
        toast.error("Dosya yüklenemedi")
      }
    } catch (error) {
      console.error("Upload error:", error)
      toast.error("Dosya yükleme hatası")
    } finally {
      setIsUploading(false)
      if (fileInputRef.current) {
        fileInputRef.current.value = ""
      }
    }
  }

  const removeFile = (index: number) => {
    setFormData(prev => ({
      ...prev,
      files: prev.files.filter((_, i) => i !== index)
    }))
  }

  const handleSubmit = async () => {
    try {
      setLoading(true)
      const method = editOrderId ? "PUT" : "POST"
      const bodyData = editOrderId 
        ? { ...formData, id: editOrderId }
        : { ...formData, branchId: currentBranch?.id }

      const res = await fetch("/api/orders", {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(bodyData)
      })

      if (res.ok) {
        toast.success(editOrderId ? "Sipariş başarıyla güncellendi" : "Sipariş başarıyla oluşturuldu")
        setIsCreateDialogOpen(false)
        setEditOrderId(null)
        setFormData({
          branchId: "",
          orderType: "",
          title: "",
          description: "",
          priority: "normal",
          orderNumber: "",
          orderDate: new Date().toISOString().split('T')[0],
          paymentStatus: "unpaid",
          customerName: "",
          companyName: "",
          customerPhone: "",
          files: []
        })
        loadOrders()
      } else {
        const err = await res.json()
        toast.error(err.error || "İşlem başarısız oldu")
      }
    } catch (error) {
      console.error("Submit order error:", error)
      toast.error("İşlem sırasında beklenmeyen bir hata oluştu")
    } finally {
      setLoading(false)
    }
  }

  const handleStatusUpdate = async () => {
    if (!selectedOrder) return
    try {
      setLoading(true)
      const res = await fetch("/api/orders", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: selectedOrder.id, status: statusUpdate.status, notes: statusUpdate.notes })
      })

      if (res.ok) {
        toast.success("Durum güncellendi")
        setIsStatusDialogOpen(false)
        loadOrders()
      } else {
        toast.error("Durum güncellenemedi")
      }
    } catch (error) {
      console.error("Update status error:", error)
      toast.error("Durum güncellenirken bir hata oluştu")
    } finally {
      setLoading(false)
    }
  }

  const filteredOrders = orders.filter(order => {
    const matchesSearch = 
      order.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
      (order.orderNumber && order.orderNumber.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (order.customerName && order.customerName.toLowerCase().includes(searchQuery.toLowerCase()))
      
    const matchesStatus = statusFilter === "all" || order.status === statusFilter
    return matchesSearch && matchesStatus
  })

  const stats = {
    total: orders.length,
    pending: orders.filter((o) => o.status === "pending").length,
    inProgress: orders.filter((o) => o.status === "in-progress").length,
    delivered: orders.filter((o) => o.status === "delivered").length,
  }

  return (
    <div className="space-y-6">

      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-6">
        <div>
          <h1 className="text-3xl lg:text-4xl font-bold text-white tracking-tight flex items-center gap-2">
            Sipariş Yönetimi
            <ContextualHelp />
          </h1>
          <p className="text-white/60 mt-1.5 text-sm">Şube içi siparişlerinizi takip edin ve yönetin</p>
        </div>
        <button
          onClick={() => {
            setEditOrderId(null)
            setFormData({
              branchId: "", orderType: "", title: "", description: "", priority: "normal", orderNumber: "",
              orderDate: new Date().toISOString().split('T')[0], paymentStatus: "unpaid", customerName: "", companyName: "", customerPhone: "", files: [], customerId: ""
            })
            setIsCreateDialogOpen(true)
          }}
          className="w-full sm:w-auto flex items-center justify-center gap-2 px-5 py-2.5 bg-gradient-to-r from-indigo-500 to-blue-600 hover:from-indigo-600 hover:to-blue-700 text-white rounded-xl text-sm font-semibold shadow-lg shadow-indigo-500/20 border border-white/15 transition-all"
        >
          <span className="material-symbols-outlined text-[18px]">add</span>
          <span>Yeni Sipariş</span>
        </button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 lg:gap-5">
        <motion.div
          whileHover={{ y: -4 }}
          className="glass-card p-6 rounded-2xl relative overflow-hidden group"
        >
          <div className="flex items-center justify-between mb-3">
            <p className="text-sm text-white/60 font-medium">Toplam Sipariş</p>
            <div className="w-9 h-9 rounded-xl bg-sky-500/15 border border-sky-500/30 flex items-center justify-center text-sky-400">
              <span className="material-symbols-outlined text-[18px]">shopping_bag</span>
            </div>
          </div>
          <p className="text-2xl lg:text-3xl font-bold text-white mt-1">{stats.total}</p>
        </motion.div>

        <motion.div
          whileHover={{ y: -4 }}
          className="glass-card p-6 rounded-2xl relative overflow-hidden group"
        >
          <div className="flex items-center justify-between mb-3">
            <p className="text-sm text-white/60 font-medium">Bekleyen</p>
            <div className="w-9 h-9 rounded-xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-400">
              <span className="material-symbols-outlined text-[18px]">schedule</span>
            </div>
          </div>
          <p className="text-2xl lg:text-3xl font-bold text-amber-400 mt-1">{stats.pending}</p>
        </motion.div>

        <motion.div
          whileHover={{ y: -4 }}
          className="glass-card p-6 rounded-2xl relative overflow-hidden group"
        >
          <div className="flex items-center justify-between mb-3">
            <p className="text-sm text-white/60 font-medium">İşlemde</p>
            <div className="w-9 h-9 rounded-xl bg-purple-500/15 border border-purple-500/30 flex items-center justify-center text-purple-400">
              <span className="material-symbols-outlined text-[18px]">loop</span>
            </div>
          </div>
          <p className="text-2xl lg:text-3xl font-bold text-purple-400 mt-1">{stats.inProgress}</p>
        </motion.div>

        <motion.div
          whileHover={{ y: -4 }}
          className="glass-card p-6 rounded-2xl relative overflow-hidden group"
        >
          <div className="flex items-center justify-between mb-3">
            <p className="text-sm text-white/60 font-medium">Teslim Edildi</p>
            <div className="w-9 h-9 rounded-xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
              <span className="material-symbols-outlined text-[18px]">task_alt</span>
            </div>
          </div>
          <p className="text-2xl lg:text-3xl font-bold text-emerald-400 mt-1">{stats.delivered}</p>
        </motion.div>
      </div>

      {/* Orders Table */}
      <div className="glass-table-container overflow-hidden">
        <div className="p-5 lg:p-6 border-b border-white/10 bg-white/[0.02]">
          <div className="flex flex-col gap-4 lg:flex-row lg:justify-between lg:items-center">

            <div className="relative w-full lg:max-w-xs">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-white/40">
                <span className="material-symbols-outlined text-[20px]">search</span>
              </div>
              <input
                type="text"
                placeholder="Sipariş, müşteri veya ürün ara..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="glass-input block w-full pl-11 pr-4 py-2.5 text-sm outline-none transition-all"
              />
            </div>

            <div className="flex gap-2 w-full lg:w-auto">
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="glass-input flex-1 lg:flex-none px-4 py-2.5 text-sm outline-none transition-all"
              >
                <option value="all" className="bg-slate-900 text-white">Tüm Durumlar</option>
                <option value="pending" className="bg-slate-900 text-white">Bekleyen</option>
                <option value="approved" className="bg-slate-900 text-white">Onaylandı</option>
                <option value="in-progress" className="bg-slate-900 text-white">İşlemde</option>
                <option value="delivered" className="bg-slate-900 text-white">Teslim Edildi</option>
                <option value="rejected" className="bg-slate-900 text-white">Reddedildi</option>
              </select>
              <button className="px-4 py-2.5 flex items-center justify-center gap-2 bg-white/5 border border-white/10 rounded-xl text-sm font-medium text-white/80 hover:bg-white/10 hover:text-white transition-colors shrink-0">
                <span className="material-symbols-outlined text-[18px]">filter_list</span>
                <span className="hidden sm:inline">{tText("common.filter", "Filtrele")}</span>
              </button>
            </div>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-sm">
            <thead>
              <tr className="bg-white/[0.03] border-b border-white/10 text-xs uppercase tracking-wider text-white/50 font-semibold">
                <th className="px-5 lg:px-6 py-4">Sipariş No</th>
                <th className="px-5 lg:px-6 py-4">Başlık / Müşteri</th>
                <th className="px-5 lg:px-6 py-4">Tür</th>
                <th className="px-5 lg:px-6 py-4">Fiyat / Ödeme</th>
                <th className="px-5 lg:px-6 py-4">Öncelik</th>
                <th className="px-5 lg:px-6 py-4">Durum</th>
                <th className="px-5 lg:px-6 py-4">Tarih</th>
                <th className="px-5 lg:px-6 py-4 text-right">İşlem</th>
              </tr>
            </thead>
            <tbody className="text-sm">
              {filteredOrders.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-5 lg:px-6 py-12 text-center">
                    <div className="flex flex-col items-center gap-2">
                      <span className="material-symbols-outlined text-4xl text-white/25">inbox</span>
                      <p className="text-white/50 font-medium">Gösterilecek sipariş bulunamadı</p>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredOrders.map((order) => {
                  const statusConfig = statusColors[order.status]
                  const priorityConfig = priorityColors[order.priority]

                  return (
                    <tr key={order.id} className="border-b border-white/5 hover:bg-white/[0.04] transition-colors group">
                      <td className="px-5 lg:px-6 py-4 font-mono text-white font-semibold">
                        {order.orderNumber}
                      </td>
                      <td className="px-5 lg:px-6 py-4">
                        <div className="font-medium text-white">{order.title}</div>
                        {(order.customer || order.customerName) && (
                          <div className="text-sky-400 text-xs mt-1 flex items-center gap-1 font-semibold">
                            <span className="material-symbols-outlined text-[12px]">person</span> 
                            {order.customer?.name || order.customerName} {order.customer?.company || order.companyName ? `(${order.customer?.company || order.companyName})` : ""}
                          </div>
                        )}
                        {order.description && (
                          <div className="text-white/50 text-xs mt-1 line-clamp-1">{order.description}</div>
                        )}
                      </td>
                      <td className="px-5 lg:px-6 py-4 text-white/70">
                        {order.orderType}
                      </td>
                      <td className="px-5 lg:px-6 py-4">
                        <div className="font-semibold text-white">
                          {order.totalAmount ? `${order.totalAmount.toLocaleString("tr-TR")} ₺` : "-"}
                        </div>
                        <div className={`text-xs mt-1 font-medium ${order.paymentStatus === 'paid' ? 'text-emerald-400' : order.paymentStatus === 'partial' ? 'text-amber-400' : 'text-rose-400'}`}>
                          {order.paymentStatus === 'paid' ? 'Ödendi' : order.paymentStatus === 'partial' ? 'Kısmi Ödeme' : 'Ödenmedi'}
                        </div>
                      </td>
                      <td className="px-5 lg:px-6 py-4">
                        <span className={`inline-flex items-center rounded-full px-3 py-0.5 text-xs font-medium ${priorityConfig.bg}`}>
                          {priorityConfig.label}
                        </span>
                      </td>
                      <td className="px-5 lg:px-6 py-4">
                        <span className={`inline-flex items-center gap-1.5 rounded-full px-3 py-0.5 text-xs font-medium ${statusConfig.bg}`}>
                          <span className="material-symbols-outlined text-[14px]">
                            {statusConfig.icon}
                          </span>
                          {statusLabels[order.status]}
                        </span>
                      </td>
                      <td className="px-5 lg:px-6 py-4 text-white/60 text-sm">
                        {new Date(order.orderDate).toLocaleDateString("tr-TR")}
                      </td>
                      <td className="px-5 lg:px-6 py-4 text-right">
                        <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 max-lg:opacity-100 transition-opacity">
                          <button
                            onClick={() => window.open(`/dashboard/orders/${order.id}/print`, "_blank")}
                            className="p-2 text-white/60 hover:text-sky-300 hover:bg-sky-500/15 rounded-lg transition-colors flex items-center justify-center"
                            title="Yazdır"
                          >
                            <span className="material-symbols-outlined text-[20px]">print</span>
                          </button>
                          <button
                            onClick={() => {
                              setEditOrderId(order.id)
                              setFormData({
                                branchId: order.branchId,
                                orderType: order.orderType,
                                title: order.title,
                                description: order.description || "",
                                priority: order.priority,
                                orderNumber: order.orderNumber || "",
                                orderDate: order.orderDate ? new Date(order.orderDate).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
                                paymentStatus: order.paymentStatus || "unpaid",
                                totalAmount: order.totalAmount || undefined,
                                customerName: order.customerName || "",
                                companyName: order.companyName || "",
                                customerPhone: order.customerPhone || "",
                                customerId: order.customerId || "",
                                files: order.files && typeof order.files === "string" ? JSON.parse(order.files) : []
                              })
                              setIsCreateDialogOpen(true)
                            }}
                            className="p-2 text-white/60 hover:text-emerald-300 hover:bg-emerald-500/15 rounded-lg transition-colors flex items-center justify-center"
                            title="Düzenle"
                          >
                            <span className="material-symbols-outlined text-[20px]">edit</span>
                          </button>
                          <button
                            onClick={() => {
                              setSelectedOrder(order)
                              setStatusUpdate({ status: order.status, notes: "" })
                              setIsStatusDialogOpen(true)
                            }}
                            className="p-2 text-white/60 hover:text-indigo-300 hover:bg-indigo-500/15 rounded-lg transition-colors flex items-center justify-center"
                            title="Durum Güncelle"
                          >
                            <span className="material-symbols-outlined text-[20px]">edit_note</span>
                          </button>
                          <button
                            onClick={async () => {
                              if (confirm("Bu siparişi silmek istediğinize emin misiniz?")) {
                                try {
                                  const res = await fetch(`/api/orders?id=${order.id}`, { method: "DELETE" })
                                  if (res.ok) {
                                    loadOrders()
                                  }
                                } catch (error) {
                                  console.error("Error deleting order:", error)
                                }
                              }
                            }}
                            className="p-2 text-white/60 hover:text-rose-300 hover:bg-rose-500/15 rounded-lg transition-colors flex items-center justify-center"
                            title="Sil"
                          >
                            <span className="material-symbols-outlined text-[20px]">delete</span>
                          </button>
                        </div>
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {isCreateDialogOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-md p-4 overflow-y-auto">
          <div className="backdrop-blur-xl bg-slate-900/90 border border-white/15 rounded-2xl w-full max-w-3xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200 my-8">

            <div className="flex items-center justify-between p-6 border-b border-white/10 bg-white/[0.02] sticky top-0 z-10">
              <h2 className="text-xl font-bold text-white">{editOrderId ? "Siparişi Düzenle" : "Yeni Sipariş Oluştur"}</h2>
              <button
                onClick={() => setIsCreateDialogOpen(false)}
                className="p-2 text-white/60 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
              >
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>

            <div className="p-6 space-y-6 max-h-[70vh] overflow-y-auto custom-scrollbar">
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label htmlFor="orderNumber" className="block text-sm font-semibold text-white/80">Sipariş Numarası</label>
                  <input
                    id="orderNumber"
                    type="text"
                    value={formData.orderNumber}
                    onChange={(e) => setFormData({ ...formData, orderNumber: e.target.value })}
                    placeholder="Otomatik Oluşturulacak"
                    className="glass-input block w-full px-4 py-2.5 outline-none transition-all text-sm"
                  />
                  <p className="text-[11px] text-white/40">Boş bırakılırsa sistem otomatik atar.</p>
                </div>
                
                <div className="space-y-2">
                  <label htmlFor="orderDate" className="block text-sm font-semibold text-white/80">Sipariş Tarihi *</label>
                  <input
                    id="orderDate"
                    type="date"
                    value={formData.orderDate}
                    onChange={(e) => setFormData({ ...formData, orderDate: e.target.value })}
                    className="glass-input block w-full px-4 py-2.5 outline-none transition-all text-sm"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label htmlFor="title" className="block text-sm font-semibold text-white/80">Sipariş Başlığı *</label>
                <input
                  id="title"
                  type="text"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  placeholder="500 Adet Kartvizit"
                  className="glass-input block w-full px-4 py-2.5 outline-none transition-all text-sm"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label htmlFor="orderType" className="block text-sm font-semibold text-white/80">Sipariş Türü *</label>
                  <div className="relative">
                    <select
                      id="orderType"
                      value={formData.orderType}
                      onChange={(e) => setFormData({ ...formData, orderType: e.target.value })}
                      className="glass-input block w-full px-4 py-2.5 outline-none transition-all text-sm appearance-none pr-10"
                    >
                      <option value="" disabled className="bg-slate-900 text-white/60">Tür seçin</option>
                      <option value="Baskı Malzemeleri" className="bg-slate-900 text-white">Baskı Malzemeleri</option>
                      <option value="Tasarım Hizmeti" className="bg-slate-900 text-white">Tasarım Hizmeti</option>
                      <option value="Ofis Malzemeleri" className="bg-slate-900 text-white">Ofis Malzemeleri</option>
                      <option value="Dijital Hizmet" className="bg-slate-900 text-white">Dijital Hizmet</option>
                      <option value="Diğer" className="bg-slate-900 text-white">Diğer</option>
                    </select>
                    <div className="absolute inset-y-0 right-0 py-2 pr-3 flex items-center pointer-events-none text-white/40">
                      <span className="material-symbols-outlined text-[20px]">expand_more</span>
                    </div>
                  </div>
                </div>

                <div className="space-y-2">
                  <label htmlFor="customerId" className="block text-sm font-semibold text-white/80">Kayıtlı Müşteri Seç</label>
                  <div className="relative">
                    <select
                      id="customerId"
                      value={formData.customerId || ""}
                      onChange={(e) => setFormData({ ...formData, customerId: e.target.value })}
                      className="glass-input block w-full px-4 py-2.5 outline-none transition-all text-sm appearance-none pr-10"
                    >
                      <option value="" className="bg-slate-900 text-white">Bağımsız Sipariş (Aşağıdan Doldurun)</option>
                      {customers.map(c => (
                        <option key={c.id} value={c.id} className="bg-slate-900 text-white">{c.name} {c.company ? `(${c.company})` : ""}</option>
                      ))}
                    </select>
                    <div className="absolute inset-y-0 right-0 py-2 pr-3 flex items-center pointer-events-none text-white/40">
                      <span className="material-symbols-outlined text-[20px]">expand_more</span>
                    </div>
                  </div>
                </div>
              </div>

              {!formData.customerId && (
                <div className="p-4 rounded-xl border border-white/10 bg-white/[0.03] space-y-4">
                  <h3 className="text-sm font-semibold text-white">Hızlı Müşteri Bilgileri</h3>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="space-y-2">
                      <label className="block text-xs font-semibold text-white/60">Ad Soyad</label>
                      <input
                        type="text"
                        value={formData.customerName}
                        onChange={(e) => setFormData({ ...formData, customerName: e.target.value })}
                        placeholder="Örn: Ahmet Yılmaz"
                        className="glass-input block w-full px-3 py-2 text-sm outline-none"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="block text-xs font-semibold text-white/60">Firma Adı</label>
                      <input
                        type="text"
                        value={formData.companyName}
                        onChange={(e) => setFormData({ ...formData, companyName: e.target.value })}
                        placeholder="Örn: ABC A.Ş."
                        className="glass-input block w-full px-3 py-2 text-sm outline-none"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="block text-xs font-semibold text-white/60">Telefon</label>
                      <input
                        type="text"
                        value={formData.customerPhone}
                        onChange={(e) => setFormData({ ...formData, customerPhone: e.target.value })}
                        placeholder="+90 555 123 4567"
                        className="glass-input block w-full px-3 py-2 text-sm outline-none"
                      />
                    </div>
                  </div>
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="space-y-2">
                  <label htmlFor="totalAmount" className="block text-sm font-semibold text-white/80">Fiyat (₺)</label>
                  <input
                    id="totalAmount"
                    type="number"
                    value={formData.totalAmount || ""}
                    onChange={(e) => setFormData({ ...formData, totalAmount: Number.parseFloat(e.target.value) || undefined })}
                    placeholder="0.00"
                    step="0.01"
                    className="glass-input block w-full px-4 py-2.5 outline-none transition-all text-sm"
                  />
                </div>
                
                <div className="space-y-2">
                  <label htmlFor="paymentStatus" className="block text-sm font-semibold text-white/80">Ödeme Durumu</label>
                  <div className="relative">
                    <select
                      id="paymentStatus"
                      value={formData.paymentStatus}
                      onChange={(e) => setFormData({ ...formData, paymentStatus: e.target.value })}
                      className="glass-input block w-full px-4 py-2.5 outline-none transition-all text-sm appearance-none pr-10"
                    >
                      <option value="unpaid" className="bg-slate-900 text-white">Ödenmedi</option>
                      <option value="partial" className="bg-slate-900 text-white">Kısmi Ödeme</option>
                      <option value="paid" className="bg-slate-900 text-white">Ödendi</option>
                    </select>
                    <div className="absolute inset-y-0 right-0 py-2 pr-3 flex items-center pointer-events-none text-white/40">
                      <span className="material-symbols-outlined text-[20px]">expand_more</span>
                    </div>
                  </div>
                </div>

                <div className="space-y-2">
                  <label htmlFor="quantity" className="block text-sm font-semibold text-white/80">Miktar</label>
                  <input
                    id="quantity"
                    type="number"
                    value={formData.quantity || ""}
                    onChange={(e) => setFormData({ ...formData, quantity: Number.parseInt(e.target.value) || undefined })}
                    placeholder="100"
                    className="glass-input block w-full px-4 py-2.5 outline-none transition-all text-sm"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label htmlFor="description" className="block text-sm font-semibold text-white/80">Müşteri Notu</label>
                <textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Müşteri talepleri veya sipariş detayları..."
                  rows={3}
                  className="glass-input block w-full px-4 py-2.5 outline-none transition-all text-sm resize-none"
                />
              </div>

              <div className="space-y-2">
                <label className="block text-sm font-semibold text-white/80">Dosyalar</label>
                <div 
                  className="border-2 border-dashed border-white/15 hover:border-indigo-400/50 transition-colors rounded-xl p-8 flex flex-col items-center justify-center bg-white/[0.02] cursor-pointer"
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={handleFileUpload}
                  onClick={() => fileInputRef.current?.click()}
                >
                  <span className="material-symbols-outlined text-4xl text-white/40 mb-3">cloud_upload</span>
                  <p className="text-sm font-medium text-white">Dosyaları sürükleyip bırakın</p>
                  <p className="text-xs text-white/50 mt-1">veya seçmek için tıklayın</p>
                  <input 
                    type="file" 
                    ref={fileInputRef} 
                    className="hidden" 
                    multiple 
                    onChange={handleFileUpload} 
                  />
                  {isUploading && (
                    <div className="mt-4 flex items-center gap-2 text-sm text-indigo-400 font-medium">
                      <span className="material-symbols-outlined animate-spin text-[18px]">progress_activity</span>
                      Yükleniyor...
                    </div>
                  )}
                </div>
                
                {formData.files.length > 0 && (
                  <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {formData.files.map((f, idx) => (
                      <div key={idx} className="flex items-center justify-between p-3 bg-white/5 border border-white/10 rounded-xl">
                        <div className="flex items-center gap-3 overflow-hidden">
                          <span className="material-symbols-outlined text-indigo-400 shrink-0">draft</span>
                          <div className="overflow-hidden">
                            <p className="text-sm font-medium text-white truncate">{f.name}</p>
                            <p className="text-[10px] text-white/50">{(f.size / 1024).toFixed(1)} KB</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-1 shrink-0 ml-2">
                          <a 
                            href={f.url} 
                            target="_blank" 
                            rel="noreferrer"
                            className="p-1.5 text-white/60 hover:text-sky-400 transition-colors rounded-md"
                            title="Görüntüle"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <span className="material-symbols-outlined text-[16px]">visibility</span>
                          </a>
                          <a 
                            href={f.url} 
                            download
                            className="p-1.5 text-white/60 hover:text-emerald-400 transition-colors rounded-md"
                            title="İndir"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <span className="material-symbols-outlined text-[16px]">download</span>
                          </a>
                          <button 
                            type="button"
                            onClick={(e) => { e.stopPropagation(); removeFile(idx); }}
                            className="p-1.5 text-white/60 hover:text-rose-400 transition-colors rounded-md"
                            title="Kaldır"
                          >
                            <span className="material-symbols-outlined text-[16px]">delete</span>
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div className="p-6 border-t border-white/10 bg-white/[0.02] flex justify-end gap-3">
              <button
                onClick={() => setIsCreateDialogOpen(false)}
                className="px-5 py-2.5 text-sm font-semibold text-white/80 bg-white/5 border border-white/10 rounded-xl hover:bg-white/10 hover:text-white transition-colors"
              >{tText("common.cancel", "İptal")}</button>
              <button
                onClick={handleSubmit}
                disabled={loading || !formData.title || !formData.orderType}
                className="px-5 py-2.5 text-sm font-semibold text-white bg-gradient-to-r from-indigo-500 to-blue-600 hover:from-indigo-600 hover:to-blue-700 rounded-xl shadow-lg shadow-indigo-500/20 border border-white/15 transition-all disabled:opacity-50 flex items-center gap-2"
              >
                {loading && <span className="material-symbols-outlined animate-spin text-[18px]">progress_activity</span>}
                {loading ? "Kaydediliyor..." : editOrderId ? "Değişiklikleri Kaydet" : "Siparişi Oluştur"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Status Update Dialog */}
      {isStatusDialogOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-md p-4">
          <div className="backdrop-blur-xl bg-slate-900/90 border border-white/15 rounded-2xl w-full max-w-md shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">

            <div className="p-6 border-b border-white/10 bg-white/[0.02] flex items-start justify-between">
              <div>
                <h2 className="text-xl font-bold text-white">Durum Güncelle</h2>
                <p className="text-sm text-white/60 mt-1.5">{selectedOrder?.orderNumber} - {selectedOrder?.title}</p>
              </div>
              <button
                onClick={() => setIsStatusDialogOpen(false)}
                className="p-2 text-white/60 hover:text-white hover:bg-white/10 rounded-lg transition-colors shrink-0"
              >
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>

            <div className="p-6 space-y-5">
              <div className="space-y-2">
                <label htmlFor="update_status" className="block text-sm font-semibold text-white/80">Yeni Durum</label>
                <div className="relative">
                  <select
                    id="update_status"
                    value={statusUpdate.status}
                    onChange={(e) => setStatusUpdate({ ...statusUpdate, status: e.target.value as BranchOrder["status"] })}
                    className="glass-input block w-full px-4 py-2.5 outline-none transition-all text-sm appearance-none pr-10"
                  >
                    <option value="" disabled className="bg-slate-900 text-white/60">Durum seçin</option>
                    <option value="pending" className="bg-slate-900 text-white">Bekliyor</option>
                    <option value="approved" className="bg-slate-900 text-white">Onaylandı</option>
                    <option value="in-progress" className="bg-slate-900 text-white">İşlemde</option>
                    <option value="delivered" className="bg-slate-900 text-white">Teslim Edildi</option>
                    <option value="rejected" className="bg-slate-900 text-white">Reddedildi</option>
                  </select>
                  <div className="absolute inset-y-0 right-0 py-2 pr-3 flex items-center pointer-events-none text-white/40">
                    <span className="material-symbols-outlined text-[20px]">expand_more</span>
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <label htmlFor="update_notes" className="block text-sm font-semibold text-white/80">Not (İsteğe bağlı)</label>
                <textarea
                  id="update_notes"
                  value={statusUpdate.notes}
                  onChange={(e) => setStatusUpdate({ ...statusUpdate, notes: e.target.value })}
                  placeholder="Durum değişikliği hakkında not ekleyin..."
                  rows={3}
                  className="glass-input block w-full px-4 py-2.5 outline-none transition-all text-sm resize-none"
                />
              </div>
            </div>

            <div className="p-6 border-t border-white/10 bg-white/[0.02] flex justify-end gap-3">
              <button
                onClick={() => setIsStatusDialogOpen(false)}
                className="px-5 py-2.5 text-sm font-semibold text-white/80 bg-white/5 border border-white/10 rounded-xl hover:bg-white/10 hover:text-white transition-colors"
              >{tText("common.cancel", "İptal")}</button>
              <button
                onClick={handleStatusUpdate}
                disabled={loading || !statusUpdate.status}
                className="px-5 py-2.5 text-sm font-semibold text-white bg-gradient-to-r from-indigo-500 to-blue-600 hover:from-indigo-600 hover:to-blue-700 rounded-xl shadow-lg shadow-indigo-500/20 border border-white/15 transition-all disabled:opacity-50 flex items-center gap-2"
              >
                {loading && <span className="material-symbols-outlined animate-spin text-[18px]">progress_activity</span>}
                {loading ? "Güncelleniyor..." : "Güncelle"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
