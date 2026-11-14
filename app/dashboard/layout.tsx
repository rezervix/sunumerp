"use client"

import type React from "react"
import { useEffect, useState, useCallback, useRef, useMemo } from "react"
import { useRouter, usePathname } from "next/navigation"
import Link from "next/link"
import { BranchSelector } from "@/components/branch-selector"
import type { Branch } from "@/lib/auth/types"
import { useAuth } from "@/lib/auth/context"
import { KuscuChat } from "@/components/kuscu-chat"
import { NotificationCenter } from "@/components/notification-panel"
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { Button } from "@/components/ui/button"
import { NotificationProvider, useNotificationStore } from "@/lib/context/NotificationContext"
import { useLanguage } from "@/lib/context/LanguageContext"
import { LOCALE_LABELS, type SupportedLocale } from "@/lib/i18n"
import {
  LayoutDashboard, ShoppingBag, Store, Users, UserCheck,
  FolderOpen, TrendingUp, Truck, FileText, CheckSquare,
  StickyNote, Calculator, CreditCard, Megaphone, Building2,
  Shield, MessageCircle, Bell, Settings, LogOut, Menu,
  PanelLeftClose, PanelLeftOpen, ChevronDown, CalendarDays, Library, ClipboardCheck,
  Images, CalendarCheck2, ClipboardList, Globe, LifeBuoy, HelpCircle, Trash2, Terminal,
  Boxes, Warehouse, ShoppingCart, Sparkles, Search, X,
  ShieldAlert, AlertTriangle, AlertCircle, ExternalLink,
  Factory, GitBranch, Cpu, Hammer, Gauge, ShieldCheck, Wrench
} from "lucide-react"
import {
  resolveProductionFeatureFlags,
  isAnyProductionFeatureEnabled,
  type ProductionFeatureFlagsConfig,
} from "@/lib/config/production-feature-flags"
import {
  IMPLEMENTED_LOGISTICS_FLEET_HREFS,
  isLogisticsFleetMenuVisible,
  resolveLogisticsFeatureFlags,
  type LogisticsFeatureFlagsConfig,
} from "@/lib/config/logistics-feature-flags"
import { motion, AnimatePresence } from "framer-motion"
import { SupportWidget } from "@/components/support-widget"
import { initLogCapturer } from "@/lib/utils/log-capturer"
import { BRAND_CONFIG } from "@/lib/config/brand"
import { OnboardingModal } from "@/components/shared/onboarding-modal"
import { VendorBandrol } from "@/components/vendor-bandrol"
import { SunumLogo } from "@/components/sunum-logo"
import { DemoModeInterceptor } from "@/components/demo-interceptor"


function normalizeSearchText(str: string): string {
  return str
    .toLocaleLowerCase("tr")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
}

interface NavItemDef {
  name: string
  href: string
  icon: React.ElementType
  exact?: boolean
  resource?: string
  adminOnly?: boolean
  devOnly?: boolean
  isLogout?: boolean
}

interface NavCategoryDef {
  id: string
  title: string
  icon: React.ElementType
  items: NavItemDef[]
}

interface NavItemProps {
  item: NavItemDef
  isActive: boolean
  collapsed: boolean
  onClick?: () => void
  onLogout?: () => void
}

function NavItem({ item, isActive, collapsed, onClick, onLogout }: NavItemProps) {
  const Icon = item.icon
  const { unreadCounts } = useNotificationStore()
  const count = item.resource ? (unreadCounts[item.resource] || 0) : 0

  const handleClick = (e: React.MouseEvent) => {
    if (item.isLogout) {
      e.preventDefault()
      onClick?.()
      onLogout?.()
    } else {
      onClick?.()
    }
  }

  if (item.isLogout) {
    const btnContent = (
      <button
        type="button"
        onClick={handleClick}
        className={[
          "w-full text-left text-sm text-zinc-400 hover:text-rose-400 py-2 px-3 rounded-lg transition-colors flex items-center justify-between cursor-pointer",
          collapsed ? "justify-center px-0 mx-auto w-9 h-9" : "",
        ].join(" ")}
      >
        <div className="flex items-center gap-2.5 min-w-0">
          <Icon size={16} className="shrink-0 text-rose-400/80" />
          {!collapsed && <span className="truncate">{item.name}</span>}
        </div>
      </button>
    )

    if (collapsed) {
      return (
        <Tooltip>
          <TooltipTrigger asChild>{btnContent}</TooltipTrigger>
          <TooltipContent side="right" sideOffset={10} className="glass-panel text-white border-white/[0.06]">
            {item.name}
          </TooltipContent>
        </Tooltip>
      )
    }

    return btnContent
  }

  const content = (
    <Link
      href={item.href}
      onClick={handleClick}
      className={[
        "text-sm text-zinc-400 hover:text-white py-2 px-3 rounded-lg transition-colors flex items-center justify-between group",
        isActive ? "bg-white/[0.06] text-white font-medium" : "",
        collapsed ? "justify-center px-0 mx-auto w-9 h-9" : "w-full",
      ].join(" ")}
    >
      <div className="flex items-center gap-2.5 min-w-0">
        {isActive && !collapsed ? (
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 shrink-0" aria-hidden />
        ) : null}
        <div className="relative flex items-center justify-center shrink-0">
          <Icon
            size={16}
            className={[
              "shrink-0 transition-colors",
              isActive ? "text-white" : "text-zinc-400 group-hover:text-white",
            ].join(" ")}
          />
          {collapsed && count > 0 && (
            <span className="absolute -top-1 -right-1 w-1.5 h-1.5 rounded-full bg-emerald-400" />
          )}
        </div>
        {!collapsed && <span className="truncate">{item.name}</span>}
      </div>
      {!collapsed && count > 0 && (
        <span className="ml-2 flex h-4 min-w-[18px] items-center justify-center rounded-full bg-emerald-500/10 text-emerald-400 px-1.5 text-[10px] font-medium leading-none shrink-0">
          {count}
        </span>
      )}
    </Link>
  )

  if (collapsed) {
    return (
      <Tooltip>
        <TooltipTrigger asChild>{content}</TooltipTrigger>
        <TooltipContent side="right" sideOffset={10} className="glass-panel text-white border-white/[0.06]">
          {item.name}
        </TooltipContent>
      </Tooltip>
    )
  }

  return content
}

