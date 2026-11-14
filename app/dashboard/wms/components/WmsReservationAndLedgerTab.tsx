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
  Lock,
  Unlock,
  FileText,
  Sparkles,
  Plus,
  RefreshCw,
  Search,
  ChevronLeft,
  ChevronRight,
} from "lucide-react"
import {
  WMS_PICK_POLICY_LABELS,
  WMS_RESERVATION_STATUS_LABELS,
  type WmsReservationStatus,
} from "@/lib/logistics/wms/constantsAndHelpers"

interface WmsReservationAndLedgerTabProps {
  warehouses: any[]
  items: any[]
  selectedWarehouseId: string
  onRefreshParent: () => void
}

export function WmsReservationAndLedgerTab({
  warehouses,
  items,
  selectedWarehouseId,
  onRefreshParent,
}: WmsReservationAndLedgerTabProps) {
  const [reservations, setReservations] = useState<any[]>([])
  const [breakdown, setBreakdown] = useState<any[]>([])
  const [ledgerEntries, setLedgerEntries] = useState<any[]>([])
  const [ledgerPage, setLedgerPage] = useState(1)
  const [ledgerTotalPages, setLedgerTotalPages] = useState(1)
  const [ledgerTotal, setLedgerTotal] = useState(0)

  // Ledger filtreleri
  const [searchQuery, setSearchQuery] = useState("")
  const [movementTypeFilter, setMovementTypeFilter] = useState("ALL")
  const [methodFilter, setMethodFilter] = useState("ALL")
  const [loading, setLoading] = useState(true)

  // FEFO/FIFO öneri önizlemesi
  const [fefoItemId, setFefoItemId] = useState(items[0]?.id || "")
  const [fefoQty, setFefoQty] = useState("15")
  const [fefoResult, setFefoResult] = useState<any>(null)

  // Yeni rezervasyon modalı
  const [isNewResOpen, setIsNewResOpen] = useState(false)
  const [resWhId, setResWhId] = useState(
    selectedWarehouseId !== "ALL" ? selectedWarehouseId : warehouses[0]?.id || "wh-merkez-01"
  )
  const [resItemId, setResItemId] = useState(items[0]?.id || "")
  const [resQty, setResQty] = useState("5")
  const [resSourceType, setResSourceType] = useState("ORDER")
  const [resSourceRef, setResSourceRef] = useState("SIP-2026-845")
  const [submitting, setSubmitting] = useState(false)

  const loadData = useCallback(async () => {
    setLoading(true)
    try {
      const whParam =
        selectedWarehouseId !== "ALL" ? `&warehouseId=${encodeURIComponent(selectedWarehouseId)}` : ""
      const [resApi, ledApi] = await Promise.all([
        fetch(`/api/wms?section=reservations${whParam}`).then((r) => r.json()),
        fetch(
          `/api/wms?section=ledger${whParam}&page=${ledgerPage}&pageSize=12&movementType=${movementTypeFilter}&method=${methodFilter}&search=${encodeURIComponent(searchQuery)}`
        ).then((r) => r.json()),
      ])
      if (resApi.success) {
        setReservations(resApi.reservations || [])
        setBreakdown(resApi.stockBreakdown || [])
      }
      if (ledApi.success) {
        setLedgerEntries(ledApi.entries || [])
        setLedgerTotalPages(ledApi.pagination?.totalPages || 1)
        setLedgerTotal(ledApi.pagination?.total || 0)
      }
    } catch {
      toast.error("Rezervasyon ve stok defteri yüklenemedi.")
    } finally {
      setLoading(false)
    }
  }, [selectedWarehouseId, ledgerPage, movementTypeFilter, methodFilter, searchQuery])

  useEffect(() => {
    loadData()
  }, [loadData])

  useEffect(() => {
    if (!fefoItemId && items.length > 0) setFefoItemId(items[0].id)
    if (!resItemId && items.length > 0) setResItemId(items[0].id)
  }, [items, fefoItemId, resItemId])

  const handleCreateReservation = async (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitting(true)
    try {
      const res = await fetch("/api/wms", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "create_reservation",
          warehouseId: resWhId,
          itemId: resItemId,
          quantity: Number(resQty || 1),
          sourceType: resSourceType,
          sourceId: resSourceRef,
          sourceRefNo: resSourceRef,
        }),
      })
      const data = await res.json()
      if (res.ok && data.success) {
        toast.success(data.message)
        setIsNewResOpen(false)
        await loadData()
        onRefreshParent()
      } else {
        toast.error(data.error || "Rezervasyon oluşturulamadı.")
      }
    } finally {
      setSubmitting(false)
    }
  }

  const handleReleaseReservation = async (reservationId: string) => {
    setSubmitting(true)
    try {
      const res = await fetch("/api/wms", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "release_reservation", reservationId, markStatus: "RELEASED" }),
      })
      const data = await res.json()
      if (res.ok && data.success) {
        toast.success("Rezervasyon serbest bırakıldı.")
        await loadData()
        onRefreshParent()
      } else {
        toast.error(data.error || "Rezervasyon çözülemedi.")
      }
    } finally {
      setSubmitting(false)
    }
  }

  const handleSimulateFefo = async () => {
    if (!fefoItemId) return
    const wh = selectedWarehouseId !== "ALL" ? selectedWarehouseId : warehouses[0]?.id || "wh-merkez-01"
    const res = await fetch(
      `/api/wms?section=pick_suggest&warehouseId=${encodeURIComponent(wh)}&itemId=${encodeURIComponent(fefoItemId)}&quantity=${Number(fefoQty || 10)}`
    )
    const data = await res.json()
    if (data.success) setFefoResult(data)
    else toast.error(data.error || "FEFO önerisi hesaplanamadı.")
  }

  return (
    <div className="space-y-6">
      {/* 1. FEFO / FIFO LOT ÖNERİ SİMÜLATÖRÜ */}
      <div className="bg-[#111513]/90 border border-white/[0.06] rounded-[20px] p-5 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <Sparkles className="h-4 w-4 text-[#34D399]" />
            <div>
              <h3 className="text-sm font-semibold text-white">
                FEFO / FIFO Akıllı Lot &amp; Raf Toplama Önerisi
              </h3>
              <p className="text-[11px] text-zinc-400">
                Karantina/iade/bloklu rafları atlayarak SKT (FEFO) veya giriş (FIFO) sırasına göre en doğru lotları hesaplar.
              </p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <select
              value={fefoItemId}
              onChange={(e) => setFefoItemId(e.target.value)}
              className="h-9 text-xs bg-white/[0.03] border border-white/[0.08] text-white rounded-xl px-2.5"
            >
              {items.map((it) => (
                <option key={it.id} value={it.id} className="bg-[#111513]">
                  {it.sku} — {it.name} ({it.pickPolicy || (it.trackExpiry ? "FEFO" : "FIFO")})
                </option>
              ))}
            </select>
            <Input
              type="number"
              min="1"
              value={fefoQty}
              onChange={(e) => setFefoQty(e.target.value)}
              className="h-9 w-20 text-xs font-mono bg-white/[0.03] border-white/[0.08]"
            />
            <Button
              size="sm"
              onClick={handleSimulateFefo}
              className="h-9 px-4 text-xs bg-[#34D399] hover:bg-[#34D399]/90 text-[#061811] font-semibold rounded-full cursor-pointer"
            >
              Lot Sırası Hesapla
            </Button>
          </div>
        </div>

        {fefoResult && (
          <div className="bg-black/30 border border-white/[0.06] rounded-xl p-3.5 space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="font-medium text-[#34D399]">
                Uygulanan Politika: {WMS_PICK_POLICY_LABELS[fefoResult.policyUsed as "FEFO" | "FIFO"] || fefoResult.policyUsed}
              </span>
              <span className="font-mono text-zinc-300">
                Karşılanan: {fefoResult.allocatedQty} / {fefoResult.requestedQty} (Toplam Müsait: {fefoResult.totalAvailableQty})
              </span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              {(fefoResult.suggestions || []).map((s: any, idx: number) => (
                <div key={idx} className="bg-white/[0.03] border border-white/[0.06] rounded-lg p-2.5 text-xs">
                  <div className="flex items-center justify-between font-mono">
                    <span className="font-bold text-white">#{idx + 1} · {s.binCode}</span>
                    <span className="text-[#34D399] font-semibold">{s.suggestedPickQty}</span>
                  </div>
                  <div className="text-[11px] text-zinc-400 font-mono mt-1">
                    Lot: {s.lotNumber || "Lotsuz"} {s.expiryDate ? `· SKT: ${new Date(s.expiryDate).toLocaleDateString("tr-TR")}` : ""}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* 2. STOK REZERVASYONLARI & FİZİKSEL/AYRILMIŞ/KULLANILABİLİR AYRIMI */}
      <div className="bg-[#111513]/90 border border-white/[0.06] rounded-[20px] p-5 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <Lock className="h-4 w-4 text-[#34D399]" />
            <div>
              <h3 className="text-sm font-semibold text-white">
                Açık Stok Rezervasyonları &amp; Kullanılabilir Stok Dengesi
              </h3>
              <p className="text-[11px] text-zinc-400">
                Fiziksel bakiye, WMS sipariş/sevkiyat rezervasyonu ve Üretim İş Emri blokeleri ayrı ayrı izlenir.
              </p>
            </div>
          </div>
          <Button
            size="sm"
            onClick={() => setIsNewResOpen(true)}
            className="h-9 px-4 text-xs bg-[#34D399] hover:bg-[#34D399]/90 text-[#061811] font-semibold rounded-full gap-1.5 cursor-pointer"
          >
            <Plus className="h-3.5 w-3.5" />
            <span>Stok Rezerve Et</span>
          </Button>
        </div>

        {/* Fiziksel / Rezerve / Kullanılabilir Özet Kartları */}
        {breakdown.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {breakdown.slice(0, 6).map((row) => (
              <div
                key={`${row.itemId}-${row.warehouseId}`}
                className="bg-white/[0.02] border border-white/[0.06] rounded-xl p-3 text-xs space-y-1.5"
              >
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-white truncate">{row.itemName}</span>
                  <span className="font-mono text-[10px] text-zinc-500">{row.sku}</span>
                </div>
                <div className="text-[11px] text-zinc-400 truncate">{row.warehouseName}</div>
                <div className="grid grid-cols-3 gap-1 pt-1 text-center font-mono text-[11px]">
                  <div className="bg-black/30 rounded-lg py-1">
                    <div className="text-[9px] text-zinc-500">FİZİKSEL</div>
                    <div className="text-white font-semibold">{row.onHandQty}</div>
                  </div>
                  <div className="bg-amber-500/10 rounded-lg py-1">
                    <div className="text-[9px] text-amber-300">AYRILMIŞ</div>
                    <div className="text-amber-200 font-semibold">{row.totalReservedQty}</div>
                  </div>
                  <div className="bg-emerald-500/10 rounded-lg py-1">
                    <div className="text-[9px] text-[#34D399]">MÜSAİT</div>
                    <div className="text-[#34D399] font-semibold">{row.availableQty}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        <div className="overflow-x-auto border border-white/[0.06] rounded-xl">
          <table className="w-full text-xs text-left border-collapse">
            <thead>
              <tr className="bg-white/[0.02] border-b border-white/[0.06] text-[11px] text-zinc-400 uppercase font-medium">
                <th className="py-3 px-4">Rezervasyon No</th>
                <th className="py-3 px-3">Kaynak</th>
                <th className="py-3 px-3">Ürün &amp; Depo</th>
                <th className="py-3 px-3">Lot</th>
                <th className="py-3 px-3 text-right">Rezerve</th>
                <th className="py-3 px-3 text-center">Durum</th>
                <th className="py-3 px-4 text-right">İşlem</th>
              </tr>
            </thead>
            <tbody>
              {reservations.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-zinc-500">
                    Kayıtlı WMS rezervasyonu bulunmuyor.
                  </td>
                </tr>
              ) : (
                reservations.map((r) => (
                  <tr key={r.id} className="border-b border-white/[0.04] hover:bg-white/[0.02]">
                    <td className="py-3 px-4 font-mono font-semibold text-white">{r.reservationNo}</td>
                    <td className="py-3 px-3">
                      <span className="font-mono text-zinc-300">{r.sourceType}</span>
                      <div className="text-[11px] text-zinc-500">{r.sourceRefNo}</div>
                    </td>
                    <td className="py-3 px-3">
                      <div className="text-white">{r.itemName}</div>
                      <div className="text-[11px] text-zinc-500">{r.warehouseName}</div>
                    </td>
                    <td className="py-3 px-3 font-mono text-zinc-400">{r.lotNumber || "-"}</td>
                    <td className="py-3 px-3 text-right font-mono font-bold text-[#34D399]">
                      {r.reservedQty} {r.baseUnit}
                    </td>
                    <td className="py-3 px-3 text-center">
                      <span className="rounded-full px-2.5 py-0.5 text-[11px] bg-white/[0.05] border border-white/[0.08] text-zinc-300">
                        {WMS_RESERVATION_STATUS_LABELS[r.status as WmsReservationStatus] || r.status}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right">
                      {(r.status === "ACTIVE" || r.status === "PARTIAL") && (
                        <Button
                          size="sm"
                          variant="outline"
                          disabled={submitting}
                          onClick={() => handleReleaseReservation(r.id)}
                          className="h-7 px-3 text-[11px] border-white/[0.08] bg-white/[0.04] hover:bg-rose-500/15 hover:text-rose-300 rounded-full gap-1 cursor-pointer"
                        >
                          <Unlock className="h-3 w-3" />
                          <span>Serbest Bırak</span>
                        </Button>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* 3. KALICI STOK DEFTERİ (LEDGER) */}
      <div className="bg-[#111513]/90 border border-white/[0.06] rounded-[20px] p-5 space-y-4">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <FileText className="h-4 w-4 text-[#34D399]" />
            <div>
              <h3 className="text-sm font-semibold text-white">
                Değişmez Stok Hareketleri Defteri (Stock Ledger · {ledgerTotal} kayıt)
              </h3>
              <p className="text-[11px] text-zinc-400">
                Her hareket kullanıcı, zaman damgası, cihaz/yöntem (Web, El Terminali, Çevrimdışı, RFID) ve belge referansı ile kaydedilir.
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <div className="relative">
              <Search className="h-3.5 w-3.5 text-zinc-500 absolute left-3 top-2.5" />
              <Input
                value={searchQuery}
                onChange={(e) => {
                  setLedgerPage(1)
                  setSearchQuery(e.target.value)
                }}
                placeholder="SKU, lot, raf veya belge ara..."
                className="h-8.5 pl-8 w-52 text-xs bg-white/[0.03] border-white/[0.08]"
              />
            </div>
            <select
              value={movementTypeFilter}
              onChange={(e) => {
                setLedgerPage(1)
                setMovementTypeFilter(e.target.value)
              }}
              className="h-8.5 text-xs bg-white/[0.03] border border-white/[0.08] text-white rounded-xl px-2.5"
            >
              <option value="ALL" className="bg-[#111513]">Tüm Hareketler</option>
              <option value="RECEIPT" className="bg-[#111513]">Mal Kabul (RECEIPT)</option>
              <option value="ISSUE" className="bg-[#111513]">Çıkış / Sevk (ISSUE)</option>
              <option value="TRANSFER_OUT" className="bg-[#111513]">Transfer Çıkış</option>
              <option value="TRANSFER_IN" className="bg-[#111513]">Transfer Giriş</option>
              <option value="COUNT_ADJUSTMENT" className="bg-[#111513]">Sayım Düzeltme</option>
              <option value="PRODUCTION_CONSUME" className="bg-[#111513]">Üretim/Kit Sarf</option>
              <option value="PRODUCTION_OUTPUT" className="bg-[#111513]">Üretim/Kit Çıktı</option>
            </select>
            <select
              value={methodFilter}
              onChange={(e) => {
                setLedgerPage(1)
                setMethodFilter(e.target.value)
              }}
              className="h-8.5 text-xs bg-white/[0.03] border border-white/[0.08] text-white rounded-xl px-2.5"
            >
              <option value="ALL" className="bg-[#111513]">Tüm Yöntemler</option>
              <option value="WEB" className="bg-[#111513]">Web Paneli</option>
              <option value="HANDHELD_CAMERA" className="bg-[#111513]">El Terminali (Kamera)</option>
              <option value="OFFLINE_SYNC" className="bg-[#111513]">Çevrimdışı Kuyruk</option>
              <option value="RFID" className="bg-[#111513]">RFID Portal</option>
            </select>
            <Button
              variant="outline"
              size="sm"
              onClick={loadData}
              className="h-8.5 px-3 text-xs border-white/[0.08] bg-white/[0.04] rounded-xl"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
            </Button>
          </div>
        </div>

        <div className="overflow-x-auto border border-white/[0.06] rounded-xl">
          <table className="w-full text-xs text-left border-collapse">
            <thead>
              <tr className="bg-white/[0.02] border-b border-white/[0.06] text-[11px] text-zinc-400 uppercase font-medium">
                <th className="py-3 px-4">Tarih</th>
                <th className="py-3 px-3">Tür &amp; Belge</th>
                <th className="py-3 px-3">Ürün / SKU</th>
                <th className="py-3 px-3">Depo · Raf · Lot</th>
                <th className="py-3 px-3 text-right">Miktar</th>
                <th className="py-3 px-3 text-right">Yürüyen Bakiye</th>
                <th className="py-3 px-4">Operatör &amp; Kanal</th>
              </tr>
            </thead>
            <tbody>
              {ledgerEntries.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-zinc-500">
                    Filtrelere uyan stok hareketi bulunamadı.
                  </td>
                </tr>
              ) : (
                ledgerEntries.map((m) => (
                  <tr key={m.id} className="border-b border-white/[0.04] hover:bg-white/[0.02]">
                    <td className="py-3 px-4 font-mono text-[11px] text-zinc-400 whitespace-nowrap">
                      {new Date(m.createdAt).toLocaleString("tr-TR")}
                    </td>
                    <td className="py-3 px-3">
                      <div className="font-mono font-semibold text-white">{m.movementType}</div>
                      <div className="text-[11px] text-zinc-500 font-mono">{m.referenceDocNo || "-"}</div>
                    </td>
                    <td className="py-3 px-3">
                      <div className="text-zinc-200 font-medium">{m.itemName}</div>
                      <div className="text-[11px] font-mono text-zinc-500">{m.sku}</div>
                    </td>
                    <td className="py-3 px-3 font-mono text-[11px] text-zinc-300">
                      <div>{m.warehouseName}</div>
                      <div className="text-zinc-500">
                        {m.fromBinCode || "-"} → {m.toBinCode || "-"} {m.lotNumber ? `· ${m.lotNumber}` : ""}
                      </div>
                    </td>
                    <td
                      className={`py-3 px-3 text-right font-mono font-bold ${
                        Number(m.quantity) >= 0 ? "text-[#34D399]" : "text-rose-400"
                      }`}
                    >
                      {Number(m.quantity) > 0 ? `+${m.quantity}` : m.quantity} {m.unit}
                    </td>
                    <td className="py-3 px-3 text-right font-mono text-zinc-300">
                      {m.balanceAfterQty !== null && m.balanceAfterQty !== undefined ? `${m.balanceAfterQty}` : "-"}
                    </td>
                    <td className="py-3 px-4 text-[11px] text-zinc-400">
                      <div className="text-zinc-200">{m.performedBy || "Sistem"}</div>
                      <div className="font-mono text-zinc-500">{m.method || "WEB"}</div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <div className="flex items-center justify-between text-xs text-zinc-400">
          <span>
            Sayfa {ledgerPage} / {ledgerTotalPages}
          </span>
          <div className="flex gap-1.5">
            <Button
              size="sm"
              variant="outline"
              disabled={ledgerPage <= 1}
              onClick={() => setLedgerPage((p) => Math.max(1, p - 1))}
              className="h-8 px-2.5 border-white/[0.08] bg-white/[0.04]"
            >
              <ChevronLeft className="h-3.5 w-3.5" />
            </Button>
            <Button
              size="sm"
              variant="outline"
              disabled={ledgerPage >= ledgerTotalPages}
              onClick={() => setLedgerPage((p) => Math.min(ledgerTotalPages, p + 1))}
              className="h-8 px-2.5 border-white/[0.08] bg-white/[0.04]"
            >
              <ChevronRight className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>
      </div>

      {/* Rezervasyon Modalı */}
      <Dialog open={isNewResOpen} onOpenChange={setIsNewResOpen}>
        <DialogContent className="sm:max-w-md backdrop-blur-xl bg-[#111513] border border-white/[0.08] rounded-2xl text-white">
          <DialogHeader>
            <DialogTitle className="text-base font-semibold">Yeni Stok Rezervasyonu</DialogTitle>
            <DialogDescription className="text-xs text-zinc-400">
              Sipariş, sevkiyat veya transfer için kullanılabilir stok ayırın.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleCreateReservation} className="space-y-3 text-xs">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs text-zinc-300">Depo</Label>
                <select value={resWhId} onChange={(e) => setResWhId(e.target.value)} className="w-full h-9 text-xs bg-white/[0.03] border border-white/[0.08] text-white rounded-xl px-2.5">
                  {warehouses.map((w) => (
                    <option key={w.id} value={w.id} className="bg-[#111513]">{w.name}</option>
                  ))}
                </select>
              </div>
              <div className="space-y-1">
                <Label className="text-xs text-zinc-300">Kaynak Türü</Label>
                <select value={resSourceType} onChange={(e) => setResSourceType(e.target.value)} className="w-full h-9 text-xs bg-white/[0.03] border border-white/[0.08] text-white rounded-xl px-2.5">
                  <option value="ORDER" className="bg-[#111513]">Satış Siparişi</option>
                  <option value="OMNICHANNEL" className="bg-[#111513]">E-Ticaret Siparişi</option>
                  <option value="SHIPMENT" className="bg-[#111513]">Sevkiyat Dalgası</option>
                  <option value="TRANSFER" className="bg-[#111513]">Depolar Arası Transfer</option>
                </select>
              </div>
            </div>
            <div className="grid grid-cols-3 gap-2">
              <div className="col-span-2 space-y-1">
                <Label className="text-xs text-zinc-300">Ürün</Label>
                <select value={resItemId} onChange={(e) => setResItemId(e.target.value)} className="w-full h-9 text-xs bg-white/[0.03] border border-white/[0.08] text-white rounded-xl px-2.5">
                  {items.map((it) => (
                    <option key={it.id} value={it.id} className="bg-[#111513]">{it.sku} — {it.name}</option>
                  ))}
                </select>
              </div>
              <div className="space-y-1">
                <Label className="text-xs text-zinc-300">Miktar</Label>
                <Input type="number" min="1" value={resQty} onChange={(e) => setResQty(e.target.value)} className="h-9 text-xs font-mono bg-white/[0.03] border-white/[0.08]" />
              </div>
            </div>
            <div className="space-y-1">
              <Label className="text-xs text-zinc-300">Referans Belge No</Label>
              <Input value={resSourceRef} onChange={(e) => setResSourceRef(e.target.value)} required className="h-9 text-xs font-mono bg-white/[0.03] border-white/[0.08]" />
            </div>
            <DialogFooter className="pt-2">
              <Button type="button" variant="outline" size="sm" onClick={() => setIsNewResOpen(false)} className="text-xs border-white/[0.08] bg-white/[0.04] rounded-full h-9 px-4">Vazgeç</Button>
              <Button type="submit" disabled={submitting} className="text-xs bg-[#34D399] text-[#061811] font-semibold rounded-full h-9 px-4 cursor-pointer">Rezerve Et</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
