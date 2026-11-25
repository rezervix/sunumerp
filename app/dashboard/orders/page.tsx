"use client"

import { useRouter } from "next/navigation"
import Link from "next/link"
import { useLanguage } from "@/lib/context/LanguageContext"
import { useState, useEffect, useRef } from "react"
import { toast } from "sonner"
import { useAuth } from "@/lib/auth/context"
import { ContextualHelp } from "@/components/shared/contextual-help"
import { mockDatabase } from "@/lib/data/mockDatabase"
import { AnimatedNumber, StaggerContainer, StaggerItem } from "@/components/ui/motion-primitives"
import { RmaCreateModal, type EligibleOrder } from "@/app/dashboard/omnichannel/components/RmaCreateModal"
import { safeNumber, safeText, safeCurrency, safeDate } from "@/lib/utils/safe-display"

const statusColors = {
  pending: {
    bg: "bg-[--muted-bg] text-[--text-muted] border border-[--line]",
    icon: "schedule"
  },
  approved: {
    bg: "bg-[--ok-soft] text-[--ok] border border-[--ok-soft]",
    icon: "check_circle"
  },
  "in-progress": {
    bg: "bg-[--brand-soft] text-[--brand] border border-[--brand-line]",
    icon: "sync"
  },
  delivered: {
    bg: "bg-[--ok-soft] text-[--ok] border border-[--ok-soft]",
    icon: "task_alt"
  },
  rejected: {
    bg: "bg-[--bad-soft] text-[--bad] border border-[--bad-soft]",
    icon: "cancel"
  },
}

const statusLabels: Record<string, string> = {
  pending: "Bekliyor",
  approved: "Onaylandı",
  "in-progress": "İşlemde",
  delivered: "Teslim Edildi",
  rejected: "Reddedildi",
}

