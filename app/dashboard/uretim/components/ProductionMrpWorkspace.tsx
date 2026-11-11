"use client"

import React, { useState, useEffect, useCallback, useMemo } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Checkbox } from "@/components/ui/checkbox"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { toast } from "sonner"
import {
  Cpu,
  Layers,
  Calendar,
  RefreshCw,
  Plus,
  Play,
  CheckCircle2,
  AlertTriangle,
  Search,
  ShoppingCart,
  Package,
  ArrowRight,
  Filter,
  Check,
  X,
  FileText,
  Clock,
  ExternalLink,
  ShieldAlert,
  ChevronRight,
  Sliders,
} from "lucide-react"
import { useAuth } from "@/lib/auth/context"

export function ProductionMrpWorkspace() {
  const { currentBranch, hasPermission, isSuperAdmin } = useAuth()

  // Sekmeler: mps, mrp_run, planned_orders, action_messages, time_phased
  const [activeTab, setActiveTab] = useState<
    "mps" | "mrp_run" | "planned_orders" | "action_messages" | "time_phased"
  >("mps")

  // ─────────────────────────────────────────────────────────────
  // 1. MPS (ANA ÜRETİM ÇİZELGESİ) DURUM VE VERİLERİ
  // ─────────────────────────────────────────────────────────────
  const [mpsPlans, setMpsPlans] = useState<any[]>([])
  const [selectedPlanId, setSelectedPlanId] = useState<string>("")
  const [mpsGridData, setMpsGridData] = useState<any>(null)
  const [loadingMps, setLoadingMps] = useState(false)

  // Yeni Plan Modalı
  const [isNewPlanModalOpen, setIsNewPlanModalOpen] = useState(false)
  const [newPlanForm, setNewPlanForm] = useState({
    code: "",
    name: "",
    bucketType: "WEEKLY",
    horizonDays: 90,
    frozenDays: 14,
    notes: "",
  })

  // Senaryo Modalı
  const [isScenarioModalOpen, setIsScenarioModalOpen] = useState(false)
  const [scenarioForm, setScenarioForm] = useState({
    scenarioName: "",
    forecastMultiplier: 1.2,
  })

  // Senaryo Karşılaştırma Modalı
  const [isCompareModalOpen, setIsCompareModalOpen] = useState(false)
  const [compareTargetPlanId, setCompareTargetPlanId] = useState<string>("")
  const [comparisonResult, setComparisonResult] = useState<any>(null)
  const [loadingComparison, setLoadingComparison] = useState(false)

  // ─────────────────────────────────────────────────────────────
  // 2. MRP ÇALIŞTIRMA DURUM VE VERİLERİ
  // ─────────────────────────────────────────────────────────────
  const [mrpRuns, setMrpRuns] = useState<any[]>([])
  const [activeRunId, setActiveRunId] = useState<string>("")
  const [activeRunDetails, setActiveRunDetails] = useState<any>(null)
  const [isRunMrpModalOpen, setIsRunMrpModalOpen] = useState(false)
  const [runMrpForm, setRunMrpForm] = useState({
    mpsPlanId: "",
    runType: "FULL_REGENERATION",
  })
  const [isRunningMrp, setIsRunningMrp] = useState(false)

  // ─────────────────────────────────────────────────────────────
  // 3. PLANLANAN SİPARİŞLER (PLANNED ORDERS)
  // ─────────────────────────────────────────────────────────────
  const [plannedOrders, setPlannedOrders] = useState<any[]>([])
  const [loadingOrders, setLoadingOrders] = useState(false)
  const [orderTypeFilter, setOrderTypeFilter] = useState("ALL")
  const [orderStatusFilter, setOrderStatusFilter] = useState("ALL")
  const [selectedOrderIds, setSelectedOrderIds] = useState<string[]>([])
  const [isConverting, setIsConverting] = useState(false)

  // ─────────────────────────────────────────────────────────────
  // 4. AKSİYON / İSTİSNA MESAJLARI (ACTION MESSAGES)
  // ─────────────────────────────────────────────────────────────
  const [actionMessages, setActionMessages] = useState<any[]>([])
  const [loadingMessages, setLoadingMessages] = useState(false)
  const [actionTypeFilter, setActionTypeFilter] = useState("ALL")
  const [severityFilter, setSeverityFilter] = useState("ALL")

  // ─────────────────────────────────────────────────────────────
  // 5. MALZEME ZAMAN ÇİZELGESİ & PEGGING ÇEKMECESİ
  // ─────────────────────────────────────────────────────────────
  const [selectedItemId, setSelectedItemId] = useState<string | null>(null)
  const [timePhasedData, setTimePhasedData] = useState<any>(null)
  const [loadingTimePhased, setLoadingTimePhased] = useState(false)
  const [isDrawerOpen, setIsDrawerOpen] = useState(false)

  // ─────────────────────────────────────────────────────────────
  // API VERİ ÇEKME FONKSİYONLARI
  // ─────────────────────────────────────────────────────────────

  // MPS Planlarını Çek
  const fetchMpsPlans = useCallback(async () => {
    try {
      setLoadingMps(true)
      const res = await fetch("/api/production/mrp-mps?section=mps_plans")
      const data = await res.json()
      if (data.success) {
        setMpsPlans(data.plans || [])
        if (!selectedPlanId && data.plans?.length > 0) {
          setSelectedPlanId(data.plans[0].id)
        }
      }
    } catch {
      toast.error("MPS Planları yüklenirken hata oluştu.")
    } finally {
      setLoadingMps(false)
    }
  }, [selectedPlanId])

  // Seçili MPS Gridini Çek
  const fetchMpsGrid = useCallback(async (planId: string) => {
    if (!planId) return
    try {
      setLoadingMps(true)
      const res = await fetch(`/api/production/mrp-mps?section=mps_grid&mpsPlanId=${planId}`)
      const data = await res.json()
      if (data.success) {
        setMpsGridData(data)
      } else {
        toast.error(data.error || "MPS Matrisi yüklenemedi.")
      }
    } catch {
      toast.error("MPS Matrisi yüklenirken hata oluştu.")
    } finally {
      setLoadingMps(false)
    }
  }, [])

  // MRP Koşularını Çek
  const fetchMrpRuns = useCallback(async () => {
    try {
      const res = await fetch("/api/production/mrp-mps?section=mrp_runs")
      const data = await res.json()
      if (data.success) {
        setMrpRuns(data.runs || [])
        if (!activeRunId && data.runs?.length > 0) {
          setActiveRunId(data.runs[0].id)
        }
      }
    } catch {
      toast.error("MRP Koşuları yüklenirken hata oluştu.")
    }
  }, [activeRunId])

  // Seçili MRP Koşu Detayını Çek
  const fetchMrpRunDetails = useCallback(async (runId: string) => {
    if (!runId) return
    try {
      const res = await fetch(`/api/production/mrp-mps?section=mrp_run&id=${runId}`)
      const data = await res.json()
      if (data.success) {
        setActiveRunDetails(data.run)
      }
    } catch {
      toast.error("MRP koşu detayları yüklenemedi.")
    }
  }, [])

  // Planlanan Siparişleri Çek
  const fetchPlannedOrders = useCallback(async () => {
    try {
      setLoadingOrders(true)
      let url = `/api/production/mrp-mps?section=planned_orders&orderType=${orderTypeFilter}&orderStatus=${orderStatusFilter}`
      if (activeRunId) url += `&mrpRunId=${activeRunId}`
      const res = await fetch(url)
      const data = await res.json()
      if (data.success) {
        setPlannedOrders(data.orders || [])
      }
    } catch {
      toast.error("Planlanan siparişler yüklenemedi.")
    } finally {
      setLoadingOrders(false)
    }
  }, [orderTypeFilter, orderStatusFilter, activeRunId])

  // Aksiyon Mesajlarını Çek
  const fetchActionMessages = useCallback(async () => {
    try {
      setLoadingMessages(true)
      let url = `/api/production/mrp-mps?section=action_messages&actionType=${actionTypeFilter}&severity=${severityFilter}`
      if (activeRunId) url += `&mrpRunId=${activeRunId}`
      const res = await fetch(url)
      const data = await res.json()
      if (data.success) {
        setActionMessages(data.messages || [])
      }
    } catch {
      toast.error("Aksiyon mesajları yüklenemedi.")
    } finally {
      setLoadingMessages(false)
    }
  }, [actionTypeFilter, severityFilter, activeRunId])

  // Malzeme Zaman Çizelgesi & Pegging Çek
  const fetchTimePhased = useCallback(async (itemId: string) => {
    try {
      setLoadingTimePhased(true)
      const res = await fetch(`/api/production/mrp-mps?section=item_time_phased&itemId=${itemId}`)
      const data = await res.json()
      if (data.success) {
        setTimePhasedData(data)
        setIsDrawerOpen(true)
      } else {
        toast.error(data.error || "Malzeme zaman çizelgesi yüklenemedi.")
      }
    } catch {
      toast.error("Zaman çizelgesi yüklenirken hata oluştu.")
    } finally {
      setLoadingTimePhased(false)
    }
  }, [])

  // İlk Yükleme
  useEffect(() => {
    fetchMpsPlans()
    fetchMrpRuns()
  }, [fetchMpsPlans, fetchMrpRuns])

  useEffect(() => {
    if (selectedPlanId) {
      fetchMpsGrid(selectedPlanId)
    }
  }, [selectedPlanId, fetchMpsGrid])

  useEffect(() => {
    if (activeRunId) {
      fetchMrpRunDetails(activeRunId)
      fetchPlannedOrders()
      fetchActionMessages()
    }
  }, [activeRunId, fetchMrpRunDetails, fetchPlannedOrders, fetchActionMessages])

  // ─────────────────────────────────────────────────────────────
  // İŞLEM METODLARI
  // ─────────────────────────────────────────────────────────────

  // 1. Yeni MPS Planı Oluştur
  const handleCreatePlan = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newPlanForm.code || !newPlanForm.name) {
      toast.error("Plan kodu ve adı zorunludur.")
      return
    }
    try {
      const res = await fetch("/api/production/mrp-mps", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "create_mps_plan",
          ...newPlanForm,
        }),
      })
      const data = await res.json()
      if (data.success) {
        toast.success("MPS Planı başarıyla oluşturuldu.")
        setIsNewPlanModalOpen(false)
        fetchMpsPlans()
        setSelectedPlanId(data.plan.id)
      } else {
        toast.error(data.error || "Plan oluşturulamadı.")
      }
    } catch {
      toast.error("İşlem sırasında hata oluştu.")
    }
  }

  // 2. MPS Planını Onayla
  const handleApprovePlan = async () => {
    if (!selectedPlanId) return
    try {
      const res = await fetch("/api/production/mrp-mps", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "approve_mps_plan",
          planId: selectedPlanId,
        }),
      })
      const data = await res.json()
      if (data.success) {
        toast.success("MPS Planı onaylandı.")
        fetchMpsPlans()
        fetchMpsGrid(selectedPlanId)
      } else {
        toast.error(data.error || "Plan onaylanamadı.")
      }
    } catch {
      toast.error("Onaylama sırasında hata oluştu.")
    }
  }

  // 3. What-If Senaryosu Türet
  const handleCloneScenario = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedPlanId || !scenarioForm.scenarioName) {
      toast.error("Senaryo adı zorunludur.")
      return
    }
    try {
      const res = await fetch("/api/production/mrp-mps", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "clone_mps_scenario",
          basePlanId: selectedPlanId,
          ...scenarioForm,
        }),
      })
      const data = await res.json()
      if (data.success) {
        toast.success("What-if senaryosu türetildi.")
        setIsScenarioModalOpen(false)
        fetchMpsPlans()
        setSelectedPlanId(data.plan.id)
      } else {
        toast.error(data.error || "Senaryo türetilemedi.")
      }
    } catch {
      toast.error("Senaryo türetilirken hata oluştu.")
    }
  }

  // 4. Senaryoları Karşılaştır
  const handleCompareScenarios = async () => {
    if (!selectedPlanId || !compareTargetPlanId) {
      toast.error("Karşılaştırılacak senaryo seçilmelidir.")
      return
    }
    try {
      setLoadingComparison(true)
      const res = await fetch(
        `/api/production/mrp-mps?section=compare_scenarios&basePlanId=${selectedPlanId}&scenarioPlanId=${compareTargetPlanId}`
      )
      const data = await res.json()
      if (data.success) {
        setComparisonResult(data.comparison)
      } else {
        toast.error(data.error || "Karşılaştırma yapılamadı.")
      }
    } catch {
      toast.error("Karşılaştırma sırasında hata oluştu.")
    } finally {
      setLoadingComparison(false)
    }
  }

  // 5. MRP Çalıştır
  const handleRunMrp = async () => {
    setIsRunningMrp(true)
    try {
      const res = await fetch("/api/production/mrp-mps", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "run_mrp",
          mpsPlanId: runMrpForm.mpsPlanId || selectedPlanId || null,
          runType: runMrpForm.runType,
        }),
      })
      const data = await res.json()
      if (data.success) {
        toast.success(`MRP Tamamlandı! ${data.summary.totalOrdersGenerated} sipariş oluşturuldu.`)
        setIsRunMrpModalOpen(false)
        fetchMrpRuns()
        setActiveRunId(data.run.id)
        setActiveTab("planned_orders")
      } else {
        toast.error(data.error || "MRP çalıştırma başarısız oldu.")
      }
    } catch {
      toast.error("MRP çalıştırılırken sistem hatası oluştu.")
    } finally {
      setIsRunningMrp(false)
    }
  }

  // 6. Planlanan Siparişi Satınalma Talebine Dönüştür
  const handleConvertToPurchase = async (orderId: string) => {
    setIsConverting(true)
    try {
      const res = await fetch("/api/production/mrp-mps", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "convert_to_purchase_requisition",
          plannedOrderId: orderId,
        }),
      })
      const data = await res.json()
      if (data.success) {
        toast.success(`Satınalma Talebi Oluşturuldu (${data.requisition.reqNumber})`)
        fetchPlannedOrders()
      } else {
        toast.error(data.error || "Dönüştürme başarısız oldu.")
      }
    } catch {
      toast.error("Dönüştürme sırasında hata oluştu.")
    } finally {
      setIsConverting(false)
    }
  }

  // 7. Toplu Satınalma Talebine Dönüştür
  const handleBulkConvert = async () => {
    if (selectedOrderIds.length === 0) {
      toast.error("En az bir sipariş seçilmelidir.")
      return
    }
    setIsConverting(true)
    try {
      const res = await fetch("/api/production/mrp-mps", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "bulk_convert_purchase",
          plannedOrderIds: selectedOrderIds,
        }),
      })
      const data = await res.json()
      if (data.success) {
        toast.success(`${data.successfulCount} adet sipariş Satınalma Talebine dönüştürüldü.`)
        setSelectedOrderIds([])
        fetchPlannedOrders()
      } else {
        toast.error(data.error || "Toplu dönüştürme başarısız oldu.")
      }
    } catch {
      toast.error("Toplu dönüştürme sırasında hata oluştu.")
    } finally {
      setIsConverting(false)
    }
  }

  // 8. Aksiyon Mesajını Çöz
  const handleResolveActionMessage = async (msgId: string) => {
    try {
      const res = await fetch("/api/production/mrp-mps", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "resolve_action_message",
          messageId: msgId,
        }),
      })
      const data = await res.json()
      if (data.success) {
        toast.success("Aksiyon mesajı çözüldü olarak işaretlendi.")
        fetchActionMessages()
      }
    } catch {
      toast.error("Mesaj güncellenirken hata oluştu.")
    }
  }

  const selectedPlan = useMemo(
    () => mpsPlans.find((p) => p.id === selectedPlanId),
    [mpsPlans, selectedPlanId]
  )

  return (
    <div className="space-y-6">
      {/* Üst Bar: Başlık, Plan Seçici, MRP Çalıştır Butonu */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-4 rounded-xl bg-zinc-900/60 border border-white/10">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-1.5 rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              <Cpu className="w-5 h-5" />
            </span>
            <h1 className="text-xl font-semibold text-white tracking-tight">
              MRP & Ana Üretim Çizelgesi (MPS)
            </h1>
          </div>
          <p className="text-xs text-zinc-400 mt-1">
            Talep patlatma, zaman kovaları, dondurulmuş ufuk, lot büyüklükleri ve otomatik satınalma/üretim önerileri.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Plan Seçici */}
          <Select value={selectedPlanId} onValueChange={(val) => setSelectedPlanId(val)}>
            <SelectTrigger className="w-[200px] h-9 bg-zinc-800 border-zinc-700 text-xs">
              <SelectValue placeholder="MPS Planı Seçiniz" />
            </SelectTrigger>
            <SelectContent className="bg-zinc-900 border-zinc-800 text-white">
              {mpsPlans.map((p) => (
                <SelectItem key={p.id} value={p.id} className="text-xs">
                  {p.code} - {p.name} {p.isWhatIfScenario ? "(Senaryo)" : ""}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* Yeni Plan Butonu */}
          <Button
            size="sm"
            variant="outline"
            onClick={() => setIsNewPlanModalOpen(true)}
            className="h-9 text-xs border-zinc-700 bg-zinc-800 text-zinc-300 hover:text-white"
          >
            <Plus className="w-3.5 h-3.5 mr-1" /> Yeni Plan
          </Button>

          {/* MRP Çalıştır Butonu */}
          <Button
            size="sm"
            onClick={() => {
              setRunMrpForm({
                mpsPlanId: selectedPlanId || "",
                runType: "FULL_REGENERATION",
              })
              setIsRunMrpModalOpen(true)
            }}
            className="h-9 text-xs bg-emerald-600 hover:bg-emerald-500 text-white shadow-lg shadow-emerald-900/30"
          >
            <Play className="w-3.5 h-3.5 mr-1.5 fill-current" /> MRP Çalıştır
          </Button>
        </div>
      </div>

      {/* Sekme Butonları */}
      <div className="flex items-center gap-2 border-b border-white/10 pb-3 overflow-x-auto">
        <button
          onClick={() => setActiveTab("mps")}
          className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-medium transition-all ${
            activeTab === "mps"
              ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
              : "text-zinc-400 hover:text-white hover:bg-white/5"
          }`}
        >
          <Calendar className="w-4 h-4" /> Ana Üretim Çizelgesi (MPS Matrisi)
        </button>

        <button
          onClick={() => setActiveTab("mrp_run")}
          className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-medium transition-all ${
            activeTab === "mrp_run"
              ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
              : "text-zinc-400 hover:text-white hover:bg-white/5"
          }`}
        >
          <Play className="w-4 h-4" /> MRP Koşuları & İlerleme ({mrpRuns.length})
        </button>

        <button
          onClick={() => setActiveTab("planned_orders")}
          className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-medium transition-all ${
            activeTab === "planned_orders"
              ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
              : "text-zinc-400 hover:text-white hover:bg-white/5"
          }`}
        >
          <Package className="w-4 h-4" /> Planlanan Siparişler ({plannedOrders.length})
        </button>

        <button
          onClick={() => setActiveTab("action_messages")}
          className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-medium transition-all ${
            activeTab === "action_messages"
              ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
              : "text-zinc-400 hover:text-white hover:bg-white/5"
          }`}
        >
          <AlertTriangle className="w-4 h-4" /> Aksiyon Mesajları ({actionMessages.length})
        </button>
      </div>

      {/* ─────────────────────────────────────────────────────────────
          SEKME 1: MPS MATRİS GÖRÜNÜMÜ
      ───────────────────────────────────────────────────────────── */}
      {activeTab === "mps" && (
        <div className="space-y-4">
          {/* Plan Bilgi Şeridi */}
          {selectedPlan && (
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5 rounded-lg bg-zinc-900/40 border border-white/5 text-xs text-zinc-300">
              <div className="flex flex-wrap items-center gap-3">
                <span className="font-semibold text-white">{selectedPlan.name}</span>
                <span className="font-mono text-zinc-400">({selectedPlan.code})</span>
                <span
                  className={`px-2 py-0.5 rounded text-[11px] font-medium ${
                    selectedPlan.status === "APPROVED"
                      ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                      : selectedPlan.status === "OBSOLETE"
                      ? "bg-zinc-800 text-zinc-400"
                      : "bg-amber-500/10 text-amber-400 border border-amber-500/20"
                  }`}
                >
                  {selectedPlan.status === "APPROVED"
                    ? "ONAYLANDI"
                    : selectedPlan.status === "OBSOLETE"
                    ? "ARŞİV"
                    : "TASLAK"}
                </span>
                <span className="text-zinc-500">|</span>
                <span>Zaman Kovası: <strong className="text-white">{selectedPlan.bucketType}</strong></span>
                <span>Ufuk: <strong className="text-white">{selectedPlan.horizonDays} Gün</strong></span>
                <span>Dondurulmuş Ufuk: <strong className="text-amber-400">{selectedPlan.frozenDays} Gün</strong></span>
              </div>

              <div className="flex items-center gap-2">
                {selectedPlan.status === "DRAFT" && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={handleApprovePlan}
                    className="h-8 text-xs border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/10"
                  >
                    <CheckCircle2 className="w-3.5 h-3.5 mr-1" /> Planı Onayla
                  </Button>
                )}
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setIsScenarioModalOpen(true)}
                  className="h-8 text-xs border-zinc-700 bg-zinc-800 text-zinc-300 hover:text-white"
                >
                  What-If Senaryosu Türet
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    setIsCompareModalOpen(true)
                  }}
                  className="h-8 text-xs border-zinc-700 bg-zinc-800 text-zinc-300 hover:text-white"
                >
                  Senaryo Karşılaştır
                </Button>
              </div>
            </div>
          )}

          {/* MPS Grid Matrisi */}
          {loadingMps ? (
            <div className="p-8 text-center text-sm text-zinc-400">
              <RefreshCw className="w-5 h-5 animate-spin mx-auto mb-2 text-emerald-400" />
              MPS Matrisi hesaplanıyor...
            </div>
          ) : mpsGridData?.grid?.length > 0 ? (
            <div className="space-y-6">
              {mpsGridData.grid.map((entry: any) => (
                <div
                  key={entry.item.id}
                  className="rounded-xl border border-white/10 bg-zinc-900/60 overflow-hidden"
                >
                  <div className="p-3.5 bg-zinc-800/40 border-b border-white/5 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-white text-sm">{entry.item.sku}</span>
                      <span className="text-xs text-zinc-400">- {entry.item.name}</span>
                    </div>
                    <div className="flex items-center gap-4 text-xs text-zinc-400">
                      <span>Mevcut Stok: <strong className="text-white">{entry.item.currentOnHand}</strong></span>
                      <span>Emniyet Stoku: <strong className="text-amber-400">{entry.item.safetyStockQty}</strong></span>
                      <span>Temin Süresi: <strong className="text-white">{entry.item.leadTimeDays} Gün</strong></span>
                      <span>Lot Kuralı: <strong className="text-emerald-400">{entry.item.lotSizingRule}</strong></span>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => fetchTimePhased(entry.item.id)}
                        className="h-7 text-xs text-zinc-400 hover:text-white"
                      >
                        Zaman Çizelgesi & Pegging <ExternalLink className="w-3 h-3 ml-1" />
                      </Button>
                    </div>
                  </div>

                  <div className="overflow-x-auto">
                    <table className="w-full text-xs text-left border-collapse">
                      <thead>
                        <tr className="border-b border-white/5 bg-zinc-800/20 text-zinc-400">
                          <th className="p-2.5 pl-4 w-44 font-medium">Kalem / Periyot</th>
                          {entry.matrix.map((col: any) => (
                            <th
                              key={col.periodIndex}
                              className={`p-2.5 text-center min-w-[90px] font-medium ${
                                col.isFrozen
                                  ? "bg-amber-500/5 border-r border-amber-500/20 text-amber-300"
                                  : ""
                              }`}
                            >
                              <div className="font-bold">P{col.periodIndex + 1}</div>
                              <div className="text-[10px] text-zinc-500 font-normal">
                                {col.periodStartDate}
                              </div>
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-white/5 font-mono">
                        {/* Satış Tahmini */}
                        <tr className="hover:bg-white/[0.02]">
                          <td className="p-2 pl-4 text-zinc-400 font-sans">Satış Tahmini (Forecast)</td>
                          {entry.matrix.map((c: any) => (
                            <td key={c.periodIndex} className="p-2 text-center text-zinc-300">
                              {c.forecastQty || 0}
                            </td>
                          ))}
                        </tr>
                        {/* Kesin Siparişler */}
                        <tr className="hover:bg-white/[0.02]">
                          <td className="p-2 pl-4 text-zinc-400 font-sans">Müşteri Siparişleri (Sales)</td>
                          {entry.matrix.map((c: any) => (
                            <td key={c.periodIndex} className="p-2 text-center text-zinc-300">
                              {c.salesOrderQty || 0}
                            </td>
                          ))}
                        </tr>
                        {/* Brüt İhtiyaç */}
                        <tr className="bg-white/[0.01] font-semibold">
                          <td className="p-2 pl-4 text-white font-sans">Brüt İhtiyaç (Gross Req)</td>
                          {entry.matrix.map((c: any) => (
                            <td key={c.periodIndex} className="p-2 text-center text-white">
                              {c.grossRequirement || 0}
                            </td>
                          ))}
                        </tr>
                        {/* Beklenen Girişler */}
                        <tr className="hover:bg-white/[0.02]">
                          <td className="p-2 pl-4 text-zinc-400 font-sans">Beklenen Girişler (Supply)</td>
                          {entry.matrix.map((c: any) => (
                            <td key={c.periodIndex} className="p-2 text-center text-blue-400">
                              {c.scheduledReceipts || 0}
                            </td>
                          ))}
                        </tr>
                        {/* MPS Üretim Planı */}
                        <tr className="bg-emerald-500/[0.04] font-semibold border-y border-emerald-500/20">
                          <td className="p-2 pl-4 text-emerald-400 font-sans flex items-center gap-1.5">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                            MPS Üretim Kararı
                          </td>
                          {entry.matrix.map((c: any) => (
                            <td
                              key={c.periodIndex}
                              className={`p-2 text-center ${
                                c.plannedProductionQty > 0
                                  ? "text-emerald-400 font-bold bg-emerald-500/10"
                                  : "text-zinc-500"
                              }`}
                            >
                              {c.plannedProductionQty || "-"}
                            </td>
                          ))}
                        </tr>
                        {/* Projeksiyon Stoku */}
                        <tr className="hover:bg-white/[0.02]">
                          <td className="p-2 pl-4 text-zinc-400 font-sans">Projeksiyon Stoku (On Hand)</td>
                          {entry.matrix.map((c: any) => (
                            <td
                              key={c.periodIndex}
                              className={`p-2 text-center font-medium ${
                                c.projectedOnHand < entry.item.safetyStockQty
                                  ? "text-amber-400 bg-amber-500/5"
                                  : "text-zinc-300"
                              }`}
                            >
                              {c.projectedOnHand}
                            </td>
                          ))}
                        </tr>
                        {/* Kullanılabilir Stok (ATP) */}
                        <tr className="bg-white/[0.02] font-semibold">
                          <td className="p-2 pl-4 text-cyan-400 font-sans">Kullanılabilir Stok (ATP)</td>
                          {entry.matrix.map((c: any) => (
                            <td key={c.periodIndex} className="p-2 text-center text-cyan-400">
                              {c.atpQty || 0}
                            </td>
                          ))}
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="p-12 text-center border border-dashed border-white/10 rounded-xl">
              <Calendar className="w-8 h-8 text-zinc-600 mx-auto mb-2" />
              <p className="text-sm font-medium text-white">Henüz MPS Verisi Bulunmuyor</p>
              <p className="text-xs text-zinc-400 mt-1">
                Yukarıdaki "Yeni Plan" butonuyla bir ana üretim çizelgesi başlatabilirsiniz.
              </p>
            </div>
          )}
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────────
          SEKME 2: MRP KOŞULARI & İLERLEME
      ───────────────────────────────────────────────────────────── */}
      {activeTab === "mrp_run" && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="p-4 rounded-xl bg-zinc-900/60 border border-white/10">
              <div className="text-xs text-zinc-400">Toplam Koşu</div>
              <div className="text-2xl font-bold text-white mt-1">{mrpRuns.length}</div>
            </div>
            <div className="p-4 rounded-xl bg-zinc-900/60 border border-white/10">
              <div className="text-xs text-zinc-400">Son Koşu Kodu</div>
              <div className="text-sm font-mono font-bold text-emerald-400 mt-2">
                {mrpRuns[0]?.runCode || "Kayıt Yok"}
              </div>
            </div>
            <div className="p-4 rounded-xl bg-zinc-900/60 border border-white/10">
              <div className="text-xs text-zinc-400">Üretilen Sipariş Sayısı</div>
              <div className="text-2xl font-bold text-white mt-1">
                {mrpRuns[0]?.totalOrdersGenerated || 0}
              </div>
            </div>
            <div className="p-4 rounded-xl bg-zinc-900/60 border border-white/10">
              <div className="text-xs text-zinc-400">Aksiyon Mesajı Sayısı</div>
              <div className="text-2xl font-bold text-amber-400 mt-1">
                {mrpRuns[0]?.totalActionMessages || 0}
              </div>
            </div>
          </div>

          <div className="rounded-xl border border-white/10 bg-zinc-900/60 overflow-hidden">
            <Table>
              <TableHeader className="bg-zinc-800/40 text-xs">
                <TableRow className="border-white/5">
                  <TableHead className="text-zinc-400">Koşu Kodu</TableHead>
                  <TableHead className="text-zinc-400">Tip</TableHead>
                  <TableHead className="text-zinc-400">Durum</TableHead>
                  <TableHead className="text-zinc-400">Planlanan Kalem</TableHead>
                  <TableHead className="text-zinc-400">Siparişler</TableHead>
                  <TableHead className="text-zinc-400">Aksiyonlar</TableHead>
                  <TableHead className="text-zinc-400">Süre</TableHead>
                  <TableHead className="text-zinc-400">Başlangıç</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody className="text-xs font-mono">
                {mrpRuns.map((r) => (
                  <TableRow
                    key={r.id}
                    onClick={() => setActiveRunId(r.id)}
                    className={`cursor-pointer hover:bg-white/[0.02] border-white/5 ${
                      activeRunId === r.id ? "bg-emerald-500/[0.04]" : ""
                    }`}
                  >
                    <TableCell className="font-semibold text-white">{r.runCode}</TableCell>
                    <TableCell className="text-zinc-300">{r.runType}</TableCell>
                    <TableCell>
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-sans font-medium ${
                          r.status === "COMPLETED"
                            ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                            : r.status === "RUNNING"
                            ? "bg-blue-500/10 text-blue-400 border border-blue-500/20 animate-pulse"
                            : "bg-red-500/10 text-red-400 border border-red-500/20"
                        }`}
                      >
                        {r.status}
                      </span>
                    </TableCell>
                    <TableCell className="text-zinc-300">{r.totalItemsPlanned}</TableCell>
                    <TableCell className="text-emerald-400">{r.totalOrdersGenerated}</TableCell>
                    <TableCell className="text-amber-400">{r.totalActionMessages}</TableCell>
                    <TableCell className="text-zinc-400">{r.executionTimeMs} ms</TableCell>
                    <TableCell className="text-zinc-500 font-sans">
                      {new Date(r.startedAt).toLocaleString("tr-TR")}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────────
          SEKME 3: PLANLANAN SİPARİŞLER (PLANNED ORDERS)
      ───────────────────────────────────────────────────────────── */}
      {activeTab === "planned_orders" && (
        <div className="space-y-4">
          {/* Filtre ve Toplu Dönüştür Butonları */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5 rounded-lg bg-zinc-900/40 border border-white/5 text-xs">
            <div className="flex flex-wrap items-center gap-3">
              <div className="flex items-center gap-2">
                <span className="text-zinc-400">Sipariş Tipi:</span>
                <Select value={orderTypeFilter} onValueChange={(val) => setOrderTypeFilter(val)}>
                  <SelectTrigger className="w-[140px] h-8 bg-zinc-800 border-zinc-700 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-zinc-900 border-zinc-800 text-white text-xs">
                    <SelectItem value="ALL">Tümü</SelectItem>
                    <SelectItem value="PURCHASE">Satınalma (PO)</SelectItem>
                    <SelectItem value="PRODUCTION">Üretim (WO)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="flex items-center gap-2">
                <span className="text-zinc-400">Durum:</span>
                <Select value={orderStatusFilter} onValueChange={(val) => setOrderStatusFilter(val)}>
                  <SelectTrigger className="w-[140px] h-8 bg-zinc-800 border-zinc-700 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-zinc-900 border-zinc-800 text-white text-xs">
                    <SelectItem value="ALL">Tümü</SelectItem>
                    <SelectItem value="PLANNED">Planlandı</SelectItem>
                    <SelectItem value="APPROVED">Onaylandı</SelectItem>
                    <SelectItem value="CONVERTED">Dönüştürüldü</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Button
                size="sm"
                variant="outline"
                disabled={selectedOrderIds.length === 0 || isConverting}
                onClick={handleBulkConvert}
                className="h-8 text-xs bg-emerald-600/10 border-emerald-500/30 text-emerald-400 hover:bg-emerald-600/20"
              >
                <ShoppingCart className="w-3.5 h-3.5 mr-1" />
                Seçilenleri Satınalma Talebine Dönüştür ({selectedOrderIds.length})
              </Button>
            </div>
          </div>

          {/* Tablo */}
          <div className="rounded-xl border border-white/10 bg-zinc-900/60 overflow-hidden">
            <Table>
              <TableHeader className="bg-zinc-800/40 text-xs">
                <TableRow className="border-white/5">
                  <TableHead className="w-10">
                    <Checkbox
                      checked={
                        plannedOrders.length > 0 &&
                        selectedOrderIds.length === plannedOrders.length
                      }
                      onCheckedChange={(checked) => {
                        if (checked) {
                          setSelectedOrderIds(
                            plannedOrders
                              .filter((o) => o.orderType === "PURCHASE" && o.orderStatus === "PLANNED")
                              .map((o) => o.id)
                          )
                        } else {
                          setSelectedOrderIds([])
                        }
                      }}
                    />
                  </TableHead>
                  <TableHead className="text-zinc-400">Sipariş No</TableHead>
                  <TableHead className="text-zinc-400">Tip</TableHead>
                  <TableHead className="text-zinc-400">Malzeme</TableHead>
                  <TableHead className="text-zinc-400 text-right">Miktar</TableHead>
                  <TableHead className="text-zinc-400">Sipariş Tarihi</TableHead>
                  <TableHead className="text-zinc-400">Teslim Tarihi</TableHead>
                  <TableHead className="text-zinc-400">Durum</TableHead>
                  <TableHead className="text-zinc-400 text-right">İşlem</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody className="text-xs">
                {plannedOrders.map((o) => (
                  <TableRow key={o.id} className="border-white/5 hover:bg-white/[0.02]">
                    <TableCell>
                      {o.orderType === "PURCHASE" && o.orderStatus === "PLANNED" && (
                        <Checkbox
                          checked={selectedOrderIds.includes(o.id)}
                          onCheckedChange={(checked) => {
                            if (checked) setSelectedOrderIds([...selectedOrderIds, o.id])
                            else setSelectedOrderIds(selectedOrderIds.filter((id) => id !== o.id))
                          }}
                        />
                      )}
                    </TableCell>
                    <TableCell className="font-mono font-semibold text-white">
                      {o.orderNumber}
                    </TableCell>
                    <TableCell>
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-medium ${
                          o.orderType === "PURCHASE"
                            ? "bg-blue-500/10 text-blue-400 border border-blue-500/20"
                            : "bg-purple-500/10 text-purple-400 border border-purple-500/20"
                        }`}
                      >
                        {o.orderType === "PURCHASE" ? "SATINALMA" : "ÜRETİM"}
                      </span>
                    </TableCell>
                    <TableCell>
                      <div className="font-medium text-white">{o.item?.sku}</div>
                      <div className="text-[11px] text-zinc-400">{o.item?.name}</div>
                    </TableCell>
                    <TableCell className="font-mono text-right font-bold text-white">
                      {o.quantity} {o.unit}
                    </TableCell>
                    <TableCell className="font-mono text-zinc-300">
                      {new Date(o.releaseDate).toISOString().split("T")[0]}
                    </TableCell>
                    <TableCell className="font-mono text-emerald-400 font-medium">
                      {new Date(o.dueDate).toISOString().split("T")[0]}
                    </TableCell>
                    <TableCell>
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-medium ${
                          o.orderStatus === "CONVERTED"
                            ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                            : "bg-zinc-800 text-zinc-300"
                        }`}
                      >
                        {o.orderStatus === "CONVERTED" ? "DÖNÜŞTÜRÜLDÜ" : "PLANLANDI"}
                      </span>
                    </TableCell>
                    <TableCell className="text-right">
                      {o.orderType === "PURCHASE" && o.orderStatus === "PLANNED" && (
                        <Button
                          size="sm"
                          variant="ghost"
                          disabled={isConverting}
                          onClick={() => handleConvertToPurchase(o.id)}
                          className="h-7 text-xs text-emerald-400 hover:text-emerald-300 hover:bg-emerald-500/10"
                        >
                          Talebe Dönüştür
                        </Button>
                      )}
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => fetchTimePhased(o.itemId)}
                        className="h-7 text-xs text-zinc-400 hover:text-white"
                      >
                        Pegging
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────────
          SEKME 4: AKSİYON / İSTİSNA MESAJLARI
      ───────────────────────────────────────────────────────────── */}
      {activeTab === "action_messages" && (
        <div className="space-y-4">
          <div className="flex flex-wrap items-center gap-3 p-3.5 rounded-lg bg-zinc-900/40 border border-white/5 text-xs">
            <div className="flex items-center gap-2">
              <span className="text-zinc-400">Aksiyon Türü:</span>
              <Select value={actionTypeFilter} onValueChange={(val) => setActionTypeFilter(val)}>
                <SelectTrigger className="w-[160px] h-8 bg-zinc-800 border-zinc-700 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-zinc-900 border-zinc-800 text-white text-xs">
                  <SelectItem value="ALL">Tümü</SelectItem>
                  <SelectItem value="EXPEDITE">Öne Çek (Expedite)</SelectItem>
                  <SelectItem value="DEFER">Ertele (Defer)</SelectItem>
                  <SelectItem value="CANCEL">İptal Et (Cancel)</SelectItem>
                  <SelectItem value="PAST_DUE">Gecikmiş İhtiyaç</SelectItem>
                  <SelectItem value="SAFETY_STOCK_VIOLATION">Emniyet Stoku İhlali</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-zinc-400">Önem Derecesi:</span>
              <Select value={severityFilter} onValueChange={(val) => setSeverityFilter(val)}>
                <SelectTrigger className="w-[140px] h-8 bg-zinc-800 border-zinc-700 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-zinc-900 border-zinc-800 text-white text-xs">
                  <SelectItem value="ALL">Tümü</SelectItem>
                  <SelectItem value="CRITICAL">Kritik</SelectItem>
                  <SelectItem value="WARNING">Uyarı</SelectItem>
                  <SelectItem value="INFO">Bilgi</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2.5">
            {actionMessages.map((msg) => (
              <div
                key={msg.id}
                className={`p-4 rounded-xl border flex items-start justify-between gap-4 transition-all ${
                  msg.isResolved
                    ? "bg-zinc-900/30 border-white/5 opacity-60"
                    : msg.severity === "CRITICAL"
                    ? "bg-red-500/[0.04] border-red-500/20"
                    : msg.severity === "WARNING"
                    ? "bg-amber-500/[0.04] border-amber-500/20"
                    : "bg-blue-500/[0.04] border-blue-500/20"
                }`}
              >
                <div className="flex items-start gap-3">
                  <span
                    className={`p-2 rounded-lg mt-0.5 shrink-0 ${
                      msg.severity === "CRITICAL"
                        ? "bg-red-500/10 text-red-400"
                        : msg.severity === "WARNING"
                        ? "bg-amber-500/10 text-amber-400"
                        : "bg-blue-500/10 text-blue-400"
                    }`}
                  >
                    <AlertTriangle className="w-4 h-4" />
                  </span>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-white font-mono">{msg.actionType}</span>
                      <span
                        className={`text-[10px] px-1.5 py-0.5 rounded font-medium ${
                          msg.severity === "CRITICAL"
                            ? "bg-red-500/20 text-red-300"
                            : msg.severity === "WARNING"
                            ? "bg-amber-500/20 text-amber-300"
                            : "bg-blue-500/20 text-blue-300"
                        }`}
                      >
                        {msg.severity}
                      </span>
                      <span className="text-xs text-zinc-400">
                        {msg.item?.sku} - {msg.item?.name}
                      </span>
                    </div>
                    <p className="text-xs text-zinc-300 mt-1">{msg.message}</p>
                    {msg.suggestedDate && (
                      <div className="text-[11px] font-mono text-zinc-400 mt-1">
                        Önerilen Tarih: {new Date(msg.suggestedDate).toISOString().split("T")[0]}
                      </div>
                    )}
                  </div>
                </div>

                {!msg.isResolved && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleResolveActionMessage(msg.id)}
                    className="h-8 text-xs border-zinc-700 bg-zinc-800 text-zinc-300 hover:text-white shrink-0"
                  >
                    <Check className="w-3.5 h-3.5 mr-1 text-emerald-400" /> Çözüldü
                  </Button>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────────
          MODAL: YENİ MPS PLANI OLUŞTUR
      ───────────────────────────────────────────────────────────── */}
      <Dialog open={isNewPlanModalOpen} onOpenChange={setIsNewPlanModalOpen}>
        <DialogContent className="bg-zinc-900 border-zinc-800 text-white sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Yeni Ana Üretim Çizelgesi (MPS) Planı</DialogTitle>
            <DialogDescription className="text-zinc-400 text-xs">
              Belirli bir ufuk ve dondurulmuş gün kuralı ile yeni MPS planı tanımlayın.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleCreatePlan} className="space-y-4 text-xs">
            <div className="space-y-1.5">
              <Label>Plan Kodu</Label>
              <Input
                required
                value={newPlanForm.code}
                onChange={(e) => setNewPlanForm({ ...newPlanForm, code: e.target.value })}
                placeholder="MPS-2026-Q1"
                className="bg-zinc-800 border-zinc-700"
              />
            </div>
            <div className="space-y-1.5">
              <Label>Plan Adı</Label>
              <Input
                required
                value={newPlanForm.name}
                onChange={(e) => setNewPlanForm({ ...newPlanForm, name: e.target.value })}
                placeholder="2026 1. Çeyrek Ana Üretim Planı"
                className="bg-zinc-800 border-zinc-700"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Zaman Kovası</Label>
                <Select
                  value={newPlanForm.bucketType}
                  onValueChange={(val) => setNewPlanForm({ ...newPlanForm, bucketType: val })}
                >
                  <SelectTrigger className="bg-zinc-800 border-zinc-700 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-zinc-900 border-zinc-800 text-white text-xs">
                    <SelectItem value="DAILY">Günlük</SelectItem>
                    <SelectItem value="WEEKLY">Haftalık</SelectItem>
                    <SelectItem value="MONTHLY">Aylık</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Planlama Ufku (Gün)</Label>
                <Input
                  type="number"
                  min="7"
                  value={newPlanForm.horizonDays}
                  onChange={(e) =>
                    setNewPlanForm({ ...newPlanForm, horizonDays: parseInt(e.target.value, 10) })
                  }
                  className="bg-zinc-800 border-zinc-700"
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Dondurulmuş Ufuk (Gün - Time Fence)</Label>
              <Input
                type="number"
                min="0"
                value={newPlanForm.frozenDays}
                onChange={(e) =>
                  setNewPlanForm({ ...newPlanForm, frozenDays: parseInt(e.target.value, 10) })
                }
                className="bg-zinc-800 border-zinc-700"
              />
              <p className="text-[11px] text-zinc-500">
                Bu gün sayısı içerisindeki üretim kararları onay sonrasında kilitlenir.
              </p>
            </div>
            <DialogFooter>
              <Button
                type="button"
                variant="ghost"
                onClick={() => setIsNewPlanModalOpen(false)}
                className="text-xs"
              >
                İptal
              </Button>
              <Button type="submit" className="bg-emerald-600 hover:bg-emerald-500 text-xs">
                Planı Oluştur
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* ─────────────────────────────────────────────────────────────
          MODAL: WHAT-IF SENARYOSU TÜRET
      ───────────────────────────────────────────────────────────── */}
      <Dialog open={isScenarioModalOpen} onOpenChange={setIsScenarioModalOpen}>
        <DialogContent className="bg-zinc-900 border-zinc-800 text-white sm:max-w-md">
          <DialogHeader>
            <DialogTitle>What-If Senaryosu Türet</DialogTitle>
            <DialogDescription className="text-zinc-400 text-xs">
              Mevcut plandan bağımsız bir simülasyon senaryosu oluşturun.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleCloneScenario} className="space-y-4 text-xs">
            <div className="space-y-1.5">
              <Label>Senaryo Adı</Label>
              <Input
                required
                value={scenarioForm.scenarioName}
                onChange={(e) => setScenarioForm({ ...scenarioForm, scenarioName: e.target.value })}
                placeholder="Örn: %20 Talep Artışı Senaryosu"
                className="bg-zinc-800 border-zinc-700"
              />
            </div>
            <div className="space-y-1.5">
              <Label>Talep Çarpanı</Label>
              <Input
                type="number"
                step="0.05"
                min="0.1"
                value={scenarioForm.forecastMultiplier}
                onChange={(e) =>
                  setScenarioForm({
                    ...scenarioForm,
                    forecastMultiplier: parseFloat(e.target.value),
                  })
                }
                className="bg-zinc-800 border-zinc-700"
              />
              <p className="text-[11px] text-zinc-500">
                1.2 = %20 artış, 0.8 = %20 azalış anlamına gelir.
              </p>
            </div>
            <DialogFooter>
              <Button
                type="button"
                variant="ghost"
                onClick={() => setIsScenarioModalOpen(false)}
                className="text-xs"
              >
                İptal
              </Button>
              <Button type="submit" className="bg-emerald-600 hover:bg-emerald-500 text-xs">
                Senaryoyu Türet
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* ─────────────────────────────────────────────────────────────
          MODAL: MRP ÇALIŞTIRMA ONAYI
      ───────────────────────────────────────────────────────────── */}
      <Dialog open={isRunMrpModalOpen} onOpenChange={setIsRunMrpModalOpen}>
        <DialogContent className="bg-zinc-900 border-zinc-800 text-white sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Play className="w-5 h-5 text-emerald-400 fill-current" /> MRP Motorunu Çalıştır
            </DialogTitle>
            <DialogDescription className="text-zinc-400 text-xs">
              Çok seviyeli BOM patlatımı, emniyet stoku kontrolü ve lot büyüklüğü optimizasyonu yapılacaktır.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 text-xs">
            <div className="space-y-1.5">
              <Label>Bağlı MPS Planı</Label>
              <Select
                value={runMrpForm.mpsPlanId}
                onValueChange={(val) => setRunMrpForm({ ...runMrpForm, mpsPlanId: val })}
              >
                <SelectTrigger className="bg-zinc-800 border-zinc-700 text-xs">
                  <SelectValue placeholder="Doğrudan Siparişler (MPS'siz)" />
                </SelectTrigger>
                <SelectContent className="bg-zinc-900 border-zinc-800 text-white text-xs">
                  {mpsPlans.map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.code} - {p.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label>Çalıştırma Modu</Label>
              <Select
                value={runMrpForm.runType}
                onValueChange={(val) => setRunMrpForm({ ...runMrpForm, runType: val })}
              >
                <SelectTrigger className="bg-zinc-800 border-zinc-700 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-zinc-900 border-zinc-800 text-white text-xs">
                  <SelectItem value="FULL_REGENERATION">Tam Yenileme (Full Regeneration)</SelectItem>
                  <SelectItem value="NET_CHANGE">Net Değişim (Net Change)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="ghost"
                onClick={() => setIsRunMrpModalOpen(false)}
                className="text-xs"
              >
                Vazgeç
              </Button>
              <Button
                type="button"
                disabled={isRunningMrp}
                onClick={handleRunMrp}
                className="bg-emerald-600 hover:bg-emerald-500 text-xs font-semibold text-white"
              >
                {isRunningMrp ? (
                  <RefreshCw className="w-3.5 h-3.5 mr-1.5 animate-spin" />
                ) : (
                  <Play className="w-3.5 h-3.5 mr-1.5 fill-current" />
                )}
                Hesaplamayı Başlat
              </Button>
            </DialogFooter>
          </div>
        </DialogContent>
      </Dialog>

      {/* ─────────────────────────────────────────────────────────────
          MODAL: SENARYO KARŞILAŞTIRMA (WHAT-IF SCENARIO COMPARISON)
      ───────────────────────────────────────────────────────────── */}
      <Dialog open={isCompareModalOpen} onOpenChange={setIsCompareModalOpen}>
        <DialogContent className="bg-zinc-900 border-zinc-800 text-white sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>MPS Senaryoları Yan Yana Karşılaştırma</DialogTitle>
            <DialogDescription className="text-zinc-400 text-xs">
              Mevcut baz plan ile bir what-if senaryosunun üretim ve stok projeksiyonu farklarını inceleyin.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 text-xs">
            <div className="flex items-center gap-3">
              <span className="text-zinc-400">Hedef Senaryo:</span>
              <Select
                value={compareTargetPlanId}
                onValueChange={(val) => setCompareTargetPlanId(val)}
              >
                <SelectTrigger className="w-[280px] bg-zinc-800 border-zinc-700 text-xs">
                  <SelectValue placeholder="Karşılaştırılacak Senaryo Seçiniz" />
                </SelectTrigger>
                <SelectContent className="bg-zinc-900 border-zinc-800 text-white text-xs">
                  {mpsPlans
                    .filter((p) => p.id !== selectedPlanId)
                    .map((p) => (
                      <SelectItem key={p.id} value={p.id}>
                        {p.code} - {p.name}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
              <Button
                size="sm"
                onClick={handleCompareScenarios}
                disabled={loadingComparison || !compareTargetPlanId}
                className="bg-emerald-600 hover:bg-emerald-500 text-xs"
              >
                Karşılaştır
              </Button>
            </div>

            {comparisonResult && (
              <div className="space-y-4 mt-4">
                <div className="grid grid-cols-3 gap-3">
                  <div className="p-3 rounded-lg bg-zinc-800/40 border border-white/5">
                    <div className="text-[11px] text-zinc-400">Toplam Üretim Farkı</div>
                    <div
                      className={`text-lg font-bold mt-1 ${
                        comparisonResult.totals.productionDelta >= 0
                          ? "text-emerald-400"
                          : "text-red-400"
                      }`}
                    >
                      {comparisonResult.totals.productionDelta >= 0 ? "+" : ""}
                      {comparisonResult.totals.productionDelta} Adet
                    </div>
                  </div>
                  <div className="p-3 rounded-lg bg-zinc-800/40 border border-white/5">
                    <div className="text-[11px] text-zinc-400">Talep Farkı</div>
                    <div className="text-lg font-bold text-white mt-1">
                      {comparisonResult.totals.grossDelta >= 0 ? "+" : ""}
                      {comparisonResult.totals.grossDelta} Adet
                    </div>
                  </div>
                  <div className="p-3 rounded-lg bg-zinc-800/40 border border-white/5">
                    <div className="text-[11px] text-zinc-400">Stoksuzluk Periyotları</div>
                    <div className="text-lg font-bold text-amber-400 mt-1">
                      {comparisonResult.totals.scenarioStockoutPeriods} Dönem
                    </div>
                  </div>
                </div>

                <div className="max-h-64 overflow-y-auto border border-white/5 rounded-lg">
                  <Table className="text-xs">
                    <TableHeader className="bg-zinc-800/40">
                      <TableRow className="border-white/5">
                        <TableHead>Periyot</TableHead>
                        <TableHead>Baz Üretim</TableHead>
                        <TableHead>Senaryo Üretim</TableHead>
                        <TableHead>Üretim Farkı</TableHead>
                        <TableHead>Senaryo Stok</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody className="font-mono">
                      {comparisonResult.periodComparisons.map((row: any) => (
                        <TableRow key={row.periodIndex} className="border-white/5">
                          <TableCell className="font-bold">P{row.periodIndex + 1}</TableCell>
                          <TableCell className="text-zinc-400">{row.basePlannedProd}</TableCell>
                          <TableCell className="text-white font-semibold">
                            {row.scenarioPlannedProd}
                          </TableCell>
                          <TableCell
                            className={
                              row.plannedProdDelta >= 0 ? "text-emerald-400" : "text-red-400"
                            }
                          >
                            {row.plannedProdDelta >= 0 ? "+" : ""}
                            {row.plannedProdDelta}
                          </TableCell>
                          <TableCell
                            className={
                              row.scenarioStock < 0 ? "text-red-400 font-bold" : "text-zinc-300"
                            }
                          >
                            {row.scenarioStock}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* ─────────────────────────────────────────────────────────────
          DRAWER: MALZEME ZAMAN ÇİZELGESİ & PEGGING AĞACI
      ───────────────────────────────────────────────────────────── */}
      <Sheet open={isDrawerOpen} onOpenChange={setIsDrawerOpen}>
        <SheetContent className="bg-zinc-900 border-zinc-800 text-white w-full sm:max-w-xl overflow-y-auto">
          <SheetHeader>
            <SheetTitle className="text-base font-semibold">
              Malzeme Zaman Çizelgesi & Pegging İnceleyici
            </SheetTitle>
            <SheetDescription className="text-xs text-zinc-400">
              Bu malzemenin stok akışı ve ihtiyaçları tetikleyen müşteri siparişleri.
            </SheetDescription>
          </SheetHeader>

          {timePhasedData && (
            <div className="mt-6 space-y-6 text-xs">
              <div className="p-3.5 rounded-lg bg-zinc-800/40 border border-white/5 space-y-1.5">
                <div className="font-bold text-white text-sm">{timePhasedData.item.sku}</div>
                <div className="text-zinc-400">{timePhasedData.item.name}</div>
                <div className="flex gap-4 pt-1 text-zinc-300 font-mono">
                  <span>Mevcut Stok: <strong>{timePhasedData.item.currentOnHand}</strong></span>
                  <span>Emniyet Stoku: <strong>{timePhasedData.item.profile?.safetyStockQty || 0}</strong></span>
                </div>
              </div>

              {/* Pegging Ağacı */}
              <div className="space-y-2">
                <h4 className="font-semibold text-white text-xs flex items-center gap-1.5">
                  <Sliders className="w-3.5 h-3.5 text-emerald-400" />
                  Pegging (Nihai Talep Kaynağı Takibi)
                </h4>
                {timePhasedData.peggingTree?.length > 0 ? (
                  <div className="space-y-2">
                    {timePhasedData.peggingTree.map((peg: any, idx: number) => (
                      <div
                        key={idx}
                        className="p-3 rounded-lg bg-zinc-800/30 border border-white/5 space-y-1"
                      >
                        <div className="flex items-center justify-between font-mono">
                          <span className="font-semibold text-white">{peg.orderNumber}</span>
                          <span className="text-emerald-400">{peg.quantity} Adet</span>
                        </div>
                        <div className="text-[11px] text-zinc-400">
                          Teslim Tarihi: {new Date(peg.dueDate).toISOString().split("T")[0]}
                        </div>
                        {peg.sources && peg.sources.length > 0 && (
                          <div className="pl-3 mt-2 border-l border-emerald-500/30 space-y-1">
                            {peg.sources.map((s: any, sIdx: number) => (
                              <div key={sIdx} className="text-[11px] text-zinc-300 font-mono">
                                <span className="text-zinc-500">└─</span> Kaynak: {s.demandType} (
                                {s.demandRef}) {s.parentItemSku ? `Ebeveyn: ${s.parentItemSku}` : ""}
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-zinc-500 text-xs italic">
                    Bu malzeme için henüz pegging bağlantısı bulunmuyor.
                  </p>
                )}
              </div>
            </div>
          )}
        </SheetContent>
      </Sheet>
    </div>
  )
}
