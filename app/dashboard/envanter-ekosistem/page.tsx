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
import { Button } from "@/components/ui/button"
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
    <div className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-[1600px] mx-auto">
      {/* 0. STOK VE DEPO YÖNETİMİ BİRLEŞİK ÜST SEKME / NAVİGASYON */}
      <InventoryModuleNav />

      {/* Üst Başlık */}
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between bg-[#111513]/90 border border-white/[0.06] p-5 sm:p-6 rounded-[20px]">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl sm:text-2xl font-semibold tracking-tight text-white">
              Açık API, ERP Veri Geçiş Sihirbazı & Sistem Ayarları
            </h1>
            <Button
              variant="ghost"
              size="sm"
              onClick={fetchEcosystem}
              disabled={loading}
              className="h-8 w-8 p-0 text-zinc-400 hover:text-white"
            >
              <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
            </Button>
          </div>
          <p className="text-xs sm:text-sm text-zinc-400 mt-0.5">
            Dış sistemler için REST API & Webhook uç noktaları, eklenti mağazası, eski ERP veri aktarım sihirbazı ve sistem kotaları
          </p>
        </div>
      </div>

      {/* Sekmeler */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="bg-[#111513]/90 border border-white/[0.06] p-1.5 rounded-[20px] h-auto grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-1.5">
          <TabsTrigger
            value="api-webhooks"
            className="flex items-center gap-2 py-2.5 px-4 rounded-xl text-xs sm:text-sm font-medium text-zinc-400 hover:text-white transition data-[state=active]:bg-white/10 data-[state=active]:text-white"
          >
            <Webhook className="h-4 w-4 text-emerald-400" />
            1. Açık REST API & Webhook
          </TabsTrigger>
          <TabsTrigger
            value="plugin-marketplace"
            className="flex items-center gap-2 py-2.5 px-4 rounded-xl text-xs sm:text-sm font-medium text-zinc-400 hover:text-white transition data-[state=active]:bg-white/10 data-[state=active]:text-white"
          >
            <Puzzle className="h-4 w-4 text-emerald-400" />
            2. Eklenti Mağazası
          </TabsTrigger>
          <TabsTrigger
            value="migration-training"
            className="flex items-center gap-2 py-2.5 px-4 rounded-xl text-xs sm:text-sm font-medium text-zinc-400 hover:text-white transition data-[state=active]:bg-white/10 data-[state=active]:text-white"
          >
            <DatabaseZap className="h-4 w-4 text-emerald-400" />
            3. ERP Veri Geçiş Sihirbazı
          </TabsTrigger>
          <TabsTrigger
            value="saas-licensing"
            className="flex items-center gap-2 py-2.5 px-4 rounded-xl text-xs sm:text-sm font-medium text-zinc-400 hover:text-white transition data-[state=active]:bg-white/10 data-[state=active]:text-white"
          >
            <ShieldCheck className="h-4 w-4 text-emerald-400" />
            4. Kapasite & Kota Yönetimi
          </TabsTrigger>
        </TabsList>

        {/* 1. SEKME: AÇIK REST API VE WEBHOOK ALTYAPISI */}
        <TabsContent value="api-webhooks" className="space-y-6 focus-visible:outline-none">
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
            <div className="bg-[#111513]/90 border border-white/[0.06] rounded-[20px] p-6 lg:col-span-6 space-y-4">
              <div>
                <h3 className="text-base font-semibold text-white flex items-center gap-2">
                  <KeyRound className="h-4 w-4 text-emerald-400" />
                  Dış Sistemler & Barkod Terminalleri İçin REST API Anahtarları
                </h3>
                <p className="text-xs text-zinc-400 mt-1">
                  B2B portal, 3PL kargo ve el terminalleri için yetkilendirme anahtarları.
                </p>
              </div>

              <div className="space-y-3">
                {(ecoData.apiKeys || []).map((ak: any) => (
                  <div key={ak.id} className="rounded-xl border border-white/[0.06] bg-[#0d100e] p-3.5 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="font-medium text-sm text-white">{ak.name}</span>
                      <span className="bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 rounded-full px-2.5 py-0.5 text-xs font-medium">
                        {ak.iotOrSystemType}
                      </span>
                    </div>
                    <div className="font-mono text-xs bg-black/40 px-2.5 py-1.5 rounded-lg text-zinc-400 border border-white/[0.04]">
                      {ak.maskedKey}
                    </div>
                  </div>
                ))}

                {/* Canlı /api/v1/inventory Test Konsolu */}
                <div className="rounded-xl bg-black/40 border border-white/[0.06] text-white p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-xs font-mono text-emerald-400">
                      <Terminal className="h-4 w-4" />
                      GET /api/v1/inventory
                    </div>
                    <Button
                      size="sm"
                      onClick={handleTestRestApi}
                      disabled={isTestingApi}
                      className="h-8 bg-emerald-400 hover:bg-emerald-300 text-black font-semibold text-xs gap-1.5 rounded-full shadow-[0_0_15px_rgba(52,211,153,0.2)]"
                    >
                      <Play className="h-3 w-3" />
                      Canlı API Test Et
                    </Button>
                  </div>
                  {apiTestResponse && (
                    <pre className="text-[11px] font-mono text-emerald-300/90 overflow-x-auto max-h-48 bg-black/60 p-3 rounded-lg border border-white/[0.04]">
                      {apiTestResponse}
                    </pre>
                  )}
                </div>
              </div>
            </div>

            <div className="bg-[#111513]/90 border border-white/[0.06] rounded-[20px] p-6 lg:col-span-6 space-y-4">
              <div>
                <h3 className="text-base font-semibold text-white flex items-center gap-2">
                  <Webhook className="h-4 w-4 text-emerald-400" />
                  Gerçek Zamanlı Webhook Abonelikleri
                </h3>
                <p className="text-xs text-zinc-400 mt-1">
                  Stok değişimi, düşük stok uyarısı ve sevkiyat olaylarını dış sistemlere anlık ileten uç noktalar.
                </p>
              </div>

              <div className="space-y-3">
                {(ecoData.webhooks || []).map((whk: any) => (
                  <div key={whk.id} className="rounded-xl border border-white/[0.06] bg-[#0d100e] p-3.5 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="font-medium text-sm text-white">{whk.name}</span>
                      <span className="bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 rounded-full px-2.5 py-0.5 text-xs font-medium">
                        HTTP {whk.lastStatusCode} OK
                      </span>
                    </div>
                    <div className="font-mono text-xs text-zinc-400 break-all">{whk.targetUrl}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </TabsContent>

        {/* 2. SEKME: EKLENTİ MAĞAZASI */}
        <TabsContent value="plugin-marketplace" className="space-y-6 focus-visible:outline-none">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
            {(ecoData.plugins || []).map((plg: any) => (
              <div key={plg.id} className="bg-[#111513]/90 border border-white/[0.06] rounded-[20px] p-6 flex flex-col justify-between space-y-4">
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="bg-white/5 text-zinc-300 border border-white/10 rounded-full px-2.5 py-0.5 text-xs font-medium font-mono">
                      {plg.category}
                    </span>
                    <span className="text-xs font-medium text-amber-400">★ {plg.rating}</span>
                  </div>
                  <h3 className="text-base font-semibold text-white mt-1.5">{plg.name}</h3>
                  <p className="text-xs text-zinc-400">
                    Geliştirici: <strong className="text-white font-medium">{plg.vendor}</strong> • v{plg.version}
                  </p>
                  <p className="text-xs text-zinc-400 leading-relaxed pt-1">{plg.description}</p>
                </div>

                <div className="pt-3 border-t border-white/[0.06] flex items-center justify-between">
                  <span className="font-medium text-white text-xs">{plg.pricingTier}</span>
                  <Button
                    size="sm"
                    variant={plg.isInstalled ? "outline" : "default"}
                    onClick={() => handleTogglePlugin(plg.id)}
                    className={
                      plg.isInstalled
                        ? "border-emerald-500/30 text-emerald-400 bg-emerald-500/10 hover:bg-emerald-500/20 rounded-full h-8 text-xs font-medium"
                        : "bg-emerald-400 hover:bg-emerald-300 text-black font-semibold rounded-full h-8 text-xs shadow-[0_0_15px_rgba(52,211,153,0.2)]"
                    }
                  >
                    {plg.isInstalled ? "Kurulu (Devre Dışı Bırak)" : "Kur & Aktifleştir"}
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </TabsContent>

        {/* 3. SEKME: ERP VERİ GEÇİŞ SİHİRBAZI & EĞİTİM */}
        <TabsContent value="migration-training" className="space-y-6 focus-visible:outline-none">
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
            <div className="bg-[#111513]/90 border border-white/[0.06] rounded-[20px] p-6 lg:col-span-7 space-y-4">
              <div>
                <h3 className="text-base font-semibold text-white flex items-center gap-2">
                  <DatabaseZap className="h-4 w-4 text-emerald-400" />
                  Otomatik ERP Veri Geçiş (Migration) Sihirbazı
                </h3>
                <p className="text-xs text-zinc-400 mt-1">
                  Logo Tiger/Wings, Nebim V3, SAP Business One, Odoo ve Zoho Inventory tablolarını içe aktarın.
                </p>
              </div>

              <div className="space-y-4">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex-1">
                    <Select
                      value={selectedSourceErp}
                      onValueChange={v => setSelectedSourceErp(v as any)}
                    >
                      <SelectTrigger className="bg-white/[0.03] border-white/10 rounded-xl text-white focus:outline-none">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="bg-[#111513] border-white/10 text-white">
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
                    className="bg-emerald-400 hover:bg-emerald-300 text-black font-semibold rounded-full gap-1.5 text-xs shadow-[0_0_15px_rgba(52,211,153,0.2)]"
                  >
                    <Play className="h-3.5 w-3.5" />
                    Veri Doğrula & Aktar
                  </Button>
                </div>

                <div className="space-y-2 pt-2">
                  {(ecoData.migrationJobs || []).map((job: any) => (
                    <div
                      key={job.id}
                      className="rounded-xl border border-white/[0.06] bg-[#0d100e] p-3 text-xs space-y-1"
                    >
                      <div className="flex items-center justify-between">
                        <strong className="text-white font-medium">{job.jobName}</strong>
                        <span className="bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 rounded-full px-2.5 py-0.5 text-xs font-medium">
                          {job.migratedRecords} Kayıt Aktarıldı
                        </span>
                      </div>
                      <div className="text-zinc-400">{job.validationNotes?.[0]}</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="bg-[#111513]/90 border border-white/[0.06] rounded-[20px] p-6 lg:col-span-5 space-y-4">
              <div>
                <h3 className="text-base font-semibold text-white flex items-center gap-2">
                  <GraduationCap className="h-5 w-5 text-emerald-400" />
                  Operatör Eğitim Senaryoları
                </h3>
              </div>
              <div className="space-y-3">
                {TRAINING_SCENARIOS.map(sc => {
                  const isDone = completedSimulations.includes(sc.id)
                  return (
                    <div
                      key={sc.id}
                      onClick={() => setActiveSimId(sc.id)}
                      className={`cursor-pointer rounded-xl border p-3.5 space-y-2.5 transition-all ${
                        activeSimId === sc.id
                          ? "border-emerald-500/40 ring-1 ring-emerald-500/20 bg-[#0d100e]"
                          : "border-white/[0.06] bg-[#0d100e]/50 hover:bg-[#0d100e]"
                      }`}
                    >
                      <div className="font-medium text-sm text-white">{sc.title}</div>
                      <Button
                        size="sm"
                        onClick={e => {
                          e.stopPropagation()
                          if (!isDone) setCompletedSimulations(prev => [...prev, sc.id])
                          toast.success(`${sc.title} tamamlandı!`)
                        }}
                        className={`w-full h-8 text-xs rounded-full font-semibold transition ${
                          isDone
                            ? "bg-white/10 text-emerald-400 border border-emerald-500/30"
                            : "bg-emerald-400 hover:bg-emerald-300 text-black shadow-[0_0_15px_rgba(52,211,153,0.2)]"
                        }`}
                      >
                        {isDone ? "✓ Tamamlandı" : "Senaryoyu Çalıştır"}
                      </Button>
                    </div>
                  )
                })}
              </div>
            </div>
          </div>
        </TabsContent>

        {/* 4. SEKME: KOTA & PAKETLER */}
        <TabsContent value="saas-licensing" className="space-y-6 focus-visible:outline-none">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            {SAAS_TIERS.map(tier => {
              const isCurrent = ecoData.saasUsage?.activeTierId === tier.id
              return (
                <div
                  key={tier.id}
                  className={`bg-[#111513]/90 border rounded-[20px] p-6 space-y-4 transition-all ${
                    isCurrent ? "border-emerald-500/50 ring-1 ring-emerald-500/30 shadow-[0_0_20px_rgba(52,211,153,0.15)]" : "border-white/[0.06]"
                  }`}
                >
                  <div className="space-y-1">
                    <h3 className="text-base font-semibold text-white">{tier.name}</h3>
                    <p className="text-xs text-zinc-400">
                      ₺{tier.monthlyPriceTry.toLocaleString("tr-TR")} / Ay
                    </p>
                  </div>
                  <div className="space-y-3 text-xs">
                    <div className="space-y-1.5">
                      {tier.includedModules.map((m, i) => (
                        <div key={i} className="flex items-center gap-1.5 text-zinc-300">
                          <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400 shrink-0" />
                          <span>{m}</span>
                        </div>
                      ))}
                    </div>
                    <Button
                      size="sm"
                      onClick={() => handleSelectSaasTier(tier.id)}
                      className={`w-full h-8 text-xs rounded-full font-semibold transition ${
                        isCurrent
                          ? "bg-white/10 text-emerald-400 border border-emerald-500/30"
                          : "bg-emerald-400 hover:bg-emerald-300 text-black shadow-[0_0_15px_rgba(52,211,153,0.2)]"
                      }`}
                    >
                      {isCurrent ? "Aktif Paket" : "Bu Pakete Geç"}
                    </Button>
                  </div>
                </div>
              )
            })}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}
