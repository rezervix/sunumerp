"use client"

import React, { useState } from "react"
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
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger
} from "@/components/ui/accordion"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Checkbox } from "@/components/ui/checkbox"
import { Plus, Trash2, Sparkles, Loader2, AlertCircle, PackagePlus } from "lucide-react"

interface CreateItemModalProps {
  isOpen: boolean
  onClose: () => void
  warehouses: any[]
  existingItems: any[]
  onSuccess: () => void
}

export function CreateItemModal({
  isOpen,
  onClose,
  warehouses,
  existingItems,
  onSuccess
}: CreateItemModalProps) {
  // ── 4 TEMEL ALAN ──────────────────────────────────────────
  const [name, setName] = useState("")
  const [sku, setSku] = useState("")
  const [barcode, setBarcode] = useState("")
  const [initialStock, setInitialStock] = useState("0")
  const [warehouseId, setWarehouseId] = useState(warehouses[0]?.id || "")
  const [storageBinId, setStorageBinId] = useState("")
  const [salesPrice, setSalesPrice] = useState("")
  const [standardCost, setStandardCost] = useState("")

  // ── GELİŞMİŞ ALANLAR ─────────────────────────────────────
  const [category, setCategory] = useState("Genel")
  const [baseUnit, setBaseUnit] = useState("Adet")
  const [valuationMethod, setValuationMethod] = useState("FIFO")
  const [minStockLevel, setMinStockLevel] = useState("10")
  const [maxStockLevel, setMaxStockLevel] = useState("500")

  // Lot / SKT
  const [trackLot, setTrackLot] = useState(false)
  const [trackExpiry, setTrackExpiry] = useState(false)
  const [lotNumber, setLotNumber] = useState("")
  const [expiryDate, setExpiryDate] = useState("")
  const [shelfLifeDays, setShelfLifeDays] = useState("")

  // Birim Çevrimleri
  const [unitConversions, setUnitConversions] = useState<
    Array<{ fromUnit: string; multiplier: number; barcode?: string }>
  >([])

  // Varyantlar (Renk/Beden)
  const [variants, setVariants] = useState<
    Array<{ variantName: string; sku: string; initialStock: number; salesPrice?: number }>
  >([])

  // BOM (Ürün Ağacı)
  const [isBom, setIsBom] = useState(false)
  const [bomComponents, setBomComponents] = useState<
    Array<{ componentItemId: string; quantity: number; unit: string }>
  >([])
  const [laborCost, setLaborCost] = useState("0")
  const [overheadCost, setOverheadCost] = useState("0")

  const [loading, setLoading] = useState(false)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)

  // Otomatik SKU ve Barkod üretici
  const handleAutoGenerateSku = () => {
    if (!name) {
      setSku(`PRD-${Math.floor(1000 + Math.random() * 9000)}`)
      setBarcode(`869${Math.floor(100000000 + Math.random() * 900000000)}`)
      return
    }
    const cleanPrefix = name
      .toUpperCase()
      .replace(/[^A-Z0-9]/g, "")
      .slice(0, 3) || "PRD"
    const randomCode = Math.floor(1000 + Math.random() * 9000)
    setSku(`${cleanPrefix}-${randomCode}`)
    setBarcode(`869${Math.floor(100000000 + Math.random() * 900000000)}`)
  }

  const handleAddUnitConversion = () => {
    setUnitConversions([...unitConversions, { fromUnit: "Koli", multiplier: 20 }])
  }

  const handleAddVariant = () => {
    const nextIdx = variants.length + 1
    setVariants([
      ...variants,
      {
        variantName: `Varyant ${nextIdx}`,
        sku: sku ? `${sku}-V${nextIdx}` : `VAR-${nextIdx}`,
        initialStock: 0
      }
    ])
  }

  const handleAddBomComponent = () => {
    if (existingItems.length > 0) {
      setBomComponents([
        ...bomComponents,
        {
          componentItemId: existingItems[0].id,
          quantity: 1,
          unit: existingItems[0].baseUnit || "Adet"
        }
      ])
    }
  }

  const currentWarehouse = warehouses.find(w => w.id === warehouseId)
  const availableBins = currentWarehouse?.bins || []

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setErrorMsg(null)

    if (!name.trim()) {
      setErrorMsg("Ürün adı zorunludur.")
      return
    }
    if (!sku.trim()) {
      setErrorMsg("SKU / Ürün Kodu zorunludur.")
      return
    }

    setLoading(true)
    try {
      const res = await fetch("/api/inventory", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "create_item",
          payload: {
            name,
            sku,
            barcode: barcode || sku,
            salesPrice: Number(salesPrice || 0),
            standardCost: Number(standardCost || 0),
            initialStock: Number(initialStock || 0),
            warehouseId: warehouseId || warehouses[0]?.id,
            storageBinId: storageBinId || undefined,
            category,
            baseUnit,
            valuationMethod,
            minStockLevel: Number(minStockLevel || 10),
            maxStockLevel: Number(maxStockLevel || 500),
            trackLot,
            trackExpiry,
            shelfLifeDays: shelfLifeDays ? Number(shelfLifeDays) : undefined,
            lotNumber: trackLot ? lotNumber : undefined,
            expiryDate: trackExpiry ? expiryDate : undefined,
            unitConversions,
            variants,
            bomComponents: isBom ? bomComponents : [],
            laborCost: Number(laborCost || 0),
            overheadCost: Number(overheadCost || 0)
          }
        })
      })

      const data = await res.json()
      if (!data.success) {
        throw new Error(data.error || "Ürün kaydedilemedi.")
      }

      onSuccess()
      onClose()
    } catch (err: any) {
      setErrorMsg(err.message || "Kaydetme sırasında bir hata oluştu.")
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={open => !open && onClose()}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto backdrop-blur-xl bg-slate-950/85 border border-white/15 rounded-2xl shadow-2xl text-white">
        <DialogHeader>
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
              <PackagePlus className="h-5 w-5" />
            </div>
            <div>
              <DialogTitle className="text-lg font-semibold text-white">
                Yeni Ürün Tanımla
              </DialogTitle>
              <DialogDescription className="text-xs text-white/60">
                Stok kartınızı hızla oluşturun; isteğe bağlı varyant, reçete ve birim çevrimlerini yapılandırın.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        {errorMsg && (
          <div className="p-3 rounded-xl bg-rose-500/15 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2">
            <AlertCircle className="h-4 w-4 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4 py-1">
          {/* ══════════════════════════════════════════════════════════
              4 TEMEL ALAN (İLK BAKIŞTA GÖRÜNEN SADE FORM)
             ══════════════════════════════════════════════════════════ */}
          <div className="p-4 glass-card rounded-2xl space-y-3.5">
            <div className="flex items-center justify-between pb-1.5 border-b border-white/10">
              <span className="text-xs font-semibold text-emerald-300 uppercase tracking-wide">
                Temel Ürün Bilgileri
              </span>
              <span className="text-[11px] text-white/50">* Zorunlu 4 temel alan</span>
            </div>

            {/* ALAN 1: ÜRÜN ADI */}
            <div className="space-y-1.5">
              <Label className="text-xs font-medium text-white/75">1. Ürün Adı *</Label>
              <Input
                type="text"
                value={name}
                onChange={e => setName(e.target.value)}
                placeholder="Örn: Ekvator Kırmızı Gül veya Kazablanka Lilyum"
                className="text-xs glass-input"
                required
              />
            </div>

            {/* ALAN 2: SKU / BARKOD */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <Label className="text-xs font-medium text-white/75">2. Ürün Kodu (SKU) *</Label>
                  <button
                    type="button"
                    onClick={handleAutoGenerateSku}
                    className="text-[11px] text-emerald-400 hover:text-emerald-300 flex items-center gap-1 font-medium cursor-pointer"
                  >
                    <Sparkles className="h-3 w-3" />
                    Otomatik Üret
                  </button>
                </div>
                <Input
                  type="text"
                  value={sku}
                  onChange={e => setSku(e.target.value.toUpperCase())}
                  placeholder="GUL-EKV-01"
                  className="text-xs font-mono glass-input uppercase"
                  required
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-medium text-white/75">Barkod (EAN / GTIN)</Label>
                <Input
                  type="text"
                  value={barcode}
                  onChange={e => setBarcode(e.target.value)}
                  placeholder="8690001001"
                  className="text-xs font-mono glass-input"
                />
              </div>
            </div>

            {/* ALAN 3: BAŞLANGIÇ STOĞU + DEPO (VE RAF) */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs font-medium text-white/75">3. Başlangıç Stoğu</Label>
                <div className="flex gap-1.5">
                  <Input
                    type="number"
                    min="0"
                    step="any"
                    value={initialStock}
                    onChange={e => setInitialStock(e.target.value)}
                    placeholder="0"
                    className="text-xs glass-input"
                  />
                  <Select value={baseUnit} onValueChange={setBaseUnit}>
                    <SelectTrigger className="w-24 text-xs glass-input shrink-0">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="backdrop-blur-xl bg-slate-950/95 border-white/15 text-white">
                      <SelectItem value="Adet" className="text-xs">Adet</SelectItem>
                      <SelectItem value="Demet" className="text-xs">Demet</SelectItem>
                      <SelectItem value="Dal" className="text-xs">Dal</SelectItem>
                      <SelectItem value="Saksı" className="text-xs">Saksı</SelectItem>
                      <SelectItem value="Koli" className="text-xs">Koli</SelectItem>
                      <SelectItem value="Kg" className="text-xs">Kg</SelectItem>
                      <SelectItem value="Metre" className="text-xs">Metre</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-medium text-white/75">Giriş Yapılacak Depo</Label>
                <Select value={warehouseId} onValueChange={setWarehouseId}>
                  <SelectTrigger className="text-xs glass-input">
                    <SelectValue placeholder="Depo..." />
                  </SelectTrigger>
                  <SelectContent className="backdrop-blur-xl bg-slate-950/95 border-white/15 text-white">
                    {warehouses.map(wh => (
                      <SelectItem key={wh.id} value={wh.id} className="text-xs">
                        {wh.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-medium text-white/75">Raf / Göz (Opsiyonel)</Label>
                <Select value={storageBinId} onValueChange={setStorageBinId}>
                  <SelectTrigger className="text-xs glass-input">
                    <SelectValue placeholder="Raf seçin..." />
                  </SelectTrigger>
                  <SelectContent className="backdrop-blur-xl bg-slate-950/95 border-white/15 text-white">
                    <SelectItem value="none" className="text-xs text-white/50">Genel Depo</SelectItem>
                    {availableBins.map((bin: any) => (
                      <SelectItem key={bin.id} value={bin.id} className="text-xs">
                        {bin.code} {bin.binPosition ? `(${bin.binPosition})` : ""}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* ALAN 4: SATIŞ FİYATI & MALİYET */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs font-medium text-white/75">4. Satış Fiyatı (₺) *</Label>
                <Input
                  type="number"
                  min="0"
                  step="0.01"
                  value={salesPrice}
                  onChange={e => setSalesPrice(e.target.value)}
                  placeholder="0.00 ₺"
                  className="text-xs glass-input font-medium"
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-medium text-white/75">Alış Maliyeti (Standart ₺)</Label>
                <Input
                  type="number"
                  min="0"
                  step="0.01"
                  value={standardCost}
                  onChange={e => setStandardCost(e.target.value)}
                  placeholder="0.00 ₺"
                  className="text-xs glass-input font-medium"
                />
              </div>
            </div>
          </div>

          {/* ══════════════════════════════════════════════════════════
              GELİŞMİŞ ÖZELLİKLER (AKORDEON ALTINDA TEMİZ SEKMELER)
             ══════════════════════════════════════════════════════════ */}
          <Accordion type="single" collapsible className="w-full glass-card rounded-2xl overflow-hidden">
            <AccordionItem value="advanced-options" className="border-none">
              <AccordionTrigger className="px-4 py-3 hover:no-underline text-xs font-medium text-white/80 hover:text-white">
                <span className="flex items-center gap-2">
                  <span className="h-2 w-2 rounded-full bg-emerald-400" />
                  Gelişmiş Özellikler (Varyant, Lot/SKT, Birim Çevrimi, BOM Reçetesi, FIFO)
                </span>
              </AccordionTrigger>
              <AccordionContent className="px-4 pb-4 pt-1">
                <Tabs defaultValue="variants" className="w-full">
                  <TabsList className="grid grid-cols-5 w-full bg-black/30 border border-white/10 p-1 rounded-xl mb-3">
                    <TabsTrigger value="variants" className="text-[11px] py-1">Varyantlar</TabsTrigger>
                    <TabsTrigger value="lots" className="text-[11px] py-1">Lot / SKT</TabsTrigger>
                    <TabsTrigger value="units" className="text-[11px] py-1">Çoklu Birim</TabsTrigger>
                    <TabsTrigger value="costing" className="text-[11px] py-1">Değerleme</TabsTrigger>
                    <TabsTrigger value="bom" className="text-[11px] py-1">BOM Reçete</TabsTrigger>
                  </TabsList>

                  {/* SEKME 1: VARYANTLAR (Renk / Beden) */}
                  <TabsContent value="variants" className="space-y-3 pt-1">
                    <div className="flex items-center justify-between">
                      <p className="text-xs text-white/60">
                        Ürününüzün Renk, Beden veya Boyut varyantları varsa tanımlayın.
                      </p>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={handleAddVariant}
                        className="text-xs h-7 gap-1 glass-input hover:bg-white/10 text-white"
                      >
                        <Plus className="h-3 w-3" />
                        Varyant Ekle
                      </Button>
                    </div>

                    {variants.length === 0 ? (
                      <div className="text-center py-4 border border-dashed border-white/15 rounded-xl text-xs text-white/45">
                        Tanımlı varyant yok. Tekil ürün olarak kaydedilecektir.
                      </div>
                    ) : (
                      <div className="space-y-2">
                        {variants.map((v, idx) => (
                          <div key={idx} className="flex items-center gap-2 bg-white/5 p-2 rounded-xl border border-white/10 text-xs">
                            <Input
                              value={v.variantName}
                              onChange={e => {
                                const next = [...variants]
                                next[idx].variantName = e.target.value
                                setVariants(next)
                              }}
                              placeholder="Varyant Adı (Örn: Pudra Pembe, 70cm)"
                              className="text-xs h-8 glass-input"
                            />
                            <Input
                              value={v.sku}
                              onChange={e => {
                                const next = [...variants]
                                next[idx].sku = e.target.value
                                setVariants(next)
                              }}
                              placeholder="Varyant SKU"
                              className="text-xs h-8 font-mono glass-input w-32"
                            />
                            <Input
                              type="number"
                              value={v.initialStock}
                              onChange={e => {
                                const next = [...variants]
                                next[idx].initialStock = Number(e.target.value)
                                setVariants(next)
                              }}
                              placeholder="Stok"
                              className="text-xs h-8 glass-input w-20"
                            />
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={() => setVariants(variants.filter((_, i) => i !== idx))}
                              className="h-7 w-7 p-0 text-rose-400 hover:text-rose-300"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                        ))}
                      </div>
                    )}
                  </TabsContent>

                  {/* SEKME 2: LOT & SKT TAKİBİ */}
                  <TabsContent value="lots" className="space-y-3 pt-1">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="flex items-center space-x-2">
                        <Checkbox
                          id="trackLot"
                          checked={trackLot}
                          onCheckedChange={checked => setTrackLot(Boolean(checked))}
                        />
                        <Label htmlFor="trackLot" className="text-xs font-medium text-white/80 cursor-pointer">
                          Parti / Lot Numarası Takibi Yap
                        </Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Checkbox
                          id="trackExpiry"
                          checked={trackExpiry}
                          onCheckedChange={checked => setTrackExpiry(Boolean(checked))}
                        />
                        <Label htmlFor="trackExpiry" className="text-xs font-medium text-white/80 cursor-pointer">
                          Son Kullanma / Tazelik (FEFO) Takibi
                        </Label>
                      </div>
                    </div>

                    {(trackLot || trackExpiry) && (
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 p-3 bg-amber-500/10 rounded-xl border border-amber-500/25">
                        {trackLot && (
                          <div className="space-y-1">
                            <Label className="text-[11px] font-medium text-white/75">İlk Lot No</Label>
                            <Input
                              value={lotNumber}
                              onChange={e => setLotNumber(e.target.value)}
                              placeholder="LOT-2026-..."
                              className="text-xs h-8 glass-input font-mono"
                            />
                          </div>
                        )}
                        {trackExpiry && (
                          <div className="space-y-1">
                            <Label className="text-[11px] font-medium text-white/75">İlk SKT Tarihi</Label>
                            <Input
                              type="date"
                              value={expiryDate}
                              onChange={e => setExpiryDate(e.target.value)}
                              className="text-xs h-8 glass-input"
                            />
                          </div>
                        )}
                        <div className="space-y-1">
                          <Label className="text-[11px] font-medium text-white/75">Raf Ömrü (Gün)</Label>
                          <Input
                            type="number"
                            value={shelfLifeDays}
                            onChange={e => setShelfLifeDays(e.target.value)}
                            placeholder="7 gün"
                            className="text-xs h-8 glass-input"
                          />
                        </div>
                      </div>
                    )}
                  </TabsContent>

                  {/* SEKME 3: ÇOKLU BİRİM ÇEVRİMİ */}
                  <TabsContent value="units" className="space-y-3 pt-1">
                    <div className="flex items-center justify-between">
                      <p className="text-xs text-white/60">
                        Örn: 1 Koli = 20 Adet, 1 Demet = 20 Dal gibi katsayı kuralları.
                      </p>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={handleAddUnitConversion}
                        className="text-xs h-7 gap-1 glass-input hover:bg-white/10 text-white"
                      >
                        <Plus className="h-3 w-3" />
                        Birim Kuralı Ekle
                      </Button>
                    </div>

                    {unitConversions.length === 0 ? (
                      <div className="text-center py-4 border border-dashed border-white/15 rounded-xl text-xs text-white/45">
                        Özel birim çevrim kuralı tanımlanmadı. Sadece baz birim ({baseUnit}) geçerli.
                      </div>
                    ) : (
                      <div className="space-y-2">
                        {unitConversions.map((uc, idx) => (
                          <div key={idx} className="flex items-center gap-2 bg-white/5 p-2 rounded-xl border border-white/10 text-xs">
                            <span className="text-white/50">1</span>
                            <Input
                              value={uc.fromUnit}
                              onChange={e => {
                                const next = [...unitConversions]
                                next[idx].fromUnit = e.target.value
                                setUnitConversions(next)
                              }}
                              placeholder="Birim (Örn: Koli)"
                              className="text-xs h-8 glass-input w-28"
                            />
                            <span className="text-white/50">=</span>
                            <Input
                              type="number"
                              step="any"
                              value={uc.multiplier}
                              onChange={e => {
                                const next = [...unitConversions]
                                next[idx].multiplier = Number(e.target.value)
                                setUnitConversions(next)
                              }}
                              className="text-xs h-8 glass-input w-20"
                            />
                            <span className="text-white/80 font-medium">{baseUnit}</span>
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={() => setUnitConversions(unitConversions.filter((_, i) => i !== idx))}
                              className="h-7 w-7 p-0 text-rose-400 hover:text-rose-300 ml-auto"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                        ))}
                      </div>
                    )}
                  </TabsContent>

                  {/* SEKME 4: DEĞERLEME & STOK SINIRLARI */}
                  <TabsContent value="costing" className="space-y-3 pt-1">
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      <div className="space-y-1">
                        <Label className="text-xs font-medium text-white/75">Değerleme Yöntemi</Label>
                        <Select value={valuationMethod} onValueChange={setValuationMethod}>
                          <SelectTrigger className="text-xs glass-input">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent className="backdrop-blur-xl bg-slate-950/95 border-white/15 text-white">
                            <SelectItem value="FIFO" className="text-xs">FIFO (İlk Giren İlk Çıkar)</SelectItem>
                            <SelectItem value="LIFO" className="text-xs">LIFO (Son Giren İlk Çıkar)</SelectItem>
                            <SelectItem value="WEIGHTED_AVERAGE" className="text-xs">Ağırlıklı Ortalama Maliyet</SelectItem>
                            <SelectItem value="STANDARD" className="text-xs">Standart Maliyet</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-1">
                        <Label className="text-xs font-medium text-white/75">Kritik Min. Stok Sınırı</Label>
                        <Input
                          type="number"
                          value={minStockLevel}
                          onChange={e => setMinStockLevel(e.target.value)}
                          className="text-xs glass-input"
                        />
                      </div>

                      <div className="space-y-1">
                        <Label className="text-xs font-medium text-white/75">Maksimum Stok Sınırı</Label>
                        <Input
                          type="number"
                          value={maxStockLevel}
                          onChange={e => setMaxStockLevel(e.target.value)}
                          className="text-xs glass-input"
                        />
                      </div>
                    </div>
                  </TabsContent>

                  {/* SEKME 5: BOM (Ürün Ağacı Reçetesi) */}
                  <TabsContent value="bom" className="space-y-3 pt-1">
                    <div className="flex items-center space-x-2 pb-1">
                      <Checkbox
                        id="isBom"
                        checked={isBom}
                        onCheckedChange={checked => setIsBom(Boolean(checked))}
                      />
                      <Label htmlFor="isBom" className="text-xs font-medium text-white/80 cursor-pointer">
                        Bu ürün reçeteli bir mamuldür (BOM / İmalat Reçetesi Tanımla)
                      </Label>
                    </div>

                    {isBom && (
                      <div className="space-y-3 p-3 bg-sky-500/10 rounded-xl border border-sky-500/25">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-medium text-sky-300">Reçete Bileşenleri</span>
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={handleAddBomComponent}
                            className="text-xs h-7 gap-1 glass-input hover:bg-white/10 text-white"
                          >
                            <Plus className="h-3 w-3" />
                            Bileşen Ekle
                          </Button>
                        </div>

                        {bomComponents.map((comp, idx) => (
                          <div key={idx} className="flex items-center gap-2 bg-black/30 p-2 rounded-xl border border-white/10 text-xs">
                            <Select
                              value={comp.componentItemId}
                              onValueChange={val => {
                                const next = [...bomComponents]
                                next[idx].componentItemId = val
                                const found = existingItems.find(i => i.id === val)
                                if (found) next[idx].unit = found.baseUnit || "Adet"
                                setBomComponents(next)
                              }}
                            >
                              <SelectTrigger className="text-xs h-8 flex-1 glass-input">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent className="backdrop-blur-xl bg-slate-950/95 border-white/15 text-white">
                                {existingItems.map(item => (
                                  <SelectItem key={item.id} value={item.id} className="text-xs">
                                    {item.name} ({item.sku})
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            <Input
                              type="number"
                              step="any"
                              value={comp.quantity}
                              onChange={e => {
                                const next = [...bomComponents]
                                next[idx].quantity = Number(e.target.value)
                                setBomComponents(next)
                              }}
                              className="text-xs h-8 w-20 glass-input"
                            />
                            <span className="text-white/75 font-medium">{comp.unit}</span>
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={() => setBomComponents(bomComponents.filter((_, i) => i !== idx))}
                              className="h-7 w-7 p-0 text-rose-400 hover:text-rose-300"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                        ))}

                        <div className="grid grid-cols-2 gap-3 pt-2">
                          <div className="space-y-1">
                            <Label className="text-[11px] font-medium text-white/75">İşçilik Gideri (₺)</Label>
                            <Input
                              type="number"
                              value={laborCost}
                              onChange={e => setLaborCost(e.target.value)}
                              className="text-xs h-8 glass-input"
                            />
                          </div>
                          <div className="space-y-1">
                            <Label className="text-[11px] font-medium text-white/75">Genel Üretim Gideri (₺)</Label>
                            <Input
                              type="number"
                              value={overheadCost}
                              onChange={e => setOverheadCost(e.target.value)}
                              className="text-xs h-8 glass-input"
                            />
                          </div>
                        </div>
                      </div>
                    )}
                  </TabsContent>
                </Tabs>
              </AccordionContent>
            </AccordionItem>
          </Accordion>

          <DialogFooter className="pt-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={onClose}
              disabled={loading}
              className="glass-input hover:bg-white/10 text-white border-white/15 cursor-pointer"
            >
              İptal
            </Button>
            <Button
              type="submit"
              size="sm"
              disabled={loading}
              className="bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-semibold cursor-pointer"
            >
              {loading && <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />}
              Ürünü Kaydet
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

