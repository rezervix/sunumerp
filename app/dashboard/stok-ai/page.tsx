"use client"

import React, { useState, useEffect } from "react"
import {
  Sparkles,
  BrainCircuit,
  MessageSquareText,
  FileText,
  TrendingUp,
  AlertTriangle,
  CheckCircle2,
  Send,
  Database,
  BarChart3,
  Zap,
  RefreshCw,
  Clock,
  ArrowRight,
  ShieldCheck,
  Check,
  ChevronRight,
  HelpCircle
} from "lucide-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { toast } from "sonner"
import {
  enterpriseInventoryService,
  executeInventoryAmaQuery
} from "@/lib/services/enterpriseInventorySuite"
import type { AmaQueryResult, ForesightForecastItem } from "@/lib/services/inventoryAiEngine"

export default function InventoryAiAndAnalyticsPage() {
  const [state, setState] = useState(() => enterpriseInventoryService.getState())
  const [activeTab, setActiveTab] = useState("ask-me-anything")
  const [selectedForecastId, setSelectedForecastId] = useState<string>("fc-01")

  // Ask Me Anything (AMA) State
  const [amaInput, setAmaInput] = useState(
    "Hangi ürünlerde kritik stok (ROP altı) ve tükenme riski var?"
  )
  const [amaResult, setAmaResult] = useState<AmaQueryResult>(() =>
    executeInventoryAmaQuery("Hangi ürünlerde kritik stok (ROP altı) ve tükenme riski var?")
  )

  useEffect(() => {
    const refresh = () => setState({ ...enterpriseInventoryService.getState() })
    window.addEventListener("sunum-inventory-change", refresh)
    return () => window.removeEventListener("sunum-inventory-change", refresh)
  }, [])

  const activeForecast =
    (state.forecasts || []).find(f => f.id === selectedForecastId) || (state.forecasts || [])[0] || null

  const handleRunAmaQuery = (questionText?: string) => {
    const q = questionText ?? amaInput
    if (!q.trim()) return
    setAmaInput(q)
    const result = executeInventoryAmaQuery(q)
    setAmaResult(result)
    toast.success(`Yapay Zekâ Yanıtı Hazır (${result.executionTimeMs} ms)`, {
      description: `Algılanan Niyet: ${result.intentDetected}`
    })
  }

  const handleTriggerReorderFromForecast = (fc: ForesightForecastItem) => {
    toast.success(`${fc.itemName} için Satın Alma Talebi Hazırlandı!`, {
      description: `Önerilen ${fc.recommendedOrderQty} ${fc.unit} sipariş satın alma modülüne aktarıldı.`
    })
  }

  return (
    <div className="space-y-6 p-4 sm:p-6 max-w-7xl mx-auto">
      {/* 1. ÜST AI YÖNETİCİ BRİFİNGİ */}
      <div className="rounded-xl border border-purple-200 bg-gradient-to-r from-purple-50/90 via-indigo-50/50 to-white p-4 sm:p-5 shadow-sm">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-purple-600 text-white shadow">
              <BrainCircuit className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-semibold text-slate-900">Yapay Zekâ Stok & Talep Danışmanı</h2>
                <Badge variant="outline" className="border-purple-300 bg-white text-purple-700 text-xs font-medium">
                  ForesightAI & NLQ Asistanı
                </Badge>
              </div>
              <p className="mt-1 text-sm text-slate-600">
                Gelecek 90 günün satış trendlerini öngören makine öğrenimi modelleri ve günlük dille stok verilerini anında getiren akıllı sohbet motoru.
              </p>
            </div>
          </div>
          <Button
            size="sm"
            onClick={() => setActiveTab("ask-me-anything")}
            className="bg-purple-600 hover:bg-purple-700 text-white text-xs gap-1.5 shadow-sm shrink-0"
          >
            <Sparkles className="h-4 w-4" />
            Yeni Soru Sor
          </Button>
        </div>
      </div>

      {/* 2. BAŞLIK */}
      <div className="flex flex-col gap-2 border-b pb-4">
        <div className="flex items-center gap-2">
          <Sparkles className="h-6 w-6 text-purple-600" />
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900">
            Yapay Zekâ & Envanter Analitiği
          </h1>
        </div>
        <p className="text-sm text-slate-500">
          Karmaşık tablolar yerine tek tıkla akıllı kararlar alın, gelecekteki stok ihtiyaçlarını erkenden planlayın.
        </p>
      </div>

      {/* 3. MODÜL SEKMELERİ */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="bg-slate-100 p-1">
          <TabsTrigger value="ask-me-anything" className="text-xs sm:text-sm gap-1.5">
            <MessageSquareText className="h-4 w-4" />
            Doğal Dil Stok Asistanı (AMA)
          </TabsTrigger>
          <TabsTrigger value="foresight-forecasting" className="text-xs sm:text-sm gap-1.5">
            <TrendingUp className="h-4 w-4" />
            Gelecek Talep Tahminleri (ForesightAI)
          </TabsTrigger>
          <TabsTrigger value="narrative-reporting" className="text-xs sm:text-sm gap-1.5">
            <FileText className="h-4 w-4" />
            Yönetici Rapor Anlatıları
          </TabsTrigger>
        </TabsList>

        {/* TAB 1: ASK ME ANYTHING (DOĞAL DİLLE SORGU) */}
        <TabsContent value="ask-me-anything" className="space-y-4">
          <Card className="border-indigo-100 shadow-xs">
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <MessageSquareText className="h-4 w-4 text-indigo-600" />
                Stok Asistanına İstediğinizi Sorun
              </CardTitle>
              <CardDescription>
                Rapor veya filtre aramak yerine günlük Türkçe ile sorunuzu yazın; sistem tüm modülleri tarayıp anında yanıtlasın.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Soru Giriş Çubuğu */}
              <div className="flex flex-col sm:flex-row gap-2">
                <Input
                  value={amaInput}
                  onChange={e => setAmaInput(e.target.value)}
                  onKeyDown={e => e.key === "Enter" && handleRunAmaQuery()}
                  placeholder="Örn: Hangi ürünlerin stoğu bitmek üzere? veya Konsinye hakediş durumumuz nedir?"
                  className="bg-slate-50 h-11 text-sm border-slate-200"
                />
                <Button
                  onClick={() => handleRunAmaQuery()}
                  className="h-11 bg-indigo-600 hover:bg-indigo-700 text-white px-6 gap-2 text-xs font-semibold shrink-0"
                >
                  <Send className="h-4 w-4" />
                  Sorgula
                </Button>
              </div>

              {/* Hızlı Soru Rozetleri */}
              <div>
                <span className="text-xs text-slate-400 block mb-1.5">Örnek Hızlı Sorular:</span>
                <div className="flex flex-wrap gap-2">
                  {[
                    "Hangi ürünlerde kritik stok (ROP altı) ve tükenme riski var?",
                    "SKT'si yaklaşan lotları ve karantina stoklarını göster",
                    "FIFO ve LIFO maliyet farklarını karşılaştır",
                    "Konsinye (emanet) stoklarımızın tedarikçi hakediş durumu nedir?",
                    "Tüm depoların doluluk oranı ve omnichannel özeti nedir?"
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

              {/* Yapay Zekâ Yanıt Kartı */}
              <div className="rounded-xl border border-indigo-100 bg-indigo-50/30 p-5 space-y-4">
                <div className="flex items-center justify-between border-b border-indigo-100 pb-3">
                  <div className="flex items-center gap-2">
                    <Badge className="bg-indigo-600 text-white text-xs">
                      {amaResult.intentDetected}
                    </Badge>
                    <span className="text-xs text-slate-500">
                      Güven Skoru: <strong>%{amaResult.confidencePercent}</strong> ({amaResult.executionTimeMs} ms)
                    </span>
                  </div>
                  <span className="font-mono text-[11px] text-slate-400">
                    {amaResult.executedQueryExpression}
                  </span>
                </div>

                <div className="text-sm text-slate-800 leading-relaxed font-medium">
                  {amaResult.answerNarrative}
                </div>

                {/* Önerilen Aksiyonlar */}
                {amaResult.recommendedActions && amaResult.recommendedActions.length > 0 && (
                  <div className="pt-2 border-t border-indigo-100">
                    <span className="text-xs font-semibold text-indigo-900 block mb-2">
                      Önerilen Aksiyonlar:
                    </span>
                    <div className="flex flex-wrap gap-2">
                      {(amaResult?.recommendedActions || []).map((act, idx) => (
                        <Button
                          key={idx}
                          size="sm"
                          variant="outline"
                          onClick={() => toast.info(`${act} aksiyonu tetiklendi.`)}
                          className="h-8 text-xs bg-white border-indigo-200 text-indigo-700 hover:bg-indigo-50"
                        >
                          <CheckCircle2 className="mr-1.5 h-3.5 w-3.5 text-indigo-600" />
                          {act}
                        </Button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* TAB 2: FORESIGHT-AI TALEP TAHMİNLERİ */}
        <TabsContent value="foresight-forecasting" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {(state.forecasts || []).map(fc => {
              const isSelected = activeForecast?.id === fc.id
              const isRisk = fc.optimizationStatus === "STOCKOUT_IMMINENT"

              return (
                <Card
                  key={fc.id}
                  onClick={() => setSelectedForecastId(fc.id)}
                  className={`cursor-pointer transition-all ${isSelected ? "border-2 border-purple-600 bg-purple-50/20 shadow-xs" : "border-slate-200 hover:border-slate-300"
                    }`}
                >
                  <CardHeader className="p-4 pb-2">
                    <div className="flex items-center justify-between">
                      <span className="font-mono text-xs font-bold text-purple-700">{fc.sku}</span>
                      <Badge className={isRisk ? "bg-rose-600 text-white" : "bg-emerald-600 text-white"}>
                        {fc.daysUntilStockout} Gün Stok Ömrü
                      </Badge>
                    </div>
                    <CardTitle className="text-sm text-slate-900 mt-1 line-clamp-1">
                      {fc.itemName}
                    </CardTitle>
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

                    <div className="flex items-center justify-between text-xs pt-1">
                      <span className="text-slate-500">Öneri:</span>
                      <strong className="text-emerald-700">+{fc.recommendedOrderQty} {fc.unit}</strong>
                    </div>

                    <Button
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation()
                        handleTriggerReorderFromForecast(fc)
                      }}
                      className="w-full h-8 text-xs bg-purple-600 hover:bg-purple-700 text-white"
                    >
                      Sipariş Talebi Aç
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
                      {activeForecast.itemName} ({activeForecast.sku}) — Gelecek Talep Eğrisi
                    </CardTitle>
                    <CardDescription className="text-xs">
                      {activeForecast.channelTrendLabel} • Mevsimsellik Katsayısı: ×{activeForecast.seasonalityFactor}
                    </CardDescription>
                  </div>
                  <Badge className="bg-purple-600 text-white">
                    Korunan Ciro: ₺{(activeForecast.projectedRevenueImpactTry || 0).toLocaleString("tr-TR")}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-3">
                  {(activeForecast.monthlySeries || []).map((pt, idx) => {
                    const isFuture = pt.actual === undefined

                    return (
                      <div
                        key={idx}
                        className={`p-3 rounded-lg border flex flex-col justify-between ${isFuture ? "border-purple-300 bg-purple-50/40" : "border-slate-200 bg-white"
                          }`}
                      >
                        <div className="text-xs font-semibold text-slate-700">{pt.month}</div>
                        <div className="my-2 h-20 flex items-end justify-center bg-slate-100/70 rounded p-1.5">
                          <div
                            className={`w-full rounded-t transition-all ${isFuture ? "bg-purple-600" : "bg-slate-800"}`}
                            style={{ height: `${Math.min(100, Math.max(20, (pt.forecast || 0) * 1.5))}%` }}
                          />
                        </div>
                        <div className="text-[11px] space-y-0.5">
                          {pt.actual !== undefined && (
                            <div className="flex justify-between text-slate-500">
                              <span>Gerçek:</span>
                              <strong>{pt.actual}</strong>
                            </div>
                          )}
                          <div className="flex justify-between text-purple-700">
                            <span>Tahmin:</span>
                            <strong>{pt.forecast}</strong>
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

        {/* TAB 3: YÖNETİCİ RAPOR ANLATILARI */}
        <TabsContent value="narrative-reporting" className="space-y-4">
          <div className="space-y-4">
            {(state.narrativeReports || []).map(rep => (
              <Card key={rep.id} className="border-slate-200">
                <CardHeader className="pb-3 border-b">
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-xs font-bold text-purple-700 bg-purple-50 px-2 py-0.5 rounded">
                      {rep.reportCode}
                    </span>
                    <span className="text-xs text-slate-400">{rep.generatedAt}</span>
                  </div>
                  <CardTitle className="text-base text-slate-900 mt-2">{rep.title}</CardTitle>
                  <CardDescription className="text-xs">{rep.executiveBrief}</CardDescription>
                </CardHeader>

                <CardContent className="pt-4 space-y-4">
                  <div>
                    <span className="text-xs font-semibold text-slate-700 uppercase tracking-wider block mb-2">
                      Temel Bulgular & Dikkat Edilmesi Gerekenler:
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

                  <div className="p-3 bg-purple-50/60 rounded-lg border border-purple-100 flex items-center justify-between text-xs">
                    <span className="text-purple-900 font-medium">{rep.financialRiskSummary}</span>
                    <Button
                      size="sm"
                      onClick={() => toast.success("Rapor PDF formatında dışa aktarıldı.")}
                      className="bg-purple-600 text-white text-xs h-7"
                    >
                      Dışa Aktar
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}
