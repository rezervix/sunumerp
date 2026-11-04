"use client"

import React, { useState, useEffect, useCallback } from "react"
import Link from "next/link"
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
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
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
    <div className="min-h-screen bg-slate-50/60 p-4 sm:p-6 lg:p-8 space-y-6">
      {/* 0. STOK VE DEPO YÖNETİMİ BİRLEŞİK ÜST SEKME / NAVİGASYON */}
      <InventoryModuleNav />

      {/* 1. ÜST AI YÖNETİCİ BRİFİNGİ */}
      <div className="rounded-2xl border border-purple-200 bg-gradient-to-r from-purple-50/90 via-indigo-50/50 to-white p-4 sm:p-5 shadow-xs">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-purple-600 text-white shadow-xs">
              <BrainCircuit className="h-5 w-5" />
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-base sm:text-lg font-bold text-slate-900">
                  AI Analiz, Talep Tahminleme & Sistem Ayarları
                </h1>
                <Badge variant="outline" className="border-purple-300 bg-white text-purple-700 text-xs font-medium">
                  Canlı Prisma Veritabanı Analitiği
                </Badge>
              </div>
              <p className="mt-1 text-xs sm:text-sm text-slate-600">
                {executiveBanner
                  ? `${executiveBanner.sentence1} ${executiveBanner.sentence2}`
                  : "Stok hareketleri, devir hızı, ölü stoklar ve yaklaşan SKT riskleri gerçek veritabanı kayıtlarından matematiksel olarak hesaplanır."}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <Button
              variant="outline"
              size="sm"
              onClick={() => fetchAiDashboard(true)}
              disabled={loading || refreshing}
              className="text-xs h-9 gap-1.5"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${refreshing ? "animate-spin" : ""}`} />
              Analizi Yenile
            </Button>
            <Button
              size="sm"
              onClick={() => setActiveTab("ask-me-anything")}
              className="bg-purple-600 hover:bg-purple-700 text-white text-xs h-9 gap-1.5 shadow-xs"
            >
              <Sparkles className="h-4 w-4" />
              Soru Sor (AMA)
            </Button>
          </div>
        </div>
      </div>

      {/* 2. ANA SEKMELER */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="bg-white border border-slate-200 p-1 h-auto flex flex-wrap gap-1">
          <TabsTrigger value="ask-me-anything" className="text-xs sm:text-sm gap-1.5">
            <MessageSquareText className="h-4 w-4" />
            1. Doğal Dil Sorgulama (AMA Asistanı)
          </TabsTrigger>
          <TabsTrigger value="foresight-forecasting" className="text-xs sm:text-sm gap-1.5">
            <TrendingUp className="h-4 w-4" />
            2. Talep Tahmini, Devir Hızı & Ölü Stok (ForesightAI)
          </TabsTrigger>
          <TabsTrigger value="narrative-reporting" className="text-xs sm:text-sm gap-1.5">
            <FileText className="h-4 w-4" />
            3. Yönetici Rapor Anlatıları
          </TabsTrigger>
          <TabsTrigger value="api-settings" className="text-xs sm:text-sm gap-1.5">
            <Settings className="h-4 w-4" />
            4. Açık API, Entegrasyon & Ayarlar
          </TabsTrigger>
        </TabsList>

        {/* ══════════════════════════════════════════════════════════
            TAB 1: DOĞAL DİL SORGULAMA ("ASK ME ANYTHING" - AMA)
           ══════════════════════════════════════════════════════════ */}
        <TabsContent value="ask-me-anything" className="space-y-4">
          <Card className="border-indigo-100 shadow-xs">
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <MessageSquareText className="h-4 w-4 text-indigo-600" />
                Doğal Dil Veritabanı Sorgulama Asistanı (Ask Me Anything)
              </CardTitle>
              <CardDescription>
                Sorunuzu günlük Türkçe ile yazın; arka planda gerçek Prisma sorguları (Kritik stoklar, en çok satanlar, ölü stoklar, depo bazlı envanter değeri, yaklaşan SKT'ler, konsinye hakedişler) çalıştırılıp tablo ve özet olarak sunulsun.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Soru Giriş Çubuğu */}
              <div className="flex flex-col sm:flex-row gap-2">
                <Input
                  value={amaInput}
                  onChange={e => setAmaInput(e.target.value)}
                  onKeyDown={e => e.key === "Enter" && handleRunAmaQuery()}
                  placeholder="Örn: SKT'si yaklaşan lotlar hangileri? veya Depo bazlı envanter değerimiz nedir?"
                  className="bg-slate-50 h-11 text-sm border-slate-200"
                />
                <Button
                  onClick={() => handleRunAmaQuery()}
                  disabled={amaLoading}
                  className="h-11 bg-indigo-600 hover:bg-indigo-700 text-white px-6 gap-2 text-xs font-semibold shrink-0"
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
                <span className="text-xs text-slate-400 block mb-1.5">
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
                    <Button
                      key={idx}
                      variant="outline"
                      size="sm"
                      onClick={() => handleRunAmaQuery(sampleQ)}
                      className="h-7 text-xs bg-white hover:bg-indigo-50 border-slate-200 text-slate-700"
                    >
                      {sampleQ}
                    </Button>
                  ))}
                </div>
              </div>

              {/* Yapay Zekâ Yanıt Kartı + Gerçek Veritabanı Tablosu */}
              {amaResult && (
                <div className="rounded-xl border border-indigo-100 bg-indigo-50/30 p-5 space-y-4">
                  <div className="flex flex-wrap items-center justify-between gap-2 border-b border-indigo-100 pb-3">
                    <div className="flex items-center gap-2">
                      <Badge className="bg-indigo-600 text-white text-xs">
                        {amaResult.intentDetected}
                      </Badge>
                      <span className="text-xs text-slate-500">
                        Güven Skoru: <strong>%{amaResult.confidencePercent}</strong> ({amaResult.executionTimeMs} ms)
                      </span>
                    </div>
                    <code className="font-mono text-[11px] text-indigo-700 bg-white px-2 py-0.5 rounded border border-indigo-100">
                      {amaResult.executedQueryExpression}
                    </code>
                  </div>

                  {/* Özet Cümle */}
                  <div className="text-sm text-slate-800 leading-relaxed font-medium bg-white p-3.5 rounded-xl border border-indigo-100">
                    {amaResult.answerNarrative}
                  </div>

                  {/* Gerçek Veritabanı Sonuç Tablosu */}
                  {amaResult.columns && amaResult.columns.length > 0 && (
                    <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
                      <table className="w-full text-left text-xs">
                        <thead className="bg-slate-50 text-slate-600 border-b border-slate-200">
                          <tr>
                            {amaResult.columns.map(col => (
                              <th key={col} className="px-3.5 py-2.5 font-semibold">
                                {col}
                              </th>
                            ))}
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {(amaResult.rows || []).map((row, rIdx) => (
                            <tr key={rIdx} className="hover:bg-slate-50/80">
                              {amaResult.columns.map(col => (
                                <td key={col} className="px-3.5 py-2.5 text-slate-700 font-medium">
                                  {String(row[col] ?? "-")}
                                </td>
                              ))}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}

                  {/* Önerilen Aksiyonlar */}
                  {amaResult.recommendedActions && amaResult.recommendedActions.length > 0 && (
                    <div className="pt-2 border-t border-indigo-100 flex flex-wrap items-center justify-between gap-2">
                      <div className="flex flex-wrap gap-2">
                        {amaResult.recommendedActions.map((act, idx) => (
                          <Link key={idx} href="/dashboard/satinalma">
                            <Button
                              size="sm"
                              variant="outline"
                              className="h-8 text-xs bg-white border-indigo-200 text-indigo-700 hover:bg-indigo-50"
                            >
                              <CheckCircle2 className="mr-1.5 h-3.5 w-3.5 text-indigo-600" />
                              {act}
                            </Button>
                          </Link>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ══════════════════════════════════════════════════════════
            TAB 2: FORESIGHT-AI TALEP TAHMİNİ, DEVİR HIZI VE ÖLÜ STOK
           ══════════════════════════════════════════════════════════ */}
        <TabsContent value="foresight-forecasting" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {forecasts.map(fc => {
              const isSelected = activeForecast?.id === fc.id
              const isRisk =
                fc.optimizationStatus === "STOCKOUT_IMMINENT" ||
                fc.currentAvailableStock <= fc.minStockLevel

              return (
                <Card
                  key={fc.id}
                  onClick={() => setSelectedForecastId(fc.id)}
                  className={`cursor-pointer transition-all ${
                    isSelected
                      ? "border-2 border-purple-600 bg-purple-50/20 shadow-xs"
                      : "border-slate-200 hover:border-slate-300"
                  }`}
                >
                  <CardHeader className="p-4 pb-2">
                    <div className="flex items-center justify-between gap-1">
                      <span className="font-mono text-xs font-bold text-purple-700">{fc.sku}</span>
                      {fc.isDeadStock ? (
                        <Badge variant="outline" className="border-amber-300 bg-amber-50 text-amber-800 text-[10px]">
                          Hareketsiz (Ölü) Stok
                        </Badge>
                      ) : (
                        <Badge className={isRisk ? "bg-rose-600 text-white text-[10px]" : "bg-emerald-600 text-white text-[10px]"}>
                          {fc.daysUntilStockout >= 900 ? "Stok Yeterli" : `${fc.daysUntilStockout} Gün Stok Ömrü`}
                        </Badge>
                      )}
                    </div>
                    <CardTitle className="text-sm text-slate-900 mt-1 line-clamp-1">
                      {fc.itemName}
                    </CardTitle>
                    <div className="flex items-center justify-between text-[11px] text-slate-500 pt-0.5">
                      <span>Mevcut: <strong>{fc.currentAvailableStock} {fc.unit}</strong></span>
                      <span>Devir Hızı: <strong>{fc.turnoverRateAnnual}x/yıl</strong></span>
                    </div>
                  </CardHeader>
                  <CardContent className="p-4 pt-1 space-y-3">
                    <div className="grid grid-cols-3 gap-1 bg-slate-50 p-2 rounded text-center text-[11px]">
                      <div>
                        <span className="text-slate-400 block text-[10px]">30 Gün</span>
                        <strong>{fc.forecast30d}</strong>
                      </div>
                      <div>
                        <span className="text-slate-400 block text-[10px]">60 Gün</span>
                        <strong>{fc.forecast60d}</strong>
                      </div>
                      <div>
                        <span className="text-slate-400 block text-[10px]">90 Gün</span>
                        <strong className="text-purple-700">{fc.forecast90d}</strong>
                      </div>
                    </div>

                    {fc.nearestExpiryDays !== null && fc.nearestExpiryDays <= 30 && (
                      <div className="flex items-center gap-1.5 text-[11px] text-amber-700 bg-amber-50 px-2 py-1 rounded border border-amber-200">
                        <Clock className="h-3 w-3 shrink-0" />
                        <span>SKT Riski: {fc.nearestExpiryDays} gün kaldı ({fc.expiringLotQty} {fc.unit})</span>
                      </div>
                    )}

                    <div className="flex items-center justify-between text-xs pt-1">
                      <span className="text-slate-500">Önerilen Sipariş:</span>
                      <strong className={fc.recommendedOrderQty > 0 ? "text-rose-600" : "text-emerald-700"}>
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
                      className="w-full h-8 text-xs bg-purple-600 hover:bg-purple-700 text-white gap-1"
                    >
                      {creatingPrId === fc.id ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      ) : (
                        <Zap className="h-3.5 w-3.5" />
                      )}
                      Tek Tıkla Sipariş Talebi Aç
                    </Button>
                  </CardContent>
                </Card>
              )
            })}
          </div>

          {/* Seçili Ürünün Gelecek Trend Grafiği */}
          {activeForecast && (
            <Card className="border-slate-200">
              <CardHeader>
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <CardTitle className="text-base text-slate-900">
                      {activeForecast.itemName} ({activeForecast.sku}) — Gerçek Hareket & 90 Günlük Talep Projeksiyonu
                    </CardTitle>
                    <CardDescription className="text-xs">
                      {activeForecast.channelTrendLabel} • Mevsimsellik Katsayısı: ×{activeForecast.seasonalityFactor} • Güven Skoru: %{activeForecast.confidenceScorePercent}
                    </CardDescription>
                  </div>
                  <Badge className="bg-purple-600 text-white">
                    30 Günlük Ciro Etkisi: ₺{(activeForecast.projectedRevenueImpactTry || 0).toLocaleString("tr-TR")}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
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
                        className={`p-3 rounded-xl border flex flex-col justify-between ${
                          isFuture ? "border-purple-300 bg-purple-50/40" : "border-slate-200 bg-white"
                        }`}
                      >
                        <div className="text-xs font-semibold text-slate-700">{pt.month}</div>
                        <div className="my-2 h-20 flex items-end justify-center bg-slate-100/70 rounded p-1.5">
                          <div
                            className={`w-full rounded-t transition-all ${
                              isFuture ? "bg-purple-600" : "bg-slate-800"
                            }`}
                            style={{ height: `${barHeightPercent}%` }}
                          />
                        </div>
                        <div className="text-[11px] space-y-0.5">
                          {pt.actual !== undefined && (
                            <div className="flex justify-between text-slate-500">
                              <span>Gerçekleşen:</span>
                              <strong>{pt.actual} {activeForecast.unit}</strong>
                            </div>
                          )}
                          <div className="flex justify-between text-purple-700">
                            <span>Tahmin:</span>
                            <strong>{pt.forecast} {activeForecast.unit}</strong>
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* ══════════════════════════════════════════════════════════
            TAB 3: YÖNETİCİ RAPOR ANLATILARI (NARRATIVE REPORTING)
           ══════════════════════════════════════════════════════════ */}
        <TabsContent value="narrative-reporting" className="space-y-4">
          {narrativeReports.map(rep => (
            <Card key={rep.id} className="border-slate-200">
              <CardHeader className="pb-3 border-b">
                <div className="flex items-center justify-between">
                  <span className="font-mono text-xs font-bold text-purple-700 bg-purple-50 px-2.5 py-1 rounded">
                    {rep.reportCode}
                  </span>
                  <span className="text-xs text-slate-400">{rep.generatedAt}</span>
                </div>
                <CardTitle className="text-base text-slate-900 mt-2">{rep.title}</CardTitle>
                <CardDescription className="text-xs font-medium text-slate-700 mt-1">
                  {rep.executiveBrief}
                </CardDescription>
              </CardHeader>

              <CardContent className="pt-4 space-y-4">
                {/* KPI Kartları */}
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                  {(rep.kpiHighlights || []).map((kpi, idx) => (
                    <div key={idx} className="rounded-xl border border-slate-200 bg-slate-50/60 p-3">
                      <span className="text-[11px] text-slate-500 block">{kpi.label}</span>
                      <strong className="text-sm sm:text-base text-slate-900">{kpi.value}</strong>
                      <span className="text-[10px] text-emerald-700 block mt-0.5">{kpi.trend}</span>
                    </div>
                  ))}
                </div>

                {/* Detay Paragraflar */}
                <div className="space-y-2">
                  {(rep.narrativeParagraphs || []).map((p, idx) => (
                    <p key={idx} className="text-xs sm:text-sm text-slate-700 leading-relaxed bg-white p-3 rounded-lg border border-slate-100">
                      {p}
                    </p>
                  ))}
                </div>

                {/* Temel Bulgular */}
                <div>
                  <span className="text-xs font-semibold text-slate-700 uppercase tracking-wider block mb-2">
                    Veritabanı Temel Bulguları:
                  </span>
                  <ul className="space-y-1.5 text-xs text-slate-600">
                    {(rep.keyFindings || []).map((finding, idx) => (
                      <li key={idx} className="flex items-start gap-2">
                        <span className="h-1.5 w-1.5 rounded-full bg-purple-600 mt-1.5 shrink-0" />
                        <span>{finding}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="p-3.5 bg-purple-50/60 rounded-xl border border-purple-100 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
                  <span className="text-purple-900 font-medium">{rep.financialRiskSummary}</span>
                  <Link href="/dashboard/satinalma">
                    <Button size="sm" className="bg-purple-600 hover:bg-purple-700 text-white text-xs h-8">
                      Satın Alma & Otomatik Siparişe Git
                    </Button>
                  </Link>
                </div>
              </CardContent>
            </Card>
          ))}
        </TabsContent>

        {/* ══════════════════════════════════════════════════════════
            TAB 4: AÇIK API, ENTEGRASYON & SİSTEM AYARLARI
           ══════════════════════════════════════════════════════════ */}
        <TabsContent value="api-settings" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            <Card className="border-slate-200 lg:col-span-7">
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <Terminal className="h-4 w-4 text-indigo-600" />
                  Açık REST API v1 (`/api/v1/inventory`) & Dış Sistem Bağlantısı
                </CardTitle>
                <CardDescription>
                  Pazaryerleri, 3PL kargo firmaları ve barkod el terminalleri için gerçek zamanlı PostgreSQL/Prisma stok uç noktası.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="rounded-xl bg-slate-950 text-white p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-xs font-mono text-emerald-400">
                      <Terminal className="h-4 w-4" />
                      GET /api/v1/inventory
                    </div>
                    <Button
                      size="sm"
                      onClick={handleTestRestApi}
                      disabled={isTestingApi}
                      className="h-7 bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-bold text-xs gap-1"
                    >
                      <Play className="h-3 w-3" />
                      Canlı API Test Et
                    </Button>
                  </div>
                  {apiTestResponse && (
                    <pre className="text-[11px] font-mono text-slate-300 overflow-x-auto max-h-56 bg-slate-900 p-2.5 rounded">
                      {apiTestResponse}
                    </pre>
                  )}
                </div>

                <div className="flex items-center justify-between pt-2">
                  <span className="text-xs text-slate-500">
                    Gelişmiş ERP Veri Geçiş Sihirbazı, Webhook ve Eklenti ayarları için:
                  </span>
                  <Link href="/dashboard/envanter-ekosistem">
                    <Button variant="outline" size="sm" className="text-xs h-8">
                      Tam Ekran API & Veri Geçiş Sihirbazı
                    </Button>
                  </Link>
                </div>
              </CardContent>
            </Card>

            <Card className="border-slate-200 lg:col-span-5">
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <Webhook className="h-4 w-4 text-emerald-600" />
                  Canlı Sistem Kapasite & Veritabanı Özeti
                </CardTitle>
                <CardDescription>
                  Aktif Prisma/PostgreSQL tablolarındaki kayıt ve kota durumu.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3 text-xs">
                <div className="flex items-center justify-between p-3 rounded-lg bg-slate-50 border border-slate-200">
                  <span className="text-slate-600">Aktif Depo Sayısı</span>
                  <strong className="text-slate-900">
                    {ecosystemData?.saasUsage?.currentWarehouses || 3} Depo
                  </strong>
                </div>
                <div className="flex items-center justify-between p-3 rounded-lg bg-slate-50 border border-slate-200">
                  <span className="text-slate-600">Aktif Stok Kartı (SKU)</span>
                  <strong className="text-slate-900">
                    {ecosystemData?.saasUsage?.currentActiveSkus || forecasts.length} Ürün
                  </strong>
                </div>
                <div className="flex items-center justify-between p-3 rounded-lg bg-slate-50 border border-slate-200">
                  <span className="text-slate-600">Omnichannel Sipariş Kaydı</span>
                  <strong className="text-slate-900">
                    {ecosystemData?.saasUsage?.currentMonthlyOrders || 4} Sipariş
                  </strong>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}
