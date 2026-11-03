"use client"

import React, { useState, useEffect } from "react"
import {
  Globe,
  RefreshCw,
  Split,
  RotateCcw,
  Truck,
  FileText,
  QrCode,
  CheckCircle2,
  Zap,
  Store,
  ShoppingBag,
  ArrowRight,
  Plus,
  ShieldCheck
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
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from "@/components/ui/dialog"
import { toast } from "sonner"
import { enterpriseInventoryService } from "@/lib/services/enterpriseInventorySuite"
import type { GibEDocumentRecord } from "@/lib/services/omnichannelFulfillmentEngine"

export default function OmnichannelLogisticsAndEDocumentPage() {
  const [state, setState] = useState(() => enterpriseInventoryService.getState())
  const [activeTab, setActiveTab] = useState("realtime-channels")
  const [isSyncing, setIsSyncing] = useState(false)

  // E-Fatura / E-İrsaliye Kesim Modalı
  const [isEdocModalOpen, setIsEdocModalOpen] = useState(false)
  const [docType, setDocType] = useState<"E_IRSALIYE" | "E_FATURA" | "E_ARSIV">("E_IRSALIYE")
  const [docOrderNo, setDocOrderNo] = useState("OMN-2026-9048")
  const [docReceiver, setDocReceiver] = useState("Anadolu Perakende Mağazacılık A.Ş.")
  const [docVkn, setDocVkn] = useState("1480592831")
  const [docCarrier, setDocCarrier] = useState("UPS Hızlı Paket Taşımacılığı A.Ş.")
  const [docPlate, setDocPlate] = useState("34 SNR 720")
  const [docDriver, setDocDriver] = useState("Kemal Öztürk")
  const [docNetTry, setDocNetTry] = useState("64500")
  const [selectedXmlDoc, setSelectedXmlDoc] = useState<GibEDocumentRecord | null>(null)

  useEffect(() => {
    const refresh = () => setState({ ...enterpriseInventoryService.getState() })
    window.addEventListener("sunum-inventory-change", refresh)
    return () => window.removeEventListener("sunum-inventory-change", refresh)
  }, [])

  const handleSyncAllChannels = () => {
    setIsSyncing(true)
    setTimeout(() => {
      enterpriseInventoryService.triggerOmnichannelSyncAll()
      setState({ ...enterpriseInventoryService.getState() })
      setIsSyncing(false)
      toast.success("Tüm Omnichannel Kanallarda Anlık ATP Stok Senkronizasyonu Tamamlandı!", {
        description: "Trendyol, Hepsiburada, Shopify, Amazon, B2B Portalı ve POS kasaları güncellendi."
      })
    }, 350)
  }

  const handleRmaDisposition = (
    rmaId: string,
    disposition: "RESTOCK_A_GRADE" | "QUARANTINE_REWORK"
  ) => {
    const updated = enterpriseInventoryService.processRmaInspection(rmaId, disposition)
    if (updated) {
      setState({ ...enterpriseInventoryService.getState() })
      toast.success(`${updated.rmaNo} İade Kalite Kontrol (QC) İşlemi Tamamlandı`, {
        description:
          disposition === "RESTOCK_A_GRADE"
            ? `${updated.quantity} adet ürün A-Grade olarak satılabilir ATP stoğuna geri eklendi.`
            : `${updated.quantity} adet ürün Karantina deposuna ayrıldı.`
      })
    }
  }

  const handleCreateEDocument = () => {
    const created = enterpriseInventoryService.issueGibEDocument({
      documentType: docType,
      relatedOrderNo: docOrderNo,
      receiverTitle: docReceiver,
      receiverVkn: docVkn,
      carrierName: docCarrier,
      vehiclePlate: docPlate,
      driverName: docDriver,
      totalNetTry: Number(docNetTry) || 50000
    })
    setState({ ...enterpriseInventoryService.getState() })
    setIsEdocModalOpen(false)
    setSelectedXmlDoc(created)
    toast.success(`${created.documentNo} GİB UBL-TR 2.1 Belgesi Onaylandı!`, {
      description: `ETTN: ${created.ettnUuid} • Durum: 1300 Başarıyla Tamamlandı.`
    })
  }

  return (
    <div className="space-y-6 p-6">
      {/* Üst Başlık */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <Badge className="bg-blue-600 text-white hover:bg-blue-700">
              Faz 4 • Omnichannel Satış, Lojistik, 3PL & E-Dönüşüm
            </Badge>
            <Badge variant="outline" className="border-emerald-300 text-emerald-700 bg-emerald-50">
              GİB UBL-TR 2.1 & 3PL Adaptörleri Aktif
            </Badge>
          </div>
          <h1 className="mt-2 text-2xl font-bold tracking-tight text-slate-900">
            Omnichannel Stok Senkronizasyonu, Parçalı Sevkiyat, Dropshipping, 3PL & E-İrsaliye Merkezi
          </h1>
          <p className="text-sm text-slate-600">
            Pazaryerleri, e-ticaret, B2B ve POS gerçek zamanlı ATP stok eşitleme; parçalı sevkiyat (split shipment), dropshipping, backorder, RMA iade ve UPS/DHL/E-Fatura/E-İrsaliye adaptörleri.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setIsEdocModalOpen(true)}
            className="gap-1.5"
          >
            <QrCode className="h-4 w-4 text-indigo-600" />
            Yeni E-İrsaliye / E-Fatura Kes
          </Button>
          <Button
            size="sm"
            onClick={handleSyncAllChannels}
            disabled={isSyncing}
            className="bg-blue-600 hover:bg-blue-700 text-white gap-1.5"
          >
            <RefreshCw className={`h-4 w-4 ${isSyncing ? "animate-spin" : ""}`} />
            Tüm Kanalları Şimdi Eşitle (Real-Time ATP)
          </Button>
        </div>
      </div>

      {/* Faz 4 Sekmeleri */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="flex flex-wrap h-auto gap-1 bg-slate-100 p-1">
          <TabsTrigger value="realtime-channels" className="gap-1.5 text-xs sm:text-sm">
            <Globe className="h-4 w-4" />
            1. Gerçek Zamanlı Omnichannel Stok Senkronizasyonu
          </TabsTrigger>
          <TabsTrigger value="fulfillment-flows" className="gap-1.5 text-xs sm:text-sm">
            <Split className="h-4 w-4" />
            2. Parçalı Sevkiyat, Dropshipping, Backorder & RMA İade
          </TabsTrigger>
          <TabsTrigger value="logistics-edocument" className="gap-1.5 text-xs sm:text-sm">
            <Truck className="h-4 w-4" />
            3. Kargo (UPS/DHL), 3PL Lojistik & E-Fatura / E-İrsaliye
          </TabsTrigger>
        </TabsList>

        {/* 1. SEKME: GERÇEK ZAMANLI OMNICHANNEL STOK SENKRONİZASYONU */}
        <TabsContent value="realtime-channels" className="space-y-6">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
            {state.channels.map(ch => (
              <Card key={ch.id} className="border-slate-200 hover:border-blue-300 transition-all">
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <Badge variant="outline" className="font-mono text-xs">
                      {ch.platformType}
                    </Badge>
                    <Badge className="bg-emerald-100 text-emerald-800 gap-1">
                      <Zap className="h-3 w-3" />
                      {ch.webhookLatencyMs} ms
                    </Badge>
                  </div>
                  <CardTitle className="text-base mt-1">{ch.channelName}</CardTitle>
                  <CardDescription className="text-xs">
                    Mağaza Kodu: <strong>{ch.storeCode}</strong> • Son Sync: {ch.lastSyncAt}
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-3 text-xs">
                  <div className="grid grid-cols-3 gap-2 rounded-lg bg-slate-50 p-2.5 border border-slate-100 text-center">
                    <div>
                      <span className="text-slate-400 block text-[10px]">Eşitlenen SKU</span>
                      <strong className="text-slate-900 text-sm">{ch.syncedSkuCount}</strong>
                    </div>
                    <div>
                      <span className="text-slate-400 block text-[10px]">Tampon Stok</span>
                      <strong className="text-amber-700 text-sm">{ch.bufferStockFloor} Adet</strong>
                    </div>
                    <div>
                      <span className="text-slate-400 block text-[10px]">ATP Oranı</span>
                      <strong className="text-blue-700 text-sm">%{ch.allocationPercent}</strong>
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-1 text-slate-600">
                    <span>Günlük Sipariş: <strong>{ch.dailyOrdersCount} Adet</strong></span>
                    <span className="font-bold text-emerald-700">
                      Ciro: ₺{ch.dailyGmvTry.toLocaleString("tr-TR")}
                    </span>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        {/* 2. SEKME: PARÇALI SEVKİYAT, DROPSHIPPING, BACKORDER VE RMA İADE AKIŞLARI */}
        <TabsContent value="fulfillment-flows" className="space-y-6">
          <Card className="border-slate-200">
            <CardHeader>
              <CardTitle className="text-base">
                Omnichannel Sipariş Karşılama: Parçalı Sevkiyat (Split Shipment), Dropshipping & Backorder
              </CardTitle>
              <CardDescription>
                Domino etkisiyle en yakın depodan parçalı sevkiyat, doğrudan tedarikçiden müşteriye dropshipping ve bekleyen sipariş (backorder) tahsisi.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {state.omnichannelOrders.map(ord => (
                <div
                  key={ord.id}
                  className="rounded-xl border border-slate-200 p-4 space-y-3 bg-white"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-sm font-bold text-slate-900">
                        {ord.orderNo}
                      </span>
                      <Badge variant="outline">{ord.channelName}</Badge>
                      <Badge
                        className={
                          ord.fulfillmentMode === "SPLIT_SHIPMENT"
                            ? "bg-indigo-600 text-white"
                            : ord.fulfillmentMode === "DROPSHIPPING"
                            ? "bg-purple-600 text-white"
                            : "bg-amber-600 text-white"
                        }
                      >
                        {ord.fulfillmentMode === "SPLIT_SHIPMENT"
                          ? "PARÇALI SEVKİYAT (MULTI-NODE SPLIT)"
                          : ord.fulfillmentMode === "DROPSHIPPING"
                          ? "DOĞRUDAN TEDARİKÇİ DROPSHIPPING"
                          : "BEKLEYEN SİPARİŞ (BACKORDER)"}
                      </Badge>
                    </div>
                    <div className="font-bold text-slate-900">
                      ₺{ord.totalAmountTry.toLocaleString("tr-TR")} • {ord.customerName} ({ord.customerCity})
                    </div>
                  </div>

                  <div className="grid grid-cols-1 gap-2 md:grid-cols-2">
                    {ord.splitLines.map(line => (
                      <div
                        key={line.splitId}
                        className="rounded-lg bg-slate-50 p-3 border border-slate-200 text-xs space-y-1"
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-mono font-bold text-indigo-700">
                            {line.fulfillmentNodeCode} — {line.fulfillmentNodeName}
                          </span>
                          <Badge variant="secondary" className="text-[10px]">
                            {line.status}
                          </Badge>
                        </div>
                        <div className="font-medium text-slate-900">
                          {line.itemName} ({line.sku}) — <strong>{line.qty} Adet</strong>
                        </div>
                        <div className="flex justify-between text-[11px] text-slate-500 font-mono">
                          <span>Kargo: {line.carrierName}</span>
                          <span>Takip: {line.trackingNumber}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>

          {/* RMA İade Yönetimi */}
          <Card className="border-slate-200">
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <RotateCcw className="h-4 w-4 text-rose-600" />
                Tersine Lojistik & İade Yönetimi (RMA Kalite Kontrol ve Stoka Geri Kazandırma)
              </CardTitle>
              <CardDescription>
                Pazaryeri ve e-ticaret iadelerinin mal kabulde kalite kontrolden geçirilerek A-Grade stoka veya karantinaya ayrılması.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {state.rmaReturns.map(rma => (
                <div
                  key={rma.id}
                  className="rounded-lg border border-slate-200 p-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between"
                >
                  <div className="space-y-1 text-xs">
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-bold text-sm text-slate-900">
                        {rma.rmaNo}
                      </span>
                      <Badge variant="outline">Sipariş: {rma.originalOrderNo}</Badge>
                      <Badge className="bg-slate-100 text-slate-800">{rma.channelName}</Badge>
                      <Badge
                        className={
                          rma.status === "RESTOCKED"
                            ? "bg-emerald-600 text-white"
                            : "bg-amber-500 text-white"
                        }
                      >
                        {rma.status}
                      </Badge>
                    </div>
                    <div className="font-semibold text-sm text-slate-900">
                      {rma.itemName} ({rma.sku}) — {rma.quantity} Adet • İade Tutarı: ₺{rma.refundAmountTry.toLocaleString("tr-TR")}
                    </div>
                    <div className="text-slate-600">
                      Müşteri: <strong>{rma.customerName}</strong> • İade Nedeni: {rma.returnReason} • QC: <strong>{rma.qcGrade}</strong>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleRmaDisposition(rma.id, "RESTOCK_A_GRADE")}
                      className="text-xs border-emerald-300 text-emerald-700 hover:bg-emerald-50"
                    >
                      A-Grade Stoka Geri Al
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleRmaDisposition(rma.id, "QUARANTINE_REWORK")}
                      className="text-xs border-rose-300 text-rose-700 hover:bg-rose-50"
                    >
                      Karantinaya Ayır
                    </Button>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        </TabsContent>

        {/* 3. SEKME: KARGO (UPS/DHL), 3PL LOJİSTİK VE E-FATURA / E-İRSALİYE */}
        <TabsContent value="logistics-edocument" className="space-y-6">
          {/* 3PL ve Kargo Adaptörleri */}
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
            {state.logisticsAdapters.map(adp => (
              <Card key={adp.id} className="border-slate-200">
                <CardContent className="p-4 space-y-2 text-xs">
                  <div className="flex items-center justify-between">
                    <Badge className="bg-slate-900 text-white">{adp.providerCode}</Badge>
                    <Badge className="bg-emerald-100 text-emerald-800">{adp.status}</Badge>
                  </div>
                  <div className="font-bold text-sm text-slate-900">{adp.providerName}</div>
                  <div className="text-slate-500">{adp.serviceType}</div>
                  <div className="pt-2 border-t border-slate-100 space-y-1">
                    <div className="flex justify-between">
                      <span className="text-slate-500">Aktif Gönderi:</span>
                      <strong>{adp.activeShipments} Paket</strong>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">Zamanında Teslim SLA:</span>
                      <strong className="text-emerald-700">%{adp.onTimeDeliveryRate}</strong>
                    </div>
                    <div className="font-mono text-[10px] text-slate-400 truncate">
                      {adp.apiEndpoint}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* GİB UBL-TR 2.1 E-İrsaliye ve E-Fatura Kayıtları */}
          <Card className="border-slate-200">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-base flex items-center gap-2">
                    <FileText className="h-4 w-4 text-indigo-600" />
                    GİB UBL-TR 2.1 E-İrsaliye ve E-Fatura Entegrasyon Kayıtları
                  </CardTitle>
                  <CardDescription>
                    Karekodlu (QR) GİB E-İrsaliye, şoför TCKN / araç plakası bildirimleri ve UBL-TR 2.1 XML zarfları.
                  </CardDescription>
                </div>
                <Button
                  size="sm"
                  onClick={() => setIsEdocModalOpen(true)}
                  className="bg-indigo-600 hover:bg-indigo-700 text-white gap-1.5 text-xs"
                >
                  <Plus className="h-3.5 w-3.5" />
                  Yeni E-İrsaliye / E-Fatura Oluştur
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              {state.eDocuments.map(doc => (
                <div
                  key={doc.id}
                  className="rounded-lg border border-slate-200 p-4 space-y-2 hover:border-indigo-300 transition-all"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <Badge className="bg-indigo-600 text-white font-mono">
                        {doc.documentType}
                      </Badge>
                      <span className="font-mono text-sm font-bold text-slate-900">
                        {doc.documentNo}
                      </span>
                      <Badge variant="outline" className="font-mono text-[11px]">
                        {doc.profileId}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge className="bg-emerald-100 text-emerald-800">
                        {doc.gibStatusText}
                      </Badge>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setSelectedXmlDoc(doc)}
                        className="h-7 text-xs"
                      >
                        UBL-TR 2.1 XML & QR Görüntüle
                      </Button>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 gap-2 sm:grid-cols-4 text-xs pt-1">
                    <div>
                      <span className="text-slate-500 block">Alıcı Kurum & VKN</span>
                      <strong className="text-slate-900">{doc.receiverTitle}</strong> ({doc.receiverVkn})
                    </div>
                    <div>
                      <span className="text-slate-500 block">Taşıyıcı & Plaka</span>
                      <strong className="text-slate-900">{doc.carrierName}</strong> • {doc.vehiclePlate}
                    </div>
                    <div>
                      <span className="text-slate-500 block">Sürücü & TCKN</span>
                      <strong className="text-slate-900">{doc.driverName}</strong> ({doc.driverTckn})
                    </div>
                    <div className="text-right">
                      <span className="text-slate-500 block">Genel Toplam (KDV Dahil)</span>
                      <strong className="text-emerald-700 text-sm">
                        ₺{doc.totalGrossTry.toLocaleString("tr-TR")}
                      </strong>
                    </div>
                  </div>

                  <div className="text-[11px] font-mono text-slate-500 pt-1 border-t border-slate-100">
                    ETTN UUID: {doc.ettnUuid} • Sipariş: {doc.relatedOrderNo} • İçerik: {doc.itemsSummary}
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Yeni E-İrsaliye / E-Fatura Oluşturma Modalı */}
      <Dialog open={isEdocModalOpen} onOpenChange={setIsEdocModalOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>GİB UBL-TR 2.1 E-İrsaliye / E-Fatura Kes</DialogTitle>
            <DialogDescription>
              Sevkiyat için karekodlu E-İrsaliye veya Ticari E-Fatura zarfını GİB entegratörüne iletin.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-3 py-2">
            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label className="text-xs">Belge Tipi</Label>
                <Select value={docType} onValueChange={v => setDocType(v as any)}>
                  <SelectTrigger className="mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="E_IRSALIYE">E-İrsaliye (TEMELIRSALIYE)</SelectItem>
                    <SelectItem value="E_FATURA">E-Fatura (TICARIFATURA)</SelectItem>
                    <SelectItem value="E_ARSIV">E-Arşiv Fatura</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs">İlgili Sipariş No</Label>
                <Input
                  value={docOrderNo}
                  onChange={e => setDocOrderNo(e.target.value)}
                  className="mt-1"
                />
              </div>
            </div>
            <div>
              <Label className="text-xs">Alıcı Unvanı</Label>
              <Input
                value={docReceiver}
                onChange={e => setDocReceiver(e.target.value)}
                className="mt-1"
              />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label className="text-xs">Alıcı VKN / TCKN</Label>
                <Input
                  value={docVkn}
                  onChange={e => setDocVkn(e.target.value)}
                  className="mt-1"
                />
              </div>
              <div>
                <Label className="text-xs">Net Tutar (₺)</Label>
                <Input
                  type="number"
                  value={docNetTry}
                  onChange={e => setDocNetTry(e.target.value)}
                  className="mt-1"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label className="text-xs">Araç Plakası</Label>
                <Input
                  value={docPlate}
                  onChange={e => setDocPlate(e.target.value)}
                  className="mt-1"
                />
              </div>
              <div>
                <Label className="text-xs">Sürücü Ad Soyad</Label>
                <Input
                  value={docDriver}
                  onChange={e => setDocDriver(e.target.value)}
                  className="mt-1"
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEdocModalOpen(false)}>
              İptal
            </Button>
            <Button
              onClick={handleCreateEDocument}
              className="bg-indigo-600 hover:bg-indigo-700 text-white"
            >
              GİB Zarfını İmzala & Gönder
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* UBL-TR 2.1 XML Önizleme Modalı */}
      <Dialog open={!!selectedXmlDoc} onOpenChange={() => setSelectedXmlDoc(null)}>
        <DialogContent className="sm:max-w-xl">
          <DialogHeader>
            <DialogTitle>
              {selectedXmlDoc?.documentNo} — GİB UBL-TR 2.1 Resmi Belge & XML Çıktısı
            </DialogTitle>
            <DialogDescription>
              ETTN: {selectedXmlDoc?.ettnUuid}
            </DialogDescription>
          </DialogHeader>
          {selectedXmlDoc && (
            <pre className="rounded-lg bg-slate-950 p-4 text-[11px] text-emerald-400 font-mono overflow-x-auto max-h-80">
{`<?xml version="1.0" encoding="UTF-8"?>
<DespatchAdvice xmlns="urn:oasis:names:specification:ubl:schema:xsd:DespatchAdvice-2"
                xmlns:cac="urn:oasis:names:specification:ubl:schema:xsd:CommonAggregateComponents-2"
                xmlns:cbc="urn:oasis:names:specification:ubl:schema:xsd:CommonBasicComponents-2">
  <cbc:UBLVersionID>2.1</cbc:UBLVersionID>
  <cbc:CustomizationID>TR1.2.1</cbc:CustomizationID>
  <cbc:ProfileID>${selectedXmlDoc.profileId}</cbc:ProfileID>
  <cbc:ID>${selectedXmlDoc.documentNo}</cbc:ID>
  <cbc:UUID>${selectedXmlDoc.ettnUuid}</cbc:UUID>
  <cbc:IssueDate>${selectedXmlDoc.dispatchDate.split(" ")[0]}</cbc:IssueDate>
  <cac:DeliveryCustomerParty>
    <cac:Party>
      <cac:PartyIdentification><cbc:ID schemeID="VKN">${selectedXmlDoc.receiverVkn}</cbc:ID></cac:PartyIdentification>
      <cac:PartyName><cbc:Name>${selectedXmlDoc.receiverTitle}</cbc:Name></cac:PartyName>
    </cac:Party>
  </cac:DeliveryCustomerParty>
  <cac:Shipment>
    <cbc:ID>${selectedXmlDoc.relatedOrderNo}</cbc:ID>
    <cac:ShipmentStage>
      <cac:TransportMeans>
        <cac:RoadTransport><cbc:LicensePlateID schemeID="PLAKA">${selectedXmlDoc.vehiclePlate}</cbc:LicensePlateID></cac:RoadTransport>
      </cac:TransportMeans>
      <cac:DriverPerson>
        <cbc:FirstName>${selectedXmlDoc.driverName}</cbc:FirstName>
        <cbc:NationalityID>${selectedXmlDoc.driverTckn}</cbc:NationalityID>
      </cac:DriverPerson>
    </cac:ShipmentStage>
  </cac:Shipment>
</DespatchAdvice>`}
            </pre>
          )}
          <DialogFooter>
            <Button onClick={() => setSelectedXmlDoc(null)}>Kapat</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

