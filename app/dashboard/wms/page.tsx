"use client"

import React, { useState, useEffect, useMemo } from "react"
import Link from "next/link"
import {
  Warehouse,
  MapPin,
  ClipboardCheck,
  PackageCheck,
  Truck,
  QrCode,
  Smartphone,
  ArrowRight,
  CheckCircle2,
  AlertTriangle,
  Layers,
  RefreshCw,
  EyeOff,
  Eye,
  Plus,
  Sparkles,
  Box,
  Compass,
  Check,
  ChevronRight,
  ShieldCheck,
  ArrowUpDown,
  SlidersHorizontal,
  Info
} from "lucide-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from "@/components/ui/select"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from "@/components/ui/dialog"
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle
} from "@/components/ui/sheet"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger
} from "@/components/ui/tooltip"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import { toast } from "sonner"
import { enterpriseInventoryService } from "@/lib/services/enterpriseInventorySuite"
import type { WmsOperationTask, WmsStorageBin } from "@/lib/services/wmsDirectiveEngine"

// 5 Adımlı Sadeleştirilmiş İş Akışı
const FRIENDLY_STEPS: {
  key: WmsOperationTask["workflowStage"]
  stepNumber: number
  title: string
  plainTitle: string
  actionPrompt: string
  icon: any
}[] = [
  {
    key: "GOODS_RECEIPT",
    stepNumber: 1,
    title: "1. Mal Kabul",
    plainTitle: "Kamyondan İndirme & Barkod Okutma",
    actionPrompt: "Gelen sevkiyatın barkodunu okutup rampa kabulünü onaylayın.",
    icon: Truck
  },
  {
    key: "QC_INSPECTION",
    stepNumber: 2,
    title: "2. Kalite Kontrol",
    plainTitle: "Tazelik, Sıcaklık & Hasar Testi",
    actionPrompt: "Ürünün sağlamlık ve kalite kriterlerine uygunluğunu onaylayın.",
    icon: ShieldCheck
  },
  {
    key: "PUTAWAY",
    stepNumber: 3,
    title: "3. Rafa Yerleştirme",
    plainTitle: "Sistemin Önerdiği Raf Hücresine İstif",
    actionPrompt: "Ürünü sistemin akıllı direktifle önerdiği raf hücresine bırakın.",
    icon: MapPin
  },
  {
    key: "WAVE_PICK",
    stepNumber: 4,
    title: "4. Sipariş Toplama",
    plainTitle: "SKT Öncelikli Çıkış (FEFO) ile Toplama",
    actionPrompt: "Sipariş kalemlerini en kısa rotada ve SKT sırasına göre toplayın.",
    icon: PackageCheck
  },
  {
    key: "PACKING",
    stepNumber: 5,
    title: "5. Paketleme & Sevkiyat",
    plainTitle: "Koli Kapama, Etiketleme & Kargoya Teslim",
    actionPrompt: "Paketi kapatıp koli/palet etiketini yapıştırın ve kargoya verin.",
    icon: QrCode
  }
]

