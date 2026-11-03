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
  ShieldCheck,
  Check,
  AlertCircle,
  Eye,
  SlidersHorizontal,
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
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from "@/components/ui/dialog"
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle
} from "@/components/ui/sheet"
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
  const [isDocSheetOpen, setIsDocSheetOpen] = useState(false)

  useEffect(() => {
    const refresh = () => setState({ ...enterpriseInventoryService.getState() })
    window.addEventListener("sunum-inventory-change", refresh)
    return () => window.removeEventListener("sunum-inventory-change", refresh)
  }, [])

  // Tüm Kanalları Senkronize Et
  const handleSyncAllChannels = () => {
    setIsSyncing(true)
    setTimeout(() => {
      enterpriseInventoryService.triggerOmnichannelSyncAll()
      setState({ ...enterpriseInventoryService.getState() })
      setIsSyncing(false)
      toast.success("Tüm Satış Kanallarında Stoklar Eşitlendi!", {
          description: "Trendyol, Hepsiburada, Shopify, Amazon TR ve POS kasaları anlık güncellendi."
        })
    }, 400)
  }

  // RMA İade Muayenesi
  const handleRmaDisposition = (
    rmaId: string,
    disposition: "RESTOCK_A_GRADE" | "QUARANTINE_REWORK"
  ) => {
    const updated = enterpriseInventoryService.processRmaInspection(rmaId, disposition)
    if (updated) {
      setState({ ...enterpriseInventoryService.getState() })
        toast.success(`${updated.rmaNo} İade İşlemi Tamamlandı!`, {
          description:
            disposition === "RESTOCK_A_GRADE"
                ? `${updated.quantity} adet sağlam ürün satılabilir stoğa geri alındı.`
                : `${updated.quantity} adet kusurlu ürün karantina deposuna ayrıldı.`
        })
      }
  }

    // Yeni E-İrsaliye Kesimi
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
    setIsDocSheetOpen(true)
    toast.success(`${created.documentNo} GİB E-İrsaliyesi Kesildi!`, {
          description: `ETTN UUID: ${created.ettnUuid} • GİB 1300 Onaylandı.`
        })
      }

  const pendingRmaCount = (state.rmaReturns || []).filter(r => r.status === "RECEIVED_AT_HUB").length
      const totalDailyGmv = (state.channels || []).reduce((s, c) => s + (c.dailyGmvTry || 0), 0)
      const totalDailyOrders = (state.channels || []).reduce((s, c) => s + (c.dailyOrdersCount || 0), 0)

      return (
              <div className="space-y-6 p-4 sm:p-6 max-w-7xl mx-auto">
                {/* 1. ÜST AI BARI */}
                <div className="rounded-xl border border-blue-200 bg-gradient-to-r from-blue-50/80 via-sky-50/40 to-white p-4 sm:p-5 shadow-sm">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex items-start gap-3">
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-blue-600 text-white shadow">
                        <Globe className="h-5 w-5" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h2 className="text-base font-semibold text-slate-900">Çok Kanallı Satış & Lojistik Durumu</h2>
                          <Badge variant="outline" className="border-blue-300 bg-white text-blue-700 text-xs font-medium">
                            Canlı Entegrasyon
                          </Badge>
                        </div>
                        <p className="mt-1 text-sm text-slate-600">
                          <span className="font-semibold text-slate-900">{state.channels.length} satış kanalınız</span> (Pazaryerleri & Web) tam senkronize çalışıyor. Bugün toplam <span className="font-semibold text-slate-900">{totalDailyOrders} sipariş</span> alındı.
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setIsEdocModalOpen(true)}
                        className="bg-white border-slate-200 text-slate-700 hover:bg-slate-50 text-xs"
                      >
                        <QrCode className="mr-1.5 h-3.5 w-3.5 text-indigo-600" />
                        E-İrsaliye Kes
                      </Button>
                      <Button
                        size="sm"
                        onClick={handleSyncAllChannels}
                        disabled={isSyncing}
                        className="bg-blue-600 hover:bg-blue-700 text-white text-xs gap-1.5 shadow-sm"
                      >
                        <RefreshCw className={`h-3.5 w-3.5 ${isSyncing ? "animate-spin" : ""}`} />
                        Kanalları Eşitle (Tek Tık)
                      </Button>
                    </div>
                  </div>
                </div>

                  {/* 2. BAŞLIK */}
                  <div className="flex flex-col gap-2 border-b pb-4">
                    <div className="flex items-center gap-2">
                      <Globe className="h-6 w-6 text-blue-600" />
                      <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900">
                        Omnichannel Satış, Lojistik & E-İrsaliye
                      </h1>
                    </div>
                    <p className="text-sm text-slate-500">
                      Trendyol, Hepsiburada, Shopify, Amazon TR ve mağaza POS kasalarınızın stok senkronizasyonu, parçalı sevkiyatlar ve resmi E-İrsaliye yönetimi.
                    </p>
                  </div>

                  {/* 3. DÖRT BASİT METRİK KARTI */}
                  <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
                    <Card className="border-slate-200/80 shadow-xs">
                      <CardContent className="p-4">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-medium text-slate-500">Aktif Pazaryerleri</span>
                          <Store className="h-4 w-4 text-blue-600" />
                        </div>
                        <div className="mt-2 flex items-baseline gap-2">
                          <span className="text-2xl font-bold text-slate-900">{state.channels.length}</span>
                          <span className="text-xs text-slate-500">Kanal</span>
                        </div>
                        <p className="mt-1 text-xs text-emerald-600 font-medium">Tümü bağlı ve canlı</p>
                      </CardContent>
                    </Card>

                    <Card className="border-slate-200/80 shadow-xs">
                      <CardContent className="p-4">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-medium text-slate-500">Bugünkü Omnichannel Ciro</span>
                          <ShoppingBag className="h-4 w-4 text-emerald-600" />
                        </div>
                        <div className="mt-2 flex items-baseline gap-2">
                          <span className="text-2xl font-bold text-slate-900">
                            ₺{Math.round(totalDailyGmv).toLocaleString("tr-TR")}
                          </span>
                        </div>
                        <p className="mt-1 text-xs text-slate-500">{totalDailyOrders} adet sipariş</p>
                      </CardContent>
                    </Card>

                    <Card className={`border-slate-200/80 shadow-xs ${pendingRmaCount > 0 ? "bg-amber-50/40 border-amber-200" : ""}`}>
                      <CardContent className="p-4">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-medium text-slate-500">Bekleyen Müşteri İadeleri</span>
                          <RotateCcw className={`h-4 w-4 ${pendingRmaCount > 0 ? "text-amber-600" : "text-slate-400"}`} />
                        </div>
                        <div className="mt-2 flex items-baseline gap-2">
                          <span className={`text-2xl font-bold ${pendingRmaCount > 0 ? "text-amber-700" : "text-slate-900"}`}>
                            {pendingRmaCount}
                          </span>
                          <span className="text-xs text-slate-500">İade Paketi</span>
                        </div>
                        <p className="mt-1 text-xs text-slate-500">Kalite kontrol bekliyor</p>
                      </CardContent>
                    </Card>

                    <Card className="border-slate-200/80 shadow-xs">
                      <CardContent className="p-4">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-medium text-slate-500">GİB Onaylı E-İrsaliyeler</span>
                          <FileText className="h-4 w-4 text-purple-600" />
                        </div>
                        <div className="mt-2 flex items-baseline gap-2">
                          <span className="text-2xl font-bold text-slate-900">{state.eDocuments.length}</span>
                          <span className="text-xs text-slate-500">Belge</span>
                        </div>
                        <p className="mt-1 text-xs text-slate-500">Karekodlu UBL-TR 2.1</p>
                      </CardContent>
                    </Card>
                  </div>

                  {/* 4. MODÜL SEKMELERİ */}
                  <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
                        <TabsList className="bg-slate-100 p-1">
                          <TabsTrigger value="realtime-channels" className="text-xs sm:text-sm gap-1.5">
                            <Store className="h-4 w-4" />
                            Pazaryerleri & Stok Eşitleme
                          </TabsTrigger>
                            <TabsTrigger value="orders-fulfillment" className="text-xs sm:text-sm gap-1.5">
                              <Split className="h-4 w-4" />
                              Siparişler & Parçalı Sevkiyat
                            </TabsTrigger>
                              <TabsTrigger value="returns-rma" className="text-xs sm:text-sm gap-1.5">
                                <RotateCcw className="h-4 w-4" />
                                Müşteri İadeleri & Kontrol (RMA)
                              </TabsTrigger>
                              <TabsTrigger value="edocuments" className="text-xs sm:text-sm gap-1.5">
                                <FileText className="h-4 w-4" />
                                E-İrsaliye & Lojistik Belgeleri
                              </TabsTrigger>
                            </TabsList>

                                        {/* TAB 1: PAZARYERLERİ & KANALLAR */}
                                        <TabsContent value="realtime-channels" className="space-y-4">
                                          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                            {state.channels.map(ch => (
                                              <Card key={ch.id} className="border-slate-200 hover:border-blue-300 transition-all shadow-xs">
                                                <CardHeader className="pb-3 border-b">
                                                  <div className="flex items-center justify-between">
                                                    <Badge variant="outline" className="font-semibold text-slate-700">
                                                      {ch.platformType}
                                                    </Badge>
                                                    <span className="flex items-center gap-1 text-[11px] text-emerald-600 font-medium">
                                                      <span className="h-2 w-2 rounded-full bg-emerald-500 animate-ping" />
                                                      {ch.webhookLatencyMs} ms Ping
                                                    </span>
                                                  </div>
                                                  <CardTitle className="text-base text-slate-900 mt-2">{ch.channelName}</CardTitle>
                                                  <CardDescription className="text-xs font-mono">
                                                    Mağaza: {ch.storeCode} • Son Eşitleme: {ch.lastSyncAt}
                                                  </CardDescription>
                                                </CardHeader>

                                                <CardContent className="pt-3 space-y-3">
                                                  <div className="grid grid-cols-3 gap-2 bg-slate-50 p-2.5 rounded-lg text-center text-xs">
                                                    <div>
                                                      <span className="text-slate-400 block text-[10px]">Eşitlenen Ürün</span>
                                                      <strong className="text-slate-900 text-sm">{ch.syncedSkuCount}</strong>
                                                    </div>
                                                      <div>
                                                        <span className="text-slate-400 block text-[10px]">Güvenlik Tamponu</span>
                                                        <strong className="text-amber-700 text-sm">{ch.bufferStockFloor} Adet</strong>
                                                      </div>
                                                      <div>
                                                        <span className="text-slate-400 block text-[10px]">Ayrılan Stok</span>
                                                        <strong className="text-blue-700 text-sm">%{ch.allocationPercent}</strong>
                                                      </div>
                                                    </div>

                                            <div className="flex items-center justify-between text-xs text-slate-600">
                                              <span>Bugün: <strong>{ch.dailyOrdersCount} Sipariş</strong></span>
                                              <span className="font-bold text-emerald-700">₺{ch.dailyGmvTry.toLocaleString("tr-TR")}</span>
                                            </div>
                                          </CardContent>
                                        </Card>
            ))}
                                      </div>
                                    </TabsContent>

                                              {/* TAB 2: SİPARİŞLER VE SEVKİYAT MODELLERİ */}
                                              <TabsContent value="orders-fulfillment" className="space-y-4">
                                                <div className="space-y-3">
                                                  {state.omnichannelOrders.map(ord => (
              <div key={ord.id} className="p-4 bg-white border border-slate-200 rounded-xl space-y-3 shadow-xs">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-sm font-bold text-slate-900">{ord.orderNo}</span>
                    <Badge variant="outline">{ord.channelName}</Badge>
                    <Badge className={
                      ord.fulfillmentMode === "SPLIT_SHIPMENT"
                        ? "bg-indigo-600 text-white"
                        : ord.fulfillmentMode === "DROPSHIPPING"
                          ? "bg-purple-600 text-white"
                          : "bg-amber-600 text-white"
                    }>
                      {ord.fulfillmentMode === "SPLIT_SHIPMENT"
                        ? "Parçalı Sevkiyat (En Yakın Depodan)"
                        : ord.fulfillmentMode === "DROPSHIPPING"
                          ? "Doğrudan Tedarikçiden (Dropshipping)"
                          : "Bekleyen Sipariş (Backorder)"}
                    </Badge>
                  </div>
                  <div className="font-bold text-sm text-slate-900">
                    ₺{ord.totalAmountTry.toLocaleString("tr-TR")}
                  </div>
                </div>

                                                        <div className="text-xs text-slate-600">
                                                          Alıcı: <strong>{ord.customerName}</strong> • {ord.deliveryAddress}
                                                        </div>

                                                          <div className="bg-slate-50 p-2.5 rounded-lg space-y-1.5">
                                                            {ord.items.map((it, idx) => (
                                                              <div key={idx} className="flex justify-between text-xs">
                                                                <span><strong>{it.itemName}</strong> ({it.sku})</span>
                                                                <span className="font-mono text-slate-700 font-medium">
                                                                  {it.quantity} Adet • Kaynak: <strong>{it.fulfillmentSource}</strong>
                                                                </span>
                                                              </div>
                                                    ))}
                                                  </div>
                                                </div>
            ))}
                                            </div>
        </TabsContent>

                                                  {/* TAB 3: MÜŞTERİ İADELERİ & KALİTE KONTROL (RMA) */}
                                                  <TabsContent value="returns-rma" className="space-y-4">
                                                    <div className="bg-indigo-50/50 p-4 rounded-xl border border-indigo-100 text-xs text-slate-700">
                                                      <strong>Müşteri İade Süreci (RMA):</strong> Gelen iadeler depoda kontrol edildikten sonra sağlamsa tek tıkla &quot;Tekrar Satılabilir ATP Stoğuna&quot; eklenir, hasarlıysa karantinaya ayrılır.
                                                    </div>

                                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                      {state.rmaReturns.map(rma => {
                                                        const isPending = rma.status === "RECEIVED_AT_HUB"

                                                        return (
                                                          <Card key={rma.id} className="border-slate-200">
                                                            <CardHeader className="pb-3 border-b">
                                                              <div className="flex items-center justify-between">
                                                                <span className="font-mono text-xs font-bold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded">
                                                                  {rma.rmaNo}
                                                                </span>
                                                                <Badge className={isPending ? "bg-amber-100 text-amber-800" : "bg-emerald-100 text-emerald-800"}>
                                                                  {isPending ? "Muayene Bekliyor" : "Tamamlandı"}
                                                                </Badge>
                                                              </div>
                                                                <CardTitle className="text-base text-slate-900 mt-2">
                                                                  {rma.itemName}
                                                                </CardTitle>
                                                                <CardDescription className="text-xs font-mono">
                                                                  Müşteri: {rma.customerName} • İade Sebebi: <strong>{rma.returnReason}</strong>
                                                                </CardDescription>
                                                            </CardHeader>

                                                            <CardContent className="pt-3 space-y-3">
                                                              <div className="flex justify-between text-xs text-slate-600">
                                                                <span>Miktar: <strong>{rma.quantity} Adet</strong></span>
                                                                <span>İade Tarihi: {rma.requestDate}</span>
                                                              </div>

                                                                {isPending ? (
                                                                  <div className="flex gap-2 pt-2">
                                                                    <Button
                                                                      size="sm"
                                                                      onClick={() => handleRmaDisposition(rma.id, "RESTOCK_A_GRADE")}
                                                                      className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white text-xs"
                                                                    >
                                                                      <Check className="mr-1 h-3.5 w-3.5" />
                                                                      Sağlam (Stoğa Ekle)
                                                                    </Button>
                                                                    <Button
                                                                      variant="destructive"
                                                                      size="sm"
                                                                      onClick={() => handleRmaDisposition(rma.id, "QUARANTINE_REWORK")}
                                                                      className="flex-1 text-xs"
                                                                    >
                                                                      Kusurlu (Karantina)
                                                                    </Button>
                                                                  </div>
                                                                  ) : (
                                                                  <div className="p-2 bg-slate-50 rounded text-xs text-center text-slate-600 font-medium">
                                                                    Sonuç: {rma.disposition === "RESTOCK_A_GRADE" ? "Satılabilir Stoğa Geri Alındı" : "Karantinaya Ayrıldı"}
                                                                  </div>
                    )}
                                                              </CardContent>
                                                            </Card>
                                                            )
            })}
                                                          </div>
        </TabsContent>

                                                    {/* TAB 4: E-İRSALİYE VE LOJİSTİK BELGELERİ */}
                                                    <TabsContent value="edocuments" className="space-y-4">
                                                      <div className="rounded-xl border border-slate-200 bg-white overflow-hidden shadow-xs">
                                                        <table className="w-full text-sm text-left">
                                                          <thead className="bg-slate-50 text-xs uppercase text-slate-500 border-b">
                                                            <tr>
                                                              <th className="px-4 py-3 font-semibold">Belge No & Tip</th>
                                                              <th className="px-4 py-3 font-semibold">Alıcı Ünvanı & VKN</th>
                                                              <th className="px-4 py-3 font-semibold">Taşıyıcı & Plaka</th>
                                                              <th className="px-4 py-3 font-semibold text-right">Tutar</th>
                                                              <th className="px-4 py-3 font-semibold text-center">GİB Durumu</th>
                                                              <th className="px-4 py-3 font-semibold text-right">Görüntüle</th>
                                                            </tr>
                                                          </thead>
                                                          <tbody className="divide-y divide-slate-100">
                                                            {state.eDocuments.map(doc => (
                                                              <tr key={doc.id} className="hover:bg-slate-50/70 transition-colors">
                                                                <td className="px-4 py-3.5">
                                                                  <div className="font-mono font-bold text-slate-900 text-xs">{doc.documentNo}</div>
                                                                  <Badge variant="outline" className="text-[10px] mt-0.5">{doc.documentType}</Badge>
                                                                </td>

                                                                <td className="px-4 py-3.5 text-xs">
                                                                  <div className="font-semibold text-slate-900">{doc.receiverTitle}</div>
                                                                  <div className="font-mono text-slate-400 text-[11px]">VKN: {doc.receiverVkn}</div>
                                                                </td>

                                                                <td className="px-4 py-3.5 text-xs text-slate-600">
                                                                  <div>{doc.carrierName}</div>
                                                                  <div className="font-mono text-slate-400 text-[11px]">{doc.vehiclePlate} • {doc.driverName}</div>
                                                                </td>

                                                                <td className="px-4 py-3.5 text-right font-bold text-slate-900">
                                                                  ₺{doc.totalGrossTry.toLocaleString("tr-TR")}
                                                                </td>

                                                                <td className="px-4 py-3.5 text-center">
                                                                  <Badge className="bg-emerald-100 text-emerald-800 text-[11px] gap-1">
                                                                    <CheckCircle2 className="h-3 w-3" />
                                                                    GİB 1300 Onaylı
                                                                  </Badge>
                                                                </td>

                                                                <td className="px-4 py-3.5 text-right">
                                                                  <Button
                                                                    variant="ghost"
                                                                    size="sm"
                                                                    onClick={() => {
                                                                      setSelectedXmlDoc(doc)
                                                                      setIsDocSheetOpen(true)
                                                                    }}
                                                                    className="text-xs text-indigo-600 hover:text-indigo-800"
                                                                  >
                                                                    <Eye className="mr-1 h-3.5 w-3.5" />
                                                                    İncele
                                                                  </Button>
                                                                </td>
                                                              </tr>
                                                            ))}
                                                      </tbody>
                                                    </table>
                                                  </div>
                                                </TabsContent>
                                              </Tabs>

      {/* 5. RESMİ E-İRSALİYE / E-FATURA KESİM MODALI */ }
                                              < Dialog open = { isEdocModalOpen } onOpenChange = { setIsEdocModalOpen } >
                                                <DialogContent className="max-w-md">
                                                  <DialogHeader>
                                                    <DialogTitle className="flex items-center gap-2">
                                                      <QrCode className="h-5 w-5 text-indigo-600" />
                                                      GİB UBL-TR 2.1 E-İrsaliye Kes
                                                    </DialogTitle>
                                                    <DialogDescription>
                                                      Resmi karekodlu e-irsaliye belgesi oluşturup Gelir İdaresi Başkanlığına iletin.
                                                    </DialogDescription>
                                                  </DialogHeader>

                                                      <div className="space-y-3 py-2 text-xs">
                                                        <div>
                                                          <Label className="text-xs">Belge Türü</Label>
                                                          <Select value={docType} onValueChange={(val: any) => setDocType(val)}>
                                                            <SelectTrigger className="mt-1">
                                                              <SelectValue />
                                                            </SelectTrigger>
                                                            <SelectContent>
                                                              <SelectItem value="E_IRSALIYE">E-İrsaliye (Temel İrsaliye)</SelectItem>
                                                              <SelectItem value="E_FATURA">E-Fatura (Ticari)</SelectItem>
                                                              <SelectItem value="E_ARSIV">E-Arşiv Fatura</SelectItem>
                                                            </SelectContent>
                                                          </Select>
                                                        </div>

                                                        <div>
                                                          <Label className="text-xs">Alıcı Ünvanı</Label>
                                                          <Input value={docReceiver} onChange={e => setDocReceiver(e.target.value)} className="mt-1" />
                                                        </div>

                                                          <div className="grid grid-cols-2 gap-3">
                                                            <div>
                                                              <Label className="text-xs">Alıcı VKN / TCKN</Label>
                                                              <Input value={docVkn} onChange={e => setDocVkn(e.target.value)} className="mt-1" />
                                                            </div>
                                                            <div>
                                                              <Label className="text-xs">Net Tutar (₺)</Label>
                                                              <Input type="number" value={docNetTry} onChange={e => setDocNetTry(e.target.value)} className="mt-1" />
                                                            </div>
                                                          </div>

                                                            <div className="grid grid-cols-2 gap-3">
                                                              <div>
                                                                <Label className="text-xs">Taşıyıcı Araç Plakası</Label>
                                                                <Input value={docPlate} onChange={e => setDocPlate(e.target.value)} className="mt-1" />
                                                              </div>
                                                              <div>
                                                                <Label className="text-xs">Şoför Adı</Label>
                                                                <Input value={docDriver} onChange={e => setDocDriver(e.target.value)} className="mt-1" />
                                                              </div>
                                                            </div>
                                                          </div>

                                                          <DialogFooter>
                                                              <Button variant="outline" onClick={() => setIsEdocModalOpen(false)}>Vazgeç</Button>
                                                              <Button onClick={handleCreateEDocument} className="bg-indigo-600 hover:bg-indigo-700 text-white">
                                                                Belgeyi İmzala & Kes
                                                              </Button>
                                                          </DialogFooter>
                                                        </DialogContent>
                                                      </Dialog>

                                                          {/* 6. BELGE GÖRÜNTÜLEYİCİ ÇEKMECESİ (SHEET) */}
                                                          <Sheet open={isDocSheetOpen} onOpenChange={setIsDocSheetOpen}>
                                                            <SheetContent side="right" className="w-full sm:max-w-lg p-6 overflow-y-auto">
                                                              {selectedXmlDoc && (
            <div className="space-y-6">
              <SheetHeader>
                <Badge className="w-fit bg-emerald-600 text-white font-mono">{selectedXmlDoc.documentNo}</Badge>
                <SheetTitle className="text-lg font-bold text-slate-900 mt-1">
                  Resmi E-İrsaliye Belge Kartı
                </SheetTitle>
                <SheetDescription className="font-mono text-xs">
                  ETTN: {selectedXmlDoc.ettnUuid}
                </SheetDescription>
              </SheetHeader>

              <div className="p-4 bg-slate-50 rounded-xl space-y-3 text-xs border border-slate-200">
                <div className="flex justify-between">
                  <span className="text-slate-500">Alıcı Ünvanı:</span>
                  <strong>{selectedXmlDoc.receiverTitle}</strong>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Alıcı VKN:</span>
                  <span className="font-mono">{selectedXmlDoc.receiverVkn}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Sevkiyat Tarihi:</span>
                  <span>{selectedXmlDoc.dispatchDate}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Taşıyıcı / Plaka:</span>
                  <span>{selectedXmlDoc.carrierName} ({selectedXmlDoc.vehiclePlate})</span>
                </div>
                <div className="flex justify-between pt-2 border-t">
                  <span className="text-slate-500">KDV Dahil Toplam:</span>
                  <strong className="text-base text-slate-900">₺{selectedXmlDoc.totalGrossTry.toLocaleString("tr-TR")}</strong>
                </div>
              </div>

              <div className="bg-emerald-50 p-3.5 rounded-xl border border-emerald-200 text-xs text-emerald-800 space-y-1">
                <div className="font-bold flex items-center gap-1.5">
                  <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                  GİB Entegrasyon Durumu: 1300
                </div>
                <p className="text-[11px] text-emerald-700">
                  {selectedXmlDoc.gibStatusText}
                </p>
              </div>
            </div>
                                                              )}
                                                        </SheetContent>
                                                      </Sheet>
                                                    </div>
                                                    )
}
