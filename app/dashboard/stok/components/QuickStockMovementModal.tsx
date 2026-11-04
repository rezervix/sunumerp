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
      <DialogContent className="sm:max-w-lg bg-white">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <div className={`p-2 rounded-lg ${
              movementType === "IN" ? "bg-emerald-100 text-emerald-700" : "bg-blue-100 text-blue-700"
            }`}>
              {movementType === "IN" ? <ArrowDownLeft className="h-5 w-5" /> : <ArrowUpRight className="h-5 w-5" />}
            </div>
            <div>
              <DialogTitle className="text-lg font-semibold text-slate-900">
                {movementType === "IN" ? "Hızlı Stok Girişi (Alış / İrsaliye)" : "Hızlı Stok Çıkışı (Satış / Sarf)"}
              </DialogTitle>
              <DialogDescription className="text-xs text-slate-500">
                {movementType === "IN"
                  ? "Tedarikçiden gelen mal kabulü, irsaliye girişi ve anlık stok artışı."
                  : "Müşteri satışı, üretim sarfiyatı veya depodan anlık stok düşümü."}
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        {errorMsg && (
          <div className="p-3 rounded-lg bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2">
            <AlertCircle className="h-4 w-4 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4 py-2">
          {/* Hareket Türü Seçici */}
          <div className="grid grid-cols-2 gap-2 bg-slate-100 p-1 rounded-lg">
            <button
              type="button"
              onClick={() => setMovementType("IN")}
              className={`py-1.5 text-xs font-medium rounded-md transition-all flex items-center justify-center gap-1.5 ${
                movementType === "IN" ? "bg-white text-emerald-700 shadow-xs" : "text-slate-600 hover:text-slate-900"
              }`}
            >
              <ArrowDownLeft className="h-3.5 w-3.5" />
              Stok Girişi (Alış)
            </button>
            <button
              type="button"
              onClick={() => setMovementType("OUT")}
              className={`py-1.5 text-xs font-medium rounded-md transition-all flex items-center justify-center gap-1.5 ${
                movementType === "OUT" ? "bg-white text-blue-700 shadow-xs" : "text-slate-600 hover:text-slate-900"
              }`}
            >
              <ArrowUpRight className="h-3.5 w-3.5" />
              Stok Çıkışı (Satış/Sarf)
            </button>
          </div>

          {/* Ürün Seçimi */}
          <div className="space-y-1.5">
            <Label className="text-xs font-medium text-slate-700">İşlem Yapılacak Ürün *</Label>
            <Select value={selectedItemId} onValueChange={setSelectedItemId}>
              <SelectTrigger className="w-full text-xs">
                <SelectValue placeholder="Ürün seçin..." />
              </SelectTrigger>
              <SelectContent className="max-h-56">
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
              <Label className="text-xs font-medium text-slate-700">Hedef Depo *</Label>
              <Select value={selectedWarehouseId} onValueChange={setSelectedWarehouseId}>
                <SelectTrigger className="w-full text-xs">
                  <SelectValue placeholder="Depo seçin..." />
                </SelectTrigger>
                <SelectContent>
                  {warehouses.map(wh => (
                    <SelectItem key={wh.id} value={wh.id} className="text-xs">
                      {wh.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {movementType === "OUT" && (
                <p className="text-[11px] text-slate-500">
                  Bu depodaki mevcut: <span className="font-semibold text-slate-800">{availableQty} {currentItem?.baseUnit || "Adet"}</span>
                </p>
              )}
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-medium text-slate-700">Raf / Lokasyon (Opsiyonel)</Label>
              <Select value={selectedStorageBinId} onValueChange={setSelectedStorageBinId}>
                <SelectTrigger className="w-full text-xs">
                  <SelectValue placeholder="Raf seçin (Opsiyonel)..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none" className="text-xs text-slate-400">Genel Depo Alanı</SelectItem>
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
              <Label className="text-xs font-medium text-slate-700">
                Miktar ({currentItem?.baseUnit || "Adet"}) *
              </Label>
              <Input
                type="number"
                min="0.1"
                step="any"
                value={quantity}
                onChange={e => setQuantity(e.target.value)}
                placeholder="Örn: 10"
                className="text-xs"
                required
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-medium text-slate-700">
                {movementType === "IN" ? "Birim Alış Maliyeti (₺)" : "Birim Satış Tutarı (₺)"}
              </Label>
              <Input
                type="number"
                min="0"
                step="0.01"
                value={unitCost}
                onChange={e => setUnitCost(e.target.value)}
                placeholder="0.00"
                className="text-xs"
              />
            </div>
          </div>

          {/* Belge No & Lot / SKT */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs font-medium text-slate-700">İrsaliye / Belge No</Label>
              <Input
                type="text"
                value={docNo}
                onChange={e => setDocNo(e.target.value)}
                placeholder="IRS-2026-..."
                className="text-xs font-mono"
              />
            </div>

            {movementType === "IN" && (
              <div className="space-y-1.5">
                <Label className="text-xs font-medium text-slate-700">Parti / Lot No (Opsiyonel)</Label>
                <Input
                  type="text"
                  value={lotNumber}
                  onChange={e => setLotNumber(e.target.value)}
                  placeholder="LOT-2026-..."
                  className="text-xs font-mono"
                />
              </div>
            )}
          </div>

          {movementType === "IN" && currentItem?.trackExpiry && (
            <div className="space-y-1.5">
              <Label className="text-xs font-medium text-slate-700">Son Kullanma Tarihi (SKT)</Label>
              <Input
                type="date"
                value={expiryDate}
                onChange={e => setExpiryDate(e.target.value)}
                className="text-xs"
              />
            </div>
          )}

          {/* Açıklama */}
          <div className="space-y-1.5">
            <Label className="text-xs font-medium text-slate-700">Hareket Notu / Açıklama</Label>
            <Textarea
              value={notes}
              onChange={e => setNotes(e.target.value)}
              placeholder="Örn: Haftalık taze mezat alımı..."
              rows={2}
              className="text-xs resize-none"
            />
          </div>

          <DialogFooter className="pt-2">
            <Button type="button" variant="outline" size="sm" onClick={onClose} disabled={loading}>
              İptal
            </Button>
            <Button
              type="submit"
              size="sm"
              disabled={loading}
              className={movementType === "IN" ? "bg-emerald-600 hover:bg-emerald-700 text-white" : "bg-blue-600 hover:bg-blue-700 text-white"}
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

