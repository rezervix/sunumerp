"use client"

import { useRouter } from "next/navigation"
import { useLanguage } from "@/lib/context/LanguageContext"


import { useState, useEffect, useCallback } from "react"
import { motion } from "framer-motion"
import { useAuth } from "@/lib/auth/context"
import { Button } from "@/components/ui/button"
import { toast } from "sonner"
import {
  calculatePrice,
  applyRounding,
  getProfitMargin,
  type RoundingStrategy,
} from "@/lib/services/calculationService"

// ─────────────────────────────────────────────────────────────────────────────
// Sabitler
// ─────────────────────────────────────────────────────────────────────────────

const INSTALLMENT_RATES: Record<number, number> = {
  3: 9.74,
  6: 15.85,
  9: 21.97,
}

// ─────────────────────────────────────────────────────────────────────────────
// Yardımcı: Sayı formatı
// ─────────────────────────────────────────────────────────────────────────────

function fmt(n: number) {
  return n.toLocaleString("tr-TR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

// ─────────────────────────────────────────────────────────────────────────────
// Tip: Hesaplama sonucu (genişletilmiş)
// ─────────────────────────────────────────────────────────────────────────────

interface ExtendedResult {
  baseCost: number
  vatAmount: number
  commissionAmount: number
  fieldSalesCommAmount: number
  adCostAmount: number
  installmentFeeAmount: number
  totalCost: number
  appliedProfitRate: number
  profitAmount: number
  calculatedPrice: number
  roundedPrice: number
  grossProfit: number
  netProfit: number
  netProfitMargin: number
}

// ─────────────────────────────────────────────────────────────────────────────
// Hesaplama Mantığı (Frontend — Anlık)
// ─────────────────────────────────────────────────────────────────────────────

function computeAll(params: {
  productCost: number
  shippingCost: number
  commissionRate: number
  vatRate: number
  variantPrice: number
  subtractVariant: boolean
  roundingStrategy: RoundingStrategy
  manualProfitRate: number | undefined
  // Yeni
  fieldSalesCommType: "amount" | "percent"
  fieldSalesCommValue: number
  adCostPerMessage: number
  installmentCount: number
}): ExtendedResult {
  // 1. Temel maliyet (ürün + kargo ± varyant)
  let baseCost = params.productCost + params.shippingCost
  if (params.variantPrice > 0) {
    baseCost = params.subtractVariant ? baseCost - params.variantPrice : baseCost + params.variantPrice
  }
  if (baseCost < 0) baseCost = 0

  // 2. KDV
  const vatAmount = baseCost * (params.vatRate / 100)

  // 3. Pazaryeri Komisyonu
  const commissionAmount = baseCost * (params.commissionRate / 100)

  // 4. Saha Satış Komisyonu
  const fieldSalesCommAmount = params.fieldSalesCommType === "amount"
    ? params.fieldSalesCommValue
    : baseCost * (params.fieldSalesCommValue / 100)

  // 5. Reklam Gideri (Mesaj başına ücret → direkt maliyet)
  const adCostAmount = params.adCostPerMessage

  // 6. Ara toplam maliyet (taksit komisyonu hariç)
  const subTotalCost = baseCost + vatAmount + commissionAmount + fieldSalesCommAmount + adCostAmount

  // 7. Taksit Komisyonu (subTotalCost üzerinden)
  const installmentRate = INSTALLMENT_RATES[params.installmentCount] ?? 0
  const installmentFeeAmount = subTotalCost * (installmentRate / 100)

  // 8. Toplam Fiili Maliyet
  const totalCost = subTotalCost + installmentFeeAmount

  // 9. Kâr Marjı
  const appliedProfitRate =
    params.manualProfitRate !== undefined && params.manualProfitRate > 0
      ? params.manualProfitRate
      : getProfitMargin(totalCost)

  // 10. Kâr Tutarı & Satış Fiyatı
  const profitAmount = totalCost * (appliedProfitRate / 100)
  const calculatedPrice = totalCost + profitAmount
  const roundedPrice = applyRounding(calculatedPrice, params.roundingStrategy)

  // 11. Kâr Analizi
  const grossProfit = roundedPrice - baseCost
  const netProfit = roundedPrice - totalCost
  const netProfitMargin = roundedPrice > 0 ? (netProfit / roundedPrice) * 100 : 0

  return {
    baseCost: +baseCost.toFixed(2),
    vatAmount: +vatAmount.toFixed(2),
    commissionAmount: +commissionAmount.toFixed(2),
    fieldSalesCommAmount: +fieldSalesCommAmount.toFixed(2),
    adCostAmount: +adCostAmount.toFixed(2),
    installmentFeeAmount: +installmentFeeAmount.toFixed(2),
    totalCost: +totalCost.toFixed(2),
    appliedProfitRate: +appliedProfitRate.toFixed(2),
    profitAmount: +profitAmount.toFixed(2),
    calculatedPrice: +calculatedPrice.toFixed(2),
    roundedPrice: +roundedPrice.toFixed(2),
    grossProfit: +grossProfit.toFixed(2),
    netProfit: +netProfit.toFixed(2),
    netProfitMargin: +netProfitMargin.toFixed(2),
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Bileşen: Maliyet Satırı (Sonuçlar paneli için)
// ─────────────────────────────────────────────────────────────────────────────

function CostRow({ dot, label, value, plus = true }: { dot: string; label: string; value: number; plus?: boolean }) {
  if (value === 0) return null
  return (
    <div className="flex justify-between items-center relative pl-6">
      <div
        className="absolute left-0 top-1/2 -translate-y-1/2 size-4 rounded-full border-2 border-slate-900 flex items-center justify-center z-10"
        style={{ backgroundColor: `${dot}22` }}
      >
        <div className="size-1.5 rounded-full" style={{ backgroundColor: dot }} />
      </div>
      <span className="text-sm text-white/60">{label}</span>
      <span className="text-sm font-medium text-white">
        {plus ? "+" : ""}{fmt(value)} ₺
      </span>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Ana Bileşen
// ─────────────────────────────────────────────────────────────────────────────

export default function HesaplamaAraciPage() {
  const { t, tText } = useLanguage()
  const { hasPermission, isSuperAdmin, loading: authLoading, session } = useAuth()
  const router = useRouter()

  useEffect(() => {
    if (!authLoading && !hasPermission("hesaplama", "read") && !isSuperAdmin) {
      router.replace("/dashboard")
    }
  }, [authLoading, hasPermission, isSuperAdmin, router])

  // ── Temel Maliyet Parametreleri
  const [productCost, setProductCost] = useState<string>("")
  const [shippingCost, setShippingCost] = useState<string>("0")
  const [commissionRate, setCommissionRate] = useState<string>("20")
  const [vatRate, setVatRate] = useState<string>("20")
  const [variantPrice, setVariantPrice] = useState<string>("0")
  const [subtractVariant, setSubtractVariant] = useState<boolean>(false)
  const [roundingStrategy, setRoundingStrategy] = useState<RoundingStrategy>("hundred")
  const [manualProfitRate, setManualProfitRate] = useState<string>("")
  const [saveToHistory, setSaveToHistory] = useState<boolean>(false)

  // ── Yeni Modüller
  const [fieldSalesCommType, setFieldSalesCommType] = useState<"amount" | "percent">("percent")
  const [fieldSalesCommValue, setFieldSalesCommValue] = useState<string>("")
  const [adCostPerMessage, setAdCostPerMessage] = useState<string>("")
  const [installmentCount, setInstallmentCount] = useState<number>(0)

  // ── Sonuç
  const [result, setResult] = useState<ExtendedResult | null>(null)
  const [savingHistory, setSavingHistory] = useState<boolean>(false)

  // ── Anlık Hesaplama (her parametre değişiminde)
  const compute = useCallback(() => {
    const pc = parseFloat(productCost) || 0
    if (pc <= 0) { setResult(null); return }

    const r = computeAll({
      productCost: pc,
      shippingCost: parseFloat(shippingCost) || 0,
      commissionRate: parseFloat(commissionRate) || 0,
      vatRate: parseFloat(vatRate) || 0,
      variantPrice: parseFloat(variantPrice) || 0,
      subtractVariant,
      roundingStrategy,
      manualProfitRate: manualProfitRate ? parseFloat(manualProfitRate) : undefined,
      fieldSalesCommType,
      fieldSalesCommValue: parseFloat(fieldSalesCommValue) || 0,
      adCostPerMessage: parseFloat(adCostPerMessage) || 0,
      installmentCount,
    })
    setResult(r)
  }, [
    productCost, shippingCost, commissionRate, vatRate, variantPrice,
    subtractVariant, roundingStrategy, manualProfitRate,
    fieldSalesCommType, fieldSalesCommValue, adCostPerMessage, installmentCount,
  ])

  useEffect(() => { compute() }, [compute])

  if (!session) return null

  // ── Geçmişe Kaydet (sadece butona basılınca API çağrısı)
  const handleSaveHistory = async () => {
    if (!result) return
    setSavingHistory(true)
    try {
      const res = await fetch("/api/calculator/calculate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          productCost: parseFloat(productCost) || 0,
          shippingCost: parseFloat(shippingCost) || 0,
          commissionRate: parseFloat(commissionRate) || 0,
          vatRate: parseFloat(vatRate) || 0,
          variantPrice: parseFloat(variantPrice) || 0,
          subtractVariant,
          roundingStrategy,
          manualProfitRate: manualProfitRate ? parseFloat(manualProfitRate) : undefined,
          saveToHistory: true,
        }),
      })
      if (!res.ok) throw new Error()
      toast.success("Hesaplama geçmişe kaydedildi!")
    } catch {
      toast.error("Geçmişe kaydedilemedi")
    } finally {
      setSavingHistory(false)
    }
  }

  const handleReset = () => {
    setProductCost(""); setShippingCost("0"); setCommissionRate("20")
    setVatRate("20"); setVariantPrice("0"); setSubtractVariant(false)
    setRoundingStrategy("hundred"); setManualProfitRate("")
    setFieldSalesCommType("percent"); setFieldSalesCommValue("")
    setAdCostPerMessage(""); setInstallmentCount(0)
    setResult(null)
  }

  const INSTALLMENT_OPTIONS = [
    { value: 0,  label: "Taksit Yok" },
    { value: 3,  label: "3 Taksit (+%9,74)" },
    { value: 6,  label: "6 Taksit (+%15,85)" },
    { value: 9,  label: "9 Taksit (+%21,97)" },
  ]

  return (
    <div className="flex flex-col gap-6">

      {/* ── Sayfa Başlığı ── */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-white">Hesaplama Aracı</h1>
          <p className="text-sm text-white/60 mt-1.5">
            Dinamik kâr marjı kurallarına göre anlık optimum satış fiyatı hesaplama motoru.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 items-start">

        {/* ── Sol Panel: Parametreler ── */}
        <div className="xl:col-span-5 relative z-10">
          <div className="glass-panel rounded-2xl p-6 space-y-6">
            <h2 className="text-base font-semibold text-white flex items-center gap-2">
              <span className="material-symbols-outlined text-sky-400 text-[20px]">tune</span>
              Hesaplama Parametreleri
            </h2>

            {/* ── Bölüm 1: Temel Maliyetler ── */}
            <div>
              <p className="text-[11px] font-bold text-white/50 uppercase tracking-wider mb-3">Temel Maliyetler</p>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-white/80">Ürün Maliyeti (₺) *</label>
                  <input
                    type="number" step="0.01" min="0" required
                    value={productCost}
                    onChange={e => setProductCost(e.target.value)}
                    className="glass-input w-full px-3 py-2 text-sm outline-none transition-all"
                    placeholder="0.00"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-white/80">Kargo Maliyeti (₺)</label>
                  <input
                    type="number" step="0.01" min="0"
                    value={shippingCost}
                    onChange={e => setShippingCost(e.target.value)}
                    className="glass-input w-full px-3 py-2 text-sm outline-none transition-all"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4 mt-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-white/80">Pazaryeri Komisyonu (%)</label>
                  <input
                    type="number" step="0.1" min="0" max="100"
                    value={commissionRate}
                    onChange={e => setCommissionRate(e.target.value)}
                    className="glass-input w-full px-3 py-2 text-sm outline-none transition-all"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-white/80">KDV Oranı (%)</label>
                  <input
                    type="number" step="0.1" min="0" max="100"
                    value={vatRate}
                    onChange={e => setVatRate(e.target.value)}
                    className="glass-input w-full px-3 py-2 text-sm outline-none transition-all"
                  />
                </div>
              </div>
            </div>

            {/* ── Bölüm 2: Varyant ── */}
            <div className="p-4 bg-white/[0.03] rounded-xl border border-white/10 space-y-3">
              <div className="flex items-center justify-between">
                <label className="text-xs font-semibold text-white/80 flex items-center gap-1.5">
                  <span className="material-symbols-outlined text-[16px] text-white/50">category</span>
                  Varyant Fiyat Farkı
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <span className="text-[11px] font-medium text-white/60">Maliyetten Düş (−)</span>
                  <input
                    type="checkbox"
                    checked={subtractVariant}
                    onChange={e => setSubtractVariant(e.target.checked)}
                    className="rounded border-white/20 accent-indigo-500"
                  />
                </label>
              </div>
              <input
                type="number" step="0.01" min="0"
                value={variantPrice}
                onChange={e => setVariantPrice(e.target.value)}
                className="glass-input w-full px-3 py-2 text-sm outline-none transition-all"
                placeholder="0.00"
              />
            </div>

            {/* ── Bölüm 3: Saha Satış Komisyonu (YENİ) ── */}
            <div className="p-4 bg-sky-500/10 rounded-xl border border-sky-500/25 space-y-3">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-sky-300 flex items-center gap-1.5">
                  <span className="material-symbols-outlined text-[16px]">person_pin_circle</span>
                  Saha Satış Komisyonu
                </label>
                {/* Toggle: Sabit TL / Yüzde % */}
                <div className="flex items-center gap-1 bg-black/30 backdrop-blur-md border border-white/10 rounded-xl p-1">
                  {(["amount", "percent"] as const).map(t => (
                    <button
                      key={t}
                      type="button"
                      onClick={() => setFieldSalesCommType(t)}
                      className={[
                        "px-2.5 py-1 text-[11px] font-semibold transition-all",
                        fieldSalesCommType === t
                          ? "bg-white/15 text-white shadow-sm rounded-lg"
                          : "text-white/60 hover:text-white rounded-lg",
                      ].join(" ")}
                    >
                      {t === "amount" ? "Sabit ₺" : "Oran %"}
                    </button>
                  ))}
                </div>
              </div>
              <div className="relative">
                <input
                  type="number" step="0.01" min="0"
                  value={fieldSalesCommValue}
                  onChange={e => setFieldSalesCommValue(e.target.value)}
                  className="glass-input w-full pl-3 pr-10 py-2 text-sm outline-none transition-all"
                  placeholder={fieldSalesCommType === "amount" ? "Sabit tutar (₺)" : "Yüzde oran (%)"}
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold text-sky-400">
                  {fieldSalesCommType === "amount" ? "₺" : "%"}
                </span>
              </div>
            </div>

            {/* ── Bölüm 4: Reklam Gideri (YENİ) ── */}
            <div className="p-4 bg-purple-500/10 rounded-xl border border-purple-500/25 space-y-3">
              <label className="text-xs font-bold text-purple-300 flex items-center gap-1.5">
                <span className="material-symbols-outlined text-[16px]">ads_click</span>
                Reklam Gideri (Google Ads / Meta)
              </label>
              <div className="relative">
                <input
                  type="number" step="0.01" min="0"
                  value={adCostPerMessage}
                  onChange={e => setAdCostPerMessage(e.target.value)}
                  className="glass-input w-full pl-3 pr-14 py-2 text-sm outline-none transition-all"
                  placeholder="Mesaj başına ücret..."
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] font-bold text-purple-300 whitespace-nowrap">₺/mesaj</span>
              </div>
              <p className="text-[11px] text-purple-300/70">
                Bu tutar, ürün maliyetine otomatik olarak eklenir.
              </p>
            </div>

            {/* ── Bölüm 5: Vade Farksız Taksit (YENİ) ── */}
            <div className="p-4 bg-amber-500/10 rounded-xl border border-amber-500/25 space-y-3">
              <label className="text-xs font-bold text-amber-300 flex items-center gap-1.5">
                <span className="material-symbols-outlined text-[16px]">credit_card</span>
                Vade Farksız Taksit Komisyonu
              </label>
              <div className="grid grid-cols-2 gap-2">
                {INSTALLMENT_OPTIONS.map(opt => (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => setInstallmentCount(opt.value)}
                    className={[
                      "px-3 py-2.5 rounded-xl text-xs font-semibold text-left transition-all border",
                      installmentCount === opt.value
                        ? "bg-amber-500/25 text-amber-200 border-amber-400/50 shadow-md shadow-amber-500/10"
                        : "bg-black/20 text-white/70 border-white/10 hover:border-amber-400/40 hover:text-white",
                    ].join(" ")}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
              {installmentCount > 0 && (
                <p className="text-[11px] text-amber-300/80">
                  {installmentCount} taksit için <strong>%{INSTALLMENT_RATES[installmentCount]}</strong> komisyon maliyete eklendi.
                </p>
              )}
            </div>

            {/* ── Bölüm 6: Yuvarlama ve Manuel Mod ── */}
            <div className="space-y-4 pt-2 border-t border-white/10">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-white/80">Fiyat Yuvarlama Stratejisi</label>
                <select
                  value={roundingStrategy}
                  onChange={e => setRoundingStrategy(e.target.value as RoundingStrategy)}
                  className="glass-input w-full px-3 py-2 text-sm outline-none transition-all"
                >
                  <option value="none" className="bg-slate-900 text-white">Yuvarlama Yapma (Ör: 1445.50)</option>
                  <option value="hundred" className="bg-slate-900 text-white">En Yakın Yüzlüğe Yuvarla (Ör: 1400 / 1500)</option>
                  <option value="90" className="bg-slate-900 text-white">Sonu 90 İle Bitsin (Ör: 1490)</option>
                  <option value="99" className="bg-slate-900 text-white">Sonu 99 İle Bitsin (Ör: 1499)</option>
                  <option value="premium" className="bg-slate-900 text-white">Premium Görünüm (Ör: 1440)</option>
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-white/80 flex items-center justify-between">
                  <span>Senaryo Simülasyonu: Manuel Kâr (%)</span>
                  <span className="text-[10px] text-amber-300 bg-amber-500/15 border border-amber-500/30 px-2 py-0.5 rounded-full">Opsiyonel</span>
                </label>
                <input
                  type="number" step="0.1" min="0"
                  value={manualProfitRate}
                  onChange={e => setManualProfitRate(e.target.value)}
                  className="glass-input w-full px-3 py-2 text-sm outline-none transition-all"
                  placeholder="Otomatik kuralları ezmek için oran girin..."
                />
                <p className="text-[11px] text-white/50">
                  Sistem normalde 0–500 ₺ arası %170, 500–1000 ₺ arası %150 vb. kuralları otomatik uygular.
                </p>
              </div>
            </div>

            {/* ── Aksiyonlar ── */}
            <div className="flex gap-3 pt-2 relative z-20">
              <Button type="button" variant="outline" className="flex-1 bg-white/5 border-white/10 text-white hover:bg-white/10" onClick={handleReset}>
                Sıfırla
              </Button>

              {result && saveToHistory && (
                <Button
                  type="button"
                  className="flex-1 bg-gradient-to-r from-indigo-500 to-blue-600 hover:from-indigo-600 hover:to-blue-700 text-white shadow-lg shadow-indigo-500/20 border border-white/15 relative z-20"
                  onClick={handleSaveHistory}
                  disabled={savingHistory}
                >
                  {savingHistory ? "Kaydediliyor..." : "Geçmişe Kaydet"}
                </Button>
              )}
            </div>

            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={saveToHistory}
                onChange={e => setSaveToHistory(e.target.checked)}
                className="rounded border-white/20 accent-indigo-500"
              />
              <span className="text-xs font-medium text-white/70">
                Hesaplamayı veritabanına kaydet (Geçmiş)
              </span>
            </label>
          </div>
        </div>

        {/* ── Sağ Panel: Sonuçlar ── */}
        <div className="xl:col-span-7 space-y-6">
          {result ? (
            <div className="glass-panel rounded-2xl overflow-hidden animate-in fade-in slide-in-from-bottom-4 duration-300">

              {/* Sonuç Header */}
              <div className="bg-gradient-to-r from-emerald-500/15 via-slate-900/60 to-indigo-500/15 border-b border-white/15 p-6 flex flex-col sm:flex-row items-center justify-between gap-4">
                <div>
                  <p className="text-sm font-semibold text-emerald-300 mb-1 text-center sm:text-left">
                    Önerilen Satış Fiyatı
                    {installmentCount > 0 && (
                      <span className="ml-2 text-xs bg-amber-500/15 text-amber-300 border border-amber-500/30 px-2.5 py-0.5 rounded-full font-medium">
                        {installmentCount} taksit dahil
                      </span>
                    )}
                  </p>
                  <div className="flex items-end gap-2 justify-center sm:justify-start">
                    <span className="text-4xl font-black tracking-tight text-white">
                      {fmt(result.roundedPrice)}
                    </span>
                    <span className="text-xl font-bold text-emerald-400 mb-1">₺</span>
                  </div>
                </div>

                {/* Anlık güncelleme göstergesi */}
                <div className="flex items-center gap-1.5 text-xs font-medium text-emerald-300 bg-emerald-500/15 border border-emerald-500/30 px-3 py-1.5 rounded-full shrink-0">
                  <div className="size-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  Anlık Hesaplanıyor
                </div>
              </div>

              <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-8">

                {/* Sol: Maliyet Dağılımı */}
                <div className="space-y-4">
                  <h3 className="text-sm font-bold text-white border-b border-white/10 pb-2">Maliyet Dağılımı</h3>
                  <div className="space-y-3 relative">
                    <div className="absolute left-2 top-3 bottom-3 w-px bg-white/15" />
                    <CostRow dot="#38bdf8" label="Ara Maliyet (Ürün + Kargo)" value={result.baseCost} plus={false} />
                    <CostRow dot="#fb923c" label={`KDV (%${vatRate})`} value={result.vatAmount} />
                    <CostRow dot="#a78bfa" label={`Pazaryeri Komisyonu (%${commissionRate})`} value={result.commissionAmount} />
                    <CostRow dot="#22d3ee" label={`Saha Komisyonu (${fieldSalesCommType === "amount" ? "₺" + fieldSalesCommValue : "%" + fieldSalesCommValue})`} value={result.fieldSalesCommAmount} />
                    <CostRow dot="#f472b6" label="Reklam Gideri" value={result.adCostAmount} />
                    <CostRow dot="#fbbf24" label={`Taksit Komisyonu (%${INSTALLMENT_RATES[installmentCount] ?? 0})`} value={result.installmentFeeAmount} />
                  </div>

                  <div className="mt-4 pt-3 border-t border-white/15 border-dashed flex justify-between items-center pl-6">
                    <span className="text-sm font-bold text-white">Toplam Fiili Maliyet</span>
                    <span className="text-base font-black text-sky-400">{fmt(result.totalCost)} ₺</span>
                  </div>
                </div>

                {/* Sağ: Kâr Analizi */}
                <div className="space-y-4">
                  <h3 className="text-sm font-bold text-white border-b border-white/10 pb-2">Kâr Analizi</h3>

                  <div className="grid grid-cols-2 gap-3">
                    <motion.div whileHover={{ y: -3 }} className="glass-card p-4 rounded-2xl">
                      <p className="text-[11px] font-medium text-white/60 uppercase tracking-wider mb-1">Uygulanan Marj</p>
                      <p className="text-3xl font-bold text-emerald-400">%{result.appliedProfitRate}</p>
                      {!manualProfitRate && <p className="text-[10px] text-white/40 mt-1">Otomatik kural</p>}
                    </motion.div>
                    <motion.div whileHover={{ y: -3 }} className="glass-card p-4 rounded-2xl">
                      <p className="text-[11px] font-medium text-white/60 uppercase tracking-wider mb-1">Kâr Tutarı</p>
                      <p className="text-3xl font-bold text-emerald-400">+{fmt(result.profitAmount)} ₺</p>
                    </motion.div>
                  </div>

                  <div className="grid grid-cols-2 gap-3 mt-3">
                    <motion.div whileHover={{ y: -3 }} className="glass-card p-4 rounded-2xl border-emerald-500/30 bg-emerald-500/10">
                      <p className="text-[11px] font-medium text-emerald-300 uppercase tracking-wider mb-1">Brüt Kâr</p>
                      <p className="text-3xl font-bold text-emerald-400">{fmt(result.grossProfit)} ₺</p>
                      <p className="text-[10px] text-emerald-300/70 mt-1">Satış − (Ürün+Kargo)</p>
                    </motion.div>
                    <motion.div whileHover={{ y: -3 }} className="glass-card p-4 rounded-2xl border-sky-500/30 bg-sky-500/10 relative overflow-hidden">
                      <div className="absolute right-0 top-0 bottom-0 w-1 bg-emerald-400" />
                      <p className="text-[11px] font-medium text-sky-300 uppercase tracking-wider mb-1">Net Kâr</p>
                      <p className="text-3xl font-bold text-emerald-400">{fmt(result.netProfit)} ₺</p>
                      <p className="text-[10px] font-semibold text-emerald-300 mt-1">Marj: %{result.netProfitMargin}</p>
                    </motion.div>
                  </div>

                  {/* Yeni maliyet kalemleri özeti */}
                  {(result.fieldSalesCommAmount > 0 || result.adCostAmount > 0 || result.installmentFeeAmount > 0) && (
                    <div className="mt-3 p-3 bg-white/[0.03] rounded-xl border border-white/10 space-y-1.5">
                      <p className="text-[11px] font-bold text-white/50 uppercase tracking-wider">Ek Maliyet Özeti</p>
                      {result.fieldSalesCommAmount > 0 && (
                        <div className="flex justify-between text-xs">
                          <span className="text-white/60">Saha Satış Komisyonu</span>
                          <span className="font-semibold text-white">+{fmt(result.fieldSalesCommAmount)} ₺</span>
                        </div>
                      )}
                      {result.adCostAmount > 0 && (
                        <div className="flex justify-between text-xs">
                          <span className="text-white/60">Reklam Gideri</span>
                          <span className="font-semibold text-white">+{fmt(result.adCostAmount)} ₺</span>
                        </div>
                      )}
                      {result.installmentFeeAmount > 0 && (
                        <div className="flex justify-between text-xs">
                          <span className="text-white/60">Taksit Komisyonu (%{INSTALLMENT_RATES[installmentCount]})</span>
                          <span className="font-semibold text-white">+{fmt(result.installmentFeeAmount)} ₺</span>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>

              {/* Ekstra Bilgi */}
              <div className="bg-white/[0.02] px-6 py-4 border-t border-white/10 text-xs text-center sm:text-left text-white/60">
                <span className="font-semibold text-white">Hesaplanan Çıplak Fiyat:</span>{" "}
                {fmt(result.calculatedPrice)} ₺
                {" "}(Seçilen &apos;{roundingStrategy}&apos; stratejisine göre {fmt(result.roundedPrice)} ₺ olarak yuvarlandı)
              </div>
            </div>
          ) : (
            <div className="h-full glass-panel rounded-2xl flex flex-col items-center justify-center p-12 text-center min-h-[320px]">
              <div className="w-16 h-16 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center mb-4">
                <span className="material-symbols-outlined text-sky-400 text-3xl">calculate</span>
              </div>
              <h3 className="text-lg font-bold text-white mb-2">Sonuç Bekleniyor</h3>
              <p className="text-sm text-white/60 max-w-[280px]">
                Sol taraftaki parametreleri doldurun — sonuçlar anlık olarak hesaplanacaktır.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* ── Yeni: Hesaplama Geçmişi Paneli ── */}
      <CalculationHistoryPanel onRestore={(rec) => {
        setProductCost(rec.productCost.toString());
        setRoundingStrategy(rec.roundingStrategy as RoundingStrategy);
        window.scrollTo({ top: 0, behavior: "smooth" });
      }} />
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Bileşen: Hesaplama Geçmişi Paneli (Ekran A)
// ─────────────────────────────────────────────────────────────────────────────
function CalculationHistoryPanel({ onRestore }: { onRestore: (record: any) => void }) {
  const [history, setHistory] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [deletingId, setDeletingId] = useState<string | null>(null)

  const loadHistory = useCallback(async (p: number) => {
    setLoading(true)
    try {
      const res = await fetch(`/api/calculator/history?page=${p}&pageSize=10`)
      if (res.ok) {
        const json = await res.json()
        setHistory(json.data || [])
        setTotalPages(json.totalPages || 1)
        setPage(json.page || 1)
      }
    } catch {
      toast.error("Geçmiş yüklenirken bir hata oluştu")
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadHistory(1)
  }, [loadHistory])

  const handleDelete = async (id: string) => {
    if (!confirm("Bu kaydı silmek istediğinize emin misiniz?")) return
    setDeletingId(id)
    try {
      const res = await fetch(`/api/calculator/history?id=${id}`, { method: "DELETE" })
      if (res.ok) {
        toast.success("Kayıt silindi")
        loadHistory(page)
      } else {
        toast.error("Silme işlemi başarısız")
      }
    } catch {
      toast.error("Silme işlemi sırasında hata oluştu")
    } finally {
      setDeletingId(null)
    }
  }

  return (
    <div className="glass-table-container overflow-hidden p-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-base font-semibold text-white flex items-center gap-2">
          <span className="material-symbols-outlined text-sky-400 text-[20px]">history</span>
          Hesaplama Geçmişi
        </h2>
        <Button variant="ghost" size="sm" onClick={() => loadHistory(1)} title="Yenile" className="text-white/70 hover:text-white hover:bg-white/10">
          <span className="material-symbols-outlined text-[18px]">refresh</span>
        </Button>
      </div>

      {loading && history.length === 0 ? (
        <div className="flex justify-center p-8">
          <span className="material-symbols-outlined animate-spin text-white/40 text-3xl">progress_activity</span>
        </div>
      ) : history.length === 0 ? (
        <div className="text-center p-8 text-white/50">Henüz kaydedilmiş hesaplama yok</div>
      ) : (
        <>
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="text-xs text-white/50 uppercase bg-white/[0.03] border-b border-white/10">
                <tr>
                  <th className="px-4 py-3 font-semibold tracking-wider">Tarih</th>
                  <th className="px-4 py-3 font-semibold tracking-wider">Ürün Maliyeti</th>
                  <th className="px-4 py-3 font-semibold tracking-wider">Toplam Maliyet</th>
                  <th className="px-4 py-3 font-semibold tracking-wider">Satış Fiyatı</th>
                  <th className="px-4 py-3 font-semibold tracking-wider text-right">İşlemler</th>
                </tr>
              </thead>
              <tbody>
                {history.map((record) => (
                  <tr key={record.id} className="border-b border-white/5 hover:bg-white/[0.04] transition-colors">
                    <td className="px-4 py-3 whitespace-nowrap text-white/80">
                      {new Date(record.createdAt).toLocaleDateString("tr-TR")} {new Date(record.createdAt).toLocaleTimeString("tr-TR", {hour: '2-digit', minute:'2-digit'})}
                    </td>
                    <td className="px-4 py-3 text-white/80">{fmt(record.productCost)} ₺</td>
                    <td className="px-4 py-3 text-white/80">{fmt(record.totalCost)} ₺</td>
                    <td className="px-4 py-3 font-bold text-emerald-400">{fmt(record.finalPrice)} ₺</td>
                    <td className="px-4 py-3 flex gap-2 justify-end">
                      <Button variant="outline" size="sm" onClick={() => onRestore(record)} className="bg-white/5 border-white/10 text-white hover:bg-white/10">
                        Geri Yükle
                      </Button>
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => handleDelete(record.id)}
                        disabled={deletingId === record.id}
                        className="bg-rose-500/20 border border-rose-500/30 text-rose-300 hover:bg-rose-500/30"
                      >
                        {deletingId === record.id
                          ? <span className="material-symbols-outlined text-[16px] animate-spin">progress_activity</span>
                          : "Sil"
                        }
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          
          {totalPages > 1 && (
            <div className="flex justify-center gap-2 mt-4 pt-4 border-t border-white/10">
              <Button
                variant="outline"
                size="sm"
                disabled={page <= 1}
                onClick={() => loadHistory(page - 1)}
                className="bg-white/5 border-white/10 text-white hover:bg-white/10"
              >
                Önceki
              </Button>
              <span className="text-sm text-white/60 flex items-center px-2 font-medium">
                Sayfa {page} / {totalPages}
              </span>
              <Button
                variant="outline"
                size="sm"
                disabled={page >= totalPages}
                onClick={() => loadHistory(page + 1)}
                className="bg-white/5 border-white/10 text-white hover:bg-white/10"
              >
                Sonraki
              </Button>
            </div>
          )}
        </>
      )}
    </div>
  )
}
