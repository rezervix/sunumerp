"use client"

import React, { useState, useEffect, useCallback } from "react"
import {
  Webhook,
  Puzzle,
  DatabaseZap,
  GraduationCap,
  ShieldCheck,
  KeyRound,
  CheckCircle2,
  Play,
  Terminal,
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
import { InventoryModuleNav } from "../stok/components/InventoryModuleNav"
import {
  ERP_MIGRATION_PRESETS,
  SAAS_TIERS,
  type ErpMigrationPreset
} from "@/lib/services/ecosystemSaasEngine"

const TRAINING_SCENARIOS = [
  {
    id: "sim-01",
    title: "Senaryo 1: Mal Kabul → Kalite Kontrol → Rafa Yerleştirme (Put-away) → Sevkiyat",
    level: "Temel & İleri Depo Operatörü",
    duration: "5 Dakika İnteraktif Simülasyon",
    steps: [
      "1. Tedarikçiden gelen sevkiyatın barkodu okutulur ve parti/SKT kaydı açılır.",
      "2. Kalite Kontrol onayından sonra sistem uygun raf adresini (StorageBin) önerir.",
      "3. Pazaryeri ve mağazadan gelen siparişler FEFO kuralına göre toplamaya düşer.",
      "4. Paketleme tamamlandığında stok bakiyesi düşer ve E-İrsaliye üretilir."
    ]
  },
  {
    id: "sim-02",
    title: "Senaryo 2: Kör Sayım (Blind Count), Fark Tespiti ve Maliyet Mahsuplaşması",
    level: "Depo Sorumlusu & Muhasebe",
    duration: "4 Dakika İnteraktif Simülasyon",
    steps: [
      "1. Sayım ekranında sistem stoğu gizlenerek (Kör Sayım) raflardaki ürünler sayılır.",
      "2. Sistemdeki bakiye ile sayılan miktar arasındaki fark otomatik tespit edilir.",
      "3. Yönetici onay ekranında FIFO maliyet katmanına göre fark tutarı hesaplanır.",
      "4. Tek tuşla stok bakiyesi güncellenir ve COUNT_ADJUSTMENT hareketi oluşturulur."
    ]
  }
]

export default function EcosystemApiMigrationAndSaasPage() {
  const [ecoData, setEcoData] = useState<any>({
    apiKeys: [],
    webhooks: [],
    plugins: [],
    migrationJobs: [],
    saasUsage: {}
  })
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState("api-webhooks")

  // Canlı Open REST API Test Yanıtı
  const [apiTestResponse, setApiTestResponse] = useState<string>("")
  const [isTestingApi, setIsTestingApi] = useState(false)

  // ERP Veri Geçiş Sihirbazı State
  const [selectedSourceErp, setSelectedSourceErp] =
    useState<ErpMigrationPreset["sourceSystem"]>("LOGO_TIGER")
  const [activeSimId, setActiveSimId] = useState("sim-01")
  const [completedSimulations, setCompletedSimulations] = useState<string[]>([])

  const fetchEcosystem = useCallback(async () => {
    try {
      setLoading(true)
      const res = await fetch("/api/ecosystem")
      const json = await res.json()
      if (json.success) {
        setEcoData(json)
      }
    } catch {
      toast.error("Ekosistem ayarları alınamadı.")
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchEcosystem()
  }, [fetchEcosystem])

  const currentMigrationPreset =
    ERP_MIGRATION_PRESETS.find(p => p.sourceSystem === selectedSourceErp) ||
    ERP_MIGRATION_PRESETS[0]

  const handleTestRestApi = async () => {
    setIsTestingApi(true)
    try {
      const res = await fetch("/api/v1/inventory")
      const json = await res.json()
      setApiTestResponse(JSON.stringify(json, null, 2))
      toast.success("GET /api/v1/inventory Açık REST API Çağrısı Başarılı (200 OK)")
    } catch {
      toast.error("API çağrısı sırasında hata oluştu.")
    } finally {
      setIsTestingApi(false)
    }
  }

  const handleTogglePlugin = async (pluginId: string) => {
    try {
      const res = await fetch("/api/ecosystem", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "toggle_plugin", pluginId })
      })
      const json = await res.json()
      if (json.success) {
        toast.success(
          json.data?.isInstalled
            ? `${json.data.name} eklentisi kuruldu ve aktif edildi.`
            : `${json.data?.name || "Eklenti"} devre dışı bırakıldı.`
        )
        fetchEcosystem()
      }
    } catch {
      toast.error("İşlem başarısız.")
    }
  }

  const handleRunMigration = async () => {
    try {
      const res = await fetch("/api/ecosystem", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "run_migration",
          sourceSystem: selectedSourceErp,
          entities: [
            "Stok Kartları & Barkodlar",
            "Çoklu Birim Dönüşümleri",
            "Depo & Raf (Bin) Bakiyeleri",
            "Parti/SKT & FIFO Maliyet Katmanları"
          ]
        })
      })
      const json = await res.json()
      if (json.success && json.data) {
        toast.success(`${json.data.jobName} Tamamlandı!`, {
          description: `${json.data.migratedRecords} kayıt doğrulamadan geçerek aktarıldı.`
        })
        fetchEcosystem()
      }
    } catch {
      toast.error("Veri geçişi başlatılamadı.")
    }
  }

  const handleSelectSaasTier = async (tierId: "starter" | "growth_wms" | "enterprise_omni") => {
    try {
      const res = await fetch("/api/ecosystem", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "update_saas_tier", tierId })
      })
      const json = await res.json()
      if (json.success) {
        const tierObj = SAAS_TIERS.find(t => t.id === tierId)
        toast.success(`Lisans Paketi Güncellendi: ${tierObj?.name}`)
        fetchEcosystem()
      }
    } catch {
      toast.error("Paket güncellenemedi.")
    }
  }

  return (
    <div className="min-h-screen bg-slate-50/60 p-4 sm:p-6 lg:p-8 space-y-6">
      {/* 0. STOK VE DEPO YÖNETİMİ BİRLEŞİK ÜST SEKME / NAVİGASYON */}
      <InventoryModuleNav />

      {/* Üst Başlık */}
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900">
              Açık API, ERP Veri Geçiş Sihirbazı & Sistem Ayarları
            </h1>
            <Button
              variant="ghost"
              size="sm"
              onClick={fetchEcosystem}
              disabled={loading}
              className="h-8 w-8 p-0 text-slate-400 hover:text-slate-700"
            >
              <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
            </Button>
          </div>
          <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
            Dış sistemler için REST API & Webhook uç noktaları, eklenti mağazası, eski ERP veri aktarım sihirbazı ve sistem kotaları
          </p>
        </div>
      </div>

      {/* Sekmeler */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="flex flex-wrap h-auto gap-1 bg-white border border-slate-200 p-1">
          <TabsTrigger value="api-webhooks" className="gap-1.5 text-xs sm:text-sm">
            <Webhook className="h-4 w-4" />
            1. Açık REST API & Webhook Altyapısı
          </TabsTrigger>
          <TabsTrigger value="plugin-marketplace" className="gap-1.5 text-xs sm:text-sm">
            <Puzzle className="h-4 w-4" />
            2. Eklenti Mağazası (Marketplace)
          </TabsTrigger>
          <TabsTrigger value="migration-training" className="gap-1.5 text-xs sm:text-sm">
            <DatabaseZap className="h-4 w-4" />
            3. ERP Veri Geçiş Sihirbazı & Akademi
          </TabsTrigger>
          <TabsTrigger value="saas-licensing" className="gap-1.5 text-xs sm:text-sm">
            <ShieldCheck className="h-4 w-4" />
            4. Kapasite & Kota Yönetimi
          </TabsTrigger>
        </TabsList>

        {/* 1. SEKME: AÇIK REST API VE WEBHOOK ALTYAPISI */}
        <TabsContent value="api-webhooks" className="space-y-6">
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
            <Card className="border-slate-200 lg:col-span-6">
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <KeyRound className="h-4 w-4 text-indigo-600" />
                  Dış Sistemler & Barkod Terminalleri İçin REST API Anahtarları
                </CardTitle>
                <CardDescription>
                  B2B portal, 3PL kargo ve el terminalleri için yetkilendirme anahtarları.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {(ecoData.apiKeys || []).map((ak: any) => (
                  <div key={ak.id} className="rounded-lg border border-slate-200 p-3.5 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-sm text-slate-900">{ak.name}</span>
                      <Badge className="bg-emerald-100 text-emerald-800">{ak.iotOrSystemType}</Badge>
                    </div>
                    <div className="font-mono text-xs bg-slate-100 px-2.5 py-1 rounded text-slate-700">
                      {ak.maskedKey}
                    </div>
                  </div>
                ))}

                {/* Canlı /api/v1/inventory Test Konsolu */}
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
                    <pre className="text-[11px] font-mono text-slate-300 overflow-x-auto max-h-48 bg-slate-900 p-2.5 rounded">
                      {apiTestResponse}
                    </pre>
                  )}
                </div>
              </CardContent>
            </Card>

            <Card className="border-slate-200 lg:col-span-6">
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <Webhook className="h-4 w-4 text-emerald-600" />
                  Gerçek Zamanlı Webhook Abonelikleri
                </CardTitle>
                <CardDescription>
                  Stok değişimi, düşük stok uyarısı ve sevkiyat olaylarını dış sistemlere anlık ileten uç noktalar.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {(ecoData.webhooks || []).map((whk: any) => (
                  <div key={whk.id} className="rounded-lg border border-slate-200 p-3.5 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-sm text-slate-900">{whk.name}</span>
                      <Badge className="bg-emerald-600 text-white">HTTP {whk.lastStatusCode} OK</Badge>
                    </div>
                    <div className="font-mono text-xs text-indigo-700 break-all">{whk.targetUrl}</div>
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* 2. SEKME: EKLENTİ MAĞAZASI */}
        <TabsContent value="plugin-marketplace" className="space-y-6">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
            {(ecoData.plugins || []).map((plg: any) => (
              <Card key={plg.id} className="border-slate-200 flex flex-col justify-between">
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <Badge variant="outline">{plg.category}</Badge>
                    <span className="text-xs font-semibold text-amber-600">★ {plg.rating}</span>
                  </div>
                  <CardTitle className="text-base mt-1.5">{plg.name}</CardTitle>
                  <CardDescription className="text-xs">
                    Geliştirici: <strong>{plg.vendor}</strong> • v{plg.version}
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-3 text-xs">
                  <p className="text-slate-600 leading-relaxed">{plg.description}</p>
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
                      {plg.isInstalled ? "Kurulu (Devre Dışı Bırak)" : "Kur & Aktifleştir"}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        {/* 3. SEKME: ERP VERİ GEÇİŞ SİHİRBAZI & EĞİTİM */}
        <TabsContent value="migration-training" className="space-y-6">
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
            <Card className="border-slate-200 lg:col-span-7">
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <DatabaseZap className="h-4 w-4 text-indigo-600" />
                  Otomatik ERP Veri Geçiş (Migration) Sihirbazı
                </CardTitle>
                <CardDescription>
                  Logo Tiger/Wings, Nebim V3, SAP Business One, Odoo ve Zoho Inventory tablolarını içe aktarın.
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
                    Veri Doğrula & Aktar
                  </Button>
                </div>

                <div className="space-y-2 pt-2">
                  {(ecoData.migrationJobs || []).map((job: any) => (
                    <div
                      key={job.id}
                      className="rounded-lg border border-emerald-200 bg-emerald-50/30 p-3 text-xs space-y-1"
                    >
                      <div className="flex items-center justify-between">
                        <strong className="text-slate-900">{job.jobName}</strong>
                        <Badge className="bg-emerald-600 text-white">
                          {job.migratedRecords} Kayıt Aktarıldı
                        </Badge>
                      </div>
                      <div className="text-slate-600">{job.validationNotes?.[0]}</div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card className="border-slate-200 lg:col-span-5">
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <GraduationCap className="h-5 w-5 text-emerald-600" />
                  Operatör Eğitim Senaryoları
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {TRAINING_SCENARIOS.map(sc => {
                  const isDone = completedSimulations.includes(sc.id)
                  return (
                    <div
                      key={sc.id}
                      onClick={() => setActiveSimId(sc.id)}
                      className={`cursor-pointer rounded-xl border p-3.5 space-y-2 ${
                        activeSimId === sc.id
                          ? "border-2 border-emerald-600 bg-emerald-50/20"
                          : "border-slate-200 bg-white"
                      }`}
                    >
                      <div className="font-semibold text-sm text-slate-900">{sc.title}</div>
                      <Button
                        size="sm"
                        onClick={e => {
                          e.stopPropagation()
                          if (!isDone) setCompletedSimulations(prev => [...prev, sc.id])
                          toast.success(`${sc.title} tamamlandı!`)
                        }}
                        className="w-full h-8 text-xs bg-emerald-600 hover:bg-emerald-700 text-white"
                      >
                        {isDone ? "✓ Tamamlandı" : "Senaryoyu Çalıştır"}
                      </Button>
                    </div>
                  )
                })}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* 4. SEKME: KOTA & PAKETLER */}
        <TabsContent value="saas-licensing" className="space-y-6">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            {SAAS_TIERS.map(tier => {
              const isCurrent = ecoData.saasUsage?.activeTierId === tier.id
              return (
                <Card
                  key={tier.id}
                  className={isCurrent ? "border-2 border-indigo-600" : "border-slate-200"}
                >
                  <CardHeader>
                    <CardTitle className="text-base">{tier.name}</CardTitle>
                    <CardDescription className="text-xs">
                      ₺{tier.monthlyPriceTry.toLocaleString("tr-TR")} / Ay
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-3 text-xs">
                    <div className="space-y-1">
                      {tier.includedModules.map((m, i) => (
                        <div key={i} className="flex items-center gap-1.5 text-slate-700">
                          <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
                          <span>{m}</span>
                        </div>
                      ))}
                    </div>
                    <Button
                      size="sm"
                      onClick={() => handleSelectSaasTier(tier.id)}
                      className="w-full h-8 text-xs bg-indigo-600 hover:bg-indigo-700 text-white"
                    >
                      {isCurrent ? "Aktif Paket" : "Bu Pakete Geç"}
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
