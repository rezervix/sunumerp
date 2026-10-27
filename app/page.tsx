"use client"

import { LoginForm } from "@/components/login-form"
import { useLanguage } from "@/lib/context/LanguageContext"
import { BRAND_CONFIG } from "@/lib/config/brand"
import Image from "next/image"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"

export default function LoginPage() {
  const router = useRouter()
  const { t } = useLanguage()
  const [checking, setChecking] = useState(true)
  const [logoUrl, setLogoUrl] = useState("/images/logo.png")

  useEffect(() => {
    async function checkBootstrap() {
      try {
        const res = await fetch("/api/system-config")
        if (res.ok) {
          const config = await res.json()
          const activeLogo = config.bgRemovedLogoUrl || config.logoUrl
          if (activeLogo) setLogoUrl(activeLogo)

          if (!config.onboarded) {
            router.replace("/onboarding")
            return
          }
          if (config.subscription?.status === "inactive" || config.subscription?.status === "suspended") {
            router.replace("/paywall")
            return
          }
        }
      } catch (err) {
        console.error("Bootstrap check failed:", err)
      } finally {
        setChecking(false)
      }
    }
    checkBootstrap()
  }, [router])

  const features = [
    { icon: "groups", label: t.login.features.customerMgmt },
    { icon: "folder_open", label: t.login.features.projectTracking },
    { icon: "payments", label: t.login.features.financeAnalysis },
    { icon: "trending_up", label: t.login.features.salesCrm },
  ]

  if (checking) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="size-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <div className="min-h-screen flex bg-background">

      {/* ── Sol Marka Paneli (masaüstü) ── */}
      <div className="hidden lg:flex flex-col justify-between w-[480px] xl:w-[520px] shrink-0 bg-primary relative overflow-hidden p-12">
        {/* Dekoratif daireler */}
        <div className="absolute -top-32 -left-32 size-80 rounded-full bg-white/5" />
        <div className="absolute -bottom-24 -right-24 size-72 rounded-full bg-white/5" />
        <div className="absolute top-1/2 -translate-y-1/2 -right-16 size-56 rounded-full bg-white/5" />

        {/* Logo + Ad */}
        <div className="relative z-10 flex items-center gap-3">
          <div className="flex items-center justify-center rounded-2xl bg-white p-2.5 shadow-md">
            <img src={logoUrl} alt="Logo" className="size-10 object-contain drop-shadow-sm" />
          </div>
          <div>
            <h1 className="text-white font-bold text-base leading-tight">{BRAND_CONFIG.name}</h1>
            <p className="text-white/60 text-xs font-medium mt-0.5">{t.login.managementPanel}</p>
          </div>
        </div>

        {/* Başlık */}
        <div className="relative z-10">
          <p className="text-label text-white/50 mb-4">{t.login.managementPanel}</p>
          <h2 className="text-3xl xl:text-4xl font-bold text-white leading-tight tracking-tight">
            {t.login.manageFromOne}
          </h2>
          <p className="text-white/60 mt-4 text-sm leading-relaxed max-w-xs">
            {t.login.platformDesc}
          </p>

          <ul className="mt-8 space-y-3">
            {features.map(f => (
              <li key={f.label} className="flex items-center gap-3">
                <div className="size-8 rounded-lg bg-white/10 flex items-center justify-center shrink-0">
                  <span className="material-symbols-outlined text-white text-[18px]">{f.icon}</span>
                </div>
                <span className="text-white/80 text-sm font-medium">{f.label}</span>
              </li>
            ))}
          </ul>
        </div>

        {/* Alt yazı */}
        <p className="relative z-10 text-white/30 text-xs">
          {t.login.copyright}
        </p>
      </div>

      {/* ── Sağ: Login Formu ── */}
      <div className="flex-1 flex flex-col items-center justify-center p-6 sm:p-10">
        {/* Mobil logo */}
        <div className="flex flex-col items-center gap-3 mb-8 lg:hidden">
          <div className="flex items-center justify-center rounded-2xl bg-white shadow-md p-3 border border-border">
            <img src={logoUrl} alt="Logo" className="size-14 object-contain" />
          </div>
          <div className="text-center">
            <h1 className="text-xl font-bold text-foreground">{BRAND_CONFIG.name}</h1>
            <span className="text-label text-muted-foreground mt-1 block">{t.login.managementPanel}</span>
          </div>
        </div>

        <div className="w-full max-w-sm">
          <div className="mb-8 hidden lg:block">
            <h2 className="text-display text-foreground">{t.login.welcome}</h2>
            <p className="text-caption mt-1.5">{t.login.subtitle}</p>
          </div>
          <LoginForm />
        </div>
      </div>

    </div>
  )
}
