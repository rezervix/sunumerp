"use client"

import React, { useState, useEffect, useCallback, useMemo } from "react"
import { motion, AnimatePresence } from "framer-motion"
import {
  Play,
  Pause,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Layers,
  Search,
  Plus,
  RefreshCw,
  Filter,
  ArrowRight,
  TrendingUp,
  Cpu,
  Boxes,
  Split,
  GitMerge,
  FileText,
  DollarSign,
  ChevronRight,
  X,
  ShieldCheck,
  Package,
  Calendar,
  AlertCircle,
  Eye,
  Hammer,
} from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog"
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { useAuth } from "@/lib/auth/context"
import { ProductionShopFloorTerminal } from "./ProductionShopFloorTerminal"

const STATUS_CONFIG: Record<
  string,
  { label: string; badgeClass: string; icon: React.ElementType }
> = {
  PLANNED: {
    label: "Planlandı",
    badgeClass: "bg-blue-500/10 text-blue-400 border-blue-500/20",
    icon: Clock,
  },
  APPROVED: {
    label: "Onaylandı",
    badgeClass: "bg-[var(--brand-soft)] text-[var(--brand)] border-[var(--brand-line)]",
    icon: ShieldCheck,
  },
  RELEASED: {
    label: "Serbest Bırakıldı",
    badgeClass: "bg-[var(--brand-soft)] text-[var(--brand)] border-[var(--brand-line)]",
    icon: Layers,
  },
  IN_PROGRESS: {
    label: "Devam Ediyor",
    badgeClass: "bg-[--brand]/10 text-[--brand] border-[--brand-line]",
    icon: Play,
  },
  PAUSED: {
    label: "Duraklatıldı",
    badgeClass: "bg-[var(--warn-soft)] text-[var(--warn)] border-[var(--warn-line)]",
    icon: Pause,
  },
  COMPLETED: {
    label: "Tamamlandı",
    badgeClass: "bg-[var(--brand-soft)] text-[var(--brand)] border-[var(--brand-line)]",
    icon: CheckCircle2,
  },
  CLOSED: {
    label: "Kapandı",
    badgeClass: "bg-[var(--muted-bg)]/10 text-[var(--text-muted)] border-[var(--line)]/20",
    icon: CheckCircle2,
  },
  CANCELLED: {
    label: "İptal Edildi",
    badgeClass: "bg-[var(--bad-soft)] text-red-400 border-[var(--bad-line)]",
    icon: X,
  },
}

