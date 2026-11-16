"use client"

import React, { useState } from "react"
import {
  ClipboardCheck,
  CheckCircle2,
  ShieldAlert,
  AlertTriangle,
  Plus,
  Send,
  Calculator,
  RefreshCw,
  ShoppingCart,
} from "lucide-react"
import {
  PO_STATUS_LABELS,
  SUPPLIER_RESPONSE_LABELS,
} from "@/lib/logistics/procurement/constantsAndHelpers"

interface MultiTierPoTabProps {
  purchaseOrders: any[]
  suppliers: any[]
  items: any[]
  warehouses: any[]
  onRefresh: () => Promise<void>
  onNotify: (msg: string, isError?: boolean) => void
}

export function MultiTierPoTab({
  purchaseOrders,
  suppliers,
  items,
  warehouses,
  onRefresh,
  onNotify,
}: MultiTierPoTabProps) {
  const [statusFilter, setStatusFilter] = useState("ALL")
  const [createOpen, setCreateOpen] = useState(false)
  const [busyId, setBusyId] = useState<string | null>(null)
  const [form, setForm] = useState({
    supplierId: suppliers.find((s) => s.approvalStatus === "ONAYLI")?.id || suppliers[0]?.id || "",
    warehouseId: warehouses[0]?.id || "wh-merkez-01",
    itemId: items[0]?.id || "",
    orderedQty: "120",
    agreedUnitPrice: "",
    priority: "NORMAL",
    notes: "",
  })

  const activeSuppliers = suppliers.filter((s) => s.approvalStatus === "ONAYLI" && s.isActive)
  const filteredPos = purchaseOrders.filter(
    (p) => statusFilter === "ALL" || p.status === statusFilter
  )

  const handleCreatePo = async (e: React.FormEvent) => {
    e.preventDefault()
    const item = items.find((i) => i.id === form.itemId)
    const price = form.agreedUnitPrice ? Number(form.agreedUnitPrice) : Number(item?.standardCost || 50)
    const res = await fetch("/api/procurement", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "create_po",
        supplierId: form.supplierId,
        warehouseId: form.warehouseId,
        priority: form.priority,
        notes: form.notes,
        lines: [
          {
            itemId: form.itemId,
            orderedQty: Number(form.orderedQty),
            agreedUnitPrice: price,
          },
        ],
      }),
    })
    const data = await res.json()
    if (!res.ok || !data.success) {
      onNotify(data.error || "Satın alma emri oluşturulamadı.", true)
      return
    }
    onNotify(data.message)
    setCreateOpen(false)
    await onRefresh()
  }

  const handleApproveStep = async (poId: string, decision: "ONAYLA" | "REDDET") => {
    setBusyId(poId)
    try {
      const res = await fetch("/api/procurement", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "process_po_approval",
          poId,
          decision,
          autoDispatchOnFinal: true,
          dispatchChannel: "PORTAL",
        }),
      })
      const data = await res.json()
      if (!res.ok || !data.success) {
        onNotify(data.error || "Onay adımı işlenemedi.", true)
        return
      }
      onNotify(data.message)
      await onRefresh()
    } finally {
      setBusyId(null)
    }
  }

  const handleDispatch = async (poId: string, channel: "PORTAL" | "EMAIL" | "EDI") => {
    setBusyId(poId)
    try {
      const res = await fetch("/api/procurement", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "dispatch_po", poId, channel }),
      })
      const data = await res.json()
      if (!res.ok || !data.success) {
        onNotify(data.error || "PO tedarikçiye iletilemedi.", true)
        return
      }
      onNotify(data.message)
      await onRefresh()
    } finally {
      setBusyId(null)
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-white/[0.07] bg-[#121614]/85 p-3.5">
        <div className="flex flex-wrap items-center gap-2">
          <ClipboardCheck className="size-4 text-[#34D399]" />
          <span className="text-sm font-semibold text-white">
            Çok Kademeli Satın Alma Emirleri (PO) & Tedarikçi Yanıtları
          </span>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="h-8 rounded-xl border border-white/10 bg-[#0A0D0C] px-2.5 text-xs text-zinc-200"
          >
            <option value="ALL">Tüm Durumlar ({purchaseOrders.length})</option>
            <option value="ONAY_BEKLIYOR">Onay Bekliyor</option>
            <option value="TEDARIKCIYE_ILETILDI">Tedarikçiye İletildi</option>
            <option value="TEDARIKCI_ONAYLADI">Tedarikçi Onayladı</option>
            <option value="RED_BAYRAK">Kırmızı Bayrak Uyarısı</option>
            <option value="TESLIM_ALINDI">Teslim Alındı</option>
          </select>
        </div>

        <button
          type="button"
          onClick={() => setCreateOpen((v) => !v)}
          data-testid="new-po-btn"
          className="inline-flex items-center gap-1.5 h-8 px-3.5 rounded-xl bg-[#34D399] text-[#061811] text-xs font-semibold"
        >
          <Plus className="size-3.5" />
          Yeni PO Oluştur
        </button>
      </div>

      {createOpen && (
        <form
          onSubmit={handleCreatePo}
          className="rounded-2xl border border-emerald-500/25 bg-[#121614] p-4 grid grid-cols-1 sm:grid-cols-6 gap-3 text-xs items-end"
        >
          <div className="sm:col-span-2">
            <label className="text-zinc-400">Onaylı Tedarikçi</label>
            <select
              value={form.supplierId}
              onChange={(e) => setForm((f) => ({ ...f, supplierId: e.target.value }))}
              className="mt-1 w-full h-9 px-3 rounded-xl border border-white/10 bg-[#0A0D0C] text-white"
            >
              {activeSuppliers.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name} ({s.code})
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-zinc-400">Teslim Depo</label>
            <select
              value={form.warehouseId}
              onChange={(e) => setForm((f) => ({ ...f, warehouseId: e.target.value }))}
              className="mt-1 w-full h-9 px-3 rounded-xl border border-white/10 bg-[#0A0D0C] text-white"
            >
              {warehouses.map((w) => (
                <option key={w.id} value={w.id}>
                  {w.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-zinc-400">Ürün</label>
            <select
              value={form.itemId}
              onChange={(e) => setForm((f) => ({ ...f, itemId: e.target.value }))}
              className="mt-1 w-full h-9 px-3 rounded-xl border border-white/10 bg-[#0A0D0C] text-white"
            >
              {items.map((it) => (
                <option key={it.id} value={it.id}>
                  {it.sku} — {it.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-zinc-400">Miktar / Birim (₺)</label>
            <div className="mt-1 flex gap-1.5">
              <input
                type="number"
                min={1}
                value={form.orderedQty}
                onChange={(e) => setForm((f) => ({ ...f, orderedQty: e.target.value }))}
                className="w-1/2 h-9 px-2 rounded-xl border border-white/10 bg-[#0A0D0C] text-white"
              />
              <input
                type="number"
                step="0.01"
                placeholder="Oto ₺"
                value={form.agreedUnitPrice}
                onChange={(e) => setForm((f) => ({ ...f, agreedUnitPrice: e.target.value }))}
                className="w-1/2 h-9 px-2 rounded-xl border border-white/10 bg-[#0A0D0C] text-white"
              />
            </div>
          </div>
          <button
            type="submit"
            className="h-9 px-4 rounded-xl bg-[#34D399] text-[#061811] font-semibold"
          >
            PO Onaya Gönder
          </button>
        </form>
      )}

      <div className="space-y-3">
        {filteredPos.map((po) => {
          const isRedFlag = po.status === "RED_BAYRAK"
          return (
            <div
              key={po.id}
              data-testid={`po-card-${po.poNumber}`}
              className={`rounded-2xl border p-4 space-y-3 ${
                isRedFlag
                  ? "border-rose-500/40 bg-rose-500/[0.05]"
                  : "border-white/[0.07] bg-[#121614]/85"
              }`}
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-mono text-sm font-bold text-[#34D399]">{po.poNumber}</span>
                    <span className="text-sm font-semibold text-white">{po.supplierName}</span>
                    <span
                      className={`px-2 py-0.5 rounded-full text-[11px] font-medium border ${
                        isRedFlag
                          ? "bg-rose-500/15 text-rose-300 border-rose-500/30"
                          : po.status === "TESLIM_ALINDI" || po.status === "TEDARIKCI_ONAYLADI"
                            ? "bg-emerald-500/15 text-[#34D399] border-emerald-500/30"
                            : po.status === "ONAY_BEKLIYOR"
                              ? "bg-amber-500/15 text-amber-300 border-amber-500/30"
                              : "bg-sky-500/15 text-sky-300 border-sky-500/30"
                      }`}
                    >
                      {PO_STATUS_LABELS[po.status] || po.status}
                    </span>
                    <span className="text-[11px] text-zinc-400">
                      Kaynak: {po.sourceType} · Depo: {po.warehouseName}
                    </span>
                  </div>
                  <div className="text-[11px] text-zinc-400 mt-1">
                    Beklenen Teslim:{" "}
                    <span className="text-zinc-200 font-mono">
                      {new Date(po.expectedDeliveryDate).toLocaleDateString("tr-TR")}
                    </span>{" "}
                    · Tedarikçi Yanıtı:{" "}
                    <span className="text-zinc-200">
                      {SUPPLIER_RESPONSE_LABELS[po.supplierResponseStatus] || po.supplierResponseStatus}
                    </span>
                    {po.dispatchedChannel ? ` · Kanal: ${po.dispatchedChannel}` : ""}
                  </div>
                  {po.redFlagReason && (
                    <div className="mt-1.5 inline-flex items-center gap-1.5 text-xs text-rose-300 bg-rose-500/10 border border-rose-500/25 px-2.5 py-1 rounded-lg">
                      <AlertTriangle className="size-3.5" />
                      <span>Kırmızı Bayrak: {po.redFlagReason}</span>
                    </div>
                  )}
                </div>

                <div className="text-right">
                  <div className="text-base font-bold font-mono text-white">
                    ₺{Number(po.agreedTotalAmount || 0).toLocaleString("tr-TR")}
                  </div>
                  <div className="text-[11px] text-zinc-400 font-mono">
                    {po.totalReceivedQty}/{po.totalOrderedQty} Teslim · {po.asnCount} ASN
                  </div>
                </div>
              </div>

              {/* Çok Kademeli Onay Şeridi */}
              <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-white/[0.06]">
                <div className="flex flex-wrap items-center gap-1.5 text-[11px]">
                  {(po.approvals || []).map((st: any) => (
                    <span
                      key={st.id}
                      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-lg border ${
                        st.status === "ONAYLANDI"
                          ? "bg-emerald-500/10 text-[#34D399] border-emerald-500/25"
                          : st.status === "REDDEDILDI"
                            ? "bg-rose-500/10 text-rose-300 border-rose-500/25"
                            : po.currentApprovalStep === st.stepOrder
                              ? "bg-amber-500/10 text-amber-300 border-amber-500/30"
                              : "bg-white/[0.03] text-zinc-500 border-white/[0.06]"
                      }`}
                    >
                      <span>
                        Kademe {st.stepOrder}: {st.approverRole}
                      </span>
                      {st.approvedBy ? ` (${st.approvedBy})` : ""}
                    </span>
                  ))}
                </div>

                <div className="flex flex-wrap items-center gap-1.5">
                  {po.status === "ONAY_BEKLIYOR" && (
                    <>
                      <button
                        type="button"
                        disabled={busyId === po.id}
                        onClick={() => handleApproveStep(po.id, "ONAYLA")}
                        data-testid={`approve-po-${po.poNumber}`}
                        className="inline-flex items-center gap-1 h-7 px-3 rounded-lg bg-[#34D399] hover:bg-[#34D399]/90 text-[#061811] text-xs font-semibold disabled:opacity-50"
                      >
                        <CheckCircle2 className="size-3.5" />
                        Kademe {po.currentApprovalStep}/{po.requiredApprovalSteps} Onayla
                      </button>
                      <button
                        type="button"
                        disabled={busyId === po.id}
                        onClick={() => handleApproveStep(po.id, "REDDET")}
                        className="h-7 px-2.5 rounded-lg border border-rose-500/30 bg-rose-500/10 text-rose-300 text-xs"
                      >
                        Reddet
                      </button>
                    </>
                  )}
                  {po.status === "TEDARIKCIYE_ILETILDI" && (
                    <button
                      type="button"
                      disabled={busyId === po.id}
                      onClick={() => handleDispatch(po.id, "EDI")}
                      className="inline-flex items-center gap-1 h-7 px-2.5 rounded-lg border border-white/15 bg-white/[0.04] text-zinc-200 text-xs"
                    >
                      <Send className="size-3" />
                      EDI / Tekrar İlet
                    </button>
                  )}
                </div>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

export function EoqSuggestionsPanel({
  eoqPolicies,
  onRefresh,
  onNotify,
}: {
  eoqPolicies: any[]
  onRefresh: () => Promise<void>
  onNotify: (msg: string, isError?: boolean) => void
}) {
  const [recalcBusy, setRecalcBusy] = useState(false)
  const [convertingId, setConvertingId] = useState<string | null>(null)

  const handleRecalculate = async () => {
    setRecalcBusy(true)
    try {
      const res = await fetch("/api/procurement", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "recalculate_eoq_policies" }),
      })
      const data = await res.json()
      if (!res.ok || !data.success) {
        onNotify(data.error || "EOQ hesaplaması başarısız.", true)
        return
      }
      onNotify(data.message)
      await onRefresh()
    } finally {
      setRecalcBusy(false)
    }
  }

  const handleConvertPo = async (policy: any) => {
    setConvertingId(policy.id)
    try {
      const res = await fetch("/api/procurement", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "convert_eoq_to_po",
          policyId: policy.id,
          overrideQty: policy.suggestedOrderQty > 0 ? policy.suggestedOrderQty : policy.eoq,
        }),
      })
      const data = await res.json()
      if (!res.ok || !data.success) {
        onNotify(data.error || "EOQ önerisi PO'ya dönüştürülemedi.", true)
        return
      }
      onNotify(data.message)
      await onRefresh()
    } finally {
      setConvertingId(null)
    }
  }

  return (
    <div className="rounded-2xl border border-white/[0.07] bg-[#121614]/85 p-4 space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <div className="flex items-center gap-2 text-sm font-semibold text-white">
            <Calculator className="size-4 text-[#34D399]" />
            <span>EOQ (Ekonomik Sipariş Miktarı) & ROP Otomatik İkmal Motoru</span>
          </div>
          <p className="text-[11px] text-zinc-400 mt-0.5">
            Net stok pozisyonu (Mevcut + Yoldaki PO) yeniden sipariş noktasının (ROP) altına düştüğünde EOQ formülüyle otomatik PO önerir.
          </p>
        </div>
        <button
          type="button"
          disabled={recalcBusy}
          onClick={handleRecalculate}
          className="inline-flex items-center gap-1.5 h-8 px-3 rounded-xl border border-white/10 bg-white/[0.05] hover:bg-white/[0.08] text-xs text-zinc-200"
        >
          <RefreshCw className={`size-3.5 ${recalcBusy ? "animate-spin" : ""}`} />
          EOQ / ROP Canlı Hesapla
        </button>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs">
          <thead className="border-b border-white/[0.06] text-[11px] uppercase text-zinc-400">
            <tr>
              <th className="py-2.5 pr-3">Ürün / Depo</th>
              <th className="py-2.5 px-2">Tedarikçi</th>
              <th className="py-2.5 px-2 text-right">Net Pozisyon (Mevcut+PO)</th>
              <th className="py-2.5 px-2 text-right">Güvenlik / ROP</th>
              <th className="py-2.5 px-2 text-right">EOQ</th>
              <th className="py-2.5 px-2 text-right">Önerilen Sipariş</th>
              <th className="py-2.5 pl-3 text-right">PO Dönüşüm</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/[0.04]">
            {eoqPolicies.map((pol) => (
              <tr key={pol.id} className="hover:bg-white/[0.02]">
                <td className="py-2.5 pr-3">
                  <div className="font-medium text-zinc-100">{pol.itemName}</div>
                  <div className="text-[11px] font-mono text-zinc-500">
                    {pol.sku} · {pol.warehouseName}
                  </div>
                </td>
                <td className="py-2.5 px-2 text-zinc-300">{pol.supplierName}</td>
                <td className="py-2.5 px-2 text-right font-mono">
                  <span className={pol.needsReorder ? "text-amber-300 font-semibold" : "text-zinc-200"}>
                    {pol.netPosition}
                  </span>{" "}
                  <span className="text-[10px] text-zinc-500">
                    ({pol.availableQty}+{pol.onOrderQty})
                  </span>
                </td>
                <td className="py-2.5 px-2 text-right font-mono text-zinc-300">
                  {pol.safetyStock} / <strong className="text-white">{pol.rop}</strong>
                </td>
                <td className="py-2.5 px-2 text-right font-mono text-[#34D399] font-semibold">
                  {pol.eoq}
                </td>
                <td className="py-2.5 px-2 text-right font-mono">
                  {pol.needsReorder ? (
                    <span className="px-2 py-0.5 rounded bg-amber-500/15 text-amber-300 font-semibold">
                      {pol.suggestedOrderQty} {pol.baseUnit} (₺
                      {Number(pol.estimatedOrderCostTry).toLocaleString("tr-TR")})
                    </span>
                  ) : (
                    <span className="text-zinc-500">Yeterli</span>
                  )}
                </td>
                <td className="py-2.5 pl-3 text-right">
                  <button
                    type="button"
                    disabled={convertingId === pol.id}
                    onClick={() => handleConvertPo(pol)}
                    data-testid={`eoq-convert-po-${pol.sku}`}
                    className={`inline-flex items-center gap-1 h-7 px-2.5 rounded-lg text-[11px] font-semibold ${
                      pol.needsReorder
                        ? "bg-[#34D399] text-[#061811]"
                        : "border border-white/10 bg-white/[0.04] text-zinc-300"
                    }`}
                  >
                    <ShoppingCart className="size-3" />
                    {convertingId === pol.id ? "Açılıyor..." : "EOQ'dan PO Aç"}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
