"use client"

import React, { useCallback, useEffect, useState } from "react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog"
import {
  Boxes,
  QrCode,
  Plus,
  Layers,
  CheckCircle2,
  Package,
  RefreshCw,
} from "lucide-react"
import { PrintableLabelModal } from "./PrintableLabelModal"
import { validateSscc18Code } from "@/lib/logistics/wms/constantsAndHelpers"
import { safeNumber, safeText } from "@/lib/utils/safe-display"

interface WmsPackagingAndSsccTabProps {
  warehouses: any[]
  items: any[]
  bins: any[]
  selectedWarehouseId: string
  onRefreshParent: () => void
}

export function WmsPackagingAndSsccTab({
  warehouses,
  items,
  bins,
  selectedWarehouseId,
  onRefreshParent,
}: WmsPackagingAndSsccTabProps) {
  const [lpns, setLpns] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [labelTargetId, setLabelTargetId] = useState<string | null>(null)

  // Yeni LPN / SSCC Palet Oluşturma Modalı
  const [isNewLpnOpen, setIsNewLpnOpen] = useState(false)
  const [lpnWhId, setLpnWhId] = useState(
    selectedWarehouseId !== "ALL" ? selectedWarehouseId : warehouses[0]?.id || "wh-merkez-01"
  )
  const [lpnBinCode, setLpnBinCode] = useState("")
  const [containerType, setContainerType] = useState("PALLET_EUR")
  const [lpnItemId, setLpnItemId] = useState(items[0]?.id || "")
  const [lpnQty, setLpnQty] = useState("24")
  const [lpnLot, setLpnLot] = useState("")
  const [rfidTagEpc, setRfidTagEpc] = useState("")
  const [submitting, setSubmitting] = useState(false)

  // Çok Seviyeli Ambalaj Hiyerarşisi Editörü
  const [packItemId, setPackItemId] = useState(items[0]?.id || "")
  const [innerBoxMult, setInnerBoxMult] = useState("10")
  const [cartonMult, setCartonMult] = useState("40")
  const [palletMult, setPalletMult] = useState("480")
  const [tiCount, setTiCount] = useState("4")
  const [hiCount, setHiCount] = useState("3")
  const [savingHierarchy, setSavingHierarchy] = useState(false)

  const loadLpns = useCallback(async () => {
    setLoading(true)
    try {
      const q = selectedWarehouseId !== "ALL" ? `&warehouseId=${encodeURIComponent(selectedWarehouseId)}` : ""
      const res = await fetch(`/api/wms?section=lpns${q}`)
      const data = await res.json()
      if (data.success) setLpns(data.licensePlates || [])
    } catch {
      toast.error("LPN listesi yüklenemedi.")
    } finally {
      setLoading(false)
    }
  }, [selectedWarehouseId])

  useEffect(() => {
    loadLpns()
  }, [loadLpns])

  useEffect(() => {
    if (!lpnItemId && items.length > 0) setLpnItemId(items[0].id)
    if (!packItemId && items.length > 0) setPackItemId(items[0].id)
  }, [items, lpnItemId, packItemId])

  const whBins = bins.filter((b) => b.warehouseId === lpnWhId)

  const handleCreateLpn = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!lpnWhId || !lpnItemId) return
    setSubmitting(true)
    try {
      const res = await fetch("/api/wms", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "create_lpn",
          warehouseId: lpnWhId,
          currentBinCode: lpnBinCode || whBins[0]?.code || "A-01-01",
          containerType,
          rfidTagEpc: rfidTagEpc.trim() || null,
          contents: [
            {
              itemId: lpnItemId,
              quantity: Number(lpnQty || 1),
              lotNumber: lpnLot.trim() || null,
            },
          ],
        }),
      })
      const data = await res.json()
      if (res.ok && data.success) {
        toast.success(data.message || "SSCC-18 LPN oluşturuldu.")
        setIsNewLpnOpen(false)
        setRfidTagEpc("")
        await loadLpns()
        onRefreshParent()
      } else {
        toast.error(data.error || "LPN oluşturulamadı.")
      }
    } catch {
      toast.error("Bağlantı hatası.")
    } finally {
      setSubmitting(false)
    }
  }

  const handleSavePackagingHierarchy = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!packItemId) return
    const selectedItem = items.find((i) => i.id === packItemId)
    const baseUnit = selectedItem?.baseUnit || "Adet"
    setSavingHierarchy(true)
    try {
      const res = await fetch("/api/wms", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "save_packaging_hierarchy",
          itemId: packItemId,
          tiers: [
            {
              levelOrder: 2,
              fromUnit: "İç Kutu",
              toUnit: baseUnit,
              parentUnit: baseUnit,
              multiplier: Number(innerBoxMult || 10),
              isDefaultSales: false,
            },
            {
              levelOrder: 3,
              fromUnit: "Koli",
              toUnit: baseUnit,
              parentUnit: "İç Kutu",
              multiplier: Number(cartonMult || 40),
              isDefaultPurchase: true,
              isDefaultSales: true,
            },
            {
              levelOrder: 4,
              fromUnit: "Palet",
              toUnit: baseUnit,
              parentUnit: "Koli",
              multiplier: Number(palletMult || 480),
              tiCount: Number(tiCount || 4),
              hiCount: Number(hiCount || 3),
            },
          ],
        }),
      })
      const data = await res.json()
      if (res.ok && data.success) {
        toast.success("4 seviyeli ambalaj zinciri kaydedildi.")
      } else {
        toast.error(data.error || "Ambalaj zinciri kaydedilemedi.")
      }
    } catch {
      toast.error("Bağlantı hatası.")
    } finally {
      setSavingHierarchy(false)
    }
  }

  return (
    <div className="space-y-6">
      {/* Üst Özet & Aksiyon */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white/80 backdrop-blur-xl border border-[--line] rounded-2xl p-5 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-[--brand-soft] border border-[--brand-line] flex items-center justify-center text-[--brand]">
            <Boxes className="h-5 w-5" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-[--text]">
              Ambalaj Hiyerarşisi &amp; GS1-128 SSCC Palet (LPN) Yönetimi
            </h3>
            <p className="text-xs text-[--text-muted]">
              Adet → İç Kutu → Koli → Euro Palet Ti-Hi çevrimleri ve Mod-10 doğrulamalı SSCC-18 etiket basımı.
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={loadLpns}
            className="h-9 px-3.5 text-xs border-[--line] bg-white hover:bg-[--muted-bg] text-[--text-2] rounded-full gap-1.5 cursor-pointer"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
            <span>Yenile</span>
          </Button>
          <Button
            size="sm"
            onClick={() => setIsNewLpnOpen(true)}
            className="h-9 px-4 text-xs bg-[--brand] hover:bg-[--brand-hover] text-white font-semibold rounded-full shadow-sm gap-1.5 cursor-pointer"
          >
            <Plus className="h-3.5 w-3.5" />
            <span>Yeni SSCC-18 LPN / Palet</span>
          </Button>
        </div>
      </div>

      {/* Çok Seviyeli Ambalaj Hiyerarşisi Kartı */}
      <form
        onSubmit={handleSavePackagingHierarchy}
        className="bg-white border border-[--line] rounded-2xl p-5 space-y-4 shadow-sm"
      >
        <div className="flex items-center justify-between border-b border-[--line] pb-3">
          <div className="flex items-center gap-2 text-xs font-semibold text-[--text]">
            <Layers className="h-4 w-4 text-[--brand]" />
            <span>Ürün Çok Seviyeli Ambalaj Zinciri &amp; Ti-Hi Tanımı</span>
          </div>
          <span className="text-[11px] font-mono text-[--text-muted]">
            1 Palet = {safeNumber(tiCount, 4)} × {safeNumber(hiCount, 3)} = {Number(tiCount || 0) * Number(hiCount || 0)} Koli ({safeNumber(palletMult, 480)} Adet)
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-6 gap-3 items-end">
          <div className="md:col-span-2 space-y-1">
            <Label className="text-[11px] text-[--text-muted]">Ürün Seçimi</Label>
            <select
              value={packItemId}
              onChange={(e) => setPackItemId(e.target.value)}
              className="w-full h-9 text-xs bg-[--page] border border-[--line] text-[--text] rounded-xl px-2.5 focus:outline-none focus:border-[--brand] focus:ring-1 focus:ring-[--brand]"
            >
              {items.map((it) => (
                <option key={it.id} value={it.id} className="bg-white text-[--text]">
                  {it.sku} — {it.name} ({it.baseUnit})
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-1">
            <Label className="text-[11px] text-[--text-muted]">2. İç Kutu (Adet)</Label>
            <Input
              type="number"
              min="1"
              value={innerBoxMult}
              onChange={(e) => setInnerBoxMult(e.target.value)}
              className="h-9 text-xs font-mono bg-[--page] border-[--line] text-[--text] rounded-xl"
            />
          </div>
          <div className="space-y-1">
            <Label className="text-[11px] text-[--text-muted]">3. Koli (Adet)</Label>
            <Input
              type="number"
              min="1"
              value={cartonMult}
              onChange={(e) => setCartonMult(e.target.value)}
              className="h-9 text-xs font-mono bg-[--page] border-[--line] text-[--text] rounded-xl"
            />
          </div>
          <div className="space-y-1">
            <Label className="text-[11px] text-[--text-muted]">4. Palet (Ti×Hi / Adet)</Label>
            <div className="flex gap-1.5">
              <Input
                type="number"
                min="1"
                value={tiCount}
                onChange={(e) => setTiCount(e.target.value)}
                placeholder="Ti"
                className="h-9 w-14 text-xs font-mono bg-[--page] border-[--line] text-[--text] rounded-xl"
              />
              <Input
                type="number"
                min="1"
                value={hiCount}
                onChange={(e) => setHiCount(e.target.value)}
                placeholder="Hi"
                className="h-9 w-14 text-xs font-mono bg-[--page] border-[--line] text-[--text] rounded-xl"
              />
              <Input
                type="number"
                min="1"
                value={palletMult}
                onChange={(e) => setPalletMult(e.target.value)}
                className="h-9 flex-1 text-xs font-mono bg-[--page] border-[--line] text-[--text] rounded-xl"
              />
            </div>
          </div>
          <div>
            <Button
              type="submit"
              disabled={savingHierarchy}
              className="w-full h-9 text-xs bg-white hover:bg-[--brand-soft] border border-[--line] hover:border-[--brand-line] text-[--text-2] hover:text-[--brand] rounded-xl cursor-pointer font-medium"
            >
              {savingHierarchy ? "Kaydediliyor..." : "Hiyerarşiyi Kaydet"}
            </Button>
          </div>
        </div>
      </form>

      {/* Aktif LPN / Paletler Tablosu */}
      <div className="bg-white border border-[--line] rounded-2xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left border-collapse">
            <thead>
              <tr className="bg-[--page] border-b border-[--line] text-[11px] text-[--text-muted] uppercase font-semibold">
                <th className="py-3.5 px-5">SSCC / LPN Kodu</th>
                <th className="py-3.5 px-3">Depo &amp; Raf</th>
                <th className="py-3.5 px-3">Kap Tipi</th>
                <th className="py-3.5 px-3">İçerik</th>
                <th className="py-3.5 px-3 text-right">Ağırlık</th>
                <th className="py-3.5 px-3 text-center">GS1 Check</th>
                <th className="py-3.5 px-5 text-right">Etiket</th>
              </tr>
            </thead>
            <tbody>
              {lpns.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-10 text-center text-[--text-muted]">
                    Kayıtlı LPN / Palet bulunamadı.
                  </td>
                </tr>
              ) : (
                lpns.map((lpn) => {
                  const ssccCheck = validateSscc18Code(lpn.lpnCode || "")
                  return (
                    <tr
                      key={lpn.id}
                      className="border-b border-[--line-soft] hover:bg-[--brand-soft]/30 transition-colors"
                    >
                      <td className="py-3.5 px-5 font-mono font-semibold text-[--text]">
                        <div>{lpn.lpnCode}</div>
                        {lpn.rfidTagEpc && (
                          <div className="text-[10px] text-[--text-muted]">EPC: {lpn.rfidTagEpc}</div>
                        )}
                      </td>
                      <td className="py-3.5 px-3">
                        <div className="text-[--text] font-medium">{lpn.warehouseName}</div>
                        <div className="text-[11px] font-mono text-[--brand]">{lpn.currentBinCode}</div>
                      </td>
                      <td className="py-3.5 px-3 font-mono text-[--text-2]">{lpn.containerType}</td>
                      <td className="py-3.5 px-3">
                        {(lpn.contents || []).length === 0 ? (
                          <span className="text-[--text-muted]">Boş Palet</span>
                        ) : (
                          lpn.contents.map((c: any) => (
                            <div key={c.id} className="flex items-center gap-1.5 text-[--text-2]">
                              <Package className="h-3 w-3 text-[--brand]" />
                              <span>{c.sku || c.itemName}</span>
                              <span className="font-mono text-[--brand] font-semibold">
                                {safeNumber(c.quantity, 0)} {c.unit}
                              </span>
                              {c.lotNumber && (
                                <span className="text-[10px] font-mono text-[--text-muted]">({c.lotNumber})</span>
                              )}
                            </div>
                          ))
                        )}
                      </td>
                      <td className="py-3.5 px-3 text-right font-mono text-[--text-2]">
                        {safeNumber(Number(lpn.totalWeightKg || 0), 0).toFixed(1)} kg
                      </td>
                      <td className="py-3.5 px-3 text-center">
                        {ssccCheck.valid ? (
                          <span className="inline-flex items-center gap-1 bg-[--ok-soft] text-[--ok] border border-[--ok-fill]/20 rounded-full px-2.5 py-0.5 text-[11px] font-medium">
                            <CheckCircle2 className="h-3 w-3" />
                            SSCC-18 Geçerli
                          </span>
                        ) : (
                          <span className="inline-flex items-center bg-[--page] text-[--text-muted] border border-[--line] rounded-full px-2.5 py-0.5 text-[11px]">
                            Dahili LPN
                          </span>
                        )}
                      </td>
                      <td className="py-3.5 px-5 text-right">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => setLabelTargetId(lpn.id)}
                          className="h-8 px-3 text-xs border-[--line] bg-white hover:bg-[--brand-soft] hover:text-[--brand] text-[--text-2] rounded-full gap-1.5 cursor-pointer"
                        >
                          <QrCode className="h-3.5 w-3.5" />
                          <span>SSCC Etiketi</span>
                        </Button>
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Yeni SSCC-18 LPN Oluşturma Modalı */}
      <Dialog open={isNewLpnOpen} onOpenChange={setIsNewLpnOpen}>
        <DialogContent className="sm:max-w-md bg-white border border-[--line] rounded-2xl text-[--text] p-6 shadow-2xl">
          <DialogHeader>
            <DialogTitle className="text-base font-semibold text-[--text]">
              Yeni GS1-128 SSCC-18 Palet / LPN Oluştur
            </DialogTitle>
            <DialogDescription className="text-xs text-[--text-muted]">
              Mod-10 check-digit ile benzersiz 18 haneli SSCC üretilir ve içerik stoğa bağlanır.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleCreateLpn} className="space-y-3.5 text-xs">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs text-[--text-muted]">Depo</Label>
                <select
                  value={lpnWhId}
                  onChange={(e) => setLpnWhId(e.target.value)}
                  className="w-full h-9 text-xs bg-[--page] border border-[--line] text-[--text] rounded-xl px-2.5"
                >
                  {warehouses.map((w) => (
                    <option key={w.id} value={w.id} className="bg-white text-[--text]">
                      {w.name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="space-y-1">
                <Label className="text-xs text-[--text-muted]">Bulunduğu Raf</Label>
                <select
                  value={lpnBinCode}
                  onChange={(e) => setLpnBinCode(e.target.value)}
                  className="w-full h-9 text-xs bg-[--page] border border-[--line] text-[--text] rounded-xl px-2.5"
                >
                  <option value="" className="bg-white text-[--text]">Varsayılan Raf</option>
                  {whBins.map((b) => (
                    <option key={b.id} value={b.code} className="bg-white text-[--text]">
                      {b.code}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs text-[--text-muted]">Kap / Palet Tipi</Label>
                <select
                  value={containerType}
                  onChange={(e) => setContainerType(e.target.value)}
                  className="w-full h-9 text-xs bg-[--page] border border-[--line] text-[--text] rounded-xl px-2.5"
                >
                  <option value="PALLET_EUR" className="bg-white text-[--text]">Euro Palet (80×120)</option>
                  <option value="MASTER_CARTON" className="bg-white text-[--text]">Ana Koli</option>
                  <option value="PLASTIC_TOTE" className="bg-white text-[--text]">Plastik Kasa / Sepet</option>
                  <option value="ROLL_CAGE" className="bg-white text-[--text]">Roll Cage Çiçek Arabası</option>
                </select>
              </div>
              <div className="space-y-1">
                <Label className="text-xs text-[--text-muted]">RFID EPC (Opsiyonel)</Label>
                <Input
                  value={rfidTagEpc}
                  onChange={(e) => setRfidTagEpc(e.target.value)}
                  placeholder="E2801170..."
                  className="h-9 text-xs font-mono bg-[--page] border-[--line] text-[--text] rounded-xl"
                />
              </div>
            </div>
            <div className="grid grid-cols-3 gap-2">
              <div className="col-span-2 space-y-1">
                <Label className="text-xs text-[--text-muted]">İçerik Ürünü</Label>
                <select
                  value={lpnItemId}
                  onChange={(e) => setLpnItemId(e.target.value)}
                  className="w-full h-9 text-xs bg-[--page] border border-[--line] text-[--text] rounded-xl px-2.5"
                >
                  {items.map((it) => (
                    <option key={it.id} value={it.id} className="bg-white text-[--text]">
                      {it.sku} — {it.name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="space-y-1">
                <Label className="text-xs text-[--text-muted]">Miktar</Label>
                <Input
                  type="number"
                  min="1"
                  value={lpnQty}
                  onChange={(e) => setLpnQty(e.target.value)}
                  className="h-9 text-xs font-mono bg-[--page] border-[--line] text-[--text] rounded-xl font-semibold"
                />
              </div>
            </div>
            <div className="space-y-1">
              <Label className="text-xs text-[--text-muted]">Lot / Parti Numarası (Opsiyonel)</Label>
              <Input
                value={lpnLot}
                onChange={(e) => setLpnLot(e.target.value)}
                placeholder="Örn: LOT-GUL-2026-11"
                className="h-9 text-xs font-mono bg-[--page] border-[--line] text-[--text] rounded-xl"
              />
            </div>
            <DialogFooter className="gap-2 pt-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setIsNewLpnOpen(false)}
                className="text-xs border-[--line] bg-white text-[--text-2] hover:bg-[--muted-bg] rounded-full h-9 px-4 cursor-pointer"
              >
                Vazgeç
              </Button>
              <Button
                type="submit"
                disabled={submitting}
                className="text-xs bg-[--brand] hover:bg-[--brand-hover] text-white font-semibold rounded-full h-9 px-4 shadow-sm cursor-pointer disabled:opacity-50"
              >
                {submitting ? "Üretiliyor..." : "SSCC-18 Üret & Kaydet"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <PrintableLabelModal
        open={Boolean(labelTargetId)}
        onClose={() => setLabelTargetId(null)}
        entityType="LPN"
        entityId={labelTargetId}
      />
    </div>
  )
}
