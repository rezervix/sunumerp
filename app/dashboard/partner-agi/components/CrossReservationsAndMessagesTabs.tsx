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
          <h2 className="text-base font-semibold text-[var(--text)] flex items-center gap-2">
            <ArrowRight className="h-4 w-4 text-[--brand]" /> Çapraz Rezervasyonlar ve Partner Mesajlaşma
          </h2>
          <p className="text-xs text-[var(--text-muted)]">
            Gelen (kaynak sahibi olduğunuz) ve giden (partnerden rezerve ettiğiniz) white-label rezervasyonları yönetin.
          </p>
        </div>
        <div className="flex items-center gap-1.5 rounded-lg border border-[var(--line)] bg-[var(--bg)] p-1 text-xs">
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
              className={`rounded-md px-2.5 py-1 transition ${ roleFilter === key ? "bg-[--brand] text-[var(--text)] font-medium" : "text-[var(--text-muted)] hover:text-[var(--text-2)]" }`}
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
            badgeClass: "bg-[var(--muted-bg)] text-[var(--text-2)] border-[var(--line)]",
          }
          const threadOpen = openThreadId === r.id
          return (
            <div key={r.id} className="rounded-xl border border-[var(--line)] bg-[var(--bg)]/70 p-4 space-y-3">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-mono text-xs font-semibold text-[--brand]">{r.reservationNo}</span>
                    <span className={`inline-flex rounded-full border px-2 py-0.5 text-[10px] font-medium ${st.badgeClass}`}>
                      {st.label}
                    </span>
                    <span
                      className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${ r.roleForViewer === "OWNER" ? "bg-sky-500/15 text-sky-300" : "bg-[var(--brand-soft)]/15 text-[var(--brand)]" }`}
                    >
                      {r.roleForViewer === "OWNER" ? "Kaynak Sahibi (Gelen)" : "Rezerve Eden (Giden)"}
                    </span>
                    {r.isWhiteLabel && (
                      <span className="rounded-full bg-[var(--muted-bg)] px-2 py-0.5 text-[10px] text-[var(--text-2)]">
                        White-Label
                      </span>
                    )}
                    {r.underlyingModuleType && (
                      <span className="inline-flex items-center gap-1 rounded-full bg-[var(--muted-bg)] px-2 py-0.5 text-[10px] text-[var(--text-muted)]">
                        <ShieldCheck className="h-3 w-3 text-[--brand]" />
                        Alt Modül: {r.underlyingModuleType}
                      </span>
                    )}
                  </div>
                  <h3 className="text-sm font-semibold text-[var(--text)] mt-1">{r.resourceTitle}</h3>
                  <p className="text-xs text-[var(--text-muted)]">
                    Sahip: <strong className="text-[var(--text-2)]">{r.ownerCompanyName}</strong> → Rezerve Eden:{" "}
                    <strong className="text-[var(--text-2)]">{r.bookingCompanyName}</strong>
                    {r.guestOrCustomerLabel ? ` · Misafir/Grup: ${r.guestOrCustomerLabel}` : ""}
                  </p>
                </div>

                <div className="text-right text-xs">
                  <div className="text-[var(--text-muted)] flex items-center justify-end gap-1">
                    <CalendarDays className="h-3.5 w-3.5 text-sky-400" />
                    {formatDateTrB2b(r.startAt)} — {formatDateTrB2b(r.endAt)}
                  </div>
                  <div className="mt-1 space-x-2">
                    <span className="text-[var(--text-muted)]">Brüt: {formatTryB2b(r.grossAmountTry || r.netAmountTry)}</span>
                    <span className="text-[var(--warn)]">Kom. (%{r.commissionRatePct}): {formatTryB2b(r.commissionAmountTry)}</span>
                    <span className="text-[--brand] font-semibold">Net: {formatTryB2b(r.ownerNetAmountTry || r.netAmountTry)}</span>
                  </div>
                </div>
              </div>

              {r.rejectedReason && (
                <div className="rounded-lg bg-[var(--bad-soft)] border border-[var(--bad-line)] px-3 py-1.5 text-xs text-[var(--bad)]">
                  Ret / İptal Notu: {r.rejectedReason}
                </div>
              )}

              <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-[var(--line)]">
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
                        className="rounded-md bg-[--brand] px-2.5 py-1 text-[11px] font-medium text-[var(--text)] hover:bg-[--brand]"
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
                        className="rounded-md bg-rose-600/80 px-2.5 py-1 text-[11px] font-medium text-[var(--text)] hover:bg-rose-500"
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
                      className="rounded-md bg-indigo-600 px-2.5 py-1 text-[11px] font-medium text-[var(--text)] hover:bg-indigo-500"
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
                      className="rounded-md border border-[var(--line)] px-2.5 py-1 text-[11px] text-[var(--text-muted)] hover:text-[var(--bad)]"
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
                <div className="rounded-lg border border-[var(--line)] bg-[var(--bg)]/70 p-3 space-y-2.5">
                  <div className="space-y-2 max-h-56 overflow-y-auto">
                    {(r.messages || []).map((m: any) => (
                      <div key={m.id} className="rounded-lg bg-[var(--bg)] border border-[var(--line)] p-2.5 text-xs">
                        <div className="flex items-center justify-between text-[11px]">
                          <span className="font-medium text-sky-300">{m.senderName}</span>
                          <span className="text-[var(--text-muted)]">{formatDateTimeTrB2b(m.createdAt)}</span>
                        </div>
                        <p className="text-[var(--text-2)] mt-1">{m.body}</p>
                      </div>
                    ))}
                    {(r.messages || []).length === 0 && (
                      <p className="text-xs text-[var(--text-muted)]">Bu rezervasyon için henüz partner mesajı yok.</p>
                    )}
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <select
                      value={msgType}
                      onChange={(e) => setMsgType(e.target.value as any)}
                      className="rounded-lg border border-[var(--line)] bg-[var(--bg)] px-2 py-1.5 text-xs text-[var(--text-2)]"
                    >
                      <option value="NOTE">Not</option>
                      <option value="CHANGE_REQUEST">Değişiklik Talebi</option>
                    </select>
                    <input
                      type="text"
                      placeholder="Karşı partnere rezervasyon notu veya değişiklik talebi yazın..."
                      value={msgBody}
                      onChange={(e) => setMsgBody(e.target.value)}
                      className="flex-1 min-w-[200px] rounded-lg border border-[var(--line)] bg-[var(--bg)] px-3 py-1.5 text-xs text-[var(--text)]"
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
                      className="rounded-lg bg-sky-600 px-3 py-1.5 text-xs font-medium text-[var(--text)] hover:bg-sky-500 disabled:opacity-50"
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
          <div className="rounded-xl border border-dashed border-[var(--line)] p-8 text-center text-xs text-[var(--text-muted)]">
            Bu görünümde çapraz rezervasyon kaydı bulunmuyor.
          </div>
        )}
      </div>

      {/* ÇAKIŞMA KİLİDİ KAYITLARI */}
      <div className="space-y-2 pt-3 border-t border-[var(--line)]">
        <h3 className="text-sm font-semibold text-[var(--text-2)] flex items-center gap-1.5">
          <AlertTriangle className="h-4 w-4 text-[var(--warn)]" /> Sunucu Çakışma Kilidi Red Kayıtları ({conflicts.length})
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-2.5">
          {conflicts.slice(0, 6).map((c) => (
            <div key={c.id} className="rounded-lg border border-[var(--warn-line)] bg-amber-500/5 p-3 text-xs space-y-1">
              <div className="font-medium text-amber-200">{c.resourceTitle}</div>
              <div className="text-[11px] text-[var(--text-muted)]">
                {formatDateTrB2b(c.attemptedStartAt)} – {formatDateTrB2b(c.attemptedEndAt)} · Çakışan: {c.conflictReservationNo || "—"}
              </div>
              <div className="text-[11px] text-[var(--text-muted)]">
                Önerilen alternatif: <strong className="text-[var(--text-2)]">{c.alternativesSuggestedCount}</strong> kaynak
              </div>
            </div>
          ))}
          {conflicts.length === 0 && (
            <p className="text-xs text-[var(--text-muted)]">Bu firma için kaydedilmiş çakışma denemesi yok.</p>
          )}
        </div>
      </div>
    </div>
  )
}
