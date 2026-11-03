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
  ArrowRight,
  Plus,
  Check,
  SlidersHorizontal,
  ChevronRight,
  Info
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
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle
} from "@/components/ui/sheet"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger
} from "@/components/ui/tooltip"
import { toast } from "sonner"
import {
  enterpriseInventoryService,
  calculateDynamicReorderPoint
} from "@/lib/services/enterpriseInventorySuite"
import type { PurchaseRequisitionRecord, ConsignmentStockRecord } from "@/lib/services/procurementReorderEngine"

export default function SmartProcurementAndConsignmentPage() {
  const [state, setState] = useState(() => enterpriseInventoryService.getState())
  const [activeTab, setActiveTab] = useState("auto-pr")

  // Canlı ROP & Güvenlik Stoğu Algoritma Parametreleri
  const [simDailyDemand, setSimDailyDemand] = useState("68")
  const [simDemandStdDev, setSimDemandStdDev] = useState("16")
  const [simLeadTimeDays, setSimLeadTimeDays] = useState("4")
  const [simLeadTimeStdDev, setSimLeadTimeStdDev] = useState("1.1")
  const [simSeasonality, setSimSeasonality] = useState("1.45")
  const [simServiceLevel, setSimServiceLevel] = useState("98")
  const [simOrderingCost, setSimOrderingCost] = useState("1500")
  const [simHoldingCost, setSimHoldingCost] = useState("120")

  // Çekmece (Drawer) Seçili Kalem
  const [selectedReqForDrawer, setSelectedReqForDrawer] = useState<PurchaseRequisitionRecord | null>(null)
  const [isReqDrawerOpen, setIsReqDrawerOpen] = useState(false)

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
    const pendingPrCount = requisitions.filter(r => r.status !== "APPROVED_PO_SENT").length
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
    pendingPrCount,
    totalConsignmentUnits,
    unbilledConsignmentTry
  }
}, [state.reorderPolicies, state.purchaseRequisitions, state.consignmentStocks])

