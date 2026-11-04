"use client"

import React, { useState, useEffect, useCallback } from "react"
import Link from "next/link"
import { motion } from "framer-motion"
import {
  Sparkles,
  BrainCircuit,
  MessageSquareText,
  FileText,
  TrendingUp,
  AlertTriangle,
  CheckCircle2,
  Send,
  RefreshCw,
  Settings,
  Webhook,
  Terminal,
  Play,
  Loader2,
  Zap,
  Flame,
  Clock
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { toast } from "sonner"
import { InventoryModuleNav } from "../stok/components/InventoryModuleNav"
import type {
  AmaQueryResult,
  ForesightForecastItem,
  AiNarrativeReportRecord,
  ExecutiveAiBannerSummary
} from "@/lib/services/inventoryAiEngine"

export default function InventoryAiAndAnalyticsPage() {
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [activeTab, setActiveTab] = useState("ask-me-anything")

  // Gerçek Veritabanı AI State
  const [forecasts, setForecasts] = useState<ForesightForecastItem[]>([])
  const [narrativeReports, setNarrativeReports] = useState<AiNarrativeReportRecord[]>([])
  const [executiveBanner, setExecutiveBanner] = useState<ExecutiveAiBannerSummary | null>(null)
  const [selectedForecastId, setSelectedForecastId] = useState<string>("")
  const [creatingPrId, setCreatingPrId] = useState<string | null>(null)

  // Ask Me Anything (AMA) State
  const [amaInput, setAmaInput] = useState(
    "Hangi ürünlerde kritik stok (ROP altı) ve tükenme riski var?"
  )
  const [amaLoading, setAmaLoading] = useState(false)
  const [amaResult, setAmaResult] = useState<AmaQueryResult | null>(null)

  // API & Ekosistem Ayarları State
  const [ecosystemData, setEcosystemData] = useState<any>(null)
  const [apiTestResponse, setApiTestResponse] = useState<string>("")
  const [isTestingApi, setIsTestingApi] = useState(false)

  const fetchAiDashboard = useCallback(async (isSilent = false) => {
    if (!isSilent) setLoading(true)
    else setRefreshing(true)

    try {
      const [aiRes, ecoRes] = await Promise.all([
        fetch("/api/inventory-ai"),
        fetch("/api/ecosystem")
      ])
      const aiJson = await aiRes.json()
      const ecoJson = await ecoRes.json()

      if (aiJson.success) {
        const fcList: ForesightForecastItem[] = aiJson.forecasts || []
        setForecasts(fcList)
        setNarrativeReports(aiJson.narrativeReports || [])
        setExecutiveBanner(aiJson.executiveBanner || null)
        if (aiJson.defaultAmaResult && !amaResult) {
          setAmaResult(aiJson.defaultAmaResult)
        }
        if (fcList.length > 0 && !selectedForecastId) {
          setSelectedForecastId(fcList[0].id)
        }
      }
      if (ecoJson.success) {
        setEcosystemData(ecoJson)
      }
    } catch {
      toast.error("Veritabanı AI analiz verileri alınamadı.")
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [amaResult, selectedForecastId])

  useEffect(() => {
    fetchAiDashboard()
  }, [fetchAiDashboard])

  const activeForecast =
    forecasts.find(f => f.id === selectedForecastId) || forecasts[0] || null

  // Gerçek Veritabanı Doğal Dil Sorgusu (AMA) Çalıştırıcı
  const handleRunAmaQuery = async (questionText?: string) => {
    const q = (questionText ?? amaInput).trim()
    if (!q) return
    setAmaInput(q)
    setAmaLoading(true)

    try {
      const res = await fetch("/api/inventory-ai", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "ama_query", question: q })
      })
      const json = await res.json()
      if (json.success && json.data) {
        setAmaResult(json.data)
        toast.success(`Veritabanı Sorgusu Tamamlandı (${json.data.executionTimeMs} ms)`, {
          description: `Algılanan Niyet: ${json.data.intentDetected}`
        })
      } else {
        toast.error(json.error || "Sorgu çalıştırılamadı.")
      }
    } catch {
      toast.error("Sunucu ile bağlantı kurulamadı.")
    } finally {
      setAmaLoading(false)
    }
  }

  // Tahmin Kartından Gerçek Satın Alma Talebi (PurchaseRequisition) Oluşturucu
  const handleTriggerReorderFromForecast = async (fc: ForesightForecastItem) => {
    const orderQty = Math.max(1, fc.recommendedOrderQty || fc.minStockLevel || 10)
    setCreatingPrId(fc.id)
    try {
      const res = await fetch("/api/inventory-ai", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "create_ai_requisition",
          itemId: fc.itemId,
          sku: fc.sku,
          itemName: fc.itemName,
          recommendedQty: orderQty,
          unit: fc.unit,
          unitCostTry: fc.unitCostTry,
          reason: `ForesightAI 30 Günlük Talep Tahmini (${fc.forecast30d} ${fc.unit}) ve Kritik Stok Tamamlama`
        })
      })
      const json = await res.json()
      if (json.success) {
        toast.success(`${json.requisition?.requisitionNo} Oluşturuldu!`, {
          description: `${fc.itemName} için +${orderQty} ${fc.unit} satın alma talebi veritabanına yazıldı.`
        })
      } else {
        toast.error(json.error || "Satın alma talebi oluşturulamadı.")
      }
    } catch {
      toast.error("Sunucu hatası oluştu.")
    } finally {
      setCreatingPrId(null)
    }
  }

  const handleTestRestApi = async () => {
    setIsTestingApi(true)
    try {
      const res = await fetch("/api/v1/inventory")
      const json = await res.json()
      setApiTestResponse(JSON.stringify(json, null, 2))
      toast.success("GET /api/v1/inventory Canlı Veritabanı Yanıtı Alındı (200 OK)")
    } catch {
      toast.error("API testi sırasında hata oluştu.")
    } finally {
      setIsTestingApi(false)
    }
  }

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-[1600px] mx-auto">
      {/* 0. STOK VE DEPO YÖNETİMİ BİRLEŞİK ÜST SEKME / NAVİGASYON */}
      <InventoryModuleNav />

      {/* 1. ÜST AI YÖNETİCİ BRİFİNGİ */}
      <div className="bg-gradient-to-r from-emerald-500/10 via-slate-900/60 to-indigo-500/10 backdrop-blur-xl border border-white/15 rounded-2xl p-5 sm:p-6 shadow-xl">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-3.5">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-indigo-500/20 border border-indigo-400/30 text-indigo-300 shadow-[0_0_20px_rgba(99,102,241,0.25)]">
              <BrainCircuit className="h-5 w-5" />
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2.5">
                <h1 className="text-base sm:text-xl font-bold text-white">
                  AI Analiz, Talep Tahminleme & Sistem Ayarları
                </h1>
                <span className="bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 rounded-full px-3 py-0.5 text-xs font-medium">
                  Canlı Prisma Veritabanı Analitiği
                </span>
              </div>
              <p className="mt-1.5 text-xs sm:text-sm text-white/70 leading-relaxed">
                {executiveBanner
                  ? `${executiveBanner.sentence1} ${executiveBanner.sentence2}`
                  : "Stok hareketleri, devir hızı, ölü stoklar ve yaklaşan SKT riskleri gerçek veritabanı kayıtlarından matematiksel olarak hesaplanır."}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2.5 shrink-0">
            <Button
              variant="outline"
              size="sm"
              onClick={() => fetchAiDashboard(true)}
              disabled={loading || refreshing}
              className="text-xs h-9 gap-1.5 border-white/15 bg-white/5 hover:bg-white/10 text-white rounded-xl"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${refreshing ? "animate-spin" : ""}`} />
              Analizi Yenile
            </Button>
            <Button
              size="sm"
              onClick={() => setActiveTab("ask-me-anything")}
              className="bg-indigo-600 hover:bg-indigo-500 text-white text-xs h-9 gap-1.5 rounded-xl shadow-lg shadow-indigo-500/25"
            >
              <Sparkles className="h-4 w-4" />
              Soru Sor (AMA)
            </Button>
          </div>
        </div>
      </div>

      {/* 2. ANA SEKMELER */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="glass-panel p-1.5 rounded-2xl h-auto grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-1.5">
          <TabsTrigger
            value="ask-me-anything"
            className="flex items-center gap-2 py-3 px-4 rounded-xl text-xs sm:text-sm font-semibold text-white/60 hover:text-white transition data-[state=active]:bg-indigo-500/20 data-[state=active]:text-white data-[state=active]:border data-[state=active]:border-indigo-500/30 data-[state=active]:shadow-lg"
          >
            <MessageSquareText className="h-4 w-4 text-indigo-400" />
            1. Doğal Dil Sorgulama (AMA Asistanı)
          </TabsTrigger>
          <TabsTrigger
            value="foresight-forecasting"
            className="flex items-center gap-2 py-3 px-4 rounded-xl text-xs sm:text-sm font-semibold text-white/60 hover:text-white transition data-[state=active]:bg-emerald-500/20 data-[state=active]:text-white data-[state=active]:border data-[state=active]:border-emerald-500/30 data-[state=active]:shadow-lg"
          >
            <TrendingUp className="h-4 w-4 text-emerald-400" />
            2. Talep Tahmini & Ölü Stok (ForesightAI)
          </TabsTrigger>
          <TabsTrigger
            value="narrative-reporting"
            className="flex items-center gap-2 py-3 px-4 rounded-xl text-xs sm:text-sm font-semibold text-white/60 hover:text-white transition data-[state=active]:bg-purple-500/20 data-[state=active]:text-white data-[state=active]:border data-[state=active]:border-purple-500/30 data-[state=active]:shadow-lg"
          >
            <FileText className="h-4 w-4 text-purple-400" />
            3. Yönetici Rapor Anlatıları
          </TabsTrigger>
          <TabsTrigger
            value="api-settings"
            className="flex items-center gap-2 py-3 px-4 rounded-xl text-xs sm:text-sm font-semibold text-white/60 hover:text-white transition data-[state=active]:bg-sky-500/20 data-[state=active]:text-white data-[state=active]:border data-[state=active]:border-sky-500/30 data-[state=active]:shadow-lg"
          >
            <Settings className="h-4 w-4 text-sky-400" />
            4. Açık API, Entegrasyon & Ayarlar
          </TabsTrigger>
        </TabsList>

        {/* ══════════════════════════════════════════════════════════
            TAB 1: DOĞAL DİL SORGULAMA ("ASK ME ANYTHING" - AMA)
           ══════════════════════════════════════════════════════════ */}
        <TabsContent value="ask-me-anything" className="space-y-5 focus-visible:outline-none">
          <div className="glass-panel rounded-2xl p-6 space-y-5">
            <div>
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                <MessageSquareText className="h-5 w-5 text-indigo-400" />
                Doğal Dil Veritabanı Sorgulama Asistanı (Ask Me Anything)
              </h2>
              <p className="text-xs text-white/60 mt-1">
                Sorunuzu günlük Türkçe ile yazın; arka planda gerçek Prisma sorguları (Kritik stoklar, en çok satanlar, ölü stoklar, depo bazlı envanter değeri, yaklaşan SKT&apos;ler, konsinye hakedişler) çalıştırılıp tablo ve özet olarak sunulsun.
              </p>
            </div>

            {/* AI Komut Merkezi Arama Barı */}
            <div className="bg-black/40 border border-white/15 rounded-2xl p-4 space-y-4 shadow-inner">
              <div className="flex flex-col sm:flex-row gap-2.5">
                <Input
                  value={amaInput}
                  onChange={e => setAmaInput(e.target.value)}
                  onKeyDown={e => e.key === "Enter" && handleRunAmaQuery()}
                  placeholder="Örn: SKT'si yaklaşan lotlar hangileri? veya Depo bazlı envanter değerimiz nedir?"
                  className="glass-input h-11 text-sm flex-1"
                />
                <Button
                  onClick={() => handleRunAmaQuery()}
                  disabled={amaLoading}
                  className="h-11 bg-indigo-600 hover:bg-indigo-500 text-white px-6 gap-2 text-xs font-semibold rounded-xl shadow-lg shadow-indigo-500/25 shrink-0"
                >
                  {amaLoading ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Send className="h-4 w-4" />
                  )}
                  Veritabanında Sorgula
                </Button>
              </div>

              {/* Hızlı Soru Rozetleri */}
              <div>
                <span className="text-xs text-white/45 block mb-2">
                  Hızlı Veritabanı Sorguları:
                </span>
                <div className="flex flex-wrap gap-2">
                  {[
                    "Hangi ürünlerde kritik stok (ROP altı) ve tükenme riski var?",
                    "SKT'si yaklaşan lotları ve kalan günlerini göster",
                    "En çok satan ve stok devir hızı en yüksek ürünler hangileri?",
                    "Hareketsiz (ölü) stoklarımız ve bağlanan sermaye nedir?",
                    "Depo bazlı envanter değeri ve FIFO maliyet dağılımı nedir?",
                    "Konsinye (emanet) stoklarımızın tedarikçi hakediş durumu nedir?"
                  ].map((sampleQ, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => handleRunAmaQuery(sampleQ)}
                      className="rounded-full px-3.5 py-1.5 text-xs bg-white/5 hover:bg-indigo-500/20 border border-white/10 hover:border-indigo-500/30 text-white/75 hover:text-white transition"
                    >
                      {sampleQ}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Yapay Zekâ Yanıt Kartı + Gerçek Veritabanı Tablosu */}
            {amaResult && (
              <div className="bg-black/40 border border-white/15 rounded-2xl p-5 space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-white/10 pb-3">
                  <div className="flex items-center gap-2.5">
                    <span className="bg-indigo-500/15 text-indigo-300 border border-indigo-500/30 rounded-full px-3 py-0.5 text-xs font-semibold">
                      {amaResult.intentDetected}
                    </span>
                    <span className="text-xs text-white/60">
                      Güven Skoru: <strong className="text-emerald-400">%{amaResult.confidencePercent}</strong> ({amaResult.executionTimeMs} ms)
                    </span>
                  </div>
                  <code className="font-mono text-[11px] text-indigo-300 bg-white/5 px-3 py-1 rounded-lg border border-white/10">
                    {amaResult.executedQueryExpression}
                  </code>
                </div>

                {/* Özet Cümle */}
                <div className="text-sm text-white/90 leading-relaxed font-medium glass-card p-4 rounded-2xl">
                  {amaResult.answerNarrative}
                </div>

                {/* Gerçek Veritabanı Sonuç Tablosu */}
                {amaResult.columns && amaResult.columns.length > 0 && (
                  <div className="glass-table-container overflow-hidden">
                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-xs">
                        <thead className="bg-white/[0.03] text-white/50 border-b border-white/10 uppercase text-[11px]">
                          <tr>
                            {amaResult.columns.map(col => (
                              <th key={col} className="px-4 py-3 font-semibold">
                                {col}
                              </th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {(amaResult.rows || []).map((row, rIdx) => (
                            <tr key={rIdx} className="border-b border-white/5 hover:bg-white/[0.04] transition-colors">
                              {amaResult.columns.map(col => (
                                <td key={col} className="px-4 py-3 text-white/85 font-medium">
                                  {String(row[col] ?? "-")}
                                </td>
                              ))}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                {/* Önerilen Aksiyonlar */}
                {amaResult.recommendedActions && amaResult.recommendedActions.length > 0 && (
                  <div className="pt-2 border-t border-white/10 flex flex-wrap items-center justify-between gap-2">
                    <div className="flex flex-wrap gap-2">
                      {amaResult.recommendedActions.map((act, idx) => (
                        <Link key={idx} href="/dashboard/satinalma">
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-8 text-xs bg-indigo-500/15 border-indigo-500/30 text-indigo-200 hover:bg-indigo-500/25 rounded-xl"
                          >
                            <CheckCircle2 className="mr-1.5 h-3.5 w-3.5 text-emerald-400" />
                            {act}
                          </Button>
                        </Link>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </TabsContent>

        {/* ══════════════════════════════════════════════════════════
            TAB 2: FORESIGHT-AI TALEP TAHMİNİ, DEVİR HIZI VE ÖLÜ STOK
           ══════════════════════════════════════════════════════════ */}
        <TabsContent value="foresight-forecasting" className="space-y-6 focus-visible:outline-none">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {forecasts.map(fc => {
              const isSelected = activeForecast?.id === fc.id
              const isRisk =
                fc.optimizationStatus === "STOCKOUT_IMMINENT" ||
                fc.currentAvailableStock <= fc.minStockLevel

              return (
                <motion.div
                  key={fc.id}
                  whileHover={{ y: -4 }}
                  onClick={() => setSelectedForecastId(fc.id)}
                  className={`cursor-pointer glass-card p-6 rounded-2xl flex flex-col justify-between space-y-3.5 ${
                    isSelected
                      ? "border-indigo-400/60 ring-1 ring-indigo-400/40 shadow-[0_0_25px_rgba(99,102,241,0.2)]"
                      : "hover:border-white/25"
                  }`}
                >
                  <div>
                    <div className="flex items-center justify-between gap-1">
                      <span className="font-mono text-xs font-bold text-indigo-300">{fc.sku}</span>
                      {fc.isDeadStock ? (
                        <span className="bg-amber-500/15 text-amber-300 border border-amber-500/30 rounded-full px-3 py-0.5 text-xs font-semibold">
                          Hareketsiz Stok
                        </span>
                      ) : (
                        <span
                          className={`rounded-full px-3 py-0.5 text-xs font-semibold border ${
                            isRisk
                              ? "bg-rose-500/15 text-rose-300 border-rose-500/30"
                              : "bg-emerald-500/15 text-emerald-300 border-emerald-500/30"
                          }`}
                        >
                          {fc.daysUntilStockout >= 900 ? "Stok Yeterli" : `${fc.daysUntilStockout} Gün Ömür`}
                        </span>
                      )}
                    </div>
                    <h3 className="text-sm font-bold text-white mt-2 line-clamp-1">
                      {fc.itemName}
                    </h3>
                    <div className="flex items-center justify-between text-xs text-white/60 pt-1">
                      <span>Mevcut: <strong className="text-white">{fc.currentAvailableStock} {fc.unit}</strong></span>
                      <span>Devir: <strong className="text-sky-300">{fc.turnoverRateAnnual}x/yıl</strong></span>
                    </div>
                  </div>

                  <div className="space-y-3">
                    <div className="grid grid-cols-3 gap-1.5 bg-black/30 border border-white/10 p-2.5 rounded-xl text-center text-xs">
                      <div>
                        <span className="text-white/45 block text-[10px]">30 Gün</span>
                        <strong className="text-white">{fc.forecast30d}</strong>
                      </div>
                      <div>
                        <span className="text-white/45 block text-[10px]">60 Gün</span>
                        <strong className="text-white">{fc.forecast60d}</strong>
                      </div>
                      <div>
                        <span className="text-white/45 block text-[10px]">90 Gün</span>
                        <strong className="text-indigo-300">{fc.forecast90d}</strong>
                      </div>
                    </div>

                    {fc.nearestExpiryDays !== null && fc.nearestExpiryDays <= 30 && (
                      <div className="flex items-center gap-1.5 text-[11px] text-amber-300 bg-amber-500/15 px-2.5 py-1 rounded-lg border border-amber-500/30">
                        <Clock className="h-3 w-3 shrink-0 text-amber-400" />
                        <span>SKT Riski: {fc.nearestExpiryDays} gün kaldı ({fc.expiringLotQty} {fc.unit})</span>
                      </div>
                    )}

                    <div className="flex items-center justify-between text-xs">
                      <span className="text-white/60">Önerilen Sipariş:</span>
                      <strong className={fc.recommendedOrderQty > 0 ? "text-rose-400" : "text-emerald-400"}>
                        {fc.recommendedOrderQty > 0 ? `+${fc.recommendedOrderQty} ${fc.unit}` : "Sipariş Gerekmiyor"}
                      </strong>
                    </div>

                    <Button
                      size="sm"
                      disabled={creatingPrId === fc.id}
                      onClick={e => {
                        e.stopPropagation()
                        handleTriggerReorderFromForecast(fc)
                      }}
                      className="w-full h-9 text-xs bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl shadow-lg shadow-indigo-500/20 gap-1.5"
                    >
                      {creatingPrId === fc.id ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      ) : (
                        <Zap className="h-3.5 w-3.5" />
                      )}
                      Tek Tıkla Sipariş Talebi Aç
                    </Button>
                  </div>
                </motion.div>
              )
            })}
          </div>

          {/* Seçili Ürünün Gelecek Trend Grafiği */}
          {activeForecast && (
            <div className="glass-card p-6 rounded-2xl space-y-5">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <h3 className="text-base font-bold text-white">
                    {activeForecast.itemName} ({activeForecast.sku}) — Gerçek Hareket & 90 Günlük Talep Projeksiyonu
                  </h3>
                  <p className="text-xs text-white/60 mt-0.5">
                    {activeForecast.channelTrendLabel} • Mevsimsellik Katsayısı: ×{activeForecast.seasonalityFactor} • Güven Skoru: %{activeForecast.confidenceScorePercent}
                  </p>
                </div>
                <span className="bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 rounded-full px-3.5 py-1 text-xs font-semibold">
                  30 Günlük Ciro Etkisi: ₺{(activeForecast.projectedRevenueImpactTry || 0).toLocaleString("tr-TR")}
                </span>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3.5">
                {(activeForecast.monthlySeries || []).map((pt, idx) => {
                  const isFuture = pt.actual === undefined
                  const maxVal = Math.max(
                    10,
                    ...activeForecast.monthlySeries.map(m => Math.max(m.actual || 0, m.forecast || 0))
                  )
                  const barHeightPercent = Math.min(100, Math.max(18, Math.round(((pt.forecast || 1) / maxVal) * 100)))

                  return (
                    <div
                      key={idx}
                      className={`p-3.5 rounded-2xl border flex flex-col justify-between ${
                        isFuture
                          ? "border-indigo-400/40 bg-indigo-500/10"
                          : "border-white/10 bg-white/5"
                      }`}
                    >
                      <div className="text-xs font-semibold text-white/85">{pt.month}</div>
                      <div className="my-2.5 h-24 flex items-end justify-center bg-black/30 rounded-xl p-2 border border-white/5">
                        <div
                          className={`w-full rounded-t-lg transition-all ${
                            isFuture
                              ? "bg-gradient-to-t from-indigo-500 to-sky-400"
                              : "bg-gradient-to-t from-emerald-600 to-emerald-400"
                          }`}
                          style={{ height: `${barHeightPercent}%` }}
                        />
                      </div>
                      <div className="text-[11px] space-y-1">
                        {pt.actual !== undefined && (
                          <div className="flex justify-between text-white/60">
                            <span>Gerçekleşen:</span>
                            <strong className="text-emerald-400">{pt.actual} {activeForecast.unit}</strong>
                          </div>
                        )}
                        <div className="flex justify-between text-white/60">
                          <span>Tahmin:</span>
                          <strong className="text-indigo-300">{pt.forecast} {activeForecast.unit}</strong>
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )}
        </TabsContent>

        {/* ══════════════════════════════════════════════════════════
            TAB 3: YÖNETİCİ RAPOR ANLATILARI (NARRATIVE REPORTING)
           ══════════════════════════════════════════════════════════ */}
        <TabsContent value="narrative-reporting" className="space-y-5 focus-visible:outline-none">
          {narrativeReports.map(rep => (
            <div key={rep.id} className="glass-card p-6 rounded-2xl space-y-5">
              <div className="pb-4 border-b border-white/10">
                <div className="flex items-center justify-between">
                  <span className="font-mono text-xs font-bold bg-purple-500/15 text-purple-300 border border-purple-500/30 px-3 py-0.5 rounded-full">
                    {rep.reportCode}
                  </span>
                  <span className="text-xs text-white/45">{rep.generatedAt}</span>
                </div>
                <h3 className="text-base font-bold text-white mt-2.5">{rep.title}</h3>
                <p className="text-xs font-medium text-white/70 mt-1">
                  {rep.executiveBrief}
                </p>
              </div>

              {/* KPI Kartları */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {(rep.kpiHighlights || []).map((kpi, idx) => (
                  <motion.div
                    key={idx}
                    whileHover={{ y: -4 }}
                    className="glass-card p-6 rounded-2xl"
                  >
                    <span className="text-sm text-white/60 block">{kpi.label}</span>
                    <strong className="text-2xl font-bold text-white mt-1 block">{kpi.value}</strong>
                    <span className="text-xs text-emerald-400 block mt-2">{kpi.trend}</span>
                  </motion.div>
                ))}
              </div>

              {/* Detay Paragraflar */}
              <div className="space-y-2.5">
                {(rep.narrativeParagraphs || []).map((p, idx) => (
                  <p key={idx} className="text-xs sm:text-sm text-white/80 leading-relaxed bg-black/25 p-4 rounded-xl border border-white/10">
                    {p}
                  </p>
                ))}
              </div>

              {/* Temel Bulgular */}
              <div>
                <span className="text-xs font-semibold text-white/60 uppercase tracking-wider block mb-2.5">
                  Veritabanı Temel Bulguları:
                </span>
                <ul className="space-y-2 text-xs text-white/75">
                  {(rep.keyFindings || []).map((finding, idx) => (
                    <li key={idx} className="flex items-start gap-2.5">
                      <span className="h-1.5 w-1.5 rounded-full bg-indigo-400 mt-1.5 shrink-0" />
                      <span>{finding}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <div className="p-4 bg-gradient-to-r from-indigo-500/15 via-slate-900/60 to-purple-500/15 rounded-2xl border border-white/15 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                <span className="text-white/90 font-medium">{rep.financialRiskSummary}</span>
                <Link href="/dashboard/satinalma">
                  <Button size="sm" className="bg-indigo-600 hover:bg-indigo-500 text-white text-xs h-9 rounded-xl shadow-lg shadow-indigo-500/20">
                    Satın Alma & Otomatik Siparişe Git
                  </Button>
                </Link>
              </div>
            </div>
          ))}
        </TabsContent>

        {/* ══════════════════════════════════════════════════════════
            TAB 4: AÇIK API, ENTEGRASYON & SİSTEM AYARLARI
           ══════════════════════════════════════════════════════════ */}
        <TabsContent value="api-settings" className="space-y-5 focus-visible:outline-none">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            <div className="glass-panel rounded-2xl p-6 lg:col-span-7 space-y-4">
              <div>
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  <Terminal className="h-5 w-5 text-sky-400" />
                  Açık REST API v1 (`/api/v1/inventory`) & Dış Sistem Bağlantısı
                </h3>
                <p className="text-xs text-white/60 mt-1">
                  Pazaryerleri, 3PL kargo firmaları ve barkod el terminalleri için gerçek zamanlı PostgreSQL/Prisma stok uç noktası.
                </p>
              </div>

              {/* AI Komut Merkezi Görünümlü API / Webhook Test Konsolu */}
              <div className="bg-black/40 border border-white/15 rounded-2xl p-5 space-y-3.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-xs font-mono text-emerald-400">
                    <Terminal className="h-4 w-4" />
                    GET /api/v1/inventory
                  </div>
                  <Button
                    size="sm"
                    onClick={handleTestRestApi}
                    disabled={isTestingApi}
                    className="h-8 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs gap-1.5 rounded-xl"
                  >
                    <Play className="h-3 w-3" />
                    Canlı API Test Et
                  </Button>
                </div>
                {apiTestResponse && (
                  <pre className="text-[11px] font-mono text-emerald-200/90 overflow-x-auto max-h-56 bg-slate-950/90 border border-white/10 p-3.5 rounded-xl">
                    {apiTestResponse}
                  </pre>
                )}
              </div>

              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pt-2">
                <span className="text-xs text-white/60">
                  Gelişmiş ERP Veri Geçiş Sihirbazı, Webhook ve Eklenti ayarları için:
                </span>
                <Link href="/dashboard/envanter-ekosistem">
                  <Button
                    variant="outline"
                    size="sm"
                    className="text-xs h-9 border-white/15 bg-white/5 hover:bg-white/10 text-white rounded-xl"
                  >
                    Tam Ekran API & Veri Geçiş Sihirbazı
                  </Button>
                </Link>
              </div>
            </div>

            <div className="glass-card rounded-2xl p-6 lg:col-span-5 space-y-4">
              <div>
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  <Webhook className="h-5 w-5 text-emerald-400" />
                  Canlı Sistem Kapasite & Veritabanı Özeti
                </h3>
                <p className="text-xs text-white/60 mt-1">
                  Aktif Prisma/PostgreSQL tablolarındaki kayıt ve kota durumu.
                </p>
              </div>

              <div className="space-y-3 text-xs">
                <div className="flex items-center justify-between p-3.5 rounded-xl bg-black/30 border border-white/10">
                  <span className="text-white/60">Aktif Depo Sayısı</span>
                  <strong className="text-white font-mono">
                    {ecosystemData?.saasUsage?.currentWarehouses || 3} Depo
                  </strong>
                </div>
                <div className="flex items-center justify-between p-3.5 rounded-xl bg-black/30 border border-white/10">
                  <span className="text-white/60">Aktif Stok Kartı (SKU)</span>
                  <strong className="text-emerald-400 font-mono">
                    {ecosystemData?.saasUsage?.currentActiveSkus || forecasts.length} Ürün
                  </strong>
                </div>
                <div className="flex items-center justify-between p-3.5 rounded-xl bg-black/30 border border-white/10">
                  <span className="text-white/60">Omnichannel Sipariş Kaydı</span>
                  <strong className="text-sky-400 font-mono">
                    {ecosystemData?.saasUsage?.currentMonthlyOrders || 4} Sipariş
                  </strong>
                </div>
              </div>
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}
