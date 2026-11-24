"use client"

import React, { useState } from "react"
import {
  AlertTriangle,
  Building2,
  CalendarDays,
  CheckCircle2,
  Globe,
  Lock,
  Plus,
  Search,
  ShieldCheck,
  Users,
  X,
} from "lucide-react"
import {
  B2B_APPROVAL_MODE_LABELS,
  B2B_COMPANY_TYPE_LABELS,
  B2B_PARTNERSHIP_STATUS_META,
  B2B_RESOURCE_STATUS_META,
  B2B_RESOURCE_TYPE_META,
  B2B_VISIBILITY_LABELS,
  formatDateTimeTrB2b,
  formatDateTrB2b,
  formatTryB2b,
} from "@/lib/tourism/b2b/constantsAndHelpers"

interface PartnerTabsProps {
  activeTab: "partners" | "pool"
  data: any
  busy: boolean
  onAction: (action: string, payload: Record<string, any>) => Promise<boolean>
  onFilterPool: (filters: { resourceType: string; search: string; startAt: string; endAt: string }) => void
}

export function PartnerNetworkAndPoolTabs({
  activeTab,
  data,
  busy,
  onAction,
  onFilterPool,
}: PartnerTabsProps) {
  // Partner Davet formu
  const [inviteOpen, setInviteOpen] = useState(false)
  const [inviteTargetId, setInviteTargetId] = useState("")
  const [inviteCommission, setInviteCommission] = useState("12")
  const [inviteTermDays, setInviteTermDays] = useState("15")
  const [inviteNotes, setInviteNotes] = useState("")
  const [expandedHistoryId, setExpandedHistoryId] = useState<string | null>(null)

  // Yeni Kaynak Paylaşım formu
  const [resModalOpen, setResModalOpen] = useState(false)
  const [resType, setResType] = useState("VEHICLE")
  const [resTitle, setResTitle] = useState("")
  const [resCategory, setResCategory] = useState("")
  const [resCity, setResCity] = useState("İstanbul")
  const [resCapacity, setResCapacity] = useState("4")
  const [resRate, setResRate] = useState("3000")
  const [resCommission, setResCommission] = useState("10")
  const [resMinDays, setResMinDays] = useState("1")
  const [resVisibility, setResVisibility] = useState("ALL_APPROVED_PARTNERS")
  const [resApprovalMode, setResApprovalMode] = useState("MANUAL")
  const [resHideSensitive, setResHideSensitive] = useState(true)
  const [resPlate, setResPlate] = useState("")
  const [resPhone, setResPhone] = useState("")

  // Havuz Filtresi
  const [filterType, setFilterType] = useState("ALL")
  const [filterSearch, setFilterSearch] = useState("")
  const [filterStart, setFilterStart] = useState("")
  const [filterEnd, setFilterEnd] = useState("")

  // White-label Çapraz Rezervasyon Modalı
  const [bookingTarget, setBookingTarget] = useState<any | null>(null)
  const [bookStart, setBookStart] = useState(() => {
    const d = new Date(Date.now() + 2 * 86400000)
    return d.toISOString().slice(0, 10)
  })
  const [bookEnd, setBookEnd] = useState(() => {
    const d = new Date(Date.now() + 4 * 86400000)
    return d.toISOString().slice(0, 10)
  })
  const [bookQty, setBookQty] = useState("1")
  const [bookGuest, setBookGuest] = useState("")
  const [bookWhiteLabel, setBookWhiteLabel] = useState(true)
  const [bookNotes, setBookNotes] = useState("")

  if (activeTab === "partners") {
    const partnerships: any[] = data.partnerships || []
    const invitable: any[] = data.invitableCompanies || []

    return (
      <div className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-base font-semibold text-zinc-100">Partner Firma Ağı ve Karşılıklı Onay</h2>
            <p className="text-xs text-zinc-400">
              Kaynak paylaşımı yalnızca <span className="text-[--brand] font-medium">Onaylı Partner (APPROVED)</span> firmalar arasında çalışır.
            </p>
          </div>
          <button
            type="button"
            disabled={busy || invitable.length === 0}
            onClick={() => {
              setInviteTargetId(invitable[0]?.id || "")
              setInviteOpen(true)
            }}
            className="inline-flex items-center gap-1.5 rounded-lg bg-[--brand] px-3 py-2 text-xs font-medium text-white hover:bg-[--brand] disabled:opacity-50"
          >
            <Plus className="h-3.5 w-3.5" /> Partnerlik Daveti Gönder
          </button>
        </div>

        {inviteOpen && (
          <div className="rounded-xl border border-[--brand-line] bg-zinc-900/90 p-4 space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-zinc-100">Yeni B2B Partnerlik Daveti</h3>
              <button type="button" onClick={() => setInviteOpen(false)} className="text-zinc-400 hover:text-zinc-200">
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
              <div className="md:col-span-2">
                <label className="block text-[11px] text-zinc-400 mb-1">Hedef Partner Firma</label>
                <select
                  value={inviteTargetId}
                  onChange={(e) => setInviteTargetId(e.target.value)}
                  className="w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-xs text-zinc-100"
                >
                  {invitable.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name} ({B2B_COMPANY_TYPE_LABELS[c.companyType] || c.companyType})
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-[11px] text-zinc-400 mb-1">Komisyon Oranı (%)</label>
                <input
                  type="number"
                  min={0}
                  max={40}
                  value={inviteCommission}
                  onChange={(e) => setInviteCommission(e.target.value)}
                  className="w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-xs text-zinc-100"
                />
              </div>
              <div>
                <label className="block text-[11px] text-zinc-400 mb-1">Mutabakat Vadesi (Gün)</label>
                <input
                  type="number"
                  min={1}
                  max={90}
                  value={inviteTermDays}
                  onChange={(e) => setInviteTermDays(e.target.value)}
                  className="w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-xs text-zinc-100"
                />
              </div>
            </div>
            <div>
              <label className="block text-[11px] text-zinc-400 mb-1">İş Birliği Notu</label>
              <input
                type="text"
                placeholder="Örn: Yaz sezonu araç ve kontenjan paylaşım protokolü"
                value={inviteNotes}
                onChange={(e) => setInviteNotes(e.target.value)}
                className="w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-xs text-zinc-100"
              />
            </div>
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setInviteOpen(false)}
                className="rounded-lg border border-zinc-700 px-3 py-1.5 text-xs text-zinc-300 hover:bg-zinc-800"
              >
                Vazgeç
              </button>
              <button
                type="button"
                disabled={busy || !inviteTargetId}
                onClick={async () => {
                  const ok = await onAction("invite_partner", {
                    targetCompanyId: inviteTargetId,
                    commissionRatePct: Number(inviteCommission),
                    settlementTermDays: Number(inviteTermDays),
                    notes: inviteNotes,
                  })
                  if (ok) {
                    setInviteOpen(false)
                    setInviteNotes("")
                  }
                }}
                className="rounded-lg bg-[--brand] px-4 py-1.5 text-xs font-medium text-white hover:bg-[--brand] disabled:opacity-50"
              >
                Daveti Gönder
              </button>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
          {partnerships.map((ps) => {
            const st = B2B_PARTNERSHIP_STATUS_META[ps.status] || {
              label: ps.status,
              badgeClass: "bg-zinc-700 text-zinc-200 border-zinc-600",
            }
            const isExpanded = expandedHistoryId === ps.id
            return (
              <div key={ps.id} className="rounded-xl border border-zinc-800 bg-zinc-900/70 p-4 space-y-3">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <div className="flex items-center gap-2">
                      <Building2 className="h-4 w-4 text-sky-400" />
                      <span className="text-sm font-semibold text-zinc-100">{ps.counterpartyCompanyName}</span>
                    </div>
                    <p className="text-[11px] text-zinc-400 mt-0.5">
                      {ps.code} · {B2B_COMPANY_TYPE_LABELS[ps.counterpartyCompanyType] || ps.counterpartyCompanyType} · {ps.counterpartyCity || "—"}
                    </p>
                  </div>
                  <span className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-[11px] font-medium ${st.badgeClass}`}>
                    {st.label}
                  </span>
                </div>

                <div className="grid grid-cols-3 gap-2 rounded-lg bg-zinc-950/60 p-2.5 text-xs">
                  <div>
                    <span className="text-[10px] text-zinc-500 block">Yön</span>
                    <span className="text-zinc-200">{ps.direction === "INCOMING" ? "Gelen Davet" : "Giden Davet"}</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-zinc-500 block">Komisyon</span>
                    <span className="text-[--brand] font-medium">%{ps.commissionRatePct}</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-zinc-500 block">Vade</span>
                    <span className="text-zinc-200">{ps.settlementTermDays} gün</span>
                  </div>
                </div>

                {ps.notes && <p className="text-xs text-zinc-400">{ps.notes}</p>}

                <div className="flex flex-wrap items-center justify-between gap-2 pt-1 border-t border-zinc-800/80">
                  <div className="flex flex-wrap gap-1.5">
                    {ps.status === "PENDING" && ps.direction === "INCOMING" && (
                      <>
                        <button
                          type="button"
                          disabled={busy}
                          onClick={() =>
                            onAction("respond_partnership", {
                              partnershipId: ps.id,
                              decision: "APPROVE",
                              confirmAuthorityApproval: true,
                              reason: "Firma yetkilisi onayı ile kabul edildi.",
                            })
                          }
                          className="rounded-md bg-[--brand]/90 px-2.5 py-1 text-[11px] font-medium text-white hover:bg-[--brand]"
                        >
                          Yetkili Onayıyla Kabul Et
                        </button>
                        <button
                          type="button"
                          disabled={busy}
                          onClick={() =>
                            onAction("respond_partnership", {
                              partnershipId: ps.id,
                              decision: "REJECT",
                              reason: "İş birliği koşulları uygun görülmedi.",
                            })
                          }
                          className="rounded-md bg-rose-600/80 px-2.5 py-1 text-[11px] font-medium text-white hover:bg-rose-500"
                        >
                          Reddet
                        </button>
                      </>
                    )}
                    {ps.status === "APPROVED" && (
                      <button
                        type="button"
                        disabled={busy}
                        onClick={() =>
                          onAction("respond_partnership", {
                            partnershipId: ps.id,
                            decision: "SUSPEND",
                            confirmAuthorityApproval: true,
                            reason: "Operasyonel inceleme nedeniyle geçici askıya alındı.",
                          })
                        }
                        className="rounded-md border border-orange-500/40 bg-orange-500/10 px-2.5 py-1 text-[11px] text-orange-300 hover:bg-orange-500/20"
                      >
                        Askıya Al
                      </button>
                    )}
                    {ps.status === "SUSPENDED" && (
                      <button
                        type="button"
                        disabled={busy}
                        onClick={() =>
                          onAction("respond_partnership", {
                            partnershipId: ps.id,
                            decision: "REACTIVATE",
                            confirmAuthorityApproval: true,
                            reason: "Partnerlik yeniden aktifleştirildi.",
                          })
                        }
                        className="rounded-md bg-[--brand]/80 px-2.5 py-1 text-[11px] text-white hover:bg-[--brand]"
                      >
                        Yeniden Aktifleştir
                      </button>
                    )}
                    {["APPROVED", "SUSPENDED"].includes(ps.status) && (
                      <button
                        type="button"
                        disabled={busy}
                        onClick={() =>
                          onAction("respond_partnership", {
                            partnershipId: ps.id,
                            decision: "REMOVE",
                            confirmAuthorityApproval: true,
                            reason: "Partnerlik ilişkisi sonlandırıldı.",
                          })
                        }
                        className="rounded-md border border-zinc-700 px-2.5 py-1 text-[11px] text-zinc-400 hover:text-rose-300 hover:border-rose-500/40"
                      >
                        Sonlandır
                      </button>
                    )}
                  </div>

                  <button
                    type="button"
                    onClick={() => setExpandedHistoryId(isExpanded ? null : ps.id)}
                    className="text-[11px] text-sky-400 hover:text-sky-300"
                  >
                    Geçmiş ({ps.history?.length || 0})
                  </button>
                </div>

                {isExpanded && (
                  <div className="rounded-lg bg-zinc-950/70 border border-zinc-800 p-2.5 space-y-1.5">
                    <div className="text-[11px] font-medium text-zinc-300">İlişki Durum Geçmişi</div>
                    {(ps.history || []).length === 0 ? (
                      <p className="text-[11px] text-zinc-500">Geçmiş kaydı yok.</p>
                    ) : (
                      (ps.history || []).map((h: any) => (
                        <div key={h.id} className="text-[11px] text-zinc-400 flex justify-between gap-2">
                          <span>
                            {h.fromStatus ? `${h.fromStatus} → ` : ""}
                            <strong className="text-zinc-200">{h.toStatus}</strong> · {h.reason || "—"} ({h.actorName || "Sistem"})
                          </span>
                          <span className="shrink-0 text-zinc-500">{formatDateTimeTrB2b(h.createdAt)}</span>
                        </div>
                      ))
                    )}
                  </div>
                )}
              </div>
            )
          })}
          {partnerships.length === 0 && (
            <div className="col-span-full rounded-xl border border-dashed border-zinc-800 p-8 text-center text-xs text-zinc-500">
              Bu firma perspektifi için henüz partnerlik kaydı bulunmuyor.
            </div>
          )}
        </div>
      </div>
    )
  }

  // TAB 2: ORTAK KAYNAK HAVUZU & PARTNER MÜSAİTLİK TAKVİMİ
  const ownResources: any[] = data.ownResources || []
  const partnerPool: any[] = data.partnerPoolResources || []

  return (
    <div className="space-y-6">
      {/* BÖLÜM 1: PARTNER HAVUZU VE MÜSAİTLİK */}
      <div className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-base font-semibold text-zinc-100 flex items-center gap-2">
              <Globe className="h-4 w-4 text-[--brand]" /> Onaylı Partnerlerin Ortak Kaynak Havuzu
            </h2>
            <p className="text-xs text-zinc-400">
              Yalnızca onaylı partnerlerinizin bu firmaya açtığı kaynaklar veri minimizasyonu uygulanarak listelenir.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <select
              value={filterType}
              onChange={(e) => {
                setFilterType(e.target.value)
                onFilterPool({ resourceType: e.target.value, search: filterSearch, startAt: filterStart, endAt: filterEnd })
              }}
              className="rounded-lg border border-zinc-700 bg-zinc-950 px-2.5 py-1.5 text-xs text-zinc-200"
            >
              <option value="ALL">Tüm Kaynak Tipleri</option>
              {Object.entries(B2B_RESOURCE_TYPE_META).map(([k, v]) => (
                <option key={k} value={k}>
                  {v.label}
                </option>
              ))}
            </select>
            <input
              type="date"
              value={filterStart}
              onChange={(e) => {
                setFilterStart(e.target.value)
                onFilterPool({ resourceType: filterType, search: filterSearch, startAt: e.target.value, endAt: filterEnd })
              }}
              className="rounded-lg border border-zinc-700 bg-zinc-950 px-2 py-1.5 text-xs text-zinc-200"
            />
            <input
              type="date"
              value={filterEnd}
              onChange={(e) => {
                setFilterEnd(e.target.value)
                onFilterPool({ resourceType: filterType, search: filterSearch, startAt: filterStart, endAt: e.target.value })
              }}
              className="rounded-lg border border-zinc-700 bg-zinc-950 px-2 py-1.5 text-xs text-zinc-200"
            />
            <div className="relative">
              <Search className="h-3.5 w-3.5 text-zinc-500 absolute left-2.5 top-2" />
              <input
                type="text"
                placeholder="Kaynak, şehir, partner ara..."
                value={filterSearch}
                onChange={(e) => {
                  setFilterSearch(e.target.value)
                  onFilterPool({ resourceType: filterType, search: e.target.value, startAt: filterStart, endAt: filterEnd })
                }}
                className="rounded-lg border border-zinc-700 bg-zinc-950 pl-8 pr-3 py-1.5 text-xs text-zinc-200 w-52"
              />
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
          {partnerPool.map((res) => {
            const typeMeta = B2B_RESOURCE_TYPE_META[res.resourceType] || { label: res.resourceType, unitLabel: "Gün" }
            return (
              <div key={res.id} className="rounded-xl border border-zinc-800 bg-zinc-900/70 p-4 flex flex-col justify-between gap-3">
                <div className="space-y-2">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <span className="text-[10px] uppercase tracking-wider text-sky-400 font-semibold">{typeMeta.label}</span>
                      <h3 className="text-sm font-semibold text-zinc-100">{res.title}</h3>
                      <p className="text-[11px] text-zinc-400">
                        Sahip: <span className="text-zinc-200">{res.ownerCompanyName}</span> · {res.city || "—"}
                      </p>
                    </div>
                    <span
                      className={`rounded-full border px-2 py-0.5 text-[10px] font-medium ${
                        res.isAvailableForRange
                          ? "bg-[--brand]/15 text-[--brand] border-[--brand-line]"
                          : "bg-rose-500/15 text-rose-300 border-rose-500/30"
                      }`}
                    >
                      {res.isAvailableForRange ? "Müsait" : "Dolu / Çakışma"}
                    </span>
                  </div>

                  <div className="grid grid-cols-3 gap-2 rounded-lg bg-zinc-950/60 p-2 text-xs">
                    <div>
                      <span className="text-[10px] text-zinc-500 block">Partner Fiyatı</span>
                      <span className="text-[--brand] font-semibold">
                        {formatTryB2b(res.netPartnerRateTry)}/{typeMeta.unitLabel}
                      </span>
                    </div>
                    <div>
                      <span className="text-[10px] text-zinc-500 block">Komisyon</span>
                      <span className="text-zinc-200">%{res.commissionRatePct}</span>
                    </div>
                    <div>
                      <span className="text-[10px] text-zinc-500 block">Onay</span>
                      <span className="text-zinc-200">{res.approvalMode === "AUTO" ? "Otomatik" : "Sahip Onayı"}</span>
                    </div>
                  </div>

                  {res.maskedFieldsNotice ? (
                    <div className="flex items-center gap-1.5 rounded-md bg-sky-500/10 border border-sky-500/20 px-2.5 py-1.5 text-[11px] text-sky-300">
                      <Lock className="h-3.5 w-3.5 shrink-0" />
                      <span>Veri minimizasyonu: Plaka/şasi/dahili telefon gizli.</span>
                    </div>
                  ) : res.sensitiveMeta?.plate ? (
                    <div className="text-[11px] text-zinc-400">Paylaşılan Referans: {res.sensitiveMeta.plate}</div>
                  ) : null}

                  {res.bookedWindows?.length > 0 && (
                    <div className="text-[11px] text-zinc-400 flex items-center gap-1">
                      <CalendarDays className="h-3 w-3 text-amber-400" />
                      <span>
                        Dolu pencereler:{" "}
                        {res.bookedWindows
                          .slice(0, 2)
                          .map((w: any) => `${formatDateTrB2b(w.startAt)}–${formatDateTrB2b(w.endAt)}`)
                          .join(", ")}
                      </span>
                    </div>
                  )}
                </div>

                <button
                  type="button"
                  disabled={busy}
                  onClick={() => {
                    setBookingTarget(res)
                    setBookGuest("")
                    setBookNotes("")
                  }}
                  className="w-full rounded-lg bg-[--brand]/90 px-3 py-2 text-xs font-medium text-white hover:bg-[--brand] disabled:opacity-50"
                >
                  White-Label Çapraz Rezervasyon Aç
                </button>
              </div>
            )
          })}
          {partnerPool.length === 0 && (
            <div className="col-span-full rounded-xl border border-dashed border-zinc-800 p-8 text-center text-xs text-zinc-500">
              Seçili kriterlere uygun onaylı partner kaynağı bulunamadı.
            </div>
          )}
        </div>
      </div>

      {/* BÖLÜM 2: KENDİ PAYLAŞTIĞIM KAYNAKLAR */}
      <div className="space-y-3 pt-4 border-t border-zinc-800">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-base font-semibold text-zinc-100 flex items-center gap-2">
              <Users className="h-4 w-4 text-sky-400" /> Kendi Paylaştığım Kaynaklar ({ownResources.length})
            </h2>
            <p className="text-xs text-zinc-400">
              Kaynak paylaşımdan çekildiğinde mevcut onaylı çapraz rezervasyonlar korunur; yalnızca yeni talepler kapanır.
            </p>
          </div>
          <button
            type="button"
            disabled={busy}
            onClick={() => setResModalOpen(true)}
            className="inline-flex items-center gap-1.5 rounded-lg bg-sky-600 px-3 py-2 text-xs font-medium text-white hover:bg-sky-500"
          >
            <Plus className="h-3.5 w-3.5" /> Havuza Yeni Kaynak Aç
          </button>
        </div>

        <div className="overflow-x-auto rounded-xl border border-zinc-800 bg-zinc-900/60">
          <table className="w-full text-left text-xs">
            <thead className="border-b border-zinc-800 text-[11px] text-zinc-400 bg-zinc-950/50">
              <tr>
                <th className="px-3 py-2.5">Kaynak</th>
                <th className="px-3 py-2.5">Tip / Şehir</th>
                <th className="px-3 py-2.5">Fiyat & Komisyon</th>
                <th className="px-3 py-2.5">Görünürlük / Gizlilik</th>
                <th className="px-3 py-2.5">Durum</th>
                <th className="px-3 py-2.5 text-right">İşlem</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800/70">
              {ownResources.map((r) => {
                const st = B2B_RESOURCE_STATUS_META[r.status] || { label: r.status, badgeClass: "bg-zinc-700 text-zinc-200 border-zinc-600" }
                return (
                  <tr key={r.id} className="hover:bg-zinc-800/30">
                    <td className="px-3 py-2.5">
                      <div className="font-medium text-zinc-100">{r.title}</div>
                      <div className="text-[11px] text-zinc-500">
                        {B2B_APPROVAL_MODE_LABELS[r.approvalMode] || r.approvalMode} · Min. {r.minDurationDays} gün · {r.activeCrossBookingCount} aktif rez.
                      </div>
                    </td>
                    <td className="px-3 py-2.5 text-zinc-300">
                      {B2B_RESOURCE_TYPE_META[r.resourceType]?.label || r.resourceType}
                      <div className="text-[11px] text-zinc-500">{r.city || "—"}</div>
                    </td>
                    <td className="px-3 py-2.5">
                      <span className="text-[--brand] font-medium">{formatTryB2b(r.netPartnerRateTry)}</span>
                      <div className="text-[11px] text-zinc-500">%{r.commissionRatePct} komisyon</div>
                    </td>
                    <td className="px-3 py-2.5 text-zinc-300">
                      <div>{B2B_VISIBILITY_LABELS[r.visibilityScope] || r.visibilityScope}</div>
                      <div className="text-[11px] text-sky-400">
                        {r.hideSensitiveFields ? "Hassas alanlar gizli" : "Hassas alanlar açık"}
                      </div>
                    </td>
                    <td className="px-3 py-2.5">
                      <span className={`inline-flex rounded-full border px-2 py-0.5 text-[10px] font-medium ${st.badgeClass}`}>
                        {st.label}
                      </span>
                    </td>
                    <td className="px-3 py-2.5 text-right">
                      {r.status === "ACTIVE" ? (
                        <button
                          type="button"
                          disabled={busy}
                          onClick={() =>
                            onAction("toggle_shared_resource", {
                              sharedResourceId: r.id,
                              nextStatus: "PAUSED",
                              reason: "Yeni taleplere duraklatıldı; mevcut onaylı rezervasyonlar korundu.",
                            })
                          }
                          className="rounded-md border border-amber-500/40 bg-amber-500/10 px-2.5 py-1 text-[11px] text-amber-300 hover:bg-amber-500/20"
                        >
                          Duraklat / Çek
                        </button>
                      ) : (
                        <button
                          type="button"
                          disabled={busy}
                          onClick={() =>
                            onAction("toggle_shared_resource", {
                              sharedResourceId: r.id,
                              nextStatus: "ACTIVE",
                              reason: "Kaynak yeniden paylaşıma açıldı.",
                            })
                          }
                          className="rounded-md bg-[--brand]/80 px-2.5 py-1 text-[11px] text-white hover:bg-[--brand]"
                        >
                          Paylaşıma Aç
                        </button>
                      )}
                    </td>
                  </tr>
                )
              })}
              {ownResources.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-4 py-6 text-center text-zinc-500">
                    Bu firmanın henüz ortak havuza açtığı bir kaynak yok.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* YENİ KAYNAK PAYLAŞIM MODALI */}
      {resModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
          <div className="w-full max-w-xl rounded-xl border border-zinc-700 bg-zinc-900 p-5 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-zinc-100">Ortak Kaynak Havuzuna Kaynak Aç</h3>
              <button type="button" onClick={() => setResModalOpen(false)} className="text-zinc-400 hover:text-zinc-100">
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="grid grid-cols-2 gap-3 text-xs">
              <div>
                <label className="block text-[11px] text-zinc-400 mb-1">Kaynak Tipi</label>
                <select value={resType} onChange={(e) => setResType(e.target.value)} className="w-full rounded-lg border border-zinc-700 bg-zinc-950 px-2.5 py-2 text-zinc-100">
                  {Object.entries(B2B_RESOURCE_TYPE_META).map(([k, v]) => (
                    <option key={k} value={k}>{v.label}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-[11px] text-zinc-400 mb-1">Şehir</label>
                <input value={resCity} onChange={(e) => setResCity(e.target.value)} className="w-full rounded-lg border border-zinc-700 bg-zinc-950 px-2.5 py-2 text-zinc-100" />
              </div>
              <div className="col-span-2">
                <label className="block text-[11px] text-zinc-400 mb-1">Kaynak Başlığı</label>
                <input value={resTitle} onChange={(e) => setResTitle(e.target.value)} placeholder="Örn: VIP Mercedes Vito 8+1 veya Deluxe Oda Bloğu" className="w-full rounded-lg border border-zinc-700 bg-zinc-950 px-2.5 py-2 text-zinc-100" />
              </div>
              <div>
                <label className="block text-[11px] text-zinc-400 mb-1">Kategori</label>
                <input value={resCategory} onChange={(e) => setResCategory(e.target.value)} placeholder="VIP / Deluxe / Rehber" className="w-full rounded-lg border border-zinc-700 bg-zinc-950 px-2.5 py-2 text-zinc-100" />
              </div>
              <div>
                <label className="block text-[11px] text-zinc-400 mb-1">Kapasite</label>
                <input type="number" min={1} value={resCapacity} onChange={(e) => setResCapacity(e.target.value)} className="w-full rounded-lg border border-zinc-700 bg-zinc-950 px-2.5 py-2 text-zinc-100" />
              </div>
              <div>
                <label className="block text-[11px] text-zinc-400 mb-1">Partner Birim Fiyatı (TRY)</label>
                <input type="number" min={1} value={resRate} onChange={(e) => setResRate(e.target.value)} className="w-full rounded-lg border border-zinc-700 bg-zinc-950 px-2.5 py-2 text-zinc-100" />
              </div>
              <div>
                <label className="block text-[11px] text-zinc-400 mb-1">Komisyon (%) / Min. Gün</label>
                <div className="grid grid-cols-2 gap-2">
                  <input type="number" min={0} max={40} value={resCommission} onChange={(e) => setResCommission(e.target.value)} className="rounded-lg border border-zinc-700 bg-zinc-950 px-2 py-2 text-zinc-100" />
                  <input type="number" min={1} value={resMinDays} onChange={(e) => setResMinDays(e.target.value)} className="rounded-lg border border-zinc-700 bg-zinc-950 px-2 py-2 text-zinc-100" />
                </div>
              </div>
              <div>
                <label className="block text-[11px] text-zinc-400 mb-1">Görünürlük Kapsamı</label>
                <select value={resVisibility} onChange={(e) => setResVisibility(e.target.value)} className="w-full rounded-lg border border-zinc-700 bg-zinc-950 px-2.5 py-2 text-zinc-100">
                  <option value="ALL_APPROVED_PARTNERS">Tüm Onaylı Partnerler</option>
                  <option value="PRIVATE">Sadece Kendi Firmam (Kapalı)</option>
                </select>
              </div>
              <div>
                <label className="block text-[11px] text-zinc-400 mb-1">Onay Kuralı</label>
                <select value={resApprovalMode} onChange={(e) => setResApprovalMode(e.target.value)} className="w-full rounded-lg border border-zinc-700 bg-zinc-950 px-2.5 py-2 text-zinc-100">
                  <option value="MANUAL">Sahip Firma Onayı</option>
                  <option value="AUTO">Otomatik Onay</option>
                </select>
              </div>
              <div>
                <label className="block text-[11px] text-zinc-400 mb-1">Dahili Plaka / Kod (Opsiyonel)</label>
                <input value={resPlate} onChange={(e) => setResPlate(e.target.value)} placeholder="35 ORN 001" className="w-full rounded-lg border border-zinc-700 bg-zinc-950 px-2.5 py-2 text-zinc-100" />
              </div>
              <div>
                <label className="block text-[11px] text-zinc-400 mb-1">Dahili İletişim (Opsiyonel)</label>
                <input value={resPhone} onChange={(e) => setResPhone(e.target.value)} placeholder="+90 555 ..." className="w-full rounded-lg border border-zinc-700 bg-zinc-950 px-2.5 py-2 text-zinc-100" />
              </div>
              <label className="col-span-2 flex items-center gap-2 rounded-lg border border-sky-500/30 bg-sky-500/10 p-2.5 text-sky-200 cursor-pointer">
                <input type="checkbox" checked={resHideSensitive} onChange={(e) => setResHideSensitive(e.target.checked)} />
                <span>Veri Minimizasyonu: Plaka, şasi ve dahili iletişim bilgilerini partner firmalardan gizle</span>
              </label>
            </div>
            <div className="flex justify-end gap-2">
              <button type="button" onClick={() => setResModalOpen(false)} className="rounded-lg border border-zinc-700 px-3 py-1.5 text-xs text-zinc-300">
                Vazgeç
              </button>
              <button
                type="button"
                disabled={busy || !resTitle.trim()}
                onClick={async () => {
                  const ok = await onAction("upsert_shared_resource", {
                    resourceType: resType,
                    title: resTitle,
                    category: resCategory,
                    city: resCity,
                    capacity: Number(resCapacity),
                    netPartnerRateTry: Number(resRate),
                    commissionRatePct: Number(resCommission),
                    minDurationDays: Number(resMinDays),
                    visibilityScope: resVisibility,
                    approvalMode: resApprovalMode,
                    hideSensitiveFields: resHideSensitive,
                    sensitiveMeta: resPlate || resPhone ? { plate: resPlate || undefined, contactPhone: resPhone || undefined } : undefined,
                  })
                  if (ok) {
                    setResModalOpen(false)
                    setResTitle("")
                  }
                }}
                className="rounded-lg bg-sky-600 px-4 py-1.5 text-xs font-medium text-white hover:bg-sky-500 disabled:opacity-50"
              >
                Kaynağı Havuza Aç
              </button>
            </div>
          </div>
        </div>
      )}

      {/* WHITE-LABEL ÇAPRAZ REZERVASYON MODALI */}
      {bookingTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
          <div className="w-full max-w-lg rounded-xl border border-[--brand-line] bg-zinc-900 p-5 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-semibold text-zinc-100">Atomik Çapraz Rezervasyon Oluştur</h3>
                <p className="text-[11px] text-zinc-400">
                  {bookingTarget.title} · Sahip: {bookingTarget.ownerCompanyName}
                </p>
              </div>
              <button type="button" onClick={() => setBookingTarget(null)} className="text-zinc-400 hover:text-zinc-100">
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="grid grid-cols-2 gap-3 text-xs">
              <div>
                <label className="block text-[11px] text-zinc-400 mb-1">Başlangıç Tarihi</label>
                <input type="date" value={bookStart} onChange={(e) => setBookStart(e.target.value)} className="w-full rounded-lg border border-zinc-700 bg-zinc-950 px-2.5 py-2 text-zinc-100" />
              </div>
              <div>
                <label className="block text-[11px] text-zinc-400 mb-1">Bitiş Tarihi</label>
                <input type="date" value={bookEnd} onChange={(e) => setBookEnd(e.target.value)} className="w-full rounded-lg border border-zinc-700 bg-zinc-950 px-2.5 py-2 text-zinc-100" />
              </div>
              <div>
                <label className="block text-[11px] text-zinc-400 mb-1">Adet / Oda / Koltuk</label>
                <input type="number" min={1} max={bookingTarget.capacity || 20} value={bookQty} onChange={(e) => setBookQty(e.target.value)} className="w-full rounded-lg border border-zinc-700 bg-zinc-950 px-2.5 py-2 text-zinc-100" />
              </div>
              <div>
                <label className="block text-[11px] text-zinc-400 mb-1">Müşteri / Grup Etiketi</label>
                <input value={bookGuest} onChange={(e) => setBookGuest(e.target.value)} placeholder="Örn: Örnek Grup Transferi" className="w-full rounded-lg border border-zinc-700 bg-zinc-950 px-2.5 py-2 text-zinc-100" />
              </div>
              <div className="col-span-2">
                <label className="block text-[11px] text-zinc-400 mb-1">Operasyon Notu</label>
                <input value={bookNotes} onChange={(e) => setBookNotes(e.target.value)} placeholder="Teslim saati / özel talep..." className="w-full rounded-lg border border-zinc-700 bg-zinc-950 px-2.5 py-2 text-zinc-100" />
              </div>
              <label className="col-span-2 flex items-center gap-2 text-zinc-300 cursor-pointer">
                <input type="checkbox" checked={bookWhiteLabel} onChange={(e) => setBookWhiteLabel(e.target.checked)} />
                <span>White-label kiralama (kendi firma markamızla müşteriye sunulacak)</span>
              </label>
            </div>
            <div className="rounded-lg bg-zinc-950/70 border border-zinc-800 p-2.5 text-[11px] text-zinc-400 flex items-center gap-2">
              <ShieldCheck className="h-4 w-4 text-[--brand] shrink-0" />
              <span>
                Sunucu çakışma kilidi aktif: Tarih çakışması varsa HTTP 409 ile reddedilir ve alternatif kaynaklar önerilir; hata durumunda iki taraf da geri alınır.
              </span>
            </div>
            <div className="flex justify-end gap-2">
              <button type="button" onClick={() => setBookingTarget(null)} className="rounded-lg border border-zinc-700 px-3 py-1.5 text-xs text-zinc-300">
                Vazgeç
              </button>
              <button
                type="button"
                disabled={busy}
                onClick={async () => {
                  const ok = await onAction("create_cross_reservation", {
                    sharedResourceId: bookingTarget.id,
                    startAt: `${bookStart}T09:00:00.000Z`,
                    endAt: `${bookEnd}T18:00:00.000Z`,
                    quantity: Number(bookQty),
                    isWhiteLabel: bookWhiteLabel,
                    guestOrCustomerLabel: bookGuest || "White-Label Müşteri",
                    notes: bookNotes,
                  })
                  if (ok) setBookingTarget(null)
                }}
                className="rounded-lg bg-[--brand] px-4 py-1.5 text-xs font-medium text-white hover:bg-[--brand] disabled:opacity-50"
              >
                Rezervasyonu Oluştur
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
