"use client"

import React, { useState, useEffect, useCallback, useMemo } from "react"
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
  GitBranch,
  Layers,
  ArrowRight,
  Plus,
  Search,
  RefreshCw,
  Edit3,
  Trash2,
  CheckCircle2,
  Copy,
  Download,
  Upload,
  AlertTriangle,
  FolderTree,
  Coins,
  Cpu,
  Clock,
  ExternalLink,
  ChevronRight,
  ChevronDown,
  X,
  FileSpreadsheet,
  ShieldCheck,
  Zap,
} from "lucide-react"
import { useAuth } from "@/lib/auth/context"
import type {
  BomHeaderRecord,
  BomComponentRecord,
  RoutingHeaderRecord,
  RoutingOperationRecord,
  ExplodeBomResult,
  WhereUsedResultItem,
  BomRevisionDiffResult,
} from "@/lib/services/productionBomRotaEngine"

export type BomTabKey = "boms" | "routings" | "where_used" | "compare"

export function ProductionBomWorkspace({
  initialTab = "boms",
}: {
  initialTab?: BomTabKey
}) {
  const { currentBranch, hasPermission } = useAuth()
  const [activeTab, setActiveTab] = useState<BomTabKey>(initialTab)

  // Reçete Listesi Durumları
  const [boms, setBoms] = useState<BomHeaderRecord[]>([])
  const [bomsLoading, setBomsLoading] = useState(false)
  const [bomsPage, setBomsPage] = useState(1)
  const [bomsTotalPages, setBomsTotalPages] = useState(1)
  const [bomsTotalCount, setBomsTotalCount] = useState(0)
  const [bomsSearch, setBomsSearch] = useState("")
  const [bomsStatusFilter, setBomsStatusFilter] = useState("ALL")
  const [bomsPhantomFilter, setBomsPhantomFilter] = useState("")

  // Rotalar Durumu
  const [routings, setRoutings] = useState<RoutingHeaderRecord[]>([])
  const [routingsLoading, setRoutingsLoading] = useState(false)
  const [routingsSearch, setRoutingsSearch] = useState("")

  // Stok Kartları ve İş Merkezleri Seçim Listesi (Lookups)
  const [inventoryItems, setInventoryItems] = useState<any[]>([])
  const [workCenters, setWorkCenters] = useState<any[]>([])

  // Reçete Detay / Ağaç Çekmecesi (Drawer)
  const [selectedBom, setSelectedBom] = useState<BomHeaderRecord | null>(null)
  const [bomDrawerOpen, setBomDrawerOpen] = useState(false)
  const [selectedBomTab, setSelectedBomTab] = useState<"components" | "tree" | "exploded" | "cost">("components")

  // Çok Seviyeli Patlatma Simülasyonu
  const [explodedData, setExplodedData] = useState<ExplodeBomResult | null>(null)
  const [explodedLoading, setExplodedLoading] = useState(false)
  const [simQty, setSimQty] = useState(1)

  // Nerede Kullanılıyor (Where-Used) Durumları
  const [whereUsedItemId, setWhereUsedItemId] = useState("")
  const [whereUsedResults, setWhereUsedResults] = useState<WhereUsedResultItem[]>([])
  const [whereUsedLoading, setWhereUsedLoading] = useState(false)

  // Revizyon Karşılaştırma (Diff)
  const [compareBomA, setCompareBomA] = useState("")
  const [compareBomB, setCompareBomB] = useState("")
  const [compareDiff, setCompareDiff] = useState<BomRevisionDiffResult | null>(null)
  const [compareLoading, setCompareLoading] = useState(false)

  // Modallar
  const [createBomModalOpen, setCreateBomModalOpen] = useState(false)
  const [newBomForm, setNewBomForm] = useState({
    code: "",
    name: "",
    revision: "01",
    finishedItemId: "",
    baseQuantity: 1,
    baseUnit: "Adet",
    isPhantom: false,
    yieldPercent: 100,
    notes: "",
  })

  const [addComponentModalOpen, setAddComponentModalOpen] = useState(false)
  const [newCompForm, setNewCompForm] = useState({
    componentItemId: "",
    lineNumber: 10,
    quantity: 1,
    unit: "Adet",
    scrapPercent: 0,
    isPhantom: false,
    operationSequence: "",
    notes: "",
  })

  const [addSubstituteModalOpen, setAddSubstituteModalOpen] = useState(false)
  const [targetBomItemId, setTargetBomItemId] = useState("")
  const [newSubForm, setNewSubForm] = useState({
    substituteItemId: "",
    priority: 1,
    substitutionRatio: 1.0,
    isMandatoryApproval: false,
    notes: "",
  })

  const [cloneBomModalOpen, setCloneBomModalOpen] = useState(false)
  const [cloneTargetBom, setCloneTargetBom] = useState<BomHeaderRecord | null>(null)
  const [cloneNewRevision, setCloneNewRevision] = useState("02")
  const [cloneNewCode, setCloneNewCode] = useState("")

  const [createRoutingModalOpen, setCreateRoutingModalOpen] = useState(false)
  const [newRoutingForm, setNewRoutingForm] = useState({
    code: "",
    name: "",
    finishedItemId: "",
    bomId: "",
    revision: "01",
    notes: "",
  })

  const [addOpModalOpen, setAddOpModalOpen] = useState(false)
  const [targetRoutingId, setTargetRoutingId] = useState("")
  const [newOpForm, setNewOpForm] = useState({
    operationNumber: 10,
    name: "",
    description: "",
    workCenterId: "",
    setupTimeMinutes: 15,
    runTimeMinutes: 5,
    workerCount: 1,
    isSubcontracted: false,
    subcontractorName: "",
    subcontractUnitCost: 0,
    isQualityControlPoint: false,
  })

  const [importModalOpen, setImportModalOpen] = useState(false)
  const [csvText, setCsvText] = useState("")
  const [importReport, setImportReport] = useState<any | null>(null)
  const [importSubmitting, setImportSubmitting] = useState(false)

  // Para formatlayıcı
  const formatCurrency = (val: number) =>
    new Intl.NumberFormat("tr-TR", {
      style: "currency",
      currency: "TRY",
      maximumFractionDigits: 2,
    }).format(val || 0)

  // 1. Reçeteleri Yükle
  const fetchBoms = useCallback(async () => {
    setBomsLoading(true)
    try {
      const bq = currentBranch?.id ? `&branchId=${encodeURIComponent(currentBranch.id)}` : ""
      const sq = bomsSearch ? `&search=${encodeURIComponent(bomsSearch)}` : ""
      const stq = bomsStatusFilter !== "ALL" ? `&status=${encodeURIComponent(bomsStatusFilter)}` : ""
      const pq = bomsPhantomFilter !== "" ? `&isPhantom=${encodeURIComponent(bomsPhantomFilter)}` : ""
      const res = await fetch(
        `/api/production/bom-rota?section=boms&page=${bomsPage}&pageSize=15${bq}${sq}${stq}${pq}`
      )
      const data = await res.json()
      if (data.success) {
        setBoms(data.items || [])
        setBomsTotalPages(data.pagination?.totalPages || 1)
        setBomsTotalCount(data.pagination?.totalCount || 0)
      } else {
        toast.error(data.error || "Reçeteler alınamadı.")
      }
    } catch (err) {
      console.error(err)
      toast.error("Reçete listesi yüklenirken bağlantı hatası oluştu.")
    } finally {
      setBomsLoading(false)
    }
  }, [currentBranch?.id, bomsPage, bomsSearch, bomsStatusFilter, bomsPhantomFilter])

  // 2. Rotaları Yükle
  const fetchRoutings = useCallback(async () => {
    setRoutingsLoading(true)
    try {
      const bq = currentBranch?.id ? `&branchId=${encodeURIComponent(currentBranch.id)}` : ""
      const sq = routingsSearch ? `&search=${encodeURIComponent(routingsSearch)}` : ""
      const res = await fetch(`/api/production/bom-rota?section=routings${bq}${sq}`)
      const data = await res.json()
      if (data.success) {
        setRoutings(data.items || [])
      }
    } catch (err) {
      console.error(err)
    } finally {
      setRoutingsLoading(false)
    }
  }, [currentBranch?.id, routingsSearch])

  // 3. Stok Kartları & İş Merkezleri Lookups
  const fetchLookups = useCallback(async () => {
    try {
      const bq = currentBranch?.id ? `&branchId=${encodeURIComponent(currentBranch.id)}` : ""
      const [resItems, resWc] = await Promise.all([
        fetch(`/api/inventory?section=items&pageSize=500${bq}`).then((r) => r.json()),
        fetch(`/api/production/master-data?section=work_centers&pageSize=100${bq}`).then((r) => r.json()),
      ])
      if (resItems.success) setInventoryItems(resItems.items || [])
      if (resWc.success) setWorkCenters(resWc.items || [])
    } catch (err) {
      console.error("Lookups yüklenemedi:", err)
    }
  }, [currentBranch?.id])

  useEffect(() => {
    fetchBoms()
    fetchRoutings()
    fetchLookups()
  }, [fetchBoms, fetchRoutings, fetchLookups])

  // Tekil Reçete Detayı Yenile
  const refreshSelectedBom = async (bomId: string) => {
    try {
      const res = await fetch(`/api/production/bom-rota?section=bom_detail&id=${encodeURIComponent(bomId)}`)
      const data = await res.json()
      if (data.success && data.bom) {
        setSelectedBom(data.bom)
      }
    } catch (err) {
      console.error(err)
    }
  }

  // Çok Seviyeli Patlatma Yükle
  const loadExplodedBom = async (bomId: string, qty: number) => {
    setExplodedLoading(true)
    try {
      const res = await fetch(
        `/api/production/bom-rota?section=exploded&id=${encodeURIComponent(bomId)}&quantity=${qty}`
      )
      const data = await res.json()
      if (data.success) {
        setExplodedData(data)
      } else {
        toast.error(data.error || "Ağaç patlatılamadı.")
      }
    } catch (err) {
      console.error(err)
    } finally {
      setExplodedLoading(false)
    }
  }

  // Nerede Kullanılıyor (Where-Used) Çalıştır
  const handleRunWhereUsed = async () => {
    if (!whereUsedItemId) {
      toast.warning("Lütfen bir hammadde veya yarı mamul seçin.")
      return
    }
    setWhereUsedLoading(true)
    try {
      const res = await fetch(
        `/api/production/bom-rota?section=where_used&itemId=${encodeURIComponent(whereUsedItemId)}`
      )
      const data = await res.json()
      if (data.success) {
        setWhereUsedResults(data.whereUsed || [])
      } else {
        toast.error(data.error || "Where-used sorgusu başarısız.")
      }
    } catch (err) {
      console.error(err)
      toast.error("Sorgulama hatası.")
    } finally {
      setWhereUsedLoading(false)
    }
  }

  // Revizyon Karşılaştırma Çalıştır
  const handleRunCompare = async () => {
    if (!compareBomA || !compareBomB) {
      toast.warning("Lütfen karşılaştırmak için iki farklı reçete seçin.")
      return
    }
    setCompareLoading(true)
    try {
      const res = await fetch(
        `/api/production/bom-rota?section=compare&bomIdA=${encodeURIComponent(compareBomA)}&bomIdB=${encodeURIComponent(compareBomB)}`
      )
      const data = await res.json()
      if (data.success) {
        setCompareDiff(data.diff)
      } else {
        toast.error(data.error || "Karşılaştırma yapılamadı.")
      }
    } catch (err) {
      console.error(err)
    } finally {
      setCompareLoading(false)
    }
  }

  // Yeni Reçete Oluştur
  const handleCreateBom = async () => {
    if (!newBomForm.code || !newBomForm.name || !newBomForm.finishedItemId) {
      toast.error("Lütfen zorunlu alanları doldurun (Kod, Ad, Mamul).")
      return
    }
    try {
      const res = await fetch("/api/production/bom-rota", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "create_bom",
          payload: {
            ...newBomForm,
            branchId: currentBranch?.id || null,
          },
        }),
      })
      const data = await res.json()
      if (data.success) {
        toast.success(data.message || "Reçete oluşturuldu.")
        setCreateBomModalOpen(false)
        fetchBoms()
        if (data.bom) {
          setSelectedBom(data.bom)
          setBomDrawerOpen(true)
        }
      } else {
        toast.error(data.error || "Reçete oluşturulamadı.")
      }
    } catch (err) {
      console.error(err)
      toast.error("İşlem sırasında hata oluştu.")
    }
  }

  // Reçete Onayla
  const handleApproveBom = async (bomId: string) => {
    try {
      const res = await fetch("/api/production/bom-rota", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "approve_bom", id: bomId }),
      })
      const data = await res.json()
      if (data.success) {
        toast.success(data.message || "Reçete onaylandı.")
        fetchBoms()
        if (selectedBom && selectedBom.id === bomId) {
          refreshSelectedBom(bomId)
        }
      } else {
        toast.error(data.error || "Onaylama başarısız.")
      }
    } catch (err) {
      console.error(err)
      toast.error("Onaylama sırasında hata oluştu.")
    }
  }

  // Kopyala ve Değiştir (Yeni Revizyon Klonlama)
  const handleCloneBom = async () => {
    if (!cloneTargetBom) return
    try {
      const res = await fetch("/api/production/bom-rota", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "clone_bom",
          payload: {
            sourceBomId: cloneTargetBom.id,
            newRevision: cloneNewRevision,
            newCode: cloneNewCode || undefined,
          },
        }),
      })
      const data = await res.json()
      if (data.success) {
        toast.success(data.message || "Yeni revizyon başarıyla oluşturuldu.")
        setCloneBomModalOpen(false)
        fetchBoms()
        if (data.bom) {
          setSelectedBom(data.bom)
          setBomDrawerOpen(true)
        }
      } else {
        toast.error(data.error || "Klonlama başarısız.")
      }
    } catch (err) {
      console.error(err)
      toast.error("Klonlama işlemi başarısız.")
    }
  }

  // Reçete Sil
  const handleDeleteBom = async (bom: BomHeaderRecord) => {
    if (!confirm(`"${bom.code} - ${bom.name}" reçetesini silmek istediğinize emin misiniz?`)) return
    try {
      const res = await fetch("/api/production/bom-rota", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "delete_bom", id: bom.id }),
      })
      const data = await res.json()
      if (data.success) {
        toast.success(data.message || "Reçete silindi.")
        fetchBoms()
        if (selectedBom?.id === bom.id) setBomDrawerOpen(false)
      } else {
        toast.error(data.error || "Silinemedi.")
      }
    } catch (err) {
      console.error(err)
      toast.error("Silme işleminde hata.")
    }
  }

  // Bileşen Ekle
  const handleAddComponent = async () => {
    if (!selectedBom || !newCompForm.componentItemId) {
      toast.error("Lütfen bir bileşen malzeme seçin.")
      return
    }
    try {
      const res = await fetch("/api/production/bom-rota", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "add_bom_item",
          payload: {
            bomId: selectedBom.id,
            ...newCompForm,
            operationSequence: newCompForm.operationSequence ? Number(newCompForm.operationSequence) : undefined,
          },
        }),
      })
      const data = await res.json()
      if (data.success) {
        toast.success(data.message || "Bileşen eklendi.")
        setAddComponentModalOpen(false)
        refreshSelectedBom(selectedBom.id)
        fetchBoms()
      } else {
        toast.error(data.error || "Bileşen eklenemedi.")
      }
    } catch (err) {
      console.error(err)
      toast.error("Bileşen ekleme hatası.")
    }
  }

  // Bileşen Sil
  const handleDeleteComponent = async (itemId: string) => {
    if (!selectedBom) return
    try {
      const res = await fetch("/api/production/bom-rota", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "delete_bom_item", id: itemId }),
      })
      const data = await res.json()
      if (data.success) {
        toast.success(data.message || "Bileşen çıkarıldı.")
        refreshSelectedBom(selectedBom.id)
        fetchBoms()
      } else {
        toast.error(data.error || "Bileşen çıkarılamadı.")
      }
    } catch (err) {
      console.error(err)
    }
  }

  // İkame Malzeme Ekle
  const handleAddSubstitute = async () => {
    if (!targetBomItemId || !newSubForm.substituteItemId) {
      toast.error("Lütfen ikame malzemeyi seçin.")
      return
    }
    try {
      const res = await fetch("/api/production/bom-rota", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "add_substitute",
          payload: {
            bomItemId: targetBomItemId,
            ...newSubForm,
          },
        }),
      })
      const data = await res.json()
      if (data.success) {
        toast.success(data.message || "İkame malzeme eklendi.")
        setAddSubstituteModalOpen(false)
        if (selectedBom) refreshSelectedBom(selectedBom.id)
      } else {
        toast.error(data.error || "İkame malzeme eklenemedi.")
      }
    } catch (err) {
      console.error(err)
      toast.error("İkame ekleme hatası.")
    }
  }

  // İkame Sil
  const handleDeleteSubstitute = async (subId: string) => {
    try {
      const res = await fetch("/api/production/bom-rota", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "delete_substitute", id: subId }),
      })
      const data = await res.json()
      if (data.success) {
        toast.success(data.message || "İkame silindi.")
        if (selectedBom) refreshSelectedBom(selectedBom.id)
      }
    } catch (err) {
      console.error(err)
    }
  }

  // Maliyeti Canlı Yeniden Hesapla
  const handleRecalculateCost = async (bomId: string) => {
    try {
      const res = await fetch("/api/production/bom-rota", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "recalculate_cost", bomId }),
      })
      const data = await res.json()
      if (data.success) {
        toast.success("Birim maliyet başarıyla güncellendi.")
        refreshSelectedBom(bomId)
        fetchBoms()
      } else {
        toast.error(data.error || "Maliyet hesaplanamadı.")
      }
    } catch (err) {
      console.error(err)
    }
  }

  // CSV İçe Aktarma Doğrula veya Kaydet
  const handleImportCsv = async (dryRun: boolean) => {
    if (!csvText.trim()) {
      toast.warning("Lütfen CSV metni yapıştırın.")
      return
    }
    setImportSubmitting(true)
    try {
      const res = await fetch("/api/production/bom-rota", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "import_csv",
          payload: { csvContent: csvText, dryRun },
        }),
      })
      const data = await res.json()
      setImportReport(data.report || null)
      if (data.success) {
        toast.success(data.message || "İçe aktarma başarılı.")
        if (!dryRun) {
          fetchBoms()
          setImportModalOpen(false)
        }
      } else {
        toast.error(data.error || data.message || "Doğrulama hataları tespit edildi.")
      }
    } catch (err) {
      console.error(err)
      toast.error("İçe aktarma hatası.")
    } finally {
      setImportSubmitting(false)
    }
  }

  // Statü Rozeti Rengi
  const renderStatusBadge = (status: string) => {
    switch (status) {
      case "APPROVED":
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium bg-emerald-500/15 text-emerald-300 border border-emerald-500/30">
            <CheckCircle2 className="w-3 h-3" />
            ONAYLI
          </span>
        )
      case "DRAFT":
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium bg-amber-500/15 text-amber-300 border border-amber-500/30">
            <Edit3 className="w-3 h-3" />
            TASLAK
          </span>
        )
      case "OBSOLETE":
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium bg-zinc-700/40 text-zinc-400 border border-zinc-700">
            PASİF
          </span>
        )
      default:
        return <span>{status}</span>
    }
  }

  return (
    <div className="space-y-6">
      {/* ── Üst Sekmeler ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/[0.08] pb-3">
        <div className="flex items-center gap-2 overflow-x-auto no-scrollbar">
          <Button
            variant={activeTab === "boms" ? "default" : "outline"}
            size="sm"
            onClick={() => setActiveTab("boms")}
            className="gap-2"
          >
            <GitBranch className="w-4 h-4 text-emerald-400" />
            Ürün Reçeteleri (BOM)
          </Button>

          <Button
            variant={activeTab === "routings" ? "default" : "outline"}
            size="sm"
            onClick={() => setActiveTab("routings")}
            className="gap-2"
          >
            <Cpu className="w-4 h-4 text-sky-400" />
            Operasyon Rotaları
          </Button>

          <Button
            variant={activeTab === "where_used" ? "default" : "outline"}
            size="sm"
            onClick={() => setActiveTab("where_used")}
            className="gap-2"
          >
            <FolderTree className="w-4 h-4 text-violet-400" />
            Nerede Kullanılıyor?
          </Button>

          <Button
            variant={activeTab === "compare" ? "default" : "outline"}
            size="sm"
            onClick={() => setActiveTab("compare")}
            className="gap-2"
          >
            <Layers className="w-4 h-4 text-amber-400" />
            Revizyon Karşılaştır
          </Button>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              window.open("/api/production/bom-rota?section=export_csv", "_blank")
            }}
            className="gap-1.5 text-xs text-zinc-300"
          >
            <Download className="w-3.5 h-3.5 text-emerald-400" />
            Excel/CSV İndir
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              setCsvText("")
              setImportReport(null)
              setImportModalOpen(true)
            }}
            className="gap-1.5 text-xs text-zinc-300"
          >
            <Upload className="w-3.5 h-3.5 text-sky-400" />
            CSV İçe Aktar
          </Button>

          <Button
            size="sm"
            onClick={() => {
              setNewBomForm({
                code: `BOM-${Date.now().toString().slice(-6)}`,
                name: "",
                revision: "01",
                finishedItemId: "",
                baseQuantity: 1,
                baseUnit: "Adet",
                isPhantom: false,
                yieldPercent: 100,
                notes: "",
              })
              setCreateBomModalOpen(true)
            }}
            className="gap-1.5 text-xs bg-emerald-500 hover:bg-emerald-600 text-zinc-950 font-semibold"
          >
            <Plus className="w-4 h-4" />
            Yeni Reçete
          </Button>
        </div>
      </div>

      {/* ── 1. BÖLÜM: REÇETE LİSTESİ (BOM HEADERS) ── */}
      {activeTab === "boms" && (
        <div className="space-y-4">
          {/* Filtre ve Arama Çubuğu */}
          <div className="p-4 rounded-xl bg-zinc-900/60 border border-white/[0.06] flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3 flex-1 min-w-[280px]">
              <div className="relative flex-1 max-w-md">
                <Search className="absolute left-3 top-2.5 w-4 h-4 text-zinc-500" />
                <Input
                  value={bomsSearch}
                  onChange={(e) => setBomsSearch(e.target.value)}
                  placeholder="Reçete kodu, reçete adı veya mamul ara..."
                  className="pl-9 h-9 bg-zinc-950/60 border-white/[0.08] text-xs"
                />
              </div>

              <Select value={bomsStatusFilter} onValueChange={(val) => setBomsStatusFilter(val)}>
                <SelectTrigger className="w-36 h-9 bg-zinc-950/60 border-white/[0.08] text-xs">
                  <SelectValue placeholder="Statü" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">Tüm Statüler</SelectItem>
                  <SelectItem value="DRAFT">Taslak</SelectItem>
                  <SelectItem value="APPROVED">Onaylı</SelectItem>
                  <SelectItem value="OBSOLETE">Pasif</SelectItem>
                </SelectContent>
              </Select>

              <Select value={bomsPhantomFilter} onValueChange={(val) => setBomsPhantomFilter(val)}>
                <SelectTrigger className="w-36 h-9 bg-zinc-950/60 border-white/[0.08] text-xs">
                  <SelectValue placeholder="Reçete Tipi" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">Tüm Tipler</SelectItem>
                  <SelectItem value="false">Standart Mamul</SelectItem>
                  <SelectItem value="true">Hayalet (Phantom)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={fetchBoms}
                disabled={bomsLoading}
                className="h-9 px-3 text-xs text-zinc-400 hover:text-white"
              >
                <RefreshCw className={`w-3.5 h-3.5 mr-1.5 ${bomsLoading ? "animate-spin" : ""}`} />
                Yenile
              </Button>
            </div>
          </div>

          {/* Reçeteler Tablosu */}
          <div className="rounded-xl border border-white/[0.08] overflow-hidden bg-zinc-950/40">
            <Table>
              <TableHeader className="bg-zinc-900/60">
                <TableRow className="border-white/[0.08]">
                  <TableHead className="text-zinc-400 font-medium text-xs">Reçete Kodu</TableHead>
                  <TableHead className="text-zinc-400 font-medium text-xs">Reçete Adı</TableHead>
                  <TableHead className="text-zinc-400 font-medium text-xs">Mamul Kartı</TableHead>
                  <TableHead className="text-zinc-400 font-medium text-xs text-center">Rev</TableHead>
                  <TableHead className="text-zinc-400 font-medium text-xs text-center">Statü</TableHead>
                  <TableHead className="text-zinc-400 font-medium text-xs text-right">Temel Miktar</TableHead>
                  <TableHead className="text-zinc-400 font-medium text-xs text-right">Teorik Birim Maliyet</TableHead>
                  <TableHead className="text-zinc-400 font-medium text-xs text-center">Bileşen Sayısı</TableHead>
                  <TableHead className="text-zinc-400 font-medium text-xs text-right">Aksiyonlar</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {bomsLoading ? (
                  <TableRow>
                    <TableCell colSpan={9} className="text-center py-12 text-zinc-500 text-xs">
                      Reçeteler yükleniyor...
                    </TableCell>
                  </TableRow>
                ) : boms.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={9} className="text-center py-12 text-zinc-500 text-xs">
                      Tanımlı ürün reçetesi bulunamadı. "Yeni Reçete" butonu ile oluşturabilirsiniz.
                    </TableCell>
                  </TableRow>
                ) : (
                  boms.map((bom) => (
                    <TableRow key={bom.id} className="border-white/[0.05] hover:bg-white/[0.02] transition-colors">
                      <TableCell className="font-mono text-xs font-semibold text-emerald-400">
                        {bom.code}
                        {bom.isPhantom && (
                          <span className="ml-2 px-1.5 py-0.5 rounded text-[10px] font-mono bg-purple-500/20 text-purple-300 border border-purple-500/30">
                            PHANTOM
                          </span>
                        )}
                      </TableCell>
                      <TableCell className="text-xs font-medium text-zinc-200">{bom.name}</TableCell>
                      <TableCell className="text-xs text-zinc-400">
                        <div className="font-mono text-[11px] text-zinc-500">{bom.finishedItemCode}</div>
                        <div>{bom.finishedItemName}</div>
                      </TableCell>
                      <TableCell className="text-center font-mono text-xs text-zinc-400">{bom.revision}</TableCell>
                      <TableCell className="text-center">{renderStatusBadge(bom.status)}</TableCell>
                      <TableCell className="text-right text-xs font-mono text-zinc-300">
                        {bom.baseQuantity} {bom.baseUnit}
                      </TableCell>
                      <TableCell className="text-right text-xs font-mono font-medium text-emerald-400">
                        {bom.totalTheoreticalCost > 0
                          ? formatCurrency(bom.totalTheoreticalCost / (bom.baseQuantity || 1))
                          : "—"}
                      </TableCell>
                      <TableCell className="text-center text-xs font-mono text-zinc-400">
                        {bom.components?.length || 0}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              setSelectedBom(bom)
                              setBomDrawerOpen(true)
                            }}
                            className="h-7 px-2 text-xs text-emerald-400 hover:text-emerald-300 hover:bg-emerald-500/10"
                          >
                            Detay / Ağaç
                          </Button>

                          {bom.status === "DRAFT" && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleApproveBom(bom.id)}
                              className="h-7 px-2 text-xs text-sky-400 hover:text-sky-300 hover:bg-sky-500/10"
                              title="Reçeteyi onayla"
                            >
                              Onayla
                            </Button>
                          )}

                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              setCloneTargetBom(bom)
                              const nextRev = String(parseInt(bom.revision, 10) + 1).padStart(2, "0")
                              setCloneNewRevision(nextRev)
                              setCloneNewCode(`${bom.code}-R${nextRev}`)
                              setCloneBomModalOpen(true)
                            }}
                            className="h-7 px-2 text-xs text-amber-400 hover:text-amber-300 hover:bg-amber-500/10"
                            title="Kopyala & Yeni Revizyon Türet"
                          >
                            <Copy className="w-3 h-3 mr-1" />
                            Klonla
                          </Button>

                          {bom.status !== "APPROVED" && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleDeleteBom(bom)}
                              className="h-7 px-2 text-xs text-rose-400 hover:text-rose-300 hover:bg-rose-500/10"
                            >
                              <Trash2 className="w-3 h-3" />
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>

          {/* Sayfalama Kontrolleri */}
          <div className="flex items-center justify-between text-xs text-zinc-500 pt-2">
            <div>Toplam {bomsTotalCount} reçete listelendi</div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                disabled={bomsPage <= 1 || bomsLoading}
                onClick={() => setBomsPage((p) => Math.max(1, p - 1))}
                className="h-8 text-xs"
              >
                Önceki
              </Button>
              <span className="font-mono px-2">
                {bomsPage} / {bomsTotalPages}
              </span>
              <Button
                variant="outline"
                size="sm"
                disabled={bomsPage >= bomsTotalPages || bomsLoading}
                onClick={() => setBomsPage((p) => p + 1)}
                className="h-8 text-xs"
              >
                Sonraki
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* ── 2. BÖLÜM: OPERASYON ROTALARI LİSTESİ ── */}
      {activeTab === "routings" && (
        <div className="space-y-4">
          <div className="p-4 rounded-xl bg-zinc-900/60 border border-white/[0.06] flex items-center justify-between gap-3">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-2.5 w-4 h-4 text-zinc-500" />
              <Input
                value={routingsSearch}
                onChange={(e) => setRoutingsSearch(e.target.value)}
                placeholder="Rota kodu veya mamul ara..."
                className="pl-9 h-9 bg-zinc-950/60 border-white/[0.08] text-xs"
              />
            </div>
            <Button
              size="sm"
              onClick={() => {
                setNewRoutingForm({
                  code: `ROTA-${Date.now().toString().slice(-6)}`,
                  name: "",
                  finishedItemId: "",
                  bomId: "",
                  revision: "01",
                  notes: "",
                })
                setCreateRoutingModalOpen(true)
              }}
              className="gap-1.5 text-xs bg-sky-500 hover:bg-sky-600 text-zinc-950 font-semibold"
            >
              <Plus className="w-4 h-4" />
              Yeni Rota Tanımla
            </Button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {routingsLoading ? (
              <div className="col-span-full text-center py-12 text-zinc-500 text-xs">Rotalar yükleniyor...</div>
            ) : routings.length === 0 ? (
              <div className="col-span-full text-center py-12 text-zinc-500 text-xs">
                Kayıtlı operasyon rotası bulunamadı.
              </div>
            ) : (
              routings.map((rt) => (
                <div
                  key={rt.id}
                  className="p-4 rounded-xl border border-white/[0.08] bg-zinc-900/40 hover:border-white/[0.15] transition-all space-y-3"
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="font-mono text-xs font-semibold text-sky-400">{rt.code}</div>
                      <div className="text-sm font-medium text-zinc-200 mt-0.5">{rt.name}</div>
                      <div className="text-xs text-zinc-400 font-mono mt-0.5">{rt.finishedItemName}</div>
                    </div>
                    {renderStatusBadge(rt.status)}
                  </div>

                  {/* Operasyon Çizelgesi */}
                  <div className="space-y-1.5 pt-2 border-t border-white/[0.06]">
                    <div className="text-[11px] font-medium text-zinc-400 uppercase tracking-wider">
                      Operasyon Adımları ({rt.operations?.length || 0})
                    </div>
                    {(rt.operations || []).map((op) => (
                      <div
                        key={op.id}
                        className="flex items-center justify-between p-2 rounded-lg bg-zinc-950/60 border border-white/[0.04] text-xs"
                      >
                        <div className="flex items-center gap-2">
                          <span className="w-5 h-5 rounded bg-sky-500/20 text-sky-300 font-mono text-[10px] flex items-center justify-center font-bold">
                            {op.operationNumber}
                          </span>
                          <div>
                            <div className="font-medium text-zinc-200">{op.name}</div>
                            <div className="text-[10px] text-zinc-500 font-mono">{op.workCenterName}</div>
                          </div>
                        </div>

                        <div className="text-right">
                          <div className="font-mono text-[11px] text-zinc-300">
                            {op.runTimeMinutes} dk / {op.workerCount} işçi
                          </div>
                          {op.isQualityControlPoint && (
                            <span className="inline-flex items-center gap-0.5 text-[9px] text-amber-400 font-medium">
                              <ShieldCheck className="w-2.5 h-2.5" /> Kalite Kontrol
                            </span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="pt-2 flex items-center justify-between">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setTargetRoutingId(rt.id)
                        setNewOpForm({
                          operationNumber: ((rt.operations?.length || 0) + 1) * 10,
                          name: "",
                          description: "",
                          workCenterId: workCenters[0]?.id || "",
                          setupTimeMinutes: 15,
                          runTimeMinutes: 5,
                          workerCount: 1,
                          isSubcontracted: false,
                          subcontractorName: "",
                          subcontractUnitCost: 0,
                          isQualityControlPoint: false,
                        })
                        setAddOpModalOpen(true)
                      }}
                      className="h-7 text-xs gap-1"
                    >
                      <Plus className="w-3 h-3" /> Operasyon Ekle
                    </Button>

                    <div className="text-right text-[11px] font-mono text-zinc-400">
                      Toplam Süre: {rt.totalRunTimeMinutes} dk
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* ── 3. BÖLÜM: NEREDE KULLANILIYOR (WHERE-USED) TERS AĞAÇ SORGUSU ── */}
      {activeTab === "where_used" && (
        <div className="space-y-4">
          <div className="p-4 rounded-xl bg-zinc-900/60 border border-white/[0.06] flex flex-col sm:flex-row sm:items-center gap-3">
            <div className="flex-1">
              <Label className="text-xs text-zinc-400 mb-1 block">Sorgulanacak Malzeme (Hammadde / Yarı Mamul)</Label>
              <Select value={whereUsedItemId} onValueChange={(val) => setWhereUsedItemId(val)}>
                <SelectTrigger className="bg-zinc-950/60 border-white/[0.08] text-xs">
                  <SelectValue placeholder="Bir hammadde veya bileşen seçin..." />
                </SelectTrigger>
                <SelectContent className="max-h-60">
                  {inventoryItems.map((it) => (
                    <SelectItem key={it.id} value={it.id}>
                      [{it.sku || it.code}] {it.name} ({it.unit || "Adet"})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="sm:self-end">
              <Button
                onClick={handleRunWhereUsed}
                disabled={whereUsedLoading}
                className="bg-violet-600 hover:bg-violet-700 text-white text-xs h-9 px-4 gap-2"
              >
                <Search className="w-3.5 h-3.5" />
                Ters Ağaç Analizini Başlat
              </Button>
            </div>
          </div>

          {whereUsedResults.length > 0 && (
            <div className="rounded-xl border border-white/[0.08] overflow-hidden bg-zinc-950/40">
              <Table>
                <TableHeader className="bg-zinc-900/60">
                  <TableRow className="border-white/[0.08]">
                    <TableHead className="text-zinc-400 font-medium text-xs">Seviye (Derinlik)</TableHead>
                    <TableHead className="text-zinc-400 font-medium text-xs">Reçete Kodu</TableHead>
                    <TableHead className="text-zinc-400 font-medium text-xs">Üst Mamul / Ürün</TableHead>
                    <TableHead className="text-zinc-400 font-medium text-xs text-right">Kullanılan Miktar</TableHead>
                    <TableHead className="text-zinc-400 font-medium text-xs text-center">İlişki Türü</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {whereUsedResults.map((res, idx) => (
                    <TableRow key={idx} className="border-white/[0.04]">
                      <TableCell className="font-mono text-xs text-violet-400 font-semibold">
                        Seviye {res.level}
                      </TableCell>
                      <TableCell className="font-mono text-xs text-zinc-300 font-medium">
                        {res.bomCode} (Rev {res.revision})
                      </TableCell>
                      <TableCell className="text-xs text-zinc-200">
                        <div className="font-mono text-[11px] text-zinc-500">{res.finishedItemCode}</div>
                        <div>{res.finishedItemName}</div>
                      </TableCell>
                      <TableCell className="text-right font-mono text-xs text-emerald-400 font-medium">
                        {res.quantityUsed} {res.unit}
                      </TableCell>
                      <TableCell className="text-center">
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-mono ${
                            res.isDirect
                              ? "bg-emerald-500/15 text-emerald-300 border border-emerald-500/30"
                              : "bg-zinc-800 text-zinc-400"
                          }`}
                        >
                          {res.isDirect ? "DOĞRUDAN KALEM" : "ALT BİLEŞEN DOLAYLI"}
                        </span>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </div>
      )}

      {/* ── 4. BÖLÜM: REVİZYON KARŞILAŞTIRMA (DIFF) ── */}
      {activeTab === "compare" && (
        <div className="space-y-4">
          <div className="p-4 rounded-xl bg-zinc-900/60 border border-white/[0.06] grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label className="text-xs text-zinc-400 mb-1 block">Referans Reçete (A - Eski Revizyon)</Label>
              <Select value={compareBomA} onValueChange={(val) => setCompareBomA(val)}>
                <SelectTrigger className="bg-zinc-950/60 border-white/[0.08] text-xs">
                  <SelectValue placeholder="İlk reçeteyi seçin..." />
                </SelectTrigger>
                <SelectContent className="max-h-60">
                  {boms.map((b) => (
                    <SelectItem key={b.id} value={b.id}>
                      [{b.code} Rev.{b.revision}] {b.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label className="text-xs text-zinc-400 mb-1 block">Hedef Reçete (B - Yeni Revizyon)</Label>
              <Select value={compareBomB} onValueChange={(val) => setCompareBomB(val)}>
                <SelectTrigger className="bg-zinc-950/60 border-white/[0.08] text-xs">
                  <SelectValue placeholder="İkinci reçeteyi seçin..." />
                </SelectTrigger>
                <SelectContent className="max-h-60">
                  {boms.map((b) => (
                    <SelectItem key={b.id} value={b.id}>
                      [{b.code} Rev.{b.revision}] {b.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="col-span-full flex justify-end">
              <Button
                onClick={handleRunCompare}
                disabled={compareLoading}
                className="bg-amber-500 hover:bg-amber-600 text-zinc-950 font-semibold text-xs h-9 px-4 gap-2"
              >
                <Layers className="w-3.5 h-3.5" />
                Revizyonları Karşılaştır
              </Button>
            </div>
          </div>

          {compareDiff && (
            <div className="p-4 rounded-xl border border-white/[0.08] bg-zinc-900/40 space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-3 p-3 rounded-lg bg-zinc-950/60 border border-white/[0.05]">
                <div className="text-xs text-zinc-300">
                  Maliyet Değişimi:{" "}
                  <span
                    className={`font-mono font-semibold ${
                      compareDiff.costDifference.totalCostDelta > 0
                        ? "text-rose-400"
                        : compareDiff.costDifference.totalCostDelta < 0
                        ? "text-emerald-400"
                        : "text-zinc-400"
                    }`}
                  >
                    {compareDiff.costDifference.totalCostDelta > 0 ? "+" : ""}
                    {formatCurrency(compareDiff.costDifference.totalCostDelta)} (
                    {compareDiff.costDifference.percentageChange}%)
                  </span>
                </div>
                <div className="text-xs text-zinc-400">
                  Değişmeyen: {compareDiff.unchangedCount} | Eklenen: {compareDiff.addedComponents.length} | Çıkarılan:{" "}
                  {compareDiff.removedComponents.length} | Değiştirilen: {compareDiff.modifiedComponents.length}
                </div>
              </div>

              {/* Eklenen Kalemler */}
              {compareDiff.addedComponents.length > 0 && (
                <div className="space-y-1.5">
                  <div className="text-xs font-semibold text-emerald-400 flex items-center gap-1.5">
                    <Plus className="w-3.5 h-3.5" /> Eklenen Kalemler ({compareDiff.addedComponents.length})
                  </div>
                  <div className="rounded-lg border border-emerald-500/20 bg-emerald-500/5 p-2 space-y-1">
                    {compareDiff.addedComponents.map((c) => (
                      <div key={c.id} className="flex justify-between text-xs text-zinc-300">
                        <span>
                          [{c.componentItemCode}] {c.componentItemName}
                        </span>
                        <span className="font-mono text-emerald-400">
                          +{c.quantity} {c.unit}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Çıkarılan Kalemler */}
              {compareDiff.removedComponents.length > 0 && (
                <div className="space-y-1.5">
                  <div className="text-xs font-semibold text-rose-400 flex items-center gap-1.5">
                    <Trash2 className="w-3.5 h-3.5" /> Çıkarılan Kalemler ({compareDiff.removedComponents.length})
                  </div>
                  <div className="rounded-lg border border-rose-500/20 bg-rose-500/5 p-2 space-y-1">
                    {compareDiff.removedComponents.map((c) => (
                      <div key={c.id} className="flex justify-between text-xs text-zinc-300">
                        <span className="line-through text-zinc-500">
                          [{c.componentItemCode}] {c.componentItemName}
                        </span>
                        <span className="font-mono text-rose-400">
                          -{c.quantity} {c.unit}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Değiştirilen Kalemler */}
              {compareDiff.modifiedComponents.length > 0 && (
                <div className="space-y-1.5">
                  <div className="text-xs font-semibold text-amber-400 flex items-center gap-1.5">
                    <Edit3 className="w-3.5 h-3.5" /> Miktar / Fire Oranı Değişenler ({compareDiff.modifiedComponents.length})
                  </div>
                  <div className="rounded-lg border border-amber-500/20 bg-amber-500/5 p-2 space-y-2">
                    {compareDiff.modifiedComponents.map((m, i) => (
                      <div key={i} className="flex items-center justify-between text-xs text-zinc-300">
                        <div>
                          [{m.componentItemCode}] {m.componentItemName}
                        </div>
                        <div className="font-mono text-zinc-400 flex items-center gap-2">
                          <span className="text-rose-400 line-through">
                            {m.oldQuantity} {m.oldUnit} (Fire %{m.oldScrapPercent})
                          </span>
                          <ArrowRight className="w-3 h-3 text-zinc-500" />
                          <span className="text-emerald-400 font-semibold">
                            {m.newQuantity} {m.newUnit} (Fire %{m.newScrapPercent})
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* ── DETAY ÇEKMECESİ (BOM DRAWER) ── */}
      <Sheet open={bomDrawerOpen} onOpenChange={setBomDrawerOpen}>
        <SheetContent side="right" className="w-full sm:max-w-2xl lg:max-w-4xl bg-[#0B0E0C] border-l border-white/[0.08] p-0 flex flex-col">
          {selectedBom && (
            <>
              {/* Çekmece Başlığı */}
              <div className="p-6 border-b border-white/[0.08] bg-zinc-950/60">
                <div className="flex items-start justify-between">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-sm font-bold text-emerald-400">{selectedBom.code}</span>
                      <span className="font-mono text-xs px-2 py-0.5 rounded bg-zinc-800 text-zinc-300">
                        Rev.{selectedBom.revision}
                      </span>
                      {renderStatusBadge(selectedBom.status)}
                    </div>
                    <h2 className="text-lg font-semibold text-white mt-1">{selectedBom.name}</h2>
                    <p className="text-xs text-zinc-400 font-mono mt-0.5">
                      Mamul: {selectedBom.finishedItemCode} — {selectedBom.finishedItemName}
                    </p>
                  </div>

                  <div className="text-right">
                    <div className="text-xs text-zinc-500">Teorik Birim Maliyet</div>
                    <div className="text-lg font-mono font-bold text-emerald-400">
                      {formatCurrency(selectedBom.totalTheoreticalCost / (selectedBom.baseQuantity || 1))}
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleRecalculateCost(selectedBom.id)}
                      className="h-6 px-1.5 text-[10px] text-zinc-400 hover:text-emerald-300 mt-1"
                    >
                      <RefreshCw className="w-2.5 h-2.5 mr-1" />
                      Maliyeti Güncelle
                    </Button>
                  </div>
                </div>

                {/* Çekmece İçi Alt Sekmeler */}
                <div className="flex items-center gap-2 mt-4 pt-3 border-t border-white/[0.06]">
                  <Button
                    variant={selectedBomTab === "components" ? "default" : "outline"}
                    size="sm"
                    onClick={() => setSelectedBomTab("components")}
                    className="h-8 text-xs gap-1.5"
                  >
                    <Layers className="w-3.5 h-3.5" />
                    Bileşenler ({selectedBom.components?.length || 0})
                  </Button>

                  <Button
                    variant={selectedBomTab === "exploded" ? "default" : "outline"}
                    size="sm"
                    onClick={() => {
                      setSelectedBomTab("exploded")
                      loadExplodedBom(selectedBom.id, simQty)
                    }}
                    className="h-8 text-xs gap-1.5"
                  >
                    <FolderTree className="w-3.5 h-3.5" />
                    Çok Seviyeli Patlatma
                  </Button>

                  <Button
                    variant={selectedBomTab === "cost" ? "default" : "outline"}
                    size="sm"
                    onClick={() => setSelectedBomTab("cost")}
                    className="h-8 text-xs gap-1.5"
                  >
                    <Coins className="w-3.5 h-3.5" />
                    Maliyet Dökümü
                  </Button>
                </div>
              </div>

              {/* Çekmece Gövdesi */}
              <div className="flex-1 overflow-y-auto p-6 space-y-6">
                {/* 1. Alt Sekme: Bileşen Kalemleri */}
                {selectedBomTab === "components" && (
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-zinc-400 font-medium uppercase tracking-wider">
                        Reçete Formülü (Bileşen Listesi)
                      </span>
                      {selectedBom.status !== "APPROVED" && (
                        <Button
                          size="sm"
                          onClick={() => {
                            setNewCompForm({
                              componentItemId: "",
                              lineNumber: ((selectedBom.components?.length || 0) + 1) * 10,
                              quantity: 1,
                              unit: "Adet",
                              scrapPercent: 0,
                              isPhantom: false,
                              operationSequence: "",
                              notes: "",
                            })
                            setAddComponentModalOpen(true)
                          }}
                          className="h-7 text-xs bg-emerald-500 text-zinc-950 font-semibold gap-1"
                        >
                          <Plus className="w-3 h-3" /> Bileşen Ekle
                        </Button>
                      )}
                    </div>

                    <div className="rounded-xl border border-white/[0.08] overflow-hidden bg-zinc-950/40">
                      <Table>
                        <TableHeader className="bg-zinc-900/60">
                          <TableRow className="border-white/[0.08]">
                            <TableHead className="text-zinc-400 text-xs w-12">Sıra</TableHead>
                            <TableHead className="text-zinc-400 text-xs">Bileşen Malzeme</TableHead>
                            <TableHead className="text-zinc-400 text-xs text-right">Net Miktar</TableHead>
                            <TableHead className="text-zinc-400 text-xs text-right">Fire %</TableHead>
                            <TableHead className="text-zinc-400 text-xs text-right">Birim Fiyat</TableHead>
                            <TableHead className="text-zinc-400 text-xs text-right">Tutar</TableHead>
                            <TableHead className="text-zinc-400 text-xs text-center">İkame</TableHead>
                            {selectedBom.status !== "APPROVED" && (
                              <TableHead className="text-zinc-400 text-xs text-right">İşlem</TableHead>
                            )}
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {(selectedBom.components || []).length === 0 ? (
                            <TableRow>
                              <TableCell colSpan={8} className="text-center py-8 text-zinc-500 text-xs">
                                Henüz bileşen eklenmemiş. "Bileşen Ekle" butonu ile ekleyebilirsiniz.
                              </TableCell>
                            </TableRow>
                          ) : (
                            selectedBom.components!.map((comp) => {
                              const lineCost = (comp.quantity * (comp.unitCost || 0) * (1 + (comp.scrapPercent || 0) / 100))
                              return (
                                <TableRow key={comp.id} className="border-white/[0.04]">
                                  <TableCell className="font-mono text-xs text-zinc-500">{comp.lineNumber}</TableCell>
                                  <TableCell className="text-xs">
                                    <div className="font-mono text-[11px] text-emerald-400">{comp.componentItemCode}</div>
                                    <div className="text-zinc-200 font-medium">{comp.componentItemName}</div>
                                    {comp.isPhantom && (
                                      <span className="text-[10px] text-purple-400 font-mono">PHANTOM YARI MAMUL</span>
                                    )}
                                  </TableCell>
                                  <TableCell className="text-right font-mono text-xs text-zinc-300">
                                    {comp.quantity} {comp.unit}
                                  </TableCell>
                                  <TableCell className="text-right font-mono text-xs text-amber-400">
                                    %{comp.scrapPercent || 0}
                                  </TableCell>
                                  <TableCell className="text-right font-mono text-xs text-zinc-400">
                                    {formatCurrency(comp.unitCost || 0)}
                                  </TableCell>
                                  <TableCell className="text-right font-mono text-xs text-emerald-400 font-semibold">
                                    {formatCurrency(lineCost)}
                                  </TableCell>
                                  <TableCell className="text-center">
                                    <div className="flex items-center justify-center gap-1">
                                      <span className="text-xs font-mono text-zinc-400">
                                        {comp.substitutes?.length || 0}
                                      </span>
                                      {selectedBom.status !== "APPROVED" && (
                                        <Button
                                          variant="ghost"
                                          size="sm"
                                          onClick={() => {
                                            setTargetBomItemId(comp.id)
                                            setNewSubForm({
                                              substituteItemId: "",
                                              priority: (comp.substitutes?.length || 0) + 1,
                                              substitutionRatio: 1.0,
                                              isMandatoryApproval: false,
                                              notes: "",
                                            })
                                            setAddSubstituteModalOpen(true)
                                          }}
                                          className="h-6 w-6 p-0 text-violet-400 hover:text-violet-300"
                                          title="İkame Malzeme Ekle"
                                        >
                                          <Plus className="w-3 h-3" />
                                        </Button>
                                      )}
                                    </div>
                                    {/* Tanımlı İkame Malzemeler */}
                                    {(comp.substitutes || []).map((s) => (
                                      <div
                                        key={s.id}
                                        className="text-[10px] text-violet-300/80 font-mono mt-0.5 flex items-center justify-center gap-1"
                                      >
                                        <span>
                                          P{s.priority}: {s.substituteItemCode} (1:{s.substitutionRatio})
                                        </span>
                                        {selectedBom.status !== "APPROVED" && (
                                          <button
                                            onClick={() => handleDeleteSubstitute(s.id)}
                                            className="text-zinc-500 hover:text-rose-400"
                                          >
                                            <X className="w-2.5 h-2.5" />
                                          </button>
                                        )}
                                      </div>
                                    ))}
                                  </TableCell>
                                  {selectedBom.status !== "APPROVED" && (
                                    <TableCell className="text-right">
                                      <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => handleDeleteComponent(comp.id)}
                                        className="h-6 w-6 p-0 text-rose-400 hover:text-rose-300"
                                      >
                                        <Trash2 className="w-3 h-3" />
                                      </Button>
                                    </TableCell>
                                  )}
                                </TableRow>
                              )
                            })
                          )}
                        </TableBody>
                      </Table>
                    </div>
                  </div>
                )}

                {/* 2. Alt Sekme: Çok Seviyeli Patlatma (Explosion) */}
                {selectedBomTab === "exploded" && (
                  <div className="space-y-4">
                    <div className="flex items-center justify-between p-3 rounded-xl bg-zinc-900/60 border border-white/[0.06]">
                      <div className="flex items-center gap-2">
                        <Label className="text-xs text-zinc-400">Üretim Parti Miktarı:</Label>
                        <Input
                          type="number"
                          min={1}
                          value={simQty}
                          onChange={(e) => setSimQty(Number(e.target.value) || 1)}
                          className="w-24 h-8 bg-zinc-950 border-white/[0.08] text-xs font-mono"
                        />
                        <span className="text-xs text-zinc-400">{selectedBom.baseUnit}</span>
                      </div>
                      <Button
                        size="sm"
                        onClick={() => loadExplodedBom(selectedBom.id, simQty)}
                        disabled={explodedLoading}
                        className="h-8 text-xs bg-emerald-500 text-zinc-950 font-semibold gap-1.5"
                      >
                        <RefreshCw className={`w-3 h-3 ${explodedLoading ? "animate-spin" : ""}`} />
                        Ağacı Patlat
                      </Button>
                    </div>

                    {explodedData && (
                      <div className="space-y-4">
                        <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-between">
                          <div className="text-xs text-emerald-300">
                            Maksimum Derinlik: <strong>{explodedData.maxDepthReached} Seviye</strong> | Toplam Hammadde:{" "}
                            <strong>{explodedData.flattenedSummary.length} Çeşit</strong>
                          </div>
                          <div className="text-sm font-mono font-bold text-emerald-400">
                            Toplam Malzeme İhtiyacı: {formatCurrency(explodedData.totalEstimatedMaterialCost)}
                          </div>
                        </div>

                        {/* Düzleştirilmiş Hammadde İhtiyaç Tablosu */}
                        <div className="space-y-2">
                          <span className="text-xs text-zinc-400 font-medium uppercase tracking-wider">
                            Düzleştirilmiş Net / Brüt Malzeme İhtiyaçları
                          </span>
                          <div className="rounded-xl border border-white/[0.08] overflow-hidden bg-zinc-950/40">
                            <Table>
                              <TableHeader className="bg-zinc-900/60">
                                <TableRow className="border-white/[0.08]">
                                  <TableHead className="text-zinc-400 text-xs">Hammadde Kodu</TableHead>
                                  <TableHead className="text-zinc-400 text-xs">Malzeme Adı</TableHead>
                                  <TableHead className="text-zinc-400 text-xs text-center">Seviyeler</TableHead>
                                  <TableHead className="text-zinc-400 text-xs text-right">Net Miktar</TableHead>
                                  <TableHead className="text-zinc-400 text-xs text-right">Brüt (Fire Dahil)</TableHead>
                                  <TableHead className="text-zinc-400 text-xs text-right">Tahmini Tutar</TableHead>
                                </TableRow>
                              </TableHeader>
                              <TableBody>
                                {explodedData.flattenedSummary.map((m) => (
                                  <TableRow key={m.itemId} className="border-white/[0.04]">
                                    <TableCell className="font-mono text-xs text-emerald-400 font-medium">
                                      {m.itemCode}
                                    </TableCell>
                                    <TableCell className="text-xs text-zinc-200">{m.itemName}</TableCell>
                                    <TableCell className="text-center font-mono text-[11px] text-zinc-400">
                                      L{m.usedInLevels.join(", L")}
                                    </TableCell>
                                    <TableCell className="text-right font-mono text-xs text-zinc-300">
                                      {m.totalNetQuantity.toLocaleString("tr-TR", { maximumFractionDigits: 3 })}{" "}
                                      {m.unit}
                                    </TableCell>
                                    <TableCell className="text-right font-mono text-xs text-amber-400 font-semibold">
                                      {m.totalGrossQuantity.toLocaleString("tr-TR", { maximumFractionDigits: 3 })}{" "}
                                      {m.unit}
                                    </TableCell>
                                    <TableCell className="text-right font-mono text-xs text-emerald-400 font-bold">
                                      {formatCurrency(m.totalEstimatedCost)}
                                    </TableCell>
                                  </TableRow>
                                ))}
                              </TableBody>
                            </Table>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* 3. Alt Sekme: Maliyet Dökümü */}
                {selectedBomTab === "cost" && (
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                      <div className="p-3 rounded-xl bg-zinc-900/60 border border-white/[0.06]">
                        <div className="text-[11px] text-zinc-400">Malzeme Maliyeti</div>
                        <div className="text-base font-mono font-bold text-zinc-100 mt-1">
                          {formatCurrency(selectedBom.totalMaterialCost)}
                        </div>
                      </div>
                      <div className="p-3 rounded-xl bg-zinc-900/60 border border-white/[0.06]">
                        <div className="text-[11px] text-zinc-400">İşçilik / Makine</div>
                        <div className="text-base font-mono font-bold text-sky-400 mt-1">
                          {formatCurrency(selectedBom.totalLaborCost)}
                        </div>
                      </div>
                      <div className="p-3 rounded-xl bg-zinc-900/60 border border-white/[0.06]">
                        <div className="text-[11px] text-zinc-400">Hazırlık / Genel Gider</div>
                        <div className="text-base font-mono font-bold text-violet-400 mt-1">
                          {formatCurrency(selectedBom.totalOverheadCost)}
                        </div>
                      </div>
                      <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30">
                        <div className="text-[11px] text-emerald-300 font-semibold">Birim Teorik Maliyet</div>
                        <div className="text-base font-mono font-bold text-emerald-400 mt-1">
                          {formatCurrency(selectedBom.totalTheoreticalCost / (selectedBom.baseQuantity || 1))}
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>

      {/* ── YENİ REÇETE MODALI ── */}
      <Dialog open={createBomModalOpen} onOpenChange={setCreateBomModalOpen}>
        <DialogContent className="sm:max-w-md bg-zinc-950 border-white/[0.1] text-zinc-100">
          <DialogHeader>
            <DialogTitle className="text-base font-semibold text-white">Yeni Ürün Reçetesi (BOM) Tanımla</DialogTitle>
            <DialogDescription className="text-xs text-zinc-400">
              Mamul stok kartına bağlı çok seviyeli reçete başlığı oluşturun.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 py-2">
            <div>
              <Label className="text-xs text-zinc-300">Mamul / Ürün Seçimi *</Label>
              <Select
                value={newBomForm.finishedItemId}
                onValueChange={(val) => {
                  const it = inventoryItems.find((i) => i.id === val)
                  setNewBomForm((f) => ({
                    ...f,
                    finishedItemId: val,
                    name: it ? `${it.name} Reçetesi` : f.name,
                    baseUnit: it?.unit || "Adet",
                  }))
                }}
              >
                <SelectTrigger className="bg-zinc-900 border-white/[0.1] text-xs mt-1">
                  <SelectValue placeholder="Mamul stok kartı seçin..." />
                </SelectTrigger>
                <SelectContent className="max-h-60">
                  {inventoryItems.map((it) => (
                    <SelectItem key={it.id} value={it.id}>
                      [{it.sku || it.code}] {it.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label className="text-xs text-zinc-300">Reçete Kodu *</Label>
                <Input
                  value={newBomForm.code}
                  onChange={(e) => setNewBomForm({ ...newBomForm, code: e.target.value.toUpperCase() })}
                  className="bg-zinc-900 border-white/[0.1] text-xs font-mono mt-1"
                />
              </div>
              <div>
                <Label className="text-xs text-zinc-300">Revizyon No</Label>
                <Input
                  value={newBomForm.revision}
                  onChange={(e) => setNewBomForm({ ...newBomForm, revision: e.target.value })}
                  className="bg-zinc-900 border-white/[0.1] text-xs font-mono mt-1"
                />
              </div>
            </div>

            <div>
              <Label className="text-xs text-zinc-300">Reçete Tanımı / Adı *</Label>
              <Input
                value={newBomForm.name}
                onChange={(e) => setNewBomForm({ ...newBomForm, name: e.target.value })}
                className="bg-zinc-900 border-white/[0.1] text-xs mt-1"
              />
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label className="text-xs text-zinc-300">Temel Parti Miktarı</Label>
                <Input
                  type="number"
                  min={1}
                  value={newBomForm.baseQuantity}
                  onChange={(e) => setNewBomForm({ ...newBomForm, baseQuantity: Number(e.target.value) || 1 })}
                  className="bg-zinc-900 border-white/[0.1] text-xs font-mono mt-1"
                />
              </div>
              <div>
                <Label className="text-xs text-zinc-300">Birim</Label>
                <Input
                  value={newBomForm.baseUnit}
                  onChange={(e) => setNewBomForm({ ...newBomForm, baseUnit: e.target.value })}
                  className="bg-zinc-900 border-white/[0.1] text-xs mt-1"
                />
              </div>
            </div>

            <div className="flex items-center gap-2 pt-2">
              <Checkbox
                id="isPhantomCb"
                checked={newBomForm.isPhantom}
                onCheckedChange={(checked) => setNewBomForm({ ...newBomForm, isPhantom: Boolean(checked) })}
              />
              <Label htmlFor="isPhantomCb" className="text-xs text-zinc-300 cursor-pointer">
                Hayalet Yarı Mamul (Phantom Subassembly - Stok tutulmaz, patlatmada doğrudan üst seviyeye aktarılır)
              </Label>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setCreateBomModalOpen(false)}>
              İptal
            </Button>
            <Button
              size="sm"
              onClick={handleCreateBom}
              className="bg-emerald-500 hover:bg-emerald-600 text-zinc-950 font-semibold"
            >
              Reçeteyi Oluştur
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── BİLEŞEN EKLE MODALI ── */}
      <Dialog open={addComponentModalOpen} onOpenChange={setAddComponentModalOpen}>
        <DialogContent className="sm:max-w-md bg-zinc-950 border-white/[0.1] text-zinc-100">
          <DialogHeader>
            <DialogTitle className="text-base font-semibold text-white">Reçeteye Bileşen Ekle</DialogTitle>
          </DialogHeader>

          <div className="space-y-3 py-2">
            <div>
              <Label className="text-xs text-zinc-300">Bileşen Malzeme *</Label>
              <Select
                value={newCompForm.componentItemId}
                onValueChange={(val) => {
                  const it = inventoryItems.find((i) => i.id === val)
                  setNewCompForm((f) => ({ ...f, componentItemId: val, unit: it?.unit || "Adet" }))
                }}
              >
                <SelectTrigger className="bg-zinc-900 border-white/[0.1] text-xs mt-1">
                  <SelectValue placeholder="Malzeme seçiniz..." />
                </SelectTrigger>
                <SelectContent className="max-h-60">
                  {inventoryItems.map((it) => (
                    <SelectItem key={it.id} value={it.id}>
                      [{it.sku || it.code}] {it.name} ({it.unit || "Adet"})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-3 gap-2">
              <div>
                <Label className="text-xs text-zinc-300">Miktar *</Label>
                <Input
                  type="number"
                  step="any"
                  value={newCompForm.quantity}
                  onChange={(e) => setNewCompForm({ ...newCompForm, quantity: Number(e.target.value) || 0 })}
                  className="bg-zinc-900 border-white/[0.1] text-xs font-mono mt-1"
                />
              </div>
              <div>
                <Label className="text-xs text-zinc-300">Birim</Label>
                <Input
                  value={newCompForm.unit}
                  onChange={(e) => setNewCompForm({ ...newCompForm, unit: e.target.value })}
                  className="bg-zinc-900 border-white/[0.1] text-xs mt-1"
                />
              </div>
              <div>
                <Label className="text-xs text-zinc-300">Fire %</Label>
                <Input
                  type="number"
                  min={0}
                  max={100}
                  value={newCompForm.scrapPercent}
                  onChange={(e) => setNewCompForm({ ...newCompForm, scrapPercent: Number(e.target.value) || 0 })}
                  className="bg-zinc-900 border-white/[0.1] text-xs font-mono mt-1"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label className="text-xs text-zinc-300">Sıra No</Label>
                <Input
                  type="number"
                  value={newCompForm.lineNumber}
                  onChange={(e) => setNewCompForm({ ...newCompForm, lineNumber: Number(e.target.value) || 10 })}
                  className="bg-zinc-900 border-white/[0.1] text-xs font-mono mt-1"
                />
              </div>
              <div>
                <Label className="text-xs text-zinc-300">Operasyon Sırası (Opsiyonel)</Label>
                <Input
                  placeholder="Örn: 10, 20"
                  value={newCompForm.operationSequence}
                  onChange={(e) => setNewCompForm({ ...newCompForm, operationSequence: e.target.value })}
                  className="bg-zinc-900 border-white/[0.1] text-xs font-mono mt-1"
                />
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setAddComponentModalOpen(false)}>
              İptal
            </Button>
            <Button
              size="sm"
              onClick={handleAddComponent}
              className="bg-emerald-500 hover:bg-emerald-600 text-zinc-950 font-semibold"
            >
              Bileşeni Ekle
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── İKAME MALZEME EKLE MODALI ── */}
      <Dialog open={addSubstituteModalOpen} onOpenChange={setAddSubstituteModalOpen}>
        <DialogContent className="sm:max-w-md bg-zinc-950 border-white/[0.1] text-zinc-100">
          <DialogHeader>
            <DialogTitle className="text-base font-semibold text-white">İkame / Alternatif Malzeme Ekle</DialogTitle>
            <DialogDescription className="text-xs text-zinc-400">
              Bu reçete kalemi tükendiğinde veya yetersiz olduğunda kullanılacak alternatifi belirleyin.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 py-2">
            <div>
              <Label className="text-xs text-zinc-300">İkame Malzeme Seçimi *</Label>
              <Select
                value={newSubForm.substituteItemId}
                onValueChange={(val) => setNewSubForm({ ...newSubForm, substituteItemId: val })}
              >
                <SelectTrigger className="bg-zinc-900 border-white/[0.1] text-xs mt-1">
                  <SelectValue placeholder="İkame stok kartı seçin..." />
                </SelectTrigger>
                <SelectContent className="max-h-60">
                  {inventoryItems.map((it) => (
                    <SelectItem key={it.id} value={it.id}>
                      [{it.sku || it.code}] {it.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label className="text-xs text-zinc-300">Öncelik Sırası (1=İlk)</Label>
                <Input
                  type="number"
                  min={1}
                  value={newSubForm.priority}
                  onChange={(e) => setNewSubForm({ ...newSubForm, priority: Number(e.target.value) || 1 })}
                  className="bg-zinc-900 border-white/[0.1] text-xs font-mono mt-1"
                />
              </div>
              <div>
                <Label className="text-xs text-zinc-300">İkame Oranı (1 birim yerine)</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={newSubForm.substitutionRatio}
                  onChange={(e) => setNewSubForm({ ...newSubForm, substitutionRatio: Number(e.target.value) || 1.0 })}
                  className="bg-zinc-900 border-white/[0.1] text-xs font-mono mt-1"
                />
              </div>
            </div>

            <div className="flex items-center gap-2 pt-2">
              <Checkbox
                id="isMandatoryApprCb"
                checked={newSubForm.isMandatoryApproval}
                onCheckedChange={(checked) =>
                  setNewSubForm({ ...newSubForm, isMandatoryApproval: Boolean(checked) })
                }
              />
              <Label htmlFor="isMandatoryApprCb" className="text-xs text-zinc-300 cursor-pointer">
                Kullanım için üretim yöneticisi onayı zorunlu
              </Label>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setAddSubstituteModalOpen(false)}>
              İptal
            </Button>
            <Button
              size="sm"
              onClick={handleAddSubstitute}
              className="bg-violet-600 hover:bg-violet-700 text-white font-semibold"
            >
              İkameyi Kaydet
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── KLONLAMA / YENİ REVİZYON MODALI ── */}
      <Dialog open={cloneBomModalOpen} onOpenChange={setCloneBomModalOpen}>
        <DialogContent className="sm:max-w-md bg-zinc-950 border-white/[0.1] text-zinc-100">
          <DialogHeader>
            <DialogTitle className="text-base font-semibold text-white">
              Kopyala ve Değiştir (Yeni Revizyon)
            </DialogTitle>
            <DialogDescription className="text-xs text-zinc-400">
              Mevcut onaylı reçetenin kopyasını taslak olarak türetip düzenleyebilirsiniz.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 py-2">
            <div>
              <Label className="text-xs text-zinc-300">Kaynak Reçete</Label>
              <div className="font-mono text-xs text-emerald-400 mt-1">
                {cloneTargetBom?.code} (Rev {cloneTargetBom?.revision})
              </div>
            </div>

            <div>
              <Label className="text-xs text-zinc-300">Yeni Revizyon Numarası</Label>
              <Input
                value={cloneNewRevision}
                onChange={(e) => {
                  setCloneNewRevision(e.target.value)
                  if (cloneTargetBom) {
                    setCloneNewCode(`${cloneTargetBom.code}-R${e.target.value}`)
                  }
                }}
                className="bg-zinc-900 border-white/[0.1] text-xs font-mono mt-1"
              />
            </div>

            <div>
              <Label className="text-xs text-zinc-300">Yeni Reçete Kodu</Label>
              <Input
                value={cloneNewCode}
                onChange={(e) => setCloneNewCode(e.target.value.toUpperCase())}
                className="bg-zinc-900 border-white/[0.1] text-xs font-mono mt-1"
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setCloneBomModalOpen(false)}>
              İptal
            </Button>
            <Button
              size="sm"
              onClick={handleCloneBom}
              className="bg-amber-500 hover:bg-amber-600 text-zinc-950 font-semibold"
            >
              Yeni Revizyonu Klonla
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── OPERASYON EKLE MODALI ── */}
      <Dialog open={addOpModalOpen} onOpenChange={setAddOpModalOpen}>
        <DialogContent className="sm:max-w-md bg-zinc-950 border-white/[0.1] text-zinc-100">
          <DialogHeader>
            <DialogTitle className="text-base font-semibold text-white">Rotaya Operasyon Ekle</DialogTitle>
          </DialogHeader>

          <div className="space-y-3 py-2">
            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label className="text-xs text-zinc-300">Operasyon Sıra No *</Label>
                <Input
                  type="number"
                  value={newOpForm.operationNumber}
                  onChange={(e) => setNewOpForm({ ...newOpForm, operationNumber: Number(e.target.value) || 10 })}
                  className="bg-zinc-900 border-white/[0.1] text-xs font-mono mt-1"
                />
              </div>
              <div>
                <Label className="text-xs text-zinc-300">İşçi Sayısı</Label>
                <Input
                  type="number"
                  min={1}
                  value={newOpForm.workerCount}
                  onChange={(e) => setNewOpForm({ ...newOpForm, workerCount: Number(e.target.value) || 1 })}
                  className="bg-zinc-900 border-white/[0.1] text-xs font-mono mt-1"
                />
              </div>
            </div>

            <div>
              <Label className="text-xs text-zinc-300">Operasyon Adı *</Label>
              <Input
                value={newOpForm.name}
                onChange={(e) => setNewOpForm({ ...newOpForm, name: e.target.value })}
                placeholder="Örn: CNC Torna İşleme"
                className="bg-zinc-900 border-white/[0.1] text-xs mt-1"
              />
            </div>

            <div>
              <Label className="text-xs text-zinc-300">İş Merkezi (İstasyon) *</Label>
              <Select
                value={newOpForm.workCenterId}
                onValueChange={(val) => setNewOpForm({ ...newOpForm, workCenterId: val })}
              >
                <SelectTrigger className="bg-zinc-900 border-white/[0.1] text-xs mt-1">
                  <SelectValue placeholder="İş merkezi seçiniz..." />
                </SelectTrigger>
                <SelectContent className="max-h-60">
                  {workCenters.map((wc) => (
                    <SelectItem key={wc.id} value={wc.id}>
                      [{wc.code}] {wc.name} ({formatCurrency(wc.hourlyCost)}/saat)
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label className="text-xs text-zinc-300">Hazırlık Süresi (dk)</Label>
                <Input
                  type="number"
                  value={newOpForm.setupTimeMinutes}
                  onChange={(e) => setNewOpForm({ ...newOpForm, setupTimeMinutes: Number(e.target.value) || 0 })}
                  className="bg-zinc-900 border-white/[0.1] text-xs font-mono mt-1"
                />
              </div>
              <div>
                <Label className="text-xs text-zinc-300">Birim İşlem Süresi (dk)</Label>
                <Input
                  type="number"
                  value={newOpForm.runTimeMinutes}
                  onChange={(e) => setNewOpForm({ ...newOpForm, runTimeMinutes: Number(e.target.value) || 0 })}
                  className="bg-zinc-900 border-white/[0.1] text-xs font-mono mt-1"
                />
              </div>
            </div>

            <div className="space-y-2 pt-2 border-t border-white/[0.06]">
              <div className="flex items-center gap-2">
                <Checkbox
                  id="qcPointCb"
                  checked={newOpForm.isQualityControlPoint}
                  onCheckedChange={(checked) =>
                    setNewOpForm({ ...newOpForm, isQualityControlPoint: Boolean(checked) })
                  }
                />
                <Label htmlFor="qcPointCb" className="text-xs text-zinc-300 cursor-pointer">
                  Kalite Kontrol Kontrol Noktası (Gate / Inspection Point)
                </Label>
              </div>

              <div className="flex items-center gap-2">
                <Checkbox
                  id="subcontractCb"
                  checked={newOpForm.isSubcontracted}
                  onCheckedChange={(checked) => setNewOpForm({ ...newOpForm, isSubcontracted: Boolean(checked) })}
                />
                <Label htmlFor="subcontractCb" className="text-xs text-zinc-300 cursor-pointer">
                  Fason / Dış Kaynak Operasyonu
                </Label>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setAddOpModalOpen(false)}>
              İptal
            </Button>
            <Button
              size="sm"
              onClick={async () => {
                if (!targetRoutingId || !newOpForm.name || !newOpForm.workCenterId) {
                  toast.error("Lütfen zorunlu alanları doldurun.")
                  return
                }
                try {
                  const res = await fetch("/api/production/bom-rota", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                      action: "add_operation",
                      payload: {
                        routingId: targetRoutingId,
                        ...newOpForm,
                      },
                    }),
                  })
                  const data = await res.json()
                  if (data.success) {
                    toast.success("Operasyon rotaya eklendi.")
                    setAddOpModalOpen(false)
                    fetchRoutings()
                  } else {
                    toast.error(data.error || "Operasyon eklenemedi.")
                  }
                } catch (err) {
                  console.error(err)
                }
              }}
              className="bg-sky-500 hover:bg-sky-600 text-zinc-950 font-semibold"
            >
              Operasyonu Ekle
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── CSV İÇE AKTARMA MODALI ── */}
      <Dialog open={importModalOpen} onOpenChange={setImportModalOpen}>
        <DialogContent className="sm:max-w-2xl bg-zinc-950 border-white/[0.1] text-zinc-100">
          <DialogHeader>
            <DialogTitle className="text-base font-semibold text-white">Reçete İçe Aktar (Excel / CSV)</DialogTitle>
            <DialogDescription className="text-xs text-zinc-400">
              CSV içeriğini yapıştırın veya dosyanızı kopyalayıp buraya aktarın.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 py-2">
            <div>
              <Label className="text-xs text-zinc-300">CSV Metni (Noktalı virgül veya virgül ayırıcılı)</Label>
              <textarea
                value={csvText}
                onChange={(e) => setCsvText(e.target.value)}
                placeholder="ReçeteKodu;ReçeteAdı;Revizyon;MamulKodu;TemelMiktar;TemelBirim;HayaletReçete;KalemSıraNo;BileşenKodu;BileşenMiktarı;BileşenBirimi;FireYüzdesi"
                className="w-full h-40 mt-1 p-3 rounded-lg bg-zinc-900 border border-white/[0.1] text-xs font-mono text-zinc-200 resize-none focus:outline-none focus:border-emerald-500"
              />
            </div>

            {importReport && (
              <div className="p-3 rounded-lg bg-zinc-900/60 border border-white/[0.08] text-xs space-y-2">
                <div className="flex justify-between font-medium">
                  <span>Toplam Satır: {importReport.totalRows}</span>
                  <span className="text-emerald-400">Geçerli: {importReport.validRowCount}</span>
                  <span className="text-rose-400">Hatalı: {importReport.errorRowCount}</span>
                </div>
                {importReport.errors?.length > 0 && (
                  <div className="max-h-28 overflow-y-auto space-y-1 text-rose-300/90 text-[11px]">
                    {importReport.errors.map((e: any, i: number) => (
                      <div key={i}>
                        Satır {e.row}: {e.message}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          <DialogFooter className="flex justify-between items-center w-full">
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleImportCsv(true)}
              disabled={importSubmitting}
              className="text-xs"
            >
              Ön Doğrulama (Dry-run)
            </Button>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={() => setImportModalOpen(false)}>
                Vazgeç
              </Button>
              <Button
                size="sm"
                onClick={() => handleImportCsv(false)}
                disabled={importSubmitting}
                className="bg-emerald-500 hover:bg-emerald-600 text-zinc-950 font-semibold text-xs"
              >
                Veritabanına Aktar
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

