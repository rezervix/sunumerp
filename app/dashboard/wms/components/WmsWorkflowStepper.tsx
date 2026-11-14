"use client"

import React, { useState } from "react"
import { motion } from "framer-motion"
import {
  Truck,
  ShieldCheck,
  MapPin,
  PackageCheck,
  QrCode,
  ArrowRight,
  CheckCircle2,
  User,
  RefreshCw,
  Plus,
  Sliders,
  Sparkles,
  AlertTriangle
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from "@/components/ui/dialog"
import { toast } from "sonner"

export type WmsWorkflowStage =
  | "GOODS_RECEIPT"
  | "QC_INSPECTION"
  | "PUTAWAY"
  | "WAVE_PICK"
  | "PACKING"

export interface WmsTaskRecord {
  id: string
  taskNumber: string
  workflowStage: WmsWorkflowStage
  warehouseId: string
  sourceDocType: string
  sourceDocNo: string
  partnerName?: string
  priority: string
  status: string
  assignedOperator?: string
  lpnCode?: string
  notes?: string
  lines?: Array<{
    id: string
    itemId: string
    sku: string
    itemName: string
    expectedQty: number
    processedQty: number
    unit: string
    suggestedFromBin?: string
    suggestedToBin?: string
    actualBin?: string
    lotNumber?: string
  }>
  warehouse?: {
    id: string
    name: string
    code: string
  }
}

interface WmsWorkflowStepperProps {
  tasks: WmsTaskRecord[]
  warehouses?: any[]
  bins?: any[]
  items?: any[]
  selectedWarehouseId?: string
  onTaskUpdated: () => void
}

const STEPS: Array<{
  stage: WmsWorkflowStage
  stepNumber: number
  title: string
  subTitle: string
  description: string
  icon: any
}> = [
  {
    stage: "GOODS_RECEIPT",
    stepNumber: 1,
    title: "1. Mal Kabul",
    subTitle: "Rampa & İrsaliye",
    description: "Tedarikçiden veya ithalattan gelen sevkiyatın rampa girişi ve ilk kontrolü.",
    icon: Truck
  },
  {
    stage: "QC_INSPECTION",
    stepNumber: 2,
    title: "2. Kalite Kontrol",
    subTitle: "Tazelik & Muayene",
    description: "Çiçeklerin tazeliği, gonca açıklığı ve hasar durumu kontrol edilir.",
    icon: ShieldCheck
  },
  {
    stage: "PUTAWAY",
    stepNumber: 3,
    title: "3. Rafa Yerleştirme",
    subTitle: "Hücreye İstif (Putaway)",
    description: "Onaylanan ürünler sistemin önerdiği raf hücresine (StorageBin) yerleştirilir ve stok artar.",
    icon: MapPin
  },
  {
    stage: "WAVE_PICK",
    stepNumber: 4,
    title: "4. Sipariş Toplama",
    subTitle: "FEFO Öncelikli Çıkış",
    description: "Müşteri ve mağaza siparişleri raftan toplanır, stok anında güncellenir.",
    icon: PackageCheck
  },
  {
    stage: "PACKING",
    stepNumber: 5,
    title: "5. Paket & Sevkiyat",
    subTitle: "Koli & Kargo Teslim",
    description: "Toplanan siparişler paketlenir, sevk irsaliyesi ve kargo barkodu basılır.",
    icon: QrCode
  }
]

export function WmsWorkflowStepper({
  tasks,
  warehouses = [],
  bins = [],
  items = [],
  selectedWarehouseId = "ALL",
  onTaskUpdated
}: WmsWorkflowStepperProps) {
  const [activeStage, setActiveStage] = useState<WmsWorkflowStage>("GOODS_RECEIPT")
  const [advancingTaskId, setAdvancingTaskId] = useState<string | null>(null)
  const [modalLoading, setModalLoading] = useState(false)

  // PO Mal Kabul (Varyanslı) Modalı
  const [isReceiptModalOpen, setIsReceiptModalOpen] = useState(false)
  const [rcWhId, setRcWhId] = useState(
    selectedWarehouseId !== "ALL" ? selectedWarehouseId : warehouses[0]?.id || "wh-merkez-01"
  )
  const [rcPoNo, setRcPoNo] = useState("PO-2026-418")
  const [rcPartnerName, setRcPartnerName] = useState("Royal Holland Flora")
  const [rcItemId, setRcItemId] = useState(items[0]?.id || "")
  const [rcExpectedQty, setRcExpectedQty] = useState("50")
  const [rcGoodQty, setRcGoodQty] = useState("48")
  const [rcDamagedQty, setRcDamagedQty] = useState("2")
  const [rcLotNumber, setRcLotNumber] = useState("LOT-GR-2611")
  const [rcExpiryDate, setRcExpiryDate] = useState("2026-12-05")
  const [rcTargetBinId, setRcTargetBinId] = useState("")
  const [putawayPreview, setPutawayPreview] = useState<any[]>([])

  // Put-Away Direktif Kuralları Modalı
  const [isDirectiveModalOpen, setIsDirectiveModalOpen] = useState(false)
  const [directives, setDirectives] = useState<any[]>([])
  const [dirName, setDirName] = useState("Soğuk Hava Taze Çiçek Kuralı")
  const [dirTargetZoneCode, setDirTargetZoneCode] = useState("COLD")
  const [dirCategory, setDirCategory] = useState("ALL")
  const [dirAbc, setDirAbc] = useState("ALL")
  const [dirStrategy, setDirStrategy] = useState("FEFO_FIRST")

  // Dalga Toplama (Wave Pick) Modalı
  const [isWaveModalOpen, setIsWaveModalOpen] = useState(false)
  const [wvWhId, setWvWhId] = useState(
    selectedWarehouseId !== "ALL" ? selectedWarehouseId : warehouses[0]?.id || "wh-merkez-01"
  )
  const [wvItemId, setWvItemId] = useState(items[0]?.id || "")
  const [wvQty, setWvQty] = useState("10")
  const [wvOperator, setWvOperator] = useState("Murat Kaya")
  const [wvPriority, setWvPriority] = useState("HIGH")

  // Kısmi / Short-Pick Yürütme Modalı
  const [shortExecTask, setShortExecTask] = useState<WmsTaskRecord | null>(null)
  const [execQtyByLine, setExecQtyByLine] = useState<Record<string, string>>({})
  const [shortReasonByLine, setShortReasonByLine] = useState<Record<string, string>>({})

  const resolveActiveWh = (fallback: string) =>
    selectedWarehouseId !== "ALL" ? selectedWarehouseId : fallback || warehouses[0]?.id || "wh-merkez-01"

  const loadPutawayPreview = async (whId: string, itemId: string, qty: number) => {
    if (!itemId) return
    try {
      const res = await fetch(
        `/api/wms?section=putaway_suggest&warehouseId=${encodeURIComponent(whId)}&itemId=${encodeURIComponent(itemId)}&quantity=${qty}`
      )
      const data = await res.json()
      if (data.success && Array.isArray(data.candidates)) {
        setPutawayPreview(data.candidates)
        if (!rcTargetBinId && data.candidates[0]?.binId) {
          setRcTargetBinId(data.candidates[0].binId)
        }
      }
    } catch {
      // silent preview error
    }
  }

  const openReceiptModal = () => {
    const wh = resolveActiveWh(rcWhId)
    const item = items.find((i: any) => i.id === rcItemId)?.id || items[0]?.id || ""
    setRcWhId(wh)
    setRcItemId(item)
    setIsReceiptModalOpen(true)
    if (item) loadPutawayPreview(wh, item, Number(rcGoodQty || 1))
  }

  const openDirectiveModal = async () => {
    setIsDirectiveModalOpen(true)
    try {
      const res = await fetch("/api/wms?section=directives")
      const data = await res.json()
      if (data.success) setDirectives(data.directives || [])
    } catch {
      toast.error("Put-Away direktifleri yüklenemedi")
    }
  }

  const handleSubmitGoodsReceipt = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!rcItemId) return toast.error("Ürün seçin")
    setModalLoading(true)
    try {
      const res = await fetch("/api/wms", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "process_goods_receipt",
          warehouseId: rcWhId,
          relatedPoNo: rcPoNo,
          partnerName: rcPartnerName,
          lines: [
            {
              itemId: rcItemId,
              expectedQty: Number(rcExpectedQty || 0),
              receivedGoodQty: Number(rcGoodQty || 0),
              damagedQty: Number(rcDamagedQty || 0),
              lotNumber: rcLotNumber || undefined,
              expiryDate: rcExpiryDate || undefined,
              targetBinId: rcTargetBinId || undefined,
            },
          ],
        }),
      })
      const data = await res.json()
      if (!data.success) throw new Error(data.error || "Mal kabul başarısız")
      toast.success(data.message || "PO Mal Kabul & Varyans işlendi.")
      setIsReceiptModalOpen(false)
      onTaskUpdated()
    } catch (err: any) {
      toast.error(err.message || "Mal kabul sırasında hata")
    } finally {
      setModalLoading(false)
    }
  }

  const handleSaveDirective = async (e: React.FormEvent) => {
    e.preventDefault()
    setModalLoading(true)
    try {
      const res = await fetch("/api/wms", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "upsert_directive",
          name: dirName,
          directiveType: "PUTAWAY",
          warehouseId: selectedWarehouseId !== "ALL" ? selectedWarehouseId : null,
          itemCategory: dirCategory === "ALL" ? null : dirCategory,
          abcClassFilter: dirAbc === "ALL" ? null : dirAbc,
          strategy: dirStrategy,
          targetZoneCode: dirTargetZoneCode,
          priority: 10,
        }),
      })
      const data = await res.json()
      if (!data.success) throw new Error(data.error || "Direktif kaydedilemedi")
      toast.success("Put-Away direktifi kaydedildi.")
      const listRes = await fetch("/api/wms?section=directives").then(r => r.json())
      if (listRes.success) setDirectives(listRes.directives || [])
    } catch (err: any) {
      toast.error(err.message || "Hata")
    } finally {
      setModalLoading(false)
    }
  }

  const handleCreateWavePick = async (e: React.FormEvent) => {
    e.preventDefault()
    const item = items.find((i: any) => i.id === wvItemId) || items[0]
    if (!item) return toast.error("Ürün seçin")
    setModalLoading(true)
    try {
      const res = await fetch("/api/wms", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "create_wave_pick",
          warehouseId: resolveActiveWh(wvWhId),
          assignedOperator: wvOperator,
          priority: wvPriority,
          lines: [{ itemId: item.id, quantity: Number(wvQty || 1) }],
        }),
      })
      const data = await res.json()
      if (!data.success) throw new Error(data.error || "Dalga toplama planlanamadı")
      toast.success(data.message || "FEFO / Koridor sıralı Wave Pick oluşturuldu.")
      setIsWaveModalOpen(false)
      setActiveStage("WAVE_PICK")
      onTaskUpdated()
    } catch (err: any) {
      toast.error(err.message || "Hata")
    } finally {
      setModalLoading(false)
    }
  }

  const openShortExecModal = (task: WmsTaskRecord) => {
    const qMap: Record<string, string> = {}
    const rMap: Record<string, string> = {}
    for (const ln of task.lines || []) {
      qMap[ln.id] = String(ln.expectedQty || 0)
      rMap[ln.id] = ""
    }
    setExecQtyByLine(qMap)
    setShortReasonByLine(rMap)
    setShortExecTask(task)
  }

  const handleCompleteShortExec = async () => {
    if (!shortExecTask) return
    setModalLoading(true)
    try {
      const pickedQtyByLineId: Record<string, number> = {}
      const shortPickReasonByLineId: Record<string, string> = {}
      for (const ln of shortExecTask.lines || []) {
        pickedQtyByLineId[ln.id] = Number(execQtyByLine[ln.id] ?? ln.expectedQty)
        if (shortReasonByLine[ln.id]?.trim()) {
          shortPickReasonByLineId[ln.id] = shortReasonByLine[ln.id].trim()
        }
      }
      const res = await fetch("/api/wms", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "complete_task_execution",
          taskId: shortExecTask.id,
          pickedQtyByLineId,
          shortPickReasonByLineId,
        }),
      })
      const data = await res.json()
      if (!data.success) throw new Error(data.error || "Görev tamamlanamadı")
      toast.success(data.message || "Görev eksik/kısmi miktar ile işlendi.")
      setShortExecTask(null)
      onTaskUpdated()
    } catch (err: any) {
      toast.error(err.message || "Hata")
    } finally {
      setModalLoading(false)
    }
  }

  // Aktif aşamadaki görevleri filtrele
  const currentStageTasks = tasks.filter(t => t.workflowStage === activeStage && t.status !== "COMPLETED")

  // Her aşamadaki görev sayısı
  const getStageCount = (stage: WmsWorkflowStage) => {
    return tasks.filter(t => t.workflowStage === stage && t.status !== "COMPLETED").length
  }

  // Görevi Bir Sonraki Aşamaya İlerlet (Gerçek DB Stok Hareketi)
  const handleAdvanceTask = async (task: WmsTaskRecord) => {
    setAdvancingTaskId(task.id)
    try {
      const res = await fetch("/api/wms", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "advance_task",
          taskId: task.id
        })
      })

      const data = await res.json()
      if (data.success) {
        toast.success(data.message || "Görev başarıyla sonraki aşamaya iletildi!")
        onTaskUpdated()
      } else {
        toast.error("Görev ilerletilemedi: " + (data.error || "Bilinmeyen hata"))
      }
    } catch (e: any) {
      toast.error("Bağlantı hatası: " + e.message)
    } finally {
      setAdvancingTaskId(null)
    }
  }

  const currentStepMeta = STEPS.find(s => s.stage === activeStage) || STEPS[0]

  return (
    <div className="space-y-5">
      {/* 1. ADIM ADIM İŞ AKIŞI SİHİRBAZI (PARLAK ZÜMRÜT ÇİZGİLİ ADIMLAR) */}
      <div className="bg-[#111513]/90 backdrop-blur-xl border border-white/[0.06] rounded-[20px] p-3 shadow-2xl relative overflow-hidden">
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5 relative">
          {STEPS.map((step, idx) => {
            const Icon = step.icon
            const isActive = activeStage === step.stage
            const count = getStageCount(step.stage)

            return (
              <div key={step.stage} className="relative flex flex-col">
                <button
                  onClick={() => setActiveStage(step.stage)}
                  className={`p-3.5 rounded-xl border text-left transition-all flex flex-col justify-between relative overflow-hidden h-full cursor-pointer ${
                    isActive
                      ? "bg-white/[0.06] border-emerald-500/30 text-white shadow-[0_0_20px_rgba(52,211,153,0.1)]"
                      : "bg-white/[0.02] border-white/[0.06] hover:bg-white/[0.04] text-zinc-400 hover:text-white"
                  }`}
                >
                  <div className="flex items-center justify-between w-full mb-2">
                    <div
                      className={`h-8 w-8 rounded-lg flex items-center justify-center transition-all ${
                        isActive
                          ? "bg-emerald-500/15 text-[#34D399] border border-emerald-500/25"
                          : "bg-white/[0.04] text-zinc-400"
                      }`}
                    >
                      <Icon className="h-4 w-4" />
                    </div>
                    {count > 0 ? (
                      <span
                        className={`rounded-full px-2.5 py-0.5 text-xs font-semibold border ${
                          isActive
                            ? "bg-emerald-500/15 text-[#34D399] border-emerald-500/25"
                            : "bg-white/[0.05] text-zinc-400 border-white/[0.08]"
                        }`}
                      >
                        {count}
                      </span>
                    ) : (
                      <span className="text-[11px] text-zinc-600 font-mono">0</span>
                    )}
                  </div>

                  <div>
                    <div className={`text-xs font-semibold ${isActive ? "text-white" : "text-zinc-300"}`}>
                      {step.title}
                    </div>
                    <div className="text-[11px] text-zinc-500 truncate mt-0.5">
                      {step.subTitle}
                    </div>
                  </div>

                  {isActive && (
                    <div className="absolute bottom-0 inset-x-0 h-0.5 bg-[#34D399] shadow-[0_0_12px_rgba(52,211,153,0.4)]" />
                  )}
                </button>
              </div>
            )
          })}
        </div>
      </div>

      {/* 2. AKTİF AŞAMA AÇIKLAMA KUTUSU */}
      <div className="rounded-2xl border border-white/[0.06] bg-[#111513]/90 backdrop-blur-xl p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 text-xs">
        <div className="flex items-center gap-3 text-zinc-300">
          <div className="h-7 w-7 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center shrink-0">
            <currentStepMeta.icon className="h-4 w-4 text-[#34D399]" />
          </div>
          <div>
            <span className="font-semibold text-white mr-1.5">{currentStepMeta.title}:</span>
            <span className="text-zinc-400">{currentStepMeta.description}</span>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2 shrink-0">
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={openReceiptModal}
            className="h-8 text-xs border-white/[0.08] bg-white/[0.04] hover:bg-white/[0.08] text-zinc-200 rounded-xl gap-1"
          >
            <Plus className="w-3.5 h-3.5 text-[#34D399]" /> PO Mal Kabul
          </Button>
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={openDirectiveModal}
            className="h-8 text-xs border-white/[0.08] bg-white/[0.04] hover:bg-white/[0.08] text-zinc-200 rounded-xl gap-1"
          >
            <Sliders className="w-3.5 h-3.5 text-amber-400" /> Put-Away Kuralları
          </Button>
          <Button
            type="button"
            size="sm"
            onClick={() => setIsWaveModalOpen(true)}
            className="h-8 text-xs bg-[#34D399]/15 hover:bg-[#34D399]/25 border border-emerald-500/30 text-[#34D399] rounded-xl gap-1"
          >
            <Sparkles className="w-3.5 h-3.5" /> Dalga Toplama (Wave)
          </Button>
          <span className="text-xs text-zinc-400 font-mono pl-1">
            Bekleyen: <strong className="text-white font-semibold">{currentStageTasks.length}</strong>
          </span>
        </div>
      </div>

      {/* 3. AŞAMADAKİ GÖREV KARTLARI */}
      {currentStageTasks.length === 0 ? (
        <div className="bg-[#111513]/90 border border-white/[0.06] rounded-[20px] p-10 text-center space-y-2.5">
          <div className="h-12 w-12 rounded-full bg-emerald-500/10 border border-emerald-500/20 mx-auto flex items-center justify-center">
            <CheckCircle2 className="h-6 w-6 text-[#34D399]" />
          </div>
          <div className="text-sm font-semibold text-white">
            Bu Aşamada Bekleyen Görev Yok
          </div>
          <p className="text-xs text-zinc-500 max-w-sm mx-auto">
            {currentStepMeta.title} aşamasındaki tüm işlemler tamamlandı veya henüz yeni bir görev oluşturulmadı.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {currentStageTasks.map(task => {
            const isAdvancing = advancingTaskId === task.id
            const firstLine = task.lines?.[0]
            const lineCount = task.lines?.length || 1

            return (
              <motion.div
                key={task.id}
                whileHover={{ y: -4 }}
                className="bg-[#111513]/90 border border-white/[0.06] p-5 rounded-[20px] space-y-3.5 hover:border-white/[0.12] transition-colors shadow-xl"
              >
                {/* Başlık ve Doküman Bilgisi */}
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-sm text-white">
                        {task.taskNumber}
                      </span>
                      <span
                        className={`rounded-full px-2.5 py-0.5 text-xs font-semibold border ${
                          task.priority === "HIGH" || task.priority === "URGENT"
                            ? "bg-rose-500/10 text-rose-300 border-rose-500/20"
                            : "bg-white/[0.04] text-zinc-400 border-white/[0.08]"
                        }`}
                      >
                        {task.priority === "HIGH" || task.priority === "URGENT" ? "Öncelikli" : "Normal"}
                      </span>
                    </div>
                    <div className="flex items-center gap-1.5 text-[11px] text-zinc-500 font-mono mt-1">
                      <span>{task.sourceDocType}</span>
                      <span>•</span>
                      <span>{task.sourceDocNo}</span>
                    </div>
                  </div>

                  <span
                    className={`rounded-full px-2.5 py-0.5 text-xs font-medium border ${
                      task.status === "IN_PROGRESS"
                        ? "bg-emerald-500/10 text-[#34D399] border-emerald-500/20"
                        : "bg-amber-500/10 text-amber-300 border-amber-500/20"
                    }`}
                  >
                    {task.status === "IN_PROGRESS" ? "İşlemde" : "Bekliyor"}
                  </span>
                </div>

                {/* Kalem ve Ürün Bilgisi */}
                {firstLine && (
                  <div className="bg-black/30 rounded-xl p-3 border border-white/[0.06] space-y-1.5">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-semibold text-white">{firstLine.itemName}</span>
                      <span className="font-bold text-[#34D399] font-mono">
                        {firstLine.expectedQty} {firstLine.unit}
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-[11px] text-zinc-400 font-mono">
                      <span>SKU: {firstLine.sku}</span>
                      {firstLine.suggestedToBin && (
                        <span className="text-[#34D399] font-medium">
                          Hedef: {firstLine.suggestedToBin}
                        </span>
                      )}
                      {firstLine.suggestedFromBin && (
                        <span className="text-zinc-300 font-medium">
                          Kaynak: {firstLine.suggestedFromBin}
                        </span>
                      )}
                    </div>
                    {lineCount > 1 && (
                      <div className="text-[10px] text-zinc-500 italic pt-0.5">
                        + {lineCount - 1} diğer ürün kalemi
                      </div>
                    )}
                  </div>
                )}

                {/* Atanan Personel ve Not */}
                <div className="flex items-center justify-between text-xs text-zinc-400">
                  <div className="flex items-center gap-1.5">
                    <User className="h-3.5 w-3.5 text-zinc-500" />
                    <span>{task.assignedOperator || "Atanmadı"}</span>
                  </div>
                  {task.partnerName && (
                    <span className="truncate max-w-[160px] text-zinc-300">
                      {task.partnerName}
                    </span>
                  )}
                </div>

                {/* EYLEM BUTONU: SONRAKİ AŞAMAYA İLERLET VEYA KISMİ YÜRÜT */}
                <div className="pt-2.5 border-t border-white/[0.06] flex flex-wrap items-center justify-between gap-2">
                  <span className="text-[11px] text-zinc-500">
                    {activeStage === "PUTAWAY" && "⚡ Onaylandığında stoğa işlenir"}
                    {activeStage === "WAVE_PICK" && "⚡ Onaylandığında stoktan düşer"}
                    {activeStage === "GOODS_RECEIPT" && "Kalite kontrole aktarılır"}
                    {activeStage === "QC_INSPECTION" && "Rafa yerleştirmeye aktarılır"}
                    {activeStage === "PACKING" && "Sevkiyat tamamlanır"}
                  </span>

                  <div className="flex items-center gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={isAdvancing}
                      onClick={() => openShortExecModal(task)}
                      className="h-8 px-3 text-xs border-white/[0.1] bg-white/[0.03] hover:bg-white/[0.08] text-zinc-300 rounded-full gap-1 cursor-pointer"
                    >
                      <AlertTriangle className="h-3 w-3 text-amber-400" />
                      <span>Kısmi / Eksik</span>
                    </Button>

                    <Button
                      size="sm"
                      disabled={isAdvancing}
                      onClick={() => handleAdvanceTask(task)}
                      className="h-8.5 px-4 text-xs font-semibold bg-[#34D399] hover:bg-[#34D399]/90 text-[#061811] rounded-full shadow-lg shadow-emerald-500/20 gap-1.5 cursor-pointer"
                    >
                      {isAdvancing ? (
                        <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                      ) : (
                        <>
                          <span>Sonraki Aşama</span>
                          <ArrowRight className="h-3.5 w-3.5" />
                        </>
                      )}
                    </Button>
                  </div>
                </div>
              </motion.div>
            )
          })}
        </div>
      )}

      {/* 1. PO BAĞLANTILI MAL KABUL & VARYANS MODALI */}
      <Dialog open={isReceiptModalOpen} onOpenChange={setIsReceiptModalOpen}>
        <DialogContent className="sm:max-w-lg bg-[#111513] border border-white/[0.08] text-white rounded-2xl">
          <DialogHeader>
            <DialogTitle className="text-base">Satınalma Bağlantılı Mal Kabul (Varyans & Hasar)</DialogTitle>
            <DialogDescription className="text-xs text-zinc-400">
              Sağlam teslimat Put-Away direktifi ile önerilen rafa, hasarlı miktar otomatik Karantina hücresine yönlendirilir.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmitGoodsReceipt} className="space-y-3 text-xs">
            <div className="grid grid-cols-2 gap-2.5">
              <div className="space-y-1">
                <Label className="text-zinc-300">Depo</Label>
                <select
                  value={rcWhId}
                  onChange={(e) => {
                    setRcWhId(e.target.value)
                    loadPutawayPreview(e.target.value, rcItemId, Number(rcGoodQty || 1))
                  }}
                  className="w-full h-9 rounded-lg bg-black/40 border border-white/[0.08] px-2 text-white"
                >
                  {warehouses.map((w: any) => (
                    <option key={w.id} value={w.id} className="bg-[#111513]">{w.name}</option>
                  ))}
                </select>
              </div>
              <div className="space-y-1">
                <Label className="text-zinc-300">İlgili PO / İrsaliye No</Label>
                <Input value={rcPoNo} onChange={(e) => setRcPoNo(e.target.value)} className="bg-black/40 border-white/[0.08]" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2.5">
              <div className="space-y-1">
                <Label className="text-zinc-300">Tedarikçi</Label>
                <Input value={rcPartnerName} onChange={(e) => setRcPartnerName(e.target.value)} className="bg-black/40 border-white/[0.08]" />
              </div>
              <div className="space-y-1">
                <Label className="text-zinc-300">Ürün</Label>
                <select
                  value={rcItemId}
                  onChange={(e) => {
                    setRcItemId(e.target.value)
                    loadPutawayPreview(rcWhId, e.target.value, Number(rcGoodQty || 1))
                  }}
                  className="w-full h-9 rounded-lg bg-black/40 border border-white/[0.08] px-2 text-white"
                >
                  {items.map((it: any) => (
                    <option key={it.id} value={it.id} className="bg-[#111513]">{it.name} ({it.sku})</option>
                  ))}
                </select>
              </div>
            </div>
            <div className="grid grid-cols-3 gap-2">
              <div className="space-y-1">
                <Label className="text-zinc-300">Beklenen</Label>
                <Input type="number" min="0" value={rcExpectedQty} onChange={(e) => setRcExpectedQty(e.target.value)} className="bg-black/40 border-white/[0.08] font-mono" />
              </div>
              <div className="space-y-1">
                <Label className="text-zinc-300">Sağlam Gelen</Label>
                <Input type="number" min="0" value={rcGoodQty} onChange={(e) => setRcGoodQty(e.target.value)} className="bg-black/40 border-white/[0.08] font-mono text-[#34D399]" />
              </div>
              <div className="space-y-1">
                <Label className="text-zinc-300">Hasarlı (Karantina)</Label>
                <Input type="number" min="0" value={rcDamagedQty} onChange={(e) => setRcDamagedQty(e.target.value)} className="bg-black/40 border-white/[0.08] font-mono text-rose-300" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2.5">
              <div className="space-y-1">
                <Label className="text-zinc-300">Lot / Parti No</Label>
                <Input value={rcLotNumber} onChange={(e) => setRcLotNumber(e.target.value)} className="bg-black/40 border-white/[0.08] font-mono" />
              </div>
              <div className="space-y-1">
                <Label className="text-zinc-300">SKT (Expiry)</Label>
                <Input type="date" value={rcExpiryDate} onChange={(e) => setRcExpiryDate(e.target.value)} className="bg-black/40 border-white/[0.08]" />
              </div>
            </div>
            <div className="space-y-1">
              <Label className="text-zinc-300">Put-Away Hedef Raf Önerisi</Label>
              <select value={rcTargetBinId} onChange={(e) => setRcTargetBinId(e.target.value)} className="w-full h-9 rounded-lg bg-black/40 border border-white/[0.08] px-2 text-white font-mono">
                <option value="" className="bg-[#111513]">Otomatik Kural Motoru Seçsin</option>
                {putawayPreview.map((c: any) => (
                  <option key={c.binId} value={c.binId} className="bg-[#111513]">
                    ★ {c.binCode} ({c.zoneName} • Skor {c.score} • {c.reasons?.[0] || "Uygun"})
                  </option>
                ))}
                {bins.filter((b: any) => b.warehouseId === rcWhId && !b.isBlocked).map((b: any) => (
                  <option key={b.id} value={b.id} className="bg-[#111513]">{b.code} — {b.zone?.name || "Raf"}</option>
                ))}
              </select>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsReceiptModalOpen(false)} className="border-white/[0.08]">Vazgeç</Button>
              <Button type="submit" disabled={modalLoading} className="bg-[#34D399] text-[#0A0E0C] font-semibold">
                {modalLoading ? "İşleniyor..." : "Mal Kabulü Stok Defterine İşle"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* 2. PUT-AWAY YERLEŞTİRME DİREKTİF KURALLARI MODALI */}
      <Dialog open={isDirectiveModalOpen} onOpenChange={setIsDirectiveModalOpen}>
        <DialogContent className="sm:max-w-lg bg-[#111513] border border-white/[0.08] text-white rounded-2xl">
          <DialogHeader>
            <DialogTitle className="text-base">Put-Away Yönlendirme Kural Motoru</DialogTitle>
            <DialogDescription className="text-xs text-zinc-400">
              Ürün kategorisi, ABC sınıfı veya soğuk zincir gereksinimine göre hedef raf bölgesini belirleyin.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 text-xs">
            <div className="max-h-40 overflow-y-auto space-y-1.5">
              {directives.length === 0 ? (
                <div className="text-zinc-500 italic p-2">Kayıtlı direktif bulunamadı.</div>
              ) : (
                directives.map((d: any) => (
                  <div key={d.id} className="p-2.5 bg-white/[0.03] border border-white/[0.06] rounded-xl flex items-center justify-between">
                    <div>
                      <div className="font-semibold text-white">{d.name}</div>
                      <div className="text-[11px] text-zinc-400 font-mono">
                        Hedef: {d.targetZoneCode} • Strateji: {d.strategy} • Kategori: {d.itemCategory || "Tümü"}
                      </div>
                    </div>
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/10 text-[#34D399] font-mono">P{d.priority}</span>
                  </div>
                ))
              )}
            </div>
            <form onSubmit={handleSaveDirective} className="space-y-2.5 border-t border-white/[0.08] pt-3">
              <div className="space-y-1">
                <Label className="text-zinc-300">Yeni Kural Adı</Label>
                <Input required value={dirName} onChange={(e) => setDirName(e.target.value)} className="bg-black/40 border-white/[0.08]" />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                  <Label className="text-zinc-300">Hedef Bölge Kodu/Tipi</Label>
                  <select value={dirTargetZoneCode} onChange={(e) => setDirTargetZoneCode(e.target.value)} className="w-full h-9 rounded-lg bg-black/40 border border-white/[0.08] px-2 text-white">
                    <option value="COLD" className="bg-[#111513]">Soğuk Hava (COLD)</option>
                    <option value="COLD_STORAGE" className="bg-[#111513]">COLD_STORAGE</option>
                    <option value="FAST_PICK" className="bg-[#111513]">Hızlı Toplama (FAST_PICK)</option>
                    <option value="BULK_STORAGE" className="bg-[#111513]">Palet Depo (BULK_STORAGE)</option>
                  </select>
                </div>
                <div className="space-y-1">
                  <Label className="text-zinc-300">Yerleştirme Stratejisi</Label>
                  <select value={dirStrategy} onChange={(e) => setDirStrategy(e.target.value)} className="w-full h-9 rounded-lg bg-black/40 border border-white/[0.08] px-2 text-white">
                    <option value="FEFO_FIRST" className="bg-[#111513]">FEFO Öncelikli Konsolidasyon</option>
                    <option value="FIXED_BIN_CONSOLIDATE" className="bg-[#111513]">Sabit Raf / Aynı SKU Konsolidasyonu</option>
                    <option value="EMPTY_BIN_LOWEST_LEVEL" className="bg-[#111513]">En Alt Boş Raf</option>
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                  <Label className="text-zinc-300">Kategori Filtresi</Label>
                  <Input value={dirCategory} onChange={(e) => setDirCategory(e.target.value)} placeholder="ALL veya Kesme Çiçek" className="bg-black/40 border-white/[0.08]" />
                </div>
                <div className="space-y-1">
                  <Label className="text-zinc-300">ABC Sınıfı</Label>
                  <select value={dirAbc} onChange={(e) => setDirAbc(e.target.value)} className="w-full h-9 rounded-lg bg-black/40 border border-white/[0.08] px-2 text-white">
                    <option value="ALL" className="bg-[#111513]">Tüm Sınıflar</option>
                    <option value="A" className="bg-[#111513]">Sınıf A</option>
                    <option value="B" className="bg-[#111513]">Sınıf B</option>
                    <option value="C" className="bg-[#111513]">Sınıf C</option>
                  </select>
                </div>
              </div>
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setIsDirectiveModalOpen(false)} className="border-white/[0.08]">Kapat</Button>
                <Button type="submit" disabled={modalLoading} className="bg-[#34D399] text-[#0A0E0C] font-semibold">Direktifi Ekle</Button>
              </DialogFooter>
            </form>
          </div>
        </DialogContent>
      </Dialog>

      {/* 3. DALGA TOPLAMA (WAVE PICK) OLUŞTURMA MODALI */}
      <Dialog open={isWaveModalOpen} onOpenChange={setIsWaveModalOpen}>
        <DialogContent className="sm:max-w-md bg-[#111513] border border-white/[0.08] text-white rounded-2xl">
          <DialogHeader>
            <DialogTitle className="text-base">Dalga Toplama (Wave Pick — FEFO & Koridor Sıralı)</DialogTitle>
            <DialogDescription className="text-xs text-zinc-400">
              Karantina ve süresi dolmuş lotları atlayarak koridor sırasına göre toplama görevi planlar.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleCreateWavePick} className="space-y-3 text-xs">
            <div className="space-y-1">
              <Label className="text-zinc-300">Depo</Label>
              <select value={wvWhId} onChange={(e) => setWvWhId(e.target.value)} className="w-full h-9 rounded-lg bg-black/40 border border-white/[0.08] px-2 text-white">
                {warehouses.map((w: any) => (
                  <option key={w.id} value={w.id} className="bg-[#111513]">{w.name}</option>
                ))}
              </select>
            </div>
            <div className="space-y-1">
              <Label className="text-zinc-300">Toplanacak Ürün</Label>
              <select value={wvItemId || items[0]?.id || ""} onChange={(e) => setWvItemId(e.target.value)} className="w-full h-9 rounded-lg bg-black/40 border border-white/[0.08] px-2 text-white">
                {items.map((it: any) => (
                  <option key={it.id} value={it.id} className="bg-[#111513]">{it.name} ({it.sku})</option>
                ))}
              </select>
            </div>
            <div className="grid grid-cols-3 gap-2">
              <div className="space-y-1">
                <Label className="text-zinc-300">Miktar</Label>
                <Input type="number" min="1" value={wvQty} onChange={(e) => setWvQty(e.target.value)} className="bg-black/40 border-white/[0.08] font-mono" />
              </div>
              <div className="space-y-1">
                <Label className="text-zinc-300">Öncelik</Label>
                <select value={wvPriority} onChange={(e) => setWvPriority(e.target.value)} className="w-full h-9 rounded-lg bg-black/40 border border-white/[0.08] px-2 text-white">
                  <option value="URGENT" className="bg-[#111513]">Acil</option>
                  <option value="HIGH" className="bg-[#111513]">Yüksek</option>
                  <option value="NORMAL" className="bg-[#111513]">Normal</option>
                </select>
              </div>
              <div className="space-y-1">
                <Label className="text-zinc-300">Operatör</Label>
                <Input value={wvOperator} onChange={(e) => setWvOperator(e.target.value)} className="bg-black/40 border-white/[0.08]" />
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsWaveModalOpen(false)} className="border-white/[0.08]">Vazgeç</Button>
              <Button type="submit" disabled={modalLoading} className="bg-[#34D399] text-[#0A0E0C] font-semibold">Wave Pick Başlat</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* 4. KISMİ / SHORT-PICK GÖREV YÜRÜTME MODALI */}
      <Dialog open={Boolean(shortExecTask)} onOpenChange={(o) => !o && setShortExecTask(null)}>
        <DialogContent className="sm:max-w-lg bg-[#111513] border border-white/[0.08] text-white rounded-2xl">
          <DialogHeader>
            <DialogTitle className="text-base">Kısmi / Short-Pick İşleme — {shortExecTask?.taskNumber}</DialogTitle>
            <DialogDescription className="text-xs text-zinc-400">
              Rafta beklenen miktardan az stok bulunması durumunda toplanan net miktarı ve kısa toplama nedenini girin.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 max-h-72 overflow-y-auto text-xs">
            {(shortExecTask?.lines || []).map((ln) => (
              <div key={ln.id} className="p-3 bg-white/[0.03] border border-white/[0.06] rounded-xl space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-white">{ln.itemName}</span>
                  <span className="font-mono text-zinc-400">Beklenen: {ln.expectedQty} {ln.unit}</span>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <Label className="text-[11px] text-zinc-400">İşlenen Net Miktar</Label>
                    <Input
                      type="number"
                      min="0"
                      value={execQtyByLine[ln.id] ?? String(ln.expectedQty)}
                      onChange={(e) => setExecQtyByLine({ ...execQtyByLine, [ln.id]: e.target.value })}
                      className="bg-black/40 border-white/[0.08] font-mono h-8 mt-1"
                    />
                  </div>
                  <div>
                    <Label className="text-[11px] text-zinc-400">Eksik / Short-Pick Nedeni</Label>
                    <Input
                      placeholder="Örn. Rafta fiziksel eksik / solmuş"
                      value={shortReasonByLine[ln.id] ?? ""}
                      onChange={(e) => setShortReasonByLine({ ...shortReasonByLine, [ln.id]: e.target.value })}
                      className="bg-black/40 border-white/[0.08] h-8 mt-1"
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setShortExecTask(null)} className="border-white/[0.08]">Vazgeç</Button>
            <Button type="button" disabled={modalLoading} onClick={handleCompleteShortExec} className="bg-amber-500 hover:bg-amber-400 text-[#0A0E0C] font-semibold">
              {modalLoading ? "İşleniyor..." : "Kısmi Miktar ile Tamamla"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
