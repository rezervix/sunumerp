"use client"

import React, { useState, useEffect, useCallback, useMemo } from "react"
import { motion, AnimatePresence } from "framer-motion"
import {
  ShieldCheck,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  FileCheck2,
  ClipboardList,
  Wrench,
  Gauge,
  Search,
  Filter,
  RefreshCw,
  Plus,
  ArrowRight,
  TrendingUp,
  BarChart2,
  AlertOctagon,
  Eye,
  Sliders,
  Calendar,
  Layers,
  Sparkles,
  ChevronRight,
  RotateCcw,
  Truck,
  Package,
  Clock,
  Printer,
  X,
  FileWarning,
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

export function ProductionQualityWorkspace() {
  const { user } = useAuth()
  const [activeTab, setActiveTab] = useState<
    "inspections" | "plans" | "ncrs" | "calibrations" | "traceability" | "reports"
  >("inspections")

  const [loading, setLoading] = useState(false)
  const [stats, setStats] = useState<any>(null)

  // Data states
  const [inspections, setInspections] = useState<any[]>([])
  const [plans, setPlans] = useState<any[]>([])
  const [ncrs, setNcrs] = useState<any[]>([])
  const [calibrations, setCalibrations] = useState<any[]>([])
  const [paretoData, setParetoData] = useState<any[]>([])
  const [supplierRatings, setSupplierRatings] = useState<any[]>([])
  const [spcData, setSpcData] = useState<any>(null)

  // Filters
  const [searchQuery, setSearchQuery] = useState("")
  const [filterType, setFilterType] = useState("ALL")
  const [filterStatus, setFilterStatus] = useState("ALL")

  // Modals
  const [isNewInspectionModalOpen, setIsNewInspectionModalOpen] = useState(false)
  const [isNewPlanModalOpen, setIsNewPlanModalOpen] = useState(false)
  const [isNewNcrModalOpen, setIsNewNcrModalOpen] = useState(false)
  const [isNewCalibrationModalOpen, setIsNewCalibrationModalOpen] = useState(false)
  const [isNcrTransitionModalOpen, setIsNcrTransitionModalOpen] = useState(false)
  const [selectedNcr, setSelectedNcr] = useState<any>(null)

  // Traceability & Recall state
  const [traceLotNumber, setTraceLotNumber] = useState("")
  const [traceResult, setTraceResult] = useState<any>(null)
  const [traceMode, setTraceMode] = useState<"FORWARD" | "BACKWARD" | "RECALL">("FORWARD")

  // Forms
  const [inspectionForm, setInspectionForm] = useState({
    inspectionType: "RECEIVING" as "RECEIVING" | "IN_PROCESS" | "FINAL",
    itemId: "",
    lotNumber: "",
    batchQuantity: 100,
    planId: "",
    supplierName: "",
    measurements: [
      {
        characteristicName: "Dış Çap (mm)",
        characteristicType: "VARIABLE" as const,
        nominalValue: 50,
        minTolerance: -0.05,
        maxTolerance: 0.05,
        measuredValue: 50.02,
        calibrationDeviceId: "",
        isCritical: false,
      },
      {
        characteristicName: "Görsel Yüzey Kusuru",
        characteristicType: "ATTRIBUTE" as const,
        isAttributePassed: true,
        isCritical: true,
      },
    ],
  })

  const [ncrTransitionForm, setNcrTransitionForm] = useState({
    targetStatus: "" as any,
    rootCauseDescription: "",
    correctiveAction: "",
    effectivenessResult: "EFFECTIVE" as const,
    effectivenessNotes: "",
  })

  // ─────────────────────────────────────────────────────────────
  // Veri Yükleme
  // ─────────────────────────────────────────────────────────────
  const loadData = useCallback(async () => {
    setLoading(true)
    try {
      const [overviewRes, inspRes, plansRes, ncrRes, calRes, paretoRes, supRes] =
        await Promise.all([
          fetch("/api/production/quality?view=overview"),
          fetch("/api/production/quality?view=inspections"),
          fetch("/api/production/quality?view=plans"),
          fetch("/api/production/quality?view=ncrs"),
          fetch("/api/production/quality?view=calibrations"),
          fetch("/api/production/quality?view=pareto"),
          fetch("/api/production/quality?view=supplier_ratings"),
        ])

      const [overviewData, inspData, plansData, ncrData, calData, paretoD, supD] =
        await Promise.all([
          overviewRes.json(),
          inspRes.json(),
          plansRes.json(),
          ncrRes.json(),
          calRes.json(),
          paretoRes.json(),
          supRes.json(),
        ])

      if (overviewData.success) setStats(overviewData.stats)
      if (inspData.success) setInspections(inspData.data || [])
      if (plansData.success) setPlans(plansData.data || [])
      if (ncrData.success) setNcrs(ncrData.data || [])
      if (calData.success) setCalibrations(calData.data || [])
      if (paretoD.success) setParetoData(paretoD.data || [])
      if (supD.success) setSupplierRatings(supD.data || [])
    } catch (err: any) {
      toast.error("Veriler yüklenirken hata oluştu: " + err.message)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadData()
  }, [loadData])

  // ─────────────────────────────────────────────────────────────
  // Yeni Muayene Kaydı Gönderimi
  // ─────────────────────────────────────────────────────────────
  const handleCreateInspection = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!inspectionForm.itemId || !inspectionForm.batchQuantity) {
      toast.error("Lütfen malzeme ve parti miktarını doldurunuz.")
      return
    }

    try {
      const res = await fetch("/api/production/quality", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "record_inspection",
          inspection: inspectionForm,
        }),
      })
      const result = await res.json()

      if (!result.success) {
        throw new Error(result.error || "Muayene kaydedilemedi")
      }

      if (result.data?.status === "REJECTED") {
        toast.warning(
          `Muayene RET edildi! Stok blokajı uygulandı ve karantinaya alındı (INS: ${result.data?.inspectionNumber})`
        )
      } else {
        toast.success(`Muayene başarıyla kaydedildi: ${result.data?.inspectionNumber} (${result.data?.status})`)
      }

      setIsNewInspectionModalOpen(false)
      loadData()
    } catch (err: any) {
      toast.error(err.message)
    }
  }

  // ─────────────────────────────────────────────────────────────
  // NCR Durum Güncellemesi
  // ─────────────────────────────────────────────────────────────
  const handleUpdateNcrStatus = async () => {
    if (!selectedNcr || !ncrTransitionForm.targetStatus) return

    try {
      const res = await fetch("/api/production/quality", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "update_ncr_status",
          id: selectedNcr.id,
          targetStatus: ncrTransitionForm.targetStatus,
          updatePayload: ncrTransitionForm,
        }),
      })
      const result = await res.json()

      if (!result.success) {
        throw new Error(result.error || "NCR durumu güncellenemedi")
      }

      toast.success(`NCR durumu '${ncrTransitionForm.targetStatus}' olarak güncellendi.`)
      setIsNcrTransitionModalOpen(false)
      loadData()
    } catch (err: any) {
      toast.error(err.message)
    }
  }

  // ─────────────────────────────────────────────────────────────
  // İzlenebilirlik & Geri Çağırma Araması
  // ─────────────────────────────────────────────────────────────
  const handleRunTraceability = async (mode: "FORWARD" | "BACKWARD" | "RECALL") => {
    if (!traceLotNumber.trim()) {
      toast.error("Lütfen bir parti (Lot) numarası giriniz.")
      return
    }

    setLoading(true)
    setTraceMode(mode)
    try {
      let endpoint = ""
      if (mode === "FORWARD") {
        endpoint = `/api/production/quality?view=trace_forward&lotNumber=${encodeURIComponent(traceLotNumber.trim())}`
      } else if (mode === "BACKWARD") {
        endpoint = `/api/production/quality?view=trace_backward&lotNumber=${encodeURIComponent(traceLotNumber.trim())}`
      } else {
        endpoint = `/api/production/quality?view=recall_simulation&lotNumber=${encodeURIComponent(traceLotNumber.trim())}`
      }

      const res = await fetch(endpoint)
      const json = await res.json()
      if (!json.success) {
        throw new Error(json.error || "İzleme verisi alınamadı")
      }

      setTraceResult(json.data)
      toast.success(`${mode === "FORWARD" ? "İleri" : mode === "BACKWARD" ? "Geri" : "Geri Çağırma"} analizi tamamlandı.`)
    } catch (err: any) {
      toast.error(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-6">
      {/* ── Üst Başlık & Eylemler ── */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-4 border-b border-border/40">
        <div>
          <div className="flex items-center gap-2">
            <ShieldCheck className="h-6 w-6 text-emerald-500" />
            <h1 className="text-2xl font-bold tracking-tight text-foreground">
              Kalite Kontrol, Muayene & Uygunsuzluk (NCR)
            </h1>
          </div>
          <p className="text-sm text-muted-foreground mt-1">
            Girdi/proses/final muayeneleri, AQL tolerans değerlendirmesi, stok blokajı, DÖF/CAPA yaşam döngüsü ve iki yönlü parti izlenebilirliği.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={loadData}
            disabled={loading}
            className="h-9 gap-1.5"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
            Yenile
          </Button>

          <Button
            size="sm"
            onClick={() => setIsNewInspectionModalOpen(true)}
            className="h-9 gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white"
          >
            <Plus className="h-4 w-4" />
            Yeni Muayene Kaydı
          </Button>
        </div>
      </div>

      {/* ── KPI Metrik Kartları ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-4 rounded-xl border border-border/50 bg-card/60 backdrop-blur-sm shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-medium text-muted-foreground">Kabul Oranı (Geçiş)</p>
            <h3 className="text-2xl font-bold text-foreground mt-1">
              %{stats?.passRate ?? 100}
            </h3>
            <p className="text-xs text-muted-foreground mt-1">
              {stats?.passedCount ?? 0} kabul / {stats?.totalInspections ?? 0} muayene
            </p>
          </div>
          <div className="h-10 w-10 rounded-lg bg-emerald-500/10 flex items-center justify-center text-emerald-500">
            <CheckCircle2 className="h-5 w-5" />
          </div>
        </div>

        <div className="p-4 rounded-xl border border-border/50 bg-card/60 backdrop-blur-sm shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-medium text-muted-foreground">Ret & Blokaj Sayısı</p>
            <h3 className="text-2xl font-bold text-rose-500 mt-1">
              {stats?.rejectedCount ?? 0}
            </h3>
            <p className="text-xs text-rose-400 mt-1">Karantinaya alınan partiler</p>
          </div>
          <div className="h-10 w-10 rounded-lg bg-rose-500/10 flex items-center justify-center text-rose-500">
            <XCircle className="h-5 w-5" />
          </div>
        </div>

        <div className="p-4 rounded-xl border border-border/50 bg-card/60 backdrop-blur-sm shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-medium text-muted-foreground">Aktif NCR / DÖF</p>
            <h3 className="text-2xl font-bold text-amber-500 mt-1">
              {stats?.activeNcrs ?? 0}
            </h3>
            <p className="text-xs text-amber-400 mt-1">
              {stats?.criticalNcrs ?? 0} kritik uygunsuzluk
            </p>
          </div>
          <div className="h-10 w-10 rounded-lg bg-amber-500/10 flex items-center justify-center text-amber-500">
            <AlertTriangle className="h-5 w-5" />
          </div>
        </div>

        <div className="p-4 rounded-xl border border-border/50 bg-card/60 backdrop-blur-sm shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-medium text-muted-foreground">Kalibrasyon Durumu</p>
            <h3 className="text-2xl font-bold text-foreground mt-1">
              {stats?.expiredDevicesCount ?? 0 > 0 ? (
                <span className="text-rose-500">{stats?.expiredDevicesCount} Geçmiş</span>
              ) : (
                <span className="text-emerald-500">Aktif</span>
              )}
            </h3>
            <p className="text-xs text-muted-foreground mt-1">
              {stats?.expiringSoonDevicesCount ?? 0} yaklaşan cihaz
            </p>
          </div>
          <div className="h-10 w-10 rounded-lg bg-blue-500/10 flex items-center justify-center text-blue-500">
            <Gauge className="h-5 w-5" />
          </div>
        </div>
      </div>

      {/* ── Sekme Butonları ── */}
      <div className="flex border-b border-border/40 gap-1 overflow-x-auto pb-px">
        {[
          { id: "inspections", label: "Muayene Kayıtları", icon: FileCheck2 },
          { id: "plans", label: "Kalite Planları", icon: ClipboardList },
          { id: "ncrs", label: "Uygunsuzluk & DÖF (NCR)", icon: AlertOctagon },
          { id: "calibrations", label: "Cihaz Kalibrasyonu", icon: Gauge },
          { id: "traceability", label: "İzlenebilirlik & Geri Çağırma", icon: Layers },
          { id: "reports", label: "Pareto & SPC Raporları", icon: BarChart2 },
        ].map((tab) => {
          const Icon = tab.icon
          const isActive = activeTab === tab.id
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 whitespace-nowrap transition-colors ${
                isActive
                  ? "border-emerald-500 text-emerald-500 font-semibold"
                  : "border-transparent text-muted-foreground hover:text-foreground hover:border-muted-foreground/30"
              }`}
            >
              <Icon className="h-4 w-4" />
              {tab.label}
            </button>
          )
        })}
      </div>

      {/* ── SEKME 1: MUAYENE KAYITLARI ── */}
      {activeTab === "inspections" && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="relative w-full sm:w-72">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Muayene No, Lot, Malzeme ara..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 h-9"
              />
            </div>
          </div>

          <div className="rounded-xl border border-border/50 bg-card overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/40">
                  <TableHead>Muayene No</TableHead>
                  <TableHead>Nokta / Tip</TableHead>
                  <TableHead>Malzeme</TableHead>
                  <TableHead>Lot / Seri No</TableHead>
                  <TableHead>Parti / Numune</TableHead>
                  <TableHead>Hata Sayısı</TableHead>
                  <TableHead>Sonuç / Karar</TableHead>
                  <TableHead>Stok Blokajı</TableHead>
                  <TableHead>Tarih</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {inspections.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={9} className="text-center py-8 text-muted-foreground">
                      Kayıtlı kalite muayenesi bulunmamaktadır.
                    </TableCell>
                  </TableRow>
                ) : (
                  inspections.map((ins) => (
                    <TableRow key={ins.id} className="hover:bg-muted/20">
                      <TableCell className="font-mono font-medium">
                        {ins.inspectionNumber}
                      </TableCell>
                      <TableCell>
                        <span className="px-2 py-0.5 rounded text-xs font-semibold bg-muted text-muted-foreground">
                          {ins.inspectionType === "RECEIVING"
                            ? "Mal Kabul"
                            : ins.inspectionType === "IN_PROCESS"
                            ? "Operasyon İçi"
                            : "Final Mamul"}
                        </span>
                      </TableCell>
                      <TableCell>{ins.item?.name || ins.itemId}</TableCell>
                      <TableCell className="font-mono text-xs">
                        {ins.lotNumber || "—"}
                      </TableCell>
                      <TableCell>
                        {ins.batchQuantity} / {ins.sampleQuantity}
                      </TableCell>
                      <TableCell>
                        {ins.totalDefects > 0 ? (
                          <span className="text-rose-500 font-semibold">
                            {ins.totalDefects} Hata
                          </span>
                        ) : (
                          <span className="text-emerald-500 font-medium">0</span>
                        )}
                      </TableCell>
                      <TableCell>
                        {ins.status === "PASSED" ? (
                          <span className="px-2 py-0.5 rounded text-xs font-semibold bg-emerald-500/10 text-emerald-500 border border-emerald-500/20">
                            KABUL
                          </span>
                        ) : ins.status === "CONDITIONAL_PASSED" ? (
                          <span className="px-2 py-0.5 rounded text-xs font-semibold bg-amber-500/10 text-amber-500 border border-amber-500/20">
                            ŞARTLI KABUL
                          </span>
                        ) : ins.status === "REJECTED" ? (
                          <span className="px-2 py-0.5 rounded text-xs font-semibold bg-rose-500/10 text-rose-500 border border-rose-500/20">
                            RET (KARANTİNA)
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded text-xs font-medium bg-muted">
                            {ins.status}
                          </span>
                        )}
                      </TableCell>
                      <TableCell>
                        {ins.isStockBlocked ? (
                          <span className="flex items-center gap-1 text-xs text-rose-500 font-medium">
                            <AlertOctagon className="h-3.5 w-3.5" /> Blokeli
                          </span>
                        ) : (
                          <span className="text-xs text-muted-foreground">Serbest</span>
                        )}
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {new Date(ins.inspectionDate || ins.createdAt).toLocaleDateString("tr-TR")}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </div>
      )}

      {/* ── SEKME 2: KALİTE PLANLARI ── */}
      {activeTab === "plans" && (
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <h2 className="text-lg font-semibold">Aktif Kalite & Muayene Planları</h2>
            <Button
              size="sm"
              onClick={() => setIsNewPlanModalOpen(true)}
              className="gap-1.5"
            >
              <Plus className="h-4 w-4" /> Yeni Plan Oluştur
            </Button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {plans.map((p) => (
              <div
                key={p.id}
                className="p-4 rounded-xl border border-border/50 bg-card hover:border-emerald-500/40 transition-all flex flex-col justify-between"
              >
                <div>
                  <div className="flex justify-between items-start">
                    <span className="font-mono text-xs font-bold text-emerald-500 px-2 py-0.5 bg-emerald-500/10 rounded">
                      {p.code}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      v{p.version} • {p.controlPoint}
                    </span>
                  </div>
                  <h3 className="font-bold text-foreground mt-2">{p.name}</h3>
                  <p className="text-xs text-muted-foreground mt-1">
                    {p.description || "Açıklama girilmemiş."}
                  </p>

                  <div className="mt-4 pt-3 border-t border-border/30 space-y-1.5 text-xs text-muted-foreground">
                    <div className="flex justify-between">
                      <span>Numune Metodu:</span>
                      <span className="font-medium text-foreground">{p.samplingType}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>AQL Kabul Limiti:</span>
                      <span className="font-medium text-foreground">{p.aqlAcceptanceLimit}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Kontrol Maddesi Sayısı:</span>
                      <span className="font-medium text-foreground">{p.items?.length || 0} Madde</span>
                    </div>
                  </div>
                </div>

                <div className="mt-4 pt-3 border-t border-border/30 flex justify-end">
                  <Button variant="ghost" size="sm" className="h-8 text-xs gap-1">
                    İncele <ChevronRight className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── SEKME 3: UYGUNSUZLUK (NCR) & DÖF (CAPA) ── */}
      {activeTab === "ncrs" && (
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <h2 className="text-lg font-semibold">Uygunsuzluk Raporları (NCR) & DÖF Süreci</h2>
            <Button
              size="sm"
              onClick={() => setIsNewNcrModalOpen(true)}
              className="gap-1.5 bg-rose-600 hover:bg-rose-700 text-white"
            >
              <Plus className="h-4 w-4" /> Yeni NCR Başlat
            </Button>
          </div>

          <div className="rounded-xl border border-border/50 bg-card overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/40">
                  <TableHead>NCR No</TableHead>
                  <TableHead>Başlık & Açıklama</TableHead>
                  <TableHead>Şiddet</TableHead>
                  <TableHead>Kategori</TableHead>
                  <TableHead>Etkilenen Miktar</TableHead>
                  <TableHead>Aşama / Durum</TableHead>
                  <TableHead className="text-right">İşlem</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {ncrs.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                      Açık uygunsuzluk (NCR) kaydı bulunmamaktadır.
                    </TableCell>
                  </TableRow>
                ) : (
                  ncrs.map((ncr) => (
                    <TableRow key={ncr.id} className="hover:bg-muted/20">
                      <TableCell className="font-mono font-medium">
                        {ncr.ncrNumber}
                      </TableCell>
                      <TableCell>
                        <div className="font-medium text-foreground">{ncr.title}</div>
                        <div className="text-xs text-muted-foreground line-clamp-1">
                          {ncr.description}
                        </div>
                      </TableCell>
                      <TableCell>
                        <span
                          className={`px-2 py-0.5 rounded text-xs font-semibold ${
                            ncr.severity === "CRITICAL"
                              ? "bg-rose-500/20 text-rose-400 border border-rose-500/30"
                              : ncr.severity === "MAJOR"
                              ? "bg-amber-500/20 text-amber-400"
                              : "bg-muted text-muted-foreground"
                          }`}
                        >
                          {ncr.severity}
                        </span>
                      </TableCell>
                      <TableCell className="text-xs">{ncr.defectCategory}</TableCell>
                      <TableCell className="text-xs font-mono">
                        {ncr.affectedQuantity} Adet
                      </TableCell>
                      <TableCell>
                        <span className="px-2 py-0.5 rounded text-xs font-bold bg-muted text-foreground">
                          {ncr.status}
                        </span>
                      </TableCell>
                      <TableCell className="text-right">
                        {ncr.status !== "CLOSED" && ncr.status !== "CANCELLED" && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              setSelectedNcr(ncr)
                              let next: any = "INVESTIGATION"
                              if (ncr.status === "INVESTIGATION") next = "ACTION_PENDING"
                              else if (ncr.status === "ACTION_PENDING") next = "EFFECTIVENESS_CHECK"
                              else if (ncr.status === "EFFECTIVENESS_CHECK") next = "CLOSED"
                              setNcrTransitionForm({
                                targetStatus: next,
                                rootCauseDescription: ncr.rootCauseDescription || "",
                                correctiveAction: ncr.correctiveAction || "",
                                effectivenessResult: "EFFECTIVE",
                                effectivenessNotes: "",
                              })
                              setIsNcrTransitionModalOpen(true)
                            }}
                            className="h-8 text-xs gap-1"
                          >
                            İlerlet <ArrowRight className="h-3 w-3" />
                          </Button>
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

      {/* ── SEKME 4: CİHAZ KALİBRASYON ── */}
      {activeTab === "calibrations" && (
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <div>
              <h2 className="text-lg font-semibold">Ölçüm Cihazı Kalibrasyon Takibi</h2>
              <p className="text-xs text-muted-foreground">
                Kalibrasyon süresi geçen cihazlarla yapılan ölçümler sistem tarafından otomatik olarak engellenir.
              </p>
            </div>
            <Button
              size="sm"
              onClick={() => setIsNewCalibrationModalOpen(true)}
              className="gap-1.5"
            >
              <Plus className="h-4 w-4" /> Yeni Cihaz Tanımla
            </Button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {calibrations.map((dev) => (
              <div
                key={dev.id}
                className={`p-4 rounded-xl border bg-card transition-all ${
                  dev.isExpired
                    ? "border-rose-500/50 bg-rose-500/5"
                    : dev.isExpiringSoon
                    ? "border-amber-500/50 bg-amber-500/5"
                    : "border-border/50"
                }`}
              >
                <div className="flex justify-between items-start">
                  <div>
                    <span className="font-mono text-xs font-bold text-foreground px-2 py-0.5 bg-muted rounded">
                      {dev.deviceCode}
                    </span>
                    <h3 className="font-bold text-foreground mt-2">{dev.deviceName}</h3>
                  </div>
                  {dev.isExpired ? (
                    <span className="px-2 py-0.5 rounded text-xs font-bold bg-rose-500 text-white flex items-center gap-1">
                      <XCircle className="h-3 w-3" /> SÜRESİ GEÇMİŞ
                    </span>
                  ) : dev.isExpiringSoon ? (
                    <span className="px-2 py-0.5 rounded text-xs font-bold bg-amber-500 text-black flex items-center gap-1">
                      <AlertTriangle className="h-3 w-3" /> YAKLAŞTI ({dev.daysRemaining} gün)
                    </span>
                  ) : (
                    <span className="px-2 py-0.5 rounded text-xs font-bold bg-emerald-500/20 text-emerald-500 flex items-center gap-1">
                      <CheckCircle2 className="h-3 w-3" /> GEÇERLİ
                    </span>
                  )}
                </div>

                <div className="mt-4 pt-3 border-t border-border/30 space-y-1 text-xs text-muted-foreground">
                  <div className="flex justify-between">
                    <span>Cihaz Tipi:</span>
                    <span className="font-medium text-foreground">{dev.deviceType}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Son Kalibrasyon:</span>
                    <span className="text-foreground">
                      {new Date(dev.lastCalibrationDate).toLocaleDateString("tr-TR")}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span>Gelecek Kalibrasyon:</span>
                    <span className="font-medium text-foreground">
                      {new Date(dev.nextCalibrationDate).toLocaleDateString("tr-TR")}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span>Konum:</span>
                    <span className="text-foreground">{dev.location || "Kalite Odası"}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── SEKME 5: İZLENEBİLİRLİK & GERİ ÇAĞIRMA (RECALL) ── */}
      {activeTab === "traceability" && (
        <div className="space-y-6">
          <div className="p-4 rounded-xl border border-border/50 bg-card space-y-4">
            <div>
              <h2 className="text-lg font-semibold">Parti / Seri Numarası İzleme & Geri Çağırma</h2>
              <p className="text-xs text-muted-foreground mt-0.5">
                Hammadde partisini aratarak hangi müşterilere gittiğini (İleri İzleme) veya mamul partisini aratarak hangi hammadde ve operasyonlardan geçtiğini (Geri İzleme) dökün.
              </p>
            </div>

            <div className="flex flex-col sm:flex-row items-center gap-3">
              <Input
                placeholder="Parti No / Lot Numarası girin (örn. LOT-HM-2026-01)..."
                value={traceLotNumber}
                onChange={(e) => setTraceLotNumber(e.target.value)}
                className="max-w-md h-10"
              />
              <div className="flex gap-2">
                <Button
                  onClick={() => handleRunTraceability("FORWARD")}
                  disabled={loading}
                  className="h-10 gap-1.5"
                >
                  <ArrowRight className="h-4 w-4" /> İleri İzle (Müşteriye)
                </Button>
                <Button
                  variant="outline"
                  onClick={() => handleRunTraceability("BACKWARD")}
                  disabled={loading}
                  className="h-10 gap-1.5"
                >
                  <RotateCcw className="h-4 w-4" /> Geri İzle (Tedarikçiye)
                </Button>
                <Button
                  variant="destructive"
                  onClick={() => handleRunTraceability("RECALL")}
                  disabled={loading}
                  className="h-10 gap-1.5"
                >
                  <FileWarning className="h-4 w-4" /> Geri Çağırma Simülasyonu
                </Button>
              </div>
            </div>
          </div>

          {/* İzleme Sonucu Görünümü */}
          {traceResult && (
            <div className="p-6 rounded-xl border border-border/50 bg-card space-y-6">
              {traceMode === "RECALL" ? (
                <div className="space-y-4">
                  <div className="flex items-center gap-2 text-rose-500 font-bold text-lg">
                    <AlertOctagon className="h-6 w-6" />
                    Geri Çağırma (Recall) Risk ve Etki Raporu: {traceResult.lotNumber}
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div className="p-4 rounded-lg bg-muted/40 border border-border/40">
                      <p className="text-xs text-muted-foreground">Depoda Kalan (Karantina)</p>
                      <h3 className="text-xl font-bold mt-1 text-amber-500">
                        {traceResult.inStockQuarantinedQty} Adet
                      </h3>
                    </div>
                    <div className="p-4 rounded-lg bg-muted/40 border border-border/40">
                      <p className="text-xs text-muted-foreground">Üretim Hattında (WIP)</p>
                      <h3 className="text-xl font-bold mt-1 text-blue-500">
                        {traceResult.inProgressWipQty} Adet
                      </h3>
                    </div>
                    <div className="p-4 rounded-lg bg-muted/40 border border-border/40">
                      <p className="text-xs text-muted-foreground">Müşterilere Sevk Edilmiş</p>
                      <h3 className="text-xl font-bold mt-1 text-rose-500">
                        {traceResult.shippedToCustomerQty} Adet
                      </h3>
                    </div>
                  </div>

                  <div className="p-4 rounded-lg border border-rose-500/20 bg-rose-500/5 text-sm text-foreground">
                    <span className="font-semibold text-rose-500">Önerilen Aksiyon: </span>
                    {traceResult.recommendedAction}
                  </div>

                  <div>
                    <h4 className="font-semibold text-sm mb-2">Etkilenen Müşteri Listesi</h4>
                    <Table>
                      <TableHeader>
                        <TableRow className="bg-muted/40">
                          <TableHead>Müşteri Adı</TableHead>
                          <TableHead>Sipariş Ref</TableHead>
                          <TableHead>Sevk Edilen Miktar</TableHead>
                          <TableHead>Sevkiyat Tarihi</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {traceResult.affectedCustomers?.length === 0 ? (
                          <TableRow>
                            <TableCell colSpan={4} className="text-center py-4 text-muted-foreground">
                              Müşteriye henüz bir sevkiyat yapılmamıştır.
                            </TableCell>
                          </TableRow>
                        ) : (
                          traceResult.affectedCustomers?.map((c: any, i: number) => (
                            <TableRow key={i}>
                              <TableCell className="font-medium">{c.customerName}</TableCell>
                              <TableCell className="font-mono text-xs">{c.orderId}</TableCell>
                              <TableCell className="font-mono">{c.shippedQty} Adet</TableCell>
                              <TableCell className="text-xs text-muted-foreground">
                                {new Date(c.shipmentDate).toLocaleDateString("tr-TR")}
                              </TableCell>
                            </TableRow>
                          ))
                        )}
                      </TableBody>
                    </Table>
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  <h3 className="text-base font-bold text-foreground">
                    {traceMode === "FORWARD" ? "İleri İzleme Ağacı (Hammadde → Müşteri)" : "Geri İzleme Ağacı (Mamul → Tedarikçi)"}
                  </h3>
                  <div className="p-4 rounded-lg bg-muted/20 border border-border/40 font-mono text-xs overflow-x-auto">
                    <pre>{JSON.stringify(traceResult.traceTree, null, 2)}</pre>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* ── SEKME 6: PARETO & SPC RAPORLARI ── */}
      {activeTab === "reports" && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Pareto Analizi */}
            <div className="p-5 rounded-xl border border-border/50 bg-card space-y-4">
              <div className="flex items-center gap-2">
                <BarChart2 className="h-5 w-5 text-emerald-500" />
                <h3 className="font-bold text-foreground">Hata & Fire Pareto Analizi (80/20)</h3>
              </div>
              <p className="text-xs text-muted-foreground">
                Kalite hatalarının %80&apos;ine neden olan öncelikli kusur kategorilerinin dağılımı.
              </p>

              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/40">
                    <TableHead>Hata Kategorisi</TableHead>
                    <TableHead>Adet</TableHead>
                    <TableHead>Yüzde</TableHead>
                    <TableHead>Kümülatif %</TableHead>
                    <TableHead>Öncelik</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paretoData.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center py-6 text-muted-foreground">
                        Yeterli hata verisi bulunmuyor.
                      </TableCell>
                    </TableRow>
                  ) : (
                    paretoData.map((p, i) => (
                      <TableRow key={i}>
                        <TableCell className="font-medium text-xs">{p.category}</TableCell>
                        <TableCell className="font-mono text-xs">{p.count}</TableCell>
                        <TableCell className="text-xs">%{p.percentage}</TableCell>
                        <TableCell className="text-xs font-semibold">%{p.cumulativePercentage}</TableCell>
                        <TableCell>
                          {p.isVitalFew ? (
                            <span className="px-2 py-0.5 rounded text-xs font-bold bg-rose-500/10 text-rose-500 border border-rose-500/20">
                              Kritik %80
                            </span>
                          ) : (
                            <span className="text-xs text-muted-foreground">İkincil</span>
                          )}
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>

            {/* Tedarikçi Kalite Puanlaması */}
            <div className="p-5 rounded-xl border border-border/50 bg-card space-y-4">
              <div className="flex items-center gap-2">
                <Truck className="h-5 w-5 text-blue-500" />
                <h3 className="font-bold text-foreground">Tedarikçi Kalite Skor Kartı</h3>
              </div>
              <p className="text-xs text-muted-foreground">
                Mal kabul muayenelerine göre tedarikçi bazlı kabul ve ret oranları analizi.
              </p>

              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/40">
                    <TableHead>Tedarikçi</TableHead>
                    <TableHead>Muayene</TableHead>
                    <TableHead>Kabul Oranı</TableHead>
                    <TableHead>Kalite Skoru</TableHead>
                    <TableHead>Derece</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {supplierRatings.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center py-6 text-muted-foreground">
                        Mal kabul muayene verisi bulunamadı.
                      </TableCell>
                    </TableRow>
                  ) : (
                    supplierRatings.map((s, i) => (
                      <TableRow key={i}>
                        <TableCell className="font-medium text-xs">{s.supplierName}</TableCell>
                        <TableCell className="font-mono text-xs">{s.totalInspections}</TableCell>
                        <TableCell className="text-xs">%{s.acceptanceRate}</TableCell>
                        <TableCell className="font-bold text-xs">{s.qualityScore} / 100</TableCell>
                        <TableCell>
                          <span
                            className={`px-2 py-0.5 rounded text-xs font-bold ${
                              s.ratingBadge === "EXCELLENT"
                                ? "bg-emerald-500/20 text-emerald-500"
                                : s.ratingBadge === "GOOD"
                                ? "bg-blue-500/20 text-blue-500"
                                : "bg-rose-500/20 text-rose-500"
                            }`}
                          >
                            {s.ratingBadge}
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

      {/* ── YENİ MUAYENE MODALI ── */}
      <Dialog open={isNewInspectionModalOpen} onOpenChange={setIsNewInspectionModalOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Yeni Kalite Muayenesi Kaydı</DialogTitle>
            <DialogDescription>
              Tablet ve saha uyumlu ölçüm formu. Cihaz kalibrasyon durumu otomatik denetlenir.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleCreateInspection} className="space-y-4 pt-2">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <Label>Muayene Noktası</Label>
                <Select
                  value={inspectionForm.inspectionType}
                  onValueChange={(val: any) =>
                    setInspectionForm({ ...inspectionForm, inspectionType: val })
                  }
                >
                  <SelectTrigger className="mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="RECEIVING">Mal Kabul Muayenesi</SelectItem>
                    <SelectItem value="IN_PROCESS">Operasyon İçi (Hat) Muayenesi</SelectItem>
                    <SelectItem value="FINAL">Final Ürün Muayenesi</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label>Malzeme ID / Kodu</Label>
                <Input
                  required
                  placeholder="Örn: ITEM-001 veya UUID"
                  value={inspectionForm.itemId}
                  onChange={(e) =>
                    setInspectionForm({ ...inspectionForm, itemId: e.target.value })
                  }
                  className="mt-1"
                />
              </div>

              <div>
                <Label>Parti / Lot Numarası</Label>
                <Input
                  placeholder="Örn: LOT-2026-X1"
                  value={inspectionForm.lotNumber}
                  onChange={(e) =>
                    setInspectionForm({ ...inspectionForm, lotNumber: e.target.value })
                  }
                  className="mt-1"
                />
              </div>

              <div>
                <Label>Parti Miktarı</Label>
                <Input
                  type="number"
                  min="1"
                  required
                  value={inspectionForm.batchQuantity}
                  onChange={(e) =>
                    setInspectionForm({
                      ...inspectionForm,
                      batchQuantity: Number(e.target.value),
                    })
                  }
                  className="mt-1"
                />
              </div>
            </div>

            <div className="pt-2 border-t border-border/40">
              <Label className="text-sm font-semibold">Ölçüm & Test Sonuçları</Label>
              <div className="mt-2 space-y-3">
                {inspectionForm.measurements.map((m, idx) => (
                  <div
                    key={idx}
                    className="p-3 rounded-lg border border-border/40 bg-muted/20 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs"
                  >
                    <div>
                      <div className="font-bold text-foreground">
                        {m.characteristicName}
                      </div>
                      <div className="text-muted-foreground">
                        {m.characteristicType === "VARIABLE"
                          ? `Nominal: ${m.nominalValue} (±${m.maxTolerance})`
                          : "Niteliksel Geçti / Kaldı"}
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      {m.characteristicType === "VARIABLE" ? (
                        <div className="flex items-center gap-1.5">
                          <Label>Ölçülen:</Label>
                          <Input
                            type="number"
                            step="0.001"
                            value={m.measuredValue ?? ""}
                            onChange={(e) => {
                              const updated = [...inspectionForm.measurements]
                              updated[idx].measuredValue = Number(e.target.value)
                              setInspectionForm({
                                ...inspectionForm,
                                measurements: updated,
                              })
                            }}
                            className="w-24 h-8 text-xs font-mono"
                          />
                        </div>
                      ) : (
                        <div className="flex items-center gap-1">
                          <Button
                            type="button"
                            size="sm"
                            variant={m.isAttributePassed ? "default" : "outline"}
                            className={`h-7 px-3 text-xs ${
                              m.isAttributePassed ? "bg-emerald-600 text-white" : ""
                            }`}
                            onClick={() => {
                              const updated = [...inspectionForm.measurements]
                              updated[idx].isAttributePassed = true
                              setInspectionForm({
                                ...inspectionForm,
                                measurements: updated,
                              })
                            }}
                          >
                            Geçti
                          </Button>
                          <Button
                            type="button"
                            size="sm"
                            variant={!m.isAttributePassed ? "destructive" : "outline"}
                            className="h-7 px-3 text-xs"
                            onClick={() => {
                              const updated = [...inspectionForm.measurements]
                              updated[idx].isAttributePassed = false
                              setInspectionForm({
                                ...inspectionForm,
                                measurements: updated,
                              })
                            }}
                          >
                            Kaldı
                          </Button>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <DialogFooter className="pt-4 border-t border-border/40">
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsNewInspectionModalOpen(false)}
              >
                İptal
              </Button>
              <Button type="submit" className="bg-emerald-600 hover:bg-emerald-700 text-white">
                Muayeneyi Tamamla ve Değerlendir
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* ── NCR DURUM İLERLETME MODALI ── */}
      <Dialog open={isNcrTransitionModalOpen} onOpenChange={setIsNcrTransitionModalOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>NCR Aşama Geçişi</DialogTitle>
            <DialogDescription>
              {selectedNcr?.ncrNumber} — Hedef Durum: {ncrTransitionForm.targetStatus}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 pt-2">
            {ncrTransitionForm.targetStatus === "ACTION_PENDING" && (
              <div>
                <Label>Kök Neden Analizi (Zorunlu)</Label>
                <textarea
                  required
                  rows={3}
                  className="w-full mt-1 p-2 text-xs rounded-md border bg-background"
                  placeholder="5 Neden / Balık Kılçığı analiz bulgularını yazın..."
                  value={ncrTransitionForm.rootCauseDescription}
                  onChange={(e) =>
                    setNcrTransitionForm({
                      ...ncrTransitionForm,
                      rootCauseDescription: e.target.value,
                    })
                  }
                />
              </div>
            )}

            {ncrTransitionForm.targetStatus === "EFFECTIVENESS_CHECK" && (
              <div>
                <Label>Düzeltici Faaliyet (Zorunlu)</Label>
                <textarea
                  required
                  rows={3}
                  className="w-full mt-1 p-2 text-xs rounded-md border bg-background"
                  placeholder="Alınan düzeltici faaliyet aksiyonlarını yazın..."
                  value={ncrTransitionForm.correctiveAction}
                  onChange={(e) =>
                    setNcrTransitionForm({
                      ...ncrTransitionForm,
                      correctiveAction: e.target.value,
                    })
                  }
                />
              </div>
            )}

            {ncrTransitionForm.targetStatus === "CLOSED" && (
              <div className="space-y-2">
                <Label>Etkinlik Doğrulama Sonucu</Label>
                <Select
                  value={ncrTransitionForm.effectivenessResult}
                  onValueChange={(val: any) =>
                    setNcrTransitionForm({
                      ...ncrTransitionForm,
                      effectivenessResult: val,
                    })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="EFFECTIVE">Etkin (Başarılı)</SelectItem>
                    <SelectItem value="INEFFECTIVE">Yetersiz (Tekrar Açılacak)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>

          <DialogFooter className="pt-4 border-t border-border/40">
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsNcrTransitionModalOpen(false)}
            >
              Vazgeç
            </Button>
            <Button onClick={handleUpdateNcrStatus}>Geçişi Onayla</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
