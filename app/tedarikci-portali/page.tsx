"use client"

import React, { useCallback, useEffect, useState } from "react"
import { toast } from "sonner"
import {
  Building2,
  ClipboardCheck,
  Scale,
  Truck,
  FileCheck2,
  BarChart3,
  KeyRound,
  LogOut,
  CheckCircle2,
  AlertTriangle,
  Send,
  Upload,
  Plus,
  RefreshCw,
  ShieldCheck,
  Lock,
} from "lucide-react"
import {
  DOC_STATUS_LABELS,
  DOC_TYPE_LABELS,
  PO_STATUS_LABELS,
  SUPPLIER_CATEGORY_LABELS,
} from "@/lib/logistics/procurement/constantsAndHelpers"
import {
  DemoPortalGuideCard,
  DemoPortalLoginBox,
  DemoSupplierPerspectiveBar,
  useSupplierDemoState,
} from "@/components/demo/SupplierPortalDemoComponents"

export default function SupplierPortalPage() {
  const [loading, setLoading] = useState(true)
  const [portalData, setPortalData] = useState<any | null>(null)
  const [activeTab, setActiveTab] = useState<"pos" | "rfqs" | "asns" | "docs" | "score">("pos")

  // Login formu state
  const [username, setUsername] = useState("")
  const [password, setPassword] = useState("")
  const [loginBusy, setLoginBusy] = useState(false)
  const [loginError, setLoginError] = useState("")

  // PO Kırmızı Bayrak / Yanıt Modalı
  const [poActionTarget, setPoActionTarget] = useState<any | null>(null)
  const [poDecision, setPoDecision] = useState<"ONAYLANDI" | "KISMI_ONAY" | "RED_BAYRAK">("ONAYLANDI")
  const [poNote, setPoNote] = useState("")
  const [poPromisedDate, setPoPromisedDate] = useState("")
  const [poBusy, setPoBusy] = useState(false)

  // ASN Oluşturma Modalı
  const [asnModalPo, setAsnModalPo] = useState<any | null>(null)
  const [asnWaybill, setAsnWaybill] = useState("")
  const [asnCarrier, setAsnCarrier] = useState("Frigo Soğuk Zincir Lojistik")
  const [asnPlate, setAsnPlate] = useState("34 FLR 206")
  const [asnDriver, setAsnDriver] = useState("")
  const [asnArrival, setAsnArrival] = useState(
    new Date(Date.now() + 86_400_000).toISOString().slice(0, 10)
  )
  const [asnLineQty, setAsnLineQty] = useState<Record<string, string>>({})
  const [asnLineLot, setAsnLineLot] = useState<Record<string, string>>({})
  const [asnBusy, setAsnBusy] = useState(false)

  // RFQ Teklif Modalı
  const [rfqTarget, setRfqTarget] = useState<any | null>(null)
  const [rfqLeadDays, setRfqLeadDays] = useState("3")
  const [rfqShipping, setRfqShipping] = useState("650")
  const [rfqPayment, setRfqPayment] = useState("30 Gün Vadeli")
  const [rfqPrices, setRfqPrices] = useState<Record<string, string>>({})
  const [rfqBusy, setRfqBusy] = useState(false)

  // Belge Yükleme
  const [docType, setDocType] = useState("ISO_KALITE")
  const [docTitle, setDocTitle] = useState("")
  const [docExpires, setDocExpires] = useState("2027-11-15")
  const [docFile, setDocFile] = useState<File | null>(null)
  const [docBusy, setDocBusy] = useState(false)

  const demoState = useSupplierDemoState()

  const loadPortal = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch("/api/supplier-portal")
      if (!res.ok) {
        setPortalData(null)
        return
      }
      const data = await res.json()
      if (data.success) {
        setPortalData(data)
      } else {
        setPortalData(null)
      }
    } catch {
      setPortalData(null)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadPortal()
  }, [loadPortal])

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoginBusy(true)
    setLoginError("")
    try {
      const res = await fetch("/api/supplier-portal/auth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      })
      const data = await res.json()
      if (!res.ok || !data.success) {
        setLoginError(data.error || "Giriş başarısız.")
        return
      }
      toast.success(data.message || "Tedarikçi portalına hoş geldiniz.")
      await loadPortal()
    } catch {
      setLoginError("Sunucuyla bağlantı kurulamadı.")
    } finally {
      setLoginBusy(false)
    }
  }

  const handleLogout = async () => {
    await fetch("/api/supplier-portal/auth", { method: "DELETE" })
    setPortalData(null)
    toast.success("Portal oturumu kapatıldı.")
  }

  const submitPoDecision = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!poActionTarget) return
    setPoBusy(true)
    try {
      const res = await fetch("/api/supplier-portal", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "respond_po",
          poId: poActionTarget.id,
          decision: poDecision,
          promisedDeliveryDate: poPromisedDate || undefined,
          note: poNote,
          redFlagReason: poDecision === "RED_BAYRAK" ? poNote : undefined,
        }),
      })
      const data = await res.json()
      if (!res.ok || !data.success) {
        toast.error(data.error || "PO yanıtı kaydedilemedi.")
        return
      }
      toast.success(
        poDecision === "RED_BAYRAK"
          ? `${poActionTarget.poNumber} için kırmızı bayrak risk bildirimi ERP'ye iletildi.`
          : `${poActionTarget.poNumber} onaylandı.`
      )
      setPoActionTarget(null)
      setPoNote("")
      await loadPortal()
    } finally {
      setPoBusy(false)
    }
  }

  const openAsnModal = (po: any) => {
    setAsnModalPo(po)
    setAsnWaybill(`IRS-${po.poNumber.slice(-4)}-${String(Date.now()).slice(-3)}`)
    const qMap: Record<string, string> = {}
    const lMap: Record<string, string> = {}
    for (const l of po.lines || []) {
      const rem = Math.max(1, Number(l.orderedQty || 0) - Number(l.receivedQty || 0))
      qMap[l.itemId] = String(rem)
      lMap[l.itemId] = `LOT-${l.sku.slice(0, 4)}-PRT`
    }
    setAsnLineQty(qMap)
    setAsnLineLot(lMap)
  }

  const submitAsn = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!asnModalPo) return
    setAsnBusy(true)
    try {
      const lines = (asnModalPo.lines || []).map((l: any) => ({
        itemId: l.itemId,
        poLineId: l.id,
        shippedQty: Number(asnLineQty[l.itemId] || l.orderedQty),
        lotNumber: asnLineLot[l.itemId] || null,
      }))
      const res = await fetch("/api/supplier-portal", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "submit_asn",
          poId: asnModalPo.id,
          waybillNo: asnWaybill,
          carrierName: asnCarrier,
          vehiclePlate: asnPlate,
          driverName: asnDriver,
          expectedArrivalAt: asnArrival,
          lines,
        }),
      })
      const data = await res.json()
      if (!res.ok || !data.success) {
        toast.error(data.error || "ASN gönderilemedi.")
        return
      }
      toast.success(`ASN (${data.result?.asnNumber}) oluşturuldu ve depo mal kabul ekranına iletildi.`)
      setAsnModalPo(null)
      setActiveTab("asns")
      await loadPortal()
    } finally {
      setAsnBusy(false)
    }
  }

  const openRfqModal = (rfq: any) => {
    setRfqTarget(rfq)
    const pMap: Record<string, string> = {}
    for (const it of rfq.items || []) {
      pMap[it.id] = String(it.targetUnitPrice || 42)
    }
    setRfqPrices(pMap)
  }

  const submitRfq = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!rfqTarget) return
    setRfqBusy(true)
    try {
      const lines = (rfqTarget.items || []).map((it: any) => ({
        rfqItemId: it.id,
        unitPrice: Number(rfqPrices[it.id] || 40),
        offeredQty: Number(it.requestedQty),
      }))
      const res = await fetch("/api/supplier-portal", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "submit_rfq_quote",
          rfqId: rfqTarget.id,
          leadTimeDays: Number(rfqLeadDays),
          shippingCost: Number(rfqShipping),
          paymentTerms: rfqPayment,
          lines,
        }),
      })
      const data = await res.json()
      if (!res.ok || !data.success) {
        toast.error(data.error || "Teklif gönderilemedi.")
        return
      }
      toast.success(`Teklifiniz (${data.result?.quoteNumber}) Sunum ERP satın alma birimine iletildi.`)
      setRfqTarget(null)
      await loadPortal()
    } finally {
      setRfqBusy(false)
    }
  }

  const handleUploadDoc = async (e: React.FormEvent) => {
    e.preventDefault()
    setDocBusy(true)
    try {
      const fd = new FormData()
      fd.append("action", "upload_document")
      fd.append("docType", docType)
      fd.append("title", docTitle || "Sertifika Belgesi")
      fd.append("expiresAt", docExpires)
      fd.append("fileName", docFile?.name || `${docType.toLowerCase()}.pdf`)
      if (docFile) fd.append("file", docFile)

      const res = await fetch("/api/supplier-portal", {
        method: "POST",
        body: fd,
      })
      const data = await res.json()
      if (!res.ok || !data.success) {
        toast.error(data.error || "Belge yüklenemedi.")
        return
      }
      toast.success("Belge güvenle yüklendi ve incelemeye alındı.")
      setDocTitle("")
      setDocFile(null)
      await loadPortal()
    } finally {
      setDocBusy(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6">
        <div className="rounded-2xl border border-white/10 bg-[#121614] p-6 text-center space-y-2">
          <RefreshCw className="size-6 text-[#34D399] animate-spin mx-auto" />
          <p className="text-xs text-zinc-400">Tedarikçi Portalı hazırlanıyor...</p>
        </div>
      </div>
    )
  }

  // OTURUM YOKSA GİRİŞ EKRANI
  if (!portalData) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-4 sm:p-6">
        <div className="w-full max-w-md space-y-5">
          <div className="text-center space-y-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-[#34D399]/30 bg-[#34D399]/10 text-[#34D399] text-xs font-medium">
              <Lock className="size-3.5" />
              <span>İzole Harici Erişim · Sunum ERP Tedarikçi Portalı</span>
            </div>
            <h1 className="text-2xl font-bold text-white tracking-tight">Tedarikçi Portalı Girişi</h1>
            <p className="text-xs text-zinc-400">
              Satın alma siparişlerinizi onaylayın, RFQ teklifleri gönderin ve ASN sevkiyat bildirimi oluşturun.
            </p>
          </div>

          <form
            onSubmit={handleLogin}
            className="rounded-2xl border border-white/10 bg-[#111513] p-5 space-y-4 shadow-2xl"
          >
            <div>
              <label className="text-xs text-zinc-400">Tedarikçi Kullanıcı Adı veya E-Posta</label>
              <input
                required
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Örn: tedarikci.royal"
                data-testid="portal-login-username"
                className="mt-1 w-full h-10 px-3 rounded-xl border border-white/10 bg-[#080A09] text-sm text-white focus:outline-none focus:border-[#34D399]"
              />
            </div>
            <div>
              <label className="text-xs text-zinc-400">Şifre</label>
              <input
                required
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                data-testid="portal-login-password"
                className="mt-1 w-full h-10 px-3 rounded-xl border border-white/10 bg-[#080A09] text-sm text-white focus:outline-none focus:border-[#34D399]"
              />
            </div>
            {loginError && (
              <div className="rounded-xl border border-rose-500/30 bg-rose-500/10 px-3 py-2 text-xs text-rose-300">
                {loginError}
              </div>
            )}
            <button
              type="submit"
              disabled={loginBusy}
              data-testid="portal-login-submit"
              className="w-full h-10 rounded-xl bg-[#34D399] hover:bg-[#34D399]/90 text-[#061811] text-sm font-semibold inline-flex items-center justify-center gap-2 transition-colors disabled:opacity-50"
            >
              <KeyRound className="size-4" />
              {loginBusy ? "Doğrulanıyor..." : "Tedarikçi Portalına Giriş Yap"}
            </button>
          </form>

          {/* Yalnızca Demo Açıkken Görünür */}
          <DemoPortalLoginBox onLoggedIn={loadPortal} />

          <div className="text-center text-[11px] text-zinc-500">
            Şirket içi personelseniz{" "}
            <a href="/" className="text-[#34D399] hover:underline">
              ana ERP girişine
            </a>{" "}
            dönebilirsiniz.
          </div>
        </div>
      </div>
    )
  }

  const { supplier, stats, purchaseOrders, rfqs, asns, documents, scorecard } = portalData

  return (
    <div className="min-h-screen flex flex-col">
      {/* Yalnızca Perspektif Geçişi ile gelindiyse ince demo dönüş bandı */}
      <DemoSupplierPerspectiveBar
        supplierName={supplier.name}
        demoModeEnabled={demoState.demoModeEnabled}
        hasAdminReturnToken={demoState.hasAdminReturnToken}
        returnAdminUsername={demoState.returnAdminUsername}
      />

      {/* Portal Üst Çubuk */}
      <header className="border-b border-white/[0.08] bg-[#0D100F]/95 px-4 sm:px-6 py-3.5">
        <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="size-10 rounded-xl bg-[#34D399]/15 border border-[#34D399]/30 flex items-center justify-center text-[#34D399]">
              <Building2 className="size-5" />
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-base font-bold text-white" data-testid="portal-supplier-name">
                  {supplier.name}
                </h1>
                <span className="px-2 py-0.5 rounded-full text-[11px] font-mono border border-white/10 bg-white/[0.04] text-zinc-300">
                  {supplier.code}
                </span>
                <span className="px-2 py-0.5 rounded-full text-[11px] border border-[#34D399]/30 bg-[#34D399]/10 text-[#34D399]">
                  <ShieldCheck className="size-3 inline mr-1" />
                  Tedarikçi Portalı
                </span>
              </div>
              <div className="text-[11px] text-zinc-400 font-mono mt-0.5">
                {SUPPLIER_CATEGORY_LABELS[supplier.category] || supplier.category} · GLN:{" "}
                {supplier.glnNumber || "-"} · Vade: {supplier.paymentTermsLabel}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={loadPortal}
              className="inline-flex items-center gap-1.5 h-8 px-3 rounded-xl border border-white/10 bg-white/[0.04] text-xs text-zinc-200 hover:bg-white/[0.08]"
            >
              <RefreshCw className="size-3.5" />
              Yenile
            </button>
            <button
              type="button"
              onClick={handleLogout}
              className="inline-flex items-center gap-1.5 h-8 px-3 rounded-xl border border-rose-500/30 bg-rose-500/10 text-xs text-rose-300 hover:bg-rose-500/20"
            >
              <LogOut className="size-3.5" />
              Çıkış
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl w-full mx-auto px-4 sm:px-6 py-5 space-y-5">
        <DemoPortalGuideCard demoModeEnabled={demoState.demoModeEnabled} />

        {/* Özet Kartlar */}
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
          <div className="rounded-2xl border border-white/[0.07] bg-[#121614] p-3.5">
            <div className="text-[11px] text-zinc-400">Onay Bekleyen PO</div>
            <div className="text-xl font-bold text-amber-300 mt-1">{stats.pendingPoConfirmCount}</div>
          </div>
          <div className="rounded-2xl border border-white/[0.07] bg-[#121614] p-3.5">
            <div className="text-[11px] text-zinc-400">Açık PO Toplamı</div>
            <div className="text-xl font-bold text-white mt-1">{stats.openPoCount}</div>
          </div>
          <div className="rounded-2xl border border-white/[0.07] bg-[#121614] p-3.5">
            <div className="text-[11px] text-zinc-400">Yanıt Bekleyen RFQ</div>
            <div className="text-xl font-bold text-sky-300 mt-1">{stats.openRfqCount}</div>
          </div>
          <div className="rounded-2xl border border-white/[0.07] bg-[#121614] p-3.5">
            <div className="text-[11px] text-zinc-400">Yoldaki ASN Sevkiyatı</div>
            <div className="text-xl font-bold text-[#34D399] mt-1">{stats.activeAsnCount}</div>
          </div>
          <div className="rounded-2xl border border-white/[0.07] bg-[#121614] p-3.5">
            <div className="text-[11px] text-zinc-400">Performans Skorum</div>
            <div className="text-xl font-bold text-[#34D399] mt-1">
              {scorecard?.live?.compositeScore ?? 100}{" "}
              <span className="text-xs font-mono text-zinc-400">
                ({scorecard?.live?.tier || "A"} Sınıfı)
              </span>
            </div>
          </div>
        </div>

        {/* Portal Sekmeleri */}
        <div className="flex flex-wrap gap-1.5 rounded-2xl border border-white/[0.07] bg-[#111513] p-1.5">
          {[
            { id: "pos", label: `Satın Alma Emirleri (${purchaseOrders.length})`, icon: ClipboardCheck },
            { id: "rfqs", label: `Teklif Talepleri (${rfqs.length})`, icon: Scale },
            { id: "asns", label: `Sevkiyat Bildirimleri (${asns.length})`, icon: Truck },
            { id: "docs", label: `Belgelerim (${documents.length})`, icon: FileCheck2 },
            { id: "score", label: "Performans Skor Kartım", icon: BarChart3 },
          ].map((tab) => {
            const Icon = tab.icon
            const active = activeTab === tab.id
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id as any)}
                className={`inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-medium transition-colors ${
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

        {/* 1. PO ONAY & KIRMIZI BAYRAK */}
        {activeTab === "pos" && (
          <div className="space-y-3">
            {purchaseOrders.length === 0 ? (
              <div className="rounded-2xl border border-white/10 bg-[#121614] p-8 text-center text-xs text-zinc-500">
                Tarafınıza iletilmiş satın alma emri bulunmuyor.
              </div>
            ) : (
              purchaseOrders.map((po: any) => (
                <div
                  key={po.id}
                  data-testid={`portal-po-${po.poNumber}`}
                  className="rounded-2xl border border-white/[0.08] bg-[#121614] p-4 space-y-3"
                >
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-mono text-sm font-bold text-[#34D399]">{po.poNumber}</span>
                        <span className="px-2 py-0.5 rounded-full text-[11px] border border-white/10 bg-white/[0.04] text-zinc-200">
                          {PO_STATUS_LABELS[po.status] || po.status}
                        </span>
                      </div>
                      <div className="text-xs text-zinc-400 mt-1">
                        Teslim Yeri: <span className="text-zinc-200">{po.warehouseName}</span> · Beklenen
                        Tarih:{" "}
                        <span className="text-zinc-200 font-mono">
                          {new Date(po.expectedDeliveryDate).toLocaleDateString("tr-TR")}
                        </span>
                      </div>
                    </div>
                    <div className="text-right font-mono">
                      <div className="text-base font-bold text-white">
                        ₺{Number(po.agreedTotalAmount).toLocaleString("tr-TR")}
                      </div>
                      <div className="text-[11px] text-zinc-400">
                        {po.totalOrderedQty} Adet Sipariş
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {(po.lines || []).map((l: any) => (
                      <div
                        key={l.id}
                        className="rounded-xl border border-white/[0.06] bg-[#0B0E0D] px-3 py-2 flex items-center justify-between text-xs"
                      >
                        <div>
                          <div className="text-zinc-200 font-medium">{l.itemName}</div>
                          <div className="text-[11px] font-mono text-zinc-500">{l.sku}</div>
                        </div>
                        <div className="text-right font-mono">
                          <div className="text-[#34D399] font-semibold">
                            {l.orderedQty} {l.unit}
                          </div>
                          <div className="text-[11px] text-zinc-400">
                            ₺{Number(l.agreedUnitPrice).toLocaleString("tr-TR")}/br
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="flex flex-wrap items-center justify-end gap-2 pt-2 border-t border-white/[0.06]">
                    {!["TESLIM_ALINDI", "TAMAMLANDI", "IPTAL"].includes(po.status) && (
                      <>
                        <button
                          type="button"
                          onClick={() => {
                            setPoActionTarget(po)
                            setPoDecision("ONAYLANDI")
                            setPoNote("")
                          }}
                          data-testid={`portal-confirm-po-${po.poNumber}`}
                          className="inline-flex items-center gap-1.5 h-8 px-3 rounded-xl bg-[#34D399] text-[#061811] text-xs font-semibold"
                        >
                          <CheckCircle2 className="size-3.5" />
                          Siparişi Onayla
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setPoActionTarget(po)
                            setPoDecision("RED_BAYRAK")
                            setPoNote("")
                          }}
                          className="inline-flex items-center gap-1.5 h-8 px-3 rounded-xl border border-rose-500/35 bg-rose-500/10 text-rose-300 text-xs font-medium"
                        >
                          <AlertTriangle className="size-3.5" />
                          Kırmızı Bayrak / Gecikme Bildir
                        </button>
                        <button
                          type="button"
                          onClick={() => openAsnModal(po)}
                          data-testid={`portal-create-asn-${po.poNumber}`}
                          className="inline-flex items-center gap-1.5 h-8 px-3 rounded-xl border border-white/15 bg-white/[0.05] text-white text-xs font-medium"
                        >
                          <Truck className="size-3.5 text-[#34D399]" />
                          ASN Ön Sevkiyat Gönder
                        </button>
                      </>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {/* 2. DAVETLİ RFQ'LAR */}
        {activeTab === "rfqs" && (
          <div className="space-y-3">
            {rfqs.map((rfq: any) => (
              <div
                key={rfq.id}
                className="rounded-2xl border border-white/[0.08] bg-[#121614] p-4 flex flex-wrap items-center justify-between gap-4"
              >
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs font-bold text-[#34D399]">{rfq.rfqNumber}</span>
                    <span className="text-sm font-semibold text-white">{rfq.title}</span>
                  </div>
                  <div className="text-xs text-zinc-400 mt-1">
                    Depo: {rfq.warehouseName} · Son Teklif:{" "}
                    {new Date(rfq.dueDate).toLocaleDateString("tr-TR")} · {rfq.items?.length || 0} Kalem
                  </div>
                  {rfq.myQuote && (
                    <div className="mt-2 inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-[#34D399]/10 border border-[#34D399]/25 text-xs text-[#34D399]">
                      Teklifiniz: {rfq.myQuote.quoteNumber} · TCO ₺
                      {Number(rfq.myQuote.tcoTotal).toLocaleString("tr-TR")} · {rfq.myQuote.status}
                    </div>
                  )}
                </div>
                {rfq.status !== "SONUCLANDI" && (
                  <button
                    type="button"
                    onClick={() => openRfqModal(rfq)}
                    data-testid={`portal-quote-rfq-${rfq.rfqNumber}`}
                    className="inline-flex items-center gap-1.5 h-9 px-3.5 rounded-xl bg-[#34D399] text-[#061811] text-xs font-semibold"
                  >
                    <Send className="size-3.5" />
                    {rfq.myQuote ? "Teklifi Güncelle" : "Fiyat & Termin Teklifi Ver"}
                  </button>
                )}
              </div>
            ))}
          </div>
        )}

        {/* 3. GÖNDERİLEN ASN'LER */}
        {activeTab === "asns" && (
          <div className="overflow-x-auto rounded-2xl border border-white/[0.08] bg-[#121614]">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-white/[0.06] text-[11px] uppercase text-zinc-400">
                <tr>
                  <th className="py-3 px-4">ASN / PO</th>
                  <th className="py-3 px-3">İrsaliye & Araç</th>
                  <th className="py-3 px-3 text-right">Sevk Miktarı</th>
                  <th className="py-3 px-3">Varış Tarihi</th>
                  <th className="py-3 px-4">Durum</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/[0.04]">
                {asns.map((a: any) => (
                  <tr key={a.id}>
                    <td className="py-3 px-4 font-mono">
                      <div className="text-[#34D399] font-bold">{a.asnNumber}</div>
                      <div className="text-zinc-500">PO: {a.poNumber}</div>
                    </td>
                    <td className="py-3 px-3">
                      <div className="text-zinc-200">{a.waybillNo || "-"}</div>
                      <div className="text-[11px] text-zinc-500">
                        {a.carrierName} · {a.vehiclePlate || "-"}
                      </div>
                    </td>
                    <td className="py-3 px-3 text-right font-mono text-zinc-200">
                      {a.totalShippedQty} Adet
                    </td>
                    <td className="py-3 px-3 font-mono text-zinc-300">
                      {new Date(a.expectedArrivalAt).toLocaleDateString("tr-TR")}
                    </td>
                    <td className="py-3 px-4">
                      <span className="px-2 py-0.5 rounded-full text-[11px] border border-white/10 bg-white/[0.04]">
                        {a.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* 4. BELGELERİM & SERTİFİKA YÜKLEME */}
        {activeTab === "docs" && (
          <div className="space-y-4">
            <form
              onSubmit={handleUploadDoc}
              className="rounded-2xl border border-white/[0.08] bg-[#121614] p-4 grid grid-cols-1 sm:grid-cols-5 gap-3 text-xs items-end"
            >
              <div>
                <label className="text-zinc-400">Belge Türü</label>
                <select
                  value={docType}
                  onChange={(e) => setDocType(e.target.value)}
                  className="mt-1 w-full h-9 px-3 rounded-xl border border-white/10 bg-[#080A09] text-white"
                >
                  {Object.entries(DOC_TYPE_LABELS).map(([k, v]) => (
                    <option key={k} value={k}>
                      {v}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-zinc-400">Belge Başlığı</label>
                <input
                  required
                  value={docTitle}
                  onChange={(e) => setDocTitle(e.target.value)}
                  placeholder="Örn: Güncel Bitki Sağlığı Belgesi"
                  className="mt-1 w-full h-9 px-3 rounded-xl border border-white/10 bg-[#080A09] text-white"
                />
              </div>
              <div>
                <label className="text-zinc-400">Geçerlilik Tarihi</label>
                <input
                  type="date"
                  value={docExpires}
                  onChange={(e) => setDocExpires(e.target.value)}
                  className="mt-1 w-full h-9 px-3 rounded-xl border border-white/10 bg-[#080A09] text-white"
                />
              </div>
              <div>
                <label className="text-zinc-400">Dosya (PDF/Görsel)</label>
                <input
                  type="file"
                  onChange={(e) => setDocFile(e.target.files?.[0] || null)}
                  className="mt-1 w-full text-[11px] text-zinc-400"
                />
              </div>
              <button
                type="submit"
                disabled={docBusy}
                className="h-9 px-4 rounded-xl bg-[#34D399] text-[#061811] font-semibold inline-flex items-center justify-center gap-1.5"
              >
                <Upload className="size-3.5" />
                {docBusy ? "Yükleniyor..." : "Belge Yükle"}
              </button>
            </form>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {documents.map((doc: any) => (
                <div
                  key={doc.id}
                  className="rounded-2xl border border-white/[0.08] bg-[#121614] p-3.5 text-xs space-y-1.5"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-white">{doc.title}</span>
                    <span className="px-2 py-0.5 rounded-full text-[10px] border border-white/10 text-[#34D399]">
                      {DOC_STATUS_LABELS[doc.status] || doc.status}
                    </span>
                  </div>
                  <div className="text-[11px] text-zinc-400">{DOC_TYPE_LABELS[doc.docType] || doc.docType}</div>
                  <div className="text-[11px] font-mono text-zinc-500">
                    {doc.fileName} · Son:{" "}
                    {doc.expiresAt ? new Date(doc.expiresAt).toLocaleDateString("tr-TR") : "Süresiz"}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* 5. PERFORMANS SKOR KARTIM */}
        {activeTab === "score" && (
          <div className="space-y-4">
            {scorecard?.live ? (
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                <div className="rounded-2xl border border-white/[0.08] bg-[#121614] p-4">
                  <div className="text-xs text-zinc-400">Zamanında Teslim (OTD)</div>
                  <div className="text-2xl font-bold text-[#34D399] mt-1">
                    %{scorecard.live.otdRate}
                  </div>
                  <div className="text-[11px] text-zinc-500 mt-1">
                    Ağırlık: %{scorecard.weights?.otdWeight}
                  </div>
                </div>
                <div className="rounded-2xl border border-white/[0.08] bg-[#121614] p-4">
                  <div className="text-xs text-zinc-400">Miktar Uyumu</div>
                  <div className="text-2xl font-bold text-white mt-1">
                    %{scorecard.live.qtyComplianceRate}
                  </div>
                  <div className="text-[11px] text-zinc-500 mt-1">
                    Ağırlık: %{scorecard.weights?.qtyWeight}
                  </div>
                </div>
                <div className="rounded-2xl border border-white/[0.08] bg-[#121614] p-4">
                  <div className="text-xs text-zinc-400">Kalite Kabul</div>
                  <div className="text-2xl font-bold text-white mt-1">
                    %{scorecard.live.qualityAcceptanceRate}
                  </div>
                  <div className="text-[11px] text-zinc-500 mt-1">
                    Ağırlık: %{scorecard.weights?.qualityWeight}
                  </div>
                </div>
                <div className="rounded-2xl border border-[#34D399]/30 bg-[#34D399]/[0.06] p-4">
                  <div className="text-xs text-[#34D399]">Genel Skor & Sınıf</div>
                  <div className="text-2xl font-bold text-white mt-1">
                    {scorecard.live.compositeScore} ({scorecard.live.tier})
                  </div>
                  <div className="text-[11px] text-zinc-400 mt-1">
                    {scorecard.live.poCount} teslimat üzerinden hesaplandı
                  </div>
                </div>
              </div>
            ) : (
              <div className="rounded-2xl border border-white/10 bg-[#121614] p-6 text-xs text-zinc-400">
                Henüz kapanmış teslimatınız olmadığı için baz skor uygulanmaktadır.
              </div>
            )}
          </div>
        )}
      </main>

      {/* PO YANIT MODALI */}
      {poActionTarget && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
          <form
            onSubmit={submitPoDecision}
            className="w-full max-w-md rounded-2xl border border-white/10 bg-[#101412] p-5 space-y-4 text-xs"
          >
            <div className="font-semibold text-white text-sm">
              {poActionTarget.poNumber} — Tedarikçi Yanıtı
            </div>
            <select
              value={poDecision}
              onChange={(e) => setPoDecision(e.target.value as any)}
              className="w-full h-9 px-3 rounded-xl border border-white/10 bg-[#080A09] text-white"
            >
              <option value="ONAYLANDI">Tam Onay — Belirtilen Tarihte Teslim Edeceğiz</option>
              <option value="KISMI_ONAY">Kısmi Onay / Revize Termin Bildir</option>
              <option value="RED_BAYRAK">Kırmızı Bayrak — Gecikme / Stok Engeli Bildir</option>
            </select>
            <div>
              <label className="text-zinc-400">Taahhüt Edilen Teslim Tarihi</label>
              <input
                type="date"
                value={poPromisedDate}
                onChange={(e) => setPoPromisedDate(e.target.value)}
                className="mt-1 w-full h-9 px-3 rounded-xl border border-white/10 bg-[#080A09] text-white"
              />
            </div>
            <div>
              <label className="text-zinc-400">
                {poDecision === "RED_BAYRAK" ? "Kırmızı Bayrak Nedeni (Zorunlu) *" : "Not / Açıklama"}
              </label>
              <textarea
                required={poDecision === "RED_BAYRAK"}
                rows={3}
                value={poNote}
                onChange={(e) => setPoNote(e.target.value)}
                placeholder="Örn: Gümrük uçak kargo gecikmesi veya sevkiyat teyidi..."
                className="mt-1 w-full p-2.5 rounded-xl border border-white/10 bg-[#080A09] text-white"
              />
            </div>
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setPoActionTarget(null)}
                className="h-9 px-3 rounded-xl border border-white/10 text-zinc-300"
              >
                Vazgeç
              </button>
              <button
                type="submit"
                disabled={poBusy}
                className="h-9 px-4 rounded-xl bg-[#34D399] text-[#061811] font-semibold"
              >
                {poBusy ? "Gönderiliyor..." : "Yanıtı Gönder"}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* ASN OLUŞTURMA MODALI */}
      {asnModalPo && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
          <form
            onSubmit={submitAsn}
            className="w-full max-w-lg rounded-2xl border border-white/10 bg-[#101412] p-5 space-y-4 text-xs"
          >
            <div className="font-semibold text-white text-sm">
              ASN Ön Sevkiyat İhbarı ({asnModalPo.poNumber})
            </div>
            <div className="grid grid-cols-2 gap-2.5">
              <div>
                <label className="text-zinc-400">İrsaliye No *</label>
                <input
                  required
                  value={asnWaybill}
                  onChange={(e) => setAsnWaybill(e.target.value)}
                  className="mt-1 w-full h-9 px-3 rounded-xl border border-white/10 bg-[#080A09] text-white"
                />
              </div>
              <div>
                <label className="text-zinc-400">Tahmini Varış Tarihi *</label>
                <input
                  required
                  type="date"
                  value={asnArrival}
                  onChange={(e) => setAsnArrival(e.target.value)}
                  className="mt-1 w-full h-9 px-3 rounded-xl border border-white/10 bg-[#080A09] text-white"
                />
              </div>
              <div>
                <label className="text-zinc-400">Taşıyıcı Firma</label>
                <input
                  value={asnCarrier}
                  onChange={(e) => setAsnCarrier(e.target.value)}
                  className="mt-1 w-full h-9 px-3 rounded-xl border border-white/10 bg-[#080A09] text-white"
                />
              </div>
              <div>
                <label className="text-zinc-400">Araç Plakası</label>
                <input
                  value={asnPlate}
                  onChange={(e) => setAsnPlate(e.target.value)}
                  className="mt-1 w-full h-9 px-3 rounded-xl border border-white/10 bg-[#080A09] text-white"
                />
              </div>
            </div>
            <div className="space-y-2 max-h-48 overflow-y-auto">
              {(asnModalPo.lines || []).map((l: any) => (
                <div
                  key={l.id}
                  className="grid grid-cols-12 gap-2 items-center rounded-xl border border-white/10 bg-white/[0.02] p-2"
                >
                  <div className="col-span-5">
                    <div className="text-zinc-200 font-medium">{l.itemName}</div>
                    <div className="text-[10px] text-zinc-500">Sipariş: {l.orderedQty}</div>
                  </div>
                  <div className="col-span-3">
                    <input
                      type="number"
                      min={1}
                      value={asnLineQty[l.itemId] || ""}
                      onChange={(e) =>
                        setAsnLineQty((p) => ({ ...p, [l.itemId]: e.target.value }))
                      }
                      className="w-full h-8 px-2 rounded-lg border border-white/10 bg-[#080A09] text-white font-mono"
                    />
                  </div>
                  <div className="col-span-4">
                    <input
                      placeholder="Lot No"
                      value={asnLineLot[l.itemId] || ""}
                      onChange={(e) =>
                        setAsnLineLot((p) => ({ ...p, [l.itemId]: e.target.value }))
                      }
                      className="w-full h-8 px-2 rounded-lg border border-white/10 bg-[#080A09] text-white font-mono"
                    />
                  </div>
                </div>
              ))}
            </div>
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setAsnModalPo(null)}
                className="h-9 px-3 rounded-xl border border-white/10 text-zinc-300"
              >
                Vazgeç
              </button>
              <button
                type="submit"
                disabled={asnBusy}
                className="h-9 px-4 rounded-xl bg-[#34D399] text-[#061811] font-semibold"
              >
                {asnBusy ? "Gönderiliyor..." : "ASN İhbarını Gönder"}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* RFQ TEKLİF VERME MODALI */}
      {rfqTarget && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
          <form
            onSubmit={submitRfq}
            className="w-full max-w-lg rounded-2xl border border-white/10 bg-[#101412] p-5 space-y-4 text-xs"
          >
            <div className="font-semibold text-white text-sm">
              RFQ Teklifi Gönder ({rfqTarget.rfqNumber})
            </div>
            <div className="grid grid-cols-3 gap-2">
              <div>
                <label className="text-zinc-400">Termin (Gün)</label>
                <input
                  type="number"
                  min={1}
                  value={rfqLeadDays}
                  onChange={(e) => setRfqLeadDays(e.target.value)}
                  className="mt-1 w-full h-9 px-3 rounded-xl border border-white/10 bg-[#080A09] text-white"
                />
              </div>
              <div>
                <label className="text-zinc-400">Nakliye (₺)</label>
                <input
                  type="number"
                  min={0}
                  value={rfqShipping}
                  onChange={(e) => setRfqShipping(e.target.value)}
                  className="mt-1 w-full h-9 px-3 rounded-xl border border-white/10 bg-[#080A09] text-white"
                />
              </div>
              <div>
                <label className="text-zinc-400">Vade</label>
                <input
                  value={rfqPayment}
                  onChange={(e) => setRfqPayment(e.target.value)}
                  className="mt-1 w-full h-9 px-3 rounded-xl border border-white/10 bg-[#080A09] text-white"
                />
              </div>
            </div>
            <div className="space-y-2 max-h-48 overflow-y-auto">
              {(rfqTarget.items || []).map((it: any) => (
                <div
                  key={it.id}
                  className="flex items-center justify-between gap-2 rounded-xl border border-white/10 bg-white/[0.02] p-2.5"
                >
                  <div>
                    <div className="text-zinc-200 font-medium">{it.itemName}</div>
                    <div className="text-[11px] text-zinc-500">
                      {it.requestedQty} {it.unit}
                    </div>
                  </div>
                  <input
                    type="number"
                    step="0.01"
                    min="0.01"
                    value={rfqPrices[it.id] || ""}
                    onChange={(e) =>
                      setRfqPrices((p) => ({ ...p, [it.id]: e.target.value }))
                    }
                    className="w-28 h-8 px-2 rounded-lg border border-white/10 bg-[#080A09] text-white text-right font-mono"
                  />
                </div>
              ))}
            </div>
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setRfqTarget(null)}
                className="h-9 px-3 rounded-xl border border-white/10 text-zinc-300"
              >
                Vazgeç
              </button>
              <button
                type="submit"
                disabled={rfqBusy}
                className="h-9 px-4 rounded-xl bg-[#34D399] text-[#061811] font-semibold"
              >
                {rfqBusy ? "Gönderiliyor..." : "Teklifi Gönder"}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  )
}
