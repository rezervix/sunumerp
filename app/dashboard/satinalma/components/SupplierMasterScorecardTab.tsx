"use client"

import React, { useState } from "react"
import Link from "next/link"
import {
  Building2,
  ShieldCheck,
  ShieldAlert,
  AlertTriangle,
  FileCheck2,
  KeyRound,
  Plus,
  Edit,
  Copy,
  Check,
  RefreshCw,
  Settings,
  BarChart3,
  Upload,
  CheckCircle2,
  ExternalLink,
  Search,
} from "lucide-react"
import {
  DOC_STATUS_LABELS,
  DOC_TYPE_LABELS,
  SUPPLIER_APPROVAL_BADGES,
  SUPPLIER_APPROVAL_LABELS,
  SUPPLIER_CATEGORY_LABELS,
  SUPPLIER_CRITICALITY_LABELS,
  validateGln13,
  generateGln13,
} from "@/lib/logistics/procurement/constantsAndHelpers"

interface SupplierMasterScorecardTabProps {
  suppliers: any[]
  scorecards: any
  documents: any[]
  invites: any[]
  items: any[]
  onRefresh: () => Promise<void>
  onNotify: (msg: string, isError?: boolean) => void
}

export default function SupplierMasterScorecardTab({
  suppliers,
  scorecards,
  documents,
  invites,
  items,
  onRefresh,
  onNotify,
}: SupplierMasterScorecardTabProps) {
  const [search, setSearch] = useState("")
  const [statusFilter, setStatusFilter] = useState("ALL")
  const [subView, setSubView] = useState<"directory" | "scorecards" | "documents">("directory")

  // Supplier Modal
  const [editingSupplier, setEditingSupplier] = useState<any | null>(null)
  const [supplierForm, setSupplierForm] = useState({
    id: "",
    code: "",
    name: "",
    contactPerson: "",
    email: "",
    phone: "",
    glnNumber: "",
    category: "KESME_CICEK",
    criticalityLevel: "ORTA",
    approvalStatus: "ONAYLI",
    blacklistedReason: "",
    leadTimeDays: "3",
    paymentTermsDays: "30",
    iban: "",
    taxNumber: "",
    notes: "",
  })
  const [savingSupplier, setSavingSupplier] = useState(false)

  // Portal Davet Modal / Banner
  const [latestInviteUrl, setLatestInviteUrl] = useState<string>("")
  const [copiedInvite, setCopiedInvite] = useState(false)

  // Skor Kartı Ağırlıkları
  const cfg = scorecards?.config || {
    otdWeight: 35,
    qtyWeight: 25,
    qualityWeight: 25,
    priceWeight: 15,
  }
  const [weights, setWeights] = useState({
    otdWeight: String(cfg.otdWeight),
    qtyWeight: String(cfg.qtyWeight),
    qualityWeight: String(cfg.qualityWeight),
    priceWeight: String(cfg.priceWeight),
  })
  const [savingWeights, setSavingWeights] = useState(false)

  // Belge Ekleme Formu
  const [docFormOpen, setDocFormOpen] = useState(false)
  const [docForm, setDocForm] = useState({
    supplierId: suppliers[0]?.id || "",
    docType: "ISO_KALITE",
    title: "",
    fileName: "sertifika-2026.pdf",
    expiresAt: "2027-06-30",
    notes: "",
  })

  // Katalog Ürün Bağlama
  const [linkForm, setLinkForm] = useState({
    supplierId: suppliers[0]?.id || "",
    itemId: items[0]?.id || "",
    unitCost: "45",
    moq: "25",
    leadTimeDays: "3",
    isPrimary: false,
  })
  const [linkModalOpen, setLinkModalOpen] = useState(false)

  const filteredSuppliers = suppliers.filter((s) => {
    if (statusFilter !== "ALL" && s.approvalStatus !== statusFilter) return false
    if (search.trim()) {
      const q = search.trim().toLowerCase()
      return (
        s.name?.toLowerCase().includes(q) ||
        s.code?.toLowerCase().includes(q) ||
        (s.glnNumber && s.glnNumber.toLowerCase().includes(q))
      )
    }
    return true
  })

  const openCreateSupplier = () => {
    setEditingSupplier({ isNew: true })
    setSupplierForm({
      id: "",
      code: "",
      name: "",
      contactPerson: "",
      email: "",
      phone: "",
      glnNumber: generateGln13(`869850${String(Math.floor(100000 + Math.random() * 899999))}`),
      category: "KESME_CICEK",
      criticalityLevel: "ORTA",
      approvalStatus: "ONAYLI",
      blacklistedReason: "",
      leadTimeDays: "3",
      paymentTermsDays: "30",
      iban: "",
      taxNumber: "",
      notes: "",
    })
  }

  const openEditSupplier = (s: any) => {
    setEditingSupplier(s)
    setSupplierForm({
      id: s.id,
      code: s.code || "",
      name: s.name || "",
      contactPerson: s.contactPerson || "",
      email: s.email || "",
      phone: s.phone || "",
      glnNumber: s.glnNumber || "",
      category: s.category || "GENEL",
      criticalityLevel: s.criticalityLevel || "ORTA",
      approvalStatus: s.approvalStatus || "ONAYLI",
      blacklistedReason: s.blacklistedReason || "",
      leadTimeDays: String(s.leadTimeDays ?? 5),
      paymentTermsDays: String(s.paymentTermsDays ?? 30),
      iban: s.iban || "",
      taxNumber: s.taxNumber || "",
      notes: s.notes || "",
    })
  }

  const handleSaveSupplier = async (e: React.FormEvent) => {
    e.preventDefault()
    if (supplierForm.glnNumber.trim()) {
      const check = validateGln13(supplierForm.glnNumber)
      if (!check.valid) {
        onNotify(check.reason || "GLN-13 geçersiz.", true)
        return
      }
    }
    setSavingSupplier(true)
    try {
      const res = await fetch("/api/procurement", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "upsert_supplier",
          ...supplierForm,
          leadTimeDays: Number(supplierForm.leadTimeDays),
          paymentTermsDays: Number(supplierForm.paymentTermsDays),
        }),
      })
      const data = await res.json()
      if (!res.ok || !data.success) {
        onNotify(data.error || "Tedarikçi kaydedilemedi.", true)
        return
      }
      onNotify(data.message || "Tedarikçi kartı kaydedildi.")
      setEditingSupplier(null)
      await onRefresh()
    } finally {
      setSavingSupplier(false)
    }
  }

  const handleCreateInvite = async (supplier: any) => {
    const res = await fetch("/api/procurement", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "create_portal_invite",
        supplierId: supplier.id,
        purpose: "PORTAL_ACCESS",
        expiresInHours: 168,
      }),
    })
    const data = await res.json()
    if (!res.ok || !data.success) {
      onNotify(data.error || "Davet linki oluşturulamadı.", true)
      return
    }
    const fullUrl =
      typeof window !== "undefined" ? `${window.location.origin}${data.portalPath}` : data.portalPath
    setLatestInviteUrl(fullUrl)
    onNotify(data.message)
    await onRefresh()
  }

  const handleSaveWeights = async () => {
    setSavingWeights(true)
    try {
      const res = await fetch("/api/procurement", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "update_scorecard_weights",
          otdWeight: Number(weights.otdWeight),
          qtyWeight: Number(weights.qtyWeight),
          qualityWeight: Number(weights.qualityWeight),
          priceWeight: Number(weights.priceWeight),
        }),
      })
      const data = await res.json()
      if (!res.ok || !data.success) {
        onNotify(data.error || "Skor ağırlıkları güncellenemedi.", true)
        return
      }
      onNotify(data.message)
      await onRefresh()
    } finally {
      setSavingWeights(false)
    }
  }

  const handleSaveDocument = async (e: React.FormEvent) => {
    e.preventDefault()
    const res = await fetch("/api/procurement", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "upload_supplier_document",
        ...docForm,
        fileUrl: `/uploads/supplier-docs/${encodeURIComponent(docForm.fileName)}`,
      }),
    })
    const data = await res.json()
    if (!res.ok || !data.success) {
      onNotify(data.error || "Belge kaydedilemedi.", true)
      return
    }
    onNotify(data.message)
    setDocFormOpen(false)
    await onRefresh()
  }

  const handleReviewDoc = async (docId: string, decision: "ONAYLA" | "SURESI_DOLMUS") => {
    const res = await fetch("/api/procurement", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "review_supplier_document", docId, decision }),
    })
    const data = await res.json()
    if (!res.ok || !data.success) {
      onNotify(data.error || "Belge durumu güncellenemedi.", true)
      return
    }
    onNotify(data.message)
    await onRefresh()
  }

  const handleSaveItemLink = async (e: React.FormEvent) => {
    e.preventDefault()
    const res = await fetch("/api/procurement", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "upsert_supplier_item_link",
        ...linkForm,
        unitCost: Number(linkForm.unitCost),
        moq: Number(linkForm.moq),
        leadTimeDays: Number(linkForm.leadTimeDays),
      }),
    })
    const data = await res.json()
    if (!res.ok || !data.success) {
      onNotify(data.error || "Katalog bağlantısı kaydedilemedi.", true)
      return
    }
    onNotify(data.message)
    setLinkModalOpen(false)
    await onRefresh()
  }

  const weightSum =
    Number(weights.otdWeight || 0) +
    Number(weights.qtyWeight || 0) +
    Number(weights.qualityWeight || 0) +
    Number(weights.priceWeight || 0)

  return (
    <div className="space-y-4">
      {/* Üst Alt-Görünüm Geçişi & Aksiyonlar */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-white/[0.07] bg-[#121614]/85 p-3">
        <div className="flex flex-wrap gap-1.5">
          {[
            { id: "directory", label: `Tedarikçi Ana Kartları (${suppliers.length})`, icon: Building2 },
            { id: "scorecards", label: "Performans Skor Kartı & Trend", icon: BarChart3 },
            { id: "documents", label: `Sözleşme & Belgeler (${documents.length})`, icon: FileCheck2 },
          ].map((tab) => {
            const Icon = tab.icon
            const active = subView === tab.id
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setSubView(tab.id as any)}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium transition-colors ${
                  active
                    ? "bg-[#34D399]/15 text-[#34D399] border border-[#34D399]/30"
                    : "text-zinc-400 hover:text-zinc-200 border border-transparent"
                }`}
              >
                <Icon className="size-3.5" />
                {tab.label}
              </button>
            )
          })}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => setLinkModalOpen(true)}
            className="inline-flex items-center gap-1.5 h-8 px-3 rounded-xl border border-white/10 bg-white/[0.04] hover:bg-white/[0.08] text-xs text-zinc-200"
          >
            <Plus className="size-3.5 text-[#34D399]" />
            Katalog Ürün Bağla
          </button>
          <button
            type="button"
            onClick={openCreateSupplier}
            data-testid="new-supplier-btn"
            className="inline-flex items-center gap-1.5 h-8 px-3.5 rounded-xl bg-[#34D399] hover:bg-[#34D399]/90 text-[#061811] text-xs font-semibold"
          >
            <Plus className="size-3.5" />
            Yeni Tedarikçi Ekle
          </button>
        </div>
      </div>

      {/* Oluşturulan İmzalı Davet Linki Banner */}
      {latestInviteUrl && (
        <div className="rounded-2xl border border-[#34D399]/30 bg-[#34D399]/[0.07] p-3.5 flex flex-wrap items-center justify-between gap-3">
          <div className="min-w-0 flex-1 space-y-1">
            <div className="flex items-center gap-1.5 text-xs font-semibold text-[#34D399]">
              <KeyRound className="size-4" />
              <span>İmzalı Tedarikçi Portal Davet Bağlantısı (7 Gün Geçerli)</span>
            </div>
            <div className="text-[11px] font-mono text-zinc-200 truncate">{latestInviteUrl}</div>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => {
                navigator.clipboard?.writeText(latestInviteUrl)
                setCopiedInvite(true)
                setTimeout(() => setCopiedInvite(false), 2000)
              }}
              className="inline-flex items-center gap-1 h-8 px-3 rounded-lg bg-white/10 hover:bg-white/15 text-xs text-white"
            >
              {copiedInvite ? <Check className="size-3.5 text-[#34D399]" /> : <Copy className="size-3.5" />}
              {copiedInvite ? "Kopyalandı" : "Kopyala"}
            </button>
            <a
              href={latestInviteUrl}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1 h-8 px-3 rounded-lg bg-[#34D399] text-[#061811] text-xs font-semibold"
            >
              <ExternalLink className="size-3.5" />
              Portalda Aç
            </a>
          </div>
        </div>
      )}

      {/* 1. TEDARİKÇİ ANA KARTLARI */}
      {subView === "directory" && (
        <div className="space-y-3">
          <div className="flex flex-wrap items-center gap-2">
            <div className="relative flex-1 min-w-[220px]">
              <Search className="size-3.5 text-zinc-500 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Tedarikçi adı, kodu veya GLN-13 ile ara..."
                className="w-full h-9 pl-9 pr-3 rounded-xl border border-white/10 bg-[#0D100F] text-xs text-zinc-100 placeholder:text-zinc-500 focus:outline-none focus:border-[#34D399]"
              />
            </div>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="h-9 rounded-xl border border-white/10 bg-[#0D100F] px-3 text-xs text-zinc-200"
            >
              <option value="ALL">Tüm Onay Durumları</option>
              <option value="ONAYLI">Onaylı</option>
              <option value="ASKIDA">Askıda</option>
              <option value="KARALISTE">Kara Liste</option>
              <option value="ADAY">Aday</option>
            </select>
          </div>

          <div className="overflow-x-auto rounded-2xl border border-white/[0.07] bg-[#121614]/80">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-white/[0.06] text-[11px] uppercase tracking-wider text-zinc-400">
                <tr>
                  <th className="py-3 px-4">Tedarikçi / GLN-13</th>
                  <th className="py-3 px-3">Kategori & Kritiklik</th>
                  <th className="py-3 px-3">Durum</th>
                  <th className="py-3 px-3 text-right">Skor (Sınıf)</th>
                  <th className="py-3 px-3 text-right">Termin / Vade</th>
                  <th className="py-3 px-3 text-center">Belgeler</th>
                  <th className="py-3 px-4 text-right">İşlemler</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/[0.04]">
                {filteredSuppliers.map((sup) => (
                  <tr key={sup.id} className="hover:bg-white/[0.02]">
                    <td className="py-3 px-4">
                      <div className="font-semibold text-zinc-100">{sup.name}</div>
                      <div className="text-[11px] font-mono text-zinc-400 mt-0.5">
                        {sup.code}
                        {sup.glnNumber ? ` · GLN ${sup.glnNumber}` : " · GLN Tanımsız"}
                      </div>
                      {sup.blacklistedReason && sup.approvalStatus === "KARALISTE" && (
                        <div className="text-[11px] text-rose-300 mt-0.5">
                          Engel Nedeni: {sup.blacklistedReason}
                        </div>
                      )}
                    </td>
                    <td className="py-3 px-3">
                      <div className="text-zinc-200">
                        {SUPPLIER_CATEGORY_LABELS[sup.category] || sup.category}
                      </div>
                      <div className="text-[11px] text-zinc-500">
                        Kritiklik: {SUPPLIER_CRITICALITY_LABELS[sup.criticalityLevel] || sup.criticalityLevel} ·{" "}
                        {sup.linkedItemCount} SKU
                      </div>
                    </td>
                    <td className="py-3 px-3">
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded-full border text-[11px] font-medium ${
                          SUPPLIER_APPROVAL_BADGES[sup.approvalStatus] || SUPPLIER_APPROVAL_BADGES.ADAY
                        }`}
                      >
                        {SUPPLIER_APPROVAL_LABELS[sup.approvalStatus] || sup.approvalStatus}
                      </span>
                    </td>
                    <td className="py-3 px-3 text-right font-mono">
                      <span className="font-semibold text-zinc-100">
                        {Number(sup.effectiveScore || 0).toFixed(1)}
                      </span>
                      <span
                        className={`ml-1.5 px-1.5 py-0.5 rounded text-[10px] font-bold ${
                          sup.effectiveTier === "A"
                            ? "bg-emerald-500/20 text-[#34D399]"
                            : sup.effectiveTier === "B"
                              ? "bg-sky-500/20 text-sky-300"
                              : sup.effectiveTier === "C"
                                ? "bg-amber-500/20 text-amber-300"
                                : "bg-rose-500/20 text-rose-300"
                        }`}
                      >
                        {sup.effectiveTier}
                      </span>
                    </td>
                    <td className="py-3 px-3 text-right">
                      <div className="text-zinc-200">{sup.leadTimeDays} Gün</div>
                      <div className="text-[11px] text-zinc-500">{sup.paymentTermsLabel}</div>
                    </td>
                    <td className="py-3 px-3 text-center">
                      <div className="inline-flex items-center gap-1 text-[11px]">
                        <span className="text-[#34D399]">{sup.documentSummary?.valid || 0} Geçerli</span>
                        {(sup.documentSummary?.expiringSoon || 0) > 0 && (
                          <span className="text-amber-300">· {sup.documentSummary.expiringSoon} Yakın</span>
                        )}
                        {(sup.documentSummary?.expired || 0) > 0 && (
                          <span className="text-rose-400">· {sup.documentSummary.expired} Süresi Dolmuş</span>
                        )}
                      </div>
                    </td>
                    <td className="py-3 px-4 text-right">
                      <div className="inline-flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => openEditSupplier(sup)}
                          className="h-7 px-2.5 rounded-lg border border-white/10 bg-white/[0.04] hover:bg-white/[0.08] text-zinc-200 inline-flex items-center gap-1"
                        >
                          <Edit className="size-3" />
                          Düzenle
                        </button>
                        {sup.approvalStatus !== "KARALISTE" && sup.isActive && (
                          <button
                            type="button"
                            onClick={() => handleCreateInvite(sup)}
                            className="h-7 px-2.5 rounded-lg border border-emerald-500/25 bg-emerald-500/10 hover:bg-emerald-500/20 text-[#34D399] inline-flex items-center gap-1"
                          >
                            <KeyRound className="size-3" />
                            Portal Daveti
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 2. PERFORMANS SKOR KARTI & YAPILANDIRMA */}
      {subView === "scorecards" && (
        <div className="space-y-4">
          {/* Ağırlık Yapılandırma Kartı */}
          <div className="rounded-2xl border border-white/[0.07] bg-[#121614]/85 p-4 space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2 text-sm font-semibold text-zinc-100">
                <Settings className="size-4 text-[#34D399]" />
                <span>Skor Kartı Formül Ağırlıkları (Toplam = %100)</span>
              </div>
              <div className="flex items-center gap-3 text-xs font-mono">
                <Link
                  href="/dashboard/lojistik-raporlar?module=satinalma"
                  className="font-sans text-[#34D399] hover:underline font-medium px-2.5 py-1 rounded-full bg-[#34D399]/10 border border-[#34D399]/20"
                >
                  Raporlar&apos;a Git →
                </Link>
                <div>
                  Toplam:{" "}
                  <span className={Math.abs(weightSum - 100) < 0.01 ? "text-[#34D399]" : "text-rose-400"}>
                    %{weightSum}
                  </span>
                </div>
              </div>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 items-end">
              <div>
                <label className="text-[11px] text-zinc-400">Zamanında Teslim (OTD %)</label>
                <input
                  type="number"
                  value={weights.otdWeight}
                  onChange={(e) => setWeights((w) => ({ ...w, otdWeight: e.target.value }))}
                  className="mt-1 w-full h-9 px-3 rounded-xl border border-white/10 bg-[#0A0D0C] text-xs text-white"
                />
              </div>
              <div>
                <label className="text-[11px] text-zinc-400">Miktar Uyumu (%)</label>
                <input
                  type="number"
                  value={weights.qtyWeight}
                  onChange={(e) => setWeights((w) => ({ ...w, qtyWeight: e.target.value }))}
                  className="mt-1 w-full h-9 px-3 rounded-xl border border-white/10 bg-[#0A0D0C] text-xs text-white"
                />
              </div>
              <div>
                <label className="text-[11px] text-zinc-400">Kalite Kabul (%)</label>
                <input
                  type="number"
                  value={weights.qualityWeight}
                  onChange={(e) => setWeights((w) => ({ ...w, qualityWeight: e.target.value }))}
                  className="mt-1 w-full h-9 px-3 rounded-xl border border-white/10 bg-[#0A0D0C] text-xs text-white"
                />
              </div>
              <div>
                <label className="text-[11px] text-zinc-400">Fiyat Tutarlılığı (%)</label>
                <input
                  type="number"
                  value={weights.priceWeight}
                  onChange={(e) => setWeights((w) => ({ ...w, priceWeight: e.target.value }))}
                  className="mt-1 w-full h-9 px-3 rounded-xl border border-white/10 bg-[#0A0D0C] text-xs text-white"
                />
              </div>
              <button
                type="button"
                disabled={savingWeights}
                onClick={handleSaveWeights}
                className="h-9 px-4 rounded-xl bg-[#34D399] hover:bg-[#34D399]/90 text-[#061811] text-xs font-semibold inline-flex items-center justify-center gap-1.5 disabled:opacity-50"
              >
                <RefreshCw className={`size-3.5 ${savingWeights ? "animate-spin" : ""}`} />
                Kaydet & Yeniden Puanla
              </button>
            </div>
          </div>

          {/* 6 Aylık Konsolide Trend */}
          {Array.isArray(scorecards?.monthlyTrend) && scorecards.monthlyTrend.length > 0 && (
            <div className="rounded-2xl border border-white/[0.07] bg-[#121614]/80 p-4">
              <div className="text-xs font-semibold text-zinc-200 mb-3">
                6 Aylık Tedarikçi Performans Trendi (Ortalama Bileşik Skor & OTD %)
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-6 gap-2.5">
                {scorecards.monthlyTrend.map((m: any) => (
                  <div
                    key={m.periodKey}
                    className="rounded-xl border border-white/[0.06] bg-[#0B0E0D] p-2.5 text-xs"
                  >
                    <div className="font-mono text-[11px] text-zinc-400">{m.periodKey}</div>
                    <div className="text-lg font-bold text-[#34D399] mt-0.5">
                      {m.avgCompositeScore}
                    </div>
                    <div className="text-[10px] text-zinc-400">
                      OTD %{m.avgOtdRate} · Kalite %{m.avgQualityRate}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Canlı Tedarikçi Sıralama Tablosu */}
          <div className="overflow-x-auto rounded-2xl border border-white/[0.07] bg-[#121614]/80">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-white/[0.06] text-[11px] uppercase text-zinc-400">
                <tr>
                  <th className="py-3 px-4">Tedarikçi</th>
                  <th className="py-3 px-3 text-right">PO Sayısı</th>
                  <th className="py-3 px-3 text-right">Zamanında (OTD)</th>
                  <th className="py-3 px-3 text-right">Miktar Uyumu</th>
                  <th className="py-3 px-3 text-right">Kalite Kabul</th>
                  <th className="py-3 px-3 text-right">Fiyat Sapma</th>
                  <th className="py-3 px-4 text-right">Bileşik Skor</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/[0.04]">
                {(scorecards?.liveSnapshots || []).map((row: any) => (
                  <tr key={row.id} className="hover:bg-white/[0.02]">
                    <td className="py-3 px-4">
                      <div className="font-medium text-zinc-100">{row.supplierName}</div>
                      <div className="text-[11px] font-mono text-zinc-500">{row.supplierCode}</div>
                    </td>
                    <td className="py-3 px-3 text-right font-mono text-zinc-300">
                      {row.poCount} ({row.onTimePoCount} vaktinde)
                    </td>
                    <td className="py-3 px-3 text-right font-mono text-zinc-200">%{row.otdRate}</td>
                    <td className="py-3 px-3 text-right font-mono text-zinc-200">%{row.qtyComplianceRate}</td>
                    <td className="py-3 px-3 text-right font-mono text-zinc-200">%{row.qualityAcceptanceRate}</td>
                    <td className="py-3 px-3 text-right font-mono">
                      <span className={row.avgPriceVariancePct > 0 ? "text-amber-300" : "text-[#34D399]"}>
                        {row.avgPriceVariancePct > 0 ? `+${row.avgPriceVariancePct}%` : `${row.avgPriceVariancePct}%`}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right font-mono">
                      <span className="text-sm font-bold text-white">{row.compositeScore}</span>
                      <span className="ml-1.5 px-1.5 py-0.5 rounded bg-[#34D399]/15 text-[#34D399] font-bold">
                        {row.tier}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 3. BELGE VE SERTİFİKA KASASI */}
      {subView === "documents" && (
        <div className="space-y-3">
          <div className="flex justify-between items-center">
            <div className="text-xs text-zinc-400">
              Geçerliliği yaklaşan veya süresi dolmuş sertifikalar satın alma risk analizine yansır.
            </div>
            <button
              type="button"
              onClick={() => setDocFormOpen((v) => !v)}
              className="inline-flex items-center gap-1.5 h-8 px-3 rounded-xl bg-[#34D399]/15 border border-[#34D399]/30 text-[#34D399] text-xs font-medium"
            >
              <Upload className="size-3.5" />
              Yeni Belge Ekle
            </button>
          </div>

          {docFormOpen && (
            <form
              onSubmit={handleSaveDocument}
              className="rounded-2xl border border-white/10 bg-[#121614] p-4 grid grid-cols-1 sm:grid-cols-3 gap-3"
            >
              <select
                value={docForm.supplierId}
                onChange={(e) => setDocForm((f) => ({ ...f, supplierId: e.target.value }))}
                className="h-9 px-3 rounded-xl border border-white/10 bg-[#0A0D0C] text-xs text-white"
              >
                {suppliers.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
              <select
                value={docForm.docType}
                onChange={(e) => setDocForm((f) => ({ ...f, docType: e.target.value }))}
                className="h-9 px-3 rounded-xl border border-white/10 bg-[#0A0D0C] text-xs text-white"
              >
                {Object.entries(DOC_TYPE_LABELS).map(([k, v]) => (
                  <option key={k} value={k}>
                    {v}
                  </option>
                ))}
              </select>
              <input
                required
                placeholder="Belge başlığı (ör. ISO 9001:2015 Sertifikası)"
                value={docForm.title}
                onChange={(e) => setDocForm((f) => ({ ...f, title: e.target.value }))}
                className="h-9 px-3 rounded-xl border border-white/10 bg-[#0A0D0C] text-xs text-white"
              />
              <input
                required
                placeholder="Dosya adı (ör. iso9001.pdf)"
                value={docForm.fileName}
                onChange={(e) => setDocForm((f) => ({ ...f, fileName: e.target.value }))}
                className="h-9 px-3 rounded-xl border border-white/10 bg-[#0A0D0C] text-xs text-white"
              />
              <input
                type="date"
                value={docForm.expiresAt}
                onChange={(e) => setDocForm((f) => ({ ...f, expiresAt: e.target.value }))}
                className="h-9 px-3 rounded-xl border border-white/10 bg-[#0A0D0C] text-xs text-white"
              />
              <button
                type="submit"
                className="h-9 px-4 rounded-xl bg-[#34D399] text-[#061811] text-xs font-semibold"
              >
                Belge Kasasına Kaydet
              </button>
            </form>
          )}

          <div className="overflow-x-auto rounded-2xl border border-white/[0.07] bg-[#121614]/80">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-white/[0.06] text-[11px] uppercase text-zinc-400">
                <tr>
                  <th className="py-3 px-4">Belge Başlığı</th>
                  <th className="py-3 px-3">Tedarikçi</th>
                  <th className="py-3 px-3">Tür & Kanal</th>
                  <th className="py-3 px-3">Son Geçerlilik</th>
                  <th className="py-3 px-3">Durum</th>
                  <th className="py-3 px-4 text-right">İşlem</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/[0.04]">
                {documents.map((doc) => (
                  <tr key={doc.id} className="hover:bg-white/[0.02]">
                    <td className="py-3 px-4">
                      <div className="font-medium text-zinc-100">{doc.title}</div>
                      <div className="text-[11px] font-mono text-zinc-500">{doc.fileName}</div>
                    </td>
                    <td className="py-3 px-3 text-zinc-300">{doc.supplierName}</td>
                    <td className="py-3 px-3">
                      <div className="text-zinc-200">{DOC_TYPE_LABELS[doc.docType] || doc.docType}</div>
                      <div className="text-[10px] text-zinc-500">Kanal: {doc.uploadedVia}</div>
                    </td>
                    <td className="py-3 px-3 font-mono text-zinc-300">
                      {doc.expiresAt ? new Date(doc.expiresAt).toLocaleDateString("tr-TR") : "Süresiz"}
                    </td>
                    <td className="py-3 px-3">
                      <span
                        className={`px-2 py-0.5 rounded-full text-[11px] font-medium border ${
                          doc.status === "GECERLI"
                            ? "bg-emerald-500/10 text-[#34D399] border-emerald-500/25"
                            : doc.status === "YENILEME_YAKIN"
                              ? "bg-amber-500/10 text-amber-300 border-amber-500/25"
                              : doc.status === "SURESI_DOLMUS"
                                ? "bg-rose-500/10 text-rose-300 border-rose-500/25"
                                : "bg-sky-500/10 text-sky-300 border-sky-500/25"
                        }`}
                      >
                        {DOC_STATUS_LABELS[doc.status] || doc.status}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right">
                      {doc.status === "INCELEMEDE" && (
                        <button
                          type="button"
                          onClick={() => handleReviewDoc(doc.id, "ONAYLA")}
                          className="h-7 px-2.5 rounded-lg bg-[#34D399]/15 text-[#34D399] border border-[#34D399]/30 text-[11px]"
                        >
                          Onayla
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TEDARİKÇİ EKLE/DÜZENLE MODAL */}
      {editingSupplier && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
          <form
            onSubmit={handleSaveSupplier}
            className="w-full max-w-2xl rounded-2xl border border-white/10 bg-[#101412] p-5 space-y-4 max-h-[90vh] overflow-y-auto"
          >
            <div className="flex items-center justify-between border-b border-white/[0.08] pb-3">
              <div className="font-semibold text-white text-sm flex items-center gap-2">
                <Building2 className="size-4 text-[#34D399]" />
                {editingSupplier.isNew ? "Yeni Tedarikçi Kartı Oluştur" : `Tedarikçi Düzenle: ${supplierForm.name}`}
              </div>
              <button
                type="button"
                onClick={() => setEditingSupplier(null)}
                className="text-xs text-zinc-400 hover:text-white"
              >
                Kapat
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              <div>
                <label className="text-zinc-400">Tedarikçi Kodu</label>
                <input
                  value={supplierForm.code}
                  onChange={(e) => setSupplierForm((f) => ({ ...f, code: e.target.value }))}
                  placeholder="Boş bırakılırsa otomatik üretilir"
                  className="mt-1 w-full h-9 px-3 rounded-xl border border-white/10 bg-[#0A0D0C] text-white"
                />
              </div>
              <div>
                <label className="text-zinc-400">Ticari Unvan *</label>
                <input
                  required
                  value={supplierForm.name}
                  onChange={(e) => setSupplierForm((f) => ({ ...f, name: e.target.value }))}
                  className="mt-1 w-full h-9 px-3 rounded-xl border border-white/10 bg-[#0A0D0C] text-white"
                />
              </div>
              <div>
                <label className="text-zinc-400">GS1 GLN-13 Numarası (Mod-10 Doğrulamalı)</label>
                <input
                  value={supplierForm.glnNumber}
                  onChange={(e) => setSupplierForm((f) => ({ ...f, glnNumber: e.target.value }))}
                  placeholder="13 haneli GLN kodu"
                  className="mt-1 w-full h-9 px-3 rounded-xl border border-white/10 bg-[#0A0D0C] text-white font-mono"
                />
              </div>
              <div>
                <label className="text-zinc-400">Kategori</label>
                <select
                  value={supplierForm.category}
                  onChange={(e) => setSupplierForm((f) => ({ ...f, category: e.target.value }))}
                  className="mt-1 w-full h-9 px-3 rounded-xl border border-white/10 bg-[#0A0D0C] text-white"
                >
                  {Object.entries(SUPPLIER_CATEGORY_LABELS).map(([k, v]) => (
                    <option key={k} value={k}>
                      {v}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-zinc-400">Kritiklik Seviyesi</label>
                <select
                  value={supplierForm.criticalityLevel}
                  onChange={(e) => setSupplierForm((f) => ({ ...f, criticalityLevel: e.target.value }))}
                  className="mt-1 w-full h-9 px-3 rounded-xl border border-white/10 bg-[#0A0D0C] text-white"
                >
                  {Object.entries(SUPPLIER_CRITICALITY_LABELS).map(([k, v]) => (
                    <option key={k} value={k}>
                      {v}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-zinc-400">Onay / Yönetişim Durumu</label>
                <select
                  value={supplierForm.approvalStatus}
                  onChange={(e) => setSupplierForm((f) => ({ ...f, approvalStatus: e.target.value }))}
                  className="mt-1 w-full h-9 px-3 rounded-xl border border-white/10 bg-[#0A0D0C] text-white"
                >
                  {Object.entries(SUPPLIER_APPROVAL_LABELS).map(([k, v]) => (
                    <option key={k} value={k}>
                      {v}
                    </option>
                  ))}
                </select>
              </div>
              {supplierForm.approvalStatus === "KARALISTE" && (
                <div className="sm:col-span-2">
                  <label className="text-rose-300 font-medium">Kara Liste Gerekçesi (Zorunlu) *</label>
                  <input
                    required
                    value={supplierForm.blacklistedReason}
                    onChange={(e) => setSupplierForm((f) => ({ ...f, blacklistedReason: e.target.value }))}
                    placeholder="Örn: Tekrarlayan soğuk zincir ihlali ve kalite reddi"
                    className="mt-1 w-full h-9 px-3 rounded-xl border border-rose-500/40 bg-[#0A0D0C] text-white"
                  />
                </div>
              )}
              <div>
                <label className="text-zinc-400">Ortalama Termin (Gün)</label>
                <input
                  type="number"
                  min={1}
                  value={supplierForm.leadTimeDays}
                  onChange={(e) => setSupplierForm((f) => ({ ...f, leadTimeDays: e.target.value }))}
                  className="mt-1 w-full h-9 px-3 rounded-xl border border-white/10 bg-[#0A0D0C] text-white"
                />
              </div>
              <div>
                <label className="text-zinc-400">Ödeme Vadesi (Gün)</label>
                <input
                  type="number"
                  min={0}
                  value={supplierForm.paymentTermsDays}
                  onChange={(e) => setSupplierForm((f) => ({ ...f, paymentTermsDays: e.target.value }))}
                  className="mt-1 w-full h-9 px-3 rounded-xl border border-white/10 bg-[#0A0D0C] text-white"
                />
              </div>
              <div>
                <label className="text-zinc-400">Yetkili Kişi</label>
                <input
                  value={supplierForm.contactPerson}
                  onChange={(e) => setSupplierForm((f) => ({ ...f, contactPerson: e.target.value }))}
                  className="mt-1 w-full h-9 px-3 rounded-xl border border-white/10 bg-[#0A0D0C] text-white"
                />
              </div>
              <div>
                <label className="text-zinc-400">E-Posta</label>
                <input
                  value={supplierForm.email}
                  onChange={(e) => setSupplierForm((f) => ({ ...f, email: e.target.value }))}
                  className="mt-1 w-full h-9 px-3 rounded-xl border border-white/10 bg-[#0A0D0C] text-white"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-white/[0.08]">
              <button
                type="button"
                onClick={() => setEditingSupplier(null)}
                className="h-9 px-4 rounded-xl border border-white/10 text-xs text-zinc-300"
              >
                Vazgeç
              </button>
              <button
                type="submit"
                disabled={savingSupplier}
                className="h-9 px-4 rounded-xl bg-[#34D399] hover:bg-[#34D399]/90 text-[#061811] text-xs font-semibold"
              >
                {savingSupplier ? "Kaydediliyor..." : "Tedarikçiyi Kaydet"}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* KATALOG ÜRÜN BAĞLAMA MODAL */}
      {linkModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
          <form
            onSubmit={handleSaveItemLink}
            className="w-full max-w-lg rounded-2xl border border-white/10 bg-[#101412] p-5 space-y-4 text-xs"
          >
            <div className="flex justify-between items-center border-b border-white/10 pb-2.5">
              <span className="font-semibold text-white text-sm">Tedarikçi-Ürün Katalog Bağlantısı</span>
              <button type="button" onClick={() => setLinkModalOpen(false)} className="text-zinc-400">
                Kapat
              </button>
            </div>
            <div className="space-y-3">
              <div>
                <label className="text-zinc-400">Onaylı Tedarikçi</label>
                <select
                  value={linkForm.supplierId}
                  onChange={(e) => setLinkForm((f) => ({ ...f, supplierId: e.target.value }))}
                  className="mt-1 w-full h-9 px-3 rounded-xl border border-white/10 bg-[#0A0D0C] text-white"
                >
                  {suppliers
                    .filter((s) => s.approvalStatus === "ONAYLI" && s.isActive)
                    .map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name} ({s.code})
                      </option>
                    ))}
                </select>
              </div>
              <div>
                <label className="text-zinc-400">Stok Kalemi</label>
                <select
                  value={linkForm.itemId}
                  onChange={(e) => setLinkForm((f) => ({ ...f, itemId: e.target.value }))}
                  className="mt-1 w-full h-9 px-3 rounded-xl border border-white/10 bg-[#0A0D0C] text-white"
                >
                  {items.map((it) => (
                    <option key={it.id} value={it.id}>
                      {it.sku} — {it.name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="text-zinc-400">Birim Fiyat (₺)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={linkForm.unitCost}
                    onChange={(e) => setLinkForm((f) => ({ ...f, unitCost: e.target.value }))}
                    className="mt-1 w-full h-9 px-3 rounded-xl border border-white/10 bg-[#0A0D0C] text-white"
                  />
                </div>
                <div>
                  <label className="text-zinc-400">MOQ</label>
                  <input
                    type="number"
                    value={linkForm.moq}
                    onChange={(e) => setLinkForm((f) => ({ ...f, moq: e.target.value }))}
                    className="mt-1 w-full h-9 px-3 rounded-xl border border-white/10 bg-[#0A0D0C] text-white"
                  />
                </div>
                <div>
                  <label className="text-zinc-400">Termin (Gün)</label>
                  <input
                    type="number"
                    value={linkForm.leadTimeDays}
                    onChange={(e) => setLinkForm((f) => ({ ...f, leadTimeDays: e.target.value }))}
                    className="mt-1 w-full h-9 px-3 rounded-xl border border-white/10 bg-[#0A0D0C] text-white"
                  />
                </div>
              </div>
              <label className="flex items-center gap-2 text-zinc-300">
                <input
                  type="checkbox"
                  checked={linkForm.isPrimary}
                  onChange={(e) => setLinkForm((f) => ({ ...f, isPrimary: e.target.checked }))}
                />
                Birincil tedarikçi olarak işaretle
              </label>
            </div>
            <div className="flex justify-end gap-2">
              <button
                type="submit"
                className="h-9 px-4 rounded-xl bg-[#34D399] text-[#061811] font-semibold"
              >
                Bağlantıyı Kaydet
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  )
}
