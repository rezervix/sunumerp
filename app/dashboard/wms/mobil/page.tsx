"use client"

import React, { useState, useEffect, useRef } from "react"
import Link from "next/link"
import {
  Smartphone,
  Wifi,
  WifiOff,
  Barcode,
  QrCode,
  RefreshCw,
  CheckCircle2,
  ArrowLeft,
  Truck,
  MapPin,
  PackageCheck,
  ClipboardCheck,
  SlidersHorizontal,
  ScanLine,
  Camera,
  AlertCircle,
  Package,
  Layers,
  Check
} from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"
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
      // Başka bir aktif input varsa sadece barcode input'u dinle
      const activeEl = document.activeElement
      if (activeEl && activeEl.tagName === "INPUT" && activeEl.id !== "mobile-barcode-input") {
        return
      }

      const now = Date.now()
      // Barkod okuyucular tuşları < 50ms aralıkla ardışık basar
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

      // Çevrimdışıysa veya API bulunamadıysa yedek bilgi oluştur
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

      // Kuyruğa / Veritabanına Yaz
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
    <div className="min-h-screen bg-slate-950 text-white p-3 sm:p-5 flex flex-col justify-between max-w-md mx-auto select-none">
      {/* 1. ÜST BAR: GERİ DÖNÜŞ, ÇEVRİMDIŞI MODU VE AYARLAR */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <Link href="/dashboard/wms">
            <Button variant="ghost" size="sm" className="h-8 px-2 text-slate-300 hover:text-white hover:bg-slate-900 text-xs gap-1.5">
              <ArrowLeft className="h-4 w-4" />
              <span>WMS Panel</span>
            </Button>
          </Link>

          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsSettingsOpen(true)}
              className="h-8 px-2 text-slate-300 hover:text-white hover:bg-slate-900 text-xs gap-1"
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
              className={`h-8 px-2.5 rounded-full text-xs font-semibold ${
                isOfflineMode
                  ? "bg-amber-500/20 text-amber-400 border border-amber-500/40"
                  : "bg-emerald-500/20 text-emerald-400 border border-emerald-500/40"
              }`}
            >
              {isOfflineMode ? <WifiOff className="mr-1 h-3.5 w-3.5" /> : <Wifi className="mr-1 h-3.5 w-3.5" />}
              {isOfflineMode ? "Offline" : "Online"}
            </Button>
          </div>
        </div>

        {/* Çevrimdışı Bekleyen İşlem Uyarısı */}
        {pendingOfflineCount > 0 && (
          <div className="bg-amber-950/40 border border-amber-500/50 rounded-xl p-2.5 flex items-center justify-between text-xs text-amber-200">
            <div className="flex items-center gap-2">
              <AlertCircle className="h-4 w-4 text-amber-400 shrink-0" />
              <span><strong>{pendingOfflineCount}</strong> çevrimdışı işlem senkron bekliyor.</span>
            </div>
            <Button
              size="sm"
              onClick={handleBatchSync}
              disabled={isSyncing}
              className="h-7 px-3 bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold text-xs"
            >
              <RefreshCw className={`mr-1 h-3 w-3 ${isSyncing ? "animate-spin" : ""}`} />
              Eşitle
            </Button>
          </div>
        )}

        {/* 2. DÖRT DEV OPERASYON BUTONU */}
        <div>
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1.5 px-0.5">
            İşlem Modu Seçiniz:
          </span>
          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={() => setSelectedAction("GOODS_RECEIPT")}
              className={`p-3 rounded-xl border text-left transition-all flex flex-col justify-between h-20 ${
                selectedAction === "GOODS_RECEIPT"
                  ? "bg-emerald-600 border-emerald-400 ring-2 ring-emerald-400 shadow-lg text-white"
                  : "bg-slate-900 border-slate-800 text-slate-300 hover:bg-slate-850"
              }`}
            >
              <Truck className="h-5 w-5" />
              <div>
                <div className="font-bold text-xs">1. Mal Kabul</div>
                <div className="text-[10px] opacity-80">Rampa Girişi</div>
              </div>
            </button>

            <button
              onClick={() => setSelectedAction("PUTAWAY_CONFIRM")}
              className={`p-3 rounded-xl border text-left transition-all flex flex-col justify-between h-20 ${
                selectedAction === "PUTAWAY_CONFIRM"
                  ? "bg-blue-600 border-blue-400 ring-2 ring-blue-400 shadow-lg text-white"
                  : "bg-slate-900 border-slate-800 text-slate-300 hover:bg-slate-850"
              }`}
            >
              <MapPin className="h-5 w-5" />
              <div>
                <div className="font-bold text-xs">2. Rafa Yerleştir</div>
                <div className="text-[10px] opacity-80">Hücreye İstif</div>
              </div>
            </button>

            <button
              onClick={() => setSelectedAction("PICK_CONFIRM")}
              className={`p-3 rounded-xl border text-left transition-all flex flex-col justify-between h-20 ${
                selectedAction === "PICK_CONFIRM"
                  ? "bg-purple-600 border-purple-400 ring-2 ring-purple-400 shadow-lg text-white"
                  : "bg-slate-900 border-slate-800 text-slate-300 hover:bg-slate-850"
              }`}
            >
              <PackageCheck className="h-5 w-5" />
              <div>
                <div className="font-bold text-xs">3. Sipariş Topla</div>
                <div className="text-[10px] opacity-80">Raftan Çıkış</div>
              </div>
            </button>

            <button
              onClick={() => setSelectedAction("BLIND_COUNT_ENTRY")}
              className={`p-3 rounded-xl border text-left transition-all flex flex-col justify-between h-20 ${
                selectedAction === "BLIND_COUNT_ENTRY"
                  ? "bg-amber-600 border-amber-400 ring-2 ring-amber-400 shadow-lg text-white"
                  : "bg-slate-900 border-slate-800 text-slate-300 hover:bg-slate-850"
              }`}
            >
              <ClipboardCheck className="h-5 w-5" />
              <div>
                <div className="font-bold text-xs">4. Hücre Sayımı</div>
                <div className="text-[10px] opacity-80">Kör Sayım</div>
              </div>
            </button>
          </div>
        </div>

        {/* 3. GERÇEK BARKOD / SKU GİRİŞ & DONANIM TARAMA VİZÖRÜ */}
        <div className="space-y-2">
          <div className="relative">
            <Barcode className="absolute left-3.5 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
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
              className="pl-11 pr-24 h-13 text-sm bg-slate-900 border-slate-800 text-white placeholder:text-slate-500 rounded-xl focus-visible:ring-indigo-500 font-mono"
            />
            <Button
              size="sm"
              disabled={isLoadingLookup}
              onClick={() => handleLookupAndExecute(barcodeInput)}
              className="absolute right-1.5 top-1/2 -translate-y-1/2 h-9 px-3 bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs rounded-lg"
            >
              {isLoadingLookup ? <RefreshCw className="h-3.5 w-3.5 animate-spin" /> : "İşle"}
            </Button>
          </div>

          {/* Hızlı Parametre Çubuğu (Hedef Raf & Miktar) */}
          <div className="flex items-center gap-2 text-xs">
            <div className="flex-1 bg-slate-900 border border-slate-800 rounded-lg px-2.5 py-1.5 flex items-center justify-between">
              <span className="text-slate-400 text-[11px]">Hedef Raf:</span>
              <span className="font-mono font-bold text-indigo-400">{targetBinCode}</span>
            </div>
            <div className="w-28 bg-slate-900 border border-slate-800 rounded-lg px-2.5 py-1.5 flex items-center justify-between">
              <span className="text-slate-400 text-[11px]">Miktar:</span>
              <input
                type="number"
                min="1"
                value={quantity}
                onChange={e => setQuantity(e.target.value)}
                className="w-10 bg-transparent text-right font-bold text-white focus:outline-none"
              />
            </div>
          </div>
        </div>

        {/* 4. DONANIM BARKOD TABANCASI BİLGİLENDİRMESİ & KAMERA BUTONU */}
        <div className="rounded-xl border border-dashed border-indigo-500/30 bg-slate-900/40 p-4 text-center space-y-2">
          <div className="flex items-center justify-center gap-2 text-indigo-400">
            <ScanLine className="h-6 w-6 animate-pulse" />
            <span className="text-xs font-semibold">USB / Lazer Barkod Okuyucu Aktif</span>
          </div>
          <p className="text-[11px] text-slate-400 max-w-xs mx-auto">
            El terminali veya Bluetooth barkod tabancasını okutunuz. Otomatik algılanır ve anında veritabanına işlenir.
          </p>

          {/* Hızlı Demo Barkod Butonları */}
          <div className="pt-2 flex flex-wrap gap-1.5 justify-center">
            <button
              onClick={() => handleLookupAndExecute("8690001001")}
              className="text-[10px] bg-slate-800 hover:bg-slate-700 text-slate-300 px-2 py-1 rounded font-mono border border-slate-700"
            >
              Kırmızı Gül (8690001001)
            </button>
            <button
              onClick={() => handleLookupAndExecute("8690001002")}
              className="text-[10px] bg-slate-800 hover:bg-slate-700 text-slate-300 px-2 py-1 rounded font-mono border border-slate-700"
            >
              Lilyum (8690001002)
            </button>
            <button
              onClick={() => handleLookupAndExecute("8690001003")}
              className="text-[10px] bg-slate-800 hover:bg-slate-700 text-slate-300 px-2 py-1 rounded font-mono border border-slate-700"
            >
              Vazo (8690001003)
            </button>
          </div>
        </div>

        {/* 5. SON TARANAN ÜRÜN CANLI BİLGİ KARTI */}
        {scannedProduct && (
          <div className="rounded-xl border border-emerald-500/40 bg-emerald-950/30 p-3.5 space-y-2">
            <div className="flex items-start justify-between">
              <div>
                <div className="flex items-center gap-1.5 text-emerald-400 text-xs font-bold">
                  <CheckCircle2 className="h-4 w-4" />
                  <span>{scannedProduct.actionLabel} Tamamlandı</span>
                </div>
                <div className="font-bold text-sm text-white mt-0.5">{scannedProduct.name}</div>
                <div className="text-[11px] text-slate-400 font-mono">SKU: {scannedProduct.sku}</div>
              </div>
              <Badge variant="outline" className="border-emerald-500/50 bg-emerald-500/20 text-emerald-300 font-bold">
                {scannedProduct.processedQty} {scannedProduct.unit}
              </Badge>
            </div>

            {scannedProduct.bins.length > 0 && (
              <div className="pt-1.5 border-t border-emerald-900/40 text-[11px] text-slate-300 flex items-center justify-between">
                <span>Mevcut Raf Dağılımı:</span>
                <span className="font-mono text-emerald-400 font-semibold">
                  {scannedProduct.bins.map(b => `${b.binCode} (${b.onHandQty})`).join(", ")}
                </span>
              </div>
            )}
          </div>
        )}
      </div>

      {/* 6. ALT BİLGİ: KUYRUK SAYACI VE HIZLI SENKRON */}
      <div className="pt-3 border-t border-slate-900 flex items-center justify-between text-[11px] text-slate-400">
        <div>
          Cihaz: <span className="text-slate-200 font-mono">{deviceId}</span>
        </div>
        <div className="flex items-center gap-2">
          <span>Kuyruk: <strong>{queue.length}</strong></span>
          <Button
            size="sm"
            variant="outline"
            onClick={handleBatchSync}
            disabled={isSyncing}
            className="h-7 px-2.5 text-[10px] bg-slate-900 border-slate-800 text-slate-200"
          >
            <RefreshCw className={`mr-1 h-3 w-3 ${isSyncing ? "animate-spin" : ""}`} />
            Senkronize Et
          </Button>
        </div>
      </div>

      {/* AYARLAR ÇEKMECESİ (SHEET) */}
      <Sheet open={isSettingsOpen} onOpenChange={setIsSettingsOpen}>
        <SheetContent side="bottom" className="bg-slate-900 text-white border-slate-800 rounded-t-2xl max-w-md mx-auto">
          <SheetHeader>
            <SheetTitle className="text-white text-base">Terminal Parametreleri</SheetTitle>
            <SheetDescription className="text-slate-400 text-xs">
              Saha cihazı ve varsayılan işlem hedeflerini yapılandırın.
            </SheetDescription>
          </SheetHeader>

          <div className="space-y-3 py-4 text-xs">
            <div className="space-y-1">
              <Label className="text-slate-300 text-xs">Varsayılan Hedef Raf (Bin Code)</Label>
              <Input
                value={targetBinCode}
                onChange={e => setTargetBinCode(e.target.value)}
                className="bg-slate-800 border-slate-700 text-white font-mono"
              />
            </div>

            <div className="space-y-1">
              <Label className="text-slate-300 text-xs">Cihaz Kimliği (Device ID)</Label>
              <Input
                value={deviceId}
                onChange={e => setDeviceId(e.target.value)}
                className="bg-slate-800 border-slate-700 text-white font-mono"
              />
            </div>

            <div className="space-y-1">
              <Label className="text-slate-300 text-xs">Operatör Adı</Label>
              <Input
                value={operatorName}
                onChange={e => setOperatorName(e.target.value)}
                className="bg-slate-800 border-slate-700 text-white"
              />
            </div>

            <div className="space-y-1">
              <Label className="text-slate-300 text-xs">Parti / Lot Numarası (Opsiyonel)</Label>
              <Input
                value={lotNumber}
                onChange={e => setLotNumber(e.target.value)}
                placeholder="Örn: LOT-2026-11"
                className="bg-slate-800 border-slate-700 text-white font-mono"
              />
            </div>

            <Button
              className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-semibold mt-2"
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
