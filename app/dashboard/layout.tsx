"use client"

import type React from "react"
import { useEffect, useState, useCallback, useRef, useMemo } from "react"
import { useRouter, usePathname } from "next/navigation"
import Link from "next/link"
import Image from "next/image"
import { ThemeToggle } from "@/components/theme-toggle"
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
  PanelLeftClose, PanelLeftOpen, ChevronRight, ChevronDown, CalendarDays, Library, ClipboardCheck,
  Images, CalendarCheck2, ClipboardList, Globe, LifeBuoy, HelpCircle, Trash2, Terminal,
  Boxes, Warehouse, Smartphone, ShoppingCart, Sparkles, Puzzle, Search, X
} from "lucide-react"
import { SupportWidget } from "@/components/support-widget"
import { initLogCapturer } from "@/lib/utils/log-capturer"
import { BRAND_CONFIG } from "@/lib/config/brand"
import { ContextualHelp } from "@/components/shared/contextual-help"
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
          "sidebar-item group relative w-full text-left",
          "hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-950/30 dark:hover:text-red-400 text-red-600/90 dark:text-red-400/90",
          collapsed ? "justify-center px-0 mx-auto w-10 h-10" : "",
        ].join(" ")}
        style={collapsed ? { padding: 0, width: 40, height: 40, display: "flex", alignItems: "center", justifyContent: "center", borderRadius: "var(--radius)" } : {}}
      >
        <div className="relative flex items-center justify-center">
          <Icon
            size={18}
            className="shrink-0 transition-transform duration-150 text-red-500 group-hover:scale-105"
          />
        </div>
        {!collapsed && <span className="truncate">{item.name}</span>}
      </button>
    )

    if (collapsed) {
      return (
        <Tooltip>
          <TooltipTrigger asChild>{btnContent}</TooltipTrigger>
          <TooltipContent side="right" sideOffset={8}>
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
        "sidebar-item group relative",
        isActive ? "sidebar-item-active font-semibold" : "hover:bg-(--sidebar-accent) hover:text-(--sidebar-accent-foreground)",
        collapsed ? "justify-center px-0 mx-auto w-10 h-10" : "",
      ].join(" ")}
      style={collapsed ? { padding: 0, width: 40, height: 40, display: "flex", alignItems: "center", justifyContent: "center", borderRadius: "var(--radius)" } : {}}
    >
      {isActive && !collapsed && (
        <span
          className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-5 rounded-r-full bg-primary"
          aria-hidden
        />
      )}
      <div className="relative flex items-center justify-center">
        <Icon
          size={18}
          className={[
            "shrink-0 transition-transform duration-150",
            isActive ? "text-(--sidebar-accent-foreground)" : "text-(--sidebar-muted)",
            "group-hover:text-(--sidebar-accent-foreground)",
          ].join(" ")}
        />
        {collapsed && count > 0 && (
          <span className="absolute -top-1.5 -right-1.5 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-red-600 px-1 text-[9px] font-bold text-white leading-none shadow-xs border border-background">
            {count}
          </span>
        )}
      </div>
      {!collapsed && <span className="truncate">{item.name}</span>}
      {!collapsed && count > 0 && (
        <span className="ml-auto flex h-5 min-w-[20px] items-center justify-center rounded-full bg-red-600 px-1.5 text-[10px] font-bold text-white leading-none shadow-xs border border-background">
          {count}
        </span>
      )}
    </Link>
  )

  if (collapsed) {
    return (
      <Tooltip>
        <TooltipTrigger asChild>{content}</TooltipTrigger>
        <TooltipContent side="right" sideOffset={8}>
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
              className="sidebar-item hover:bg-(--sidebar-accent) hover:text-(--sidebar-accent-foreground) justify-center px-0 mx-auto"
              style={{ width: 40, height: 40, display: "flex", alignItems: "center", justifyContent: "center", borderRadius: "var(--radius)" }}
            >
              <Globe size={18} className="text-(--sidebar-muted)" />
            </button>
          </TooltipTrigger>
          <TooltipContent side="right">
            {currentLabel.flag} {currentLabel.label}
          </TooltipContent>
        </Tooltip>
      ) : (
        <button
          onClick={() => setOpen(o => !o)}
          className="sidebar-item w-full text-left hover:bg-(--sidebar-accent) hover:text-(--sidebar-accent-foreground)"
        >
          <Globe size={18} className="text-(--sidebar-muted) shrink-0" />
          <span className="flex-1 truncate">{currentLabel.flag} {currentLabel.label}</span>
        </button>
      )}

      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className={`absolute ${collapsed ? "left-12 bottom-0" : "left-0 bottom-full mb-1"} z-50 w-44 bg-card border border-border rounded-xl shadow-lg py-1 overflow-hidden`}>
            {(Object.entries(LOCALE_LABELS) as [SupportedLocale, { label: string; flag: string }][]).map(([code, { label, flag }]) => (
              <button
                key={code}
                onClick={() => { setLocale(code); setOpen(false) }}
                className={`w-full text-left px-3 py-2 text-sm flex items-center gap-2 hover:bg-muted/60 transition-colors ${locale === code ? "text-primary font-semibold bg-primary/5" : "text-foreground"}`}
              >
                <span>{flag}</span>
                <span>{label}</span>
                {locale === code && <span className="ml-auto text-xs">✓</span>}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  )
}

function SidebarContent({
  collapsed, pathname, isSuperAdmin, session,
  onNavClick, onLogout, onToggle,
  userBranches, currentBranch, onBranchChange, hasPermission,
  onTamper
}: SidebarContentProps) {

  const { t } = useLanguage()
  const { isPlatformDeveloper } = useAuth()
  const { unreadCounts } = useNotificationStore()
  const [logoUrl, setLogoUrl] = useState<string>("/images/logo.png")
  const [subPlan, setSubPlan] = useState<string | null>(null)
  const [companyTitle, setCompanyTitle] = useState<string>(BRAND_CONFIG.name || "Ajans Yönetim Paneli")

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
          if (config.company?.title && config.company.title.trim() !== "") {
            setCompanyTitle(config.company.title)
          } else {
            setCompanyTitle(BRAND_CONFIG.name || "Ajans Yönetim Paneli")
          }
          const activeLogo = config.bgRemovedLogoUrl || config.logoUrl
          if (activeLogo) {
            setLogoUrl(activeLogo)
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
      title: "Stok, Depo & Tedarik",
      icon: Boxes,
      items: [
        { name: (t.nav as any).inventory || "Stok & Varyant Matrix", href: "/dashboard/stok", icon: Boxes, resource: "stok" },
        { name: (t.nav as any).wms || "WMS Depo Yönetimi", href: "/dashboard/wms", icon: Warehouse, resource: "wms" },
        { name: (t.nav as any).wmsMobile || "WMS Mobil Terminal", href: "/dashboard/wms/mobil", icon: Smartphone, resource: "wms" },
        { name: (t.nav as any).procurement || "Akıllı Satın Alma & ROP", href: "/dashboard/satinalma", icon: ShoppingCart, resource: "satinalma" },
        { name: (t.nav as any).omnichannel || "Omnichannel & E-İrsaliye", href: "/dashboard/omnichannel", icon: Globe, resource: "omnichannel" },
        { name: (t.nav as any).inventoryAi || "Stok AI & Foresight", href: "/dashboard/stok-ai", icon: Sparkles, resource: "stok-ai" },
        { name: (t.nav as any).ecosystem || "API, Eklentiler & SaaS", href: "/dashboard/envanter-ekosistem", icon: Puzzle, resource: "ekosistem" },
      ],
    },
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
  ], [t])

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
    <div className="flex flex-col h-full">
      {/* Logo / Brand */}
      <div
        className={[
          "flex items-center shrink-0 border-b border-(--sidebar-border)",
          collapsed ? "h-16 justify-center px-0" : "h-16 px-4",
        ].join(" ")}
      >
        <SunumLogo className={collapsed ? "size-8 mx-auto" : "size-8"} showText={!collapsed} />
      </div>

      {/* Branch selector */}
      {!collapsed && filteredUserBranches.length > 0 && (
        <div className="px-3 pt-3 pb-1">
          <BranchSelector
            branches={filteredUserBranches}
            currentBranch={currentBranch}
            onBranchChange={onBranchChange}
          />
        </div>
      )}

      {/* ── Search Bar (Between Branch Selector and Navigation) ── */}
      {!collapsed ? (
        <div className="px-3 pt-2 pb-1 shrink-0">
          <button
            type="button"
            onClick={() => {
              setIsSearchOpen(prev => {
                const next = !prev
                if (next) {
                  setTimeout(() => searchInputRef.current?.focus(), 60)
                } else {
                  setSearchQuery("")
                }
                return next
              })
            }}
            aria-expanded={isSearchOpen}
            className={[
              "w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all duration-150 border cursor-pointer select-none",
              isSearchOpen
                ? "bg-(--sidebar-accent) text-(--sidebar-accent-foreground) border-primary/40 shadow-xs"
                : "bg-muted/40 hover:bg-muted/70 text-(--sidebar-muted) hover:text-(--sidebar-foreground) border-border/50",
            ].join(" ")}
          >
            <Search
              size={14}
              className={[
                "shrink-0 transition-colors",
                isSearchOpen ? "text-primary" : "text-(--sidebar-muted)",
              ].join(" ")}
            />
            <span className="flex-1 text-left truncate">Menüde ara...</span>
            <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-background/70 border border-border/40 text-muted-foreground">
              {isSearchOpen ? "ESC" : "⌘K"}
            </span>
          </button>

          {/* Açılır Arama Alanı (Dropdown / Expandable Input) */}
          {isSearchOpen && (
            <div className="mt-1.5 transition-all duration-200 ease-out animate-in fade-in slide-in-from-top-1">
              <div className="relative flex items-center bg-background border border-primary/50 ring-2 ring-primary/15 rounded-lg px-2.5 py-1.5 shadow-sm">
                <Search size={13} className="text-primary shrink-0 mr-2" />
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
                  className="w-full bg-transparent text-xs text-foreground placeholder:text-muted-foreground outline-none"
                />
                {searchQuery ? (
                  <button
                    type="button"
                    onClick={() => {
                      setSearchQuery("")
                      searchInputRef.current?.focus()
                    }}
                    className="text-muted-foreground hover:text-foreground p-0.5 rounded cursor-pointer"
                    title="Temizle"
                  >
                    <X size={13} />
                  </button>
                ) : null}
              </div>

              {searchQuery && (
                <div className="flex items-center justify-between mt-1 px-1 text-[11px] text-muted-foreground">
                  <span>{totalMatchingCount} menü bulundu</span>
                  <button
                    type="button"
                    onClick={() => {
                      setSearchQuery("")
                      setIsSearchOpen(false)
                    }}
                    className="hover:text-foreground text-[10px] underline cursor-pointer"
                  >
                    Temizle (ESC)
                  </button>
                </div>
              )}
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
                className="sidebar-item hover:bg-(--sidebar-accent) hover:text-(--sidebar-accent-foreground) justify-center px-0 mx-auto"
                style={{ width: 40, height: 40, display: "flex", alignItems: "center", justifyContent: "center", borderRadius: "var(--radius)" }}
              >
                <Search size={18} className="text-(--sidebar-muted)" />
              </button>
            </TooltipTrigger>
            <TooltipContent side="right">Menüde ara...</TooltipContent>
          </Tooltip>
        </div>
      )}

      {/* Navigation */}
      {collapsed ? (
        <nav className="flex-1 overflow-y-auto py-2 px-2 space-y-1">
          {availableCategories.map((cat, idx) => (
            <div key={cat.id} className="space-y-1">
              {idx > 0 && <div className="h-px bg-border/40 my-1.5 mx-1" />}
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
        <nav className="flex-1 overflow-y-auto py-2 px-2 space-y-1">
          {displayedCategories.map(cat => {
            const isOpen = isCategoryOpen(cat.id)
            const categoryUnreadCount = cat.items.reduce(
              (sum, item) => sum + (item.resource ? (unreadCounts[item.resource] || 0) : 0),
              0
            )
            const CategoryIcon = cat.icon
            const isAnyItemActive = cat.items.some(item => isItemActive(item))

            return (
              <div key={cat.id} className="rounded-lg transition-colors">
                <button
                  type="button"
                  onClick={() => toggleCategory(cat.id)}
                  className={[
                    "w-full flex items-center justify-between px-2.5 py-2 rounded-lg text-xs font-semibold transition-all duration-150 select-none group cursor-pointer",
                    isOpen
                      ? "text-(--sidebar-foreground) bg-(--sidebar-accent)/60 shadow-xs"
                      : isAnyItemActive
                        ? "text-primary bg-primary/5 font-semibold"
                        : "text-(--sidebar-muted) hover:text-(--sidebar-foreground) hover:bg-(--sidebar-accent)/30",
                  ].join(" ")}
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <CategoryIcon
                      size={16}
                      className={[
                        "shrink-0 transition-colors",
                        isOpen || isAnyItemActive
                          ? "text-primary"
                          : "text-(--sidebar-muted) group-hover:text-(--sidebar-foreground)",
                      ].join(" ")}
                    />
                    <span className="truncate tracking-wide text-left">{cat.title}</span>
                    {!isOpen && categoryUnreadCount > 0 && (
                      <span className="flex h-4 min-w-[16px] items-center justify-center rounded-full bg-red-600 px-1 text-[9px] font-bold text-white shadow-xs">
                        {categoryUnreadCount}
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-1.5 shrink-0 ml-1">
                    {isSearching && (
                      <span className="text-[10px] text-primary font-medium px-1.5 py-0.2 rounded-full bg-primary/10">
                        {cat.items.length}
                      </span>
                    )}
                    <ChevronDown
                      size={14}
                      className={[
                        "shrink-0 transition-transform duration-200 text-(--sidebar-muted) group-hover:text-(--sidebar-foreground)",
                        isOpen ? "rotate-0 text-primary" : "-rotate-90",
                      ].join(" ")}
                    />
                  </div>
                </button>

                {isOpen && (
                  <div className="pl-3 pr-1 py-1 space-y-0.5 border-l border-primary/20 ml-4.5 my-0.5 animate-in fade-in slide-in-from-top-1 duration-150">
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
                )}
              </div>
            )
          })}

          {isSearching && displayedCategories.length === 0 && (
            <div className="py-8 px-4 text-center">
              <Search size={22} className="mx-auto text-muted-foreground/40 mb-2" />
              <p className="text-xs font-semibold text-foreground">Sonuç bulunamadı</p>
              <p className="text-[11px] text-muted-foreground mt-0.5">
                &ldquo;{searchQuery}&rdquo; ile eşleşen bir menü bulunamadı
              </p>
              <button
                type="button"
                onClick={() => {
                  setSearchQuery("")
                  searchInputRef.current?.focus()
                }}
                className="mt-2 text-xs font-medium text-primary hover:underline cursor-pointer"
              >
                Aramayı Temizle
              </button>
            </div>
          )}
        </nav>
      )}

      {/* Footer */}
      <div className="shrink-0 border-t border-(--sidebar-border) p-2 space-y-1">
        {/* Language Switcher */}
        <LanguageSwitcher collapsed={collapsed} />

        {collapsed ? (
          <>
            <Tooltip>
              <TooltipTrigger asChild>
                <Link
                  href="/dashboard/settings"
                  onClick={onNavClick}
                  className="sidebar-item hover:bg-(--sidebar-accent) hover:text-(--sidebar-accent-foreground) justify-center px-0 mx-auto"
                  style={{ width: 40, height: 40, display: "flex", alignItems: "center", justifyContent: "center", borderRadius: "var(--radius)" }}
                >
                  <Settings size={18} className="text-(--sidebar-muted)" />
                </Link>
              </TooltipTrigger>
              <TooltipContent side="right">{t.nav.settings}</TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  type="button"
                  onClick={onLogout}
                  className="sidebar-item hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-950/30 dark:hover:text-red-400 justify-center mx-auto"
                  style={{ width: 40, height: 40, display: "flex", alignItems: "center", justifyContent: "center", borderRadius: "var(--radius)" }}
                >
                  <LogOut size={18} className="text-(--sidebar-muted)" />
                </button>
              </TooltipTrigger>
              <TooltipContent side="right">{t.nav.logout}</TooltipContent>
            </Tooltip>
          </>
        ) : (
          <>
            {session && (
              <Link
                href="/dashboard/settings"
                onClick={onNavClick}
                className="flex items-center gap-3 mt-1.5 px-3 py-2 rounded-lg hover:bg-(--sidebar-accent) transition-colors group"
              >
                {session.user.avatarUrl ? (
                  <img src={session.user.avatarUrl} alt="Avatar" className="size-8 rounded-full object-cover shrink-0 border border-gray-200 dark:border-gray-800" />
                ) : (
                  <div className="size-8 rounded-full bg-primary/10 text-primary flex items-center justify-center text-xs font-bold shrink-0">
                    {session.user.fullName?.substring(0, 2).toUpperCase() || "US"}
                  </div>
                )}
                <div className="flex flex-col leading-none overflow-hidden min-w-0">
                  <span className="text-sm font-semibold text-(--sidebar-foreground) truncate">
                    {session.user.fullName}
                  </span>
                  <span className="text-caption truncate text-(--sidebar-muted)">
                    {isSuperAdmin ? "Süper Yönetici" : ((currentBranch as any)?.role?.name || (session.user as any).position || "Kullanıcı")}
                  </span>
                </div>
                <ChevronRight size={14} className="text-(--sidebar-muted) shrink-0 ml-auto group-hover:translate-x-0.5 transition-transform" />
              </Link>
            )}
          </>
        )}
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
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4">
          <SunumLogo className="size-12 shadow-lg" />
          <div className="flex gap-1.5">
            <span className="size-2 rounded-full bg-primary animate-bounce" style={{ animationDelay: "0ms" }} />
            <span className="size-2 rounded-full bg-primary animate-bounce" style={{ animationDelay: "150ms" }} />
            <span className="size-2 rounded-full bg-primary animate-bounce" style={{ animationDelay: "300ms" }} />
          </div>
        </div>
      </div>
    )
  }

  if (!session) return null

  const isSecurityDisabledLocally = typeof window !== "undefined" && localStorage.getItem("security-disabled") === "true"

  if (isTampered && !isSecurityDisabledLocally) {
    return (
      <div className="fixed inset-0 z-[99999] bg-background/95 backdrop-blur-md flex items-center justify-center p-6 select-none animate-fade-in">
        <div className="w-full max-w-md bg-card border border-border rounded-3xl p-8 text-center space-y-6 shadow-2xl relative overflow-hidden text-card-foreground">
          <div className="absolute top-0 left-0 w-full h-1.5 bg-destructive" />
          
          <div className="size-16 rounded-2xl bg-destructive/10 border border-destructive/20 flex items-center justify-center mx-auto text-destructive">
            <span className="material-symbols-outlined text-[36px]">shield_alert</span>
          </div>

          <div className="space-y-2">
            <h1 className="text-xl font-bold tracking-tight text-destructive flex items-center justify-center gap-2">
              <span className="material-symbols-outlined text-[20px]">warning</span> LİSANS İHLALİ ALGILANDI
            </h1>
            <p className="text-xs text-muted-foreground font-mono">Çiçekana ERP Lisans Koruma Sistemi</p>
          </div>

          <div className="bg-muted/50 border border-border p-5 rounded-2xl text-xs text-left leading-relaxed text-muted-foreground font-sans space-y-3">
            <p className="text-destructive font-bold uppercase tracking-wider flex items-center gap-1.5">
              <span className="material-symbols-outlined text-[14px]">error</span> Hata Kodu: 0x800F_BRANDING_BYPASS
            </p>
            <p className="text-sm font-semibold text-foreground mt-1">
              System License Modification Detected. Please contact Çiçekana Teknoloji.
            </p>
            <p className="text-muted-foreground text-[11px] leading-normal">
              Yazılımın lisans bandrolünü gizleme, silme veya üzerinde izinsiz değişiklik yapma girişimi tespit edildi. Sistem bütünlüğü korunması amacıyla paneline erişim askıya alınmıştır.
            </p>
          </div>

          <div className="pt-2">
            <a 
              href="https://cicekanatech.com" 
              target="_blank" 
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-muted hover:bg-muted/80 text-foreground border border-border text-xs font-bold transition-all"
            >
              Çiçekana Teknoloji &amp; Medya
              <span className="material-symbols-outlined text-[14px]">open_in_new</span>
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
        <div className="flex h-screen overflow-hidden bg-background text-foreground">

          {/* ── Desktop Sidebar ── */}
          <aside
            className={[
              "hidden lg:flex flex-col shrink-0 bg-(--sidebar) border-r border-(--sidebar-border)",
              "transition-[width] duration-200 ease-in-out overflow-hidden",
              collapsed ? "w-[68px]" : "w-[240px]",
            ].join(" ")}
          >
            <SidebarContent {...sidebarProps} />

            {/* Collapse toggle */}
            <button
              onClick={toggleCollapsed}
              className="absolute bottom-32 -right-3 z-10 hidden lg:flex size-6 rounded-full bg-card border border-border shadow-sm items-center justify-center text-muted-foreground hover:text-foreground hover:shadow-md transition-all"
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
              className="w-[260px] p-0 bg-(--sidebar) border-r border-(--sidebar-border)"
            >
              <SidebarContent
                {...sidebarProps}
                collapsed={false}
                onNavClick={() => setMobileOpen(false)}
              />
            </SheetContent>
          </Sheet>

          {/* ── Main Column ── */}
          <div className="flex flex-col flex-1 min-w-0 overflow-hidden">

            {/* ── Header ── */}
            <header className="h-14 shrink-0 bg-(--header) border-b border-(--header-border) flex items-center justify-between px-4 lg:px-5 z-20">
              <div className="flex items-center gap-3">
                {/* Mobile menu trigger */}
                <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
                  <SheetTrigger asChild>
                    <Button variant="ghost" size="icon" className="lg:hidden text-muted-foreground">
                      <Menu size={20} />
                    </Button>
                  </SheetTrigger>
                </Sheet>

                {/* Mobile brand */}
                <div className="flex items-center gap-2 lg:hidden">
                  <SunumLogo className="size-6" showText={true} />
                </div>

                {/* Desktop: search */}
                <div className="hidden lg:flex items-center gap-2 bg-muted/60 border border-border rounded-lg px-3 py-1.5 w-64 xl:w-80 group focus-within:ring-2 focus-within:ring-ring/30 focus-within:border-ring transition-all">
                  <span className="material-symbols-outlined text-[18px] text-muted-foreground group-focus-within:text-primary transition-colors">search</span>
                  <input
                    className="flex-1 bg-transparent text-sm outline-none placeholder-muted-foreground text-foreground"
                    placeholder={t.header.search}
                    type="text"
                  />
                </div>

                {/* Live Demo Header Badge */}
                <div className="hidden md:flex items-center gap-2 px-2.5 py-1 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-600 dark:text-blue-400 text-xs font-semibold select-none">
                  <span className="size-2 rounded-full bg-blue-500 animate-pulse" />
                  <span>Canlı Demo</span>
                </div>
              </div>

              <div className="flex items-center gap-1 lg:gap-2">
                {/* Branch selector — desktop only */}
                {(isPlatformDeveloper ? userBranches : userBranches.filter(b => b.id !== "local-debug-branch")).length > 0 && (
                  <div className="hidden xl:block">
                    <BranchSelector
                      branches={isPlatformDeveloper ? userBranches : userBranches.filter(b => b.id !== "local-debug-branch")}
                      currentBranch={currentBranch}
                      onBranchChange={handleBranchChange}
                    />
                  </div>
                )}

                <ThemeToggle />
                <NotificationCenter />
                <ContextualHelp size={20} className="text-muted-foreground mr-1" />

                {/* User avatar */}
                <Link
                  href="/dashboard/settings"
                  className="hidden lg:flex items-center gap-2.5 pl-3 ml-1 border-l border-border hover:opacity-80 transition-opacity"
                >
                  <div className="text-right hidden xl:block">
                    <p className="text-sm font-semibold text-foreground leading-tight">{session.user.fullName}</p>
                    <p className="text-caption">{isSuperAdmin ? t.nav.superAdmin : ((session.user as any).position || t.nav.user)}</p>
                  </div>
                  <div className="size-8 rounded-full bg-primary/10 text-primary flex items-center justify-center text-xs font-bold border border-border">
                    {session.user.fullName.substring(0, 2).toUpperCase()}
                  </div>
                </Link>
              </div>
            </header>

            {/* ── Demo Bilgilendirme Çubuğu ── */}
            <div className="bg-gradient-to-r from-blue-500/10 via-indigo-500/10 to-blue-500/10 border-b border-blue-500/15 px-4 py-2 flex items-center justify-between text-xs text-blue-900 dark:text-blue-100 shrink-0">
              <div className="flex items-center gap-2">
                <span className="size-2 rounded-full bg-blue-600 dark:bg-blue-400 animate-pulse shrink-0" />
                <span className="font-semibold">Sunum ERP Canlı Demo:</span>
                <span className="text-muted-foreground hidden md:inline">
                  Tüm grafikler ve tablolar zenginleştirilmiş örnek verilerle aktiftir. Form işlemleri demo ortamında güvenle simüle edilmektedir.
                </span>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <span className="px-2.5 py-0.5 rounded-full bg-blue-600/15 text-[11px] font-semibold text-blue-700 dark:text-blue-300">
                  Salt Okunur / Simülasyon
                </span>
              </div>
            </div>

            {/* ── Page Content ── */}
            <main className="flex-1 overflow-y-auto p-4 lg:p-6 bg-background">
              <div className="max-w-[1600px] mx-auto space-y-6">
                {children}
              </div>
            </main>
          </div>

        </div>

        {/* Floating AI Chat */}
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
