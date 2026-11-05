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
  AlertCircle
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
  type OfflineWmsOperation
} from "@/lib/wms/offlineSyncEngine"

type OperationType = "PUTAWAY_CONFIRM" | "PICK_CONFIRM" | "BLIND_COUNT_ENTRY" | "GOODS_RECEIPT"

export default function MobileFieldScannerPwaPage() {
  const [isOfflineMode, setIsOfflineMode] = useState(false)
  const [queue, setQueue] = useState<OfflineWmsOperation[]>([])
  const [selectedAction, setSelectedAction] = useState<OperationType>("PUTAWAY_CONFIRM")
  const [isSyncing, setIsSyncing] = useState(false)
  const [isSettingsOpen, setIsSettingsOpen] = useState(false)

  // Cihaz ve Operatör Bilgileri
  const [deviceId, setDeviceId] = useState("ZEBRA-TC58-IST-01")
  const [operatorName, setOperatorName] = useState("Saha Operatörü")
  const [targetBinCode, setTargetBinCode] = useState("A-01-01")
  const [quantity, setQuantity] = useState("10")
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

  // Çevrimdışı Kuyruğu Yükle
  useEffect(() => {
    getOfflineWmsQueue().then(res => setQueue(res || []))
  }, [])

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
  }, [selectedAction, quantity, targetBinCode, lotNumber, isOfflineMode, deviceId, operatorName])

  const pendingOfflineCount = (queue || []).filter(q => q.syncStatus === "QUEUED_OFFLINE").length

  // 2. GERÇEK BARKOD SORGULAMA VE İŞLEM YÜRÜTME
  const handleLookupAndExecute = async (codeToLookup: string) => {
    const code = codeToLookup.trim()
    if (!code) {
      toast.error("Lütfen bir barkod veya SKU giriniz.")
      return
    }

    setIsLoadingLookup(true)
    try {
      let matchedItem: any = null

      if (!isOfflineMode) {
        const res = await fetch(`/api/wms?section=lookup&barcode=${encodeURIComponent(code)}`)
        const data = await res.json()
        if (data.success && data.item) {
          matchedItem = data.item
        }
      }

      if (!matchedItem) {
        matchedItem = {
          id: `local-item-${code}`,
          sku: code,
          name: `Ürün [${code}]`,
          barcode: code,
          baseUnit: "Adet",
          totalStock: 0,
          bins: [{ binCode: targetBinCode, onHandQty: 0, warehouseName: "Yerel Saha" }]
        }
      }

      const qtyNum = Math.max(1, Number(quantity) || 1)
      const actionLabels: Record<OperationType, string> = {
        GOODS_RECEIPT: "Mal Kabul (Rampa Girişi)",
        PUTAWAY_CONFIRM: "Rafa Yerleştirme (Put-away)",
        PICK_CONFIRM: "Sipariş Toplama (Pick)",
        BLIND_COUNT_ENTRY: "Hücre Sayımı (Kör Sayım)"
      }

      await enqueueOfflineWmsOperation(
        {
          deviceId,
          operatorName,
          operationType: selectedAction,
          codeScanned: code,
          sku: matchedItem.sku,
          itemName: matchedItem.name,
          lotNumber: lotNumber || undefined,
          binCode: targetBinCode,
          quantity: qtyNum,
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
        processedQty: qtyNum,
        actionLabel: actionLabels[selectedAction],
        timestamp: new Date().toLocaleTimeString("tr-TR")
      })

      playTerminalBeep("success")
      setBarcodeInput("")

      if (isOfflineMode) {
        toast.warning("Çevrimdışı (Offline) Kuyruğa Alındı", {
          description: `${matchedItem.name} — ${qtyNum} ${matchedItem.baseUnit} IndexedDB'ye kaydedildi.`
        })
      } else {
        toast.success("Barkod Başarıyla İşlendi!", {
          description: `${matchedItem.name} — ${targetBinCode} rafına ${qtyNum} ${matchedItem.baseUnit} işlendi.`
        })
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
      playTerminalBeep("success")
      toast.success(`${result.syncedCount} Saha İşlemi Sunucuya Aktarıldı!`, {
        description: "IndexedDB kuyruğu ana PostgreSQL veritabanına başarıyla yazıldı."
      })
    } catch (e: any) {
      playTerminalBeep("error")
      toast.error("Eşitleme hatası: " + e.message)
    } finally {
      setIsSyncing(false)
    }
  }

  return (
    <div className="min-h-screen bg-[#080A09] text-white p-3 sm:p-5 flex flex-col justify-between max-w-md mx-auto select-none font-sans">
      {/* 1. ÜST BAR: GERİ DÖNÜŞ, ÇEVRİMDIŞI MODU VE AYARLAR */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <Link href="/dashboard/wms">
            <Button variant="ghost" size="sm" className="h-8 px-2.5 text-zinc-400 hover:text-white hover:bg-white/[0.06] text-xs gap-1.5 rounded-full cursor-pointer">
              <ArrowLeft className="h-4 w-4" />
              <span>WMS Panel</span>
            </Button>
          </Link>

          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsSettingsOpen(true)}
              className="h-8 px-2.5 text-zinc-400 hover:text-white hover:bg-white/[0.06] text-xs gap-1 rounded-full cursor-pointer"
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
              className={`h-8 px-3 rounded-full text-xs font-semibold cursor-pointer ${
                isOfflineMode
                  ? "bg-amber-500/15 text-amber-300 border border-amber-500/30"
                  : "bg-emerald-500/10 text-[#34D399] border border-emerald-500/20"
              }`}
            >
              {isOfflineMode ? <WifiOff className="mr-1 h-3.5 w-3.5" /> : <Wifi className="mr-1 h-3.5 w-3.5" />}
              {isOfflineMode ? "Offline" : "Online"}
            </Button>
          </div>
        </div>

        {/* Çevrimdışı Bekleyen İşlem Uyarısı */}
        {pendingOfflineCount > 0 && (
          <div className="bg-amber-500/[0.08] border border-amber-500/25 rounded-2xl p-3 flex items-center justify-between text-xs text-amber-200">
            <div className="flex items-center gap-2">
              <AlertCircle className="h-4 w-4 text-amber-400 shrink-0" />
              <span><strong>{pendingOfflineCount}</strong> çevrimdışı işlem senkron bekliyor.</span>
            </div>
            <Button
              size="sm"
              onClick={handleBatchSync}
              disabled={isSyncing}
              className="h-7 px-3 bg-amber-400 hover:bg-amber-300 text-slate-950 font-bold text-xs rounded-full cursor-pointer"
            >
              <RefreshCw className={`mr-1 h-3 w-3 ${isSyncing ? "animate-spin" : ""}`} />
              Eşitle
            </Button>
          </div>
        )}

        {/* 2. DÖRT DEV OPERASYON BUTONU (YÜKSEK KONTRASTLI OBSIDYEN & ZÜMRÜT) */}
        <div>
          <span className="text-[10px] font-semibold uppercase tracking-wider text-zinc-500 block mb-1.5 px-0.5">
            İşlem Modu Seçiniz:
          </span>
          <div className="grid grid-cols-2 gap-2.5">
            <button
              onClick={() => setSelectedAction("GOODS_RECEIPT")}
              className={`p-3.5 rounded-2xl border text-left transition-all flex flex-col justify-between h-22 cursor-pointer ${
                selectedAction === "GOODS_RECEIPT"
                  ? "bg-[#34D399] text-[#061811] border-[#34D399] shadow-lg shadow-emerald-500/20 font-semibold"
                  : "bg-[#111513] border-white/[0.06] text-zinc-400 hover:text-white hover:bg-white/[0.04]"
              }`}
            >
              <Truck className={`h-5 w-5 ${selectedAction === "GOODS_RECEIPT" ? "text-[#061811]" : "text-[#34D399]"}`} />
              <div>
                <div className="font-semibold text-xs">1. Mal Kabul</div>
                <div className={`text-[10px] ${selectedAction === "GOODS_RECEIPT" ? "text-emerald-950" : "text-zinc-500"}`}>Rampa Girişi</div>
              </div>
            </button>

            <button
              onClick={() => setSelectedAction("PUTAWAY_CONFIRM")}
              className={`p-3.5 rounded-2xl border text-left transition-all flex flex-col justify-between h-22 cursor-pointer ${
                selectedAction === "PUTAWAY_CONFIRM"
                  ? "bg-[#34D399] text-[#061811] border-[#34D399] shadow-lg shadow-emerald-500/20 font-semibold"
                  : "bg-[#111513] border-white/[0.06] text-zinc-400 hover:text-white hover:bg-white/[0.04]"
              }`}
            >
              <MapPin className={`h-5 w-5 ${selectedAction === "PUTAWAY_CONFIRM" ? "text-[#061811]" : "text-[#34D399]"}`} />
              <div>
                <div className="font-semibold text-xs">2. Rafa Yerleştir</div>
                <div className={`text-[10px] ${selectedAction === "PUTAWAY_CONFIRM" ? "text-emerald-950" : "text-zinc-500"}`}>Hücreye İstif</div>
              </div>
            </button>

            <button
              onClick={() => setSelectedAction("PICK_CONFIRM")}
              className={`p-3.5 rounded-2xl border text-left transition-all flex flex-col justify-between h-22 cursor-pointer ${
                selectedAction === "PICK_CONFIRM"
                  ? "bg-[#34D399] text-[#061811] border-[#34D399] shadow-lg shadow-emerald-500/20 font-semibold"
                  : "bg-[#111513] border-white/[0.06] text-zinc-400 hover:text-white hover:bg-white/[0.04]"
              }`}
            >
              <PackageCheck className={`h-5 w-5 ${selectedAction === "PICK_CONFIRM" ? "text-[#061811]" : "text-[#34D399]"}`} />
              <div>
                <div className="font-semibold text-xs">3. Sipariş Topla</div>
                <div className={`text-[10px] ${selectedAction === "PICK_CONFIRM" ? "text-emerald-950" : "text-zinc-500"}`}>Raftan Çıkış</div>
              </div>
            </button>

            <button
              onClick={() => setSelectedAction("BLIND_COUNT_ENTRY")}
              className={`p-3.5 rounded-2xl border text-left transition-all flex flex-col justify-between h-22 cursor-pointer ${
                selectedAction === "BLIND_COUNT_ENTRY"
                  ? "bg-[#34D399] text-[#061811] border-[#34D399] shadow-lg shadow-emerald-500/20 font-semibold"
                  : "bg-[#111513] border-white/[0.06] text-zinc-400 hover:text-white hover:bg-white/[0.04]"
              }`}
            >
              <ClipboardCheck className={`h-5 w-5 ${selectedAction === "BLIND_COUNT_ENTRY" ? "text-[#061811]" : "text-[#34D399]"}`} />
              <div>
                <div className="font-semibold text-xs">4. Hücre Sayımı</div>
                <div className={`text-[10px] ${selectedAction === "BLIND_COUNT_ENTRY" ? "text-emerald-950" : "text-zinc-500"}`}>Kör Sayım</div>
              </div>
            </button>
          </div>
        </div>

        {/* 3. GERÇEK BARKOD / SKU GİRİŞ & DONANIM TARAMA VİZÖRÜ */}
        <div className="space-y-2">
          <div className="relative">
            <Barcode className="absolute left-3.5 top-1/2 -translate-y-1/2 h-5 w-5 text-zinc-500" />
            <Input
              id="mobile-barcode-input"
              ref={barcodeInputRef}
              autoFocus
              value={barcodeInput}
              onChange={e => setBarcodeInput(e.target.value)}
              onKeyDown={e => {
                if (e.key === "Enter") {
                  e.preventDefault()
                  handleLookupAndExecute(barcodeInput)
                }
              }}
              placeholder="Barkod okutun veya yazın (8690001001)..."
              className="pl-11 pr-24 h-12 text-sm bg-[#111513] border-white/[0.08] text-white placeholder:text-zinc-600 rounded-2xl focus-visible:ring-[#34D399] font-mono"
            />
            <Button
              size="sm"
              disabled={isLoadingLookup}
              onClick={() => handleLookupAndExecute(barcodeInput)}
              className="absolute right-1.5 top-1/2 -translate-y-1/2 h-9 px-3.5 bg-[#34D399] hover:bg-[#34D399]/90 text-[#061811] font-semibold text-xs rounded-xl cursor-pointer"
            >
              {isLoadingLookup ? <RefreshCw className="h-3.5 w-3.5 animate-spin" /> : "İşle"}
            </Button>
          </div>

          {/* Hızlı Parametre Çubuğu (Hedef Raf & Miktar) */}
          <div className="flex items-center gap-2 text-xs">
            <div className="flex-1 bg-[#111513] border border-white/[0.06] rounded-xl px-3 py-2 flex items-center justify-between">
              <span className="text-zinc-500 text-[11px]">Hedef Raf:</span>
              <span className="font-mono font-semibold text-[#34D399]">{targetBinCode}</span>
            </div>
            <div className="w-28 bg-[#111513] border border-white/[0.06] rounded-xl px-3 py-2 flex items-center justify-between">
              <span className="text-zinc-500 text-[11px]">Miktar:</span>
              <input
                type="number"
                min="1"
                value={quantity}
                onChange={e => setQuantity(e.target.value)}
                className="w-10 bg-transparent text-right font-semibold text-white focus:outline-none"
              />
            </div>
          </div>
        </div>

        {/* 4. DONANIM BARKOD TABANCASI BİLGİLENDİRMESİ */}
        <div className="rounded-2xl border border-dashed border-emerald-500/20 bg-[#111513]/60 p-4 text-center space-y-2">
          <div className="flex items-center justify-center gap-2 text-[#34D399]">
            <ScanLine className="h-5 w-5 animate-pulse" />
            <span className="text-xs font-semibold">USB / Lazer Barkod Okuyucu Aktif</span>
          </div>
          <p className="text-[11px] text-zinc-400 max-w-xs mx-auto">
            El terminali veya Bluetooth barkod tabancasını okutunuz. Otomatik algılanır ve anında veritabanına işlenir.
          </p>

          {/* Hızlı Demo Barkod Butonları */}
          <div className="pt-1.5 flex flex-wrap gap-1.5 justify-center">
            <button
              onClick={() => handleLookupAndExecute("8690001001")}
              className="text-[10px] bg-white/[0.04] hover:bg-white/[0.08] text-zinc-300 px-2.5 py-1 rounded-lg font-mono border border-white/[0.06] cursor-pointer"
            >
              Gül (8690001001)
            </button>
            <button
              onClick={() => handleLookupAndExecute("8690001002")}
              className="text-[10px] bg-white/[0.04] hover:bg-white/[0.08] text-zinc-300 px-2.5 py-1 rounded-lg font-mono border border-white/[0.06] cursor-pointer"
            >
              Lilyum (8690001002)
            </button>
            <button
              onClick={() => handleLookupAndExecute("8690001003")}
              className="text-[10px] bg-white/[0.04] hover:bg-white/[0.08] text-zinc-300 px-2.5 py-1 rounded-lg font-mono border border-white/[0.06] cursor-pointer"
            >
              Vazo (8690001003)
            </button>
          </div>
        </div>

        {/* 5. SON TARANAN ÜRÜN CANLI BİLGİ KARTI */}
        {scannedProduct && (
          <div className="rounded-2xl border border-emerald-500/30 bg-emerald-500/[0.06] p-4 space-y-2">
            <div className="flex items-start justify-between">
              <div>
                <div className="flex items-center gap-1.5 text-[#34D399] text-xs font-semibold">
                  <CheckCircle2 className="h-4 w-4" />
                  <span>{scannedProduct.actionLabel} Tamamlandı</span>
                </div>
                <div className="font-semibold text-sm text-white mt-1">{scannedProduct.name}</div>
                <div className="text-[11px] text-zinc-400 font-mono">SKU: {scannedProduct.sku}</div>
              </div>
              <Badge variant="outline" className="border-emerald-500/30 bg-emerald-500/10 text-[#34D399] font-bold">
                {scannedProduct.processedQty} {scannedProduct.unit}
              </Badge>
            </div>

            {scannedProduct.bins.length > 0 && (
              <div className="pt-2 border-t border-emerald-500/15 text-[11px] text-zinc-300 flex items-center justify-between">
                <span>Mevcut Raf Dağılımı:</span>
                <span className="font-mono text-[#34D399] font-medium">
                  {scannedProduct.bins.map(b => `${b.binCode} (${b.onHandQty})`).join(", ")}
                </span>
              </div>
            )}
          </div>
        )}
      </div>

      {/* 6. ALT BİLGİ: KUYRUK SAYACI VE HIZLI SENKRON */}
      <div className="pt-3 border-t border-white/[0.06] flex items-center justify-between text-[11px] text-zinc-500">
        <div>
          Cihaz: <span className="text-zinc-300 font-mono">{deviceId}</span>
        </div>
        <div className="flex items-center gap-2">
          <span>Kuyruk: <strong className="text-white">{queue.length}</strong></span>
          <Button
            size="sm"
            variant="outline"
            onClick={handleBatchSync}
            disabled={isSyncing}
            className="h-7 px-3 text-[10px] bg-white/[0.04] border-white/[0.08] text-zinc-300 hover:text-white rounded-full cursor-pointer"
          >
            <RefreshCw className={`mr-1 h-3 w-3 ${isSyncing ? "animate-spin" : ""}`} />
            Senkronize Et
          </Button>
        </div>
      </div>

      {/* AYARLAR ÇEKMECESİ (SHEET) */}
      <Sheet open={isSettingsOpen} onOpenChange={setIsSettingsOpen}>
        <SheetContent side="bottom" className="bg-[#111513] text-white border-t border-white/[0.08] rounded-t-3xl max-w-md mx-auto p-6 shadow-2xl">
          <SheetHeader>
            <SheetTitle className="text-white text-base font-semibold">Terminal Parametreleri</SheetTitle>
            <SheetDescription className="text-zinc-400 text-xs">
              Saha cihazı ve varsayılan işlem hedeflerini yapılandırın.
            </SheetDescription>
          </SheetHeader>

          <div className="space-y-3.5 py-4 text-xs">
            <div className="space-y-1">
              <Label className="text-zinc-300 text-xs">Varsayılan Hedef Raf (Bin Code)</Label>
              <Input
                value={targetBinCode}
                onChange={e => setTargetBinCode(e.target.value)}
                className="bg-white/[0.04] border-white/[0.08] text-white font-mono rounded-xl h-9.5"
              />
            </div>

            <div className="space-y-1">
              <Label className="text-zinc-300 text-xs">Cihaz Kimliği (Device ID)</Label>
              <Input
                value={deviceId}
                onChange={e => setDeviceId(e.target.value)}
                className="bg-white/[0.04] border-white/[0.08] text-white font-mono rounded-xl h-9.5"
              />
            </div>

            <div className="space-y-1">
              <Label className="text-zinc-300 text-xs">Operatör Adı</Label>
              <Input
                value={operatorName}
                onChange={e => setOperatorName(e.target.value)}
                className="bg-white/[0.04] border-white/[0.08] text-white rounded-xl h-9.5"
              />
            </div>

            <div className="space-y-1">
              <Label className="text-zinc-300 text-xs">Parti / Lot Numarası (Opsiyonel)</Label>
              <Input
                value={lotNumber}
                onChange={e => setLotNumber(e.target.value)}
                placeholder="Örn: LOT-2026-11"
                className="bg-white/[0.04] border-white/[0.08] text-white font-mono rounded-xl h-9.5"
              />
            </div>

            <Button
              className="w-full bg-[#34D399] hover:bg-[#34D399]/90 text-[#061811] font-semibold rounded-full mt-2 h-9 cursor-pointer"
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
