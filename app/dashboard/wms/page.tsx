"use client"

import React, { useState, useEffect, useMemo } from "react"
import Link from "next/link"
import {
  Warehouse,
  MapPin,
  ClipboardCheck,
  PackageCheck,
  Truck,
  QrCode,
  Smartphone,
  ArrowRight,
  CheckCircle2,
  AlertTriangle,
  Layers,
  RefreshCw,
  ShieldCheck,
  EyeOff,
  Eye,
  Plus,
  Sparkles,
  Box,
  Compass
} from "lucide-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
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
import { Label } from "@/components/ui/label"
import { toast } from "sonner"
import { enterpriseInventoryService } from "@/lib/services/enterpriseInventorySuite"
import type { WmsOperationTask } from "@/lib/services/wmsDirectiveEngine"

const WORKFLOW_STAGES: {
  key: WmsOperationTask["workflowStage"]
  title: string
  subtitle: string
  badgeColor: string
}[] = [
  {
    key: "GOODS_RECEIPT",
    title: "1. Mal Kabul (ASN / GRN)",
    subtitle: "Rampa İndirme & GS1 Barkod Kontrol",
    badgeColor: "bg-blue-600 text-white"
  },
  {
    key: "QC_INSPECTION",
    title: "2. Kalite Kontrol (QC)",
    subtitle: "Tazelik, Soğuk Zincir & Numune Onayı",
    badgeColor: "bg-amber-600 text-white"
  },
  {
    key: "PUTAWAY",
    title: "3. Rafa Yerleştirme (Put-Away)",
    subtitle: "Lokasyon Direktifi ile Hücreye İstif",
    badgeColor: "bg-indigo-600 text-white"
  },
  {
    key: "WAVE_PICK",
    title: "4. Dalga Toplama (Wave Pick)",
    subtitle: "FEFO & Rota Optimizasyonlu Toplama",
    badgeColor: "bg-purple-600 text-white"
  },
  {
    key: "PACKING",
    title: "5. Paketleme (Pack & LPN)",
    subtitle: "Koli/LPN Kapama & Kargo Etiketi",
    badgeColor: "bg-emerald-600 text-white"
  }
]

