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
  Clock,
  User,
  RefreshCw
} from "lucide-react"
import { Button } from "@/components/ui/button"
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

export function WmsWorkflowStepper({ tasks, onTaskUpdated }: WmsWorkflowStepperProps) {
  const [activeStage, setActiveStage] = useState<WmsWorkflowStage>("GOODS_RECEIPT")
  const [advancingTaskId, setAdvancingTaskId] = useState<string | null>(null)

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
        <div className="text-xs text-zinc-400 shrink-0 font-mono">
          Bekleyen: <strong className="text-white font-semibold">{currentStageTasks.length}</strong> görev
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

                {/* EYLEM BUTONU: SONRAKİ AŞAMAYA İLERLET */}
                <div className="pt-2.5 border-t border-white/[0.06] flex items-center justify-between">
                  <span className="text-[11px] text-zinc-500">
                    {activeStage === "PUTAWAY" && "⚡ Onaylandığında stoğa işlenir"}
                    {activeStage === "WAVE_PICK" && "⚡ Onaylandığında stoktan düşer"}
                    {activeStage === "GOODS_RECEIPT" && "Kalite kontrole aktarılır"}
                    {activeStage === "QC_INSPECTION" && "Rafa yerleştirmeye aktarılır"}
                    {activeStage === "PACKING" && "Sevkiyat tamamlanır"}
                  </span>

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
              </motion.div>
            )
          })}
        </div>
      )}
    </div>
  )
}
