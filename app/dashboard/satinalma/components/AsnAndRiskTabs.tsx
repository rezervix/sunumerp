"use client"

import React, { useState } from "react"
import {
  Truck,
  PackageCheck,
  ShieldAlert,
  AlertTriangle,
  Webhook,
  Plus,
  CheckCircle2,
  ArrowRight,
} from "lucide-react"

export function AsnTrackingTab({
  asns,
  purchaseOrders,
  suppliers,
  onRefresh,
  onNotify,
}: {
  asns: any[]
  purchaseOrders: any[]
  suppliers: any[]
  onRefresh: () => Promise<void>
  onNotify: (msg: string, isError?: boolean) => void
}) {
  const [busyId, setBusyId] = useState<string | null>(null)
  const [ediOpen, setEdiOpen] = useState(false)

  const openPos = purchaseOrders.filter((p) =>
    ["TEDARIKCIYE_ILETILDI", "TEDARIKCI_ONAYLADI", "KISMI_ONAY", "KISMI_TESLIM"].includes(p.status)
  )
  const [ediForm, setEdiForm] = useState({
    poNumber: openPos[0]?.poNumber || purchaseOrders[0]?.poNumber || "",
    waybillNo: `IRS-EDI-${new Date().toISOString().slice(2, 10).replace(/-/g, "")}`,
    carrierName: "Frigo Ekspres Soğuk Zincir",
    vehiclePlate: "34 FRG 412",
  })

  const handleIngestEdi = async (e: React.FormEvent) => {
    e.preventDefault()
    const po = purchaseOrders.find((p) => p.poNumber === ediForm.poNumber)
    if (!po) {
      onNotify("EDI eşleştirmesi için geçerli bir PO seçiniz.", true)
      return
    }
    const sup = suppliers.find((s) => s.id === po.supplierId)
    const desadv = {
      externalRef: `DESADV-${Date.now()}`,
      supplierCode: sup?.code,
      supplierGln: sup?.glnNumber || undefined,
      poNumber: po.poNumber,
      waybillNo: ediForm.waybillNo,
      expectedArrivalAt: new Date(Date.now() + 86_400_000).toISOString(),
      carrierName: ediForm.carrierName,
      vehiclePlate: ediForm.vehiclePlate,
      lines: (po.lines || []).map((l: any) => ({
        sku: l.sku,
        shippedQty: Math.max(1, Number(l.orderedQty) - Number(l.receivedQty || 0)),
        lotNumber: `LOT-${l.sku.slice(0, 4)}-EDI`,
        ssccCode: `00869EDI${String(Date.now()).slice(-7)}01`,
      })),
    }

    const res = await fetch("/api/procurement", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "ingest_edi_asn", desadv }),
    })
    const data = await res.json()
    if (!res.ok || !data.success) {
      onNotify(data.error || "EDI DESADV mesajı işlenemedi.", true)
      return
    }
    onNotify(data.message)
    setEdiOpen(false)
    await onRefresh()
  }

  const handleAdvanceStatus = async (asnId: string, newStatus: string) => {
    setBusyId(asnId)
    try {
      const res = await fetch("/api/procurement", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "advance_asn_status", asnId, newStatus }),
      })
      const data = await res.json()
      if (!res.ok || !data.success) {
        onNotify(data.error || "ASN durumu güncellenemedi.", true)
        return
      }
      onNotify(data.message)
      await onRefresh()
    } finally {
      setBusyId(null)
    }
  }

  const handleReceiveToWms = async (asnId: string) => {
    setBusyId(asnId)
    try {
      const res = await fetch("/api/procurement", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "receive_asn_to_wms", asnId }),
      })
      const data = await res.json()
      if (!res.ok || !data.success) {
        onNotify(data.error || "WMS mal kabul işlemi başarısız.", true)
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
        <div className="flex items-center gap-2 text-sm font-semibold text-white">
          <Truck className="size-4 text-[#34D399]" />
          <span>ASN Ön Sevkiyat İhbarları & WMS Mal Kabul Entegrasyonu</span>
        </div>
        <button
          type="button"
          onClick={() => setEdiOpen((v) => !v)}
          className="inline-flex items-center gap-1.5 h-8 px-3.5 rounded-xl border border-[#34D399]/35 bg-[#34D399]/10 text-[#34D399] text-xs font-semibold"
        >
          <Webhook className="size-3.5" />
          EDI DESADV Al / İçe Aktar
        </button>
      </div>

      {ediOpen && (
        <form
          onSubmit={handleIngestEdi}
          className="rounded-2xl border border-emerald-500/25 bg-[#121614] p-4 grid grid-cols-1 sm:grid-cols-5 gap-3 text-xs items-end"
        >
          <div className="sm:col-span-2">
            <label className="text-zinc-400">Eşleşecek PO</label>
            <select
              value={ediForm.poNumber}
              onChange={(e) => setEdiForm((f) => ({ ...f, poNumber: e.target.value }))}
              className="mt-1 w-full h-9 px-3 rounded-xl border border-white/10 bg-[#0A0D0C] text-white"
            >
              {purchaseOrders.map((p) => (
                <option key={p.id} value={p.poNumber}>
                  {p.poNumber} — {p.supplierName}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-zinc-400">İrsaliye No</label>
            <input
              value={ediForm.waybillNo}
              onChange={(e) => setEdiForm((f) => ({ ...f, waybillNo: e.target.value }))}
              className="mt-1 w-full h-9 px-3 rounded-xl border border-white/10 bg-[#0A0D0C] text-white"
            />
          </div>
          <div>
            <label className="text-zinc-400">Araç Plaka</label>
            <input
              value={ediForm.vehiclePlate}
              onChange={(e) => setEdiForm((f) => ({ ...f, vehiclePlate: e.target.value }))}
              className="mt-1 w-full h-9 px-3 rounded-xl border border-white/10 bg-[#0A0D0C] text-white"
            />
          </div>
          <button
            type="submit"
            className="h-9 px-4 rounded-xl bg-[#34D399] text-[#061811] font-semibold"
          >
            EDI DESADV İşle
          </button>
        </form>
      )}

      <div className="overflow-x-auto rounded-2xl border border-white/[0.07] bg-[#121614]/80">
        <table className="w-full text-left text-xs">
          <thead className="border-b border-white/[0.06] text-[11px] uppercase text-zinc-400">
            <tr>
              <th className="py-3 px-4">ASN / PO</th>
              <th className="py-3 px-3">Tedarikçi & Kanal</th>
              <th className="py-3 px-3">Taşıyıcı / Plaka</th>
              <th className="py-3 px-3 text-right">Sevk / Kabul</th>
              <th className="py-3 px-3">Durum</th>
              <th className="py-3 px-4 text-right">WMS Mal Kabul Köprüsü</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/[0.04]">
            {asns.map((a) => (
              <tr key={a.id} className="hover:bg-white/[0.02]">
                <td className="py-3 px-4">
                  <div className="font-mono font-bold text-[#34D399]">{a.asnNumber}</div>
                  <div className="text-[11px] font-mono text-zinc-400">PO: {a.poNumber}</div>
                </td>
                <td className="py-3 px-3">
                  <div className="text-zinc-100 font-medium">{a.supplierName}</div>
                  <div className="text-[11px] text-zinc-500">
                    Kanal: {a.sourceChannel} · Depo: {a.warehouseName}
                  </div>
                </td>
                <td className="py-3 px-3">
                  <div className="text-zinc-200">{a.carrierName || "-"}</div>
                  <div className="text-[11px] font-mono text-zinc-500">
                    {a.vehiclePlate || "-"} · İrsaliye: {a.waybillNo || "-"}
                  </div>
                </td>
                <td className="py-3 px-3 text-right font-mono">
                  <span className="text-zinc-100">{a.totalShippedQty}</span>
                  <span className="text-zinc-500"> / {a.totalReceivedQty} Adet</span>
                </td>
                <td className="py-3 px-3">
                  <span
                    className={`px-2 py-0.5 rounded-full text-[11px] font-medium border ${
                      a.status === "KABUL_TAMAM"
                        ? "bg-emerald-500/15 text-[#34D399] border-emerald-500/30"
                        : a.status === "KAPI_GIRIS"
                          ? "bg-sky-500/15 text-sky-300 border-sky-500/30"
                          : "bg-amber-500/15 text-amber-300 border-amber-500/30"
                    }`}
                  >
                    {a.status}
                  </span>
                </td>
                <td className="py-3 px-4 text-right">
                  {a.status === "KABUL_TAMAM" ? (
                    <span className="text-[11px] font-mono text-[#34D399]">
                      WMS Görevi: {a.wmsTaskNo || "Tamam"}
                    </span>
                  ) : (
                    <div className="inline-flex items-center gap-1.5">
                      {a.status === "ON_IHBAR" && (
                        <button
                          type="button"
                          disabled={busyId === a.id}
                          onClick={() => handleAdvanceStatus(a.id, "KAPI_GIRIS")}
                          className="h-7 px-2.5 rounded-lg border border-white/10 bg-white/[0.04] text-zinc-200 text-[11px]"
                        >
                          Kapı Girişi
                        </button>
                      )}
                      <button
                        type="button"
                        disabled={busyId === a.id}
                        onClick={() => handleReceiveToWms(a.id)}
                        data-testid={`receive-asn-${a.asnNumber}`}
                        className="inline-flex items-center gap-1 h-7 px-3 rounded-lg bg-[#34D399] hover:bg-[#34D399]/90 text-[#061811] text-[11px] font-semibold"
                      >
                        <PackageCheck className="size-3.5" />
                        {busyId === a.id ? "İşleniyor..." : "WMS Mal Kabule Al"}
                      </button>
                    </div>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

export function SingleSourceRiskTab({
  singleSourceRisk,
  onRefresh,
  onNotify,
}: {
  singleSourceRisk: any
  onRefresh: () => Promise<void>
  onNotify: (msg: string, isError?: boolean) => void
}) {
  const [linkingKey, setLinkingKey] = useState<string | null>(null)

  const handleLinkAlternative = async (item: any, candidate: any) => {
    const key = `${item.itemId}::${candidate.supplierId}`
    setLinkingKey(key)
    try {
      const res = await fetch("/api/procurement", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "upsert_supplier_item_link",
          supplierId: candidate.supplierId,
          itemId: item.itemId,
          unitCost: candidate.suggestedUnitCost || 50,
          leadTimeDays: candidate.leadTimeDays || 4,
          moq: 25,
          isPrimary: item.approvedSupplierCount === 0,
        }),
      })
      const data = await res.json()
      if (!res.ok || !data.success) {
        onNotify(data.error || "Alternatif tedarikçi bağlanamadı.", true)
        return
      }
      onNotify(`${candidate.name}, ${item.itemName} için alternatif tedarikçi olarak bağlandı.`)
      await onRefresh()
    } finally {
      setLinkingKey(null)
    }
  }

  const riskItems = singleSourceRisk?.riskItems || []

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
        <div className="rounded-2xl border border-white/[0.07] bg-[#121614]/85 p-3.5">
          <div className="text-[11px] text-zinc-400">Çoklu Kaynak Güvencesi (≥2 Tedarikçi)</div>
          <div className="text-xl font-bold text-[#34D399] mt-1">
            {singleSourceRisk?.multiSourceSafeCount ?? 0} SKU
          </div>
        </div>
        <div className="rounded-2xl border border-amber-500/25 bg-amber-500/[0.06] p-3.5">
          <div className="text-[11px] text-amber-200">Tek Kaynak Riski Altındaki SKU</div>
          <div className="text-xl font-bold text-amber-300 mt-1">
            {singleSourceRisk?.singleSourceRiskCount ?? 0} SKU
          </div>
        </div>
        <div className="rounded-2xl border border-rose-500/25 bg-rose-500/[0.06] p-3.5">
          <div className="text-[11px] text-rose-200">Onaylı Tedarikçisiz / Engelli SKU</div>
          <div className="text-xl font-bold text-rose-300 mt-1">
            {singleSourceRisk?.noApprovedSupplierCount ?? 0} SKU
          </div>
        </div>
        <div className="rounded-2xl border border-white/[0.07] bg-[#121614]/85 p-3.5">
          <div className="text-[11px] text-zinc-400">Aktif Kalem Toplamı</div>
          <div className="text-xl font-bold text-white mt-1">
            {singleSourceRisk?.totalActiveItems ?? 0} SKU
          </div>
        </div>
      </div>

      {riskItems.length === 0 ? (
        <div className="rounded-2xl border border-emerald-500/25 bg-emerald-500/[0.05] p-8 text-center text-xs text-[#34D399]">
          Tüm aktif ürünlerde en az 2 onaylı alternatif tedarikçi tanımlı; tek-kaynak kesinti riski yok.
        </div>
      ) : (
        <div className="space-y-3">
          {riskItems.map((item: any) => (
            <div
              key={item.itemId}
              className="rounded-2xl border border-amber-500/25 bg-[#121614]/85 p-4 flex flex-col lg:flex-row lg:items-center justify-between gap-4"
            >
              <div className="space-y-1">
                <div className="flex flex-wrap items-center gap-2">
                  <ShieldAlert
                    className={`size-4 ${
                      item.approvedSupplierCount === 0 ? "text-rose-400" : "text-amber-400"
                    }`}
                  />
                  <span className="font-semibold text-white text-sm">{item.itemName}</span>
                  <span className="font-mono text-[11px] text-zinc-400">{item.sku}</span>
                  <span
                    className={`px-2 py-0.5 rounded-full text-[10px] font-semibold border ${
                      item.approvedSupplierCount === 0
                        ? "bg-rose-500/15 text-rose-300 border-rose-500/30"
                        : "bg-amber-500/15 text-amber-300 border-amber-500/30"
                    }`}
                  >
                    {item.approvedSupplierCount === 0 ? "Tedarikçisiz Kritik Risk" : "Tek Kaynak Riski"}
                  </span>
                </div>
                <div className="text-xs text-zinc-400">
                  Mevcut Stok: <strong className="text-zinc-200">{item.availableQty}</strong> · ROP:{" "}
                  <strong className="text-zinc-200">{item.reorderPoint}</strong> · Aktif Bağlı:{" "}
                  {item.currentSuppliers.length > 0
                    ? item.currentSuppliers.map((cs: any) => `${cs.name} (${cs.leadTimeDays}g)`).join(", ")
                    : "Yok"}
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                {(item.alternativeCandidates || []).map((cand: any) => {
                  const key = `${item.itemId}::${cand.supplierId}`
                  return (
                    <button
                      key={cand.supplierId}
                      type="button"
                      disabled={linkingKey === key}
                      onClick={() => handleLinkAlternative(item, cand)}
                      data-testid={`link-alt-${item.sku}-${cand.code}`}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-[#34D399]/35 bg-[#34D399]/10 hover:bg-[#34D399]/20 text-xs text-[#34D399] font-medium"
                    >
                      <Plus className="size-3.5" />
                      <span>
                        {cand.name} (Skor {cand.scorecardScore}, {cand.leadTimeDays}g) Bağla
                      </span>
                    </button>
                  )
                })}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
