"use client"

import React, { useState, useEffect } from "react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { ArrowDownLeft, ArrowUpRight, Loader2, AlertCircle } from "lucide-react"

interface QuickStockMovementModalProps {
  isOpen: boolean
  onClose: () => void
  mode: "IN" | "OUT"
  items: any[]
  warehouses: any[]
  preselectedItemId?: string
  onSuccess: () => void
}

export function QuickStockMovementModal({
  isOpen,
  onClose,
  mode: initialMode,
  items,
  warehouses,
  preselectedItemId,
  onSuccess
}: QuickStockMovementModalProps) {
  const [movementType, setMovementType] = useState<"IN" | "OUT">(initialMode)
  const [selectedItemId, setSelectedItemId] = useState<string>("")
  const [selectedWarehouseId, setSelectedWarehouseId] = useState<string>("")
  const [selectedStorageBinId, setSelectedStorageBinId] = useState<string>("")
  const [quantity, setQuantity] = useState<string>("1")
  const [unitCost, setUnitCost] = useState<string>("")
  const [docNo, setDocNo] = useState<string>("")
  const [lotNumber, setLotNumber] = useState<string>("")
  const [serialNumber, setSerialNumber] = useState<string>("")
  const [expiryDate, setExpiryDate] = useState<string>("")
  const [notes, setNotes] = useState<string>("")
  const [loading, setLoading] = useState(false)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)

  useEffect(() => {
    setMovementType(initialMode)
    setErrorMsg(null)
  }, [initialMode, isOpen])

  useEffect(() => {
    if (preselectedItemId) {
      setSelectedItemId(preselectedItemId)
    } else if (items.length > 0 && !selectedItemId) {
      setSelectedItemId(items[0].id)
    }
  }, [preselectedItemId, items])

  useEffect(() => {
    if (warehouses.length > 0 && !selectedWarehouseId) {
      setSelectedWarehouseId(warehouses[0].id)
    }
  }, [warehouses])

  const currentItem = items.find(i => i.id === selectedItemId)
  const currentWarehouse = warehouses.find(w => w.id === selectedWarehouseId)
  const availableBins = currentWarehouse?.bins || []

  // Seçilen depodaki mevcut stok
  const currentBalance = currentItem?.stockBalances?.find(
    (b: any) => b.warehouseId === selectedWarehouseId
  )
  const availableQty = currentBalance ? Number(currentBalance.availableQty || 0) : 0

  useEffect(() => {
    if (currentItem) {
      if (movementType === "IN") {
        setUnitCost(String(currentItem.fifoUnitCost || currentItem.standardCost || 0))
        setDocNo(`IRS-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`)
      } else {
        setUnitCost(String(currentItem.salesPrice || 0))
        setDocNo(`SARF-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`)
      }
    }
  }, [currentItem, movementType])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setErrorMsg(null)

    const numQty = Number(quantity)
    if (!selectedItemId) {
      setErrorMsg("Lütfen bir ürün seçin.")
      return
    }
    if (!selectedWarehouseId) {
      setErrorMsg("Lütfen bir depo seçin.")
      return
    }
    if (!numQty || numQty <= 0) {
      setErrorMsg("Geçerli bir miktar girin.")
      return
    }

    if (movementType === "OUT" && numQty > availableQty) {
      setErrorMsg(`Yetersiz stok! Mevcut kullanılabilir miktar: ${availableQty} ${currentItem?.baseUnit || "Adet"}`)
      return
    }

    setLoading(true)
    try {
      const res = await fetch("/api/inventory", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "stock_movement",
          payload: {
            movementType,
            itemId: selectedItemId,
            warehouseId: selectedWarehouseId,
            storageBinId: selectedStorageBinId || undefined,
            quantity: numQty,
            unitCost: Number(unitCost || 0),
            docNo,
            lotNumber: lotNumber || undefined,
            serialNumber: serialNumber || undefined,
            expiryDate: expiryDate || undefined,
            notes
          }
        })
      })

      const data = await res.json()
      if (!data.success) {
        throw new Error(data.error || "İşlem tamamlanamadı.")
      }

      onSuccess()
      onClose()
    } catch (err: any) {
      setErrorMsg(err.message || "İşlem sırasında bir hata oluştu.")
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={open => !open && onClose()}>
      <DialogContent className="sm:max-w-lg backdrop-blur-xl bg-[#111513] border border-white/[0.08] rounded-2xl shadow-2xl text-white">
        <DialogHeader>
          <div className="flex items-center gap-2.5">
            <div className={`p-2 rounded-xl border ${
              movementType === "IN"
                ? "bg-emerald-500/10 text-[#34D399] border-emerald-500/20"
                : "bg-white/[0.05] text-zinc-300 border-white/[0.08]"
            }`}>
              {movementType === "IN" ? <ArrowDownLeft className="h-5 w-5" /> : <ArrowUpRight className="h-5 w-5" />}
            </div>
            <div>
              <DialogTitle className="text-base font-semibold text-white">
                {movementType === "IN" ? "Hızlı Stok Girişi (Alış / İrsaliye)" : "Hızlı Stok Çıkışı (Satış / Sarf)"}
              </DialogTitle>
              <DialogDescription className="text-xs text-zinc-400">
                {movementType === "IN"
                  ? "Tedarikçiden gelen mal kabulü, irsaliye girişi ve anlık stok artışı."
                  : "Müşteri satışı, üretim sarfiyatı veya depodan anlık stok düşümü."}
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        {errorMsg && (
          <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs flex items-center gap-2">
            <AlertCircle className="h-4 w-4 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4 py-1">
          {/* Hareket Türü Seçici */}
          <div className="grid grid-cols-2 gap-2 bg-black/40 border border-white/[0.06] p-1 rounded-xl">
            <button
              type="button"
              onClick={() => setMovementType("IN")}
              className={`py-2 text-xs font-semibold rounded-lg transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                movementType === "IN"
                  ? "bg-[#34D399]/15 text-[#34D399] border border-emerald-500/20 shadow-xs"
                  : "text-zinc-400 hover:text-white"
              }`}
            >
              <ArrowDownLeft className="h-3.5 w-3.5" />
              Stok Girişi (Alış)
            </button>
            <button
              type="button"
              onClick={() => setMovementType("OUT")}
              className={`py-2 text-xs font-semibold rounded-lg transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                movementType === "OUT"
                  ? "bg-white/[0.1] text-white border border-white/[0.12] shadow-xs"
                  : "text-zinc-400 hover:text-white"
              }`}
            >
              <ArrowUpRight className="h-3.5 w-3.5" />
              Stok Çıkışı (Satış/Sarf)
            </button>
          </div>

          {/* Ürün Seçimi */}
          <div className="space-y-1.5">
            <Label className="text-xs font-medium text-zinc-300">İşlem Yapılacak Ürün *</Label>
            <Select value={selectedItemId} onValueChange={setSelectedItemId}>
              <SelectTrigger className="w-full text-xs bg-white/[0.03] border-white/[0.08] text-zinc-300 rounded-xl h-9.5">
                <SelectValue placeholder="Ürün seçin..." />
              </SelectTrigger>
              <SelectContent className="max-h-56 backdrop-blur-xl bg-[#111513] border border-white/[0.08] text-white">
                {items.map(item => (
                  <SelectItem key={item.id} value={item.id} className="text-xs">
                    {item.name} ({item.sku}) — Stok: {item.totalAvailable || 0} {item.baseUnit}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Depo & Raf Seçimi */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs font-medium text-zinc-300">Hedef Depo *</Label>
              <Select value={selectedWarehouseId} onValueChange={setSelectedWarehouseId}>
                <SelectTrigger className="w-full text-xs bg-white/[0.03] border-white/[0.08] text-zinc-300 rounded-xl h-9.5">
                  <SelectValue placeholder="Depo seçin..." />
                </SelectTrigger>
                <SelectContent className="backdrop-blur-xl bg-[#111513] border border-white/[0.08] text-white">
                  {warehouses.map(wh => (
                    <SelectItem key={wh.id} value={wh.id} className="text-xs">
                      {wh.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {movementType === "OUT" && (
                <p className="text-[11px] text-zinc-400">
                  Bu depodaki mevcut: <span className="font-semibold text-[#34D399]">{availableQty} {currentItem?.baseUnit || "Adet"}</span>
                </p>
              )}
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-medium text-zinc-300">Raf / Lokasyon (Opsiyonel)</Label>
              <Select value={selectedStorageBinId} onValueChange={setSelectedStorageBinId}>
                <SelectTrigger className="w-full text-xs bg-white/[0.03] border-white/[0.08] text-zinc-300 rounded-xl h-9.5">
                  <SelectValue placeholder="Raf seçin (Opsiyonel)..." />
                </SelectTrigger>
                <SelectContent className="backdrop-blur-xl bg-[#111513] border border-white/[0.08] text-white">
                  <SelectItem value="none" className="text-xs text-zinc-500">Genel Depo Alanı</SelectItem>
                  {availableBins.map((bin: any) => (
                    <SelectItem key={bin.id} value={bin.id} className="text-xs">
                      {bin.code} {bin.binPosition ? `(${bin.binPosition})` : ""}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Miktar & Birim Maliyet */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs font-medium text-zinc-300">
                Miktar ({currentItem?.baseUnit || "Adet"}) *
              </Label>
              <Input
                type="number"
                min="0.1"
                step="any"
                value={quantity}
                onChange={e => setQuantity(e.target.value)}
                placeholder="Örn: 10"
                className="text-xs bg-white/[0.03] border-white/[0.08] text-white rounded-xl h-9.5"
                required
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-medium text-zinc-300">
                {movementType === "IN" ? "Birim Alış Maliyeti (₺)" : "Birim Satış Tutarı (₺)"}
              </Label>
              <Input
                type="number"
                min="0"
                step="0.01"
                value={unitCost}
                onChange={e => setUnitCost(e.target.value)}
                placeholder="0.00"
                className="text-xs bg-white/[0.03] border-white/[0.08] text-white rounded-xl h-9.5"
              />
            </div>
          </div>

          {/* Belge No & Lot / SKT */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs font-medium text-zinc-300">İrsaliye / Belge No</Label>
              <Input
                type="text"
                value={docNo}
                onChange={e => setDocNo(e.target.value)}
                placeholder="IRS-2026-..."
                className="text-xs font-mono bg-white/[0.03] border-white/[0.08] text-white rounded-xl h-9.5"
              />
            </div>

            {movementType === "IN" && (
              <div className="space-y-1.5">
                <Label className="text-xs font-medium text-zinc-300">Parti / Lot No (Opsiyonel)</Label>
                <Input
                  type="text"
                  value={lotNumber}
                  onChange={e => setLotNumber(e.target.value)}
                  placeholder="LOT-2026-..."
                  className="text-xs font-mono bg-white/[0.03] border-white/[0.08] text-white rounded-xl h-9.5"
                />
              </div>
            )}
          </div>

          {movementType === "IN" && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {currentItem?.trackExpiry && (
                <div className="space-y-1.5">
                  <Label className="text-xs font-medium text-zinc-300">Son Kullanma Tarihi (SKT)</Label>
                  <Input
                    type="date"
                    value={expiryDate}
                    onChange={e => setExpiryDate(e.target.value)}
                    className="text-xs bg-white/[0.03] border-white/[0.08] text-white rounded-xl h-9.5"
                  />
                </div>
              )}
              <div className="space-y-1.5">
                <Label className="text-xs font-medium text-zinc-300">Seri No (Opsiyonel)</Label>
                <Input
                  type="text"
                  value={serialNumber}
                  onChange={e => setSerialNumber(e.target.value)}
                  placeholder="SN-2026-..."
                  className="text-xs font-mono bg-white/[0.03] border-white/[0.08] text-white rounded-xl h-9.5"
                />
              </div>
            </div>
          )}

          {/* Açıklama */}
          <div className="space-y-1.5">
            <Label className="text-xs font-medium text-zinc-300">Hareket Notu / Açıklama</Label>
            <Textarea
              value={notes}
              onChange={e => setNotes(e.target.value)}
              placeholder="Örn: Haftalık taze mezat alımı..."
              rows={2}
              className="text-xs resize-none bg-white/[0.03] border-white/[0.08] text-white rounded-xl"
            />
          </div>

          <DialogFooter className="pt-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={onClose}
              disabled={loading}
              className="bg-white/[0.04] hover:bg-white/[0.08] text-zinc-300 border-white/[0.08] rounded-full cursor-pointer h-9 px-4"
            >
              İptal
            </Button>
            <Button
              type="submit"
              size="sm"
              disabled={loading}
              className={
                movementType === "IN"
                  ? "bg-[#34D399] hover:bg-[#34D399]/90 text-[#061811] font-semibold rounded-full cursor-pointer h-9 px-4 shadow-lg shadow-emerald-500/20"
                  : "bg-white text-zinc-900 hover:bg-zinc-200 font-semibold rounded-full cursor-pointer h-9 px-4 shadow-lg shadow-white/10"
              }
            >
              {loading && <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />}
              {movementType === "IN" ? "Stoğa Giriş Yap" : "Stoktan Çıkış Yap"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