export function ProductionWorkOrderWorkspace() {
  const { currentBranch, hasPermission, isSuperAdmin } = useAuth()

  // Sekmeler: dashboard, work_orders, terminal
  const [activeTab, setActiveTab] = useState<"dashboard" | "work_orders" | "terminal">("dashboard")

  // Canlı Gösterge Verileri
  const [dashboardData, setDashboardData] = useState<any>(null)
  const [loadingDashboard, setLoadingDashboard] = useState(false)

  // İş Emirleri Listesi
  const [workOrders, setWorkOrders] = useState<any[]>([])
  const [loadingOrders, setLoadingOrders] = useState(false)
  const [statusFilter, setStatusFilter] = useState<string>("ALL")
  const [priorityFilter, setPriorityFilter] = useState<string>("ALL")
  const [searchQuery, setSearchQuery] = useState<string>("")
  const [pagination, setPagination] = useState({ page: 1, pageSize: 20, total: 0, totalPages: 1 })

  // Seçili İş Emri & Detay Çekmecesi
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null)
  const [orderDetail, setOrderDetail] = useState<any>(null)
  const [loadingDetail, setLoadingDetail] = useState(false)
  const [detailTab, setDetailTab] = useState<"materials" | "operations" | "stoppages" | "costing">("materials")
  const [costSummary, setCostSummary] = useState<any>(null)

  // Yeni İş Emri Modalı
  const [createModalOpen, setCreateModalOpen] = useState(false)
  const [bomList, setBomList] = useState<any[]>([])
  const [routingList, setRoutingList] = useState<any[]>([])
  const [newOrderForm, setNewOrderForm] = useState({
    itemId: "",
    plannedQuantity: "100",
    unit: "ADET",
    bomId: "",
    routingId: "",
    priority: "MEDIUM",
    targetWarehouseId: "DEFAULT_WAREHOUSE",
    lotNumber: "",
    notes: "",
  })

  // Manuel Malzeme Sarfiyatı Modalı
  const [issueMaterialModalOpen, setIssueMaterialModalOpen] = useState(false)
  const [selectedMaterial, setSelectedMaterial] = useState<any>(null)
  const [issueQty, setIssueQty] = useState("")
  const [issueLot, setIssueLot] = useState("")

  // İş Emri Bölme Modalı
  const [splitModalOpen, setSplitModalOpen] = useState(false)
  const [splitQty, setSplitQty] = useState("")

  // ─────────────────────────────────────────────────────────────
  // 1. VERİ YÜKLEME FONKSİYONLARI
  // ─────────────────────────────────────────────────────────────

  const fetchDashboard = useCallback(async () => {
    setLoadingDashboard(true)
    try {
      const res = await fetch("/api/production/work-orders?section=dashboard")
      const data = await res.json()
      if (data.success) {
        setDashboardData(data.dashboard)
      }
    } catch (err) {
      toast.error("Gösterge paneli yüklenemedi.")
    } finally {
      setLoadingDashboard(false)
    }
  }, [])

  const fetchWorkOrders = useCallback(async () => {
    setLoadingOrders(true)
    try {
      const params = new URLSearchParams()
      params.set("section", "work_orders")
      if (statusFilter !== "ALL") params.set("status", statusFilter)
      if (priorityFilter !== "ALL") params.set("priority", priorityFilter)
      if (searchQuery.trim()) params.set("search", searchQuery.trim())
      params.set("page", String(pagination.page))
      params.set("pageSize", String(pagination.pageSize))

      const res = await fetch(`/api/production/work-orders?${params.toString()}`)
      const data = await res.json()
      if (data.success) {
        setWorkOrders(data.workOrders || [])
        if (data.pagination) setPagination(data.pagination)
      }
    } catch (err) {
      toast.error("İş emirleri yüklenemedi.")
    } finally {
      setLoadingOrders(false)
    }
  }, [statusFilter, priorityFilter, searchQuery, pagination.page, pagination.pageSize])

  const fetchOrderDetail = useCallback(async (id: string) => {
    setLoadingDetail(true)
    try {
      const [orderRes, costRes] = await Promise.all([
        fetch(`/api/production/work-orders?section=work_order&id=${id}`),
        fetch(`/api/production/work-orders?section=cost_summary&id=${id}`),
      ])
      const orderData = await orderRes.json()
      const costData = await costRes.json()

      if (orderData.success) setOrderDetail(orderData.workOrder)
      if (costData.success) setCostSummary(costData.costSummary)
    } catch (err) {
      toast.error("İş emri detayı alınamadı.")
    } finally {
      setLoadingDetail(false)
    }
  }, [])

  // BOM ve Rota Seçeneklerini Yükle (Yeni İş Emri İçin)
  const fetchBomsAndRoutings = async () => {
    try {
      const res = await fetch("/api/production/bom-rota?section=boms")
      const data = await res.json()
      if (data.success && data.boms) {
        setBomList(data.boms)
      }
    } catch (err) {
      console.error(err)
    }
  }

  useEffect(() => {
    fetchDashboard()
    fetchWorkOrders()
  }, [fetchDashboard, fetchWorkOrders])

  useEffect(() => {
    if (selectedOrderId) {
      fetchOrderDetail(selectedOrderId)
    } else {
      setOrderDetail(null)
      setCostSummary(null)
    }
  }, [selectedOrderId, fetchOrderDetail])

  // ─────────────────────────────────────────────────────────────
  // 2. İŞLEM EYLEMLERİ (DURUM DEĞİŞİMİ, ONAY, SERBEST BIRAKMA)
  // ─────────────────────────────────────────────────────────────

  const handleStatusChange = async (targetStatus: string, reason?: string) => {
    if (!selectedOrderId) return
    try {
      const res = await fetch("/api/production/work-orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "update_status",
          workOrderId: selectedOrderId,
          targetStatus,
          reason,
        }),
      })
      const data = await res.json()
      if (data.success) {
        toast.success(`İş emri durumu güncellendi: ${STATUS_CONFIG[targetStatus]?.label || targetStatus}`)
        fetchOrderDetail(selectedOrderId)
        fetchWorkOrders()
        fetchDashboard()
      } else {
        toast.error(data.error || "Durum güncellenemedi.")
      }
    } catch (err) {
      toast.error("Bağlantı hatası.")
    }
  }

  const handleCreateWorkOrder = async () => {
    if (!newOrderForm.itemId || !newOrderForm.plannedQuantity) {
      toast.error("Lütfen mamul ve planlanan miktar alanlarını doldurun.")
      return
    }
    try {
      const res = await fetch("/api/production/work-orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "create_work_order",
          itemId: newOrderForm.itemId,
          plannedQuantity: Number(newOrderForm.plannedQuantity),
          unit: newOrderForm.unit,
          bomId: newOrderForm.bomId || undefined,
          routingId: newOrderForm.routingId || undefined,
          priority: newOrderForm.priority,
          targetWarehouseId: newOrderForm.targetWarehouseId,
          lotNumber: newOrderForm.lotNumber || undefined,
          notes: newOrderForm.notes || undefined,
        }),
      })
      const data = await res.json()
      if (data.success) {
        toast.success(`İş emri oluşturuldu: ${data.workOrder.workOrderNumber}`)
        setCreateModalOpen(false)
        fetchWorkOrders()
        fetchDashboard()
      } else {
        toast.error(data.error || "İş emri oluşturulamadı.")
      }
    } catch (err) {
      toast.error("Bağlantı hatası.")
    }
  }

  const handleIssueMaterial = async () => {
    if (!selectedMaterial || !issueQty) return
    try {
      const res = await fetch("/api/production/work-orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "issue_material",
          materialId: selectedMaterial.id,
          quantity: Number(issueQty),
          lotNumber: issueLot || undefined,
        }),
      })
      const data = await res.json()
      if (data.success) {
        toast.success("Hammadde fiili sarfiyatı işlendi.")
        setIssueMaterialModalOpen(false)
        setSelectedMaterial(null)
        setIssueQty("")
        setIssueLot("")
        if (selectedOrderId) fetchOrderDetail(selectedOrderId)
      } else {
        toast.error(data.error || "Sarfiyat yapılamadı.")
      }
    } catch (err) {
      toast.error("Bağlantı hatası.")
    }
  }

  const handleSplitWorkOrder = async () => {
    if (!selectedOrderId || !splitQty) return
    try {
      const res = await fetch("/api/production/work-orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "split",
          workOrderId: selectedOrderId,
          splitQuantity: Number(splitQty),
        }),
      })
      const data = await res.json()
      if (data.success) {
        toast.success(`İş emri bölündü. Yeni alt iş emri: ${data.childOrder?.workOrderNumber}`)
        setSplitModalOpen(false)
        setSplitQty("")
        fetchOrderDetail(selectedOrderId)
        fetchWorkOrders()
        fetchDashboard()
      } else {
        toast.error(data.error || "İş emri bölünemedi.")
      }
    } catch (err) {
      toast.error("Bağlantı hatası.")
    }
  }

  return (
    <div className="space-y-6">
      {/* ── ÜST BAŞLIK & SEKMELER ── */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs uppercase tracking-wider font-semibold text-[--brand]">
              Üretim Yönetim Sistemi (Faz 5)
            </span>
            <span className="px-2 py-0.5 rounded-full text-[10px] font-mono bg-[--brand]/10 text-[--brand] border border-[--brand-line]">
              Canlı İcra
            </span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-[var(--text)] mt-1">
            İş Emirleri & Atölye İcra (Shop Floor)
          </h1>
          <p className="text-xs text-[var(--text-muted)] mt-0.5">
            İş emri yaşam döngüsü, donmuş reçete/rota anlık görüntüsü, backflush sarfiyat ve atölye terminali.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {/* Sekme Değiştirici */}
          <div className="flex p-1 rounded-xl bg-[var(--bg)] border border-[--line] text-xs">
            <button
              onClick={() => setActiveTab("dashboard")}
              className={`px-3 py-1.5 rounded-lg font-medium transition-colors ${ activeTab === "dashboard" ? "bg-[--brand] text-white shadow" : "text-[var(--text-muted)] hover:text-[var(--brand)]" }`}
            >
              Canlı Gösterge
            </button>
            <button
              onClick={() => setActiveTab("work_orders")}
              className={`px-3 py-1.5 rounded-lg font-medium transition-colors ${ activeTab === "work_orders" ? "bg-[--brand] text-white shadow" : "text-[var(--text-muted)] hover:text-[var(--brand)]" }`}
            >
              İş Emirleri
            </button>
            <button
              onClick={() => setActiveTab("terminal")}
              className={`px-3 py-1.5 rounded-lg font-medium transition-colors flex items-center gap-1.5 ${ activeTab === "terminal" ? "bg-[--brand] text-white shadow" : "text-[var(--text-muted)] hover:text-[var(--brand)]" }`}
            >
              <Cpu className="w-3.5 h-3.5 text-[var(--brand)]" />
              Atölye Terminali
            </button>
          </div>

          <Button
            onClick={() => {
              fetchBomsAndRoutings()
              setCreateModalOpen(true)
            }}
            className="btn-primary-emerald rounded-xl px-4 py-2 text-xs font-semibold flex items-center gap-1.5"
          >
            <Plus className="w-4 h-4" />
            Yeni İş Emri
          </Button>
        </div>
      </div>

      {/* ── SEKME 1: CANLI GÖSTERGE PANELİ ── */}
      {activeTab === "dashboard" && (
        <div className="space-y-6">
          {/* Üst KPI Kartları */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="p-4 rounded-2xl bg-[var(--bg)]/70 border border-[--line]">
              <span className="text-[11px] font-medium uppercase tracking-wider text-[var(--text-muted)]">
                Aktif İş Emirleri
              </span>
              <div className="text-2xl font-light text-[var(--text)] font-mono mt-1">
                {dashboardData?.activeOrdersCount ?? 0}
              </div>
              <p className="text-[11px] text-[var(--text-muted)] mt-1">
                {dashboardData?.totalOrdersCount ?? 0} Toplam İş Emri
              </p>
            </div>

            <div className="p-4 rounded-2xl bg-[var(--bg)]/70 border border-[--line]">
              <span className="text-[11px] font-medium uppercase tracking-wider text-[--brand]">
                Devam Eden Operasyonlar
              </span>
              <div className="text-2xl font-light text-[--brand] font-mono mt-1">
                {dashboardData?.inProgressOperationsCount ?? 0}
              </div>
              <p className="text-[11px] text-[var(--text-muted)] mt-1">Atölyede Tezgah Başında</p>
            </div>

            <div className="p-4 rounded-2xl bg-[var(--bg)]/70 border border-[--line]">
              <span className="text-[11px] font-medium uppercase tracking-wider text-[var(--warn)]">
                Geciken İş Emirleri
              </span>
              <div className="text-2xl font-light text-[var(--warn)] font-mono mt-1">
                {dashboardData?.delayedOrdersCount ?? 0}
              </div>
              <p className="text-[11px] text-[var(--text-muted)] mt-1">Termin Tarihi Aşılan</p>
            </div>

            <div className="p-4 rounded-2xl bg-[var(--bg)]/70 border border-[--line]">
              <span className="text-[11px] font-medium uppercase tracking-wider text-[var(--brand)]">
                Genel OEE / Tamamlanma
              </span>
              <div className="text-2xl font-light text-[var(--brand)] font-mono mt-1">
                {dashboardData?.averageCompletionRate ?? 0}%
              </div>
              <p className="text-[11px] text-[var(--text-muted)] mt-1">Planlanan vs Fiili Gerçekleşme</p>
            </div>
          </div>

          {/* Durum Dağılımı Rozetleri */}
          <div className="p-4 rounded-2xl bg-[var(--muted-bg)] border border-[--line] flex flex-wrap items-center justify-between gap-3">
            <span className="text-xs font-semibold text-[var(--text-2)]">İş Emri Durum Dağılımı:</span>
            <div className="flex flex-wrap items-center gap-2">
              {Object.entries(dashboardData?.statusCounts || {}).map(([st, cnt]) => (
                <span
                  key={st}
                  className={`text-xs px-2.5 py-1 rounded-lg border font-mono ${ STATUS_CONFIG[st]?.badgeClass || "bg-[var(--muted-bg)] text-[var(--text-2)]" }`}
                >
                  {STATUS_CONFIG[st]?.label || st}: <strong>{String(cnt)}</strong>
                </span>
              ))}
            </div>
          </div>

          {/* Aktif İş Emirleri Canlı Çizelgesi */}
          <div className="glass-table-container overflow-hidden rounded-2xl border border-[--line]">
            <div className="px-5 py-4 border-b border-[--line] flex items-center justify-between">
              <div>
                <h3 className="text-sm font-semibold text-[var(--text)]">Canlı Atölye İş Emirleri</h3>
                <p className="text-xs text-[var(--text-muted)]">Devam eden ve serbest bırakılmış üretim emirleri</p>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={fetchDashboard}
                disabled={loadingDashboard}
                className="h-8 border-[--line] text-xs"
              >
                <RefreshCw className={`w-3.5 h-3.5 mr-1.5 ${loadingDashboard ? "animate-spin" : ""}`} />
                Yenile
              </Button>
            </div>

            <Table>
              <TableHeader>
                <TableRow className="border-b border-[--line] bg-[--page]">
                  <TableHead className="text-xs">İş Emri No</TableHead>
                  <TableHead className="text-xs">Mamul / Ürün</TableHead>
                  <TableHead className="text-xs">Durum</TableHead>
                  <TableHead className="text-xs">İlerleme (%)</TableHead>
                  <TableHead className="text-xs">Üretilen / Planlanan</TableHead>
                  <TableHead className="text-xs">Gecikme</TableHead>
                  <TableHead className="text-xs text-right">Eylem</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(!dashboardData?.activeOrders || dashboardData.activeOrders.length === 0) ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-8 text-xs text-[var(--text-muted)]">
                      Şu anda devam eden aktif iş emri bulunmuyor.
                    </TableCell>
                  </TableRow>
                ) : (
                  dashboardData.activeOrders.map((order: any) => {
                    const st = STATUS_CONFIG[order.status] || STATUS_CONFIG.PLANNED
                    const Icon = st.icon
                    const progress = order.plannedQuantity > 0
                      ? Math.min(100, Math.round((order.producedQuantity / order.plannedQuantity) * 100))
                      : 0

                    return (
                      <TableRow key={order.id} className="border-b border-[var(--line-soft)] hover:bg-[--page]">
                        <TableCell className="font-mono text-xs font-semibold text-[var(--text)]">
                          {order.workOrderNumber}
                        </TableCell>
                        <TableCell>
                          <div className="text-xs font-medium text-[var(--text)]">{order.item?.name}</div>
                          <div className="text-[10px] text-[var(--text-muted)] font-mono">{order.item?.sku}</div>
                        </TableCell>
                        <TableCell>
                          <span className={`inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-full border ${st.badgeClass}`}>
                            <Icon className="w-3 h-3" />
                            {st.label}
                          </span>
                        </TableCell>
                        <TableCell>
                          <div className="w-32">
                            <div className="flex justify-between text-[10px] font-mono text-[var(--text-muted)] mb-1">
                              <span>%{progress}</span>
                            </div>
                            <div className="w-full h-1.5 rounded-full bg-[var(--muted-bg)] overflow-hidden">
                              <div
                                className="h-full bg-[--brand] rounded-full transition-all"
                                style={{ width: `${progress}%` }}
                              />
                            </div>
                          </div>
                        </TableCell>
                        <TableCell className="font-mono text-xs">
                          <span className="text-[--brand] font-bold">{order.producedQuantity}</span> / {order.plannedQuantity} {order.unit}
                        </TableCell>
                        <TableCell>
                          {order.isDelayed ? (
                            <span className="text-[11px] text-[var(--warn)] flex items-center gap-1 font-medium">
                              <AlertCircle className="w-3.5 h-3.5" /> Gecikmede
                            </span>
                          ) : (
                            <span className="text-[11px] text-[var(--text-muted)]">Zamanında</span>
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setSelectedOrderId(order.id)}
                            className="h-8 px-2 text-xs text-[var(--text-2)] hover:text-[var(--brand)]"
                          >
                            <Eye className="w-3.5 h-3.5 mr-1" />
                            Detay
                          </Button>
                        </TableCell>
                      </TableRow>
                    )
                  })
                )}
              </TableBody>
            </Table>
          </div>
        </div>
      )}

      {/* ── SEKME 2: İŞ EMİRLERİ LİSTESİ VE YÖNETİMİ ── */}
      {activeTab === "work_orders" && (
        <div className="space-y-4">
          {/* Filtre ve Arama Çubuğu */}
          <div className="p-4 rounded-2xl bg-[var(--bg)] border border-[--line] flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-3 flex-1">
              <div className="relative min-w-[240px] max-w-sm">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text-muted)]" />
                <Input
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="İş emri no, ürün, lot no ara..."
                  className="pl-9 h-9 bg-[var(--bg)] border-[--line] text-xs"
                />
              </div>

              <div className="w-40">
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="h-9 bg-[var(--bg)] border-[--line] text-xs">
                    <SelectValue placeholder="Tüm Durumlar" />
                  </SelectTrigger>
                  <SelectContent className="bg-[var(--bg)] border-[--line] text-[var(--text)] text-xs">
                    <SelectItem value="ALL">Tüm Durumlar</SelectItem>
                    <SelectItem value="PLANNED">Planlandı</SelectItem>
                    <SelectItem value="APPROVED">Onaylandı</SelectItem>
                    <SelectItem value="RELEASED">Serbest Bırakıldı</SelectItem>
                    <SelectItem value="IN_PROGRESS">Devam Ediyor</SelectItem>
                    <SelectItem value="PAUSED">Duraklatıldı</SelectItem>
                    <SelectItem value="COMPLETED">Tamamlandı</SelectItem>
                    <SelectItem value="CLOSED">Kapandı</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="w-36">
                <Select value={priorityFilter} onValueChange={setPriorityFilter}>
                  <SelectTrigger className="h-9 bg-[var(--bg)] border-[--line] text-xs">
                    <SelectValue placeholder="Tüm Öncelikler" />
                  </SelectTrigger>
                  <SelectContent className="bg-[var(--bg)] border-[--line] text-[var(--text)] text-xs">
                    <SelectItem value="ALL">Tüm Öncelikler</SelectItem>
                    <SelectItem value="LOW">Düşük</SelectItem>
                    <SelectItem value="MEDIUM">Normal</SelectItem>
                    <SelectItem value="HIGH">Yüksek</SelectItem>
                    <SelectItem value="URGENT">Acil</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <Button
              variant="outline"
              size="sm"
              onClick={fetchWorkOrders}
              disabled={loadingOrders}
              className="h-9 border-[--line] text-xs"
            >
              <RefreshCw className={`w-3.5 h-3.5 mr-1.5 ${loadingOrders ? "animate-spin" : ""}`} />
              Filtrele
            </Button>
          </div>

          {/* İş Emirleri Tablosu */}
          <div className="glass-table-container overflow-hidden rounded-2xl border border-[--line]">
            <Table>
              <TableHeader>
                <TableRow className="border-b border-[--line] bg-[--page]">
                  <TableHead className="text-xs">İş Emri No</TableHead>
                  <TableHead className="text-xs">Ürün Adı / SKU</TableHead>
                  <TableHead className="text-xs">Durum</TableHead>
                  <TableHead className="text-xs">Öncelik</TableHead>
                  <TableHead className="text-xs">Planlanan Miktar</TableHead>
                  <TableHead className="text-xs">Üretilen</TableHead>
                  <TableHead className="text-xs">Kaynak</TableHead>
                  <TableHead className="text-xs text-right">Detay</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {workOrders.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center py-12 text-xs text-[var(--text-muted)]">
                      Kayıtlı üretim / iş emri bulunamadı.
                    </TableCell>
                  </TableRow>
                ) : (
                  workOrders.map((wo) => {
                    const st = STATUS_CONFIG[wo.status] || STATUS_CONFIG.PLANNED
                    const Icon = st.icon

                    return (
                      <TableRow
                        key={wo.id}
                        onClick={() => setSelectedOrderId(wo.id)}
                        className="border-b border-[var(--line-soft)] hover:bg-white cursor-pointer"
                      >
                        <TableCell className="font-mono text-xs font-bold text-[var(--text)]">
                          {wo.workOrderNumber}
                        </TableCell>
                        <TableCell>
                          <div className="text-xs font-semibold text-[var(--text)]">{wo.item?.name}</div>
                          <div className="text-[10px] text-[var(--text-muted)] font-mono">{wo.item?.sku}</div>
                        </TableCell>
                        <TableCell>
                          <span className={`inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-full border ${st.badgeClass}`}>
                            <Icon className="w-3 h-3" />
                            {st.label}
                          </span>
                        </TableCell>
                        <TableCell>
                          <span
                            className={`text-[10px] font-mono font-semibold px-2 py-0.5 rounded ${ wo.priority === "URGENT" ? "bg-[var(--bad-soft)] text-red-300" : wo.priority === "HIGH" ? "bg-[var(--warn-soft)] text-[var(--warn)]" : "bg-[var(--muted-bg)] text-[var(--text-muted)]" }`}
                          >
                            {wo.priority}
                          </span>
                        </TableCell>
                        <TableCell className="font-mono text-xs font-medium text-[var(--text)]">
                          {wo.plannedQuantity} {wo.unit}
                        </TableCell>
                        <TableCell className="font-mono text-xs text-[--brand] font-bold">
                          {wo.producedQuantity} {wo.unit}
                        </TableCell>
                        <TableCell className="text-xs text-[var(--text-muted)] font-mono">
                          {wo.sourceType}
                        </TableCell>
                        <TableCell className="text-right">
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 w-7 p-0 text-[var(--text-muted)] hover:text-[var(--brand)]"
                          >
                            <ChevronRight className="w-4 h-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    )
                  })
                )}
              </TableBody>
            </Table>
          </div>
        </div>
      )}

      {/* ── SEKME 3: ATÖLYE (SHOP FLOOR) TERMİNALİ ── */}
      {activeTab === "terminal" && <ProductionShopFloorTerminal />}

      {/* ── DETAY ÇEKMECESİ (SHEET / DRAWER) ── */}
      <Sheet open={!!selectedOrderId} onOpenChange={(open) => !open && setSelectedOrderId(null)}>
        <SheetContent className="sm:max-w-2xl bg-[var(--bg)] border-[--line] text-[var(--text)] overflow-y-auto">
          {loadingDetail || !orderDetail ? (
            <div className="py-20 text-center text-[var(--text-muted)] text-sm">
              <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-[--brand]" />
              İş emri detayları yükleniyor...
            </div>
          ) : (
            <div className="space-y-6">
              <SheetHeader>
                <div className="flex items-center gap-2">
                  <span className="font-mono text-xs px-2 py-0.5 rounded bg-[--brand]/10 text-[--brand] border border-[--brand-line]">
                    {orderDetail.workOrderNumber}
                  </span>
                  <span
                    className={`text-xs px-2 py-0.5 rounded-full border ${ STATUS_CONFIG[orderDetail.status]?.badgeClass }`}
                  >
                    {STATUS_CONFIG[orderDetail.status]?.label || orderDetail.status}
                  </span>
                </div>
                <SheetTitle className="text-xl font-bold text-[var(--text)] mt-1">
                  {orderDetail.item?.name}
                </SheetTitle>
                <SheetDescription className="text-xs text-[var(--text-muted)]">
                  {orderDetail.item?.sku} · Lot: {orderDetail.lotNumber || "Atanmadı"} · Depo: {orderDetail.targetWarehouseId}
                </SheetDescription>
              </SheetHeader>

              {/* DURUM EYLEMLERİ ÇUBUĞU */}
              <div className="p-3 rounded-xl bg-[var(--bg)] border border-[--line] flex flex-wrap items-center gap-2">
                <span className="text-xs text-[var(--text-muted)] font-medium mr-1">Eylemler:</span>

                {orderDetail.status === "PLANNED" && (
                  <Button
                    size="sm"
                    onClick={() => handleStatusChange("APPROVED")}
                    className="h-8 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold"
                  >
                    <ShieldCheck className="w-3.5 h-3.5 mr-1" />
                    Onayla
                  </Button>
                )}

                {(orderDetail.status === "PLANNED" || orderDetail.status === "APPROVED") && (
                  <Button
                    size="sm"
                    onClick={() => handleStatusChange("RELEASED")}
                    className="h-8 bg-[var(--brand-soft)] hover:bg-[var(--brand-soft)] text-[var(--brand)] font-medium text-xs font-semibold"
                  >
                    <Layers className="w-3.5 h-3.5 mr-1" />
                    Serbest Bırak (Rezerve Et)
                  </Button>
                )}

                {orderDetail.status === "RELEASED" && (
                  <Button
                    size="sm"
                    onClick={() => handleStatusChange("IN_PROGRESS")}
                    className="h-8 bg-[--brand] hover:bg-[--brand] text-white text-xs font-semibold"
                  >
                    <Play className="w-3.5 h-3.5 mr-1" />
                    Üretime Başla
                  </Button>
                )}

                {orderDetail.status === "IN_PROGRESS" && (
                  <Button
                    size="sm"
                    onClick={() => handleStatusChange("COMPLETED")}
                    className="h-8 bg-[var(--brand-soft)] hover:bg-[var(--brand-soft)] text-[var(--brand)] font-medium text-xs font-semibold"
                  >
                    <CheckCircle2 className="w-3.5 h-3.5 mr-1" />
                    İş Emrini Tamamla
                  </Button>
                )}

                {orderDetail.status === "COMPLETED" && (
                  <Button
                    size="sm"
                    onClick={() => handleStatusChange("CLOSED")}
                    className="h-8 bg-[var(--muted-bg)] hover:bg-[var(--muted-bg)] text-[var(--text)] text-xs font-semibold"
                  >
                    Kapat & Arşivle
                  </Button>
                )}

                {orderDetail.status === "PLANNED" && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setSplitModalOpen(true)}
                    className="h-8 border-[--line] text-xs"
                  >
                    <Split className="w-3.5 h-3.5 mr-1 text-[var(--brand)]" />
                    Böl (Split)
                  </Button>
                )}
              </div>

              {/* Alt Sekmeler */}
              <div className="flex border-b border-[--line] text-xs font-medium">
                <button
                  onClick={() => setDetailTab("materials")}
                  className={`pb-2 px-3 transition-colors ${ detailTab === "materials" ? "border-b-2 border-[--brand] text-[--brand] font-bold" : "text-[var(--text-muted)] hover:text-[var(--brand)]" }`}
                >
                  Malzemeler ({orderDetail.materials?.length || 0})
                </button>
                <button
                  onClick={() => setDetailTab("operations")}
                  className={`pb-2 px-3 transition-colors ${ detailTab === "operations" ? "border-b-2 border-[--brand] text-[--brand] font-bold" : "text-[var(--text-muted)] hover:text-[var(--brand)]" }`}
                >
                  Operasyonlar ({orderDetail.operations?.length || 0})
                </button>
                <button
                  onClick={() => setDetailTab("costing")}
                  className={`pb-2 px-3 transition-colors ${ detailTab === "costing" ? "border-b-2 border-[--brand] text-[--brand] font-bold" : "text-[var(--text-muted)] hover:text-[var(--brand)]" }`}
                >
                  Fiili Maliyet & Sapma
                </button>
              </div>

              {/* SEKME: MALZEME LİSTESİ */}
              {detailTab === "materials" && (
                <div className="space-y-3">
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow className="border-b border-[--line] bg-[--page]">
                          <TableHead className="text-xs">Hammadde</TableHead>
                          <TableHead className="text-xs">Gerekli</TableHead>
                          <TableHead className="text-xs">Rezerve</TableHead>
                          <TableHead className="text-xs">Sarf Edilen</TableHead>
                          <TableHead className="text-xs">Yöntem</TableHead>
                          <TableHead className="text-xs text-right">Eylem</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {orderDetail.materials?.map((mat: any) => (
                          <TableRow key={mat.id} className="border-b border-[var(--line-soft)] text-xs">
                            <TableCell>
                              <div className="font-semibold text-[var(--text)]">{mat.item?.name}</div>
                              <div className="text-[10px] text-[var(--text-muted)] font-mono">{mat.item?.sku}</div>
                            </TableCell>
                            <TableCell className="font-mono">{mat.requiredQuantity} {mat.unit}</TableCell>
                            <TableCell className="font-mono text-[var(--brand)]">{mat.reservedQuantity} {mat.unit}</TableCell>
                            <TableCell className="font-mono text-[--brand] font-bold">{mat.issuedQuantity} {mat.unit}</TableCell>
                            <TableCell>
                              <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-[var(--muted-bg)] border border-[--line]">
                                {mat.consumptionMethod}
                              </span>
                            </TableCell>
                            <TableCell className="text-right">
                              {mat.consumptionMethod === "MANUAL" && (
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => {
                                    setSelectedMaterial(mat)
                                    setIssueQty(String(mat.requiredQuantity - mat.issuedQuantity))
                                    setIssueMaterialModalOpen(true)
                                  }}
                                  className="h-7 text-[11px] border-[--brand-line] text-[--brand]"
                                >
                                  Sarf Et
                                </Button>
                              )}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </div>
              )}

              {/* SEKME: OPERASYONLAR */}
              {detailTab === "operations" && (
                <div className="space-y-3">
                  {orderDetail.operations?.map((op: any) => (
                    <div
                      key={op.id}
                      className="p-3 rounded-xl bg-[var(--bg)] border border-[var(--line-soft)] flex items-center justify-between text-xs"
                    >
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-mono font-bold text-[var(--text)]">#{op.operationNumber}</span>
                          <span className="font-semibold text-[var(--text-2)]">{op.operationName}</span>
                          <span className="text-[10px] text-[var(--text-muted)] font-mono">({op.workCenter?.name || "İstasyon"})</span>
                        </div>
                        <p className="text-[11px] text-[var(--text-muted)] mt-1">
                          Hazırlık: {op.setupTimeMinutes} dk · Birim Çevrim: {op.runTimeMinutesPerUnit} dk
                        </p>
                      </div>

                      <div className="text-right font-mono">
                        <span className="text-[--brand] font-bold">{op.producedQuantity}</span> / {op.plannedQuantity}
                        <div className="text-[10px] text-[var(--text-muted)]">{op.status}</div>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* SEKME: FİİLİ MALİYET & SAPMA ANALİZİ */}
              {detailTab === "costing" && (
                <div className="space-y-4">
                  {costSummary ? (
                    <div className="space-y-4">
                      <div className="grid grid-cols-2 gap-3">
                        <div className="p-3 rounded-xl bg-[var(--bg)] border border-[var(--line-soft)]">
                          <p className="text-[10px] text-[var(--text-muted)] uppercase">Teorik Standart Maliyet</p>
                          <p className="text-lg font-mono font-bold text-[var(--text)] mt-1">
                            ₺{costSummary.totalPlannedCost?.toLocaleString("tr-TR", { minimumFractionDigits: 2 })}
                          </p>
                        </div>

                        <div className="p-3 rounded-xl bg-[var(--bg)] border border-[var(--line-soft)]">
                          <p className="text-[10px] text-[var(--text-muted)] uppercase">Gerçekleşen Fiili Maliyet</p>
                          <p className="text-lg font-mono font-bold text-[--brand] mt-1">
                            ₺{costSummary.totalActualCost?.toLocaleString("tr-TR", { minimumFractionDigits: 2 })}
                          </p>
                        </div>
                      </div>

                      <div className="p-4 rounded-xl bg-[var(--bg)] border border-[var(--line-soft)] space-y-2 text-xs">
                        <div className="flex justify-between">
                          <span className="text-[var(--text-muted)]">Fiili Malzeme Sarfiyatı:</span>
                          <span className="font-mono text-[var(--text)]">₺{costSummary.actualMaterialCost?.toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-[var(--text-muted)]">Fiili İşçilik Maliyeti:</span>
                          <span className="font-mono text-[var(--text)]">₺{costSummary.actualLaborCost?.toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-[var(--text-muted)]">Fiili Makine & Enerji Maliyeti:</span>
                          <span className="font-mono text-[var(--text)]">₺{costSummary.actualMachineCost?.toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-[var(--text-muted)]">Hurda / Fire Maliyeti:</span>
                          <span className="font-mono text-red-400">₺{costSummary.scrapCost?.toFixed(2)}</span>
                        </div>
                        <div className="pt-2 border-t border-[--line] flex justify-between font-bold">
                          <span className="text-[var(--text-2)]">Maliyet Sapması:</span>
                          <span className={`font-mono ${costSummary.varianceAmount > 0 ? "text-red-400" : "text-[--brand]"}`}>
                            {costSummary.variancePercentage > 0 ? "+" : ""}{costSummary.variancePercentage?.toFixed(2)}% (₺{costSummary.varianceAmount?.toFixed(2)})
                          </span>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="p-8 text-center text-xs text-[var(--text-muted)]">
                      Maliyet verileri hesaplanıyor veya operasyon henüz başlamadı.
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </SheetContent>
      </Sheet>

      {/* ── MODAL: YENİ İŞ EMRİ OLUŞTUR ── */}
      <Dialog open={createModalOpen} onOpenChange={setCreateModalOpen}>
        <DialogContent className="bg-[var(--bg)] border-[--line] text-[var(--text)] sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Yeni Üretim / İş Emri Aç</DialogTitle>
            <DialogDescription className="text-[var(--text-muted)]">
              Mamul seçerek donmuş reçete (BOM) ve operasyon rotası anlık görüntüsünü oluşturun.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div>
              <Label className="text-xs text-[var(--text-2)]">Reçeteli Mamul (BOM) Seçin *</Label>
              <Select
                value={newOrderForm.bomId}
                onValueChange={(val) => {
                  const b = bomList.find((x) => x.id === val)
                  setNewOrderForm((prev) => ({
                    ...prev,
                    bomId: val,
                    itemId: b?.itemId || prev.itemId,
                    routingId: b?.routingId || prev.routingId,
                  }))
                }}
              >
                <SelectTrigger className="bg-[var(--bg)] border-[--line] mt-1 text-xs">
                  <SelectValue placeholder="Reçete / Mamul Seçiniz" />
                </SelectTrigger>
                <SelectContent className="bg-[var(--bg)] border-[--line] text-[var(--text)] text-xs">
                  {bomList.map((b) => (
                    <SelectItem key={b.id} value={b.id}>
                      {b.item?.name || b.bomCode} (Rev: {b.revision})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs text-[var(--text-2)]">Planlanan Miktar *</Label>
                <Input
                  type="number"
                  min="1"
                  value={newOrderForm.plannedQuantity}
                  onChange={(e) => setNewOrderForm((prev) => ({ ...prev, plannedQuantity: e.target.value }))}
                  className="bg-[var(--bg)] border-[--line] mt-1"
                />
              </div>

              <div>
                <Label className="text-xs text-[var(--text-2)]">Öncelik</Label>
                <Select
                  value={newOrderForm.priority}
                  onValueChange={(val) => setNewOrderForm((prev) => ({ ...prev, priority: val }))}
                >
                  <SelectTrigger className="bg-[var(--bg)] border-[--line] mt-1 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-[var(--bg)] border-[--line] text-[var(--text)] text-xs">
                    <SelectItem value="LOW">Düşük</SelectItem>
                    <SelectItem value="MEDIUM">Normal</SelectItem>
                    <SelectItem value="HIGH">Yüksek</SelectItem>
                    <SelectItem value="URGENT">Acil</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div>
              <Label className="text-xs text-[var(--text-2)]">Parti / Lot Numarası</Label>
              <Input
                value={newOrderForm.lotNumber}
                onChange={(e) => setNewOrderForm((prev) => ({ ...prev, lotNumber: e.target.value }))}
                placeholder="Örn: LOT-2026-001 (Boşsa otomatik atanır)"
                className="bg-[var(--bg)] border-[--line] mt-1 text-xs font-mono"
              />
            </div>
          </div>

          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setCreateModalOpen(false)} className="border-[--line]">
              Vazgeç
            </Button>
            <Button onClick={handleCreateWorkOrder} className="btn-primary-emerald font-semibold">
              İş Emrini Oluştur
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── MODAL: MANUEL MALZEME SARFİYATI ── */}
      <Dialog open={issueMaterialModalOpen} onOpenChange={setIssueMaterialModalOpen}>
        <DialogContent className="bg-[var(--bg)] border-[--line] text-[var(--text)] sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Manuel Hammadde Sarfiyatı</DialogTitle>
            <DialogDescription className="text-[var(--text-muted)]">
              {selectedMaterial?.item?.name} ({selectedMaterial?.item?.sku})
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div>
              <Label className="text-xs text-[var(--text-2)]">Sarfiyat Miktarı ({selectedMaterial?.unit}) *</Label>
              <Input
                type="number"
                min="0"
                step="any"
                value={issueQty}
                onChange={(e) => setIssueQty(e.target.value)}
                className="bg-[var(--bg)] border-[--line] mt-1 font-mono text-lg"
              />
            </div>

            <div>
              <Label className="text-xs text-[var(--text-2)]">Lot / Parti Numarası (Opsiyonel)</Label>
              <Input
                value={issueLot}
                onChange={(e) => setIssueLot(e.target.value)}
                placeholder="Örn: RAW-LOT-01"
                className="bg-[var(--bg)] border-[--line] mt-1 font-mono"
              />
            </div>
          </div>

          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setIssueMaterialModalOpen(false)} className="border-[--line]">
              Vazgeç
            </Button>
            <Button onClick={handleIssueMaterial} className="btn-primary-emerald font-semibold">
              Sarfiyatı İşle
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── MODAL: İŞ EMRİ BÖLME (SPLIT) ── */}
      <Dialog open={splitModalOpen} onOpenChange={setSplitModalOpen}>
        <DialogContent className="bg-[var(--bg)] border-[--line] text-[var(--text)] sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Split className="w-5 h-5 text-[var(--brand)]" />
              İş Emrini Böl (Split)
            </DialogTitle>
            <DialogDescription className="text-[var(--text-muted)]">
              Bu iş emrinden yeni bir alt iş emrine aktarılacak miktarı giriniz.
            </DialogDescription>
          </DialogHeader>

          <div className="py-3">
            <Label className="text-xs text-[var(--text-2)]">Yeni İş Emrine Ayrılacak Miktar *</Label>
            <Input
              type="number"
              min="1"
              value={splitQty}
              onChange={(e) => setSplitQty(e.target.value)}
              className="bg-[var(--bg)] border-[--line] mt-1 font-mono text-lg"
            />
          </div>

          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setSplitModalOpen(false)} className="border-[--line]">
              Vazgeç
            </Button>
            <Button onClick={handleSplitWorkOrder} className="bg-[var(--brand-soft)] hover:bg-[var(--brand-soft)] text-[var(--text)] font-semibold">
              Böl ve Oluştur
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