const handleApprovePr = (reqId: string) => {
  const approved = enterpriseInventoryService.approvePurchaseRequisition(reqId)
  if (approved) {
    setState({ ...enterpriseInventoryService.getState() })
      toast.success(`${approved.reqNo} Satın Alma Talebi Onaylandı!`, {
        description: `${approved.supplierName} firmasına ${approved.orderQty} ${approved.unit} sipariş emri iletildi.`
      })
    }
  }

  const handleApproveAllPending = () => {
    const pending = (state.purchaseRequisitions || []).filter(r => r.status !== "APPROVED_PO_SENT")
    for (const req of pending) {
      enterpriseInventoryService.approvePurchaseRequisition(req.id)
    }
    setState({ ...enterpriseInventoryService.getState() })
    toast.success("Tüm Bekleyen Satın Alma Talepleri Onaylandı!", {
      description: `${pending.length} adet tedarikçiye resmi sipariş emri gönderildi.`
    })
  }

  const handleConsignmentAction = (consignId: string, consumeQty = 0) => {
    const updated = enterpriseInventoryService.settleConsignmentStock(consignId, consumeQty)
    if (updated) {
      setState({ ...enterpriseInventoryService.getState() })
      if (consumeQty > 0) {
        toast.info(`${consumeQty} ${updated.unit} Konsinye Stok Tüketildi`, {
            description: `Mülkiyet devri gerçekleşti. Hakediş borcuna ₺${(
              consumeQty * updated.agreedUnitCostTry
          ).toLocaleString("tr-TR")
      } eklendi.`
        })
      } else {
        toast.success(`${ updated.agreementNo } Konsinye Hakedişi Kapatıldı!`, {
          description: `${ updated.supplierName } cari hesabına otomatik faturalama fişi işlendi.`
        })
      }
    }
  }

  return (
    <TooltipProvider>
      <div className="space-y-6 p-4 sm:p-6 max-w-7xl mx-auto">
        {/* 1. ÜST AI TAVSİYE BARI */}
        <div className="rounded-xl border border-amber-200 bg-gradient-to-r from-amber-50/80 via-orange-50/40 to-white p-4 sm:p-5 shadow-sm">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-start gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-amber-600 text-white shadow">
                <Sparkles className="h-5 w-5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-base font-semibold text-slate-900">Yapay Zekâ Satın Alma & Sipariş Önerisi</h2>
                  <Badge variant="outline" className="border-amber-300 bg-white text-amber-800 text-xs font-medium">
                    Otomatik Tedarik (Auto-PR)
                  </Badge>
                </div>
                <p className="mt-1 text-sm text-slate-600">
                  {kpiStats.criticalCount > 0 ? (
                    <>
                      <span className="font-semibold text-slate-900">{kpiStats.criticalCount} ürün kritik sipariş eşiğinin (ROP) altına indi.</span> Toplam <span className="font-semibold text-slate-900">₺{kpiStats.pendingPrValue.toLocaleString("tr-TR")}</span> tutarında hazır tedarik talebi onayınızı bekliyor.
                    </>
                  ) : (
                    "Tüm stok seviyeleriniz sağlıklı ve güvenlik tampon stoğunun üzerinde seyrediyor."
                  )}
                </p>
              </div>
            </div>
            {kpiStats.pendingPrCount > 0 && (
              <Button
                onClick={handleApproveAllPending}
                className="bg-amber-600 hover:bg-amber-700 text-white shadow-sm text-xs h-9 shrink-0 gap-1.5"
              >
                <Check className="h-4 w-4" />
                Tümünü Tek Tıkla Onayla ({kpiStats.pendingPrCount})
              </Button>
            )}
          </div>
        </div>

        {/* 2. BAŞLIK */}
        <div className="flex flex-col gap-2 border-b pb-4">
          <div className="flex items-center gap-2">
            <ShoppingCart className="h-6 w-6 text-amber-600" />
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900">
              Satın Alma, Tedarik & Konsinye Yönetimi
            </h1>
          </div>
          <p className="text-sm text-slate-500">
            Kritik stok seviyesine düşen ürünlerin otomatik sipariş süreçleri ve tedarikçi emanet (konsinye) stok mutabakatı.
          </p>
        </div>

        {/* 3. DÖRT BASİT METRİK KARTI */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          <Card className={`border - slate - 200 / 80 shadow - xs ${ kpiStats.criticalCount > 0 ? "bg-rose-50/40 border-rose-200" : "" } `}>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-slate-500">Kritik Sipariş Eşiği (ROP)</span>
                <AlertTriangle className={`h - 4 w - 4 ${ kpiStats.criticalCount > 0 ? "text-rose-600" : "text-slate-400" } `} />
              </div>
              <div className="mt-2 flex items-baseline gap-2">
                <span className={`text - 2xl font - bold ${ kpiStats.criticalCount > 0 ? "text-rose-700" : "text-slate-900" } `}>
                  {kpiStats.criticalCount}
                </span>
                <span className="text-xs text-slate-500">Ürün Azaldı</span>
              </div>
              <p className="mt-1 text-xs text-slate-500">Sipariş verilmeli</p>
            </CardContent>
          </Card>

          <Card className="border-slate-200/80 shadow-xs">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-slate-500">Onay Bekleyen Talepler</span>
                <BellRing className="h-4 w-4 text-amber-600" />
              </div>
              <div className="mt-2 flex items-baseline gap-2">
                <span className="text-2xl font-bold text-slate-900">
                  ₺{kpiStats.pendingPrValue.toLocaleString("tr-TR")}
                </span>
              </div>
              <p className="mt-1 text-xs text-slate-500">
                {kpiStats.pendingPrCount} adet satın alma emri
              </p>
            </CardContent>
          </Card>

          <Card className="border-slate-200/80 shadow-xs">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-slate-500">Konsinye (Emanet) Stok</span>
                <Handshake className="h-4 w-4 text-indigo-600" />
              </div>
              <div className="mt-2 flex items-baseline gap-2">
                <span className="text-2xl font-bold text-slate-900">
                  {kpiStats.totalConsignmentUnits.toLocaleString("tr-TR")}
                </span>
                <span className="text-xs text-slate-500">Adet Depoda</span>
              </div>
              <p className="mt-1 text-xs text-slate-500">Tedarikçi mülkiyetinde</p>
            </CardContent>
          </Card>

          <Card className="border-slate-200/80 shadow-xs">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-slate-500">Konsinye Hakediş Borcu</span>
                <FileCheck2 className="h-4 w-4 text-emerald-600" />
              </div>
              <div className="mt-2 flex items-baseline gap-2">
                <span className="text-2xl font-bold text-emerald-700">
                  ₺{kpiStats.unbilledConsignmentTry.toLocaleString("tr-TR")}
                </span>
              </div>
              <p className="mt-1 text-xs text-slate-500">Kullanılan emanet stoklar</p>
            </CardContent>
          </Card>
        </div>

        {/* 4. MODÜL SEKMELERİ */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
          <TabsList className="bg-slate-100 p-1">
            <TabsTrigger value="auto-pr" className="text-xs sm:text-sm gap-1.5">
              <BellRing className="h-4 w-4" />
              Otomatik Satın Alma Talepleri ({state.purchaseRequisitions.length})
            </TabsTrigger>
            <TabsTrigger value="consignment" className="text-xs sm:text-sm gap-1.5">
              <Handshake className="h-4 w-4" />
              Konsinye (Emanet) Stok Mutabakatı
            </TabsTrigger>
            <TabsTrigger value="rop-engine" className="text-xs sm:text-sm gap-1.5">
              <Calculator className="h-4 w-4" />
              Akıllı ROP & Güvenlik Stoğu Simülatörü
            </TabsTrigger>
          </TabsList>

          {/* TAB 1: SATIN ALMA TALEPLERİ LİSTESİ */}
          <TabsContent value="auto-pr" className="space-y-4">
            <div className="rounded-xl border border-slate-200 bg-white overflow-hidden shadow-xs">
              <table className="w-full text-sm text-left">
                <thead className="bg-slate-50 text-xs uppercase text-slate-500 border-b">
                  <tr>
                    <th className="px-4 py-3 font-semibold">Talep No & Tarih</th>
                    <th className="px-4 py-3 font-semibold">Tedarik Edilecek Ürün</th>
                    <th className="px-4 py-3 font-semibold">Tedarikçi</th>
                    <th className="px-4 py-3 font-semibold text-right">Sipariş Miktarı</th>
                    <th className="px-4 py-3 font-semibold text-right">Tahmini Tutar</th>
                    <th className="px-4 py-3 font-semibold text-center">Durum</th>
                    <th className="px-4 py-3 font-semibold text-right">İşlem</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {state.purchaseRequisitions.map(req => {
                    const isApproved = req.status === "APPROVED_PO_SENT"

                    return (
                      <tr key={req.id} className="hover:bg-slate-50/70 transition-colors">
                        <td className="px-4 py-3.5">
                          <span className="font-mono font-bold text-xs text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded">
                            {req.reqNo}
                          </span>
                          <div className="text-[11px] text-slate-400 mt-1">{req.createdAt}</div>
                        </td>

                        <td className="px-4 py-3.5">
                          <div className="font-semibold text-slate-900">{req.itemName}</div>
                          <div className="font-mono text-xs text-slate-400">{req.sku}</div>
                        </td>

                        <td className="px-4 py-3.5 text-xs text-slate-700">
                          <div className="font-medium text-slate-800">{req.supplierName}</div>
                          <div className="text-[11px] text-slate-400">Teslim: {req.expectedDeliveryDate}</div>
                        </td>

                        <td className="px-4 py-3.5 text-right font-bold text-slate-900">
                          {req.orderQty} {req.unit}
                        </td>

                        <td className="px-4 py-3.5 text-right font-bold text-slate-900">
                          ₺{req.totalEstimatedTry.toLocaleString("tr-TR")}
                        </td>

                        <td className="px-4 py-3.5 text-center">
                          {isApproved ? (
                            <Badge className="bg-emerald-100 text-emerald-800 text-[11px] gap-1">
                              <CheckCircle2 className="h-3 w-3" />
                              Sipariş Gönderildi
                            </Badge>
                          ) : (
                            <Badge variant="outline" className="border-amber-300 bg-amber-50 text-amber-800 text-[11px]">
                              Onay Bekliyor
                            </Badge>
                          )}
                        </td>

                        <td className="px-4 py-3.5 text-right">
                          {!isApproved ? (
                            <Button
                              size="sm"
                              onClick={() => handleApprovePr(req.id)}
                              className="bg-indigo-600 hover:bg-indigo-700 text-white text-xs h-8 gap-1"
                            >
                              <Check className="h-3.5 w-3.5" />
                              Onayla & PO İlet
                            </Button>
                          ) : (
                            <span className="text-xs text-slate-400 font-mono">PO Tamam</span>
                          )}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </TabsContent>

          {/* TAB 2: TEDARİKÇİ KONSİNYE (EMANET) STOK MUTABAKATI */}
          <TabsContent value="consignment" className="space-y-4">
            <div className="bg-indigo-50/50 p-4 rounded-xl border border-indigo-100 flex items-start gap-3">
              <Info className="h-5 w-5 text-indigo-600 shrink-0 mt-0.5" />
              <div className="text-xs text-slate-700 leading-relaxed">
                <strong>Konsinye (Emanet) Stok Nedir?</strong> Mülkiyeti tedarikçinizde kalan ancak sizin deponuzda fiziki olarak bulunan ürünlerdir. Ürünü müşteriye sattığınızda veya üretimde kullandığınızda ödemesini yaparsınız; bu sayede şirketiniz sıfır finansman riskiyle geniş stok tutabilir.
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {state.consignmentStocks.map(consign => (
                <Card key={consign.id} className="border-slate-200">
                  <CardHeader className="pb-3 border-b">
                    <div className="flex items-center justify-between">
                      <span className="font-mono text-xs font-bold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded">
                        {consign.agreementNo}
                      </span>
                      <Badge variant="outline" className="text-xs">
                        {consign.status === "SETTLED" ? "Mutabakat Tamamlandı" : "Kullanıma Açık"}
                      </Badge>
                    </div>
                    <CardTitle className="text-base text-slate-900 mt-2">
                      {consign.itemName}
                    </CardTitle>
                    <CardDescription className="text-xs font-mono">
                      {consign.sku} • Tedarikçi: <strong>{consign.supplierName}</strong>
                    </CardDescription>
                  </CardHeader>

                  <CardContent className="pt-3 space-y-3">
                    <div className="grid grid-cols-3 gap-2 bg-slate-50 p-2.5 rounded-lg text-center text-xs">
                      <div>
                        <span className="text-slate-400 block text-[10px]">Depodaki Emanet</span>
                        <span className="font-bold text-slate-900 text-sm">
                          {consign.availableConsignQty} {consign.unit}
                        </span>
                      </div>
                      <div>
                        <span className="text-slate-400 block text-[10px]">Kullanılan/Satılan</span>
                        <span className="font-bold text-amber-700 text-sm">
                          {consign.consumedOrSoldQty} {consign.unit}
                        </span>
                      </div>
                      <div>
                        <span className="text-slate-400 block text-[10px]">Bekleyen Borç</span>
                        <span className="font-bold text-emerald-700 text-sm">
                          ₺{consign.unbilledPayableTry.toLocaleString("tr-TR")}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center justify-between text-xs text-slate-500">
                      <span>Anlaşılan Birim Fiyat: <strong>₺{consign.agreedUnitCostTry}</strong></span>
                      <span>Son Mutabakat: {consign.lastSettlementDate}</span>
                    </div>

                    <div className="pt-2 flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleConsignmentAction(consign.id, 10)}
                        className="flex-1 text-xs"
                      >
                        10 Adet Tüketim İşle
                      </Button>
                      <Button
                        size="sm"
                        onClick={() => handleConsignmentAction(consign.id, 0)}
                        className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white text-xs"
                      >
                        Hakedişi Kapat & Fiş Kes
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>

          {/* TAB 3: DİNAMİK ROP & GÜVENLİK STOĞU MOTORU */}
          <TabsContent value="rop-engine" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              {/* Sol: Parametreler */}
              <Card className="border-slate-200 lg:col-span-6">
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2">
                    <Calculator className="h-4 w-4 text-indigo-600" />
                    ROP Algoritma Parametreleri
                  </CardTitle>
                  <CardDescription>
                    Talep değişkenliği, tedarik gecikmeleri ve mevsimsellik katsayısına göre anlık hesaplama.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <Label className="text-xs">Günlük Ortalama Talep</Label>
                      <Input
                        type="number"
                        value={simDailyDemand}
                        onChange={e => setSimDailyDemand(e.target.value)}
                        className="mt-1"
                      />
                    </div>
                    <div>
                      <Label className="text-xs">Talep Standart Sapması</Label>
                      <Input
                        type="number"
                        value={simDemandStdDev}
                        onChange={e => setSimDemandStdDev(e.target.value)}
                        className="mt-1"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <Label className="text-xs">Tedarikçi Teslim Süresi (Gün)</Label>
                      <Input
                        type="number"
                        value={simLeadTimeDays}
                        onChange={e => setSimLeadTimeDays(e.target.value)}
                        className="mt-1"
                      />
                    </div>
                    <div>
                      <Label className="text-xs">Mevsimsellik Katsayısı</Label>
                      <Input
                        type="number"
                        step="0.05"
                        value={simSeasonality}
                        onChange={e => setSimSeasonality(e.target.value)}
                        className="mt-1"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <Label className="text-xs">Hedef Müşteri Hizmet Seviyesi (%)</Label>
                      <Select value={simServiceLevel} onValueChange={setSimServiceLevel}>
                        <SelectTrigger className="mt-1">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="90">%90 (Z = 1.28)</SelectItem>
                          <SelectItem value="95">%95 (Z = 1.65)</SelectItem>
                          <SelectItem value="98">%98 (Z = 2.05 — Önerilen)</SelectItem>
                          <SelectItem value="99">%99 (Z = 2.33 — Kritik)</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label className="text-xs">Sipariş Verme Masrafı (₺)</Label>
                      <Input
                        type="number"
                        value={simOrderingCost}
                        onChange={e => setSimOrderingCost(e.target.value)}
                        className="mt-1"
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Sağ: Sonuç Kartı */}
              <Card className="border-indigo-200 bg-indigo-50/20 lg:col-span-6 flex flex-col justify-between">
                <CardHeader>
                  <CardTitle className="text-base text-slate-900">
                    Hesaplanan Dinamik Tedarik Değerleri
                  </CardTitle>
                  <CardDescription>
                    Bu ürün için önerilen optimum satın alma stratejisi.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="bg-white p-4 rounded-xl border border-indigo-100 shadow-xs">
                      <span className="text-xs text-slate-500 block">Kritik Sipariş Eşiği (ROP)</span>
                      <span className="text-2xl font-bold text-indigo-700">
                        {ropSimulationResult.reorderPointQty} Adet
                      </span>
                      <span className="text-[11px] text-slate-400 block mt-1">
                        Stok bu adede inince sipariş verin.
                      </span>
                    </div>

                    <div className="bg-white p-4 rounded-xl border border-indigo-100 shadow-xs">
                      <span className="text-xs text-slate-500 block">Güvenlik Tampon Stoğu</span>
                      <span className="text-2xl font-bold text-emerald-700">
                        {ropSimulationResult.safetyStockQty} Adet
                      </span>
                      <span className="text-[11px] text-slate-400 block mt-1">
                        Yok satmayı önleyen acil durum stoğu.
                      </span>
                    </div>
                  </div>

                  <div className="bg-white p-4 rounded-xl border border-indigo-100 shadow-xs">
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-slate-500">Ekonomik Sipariş Miktarı (EOQ)</span>
                      <span className="text-lg font-bold text-slate-900">
                        {ropSimulationResult.economicOrderQuantity} Adet
                      </span>
                    </div>
                    <div className="text-[11px] text-slate-400 mt-1">
                      Depolama ve sipariş maliyetini minimize eden optimum parti büyüklüğü.
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </TooltipProvider>
  )
}
