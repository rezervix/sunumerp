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
import { safeText, safeNumber, safeCurrency, safeDate } from "@/lib/utils/safe-display"

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

  const activeApprovedSuppliers = (suppliers || []).filter(
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
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-[--line] bg-white/80 backdrop-blur-xl p-3.5 shadow-sm">
        <div className="flex items-center gap-2 text-sm font-semibold text-[--text]">
          <Scale className="size-4 text-[--brand]" />
          <span>RFQ İhaleleri & Yan Yana Teklif Karşılaştırma Matrisi</span>
        </div>
        <button
          type="button"
          onClick={() => setCreateOpen((v) => !v)}
          data-testid="new-rfq-btn"
          className="inline-flex items-center gap-1.5 h-8 px-3.5 rounded-full bg-gradient-to-r from-[--brand] to-[--blue] hover:opacity-95 text-white text-xs font-semibold shadow-sm shadow-[--brand]/20 transition cursor-pointer"
        >
          <Plus className="size-3.5" />
          Yeni RFQ Aç
        </button>
      </div>

      {createOpen && (
        <form
          onSubmit={handleCreateRfq}
          className="rounded-2xl border border-[--brand-line] bg-white p-4 space-y-3 text-xs shadow-md"
        >
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
            <input
              required
              placeholder="RFQ Başlığı (Örn: Ekvador Gülü Sezon İhalesi)"
              value={rfqTitle}
              onChange={(e) => setRfqTitle(e.target.value)}
              className="sm:col-span-2 h-9 px-3 rounded-xl border border-[--line] bg-white text-[--text] placeholder:text-[--text-muted] focus:border-[--brand] focus:ring-1 focus:ring-[--brand] focus:outline-none"
            />
            <select
              value={rfqWarehouseId}
              onChange={(e) => setRfqWarehouseId(e.target.value)}
              className="h-9 px-3 rounded-xl border border-[--line] bg-white text-[--text] focus:border-[--brand] focus:ring-1 focus:ring-[--brand] focus:outline-none"
            >
              {warehouses.map((w) => (
                <option key={w.id} value={w.id}>
                  {safeText(w.name)}
                </option>
              ))}
            </select>
            <input
              type="date"
              value={rfqDueDate}
              onChange={(e) => setRfqDueDate(e.target.value)}
              className="h-9 px-3 rounded-xl border border-[--line] bg-white text-[--text] focus:border-[--brand] focus:ring-1 focus:ring-[--brand] focus:outline-none"
            />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <select
              value={rfqItemId}
              onChange={(e) => setRfqItemId(e.target.value)}
              className="h-9 px-3 rounded-xl border border-[--line] bg-white text-[--text] focus:border-[--brand] focus:ring-1 focus:ring-[--brand] focus:outline-none"
            >
              {items.map((it) => (
                <option key={it.id} value={it.id}>
                  {safeText(it.sku)} — {safeText(it.name)}
                </option>
              ))}
            </select>
            <input
              type="number"
              min={1}
              value={rfqQty}
              onChange={(e) => setRfqQty(e.target.value)}
              placeholder="Talep Miktarı"
              className="h-9 px-3 rounded-xl border border-[--line] bg-white text-[--text] font-bold focus:border-[--brand] focus:ring-1 focus:ring-[--brand] focus:outline-none"
            />
            <button
              type="submit"
              className="h-9 px-4 rounded-full bg-gradient-to-r from-[--brand] to-[--blue] text-[var(--text)] font-semibold shadow-sm hover:opacity-95 transition cursor-pointer"
            >
              Teklife Açık RFQ Oluştur
            </button>
          </div>
          <div className="flex flex-wrap gap-2 items-center pt-1">
            <span className="text-[--text-muted]">Davet Edilen Tedarikçiler:</span>
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
                  className={`px-2.5 py-1 rounded-full border text-[11px] font-medium transition cursor-pointer ${ checked ? "bg-[--brand-soft] text-[--brand] border-[--brand-line]" : "border-[--line] text-[--text-muted] hover:bg-[--muted-bg]" }`}
                >
                  {safeText(sup.name)}
                </button>
              )
            })}
          </div>
        </form>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        {/* Sol Liste: RFQ Listesi */}
        <div className="lg:col-span-4 space-y-2">
          {(rfqs || []).map((r) => {
            const active = selectedRfqId === r.id
            return (
              <div
                key={r.id}
                onClick={() => setSelectedRfqId(r.id)}
                className={`cursor-pointer rounded-2xl border p-3.5 transition-colors shadow-sm ${ active ? "border-[--brand-line] bg-[--brand-soft]/60" : "border-[--line] bg-white hover:border-[--brand-line]" }`}
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="font-mono text-xs font-bold text-[--brand]">{safeText(r.rfqNumber)}</span>
                  <span
                    className={`px-2 py-0.5 rounded-full text-[10px] font-semibold border ${ r.status === "SONUCLANDI" ? "bg-[--ok-soft] text-[--ok] border-[--ok]/25" : r.status === "DEGERLENDIRMEDE" ? "bg-[--warn-soft] text-[--warn] border-[--warn]/25" : "bg-[--brand-soft] text-[--brand] border-[--brand-line]" }`}
                  >
                    {safeText(r.status)}
                  </span>
                </div>
                <div className="font-semibold text-[--text] text-xs mt-1">{safeText(r.title)}</div>
                <div className="flex items-center justify-between text-[11px] text-[--text-muted] mt-2">
                  <span>
                    {safeNumber(r.itemCount)} Kalem · {safeNumber(r.quoteCount)} Teklif
                  </span>
                  {r.convertedPoNo ? (
                    <span className="text-[--ok] font-mono font-semibold">PO: {safeText(r.convertedPoNo)}</span>
                  ) : (
                    <span>Son: {safeDate(r.dueDate)}</span>
                  )}
                </div>
              </div>
            )
          })}
        </div>

        {/* Sağ Panel: Karşılaştırma Matrisi */}
        <div className="lg:col-span-8 rounded-2xl border border-[--line] bg-white/80 backdrop-blur-xl p-4 space-y-4 shadow-sm">
          {!matrix?.rfq ? (
            <div className="py-12 text-center text-xs text-[--text-muted]">
              {loadingMatrix ? "Teklif matrisi yükleniyor..." : "Karşılaştırmak için soldan bir RFQ seçin."}
            </div>
          ) : (
            <>
              <div className="flex flex-wrap items-start justify-between gap-3 border-b border-[--line] pb-3">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs font-bold text-[--brand]">
                      {safeText(matrix.rfq.rfqNumber)}
                    </span>
                    <span className="text-sm font-semibold text-[--text]">{safeText(matrix.rfq.title)}</span>
                  </div>
                  <div className="text-[11px] text-[--text-muted] mt-1">
                    Kalem bazlı en ucuz fiyat, toplam sahip olma maliyeti (TCO) ve termin süresi otomatik kıyaslanır.
                  </div>
                </div>
                {matrix.rfq.status !== "SONUCLANDI" && (
                  <button
                    type="button"
                    onClick={() => openQuoteModal(matrix.rfq)}
                    className="inline-flex items-center gap-1.5 h-8 px-3 rounded-full border border-[--line] bg-white hover:bg-[--muted-bg] text-xs text-[--text-2] font-medium transition cursor-pointer"
                  >
                    <Send className="size-3.5 text-[--brand]" />
                    Tedarikçi Teklifi Gir
                  </button>
                )}
              </div>

              {(matrix.quotes || []).length === 0 ? (
                <div className="py-8 text-center text-xs text-[--text-muted]">
                  Henüz teklif verilmemiş. Üstten ERP üzerinden teklif girebilir veya Tedarikçi Portalından teklif bekleyebilirsiniz.
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="border-b border-[--line] bg-[--muted-bg]/50 text-[11px] text-[--text-muted]">
                        <th className="py-2.5 pr-3 pl-3">Kalem / Kriter</th>
                        {matrix.quotes.map((q: any) => {
                          const isCheapest = matrix.highlights?.cheapestQuoteId === q.id
                          const isFastest = matrix.highlights?.fastestQuoteId === q.id
                          const isRecommended = matrix.highlights?.recommendedQuoteId === q.id
                          return (
                            <th key={q.id} className="py-2.5 px-3 min-w-[180px] align-top">
                              <div className="text-[--text] font-semibold">{safeText(q.supplierName)}</div>
                              <div className="text-[10px] font-mono text-[--text-muted]">
                                {safeText(q.quoteNumber)} · Skor {safeNumber(q.supplierScore)} ({safeText(q.supplierTier)})
                              </div>
                              <div className="flex flex-wrap gap-1 mt-1.5">
                                {isRecommended && (
                                  <span className="px-1.5 py-0.5 rounded-full bg-[--ok-soft] text-[--ok] border border-[--ok]/25 text-[10px] font-semibold">
                                    Önerilen ({safeNumber(q.compositeEvaluationScore)})
                                  </span>
                                )}
                                {isCheapest && (
                                  <span className="px-1.5 py-0.5 rounded-full bg-[--brand-soft] text-[--brand] border border-[--brand-line] text-[10px] font-medium">
                                    En Ucuz TCO
                                  </span>
                                )}
                                {isFastest && (
                                  <span className="px-1.5 py-0.5 rounded-full bg-[--warn-soft] text-[--warn] border border-[--warn]/25 text-[10px] font-medium">
                                    En Hızlı
                                  </span>
                                )}
                              </div>
                            </th>
                          )
                        })}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[--line]">
                      {(matrix.itemMatrix || []).map((row: any) => (
                        <tr key={row.id} className="hover:bg-[--brand-soft]/20 transition">
                          <td className="py-3 pr-3 pl-3">
                            <div className="font-medium text-[--text]">{safeText(row.itemName)}</div>
                            <div className="text-[11px] font-mono text-[--text-muted]">
                              {safeText(row.sku)} · Talep: {safeNumber(row.requestedQty)} {safeText(row.unit)}
                            </div>
                          </td>
                          {(matrix.quotes || []).map((q: any) => {
                            const cell = row.offersByQuoteId?.[q.id]
                            return (
                              <td key={q.id} className="py-3 px-3 font-mono tabular-nums">
                                {cell ? (
                                  <div>
                                    <span
                                      className={`font-semibold ${ cell.isBestPrice ? "text-[--ok]" : "text-[--text]" }`}
                                    >
                                      {safeCurrency(cell.unitPrice)}
                                    </span>
                                    <span className="text-[10px] text-[--text-muted]"> / {safeText(row.unit)}</span>
                                    <div className="text-[11px] text-[--text-muted]">
                                      Toplam: {safeCurrency(cell.lineTotal)}
                                    </div>
                                  </div>
                                ) : (
                                  <span className="text-[--text-muted]">Teklif Yok</span>
                                )}
                              </td>
                            )
                          })}
                        </tr>
                      ))}

                      <tr className="bg-[--muted-bg]/40 font-mono">
                        <td className="py-2.5 pr-3 pl-3 text-[--text-muted]">Teslim Süresi / Vade</td>
                        {(matrix.quotes || []).map((q: any) => (
                          <td key={q.id} className="py-2.5 px-3 text-[--text-2]">
                            <div>{safeNumber(q.leadTimeDays)} Gün</div>
                            <div className="text-[11px] text-[--text-muted]">{safeText(q.paymentTerms)}</div>
                          </td>
                        ))}
                      </tr>

                      <tr className="bg-[--brand-soft]/30 font-mono">
                        <td className="py-3 pr-3 pl-3 font-semibold text-[--text]">Nakliye Dahil TCO</td>
                        {(matrix.quotes || []).map((q: any) => (
                          <td key={q.id} className="py-3 px-3">
                            <div className="text-sm font-bold text-[--text] tabular-nums">
                              {safeCurrency(q.tcoTotal)}
                            </div>
                            <div className="text-[10px] text-[--text-muted]">
                              (Mal: {safeCurrency(q.totalQuotedAmount)} + Nakliye: {safeCurrency(q.shippingCost)})
                            </div>
                          </td>
                        ))}
                      </tr>

                      <tr>
                        <td className="py-3 pr-3 pl-3 font-semibold text-[--text-2]">İhale Kararı</td>
                        {(matrix.quotes || []).map((q: any) => (
                          <td key={q.id} className="py-3 px-3">
                            {q.status === "KAZANDI" ? (
                              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-[--ok-soft] text-[--ok] border border-[--ok]/25 font-semibold">
                                <CheckCircle2 className="size-3.5" />
                                Kazanan (PO: {safeText(matrix.rfq.convertedPoNo)})
                              </span>
                            ) : matrix.rfq.status === "SONUCLANDI" ? (
                              <span className="text-[--text-muted]">{safeText(q.status)}</span>
                            ) : (
                              <button
                                type="button"
                                onClick={() => handleAwardQuote(matrix.rfq.id, q.id)}
                                data-testid={`award-quote-${q.quoteNumber}`}
                                className="inline-flex items-center gap-1.5 h-8 px-3 rounded-full bg-gradient-to-r from-[--brand] to-[--blue] hover:opacity-95 text-[var(--text)] font-semibold shadow-sm transition cursor-pointer"
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
        <div className="fixed inset-0 z-50 bg-[--navy]/40 backdrop-blur-sm flex items-center justify-center p-4">
          <form
            onSubmit={handleSubmitQuote}
            className="w-full max-w-lg rounded-2xl border border-[--line] bg-white p-5 space-y-4 text-xs shadow-xl text-[--text]"
          >
            <div className="flex justify-between items-center border-b border-[--line] pb-2.5">
              <span className="font-semibold text-[--text] text-sm">
                Teklif Kaydet ({safeText(quoteModalRfq.rfqNumber)})
              </span>
              <button type="button" onClick={() => setQuoteModalRfq(null)} className="text-[--text-muted] hover:text-[--text]">
                Kapat
              </button>
            </div>
            <div className="grid grid-cols-3 gap-2">
              <div className="col-span-3">
                <label className="text-[--text-muted]">Teklif Veren Tedarikçi</label>
                <select
                  value={quoteSupId}
                  onChange={(e) => setQuoteSupId(e.target.value)}
                  className="mt-1 w-full h-9 px-3 rounded-xl border border-[--line] bg-white text-[--text] focus:border-[--brand] focus:ring-1 focus:ring-[--brand] focus:outline-none"
                >
                  {activeApprovedSuppliers.map((s) => (
                    <option key={s.id} value={s.id}>
                      {safeText(s.name)} ({safeText(s.code)})
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-[--text-muted]">Termin (Gün)</label>
                <input
                  type="number"
                  min={1}
                  value={quoteLead}
                  onChange={(e) => setQuoteLead(e.target.value)}
                  className="mt-1 w-full h-9 px-3 rounded-xl border border-[--line] bg-white text-[--text] focus:border-[--brand] focus:ring-1 focus:ring-[--brand] focus:outline-none"
                />
              </div>
              <div className="col-span-2">
                <label className="text-[--text-muted]">Nakliye / Gümrük Maliyeti (₺)</label>
                <input
                  type="number"
                  min={0}
                  value={quoteShipping}
                  onChange={(e) => setQuoteShipping(e.target.value)}
                  className="mt-1 w-full h-9 px-3 rounded-xl border border-[--line] bg-white text-[--text] focus:border-[--brand] focus:ring-1 focus:ring-[--brand] focus:outline-none"
                />
              </div>
            </div>
            <div className="space-y-2 max-h-52 overflow-y-auto">
              {(quoteModalRfq.items || []).map((it: any) => (
                <div
                  key={it.id}
                  className="flex items-center justify-between gap-3 rounded-xl border border-[--line] bg-[--muted-bg]/40 p-2.5"
                >
                  <div>
                    <div className="font-medium text-[--text]">{safeText(it.itemName)}</div>
                    <div className="text-[11px] text-[--text-muted]">
                      Talep: {safeNumber(it.requestedQty)} {safeText(it.unit)}
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
                    className="w-28 h-8 px-2.5 rounded-lg border border-[--line] bg-white text-right font-mono text-[--text] focus:border-[--brand] focus:ring-1 focus:ring-[--brand] focus:outline-none"
                  />
                </div>
              ))}
            </div>
            <div className="flex justify-end gap-2 pt-2 border-t border-[--line]">
              <button
                type="submit"
                className="h-9 px-5 rounded-full bg-gradient-to-r from-[--brand] to-[--blue] hover:opacity-95 text-[var(--text)] font-semibold shadow-sm transition cursor-pointer"
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
