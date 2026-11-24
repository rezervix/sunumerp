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
import { safeText, safeNumber, safeDate } from "@/lib/utils/safe-display"

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

  const filteredSuppliers = (suppliers || []).filter((s) => {
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
      category: s.category || "KESME_CICEK",
      criticalityLevel: s.criticalityLevel || "ORTA",
      approvalStatus: s.approvalStatus || "ONAYLI",
      blacklistedReason: s.blacklistedReason || "",
      leadTimeDays: String(s.leadTimeDays || 3),
      paymentTermsDays: String(s.paymentTermsDays || 30),
      iban: s.iban || "",
      taxNumber: s.taxNumber || "",
      notes: s.notes || "",
    })
  }

  const handleSaveSupplier = async (e: React.FormEvent) => {
    e.preventDefault()
    if (supplierForm.glnNumber) {
      const check = validateGln13(supplierForm.glnNumber)
      if (!check.valid) {
        onNotify(`Geçersiz GLN-13 numarası: ${check.reason}`, true)
        return
      }
    }

    setSavingSupplier(true)
    try {
      const res = await fetch("/api/procurement", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "upsert_supplier_master",
          ...supplierForm,
          leadTimeDays: Number(supplierForm.leadTimeDays || 3),
          paymentTermsDays: Number(supplierForm.paymentTermsDays || 30),
        }),
      })
      const data = await res.json()
      if (!res.ok || !data.success) {
        onNotify(data.error || "Tedarikçi kaydedilemedi.", true)
        return
      }
      onNotify(data.message)
      setEditingSupplier(null)
      await onRefresh()
    } finally {
      setSavingSupplier(false)
    }
  }

  const handleCreateInvite = async (supplier: any) => {
    try {
      const res = await fetch("/api/procurement", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "create_supplier_portal_invite", supplierId: supplier.id }),
      })
      const data = await res.json()
      if (!res.ok || !data.success) {
        onNotify(data.error || "Portal daveti oluşturulamadı.", true)
        return
      }
      setLatestInviteUrl(data.inviteUrl)
      onNotify(`${supplier.name} için imzalı portal davet bağlantısı hazırlandı.`)
      await onRefresh()
    } catch {
      onNotify("Davet üretilirken hata oluştu.", true)
    }
  }

  const handleSaveWeights = async () => {
    setSavingWeights(true)
    try {
      const res = await fetch("/api/procurement", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "update_scorecard_config",
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
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-[--line] bg-white/80 backdrop-blur-xl p-3 shadow-sm">
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
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition cursor-pointer ${
                  active
                    ? "bg-[--brand-soft] text-[--brand] border border-[--brand-line]"
                    : "text-[--text-muted] hover:text-[--text] border border-transparent hover:bg-[--muted-bg]"
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
            className="inline-flex items-center gap-1.5 h-8 px-3 rounded-full border border-[--line] bg-white hover:bg-[--muted-bg] text-xs text-[--text-2] font-medium transition cursor-pointer"
          >
            <Plus className="size-3.5 text-[--brand]" />
            Katalog Ürün Bağla
          </button>
          <button
            type="button"
            onClick={openCreateSupplier}
            data-testid="new-supplier-btn"
            className="inline-flex items-center gap-1.5 h-8 px-3.5 rounded-full bg-gradient-to-r from-[--brand] to-[--blue] hover:opacity-95 text-white text-xs font-semibold shadow-sm transition cursor-pointer"
          >
            <Plus className="size-3.5" />
            Yeni Tedarikçi Ekle
          </button>
        </div>
      </div>

      {/* Oluşturulan İmzalı Davet Linki Banner */}
      {latestInviteUrl && (
        <div className="rounded-2xl border border-[--brand-line] bg-[--brand-soft]/70 p-3.5 flex flex-wrap items-center justify-between gap-3 shadow-sm">
          <div className="min-w-0 flex-1 space-y-1">
            <div className="flex items-center gap-1.5 text-xs font-semibold text-[--brand]">
              <KeyRound className="size-4" />
              <span>İmzalı Tedarikçi Portal Davet Bağlantısı (7 Gün Geçerli)</span>
            </div>
            <div className="text-[11px] font-mono text-[--text] truncate">{latestInviteUrl}</div>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => {
                navigator.clipboard?.writeText(latestInviteUrl)
                setCopiedInvite(true)
                setTimeout(() => setCopiedInvite(false), 2000)
              }}
              className="inline-flex items-center gap-1 h-8 px-3 rounded-full bg-white border border-[--line] hover:bg-[--muted-bg] text-xs text-[--text] font-medium transition cursor-pointer"
            >
              {copiedInvite ? <Check className="size-3.5 text-[--ok]" /> : <Copy className="size-3.5" />}
              {copiedInvite ? "Kopyalandı" : "Kopyala"}
            </button>
            <a
              href={latestInviteUrl}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1 h-8 px-3.5 rounded-full bg-gradient-to-r from-[--brand] to-[--blue] text-white text-xs font-semibold shadow-sm hover:opacity-95 transition"
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
              <Search className="size-3.5 text-[--text-muted] absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Tedarikçi adı, kodu veya GLN-13 ile ara..."
                className="w-full h-9 pl-9 pr-3 rounded-xl border border-[--line] bg-white text-xs text-[--text] placeholder:text-[--text-muted] focus:border-[--brand] focus:ring-1 focus:ring-[--brand] focus:outline-none"
              />
            </div>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="h-9 rounded-xl border border-[--line] bg-white px-3 text-xs text-[--text] focus:border-[--brand] focus:ring-1 focus:ring-[--brand] focus:outline-none"
            >
              <option value="ALL">Tüm Onay Durumları</option>
              <option value="ONAYLI">Onaylı</option>
              <option value="ASKIDA">Askıda</option>
              <option value="KARALISTE">Kara Liste</option>
              <option value="ADAY">Aday</option>
            </select>
          </div>

          <div className="overflow-x-auto rounded-2xl border border-[--line] bg-white shadow-sm">
            <table className="w-full text-left text-xs border-collapse">
              <thead className="border-b border-[--line] bg-[--muted-bg]/50 text-[11px] uppercase tracking-wider text-[--text-muted] font-medium">
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
              <tbody className="divide-y divide-[--line]">
                {filteredSuppliers.map((sup) => (
                  <tr key={sup.id} className="hover:bg-[--brand-soft]/30 transition">
                    <td className="py-3 px-4">
                      <div className="font-semibold text-[--text]">{safeText(sup.name)}</div>
                      <div className="text-[11px] font-mono text-[--brand] mt-0.5">
                        {safeText(sup.code)}
                        {sup.glnNumber ? ` · GLN ${sup.glnNumber}` : " · GLN Tanımsız"}
                      </div>
                      {sup.blacklistedReason && sup.approvalStatus === "KARALISTE" && (
                        <div className="text-[11px] text-[--bad] mt-0.5 font-medium">
                          Engel Nedeni: {safeText(sup.blacklistedReason)}
                        </div>
                      )}
                    </td>
                    <td className="py-3 px-3">
                      <div className="text-[--text]">
                        {SUPPLIER_CATEGORY_LABELS[sup.category] || safeText(sup.category)}
                      </div>
                      <div className="text-[11px] text-[--text-muted]">
                        Kritiklik: {SUPPLIER_CRITICALITY_LABELS[sup.criticalityLevel] || safeText(sup.criticalityLevel)} ·{" "}
                        {safeNumber(sup.linkedItemCount)} SKU
                      </div>
                    </td>
                    <td className="py-3 px-3">
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded-full border text-[11px] font-medium ${
                          sup.approvalStatus === "ONAYLI"
                            ? "bg-[--ok-soft] text-[--ok] border-[--ok]/25"
                            : sup.approvalStatus === "KARALISTE"
                              ? "bg-[--bad-soft] text-[--bad] border-[--bad]/25"
                              : "bg-[--warn-soft] text-[--warn] border-[--warn]/25"
                        }`}
                      >
                        {SUPPLIER_APPROVAL_LABELS[sup.approvalStatus] || safeText(sup.approvalStatus)}
                      </span>
                    </td>
                    <td className="py-3 px-3 text-right font-mono tabular-nums">
                      <span className="font-semibold text-[--text]">
                        {Number(sup.effectiveScore || 0).toFixed(1)}
                      </span>
                      <span
                        className={`ml-1.5 px-1.5 py-0.5 rounded text-[10px] font-bold ${
                          sup.effectiveTier === "A"
                            ? "bg-[--ok-soft] text-[--ok]"
                            : sup.effectiveTier === "B"
                              ? "bg-[--brand-soft] text-[--brand]"
                              : sup.effectiveTier === "C"
                                ? "bg-[--warn-soft] text-[--warn]"
                                : "bg-[--bad-soft] text-[--bad]"
                        }`}
                      >
                        {safeText(sup.effectiveTier)}
                      </span>
                    </td>
                    <td className="py-3 px-3 text-right">
                      <div className="text-[--text] font-mono tabular-nums">{safeNumber(sup.leadTimeDays)} Gün</div>
                      <div className="text-[11px] text-[--text-muted]">{safeText(sup.paymentTermsLabel)}</div>
                    </td>
                    <td className="py-3 px-3 text-center">
                      <div className="inline-flex items-center gap-1 text-[11px]">
                        <span className="text-[--ok] font-semibold">{safeNumber(sup.documentSummary?.valid, 0)} Geçerli</span>
                        {safeNumber(sup.documentSummary?.expiringSoon, 0) > 0 && (
                          <span className="text-[--warn]">· {sup.documentSummary.expiringSoon} Yakın</span>
                        )}
                        {safeNumber(sup.documentSummary?.expired, 0) > 0 && (
                          <span className="text-[--bad]">· {sup.documentSummary.expired} Süresi Dolmuş</span>
                        )}
                      </div>
                    </td>
                    <td className="py-3 px-4 text-right">
                      <div className="inline-flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => openEditSupplier(sup)}
                          className="h-7 px-2.5 rounded-full border border-[--line] bg-white hover:bg-[--muted-bg] text-[--text-2] inline-flex items-center gap-1 text-xs font-medium transition cursor-pointer"
                        >
                          <Edit className="size-3" />
                          Düzenle
                        </button>
                        {sup.approvalStatus !== "KARALISTE" && sup.isActive && (
                          <button
                            type="button"
                            onClick={() => handleCreateInvite(sup)}
                            className="h-7 px-2.5 rounded-full border border-[--brand-line] bg-[--brand-soft] hover:bg-[--brand-soft]/80 text-[--brand] inline-flex items-center gap-1 text-xs font-medium transition cursor-pointer"
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
          <div className="rounded-2xl border border-[--line] bg-white/80 backdrop-blur-xl p-4 space-y-3 shadow-sm">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2 text-sm font-semibold text-[--text]">
                <Settings className="size-4 text-[--brand]" />
                <span>Skor Kartı Formül Ağırlıkları (Toplam = %100)</span>
              </div>
              <div className="flex items-center gap-3 text-xs font-mono">
                <Link
                  href="/dashboard/lojistik-raporlar?module=satinalma"
                  className="font-sans text-[--brand] hover:underline font-medium px-2.5 py-1 rounded-full bg-[--brand-soft] border border-[--brand-line]"
                >
                  Raporlar&apos;a Git →
                </Link>
                <div>
                  Toplam:{" "}
                  <span className={Math.abs(weightSum - 100) < 0.01 ? "text-[--ok] font-semibold" : "text-[--bad] font-semibold"}>
                    %{weightSum}
                  </span>
                </div>
              </div>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 items-end">
              <div>
                <label className="text-[11px] text-[--text-muted]">Zamanında Teslim (OTD %)</label>
                <input
                  type="number"
                  value={weights.otdWeight}
                  onChange={(e) => setWeights((w) => ({ ...w, otdWeight: e.target.value }))}
                  className="mt-1 w-full h-9 px-3 rounded-xl border border-[--line] bg-white text-xs text-[--text] font-bold focus:border-[--brand] focus:ring-1 focus:ring-[--brand] focus:outline-none"
                />
              </div>
              <div>
                <label className="text-[11px] text-[--text-muted]">Miktar Uyumu (%)</label>
                <input
                  type="number"
                  value={weights.qtyWeight}
                  onChange={(e) => setWeights((w) => ({ ...w, qtyWeight: e.target.value }))}
                  className="mt-1 w-full h-9 px-3 rounded-xl border border-[--line] bg-white text-xs text-[--text] font-bold focus:border-[--brand] focus:ring-1 focus:ring-[--brand] focus:outline-none"
                />
              </div>
              <div>
                <label className="text-[11px] text-[--text-muted]">Kalite Kabul (%)</label>
                <input
                  type="number"
                  value={weights.qualityWeight}
                  onChange={(e) => setWeights((w) => ({ ...w, qualityWeight: e.target.value }))}
                  className="mt-1 w-full h-9 px-3 rounded-xl border border-[--line] bg-white text-xs text-[--text] font-bold focus:border-[--brand] focus:ring-1 focus:ring-[--brand] focus:outline-none"
                />
              </div>
              <div>
                <label className="text-[11px] text-[--text-muted]">Fiyat Tutarlılığı (%)</label>
                <input
                  type="number"
                  value={weights.priceWeight}
                  onChange={(e) => setWeights((w) => ({ ...w, priceWeight: e.target.value }))}
                  className="mt-1 w-full h-9 px-3 rounded-xl border border-[--line] bg-white text-xs text-[--text] font-bold focus:border-[--brand] focus:ring-1 focus:ring-[--brand] focus:outline-none"
                />
              </div>
              <button
                type="button"
                disabled={savingWeights}
                onClick={handleSaveWeights}
                className="h-9 px-4 rounded-full bg-gradient-to-r from-[--brand] to-[--blue] hover:opacity-95 text-white text-xs font-semibold inline-flex items-center justify-center gap-1.5 disabled:opacity-50 transition cursor-pointer shadow-sm"
              >
                <RefreshCw className={`size-3.5 ${savingWeights ? "animate-spin" : ""}`} />
                Kaydet & Yeniden Puanla
              </button>
            </div>
          </div>

          {/* 6 Aylık Konsolide Trend */}
          {Array.isArray(scorecards?.monthlyTrend) && scorecards.monthlyTrend.length > 0 && (
            <div className="rounded-2xl border border-[--line] bg-white p-4 shadow-sm">
              <div className="text-xs font-semibold text-[--text] mb-3">
                6 Aylık Tedarikçi Performans Trendi (Ortalama Bileşik Skor & OTD %)
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-6 gap-2.5">
                {scorecards.monthlyTrend.map((m: any) => (
                  <div
                    key={m.periodKey}
                    className="rounded-xl border border-[--line] bg-[--muted-bg]/40 p-2.5 text-xs"
                  >
                    <div className="font-mono text-[11px] text-[--text-muted]">{safeText(m.periodKey)}</div>
                    <div className="text-lg font-bold text-[--brand] mt-0.5 tabular-nums">
                      {safeNumber(m.avgCompositeScore)}
                    </div>
                    <div className="text-[10px] text-[--text-muted]">
                      OTD %{safeNumber(m.avgOtdRate)} · Kalite %{safeNumber(m.avgQualityRate)}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Canlı Tedarikçi Sıralama Tablosu */}
          <div className="overflow-x-auto rounded-2xl border border-[--line] bg-white shadow-sm">
            <table className="w-full text-left text-xs border-collapse">
              <thead className="border-b border-[--line] bg-[--muted-bg]/50 text-[11px] uppercase tracking-wider text-[--text-muted] font-medium">
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
              <tbody className="divide-y divide-[--line]">
                {(scorecards?.liveSnapshots || []).map((row: any) => (
                  <tr key={row.id} className="hover:bg-[--brand-soft]/30 transition">
                    <td className="py-3 px-4">
                      <div className="font-medium text-[--text]">{safeText(row.supplierName)}</div>
                      <div className="text-[11px] font-mono text-[--brand]">{safeText(row.supplierCode)}</div>
                    </td>
                    <td className="py-3 px-3 text-right font-mono tabular-nums text-[--text-2]">
                      {safeNumber(row.poCount)} ({safeNumber(row.onTimePoCount)} vaktinde)
                    </td>
                    <td className="py-3 px-3 text-right font-mono tabular-nums text-[--text]">%{safeNumber(row.otdRate)}</td>
                    <td className="py-3 px-3 text-right font-mono tabular-nums text-[--text]">%{safeNumber(row.qtyComplianceRate)}</td>
                    <td className="py-3 px-3 text-right font-mono tabular-nums text-[--text]">%{safeNumber(row.qualityAcceptanceRate)}</td>
                    <td className="py-3 px-3 text-right font-mono tabular-nums">
                      <span className={safeNumber(row.avgPriceVariancePct) > 0 ? "text-[--warn]" : "text-[--ok]"}>
                        {safeNumber(row.avgPriceVariancePct) > 0 ? `+${row.avgPriceVariancePct}%` : `${row.avgPriceVariancePct}%`}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right font-mono tabular-nums">
                      <span className="text-sm font-bold text-[--text]">{safeNumber(row.compositeScore)}</span>
                      <span className="ml-1.5 px-1.5 py-0.5 rounded-full bg-[--brand-soft] text-[--brand] font-bold border border-[--brand-line]">
                        {safeText(row.tier)}
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
            <div className="text-xs text-[--text-muted]">
              Geçerliliği yaklaşan veya süresi dolmuş sertifikalar satın alma risk analizine yansır.
            </div>
            <button
              type="button"
              onClick={() => setDocFormOpen((v) => !v)}
              className="inline-flex items-center gap-1.5 h-8 px-3 rounded-full bg-[--brand-soft] border border-[--brand-line] text-[--brand] text-xs font-medium hover:bg-[--brand-soft]/80 transition cursor-pointer"
            >
              <Upload className="size-3.5" />
              Yeni Belge Ekle
            </button>
          </div>

          {docFormOpen && (
            <form
              onSubmit={handleSaveDocument}
              className="rounded-2xl border border-[--brand-line] bg-white p-4 grid grid-cols-1 sm:grid-cols-3 gap-3 shadow-md text-xs"
            >
              <select
                value={docForm.supplierId}
                onChange={(e) => setDocForm((f) => ({ ...f, supplierId: e.target.value }))}
                className="h-9 px-3 rounded-xl border border-[--line] bg-white text-xs text-[--text] focus:border-[--brand] focus:ring-1 focus:ring-[--brand] focus:outline-none"
              >
                {suppliers.map((s) => (
                  <option key={s.id} value={s.id}>
                    {safeText(s.name)}
                  </option>
                ))}
              </select>
              <select
                value={docForm.docType}
                onChange={(e) => setDocForm((f) => ({ ...f, docType: e.target.value }))}
                className="h-9 px-3 rounded-xl border border-[--line] bg-white text-xs text-[--text] focus:border-[--brand] focus:ring-1 focus:ring-[--brand] focus:outline-none"
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
                className="h-9 px-3 rounded-xl border border-[--line] bg-white text-xs text-[--text] focus:border-[--brand] focus:ring-1 focus:ring-[--brand] focus:outline-none"
              />
              <input
                required
                placeholder="Dosya adı (ör. iso9001.pdf)"
                value={docForm.fileName}
                onChange={(e) => setDocForm((f) => ({ ...f, fileName: e.target.value }))}
                className="h-9 px-3 rounded-xl border border-[--line] bg-white text-xs text-[--text] focus:border-[--brand] focus:ring-1 focus:ring-[--brand] focus:outline-none"
              />
              <input
                type="date"
                value={docForm.expiresAt}
                onChange={(e) => setDocForm((f) => ({ ...f, expiresAt: e.target.value }))}
                className="h-9 px-3 rounded-xl border border-[--line] bg-white text-xs text-[--text] focus:border-[--brand] focus:ring-1 focus:ring-[--brand] focus:outline-none"
              />
              <button
                type="submit"
                className="h-9 px-4 rounded-full bg-gradient-to-r from-[--brand] to-[--blue] text-white text-xs font-semibold hover:opacity-95 shadow-sm transition cursor-pointer"
              >
                Belge Kasasına Kaydet
              </button>
            </form>
          )}

          <div className="overflow-x-auto rounded-2xl border border-[--line] bg-white shadow-sm">
            <table className="w-full text-left text-xs border-collapse">
              <thead className="border-b border-[--line] bg-[--muted-bg]/50 text-[11px] uppercase tracking-wider text-[--text-muted] font-medium">
                <tr>
                  <th className="py-3 px-4">Belge Başlığı</th>
                  <th className="py-3 px-3">Tedarikçi</th>
                  <th className="py-3 px-3">Tür & Kanal</th>
                  <th className="py-3 px-3">Son Geçerlilik</th>
                  <th className="py-3 px-3">Durum</th>
                  <th className="py-3 px-4 text-right">İşlem</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[--line]">
                {documents.map((doc) => (
                  <tr key={doc.id} className="hover:bg-[--brand-soft]/30 transition">
                    <td className="py-3 px-4">
                      <div className="font-medium text-[--text]">{safeText(doc.title)}</div>
                      <div className="text-[11px] font-mono text-[--text-muted]">{safeText(doc.fileName)}</div>
                    </td>
                    <td className="py-3 px-3 text-[--text-2]">{safeText(doc.supplierName)}</td>
                    <td className="py-3 px-3">
                      <div className="text-[--text]">{DOC_TYPE_LABELS[doc.docType] || safeText(doc.docType)}</div>
                      <div className="text-[10px] text-[--text-muted]">Kanal: {safeText(doc.uploadedVia)}</div>
                    </td>
                    <td className="py-3 px-3 font-mono text-[--text-2] tabular-nums">
                      {doc.expiresAt ? safeDate(doc.expiresAt) : "Süresiz"}
                    </td>
                    <td className="py-3 px-3">
                      <span
                        className={`px-2 py-0.5 rounded-full text-[11px] font-medium border ${
                          doc.status === "GECERLI"
                            ? "bg-[--ok-soft] text-[--ok] border-[--ok]/25"
                            : doc.status === "YENILEME_YAKIN"
                              ? "bg-[--warn-soft] text-[--warn] border-[--warn]/25"
                              : doc.status === "SURESI_DOLMUS"
                                ? "bg-[--bad-soft] text-[--bad] border-[--bad]/25"
                                : "bg-[--brand-soft] text-[--brand] border-[--brand-line]"
                        }`}
                      >
                        {DOC_STATUS_LABELS[doc.status] || safeText(doc.status)}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right">
                      {doc.status === "INCELEMEDE" && (
                        <button
                          type="button"
                          onClick={() => handleReviewDoc(doc.id, "ONAYLA")}
                          className="h-7 px-2.5 rounded-full bg-[--ok-soft] text-[--ok] border border-[--ok]/25 text-[11px] font-medium hover:bg-[--ok-soft]/80 transition cursor-pointer"
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
        <div className="fixed inset-0 z-50 bg-[--navy]/40 backdrop-blur-sm flex items-center justify-center p-4">
          <form
            onSubmit={handleSaveSupplier}
            className="w-full max-w-2xl rounded-2xl border border-[--line] bg-white p-5 space-y-4 max-h-[90vh] overflow-y-auto shadow-xl text-[--text]"
          >
            <div className="flex items-center justify-between border-b border-[--line] pb-3">
              <div className="font-semibold text-[--text] text-sm flex items-center gap-2">
                <Building2 className="size-4 text-[--brand]" />
                {editingSupplier.isNew ? "Yeni Tedarikçi Kartı Oluştur" : `Tedarikçi Düzenle: ${safeText(supplierForm.name)}`}
              </div>
              <button
                type="button"
                onClick={() => setEditingSupplier(null)}
                className="text-xs text-[--text-muted] hover:text-[--text]"
              >
                Kapat
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              <div>
                <label className="text-[--text-muted]">Tedarikçi Kodu</label>
                <input
                  value={supplierForm.code}
                  onChange={(e) => setSupplierForm((f) => ({ ...f, code: e.target.value }))}
                  placeholder="Boş bırakılırsa otomatik üretilir"
                  className="mt-1 w-full h-9 px-3 rounded-xl border border-[--line] bg-white text-[--text] focus:border-[--brand] focus:ring-1 focus:ring-[--brand] focus:outline-none"
                />
              </div>
              <div>
                <label className="text-[--text-muted]">Ticari Unvan *</label>
                <input
                  required
                  value={supplierForm.name}
                  onChange={(e) => setSupplierForm((f) => ({ ...f, name: e.target.value }))}
                  className="mt-1 w-full h-9 px-3 rounded-xl border border-[--line] bg-white text-[--text] focus:border-[--brand] focus:ring-1 focus:ring-[--brand] focus:outline-none"
                />
              </div>
              <div>
                <label className="text-[--text-muted]">GS1 GLN-13 Numarası (Mod-10 Doğrulamalı)</label>
                <input
                  value={supplierForm.glnNumber}
                  onChange={(e) => setSupplierForm((f) => ({ ...f, glnNumber: e.target.value }))}
                  placeholder="13 haneli GLN kodu"
                  className="mt-1 w-full h-9 px-3 rounded-xl border border-[--line] bg-white text-[--text] font-mono focus:border-[--brand] focus:ring-1 focus:ring-[--brand] focus:outline-none"
                />
              </div>
              <div>
                <label className="text-[--text-muted]">Kategori</label>
                <select
                  value={supplierForm.category}
                  onChange={(e) => setSupplierForm((f) => ({ ...f, category: e.target.value }))}
                  className="mt-1 w-full h-9 px-3 rounded-xl border border-[--line] bg-white text-[--text] focus:border-[--brand] focus:ring-1 focus:ring-[--brand] focus:outline-none"
                >
                  {Object.entries(SUPPLIER_CATEGORY_LABELS).map(([k, v]) => (
                    <option key={k} value={k}>
                      {v}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-[--text-muted]">Kritiklik Seviyesi</label>
                <select
                  value={supplierForm.criticalityLevel}
                  onChange={(e) => setSupplierForm((f) => ({ ...f, criticalityLevel: e.target.value }))}
                  className="mt-1 w-full h-9 px-3 rounded-xl border border-[--line] bg-white text-[--text] focus:border-[--brand] focus:ring-1 focus:ring-[--brand] focus:outline-none"
                >
                  {Object.entries(SUPPLIER_CRITICALITY_LABELS).map(([k, v]) => (
                    <option key={k} value={k}>
                      {v}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-[--text-muted]">Onay / Yönetişim Durumu</label>
                <select
                  value={supplierForm.approvalStatus}
                  onChange={(e) => setSupplierForm((f) => ({ ...f, approvalStatus: e.target.value }))}
                  className="mt-1 w-full h-9 px-3 rounded-xl border border-[--line] bg-white text-[--text] focus:border-[--brand] focus:ring-1 focus:ring-[--brand] focus:outline-none"
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
                  <label className="text-[--bad] font-medium">Kara Liste Gerekçesi (Zorunlu) *</label>
                  <input
                    required
                    value={supplierForm.blacklistedReason}
                    onChange={(e) => setSupplierForm((f) => ({ ...f, blacklistedReason: e.target.value }))}
                    placeholder="Örn: Tekrarlayan soğuk zincir ihlali ve kalite reddi"
                    className="mt-1 w-full h-9 px-3 rounded-xl border border-[--bad]/40 bg-white text-[--bad] focus:outline-none"
                  />
                </div>
              )}
              <div>
                <label className="text-[--text-muted]">Ortalama Termin (Gün)</label>
                <input
                  type="number"
                  min={1}
                  value={supplierForm.leadTimeDays}
                  onChange={(e) => setSupplierForm((f) => ({ ...f, leadTimeDays: e.target.value }))}
                  className="mt-1 w-full h-9 px-3 rounded-xl border border-[--line] bg-white text-[--text] focus:border-[--brand] focus:ring-1 focus:ring-[--brand] focus:outline-none"
                />
              </div>
              <div>
                <label className="text-[--text-muted]">Ödeme Vadesi (Gün)</label>
                <input
                  type="number"
                  min={0}
                  value={supplierForm.paymentTermsDays}
                  onChange={(e) => setSupplierForm((f) => ({ ...f, paymentTermsDays: e.target.value }))}
                  className="mt-1 w-full h-9 px-3 rounded-xl border border-[--line] bg-white text-[--text] focus:border-[--brand] focus:ring-1 focus:ring-[--brand] focus:outline-none"
                />
              </div>
              <div>
                <label className="text-[--text-muted]">Yetkili Kişi</label>
                <input
                  value={supplierForm.contactPerson}
                  onChange={(e) => setSupplierForm((f) => ({ ...f, contactPerson: e.target.value }))}
                  className="mt-1 w-full h-9 px-3 rounded-xl border border-[--line] bg-white text-[--text] focus:border-[--brand] focus:ring-1 focus:ring-[--brand] focus:outline-none"
                />
              </div>
              <div>
                <label className="text-[--text-muted]">E-Posta</label>
                <input
                  value={supplierForm.email}
                  onChange={(e) => setSupplierForm((f) => ({ ...f, email: e.target.value }))}
                  className="mt-1 w-full h-9 px-3 rounded-xl border border-[--line] bg-white text-[--text] focus:border-[--brand] focus:ring-1 focus:ring-[--brand] focus:outline-none"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-[--line]">
              <button
                type="button"
                onClick={() => setEditingSupplier(null)}
                className="h-9 px-4 rounded-full border border-[--line] text-xs text-[--text-2] hover:bg-[--muted-bg] transition cursor-pointer"
              >
                Vazgeç
              </button>
              <button
                type="submit"
                disabled={savingSupplier}
                className="h-9 px-4 rounded-full bg-gradient-to-r from-[--brand] to-[--blue] hover:opacity-95 text-white text-xs font-semibold shadow-sm transition cursor-pointer"
              >
                {savingSupplier ? "Kaydediliyor..." : "Tedarikçiyi Kaydet"}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* KATALOG ÜRÜN BAĞLAMA MODAL */}
      {linkModalOpen && (
        <div className="fixed inset-0 z-50 bg-[--navy]/40 backdrop-blur-sm flex items-center justify-center p-4">
          <form
            onSubmit={handleSaveItemLink}
            className="w-full max-w-lg rounded-2xl border border-[--line] bg-white p-5 space-y-4 text-xs shadow-xl text-[--text]"
          >
            <div className="flex justify-between items-center border-b border-[--line] pb-2.5">
              <span className="font-semibold text-[--text] text-sm">Tedarikçi-Ürün Katalog Bağlantısı</span>
              <button type="button" onClick={() => setLinkModalOpen(false)} className="text-[--text-muted] hover:text-[--text]">
                Kapat
              </button>
            </div>
            <div className="space-y-3">
              <div>
                <label className="text-[--text-muted]">Onaylı Tedarikçi</label>
                <select
                  value={linkForm.supplierId}
                  onChange={(e) => setLinkForm((f) => ({ ...f, supplierId: e.target.value }))}
                  className="mt-1 w-full h-9 px-3 rounded-xl border border-[--line] bg-white text-[--text] focus:border-[--brand] focus:ring-1 focus:ring-[--brand] focus:outline-none"
                >
                  {suppliers
                    .filter((s) => s.approvalStatus === "ONAYLI" && s.isActive)
                    .map((s) => (
                      <option key={s.id} value={s.id}>
                        {safeText(s.name)} ({safeText(s.code)})
                      </option>
                    ))}
                </select>
              </div>
              <div>
                <label className="text-[--text-muted]">Stok Kalemi</label>
                <select
                  value={linkForm.itemId}
                  onChange={(e) => setLinkForm((f) => ({ ...f, itemId: e.target.value }))}
                  className="mt-1 w-full h-9 px-3 rounded-xl border border-[--line] bg-white text-[--text] focus:border-[--brand] focus:ring-1 focus:ring-[--brand] focus:outline-none"
                >
                  {items.map((it) => (
                    <option key={it.id} value={it.id}>
                      {safeText(it.sku)} — {safeText(it.name)}
                    </option>
                  ))}
                </select>
              </div>
              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="text-[--text-muted]">Birim Fiyat (₺)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={linkForm.unitCost}
                    onChange={(e) => setLinkForm((f) => ({ ...f, unitCost: e.target.value }))}
                    className="mt-1 w-full h-9 px-3 rounded-xl border border-[--line] bg-white text-[--text] focus:border-[--brand] focus:ring-1 focus:ring-[--brand] focus:outline-none"
                  />
                </div>
                <div>
                  <label className="text-[--text-muted]">MOQ</label>
                  <input
                    type="number"
                    value={linkForm.moq}
                    onChange={(e) => setLinkForm((f) => ({ ...f, moq: e.target.value }))}
                    className="mt-1 w-full h-9 px-3 rounded-xl border border-[--line] bg-white text-[--text] focus:border-[--brand] focus:ring-1 focus:ring-[--brand] focus:outline-none"
                  />
                </div>
                <div>
                  <label className="text-[--text-muted]">Termin (Gün)</label>
                  <input
                    type="number"
                    value={linkForm.leadTimeDays}
                    onChange={(e) => setLinkForm((f) => ({ ...f, leadTimeDays: e.target.value }))}
                    className="mt-1 w-full h-9 px-3 rounded-xl border border-[--line] bg-white text-[--text] focus:border-[--brand] focus:ring-1 focus:ring-[--brand] focus:outline-none"
                  />
                </div>
              </div>
              <label className="flex items-center gap-2 text-[--text-2]">
                <input
                  type="checkbox"
                  checked={linkForm.isPrimary}
                  onChange={(e) => setLinkForm((f) => ({ ...f, isPrimary: e.target.checked }))}
                />
                Birincil tedarikçi olarak işaretle
              </label>
            </div>
            <div className="flex justify-end gap-2 pt-2 border-t border-[--line]">
              <button
                type="submit"
                className="h-9 px-5 rounded-full bg-gradient-to-r from-[--brand] to-[--blue] text-white font-semibold shadow-sm hover:opacity-95 transition cursor-pointer"
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
