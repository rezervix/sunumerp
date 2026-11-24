"use client"

import React, { useState, useEffect, useCallback } from "react"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
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
  IconRefresh,
  IconCheck,
  IconBoxes
} from "@/components/ui/app-icons"
import {
  Webhook,
  Puzzle,
  Database,
  GraduationCap,
  ShieldCheck,
  KeyRound,
  Play,
  Terminal
} from "lucide-react"
import {
  ERP_MIGRATION_PRESETS,
  SAAS_TIERS,
  type ErpMigrationPreset
} from "@/lib/services/ecosystemSaasEngine"
import { safeText, safeNumber } from "@/lib/utils/safe-display"

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
    <div className="space-y-8">
      {/* 0. MODÜL İÇİ NAVİGASYON */}
      <InventoryModuleNav />

      {/* 1. ÜST BÖLGE: BAŞLIK + YENİLEME AKSİYONU */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-2xl font-semibold tracking-tight text-[--text]">
              Envanter Ekosistemi & Entegrasyonlar
            </h1>
            <Button
              variant="ghost"
              size="sm"
              onClick={fetchEcosystem}
              disabled={loading}
              className="h-8 w-8 p-0 text-[--text-muted] hover:text-[--text] hover:bg-[--muted-bg] rounded-full cursor-pointer"
              title="Ekosistemi Yenile"
            >
              <IconRefresh size={15} className={loading ? "animate-spin text-[--brand]" : ""} />
            </Button>
          </div>
          <p className="text-xs sm:text-sm text-[--text-muted] mt-1">
            Dış sistemler için REST API & Webhook uç noktaları, eklenti mağazası, ERP veri aktarım sihirbazı ve lisans kotaları
          </p>
        </div>
      </div>

      {/* 2. ORTA BÖLGE: SEKMELER */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="bg-[--muted-bg] border border-[--line] p-1 rounded-2xl h-auto grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-1">
          <TabsTrigger
            value="api-webhooks"
            className="flex items-center gap-2 py-2 px-3.5 rounded-xl text-xs sm:text-sm font-medium transition data-[state=active]:bg-white data-[state=active]:text-[--brand] data-[state=active]:shadow-xs"
          >
            <Webhook className="h-4 w-4" />
            1. Açık REST API & Webhook
          </TabsTrigger>
          <TabsTrigger
            value="plugin-marketplace"
            className="flex items-center gap-2 py-2 px-3.5 rounded-xl text-xs sm:text-sm font-medium transition data-[state=active]:bg-white data-[state=active]:text-[--brand] data-[state=active]:shadow-xs"
          >
            <Puzzle className="h-4 w-4" />
            2. Eklenti Mağazası
          </TabsTrigger>
          <TabsTrigger
            value="migration-training"
            className="flex items-center gap-2 py-2 px-3.5 rounded-xl text-xs sm:text-sm font-medium transition data-[state=active]:bg-white data-[state=active]:text-[--brand] data-[state=active]:shadow-xs"
          >
            <Database className="h-4 w-4" />
            3. ERP Veri Geçiş Sihirbazı
          </TabsTrigger>
          <TabsTrigger
            value="saas-licensing"
            className="flex items-center gap-2 py-2 px-3.5 rounded-xl text-xs sm:text-sm font-medium transition data-[state=active]:bg-white data-[state=active]:text-[--brand] data-[state=active]:shadow-xs"
          >
            <ShieldCheck className="h-4 w-4" />
            4. Kapasite & Kota Yönetimi
          </TabsTrigger>
        </TabsList>

        {/* 1. SEKME: AÇIK REST API VE WEBHOOK ALTYAPISI */}
        <TabsContent value="api-webhooks" className="space-y-6 focus-visible:outline-none">
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
            {/* SOL KART: REST API ANAHTARLARI */}
            <div className="bg-white/80 backdrop-blur-xl border border-[--line] rounded-[20px] p-6 lg:col-span-6 space-y-4 shadow-card">
              <div>
                <h3 className="text-sm font-semibold text-[--text] flex items-center gap-2">
                  <KeyRound className="h-4 w-4 text-[--brand]" />
                  Dış Sistemler & Barkod Terminalleri İçin REST API Anahtarları
                </h3>
                <p className="text-xs text-[--text-muted] mt-1">
                  B2B portal, 3PL kargo ve el terminalleri için yetkilendirme anahtarları.
                </p>
              </div>

              <div className="space-y-3">
                {(ecoData.apiKeys || []).map((ak: any) => (
                  <div key={ak.id} className="rounded-xl border border-[--line] bg-[--page]/60 p-3.5 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="font-medium text-xs sm:text-sm text-[--text]">{safeText(ak.name)}</span>
                      <Badge variant="brand" size="sm">
                        {safeText(ak.iotOrSystemType)}
                      </Badge>
                    </div>
                    <div className="font-mono text-xs bg-white px-2.5 py-1.5 rounded-lg text-[--text-2] border border-[--line]">
                      {safeText(ak.maskedKey)}
                    </div>
                  </div>
                ))}

                {/* Canlı /api/v1/inventory Test Konsolu */}
                <div className="rounded-xl bg-[--muted-bg]/60 border border-[--line] p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-xs font-mono text-[--brand] font-semibold">
                      <Terminal className="h-4 w-4" />
                      GET /api/v1/inventory
                    </div>
                    <Button
                      size="sm"
                      variant="primary"
                      onClick={handleTestRestApi}
                      disabled={isTestingApi}
                      className="h-8 rounded-xl text-xs gap-1.5"
                    >
                      <Play className="h-3 w-3" />
                      Canlı API Test Et
                    </Button>
                  </div>
                  {apiTestResponse && (
                    <pre className="text-[11px] font-mono text-[--text] overflow-x-auto max-h-48 bg-white p-3 rounded-lg border border-[--line]">
                      {apiTestResponse}
                    </pre>
                  )}
                </div>
              </div>
            </div>

            {/* SAĞ KART: WEBHOOK ABONELİKLERİ */}
            <div className="bg-white/80 backdrop-blur-xl border border-[--line] rounded-[20px] p-6 lg:col-span-6 space-y-4 shadow-card">
              <div>
                <h3 className="text-sm font-semibold text-[--text] flex items-center gap-2">
                  <Webhook className="h-4 w-4 text-[--brand]" />
                  Gerçek Zamanlı Webhook Abonelikleri
                </h3>
                <p className="text-xs text-[--text-muted] mt-1">
                  Stok değişimi, düşük stok uyarısı ve sevkiyat olaylarını dış sistemlere anlık ileten uç noktalar.
                </p>
              </div>

              <div className="space-y-3">
                {(ecoData.webhooks || []).map((whk: any) => (
                  <div key={whk.id} className="rounded-xl border border-[--line] bg-[--page]/60 p-3.5 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="font-medium text-xs sm:text-sm text-[--text]">{safeText(whk.name)}</span>
                      <Badge variant="ok" size="sm">
                        HTTP {whk.lastStatusCode} OK
                      </Badge>
                    </div>
                    <div className="font-mono text-xs text-[--text-muted] break-all bg-white p-2 rounded-lg border border-[--line]">
                      {safeText(whk.targetUrl)}
                    </div>
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
              <div
                key={plg.id}
                className="bg-white/80 backdrop-blur-xl border border-[--line] rounded-[20px] p-6 flex flex-col justify-between space-y-4 shadow-card hover:border-[--brand-line] transition-colors"
              >
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Badge variant="neutral" size="sm" className="font-mono">
                      {safeText(plg.category)}
                    </Badge>
                    <span className="text-xs font-medium text-[--warn]">★ {plg.rating}</span>
                  </div>
                  <h3 className="text-sm font-semibold text-[--text] mt-1.5">{safeText(plg.name)}</h3>
                  <p className="text-xs text-[--text-muted]">
                    Geliştirici: <strong className="text-[--text] font-medium">{safeText(plg.vendor)}</strong> • v{safeText(plg.version)}
                  </p>
                  <p className="text-xs text-[--text-muted] leading-relaxed pt-1">{safeText(plg.description)}</p>
                </div>

                <div className="pt-3 border-t border-[--line-soft] flex items-center justify-between">
                  <span className="font-semibold text-[--text] text-xs">{safeText(plg.pricingTier)}</span>
                  <Button
                    size="sm"
                    variant={plg.isInstalled ? "secondary" : "primary"}
                    onClick={() => handleTogglePlugin(plg.id)}
                    className="rounded-xl h-8 text-xs font-medium"
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
            <div className="bg-white/80 backdrop-blur-xl border border-[--line] rounded-[20px] p-6 lg:col-span-7 space-y-4 shadow-card">
              <div>
                <h3 className="text-sm font-semibold text-[--text] flex items-center gap-2">
                  <Database className="h-4 w-4 text-[--brand]" />
                  Otomatik ERP Veri Geçiş (Migration) Sihirbazı
                </h3>
                <p className="text-xs text-[--text-muted] mt-1">
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
                      <SelectTrigger className="bg-white border-[--line] rounded-xl text-[--text] focus:border-[--brand]">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="bg-white border border-[--line] text-[--text] shadow-lg">
                        {ERP_MIGRATION_PRESETS.map(p => (
                          <SelectItem key={p.sourceSystem} value={p.sourceSystem}>
                            {p.displayName}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <Button
                    variant="primary"
                    onClick={handleRunMigration}
                    className="rounded-xl gap-1.5 text-xs h-9"
                  >
                    <Play className="h-3.5 w-3.5" />
                    Veri Doğrula & Aktar
                  </Button>
                </div>

                <div className="space-y-2 pt-2">
                  {(ecoData.migrationJobs || []).map((job: any) => (
                    <div
                      key={job.id}
                      className="rounded-xl border border-[--line] bg-[--page]/60 p-3 text-xs space-y-1"
                    >
                      <div className="flex items-center justify-between">
                        <strong className="text-[--text] font-medium">{safeText(job.jobName)}</strong>
                        <Badge variant="ok" size="sm">
                          {job.migratedRecords} Kayıt Aktarıldı
                        </Badge>
                      </div>
                      <div className="text-[--text-muted]">{safeText(job.validationNotes?.[0])}</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="bg-white/80 backdrop-blur-xl border border-[--line] rounded-[20px] p-6 lg:col-span-5 space-y-4 shadow-card">
              <div>
                <h3 className="text-sm font-semibold text-[--text] flex items-center gap-2">
                  <GraduationCap className="h-5 w-5 text-[--brand]" />
                  Operatör Eğitim Senaryoları
                </h3>
                <p className="text-xs text-[--text-muted] mt-1">
                  Envanter ve depo süreçlerini canlı adımlarla test edin.
                </p>
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
                          ? "border-[--brand] ring-1 ring-[--brand]/20 bg-[--brand-soft]/30"
                          : "border-[--line] bg-[--page]/40 hover:bg-white"
                      }`}
                    >
                      <div className="font-medium text-xs sm:text-sm text-[--text]">{sc.title}</div>
                      <Button
                        size="sm"
                        variant={isDone ? "secondary" : "primary"}
                        onClick={e => {
                          e.stopPropagation()
                          if (!isDone) setCompletedSimulations(prev => [...prev, sc.id])
                          toast.success(`${sc.title} tamamlandı!`)
                        }}
                        className="w-full h-8 text-xs rounded-xl font-medium"
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
                  className={`bg-white/80 backdrop-blur-xl border rounded-[20px] p-6 space-y-4 transition-all shadow-card ${
                    isCurrent
                      ? "border-[--brand] ring-2 ring-[--brand]/20 shadow-md"
                      : "border-[--line]"
                  }`}
                >
                  <div className="space-y-1">
                    <div className="flex items-center justify-between">
                      <h3 className="text-base font-semibold text-[--text]">{tier.name}</h3>
                      {isCurrent && (
                        <Badge variant="brand" size="sm">
                          Aktif Lisans
                        </Badge>
                      )}
                    </div>
                    <p className="text-xs text-[--text-muted]">
                      ₺{tier.monthlyPriceTry.toLocaleString("tr-TR")} / Ay
                    </p>
                  </div>
                  <div className="space-y-3 text-xs">
                    <div className="space-y-1.5">
                      {tier.includedModules.map((m, i) => (
                        <div key={i} className="flex items-center gap-1.5 text-[--text-2]">
                          <IconCheck size={14} className="text-[--brand] shrink-0" />
                          <span>{m}</span>
                        </div>
                      ))}
                    </div>
                    <Button
                      size="sm"
                      variant={isCurrent ? "secondary" : "primary"}
                      onClick={() => handleSelectSaasTier(tier.id)}
                      className="w-full h-8 text-xs rounded-xl font-medium"
                    >
                      {isCurrent ? "Mevcut Paket" : "Bu Pakete Geç"}
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
