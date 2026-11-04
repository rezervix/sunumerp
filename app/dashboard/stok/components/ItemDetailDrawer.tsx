"use client"

import React, { useState, useEffect } from "react"
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription
} from "@/components/ui/sheet"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  Warehouse,
  Layers,
  Clock,
  Scale,
  ArrowDownLeft,
  ArrowUpRight,
  History,
  Loader2,
  Calendar
} from "lucide-react"

interface ItemDetailDrawerProps {
  itemId: string | null
  isOpen: boolean
  onClose: () => void
  onQuickMove: (mode: "IN" | "OUT", itemId: string) => void
}

export function ItemDetailDrawer({
  itemId,
  isOpen,
  onClose,
  onQuickMove
}: ItemDetailDrawerProps) {
  const [data, setData] = useState<any>(null)
  const [loading, setLoading] = useState(false)
  const [convertQty, setConvertQty] = useState("10")
  const [convertedResult, setConvertedResult] = useState<string | null>(null)

  useEffect(() => {
    if (itemId && isOpen) {
      setLoading(true)
      fetch(`/api/inventory?section=item&itemId=${itemId}`)
        .then(res => res.json())
        .then(resData => {
          if (resData.success) {
            setData(resData)
          }
        })
        .catch(err => console.error("Error fetching item detail:", err))
        .finally(() => setLoading(false))
    }
  }, [itemId, isOpen])

  const item = data?.item
  const valuation = data?.valuation

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat("tr-TR", {
      style: "currency",
      currency: "TRY",
      maximumFractionDigits: 2
    }).format(val || 0)
  }

  // Canlı birim çevrim testi
  const handleQuickConvert = (unitRule: any) => {
    const qty = Number(convertQty) || 1
    const targetBase = qty * Number(unitRule.multiplier || 1)
    setConvertedResult(`${qty} ${unitRule.fromUnit} = ${targetBase} ${item.baseUnit}`)
  }

  return (
    <Sheet open={isOpen} onOpenChange={open => !open && onClose()}>
      <SheetContent side="right" className="w-full sm:max-w-xl p-0 overflow-y-auto bg-white flex flex-col">
        {loading ? (
          <div className="flex-1 flex flex-col items-center justify-center p-8 text-slate-500 gap-2">
            <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
            <p className="text-xs">Veritabanından ürün ve maliyet katmanları çekiliyor...</p>
          </div>
        ) : !item ? (
          <div className="p-6 text-center text-xs text-slate-500">Ürün bilgisi yüklenemedi.</div>
        ) : (
          <>
            {/* 1. ÇEKMECE ÜST BİLGİ ALANI */}
            <div className="p-6 border-b border-slate-200 bg-slate-50/50 space-y-3">
              <SheetHeader className="text-left space-y-1">
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="text-[11px] font-mono bg-white">
                    {item.sku}
                  </Badge>
                  <Badge variant="secondary" className="text-[11px]">
                    {item.category}
                  </Badge>
                  {item.trackExpiry && (
                    <Badge className="bg-amber-100 text-amber-700 hover:bg-amber-100 text-[10px] border-amber-200">
                      SKT Hassas
                    </Badge>
                  )}
                </div>
                <SheetTitle className="text-lg font-bold text-slate-900 leading-snug">
                  {item.name}
                </SheetTitle>
                <SheetDescription className="text-xs text-slate-500">
                  Barkod: <span className="font-mono text-slate-700">{item.barcode || item.sku}</span> | Değerleme: <span className="font-medium text-slate-700">{item.valuationMethod}</span>
                </SheetDescription>
              </SheetHeader>

              {/* Hızlı Özet İstatistikleri */}
              <div className="grid grid-cols-3 gap-2 pt-2">
                <div className="p-2.5 rounded-lg bg-white border border-slate-200">
                  <span className="text-[10px] font-medium text-slate-400 uppercase tracking-wider block">
                    Mevcut Stok
                  </span>
                  <span className="text-base font-bold text-slate-900">
                    {(item.stockBalances || []).reduce((s: number, b: any) => s + Number(b.onHandQty || 0), 0)} {item.baseUnit}
                  </span>
                </div>

                <div className="p-2.5 rounded-lg bg-white border border-slate-200">
                  <span className="text-[10px] font-medium text-slate-400 uppercase tracking-wider block">
                    Birim Maliyet (FIFO)
                  </span>
                  <span className="text-base font-bold text-emerald-600">
                    {formatCurrency(item.fifoUnitCost || item.standardCost || 0)}
                  </span>
                </div>

                <div className="p-2.5 rounded-lg bg-white border border-slate-200">
                  <span className="text-[10px] font-medium text-slate-400 uppercase tracking-wider block">
                    Satış Fiyatı
                  </span>
                  <span className="text-base font-bold text-blue-600">
                    {formatCurrency(item.salesPrice || 0)}
                  </span>
                </div>
              </div>

              {/* Çekmece İçi Hızlı Aksiyon Butonları */}
              <div className="flex gap-2 pt-1">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => onQuickMove("IN", item.id)}
                  className="flex-1 text-xs gap-1.5 text-emerald-700 border-emerald-200 hover:bg-emerald-50"
                >
                  <ArrowDownLeft className="h-3.5 w-3.5" />
                  Stok Girişi Yap
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => onQuickMove("OUT", item.id)}
                  className="flex-1 text-xs gap-1.5 text-blue-700 border-blue-200 hover:bg-blue-50"
                >
                  <ArrowUpRight className="h-3.5 w-3.5" />
                  Stok Çıkışı Yap
                </Button>
              </div>
            </div>

            {/* 2. ÇEKMECE SEKMELERİ */}
            <div className="flex-1 p-6">
              <Tabs defaultValue="locations" className="w-full">
                <TabsList className="grid grid-cols-4 w-full bg-slate-100 p-0.5 mb-4">
                  <TabsTrigger value="locations" className="text-xs py-1.5 gap-1">
                    <Warehouse className="h-3.5 w-3.5" />
                    Depo / Raf
                  </TabsTrigger>
                  <TabsTrigger value="costlayers" className="text-xs py-1.5 gap-1">
                    <Layers className="h-3.5 w-3.5" />
                    FIFO Katman
                  </TabsTrigger>
                  <TabsTrigger value="units" className="text-xs py-1.5 gap-1">
                    <Scale className="h-3.5 w-3.5" />
                    Birimler
                  </TabsTrigger>
                  <TabsTrigger value="lots" className="text-xs py-1.5 gap-1">
                    <Clock className="h-3.5 w-3.5" />
                    Lot / SKT
                  </TabsTrigger>
                </TabsList>

                {/* SEKME 1: DEPO VE RAF DAĞILIMI */}
                <TabsContent value="locations" className="space-y-3">
                  <h4 className="text-xs font-semibold text-slate-800 uppercase tracking-wide">
                    Depo ve Raf Bazında Anlık Stok
                  </h4>

                  {(!item.stockBalances || item.stockBalances.length === 0) ? (
                    <div className="text-center py-6 text-xs text-slate-400 border border-dashed rounded-lg">
                      Bu ürüne ait henüz kayıtlı stok hareketi bulunmuyor.
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {item.stockBalances.map((bal: any) => (
                        <div
                          key={bal.id}
                          className="p-3 rounded-lg border border-slate-200 bg-white hover:border-slate-300 transition-colors flex items-center justify-between"
                        >
                          <div className="space-y-0.5">
                            <span className="text-xs font-medium text-slate-900 block">
                              {bal.warehouse?.name || "Depo"}
                            </span>
                            <div className="flex items-center gap-1.5 text-[11px] text-slate-500">
                              <span>Raf / Lokasyon:</span>
                              <Badge variant="secondary" className="font-mono text-[10px] px-1.5 py-0">
                                {bal.storageBin?.code || bal.binCode || "Genel Depo"}
                              </Badge>
                              {bal.storageBin?.binPosition && (
                                <span className="text-slate-400">({bal.storageBin.binPosition})</span>
                              )}
                            </div>
                          </div>
                          <div className="text-right">
                            <span className="text-sm font-bold text-slate-900 block">
                              {bal.onHandQty} {item.baseUnit}
                            </span>
                            <span className="text-[10px] text-emerald-600 block">
                              {bal.availableQty} kullanılabilir
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </TabsContent>

                {/* SEKME 2: FIFO / LIFO MALİYET KATMANLARI */}
                <TabsContent value="costlayers" className="space-y-3">
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs font-semibold text-slate-800 uppercase tracking-wide">
                      Aktif Maliyet Katmanları (CostLayers)
                    </h4>
                    <span className="text-[11px] text-slate-500">
                      Yöntem: <strong>{item.valuationMethod}</strong>
                    </span>
                  </div>

                  {(!item.costLayers || item.costLayers.length === 0) ? (
                    <div className="text-center py-6 text-xs text-slate-400 border border-dashed rounded-lg">
                      Aktif maliyet katmanı bulunmuyor.
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {item.costLayers.map((layer: any, idx: number) => (
                        <div
                          key={layer.id}
                          className="p-3 rounded-lg border border-slate-200 bg-white space-y-1.5"
                        >
                          <div className="flex items-center justify-between text-xs">
                            <div className="flex items-center gap-2">
                              <span className="h-5 w-5 rounded-full bg-slate-100 text-slate-600 flex items-center justify-center text-[10px] font-bold">
                                {idx + 1}
                              </span>
                              <span className="font-mono font-medium text-slate-800">
                                {layer.receiptDocNo}
                              </span>
                            </div>
                            <span className="font-semibold text-emerald-600">
                              {formatCurrency(layer.unitCost)} / {item.baseUnit}
                            </span>
                          </div>
                          <div className="flex items-center justify-between text-[11px] text-slate-500 pt-1 border-t border-slate-100">
                            <span>Giriş: {new Date(layer.layerDate).toLocaleDateString("tr-TR")}</span>
                            <span>Kalan: <strong>{layer.remainingQty}</strong> / {layer.initialQty} {item.baseUnit}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Canlı Değerleme Özeti */}
                  {valuation && (
                    <div className="mt-4 p-3 rounded-lg bg-slate-50 border border-slate-200 text-xs space-y-1.5">
                      <span className="font-semibold text-slate-800 block">Değerleme Karşılaştırması:</span>
                      <div className="grid grid-cols-3 gap-2 text-[11px]">
                        <div>FIFO Maliyeti: <strong className="text-emerald-700">{formatCurrency(valuation.fifoUnitCost)}</strong></div>
                        <div>LIFO Maliyeti: <strong className="text-blue-700">{formatCurrency(valuation.lifoUnitCost)}</strong></div>
                        <div>Ağırlıklı Ort: <strong className="text-slate-800">{formatCurrency(valuation.weightedAvgUnitCost)}</strong></div>
                      </div>
                    </div>
                  )}
                </TabsContent>

                {/* SEKME 3: ÇOKLU BİRİM ÇEVRİMLERİ */}
                <TabsContent value="units" className="space-y-3">
                  <h4 className="text-xs font-semibold text-slate-800 uppercase tracking-wide">
                    Tanımlı Birim Çevrim Katsayıları
                  </h4>

                  {(!item.unitConversions || item.unitConversions.length === 0) ? (
                    <div className="text-center py-6 text-xs text-slate-400 border border-dashed rounded-lg">
                      Bu ürüne tanımlanmış ek birim çevrimi yok. Baz birim: {item.baseUnit}
                    </div>
                  ) : (
                    <div className="space-y-3">
                      <div className="space-y-1.5">
                        {item.unitConversions.map((uc: any) => (
                          <div
                            key={uc.id}
                            className="p-2.5 rounded-lg border border-slate-200 bg-white flex items-center justify-between text-xs"
                          >
                            <span className="font-medium text-slate-800">
                              1 {uc.fromUnit} = {uc.multiplier} {item.baseUnit}
                            </span>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => handleQuickConvert(uc)}
                              className="text-[11px] h-7 text-blue-600 hover:text-blue-700"
                            >
                              Hesapla
                            </Button>
                          </div>
                        ))}
                      </div>

                      {/* Hızlı Çevrim Aracı */}
                      <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 space-y-2">
                        <span className="text-xs font-semibold text-slate-700 block">Canlı Birim Dönüştürücü:</span>
                        <div className="flex gap-2">
                          <Input
                            type="number"
                            value={convertQty}
                            onChange={e => setConvertQty(e.target.value)}
                            placeholder="Miktar"
                            className="text-xs h-8 bg-white w-24"
                          />
                          <Button
                            size="sm"
                            onClick={() => handleQuickConvert(item.unitConversions[0])}
                            className="text-xs h-8 bg-slate-800 text-white hover:bg-slate-900"
                          >
                            Çevir
                          </Button>
                        </div>
                        {convertedResult && (
                          <div className="text-xs font-medium text-emerald-700 bg-emerald-50 p-2 rounded border border-emerald-200">
                            {convertedResult}
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </TabsContent>

                {/* SEKME 4: LOT VE SKT GEÇMİŞİ */}
                <TabsContent value="lots" className="space-y-3">
                  <h4 className="text-xs font-semibold text-slate-800 uppercase tracking-wide">
                    Parti, Lot ve Son Kullanma Tarihleri
                  </h4>

                  {(!item.lotSerials || item.lotSerials.length === 0) ? (
                    <div className="text-center py-6 text-xs text-slate-400 border border-dashed rounded-lg">
                      Bu üründe henüz kayıtlı Lot / Seri bulunmuyor.
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {item.lotSerials.map((lot: any) => {
                        const daysLeft = lot.expiryDate
                          ? Math.ceil((new Date(lot.expiryDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24))
                          : null

                        return (
                          <div
                            key={lot.id}
                            className="p-3 rounded-lg border border-slate-200 bg-white space-y-1.5"
                          >
                            <div className="flex items-center justify-between text-xs">
                              <span className="font-mono font-bold text-slate-900">
                                {lot.lotNumber}
                              </span>
                              {daysLeft !== null && (
                                <Badge className={`text-[10px] ${
                                  daysLeft <= 7
                                    ? "bg-rose-100 text-rose-700 border-rose-200"
                                    : daysLeft <= 15
                                    ? "bg-amber-100 text-amber-700 border-amber-200"
                                    : "bg-emerald-100 text-emerald-700 border-emerald-200"
                                }`}>
                                  {daysLeft <= 0 ? "SKT Doldu!" : `${daysLeft} gün kaldı`}
                                </Badge>
                              )}
                            </div>
                            <div className="flex items-center justify-between text-[11px] text-slate-500 pt-1 border-t border-slate-100">
                              <span className="flex items-center gap-1">
                                <Calendar className="h-3 w-3" />
                                {lot.expiryDate ? new Date(lot.expiryDate).toLocaleDateString("tr-TR") : "Süresiz"}
                              </span>
                              <span>Kalan: <strong>{lot.remainingQty}</strong> {item.baseUnit}</span>
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  )}

                  {/* Son Hareketler */}
                  {item.stockMovements && item.stockMovements.length > 0 && (
                    <div className="pt-4 space-y-2">
                      <div className="flex items-center gap-1 text-xs font-semibold text-slate-700">
                        <History className="h-3.5 w-3.5" />
                        Son Stok Hareketleri
                      </div>
                      <div className="space-y-1 max-h-48 overflow-y-auto pr-1">
                        {item.stockMovements.map((move: any) => (
                          <div
                            key={move.id}
                            className="text-[11px] p-2 rounded bg-slate-50 border flex items-center justify-between"
                          >
                            <div>
                              <span className={move.movementType === "RECEIPT" ? "text-emerald-600 font-semibold" : "text-blue-600 font-semibold"}>
                                {move.movementType === "RECEIPT" ? "Giriş (+)" : "Çıkış (-)"}
                              </span>
                              <span className="text-slate-500 ml-1.5">
                                {new Date(move.createdAt).toLocaleDateString("tr-TR")}
                              </span>
                            </div>
                            <span className="font-mono font-medium">
                              {move.quantity} {move.unit}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </TabsContent>
              </Tabs>
            </div>
          </>
        )}
      </SheetContent>
    </Sheet>
  )
}