interface SidebarContentProps {
  collapsed: boolean
  pathname: string
  isSuperAdmin: boolean
  session: any
  onNavClick?: () => void
  onLogout: () => void
  onToggle?: () => void
  userBranches: Branch[]
  currentBranch: Branch | null
  onBranchChange: (b: Branch) => void
  hasPermission: (resource: string, action: string) => boolean
  onTamper: () => void
}


function LanguageSwitcher({ collapsed }: { collapsed: boolean }) {
  const { locale, setLocale } = useLanguage()
  const [open, setOpen] = useState(false)

  const currentLabel = LOCALE_LABELS[locale]

  return (
    <div className="relative">
      {collapsed ? (
        <Tooltip>
          <TooltipTrigger asChild>
            <button
              onClick={() => setOpen(o => !o)}
              className="text-zinc-400 hover:text-white hover:bg-white/[0.04] justify-center mx-auto rounded-lg transition-colors flex items-center w-9 h-9 cursor-pointer"
            >
              <Globe size={16} />
            </button>
          </TooltipTrigger>
          <TooltipContent side="right" className="glass-panel text-white border-white/[0.06]">
            {currentLabel.flag} {currentLabel.label}
          </TooltipContent>
        </Tooltip>
      ) : (
        <button
          onClick={() => setOpen(o => !o)}
          className="w-full text-left text-sm text-zinc-400 hover:text-white py-2 px-3 rounded-lg transition-colors flex items-center justify-between cursor-pointer"
        >
          <div className="flex items-center gap-2.5 min-w-0">
            <Globe size={15} className="text-zinc-400 shrink-0" />
            <span className="truncate text-xs">{currentLabel.flag} {currentLabel.label}</span>
          </div>
          <ChevronDown size={13} className={`text-zinc-500 transition-transform duration-200 ${open ? "rotate-180" : ""}`} />
        </button>
      )}

      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className={`absolute ${collapsed ? "left-12 bottom-0" : "left-0 bottom-full mb-1.5"} z-50 w-44 glass-panel rounded-xl py-1.5 overflow-hidden text-white`}>
            {(Object.entries(LOCALE_LABELS) as [SupportedLocale, { label: string; flag: string }][]).map(([code, { label, flag }]) => (
              <button
                key={code}
                onClick={() => { setLocale(code); setOpen(false) }}
                className={`w-full text-left px-3 py-2 text-xs flex items-center gap-2 hover:bg-white/[0.04] transition-colors cursor-pointer ${locale === code ? "text-white font-medium bg-white/[0.06]" : "text-zinc-400"}`}
              >
                <span>{flag}</span>
                <span>{label}</span>
                {locale === code && <span className="ml-auto w-1.5 h-1.5 rounded-full bg-emerald-400" />}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  )
}

function SidebarContent({
  collapsed, pathname, isSuperAdmin,
  onNavClick, onLogout, onToggle,
  userBranches, currentBranch, onBranchChange, hasPermission,
  onTamper
}: SidebarContentProps) {

  const { t } = useLanguage()
  const { isPlatformDeveloper } = useAuth()
  const { unreadCounts } = useNotificationStore()
  const [subPlan, setSubPlan] = useState<string | null>(null)
  const [featureFlagsConfig, setFeatureFlagsConfig] = useState<ProductionFeatureFlagsConfig | null>(null)
  const [logisticsFlagsConfig, setLogisticsFlagsConfig] = useState<LogisticsFeatureFlagsConfig | null>(null)
  const [logisticsDemoMode, setLogisticsDemoMode] = useState<boolean>(true)

  // Search state
  const [isSearchOpen, setIsSearchOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState("")
  const searchInputRef = useRef<HTMLInputElement>(null)

  // Accordion state - stores ID of the open category (single open)
  const [openCategoryId, setOpenCategoryId] = useState<string | null>(null)

  useEffect(() => {
    async function loadConfig() {
      try {
        const res = await fetch("/api/system-config")
        if (res.ok) {
          const config = await res.json()
          setSubPlan(config.subscription?.plan || null)
          setFeatureFlagsConfig(config.featureFlags || null)
          setLogisticsFlagsConfig(config.logisticsFeatureFlags || null)
          if (typeof config.logisticsDemoMode === "boolean") {
            setLogisticsDemoMode(config.logisticsDemoMode)
          }
          const activeLogo = config.bgRemovedLogoUrl || config.logoUrl
          if (activeLogo) {
            localStorage.setItem("theme-logo", activeLogo)
          }
        }
      } catch (err) {
        console.error("Failed to load system config in sidebar:", err)
      }
    }

    loadConfig()

    const handleUpdate = () => loadConfig()
    window.addEventListener("system-config-updated", handleUpdate)
    return () => window.removeEventListener("system-config-updated", handleUpdate)
  }, [])

  // Keyboard shortcuts: Ctrl+K / Cmd+K opens search, ESC closes
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") {
        e.preventDefault()
        if (collapsed) {
          onToggle?.()
        }
        setIsSearchOpen(true)
        setTimeout(() => searchInputRef.current?.focus(), 60)
      } else if (e.key === "Escape" && isSearchOpen) {
        setSearchQuery("")
        setIsSearchOpen(false)
      }
    }
    window.addEventListener("keydown", handleKeyDown)
    return () => window.removeEventListener("keydown", handleKeyDown)
  }, [collapsed, isSearchOpen, onToggle])

  const prodFlags = useMemo(
    () => resolveProductionFeatureFlags(featureFlagsConfig, currentBranch?.id),
    [featureFlagsConfig, currentBranch?.id]
  )
  const showUretimCategory = useMemo(
    () => isAnyProductionFeatureEnabled(featureFlagsConfig, currentBranch?.id),
    [featureFlagsConfig, currentBranch?.id]
  )
  const logisticsFlags = useMemo(
    () =>
      resolveLogisticsFeatureFlags(
        logisticsFlagsConfig,
        currentBranch?.id,
        logisticsDemoMode
      ),
    [logisticsFlagsConfig, currentBranch?.id, logisticsDemoMode]
  )
  const showLogisticsFleetCategory = useMemo(
    () =>
      isLogisticsFleetMenuVisible(
        logisticsFlagsConfig,
        currentBranch?.id,
        IMPLEMENTED_LOGISTICS_FLEET_HREFS,
        logisticsDemoMode
      ),
    [logisticsDemoMode, logisticsFlagsConfig, currentBranch?.id]
  )

  const rawCategories: NavCategoryDef[] = useMemo(() => [
    {
      id: "genel",
      title: (t.nav as any).general || "Genel",
      icon: LayoutDashboard,
      items: [
        { name: t.nav.dashboard, href: "/dashboard", icon: LayoutDashboard, exact: true, resource: "dashboard" },
        { name: t.nav.calendar, href: "/dashboard/takvim", icon: CalendarDays, resource: "takvim" },
        { name: t.nav.todos, href: "/dashboard/todos", icon: CheckSquare, resource: "yapilacaklar" },
        { name: t.nav.notes, href: "/dashboard/notes", icon: StickyNote, resource: "notlarim" },
      ],
    },
    {
      id: "satis",
      title: (t.nav as any).sales || "Satış / Operasyon",
      icon: ShoppingBag,
      items: [
        { name: t.nav.orders, href: "/dashboard/orders", icon: ShoppingBag, resource: "orders" },
        { name: t.nav.store, href: "/dashboard/b2b", icon: Store, resource: "magaza" },
        { name: t.nav.customers, href: "/dashboard/customers", icon: Users, resource: "customers" },
        { name: t.nav.leads, href: "/dashboard/leads", icon: TrendingUp, resource: "leads" },
        { name: t.nav.cargo, href: "/dashboard/cargo", icon: Truck, resource: "cargo" },
      ],
    },
    {
      id: "stok",
      title: "Stok ve Depo Yönetimi",
      icon: Boxes,
      items: [
        { name: "1. Stok Kartları & Envanter", href: "/dashboard/stok", icon: Boxes, resource: "stok" },
        { name: "2. Depo Operasyonları & Sayım (WMS)", href: "/dashboard/wms", icon: Warehouse, resource: "wms" },
        { name: "3. Satın Alma & Otomatik Sipariş", href: "/dashboard/satinalma", icon: ShoppingCart, resource: "satinalma" },
        { name: "4. Çok Kanallı Satış & Sevkiyat", href: "/dashboard/omnichannel", icon: Globe, resource: "omnichannel" },
        { name: "5. AI Analiz & Ayarlar", href: "/dashboard/stok-ai", icon: Sparkles, resource: "stok-ai" },
      ],
    },
    ...(showLogisticsFleetCategory
      ? [
          {
            id: "lojistik-filo",
            title: "Lojistik & Filo",
            icon: Truck,
            items: [
              ...(logisticsFlags.lojistik_sevkiyat_rota &&
              IMPLEMENTED_LOGISTICS_FLEET_HREFS.includes("/dashboard/sevkiyat")
                ? [{ name: "1. Sevkiyat & Rota Planlama", href: "/dashboard/sevkiyat", icon: Truck, resource: "lojistik_sevkiyat_rota" }]
                : []),
              ...(logisticsFlags.lojistik_filo &&
              IMPLEMENTED_LOGISTICS_FLEET_HREFS.includes("/dashboard/filo")
                ? [{ name: "2. Araç & Sürücü Yönetimi", href: "/dashboard/filo", icon: Truck, resource: "lojistik_filo" }]
                : []),
              ...(logisticsFlags.lojistik_iade &&
              IMPLEMENTED_LOGISTICS_FLEET_HREFS.includes("/dashboard/iade")
                ? [{ name: "3. İade & Ters Lojistik", href: "/dashboard/iade", icon: ShieldCheck, resource: "lojistik_iade" }]
                : []),
            ],
          } satisfies NavCategoryDef,
        ]
      : []),
    ...(showUretimCategory
      ? [
          {
            id: "uretim",
            title: "Üretim",
            icon: Factory,
            items: [
              ...(prodFlags.uretim_bom_rota
                ? [{ name: "1. Ürün Ağacı (BOM) & Rotalar", href: "/dashboard/uretim/bom-rota", icon: GitBranch, resource: "uretim_bom_rota" }]
                : []),
              ...(prodFlags.uretim_mrp_mps
                ? [{ name: "2. MRP & Ana Üretim Planlama", href: "/dashboard/uretim/mrp-mps", icon: Cpu, resource: "uretim_mrp_mps" }]
                : []),
              ...(prodFlags.uretim_is_emri
                ? [{ name: "3. Üretim Emirleri & Atölye", href: "/dashboard/uretim/is-emirleri", icon: Hammer, resource: "uretim_is_emri" }]
                : []),
              ...(prodFlags.uretim_kapasite
                ? [{ name: "4. İş Merkezleri & Kapasite", href: "/dashboard/uretim/kapasite", icon: Gauge, resource: "uretim_kapasite" }]
                : []),
              ...(prodFlags.uretim_kalite
                ? [{ name: "5. Kalite Kontrol & Fire", href: "/dashboard/uretim/kalite", icon: ShieldCheck, resource: "uretim_kalite" }]
                : []),
              ...(prodFlags.uretim_bakim
                ? [{ name: "6. Ekipman & Bakım Yönetimi", href: "/dashboard/uretim/bakim", icon: Wrench, resource: "uretim_bakim" }]
                : []),
            ],
          } satisfies NavCategoryDef,
        ]
      : []),
    {
      id: "proje",
      title: t.nav.projects || "Proje & Görevler",
      icon: FolderOpen,
      items: [
        { name: t.nav.projects, href: "/dashboard/projects", icon: FolderOpen, resource: "projects" },
        { name: t.nav.tasks, href: "/dashboard/tasks", icon: ClipboardList, resource: "dashboard" },
        { name: t.nav.personelDenetim, href: "/dashboard/personel-denetim", icon: ClipboardCheck, resource: "dashboard" },
        { name: t.nav.endOfDayReport, href: "/dashboard/personel-denetim/gun-sonu", icon: ClipboardCheck, resource: "dashboard" },
        { name: t.nav.customerRequests, href: "/dashboard/personel-denetim/musteri-talepleri", icon: MessageCircle, resource: "dashboard" },
        { name: t.nav.files, href: "/dashboard/files", icon: FileText, resource: "files" },
      ],
    },
    {
      id: "pazarlama",
      title: "Pazarlama & İçerik",
      icon: Megaphone,
      items: [
        { name: t.nav.socialMedia, href: "/dashboard/sosyal-medya", icon: Megaphone, resource: "sosyal-medya" },
        { name: t.nav.contentCalendar, href: "/dashboard/icerik-takvimi", icon: CalendarCheck2, resource: "icerik-takvimi" },
        { name: t.nav.agencyLibrary, href: "/dashboard/ajans-kutuphanesi", icon: Library, resource: "ajans-kutuphanesi" },
        { name: t.nav.contentStore, href: "/dashboard/icerik-magazasi", icon: Images, resource: "icerik-magazasi" },
      ],
    },
    {
      id: "finans",
      title: "Finans & Hesaplama",
      icon: CreditCard,
      items: [
        { name: t.nav.finance, href: "/dashboard/finance", icon: CreditCard, resource: "financial" },
        { name: t.nav.calculator, href: "/dashboard/hesaplama-araci", icon: Calculator, resource: "hesaplama" },
      ],
    },
    {
      id: "ik",
      title: t.nav.hr || "İnsan Kaynakları",
      icon: UserCheck,
      items: [
        { name: t.nav.hr, href: "/dashboard/hr", icon: UserCheck, resource: "hr" },
        { name: t.nav.staffRequests, href: "/dashboard/personel-talepleri", icon: ClipboardCheck, resource: "personel-talepleri" },
      ],
    },
    {
      id: "iletisim",
      title: t.nav.communication || "İletişim & Destek",
      icon: MessageCircle,
      items: [
        { name: t.nav.chat, href: "/dashboard/chat", icon: MessageCircle, resource: "chat" },
        { name: t.nav.announcements, href: "/dashboard/announcements", icon: Bell, resource: "duyurular" },
        { name: "SSS / Yardım", href: "/dashboard/sss", icon: HelpCircle, resource: "dashboard" },
      ],
    },
    {
      id: "sistem",
      title: "Sistem",
      icon: Shield,
      items: [
        { name: t.nav.branches, href: "/dashboard/branches", icon: Building2, adminOnly: true },
        { name: t.nav.users, href: "/dashboard/users", icon: Shield, adminOnly: true },
        { name: t.nav.technicalSupport, href: "/dashboard/support-tickets", icon: LifeBuoy, adminOnly: true },
        { name: "Geri Dönüşüm Kutusu", href: "/dashboard/trash", icon: Trash2, resource: "trash" },
        { name: "Geliştirici Konsolu", href: "/dashboard/developer-console", icon: Terminal, devOnly: true },
        { name: t.nav.settings, href: "/dashboard/settings", icon: Settings },
        { name: t.nav.logout, href: "#logout", icon: LogOut, isLogout: true },
      ],
    },
  ], [t, showUretimCategory, prodFlags, showLogisticsFleetCategory, logisticsFlags])

  const isItemAllowed = useCallback((item: NavItemDef) => {
    if (item.devOnly) {
      return isPlatformDeveloper
    }
    if (item.adminOnly) {
      if (subPlan === "free") {
        return item.href === "/dashboard/support-tickets"
      }
      return isSuperAdmin
    }
    if (subPlan === "free") {
      if (
        item.href === "/dashboard" ||
        item.href === "/dashboard/support-tickets" ||
        item.href === "/dashboard/sss" ||
        item.href === "/dashboard/settings" ||
        item.isLogout
      ) {
        return true
      }
      return false
    }
    if (isSuperAdmin) return true
    if (item.resource) return hasPermission(item.resource, "read")
    return true
  }, [isPlatformDeveloper, subPlan, isSuperAdmin, hasPermission])

  // Filter allowed categories and items
  const availableCategories = useMemo(() => {
    return rawCategories
      .map(cat => ({
        ...cat,
        items: cat.items.filter(isItemAllowed),
      }))
      .filter(cat => cat.items.length > 0)
  }, [rawCategories, isItemAllowed])

  const isItemActive = useCallback(
    (item: NavItemDef) => {
      if (item.isLogout) return false
      return item.exact
        ? pathname === item.href
        : pathname === item.href || pathname.startsWith(item.href + "/")
    },
    [pathname]
  )

  // Open active category automatically on mount or route change
  useEffect(() => {
    for (const cat of availableCategories) {
      if (cat.items.some(item => isItemActive(item))) {
        setOpenCategoryId(cat.id)
        break
      }
    }
  }, [pathname, availableCategories, isItemActive])

  // Search filtering
  const normalizedQuery = normalizeSearchText(searchQuery)
  const isSearching = normalizedQuery.length > 0

  const displayedCategories = useMemo(() => {
    if (!isSearching) return availableCategories

    return availableCategories
      .map(cat => ({
        ...cat,
        items: cat.items.filter(item => {
          const normName = normalizeSearchText(item.name)
          return normName.includes(normalizedQuery) || item.name.toLocaleLowerCase("tr").includes(searchQuery.trim().toLocaleLowerCase("tr"))
        }),
      }))
      .filter(cat => cat.items.length > 0)
  }, [availableCategories, isSearching, normalizedQuery, searchQuery])

  const totalMatchingCount = useMemo(() => {
    if (!isSearching) return 0
    return displayedCategories.reduce((sum, cat) => sum + cat.items.length, 0)
  }, [displayedCategories, isSearching])

  const isCategoryOpen = (categoryId: string) => {
    if (isSearching) return true
    return openCategoryId === categoryId
  }

  const toggleCategory = (categoryId: string) => {
    setOpenCategoryId(prev => (prev === categoryId ? null : categoryId))
  }

  const filteredUserBranches = isPlatformDeveloper
    ? userBranches
    : userBranches.filter(b => b.id !== "local-debug-branch")

  return (
    <div className="flex flex-col h-full text-white">
      {/* Logo / Brand */}
      <div
        className={[
          "flex items-center justify-between shrink-0 border-b border-white/[0.06]",
          collapsed ? "h-14 justify-center px-0" : "h-14 px-4",
        ].join(" ")}
      >
        <SunumLogo className={collapsed ? "size-8 mx-auto" : "size-7"} showText={!collapsed} />
        {!collapsed && onToggle && (
          <button
            type="button"
            onClick={onToggle}
            className="hidden lg:flex size-7 rounded-lg hover:bg-white/[0.04] items-center justify-center text-zinc-400 hover:text-white transition-colors cursor-pointer shrink-0"
            title={t.nav.collapse}
          >
            <PanelLeftClose size={14} />
          </button>
        )}
      </div>

      {/* Single Frameless Branch Selector (Only in Sidebar) */}
      {!collapsed && filteredUserBranches.length > 0 && (
        <div className="px-2 pt-2 pb-1 shrink-0 border-b border-white/[0.04]">
          <BranchSelector
            branches={filteredUserBranches}
            currentBranch={currentBranch}
            onBranchChange={onBranchChange}
          />
        </div>
      )}

      {/* ── Minimal Menu Filter Trigger ── */}
      {!collapsed ? (
        <div className="px-2 pt-1.5 pb-1 shrink-0">
          {!isSearchOpen ? (
            <button
              type="button"
              onClick={() => {
                setIsSearchOpen(true)
                setTimeout(() => searchInputRef.current?.focus(), 60)
              }}
              className="w-full text-sm text-zinc-400 hover:text-white py-1.5 px-3 rounded-lg transition-colors flex items-center justify-between cursor-pointer select-none"
            >
              <div className="flex items-center gap-2.5">
                <Search size={14} className="text-zinc-500 shrink-0" />
                <span className="text-xs text-zinc-500">Menüde filtrele...</span>
              </div>
              <span className="text-[10px] font-mono text-zinc-600">⌘K</span>
            </button>
          ) : (
            <div className="flex items-center gap-2 bg-[#080A09]/80 border border-white/[0.06] rounded-lg px-3 py-1.5">
              <Search size={13} className="text-emerald-400 shrink-0" />
              <input
                ref={searchInputRef}
                type="text"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                onKeyDown={e => {
                  if (e.key === "Escape") {
                    setSearchQuery("")
                    setIsSearchOpen(false)
                  }
                }}
                placeholder="Menü adı yazın..."
                className="w-full bg-transparent text-xs text-white placeholder:text-zinc-500 outline-none"
              />
              <button
                type="button"
                onClick={() => {
                  setSearchQuery("")
                  setIsSearchOpen(false)
                }}
                className="text-zinc-500 hover:text-white cursor-pointer"
                title="Kapat"
              >
                <X size={13} />
              </button>
            </div>
          )}

          {searchQuery && (
            <div className="flex items-center justify-between mt-1 px-2 text-[11px] text-zinc-500">
              <span>{totalMatchingCount} sonuç</span>
              <button
                type="button"
                onClick={() => {
                  setSearchQuery("")
                  setIsSearchOpen(false)
                }}
                className="hover:text-white text-[10px] cursor-pointer"
              >
                Temizle
              </button>
            </div>
          )}
        </div>
      ) : (
        <div className="px-2 pt-2 pb-1 shrink-0 flex justify-center">
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                type="button"
                onClick={() => {
                  onToggle?.()
                  setIsSearchOpen(true)
                  setTimeout(() => searchInputRef.current?.focus(), 150)
                }}
                className="text-zinc-400 hover:text-white hover:bg-white/[0.04] rounded-lg w-9 h-9 flex items-center justify-center transition-colors cursor-pointer"
              >
                <Search size={16} />
              </button>
            </TooltipTrigger>
            <TooltipContent side="right" className="glass-panel text-white border-white/[0.06]">Menüde ara...</TooltipContent>
          </Tooltip>
        </div>
      )}

      {/* ── Frameless Navigation (Çerçevesiz Sidebar) ── */}
      {collapsed ? (
        <nav className="flex-1 overflow-y-auto py-2 px-2 space-y-0.5">
          {availableCategories.map((cat, idx) => (
            <div key={cat.id} className="space-y-0.5">
              {idx > 0 && <div className="h-px bg-white/[0.04] my-1.5 mx-2" />}
              {cat.items.map(item => (
                <NavItem
                  key={item.href + item.name}
                  item={item}
                  isActive={isItemActive(item)}
                  collapsed={true}
                  onClick={onNavClick}
                  onLogout={onLogout}
                />
              ))}
            </div>
          ))}
        </nav>
      ) : (
        <nav className="flex-1 overflow-y-auto py-1.5 px-2 space-y-0.5">
          {displayedCategories.map(cat => {
            const isOpen = isCategoryOpen(cat.id)
            const categoryUnreadCount = cat.items.reduce(
              (sum, item) => sum + (item.resource ? (unreadCounts[item.resource] || 0) : 0),
              0
            )
            const CategoryIcon = cat.icon
            const isAnyItemActive = cat.items.some(item => isItemActive(item))

            return (
              <div key={cat.id}>
                <button
                  type="button"
                  onClick={() => toggleCategory(cat.id)}
                  className={[
                    "w-full text-sm text-zinc-400 hover:text-white py-2 px-3 rounded-lg transition-colors flex items-center justify-between select-none group cursor-pointer",
                    isAnyItemActive && !isOpen
                      ? "bg-white/[0.06] text-white font-medium"
                      : isOpen
                        ? "text-white font-medium"
                        : "",
                  ].join(" ")}
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    {isAnyItemActive && !isOpen && (
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 shrink-0" aria-hidden />
                    )}
                    <CategoryIcon
                      size={16}
                      className={[
                        "shrink-0 transition-colors",
                        isOpen || isAnyItemActive ? "text-white" : "text-zinc-400 group-hover:text-white",
                      ].join(" ")}
                    />
                    <span className="truncate text-left">{cat.title}</span>
                    {!isOpen && categoryUnreadCount > 0 && (
                      <span className="flex h-4 min-w-[16px] items-center justify-center rounded-full bg-emerald-500/10 text-emerald-400 px-1 text-[9px] font-medium">
                        {categoryUnreadCount}
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-1.5 shrink-0 ml-1">
                    {isSearching && (
                      <span className="text-[10px] text-emerald-400 font-medium px-1.5 py-0.5 rounded-full bg-emerald-500/10">
                        {cat.items.length}
                      </span>
                    )}
                    <ChevronDown
                      size={14}
                      className={[
                        "shrink-0 transition-transform duration-200 text-zinc-500 group-hover:text-white",
                        isOpen ? "rotate-0 text-zinc-300" : "-rotate-90",
                      ].join(" ")}
                    />
                  </div>
                </button>

                <AnimatePresence initial={false}>
                  {isOpen && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: "auto" }}
                      exit={{ opacity: 0, height: 0 }}
                      transition={{ duration: 0.16, ease: "easeInOut" }}
                      className="overflow-hidden"
                    >
                      <div className="pl-4 pr-0 py-0.5 space-y-0.5">
                        {cat.items.map(item => (
                          <NavItem
                            key={item.href + item.name}
                            item={item}
                            isActive={isItemActive(item)}
                            collapsed={false}
                            onClick={onNavClick}
                            onLogout={onLogout}
                          />
                        ))}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            )
          })}

          {isSearching && displayedCategories.length === 0 && (
            <div className="py-6 px-4 text-center my-2">
              <Search size={18} className="mx-auto text-zinc-500 mb-1.5" />
              <p className="text-xs font-medium text-white">Sonuç bulunamadı</p>
              <button
                type="button"
                onClick={() => {
                  setSearchQuery("")
                  searchInputRef.current?.focus()
                }}
                className="mt-1.5 text-xs text-emerald-400 hover:underline cursor-pointer"
              >
                Aramayı Temizle
              </button>
            </div>
          )}
        </nav>
      )}

      {/* ── Minimal Frameless Sidebar Footer (Duplicate Profile Box Removed) ── */}
      <div className="shrink-0 border-t border-white/[0.06] p-2 space-y-0.5">
        <LanguageSwitcher collapsed={collapsed} />
        <VendorBandrol collapsed={collapsed} onTamper={onTamper} />
      </div>
    </div>
  )
}

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const pathname = usePathname()
  const { session, loading, logout, currentBranch, setCurrentBranch, userBranches, hasPermission, isSuperAdmin, isPlatformDeveloper } = useAuth()
  const [isTampered, setIsTampered] = useState(false)

  const { t } = useLanguage()
  const [mobileOpen, setMobileOpen] = useState(false)
  const [collapsed, setCollapsed] = useState(false)
  const [logoUrl, setLogoUrl] = useState<string>("/images/logo.png")
  const [headerCompanyTitle, setHeaderCompanyTitle] = useState<string>(BRAND_CONFIG.name || "Ajans Yönetim Paneli")
  const [dateTimeText, setDateTimeText] = useState<string>("")

  // Live Date/Time for Minimal Header
  useEffect(() => {
    const updateClock = () => {
      const now = new Date()
      const formatted = now.toLocaleDateString("tr-TR", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      }) + " • " + now.toLocaleTimeString("tr-TR", {
        hour: "2-digit",
        minute: "2-digit",
      })
      setDateTimeText(formatted)
    }
    updateClock()
    const timer = setInterval(updateClock, 30000)
    return () => clearInterval(timer)
  }, [])

  useEffect(() => {
    async function loadConfig() {
      try {
        const res = await fetch("/api/system-config")
        if (res.ok) {
          const config = await res.json()
          if (config.company?.title && config.company.title.trim() !== "") {
            setHeaderCompanyTitle(config.company.title)
          } else {
            setHeaderCompanyTitle(BRAND_CONFIG.name || "Ajans Yönetim Paneli")
          }
          const activeLogo = config.bgRemovedLogoUrl || config.logoUrl
          if (activeLogo) {
            setLogoUrl(activeLogo)
            localStorage.setItem("theme-logo", activeLogo)
          }
        }
      } catch (err) {
        console.error(err)
      }
    }

    loadConfig()

    const handleUpdate = () => loadConfig()
    window.addEventListener("system-config-updated", handleUpdate)
    return () => window.removeEventListener("system-config-updated", handleUpdate)
  }, [])

  useEffect(() => {
    if (!loading && !session) router.push("/")
  }, [session, loading, router])

  // Initialize client log buffer once on mount
  useEffect(() => {
    initLogCapturer()
  }, [])

  // Web Push Subscription
  useEffect(() => {
    if (!loading && session && 'serviceWorker' in navigator && 'PushManager' in window) {
      const vapidKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || "BLdGy2Ltr0s0zsvaOqwbrd6jZwF478FE0oXuVmhwTX4EinfoPKO6sqJ9oSl_TUeN6-e7HSutQnUCmYRMoemGBpU";
      
      const urlBase64ToUint8Array = (base64String: string) => {
        const padding = '='.repeat((4 - base64String.length % 4) % 4);
        const base64 = (base64String + padding).replace(/\-/g, '+').replace(/_/g, '/');
        const rawData = window.atob(base64);
        const outputArray = new Uint8Array(rawData.length);
        for (let i = 0; i < rawData.length; ++i) outputArray[i] = rawData.charCodeAt(i);
        return outputArray;
      };

      navigator.serviceWorker.register('/sw.js').then(async (registration) => {
        try {
          const subscription = await registration.pushManager.subscribe({
            userVisibleOnly: true,
            applicationServerKey: urlBase64ToUint8Array(vapidKey)
          });
          await fetch('/api/notifications/subscribe', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ subscription })
          });
        } catch (e) {
          console.error('Push registration failed', e);
        }
      });
    }
  }, [loading, session])

  useEffect(() => {
    const stored = localStorage.getItem("sidebar-collapsed")
    if (stored === "true") setCollapsed(true)
  }, [])

  const toggleCollapsed = useCallback(() => {
    setCollapsed(prev => {
      const next = !prev
      localStorage.setItem("sidebar-collapsed", String(next))
      return next
    })
  }, [])

  const handleBranchChange = (branch: Branch) => setCurrentBranch(branch)

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#080A09]">
        <div className="flex flex-col items-center gap-4 glass-panel p-8 rounded-[20px]">
          <SunumLogo className="size-12 shadow-lg" />
          <div className="flex gap-1.5">
            <span className="size-2 rounded-full bg-[#34D399] animate-bounce" style={{ animationDelay: "0ms" }} />
            <span className="size-2 rounded-full bg-[#34D399] animate-bounce" style={{ animationDelay: "150ms" }} />
            <span className="size-2 rounded-full bg-[#34D399] animate-bounce" style={{ animationDelay: "300ms" }} />
          </div>
        </div>
      </div>
    )
  }

  if (!session) return null

  const isSecurityDisabledLocally = typeof window !== "undefined" && localStorage.getItem("security-disabled") === "true"

  if (isTampered && !isSecurityDisabledLocally) {
    return (
      <div className="fixed inset-0 z-[99999] bg-[#080A09]/95 backdrop-blur-xl flex items-center justify-center p-6 select-none animate-fade-in">
        <div className="w-full max-w-md glass-panel rounded-[20px] p-8 text-center space-y-6 shadow-2xl relative overflow-hidden text-white">
          <div className="absolute top-0 left-0 w-full h-1.5 bg-destructive" />
          
          <div className="size-16 rounded-2xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-center mx-auto text-rose-400">
            <ShieldAlert size={36} />
          </div>

          <div className="space-y-2">
            <h1 className="text-xl font-light tracking-tight text-rose-400 flex items-center justify-center gap-2">
              <AlertTriangle size={20} /> LİSANS İHLALİ ALGILANDI
            </h1>
            <p className="text-xs text-zinc-400 font-mono">Çiçekana ERP Lisans Koruma Sistemi</p>
          </div>

          <div className="glass-card p-5 rounded-[20px] text-xs text-left leading-relaxed text-zinc-300 font-sans space-y-3">
            <p className="text-rose-400 font-medium uppercase tracking-wider flex items-center gap-1.5">
              <AlertCircle size={14} /> Hata Kodu: 0x800F_BRANDING_BYPASS
            </p>
            <p className="text-sm font-medium text-white mt-1">
              System License Modification Detected. Please contact Çiçekana Teknoloji.
            </p>
            <p className="text-zinc-400 text-[11px] leading-normal">
              Yazılımın lisans bandrolünü gizleme, silme veya üzerinde izinsiz değişiklik yapma girişimi tespit edildi. Sistem bütünlüğü korunması amacıyla paneline erişim askıya alınmıştır.
            </p>
          </div>

          <div className="pt-2">
            <a 
              href="https://cicekanatech.com" 
              target="_blank" 
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-[#34D399] text-[#061811] text-xs font-medium transition-all"
            >
              Çiçekana Teknoloji &amp; Medya
              <ExternalLink size={14} />
            </a>
          </div>
        </div>
      </div>
    )
  }

  const sidebarProps: SidebarContentProps = {
    collapsed,
    pathname,
    isSuperAdmin,
    session,
    onLogout: logout,
    onToggle: toggleCollapsed,
    userBranches,
    currentBranch,
    onBranchChange: handleBranchChange,
    hasPermission,
    onTamper: () => setIsTampered(true),
  }


  return (
    <NotificationProvider>
      <TooltipProvider delayDuration={200}>
        <div className="relative flex h-screen overflow-hidden bg-[#080A09] text-white p-2.5 lg:p-3.5 gap-2.5 lg:gap-3.5">

          {/* ── Top-Right Subtle Emerald Ambient Glow (#10B981/5) ── */}
          <div className="pointer-events-none fixed inset-0 z-0 overflow-hidden" aria-hidden="true">
            <div className="absolute -top-24 -right-24 h-[520px] w-[520px] rounded-full bg-[#10B981]/5 blur-[140px]" />
          </div>

          {/* ── Desktop Floating Glass Sidebar ── */}
          <aside
            className={[
              "relative z-20 hidden lg:flex flex-col shrink-0 glass-panel rounded-[20px]",
              "transition-[width] duration-300 ease-in-out",
              collapsed ? "w-[68px]" : "w-[252px]",
            ].join(" ")}
          >
            <div className="flex flex-col h-full overflow-hidden rounded-[20px]">
              <SidebarContent {...sidebarProps} />
            </div>

            {/* Collapse toggle */}
            <button
              onClick={toggleCollapsed}
              className="absolute bottom-24 -right-3 z-30 hidden lg:flex size-6 rounded-full glass-panel items-center justify-center text-zinc-400 hover:text-white transition-all cursor-pointer"
              title={collapsed ? t.nav.expand : t.nav.collapse}
            >
              {collapsed
                ? <PanelLeftOpen size={12} />
                : <PanelLeftClose size={12} />
              }
            </button>
          </aside>

          {/* ── Mobile Sidebar (Sheet) ── */}
          <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
            <SheetContent
              side="left"
              className="w-[264px] p-0 glass-panel border-r border-white/[0.06] text-white"
            >
              <SidebarContent
                {...sidebarProps}
                collapsed={false}
                onNavClick={() => setMobileOpen(false)}
              />
            </SheetContent>
          </Sheet>

          {/* ── Main Column ── */}
          <div className="relative z-10 flex flex-col flex-1 min-w-0 overflow-hidden gap-2">

            {/* ── Ultra-Thin Single-Line Demo Info Strip ── */}
            <div className="bg-emerald-950/30 border-b border-emerald-500/10 text-xs text-zinc-400 py-1.5 px-4 rounded-xl flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2 truncate">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 shrink-0" />
                <span className="text-zinc-300 font-medium">Sunum ERP Canlı Demo:</span>
                <span className="truncate hidden sm:inline">
                  Tüm grafikler ve tablolar zenginleştirilmiş örnek verilerle aktiftir; form işlemleri güvenle simüle edilmektedir.
                </span>
              </div>
              <span className="text-[11px] text-emerald-400/90 shrink-0 ml-3">Simülasyon</span>
            </div>

            {/* ── Minimal Header (Left: Rounded Search Bar, Right: Notification, Date/Time, Small Round Avatar) ── */}
            <header className="h-13 shrink-0 glass-panel rounded-[20px] flex items-center justify-between px-4 z-20">
              <div className="flex items-center gap-3">
                {/* Mobile menu trigger */}
                <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
                  <SheetTrigger asChild>
                    <Button variant="ghost" size="icon" className="lg:hidden size-8 rounded-full text-zinc-300">
                      <Menu size={17} />
                    </Button>
                  </SheetTrigger>
                </Sheet>

                {/* Mobile brand */}
                <div className="flex items-center gap-2 lg:hidden">
                  <SunumLogo className="size-6" showText={true} />
                </div>

                {/* Desktop: Slim Rounded Search Bar */}
                <div className="hidden lg:flex items-center gap-2.5 bg-[#111513] border border-white/[0.06] rounded-full px-4 py-1.5 text-sm w-72 xl:w-88 focus-within:border-emerald-500/30 transition-colors">
                  <Search size={14} className="text-zinc-500 shrink-0" />
                  <input
                    className="flex-1 bg-transparent text-sm outline-none text-white placeholder:text-zinc-500"
                    placeholder={t.header.search}
                    type="text"
                  />
                </div>
              </div>

              {/* Right: Notification Icon, Date/Time, Small Round Avatar */}
              <div className="flex items-center gap-3">
                <NotificationCenter />

                {dateTimeText && (
                  <span className="hidden sm:inline-block text-xs text-zinc-400 font-light tracking-tight tabular-nums select-none">
                    {dateTimeText}
                  </span>
                )}

                <Tooltip>
                  <TooltipTrigger asChild>
                    <Link
                      href="/dashboard/settings"
                      className="shrink-0 rounded-full focus:outline-none"
                      aria-label={session.user.fullName}
                    >
                      {session.user.avatarUrl ? (
                        <img
                          src={session.user.avatarUrl}
                          alt={session.user.fullName}
                          className="size-8 rounded-full object-cover border border-white/[0.08] hover:border-emerald-500/40 transition-colors"
                        />
                      ) : (
                        <div className="size-8 rounded-full bg-emerald-400/15 text-emerald-300 border border-emerald-500/25 flex items-center justify-center text-xs font-medium hover:bg-emerald-400/25 transition-colors">
                          {session.user.fullName.substring(0, 2).toUpperCase()}
                        </div>
                      )}
                    </Link>
                  </TooltipTrigger>
                  <TooltipContent side="bottom" className="glass-panel text-white border-white/[0.06] text-xs">
                    {session.user.fullName}
                  </TooltipContent>
                </Tooltip>
              </div>
            </header>

            {/* ── Page Content ── */}
            <main className="flex-1 overflow-y-auto px-1 py-1 lg:px-2 lg:py-2 bg-transparent">
              <div className="max-w-[1600px] mx-auto space-y-6">
                {children}
              </div>
            </main>
          </div>

        </div>

        {/* Floating AI Chat (Minimal Emerald Orb Capsule) */}
        <KuscuChat />

        {/* Technical Support Floating Widget */}
        <SupportWidget />

        {/* Welcome Walkthrough Tour */}
        <OnboardingModal />

        {/* Global Demo Mode Mutation Interceptor */}
        <DemoModeInterceptor />
      </TooltipProvider>
    </NotificationProvider>
  )
}
