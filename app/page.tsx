"use client"

import { useEffect, useState, Suspense } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { useAuth } from "@/lib/auth/context"
import { SunumLogo } from "@/components/sunum-logo"
import { BRAND_CONFIG } from "@/lib/config/brand"
import {
  Sparkles,
  ArrowRight,
  ShieldCheck,
  BarChart3,
  Building2,
  Users,
  FolderOpen,
  CreditCard,
  TrendingUp,
  Package,
  Layers,
  ChevronDown,
  Lock,
  User,
  LogIn,
  AlertCircle
} from "lucide-react"

function LoginPageContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { session, loginAsDemo, login, loading: authLoading } = useAuth()

  const [startingDemo, setStartingDemo] = useState(false)
  const [demoError, setDemoError] = useState("")
  const [autoLaunchCountdown, setAutoLaunchCountdown] = useState<number | null>(null)
  const [showManualLogin, setShowManualLogin] = useState(false)

  // Manual login state
  const [username, setUsername] = useState("")
  const [password, setPassword] = useState("")
  const [manualLoading, setManualLoading] = useState(false)
  const [manualError, setManualError] = useState("")

  const fromLogout = searchParams.get("from") === "logout"

  // 1. Session check: if already logged in, go straight to dashboard
  useEffect(() => {
    if (!authLoading && session) {
      router.replace("/dashboard")
    }
  }, [session, authLoading, router])

  // 2. Auto-launch demo after 2 seconds for fresh visitors (unless coming from logout)
  useEffect(() => {
    if (fromLogout || session || authLoading) return

    setAutoLaunchCountdown(2)
    const interval = setInterval(() => {
      setAutoLaunchCountdown(prev => {
        if (prev === null) return null
        if (prev <= 1) {
          clearInterval(interval)
          handleStartDemo()
          return 0
        }
        return prev - 1
      })
    }, 1000)

    return () => clearInterval(interval)
  }, [fromLogout, session, authLoading])

  const handleStartDemo = async () => {
    if (startingDemo) return
    setAutoLaunchCountdown(null)
    setStartingDemo(true)
    setDemoError("")
    try {
      await loginAsDemo()
      router.push("/dashboard")
    } catch (err: any) {
      console.error("Demo login error:", err)
      setDemoError(err.message || "Demo girişi başlatılırken bir sorun oluştu.")
      setStartingDemo(false)
    }
  }

  const handleManualLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setManualLoading(true)
    setManualError("")
    try {
      await login(username, password)
      router.push("/dashboard")
    } catch (err: any) {
      setManualError(err.message || "Giriş başarısız. Lütfen bilgilerinizi kontrol edin.")
    } finally {
      setManualLoading(false)
    }
  }

  const features = [
    { icon: Users, label: "Müşteri İlişkileri & CRM", desc: "Müşteri kartları, teklifler ve satış hunisi" },
    { icon: FolderOpen, label: "Proje & Görev Yönetimi", desc: "Kanban panoları, iş takibi ve ekip planlaması" },
    { icon: CreditCard, label: "Finans & Bütçe Analizi", desc: "Gelir-gider tabloları, hakedişler ve grafikler" },
    { icon: TrendingUp, label: "Potansiyel Müşteriler (Leads)", desc: "Aday takibi, sıcaklık skorları ve dönüşüm" },
    { icon: Package, label: "B2B Mağaza & Kargo Entegrasyonu", desc: "Siparişler, kargo takip kodları ve ürünler" },
    { icon: Layers, label: "Çoklu Şube & Yetki Mimarisi", desc: "Merkez, Ankara, İzmir, Bursa şube geçişleri" },
  ]

  return (
    <div className="min-h-screen flex bg-background selection:bg-primary/20">

      {/* ── Sol Marka Paneli (Masaüstü Hero) ── */}
      <div className="hidden lg:flex flex-col justify-between w-[480px] xl:w-[540px] shrink-0 bg-gradient-to-br from-blue-700 via-blue-800 to-indigo-900 relative overflow-hidden p-12 text-white">
        {/* Dekoratif Glow Daireler */}
        <div className="absolute -top-32 -left-32 size-96 rounded-full bg-blue-500/20 blur-3xl pointer-events-none" />
        <div className="absolute -bottom-24 -right-24 size-96 rounded-full bg-indigo-500/25 blur-3xl pointer-events-none" />
        <div className="absolute top-1/2 -translate-y-1/2 -right-16 size-72 rounded-full bg-blue-400/10 blur-2xl pointer-events-none" />

        {/* Logo & Marka Başlığı */}
        <div className="relative z-10 flex items-center gap-3">
          <SunumLogo className="size-11" />
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-white font-bold text-lg leading-tight tracking-tight">Sunum ERP</h1>
              <span className="px-2 py-0.5 text-[10px] font-extrabold bg-white/20 text-white rounded-full uppercase tracking-wider backdrop-blur-sm border border-white/20">
                Canlı Demo
              </span>
            </div>
            <p className="text-white/70 text-xs font-medium mt-0.5">Kurumsal İşletme Yönetim Sistemi</p>
          </div>
        </div>

        {/* Hero Metinleri */}
        <div className="relative z-10 my-auto py-8">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 text-white/90 text-xs font-medium mb-6 border border-white/15 backdrop-blur-sm">
            <Sparkles className="size-3.5 text-amber-300" />
            <span>İnteraktif Sunum & İnceleme Ortamı</span>
          </div>

          <h2 className="text-3xl xl:text-4xl font-extrabold text-white leading-tight tracking-tight">
            Tüm İşletmenizi <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-200 to-indigo-200">
              Tek Merkezden
            </span> Yönetin.
          </h2>

          <p className="text-white/75 mt-4 text-sm leading-relaxed max-w-md">
            Müşteriler, finansal akışlar, aktif projeler ve ekip koordinasyonu tek bir modern kontrol panelinde birleşiyor. Şifre girmeden canlı demoyu hemen test edin.
          </p>

          {/* Özellikler Listesi */}
          <div className="mt-8 grid grid-cols-1 gap-3.5">
            {features.slice(0, 4).map(f => {
              const Icon = f.icon
              return (
                <div key={f.label} className="flex items-start gap-3 bg-white/5 border border-white/10 rounded-xl p-3 backdrop-blur-xs">
                  <div className="size-8 rounded-lg bg-white/15 flex items-center justify-center shrink-0 text-white mt-0.5">
                    <Icon className="size-4" />
                  </div>
                  <div>
                    <h4 className="text-white text-xs font-semibold">{f.label}</h4>
                    <p className="text-white/60 text-[11px] mt-0.5">{f.desc}</p>
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {/* Footer */}
        <div className="relative z-10 flex items-center justify-between text-xs text-white/40 pt-4 border-t border-white/10">
          <span>{BRAND_CONFIG.copyright}</span>
          <span className="flex items-center gap-1">
            <ShieldCheck className="size-3.5" /> Canlı Demo Sürümü
          </span>
        </div>
      </div>

      {/* ── Sağ: Tek Tıkla Demo Başlatma Paneli ── */}
      <div className="flex-1 flex flex-col items-center justify-center p-6 sm:p-12 relative overflow-y-auto">
        
        {/* Mobil Logo Header */}
        <div className="flex flex-col items-center gap-2 mb-8 lg:hidden text-center">
          <SunumLogo className="size-14" />
          <div>
            <h1 className="text-xl font-bold text-foreground">Sunum ERP</h1>
            <span className="text-xs text-muted-foreground font-medium">Canlı Demo Yönetim Paneli</span>
          </div>
        </div>

        <div className="w-full max-w-md space-y-6">

          {/* Çıkış Bildirimi */}
          {fromLogout && (
            <div className="p-3.5 rounded-xl bg-blue-500/10 border border-blue-500/20 text-blue-700 dark:text-blue-300 text-xs flex items-center gap-2 animate-in fade-in">
              <span className="size-2 rounded-full bg-blue-500" />
              <span>Oturumunuz kapatıldı. Demoyu incelemeye devam etmek için aşağıdaki butona tıklayabilirsiniz.</span>
            </div>
          )}

          {/* Demo Giriş Kartı */}
          <div className="bg-card rounded-3xl border border-border/80 shadow-xl p-8 sm:p-10 space-y-6 text-card-foreground relative overflow-hidden">
            {/* Üst Vurgu Çizgisi */}
            <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600" />

            <div className="text-center space-y-2">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/10 text-blue-600 dark:text-blue-400 text-xs font-semibold border border-blue-500/20">
                <Sparkles className="size-3.5 animate-pulse" />
                <span>Tek Tıkla Canlı İnceleme</span>
              </div>
              <h2 className="text-2xl font-extrabold tracking-tight text-foreground">
                Sunum ERP&apos;yi Deneyimleyin
              </h2>
              <p className="text-sm text-muted-foreground leading-relaxed">
                Kullanıcı adı ve şifreye gerek olmadan tam yetkili Süper Yönetici hesabıyla doğrudan panele erişin.
              </p>
            </div>

            {demoError && (
              <div className="p-3 rounded-xl bg-destructive/10 border border-destructive/20 text-destructive text-xs flex items-center gap-2">
                <AlertCircle className="size-4 shrink-0" />
                <span>{demoError}</span>
              </div>
            )}

            {/* BÜYÜK DEMO BUTONU */}
            <div className="space-y-3">
              <button
                onClick={handleStartDemo}
                disabled={startingDemo}
                className="w-full group relative overflow-hidden py-4 px-6 rounded-2xl bg-gradient-to-r from-blue-600 via-blue-500 to-indigo-600 hover:from-blue-700 hover:via-blue-600 hover:to-indigo-700 active:scale-[0.99] text-white font-bold text-base shadow-lg shadow-blue-500/25 transition-all duration-200 flex items-center justify-center gap-3 cursor-pointer disabled:opacity-75 disabled:cursor-wait"
              >
                {/* Parlama Efekti */}
                <span className="absolute inset-0 w-full h-full bg-gradient-to-r from-white/0 via-white/20 to-white/0 transform -translate-x-full group-hover:translate-x-full transition-transform duration-700" />

                {startingDemo ? (
                  <>
                    <span className="size-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    <span>Demo Oturumu Açılıyor...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="size-5 text-amber-300 animate-pulse" />
                    <span>Demo Olarak Başlat</span>
                    <ArrowRight className="size-5 group-hover:translate-x-1 transition-transform" />
                  </>
                )}
              </button>

              {/* Otomatik Geri Sayım Bilgisi */}
              {autoLaunchCountdown !== null && autoLaunchCountdown > 0 && !startingDemo && (
                <div className="text-center">
                  <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground font-medium">
                    <span className="size-1.5 rounded-full bg-blue-500 animate-ping" />
                    <span>{autoLaunchCountdown} saniye içinde otomatik yönlendiriliyorsunuz...</span>
                    <button
                      onClick={() => setAutoLaunchCountdown(null)}
                      className="text-primary hover:underline ml-1 font-semibold"
                    >
                      Durdur
                    </button>
                  </div>
                  {/* İnce İlerleme Çubuğu */}
                  <div className="w-32 h-1 bg-muted rounded-full mx-auto mt-2 overflow-hidden">
                    <div
                      className="h-full bg-primary transition-all duration-1000 ease-linear"
                      style={{ width: `${((2 - autoLaunchCountdown) / 2) * 100}%` }}
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Demo Özellikleri & Rozetler */}
            <div className="pt-2 border-t border-border/60 space-y-2.5">
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <ShieldCheck className="size-4 text-emerald-500 shrink-0" />
                <span><strong>Süper Yönetici Yetkileri:</strong> Tüm modüller, raporlar ve ayarlar açık.</span>
              </div>
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <BarChart3 className="size-4 text-blue-500 shrink-0" />
                <span><strong>Zengin Sahte Veriler:</strong> CRM, siparişler ve finans tabloları dolu.</span>
              </div>
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <Building2 className="size-4 text-purple-500 shrink-0" />
                <span><strong>4 Farklı Şube:</strong> İstanbul HQ, Ankara, İzmir ve Bursa hazır.</span>
              </div>
            </div>

          </div>

          {/* Manuel Giriş Accordion (İsteğe Bağlı) */}
          <div className="text-center">
            <button
              onClick={() => setShowManualLogin(v => !v)}
              className="text-xs text-muted-foreground hover:text-foreground inline-flex items-center gap-1 transition-colors py-1"
            >
              <span>Geliştirici / Manuel Giriş Yap</span>
              <ChevronDown className={`size-3.5 transition-transform duration-200 ${showManualLogin ? "rotate-180" : ""}`} />
            </button>

            {showManualLogin && (
              <form onSubmit={handleManualLogin} className="mt-4 bg-card border border-border rounded-2xl p-5 space-y-3.5 text-left animate-in fade-in slide-in-from-top-2">
                {manualError && (
                  <div className="p-2.5 rounded-lg bg-destructive/10 text-destructive text-xs flex items-center gap-2">
                    <AlertCircle className="size-3.5 shrink-0" />
                    <span>{manualError}</span>
                  </div>
                )}
                <div>
                  <label className="text-xs font-medium text-foreground block mb-1">Kullanıcı Adı</label>
                  <div className="relative">
                    <User className="size-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
                    <input
                      type="text"
                      value={username}
                      onChange={e => setUsername(e.target.value)}
                      placeholder="admin veya demo"
                      className="w-full pl-9 pr-3 py-2 text-sm bg-muted/40 border border-border rounded-xl outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-xs font-medium text-foreground block mb-1">Şifre</label>
                  <div className="relative">
                    <Lock className="size-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
                    <input
                      type="password"
                      value={password}
                      onChange={e => setPassword(e.target.value)}
                      placeholder="••••••••"
                      className="w-full pl-9 pr-3 py-2 text-sm bg-muted/40 border border-border rounded-xl outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={manualLoading}
                  className="w-full py-2.5 px-4 rounded-xl bg-primary text-primary-foreground text-xs font-semibold hover:opacity-90 transition-opacity flex items-center justify-center gap-2 cursor-pointer"
                >
                  {manualLoading ? (
                    <span className="size-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  ) : (
                    <>
                      <LogIn className="size-3.5" />
                      <span>Giriş Yap</span>
                    </>
                  )}
                </button>
              </form>
            )}
          </div>

        </div>

      </div>

    </div>
  )
}

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-background">
          <div className="flex flex-col items-center gap-4">
            <SunumLogo className="size-12 shadow-lg" />
            <div className="size-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          </div>
        </div>
      }
    >
      <LoginPageContent />
    </Suspense>
  )
}
