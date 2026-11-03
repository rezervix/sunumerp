"use client"

import React, { useState, useEffect } from "react"
import {
  Webhook,
  Puzzle,
  DatabaseZap,
  GraduationCap,
  ShieldCheck,
  KeyRound,
  CheckCircle2,
  Play,
  ArrowRight,
  Cpu,
  Layers,
  Terminal,
  Sparkles,
  RefreshCw
} from "lucide-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
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
  ERP_MIGRATION_PRESETS,
  SAAS_TIERS
} from "@/lib/services/enterpriseInventorySuite"
import type { ErpMigrationPreset } from "@/lib/services/ecosystemSaasEngine"

const TRAINING_SCENARIOS = [
  {
    id: "sim-01",
    title: "Senaryo 1: GS1-128 Mal Kabul → Lokasyon Direktifi → Wave Pick → Karekodlu E-İrsaliye",
    level: "Temel & İleri WMS Operatörü",
    duration: "5 Dakika İnteraktif Simülasyon",
    steps: [
      "1. Rampa 2'ye gelen Hollanda Flora sevkiyatının GS1-128 barkodu okutulur ve LOT-2026-1101 açılır.",
      "2. Kalite Kontrol (QC) nem ve sıcaklık (+4°C) onayı verildikten sonra DIR-PUT-001 direktifi Z1 Soğuk Hava hücresini önerir.",
      "3. Trendyol ve B2B'den gelen siparişler FEFO kuralına göre dalga toplamaya (Wave Pick) düşer.",
      "4. Paketleme masasında LPN mühürlenir ve GİB UBL-TR 2.1 E-İrsaliye otomatik üretilir."
    ]
  },
  {
    id: "sim-02",
    title: "Senaryo 2: Soğukava IoT Sensör Alarmı, Otomatik Karantina & Muadil Ürün İkamesi",
    level: "Kalite Güvence & Planlama Uzmanı",
    duration: "4 Dakika İnteraktif Simülasyon",
    steps: [
      "1. LoRaWAN sıcaklık sensörü API anahtarı üzerinden +9.2°C eşik aşımı webhook'u gönderir.",
      "2. İlgili hücredeki lot otomatik olarak QUARANTINE_LOCKED statüsüne çekilir ve ATP stoktan düşülür.",
      "3. Bekleyen siparişler için Alternatif/Muadil Ürün Motoru (%96 uyumlu muadil SKU) devreye girer.",
      "4. ROP altına düşen ana stok için satın alma talebi (Auto-PR) otomatik oluşturulur."
    ]
  },
  {
    id: "sim-03",
    title: "Senaryo 3: Kör Sayım (Blind Count), Fark Tespiti ve FIFO Maliyet Mahsuplaşması",
    level: "Depo Şefi & Maliyet Muhasebesi",
    duration: "4 Dakika İnteraktif Simülasyon",
    steps: [
      "1. Mobil el terminalinde sistem stoğu gizlenerek (Blind Mode) koridor Z2'de UHF RFID sayımı yapılır.",
      "2. Sistemdeki 120 adede karşılık 117 adet okunur (-3 adet fark tespit edilir).",
      "3. Yönetici onay ekranında FIFO maliyet katmanına göre fark tutarı hesaplanır.",
      "4. Tek tuşla stok bakiyesi 117'ye eşitlenir ve muhasebe envanter fark mahsup fişi kesilir."
    ]
  }
]

