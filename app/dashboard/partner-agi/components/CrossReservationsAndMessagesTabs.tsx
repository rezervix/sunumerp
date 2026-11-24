"use client"

import React, { useState } from "react"
import {
  AlertTriangle,
  ArrowRight,
  CalendarDays,
  CheckCircle2,
  FileText,
  MessageCircle,
  ShieldCheck,
} from "lucide-react"
import {
  B2B_CROSS_RES_STATUS_META,
  B2B_RESOURCE_TYPE_META,
  formatDateTimeTrB2b,
  formatDateTrB2b,
  formatTryB2b,
} from "@/lib/tourism/b2b/constantsAndHelpers"

interface CrossResTabsProps {
  data: any
  busy: boolean
  onAction: (action: string, payload: Record<string, any>) => Promise<boolean>
}

export function CrossReservationsAndMessagesTabs({ data, busy, onAction }: CrossResTabsProps) {
  const [roleFilter, setRoleFilter] = useState<"ALL" | "OWNER" | "BOOKER">("ALL")
  const [openThreadId, setOpenThreadId] = useState<string | null>(null)
  const [msgBody, setMsgBody] = useState("")
  const [msgType, setMsgType] = useState<"NOTE" | "CHANGE_REQUEST">("NOTE")

  const allRes: any[] = data.crossReservations || []
  const filtered = allRes.filter((r) => roleFilter === "ALL" || r.roleForViewer === roleFilter)
  const conflicts: any[] = data.conflicts || []

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-base font-semibold text-zinc-100 flex items-center gap-2">
            <ArrowRight className="h-4 w-4 text-[--brand]" /> Çapraz Rezervasyonlar ve Partner Mesajlaşma
          </h2>
          <p className="text-xs text-zinc-400">
            Gelen (kaynak sahibi olduğunuz) ve giden (partnerden rezerve ettiğiniz) white-label rezervasyonları yönetin.
          </p>
        </div>
        <div className="flex items-center gap-1.5 rounded-lg border border-zinc-800 bg-zinc-950 p-1 text-xs">
          {(
            [
              ["ALL", `Tümü (${allRes.length})`],
              ["OWNER", `Gelen Talepler (${allRes.filter((r) => r.roleForViewer === "OWNER").length})`],
              ["BOOKER", `Giden Rezervasyonlar (${allRes.filter((r) => r.roleForViewer === "BOOKER").length})`],
            ] as const
          ).map(([key, label]) => (
            <button
              key={key}
              type="button"
              onClick={() => setRoleFilter(key)}
              className={`rounded-md px-2.5 py-1 transition ${
                roleFilter === key ? "bg-[--brand] text-white font-medium" : "text-zinc-400 hover:text-zinc-200"
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      <div className="space-y-3">
        {filtered.map((r) => {
          const st = B2B_CROSS_RES_STATUS_META[r.status] || {
            label: r.status,
            badgeClass: "bg-zinc-700 text-zinc-200 border-zinc-600",
          }
          const threadOpen = openThreadId === r.id
          return (
            <div key={r.id} className="rounded-xl border border-zinc-800 bg-zinc-900/70 p-4 space-y-3">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-mono text-xs font-semibold text-[--brand]">{r.reservationNo}</span>
                    <span className={`inline-flex rounded-full border px-2 py-0.5 text-[10px] font-medium ${st.badgeClass}`}>
                      {st.label}
                    </span>
                    <span
                      className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${
                        r.roleForViewer === "OWNER"
                          ? "bg-sky-500/15 text-sky-300"
                          : "bg-purple-500/15 text-purple-300"
                      }`}
                    >
                      {r.roleForViewer === "OWNER" ? "Kaynak Sahibi (Gelen)" : "Rezerve Eden (Giden)"}
                    </span>
                    {r.isWhiteLabel && (
                      <span className="rounded-full bg-zinc-800 px-2 py-0.5 text-[10px] text-zinc-300">
                        White-Label
                      </span>
                    )}
                    {r.underlyingModuleType && (
                      <span className="inline-flex items-center gap-1 rounded-full bg-zinc-800/80 px-2 py-0.5 text-[10px] text-zinc-400">
                        <ShieldCheck className="h-3 w-3 text-[--brand]" />
                        Alt Modül: {r.underlyingModuleType}
                      </span>
                    )}
                  </div>
                  <h3 className="text-sm font-semibold text-zinc-100 mt-1">{r.resourceTitle}</h3>
                  <p className="text-xs text-zinc-400">
                    Sahip: <strong className="text-zinc-200">{r.ownerCompanyName}</strong> → Rezerve Eden:{" "}
                    <strong className="text-zinc-200">{r.bookingCompanyName}</strong>
                    {r.guestOrCustomerLabel ? ` · Misafir/Grup: ${r.guestOrCustomerLabel}` : ""}
                  </p>
                </div>

                <div className="text-right text-xs">
                  <div className="text-zinc-400 flex items-center justify-end gap-1">
                    <CalendarDays className="h-3.5 w-3.5 text-sky-400" />
                    {formatDateTrB2b(r.startAt)} — {formatDateTrB2b(r.endAt)}
                  </div>
                  <div className="mt-1 space-x-2">
                    <span className="text-zinc-400">Brüt: {formatTryB2b(r.grossAmountTry || r.netAmountTry)}</span>
                    <span className="text-amber-300">Kom. (%{r.commissionRatePct}): {formatTryB2b(r.commissionAmountTry)}</span>
                    <span className="text-[--brand] font-semibold">Net: {formatTryB2b(r.ownerNetAmountTry || r.netAmountTry)}</span>
                  </div>
                </div>
              </div>

              {r.rejectedReason && (
                <div className="rounded-lg bg-rose-500/10 border border-rose-500/20 px-3 py-1.5 text-xs text-rose-300">
                  Ret / İptal Notu: {r.rejectedReason}
                </div>
              )}

              <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-zinc-800/80">
                <div className="flex flex-wrap gap-1.5">
                  {r.roleForViewer === "OWNER" && r.status === "PENDING_APPROVAL" && (
                    <>
                      <button
                        type="button"
                        disabled={busy}
                        onClick={() =>
                          onAction("respond_cross_reservation", {
                            crossReservationId: r.id,
                            decision: "APPROVE",
                            reason: "Kaynak sahibi tarafından onaylandı.",
                          })
                        }
                        className="rounded-md bg-[--brand] px-2.5 py-1 text-[11px] font-medium text-white hover:bg-[--brand]"
                      >
                        Onayla & Cariyi Aç
                      </button>
                      <button
                        type="button"
                        disabled={busy}
                        onClick={() =>
                          onAction("respond_cross_reservation", {
                            crossReservationId: r.id,
                            decision: "REJECT",
                            reason: "Seçilen tarihlerde kaynak müsait değil.",
                          })
                        }
                        className="rounded-md bg-rose-600/80 px-2.5 py-1 text-[11px] font-medium text-white hover:bg-rose-500"
                      >
                        Reddet
                      </button>
                    </>
                  )}
                  {r.roleForViewer === "OWNER" && r.status === "CONFIRMED" && (
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() =>
                        onAction("respond_cross_reservation", {
                          crossReservationId: r.id,
                          decision: "COMPLETE",
                          reason: "Hizmet eksiksiz tamamlandı.",
                        })
                      }
                      className="rounded-md bg-indigo-600 px-2.5 py-1 text-[11px] font-medium text-white hover:bg-indigo-500"
                    >
                      Tamamlandı İşaretle
                    </button>
                  )}
                  {["PENDING_APPROVAL", "CONFIRMED"].includes(r.status) && (
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() =>
                        onAction("respond_cross_reservation", {
                          crossReservationId: r.id,
                          decision: "CANCEL",
                          reason: "Kullanıcı talebiyle iptal edildi.",
                        })
                      }
                      className="rounded-md border border-zinc-700 px-2.5 py-1 text-[11px] text-zinc-400 hover:text-rose-300"
                    >
                      İptal Et
                    </button>
                  )}
                  {["CONFIRMED", "COMPLETED"].includes(r.status) && !r.eDocumentRefNo && (
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() =>
                        onAction("issue_edocument", {
                          targetType: "CROSS_RESERVATION",
                          targetId: r.id,
                        })
                      }
                      className="inline-flex items-center gap-1 rounded-md border border-sky-500/40 bg-sky-500/10 px-2.5 py-1 text-[11px] text-sky-300 hover:bg-sky-500/20"
                    >
                      <FileText className="h-3 w-3" /> e-Belge / Finans Kaydı Kes
                    </button>
                  )}
                  {r.eDocumentRefNo && (
                    <span className="inline-flex items-center gap-1 rounded-md bg-[--brand]/10 border border-[--brand-line] px-2.5 py-1 text-[11px] text-[--brand]">
                      <CheckCircle2 className="h-3 w-3" /> e-Belge: {r.eDocumentRefNo}
                    </span>
                  )}
                </div>

                <button
                  type="button"
                  onClick={() => setOpenThreadId(threadOpen ? null : r.id)}
                  className="inline-flex items-center gap-1.5 text-xs text-sky-400 hover:text-sky-300"
                >
                  <MessageCircle className="h-3.5 w-3.5" />
                  Partner Mesajları ({r.messages?.length || 0})
                </button>
              </div>

              {threadOpen && (
                <div className="rounded-lg border border-zinc-800 bg-zinc-950/70 p-3 space-y-2.5">
                  <div className="space-y-2 max-h-56 overflow-y-auto">
                    {(r.messages || []).map((m: any) => (
                      <div key={m.id} className="rounded-lg bg-zinc-900/90 border border-zinc-800/80 p-2.5 text-xs">
                        <div className="flex items-center justify-between text-[11px]">
                          <span className="font-medium text-sky-300">{m.senderName}</span>
                          <span className="text-zinc-500">{formatDateTimeTrB2b(m.createdAt)}</span>
                        </div>
                        <p className="text-zinc-200 mt-1">{m.body}</p>
                      </div>
                    ))}
                    {(r.messages || []).length === 0 && (
                      <p className="text-xs text-zinc-500">Bu rezervasyon için henüz partner mesajı yok.</p>
                    )}
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <select
                      value={msgType}
                      onChange={(e) => setMsgType(e.target.value as any)}
                      className="rounded-lg border border-zinc-700 bg-zinc-900 px-2 py-1.5 text-xs text-zinc-200"
                    >
                      <option value="NOTE">Not</option>
                      <option value="CHANGE_REQUEST">Değişiklik Talebi</option>
                    </select>
                    <input
                      type="text"
                      placeholder="Karşı partnere rezervasyon notu veya değişiklik talebi yazın..."
                      value={msgBody}
                      onChange={(e) => setMsgBody(e.target.value)}
                      className="flex-1 min-w-[200px] rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-1.5 text-xs text-zinc-100"
                    />
                    <button
                      type="button"
                      disabled={busy || !msgBody.trim()}
                      onClick={async () => {
                        const ok = await onAction("post_message", {
                          crossReservationId: r.id,
                          messageType: msgType,
                          body: msgBody,
                        })
                        if (ok) setMsgBody("")
                      }}
                      className="rounded-lg bg-sky-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-sky-500 disabled:opacity-50"
                    >
                      Gönder
                    </button>
                  </div>
                </div>
              )}
            </div>
          )
        })}
        {filtered.length === 0 && (
          <div className="rounded-xl border border-dashed border-zinc-800 p-8 text-center text-xs text-zinc-500">
            Bu görünümde çapraz rezervasyon kaydı bulunmuyor.
          </div>
        )}
      </div>

      {/* ÇAKIŞMA KİLİDİ KAYITLARI */}
      <div className="space-y-2 pt-3 border-t border-zinc-800">
        <h3 className="text-sm font-semibold text-zinc-200 flex items-center gap-1.5">
          <AlertTriangle className="h-4 w-4 text-amber-400" /> Sunucu Çakışma Kilidi Red Kayıtları ({conflicts.length})
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-2.5">
          {conflicts.slice(0, 6).map((c) => (
            <div key={c.id} className="rounded-lg border border-amber-500/20 bg-amber-500/5 p-3 text-xs space-y-1">
              <div className="font-medium text-amber-200">{c.resourceTitle}</div>
              <div className="text-[11px] text-zinc-400">
                {formatDateTrB2b(c.attemptedStartAt)} – {formatDateTrB2b(c.attemptedEndAt)} · Çakışan: {c.conflictReservationNo || "—"}
              </div>
              <div className="text-[11px] text-zinc-400">
                Önerilen alternatif: <strong className="text-zinc-200">{c.alternativesSuggestedCount}</strong> kaynak
              </div>
            </div>
          ))}
          {conflicts.length === 0 && (
            <p className="text-xs text-zinc-500">Bu firma için kaydedilmiş çakışma denemesi yok.</p>
          )}
        </div>
      </div>
    </div>
  )
}
