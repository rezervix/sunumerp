"use client"

import React, { useState, useEffect } from "react"
import Link from "next/link"
import {
  Smartphone,
  Wifi,
  WifiOff,
  Barcode,
  QrCode,
  Radio,
  RefreshCw,
  CheckCircle2,
  Database,
  ArrowLeft,
  PackagePlus,
  Layers,
  AlertCircle,
  Truck,
  MapPin,
  PackageCheck,
  ClipboardCheck,
  Check,
  SlidersHorizontal,
  Volume2,
  ScanLine
} from "lucide-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from "@/components/ui/select"
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
import { enterpriseInventoryService } from "@/lib/services/enterpriseInventorySuite"

type OperationType = "PUTAWAY_CONFIRM" | "PICK_CONFIRM" | "BLIND_COUNT_ENTRY" | "GOODS_RECEIPT"

export default function MobileFieldScannerPwaPage() {
  const [inventoryState] = useState(() => enterpriseInventoryService.getState())
  const [isOfflineMode, setIsOfflineMode] = useState(false)
  const [queue, setQueue] = useState<OfflineWmsOperation[]>([])
  const [scanMode, setScanMode] = useState<"BARCODE_SCAN" | "QR_LOT_SCAN" | "RFID_BULK_READ">("BARCODE_SCAN")
  const [selectedAction, setSelectedAction] = useState<OperationType>("PUTAWAY_CONFIRM")

  // Cihaz ve Operatör Bilgileri (Drawer içinde gizli)
  const [deviceId, setDeviceId] = useState("ZEBRA-TC58-IST-04")
  const [operatorName, setOperatorName] = useState("Murat Karahan")
  const [selectedSku, setSelectedSku] = useState("SKU-FLR-001")
  const [binCode, setBinCode] = useState("IST-Z1-A01-R01-L02-B01")
  const [lpnCode, setLpnCode] = useState("LPN-TR-2026-000891")
  const [lotNumber, setLotNumber] = useState("LOT-2026-1101")
  const [quantity, setQuantity] = useState("25")
  const [isSyncing, setIsSyncing] = useState(false)
  const [isSettingsOpen, setIsSettingsOpen] = useState(false)

  // Son Yapılan Başarılı Tarama Ekranı
  const [lastScannedResult, setLastScannedResult] = useState<{
    code: string
    itemName: string
    qty: number
    unit: string
    targetBin: string
    timestamp: string
  } | null>(null)

  useEffect(() => {
    getOfflineWmsQueue().then(res => setQueue(res || []))
  }, [])

  const pendingOfflineCount = (queue || []).filter(q => q.syncStatus === "QUEUED_OFFLINE").length

    // Donanım Taraması Simülasyonu
    const handlePerformScan = async (mode: "BARCODE_SCAN" | "QR_LOT_SCAN" | "RFID_BULK_READ" = scanMode) => {
      const items = inventoryState.items || []
          const matchedItem = items.find(i => i.sku === selectedSku) || items[0] || {
            sku: selectedSku || "SKU-GEN-001",
            name: "Ekvador Gül Buketi",
            rfidEpcPrefix: "3034257BF",
            gtin: "8690001100000",
            barcode: "8690001100000",
            baseUnit: "Adet"
          }

    const effectiveQty = mode === "RFID_BULK_READ" ? 48 : Math.max(1, Number(quantity) || 15)
    const generatedCode =
            mode === "RFID_BULK_READ"
              ? `EPC-${matchedItem.rfidEpcPrefix || "3034257BF"}-BATCH(${effectiveQty})`
              : mode === "QR_LOT_SCAN"
                  ? `GS1-01${matchedItem.gtin || "8690001100000"}1726111810${lotNumber}`
                  : matchedItem.barcode || "8690001100000"

    const created = await enqueueOfflineWmsOperation(
                    {
                      deviceId,
                      operatorName,
                      operationType: mode === "RFID_BULK_READ" ? "RFID_BULK_READ" : selectedAction,
                      codeScanned: generatedCode,
                      sku: matchedItem.sku,
                      itemName: matchedItem.name,
                      lotNumber,
                      binCode,
                      lpnCode,
                      quantity: effectiveQty,
                      unit: matchedItem.baseUnit || "Adet"
                    },
                    isOfflineMode
                  )

    const updated = await getOfflineWmsQueue()
    setQueue(updated || [])

        setLastScannedResult({
          code: generatedCode,
          itemName: matchedItem.name,
          qty: effectiveQty,
          unit: matchedItem.baseUnit || "Adet",
          targetBin: binCode,
          timestamp: new Date().toLocaleTimeString("tr-TR")
        })

      if (isOfflineMode) {
      toast.warning("Çevrimdışı (Offline) Kaydedildi", {
            description: `İnternet yokken yerel veritabanına alındı. Bağlantı geldiğinde senkronize edilecek.`
          })
        } else {
      toast.success("Barkod Başarıyla Okundu & Kaydedildi!", {
              description: `${matchedItem.name} — ${binCode} rafına işlendi.`
            })
          }
  }

  // Toplu Senkronizasyon
  const handleBatchSync = async () => {
          setIsSyncing(true)
          try {
            const result = await syncAllOfflineWmsOperations()
            setQueue(result.operations)
            setIsOfflineMode(false)
      toast.success(`${result.syncedCount} Saha Kaydı Sunucuya Aktarıldı!`, {
                description: "IndexedDB kuyruğu ana ERP veritabanına başarıyla yazıldı."
              })
            } finally {
              setIsSyncing(false)
            }
          }

  return (
                <div className="min-h-screen bg-slate-950 text-white p-3 sm:p-6 flex flex-col justify-between max-w-lg mx-auto">
                  {/* ÜST BAR: DURUM VE HIZLI GEÇİŞ */}
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <Link href="/dashboard/wms">
                        <Button variant="ghost" size="sm" className="h-8 px-2 text-slate-300 hover:text-white hover:bg-slate-800 text-xs gap-1">
                          <ArrowLeft className="h-4 w-4" />
                          Depo Merkezine Dön
                        </Button>
                      </Link>

                      <div className="flex items-center gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setIsSettingsOpen(true)}
                          className="h-8 px-2 text-slate-300 hover:text-white hover:bg-slate-800 text-xs gap-1"
                        >
                          <SlidersHorizontal className="h-3.5 w-3.5" />
                          Ayarlar
                        </Button>

                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setIsOfflineMode(prev => !prev)
                            toast.info(!isOfflineMode ? "Çevrimdışı (Offline) moda geçildi." : "Çevrimiçi moda dönüldü.")
                          }}
                          className={`h-8 px-2.5 rounded-full text-xs font-semibold ${isOfflineMode ? "bg-amber-500/20 text-amber-400 border border-amber-500/40" : "bg-emerald-500/20 text-emerald-400 border border-emerald-500/40"
                            }`}
                        >
                          {isOfflineMode ? <WifiOff className="mr-1 h-3.5 w-3.5" /> : <Wifi className="mr-1 h-3.5 w-3.5" />}
                          {isOfflineMode ? "Çevrimdışı" : "Online"}
                        </Button>
                      </div>
                    </div>

                    {/* Offline Uyarı ve Eşitleme Butonu */}
                    {pendingOfflineCount > 0 && (
                      <div className="bg-amber-500/20 border border-amber-500/40 rounded-xl p-3 flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <AlertCircle className="h-4 w-4 text-amber-400 shrink-0" />
                          <span className="text-xs text-amber-200">
                            {pendingOfflineCount} işlem çevrimdışı sırada bekliyor.
                          </span>
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

                    {/* 4 DEV OPERASYON BUTONU (SIFIR EĞİTİM GEREKTİRİR) */}
                    <div>
                          <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 px-1 block mb-2">
                            Yapmak İstediğiniz İşlemi Seçin:
                          </span>
                          <div className="grid grid-cols-2 gap-2.5">
                            <button
                              onClick={() => setSelectedAction("GOODS_RECEIPT")}
                              className={`p-3.5 rounded-xl border text-left transition-all flex flex-col justify-between h-24 ${selectedAction === "GOODS_RECEIPT"
                                  ? "bg-emerald-600 border-emerald-400 shadow-lg shadow-emerald-950/50 ring-2 ring-emerald-400"
                                  : "bg-slate-900 border-slate-800 text-slate-300 hover:bg-slate-850"
                                }`}
                            >
                              <Truck className="h-6 w-6" />
                              <div>
                                <div className="font-bold text-sm">Mal Kabul Yap</div>
                                <div className="text-[10px] text-white/80">Rampada Gelen Mal</div>
                              </div>
                            </button>

                            <button
                              onClick={() => setSelectedAction("PUTAWAY_CONFIRM")}
                              className={`p-3.5 rounded-xl border text-left transition-all flex flex-col justify-between h-24 ${selectedAction === "PUTAWAY_CONFIRM"
                                  ? "bg-blue-600 border-blue-400 shadow-lg shadow-blue-950/50 ring-2 ring-blue-400"
                                  : "bg-slate-900 border-slate-800 text-slate-300 hover:bg-slate-850"
                                }`}
                            >
                              <MapPin className="h-6 w-6" />
                              <div>
                                <div className="font-bold text-sm">Rafa Yerleştir</div>
                                <div className="text-[10px] text-white/80">Hücreye İstif</div>
                              </div>
                            </button>

                            <button
                              onClick={() => setSelectedAction("PICK_CONFIRM")}
                              className={`p-3.5 rounded-xl border text-left transition-all flex flex-col justify-between h-24 ${selectedAction === "PICK_CONFIRM"
                                  ? "bg-purple-600 border-purple-400 shadow-lg shadow-purple-950/50 ring-2 ring-purple-400"
                                  : "bg-slate-900 border-slate-800 text-slate-300 hover:bg-slate-850"
                                }`}
                            >
                              <PackageCheck className="h-6 w-6" />
                              <div>
                                <div className="font-bold text-sm">Sipariş Topla</div>
                                <div className="text-[10px] text-white/80">FEFO Öncelikli Çıkış</div>
                              </div>
                            </button>

                            <button
                              onClick={() => setSelectedAction("BLIND_COUNT_ENTRY")}
                              className={`p-3.5 rounded-xl border text-left transition-all flex flex-col justify-between h-24 ${selectedAction === "BLIND_COUNT_ENTRY"
                                  ? "bg-amber-600 border-amber-400 shadow-lg shadow-amber-950/50 ring-2 ring-amber-400"
                                  : "bg-slate-900 border-slate-800 text-slate-300 hover:bg-slate-850"
                                }`}
                            >
                              <ClipboardCheck className="h-6 w-6" />
                              <div>
                                <div className="font-bold text-sm">Hızlı Sayım Yap</div>
                                <div className="text-[10px] text-white/80">Raf / Hücre Sayımı</div>
                              </div>
                            </button>
                          </div>
                      </div>

                      {/* KAMERA / BARKOD OKUMA VİZÖRÜ (ORTA ALAN) */}
                      <div className="relative rounded-2xl border-2 border-dashed border-indigo-500/50 bg-slate-900/60 p-6 flex flex-col items-center justify-center min-h-[200px] text-center overflow-hidden">
                        {/* Hareketli Tarama Çizgisi Simülasyonu */}
                        <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-transparent via-emerald-400 to-transparent animate-pulse" />

                        <ScanLine className="h-12 w-12 text-indigo-400 mb-2 animate-bounce" />
                        <div className="text-sm font-semibold text-slate-200">
                          Kamera Vizörü Hazır
                        </div>
                        <div className="text-xs text-slate-400 mt-1 max-w-[260px]">
                          Barkodu veya QR kodu telefon/terminal kamerasına gösterin.
                        </div>

                        <div className="mt-4 flex items-center gap-2">
                          <Badge variant="outline" className="border-slate-700 bg-slate-800 text-slate-300 font-mono text-[11px]">
                            Hedef Hücre: {binCode}
                          </Badge>
                          <Badge variant="outline" className="border-slate-700 bg-slate-800 text-slate-300 text-[11px]">
                            Miktar: {quantity} Adet
                          </Badge>
                        </div>
                      </div>

                        {/* BÜYÜK OKUTMA BUTONLARI (1D / 2D / RFID) */}
                        <div className="space-y-2">
                          <Button
                            onClick={() => handlePerformScan("BARCODE_SCAN")}
                            className="w-full h-14 bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-base rounded-xl shadow-lg gap-2"
                          >
                            <Barcode className="h-5 w-5" />
                            Barkodu Okut (Tek Tık)
                          </Button>

                          <div className="grid grid-cols-2 gap-2">
                            <Button
                              onClick={() => handlePerformScan("QR_LOT_SCAN")}
                              className="h-11 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold rounded-lg gap-1.5"
                            >
                              <QrCode className="h-4 w-4 text-indigo-400" />
                              GS1 QR / Lot Oku
                            </Button>
                            <Button
                              onClick={() => handlePerformScan("RFID_BULK_READ")}
                              className="h-11 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold rounded-lg gap-1.5"
                            >
                              <Radio className="h-4 w-4 text-purple-400" />
                              Toplu UHF RFID Oku (48 Adet)
                            </Button>
                          </div>
                        </div>

                              {/* SON TARAMA BİLGİ KARTI (ONAY VE YÖNLENDİRME) */}
                              {lastScannedResult && (
          <div className="p-3.5 bg-emerald-950/40 border border-emerald-500/40 rounded-xl space-y-1.5 animate-in fade-in">
            <div className="flex items-center justify-between text-xs text-emerald-400 font-semibold">
              <span className="flex items-center gap-1.5">
                <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                İşlem Başarılı
              </span>
              <span className="font-mono text-[10px] text-slate-400">{lastScannedResult.timestamp}</span>
            </div>
            <div className="font-bold text-slate-100 text-sm">
              {lastScannedResult.itemName}
            </div>
            <div className="flex items-center justify-between text-xs text-slate-300">
              <span>Okunan: <strong>{lastScannedResult.qty} {lastScannedResult.unit}</strong></span>
              <span className="font-mono text-emerald-400">Hedef: {lastScannedResult.targetBin}</span>
            </div>
          </div>
        )}
      </div>

      {/* ALT BİLGİ */}
      <div className="pt-4 text-center text-[11px] text-slate-500">
        Operatör: {operatorName} • Cihaz: {deviceId}
      </div>

      {/* CİHAZ VE İLERİ DÜZEY AYARLAR DRAWER (SHEET) */}
      <Sheet open={isSettingsOpen} onOpenChange={setIsSettingsOpen}>
        <SheetContent side="right" className="bg-slate-900 border-slate-800 text-white w-full sm:max-w-md p-6">
          <SheetHeader>
            <SheetTitle className="text-white text-base">Terminal & Saha Ayarları</SheetTitle>
            <SheetDescription className="text-slate-400 text-xs">
              El terminali parametrelerini ve manuel SKU seçimlerini yapılandırın.
            </SheetDescription>
          </SheetHeader>

          <div className="space-y-4 py-4 text-xs">
            <div>
              <Label className="text-slate-300 text-xs">Operatör Adı</Label>
              <Input
                value={operatorName}
                onChange={e => setOperatorName(e.target.value)}
                className="mt-1 bg-slate-800 border-slate-700 text-white"
              />
            </div>

            <div>
              <Label className="text-slate-300 text-xs">Cihaz Kimliği (Hardware ID)</Label>
              <Input
                value={deviceId}
                onChange={e => setDeviceId(e.target.value)}
                className="mt-1 bg-slate-800 border-slate-700 font-mono text-white"
              />
            </div>

            <div>
              <Label className="text-slate-300 text-xs">Okutulacak Test Ürünü</Label>
              <Select value={selectedSku} onValueChange={setSelectedSku}>
                <SelectTrigger className="mt-1 bg-slate-800 border-slate-700 text-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-slate-850 border-slate-700 text-white">
                  {(inventoryState.items || []).map(i => (
                    <SelectItem key={i.id} value={i.sku}>{i.name} ({i.sku})</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-slate-300 text-xs">Hedef Hücre (Bin)</Label>
                <Input
                  value={binCode}
                  onChange={e => setBinCode(e.target.value)}
                  className="mt-1 bg-slate-800 border-slate-700 font-mono text-white"
                />
              </div>
              <div>
                <Label className="text-slate-300 text-xs">Miktar</Label>
                <Input
                  type="number"
                  value={quantity}
                  onChange={e => setQuantity(e.target.value)}
                  className="mt-1 bg-slate-800 border-slate-700 text-white"
                />
              </div>
            </div>

            <div className="pt-4 border-t border-slate-800">
              <div className="text-xs font-semibold text-slate-300 mb-2">
                IndexedDB Çevrimdışı Kuyruk ({queue.length} işlem)
              </div>
              <div className="space-y-1.5 max-h-40 overflow-y-auto">
                {queue.map(q => (
                  <div key={q.id} className="p-2 bg-slate-800 rounded text-[11px] flex justify-between">
                    <div>
                      <div className="font-semibold text-white">{q.itemName}</div>
                      <div className="text-slate-400 font-mono">{q.operationType} • {q.binCode}</div>
                    </div>
                    <Badge variant="outline" className="border-slate-600 text-slate-300 text-[10px]">
                      {q.syncStatus}
                    </Badge>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </SheetContent>
      </Sheet>
                          </div>
                          )
}
