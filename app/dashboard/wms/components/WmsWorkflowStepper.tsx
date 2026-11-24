"use client"

import React, { useEffect, useState } from "react"
import Link from "next/link"
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
import { safeNumber, safeText } from "@/lib/utils/safe-display"

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
  const [openAsns, setOpenAsns] = useState<any[]>([])
  const [selectedAsnId, setSelectedAsnId] = useState("")

  useEffect(() => {
    if (!isReceiptModalOpen) return
    let active = true
    fetch(`/api/wms?section=open_asns&warehouseId=${encodeURIComponent(rcWhId || "ALL")}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (active && d?.success && Array.isArray(d.asns)) {
          setOpenAsns(d.asns)
        }
      })
      .catch(() => {})
    return () => {
      active = false
    }
  }, [isReceiptModalOpen, rcWhId])

  const handleSelectAsnPrefill = (asnId: string) => {
    setSelectedAsnId(asnId)
    const asn = openAsns.find((a) => a.id === asnId)
    if (!asn) return
    setRcWhId(asn.warehouseId || rcWhId)
    setRcPoNo(asn.poNumber || "")
    setRcPartnerName(asn.supplierName || "")
    const firstLine = (asn.lines || [])[0]
    if (firstLine) {
      setRcItemId(firstLine.itemId)
      setRcExpectedQty(String(firstLine.shippedQty || 1))
      setRcGoodQty(String(firstLine.shippedQty || 1))
      setRcDamagedQty("0")
      if (firstLine.lotNumber) setRcLotNumber(firstLine.lotNumber)
      if (firstLine.expiryDate) {
        setRcExpiryDate(new Date(firstLine.expiryDate).toISOString().slice(0, 10))
      }
      loadPutawayPreview(asn.warehouseId || rcWhId, firstLine.itemId, Number(firstLine.shippedQty || 1))
    }
  }

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
          asnId: selectedAsnId || null,
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
      {/* 1. ADIM ADIM İŞ AKIŞI SİHİRBAZI */}
      <div className="bg-white/80 backdrop-blur-xl border border-[--line] rounded-2xl p-3 shadow-sm relative overflow-hidden">
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5 relative">
          {STEPS.map((step) => {
            const Icon = step.icon
            const isActive = activeStage === step.stage
            const count = getStageCount(step.stage)

            return (
              <div key={step.stage} className="relative flex flex-col">
                <button
                  type="button"
                  onClick={() => setActiveStage(step.stage)}
                  className={`p-3.5 rounded-xl border text-left transition-all flex flex-col justify-between relative overflow-hidden h-full cursor-pointer ${
                    isActive
                      ? "bg-[--brand-soft] border-[--brand-line] text-[--brand] shadow-sm font-semibold"
                      : "bg-[--page] border-[--line] hover:bg-white text-[--text-muted] hover:text-[--text]"
                  }`}
                >
                  <div className="flex items-center justify-between w-full mb-2">
                    <div
                      className={`h-8 w-8 rounded-lg flex items-center justify-center transition-all ${
                        isActive
                          ? "bg-white text-[--brand] shadow-xs"
                          : "bg-white text-[--text-muted] border border-[--line]"
                      }`}
                    >
                      <Icon className="h-4 w-4" />
                    </div>
                    {count > 0 ? (
                      <span
                        className={`rounded-full px-2.5 py-0.5 text-xs font-semibold border ${
                          isActive
                            ? "bg-[--brand] text-white border-transparent"
                            : "bg-white text-[--text-muted] border-[--line]"
                        }`}
                      >
                        {count}
                      </span>
                    ) : (
                      <span className="text-[11px] text-[--text-muted] font-mono">0</span>
                    )}
                  </div>

                  <div>
                    <div className={`text-xs font-semibold ${isActive ? "text-[--brand]" : "text-[--text]"}`}>
                      {step.title}
                    </div>
                    <div className="text-[11px] text-[--text-muted] truncate mt-0.5">
                      {step.subTitle}
                    </div>
                  </div>

                  {isActive && (
                    <div className="absolute bottom-0 inset-x-0 h-0.5 bg-[--brand]" />
                  )}
                </button>
              </div>
            )
          })}
        </div>
      </div>

      {/* 2. AKTİF AŞAMA AÇIKLAMA KUTUSU */}
      <div className="rounded-2xl border border-[--line] bg-white/90 backdrop-blur-xl p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 text-xs shadow-sm">
        <div className="flex items-center gap-3 text-[--text]">
          <div className="h-7 w-7 rounded-lg bg-[--brand-soft] border border-[--brand-line] flex items-center justify-center shrink-0">
            <currentStepMeta.icon className="h-4 w-4 text-[--brand]" />
          </div>
          <div>
            <span className="font-semibold text-[--text] mr-1.5">{currentStepMeta.title}:</span>
            <span className="text-[--text-muted]">{currentStepMeta.description}</span>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2 shrink-0">
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={openReceiptModal}
            className="h-8 text-xs border-[--line] bg-white hover:bg-[--muted-bg] text-[--text-2] rounded-xl gap-1 cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5 text-[--brand]" /> PO Mal Kabul
          </Button>
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={openDirectiveModal}
            className="h-8 text-xs border-[--line] bg-white hover:bg-[--muted-bg] text-[--text-2] rounded-xl gap-1 cursor-pointer"
          >
            <Sliders className="w-3.5 h-3.5 text-[--brand]" /> Put-Away Kuralları
          </Button>
          <Button
            type="button"
            size="sm"
            onClick={() => setIsWaveModalOpen(true)}
            className="h-8 text-xs bg-[--brand-soft] hover:bg-[--brand-soft]/80 border border-[--brand-line] text-[--brand] font-semibold rounded-xl gap-1 cursor-pointer"
          >
            <Sparkles className="w-3.5 h-3.5" /> Dalga Toplama (Wave)
          </Button>
          <span className="text-xs text-[--text-muted] font-mono pl-1">
            Bekleyen: <strong className="text-[--text] font-semibold">{currentStageTasks.length}</strong>
          </span>
        </div>
      </div>

      {/* 3. AŞAMADAKİ GÖREV KARTLARI */}
      {currentStageTasks.length === 0 ? (
        <div className="bg-white border border-[--line] rounded-2xl p-10 text-center space-y-2.5 shadow-sm">
          <div className="h-12 w-12 rounded-full bg-[--ok-soft] border border-[--ok-fill]/20 mx-auto flex items-center justify-center">
            <CheckCircle2 className="h-6 w-6 text-[--ok]" />
          </div>
          <div className="text-sm font-semibold text-[--text]">
            Bu Aşamada Bekleyen Görev Yok
          </div>
          <p className="text-xs text-[--text-muted] max-w-sm mx-auto">
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
                whileHover={{ y: -3 }}
                className="bg-white border border-[--line] p-5 rounded-2xl space-y-3.5 hover:border-[--brand-line] hover:shadow-md transition-all shadow-xs"
              >
                {/* Başlık ve Doküman Bilgisi */}
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-sm text-[--text]">
                        {task.taskNumber}
                      </span>
                      <span
                        className={`rounded-full px-2.5 py-0.5 text-xs font-semibold border ${
                          task.priority === "HIGH" || task.priority === "URGENT"
                            ? "bg-[--bad-soft] text-[--bad] border-[--bad-fill]/20"
                            : "bg-[--page] text-[--text-muted] border-[--line]"
                        }`}
                      >
                        {task.priority === "HIGH" || task.priority === "URGENT" ? "Öncelikli" : "Normal"}
                      </span>
                    </div>
                    <div className="flex items-center gap-1.5 text-[11px] text-[--text-muted] font-mono mt-1">
                      <span>{task.sourceDocType}</span>
                      <span>•</span>
                      <span>{task.sourceDocNo}</span>
                    </div>
                  </div>

                  <span
                    className={`rounded-full px-2.5 py-0.5 text-xs font-medium border ${
                      task.status === "IN_PROGRESS"
                        ? "bg-[--brand-soft] text-[--brand] border-[--brand-line]"
                        : "bg-[--warn-soft] text-[--warn] border-[--warn-fill]/20"
                    }`}
                  >
                    {task.status === "IN_PROGRESS" ? "İşlemde" : "Bekliyor"}
                  </span>
                </div>

                {/* Kalem ve Ürün Bilgisi */}
                {firstLine && (
                  <div className="bg-[--page] rounded-xl p-3 border border-[--line] space-y-1.5">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-semibold text-[--text]">{firstLine.itemName}</span>
                      <span className="font-bold text-[--brand] font-mono">
                        {safeNumber(firstLine.expectedQty, 0)} {firstLine.unit}
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-[11px] text-[--text-muted] font-mono">
                      <span>SKU: {safeText(firstLine.sku)}</span>
                      {firstLine.suggestedToBin && (
                        <span className="text-[--brand] font-medium">
                          Hedef: {firstLine.suggestedToBin}
                        </span>
                      )}
                      {firstLine.suggestedFromBin && (
                        <span className="text-[--text-2] font-medium">
                          Kaynak: {firstLine.suggestedFromBin}
                        </span>
                      )}
                    </div>
                    {lineCount > 1 && (
                      <div className="text-[10px] text-[--text-muted] italic pt-0.5">
                        + {lineCount - 1} diğer ürün kalemi
                      </div>
                    )}
                  </div>
                )}

                {/* Atanan Personel ve Not */}
                <div className="flex items-center justify-between text-xs text-[--text-muted]">
                  <div className="flex items-center gap-1.5">
                    <User className="h-3.5 w-3.5 text-[--text-muted]" />
                    <span>{task.assignedOperator || "Atanmadı"}</span>
                  </div>
                  {task.partnerName && (
                    <span className="truncate max-w-[160px] text-[--text-2]">
                      {task.partnerName}
                    </span>
                  )}
                </div>

                {/* EYLEM BUTONU */}
                <div className="pt-2.5 border-t border-[--line] flex flex-wrap items-center justify-between gap-2">
                  <span className="text-[11px] text-[--text-muted]">
                    {activeStage === "PUTAWAY" && "⚡ Onaylandığında stoğa işlenir"}
                    {activeStage === "WAVE_PICK" && "⚡ Onaylandığında stoktan düşer"}
                    {activeStage === "GOODS_RECEIPT" && "Kalite kontrole aktarılır"}
                    {activeStage === "QC_INSPECTION" && "Rafa yerleştirmeye aktarılır"}
                    {activeStage === "PACKING" && "Sevkiyat tamamlanır"}
                  </span>

                  <div className="flex flex-wrap items-center gap-2">
                    {(activeStage === "WAVE_PICK" || activeStage === "PACKING") && (
                      <Link
                        href={`/dashboard/sevkiyat?addSourceType=WMS_WAVE&addSourceId=${encodeURIComponent(task.id)}`}
                        className="h-8 px-3 inline-flex items-center gap-1.5 text-xs font-medium border border-[--brand-line] bg-[--brand-soft] hover:bg-[--brand-soft]/80 text-[--brand] rounded-full transition cursor-pointer"
                      >
                        <Truck className="h-3.5 w-3.5" />
                        <span>Sefer Planına Aktar</span>
                      </Link>
                    )}

                    <Button
                      size="sm"
                      variant="outline"
                      disabled={isAdvancing}
                      onClick={() => openShortExecModal(task)}
                      className="h-8 px-3 text-xs border-[--line] bg-white hover:bg-[--muted-bg] text-[--text-2] rounded-full gap-1 cursor-pointer"
                    >
                      <AlertTriangle className="h-3 w-3 text-[--warn]" />
                      <span>Kısmi / Eksik</span>
                    </Button>

                    <Button
                      size="sm"
                      disabled={isAdvancing}
                      onClick={() => handleAdvanceTask(task)}
                      className="h-8.5 px-4 text-xs font-semibold bg-[--brand] hover:bg-[--brand-hover] text-white rounded-full shadow-sm gap-1.5 cursor-pointer disabled:opacity-50"
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
        <DialogContent className="sm:max-w-lg bg-white border border-[--line] text-[--text] rounded-2xl shadow-2xl p-6">
          <DialogHeader>
            <DialogTitle className="text-base text-[--text]">Satınalma Bağlantılı Mal Kabul (Varyans & Hasar)</DialogTitle>
            <DialogDescription className="text-xs text-[--text-muted]">
              Sağlam teslimat Put-Away direktifi ile önerilen rafa, hasarlı miktar otomatik Karantina hücresine yönlendirilir.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmitGoodsReceipt} className="space-y-3 text-xs">
            {openAsns.length > 0 && (
              <div className="rounded-xl border border-[--brand-line] bg-[--brand-soft] p-2.5 space-y-1">
                <label className="text-[11px] font-medium text-[--brand]">
                  Açık ASN İhbarından Ön Doldur (Tedarikçi / EDI Köprüsü)
                </label>
                <select
                  value={selectedAsnId}
                  onChange={(e) => handleSelectAsnPrefill(e.target.value)}
                  data-testid="wms-asn-prefill-select"
                  className="w-full h-8 rounded-lg bg-white border border-[--brand-line] px-2 text-[--text] font-mono text-[11px]"
                >
                  <option value="" className="bg-white">
                    Manuel Giriş veya Açık ASN Seçiniz ({openAsns.length} açık ihbar)
                  </option>
                  {openAsns.map((asn) => (
                    <option key={asn.id} value={asn.id} className="bg-white">
                      {asn.asnNumber} · {asn.poNumber} · {asn.supplierName} ({asn.totalShippedQty} Adet)
                    </option>
                  ))}
                </select>
              </div>
            )}
            <div className="grid grid-cols-2 gap-2.5">
              <div className="space-y-1">
                <Label className="text-[--text-muted]">Depo</Label>
                <select
                  value={rcWhId}
                  onChange={(e) => {
                    setRcWhId(e.target.value)
                    loadPutawayPreview(e.target.value, rcItemId, Number(rcGoodQty || 1))
                  }}
                  className="w-full h-9 rounded-lg bg-[--page] border border-[--line] px-2 text-[--text]"
                >
                  {warehouses.map((w: any) => (
                    <option key={w.id} value={w.id} className="bg-white text-[--text]">{w.name}</option>
                  ))}
                </select>
              </div>
              <div className="space-y-1">
                <Label className="text-[--text-muted]">İlgili PO / İrsaliye No</Label>
                <Input value={rcPoNo} onChange={(e) => setRcPoNo(e.target.value)} className="bg-[--page] border-[--line] text-[--text]" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2.5">
              <div className="space-y-1">
                <Label className="text-[--text-muted]">Tedarikçi</Label>
                <Input value={rcPartnerName} onChange={(e) => setRcPartnerName(e.target.value)} className="bg-[--page] border-[--line] text-[--text]" />
              </div>
              <div className="space-y-1">
                <Label className="text-[--text-muted]">Ürün</Label>
                <select
                  value={rcItemId}
                  onChange={(e) => {
                    setRcItemId(e.target.value)
                    loadPutawayPreview(rcWhId, e.target.value, Number(rcGoodQty || 1))
                  }}
                  className="w-full h-9 rounded-lg bg-[--page] border border-[--line] px-2 text-[--text]"
                >
                  {items.map((it: any) => (
                    <option key={it.id} value={it.id} className="bg-white text-[--text]">{it.name} ({it.sku})</option>
                  ))}
                </select>
              </div>
            </div>
            <div className="grid grid-cols-3 gap-2">
              <div className="space-y-1">
                <Label className="text-[--text-muted]">Beklenen</Label>
                <Input type="number" min="0" value={rcExpectedQty} onChange={(e) => setRcExpectedQty(e.target.value)} className="bg-[--page] border-[--line] text-[--text] font-mono" />
              </div>
              <div className="space-y-1">
                <Label className="text-[--text-muted]">Sağlam Gelen</Label>
                <Input type="number" min="0" value={rcGoodQty} onChange={(e) => setRcGoodQty(e.target.value)} className="bg-[--page] border-[--line] text-[--ok] font-mono font-semibold" />
              </div>
              <div className="space-y-1">
                <Label className="text-[--text-muted]">Hasarlı (Karantina)</Label>
                <Input type="number" min="0" value={rcDamagedQty} onChange={(e) => setRcDamagedQty(e.target.value)} className="bg-[--page] border-[--line] text-[--bad] font-mono font-semibold" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2.5">
              <div className="space-y-1">
                <Label className="text-[--text-muted]">Lot / Parti No</Label>
                <Input value={rcLotNumber} onChange={(e) => setRcLotNumber(e.target.value)} className="bg-[--page] border-[--line] text-[--text] font-mono" />
              </div>
              <div className="space-y-1">
                <Label className="text-[--text-muted]">SKT (Expiry)</Label>
                <Input type="date" value={rcExpiryDate} onChange={(e) => setRcExpiryDate(e.target.value)} className="bg-[--page] border-[--line] text-[--text]" />
              </div>
            </div>
            <div className="space-y-1">
              <Label className="text-[--text-muted]">Put-Away Hedef Raf Önerisi</Label>
              <select value={rcTargetBinId} onChange={(e) => setRcTargetBinId(e.target.value)} className="w-full h-9 rounded-lg bg-[--page] border border-[--line] px-2 text-[--text] font-mono">
                <option value="" className="bg-white">Otomatik Kural Motoru Seçsin</option>
                {putawayPreview.map((c: any) => (
                  <option key={c.binId} value={c.binId} className="bg-white">
                    ★ {c.binCode} ({c.zoneName} • Skor {c.score} • {c.reasons?.[0] || "Uygun"})
                  </option>
                ))}
                {bins.filter((b: any) => b.warehouseId === rcWhId && !b.isBlocked).map((b: any) => (
                  <option key={b.id} value={b.id} className="bg-white">{b.code} — {b.zone?.name || "Raf"}</option>
                ))}
              </select>
            </div>
            <DialogFooter className="gap-2 pt-2">
              <Button type="button" variant="outline" onClick={() => setIsReceiptModalOpen(false)} className="border-[--line] bg-white text-[--text-2] hover:bg-[--muted-bg] rounded-full cursor-pointer">Vazgeç</Button>
              <Button type="submit" disabled={modalLoading} className="bg-[--brand] text-white hover:bg-[--brand-hover] font-semibold rounded-full shadow-sm cursor-pointer disabled:opacity-50">
                {modalLoading ? "İşleniyor..." : "Mal Kabulü Stok Defterine İşle"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* 2. PUT-AWAY YERLEŞTİRME DİREKTİF KURALLARI MODALI */}
      <Dialog open={isDirectiveModalOpen} onOpenChange={setIsDirectiveModalOpen}>
        <DialogContent className="sm:max-w-lg bg-white border border-[--line] text-[--text] rounded-2xl shadow-2xl p-6">
          <DialogHeader>
            <DialogTitle className="text-base text-[--text]">Put-Away Yönlendirme Kural Motoru</DialogTitle>
            <DialogDescription className="text-xs text-[--text-muted]">
              Ürün kategorisi, ABC sınıfı veya soğuk zincir gereksinimine göre hedef raf bölgesini belirleyin.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 text-xs">
            <div className="max-h-40 overflow-y-auto space-y-1.5">
              {directives.length === 0 ? (
                <div className="text-[--text-muted] italic p-2">Kayıtlı direktif bulunamadı.</div>
              ) : (
                directives.map((d: any) => (
                  <div key={d.id} className="p-2.5 bg-[--page] border border-[--line] rounded-xl flex items-center justify-between">
                    <div>
                      <div className="font-semibold text-[--text]">{d.name}</div>
                      <div className="text-[11px] text-[--text-muted] font-mono">
                        Hedef: {d.targetZoneCode} • Strateji: {d.strategy} • Kategori: {d.itemCategory || "Tümü"}
                      </div>
                    </div>
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-[--brand-soft] text-[--brand] border border-[--brand-line] font-mono">P{d.priority}</span>
                  </div>
                ))
              )}
            </div>
            <form onSubmit={handleSaveDirective} className="space-y-2.5 border-t border-[--line] pt-3">
              <div className="space-y-1">
                <Label className="text-[--text-muted]">Yeni Kural Adı</Label>
                <Input required value={dirName} onChange={(e) => setDirName(e.target.value)} className="bg-[--page] border-[--line] text-[--text]" />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                  <Label className="text-[--text-muted]">Hedef Bölge Kodu/Tipi</Label>
                  <select value={dirTargetZoneCode} onChange={(e) => setDirTargetZoneCode(e.target.value)} className="w-full h-9 rounded-lg bg-[--page] border border-[--line] px-2 text-[--text]">
                    <option value="COLD" className="bg-white">Soğuk Hava (COLD)</option>
                    <option value="COLD_STORAGE" className="bg-white">COLD_STORAGE</option>
                    <option value="FAST_PICK" className="bg-white">Hızlı Toplama (FAST_PICK)</option>
                    <option value="BULK_STORAGE" className="bg-white">Palet Depo (BULK_STORAGE)</option>
                  </select>
                </div>
                <div className="space-y-1">
                  <Label className="text-[--text-muted]">Yerleştirme Stratejisi</Label>
                  <select value={dirStrategy} onChange={(e) => setDirStrategy(e.target.value)} className="w-full h-9 rounded-lg bg-[--page] border border-[--line] px-2 text-[--text]">
                    <option value="FEFO_FIRST" className="bg-white">FEFO Öncelikli Konsolidasyon</option>
                    <option value="FIXED_BIN_CONSOLIDATE" className="bg-white">Sabit Raf / Aynı SKU Konsolidasyonu</option>
                    <option value="EMPTY_BIN_LOWEST_LEVEL" className="bg-white">En Alt Boş Raf</option>
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                  <Label className="text-[--text-muted]">Kategori Filtresi</Label>
                  <Input value={dirCategory} onChange={(e) => setDirCategory(e.target.value)} placeholder="ALL veya Kesme Çiçek" className="bg-[--page] border-[--line] text-[--text]" />
                </div>
                <div className="space-y-1">
                  <Label className="text-[--text-muted]">ABC Sınıfı</Label>
                  <select value={dirAbc} onChange={(e) => setDirAbc(e.target.value)} className="w-full h-9 rounded-lg bg-[--page] border border-[--line] px-2 text-[--text]">
                    <option value="ALL" className="bg-white">Tüm Sınıflar</option>
                    <option value="A" className="bg-white">Sınıf A</option>
                    <option value="B" className="bg-white">Sınıf B</option>
                    <option value="C" className="bg-white">Sınıf C</option>
                  </select>
                </div>
              </div>
              <DialogFooter className="gap-2 pt-2">
                <Button type="button" variant="outline" onClick={() => setIsDirectiveModalOpen(false)} className="border-[--line] bg-white text-[--text-2] hover:bg-[--muted-bg] rounded-full cursor-pointer">Kapat</Button>
                <Button type="submit" disabled={modalLoading} className="bg-[--brand] text-white hover:bg-[--brand-hover] font-semibold rounded-full shadow-sm cursor-pointer disabled:opacity-50">Direktifi Ekle</Button>
              </DialogFooter>
            </form>
          </div>
        </DialogContent>
      </Dialog>

      {/* 3. DALGA TOPLAMA (WAVE PICK) OLUŞTURMA MODALI */}
      <Dialog open={isWaveModalOpen} onOpenChange={setIsWaveModalOpen}>
        <DialogContent className="sm:max-w-md bg-white border border-[--line] text-[--text] rounded-2xl shadow-2xl p-6">
          <DialogHeader>
            <DialogTitle className="text-base text-[--text]">Dalga Toplama (Wave Pick — FEFO & Koridor Sıralı)</DialogTitle>
            <DialogDescription className="text-xs text-[--text-muted]">
              Karantina ve süresi dolmuş lotları atlayarak koridor sırasına göre toplama görevi planlar.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleCreateWavePick} className="space-y-3 text-xs">
            <div className="space-y-1">
              <Label className="text-[--text-muted]">Depo</Label>
              <select value={wvWhId} onChange={(e) => setWvWhId(e.target.value)} className="w-full h-9 rounded-lg bg-[--page] border border-[--line] px-2 text-[--text]">
                {warehouses.map((w: any) => (
                  <option key={w.id} value={w.id} className="bg-white text-[--text]">{w.name}</option>
                ))}
              </select>
            </div>
            <div className="space-y-1">
              <Label className="text-[--text-muted]">Toplanacak Ürün</Label>
              <select value={wvItemId || items[0]?.id || ""} onChange={(e) => setWvItemId(e.target.value)} className="w-full h-9 rounded-lg bg-[--page] border border-[--line] px-2 text-[--text]">
                {items.map((it: any) => (
                  <option key={it.id} value={it.id} className="bg-white text-[--text]">{it.name} ({it.sku})</option>
                ))}
              </select>
            </div>
            <div className="grid grid-cols-3 gap-2">
              <div className="space-y-1">
                <Label className="text-[--text-muted]">Miktar</Label>
                <Input type="number" min="1" value={wvQty} onChange={(e) => setWvQty(e.target.value)} className="bg-[--page] border-[--line] text-[--text] font-mono" />
              </div>
              <div className="space-y-1">
                <Label className="text-[--text-muted]">Öncelik</Label>
                <select value={wvPriority} onChange={(e) => setWvPriority(e.target.value)} className="w-full h-9 rounded-lg bg-[--page] border border-[--line] px-2 text-[--text]">
                  <option value="URGENT" className="bg-white text-[--text]">Acil</option>
                  <option value="HIGH" className="bg-white text-[--text]">Yüksek</option>
                  <option value="NORMAL" className="bg-white text-[--text]">Normal</option>
                </select>
              </div>
              <div className="space-y-1">
                <Label className="text-[--text-muted]">Operatör</Label>
                <Input value={wvOperator} onChange={(e) => setWvOperator(e.target.value)} className="bg-[--page] border-[--line] text-[--text]" />
              </div>
            </div>
            <DialogFooter className="gap-2 pt-2">
              <Button type="button" variant="outline" onClick={() => setIsWaveModalOpen(false)} className="border-[--line] bg-white text-[--text-2] hover:bg-[--muted-bg] rounded-full cursor-pointer">Vazgeç</Button>
              <Button type="submit" disabled={modalLoading} className="bg-[--brand] text-white hover:bg-[--brand-hover] font-semibold rounded-full shadow-sm cursor-pointer disabled:opacity-50">Wave Pick Başlat</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* 4. KISMİ / SHORT-PICK GÖREV YÜRÜTME MODALI */}
      <Dialog open={Boolean(shortExecTask)} onOpenChange={(o) => !o && setShortExecTask(null)}>
        <DialogContent className="sm:max-w-lg bg-white border border-[--line] text-[--text] rounded-2xl shadow-2xl p-6">
          <DialogHeader>
            <DialogTitle className="text-base text-[--text]">Kısmi / Short-Pick İşleme — {shortExecTask?.taskNumber}</DialogTitle>
            <DialogDescription className="text-xs text-[--text-muted]">
              Rafta beklenen miktardan az stok bulunması durumunda toplanan net miktarı ve kısa toplama nedenini girin.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 max-h-72 overflow-y-auto text-xs">
            {(shortExecTask?.lines || []).map((ln) => (
              <div key={ln.id} className="p-3 bg-[--page] border border-[--line] rounded-xl space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-[--text]">{ln.itemName}</span>
                  <span className="font-mono text-[--text-muted]">Beklenen: {safeNumber(ln.expectedQty, 0)} {ln.unit}</span>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <Label className="text-[11px] text-[--text-muted]">İşlenen Net Miktar</Label>
                    <Input
                      type="number"
                      min="0"
                      value={execQtyByLine[ln.id] ?? String(ln.expectedQty)}
                      onChange={(e) => setExecQtyByLine({ ...execQtyByLine, [ln.id]: e.target.value })}
                      className="bg-white border-[--line] text-[--text] font-mono h-8 mt-1"
                    />
                  </div>
                  <div>
                    <Label className="text-[11px] text-[--text-muted]">Eksik / Short-Pick Nedeni</Label>
                    <Input
                      placeholder="Örn. Rafta fiziksel eksik / solmuş"
                      value={shortReasonByLine[ln.id] ?? ""}
                      onChange={(e) => setShortReasonByLine({ ...shortReasonByLine, [ln.id]: e.target.value })}
                      className="bg-white border-[--line] text-[--text] h-8 mt-1"
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
          <DialogFooter className="gap-2 pt-2">
            <Button type="button" variant="outline" onClick={() => setShortExecTask(null)} className="border-[--line] bg-white text-[--text-2] hover:bg-[--muted-bg] rounded-full cursor-pointer">Vazgeç</Button>
            <Button type="button" disabled={modalLoading} onClick={handleCompleteShortExec} className="bg-[--warn-fill] hover:bg-[--warn-fill]/90 text-white font-semibold rounded-full shadow-sm cursor-pointer disabled:opacity-50">
              {modalLoading ? "İşleniyor..." : "Kısmi Miktar ile Tamamla"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
