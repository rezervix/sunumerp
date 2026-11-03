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
  AlertCircle
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
import { toast } from "sonner"
import {
  getOfflineWmsQueue,
  enqueueOfflineWmsOperation,
  syncAllOfflineWmsOperations,
  type OfflineWmsOperation
} from "@/lib/wms/offlineSyncEngine"
import { enterpriseInventoryService } from "@/lib/services/enterpriseInventorySuite"

export default function MobileFieldScannerPwaPage() {
  const [inventoryState] = useState(() => enterpriseInventoryService.getState())
  const [isOfflineMode, setIsOfflineMode] = useState(false)
  const [queue, setQueue] = useState<OfflineWmsOperation[]>([])
  const [scanMode, setScanMode] = useState<"BARCODE_SCAN" | "QR_LOT_SCAN" | "RFID_BULK_READ">(
    "BARCODE_SCAN"
  )
  const [operationTaskType, setOperationTaskType] = useState<
    "PUTAWAY_CONFIRM" | "PICK_CONFIRM" | "BLIND_COUNT_ENTRY" | "LPN_TRANSFER"
  >("PUTAWAY_CONFIRM")

  const [deviceId, setDeviceId] = useState("ZEBRA-TC58-IST-04")
  const [operatorName, setOperatorName] = useState("Murat Karahan")
  const [selectedSku, setSelectedSku] = useState("SKU-FLR-001")
  const [scannedCode, setScannedCode] = useState("8690001001014")
  const [binCode, setBinCode] = useState("IST-Z1-A01-R01-L02-B01")
  const [lpnCode, setLpnCode] = useState("LPN-TR-2026-000891")
  const [lotNumber, setLotNumber] = useState("LOT-2026-1101")
  const [quantity, setQuantity] = useState("25")
  const [isSyncing, setIsSyncing] = useState(false)

  useEffect(() => {
    getOfflineWmsQueue().then(res => setQueue(res || []))
  }, [])

  const pendingOfflineCount = (queue || []).filter(q => q.syncStatus === "QUEUED_OFFLINE").length

  const handleSimulateHardwareScan = async (
    mode: "BARCODE_SCAN" | "QR_LOT_SCAN" | "RFID_BULK_READ"
  ) => {
    setScanMode(mode)
    const items = inventoryState.items || []
    const matchedItem =
    items.find(i => i.sku === selectedSku) ||
      items[0] || {
      sku: selectedSku || "SKU-GEN-001",
      name: "Genel Stok Kalemi",
      rfidEpcPrefix: "3034257BF",
      gtin: "8690001100000",
      barcode: "8690001100000",
      baseUnit: "Adet"
    }

    const effectiveQty =
      mode === "RFID_BULK_READ" ? 48 : Math.max(1, Number(quantity) || 15)
    const generatedCode =
      mode === "RFID_BULK_READ"
        ? `EPC-${matchedItem.rfidEpcPrefix || "3034257BF"}-BATCH(${effectiveQty})`
        : mode === "QR_LOT_SCAN"
            ? `GS1-01${matchedItem.gtin || "8690001100000"}1726111810${lotNumber}`
            : matchedItem.barcode || "8690001100000"

    setScannedCode(generatedCode)

    const created = await enqueueOfflineWmsOperation(
      {
        deviceId,
        operatorName,
        operationType: mode === "RFID_BULK_READ" ? "RFID_BULK_READ" : operationTaskType,
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

    if (isOfflineMode) {
      toast.warning("Çevrimdışı (Offline) Kayıt IndexedDB Kuyruğuna Yazıldı", {
        description: `${created.codeScanned} (${created.quantity} ${created.unit}) yerel veritabanına alındı. Bağlantı geldiğinde senkronize edilecek.`
      })
    } else {
      toast.success("Saha Tarama İşlemi Anlık Senkronize Edildi", {
        description: `${created.sku} • ${created.binCode} hücresine ${created.quantity} ${created.unit} işlendi.`
      })
    }
  }

  const handleBatchSync = async () => {
    setIsSyncing(true)
    try {
      const result = await syncAllOfflineWmsOperations()
      setQueue(result.operations)
      setIsOfflineMode(false)
      toast.success(`${result.syncedCount} Çevrimdışı Saha İşlemi Sunucuyla Senkronize Edildi!`, {
        description: "IndexedDB (sunum_wms_offline_db) kuyruğu sıfırlandı ve stok bakiyeleri güncellendi."
      })
    } finally {
      setIsSyncing(false)
    }
  }

  return (
    <div className="space-y-6 p-6">
      {/* Üst Başlık */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <Link href="/dashboard/wms">
              <Button variant="ghost" size="sm" className="h-7 px-2 gap-1 text-xs">
                <ArrowLeft className="h-3.5 w-3.5" />
                WMS Merkezine Dön
              </Button>
            </Link>
            <Badge className="bg-slate-900 text-white">
              Faz 2 • PWA & IndexedDB Offline-First Mobil Saha Terminali
            </Badge>
          </div>
          <h1 className="mt-2 text-2xl font-bold tracking-tight text-slate-900">
            Mobil El Terminali: Barkod, QR Kod & Toplu UHF RFID Saha Tarayıcı
          </h1>
          <p className="text-sm text-slate-600">
            Soğuk hava deposu veya ölü Wi-Fi noktalarında çevrimdışı (IndexedDB) çalışıp bağlantı sağlandığında otomatik senkronize olan saha modülü.
          </p>
        </div>

        {/* Çevrimiçi / Çevrimdışı (Offline) Simülasyon Anahtarı */}
        <div className="flex items-center gap-3">
          <Button
            variant={isOfflineMode ? "destructive" : "outline"}
            onClick={() => {
              setIsOfflineMode(prev => !prev)
              toast.info(
                !isOfflineMode
                  ? "Cihaz Çevrimdışı (Offline) Moda Alındı: Tüm okumalar IndexedDB'ye kaydedilecek."
                  : "Cihaz Çevrimiçi (Online) Moda Geçti: Bekleyen kuyruğu senkronize edebilirsiniz."
              )
            }}
            className="gap-2"
          >
            {isOfflineMode ? (
              <>
                <WifiOff className="h-4 w-4" />
                Çevrimdışı Mod Aktif (IndexedDB Queue)
              </>
            ) : (
              <>
                <Wifi className="h-4 w-4 text-emerald-600" />
                Çevrimiçi (Canlı WMS Bağlantısı)
              </>
            )}
          </Button>

          <Button
            onClick={handleBatchSync}
            disabled={pendingOfflineCount === 0 || isSyncing}
            className="bg-emerald-600 hover:bg-emerald-700 text-white gap-1.5"
          >
            <RefreshCw className={`h-4 w-4 ${isSyncing ? "animate-spin" : ""}`} />
            Bekleyenleri Senkronize Et ({pendingOfflineCount})
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        {/* Sol: Endüstriyel El Terminali (Zebra / Honeywell) Simülatörü */}
        <Card className="border-2 border-slate-800 bg-slate-950 text-white lg:col-span-5 shadow-xl">
          <CardHeader className="border-b border-slate-800 pb-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Smartphone className="h-5 w-5 text-emerald-400" />
                <span className="font-mono text-xs font-bold text-emerald-400">
                  {deviceId}
                </span>
              </div>
              <Badge
                className={
                  isOfflineMode
                    ? "bg-amber-500 text-slate-950 font-bold"
                    : "bg-emerald-500 text-slate-950 font-bold"
                }
              >
                {isOfflineMode ? "OFFLINE • INDEXED_DB" : "ONLINE • 5G / WIFI-6"}
              </Badge>
            </div>
            <CardTitle className="text-base text-white mt-2">
              Endüstriyel Saha Okuyucu Ekranı
            </CardTitle>
            <CardDescription className="text-slate-400 text-xs">
              1D/2D Barkod, GS1-128 Karekod (QR) veya Toplu UHF RFID Anten tetikleyicisi.
            </CardDescription>
          </CardHeader>
          <CardContent className="p-4 space-y-4">
            {/* 3 Tarama Teknolojisi Seçimi */}
            <div className="grid grid-cols-3 gap-2">
              <Button
                type="button"
                variant={scanMode === "BARCODE_SCAN" ? "default" : "outline"}
                onClick={() => handleSimulateHardwareScan("BARCODE_SCAN")}
                className={`h-16 flex-col gap-1 text-xs ${scanMode === "BARCODE_SCAN"
                    ? "bg-emerald-600 hover:bg-emerald-700 text-white"
                    : "bg-slate-900 border-slate-700 text-slate-200 hover:bg-slate-800"
                  }`}
              >
                <Barcode className="h-5 w-5" />
                1D Barkod Okut
              </Button>
              <Button
                type="button"
                variant={scanMode === "QR_LOT_SCAN" ? "default" : "outline"}
                onClick={() => handleSimulateHardwareScan("QR_LOT_SCAN")}
                className={`h-16 flex-col gap-1 text-xs ${scanMode === "QR_LOT_SCAN"
                    ? "bg-indigo-600 hover:bg-indigo-700 text-white"
                    : "bg-slate-900 border-slate-700 text-slate-200 hover:bg-slate-800"
                  }`}
              >
                <QrCode className="h-5 w-5" />
                GS1 QR / Lot Okut
              </Button>
              <Button
                type="button"
                variant={scanMode === "RFID_BULK_READ" ? "default" : "outline"}
                onClick={() => handleSimulateHardwareScan("RFID_BULK_READ")}
                className={`h-16 flex-col gap-1 text-xs ${scanMode === "RFID_BULK_READ"
                    ? "bg-purple-600 hover:bg-purple-700 text-white"
                    : "bg-slate-900 border-slate-700 text-slate-200 hover:bg-slate-800"
                  }`}
              >
                <Radio className="h-5 w-5" />
                Toplu RFID (48x)
              </Button>
            </div>

            {/* Lazer Okuma Vizörü */}
            <div className="rounded-lg border border-emerald-500/40 bg-slate-900 p-3 font-mono text-xs space-y-1">
              <div className="flex justify-between text-[10px] text-emerald-400">
                <span>LAZER / EPC OKUMA TAMPONU</span>
                <span>{scanMode}</span>
              </div>
              <div className="text-sm font-bold text-white break-all">{scannedCode}</div>
            </div>

            {/* Saha Operasyon Parametreleri */}
            <div className="space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <Label className="text-slate-300 text-xs">Saha İşlem Tipi</Label>
                  <Select
                    value={operationTaskType}
                    onValueChange={v => setOperationTaskType(v as any)}
                  >
                    <SelectTrigger className="mt-1 bg-slate-900 border-slate-700 text-white h-9 text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="PUTAWAY_CONFIRM">Rafa Yerleştirme (Put-Away)</SelectItem>
                      <SelectItem value="PICK_CONFIRM">Sipariş / Dalga Toplama (Pick)</SelectItem>
                      <SelectItem value="BLIND_COUNT_ENTRY">Kör Sayım Girişi (Blind Count)</SelectItem>
                      <SelectItem value="LPN_TRANSFER">LPN Palet Transferi</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-slate-300 text-xs">Miktar</Label>
                  <Input
                    type="number"
                    value={quantity}
                    onChange={e => setQuantity(e.target.value)}
                    className="mt-1 bg-slate-900 border-slate-700 text-white h-9 text-xs"
                  />
                </div>
              </div>

              <div>
                <Label className="text-slate-300 text-xs">Stok Kartı (SKU)</Label>
                <Select value={selectedSku} onValueChange={setSelectedSku}>
                  <SelectTrigger className="mt-1 bg-slate-900 border-slate-700 text-white h-9 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {inventoryState.items.map(item => (
                      <SelectItem key={item.id} value={item.sku}>
                        {item.sku} — {item.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <Label className="text-slate-300 text-xs">Hücre Adresi (Bin)</Label>
                  <Input
                    value={binCode}
                    onChange={e => setBinCode(e.target.value)}
                    className="mt-1 bg-slate-900 border-slate-700 text-white h-9 text-xs font-mono"
                  />
                </div>
                <div>
                  <Label className="text-slate-300 text-xs">LPN / Palet Kodu</Label>
                  <Input
                    value={lpnCode}
                    onChange={e => setLpnCode(e.target.value)}
                    className="mt-1 bg-slate-900 border-slate-700 text-white h-9 text-xs font-mono"
                  />
                </div>
              </div>

              <Button
                onClick={() => handleSimulateHardwareScan(scanMode)}
                className="w-full h-10 bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-bold text-xs"
              >
                Tetikle & {isOfflineMode ? "IndexedDB Kuyruğuna Yaz" : "Anlık Sunucuya İşle"}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Sağ: IndexedDB & Çevrimdışı Senkronizasyon Kuyruğu */}
        <Card className="border-slate-200 lg:col-span-7">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-base flex items-center gap-2">
                  <Database className="h-4 w-4 text-indigo-600" />
                  IndexedDB (`sunum_wms_offline_db`) Saha İşlem & Senkronizasyon Kuyruğu
                </CardTitle>
                <CardDescription>
                  Çevrimdışı okutulan barkod, QR ve UHF RFID paketlerinin yerel veritabanı kayıtları ve sunucu mutabakat durumu.
                </CardDescription>
              </div>
              <Badge variant="outline" className="font-mono">
                Toplam Kayıt: {(queue || []).length}
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
              {(queue || []).map(op => (
                <div
                  key={op.id}
                  className={`rounded-lg border p-3.5 space-y-2 ${op.syncStatus === "QUEUED_OFFLINE"
                      ? "border-amber-300 bg-amber-50/40"
                      : "border-slate-200 bg-white"
                    }`}
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <Badge className="bg-slate-900 text-white font-mono text-[10px]">
                        {op.operationType}
                      </Badge>
                      <span className="font-mono text-xs font-bold text-indigo-700">
                        {op.codeScanned}
                      </span>
                    </div>
                    <Badge
                      className={
                        op.syncStatus === "QUEUED_OFFLINE"
                          ? "bg-amber-500 text-white"
                          : "bg-emerald-600 text-white"
                      }
                    >
                      {op.syncStatus === "QUEUED_OFFLINE"
                        ? "OFFLINE KUYRUKTA (BEKLİYOR)"
                        : "SUNUCUYA SENKRONİZE EDİLDİ"}
                    </Badge>
                  </div>

                  <div className="flex flex-wrap justify-between text-xs">
                    <div>
                      <strong className="text-slate-900">{op.itemName}</strong> ({op.sku})
                    </div>
                    <div className="font-bold text-emerald-700">
                      {op.quantity} {op.unit}
                    </div>
                  </div>

                  <div className="flex flex-wrap justify-between text-[11px] text-slate-500 font-mono">
                    <span>Hücre: {op.binCode}</span>
                    <span>LPN: {op.lpnCode || "-"}</span>
                    <span>Cihaz: {op.deviceId} ({op.operatorName})</span>
                    <span>Kayıt: {op.queuedAt}</span>
                  </div>

                  {op.conflictNote && (
                    <div className="text-[11px] text-amber-800 bg-amber-100/60 px-2.5 py-1 rounded">
                      {op.conflictNote}
                    </div>
                  )}
                </div>
              ))}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

