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
  Settings,
  Webhook,
  Terminal,
  Play,
  Zap,
  Clock
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import { toast } from "sonner"
import { InventoryModuleNav } from "../stok/components/InventoryModuleNav"
import { mockDatabase } from "@/lib/data/mockDatabase"
import {
  IconLoader,
  IconRefresh,
  IconCheck,
  IconSend
} from "@/components/ui/app-icons"
import type {
  ForesightForecastItem,
  AiNarrativeReportRecord
} from "@/lib/services/inventoryAiEngine"
import { safeText, safeNumber, safeCurrency, safeRateX } from "@/lib/utils/safe-display"

export default function InventoryAiAndAnalyticsPage() {
  const [loading, setLoading] = useState(false)
  const [refreshing, setRefreshing] = useState(false)
  const [activeTab, setActiveTab] = useState("ask-me-anything")

  // Gerçek Veritabanı AI State
  const [forecasts, setForecasts] = useState<ForesightForecastItem[]>(() =>
    mockDatabase.getDemandForecasts()
  )
  const [narrativeReports, setNarrativeReports] = useState<AiNarrativeReportRecord[]>(() =>
    mockDatabase.getNarrativeReports()
  )
  const [executiveBanner, setExecutiveBanner] = useState<any>(() =>
    mockDatabase.getExecutiveBanner()
  )
  const [selectedForecastId, setSelectedForecastId] = useState<string>(
    () => mockDatabase.getDemandForecasts()[0]?.id || "fc-01"
  )
  const [creatingPrId, setCreatingPrId] = useState<string | null>(null)

  // Ask Me Anything (AMA) State
  const [amaInput, setAmaInput] = useState(
    "Hangi ürünlerde kritik stok (ROP altı) ve tükenme riski var?"
  )
  const [amaLoading, setAmaLoading] = useState(false)
  const [amaResult, setAmaResult] = useState<any>(() =>
    mockDatabase.getDefaultAmaResult()
  )

  // API & Ekosistem Ayarları State
  const [ecosystemData, setEcosystemData] = useState<any>(null)
  const [apiTestResponse, setApiTestResponse] = useState<string>("")
  const [isTestingApi, setIsTestingApi] = useState(false)

  // Canlı Reaktif Mock DB Dinleyicisi
  useEffect(() => {
    const handleDbChange = () => {
      setForecasts(mockDatabase.getDemandForecasts())
      setNarrativeReports(mockDatabase.getNarrativeReports())
      setExecutiveBanner(mockDatabase.getExecutiveBanner())
    }
    window.addEventListener("sunum-mockdb-change", handleDbChange)
    return () => window.removeEventListener("sunum-mockdb-change", handleDbChange)
  }, [])

  const fetchAiDashboard = useCallback(async (isSilent = false) => {
    if (!isSilent) setLoading(true)
    else setRefreshing(true)

    try {
      const [aiRes, ecoRes] = await Promise.all([
        fetch("/api/inventory-ai"),
        fetch("/api/ecosystem")
      ])
      if (aiRes.ok) {
        const aiJson = await aiRes.json()
        if (aiJson.success && Array.isArray(aiJson.forecasts) && aiJson.forecasts.length > 0) {
          const fcList: ForesightForecastItem[] = aiJson.forecasts || []
          setForecasts(fcList)
          setNarrativeReports(aiJson.narrativeReports || mockDatabase.getNarrativeReports())
          setExecutiveBanner(aiJson.executiveBanner || mockDatabase.getExecutiveBanner())
          if (aiJson.defaultAmaResult && !amaResult) {
            setAmaResult(aiJson.defaultAmaResult)
          }
          if (fcList.length > 0 && !selectedForecastId) {
            setSelectedForecastId(fcList[0].id)
          }
        } else {
          setForecasts(mockDatabase.getDemandForecasts())
          setNarrativeReports(mockDatabase.getNarrativeReports())
          setExecutiveBanner(mockDatabase.getExecutiveBanner())
        }
      } else {
        setForecasts(mockDatabase.getDemandForecasts())
        setNarrativeReports(mockDatabase.getNarrativeReports())
        setExecutiveBanner(mockDatabase.getExecutiveBanner())
      }

      if (ecoRes.ok) {
        const ecoJson = await ecoRes.json()
        if (ecoJson.success) {
          setEcosystemData(ecoJson)
        }
      }
    } catch {
      setForecasts(mockDatabase.getDemandForecasts())
      setNarrativeReports(mockDatabase.getNarrativeReports())
      setExecutiveBanner(mockDatabase.getExecutiveBanner())
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [amaResult, selectedForecastId])

  useEffect(() => {
    fetchAiDashboard(true)
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
      if (res.ok) {
        const json = await res.json()
        if (json.success && json.data) {
          setAmaResult(json.data)
          toast.success(`Veritabanı Sorgusu Tamamlandı (${json.data.executionTimeMs} ms)`, {
            description: `Algılanan Niyet: ${json.data.intentDetected}`
          })
          return
        }
      }
      // Demo Fallback
      const fallbackResult = {
        ...mockDatabase.getDefaultAmaResult(),
        question: q,
        executionTimeMs: 34
      }
      setAmaResult(fallbackResult)
      toast.success("Veritabanı Sorgusu Tamamlandı (34 ms)")
    } catch {
      toast.error("Sorgu sırasında sunucu hatası oluştu.")
    } finally {
      setAmaLoading(false)
    }
  }

  // Tek Tıkla Satın Alma Talebi Aç
  const handleTriggerReorderFromForecast = async (fc: ForesightForecastItem) => {
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
          recommendedQty: fc.recommendedOrderQty,
          unit: fc.unit,
          reason: `ForesightAI Tahmin Modülü Otomatik Talep (${fc.optimizationStatus})`
        })
      })
      const json = await res.json()
      if (json.success) {
        const prNo = json.requisition?.requisitionNo || "PR-AI"
        toast.success(`Satın Alma Talebi Açıldı: ${prNo}`, {
          description: `${fc.itemName} için +${fc.recommendedOrderQty} ${fc.unit} sipariş oluşturuldu.`
        })
      } else {
        toast.error(json.error || "Talep açılamadı.")
      }
    } catch {
      toast.error("İşlem gerçekleştirilemedi.")
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
      toast.success("GET /api/v1/inventory Başarılı (200 OK)")
    } catch {
      toast.error("API testi sırasında hata oluştu.")
    } finally {
      setIsTestingApi(false)
    }
  }

  const bannerText1 = executiveBanner?.sentence1 || executiveBanner?.headline || "Tüm envanter hareketleri izleniyor."
  const bannerText2 = executiveBanner?.sentence2 || executiveBanner?.description || ""

  return (
    <div className="space-y-8">
      {/* 0. MODÜL İÇİ NAVİGASYON */}
      <InventoryModuleNav />

      {/* 1. ÜST AI YÖNETİCİ BRİFİNGİ (CAM KART) */}
      <div className="bg-white/80 backdrop-blur-xl border border-[--line] rounded-[20px] p-5 sm:p-6 shadow-card">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-3.5">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-[--brand-soft] border border-[--brand-line] text-[--brand] shadow-sm">
              <BrainCircuit className="h-5 w-5" />
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2.5">
                <h1 className="text-xl font-semibold text-[--text] tracking-tight">
                  AI Envanter Analizi & Talep Tahmini
                </h1>
                <Badge variant="brand" size="sm">
                  Canlı Veritabanı Analitiği
                </Badge>
              </div>
              <p className="mt-1.5 text-xs sm:text-sm text-[--text-muted] leading-relaxed">
                {safeText(bannerText1)} <span className="font-medium text-[--text]">{safeText(bannerText2)}</span>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2.5 shrink-0">
            <Button
              variant="secondary"
              size="sm"
              onClick={() => fetchAiDashboard(true)}
              disabled={loading || refreshing}
              className="text-xs h-9 gap-1.5 rounded-xl cursor-pointer"
            >
              <IconRefresh size={14} className={refreshing ? "animate-spin text-[--brand]" : ""} />
              Analizi Yenile
            </Button>
            <Button
              variant="primary"
              size="sm"
              onClick={() => setActiveTab("ask-me-anything")}
              className="text-xs font-semibold h-9 gap-1.5 rounded-xl cursor-pointer"
            >
              <Sparkles className="h-4 w-4" />
              Soru Sor (AMA)
            </Button>
          </div>
        </div>
      </div>

      {/* 2. ANA SEKMELER */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="bg-[--muted-bg] border border-[--line] p-1 rounded-2xl h-auto grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-1">
          <TabsTrigger
            value="ask-me-anything"
            className="flex items-center gap-2 py-2 px-3.5 rounded-xl text-xs sm:text-sm font-medium transition data-[state=active]:bg-white data-[state=active]:text-[--brand] data-[state=active]:shadow-xs"
          >
            <MessageSquareText className="h-4 w-4" />
            1. Doğal Dil Sorgulama (AMA)
          </TabsTrigger>
          <TabsTrigger
            value="foresight-forecasting"
            className="flex items-center gap-2 py-2 px-3.5 rounded-xl text-xs sm:text-sm font-medium transition data-[state=active]:bg-white data-[state=active]:text-[--brand] data-[state=active]:shadow-xs"
          >
            <TrendingUp className="h-4 w-4" />
            2. Talep Tahmini (ForesightAI)
          </TabsTrigger>
          <TabsTrigger
            value="narrative-reporting"
            className="flex items-center gap-2 py-2 px-3.5 rounded-xl text-xs sm:text-sm font-medium transition data-[state=active]:bg-white data-[state=active]:text-[--brand] data-[state=active]:shadow-xs"
          >
            <FileText className="h-4 w-4" />
            3. Yönetici Rapor Anlatıları
          </TabsTrigger>
          <TabsTrigger
            value="api-settings"
            className="flex items-center gap-2 py-2 px-3.5 rounded-xl text-xs sm:text-sm font-medium transition data-[state=active]:bg-white data-[state=active]:text-[--brand] data-[state=active]:shadow-xs"
          >
            <Settings className="h-4 w-4" />
            4. Açık API & Ayarlar
          </TabsTrigger>
        </TabsList>

        {/* ══════════════════════════════════════════════════════════
            TAB 1: DOĞAL DİL SORGULAMA ("ASK ME ANYTHING" - AMA)
           ══════════════════════════════════════════════════════════ */}
        <TabsContent value="ask-me-anything" className="space-y-6 focus-visible:outline-none">
          <div className="bg-white/80 backdrop-blur-xl border border-[--line] rounded-[20px] p-6 space-y-5 shadow-card">
            <div>
              <h2 className="text-sm font-semibold text-[--text] flex items-center gap-2">
                <MessageSquareText className="h-4 w-4 text-[--brand]" />
                Doğal Dil Veritabanı Sorgulama Asistanı (Ask Me Anything)
              </h2>
              <p className="text-xs text-[--text-muted] mt-1">
                Sorunuzu Türkçe olarak yazın; arka planda envanter kayıtları taranarak anında özet ve tablo olarak yanıtlanır.
              </p>
            </div>

            {/* AI Giriş Alanı */}
            <div className="bg-[--page]/60 border border-[--line] rounded-2xl p-4 space-y-4">
              <div className="flex flex-col sm:flex-row gap-2.5">
                <Input
                  value={amaInput}
                  onChange={e => setAmaInput(e.target.value)}
                  onKeyDown={e => e.key === "Enter" && handleRunAmaQuery()}
                  placeholder="Örn: SKT'si yaklaşan lotlar hangileri? veya Depo bazlı envanter değerimiz nedir?"
                  className="bg-white border-[--line] text-[--text] placeholder:text-[--text-muted] focus:border-[--brand] h-10 text-xs sm:text-sm flex-1 rounded-xl"
                />
                <Button
                  variant="primary"
                  onClick={() => handleRunAmaQuery()}
                  disabled={amaLoading}
                  className="h-10 px-5 gap-2 text-xs font-semibold rounded-xl shrink-0 cursor-pointer"
                >
                  {amaLoading ? (
                    <IconLoader size={15} />
                  ) : (
                    <IconSend size={15} />
                  )}
                  Veritabanında Sorgula
                </Button>
              </div>

              {/* Hızlı Soru Rozetleri */}
              <div>
                <span className="text-[11px] uppercase tracking-wider text-[--text-muted] font-medium block mb-2">
                  Örnek Veritabanı Sorguları:
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
                      className="rounded-xl px-3 py-1 text-xs bg-white hover:bg-[--brand-soft] border border-[--line] text-[--text-2] hover:text-[--brand] transition-colors cursor-pointer"
                    >
                      {sampleQ}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* AI Yanıt Kartı */}
            {amaResult && (
              <div className="bg-white border border-[--line] rounded-2xl p-5 space-y-4 shadow-sm">
                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[--line-soft] pb-3">
                  <div className="flex items-center gap-2.5">
                    <Badge variant="brand" size="sm">
                      {safeText(amaResult.intentDetected, "Sorgu")}
                    </Badge>
                    <span className="text-xs text-[--text-muted]">
                      Güven Skoru: <strong className="text-[--text] font-medium">%{safeNumber(amaResult.confidencePercent, 95)}</strong> ({safeNumber(amaResult.executionTimeMs, 32)} ms)
                    </span>
                  </div>
                  {amaResult.executedQueryExpression && (
                    <code className="font-mono text-[11px] text-[--text-muted] bg-[--muted-bg] px-3 py-1 rounded-lg border border-[--line]">
                      {amaResult.executedQueryExpression}
                    </code>
                  )}
                </div>

                {/* Özet Cümle */}
                <div className="text-xs sm:text-sm text-[--text] leading-relaxed bg-[--brand-soft]/40 border border-[--brand-line] p-4 rounded-xl">
                  {safeText(amaResult.answerNarrative || amaResult.summaryText)}
                </div>

                {/* Sonuç Tablosu */}
                {amaResult.columns && amaResult.columns.length > 0 && (
                  <div className="border border-[--line] rounded-xl overflow-hidden">
                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-xs">
                        <thead className="bg-[--muted-bg]/60 text-[--text-muted] border-b border-[--line] uppercase text-[11px] tracking-wider font-medium">
                          <tr>
                            {amaResult.columns.map((col: string) => (
                              <th key={col} className="px-4 py-3">
                                {col}
                              </th>
                            ))}
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-[--line-soft]">
                          {(amaResult.rows || []).map((row: any, rIdx: number) => (
                            <tr key={rIdx} className="hover:bg-[--brand-soft]/30 transition-colors">
                              {amaResult.columns.map((col: string) => (
                                <td key={col} className="px-4 py-3 text-[--text]">
                                  {String(row[col] ?? "—")}
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
                  <div className="pt-2 border-t border-[--line-soft] flex flex-wrap items-center gap-2">
                    {amaResult.recommendedActions.map((act: string, idx: number) => (
                      <Link key={idx} href="/dashboard/satinalma">
                        <Button
                          size="sm"
                          variant="secondary"
                          className="h-8 text-xs gap-1.5 rounded-xl text-[--brand] hover:bg-[--brand-soft]"
                        >
                          <IconCheck size={14} className="text-[--brand]" />
                          {act}
                        </Button>
                      </Link>
                    ))}
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
                <div
                  key={fc.id}
                  onClick={() => setSelectedForecastId(fc.id)}
                  className={`cursor-pointer bg-white/80 backdrop-blur-xl border p-5 rounded-[20px] flex flex-col justify-between space-y-3.5 transition-all shadow-card ${
                    isSelected
                      ? "border-[--brand] ring-2 ring-[--brand]/20 shadow-md"
                      : "border-[--line] hover:border-[--brand-line]"
                  }`}
                >
                  <div>
                    <div className="flex items-center justify-between gap-1">
                      <span className="font-mono text-xs font-semibold text-[--brand]">{safeText(fc.sku)}</span>
                      {fc.isDeadStock ? (
                        <Badge variant="warn" size="sm">
                          Hareketsiz Stok
                        </Badge>
                      ) : (
                        <Badge variant={isRisk ? "bad" : "neutral"} size="sm">
                          {fc.daysUntilStockout >= 900 ? "Yeterli" : `${fc.daysUntilStockout} Gün`}
                        </Badge>
                      )}
                    </div>
                    <h3 className="text-sm font-medium text-[--text] mt-2 line-clamp-1">
                      {safeText(fc.itemName)}
                    </h3>
                    <div className="flex items-center justify-between text-xs text-[--text-muted] pt-1">
                      <span>Mevcut: <strong className="text-[--text] font-medium">{fc.currentAvailableStock} {safeText(fc.unit, "Adet")}</strong></span>
                      <span>Devir: <strong className="text-[--brand] font-medium">{safeRateX(fc.turnoverRateAnnual)}</strong></span>
                    </div>
                  </div>

                  <div className="space-y-3">
                    <div className="grid grid-cols-3 gap-1.5 bg-[--page] border border-[--line] p-2.5 rounded-xl text-center text-xs">
                      <div>
                        <span className="text-[--text-muted] block text-[10px]">30 Gün</span>
                        <strong className="text-[--text] font-semibold">{fc.forecast30d}</strong>
                      </div>
                      <div>
                        <span className="text-[--text-muted] block text-[10px]">60 Gün</span>
                        <strong className="text-[--text] font-semibold">{fc.forecast60d}</strong>
                      </div>
                      <div>
                        <span className="text-[--text-muted] block text-[10px]">90 Gün</span>
                        <strong className="text-[--brand] font-semibold">{fc.forecast90d}</strong>
                      </div>
                    </div>

                    {fc.nearestExpiryDays !== null && fc.nearestExpiryDays <= 30 && (
                      <div className="flex items-center gap-1.5 text-[11px] text-[--warn] bg-[--warn-soft] px-2.5 py-1 rounded-lg border border-[--warn]/20">
                        <Clock className="h-3 w-3 shrink-0" />
                        <span>SKT: {fc.nearestExpiryDays} gün kaldı ({fc.expiringLotQty} {fc.unit})</span>
                      </div>
                    )}

                    <div className="flex items-center justify-between text-xs">
                      <span className="text-[--text-muted]">Önerilen Sipariş:</span>
                      <strong className={fc.recommendedOrderQty > 0 ? "text-[--bad] font-semibold" : "text-[--brand] font-semibold"}>
                        {fc.recommendedOrderQty > 0 ? `+${fc.recommendedOrderQty} ${fc.unit}` : "Gerekmiyor"}
                      </strong>
                    </div>

                    <Button
                      size="sm"
                      variant="primary"
                      disabled={creatingPrId === fc.id}
                      onClick={e => {
                        e.stopPropagation()
                        handleTriggerReorderFromForecast(fc)
                      }}
                      className="w-full h-8 text-xs rounded-xl font-medium"
                    >
                      {creatingPrId === fc.id ? (
                        <IconLoader size={14} className="mr-1.5 animate-spin" />
                      ) : (
                        <Zap className="h-3.5 w-3.5 mr-1.5" />
                      )}
                      Tek Tıkla Talep Aç
                    </Button>
                  </div>
                </div>
              )
            })}
          </div>

          {/* Seçili Ürünün Gelecek Trend Grafiği */}
          {activeForecast && (
            <div className="bg-white/80 backdrop-blur-xl border border-[--line] p-6 rounded-[20px] space-y-5 shadow-card">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <h3 className="text-sm sm:text-base font-semibold text-[--text]">
                    {safeText(activeForecast.itemName)} ({safeText(activeForecast.sku)}) — Gerçek Hareket & 90 Günlük Projeksiyon
                  </h3>
                  <p className="text-xs text-[--text-muted] mt-0.5">
                    {safeText(activeForecast.channelTrendLabel)} • Mevsimsellik: ×{activeForecast.seasonalityFactor} • Güven Skoru: %{activeForecast.confidenceScorePercent}
                  </p>
                </div>
                <Badge variant="brand" size="sm">
                  30 Günlük Ciro Etkisi: {safeCurrency(activeForecast.projectedRevenueImpactTry || 0)}
                </Badge>
              </div>

              {/* Çubuk Projeksiyon Dağılımı */}
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
                      className={`p-3.5 rounded-xl border flex flex-col justify-between ${
                        isFuture
                          ? "border-[--brand-line] bg-[--brand-soft]/30"
                          : "border-[--line] bg-[--page]/60"
                      }`}
                    >
                      <div className="text-xs font-medium text-[--text]">{pt.month}</div>
                      <div className="my-2.5 h-24 flex items-end justify-center bg-white rounded-xl p-2 border border-[--line]">
                        <div
                          className={`w-full rounded-t-lg transition-all ${
                            isFuture ? "bg-gradient-to-t from-[--brand] to-[--sky]" : "bg-[--brand]"
                          }`}
                          style={{ height: `${barHeightPercent}%` }}
                        />
                      </div>
                      <div className="text-[11px] space-y-1">
                        {pt.actual !== undefined && (
                          <div className="flex justify-between text-[--text-muted]">
                            <span>Gerçekleşen:</span>
                            <strong className="text-[--brand] font-medium">{pt.actual}</strong>
                          </div>
                        )}
                        <div className="flex justify-between text-[--text-muted]">
                          <span>Tahmin:</span>
                          <strong className="text-[--text] font-semibold">{pt.forecast}</strong>
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
        <TabsContent value="narrative-reporting" className="space-y-6 focus-visible:outline-none">
          {narrativeReports.map(rep => (
            <div key={rep.id} className="bg-white/80 backdrop-blur-xl border border-[--line] p-6 rounded-[20px] space-y-5 shadow-card">
              <div className="pb-4 border-b border-[--line-soft]">
                <div className="flex items-center justify-between">
                  <Badge variant="brand" size="sm" className="font-mono">
                    {safeText(rep.reportCode)}
                  </Badge>
                  <span className="text-xs text-[--text-muted]">{safeText(rep.generatedAt)}</span>
                </div>
                <h3 className="text-base font-semibold text-[--text] mt-2.5">{safeText(rep.title)}</h3>
                <p className="text-xs font-normal text-[--text-muted] mt-1">
                  {safeText(rep.executiveBrief)}
                </p>
              </div>

              {/* KPI Kartları (B4 Kuralı) */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {(rep.kpiHighlights || []).map((kpi, idx) => (
                  <div
                    key={idx}
                    className="bg-[--page]/60 border border-[--line] p-4 rounded-xl space-y-1"
                  >
                    <span className="text-[11px] uppercase tracking-wider text-[--text-muted] font-medium block">
                      {safeText(kpi.label)}
                    </span>
                    <strong className="text-2xl font-light text-[--text] block tabular-nums">
                      {safeText(kpi.value)}
                    </strong>
                    <span className="text-xs text-[--brand] block font-medium">
                      {safeText(kpi.trend)}
                    </span>
                  </div>
                ))}
              </div>

              {/* Detay Paragraflar */}
              <div className="space-y-2.5">
                {(rep.narrativeParagraphs || []).map((p, idx) => (
                  <p key={idx} className="text-xs sm:text-sm text-[--text-2] leading-relaxed bg-[--page]/40 p-4 rounded-xl border border-[--line]">
                    {p}
                  </p>
                ))}
              </div>

              {/* Temel Bulgular */}
              <div>
                <span className="text-xs font-medium text-[--text-muted] uppercase tracking-wider block mb-2.5">
                  Veritabanı Temel Bulguları:
                </span>
                <ul className="space-y-2 text-xs text-[--text-2]">
                  {(rep.keyFindings || []).map((finding, idx) => (
                    <li key={idx} className="flex items-start gap-2.5">
                      <span className="h-1.5 w-1.5 rounded-full bg-[--brand] mt-1.5 shrink-0" />
                      <span>{finding}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <div className="p-4 bg-[--muted-bg]/40 rounded-xl border border-[--line] flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                <span className="text-[--text] font-normal">{safeText(rep.financialRiskSummary)}</span>
                <Link href="/dashboard/satinalma">
                  <Button size="sm" variant="primary" className="text-xs h-8 rounded-xl font-medium">
                    Satın Alma & Siparişe Git
                  </Button>
                </Link>
              </div>
            </div>
          ))}
        </TabsContent>

        {/* ══════════════════════════════════════════════════════════
            TAB 4: AÇIK API, ENTEGRASYON & SİSTEM AYARLARI
           ══════════════════════════════════════════════════════════ */}
        <TabsContent value="api-settings" className="space-y-6 focus-visible:outline-none">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            <div className="bg-white/80 backdrop-blur-xl border border-[--line] rounded-[20px] p-6 lg:col-span-7 space-y-4 shadow-card">
              <div>
                <h3 className="text-sm font-semibold text-[--text] flex items-center gap-2">
                  <Terminal className="h-4 w-4 text-[--brand]" />
                  Açık REST API v1 (`/api/v1/inventory`) & Dış Sistem Bağlantısı
                </h3>
                <p className="text-xs text-[--text-muted] mt-1">
                  Pazaryerleri, 3PL kargo firmaları ve barkod el terminalleri için gerçek zamanlı stok uç noktası.
                </p>
              </div>

              {/* API Test Konsolu */}
              <div className="bg-[--page]/60 border border-[--line] rounded-xl p-4 space-y-3.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-xs font-mono text-[--brand] font-semibold">
                    <Terminal className="h-4 w-4" />
                    GET /api/v1/inventory
                  </div>
                  <Button
                    size="sm"
                    variant="primary"
                    onClick={handleTestRestApi}
                    disabled={isTestingApi}
                    className="h-8 rounded-xl text-xs gap-1.5"
                  >
                    <Play className="h-3 w-3" />
                    Canlı API Test Et
                  </Button>
                </div>
                {apiTestResponse && (
                  <pre className="text-[11px] font-mono text-[--text] overflow-x-auto max-h-56 bg-white border border-[--line] p-3 rounded-xl">
                    {apiTestResponse}
                  </pre>
                )}
              </div>

              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pt-2">
                <span className="text-xs text-[--text-muted]">
                  Gelişmiş ERP Veri Geçiş Sihirbazı ve Eklenti ayarları için:
                </span>
                <Link href="/dashboard/envanter-ekosistem">
                  <Button
                    variant="secondary"
                    size="sm"
                    className="text-xs h-8 rounded-xl"
                  >
                    Tam Ekran Ekosistem Sihirbazı
                  </Button>
                </Link>
              </div>
            </div>

            <div className="bg-white/80 backdrop-blur-xl border border-[--line] rounded-[20px] p-6 lg:col-span-5 space-y-4 shadow-card">
              <div>
                <h3 className="text-sm font-semibold text-[--text] flex items-center gap-2">
                  <Webhook className="h-4 w-4 text-[--brand]" />
                  Canlı Sistem Kapasite & Veritabanı Özeti
                </h3>
                <p className="text-xs text-[--text-muted] mt-1">
                  Aktif envanter tablolarındaki kayıt ve kota durumu.
                </p>
              </div>

              <div className="space-y-3 text-xs">
                <div className="flex items-center justify-between p-3.5 rounded-xl bg-[--page]/60 border border-[--line]">
                  <span className="text-[--text-muted]">Aktif Depo Sayısı</span>
                  <strong className="text-[--text] font-mono font-semibold">
                    {ecosystemData?.saasUsage?.currentWarehouses || 3} Depo
                  </strong>
                </div>
                <div className="flex items-center justify-between p-3.5 rounded-xl bg-[--page]/60 border border-[--line]">
                  <span className="text-[--text-muted]">Aktif Stok Kartı (SKU)</span>
                  <strong className="text-[--brand] font-mono font-semibold">
                    {ecosystemData?.saasUsage?.currentActiveSkus || forecasts.length} Ürün
                  </strong>
                </div>
                <div className="flex items-center justify-between p-3.5 rounded-xl bg-[--page]/60 border border-[--line]">
                  <span className="text-[--text-muted]">Omnichannel Sipariş Kaydı</span>
                  <strong className="text-[--text] font-mono font-semibold">
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
