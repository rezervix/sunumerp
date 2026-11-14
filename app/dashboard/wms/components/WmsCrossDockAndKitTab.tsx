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
  ArrowRight,
  Split,
  Boxes,
  Plus,
  Play,
  RefreshCw,
  CheckCircle2,
  Truck,
} from "lucide-react"
import {
  WMS_CROSS_DOCK_STATUS_LABELS,
  WMS_KIT_STATUS_LABELS,
  type WmsCrossDockStatus,
  type WmsKitStatus,
} from "@/lib/logistics/wms/constantsAndHelpers"

interface WmsCrossDockAndKitTabProps {
  warehouses: any[]
  items: any[]
  bins: any[]
  selectedWarehouseId: string
  onRefreshParent: () => void
}

export function WmsCrossDockAndKitTab({
  warehouses,
  items,
  bins,
  selectedWarehouseId,
  onRefreshParent,
}: WmsCrossDockAndKitTabProps) {
  const [crossDockOrders, setCrossDockOrders] = useState<any[]>([])
  const [kitOrders, setKitOrders] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  // Cross-Dock oluşturma modalı
  const [isXdOpen, setIsXdOpen] = useState(false)
  const [xdWhId, setXdWhId] = useState(
    selectedWarehouseId !== "ALL" ? selectedWarehouseId : warehouses[0]?.id || "wh-merkez-01"
  )
  const [xdItemId, setXdItemId] = useState(items[0]?.id || "")
  const [xdQty, setXdQty] = useState("25")
  const [xdPoNo, setXdPoNo] = useState("PO-2026-412")
  const [xdOutboundRef, setXdOutboundRef] = useState("SIP-2026-991")
  const [xdRampBinId, setXdRampBinId] = useState("")
  const [submitting, setSubmitting] = useState(false)

  // Kitting oluşturma modalı
  const [isKitOpen, setIsKitOpen] = useState(false)
  const [kitOpType, setKitOpType] = useState<"ASSEMBLE" | "DISASSEMBLE">("ASSEMBLE")
  const [kitWhId, setKitWhId] = useState(
    selectedWarehouseId !== "ALL" ? selectedWarehouseId : warehouses[0]?.id || "wh-merkez-01"
  )
  const [kitItemId, setKitItemId] = useState(items[0]?.id || "")
  const [kitCompId, setKitCompId] = useState(items[1]?.id || items[0]?.id || "")
  const [kitCompPerSet, setKitCompPerSet] = useState("3")
  const [kitQty, setKitQty] = useState("5")

  const loadAll = useCallback(async () => {
    setLoading(true)
    try {
      const q = selectedWarehouseId !== "ALL" ? `&warehouseId=${encodeURIComponent(selectedWarehouseId)}` : ""
      const [xdRes, kitRes] = await Promise.all([
        fetch(`/api/wms?section=cross_dock${q}`).then((r) => r.json()),
        fetch(`/api/wms?section=kitting${q}`).then((r) => r.json()),
      ])
      if (xdRes.success) setCrossDockOrders(xdRes.crossDockOrders || [])
      if (kitRes.success) setKitOrders(kitRes.kitOrders || [])
    } catch {
      toast.error("Cross-Dock ve Kitting verileri yüklenemedi.")
    } finally {
      setLoading(false)
    }
  }, [selectedWarehouseId])

  useEffect(() => {
    loadAll()
  }, [loadAll])

  useEffect(() => {
    if (!xdItemId && items.length > 0) setXdItemId(items[0].id)
    if (!kitItemId && items.length > 0) setKitItemId(items[0].id)
    if (!kitCompId && items.length > 1) setKitCompId(items[1].id)
  }, [items, xdItemId, kitItemId, kitCompId])

  const handleCreateCrossDock = async (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitting(true)
    try {
      const res = await fetch("/api/wms", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "create_cross_dock",
          warehouseId: xdWhId,
          inboundPoNo: xdPoNo,
          outboundOrderRef: xdOutboundRef,
          outboundRampBinId: xdRampBinId || null,
          itemId: xdItemId,
          plannedQty: Number(xdQty || 1),
        }),
      })
      const data = await res.json()
      if (res.ok && data.success) {
        toast.success(data.message)
        setIsXdOpen(false)
        await loadAll()
      } else {
        toast.error(data.error || "Cross-Dock emri oluşturulamadı.")
      }
    } catch {
      toast.error("Bağlantı hatası.")
    } finally {
      setSubmitting(false)
    }
  }

  const handleAdvanceCrossDock = async (crossDockId: string, nextStatus: WmsCrossDockStatus) => {
    setSubmitting(true)
    try {
      const res = await fetch("/api/wms", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "advance_cross_dock", crossDockId, nextStatus }),
      })
      const data = await res.json()
      if (res.ok && data.success) {
        toast.success(data.message)
        await loadAll()
        onRefreshParent()
      } else {
        toast.error(data.error || "Durum güncellenemedi.")
      }
    } finally {
      setSubmitting(false)
    }
  }

  const handleCreateKit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitting(true)
    try {
      const res = await fetch("/api/wms", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "create_kit_order",
          operationType: kitOpType,
          warehouseId: kitWhId,
          kitItemId,
          plannedQty: Number(kitQty || 1),
          components: kitCompId
            ? [{ componentItemId: kitCompId, requiredPerKit: Number(kitCompPerSet || 1) }]
            : [],
        }),
      })
      const data = await res.json()
      if (res.ok && data.success) {
        toast.success(data.message)
        setIsKitOpen(false)
        await loadAll()
      } else {
        toast.error(data.error || "Kitting emri oluşturulamadı.")
      }
    } finally {
      setSubmitting(false)
    }
  }

  const handleExecuteKit = async (kitOrderId: string) => {
    setSubmitting(true)
    try {
      const res = await fetch("/api/wms", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "execute_kit_order", kitOrderId }),
      })
      const data = await res.json()
      if (res.ok && data.success) {
        toast.success(data.message)
        await loadAll()
        onRefreshParent()
      } else {
        toast.error(data.error || "Kitting emri uygulanamadı.")
      }
    } finally {
      setSubmitting(false)
    }
  }

  const rampBins = bins.filter((b) => b.warehouseId === xdWhId)

  return (
    <div className="space-y-8">
      {/* BÖLÜM 1: CROSS-DOCKING */}
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-[#111513]/90 border border-white/[0.06] rounded-[20px] p-5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-purple-300">
              <Split className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-white">
                Cross-Docking (Rafa Kaldırmadan Doğrudan Aktarma)
              </h3>
              <p className="text-xs text-zinc-400">
                Mal kabul rampasına gelen ürünleri depolama rafına çıkarmadan açık sipariş çıkış rampasına yönlendirin.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={loadAll}
              className="h-9 px-3 text-xs border-white/[0.08] bg-white/[0.04] text-zinc-300 rounded-full gap-1.5"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
              <span>Yenile</span>
            </Button>
            <Button
              size="sm"
              onClick={() => setIsXdOpen(true)}
              className="h-9 px-4 text-xs bg-[#34D399] hover:bg-[#34D399]/90 text-[#061811] font-semibold rounded-full shadow-lg shadow-emerald-500/20 gap-1.5 cursor-pointer"
            >
              <Plus className="h-3.5 w-3.5" />
              <span>Yeni Cross-Dock Emri</span>
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {crossDockOrders.length === 0 ? (
            <div className="md:col-span-2 bg-[#111513]/90 border border-white/[0.06] rounded-[20px] p-8 text-center text-xs text-zinc-500">
              Henüz Cross-Dock aktarma emri yok.
            </div>
          ) : (
            crossDockOrders.map((cd) => (
              <div
                key={cd.id}
                className="bg-[#111513]/90 border border-white/[0.06] rounded-[20px] p-5 space-y-3"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-sm font-semibold text-white font-mono">{cd.crossDockNo}</div>
                    <div className="text-[11px] text-zinc-400">
                      {cd.warehouseName} · PO: {cd.inboundPoNo || "-"} → Sipariş: {cd.outboundOrderRef}
                    </div>
                  </div>
                  <span className="rounded-full px-2.5 py-0.5 text-[11px] font-medium bg-purple-500/10 text-purple-300 border border-purple-500/20">
                    {WMS_CROSS_DOCK_STATUS_LABELS[cd.status as WmsCrossDockStatus] || cd.status}
                  </span>
                </div>

                <div className="bg-black/30 border border-white/[0.06] rounded-xl p-3 flex items-center justify-between text-xs">
                  <div>
                    <div className="font-semibold text-white">{cd.itemName}</div>
                    <div className="font-mono text-[11px] text-zinc-400">
                      {cd.inboundBinCode} → {cd.outboundRampCode}
                    </div>
                  </div>
                  <div className="font-mono font-bold text-[#34D399]">
                    {cd.plannedQty} {cd.unit}
                  </div>
                </div>

                <div className="flex items-center justify-end gap-2 pt-1">
                  {cd.status === "PLANNED" && (
                    <Button
                      size="sm"
                      disabled={submitting}
                      onClick={() => handleAdvanceCrossDock(cd.id, "RECEIVING_DOCK")}
                      className="h-8 px-3 text-xs bg-amber-500/15 hover:bg-amber-500/25 text-amber-300 border border-amber-500/30 rounded-full cursor-pointer"
                    >
                      Kabul Rampasına Al
                    </Button>
                  )}
                  {(cd.status === "RECEIVING_DOCK" || cd.status === "STAGED_AT_RAMP") && (
                    <Button
                      size="sm"
                      disabled={submitting}
                      onClick={() => handleAdvanceCrossDock(cd.id, "DISPATCHED")}
                      className="h-8 px-3.5 text-xs bg-[#34D399] hover:bg-[#34D399]/90 text-[#061811] font-semibold rounded-full gap-1 cursor-pointer"
                    >
                      <Truck className="h-3.5 w-3.5" />
                      <span>Doğrudan Sevk Et</span>
                    </Button>
                  )}
                  {cd.status === "DISPATCHED" && (
                    <span className="inline-flex items-center gap-1 text-xs text-[#34D399] font-medium">
                      <CheckCircle2 className="h-3.5 w-3.5" />
                      Sevk Tamamlandı ({cd.dispatchedQty} {cd.unit})
                    </span>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* BÖLÜM 2: DEPO KITTING (SET BİRLEŞTİRME & BOZMA) */}
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-[#111513]/90 border border-white/[0.06] rounded-[20px] p-5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-[#34D399]">
              <Boxes className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-white">
                Kitting (Depo İçi Set Birleştirme &amp; Set Bozma Emirleri)
              </h3>
              <p className="text-xs text-zinc-400">
                Bileşen stoklarını otomatik tüketip paketli set stoğu üretin veya setleri tekrar bileşenlerine ayırın.
              </p>
            </div>
          </div>
          <Button
            size="sm"
            onClick={() => setIsKitOpen(true)}
            className="h-9 px-4 text-xs bg-white/[0.06] hover:bg-white/[0.1] border border-white/[0.08] text-white font-medium rounded-full gap-1.5 cursor-pointer"
          >
            <Plus className="h-3.5 w-3.5 text-[#34D399]" />
            <span>Yeni Kitting Emri</span>
          </Button>
        </div>

        <div className="bg-[#111513]/90 border border-white/[0.06] rounded-[20px] overflow-hidden shadow-2xl">
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left border-collapse">
              <thead>
                <tr className="bg-white/[0.02] border-b border-white/[0.06] text-[11px] text-zinc-400 uppercase font-medium">
                  <th className="py-3.5 px-5">Kitting No</th>
                  <th className="py-3.5 px-3">İşlem Türü</th>
                  <th className="py-3.5 px-3">Hedef Set Ürünü</th>
                  <th className="py-3.5 px-3">Bileşenler</th>
                  <th className="py-3.5 px-3 text-right">Miktar</th>
                  <th className="py-3.5 px-3 text-center">Durum</th>
                  <th className="py-3.5 px-5 text-right">İşlem</th>
                </tr>
              </thead>
              <tbody>
                {kitOrders.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-10 text-center text-zinc-500">
                      Kitting emri bulunmuyor.
                    </td>
                  </tr>
                ) : (
                  kitOrders.map((ko) => (
                    <tr
                      key={ko.id}
                      className="border-b border-white/[0.04] hover:bg-white/[0.02] transition-colors"
                    >
                      <td className="py-3.5 px-5 font-mono font-semibold text-white">{ko.kitOrderNo}</td>
                      <td className="py-3.5 px-3">
                        <span
                          className={`rounded-full px-2.5 py-0.5 text-[11px] font-medium border ${
                            ko.operationType === "ASSEMBLE"
                              ? "bg-emerald-500/10 text-[#34D399] border-emerald-500/20"
                              : "bg-amber-500/10 text-amber-300 border-amber-500/20"
                          }`}
                        >
                          {ko.operationType === "ASSEMBLE" ? "Set Birleştirme" : "Set Bozma"}
                        </span>
                      </td>
                      <td className="py-3.5 px-3">
                        <div className="text-white font-medium">{ko.kitItemName}</div>
                        <div className="text-[11px] font-mono text-zinc-500">{ko.kitSku} · {ko.warehouseName}</div>
                      </td>
                      <td className="py-3.5 px-3 text-zinc-300">
                        {(ko.components || []).map((c: any) => (
                          <div key={c.id} className="text-[11px]">
                            {c.componentName}: <span className="font-mono text-[#34D399]">{c.totalRequiredQty} {c.unit}</span>
                          </div>
                        ))}
                      </td>
                      <td className="py-3.5 px-3 text-right font-mono font-bold text-white">
                        {ko.plannedQty} {ko.unit}
                      </td>
                      <td className="py-3.5 px-3 text-center">
                        <span className="rounded-full px-2.5 py-0.5 text-[11px] bg-white/[0.06] text-zinc-300 border border-white/[0.08]">
                          {WMS_KIT_STATUS_LABELS[ko.status as WmsKitStatus] || ko.status}
                        </span>
                      </td>
                      <td className="py-3.5 px-5 text-right">
                        {ko.status !== "COMPLETED" && ko.status !== "CANCELLED" ? (
                          <Button
                            size="sm"
                            disabled={submitting}
                            onClick={() => handleExecuteKit(ko.id)}
                            className="h-8 px-3.5 text-xs bg-[#34D399] hover:bg-[#34D399]/90 text-[#061811] font-semibold rounded-full gap-1 cursor-pointer"
                          >
                            <Play className="h-3 w-3" />
                            <span>Stokla Eşitle</span>
                          </Button>
                        ) : (
                          <span className="text-xs text-[#34D399] font-medium">Tamamlandı</span>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Cross-Dock Modal */}
      <Dialog open={isXdOpen} onOpenChange={setIsXdOpen}>
        <DialogContent className="sm:max-w-md backdrop-blur-xl bg-[#111513] border border-white/[0.08] rounded-2xl text-white">
          <DialogHeader>
            <DialogTitle className="text-base font-semibold">Yeni Cross-Dock Emri</DialogTitle>
            <DialogDescription className="text-xs text-zinc-400">
              Gelen malı rafa almadan çıkış rampasına bağlayın.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleCreateCrossDock} className="space-y-3 text-xs">
            <div className="space-y-1">
              <Label className="text-xs text-zinc-300">Depo</Label>
              <select
                value={xdWhId}
                onChange={(e) => setXdWhId(e.target.value)}
                className="w-full h-9 text-xs bg-white/[0.03] border border-white/[0.08] text-white rounded-xl px-2.5"
              >
                {warehouses.map((w) => (
                  <option key={w.id} value={w.id} className="bg-[#111513]">{w.name}</option>
                ))}
              </select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs text-zinc-300">Gelen Satınalma (PO)</Label>
                <Input value={xdPoNo} onChange={(e) => setXdPoNo(e.target.value)} className="h-9 text-xs font-mono bg-white/[0.03] border-white/[0.08]" />
              </div>
              <div className="space-y-1">
                <Label className="text-xs text-zinc-300">Hedef Sipariş Ref</Label>
                <Input value={xdOutboundRef} onChange={(e) => setXdOutboundRef(e.target.value)} required className="h-9 text-xs font-mono bg-white/[0.03] border-white/[0.08]" />
              </div>
            </div>
            <div className="grid grid-cols-3 gap-2">
              <div className="col-span-2 space-y-1">
                <Label className="text-xs text-zinc-300">Ürün</Label>
                <select
                  value={xdItemId}
                  onChange={(e) => setXdItemId(e.target.value)}
                  className="w-full h-9 text-xs bg-white/[0.03] border border-white/[0.08] text-white rounded-xl px-2.5"
                >
                  {items.map((it) => (
                    <option key={it.id} value={it.id} className="bg-[#111513]">{it.sku} — {it.name}</option>
                  ))}
                </select>
              </div>
              <div className="space-y-1">
                <Label className="text-xs text-zinc-300">Miktar</Label>
                <Input type="number" min="1" value={xdQty} onChange={(e) => setXdQty(e.target.value)} className="h-9 text-xs font-mono bg-white/[0.03] border-white/[0.08]" />
              </div>
            </div>
            <div className="space-y-1">
              <Label className="text-xs text-zinc-300">Çıkış Rampası</Label>
              <select
                value={xdRampBinId}
                onChange={(e) => setXdRampBinId(e.target.value)}
                className="w-full h-9 text-xs bg-white/[0.03] border border-white/[0.08] text-white rounded-xl px-2.5"
              >
                <option value="" className="bg-[#111513]">Otomatik Sevkiyat Rampası</option>
                {rampBins.map((b) => (
                  <option key={b.id} value={b.id} className="bg-[#111513]">{b.code}</option>
                ))}
              </select>
            </div>
            <DialogFooter className="pt-2">
              <Button type="button" variant="outline" size="sm" onClick={() => setIsXdOpen(false)} className="text-xs border-white/[0.08] bg-white/[0.04] rounded-full h-9 px-4">Vazgeç</Button>
              <Button type="submit" disabled={submitting} className="text-xs bg-[#34D399] text-[#061811] font-semibold rounded-full h-9 px-4 cursor-pointer">
                Planla <ArrowRight className="h-3.5 w-3.5 ml-1" />
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Kitting Modal */}
      <Dialog open={isKitOpen} onOpenChange={setIsKitOpen}>
        <DialogContent className="sm:max-w-md backdrop-blur-xl bg-[#111513] border border-white/[0.08] rounded-2xl text-white">
          <DialogHeader>
            <DialogTitle className="text-base font-semibold">Yeni Kitting / Set İş Emri</DialogTitle>
            <DialogDescription className="text-xs text-zinc-400">
              Set birleştirme veya mevcut seti bileşenlerine bozma emri açın.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleCreateKit} className="space-y-3 text-xs">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs text-zinc-300">İşlem</Label>
                <select value={kitOpType} onChange={(e) => setKitOpType(e.target.value as any)} className="w-full h-9 text-xs bg-white/[0.03] border border-white/[0.08] text-white rounded-xl px-2.5">
                  <option value="ASSEMBLE" className="bg-[#111513]">Set Birleştir (Assemble)</option>
                  <option value="DISASSEMBLE" className="bg-[#111513]">Set Boz (Disassemble)</option>
                </select>
              </div>
              <div className="space-y-1">
                <Label className="text-xs text-zinc-300">Depo</Label>
                <select value={kitWhId} onChange={(e) => setKitWhId(e.target.value)} className="w-full h-9 text-xs bg-white/[0.03] border border-white/[0.08] text-white rounded-xl px-2.5">
                  {warehouses.map((w) => (
                    <option key={w.id} value={w.id} className="bg-[#111513]">{w.name}</option>
                  ))}
                </select>
              </div>
            </div>
            <div className="grid grid-cols-3 gap-2">
              <div className="col-span-2 space-y-1">
                <Label className="text-xs text-zinc-300">Ana Set Ürünü</Label>
                <select value={kitItemId} onChange={(e) => setKitItemId(e.target.value)} className="w-full h-9 text-xs bg-white/[0.03] border border-white/[0.08] text-white rounded-xl px-2.5">
                  {items.map((it) => (
                    <option key={it.id} value={it.id} className="bg-[#111513]">{it.sku} — {it.name}</option>
                  ))}
                </select>
              </div>
              <div className="space-y-1">
                <Label className="text-xs text-zinc-300">Set Adedi</Label>
                <Input type="number" min="1" value={kitQty} onChange={(e) => setKitQty(e.target.value)} className="h-9 text-xs font-mono bg-white/[0.03] border-white/[0.08]" />
              </div>
            </div>
            <div className="grid grid-cols-3 gap-2">
              <div className="col-span-2 space-y-1">
                <Label className="text-xs text-zinc-300">Bileşen Ürünü</Label>
                <select value={kitCompId} onChange={(e) => setKitCompId(e.target.value)} className="w-full h-9 text-xs bg-white/[0.03] border border-white/[0.08] text-white rounded-xl px-2.5">
                  {items.map((it) => (
                    <option key={it.id} value={it.id} className="bg-[#111513]">{it.sku} — {it.name}</option>
                  ))}
                </select>
              </div>
              <div className="space-y-1">
                <Label className="text-xs text-zinc-300">Set Başı Adet</Label>
                <Input type="number" min="1" value={kitCompPerSet} onChange={(e) => setKitCompPerSet(e.target.value)} className="h-9 text-xs font-mono bg-white/[0.03] border-white/[0.08]" />
              </div>
            </div>
            <DialogFooter className="pt-2">
              <Button type="button" variant="outline" size="sm" onClick={() => setIsKitOpen(false)} className="text-xs border-white/[0.08] bg-white/[0.04] rounded-full h-9 px-4">Vazgeç</Button>
              <Button type="submit" disabled={submitting} className="text-xs bg-[#34D399] text-[#061811] font-semibold rounded-full h-9 px-4 cursor-pointer">Kitting Emri Aç</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