const priorityColors = {
  low: { bg: "bg-[--muted-bg] text-[--text-muted] border border-[--line]", label: "Düşük" },
  normal: { bg: "bg-[--brand-soft] text-[--brand] border border-[--brand-line]", label: "Normal" },
  high: { bg: "bg-[--warn-soft] text-[--warn] border border-[--warn-soft]", label: "Yüksek" },
  urgent: { bg: "bg-[--bad-soft] text-[--bad] border border-[--bad-soft]", label: "Acil" },
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
  shipmentTripId?: string | null
  trackingToken?: string | null
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
  const { tText } = useLanguage()
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
  const [rmaModalOrder, setRmaModalOrder] = useState<EligibleOrder | null>(null)
  const [isRmaModalOpen, setIsRmaModalOpen] = useState(false)

  const handleOpenQuickRma = async (order: BranchOrder) => {
    try {
      const res = await fetch(
        `/api/omnichannel?section=order_lookup&orderId=${encodeURIComponent(order.id)}&orderNumber=${encodeURIComponent(order.orderNumber || "")}&orderSourceType=ERP_ORDER`,
        { cache: "no-store" }
      )
      if (res.status === 403) {
        toast.error("İade / RMA modülü bu şubede veya kullanıcı rolünüzde aktif değil.")
        return
      }
      if (res.ok) {
        const data = await res.json()
        if (data.success && data.found) {
          setRmaModalOrder(data as EligibleOrder)
          setIsRmaModalOpen(true)
          return
        }
      }
    } catch {
      // Fallback
    }
    const qty = Math.max(1, Number(order.quantity || 1))
    const unitPrice = order.totalAmount && qty > 0 ? Number((order.totalAmount / qty).toFixed(2)) : 0
    setRmaModalOrder({
      found: true,
      orderSourceType: "ERP_ORDER",
      orderId: order.id,
      orderNumber: order.orderNumber || order.id,
      channelCode: "ERP",
      customerName: order.customer?.name || order.customerName || "ERP Müşterisi",
      deliveredAt: order.orderDate || new Date().toISOString(),
      lines: [
        {
          orderLineId: order.id,
          sku: "GUL-EKV-01",
          itemName: order.title || "ERP Sipariş Kalemi",
          soldQty: qty,
          alreadyReturnedQty: 0,
          maxReturnableQty: qty,
          unitPrice,
        },
      ],
    })
    setIsRmaModalOpen(true)
  }
  
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
    <StaggerContainer className="space-y-8">

      {/* Header */}
      <StaggerItem className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-6">
        <div>
          <h1 className="text-2xl lg:text-3xl font-semibold text-[--text] tracking-tight flex items-center gap-2">
            Sipariş Yönetimi
            <ContextualHelp />
          </h1>
          <p className="text-[--text-muted] mt-1 text-sm">Şube içi siparişlerinizi takip edin ve yönetin</p>
        </div>
        <div className="flex items-center gap-2.5 w-full sm:w-auto">
          <Link
            href="/dashboard/omnichannel?tab=rma"
            className="flex items-center justify-center gap-1.5 px-4 py-2.5 bg-white hover:bg-[--muted-bg] border border-[--line] text-[--text-2] rounded-full text-xs font-medium transition-all shadow-sm"
          >
            <span className="material-symbols-outlined text-[16px] text-[--brand]">assignment_return</span>
            <span>İade &amp; RMA Merkezi</span>
          </Link>
          <button
            onClick={() => {
              setEditOrderId(null)
              setFormData({
                branchId: "", orderType: "", title: "", description: "", priority: "normal", orderNumber: "",
                orderDate: new Date().toISOString().split('T')[0], paymentStatus: "unpaid", customerName: "", companyName: "", customerPhone: "", files: [], customerId: ""
              })
              setIsCreateDialogOpen(true)
            }}
            className="w-full sm:w-auto flex items-center justify-center gap-2 px-5 py-2.5 bg-gradient-to-r from-[--brand] to-[--blue] hover:opacity-90 text-white rounded-full text-sm font-medium transition-all shadow-sm"
          >
            <span className="material-symbols-outlined text-[18px]">add</span>
            <span>Yeni Sipariş</span>
          </button>
        </div>
      </StaggerItem>

      {/* Borderless KPI Strip */}
      <StaggerItem className="grid grid-cols-2 md:grid-cols-4 gap-8 py-4 border-b border-[--line]">
        <div>
          <div className="flex items-center gap-2 text-[11px] uppercase tracking-[0.12em] text-[--text-muted] font-medium mb-2">
            <span className="material-symbols-outlined text-[15px] text-[--brand]">shopping_bag</span>
            <span>TOPLAM SİPARİŞ</span>
          </div>
          <div className="flex items-baseline gap-3">
            <span className="text-3xl font-light text-[--text] tracking-tight tabular-nums">
              <AnimatedNumber value={safeNumber(stats.total, 0)} />
            </span>
            <span className="bg-[--brand-soft] text-[--brand] border border-[--brand-line] text-xs px-2 py-0.5 rounded-full whitespace-nowrap font-medium">
              Aktif
            </span>
          </div>
        </div>

        <div>
          <div className="flex items-center gap-2 text-[11px] uppercase tracking-[0.12em] text-[--text-muted] font-medium mb-2">
            <span className="material-symbols-outlined text-[15px] text-[--warn]">schedule</span>
            <span>BEKLEYEN</span>
          </div>
          <div className="flex items-baseline gap-3">
            <span className="text-3xl font-light text-[--text] tracking-tight tabular-nums">
              <AnimatedNumber value={safeNumber(stats.pending, 0)} />
            </span>
            <span className="bg-[--warn-soft] text-[--warn] border border-[--warn-soft] text-xs px-2 py-0.5 rounded-full whitespace-nowrap font-medium">
              Onay Bekliyor
            </span>
          </div>
        </div>

        <div>
          <div className="flex items-center gap-2 text-[11px] uppercase tracking-[0.12em] text-[--text-muted] font-medium mb-2">
            <span className="material-symbols-outlined text-[15px] text-[--brand]">sync</span>
            <span>İŞLEMDE</span>
          </div>
          <div className="flex items-baseline gap-3">
            <span className="text-3xl font-light text-[--text] tracking-tight tabular-nums">
              <AnimatedNumber value={safeNumber(stats.inProgress, 0)} />
            </span>
            <span className="bg-[--brand-soft] text-[--brand] border border-[--brand-line] text-xs px-2 py-0.5 rounded-full whitespace-nowrap font-medium">
              Üretimde
            </span>
          </div>
        </div>

        <div>
          <div className="flex items-center gap-2 text-[11px] uppercase tracking-[0.12em] text-[--text-muted] font-medium mb-2">
            <span className="material-symbols-outlined text-[15px] text-[--ok]">task_alt</span>
            <span>TESLİM EDİLDİ</span>
          </div>
          <div className="flex items-baseline gap-3">
            <span className="text-3xl font-light text-[--text] tracking-tight tabular-nums">
              <AnimatedNumber value={safeNumber(stats.delivered, 0)} />
            </span>
            <span className="bg-[--ok-soft] text-[--ok] border border-[--ok-soft] text-xs px-2 py-0.5 rounded-full whitespace-nowrap font-medium">
              Tamamlandı
            </span>
          </div>
        </div>
      </StaggerItem>

      {/* Orders Table */}
      <StaggerItem className="bg-white/80 backdrop-blur-xl border border-[--line] rounded-[20px] shadow-sm overflow-hidden">
        <div className="p-5 lg:p-6 border-b border-[--line] bg-[var(--muted-bg)]">
          <div className="flex flex-col gap-4 lg:flex-row lg:justify-between lg:items-center">

            <div className="relative w-full lg:max-w-xs">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-[--text-muted]">
                <span className="material-symbols-outlined text-[20px]">search</span>
              </div>
              <input
                type="text"
                placeholder="Sipariş, müşteri veya ürün ara..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-11 pr-4 py-2 bg-white border border-[--line] rounded-xl text-sm text-[--text] placeholder:text-[--text-muted] focus:border-[--brand] focus:ring-1 focus:ring-[--brand] outline-none transition-all shadow-sm"
              />
            </div>

            <div className="flex gap-2 w-full lg:w-auto">
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="flex-1 lg:flex-none px-4 py-2 bg-white border border-[--line] rounded-xl text-sm text-[--text] focus:border-[--brand] outline-none transition-all shadow-sm"
              >
                <option value="all">Tüm Durumlar</option>
                <option value="pending">Bekleyen</option>
                <option value="approved">Onaylandı</option>
                <option value="in-progress">İşlemde</option>
                <option value="delivered">Teslim Edildi</option>
                <option value="rejected">Reddedildi</option>
              </select>
              <button className="px-4 py-2 flex items-center justify-center gap-2 bg-white border border-[--line] rounded-xl text-sm font-medium text-[--text-2] hover:bg-[--muted-bg] transition-colors shrink-0 shadow-sm">
                <span className="material-symbols-outlined text-[18px]">filter_list</span>
                <span className="hidden sm:inline">{tText("common.filter", "Filtrele")}</span>
              </button>
            </div>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-sm">
            <thead>
              <tr className="bg-[--muted-bg] border-b border-[--line] text-[11px] uppercase tracking-wider text-[--text-muted] font-semibold">
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
                      <span className="material-symbols-outlined text-4xl text-[--text-muted]">inbox</span>
                      <p className="text-[--text-muted] font-medium">Gösterilecek sipariş bulunamadı</p>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredOrders.map((order) => {
                  const statusConfig = statusColors[order.status] || statusColors.pending
                  const priorityConfig = priorityColors[order.priority] || priorityColors.normal

                  return (
                    <tr key={order.id} className="border-b border-[--line] hover:bg-[--brand-soft]/30 transition-all group">
                      <td className="px-5 lg:px-6 py-4 font-mono text-[--navy] font-medium">
                        {safeText(order.orderNumber, "-")}
                      </td>
                      <td className="px-5 lg:px-6 py-4">
                        <div className="font-medium text-[--text]">{safeText(order.title, "İsimsiz Sipariş")}</div>
                        {(order.customer || order.customerName) && (
                          <div className="text-[--brand] text-xs mt-1 flex items-center gap-1 font-medium">
                            <span className="material-symbols-outlined text-[12px]">person</span> 
                            {order.customer?.name || order.customerName} {order.customer?.company || order.companyName ? `(${order.customer?.company || order.companyName})` : ""}
                          </div>
                        )}
                        {order.description && (
                          <div className="text-[--text-muted] text-xs mt-1 line-clamp-1">{order.description}</div>
                        )}
                      </td>
                      <td className="px-5 lg:px-6 py-4 text-[--text-2]">
                        {safeText(order.orderType, "Genel")}
                      </td>
                      <td className="px-5 lg:px-6 py-4">
                        <div className="font-semibold text-[--text]">
                          {order.totalAmount ? safeCurrency(order.totalAmount) : "—"}
                        </div>
                        <div className={`text-xs mt-1 font-medium ${ order.paymentStatus === 'paid' ? 'text-[--ok]' : order.paymentStatus === 'partial' ? 'text-[--warn]' : 'text-[--bad]' }`}>
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
                          {statusLabels[order.status] || order.status}
                        </span>
                      </td>
                      <td className="px-5 lg:px-6 py-4 text-[--text-muted] text-sm">
                        {safeDate(order.orderDate)}
                      </td>
                      <td className="px-5 lg:px-6 py-4 text-right">
                        <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 max-lg:opacity-100 transition-opacity">
                          {order.trackingToken ? (
                            <Link
                              href={`/takip/${order.trackingToken}`}
                              target="_blank"
                              className="p-2 text-[--brand] hover:bg-[--brand-soft] rounded-lg transition-colors flex items-center justify-center"
                              title="Canlı Müşteri Takip Linki"
                            >
                              <span className="material-symbols-outlined text-[20px]">share_location</span>
                            </Link>
                          ) : (
                            <Link
                              href={
                                order.shipmentTripId
                                  ? `/dashboard/sevkiyat?tripId=${encodeURIComponent(order.shipmentTripId)}`
                                  : `/dashboard/sevkiyat?addSourceType=ERP_ORDER&addSourceId=${encodeURIComponent(order.id)}`
                              }
                              className="p-2 text-[--text-muted] hover:text-[--brand] hover:bg-[--brand-soft] rounded-lg transition-colors flex items-center justify-center"
                              title={order.shipmentTripId ? "Sefer Planını Gör" : "Sefer Planına Ekle"}
                            >
                              <span className="material-symbols-outlined text-[20px]">alt_route</span>
                            </Link>
                          )}
                          <button
                            onClick={() => handleOpenQuickRma(order)}
                            className="p-2 text-[--text-muted] hover:text-[--warn] hover:bg-[--warn-soft] rounded-lg transition-colors flex items-center justify-center"
                            title="İade Başlat (RMA)"
                          >
                            <span className="material-symbols-outlined text-[20px]">assignment_return</span>
                          </button>
                          <button
                            onClick={() => window.open(`/dashboard/orders/${order.id}/print`, "_blank")}
                            className="p-2 text-[--text-muted] hover:text-[--text] hover:bg-[--muted-bg] rounded-lg transition-colors flex items-center justify-center"
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
                            className="p-2 text-[--text-muted] hover:text-[--brand] hover:bg-[--brand-soft] rounded-lg transition-colors flex items-center justify-center"
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
                            className="p-2 text-[--text-muted] hover:text-[--brand] hover:bg-[--brand-soft] rounded-lg transition-colors flex items-center justify-center"
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
                            className="p-2 text-[--text-muted] hover:text-[--bad] hover:bg-[--bad-soft] rounded-lg transition-colors flex items-center justify-center"
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
      </StaggerItem>

      {/* Create / Edit Dialog */}
      {isCreateDialogOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#0B1B33]/40 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="bg-white border border-[--line] rounded-[20px] w-full max-w-3xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200 my-8">

            <div className="flex items-center justify-between p-6 border-b border-[--line] bg-[--page] sticky top-0 z-10">
              <h2 className="text-xl font-semibold text-[--navy]">{editOrderId ? "Siparişi Düzenle" : "Yeni Sipariş Oluştur"}</h2>
              <button
                onClick={() => setIsCreateDialogOpen(false)}
                className="p-2 text-[--text-muted] hover:text-[--text] hover:bg-[--muted-bg] rounded-lg transition-colors"
              >
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>

            <div className="p-6 space-y-6 max-h-[70vh] overflow-y-auto">
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label htmlFor="orderNumber" className="block text-sm font-medium text-[--text-2]">Sipariş Numarası</label>
                  <input
                    id="orderNumber"
                    type="text"
                    value={formData.orderNumber}
                    onChange={(e) => setFormData({ ...formData, orderNumber: e.target.value })}
                    placeholder="Otomatik Oluşturulacak"
                    className="w-full px-4 py-2 bg-white border border-[--line] rounded-xl text-sm text-[--text] outline-none focus:border-[--brand] transition-all"
                  />
                  <p className="text-[11px] text-[--text-muted]">Boş bırakılırsa sistem otomatik atar.</p>
                </div>
                
                <div className="space-y-2">
                  <label htmlFor="orderDate" className="block text-sm font-medium text-[--text-2]">Sipariş Tarihi *</label>
                  <input
                    id="orderDate"
                    type="date"
                    value={formData.orderDate}
                    onChange={(e) => setFormData({ ...formData, orderDate: e.target.value })}
                    className="w-full px-4 py-2 bg-white border border-[--line] rounded-xl text-sm text-[--text] outline-none focus:border-[--brand] transition-all"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label htmlFor="title" className="block text-sm font-medium text-[--text-2]">Sipariş Başlığı *</label>
                <input
                  id="title"
                  type="text"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  placeholder="500 Adet Kartvizit"
                  className="w-full px-4 py-2 bg-white border border-[--line] rounded-xl text-sm text-[--text] outline-none focus:border-[--brand] transition-all"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label htmlFor="orderType" className="block text-sm font-medium text-[--text-2]">Sipariş Türü *</label>
                  <div className="relative">
                    <select
                      id="orderType"
                      value={formData.orderType}
                      onChange={(e) => setFormData({ ...formData, orderType: e.target.value })}
                      className="w-full px-4 py-2 bg-white border border-[--line] rounded-xl text-sm text-[--text] outline-none focus:border-[--brand] transition-all appearance-none pr-10"
                    >
                      <option value="" disabled>Tür seçin</option>
                      <option value="Baskı Malzemeleri">Baskı Malzemeleri</option>
                      <option value="Tasarım Hizmeti">Tasarım Hizmeti</option>
                      <option value="Ofis Malzemeleri">Ofis Malzemeleri</option>
                      <option value="Dijital Hizmet">Dijital Hizmet</option>
                      <option value="Diğer">Diğer</option>
                    </select>
                    <div className="absolute inset-y-0 right-0 py-2 pr-3 flex items-center pointer-events-none text-[--text-muted]">
                      <span className="material-symbols-outlined text-[20px]">expand_more</span>
                    </div>
                  </div>
                </div>

                <div className="space-y-2">
                  <label htmlFor="customerId" className="block text-sm font-medium text-[--text-2]">Kayıtlı Müşteri Seç</label>
                  <div className="relative">
                    <select
                      id="customerId"
                      value={formData.customerId || ""}
                      onChange={(e) => setFormData({ ...formData, customerId: e.target.value })}
                      className="w-full px-4 py-2 bg-white border border-[--line] rounded-xl text-sm text-[--text] outline-none focus:border-[--brand] transition-all appearance-none pr-10"
                    >
                      <option value="">Bağımsız Sipariş (Aşağıdan Doldurun)</option>
                      {customers.map(c => (
                        <option key={c.id} value={c.id}>{c.name} {c.company ? `(${c.company})` : ""}</option>
                      ))}
                    </select>
                    <div className="absolute inset-y-0 right-0 py-2 pr-3 flex items-center pointer-events-none text-[--text-muted]">
                      <span className="material-symbols-outlined text-[20px]">expand_more</span>
                    </div>
                  </div>
                </div>
              </div>

              {!formData.customerId && (
                <div className="p-4 rounded-2xl border border-[--line] bg-[--page] space-y-4">
                  <h3 className="text-sm font-semibold text-[--navy]">Hızlı Müşteri Bilgileri</h3>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="space-y-2">
                      <label className="block text-xs font-medium text-[--text-muted]">Ad Soyad</label>
                      <input
                        type="text"
                        value={formData.customerName}
                        onChange={(e) => setFormData({ ...formData, customerName: e.target.value })}
                        placeholder="Örn: Ahmet Yılmaz"
                        className="w-full px-3 py-2 bg-white border border-[--line] rounded-xl text-sm text-[--text] outline-none"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="block text-xs font-medium text-[--text-muted]">Firma Adı</label>
                      <input
                        type="text"
                        value={formData.companyName}
                        onChange={(e) => setFormData({ ...formData, companyName: e.target.value })}
                        placeholder="Örn: ABC A.Ş."
                        className="w-full px-3 py-2 bg-white border border-[--line] rounded-xl text-sm text-[--text] outline-none"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="block text-xs font-medium text-[--text-muted]">Telefon</label>
                      <input
                        type="text"
                        value={formData.customerPhone}
                        onChange={(e) => setFormData({ ...formData, customerPhone: e.target.value })}
                        placeholder="+90 555 123 4567"
                        className="w-full px-3 py-2 bg-white border border-[--line] rounded-xl text-sm text-[--text] outline-none"
                      />
                    </div>
                  </div>
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="space-y-2">
                  <label htmlFor="totalAmount" className="block text-sm font-medium text-[--text-2]">Fiyat (₺)</label>
                  <input
                    id="totalAmount"
                    type="number"
                    value={formData.totalAmount || ""}
                    onChange={(e) => setFormData({ ...formData, totalAmount: Number.parseFloat(e.target.value) || undefined })}
                    placeholder="0.00"
                    step="0.01"
                    className="w-full px-4 py-2 bg-white border border-[--line] rounded-xl text-sm text-[--text] outline-none focus:border-[--brand] transition-all"
                  />
                </div>
                
                <div className="space-y-2">
                  <label htmlFor="paymentStatus" className="block text-sm font-medium text-[--text-2]">Ödeme Durumu</label>
                  <div className="relative">
                    <select
                      id="paymentStatus"
                      value={formData.paymentStatus}
                      onChange={(e) => setFormData({ ...formData, paymentStatus: e.target.value })}
                      className="w-full px-4 py-2 bg-white border border-[--line] rounded-xl text-sm text-[--text] outline-none focus:border-[--brand] transition-all appearance-none pr-10"
                    >
                      <option value="unpaid">Ödenmedi</option>
                      <option value="partial">Kısmi Ödeme</option>
                      <option value="paid">Ödendi</option>
                    </select>
                    <div className="absolute inset-y-0 right-0 py-2 pr-3 flex items-center pointer-events-none text-[--text-muted]">
                      <span className="material-symbols-outlined text-[20px]">expand_more</span>
                    </div>
                  </div>
                </div>

                <div className="space-y-2">
                  <label htmlFor="quantity" className="block text-sm font-medium text-[--text-2]">Miktar</label>
                  <input
                    id="quantity"
                    type="number"
                    value={formData.quantity || ""}
                    onChange={(e) => setFormData({ ...formData, quantity: Number.parseInt(e.target.value) || undefined })}
                    placeholder="100"
                    className="w-full px-4 py-2 bg-white border border-[--line] rounded-xl text-sm text-[--text] outline-none focus:border-[--brand] transition-all"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label htmlFor="description" className="block text-sm font-medium text-[--text-2]">Müşteri Notu</label>
                <textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Müşteri talepleri veya sipariş detayları..."
                  rows={3}
                  className="w-full px-4 py-2 bg-white border border-[--line] rounded-xl text-sm text-[--text] outline-none focus:border-[--brand] transition-all resize-none"
                />
              </div>

              <div className="space-y-2">
                <label className="block text-sm font-medium text-[--text-2]">Dosyalar</label>
                <div 
                  className="border-2 border-dashed border-[--line] hover:border-[--brand] transition-colors rounded-2xl p-8 flex flex-col items-center justify-center bg-[--page] cursor-pointer"
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={handleFileUpload}
                  onClick={() => fileInputRef.current?.click()}
                >
                  <span className="material-symbols-outlined text-4xl text-[--text-muted] mb-3">cloud_upload</span>
                  <p className="text-sm font-medium text-[--text]">Dosyaları sürükleyip bırakın</p>
                  <p className="text-xs text-[--text-muted] mt-1">veya seçmek için tıklayın</p>
                  <input 
                    type="file" 
                    ref={fileInputRef} 
                    className="hidden" 
                    multiple 
                    onChange={handleFileUpload} 
                  />
                  {isUploading && (
                    <div className="mt-4 flex items-center gap-2 text-sm text-[--brand] font-medium">
                      <span className="material-symbols-outlined animate-spin text-[18px]">progress_activity</span>
                      Yükleniyor...
                    </div>
                  )}
                </div>
                
                {formData.files.length > 0 && (
                  <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {formData.files.map((f, idx) => (
                      <div key={idx} className="flex items-center justify-between p-3 bg-white border border-[--line] rounded-xl shadow-sm">
                        <div className="flex items-center gap-3 overflow-hidden">
                          <span className="material-symbols-outlined text-[--brand] shrink-0">draft</span>
                          <div className="overflow-hidden">
                            <p className="text-sm font-medium text-[--text] truncate">{f.name}</p>
                            <p className="text-[10px] text-[--text-muted]">{(f.size / 1024).toFixed(1)} KB</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-1 shrink-0 ml-2">
                          <a 
                            href={f.url} 
                            target="_blank" 
                            rel="noreferrer"
                            className="p-1.5 text-[--text-muted] hover:text-[--text] transition-colors rounded-md"
                            title="Görüntüle"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <span className="material-symbols-outlined text-[16px]">visibility</span>
                          </a>
                          <a 
                            href={f.url} 
                            download
                            className="p-1.5 text-[--text-muted] hover:text-[--brand] transition-colors rounded-md"
                            title="İndir"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <span className="material-symbols-outlined text-[16px]">download</span>
                          </a>
                          <button 
                            type="button"
                            onClick={(e) => { e.stopPropagation(); removeFile(idx); }}
                            className="p-1.5 text-[--text-muted] hover:text-[--bad] transition-colors rounded-md"
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

            <div className="p-6 border-t border-[--line] bg-[--page] flex justify-end gap-3">
              <button
                onClick={() => setIsCreateDialogOpen(false)}
                className="px-5 py-2.5 text-sm font-medium text-[--text-2] bg-white border border-[--line] rounded-full hover:bg-[--muted-bg] transition-colors shadow-sm"
              >{tText("common.cancel", "İptal")}</button>
              <button
                onClick={handleSubmit}
                disabled={loading || !formData.title || !formData.orderType}
                className="px-5 py-2.5 text-sm font-medium text-[var(--text)] bg-gradient-to-r from-[--brand] to-[--blue] hover:opacity-90 rounded-full transition-all disabled:opacity-50 flex items-center gap-2 shadow-sm"
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
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#0B1B33]/40 backdrop-blur-sm p-4">
          <div className="bg-white border border-[--line] rounded-[20px] w-full max-w-md shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">

            <div className="p-6 border-b border-[--line] bg-[--page] flex items-start justify-between">
              <div>
                <h2 className="text-xl font-semibold text-[--navy]">Durum Güncelle</h2>
                <p className="text-sm text-[--text-muted] mt-1.5">{selectedOrder?.orderNumber} - {selectedOrder?.title}</p>
              </div>
              <button
                onClick={() => setIsStatusDialogOpen(false)}
                className="p-2 text-[--text-muted] hover:text-[--text] hover:bg-[--muted-bg] rounded-lg transition-colors shrink-0"
              >
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>

            <div className="p-6 space-y-5">
              <div className="space-y-2">
                <label htmlFor="update_status" className="block text-sm font-medium text-[--text-2]">Yeni Durum</label>
                <div className="relative">
                  <select
                    id="update_status"
                    value={statusUpdate.status}
                    onChange={(e) => setStatusUpdate({ ...statusUpdate, status: e.target.value as BranchOrder["status"] })}
                    className="w-full px-4 py-2.5 bg-white border border-[--line] rounded-xl text-sm text-[--text] outline-none focus:border-[--brand] transition-all appearance-none pr-10"
                  >
                    <option value="" disabled>Durum seçin</option>
                    <option value="pending">Bekliyor</option>
                    <option value="approved">Onaylandı</option>
                    <option value="in-progress">İşlemde</option>
                    <option value="delivered">Teslim Edildi</option>
                    <option value="rejected">Reddedildi</option>
                  </select>
                  <div className="absolute inset-y-0 right-0 py-2 pr-3 flex items-center pointer-events-none text-[--text-muted]">
                    <span className="material-symbols-outlined text-[20px]">expand_more</span>
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <label htmlFor="update_notes" className="block text-sm font-medium text-[--text-2]">Not (İsteğe bağlı)</label>
                <textarea
                  id="update_notes"
                  value={statusUpdate.notes}
                  onChange={(e) => setStatusUpdate({ ...statusUpdate, notes: e.target.value })}
                  placeholder="Durum değişikliği hakkında not ekleyin..."
                  rows={3}
                  className="w-full px-4 py-2.5 bg-white border border-[--line] rounded-xl text-sm text-[--text] outline-none focus:border-[--brand] transition-all resize-none"
                />
              </div>
            </div>

            <div className="p-6 border-t border-[--line] bg-[--page] flex justify-end gap-3">
              <button
                onClick={() => setIsStatusDialogOpen(false)}
                className="px-5 py-2.5 text-sm font-medium text-[--text-2] bg-white border border-[--line] rounded-full hover:bg-[--muted-bg] transition-colors shadow-sm"
              >{tText("common.cancel", "İptal")}</button>
              <button
                onClick={handleStatusUpdate}
                disabled={loading || !statusUpdate.status}
                className="px-5 py-2.5 text-sm font-medium text-[var(--text)] bg-gradient-to-r from-[--brand] to-[--blue] hover:opacity-90 rounded-full transition-all disabled:opacity-50 flex items-center gap-2 shadow-sm"
              >
                {loading && <span className="material-symbols-outlined animate-spin text-[18px]">progress_activity</span>}
                {loading ? "Güncelleniyor..." : "Güncelle"}
              </button>
            </div>
          </div>
        </div>
      )}
      <RmaCreateModal
        isOpen={isRmaModalOpen}
        onClose={() => setIsRmaModalOpen(false)}
        eligibleOrders={rmaModalOrder ? [rmaModalOrder] : []}
        initialOrderNumber={rmaModalOrder?.orderNumber}
        onCreated={(rma) => {
          toast.success(`${rma?.rmaNumber || "RMA"} açıldı. Omnichannel İade & RMA sekmesinden takip edebilirsiniz.`)
          router.push("/dashboard/omnichannel?tab=rma")
        }}
      />
    </StaggerContainer>
  )
}
