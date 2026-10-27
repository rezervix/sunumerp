"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { useAuth } from "@/lib/auth/context"
import { toast } from "sonner"
import type { SystemConfig } from "@/lib/system-config"
import {
  Terminal,
  ShieldAlert,
  Cpu,
  Wrench,
  AlertTriangle,
  RotateCcw,
  Save,
  Loader2,
  Activity,
  CheckCircle2,
  Database,
  Layers,
  Lock,
  RefreshCw,
  Info,
  Server,
  Zap
} from "lucide-react"

export default function DeveloperConsolePage() {
  const { session, loading: authLoading, isPlatformDeveloper } = useAuth()
  const router = useRouter()

  const [activeTab, setActiveTab] = useState<string>("environment")
  const [loading, setLoading] = useState<boolean>(true)
  const [saving, setSaving] = useState<boolean>(false)
  const [config, setConfig] = useState<Partial<SystemConfig>>({})
  const [devInfo, setDevInfo] = useState<{
    environment?: string
    version?: string
    timestamp?: string
    config?: Partial<SystemConfig>
  } | null>(null)

  // Gerçek diagnostik ölçümler
  const [realFps, setRealFps] = useState<number | null>(null)
  const [jankMs, setJankMs] = useState<number | null>(null)
  const [apiPingMs, setApiPingMs] = useState<number | null>(null)
  const [diagnosticsLoading, setDiagnosticsLoading] = useState(false)

  // Danger modal state
  const [dangerModal, setDangerModal] = useState<{
    open: boolean
    title: string
    description: string
    confirmText: string
    action: () => Promise<void>
  }>({
    open: false,
    title: "",
    description: "",
    confirmText: "",
    action: async () => {}
  })

  useEffect(() => {
    if (!authLoading) {
      if (!session) {
        router.replace("/")
      } else if (!isPlatformDeveloper) {
        toast.error("Erişim Reddedildi: Yalnızca yetkili platform geliştiricileri bu konsolu kullanabilir.")
        router.replace("/dashboard")
      }
    }
  }, [authLoading, session, isPlatformDeveloper, router])

  useEffect(() => {
    async function loadDevData() {
      if (!isPlatformDeveloper) return
      setLoading(true)
      try {
        const res = await fetch("/api/developer/config")
        if (res.ok) {
          const data = await res.json()
          setConfig(data.config || {})
          setDevInfo(data)
        } else if (res.status === 403) {
          toast.error("Geliştirici Konsoluna erişim yetkiniz yetersiz.")
          router.replace("/dashboard")
        }
      } catch (err) {
        console.error("Developer console fetch error:", err)
        toast.error("Geliştirici verileri yüklenirken hata oluştu.")
      } finally {
        setLoading(false)
      }
    }

    if (session && isPlatformDeveloper) {
      loadDevData()
    }
  }, [session, isPlatformDeveloper, router])

  // Gerçek FPS + API Ping ölçümü (yalnızca diagnostics sekmesi açıkken)
  useEffect(() => {
    if (activeTab !== "diagnostics" || !isPlatformDeveloper) return

    let frameCount = 0
    let lastTime = performance.now()
    let rafId: number
    let measuring = true
    let maxFrameMs = 0

    setDiagnosticsLoading(true)
    setRealFps(null)
    setJankMs(null)
    setApiPingMs(null)

    // FPS ölçümü: 60 kare veya 1.5 saniye, hangisi önce gelirse
    const measureFps = (time: number) => {
      const delta = time - lastTime
      if (delta > maxFrameMs) maxFrameMs = delta
      frameCount++
      lastTime = time

      if (frameCount < 60 && measuring) {
        rafId = requestAnimationFrame(measureFps)
      } else {
        const elapsed = time - (lastTime - delta * frameCount)
        const fps = Math.round((frameCount / Math.max(elapsed, 1)) * 1000)
        setRealFps(Math.min(fps, 120))
        setJankMs(Math.round(maxFrameMs))
        setDiagnosticsLoading(false)
      }
    }
    rafId = requestAnimationFrame(measureFps)

    // API ping ölçümü
    const t0 = performance.now()
    fetch("/api/developer/config", { method: "GET" })
      .then(() => setApiPingMs(Math.round(performance.now() - t0)))
      .catch(() => setApiPingMs(-1))

    return () => {
      measuring = false
      cancelAnimationFrame(rafId)
    }
  }, [activeTab, isPlatformDeveloper])

  if (authLoading || (!isPlatformDeveloper && session)) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
          <p className="text-sm font-medium text-muted-foreground">Güvenlik ve Yetkiler Doğrulanıyor...</p>
        </div>
      </div>
    )
  }

  if (!isPlatformDeveloper) {
    return (
      <div className="p-6 max-w-2xl mx-auto my-12 bg-destructive/10 border border-destructive/30 rounded-2xl text-center space-y-4">
        <ShieldAlert className="w-12 h-12 text-destructive mx-auto" />
        <h2 className="text-lg font-bold text-foreground">403 — Yetkisiz Erişim</h2>
        <p className="text-xs text-muted-foreground">
          Geliştirici Konsoluna yalnızca yetkili platform geliştirici hesapları erişebilir. Bu işlem denetim kaydına yazılmıştır.
        </p>
        <button
          onClick={() => router.push("/dashboard")}
          className="px-4 py-2 bg-primary text-primary-foreground rounded-xl text-xs font-semibold hover:bg-primary/90 transition-all"
        >
          Panoya Dön
        </button>
      </div>
    )
  }

  const handleSaveDevConfig = async (updatedConfig: Partial<SystemConfig>) => {
    setSaving(true)
    try {
      const res = await fetch("/api/developer/config", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "update_config",
          payload: updatedConfig
        })
      })

      if (res.ok) {
        const data = await res.json()
        setConfig(data.config)
        toast.success("Geliştirici yapılandırması başarıyla kaydedildi!")
        if (typeof window !== "undefined") {
          window.dispatchEvent(new CustomEvent("system-config-updated"))
        }
      } else {
        toast.error("Yapılandırma güncellenirken sunucu hatası oluştu.")
      }
    } catch (err: any) {
      toast.error(err.message || "Bağlantı hatası oluştu.")
    } finally {
      setSaving(false)
    }
  }

  const handleClearCache = async () => {
    setSaving(true)
    try {
      const res = await fetch("/api/developer/config", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "clear_cache", payload: { cacheType: "all" } })
      })
      if (res.ok) {
        toast.success("Sistem önbelleği ve Redis cache başarıyla temizlendi!")
      } else {
        toast.error("Önbellek temizlenirken hata oluştu.")
      }
    } catch {
      toast.error("İstek iletilirken sunucu hatası.")
    } finally {
      setSaving(false)
    }
  }

  const handleResetSystemConfig = async () => {
    setSaving(true)
    try {
      const res = await fetch("/api/developer/config", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "reset_config" })
      })
      if (res.ok) {
        const data = await res.json()
        setConfig(data.config)
        toast.success("Sistem yapılandırması varsayılan fabrika ayarlarına sıfırlandı!")
        if (typeof window !== "undefined") {
          window.dispatchEvent(new CustomEvent("system-config-updated"))
        }
      } else {
        toast.error("Sıfırlama işlemi başarısız.")
      }
    } catch {
      toast.error("Sunucu bağlantı hatası.")
    } finally {
      setSaving(false)
      setDangerModal({ ...dangerModal, open: false })
    }
  }

  const tabs = [
    { id: "environment", label: "Ortam & Sürüm", icon: Server },
    { id: "diagnostics", label: "Sistem Diagnostiği & 60 FPS", icon: Activity },
    { id: "maintenance", label: "Bakım & Banner Yönetimi", icon: Wrench },
    { id: "danger", label: "Tehlikeli Bölge & Operasyonlar", icon: AlertTriangle, danger: true },
  ]

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-card p-6 rounded-2xl border border-border shadow-xs">
        <div className="space-y-1">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-primary/10 text-primary">
              <Terminal className="w-5 h-5" />
            </div>
            <h1 className="text-xl font-bold text-foreground tracking-tight">Geliştirici Konsolu</h1>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
              PLATFORM DEVELOPER ONLY
            </span>
          </div>
          <p className="text-xs text-muted-foreground">
            Platform mimarisi, debug ortam değişkenleri, performans izleme ve tehlikeli sistem operasyonlarını yönetin.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => handleClearCache()}
            disabled={saving}
            className="px-3.5 py-2 text-xs font-semibold rounded-xl border border-border text-foreground hover:bg-muted transition-all flex items-center gap-1.5 cursor-pointer"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${saving ? "animate-spin" : ""}`} />
            Cache Temizle
          </button>
        </div>
      </div>

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Navigation Sidebar */}
        <div className="lg:col-span-3 space-y-2">
          <nav className="flex lg:flex-col gap-1 overflow-x-auto lg:overflow-visible pb-2 lg:pb-0">
            {tabs.map((tab) => {
              const Icon = tab.icon
              const isActive = activeTab === tab.id
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center gap-3 px-3.5 py-3 rounded-xl text-xs font-semibold transition-all shrink-0 lg:shrink cursor-pointer border ${
                    isActive
                      ? tab.danger
                        ? "bg-destructive/10 border-destructive/30 text-destructive shadow-xs"
                        : "bg-primary/10 border-primary/30 text-primary shadow-xs"
                      : tab.danger
                      ? "border-transparent text-destructive/80 hover:bg-destructive/10"
                      : "border-transparent text-muted-foreground hover:bg-muted hover:text-foreground"
                  }`}
                >
                  <Icon className="w-4 h-4 shrink-0" />
                  <span>{tab.label}</span>
                </button>
              )
            })}
          </nav>

          {/* Dev Info Box */}
          <div className="p-4 bg-muted/40 rounded-2xl border border-border space-y-2 text-xs">
            <div className="flex items-center justify-between text-muted-foreground">
              <span>Ortam:</span>
              <span className="font-mono font-bold text-foreground">{devInfo?.environment || "production"}</span>
            </div>
            <div className="flex items-center justify-between text-muted-foreground">
              <span>Sürüm:</span>
              <span className="font-mono text-foreground">{devInfo?.version || "v1.0 Kurumsal"}</span>
            </div>
            <div className="flex items-center justify-between text-muted-foreground">
              <span>Geliştirici:</span>
              <span className="font-semibold text-primary">{session?.user?.fullName}</span>
            </div>
          </div>
        </div>

        {/* Content Area */}
        <div className="lg:col-span-9 space-y-6">
          {loading ? (
            <div className="h-64 bg-card/50 animate-pulse rounded-2xl border border-border" />
          ) : (
            <>
              {/* TAB 1: Ortam & Sürüm */}
              {activeTab === "environment" && (
                <div className="bg-card rounded-2xl border border-border p-6 space-y-6">
                  <div>
                    <h3 className="text-base font-bold text-foreground flex items-center gap-2">
                      <Server className="w-5 h-5 text-primary" />
                      Ortam & Çalışma Sürümü Yapılandırması
                    </h3>
                    <p className="text-xs text-muted-foreground mt-1">
                      Local Debug Branch ve platform geliştirme ortamı ayarlarını yapılandırın.
                    </p>
                  </div>

                  <div className="space-y-4">
                    <div className="p-4 rounded-xl bg-background border border-border space-y-3">
                      <div className="flex items-center justify-between">
                        <div>
                          <h4 className="text-xs font-bold text-foreground">Local Debug Branch Seçeneği</h4>
                          <p className="text-[11px] text-muted-foreground">
                            Etkinleştirildiğinde şube seçicide yalnızca yetkili geliştiricilere özel "Local Debug Branch" gösterilir.
                          </p>
                        </div>
                        <input
                          type="checkbox"
                          checked={config.securityDisabled ?? false}
                          onChange={(e) => {
                            const updated = { ...config, securityDisabled: e.target.checked }
                            setConfig(updated)
                            handleSaveDevConfig(updated)
                          }}
                          className="w-4 h-4 accent-primary rounded cursor-pointer"
                        />
                      </div>
                    </div>

                    <div className="p-4 rounded-xl bg-background border border-border space-y-3">
                      <h4 className="text-xs font-bold text-foreground">Sunucu & Çalışma Zamanı Detayları</h4>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                        <div className="p-3 rounded-lg bg-card border border-border font-mono text-[11px]">
                          <span className="text-muted-foreground">Node Environment:</span> {devInfo?.environment}
                        </div>
                        <div className="p-3 rounded-lg bg-card border border-border font-mono text-[11px]">
                          <span className="text-muted-foreground">Tamper Protection:</span> {config.tamperDetected ? "IHLAL TESPIT EDILDI" : "Normal"}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

                              {/* TAB 2: Diagnostik — Gerçek Ölçüm */}
              {activeTab === "diagnostics" && (
                <div className="bg-card rounded-2xl border border-border p-6 space-y-6">
                  <div>
                    <h3 className="text-base font-bold text-foreground flex items-center gap-2">
                      <Activity className="w-5 h-5 text-primary" />
                      Sistem Diagnostiği — Gerçek Ölçüm
                    </h3>
                    <p className="text-xs text-muted-foreground mt-1">
                      requestAnimationFrame ile anlık FPS, frame jank süresi ve API ping ölçümü.
                      {diagnosticsLoading && <span className="ml-2 text-primary animate-pulse">Ölçülüyor...</span>}
                    </p>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20 space-y-1">
                      <p className="text-[11px] font-semibold text-emerald-600 dark:text-emerald-400">Gerçek UI FPS</p>
                      <p className="text-2xl font-bold text-emerald-700 dark:text-emerald-300">
                        {diagnosticsLoading ? <span className="text-sm text-muted-foreground">Ölçülüyor...</span>
                          : realFps !== null ? `${realFps} FPS` : "—"}
                      </p>
                      <p className="text-[10px] text-muted-foreground">requestAnimationFrame (60 frame)</p>
                    </div>

                    <div className="p-4 rounded-xl bg-orange-500/10 border border-orange-500/20 space-y-1">
                      <p className="text-[11px] font-semibold text-orange-600 dark:text-orange-400">Maks Frame Süresi</p>
                      <p className="text-2xl font-bold text-orange-700 dark:text-orange-300">
                        {diagnosticsLoading ? <span className="text-sm text-muted-foreground">Ölçülüyor...</span>
                          : jankMs !== null ? `${jankMs}ms` : "—"}
                      </p>
                      <p className="text-[10px] text-muted-foreground">Jank eşiği: 16ms (60fps)</p>
                    </div>

                    <div className="p-4 rounded-xl bg-blue-500/10 border border-blue-500/20 space-y-1">
                      <p className="text-[11px] font-semibold text-blue-600 dark:text-blue-400">API Ping Süresi</p>
                      <p className="text-2xl font-bold text-blue-700 dark:text-blue-300">
                        {apiPingMs === null ? (diagnosticsLoading ? "—" : "—")
                          : apiPingMs === -1 ? "Hata" : `${apiPingMs}ms`}
                      </p>
                      <p className="text-[10px] text-muted-foreground">/api/developer/config GET</p>
                    </div>
                  </div>

                  {/* Uyarı: GPU bilgisi Electron main process bilgisi gerektirir */}
                  <div className="p-3 rounded-xl bg-muted/50 border border-border text-[11px] text-muted-foreground flex items-start gap-2">
                    <Info className="w-3.5 h-3.5 shrink-0 mt-0.5 text-primary" />
                    <span>
                      GPU ivmesi Electron main process üzerinden aktif edilmiştir (bkz. <code className="font-mono text-primary">electron/main.js</code>).
                      Renderer tarafında GPU doğrulama için Electron DevTools &gt; More Tools &gt; Performance kullanın.
                    </span>
                  </div>

                  <button
                    onClick={() => setActiveTab("")}  
                    className="hidden"
                    aria-hidden
                  />
                  <button
                    onClick={() => {
                      setActiveTab("environment")
                      setTimeout(() => setActiveTab("diagnostics"), 50)
                    }}
                    className="px-3.5 py-2 text-xs font-semibold rounded-xl border border-border text-foreground hover:bg-muted transition-all flex items-center gap-1.5 cursor-pointer"
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                    Yeniden Ölç
                  </button>
                </div>
              )}

              {/* TAB 3: Bakım & Banner */}
              {activeTab === "maintenance" && (
                <div className="bg-card rounded-2xl border border-border p-6 space-y-6">
                  <div>
                    <h3 className="text-base font-bold text-foreground flex items-center gap-2">
                      <Wrench className="w-5 h-5 text-primary" />
                      Sistem Bakımı ve Platform Duyuru Bannerı
                    </h3>
                    <p className="text-xs text-muted-foreground mt-1">
                      Platform çapında bakım modunu ve üst duyuru bandını yönetin.
                    </p>
                  </div>

                  <div className="space-y-4">
                    <div className="p-4 rounded-xl bg-background border border-border space-y-3">
                      <div className="flex items-center justify-between">
                        <div>
                          <h4 className="text-xs font-bold text-foreground">Sistem Bakım Modu</h4>
                          <p className="text-[11px] text-muted-foreground">
                            Aktif edildiğinde geliştirici dışındaki kullanıcılar bakım ekranına yönlendirilir.
                          </p>
                        </div>
                        <input
                          type="checkbox"
                          checked={config.systemMaintenance?.maintenanceMode ?? false}
                          onChange={(e) => {
                            const updated = {
                              ...config,
                              systemMaintenance: {
                                ...config.systemMaintenance,
                                maintenanceMode: e.target.checked,
                                announcementBannerText: config.systemMaintenance?.announcementBannerText || "",
                                showAnnouncementBanner: config.systemMaintenance?.showAnnouncementBanner || false
                              }
                            }
                            setConfig(updated)
                            handleSaveDevConfig(updated)
                          }}
                          className="w-4 h-4 accent-primary rounded cursor-pointer"
                        />
                      </div>
                    </div>

                    <div className="p-4 rounded-xl bg-background border border-border space-y-3">
                      <div className="flex items-center justify-between">
                        <h4 className="text-xs font-bold text-foreground">Duyuru Bandını Göster</h4>
                        <input
                          type="checkbox"
                          checked={config.systemMaintenance?.showAnnouncementBanner ?? false}
                          onChange={(e) => {
                            const updated = {
                              ...config,
                              systemMaintenance: {
                                maintenanceMode: config.systemMaintenance?.maintenanceMode || false,
                                announcementBannerText: config.systemMaintenance?.announcementBannerText || "",
                                showAnnouncementBanner: e.target.checked
                              }
                            }
                            setConfig(updated)
                            handleSaveDevConfig(updated)
                          }}
                          className="w-4 h-4 accent-primary rounded cursor-pointer"
                        />
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-xs font-medium text-foreground">Duyuru Metni</label>
                        <input
                          type="text"
                          value={config.systemMaintenance?.announcementBannerText || ""}
                          onChange={(e) => {
                            setConfig({
                              ...config,
                              systemMaintenance: {
                                maintenanceMode: config.systemMaintenance?.maintenanceMode || false,
                                announcementBannerText: e.target.value,
                                showAnnouncementBanner: config.systemMaintenance?.showAnnouncementBanner || false
                              }
                            })
                          }}
                          className="w-full px-3.5 py-2 bg-card border border-border rounded-xl text-xs"
                          placeholder="Örn: 24 Temmuz 23:00'da planlı sistem güncellemesi yapılacaktır."
                        />
                      </div>
                      <button
                        onClick={() => handleSaveDevConfig(config)}
                        disabled={saving}
                        className="px-4 py-2 bg-primary text-primary-foreground rounded-xl text-xs font-semibold hover:bg-primary/90 transition-all flex items-center gap-1.5"
                      >
                        {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
                        Kaydet
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 4: Tehlikeli Bölge */}
              {activeTab === "danger" && (
                <div className="bg-card rounded-2xl border border-destructive/30 p-6 space-y-6">
                  <div>
                    <h3 className="text-base font-bold text-destructive flex items-center gap-2">
                      <AlertTriangle className="w-5 h-5 text-destructive" />
                      Tehlikeli Bölge ve Kritik Sistem Operasyonları
                    </h3>
                    <p className="text-xs text-muted-foreground mt-1">
                      Bu alandaki işlemler sistem yapılandırmasını sıfırlayabilir veya önbelleği tamamen temizler.
                    </p>
                  </div>

                  <div className="space-y-4">
                    <div className="p-4 rounded-xl bg-destructive/5 border border-destructive/20 flex items-center justify-between">
                      <div>
                        <h4 className="text-xs font-bold text-foreground">Sistem Yapılandırmasını Fabrika Ayarlarına Sıfırla</h4>
                        <p className="text-[11px] text-muted-foreground">
                          Tüm renk paletleri, marka kiti ve modül ayarları varsayılana döner.
                        </p>
                      </div>
                      <button
                        onClick={() => {
                          setDangerModal({
                            open: true,
                            title: "Sistem Yapılandırmasını Sıfırla",
                            description: "Tüm sistem ayarları varsayılana döndürülecektir. Devam etmek istiyor musunuz?",
                            confirmText: "Fabrika Ayarlarına Dön",
                            action: handleResetSystemConfig
                          })
                        }}
                        className="px-3.5 py-2 bg-destructive text-destructive-foreground rounded-xl text-xs font-semibold hover:bg-destructive/90 transition-all"
                      >
                        Sıfırla
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* Confirmation Modal */}
      {dangerModal.open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <div className="bg-card border border-border rounded-2xl max-w-md w-full p-6 space-y-4 shadow-2xl">
            <div className="flex items-center gap-3 text-destructive">
              <AlertTriangle className="w-6 h-6 shrink-0" />
              <h3 className="text-base font-bold">{dangerModal.title}</h3>
            </div>
            <p className="text-xs text-muted-foreground leading-relaxed">{dangerModal.description}</p>
            <div className="flex justify-end gap-3 pt-2">
              <button
                onClick={() => setDangerModal({ ...dangerModal, open: false })}
                className="px-4 py-2 rounded-xl text-xs font-semibold border border-border hover:bg-muted"
              >
                İptal
              </button>
              <button
                onClick={dangerModal.action}
                disabled={saving}
                className="px-4 py-2 rounded-xl text-xs font-semibold bg-destructive text-destructive-foreground hover:bg-destructive/90 flex items-center gap-1.5"
              >
                {saving && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                {dangerModal.confirmText}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