export default function AdvancedWmsOperationsPage() {
  const [state, setState] = useState(() => enterpriseInventoryService.getState())
  const [activeTab, setActiveTab] = useState("wizard-flow")
  const [selectedWizardStep, setSelectedWizardStep] = useState<WmsOperationTask["workflowStage"]>("GOODS_RECEIPT")
  const [isExpertMode, setIsExpertMode] = useState<boolean>(false)

  // Bölge Filtresi (Raf Haritası)
  const [selectedZoneFilter, setSelectedZoneFilter] = useState<string>("ALL")
  const [selectedBinForDrawer, setSelectedBinForDrawer] = useState<WmsStorageBin | null>(null)
  const [isBinDrawerOpen, setIsBinDrawerOpen] = useState(false)

  // Kör Sayım Gizlilik Modu & Sayım Girişi
  const [selectedSessionId, setSelectedSessionId] = useState<string>("cnt-001")
  const [revealBlindSystemQty, setRevealBlindSystemQty] = useState(false)
  const [countInputs, setCountInputs] = useState<Record<string, string>>({})

  // Depolar Arası Transfer Modalı
  const [isTransferModalOpen, setIsTransferModalOpen] = useState(false)
  const [trfFromWh, setTrfFromWh] = useState("DEP-IST-MRK")
  const [trfToWh, setTrfToWh] = useState("DEP-ANK-BOL")
  const [trfSku, setTrfSku] = useState("SKU-FLR-001")
  const [trfQty, setTrfQty] = useState("48")
  const [trfLpn, setTrfLpn] = useState("LPN-TR-2026-000950")
  const [trfPlate, setTrfPlate] = useState("34 SNR 808")

  useEffect(() => {
    const refresh = () => setState({ ...enterpriseInventoryService.getState() })
    window.addEventListener("sunum-inventory-change", refresh)
    return () => window.removeEventListener("sunum-inventory-change", refresh)
  }, [])

  // Bölge bazında filtrelenmiş hücreler
  const filteredBins = useMemo(() => {
    const bins = state.wmsBins || []
    if (selectedZoneFilter === "ALL") return bins
    return bins.filter(b => b.zoneType === selectedZoneFilter)
  }, [state.wmsBins, selectedZoneFilter])

  // Aktif Sayım Oturumu
  const activeCountSession = useMemo(
    () => (state.countSessions || []).find(s => s.id === selectedSessionId) || (state.countSessions || [])[0] || null,
    [state.countSessions, selectedSessionId]
  )

  // Seçili Sihirbaz Adımındaki Görevler
  const currentStepTasks = useMemo(() => {
    return (state.wmsTasks || []).filter(t => t.workflowStage === selectedWizardStep)
  }, [state.wmsTasks, selectedWizardStep])

  // Toplam Bekleyen Görevler
  const activeTasksCount = (state.wmsTasks || []).filter(t => t.status !== "COMPLETED").length

  // Görevi Bir Sonraki Aşamaya İlerletme (İş Mantığı Korunur)
  const handleAdvanceTask = (taskId: string) => {
    const updated = enterpriseInventoryService.advanceWmsTaskStage(taskId)
    if (updated) {
      setState({ ...enterpriseInventoryService.getState() })
      if (updated.status === "COMPLETED") {
        toast.success(`${updated.taskNo} numaralı görev tamamen tamamlandı!`, {
          description: "Paket sevkiyata hazırlandı ve kargo etiketi üretildi."
        })
      } else {
        toast.success(`${updated.taskNo} sonraki aşamaya iletildi`, {
          description: `Yeni Aşama: ${updated.workflowStage}`
        })
      }
    }
  }

  // Yeni Transfer Emri
  const handleCreateTransfer = () => {
    if (trfFromWh === trfToWh) {
      toast.error("Kaynak ve hedef depo aynı olamaz.")
      return
    }
    const created = enterpriseInventoryService.createTransferOrder({
      fromWarehouseCode: trfFromWh,
      toWarehouseCode: trfToWh,
      sku: trfSku,
      quantity: Number(trfQty) || 24,
      lpnCode: trfLpn,
      carrierPlate: trfPlate
    })
    setState({ ...enterpriseInventoryService.getState() })
    setIsTransferModalOpen(false)
    toast.success(`${created.transferNo} Transfer Emri Oluşturuldu!`, {
      description: `LPN: ${created.lpnCode} • E-İrsaliye: ${created.eWaybillNo}`
    })
  }

  // Sayım Girişi
  const handleSaveCountLine = (lineId: string) => {
    if (!activeCountSession) return
    const val = Number(countInputs[lineId])
    if (isNaN(val) || val < 0) {
      toast.error("Lütfen geçerli bir sayım miktarı giriniz.")
      return
    }
    enterpriseInventoryService.submitBlindCountLine(activeCountSession.id, lineId, val)
    setState({ ...enterpriseInventoryService.getState() })
    toast.success("Hücre sayımı kaydedildi.")
  }

  // Sayım Mahsuplaşma (Envanter ve Finans Eşitleme)
  const handleReconcileSession = (sessionId: string) => {
    const reconciled = enterpriseInventoryService.reconcileCountSession(sessionId)
    if (reconciled) {
      setState({ ...enterpriseInventoryService.getState() })
      toast.success(`${reconciled.sessionNo} Mahsuplaşması Başarıyla Tamamlandı!`, {
        description: `Muhasebe Fişi: ${reconciled.reconciledJournalNo} • Stok bakiyeleri otomatik eşitlendi.`
      })
    }
  }

  const openBinDetails = (bin: WmsStorageBin) => {
    setSelectedBinForDrawer(bin)
    setIsBinDrawerOpen(true)
  }

  return (
    <TooltipProvider>
      <div className="space-y-6 p-4 sm:p-6 max-w-7xl mx-auto">
        {/* 1. ÜST AI ÖZET BARI VE HIZLI YÖNLENDİRME */}
        <div className="rounded-xl border border-indigo-100 bg-gradient-to-r from-blue-50/70 via-indigo-50/50 to-white p-4 sm:p-5 shadow-sm">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-start gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-indigo-600 text-white shadow">
                <Sparkles className="h-5 w-5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-base font-semibold text-slate-900">Depo & Saha Operasyonları Asistanı</h2>
                  <Badge variant="outline" className="border-indigo-200 bg-white text-indigo-700 text-xs">
                    Canlı Saha
                  </Badge>
                </div>
                <p className="mt-1 text-sm text-slate-600">
                  Bugün depoda <span className="font-semibold text-slate-900">{activeTasksCount} aktif görev</span> bulunuyor.
                  Rampa 2&apos;ye gelen sevkiyat kabul bekliyor, 2 palet rafa yerleştirilmeye hazır.
                </p>
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Link href="/dashboard/wms/mobil">
                <Button className="bg-slate-900 hover:bg-slate-800 text-white gap-1.5 shadow-sm" size="sm">
                  <Smartphone className="h-4 w-4 text-emerald-400" />
                  Saha & Terminal Modu (Mobil)
                </Button>
              </Link>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsTransferModalOpen(true)}
                className="bg-white border-slate-200 text-slate-700 hover:bg-slate-50 gap-1.5"
              >
                <Truck className="h-4 w-4 text-indigo-600" />
                Depolar Arası Transfer Aç
              </Button>
            </div>
          </div>
        </div>

        {/* 2. BAŞLIK VE MOD GEÇİŞİ */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b pb-4">
          <div>
            <div className="flex items-center gap-2">
              <Warehouse className="h-6 w-6 text-indigo-600" />
              <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900">
                Depo Yönetim Sistemi (WMS)
              </h1>
            </div>
            <p className="text-sm text-slate-500 mt-1">
              Mal kabulünden rafa yerleştirmeye, sipariş toplamadan sayıma kadar tüm depo süreçlerini adım adım yönetin.
            </p>
          </div>

          <div className="flex items-center gap-3 bg-slate-50 p-2 rounded-lg border border-slate-200">
            <span className="text-xs font-medium text-slate-600">Basit Görünüm</span>
            <Switch
              checked={isExpertMode}
              onCheckedChange={setIsExpertMode}
              id="wms-expert-mode"
            />
            <Label htmlFor="wms-expert-mode" className="text-xs font-semibold text-indigo-700 cursor-pointer flex items-center gap-1">
              <SlidersHorizontal className="h-3.5 w-3.5" />
              Uzman Direktifleri
            </Label>
          </div>
        </div>

        {/* 3. DÖRT BASİT METRİK KARTI */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          <Card className="border-slate-200/80 shadow-xs">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-slate-500">Aktif Depo Görevleri</span>
                <PackageCheck className="h-4 w-4 text-indigo-600" />
              </div>
              <div className="mt-2 flex items-baseline gap-2">
                <span className="text-2xl font-bold text-slate-900">{activeTasksCount}</span>
                <span className="text-xs text-slate-500">İş Emri</span>
              </div>
              <p className="mt-1 text-xs text-slate-500">
                Mal kabul, yerleştirme ve toplama
              </p>
            </CardContent>
          </Card>

          <Card className="border-slate-200/80 shadow-xs">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-slate-500">Depo Raf Hücreleri</span>
                <MapPin className="h-4 w-4 text-emerald-600" />
              </div>
              <div className="mt-2 flex items-baseline gap-2">
                <span className="text-2xl font-bold text-slate-900">{(state.wmsBins || []).length}</span>
                <span className="text-xs text-slate-500">Hücre / Raf</span>
              </div>
              <p className="mt-1 text-xs text-slate-500">
                Adreslenmiş depolama noktası
              </p>
            </CardContent>
          </Card>

          <Card className="border-slate-200/80 shadow-xs">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-slate-500">Palet / Koli Etiketleri (LPN)</span>
                <QrCode className="h-4 w-4 text-purple-600" />
              </div>
              <div className="mt-2 flex items-baseline gap-2">
                <span className="text-2xl font-bold text-slate-900">{(state.licensePlates || []).length}</span>
                <span className="text-xs text-slate-500">Aktif Palet</span>
              </div>
              <p className="mt-1 text-xs text-slate-500">
                Toplu taşınabilir konteyner
              </p>
            </CardContent>
          </Card>

          <Card className="border-slate-200/80 shadow-xs">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-slate-500">Sayım & Mahsup</span>
                <ClipboardCheck className="h-4 w-4 text-amber-600" />
              </div>
              <div className="mt-2 flex items-baseline gap-2">
                <span className="text-2xl font-bold text-slate-900">{(state.countSessions || []).length}</span>
                <span className="text-xs text-slate-500">Oturum</span>
              </div>
              <p className="mt-1 text-xs text-slate-500">
                Kör Sayım & Otomatik Mahsup
              </p>
            </CardContent>
          </Card>
        </div>

        {/* 4. MODÜL SEKMELERİ */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
          <TabsList className="bg-slate-100 p-1">
            <TabsTrigger value="wizard-flow" className="text-xs sm:text-sm gap-1.5">
              <Layers className="h-4 w-4" />
              Adım Adım Depo Süreç Sihirbazı
            </TabsTrigger>
            <TabsTrigger value="bin-map" className="text-xs sm:text-sm gap-1.5">
              <MapPin className="h-4 w-4" />
              Depo Hücre Haritası
            </TabsTrigger>
            <TabsTrigger value="transfers" className="text-xs sm:text-sm gap-1.5">
              <Truck className="h-4 w-4" />
              Palet (LPN) & Transfer
            </TabsTrigger>
            <TabsTrigger value="counting" className="text-xs sm:text-sm gap-1.5">
              <ClipboardCheck className="h-4 w-4" />
              Hızlı Sayım & Mahsup
            </TabsTrigger>
          </TabsList>

          {/* TAB 1: ADIM ADIM SİHİRBAZ (STEPPER WIZARD) */}
          <TabsContent value="wizard-flow" className="space-y-6">
            {/* 5 Aşamalı Görsel Stepper */}
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 bg-white p-3 rounded-xl border border-slate-200">
              {FRIENDLY_STEPS.map(step => {
                const isSelected = selectedWizardStep === step.key
                const stepTasks = (state.wmsTasks || []).filter(t => t.workflowStage === step.key)
                const StepIcon = step.icon

                return (
                  <button
                    key={step.key}
                    onClick={() => setSelectedWizardStep(step.key)}
                    className={`p-3 rounded-lg text-left transition-all relative flex flex-col justify-between ${
                      isSelected
                        ? "bg-indigo-50 border-2 border-indigo-600 shadow-xs"
                        : "bg-slate-50/70 border border-slate-200 hover:bg-slate-100"
                    }`}
                  >
                    <div className="flex items-center justify-between w-full">
                      <div className={`h-7 w-7 rounded-full flex items-center justify-center text-xs font-bold ${
                        isSelected ? "bg-indigo-600 text-white" : "bg-slate-200 text-slate-700"
                      }`}>
                        {step.stepNumber}
                      </div>
                      <Badge variant="secondary" className="text-[10px] font-mono">
                        {stepTasks.length} Görev
                      </Badge>
                    </div>

                    <div className="mt-2">
                      <div className="font-semibold text-xs text-slate-900 flex items-center gap-1">
                        <StepIcon className="h-3.5 w-3.5 text-indigo-600" />
                        {step.title}
                      </div>
                      <div className="text-[11px] text-slate-500 line-clamp-1 mt-0.5">
                        {step.plainTitle}
                      </div>
                    </div>
                  </button>
                )
              })}
            </div>

            {/* Aktif Adımın Görev Listesi ve Eylem Kartı */}
            <div className="space-y-4">
              <div className="bg-indigo-50/40 p-4 rounded-xl border border-indigo-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <h3 className="text-sm font-bold text-slate-900 flex items-center gap-1.5">
                    <CheckCircle2 className="h-4 w-4 text-indigo-600" />
                    {FRIENDLY_STEPS.find(s => s.key === selectedWizardStep)?.title} Aşamasındaki Görevler
                  </h3>
                  <p className="text-xs text-slate-600 mt-0.5">
                    {FRIENDLY_STEPS.find(s => s.key === selectedWizardStep)?.actionPrompt}
                  </p>
                </div>
                <Badge className="bg-indigo-600 text-white text-xs px-3 py-1">
                  {currentStepTasks.length} Görev Bekliyor
                </Badge>
              </div>

              {currentStepTasks.length === 0 ? (
                <div className="p-8 text-center bg-white border border-dashed rounded-xl text-slate-400">
                  Bu aşamada bekleyen operasyonel iş emri bulunmuyor. Diğer adımlara göz atabilirsiniz.
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {currentStepTasks.map(task => (
                    <Card key={task.id} className="border-slate-200 bg-white hover:border-indigo-200 transition-colors shadow-xs">
                      <CardHeader className="pb-3 border-b">
                        <div className="flex items-center justify-between">
                          <span className="font-mono text-xs font-bold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded">
                            {task.taskNo}
                          </span>
                          <div className="flex items-center gap-1.5">
                            {task.priority === "URGENT" && (
                              <Badge className="bg-rose-100 text-rose-700 border-rose-200 text-[10px]">
                                Acil
                              </Badge>
                            )}
                            <Badge variant="outline" className="text-[10px]">
                              {task.status}
                            </Badge>
                          </div>
                        </div>
                        <CardTitle className="text-base text-slate-900 mt-2">
                          {task.itemName}
                        </CardTitle>
                        <CardDescription className="font-mono text-xs">
                          SKU: {task.sku} • Hedef Miktar: <strong className="text-slate-800">{task.expectedQty} {task.unit}</strong>
                        </CardDescription>
                      </CardHeader>

                      <CardContent className="pt-3 space-y-3">
                        <div className="grid grid-cols-2 gap-2 bg-slate-50 p-2.5 rounded-lg text-xs font-mono">
                          <div>
                            <span className="text-slate-400 block text-[10px]">Kaynak Lokasyon:</span>
                            <span className="font-bold text-slate-800">{task.sourceBin}</span>
                          </div>
                          <div>
                            <span className="text-slate-400 block text-[10px]">Önerilen Hedef Hücre:</span>
                            <span className="font-bold text-indigo-700">{task.targetBin}</span>
                          </div>
                          {task.lpnCode && (
                            <div className="col-span-2 pt-1 border-t border-slate-200">
                              <span className="text-slate-400 text-[10px]">Palet / Koli No (LPN): </span>
                              <span className="font-bold text-slate-700">{task.lpnCode}</span>
                            </div>
                          )}
                        </div>

                        <div className="flex items-center justify-between text-xs text-slate-500">
                          <span>Saha Görevlisi: <strong>{task.assignedOperator}</strong></span>
                        </div>

                        {task.status !== "COMPLETED" && (
                          <Button
                            onClick={() => handleAdvanceTask(task.id)}
                            className="w-full bg-indigo-600 hover:bg-indigo-700 text-white text-xs h-9 gap-1.5"
                          >
                            <Check className="h-4 w-4" />
                            {selectedWizardStep === "PACKING"
                              ? "Paketlemeyi Bitir & Sevkiyata Ver"
                              : "Bu Adımı Onayla ve Sonrakine Geç"}
                          </Button>
                        )}
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </div>
          </TabsContent>

          {/* TAB 2: DEPO HÜCRE HARİTASI (RAF & BÖLGE YÖNETİMİ) */}
          <TabsContent value="bin-map" className="space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 bg-white p-3 rounded-lg border border-slate-200">
              <div>
                <h3 className="text-sm font-semibold text-slate-900">Depo Raf & Hücre Haritası</h3>
                <p className="text-xs text-slate-500">Hücre doluluk oranları, sıcaklık rejimleri ve içerideki ürünler.</p>
              </div>

              <Select value={selectedZoneFilter} onValueChange={setSelectedZoneFilter}>
                <SelectTrigger className="w-56 text-xs bg-slate-50">
                  <SelectValue placeholder="Bölge Filtrele" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">Tüm Bölgeler (Zones)</SelectItem>
                  <SelectItem value="Z1_COLD_FLORA">Z1 — Soğuk Hava (+2°C/+6°C)</SelectItem>
                  <SelectItem value="Z2_FAST_PICK">Z2 — Hızlı Toplama (Golden Zone)</SelectItem>
                  <SelectItem value="Z3_PALLET_RESERVE">Z3 — Yüksek Palet Rezerv</SelectItem>
                  <SelectItem value="Z4_PACKING">Z4 — Paketleme & Sevkiyat</SelectItem>
                  <SelectItem value="Z5_QUARANTINE">Z5 — Karantina & Blokeli</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              {filteredBins.map(bin => {
                const isFull = bin.occupancyPercent >= 80
                const isQuarantine = bin.status === "QUARANTINE_LOCKED"

                return (
                  <div
                    key={bin.id}
                    onClick={() => openBinDetails(bin)}
                    className={`p-3.5 rounded-xl border cursor-pointer transition-all hover:shadow-xs ${
                      isQuarantine
                        ? "border-rose-300 bg-rose-50/40"
                        : isFull
                          ? "border-amber-300 bg-amber-50/30"
                          : "border-slate-200 bg-white hover:border-indigo-300"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-mono text-xs font-bold text-slate-900 bg-slate-100 px-2 py-0.5 rounded">
                        {bin.binCode}
                      </span>
                      <Badge className={
                        isQuarantine ? "bg-rose-600 text-white" : isFull ? "bg-amber-600 text-white" : "bg-emerald-600 text-white"
                      }>
                        %{bin.occupancyPercent} Dolu
                      </Badge>
                    </div>

                    <div className="mt-2 text-xs font-semibold text-slate-700">{bin.zoneName}</div>

                    <div className="grid grid-cols-4 gap-1 text-center bg-slate-50 p-1.5 rounded text-[10px] mt-2 text-slate-600">
                      <div>Koridor: <strong>{bin.aisle}</strong></div>
                      <div>Raf: <strong>{bin.rack}</strong></div>
                      <div>Kat: <strong>{bin.level}</strong></div>
                      <div>Göz: <strong>{bin.position}</strong></div>
                    </div>

                    {bin.currentSku ? (
                      <div className="mt-2 p-2 bg-indigo-50/60 rounded text-xs">
                        <div className="font-semibold text-slate-900 truncate">{bin.currentItemName}</div>
                        <div className="font-mono text-[11px] text-indigo-700 mt-0.5">
                          {bin.currentSku} • <strong>{bin.currentQty} Adet</strong>
                        </div>
                      </div>
                    ) : (
                      <div className="mt-2 p-2 bg-slate-50 rounded text-xs text-center text-slate-400">
                        Boş Raf (İstife Hazır)
                      </div>
                    )}

                    <div className="mt-2 flex items-center justify-between text-[11px] text-slate-400">
                      <span>{bin.currentWeightKg}/{bin.maxWeightKg} kg</span>
                      <span>{bin.temperatureC}°C</span>
                    </div>
                  </div>
                )
              })}
            </div>

            {/* Uzman Modunda Lokasyon Direktifleri Tablosu */}
            {isExpertMode && (
              <Card className="border-slate-200 mt-6">
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2">
                    <Compass className="h-4 w-4 text-indigo-600" />
                    Otomatik Raf Yerleştirme Kuralları (Direktifler)
                  </CardTitle>
                  <CardDescription>
                    Ürün sıcaklığı ve ABC devir hızına göre hücre öneren akıllı kural motoru.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="overflow-x-auto rounded-lg border border-slate-200">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-slate-50 text-slate-600 uppercase border-b">
                        <tr>
                          <th className="p-2.5">Öncelik & Kod</th>
                          <th className="p-2.5">Kural Adı</th>
                          <th className="p-2.5">Operasyon</th>
                          <th className="p-2.5">Hedef Bölge</th>
                          <th className="p-2.5">Açıklama</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {state.directives.map(dir => (
                          <tr key={dir.id}>
                            <td className="p-2.5 font-mono font-bold text-indigo-700">#{dir.priority} • {dir.code}</td>
                            <td className="p-2.5 font-medium text-slate-900">{dir.name}</td>
                            <td className="p-2.5">
                              <Badge variant="outline" className="text-[10px]">{dir.operation}</Badge>
                            </td>
                            <td className="p-2.5 font-mono">{dir.targetZone}</td>
                            <td className="p-2.5 text-slate-600">{dir.ruleDescription}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {/* TAB 3: PALET (LPN) & TRANSFER EMİRLERİ */}
          <TabsContent value="transfers" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* LPN Palet Takibi */}
              <Card className="border-slate-200">
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2">
                    <QrCode className="h-4 w-4 text-purple-600" />
                    Palet ve Koli Kimlikleri (LPN / SSCC-18)
                  </CardTitle>
                  <CardDescription>
                    Tek bir palet barkodu ile içindeki tüm parti ve ürünleri topluca taşıyın.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  {state.licensePlates.map(lpn => (
                    <div key={lpn.id} className="p-3.5 bg-white border border-slate-200 rounded-xl space-y-2">
                      <div className="flex items-center justify-between">
                        <div>
                          <span className="font-mono text-sm font-bold text-purple-700">{lpn.lpnCode}</span>
                          <span className="text-xs text-slate-400 block font-mono">SSCC-18: {lpn.sscc18}</span>
                        </div>
                        <Badge className="bg-emerald-100 text-emerald-800">{lpn.status}</Badge>
                      </div>

                      <div className="flex items-center justify-between text-xs text-slate-600">
                        <span>Konum: <strong className="font-mono">{lpn.warehouseCode} / {lpn.currentBinCode}</strong></span>
                        <span>Ağırlık: <strong>{lpn.totalWeightKg} kg</strong></span>
                      </div>

                      <div className="bg-slate-50 p-2 rounded text-xs space-y-1">
                        {lpn.items.map((it, idx) => (
                          <div key={idx} className="flex justify-between">
                            <span><strong>{it.itemName}</strong> ({it.sku})</span>
                            <span className="font-mono font-bold text-slate-800">{it.qty} {it.unit}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </CardContent>
              </Card>

              {/* Transfer Emirleri */}
              <Card className="border-slate-200">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="text-base flex items-center gap-2">
                        <Truck className="h-4 w-4 text-indigo-600" />
                        Depolar Arası Sevkiyat Emirleri
                      </CardTitle>
                      <CardDescription>E-İrsaliye ve plaka bağlantılı transferler.</CardDescription>
                    </div>
                    <Button size="sm" onClick={() => setIsTransferModalOpen(true)} className="bg-indigo-600 text-white text-xs">
                      <Plus className="mr-1 h-3.5 w-3.5" />
                      Yeni Transfer
                    </Button>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  {state.transferOrders.map(trf => (
                    <div key={trf.id} className="p-3.5 bg-white border border-slate-200 rounded-xl space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="font-mono text-sm font-bold text-slate-900">{trf.transferNo}</span>
                        <Badge className="bg-blue-100 text-blue-800">{trf.status}</Badge>
                      </div>

                      <div className="flex items-center gap-2 text-xs font-medium text-slate-800">
                        <span>{trf.fromWarehouseName}</span>
                        <ArrowRight className="h-3.5 w-3.5 text-indigo-600" />
                        <span>{trf.toWarehouseName}</span>
                      </div>

                      <div className="text-xs text-slate-600">
                        Ürün: <strong>{trf.itemName}</strong> • <strong className="text-emerald-700">{trf.quantity} {trf.unit}</strong>
                      </div>

                      <div className="pt-2 border-t flex justify-between text-[11px] text-slate-400 font-mono">
                        <span>LPN: {trf.lpnCode}</span>
                        <span>Araç: {trf.carrierVehiclePlate}</span>
                        <span>İrsaliye: {trf.eWaybillNo}</span>
                      </div>
                    </div>
                  ))}
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* TAB 4: HIZLI SAYIM & FARK MAHSUPLAŞMASI */}
          <TabsContent value="counting" className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              {state.countSessions.map(sess => {
                const isSelected = activeCountSession?.id === sess.id

                return (
                  <div
                    key={sess.id}
                    onClick={() => setSelectedSessionId(sess.id)}
                    className={`p-3.5 rounded-xl border cursor-pointer transition-all ${
                      isSelected ? "border-indigo-600 bg-indigo-50/30 ring-2 ring-indigo-600/20" : "border-slate-200 bg-white hover:border-slate-300"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-mono text-xs font-bold text-slate-900">{sess.sessionNo}</span>
                      <Badge className={sess.countType === "BLIND_COUNT" ? "bg-slate-900 text-white" : "bg-indigo-600 text-white"}>
                        {sess.countType === "BLIND_COUNT" ? "Kör Sayım (Ezbersiz)" : "Döngüsel Sayım"}
                      </Badge>
                    </div>

                    <div className="font-semibold text-xs text-slate-800 mt-2">{sess.warehouseName}</div>

                    <div className="mt-2 flex justify-between text-xs text-slate-500">
                      <span>İlerleme: {sess.countedBinsCount}/{sess.totalBinsToCount} Hücre</span>
                      <span className={sess.totalVarianceTry < 0 ? "text-rose-600 font-bold" : "text-emerald-600 font-bold"}>
                        Fark: ₺{sess.totalVarianceTry.toLocaleString("tr-TR")}
                      </span>
                    </div>

                    <div className="mt-2 pt-2 border-t flex items-center justify-between text-[10px]">
                      <Badge variant="outline">{sess.status}</Badge>
                      {sess.reconciledJournalNo && (
                        <span className="font-mono text-emerald-700 font-semibold">{sess.reconciledJournalNo}</span>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>

            {activeCountSession && (
              <Card className="border-slate-200">
                <CardHeader>
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                    <div>
                      <CardTitle className="text-base flex items-center gap-2">
                        <ClipboardCheck className="h-4 w-4 text-indigo-600" />
                        {activeCountSession.sessionNo} — Sayım ve Fark Mutabakat Paneli
                      </CardTitle>
                      <CardDescription>
                        Fark tespit edilen ürünler tek tıkla envantere ve muhasebe mahsup fişine yansıtılır.
                      </CardDescription>
                    </div>

                    <div className="flex items-center gap-2">
                      {activeCountSession.isBlindMode && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setRevealBlindSystemQty(prev => !prev)}
                          className="text-xs"
                        >
                          {revealBlindSystemQty ? <EyeOff className="mr-1 h-3.5 w-3.5" /> : <Eye className="mr-1 h-3.5 w-3.5" />}
                          {revealBlindSystemQty ? "Kör Modu Aç" : "Sistem Miktarını Göster"}
                        </Button>
                      )}

                      {activeCountSession.status !== "RECONCILED" && (
                        <Button
                          size="sm"
                          onClick={() => handleReconcileSession(activeCountSession.id)}
                          className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs gap-1.5"
                        >
                          <CheckCircle2 className="h-4 w-4" />
                          Farkı Mahsuplaştır (Tek Tık)
                        </Button>
                      )}
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="overflow-x-auto rounded-lg border border-slate-200">
                    <table className="w-full text-xs text-left">
                      <thead className="bg-slate-50 text-slate-600 uppercase border-b">
                        <tr>
                          <th className="p-3">Hücre & Ürün</th>
                          <th className="p-3 text-right">Sistem Stoğu</th>
                          <th className="p-3 text-right">Sayılan Adet</th>
                          <th className="p-3 text-right">Fark</th>
                          <th className="p-3 text-right">Fark Tutarı</th>
                          <th className="p-3">Hızlı Miktar Girişi</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {activeCountSession.lines.map(line => {
                          const hideSystem = activeCountSession.isBlindMode && !revealBlindSystemQty && activeCountSession.status !== "RECONCILED"

                          return (
                            <tr key={line.id}>
                              <td className="p-3">
                                <div className="font-semibold text-slate-900">{line.itemName}</div>
                                <div className="font-mono text-slate-400 text-[11px]">
                                  {line.binCode} • Lot: {line.lotNumber}
                                </div>
                              </td>

                              <td className="p-3 text-right font-mono">
                                {hideSystem ? (
                                  <Badge variant="secondary" className="text-[10px]">🔒 GİZLİ</Badge>
                                ) : (
                                  <strong>{line.systemQty} {line.unit}</strong>
                                )}
                              </td>

                              <td className="p-3 text-right font-bold text-indigo-700">
                                {line.countedQty !== null ? `${line.countedQty} ${line.unit}` : "Girilmedi"}
                              </td>

                              <td className="p-3 text-right font-bold">
                                {hideSystem || line.countedQty === null ? (
                                  "-"
                                ) : (
                                  <span className={line.varianceQty < 0 ? "text-rose-600" : line.varianceQty > 0 ? "text-emerald-600" : "text-slate-500"}>
                                    {line.varianceQty > 0 ? `+${line.varianceQty}` : line.varianceQty}
                                  </span>
                                )}
                              </td>

                              <td className="p-3 text-right font-bold">
                                {hideSystem || line.countedQty === null ? (
                                  "-"
                                ) : (
                                  <span>₺{line.varianceCostTry.toLocaleString("tr-TR")}</span>
                                )}
                              </td>

                              <td className="p-3">
                                {activeCountSession.status !== "RECONCILED" ? (
                                  <div className="flex items-center gap-1.5 max-w-[160px]">
                                    <Input
                                      type="number"
                                      placeholder="Adet"
                                      className="h-8 text-xs bg-white"
                                      value={countInputs[line.id] ?? ""}
                                      onChange={e => setCountInputs(prev => ({ ...prev, [line.id]: e.target.value }))}
                                    />
                                    <Button size="sm" className="h-8 px-2.5 text-xs bg-indigo-600 text-white" onClick={() => handleSaveCountLine(line.id)}>
                                      Kaydet
                                    </Button>
                                  </div>
                                ) : (
                                  <Badge className="bg-emerald-100 text-emerald-800 text-[10px]">Mahsuplaştı</Badge>
                                )}
                              </td>
                            </tr>
                          )
                        })}
                      </tbody>
                    </table>
                  </div>
                </CardContent>
              </Card>
            )}
          </TabsContent>
        </Tabs>

        {/* 5. DEPOLAR ARASI TRANSFER MODALI */}
        <Dialog open={isTransferModalOpen} onOpenChange={setIsTransferModalOpen}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Truck className="h-5 w-5 text-indigo-600" />
                Depolar Arası Transfer Emri Aç
              </DialogTitle>
              <DialogDescription>
                Palet ve E-İrsaliye bağlantılı ürün transferini planlayın.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-3 py-2 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-xs">Çıkış Deposu</Label>
                  <Select value={trfFromWh} onValueChange={setTrfFromWh}>
                    <SelectTrigger className="mt-1">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {state.warehouses.map(w => (
                        <SelectItem key={w.id} value={w.code}>{w.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label className="text-xs">Varış Deposu</Label>
                  <Select value={trfToWh} onValueChange={setTrfToWh}>
                    <SelectTrigger className="mt-1">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {state.warehouses.map(w => (
                        <SelectItem key={w.id} value={w.code}>{w.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div>
                <Label className="text-xs">Transfer Edilecek Ürün</Label>
                <Select value={trfSku} onValueChange={setTrfSku}>
                  <SelectTrigger className="mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {state.items.map(i => (
                      <SelectItem key={i.id} value={i.sku}>{i.name} ({i.sku})</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-xs">Miktar (Adet)</Label>
                  <Input
                    type="number"
                    value={trfQty}
                    onChange={e => setTrfQty(e.target.value)}
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label className="text-xs">Taşıyıcı Araç Plakası</Label>
                  <Input
                    value={trfPlate}
                    onChange={e => setTrfPlate(e.target.value)}
                    className="mt-1"
                  />
                </div>
              </div>

              <div>
                <Label className="text-xs">Palet Kimliği (LPN / Barkod)</Label>
                <Input
                  value={trfLpn}
                  onChange={e => setTrfLpn(e.target.value)}
                  className="mt-1 font-mono"
                />
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setIsTransferModalOpen(false)}>Vazgeç</Button>
              <Button onClick={handleCreateTransfer} className="bg-indigo-600 hover:bg-indigo-700 text-white">
                Transfer Emrini Onayla
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* 6. HÜCRE DETAY ÇEKMECESİ (SHEET) */}
        <Sheet open={isBinDrawerOpen} onOpenChange={setIsBinDrawerOpen}>
          <SheetContent side="right" className="w-full sm:max-w-md p-6">
            {selectedBinForDrawer && (
              <div className="space-y-6">
                <SheetHeader>
                  <Badge className="w-fit bg-indigo-600 text-white font-mono">{selectedBinForDrawer.binCode}</Badge>
                  <SheetTitle className="text-lg font-bold text-slate-900 mt-1">
                    {selectedBinForDrawer.zoneName}
                  </SheetTitle>
                  <SheetDescription>
                    Depo Hücre Detayı ve Kapasite Analizi
                  </SheetDescription>
                </SheetHeader>

                <div className="space-y-3 bg-slate-50 p-4 rounded-xl text-xs">
                  <div className="flex justify-between">
                    <span className="text-slate-500">Doluluk Oranı:</span>
                    <strong className="text-indigo-700">%{selectedBinForDrawer.occupancyPercent}</strong>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Ağırlık Yükü:</span>
                    <strong>{selectedBinForDrawer.currentWeightKg} / {selectedBinForDrawer.maxWeightKg} kg</strong>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Sıcaklık:</span>
                    <strong>{selectedBinForDrawer.temperatureC}°C</strong>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Konum Koordinatı:</span>
                    <span className="font-mono">K:{selectedBinForDrawer.aisle} • R:{selectedBinForDrawer.rack} • K:{selectedBinForDrawer.level} • G:{selectedBinForDrawer.position}</span>
                  </div>
                </div>

                {selectedBinForDrawer.currentSku ? (
                  <div className="p-4 bg-white border border-slate-200 rounded-xl space-y-2 text-xs">
                    <span className="text-slate-400 block text-[10px] uppercase font-semibold">İçindeki Ürün</span>
                    <div className="font-bold text-slate-900 text-sm">{selectedBinForDrawer.currentItemName}</div>
                    <div className="font-mono text-indigo-700">{selectedBinForDrawer.currentSku}</div>
                    <div className="flex justify-between pt-2 border-t text-slate-600">
                      <span>Mevcut Adet: <strong>{selectedBinForDrawer.currentQty}</strong></span>
                      <span>Lot: <strong className="font-mono">{selectedBinForDrawer.currentLot}</strong></span>
                    </div>
                  </div>
                ) : (
                  <div className="p-4 text-center bg-slate-50 rounded-xl text-xs text-slate-400 border border-dashed">
                    Hücre şu an boş ve ürün yerleştirmeye uygundur.
                  </div>
                )}
              </div>
            )}
          </SheetContent>
        </Sheet>
      </div>
    </TooltipProvider>
  )
}
