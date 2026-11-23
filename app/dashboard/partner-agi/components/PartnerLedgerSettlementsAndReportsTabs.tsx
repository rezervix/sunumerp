"use client"

import React, { useState } from "react"
import {
  AlertTriangle,
  CheckCircle2,
  CreditCard,
  FileSpreadsheet,
  FileText,
  Plus,
  ShieldCheck,
} from "lucide-react"
import {
  B2B_LEDGER_ENTRY_TYPE_LABELS,
  B2B_SETTLEMENT_STATUS_META,
  formatDateTrB2b,
  formatTryB2b,
} from "@/lib/tourism/b2b/constantsAndHelpers"

interface FinanceReportTabsProps {
  activeTab: "settlements" | "ledger" | "reports"
  data: any
  busy: boolean
  demoCompanyId: string
  onAction: (action: string, payload: Record<string, any>) => Promise<boolean>
}

export function PartnerLedgerSettlementsAndReportsTabs({
  activeTab,
  data,
  busy,
  demoCompanyId,
  onAction,
}: FinanceReportTabsProps) {
  const [newStlOpen, setNewStlOpen] = useState(false)
  const [stlCounterpartyId, setStlCounterpartyId] = useState("")
  const [stlLabel, setStlLabel] = useState("Kasım 2026 Mutabakatı")
  const [stlStart, setStlStart] = useState("2026-11-01")
  const [stlEnd, setStlEnd] = useState("2026-12-31")
  const [disputeNoteById, setDisputeNoteById] = useState<Record<string, string>>({})
  const [adjustById, setAdjustById] = useState<Record<string, string>>({})

  if (activeTab === "settlements") {
    const settlements: any[] = data.settlements || []
    const approvedPartners = (data.partnerships || []).filter((p: any) => p.status === "APPROVED")

    return (
      <div className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-base font-semibold text-zinc-100">Dönemsel Komisyon & Mutabakat Yönetimi</h2>
            <p className="text-xs text-zinc-400">
              Çift taraflı onay, itiraz/düzeltme ve mahsuplaşma akışı. Her iki firma onaylamadan dönem kapatılmaz.
            </p>
          </div>
          <button
            type="button"
            disabled={busy || approvedPartners.length === 0}
            onClick={() => {
              setStlCounterpartyId(approvedPartners[0]?.counterpartyCompanyId || "")
              setNewStlOpen(true)
            }}
            className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 px-3 py-2 text-xs font-medium text-white hover:bg-emerald-500 disabled:opacity-50"
          >
            <Plus className="h-3.5 w-3.5" /> Yeni Mutabakat Dönemi Oluştur
          </button>
        </div>

        {newStlOpen && (
          <div className="rounded-xl border border-emerald-500/30 bg-zinc-900/90 p-4 space-y-3 text-xs">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
              <div>
                <label className="block text-[11px] text-zinc-400 mb-1">Partner Firma</label>
                <select
                  value={stlCounterpartyId}
                  onChange={(e) => setStlCounterpartyId(e.target.value)}
                  className="w-full rounded-lg border border-zinc-700 bg-zinc-950 px-2.5 py-2 text-zinc-100"
                >
                  {approvedPartners.map((p: any) => (
                    <option key={p.counterpartyCompanyId} value={p.counterpartyCompanyId}>
                      {p.counterpartyCompanyName}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-[11px] text-zinc-400 mb-1">Dönem Etiketi</label>
                <input value={stlLabel} onChange={(e) => setStlLabel(e.target.value)} className="w-full rounded-lg border border-zinc-700 bg-zinc-950 px-2.5 py-2 text-zinc-100" />
              </div>
              <div>
                <label className="block text-[11px] text-zinc-400 mb-1">Başlangıç</label>
                <input type="date" value={stlStart} onChange={(e) => setStlStart(e.target.value)} className="w-full rounded-lg border border-zinc-700 bg-zinc-950 px-2.5 py-2 text-zinc-100" />
              </div>
              <div>
                <label className="block text-[11px] text-zinc-400 mb-1">Bitiş</label>
                <input type="date" value={stlEnd} onChange={(e) => setStlEnd(e.target.value)} className="w-full rounded-lg border border-zinc-700 bg-zinc-950 px-2.5 py-2 text-zinc-100" />
              </div>
            </div>
            <div className="flex justify-end gap-2">
              <button type="button" onClick={() => setNewStlOpen(false)} className="rounded-lg border border-zinc-700 px-3 py-1.5 text-zinc-300">
                Vazgeç
              </button>
              <button
                type="button"
                disabled={busy || !stlCounterpartyId}
                onClick={async () => {
                  const ok = await onAction("create_settlement", {
                    counterpartyCompanyId: stlCounterpartyId,
                    periodLabel: stlLabel,
                    periodStart: `${stlStart}T00:00:00.000Z`,
                    periodEnd: `${stlEnd}T23:59:59.000Z`,
                  })
                  if (ok) setNewStlOpen(false)
                }}
                className="rounded-lg bg-emerald-600 px-4 py-1.5 font-medium text-white hover:bg-emerald-500"
              >
                Mutabakatı Oluştur
              </button>
            </div>
          </div>
        )}

        <div className="space-y-3">
          {settlements.map((s) => {
            const st = B2B_SETTLEMENT_STATUS_META[s.status] || {
              label: s.status,
              badgeClass: "bg-zinc-700 text-zinc-200 border-zinc-600",
            }
            const myApproved = s.roleForViewer === "OWNER" ? Boolean(s.ownerApprovedAt) : Boolean(s.bookerApprovedAt)
            return (
              <div key={s.id} className="rounded-xl border border-zinc-800 bg-zinc-900/70 p-4 space-y-3">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs font-semibold text-sky-300">{s.settlementNo}</span>
                      <span className={`inline-flex rounded-full border px-2 py-0.5 text-[10px] font-medium ${st.badgeClass}`}>
                        {st.label}
                      </span>
                    </div>
                    <h3 className="text-sm font-semibold text-zinc-100 mt-1">{s.periodLabel}</h3>
                    <p className="text-xs text-zinc-400">
                      Kaynak Sahibi: <strong className="text-zinc-200">{s.ownerCompanyName}</strong> ↔ Rezerve Eden:{" "}
                      <strong className="text-zinc-200">{s.bookingCompanyName}</strong> ({s.reservationCount} rezervasyon)
                    </p>
                  </div>

                  <div className="grid grid-cols-3 gap-3 text-right text-xs">
                    <div>
                      <span className="text-[10px] text-zinc-500 block">Brüt Hacim</span>
                      <span className="text-zinc-200">{formatTryB2b(s.grossVolumeTry)}</span>
                    </div>
                    <div>
                      <span className="text-[10px] text-zinc-500 block">Komisyon</span>
                      <span className="text-amber-300">{formatTryB2b(s.commissionTotalTry)}</span>
                    </div>
                    <div>
                      <span className="text-[10px] text-zinc-500 block">Net Hakediş</span>
                      <span className="text-emerald-300 font-semibold">{formatTryB2b(s.ownerNetPayableTry)}</span>
                    </div>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-4 text-[11px] text-zinc-400">
                  <span className={s.ownerApprovedAt ? "text-emerald-400" : "text-zinc-500"}>
                    {s.ownerApprovedAt ? "✓" : "○"} Sahip Onayı ({s.ownerApprovedBy || "Bekliyor"})
                  </span>
                  <span className={s.bookerApprovedAt ? "text-emerald-400" : "text-zinc-500"}>
                    {s.bookerApprovedAt ? "✓" : "○"} Rezerve Eden Onayı ({s.bookerApprovedBy || "Bekliyor"})
                  </span>
                  {s.eDocumentRefNo && <span className="text-sky-300">e-Belge: {s.eDocumentRefNo}</span>}
                </div>

                {s.disputeNote && (
                  <div className="rounded-lg bg-rose-500/10 border border-rose-500/20 px-3 py-2 text-xs text-rose-300 flex items-center gap-2">
                    <AlertTriangle className="h-4 w-4 shrink-0" />
                    <span>İtiraz Notu: {s.disputeNote}</span>
                  </div>
                )}

                <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-zinc-800/80">
                  {["PENDING_COUNTERPARTY", "DRAFT"].includes(s.status) && !myApproved && (
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() => onAction("respond_settlement", { settlementId: s.id, decision: "APPROVE" })}
                      className="rounded-md bg-emerald-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-emerald-500"
                    >
                      Mutabakatı Onayla
                    </button>
                  )}
                  {["PENDING_COUNTERPARTY", "APPROVED_BOTH"].includes(s.status) && (
                    <div className="flex items-center gap-1.5">
                      <input
                        type="text"
                        placeholder="İtiraz gerekçesi..."
                        value={disputeNoteById[s.id] || ""}
                        onChange={(e) => setDisputeNoteById((p) => ({ ...p, [s.id]: e.target.value }))}
                        className="rounded-md border border-zinc-700 bg-zinc-950 px-2 py-1 text-xs text-zinc-100 w-44"
                      />
                      <button
                        type="button"
                        disabled={busy || !(disputeNoteById[s.id] || "").trim()}
                        onClick={() =>
                          onAction("respond_settlement", {
                            settlementId: s.id,
                            decision: "DISPUTE",
                            note: disputeNoteById[s.id],
                          })
                        }
                        className="rounded-md border border-rose-500/40 bg-rose-500/10 px-2.5 py-1 text-xs text-rose-300 hover:bg-rose-500/20 disabled:opacity-50"
                      >
                        İtiraz Et
                      </button>
                    </div>
                  )}
                  {s.status === "DISPUTED" && (
                    <div className="flex flex-wrap items-center gap-1.5">
                      <input
                        type="number"
                        placeholder="Düzeltme (+/- TRY)"
                        value={adjustById[s.id] || ""}
                        onChange={(e) => setAdjustById((p) => ({ ...p, [s.id]: e.target.value }))}
                        className="rounded-md border border-zinc-700 bg-zinc-950 px-2 py-1 text-xs text-zinc-100 w-36"
                      />
                      <button
                        type="button"
                        disabled={busy}
                        onClick={() =>
                          onAction("respond_settlement", {
                            settlementId: s.id,
                            decision: "ADJUST_AND_RESUBMIT",
                            adjustmentAmountTry: Number(adjustById[s.id] || 0),
                            note: "İtiraz sonrası düzeltme uygulandı ve yeniden onaya sunuldu.",
                          })
                        }
                        className="rounded-md bg-amber-600 px-2.5 py-1 text-xs font-medium text-white hover:bg-amber-500"
                      >
                        Düzelt & Yeniden Onaya Sun
                      </button>
                    </div>
                  )}
                  {s.status === "APPROVED_BOTH" && (
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() => onAction("respond_settlement", { settlementId: s.id, decision: "MARK_SETTLED" })}
                      className="rounded-md bg-indigo-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-indigo-500"
                    >
                      Mahsuplaşmayı Kapat
                    </button>
                  )}
                  {!s.eDocumentRefNo && ["APPROVED_BOTH", "SETTLED"].includes(s.status) && (
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() => onAction("issue_edocument", { targetType: "SETTLEMENT", targetId: s.id })}
                      className="inline-flex items-center gap-1 rounded-md border border-sky-500/40 bg-sky-500/10 px-2.5 py-1 text-xs text-sky-300"
                    >
                      <FileText className="h-3.5 w-3.5" /> Mutabakat e-Belgesi Kes
                    </button>
                  )}
                </div>
              </div>
            )
          })}
          {settlements.length === 0 && (
            <div className="rounded-xl border border-dashed border-zinc-800 p-8 text-center text-xs text-zinc-500">
              Bu firma perspektifi için henüz mutabakat dönemi bulunmuyor.
            </div>
          )}
        </div>
      </div>
    )
  }

  if (activeTab === "ledger") {
    const entries: any[] = data.ledgerEntries || []
    const balanceAudit = data.ledgerBalanceAudit
    return (
      <div className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-base font-semibold text-zinc-100 flex items-center gap-2">
              <CreditCard className="h-4 w-4 text-emerald-400" /> Karşılıklı Partner Cari Hareketleri (Kendi Tarafınız)
            </h2>
            <p className="text-xs text-zinc-400">
              İzolasyon kuralı gereği yalnızca <strong className="text-zinc-200">{data.activeCompany?.name}</strong> tarafındaki alacak ve borç kayıtları gösterilir.
            </p>
          </div>
          {balanceAudit && (
            <div
              className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs ${
                balanceAudit.isBalanced
                  ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-300"
                  : "border-rose-500/30 bg-rose-500/10 text-rose-300"
              }`}
            >
              <ShieldCheck className="h-3.5 w-3.5" />
              <span>
                Karşılıklı Cari Denkliği (A Alacağı = B Borcu):{" "}
                {balanceAudit.isBalanced ? `Doğrulandı (${balanceAudit.balancedPairCount}/${balanceAudit.pairCount} çift)` : "Uyumsuzluk var"}
              </span>
            </div>
          )}
        </div>

        <div className="overflow-x-auto rounded-xl border border-zinc-800 bg-zinc-900/60">
          <table className="w-full text-left text-xs">
            <thead className="border-b border-zinc-800 bg-zinc-950/50 text-[11px] text-zinc-400">
              <tr>
                <th className="px-3 py-2.5">Kayıt No</th>
                <th className="px-3 py-2.5">Karşı Partner Firma</th>
                <th className="px-3 py-2.5">Hareket Tipi</th>
                <th className="px-3 py-2.5">Açıklama</th>
                <th className="px-3 py-2.5">Vade</th>
                <th className="px-3 py-2.5 text-right">Tutar</th>
                <th className="px-3 py-2.5">Durum</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800/70">
              {entries.map((l) => (
                <tr key={l.id} className="hover:bg-zinc-800/30">
                  <td className="px-3 py-2.5 font-mono text-sky-300">{l.entryNo}</td>
                  <td className="px-3 py-2.5 text-zinc-200">{l.counterpartyCompanyName}</td>
                  <td className="px-3 py-2.5">
                    <span
                      className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${
                        l.entryType === "RECEIVABLE"
                          ? "bg-emerald-500/15 text-emerald-300"
                          : "bg-rose-500/15 text-rose-300"
                      }`}
                    >
                      {B2B_LEDGER_ENTRY_TYPE_LABELS[l.entryType] || l.entryType}
                    </span>
                  </td>
                  <td className="px-3 py-2.5 text-zinc-400">{l.description}</td>
                  <td className="px-3 py-2.5 text-zinc-400">{formatDateTrB2b(l.dueDate)}</td>
                  <td className={`px-3 py-2.5 text-right font-semibold ${l.entryType === "RECEIVABLE" ? "text-emerald-300" : "text-rose-300"}`}>
                    {l.entryType === "RECEIVABLE" ? "+" : "-"}
                    {formatTryB2b(l.amountTry)}
                  </td>
                  <td className="px-3 py-2.5 text-zinc-300">{l.status === "SETTLED" ? "Mahsuplaşıldı" : l.status === "VOID" ? "İptal" : "Açık"}</td>
                </tr>
              ))}
              {entries.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-4 py-6 text-center text-zinc-500">
                    Bu firma perspektifinde cari hareket bulunmuyor.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    )
  }

  // TAB 6: RAPORLAR & DIŞA AKTARMA
  const analytics = data.analytics || {}
  const breakdown: any[] = analytics.partnerBreakdown || []
  const qs = demoCompanyId ? `&demoCompanyId=${encodeURIComponent(demoCompanyId)}` : ""

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-base font-semibold text-zinc-100">Partner Ağı Paylaşım & Performans Raporları</h2>
          <p className="text-xs text-zinc-400">
            Paylaşım geliri, partner bazlı hacim, kaynak kullanım oranı, komisyon ve çakışma/ret özeti.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <a
            href={`/api/partner-agi?section=export_report&format=xlsx${qs}`}
            className="inline-flex items-center gap-1.5 rounded-lg border border-emerald-500/40 bg-emerald-500/10 px-3 py-2 text-xs font-medium text-emerald-300 hover:bg-emerald-500/20"
          >
            <FileSpreadsheet className="h-3.5 w-3.5" /> Excel (.xlsx) İndir
          </a>
          <a
            href={`/api/partner-agi?section=export_report&format=pdf${qs}`}
            className="inline-flex items-center gap-1.5 rounded-lg border border-sky-500/40 bg-sky-500/10 px-3 py-2 text-xs font-medium text-sky-300 hover:bg-sky-500/20"
          >
            <FileText className="h-3.5 w-3.5" /> PDF (.pdf) İndir
          </a>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="rounded-xl border border-zinc-800 bg-zinc-900/70 p-3.5">
          <div className="text-[11px] text-zinc-400">Paylaşım Geliri (Net)</div>
          <div className="text-lg font-bold text-emerald-300 mt-1">{formatTryB2b(analytics.ownerRevenueTry)}</div>
        </div>
        <div className="rounded-xl border border-zinc-800 bg-zinc-900/70 p-3.5">
          <div className="text-[11px] text-zinc-400">White-Label Kullanım</div>
          <div className="text-lg font-bold text-sky-300 mt-1">{formatTryB2b(analytics.bookerVolumeTry)}</div>
        </div>
        <div className="rounded-xl border border-zinc-800 bg-zinc-900/70 p-3.5">
          <div className="text-[11px] text-zinc-400">Kaynak Kullanım Oranı</div>
          <div className="text-lg font-bold text-zinc-100 mt-1">%{analytics.resourceUtilizationPct ?? 0}</div>
        </div>
        <div className="rounded-xl border border-zinc-800 bg-zinc-900/70 p-3.5">
          <div className="text-[11px] text-zinc-400">Çakışma / Ret Sayısı</div>
          <div className="text-lg font-bold text-amber-300 mt-1">
            {analytics.conflictCount ?? 0} / {analytics.rejectedCount ?? 0}
          </div>
        </div>
      </div>

      <div className="overflow-x-auto rounded-xl border border-zinc-800 bg-zinc-900/60">
        <table className="w-full text-left text-xs">
          <thead className="border-b border-zinc-800 bg-zinc-950/50 text-[11px] text-zinc-400">
            <tr>
              <th className="px-3 py-2.5">Partner Firma</th>
              <th className="px-3 py-2.5 text-right">Rezervasyon</th>
              <th className="px-3 py-2.5 text-right">Brüt Hacim</th>
              <th className="px-3 py-2.5 text-right">Komisyon</th>
              <th className="px-3 py-2.5 text-right">Net Pozisyon</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-800/70">
            {breakdown.map((row) => (
              <tr key={row.partnerCompanyId} className="hover:bg-zinc-800/30">
                <td className="px-3 py-2.5 font-medium text-zinc-100">{row.partnerCompanyName}</td>
                <td className="px-3 py-2.5 text-right text-zinc-300">{row.reservationCount}</td>
                <td className="px-3 py-2.5 text-right text-zinc-200">{formatTryB2b(row.grossVolumeTry)}</td>
                <td className="px-3 py-2.5 text-right text-amber-300">{formatTryB2b(row.commissionTry)}</td>
                <td className={`px-3 py-2.5 text-right font-semibold ${row.netBalanceTry >= 0 ? "text-emerald-300" : "text-rose-300"}`}>
                  {formatTryB2b(row.netBalanceTry)}
                </td>
              </tr>
            ))}
            {breakdown.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-6 text-center text-zinc-500">
                  Partner bazlı hacim verisi bulunmuyor.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