export default function AdvancedWmsOperationsPage() {
  const [state, setState] = useState(() => enterpriseInventoryService.getState())
  const [activeTab, setActiveTab] = useState("bin-directives")
  const [selectedZoneFilter, setSelectedZoneFilter] = useState<string>("ALL")

  // Kör Sayım Gizlilik Modu & Sayım Girişi
  const [selectedSessionId, setSelectedSessionId] = useState<string>("cnt-001")
  const [revealBlindSystemQty, setRevealBlindSystemQty] = useState(false)
  const [countInputs, setCountInputs] = useState<Record<string, string>>({})

  // Depolar Arası Transfer Modalı
  const [isTransferModalOpen, setIsTransferModalOpen] = useState(false)
  const [trfFromWh, setTrfFromWh] = useState("DEP-IST-MRK")
  const [trfToWh, setTrfToWh] = useState("DEP-ANK-BOL")
  const [trfSku, setTrfSku] = useState("SKU-FLR-001")
  const [trfQty, setTrfQty] = useState("48")
  const [trfLpn, setTrfLpn] = useState("LPN-TR-2026-000950")
  const [trfPlate, setTrfPlate] = useState("34 SNR 808")

  useEffect(() => {
    const refresh = () => setState({ ...enterpriseInventoryService.getState() })
    window.addEventListener("sunum-inventory-change", refresh)
    return () => window.removeEventListener("sunum-inventory-change", refresh)
  }, [])

  const filteredBins = useMemo(() => {
    if (selectedZoneFilter === "ALL") return state.wmsBins
    return state.wmsBins.filter(b => b.zoneType === selectedZoneFilter)
  }, [state.wmsBins, selectedZoneFilter])

  const activeCountSession = useMemo(
    () => state.countSessions.find(s => s.id === selectedSessionId) || state.countSessions[0],
    [state.countSessions, selectedSessionId]
  )

  const handleAdvanceTask = (taskId: string) => {
    const updated = enterpriseInventoryService.advanceWmsTaskStage(taskId)
    if (updated) {
      setState({ ...enterpriseInventoryService.getState() })
      toast.success(`${updated.taskNo} görevi ilerletildi`, {
        description:
          updated.status === "COMPLETED"
            ? "Paketleme tamamlandı ve sevkiyata hazır hale getirildi."
            : `Yeni Aşama: ${updated.workflowStage}`
      })
    }
  }

  const handleCreateTransfer = () => {
    if (trfFromWh === trfToWh) {
      toast.error("Kaynak ve hedef depo aynı olamaz.")
      return
    }
    const created = enterpriseInventoryService.createTransferOrder({
      fromWarehouseCode: trfFromWh,
      toWarehouseCode: trfToWh,
      sku: trfSku,
      quantity: Number(trfQty) || 24,
      lpnCode: trfLpn,
      carrierPlate: trfPlate
    })
    setState({ ...enterpriseInventoryService.getState() })
    setIsTransferModalOpen(false)
    toast.success(`${created.transferNo} Depolar Arası Transfer Emri oluşturuldu`, {
      description: `LPN: ${created.lpnCode} • E-İrsaliye: ${created.eWaybillNo}`
    })
  }

  const handleSaveCountLine = (lineId: string) => {
    if (!activeCountSession) return
    const val = Number(countInputs[lineId])
    if (isNaN(val) || val < 0) {
      toast.error("Geçerli bir sayım miktarı giriniz.")
      return
    }
    enterpriseInventoryService.submitBlindCountLine(activeCountSession.id, lineId, val)
    setState({ ...enterpriseInventoryService.getState() })
    toast.success("Hücre sayım verisi kaydedildi ve fark analizi güncellendi.")
  }

  const handleReconcileSession = (sessionId: string) => {
    const reconciled = enterpriseInventoryService.reconcileCountSession(sessionId)
    if (reconciled) {
      setState({ ...enterpriseInventoryService.getState() })
      toast.success(`${reconciled.sessionNo} Sayım Fark Mahsuplaşması Tamamlandı`, {
        description: `Muhasebe Mahsup Fişi: ${reconciled.reconciledJournalNo} • Stok kartı bakiyeleri otomatik eşitlendi.`
      })
    }
  }

  return (
    <div className="space-y-6 p-6">
      {/* Üst Başlık */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <Badge className="bg-indigo-600 text-white hover:bg-indigo-700">
              Faz 2 • İleri Seviye WMS & Saha Operasyonları
            </Badge>
            <Badge variant="outline" className="border-emerald-300 text-emerald-700 bg-emerald-50">
              Çok Katmanlı Adresleme & LPN Aktif
            </Badge>
          </div>
          <h1 className="mt-2 text-2xl font-bold tracking-tight text-slate-900">
            İleri Seviye Depo Yönetim Sistemi (WMS), LPN & Akıllı Sayım Merkezi
          </h1>
          <p className="text-sm text-slate-600">
            Bölge/Koridor/Raf/Kat/Hücre (Bin) adresleme, lokasyon direktifleri, Mal Kabul → QC → Put-away → Wave Pick → Pack iş akışları, LPN takibi ve Kör/Döngüsel sayım mahsuplaşması.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Link href="/dashboard/wms/mobil">
            <Button className="bg-slate-900 hover:bg-slate-800 text-white gap-1.5" size="sm">
              <Smartphone className="h-4 w-4 text-emerald-400" />
              Mobil El Terminali (Barkod / QR / RFID & Offline PWA)
            </Button>
          </Link>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setIsTransferModalOpen(true)}
            className="gap-1.5"
          >
            <Truck className="h-4 w-4 text-indigo-600" />
            Yeni LPN Transfer Emri
          </Button>
        </div>
      </div>

      {/* Üst Özet Kartları */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card className="border-slate-200">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-slate-500">Aktif Hücre (Storage Bin)</span>
              <MapPin className="h-4 w-4 text-indigo-600" />
            </div>
            <div className="mt-2 text-2xl font-bold text-slate-900">{state.wmsBins.length} Hücre</div>
            <p className="mt-1 text-xs text-slate-500">
              Zone → Aisle → Rack → Level → Bin Hiyerarşisi
            </p>
          </CardContent>
        </Card>

        <Card className="border-slate-200">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-slate-500">Canlı WMS Saha Görevleri</span>
              <PackageCheck className="h-4 w-4 text-emerald-600" />
            </div>
            <div className="mt-2 text-2xl font-bold text-slate-900">
              {state.wmsTasks.length} İş Emri
            </div>
            <p className="mt-1 text-xs text-emerald-600 font-medium">
              Mal Kabul, QC, Put-Away, Wave Pick & Pack
            </p>
          </CardContent>
        </Card>

        <Card className="border-slate-200">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-slate-500">Lisans Plakalı Konteyner (LPN)</span>
              <QrCode className="h-4 w-4 text-purple-600" />
            </div>
            <div className="mt-2 text-2xl font-bold text-slate-900">
              {state.licensePlates.length} Aktif LPN
            </div>
            <p className="mt-1 text-xs text-slate-500">
              SSCC-18 Palet, Flora Arabası & Koli Takibi
            </p>
          </CardContent>
        </Card>

        <Card className="border-slate-200">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-slate-500">Sayım & Fark Mahsuplaşma</span>
              <ClipboardCheck className="h-4 w-4 text-amber-600" />
            </div>
            <div className="mt-2 text-2xl font-bold text-slate-900">
              {state.countSessions.length} Oturum
            </div>
            <p className="mt-1 text-xs text-amber-700 font-medium">
              Kör Sayım (Blind) & Smart Cycle Count Aktif
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Faz 2 Sekmeleri */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="flex flex-wrap h-auto gap-1 bg-slate-100 p-1">
          <TabsTrigger value="bin-directives" className="gap-1.5 text-xs sm:text-sm">
            <Compass className="h-4 w-4" />
            1. Çok Katmanlı Depo Adresleme & Direktifler
          </TabsTrigger>
          <TabsTrigger value="workflows" className="gap-1.5 text-xs sm:text-sm">
            <Layers className="h-4 w-4" />
            2. Mal Kabul → QC → Put-Away → Wave Pick → Pack
          </TabsTrigger>
          <TabsTrigger value="transfers-lpn" className="gap-1.5 text-xs sm:text-sm">
            <Truck className="h-4 w-4" />
            3. Depolar Arası Transfer & LPN Takibi
          </TabsTrigger>
          <TabsTrigger value="cycle-counting" className="gap-1.5 text-xs sm:text-sm">
            <ClipboardCheck className="h-4 w-4" />
            4. Tam / Döngüsel / Kör Sayım & Otomatik Mahsup
          </TabsTrigger>
        </TabsList>

        {/* 1. SEKME: ÇOK KATMANLI DEPO ADRESLEME VE LOKASYON DİREKTİFLERİ */}
        <TabsContent value="bin-directives" className="space-y-6">
          <Card className="border-slate-200">
            <CardHeader className="pb-3">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <CardTitle className="text-base">
                    Çok Katmanlı Depo Hücre Haritası (Bölge → Koridor → Raf → Kat → Bin/Hücre)
                  </CardTitle>
                  <CardDescription>
                    Hücre bazlı doluluk, sıcaklık rejimi, ağırlık/hacim kapasitesi ve içindeki aktif LPN / Lot bilgileri.
                  </CardDescription>
                </div>
                <Select value={selectedZoneFilter} onValueChange={setSelectedZoneFilter}>
                  <SelectTrigger className="w-56 h-9 text-xs">
                    <SelectValue placeholder="Bölge (Zone) Filtrele" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ALL">Tüm Depo Bölgeleri (Zones)</SelectItem>
                    <SelectItem value="Z1_COLD_FLORA">Z1 — Soğuk Hava (+2°C/+6°C)</SelectItem>
                    <SelectItem value="Z2_FAST_PICK">Z2 — Hızlı Toplama (Golden Zone)</SelectItem>
                    <SelectItem value="Z3_PALLET_RESERVE">Z3 — Yüksek Palet Rezerv</SelectItem>
                    <SelectItem value="Z4_PACKING">Z4 — Paketleme & Sevkiyat</SelectItem>
                    <SelectItem value="Z5_QUARANTINE">Z5 — Karantina & Blokeli</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
                {filteredBins.map(bin => (
                  <div
                    key={bin.id}
                    className={`rounded-xl border p-4 space-y-2.5 transition-all ${
                      bin.status === "QUARANTINE_LOCKED"
                        ? "border-rose-300 bg-rose-50/40"
                        : bin.occupancyPercent >= 80
                        ? "border-amber-300 bg-amber-50/30"
                        : "border-slate-200 bg-white"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-mono text-xs font-bold text-slate-900 bg-slate-100 px-2 py-0.5 rounded">
                        {bin.binCode}
                      </span>
                      <Badge
                        className={
                          bin.status === "QUARANTINE_LOCKED"
                            ? "bg-rose-600 text-white"
                            : bin.status === "FULL"
                            ? "bg-amber-600 text-white"
                            : "bg-emerald-600 text-white"
                        }
                      >
                        %{bin.occupancyPercent} Dolu
                      </Badge>
                    </div>

                    <div className="text-xs font-medium text-slate-700">{bin.zoneName}</div>

                    <div className="grid grid-cols-4 gap-1 text-center bg-slate-50 p-1.5 rounded border border-slate-100 text-[10px]">
                      <div>
                        <span className="text-slate-400 block">Koridor</span>
                        <strong>{bin.aisle}</strong>
                      </div>
                      <div>
                        <span className="text-slate-400 block">Raf</span>
                        <strong>{bin.rack}</strong>
                      </div>
                      <div>
                        <span className="text-slate-400 block">Kat</span>
                        <strong>{bin.level}</strong>
                      </div>
                      <div>
                        <span className="text-slate-400 block">Hücre</span>
                        <strong>{bin.position}</strong>
                      </div>
                    </div>

                    {bin.currentSku ? (
                      <div className="rounded bg-indigo-50/60 p-2 border border-indigo-100 text-xs space-y-0.5">
                        <div className="font-semibold text-slate-900 line-clamp-1">
                          {bin.currentItemName}
                        </div>
                        <div className="font-mono text-[11px] text-indigo-700">
                          {bin.currentSku} • {bin.currentQty} Adet
                        </div>
                        {bin.currentLot && (
                          <div className="font-mono text-[10px] text-slate-500">
                            Lot: {bin.currentLot} • LPN: {bin.lpnCount}
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="rounded bg-slate-50 p-2 text-xs text-slate-400 text-center">
                        Boş Hücre — İstife Hazır
                      </div>
                    )}

                    <div className="flex items-center justify-between text-[11px] text-slate-500 pt-1">
                      <span>
                        Yük: <strong>{bin.currentWeightKg}/{bin.maxWeightKg} kg</strong>
                      </span>
                      <span>
                        Sıcaklık: <strong>{bin.temperatureC}°C</strong>
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Lokasyon Direktifleri Tablosu */}
          <Card className="border-slate-200">
            <CardHeader>
              <CardTitle className="text-base">
                Otomatik Lokasyon Direktifleri Motoru (Put-Away & Pick Rules)
              </CardTitle>
              <CardDescription>
                Ürün sıcaklığı, ABC devir hızı ve FEFO son kullanma tarihine göre rafa yerleştirme ve toplama hücresi öneren kurallar.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto rounded-lg border border-slate-200">
                <table className="w-full text-left text-sm">
                  <thead className="bg-slate-50 text-xs uppercase text-slate-600 border-b">
                    <tr>
                      <th className="p-3">Öncelik & Kod</th>
                      <th className="p-3">Direktif Adı</th>
                      <th className="p-3">Operasyon</th>
                      <th className="p-3">Algoritma / Strateji</th>
                      <th className="p-3">Hedef Bölge (Zone)</th>
                      <th className="p-3">İş Kuralı Açıklaması</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200">
                    {state.directives.map(dir => (
                      <tr key={dir.id} className="hover:bg-slate-50">
                        <td className="p-3 font-mono text-xs font-bold text-indigo-700">
                          #{dir.priority} • {dir.code}
                        </td>
                        <td className="p-3 font-medium text-slate-900">{dir.name}</td>
                        <td className="p-3">
                          <Badge
                            className={
                              dir.operation === "PUTAWAY"
                                ? "bg-indigo-100 text-indigo-800"
                                : "bg-purple-100 text-purple-800"
                            }
                          >
                            {dir.operation}
                          </Badge>
                        </td>
                        <td className="p-3 font-mono text-xs">{dir.strategy}</td>
                        <td className="p-3 font-mono text-xs text-slate-700">{dir.targetZone}</td>
                        <td className="p-3 text-xs text-slate-600">{dir.ruleDescription}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* 2. SEKME: MAL KABUL → QC → PUT-AWAY → WAVE PICK → PACK İŞ AKIŞLARI */}
        <TabsContent value="workflows" className="space-y-6">
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-5">
            {WORKFLOW_STAGES.map(stage => {
              const stageTasks = state.wmsTasks.filter(t => t.workflowStage === stage.key)
              return (
                <Card key={stage.key} className="border-slate-200 bg-slate-50/60 flex flex-col">
                  <CardHeader className="p-3.5 pb-2 border-b bg-white rounded-t-xl">
                    <div className="flex items-center justify-between">
                      <Badge className={stage.badgeColor}>{stageTasks.length} Görev</Badge>
                    </div>
                    <CardTitle className="text-sm mt-1.5">{stage.title}</CardTitle>
                    <CardDescription className="text-[11px]">{stage.subtitle}</CardDescription>
                  </CardHeader>
                  <CardContent className="p-3 space-y-3 flex-1">
                    {stageTasks.map(task => (
                      <div
                        key={task.id}
                        className="rounded-lg bg-white p-3 border border-slate-200 shadow-sm space-y-2"
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-mono text-xs font-bold text-indigo-700">
                            {task.taskNo}
                          </span>
                          <Badge
                            variant="outline"
                            className={
                              task.priority === "URGENT"
                                ? "border-rose-300 bg-rose-50 text-rose-700 text-[10px]"
                                : "text-[10px]"
                            }
                          >
                            {task.priority}
                          </Badge>
                        </div>

                        <div className="font-semibold text-xs text-slate-900">
                          {task.itemName}
                        </div>
                        <div className="text-[11px] text-slate-600 font-mono">
                          {task.sku} • {task.expectedQty} {task.unit}
                        </div>

                        <div className="rounded bg-slate-50 p-1.5 text-[10px] font-mono text-slate-600 space-y-0.5">
                          <div>Kaynak: {task.sourceBin}</div>
                          <div>Hedef: {task.targetBin}</div>
                          <div>LPN: {task.lpnCode}</div>
                        </div>

                        <div className="flex items-center justify-between text-[11px] text-slate-500">
                          <span>Operatör: {task.assignedOperator}</span>
                          <Badge variant="secondary" className="text-[10px]">
                            {task.status}
                          </Badge>
                        </div>

                        {task.status !== "COMPLETED" && (
                          <Button
                            size="sm"
                            onClick={() => handleAdvanceTask(task.id)}
                            className="w-full h-7 text-xs bg-indigo-600 hover:bg-indigo-700 text-white gap-1"
                          >
                            {stage.key === "PACKING"
                              ? "Paketlemeyi Tamamla"
                              : "Sonraki Aşamaya İlerlet"}
                            <ArrowRight className="h-3 w-3" />
                          </Button>
                        )}
                      </div>
                    ))}
                  </CardContent>
                </Card>
              )
            })}
          </div>
        </TabsContent>

        {/* 3. SEKME: DEPOLAR ARASI TRANSFER EMİRLERİ & LİSANS PLAKALI (LPN) STOK TAKİBİ */}
        <TabsContent value="transfers-lpn" className="space-y-6">
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
            {/* Sol: Lisans Plakalı Konteynerler (LPN) */}
            <Card className="border-slate-200 lg:col-span-6">
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <QrCode className="h-4 w-4 text-purple-600" />
                  Lisans Plakalı (LPN / SSCC-18) Palet & Konteyner Takibi
                </CardTitle>
                <CardDescription>
                  Tek bir LPN barkodu okutularak içindeki çoklu parti/lot stokların tek seferde taşınması ve izlenmesi.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {state.licensePlates.map(lpn => (
                  <div
                    key={lpn.id}
                    className="rounded-lg border border-slate-200 p-3.5 space-y-2 hover:border-purple-300 transition-all"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div>
                        <span className="font-mono text-sm font-bold text-purple-700">
                          {lpn.lpnCode}
                        </span>
                        <div className="font-mono text-[11px] text-slate-500">
                          GS1 SSCC-18: {lpn.sscc18}
                        </div>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <Badge variant="outline">{lpn.containerType}</Badge>
                        <Badge className="bg-emerald-100 text-emerald-800">{lpn.status}</Badge>
                      </div>
                    </div>

                    <div className="flex justify-between text-xs text-slate-600">
                      <span>
                        Depo/Hücre: <strong className="font-mono">{lpn.warehouseCode} / {lpn.currentBinCode}</strong>
                      </span>
                      <span>
                        Brüt Ağırlık: <strong>{lpn.totalWeightKg} kg</strong>
                      </span>
                    </div>

                    <div className="rounded bg-slate-50 p-2 border border-slate-100 space-y-1">
                      {lpn.items.map((it, idx) => (
                        <div key={idx} className="flex justify-between text-xs">
                          <span>
                            <strong>{it.itemName}</strong> ({it.sku})
                          </span>
                          <span className="font-mono font-semibold text-slate-900">
                            {it.qty} {it.unit} ({it.lotNumber})
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>

            {/* Sağ: Depolar Arası Transfer Emirleri */}
            <Card className="border-slate-200 lg:col-span-6">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-base flex items-center gap-2">
                      <Truck className="h-4 w-4 text-indigo-600" />
                      Depolar Arası Transfer Emirleri (In-Transit WMS)
                    </CardTitle>
                    <CardDescription>
                      E-İrsaliye ve LPN bağlantılı şubeler/depolar arası sevkiyat emirleri.
                    </CardDescription>
                  </div>
                  <Button
                    size="sm"
                    onClick={() => setIsTransferModalOpen(true)}
                    className="bg-indigo-600 hover:bg-indigo-700 text-white gap-1 text-xs"
                  >
                    <Plus className="h-3.5 w-3.5" />
                    Transfer Emri Aç
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                {state.transferOrders.map(trf => (
                  <div
                    key={trf.id}
                    className="rounded-lg border border-slate-200 p-3.5 space-y-2"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-mono text-sm font-bold text-slate-900">
                        {trf.transferNo}
                      </span>
                      <Badge
                        className={
                          trf.status === "IN_TRANSIT"
                            ? "bg-blue-100 text-blue-800"
                            : "bg-amber-100 text-amber-800"
                        }
                      >
                        {trf.status === "IN_TRANSIT" ? "YOLDA (IN-TRANSIT)" : "TOPLANIYOR"}
                      </Badge>
                    </div>

                    <div className="flex items-center gap-2 text-xs font-medium text-slate-800">
                      <span>{trf.fromWarehouseName}</span>
                      <ArrowRight className="h-3.5 w-3.5 text-indigo-600" />
                      <span>{trf.toWarehouseName}</span>
                    </div>

                    <div className="text-xs text-slate-600">
                      Ürün: <strong>{trf.itemName}</strong> ({trf.sku}) —{" "}
                      <strong className="text-emerald-700">
                        {trf.quantity} {trf.unit}
                      </strong>
                    </div>

                    <div className="flex flex-wrap justify-between gap-2 pt-2 border-t border-slate-100 text-[11px] text-slate-500 font-mono">
                      <span>LPN: {trf.lpnCode}</span>
                      <span>Araç: {trf.carrierVehiclePlate}</span>
                      <span>E-İrsaliye: {trf.eWaybillNo}</span>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* 4. SEKME: TAM SAYIM, DÖNGÜSEL SAYIM (SMART COUNT) VE KÖR SAYIM + OTOMATİK MAHSUPLAŞMA */}
        <TabsContent value="cycle-counting" className="space-y-6">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            {state.countSessions.map(sess => (
              <Card
                key={sess.id}
                onClick={() => setSelectedSessionId(sess.id)}
                className={`cursor-pointer transition-all ${
                  activeCountSession?.id === sess.id
                    ? "border-2 border-indigo-600 bg-indigo-50/20"
                    : "border-slate-200 hover:border-slate-300"
                }`}
              >
                <CardContent className="p-4 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-xs font-bold text-slate-900">
                      {sess.sessionNo}
                    </span>
                    <Badge
                      className={
                        sess.countType === "BLIND_COUNT"
                          ? "bg-slate-900 text-white"
                          : sess.countType === "SMART_CYCLE_COUNT"
                          ? "bg-indigo-600 text-white"
                          : "bg-emerald-600 text-white"
                      }
                    >
                      {sess.countType === "BLIND_COUNT"
                        ? "Kör Sayım (Blind Count)"
                        : sess.countType === "SMART_CYCLE_COUNT"
                        ? "Döngüsel (Smart Count)"
                        : "Yıllık Tam Sayım"}
                    </Badge>
                  </div>
                  <div className="font-semibold text-sm text-slate-900">
                    {sess.warehouseName} — {sess.zoneFilter}
                  </div>
                  <div className="flex justify-between text-xs text-slate-600">
                    <span>İlerleme: {sess.countedBinsCount}/{sess.totalBinsToCount} Hücre</span>
                    <span
                      className={
                        sess.totalVarianceTry < 0
                          ? "text-rose-600 font-bold"
                          : sess.totalVarianceTry > 0
                          ? "text-emerald-600 font-bold"
                          : "text-slate-600"
                      }
                    >
                      Fark: ₺{sess.totalVarianceTry.toLocaleString("tr-TR")}
                    </span>
                  </div>
                  <div className="pt-1 flex items-center justify-between">
                    <Badge variant="outline" className="text-[10px]">
                      Durum: {sess.status}
                    </Badge>
                    {sess.reconciledJournalNo && (
                      <span className="font-mono text-[10px] text-emerald-700 font-semibold">
                        Fiş: {sess.reconciledJournalNo}
                      </span>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {activeCountSession && (
            <Card className="border-slate-200">
              <CardHeader className="pb-3">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <div className="flex items-center gap-2">
                      <CardTitle className="text-base">
                        {activeCountSession.sessionNo} — Sayım Kalemleri ve Otomatik Fark Mahsuplaşma
                      </CardTitle>
                      {activeCountSession.isBlindMode && (
                        <Badge className="bg-amber-100 text-amber-800 border-amber-300">
                          Kör Sayım Modu: Sistem Stoğu Saha Operatörüne Gizli
                        </Badge>
                      )}
                    </div>
                    <CardDescription>
                      Sayılan miktarları girip onayladığınızda stok bakiyeleri ve muhasebe envanter fark mahsup fişi otomatik oluşturulur.
                    </CardDescription>
                  </div>

                  <div className="flex items-center gap-2">
                    {activeCountSession.isBlindMode && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setRevealBlindSystemQty(prev => !prev)}
                        className="gap-1.5 text-xs"
                      >
                        {revealBlindSystemQty ? (
                          <>
                            <EyeOff className="h-3.5 w-3.5" />
                            Sistem Stoğunu Gizle (Kör Mod)
                          </>
                        ) : (
                          <>
                            <Eye className="h-3.5 w-3.5" />
                            Yönetici Yetkisiyle Sistem Stoğunu Göster
                          </>
                        )}
                      </Button>
                    )}

                    {activeCountSession.status !== "RECONCILED" && (
                      <Button
                        size="sm"
                        onClick={() => handleReconcileSession(activeCountSession.id)}
                        className="bg-emerald-600 hover:bg-emerald-700 text-white gap-1.5 text-xs"
                      >
                        <CheckCircle2 className="h-4 w-4" />
                        Otomatik Fark Mahsuplaşma & Muhasebe Fişi Kes
                      </Button>
                    )}
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto rounded-lg border border-slate-200">
                  <table className="w-full text-left text-sm">
                    <thead className="bg-slate-50 text-xs uppercase text-slate-600 border-b">
                      <tr>
                        <th className="p-3">Hücre (Bin) & Lot</th>
                        <th className="p-3">Ürün & SKU</th>
                        <th className="p-3 text-right">Sistem Stoğu</th>
                        <th className="p-3 text-right">Sayılan Miktar</th>
                        <th className="p-3 text-right">Fark (Adet)</th>
                        <th className="p-3 text-right">Fark Tutarı (₺)</th>
                        <th className="p-3">Saha Sayım Girişi</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200">
                      {activeCountSession.lines.map(line => {
                        const hideSystem =
                          activeCountSession.isBlindMode &&
                          !revealBlindSystemQty &&
                          activeCountSession.status !== "RECONCILED"
                        return (
                          <tr key={line.id} className="hover:bg-slate-50">
                            <td className="p-3 font-mono text-xs">
                              <div className="font-bold text-slate-900">{line.binCode}</div>
                              <div className="text-slate-500">Lot: {line.lotNumber}</div>
                            </td>
                            <td className="p-3">
                              <div className="font-medium text-slate-900">{line.itemName}</div>
                              <div className="font-mono text-xs text-slate-500">{line.sku}</div>
                            </td>
                            <td className="p-3 text-right font-mono">
                              {hideSystem ? (
                                <Badge variant="secondary" className="font-mono">
                                  🔒 GİZLİ (KÖR SAYIM)
                                </Badge>
                              ) : (
                                <span className="font-semibold">
                                  {line.systemQty} {line.unit}
                                </span>
                              )}
                            </td>
                            <td className="p-3 text-right font-bold text-indigo-700">
                              {line.countedQty !== null ? `${line.countedQty} ${line.unit}` : "Bekliyor"}
                            </td>
                            <td className="p-3 text-right font-bold">
                              {hideSystem || line.countedQty === null ? (
                                "-"
                              ) : (
                                <span
                                  className={
                                    line.varianceQty < 0
                                      ? "text-rose-600"
                                      : line.varianceQty > 0
                                      ? "text-emerald-600"
                                      : "text-slate-500"
                                  }
                                >
                                  {line.varianceQty > 0 ? `+${line.varianceQty}` : line.varianceQty}{" "}
                                  {line.unit}
                                </span>
                              )}
                            </td>
                            <td className="p-3 text-right font-semibold">
                              {hideSystem || line.countedQty === null ? (
                                "-"
                              ) : (
                                <span
                                  className={
                                    line.varianceCostTry < 0
                                      ? "text-rose-600"
                                      : line.varianceCostTry > 0
                                      ? "text-emerald-600"
                                      : "text-slate-500"
                                  }
                                >
                                  ₺{line.varianceCostTry.toLocaleString("tr-TR")}
                                </span>
                              )}
                            </td>
                            <td className="p-3">
                              <div className="flex items-center gap-2">
                                <Input
                                  type="number"
                                  placeholder={
                                    line.countedQty !== null ? String(line.countedQty) : "Adet girin"
                                  }
                                  value={countInputs[line.id] ?? ""}
                                  onChange={e =>
                                    setCountInputs(prev => ({
                                      ...prev,
                                      [line.id]: e.target.value
                                    }))
                                  }
                                  className="h-8 w-24 text-xs"
                                />
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => handleSaveCountLine(line.id)}
                                  className="h-8 text-xs"
                                >
                                  Kaydet
                                </Button>
                              </div>
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>

      {/* Depolar Arası LPN Transfer Modalı */}
      <Dialog open={isTransferModalOpen} onOpenChange={setIsTransferModalOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Yeni Depolar Arası LPN Transfer Emri</DialogTitle>
            <DialogDescription>
              Lisans plakalı (LPN) konteyner ve otomatik E-İrsaliye numarası ile transfer emri oluşturun.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-3 py-2">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs">Çıkış (Kaynak) Depo</Label>
                <Select value={trfFromWh} onValueChange={setTrfFromWh}>
                  <SelectTrigger className="mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {state.warehouses.map(w => (
                      <SelectItem key={w.id} value={w.code}>
                        {w.code} — {w.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs">Varış (Hedef) Depo</Label>
                <Select value={trfToWh} onValueChange={setTrfToWh}>
                  <SelectTrigger className="mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {state.warehouses.map(w => (
                      <SelectItem key={w.id} value={w.code}>
                        {w.code} — {w.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <Label className="text-xs">Transfer Edilecek Stok Kartı</Label>
              <Select value={trfSku} onValueChange={setTrfSku}>
                <SelectTrigger className="mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {state.items.map(i => (
                    <SelectItem key={i.id} value={i.sku}>
                      {i.sku} — {i.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-3 gap-2">
              <div>
                <Label className="text-xs">Miktar</Label>
                <Input
                  type="number"
                  value={trfQty}
                  onChange={e => setTrfQty(e.target.value)}
                  className="mt-1"
                />
              </div>
              <div>
                <Label className="text-xs">LPN Kodu</Label>
                <Input
                  value={trfLpn}
                  onChange={e => setTrfLpn(e.target.value)}
                  className="mt-1"
                />
              </div>
              <div>
                <Label className="text-xs">Araç Plakası</Label>
                <Input
                  value={trfPlate}
                  onChange={e => setTrfPlate(e.target.value)}
                  className="mt-1"
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsTransferModalOpen(false)}>
              İptal
            </Button>
            <Button
              onClick={handleCreateTransfer}
              className="bg-indigo-600 hover:bg-indigo-700 text-white"
            >
              Transfer Emrini Başlat
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