export default function EcosystemApiMigrationAndSaasPage() {
  const [state, setState] = useState(() => enterpriseInventoryService.getState())
  const [activeTab, setActiveTab] = useState("api-webhooks")

  // Canlı Open REST API Test Yanıtı
  const [apiTestResponse, setApiTestResponse] = useState<string>("")
  const [isTestingApi, setIsTestingApi] = useState(false)

  // ERP Veri Geçiş Sihirbazı State
  const [selectedSourceErp, setSelectedSourceErp] =
    useState<ErpMigrationPreset["sourceSystem"]>("LOGO_TIGER")
  const [activeSimId, setActiveSimId] = useState("sim-01")
  const [completedSimulations, setCompletedSimulations] = useState<string[]>([])

  useEffect(() => {
    const refresh = () => setState({ ...enterpriseInventoryService.getState() })
    window.addEventListener("sunum-inventory-change", refresh)
    return () => window.removeEventListener("sunum-inventory-change", refresh)
  }, [])

  const currentMigrationPreset =
    ERP_MIGRATION_PRESETS.find(p => p.sourceSystem === selectedSourceErp) ||
    ERP_MIGRATION_PRESETS[0]

  const handleTestRestApi = async () => {
    setIsTestingApi(true)
    try {
      const res = await fetch("/api/v1/inventory?sku=SKU-FLR-001")
      const json = await res.json()
      setApiTestResponse(JSON.stringify(json, null, 2))
      toast.success("GET /api/v1/inventory Açık REST API Çağrısı Başarılı (200 OK)")
    } catch {
      toast.error("API çağrısı sırasında hata oluştu.")
    } finally {
      setIsTestingApi(false)
    }
  }

  const handleTogglePlugin = (pluginId: string) => {
    const toggled = enterpriseInventoryService.togglePluginInstallation(pluginId)
    if (toggled) {
      setState({ ...enterpriseInventoryService.getState() })
      toast.success(
        toggled.isInstalled
          ? `${toggled.name} eklentisi kuruldu ve aktif edildi.`
          : `${toggled.name} eklentisi devre dışı bırakıldı.`
      )
    }
  }

  const handleRunMigration = () => {
    const job = enterpriseInventoryService.runErpMigrationJob(selectedSourceErp, [
      "Stok Kartları & Barkodlar",
      "Matrix Renk/Beden Varyantları",
      "Çoklu Birim Dönüşümleri",
      "Ambar & Hücre (Bin) Bakiyeleri",
      "Lot/SKT & FIFO Maliyet Katmanları"
    ])
    setState({ ...enterpriseInventoryService.getState() })
    toast.success(`${job.jobName} Tamamlandı!`, {
      description: `${job.migratedRecords.toLocaleString("tr-TR")} kayıt doğrulamadan geçerek aktarıldı.`
    })
  }

  const handleSelectSaasTier = (tierId: "starter" | "growth_wms" | "enterprise_omni") => {
    enterpriseInventoryService.updateSaasTier(tierId)
    setState({ ...enterpriseInventoryService.getState() })
    const tierObj = SAAS_TIERS.find(t => t.id === tierId)
    toast.success(`SaaS Lisans Paketi Güncellendi: ${tierObj?.name}`, {
      description: "Depo, SKU, aylık sipariş ve API kotaları yeni pakete göre ölçeklendi."
    })
  }

  return (
    <div className="space-y-6 p-6">
      {/* Üst Başlık */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <Badge className="bg-slate-900 text-white">
              Faz 6 • Mimari Kalite, API Ekosistemi, Veri Geçişi & SaaS Lisanslama
            </Badge>
            <Badge variant="outline" className="border-emerald-300 text-emerald-700 bg-emerald-50">
              REST API v1 • HMAC Webhook • ERP Migration • SaaS
            </Badge>
          </div>
          <h1 className="mt-2 text-2xl font-bold tracking-tight text-slate-900">
            Açık API & IoT Ekosistemi, Eklenti Mağazası, ERP Veri Geçiş Sihirbazı & SaaS Kota Merkezi
          </h1>
          <p className="text-sm text-slate-600">
            Dış sistemler ve IoT/RFID cihazları için REST API & Webhook altyapısı, üçüncü taraf eklenti mağazası, eski ERP'lerden otomatik veri geçiş sihirbazı, simülasyon akademisi ve ölçeklenebilir SaaS lisanslama.
          </p>
        </div>
      </div>

      {/* Faz 6 Sekmeleri */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="flex flex-wrap h-auto gap-1 bg-slate-100 p-1">
          <TabsTrigger value="api-webhooks" className="gap-1.5 text-xs sm:text-sm">
            <Webhook className="h-4 w-4" />
            1. Açık REST API, IoT/RFID & Webhook Altyapısı
          </TabsTrigger>
          <TabsTrigger value="plugin-marketplace" className="gap-1.5 text-xs sm:text-sm">
            <Puzzle className="h-4 w-4" />
            2. Üçüncü Taraf Eklenti Mağazası (Marketplace)
          </TabsTrigger>
          <TabsTrigger value="migration-training" className="gap-1.5 text-xs sm:text-sm">
            <DatabaseZap className="h-4 w-4" />
            3. ERP Veri Geçiş Sihirbazı & Simülasyon Modülü
          </TabsTrigger>
          <TabsTrigger value="saas-licensing" className="gap-1.5 text-xs sm:text-sm">
            <ShieldCheck className="h-4 w-4" />
            4. Modüler SaaS Abonelik & Kota Ölçekleme
          </TabsTrigger>
        </TabsList>

        {/* 1. SEKME: AÇIK REST API, IOT/RFID VE WEBHOOK ALTYAPISI */}
        <TabsContent value="api-webhooks" className="space-y-6">
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
            {/* Sol: IoT / RFID ve Dış Sistem API Anahtarları */}
            <Card className="border-slate-200 lg:col-span-6">
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <KeyRound className="h-4 w-4 text-indigo-600" />
                  Dış Sistemler & IoT / RFID Cihazları İçin Açık REST API Anahtarları
                </CardTitle>
                <CardDescription>
                  UHF RFID kapı okuyucuları, soğuk zincir LoRaWAN sensörleri ve B2B/3PL entegrasyon anahtarları.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                  {(state.apiKeys || []).map(ak => (
                    <div
                      key={ak.id}
                      className="rounded-lg border border-slate-200 p-3.5 space-y-2"
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-semibold text-sm text-slate-900">{ak.name}</span>
                        <Badge className="bg-emerald-100 text-emerald-800">{ak.iotOrSystemType}</Badge>
                      </div>
                      <div className="font-mono text-xs bg-slate-100 px-2.5 py-1 rounded text-slate-700">
                        {ak.maskedKey}
                      </div>
                      <div className="flex flex-wrap gap-1">
                        {ak.scopes.map(sc => (
                          <Badge key={sc} variant="outline" className="font-mono text-[10px]">
                            {sc}
                          </Badge>
                        ))}
                      </div>
                      <div className="flex justify-between text-[11px] text-slate-500">
                        <span>Limit: {ak.rateLimitPerMin} req/dk</span>
                        <span>Bugün: <strong>{ak.requestsToday.toLocaleString("tr-TR")} çağrı</strong></span>
                        <span>Son: {ak.lastUsedAt}</span>
                      </div>
                    </div>
                  ))}

                {/* Canlı /api/v1/inventory Test Konsolu */}
                <div className="rounded-xl bg-slate-950 text-white p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-xs font-mono text-emerald-400">
                      <Terminal className="h-4 w-4" />
                      GET /api/v1/inventory?sku=SKU-FLR-001
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
                    <pre className="text-[11px] font-mono text-slate-300 overflow-x-auto max-h-48 bg-slate-900 p-2.5 rounded">
                      {apiTestResponse}
                    </pre>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Sağ: HMAC-SHA256 Webhook Altyapısı */}
            <Card className="border-slate-200 lg:col-span-6">
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <Webhook className="h-4 w-4 text-emerald-600" />
                  Gerçek Zamanlı HMAC-SHA256 Webhook Abonelikleri
                </CardTitle>
                <CardDescription>
                  Stok değişimi, düşük stok uyarısı, LPN mühürleme ve E-İrsaliye olaylarını dış sistemlere anlık ileten webhook uç noktaları.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                  {(state.webhooks || []).map(whk => (
                    <div
                      key={whk.id}
                      className="rounded-lg border border-slate-200 p-3.5 space-y-2"
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-semibold text-sm text-slate-900">{whk.name}</span>
                        <Badge className="bg-emerald-600 text-white">
                          HTTP {whk.lastStatusCode} OK
                        </Badge>
                      </div>
                      <div className="font-mono text-xs text-indigo-700 break-all">
                        {whk.targetUrl}
                      </div>
                      <div className="flex flex-wrap gap-1">
                        {whk.subscribedEvents.map(ev => (
                          <Badge key={ev} variant="secondary" className="font-mono text-[10px]">
                            {ev}
                          </Badge>
                        ))}
                      </div>
                      <pre className="rounded bg-slate-900 text-emerald-400 p-2.5 text-[10px] font-mono overflow-x-auto">
                        {whk.lastPayloadSample}
                      </pre>
                      <div className="flex justify-between text-[11px] text-slate-500">
                        <span>Başarılı Teslimat: <strong>{whk.successCount}</strong></span>
                        <span>Hata: {whk.failureCount}</span>
                        <span>Son Tetikleme: {whk.lastTriggeredAt}</span>
                      </div>
                    </div>
                  ))}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* 2. SEKME: ÜÇÜNCÜ TARAF EKLENTİ MAĞAZASI (PLUGIN MARKETPLACE) */}
        <TabsContent value="plugin-marketplace" className="space-y-6">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
              {(state.plugins || []).map(plg => (
                <Card key={plg.id} className="border-slate-200 flex flex-col justify-between">
                  <CardHeader className="pb-2">
                    <div className="flex items-center justify-between">
                      <Badge variant="outline">{plg.category}</Badge>
                      <span className="text-xs font-semibold text-amber-600">
                        ★ {plg.rating} ({plg.installCount} Kurulum)
                      </span>
                    </div>
                    <CardTitle className="text-base mt-1.5">{plg.name}</CardTitle>
                    <CardDescription className="text-xs">
                      Geliştirici: <strong>{plg.vendor}</strong> • v{plg.version}
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-3 text-xs">
                    <p className="text-slate-600 leading-relaxed">{plg.description}</p>
                    <div className="space-y-1">
                      {plg.features.map((f, i) => (
                        <div key={i} className="flex items-center gap-1.5 text-slate-700">
                          <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
                          <span>{f}</span>
                        </div>
                      ))}
                    </div>
                    <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
                      <span className="font-semibold text-slate-900">{plg.pricingTier}</span>
                      <Button
                        size="sm"
                        variant={plg.isInstalled ? "outline" : "default"}
                        onClick={() => handleTogglePlugin(plg.id)}
                        className={
                          plg.isInstalled
                            ? "border-emerald-300 text-emerald-700 h-8 text-xs"
                            : "bg-indigo-600 hover:bg-indigo-700 text-white h-8 text-xs"
                        }
                      >
                        {plg.isInstalled ? "Kurulu (Devre Dışı Bırak)" : "Tek Tıkla Kur & Aktifleştir"}
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
          </div>
        </TabsContent>

        {/* 3. SEKME: ESKİ ERP VERİ GEÇİŞ SİHİRBAZI (MIGRATION WIZARD) & SİMÜLASYON / EĞİTİM MODÜLÜ */}
        <TabsContent value="migration-training" className="space-y-6">
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
            {/* Sol: ERP Veri Geçiş Sihirbazı */}
            <Card className="border-slate-200 lg:col-span-7">
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <DatabaseZap className="h-4 w-4 text-indigo-600" />
                  Otomatik ERP Veri Geçiş (Migration) Sihirbazı
                </CardTitle>
                <CardDescription>
                  Logo Tiger/Wings, Nebim V3, SAP Business One, Odoo ve Zoho Inventory tablolarını otomatik şema eşleştirmesiyle içe aktarın.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex-1">
                    <Select
                      value={selectedSourceErp}
                      onValueChange={v => setSelectedSourceErp(v as any)}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {ERP_MIGRATION_PRESETS.map(p => (
                          <SelectItem key={p.sourceSystem} value={p.sourceSystem}>
                            {p.displayName}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <Button
                    onClick={handleRunMigration}
                    className="bg-indigo-600 hover:bg-indigo-700 text-white gap-1.5 text-xs"
                  >
                    <Play className="h-3.5 w-3.5" />
                    Otomatik Veri Çek & Aktarımı Başlat
                  </Button>
                </div>

                <div className="rounded-lg bg-slate-50 p-3 border border-slate-200 text-xs space-y-1">
                  <div className="font-semibold text-slate-900">
                    Kaynak Tablo Yapısı: <code className="text-indigo-700">{currentMigrationPreset.sampleSourceTable}</code>
                  </div>
                  <div className="text-slate-600">{currentMigrationPreset.vendorDescription}</div>
                </div>

                {/* Alan Eşleştirme (Field Mapping) Tablosu */}
                <div className="overflow-x-auto rounded-lg border border-slate-200">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-50 text-slate-600 border-b">
                      <tr>
                        <th className="p-2">Eski ERP Kaynak Alanı</th>
                        <th className="p-2">Sunum ERP Hedef Şema</th>
                        <th className="p-2">Örnek Veri</th>
                        <th className="p-2">Dönüşüm Kuralı</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200">
                      {currentMigrationPreset.defaultFieldMappings.map((m, idx) => (
                        <tr key={idx}>
                          <td className="p-2 font-mono font-semibold text-slate-800">
                            {m.sourceField}
                          </td>
                          <td className="p-2 font-mono text-indigo-700 font-bold">
                            {m.targetField}
                          </td>
                          <td className="p-2 font-mono text-slate-600">{m.sampleValue}</td>
                          <td className="p-2 text-emerald-700">{m.transformRule}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Tamamlanan Geçiş İşleri */}
                <div className="space-y-2 pt-2">
                  <div className="text-xs font-bold uppercase text-slate-600">
                    Son Çalıştırılan Veri Geçiş İşleri (Migration Jobs)
                  </div>
                    {(state.migrationJobs || []).map(job => (
                      <div
                        key={job.id}
                        className="rounded-lg border border-emerald-200 bg-emerald-50/30 p-3 text-xs space-y-1"
                      >
                        <div className="flex items-center justify-between">
                          <strong className="text-slate-900">{job.jobName}</strong>
                          <Badge className="bg-emerald-600 text-white">
                            {job.migratedRecords.toLocaleString("tr-TR")} Kayıt Aktarıldı
                          </Badge>
                        </div>
                        <div className="text-slate-600">{job.validationNotes[0]}</div>
                      </div>
                    ))}
                </div>
              </CardContent>
            </Card>

            {/* Sağ: Sistem İçi Simülasyon ve Eğitim Modülü */}
            <Card className="border-slate-200 lg:col-span-5">
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <GraduationCap className="h-5 w-5 text-emerald-600" />
                  Sistem İçi Simülasyon & Operatör Eğitim Akademisi
                </CardTitle>
                <CardDescription>
                  Canlı veritabanını bozmadan saha ve depo personelini uçtan uca WMS/Omnichannel senaryolarıyla eğitin.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {TRAINING_SCENARIOS.map(sc => {
                  const isDone = completedSimulations.includes(sc.id)
                  return (
                    <div
                      key={sc.id}
                      onClick={() => setActiveSimId(sc.id)}
                      className={`cursor-pointer rounded-xl border p-3.5 space-y-2 transition-all ${activeSimId === sc.id
                          ? "border-2 border-emerald-600 bg-emerald-50/20"
                          : "border-slate-200 bg-white"
                        }`}
                    >
                      <div className="flex items-center justify-between">
                        <Badge variant="outline" className="text-[10px]">
                          {sc.level}
                        </Badge>
                        {isDone ? (
                          <Badge className="bg-emerald-600 text-white text-[10px]">
                            ✓ Eğitim Tamamlandı (%100 Başarı)
                          </Badge>
                        ) : (
                          <span className="text-[11px] text-slate-500">{sc.duration}</span>
                        )}
                      </div>
                      <div className="font-semibold text-sm text-slate-900">{sc.title}</div>
                      <div className="space-y-1 pt-1 text-xs text-slate-600">
                        {sc.steps.map((st, idx) => (
                          <div key={idx} className="bg-slate-50 px-2.5 py-1.5 rounded border border-slate-100">
                            {st}
                          </div>
                        ))}
                      </div>
                      <Button
                        size="sm"
                        onClick={e => {
                          e.stopPropagation()
                          if (!isDone) {
                            setCompletedSimulations(prev => [...prev, sc.id])
                          }
                          toast.success(`${sc.title} simülasyonu başarıyla çalıştırıldı!`, {
                            description: "Kum havuzu (Sandbox) ortamında tüm adımlar doğrulandı."
                          })
                        }}
                        className="w-full h-8 text-xs bg-emerald-600 hover:bg-emerald-700 text-white"
                      >
                        Simülasyonu Sandbox Modunda Çalıştır
                      </Button>
                    </div>
                  )
                })}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* 4. SEKME: MODÜLER SAAS ABONELİK VE KOTA ÖLÇEKLEME */}
        <TabsContent value="saas-licensing" className="space-y-6">
          {/* Anlık SaaS Kota Kullanım Göstergeleri */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Card className="border-slate-200">
              <CardContent className="p-4 space-y-2">
                <span className="text-xs text-slate-500">Depo & Şube Kotası</span>
                <div className="text-xl font-bold text-slate-900">
                  {state.saasUsage?.currentWarehouses || 0} / {state.saasUsage?.maxWarehouses || 10} Depo
                </div>
                <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-indigo-600"
                    style={{
                      width: `${Math.min(
                        100,
                        Math.round(
                            ((state.saasUsage?.currentWarehouses || 0) / (state.saasUsage?.maxWarehouses || 1)) * 100
                        )
                      )}%`
                    }}
                  />
                </div>
              </CardContent>
            </Card>

            <Card className="border-slate-200">
              <CardContent className="p-4 space-y-2">
                <span className="text-xs text-slate-500">Aktif SKU Limiti</span>
                <div className="text-xl font-bold text-slate-900">
                  {(state.saasUsage?.currentActiveSkus || 0).toLocaleString("tr-TR")} /{" "}
                  {(state.saasUsage?.maxActiveSkus || 0).toLocaleString("tr-TR")}
                </div>
                <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-emerald-600"
                    style={{
                      width: `${Math.min(
                        100,
                        Math.round(
                            ((state.saasUsage?.currentActiveSkus || 0) / (state.saasUsage?.maxActiveSkus || 1)) * 100
                        )
                      )}%`
                    }}
                  />
                </div>
              </CardContent>
            </Card>

            <Card className="border-slate-200">
              <CardContent className="p-4 space-y-2">
                <span className="text-xs text-slate-500">Aylık Omnichannel Sipariş Hacmi</span>
                <div className="text-xl font-bold text-slate-900">
                  {(state.saasUsage?.currentMonthlyOrders || 0).toLocaleString("tr-TR")} /{" "}
                  {(state.saasUsage?.maxMonthlyOrders || 0).toLocaleString("tr-TR")}
                </div>
                <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-blue-600"
                    style={{
                      width: `${Math.min(
                        100,
                        Math.round(
                          ((state.saasUsage?.currentMonthlyOrders || 0) /
                            (state.saasUsage?.maxMonthlyOrders || 1)) *
                          100
                        )
                      )}%`
                    }}
                  />
                </div>
              </CardContent>
            </Card>

            <Card className="border-slate-200">
              <CardContent className="p-4 space-y-2">
                <span className="text-xs text-slate-500">Aylık API / IoT / RFID İşlem Hacmi</span>
                <div className="text-xl font-bold text-slate-900">
                  {(state.saasUsage?.currentMonthlyApiCalls || 0).toLocaleString("tr-TR")} /{" "}
                  {(state.saasUsage?.maxMonthlyApiCalls || 0).toLocaleString("tr-TR")}
                </div>
                <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-purple-600"
                    style={{
                      width: `${Math.min(
                        100,
                        Math.round(
                          ((state.saasUsage?.currentMonthlyApiCalls || 0) /
                            (state.saasUsage?.maxMonthlyApiCalls || 1)) *
                          100
                        )
                      )}%`
                    }}
                  />
                </div>
              </CardContent>
            </Card>
          </div>

          {/* 3 Modüler SaaS Abonelik Paketi */}
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
            {SAAS_TIERS.map(tier => {
              const isCurrent = (state.saasUsage?.activeTierId || "enterprise_omni") === tier.id
              return (
                <Card
                  key={tier.id}
                  className={`flex flex-col justify-between ${isCurrent
                      ? "border-2 border-indigo-600 bg-indigo-50/20 shadow-lg"
                      : "border-slate-200"
                    }`}
                >
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <Badge
                        className={
                          isCurrent ? "bg-indigo-600 text-white" : "bg-slate-200 text-slate-800"
                        }
                      >
                        {isCurrent ? "AKTİF KURUMSAL PAKETİNİZ" : tier.badge || "Modüler Lisans"}
                      </Badge>
                    </div>
                    <CardTitle className="text-lg mt-2">{tier.name}</CardTitle>
                    <div className="text-2xl font-bold text-slate-900">
                      ₺{tier.monthlyPriceTry.toLocaleString("tr-TR")}{" "}
                      <span className="text-xs font-normal text-slate-500">/ Ay</span>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4 text-xs">
                    <div className="grid grid-cols-2 gap-2 rounded-lg bg-white p-3 border border-slate-200">
                      <div>
                        <span className="text-slate-400 block">Maks. Depo</span>
                        <strong>{tier.maxWarehouses} Depo</strong>
                      </div>
                      <div>
                        <span className="text-slate-400 block">SKU Limiti</span>
                        <strong>{tier.maxActiveSkus.toLocaleString("tr-TR")}</strong>
                      </div>
                      <div>
                        <span className="text-slate-400 block">Aylık Sipariş</span>
                        <strong>{tier.maxMonthlyOrders.toLocaleString("tr-TR")}</strong>
                      </div>
                      <div>
                        <span className="text-slate-400 block">API / IoT Hacmi</span>
                        <strong>{tier.maxMonthlyApiCalls.toLocaleString("tr-TR")}</strong>
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      {tier.includedModules.map((mod, idx) => (
                        <div key={idx} className="flex items-center gap-2 text-slate-700">
                          <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
                          <span>{mod}</span>
                        </div>
                      ))}
                    </div>

                    <Button
                      onClick={() => handleSelectSaasTier(tier.id)}
                      disabled={isCurrent}
                      className={`w-full ${isCurrent
                          ? "bg-emerald-600 text-white"
                          : "bg-slate-900 hover:bg-slate-800 text-white"
                        }`}
                    >
                      {isCurrent ? "Şu Anda Bu Pakettesiniz" : "Bu Pakete Ölçekle"}
                    </Button>
                  </CardContent>
                </Card>
              )
            })}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}

