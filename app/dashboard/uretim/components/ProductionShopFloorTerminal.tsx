"use client"

import React, { useState, useEffect, useCallback, useRef } from "react"
import { motion, AnimatePresence } from "framer-motion"
import {
  Play,
  Pause,
  CheckCircle2,
  AlertTriangle,
  QrCode,
  Barcode,
  Layers,
  Clock,
  User,
  Wrench,
  Boxes,
  RefreshCw,
  LogOut,
  Maximize2,
  Minimize2,
  Cpu,
  Flame,
  Volume2,
  ShieldAlert,
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
import { useAuth } from "@/lib/auth/context"

export function ProductionShopFloorTerminal() {
  const { user } = useAuth()
  const [operatorId, setOperatorId] = useState<string>(user?.id || "OPERATOR-01")
  const [operatorName, setOperatorName] = useState<string>(user?.name || "Atölye Operatörü")
  const [isPinModalOpen, setIsPinModalOpen] = useState(false)
  const [enteredPin, setEnteredPin] = useState("")

  // İş İstasyonu ve Terminal Verileri
  const [workCenters, setWorkCenters] = useState<any[]>([])
  const [selectedWorkCenterId, setSelectedWorkCenterId] = useState<string>("")
  const [terminalData, setTerminalData] = useState<any>(null)
  const [loading, setLoading] = useState(false)

  // Barkod / QR Girişi
  const [barcodeInput, setBarcodeInput] = useState("")
  const barcodeInputRef = useRef<HTMLInputElement>(null)

  // Duruş Bildirimi Modalı
  const [stoppageModalOpen, setStoppageModalOpen] = useState(false)
  const [selectedOperationForStoppage, setSelectedOperationForStoppage] = useState<any>(null)
  const [stoppageReason, setStoppageReason] = useState<string>("ARIZA")
  const [stoppageNotes, setStoppageNotes] = useState("")

  // İş Tamamlama & Üretim Girişi Modalı
  const [completeModalOpen, setCompleteModalOpen] = useState(false)
  const [selectedOperationForComplete, setSelectedOperationForComplete] = useState<any>(null)
  const [producedQty, setProducedQty] = useState<string>("")
  const [scrapQty, setScrapQty] = useState<string>("0")
  const [scrapReason, setScrapReason] = useState<string>("HAMMADDE_HATASI")
  const [actualMachineMinutes, setActualMachineMinutes] = useState<string>("")
  const [actualLaborMinutes, setActualLaborMinutes] = useState<string>("")

  // Tam ekran modu
  const [isFullscreen, setIsFullscreen] = useState(false)

  // Veri yükleme
  const fetchTerminalData = useCallback(async () => {
    setLoading(true)
    try {
      const q = selectedWorkCenterId ? `&workCenterId=${selectedWorkCenterId}` : ""
      const res = await fetch(`/api/production/work-orders?section=terminal${q}`)
      const data = await res.json()
      if (data.success && data.terminalData) {
        setTerminalData(data.terminalData)
        if (data.terminalData.workCenters && workCenters.length === 0) {
          setWorkCenters(data.terminalData.workCenters)
          if (!selectedWorkCenterId && data.terminalData.workCenters.length > 0) {
            setSelectedWorkCenterId(data.terminalData.workCenters[0].id)
          }
        }
      }
    } catch (err: any) {
      toast.error("Terminal verisi yüklenirken hata oluştu.")
    } finally {
      setLoading(false)
    }
  }, [selectedWorkCenterId, workCenters.length])

  useEffect(() => {
    fetchTerminalData()
    const interval = setInterval(fetchTerminalData, 15000)
    return () => clearInterval(interval)
  }, [fetchTerminalData])

  // Barkod Okutma Enter dinleyicisi
  const handleBarcodeSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault()
    if (!barcodeInput.trim()) return

    const code = barcodeInput.trim().toUpperCase()
    toast.info(`Barkod okundu: ${code}`)

    // Terminal içindeki iş emirlerinde eşleştir
    const foundOp = terminalData?.activeOperations?.find(
      (op: any) =>
        op.workOrder?.workOrderNumber?.toUpperCase() === code ||
        op.workOrder?.lotNumber?.toUpperCase() === code ||
        op.id?.toUpperCase() === code
    )

    if (foundOp) {
      toast.success(`İş Emri bulundu: ${foundOp.workOrder?.workOrderNumber} (Operasyon #${foundOp.operationNumber})`)
    } else {
      toast.warning(`Barkod ile eşleşen aktif operasyon bulunamadı: ${code}`)
    }
    setBarcodeInput("")
    if (barcodeInputRef.current) barcodeInputRef.current.focus()
  }

  // Operasyon Başlat
  const handleStartOperation = async (operationId: string) => {
    try {
      const res = await fetch("/api/production/work-orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "start_operation",
          operationId,
          workCenterId: selectedWorkCenterId || undefined,
        }),
      })
      const data = await res.json()
      if (data.success) {
        toast.success("Operasyon başlatıldı.")
        fetchTerminalData()
      } else {
        toast.error(data.error || "Operasyon başlatılamadı.")
      }
    } catch (err: any) {
      toast.error("Bağlantı hatası.")
    }
  }

  // Duruş Bildirimi
  const handlePauseOperation = async () => {
    if (!selectedOperationForStoppage) return
    try {
      const res = await fetch("/api/production/work-orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "pause_operation",
          operationId: selectedOperationForStoppage.id,
          reasonCode: stoppageReason,
          notes: stoppageNotes,
        }),
      })
      const data = await res.json()
      if (data.success) {
        toast.warning("Duruş kaydı açıldı, operasyon duraklatıldı.")
        setStoppageModalOpen(false)
        setSelectedOperationForStoppage(null)
        setStoppageNotes("")
        fetchTerminalData()
      } else {
        toast.error(data.error || "Duruş kaydı oluşturulamadı.")
      }
    } catch (err: any) {
      toast.error("Bağlantı hatası.")
    }
  }

  // Duruştan Devam Et
  const handleResumeOperation = async (operationId: string) => {
    try {
      const res = await fetch("/api/production/work-orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "resume_operation",
          operationId,
        }),
      })
      const data = await res.json()
      if (data.success) {
        toast.success("Duruş sonlandırıldı, operasyon devam ediyor.")
        fetchTerminalData()
      } else {
        toast.error(data.error || "Devam ettirilemedi.")
      }
    } catch (err: any) {
      toast.error("Bağlantı hatası.")
    }
  }

  // Operasyon Bitir & Çıktı Bildir
  const handleCompleteOperation = async () => {
    if (!selectedOperationForComplete) return
    const pQty = Number(producedQty)
    if (isNaN(pQty) || pQty < 0) {
      toast.error("Lütfen geçerli bir üretilen miktar girin.")
      return
    }

    try {
      const res = await fetch("/api/production/work-orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "complete_operation",
          operationId: selectedOperationForComplete.id,
          producedQty: pQty,
          scrapQty: Number(scrapQty) || 0,
          scrapReasonCode: Number(scrapQty) > 0 ? scrapReason : undefined,
          actualMachineMinutes: actualMachineMinutes ? Number(actualMachineMinutes) : undefined,
          actualLaborMinutes: actualLaborMinutes ? Number(actualLaborMinutes) : undefined,
        }),
      })
      const data = await res.json()
      if (data.success) {
        toast.success("Operasyon başarıyla tamamlandı. Mamul/yarı mamul çıkışı işlendi.")
        setCompleteModalOpen(false)
        setSelectedOperationForComplete(null)
        setProducedQty("")
        setScrapQty("0")
        setActualMachineMinutes("")
        setActualLaborMinutes("")
        fetchTerminalData()
      } else {
        toast.error(data.error || "Tamamlama işlemi başarısız.")
      }
    } catch (err: any) {
      toast.error("Bağlantı hatası.")
    }
  }

  // PIN ile Hızlı Giriş Simülasyonu
  const handlePinSubmit = () => {
    if (enteredPin.length >= 4) {
      setOperatorId(`OP-${enteredPin}`)
      setOperatorName(`Operatör (${enteredPin})`)
      setIsPinModalOpen(false)
      setEnteredPin("")
      toast.success("Operatör kartı / PIN başarıyla doğrulandı.")
    } else {
      toast.error("Lütfen en az 4 haneli PIN girin.")
    }
  }

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(() => {})
      setIsFullscreen(true)
    } else {
      document.exitFullscreen().catch(() => {})
      setIsFullscreen(false)
    }
  }

  return (
    <div className="min-h-[85vh] flex flex-col bg-zinc-950 text-white rounded-3xl border border-white/10 p-4 md:p-6 select-none">
      {/* ── ÜST BAR: İSTASYON, OPERATÖR, SAAT & EYLEMLER ── */}
      <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-white/10">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
            <Cpu className="w-6 h-6 animate-pulse" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs uppercase tracking-wider font-semibold text-emerald-400">
                Atölye İcra Terminali (SFC)
              </span>
              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-mono bg-emerald-500/10 text-emerald-300 border border-emerald-500/20">
                CANLI
              </span>
            </div>
            <h1 className="text-xl md:text-2xl font-bold tracking-tight text-white">
              {workCenters.find((w) => w.id === selectedWorkCenterId)?.name || "İş İstasyonu Seçiniz"}
            </h1>
          </div>
        </div>

        {/* İstasyon Seçimi & Operatör Rozeti */}
        <div className="flex items-center gap-3">
          <div className="w-48 sm:w-60">
            <Select
              value={selectedWorkCenterId}
              onValueChange={(val) => setSelectedWorkCenterId(val)}
            >
              <SelectTrigger className="bg-zinc-900 border-white/15 h-11 text-sm font-medium">
                <SelectValue placeholder="İş İstasyonu Seçin" />
              </SelectTrigger>
              <SelectContent className="bg-zinc-900 border-white/10 text-white">
                {workCenters.map((wc) => (
                  <SelectItem key={wc.id} value={wc.id}>
                    {wc.code} - {wc.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <button
            onClick={() => setIsPinModalOpen(true)}
            className="flex items-center gap-2 px-3 py-2 rounded-xl bg-zinc-900 border border-white/10 hover:border-emerald-500/50 transition-colors"
          >
            <div className="w-7 h-7 rounded-lg bg-emerald-500/10 flex items-center justify-center text-emerald-400">
              <User className="w-4 h-4" />
            </div>
            <div className="text-left hidden sm:block">
              <p className="text-[10px] text-zinc-400 font-mono">OPERATÖR</p>
              <p className="text-xs font-semibold text-white truncate max-w-[120px]">{operatorName}</p>
            </div>
          </button>

          <Button
            variant="outline"
            size="icon"
            onClick={fetchTerminalData}
            disabled={loading}
            className="h-11 w-11 border-white/10 bg-zinc-900 hover:bg-zinc-800"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin text-emerald-400" : ""}`} />
          </Button>

          <Button
            variant="outline"
            size="icon"
            onClick={toggleFullscreen}
            className="h-11 w-11 border-white/10 bg-zinc-900 hover:bg-zinc-800"
          >
            {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
          </Button>
        </div>
      </div>

      {/* ── BARKOD / QR OKUYUCU HIZLI GİRİŞ ÇUBUĞU ── */}
      <form onSubmit={handleBarcodeSubmit} className="my-4 flex items-center gap-2">
        <div className="relative flex-1">
          <Barcode className="absolute left-4 top-1/2 -translate-y-1/2 w-6 h-6 text-emerald-400" />
          <Input
            ref={barcodeInputRef}
            type="text"
            value={barcodeInput}
            onChange={(e) => setBarcodeInput(e.target.value)}
            placeholder="İş Emri veya Malzeme Barkodu Okutun (veya girip Enter'a basın)..."
            className="pl-13 h-14 bg-zinc-900/90 border-emerald-500/30 text-base md:text-lg font-mono focus-visible:ring-emerald-500"
          />
        </div>
        <Button
          type="submit"
          className="h-14 px-6 bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-base rounded-xl"
        >
          <QrCode className="w-5 h-5 mr-2" />
          OKUT
        </Button>
      </form>

      {/* ── İŞ LİSTESİ & AKTİF OPERASYONLAR ── */}
      <div className="flex-1 grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Sol 2 Kolon: İstasyon Operasyonları */}
        <div className="lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold tracking-wider uppercase text-zinc-400 flex items-center gap-2">
              <Layers className="w-4 h-4 text-emerald-400" />
              Aktif & Bekleyen Operasyonlar ({terminalData?.activeOperations?.length || 0})
            </h2>
            <span className="text-xs text-zinc-500">Öncelik & Sıraya Göre Sıralı</span>
          </div>

          {(!terminalData?.activeOperations || terminalData.activeOperations.length === 0) ? (
            <div className="p-12 text-center rounded-2xl bg-zinc-900/50 border border-white/5 space-y-3">
              <CheckCircle2 className="w-12 h-12 text-zinc-600 mx-auto" />
              <p className="text-base text-zinc-400">Bu istasyonda atanmış aktif bir operasyon bulunmuyor.</p>
              <p className="text-xs text-zinc-600">Yeni bir iş emri serbest bırakıldığında burada otomatik görünecektir.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {terminalData.activeOperations.map((op: any) => {
                const isRunning = op.status === "IN_PROGRESS"
                const isPaused = op.status === "PAUSED"
                const isPending = op.status === "PENDING"
                const isCompleted = op.status === "COMPLETED"

                return (
                  <motion.div
                    key={op.id}
                    layout
                    className={`p-5 rounded-2xl border transition-all ${
                      isRunning
                        ? "bg-emerald-950/20 border-emerald-500/50 shadow-lg shadow-emerald-950/50"
                        : isPaused
                        ? "bg-amber-950/20 border-amber-500/40"
                        : "bg-zinc-900/70 border-white/10"
                    }`}
                  >
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-mono text-xs px-2 py-0.5 rounded bg-white/10 font-bold text-white">
                            #{op.operationNumber}
                          </span>
                          <span className="font-mono text-xs text-emerald-300">
                            {op.workOrder?.workOrderNumber}
                          </span>
                          <span
                            className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                              isRunning
                                ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30"
                                : isPaused
                                ? "bg-amber-500/20 text-amber-300 border border-amber-500/30"
                                : "bg-zinc-700/50 text-zinc-300"
                            }`}
                          >
                            {isRunning ? "DEVAM EDİYOR" : isPaused ? "DURAKLATILDI (DURUŞTA)" : "BEKLİYOR"}
                          </span>
                        </div>
                        <h3 className="text-lg font-bold text-white">
                          {op.operationName}
                        </h3>
                        <p className="text-xs text-zinc-400 mt-0.5">
                          Ürün: <span className="text-zinc-200 font-medium">{op.workOrder?.item?.name || "Mamul"}</span> ({op.workOrder?.item?.sku})
                          {op.workOrder?.lotNumber ? ` · Lot: ${op.workOrder.lotNumber}` : ""}
                        </p>
                      </div>

                      {/* İlerleme Bilgisi */}
                      <div className="text-right">
                        <p className="text-xs text-zinc-400">Üretilen / Planlanan</p>
                        <p className="text-xl font-mono font-bold text-white">
                          <span className="text-emerald-400">{op.producedQuantity}</span> / {op.plannedQuantity} {op.workOrder?.unit || "ADET"}
                        </p>
                        {op.scrapQuantity > 0 && (
                          <p className="text-xs text-red-400 flex items-center justify-end gap-1 font-mono">
                            <Flame className="w-3 h-3" /> Hurda: {op.scrapQuantity}
                          </p>
                        )}
                      </div>
                    </div>

                    {/* Duruş Mesajı (varsa) */}
                    {isPaused && (
                      <div className="mt-3 p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center gap-2 text-xs text-amber-300">
                        <AlertTriangle className="w-4 h-4 shrink-0 text-amber-400" />
                        <span>Duruş Sebebi: <strong>{op.stoppages?.[0]?.reasonCode || "Duruş Kaydı"}</strong> — {op.stoppages?.[0]?.notes || "Açıklama belirtilmemiş"}</span>
                      </div>
                    )}

                    {/* EYLEM BUTONLARI - DOKUNMATİK DEV BOYUT */}
                    <div className="mt-4 pt-3 border-t border-white/10 flex flex-wrap items-center gap-3">
                      {isPending && (
                        <Button
                          onClick={() => handleStartOperation(op.id)}
                          className="h-12 px-6 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-sm rounded-xl flex-1 shadow-md shadow-emerald-900/30"
                        >
                          <Play className="w-5 h-5 mr-2" />
                          BAŞLAT
                        </Button>
                      )}

                      {isRunning && (
                        <>
                          <Button
                            onClick={() => {
                              setSelectedOperationForStoppage(op)
                              setStoppageModalOpen(true)
                            }}
                            className="h-12 px-5 bg-amber-600 hover:bg-amber-500 text-white font-bold text-sm rounded-xl flex-1"
                          >
                            <Pause className="w-5 h-5 mr-2" />
                            DURUŞ BİLDİR
                          </Button>

                          <Button
                            onClick={() => {
                              setSelectedOperationForComplete(op)
                              setProducedQty(String(Math.max(0, op.plannedQuantity - op.producedQuantity)))
                              setCompleteModalOpen(true)
                            }}
                            className="h-12 px-6 bg-blue-600 hover:bg-blue-500 text-white font-bold text-sm rounded-xl flex-1 shadow-md shadow-blue-900/30"
                          >
                            <CheckCircle2 className="w-5 h-5 mr-2" />
                            İŞİ BİTİR / ÜRETİM GİRİŞİ
                          </Button>
                        </>
                      )}

                      {isPaused && (
                        <Button
                          onClick={() => handleResumeOperation(op.id)}
                          className="h-12 px-6 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-sm rounded-xl flex-1"
                        >
                          <Play className="w-5 h-5 mr-2" />
                          DURUŞU BİTİR & DEVAM ET
                        </Button>
                      )}
                    </div>
                  </motion.div>
                )
              })}
            </div>
          )}
        </div>

        {/* Sağ Kolon: IoT Canlı Akışı & İstasyon Metrikleri */}
        <div className="space-y-4">
          <div className="p-5 rounded-2xl bg-zinc-900/80 border border-white/10 space-y-4">
            <h3 className="text-xs uppercase tracking-wider font-semibold text-zinc-400 flex items-center gap-2">
              <Cpu className="w-4 h-4 text-cyan-400" />
              İstasyon Durumu & Canlı Veri (IoT)
            </h3>

            <div className="grid grid-cols-2 gap-3">
              <div className="p-3 rounded-xl bg-white/5 border border-white/5">
                <p className="text-[10px] text-zinc-400 uppercase">İstasyon Kapasitesi</p>
                <p className="text-lg font-bold font-mono text-white mt-1">100%</p>
              </div>
              <div className="p-3 rounded-xl bg-white/5 border border-white/5">
                <p className="text-[10px] text-zinc-400 uppercase">Aktif Operatör</p>
                <p className="text-sm font-semibold text-emerald-400 mt-1 truncate">{operatorName}</p>
              </div>
            </div>

            <div className="pt-2 border-t border-white/5">
              <p className="text-xs font-semibold text-zinc-300 mb-2 flex items-center justify-between">
                <span>Son PLC / Sensör Girişleri</span>
                <span className="text-[10px] font-mono text-zinc-500">Staging</span>
              </p>

              {(!terminalData?.recentIotLogs || terminalData.recentIotLogs.length === 0) ? (
                <div className="p-4 rounded-xl bg-black/30 border border-white/5 text-center text-xs text-zinc-500">
                  Bağlı sensörden son sinyal bekleniyor...
                </div>
              ) : (
                <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                  {terminalData.recentIotLogs.map((log: any) => (
                    <div
                      key={log.id}
                      className="p-2.5 rounded-lg bg-black/40 border border-white/5 text-[11px] font-mono flex items-center justify-between"
                    >
                      <div className="truncate">
                        <span className="text-cyan-400">{log.deviceId}</span>:{" "}
                        <span className="text-zinc-300">
                          {typeof log.payload === "object" ? JSON.stringify(log.payload) : String(log.payload)}
                        </span>
                      </div>
                      <span className="text-[9px] text-zinc-500 shrink-0 ml-2">
                        {new Date(log.receivedAt).toLocaleTimeString("tr-TR")}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className="p-4 rounded-2xl bg-emerald-950/20 border border-emerald-500/20 text-xs text-zinc-300 space-y-2">
            <div className="flex items-center gap-2 text-emerald-400 font-semibold">
              <Boxes className="w-4 h-4" />
              <span>Geri Yıkama (Backflush) Entegrasyonu</span>
            </div>
            <p className="text-[11px] text-zinc-400">
              Operasyon tamamlandığında, ürün ağacında backflush olarak tanımlı hammaddeler otomatik olarak stoktan düşülür ve nihai mamul/yarı mamul anında depoya işlenir.
            </p>
          </div>
        </div>
      </div>

      {/* ── MODAL: OPERATÖR PIN DOĞRULAMA ── */}
      <Dialog open={isPinModalOpen} onOpenChange={setIsPinModalOpen}>
        <DialogContent className="bg-zinc-950 border-white/10 text-white sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Operatör Hızlı Girişi (PIN / Kart)</DialogTitle>
            <DialogDescription className="text-zinc-400">
              Atölye terminaline atanmak üzere 4 haneli PIN numaranızı girin.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <Input
              type="password"
              maxLength={6}
              value={enteredPin}
              onChange={(e) => setEnteredPin(e.target.value)}
              placeholder="PIN Giriniz..."
              className="h-14 text-center text-2xl font-mono tracking-widest bg-zinc-900 border-white/15"
              autoFocus
            />

            {/* Dokunmatik Numpad */}
            <div className="grid grid-cols-3 gap-2">
              {[1, 2, 3, 4, 5, 6, 7, 8, 9, "Temizle", 0, "Giriş"].map((key) => (
                <Button
                  key={String(key)}
                  type="button"
                  variant="outline"
                  onClick={() => {
                    if (key === "Temizle") setEnteredPin("")
                    else if (key === "Giriş") handlePinSubmit()
                    else setEnteredPin((prev) => (prev.length < 6 ? prev + key : prev))
                  }}
                  className="h-12 text-lg font-bold bg-zinc-900 border-white/10 hover:bg-zinc-800"
                >
                  {key}
                </Button>
              ))}
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* ── MODAL: DURUŞ BİLDİRİMİ ── */}
      <Dialog open={stoppageModalOpen} onOpenChange={setStoppageModalOpen}>
        <DialogContent className="bg-zinc-950 border-white/10 text-white sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-amber-400">
              <AlertTriangle className="w-5 h-5" />
              Duruş Bildirimi (Operasyonu Duraklat)
            </DialogTitle>
            <DialogDescription className="text-zinc-400">
              İş emri #{selectedOperationForStoppage?.workOrder?.workOrderNumber} - Operasyon #{selectedOperationForStoppage?.operationNumber}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div>
              <Label className="text-xs text-zinc-300">Duruş Nedeni Kodu</Label>
              <Select value={stoppageReason} onValueChange={setStoppageReason}>
                <SelectTrigger className="bg-zinc-900 border-white/15 mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-zinc-900 border-white/10 text-white">
                  <SelectItem value="ARIZA">Makine / Ekipman Arızası</SelectItem>
                  <SelectItem value="AYAR">Ayar & Setup (Kalıp Değişimi)</SelectItem>
                  <SelectItem value="MALZEME_YOK">Hammadde / Malzeme Eksikliği</SelectItem>
                  <SelectItem value="OPERATOR_YOK">Operatör / Personel Eksikliği</SelectItem>
                  <SelectItem value="ELEKTRIK_KESINTISI">Enerji / Altyapı Kesintisi</SelectItem>
                  <SelectItem value="PLANLI_BAKIM">Planlı Bakım</SelectItem>
                  <SelectItem value="KALITE_KONTROL">Kalite Kontrol Beklemesi</SelectItem>
                  <SelectItem value="DIGER">Diğer</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label className="text-xs text-zinc-300">Açıklama / Not</Label>
              <Input
                value={stoppageNotes}
                onChange={(e) => setStoppageNotes(e.target.value)}
                placeholder="Örn: 2 no'lu enjeksiyon valfi sıkıştı..."
                className="bg-zinc-900 border-white/15 mt-1"
              />
            </div>
          </div>

          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              onClick={() => setStoppageModalOpen(false)}
              className="border-white/10"
            >
              Vazgeç
            </Button>
            <Button
              onClick={handlePauseOperation}
              className="bg-amber-600 hover:bg-amber-500 text-white font-bold"
            >
              Duruşu Başlat
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── MODAL: İŞİ TAMAMLA & ÜRETİM ÇIKTISI ── */}
      <Dialog open={completeModalOpen} onOpenChange={setCompleteModalOpen}>
        <DialogContent className="bg-zinc-950 border-white/10 text-white sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-blue-400">
              <CheckCircle2 className="w-5 h-5" />
              Operasyon Çıktı & Hurda Bildirimi
            </DialogTitle>
            <DialogDescription className="text-zinc-400">
              Operasyon #{selectedOperationForComplete?.operationNumber}: {selectedOperationForComplete?.operationName}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs text-zinc-300">Üretilen Sağlam Miktar *</Label>
                <Input
                  type="number"
                  min="0"
                  step="any"
                  value={producedQty}
                  onChange={(e) => setProducedQty(e.target.value)}
                  className="bg-zinc-900 border-white/15 mt-1 text-lg font-mono font-bold"
                />
              </div>

              <div>
                <Label className="text-xs text-zinc-300">Hurda / Fire Miktarı</Label>
                <Input
                  type="number"
                  min="0"
                  step="any"
                  value={scrapQty}
                  onChange={(e) => setScrapQty(e.target.value)}
                  className="bg-zinc-900 border-white/15 mt-1 text-lg font-mono font-bold text-red-400"
                />
              </div>
            </div>

            {Number(scrapQty) > 0 && (
              <div>
                <Label className="text-xs text-zinc-300">Hurda Nedeni</Label>
                <Select value={scrapReason} onValueChange={setScrapReason}>
                  <SelectTrigger className="bg-zinc-900 border-white/15 mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-zinc-900 border-white/10 text-white">
                    <SelectItem value="HAMMADDE_HATASI">Hammadde Bozuk / Kusurlu</SelectItem>
                    <SelectItem value="OPERATOR_HATASI">Operatör Hatası</SelectItem>
                    <SelectItem value="MAKINE_HATASI">Makine / Donanım Arızası</SelectItem>
                    <SelectItem value="KALIP_HATASI">Kalıp / Takım Hatası</SelectItem>
                    <SelectItem value="TEST_NUMUNESI">Test / Kalite Numunesi</SelectItem>
                    <SelectItem value="DIGER">Diğer</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}

            <div className="grid grid-cols-2 gap-3 pt-2 border-t border-white/10">
              <div>
                <Label className="text-xs text-zinc-300">Fiili Makine Süresi (Dakika)</Label>
                <Input
                  type="number"
                  min="0"
                  value={actualMachineMinutes}
                  onChange={(e) => setActualMachineMinutes(e.target.value)}
                  placeholder="Boşsa tahmini alınır"
                  className="bg-zinc-900 border-white/15 mt-1 font-mono"
                />
              </div>

              <div>
                <Label className="text-xs text-zinc-300">Fiili İşçilik Süresi (Dakika)</Label>
                <Input
                  type="number"
                  min="0"
                  value={actualLaborMinutes}
                  onChange={(e) => setActualLaborMinutes(e.target.value)}
                  placeholder="Boşsa tahmini alınır"
                  className="bg-zinc-900 border-white/15 mt-1 font-mono"
                />
              </div>
            </div>
          </div>

          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              onClick={() => setCompleteModalOpen(false)}
              className="border-white/10"
            >
              Vazgeç
            </Button>
            <Button
              onClick={handleCompleteOperation}
              className="bg-blue-600 hover:bg-blue-500 text-white font-bold"
            >
              Onayla ve Tamamla
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

