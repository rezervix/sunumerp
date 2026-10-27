"use client"

import { useState, useEffect, useMemo } from "react"
import { useRouter } from "next/navigation"
import { useAuth } from "@/lib/auth/context"
import { FilePicker } from "@/components/shared/file-picker"
import { useLanguage } from "@/lib/context/LanguageContext"
import { LOCALE_LABELS, type SupportedLocale } from "@/lib/i18n"
import { toast } from "sonner"
import { extractBrandColorsFromImage, removeLogoBackground, getReadableForeground, generateDarkPaletteFromBrandColor } from "@/lib/utils/brand-engine"
import type { SystemConfig } from "@/lib/system-config"
import {
  Building2,
  User,
  ShieldCheck,
  Users,
  Palette,
  Bell,
  KeyRound,
  Globe,
  Hash,
  GitPullRequest,
  Database,
  FileText,
  Wrench,
  AlertTriangle,
  Search,
  Save,
  RotateCcw,
  Check,
  Loader2,
  Lock,
  Download,
  Trash2,
  ExternalLink,
  Info,
  CheckCircle2,
  Volume2,
  Mail,
  MessageSquare,
  Smartphone,
  Server,
  Sun,
  Moon,
  RefreshCw
} from "lucide-react"

// Category tab definition
interface SettingTab {
  id: string
  label: string
  description: string
  icon: any
  badge?: string
  danger?: boolean
}

