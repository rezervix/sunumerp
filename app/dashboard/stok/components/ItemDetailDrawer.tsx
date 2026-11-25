"use client"

import React, { useState, useEffect } from "react"
import { motion } from "framer-motion"
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription
} from "@/components/ui/sheet"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  IconWarehouse,
  IconLayers,
  IconClock,
  IconArrowDownLeft,
  IconArrowUpRight,
  IconLoader,
  IconQrCode,
  IconAlertTriangle,
  IconFactory,
  IconHistory
} from "@/components/ui/app-icons"
import { useAuth } from "@/lib/auth/context"
import { isAnyProductionFeatureEnabled } from "@/lib/config/production-feature-flags"
import { ItemProductionProfileTab } from "./ItemProductionProfileTab"
import { PrintableLabelModal } from "../../wms/components/PrintableLabelModal"
import { mockDatabase } from "@/lib/data/mockDatabase"
import { safeText, safeCurrency, safeNumber, safeDate } from "@/lib/utils/safe-display"

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
  const { currentBranch } = useAuth()
  const [data, setData] = useState<any>(null)
  const [loading, setLoading] = useState(false)
  const [convertQty, setConvertQty] = useState("10")
  const [convertedResult, setConvertedResult] = useState<string | null>(null)
  const [showProductionTab, setShowProductionTab] = useState(false)
  const [labelItemOpen, setLabelItemOpen] = useState(false)

  useEffect(() => {
    if (!isOpen) return
    fetch("/api/system-config")
      .then(res => (res.ok ? res.json() : null))
      .then(cfg => {
        if (cfg) {
          setShowProductionTab(
            isAnyProductionFeatureEnabled(cfg.featureFlags, currentBranch?.id)
          )
        }
      })
      .catch(() => setShowProductionTab(false))
  }, [isOpen, currentBranch?.id])

  useEffect(() => {
    if (itemId && isOpen) {
      setLoading(true)
      fetch(`/api/inventory?section=item&itemId=${itemId}`)
        .then(res => res.json())
        .then(resData => {
          if (resData.success && resData.item) {
            setData(resData)
          } else {
            setData(mockDatabase.getInventoryItemById(itemId))
          }
        })
        .catch(err => {
          console.warn("Error fetching item detail, using demo fallback:", err)
          setData(mockDatabase.getInventoryItemById(itemId))
        })
        .finally(() => setLoading(false))
    }
  }, [itemId, isOpen])

  const item = data?.item
  const valuation = data?.valuation
  const activeReservations: any[] = Array.isArray(data?.reservations) ? data.reservations : []

  // Canlı birim çevrim testi
  const handleQuickConvert = (unitRule: any) => {
    const qty = Number(convertQty) || 1
    const targetBase = qty * Number(unitRule.multiplier || 1)
    setConvertedResult(`${qty} ${unitRule.fromUnit} = ${targetBase} ${item.baseUnit}`)
  }

  const totalOnHand = (item?.stockBalances || []).reduce(
    (s: number, b: any) => s + Number(b.onHandQty || 0),
    0
  )

  return (
    <Sheet open={isOpen} onOpenChange={open => !open && onClose()}>
      <SheetContent
        side="right"
        className="w-full sm:max-w-xl p-0 overflow-y-auto bg-white border-l border-[--line] shadow-2xl flex flex-col text-[--text]"
      >
        {loading ? (
          <div className="flex-1 flex flex-col items-center justify-center p-8 text-[--text-muted] gap-3">
            <IconLoader size={28} className="text-[--brand]" />
            <p className="text-xs">Veritabanından ürün ve maliyet katmanları çekiliyor...</p>
          </div>
        ) : !item ? (
          <div className="p-6 text-center text-xs text-[--text-muted]">Ürün bilgisi yüklenemedi.</div>
        ) : (
          <motion.div
            initial={{ x: 60, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            transition={{ type: "spring", damping: 25, stiffness: 260 }}
            className="flex-1 flex flex-col"
          >
            {/* 1. ÇEKMECE ÜST BİLGİ ALANI */}
            <div className="p-6 border-b border-[--line] bg-[--page]/50 space-y-4">
              <SheetHeader className="text-left space-y-1.5">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge variant="outline" size="sm" className="font-mono">
                    {safeText(item.sku, "SKU Yok")}
                  </Badge>
                  <Badge variant="neutral" size="sm">
                    {safeText(item.category, "Genel")}
                  </Badge>
                  {item.trackExpiry && (
                    <Badge variant="warn" size="sm">
                      SKT Hassas
                    </Badge>
                  )}
                </div>

                <SheetTitle className="text-lg font-semibold text-[--text] leading-snug">
                  {safeText(item.name)}
                </SheetTitle>

                <SheetDescription className="text-xs text-[--text-muted]">
                  Barkod: <span className="font-mono text-[--text-2]">{safeText(item.barcode, item.sku)}</span> • Değerleme: <span className="font-medium text-[--brand]">{safeText(item.valuationMethod, "FIFO")}</span>
                </SheetDescription>
              </SheetHeader>

              {/* Hızlı Özet İstatistikleri */}
              <div className="grid grid-cols-3 gap-3 pt-1">
                <div className="p-3.5 rounded-xl bg-white border border-[--line]">
                  <span className="text-[10px] font-medium text-[--text-muted] uppercase tracking-wider block">
                    Mevcut Stok
                  </span>
                  <span className="text-base font-semibold text-[--text] mt-1 block tabular-nums">
                    {totalOnHand} {safeText(item.baseUnit, "Adet")}
                  </span>
                </div>

                <div className="p-3.5 rounded-xl bg-white border border-[--line]">
                  <span className="text-[10px] font-medium text-[--text-muted] uppercase tracking-wider block">
                    Birim Maliyet (FIFO)
                  </span>
                  <span className="text-base font-semibold text-[--brand] mt-1 block tabular-nums">
                    {safeCurrency(item.fifoUnitCost || item.standardCost || 0)}
                  </span>
                </div>

                <div className="p-3.5 rounded-xl bg-white border border-[--line]">
                  <span className="text-[10px] font-medium text-[--text-muted] uppercase tracking-wider block">
                    Satış Fiyatı
                  </span>
                  <span className="text-base font-semibold text-[--text] mt-1 block tabular-nums">
                    {safeCurrency(item.salesPrice || 0)}
                  </span>
                </div>
              </div>

              {/* Çekmece İçi Hızlı Aksiyon Butonları */}
              <div className="flex flex-wrap gap-2 pt-1">
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={() => onQuickMove("IN", item.id)}
                  className="flex-1 text-xs gap-1.5 text-[--brand] hover:bg-[--brand-soft] rounded-xl h-9"
                >
                  <IconArrowDownLeft size={15} />
                  Stok Girişi Yap
                </Button>
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={() => onQuickMove("OUT", item.id)}
                  className="flex-1 text-xs gap-1.5 text-[--text-2] hover:bg-[--muted-bg] rounded-xl h-9"
                >
                  <IconArrowUpRight size={15} />
                  Stok Çıkışı Yap
                </Button>
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={() => setLabelItemOpen(true)}
                  className="text-xs gap-1.5 rounded-xl h-9 px-3.5"
                  title="SKU QR / Barkod Etiketi Yazdır"
                >
                  <IconQrCode size={15} />
                  Etiket
                </Button>
              </div>

              {/* Çıkış Politikası & RFID Bilgisi */}
              <div className="flex flex-wrap items-center gap-2 text-[11px]">
                <Badge variant="brand" size="sm">
                  Politika: {safeText(item.pickPolicy, item.trackExpiry ? "FEFO" : "FIFO")}
                </Badge>
                {item.trackSerial && (
                  <Badge variant="neutral" size="sm">
                    Seri Takibi Aktif
                  </Badge>
                )}
                {item.rfidEpcPrefix && (
                  <Badge variant="neutral" size="sm">
                    RFID: {safeText(item.rfidEpcPrefix)}
                  </Badge>
                )}
              </div>
            </div>

            {/* 2. ÇEKMECE SEKMELERİ */}
            <div className="flex-1 p-6">
              <Tabs defaultValue="locations" className="w-full">
                <TabsList
                  className={`grid ${ showProductionTab ? "grid-cols-5" : "grid-cols-4" } w-full bg-[--muted-bg] border border-[--line] p-1 rounded-xl mb-4`}
                >
                  <TabsTrigger value="locations" className="text-xs py-1.5 gap-1 rounded-lg">
                    <IconWarehouse size={13} />
                    Depo / Raf
                  </TabsTrigger>
                  <TabsTrigger value="costlayers" className="text-xs py-1.5 gap-1 rounded-lg">
                    <IconLayers size={13} />
                    Katmanlar
                  </TabsTrigger>
                  <TabsTrigger value="units" className="text-xs py-1.5 gap-1 rounded-lg">
                    <IconLayers size={13} />
                    Birimler
                  </TabsTrigger>
                  <TabsTrigger value="lots" className="text-xs py-1.5 gap-1 rounded-lg">
                    <IconClock size={13} />
                    Lot / SKT
                  </TabsTrigger>
                  {showProductionTab && (
                    <TabsTrigger
                      value="production"
                      className="text-xs py-1.5 gap-1 text-[--brand] rounded-lg"
                    >
                      <IconFactory size={13} />
                      Üretim
                    </TabsTrigger>
                  )}
                </TabsList>

                {/* SEKME 1: DEPO VE RAF DAĞILIMI */}
                <TabsContent value="locations" className="space-y-3">
                  <h4 className="text-xs font-semibold text-[--text-muted] uppercase tracking-wide">
                    Depo ve Raf Bazında Anlık Stok
                  </h4>

                  {(!item.stockBalances || item.stockBalances.length === 0) ? (
                    <div className="text-center py-6 text-xs text-[--text-muted] border border-dashed border-[--line] rounded-xl">
                      Bu ürüne ait henüz kayıtlı stok hareketi bulunmuyor.
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {item.stockBalances.map((bal: any) => (
                        <div
                          key={bal.id}
                          className="p-3.5 rounded-xl bg-white border border-[--line] hover:border-[--brand-line] transition-colors flex items-center justify-between"
                        >
                          <div className="space-y-1">
                            <span className="text-xs font-semibold text-[--text] block">
                              {safeText(bal.warehouse?.name, "Depo")}
                            </span>
                            <div className="flex items-center gap-1.5 text-[11px] text-[--text-muted]">
                              <span>Raf / Lokasyon:</span>
                              <Badge variant="neutral" size="sm">
                                {safeText(bal.storageBin?.code, bal.binCode || "Genel Depo")}
                              </Badge>
                              {bal.storageBin?.binPosition && (
                                <span className="text-[--text-muted]">({bal.storageBin.binPosition})</span>
                              )}
                            </div>
                          </div>
                          <div className="text-right">
                            <span className="text-sm font-semibold text-[--text] block tabular-nums">
                              {safeNumber(bal.onHandQty)} {safeText(item.baseUnit, "Adet")}
                            </span>
                            <div className="flex items-center justify-end gap-2 text-[10px]">
                              {Number(bal.reservedQty || 0) > 0 && (
                                <span className="text-[--warn] font-mono">
                                  Rezerve: {bal.reservedQty}
                                </span>
                              )}
                              <span className="text-[--brand] font-medium">
                                Kullanılabilir: {bal.availableQty}
                              </span>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Açık Stok Rezervasyonları */}
                  {activeReservations.length > 0 && (
                    <div className="pt-3 space-y-2 border-t border-[--line]">
                      <div className="flex items-center gap-1.5 text-xs font-semibold text-[--warn]">
                        <IconAlertTriangle size={14} />
                        Aktif WMS Rezervasyonları ({activeReservations.length})
                      </div>
                      <div className="space-y-1.5">
                        {activeReservations.map((r: any) => (
                          <div
                            key={r.id}
                            className="p-2.5 rounded-xl bg-[--warn-soft] border border-[--warn]/20 flex items-center justify-between text-[11px]"
                          >
                            <div>
                              <span className="font-mono font-semibold text-[--text]">{safeText(r.reservationNo)}</span>
                              <span className="text-[--text-muted] ml-2">{safeText(r.sourceDocNo, r.sourceDocType)}</span>
                            </div>
                            <span className="font-mono font-semibold text-[--warn] tabular-nums">
                              {r.reservedQty} {safeText(item.baseUnit, "Adet")}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </TabsContent>

                {/* SEKME 2: FIFO / LIFO MALİYET KATMANLARI */}
                <TabsContent value="costlayers" className="space-y-3">
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs font-semibold text-[--text-muted] uppercase tracking-wide">
                      Aktif Maliyet Katmanları (CostLayers)
                    </h4>
                    <span className="text-[11px] text-[--text-muted]">
                      Yöntem: <strong className="text-[--brand]">{safeText(item.valuationMethod, "FIFO")}</strong>
                    </span>
                  </div>

                  {(!item.costLayers || item.costLayers.length === 0) ? (
                    <div className="text-center py-6 text-xs text-[--text-muted] border border-dashed border-[--line] rounded-xl">
                      Aktif maliyet katmanı bulunmuyor.
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {item.costLayers.map((layer: any, idx: number) => (
                        <div
                          key={layer.id}
                          className="p-3.5 rounded-xl bg-white border border-[--line] space-y-1.5"
                        >
                          <div className="flex items-center justify-between text-xs">
                            <div className="flex items-center gap-2">
                              <span className="h-5 w-5 rounded-full bg-[--muted-bg] text-[--text-2] flex items-center justify-center text-[10px] font-bold">
                                {idx + 1}
                              </span>
                              <span className="font-mono font-medium text-[--text]">
                                {safeText(layer.receiptDocNo, "—")}
                              </span>
                            </div>
                            <span className="font-semibold text-[--brand] tabular-nums">
                              {safeCurrency(layer.unitCost)} / {safeText(item.baseUnit, "Adet")}
                            </span>
                          </div>
                          <div className="flex items-center justify-between text-[11px] text-[--text-muted] pt-1.5 border-t border-[--line-soft]">
                            <span>Giriş: {safeDate(layer.layerDate)}</span>
                            <span>
                              Kalan: <strong className="text-[--text]">{layer.remainingQty}</strong> / {layer.initialQty} {safeText(item.baseUnit, "Adet")}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Canlı Değerleme Özeti */}
                  {valuation && (
                    <div className="mt-4 p-3.5 rounded-xl bg-[--muted-bg]/50 border border-[--line] text-xs space-y-1.5">
                      <span className="font-semibold text-[--text] block">Değerleme Karşılaştırması:</span>
                      <div className="grid grid-cols-3 gap-2 text-[11px] text-[--text-muted]">
                        <div>FIFO: <strong className="text-[--brand] tabular-nums">{safeCurrency(valuation.fifoUnitCost)}</strong></div>
                        <div>LIFO: <strong className="text-[--text] tabular-nums">{safeCurrency(valuation.lifoUnitCost)}</strong></div>
                        <div>Ağırlıklı Ort: <strong className="text-[--text] tabular-nums">{safeCurrency(valuation.weightedAvgUnitCost)}</strong></div>
                      </div>
                    </div>
                  )}
                </TabsContent>

                {/* SEKME 3: ÇOKLU BİRİM ÇEVRİMLERİ */}
                <TabsContent value="units" className="space-y-3">
                  <h4 className="text-xs font-semibold text-[--text-muted] uppercase tracking-wide">
                    Tanımlı Birim Çevrim Katsayıları
                  </h4>

                  {(!item.unitConversions || item.unitConversions.length === 0) ? (
                    <div className="text-center py-6 text-xs text-[--text-muted] border border-dashed border-[--line] rounded-xl">
                      Bu ürüne tanımlanmış ek birim çevrimi yok. Baz birim: {safeText(item.baseUnit, "Adet")}
                    </div>
                  ) : (
                    <div className="space-y-3">
                      <div className="space-y-1.5">
                        {item.unitConversions.map((uc: any) => (
                          <div
                            key={uc.id}
                            className="p-3 rounded-xl bg-white border border-[--line] flex items-center justify-between text-xs"
                          >
                            <span className="font-medium text-[--text]">
                              1 {safeText(uc.fromUnit)} = {uc.multiplier} {safeText(item.baseUnit, "Adet")}
                            </span>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => handleQuickConvert(uc)}
                              className="text-[11px] h-7 text-[--brand] hover:bg-[--brand-soft] rounded-lg"
                            >
                              Hesapla
                            </Button>
                          </div>
                        ))}
                      </div>

                      {/* Hızlı Çevrim Aracı */}
                      <div className="p-3.5 bg-[--muted-bg]/50 border border-[--line] rounded-xl space-y-2">
                        <span className="text-xs font-semibold text-[--text] block">Canlı Birim Dönüştürücü:</span>
                        <div className="flex gap-2">
                          <Input
                            type="number"
                            value={convertQty}
                            onChange={e => setConvertQty(e.target.value)}
                            placeholder="Miktar"
                            className="text-xs h-8 bg-white border-[--line] text-[--text] w-24 rounded-lg"
                          />
                          <Button
                            size="sm"
                            variant="primary"
                            onClick={() => handleQuickConvert(item.unitConversions[0])}
                            className="text-xs h-8 rounded-lg"
                          >
                            Çevir
                          </Button>
                        </div>
                        {convertedResult && (
                          <div className="text-xs font-medium text-[--brand] bg-[--brand-soft] p-2.5 rounded-lg border border-[--brand-line]">
                            {convertedResult}
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </TabsContent>

                {/* SEKME 4: LOT VE SKT GEÇMİŞİ */}
                <TabsContent value="lots" className="space-y-3">
                  <h4 className="text-xs font-semibold text-[--text-muted] uppercase tracking-wide">
                    Parti, Lot ve Son Kullanma Tarihleri
                  </h4>

                  {(!item.lotSerials || item.lotSerials.length === 0) ? (
                    <div className="text-center py-6 text-xs text-[--text-muted] border border-dashed border-[--line] rounded-xl">
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
                            className="p-3.5 rounded-xl bg-white border border-[--line] space-y-1.5"
                          >
                            <div className="flex items-center justify-between text-xs">
                              <span className="font-mono font-semibold text-[--text]">
                                {safeText(lot.lotNumber, "Lot Yok")}
                              </span>
                              {daysLeft !== null && (
                                <Badge
                                  variant={daysLeft <= 7 ? "bad" : daysLeft <= 15 ? "warn" : "ok"}
                                  size="sm"
                                >
                                  {daysLeft <= 0 ? "SKT Doldu!" : `${daysLeft} gün kaldı`}
                                </Badge>
                              )}
                            </div>
                            <div className="flex items-center justify-between text-[11px] text-[--text-muted] pt-1 border-t border-[--line-soft]">
                              <span>
                                {lot.expiryDate ? safeDate(lot.expiryDate) : "Süresiz"}
                              </span>
                              <span>
                                Kalan: <strong className="text-[--text]">{lot.remainingQty}</strong> {safeText(item.baseUnit, "Adet")}
                              </span>
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  )}

                  {/* Son Hareketler */}
                  {item.stockMovements && item.stockMovements.length > 0 && (
                    <div className="pt-4 space-y-2">
                      <div className="flex items-center gap-1.5 text-xs font-semibold text-[--text-muted]">
                        <IconHistory size={14} className="text-[--brand]" />
                        Son Stok Hareketleri
                      </div>
                      <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
                        {item.stockMovements.map((move: any) => {
                          const isOpening = move.movementType === "OPENING_BALANCE"
                          const isInbound =
                            isOpening ||
                            ["RECEIPT", "IN", "TRANSFER_IN", "RMA_RETURN", "PRODUCTION_OUTPUT"].includes(
                              String(move.movementType || "")
                            ) ||
                            (move.movementType === "COUNT_ADJUSTMENT" && Number(move.quantity || 0) >= 0)
                          return (
                            <div
                              key={move.id}
                              className="text-[11px] p-2.5 rounded-xl bg-[--muted-bg]/40 border border-[--line-soft] flex items-center justify-between"
                            >
                              <div>
                                <span className={isInbound ? "text-[--brand] font-medium" : "text-[--text-2] font-medium"}>
                                  {isOpening ? "Açılış Bakiyesi (+)" : isInbound ? "Giriş (+)" : "Çıkış (-)"}
                                </span>
                                <span className="text-[--text-muted] ml-1.5">
                                  {safeDate(move.createdAt)}
                                </span>
                              </div>
                              <span className="font-mono font-medium text-[--text]">
                                {move.quantity} {safeText(move.unit, "Adet")}
                              </span>
                            </div>
                          )
                        })}
                      </div>
                    </div>
                  )}
                </TabsContent>

                {showProductionTab && (
                  <TabsContent value="production" className="space-y-3">
                    <ItemProductionProfileTab
                      itemId={item.id}
                      itemName={item.name}
                      baseUnit={item.baseUnit}
                    />
                  </TabsContent>
                )}
              </Tabs>
            </div>
          </motion.div>
        )}
      </SheetContent>

      <PrintableLabelModal
        open={labelItemOpen}
        onClose={() => setLabelItemOpen(false)}
        entityType="ITEM"
        entityId={item?.id || null}
      />
    </Sheet>
  )
}
