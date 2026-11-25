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
import { safeText, safeNumber, safeCurrency, safeDate } from "@/lib/utils/safe-display"

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

  const activeSuppliers = (suppliers || []).filter((s) => s.approvalStatus === "ONAYLI" && s.isActive)
  const filteredPos = (purchaseOrders || []).filter(
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
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-[--line] bg-white/80 backdrop-blur-xl p-3.5 shadow-sm">
        <div className="flex flex-wrap items-center gap-2">
          <ClipboardCheck className="size-4 text-[--brand]" />
          <span className="text-sm font-semibold text-[--text]">
            Çok Kademeli Satın Alma Emirleri (PO) & Tedarikçi Yanıtları
          </span>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="h-8 rounded-xl border border-[--line] bg-white px-2.5 text-xs text-[--text] focus:border-[--brand] focus:ring-1 focus:ring-[--brand] focus:outline-none"
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
          className="inline-flex items-center gap-1.5 h-8 px-3.5 rounded-full bg-gradient-to-r from-[--brand] to-[--blue] hover:opacity-95 text-white text-xs font-semibold shadow-sm shadow-[--brand]/20 transition cursor-pointer"
        >
          <Plus className="size-3.5" />
          Yeni PO Oluştur
        </button>
      </div>

      {createOpen && (
        <form
          onSubmit={handleCreatePo}
          className="rounded-2xl border border-[--brand-line] bg-white p-4 grid grid-cols-1 sm:grid-cols-6 gap-3 text-xs items-end shadow-md"
        >
          <div className="sm:col-span-2">
            <label className="text-[--text-muted]">Onaylı Tedarikçi</label>
            <select
              value={form.supplierId}
              onChange={(e) => setForm((f) => ({ ...f, supplierId: e.target.value }))}
              className="mt-1 w-full h-9 px-3 rounded-xl border border-[--line] bg-white text-[--text] focus:border-[--brand] focus:ring-1 focus:ring-[--brand] focus:outline-none"
            >
              {activeSuppliers.map((s) => (
                <option key={s.id} value={s.id}>
                  {safeText(s.name)} ({safeText(s.code)})
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-[--text-muted]">Teslim Depo</label>
            <select
              value={form.warehouseId}
              onChange={(e) => setForm((f) => ({ ...f, warehouseId: e.target.value }))}
              className="mt-1 w-full h-9 px-3 rounded-xl border border-[--line] bg-white text-[--text] focus:border-[--brand] focus:ring-1 focus:ring-[--brand] focus:outline-none"
            >
              {warehouses.map((w) => (
                <option key={w.id} value={w.id}>
                  {safeText(w.name)}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-[--text-muted]">Ürün</label>
            <select
              value={form.itemId}
              onChange={(e) => setForm((f) => ({ ...f, itemId: e.target.value }))}
              className="mt-1 w-full h-9 px-3 rounded-xl border border-[--line] bg-white text-[--text] focus:border-[--brand] focus:ring-1 focus:ring-[--brand] focus:outline-none"
            >
              {items.map((it) => (
                <option key={it.id} value={it.id}>
                  {safeText(it.sku)} — {safeText(it.name)}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-[--text-muted]">Miktar / Birim (₺)</label>
            <div className="mt-1 flex gap-1.5">
              <input
                type="number"
                min={1}
                value={form.orderedQty}
                onChange={(e) => setForm((f) => ({ ...f, orderedQty: e.target.value }))}
                className="w-1/2 h-9 px-2 rounded-xl border border-[--line] bg-white text-[--text] font-bold focus:border-[--brand] focus:ring-1 focus:ring-[--brand] focus:outline-none"
              />
              <input
                type="number"
                step="0.01"
                placeholder="Oto ₺"
                value={form.agreedUnitPrice}
                onChange={(e) => setForm((f) => ({ ...f, agreedUnitPrice: e.target.value }))}
                className="w-1/2 h-9 px-2 rounded-xl border border-[--line] bg-white text-[--text] focus:border-[--brand] focus:ring-1 focus:ring-[--brand] focus:outline-none"
              />
            </div>
          </div>
          <button
            type="submit"
            className="h-9 px-4 rounded-full bg-gradient-to-r from-[--brand] to-[--blue] text-[var(--text)] font-semibold shadow-sm hover:opacity-95 transition cursor-pointer"
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
              className={`rounded-2xl border p-4 space-y-3 shadow-sm transition ${ isRedFlag ? "border-[--bad]/30 bg-[--bad-soft]/30" : "border-[--line] bg-white hover:border-[--brand-line]" }`}
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-mono text-sm font-bold text-[--brand]">{safeText(po.poNumber)}</span>
                    <span className="text-sm font-semibold text-[--text]">{safeText(po.supplierName)}</span>
                    <span
                      className={`px-2 py-0.5 rounded-full text-[11px] font-medium border ${ isRedFlag ? "bg-[--bad-soft] text-[--bad] border-[--bad]/25" : po.status === "TESLIM_ALINDI" || po.status === "TEDARIKCI_ONAYLADI" ? "bg-[--ok-soft] text-[--ok] border-[--ok]/25" : po.status === "ONAY_BEKLIYOR" ? "bg-[--warn-soft] text-[--warn] border-[--warn]/25" : "bg-[--brand-soft] text-[--brand] border-[--brand-line]" }`}
                    >
                      {PO_STATUS_LABELS[po.status] || safeText(po.status)}
                    </span>
                    <span className="text-[11px] text-[--text-muted]">
                      Kaynak: {safeText(po.sourceType)} · Depo: {safeText(po.warehouseName)}
                    </span>
                  </div>
                  <div className="text-[11px] text-[--text-muted] mt-1">
                    Beklenen Teslim:{" "}
                    <span className="text-[--text] font-mono">
                      {safeDate(po.expectedDeliveryDate)}
                    </span>{" "}
                    · Tedarikçi Yanıtı:{" "}
                    <span className="text-[--text]">
                      {SUPPLIER_RESPONSE_LABELS[po.supplierResponseStatus] || safeText(po.supplierResponseStatus)}
                    </span>
                    {po.dispatchedChannel ? ` · Kanal: ${po.dispatchedChannel}` : ""}
                  </div>
                  {po.redFlagReason && (
                    <div className="mt-1.5 inline-flex items-center gap-1.5 text-xs text-[--bad] bg-[--bad-soft] border border-[--bad]/25 px-2.5 py-1 rounded-lg">
                      <AlertTriangle className="size-3.5" />
                      <span>Kırmızı Bayrak: {safeText(po.redFlagReason)}</span>
                    </div>
                  )}
                </div>

                <div className="text-right">
                  <div className="text-base font-bold font-mono text-[--text] tabular-nums">
                    {safeCurrency(po.agreedTotalAmount)}
                  </div>
                  <div className="text-[11px] text-[--text-muted] font-mono tabular-nums">
                    {safeNumber(po.totalReceivedQty)}/{safeNumber(po.totalOrderedQty)} Teslim · {safeNumber(po.asnCount)} ASN
                  </div>
                </div>
              </div>

              {/* Çok Kademeli Onay Şeridi */}
              <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-[--line]">
                <div className="flex flex-wrap items-center gap-1.5 text-[11px]">
                  {(po.approvals || []).map((st: any) => (
                    <span
                      key={st.id}
                      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-lg border ${ st.status === "ONAYLANDI" ? "bg-[--ok-soft] text-[--ok] border-[--ok]/25" : st.status === "REDDEDILDI" ? "bg-[--bad-soft] text-[--bad] border-[--bad]/25" : po.currentApprovalStep === st.stepOrder ? "bg-[--warn-soft] text-[--warn] border-[--warn]/25 font-semibold" : "bg-[--muted-bg] text-[--text-muted] border-[--line]" }`}
                    >
                      <span>
                        Kademe {safeNumber(st.stepOrder)}: {safeText(st.approverRole)}
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
                        className="inline-flex items-center gap-1 h-7 px-3 rounded-full bg-gradient-to-r from-[--brand] to-[--blue] hover:opacity-95 text-white text-xs font-semibold disabled:opacity-50 transition cursor-pointer"
                      >
                        <CheckCircle2 className="size-3.5" />
                        Kademe {safeNumber(po.currentApprovalStep)}/{safeNumber(po.requiredApprovalSteps)} Onayla
                      </button>
                      <button
                        type="button"
                        disabled={busyId === po.id}
                        onClick={() => handleApproveStep(po.id, "REDDET")}
                        className="h-7 px-2.5 rounded-full border border-[--bad]/30 bg-[--bad-soft] text-[--bad] text-xs font-medium hover:bg-[--bad-soft]/80 transition cursor-pointer"
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
                      className="inline-flex items-center gap-1 h-7 px-2.5 rounded-full border border-[--line] bg-white text-[--text-2] text-xs font-medium hover:bg-[--muted-bg] transition cursor-pointer"
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
    <div className="rounded-2xl border border-[--line] bg-white/80 backdrop-blur-xl p-4 space-y-3 shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <div className="flex items-center gap-2 text-sm font-semibold text-[--text]">
            <Calculator className="size-4 text-[--brand]" />
            <span>EOQ (Ekonomik Sipariş Miktarı) & ROP Otomatik İkmal Motoru</span>
          </div>
          <p className="text-[11px] text-[--text-muted] mt-0.5">
            Net stok pozisyonu (Mevcut + Yoldaki PO) yeniden sipariş noktasının (ROP) altına düştüğünde EOQ formülüyle otomatik PO önerir.
          </p>
        </div>
        <button
          type="button"
          disabled={recalcBusy}
          onClick={handleRecalculate}
          className="inline-flex items-center gap-1.5 h-8 px-3 rounded-full border border-[--line] bg-white hover:bg-[--muted-bg] text-xs text-[--text-2] font-medium transition cursor-pointer"
        >
          <RefreshCw className={`size-3.5 ${recalcBusy ? "animate-spin" : ""}`} />
          EOQ / ROP Canlı Hesapla
        </button>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs border-collapse">
          <thead className="border-b border-[--line] bg-[--muted-bg]/50 text-[11px] uppercase tracking-wider text-[--text-muted] font-medium">
            <tr>
              <th className="py-2.5 pr-3 pl-3">Ürün / Depo</th>
              <th className="py-2.5 px-2">Tedarikçi</th>
              <th className="py-2.5 px-2 text-right">Net Pozisyon (Mevcut+PO)</th>
              <th className="py-2.5 px-2 text-right">Güvenlik / ROP</th>
              <th className="py-2.5 px-2 text-right">EOQ</th>
              <th className="py-2.5 px-2 text-right">Önerilen Sipariş</th>
              <th className="py-2.5 pl-3 pr-3 text-right">PO Dönüşüm</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[--line]">
            {(eoqPolicies || []).map((pol) => (
              <tr key={pol.id} className="hover:bg-[--brand-soft]/30 transition">
                <td className="py-2.5 pr-3 pl-3">
                  <div className="font-medium text-[--text]">{safeText(pol.itemName)}</div>
                  <div className="text-[11px] font-mono text-[--brand]">
                    {safeText(pol.sku)} · {safeText(pol.warehouseName)}
                  </div>
                </td>
                <td className="py-2.5 px-2 text-[--text-2]">{safeText(pol.supplierName)}</td>
                <td className="py-2.5 px-2 text-right font-mono tabular-nums">
                  <span className={pol.needsReorder ? "text-[--warn] font-semibold" : "text-[--text]"}>
                    {safeNumber(pol.netPosition)}
                  </span>{" "}
                  <span className="text-[10px] text-[--text-muted]">
                    ({safeNumber(pol.availableQty)}+{safeNumber(pol.onOrderQty)})
                  </span>
                </td>
                <td className="py-2.5 px-2 text-right font-mono tabular-nums text-[--text-2]">
                  {safeNumber(pol.safetyStock)} / <strong className="text-[--text]">{safeNumber(pol.rop)}</strong>
                </td>
                <td className="py-2.5 px-2 text-right font-mono tabular-nums text-[--brand] font-semibold">
                  {safeNumber(pol.eoq)}
                </td>
                <td className="py-2.5 px-2 text-right font-mono tabular-nums">
                  {pol.needsReorder ? (
                    <span className="px-2 py-0.5 rounded-full bg-[--warn-soft] text-[--warn] font-semibold border border-[--warn]/25">
                      {safeNumber(pol.suggestedOrderQty)} {safeText(pol.baseUnit)} ({safeCurrency(pol.estimatedOrderCostTry)})
                    </span>
                  ) : (
                    <span className="text-[--text-muted]">Yeterli</span>
                  )}
                </td>
                <td className="py-2.5 pl-3 pr-3 text-right">
                  <button
                    type="button"
                    disabled={convertingId === pol.id}
                    onClick={() => handleConvertPo(pol)}
                    data-testid={`eoq-convert-po-${pol.sku}`}
                    className={`inline-flex items-center gap-1 h-7 px-3 rounded-full text-[11px] font-semibold transition cursor-pointer ${ pol.needsReorder ? "bg-gradient-to-r from-[--brand] to-[--blue] text-white shadow-sm hover:opacity-95" : "border border-[--line] bg-white text-[--text-muted] hover:bg-[--muted-bg]" }`}
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
