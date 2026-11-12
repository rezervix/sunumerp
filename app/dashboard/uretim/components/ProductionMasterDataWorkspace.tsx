"use client"

import React, { useState, useEffect, useCallback } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Checkbox } from "@/components/ui/checkbox"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog"
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { toast } from "sonner"
import {
  Gauge,
  Wrench,
  CalendarDays,
  Boxes,
  Settings2,
  Plus,
  Search,
  Edit3,
  Trash2,
  Eye,
  Clock,
  ChevronLeft,
  ChevronRight,
  Save,
  Loader2,
  CheckCircle2,
  AlertTriangle,
  Activity,
} from "lucide-react"
import { useAuth } from "@/lib/auth/context"
import { AnimatedNumber } from "@/components/ui/motion-primitives"
import {
  CALENDAR_EXCEPTION_TYPE_LABELS,
  LOT_SIZING_RULE_LABELS,
  MACHINE_STATUS_LABELS,
  PLANNING_BUCKET_LABELS,
  PRODUCTION_ITEM_TYPE_LABELS,
  PRODUCTION_METHOD_LABELS,
  SAFETY_STOCK_RULE_LABELS,
  WEEKDAY_CODES,
  WEEKDAY_LABELS,
  WORK_CENTER_TYPE_LABELS,
  WORK_ORDER_STATUS_LABELS,
  type CalendarExceptionType,
  type LotSizingRule,
  type MachineStatus,
  type PlanningBucket,
  type ProductionItemType,
  type ProductionMethod,
  type SafetyStockRule,
  type WeekdayCode,
  type WorkCenterType,
} from "@/lib/production/types"
import { ItemProductionProfileTab } from "@/app/dashboard/stok/components/ItemProductionProfileTab"

export type MasterDataTabKey =
  | "work-centers"
  | "machines"
  | "calendars"
  | "item-profiles"
  | "parameters"

interface ProductionMasterDataWorkspaceProps {
  defaultTab?: MasterDataTabKey
}

