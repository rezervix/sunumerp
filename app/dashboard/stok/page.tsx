"use client"

import React, { useState, useEffect, useMemo } from "react"
import Link from "next/link"
import {
  Boxes,
  Warehouse,
  Layers,
  Scale,
  Calculator,
  Plus,
  Search,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Sparkles,
  TrendingUp,
  RefreshCw,
  Barcode,
  Eye,
  ChevronRight,
  SlidersHorizontal,
  Info,
  ArrowUpDown,
  History,
  FileSpreadsheet,
  PackageCheck
} from "lucide-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from "@/components/ui/select"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from "@/components/ui/dialog"
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle
} from "@/components/ui/sheet"
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger
} from "@/components/ui/accordion"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger
} from "@/components/ui/tooltip"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import { toast } from "sonner"
import {
  enterpriseInventoryService,
  calculateStockValuation,
  calculateBomRollupCost,
  convertStockUnit
} from "@/lib/services/enterpriseInventorySuite"
import type { ValuationMethod, InventoryItemRecord } from "@/lib/services/inventoryValuationEngine"

export default function CoreInventoryArchitecturePage() {
  const [state, setState] = useState(() => enterpriseInventoryService.getState())
  const [activeTab, setActiveTab] = useState("products")
  const [searchQuery, setSearchQuery] = useState("")
  const [selectedWarehouseId, setSelectedWarehouseId] = useState<string>("ALL")
  const [selectedItemType, setSelectedItemType] = useState<string>("ALL")
  const [isExpertMode, setIsExpertMode] = useState<boolean>(false)

  // Drawer / Sheet: Seçilen Ürünün Derin Detayları
  const [selectedItemForDrawer, setSelectedItemForDrawer] = useState<InventoryItemRecord | null>(null)
  const [isDrawerOpen, setIsDrawerOpen] = useState(false)

  // Yeni Stok Kartı Modal & Aşamalı Gösterim (Progressive Disclosure)
  const [isAddModalOpen, setIsAddModalOpen] = useState(false)
  const [newName, setNewName] = useState("")
  const [newSku, setNewSku] = useState("")
  const [newBarcode, setNewBarcode] = useState("")
  const [newCategory, setNewCategory] = useState("Buket & Aranjman")
  const [newWhId, setNewWhId] = useState("wh-ist-main")
  const [newInitialQty, setNewInitialQty] = useState("100")
  const [newSalesPrice, setNewSalesPrice] = useState("890")
  // Gelişmiş Ayarlar (Akordeon içinde gizli)
  const [newValuationMethod, setNewValuationMethod] = useState<ValuationMethod>("FIFO")
  const [newUnitCost, setNewUnitCost] = useState("450")
  const [newTrackLot, setNewTrackLot] = useState(true)
  const [newMinStock, setNewMinStock] = useState("20")
  const [newMaxStock, setNewMaxStock] = useState("500")

  // Matrix Varyant Üretici State
  const [variantColor, setVariantColor] = useState("Zümrüt Yeşili")
  const [variantSize, setVariantSize] = useState("XL")
  const [variantInitialQty, setVariantInitialQty] = useState("40")
  const [variantUnitCost, setVariantUnitCost] = useState("740")
  const [variantSalesPrice, setVariantSalesPrice] = useState("1390")

  // Lot / SKT Soykütüğü State
  const [selectedLotId, setSelectedLotId] = useState<string>("lot-001")
  const [isLotModalOpen, setIsLotModalOpen] = useState(false)
  const [newLotItemId, setNewLotItemId] = useState("item-001")
  const [newLotNumber, setNewLotNumber] = useState("")
  const [newLotExpiry, setNewLotExpiry] = useState("2027-03-15")
  const [newLotQty, setNewLotQty] = useState("100")
  const [newLotSupplier, setNewLotSupplier] = useState("Hollanda Flora B.V.")

  // Çoklu Birim Dönüştürücü State
  const [uomItemId, setUomItemId] = useState("item-001")
  const [uomFromUnit, setUomFromUnit] = useState("Koli")
  const [uomToUnit, setUomToUnit] = useState("Adet")
  const [uomInputQty, setUomInputQty] = useState("15")

  // Değerleme & BOM State
  const [valItemId, setValItemId] = useState("item-001")
  const [valIssueQty, setValIssueQty] = useState("220")
  const [selectedBomId, setSelectedBomId] = useState("bom-001")
  const [bomBatchMultiplier, setBomBatchMultiplier] = useState("10")

  useEffect(() => {
    const refresh = () => setState({ ...enterpriseInventoryService.getState() })
    window.addEventListener("sunum-inventory-change", refresh)
    return () => window.removeEventListener("sunum-inventory-change", refresh)
  }, [])

  // Filtrelenmiş Ürün Listesi
  const filteredItems = useMemo(() => {
    const items = state.items || []
    return items.filter(item => {
      const q = searchQuery.toLowerCase()
      const matchesSearch =
        (item.name || "").toLowerCase().includes(q) ||
        (item.sku || "").toLowerCase().includes(q) ||
        (item.barcode || "").includes(q) ||
        (item.category || "").toLowerCase().includes(q)

      const matchesType = selectedItemType === "ALL" || item.itemType === selectedItemType
      const matchesWh =
        selectedWarehouseId === "ALL" ||
        (item.warehouseBalances || []).some(b => b.warehouseId === selectedWarehouseId && b.onHandQty > 0)

      return matchesSearch && matchesType && matchesWh
    })
  }, [state.items, searchQuery, selectedItemType, selectedWarehouseId])

  // Kritik Özet Metrikleri
  const kpiSummary = useMemo(() => {
    const nonParentItems = (state.items || []).filter(i => i.itemType !== "MATRIX_PARENT")
    const totalOnHand = nonParentItems.reduce((s, i) => s + (i.totalOnHand || 0), 0)
    const totalAvailable = nonParentItems.reduce((s, i) => s + (i.totalAvailable || 0), 0)
    const totalInventoryValue = nonParentItems.reduce(
      (s, i) => s + (i.totalOnHand || 0) * (i.fifoUnitCost || 0),
      0
    )
    const expiringLots = (state.lotBatches || []).filter(
      l => l.status === "EXPIRING_SOON" || (l.daysUntilExpiry || 99) <= 15
    ).length
    const criticalStockItems = nonParentItems.filter(
      i => (i.totalAvailable || 0) <= (i.minStockLevel || 20)
    ).length

    return {
      warehouseCount: (state.warehouses || []).length,
      skuCount: (state.items || []).length,
      totalOnHand,
      totalAvailable,
      totalInventoryValue,
      expiringLots,
      criticalStockItems
    }
  }, [state.items, state.warehouses, state.lotBatches])

  // Matrix Ebeveyn ve Alt Varyantlar
  const matrixParent = useMemo(
    () => (state.items || []).find(i => i.itemType === "MATRIX_PARENT") || (state.items || [])[0] || null,
    [state.items]
  )
  const matrixVariants = useMemo(
    () => (state.items || []).filter(i => i.parentItemId === matrixParent?.id),
    [state.items, matrixParent]
  )

  // Seçili Lot Kaydı
  const activeLotRecord = useMemo(
    () => (state.lotBatches || []).find(l => l.id === selectedLotId) || (state.lotBatches || [])[0] || null,
    [state.lotBatches, selectedLotId]
  )

  // Çoklu Birim Çevrim Hesabı
  const selectedUomItem = useMemo(
    () => (state.items || []).find(i => i.id === uomItemId) || (state.items || [])[0] || null,
    [state.items, uomItemId]
  )
  const availableUnitsForSelected = useMemo(() => {
    if (!selectedUomItem) return ["Adet"]
    const units = new Set<string>([selectedUomItem.baseUnit || "Adet"])
    ;(selectedUomItem.unitConversions || []).forEach(c => {
      if (c.fromUnit) units.add(c.fromUnit)
      if (c.toUnit) units.add(c.toUnit)
    })
    return Array.from(units)
  }, [selectedUomItem])

  const uomConversionResult = useMemo(() => {
    if (!selectedUomItem) return null
    const qty = Math.max(0.01, Number(uomInputQty) || 1)
    return convertStockUnit(
      qty,
      uomFromUnit,
      uomToUnit,
      selectedUomItem.baseUnit || "Adet",
      selectedUomItem.unitConversions || []
    )
  }, [selectedUomItem, uomInputQty, uomFromUnit, uomToUnit])

  // 4 Yöntemli Maliyet Değerleme Hesabı
  const selectedValItem = useMemo(
    () => (state.items || []).find(i => i.id === valItemId && (i.costLayers?.length ?? 0) > 0) || (state.items || [])[0] || null,
    [state.items, valItemId]
  )
  const valuationComparisons = useMemo(() => {
    if (!selectedValItem) return null
    const issueQty = Math.max(1, Number(valIssueQty) || 50)
    const methods: ValuationMethod[] = ["FIFO", "LIFO", "WEIGHTED_AVERAGE", "STANDARD"]
    return methods.map(method =>
      calculateStockValuation(
        selectedValItem.costLayers || [],
        method,
        selectedValItem.standardCost || 500,
        issueQty
      )
    )
  }, [selectedValItem, valIssueQty])

  // BOM (Reçete) Rollup Hesabı
  const selectedBom = useMemo(
    () => (state.bomRecipes || []).find(b => b.id === selectedBomId) || (state.bomRecipes || [])[0] || null,
    [state.bomRecipes, selectedBomId]
  )
  const bomCalculation = useMemo(() => {
    if (!selectedBom) return null
    return calculateBomRollupCost(selectedBom, Number(bomBatchMultiplier) || 1)
  }, [selectedBom, bomBatchMultiplier])

  // Yeni Stok Kartı Ekleme
  const handleCreateItem = () => {
    if (!newName.trim()) {
      toast.error("Lütfen ürün adını giriniz.")
      return
    }
    const created = enterpriseInventoryService.addInventoryItem({
      sku: newSku.trim() || undefined,
      barcode: newBarcode.trim() || undefined,
      name: newName.trim(),
      category: newCategory,
      valuationMethod: newValuationMethod,
      warehouseId: newWhId,
      initialQty: Number(newInitialQty) || 50,
      standardCost: Number(newUnitCost) || 450,
      salesPrice: Number(newSalesPrice) || 890,
      trackLot: newTrackLot,
      minStockLevel: Number(newMinStock) || 20,
      maxStockLevel: Number(newMaxStock) || 500
    })
    setState({ ...enterpriseInventoryService.getState() })
    setIsAddModalOpen(false)
    setNewName("")
    setNewSku("")
    setNewBarcode("")
    toast.success(`${created.name} başarıyla eklendi!`, {
      description: `Otomatik SKU: ${created.sku} • İlk stok: ${created.totalOnHand} ${created.baseUnit}`
    })
  }

  // Varyant Oluşturma
  const handleGenerateVariant = () => {
    if (!matrixParent) return
    const created = enterpriseInventoryService.generateMatrixVariants({
      parentItemId: matrixParent.id,
      color: variantColor,
      size: variantSize,
      initialQty: Number(variantInitialQty) || 30,
      unitCost: Number(variantUnitCost) || 740,
      salesPrice: Number(variantSalesPrice) || 1390
    })
    if (created) {
      setState({ ...enterpriseInventoryService.getState() })
      toast.success(`Yeni varyant üretildi: ${created.sku}`, {
        description: `Ana kart toplam stoğu ${matrixParent.totalOnHand} adede güncellendi.`
      })
    }
  }

  // Lot Kaydı Oluşturma
  const handleCreateLot = () => {
    const created = enterpriseInventoryService.addLotBatchRecord({
      itemId: newLotItemId,
      lotNumber: newLotNumber.trim() || undefined,
      expiryDate: newLotExpiry,
      initialQty: Number(newLotQty) || 100,
      supplierName: newLotSupplier
    })
    setState({ ...enterpriseInventoryService.getState() })
    setSelectedLotId(created.id)
    setIsLotModalOpen(false)
    toast.success(`Lot/Parti kaydı açıldı: ${created.lotNumber}`, {
      description: `SKT: ${created.expiryDate} • Tedarikçi: ${created.supplierName}`
    })
  }

  const openItemDetails = (item: InventoryItemRecord) => {
    setSelectedItemForDrawer(item)
    setIsDrawerOpen(true)
  }

  return (
    <TooltipProvider>
      <div className="space-y-6 p-4 sm:p-6 max-w-7xl mx-auto">
        {/* 1. ÜST YAPAY ZEKÂ ÖZETİ & HIZLI AKSIYON BARI */}
        <div className="rounded-xl border border-indigo-100 bg-gradient-to-r from-indigo-50/80 via-purple-50/60 to-white p-4 sm:p-5 shadow-sm">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-start gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-indigo-600 text-white shadow">
                <Sparkles className="h-5 w-5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-base font-semibold text-slate-900">Akıllı Stok Özeti & Günlük Görevler</h2>
                  <Badge variant="outline" className="border-indigo-200 bg-white text-indigo-700 text-xs font-medium">
                    AI Asistan
                  </Badge>
                </div>
                <p className="mt-1 text-sm text-slate-600 leading-relaxed">
                  Şu an <span className="font-semibold text-slate-900">{kpiSummary.warehouseCount} depoda</span> toplam <span className="font-semibold text-slate-900">{(kpiSummary.totalOnHand || 0).toLocaleString("tr-TR")} adet</span> ürününüz var.
                  {kpiSummary.criticalStockItems > 0 && (
                    <span className="text-amber-700 font-medium"> {kpiSummary.criticalStockItems} ürün kritik sipariş eşiğinin altında</span>
                  )}
                  {kpiSummary.expiringLots > 0 && (
                    <span className="text-rose-700 font-medium"> ve {kpiSummary.expiringLots} partinin son kullanma tarihi yaklaşıyor</span>
                  )}.
                </p>
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setSearchQuery("")
                  setSelectedItemType("ALL")
                  setActiveTab("lots")
                }}
                className="bg-white hover:bg-slate-50 text-slate-700 border-slate-200"
              >
                <Clock className="mr-1.5 h-4 w-4 text-amber-600" />
                SKT Takibi
              </Button>
              <Button
                size="sm"
                onClick={() => setIsAddModalOpen(true)}
                className="bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm"
              >
                <Plus className="mr-1.5 h-4 w-4" />
                Hızlı Stok Ekle
              </Button>
            </div>
          </div>
        </div>

        {/* 2. BAŞLIK VE MOD GEÇİŞİ (BASİT / UZMAN GÖRÜNÜMÜ) */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b pb-4">
          <div>
            <div className="flex items-center gap-2">
              <Boxes className="h-6 w-6 text-indigo-600" />
              <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900">
                Stok Takip & Envanter Yönetimi
              </h1>
            </div>
            <p className="text-sm text-slate-500 mt-1">
              {isExpertMode
                ? "Uzman Modu: FIFO/LIFO maliyet katmanları, çoklu birim çevrimleri, matrix varyantlar ve BOM reçeteleri devrede."
                : "Sade Görünüm: Tüm temel stok hareketleri, raf lokasyonları ve anlık adetler tek bakışta."}
            </p>
          </div>

          <div className="flex items-center gap-3 bg-slate-50 p-2 rounded-lg border border-slate-200">
            <span className="text-xs font-medium text-slate-600">Sade Görünüm</span>
            <Switch
              checked={isExpertMode}
              onCheckedChange={setIsExpertMode}
              id="expert-mode-toggle"
            />
            <Label htmlFor="expert-mode-toggle" className="text-xs font-semibold text-indigo-700 cursor-pointer flex items-center gap-1">
              <SlidersHorizontal className="h-3.5 w-3.5" />
              Uzman Modu
            </Label>
          </div>
        </div>

        {/* 3. DÖRT NET ÖZET KARTI (EYLEM ODAKLI) */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          <Card className="border-slate-200/80 shadow-xs hover:border-indigo-200 transition-colors">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-slate-500">Mevcut Fiziki Stok</span>
                <Boxes className="h-4 w-4 text-indigo-600" />
              </div>
              <div className="mt-2 flex items-baseline gap-2">
                <span className="text-2xl font-bold text-slate-900">
                  {(kpiSummary.totalOnHand || 0).toLocaleString("tr-TR")}
                </span>
                <span className="text-xs text-slate-500">Adet</span>
              </div>
              <p className="mt-1 text-xs text-slate-500">
                Satılabilir: <strong className="text-emerald-700">{(kpiSummary.totalAvailable || 0).toLocaleString("tr-TR")}</strong>
              </p>
            </CardContent>
          </Card>

          <Card className="border-slate-200/80 shadow-xs hover:border-indigo-200 transition-colors">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-slate-500">Envanter Değeri (FIFO)</span>
                <TrendingUp className="h-4 w-4 text-emerald-600" />
              </div>
              <div className="mt-2 flex items-baseline gap-2">
                <span className="text-2xl font-bold text-slate-900">
                  ₺{Math.round(kpiSummary.totalInventoryValue || 0).toLocaleString("tr-TR")}
                </span>
              </div>
              <p className="mt-1 text-xs text-slate-500">
                {kpiSummary.skuCount} aktif ürün kartı
              </p>
            </CardContent>
          </Card>

          <Card className={`border-slate-200/80 shadow-xs transition-colors ${kpiSummary.criticalStockItems > 0 ? "bg-amber-50/40 border-amber-200" : ""}`}>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-slate-500">Kritik Eşik Uyarısı</span>
                <AlertTriangle className={`h-4 w-4 ${kpiSummary.criticalStockItems > 0 ? "text-amber-600" : "text-slate-400"}`} />
              </div>
              <div className="mt-2 flex items-baseline gap-2">
                <span className={`text-2xl font-bold ${kpiSummary.criticalStockItems > 0 ? "text-amber-700" : "text-slate-900"}`}>
                  {kpiSummary.criticalStockItems}
                </span>
                <span className="text-xs text-slate-500">Ürün azaldı</span>
              </div>
              <p className="mt-1 text-xs text-slate-500">
                Güvenlik stoğunun altında
              </p>
            </CardContent>
          </Card>

          <Card className={`border-slate-200/80 shadow-xs transition-colors ${kpiSummary.expiringLots > 0 ? "bg-rose-50/40 border-rose-200" : ""}`}>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-slate-500">SKT Yaklaşan Partiler</span>
                <Clock className={`h-4 w-4 ${kpiSummary.expiringLots > 0 ? "text-rose-600" : "text-slate-400"}`} />
              </div>
              <div className="mt-2 flex items-baseline gap-2">
                <span className={`text-2xl font-bold ${kpiSummary.expiringLots > 0 ? "text-rose-700" : "text-slate-900"}`}>
                  {kpiSummary.expiringLots}
                </span>
                <span className="text-xs text-slate-500">Parti (15 gün)</span>
              </div>
              <p className="mt-1 text-xs text-slate-500">
                SKT öncelikli çıkış (FEFO) gerekli
              </p>
            </CardContent>
          </Card>
        </div>

        {/* 4. MODÜL SEKMELERİ (SIFIR ÖZELLİK KAYBI) */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
          <div className="flex items-center justify-between overflow-x-auto pb-1">
            <TabsList className="bg-slate-100 p-1">
              <TabsTrigger value="products" className="text-xs sm:text-sm gap-1.5">
                <Boxes className="h-4 w-4" />
                Ürün & Stok Listesi
              </TabsTrigger>
              <TabsTrigger value="variants" className="text-xs sm:text-sm gap-1.5">
                <Layers className="h-4 w-4" />
                Renk/Beden Varyantları
              </TabsTrigger>
              <TabsTrigger value="lots" className="text-xs sm:text-sm gap-1.5">
                <Clock className="h-4 w-4" />
                Lot & SKT Takibi
              </TabsTrigger>
              <TabsTrigger value="units" className="text-xs sm:text-sm gap-1.5">
                <Scale className="h-4 w-4" />
                Birim Çevirici
              </TabsTrigger>
              {isExpertMode && (
                <>
                  <TabsTrigger value="costing" className="text-xs sm:text-sm gap-1.5">
                    <Calculator className="h-4 w-4" />
                    Maliyet Değerleme
                  </TabsTrigger>
                  <TabsTrigger value="bom" className="text-xs sm:text-sm gap-1.5">
                    <PackageCheck className="h-4 w-4" />
                    Ürün Reçetesi (BOM)
                  </TabsTrigger>
                </>
              )}
            </TabsList>

            {!isExpertMode && (
              <span className="text-xs text-slate-400 hidden md:inline">
                *İleri düzey maliyet & BOM araçları için üstten &quot;Uzman Modu&quot;nu açabilirsiniz.
              </span>
            )}
          </div>

          {/* TAB 1: ANA ÜRÜN VE STOK LİSTESİ (SADE & TEMİZ TABLO) */}
          <TabsContent value="products" className="space-y-4">
            {/* Arama ve Filtreleme */}
            <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between bg-white p-3 rounded-lg border border-slate-200">
              <div className="relative flex-1 max-w-md">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <Input
                  placeholder="Ürün adı, barkod veya SKU ara..."
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  className="pl-9 bg-slate-50 border-slate-200"
                />
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <Select value={selectedWarehouseId} onValueChange={setSelectedWarehouseId}>
                  <SelectTrigger className="w-[180px] bg-slate-50 text-xs">
                    <SelectValue placeholder="Tüm Depolar" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ALL">Tüm Depolar</SelectItem>
                    {(state.warehouses || []).map(w => (
                      <SelectItem key={w.id} value={w.id}>
                        {w.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                {isExpertMode && (
                  <Select value={selectedItemType} onValueChange={setSelectedItemType}>
                    <SelectTrigger className="w-[170px] bg-slate-50 text-xs">
                      <SelectValue placeholder="Tüm Tipler" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="ALL">Tüm Kart Tipleri</SelectItem>
                      <SelectItem value="FINISHED_GOOD">Mamul Ürün</SelectItem>
                      <SelectItem value="RAW_MATERIAL">Hammadde</SelectItem>
                      <SelectItem value="MATRIX_PARENT">Matrix Ana Kart</SelectItem>
                      <SelectItem value="MATRIX_VARIANT">Alt Varyant</SelectItem>
                    </SelectContent>
                  </Select>
                )}
              </div>
            </div>

            {/* Sadeleştirilmiş Ana Tablo (Sadece 6 Kritik Sütun) */}
            <div className="rounded-xl border border-slate-200 bg-white overflow-hidden shadow-xs">
              <div className="overflow-x-auto">
                <table className="w-full text-sm text-left">
                  <thead className="bg-slate-50/80 text-xs uppercase text-slate-500 border-b border-slate-200">
                    <tr>
                      <th className="px-4 py-3 font-semibold">Ürün Bilgisi</th>
                      <th className="px-4 py-3 font-semibold">Lokasyon / Depo</th>
                      <th className="px-4 py-3 font-semibold text-right">Stok Miktarı</th>
                      <th className="px-4 py-3 font-semibold text-right">Birim Fiyat</th>
                      <th className="px-4 py-3 font-semibold text-center">Durum</th>
                      <th className="px-4 py-3 font-semibold text-right">Aksiyon</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredItems.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="px-4 py-8 text-center text-slate-400">
                          Arama kriterlerine uygun stok kartı bulunamadı.
                        </td>
                      </tr>
                    ) : (
                      filteredItems.map(item => {
                        const isCritical = (item.totalAvailable || 0) <= (item.minStockLevel || 20)
                        const primaryBalance = (item.warehouseBalances || [])[0]

                        return (
                          <tr
                            key={item.id}
                            className="hover:bg-slate-50/70 cursor-pointer transition-colors group"
                            onClick={() => openItemDetails(item)}
                          >
                            <td className="px-4 py-3.5">
                              <div className="flex items-center gap-3">
                                <div className="h-9 w-9 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold text-xs shrink-0">
                                  {item.itemType === "MATRIX_PARENT" ? (
                                    <Layers className="h-4 w-4" />
                                  ) : item.itemType === "RAW_MATERIAL" ? (
                                    <Boxes className="h-4 w-4" />
                                  ) : (
                                    <PackageCheck className="h-4 w-4" />
                                  )}
                                </div>
                                <div>
                                  <div className="font-semibold text-slate-900 group-hover:text-indigo-600 transition-colors">
                                    {item.name}
                                  </div>
                                  <div className="text-xs text-slate-400 flex items-center gap-2 mt-0.5">
                                    <span>{item.sku}</span>
                                    <span>•</span>
                                    <span>{item.category}</span>
                                    {item.barcode && (
                                      <>
                                        <span>•</span>
                                        <span className="font-mono text-[11px]">{item.barcode}</span>
                                      </>
                                    )}
                                  </div>
                                </div>
                              </div>
                            </td>

                            <td className="px-4 py-3.5 text-slate-600 text-xs">
                              {primaryBalance ? (
                                <div>
                                  <div className="font-medium text-slate-800">{primaryBalance.warehouseName}</div>
                                  <div className="text-slate-400 font-mono text-[11px]">{primaryBalance.binCode || "Genel Raf"}</div>
                                </div>
                              ) : (
                                <span className="text-slate-400">Depo atanmadı</span>
                              )}
                            </td>

                            <td className="px-4 py-3.5 text-right">
                              <div className="font-bold text-slate-900">
                                {(item.totalOnHand || 0).toLocaleString("tr-TR")} {item.baseUnit}
                              </div>
                              <div className="text-xs text-slate-400">
                                Net Satılabilir: {(item.totalAvailable || 0).toLocaleString("tr-TR")}
                              </div>
                            </td>

                            <td className="px-4 py-3.5 text-right">
                              <div className="font-medium text-slate-900">
                                ₺{(item.salesPrice || 0).toLocaleString("tr-TR")}
                              </div>
                              {isExpertMode && (
                                <div className="text-xs text-slate-400">
                                  Maliyet: ₺{(item.fifoUnitCost || 0).toLocaleString("tr-TR")}
                                </div>
                              )}
                            </td>

                            <td className="px-4 py-3.5 text-center">
                              {isCritical ? (
                                <Badge variant="outline" className="border-amber-300 bg-amber-50 text-amber-800 text-[11px]">
                                  Kritik Azalan
                                </Badge>
                              ) : (
                                <Badge variant="outline" className="border-emerald-200 bg-emerald-50 text-emerald-700 text-[11px]">
                                  Yeterli Stok
                                </Badge>
                              )}
                            </td>

                            <td className="px-4 py-3.5 text-right">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={(e) => {
                                  e.stopPropagation()
                                  openItemDetails(item)
                                }}
                                className="h-8 px-2.5 text-indigo-600 hover:text-indigo-800 hover:bg-indigo-50"
                              >
                                Detay
                                <ChevronRight className="ml-1 h-3.5 w-3.5" />
                              </Button>
                            </td>
                          </tr>
                        )
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </TabsContent>

          {/* TAB 2: MATRIX VARYANT SİHİRBAZI */}
          <TabsContent value="variants" className="space-y-4">
            <Card className="border-slate-200">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-base flex items-center gap-2">
                      <Layers className="h-4 w-4 text-indigo-600" />
                      Renk ve Beden Matrix Varyant Üretici
                    </CardTitle>
                    <CardDescription>
                      Ebeveyn stok kartı altında saniyeler içinde yeni renk ve beden kombinasyonları üretin. Ana kart stoğu otomatik toplanır (Auto-Rollup).
                    </CardDescription>
                  </div>
                  {matrixParent && (
                    <Badge variant="secondary" className="bg-indigo-50 text-indigo-700 font-mono">
                      Ana Kart: {matrixParent.sku} ({matrixParent.totalOnHand} Adet)
                    </Badge>
                  )}
                </div>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-3 p-4 bg-slate-50 rounded-xl border border-slate-200">
                  <div>
                    <Label className="text-xs">Varyant Rengi</Label>
                    <Input
                      value={variantColor}
                      onChange={e => setVariantColor(e.target.value)}
                      placeholder="Örn: Zümrüt Yeşili"
                      className="mt-1 bg-white"
                    />
                  </div>
                  <div>
                    <Label className="text-xs">Beden / Boyut</Label>
                    <Input
                      value={variantSize}
                      onChange={e => setVariantSize(e.target.value)}
                      placeholder="Örn: XL, Standart"
                      className="mt-1 bg-white"
                    />
                  </div>
                  <div>
                    <Label className="text-xs">İlk Stok Adedi</Label>
                    <Input
                      type="number"
                      value={variantInitialQty}
                      onChange={e => setVariantInitialQty(e.target.value)}
                      className="mt-1 bg-white"
                    />
                  </div>
                  <div>
                    <Label className="text-xs">Satış Fiyatı (₺)</Label>
                    <Input
                      type="number"
                      value={variantSalesPrice}
                      onChange={e => setVariantSalesPrice(e.target.value)}
                      className="mt-1 bg-white"
                    />
                  </div>
                  <div className="flex items-end">
                    <Button onClick={handleGenerateVariant} className="w-full bg-indigo-600 hover:bg-indigo-700 text-white">
                      <Plus className="mr-1.5 h-4 w-4" />
                      Varyantı Üret
                    </Button>
                  </div>
                </div>

                <div>
                  <h4 className="text-xs font-semibold text-slate-700 uppercase tracking-wider mb-2">
                    Mevcut Varyantlar ({matrixVariants.length} adet)
                  </h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                    {matrixVariants.map(v => (
                      <div key={v.id} className="p-3 bg-white border border-slate-200 rounded-lg flex items-center justify-between">
                        <div>
                          <div className="font-semibold text-slate-900 text-sm">{v.name}</div>
                          <div className="text-xs text-slate-500 font-mono mt-0.5">{v.sku}</div>
                          <div className="flex items-center gap-2 mt-1">
                            <Badge variant="outline" className="text-[10px]">
                              {v.variantAttributes?.renk || "-"}
                            </Badge>
                            <Badge variant="outline" className="text-[10px]">
                              {v.variantAttributes?.beden || "-"}
                            </Badge>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="text-base font-bold text-indigo-700">{v.totalOnHand} Adet</div>
                          <div className="text-xs text-slate-500">₺{v.salesPrice}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* TAB 3: LOT & SKT TAKİBİ (FEFO SOYKÜTÜĞÜ) */}
          <TabsContent value="lots" className="space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <div>
                <h3 className="text-base font-semibold text-slate-900">Lot, Seri No ve SKT Takip Merkezi</h3>
                <p className="text-xs text-slate-500">
                  Son Kullanma Tarihi (SKT) ve partilerin tedarikçiden depoya, raftan sevkiyata tüm geçmişi (FEFO).
                </p>
              </div>
              <Button onClick={() => setIsLotModalOpen(true)} className="bg-indigo-600 hover:bg-indigo-700 text-white">
                <Plus className="mr-1.5 h-4 w-4" />
                Yeni Lot / Parti Girişi
              </Button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Lot Listesi */}
              <div className="md:col-span-1 space-y-2">
                <div className="text-xs font-semibold uppercase text-slate-500 px-1">Aktif Partiler</div>
                <div className="space-y-2 max-h-[500px] overflow-y-auto pr-1">
                  {(state.lotBatches || []).map(lot => {
                    const isSelected = lot.id === selectedLotId
                    const isExpiring = lot.daysUntilExpiry <= 15
                    return (
                      <div
                        key={lot.id}
                        onClick={() => setSelectedLotId(lot.id)}
                        className={`p-3 rounded-lg border cursor-pointer transition-all ${
                          isSelected
                            ? "border-indigo-600 bg-indigo-50/40 shadow-xs"
                            : "border-slate-200 bg-white hover:border-slate-300"
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-mono text-xs font-bold text-slate-900">{lot.lotNumber}</span>
                          {isExpiring ? (
                            <Badge variant="outline" className="border-rose-300 bg-rose-50 text-rose-700 text-[10px]">
                              {lot.daysUntilExpiry} Gün Kaldı
                            </Badge>
                          ) : (
                            <Badge variant="outline" className="border-emerald-200 bg-emerald-50 text-emerald-700 text-[10px]">
                              SKT Güvenli
                            </Badge>
                          )}
                        </div>
                        <div className="mt-1 text-xs text-slate-700 font-medium truncate">{lot.itemName}</div>
                        <div className="mt-1 flex items-center justify-between text-[11px] text-slate-400">
                          <span>Kalan: <strong>{lot.remainingQty} {lot.unit}</strong></span>
                          <span>SKT: {lot.expiryDate}</span>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>

              {/* Seçili Lot Detayı & İzlenebilirlik Soykütüğü */}
              <div className="md:col-span-2">
                {activeLotRecord ? (
                  <Card className="border-slate-200">
                    <CardHeader className="pb-3 border-b">
                      <div className="flex items-center justify-between">
                        <div>
                          <CardTitle className="text-base flex items-center gap-2">
                            <Barcode className="h-4 w-4 text-indigo-600" />
                            Parti Detayı: {activeLotRecord.lotNumber}
                          </CardTitle>
                          <CardDescription>
                            {activeLotRecord.itemName} • Tedarikçi: {activeLotRecord.supplierName}
                          </CardDescription>
                        </div>
                        <Badge className="bg-indigo-600 text-white font-mono text-xs">
                          {activeLotRecord.remainingQty} {activeLotRecord.unit} Kalan
                        </Badge>
                      </div>
                    </CardHeader>
                    <CardContent className="pt-4 space-y-4">
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-slate-50 p-3 rounded-lg text-xs">
                        <div>
                          <span className="text-slate-400 block">Depo / Raf:</span>
                          <span className="font-semibold text-slate-800">{activeLotRecord.warehouseName}</span>
                          <span className="block font-mono text-slate-500 text-[10px]">{activeLotRecord.binCode}</span>
                        </div>
                        <div>
                          <span className="text-slate-400 block">Üretim Tarihi:</span>
                          <span className="font-semibold text-slate-800">{activeLotRecord.manufacturingDate}</span>
                        </div>
                        <div>
                          <span className="text-slate-400 block">Son Kullanma:</span>
                          <span className="font-semibold text-rose-700">{activeLotRecord.expiryDate}</span>
                        </div>
                        <div>
                          <span className="text-slate-400 block">Kalite Kontrol:</span>
                          <span className="font-semibold text-emerald-700 flex items-center gap-1">
                            <CheckCircle2 className="h-3 w-3" />
                            {activeLotRecord.qcStatus}
                          </span>
                        </div>
                      </div>

                      <div>
                        <h4 className="text-xs font-semibold text-slate-700 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                          <History className="h-3.5 w-3.5 text-indigo-600" />
                          Uçtan Uca İzlenebilirlik Olayları (Traceability)
                        </h4>
                        <div className="border-l-2 border-indigo-200 ml-2 pl-4 space-y-3">
                          {(activeLotRecord.events || []).map(ev => (
                            <div key={ev.id} className="relative text-xs">
                              <div className="absolute -left-[21px] top-1 h-2.5 w-2.5 rounded-full bg-indigo-600 ring-4 ring-white" />
                              <div className="font-semibold text-slate-800">{ev.title}</div>
                              <div className="text-[11px] text-slate-400">{ev.eventDate} • {ev.operatorName}</div>
                              <div className="text-slate-600 mt-0.5">
                                {ev.fromLocation} → {ev.toLocation} ({ev.quantity} {ev.unit})
                              </div>
                              <div className="text-slate-500 italic mt-0.5 text-[11px]">&quot;{ev.notes}&quot;</div>
                            </div>
                          ))}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ) : (
                  <div className="h-64 flex items-center justify-center border border-dashed rounded-lg text-slate-400 text-sm">
                    Görüntülemek için bir parti seçiniz.
                  </div>
                )}
              </div>
            </div>
          </TabsContent>

          {/* TAB 4: ÇOKLU BİRİM ÇEVİRİCİ */}
          <TabsContent value="units" className="space-y-4">
            <Card className="border-slate-200">
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <Scale className="h-4 w-4 text-indigo-600" />
                  Çoklu Birim Çevrim ve Paketleme Hesaplayıcı
                </CardTitle>
                <CardDescription>
                  Koli, Palet, Paket ve Adet arasındaki dönüşümleri ve barkod kurallarını anında hesaplayın.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 p-4 bg-slate-50 rounded-xl border border-slate-200">
                  <div>
                    <Label className="text-xs">Ürün Seçiniz</Label>
                    <Select value={uomItemId} onValueChange={setUomItemId}>
                      <SelectTrigger className="mt-1 bg-white">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {(state.items || []).map(item => (
                          <SelectItem key={item.id} value={item.id}>
                            {item.name} ({item.sku})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label className="text-xs">Çevrilecek Miktar</Label>
                    <Input
                      type="number"
                      value={uomInputQty}
                      onChange={e => setUomInputQty(e.target.value)}
                      className="mt-1 bg-white"
                    />
                  </div>

                  <div>
                    <Label className="text-xs">Kaynak Birim</Label>
                    <Select value={uomFromUnit} onValueChange={setUomFromUnit}>
                      <SelectTrigger className="mt-1 bg-white">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {availableUnitsForSelected.map(u => (
                          <SelectItem key={u} value={u}>{u}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label className="text-xs">Hedef Birim</Label>
                    <Select value={uomToUnit} onValueChange={setUomToUnit}>
                      <SelectTrigger className="mt-1 bg-white">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {availableUnitsForSelected.map(u => (
                          <SelectItem key={u} value={u}>{u}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {uomConversionResult && (
                  <div className="p-4 bg-indigo-50/60 border border-indigo-100 rounded-xl flex flex-col sm:flex-row items-center justify-between gap-4">
                    <div>
                      <div className="text-xs text-indigo-700 font-semibold uppercase tracking-wider">Çevrim Sonucu</div>
                      <div className="text-2xl font-bold text-slate-900 mt-1">
                        {uomInputQty} {uomFromUnit} = <span className="text-indigo-600">{uomConversionResult.convertedQuantity} {uomToUnit}</span>
                      </div>
                      <div className="text-xs text-slate-500 mt-1">
                        {uomConversionResult.conversionFormula} • Toplam Hacim: {uomConversionResult.totalVolumeM3.toFixed(3)} m³ • Ağırlık: {uomConversionResult.totalWeightKg.toFixed(1)} kg
                      </div>
                    </div>
                    {uomConversionResult.packagingBarcode && (
                      <div className="bg-white p-3 rounded-lg border border-indigo-100 text-center">
                        <span className="text-[10px] text-slate-400 block">Koli/Paket Barkodu (ITF-14)</span>
                        <span className="font-mono text-xs font-bold text-slate-800">{uomConversionResult.packagingBarcode}</span>
                      </div>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* TAB 5: UZMAN MODU — MALİYET DEĞERLEME (FIFO / LIFO / ORTALAMA) */}
          {isExpertMode && (
            <TabsContent value="costing" className="space-y-4">
              <Card className="border-slate-200">
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2">
                    <Calculator className="h-4 w-4 text-indigo-600" />
                    4 Yöntemli Stok Maliyeti ve Kâr/Zarar Simülatörü
                  </CardTitle>
                  <CardDescription>
                    İlk Giren İlk Çıkar (FIFO), Son Giren İlk Çıkar (LIFO), Ağırlıklı Ortalama ve Standart Maliyet yöntemlerini tek ekranda karşılaştırın.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-4 bg-slate-50 rounded-xl border border-slate-200">
                    <div>
                      <Label className="text-xs">Değerlenecek Ürün</Label>
                      <Select value={valItemId} onValueChange={setValItemId}>
                        <SelectTrigger className="mt-1 bg-white">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {(state.items || []).map(item => (
                            <SelectItem key={item.id} value={item.id}>
                              {item.name} ({item.sku})
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label className="text-xs">Çıkış / Satış Yapılacak Miktar (Adet)</Label>
                      <Input
                        type="number"
                        value={valIssueQty}
                        onChange={e => setValIssueQty(e.target.value)}
                        className="mt-1 bg-white"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    {valuationComparisons?.map(res => (
                      <div
                        key={res.method}
                        className={`p-4 rounded-xl border ${
                          res.method === selectedValItem?.valuationMethod
                            ? "border-indigo-600 bg-indigo-50/30 ring-2 ring-indigo-600/20"
                            : "border-slate-200 bg-white"
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-slate-800 text-sm">{res.methodName}</span>
                          {res.method === selectedValItem?.valuationMethod && (
                            <Badge className="bg-indigo-600 text-white text-[10px]">Aktif</Badge>
                          )}
                        </div>
                        <div className="mt-3">
                          <span className="text-[11px] text-slate-400 block">Birim Çıkış Maliyeti</span>
                          <span className="text-xl font-bold text-slate-900">₺{res.unitCogs.toFixed(2)}</span>
                        </div>
                        <div className="mt-2 text-xs text-slate-600">
                          Toplam Maliyet: <strong>₺{Math.round(res.totalCogs || 0).toLocaleString("tr-TR")}</strong>
                        </div>
                        <div className="mt-1 text-xs text-slate-500">
                          Kalan Stok Değeri: ₺{Math.round(res.endingInventoryValue || 0).toLocaleString("tr-TR")}
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          )}

          {/* TAB 6: UZMAN MODU — BOM (REÇETE & ROLLUP) */}
          {isExpertMode && (
            <TabsContent value="bom" className="space-y-4">
              <Card className="border-slate-200">
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2">
                    <PackageCheck className="h-4 w-4 text-indigo-600" />
                    Ürün Reçetesi (BOM) ve Katmanlı Maliyet Yansıtma
                  </CardTitle>
                  <CardDescription>
                    Hammadde, ambalaj, doğrudan işçilik ve genel üretim giderlerini (GÜG) otomatik toplayarak 1 adet bitmiş ürün maliyetini hesaplar.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-4 bg-slate-50 rounded-xl border border-slate-200">
                    <div>
                      <Label className="text-xs">Üretim Reçetesi Seçin</Label>
                      <Select value={selectedBomId} onValueChange={setSelectedBomId}>
                        <SelectTrigger className="mt-1 bg-white">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {(state.bomRecipes || []).map(b => (
                            <SelectItem key={b.id} value={b.id}>
                              {b.recipeName} ({b.finishedGoodSku})
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label className="text-xs">Parti / Üretim Çarpanı (Adet)</Label>
                      <Input
                        type="number"
                        value={bomBatchMultiplier}
                        onChange={e => setBomBatchMultiplier(e.target.value)}
                        className="mt-1 bg-white"
                      />
                    </div>
                  </div>

                  {bomCalculation && (
                    <div className="space-y-4">
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-indigo-50/50 p-4 rounded-xl border border-indigo-100">
                        <div>
                          <span className="text-slate-500 text-xs block">Hammadde Maliyeti:</span>
                          <span className="font-bold text-slate-900 text-base">₺{bomCalculation.materialCost.toFixed(2)}</span>
                        </div>
                        <div>
                          <span className="text-slate-500 text-xs block">İşçilik Gideri:</span>
                          <span className="font-bold text-slate-900 text-base">₺{bomCalculation.laborCost.toFixed(2)}</span>
                        </div>
                        <div>
                          <span className="text-slate-500 text-xs block">Genel Üretim (GÜG):</span>
                          <span className="font-bold text-slate-900 text-base">₺{bomCalculation.overheadCost.toFixed(2)}</span>
                        </div>
                        <div>
                          <span className="text-indigo-700 text-xs font-semibold block">1 Adet Toplam Maliyet:</span>
                          <span className="font-extrabold text-indigo-700 text-xl">₺{bomCalculation.totalUnitCost.toFixed(2)}</span>
                        </div>
                      </div>

                      <div>
                        <h4 className="text-xs font-semibold text-slate-700 uppercase tracking-wider mb-2">
                          Reçete Kalemleri & Girdiler ({selectedBom?.lines?.length || 0} bileşen)
                        </h4>
                        <div className="border border-slate-200 rounded-lg overflow-hidden">
                          <table className="w-full text-xs text-left">
                            <thead className="bg-slate-50 text-slate-500 border-b">
                              <tr>
                                <th className="p-2.5">Bileşen Adı</th>
                                <th className="p-2.5">Tip</th>
                                <th className="p-2.5 text-right">Gereken Miktar</th>
                                <th className="p-2.5 text-right">Fire Oranı</th>
                                <th className="p-2.5 text-right">Birim Fiyat</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                              {(selectedBom?.lines || []).map(line => (
                                <tr key={line.id}>
                                  <td className="p-2.5 font-medium text-slate-900">{line.componentName} ({line.sku})</td>
                                  <td className="p-2.5 text-slate-500">{line.componentType}</td>
                                  <td className="p-2.5 text-right font-bold text-slate-800">{line.quantityPerUnit} {line.unit}</td>
                                  <td className="p-2.5 text-right text-slate-500">%{line.scrapPercentage}</td>
                                  <td className="p-2.5 text-right text-slate-900">₺{line.unitCost}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          )}
        </Tabs>

        {/* 5. AŞAMALI GÖSTERİM (PROGRESSIVE DISCLOSURE) YENİ STOK KARTI MODALI */}
        <Dialog open={isAddModalOpen} onOpenChange={setIsAddModalOpen}>
          <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Boxes className="h-5 w-5 text-indigo-600" />
                Hızlı Stok Kartı Aç
              </DialogTitle>
              <DialogDescription>
                Temel bilgileri girmeniz yeterlidir. Sistem barkod, maliyet ve depo adreslerini akıllı varsayılanlarla otomatik tamamlar.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-2">
              {/* Temel Katman (Herkes için zorunlu 3-4 alan) */}
              <div className="space-y-3 bg-slate-50 p-3.5 rounded-xl border border-slate-200">
                <div>
                  <Label className="text-xs font-semibold text-slate-700">Ürün Adı *</Label>
                  <Input
                    placeholder="Örn: Ekvador Kırmızı Gül (Buket)"
                    value={newName}
                    onChange={e => setNewName(e.target.value)}
                    className="mt-1 bg-white"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label className="text-xs font-semibold text-slate-700">Ürün Kategorisi</Label>
                    <Input
                      value={newCategory}
                      onChange={e => setNewCategory(e.target.value)}
                      className="mt-1 bg-white"
                    />
                  </div>
                  <div>
                    <Label className="text-xs font-semibold text-slate-700">Ana Depo</Label>
                    <Select value={newWhId} onValueChange={setNewWhId}>
                      <SelectTrigger className="mt-1 bg-white">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {(state.warehouses || []).map(w => (
                          <SelectItem key={w.id} value={w.id}>{w.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label className="text-xs font-semibold text-slate-700">Başlangıç Stok Adedi</Label>
                    <Input
                      type="number"
                      value={newInitialQty}
                      onChange={e => setNewInitialQty(e.target.value)}
                      className="mt-1 bg-white"
                    />
                  </div>
                  <div>
                    <Label className="text-xs font-semibold text-slate-700">Satış Fiyatı (₺)</Label>
                    <Input
                      type="number"
                      value={newSalesPrice}
                      onChange={e => setNewSalesPrice(e.target.value)}
                      className="mt-1 bg-white"
                    />
                  </div>
                </div>
              </div>

              {/* Gelişmiş Ayarlar (Akordeon: İhtiyaç duymadıkça gizli) */}
              <Accordion type="single" collapsible className="w-full">
                <AccordionItem value="advanced" className="border rounded-xl px-3 bg-white">
                  <AccordionTrigger className="text-xs font-semibold text-indigo-700 hover:no-underline py-2.5">
                    <span className="flex items-center gap-1.5">
                      <SlidersHorizontal className="h-3.5 w-3.5" />
                      Gelişmiş Ayarlar (SKU, Barkod, Lot Takibi, Maliyet Yöntemi)
                    </span>
                  </AccordionTrigger>
                  <AccordionContent className="space-y-3 pt-2 text-xs">
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <Label className="text-[11px] text-slate-600">Özel SKU (Boşsa otomatik)</Label>
                        <Input
                          placeholder="SKU-2026-..."
                          value={newSku}
                          onChange={e => setNewSku(e.target.value)}
                          className="mt-1"
                        />
                      </div>
                      <div>
                        <Label className="text-[11px] text-slate-600">Özel Barkod (EAN-13)</Label>
                        <Input
                          placeholder="869000..."
                          value={newBarcode}
                          onChange={e => setNewBarcode(e.target.value)}
                          className="mt-1"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <Label className="text-[11px] text-slate-600">Birim Alış/Maliyet (₺)</Label>
                        <Input
                          type="number"
                          value={newUnitCost}
                          onChange={e => setNewUnitCost(e.target.value)}
                          className="mt-1"
                        />
                      </div>
                      <div>
                        <Label className="text-[11px] text-slate-600">Maliyet Değerleme Yöntemi</Label>
                        <Select value={newValuationMethod} onValueChange={(val: any) => setNewValuationMethod(val)}>
                          <SelectTrigger className="mt-1">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="FIFO">FIFO (İlk Giren İlk Çıkar)</SelectItem>
                            <SelectItem value="LIFO">LIFO (Son Giren İlk Çıkar)</SelectItem>
                            <SelectItem value="WEIGHTED_AVERAGE">Ağırlıklı Ortalama</SelectItem>
                            <SelectItem value="STANDARD">Standart Maliyet</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <Label className="text-[11px] text-slate-600">Güvenlik Stoğu (Min Adet)</Label>
                        <Input
                          type="number"
                          value={newMinStock}
                          onChange={e => setNewMinStock(e.target.value)}
                          className="mt-1"
                        />
                      </div>
                      <div className="flex items-center justify-between pt-5">
                        <Label className="text-[11px] text-slate-700">Lot/Parti Takibi Yapılsın mı?</Label>
                        <Switch checked={newTrackLot} onCheckedChange={setNewTrackLot} />
                      </div>
                    </div>
                  </AccordionContent>
                </AccordionItem>
              </Accordion>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setIsAddModalOpen(false)}>Vazgeç</Button>
              <Button onClick={handleCreateItem} className="bg-indigo-600 hover:bg-indigo-700 text-white">
                Stok Kartını Oluştur
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* 6. SAĞDAN AÇILAN DERİN VERİ ÇEKMECESİ (SLIDE-OVER DRAWER) */}
        <Sheet open={isDrawerOpen} onOpenChange={setIsDrawerOpen}>
          <SheetContent side="right" className="w-full sm:max-w-xl overflow-y-auto p-6">
            {selectedItemForDrawer && (
              <div className="space-y-6">
                <SheetHeader>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="border-indigo-200 bg-indigo-50 text-indigo-700">
                      {selectedItemForDrawer.category}
                    </Badge>
                    <span className="font-mono text-xs text-slate-400">{selectedItemForDrawer.sku}</span>
                  </div>
                  <SheetTitle className="text-xl font-bold text-slate-900 mt-1">
                    {selectedItemForDrawer.name}
                  </SheetTitle>
                  <SheetDescription className="font-mono text-xs">
                    Barkod: {selectedItemForDrawer.barcode} • Vergi Oranı: %{selectedItemForDrawer.taxRate}
                  </SheetDescription>
                </SheetHeader>

                {/* Özet Adetler */}
                <div className="grid grid-cols-3 gap-2 bg-slate-50 p-3 rounded-xl border border-slate-200 text-center">
                  <div>
                    <span className="text-[11px] text-slate-400 block">Fiziki Stok</span>
                    <span className="text-lg font-bold text-slate-900">
                      {selectedItemForDrawer.totalOnHand} {selectedItemForDrawer.baseUnit}
                    </span>
                  </div>
                  <div>
                    <span className="text-[11px] text-slate-400 block">Rezerve</span>
                    <span className="text-lg font-bold text-amber-700">
                      {selectedItemForDrawer.totalReserved} {selectedItemForDrawer.baseUnit}
                    </span>
                  </div>
                  <div>
                    <span className="text-[11px] text-slate-400 block">Satılabilir (ATP)</span>
                    <span className="text-lg font-bold text-emerald-700">
                      {selectedItemForDrawer.totalAvailable} {selectedItemForDrawer.baseUnit}
                    </span>
                  </div>
                </div>

                {/* Derin Sekmeler */}
                <Tabs defaultValue="warehouses" className="space-y-3">
                  <TabsList className="w-full grid grid-cols-3 bg-slate-100 p-1">
                    <TabsTrigger value="warehouses" className="text-xs">Depolar & Raflar</TabsTrigger>
                    <TabsTrigger value="costlayers" className="text-xs">Maliyet Katmanları</TabsTrigger>
                    <TabsTrigger value="units" className="text-xs">Birim Çevrimleri</TabsTrigger>
                  </TabsList>

                  {/* Depo Dağılımı */}
                  <TabsContent value="warehouses" className="space-y-2">
                    <div className="text-xs font-semibold text-slate-700 mb-1">Depo Dağılım Listesi</div>
                    {(selectedItemForDrawer.warehouseBalances || []).map(b => (
                      <div key={b.warehouseId} className="p-3 bg-white border border-slate-200 rounded-lg flex items-center justify-between text-xs">
                        <div>
                          <div className="font-semibold text-slate-900">{b.warehouseName}</div>
                          <div className="text-slate-400 font-mono text-[11px]">Hücre: {b.binCode}</div>
                        </div>
                        <div className="text-right">
                          <div className="font-bold text-indigo-700 text-sm">{b.onHandQty} {selectedItemForDrawer.baseUnit}</div>
                          <div className="text-[11px] text-slate-400">Rezerve: {b.reservedQty}</div>
                        </div>
                      </div>
                    ))}
                  </TabsContent>

                  {/* Maliyet Katmanları */}
                  <TabsContent value="costlayers" className="space-y-2">
                    <div className="text-xs font-semibold text-slate-700 mb-1">Giriş / Mal Kabul Katmanları (FIFO)</div>
                    {(selectedItemForDrawer.costLayers || []).map(l => (
                      <div key={l.id} className="p-3 bg-white border border-slate-200 rounded-lg text-xs space-y-1">
                        <div className="flex items-center justify-between">
                          <span className="font-mono font-bold text-slate-800">{l.receiptDocNo}</span>
                          <span className="font-bold text-emerald-700">₺{l.unitCost} / adet</span>
                        </div>
                        <div className="flex items-center justify-between text-slate-500 text-[11px]">
                          <span>Kalan: {l.remainingQty} / {l.initialQty}</span>
                          <span>Parti: {l.lotNumber}</span>
                          <span>{l.layerDate}</span>
                        </div>
                      </div>
                    ))}
                  </TabsContent>

                  {/* Çoklu Birim */}
                  <TabsContent value="units" className="space-y-2">
                    <div className="text-xs font-semibold text-slate-700 mb-1">Paketleme & Koli Katsayıları</div>
                    {(selectedItemForDrawer.unitConversions || []).map(c => (
                      <div key={c.id} className="p-3 bg-white border border-slate-200 rounded-lg text-xs flex items-center justify-between">
                        <div>
                          <div className="font-semibold text-slate-800">
                            1 {c.fromUnit} = {c.multiplier} {c.toUnit}
                          </div>
                          <div className="text-slate-400 text-[11px] font-mono">Barkod: {c.barcode}</div>
                        </div>
                        <div className="text-right text-[11px] text-slate-500">
                          <div>{c.weightKg} kg</div>
                          <div>{c.volumeM3} m³</div>
                        </div>
                      </div>
                    ))}
                  </TabsContent>
                </Tabs>

                {/* Hızlı Aksiyonlar */}
                <div className="pt-4 border-t flex gap-2">
                  <Button
                    variant="outline"
                    className="flex-1 text-xs"
                    onClick={() => {
                      setIsDrawerOpen(false)
                      setUomItemId(selectedItemForDrawer.id)
                      setActiveTab("units")
                    }}
                  >
                    Birim Dönüştür
                  </Button>
                  <Button
                    className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white text-xs"
                    onClick={() => {
                      setIsDrawerOpen(false)
                      toast.info(`${selectedItemForDrawer.name} için sayım fişi planlandı.`)
                    }}
                  >
                    Hızlı Sayım Başlat
                  </Button>
                </div>
              </div>
            )}
          </SheetContent>
        </Sheet>

        {/* 7. YENİ LOT / PARTİ GİRİŞİ MODALI */}
        <Dialog open={isLotModalOpen} onOpenChange={setIsLotModalOpen}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Clock className="h-5 w-5 text-indigo-600" />
                Yeni Lot / Parti Kaydı (SKT)
              </DialogTitle>
              <DialogDescription>
                Gelen sevkiyat için parti numarası ve son kullanma tarihini sisteme kaydedin.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-3 py-2 text-xs">
              <div>
                <Label className="text-xs">İlgili Ürün</Label>
                <Select value={newLotItemId} onValueChange={setNewLotItemId}>
                  <SelectTrigger className="mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {(state.items || []).map(i => (
                      <SelectItem key={i.id} value={i.id}>{i.name} ({i.sku})</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label className="text-xs">Parti / Lot Numarası (Boşsa otomatik)</Label>
                <Input
                  placeholder="LOT-2026-..."
                  value={newLotNumber}
                  onChange={e => setNewLotNumber(e.target.value)}
                  className="mt-1"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-xs">Son Kullanma Tarihi (SKT)</Label>
                  <Input
                    type="date"
                    value={newLotExpiry}
                    onChange={e => setNewLotExpiry(e.target.value)}
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label className="text-xs">Gelen Miktar</Label>
                  <Input
                    type="number"
                    value={newLotQty}
                    onChange={e => setNewLotQty(e.target.value)}
                    className="mt-1"
                  />
                </div>
              </div>

              <div>
                <Label className="text-xs">Tedarikçi Firma</Label>
                <Input
                  value={newLotSupplier}
                  onChange={e => setNewLotSupplier(e.target.value)}
                  className="mt-1"
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsLotModalOpen(false)}>Vazgeç</Button>
              <Button onClick={handleCreateLot} className="bg-indigo-600 hover:bg-indigo-700 text-white">
                Partiyi Kaydet
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </TooltipProvider>
  )
}
