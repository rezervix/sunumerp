"use client"

import React, { useState, useEffect, useCallback, useMemo } from "react"
import { motion, AnimatePresence } from "framer-motion"
import {
  Wrench,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  ClipboardList,
  Gauge,
  Search,
  RefreshCw,
  Plus,
  ArrowRight,
  TrendingUp,
  Activity,
  Layers,
  Sparkles,
  Calendar,
  Clock,
  Play,
  Check,
  AlertOctagon,
  Cpu,
  ShieldAlert,
  FolderTree,
  DollarSign,
  Package,
  FileText
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

export function ProductionMaintenanceWorkspace() {
  const { user } = useAuth()
  const [activeTab, setActiveTab] = useState<
    "work_orders" | "plans" | "assets" | "predictive" | "conflicts" | "metrics"
  >("work_orders")

  // State
  const [loading, setLoading] = useState(false)
  const [dashboardData, setDashboardData] = useState<any>(null)
  const [workOrders, setWorkOrders] = useState<any[]>([])
  const [plans, setPlans] = useState<any[]>([])
  const [assets, setAssets] = useState<any[]>([])
  const [conflicts, setConflicts] = useState<any[]>([])
  const [searchTerm, setSearchTerm] = useState("")
  const [statusFilter, setStatusFilter] = useState("ALL")

  // Modallar
  const [isNewOrderOpen, setIsNewOrderOpen] = useState(false)
  const [isNewPlanOpen, setIsNewPlanOpen] = useState(false)
  const [isNewReadingOpen, setIsNewReadingOpen] = useState(false)
  const [isCompleteOrderOpen, setIsCompleteOrderOpen] = useState(false)
  const [selectedOrder, setSelectedOrder] = useState<any>(null)

  // Form Verileri - Yeni İş Emri
  const [newOrderForm, setNewOrderForm] = useState({
    machineAssetId: "",
    type: "PREVENTIVE",
    priority: "MEDIUM",
    title: "",
    description: "",
    plannedStartDate: "",
    plannedEndDate: "",
    assignedTo: ""
  })

  // Form Verileri - Yeni Bakım Planı
  const [newPlanForm, setNewPlanForm] = useState({
    code: "",
    name: "",
    machineAssetId: "",
    planType: "CALENDAR",
    frequencyDays: 30,
    frequencyHours: 500,
    frequencyCount: 10000,
    conditionMetric: "SICAKLIK",
    conditionOperator: ">",
    conditionThreshold: 85,
    estimatedDurationMinutes: 60,
    priority: "MEDIUM"
  })

  // Form Verileri - Sensör Okuması
  const [readingForm, setReadingForm] = useState({
    machineAssetId: "",
    sensorType: "SICAKLIK",
    readingValue: 75,
    unit: "°C",
    notes: ""
  })

  // Form Verileri - İş Emri Tamamlama
  const [completionForm, setCompletionForm] = useState({
    downtimeMinutes: 0,
    laborHours: 1,
    failureReason: "",
    completionNotes: ""
  })

  // Veri Çekme
  const fetchMaintenanceData = useCallback(async () => {
    setLoading(true)
    try {
      // 1. Dashboard genel verisi
      const dashRes = await fetch("/api/production/maintenance?view=overview")
      const dashJson = await dashRes.json()
      if (dashJson.success) {
        setDashboardData(dashJson.data)
      }

      // 2. İş Emirleri
      const woRes = await fetch("/api/production/maintenance?view=work_orders")
      const woJson = await woRes.json()
      if (woJson.success) {
        setWorkOrders(woJson.data)
      }

      // 3. Planlar
      const planRes = await fetch("/api/production/maintenance?view=plans")
      const planJson = await planRes.json()
      if (planJson.success) {
        setPlans(planJson.data)
      }

      // 4. Ekipmanlar
      const assetRes = await fetch("/api/production/maintenance?view=assets")
      const assetJson = await assetRes.json()
      if (assetJson.success) {
        setAssets(assetJson.data)
      }

      // 5. Kapasite Çakışmaları
      const conflictRes = await fetch("/api/production/maintenance?view=conflicts")
      const conflictJson = await conflictRes.json()
      if (conflictJson.success) {
        setConflicts(conflictJson.data)
      }
    } catch (err: any) {
      toast.error("Bakım modülü verileri yüklenirken hata oluştu.")
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchMaintenanceData()
  }, [fetchMaintenanceData])

  // Filtrelenmiş İş Emirleri
  const filteredOrders = useMemo(() => {
    return workOrders.filter((wo) => {
      const matchSearch =
        wo.workOrderNumber?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        wo.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        wo.machineAsset?.name?.toLowerCase().includes(searchTerm.toLowerCase())
      const matchStatus = statusFilter === "ALL" || wo.status === statusFilter
      return matchSearch && matchStatus
    })
  }, [workOrders, searchTerm, statusFilter])

  // Yeni İş Emri Gönderimi
  const handleCreateWorkOrder = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newOrderForm.machineAssetId || !newOrderForm.title) {
      toast.error("Lütfen ekipman ve başlık alanlarını doldurunuz.")
      return
    }

    try {
      const res = await fetch("/api/production/maintenance", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "create_work_order",
          payload: {
            ...newOrderForm,
            plannedStartDate: newOrderForm.plannedStartDate || null,
            plannedEndDate: newOrderForm.plannedEndDate || null
          }
        })
      })
      const json = await res.json()
      if (json.success) {
        toast.success("Bakım iş emri başarıyla oluşturuldu.")
        setIsNewOrderOpen(false)
        setNewOrderForm({
          machineAssetId: "",
          type: "PREVENTIVE",
          priority: "MEDIUM",
          title: "",
          description: "",
          plannedStartDate: "",
          plannedEndDate: "",
          assignedTo: ""
        })
        fetchMaintenanceData()
      } else {
        toast.error(json.error || "İş emri oluşturulamadı.")
      }
    } catch (err) {
      toast.error("İşlem sırasında sunucu hatası oluştu.")
    }
  }

  // Yeni Plan Gönderimi
  const handleCreatePlan = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newPlanForm.code || !newPlanForm.name || !newPlanForm.machineAssetId) {
      toast.error("Lütfen plan kodu, adı ve ekipman alanlarını doldurunuz.")
      return
    }

    try {
      const res = await fetch("/api/production/maintenance", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "create_plan",
          payload: newPlanForm
        })
      })
      const json = await res.json()
      if (json.success) {
        toast.success("Bakım planı başarıyla kaydedildi.")
        setIsNewPlanOpen(false)
        fetchMaintenanceData()
      } else {
        toast.error(json.error || "Bakım planı oluşturulamadı.")
      }
    } catch (err) {
      toast.error("İşlem sırasında hata oluştu.")
    }
  }

  // Sensör Okuması Kaydet
  const handleRecordReading = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!readingForm.machineAssetId) {
      toast.error("Lütfen makine/ekipman seçiniz.")
      return
    }

    try {
      const res = await fetch("/api/production/maintenance", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "record_condition_reading",
          payload: readingForm
        })
      })
      const json = await res.json()
      if (json.success) {
        if (json.data.autoWorkOrder) {
          toast.warning(
            `Kritik eşik aşıldı! Otomatik acil arıza iş emri (#${json.data.autoWorkOrder.workOrderNumber}) oluşturuldu.`
          )
        } else {
          toast.success("Sensör okuması kaydedildi, değerler normal.")
        }
        setIsNewReadingOpen(false)
        fetchMaintenanceData()
      } else {
        toast.error(json.error || "Sensör kaydı başarısız.")
      }
    } catch (err) {
      toast.error("Sensör verisi iletilemedi.")
    }
  }

  // Otomatik PM Tetikleyiciyi Çalıştır
  const handleTriggerPMJobs = async () => {
    try {
      const res = await fetch("/api/production/maintenance", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "trigger_pm_jobs",
          payload: { simulateOnly: false }
        })
      })
      const json = await res.json()
      if (json.success) {
        toast.success(
          `Bakım Tetikleyici Çalıştı: ${json.data.evaluatedPlanCount} plan tarandı, ${json.data.triggeredCount} yeni iş emri açıldı.`
        )
        fetchMaintenanceData()
      } else {
        toast.error(json.error || "Tetikleme başarısız.")
      }
    } catch (err) {
      toast.error("Sunucu bağlantı hatası.")
    }
  }

  // Durum Değiştirme
  const handleStatusChange = async (orderId: string, nextStatus: string) => {
    if (nextStatus === "COMPLETED") {
      const order = workOrders.find((w) => w.id === orderId)
      setSelectedOrder(order)
      setCompletionForm({
        downtimeMinutes: order?.type === "BREAKDOWN" ? 45 : 0,
        laborHours: 1.5,
        failureReason: order?.failureReason || "",
        completionNotes: ""
      })
      setIsCompleteOrderOpen(true)
      return
    }

    try {
      const res = await fetch("/api/production/maintenance", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "update_work_order_status",
          payload: {
            id: orderId,
            status: nextStatus
          }
        })
      })
      const json = await res.json()
      if (json.success) {
        toast.success(`İş emri durumu '${nextStatus}' olarak güncellendi.`)
        fetchMaintenanceData()
      } else {
        toast.error(json.error || "Durum güncellenemedi.")
      }
    } catch (err) {
      toast.error("İşlem sırasında hata oluştu.")
    }
  }

  // Tamamlama Modal Gönderimi
  const handleCompleteOrderSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedOrder) return

    try {
      const res = await fetch("/api/production/maintenance", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "update_work_order_status",
          payload: {
            id: selectedOrder.id,
            status: "COMPLETED",
            options: {
              ...completionForm,
              laborHourlyRate: 150
            }
          }
        })
      })
      const json = await res.json()
      if (json.success) {
        toast.success("Bakım iş emri başarıyla tamamlandı ve kapatıldı.")
        setIsCompleteOrderOpen(false)
        fetchMaintenanceData()
      } else {
        toast.error(json.error || "Tamamlama işlemi başarısız.")
      }
    } catch (err) {
      toast.error("Bağlantı hatası.")
    }
  }

  // Durum Rozetleri
  const renderStatusBadge = (status: string) => {
    switch (status) {
      case "REQUESTED":
        return <span className="px-2 py-0.5 text-xs rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/20">Talep Edildi</span>
      case "EVALUATED":
        return <span className="px-2 py-0.5 text-xs rounded-full bg-blue-500/10 text-blue-400 border border-blue-500/20">Değerlendirildi</span>
      case "SCHEDULED":
        return <span className="px-2 py-0.5 text-xs rounded-full bg-purple-500/10 text-purple-400 border border-purple-500/20">Planlandı</span>
      case "IN_PROGRESS":
        return <span className="px-2 py-0.5 text-xs rounded-full bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">Devam Ediyor</span>
      case "COMPLETED":
        return <span className="px-2 py-0.5 text-xs rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">Tamamlandı</span>
      case "CANCELLED":
        return <span className="px-2 py-0.5 text-xs rounded-full bg-zinc-500/10 text-zinc-400 border border-zinc-500/20">İptal Edildi</span>
      default:
        return <span className="px-2 py-0.5 text-xs rounded-full bg-zinc-500/10 text-zinc-300">{status}</span>
    }
  }

  // Tip Rozetleri
  const renderTypeBadge = (type: string) => {
    switch (type) {
      case "BREAKDOWN":
        return <span className="px-2 py-0.5 text-xs rounded-full bg-red-500/10 text-red-400 border border-red-500/20 font-medium">Arıza Onarım</span>
      case "PREVENTIVE":
        return <span className="px-2 py-0.5 text-xs rounded-full bg-blue-500/10 text-blue-400 border border-blue-500/20">Periyodik Bakım</span>
      case "CORRECTIVE":
        return <span className="px-2 py-0.5 text-xs rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/20">Düzeltici Bakım</span>
      case "IMPROVEMENT":
        return <span className="px-2 py-0.5 text-xs rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">İyileştirme / Revizyon</span>
      default:
        return <span className="px-2 py-0.5 text-xs rounded-full bg-zinc-500/10 text-zinc-400">{type}</span>
    }
  }

  return (
    <div className="space-y-6">
      {/* Üst Başlık ve Hızlı Eylemler */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-5 rounded-2xl bg-white/[0.02] border border-white/[0.06] backdrop-blur-md">
        <div>
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/20">
              <Wrench className="w-5 h-5" />
            </div>
            <h1 className="text-xl font-bold text-white tracking-tight">
              Ekipman & Bakım Yönetimi (CMMS & PdM)
            </h1>
          </div>
          <p className="text-xs text-zinc-400 mt-1">
            Kritik ekipman ağacı, periyodik bakım takvimi, kestirimci telemetri ve OEE / MTBF / MTTR performans metrikleri.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={fetchMaintenanceData}
            disabled={loading}
            className="border-white/10 hover:bg-white/5 text-zinc-300"
          >
            <RefreshCw className={`w-3.5 h-3.5 mr-1.5 ${loading ? "animate-spin" : ""}`} />
            Yenile
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={handleTriggerPMJobs}
            className="border-purple-500/30 text-purple-400 hover:bg-purple-500/10"
          >
            <Play className="w-3.5 h-3.5 mr-1.5" />
            PM Tetikleyici Çalıştır
          </Button>
          <Button
            size="sm"
            onClick={() => setIsNewReadingOpen(true)}
            className="bg-cyan-600 hover:bg-cyan-500 text-white"
          >
            <Cpu className="w-3.5 h-3.5 mr-1.5" />
            Sensör Kaydet
          </Button>
          <Button
            size="sm"
            onClick={() => setIsNewOrderOpen(true)}
            className="bg-amber-600 hover:bg-amber-500 text-white"
          >
            <Plus className="w-3.5 h-3.5 mr-1.5" />
            Yeni Bakım İş Emri
          </Button>
        </div>
      </div>

      {/* KPI Özet Kartları */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        {/* OEE */}
        <div className="p-4 rounded-xl bg-white/[0.02] border border-white/[0.06]">
          <div className="flex items-center justify-between text-xs text-zinc-400 mb-1">
            <span>OEE Skoru</span>
            <Activity className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-2xl font-bold text-white">
            %{dashboardData?.kpis?.oeePct ?? "84.2"}
          </div>
          <div className="text-[11px] text-zinc-500 mt-1 flex gap-2">
            <span>Kull.: %{dashboardData?.kpis?.availabilityPct ?? "92"}</span>
            <span>Perf.: %{dashboardData?.kpis?.performancePct ?? "94"}</span>
          </div>
        </div>

        {/* MTBF */}
        <div className="p-4 rounded-xl bg-white/[0.02] border border-white/[0.06]">
          <div className="flex items-center justify-between text-xs text-zinc-400 mb-1">
            <span>MTBF (Arıza Aralığı)</span>
            <Clock className="w-4 h-4 text-blue-400" />
          </div>
          <div className="text-2xl font-bold text-white">
            {dashboardData?.kpis?.mtbfHours ?? "184"} <span className="text-sm font-normal text-zinc-400">saat</span>
          </div>
          <div className="text-[11px] text-zinc-500 mt-1">
            Ortalama arızasız çalışma süresi
          </div>
        </div>

        {/* MTTR */}
        <div className="p-4 rounded-xl bg-white/[0.02] border border-white/[0.06]">
          <div className="flex items-center justify-between text-xs text-zinc-400 mb-1">
            <span>MTTR (Onarım Süresi)</span>
            <Wrench className="w-4 h-4 text-amber-400" />
          </div>
          <div className="text-2xl font-bold text-white">
            {dashboardData?.kpis?.mttrMinutes ?? "42"} <span className="text-sm font-normal text-zinc-400">dk</span>
          </div>
          <div className="text-[11px] text-zinc-500 mt-1">
            Ortalama arıza onarım ve duruş süresi
          </div>
        </div>

        {/* Aktif Arızalar & Duruş */}
        <div className="p-4 rounded-xl bg-white/[0.02] border border-white/[0.06]">
          <div className="flex items-center justify-between text-xs text-zinc-400 mb-1">
            <span>Arıza & Duruş</span>
            <AlertOctagon className="w-4 h-4 text-red-400" />
          </div>
          <div className="text-2xl font-bold text-red-400">
            {dashboardData?.summary?.downAssets ?? "0"} <span className="text-sm font-normal text-zinc-400">ekipman</span>
          </div>
          <div className="text-[11px] text-zinc-500 mt-1">
            Toplam duruş: {dashboardData?.summary?.totalDowntimeMinutes ?? "0"} dk
          </div>
        </div>

        {/* Bakım Maliyeti */}
        <div className="p-4 rounded-xl bg-white/[0.02] border border-white/[0.06]">
          <div className="flex items-center justify-between text-xs text-zinc-400 mb-1">
            <span>Bakım Maliyeti</span>
            <DollarSign className="w-4 h-4 text-purple-400" />
          </div>
          <div className="text-2xl font-bold text-white">
            ₺{(dashboardData?.summary?.totalMaintenanceCost ?? 0).toLocaleString("tr-TR")}
          </div>
          <div className="text-[11px] text-zinc-500 mt-1">
            Yedek parça ve işçilik giderleri
          </div>
        </div>
      </div>

      {/* Sekme Gezintisi */}
      <div className="flex border-b border-white/[0.08] overflow-x-auto gap-2">
        <button
          onClick={() => setActiveTab("work_orders")}
          className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition-all whitespace-nowrap ${
            activeTab === "work_orders"
              ? "border-amber-500 text-amber-400"
              : "border-transparent text-zinc-400 hover:text-zinc-200"
          }`}
        >
          <ClipboardList className="w-4 h-4" />
          Bakım İş Emirleri ({workOrders.length})
        </button>

        <button
          onClick={() => setActiveTab("plans")}
          className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition-all whitespace-nowrap ${
            activeTab === "plans"
              ? "border-amber-500 text-amber-400"
              : "border-transparent text-zinc-400 hover:text-zinc-200"
          }`}
        >
          <Calendar className="w-4 h-4" />
          Bakım Planları ({plans.length})
        </button>

        <button
          onClick={() => setActiveTab("assets")}
          className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition-all whitespace-nowrap ${
            activeTab === "assets"
              ? "border-amber-500 text-amber-400"
              : "border-transparent text-zinc-400 hover:text-zinc-200"
          }`}
        >
          <FolderTree className="w-4 h-4" />
          Ekipman & Varlık Ağacı ({assets.length})
        </button>

        <button
          onClick={() => setActiveTab("predictive")}
          className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition-all whitespace-nowrap ${
            activeTab === "predictive"
              ? "border-amber-500 text-amber-400"
              : "border-transparent text-zinc-400 hover:text-zinc-200"
          }`}
        >
          <Cpu className="w-4 h-4" />
          Kestirimci Bakım & Sensörler
        </button>

        <button
          onClick={() => setActiveTab("conflicts")}
          className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition-all whitespace-nowrap ${
            activeTab === "conflicts"
              ? "border-amber-500 text-amber-400"
              : "border-transparent text-zinc-400 hover:text-zinc-200"
          }`}
        >
          <ShieldAlert className="w-4 h-4" />
          Kapasite Çakışmaları ({conflicts.length})
        </button>

        <button
          onClick={() => setActiveTab("metrics")}
          className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition-all whitespace-nowrap ${
            activeTab === "metrics"
              ? "border-amber-500 text-amber-400"
              : "border-transparent text-zinc-400 hover:text-zinc-200"
          }`}
        >
          <TrendingUp className="w-4 h-4" />
          OEE & Performans Analizi
        </button>
      </div>

      {/* SEKME 1: BAKIM İŞ EMİRLERİ */}
      {activeTab === "work_orders" && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row gap-3 items-center justify-between">
            <div className="relative w-full sm:w-72">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" />
              <Input
                placeholder="İş emri no, başlık veya makine..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9 bg-white/[0.02] border-white/10 text-white placeholder:text-zinc-500"
              />
            </div>
            <div className="flex items-center gap-2 w-full sm:w-auto">
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-[160px] bg-white/[0.02] border-white/10 text-zinc-200">
                  <SelectValue placeholder="Durum Filtresi" />
                </SelectTrigger>
                <SelectContent className="bg-zinc-900 border-white/10 text-zinc-200">
                  <SelectItem value="ALL">Tüm Durumlar</SelectItem>
                  <SelectItem value="REQUESTED">Talep Edildi</SelectItem>
                  <SelectItem value="EVALUATED">Değerlendirildi</SelectItem>
                  <SelectItem value="SCHEDULED">Planlandı</SelectItem>
                  <SelectItem value="IN_PROGRESS">Devam Ediyor</SelectItem>
                  <SelectItem value="COMPLETED">Tamamlandı</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="rounded-xl border border-white/[0.08] overflow-hidden bg-white/[0.01]">
            <Table>
              <TableHeader className="bg-white/[0.03]">
                <TableRow className="border-white/[0.08]">
                  <TableHead className="text-zinc-400">İş Emri No</TableHead>
                  <TableHead className="text-zinc-400">Ekipman / Makine</TableHead>
                  <TableHead className="text-zinc-400">Tür</TableHead>
                  <TableHead className="text-zinc-400">Başlık / Açıklama</TableHead>
                  <TableHead className="text-zinc-400">Durum</TableHead>
                  <TableHead className="text-zinc-400">Duruş (Dk)</TableHead>
                  <TableHead className="text-zinc-400">Maliyet</TableHead>
                  <TableHead className="text-right text-zinc-400">Eylemler</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredOrders.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center py-8 text-zinc-500">
                      Kayıtlı bakım iş emri bulunamadı.
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredOrders.map((wo) => (
                    <TableRow key={wo.id} className="border-white/[0.05] hover:bg-white/[0.02]">
                      <TableCell className="font-mono text-xs font-semibold text-amber-400">
                        {wo.workOrderNumber}
                      </TableCell>
                      <TableCell className="text-sm font-medium text-white">
                        {wo.machineAsset?.name || "—"}
                        <span className="block text-[11px] text-zinc-500 font-mono">
                          {wo.machineAsset?.code}
                        </span>
                      </TableCell>
                      <TableCell>{renderTypeBadge(wo.type)}</TableCell>
                      <TableCell>
                        <div className="text-sm text-zinc-200">{wo.title}</div>
                        {wo.failureReason && (
                          <div className="text-xs text-red-400/80">Kök Neden: {wo.failureReason}</div>
                        )}
                      </TableCell>
                      <TableCell>{renderStatusBadge(wo.status)}</TableCell>
                      <TableCell className="text-sm text-zinc-300 font-mono">
                        {wo.downtimeMinutes > 0 ? `${wo.downtimeMinutes} dk` : "—"}
                      </TableCell>
                      <TableCell className="text-sm font-mono text-zinc-200">
                        ₺{(wo.totalCost || 0).toLocaleString("tr-TR")}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {wo.status === "REQUESTED" && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleStatusChange(wo.id, "IN_PROGRESS")}
                              className="h-7 text-xs border-cyan-500/30 text-cyan-400 hover:bg-cyan-500/10"
                            >
                              Başlat
                            </Button>
                          )}
                          {wo.status === "IN_PROGRESS" && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleStatusChange(wo.id, "COMPLETED")}
                              className="h-7 text-xs border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/10"
                            >
                              <Check className="w-3.5 h-3.5 mr-1" />
                              Tamamla
                            </Button>
                          )}
                          {wo.status === "COMPLETED" && (
                            <span className="text-xs text-zinc-500">Kapatıldı</span>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </div>
      )}

      {/* SEKME 2: BAKIM PLANLARI */}
      {activeTab === "plans" && (
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="text-sm font-medium text-white">Tanımlı Periyodik ve Kestirimci Bakım Planları</h3>
            <Button
              size="sm"
              onClick={() => setIsNewPlanOpen(true)}
              className="bg-purple-600 hover:bg-purple-500 text-white"
            >
              <Plus className="w-3.5 h-3.5 mr-1.5" />
              Yeni Bakım Planı
            </Button>
          </div>

          <div className="rounded-xl border border-white/[0.08] overflow-hidden bg-white/[0.01]">
            <Table>
              <TableHeader className="bg-white/[0.03]">
                <TableRow className="border-white/[0.08]">
                  <TableHead className="text-zinc-400">Plan Kodu</TableHead>
                  <TableHead className="text-zinc-400">Plan Adı</TableHead>
                  <TableHead className="text-zinc-400">Ekipman</TableHead>
                  <TableHead className="text-zinc-400">Plan Tipi</TableHead>
                  <TableHead className="text-zinc-400">Frekans / Eşik</TableHead>
                  <TableHead className="text-zinc-400">Sonraki Planlanan</TableHead>
                  <TableHead className="text-zinc-400">Durum</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {plans.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-8 text-zinc-500">
                      Tanımlı bakım planı bulunamadı.
                    </TableCell>
                  </TableRow>
                ) : (
                  plans.map((p) => (
                    <TableRow key={p.id} className="border-white/[0.05] hover:bg-white/[0.02]">
                      <TableCell className="font-mono text-xs text-purple-400 font-semibold">
                        {p.code}
                      </TableCell>
                      <TableCell className="text-sm text-white font-medium">
                        {p.name}
                      </TableCell>
                      <TableCell className="text-sm text-zinc-300">
                        {p.machineAsset?.name || "Tüm Makineler"}
                      </TableCell>
                      <TableCell>
                        <span className="px-2 py-0.5 text-xs rounded-full bg-white/5 border border-white/10 text-zinc-300">
                          {p.planType === "CALENDAR" && "Takvim Bazlı"}
                          {p.planType === "METER_HOURS" && "Çalışma Saati"}
                          {p.planType === "METER_COUNT" && "Üretim Adedi"}
                          {p.planType === "CONDITION" && "Sensör / Kestirimci"}
                        </span>
                      </TableCell>
                      <TableCell className="text-sm font-mono text-zinc-300">
                        {p.planType === "CALENDAR" && `${p.frequencyDays} Günde Bir`}
                        {p.planType === "METER_HOURS" && `Her ${p.frequencyHours} Saatte Bir`}
                        {p.planType === "METER_COUNT" && `Her ${p.frequencyCount} Adette Bir`}
                        {p.planType === "CONDITION" && `${p.conditionMetric} ${p.conditionOperator} ${p.conditionThreshold}`}
                      </TableCell>
                      <TableCell className="text-sm text-zinc-400">
                        {p.nextScheduledDate
                          ? new Date(p.nextScheduledDate).toLocaleDateString("tr-TR")
                          : "Sayaç / Durum Takibinde"}
                      </TableCell>
                      <TableCell>
                        {p.isActive ? (
                          <span className="text-xs text-emerald-400 font-medium">Aktif</span>
                        ) : (
                          <span className="text-xs text-zinc-500">Pasif</span>
                        )}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </div>
      )}

      {/* SEKME 3: EKİPMAN & VARLIK AĞACI */}
      {activeTab === "assets" && (
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="text-sm font-medium text-white">Ekipman ve Makine Parkuru Varlık Ağacı</h3>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {assets.map((asset) => (
              <div
                key={asset.id}
                className="p-4 rounded-xl border border-white/[0.08] bg-white/[0.01] hover:border-amber-500/30 transition-all"
              >
                <div className="flex items-start justify-between">
                  <div>
                    <span className="font-mono text-xs text-amber-400 font-semibold">
                      {asset.code}
                    </span>
                    <h4 className="text-base font-bold text-white mt-0.5">{asset.name}</h4>
                  </div>
                  <span
                    className={`px-2 py-0.5 text-xs rounded-full font-bold ${
                      asset.criticality === "A"
                        ? "bg-red-500/20 text-red-400 border border-red-500/30"
                        : asset.criticality === "B"
                        ? "bg-amber-500/20 text-amber-400 border border-amber-500/30"
                        : "bg-blue-500/20 text-blue-400 border border-blue-500/30"
                    }`}
                  >
                    Sınıf {asset.criticality || "B"}
                  </span>
                </div>

                <div className="mt-3 space-y-1.5 text-xs text-zinc-400">
                  <div className="flex justify-between">
                    <span>Çalışma Saati:</span>
                    <span className="font-mono text-zinc-200">{asset.operatingHours || 0} saat</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Toplam Üretim:</span>
                    <span className="font-mono text-zinc-200">{(asset.productionCount || 0).toLocaleString("tr-TR")} adet</span>
                  </div>
                  <div className="flex justify-between">
                    <span>İş Merkezi:</span>
                    <span className="text-zinc-200">{asset.workCenter?.name || "Bağımsız"}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Yedek Parça Sayısı:</span>
                    <span className="font-mono text-amber-300">{asset.spareParts?.length || 0} adet</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Durum:</span>
                    <span
                      className={`font-semibold ${
                        asset.status === "ACTIVE"
                          ? "text-emerald-400"
                          : asset.status === "DOWN"
                          ? "text-red-400"
                          : "text-amber-400"
                      }`}
                    >
                      {asset.status === "ACTIVE" ? "Çalışıyor" : asset.status === "DOWN" ? "Arızada (Duruş)" : asset.status}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* SEKME 4: KESTİRİMCİ BAKIM & SENSÖRLER */}
      {activeTab === "predictive" && (
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <div>
              <h3 className="text-sm font-medium text-white">Telemetri & Kestirimci Sensör İzleme</h3>
              <p className="text-xs text-zinc-400 mt-0.5">
                IoT titreşim, sıcaklık ve basınç sensörleri sınır aşımında otomatik arıza iş emri üretir.
              </p>
            </div>
            <Button
              size="sm"
              onClick={() => setIsNewReadingOpen(true)}
              className="bg-cyan-600 hover:bg-cyan-500 text-white"
            >
              <Cpu className="w-3.5 h-3.5 mr-1.5" />
              Sensör Okuması Simüle Et
            </Button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-4 rounded-xl border border-white/[0.08] bg-white/[0.01]">
              <div className="flex items-center gap-2 text-amber-400 font-semibold text-sm mb-2">
                <Activity className="w-4 h-4" />
                Sıcaklık Sensörleri
              </div>
              <p className="text-xs text-zinc-400 mb-3">Normal çalışma aralığı: 40°C - 80°C. Üst limit: 85°C.</p>
              <div className="text-2xl font-bold font-mono text-white">72.4 °C</div>
              <div className="text-xs text-emerald-400 mt-1">Normal Seviye</div>
            </div>

            <div className="p-4 rounded-xl border border-white/[0.08] bg-white/[0.01]">
              <div className="flex items-center gap-2 text-cyan-400 font-semibold text-sm mb-2">
                <Gauge className="w-4 h-4" />
                Titreşim Sensörleri
              </div>
              <p className="text-xs text-zinc-400 mb-3">ISO 10816 Standartları: &lt; 4.5 mm/s normal, &gt; 7.1 mm/s kritik alarm.</p>
              <div className="text-2xl font-bold font-mono text-white">3.2 mm/s</div>
              <div className="text-xs text-emerald-400 mt-1">Tolerans İçinde</div>
            </div>

            <div className="p-4 rounded-xl border border-white/[0.08] bg-white/[0.01]">
              <div className="flex items-center gap-2 text-purple-400 font-semibold text-sm mb-2">
                <Layers className="w-4 h-4" />
                Hidrolik Basınç
              </div>
              <p className="text-xs text-zinc-400 mb-3">İdeal işletme basıncı: 120 - 160 Bar.</p>
              <div className="text-2xl font-bold font-mono text-white">142 Bar</div>
              <div className="text-xs text-emerald-400 mt-1">Optimal</div>
            </div>
          </div>
        </div>
      )}

      {/* SEKME 5: KAPASİTE ÇAKIŞMALARI */}
      {activeTab === "conflicts" && (
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <div>
              <h3 className="text-sm font-medium text-white">Bakım Duruşu & Üretim Çizelgesi Çakışmaları</h3>
              <p className="text-xs text-zinc-400 mt-0.5">
                Planlanan bakım pencereleri ile Faz 6 kapasite çizelgelenmiş görevleri arasındaki çakışma uyarıları.
              </p>
            </div>
          </div>

          <div className="rounded-xl border border-white/[0.08] overflow-hidden bg-white/[0.01]">
            <Table>
              <TableHeader className="bg-white/[0.03]">
                <TableRow className="border-white/[0.08]">
                  <TableHead className="text-zinc-400">Çakışma Aralığı</TableHead>
                  <TableHead className="text-zinc-400">İlgili İş Emri / Görev</TableHead>
                  <TableHead className="text-zinc-400">Uyarı Mesajı</TableHead>
                  <TableHead className="text-zinc-400">Önlem</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {conflicts.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center py-8 text-emerald-400/80">
                      Harika! Kapasite çizelgesi ile planlı bakım pencereleri arasında herhangi bir çakışma bulunmuyor.
                    </TableCell>
                  </TableRow>
                ) : (
                  conflicts.map((c, idx) => (
                    <TableRow key={idx} className="border-white/[0.05] bg-red-500/[0.02]">
                      <TableCell className="font-mono text-xs text-amber-400">
                        {c.conflictStartTime?.slice(0, 16).replace("T", " ")} - {c.conflictEndTime?.slice(11, 16)}
                      </TableCell>
                      <TableCell className="text-sm font-semibold text-white">
                        #{c.conflictingWorkOrderNumber || c.conflictingTaskId}
                      </TableCell>
                      <TableCell className="text-sm text-red-300">
                        {c.message}
                      </TableCell>
                      <TableCell>
                        <Button size="sm" variant="outline" className="h-7 text-xs border-amber-500/30 text-amber-400">
                          Çizelgeyi Kaydır
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </div>
      )}

      {/* SEKME 6: OEE & PERFORMANS ANALİZİ */}
      {activeTab === "metrics" && (
        <div className="space-y-6">
          <div className="p-5 rounded-xl border border-white/[0.08] bg-white/[0.01]">
            <h3 className="text-base font-bold text-white mb-2">
              OEE (Overall Equipment Effectiveness) Ayrıştırması
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
              <div className="p-4 rounded-xl bg-white/[0.02] border border-white/[0.06]">
                <div className="text-sm text-zinc-400">Kullanılabilirlik (Availability)</div>
                <div className="text-3xl font-bold text-white mt-1">
                  %{dashboardData?.kpis?.availabilityPct ?? "92.0"}
                </div>
                <div className="text-xs text-zinc-500 mt-2">
                  (Çalışma Süresi - Plansız Duruş) / Çalışma Süresi
                </div>
              </div>

              <div className="p-4 rounded-xl bg-white/[0.02] border border-white/[0.06]">
                <div className="text-sm text-zinc-400">Performans (Performance)</div>
                <div className="text-3xl font-bold text-white mt-1">
                  %{dashboardData?.kpis?.performancePct ?? "94.5"}
                </div>
                <div className="text-xs text-zinc-500 mt-2">
                  (Üretilen Adet x İdeal Çevrim) / Net Çalışma Süresi
                </div>
              </div>

              <div className="p-4 rounded-xl bg-white/[0.02] border border-white/[0.06]">
                <div className="text-sm text-zinc-400">Kalite (Quality)</div>
                <div className="text-3xl font-bold text-white mt-1">
                  %{dashboardData?.kpis?.qualityPct ?? "98.2"}
                </div>
                <div className="text-xs text-zinc-500 mt-2">
                  Sağlam Ürün Adedi / Toplam Üretilen Adet
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 1: YENİ BAKIM İŞ EMRİ */}
      <Dialog open={isNewOrderOpen} onOpenChange={setIsNewOrderOpen}>
        <DialogContent className="bg-zinc-950 border border-white/10 text-white max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Wrench className="w-5 h-5 text-amber-400" />
              Yeni Bakım İş Emri Aç
            </DialogTitle>
            <DialogDescription className="text-xs text-zinc-400">
              Arıza onarımı veya planlı koruyucu bakım iş emri oluşturun.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleCreateWorkOrder} className="space-y-3.5 mt-2">
            <div>
              <Label className="text-xs text-zinc-300">Ekipman / Makine *</Label>
              <Select
                value={newOrderForm.machineAssetId}
                onValueChange={(val) => setNewOrderForm({ ...newOrderForm, machineAssetId: val })}
              >
                <SelectTrigger className="mt-1 bg-white/[0.02] border-white/10 text-zinc-200">
                  <SelectValue placeholder="Ekipman seçiniz" />
                </SelectTrigger>
                <SelectContent className="bg-zinc-900 border-white/10 text-zinc-200">
                  {assets.map((a) => (
                    <SelectItem key={a.id} value={a.id}>
                      {a.name} ({a.code})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs text-zinc-300">İş Emri Türü</Label>
                <Select
                  value={newOrderForm.type}
                  onValueChange={(val) => setNewOrderForm({ ...newOrderForm, type: val })}
                >
                  <SelectTrigger className="mt-1 bg-white/[0.02] border-white/10 text-zinc-200">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-zinc-900 border-white/10 text-zinc-200">
                    <SelectItem value="BREAKDOWN">Arıza Onarım</SelectItem>
                    <SelectItem value="PREVENTIVE">Periyodik Bakım</SelectItem>
                    <SelectItem value="CORRECTIVE">Düzeltici Bakım</SelectItem>
                    <SelectItem value="IMPROVEMENT">İyileştirme / Revizyon</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label className="text-xs text-zinc-300">Öncelik</Label>
                <Select
                  value={newOrderForm.priority}
                  onValueChange={(val) => setNewOrderForm({ ...newOrderForm, priority: val })}
                >
                  <SelectTrigger className="mt-1 bg-white/[0.02] border-white/10 text-zinc-200">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-zinc-900 border-white/10 text-zinc-200">
                    <SelectItem value="LOW">Düşük</SelectItem>
                    <SelectItem value="MEDIUM">Orta</SelectItem>
                    <SelectItem value="HIGH">Yüksek</SelectItem>
                    <SelectItem value="CRITICAL">Kritik (Acil Duruş)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div>
              <Label className="text-xs text-zinc-300">İş Emri Başlığı *</Label>
              <Input
                placeholder="Örn: Ana mil rulman değişimi ve yağlama"
                value={newOrderForm.title}
                onChange={(e) => setNewOrderForm({ ...newOrderForm, title: e.target.value })}
                className="mt-1 bg-white/[0.02] border-white/10 text-white"
              />
            </div>

            <div>
              <Label className="text-xs text-zinc-300">Açıklama / Arıza Belirtisi</Label>
              <Input
                placeholder="Belirtilen ses, titreşim veya arıza ayrıntıları..."
                value={newOrderForm.description}
                onChange={(e) => setNewOrderForm({ ...newOrderForm, description: e.target.value })}
                className="mt-1 bg-white/[0.02] border-white/10 text-white"
              />
            </div>

            <DialogFooter className="mt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsNewOrderOpen(false)}
                className="border-white/10 text-zinc-300"
              >
                İptal
              </Button>
              <Button type="submit" className="bg-amber-600 hover:bg-amber-500 text-white">
                İş Emrini Başlat
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* MODAL 2: YENİ BAKIM PLANI */}
      <Dialog open={isNewPlanOpen} onOpenChange={setIsNewPlanOpen}>
        <DialogContent className="bg-zinc-950 border border-white/10 text-white max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Calendar className="w-5 h-5 text-purple-400" />
              Yeni Bakım Planı Tanımla
            </DialogTitle>
            <DialogDescription className="text-xs text-zinc-400">
              Takvim periyotları, çalışma saatleri veya sensör limitlerine göre otomatik tetiklenen plan.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleCreatePlan} className="space-y-3.5 mt-2">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs text-zinc-300">Plan Kodu *</Label>
                <Input
                  placeholder="PM-CNC-01"
                  value={newPlanForm.code}
                  onChange={(e) => setNewPlanForm({ ...newPlanForm, code: e.target.value })}
                  className="mt-1 bg-white/[0.02] border-white/10 text-white uppercase font-mono"
                />
              </div>
              <div>
                <Label className="text-xs text-zinc-300">Ekipman *</Label>
                <Select
                  value={newPlanForm.machineAssetId}
                  onValueChange={(val) => setNewPlanForm({ ...newPlanForm, machineAssetId: val })}
                >
                  <SelectTrigger className="mt-1 bg-white/[0.02] border-white/10 text-zinc-200">
                    <SelectValue placeholder="Seçiniz" />
                  </SelectTrigger>
                  <SelectContent className="bg-zinc-900 border-white/10 text-zinc-200">
                    {assets.map((a) => (
                      <SelectItem key={a.id} value={a.id}>
                        {a.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div>
              <Label className="text-xs text-zinc-300">Plan Adı *</Label>
              <Input
                placeholder="Aylık Hidrolik Yağ ve Filtre Değişim Planı"
                value={newPlanForm.name}
                onChange={(e) => setNewPlanForm({ ...newPlanForm, name: e.target.value })}
                className="mt-1 bg-white/[0.02] border-white/10 text-white"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs text-zinc-300">Plan Tetikleme Tipi</Label>
                <Select
                  value={newPlanForm.planType}
                  onValueChange={(val: any) => setNewPlanForm({ ...newPlanForm, planType: val })}
                >
                  <SelectTrigger className="mt-1 bg-white/[0.02] border-white/10 text-zinc-200">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-zinc-900 border-white/10 text-zinc-200">
                    <SelectItem value="CALENDAR">Takvim Bazlı (Gün)</SelectItem>
                    <SelectItem value="METER_HOURS">Çalışma Saati Bazlı</SelectItem>
                    <SelectItem value="METER_COUNT">Üretim Adedi Bazlı</SelectItem>
                    <SelectItem value="CONDITION">Sensör Eşik Değeri</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                {newPlanForm.planType === "CALENDAR" && (
                  <>
                    <Label className="text-xs text-zinc-300">Periyot (Gün)</Label>
                    <Input
                      type="number"
                      value={newPlanForm.frequencyDays}
                      onChange={(e) => setNewPlanForm({ ...newPlanForm, frequencyDays: Number(e.target.value) })}
                      className="mt-1 bg-white/[0.02] border-white/10 text-white"
                    />
                  </>
                )}
                {newPlanForm.planType === "METER_HOURS" && (
                  <>
                    <Label className="text-xs text-zinc-300">Frekans (Saat)</Label>
                    <Input
                      type="number"
                      value={newPlanForm.frequencyHours}
                      onChange={(e) => setNewPlanForm({ ...newPlanForm, frequencyHours: Number(e.target.value) })}
                      className="mt-1 bg-white/[0.02] border-white/10 text-white"
                    />
                  </>
                )}
                {newPlanForm.planType === "CONDITION" && (
                  <>
                    <Label className="text-xs text-zinc-300">Eşik Değer</Label>
                    <Input
                      type="number"
                      value={newPlanForm.conditionThreshold}
                      onChange={(e) => setNewPlanForm({ ...newPlanForm, conditionThreshold: Number(e.target.value) })}
                      className="mt-1 bg-white/[0.02] border-white/10 text-white"
                    />
                  </>
                )}
              </div>
            </div>

            <DialogFooter className="mt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsNewPlanOpen(false)}
                className="border-white/10 text-zinc-300"
              >
                Vazgeç
              </Button>
              <Button type="submit" className="bg-purple-600 hover:bg-purple-500 text-white">
                Planı Kaydet
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* MODAL 3: SENSÖR OKUMASI */}
      <Dialog open={isNewReadingOpen} onOpenChange={setIsNewReadingOpen}>
        <DialogContent className="bg-zinc-950 border border-white/10 text-white max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Cpu className="w-5 h-5 text-cyan-400" />
              Sensör Telemetrisi Kaydet
            </DialogTitle>
            <DialogDescription className="text-xs text-zinc-400">
              Kestirimci bakım kural kontrolü ve eşik aşım simülasyonu.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleRecordReading} className="space-y-3 mt-2">
            <div>
              <Label className="text-xs text-zinc-300">Ekipman</Label>
              <Select
                value={readingForm.machineAssetId}
                onValueChange={(val) => setReadingForm({ ...readingForm, machineAssetId: val })}
              >
                <SelectTrigger className="mt-1 bg-white/[0.02] border-white/10 text-zinc-200">
                  <SelectValue placeholder="Ekipman seçiniz" />
                </SelectTrigger>
                <SelectContent className="bg-zinc-900 border-white/10 text-zinc-200">
                  {assets.map((a) => (
                    <SelectItem key={a.id} value={a.id}>
                      {a.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs text-zinc-300">Sensör Tipi</Label>
                <Select
                  value={readingForm.sensorType}
                  onValueChange={(val) => setReadingForm({ ...readingForm, sensorType: val })}
                >
                  <SelectTrigger className="mt-1 bg-white/[0.02] border-white/10 text-zinc-200">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-zinc-900 border-white/10 text-zinc-200">
                    <SelectItem value="SICAKLIK">Sıcaklık (°C)</SelectItem>
                    <SelectItem value="TITRESIM">Titreşim (mm/s)</SelectItem>
                    <SelectItem value="BASINC">Basınç (Bar)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label className="text-xs text-zinc-300">Ölçüm Değeri</Label>
                <Input
                  type="number"
                  value={readingForm.readingValue}
                  onChange={(e) => setReadingForm({ ...readingForm, readingValue: Number(e.target.value) })}
                  className="mt-1 bg-white/[0.02] border-white/10 text-white font-mono"
                />
              </div>
            </div>

            <DialogFooter className="mt-4">
              <Button type="button" variant="outline" onClick={() => setIsNewReadingOpen(false)} className="border-white/10 text-zinc-300">
                İptal
              </Button>
              <Button type="submit" className="bg-cyan-600 hover:bg-cyan-500 text-white">
                Ölçümü Gönder
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* MODAL 4: İŞ EMRİ TAMAMLAMA */}
      <Dialog open={isCompleteOrderOpen} onOpenChange={setIsCompleteOrderOpen}>
        <DialogContent className="bg-zinc-950 border border-white/10 text-white max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Check className="w-5 h-5 text-emerald-400" />
              Bakım İş Emrini Kapat
            </DialogTitle>
            <DialogDescription className="text-xs text-zinc-400">
              {selectedOrder?.workOrderNumber} - {selectedOrder?.title}
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleCompleteOrderSubmit} className="space-y-3 mt-2">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs text-zinc-300">Duruş Süresi (Dakika)</Label>
                <Input
                  type="number"
                  value={completionForm.downtimeMinutes}
                  onChange={(e) => setCompletionForm({ ...completionForm, downtimeMinutes: Number(e.target.value) })}
                  className="mt-1 bg-white/[0.02] border-white/10 text-white font-mono"
                />
              </div>

              <div>
                <Label className="text-xs text-zinc-300">İşçilik Süresi (Saat)</Label>
                <Input
                  type="number"
                  step="0.5"
                  value={completionForm.laborHours}
                  onChange={(e) => setCompletionForm({ ...completionForm, laborHours: Number(e.target.value) })}
                  className="mt-1 bg-white/[0.02] border-white/10 text-white font-mono"
                />
              </div>
            </div>

            <div>
              <Label className="text-xs text-zinc-300">Arıza / Kök Neden</Label>
              <Input
                placeholder="Örn: Yetersiz yağlama ve aşırı ısınma"
                value={completionForm.failureReason}
                onChange={(e) => setCompletionForm({ ...completionForm, failureReason: e.target.value })}
                className="mt-1 bg-white/[0.02] border-white/10 text-white"
              />
            </div>

            <div>
              <Label className="text-xs text-zinc-300">Tamamlama Notları</Label>
              <Input
                placeholder="Yapılan işlemler, parça değişimi..."
                value={completionForm.completionNotes}
                onChange={(e) => setCompletionForm({ ...completionForm, completionNotes: e.target.value })}
                className="mt-1 bg-white/[0.02] border-white/10 text-white"
              />
            </div>

            <DialogFooter className="mt-4">
              <Button type="button" variant="outline" onClick={() => setIsCompleteOrderOpen(false)} className="border-white/10 text-zinc-300">
                Vazgeç
              </Button>
              <Button type="submit" className="bg-emerald-600 hover:bg-emerald-500 text-white">
                Onayla ve Kapat
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}

