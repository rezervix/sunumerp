"use client"

import React, { useState, useEffect, useCallback } from "react"
import { useRouter } from "next/navigation"
import { useLanguage } from "@/lib/context/LanguageContext"
import { motion } from "framer-motion"
import { useAuth } from "@/lib/auth/context"
import { Button } from "@/components/ui/button"
import { toast } from "sonner"
import {
  SlidersHorizontal,
  Calculator,
  History,
  RefreshCw,
  Trash2,
  CheckCircle2,
  Sparkles,
  TrendingUp,
  RotateCcw,
  Clock,
  Layers,
  Percent,
} from "lucide-react"
import {
  calculatePrice,
  applyRounding,
  getProfitMargin,
  type RoundingStrategy,
} from "@/lib/services/calculationService"
import { AnimatedNumber } from "@/components/ui/motion-primitives"

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

  // 5. Reklam Gideri
  const adCostAmount = params.adCostPerMessage

  // 6. Ara toplam maliyet (taksit komisyonu hariç)
  const subTotalCost = baseCost + vatAmount + commissionAmount + fieldSalesCommAmount + adCostAmount

  // 7. Taksit Komisyonu
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
// Bileşen: Maliyet Satırı
// ─────────────────────────────────────────────────────────────────────────────

function CostRow({ dot, label, value, plus = true }: { dot: string; label: string; value: number; plus?: boolean }) {
  if (value === 0) return null
  return (
    <div className="flex justify-between items-center relative pl-6">
      <div
        className="absolute left-0 top-1/2 -translate-y-1/2 size-4 rounded-full border border-white/[0.08] flex items-center justify-center z-10"
        style={{ backgroundColor: `${dot}22` }}
      >
        <div className="size-1.5 rounded-full" style={{ backgroundColor: dot }} />
      </div>
      <span className="text-xs text-zinc-400">{label}</span>
      <span className="text-xs font-mono font-medium text-zinc-200">
        {plus ? "+" : ""}{fmt(value)} ₺
      </span>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Ana Bileşen
// ─────────────────────────────────────────────────────────────────────────────

export default function HesaplamaAraciPage() {
  const { tText } = useLanguage()
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

  // ── Geçmişe Kaydet
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
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-2 border-b border-white/[0.06]">
        <div>
          <h1 className="text-2xl font-light tracking-wide text-white">Fiyatlandırma & Kâr Hesaplama Motoru</h1>
          <p className="text-xs text-zinc-400 mt-1">
            Dinamik kâr marjı kurallarına göre anlık optimum satış fiyatı simülasyonu
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 items-start">
        {/* ── Sol Panel: Parametreler ── */}
        <div className="xl:col-span-5 relative z-10">
          <div className="bg-[#111513]/90 backdrop-blur-xl border border-white/[0.06] rounded-[20px] p-6 shadow-2xl space-y-6">
            <h2 className="text-sm font-medium text-white flex items-center gap-2">
              <SlidersHorizontal className="size-4 text-emerald-400" />
              Hesaplama Parametreleri
            </h2>

            {/* ── Bölüm 1: Temel Maliyetler ── */}
            <div className="space-y-3">
              <p className="text-[10px] font-semibold text-zinc-400 uppercase tracking-wider">Temel Maliyetler</p>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-zinc-300">Ürün Maliyeti (₺) *</label>
                  <input
                    type="number" step="0.01" min="0" required
                    value={productCost}
                    onChange={e => setProductCost(e.target.value)}
                    className="w-full px-3.5 py-2 text-xs rounded-xl bg-white/[0.03] border border-white/[0.08] text-white placeholder-zinc-500 focus:outline-none focus:border-emerald-500/50 font-mono"
                    placeholder="0.00"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-zinc-300">Kargo Maliyeti (₺)</label>
                  <input
                    type="number" step="0.01" min="0"
                    value={shippingCost}
                    onChange={e => setShippingCost(e.target.value)}
                    className="w-full px-3.5 py-2 text-xs rounded-xl bg-white/[0.03] border border-white/[0.08] text-white placeholder-zinc-500 focus:outline-none focus:border-emerald-500/50 font-mono"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-zinc-300">Pazaryeri Komisyonu (%)</label>
                  <input
                    type="number" step="0.1" min="0" max="100"
                    value={commissionRate}
                    onChange={e => setCommissionRate(e.target.value)}
                    className="w-full px-3.5 py-2 text-xs rounded-xl bg-white/[0.03] border border-white/[0.08] text-white placeholder-zinc-500 focus:outline-none focus:border-emerald-500/50 font-mono"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-zinc-300">KDV Oranı (%)</label>
                  <input
                    type="number" step="0.1" min="0" max="100"
                    value={vatRate}
                    onChange={e => setVatRate(e.target.value)}
                    className="w-full px-3.5 py-2 text-xs rounded-xl bg-white/[0.03] border border-white/[0.08] text-white placeholder-zinc-500 focus:outline-none focus:border-emerald-500/50 font-mono"
                  />
                </div>
              </div>
            </div>

            {/* ── Bölüm 2: Varyant Ayarı ── */}
            <div className="space-y-3 pt-3 border-t border-white/[0.06]">
              <p className="text-[10px] font-semibold text-zinc-400 uppercase tracking-wider">Varyant Fiyat Farkı</p>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-zinc-300">Varyant Farkı (₺)</label>
                  <input
                    type="number" step="0.01" min="0"
                    value={variantPrice}
                    onChange={e => setVariantPrice(e.target.value)}
                    className="w-full px-3.5 py-2 text-xs rounded-xl bg-white/[0.03] border border-white/[0.08] text-white placeholder-zinc-500 focus:outline-none focus:border-emerald-500/50 font-mono"
                  />
                </div>
                <div className="flex items-center gap-2 pt-6">
                  <label className="flex items-center gap-2 cursor-pointer text-xs text-zinc-300">
                    <input
                      type="checkbox"
                      checked={subtractVariant}
                      onChange={e => setSubtractVariant(e.target.checked)}
                      className="rounded border-zinc-700 bg-zinc-900 text-emerald-500 focus:ring-0"
                    />
                    Maliyetten Düş
                  </label>
                </div>
              </div>
            </div>

            {/* ── Bölüm 3: Saha Satış & Reklam ── */}
            <div className="space-y-3 pt-3 border-t border-white/[0.06]">
              <p className="text-[10px] font-semibold text-zinc-400 uppercase tracking-wider">Saha Satış & Reklam Gideri</p>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-zinc-300">Saha Komisyonu</label>
                  <div className="flex gap-1.5">
                    <input
                      type="number" step="0.1" min="0"
                      value={fieldSalesCommValue}
                      onChange={e => setFieldSalesCommValue(e.target.value)}
                      placeholder="Oran / Tutar"
                      className="w-full px-3.5 py-2 text-xs rounded-xl bg-white/[0.03] border border-white/[0.08] text-white placeholder-zinc-500 focus:outline-none focus:border-emerald-500/50 font-mono"
                    />
                    <button
                      type="button"
                      onClick={() => setFieldSalesCommType(prev => prev === "percent" ? "amount" : "percent")}
                      className="px-2.5 py-2 text-xs rounded-xl bg-white/[0.05] border border-white/[0.08] text-zinc-300 hover:text-white"
                    >
                      {fieldSalesCommType === "percent" ? "%" : "₺"}
                    </button>
                  </div>
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-zinc-300">Mesaj Başına Reklam (₺)</label>
                  <input
                    type="number" step="0.1" min="0"
                    value={adCostPerMessage}
                    onChange={e => setAdCostPerMessage(e.target.value)}
                    placeholder="0.00"
                    className="w-full px-3.5 py-2 text-xs rounded-xl bg-white/[0.03] border border-white/[0.08] text-white placeholder-zinc-500 focus:outline-none focus:border-emerald-500/50 font-mono"
                  />
                </div>
              </div>
            </div>

            {/* ── Bölüm 4: Taksit Komisyonu ── */}
            <div className="space-y-2 pt-3 border-t border-white/[0.06]">
              <p className="text-[10px] font-semibold text-zinc-400 uppercase tracking-wider">Taksit Komisyonu</p>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {INSTALLMENT_OPTIONS.map(opt => (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => setInstallmentCount(opt.value)}
                    className={`px-3 py-2 rounded-xl text-xs font-medium border transition-all ${
                      installmentCount === opt.value
                        ? "bg-emerald-500/15 border-emerald-500/40 text-emerald-300 shadow-[0_0_12px_rgba(16,185,129,0.15)]"
                        : "bg-white/[0.02] border-white/[0.06] text-zinc-400 hover:text-white"
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>

            {/* ── Bölüm 5: Yuvarlama ve Manuel Mod ── */}
            <div className="space-y-4 pt-3 border-t border-white/[0.06]">
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-zinc-300">Fiyat Yuvarlama Stratejisi</label>
                <select
                  value={roundingStrategy}
                  onChange={e => setRoundingStrategy(e.target.value as RoundingStrategy)}
                  className="w-full px-3.5 py-2 text-xs rounded-xl bg-[#111513] border border-white/[0.08] text-white focus:outline-none focus:border-emerald-500/50"
                >
                  <option value="none">Yuvarlama Yapma (Ör: 1445.50)</option>
                  <option value="hundred">En Yakın Yüzlüğe Yuvarla (Ör: 1400 / 1500)</option>
                  <option value="90">Sonu 90 İle Bitsin (Ör: 1490)</option>
                  <option value="99">Sonu 99 İle Bitsin (Ör: 1499)</option>
                  <option value="premium">Premium Görünüm (Ör: 1440)</option>
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-medium text-zinc-300 flex items-center justify-between">
                  <span>Manuel Kâr Oranı (%)</span>
                  <span className="text-[10px] text-emerald-400 font-mono bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">Opsiyonel</span>
                </label>
                <input
                  type="number" step="0.1" min="0"
                  value={manualProfitRate}
                  onChange={e => setManualProfitRate(e.target.value)}
                  className="w-full px-3.5 py-2 text-xs rounded-xl bg-white/[0.03] border border-white/[0.08] text-white placeholder-zinc-500 focus:outline-none focus:border-emerald-500/50 font-mono"
                  placeholder="Otomatik kuralları ezmek için marj girin..."
                />
              </div>
            </div>

            {/* ── Aksiyonlar ── */}
            <div className="flex gap-3 pt-2">
              <button
                type="button"
                onClick={handleReset}
                className="flex-1 py-2.5 px-4 text-xs font-medium rounded-xl border border-white/[0.08] bg-white/[0.02] text-zinc-300 hover:text-white hover:bg-white/[0.06] transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <RotateCcw className="size-3.5" />
                Sıfırla
              </button>

              {result && (
                <button
                  type="button"
                  onClick={handleSaveHistory}
                  disabled={savingHistory}
                  className="flex-1 py-2.5 px-4 text-xs font-semibold rounded-xl bg-emerald-500 hover:bg-emerald-400 text-black shadow-[0_0_15px_rgba(16,185,129,0.25)] transition-all flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
                >
                  <Sparkles className="size-3.5" />
                  {savingHistory ? "Kaydediliyor..." : "Geçmişe Kaydet"}
                </button>
              )}
            </div>
          </div>
        </div>

        {/* ── Sağ Panel: Sonuçlar ── */}
        <div className="xl:col-span-7 space-y-6">
          {result ? (
            <div className="bg-[#111513]/90 backdrop-blur-xl border border-white/[0.06] rounded-[20px] shadow-2xl overflow-hidden animate-in fade-in duration-300">
              {/* Sonuç Header */}
              <div className="bg-white/[0.02] border-b border-white/[0.06] p-6 flex flex-col sm:flex-row items-center justify-between gap-4">
                <div>
                  <p className="text-xs font-medium text-emerald-400 mb-1 text-center sm:text-left flex items-center gap-1.5">
                    <Sparkles className="size-3.5" />
                    Önerilen Nihai Satış Fiyatı
                    {installmentCount > 0 && (
                      <span className="ml-2 text-[10px] bg-amber-500/10 text-amber-400 border border-amber-500/20 px-2 py-0.5 rounded-full font-mono">
                        {installmentCount} taksit dahil
                      </span>
                    )}
                  </p>
                  <div className="flex items-baseline gap-2 justify-center sm:justify-start">
                    <span className="text-4xl font-light text-white tracking-tight">
                      <AnimatedNumber value={result.roundedPrice} decimals={2} />
                    </span>
                    <span className="text-2xl font-light text-emerald-400">₺</span>
                  </div>
                </div>

                <div className="flex items-center gap-2 text-xs font-mono text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-3 py-1.5 rounded-full shrink-0">
                  <span className="size-2 rounded-full bg-emerald-400 animate-pulse shadow-[0_0_8px_#34D399]" />
                  Anlık Dinamik Simülasyon
                </div>
              </div>

              <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-8">
                {/* Sol: Maliyet Dağılımı */}
                <div className="space-y-4">
                  <h3 className="text-xs font-semibold uppercase tracking-wider text-zinc-400 border-b border-white/[0.06] pb-2">
                    Maliyet Bileşenleri
                  </h3>
                  <div className="space-y-3 relative">
                    <div className="absolute left-2 top-3 bottom-3 w-px bg-white/[0.06]" />
                    <CostRow dot="#38BDF8" label="Ara Maliyet (Ürün + Kargo)" value={result.baseCost} plus={false} />
                    <CostRow dot="#FBBF24" label={`KDV (%${vatRate})`} value={result.vatAmount} />
                    <CostRow dot="#A78BFA" label={`Pazaryeri Komisyonu (%${commissionRate})`} value={result.commissionAmount} />
                    <CostRow dot="#2DD4BF" label={`Saha Komisyonu (${fieldSalesCommType === "amount" ? "₺" + fieldSalesCommValue : "%" + fieldSalesCommValue})`} value={result.fieldSalesCommAmount} />
                    <CostRow dot="#F43F5E" label="Reklam Gideri" value={result.adCostAmount} />
                    <CostRow dot="#FB923C" label={`Taksit Komisyonu (%${INSTALLMENT_RATES[installmentCount] ?? 0})`} value={result.installmentFeeAmount} />
                  </div>

                  <div className="mt-4 pt-3 border-t border-white/[0.08] border-dashed flex justify-between items-center pl-6">
                    <span className="text-xs font-medium text-zinc-300">Toplam Fiili Maliyet</span>
                    <span className="text-sm font-light text-sky-400 font-mono">
                      <AnimatedNumber value={result.totalCost} decimals={2} suffix=" ₺" />
                    </span>
                  </div>
                </div>

                {/* Sağ: Kâr Analizi */}
                <div className="space-y-4">
                  <h3 className="text-xs font-semibold uppercase tracking-wider text-zinc-400 border-b border-white/[0.06] pb-2">
                    Kâr ve Marj Dağılımı
                  </h3>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="bg-white/[0.02] border border-white/[0.06] p-4 rounded-2xl">
                      <p className="text-[10px] font-medium text-zinc-400 uppercase tracking-wider mb-1">Uygulanan Marj</p>
                      <p className="text-2xl font-light text-emerald-400 font-mono">
                        <AnimatedNumber value={result.appliedProfitRate} decimals={1} prefix="%" />
                      </p>
                      {!manualProfitRate && <p className="text-[10px] text-zinc-500 mt-1 font-mono">Dinamik Kurallar</p>}
                    </div>
                    <div className="bg-white/[0.02] border border-white/[0.06] p-4 rounded-2xl">
                      <p className="text-[10px] font-medium text-zinc-400 uppercase tracking-wider mb-1">Kâr Tutarı</p>
                      <p className="text-2xl font-light text-emerald-400 font-mono">
                        <AnimatedNumber value={result.profitAmount} decimals={2} prefix="+" suffix=" ₺" />
                      </p>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3 mt-3">
                    <div className="bg-emerald-500/5 border border-emerald-500/20 p-4 rounded-2xl">
                      <p className="text-[10px] font-medium text-emerald-400 uppercase tracking-wider mb-1">Brüt Kâr</p>
                      <p className="text-2xl font-light text-emerald-400 font-mono">
                        <AnimatedNumber value={result.grossProfit} decimals={2} suffix=" ₺" />
                      </p>
                      <p className="text-[10px] text-emerald-400/60 mt-1">Satış − (Ürün+Kargo)</p>
                    </div>
                    <div className="bg-sky-500/5 border border-sky-500/20 p-4 rounded-2xl relative overflow-hidden">
                      <div className="absolute right-0 top-0 bottom-0 w-1 bg-emerald-400" />
                      <p className="text-[10px] font-medium text-sky-400 uppercase tracking-wider mb-1">Net Kâr</p>
                      <p className="text-2xl font-light text-white font-mono">
                        <AnimatedNumber value={result.netProfit} decimals={2} suffix=" ₺" />
                      </p>
                      <p className="text-[10px] font-mono text-emerald-400 mt-1">Marj: %{result.netProfitMargin}</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Ekstra Bilgi */}
              <div className="bg-white/[0.01] px-6 py-3.5 border-t border-white/[0.06] text-xs text-zinc-400 flex items-center justify-between">
                <span>
                  Ham Hesaplanan Fiyat: <strong className="text-white font-mono">{fmt(result.calculatedPrice)} ₺</strong>
                </span>
                <span className="font-mono text-[11px] text-zinc-500">
                  {roundingStrategy} yuvarlaması uygulandı
                </span>
              </div>
            </div>
          ) : (
            <div className="h-full bg-[#111513]/90 backdrop-blur-xl border border-white/[0.06] rounded-[20px] shadow-2xl flex flex-col items-center justify-center p-12 text-center min-h-[360px]">
              <div className="size-14 rounded-2xl bg-white/[0.03] border border-white/[0.08] flex items-center justify-center text-emerald-400 mb-4 shadow-[0_0_20px_rgba(16,185,129,0.1)]">
                <Calculator className="size-7" />
              </div>
              <h3 className="text-base font-medium text-white mb-1.5">Hesaplama Bekleniyor</h3>
              <p className="text-xs text-zinc-400 max-w-xs leading-relaxed">
                Sol taraftaki ürün ve operasyonel maliyet parametrelerini girin; kâr ve fiyat simülasyonu anlık olarak hesaplansın.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* ── Hesaplama Geçmişi Paneli ── */}
      <CalculationHistoryPanel onRestore={(rec) => {
        setProductCost(rec.productCost.toString())
        setRoundingStrategy(rec.roundingStrategy as RoundingStrategy)
        window.scrollTo({ top: 0, behavior: "smooth" })
      }} />
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Bileşen: Hesaplama Geçmişi Paneli
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
    <div className="bg-[#111513]/90 backdrop-blur-xl border border-white/[0.06] rounded-[20px] shadow-2xl overflow-hidden p-6 space-y-4">
      <div className="flex items-center justify-between pb-3 border-b border-white/[0.06]">
        <h2 className="text-sm font-medium text-white flex items-center gap-2">
          <History className="size-4 text-emerald-400" />
          Hesaplama Geçmişi
        </h2>
        <button
          onClick={() => loadHistory(1)}
          title="Yenile"
          className="p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-white/[0.06] transition-colors cursor-pointer"
        >
          <RefreshCw className={`size-3.5 ${loading ? "animate-spin" : ""}`} />
        </button>
      </div>

      {loading && history.length === 0 ? (
        <div className="flex justify-center p-8 text-zinc-500 text-xs">
          Geçmiş kayıtlar yükleniyor...
        </div>
      ) : history.length === 0 ? (
        <div className="text-center p-8 text-zinc-500 text-xs">Henüz kaydedilmiş hesaplama bulunmuyor.</div>
      ) : (
        <>
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="text-[11px] text-zinc-400 uppercase tracking-wider bg-white/[0.02] border-b border-white/[0.06]">
                <tr>
                  <th className="px-4 py-3 font-medium">Tarih</th>
                  <th className="px-4 py-3 font-medium">Ürün Maliyeti</th>
                  <th className="px-4 py-3 font-medium">Toplam Maliyet</th>
                  <th className="px-4 py-3 font-medium">Satış Fiyatı</th>
                  <th className="px-4 py-3 font-medium text-right">İşlemler</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/[0.04]">
                {history.map((record) => (
                  <tr key={record.id} className="hover:bg-white/[0.02] transition-colors">
                    <td className="px-4 py-3 font-mono text-xs text-zinc-400 whitespace-nowrap">
                      {new Date(record.createdAt).toLocaleDateString("tr-TR")} {new Date(record.createdAt).toLocaleTimeString("tr-TR", {hour: '2-digit', minute:'2-digit'})}
                    </td>
                    <td className="px-4 py-3 font-mono text-xs text-zinc-300">{fmt(record.productCost)} ₺</td>
                    <td className="px-4 py-3 font-mono text-xs text-zinc-300">{fmt(record.totalCost)} ₺</td>
                    <td className="px-4 py-3 font-mono text-xs font-semibold text-emerald-400">{fmt(record.finalPrice)} ₺</td>
                    <td className="px-4 py-3 flex gap-2 justify-end">
                      <button
                        onClick={() => onRestore(record)}
                        className="px-3 py-1 text-xs rounded-lg border border-white/[0.08] bg-white/[0.02] text-zinc-300 hover:text-white hover:bg-white/[0.06] transition-colors cursor-pointer"
                      >
                        Geri Yükle
                      </button>
                      <button
                        onClick={() => handleDelete(record.id)}
                        disabled={deletingId === record.id}
                        className="p-1 rounded-lg text-zinc-500 hover:text-rose-400 hover:bg-rose-500/10 transition-colors cursor-pointer"
                        title="Sil"
                      >
                        <Trash2 className="size-3.5" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          
          {totalPages > 1 && (
            <div className="flex justify-center gap-2 pt-4 border-t border-white/[0.06]">
              <button
                disabled={page <= 1}
                onClick={() => loadHistory(page - 1)}
                className="px-3 py-1 text-xs rounded-lg border border-white/[0.08] bg-white/[0.02] text-zinc-300 hover:text-white disabled:opacity-40"
              >
                Önceki
              </button>
              <span className="text-xs text-zinc-500 flex items-center px-2 font-mono">
                Sayfa {page} / {totalPages}
              </span>
              <button
                disabled={page >= totalPages}
                onClick={() => loadHistory(page + 1)}
                className="px-3 py-1 text-xs rounded-lg border border-white/[0.08] bg-white/[0.02] text-zinc-300 hover:text-white disabled:opacity-40"
              >
                Sonraki
              </button>
            </div>
          )}
        </>
      )}
    </div>
  )
}
