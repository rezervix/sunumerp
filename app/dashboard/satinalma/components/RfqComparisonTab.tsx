"use client"

import React, { useEffect, useState } from "react"
import {
  Scale,
  Plus,
  CheckCircle2,
  Clock,
  Sparkles,
  FileText,
  Send,
} from "lucide-react"

interface RfqComparisonTabProps {
  rfqs: any[]
  suppliers: any[]
  items: any[]
  warehouses: any[]
  onRefresh: () => Promise<void>
  onNotify: (msg: string, isError?: boolean) => void
}

export default function RfqComparisonTab({
  rfqs,
  suppliers,
  items,
  warehouses,
  onRefresh,
  onNotify,
}: RfqComparisonTabProps) {
  const [selectedRfqId, setSelectedRfqId] = useState<string>(rfqs[0]?.id || "")
  const [matrix, setMatrix] = useState<any | null>(null)
  const [loadingMatrix, setLoadingMatrix] = useState(false)

  // Yeni RFQ Oluşturma
  const [createOpen, setCreateOpen] = useState(false)
  const [rfqTitle, setRfqTitle] = useState("")
  const [rfqWarehouseId, setRfqWarehouseId] = useState(warehouses[0]?.id || "wh-merkez-01")
  const [rfqDueDate, setRfqDueDate] = useState(
    new Date(Date.now() + 5 * 86_400_000).toISOString().slice(0, 10)
  )
  const [invitedIds, setInvitedIds] = useState<string[]>([])
  const [rfqItemId, setRfqItemId] = useState(items[0]?.id || "")
  const [rfqQty, setRfqQty] = useState("250")

  // ERP İçinden Teklif Girme Formu
  const [quoteModalRfq, setQuoteModalRfq] = useState<any | null>(null)
  const [quoteSupId, setQuoteSupId] = useState("")
  const [quoteLead, setQuoteLead] = useState("3")
  const [quoteShipping, setQuoteShipping] = useState("750")
  const [quotePrices, setQuotePrices] = useState<Record<string, string>>({})

  const loadMatrix = async (id: string) => {
    if (!id) {
      setMatrix(null)
      return
    }
    setLoadingMatrix(true)
    try {
      const res = await fetch(`/api/procurement?section=rfq_compare&rfqId=${encodeURIComponent(id)}`)
      const data = await res.json()
      if (res.ok && data.success) {
        setMatrix(data)
      }
    } finally {
      setLoadingMatrix(false)
    }
  }

  useEffect(() => {
    if (!selectedRfqId && rfqs[0]?.id) {
      setSelectedRfqId(rfqs[0].id)
    }
  }, [rfqs, selectedRfqId])

  useEffect(() => {
    if (selectedRfqId) {
      loadMatrix(selectedRfqId)
    }
  }, [selectedRfqId])

  const activeApprovedSuppliers = suppliers.filter(
    (s) => s.approvalStatus === "ONAYLI" && s.isActive
  )

  const handleCreateRfq = async (e: React.FormEvent) => {
    e.preventDefault()
    const res = await fetch("/api/procurement", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "create_rfq",
        title: rfqTitle || "Haftalık Taze Çiçek & Sarf İhalesi",
        warehouseId: rfqWarehouseId,
        dueDate: rfqDueDate,
        invitedSuppliers: invitedIds,
        items: [{ itemId: rfqItemId, requestedQty: Number(rfqQty) }],
      }),
    })
    const data = await res.json()
    if (!res.ok || !data.success) {
      onNotify(data.error || "RFQ açılamadı.", true)
      return
    }
    onNotify(data.message)
    setCreateOpen(false)
    setRfqTitle("")
    await onRefresh()
    if (data.rfq?.id) setSelectedRfqId(data.rfq.id)
  }

  const openQuoteModal = (rfq: any) => {
    setQuoteModalRfq(rfq)
    const firstSup = activeApprovedSuppliers[0]?.id || ""
    setQuoteSupId(firstSup)
    const initial: Record<string, string> = {}
    for (const it of rfq.items || []) {
      initial[it.id] = String(it.targetUnitPrice || 45)
    }
    setQuotePrices(initial)
  }

  const handleSubmitQuote = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!quoteModalRfq) return
    const lines = (quoteModalRfq.items || []).map((it: any) => ({
      rfqItemId: it.id,
      unitPrice: Number(quotePrices[it.id] || 40),
      offeredQty: Number(it.requestedQty),
    }))
    const res = await fetch("/api/procurement", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "submit_rfq_quote",
        rfqId: quoteModalRfq.id,
        supplierId: quoteSupId,
        leadTimeDays: Number(quoteLead),
        shippingCost: Number(quoteShipping),
        lines,
      }),
    })
    const data = await res.json()
    if (!res.ok || !data.success) {
      onNotify(data.error || "Teklif kaydedilemedi.", true)
      return
    }
    onNotify(data.message)
    setQuoteModalRfq(null)
    await onRefresh()
    await loadMatrix(quoteModalRfq.id)
  }

  const handleAwardQuote = async (rfqId: string, quoteId: string) => {
    const res = await fetch("/api/procurement", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "award_rfq", rfqId, quoteId }),
    })
    const data = await res.json()
    if (!res.ok || !data.success) {
      onNotify(data.error || "Kazanan seçilemedi.", true)
      return
    }
    onNotify(data.message)
    await onRefresh()
    await loadMatrix(rfqId)
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-white/[0.07] bg-[#121614]/85 p-3.5">
        <div className="flex items-center gap-2 text-sm font-semibold text-white">
          <Scale className="size-4 text-[#34D399]" />
          <span>RFQ İhaleleri & Yan Yana Teklif Karşılaştırma Matrisi</span>
        </div>
        <button
          type="button"
          onClick={() => setCreateOpen((v) => !v)}
          data-testid="new-rfq-btn"
          className="inline-flex items-center gap-1.5 h-8 px-3.5 rounded-xl bg-[#34D399] text-[#061811] text-xs font-semibold"
        >
          <Plus className="size-3.5" />
          Yeni RFQ Aç
        </button>
      </div>

      {createOpen && (
        <form
          onSubmit={handleCreateRfq}
          className="rounded-2xl border border-emerald-500/25 bg-[#121614] p-4 space-y-3 text-xs"
        >
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
            <input
              required
              placeholder="RFQ Başlığı (Örn: Ekvador Gülü Sezon İhalesi)"
              value={rfqTitle}
              onChange={(e) => setRfqTitle(e.target.value)}
              className="sm:col-span-2 h-9 px-3 rounded-xl border border-white/10 bg-[#0A0D0C] text-white"
            />
            <select
              value={rfqWarehouseId}
              onChange={(e) => setRfqWarehouseId(e.target.value)}
              className="h-9 px-3 rounded-xl border border-white/10 bg-[#0A0D0C] text-white"
            >
              {warehouses.map((w) => (
                <option key={w.id} value={w.id}>
                  {w.name}
                </option>
              ))}
            </select>
            <input
              type="date"
              value={rfqDueDate}
              onChange={(e) => setRfqDueDate(e.target.value)}
              className="h-9 px-3 rounded-xl border border-white/10 bg-[#0A0D0C] text-white"
            />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <select
              value={rfqItemId}
              onChange={(e) => setRfqItemId(e.target.value)}
              className="h-9 px-3 rounded-xl border border-white/10 bg-[#0A0D0C] text-white"
            >
              {items.map((it) => (
                <option key={it.id} value={it.id}>
                  {it.sku} — {it.name}
                </option>
              ))}
            </select>
            <input
              type="number"
              min={1}
              value={rfqQty}
              onChange={(e) => setRfqQty(e.target.value)}
              placeholder="Talep Miktarı"
              className="h-9 px-3 rounded-xl border border-white/10 bg-[#0A0D0C] text-white"
            />
            <button
              type="submit"
              className="h-9 px-4 rounded-xl bg-[#34D399] text-[#061811] font-semibold"
            >
              Teklife Açık RFQ Oluştur
            </button>
          </div>
          <div className="flex flex-wrap gap-2 items-center pt-1">
            <span className="text-zinc-400">Davet Edilen Tedarikçiler:</span>
            {activeApprovedSuppliers.map((sup) => {
              const checked = invitedIds.includes(sup.id)
              return (
                <button
                  key={sup.id}
                  type="button"
                  onClick={() =>
                    setInvitedIds((prev) =>
                      checked ? prev.filter((id) => id !== sup.id) : [...prev, sup.id]
                    )
                  }
                  className={`px-2.5 py-1 rounded-lg border text-[11px] ${
                    checked
                      ? "bg-[#34D399]/15 text-[#34D399] border-[#34D399]/35"
                      : "border-white/10 text-zinc-400"
                  }`}
                >
                  {sup.name}
                </button>
              )
            })}
          </div>
        </form>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        {/* Sol Liste: RFQ Listesi */}
        <div className="lg:col-span-4 space-y-2">
          {rfqs.map((r) => {
            const active = selectedRfqId === r.id
            return (
              <div
                key={r.id}
                onClick={() => setSelectedRfqId(r.id)}
                className={`cursor-pointer rounded-2xl border p-3.5 transition-colors ${
                  active
                    ? "border-[#34D399]/40 bg-[#34D399]/[0.06]"
                    : "border-white/[0.07] bg-[#121614]/80 hover:border-white/15"
                }`}
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="font-mono text-xs font-bold text-[#34D399]">{r.rfqNumber}</span>
                  <span
                    className={`px-2 py-0.5 rounded-full text-[10px] font-semibold border ${
                      r.status === "SONUCLANDI"
                        ? "bg-emerald-500/15 text-[#34D399] border-emerald-500/30"
                        : r.status === "DEGERLENDIRMEDE"
                          ? "bg-amber-500/15 text-amber-300 border-amber-500/30"
                          : "bg-sky-500/15 text-sky-300 border-sky-500/30"
                    }`}
                  >
                    {r.status}
                  </span>
                </div>
                <div className="font-semibold text-zinc-100 text-xs mt-1">{r.title}</div>
                <div className="flex items-center justify-between text-[11px] text-zinc-400 mt-2">
                  <span>
                    {r.itemCount} Kalem · {r.quoteCount} Teklif
                  </span>
                  {r.convertedPoNo ? (
                    <span className="text-[#34D399] font-mono">PO: {r.convertedPoNo}</span>
                  ) : (
                    <span>Son: {new Date(r.dueDate).toLocaleDateString("tr-TR")}</span>
                  )}
                </div>
              </div>
            )
          })}
        </div>

        {/* Sağ Panel: Karşılaştırma Matrisi */}
        <div className="lg:col-span-8 rounded-2xl border border-white/[0.07] bg-[#121614]/85 p-4 space-y-4">
          {!matrix?.rfq ? (
            <div className="py-12 text-center text-xs text-zinc-500">
              {loadingMatrix ? "Teklif matrisi yükleniyor..." : "Karşılaştırmak için soldan bir RFQ seçin."}
            </div>
          ) : (
            <>
              <div className="flex flex-wrap items-start justify-between gap-3 border-b border-white/[0.06] pb-3">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs font-bold text-[#34D399]">
                      {matrix.rfq.rfqNumber}
                    </span>
                    <span className="text-sm font-semibold text-white">{matrix.rfq.title}</span>
                  </div>
                  <div className="text-[11px] text-zinc-400 mt-1">
                    Kalem bazlı en ucuz fiyat, toplam sahip olma maliyeti (TCO) ve termin süresi otomatik kıyaslanır.
                  </div>
                </div>
                {matrix.rfq.status !== "SONUCLANDI" && (
                  <button
                    type="button"
                    onClick={() => openQuoteModal(matrix.rfq)}
                    className="inline-flex items-center gap-1.5 h-8 px-3 rounded-xl border border-white/15 bg-white/[0.05] hover:bg-white/[0.1] text-xs text-white"
                  >
                    <Send className="size-3.5 text-[#34D399]" />
                    Tedarikçi Teklifi Gir
                  </button>
                )}
              </div>

              {matrix.quotes.length === 0 ? (
                <div className="py-8 text-center text-xs text-zinc-400">
                  Henüz teklif verilmemiş. Üstten ERP üzerinden teklif girebilir veya Tedarikçi Portalından teklif bekleyebilirsiniz.
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="border-b border-white/[0.08] text-[11px] text-zinc-400">
                        <th className="py-2.5 pr-3">Kalem / Kriter</th>
                        {matrix.quotes.map((q: any) => {
                          const isCheapest = matrix.highlights?.cheapestQuoteId === q.id
                          const isFastest = matrix.highlights?.fastestQuoteId === q.id
                          const isRecommended = matrix.highlights?.recommendedQuoteId === q.id
                          return (
                            <th key={q.id} className="py-2.5 px-3 min-w-[180px] align-top">
                              <div className="text-white font-semibold">{q.supplierName}</div>
                              <div className="text-[10px] font-mono text-zinc-400">
                                {q.quoteNumber} · Skor {q.supplierScore} ({q.supplierTier})
                              </div>
                              <div className="flex flex-wrap gap-1 mt-1.5">
                                {isRecommended && (
                                  <span className="px-1.5 py-0.5 rounded bg-[#34D399]/20 text-[#34D399] text-[10px] font-semibold">
                                    Önerilen ({q.compositeEvaluationScore})
                                  </span>
                                )}
                                {isCheapest && (
                                  <span className="px-1.5 py-0.5 rounded bg-sky-500/20 text-sky-300 text-[10px]">
                                    En Ucuz TCO
                                  </span>
                                )}
                                {isFastest && (
                                  <span className="px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300 text-[10px]">
                                    En Hızlı
                                  </span>
                                )}
                              </div>
                            </th>
                          )
                        })}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/[0.04]">
                      {matrix.itemMatrix.map((row: any) => (
                        <tr key={row.id}>
                          <td className="py-3 pr-3">
                            <div className="font-medium text-zinc-200">{row.itemName}</div>
                            <div className="text-[11px] font-mono text-zinc-500">
                              {row.sku} · Talep: {row.requestedQty} {row.unit}
                            </div>
                          </td>
                          {matrix.quotes.map((q: any) => {
                            const cell = row.offersByQuoteId?.[q.id]
                            return (
                              <td key={q.id} className="py-3 px-3 font-mono">
                                {cell ? (
                                  <div>
                                    <span
                                      className={`font-semibold ${
                                        cell.isBestPrice ? "text-[#34D399]" : "text-zinc-100"
                                      }`}
                                    >
                                      ₺{Number(cell.unitPrice).toLocaleString("tr-TR")}
                                    </span>
                                    <span className="text-[10px] text-zinc-500"> / {row.unit}</span>
                                    <div className="text-[11px] text-zinc-400">
                                      Toplam: ₺{Number(cell.lineTotal).toLocaleString("tr-TR")}
                                    </div>
                                  </div>
                                ) : (
                                  <span className="text-zinc-600">Teklif Yok</span>
                                )}
                              </td>
                            )
                          })}
                        </tr>
                      ))}

                      <tr className="bg-white/[0.02] font-mono">
                        <td className="py-2.5 pr-3 text-zinc-400">Teslim Süresi / Vade</td>
                        {matrix.quotes.map((q: any) => (
                          <td key={q.id} className="py-2.5 px-3 text-zinc-200">
                            <div>{q.leadTimeDays} Gün</div>
                            <div className="text-[11px] text-zinc-400">{q.paymentTerms}</div>
                          </td>
                        ))}
                      </tr>

                      <tr className="bg-white/[0.03] font-mono">
                        <td className="py-3 pr-3 font-semibold text-white">Nakliye Dahil TCO</td>
                        {matrix.quotes.map((q: any) => (
                          <td key={q.id} className="py-3 px-3">
                            <div className="text-sm font-bold text-white">
                              ₺{Number(q.tcoTotal).toLocaleString("tr-TR")}
                            </div>
                            <div className="text-[10px] text-zinc-400">
                              (Mal: ₺{Number(q.totalQuotedAmount).toLocaleString("tr-TR")} + Nakliye: ₺
                              {Number(q.shippingCost).toLocaleString("tr-TR")})
                            </div>
                          </td>
                        ))}
                      </tr>

                      <tr>
                        <td className="py-3 pr-3 font-semibold text-zinc-300">İhale Kararı</td>
                        {matrix.quotes.map((q: any) => (
                          <td key={q.id} className="py-3 px-3">
                            {q.status === "KAZANDI" ? (
                              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-[#34D399]/20 text-[#34D399] font-semibold">
                                <CheckCircle2 className="size-3.5" />
                                Kazanan (PO: {matrix.rfq.convertedPoNo})
                              </span>
                            ) : matrix.rfq.status === "SONUCLANDI" ? (
                              <span className="text-zinc-500">{q.status}</span>
                            ) : (
                              <button
                                type="button"
                                onClick={() => handleAwardQuote(matrix.rfq.id, q.id)}
                                data-testid={`award-quote-${q.quoteNumber}`}
                                className="inline-flex items-center gap-1.5 h-8 px-3 rounded-xl bg-[#34D399] hover:bg-[#34D399]/90 text-[#061811] font-semibold"
                              >
                                <Sparkles className="size-3.5" />
                                Kazanan Seç → PO Aç
                              </button>
                            )}
                          </td>
                        ))}
                      </tr>
                    </tbody>
                  </table>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* TEKLİF GİRİŞ MODALI */}
      {quoteModalRfq && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
          <form
            onSubmit={handleSubmitQuote}
            className="w-full max-w-lg rounded-2xl border border-white/10 bg-[#101412] p-5 space-y-4 text-xs"
          >
            <div className="flex justify-between items-center border-b border-white/10 pb-2.5">
              <span className="font-semibold text-white text-sm">
                Teklif Kaydet ({quoteModalRfq.rfqNumber})
              </span>
              <button type="button" onClick={() => setQuoteModalRfq(null)} className="text-zinc-400">
                Kapat
              </button>
            </div>
            <div className="grid grid-cols-3 gap-2">
              <div className="col-span-3">
                <label className="text-zinc-400">Teklif Veren Tedarikçi</label>
                <select
                  value={quoteSupId}
                  onChange={(e) => setQuoteSupId(e.target.value)}
                  className="mt-1 w-full h-9 px-3 rounded-xl border border-white/10 bg-[#0A0D0C] text-white"
                >
                  {activeApprovedSuppliers.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name} ({s.code})
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-zinc-400">Termin (Gün)</label>
                <input
                  type="number"
                  min={1}
                  value={quoteLead}
                  onChange={(e) => setQuoteLead(e.target.value)}
                  className="mt-1 w-full h-9 px-3 rounded-xl border border-white/10 bg-[#0A0D0C] text-white"
                />
              </div>
              <div className="col-span-2">
                <label className="text-zinc-400">Nakliye / Gümrük Maliyeti (₺)</label>
                <input
                  type="number"
                  min={0}
                  value={quoteShipping}
                  onChange={(e) => setQuoteShipping(e.target.value)}
                  className="mt-1 w-full h-9 px-3 rounded-xl border border-white/10 bg-[#0A0D0C] text-white"
                />
              </div>
            </div>
            <div className="space-y-2 max-h-52 overflow-y-auto">
              {(quoteModalRfq.items || []).map((it: any) => (
                <div
                  key={it.id}
                  className="flex items-center justify-between gap-3 rounded-xl border border-white/10 bg-white/[0.02] p-2.5"
                >
                  <div>
                    <div className="font-medium text-zinc-200">{it.itemName}</div>
                    <div className="text-[11px] text-zinc-500">
                      Talep: {it.requestedQty} {it.unit}
                    </div>
                  </div>
                  <input
                    type="number"
                    step="0.01"
                    min="0.01"
                    value={quotePrices[it.id] || ""}
                    onChange={(e) =>
                      setQuotePrices((prev) => ({ ...prev, [it.id]: e.target.value }))
                    }
                    className="w-28 h-8 px-2.5 rounded-lg border border-white/10 bg-[#0A0D0C] text-right font-mono text-white"
                  />
                </div>
              ))}
            </div>
            <div className="flex justify-end gap-2">
              <button
                type="submit"
                className="h-9 px-4 rounded-xl bg-[#34D399] text-[#061811] font-semibold"
              >
                Teklifi Kaydet
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  )
}
