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
  RefreshCw
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
import type { AmaQueryResult } from "@/lib/services/inventoryAiEngine"

export default function InventoryAiAndAnalyticsPage() {
  const [state, setState] = useState(() => enterpriseInventoryService.getState())
  const [activeTab, setActiveTab] = useState("foresight-forecasting")
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
    state.forecasts.find(f => f.id === selectedForecastId) || state.forecasts[0]

  const handleRunAmaQuery = (questionText?: string) => {
    const q = questionText ?? amaInput
    if (!q.trim()) return
    setAmaInput(q)
    const result = executeInventoryAmaQuery(q)
    setAmaResult(result)
    toast.success(`AMA Sorgusu Çözümlendi (${result.executionTimeMs} ms)`, {
      description: `Algılanan Niyet: ${result.intentDetected}`
    })
  }

  return (
    <div className="space-y-6 p-6">
      {/* Üst Başlık */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <Badge className="bg-purple-600 text-white hover:bg-purple-700">
              Faz 5 • Yapay Zekâ (AI) & İleri Envanter Analitiği
            </Badge>
            <Badge variant="outline" className="border-amber-300 text-amber-800 bg-amber-50">
              ForesightAI • Ask Me Anything (NLQ) • Narrative AI
            </Badge>
          </div>
          <h1 className="mt-2 text-2xl font-bold tracking-tight text-slate-900">
            AI Destekli Omnichannel Talep Tahminleme, Doğal Dil Asistanı (AMA) & Rapor Anlatıları
          </h1>
          <p className="text-sm text-slate-600">
            Ne zaman ve ne kadar stok gerektiğini öngören ForesightAI motoru, doğal dille stok sorgulayan "Ask Me Anything" (AMA) asistanı ve üst yönetim için otomatik özet çıkaran AI rapor anlatıları.
          </p>
        </div>
      </div>

      {/* Faz 5 Sekmeleri */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="flex flex-wrap h-auto gap-1 bg-slate-100 p-1">
          <TabsTrigger value="foresight-forecasting" className="gap-1.5 text-xs sm:text-sm">
            <BrainCircuit className="h-4 w-4" />
            1. ForesightAI Omnichannel Talep Tahminleme & Optimizasyon
          </TabsTrigger>
          <TabsTrigger value="ask-me-anything" className="gap-1.5 text-xs sm:text-sm">
            <MessageSquareText className="h-4 w-4" />
            2. "Ask Me Anything" (AMA) Doğal Dil Stok Sorgulama Asistanı
          </TabsTrigger>
          <TabsTrigger value="narrative-reporting" className="gap-1.5 text-xs sm:text-sm">
            <FileText className="h-4 w-4" />
            3. AI Destekli Rapor Anlatıları (Narrative Reporting)
          </TabsTrigger>
        </TabsList>

        {/* 1. SEKME: FORESIGHT-AI TALEP TAHMİNLEME VE STOK OPTİMİZASYONU */}
        <TabsContent value="foresight-forecasting" className="space-y-6">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
            {state.forecasts.map(fc => (
              <Card
                key={fc.id}
                onClick={() => setSelectedForecastId(fc.id)}
                className={`cursor-pointer transition-all ${
                  activeForecast?.id === fc.id
                    ? "border-2 border-purple-600 bg-purple-50/20 shadow-md"
                    : "border-slate-200 hover:border-slate-300"
                }`}
              >
                <CardContent className="p-4 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-xs font-bold text-purple-700">
                      {fc.sku}
                    </span>
                    <Badge
                      className={
                        fc.optimizationStatus === "STOCKOUT_IMMINENT"
                          ? "bg-rose-600 text-white"
                          : fc.optimizationStatus === "REORDER_NOW"
                          ? "bg-amber-500 text-white"
                          : "bg-emerald-600 text-white"
                      }
                    >
                      {fc.daysUntilStockout} Gün Stok Ömrü
                    </Badge>
                  </div>
                  <div className="font-semibold text-sm text-slate-900 line-clamp-1">
                    {fc.itemName}
                  </div>
                  <div className="grid grid-cols-3 gap-1 pt-1 text-center bg-slate-50 rounded p-1.5 border border-slate-100 text-[11px]">
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
                  <div className="flex items-center justify-between text-[11px] text-slate-500 pt-1">
                    <span>AI Güven: <strong>%{fc.confidenceScorePercent}</strong></span>
                    <span className="text-emerald-700 font-semibold">
                      Öneri: +{fc.recommendedOrderQty} {fc.unit}
                    </span>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {activeForecast && (
            <Card className="border-slate-200">
              <CardHeader>
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <CardTitle className="text-base">
                      {activeForecast.itemName} ({activeForecast.sku}) — Holt-Winters & Omnichannel AI Tahmin Eğrisi
                    </CardTitle>
                    <CardDescription>
                      {activeForecast.channelTrendLabel} • Mevsimsellik Katsayısı: ×{activeForecast.seasonalityFactor}
                    </CardDescription>
                  </div>
                  <Badge className="bg-purple-600 text-white">
                    Korunan Ciro Etkisi: ₺{activeForecast.projectedRevenueImpactTry.toLocaleString("tr-TR")}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Görsel Aylık Gerçekleşen vs AI Tahmin Bar Grafiği */}
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-8">
                  {activeForecast.monthlySeries.map((pt, idx) => {
                    const maxVal = Math.max(
                      ...activeForecast.monthlySeries.map(m => m.upperBound)
                    )
                    const heightPct = Math.max(18, Math.round((pt.forecast / maxVal) * 100))
                    const isFuture = pt.actual === undefined
                    return (
                      <div
                        key={idx}
                        className={`rounded-lg border p-3 flex flex-col justify-between ${
                          isFuture
                            ? "border-purple-300 bg-purple-50/40"
                            : "border-slate-200 bg-white"
                        }`}
                      >
                        <div className="text-xs font-semibold text-slate-700">{pt.month}</div>
                        <div className="my-3 h-28 flex items-end justify-center bg-slate-100/70 rounded p-2">
                          <div
                            className={`w-full rounded-t transition-all ${
                              isFuture ? "bg-purple-600" : "bg-slate-800"
                            }`}
                            style={{ height: `${heightPct}%` }}
                          />
                        </div>
                        <div className="space-y-0.5 text-[11px]">
                          {pt.actual !== undefined && (
                            <div className="flex justify-between">
                              <span className="text-slate-500">Gerçek:</span>
                              <strong>{pt.actual}</strong>
                            </div>
                          )}
                          <div className="flex justify-between">
                            <span className="text-purple-700 font-medium">AI Tahmin:</span>
                            <strong className="text-purple-700">{pt.forecast}</strong>
                          </div>
                          <div className="text-[10px] text-slate-400">
                            Band: [{pt.lowerBound} – {pt.upperBound}]
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

        {/* 2. SEKME: "ASK ME ANYTHING" (AMA) DOĞAL DİL STOK SORGULAMA ASİSTANI */}
        <TabsContent value="ask-me-anything" className="space-y-6">
          <Card className="border-indigo-200 bg-indigo-50/20">
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Sparkles className="h-5 w-5 text-indigo-600" />
                "Ask Me Anything" (AMA) Doğal Dil Stok & WMS Sorgulama Asistanı
              </CardTitle>
              <CardDescription>
                Stok, Lot/SKT, FIFO/LIFO maliyet, ROP kritik stoklar veya konsinye hakediş verilerini günlük konuşma diliyle sorgulayın.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Sorgu Giriş Barı */}
              <div className="flex flex-col gap-2 sm:flex-row">
                <Input
                  value={amaInput}
                  onChange={e => setAmaInput(e.target.value)}
                  onKeyDown={e => e.key === "Enter" && handleRunAmaQuery()}
                  placeholder="Örn: SKT'si yaklaşan lotları ve karantina stoklarını göster..."
                  className="bg-white h-11 text-sm"
                />
                <Button
                  onClick={() => handleRunAmaQuery()}
                  className="h-11 bg-indigo-600 hover:bg-indigo-700 text-white gap-2 px-6"
                >
                  <Send className="h-4 w-4" />
                  Yapay Zekâ İle Sorgula
                </Button>
              </div>

              {/* Hazır Örnek Sorgu Hapları */}
              <div className="flex flex-wrap gap-2">
                {[
                  "Hangi ürünlerde kritik stok (ROP altı) uyarısı var?",
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
                    className="h-7 text-xs bg-white hover:bg-indigo-50 border-indigo-200 text-indigo-800"
                  >
                    {sampleQ}
                  </Button>
                ))}
              </div>

              {/* AMA Sonuç Paneli */}
              <div className="rounded-xl bg-white border border-slate-200 p-5 space-y-4 shadow-sm">
                <div className="flex flex-wrap items-center justify-between gap-2 border-b pb-3">
                  <div className="flex items-center gap-2">
                    <Badge className="bg-indigo-600 text-white font-mono">
                      Niyet: {amaResult.intentDetected}
                    </Badge>
                    <Badge variant="outline" className="text-emerald-700 border-emerald-300">
                      Güven: %{amaResult.confidencePercent} • {amaResult.executionTimeMs} ms
                    </Badge>
                  </div>
                  <code className="text-[11px] bg-slate-100 px-2.5 py-1 rounded text-slate-700 font-mono">
                    {amaResult.executedQueryExpression}
                  </code>
                </div>

                {/* Doğal Dil Yanıt Anlatısı */}
                <div className="rounded-lg bg-indigo-50/60 border border-indigo-100 p-3.5 text-sm text-slate-800 leading-relaxed">
                  <strong className="text-indigo-900">AI Analiz Yanıtı: </strong>
                  {amaResult.answerNarrative}
                </div>

                {/* Yapılandırılmış Veri Tablosu */}
                <div className="overflow-x-auto rounded-lg border border-slate-200">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-50 uppercase text-slate-600 border-b">
                      <tr>
                        {amaResult.columns.map(col => (
                          <th key={col} className="p-2.5">
                            {col}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200">
                      {amaResult.rows.map((row, rIdx) => (
                        <tr key={rIdx} className="hover:bg-slate-50">
                          {amaResult.columns.map(col => (
                            <td key={col} className="p-2.5 font-medium text-slate-800">
                              {row[col]}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* 3. SEKME: AI DESTEKLİ RAPOR ANLATILARI (NARRATIVE REPORTING) */}
        <TabsContent value="narrative-reporting" className="space-y-6">
          {state.narrativeReports.map(rep => (
            <Card key={rep.id} className="border-slate-200 shadow-sm">
              <CardHeader className="border-b bg-slate-50/60">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <Badge className="bg-slate-900 text-white">{rep.periodLabel}</Badge>
                    <CardTitle className="text-lg mt-2">{rep.title}</CardTitle>
                  </div>
                  <span className="text-xs text-slate-500 font-mono">
                    Üretim Zamanı: {rep.generatedAt}
                  </span>
                </div>
              </CardHeader>
              <CardContent className="p-6 space-y-6">
                {/* Yönetici Manşeti */}
                <div className="rounded-xl bg-amber-50/70 border border-amber-200 p-4 text-sm font-medium text-slate-900 leading-relaxed">
                  <strong className="text-amber-900 block mb-1 uppercase text-xs">
                    Yönetim Kurulu Özet Manşeti (Executive Headline)
                  </strong>
                  {rep.executiveHeadline}
                </div>

                {/* KPI Öne Çıkanlar */}
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
                  {rep.kpiHighlights.map((kpi, idx) => (
                    <div
                      key={idx}
                      className="rounded-lg border border-slate-200 p-3.5 bg-white"
                    >
                      <span className="text-xs text-slate-500">{kpi.label}</span>
                      <div className="text-xl font-bold text-slate-900 mt-1">{kpi.value}</div>
                      <div className="text-xs text-emerald-700 font-medium mt-0.5">
                        {kpi.trend}
                      </div>
                    </div>
                  ))}
                </div>

                {/* Detaylı Anlatı Paragrafları */}
                <div className="space-y-3">
                  <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider">
                    AI Tarafından Oluşturulan Rapor Anlatısı
                  </h3>
                  {rep.narrativeParagraphs.map((p, idx) => (
                    <p
                      key={idx}
                      className="text-sm text-slate-700 leading-relaxed bg-slate-50 p-3.5 rounded-lg border border-slate-100"
                    >
                      {p}
                    </p>
                  ))}
                </div>

                {/* Tespit Edilen Anomaliler ve Önerilen Aksiyonlar */}
                <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
                  <div className="space-y-2.5">
                    <h4 className="text-xs font-bold uppercase text-rose-700">
                      Tespit Edilen Kritik Anomaliler & Darboğazlar
                    </h4>
                    {rep.keyAnomalies.map((anom, idx) => (
                      <div
                        key={idx}
                        className="rounded-lg border border-rose-200 bg-rose-50/30 p-3 text-xs space-y-1"
                      >
                        <div className="font-bold text-slate-900">{anom.title}</div>
                        <div className="text-slate-600">{anom.impact}</div>
                      </div>
                    ))}
                  </div>

                  <div className="space-y-2.5">
                    <h4 className="text-xs font-bold uppercase text-emerald-700">
                      Önerilen Yönetici Aksiyonları & Finansal Katkı
                    </h4>
                    {rep.actionRecommendations.map((act, idx) => (
                      <div
                        key={idx}
                        className="rounded-lg border border-emerald-200 bg-emerald-50/30 p-3 text-xs space-y-1"
                      >
                        <div className="font-semibold text-slate-900">{act.action}</div>
                        <div className="flex justify-between text-[11px] text-slate-600 pt-1">
                          <span>Sorumlu: <strong>{act.ownerRole}</strong></span>
                          <span className="font-bold text-emerald-700">
                            Finansal Etki: +₺{act.financialBenefitTry.toLocaleString("tr-TR")}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </TabsContent>
      </Tabs>
    </div>
  )
}

