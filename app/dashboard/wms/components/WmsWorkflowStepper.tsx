"use client"

import React, { useState } from "react"
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
import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"
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
    <div className="space-y-4">
      {/* 1. ADIM ADIM İŞ AKIŞI SİHİRBAZI (STEPPER HEADER) */}
      <div className="bg-white rounded-xl border border-slate-200/80 p-2 sm:p-3 shadow-xs">
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-1.5 sm:gap-2">
          {STEPS.map(step => {
            const Icon = step.icon
            const isActive = activeStage === step.stage
            const count = getStageCount(step.stage)

            return (
              <button
                key={step.stage}
                onClick={() => setActiveStage(step.stage)}
                className={`p-2.5 sm:p-3 rounded-lg border text-left transition-all flex flex-col justify-between relative overflow-hidden ${
                  isActive
                    ? "bg-indigo-50/80 border-indigo-300 ring-1 ring-indigo-400 shadow-xs"
                    : "bg-slate-50/70 border-slate-200/70 hover:bg-slate-100/80 text-slate-700"
                }`}
              >
                <div className="flex items-center justify-between w-full mb-1">
                  <div
                    className={`h-7 w-7 rounded-md flex items-center justify-center ${
                      isActive ? "bg-indigo-600 text-white" : "bg-slate-200 text-slate-700"
                    }`}
                  >
                    <Icon className="h-4 w-4" />
                  </div>
                  {count > 0 ? (
                    <Badge
                      variant="secondary"
                      className={`text-[10px] px-1.5 py-0 font-bold ${
                        isActive
                          ? "bg-indigo-600 text-white"
                          : "bg-slate-200 text-slate-700"
                      }`}
                    >
                      {count}
                    </Badge>
                  ) : (
                    <span className="text-[10px] text-slate-400">0</span>
                  )}
                </div>

                <div>
                  <div className={`text-xs font-bold ${isActive ? "text-indigo-950" : "text-slate-900"}`}>
                    {step.title}
                  </div>
                  <div className="text-[10px] text-slate-500 truncate">
                    {step.subTitle}
                  </div>
                </div>

                {isActive && (
                  <div className="absolute bottom-0 inset-x-0 h-0.5 bg-indigo-600" />
                )}
              </button>
            )
          })}
        </div>
      </div>

      {/* 2. AKTİF AŞAMA AÇIKLAMA KUTUSU */}
      <div className="rounded-xl border border-indigo-100 bg-gradient-to-r from-indigo-50/60 via-blue-50/40 to-white p-3.5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 text-xs">
        <div className="flex items-center gap-2 text-indigo-900">
          <currentStepMeta.icon className="h-4 w-4 text-indigo-600 shrink-0" />
          <span className="font-semibold">{currentStepMeta.title}:</span>
          <span className="text-slate-600">{currentStepMeta.description}</span>
        </div>
        <div className="text-[11px] text-slate-500 shrink-0">
          Bekleyen: <strong>{currentStageTasks.length}</strong> görev
        </div>
      </div>

      {/* 3. AŞAMADAKİ GÖREV KARTLARI */}
      {currentStageTasks.length === 0 ? (
        <div className="bg-white rounded-xl border border-slate-200/80 p-8 text-center space-y-2">
          <div className="h-12 w-12 rounded-full bg-slate-100 text-slate-400 mx-auto flex items-center justify-center">
            <CheckCircle2 className="h-6 w-6 text-emerald-500" />
          </div>
          <div className="text-sm font-semibold text-slate-800">
            Bu Aşamada Bekleyen Görev Yok
          </div>
          <p className="text-xs text-slate-500 max-w-sm mx-auto">
            {currentStepMeta.title} aşamasındaki tüm işlemler tamamlandı veya henüz yeni bir görev oluşturulmadı.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {currentStageTasks.map(task => {
            const isAdvancing = advancingTaskId === task.id
            const firstLine = task.lines?.[0]
            const lineCount = task.lines?.length || 1

            return (
              <Card
                key={task.id}
                className="border-slate-200/80 hover:border-indigo-200 shadow-xs transition-all overflow-hidden"
              >
                <CardContent className="p-4 space-y-3">
                  {/* Başlık ve Doküman Bilgisi */}
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-xs sm:text-sm text-slate-900">
                          {task.taskNumber}
                        </span>
                        <Badge
                          variant="outline"
                          className={`text-[10px] uppercase font-bold ${
                            task.priority === "HIGH"
                              ? "bg-rose-50 border-rose-200 text-rose-700"
                              : "bg-slate-50 border-slate-200 text-slate-700"
                          }`}
                        >
                          {task.priority === "HIGH" ? "Öncelikli" : "Normal"}
                        </Badge>
                      </div>
                      <div className="flex items-center gap-1.5 text-[11px] text-slate-500 font-mono mt-0.5">
                        <span>{task.sourceDocType}</span>
                        <span>•</span>
                        <span>{task.sourceDocNo}</span>
                      </div>
                    </div>

                    <Badge
                      className={`text-[10px] font-semibold ${
                        task.status === "IN_PROGRESS"
                          ? "bg-blue-100 text-blue-800"
                          : "bg-amber-100 text-amber-800"
                      }`}
                    >
                      {task.status === "IN_PROGRESS" ? "İşlemde" : "Bekliyor"}
                    </Badge>
                  </div>

                  {/* Kalem ve Ürün Bilgisi */}
                  {firstLine && (
                    <div className="bg-slate-50 rounded-lg p-2.5 border border-slate-100 space-y-1">
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-semibold text-slate-900">{firstLine.itemName}</span>
                        <span className="font-bold text-indigo-700 font-mono">
                          {firstLine.expectedQty} {firstLine.unit}
                        </span>
                      </div>
                      <div className="flex items-center justify-between text-[11px] text-slate-500 font-mono">
                        <span>SKU: {firstLine.sku}</span>
                        {firstLine.suggestedToBin && (
                          <span className="text-emerald-700 font-semibold">
                            Hedef Raf: {firstLine.suggestedToBin}
                          </span>
                        )}
                        {firstLine.suggestedFromBin && (
                          <span className="text-purple-700 font-semibold">
                            Kaynak Raf: {firstLine.suggestedFromBin}
                          </span>
                        )}
                      </div>
                      {lineCount > 1 && (
                        <div className="text-[10px] text-slate-400 italic pt-0.5">
                          + {lineCount - 1} diğer ürün kalemi
                        </div>
                      )}
                    </div>
                  )}

                  {/* Atanan Personel ve Not */}
                  <div className="flex items-center justify-between text-[11px] text-slate-500">
                    <div className="flex items-center gap-1">
                      <User className="h-3 w-3 text-slate-400" />
                      <span>{task.assignedOperator || "Atanmadı"}</span>
                    </div>
                    {task.partnerName && (
                      <span className="truncate max-w-[160px] text-slate-600">
                        {task.partnerName}
                      </span>
                    )}
                  </div>

                  {/* EYLEM BUTONU: SONRAKİ AŞAMAYA İLERLET */}
                  <div className="pt-1 border-t border-slate-100 flex items-center justify-between">
                    <span className="text-[11px] text-slate-400">
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
                      className="h-8 px-3 text-xs font-semibold bg-indigo-600 hover:bg-indigo-700 text-white gap-1"
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
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}
    </div>
  )
}

