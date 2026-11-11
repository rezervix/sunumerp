"use client"

import React, { useState, useEffect, useCallback, useMemo } from "react"
import { motion, AnimatePresence } from "framer-motion"
import {
  Calendar,
  Clock,
  Layers,
  AlertTriangle,
  CheckCircle2,
  Lock,
  Unlock,
  Play,
  TrendingUp,
  Cpu,
  BarChart3,
  Sliders,
  Sparkles,
  RefreshCw,
  Search,
  Filter,
  ArrowRight,
  ShieldAlert,
  ChevronRight,
  ChevronLeft,
  X,
  Target,
  Zap,
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

export function ProductionCapacityWorkspace() {
  const { user } = useAuth()
  const [activeTab, setActiveTab] = useState<"overview" | "gantt" | "ctp" | "variance" | "alerts">("overview")
  const [loading, setLoading] = useState(false)

  // Veri Durumları
  const [overviewData, setOverviewData] = useState<any>(null)
  const [ganttData, setGanttData] = useState<any>(null)
  const [varianceData, setVarianceData] = useState<any[]>([])

  // Çizelgeleme Hesaplama Modalı
  const [calculateModalOpen, setCalculateModalOpen] = useState(false)
  const [schedulingMode, setSchedulingMode] = useState<"FINITE" | "INFINITE">("FINITE")
  const [priorityRule, setPriorityRule] = useState<"EDD" | "FCFS" | "CR" | "PRIORITY">("EDD")
  const [overloadThreshold, setOverloadThreshold] = useState("95")

  // Görev Düzenleme / Yeniden Zamanlama Modalı
  const [selectedTaskForEdit, setSelectedTaskForEdit] = useState<any>(null)
  const [editStartDate, setEditStartDate] = useState("")
  const [editEndDate, setEditEndDate] = useState("")
  const [editWorkCenterId, setEditWorkCenterId] = useState("")
  const [editIsLocked, setEditIsLocked] = useState(false)

  // CTP Simülasyonu
  const [ctpItemId, setCtpItemId] = useState("")
  const [ctpQuantity, setCtpQuantity] = useState("50")
  const [ctpRequestedDate, setCtpRequestedDate] = useState("")
  const [ctpResult, setCtpResult] = useState<any>(null)
  const [ctpLoading, setCtpLoading] = useState(false)

  // Gantt Filtreleme
  const [ganttFilterWc, setGanttFilterWc] = useState("ALL")
  const [ganttSearchQuery, setGanttSearchQuery] = useState("")

  // Verileri Yükle
  const fetchData = useCallback(async () => {
    setLoading(true)
    try {
      const [overviewRes, ganttRes, varRes] = await Promise.all([
        fetch("/api/production/capacity?section=overview"),
        fetch("/api/production/capacity?section=gantt"),
        fetch("/api/production/capacity?section=variance"),
      ])

      const [overviewJson, ganttJson, varJson] = await Promise.all([
        overviewRes.json(),
        ganttRes.json(),
        varRes.json(),
      ])

      if (overviewJson.success) setOverviewData(overviewJson)
      if (ganttJson.success) setGanttData(ganttJson)
      if (varJson.success && varJson.variances) setVarianceData(varJson.variances)
    } catch (err: any) {
      toast.error("Kapasite verileri yüklenirken hata oluştu.")
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  // Kapasiteyi Hesapla & Çizelgele
  const handleCalculateCapacity = async () => {
    try {
      setLoading(true)
      const res = await fetch("/api/production/capacity", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "calculate_capacity",
          mode: schedulingMode,
          priorityRule,
          overloadThresholdPercent: Number(overloadThreshold),
        }),
      })

      const data = await res.json()
      if (data.success) {
        toast.success(
          `Kapasite planı başarıyla oluşturuldu (${data.plan?.code}). ${data.schedulingResult?.scheduledTasks?.length || 0} operasyon çizelgelendi.`
        )
        setCalculateModalOpen(false)
        fetchData()
      } else {
        toast.error(data.error || "Kapasite hesaplama başarısız.")
      }
    } catch (err: any) {
      toast.error("İşlem sırasında bağlantı hatası oluştu.")
    } finally {
      setLoading(false)
    }
  }

  // Görevi Yeniden Zamanla (Drag & Drop / Modal Submit)
  const handleSaveTaskSchedule = async () => {
    if (!selectedTaskForEdit || !editStartDate || !editEndDate) {
      toast.error("Lütfen başlangıç ve bitiş tarihlerini eksiksiz girin.")
      return
    }

    try {
      const res = await fetch("/api/production/capacity", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "update_task_schedule",
          taskId: selectedTaskForEdit.id,
          operationId: selectedTaskForEdit.operationId,
          newStartDate: new Date(editStartDate).toISOString(),
          newEndDate: new Date(editEndDate).toISOString(),
          workCenterId: editWorkCenterId || selectedTaskForEdit.workCenterId,
          isLocked: editIsLocked,
        }),
      })

      const data = await res.json()
      if (data.success) {
        toast.success("Operasyon çizelgesi başarıyla güncellendi.")
        setSelectedTaskForEdit(null)
        fetchData()
      } else {
        toast.error(data.error || "Güncelleme başarısız.")
      }
    } catch (err: any) {
      toast.error("Bağlantı hatası.")
    }
  }

  // Kilit Aç / Kapa
  const handleToggleLock = async (operationId: string, currentLock: boolean) => {
    try {
      const res = await fetch("/api/production/capacity", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "toggle_lock",
          operationId,
          isLocked: !currentLock,
        }),
      })
      const data = await res.json()
      if (data.success) {
        toast.success(!currentLock ? "Operasyon kilitlendi (yeniden planlamada korunur)." : "Operasyon kilidi kaldırıldı.")
        fetchData()
      } else {
        toast.error(data.error || "Kilit durumu değiştirilemedi.")
      }
    } catch (err: any) {
      toast.error("Bağlantı hatası.")
    }
  }

  // CTP Simülasyonu Çalıştır
  const handleRunCtp = async (e?: React.FormEvent) => {
    if (e) e.preventDefault()
    if (!ctpItemId) {
      toast.error("Lütfen bir mamul seçin veya girin.")
      return
    }

    setCtpLoading(true)
    try {
      const res = await fetch("/api/production/capacity", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "simulate_ctp",
          itemId: ctpItemId,
          quantity: Number(ctpQuantity),
          requestedDueDate: ctpRequestedDate || undefined,
        }),
      })

      const data = await res.json()
      if (data.success && data.ctp) {
        setCtpResult(data.ctp)
        toast.success(`CTP Simülasyonu Tamamlandı (${data.ctp.simulationNumber})`)
      } else {
        toast.error(data.error || "CTP simülasyonu çalıştırılamadı.")
      }
    } catch (err: any) {
      toast.error("Bağlantı hatası.")
    } finally {
      setCtpLoading(false)
    }
  }

  // Uyarı İnceleme
  const handleAcknowledgeAlert = async (alertId: string) => {
    try {
      const res = await fetch("/api/production/capacity", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "acknowledge_alert", alertId }),
      })
      const data = await res.json()
      if (data.success) {
        toast.success("Uyarı incelendi olarak işaretlendi.")
        fetchData()
      }
    } catch (err: any) {
      toast.error("Bağlantı hatası.")
    }
  }

  // Filtrelenmiş Gantt Görevleri
  const filteredGanttTasks = useMemo(() => {
    if (!ganttData?.tasks) return []
    return ganttData.tasks.filter((t: any) => {
      if (ganttFilterWc !== "ALL" && t.workCenterId !== ganttFilterWc) return false
      if (ganttSearchQuery.trim()) {
        const q = ganttSearchQuery.toLowerCase()
        const woNo = t.workOrder?.workOrderNumber?.toLowerCase() || ""
        const opName = t.operation?.name?.toLowerCase() || ""
        return woNo.includes(q) || opName.includes(q)
      }
      return true
    })
  }, [ganttData?.tasks, ganttFilterWc, ganttSearchQuery])

  return (
    <div className="space-y-6">
      {/* ── ÜST BAŞLIK VE EYLEMLER ── */}
      <div className="flex flex-wrap items-center justify-between gap-4 p-6 rounded-3xl bg-zinc-900/60 border border-white/10 backdrop-blur-md">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-amber-500/20 border border-amber-500/30 flex items-center justify-center text-amber-400">
            <Cpu className="w-6 h-6 animate-pulse" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl md:text-2xl font-bold tracking-tight text-white">
                Kapasite Planlama (CRP) & Çizelgeleme
              </h1>
              <span className="px-2.5 py-0.5 rounded-full text-xs font-mono font-semibold bg-amber-500/10 text-amber-400 border border-amber-500/20">
                FAZ 6
              </span>
            </div>
            <p className="text-sm text-zinc-400 mt-1">
              Sonlu/Sonsuz kapasite hesaplama, interaktif Gantt çizelgesi, darboğaz yönetimi ve CTP simülasyonu.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            size="sm"
            onClick={fetchData}
            disabled={loading}
            className="rounded-xl border-white/10 hover:bg-white/5 text-zinc-300"
          >
            <RefreshCw className={`w-4 h-4 mr-2 ${loading ? "animate-spin" : ""}`} />
            Yenile
          </Button>

          <Button
            onClick={() => setCalculateModalOpen(true)}
            className="rounded-xl bg-amber-500 hover:bg-amber-400 text-zinc-950 font-semibold shadow-lg shadow-amber-500/20"
          >
            <Sparkles className="w-4 h-4 mr-2" />
            Planı Çalıştır & Çizelgele
          </Button>
        </div>
      </div>

      {/* ── KPI ÖZET KARTLARI ── */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="p-4 rounded-2xl bg-zinc-900/40 border border-white/5 space-y-1">
          <div className="flex items-center justify-between text-xs text-zinc-400">
            <span>Aktif İş Merkezleri</span>
            <Cpu className="w-4 h-4 text-amber-400" />
          </div>
          <div className="text-2xl font-bold text-white">
            {overviewData?.totalWorkCentersCount || 0}
          </div>
          <p className="text-[11px] text-zinc-500">Mevcut tanımlı istasyonlar</p>
        </div>

        <div className="p-4 rounded-2xl bg-zinc-900/40 border border-white/5 space-y-1">
          <div className="flex items-center justify-between text-xs text-zinc-400">
            <span>Açık Operasyonlar</span>
            <Layers className="w-4 h-4 text-blue-400" />
          </div>
          <div className="text-2xl font-bold text-white">
            {overviewData?.totalOpenOperationsCount || 0}
          </div>
          <p className="text-[11px] text-zinc-500">Çizelgeye aday adımlar</p>
        </div>

        <div className="p-4 rounded-2xl bg-zinc-900/40 border border-white/5 space-y-1">
          <div className="flex items-center justify-between text-xs text-zinc-400">
            <span>Kilitli Görevler</span>
            <Lock className="w-4 h-4 text-purple-400" />
          </div>
          <div className="text-2xl font-bold text-purple-400">
            {overviewData?.lockedOperationsCount || 0}
          </div>
          <p className="text-[11px] text-zinc-500">Sabitlenmiş / korunanlar</p>
        </div>

        <div className="p-4 rounded-2xl bg-zinc-900/40 border border-white/5 space-y-1">
          <div className="flex items-center justify-between text-xs text-zinc-400">
            <span>Gecikme Riski</span>
            <AlertTriangle className="w-4 h-4 text-rose-400" />
          </div>
          <div className="text-2xl font-bold text-rose-400">
            {overviewData?.delayedCount || 0}
          </div>
          <p className="text-[11px] text-zinc-500">Termini aşan operasyonlar</p>
        </div>
      </div>

      {/* ── ÇAKIŞMA UYARI BİLDİRİMİ ── */}
      {ganttData?.hasConflicts && (
        <div className="p-4 rounded-2xl bg-rose-500/10 border border-rose-500/30 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <ShieldAlert className="w-6 h-6 text-rose-400 shrink-0" />
            <div>
              <h3 className="text-sm font-semibold text-rose-300">
                Kapasite Çakışması Tespit Edildi ({ganttData.conflicts.length} Adet)
              </h3>
              <p className="text-xs text-rose-400/80">
                Aynı iş merkezinde aynı anda iki operasyon planlanmış. Lütfen 'Sonlu (Finite)' modda yeniden çizelgeleyin veya sürükleyerek kaydırın.
              </p>
            </div>
          </div>
          <Button
            size="sm"
            onClick={() => setCalculateModalOpen(true)}
            className="rounded-xl bg-rose-500 hover:bg-rose-600 text-white text-xs shrink-0"
          >
            Otomatik Düzelt
          </Button>
        </div>
      )}

      {/* ── MODÜL SEKMELERİ ── */}
      <div className="flex items-center gap-2 border-b border-white/10 pb-2">
        <button
          onClick={() => setActiveTab("overview")}
          className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${
            activeTab === "overview"
              ? "bg-white/10 text-white border border-white/10"
              : "text-zinc-400 hover:text-white"
          }`}
        >
          <BarChart3 className="w-4 h-4 inline mr-2" />
          Kapasite & Yük Özeti
        </button>

        <button
          onClick={() => setActiveTab("gantt")}
          className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${
            activeTab === "gantt"
              ? "bg-white/10 text-white border border-white/10"
              : "text-zinc-400 hover:text-white"
          }`}
        >
          <Calendar className="w-4 h-4 inline mr-2" />
          Görsel Çizelgeleyici (Gantt)
        </button>

        <button
          onClick={() => setActiveTab("ctp")}
          className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${
            activeTab === "ctp"
              ? "bg-white/10 text-white border border-white/10"
              : "text-zinc-400 hover:text-white"
          }`}
        >
          <Target className="w-4 h-4 inline mr-2" />
          Söz Verilebilir Teslim (CTP)
        </button>

        <button
          onClick={() => setActiveTab("variance")}
          className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${
            activeTab === "variance"
              ? "bg-white/10 text-white border border-white/10"
              : "text-zinc-400 hover:text-white"
          }`}
        >
          <TrendingUp className="w-4 h-4 inline mr-2" />
          Süre Varyansı & Öğrenme
        </button>

        <button
          onClick={() => setActiveTab("alerts")}
          className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${
            activeTab === "alerts"
              ? "bg-white/10 text-white border border-white/10"
              : "text-zinc-400 hover:text-white"
          }`}
        >
          <AlertTriangle className="w-4 h-4 inline mr-2" />
          Darboğaz & Uyarılar ({overviewData?.recentAlerts?.length || 0})
        </button>
      </div>

      {/* ── TAB 1: OVERVIEW & CRP MATRIX ── */}
      {activeTab === "overview" && (
        <div className="space-y-6">
          <div className="p-6 rounded-3xl bg-zinc-900/40 border border-white/5 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-base font-semibold text-white">İş Merkezleri Kullanılabilirlik & Yük Dağılımı</h2>
                <p className="text-xs text-zinc-400">14 günlük ufukta iş merkezlerinin net kapasitesi ve planlanan operasyon yükü</p>
              </div>
              <span className="text-xs font-mono text-amber-400">
                Aktif Plan: {overviewData?.activePlan?.code || "Mevcut Değil"}
              </span>
            </div>

            <div className="overflow-x-auto">
              <Table>
                <TableHeader className="bg-zinc-900/80">
                  <TableRow className="border-white/5">
                    <TableHead className="text-zinc-400">İş Merkezi Kodu</TableHead>
                    <TableHead className="text-zinc-400">İstasyon Adı</TableHead>
                    <TableHead className="text-zinc-400">Günlük Net Mesai</TableHead>
                    <TableHead className="text-zinc-400">Verimlilik</TableHead>
                    <TableHead className="text-zinc-400">Çalışma Günleri</TableHead>
                    <TableHead className="text-zinc-400">Durum</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {(!overviewData?.workCenters || overviewData.workCenters.length === 0) ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-8 text-zinc-500">
                        Tanımlı aktif iş merkezi bulunmuyor.
                      </TableCell>
                    </TableRow>
                  ) : (
                    overviewData.workCenters.map((wc: any) => (
                      <TableRow key={wc.workCenterId} className="border-white/5 hover:bg-white/[0.02]">
                        <TableCell className="font-mono font-medium text-amber-400">{wc.code}</TableCell>
                        <TableCell className="font-semibold text-white">{wc.name}</TableCell>
                        <TableCell className="text-zinc-300 font-mono">
                          {Math.round(wc.dailyNetWorkingMinutes / 60)} Saat ({wc.dailyNetWorkingMinutes} dk)
                        </TableCell>
                        <TableCell className="text-zinc-300 font-mono">%{wc.efficiencyPercent}</TableCell>
                        <TableCell className="text-xs text-zinc-400 font-mono">
                          {wc.workingDays.join(", ")}
                        </TableCell>
                        <TableCell>
                          <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                            Aktif
                          </span>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </div>
        </div>
      )}

      {/* ── TAB 2: GÖRSEL ÇİZELGELEYİCİ (GANTT) ── */}
      {activeTab === "gantt" && (
        <div className="space-y-6">
          {/* Gantt Filtre Çubuğu */}
          <div className="flex flex-wrap items-center justify-between gap-4 p-4 rounded-2xl bg-zinc-900/50 border border-white/5">
            <div className="flex items-center gap-3">
              <div className="relative">
                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" />
                <Input
                  value={ganttSearchQuery}
                  onChange={(e) => setGanttSearchQuery(e.target.value)}
                  placeholder="İş Emri veya Operasyon Ara..."
                  className="pl-9 h-10 w-64 bg-zinc-900 border-white/10 text-sm"
                />
              </div>

              <Select value={ganttFilterWc} onValueChange={setGanttFilterWc}>
                <SelectTrigger className="w-56 h-10 bg-zinc-900 border-white/10 text-sm">
                  <SelectValue placeholder="İş Merkezi Filtresi" />
                </SelectTrigger>
                <SelectContent className="bg-zinc-900 border-white/10 text-white">
                  <SelectItem value="ALL">Tüm İstasyonlar</SelectItem>
                  {(ganttData?.workCenters || []).map((w: any) => (
                    <SelectItem key={w.workCenterId} value={w.workCenterId}>
                      {w.code} - {w.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center gap-4 text-xs">
              <span className="flex items-center gap-1.5 text-zinc-400">
                <span className="w-3 h-3 rounded bg-blue-500 inline-block" /> Planlandı
              </span>
              <span className="flex items-center gap-1.5 text-zinc-400">
                <span className="w-3 h-3 rounded bg-emerald-500 inline-block" /> İcrada
              </span>
              <span className="flex items-center gap-1.5 text-zinc-400">
                <span className="w-3 h-3 rounded bg-purple-500 inline-block" /> Kilitli
              </span>
              <span className="flex items-center gap-1.5 text-zinc-400">
                <span className="w-3 h-3 rounded bg-rose-500 inline-block" /> Gecikmeli
              </span>
            </div>
          </div>

          {/* Gantt Kulvarları (Swimlanes) */}
          <div className="space-y-4">
            {(ganttData?.workCenters || [])
              .filter((wc: any) => ganttFilterWc === "ALL" || wc.workCenterId === ganttFilterWc)
              .map((wc: any) => {
                const wcTasks = filteredGanttTasks.filter((t: any) => t.workCenterId === wc.workCenterId)

                return (
                  <div
                    key={wc.workCenterId}
                    className="p-5 rounded-2xl bg-zinc-900/60 border border-white/10 space-y-3"
                  >
                    <div className="flex items-center justify-between border-b border-white/5 pb-2">
                      <div className="flex items-center gap-3">
                        <span className="px-2.5 py-1 rounded-lg bg-amber-500/10 text-amber-400 font-mono text-xs font-bold border border-amber-500/20">
                          {wc.code}
                        </span>
                        <h3 className="text-sm font-semibold text-white">{wc.name}</h3>
                      </div>
                      <span className="text-xs text-zinc-400">
                        {wcTasks.length} Atanmış Operasyon
                      </span>
                    </div>

                    {/* Görev Çubukları */}
                    {wcTasks.length === 0 ? (
                      <p className="text-xs text-zinc-600 py-3">Bu istasyonda çizelgelenmiş operasyon bulunmuyor.</p>
                    ) : (
                      <div className="flex flex-wrap gap-2 pt-1">
                        {wcTasks.map((task: any) => {
                          const isDelayed = task.isDelayed
                          const isLocked = task.isLocked

                          return (
                            <motion.div
                              key={task.id}
                              whileHover={{ scale: 1.02 }}
                              onClick={() => {
                                setSelectedTaskForEdit(task)
                                setEditStartDate(new Date(task.scheduledStart).toISOString().slice(0, 16))
                                setEditEndDate(new Date(task.scheduledEnd).toISOString().slice(0, 16))
                                setEditWorkCenterId(task.workCenterId)
                                setEditIsLocked(task.isLocked)
                              }}
                              className={`p-3 rounded-xl border text-xs cursor-pointer transition-all ${
                                isDelayed
                                  ? "bg-rose-950/40 border-rose-500/50 text-rose-200"
                                  : isLocked
                                  ? "bg-purple-950/40 border-purple-500/50 text-purple-200"
                                  : "bg-blue-950/30 border-blue-500/40 text-blue-200"
                              }`}
                            >
                              <div className="flex items-center justify-between gap-2 font-mono font-bold mb-1">
                                <span>{task.workOrder?.workOrderNumber || "İş Emri"}</span>
                                {isLocked && <Lock className="w-3 h-3 text-purple-400" />}
                              </div>
                              <p className="text-white font-medium truncate max-w-[180px]">
                                #{task.operation?.operationNumber} {task.operation?.name}
                              </p>
                              <div className="text-[10px] text-zinc-400 mt-1 flex items-center justify-between gap-2 font-mono">
                                <span>{new Date(task.scheduledStart).toLocaleDateString("tr-TR")}</span>
                                <span>{task.totalMinutes} dk</span>
                              </div>
                            </motion.div>
                          )
                        })}
                      </div>
                    )}
                  </div>
                )
              })}
          </div>
        </div>
      )}

      {/* ── TAB 3: SÖZ VERİLEBİLİR TESLİM TARİHİ (CTP) ── */}
      {activeTab === "ctp" && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="p-6 rounded-3xl bg-zinc-900/60 border border-white/10 space-y-4">
            <div className="flex items-center gap-3 mb-2">
              <Target className="w-5 h-5 text-amber-400" />
              <h2 className="text-base font-semibold text-white">CTP Simülasyon Talebi</h2>
            </div>
            <p className="text-xs text-zinc-400">
              Yeni sipariş için makine kuyrukları ve mevcut işler incelenerek en erken teslim tarihi hesaplanır.
            </p>

            <form onSubmit={handleRunCtp} className="space-y-4">
              <div>
                <Label className="text-xs text-zinc-300">Mamul Kimliği / Kodu *</Label>
                <Input
                  value={ctpItemId}
                  onChange={(e) => setCtpItemId(e.target.value)}
                  placeholder="Mamul ID veya SKU..."
                  className="h-10 bg-zinc-900 border-white/10 text-sm mt-1"
                />
              </div>

              <div>
                <Label className="text-xs text-zinc-300">Sipariş Miktarı (Adet) *</Label>
                <Input
                  type="number"
                  value={ctpQuantity}
                  onChange={(e) => setCtpQuantity(e.target.value)}
                  className="h-10 bg-zinc-900 border-white/10 text-sm mt-1 font-mono"
                />
              </div>

              <div>
                <Label className="text-xs text-zinc-300">Müşterinin İstediği Termin (Opsiyonel)</Label>
                <Input
                  type="date"
                  value={ctpRequestedDate}
                  onChange={(e) => setCtpRequestedDate(e.target.value)}
                  className="h-10 bg-zinc-900 border-white/10 text-sm mt-1"
                />
              </div>

              <Button
                type="submit"
                disabled={ctpLoading}
                className="w-full h-11 bg-amber-500 hover:bg-amber-400 text-zinc-950 font-semibold rounded-xl"
              >
                {ctpLoading ? (
                  <RefreshCw className="w-4 h-4 animate-spin mr-2" />
                ) : (
                  <Zap className="w-4 h-4 mr-2" />
                )}
                Söz Verilebilir Tarih Hesapla
              </Button>
            </form>
          </div>

          <div className="lg:col-span-2 p-6 rounded-3xl bg-zinc-900/60 border border-white/10 space-y-4">
            <h2 className="text-base font-semibold text-white flex items-center gap-2">
              <Calendar className="w-5 h-5 text-amber-400" />
              Simülasyon Sonucu ve Çizelge Önerisi
            </h2>

            {!ctpResult ? (
              <div className="p-12 text-center rounded-2xl bg-zinc-900/30 border border-white/5 text-zinc-500">
                Henüz bir CTP simülasyonu çalıştırılmadı. Soldaki formdan hesaplama yapabilirsiniz.
              </div>
            ) : (
              <div className="space-y-4">
                <div
                  className={`p-4 rounded-2xl border flex items-center justify-between ${
                    ctpResult.isFeasible
                      ? "bg-emerald-950/20 border-emerald-500/30 text-emerald-300"
                      : "bg-rose-950/20 border-rose-500/30 text-rose-300"
                  }`}
                >
                  <div>
                    <span className="text-xs uppercase tracking-wider font-semibold">
                      {ctpResult.isFeasible ? "UYGULANABİLİR (FEASIBLE)" : "TERMİN RİSKİ (INFEASIBLE)"}
                    </span>
                    <h3 className="text-lg font-bold text-white mt-1">
                      En Erken Teslim Tarihi:{" "}
                      {new Date(ctpResult.calculatedEarliestDueDate).toLocaleString("tr-TR")}
                    </h3>
                  </div>
                  <div className="text-right">
                    <span className="text-xs text-zinc-400 block">Kritik Yol Süresi</span>
                    <span className="font-mono text-xl font-bold text-white">
                      {ctpResult.criticalPathDays} Gün
                    </span>
                  </div>
                </div>

                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader className="bg-zinc-900/80">
                      <TableRow className="border-white/5">
                        <TableHead className="text-zinc-400">Adım</TableHead>
                        <TableHead className="text-zinc-400">Operasyon</TableHead>
                        <TableHead className="text-zinc-400">Başlangıç</TableHead>
                        <TableHead className="text-zinc-400">Bitiş</TableHead>
                        <TableHead className="text-zinc-400">Süre</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {ctpResult.schedule.map((step: any, idx: number) => (
                        <TableRow key={idx} className="border-white/5 font-mono text-xs">
                          <TableCell className="text-amber-400">#{step.operationNumber}</TableCell>
                          <TableCell className="text-white font-sans">{step.operationName}</TableCell>
                          <TableCell className="text-zinc-300">
                            {new Date(step.start).toLocaleDateString("tr-TR")}
                          </TableCell>
                          <TableCell className="text-zinc-300">
                            {new Date(step.end).toLocaleDateString("tr-TR")}
                          </TableCell>
                          <TableCell className="text-zinc-300">{step.durationMinutes} dk</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── TAB 4: SÜRE VARYANSI & STANDART ÖNERİSİ ── */}
      {activeTab === "variance" && (
        <div className="p-6 rounded-3xl bg-zinc-900/60 border border-white/10 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-base font-semibold text-white">Planlanan vs. Gerçekleşen Çevrim Süreleri</h2>
              <p className="text-xs text-zinc-400">
                Atölye icra verilerine dayalı öğrenme eğrisi analizi ve rota standart süre güncelleme önerileri.
              </p>
            </div>
          </div>

          <div className="overflow-x-auto">
            <Table>
              <TableHeader className="bg-zinc-900/80">
                <TableRow className="border-white/5">
                  <TableHead className="text-zinc-400">Operasyon Adı</TableHead>
                  <TableHead className="text-zinc-400">Örnek Sayısı</TableHead>
                  <TableHead className="text-zinc-400">Planlanan Standart</TableHead>
                  <TableHead className="text-zinc-400">Gerçekleşen Ortalama</TableHead>
                  <TableHead className="text-zinc-400">Sapma (Varyans)</TableHead>
                  <TableHead className="text-zinc-400">Önerilen Standart</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {varianceData.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8 text-zinc-500">
                      Henüz tamamlanmış operasyon verisi bulunmuyor.
                    </TableCell>
                  </TableRow>
                ) : (
                  varianceData.map((v: any, idx: number) => {
                    const isPositive = v.variancePercent > 0
                    return (
                      <TableRow key={idx} className="border-white/5 hover:bg-white/[0.02] text-xs font-mono">
                        <TableCell className="font-semibold text-white font-sans">{v.operationName}</TableCell>
                        <TableCell className="text-zinc-400">{v.sampleCount} İcra</TableCell>
                        <TableCell className="text-zinc-300">{v.plannedStandardMinutes} dk</TableCell>
                        <TableCell className="text-zinc-300 font-bold">{v.actualAverageMinutes} dk</TableCell>
                        <TableCell>
                          <span
                            className={`px-2 py-0.5 rounded ${
                              isPositive ? "bg-rose-500/10 text-rose-400" : "bg-emerald-500/10 text-emerald-400"
                            }`}
                          >
                            {isPositive ? "+" : ""}
                            {v.variancePercent}%
                          </span>
                        </TableCell>
                        <TableCell className="text-amber-400 font-bold">
                          {v.suggestedStandardMinutes} dk
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

      {/* ── TAB 5: DARBOĞAZ & UYARILAR ── */}
      {activeTab === "alerts" && (
        <div className="p-6 rounded-3xl bg-zinc-900/60 border border-white/10 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-semibold text-white">Aktif Kapasite ve Aşırı Yük Uyarıları</h2>
            <span className="text-xs text-zinc-500">Eşik Aşımı (≥ %95) ve Darboğazlar</span>
          </div>

          <div className="space-y-3">
            {(!overviewData?.recentAlerts || overviewData.recentAlerts.length === 0) ? (
              <div className="p-12 text-center rounded-2xl bg-zinc-900/30 border border-white/5 text-zinc-500">
                <CheckCircle2 className="w-10 h-10 text-emerald-500 mx-auto mb-2" />
                Aktif bir kapasite aşımı veya darboğaz uyarısı bulunmuyor.
              </div>
            ) : (
              overviewData.recentAlerts.map((alert: any) => (
                <div
                  key={alert.id}
                  className="p-4 rounded-2xl bg-zinc-900/80 border border-white/10 flex items-center justify-between gap-4"
                >
                  <div className="flex items-center gap-3">
                    <AlertTriangle
                      className={`w-5 h-5 shrink-0 ${
                        alert.severity === "CRITICAL" ? "text-rose-400" : "text-amber-400"
                      }`}
                    />
                    <div>
                      <p className="text-sm text-white font-medium">{alert.message}</p>
                      <span className="text-[10px] text-zinc-500 font-mono">
                        {new Date(alert.createdAt).toLocaleString("tr-TR")} | Tür: {alert.alertType}
                      </span>
                    </div>
                  </div>

                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleAcknowledgeAlert(alert.id)}
                    className="rounded-xl border-white/10 text-xs shrink-0"
                  >
                    İncelendi
                  </Button>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* ── HESAPLAMA MODALI ── */}
      <Dialog open={calculateModalOpen} onOpenChange={setCalculateModalOpen}>
        <DialogContent className="sm:max-w-md bg-zinc-900 border-white/10 text-white rounded-3xl">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold">Kapasite Çizelgeleme Motorunu Çalıştır</DialogTitle>
            <DialogDescription className="text-xs text-zinc-400">
              Açık iş emirleri seçilen öncelik ve kısıt kurallarına göre sıralanır.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div>
              <Label className="text-xs text-zinc-300">Kapasite Modu *</Label>
              <Select value={schedulingMode} onValueChange={(v: any) => setSchedulingMode(v)}>
                <SelectTrigger className="h-10 bg-zinc-950 border-white/10 mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-zinc-900 border-white/10 text-white">
                  <SelectItem value="FINITE">Sonlu Kapasite (Finite - Makine Çakışması Yok)</SelectItem>
                  <SelectItem value="INFINITE">Sonsuz Kapasite (Infinite - Yük Görüntüleme)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label className="text-xs text-zinc-300">Öncelik Kuralı (Dispatching Rule) *</Label>
              <Select value={priorityRule} onValueChange={(v: any) => setPriorityRule(v)}>
                <SelectTrigger className="h-10 bg-zinc-950 border-white/10 mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-zinc-900 border-white/10 text-white">
                  <SelectItem value="EDD">En Erken Teslim Tarihi (Earliest Due Date - EDD)</SelectItem>
                  <SelectItem value="FCFS">İlk Gelen İlk Yapılır (FCFS)</SelectItem>
                  <SelectItem value="CR">Kritik Oran (Critical Ratio - CR)</SelectItem>
                  <SelectItem value="PRIORITY">İş Emri Öncelik Seviyesi (URGENT/HIGH/NORMAL)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label className="text-xs text-zinc-300">Aşırı Yük Eşik Değeri (%)</Label>
              <Input
                type="number"
                value={overloadThreshold}
                onChange={(e) => setOverloadThreshold(e.target.value)}
                className="h-10 bg-zinc-950 border-white/10 mt-1 font-mono"
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setCalculateModalOpen(false)}
              className="rounded-xl border-white/10"
            >
              Vazgeç
            </Button>
            <Button
              onClick={handleCalculateCapacity}
              disabled={loading}
              className="rounded-xl bg-amber-500 hover:bg-amber-400 text-zinc-950 font-semibold"
            >
              {loading ? <RefreshCw className="w-4 h-4 animate-spin mr-2" /> : null}
              Hesapla & Uygula
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── GÖREV DÜZENLEME & YENİDEN ZAMANLAMA MODALI ── */}
      <Dialog open={Boolean(selectedTaskForEdit)} onOpenChange={() => setSelectedTaskForEdit(null)}>
        <DialogContent className="sm:max-w-lg bg-zinc-900 border-white/10 text-white rounded-3xl">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold">
              Operasyon Çizelgesini Düzenle (#{selectedTaskForEdit?.operation?.operationNumber})
            </DialogTitle>
            <DialogDescription className="text-xs text-zinc-400">
              {selectedTaskForEdit?.workOrder?.workOrderNumber} - {selectedTaskForEdit?.operation?.name}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div>
              <Label className="text-xs text-zinc-300">Başlangıç Zamanı</Label>
              <Input
                type="datetime-local"
                value={editStartDate}
                onChange={(e) => setEditStartDate(e.target.value)}
                className="h-10 bg-zinc-950 border-white/10 mt-1"
              />
            </div>

            <div>
              <Label className="text-xs text-zinc-300">Bitiş Zamanı</Label>
              <Input
                type="datetime-local"
                value={editEndDate}
                onChange={(e) => setEditEndDate(e.target.value)}
                className="h-10 bg-zinc-950 border-white/10 mt-1"
              />
            </div>

            <div>
              <Label className="text-xs text-zinc-300">Atanan İş Merkezi</Label>
              <Select value={editWorkCenterId} onValueChange={setEditWorkCenterId}>
                <SelectTrigger className="h-10 bg-zinc-950 border-white/10 mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-zinc-900 border-white/10 text-white">
                  {(ganttData?.workCenters || []).map((w: any) => (
                    <SelectItem key={w.workCenterId} value={w.workCenterId}>
                      {w.code} - {w.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center gap-3 pt-2">
              <input
                type="checkbox"
                id="editLock"
                checked={editIsLocked}
                onChange={(e) => setEditIsLocked(e.target.checked)}
                className="w-4 h-4 rounded bg-zinc-950 border-white/20 text-amber-500 focus:ring-amber-500"
              />
              <Label htmlFor="editLock" className="text-xs text-zinc-300 cursor-pointer">
                Bu operasyonu kilitle (Yeniden otomatik planlamada yeri sabit kalır)
              </Label>
            </div>
          </div>

          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              onClick={() => setSelectedTaskForEdit(null)}
              className="rounded-xl border-white/10"
            >
              Vazgeç
            </Button>
            <Button
              onClick={handleSaveTaskSchedule}
              className="rounded-xl bg-amber-500 hover:bg-amber-400 text-zinc-950 font-semibold"
            >
              Zamanlamayı Kaydet
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