export default function SettingsPage() {
  const { session, loading: authLoading, currentBranch, isSuperAdmin } = useAuth()
  const router = useRouter()
  const { t, locale, setLocale } = useLanguage()

  const [activeTab, setActiveTab] = useState<string>("company")
  const [searchQuery, setSearchQuery] = useState<string>("")
  const [loading, setLoading] = useState<boolean>(true)
  const [saving, setSaving] = useState<boolean>(false)
  const [isDirty, setIsDirty] = useState<boolean>(false)

  // Full System Configuration State
  const [config, setConfig] = useState<Partial<SystemConfig>>({})
  const [initialConfig, setInitialConfig] = useState<Partial<SystemConfig>>({})

  // User Profile & Password States
  const [profile, setProfile] = useState({ fullName: "", email: "", phone: "", avatarUrl: "" })
  const [initialProfile, setInitialProfile] = useState({ fullName: "", email: "", phone: "", avatarUrl: "" })
  const [passwords, setPasswords] = useState({ current: "", newPass: "", confirm: "" })
  const [passErrors, setPassErrors] = useState<Record<string, string>>({})

  // Brand Engine States
  const [brandLogo, setBrandLogo] = useState<string>("/images/logo.png")
  const [primaryColor, setPrimaryColor] = useState<string>("#D37112")
  const [accentColor, setAccentColor] = useState<string>("#D32F28")

  const [darkBgColor, setDarkBgColor] = useState<string>("#171310")
  const [darkCardColor, setDarkCardColor] = useState<string>("#231C17")
  const [darkPrimaryColor, setDarkPrimaryColor] = useState<string>("#E6923C")
  const [darkAccentColor, setDarkAccentColor] = useState<string>("#E2534B")

  // Audit Logs State
  const [auditLogs, setAuditLogs] = useState<any[]>([])
  const [auditLoading, setAuditLoading] = useState<boolean>(false)

  // Danger Modal State
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
    if (!authLoading && !session) {
      router.replace("/")
    }
  }, [authLoading, session, router])

  // Load all system configuration and user profile data
  useEffect(() => {
    async function loadData() {
      setLoading(true)
      try {
        const [configRes, profileRes] = await Promise.all([
          fetch("/api/system-config"),
          fetch("/api/settings")
        ])

        if (configRes.ok) {
          const cfg: SystemConfig = await configRes.json()
          setConfig(cfg)
          setInitialConfig(JSON.parse(JSON.stringify(cfg)))
          if (cfg.logoUrl || cfg.bgRemovedLogoUrl) {
            setBrandLogo(cfg.bgRemovedLogoUrl || cfg.logoUrl || "/images/logo.png")
          }
          if (cfg.themeColors?.primary) setPrimaryColor(cfg.themeColors.primary)
          if (cfg.themeColors?.accent) setAccentColor(cfg.themeColors.accent)

          // Load dark theme colors if present, or derive from primary color
          if (cfg.themeColors?.darkBackground) {
            setDarkBgColor(cfg.themeColors.darkBackground)
          }
          if (cfg.themeColors?.darkCard) {
            setDarkCardColor(cfg.themeColors.darkCard)
          }
          if (cfg.themeColors?.darkPrimary) {
            setDarkPrimaryColor(cfg.themeColors.darkPrimary)
          } else if (cfg.themeColors?.primary) {
            const derived = generateDarkPaletteFromBrandColor(cfg.themeColors.primary, cfg.themeColors?.accent)
            setDarkBgColor(derived.background)
            setDarkCardColor(derived.card)
            setDarkPrimaryColor(derived.primary)
            setDarkAccentColor(derived.accent)
          }
          if (cfg.themeColors?.darkAccent) {
            setDarkAccentColor(cfg.themeColors.darkAccent)
          }
        }

        if (profileRes.ok) {
          const prof = await profileRes.json()
          const pData = {
            fullName: prof.fullName || "",
            email: prof.email || "",
            phone: prof.phone || "",
            avatarUrl: prof.avatarUrl || ""
          }
          setProfile(pData)
          setInitialProfile(pData)
        }
      } catch (err) {
        console.error("Settings load error:", err)
        toast.error("Ayarlar yüklenirken bir hata oluştu.")
      } finally {
        setLoading(false)
      }
    }
    if (session) {
      loadData()
    }
  }, [session])

  // Fetch Audit Logs when Audit tab is activated
  useEffect(() => {
    if (activeTab === "audit") {
      async function fetchAuditLogs() {
        setAuditLoading(true)
        try {
          const res = await fetch("/api/audit-logs?take=30")
          if (res.ok) {
            const data = await res.json()
            setAuditLogs(data.data || [])
          }
        } catch {
          toast.error("Denetim kaydı yüklenemedi.")
        } finally {
          setAuditLoading(false)
        }
      }
      fetchAuditLogs()
    }
  }, [activeTab])

  // Check Dirty State
  useEffect(() => {
    const configChanged = JSON.stringify(config) !== JSON.stringify(initialConfig)
    const profileChanged = JSON.stringify(profile) !== JSON.stringify(initialProfile)
    setIsDirty(configChanged || profileChanged)
  }, [config, initialConfig, profile, initialProfile])

  // Regenerate dark theme colors manually or on primary color change
  const handleRegenerateDarkColors = (pColor = primaryColor, aColor = accentColor) => {
    const derived = generateDarkPaletteFromBrandColor(pColor, aColor)
    setDarkBgColor(derived.background)
    setDarkCardColor(derived.card)
    setDarkPrimaryColor(derived.primary)
    setDarkAccentColor(derived.accent)
  }

  // Handle Logo Upload and auto background removal & dual palette extraction
  const handleLogoSelect = (urls: string[]) => {
    if (!urls[0]) return
    const newLogoUrl = urls[0]
    setBrandLogo(newLogoUrl)

    const img = new window.Image()
    img.crossOrigin = "anonymous"
    img.src = newLogoUrl
    img.onload = () => {
      try {
        const analysis = extractBrandColorsFromImage(img)
        setPrimaryColor(analysis.primary)
        setAccentColor(analysis.accent)

        if (analysis.darkPalette) {
          setDarkBgColor(analysis.darkPalette.background)
          setDarkCardColor(analysis.darkPalette.card)
          setDarkPrimaryColor(analysis.darkPalette.primary)
          setDarkAccentColor(analysis.darkPalette.accent)
        }

        const cleaned = removeLogoBackground(img, 32)
        setBrandLogo(cleaned)
        updateConfigState("logoUrl", newLogoUrl)
        updateConfigState("bgRemovedLogoUrl", cleaned)
      } catch (err) {
        console.error("Brand analysis error:", err)
      }
    }
  }

  // Update Config Helper
  const updateConfigState = (section: keyof SystemConfig | string, value: any, subField?: string) => {
    setConfig(prev => {
      if (subField) {
        const sectionObj = (prev as any)[section] || {}
        return {
          ...prev,
          [section]: {
            ...sectionObj,
            [subField]: value
          }
        }
      }
      return {
        ...prev,
        [section]: value
      }
    })
  }

  // Save All Settings
  const handleSaveAll = async () => {
    setSaving(true)
    try {
      // 1. Save System Config
      const pFg = getReadableForeground(primaryColor)
      const aFg = getReadableForeground(accentColor)
      const dPrimaryFg = getReadableForeground(darkPrimaryColor)
      const dAccentFg = getReadableForeground(darkAccentColor)

      const payload = {
        ...config,
        logoUrl: brandLogo,
        bgRemovedLogoUrl: brandLogo,
        themeColors: {
          primary: primaryColor,
          primaryForeground: pFg,
          accent: accentColor,
          accentForeground: aFg,
          darkBackground: darkBgColor,
          darkCard: darkCardColor,
          darkPopover: darkCardColor,
          darkSidebar: darkBgColor,
          darkHeader: darkBgColor,
          darkPrimary: darkPrimaryColor,
          darkPrimaryForeground: dPrimaryFg,
          darkAccent: darkAccentColor,
          darkAccentForeground: dAccentFg,
          darkForeground: "#F6F3F0",
          darkMutedForeground: "#A89F95",
          darkBorder: "rgba(248, 239, 226, 0.15)"
        }
      }

      const resConfig = await fetch("/api/system-config", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      })

      // 2. Save User Profile if changed
      let resProfileSuccess = true
      if (JSON.stringify(profile) !== JSON.stringify(initialProfile)) {
        const resProf = await fetch("/api/settings", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(profile)
        })
        resProfileSuccess = resProf.ok
      }

      if (resConfig.ok && resProfileSuccess) {
        const savedConfig = await resConfig.json()
        setConfig(savedConfig)
        setInitialConfig(JSON.parse(JSON.stringify(savedConfig)))
        setInitialProfile({ ...profile })
        setIsDirty(false)
        toast.success("Tüm ayarlar başarıyla kaydedildi!")

        if (typeof window !== "undefined") {
          window.dispatchEvent(new CustomEvent("system-config-updated"))
        }
      } else {
        toast.error("Ayarlar kaydedilirken sunucu hatası oluştu.")
      }
    } catch (err: any) {
      toast.error(err.message || "Bağlantı hatası oluştu.")
    } finally {
      setSaving(false)
    }
  }

  // Cancel / Reset Changes
  const handleCancelChanges = () => {
    setConfig(JSON.parse(JSON.stringify(initialConfig)))
    setProfile({ ...initialProfile })
    setPasswords({ current: "", newPass: "", confirm: "" })
    setPassErrors({})
    setIsDirty(false)
    toast.info("Değişiklikler iptal edildi.")
  }

  // Password Update Handler with inline validation
  const handlePasswordChange = async () => {
    const errors: Record<string, string> = {}
    if (!passwords.current) errors.current = "Mevcut şifre zorunludur"
    if (!passwords.newPass) errors.newPass = "Yeni şifre zorunludur"
    else if (passwords.newPass.length < (config.security?.minLength || 8)) {
      errors.newPass = `Şifre en az ${config.security?.minLength || 8} karakter olmalıdır`
    }
    if (passwords.newPass !== passwords.confirm) errors.confirm = "Şifreler eşleşmiyor"

    if (Object.keys(errors).length > 0) {
      setPassErrors(errors)
      return
    }

    setPassErrors({})
    setSaving(true)
    try {
      const res = await fetch("/api/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          currentPassword: passwords.current,
          newPassword: passwords.newPass
        })
      })

      if (res.ok) {
        toast.success("Şifreniz başarıyla değiştirildi!")
        setPasswords({ current: "", newPass: "", confirm: "" })
      } else {
        const d = await res.json()
        toast.error(d.error || "Mevcut şifre hatalı!")
      }
    } catch (err: any) {
      toast.error(err.message || "Şifre değiştirme başarısız.")
    } finally {
      setSaving(false)
    }
  }

  // Language Change Handler
  const handleLanguageChange = (newLocale: SupportedLocale) => {
    setLocale(newLocale)
    updateConfigState("localization", newLocale, "defaultLocale")
    toast.success(t.settings.languageSaved)
  }

  // Demo Data Load Handler
  const handleLoadDemoData = async () => {
    if (!currentBranch?.id) {
      toast.error("Lütfen önce bir şube seçin.")
      return
    }
    setSaving(true)
    try {
      const res = await fetch(`/api/dev/fake-data?branchId=${currentBranch.id}`, { method: "POST" })
      const data = await res.json()
      if (res.ok) {
        toast.success(data.message || "Demo verileri başarıyla yüklendi!")
        router.refresh()
      } else {
        toast.error(data.error || "Demo veri yükleme hatası")
      }
    } catch (err: any) {
      toast.error(err.message || "İşlem sırasında hata oluştu.")
    } finally {
      setSaving(false)
      setDangerModal(prev => ({ ...prev, open: false }))
    }
  }

  // Clear Demo Data Handler
  const handleClearDemoData = async () => {
    setSaving(true)
    try {
      const res = await fetch(`/api/dev/fake-data`, { method: "DELETE" })
      const data = await res.json()
      if (res.ok) {
        toast.success(data.message || "Tüm demo verileri temizlendi!")
        router.refresh()
      } else {
        toast.error(data.error || "Temizleme hatası oluştu.")
      }
    } catch (err: any) {
      toast.error(err.message || "İşlem sırasında hata oluştu.")
    } finally {
      setSaving(false)
      setDangerModal(prev => ({ ...prev, open: false }))
    }
  }

  // Reset Onboarding Handler
  const handleResetOnboarding = async () => {
    setSaving(true)
    try {
      const res = await fetch("/api/system-config", { method: "DELETE" })
      if (res.ok) {
        localStorage.clear()
        toast.success("Sistem sıfırlandı. Kurulum ekranına yönlendiriliyorsunuz...")
        setTimeout(() => { window.location.href = "/onboarding" }, 1000)
      } else {
        toast.error("Sıfırlama başarısız oldu.")
      }
    } catch (err: any) {
      toast.error(err.message || "Ağ hatası oluştu.")
    } finally {
      setSaving(false)
      setDangerModal(prev => ({ ...prev, open: false }))
    }
  }

  // Tab definitions
  const tabs: SettingTab[] = useMemo(() => [
    { id: "company", label: t.settings.tabs.company.label, description: t.settings.tabs.company.description, icon: Building2 },
    { id: "profile", label: t.settings.tabs.profile.label, description: t.settings.tabs.profile.description, icon: User },
    { id: "security", label: t.settings.tabs.security.label, description: t.settings.tabs.security.description, icon: ShieldCheck },
    { id: "roles", label: t.settings.tabs.roles.label, description: t.settings.tabs.roles.description, icon: Users },
    { id: "theme", label: t.settings.tabs.theme.label, description: t.settings.tabs.theme.description, icon: Palette },
    { id: "notifications", label: t.settings.tabs.notifications.label, description: t.settings.tabs.notifications.description, icon: Bell },
    { id: "integrations", label: t.settings.tabs.integrations.label, description: t.settings.tabs.integrations.description, icon: KeyRound },
    { id: "localization", label: t.settings.tabs.localization.label, description: t.settings.tabs.localization.description, icon: Globe },
    { id: "numbering", label: t.settings.tabs.numbering.label, description: t.settings.tabs.numbering.description, icon: Hash },
    { id: "workflows", label: t.settings.tabs.workflows.label, description: t.settings.tabs.workflows.description, icon: GitPullRequest },
    { id: "backup", label: t.settings.tabs.backup.label, description: t.settings.tabs.backup.description, icon: Database },
    { id: "audit", label: t.settings.tabs.audit.label, description: t.settings.tabs.audit.description, icon: FileText }
  ], [t])

  // Filter tabs by search
  const filteredTabs = useMemo(() => {
    if (!searchQuery.trim()) return tabs
    const q = searchQuery.toLowerCase()
    return tabs.filter(t => t.label.toLowerCase().includes(q) || t.description.toLowerCase().includes(q))
  }, [tabs, searchQuery])

  return (
    <div className="min-h-[calc(100vh-4rem)] pb-24 space-y-6">
      {/* Top Header Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-border">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight text-foreground">
              {t.settings.systemSettingsTitle}
            </h1>
            <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/20">
              {t.common.enterpriseVersion}
            </span>
          </div>
          <p className="text-sm text-muted-foreground mt-1">
            {t.settings.systemSettingsSubtitle}
          </p>
        </div>

        {/* Action Buttons Header */}
        <div className="flex items-center gap-3">
          {isDirty && (
            <span className="hidden sm:flex items-center gap-1.5 text-xs font-semibold text-amber-600 dark:text-amber-400 bg-amber-500/10 px-3 py-1.5 rounded-lg border border-amber-500/20 animate-pulse">
              <Info className="w-3.5 h-3.5" />
              {t.common.unsavedChanges}
            </span>
          )}
          <button
            onClick={handleCancelChanges}
            disabled={!isDirty || saving}
            className="px-3.5 py-2 text-xs font-semibold rounded-xl border border-border text-foreground hover:bg-muted disabled:opacity-40 transition-all flex items-center gap-1.5 cursor-pointer"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            {t.common.cancel}
          </button>
          <button
            onClick={handleSaveAll}
            disabled={!isDirty || saving}
            className="px-4 py-2 text-xs font-semibold rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground disabled:opacity-40 shadow-sm transition-all flex items-center gap-1.5 cursor-pointer"
          >
            {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
            {t.common.saveChanges}
          </button>
        </div>
      </div>

      {/* Main Two-Panel Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">

        {/* Left Sidebar Navigation */}
        <div className="lg:col-span-4 xl:col-span-3 space-y-3 sticky top-4">
          {/* Tab Search Filter */}
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-3 text-muted-foreground" />
            <input
              type="text"
              placeholder={t.common.searchInSettings}
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-2 bg-card border border-border rounded-xl text-xs font-medium focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all placeholder:text-muted-foreground/60"
            />
          </div>

          {/* Navigation Tab Buttons */}
          <nav role="tablist" aria-label="Ayarlar Kategorileri" className="flex lg:flex-col overflow-x-auto lg:overflow-visible gap-1 pb-2 lg:pb-0 scrollbar-none">
            {filteredTabs.map(tab => {
              const Icon = tab.icon
              const isActive = activeTab === tab.id
              return (
                <button
                  key={tab.id}
                  role="tab"
                  aria-selected={isActive}
                  aria-controls={`panel-${tab.id}`}
                  id={`tab-${tab.id}`}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center gap-3 px-3.5 py-3 rounded-xl text-left text-xs font-semibold transition-all shrink-0 lg:shrink cursor-pointer border ${
                    isActive
                      ? tab.danger
                        ? "bg-destructive/10 border-destructive/30 text-destructive shadow-xs"
                        : "bg-primary/10 border-primary/30 text-primary shadow-xs"
                      : tab.danger
                      ? "border-transparent text-destructive/80 hover:bg-destructive/10"
                      : "border-transparent text-muted-foreground hover:bg-muted hover:text-foreground"
                  }`}
                >
                  <Icon className={`w-4 h-4 shrink-0 ${isActive ? (tab.danger ? "text-destructive" : "text-primary") : "text-muted-foreground"}`} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-1">
                      <span className="truncate">{tab.label}</span>
                      {tab.badge && (
                        <span className="text-[9px] uppercase tracking-wider font-bold px-1.5 py-0.2 rounded bg-primary/20 text-primary shrink-0">
                          {tab.badge}
                        </span>
                      )}
                    </div>
                  </div>
                </button>
              )
            })}
          </nav>
        </div>

        {/* Right Content Panel */}
        <div className="lg:col-span-8 xl:col-span-9 space-y-6">
          {loading ? (
            /* Skeleton Loading State */
            <div className="space-y-4">
              <div className="h-32 bg-card/60 animate-pulse rounded-2xl border border-border" />
              <div className="h-48 bg-card/60 animate-pulse rounded-2xl border border-border" />
              <div className="h-48 bg-card/60 animate-pulse rounded-2xl border border-border" />
            </div>
          ) : (
            <>
              {/* TAB 1: Genel Şirket Ayarları */}
              {activeTab === "company" && (
                <div id="panel-company" role="tabpanel" aria-labelledby="tab-company" className="space-y-6">
                  <div className="bg-card rounded-2xl border border-border p-6 space-y-5 shadow-xs">
                    <div>
                      <h3 className="text-base font-bold text-foreground flex items-center gap-2">
                        <Building2 className="w-5 h-5 text-primary" />
                        {t.settings.companySection.title}
                      </h3>
                      <p className="text-xs text-muted-foreground mt-1">
                        {t.settings.companySection.subtitle}
                      </p>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="space-y-1.5">
                        <label className="text-xs font-semibold text-foreground">{t.settings.companySection.titleLabel}</label>
                        <input
                          type="text"
                          value={config.company?.title || ""}
                          onChange={e => updateConfigState("company", e.target.value, "title")}
                          className="w-full px-3.5 py-2.5 bg-background border border-border rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all font-medium"
                          placeholder="Örnek Teknoloji A.Ş."
                        />
                      </div>

                      <div className="space-y-1.5">
                        <label className="text-xs font-semibold text-foreground">{t.settings.companySection.emailLabel}</label>
                        <input
                          type="email"
                          value={config.company?.email || ""}
                          onChange={e => updateConfigState("company", e.target.value, "email")}
                          className="w-full px-3.5 py-2.5 bg-background border border-border rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all font-medium"
                          placeholder="info@firma.com"
                        />
                      </div>

                      <div className="space-y-1.5">
                        <label className="text-xs font-semibold text-foreground">{t.settings.companySection.taxOfficeLabel}</label>
                        <input
                          type="text"
                          value={config.company?.taxOffice || ""}
                          onChange={e => updateConfigState("company", e.target.value, "taxOffice")}
                          className="w-full px-3.5 py-2.5 bg-background border border-border rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all font-medium"
                          placeholder="Maslak VD"
                        />
                      </div>

                      <div className="space-y-1.5">
                        <label className="text-xs font-semibold text-foreground">{t.settings.companySection.taxNumberLabel}</label>
                        <input
                          type="text"
                          value={config.company?.taxNumber || ""}
                          onChange={e => updateConfigState("company", e.target.value, "taxNumber")}
                          className="w-full px-3.5 py-2.5 bg-background border border-border rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all font-medium"
                          placeholder="1234567890"
                        />
                      </div>

                      <div className="space-y-1.5">
                        <label className="text-xs font-semibold text-foreground">{t.settings.companySection.tradeRegLabel}</label>
                        <input
                          type="text"
                          value={config.company?.tradeRegisterNo || ""}
                          onChange={e => updateConfigState("company", e.target.value, "tradeRegisterNo")}
                          className="w-full px-3.5 py-2.5 bg-background border border-border rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all font-medium"
                          placeholder="987654"
                        />
                      </div>

                      <div className="space-y-1.5">
                        <label className="text-xs font-semibold text-foreground">{t.settings.companySection.mersisLabel}</label>
                        <input
                          type="text"
                          value={config.company?.mersisNo || ""}
                          onChange={e => updateConfigState("company", e.target.value, "mersisNo")}
                          className="w-full px-3.5 py-2.5 bg-background border border-border rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all font-medium"
                          placeholder="0123456789000014"
                        />
                      </div>

                      <div className="sm:col-span-2 space-y-1.5">
                        <label className="text-xs font-semibold text-foreground">{t.settings.companySection.addressLabel}</label>
                        <textarea
                          rows={2}
                          value={config.company?.address || ""}
                          onChange={e => updateConfigState("company", e.target.value, "address")}
                          className="w-full px-3.5 py-2.5 bg-background border border-border rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all font-medium"
                          placeholder="Büyükdere Cad. No:100 Maslak / İstanbul"
                        />
                      </div>
                    </div>

                    <div className="pt-4 border-t border-border flex items-center justify-between">
                      <div>
                        <p className="text-xs font-semibold text-foreground">{t.settings.companySection.multiBranchTitle}</p>
                        <p className="text-[11px] text-muted-foreground">{t.settings.companySection.multiBranchDesc}</p>
                      </div>
                      <input
                        type="checkbox"
                        checked={config.company?.multiBranchEnabled ?? true}
                        onChange={e => updateConfigState("company", e.target.checked, "multiBranchEnabled")}
                        className="w-4 h-4 accent-primary rounded cursor-pointer"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 2: Kişisel Profilim */}
              {activeTab === "profile" && (
                <div id="panel-profile" role="tabpanel" aria-labelledby="tab-profile" className="space-y-6">
                  <div className="bg-card rounded-2xl border border-border p-6 space-y-5 shadow-xs">
                    <div>
                      <h3 className="text-base font-bold text-foreground flex items-center gap-2">
                        <User className="w-5 h-5 text-primary" />
                        {t.settings.profileSection.title}
                      </h3>
                      <p className="text-xs text-muted-foreground mt-1">{t.settings.profileSection.subtitle}</p>
                    </div>

                    <div className="flex items-center gap-4 p-4 rounded-xl bg-muted/40 border border-border">
                      {profile.avatarUrl ? (
                        <img src={profile.avatarUrl} alt="Avatar" className="w-16 h-16 rounded-full object-cover border border-border" />
                      ) : (
                        <div className="w-16 h-16 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-xl">
                          {session?.user.fullName?.[0] || "U"}
                        </div>
                      )}
                      <div className="flex-1">
                        <FilePicker
                          label={t.settings.profileSection.selectAvatar}
                          maxFiles={1}
                          onFilesSelected={urls => setProfile(p => ({ ...p, avatarUrl: urls[0] || "" }))}
                        />
                        <p className="text-[11px] text-muted-foreground mt-1">{t.settings.profileSection.avatarHint}</p>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="space-y-1.5">
                        <label className="text-xs font-semibold text-foreground">{t.settings.profileSection.usernameDisabled}</label>
                        <input
                          type="text"
                          disabled
                          value={session?.user.username || ""}
                          className="w-full px-3.5 py-2.5 bg-muted/60 border border-border rounded-xl text-xs font-medium text-muted-foreground cursor-not-allowed"
                        />
                      </div>

                      <div className="space-y-1.5">
                        <label className="text-xs font-semibold text-foreground">{t.settings.profileSection.fullName}</label>
                        <input
                          type="text"
                          value={profile.fullName}
                          onChange={e => setProfile(p => ({ ...p, fullName: e.target.value }))}
                          className="w-full px-3.5 py-2.5 bg-background border border-border rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all font-medium"
                        />
                      </div>

                      <div className="space-y-1.5">
                        <label className="text-xs font-semibold text-foreground">{t.settings.profileSection.email}</label>
                        <input
                          type="email"
                          value={profile.email}
                          onChange={e => setProfile(p => ({ ...p, email: e.target.value }))}
                          className="w-full px-3.5 py-2.5 bg-background border border-border rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all font-medium"
                        />
                      </div>

                      <div className="space-y-1.5">
                        <label className="text-xs font-semibold text-foreground">{t.settings.profileSection.phone}</label>
                        <input
                          type="text"
                          value={profile.phone}
                          onChange={e => setProfile(p => ({ ...p, phone: e.target.value }))}
                          className="w-full px-3.5 py-2.5 bg-background border border-border rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all font-medium"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 3: Güvenlik & Şifre Politikası */}
              {activeTab === "security" && (
                <div id="panel-security" role="tabpanel" aria-labelledby="tab-security" className="space-y-6">
                  {/* Password Change Card */}
                  <div className="bg-card rounded-2xl border border-border p-6 space-y-5 shadow-xs">
                    <div>
                      <h3 className="text-base font-bold text-foreground flex items-center gap-2">
                        <Lock className="w-5 h-5 text-primary" />
                        Şifre Değiştirme
                      </h3>
                      <p className="text-xs text-muted-foreground mt-1">Hesap güvenliğiniz için şifrenizi periyodik olarak güncelleyin.</p>
                    </div>

                    <div className="space-y-3 max-w-md">
                      <div className="space-y-1">
                        <label className="text-xs font-semibold text-foreground">Mevcut Şifre</label>
                        <input
                          type="password"
                          placeholder="••••••••"
                          value={passwords.current}
                          onChange={e => setPasswords(p => ({ ...p, current: e.target.value }))}
                          className="w-full px-3.5 py-2.5 bg-background border border-border rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
                        />
                        {passErrors.current && <p className="text-[11px] text-destructive font-medium">{passErrors.current}</p>}
                      </div>

                      <div className="space-y-1">
                        <label className="text-xs font-semibold text-foreground">Yeni Şifre</label>
                        <input
                          type="password"
                          placeholder="••••••••"
                          value={passwords.newPass}
                          onChange={e => setPasswords(p => ({ ...p, newPass: e.target.value }))}
                          className="w-full px-3.5 py-2.5 bg-background border border-border rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
                        />
                        {passErrors.newPass && <p className="text-[11px] text-destructive font-medium">{passErrors.newPass}</p>}
                      </div>

                      <div className="space-y-1">
                        <label className="text-xs font-semibold text-foreground">Yeni Şifre Tekrar</label>
                        <input
                          type="password"
                          placeholder="••••••••"
                          value={passwords.confirm}
                          onChange={e => setPasswords(p => ({ ...p, confirm: e.target.value }))}
                          className="w-full px-3.5 py-2.5 bg-background border border-border rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
                        />
                        {passErrors.confirm && <p className="text-[11px] text-destructive font-medium">{passErrors.confirm}</p>}
                      </div>

                      <button
                        onClick={handlePasswordChange}
                        disabled={saving}
                        className="px-4 py-2.5 bg-primary hover:bg-primary/90 text-primary-foreground rounded-xl text-xs font-semibold shadow-xs transition-all flex items-center gap-2 cursor-pointer mt-2"
                      >
                        <ShieldCheck className="w-4 h-4" />
                        Şifreyi Güncelle
                      </button>
                    </div>
                  </div>

                  {/* System Security Policy Card */}
                  <div className="bg-card rounded-2xl border border-border p-6 space-y-5 shadow-xs">
                    <div>
                      <h3 className="text-base font-bold text-foreground flex items-center gap-2">
                        <Server className="w-5 h-5 text-primary" />
                        Kurumsal Güvenlik Politikası
                      </h3>
                      <p className="text-xs text-muted-foreground mt-1">Sisteme giriş kurallarını, oturum sürelerini ve 2FA zorunluluğunu yapılandırın.</p>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="space-y-1.5">
                        <label className="text-xs font-semibold text-foreground">Minimum Şifre Uzunluğu</label>
                        <input
                          type="number"
                          value={config.security?.minLength ?? 8}
                          onChange={e => updateConfigState("security", parseInt(e.target.value) || 8, "minLength")}
                          className="w-full px-3.5 py-2.5 bg-background border border-border rounded-xl text-xs font-medium"
                        />
                      </div>

                      <div className="space-y-1.5">
                        <label className="text-xs font-semibold text-foreground">Oturum Zaman Aşımı (Dakika)</label>
                        <input
                          type="number"
                          value={config.security?.sessionTimeoutMinutes ?? 60}
                          onChange={e => updateConfigState("security", parseInt(e.target.value) || 60, "sessionTimeoutMinutes")}
                          className="w-full px-3.5 py-2.5 bg-background border border-border rounded-xl text-xs font-medium"
                        />
                      </div>

                      <div className="space-y-1.5">
                        <label className="text-xs font-semibold text-foreground">Maksimum Hatalı Giriş Denemesi</label>
                        <input
                          type="number"
                          value={config.security?.maxLoginAttempts ?? 5}
                          onChange={e => updateConfigState("security", parseInt(e.target.value) || 5, "maxLoginAttempts")}
                          className="w-full px-3.5 py-2.5 bg-background border border-border rounded-xl text-xs font-medium"
                        />
                      </div>

                      <div className="space-y-1.5">
                        <label className="text-xs font-semibold text-foreground">İzin Verilen IP Adresleri (Opsiyonel)</label>
                        <input
                          type="text"
                          placeholder="Virgülle ayırın (örn. 192.168.1.1)"
                          value={config.security?.allowedIpAddresses || ""}
                          onChange={e => updateConfigState("security", e.target.value, "allowedIpAddresses")}
                          className="w-full px-3.5 py-2.5 bg-background border border-border rounded-xl text-xs font-medium"
                        />
                      </div>
                    </div>

                    <div className="space-y-3 pt-3 border-t border-border">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-semibold text-foreground">Rakam ve Sembol Zorunluluğu</span>
                        <input
                          type="checkbox"
                          checked={config.security?.requireNumbers ?? true}
                          onChange={e => updateConfigState("security", e.target.checked, "requireNumbers")}
                          className="w-4 h-4 accent-primary rounded cursor-pointer"
                        />
                      </div>

                      <div className="flex items-center justify-between">
                        <span className="text-xs font-semibold text-foreground">İki Faktörlü Doğrulama (2FA Zorunluluğu)</span>
                        <input
                          type="checkbox"
                          checked={config.security?.twoFactorAuthEnabled ?? false}
                          onChange={e => updateConfigState("security", e.target.checked, "twoFactorAuthEnabled")}
                          className="w-4 h-4 accent-primary rounded cursor-pointer"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 4: Kullanıcı ve Rol Yönetimi */}
              {activeTab === "roles" && (
                <div id="panel-roles" role="tabpanel" aria-labelledby="tab-roles" className="space-y-6">
                  <div className="bg-card rounded-2xl border border-border p-6 space-y-5 shadow-xs">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                      <div>
                        <h3 className="text-base font-bold text-foreground flex items-center gap-2">
                          <Users className="w-5 h-5 text-primary" />
                          Rol ve Yetki Matrisi Yönetimi (RBAC)
                        </h3>
                        <p className="text-xs text-muted-foreground mt-1">
                          Şube bazlı roller (Super Admin, Branch Admin, Employee, Field Staff, Accountant) ve kaynak erişim izinlerini düzenleyin.
                        </p>
                      </div>
                      <button
                        onClick={() => router.push("/dashboard/settings/roles")}
                        className="px-4 py-2 bg-primary hover:bg-primary/90 text-primary-foreground rounded-xl text-xs font-semibold flex items-center gap-1.5 shrink-0 transition-all shadow-xs cursor-pointer"
                      >
                        <ExternalLink className="w-3.5 h-3.5" />
                        Detaylı Rol Yönetimine Git
                      </button>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 pt-2">
                      {[
                        { title: "Super Admin", level: "Seviye 5", desc: "Tüm sistem ve şubeler üzerinde sınırsız yetki" },
                        { title: "Branch Admin", level: "Seviye 4", desc: "Sadece tanımlı olduğu şube genelinde tam yetki" },
                        { title: "Employee", level: "Seviye 3", desc: "Şube içi operasyonel kayıt oluşturma ve düzenleme" },
                        { title: "Field Staff", level: "Seviye 2", desc: "Saha görevleri ve kısıtlı okuma erişimi" },
                        { title: "Accountant", level: "Seviye 2", desc: "Finans, gelir/gider ve muhasebe raporları yetkisi" }
                      ].map(role => (
                        <div key={role.title} className="p-4 rounded-xl bg-background border border-border space-y-1">
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-bold text-foreground">{role.title}</span>
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/20">
                              {role.level}
                            </span>
                          </div>
                          <p className="text-[11px] text-muted-foreground">{role.desc}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 5: Tema & Marka Kiti */}
              {activeTab === "theme" && (
                <div id="panel-theme" role="tabpanel" aria-labelledby="tab-theme" className="space-y-6">
                  <div className="bg-card rounded-2xl border border-border p-6 space-y-5 shadow-xs">
                    <div>
                      <h3 className="text-base font-bold text-foreground flex items-center gap-2">
                        <Palette className="w-5 h-5 text-primary" />
                        Marka Kiti ve Akıllı Tema Motoru
                      </h3>
                      <p className="text-xs text-muted-foreground mt-1">
                        Şirket logonuzu yükleyin; renk analiz motoru hem açık hem de karanlık temayı markanıza özel otomatik türetir.
                      </p>
                    </div>

                    <div className="flex items-center gap-4 p-4 rounded-xl bg-background border border-border">
                      <div className="w-20 h-20 rounded-2xl bg-zinc-900 border border-zinc-700 p-2 flex items-center justify-center shrink-0 shadow-inner">
                        <img src={brandLogo} alt="Logo" className="max-h-full max-w-full object-contain" />
                      </div>
                      <div className="flex-1">
                        <FilePicker label="Yeni Logo Yükle & Temizle" maxFiles={1} onFilesSelected={handleLogoSelect} />
                        <p className="text-[11px] text-muted-foreground mt-1">Görselden renkler otomatik çıkarılır ve şeffaf PNG arka planı oluşturulur.</p>
                      </div>
                    </div>

                    {/* Light Mode Color Pickers */}
                    <div className="p-4 rounded-xl bg-background border border-border space-y-3">
                      <div className="flex items-center gap-2">
                        <Sun className="w-4 h-4 text-amber-500" />
                        <h4 className="text-xs font-bold text-foreground uppercase tracking-wider">Açık Tema Renk Paleti</h4>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className="space-y-1.5">
                          <label className="text-xs font-semibold text-foreground">Birincil Tema Rengi (Primary)</label>
                          <div className="flex items-center gap-3">
                            <input
                              type="color"
                              value={primaryColor}
                              onChange={e => {
                                const p = e.target.value
                                setPrimaryColor(p)
                                handleRegenerateDarkColors(p, accentColor)
                              }}
                              className="w-9 h-9 rounded-lg cursor-pointer bg-transparent border-0 outline-none"
                            />
                            <span className="font-mono text-xs font-bold uppercase text-foreground">{primaryColor}</span>
                          </div>
                        </div>

                        <div className="space-y-1.5">
                          <label className="text-xs font-semibold text-foreground">Vurgu Rengi (Accent)</label>
                          <div className="flex items-center gap-3">
                            <input
                              type="color"
                              value={accentColor}
                              onChange={e => {
                                const a = e.target.value
                                setAccentColor(a)
                                handleRegenerateDarkColors(primaryColor, a)
                              }}
                              className="w-9 h-9 rounded-lg cursor-pointer bg-transparent border-0 outline-none"
                            />
                            <span className="font-mono text-xs font-bold uppercase text-foreground">{accentColor}</span>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Logoya Özel Dynamic Dark Mode Color Pickers */}
                    <div className="p-4 rounded-xl bg-neutral-900 border border-neutral-800 text-neutral-100 space-y-3 shadow-md">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Moon className="w-4 h-4 text-indigo-400" />
                          <h4 className="text-xs font-bold text-neutral-200 uppercase tracking-wider">Logodan Üretilen Karanlık Tema Paleti</h4>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleRegenerateDarkColors()}
                          className="px-2.5 py-1 rounded-lg bg-indigo-500/20 text-indigo-300 hover:bg-indigo-500/30 text-[10px] font-bold transition-all flex items-center gap-1 cursor-pointer"
                        >
                          <RefreshCw className="w-3 h-3" /> Logodan Yeniden Üret
                        </button>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                        <div className="space-y-1">
                          <label className="text-[10px] font-semibold text-neutral-400">Koyu Arka Plan (Bg)</label>
                          <div className="flex items-center gap-2">
                            <input
                              type="color"
                              value={darkBgColor}
                              onChange={e => setDarkBgColor(e.target.value)}
                              className="w-7 h-7 rounded cursor-pointer bg-transparent border-0"
                            />
                            <span className="font-mono text-[11px] font-bold uppercase text-neutral-300">{darkBgColor}</span>
                          </div>
                        </div>

                        <div className="space-y-1">
                          <label className="text-[10px] font-semibold text-neutral-400">Koyu Kart (Card)</label>
                          <div className="flex items-center gap-2">
                            <input
                              type="color"
                              value={darkCardColor}
                              onChange={e => setDarkCardColor(e.target.value)}
                              className="w-7 h-7 rounded cursor-pointer bg-transparent border-0"
                            />
                            <span className="font-mono text-[11px] font-bold uppercase text-neutral-300">{darkCardColor}</span>
                          </div>
                        </div>

                        <div className="space-y-1">
                          <label className="text-[10px] font-semibold text-neutral-400">Koyu Vurgu Rengi (Primary)</label>
                          <div className="flex items-center gap-2">
                            <input
                              type="color"
                              value={darkPrimaryColor}
                              onChange={e => setDarkPrimaryColor(e.target.value)}
                              className="w-7 h-7 rounded cursor-pointer bg-transparent border-0"
                            />
                            <span className="font-mono text-[11px] font-bold uppercase text-neutral-300">{darkPrimaryColor}</span>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Dual Live Preview Box */}
                    <div className="p-4 rounded-xl bg-background border border-border space-y-3">
                      <h4 className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Arayüz Canlı Önizlemesi (Açık ve Logoya Özel Koyu Tema)</h4>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-[11px]">
                        {/* Light Preview */}
                        <div className="border border-border rounded-xl p-3 bg-white text-gray-900 space-y-2 shadow-xs">
                          <div className="flex items-center justify-between border-b pb-1.5 border-gray-100">
                            <div className="flex items-center gap-1.5">
                              <img src={brandLogo} alt="Logo" className="h-4 object-contain" />
                              <span className="font-bold text-[9px]">Açık Tema</span>
                            </div>
                            <span className="size-2 rounded-full" style={{ backgroundColor: primaryColor }} />
                          </div>
                          <div className="h-4 rounded px-2 flex items-center justify-center text-[9px] font-bold text-white shadow-xs" style={{ backgroundColor: primaryColor }}>
                            Birincil Buton
                          </div>
                        </div>

                        {/* Dark Preview */}
                        <div className="border border-neutral-700 rounded-xl p-3 space-y-2 shadow-xs" style={{ backgroundColor: darkBgColor, color: "#F6F3F0" }}>
                          <div className="flex items-center justify-between border-b pb-1.5 border-neutral-700">
                            <div className="flex items-center gap-1.5">
                              <img src={brandLogo} alt="Logo" className="h-4 object-contain" />
                              <span className="font-bold text-[9px] text-neutral-200">Logoya Özel Koyu Tema</span>
                            </div>
                            <span className="size-2 rounded-full" style={{ backgroundColor: darkPrimaryColor }} />
                          </div>
                          <div className="h-4 rounded px-2 flex items-center justify-center text-[9px] font-bold text-white shadow-xs" style={{ backgroundColor: darkPrimaryColor }}>
                            Koyu Buton
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 6: Bildirim Tercihleri */}
              {activeTab === "notifications" && (
                <div id="panel-notifications" role="tabpanel" aria-labelledby="tab-notifications" className="space-y-6">
                  <div className="bg-card rounded-2xl border border-border p-6 space-y-5 shadow-xs">
                    <div>
                      <h3 className="text-base font-bold text-foreground flex items-center gap-2">
                        <Bell className="w-5 h-5 text-primary" />
                        Bildirim Kanalları Tercihleri
                      </h3>
                      <p className="text-xs text-muted-foreground mt-1">Sistem duyuruları, sipariş durumları ve güvenlik uyarıları için iletim kanallarını belirleyin.</p>
                    </div>

                    <div className="space-y-4">
                      {[
                        { key: "emailNotificationsEnabled", label: "E-posta Bildirimleri", desc: "Kritik durumlar ve günlük özet raporları e-posta olarak gönderilsin.", icon: Mail },
                        { key: "smsNotificationsEnabled", label: "SMS / WhatsApp Uyarıları", desc: "Müşteri sipariş onayları ve 2FA kodları SMS ile iletilsin.", icon: Smartphone },
                        { key: "pushNotificationsEnabled", label: "Masaüstü / Web Push Bildirimleri", desc: "Tarayıcı açıkken anlık canlı bildirimler gösterilsin.", icon: MessageSquare },
                        { key: "soundAlertsEnabled", label: "Sistem İçi Sesli Uyarılar", desc: "Yeni mesaj ve chat duyurularında uyarı sesi çalınsın.", icon: Volume2 }
                      ].map(item => {
                        const Icon = item.icon
                        const isChecked = !!(config.notifications as any)?.[item.key]
                        return (
                          <div key={item.key} className="flex items-center justify-between p-4 rounded-xl bg-background border border-border">
                            <div className="flex items-center gap-3">
                              <div className="p-2 rounded-lg bg-primary/10 text-primary">
                                <Icon className="w-4 h-4" />
                              </div>
                              <div>
                                <p className="text-xs font-bold text-foreground">{item.label}</p>
                                <p className="text-[11px] text-muted-foreground mt-0.5">{item.desc}</p>
                              </div>
                            </div>
                            <input
                              type="checkbox"
                              checked={isChecked}
                              onChange={e => updateConfigState("notifications", e.target.checked, item.key)}
                              className="w-4 h-4 accent-primary rounded cursor-pointer"
                            />
                          </div>
                        )
                      })}
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 7: Entegrasyonlar */}
              {activeTab === "integrations" && (
                <div id="panel-integrations" role="tabpanel" aria-labelledby="tab-integrations" className="space-y-6">
                  <div className="bg-card rounded-2xl border border-border p-6 space-y-5 shadow-xs">
                    <div>
                      <h3 className="text-base font-bold text-foreground flex items-center gap-2">
                        <KeyRound className="w-5 h-5 text-primary" />
                        Üçüncü Parti Entegrasyon Anahtarları
                      </h3>
                      <p className="text-xs text-muted-foreground mt-1">E-Fatura, kargo firmaları ve İyzico sanal pos bağlantı bilgileri.</p>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="space-y-1.5">
                        <label className="text-xs font-semibold text-foreground">E-Fatura Sağlayıcısı</label>
                        <input
                          type="text"
                          value={config.integrations?.efaturaProvider || ""}
                          onChange={e => updateConfigState("integrations", e.target.value, "efaturaProvider")}
                          className="w-full px-3.5 py-2.5 bg-background border border-border rounded-xl text-xs font-medium"
                          placeholder="Logo / Trendyol / Uyumsoft"
                        />
                      </div>

                      <div className="space-y-1.5">
                        <label className="text-xs font-semibold text-foreground">E-Fatura API Anahtarı</label>
                        <input
                          type="password"
                          value={config.integrations?.efaturaApiKey || ""}
                          onChange={e => updateConfigState("integrations", e.target.value, "efaturaApiKey")}
                          className="w-full px-3.5 py-2.5 bg-background border border-border rounded-xl text-xs font-mono"
                        />
                      </div>

                      <div className="space-y-1.5">
                        <label className="text-xs font-semibold text-foreground">Kargo Entegratör Firması</label>
                        <input
                          type="text"
                          value={config.integrations?.kargoProvider || ""}
                          onChange={e => updateConfigState("integrations", e.target.value, "kargoProvider")}
                          className="w-full px-3.5 py-2.5 bg-background border border-border rounded-xl text-xs font-medium"
                          placeholder="Yurtiçi / Aras / MNG / PTT"
                        />
                      </div>

                      <div className="space-y-1.5">
                        <label className="text-xs font-semibold text-foreground">Kargo Servis API Key</label>
                        <input
                          type="password"
                          value={config.integrations?.kargoApiKey || ""}
                          onChange={e => updateConfigState("integrations", e.target.value, "kargoApiKey")}
                          className="w-full px-3.5 py-2.5 bg-background border border-border rounded-xl text-xs font-mono"
                        />
                      </div>

                      <div className="space-y-1.5">
                        <label className="text-xs font-semibold text-foreground">İyzico API Key</label>
                        <input
                          type="password"
                          value={config.integrations?.iyzicoApiKey || ""}
                          onChange={e => updateConfigState("integrations", e.target.value, "iyzicoApiKey")}
                          className="w-full px-3.5 py-2.5 bg-background border border-border rounded-xl text-xs font-mono"
                        />
                      </div>

                      <div className="space-y-1.5">
                        <label className="text-xs font-semibold text-foreground">İyzico Secret Key</label>
                        <input
                          type="password"
                          value={config.integrations?.iyzicoSecretKey || ""}
                          onChange={e => updateConfigState("integrations", e.target.value, "iyzicoSecretKey")}
                          className="w-full px-3.5 py-2.5 bg-background border border-border rounded-xl text-xs font-mono"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 8: Yerelleştirme */}
              {activeTab === "localization" && (
                <div id="panel-localization" role="tabpanel" aria-labelledby="tab-localization" className="space-y-6">
                  <div className="bg-card rounded-2xl border border-border p-6 space-y-5 shadow-xs">
                    <div>
                      <h3 className="text-base font-bold text-foreground flex items-center gap-2">
                        <Globe className="w-5 h-5 text-primary" />
                        Yerelleştirme, Para Birimi ve KDV
                      </h3>
                      <p className="text-xs text-muted-foreground mt-1">Sistem varsayılan dili, finansal para birimi ve vergi oranlarını belirleyin.</p>
                    </div>

                    <div className="space-y-3">
                      <label className="text-xs font-semibold text-foreground block">Sistem Dili</label>
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                        {(Object.entries(LOCALE_LABELS) as [SupportedLocale, { label: string; flag: string }][]).map(([code, { label, flag }]) => (
                          <button
                            key={code}
                            onClick={() => handleLanguageChange(code)}
                            className={`flex items-center gap-3 px-4 py-3 rounded-xl border text-xs font-semibold transition-all cursor-pointer ${
                              locale === code
                                ? "border-primary bg-primary/10 text-primary shadow-xs"
                                : "border-border bg-background hover:bg-muted text-foreground"
                            }`}
                          >
                            <span className="text-lg">{flag}</span>
                            <span>{label}</span>
                            {locale === code && <CheckCircle2 className="w-4 h-4 ml-auto text-primary" />}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-3 border-t border-border">
                      <div className="space-y-1.5">
                        <label className="text-xs font-semibold text-foreground">Varsayılan Para Birimi</label>
                        <select
                          value={config.localization?.defaultCurrency || "TRY"}
                          onChange={e => updateConfigState("localization", e.target.value, "defaultCurrency")}
                          className="w-full px-3.5 py-2.5 bg-background border border-border rounded-xl text-xs font-medium"
                        >
                          <option value="TRY">Türk Lirası (₺ - TRY)</option>
                          <option value="USD">Amerikan Doları ($ - USD)</option>
                          <option value="EUR">Euro (€ - EUR)</option>
                          <option value="GBP">İngiliz Sterlini (£ - GBP)</option>
                        </select>
                      </div>

                      <div className="space-y-1.5">
                        <label className="text-xs font-semibold text-foreground">Tarih Formatı</label>
                        <select
                          value={config.localization?.dateFormat || "DD.MM.YYYY"}
                          onChange={e => updateConfigState("localization", e.target.value, "dateFormat")}
                          className="w-full px-3.5 py-2.5 bg-background border border-border rounded-xl text-xs font-medium"
                        >
                          <option value="DD.MM.YYYY">GG.AA.YYYY (22.07.2026)</option>
                          <option value="YYYY-MM-DD">YYYY-AA-GG (2026-07-22)</option>
                          <option value="MM/DD/YYYY">AA/GG/YYYY (07/22/2026)</option>
                        </select>
                      </div>

                      <div className="space-y-1.5">
                        <label className="text-xs font-semibold text-foreground">Varsayılan KDV Oranı (%)</label>
                        <input
                          type="number"
                          value={config.localization?.defaultVatRate ?? 20}
                          onChange={e => updateConfigState("localization", parseInt(e.target.value) || 0, "defaultVatRate")}
                          className="w-full px-3.5 py-2.5 bg-background border border-border rounded-xl text-xs font-medium"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 9: Doküman Numaralandırma */}
              {activeTab === "numbering" && (
                <div id="panel-numbering" role="tabpanel" aria-labelledby="tab-numbering" className="space-y-6">
                  <div className="bg-card rounded-2xl border border-border p-6 space-y-5 shadow-xs">
                    <div>
                      <h3 className="text-base font-bold text-foreground flex items-center gap-2">
                        <Hash className="w-5 h-5 text-primary" />
                        Doküman Numaralandırma & Otomatik Sayaçlar
                      </h3>
                      <p className="text-xs text-muted-foreground mt-1">Fatura, sipariş ve proje oluşturulduğunda atanacak seri önekleri ve sayaç başlangıçları.</p>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="space-y-1.5">
                        <label className="text-xs font-semibold text-foreground">Fatura Seri Öneki</label>
                        <input
                          type="text"
                          value={config.documentNumbering?.invoicePrefix || "FAT-2026-"}
                          onChange={e => updateConfigState("documentNumbering", e.target.value, "invoicePrefix")}
                          className="w-full px-3.5 py-2.5 bg-background border border-border rounded-xl text-xs font-mono font-bold"
                        />
                      </div>

                      <div className="space-y-1.5">
                        <label className="text-xs font-semibold text-foreground">Fatura Sonraki Sayaç</label>
                        <input
                          type="number"
                          value={config.documentNumbering?.invoiceNextNumber ?? 1001}
                          onChange={e => updateConfigState("documentNumbering", parseInt(e.target.value) || 1, "invoiceNextNumber")}
                          className="w-full px-3.5 py-2.5 bg-background border border-border rounded-xl text-xs font-mono"
                        />
                      </div>

                      <div className="space-y-1.5">
                        <label className="text-xs font-semibold text-foreground">Sipariş Seri Öneki</label>
                        <input
                          type="text"
                          value={config.documentNumbering?.orderPrefix || "SIP-2026-"}
                          onChange={e => updateConfigState("documentNumbering", e.target.value, "orderPrefix")}
                          className="w-full px-3.5 py-2.5 bg-background border border-border rounded-xl text-xs font-mono font-bold"
                        />
                      </div>

                      <div className="space-y-1.5">
                        <label className="text-xs font-semibold text-foreground">Sipariş Sonraki Sayaç</label>
                        <input
                          type="number"
                          value={config.documentNumbering?.orderNextNumber ?? 5001}
                          onChange={e => updateConfigState("documentNumbering", parseInt(e.target.value) || 1, "orderNextNumber")}
                          className="w-full px-3.5 py-2.5 bg-background border border-border rounded-xl text-xs font-mono"
                        />
                      </div>

                      <div className="space-y-1.5">
                        <label className="text-xs font-semibold text-foreground">Proje Öneki</label>
                        <input
                          type="text"
                          value={config.documentNumbering?.projectPrefix || "PRJ-"}
                          onChange={e => updateConfigState("documentNumbering", e.target.value, "projectPrefix")}
                          className="w-full px-3.5 py-2.5 bg-background border border-border rounded-xl text-xs font-mono font-bold"
                        />
                      </div>

                      <div className="space-y-1.5">
                        <label className="text-xs font-semibold text-foreground">Proje Sonraki Sayaç</label>
                        <input
                          type="number"
                          value={config.documentNumbering?.projectNextNumber ?? 201}
                          onChange={e => updateConfigState("documentNumbering", parseInt(e.target.value) || 1, "projectNextNumber")}
                          className="w-full px-3.5 py-2.5 bg-background border border-border rounded-xl text-xs font-mono"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 10: Onay Akışları */}
              {activeTab === "workflows" && (
                <div id="panel-workflows" role="tabpanel" aria-labelledby="tab-workflows" className="space-y-6">
                  <div className="bg-card rounded-2xl border border-border p-6 space-y-5 shadow-xs">
                    <div>
                      <h3 className="text-base font-bold text-foreground flex items-center gap-2">
                        <GitPullRequest className="w-5 h-5 text-primary" />
                        Onay Akışları ve Limit Parametreleri
                      </h3>
                      <p className="text-xs text-muted-foreground mt-1">Yüksek tutarlı işlemlerde yönetici onay mekanizmalarını kurun.</p>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="space-y-1.5">
                        <label className="text-xs font-semibold text-foreground">Sipariş Yöneticisi Onay Limiti (₺)</label>
                        <input
                          type="number"
                          value={config.workflows?.orderApprovalThreshold ?? 50000}
                          onChange={e => updateConfigState("workflows", parseInt(e.target.value) || 0, "orderApprovalThreshold")}
                          className="w-full px-3.5 py-2.5 bg-background border border-border rounded-xl text-xs font-medium"
                        />
                      </div>
                    </div>

                    <div className="pt-3 border-t border-border flex items-center justify-between">
                      <div>
                        <p className="text-xs font-semibold text-foreground">İK İzin Talepleri Yönetici Onayı Zorunlu</p>
                        <p className="text-[11px] text-muted-foreground">Personel izin talepleri şube yöneticisinin onayına sunulur.</p>
                      </div>
                      <input
                        type="checkbox"
                        checked={config.workflows?.hrLeaveApprovalRequired ?? true}
                        onChange={e => updateConfigState("workflows", e.target.checked, "hrLeaveApprovalRequired")}
                        className="w-4 h-4 accent-primary rounded cursor-pointer"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 11: Yedekleme ve Veri */}
              {activeTab === "backup" && (
                <div id="panel-backup" role="tabpanel" aria-labelledby="tab-backup" className="space-y-6">
                  <div className="bg-card rounded-2xl border border-border p-6 space-y-5 shadow-xs">
                    <div>
                      <h3 className="text-base font-bold text-foreground flex items-center gap-2">
                        <Database className="w-5 h-5 text-primary" />
                        Veritabanı Yedekleme & Dışa Aktarma
                      </h3>
                      <p className="text-xs text-muted-foreground mt-1">Otomatik yedekleme zamanlaması ve veritabanı yedeğini indirme.</p>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="space-y-1.5">
                        <label className="text-xs font-semibold text-foreground">Otomatik Yedekleme Periyodu</label>
                        <select
                          value={config.backup?.autoBackupInterval || "daily"}
                          onChange={e => updateConfigState("backup", e.target.value, "autoBackupInterval")}
                          className="w-full px-3.5 py-2.5 bg-background border border-border rounded-xl text-xs font-medium"
                        >
                          <option value="daily">Her Gün Gece (Otomatik)</option>
                          <option value="weekly">Haftada Bir</option>
                          <option value="monthly">Ayda Bir</option>
                          <option value="disabled">Devre Dışı</option>
                        </select>
                      </div>

                      <div className="space-y-1.5">
                        <label className="text-xs font-semibold text-foreground">Son Otomatik Yedekleme Tarihi</label>
                        <input
                          type="text"
                          disabled
                          value={config.backup?.lastBackupAt ? new Date(config.backup.lastBackupAt).toLocaleString("tr-TR") : "Henüz Alınmadı"}
                          className="w-full px-3.5 py-2.5 bg-muted/60 border border-border rounded-xl text-xs font-mono text-muted-foreground cursor-not-allowed"
                        />
                      </div>
                    </div>

                    <div className="pt-3 border-t border-border flex items-center justify-between">
                      <div>
                        <p className="text-xs font-semibold text-foreground">Anlık Veritabanı Yedeği Al & İndir</p>
                        <p className="text-[11px] text-muted-foreground">SQLite / PostgreSQL veritabanı yedeğini JSON/DB formatında bilgisayarınıza aktarın.</p>
                      </div>
                      <button
                        onClick={() => {
                          const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(config, null, 2))
                          const dlAnchor = document.createElement("a")
                          dlAnchor.setAttribute("href", dataStr)
                          dlAnchor.setAttribute("download", `cicekana_erp_config_backup_${new Date().toISOString().slice(0, 10)}.json`)
                          document.body.appendChild(dlAnchor)
                          dlAnchor.click()
                          dlAnchor.remove()
                          toast.success("Veritabanı ve ayar yedeği indirildi!")
                        }}
                        className="px-4 py-2 bg-primary hover:bg-primary/90 text-primary-foreground rounded-xl text-xs font-semibold flex items-center gap-1.5 cursor-pointer shadow-xs"
                      >
                        <Download className="w-3.5 h-3.5" />
                        Yedeği İndir
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 12: Denetim Kaydı (Audit Log) */}
              {activeTab === "audit" && (
                <div id="panel-audit" role="tabpanel" aria-labelledby="tab-audit" className="space-y-6">
                  <div className="bg-card rounded-2xl border border-border p-6 space-y-5 shadow-xs">
                    <div>
                      <h3 className="text-base font-bold text-foreground flex items-center gap-2">
                        <FileText className="w-5 h-5 text-primary" />
                        Sistem Denetim Kaydı (Audit Logs)
                      </h3>
                      <p className="text-xs text-muted-foreground mt-1">Kim, ne zaman, hangi ayarı veya kaydı değiştirdi — 60 FPS performans ve anlık filtreleme.</p>
                    </div>

                    {auditLoading ? (
                      <div className="flex items-center justify-center py-12 text-muted-foreground text-xs gap-2">
                        <Loader2 className="w-4 h-4 animate-spin text-primary" />
                        Denetim kayıtları yükleniyor...
                      </div>
                    ) : auditLogs.length === 0 ? (
                      <div className="text-center py-8 text-xs text-muted-foreground bg-muted/30 rounded-xl border border-border">
                        Henüz kaydedilmiş denetim kaydı bulunamadı.
                      </div>
                    ) : (
                      <div className="overflow-x-auto border border-border rounded-xl">
                        <table className="w-full text-left border-collapse">
                          <thead>
                            <tr className="bg-muted/60 border-b border-border text-[11px] font-bold text-muted-foreground uppercase">
                              <th className="p-3">Tarih / Saat</th>
                              <th className="p-3">Kullanıcı</th>
                              <th className="p-3">İşlem (Action)</th>
                              <th className="p-3">Kaynak (Resource)</th>
                              <th className="p-3">Detaylar</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-border text-xs">
                            {auditLogs.map((log: any) => (
                              <tr key={log.id} className="hover:bg-muted/30 transition-colors">
                                <td className="p-3 font-mono text-[11px] text-muted-foreground whitespace-nowrap">
                                  {new Date(log.createdAt).toLocaleString("tr-TR")}
                                </td>
                                <td className="p-3 font-semibold text-foreground whitespace-nowrap">
                                  {log.userFullName || log.username}
                                </td>
                                <td className="p-3 font-mono text-[11px] text-primary font-bold">
                                  {log.action}
                                </td>
                                <td className="p-3 font-semibold text-muted-foreground">
                                  {log.resource}
                                </td>
                                <td className="p-3 text-muted-foreground max-w-xs truncate">
                                  {typeof log.details === "object" ? JSON.stringify(log.details) : String(log.details || "-")}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* TAB 13: Sistem Bakım & Banner */}
              {activeTab === "maintenance" && (
                <div id="panel-maintenance" role="tabpanel" aria-labelledby="tab-maintenance" className="space-y-6">
                  <div className="bg-card rounded-2xl border border-border p-6 space-y-5 shadow-xs">
                    <div>
                      <h3 className="text-base font-bold text-foreground flex items-center gap-2">
                        <Wrench className="w-5 h-5 text-primary" />
                        Sistem Bakım Modu ve Duyuru Bannerı
                      </h3>
                      <p className="text-xs text-muted-foreground mt-1">Geliştirme süresince kullanıcılara gösterilecek uyarı ve bakım durumu.</p>
                    </div>

                    <div className="space-y-4">
                      <div className="space-y-1.5">
                        <label className="text-xs font-semibold text-foreground">Üst Duyuru Banner Metni</label>
                        <input
                          type="text"
                          value={config.systemMaintenance?.announcementBannerText || ""}
                          onChange={e => updateConfigState("systemMaintenance", e.target.value, "announcementBannerText")}
                          className="w-full px-3.5 py-2.5 bg-background border border-border rounded-xl text-xs font-medium"
                          placeholder="Sistemimiz 23.00-01.00 saatleri arasında bakımdadır."
                        />
                      </div>

                      <div className="pt-3 border-t border-border flex items-center justify-between">
                        <div>
                          <p className="text-xs font-semibold text-foreground">Duyuru Bannerını Tüm Kullanıcılara Göster</p>
                          <p className="text-[11px] text-muted-foreground">Üst barda sarı vurgulu bilgilendirme şeridi açılır.</p>
                        </div>
                        <input
                          type="checkbox"
                          checked={config.systemMaintenance?.showAnnouncementBanner ?? true}
                          onChange={e => updateConfigState("systemMaintenance", e.target.checked, "showAnnouncementBanner")}
                          className="w-4 h-4 accent-primary rounded cursor-pointer"
                        />
                      </div>

                      <div className="pt-3 border-t border-border flex items-center justify-between">
                        <div>
                          <p className="text-xs font-semibold text-foreground text-destructive">Sistem Bakım Modunu Aktif Et</p>
                          <p className="text-[11px] text-muted-foreground">Admin dışındaki tüm kullanıcıların erişimi kısıtlanır.</p>
                        </div>
                        <input
                          type="checkbox"
                          checked={config.systemMaintenance?.maintenanceMode ?? false}
                          onChange={e => updateConfigState("systemMaintenance", e.target.checked, "maintenanceMode")}
                          className="w-4 h-4 accent-destructive rounded cursor-pointer"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 14: Tehlikeli Bölge (Danger Zone) */}
              {activeTab === "danger" && (
                <div id="panel-danger" role="tabpanel" aria-labelledby="tab-danger" className="space-y-6">
                  <div className="bg-destructive/10 rounded-2xl border border-destructive/30 p-6 space-y-5 shadow-xs">
                    <div>
                      <h3 className="text-base font-bold text-destructive flex items-center gap-2">
                        <AlertTriangle className="w-5 h-5 text-destructive" />
                        Tehlikeli Bölge (Danger Zone)
                      </h3>
                      <p className="text-xs text-destructive/80 mt-1">Bu alandaki işlemler geri alınamaz. Sıfırlama veya silme öncesi onay istenecektir.</p>
                    </div>

                    <div className="space-y-3">
                      {/* Demo Data Load */}
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-xl bg-card border border-border">
                        <div>
                          <p className="text-xs font-bold text-foreground">Eğitim ve Test Amaçlı Demo Veri Yükle</p>
                          <p className="text-[11px] text-muted-foreground mt-0.5">Tüm modüllere gerçekçi test verileri ekler ([DEMO] etiketli).</p>
                        </div>
                        <button
                          onClick={() => setDangerModal({
                            open: true,
                            title: "Demo Verileri Yüklensin mi?",
                            description: "Seçili şubeye test ve eğitim amaçlı mock kayıtlar eklenecektir.",
                            confirmText: "Evet, Demo Verileri Yükle",
                            action: handleLoadDemoData
                          })}
                          className="px-3.5 py-2 bg-primary hover:bg-primary/90 text-primary-foreground rounded-xl text-xs font-semibold whitespace-nowrap cursor-pointer shadow-xs"
                        >
                          Demo Veri Yükle
                        </button>
                      </div>

                      {/* Demo Data Clear */}
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-xl bg-card border border-border">
                        <div>
                          <p className="text-xs font-bold text-foreground">Tüm Demo Verileri Temizle</p>
                          <p className="text-[11px] text-muted-foreground mt-0.5">Yalnızca [DEMO] etiketli veriler veritabanından silinir.</p>
                        </div>
                        <button
                          onClick={() => setDangerModal({
                            open: true,
                            title: "Demo Veriler Silinsin mi?",
                            description: "[DEMO] etiketli tüm kayıtlar veritabanından tamamen silinecektir.",
                            confirmText: "Evet, Demo Verileri Sil",
                            action: handleClearDemoData
                          })}
                          className="px-3.5 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-semibold whitespace-nowrap cursor-pointer shadow-xs"
                        >
                          Demo Verileri Sil
                        </button>
                      </div>

                      {/* Reset Onboarding */}
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-xl bg-card border border-border">
                        <div>
                          <p className="text-xs font-bold text-destructive">İlk Kurulumu (Onboarding) Sıfırla</p>
                          <p className="text-[11px] text-muted-foreground mt-0.5">Şirket marka kiti ve kurulum ayarlarını varsayılana döndürür.</p>
                        </div>
                        <button
                          onClick={() => setDangerModal({
                            open: true,
                            title: "Kurulum Sıfırlansın mı?",
                            description: "Sistem ilk kurulum ekranına dönecek ve tüm tema ayarları varsayılan renklere sıfırlanacaktır.",
                            confirmText: "Kurulumu Sıfırla",
                            action: handleResetOnboarding
                          })}
                          className="px-3.5 py-2 bg-destructive hover:bg-destructive/90 text-destructive-foreground rounded-xl text-xs font-semibold whitespace-nowrap cursor-pointer shadow-xs"
                        >
                          Kurulumu Sıfırla
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* Sticky Bottom Unsaved Changes Bar */}
      {isDirty && (
        <div className="fixed bottom-4 left-4 right-4 md:left-64 md:right-8 bg-card border border-border shadow-lg rounded-2xl p-4 flex flex-col sm:flex-row items-center justify-between gap-3 z-50 animate-in slide-in-from-bottom duration-200">
          <div className="flex items-center gap-2 text-xs font-semibold text-foreground">
            <span className="w-2 h-2 rounded-full bg-amber-500 animate-ping" />
            <span>{t.common.unsavedChanges}</span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleCancelChanges}
              disabled={saving}
              className="px-4 py-2 text-xs font-semibold rounded-xl border border-border hover:bg-muted text-foreground transition-all cursor-pointer"
            >
              Vazgeç
            </button>
            <button
              onClick={handleSaveAll}
              disabled={saving}
              className="px-5 py-2 text-xs font-semibold rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground shadow-xs transition-all flex items-center gap-1.5 cursor-pointer"
            >
              {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
              Değişiklikleri Kaydet
            </button>
          </div>
        </div>
      )}

      {/* Danger Action Confirmation Modal */}
      {dangerModal.open && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in duration-150">
          <div className="bg-card border border-border rounded-2xl max-w-md w-full p-6 space-y-4 shadow-xl">
            <div className="flex items-center gap-3 text-destructive">
              <div className="p-2.5 rounded-xl bg-destructive/10">
                <AlertTriangle className="w-6 h-6" />
              </div>
              <h3 className="text-base font-bold">{dangerModal.title}</h3>
            </div>

            <p className="text-xs text-muted-foreground leading-relaxed">{dangerModal.description}</p>

            <div className="flex items-center justify-end gap-3 pt-3 border-t border-border">
              <button
                onClick={() => setDangerModal(prev => ({ ...prev, open: false }))}
                className="px-4 py-2 text-xs font-semibold rounded-xl border border-border text-foreground hover:bg-muted cursor-pointer"
              >
                İptal
              </button>
              <button
                onClick={dangerModal.action}
                disabled={saving}
                className="px-4 py-2 text-xs font-semibold rounded-xl bg-destructive text-destructive-foreground hover:bg-destructive/90 flex items-center gap-1.5 cursor-pointer shadow-xs"
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
