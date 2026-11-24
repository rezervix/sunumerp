"use client"

import type React from "react"
import { useEffect, useState, useCallback, useMemo } from "react"
import { useRouter, usePathname } from "next/navigation"
import Link from "next/link"
import { motion, useReducedMotion } from "framer-motion"
import type { Branch } from "@/lib/auth/types"
import { useAuth } from "@/lib/auth/context"
import { KuscuChat } from "@/components/kuscu-chat"
import { NotificationCenter } from "@/components/notification-panel"
import { Sheet, SheetContent, SheetTitle, SheetTrigger } from "@/components/ui/sheet"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Button } from "@/components/ui/button"
import {
  NotificationProvider,
  useNotificationStore,
} from "@/lib/context/NotificationContext"
import { useLanguage } from "@/lib/context/LanguageContext"
import { LOCALE_LABELS, type SupportedLocale } from "@/lib/i18n"
import {
  resolveProductionFeatureFlags,
  isAnyProductionFeatureEnabled,
  type ProductionFeatureFlagsConfig,
} from "@/lib/config/production-feature-flags"
import {
  IMPLEMENTED_LOGISTICS_FLEET_HREFS,
  isLogisticsReportsMenuVisible,
  resolveLogisticsFeatureFlags,
  type LogisticsFeatureFlagsConfig,
} from "@/lib/config/logistics-feature-flags"
import {
  IMPLEMENTED_TOURISM_HREFS,
  resolveTourismFeatureFlags,
  type TourismFeatureFlagsConfig,
} from "@/lib/config/tourism-feature-flags"
import { PARTNER_ROLE_NAME } from "@/lib/tourism/constants"
import { SupportWidget } from "@/components/support-widget"
import { initLogCapturer } from "@/lib/utils/log-capturer"
import { OnboardingModal } from "@/components/shared/onboarding-modal"
import { VendorBandrol } from "@/components/vendor-bandrol"
import { SunumLogo } from "@/components/sunum-logo"
import { DemoModeInterceptor } from "@/components/demo-interceptor"
import {
  IconAlertCircle,
  IconAlertTriangle,
  IconArrowUpRight,
  IconCreditCard,
  IconDashboard,
  IconFactory,
  IconFolder,
  IconGlobe,
  IconLogOut,
  IconMegaphone,
  IconMenu,
  IconMessageCircle,
  IconSettings,
  IconShield,
  IconShoppingBag,
  IconTruck,
  IconUsers,
} from "@/components/ui/app-icons"
import { safeText } from "@/lib/utils/safe-display"

interface NavItemDef {
  name: string
  shortLabel: string
  href: string
  exact?: boolean
  resource?: string
  anyResources?: string[]
  excludeSupplier?: boolean
  adminOnly?: boolean
  devOnly?: boolean
  isLogout?: boolean
}

interface NavCategoryDef {
  id: string
  title: string
  icon: React.ComponentType<{ size?: number | string; className?: string }>
  items: NavItemDef[]
}

interface ShellContentProps {
  pathname: string
  children: React.ReactNode
  isSuperAdmin: boolean
  isPlatformDeveloper: boolean
  session: any
  onLogout: () => void
  userBranches: Branch[]
  currentBranch: Branch | null
  onBranchChange: (b: Branch) => void
  hasPermission: (resource: string, action: string) => boolean
  onTamper: () => void
  dateTimeText: string
}

