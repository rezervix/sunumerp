"use client"

import React, { useState, useEffect, useMemo } from "react"
import {
  ShoppingCart,
  BellRing,
  Handshake,
  Calculator,
  CheckCircle2,
  AlertTriangle,
  TrendingUp,
  Clock,
  Truck,
  ShieldCheck,
  FileCheck2,
  Sparkles,
  ArrowRight
} from "lucide-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from "@/components/ui/select"
import { toast } from "sonner"
import {
  enterpriseInventoryService,
  calculateDynamicReorderPoint
} from "@/lib/services/enterpriseInventorySuite"

export default function SmartProcurementAndConsignmentPage() {
  const [state, setState] = useState(() => enterpriseInventoryService.getState())
  const [activeTab, setActiveTab] = useState("rop-engine")

  // Canlı ROP & Güvenlik Stoğu Algoritma Parametreleri
  const [simDailyDemand, setSimDailyDemand] = useState("68")
  const [simDemandStdDev, setSimDemandStdDev] = useState("16")
  const [simLeadTimeDays, setSimLeadTimeDays] = useState("4")
  const [simLeadTimeStdDev, setSimLeadTimeStdDev] = useState("1.1")
  const [simSeasonality, setSimSeasonality] = useState("1.45")
  const [simServiceLevel, setSimServiceLevel] = useState("98")
  const [simOrderingCost, setSimOrderingCost] = useState("1500")
  const [simHoldingCost, setSimHoldingCost] = useState("120")

  useEffect(() => {
    const refresh = () => setState({ ...enterpriseInventoryService.getState() })
    window.addEventListener("sunum-inventory-change", refresh)
    return () => window.removeEventListener("sunum-inventory-change", refresh)
  }, [])

  const ropSimulationResult = useMemo(() => {
    return calculateDynamicReorderPoint({
      avgDailyDemand: Math.max(1, Number(simDailyDemand) || 50),
      demandStdDev: Math.max(0, Number(simDemandStdDev) || 10),
      leadTimeDays: Math.max(1, Number(simLeadTimeDays) || 4),
      leadTimeStdDevDays: Math.max(0, Number(simLeadTimeStdDev) || 0.5),
      seasonalityIndex: Math.max(0.5, Number(simSeasonality) || 1.0),
      serviceLevelPercent: Number(simServiceLevel) || 98,
      orderingCostTry: Math.max(100, Number(simOrderingCost) || 1500),
      holdingCostPerUnitYearTry: Math.max(10, Number(simHoldingCost) || 120)
    })
  }, [
    simDailyDemand,
    simDemandStdDev,
    simLeadTimeDays,
    simLeadTimeStdDev,
    simSeasonality,
    simServiceLevel,
    simOrderingCost,
    simHoldingCost
  ])

  const kpiStats = useMemo(() => {
    const policies = state.reorderPolicies || []
    const requisitions = state.purchaseRequisitions || []
    const consignments = state.consignmentStocks || []

    const criticalCount = policies.filter(
      p => p.status === "CRITICAL_BELOW_SAFETY" || p.status === "REORDER_TRIGGERED"
    ).length
    const pendingPrValue = requisitions
      .filter(r => r.status !== "APPROVED_PO_SENT")
      .reduce((s, r) => s + (r.totalEstimatedTry || 0), 0)
    const totalConsignmentUnits = consignments.reduce(
      (s, c) => s + (c.availableConsignQty || 0),
      0
    )
    const unbilledConsignmentTry = consignments.reduce(
        (s, c) => s + (c.unbilledPayableTry || 0),
        0
      )
    return {
      criticalCount,
      pendingPrValue,
      totalConsignmentUnits,
      unbilledConsignmentTry
    }
  }, [state.reorderPolicies, state.purchaseRequisitions, state.consignmentStocks])

  const handleApprovePr = (reqId: string) => {
    const approved = enterpriseInventoryService.approvePurchaseRequisition(reqId)
    if (approved) {
      setState({ ...enterpriseInventoryService.getState() })
      toast.success(`${approved.reqNo} Satın Alma Talebi Onaylandı ve PO İletildi!`, {
        description: `${approved.supplierName} firmasına ${approved.orderQty} ${approved.unit} sipariş geçildi.`
      })
    }
  }

  const handleConsignmentAction = (consignId: string, consumeQty = 0) => {
    const updated = enterpriseInventoryService.settleConsignmentStock(consignId, consumeQty)
    if (updated) {
      setState({ ...enterpriseInventoryService.getState() })
      if (consumeQty > 0) {
        toast.info(`${consumeQty} ${updated.unit} Konsinye Stok Tüketildi`, {
          description: `Mülkiyet devri gerçekleşti ve hakediş borcuna ₺${(
            consumeQty * updated.agreedUnitCostTry
          ).toLocaleString("tr-TR")} eklendi.`
        })
      } else {
        toast.success(`${updated.agreementNo} Konsinye Hakediş Mutabakatı Kapatıldı!`, {
          description: `${updated.supplierName} cari hesabına kendi kendine faturalama (Self-Billing) fişi işlendi.`
        })
      }
    }
  }

  return (
    <div className="space-y-6 p-6">
      {/* Üst Başlık */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <Badge className="bg-amber-600 text-white hover:bg-amber-700">
              Faz 3 • Akıllı Satın Alma, Tedarik & Konsinye Yönetimi
            </Badge>
            <Badge variant="outline" className="border-indigo-300 text-indigo-700 bg-indigo-50">
              Mevsimsel Dinamik ROP & VMI Konsinye Aktif
            </Badge>
          </div>
          <h1 className="mt-2 text-2xl font-bold tracking-tight text-slate-900">
            Dinamik Yeniden Sipariş Noktası (ROP), Otomatik Satın Alma & Konsinye (Emanet) Merkezi
          </h1>
          <p className="text-sm text-slate-600">
            Geçmiş talep, mevsimsellik katsayısı, tedarik süresi varyansı ve Z-skoru güvenlik stoğuna göre otomatik satın alma talebi (Auto-PR) ve tedarikçi mülkiyetli konsinye stok yönetimi.
          </p>
        </div>
      </div>

      {/* KPI Kartları */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card className="border-slate-200">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-slate-500">ROP Altı Kritik Stok Kartı</span>
              <AlertTriangle className="h-4 w-4 text-rose-600" />
            </div>
            <div className="mt-2 text-2xl font-bold text-rose-600">
              {kpiStats.criticalCount} SKU
            </div>
            <p className="mt-1 text-xs text-slate-500">
              Yeniden sipariş noktası (ROP) tetiklendi
            </p>
          </CardContent>
        </Card>

        <Card className="border-slate-200">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-slate-500">Otomatik Satın Alma Talepleri</span>
              <BellRing className="h-4 w-4 text-amber-600" />
            </div>
            <div className="mt-2 text-2xl font-bold text-slate-900">
              ₺{kpiStats.pendingPrValue.toLocaleString("tr-TR")}
            </div>
            <p className="mt-1 text-xs text-amber-700 font-medium">
              Onay bekleyen Auto-PR / PO hacmi
            </p>
          </CardContent>
        </Card>

        <Card className="border-slate-200">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-slate-500">Depodaki Konsinye (Emanet) Stok</span>
              <Handshake className="h-4 w-4 text-indigo-600" />
            </div>
            <div className="mt-2 text-2xl font-bold text-slate-900">
              {kpiStats.totalConsignmentUnits.toLocaleString("tr-TR")} Birim
            </div>
            <p className="mt-1 text-xs text-indigo-600 font-medium">
              Tedarikçi mülkiyetinde (Bilanço dışı)
            </p>
          </CardContent>
        </Card>

        <Card className="border-slate-200">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-slate-500">Faturalanmamış Konsinye Hakedişi</span>
              <FileCheck2 className="h-4 w-4 text-emerald-600" />
            </div>
            <div className="mt-2 text-2xl font-bold text-emerald-700">
              ₺{kpiStats.unbilledConsignmentTry.toLocaleString("tr-TR")}
            </div>
            <p className="mt-1 text-xs text-slate-500">
              Satılan/tüketilen emanet stok borcu
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Faz 3 Sekmeleri */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="flex flex-wrap h-auto gap-1 bg-slate-100 p-1">
          <TabsTrigger value="rop-engine" className="gap-1.5 text-xs sm:text-sm">
            <Calculator className="h-4 w-4" />
            1. Dinamik ROP, Mevsimsellik & Güvenlik Stoğu Motoru
          </TabsTrigger>
          <TabsTrigger value="auto-pr" className="gap-1.5 text-xs sm:text-sm">
            <BellRing className="h-4 w-4" />
            2. Kritik Stok Bildirimleri & Otomatik Satın Alma Talepleri
          </TabsTrigger>
          <TabsTrigger value="consignment" className="gap-1.5 text-xs sm:text-sm">
            <Handshake className="h-4 w-4" />
            3. Tedarikçi Konsinye (Emanet / VMI) Stok & Hakediş
          </TabsTrigger>
        </TabsList>

        {/* 1. SEKME: DİNAMİK ROP VE GÜVENLİK STOĞU ALGORİTMASI */}
        <TabsContent value="rop-engine" className="space-y-6">
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
            {/* Sol: Algoritma Simülatörü */}
            <Card className="border-indigo-200 bg-indigo-50/20 lg:col-span-5">
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <Calculator className="h-4 w-4 text-indigo-600" />
                  Mevsimsel ROP & Güvenlik Stoğu Algoritma Simülatörü
                </CardTitle>
                <CardDescription>
                  Talep dalgalanması, tedarik süresi sapması ve mevsimsellik katsayısına göre Z-skoru tabanlı hesaplama.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label className="text-xs">Günlük Ortalama Talep (Adet)</Label>
                    <Input
                      type="number"
                      value={simDailyDemand}
                      onChange={e => setSimDailyDemand(e.target.value)}
                      className="mt-1 bg-white h-8 text-xs"
                    />
                  </div>
                  <div>
                    <Label className="text-xs">Talep Standart Sapması (σ_D)</Label>
                    <Input
                      type="number"
                      value={simDemandStdDev}
                      onChange={e => setSimDemandStdDev(e.target.value)}
                      className="mt-1 bg-white h-8 text-xs"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label className="text-xs">Tedarik Süresi (Lead Time Gün)</Label>
                    <Input
                      type="number"
                      value={simLeadTimeDays}
                      onChange={e => setSimLeadTimeDays(e.target.value)}
                      className="mt-1 bg-white h-8 text-xs"
                    />
                  </div>
                  <div>
                    <Label className="text-xs">Tedarik Süresi Sapması (σ_L Gün)</Label>
                    <Input
                      type="number"
                      step="0.1"
                      value={simLeadTimeStdDev}
                      onChange={e => setSimLeadTimeStdDev(e.target.value)}
                      className="mt-1 bg-white h-8 text-xs"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label className="text-xs">Mevsimsellik İndeksi (Örn: 1.45)</Label>
                    <Input
                      type="number"
                      step="0.05"
                      value={simSeasonality}
                      onChange={e => setSimSeasonality(e.target.value)}
                      className="mt-1 bg-white h-8 text-xs"
                    />
                  </div>
                  <div>
                    <Label className="text-xs">Hedef Hizmet Seviyesi (Service Level)</Label>
                    <Select value={simServiceLevel} onValueChange={setSimServiceLevel}>
                      <SelectTrigger className="mt-1 bg-white h-8 text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="90">%90 (Z = 1.28)</SelectItem>
                        <SelectItem value="95">%95 (Z = 1.65)</SelectItem>
                        <SelectItem value="98">%98 (Z = 2.05)</SelectItem>
                        <SelectItem value="99">%99 (Z = 2.33)</SelectItem>
                        <SelectItem value="99.9">%99.9 (Z = 3.09)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="rounded-xl bg-slate-900 text-white p-4 space-y-2.5">
                  <div className="flex items-center justify-between text-xs text-slate-400">
                    <span>HESAPLANAN OPTİMUM PARAMETRELER</span>
                    <Badge className="bg-emerald-500 text-slate-950 font-bold">
                      Z = {ropSimulationResult.zScore}
                    </Badge>
                  </div>
                  <div className="grid grid-cols-3 gap-2 pt-1">
                    <div className="rounded bg-slate-800 p-2.5">
                      <span className="text-[10px] text-slate-400 block">Güvenlik Stoğu</span>
                      <span className="text-lg font-bold text-amber-400">
                        {ropSimulationResult.safetyStock} Adet
                      </span>
                    </div>
                    <div className="rounded bg-slate-800 p-2.5">
                      <span className="text-[10px] text-slate-400 block">Sipariş Noktası (ROP)</span>
                      <span className="text-lg font-bold text-emerald-400">
                        {ropSimulationResult.reorderPoint} Adet
                      </span>
                    </div>
                    <div className="rounded bg-slate-800 p-2.5">
                      <span className="text-[10px] text-slate-400 block">Ekonomik Sipariş (EOQ)</span>
                      <span className="text-lg font-bold text-cyan-400">
                        {ropSimulationResult.economicOrderQty} Adet
                      </span>
                    </div>
                  </div>
                  <div className="text-[11px] font-mono text-slate-300 pt-1 border-t border-slate-800">
                    {ropSimulationResult.formulaSummary}
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Sağ: Aktif SKU Yeniden Sipariş Politikaları Tablosu */}
            <Card className="border-slate-200 lg:col-span-7">
              <CardHeader>
                <CardTitle className="text-base">
                  Aktif Stok Kartları Yeniden Sipariş (ROP) ve Güvenlik Stoğu Matrisi
                </CardTitle>
                <CardDescription>
                  Eldeki net stok ROP seviyesinin altına düştüğünde sistem otomatik olarak düşük stok uyarısı ve satın alma talebi tetikler.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto rounded-lg border border-slate-200">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-50 uppercase text-slate-600 border-b">
                      <tr>
                        <th className="p-2.5">SKU & Ürün</th>
                        <th className="p-2.5 text-right">Mevsimsellik</th>
                        <th className="p-2.5 text-right">Güvenlik Stoğu</th>
                        <th className="p-2.5 text-right">ROP Noktası</th>
                        <th className="p-2.5 text-right">Mevcut ATP</th>
                        <th className="p-2.5">Durum & Öneri</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200">
                        {(state.reorderPolicies || []).map(pol => (
                          <tr key={pol.id} className="hover:bg-slate-50">
                            <td className="p-2.5">
                              <div className="font-semibold text-slate-900">{pol.itemName}</div>
                              <div className="font-mono text-[11px] text-slate-500">
                                {pol.sku} • Tedarik: {pol.leadTimeDays} Gün
                              </div>
                            </td>
                            <td className="p-2.5 text-right">
                              <Badge variant="outline">×{pol.seasonalityIndex}</Badge>
                              <div className="text-[10px] text-slate-500 mt-0.5">
                                {pol.seasonalityLabel}
                              </div>
                            </td>
                            <td className="p-2.5 text-right font-semibold text-amber-700">
                              {pol.safetyStockQty} Adet
                            </td>
                            <td className="p-2.5 text-right font-bold text-indigo-700">
                              {pol.reorderPointQty} Adet
                            </td>
                            <td className="p-2.5 text-right font-bold text-slate-900">
                              {pol.currentAvailableQty} Adet
                            </td>
                            <td className="p-2.5">
                              <Badge
                                className={
                                  pol.status === "CRITICAL_BELOW_SAFETY"
                                    ? "bg-rose-600 text-white"
                                    : pol.status === "REORDER_TRIGGERED"
                                      ? "bg-amber-500 text-white"
                                      : "bg-emerald-600 text-white"
                                }
                              >
                                {pol.status === "CRITICAL_BELOW_SAFETY"
                                  ? `KRİTİK • +${pol.recommendedOrderQty} Sipariş Ver`
                                  : pol.status === "REORDER_TRIGGERED"
                                    ? `ROP TETİKLENDİ • +${pol.recommendedOrderQty}`
                                    : "GÜVENLİ SEVİYE"}
                              </Badge>
                            </td>
                          </tr>
                        ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* 2. SEKME: OTOMATİK DÜŞÜK STOK BİLDİRİMLERİ VE SATIN ALMA TALEPLERİ */}
        <TabsContent value="auto-pr" className="space-y-6">
          <Card className="border-slate-200">
            <CardHeader>
              <CardTitle className="text-base">
                Otomatik Düşük Stok Uyarıları & Satın Alma Talepleri (Auto-Purchase Requisitions)
              </CardTitle>
              <CardDescription>
                ROP algoritması tarafından oluşturulan satın alma taleplerini tek tıkla onaylayarak tedarikçiye resmi PO (Sipariş Mektubu) olarak iletin.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
                {(state.purchaseRequisitions || []).map(req => (
                  <div
                    key={req.id}
                    className={`rounded-xl border p-4 transition-all ${req.status === "APPROVED_PO_SENT"
                        ? "border-emerald-200 bg-emerald-50/20"
                        : req.urgency === "CRITICAL"
                          ? "border-rose-300 bg-rose-50/20"
                          : "border-amber-200 bg-white"
                      }`}
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-sm font-bold text-slate-900">
                          {req.reqNo}
                        </span>
                        <Badge
                          className={
                            req.urgency === "CRITICAL"
                              ? "bg-rose-600 text-white"
                              : "bg-amber-500 text-white"
                          }
                        >
                          {req.urgency === "CRITICAL" ? "ACİL KRİTİK STOK UYARISI" : "ROP DÜŞÜK STOK UYARISI"}
                        </Badge>
                        <Badge variant="outline" className="font-mono text-xs">
                          {req.warehouseCode}
                        </Badge>
                      </div>

                      <div className="flex items-center gap-2">
                        {req.status === "APPROVED_PO_SENT" ? (
                          <Badge className="bg-emerald-600 text-white gap-1">
                            <CheckCircle2 className="h-3.5 w-3.5" />
                            PO ONAYLANDI VE TEDARİKÇİYE İLETİLDİ
                          </Badge>
                        ) : (
                          <Button
                            size="sm"
                            onClick={() => handleApprovePr(req.id)}
                            className="bg-emerald-600 hover:bg-emerald-700 text-white gap-1.5 text-xs"
                          >
                            <ShoppingCart className="h-3.5 w-3.5" />
                            Satın Alma Talebini Onayla & PO Gönder
                          </Button>
                        )}
                      </div>
                    </div>

                    <div className="mt-3 grid grid-cols-1 gap-3 md:grid-cols-4 text-xs">
                      <div>
                        <span className="text-slate-500 block">Stok Kartı</span>
                        <strong className="text-slate-900 text-sm">{req.itemName}</strong>
                        <div className="font-mono text-slate-500">{req.sku}</div>
                      </div>
                      <div>
                        <span className="text-slate-500 block">Önerilen Tedarikçi</span>
                        <strong className="text-indigo-700 text-sm">{req.supplierName}</strong>
                        <div className="text-slate-500">Teslimat: {req.expectedDeliveryDate}</div>
                      </div>
                      <div>
                        <span className="text-slate-500 block">Önerilen Sipariş Miktarı</span>
                        <strong className="text-emerald-700 text-sm">
                          {req.orderQty.toLocaleString("tr-TR")} {req.unit}
                        </strong>
                        <div className="text-slate-500">
                          Birim: ₺{req.estimatedUnitCostTry.toLocaleString("tr-TR")}
                        </div>
                      </div>
                      <div>
                        <span className="text-slate-500 block">Tahmini Sipariş Tutarı</span>
                        <strong className="text-slate-900 text-base">
                          ₺{req.totalEstimatedTry.toLocaleString("tr-TR")}
                        </strong>
                      </div>
                    </div>

                    <div className="mt-3 rounded bg-slate-100 px-3 py-2 text-xs text-slate-700">
                      <strong>Algoritma Tetikleme Gerekçesi:</strong> {req.triggerReason}
                    </div>
                  </div>
                ))}
            </CardContent>
          </Card>
        </TabsContent>

        {/* 3. SEKME: TEDARİKÇİ KONSİNYE (EMANET) STOK TAKİBİ VE HAKEDİŞ */}
        <TabsContent value="consignment" className="space-y-6">
          <Card className="border-slate-200">
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Handshake className="h-4 w-4 text-indigo-600" />
                Tedarikçi Mülkiyetli Konsinye (Emanet / VMI) Stok Takibi ve Hakediş Mutabakatı
              </CardTitle>
              <CardDescription>
                Fiziksel olarak depolarımızda bulunan ancak satılana veya üretimde kullanılana kadar mülkiyeti tedarikçiye ait olan emanet stoklar.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
                {(state.consignmentStocks || []).map(con => (
                  <div
                    key={con.id}
                    className="rounded-xl border border-slate-200 p-4 space-y-3 hover:border-indigo-200 transition-all"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <Badge className="bg-indigo-600 text-white font-mono">
                          {con.agreementNo}
                        </Badge>
                        <span className="font-semibold text-sm text-slate-900">
                          {con.supplierName}
                        </span>
                        <Badge variant="outline" className="font-mono text-xs">
                          {con.warehouseName} ({con.binCode})
                        </Badge>
                      </div>
                      <Badge
                        className={
                          con.status === "SETTLED"
                            ? "bg-emerald-100 text-emerald-800"
                            : con.status === "SETTLEMENT_READY"
                              ? "bg-amber-100 text-amber-800"
                              : "bg-blue-100 text-blue-800"
                        }
                      >
                        {con.status === "SETTLED"
                          ? "MUTABAKAT KAPATILDI"
                          : con.status === "SETTLEMENT_READY"
                            ? "HAKEDİŞ FATURASI BEKLİYOR"
                            : "AKTİF KONSİNYE HAVUZU"}
                      </Badge>
                    </div>

                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-5 text-xs bg-slate-50 p-3 rounded-lg border border-slate-100">
                      <div className="sm:col-span-2">
                        <span className="text-slate-500 block">Konsinye Ürün & Lot</span>
                        <strong className="text-slate-900 text-sm">{con.itemName}</strong>
                        <div className="font-mono text-slate-500">
                          {con.sku} • Lot: {con.lotNumber}
                        </div>
                      </div>
                      <div>
                        <span className="text-slate-500 block">Kalan Emanet Stok</span>
                        <strong className="text-indigo-700 text-base">
                          {con.availableConsignQty} / {con.vendorOwnedTotalQty} {con.unit}
                        </strong>
                      </div>
                      <div>
                        <span className="text-slate-500 block">Tüketilen / Satılan</span>
                        <strong className="text-amber-700 text-base">
                          {con.consumedOrSoldQty} {con.unit}
                        </strong>
                      </div>
                      <div>
                        <span className="text-slate-500 block">Ödenecek Hakediş Tutarı</span>
                        <strong className="text-emerald-700 text-base">
                          ₺{con.unbilledPayableTry.toLocaleString("tr-TR")}
                        </strong>
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
                      <span className="text-xs text-slate-500">
                        Birim Anlaşma Maliyeti: <strong>₺{con.agreedUnitCostTry}</strong> • Son Mutabakat: <strong>{con.lastSettlementDate}</strong>
                      </span>
                      <div className="flex items-center gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleConsignmentAction(con.id, 10)}
                          className="h-8 text-xs"
                        >
                          +10 {con.unit} Konsinye Tüket (Mülkiyet Devri)
                        </Button>
                        <Button
                          size="sm"
                          disabled={con.unbilledPayableTry === 0}
                          onClick={() => handleConsignmentAction(con.id, 0)}
                          className="h-8 text-xs bg-indigo-600 hover:bg-indigo-700 text-white"
                        >
                          Hakediş Mutabakatı Yap & Fatura Kapat
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}

