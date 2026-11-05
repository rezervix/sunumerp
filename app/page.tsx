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
    <div className="min-h-screen flex bg-[#080A09] text-white selection:bg-emerald-500/30 relative overflow-hidden">
      {/* Ambient background glow */}
      <div className="fixed inset-0 pointer-events-none bg-[radial-gradient(ellipse_80%_60%_at_50%_-20%,rgba(16,185,129,0.12),transparent)]" />
      <div className="fixed -bottom-40 -left-40 size-[500px] rounded-full bg-emerald-500/5 blur-[120px] pointer-events-none" />

      {/* ── Sol Marka Paneli (Masaüstü Hero) ── */}
      <div className="hidden lg:flex flex-col justify-between w-[480px] xl:w-[540px] shrink-0 bg-[#0C100E] border-r border-white/[0.06] relative overflow-hidden p-12 text-white z-10">
        {/* Dekoratif Glow Daireler */}
        <div className="absolute -top-32 -left-32 size-96 rounded-full bg-emerald-500/10 blur-3xl pointer-events-none" />
        <div className="absolute -bottom-24 -right-24 size-96 rounded-full bg-emerald-500/10 blur-3xl pointer-events-none" />

        {/* Logo & Marka Başlığı */}
        <div className="relative z-10 flex items-center gap-3">
          <SunumLogo className="size-11" />
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-white font-bold text-lg leading-tight tracking-tight">Sunum ERP</h1>
              <span className="px-2.5 py-0.5 text-[10px] font-semibold bg-emerald-500/10 text-emerald-400 rounded-full uppercase tracking-wider border border-emerald-500/20">
                Canlı Demo
              </span>
            </div>
            <p className="text-zinc-400 text-xs font-medium mt-0.5">Kurumsal İşletme Yönetim Sistemi</p>
          </div>
        </div>

        {/* Hero Metinleri */}
        <div className="relative z-10 my-auto py-8">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/[0.04] text-zinc-300 text-xs font-medium mb-6 border border-white/10 backdrop-blur-sm">
            <Sparkles className="size-3.5 text-emerald-400" />
            <span>İnteraktif Sunum &amp; İnceleme Ortamı</span>
          </div>

          <h2 className="text-3xl xl:text-4xl font-light text-white leading-tight tracking-tight">
            Tüm İşletmenizi <br />
            <span className="font-semibold text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-teal-300">
              Tek Merkezden
            </span> Yönetin.
          </h2>

          <p className="text-zinc-400 mt-4 text-sm leading-relaxed max-w-md font-light">
            Müşteriler, finansal akışlar, aktif projeler ve ekip koordinasyonu tek bir modern kontrol panelinde birleşiyor. Şifre girmeden canlı demoyu hemen test edin.
          </p>

          {/* Özellikler Listesi */}
          <div className="mt-8 grid grid-cols-1 gap-3">
            {features.slice(0, 4).map(f => {
              const Icon = f.icon
              return (
                <div key={f.label} className="flex items-start gap-3 bg-white/[0.02] border border-white/[0.06] rounded-2xl p-3.5 backdrop-blur-xs">
                  <div className="size-8 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center shrink-0 text-emerald-400 mt-0.5">
                    <Icon className="size-4" />
                  </div>
                  <div>
                    <h4 className="text-white text-xs font-medium">{f.label}</h4>
                    <p className="text-zinc-400 text-[11px] mt-0.5">{f.desc}</p>
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {/* Footer */}
        <div className="relative z-10 flex items-center justify-between text-xs text-zinc-500 pt-4 border-t border-white/[0.06]">
          <span>{BRAND_CONFIG.copyright}</span>
          <span className="flex items-center gap-1.5 text-emerald-400/80">
            <ShieldCheck className="size-3.5 text-emerald-400" /> Canlı Demo Sürümü
          </span>
        </div>
      </div>

      {/* ── Sağ: Tek Tıkla Demo Başlatma Paneli ── */}
      <div className="flex-1 flex flex-col items-center justify-center p-6 sm:p-12 relative overflow-y-auto z-10">
        
        {/* Mobil Logo Header */}
        <div className="flex flex-col items-center gap-2 mb-8 lg:hidden text-center">
          <SunumLogo className="size-14" />
          <div>
            <h1 className="text-xl font-bold text-white">Sunum ERP</h1>
            <span className="text-xs text-zinc-400 font-medium">Canlı Demo Yönetim Paneli</span>
          </div>
        </div>

        <div className="w-full max-w-md space-y-6">

          {/* Çıkış Bildirimi */}
          {fromLogout && (
            <div className="p-3.5 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs flex items-center gap-2.5">
              <span className="size-2 rounded-full bg-emerald-400 animate-ping" />
              <span>Oturumunuz kapatıldı. Demoyu incelemeye devam etmek için aşağıdaki butona tıklayabilirsiniz.</span>
            </div>
          )}

          {/* Demo Giriş Kartı */}
          <div className="bg-[#111513]/90 backdrop-blur-2xl rounded-[24px] border border-white/10 shadow-2xl p-8 sm:p-10 space-y-6 relative overflow-hidden">
            {/* Üst Vurgu Çizgisi */}
            <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-emerald-500 via-teal-400 to-emerald-600" />

            <div className="text-center space-y-2.5">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-400 text-xs font-semibold border border-emerald-500/20">
                <Sparkles className="size-3.5 animate-pulse" />
                <span>Tek Tıkla Canlı İnceleme</span>
              </div>
              <h2 className="text-2xl font-bold tracking-tight text-white">
                Sunum ERP&apos;yi Deneyimleyin
              </h2>
              <p className="text-sm text-zinc-400 leading-relaxed font-light">
                Kullanıcı adı ve şifreye gerek olmadan tam yetkili Süper Yönetici hesabıyla doğrudan panele erişin.
              </p>
            </div>

            {demoError && (
              <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-xs flex items-center gap-2">
                <AlertCircle className="size-4 shrink-0" />
                <span>{demoError}</span>
              </div>
            )}

            {/* BÜYÜK DEMO BUTONU */}
            <div className="space-y-3">
              <button
                onClick={handleStartDemo}
                disabled={startingDemo}
                className="w-full group relative overflow-hidden py-4 px-6 rounded-2xl bg-emerald-500 hover:bg-emerald-400 text-black font-bold text-base shadow-[0_0_25px_rgba(52,211,153,0.3)] transition-all duration-200 flex items-center justify-center gap-3 cursor-pointer disabled:opacity-75 disabled:cursor-wait"
              >
                {startingDemo ? (
                  <>
                    <span className="size-5 border-2 border-black/30 border-t-black rounded-full animate-spin" />
                    <span>Demo Oturumu Açılıyor...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="size-5 text-black" />
                    <span>Demo Olarak Başlat</span>
                    <ArrowRight className="size-5 group-hover:translate-x-1 transition-transform" />
                  </>
                )}
              </button>

              {/* Otomatik Geri Sayım Bilgisi */}
              {autoLaunchCountdown !== null && autoLaunchCountdown > 0 && !startingDemo && (
                <div className="text-center pt-1">
                  <div className="flex items-center justify-center gap-2 text-xs text-zinc-400 font-medium">
                    <span className="size-1.5 rounded-full bg-emerald-400 animate-ping" />
                    <span>{autoLaunchCountdown} saniye içinde otomatik yönlendiriliyorsunuz...</span>
                    <button
                      onClick={() => setAutoLaunchCountdown(null)}
                      className="text-emerald-400 hover:underline ml-1 font-semibold cursor-pointer"
                    >
                      Durdur
                    </button>
                  </div>
                  {/* İnce İlerleme Çubuğu */}
                  <div className="w-32 h-1 bg-white/10 rounded-full mx-auto mt-2 overflow-hidden">
                    <div
                      className="h-full bg-emerald-500 transition-all duration-1000 ease-linear shadow-[0_0_8px_rgba(52,211,153,0.5)]"
                      style={{ width: `${((2 - autoLaunchCountdown) / 2) * 100}%` }}
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Demo Özellikleri & Rozetler */}
            <div className="pt-3 border-t border-white/[0.08] space-y-2.5">
              <div className="flex items-center gap-2.5 text-xs text-zinc-400">
                <ShieldCheck className="size-4 text-emerald-400 shrink-0" />
                <span><strong className="text-zinc-200">Süper Yönetici Yetkileri:</strong> Tüm modüller ve ayarlar açık.</span>
              </div>
              <div className="flex items-center gap-2.5 text-xs text-zinc-400">
                <BarChart3 className="size-4 text-teal-400 shrink-0" />
                <span><strong className="text-zinc-200">Zengin Örnek Veriler:</strong> CRM, siparişler ve finans tabloları dolu.</span>
              </div>
              <div className="flex items-center gap-2.5 text-xs text-zinc-400">
                <Building2 className="size-4 text-emerald-400 shrink-0" />
                <span><strong className="text-zinc-200">4 Farklı Şube:</strong> İstanbul HQ, Ankara, İzmir ve Bursa hazır.</span>
              </div>
            </div>

          </div>

          {/* Manuel Giriş Accordion */}
          <div className="text-center">
            <button
              onClick={() => setShowManualLogin(v => !v)}
              className="text-xs text-zinc-400 hover:text-white inline-flex items-center gap-1.5 transition-colors py-1 cursor-pointer"
            >
              <span>Geliştirici / Manuel Giriş Yap</span>
              <ChevronDown className={`size-3.5 transition-transform duration-200 ${showManualLogin ? "rotate-180" : ""}`} />
            </button>

            {showManualLogin && (
              <form onSubmit={handleManualLogin} className="mt-4 bg-[#111513]/90 backdrop-blur-xl border border-white/10 rounded-[20px] p-6 space-y-4 text-left">
                {manualError && (
                  <div className="p-3 rounded-xl bg-red-500/10 text-red-400 text-xs flex items-center gap-2 border border-red-500/20">
                    <AlertCircle className="size-3.5 shrink-0" />
                    <span>{manualError}</span>
                  </div>
                )}
                <div>
                  <label className="text-xs font-medium text-zinc-300 block mb-1.5">Kullanıcı Adı</label>
                  <div className="relative">
                    <User className="size-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-500 pointer-events-none" />
                    <input
                      type="text"
                      value={username}
                      onChange={e => setUsername(e.target.value)}
                      placeholder="admin veya demo"
                      className="w-full pl-10 pr-3.5 py-2.5 text-xs bg-white/[0.03] border border-white/10 rounded-xl outline-none focus:border-emerald-500/50 text-white placeholder:text-zinc-600"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-xs font-medium text-zinc-300 block mb-1.5">Şifre</label>
                  <div className="relative">
                    <Lock className="size-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-500 pointer-events-none" />
                    <input
                      type="password"
                      value={password}
                      onChange={e => setPassword(e.target.value)}
                      placeholder="••••••••"
                      className="w-full pl-10 pr-3.5 py-2.5 text-xs bg-white/[0.03] border border-white/10 rounded-xl outline-none focus:border-emerald-500/50 text-white placeholder:text-zinc-600"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={manualLoading}
                  className="w-full py-3 px-4 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-black text-xs font-semibold transition-all flex items-center justify-center gap-2 cursor-pointer shadow-[0_0_15px_rgba(52,211,153,0.3)] disabled:opacity-50"
                >
                  {manualLoading ? (
                    <span className="size-3.5 border-2 border-black/30 border-t-black rounded-full animate-spin" />
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
        <div className="min-h-screen flex items-center justify-center bg-[#080A09]">
          <div className="flex flex-col items-center gap-4">
            <SunumLogo className="size-12 shadow-lg" />
            <div className="size-6 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
          </div>
        </div>
      }
    >
      <LoginPageContent />
    </Suspense>
  )
}