export function ProductionMasterDataWorkspace({
  defaultTab = "work-centers",
}: ProductionMasterDataWorkspaceProps) {
  const { currentBranch, hasPermission, isSuperAdmin } = useAuth()
  const [activeTab, setActiveTab] = useState<MasterDataTabKey>(defaultTab)
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)

  // Snapshot State
  const [summary, setSummary] = useState<any>({
    workCenterCount: 0,
    activeWorkCenterCount: 0,
    machineAssetCount: 0,
    activeMachineCount: 0,
    calendarCount: 0,
    shiftCount: 0,
    holidayCount: 0,
    exceptionCount: 0,
    configuredItemProfileCount: 0,
    totalCatalogItemCount: 0,
    totalEffectiveDailyCapacity: 0,
  })
  const [lookups, setLookups] = useState<any>({
    shifts: [],
    holidays: [],
    exceptions: [],
    boms: [],
    warehouses: [],
  })

  // 1. İş Merkezleri Liste & Filtre & Sayfalama
  const [workCenters, setWorkCenters] = useState<any[]>([])
  const [wcPagination, setWcPagination] = useState<any>({
    page: 1,
    pageSize: 10,
    totalCount: 0,
    totalPages: 1,
  })
  const [wcSearch, setWcSearch] = useState("")
  const [wcTypeFilter, setWcTypeFilter] = useState("ALL")
  const [wcActiveFilter, setWcActiveFilter] = useState("ALL")
  const [wcPage, setWcPage] = useState(1)

  // 2. Makineler Liste & Filtre & Sayfalama
  const [machines, setMachines] = useState<any[]>([])
  const [macPagination, setMacPagination] = useState<any>({
    page: 1,
    pageSize: 10,
    totalCount: 0,
    totalPages: 1,
  })
  const [macSearch, setMacSearch] = useState("")
  const [macStatusFilter, setMacStatusFilter] = useState("ALL")
  const [macWcFilter, setMacWcFilter] = useState("ALL")
  const [macPage, setMacPage] = useState(1)

  // 3. Çalışma Takvimleri Liste
  const [calendars, setCalendars] = useState<any[]>([])

  // 4. Stok/Ürün Üretim Profilleri Liste & Filtre & Sayfalama
  const [itemProfiles, setItemProfiles] = useState<any[]>([])
  const [ipPagination, setIpPagination] = useState<any>({
    page: 1,
    pageSize: 10,
    totalCount: 0,
    totalPages: 1,
  })
  const [ipSearch, setIpSearch] = useState("")
  const [ipTypeFilter, setIpTypeFilter] = useState("ALL")
  const [ipMethodFilter, setIpMethodFilter] = useState("ALL")
  const [ipPage, setIpPage] = useState(1)

  // 5. Üretim Parametreleri Form State
  const [paramsForm, setParamsForm] = useState<any>({
    planningHorizonDays: 30,
    planningBucket: "DAILY",
    defaultLotSizingRule: "L4L",
    defaultMinLotSize: 1,
    defaultLotMultiple: 1,
    defaultSafetyStockRule: "FIXED",
    defaultSafetyStockValue: 10,
    defaultSafetyStockDays: 3,
    requireWorkOrderApproval: true,
    requireQualityCheckOnComplete: false,
    autoBackflushOnComplete: true,
    autoReserveOnRelease: true,
    allowOverProductionPercent: 5,
    allowNegativeStockInProduction: false,
    defaultManufacturingWarehouseId: "none",
    statusFlow: ["DRAFT", "PLANNED", "RELEASED", "IN_PROGRESS", "QA_PENDING", "COMPLETED"],
  })

  // Modallar ve Çekmece State
  const [wcModalOpen, setWcModalOpen] = useState(false)
  const [editingWc, setEditingWc] = useState<any | null>(null)
  const [wcForm, setWcForm] = useState<any>({
    code: "",
    name: "",
    type: "MACHINE",
    hourlyCost: "250",
    capacityPerHour: "20",
    efficiencyPercent: "100",
    calendarId: "none",
    defaultShiftId: "none",
    alternativeGroupCode: "",
    isActive: true,
    notes: "",
  })
  const [selectedWcDrawer, setSelectedWcDrawer] = useState<any | null>(null)

  const [macModalOpen, setMacModalOpen] = useState(false)
  const [editingMac, setEditingMac] = useState<any | null>(null)
  const [macForm, setMacForm] = useState<any>({
    code: "",
    name: "",
    serialNumber: "",
    brand: "",
    model: "",
    warrantyEndDate: "",
    warrantyProvider: "",
    location: "",
    workCenterId: "none",
    status: "ACTIVE",
    operatingHours: "0",
    productionCount: "0",
    isActive: true,
    notes: "",
  })

  const [counterModalMac, setCounterModalMac] = useState<any | null>(null)
  const [counterHoursSet, setCounterHoursSet] = useState("0")
  const [counterCountSet, setCounterCountSet] = useState("0")
  const [counterStatus, setCounterStatus] = useState<MachineStatus>("ACTIVE")

  const [calModalOpen, setCalModalOpen] = useState(false)
  const [editingCal, setEditingCal] = useState<any | null>(null)
  const [calForm, setCalForm] = useState<any>({
    code: "",
    name: "",
    workingDays: ["MON", "TUE", "WED", "THU", "FRI", "SAT"] as WeekdayCode[],
    isDefault: false,
    notes: "",
  })

  const [shiftModalOpen, setShiftModalOpen] = useState(false)
  const [shiftForm, setShiftForm] = useState<any>({
    calendarId: "",
    code: "",
    name: "",
    startTime: "08:00",
    endTime: "17:00",
    breakMinutes: "60",
    capacityMultiplier: "1",
  })

  const [holidayModalOpen, setHolidayModalOpen] = useState(false)
  const [holidayForm, setHolidayForm] = useState<any>({
    calendarId: "",
    holidayDate: "",
    name: "",
    isHalfDay: false,
    isRecurringYearly: true,
  })

  const [excModalOpen, setExcModalOpen] = useState(false)
  const [excForm, setExcForm] = useState<any>({
    calendarId: "",
    workCenterId: "",
    exceptionDate: "",
    exceptionType: "CLOSED" as CalendarExceptionType,
    availableHours: "0",
    capacityPercent: "0",
    reason: "",
  })

  const [selectedProfileItem, setSelectedProfileItem] = useState<any | null>(null)

  const canCreate = isSuperAdmin || hasPermission("uretim", "create") || hasPermission("uretim_kapasite", "create")
  const canUpdate = isSuperAdmin || hasPermission("uretim", "update") || hasPermission("uretim_kapasite", "update")
  const canDelete = isSuperAdmin || hasPermission("uretim", "delete") || hasPermission("uretim_kapasite", "delete")

  const formatCurrency = (val: number) =>
    new Intl.NumberFormat("tr-TR", {
      style: "currency",
      currency: "TRY",
      maximumFractionDigits: 2,
    }).format(val || 0)

  // Ana Snapshot Yükleme
  const fetchSnapshot = useCallback(async () => {
    setLoading(true)
    try {
      const bq = currentBranch?.id
        ? `&branchId=${encodeURIComponent(currentBranch.id)}`
        : ""
      const res = await fetch(
        `/api/production/master-data?section=snapshot&pageSize=10${bq}`
      )
      const data = await res.json()
      if (data.success && data.anyFlagEnabled) {
        setSummary(data.summary || {})
        setLookups(
          data.lookups || {
            shifts: [],
            holidays: [],
            exceptions: [],
            boms: [],
            warehouses: [],
          }
        )
        if (data.workCenters) {
          setWorkCenters(data.workCenters.items || [])
          setWcPagination(data.workCenters.pagination)
        }
        if (data.machines) {
          setMachines(data.machines.items || [])
          setMacPagination(data.machines.pagination)
        }
        if (data.calendars) {
          setCalendars(data.calendars.items || [])
        }
        if (data.itemProfiles) {
          setItemProfiles(data.itemProfiles.items || [])
          setIpPagination(data.itemProfiles.pagination)
        }
        if (data.parameters) {
          const p = data.parameters
          setParamsForm({
            planningHorizonDays: p.planningHorizonDays ?? 30,
            planningBucket: p.planningBucket || "DAILY",
            defaultLotSizingRule: p.defaultLotSizingRule || "L4L",
            defaultMinLotSize: p.defaultMinLotSize ?? 1,
            defaultLotMultiple: p.defaultLotMultiple ?? 1,
            defaultSafetyStockRule: p.defaultSafetyStockRule || "FIXED",
            defaultSafetyStockValue: p.defaultSafetyStockValue ?? 10,
            defaultSafetyStockDays: p.defaultSafetyStockDays ?? 3,
            requireWorkOrderApproval: Boolean(p.requireWorkOrderApproval),
            requireQualityCheckOnComplete: Boolean(p.requireQualityCheckOnComplete),
            autoBackflushOnComplete: Boolean(p.autoBackflushOnComplete),
            autoReserveOnRelease: Boolean(p.autoReserveOnRelease),
            allowOverProductionPercent: p.allowOverProductionPercent ?? 5,
            allowNegativeStockInProduction: Boolean(p.allowNegativeStockInProduction),
            defaultManufacturingWarehouseId:
              p.defaultManufacturingWarehouseId || "none",
            statusFlow: Array.isArray(p.statusFlow)
              ? p.statusFlow
              : ["DRAFT", "PLANNED", "RELEASED", "IN_PROGRESS", "QA_PENDING", "COMPLETED"],
          })
        }
      }
    } catch (err) {
      console.error("Üretim ana verileri alınamadı:", err)
    } finally {
      setLoading(false)
    }
  }, [currentBranch?.id])

  useEffect(() => {
    fetchSnapshot()
  }, [fetchSnapshot])

  // İş Merkezleri Filtreli & Sayfalı Sorgu
  const fetchWorkCentersList = useCallback(async () => {
    try {
      const qs = new URLSearchParams({
        section: "work_centers",
        page: String(wcPage),
        pageSize: "10",
        search: wcSearch,
        type: wcTypeFilter,
        isActive: wcActiveFilter,
      })
      if (currentBranch?.id) qs.set("branchId", currentBranch.id)
      const res = await fetch(`/api/production/master-data?${qs.toString()}`)
      const data = await res.json()
      if (data.success && data.items) {
        setWorkCenters(data.items)
        setWcPagination(data.pagination)
      }
    } catch (err) {
      console.error(err)
    }
  }, [wcPage, wcSearch, wcTypeFilter, wcActiveFilter, currentBranch?.id])

  useEffect(() => {
    fetchWorkCentersList()
  }, [fetchWorkCentersList])

  // Makineler Filtreli & Sayfalı Sorgu
  const fetchMachinesList = useCallback(async () => {
    try {
      const qs = new URLSearchParams({
        section: "machines",
        page: String(macPage),
        pageSize: "10",
        search: macSearch,
        status: macStatusFilter,
        workCenterId: macWcFilter,
      })
      if (currentBranch?.id) qs.set("branchId", currentBranch.id)
      const res = await fetch(`/api/production/master-data?${qs.toString()}`)
      const data = await res.json()
      if (data.success && data.items) {
        setMachines(data.items)
        setMacPagination(data.pagination)
      }
    } catch (err) {
      console.error(err)
    }
  }, [macPage, macSearch, macStatusFilter, macWcFilter, currentBranch?.id])

  useEffect(() => {
    fetchMachinesList()
  }, [fetchMachinesList])

  // Stok Üretim Profilleri Filtreli & Sayfalı Sorgu
  const fetchItemProfilesList = useCallback(async () => {
    try {
      const qs = new URLSearchParams({
        section: "item_profiles",
        page: String(ipPage),
        pageSize: "10",
        search: ipSearch,
        productionItemType: ipTypeFilter,
        productionMethod: ipMethodFilter,
      })
      const res = await fetch(`/api/production/master-data?${qs.toString()}`)
      const data = await res.json()
      if (data.success && data.items) {
        setItemProfiles(data.items)
        setIpPagination(data.pagination)
      }
    } catch (err) {
      console.error(err)
    }
  }, [ipPage, ipSearch, ipTypeFilter, ipMethodFilter])

  useEffect(() => {
    fetchItemProfilesList()
  }, [fetchItemProfilesList])

  // Genel API Mutasyon Yardımcısı
  const postMasterDataAction = async (
    action: string,
    payload: Record<string, any>,
    onSuccessClose?: () => void
  ) => {
    setSubmitting(true)
    try {
      const res = await fetch("/api/production/master-data", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action,
          payload: {
            ...payload,
            branchId: currentBranch?.id || undefined,
          },
        }),
      })
      const data = await res.json()
      if (!res.ok || !data.success) {
        throw new Error(data.error || "İşlem gerçekleştirilemedi.")
      }
      toast.success("İşlem Başarılı", {
        description: data.message,
      })
      onSuccessClose?.()
      await fetchSnapshot()
      await Promise.all([
        fetchWorkCentersList(),
        fetchMachinesList(),
        fetchItemProfilesList(),
      ])
    } catch (err: any) {
      toast.error(err.message || "Hata oluştu.")
    } finally {
      setSubmitting(false)
    }
  }

  // İş Merkezi Modal Açıcı
  const handleOpenWcModal = (wc?: any) => {
    if (wc) {
      setEditingWc(wc)
      setWcForm({
        code: wc.code,
        name: wc.name,
        type: wc.type || "MACHINE",
        hourlyCost: String(wc.hourlyCost ?? 0),
        capacityPerHour: String(wc.capacityPerHour ?? 1),
        efficiencyPercent: String(wc.efficiencyPercent ?? 100),
        calendarId: wc.calendarId || "none",
        defaultShiftId: wc.defaultShiftId || "none",
        alternativeGroupCode: wc.alternativeGroupCode || "",
        isActive: Boolean(wc.isActive),
        notes: wc.notes || "",
      })
    } else {
      setEditingWc(null)
      setWcForm({
        code: `IST-0${(summary.workCenterCount || 0) + 1}`,
        name: "",
        type: "MACHINE",
        hourlyCost: "250",
        capacityPerHour: "20",
        efficiencyPercent: "100",
        calendarId: calendars[0]?.id || "none",
        defaultShiftId: lookups.shifts?.[0]?.id || "none",
        alternativeGroupCode: "",
        isActive: true,
        notes: "",
      })
    }
    setWcModalOpen(true)
  }

  // Makine Modal Açıcı
  const handleOpenMacModal = (mac?: any) => {
    if (mac) {
      setEditingMac(mac)
      setMacForm({
        code: mac.code,
        name: mac.name,
        serialNumber: mac.serialNumber,
        brand: mac.brand || "",
        model: mac.model || "",
        warrantyEndDate: mac.warrantyEndDate || "",
        warrantyProvider: mac.warrantyProvider || "",
        location: mac.location || "",
        workCenterId: mac.workCenterId || "none",
        status: mac.status || "ACTIVE",
        operatingHours: String(mac.operatingHours ?? 0),
        productionCount: String(mac.productionCount ?? 0),
        isActive: Boolean(mac.isActive),
        notes: mac.notes || "",
      })
    } else {
      setEditingMac(null)
      setMacForm({
        code: `MAK-0${(summary.machineAssetCount || 0) + 1}`,
        name: "",
        serialNumber: `SN-2026-00${(summary.machineAssetCount || 0) + 1}`,
        brand: "",
        model: "",
        warrantyEndDate: "2028-12-31",
        warrantyProvider: "",
        location: "Atölye Kat 1",
        workCenterId: workCenters[0]?.id || "none",
        status: "ACTIVE",
        operatingHours: "0",
        productionCount: "0",
        isActive: true,
        notes: "",
      })
    }
    setMacModalOpen(true)
  }

  return (
    <div className="space-y-6">
      {/* ══════════════════════════════════════════════════════════
          1. 4'LÜ ÇERÇEVESİZ (BORDERLESS) ANA VERİ KPI ŞERİDİ
         ══════════════════════════════════════════════════════════ */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 rounded-2xl bg-[#111513]/60 border border-white/[0.05] p-3 backdrop-blur-md">
        <div className="flex items-center justify-between px-4 py-3 rounded-xl bg-white/[0.02] border border-white/[0.04]">
          <div>
            <span className="text-[11px] font-medium uppercase tracking-wider text-zinc-500">
              İş Merkezi / İstasyon
            </span>
            <div className="text-2xl md:text-3xl font-light tracking-tight text-white tabular-nums mt-1">
              <AnimatedNumber value={summary.workCenterCount || 0} />
            </div>
            <p className="text-[11px] text-zinc-400 mt-1">
              Günlük efektif kapasite:{" "}
              <strong className="text-[#34D399] font-mono">
                {Number(summary.totalEffectiveDailyCapacity || 0).toLocaleString("tr-TR")}
              </strong>{" "}
              adet
            </p>
          </div>
          <div className="w-9 h-9 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center shrink-0">
            <Gauge className="w-4 h-4 text-emerald-400" />
          </div>
        </div>

        <div className="flex items-center justify-between px-4 py-3 rounded-xl bg-white/[0.02] border border-white/[0.04]">
          <div>
            <span className="text-[11px] font-medium uppercase tracking-wider text-zinc-500">
              Makine & Ekipman Varlığı
            </span>
            <div className="text-2xl md:text-3xl font-light tracking-tight text-cyan-300 tabular-nums mt-1">
              <AnimatedNumber value={summary.machineAssetCount || 0} />
            </div>
            <p className="text-[11px] text-zinc-400 mt-1">
              {summary.activeMachineCount || 0} aktif çalışan ekipman
            </p>
          </div>
          <div className="w-9 h-9 rounded-xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center shrink-0">
            <Wrench className="w-4 h-4 text-cyan-300" />
          </div>
        </div>

        <div className="flex items-center justify-between px-4 py-3 rounded-xl bg-white/[0.02] border border-white/[0.04]">
          <div>
            <span className="text-[11px] font-medium uppercase tracking-wider text-zinc-500">
              Takvim & Vardiya Yapısı
            </span>
            <div className="text-2xl md:text-3xl font-light tracking-tight text-white tabular-nums mt-1">
              <AnimatedNumber value={summary.calendarCount || 0} /> /{" "}
              <AnimatedNumber value={summary.shiftCount || 0} />
            </div>
            <p className="text-[11px] text-zinc-400 mt-1">
              {summary.holidayCount || 0} tatil · {summary.exceptionCount || 0} istisna
            </p>
          </div>
          <div className="w-9 h-9 rounded-xl bg-violet-500/10 border border-violet-500/20 flex items-center justify-center shrink-0">
            <CalendarDays className="w-4 h-4 text-violet-300" />
          </div>
        </div>

        <div className="flex items-center justify-between px-4 py-3 rounded-xl bg-white/[0.02] border border-white/[0.04]">
          <div>
            <span className="text-[11px] font-medium uppercase tracking-wider text-zinc-500">
              1-1 Ürün Üretim Profili
            </span>
            <div className="text-2xl md:text-3xl font-light tracking-tight text-emerald-400 tabular-nums mt-1">
              <AnimatedNumber value={summary.configuredItemProfileCount || 0} /> /{" "}
              {summary.totalCatalogItemCount || 0}
            </div>
            <p className="text-[11px] text-zinc-400 mt-1">
              Planlama ufku: {paramsForm.planningHorizonDays} gün ({paramsForm.defaultLotSizingRule})
            </p>
          </div>
          <div className="w-9 h-9 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center shrink-0">
            <Boxes className="w-4 h-4 text-emerald-400" />
          </div>
        </div>
      </div>

      {/* ══════════════════════════════════════════════════════════
          2. 5 ANA VERİ SEKMESİ GEÇİŞ ÇUBUĞU
         ══════════════════════════════════════════════════════════ */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-[#111513]/90 border border-white/[0.06] p-2 rounded-2xl backdrop-blur-xl">
        <div className="flex flex-wrap items-center gap-1.5">
          {[
            {
              key: "work-centers" as const,
              label: "1. İş Merkezleri & İstasyonlar",
              icon: Gauge,
            },
            {
              key: "machines" as const,
              label: "2. Makine & Ekipman (Varlık)",
              icon: Wrench,
            },
            {
              key: "calendars" as const,
              label: "3. Çalışma Takvimi & Vardiya",
              icon: CalendarDays,
            },
            {
              key: "item-profiles" as const,
              label: "4. Stok Kartı 1-1 Üretim Profilleri",
              icon: Boxes,
            },
            {
              key: "parameters" as const,
              label: "5. Üretim Parametreleri",
              icon: Settings2,
            },
          ].map((tab) => {
            const Icon = tab.icon
            const isAct = activeTab === tab.key
            return (
              <button
                key={tab.key}
                type="button"
                onClick={() => setActiveTab(tab.key)}
                className={`px-3.5 py-2 rounded-xl text-xs font-medium flex items-center gap-2 transition-all cursor-pointer ${
                  isAct
                    ? "bg-[#34D399] text-[#061811] font-semibold shadow-lg shadow-emerald-500/20"
                    : "text-zinc-400 hover:text-white hover:bg-white/[0.04]"
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                {tab.label}
              </button>
            )
          })}
        </div>
      </div>

      {/* ══════════════════════════════════════════════════════════
          SEKME 1: İŞ MERKEZLERİ / İSTASYONLAR
         ══════════════════════════════════════════════════════════ */}
      {activeTab === "work-centers" && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between bg-[#111513]/90 border border-white/[0.06] p-4 rounded-[20px]">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-500" />
              <Input
                placeholder="İş merkezi kodu, adı veya alternatif grup ile ara..."
                value={wcSearch}
                onChange={(e) => {
                  setWcSearch(e.target.value)
                  setWcPage(1)
                }}
                className="pl-10 text-xs bg-white/[0.03] border-white/[0.08] text-white rounded-xl h-9.5"
              />
            </div>

            <div className="flex flex-wrap items-center gap-2.5">
              <Select
                value={wcTypeFilter}
                onValueChange={(v) => {
                  setWcTypeFilter(v)
                  setWcPage(1)
                }}
              >
                <SelectTrigger className="w-40 text-xs bg-white/[0.03] border-white/[0.08] text-zinc-300 rounded-xl h-9.5">
                  <SelectValue placeholder="İstasyon Tipi" />
                </SelectTrigger>
                <SelectContent className="backdrop-blur-xl bg-[#111513] border border-white/[0.08] text-white">
                  <SelectItem value="ALL" className="text-xs">
                    Tüm Tipler
                  </SelectItem>
                  <SelectItem value="MACHINE" className="text-xs">
                    Makine İstasyonu
                  </SelectItem>
                  <SelectItem value="MANUAL" className="text-xs">
                    Manuel İstasyon
                  </SelectItem>
                  <SelectItem value="OUTSOURCE" className="text-xs">
                    Dış Kaynak (Fason)
                  </SelectItem>
                </SelectContent>
              </Select>

              <Select
                value={wcActiveFilter}
                onValueChange={(v) => {
                  setWcActiveFilter(v)
                  setWcPage(1)
                }}
              >
                <SelectTrigger className="w-32 text-xs bg-white/[0.03] border-white/[0.08] text-zinc-300 rounded-xl h-9.5">
                  <SelectValue placeholder="Durum" />
                </SelectTrigger>
                <SelectContent className="backdrop-blur-xl bg-[#111513] border border-white/[0.08] text-white">
                  <SelectItem value="ALL" className="text-xs">
                    Tümü
                  </SelectItem>
                  <SelectItem value="ACTIVE" className="text-xs">
                    Aktif
                  </SelectItem>
                  <SelectItem value="PASSIVE" className="text-xs">
                    Pasif
                  </SelectItem>
                </SelectContent>
              </Select>

              {canCreate && (
                <Button
                  size="sm"
                  onClick={() => handleOpenWcModal()}
                  className="bg-[#34D399] hover:bg-[#34D399]/90 text-[#061811] font-semibold text-xs h-9.5 px-4 gap-1.5 rounded-xl cursor-pointer shadow-lg shadow-emerald-500/20"
                >
                  <Plus className="h-4 w-4" />
                  Yeni İş Merkezi Tanımla
                </Button>
              )}
            </div>
          </div>

          <div className="glass-table-container overflow-hidden">
            <Table>
              <TableHeader className="bg-white/[0.02]">
                <TableRow className="border-b border-white/[0.06] text-[11px] text-zinc-400 uppercase tracking-wider hover:bg-transparent">
                  <TableHead className="py-3.5 pl-5">1. İstasyon Kodu & Adı</TableHead>
                  <TableHead>2. Tip & Alternatif Grup</TableHead>
                  <TableHead>3. Kapasite & Verimlilik</TableHead>
                  <TableHead className="text-right">4. Saatlik / Birim Maliyet</TableHead>
                  <TableHead>5. Bağlı Takvim & Vardiya</TableHead>
                  <TableHead className="text-right pr-5">6. İşlemler</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={6} className="h-28 text-center text-xs text-zinc-500">
                      İş merkezleri yükleniyor...
                    </TableCell>
                  </TableRow>
                ) : workCenters.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="h-32 text-center text-xs text-zinc-500">
                      <div className="flex flex-col items-center justify-center gap-2 py-4">
                        <Gauge className="h-7 w-7 text-zinc-600" />
                        <span>Henüz kayıtlı iş merkezi / istasyon bulunmuyor.</span>
                        {canCreate && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleOpenWcModal()}
                            className="mt-1 text-xs h-8 bg-white/[0.04] border-white/[0.08] text-emerald-400 rounded-xl"
                          >
                            <Plus className="h-3.5 w-3.5 mr-1" />
                            İlk İş Merkezini Oluştur
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ) : (
                  workCenters.map((wc) => (
                    <TableRow
                      key={wc.id}
                      onClick={() => setSelectedWcDrawer(wc)}
                      className="border-b border-white/[0.04] hover:bg-white/[0.02] transition-colors cursor-pointer"
                    >
                      <TableCell className="relative py-3.5 pl-5">
                        <span
                          className={`absolute left-0 top-2.5 bottom-2.5 w-[3px] rounded-r-full ${
                            wc.isActive ? "bg-emerald-500" : "bg-zinc-600"
                          }`}
                        />
                        <div className="space-y-0.5">
                          <div className="flex items-center gap-2">
                            <span className="font-mono text-xs font-semibold text-emerald-400">
                              {wc.code}
                            </span>
                            <span className="text-sm font-medium text-white">
                              {wc.name}
                            </span>
                          </div>
                          <span className="text-[11px] text-zinc-500 block">
                            {wc.machineCount || 0} bağlı makine ({wc.activeMachineCount || 0} aktif)
                          </span>
                        </div>
                      </TableCell>

                      <TableCell>
                        <div className="space-y-1">
                          <span className="inline-flex bg-white/[0.05] text-zinc-200 border border-white/[0.08] rounded-full px-2.5 py-0.5 text-[11px]">
                            {WORK_CENTER_TYPE_LABELS[wc.type as WorkCenterType] || wc.type}
                          </span>
                          {wc.alternativeGroupCode && (
                            <span className="block text-[10px] font-mono text-cyan-300">
                              Grup: {wc.alternativeGroupCode}
                            </span>
                          )}
                        </div>
                      </TableCell>

                      <TableCell>
                        <div className="space-y-0.5">
                          <span className="text-xs font-semibold text-white font-mono">
                            {wc.capacityPerHour} adet/saat × %{wc.efficiencyPercent}
                          </span>
                          <span className="text-[11px] text-[#34D399] block font-mono">
                            Efektif: {wc.capacityMetrics?.effectiveUnitsPerHour} adet/sa (Günlük:{" "}
                            {wc.capacityMetrics?.effectiveDailyCapacityUnits})
                          </span>
                        </div>
                      </TableCell>

                      <TableCell className="text-right">
                        <div className="space-y-0.5 font-mono">
                          <span className="text-xs font-semibold text-white block">
                            {formatCurrency(wc.hourlyCost)} / sa
                          </span>
                          <span className="text-[10px] text-zinc-400 block">
                            Birim: {formatCurrency(wc.capacityMetrics?.effectiveUnitCost || 0)}
                          </span>
                        </div>
                      </TableCell>

                      <TableCell>
                        <div className="space-y-0.5 text-xs">
                          <span className="text-zinc-200 block">
                            {wc.calendar?.name || "Standart Takvim"}
                          </span>
                          <span className="text-[11px] text-zinc-500 block">
                            {wc.defaultShift
                              ? `${wc.defaultShift.name} (${wc.defaultShift.startTime}-${wc.defaultShift.endTime})`
                              : "Varsayılan 8 Saat"}
                          </span>
                        </div>
                      </TableCell>

                      <TableCell
                        className="text-right pr-5"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <div className="flex items-center justify-end gap-1">
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => setSelectedWcDrawer(wc)}
                            className="h-8 w-8 p-0 text-zinc-400 hover:text-white rounded-lg"
                            title="Detay Çekmecesi"
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                          {canUpdate && (
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => handleOpenWcModal(wc)}
                              className="h-8 w-8 p-0 text-emerald-400 hover:bg-emerald-500/10 rounded-lg"
                              title="Düzenle"
                            >
                              <Edit3 className="h-4 w-4" />
                            </Button>
                          )}
                          {canDelete && (
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() =>
                                postMasterDataAction("delete_work_center", { id: wc.id })
                              }
                              className="h-8 w-8 p-0 text-rose-400 hover:bg-rose-500/10 rounded-lg"
                              title="Sil"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>

            {/* Sayfalama Şeridi */}
            <div className="px-5 py-3 border-t border-white/[0.06] flex items-center justify-between text-xs text-zinc-400">
              <span>
                Toplam <strong className="text-white">{wcPagination.totalCount}</strong> iş merkezi
              </span>
              <div className="flex items-center gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  disabled={!wcPagination.hasPrevPage}
                  onClick={() => setWcPage((p) => Math.max(1, p - 1))}
                  className="h-7 px-2.5 bg-white/[0.03] border-white/[0.08] text-xs rounded-lg"
                >
                  <ChevronLeft className="h-3.5 w-3.5" />
                </Button>
                <span className="font-mono">
                  Sayfa {wcPagination.page} / {wcPagination.totalPages}
                </span>
                <Button
                  size="sm"
                  variant="outline"
                  disabled={!wcPagination.hasNextPage}
                  onClick={() => setWcPage((p) => p + 1)}
                  className="h-7 px-2.5 bg-white/[0.03] border-white/[0.08] text-xs rounded-lg"
                >
                  <ChevronRight className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════
          SEKME 2: MAKİNE / EKİPMAN VARLIKLARI
         ══════════════════════════════════════════════════════════ */}
      {activeTab === "machines" && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between bg-[#111513]/90 border border-white/[0.06] p-4 rounded-[20px]">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-500" />
              <Input
                placeholder="Kod, ad, seri no, marka/model veya lokasyon ile ara..."
                value={macSearch}
                onChange={(e) => {
                  setMacSearch(e.target.value)
                  setMacPage(1)
                }}
                className="pl-10 text-xs bg-white/[0.03] border-white/[0.08] text-white rounded-xl h-9.5"
              />
            </div>

            <div className="flex flex-wrap items-center gap-2.5">
              <Select
                value={macStatusFilter}
                onValueChange={(v) => {
                  setMacStatusFilter(v)
                  setMacPage(1)
                }}
              >
                <SelectTrigger className="w-40 text-xs bg-white/[0.03] border-white/[0.08] text-zinc-300 rounded-xl h-9.5">
                  <SelectValue placeholder="Ekipman Durumu" />
                </SelectTrigger>
                <SelectContent className="backdrop-blur-xl bg-[#111513] border border-white/[0.08] text-white">
                  <SelectItem value="ALL" className="text-xs">
                    Tüm Durumlar
                  </SelectItem>
                  {(Object.entries(MACHINE_STATUS_LABELS) as [MachineStatus, string][]).map(
                    ([code, label]) => (
                      <SelectItem key={code} value={code} className="text-xs">
                        {label}
                      </SelectItem>
                    )
                  )}
                </SelectContent>
              </Select>

              {canCreate && (
                <Button
                  size="sm"
                  onClick={() => handleOpenMacModal()}
                  className="bg-[#34D399] hover:bg-[#34D399]/90 text-[#061811] font-semibold text-xs h-9.5 px-4 gap-1.5 rounded-xl cursor-pointer shadow-lg shadow-emerald-500/20"
                >
                  <Plus className="h-4 w-4" />
                  Yeni Makine / Ekipman Ekle
                </Button>
              )}
            </div>
          </div>

          <div className="glass-table-container overflow-hidden">
            <Table>
              <TableHeader className="bg-white/[0.02]">
                <TableRow className="border-b border-white/[0.06] text-[11px] text-zinc-400 uppercase tracking-wider hover:bg-transparent">
                  <TableHead className="py-3.5 pl-5">1. Varlık Kodu, Ad & Seri No</TableHead>
                  <TableHead>2. Marka / Model & Lokasyon</TableHead>
                  <TableHead>3. Bağlı İş Merkezi</TableHead>
                  <TableHead>4. Garanti Bitiş</TableHead>
                  <TableHead>5. Sayaç (Saat / Adet)</TableHead>
                  <TableHead className="text-right pr-5">6. Durum & İşlemler</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {machines.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="h-32 text-center text-xs text-zinc-500">
                      <div className="flex flex-col items-center justify-center gap-2 py-4">
                        <Wrench className="h-7 w-7 text-zinc-600" />
                        <span>Henüz kayıtlı makine / ekipman varlığı bulunmuyor.</span>
                        {canCreate && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleOpenMacModal()}
                            className="mt-1 text-xs h-8 bg-white/[0.04] border-white/[0.08] text-emerald-400 rounded-xl"
                          >
                            <Plus className="h-3.5 w-3.5 mr-1" />
                            İlk Makineyi Tanımla
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ) : (
                  machines.map((mac) => (
                    <TableRow
                      key={mac.id}
                      className="border-b border-white/[0.04] hover:bg-white/[0.02] transition-colors"
                    >
                      <TableCell className="relative py-3.5 pl-5">
                        <span
                          className={`absolute left-0 top-2.5 bottom-2.5 w-[3px] rounded-r-full ${
                            mac.status === "ACTIVE"
                              ? "bg-emerald-500"
                              : mac.status === "FAULT"
                              ? "bg-rose-500"
                              : "bg-amber-400"
                          }`}
                        />
                        <div className="space-y-0.5">
                          <div className="flex items-center gap-2">
                            <span className="font-mono text-xs font-semibold text-cyan-300">
                              {mac.code}
                            </span>
                            <span className="text-sm font-medium text-white">
                              {mac.name}
                            </span>
                          </div>
                          <span className="font-mono text-[11px] text-zinc-500 block">
                            Seri No: {mac.serialNumber}
                          </span>
                        </div>
                      </TableCell>

                      <TableCell>
                        <div className="space-y-0.5 text-xs">
                          <span className="text-zinc-200 block">
                            {[mac.brand, mac.model].filter(Boolean).join(" / ") || "Standart"}
                          </span>
                          <span className="text-[11px] text-zinc-500 block">
                            Konum: {mac.location || "Genel Atölye"}
                          </span>
                        </div>
                      </TableCell>

                      <TableCell>
                        {mac.workCenter ? (
                          <span className="inline-flex items-center gap-1 bg-emerald-500/10 text-emerald-300 border border-emerald-500/20 rounded-full px-2.5 py-0.5 text-xs font-mono">
                            {mac.workCenter.code} · {mac.workCenter.name}
                          </span>
                        ) : (
                          <span className="text-xs text-zinc-500">Bağlı Değil</span>
                        )}
                      </TableCell>

                      <TableCell>
                        {mac.warrantyEndDate ? (
                          <div className="space-y-0.5">
                            <span className="font-mono text-xs text-zinc-200 block">
                              {mac.warrantyEndDate}
                            </span>
                            <span
                              className={`text-[10px] font-medium ${
                                mac.warrantyStatus === "EXPIRED"
                                  ? "text-rose-400"
                                  : mac.warrantyStatus === "EXPIRING_SOON"
                                  ? "text-amber-300"
                                  : "text-emerald-400"
                              }`}
                            >
                              {mac.warrantyStatus === "EXPIRED"
                                ? "Garanti Doldu"
                                : `${mac.warrantyDaysRemaining} gün kaldı`}
                            </span>
                          </div>
                        ) : (
                          <span className="text-xs text-zinc-500">Belirtilmedi</span>
                        )}
                      </TableCell>

                      <TableCell>
                        <div className="space-y-0.5 font-mono text-xs">
                          <span className="text-white block">
                            {Number(mac.operatingHours || 0).toLocaleString("tr-TR")} saat
                          </span>
                          <span className="text-[11px] text-zinc-400 block">
                            {Number(mac.productionCount || 0).toLocaleString("tr-TR")} adet
                          </span>
                        </div>
                      </TableCell>

                      <TableCell className="text-right pr-5">
                        <div className="flex items-center justify-end gap-1.5">
                          <span
                            className={`text-[10px] font-medium px-2.5 py-0.5 rounded-full ${
                              mac.status === "ACTIVE"
                                ? "badge-positive"
                                : mac.status === "FAULT"
                                ? "badge-critical"
                                : "badge-pending"
                            }`}
                          >
                            {MACHINE_STATUS_LABELS[mac.status as MachineStatus] || mac.status}
                          </span>

                          {canUpdate && (
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => {
                                setCounterModalMac(mac)
                                setCounterHoursSet(String(mac.operatingHours ?? 0))
                                setCounterCountSet(String(mac.productionCount ?? 0))
                                setCounterStatus((mac.status as MachineStatus) || "ACTIVE")
                              }}
                              className="h-8 w-8 p-0 text-cyan-300 hover:bg-cyan-500/10 rounded-lg"
                              title="Sayaç / Durum Güncelle"
                            >
                              <Activity className="h-4 w-4" />
                            </Button>
                          )}

                          {canUpdate && (
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => handleOpenMacModal(mac)}
                              className="h-8 w-8 p-0 text-emerald-400 hover:bg-emerald-500/10 rounded-lg"
                              title="Düzenle"
                            >
                              <Edit3 className="h-4 w-4" />
                            </Button>
                          )}

                          {canDelete && (
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() =>
                                postMasterDataAction("delete_machine", { id: mac.id })
                              }
                              className="h-8 w-8 p-0 text-rose-400 hover:bg-rose-500/10 rounded-lg"
                              title="Sil"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>

            <div className="px-5 py-3 border-t border-white/[0.06] flex items-center justify-between text-xs text-zinc-400">
              <span>
                Toplam <strong className="text-white">{macPagination.totalCount}</strong> makine/ekipman
              </span>
              <div className="flex items-center gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  disabled={!macPagination.hasPrevPage}
                  onClick={() => setMacPage((p) => Math.max(1, p - 1))}
                  className="h-7 px-2.5 bg-white/[0.03] border-white/[0.08] text-xs rounded-lg"
                >
                  <ChevronLeft className="h-3.5 w-3.5" />
                </Button>
                <span className="font-mono">
                  Sayfa {macPagination.page} / {macPagination.totalPages}
                </span>
                <Button
                  size="sm"
                  variant="outline"
                  disabled={!macPagination.hasNextPage}
                  onClick={() => setMacPage((p) => p + 1)}
                  className="h-7 px-2.5 bg-white/[0.03] border-white/[0.08] text-xs rounded-lg"
                >
                  <ChevronRight className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════
          SEKME 3: ÇALIŞMA TAKVİMİ, VARDİYA, TATİL VE İSTİSNALAR
         ══════════════════════════════════════════════════════════ */}
      {activeTab === "calendars" && (
        <div className="space-y-6">
          <div className="flex flex-wrap items-center justify-between gap-3 bg-[#111513]/90 border border-white/[0.06] p-4 rounded-[20px]">
            <div>
              <h3 className="text-sm font-medium text-white">
                Çalışma Takvimleri, Vardiyalar, Tatil Günleri ve İş Merkezi İstisnaları
              </h3>
              <p className="text-xs text-zinc-400">
                Kapasite ve MRP motorunun baz aldığı çalışma günleri, net vardiya süreleri ve istasyon duruş/fazla mesai istisnaları.
              </p>
            </div>

            {canCreate && (
              <div className="flex flex-wrap items-center gap-2">
                <Button
                  size="sm"
                  onClick={() => {
                    setEditingCal(null)
                    setCalForm({
                      code: `TAK-0${calendars.length + 1}`,
                      name: "",
                      workingDays: ["MON", "TUE", "WED", "THU", "FRI", "SAT"],
                      isDefault: calendars.length === 0,
                      notes: "",
                    })
                    setCalModalOpen(true)
                  }}
                  className="bg-[#34D399] hover:bg-[#34D399]/90 text-[#061811] font-semibold text-xs h-9 px-3.5 gap-1.5 rounded-xl cursor-pointer"
                >
                  <Plus className="h-3.5 w-3.5" />
                  Yeni Takvim
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  disabled={calendars.length === 0}
                  onClick={() => {
                    setShiftForm({
                      calendarId: calendars[0]?.id || "",
                      code: `VRD-0${(lookups.shifts?.length || 0) + 1}`,
                      name: "",
                      startTime: "08:00",
                      endTime: "17:00",
                      breakMinutes: "60",
                      capacityMultiplier: "1",
                    })
                    setShiftModalOpen(true)
                  }}
                  className="bg-white/[0.03] border-white/[0.08] text-zinc-200 text-xs h-9 px-3.5 gap-1.5 rounded-xl cursor-pointer"
                >
                  <Clock className="h-3.5 w-3.5 text-emerald-400" />
                  Vardiya Ekle
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  disabled={calendars.length === 0}
                  onClick={() => {
                    setHolidayForm({
                      calendarId: calendars[0]?.id || "",
                      holidayDate: "2026-10-29",
                      name: "",
                      isHalfDay: false,
                      isRecurringYearly: true,
                    })
                    setHolidayModalOpen(true)
                  }}
                  className="bg-white/[0.03] border-white/[0.08] text-zinc-200 text-xs h-9 px-3.5 gap-1.5 rounded-xl cursor-pointer"
                >
                  <CalendarDays className="h-3.5 w-3.5 text-amber-400" />
                  Tatil Günü Ekle
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  disabled={calendars.length === 0 || workCenters.length === 0}
                  onClick={() => {
                    setExcForm({
                      calendarId: calendars[0]?.id || "",
                      workCenterId: workCenters[0]?.id || "",
                      exceptionDate: "2026-11-15",
                      exceptionType: "CLOSED",
                      availableHours: "0",
                      capacityPercent: "0",
                      reason: "",
                    })
                    setExcModalOpen(true)
                  }}
                  className="bg-white/[0.03] border-white/[0.08] text-zinc-200 text-xs h-9 px-3.5 gap-1.5 rounded-xl cursor-pointer"
                >
                  <AlertTriangle className="h-3.5 w-3.5 text-cyan-400" />
                  İstasyon İstisnası Ekle
                </Button>
              </div>
            )}
          </div>

          {calendars.length === 0 ? (
            <div className="glass-panel rounded-2xl p-8 text-center space-y-3 border border-white/[0.06]">
              <CalendarDays className="h-8 w-8 text-zinc-600 mx-auto" />
              <p className="text-xs text-zinc-400">
                Henüz çalışma takvimi tanımlanmadı. Vardiya, tatil ve istisna eklemek için önce bir çalışma takvimi oluşturun.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {calendars.map((cal: any) => (
                <div
                  key={cal.id}
                  className="glass-panel rounded-2xl p-5 border border-white/[0.06] space-y-4"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-white/[0.06] pb-3">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-xs font-semibold text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2.5 py-0.5 rounded-md">
                          {cal.code}
                        </span>
                        <h4 className="text-sm font-semibold text-white">{cal.name}</h4>
                        {cal.isDefault && (
                          <span className="badge-positive text-[10px] px-2 py-0.5 rounded-full">
                            Varsayılan Takvim
                          </span>
                        )}
                      </div>
                      <div className="flex flex-wrap gap-1.5 pt-1">
                        {WEEKDAY_CODES.map((day) => {
                          const active = (cal.workingDays || []).includes(day)
                          return (
                            <span
                              key={day}
                              className={`text-[10px] px-2 py-0.5 rounded-md font-medium border ${
                                active
                                  ? "bg-emerald-500/10 text-emerald-300 border-emerald-500/20"
                                  : "bg-white/[0.02] text-zinc-500 border-white/[0.05]"
                              }`}
                            >
                              {WEEKDAY_LABELS[day]}
                            </span>
                          )
                        })}
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <span className="text-xs text-zinc-400 font-mono">
                        Toplam Net Vardiya: <strong className="text-white">{cal.totalDailyNetHours} sa/gün</strong>
                      </span>
                      {canDelete && (
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() =>
                            postMasterDataAction("delete_calendar", { id: cal.id })
                          }
                          className="h-8 w-8 p-0 text-rose-400 hover:bg-rose-500/10 rounded-lg"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  </div>

                  {/* Vardiyalar, Tatiller ve İstisnalar 3 Sütunlu Grid */}
                  <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                    {/* Vardiyalar */}
                    <div className="p-3.5 rounded-xl bg-white/[0.02] border border-white/[0.05] space-y-2">
                      <span className="text-[11px] font-semibold uppercase tracking-wider text-emerald-400 block">
                        Vardiyalar ({(cal.shifts || []).length})
                      </span>
                      {(cal.shifts || []).length === 0 ? (
                        <p className="text-xs text-zinc-500">Vardiya tanımlı değil.</p>
                      ) : (
                        <div className="space-y-1.5">
                          {cal.shifts.map((sh: any) => (
                            <div
                              key={sh.id}
                              className="p-2.5 rounded-lg bg-white/[0.03] border border-white/[0.05] flex items-center justify-between text-xs"
                            >
                              <div>
                                <span className="font-mono text-emerald-300 font-medium">
                                  {sh.code}
                                </span>{" "}
                                <span className="text-white font-medium">{sh.name}</span>
                                <span className="block text-[11px] text-zinc-400 font-mono">
                                  {sh.startTime} - {sh.endTime} (Mola: {sh.breakMinutes} dk → Net:{" "}
                                  {sh.netWorkingMinutes} dk)
                                </span>
                              </div>
                              {canDelete && (
                                <button
                                  type="button"
                                  onClick={() =>
                                    postMasterDataAction("delete_shift", { id: sh.id })
                                  }
                                  className="text-rose-400 hover:text-rose-300 p-1 cursor-pointer"
                                >
                                  <Trash2 className="h-3.5 w-3.5" />
                                </button>
                              )}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Tatil Günleri */}
                    <div className="p-3.5 rounded-xl bg-white/[0.02] border border-white/[0.05] space-y-2">
                      <span className="text-[11px] font-semibold uppercase tracking-wider text-amber-300 block">
                        Tatil Günleri ({(cal.holidays || []).length})
                      </span>
                      {(cal.holidays || []).length === 0 ? (
                        <p className="text-xs text-zinc-500">Tatil günü kaydı yok.</p>
                      ) : (
                        <div className="space-y-1.5">
                          {cal.holidays.map((h: any) => (
                            <div
                              key={h.id}
                              className="p-2.5 rounded-lg bg-white/[0.03] border border-white/[0.05] flex items-center justify-between text-xs"
                            >
                              <div>
                                <span className="font-mono text-amber-300 font-medium">
                                  {h.holidayDate}
                                </span>{" "}
                                <span className="text-white">{h.name}</span>
                                <span className="block text-[10px] text-zinc-400">
                                  {h.isHalfDay ? "Yarım Gün" : "Tam Gün"} ·{" "}
                                  {h.isRecurringYearly ? "Her Yıl Tekrarlar" : "Tek Seferlik"}
                                </span>
                              </div>
                              {canDelete && (
                                <button
                                  type="button"
                                  onClick={() =>
                                    postMasterDataAction("delete_holiday", { id: h.id })
                                  }
                                  className="text-rose-400 hover:text-rose-300 p-1 cursor-pointer"
                                >
                                  <Trash2 className="h-3.5 w-3.5" />
                                </button>
                              )}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* İş Merkezi Bazlı İstisnalar */}
                    <div className="p-3.5 rounded-xl bg-white/[0.02] border border-white/[0.05] space-y-2">
                      <span className="text-[11px] font-semibold uppercase tracking-wider text-cyan-300 block">
                        İş Merkezi İstisnaları ({(cal.exceptions || []).length})
                      </span>
                      {(cal.exceptions || []).length === 0 ? (
                        <p className="text-xs text-zinc-500">İstasyon istisnası yok.</p>
                      ) : (
                        <div className="space-y-1.5">
                          {cal.exceptions.map((ex: any) => (
                            <div
                              key={ex.id}
                              className="p-2.5 rounded-lg bg-white/[0.03] border border-white/[0.05] flex items-center justify-between text-xs"
                            >
                              <div>
                                <span className="font-mono text-cyan-300 font-medium">
                                  {ex.exceptionDate}
                                </span>{" "}
                                <span className="text-white font-medium">
                                  {ex.workCenter?.code || "İstasyon"}
                                </span>
                                <span className="block text-[10px] text-zinc-400">
                                  {CALENDAR_EXCEPTION_TYPE_LABELS[
                                    ex.exceptionType as CalendarExceptionType
                                  ] || ex.exceptionType}{" "}
                                  ({ex.availableHours} sa · %{ex.capacityPercent})
                                </span>
                              </div>
                              {canDelete && (
                                <button
                                  type="button"
                                  onClick={() =>
                                    postMasterDataAction("delete_exception", { id: ex.id })
                                  }
                                  className="text-rose-400 hover:text-rose-300 p-1 cursor-pointer"
                                >
                                  <Trash2 className="h-3.5 w-3.5" />
                                </button>
                              )}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════
          SEKME 4: STOK / ÜRÜN KARTI 1-1 ÜRETİM PROFİLLERİ
         ══════════════════════════════════════════════════════════ */}
      {activeTab === "item-profiles" && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between bg-[#111513]/90 border border-white/[0.06] p-4 rounded-[20px]">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-500" />
              <Input
                placeholder="Stok kodu (SKU) veya ürün adı ile ara..."
                value={ipSearch}
                onChange={(e) => {
                  setIpSearch(e.target.value)
                  setIpPage(1)
                }}
                className="pl-10 text-xs bg-white/[0.03] border-white/[0.08] text-white rounded-xl h-9.5"
              />
            </div>

            <div className="flex flex-wrap items-center gap-2.5">
              <Select
                value={ipTypeFilter}
                onValueChange={(v) => {
                  setIpTypeFilter(v)
                  setIpPage(1)
                }}
              >
                <SelectTrigger className="w-40 text-xs bg-white/[0.03] border-white/[0.08] text-zinc-300 rounded-xl h-9.5">
                  <SelectValue placeholder="Ürün Tipi" />
                </SelectTrigger>
                <SelectContent className="backdrop-blur-xl bg-[#111513] border border-white/[0.08] text-white">
                  <SelectItem value="ALL" className="text-xs">
                    Tüm Ürün Tipleri
                  </SelectItem>
                  {(
                    Object.entries(PRODUCTION_ITEM_TYPE_LABELS) as [
                      ProductionItemType,
                      string,
                    ][]
                  ).map(([code, label]) => (
                    <SelectItem key={code} value={code} className="text-xs">
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select
                value={ipMethodFilter}
                onValueChange={(v) => {
                  setIpMethodFilter(v)
                  setIpPage(1)
                }}
              >
                <SelectTrigger className="w-44 text-xs bg-white/[0.03] border-white/[0.08] text-zinc-300 rounded-xl h-9.5">
                  <SelectValue placeholder="Üretim Yöntemi" />
                </SelectTrigger>
                <SelectContent className="backdrop-blur-xl bg-[#111513] border border-white/[0.08] text-white">
                  <SelectItem value="ALL" className="text-xs">
                    Tüm Üretim Yöntemleri
                  </SelectItem>
                  {(
                    Object.entries(PRODUCTION_METHOD_LABELS) as [
                      ProductionMethod,
                      string,
                    ][]
                  ).map(([code, label]) => (
                    <SelectItem key={code} value={code} className="text-xs">
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="glass-table-container overflow-hidden">
            <Table>
              <TableHeader className="bg-white/[0.02]">
                <TableRow className="border-b border-white/[0.06] text-[11px] text-zinc-400 uppercase tracking-wider hover:bg-transparent">
                  <TableHead className="py-3.5 pl-5">1. Stok Kodu (SKU) & Ürün</TableHead>
                  <TableHead>2. Üretim Tipi & Yöntemi</TableHead>
                  <TableHead>3. Tedarik / Üretim Süresi</TableHead>
                  <TableHead>4. Min / Güvenlik Stoğu & Lot</TableHead>
                  <TableHead>5. Varsayılan Reçete & İstasyon</TableHead>
                  <TableHead className="text-right pr-5">6. 1-1 Profil İşlemi</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {itemProfiles.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="h-28 text-center text-xs text-zinc-500">
                      Aramaya uygun stok kartı bulunamadı.
                    </TableCell>
                  </TableRow>
                ) : (
                  itemProfiles.map((row) => (
                    <TableRow
                      key={row.itemId}
                      className="border-b border-white/[0.04] hover:bg-white/[0.02] transition-colors"
                    >
                      <TableCell className="relative py-3.5 pl-5">
                        <span
                          className={`absolute left-0 top-2.5 bottom-2.5 w-[3px] rounded-r-full ${
                            row.isConfiguredInDb ? "bg-emerald-500" : "bg-zinc-600"
                          }`}
                        />
                        <div className="space-y-0.5">
                          <span className="text-sm font-medium text-white block">
                            {row.name}
                          </span>
                          <span className="font-mono text-[11px] text-zinc-400">
                            {row.sku} · {row.baseUnit}
                          </span>
                        </div>
                      </TableCell>

                      <TableCell>
                        <div className="space-y-1">
                          <span className="inline-flex bg-emerald-500/10 text-emerald-300 border border-emerald-500/20 rounded-full px-2.5 py-0.5 text-[11px] font-medium">
                            {PRODUCTION_ITEM_TYPE_LABELS[
                              row.productionItemType as ProductionItemType
                            ] || row.productionItemType}
                          </span>
                          <span className="block text-[11px] text-zinc-400">
                            {PRODUCTION_METHOD_LABELS[
                              row.productionMethod as ProductionMethod
                            ] || row.productionMethod}
                          </span>
                        </div>
                      </TableCell>

                      <TableCell className="font-mono text-xs">
                        <span className="text-white block">
                          Tedarik: {row.leadTimeDays} gün
                        </span>
                        <span className="text-[11px] text-zinc-400 block">
                          İmalat: {row.productionLeadTimeHours} saat
                        </span>
                      </TableCell>

                      <TableCell className="font-mono text-xs">
                        <span className="text-white block">
                          Min: {row.minStockLevel} · Güv: {row.safetyStockQty} {row.baseUnit}
                        </span>
                        <span className="text-[11px] text-emerald-400 block">
                          {row.lotSizingRule} (Lot: {row.standardLotSize})
                        </span>
                      </TableCell>

                      <TableCell className="text-xs">
                        <span className="text-zinc-200 block font-mono">
                          {row.defaultBom
                            ? `${row.defaultBom.code} (${row.defaultBom.version || "v1.0"})`
                            : "Reçete Yok"}
                        </span>
                        <span className="text-[11px] text-zinc-500 block">
                          {row.defaultWorkCenter
                            ? `${row.defaultWorkCenter.code} · ${row.defaultWorkCenter.name}`
                            : "İstasyon Seçilmedi"}
                        </span>
                      </TableCell>

                      <TableCell className="text-right pr-5">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => setSelectedProfileItem(row)}
                          className="h-8 text-xs bg-white/[0.03] border-white/[0.08] text-emerald-400 hover:bg-emerald-500/10 rounded-xl cursor-pointer gap-1.5"
                        >
                          <Edit3 className="h-3.5 w-3.5" />
                          1-1 Profili Düzenle
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>

            <div className="px-5 py-3 border-t border-white/[0.06] flex items-center justify-between text-xs text-zinc-400">
              <span>
                Toplam <strong className="text-white">{ipPagination.totalCount}</strong> stok kartı
              </span>
              <div className="flex items-center gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  disabled={!ipPagination.hasPrevPage}
                  onClick={() => setIpPage((p) => Math.max(1, p - 1))}
                  className="h-7 px-2.5 bg-white/[0.03] border-white/[0.08] text-xs rounded-lg"
                >
                  <ChevronLeft className="h-3.5 w-3.5" />
                </Button>
                <span className="font-mono">
                  Sayfa {ipPagination.page} / {ipPagination.totalPages}
                </span>
                <Button
                  size="sm"
                  variant="outline"
                  disabled={!ipPagination.hasNextPage}
                  onClick={() => setIpPage((p) => p + 1)}
                  className="h-7 px-2.5 bg-white/[0.03] border-white/[0.08] text-xs rounded-lg"
                >
                  <ChevronRight className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════
          SEKME 5: ÜRETİM PARAMETRELERİ
         ══════════════════════════════════════════════════════════ */}
      {activeTab === "parameters" && (
        <div className="glass-panel rounded-2xl p-6 border border-white/[0.06] space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-white/[0.06] pb-4">
            <div>
              <h3 className="text-base font-medium text-white">
                Üretim Planlama, Lot, Güvenlik Stoğu ve Durum Akışı Parametreleri
              </h3>
              <p className="text-xs text-zinc-400 mt-0.5">
                MRP, MPS, İş Emri ve Kapasite modüllerinin baz alacağı fabrika/şube varsayılan kuralları.
              </p>
            </div>
            {canUpdate && (
              <Button
                size="sm"
                disabled={submitting}
                onClick={() =>
                  postMasterDataAction("save_parameters", {
                    ...paramsForm,
                    defaultManufacturingWarehouseId:
                      paramsForm.defaultManufacturingWarehouseId === "none"
                        ? null
                        : paramsForm.defaultManufacturingWarehouseId,
                  })
                }
                className="bg-[#34D399] hover:bg-[#34D399]/90 text-[#061811] font-semibold text-xs h-9 px-4 gap-1.5 rounded-xl cursor-pointer shadow-lg shadow-emerald-500/20"
              >
                {submitting ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Save className="h-4 w-4" />
                )}
                Parametreleri Kaydet
              </Button>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* 1. Planlama Dönemi */}
            <div className="p-4 rounded-xl bg-white/[0.02] border border-white/[0.06] space-y-3">
              <span className="text-xs font-semibold text-emerald-400 uppercase tracking-wider block">
                1. Planlama Dönemi & Ufku
              </span>
              <div className="space-y-1.5">
                <Label className="text-xs text-zinc-300">Planlama Ufku (Gün)</Label>
                <Input
                  type="number"
                  min="1"
                  max="365"
                  value={paramsForm.planningHorizonDays}
                  onChange={(e) =>
                    setParamsForm({
                      ...paramsForm,
                      planningHorizonDays: Number(e.target.value),
                    })
                  }
                  className="text-xs bg-white/[0.03] border-white/[0.08] text-white rounded-xl h-9 font-mono"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs text-zinc-300">Planlama Dilimi (Periyot)</Label>
                <Select
                  value={paramsForm.planningBucket}
                  onValueChange={(v) =>
                    setParamsForm({ ...paramsForm, planningBucket: v as PlanningBucket })
                  }
                >
                  <SelectTrigger className="text-xs bg-white/[0.03] border-white/[0.08] text-white rounded-xl h-9">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="backdrop-blur-xl bg-[#111513] border border-white/[0.08] text-white">
                    {(
                      Object.entries(PLANNING_BUCKET_LABELS) as [PlanningBucket, string][]
                    ).map(([k, lbl]) => (
                      <SelectItem key={k} value={k} className="text-xs">
                        {lbl}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs text-zinc-300">Varsayılan Üretim Atölyesi/Deposu</Label>
                <Select
                  value={paramsForm.defaultManufacturingWarehouseId}
                  onValueChange={(v) =>
                    setParamsForm({
                      ...paramsForm,
                      defaultManufacturingWarehouseId: v,
                    })
                  }
                >
                  <SelectTrigger className="text-xs bg-white/[0.03] border-white/[0.08] text-white rounded-xl h-9">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="backdrop-blur-xl bg-[#111513] border border-white/[0.08] text-white">
                    <SelectItem value="none" className="text-xs text-zinc-400">
                      Otomatik Seç
                    </SelectItem>
                    {(lookups.warehouses || []).map((w: any) => (
                      <SelectItem key={w.id} value={w.id} className="text-xs">
                        {w.code} — {w.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* 2. Varsayılan Lot Kuralı */}
            <div className="p-4 rounded-xl bg-white/[0.02] border border-white/[0.06] space-y-3">
              <span className="text-xs font-semibold text-cyan-300 uppercase tracking-wider block">
                2. Varsayılan Lot Kuralı
              </span>
              <div className="space-y-1.5">
                <Label className="text-xs text-zinc-300">Lot Büyüklüğü Kuralı</Label>
                <Select
                  value={paramsForm.defaultLotSizingRule}
                  onValueChange={(v) =>
                    setParamsForm({
                      ...paramsForm,
                      defaultLotSizingRule: v as LotSizingRule,
                    })
                  }
                >
                  <SelectTrigger className="text-xs bg-white/[0.03] border-white/[0.08] text-white rounded-xl h-9">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="backdrop-blur-xl bg-[#111513] border border-white/[0.08] text-white">
                    {(
                      Object.entries(LOT_SIZING_RULE_LABELS) as [LotSizingRule, string][]
                    ).map(([k, lbl]) => (
                      <SelectItem key={k} value={k} className="text-xs">
                        {lbl}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-2 gap-2.5">
                <div className="space-y-1.5">
                  <Label className="text-xs text-zinc-300">Min. Lot Miktarı</Label>
                  <Input
                    type="number"
                    min="0.01"
                    step="any"
                    value={paramsForm.defaultMinLotSize}
                    onChange={(e) =>
                      setParamsForm({
                        ...paramsForm,
                        defaultMinLotSize: Number(e.target.value),
                      })
                    }
                    className="text-xs bg-white/[0.03] border-white/[0.08] text-white rounded-xl h-9 font-mono"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs text-zinc-300">Lot Katı (Çarpan)</Label>
                  <Input
                    type="number"
                    min="0.01"
                    step="any"
                    value={paramsForm.defaultLotMultiple}
                    onChange={(e) =>
                      setParamsForm({
                        ...paramsForm,
                        defaultLotMultiple: Number(e.target.value),
                      })
                    }
                    className="text-xs bg-white/[0.03] border-white/[0.08] text-white rounded-xl h-9 font-mono"
                  />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs text-zinc-300">
                  Fazla Üretim Toleransı (%)
                </Label>
                <Input
                  type="number"
                  min="0"
                  max="100"
                  value={paramsForm.allowOverProductionPercent}
                  onChange={(e) =>
                    setParamsForm({
                      ...paramsForm,
                      allowOverProductionPercent: Number(e.target.value),
                    })
                  }
                  className="text-xs bg-white/[0.03] border-white/[0.08] text-white rounded-xl h-9 font-mono"
                />
              </div>
            </div>

            {/* 3. Güvenlik Stoğu Varsayılanı */}
            <div className="p-4 rounded-xl bg-white/[0.02] border border-white/[0.06] space-y-3">
              <span className="text-xs font-semibold text-amber-300 uppercase tracking-wider block">
                3. Güvenlik Stoğu Varsayılanı
              </span>
              <div className="space-y-1.5">
                <Label className="text-xs text-zinc-300">Güvenlik Stoğu Yöntemi</Label>
                <Select
                  value={paramsForm.defaultSafetyStockRule}
                  onValueChange={(v) =>
                    setParamsForm({
                      ...paramsForm,
                      defaultSafetyStockRule: v as SafetyStockRule,
                    })
                  }
                >
                  <SelectTrigger className="text-xs bg-white/[0.03] border-white/[0.08] text-white rounded-xl h-9">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="backdrop-blur-xl bg-[#111513] border border-white/[0.08] text-white">
                    {(
                      Object.entries(SAFETY_STOCK_RULE_LABELS) as [
                        SafetyStockRule,
                        string,
                      ][]
                    ).map(([k, lbl]) => (
                      <SelectItem key={k} value={k} className="text-xs">
                        {lbl}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-2 gap-2.5">
                <div className="space-y-1.5">
                  <Label className="text-xs text-zinc-300">Varsayılan Miktar</Label>
                  <Input
                    type="number"
                    min="0"
                    value={paramsForm.defaultSafetyStockValue}
                    onChange={(e) =>
                      setParamsForm({
                        ...paramsForm,
                        defaultSafetyStockValue: Number(e.target.value),
                      })
                    }
                    className="text-xs bg-white/[0.03] border-white/[0.08] text-white rounded-xl h-9 font-mono"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs text-zinc-300">Karşılık Gün Sayısı</Label>
                  <Input
                    type="number"
                    min="0"
                    value={paramsForm.defaultSafetyStockDays}
                    onChange={(e) =>
                      setParamsForm({
                        ...paramsForm,
                        defaultSafetyStockDays: Number(e.target.value),
                      })
                    }
                    className="text-xs bg-white/[0.03] border-white/[0.08] text-white rounded-xl h-9 font-mono"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* 4. Durum Akışı Ayarları */}
          <div className="p-4 rounded-xl bg-white/[0.02] border border-white/[0.06] space-y-4">
            <span className="text-xs font-semibold text-white uppercase tracking-wider block">
              4. İş Emri Durum Akışı ve Operasyon Kuralları
            </span>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="param-approval"
                  checked={paramsForm.requireWorkOrderApproval}
                  onCheckedChange={(c) =>
                    setParamsForm({
                      ...paramsForm,
                      requireWorkOrderApproval: Boolean(c),
                    })
                  }
                />
                <Label htmlFor="param-approval" className="text-xs text-zinc-300 cursor-pointer">
                  İş Emri Serbest Bırakmada Onay Zorunlu (`approve`)
                </Label>
              </div>

              <div className="flex items-center space-x-2">
                <Checkbox
                  id="param-reserve"
                  checked={paramsForm.autoReserveOnRelease}
                  onCheckedChange={(c) =>
                    setParamsForm({ ...paramsForm, autoReserveOnRelease: Boolean(c) })
                  }
                />
                <Label htmlFor="param-reserve" className="text-xs text-zinc-300 cursor-pointer">
                  Serbest Bırakıldığında Hammadde Otomatik Rezerve Edilsin
                </Label>
              </div>

              <div className="flex items-center space-x-2">
                <Checkbox
                  id="param-backflush"
                  checked={paramsForm.autoBackflushOnComplete}
                  onCheckedChange={(c) =>
                    setParamsForm({
                      ...paramsForm,
                      autoBackflushOnComplete: Boolean(c),
                    })
                  }
                />
                <Label htmlFor="param-backflush" className="text-xs text-zinc-300 cursor-pointer">
                  Tamamlandığında Otomatik Hammadde Sarfiyatı (Backflush)
                </Label>
              </div>

              <div className="flex items-center space-x-2">
                <Checkbox
                  id="param-qc"
                  checked={paramsForm.requireQualityCheckOnComplete}
                  onCheckedChange={(c) =>
                    setParamsForm({
                      ...paramsForm,
                      requireQualityCheckOnComplete: Boolean(c),
                    })
                  }
                />
                <Label htmlFor="param-qc" className="text-xs text-zinc-300 cursor-pointer">
                  Mamul Girişi Öncesi Kalite Kontrol Onayı Zorunlu
                </Label>
              </div>

              <div className="flex items-center space-x-2">
                <Checkbox
                  id="param-neg"
                  checked={paramsForm.allowNegativeStockInProduction}
                  onCheckedChange={(c) =>
                    setParamsForm({
                      ...paramsForm,
                      allowNegativeStockInProduction: Boolean(c),
                    })
                  }
                />
                <Label htmlFor="param-neg" className="text-xs text-zinc-300 cursor-pointer">
                  Üretimde Eksi (Negatif) Stok Sarfiyatına İzin Ver
                </Label>
              </div>
            </div>

            <div className="pt-2 border-t border-white/[0.05] flex flex-wrap items-center gap-2">
              <span className="text-[11px] text-zinc-400">Aktif Durum Akışı:</span>
              {(paramsForm.statusFlow || []).map((st: string, i: number) => (
                <React.Fragment key={st}>
                  <span className="text-[11px] font-mono bg-emerald-500/10 text-emerald-300 border border-emerald-500/20 px-2.5 py-0.5 rounded-md">
                    {WORK_ORDER_STATUS_LABELS[st] || st} ({st})
                  </span>
                  {i < (paramsForm.statusFlow || []).length - 1 && (
                    <span className="text-zinc-500 text-xs">→</span>
                  )}
                </React.Fragment>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════
          MODALLAR VE DETAY ÇEKMECESİ
         ══════════════════════════════════════════════════════════ */}

      {/* MODAL 1: İŞ MERKEZİ OLUŞTUR / DÜZENLE */}
      <Dialog open={wcModalOpen} onOpenChange={setWcModalOpen}>
        <DialogContent className="sm:max-w-xl bg-[#111513] border border-white/[0.08] text-white rounded-2xl">
          <DialogHeader>
            <DialogTitle className="text-base font-semibold">
              {editingWc ? `İş Merkezini Düzenle (${editingWc.code})` : "Yeni İş Merkezi / İstasyon Tanımla"}
            </DialogTitle>
            <DialogDescription className="text-xs text-zinc-400">
              Saatlik maliyet, teorik kapasite, verimlilik yüzdesi ve bağlı vardiya/takvim bilgilerini girin.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 py-2">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs text-zinc-300">İstasyon Kodu *</Label>
                <Input
                  value={wcForm.code}
                  onChange={(e) =>
                    setWcForm({ ...wcForm, code: e.target.value.toUpperCase() })
                  }
                  placeholder="IST-01"
                  className="text-xs font-mono bg-white/[0.03] border-white/[0.08] text-white rounded-xl h-9"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs text-zinc-300">İstasyon Tipi *</Label>
                <Select
                  value={wcForm.type}
                  onValueChange={(v) => setWcForm({ ...wcForm, type: v })}
                >
                  <SelectTrigger className="text-xs bg-white/[0.03] border-white/[0.08] text-white rounded-xl h-9">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-[#111513] border border-white/[0.08] text-white">
                    <SelectItem value="MACHINE" className="text-xs">
                      Makine / Otomatik İstasyon
                    </SelectItem>
                    <SelectItem value="MANUAL" className="text-xs">
                      Manuel / El İşçiliği İstasyonu
                    </SelectItem>
                    <SelectItem value="OUTSOURCE" className="text-xs">
                      Dış Kaynak / Fason İstasyon
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-1">
              <Label className="text-xs text-zinc-300">İş Merkezi / İstasyon Adı *</Label>
              <Input
                value={wcForm.name}
                onChange={(e) => setWcForm({ ...wcForm, name: e.target.value })}
                placeholder="Örn: Buket Tasarım & Paketleme Hattı 1"
                className="text-xs bg-white/[0.03] border-white/[0.08] text-white rounded-xl h-9"
              />
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-1">
                <Label className="text-xs text-zinc-300">Saatlik Maliyet (₺)</Label>
                <Input
                  type="number"
                  min="0"
                  step="any"
                  value={wcForm.hourlyCost}
                  onChange={(e) => setWcForm({ ...wcForm, hourlyCost: e.target.value })}
                  className="text-xs font-mono bg-white/[0.03] border-white/[0.08] text-white rounded-xl h-9"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs text-zinc-300">Kapasite (Adet/Saat)</Label>
                <Input
                  type="number"
                  min="0.1"
                  step="any"
                  value={wcForm.capacityPerHour}
                  onChange={(e) =>
                    setWcForm({ ...wcForm, capacityPerHour: e.target.value })
                  }
                  className="text-xs font-mono bg-white/[0.03] border-white/[0.08] text-white rounded-xl h-9"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs text-zinc-300">Verimlilik (%)</Label>
                <Input
                  type="number"
                  min="1"
                  max="200"
                  value={wcForm.efficiencyPercent}
                  onChange={(e) =>
                    setWcForm({ ...wcForm, efficiencyPercent: e.target.value })
                  }
                  className="text-xs font-mono bg-white/[0.03] border-white/[0.08] text-white rounded-xl h-9"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs text-zinc-300">Bağlı Çalışma Takvimi</Label>
                <Select
                  value={wcForm.calendarId}
                  onValueChange={(v) => setWcForm({ ...wcForm, calendarId: v })}
                >
                  <SelectTrigger className="text-xs bg-white/[0.03] border-white/[0.08] text-white rounded-xl h-9">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-[#111513] border border-white/[0.08] text-white">
                    <SelectItem value="none" className="text-xs text-zinc-400">
                      Standart Fabrika Takvimi
                    </SelectItem>
                    {calendars.map((c: any) => (
                      <SelectItem key={c.id} value={c.id} className="text-xs">
                        {c.code} — {c.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label className="text-xs text-zinc-300">Alternatif İş Merkezi Grubu</Label>
                <Input
                  value={wcForm.alternativeGroupCode}
                  onChange={(e) =>
                    setWcForm({
                      ...wcForm,
                      alternativeGroupCode: e.target.value.toUpperCase(),
                    })
                  }
                  placeholder="Örn: GRP-MONTAJ"
                  className="text-xs font-mono bg-white/[0.03] border-white/[0.08] text-white rounded-xl h-9"
                />
              </div>
            </div>

            <div className="flex items-center space-x-2 pt-1">
              <Checkbox
                id="wc-active"
                checked={wcForm.isActive}
                onCheckedChange={(c) => setWcForm({ ...wcForm, isActive: Boolean(c) })}
              />
              <Label htmlFor="wc-active" className="text-xs text-zinc-300 cursor-pointer">
                İstasyon Aktif (Planlama ve İş Emirlerinde Kullanılabilir)
              </Label>
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setWcModalOpen(false)}
              className="bg-white/[0.04] border-white/[0.08] text-zinc-300 rounded-xl text-xs"
            >
              İptal
            </Button>
            <Button
              size="sm"
              disabled={submitting}
              onClick={() =>
                postMasterDataAction(
                  editingWc ? "update_work_center" : "create_work_center",
                  editingWc ? { id: editingWc.id, ...wcForm } : wcForm,
                  () => setWcModalOpen(false)
                )
              }
              className="bg-[#34D399] hover:bg-[#34D399]/90 text-[#061811] font-semibold rounded-xl text-xs"
            >
              {editingWc ? "Güncelle" : "İş Merkezini Kaydet"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* MODAL 2: MAKİNE / EKİPMAN OLUŞTUR / DÜZENLE */}
      <Dialog open={macModalOpen} onOpenChange={setMacModalOpen}>
        <DialogContent className="sm:max-w-xl bg-[#111513] border border-white/[0.08] text-white rounded-2xl">
          <DialogHeader>
            <DialogTitle className="text-base font-semibold">
              {editingMac
                ? `Makine / Ekipmanı Düzenle (${editingMac.code})`
                : "Yeni Makine / Ekipman Varlığı Tanımla"}
            </DialogTitle>
            <DialogDescription className="text-xs text-zinc-400">
              Seri no, marka/model, garanti, lokasyon, bağlı iş merkezi ve sayaç bilgileri.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 py-2">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs text-zinc-300">Varlık Kodu *</Label>
                <Input
                  value={macForm.code}
                  onChange={(e) =>
                    setMacForm({ ...macForm, code: e.target.value.toUpperCase() })
                  }
                  placeholder="MAK-01"
                  className="text-xs font-mono bg-white/[0.03] border-white/[0.08] text-white rounded-xl h-9"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs text-zinc-300">Seri Numarası *</Label>
                <Input
                  value={macForm.serialNumber}
                  onChange={(e) =>
                    setMacForm({
                      ...macForm,
                      serialNumber: e.target.value.toUpperCase(),
                    })
                  }
                  placeholder="SN-2026-001"
                  className="text-xs font-mono bg-white/[0.03] border-white/[0.08] text-white rounded-xl h-9"
                />
              </div>
            </div>

            <div className="space-y-1">
              <Label className="text-xs text-zinc-300">Makine / Ekipman Adı *</Label>
              <Input
                value={macForm.name}
                onChange={(e) => setMacForm({ ...macForm, name: e.target.value })}
                placeholder="Örn: Otomatik Buket Bağlama ve Kesim Makinesi"
                className="text-xs bg-white/[0.03] border-white/[0.08] text-white rounded-xl h-9"
              />
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-1">
                <Label className="text-xs text-zinc-300">Marka</Label>
                <Input
                  value={macForm.brand}
                  onChange={(e) => setMacForm({ ...macForm, brand: e.target.value })}
                  placeholder="Örn: Bercomex"
                  className="text-xs bg-white/[0.03] border-white/[0.08] text-white rounded-xl h-9"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs text-zinc-300">Model</Label>
                <Input
                  value={macForm.model}
                  onChange={(e) => setMacForm({ ...macForm, model: e.target.value })}
                  placeholder="Örn: FloraLine X4"
                  className="text-xs bg-white/[0.03] border-white/[0.08] text-white rounded-xl h-9"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs text-zinc-300">Garanti Bitiş Tarihi</Label>
                <Input
                  type="date"
                  value={macForm.warrantyEndDate}
                  onChange={(e) =>
                    setMacForm({ ...macForm, warrantyEndDate: e.target.value })
                  }
                  className="text-xs bg-white/[0.03] border-white/[0.08] text-white rounded-xl h-9"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs text-zinc-300">Bağlı İş Merkezi</Label>
                <Select
                  value={macForm.workCenterId}
                  onValueChange={(v) => setMacForm({ ...macForm, workCenterId: v })}
                >
                  <SelectTrigger className="text-xs bg-white/[0.03] border-white/[0.08] text-white rounded-xl h-9">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-[#111513] border border-white/[0.08] text-white">
                    <SelectItem value="none" className="text-xs text-zinc-400">
                      Bağlı Değil
                    </SelectItem>
                    {workCenters.map((wc: any) => (
                      <SelectItem key={wc.id} value={wc.id} className="text-xs">
                        {wc.code} — {wc.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label className="text-xs text-zinc-300">Lokasyon / Konum</Label>
                <Input
                  value={macForm.location}
                  onChange={(e) => setMacForm({ ...macForm, location: e.target.value })}
                  placeholder="Atölye Hol A - Hat 1"
                  className="text-xs bg-white/[0.03] border-white/[0.08] text-white rounded-xl h-9"
                />
              </div>
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-1">
                <Label className="text-xs text-zinc-300">Durum</Label>
                <Select
                  value={macForm.status}
                  onValueChange={(v) => setMacForm({ ...macForm, status: v })}
                >
                  <SelectTrigger className="text-xs bg-white/[0.03] border-white/[0.08] text-white rounded-xl h-9">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-[#111513] border border-white/[0.08] text-white">
                    {(
                      Object.entries(MACHINE_STATUS_LABELS) as [MachineStatus, string][]
                    ).map(([code, label]) => (
                      <SelectItem key={code} value={code} className="text-xs">
                        {label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label className="text-xs text-zinc-300">Çalışma Saati Sayacı</Label>
                <Input
                  type="number"
                  min="0"
                  step="any"
                  value={macForm.operatingHours}
                  onChange={(e) =>
                    setMacForm({ ...macForm, operatingHours: e.target.value })
                  }
                  className="text-xs font-mono bg-white/[0.03] border-white/[0.08] text-white rounded-xl h-9"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs text-zinc-300">Üretim Adet Sayacı</Label>
                <Input
                  type="number"
                  min="0"
                  step="any"
                  value={macForm.productionCount}
                  onChange={(e) =>
                    setMacForm({ ...macForm, productionCount: e.target.value })
                  }
                  className="text-xs font-mono bg-white/[0.03] border-white/[0.08] text-white rounded-xl h-9"
                />
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setMacModalOpen(false)}
              className="bg-white/[0.04] border-white/[0.08] text-zinc-300 rounded-xl text-xs"
            >
              İptal
            </Button>
            <Button
              size="sm"
              disabled={submitting}
              onClick={() =>
                postMasterDataAction(
                  editingMac ? "update_machine" : "create_machine",
                  editingMac ? { id: editingMac.id, ...macForm } : macForm,
                  () => setMacModalOpen(false)
                )
              }
              className="bg-[#34D399] hover:bg-[#34D399]/90 text-[#061811] font-semibold rounded-xl text-xs"
            >
              {editingMac ? "Güncelle" : "Makineyi Kaydet"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* MODAL 3: MAKİNE SAYAÇ & DURUM HIZLI GÜNCELLEME */}
      <Dialog
        open={Boolean(counterModalMac)}
        onOpenChange={(o) => !o && setCounterModalMac(null)}
      >
        <DialogContent className="sm:max-w-md bg-[#111513] border border-white/[0.08] text-white rounded-2xl">
          <DialogHeader>
            <DialogTitle className="text-base font-semibold">
              Sayaç & Durum Güncelle ({counterModalMac?.code})
            </DialogTitle>
            <DialogDescription className="text-xs text-zinc-400">
              {counterModalMac?.name} çalışma saati ve üretim adet sayaçlarını güncelleyin.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 py-2">
            <div className="space-y-1">
              <Label className="text-xs text-zinc-300">Güncel Çalışma Saati Sayacı</Label>
              <Input
                type="number"
                min="0"
                step="any"
                value={counterHoursSet}
                onChange={(e) => setCounterHoursSet(e.target.value)}
                className="text-xs font-mono bg-white/[0.03] border-white/[0.08] text-white rounded-xl h-9"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs text-zinc-300">Güncel Üretim Adet Sayacı</Label>
              <Input
                type="number"
                min="0"
                step="any"
                value={counterCountSet}
                onChange={(e) => setCounterCountSet(e.target.value)}
                className="text-xs font-mono bg-white/[0.03] border-white/[0.08] text-white rounded-xl h-9"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs text-zinc-300">Ekipman Durumu</Label>
              <Select
                value={counterStatus}
                onValueChange={(v) => setCounterStatus(v as MachineStatus)}
              >
                <SelectTrigger className="text-xs bg-white/[0.03] border-white/[0.08] text-white rounded-xl h-9">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-[#111513] border border-white/[0.08] text-white">
                  {(
                    Object.entries(MACHINE_STATUS_LABELS) as [MachineStatus, string][]
                  ).map(([code, label]) => (
                    <SelectItem key={code} value={code} className="text-xs">
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCounterModalMac(null)}
              className="bg-white/[0.04] border-white/[0.08] text-zinc-300 rounded-xl text-xs"
            >
              İptal
            </Button>
            <Button
              size="sm"
              disabled={submitting}
              onClick={() =>
                postMasterDataAction(
                  "update_machine_counter",
                  {
                    id: counterModalMac?.id,
                    operatingHoursSet: Number(counterHoursSet),
                    productionCountSet: Number(counterCountSet),
                    status: counterStatus,
                  },
                  () => setCounterModalMac(null)
                )
              }
              className="bg-[#34D399] hover:bg-[#34D399]/90 text-[#061811] font-semibold rounded-xl text-xs"
            >
              Sayaçları Kaydet
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* MODAL 4: ÇALIŞMA TAKVİMİ OLUŞTUR */}
      <Dialog open={calModalOpen} onOpenChange={setCalModalOpen}>
        <DialogContent className="sm:max-w-lg bg-[#111513] border border-white/[0.08] text-white rounded-2xl">
          <DialogHeader>
            <DialogTitle className="text-base font-semibold">
              Yeni Çalışma Takvimi Oluştur
            </DialogTitle>
            <DialogDescription className="text-xs text-zinc-400">
              Haftalık aktif çalışma günlerini seçin.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 py-2">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs text-zinc-300">Takvim Kodu *</Label>
                <Input
                  value={calForm.code}
                  onChange={(e) =>
                    setCalForm({ ...calForm, code: e.target.value.toUpperCase() })
                  }
                  placeholder="TAK-STD"
                  className="text-xs font-mono bg-white/[0.03] border-white/[0.08] text-white rounded-xl h-9"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs text-zinc-300">Takvim Adı *</Label>
                <Input
                  value={calForm.name}
                  onChange={(e) => setCalForm({ ...calForm, name: e.target.value })}
                  placeholder="Merkez Atölye 6 Günlük Takvim"
                  className="text-xs bg-white/[0.03] border-white/[0.08] text-white rounded-xl h-9"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs text-zinc-300">Aktif Çalışma Günleri *</Label>
              <div className="flex flex-wrap gap-2">
                {WEEKDAY_CODES.map((day) => {
                  const selected = (calForm.workingDays || []).includes(day)
                  return (
                    <button
                      key={day}
                      type="button"
                      onClick={() => {
                        const next = selected
                          ? calForm.workingDays.filter((d: string) => d !== day)
                          : [...calForm.workingDays, day]
                        setCalForm({ ...calForm, workingDays: next })
                      }}
                      className={`text-xs px-3 py-1.5 rounded-xl border transition-all cursor-pointer ${
                        selected
                          ? "bg-emerald-500/20 text-emerald-300 border-emerald-500/40 font-medium"
                          : "bg-white/[0.03] text-zinc-400 border-white/[0.08]"
                      }`}
                    >
                      {WEEKDAY_LABELS[day]}
                    </button>
                  )
                })}
              </div>
            </div>

            <div className="flex items-center space-x-2 pt-1">
              <Checkbox
                id="cal-def"
                checked={calForm.isDefault}
                onCheckedChange={(c) => setCalForm({ ...calForm, isDefault: Boolean(c) })}
              />
              <Label htmlFor="cal-def" className="text-xs text-zinc-300 cursor-pointer">
                Varsayılan Fabrika Takvimi Olarak İşaretle
              </Label>
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCalModalOpen(false)}
              className="bg-white/[0.04] border-white/[0.08] text-zinc-300 rounded-xl text-xs"
            >
              İptal
            </Button>
            <Button
              size="sm"
              disabled={submitting}
              onClick={() =>
                postMasterDataAction("create_calendar", calForm, () =>
                  setCalModalOpen(false)
                )
              }
              className="bg-[#34D399] hover:bg-[#34D399]/90 text-[#061811] font-semibold rounded-xl text-xs"
            >
              Takvimi Kaydet
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* MODAL 5: VARDİYA EKLE */}
      <Dialog open={shiftModalOpen} onOpenChange={setShiftModalOpen}>
        <DialogContent className="sm:max-w-lg bg-[#111513] border border-white/[0.08] text-white rounded-2xl">
          <DialogHeader>
            <DialogTitle className="text-base font-semibold">
              Çalışma Takvimine Vardiya Ekle
            </DialogTitle>
            <DialogDescription className="text-xs text-zinc-400">
              Başlangıç, bitiş ve mola süresine göre net çalışma dakikası otomatik hesaplanır.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 py-2">
            <div className="space-y-1">
              <Label className="text-xs text-zinc-300">Bağlı Takvim *</Label>
              <Select
                value={shiftForm.calendarId}
                onValueChange={(v) => setShiftForm({ ...shiftForm, calendarId: v })}
              >
                <SelectTrigger className="text-xs bg-white/[0.03] border-white/[0.08] text-white rounded-xl h-9">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-[#111513] border border-white/[0.08] text-white">
                  {calendars.map((c: any) => (
                    <SelectItem key={c.id} value={c.id} className="text-xs">
                      {c.code} — {c.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs text-zinc-300">Vardiya Kodu *</Label>
                <Input
                  value={shiftForm.code}
                  onChange={(e) =>
                    setShiftForm({ ...shiftForm, code: e.target.value.toUpperCase() })
                  }
                  placeholder="VRD-SABAH"
                  className="text-xs font-mono bg-white/[0.03] border-white/[0.08] text-white rounded-xl h-9"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs text-zinc-300">Vardiya Adı *</Label>
                <Input
                  value={shiftForm.name}
                  onChange={(e) => setShiftForm({ ...shiftForm, name: e.target.value })}
                  placeholder="Gündüz Vardiyası"
                  className="text-xs bg-white/[0.03] border-white/[0.08] text-white rounded-xl h-9"
                />
              </div>
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-1">
                <Label className="text-xs text-zinc-300">Başlangıç (SS:DD)</Label>
                <Input
                  value={shiftForm.startTime}
                  onChange={(e) =>
                    setShiftForm({ ...shiftForm, startTime: e.target.value })
                  }
                  placeholder="08:00"
                  className="text-xs font-mono bg-white/[0.03] border-white/[0.08] text-white rounded-xl h-9"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs text-zinc-300">Bitiş (SS:DD)</Label>
                <Input
                  value={shiftForm.endTime}
                  onChange={(e) => setShiftForm({ ...shiftForm, endTime: e.target.value })}
                  placeholder="17:00"
                  className="text-xs font-mono bg-white/[0.03] border-white/[0.08] text-white rounded-xl h-9"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs text-zinc-300">Mola Süresi (Dk)</Label>
                <Input
                  type="number"
                  min="0"
                  value={shiftForm.breakMinutes}
                  onChange={(e) =>
                    setShiftForm({ ...shiftForm, breakMinutes: e.target.value })
                  }
                  className="text-xs font-mono bg-white/[0.03] border-white/[0.08] text-white rounded-xl h-9"
                />
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShiftModalOpen(false)}
              className="bg-white/[0.04] border-white/[0.08] text-zinc-300 rounded-xl text-xs"
            >
              İptal
            </Button>
            <Button
              size="sm"
              disabled={submitting}
              onClick={() =>
                postMasterDataAction("create_shift", shiftForm, () =>
                  setShiftModalOpen(false)
                )
              }
              className="bg-[#34D399] hover:bg-[#34D399]/90 text-[#061811] font-semibold rounded-xl text-xs"
            >
              Vardiyayı Kaydet
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* MODAL 6: TATİL GÜNÜ EKLE */}
      <Dialog open={holidayModalOpen} onOpenChange={setHolidayModalOpen}>
        <DialogContent className="sm:max-w-md bg-[#111513] border border-white/[0.08] text-white rounded-2xl">
          <DialogHeader>
            <DialogTitle className="text-base font-semibold">
              Tatil Günü Tanımla
            </DialogTitle>
            <DialogDescription className="text-xs text-zinc-400">
              Resmi tatil veya genel fabrika kapalı gününü takvime ekleyin.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 py-2">
            <div className="space-y-1">
              <Label className="text-xs text-zinc-300">Çalışma Takvimi *</Label>
              <Select
                value={holidayForm.calendarId}
                onValueChange={(v) => setHolidayForm({ ...holidayForm, calendarId: v })}
              >
                <SelectTrigger className="text-xs bg-white/[0.03] border-white/[0.08] text-white rounded-xl h-9">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-[#111513] border border-white/[0.08] text-white">
                  {calendars.map((c: any) => (
                    <SelectItem key={c.id} value={c.id} className="text-xs">
                      {c.code} — {c.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label className="text-xs text-zinc-300">Tatil Tarihi *</Label>
              <Input
                type="date"
                value={holidayForm.holidayDate}
                onChange={(e) =>
                  setHolidayForm({ ...holidayForm, holidayDate: e.target.value })
                }
                className="text-xs bg-white/[0.03] border-white/[0.08] text-white rounded-xl h-9"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs text-zinc-300">Tatil Adı / Açıklama *</Label>
              <Input
                value={holidayForm.name}
                onChange={(e) => setHolidayForm({ ...holidayForm, name: e.target.value })}
                placeholder="Örn: 29 Ekim Cumhuriyet Bayramı"
                className="text-xs bg-white/[0.03] border-white/[0.08] text-white rounded-xl h-9"
              />
            </div>
            <div className="flex items-center justify-between pt-1">
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="hol-half"
                  checked={holidayForm.isHalfDay}
                  onCheckedChange={(c) =>
                    setHolidayForm({ ...holidayForm, isHalfDay: Boolean(c) })
                  }
                />
                <Label htmlFor="hol-half" className="text-xs text-zinc-300">
                  Yarım Gün Tatil
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="hol-rec"
                  checked={holidayForm.isRecurringYearly}
                  onCheckedChange={(c) =>
                    setHolidayForm({ ...holidayForm, isRecurringYearly: Boolean(c) })
                  }
                />
                <Label htmlFor="hol-rec" className="text-xs text-zinc-300">
                  Her Yıl Tekrarlar
                </Label>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setHolidayModalOpen(false)}
              className="bg-white/[0.04] border-white/[0.08] text-zinc-300 rounded-xl text-xs"
            >
              İptal
            </Button>
            <Button
              size="sm"
              disabled={submitting}
              onClick={() =>
                postMasterDataAction("create_holiday", holidayForm, () =>
                  setHolidayModalOpen(false)
                )
              }
              className="bg-[#34D399] hover:bg-[#34D399]/90 text-[#061811] font-semibold rounded-xl text-xs"
            >
              Tatil Gününü Kaydet
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* MODAL 7: İŞ MERKEZİ BAZLI TAKVİM İSTİSNASI EKLE */}
      <Dialog open={excModalOpen} onOpenChange={setExcModalOpen}>
        <DialogContent className="sm:max-w-lg bg-[#111513] border border-white/[0.08] text-white rounded-2xl">
          <DialogHeader>
            <DialogTitle className="text-base font-semibold">
              İş Merkezi Bazlı Takvim İstisnası Ekle
            </DialogTitle>
            <DialogDescription className="text-xs text-zinc-400">
              Belirli bir istasyon için fazla mesai, planlı duruş veya kısıtlı kapasite istisnası tanımlayın.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 py-2">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs text-zinc-300">Çalışma Takvimi *</Label>
                <Select
                  value={excForm.calendarId}
                  onValueChange={(v) => setExcForm({ ...excForm, calendarId: v })}
                >
                  <SelectTrigger className="text-xs bg-white/[0.03] border-white/[0.08] text-white rounded-xl h-9">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-[#111513] border border-white/[0.08] text-white">
                    {calendars.map((c: any) => (
                      <SelectItem key={c.id} value={c.id} className="text-xs">
                        {c.code} — {c.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label className="text-xs text-zinc-300">İş Merkezi / İstasyon *</Label>
                <Select
                  value={excForm.workCenterId}
                  onValueChange={(v) => setExcForm({ ...excForm, workCenterId: v })}
                >
                  <SelectTrigger className="text-xs bg-white/[0.03] border-white/[0.08] text-white rounded-xl h-9">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-[#111513] border border-white/[0.08] text-white">
                    {workCenters.map((wc: any) => (
                      <SelectItem key={wc.id} value={wc.id} className="text-xs">
                        {wc.code} — {wc.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs text-zinc-300">İstisna Tarihi *</Label>
                <Input
                  type="date"
                  value={excForm.exceptionDate}
                  onChange={(e) =>
                    setExcForm({ ...excForm, exceptionDate: e.target.value })
                  }
                  className="text-xs bg-white/[0.03] border-white/[0.08] text-white rounded-xl h-9"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs text-zinc-300">İstisna Tipi *</Label>
                <Select
                  value={excForm.exceptionType}
                  onValueChange={(v) =>
                    setExcForm({
                      ...excForm,
                      exceptionType: v as CalendarExceptionType,
                      availableHours: v === "CLOSED" ? "0" : "4",
                      capacityPercent: v === "CLOSED" ? "0" : "100",
                    })
                  }
                >
                  <SelectTrigger className="text-xs bg-white/[0.03] border-white/[0.08] text-white rounded-xl h-9">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-[#111513] border border-white/[0.08] text-white">
                    {(
                      Object.entries(CALENDAR_EXCEPTION_TYPE_LABELS) as [
                        CalendarExceptionType,
                        string,
                      ][]
                    ).map(([code, label]) => (
                      <SelectItem key={code} value={code} className="text-xs">
                        {label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {excForm.exceptionType !== "CLOSED" && (
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label className="text-xs text-zinc-300">Kullanılabilir Saat</Label>
                  <Input
                    type="number"
                    min="0"
                    step="0.5"
                    value={excForm.availableHours}
                    onChange={(e) =>
                      setExcForm({ ...excForm, availableHours: e.target.value })
                    }
                    className="text-xs font-mono bg-white/[0.03] border-white/[0.08] text-white rounded-xl h-9"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs text-zinc-300">Kapasite Çarpanı (%)</Label>
                  <Input
                    type="number"
                    min="0"
                    max="200"
                    value={excForm.capacityPercent}
                    onChange={(e) =>
                      setExcForm({ ...excForm, capacityPercent: e.target.value })
                    }
                    className="text-xs font-mono bg-white/[0.03] border-white/[0.08] text-white rounded-xl h-9"
                  />
                </div>
              </div>
            )}

            <div className="space-y-1">
              <Label className="text-xs text-zinc-300">Açıklama / Neden</Label>
              <Input
                value={excForm.reason}
                onChange={(e) => setExcForm({ ...excForm, reason: e.target.value })}
                placeholder="Örn: Sevgililer Günü Yoğunluğu +4 Saat Fazla Mesai"
                className="text-xs bg-white/[0.03] border-white/[0.08] text-white rounded-xl h-9"
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setExcModalOpen(false)}
              className="bg-white/[0.04] border-white/[0.08] text-zinc-300 rounded-xl text-xs"
            >
              İptal
            </Button>
            <Button
              size="sm"
              disabled={submitting}
              onClick={() =>
                postMasterDataAction("create_exception", excForm, () =>
                  setExcModalOpen(false)
                )
              }
              className="bg-[#34D399] hover:bg-[#34D399]/90 text-[#061811] font-semibold rounded-xl text-xs"
            >
              İstisnayı Kaydet
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* MODAL 8: STOK KARTI 1-1 ÜRETİM PROFİLİ DÜZENLEME */}
      <Dialog
        open={Boolean(selectedProfileItem)}
        onOpenChange={(o) => !o && setSelectedProfileItem(null)}
      >
        <DialogContent className="sm:max-w-xl bg-[#111513] border border-white/[0.08] text-white rounded-2xl">
          <DialogHeader>
            <DialogTitle className="text-base font-semibold">
              {selectedProfileItem?.name} ({selectedProfileItem?.sku})
            </DialogTitle>
            <DialogDescription className="text-xs text-zinc-400">
              Stok kartı 1-1 üretim profili (`UretimItemProfile`) ayarları
            </DialogDescription>
          </DialogHeader>
          {selectedProfileItem && (
            <ItemProductionProfileTab
              itemId={selectedProfileItem.itemId}
              itemName={selectedProfileItem.name}
              baseUnit={selectedProfileItem.baseUnit}
            />
          )}
        </DialogContent>
      </Dialog>

      {/* DETAY ÇEKMECESİ: İŞ MERKEZİ DETAYI */}
      <Sheet
        open={Boolean(selectedWcDrawer)}
        onOpenChange={(o) => !o && setSelectedWcDrawer(null)}
      >
        <SheetContent
          side="right"
          className="w-full sm:max-w-lg bg-[#111513] border-l border-white/[0.08] text-white p-6 overflow-y-auto space-y-5"
        >
          {selectedWcDrawer && (
            <>
              <SheetHeader className="text-left space-y-1">
                <div className="flex items-center gap-2">
                  <span className="font-mono text-xs bg-emerald-500/10 text-emerald-300 border border-emerald-500/20 px-2.5 py-0.5 rounded-md">
                    {selectedWcDrawer.code}
                  </span>
                  <span className="text-xs text-zinc-400">
                    {WORK_CENTER_TYPE_LABELS[
                      selectedWcDrawer.type as WorkCenterType
                    ] || selectedWcDrawer.type}
                  </span>
                </div>
                <SheetTitle className="text-lg font-semibold text-white">
                  {selectedWcDrawer.name}
                </SheetTitle>
                <SheetDescription className="text-xs text-zinc-400">
                  Alternatif Grup: {selectedWcDrawer.alternativeGroupCode || "Tanımsız"}
                </SheetDescription>
              </SheetHeader>

              <div className="grid grid-cols-3 gap-2.5">
                <div className="p-3 rounded-xl bg-white/[0.03] border border-white/[0.06]">
                  <span className="text-[10px] text-zinc-400 uppercase block">
                    Efektif Saatlik
                  </span>
                  <span className="text-sm font-semibold text-[#34D399] font-mono mt-0.5 block">
                    {selectedWcDrawer.capacityMetrics?.effectiveUnitsPerHour} adet/sa
                  </span>
                </div>
                <div className="p-3 rounded-xl bg-white/[0.03] border border-white/[0.06]">
                  <span className="text-[10px] text-zinc-400 uppercase block">
                    Günlük Kapasite
                  </span>
                  <span className="text-sm font-semibold text-white font-mono mt-0.5 block">
                    {selectedWcDrawer.capacityMetrics?.effectiveDailyCapacityUnits} adet
                  </span>
                </div>
                <div className="p-3 rounded-xl bg-white/[0.03] border border-white/[0.06]">
                  <span className="text-[10px] text-zinc-400 uppercase block">
                    Saatlik Maliyet
                  </span>
                  <span className="text-sm font-semibold text-white font-mono mt-0.5 block">
                    {formatCurrency(selectedWcDrawer.hourlyCost)}
                  </span>
                </div>
              </div>

              <div className="space-y-2">
                <h4 className="text-xs font-semibold uppercase tracking-wider text-zinc-400">
                  Bağlı Makine ve Ekipmanlar ({(selectedWcDrawer.machines || []).length})
                </h4>
                {(selectedWcDrawer.machines || []).length === 0 ? (
                  <div className="p-4 rounded-xl border border-dashed border-white/[0.08] text-xs text-zinc-500 text-center">
                    Bu iş merkezine bağlı makine/ekipman bulunmuyor.
                  </div>
                ) : (
                  <div className="space-y-2">
                    {selectedWcDrawer.machines.map((m: any) => (
                      <div
                        key={m.id}
                        className="p-3 rounded-xl bg-white/[0.03] border border-white/[0.06] flex items-center justify-between text-xs"
                      >
                        <div>
                          <span className="font-mono text-cyan-300 font-semibold">
                            {m.code}
                          </span>{" "}
                          <span className="text-white font-medium">{m.name}</span>
                          <span className="block text-[11px] text-zinc-400 font-mono">
                            SN: {m.serialNumber} · {m.operatingHours} saat / {m.productionCount} adet
                          </span>
                        </div>
                        <span className="badge-positive text-[10px] px-2 py-0.5 rounded-full">
                          {MACHINE_STATUS_LABELS[m.status as MachineStatus] || m.status}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>
    </div>
  )
}