function ShellInner({
  pathname,
  children,
  isSuperAdmin,
  isPlatformDeveloper,
  session,
  onLogout,
  userBranches,
  currentBranch,
  onBranchChange,
  hasPermission,
  onTamper,
  dateTimeText,
}: ShellContentProps) {
  const { t, locale, setLocale } = useLanguage()
  const { unreadCounts } = useNotificationStore()
  const prefersReducedMotion = useReducedMotion()
  const [mobileOpen, setMobileOpen] = useState(false)

  const [subPlan, setSubPlan] = useState<string | null>(null)
  const [featureFlagsConfig, setFeatureFlagsConfig] =
    useState<ProductionFeatureFlagsConfig | null>(null)
  const [logisticsFlagsConfig, setLogisticsFlagsConfig] =
    useState<LogisticsFeatureFlagsConfig | null>(null)
  const [logisticsDemoMode, setLogisticsDemoMode] = useState<boolean>(true)
  const [tourismFlagsConfig, setTourismFlagsConfig] =
    useState<TourismFeatureFlagsConfig | null>(null)
  const [tourismDemoMode, setTourismDemoMode] = useState<boolean>(true)

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
          setTourismFlagsConfig(config.tourismFeatureFlags || null)
          if (typeof config.tourismDemoMode === "boolean") {
            setTourismDemoMode(config.tourismDemoMode)
          } else if (typeof config.logisticsDemoMode === "boolean") {
            setTourismDemoMode(config.logisticsDemoMode)
          }
          const activeLogo = config.bgRemovedLogoUrl || config.logoUrl
          if (activeLogo) {
            localStorage.setItem("theme-logo", activeLogo)
          }
        }
      } catch (err) {
        console.error("Failed to load system config in shell:", err)
      }
    }

    loadConfig()
    const handleUpdate = () => loadConfig()
    window.addEventListener("system-config-updated", handleUpdate)
    return () => window.removeEventListener("system-config-updated", handleUpdate)
  }, [])

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
  const showLogisticsReportsMenu = useMemo(
    () =>
      isLogisticsReportsMenuVisible(
        logisticsFlagsConfig,
        currentBranch?.id,
        IMPLEMENTED_LOGISTICS_FLEET_HREFS,
        logisticsDemoMode
      ),
    [logisticsDemoMode, logisticsFlagsConfig, currentBranch?.id]
  )
  const tourismFlags = useMemo(
    () =>
      resolveTourismFeatureFlags(
        tourismFlagsConfig,
        currentBranch?.id,
        tourismDemoMode
      ),
    [tourismFlagsConfig, currentBranch?.id, tourismDemoMode]
  )

  const rawCategories: NavCategoryDef[] = useMemo(
    () => [
      {
        id: "genel",
        title: (t.nav as any).general || "Genel",
        icon: IconDashboard,
        items: [
          {
            name: t.nav.dashboard,
            shortLabel: "Özet",
            href: "/dashboard",
            exact: true,
            resource: "dashboard",
          },
          {
            name: t.nav.calendar,
            shortLabel: "Takvim",
            href: "/dashboard/takvim",
            resource: "takvim",
          },
          {
            name: t.nav.todos,
            shortLabel: "Yapılacaklar",
            href: "/dashboard/todos",
            resource: "yapilacaklar",
          },
          {
            name: t.nav.notes,
            shortLabel: "Notlar",
            href: "/dashboard/notes",
            resource: "notlarim",
          },
        ],
      },
      {
        id: "lojistik-ve-tedarik",
        title: "Lojistik & Tedarik",
        icon: IconTruck,
        items: [
          {
            name: "Stok Kartları & Envanter",
            shortLabel: "Stok",
            href: "/dashboard/stok",
            resource: "stok",
          },
          {
            name: "Depo Operasyonları & Sayım (WMS)",
            shortLabel: "Depo",
            href: "/dashboard/wms",
            resource: "wms",
          },
          {
            name: "Satın Alma & Otomatik Sipariş",
            shortLabel: "Satın Alma",
            href: "/dashboard/satinalma",
            resource: "satinalma",
          },
          {
            name: "Çok Kanallı Satış & Sevkiyat",
            shortLabel: "Çok Kanallı",
            href: "/dashboard/omnichannel",
            resource: "omnichannel",
          },
          ...(logisticsFlags.lojistik_sevkiyat_rota &&
          IMPLEMENTED_LOGISTICS_FLEET_HREFS.includes("/dashboard/sevkiyat")
            ? [
                {
                  name: "Sevkiyat & Rota Planlama",
                  shortLabel: "Sevkiyat",
                  href: "/dashboard/sevkiyat",
                  resource: "lojistik_sevkiyat_rota",
                },
              ]
            : []),
          ...(logisticsFlags.lojistik_filo &&
          IMPLEMENTED_LOGISTICS_FLEET_HREFS.includes("/dashboard/filo")
            ? [
                {
                  name: "Araç & Sürücü Filosu",
                  shortLabel: "Filo",
                  href: "/dashboard/filo",
                  resource: "lojistik_filo",
                },
              ]
            : []),
          ...(logisticsFlags.lojistik_iade &&
          IMPLEMENTED_LOGISTICS_FLEET_HREFS.includes("/dashboard/iade")
            ? [
                {
                  name: "İade & Ters Lojistik",
                  shortLabel: "İade",
                  href: "/dashboard/iade",
                  resource: "lojistik_iade",
                },
              ]
            : []),
          {
            name: "AI Analiz & Stok Tahmini",
            shortLabel: "AI Tahmin",
            href: "/dashboard/stok-ai",
            resource: "stok-ai",
          },
          ...(showLogisticsReportsMenu &&
          IMPLEMENTED_LOGISTICS_FLEET_HREFS.includes("/dashboard/lojistik-raporlar")
            ? [
                {
                  name: "Lojistik ve Filo Raporları",
                  shortLabel: "Raporlar",
                  href: "/dashboard/lojistik-raporlar",
                  anyResources: [
                    "lojistik_wms",
                    "lojistik_tedarikci",
                    "lojistik_sevkiyat_rota",
                    "lojistik_filo",
                    "lojistik_iade",
                  ],
                  excludeSupplier: true,
                },
              ]
            : []),
        ],
      },
      ...(showUretimCategory
        ? [
            {
              id: "uretim",
              title: "Üretim Yönetimi",
              icon: IconFactory,
              items: [
                ...(prodFlags.uretim_bom_rota
                  ? [
                      {
                        name: "Ürün Ağacı (BOM) & Rotalar",
                        shortLabel: "BOM & Rota",
                        href: "/dashboard/uretim/bom-rota",
                        resource: "uretim_bom_rota",
                      },
                    ]
                  : []),
                ...(prodFlags.uretim_mrp_mps
                  ? [
                      {
                        name: "MRP & Ana Üretim Planlama",
                        shortLabel: "MRP & Plan",
                        href: "/dashboard/uretim/mrp-mps",
                        resource: "uretim_mrp_mps",
                      },
                    ]
                  : []),
                ...(prodFlags.uretim_is_emri
                  ? [
                      {
                        name: "Üretim Emirleri & Atölye",
                        shortLabel: "İş Emirleri",
                        href: "/dashboard/uretim/is-emirleri",
                        resource: "uretim_is_emri",
                      },
                    ]
                  : []),
                ...(prodFlags.uretim_kapasite
                  ? [
                      {
                        name: "İş Merkezleri & Kapasite",
                        shortLabel: "Kapasite",
                        href: "/dashboard/uretim/kapasite",
                        resource: "uretim_kapasite",
                      },
                    ]
                  : []),
                ...(prodFlags.uretim_kalite
                  ? [
                      {
                        name: "Kalite Kontrol & Fire",
                        shortLabel: "Kalite",
                        href: "/dashboard/uretim/kalite",
                        resource: "uretim_kalite",
                      },
                    ]
                  : []),
                ...(prodFlags.uretim_bakim
                  ? [
                      {
                        name: "Ekipman & Bakım Yönetimi",
                        shortLabel: "Bakım",
                        href: "/dashboard/uretim/bakim",
                        resource: "uretim_bakim",
                      },
                    ]
                  : []),
              ],
            } satisfies NavCategoryDef,
          ]
        : []),
      {
        id: "turizm-ve-otel",
        title: "Turizm & Ağırlama",
        icon: IconGlobe,
        items: [
          {
            name: "Turizm Yönetim Panosu",
            shortLabel: "Turizm Özeti",
            href: "/dashboard/turizm",
            resource: "turizm_rentacar",
            excludeSupplier: true,
            exact: true,
          },
          ...(tourismFlags.turizm_rentacar &&
          IMPLEMENTED_TOURISM_HREFS.includes("/dashboard/arac-kiralama")
            ? [
                {
                  name: "Araç Kiralama (Rent-a-Car)",
                  shortLabel: "Rent-a-Car",
                  href: "/dashboard/arac-kiralama",
                  resource: "turizm_rentacar",
                  excludeSupplier: true,
                  exact: true,
                },
                {
                  name: "Mobil Teslim & İade",
                  shortLabel: "Teslim & İade",
                  href: "/dashboard/arac-kiralama/teslim-iade",
                  resource: "turizm_rentacar",
                  excludeSupplier: true,
                },
              ]
            : []),
          ...(tourismFlags.turizm_otel &&
          IMPLEMENTED_TOURISM_HREFS.includes("/dashboard/otel")
            ? [
                {
                  name: "Otel Ön Büro (Mini PMS)",
                  shortLabel: "Otel PMS",
                  href: "/dashboard/otel",
                  resource: "turizm_otel",
                  excludeSupplier: true,
                  exact: true,
                },
                {
                  name: "Housekeeping Görevleri",
                  shortLabel: "Housekeeping",
                  href: "/dashboard/otel/housekeeping",
                  resource: "turizm_otel",
                  excludeSupplier: true,
                },
              ]
            : []),
          ...(tourismFlags.turizm_tur &&
          IMPLEMENTED_TOURISM_HREFS.includes("/dashboard/tur")
            ? [
                {
                  name: "Tur Operatörlüğü & Paketler",
                  shortLabel: "Turlar",
                  href: "/dashboard/tur",
                  resource: "turizm_tur",
                  excludeSupplier: true,
                  exact: true,
                },
                {
                  name: "Rehber & Şoför Sahası",
                  shortLabel: "Rehber Sahası",
                  href: "/dashboard/tur/rehber",
                  resource: "turizm_tur",
                  excludeSupplier: true,
                },
              ]
            : []),
          ...(tourismFlags.turizm_b2b &&
          IMPLEMENTED_TOURISM_HREFS.includes("/dashboard/partner-agi")
            ? [
                {
                  name: "B2B Partner Ağı & Havuz",
                  shortLabel: "Partner Ağı",
                  href: "/dashboard/partner-agi",
                  resource: "turizm_b2b",
                  excludeSupplier: true,
                },
              ]
            : []),
          {
            name: "Birleşik Turizm Raporları",
            shortLabel: "Raporlar",
            href: "/dashboard/turizm/raporlar",
            resource: "turizm_rentacar",
            excludeSupplier: true,
          },
        ],
      },
      {
        id: "satis",
        title: (t.nav as any).sales || "Ticari & CRM",
        icon: IconShoppingBag,
        items: [
          {
            name: t.nav.orders,
            shortLabel: "Siparişler",
            href: "/dashboard/orders",
            resource: "orders",
          },
          {
            name: t.nav.store,
            shortLabel: "B2B Mağaza",
            href: "/dashboard/b2b",
            resource: "magaza",
          },
          {
            name: t.nav.customers,
            shortLabel: "Müşteriler",
            href: "/dashboard/customers",
            resource: "customers",
          },
          {
            name: t.nav.leads,
            shortLabel: "Adaylar",
            href: "/dashboard/leads",
            resource: "leads",
          },
          {
            name: t.nav.cargo,
            shortLabel: "Kargo",
            href: "/dashboard/cargo",
            resource: "cargo",
          },
        ],
      },
      {
        id: "finans",
        title: "Finans & Muhasebe",
        icon: IconCreditCard,
        items: [
          {
            name: t.nav.finance,
            shortLabel: "Finans",
            href: "/dashboard/finance",
            resource: "financial",
          },
          {
            name: t.nav.calculator,
            shortLabel: "Hesaplama",
            href: "/dashboard/hesaplama-araci",
            resource: "hesaplama",
          },
        ],
      },
      {
        id: "proje",
        title: t.nav.projects || "Proje & Denetim",
        icon: IconFolder,
        items: [
          {
            name: t.nav.projects,
            shortLabel: "Projeler",
            href: "/dashboard/projects",
            resource: "projects",
          },
          {
            name: t.nav.tasks,
            shortLabel: "Görevler",
            href: "/dashboard/tasks",
            resource: "dashboard",
          },
          {
            name: t.nav.personelDenetim,
            shortLabel: "Denetim",
            href: "/dashboard/personel-denetim",
            exact: true,
            resource: "dashboard",
          },
          {
            name: t.nav.endOfDayReport,
            shortLabel: "Gün Sonu",
            href: "/dashboard/personel-denetim/gun-sonu",
            resource: "dashboard",
          },
          {
            name: t.nav.customerRequests,
            shortLabel: "Talepler",
            href: "/dashboard/personel-denetim/musteri-talepleri",
            resource: "dashboard",
          },
          {
            name: t.nav.files,
            shortLabel: "Dosyalar",
            href: "/dashboard/files",
            resource: "files",
          },
        ],
      },
      {
        id: "pazarlama",
        title: "Pazarlama & İçerik",
        icon: IconMegaphone,
        items: [
          {
            name: t.nav.socialMedia,
            shortLabel: "Sosyal Medya",
            href: "/dashboard/sosyal-medya",
            resource: "sosyal-medya",
          },
          {
            name: t.nav.contentCalendar,
            shortLabel: "İçerik Takvimi",
            href: "/dashboard/icerik-takvimi",
            resource: "icerik-takvimi",
          },
          {
            name: t.nav.agencyLibrary,
            shortLabel: "Kütüphane",
            href: "/dashboard/ajans-kutuphanesi",
            resource: "ajans-kutuphanesi",
          },
          {
            name: t.nav.contentStore,
            shortLabel: "Mağaza",
            href: "/dashboard/icerik-magazasi",
            resource: "icerik-magazasi",
          },
        ],
      },
      {
        id: "ik",
        title: t.nav.hr || "İnsan Kaynakları",
        icon: IconUsers,
        items: [
          {
            name: t.nav.hr,
            shortLabel: "Personel",
            href: "/dashboard/hr",
            resource: "hr",
          },
          {
            name: t.nav.staffRequests,
            shortLabel: "İzin & Talep",
            href: "/dashboard/personel-talepleri",
            resource: "personel-talepleri",
          },
        ],
      },
      {
        id: "iletisim",
        title: t.nav.communication || "İletişim & Destek",
        icon: IconMessageCircle,
        items: [
          {
            name: t.nav.chat,
            shortLabel: "Sohbet",
            href: "/dashboard/chat",
            resource: "chat",
          },
          {
            name: t.nav.announcements,
            shortLabel: "Duyurular",
            href: "/dashboard/announcements",
            resource: "duyurular",
          },
          {
            name: "SSS / Yardım",
            shortLabel: "Yardım",
            href: "/dashboard/sss",
            resource: "dashboard",
          },
        ],
      },
      {
        id: "sistem",
        title: "Yönetim & Sistem",
        icon: IconShield,
        items: [
          {
            name: t.nav.branches,
            shortLabel: "Şubeler",
            href: "/dashboard/branches",
            adminOnly: true,
          },
          {
            name: t.nav.users,
            shortLabel: "Kullanıcılar",
            href: "/dashboard/users",
            adminOnly: true,
          },
          {
            name: t.nav.technicalSupport,
            shortLabel: "Teknik Destek",
            href: "/dashboard/support-tickets",
            adminOnly: true,
          },
          {
            name: "Geri Dönüşüm Kutusu",
            shortLabel: "Çöp Kutusu",
            href: "/dashboard/trash",
            resource: "trash",
          },
          {
            name: "Geliştirici Konsolu",
            shortLabel: "Geliştirici",
            href: "/dashboard/developer-console",
            devOnly: true,
          },
          ...(process.env.NODE_ENV === "development"
            ? [
                {
                  name: "Token Önizleme (Dev)",
                  shortLabel: "Tokenlar",
                  href: "/dev/tokens",
                  adminOnly: true,
                },
              ]
            : []),
          {
            name: t.nav.settings,
            shortLabel: "Ayarlar",
            href: "/dashboard/settings",
          },
        ],
      },
    ],
    [
      t,
      showUretimCategory,
      prodFlags,
      showLogisticsReportsMenu,
      logisticsFlags,
      tourismFlags,
    ]
  )

  const currentBranchRoleName = session?.branches?.find(
    (b: any) => b.branchId === currentBranch?.id
  )?.role?.name
  const isSupplierRole = Boolean(
    !isSuperAdmin &&
      (session?.user?.supplierId || currentBranchRoleName === "Tedarikçi")
  )
  const isPartnerRole = Boolean(
    !isSuperAdmin &&
      (session?.user?.partnerCompanyId ||
        currentBranchRoleName === PARTNER_ROLE_NAME)
  )
  const isHousekeepingRole = Boolean(
    !isSuperAdmin && currentBranchRoleName === "Temizlik Personeli"
  )
  const isTourGuideRole = Boolean(
    !isSuperAdmin && currentBranchRoleName === "Tur Rehberi"
  )

  const isItemAllowed = useCallback(
    (item: NavItemDef) => {
      if (item.excludeSupplier && isSupplierRole) return false
      if (isHousekeepingRole) {
        if (item.isLogout) return true
        return item.href === "/dashboard/otel/housekeeping"
      }
      if (isTourGuideRole) {
        if (item.isLogout) return true
        return item.href === "/dashboard/tur/rehber"
      }
      if (isPartnerRole) {
        if (item.isLogout) return true
        return (
          item.resource === "turizm_b2b" || item.resource === "partner_portali"
        )
      }
      if (item.devOnly) return isPlatformDeveloper
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
      if (Array.isArray(item.anyResources) && item.anyResources.length > 0) {
        return item.anyResources.some((res) => hasPermission(res, "read"))
      }
      if (item.resource) return hasPermission(item.resource, "read")
      return true
    },
    [
      isSupplierRole,
      isHousekeepingRole,
      isTourGuideRole,
      isPartnerRole,
      isPlatformDeveloper,
      subPlan,
      isSuperAdmin,
      hasPermission,
    ]
  )

  const availableCategories = useMemo(() => {
    return rawCategories
      .map((cat) => ({
        ...cat,
        items: cat.items.filter(isItemAllowed),
      }))
      .filter((cat) => cat.items.length > 0)
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

  const activeCategory = useMemo(() => {
    const found = availableCategories.find((cat) =>
      cat.items.some((item) => isItemActive(item))
    )
    return found || availableCategories[0] || null
  }, [availableCategories, isItemActive])

  const filteredUserBranches = isPlatformDeveloper
    ? userBranches
    : userBranches.filter((b) => b.id !== "local-debug-branch")

  const userFullName = safeText(session?.user?.fullName, "Kullanıcı")
  const userInitials = userFullName
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part: string) => part[0]?.toUpperCase() || "")
    .join("") || "KU"

  return (
    <div
      className="min-h-screen w-full flex text-[var(--text)]"
      style={{
        backgroundColor: "var(--page)",
        backgroundImage: "var(--ambient-page)",
        backgroundAttachment: "fixed",
      }}
    >
      {/* ══════════════════════════════════════════════════════════════════════
          FAZ 3 YAN MENÜ: Dar (w-16), sade; yalnızca aktif öğe --brand-soft + --brand ikon
          ══════════════════════════════════════════════════════════════════════ */}
      <aside
        aria-label="Ana modüller"
        className="hidden lg:flex flex-col items-center justify-between w-16 shrink-0 sticky top-0 h-screen bg-white/85 backdrop-blur-xl border-r border-[var(--line)] py-3 z-30"
      >
        {/* Üst Logo */}
        <Link
          href="/dashboard"
          aria-label="Ana Sayfa"
          className="flex items-center justify-center rounded-xl focus-visible:outline-2 focus-visible:outline-[var(--brand)]"
        >
          <SunumLogo className="size-9" showText={false} />
        </Link>

        {/* Modül İkonları */}
        <nav className="flex-1 flex flex-col items-center gap-1.5 py-4 overflow-y-auto no-scrollbar w-full px-2">
          {availableCategories.map((cat) => {
            const Icon = cat.icon
            const isActive = activeCategory?.id === cat.id
            const firstHref = cat.items[0]?.href || "/dashboard"
            const unread = cat.items.reduce(
              (sum, it) =>
                sum + (it.resource ? unreadCounts[it.resource] || 0 : 0),
              0
            )

            return (
              <Tooltip key={cat.id}>
                <TooltipTrigger asChild>
                  <Link
                    href={firstHref}
                    aria-label={cat.title}
                    aria-current={isActive ? "page" : undefined}
                    className={`relative flex size-10 items-center justify-center rounded-[12px] transition-colors duration-150 ${
                      isActive
                        ? "bg-[var(--brand-soft)] text-[var(--brand)]"
                        : "text-[var(--text-muted)] hover:text-[var(--text)] hover:bg-[var(--muted-bg)]/80"
                    }`}
                  >
                    <Icon size={19} />
                    {unread > 0 && (
                      <span className="absolute top-1.5 right-1.5 size-1.5 rounded-full bg-[var(--brand)]" />
                    )}
                  </Link>
                </TooltipTrigger>
                <TooltipContent side="right" sideOffset={10}>
                  {cat.title}
                </TooltipContent>
              </Tooltip>
            )
          })}
        </nav>

        {/* Alt Köşe: Tek Ayar / Sistem Alanı + Kompakt Lisans Bandrolü */}
        <div className="flex flex-col items-center gap-2 w-full px-2 shrink-0">
          <DropdownMenu>
            <Tooltip>
              <TooltipTrigger asChild>
                <DropdownMenuTrigger asChild>
                  <button
                    type="button"
                    aria-label="Sistem, Şube ve Dil Ayarları"
                    className={`flex size-10 items-center justify-center rounded-[12px] transition-colors cursor-pointer ${
                      pathname.startsWith("/dashboard/settings")
                        ? "bg-[var(--brand-soft)] text-[var(--brand)]"
                        : "text-[var(--text-muted)] hover:text-[var(--text)] hover:bg-[var(--muted-bg)]/80"
                    }`}
                  >
                    <IconSettings size={18} />
                  </button>
                </DropdownMenuTrigger>
              </TooltipTrigger>
              <TooltipContent side="right" sideOffset={10}>
                Ayarlar &amp; Şube
              </TooltipContent>
            </Tooltip>

            <DropdownMenuContent side="right" align="end" className="w-56">
              <DropdownMenuLabel>Sistem &amp; Çalışma Alanı</DropdownMenuLabel>

              {filteredUserBranches.length > 0 && (
                <DropdownMenuSub>
                  <DropdownMenuSubTrigger>
                    Şube: {safeText(currentBranch?.name, "Merkez")}
                  </DropdownMenuSubTrigger>
                  <DropdownMenuSubContent>
                    <DropdownMenuRadioGroup
                      value={currentBranch?.id || ""}
                      onValueChange={(val) => {
                        const found = filteredUserBranches.find(
                          (b) => b.id === val
                        )
                        if (found) onBranchChange(found)
                      }}
                    >
                      {filteredUserBranches.map((b) => (
                        <DropdownMenuRadioItem key={b.id} value={b.id}>
                          {safeText(b.name, "Şube")}
                        </DropdownMenuRadioItem>
                      ))}
                    </DropdownMenuRadioGroup>
                  </DropdownMenuSubContent>
                </DropdownMenuSub>
              )}

              <DropdownMenuSub>
                <DropdownMenuSubTrigger>
                  Dil: {LOCALE_LABELS[locale].flag} {LOCALE_LABELS[locale].label}
                </DropdownMenuSubTrigger>
                <DropdownMenuSubContent>
                  <DropdownMenuRadioGroup
                    value={locale}
                    onValueChange={(val) => setLocale(val as SupportedLocale)}
                  >
                    {(
                      Object.entries(LOCALE_LABELS) as [
                        SupportedLocale,
                        { label: string; flag: string },
                      ][]
                    ).map(([code, { label, flag }]) => (
                      <DropdownMenuRadioItem key={code} value={code}>
                        {flag} {label}
                      </DropdownMenuRadioItem>
                    ))}
                  </DropdownMenuRadioGroup>
                </DropdownMenuSubContent>
              </DropdownMenuSub>

              <DropdownMenuItem asChild>
                <Link href="/dashboard/settings">{t.nav.settings}</Link>
              </DropdownMenuItem>

              {process.env.NODE_ENV === "development" && isSuperAdmin && (
                <DropdownMenuItem asChild>
                  <Link href="/dev/tokens">Token &amp; Bileşen Önizleme</Link>
                </DropdownMenuItem>
              )}

              <DropdownMenuSeparator />
              <DropdownMenuItem variant="destructive" onSelect={onLogout}>
                <IconLogOut size={15} />
                {t.nav.logout}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          <div className="w-full">
            <VendorBandrol collapsed={true} onTamper={onTamper} />
          </div>
        </div>
      </aside>

      {/* ══════════════════════════════════════════════════════════════════════
          MOBİL YAN ÇEKMECE (Dar ekranlarda taşmasız tam navigasyon)
          ══════════════════════════════════════════════════════════════════════ */}
      <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
        <SheetContent side="left" className="w-[280px] p-0 flex flex-col">
          <div className="h-16 px-4 border-b border-[var(--line)] flex items-center">
            <SheetTitle className="sr-only">Gezinme Menüsü</SheetTitle>
            <SunumLogo className="size-8" showText={true} />
          </div>

          <div className="flex-1 overflow-y-auto p-3 space-y-5">
            {availableCategories.map((cat) => (
              <div key={cat.id} className="space-y-1">
                <p className="eyebrow-label px-2.5">{cat.title}</p>
                <div className="space-y-0.5">
                  {cat.items.map((item) => {
                    const active = isItemActive(item)
                    return (
                      <Link
                        key={item.href}
                        href={item.href}
                        onClick={() => setMobileOpen(false)}
                        className={`flex items-center justify-between px-3 py-2 rounded-[10px] text-sm transition-colors ${
                          active
                            ? "bg-[var(--brand-soft)] text-[var(--brand)] font-medium"
                            : "text-[var(--text-2)] hover:bg-[var(--muted-bg)] hover:text-[var(--text)]"
                        }`}
                      >
                        <span className="truncate">{item.shortLabel}</span>
                      </Link>
                    )
                  })}
                </div>
              </div>
            ))}
          </div>

          <div className="p-3 border-t border-[var(--line)] space-y-2">
            <VendorBandrol collapsed={false} onTamper={onTamper} />
          </div>
        </SheetContent>
      </Sheet>

      {/* ══════════════════════════════════════════════════════════════════════
          SAĞ ANA SÜTUN: h-16 Üst Bar + Sayfa İskeleti (max-w + px-8 py-6 + space-y-8)
          ══════════════════════════════════════════════════════════════════════ */}
      <div className="flex-1 flex flex-col min-w-0 min-h-screen">
        {/* Üst Bar: tek satır, h-16, sol: modül içi sekmeler (alt çizgi --brand), sağ: tarih, bildirim, kullanıcı */}
        <header className="sticky top-0 z-20 h-16 shrink-0 bg-white/80 backdrop-blur-xl border-b border-[var(--line)] px-4 sm:px-6 lg:px-8 flex items-center justify-between gap-4">
          {/* Sol: Mobil Menü Tetikleyici + Modül İçi Sekmeler */}
          <div className="flex items-center gap-2 min-w-0 h-full flex-1">
            <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
              <SheetTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon-sm"
                  className="lg:hidden shrink-0"
                  aria-label="Menüyü aç"
                >
                  <IconMenu size={18} />
                </Button>
              </SheetTrigger>
            </Sheet>

            <nav
              aria-label="Modül bölümleri"
              className="flex items-center gap-1 sm:gap-2 h-full overflow-x-auto no-scrollbar min-w-0"
            >
              {(activeCategory?.items || []).map((tab) => {
                const active = isItemActive(tab)
                return (
                  <Link
                    key={tab.href}
                    href={tab.href}
                    aria-current={active ? "page" : undefined}
                    className={`relative h-full inline-flex items-center px-2.5 sm:px-3 text-sm whitespace-nowrap transition-colors duration-150 ${
                      active
                        ? "text-[var(--brand)] font-semibold"
                        : "text-[var(--text-2)] hover:text-[var(--text)] font-medium"
                    }`}
                  >
                    <span>{tab.shortLabel}</span>
                    {active &&
                      (prefersReducedMotion ? (
                        <span className="absolute bottom-0 inset-x-2 h-[2px] rounded-full bg-[var(--brand)]" />
                      ) : (
                        <motion.span
                          layoutId="shell-header-underline"
                          transition={{ duration: 0.2, ease: "easeOut" }}
                          className="absolute bottom-0 inset-x-2 h-[2px] rounded-full bg-[var(--brand)]"
                        />
                      ))}
                  </Link>
                )
              })}
            </nav>
          </div>

          {/* Sağ: Düz Metin Tarih, Bildirim, Tek Kullanıcı Profili */}
          <div className="flex items-center gap-2.5 sm:gap-3.5 shrink-0">
            {dateTimeText && (
              <span className="hidden md:inline-block text-xs text-[var(--text-muted)] font-normal select-none">
                {dateTimeText}
              </span>
            )}

            <NotificationCenter />

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  type="button"
                  aria-label={userFullName}
                  className="inline-flex items-center gap-2 rounded-full p-0.5 pr-2 hover:bg-[var(--muted-bg)]/80 transition-colors cursor-pointer focus-visible:outline-2 focus-visible:outline-[var(--brand)]"
                >
                  {session?.user?.avatarUrl ? (
                    <img
                      src={session.user.avatarUrl}
                      alt={userFullName}
                      className="size-8 rounded-full object-cover border border-[var(--line)]"
                    />
                  ) : (
                    <span className="size-8 rounded-full bg-[var(--brand-soft)] text-[var(--brand)] border border-[var(--brand-line)] flex items-center justify-center text-xs font-semibold">
                      {userInitials}
                    </span>
                  )}
                  <span className="hidden xl:inline text-xs font-medium text-[var(--text)] max-w-[130px] truncate">
                    {userFullName}
                  </span>
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuLabel className="space-y-0.5">
                  <div className="text-xs font-semibold text-[var(--text)] truncate">
                    {userFullName}
                  </div>
                  <div className="text-[11px] font-normal text-[var(--text-muted)] truncate">
                    {safeText(currentBranch?.name, "Merkez Şube")}
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild>
                  <Link href="/dashboard/settings">Hesap &amp; Sistem Ayarları</Link>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem variant="destructive" onSelect={onLogout}>
                  <IconLogOut size={15} />
                  {t.nav.logout}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </header>

        {/* Sayfa İskeleti: max-w + px-8 py-6, bölümler arası space-y-8 */}
        <main className="flex-1 min-w-0">
          <div className="max-w-[1440px] w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-8">
            {children}
          </div>
        </main>
      </div>
    </div>
  )
}

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const router = useRouter()
  const pathname = usePathname()
  const {
    session,
    loading,
    logout,
    currentBranch,
    setCurrentBranch,
    userBranches,
    hasPermission,
    isSuperAdmin,
    isPlatformDeveloper,
  } = useAuth()
  const [isTampered, setIsTampered] = useState(false)
  const [dateTimeText, setDateTimeText] = useState<string>("")

  useEffect(() => {
    const updateClock = () => {
      const now = new Date()
      const formatted =
        now.toLocaleDateString("tr-TR", {
          day: "2-digit",
          month: "short",
          year: "numeric",
        }) +
        " • " +
        now.toLocaleTimeString("tr-TR", {
          hour: "2-digit",
          minute: "2-digit",
        })
      setDateTimeText(formatted)
    }
    updateClock()
    const timer = setInterval(updateClock, 30000)
    return () => clearInterval(timer)
  }, [])

  const isSupplierOnlyAccount = Boolean(
    session &&
      !isSuperAdmin &&
      !isPlatformDeveloper &&
      session.branches?.some((ur: any) => ur.role?.name === "Tedarikçi")
  )

  useEffect(() => {
    if (!loading && !session) {
      router.push("/")
    } else if (!loading && isSupplierOnlyAccount) {
      router.replace("/tedarikci-portali")
    }
  }, [session, loading, isSupplierOnlyAccount, router])

  useEffect(() => {
    initLogCapturer()
  }, [])

  useEffect(() => {
    if (
      !loading &&
      session &&
      "serviceWorker" in navigator &&
      "PushManager" in window
    ) {
      const vapidKey =
        process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY ||
        "BLdGy2Ltr0s0zsvaOqwbrd6jZwF478FE0oXuVmhwTX4EinfoPKO6sqJ9oSl_TUeN6-e7HSutQnUCmYRMoemGBpU"

      const urlBase64ToUint8Array = (base64String: string) => {
        const padding = "=".repeat((4 - (base64String.length % 4)) % 4)
        const base64 = (base64String + padding)
          .replace(/-/g, "+")
          .replace(/_/g, "/")
        const rawData = window.atob(base64)
        const outputArray = new Uint8Array(rawData.length)
        for (let i = 0; i < rawData.length; ++i) {
          outputArray[i] = rawData.charCodeAt(i)
        }
        return outputArray
      }

      navigator.serviceWorker.register("/sw.js").then(async (registration) => {
        try {
          const subscription = await registration.pushManager.subscribe({
            userVisibleOnly: true,
            applicationServerKey: urlBase64ToUint8Array(vapidKey),
          })
          await fetch("/api/notifications/subscribe", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ subscription }),
          })
        } catch (e) {
          console.error("Push registration failed", e)
        }
      })
    }
  }, [loading, session])

  if (loading) {
    return (
      <div
        className="min-h-screen flex items-center justify-center"
        style={{
          backgroundColor: "var(--page)",
          backgroundImage: "var(--ambient-page)",
        }}
      >
        <div className="surface-glass px-8 py-6 flex flex-col items-center gap-3">
          <SunumLogo className="size-11" />
          <div className="flex gap-1.5">
            <span
              className="size-2 rounded-full bg-[var(--brand)] animate-bounce"
              style={{ animationDelay: "0ms" }}
            />
            <span
              className="size-2 rounded-full bg-[var(--brand)] animate-bounce"
              style={{ animationDelay: "150ms" }}
            />
            <span
              className="size-2 rounded-full bg-[var(--brand)] animate-bounce"
              style={{ animationDelay: "300ms" }}
            />
          </div>
        </div>
      </div>
    )
  }

  if (!session || isSupplierOnlyAccount) return null

  const isSecurityDisabledLocally =
    typeof window !== "undefined" &&
    localStorage.getItem("security-disabled") === "true"

  if (isTampered && !isSecurityDisabledLocally) {
    return (
      <div className="fixed inset-0 z-[99999] bg-[#0B1B33]/40 backdrop-blur-md flex items-center justify-center p-6 select-none">
        <div className="w-full max-w-md surface-opaque p-8 text-center space-y-5 relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-1 bg-[var(--bad-fill)]" />
          <div className="size-14 rounded-2xl bg-[var(--bad-soft)] text-[var(--bad)] flex items-center justify-center mx-auto">
            <IconAlertTriangle size={28} />
          </div>
          <div className="space-y-1.5">
            <h1 className="text-lg font-semibold tracking-tight text-[var(--bad)]">
              LİSANS İHLALİ ALGILANDI
            </h1>
            <p className="text-xs text-[var(--text-muted)] font-mono">
              0x800F_BRANDING_BYPASS
            </p>
          </div>
          <div className="p-4 rounded-xl bg-[var(--page)] border border-[var(--line)] text-xs text-left leading-relaxed text-[var(--text-2)] space-y-2">
            <p className="font-semibold text-[var(--text)] flex items-center gap-1.5">
              <IconAlertCircle size={14} className="text-[var(--bad)]" />
              Sistem Lisans Koruması Aktif
            </p>
            <p>
              Yazılımın lisans bandrolünü gizleme veya silme girişimi tespit edildi. Lütfen sağlayıcı ile iletişime geçin.
            </p>
          </div>
          <a
            href="https://cicekanatech.com"
            target="_blank"
            rel="noopener noreferrer"
            className="btn-brand-primary inline-flex items-center gap-1.5 px-5 py-2.5 text-xs"
          >
            Çiçekana Teknoloji &amp; Medya
            <IconArrowUpRight size={14} />
          </a>
        </div>
      </div>
    )
  }

  return (
    <NotificationProvider>
      <TooltipProvider delayDuration={150}>
        <ShellInner
          pathname={pathname}
          isSuperAdmin={isSuperAdmin}
          isPlatformDeveloper={isPlatformDeveloper}
          session={session}
          onLogout={logout}
          userBranches={userBranches}
          currentBranch={currentBranch}
          onBranchChange={setCurrentBranch}
          hasPermission={hasPermission}
          onTamper={() => setIsTampered(true)}
          dateTimeText={dateTimeText}
        >
          {children}
        </ShellInner>

        {/* Yüzen Asistan Butonu: "Daron AMA AI" */}
        <KuscuChat />

        {/* Teknik Destek Yüzen Widget */}
        <SupportWidget />

        {/* Karşılama Turu */}
        <OnboardingModal />

        {/* Demo Modu Mutasyon Yakalayıcı */}
        <DemoModeInterceptor />
      </TooltipProvider>
    </NotificationProvider>
  )
}
