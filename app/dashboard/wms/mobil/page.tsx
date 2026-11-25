"use client"

import React, { useState, useEffect, useRef } from "react"
import Link from "next/link"
import {
  Smartphone,
  Wifi,
  WifiOff,
  Barcode,
  RefreshCw,
  CheckCircle2,
  ArrowLeft,
  Truck,
  MapPin,
  PackageCheck,
  ClipboardCheck,
  SlidersHorizontal,
  ScanLine,
  AlertCircle,
  Camera,
  QrCode,
  X,
  Trash2,
  RotateCcw,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Label } from "@/components/ui/label"
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle
} from "@/components/ui/sheet"
import { toast } from "sonner"
import {
  getOfflineWmsQueue,
  enqueueOfflineWmsOperation,
  syncAllOfflineWmsOperations,
  removeOfflineOperation,
  type OfflineWmsOperation
} from "@/lib/wms/offlineSyncEngine"
import { safeNumber, safeText } from "@/lib/utils/safe-display"

type OperationType =
  | "PUTAWAY_CONFIRM"
  | "PICK_CONFIRM"
  | "BLIND_COUNT_ENTRY"
  | "GOODS_RECEIPT"
  | "SSCC_SCAN"
  | "RMA_RETURN_RECEIPT"

export default function MobileFieldScannerPwaPage() {
  const [isOfflineMode, setIsOfflineMode] = useState(false)
  const [queue, setQueue] = useState<OfflineWmsOperation[]>([])
  const [selectedAction, setSelectedAction] = useState<OperationType>("PUTAWAY_CONFIRM")
  const [isSyncing, setIsSyncing] = useState(false)
  const [isSettingsOpen, setIsSettingsOpen] = useState(false)

  // Canlı Depo Görevleri (Atanan İşler) ve Açık İadeler (RMA)
  const [liveTasks, setLiveTasks] = useState<any[]>([])
  const [openRmas, setOpenRmas] = useState<any[]>([])
  const [activeTaskId, setActiveTaskId] = useState<string | null>(null)
  const [activeLineId, setActiveLineId] = useState<string | null>(null)
  const [activeRmaId, setActiveRmaId] = useState<string | null>(null)
  const [activeRmaNumber, setActiveRmaNumber] = useState<string | null>(null)
  const [activeWarehouseId, setActiveWarehouseId] = useState<string>("wh-merkez-01")

  // Gerçek Kamera QR / Barkod Okuyucu (@zxing/browser)
  const [isCameraOpen, setIsCameraOpen] = useState(false)
  const [cameraError, setCameraError] = useState<string | null>(null)
  const videoRef = useRef<HTMLVideoElement | null>(null)
  const scannerControlsRef = useRef<{ stop: () => void } | null>(null)

  // Cihaz ve Operatör Bilgileri
  const [deviceId, setDeviceId] = useState("ZEBRA-TC58-IST-01")
  const [operatorName, setOperatorName] = useState("Saha Operatörü")
  const [targetBinCode, setTargetBinCode] = useState("A-01-01")
  const [quantity, setQuantity] = useState("10")
  const [damagedQty, setDamagedQty] = useState("0")
  const [lotNumber, setLotNumber] = useState("")

  // Manuel Barkod Girişi
  const [barcodeInput, setBarcodeInput] = useState("")
  const [isLoadingLookup, setIsLoadingLookup] = useState(false)

  // Son Yapılan Başarılı Tarama Ekranı
  const [scannedProduct, setScannedProduct] = useState<{
    id: string
    name: string
    sku: string
    barcode?: string
    unit: string
    totalStock: number
    bins: Array<{ binCode: string; onHandQty: number; warehouseName: string }>
    processedQty: number
    actionLabel: string
    timestamp: string
  } | null>(null)

  const barcodeInputRef = useRef<HTMLInputElement>(null)

  // Web Audio Terminal Bip Sesi (Standart El Terminali Sesli Onayı)
  const playTerminalBeep = (type: "success" | "error" = "success") => {
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext
      if (!AudioCtx) return
      const ctx = new AudioCtx()
      const osc = ctx.createOscillator()
      const gain = ctx.createGain()
      osc.connect(gain)
      gain.connect(ctx.destination)

      if (type === "success") {
        osc.frequency.setValueAtTime(1760, ctx.currentTime) // A6
        gain.gain.setValueAtTime(0.2, ctx.currentTime)
        osc.start()
        osc.stop(ctx.currentTime + 0.12)
      } else {
        osc.frequency.setValueAtTime(440, ctx.currentTime) // A4
        gain.gain.setValueAtTime(0.3, ctx.currentTime)
        osc.start()
        osc.stop(ctx.currentTime + 0.25)
      }
    } catch {
      // Audio not supported or blocked by autoplay
    }
  }

  // Çevrimdışı Kuyruğu, Canlı Depo Görevlerini ve Açık İade RMA'ları Yükle
  const fetchLiveTasks = async () => {
    if (isOfflineMode) return
    try {
      const [wmsRes, rmaRes] = await Promise.all([
        fetch("/api/wms", { cache: "no-store" }),
        fetch("/api/omnichannel?section=rma_list", { cache: "no-store" }).catch(() => null),
      ])
      const data = await wmsRes.json()
      if (data.success && Array.isArray(data.tasks)) {
        setLiveTasks(data.tasks.filter((t: any) => t.status !== "COMPLETED"))
      }
      if (rmaRes && rmaRes.ok) {
        const rmaJson = await rmaRes.json()
        if (rmaJson.success && Array.isArray(rmaJson.rmas)) {
          setOpenRmas(
            rmaJson.rmas.filter((r: any) =>
              ["TALEP", "ONAYLANDI", "YOLDA"].includes(String(r.rmaStatus || ""))
            )
          )
        }
      }
    } catch {
      // Çevrimdışı durumda sessiz geç
    }
  }

  useEffect(() => {
    getOfflineWmsQueue().then(res => setQueue(res || []))
    fetchLiveTasks()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Kamera QR / Barkod Okuyucu Yaşam Döngüsü (@zxing/browser)
  useEffect(() => {
    if (!isCameraOpen) {
      if (scannerControlsRef.current) {
        scannerControlsRef.current.stop()
        scannerControlsRef.current = null
      }
      return
    }

    let cancelled = false
    setCameraError(null)

    const startCamera = async () => {
      try {
        const { BrowserMultiFormatReader } = await import("@zxing/browser")
        if (cancelled || !videoRef.current) return
        const reader = new BrowserMultiFormatReader()
        const controls = await reader.decodeFromVideoDevice(
          undefined,
          videoRef.current,
          (result) => {
            if (result && !cancelled) {
              const decodedText = result.getText()
              setIsCameraOpen(false)
              handleLookupAndExecute(decodedText, "CAMERA")
            }
          }
        )
        if (cancelled) {
          controls.stop()
        } else {
          scannerControlsRef.current = controls
        }
      } catch (err: any) {
        if (!cancelled) {
          setCameraError(
            err?.message ||
              "Kameraya erişilemedi. Lütfen tarayıcı kamera iznini verin veya USB/manuel barkod kullanın."
          )
        }
      }
    }

    startCamera()
    return () => {
      cancelled = true
      if (scannerControlsRef.current) {
        scannerControlsRef.current.stop()
        scannerControlsRef.current = null
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isCameraOpen])

  // 1. GERÇEK DONANIM USB / BLUETOOTH BARKOD TABANCASI DİNLEYİCİSİ
  useEffect(() => {
    let charBuffer = ""
    let lastKeyTime = Date.now()

    const handleKeyDown = (e: KeyboardEvent) => {
      const activeEl = document.activeElement
      if (activeEl && activeEl.tagName === "INPUT" && activeEl.id !== "mobile-barcode-input") {
        return
      }

      const now = Date.now()
      if (now - lastKeyTime > 120) {
        charBuffer = ""
      }
      lastKeyTime = now

      if (e.key === "Enter") {
        const clean = charBuffer.trim()
        if (clean.length >= 2) {
          e.preventDefault()
          handleLookupAndExecute(clean)
          charBuffer = ""
        }
      } else if (e.key.length === 1) {
        charBuffer += e.key
      }
    }

    window.addEventListener("keydown", handleKeyDown)
    return () => window.removeEventListener("keydown", handleKeyDown)
  }, [selectedAction, quantity, damagedQty, targetBinCode, lotNumber, isOfflineMode, deviceId, operatorName, activeRmaId, activeRmaNumber])

  const pendingOfflineCount = (queue || []).filter(q => q.syncStatus === "QUEUED_OFFLINE").length
  const conflictCount = (queue || []).filter(q => q.syncStatus === "CONFLICT").length

  // 2. GERÇEK BARKOD SORGULAMA VE İŞLEM YÜRÜTME
  const handleLookupAndExecute = async (codeToLookup: string, scanSource: "USB" | "CAMERA" = "USB") => {
    const code = codeToLookup.trim()
    if (!code) {
      toast.error("Lütfen bir barkod veya SKU giriniz.")
      return
    }

    setIsLoadingLookup(true)
    try {
      let matchedItem: any = null
      let matchedRma: any = null

      if (!isOfflineMode) {
        const res = await fetch(`/api/wms?section=lookup&barcode=${encodeURIComponent(code)}`)
        const data = await res.json()
        if (data.success && data.item) {
          matchedItem = data.item
          if (data.lookupType === "RMA" && data.rma) {
            matchedRma = data.rma
          }
        }
      }

      const effectiveAction: OperationType =
        matchedRma || /^RMA\|/i.test(code) ? "RMA_RETURN_RECEIPT" : selectedAction
      if (effectiveAction !== selectedAction) {
        setSelectedAction(effectiveAction)
      }

      if (!matchedItem) {
        matchedItem = {
          id: `local-item-${code}`,
          sku: code,
          name:
            effectiveAction === "SSCC_SCAN"
              ? `SSCC / Palet [${code}]`
              : effectiveAction === "RMA_RETURN_RECEIPT"
                ? `İade Paketi [${code}]`
                : `Ürün [${code}]`,
          barcode: code,
          baseUnit: effectiveAction === "SSCC_SCAN" ? "Palet" : "Adet",
          totalStock: 0,
          bins: [
            {
              binCode: effectiveAction === "RMA_RETURN_RECEIPT" ? "Q-01-01" : targetBinCode,
              onHandQty: 0,
              warehouseName: "Yerel Saha",
            },
          ],
        }
      }

      const qtyNum = Math.max(0, Number(quantity) || 0)
      const dmgNum = Math.max(0, Number(damagedQty) || 0)
      const effectiveQty = effectiveAction === "RMA_RETURN_RECEIPT" ? qtyNum + dmgNum || Number(matchedRma?.returnQty || 1) : Math.max(1, qtyNum)
      const effectiveBin =
        effectiveAction === "RMA_RETURN_RECEIPT"
          ? matchedRma?.targetBinCode || (targetBinCode === "A-01-01" ? "Q-01-01" : targetBinCode)
          : targetBinCode

      const rmaReceivedLines =
        effectiveAction === "RMA_RETURN_RECEIPT" &&
        matchedRma &&
        Array.isArray(matchedRma.lines) &&
        matchedRma.lines.length === 1
          ? [
              {
                lineId: matchedRma.lines[0].id,
                sku: matchedRma.lines[0].sku,
                receivedQty: qtyNum > 0 || dmgNum > 0 ? qtyNum : Number(matchedRma.lines[0].requestedQty || matchedRma.returnQty || 1),
                damagedQty: dmgNum,
                lotNumber: lotNumber || matchedRma.lines[0].lotNumber || undefined,
              },
            ]
          : undefined

      const actionLabels: Record<OperationType, string> = {
        GOODS_RECEIPT: "Mal Kabul (Rampa Girişi)",
        PUTAWAY_CONFIRM: "Rafa Yerleştirme (Put-away)",
        PICK_CONFIRM: "Sipariş Toplama (Pick)",
        BLIND_COUNT_ENTRY: "Hücre Sayımı (Kör Sayım)",
        SSCC_SCAN: "LPN / SSCC-18 Palet Tarama",
        RMA_RETURN_RECEIPT: "İade Mal Kabul (RMA Karantina)",
      }

      const createdOp = await enqueueOfflineWmsOperation(
        {
          deviceId: scanSource === "CAMERA" ? `${deviceId}-CAM` : deviceId,
          operatorName,
          operationType: effectiveAction,
          codeScanned: code,
          sku: matchedItem.sku,
          itemId: matchedItem.id?.startsWith("local-item-") ? undefined : matchedItem.id,
          warehouseId: matchedRma?.targetWarehouseId || activeWarehouseId,
          taskId: activeTaskId || undefined,
          lineId: activeLineId || undefined,
          rmaId: matchedRma?.id || activeRmaId || undefined,
          rmaNumber: matchedRma?.rmaNumber || activeRmaNumber || undefined,
          trackingNo: matchedRma?.returnTrackingNo || code,
          damagedQty: effectiveAction === "RMA_RETURN_RECEIPT" ? dmgNum : undefined,
          scanMethod: scanSource,
          receivedLines: rmaReceivedLines,
          itemName: matchedItem.name,
          lotNumber: lotNumber || undefined,
          binCode: effectiveBin,
          lpnCode: effectiveAction === "SSCC_SCAN" ? code : undefined,
          quantity: effectiveQty,
          unit: matchedItem.baseUnit || "Adet"
        },
        isOfflineMode
      )

      const updatedQueue = await getOfflineWmsQueue()
      setQueue(updatedQueue)

      setScannedProduct({
        id: matchedItem.id,
        name: matchedItem.name,
        sku: matchedItem.sku,
        barcode: matchedItem.barcode,
        unit: matchedItem.baseUnit || "Adet",
        totalStock: matchedItem.totalStock,
        bins: matchedItem.bins || [],
        processedQty: effectiveQty,
        actionLabel: actionLabels[effectiveAction],
        timestamp: new Date().toLocaleTimeString("tr-TR")
      })

      setBarcodeInput("")
      setActiveRmaId(null)
      setActiveRmaNumber(null)

      if (createdOp.syncStatus === "CONFLICT") {
        playTerminalBeep("error")
        toast.error("Sunucu Çakışması Tespit Edildi!", {
          description: createdOp.conflictNote || "Görev/stok başka operatör tarafından tüketilmiş olabilir."
        })
      } else if (createdOp.syncStatus === "DUPLICATE_IGNORED") {
        playTerminalBeep("success")
        toast.warning("Çift Okutma Engellendi (Idempotency)", {
          description: createdOp.conflictNote || "Bu barkod işlemi daha önce kaydedildiği için mükerrer stok düşümü yapılmadı."
        })
      } else if (isOfflineMode || createdOp.syncStatus === "QUEUED_OFFLINE") {
        playTerminalBeep("success")
        toast.warning("Çevrimdışı (Offline) Kuyruğa Alındı", {
          description: `${matchedItem.name} — ${effectiveQty} ${matchedItem.baseUnit} IndexedDB'ye kaydedildi.`
        })
      } else {
        playTerminalBeep("success")
        toast.success(`${scanSource === "CAMERA" ? "Kamera" : "Terminal"} Okuması Başarıyla İşlendi!`, {
          description: `${matchedItem.name} — ${effectiveBin} rafına ${effectiveQty} ${matchedItem.baseUnit} işlendi.`
        })
        fetchLiveTasks()
      }
    } catch (error: any) {
      playTerminalBeep("error")
      toast.error("Tarama hatası: " + (error.message || "Bilinmeyen hata"))
    } finally {
      setIsLoadingLookup(false)
      if (barcodeInputRef.current) {
        barcodeInputRef.current.focus()
      }
    }
  }

  // 3. ÇEVRİMDIŞI KUYRUĞU SUNUCUYLA EŞİTLE
  const handleBatchSync = async () => {
    setIsSyncing(true)
    try {
      const result = await syncAllOfflineWmsOperations()
      setQueue(result.operations)
      setIsOfflineMode(false)
      if (result.conflictCount > 0) {
        playTerminalBeep("error")
        toast.warning(`${result.syncedCount} işlendi, ${result.conflictCount} çakışma bulundu!`, {
          description: "Çakışan satırlar uyarı ile kuyrukta tutuldu; lütfen gözden geçirin."
        })
      } else {
        playTerminalBeep("success")
        toast.success(`${result.syncedCount} Saha İşlemi Sunucuya Aktarıldı!`, {
          description: result.duplicateCount > 0 ? `${result.duplicateCount} mükerrer kayıt atlandı.` : "IndexedDB kuyruğu ana veritabanına yazıldı."
        })
      }
      fetchLiveTasks()
    } catch (e: any) {
      playTerminalBeep("error")
      toast.error("Eşitleme hatası: " + e.message)
    } finally {
      setIsSyncing(false)
    }
  }

  const handleSelectLiveTask = (task: any) => {
    const firstLine = task.lines?.[0]
    setActiveTaskId(task.id)
    setActiveLineId(firstLine?.id || null)
    setActiveWarehouseId(task.warehouseId || "wh-merkez-01")
    if (firstLine?.suggestedToBin) setTargetBinCode(firstLine.suggestedToBin)
    else if (firstLine?.suggestedFromBin) setTargetBinCode(firstLine.suggestedFromBin)
    if (firstLine?.expectedQty) setQuantity(String(firstLine.expectedQty))
    if (task.workflowStage === "WAVE_PICK") setSelectedAction("PICK_CONFIRM")
    else if (task.workflowStage === "PUTAWAY") setSelectedAction("PUTAWAY_CONFIRM")
    else setSelectedAction("GOODS_RECEIPT")
    if (firstLine?.sku) setBarcodeInput(firstLine.sku)
    toast.success(`Görev seçildi: ${task.taskNumber}`)
  }

  return (
    <div className="min-h-screen bg-[--page] text-[--text] p-3 sm:p-5 flex flex-col justify-between max-w-md mx-auto select-none font-sans">
      {/* 1. ÜST BAR: GERİ DÖNÜŞ, ÇEVRİMDIŞI MODU VE AYARLAR */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <Link href="/dashboard/wms">
            <Button variant="ghost" size="sm" className="h-8 px-2.5 text-[--text-muted] hover:text-[--text] hover:bg-white text-xs gap-1.5 rounded-full cursor-pointer">
              <ArrowLeft className="h-4 w-4" />
              <span>WMS Panel</span>
            </Button>
          </Link>

          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsSettingsOpen(true)}
              className="h-8 px-2.5 text-[--text-muted] hover:text-[--text] hover:bg-white text-xs gap-1 rounded-full cursor-pointer"
            >
              <SlidersHorizontal className="h-3.5 w-3.5" />
              <span>Ayarlar</span>
            </Button>

            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                const nextState = !isOfflineMode
                setIsOfflineMode(nextState)
                if (nextState) {
                  toast.warning("Çevrimdışı (Offline) Moda Geçildi", {
                    description: "İşlemler yerel IndexedDB belleğine yazılacaktır."
                  })
                } else {
                  toast.success("Çevrimiçi Moda Dönüldü")
                }
              }}
              className={`h-8 px-3 rounded-full text-xs font-semibold cursor-pointer ${ isOfflineMode ? "bg-[--warn-soft] text-[--warn] border border-[--warn-fill]/30" : "bg-[--ok-soft] text-[--ok] border border-[--ok-fill]/20" }`}
            >
              {isOfflineMode ? <WifiOff className="mr-1 h-3.5 w-3.5" /> : <Wifi className="mr-1 h-3.5 w-3.5" />}
              {isOfflineMode ? "Offline" : "Online"}
            </Button>
          </div>
        </div>

        {/* Çevrimdışı Bekleyen İşlem veya Sunucu Çakışması Uyarısı */}
        {conflictCount > 0 && (
          <div className="bg-[--bad-soft] border border-[--bad-fill]/30 rounded-2xl p-3 space-y-2 text-xs text-[--bad]">
            <div className="flex items-center gap-2 font-semibold">
              <AlertCircle className="h-4 w-4 text-[--bad] shrink-0" />
              <span>{conflictCount} İşlemde Sunucu Çakışması (Conflict) Var!</span>
            </div>
            <div className="space-y-1.5 max-h-28 overflow-y-auto">
              {queue.filter(q => q.syncStatus === "CONFLICT").map(c => (
                <div key={c.id} className="bg-white border border-[--bad-fill]/20 rounded-xl p-2 flex items-center justify-between gap-2 text-[11px]">
                  <div className="min-w-0">
                    <div className="font-mono text-[--text] font-semibold truncate">{c.sku} • {c.quantity} {c.unit}</div>
                    <div className="text-[--bad] truncate">{c.conflictNote || "Görev/Stok çakışması"}</div>
                  </div>
                  <button
                    type="button"
                    onClick={async () => setQueue(await removeOfflineOperation(c.id))}
                    className="p-1 text-[--text-muted] hover:text-[--bad] shrink-0 cursor-pointer"
                    title="Çakışan kaydı kaldır"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {pendingOfflineCount > 0 && (
          <div className="bg-[--warn-soft] border border-[--warn-fill]/25 rounded-2xl p-3 flex items-center justify-between text-xs text-[--warn]">
            <div className="flex items-center gap-2">
              <AlertCircle className="h-4 w-4 text-[--warn] shrink-0" />
              <span><strong>{pendingOfflineCount}</strong> çevrimdışı işlem senkron bekliyor.</span>
            </div>
            <Button
              size="sm"
              onClick={handleBatchSync}
              disabled={isSyncing}
              className="h-7 px-3 bg-[--warn-fill] hover:bg-[--warn-fill]/90 text-[var(--text)] font-bold text-xs rounded-full cursor-pointer shadow-xs"
            >
              <RefreshCw className={`mr-1 h-3 w-3 ${isSyncing ? "animate-spin" : ""}`} />
              Eşitle
            </Button>
          </div>
        )}

        {/* ATANMIŞ CANLI GÖREV KUYRUĞU */}
        {liveTasks.length > 0 && (
          <div className="bg-white border border-[--line] rounded-2xl p-3 space-y-2 shadow-sm">
            <div className="flex items-center justify-between text-[11px] text-[--text-muted]">
              <span className="flex items-center gap-1.5 font-semibold uppercase tracking-wider text-[--text]">
                <ClipboardCheck className="w-3.5 h-3.5 text-[--brand]" />
                Atanan Depo Görevleri ({liveTasks.length})
              </span>
              {activeTaskId && (
                <button
                  type="button"
                  onClick={() => { setActiveTaskId(null); setActiveLineId(null) }}
                  className="text-[10px] text-[--text-muted] hover:text-[--text] cursor-pointer"
                >
                  Seçimi Temizle
                </button>
              )}
            </div>
            <div className="flex gap-2 overflow-x-auto pb-1">
              {liveTasks.slice(0, 6).map((t) => {
                const fl = t.lines?.[0]
                const isSelected = activeTaskId === t.id
                return (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => handleSelectLiveTask(t)}
                    className={`shrink-0 text-left px-3 py-2 rounded-xl border text-[11px] transition cursor-pointer ${ isSelected ? "bg-[--brand-soft] border-[--brand-line] text-[--brand] font-semibold" : "bg-[--page] border-[--line] text-[--text-2] hover:bg-white" }`}
                  >
                    <div className="font-mono font-semibold text-[--brand]">{t.taskNumber}</div>
                    <div className="truncate max-w-[140px] text-[--text]">{fl?.itemName || t.workflowStage}</div>
                    <div className="text-[10px] text-[--text-muted] font-mono">
                      {safeNumber(fl?.expectedQty, 0)} {fl?.unit || "Adet"} • {fl?.suggestedToBin || fl?.suggestedFromBin || "-"}
                    </div>
                  </button>
                )
              })}
            </div>
          </div>
        )}

        {/* 2. DÖRT ANA OPERASYON BUTONU */}
        <div>
          <span className="text-[10px] font-semibold uppercase tracking-wider text-[--text-muted] block mb-1.5 px-0.5">
            İşlem Modu Seçiniz:
          </span>
          <div className="grid grid-cols-2 gap-2.5">
            <button
              type="button"
              onClick={() => setSelectedAction("GOODS_RECEIPT")}
              className={`p-3.5 rounded-2xl border text-left transition-all flex flex-col justify-between h-22 cursor-pointer ${ selectedAction === "GOODS_RECEIPT" ? "bg-[--brand] text-white border-[--brand] shadow-sm font-semibold" : "bg-white border-[--line] text-[--text-muted] hover:text-[--text] hover:border-[--brand-line]" }`}
            >
              <Truck className={`h-5 w-5 ${selectedAction === "GOODS_RECEIPT" ? "text-white" : "text-[--brand]"}`} />
              <div>
                <div className="font-semibold text-xs">1. Mal Kabul</div>
                <div className={`text-[10px] ${selectedAction === "GOODS_RECEIPT" ? "text-blue-100" : "text-[--text-muted]"}`}>Rampa Girişi</div>
              </div>
            </button>

            <button
              type="button"
              onClick={() => setSelectedAction("PUTAWAY_CONFIRM")}
              className={`p-3.5 rounded-2xl border text-left transition-all flex flex-col justify-between h-22 cursor-pointer ${ selectedAction === "PUTAWAY_CONFIRM" ? "bg-[--brand] text-white border-[--brand] shadow-sm font-semibold" : "bg-white border-[--line] text-[--text-muted] hover:text-[--text] hover:border-[--brand-line]" }`}
            >
              <MapPin className={`h-5 w-5 ${selectedAction === "PUTAWAY_CONFIRM" ? "text-white" : "text-[--brand]"}`} />
              <div>
                <div className="font-semibold text-xs">2. Rafa Yerleştir</div>
                <div className={`text-[10px] ${selectedAction === "PUTAWAY_CONFIRM" ? "text-blue-100" : "text-[--text-muted]"}`}>Hücreye İstif</div>
              </div>
            </button>

            <button
              type="button"
              onClick={() => setSelectedAction("PICK_CONFIRM")}
              className={`p-3.5 rounded-2xl border text-left transition-all flex flex-col justify-between h-22 cursor-pointer ${ selectedAction === "PICK_CONFIRM" ? "bg-[--brand] text-white border-[--brand] shadow-sm font-semibold" : "bg-white border-[--line] text-[--text-muted] hover:text-[--text] hover:border-[--brand-line]" }`}
            >
              <PackageCheck className={`h-5 w-5 ${selectedAction === "PICK_CONFIRM" ? "text-white" : "text-[--brand]"}`} />
              <div>
                <div className="font-semibold text-xs">3. Sipariş Topla</div>
                <div className={`text-[10px] ${selectedAction === "PICK_CONFIRM" ? "text-blue-100" : "text-[--text-muted]"}`}>Raftan Çıkış</div>
              </div>
            </button>

            <button
              type="button"
              onClick={() => setSelectedAction("BLIND_COUNT_ENTRY")}
              className={`p-3.5 rounded-2xl border text-left transition-all flex flex-col justify-between h-22 cursor-pointer ${ selectedAction === "BLIND_COUNT_ENTRY" ? "bg-[--brand] text-white border-[--brand] shadow-sm font-semibold" : "bg-white border-[--line] text-[--text-muted] hover:text-[--text] hover:border-[--brand-line]" }`}
            >
              <ClipboardCheck className={`h-5 w-5 ${selectedAction === "BLIND_COUNT_ENTRY" ? "text-white" : "text-[--brand]"}`} />
              <div>
                <div className="font-semibold text-xs">4. Hücre Sayımı</div>
                <div className={`text-[10px] ${selectedAction === "BLIND_COUNT_ENTRY" ? "text-blue-100" : "text-[--text-muted]"}`}>Kör Sayım</div>
              </div>
            </button>
          </div>
          <div className="grid grid-cols-2 gap-2 mt-2">
            <button
              type="button"
              onClick={() => setSelectedAction("SSCC_SCAN")}
              className={`w-full p-2.5 rounded-2xl border text-left transition-all flex items-center justify-between cursor-pointer ${ selectedAction === "SSCC_SCAN" ? "bg-[--brand] text-white border-[--brand] font-semibold shadow-sm" : "bg-white border-[--line] text-[--text-muted] hover:text-[--text]" }`}
            >
              <div className="flex items-center gap-1.5 min-w-0">
                <QrCode className={`h-4 w-4 shrink-0 ${selectedAction === "SSCC_SCAN" ? "text-white" : "text-[--brand]"}`} />
                <span className="text-[11px] font-semibold truncate">5. SSCC-18 Palet</span>
              </div>
              <span className="text-[9px] font-mono shrink-0 opacity-80">AI(00)</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setSelectedAction("RMA_RETURN_RECEIPT")
                if (targetBinCode === "A-01-01") setTargetBinCode("Q-01-01")
              }}
              data-testid="mobile-action-rma-receipt"
              className={`w-full p-2.5 rounded-2xl border text-left transition-all flex items-center justify-between cursor-pointer ${ selectedAction === "RMA_RETURN_RECEIPT" ? "bg-[--warn-fill] text-white border-[--warn-fill] font-semibold shadow-sm" : "bg-white border-[--line] text-[--text-muted] hover:text-[--text]" }`}
            >
              <div className="flex items-center gap-1.5 min-w-0">
                <RotateCcw className={`h-4 w-4 shrink-0 ${selectedAction === "RMA_RETURN_RECEIPT" ? "text-white" : "text-[--warn]"}`} />
                <span className="text-[11px] font-semibold truncate">6. İade Kabul (RMA)</span>
              </div>
              <span className="text-[9px] font-mono shrink-0 opacity-80">Karantina</span>
            </button>
          </div>
        </div>

        {/* AÇIK İADE (RMA) BEKLEYEN PAKETLER */}
        {(selectedAction === "RMA_RETURN_RECEIPT" || openRmas.length > 0) && openRmas.length > 0 && (
          <div className="bg-white border border-[--warn-fill]/30 rounded-2xl p-3 space-y-2 shadow-sm">
            <div className="flex items-center justify-between text-[11px] text-[--warn]">
              <span className="flex items-center gap-1.5 font-semibold uppercase tracking-wider">
                <RotateCcw className="w-3.5 h-3.5 text-[--warn]" />
                Teslim Bekleyen İade (RMA) ({openRmas.length})
              </span>
              {activeRmaId && (
                <button
                  type="button"
                  onClick={() => {
                    setActiveRmaId(null)
                    setActiveRmaNumber(null)
                  }}
                  className="text-[10px] text-[--text-muted] hover:text-[--text] cursor-pointer"
                >
                  Temizle
                </button>
              )}
            </div>
            <div className="flex gap-2 overflow-x-auto pb-1">
              {openRmas.slice(0, 6).map((r) => {
                const isSel = activeRmaId === r.id
                return (
                  <button
                    key={r.id}
                    type="button"
                    onClick={() => {
                      setSelectedAction("RMA_RETURN_RECEIPT")
                      setActiveRmaId(r.id)
                      setActiveRmaNumber(r.rmaNumber)
                      setTargetBinCode(r.targetBinCode || "Q-01-01")
                      setQuantity(String(r.returnQty || 1))
                      setDamagedQty("0")
                      setBarcodeInput(r.labelCode || r.rmaNumber)
                      toast.success(`İade seçildi: ${r.rmaNumber}`)
                    }}
                    className={`shrink-0 text-left px-3 py-2 rounded-xl border text-[11px] transition cursor-pointer ${ isSel ? "bg-[--warn-soft] border-[--warn-fill]/50 text-[--warn] font-semibold" : "bg-[--page] border-[--line] text-[--text-2] hover:bg-white" }`}
                  >
                    <div className="font-mono font-semibold text-[--warn]">{r.rmaNumber}</div>
                    <div className="truncate max-w-[145px] text-[--text]">{r.customerName}</div>
                    <div className="text-[10px] text-[--text-muted] font-mono">
                      {safeText(r.sku)} • {safeNumber(r.returnQty, 1)} Adet • {r.returnTrackingNo || "Etiketsiz"}
                    </div>
                  </button>
                )
              })}
            </div>
          </div>
        )}

        {/* 3. GERÇEK BARKOD / KAMERA QR GİRİŞ & DONANIM TARAMA VİZÖRÜ */}
        <div className="space-y-2">
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Barcode className="absolute left-3.5 top-1/2 -translate-y-1/2 h-5 w-5 text-[--text-muted]" />
              <Input
                id="mobile-barcode-input"
                ref={barcodeInputRef}
                autoFocus
                value={barcodeInput}
                onChange={e => setBarcodeInput(e.target.value)}
                onKeyDown={e => {
                  if (e.key === "Enter") {
                    e.preventDefault()
                    handleLookupAndExecute(barcodeInput, "USB")
                  }
                }}
                placeholder={selectedAction === "RMA_RETURN_RECEIPT" ? "RMA|... / RMA No / Kargo Takip okutun..." : "Barkod / QR / SSCC okutun..."}
                className="pl-11 pr-20 h-12 text-sm bg-white border-[--line] text-[--text] placeholder:text-[--text-muted] rounded-2xl focus-visible:ring-[--brand] font-mono shadow-sm"
              />
              <Button
                size="sm"
                disabled={isLoadingLookup}
                onClick={() => handleLookupAndExecute(barcodeInput, "USB")}
                className="absolute right-1.5 top-1/2 -translate-y-1/2 h-9 px-3 bg-[--brand] hover:bg-[--brand-hover] text-[var(--text)] font-semibold text-xs rounded-xl cursor-pointer shadow-xs disabled:opacity-50"
              >
                {isLoadingLookup ? <RefreshCw className="h-3.5 w-3.5 animate-spin" /> : "İşle"}
              </Button>
            </div>
            <Button
              type="button"
              onClick={() => setIsCameraOpen(true)}
              className="h-12 px-3.5 bg-white hover:bg-[--brand-soft] border border-[--line] text-[--brand] rounded-2xl flex items-center gap-1.5 shrink-0 cursor-pointer shadow-xs"
              title="Kamera ile QR / Barkod Tara"
            >
              <Camera className="h-5 w-5" />
              <span className="text-xs font-semibold">Kamera</span>
            </Button>
          </div>

          {/* Hızlı Parametre Çubuğu (Hedef Raf, Sağlam & Hasarlı Miktar) */}
          <div className="flex items-center gap-2 text-xs">
            <div className="flex-1 bg-white border border-[--line] rounded-xl px-3 py-2 flex items-center justify-between shadow-xs">
              <span className="text-[--text-muted] text-[11px]">Hedef Raf:</span>
              <span className="font-mono font-semibold text-[--brand]">{targetBinCode}</span>
            </div>
            <div className="w-24 bg-white border border-[--line] rounded-xl px-2.5 py-2 flex items-center justify-between shadow-xs">
              <span className="text-[--text-muted] text-[11px]">{selectedAction === "RMA_RETURN_RECEIPT" ? "Sağlam:" : "Miktar:"}</span>
              <input
                type="number"
                min="0"
                value={quantity}
                onChange={e => setQuantity(e.target.value)}
                className="w-9 bg-transparent text-right font-semibold text-[--text] focus:outline-none"
              />
            </div>
            {selectedAction === "RMA_RETURN_RECEIPT" && (
              <div className="w-24 bg-white border border-[--warn-fill]/30 rounded-xl px-2.5 py-2 flex items-center justify-between shadow-xs">
                <span className="text-[--warn] text-[11px]">Hasarlı:</span>
                <input
                  type="number"
                  min="0"
                  value={damagedQty}
                  onChange={e => setDamagedQty(e.target.value)}
                  className="w-8 bg-transparent text-right font-semibold text-[--warn] focus:outline-none"
                />
              </div>
            )}
          </div>
        </div>

        {/* 4. DONANIM BARKOD TABANCASI BİLGİLENDİRMESİ */}
        <div className="rounded-2xl border border-dashed border-[--brand-line] bg-white p-4 text-center space-y-2 shadow-xs">
          <div className="flex items-center justify-center gap-2 text-[--brand]">
            <ScanLine className="h-5 w-5 animate-pulse" />
            <span className="text-xs font-semibold">USB / Lazer Barkod Okuyucu Aktif</span>
          </div>
          <p className="text-[11px] text-[--text-muted] max-w-xs mx-auto">
            El terminali veya Bluetooth barkod tabancasını okutunuz. Otomatik algılanır ve anında veritabanına işlenir.
          </p>

          {/* Hızlı Demo Barkod Butonları */}
          <div className="pt-1.5 flex flex-wrap gap-1.5 justify-center">
            <button
              type="button"
              onClick={() => handleLookupAndExecute("8690001001")}
              className="text-[10px] bg-[--page] hover:bg-white text-[--text-2] px-2.5 py-1 rounded-lg font-mono border border-[--line] cursor-pointer"
            >
              Gül (8690001001)
            </button>
            <button
              type="button"
              onClick={() => handleLookupAndExecute("8690001002")}
              className="text-[10px] bg-[--page] hover:bg-white text-[--text-2] px-2.5 py-1 rounded-lg font-mono border border-[--line] cursor-pointer"
            >
              Lilyum (8690001002)
            </button>
            <button
              type="button"
              onClick={() => handleLookupAndExecute("8690001003")}
              className="text-[10px] bg-[--page] hover:bg-white text-[--text-2] px-2.5 py-1 rounded-lg font-mono border border-[--line] cursor-pointer"
            >
              Vazo (8690001003)
            </button>
          </div>
        </div>

        {/* 5. SON TARANAN ÜRÜN CANLI BİLGİ KARTI */}
        {scannedProduct && (
          <div className="rounded-2xl border border-[--brand-line] bg-[--brand-soft] p-4 space-y-2 shadow-xs">
            <div className="flex items-start justify-between">
              <div>
                <div className="flex items-center gap-1.5 text-[--brand] text-xs font-semibold">
                  <CheckCircle2 className="h-4 w-4" />
                  <span>{scannedProduct.actionLabel} Tamamlandı</span>
                </div>
                <div className="font-semibold text-sm text-[--text] mt-1">{scannedProduct.name}</div>
                <div className="text-[11px] text-[--text-muted] font-mono">SKU: {safeText(scannedProduct.sku)}</div>
              </div>
              <Badge variant="outline" className="border-[--brand-line] bg-white text-[--brand] font-bold">
                {safeNumber(scannedProduct.processedQty, 0)} {scannedProduct.unit}
              </Badge>
            </div>

            {scannedProduct.bins.length > 0 && (
              <div className="pt-2 border-t border-[--brand-line]/40 text-[11px] text-[--text-2] flex items-center justify-between">
                <span>Mevcut Raf Dağılımı:</span>
                <span className="font-mono text-[--brand] font-semibold">
                  {scannedProduct.bins.map(b => `${b.binCode} (${b.onHandQty})`).join(", ")}
                </span>
              </div>
            )}
          </div>
        )}
      </div>

      {/* 6. ALT BİLGİ: KUYRUK SAYACI VE HIZLI SENKRON */}
      <div className="pt-3 border-t border-[--line] flex items-center justify-between text-[11px] text-[--text-muted]">
        <div>
          Cihaz: <span className="text-[--text] font-mono font-semibold">{deviceId}</span>
        </div>
        <div className="flex items-center gap-2">
          <span>Kuyruk: <strong className="text-[--text]">{queue.length}</strong></span>
          <Button
            size="sm"
            variant="outline"
            onClick={handleBatchSync}
            disabled={isSyncing}
            className="h-7 px-3 text-[10px] bg-white border-[--line] text-[--text-2] hover:bg-[--muted-bg] rounded-full cursor-pointer"
          >
            <RefreshCw className={`mr-1 h-3 w-3 ${isSyncing ? "animate-spin" : ""}`} />
            Senkronize Et
          </Button>
        </div>
      </div>

      {/* KAMERA QR / BARKOD OKUYUCU MODALI (@zxing/browser) */}
      {isCameraOpen && (
        <div className="fixed inset-0 z-50 bg-[--navy]/60 backdrop-blur-md flex flex-col items-center justify-center p-4">
          <div className="w-full max-w-sm bg-white border border-[--line] rounded-3xl overflow-hidden shadow-2xl text-[--text]">
            <div className="flex items-center justify-between px-4 py-3 border-b border-[--line]">
              <div className="flex items-center gap-2 text-xs font-semibold text-[--brand]">
                <Camera className="w-4 h-4" />
                Kamera QR / Barkod Okuyucu
              </div>
              <button
                type="button"
                onClick={() => setIsCameraOpen(false)}
                className="text-[--text-muted] hover:text-[--text] p-1 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="relative bg-black aspect-[4/3] flex items-center justify-center">
              <video ref={videoRef} className="w-full h-full object-cover" autoPlay muted playsInline />
              <div className="pointer-events-none absolute inset-8 border-2 border-[--brand] rounded-2xl" />
            </div>
            {cameraError && (
              <div className="p-3 bg-[--bad-soft] border-t border-[--bad-fill]/30 text-xs text-[--bad] font-medium">
                {cameraError}
              </div>
            )}
            <div className="p-3 text-center text-[11px] text-[--text-muted]">
              Kamerayı ürün barkodu, raf QR veya GS1-128 SSCC etiketine doğrultun.
            </div>
          </div>
        </div>
      )}

      {/* AYARLAR ÇEKMECESİ (SHEET) */}
      <Sheet open={isSettingsOpen} onOpenChange={setIsSettingsOpen}>
        <SheetContent side="bottom" className="bg-white text-[--text] border-t border-[--line] rounded-t-3xl max-w-md mx-auto p-6 shadow-2xl">
          <SheetHeader>
            <SheetTitle className="text-[--text] text-base font-semibold">Terminal Parametreleri</SheetTitle>
            <SheetDescription className="text-[--text-muted] text-xs">
              Saha cihazı ve varsayılan işlem hedeflerini yapılandırın.
            </SheetDescription>
          </SheetHeader>

          <div className="space-y-3.5 py-4 text-xs">
            <div className="space-y-1">
              <Label className="text-[--text-muted] text-xs">Varsayılan Hedef Raf (Bin Code)</Label>
              <Input
                value={targetBinCode}
                onChange={e => setTargetBinCode(e.target.value)}
                className="bg-[--page] border-[--line] text-[--text] font-mono rounded-xl h-9.5"
              />
            </div>

            <div className="space-y-1">
              <Label className="text-[--text-muted] text-xs">Cihaz Kimliği (Device ID)</Label>
              <Input
                value={deviceId}
                onChange={e => setDeviceId(e.target.value)}
                className="bg-[--page] border-[--line] text-[--text] font-mono rounded-xl h-9.5"
              />
            </div>

            <div className="space-y-1">
              <Label className="text-[--text-muted] text-xs">Operatör Adı</Label>
              <Input
                value={operatorName}
                onChange={e => setOperatorName(e.target.value)}
                className="bg-[--page] border-[--line] text-[--text] rounded-xl h-9.5"
              />
            </div>

            <div className="space-y-1">
              <Label className="text-[--text-muted] text-xs">Parti / Lot Numarası (Opsiyonel)</Label>
              <Input
                value={lotNumber}
                onChange={e => setLotNumber(e.target.value)}
                placeholder="Örn: LOT-2026-11"
                className="bg-[--page] border-[--line] text-[--text] font-mono rounded-xl h-9.5"
              />
            </div>

            <Button
              className="w-full bg-[--brand] hover:bg-[--brand-hover] text-[var(--text)] font-semibold rounded-full mt-2 h-9 cursor-pointer shadow-sm"
              onClick={() => {
                setIsSettingsOpen(false)
                toast.success("Terminal ayarları kaydedildi.")
              }}
            >
              Kaydet ve Kapat
            </Button>
          </div>
        </SheetContent>
      </Sheet>
    </div>
  )
}
