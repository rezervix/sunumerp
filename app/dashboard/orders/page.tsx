"use client"

import { useRouter } from "next/navigation"
import { useLanguage } from "@/lib/context/LanguageContext"
import { useState, useEffect, useRef } from "react"
import { toast } from "sonner"
import { useAuth } from "@/lib/auth/context"
import { ContextualHelp } from "@/components/shared/contextual-help"

const statusColors = {
  pending: {
    bg: "bg-yellow-100 dark:bg-yellow-900/25 text-yellow-700 dark:text-yellow-300",
    icon: "schedule"
  },
  approved: {
    bg: "bg-blue-100 dark:bg-blue-900/25 text-blue-700 dark:text-blue-300",
    icon: "check_circle"
  },
  "in-progress": {
    bg: "bg-purple-100 dark:bg-purple-900/25 text-purple-700 dark:text-purple-300",
    icon: "loop"
  },
  delivered: {
    bg: "bg-green-100 dark:bg-green-900/25 text-green-700 dark:text-green-300",
    icon: "task_alt"
  },
  rejected: {
    bg: "bg-red-100 dark:bg-red-900/25 text-red-700 dark:text-red-300",
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
  low: { bg: "bg-slate-100 dark:bg-slate-900/25 text-slate-700 dark:text-slate-300", label: "Dusuk" },
  normal: { bg: "bg-blue-100 dark:bg-blue-900/25 text-blue-700 dark:text-blue-300", label: "Normal" },
  high: { bg: "bg-orange-100 dark:bg-orange-900/25 text-orange-700 dark:text-orange-300", label: "Yuksek" },
  urgent: { bg: "bg-red-100 dark:bg-red-900/25 text-red-700 dark:text-red-300", label: "Acil" },
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

  const [orders, setOrders] = useState<BranchOrder[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState("")
  const [statusFilter, setStatusFilter] = useState("all")
  
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false)
  const [editOrderId, setEditOrderId] = useState<string | null>(null)
  const [selectedOrder, setSelectedOrder] = useState<BranchOrder | null>(null)
  const [isStatusDialogOpen, setIsStatusDialogOpen] = useState(false)
  
  const [customers, setCustomers] = useState<{id: string, name: string, company?: string}[]>([])
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
      setLoading(true)
      const res = await fetch(`/api/orders?branchId=${currentBranch?.id}&take=100`)
      if (res.ok) {
        const json = await res.json()
        setOrders(json.data || [])
      }
    } catch (error) {
      console.error("Error loading orders:", error)
      toast.error("Siparişler yüklenirken bir hata oluştu")
    } finally {
      setLoading(false)
    }
  }

  const loadCustomers = async () => {
    try {
      const res = await fetch(`/api/customers?branchId=${currentBranch?.id}`)
      if (res.ok) {
        const json = await res.json()
        setCustomers(json.data || [])
      }
    } catch (error) {
      console.error("Error loading customers:", error)
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
          <h1 className="text-3xl lg:text-4xl font-bold text-foreground tracking-tight flex items-center gap-1">
            Sipariş Yönetimi
            <ContextualHelp />
          </h1>
          <p className="text-muted-foreground mt-2">Şube içi siparişlerinizi takip edin ve yönetin</p>
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
          className="w-full sm:w-auto flex items-center justify-center gap-2 px-5 py-2.5 bg-primary text-white rounded-lg text-sm font-semibold hover:shadow-lg transition-all"
        >
          <span className="material-symbols-outlined text-[18px]">add</span>
          <span>Yeni Sipariş</span>
        </button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 lg:gap-5">
        <div className="stat-card bg-card dark:bg-card rounded-xl p-5 lg:p-6 border border-border shadow-soft hover:shadow-md transition-shadow">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">Toplam Sipariş</p>
          <p className="text-3xl lg:text-4xl font-bold text-foreground">{stats.total}</p>
        </div>
        <div className="stat-card bg-card dark:bg-card rounded-xl p-5 lg:p-6 border border-border shadow-soft hover:shadow-md transition-shadow">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">Bekleyen</p>
          <p className="text-3xl lg:text-4xl font-bold text-yellow-600 dark:text-yellow-400">{stats.pending}</p>
        </div>
        <div className="stat-card bg-card dark:bg-card rounded-xl p-5 lg:p-6 border border-border shadow-soft hover:shadow-md transition-shadow">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">İşlemde</p>
          <p className="text-3xl lg:text-4xl font-bold text-purple-600 dark:text-purple-400">{stats.inProgress}</p>
        </div>
        <div className="stat-card bg-card dark:bg-card rounded-xl p-5 lg:p-6 border border-border shadow-soft hover:shadow-md transition-shadow">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">Teslim Edildi</p>
          <p className="text-3xl lg:text-4xl font-bold text-green-600 dark:text-green-400">{stats.delivered}</p>
        </div>
      </div>

      {/* Orders Table */}
      <div className="bg-card dark:bg-card rounded-xl border border-border shadow-soft overflow-hidden">
        <div className="p-5 lg:p-6 border-b border-border bg-card/50 dark:bg-card/50">
          <div className="flex flex-col gap-4 lg:flex-row lg:justify-between lg:items-center">

            <div className="relative w-full lg:max-w-xs">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-muted-foreground">
                <span className="material-symbols-outlined text-[20px]">search</span>
              </div>
              <input
                type="text"
                placeholder="Sipariş, müşteri veya ürün ara..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="block w-full pl-11 pr-4 py-2.5 text-sm border border-border rounded-lg bg-background text-foreground placeholder-muted-foreground/70 outline-none focus:ring-1 focus:ring-ring focus:border-ring transition-all"
              />
            </div>

            <div className="flex gap-2 w-full lg:w-auto">
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="flex-1 lg:flex-none px-4 py-2.5 text-sm border border-border rounded-lg bg-background text-foreground outline-none focus:ring-1 focus:ring-ring focus:border-ring transition-all"
              >
                <option value="all">Tüm Durumlar</option>
                <option value="pending">Bekleyen</option>
                <option value="approved">Onaylandı</option>
                <option value="in-progress">İşlemde</option>
                <option value="delivered">Teslim Edildi</option>
                <option value="rejected">Reddedildi</option>
              </select>
              <button className="px-4 py-2.5 flex items-center justify-center gap-2 bg-background border border-border rounded-lg text-sm font-medium text-foreground hover:bg-muted transition-colors shrink-0">
                <span className="material-symbols-outlined text-[18px]">filter_list</span>
                <span className="hidden sm:inline">{tText("common.filter", "Filtrele")}</span>
              </button>
            </div>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-sm">
            <thead>
              <tr className="bg-muted/40 dark:bg-muted/20 border-b border-border text-xs uppercase tracking-wide text-muted-foreground font-semibold">
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
            <tbody className="divide-y divide-border text-sm">
              {filteredOrders.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-5 lg:px-6 py-12 text-center">
                    <div className="flex flex-col items-center gap-2">
                      <span className="material-symbols-outlined text-4xl text-muted-foreground/40">inbox</span>
                      <p className="text-muted-foreground font-medium">Gösterilecek sipariş bulunamadı</p>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredOrders.map((order) => {
                  const statusConfig = statusColors[order.status]
                  const priorityConfig = priorityColors[order.priority]

                  return (
                    <tr key={order.id} className="hover:bg-muted/30 dark:hover:bg-muted/20 transition-colors group">
                      <td className="px-5 lg:px-6 py-4 font-mono text-foreground font-semibold">
                        {order.orderNumber}
                      </td>
                      <td className="px-5 lg:px-6 py-4">
                        <div className="font-medium text-foreground">{order.title}</div>
                        {(order.customer || order.customerName) && (
                          <div className="text-primary text-xs mt-1 flex items-center gap-1 font-semibold">
                            <span className="material-symbols-outlined text-[12px]">person</span> 
                            {order.customer?.name || order.customerName} {order.customer?.company || order.companyName ? `(${order.customer?.company || order.companyName})` : ""}
                          </div>
                        )}
                        {order.description && (
                          <div className="text-muted-foreground text-xs mt-1 line-clamp-1">{order.description}</div>
                        )}
                      </td>
                      <td className="px-5 lg:px-6 py-4 text-muted-foreground">
                        {order.orderType}
                      </td>
                      <td className="px-5 lg:px-6 py-4">
                        <div className="font-semibold text-foreground">
                          {order.totalAmount ? `${order.totalAmount.toLocaleString("tr-TR")} ₺` : "-"}
                        </div>
                        <div className={`text-xs mt-1 font-medium ${order.paymentStatus === 'paid' ? 'text-green-600' : 'text-red-500'}`}>
                          {order.paymentStatus === 'paid' ? 'Ödendi' : order.paymentStatus === 'partial' ? 'Kısmi Ödeme' : 'Ödenmedi'}
                        </div>
                      </td>
                      <td className="px-5 lg:px-6 py-4">
                        <span className={`inline-flex items-center px-2.5 py-1.5 rounded-md text-xs font-semibold ${priorityConfig.bg}`}>
                          {priorityConfig.label}
                        </span>
                      </td>
                      <td className="px-5 lg:px-6 py-4">
                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs font-semibold ${statusConfig.bg}`}>
                          <span className="material-symbols-outlined text-[14px]">
                            {statusConfig.icon}
                          </span>
                          {statusLabels[order.status]}
                        </span>
                      </td>
                      <td className="px-5 lg:px-6 py-4 text-muted-foreground text-sm">
                        {new Date(order.orderDate).toLocaleDateString("tr-TR")}
                      </td>
                      <td className="px-5 lg:px-6 py-4 text-right">
                        <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 max-lg:opacity-100 transition-opacity">
                          <button
                            onClick={() => window.open(`/dashboard/orders/${order.id}/print`, "_blank")}
                            className="p-2 text-muted-foreground hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/25 rounded-lg transition-colors flex items-center justify-center"
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
                            className="p-2 text-muted-foreground hover:text-green-600 hover:bg-green-50 dark:hover:bg-green-900/25 rounded-lg transition-colors flex items-center justify-center"
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
                            className="p-2 text-muted-foreground hover:text-primary hover:bg-primary/10 rounded-lg transition-colors flex items-center justify-center"
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
                            className="p-2 text-muted-foreground hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/25 rounded-lg transition-colors flex items-center justify-center"
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
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="bg-card dark:bg-card rounded-2xl w-full max-w-3xl border border-border shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200 my-8">

            <div className="flex items-center justify-between p-6 border-b border-border bg-card/50 dark:bg-card/50 sticky top-0 z-10">
              <h2 className="text-xl font-bold text-foreground">{editOrderId ? "Siparişi Düzenle" : "Yeni Sipariş Oluştur"}</h2>
              <button
                onClick={() => setIsCreateDialogOpen(false)}
                className="p-2 text-muted-foreground hover:text-foreground hover:bg-muted rounded-lg transition-colors"
              >
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>

            <div className="p-6 space-y-6 max-h-[70vh] overflow-y-auto">
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label htmlFor="orderNumber" className="block text-sm font-semibold text-foreground">Sipariş Numarası</label>
                  <input
                    id="orderNumber"
                    type="text"
                    value={formData.orderNumber}
                    onChange={(e) => setFormData({ ...formData, orderNumber: e.target.value })}
                    placeholder="Otomatik Oluşturulacak"
                    className="block w-full px-4 py-2.5 border border-border rounded-lg bg-background text-foreground placeholder-muted-foreground/70 outline-none focus:ring-1 focus:ring-ring focus:border-ring transition-all text-sm"
                  />
                  <p className="text-[11px] text-muted-foreground">Boş bırakılırsa sistem otomatik atar.</p>
                </div>
                
                <div className="space-y-2">
                  <label htmlFor="orderDate" className="block text-sm font-semibold text-foreground">Sipariş Tarihi *</label>
                  <input
                    id="orderDate"
                    type="date"
                    value={formData.orderDate}
                    onChange={(e) => setFormData({ ...formData, orderDate: e.target.value })}
                    className="block w-full px-4 py-2.5 border border-border rounded-lg bg-background text-foreground outline-none focus:ring-1 focus:ring-ring focus:border-ring transition-all text-sm"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label htmlFor="title" className="block text-sm font-semibold text-foreground">Sipariş Başlığı *</label>
                <input
                  id="title"
                  type="text"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  placeholder="500 Adet Kartvizit"
                  className="block w-full px-4 py-2.5 border border-border rounded-lg bg-background text-foreground placeholder-muted-foreground/70 outline-none focus:ring-1 focus:ring-ring focus:border-ring transition-all text-sm"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label htmlFor="orderType" className="block text-sm font-semibold text-foreground">Sipariş Türü *</label>
                  <div className="relative">
                    <select
                      id="orderType"
                      value={formData.orderType}
                      onChange={(e) => setFormData({ ...formData, orderType: e.target.value })}
                      className="block w-full px-4 py-2.5 border border-border rounded-lg bg-background text-foreground outline-none focus:ring-1 focus:ring-ring focus:border-ring transition-all text-sm appearance-none pr-10"
                    >
                      <option value="" disabled>Tür seçin</option>
                      <option value="Baskı Malzemeleri">Baskı Malzemeleri</option>
                      <option value="Tasarım Hizmeti">Tasarım Hizmeti</option>
                      <option value="Ofis Malzemeleri">Ofis Malzemeleri</option>
                      <option value="Dijital Hizmet">Dijital Hizmet</option>
                      <option value="Diğer">Diğer</option>
                    </select>
                    <div className="absolute inset-y-0 right-0 py-2 pr-3 flex items-center pointer-events-none text-muted-foreground">
                      <span className="material-symbols-outlined text-[20px]">expand_more</span>
                    </div>
                  </div>
                </div>

                <div className="space-y-2">
                  <label htmlFor="customerId" className="block text-sm font-semibold text-foreground">Kayıtlı Müşteri Seç</label>
                  <div className="relative">
                    <select
                      id="customerId"
                      value={formData.customerId || ""}
                      onChange={(e) => setFormData({ ...formData, customerId: e.target.value })}
                      className="block w-full px-4 py-2.5 border border-border rounded-lg bg-background text-foreground outline-none focus:ring-1 focus:ring-ring focus:border-ring transition-all text-sm appearance-none pr-10"
                    >
                      <option value="">Bağımsız Sipariş (Aşağıdan Doldurun)</option>
                      {customers.map(c => (
                        <option key={c.id} value={c.id}>{c.name} {c.company ? `(${c.company})` : ""}</option>
                      ))}
                    </select>
                    <div className="absolute inset-y-0 right-0 py-2 pr-3 flex items-center pointer-events-none text-muted-foreground">
                      <span className="material-symbols-outlined text-[20px]">expand_more</span>
                    </div>
                  </div>
                </div>
              </div>

              {!formData.customerId && (
                <div className="p-4 rounded-xl border border-border bg-muted/20 space-y-4">
                  <h3 className="text-sm font-semibold text-foreground">Hızlı Müşteri Bilgileri</h3>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="space-y-2">
                      <label className="block text-xs font-semibold text-muted-foreground">Ad Soyad</label>
                      <input
                        type="text"
                        value={formData.customerName}
                        onChange={(e) => setFormData({ ...formData, customerName: e.target.value })}
                        placeholder="Örn: Ahmet Yılmaz"
                        className="block w-full px-3 py-2 border border-border rounded-lg bg-background text-foreground text-sm"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="block text-xs font-semibold text-muted-foreground">Firma Adı</label>
                      <input
                        type="text"
                        value={formData.companyName}
                        onChange={(e) => setFormData({ ...formData, companyName: e.target.value })}
                        placeholder="Örn: ABC A.Ş."
                        className="block w-full px-3 py-2 border border-border rounded-lg bg-background text-foreground text-sm"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="block text-xs font-semibold text-muted-foreground">Telefon</label>
                      <input
                        type="text"
                        value={formData.customerPhone}
                        onChange={(e) => setFormData({ ...formData, customerPhone: e.target.value })}
                        placeholder="+90 555 123 4567"
                        className="block w-full px-3 py-2 border border-border rounded-lg bg-background text-foreground text-sm"
                      />
                    </div>
                  </div>
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="space-y-2">
                  <label htmlFor="totalAmount" className="block text-sm font-semibold text-foreground">Fiyat (₺)</label>
                  <input
                    id="totalAmount"
                    type="number"
                    value={formData.totalAmount || ""}
                    onChange={(e) => setFormData({ ...formData, totalAmount: Number.parseFloat(e.target.value) || undefined })}
                    placeholder="0.00"
                    step="0.01"
                    className="block w-full px-4 py-2.5 border border-border rounded-lg bg-background text-foreground placeholder-muted-foreground/70 outline-none focus:ring-1 focus:ring-ring focus:border-ring transition-all text-sm"
                  />
                </div>
                
                <div className="space-y-2">
                  <label htmlFor="paymentStatus" className="block text-sm font-semibold text-foreground">Ödeme Durumu</label>
                  <div className="relative">
                    <select
                      id="paymentStatus"
                      value={formData.paymentStatus}
                      onChange={(e) => setFormData({ ...formData, paymentStatus: e.target.value })}
                      className="block w-full px-4 py-2.5 border border-border rounded-lg bg-background text-foreground outline-none focus:ring-1 focus:ring-ring focus:border-ring transition-all text-sm appearance-none pr-10"
                    >
                      <option value="unpaid">Ödenmedi</option>
                      <option value="partial">Kısmi Ödeme</option>
                      <option value="paid">Ödendi</option>
                    </select>
                    <div className="absolute inset-y-0 right-0 py-2 pr-3 flex items-center pointer-events-none text-muted-foreground">
                      <span className="material-symbols-outlined text-[20px]">expand_more</span>
                    </div>
                  </div>
                </div>

                <div className="space-y-2">
                  <label htmlFor="quantity" className="block text-sm font-semibold text-foreground">Miktar</label>
                  <input
                    id="quantity"
                    type="number"
                    value={formData.quantity || ""}
                    onChange={(e) => setFormData({ ...formData, quantity: Number.parseInt(e.target.value) || undefined })}
                    placeholder="100"
                    className="block w-full px-4 py-2.5 border border-border rounded-lg bg-background text-foreground placeholder-muted-foreground/70 outline-none focus:ring-1 focus:ring-ring focus:border-ring transition-all text-sm"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label htmlFor="description" className="block text-sm font-semibold text-foreground">Müşteri Notu</label>
                <textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Müşteri talepleri veya sipariş detayları..."
                  rows={3}
                  className="block w-full px-4 py-2.5 border border-border rounded-lg bg-background text-foreground placeholder-muted-foreground/70 outline-none focus:ring-1 focus:ring-ring focus:border-ring transition-all text-sm resize-none"
                />
              </div>

              <div className="space-y-2">
                <label className="block text-sm font-semibold text-foreground">Dosyalar</label>
                <div 
                  className="border-2 border-dashed border-border hover:border-primary/50 transition-colors rounded-xl p-8 flex flex-col items-center justify-center bg-muted/10 cursor-pointer"
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={handleFileUpload}
                  onClick={() => fileInputRef.current?.click()}
                >
                  <span className="material-symbols-outlined text-4xl text-muted-foreground mb-3">cloud_upload</span>
                  <p className="text-sm font-medium text-foreground">Dosyaları sürükleyip bırakın</p>
                  <p className="text-xs text-muted-foreground mt-1">veya seçmek için tıklayın</p>
                  <input 
                    type="file" 
                    ref={fileInputRef} 
                    className="hidden" 
                    multiple 
                    onChange={handleFileUpload} 
                  />
                  {isUploading && (
                    <div className="mt-4 flex items-center gap-2 text-sm text-primary font-medium">
                      <span className="material-symbols-outlined animate-spin text-[18px]">progress_activity</span>
                      Yükleniyor...
                    </div>
                  )}
                </div>
                
                {formData.files.length > 0 && (
                  <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {formData.files.map((f, idx) => (
                      <div key={idx} className="flex items-center justify-between p-3 bg-muted/20 border border-border rounded-lg">
                        <div className="flex items-center gap-3 overflow-hidden">
                          <span className="material-symbols-outlined text-primary/70 shrink-0">draft</span>
                          <div className="overflow-hidden">
                            <p className="text-sm font-medium text-foreground truncate">{f.name}</p>
                            <p className="text-[10px] text-muted-foreground">{(f.size / 1024).toFixed(1)} KB</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-1 shrink-0 ml-2">
                          <a 
                            href={f.url} 
                            target="_blank" 
                            rel="noreferrer"
                            className="p-1.5 text-muted-foreground hover:text-primary transition-colors rounded-md"
                            title="Görüntüle"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <span className="material-symbols-outlined text-[16px]">visibility</span>
                          </a>
                          <a 
                            href={f.url} 
                            download
                            className="p-1.5 text-muted-foreground hover:text-primary transition-colors rounded-md"
                            title="İndir"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <span className="material-symbols-outlined text-[16px]">download</span>
                          </a>
                          <button 
                            type="button"
                            onClick={(e) => { e.stopPropagation(); removeFile(idx); }}
                            className="p-1.5 text-muted-foreground hover:text-red-500 transition-colors rounded-md"
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

            <div className="p-6 border-t border-border bg-muted/30 dark:bg-muted/10 flex justify-end gap-3">
              <button
                onClick={() => setIsCreateDialogOpen(false)}
                className="px-5 py-2.5 text-sm font-semibold text-foreground bg-background border border-border rounded-lg hover:bg-muted transition-colors"
              >{tText("common.cancel", "İptal")}</button>
              <button
                onClick={handleSubmit}
                disabled={loading || !formData.title || !formData.orderType}
                className="px-5 py-2.5 text-sm font-semibold text-primary-foreground bg-primary rounded-lg hover:shadow-lg transition-all disabled:opacity-50 flex items-center gap-2"
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
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div className="bg-card dark:bg-card rounded-2xl w-full max-w-md border border-border shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">

            <div className="p-6 border-b border-border bg-card/50 dark:bg-card/50 flex items-start justify-between">
              <div>
                <h2 className="text-xl font-bold text-foreground">Durum Güncelle</h2>
                <p className="text-sm text-muted-foreground mt-2">{selectedOrder?.orderNumber} - {selectedOrder?.title}</p>
              </div>
              <button
                onClick={() => setIsStatusDialogOpen(false)}
                className="p-2 text-muted-foreground hover:text-foreground hover:bg-muted rounded-lg transition-colors shrink-0"
              >
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>

            <div className="p-6 space-y-5">
              <div className="space-y-2">
                <label htmlFor="update_status" className="block text-sm font-semibold text-foreground">Yeni Durum</label>
                <div className="relative">
                  <select
                    id="update_status"
                    value={statusUpdate.status}
                    onChange={(e) => setStatusUpdate({ ...statusUpdate, status: e.target.value as BranchOrder["status"] })}
                    className="block w-full px-4 py-2.5 border border-border rounded-lg bg-background text-foreground outline-none focus:ring-1 focus:ring-ring focus:border-ring transition-all text-sm appearance-none pr-10"
                  >
                    <option value="" disabled>Durum seçin</option>
                    <option value="pending">Bekliyor</option>
                    <option value="approved">Onaylandı</option>
                    <option value="in-progress">İşlemde</option>
                    <option value="delivered">Teslim Edildi</option>
                    <option value="rejected">Reddedildi</option>
                  </select>
                  <div className="absolute inset-y-0 right-0 py-2 pr-3 flex items-center pointer-events-none text-muted-foreground">
                    <span className="material-symbols-outlined text-[20px]">expand_more</span>
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <label htmlFor="update_notes" className="block text-sm font-semibold text-foreground">Not (İsteğe bağlı)</label>
                <textarea
                  id="update_notes"
                  value={statusUpdate.notes}
                  onChange={(e) => setStatusUpdate({ ...statusUpdate, notes: e.target.value })}
                  placeholder="Durum değişikliği hakkında not ekleyin..."
                  rows={3}
                  className="block w-full px-4 py-2.5 border border-border rounded-lg bg-background text-foreground placeholder-muted-foreground/70 outline-none focus:ring-1 focus:ring-ring focus:border-ring transition-all text-sm resize-none"
                />
              </div>
            </div>

            <div className="p-6 border-t border-border bg-muted/30 dark:bg-muted/10 flex justify-end gap-3">
              <button
                onClick={() => setIsStatusDialogOpen(false)}
                className="px-5 py-2.5 text-sm font-semibold text-foreground bg-background border border-border rounded-lg hover:bg-muted transition-colors"
              >{tText("common.cancel", "İptal")}</button>
              <button
                onClick={handleStatusUpdate}
                disabled={loading || !statusUpdate.status}
                className="px-5 py-2.5 text-sm font-semibold text-primary-foreground bg-primary rounded-lg hover:shadow-lg transition-all disabled:opacity-50 flex items-center gap-2"
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
