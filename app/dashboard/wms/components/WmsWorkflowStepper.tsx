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
  FileText,
  Boxes,
  Layers,
  ChevronRight,
  RefreshCw,
  Sparkles
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
  color: string
}> = [
  {
    stage: "GOODS_RECEIPT",
    stepNumber: 1,
    title: "1. Mal Kabul",
    subTitle: "Rampa & İrsaliye Eşleme",
    description: "Tedarikçiden veya ithalattan gelen sevkiyatın rampa girişi ve ilk kontrolü.",
    icon: Truck,
    color: "emerald"
  },
  {
    stage: "QC_INSPECTION",
    stepNumber: 2,
    title: "2. Kalite Kontrol",
    subTitle: "Tazelik, Sıcaklık & Muayene",
    description: "Çiçeklerin tazeliği, gonca açıklığı ve hasar durumu kontrol edilir.",
    icon: ShieldCheck,
    color: "blue"
  },
  {
    stage: "PUTAWAY",
    stepNumber: 3,
    title: "3. Rafa Yerleştirme",
    subTitle: "Hedef Hücreye İstif (Put-away)",
    description: "Onaylanan ürünler sistemin önerdiği raf hücresine (StorageBin) yerleştirilir ve stok artar.",
    icon: MapPin,
    color: "indigo"
  },
  {
    stage: "WAVE_PICK",
    stepNumber: 4,
    title: "4. Sipariş Toplama",
    subTitle: "SKT Öncelikli Çıkış (FEFO Pick)",
    description: "Müşteri ve mağaza siparişleri raftan toplanır, stok anında güncellenir.",
    icon: PackageCheck,
    color: "purple"
  },
  {
    stage: "PACKING",
    stepNumber: 5,
    title: "5. Paketleme & Sevkiyat",
    subTitle: "Koli Kapama & Kargo Teslim",
    description: "Toplanan siparişler paketlenir, sevk irsaliyesi ve kargo barkodu basılır.",
    icon: QrCode,
    color: "amber"
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
      {/* 1. ADIM ADIM İŞ AKIŞI SİHİRBAZI (PARLAK ÇİZGİLİ CAM ADIMLAR) */}
      <div className="glass-panel rounded-2xl p-3">
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5">
          {STEPS.map(step => {
            const Icon = step.icon
            const isActive = activeStage === step.stage
            const count = getStageCount(step.stage)

            return (
              <motion.button
                key={step.stage}
                whileHover={{ y: -2 }}
                onClick={() => setActiveStage(step.stage)}
                className={`p-3.5 rounded-xl border text-left transition-all flex flex-col justify-between relative overflow-hidden backdrop-blur-md ${
                  isActive
                    ? "bg-gradient-to-br from-indigo-500/20 via-slate-900/80 to-sky-500/15 border-indigo-400/50 ring-1 ring-indigo-400/40 shadow-[0_0_25px_rgba(99,102,241,0.2)]"
                    : "bg-white/5 border-white/10 hover:bg-white/10 hover:border-white/25 text-white/70"
                }`}
              >
                <div className="flex items-center justify-between w-full mb-2">
                  <div
                    className={`h-8 w-8 rounded-lg flex items-center justify-center border transition-all ${
                      isActive
                        ? "bg-indigo-500/30 border-indigo-400/50 text-indigo-300 shadow-[0_0_12px_rgba(99,102,241,0.35)]"
                        : "bg-white/5 border-white/10 text-white/60"
                    }`}
                  >
                    <Icon className="h-4 w-4" />
                  </div>
                  {count > 0 ? (
                    <span
                      className={`rounded-full px-2.5 py-0.5 text-xs font-bold border ${
                        isActive
                          ? "bg-indigo-500/25 text-indigo-200 border-indigo-400/40"
                          : "bg-white/10 text-white/70 border-white/15"
                      }`}
                    >
                      {count}
                    </span>
                  ) : (
                    <span className="text-[11px] text-white/30 font-mono">0</span>
                  )}
                </div>

                <div>
                  <div className={`text-xs font-bold ${isActive ? "text-white" : "text-white/85"}`}>
                    {step.title}
                  </div>
                  <div className="text-[11px] text-white/50 truncate mt-0.5">
                    {step.subTitle}
                  </div>
                </div>

                {isActive && (
                  <div className="absolute bottom-0 inset-x-0 h-0.5 bg-gradient-to-r from-indigo-400 via-sky-400 to-emerald-400" />
                )}
              </motion.button>
            )
          })}
        </div>
      </div>

      {/* 2. AKTİF AŞAMA AÇIKLAMA KUTUSU */}
      <div className="rounded-2xl border border-white/15 bg-gradient-to-r from-indigo-500/10 via-slate-900/60 to-sky-500/10 backdrop-blur-xl p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 text-xs">
        <div className="flex items-center gap-2.5 text-white">
          <div className="h-7 w-7 rounded-lg bg-indigo-500/20 border border-indigo-500/30 flex items-center justify-center shrink-0">
            <currentStepMeta.icon className="h-4 w-4 text-indigo-300" />
          </div>
          <span className="font-semibold text-indigo-300">{currentStepMeta.title}:</span>
          <span className="text-white/75">{currentStepMeta.description}</span>
        </div>
        <div className="text-xs text-white/60 shrink-0">
          Bekleyen: <strong className="text-white font-bold">{currentStageTasks.length}</strong> görev
        </div>
      </div>

      {/* 3. AŞAMADAKİ GÖREV KARTLARI */}
      {currentStageTasks.length === 0 ? (
        <div className="glass-card rounded-2xl p-10 text-center space-y-2.5">
          <div className="h-12 w-12 rounded-full bg-emerald-500/15 border border-emerald-500/30 mx-auto flex items-center justify-center">
            <CheckCircle2 className="h-6 w-6 text-emerald-400" />
          </div>
          <div className="text-sm font-semibold text-white">
            Bu Aşamada Bekleyen Görev Yok
          </div>
          <p className="text-xs text-white/50 max-w-sm mx-auto">
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
                className="glass-card p-5 rounded-2xl space-y-3.5 hover:border-indigo-400/30"
              >
                {/* Başlık ve Doküman Bilgisi */}
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-sm text-white">
                        {task.taskNumber}
                      </span>
                      <span
                        className={`rounded-full px-3 py-0.5 text-xs font-semibold border ${
                          task.priority === "HIGH" || task.priority === "URGENT"
                            ? "bg-rose-500/15 text-rose-300 border-rose-500/30"
                            : "bg-white/10 text-white/70 border-white/15"
                        }`}
                      >
                        {task.priority === "HIGH" || task.priority === "URGENT" ? "Öncelikli" : "Normal"}
                      </span>
                    </div>
                    <div className="flex items-center gap-1.5 text-[11px] text-white/50 font-mono mt-1">
                      <span>{task.sourceDocType}</span>
                      <span>•</span>
                      <span>{task.sourceDocNo}</span>
                    </div>
                  </div>

                  <span
                    className={`rounded-full px-3 py-0.5 text-xs font-semibold border ${
                      task.status === "IN_PROGRESS"
                        ? "bg-sky-500/15 text-sky-300 border-sky-500/30"
                        : "bg-amber-500/15 text-amber-300 border-amber-500/30"
                    }`}
                  >
                    {task.status === "IN_PROGRESS" ? "İşlemde" : "Bekliyor"}
                  </span>
                </div>

                {/* Kalem ve Ürün Bilgisi */}
                {firstLine && (
                  <div className="bg-black/25 rounded-xl p-3 border border-white/10 space-y-1.5">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-semibold text-white">{firstLine.itemName}</span>
                      <span className="font-bold text-indigo-300 font-mono">
                        {firstLine.expectedQty} {firstLine.unit}
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-[11px] text-white/50 font-mono">
                      <span>SKU: {firstLine.sku}</span>
                      {firstLine.suggestedToBin && (
                        <span className="text-emerald-400 font-semibold">
                          Hedef Raf: {firstLine.suggestedToBin}
                        </span>
                      )}
                      {firstLine.suggestedFromBin && (
                        <span className="text-purple-400 font-semibold">
                          Kaynak Raf: {firstLine.suggestedFromBin}
                        </span>
                      )}
                    </div>
                    {lineCount > 1 && (
                      <div className="text-[10px] text-white/40 italic pt-0.5">
                        + {lineCount - 1} diğer ürün kalemi
                      </div>
                    )}
                  </div>
                )}

                {/* Atanan Personel ve Not */}
                <div className="flex items-center justify-between text-xs text-white/60">
                  <div className="flex items-center gap-1.5">
                    <User className="h-3.5 w-3.5 text-white/40" />
                    <span>{task.assignedOperator || "Atanmadı"}</span>
                  </div>
                  {task.partnerName && (
                    <span className="truncate max-w-[160px] text-white/70">
                      {task.partnerName}
                    </span>
                  )}
                </div>

                {/* EYLEM BUTONU: SONRAKİ AŞAMAYA İLERLET */}
                <div className="pt-2 border-t border-white/10 flex items-center justify-between">
                  <span className="text-[11px] text-white/50">
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
                    className="h-8 px-3.5 text-xs font-semibold bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl shadow-lg shadow-indigo-500/20 gap-1.5"
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
