"use client"

import React, { useState, useEffect, useMemo } from "react"
import Link from "next/link"
import {
  Boxes,
  Warehouse,
  Layers,
  QrCode,
  Scale,
  Calculator,
  Plus,
  Search,
  CheckCircle2,
  AlertTriangle,
  Clock,
  ArrowRightLeft,
  GitBranch,
  ShieldAlert,
  Sparkles,
  PackageCheck,
  TrendingUp,
  RefreshCw,
  FileSpreadsheet,
  ChevronRight,
  Barcode
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
import { Label } from "@/components/ui/label"
import { toast } from "sonner"
import {
  enterpriseInventoryService,
  calculateStockValuation,
  calculateBomRollupCost,
  convertStockUnit
} from "@/lib/services/enterpriseInventorySuite"
import type { ValuationMethod } from "@/lib/services/inventoryValuationEngine"

export default function CoreInventoryArchitecturePage() {
  const [state, setState] = useState(() => enterpriseInventoryService.getState())
  const [activeTab, setActiveTab] = useState("multi-warehouse")
  const [searchQuery, setSearchQuery] = useState("")
  const [selectedWarehouseId, setSelectedWarehouseId] = useState<string>("ALL")
  const [selectedItemType, setSelectedItemType] = useState<string>("ALL")

  // Yeni Stok Kartı Modal
  const [isAddModalOpen, setIsAddModalOpen] = useState(false)
  const [newSku, setNewSku] = useState("")
  const [newName, setNewName] = useState("")
  const [newCategory, setNewCategory] = useState("Buket & Aranjman")
  const [newValuationMethod, setNewValuationMethod] = useState<ValuationMethod>("FIFO")
  const [newWhId, setNewWhId] = useState("wh-ist-main")
  const [newInitialQty, setNewInitialQty] = useState("120")
  const [newUnitCost, setNewUnitCost] = useState("450")
  const [newSalesPrice, setNewSalesPrice] = useState("890")

  // Matrix Varyant Üretici State
  const [variantColor, setVariantColor] = useState("Zümrüt Yeşili")
  const [variantSize, setVariantSize] = useState("XL")
  const [variantInitialQty, setVariantInitialQty] = useState("40")
  const [variantUnitCost, setVariantUnitCost] = useState("740")
  const [variantSalesPrice, setVariantSalesPrice] = useState("1390")

  // Lot/SKT Soykütüğü (Traceability) State
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

  // BOM & Maliyet Değerleme Motoru State
  const [valItemId, setValItemId] = useState("item-001")
  const [valIssueQty, setValIssueQty] = useState("220")
  const [selectedBomId, setSelectedBomId] = useState("bom-001")
  const [bomBatchMultiplier, setBomBatchMultiplier] = useState("10")

  useEffect(() => {
    const refresh = () => setState({ ...enterpriseInventoryService.getState() })
    window.addEventListener("sunum-inventory-change", refresh)
    return () => window.removeEventListener("sunum-inventory-change", refresh)
  }, [])

  const filteredItems = useMemo(() => {
      const items = state.items || []
      return items.filter(item => {
        const matchesSearch =
          item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          item.sku.toLowerCase().includes(searchQuery.toLowerCase()) ||
          item.barcode.includes(searchQuery) ||
          item.category.toLowerCase().includes(searchQuery.toLowerCase())
            (item.name || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
          (item.sku || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
          (item.barcode || "").includes(searchQuery) ||
          (item.category || "").toLowerCase().includes(searchQuery.toLowerCase())
        const matchesType = selectedItemType === "ALL" || item.itemType === selectedItemType
        const matchesWh =
          selectedWarehouseId === "ALL" ||
          item.warehouseBalances.some(b => b.warehouseId === selectedWarehouseId && b.onHandQty > 0)
            (item.warehouseBalances || []).some(b => b.warehouseId === selectedWarehouseId && b.onHandQty > 0)
        return matchesSearch && matchesType && matchesWh
      })
    }, [state.items, searchQuery, selectedItemType, selectedWarehouseId])

    // KPI Özetleri
    const kpiSummary = useMemo(() => {
      const nonParentItems = state.items.filter(i => i.itemType !== "MATRIX_PARENT")
      const totalOnHand = nonParentItems.reduce((s, i) => s + i.totalOnHand, 0)
      const totalAvailable = nonParentItems.reduce((s, i) => s + i.totalAvailable, 0)
      const nonParentItems = (state.items || []).filter(i => i.itemType !== "MATRIX_PARENT")
      const totalOnHand = nonParentItems.reduce((s, i) => s + (i.totalOnHand || 0), 0)
      const totalAvailable = nonParentItems.reduce((s, i) => s + (i.totalAvailable || 0), 0)
      const totalInventoryValue = nonParentItems.reduce(
        (s, i) => s + i.totalOnHand * i.fifoUnitCost,
        (s, i) => s + (i.totalOnHand || 0) * (i.fifoUnitCost || 0),
        0
      )
      const expiringLots = state.lotBatches.filter(
        l => l.status === "EXPIRING_SOON" || l.daysUntilExpiry <= 15
    const expiringLots = (state.lotBatches || []).filter(
          l => l.status === "EXPIRING_SOON" || (l.daysUntilExpiry || 99) <= 15
        ).length
      return {
        warehouseCount: state.warehouses.length,
        skuCount: state.items.length,
        warehouseCount: (state.warehouses || []).length,
        skuCount: (state.items || []).length,
        totalOnHand,
        totalAvailable,
        totalInventoryValue,
        expiringLots
      }
    }, [state.items, state.warehouses, state.lotBatches])

    // Matrix Ebeveyn ve Alt Varyantlar
    const matrixParent = useMemo(
      () => state.items.find(i => i.itemType === "MATRIX_PARENT") || state.items[0],
      () => (state.items || []).find(i => i.itemType === "MATRIX_PARENT") || (state.items || [])[0] || null,
      [state.items]
    )
    const matrixVariants = useMemo(
      () => state.items.filter(i => i.parentItemId === matrixParent?.id),
      () => (state.items || []).filter(i => i.parentItemId === matrixParent?.id),
      [state.items, matrixParent]
    )

    // Seçili Lot Kaydı
    const activeLotRecord = useMemo(
      () => state.lotBatches.find(l => l.id === selectedLotId) || state.lotBatches[0],
      () => (state.lotBatches || []).find(l => l.id === selectedLotId) || (state.lotBatches || [])[0] || null,
      [state.lotBatches, selectedLotId]
    )

    // Çoklu Birim Dönüştürme Sonucu
    const selectedUomItem = useMemo(
      () => state.items.find(i => i.id === uomItemId) || state.items[0],
      () => (state.items || []).find(i => i.id === uomItemId) || (state.items || [])[0] || null,
      [state.items, uomItemId]
    )
    const availableUnitsForSelected = useMemo(() => {
      if (!selectedUomItem) return ["Adet"]
      const units = new Set<string>([selectedUomItem.baseUnit])
      selectedUomItem.unitConversions.forEach(c => {
        units.add(c.fromUnit)
        units.add(c.toUnit)
        const units = new Set<string>([selectedUomItem.baseUnit || "Adet"])
          ; (selectedUomItem.unitConversions || []).forEach(c => {
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
          selectedUomItem.baseUnit,
          selectedUomItem.unitConversions
      selectedUomItem.baseUnit || "Adet",
          selectedUomItem.unitConversions || []
        )
      }, [selectedUomItem, uomInputQty, uomFromUnit, uomToUnit])

      // Maliyet Değerleme Karşılaştırması (FIFO / LIFO / Ağırlıklı Ortalama / Standart)
      const selectedValItem = useMemo(
        () => state.items.find(i => i.id === valItemId && i.costLayers.length > 0) || state.items[0],
        () => (state.items || []).find(i => i.id === valItemId && (i.costLayers?.length ?? 0) > 0) || (state.items || [])[0] || null,
        [state.items, valItemId]
      )
      const valuationComparisons = useMemo(() => {
        if (!selectedValItem) return null
        const issueQty = Math.max(1, Number(valIssueQty) || 50)
        const methods: ValuationMethod[] = ["FIFO", "LIFO", "WEIGHTED_AVERAGE", "STANDARD"]
        return methods.map(method =>
          calculateStockValuation(
            selectedValItem.costLayers,
            selectedValItem.costLayers || [],
            method,
            selectedValItem.standardCost,
            selectedValItem.standardCost || 500,
            issueQty
          )
        )
      }, [selectedValItem, valIssueQty])

      // BOM Rollup Hesabı
      const selectedBom = useMemo(
        () => state.bomRecipes.find(b => b.id === selectedBomId) || state.bomRecipes[0],
        () => (state.bomRecipes || []).find(b => b.id === selectedBomId) || (state.bomRecipes || [])[0] || null,
        [state.bomRecipes, selectedBomId]
      )
      const bomCalculation = useMemo(() => {
        if (!selectedBom) return null
        return calculateBomRollupCost(selectedBom)
      }, [selectedBom])
      return calculateBomRollupCost(selectedBom, Number(bomBatchMultiplier) || 1)
    }, [selectedBom, bomBatchMultiplier])

    const handleCreateItem = async () => {
      if (!newName.trim()) {
        toast.error("Lütfen stok kartı adını giriniz.")
        return
      }
      const created = enterpriseInventoryService.addInventoryItem({
        sku: newSku.trim() || undefined,
        name: newName.trim(),
        category: newCategory,
        valuationMethod: newValuationMethod,
        warehouseId: newWhId,
        initialQty: Number(newInitialQty) || 50,
        standardCost: Number(newUnitCost) || 450,
        salesPrice: Number(newSalesPrice) || 890
      })
      setState({ ...enterpriseInventoryService.getState() })
      setIsAddModalOpen(false)
      setNewSku("")
      setNewName("")
      toast.success(`${created.sku} — ${created.name} stok kartı oluşturuldu`, {
        description: "Depo bakiyesi, barkod ve FIFO maliyet katmanı otomatik açıldı."
      })
    }

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
        toast.success(`Varyant üretildi: ${created.sku}`, {
          description: `Matrix ana kart (${matrixParent.sku}) toplam stoğu otomatik olarak ${matrixParent.totalOnHand} adede güncellendi.`
        })
      }
    }

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
      setNewLotNumber("")
      toast.success(`${created.lotNumber} lot kaydı ve izlenebilirlik zinciri açıldı.`)
    }

    return (
      <div className="space-y-6 p-6">
        {/* Üst Başlık & Hızlı Geçiş Barı */}
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <div className="flex items-center gap-2">
              <Badge className="bg-emerald-600 text-white hover:bg-emerald-700">
                Faz 1 • Çekirdek Stok & Envanter Mimarisi
              </Badge>
              <Badge variant="outline" className="border-blue-300 text-blue-700 bg-blue-50">
                Gerçek Zamanlı ATP & FEFO Aktif
              </Badge>
            </div>
            <h1 className="mt-2 text-2xl font-bold tracking-tight text-slate-900">
              Kurumsal Stok, Varyant Matrix, Lot/SKT İzlenebilirlik & Maliyet Motoru
            </h1>
            <p className="text-sm text-slate-600">
              Çoklu depo/şube anlık stok takibi, ebeveyn-alt madde (Matrix) otomatik varyant toplamları,
              uçtan uca Lot/Parti/SKT soykütüğü, çoklu birim dönüştürme ve FIFO/LIFO/BOM maliyet değerleme merkezi.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Link href="/dashboard/wms">
              <Button variant="outline" size="sm" className="gap-1.5">
                <Warehouse className="h-4 w-4 text-indigo-600" />
                WMS & Saha Operasyonları
              </Button>
            </Link>
            <Link href="/dashboard/stok-ai">
              <Button variant="outline" size="sm" className="gap-1.5">
                <Sparkles className="h-4 w-4 text-amber-600" />
                ForesightAI & AMA Asistan
              </Button>
            </Link>
            <Button
              size="sm"
              className="bg-emerald-600 hover:bg-emerald-700 text-white gap-1.5"
              onClick={() => setIsAddModalOpen(true)}
            >
              <Plus className="h-4 w-4" />
              Yeni Stok Kartı Aç
            </Button>
          </div>
        </div>

        {/* Üst KPI Kartları */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
          <Card className="border-slate-200 bg-white shadow-sm">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-slate-500">Aktif Depo & Şube Ağı</span>
                <Warehouse className="h-4 w-4 text-indigo-600" />
              </div>
              <div className="mt-2 text-2xl font-bold text-slate-900">{kpiSummary.warehouseCount} Depo</div>
              <p className="mt-1 text-xs text-slate-500">
                Merkez, Bölge, Soğuk Hava & Karantina
              </p>
            </CardContent>
          </Card>

          <Card className="border-slate-200 bg-white shadow-sm">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-slate-500">Toplam Eldeki Stok (On-Hand)</span>
                <Boxes className="h-4 w-4 text-emerald-600" />
              </div>
              <div className="mt-2 text-2xl font-bold text-slate-900">
                {kpiSummary.totalOnHand.toLocaleString("tr-TR")} Birim
              </div>
              <p className="mt-1 text-xs text-emerald-600 font-medium">
                ATP Satılabilir: {kpiSummary.totalAvailable.toLocaleString("tr-TR")} Birim
              </p>
            </CardContent>
          </Card>

          <Card className="border-slate-200 bg-white shadow-sm">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-slate-500">FIFO Envanter Değeri</span>
                <Calculator className="h-4 w-4 text-blue-600" />
              </div>
              <div className="mt-2 text-2xl font-bold text-slate-900">
                ₺{kpiSummary.totalInventoryValue.toLocaleString("tr-TR")}
              </div>
              <p className="mt-1 text-xs text-slate-500">
                FIFO / LIFO / Ağırlıklı Ort. Katmanlı
              </p>
            </CardContent>
          </Card>

          <Card className="border-slate-200 bg-white shadow-sm">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-slate-500">Matrix Ana & Alt Varyant</span>
                <GitBranch className="h-4 w-4 text-purple-600" />
              </div>
              <div className="mt-2 text-2xl font-bold text-slate-900">
                {matrixVariants.length} Varyant
              </div>
              <p className="mt-1 text-xs text-purple-600 font-medium">
                Ana Kart Stoğu: {matrixParent?.totalOnHand || 0} Adet (Auto-Rollup)
              </p>
            </CardContent>
          </Card>

          <Card className="border-slate-200 bg-white shadow-sm">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-slate-500">SKT / FEFO Risk İzleme</span>
                <AlertTriangle className="h-4 w-4 text-amber-600" />
              </div>
              <div className="mt-2 text-2xl font-bold text-amber-600">
                {kpiSummary.expiringLots} Parti (Lot)
              </div>
              <p className="mt-1 text-xs text-slate-500">
                FEFO öncelikli sevkiyat direktifi aktif
              </p>
            </CardContent>
          </Card>
        </div>

        {/* 5 Ana Sekme (Faz 1'in 5 Maddesi) */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
          <TabsList className="flex flex-wrap h-auto gap-1 bg-slate-100 p-1">
            <TabsTrigger value="multi-warehouse" className="gap-1.5 text-xs sm:text-sm">
              <Warehouse className="h-4 w-4" />
              1. Çoklu Depo & Anlık Stok (ATP)
            </TabsTrigger>
            <TabsTrigger value="matrix-variants" className="gap-1.5 text-xs sm:text-sm">
              <Layers className="h-4 w-4" />
              2. Ebeveyn-Alt Madde (Matrix) Varyant
            </TabsTrigger>
            <TabsTrigger value="traceability" className="gap-1.5 text-xs sm:text-sm">
              <QrCode className="h-4 w-4" />
              3. Lot, Parti, Seri No & SKT İzlenebilirlik
            </TabsTrigger>
            <TabsTrigger value="uom-alternatives" className="gap-1.5 text-xs sm:text-sm">
              <Scale className="h-4 w-4" />
              4. Çoklu Birim & Muadil Ürünler
            </TabsTrigger>
            <TabsTrigger value="bom-valuation" className="gap-1.5 text-xs sm:text-sm">
              <Calculator className="h-4 w-4" />
              5. Ürün Ağacı (BOM) & FIFO/LIFO Maliyet
            </TabsTrigger>
          </TabsList>

          {/* 1. SEKME: ÇOKLU DEPO VE ŞUBE BAZLI ANLIK STOK TAKİBİ */}
          <TabsContent value="multi-warehouse" className="space-y-6">
            {/* Depo Kartları */}
            <div className="grid grid-cols-1 gap-4 md:grid-cols-3 lg:grid-cols-5">
              {state.warehouses.map(wh => (
                <Card
                  key={wh.id}
                  onClick={() =>
                    setSelectedWarehouseId(prev => (prev === wh.id ? "ALL" : wh.id))
                  }
                  className={`cursor-pointer transition-all ${selectedWarehouseId === wh.id
                      ? "border-2 border-emerald-600 bg-emerald-50/30 shadow-md"
                      : "border-slate-200 hover:border-slate-300"
                    }`}
                >
                  <CardContent className="p-4 space-y-2">
                    <div className="flex items-center justify-between">
                      <Badge variant="outline" className="font-mono text-xs">
                        {wh.code}
                      </Badge>
                      <Badge
                        className={
                          wh.type === "COLD_CHAIN"
                            ? "bg-cyan-100 text-cyan-800"
                            : wh.type === "QUARANTINE"
                              ? "bg-rose-100 text-rose-800"
                              : "bg-slate-100 text-slate-800"
                        }
                      >
                        {wh.temperatureRange}
                      </Badge>
                    </div>
                    <div className="font-semibold text-sm text-slate-900 line-clamp-1">
                      {wh.name}
                    </div>
                    <div className="text-xs text-slate-500">
                      {wh.branchName} • {wh.city}
                    </div>
                    <div className="pt-1">
                      <div className="flex justify-between text-xs mb-1">
                        <span className="text-slate-500">Doluluk ({wh.usedPallets}/{wh.capacityPallets} Palet)</span>
                        <span className="font-semibold text-slate-800">%{wh.occupancyRate}</span>
                      </div>
                      <div className="h-2 w-full rounded-full bg-slate-100 overflow-hidden">
                        <div
                          className={`h-full rounded-full ${wh.occupancyRate > 80 ? "bg-amber-500" : "bg-emerald-600"
                            }`}
                          style={{ width: `${wh.occupancyRate}%` }}
                        />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            {/* Filtre ve Arama Barı */}
            <Card className="border-slate-200">
              <CardHeader className="pb-3">
                <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                  <div>
                    <CardTitle className="text-base">
                      Çoklu Depo ve Lokasyon Bazlı Anlık Stok Matrisi (ATP / Rezerve / Yoldaki / Karantina / Konsinye)
                    </CardTitle>
                    <CardDescription>
                      Depo kartlarına tıklayarak filtreleyebilir veya barkod/SKU ile anlık sorgulama yapabilirsiniz.
                    </CardDescription>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <div className="relative w-64">
                      <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-slate-400" />
                      <Input
                        placeholder="SKU, Barkod veya Ürün ara..."
                        value={searchQuery}
                        onChange={e => setSearchQuery(e.target.value)}
                        className="pl-8 h-9 text-sm"
                      />
                    </div>
                    <Select value={selectedItemType} onValueChange={setSelectedItemType}>
                      <SelectTrigger className="w-44 h-9 text-xs">
                        <SelectValue placeholder="Stok Tipi" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="ALL">Tüm Stok Tipleri</SelectItem>
                        <SelectItem value="FINISHED_GOOD">Mamul Ürün</SelectItem>
                        <SelectItem value="RAW_MATERIAL">Hammadde / Canlı</SelectItem>
                        <SelectItem value="MATRIX_PARENT">Matrix Ana Kart</SelectItem>
                        <SelectItem value="MATRIX_VARIANT">Matrix Alt Varyant</SelectItem>
                      </SelectContent>
                    </Select>
                    {selectedWarehouseId !== "ALL" && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setSelectedWarehouseId("ALL")}
                        className="text-xs text-rose-600"
                      >
                        Depo Filtresini Temizle
                      </Button>
                    )}
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto rounded-lg border border-slate-200">
                  <table className="w-full text-left text-sm">
                    <thead className="bg-slate-50 text-xs uppercase text-slate-600 border-b">
                      <tr>
                        <th className="p-3">SKU & Barkod</th>
                        <th className="p-3">Stok Kartı & Kategori</th>
                        <th className="p-3">Tip & ABC/XYZ</th>
                        <th className="p-3 text-right">Eldeki (On-Hand)</th>
                        <th className="p-3 text-right">Rezerve</th>
                        <th className="p-3 text-right text-emerald-700">ATP (Satılabilir)</th>
                        <th className="p-3 text-right">Yoldaki / Karantina</th>
                        <th className="p-3 text-right">FIFO Birim Maliyet</th>
                        <th className="p-3">Depo & Hücre Dağılımı</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200">
                      {filteredItems.map(item => (
                        <tr
                          key={item.id}
                          className={`hover:bg-slate-50/80 ${item.itemType === "MATRIX_PARENT" ? "bg-purple-50/40 font-medium" : ""
                            }`}
                        >
                          <td className="p-3 align-top">
                            <div className="font-mono text-xs font-semibold text-slate-900">
                              {item.sku}
                            </div>
                            <div className="flex items-center gap-1 text-[11px] text-slate-500 mt-0.5">
                              <Barcode className="h-3 w-3" />
                              {item.barcode}
                            </div>
                          </td>
                          <td className="p-3 align-top">
                            <div className="font-medium text-slate-900">{item.name}</div>
                            <div className="text-xs text-slate-500">
                              {item.category} • {item.brand}
                            </div>
                            {item.variantAttributes && (
                              <div className="mt-1 flex gap-1">
                                {item.variantAttributes.renk && (
                                  <Badge variant="secondary" className="text-[10px]">
                                    Renk: {item.variantAttributes.renk}
                                  </Badge>
                                )}
                                {item.variantAttributes.beden && (
                                  <Badge variant="secondary" className="text-[10px]">
                                    Beden: {item.variantAttributes.beden}
                                  </Badge>
                                )}
                              </div>
                            )}
                          </td>
                          <td className="p-3 align-top">
                            <Badge
                              variant="outline"
                              className={
                                item.itemType === "MATRIX_PARENT"
                                  ? "border-purple-300 bg-purple-100 text-purple-800"
                                  : item.itemType === "MATRIX_VARIANT"
                                    ? "border-indigo-300 bg-indigo-50 text-indigo-700"
                                    : "border-slate-300"
                              }
                            >
                              {item.itemType}
                            </Badge>
                            <div className="mt-1 text-[11px] text-slate-500">
                              Sınıf: <strong>{item.abcClass}/{item.xyzClass}</strong> • {item.valuationMethod}
                            </div>
                          </td>
                          <td className="p-3 align-top text-right font-semibold text-slate-900">
                            {item.totalOnHand.toLocaleString("tr-TR")} {item.baseUnit}
                          </td>
                          <td className="p-3 align-top text-right text-amber-700">
                            {item.totalReserved.toLocaleString("tr-TR")} {item.baseUnit}
                          </td>
                          <td className="p-3 align-top text-right font-bold text-emerald-700">
                            {item.totalAvailable.toLocaleString("tr-TR")} {item.baseUnit}
                          </td>
                          <td className="p-3 align-top text-right text-xs">
                            <div className="text-blue-600">Yolda: {item.totalInTransit}</div>
                            <div className="text-rose-600">Karantina: {item.totalQuarantine}</div>
                            {item.totalConsignment > 0 && (
                              <div className="text-purple-600">Konsinye: {item.totalConsignment}</div>
                            )}
                          </td>
                          <td className="p-3 align-top text-right">
                            <div className="font-semibold text-slate-900">
                              ₺{item.fifoUnitCost.toLocaleString("tr-TR")}
                            </div>
                            <div className="text-[11px] text-slate-500">
                              Satış: ₺{item.salesPrice.toLocaleString("tr-TR")}
                            </div>
                          </td>
                          <td className="p-3 align-top">
                            <div className="flex flex-col gap-1">
                              {item.warehouseBalances.map((wb, idx) => (
                                <div
                                  key={`${wb.warehouseId}-${idx}`}
                                  className="flex items-center justify-between gap-2 rounded bg-slate-100 px-2 py-1 text-[11px]"
                                >
                                  <span className="font-mono font-medium text-slate-700">
                                    {wb.warehouseCode} ({wb.binCode})
                                  </span>
                                  <span className="font-bold text-slate-900">
                                    {wb.onHandQty} {item.baseUnit}
                                  </span>
                                </div>
                              ))}
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* 2. SEKME: EBEVEYN-ALT MADDE (MATRIX) VARYANT YAPISI */}
          <TabsContent value="matrix-variants" className="space-y-6">
            <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
              {/* Sol: Matrix Ebeveyn Kartı ve Otomatik Rollup Özeti */}
              <Card className="border-purple-200 bg-purple-50/20 lg:col-span-1">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <Badge className="bg-purple-600 text-white">Ebeveyn Kart (MATRIX_PARENT)</Badge>
                    <Badge variant="outline" className="border-purple-300 text-purple-700">
                      Canlı Auto-Rollup
                    </Badge>
                  </div>
                  <CardTitle className="mt-2 text-lg">{matrixParent?.name}</CardTitle>
                  <CardDescription className="font-mono text-xs">
                    SKU: {matrixParent?.sku} • Barkod: {matrixParent?.barcode}
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="rounded-lg bg-white p-4 border border-purple-200 space-y-2">
                    <div className="text-xs text-slate-500 uppercase font-semibold">
                      Alt Varyantlardan Otomatik Toplanan Stok
                    </div>
                    <div className="grid grid-cols-2 gap-3 pt-1">
                      <div>
                        <span className="text-xs text-slate-500">Toplam Eldeki:</span>
                        <div className="text-xl font-bold text-slate-900">
                          {matrixParent?.totalOnHand} Adet
                        </div>
                      </div>
                      <div>
                        <span className="text-xs text-slate-500">Toplam ATP:</span>
                        <div className="text-xl font-bold text-emerald-700">
                          {matrixParent?.totalAvailable} Adet
                        </div>
                      </div>
                      <div>
                        <span className="text-xs text-slate-500">Toplam Rezerve:</span>
                        <div className="text-base font-semibold text-amber-700">
                          {matrixParent?.totalReserved} Adet
                        </div>
                      </div>
                      <div>
                        <span className="text-xs text-slate-500">Alt Varyant Sayısı:</span>
                        <div className="text-base font-semibold text-purple-700">
                          {matrixVariants.length} SKU
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Yeni Varyant Ekleme Formu */}
                  <div className="rounded-lg bg-white p-4 border border-slate-200 space-y-3">
                    <div className="font-semibold text-sm text-slate-900 flex items-center gap-1.5">
                      <Plus className="h-4 w-4 text-purple-600" />
                      Yeni Renk × Beden Varyantı Üret
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <Label className="text-xs">Renk</Label>
                        <Select value={variantColor} onValueChange={setVariantColor}>
                          <SelectTrigger className="h-8 text-xs mt-1">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="Zümrüt Yeşili">Zümrüt Yeşili</SelectItem>
                            <SelectItem value="Antrasit">Antrasit</SelectItem>
                            <SelectItem value="Bordo">Bordo</SelectItem>
                            <SelectItem value="Lacivert">Lacivert</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label className="text-xs">Beden</Label>
                        <Select value={variantSize} onValueChange={setVariantSize}>
                          <SelectTrigger className="h-8 text-xs mt-1">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="XS">XS</SelectItem>
                            <SelectItem value="S">S</SelectItem>
                            <SelectItem value="M">M</SelectItem>
                            <SelectItem value="L">L</SelectItem>
                            <SelectItem value="XL">XL</SelectItem>
                            <SelectItem value="XXL">XXL</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    <div className="grid grid-cols-3 gap-2">
                      <div>
                        <Label className="text-xs">Başlangıç Stok</Label>
                        <Input
                          type="number"
                          value={variantInitialQty}
                          onChange={e => setVariantInitialQty(e.target.value)}
                          className="h-8 text-xs mt-1"
                        />
                      </div>
                      <div>
                        <Label className="text-xs">Birim Maliyet (₺)</Label>
                        <Input
                          type="number"
                          value={variantUnitCost}
                          onChange={e => setVariantUnitCost(e.target.value)}
                          className="h-8 text-xs mt-1"
                        />
                      </div>
                      <div>
                        <Label className="text-xs">Satış Fiyatı (₺)</Label>
                        <Input
                          type="number"
                          value={variantSalesPrice}
                          onChange={e => setVariantSalesPrice(e.target.value)}
                          className="h-8 text-xs mt-1"
                        />
                      </div>
                    </div>
                    <Button
                      onClick={handleGenerateVariant}
                      className="w-full bg-purple-600 hover:bg-purple-700 text-white text-xs h-9"
                    >
                      Alt Varyantı Oluştur & Ebeveyn Stoğu Güncelle
                    </Button>
                  </div>
                </CardContent>
              </Card>

              {/* Sağ: Alt Varyantlar Listesi ve Matrix Tablosu */}
              <Card className="border-slate-200 lg:col-span-2">
                <CardHeader>
                  <CardTitle className="text-base">
                    Ebeveyn Karta Bağlı Alt Varyantlar (Renk × Beden Kırılımı)
                  </CardTitle>
                  <CardDescription>
                    Herhangi bir alt varyantta stok hareketi olduğunda Ebeveyn Kart ({matrixParent?.sku}) bakiyesi gerçek zamanlı olarak yeniden hesaplanır.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="overflow-x-auto rounded-lg border border-slate-200">
                    <table className="w-full text-left text-sm">
                      <thead className="bg-slate-50 text-xs uppercase text-slate-600 border-b">
                        <tr>
                          <th className="p-3">Varyant SKU</th>
                          <th className="p-3">Renk</th>
                          <th className="p-3">Beden</th>
                          <th className="p-3 text-right">Eldeki Stok</th>
                          <th className="p-3 text-right">Rezerve</th>
                          <th className="p-3 text-right">ATP (Satılabilir)</th>
                          <th className="p-3 text-right">FIFO Maliyet / Satış</th>
                          <th className="p-3">Hücre Konumu</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-200">
                        {matrixVariants.map(v => (
                          <tr key={v.id} className="hover:bg-slate-50">
                            <td className="p-3 font-mono text-xs font-semibold text-indigo-700">
                              {v.sku}
                            </td>
                            <td className="p-3">
                              <Badge variant="outline">{v.variantAttributes?.renk || "-"}</Badge>
                            </td>
                            <td className="p-3">
                              <Badge className="bg-slate-800 text-white">
                                {v.variantAttributes?.beden || "-"}
                              </Badge>
                            </td>
                            <td className="p-3 text-right font-bold">{v.totalOnHand} Adet</td>
                            <td className="p-3 text-right text-amber-700">{v.totalReserved} Adet</td>
                            <td className="p-3 text-right font-bold text-emerald-700">
                              {v.totalAvailable} Adet
                            </td>
                            <td className="p-3 text-right text-xs">
                              <div>Maliyet: ₺{v.fifoUnitCost}</div>
                              <div className="text-slate-500">Satış: ₺{v.salesPrice}</div>
                            </td>
                            <td className="p-3 font-mono text-xs text-slate-600">
                              {v.warehouseBalances[0]?.binCode || "IST-Z2-A04"}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* 3. SEKME: LOT, PARTİ, SERİ NO VE SKT (FEFO) İZLENEBİLİRLİK */}
          <TabsContent value="traceability" className="space-y-6">
            <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
              {/* Sol: Lot / Parti / Seri & SKT Listesi */}
              <Card className="border-slate-200 lg:col-span-7">
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="text-base">
                        Lot, Parti, Seri Numarası & SKT (FEFO) Kayıtları
                      </CardTitle>
                      <CardDescription>
                        Bir partiye tıklayarak tedarikçiden müşteriye uçtan uca izlenebilirlik (Traceability) zincirini inceleyin.
                      </CardDescription>
                    </div>
                    <Button
                      size="sm"
                      onClick={() => setIsLotModalOpen(true)}
                      className="bg-indigo-600 hover:bg-indigo-700 text-white gap-1 text-xs"
                    >
                      <Plus className="h-3.5 w-3.5" />
                      Yeni Lot/SKT Kaydı
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {state.lotBatches.map(lot => (
                      <div
                        key={lot.id}
                        onClick={() => setSelectedLotId(lot.id)}
                        className={`cursor-pointer rounded-lg border p-3.5 transition-all ${activeLotRecord?.id === lot.id
                            ? "border-2 border-indigo-600 bg-indigo-50/30"
                            : "border-slate-200 hover:border-slate-300"
                          }`}
                      >
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <div className="flex items-center gap-2">
                            <span className="font-mono text-sm font-bold text-slate-900">
                              {lot.lotNumber}
                            </span>
                            <Badge variant="outline" className="font-mono text-[11px]">
                              Parti: {lot.batchNumber}
                            </Badge>
                            {lot.serialNumber && (
                              <Badge className="bg-slate-800 text-white font-mono text-[11px]">
                                SN: {lot.serialNumber}
                              </Badge>
                            )}
                          </div>
                          <div className="flex items-center gap-1.5">
                            <Badge
                              className={
                                lot.status === "EXPIRING_SOON"
                                  ? "bg-amber-100 text-amber-800 border-amber-300"
                                  : lot.status === "QUARANTINE"
                                    ? "bg-rose-100 text-rose-800 border-rose-300"
                                    : "bg-emerald-100 text-emerald-800 border-emerald-300"
                              }
                            >
                              {lot.status === "EXPIRING_SOON"
                                ? `FEFO ÖNCELİKLİ • ${lot.daysUntilExpiry} Gün Kaldı`
                                : lot.status === "QUARANTINE"
                                  ? "KARANTİNA BLOKELİ"
                                  : `SKT: ${lot.daysUntilExpiry} Gün`}
                            </Badge>
                          </div>
                        </div>

                        <div className="mt-2 flex flex-wrap items-center justify-between text-xs text-slate-600">
                          <div>
                            <strong className="text-slate-900">{lot.itemName}</strong> ({lot.sku})
                          </div>
                          <div>
                            Kalan: <strong className="text-slate-900">{lot.remainingQty} / {lot.initialQty} {lot.unit}</strong>
                          </div>
                        </div>

                        <div className="mt-1.5 flex flex-wrap items-center justify-between text-[11px] text-slate-500">
                          <span>
                            Depo/Hücre: <strong className="font-mono">{lot.warehouseName} ({lot.binCode})</strong>
                          </span>
                          <span>
                            Üretim: {lot.manufacturingDate} • SKT: <strong>{lot.expiryDate || "Süresiz"}</strong>
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* Sağ: Uçtan Uca İzlenebilirlik (Traceability Genealogy Tree) */}
              <Card className="border-indigo-200 bg-slate-50/50 lg:col-span-5">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <Badge className="bg-indigo-600 text-white">Uçtan Uca Soykütüğü (Genealogy)</Badge>
                    <span className="font-mono text-xs text-slate-500">
                      {activeLotRecord?.originDocNo}
                    </span>
                  </div>
                  <CardTitle className="text-base mt-1">
                    {activeLotRecord?.lotNumber} — İzlenebilirlik Zinciri
                  </CardTitle>
                  <CardDescription>
                    Tedarikçi kabulünden kalite kontrole, üretim reçetesinden (BOM) müşteri sevkiyatına kadar tüm adımlar:
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {activeLotRecord && (
                    <>
                      <div className="rounded-lg bg-white p-3 border border-slate-200 text-xs space-y-1">
                        <div className="flex justify-between">
                          <span className="text-slate-500">Tedarikçi & Lot:</span>
                          <span className="font-semibold text-slate-900">
                            {activeLotRecord.supplierName} ({activeLotRecord.supplierLotNo})
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-500">Kalite Kontrol (QC):</span>
                          <span className="font-semibold text-emerald-700">
                            {activeLotRecord.qcStatus}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-500">Birim Maliyet:</span>
                          <span className="font-semibold text-slate-900">
                            ₺{activeLotRecord.unitCost.toLocaleString("tr-TR")}
                          </span>
                        </div>
                      </div>

                      <div className="relative pl-6 space-y-4 before:absolute before:left-2.5 before:top-2 before:bottom-2 before:w-0.5 before:bg-indigo-300">
                        {activeLotRecord.events.map(ev => (
                          <div
                            key={ev.id}
                            className="relative rounded-lg bg-white p-3.5 border border-slate-200 shadow-sm"
                          >
                            <div className="absolute -left-[21px] top-4 h-3 w-3 rounded-full border-2 border-indigo-600 bg-white" />
                            <div className="flex items-center justify-between text-[11px] text-slate-500">
                              <span className="font-mono font-semibold text-indigo-700">
                                {ev.eventType}
                              </span>
                              <span>{ev.eventDate}</span>
                            </div>
                            <div className="mt-1 font-semibold text-sm text-slate-900">
                              {ev.title}
                            </div>
                            <div className="mt-1 text-xs text-slate-600">
                              {ev.notes}
                            </div>
                            <div className="mt-2 flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-100 text-[11px] text-slate-500">
                              <span>
                                <strong>{ev.fromLocation}</strong> → <strong>{ev.toLocation}</strong>
                              </span>
                              <Badge variant="secondary" className="font-mono text-[10px]">
                                Belge: {ev.referenceDocNo} ({ev.quantity} {ev.unit})
                              </Badge>
                            </div>
                          </div>
                        ))}
                      </div>
                    </>
                  )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* 4. SEKME: ÇOKLU BİRİM DÖNÜŞTÜRME VE ALTERNATİF/MUADİL ÜRÜNLER */}
          <TabsContent value="uom-alternatives" className="space-y-6">
            <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
              {/* Sol: Çoklu Birim Dönüştürücü Motoru */}
              <Card className="border-slate-200 lg:col-span-5">
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2">
                    <Scale className="h-4 w-4 text-emerald-600" />
                    Çoklu Birim Dönüştürme Motoru (Adet / Koli / Palet / Bağ / Litre)
                  </CardTitle>
                  <CardDescription>
                    Satın alma, depolama ve satış birimleri arasında ağırlık (kg) ve hacim ($m^3$) hesaplamalı canlı dönüşüm.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <Label className="text-xs">Stok Kartı Seçin</Label>
                    <Select
                      value={uomItemId}
                      onValueChange={val => {
                        setUomItemId(val)
                        const found = state.items.find(i => i.id === val)
                        if (found && found.unitConversions.length > 0) {
                          const found = (state.items || []).find(i => i.id === val)
                          if (found && (found.unitConversions?.length ?? 0) > 0) {
                            setUomFromUnit(found.unitConversions[0].fromUnit)
                            setUomToUnit(found.baseUnit)
                            setUomToUnit(found.baseUnit || "Adet")
                          }
                        }
                      }
                  >
                      <SelectTrigger className="mt-1">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {state.items
                          .filter(i => i.unitConversions.length > 0)
                      {(state.items || [])
                          .filter(i => (i.unitConversions?.length ?? 0) > 0)
                          .map(item => (
                            <SelectItem key={item.id} value={item.id}>
                              {item.sku} — {item.name}
                            </SelectItem>
                          ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="grid grid-cols-3 gap-3">
                    <div>
                      <Label className="text-xs">Miktar</Label>
                      <Input
                        type="number"
                        value={uomInputQty}
                        onChange={e => setUomInputQty(e.target.value)}
                        className="mt-1"
                      />
                    </div>
                    <div>
                      <Label className="text-xs">Kaynak Birim</Label>
                      <Select value={uomFromUnit} onValueChange={setUomFromUnit}>
                        <SelectTrigger className="mt-1">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {availableUnitsForSelected.map(u => (
                            <SelectItem key={u} value={u}>
                              {u}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label className="text-xs">Hedef Birim</Label>
                      <Select value={uomToUnit} onValueChange={setUomToUnit}>
                        <SelectTrigger className="mt-1">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {availableUnitsForSelected.map(u => (
                            <SelectItem key={u} value={u}>
                              {u}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  {uomConversionResult && (
                    <div className="rounded-xl bg-emerald-50/70 border border-emerald-200 p-4 space-y-2">
                      <div className="text-xs font-semibold uppercase text-emerald-800">
                        Birim Dönüşüm & Lojistik Hesaplama Sonucu
                      </div>
                      <div className="text-2xl font-bold text-slate-900">
                        {uomInputQty} {uomFromUnit} ={" "}
                        <span className="text-emerald-700">
                          {uomConversionResult.convertedQty} {uomToUnit}
                        </span>
                      </div>
                      <div className="text-xs text-slate-600 font-mono">
                        Formül: {uomConversionResult.formulaText}
                      </div>
                      <div className="grid grid-cols-2 gap-2 pt-2 border-t border-emerald-200/60 text-xs">
                        <div>
                          Toplam Brüt Ağırlık:{" "}
                          <strong className="text-slate-900">
                            {uomConversionResult.totalWeightKg} kg
                          </strong>
                        </div>
                        <div>
                          Toplam Hacim:{" "}
                          <strong className="text-slate-900">
                            {uomConversionResult.totalVolumeM3} m³
                          </strong>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Tanımlı Birim Katsayıları Tablosu */}
                  <div className="pt-2">
                    <div className="text-xs font-semibold text-slate-700 mb-2">
                      Tanımlı Barkodlu Birim Katsayıları ({selectedUomItem?.sku})
                    </div>
                    <div className="rounded-lg border border-slate-200 overflow-hidden">
                      <table className="w-full text-left text-xs">
                        <thead className="bg-slate-50 text-slate-600 border-b">
                          <tr>
                            <th className="p-2">Üst Birim</th>
                            <th className="p-2">Baz Karşılığı</th>
                            <th className="p-2">GS1 Koli/Palet Barkodu</th>
                            <th className="p-2 text-right">Ağırlık / Hacim</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-200">
                          {selectedUomItem?.unitConversions.map(uc => (
                            {(selectedUomItem?.unitConversions || []).map(uc => (
                              <tr key={uc.id}>
                                <td className="p-2 font-semibold">1 {uc.fromUnit}</td>
                                <td className="p-2 text-emerald-700 font-bold">
                                  {uc.multiplier} {uc.toUnit}
                                </td>
                                <td className="p-2 font-mono">{uc.barcode}</td>
                                <td className="p-2 text-right">
                                  {uc.weightKg} kg / {uc.volumeM3} m³
                                </td>
                              </tr>
                            ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Sağ: Alternatif & Muadil Ürün Kuralları */}
              <Card className="border-slate-200 lg:col-span-7">
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2">
                    <ArrowRightLeft className="h-4 w-4 text-indigo-600" />
                    Alternatif ve Muadil Ürün Tanımlama Matrisi
                  </CardTitle>
                  <CardDescription>
                    Stok tükenmesi (stockout) veya reçete revizyonu durumunda sistemin otomatik önerdiği/ikame ettiği muadil ürünler.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {state.alternatives.map(alt => (
                      <div
                        key={alt.id}
                        className="rounded-lg border border-slate-200 p-4 hover:border-indigo-200 transition-all"
                      >
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <div className="flex items-center gap-2">
                            <Badge className="bg-indigo-600 text-white">
                              Öncelik #{alt.priority}
                            </Badge>
                            <Badge variant="outline">
                              {alt.direction === "TWO_WAY"
                                ? "Çift Yönlü Muadil (TWO_WAY)"
                                : "Tek Yönlü İkame (ONE_WAY)"}
                            </Badge>
                            <Badge className="bg-emerald-100 text-emerald-800">
                              Uyumluluk: %{alt.compatibilityScore}
                            </Badge>
                          </div>
                          <Badge
                            variant="secondary"
                            className={
                              alt.autoSubstituteOnStockout
                                ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                                : ""
                            }
                          >
                            {alt.autoSubstituteOnStockout
                              ? "Stok Yoksa Otomatik İkame Aktif"
                              : "Onaylı İkame"}
                          </Badge>
                        </div>

                        <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-11 items-center">
                          <div className="sm:col-span-5 rounded bg-slate-50 p-2.5 border border-slate-200">
                            <div className="text-[11px] text-slate-500">Ana Stok Kartı</div>
                            <div className="font-semibold text-sm text-slate-900">
                              {alt.primaryName}
                            </div>
                            <div className="font-mono text-xs text-slate-600">{alt.primarySku}</div>
                          </div>

                          <div className="sm:col-span-1 flex justify-center">
                            <ArrowRightLeft className="h-5 w-5 text-indigo-600" />
                          </div>

                          <div className="sm:col-span-5 rounded bg-indigo-50/40 p-2.5 border border-indigo-200">
                            <div className="text-[11px] text-indigo-600">Muadil / Alternatif Ürün</div>
                            <div className="font-semibold text-sm text-slate-900">
                              {alt.substituteName}
                            </div>
                            <div className="font-mono text-xs text-indigo-700">
                              {alt.substituteSku} (Fiyat Farkı: {alt.priceDiffPercent > 0 ? `+${alt.priceDiffPercent}%` : `${alt.priceDiffPercent}%`})
                            </div>
                          </div>
                        </div>

                        <p className="mt-2.5 text-xs text-slate-600">
                          <strong>Mühendislik / Reçete Notu:</strong> {alt.notes}
                        </p>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* 5. SEKME: ÜRÜN AĞACI (BOM) REÇETE & FIFO / LIFO / STANDART MALİYET DEĞERLEME MOTORU */}
          <TabsContent value="bom-valuation" className="space-y-6">
            <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
              {/* Sol: FIFO / LIFO / Ağırlıklı Ortalama / Standart Maliyet Simülatörü */}
              <Card className="border-slate-200 lg:col-span-7">
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2">
                    <Calculator className="h-4 w-4 text-blue-600" />
                    FIFO, LIFO, Ağırlıklı Ortalama ve Standart Maliyet Değerleme Motoru
                  </CardTitle>
                  <CardDescription>
                    Stok çıkış miktarına göre hangi maliyet katmanlarının (Cost Layers) tüketildiğini ve 4 yöntemin SMM (Satılan Malın Maliyeti) farkını canlı simüle edin.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                    <div className="sm:col-span-2">
                      <Label className="text-xs">Değerlenecek Stok Kartı</Label>
                      <Select value={valItemId} onValueChange={setValItemId}>
                        <SelectTrigger className="mt-1">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {state.items
                            .filter(i => i.costLayers.length > 0)
                        {(state.items || [])
                            .filter(i => (i.costLayers?.length ?? 0) > 0)
                            .map(item => (
                              <SelectItem key={item.id} value={item.id}>
                                {item.sku} — {item.name} (Eldeki: {item.totalOnHand} {item.baseUnit})
                              </SelectItem>
                            ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label className="text-xs">Simüle Edilen Çıkış Miktarı</Label>
                      <Input
                        type="number"
                        value={valIssueQty}
                        onChange={e => setValIssueQty(e.target.value)}
                        className="mt-1"
                      />
                    </div>
                  </div>

                  {/* Mevcut Maliyet Katmanları */}
                  <div>
                    <div className="text-xs font-semibold text-slate-700 mb-1.5">
                      Açık Maliyet Katmanları (Cost Layers — {selectedValItem?.sku})
                      Açık Maliyet Katmanları (Cost Layers — {selectedValItem?.sku || "SKU"})
                    </div>
                    <div className="rounded-lg border border-slate-200 overflow-hidden">
                      <table className="w-full text-left text-xs">
                        <thead className="bg-slate-50 text-slate-600 border-b">
                          <tr>
                            <th className="p-2">Giriş Belgesi</th>
                            <th className="p-2">Tarih</th>
                            <th className="p-2">Lot No</th>
                            <th className="p-2 text-right">Kalan Miktar</th>
                            <th className="p-2 text-right">Birim Maliyet</th>
                            <th className="p-2 text-right">Katman Değeri</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-200">
                          {selectedValItem?.costLayers.map(layer => (
                            {(selectedValItem?.costLayers || []).map(layer => (
                              <tr key={layer.id}>
                                <td className="p-2 font-mono font-semibold">{layer.receiptDocNo}</td>
                                <td className="p-2">{layer.layerDate}</td>
                                <td className="p-2 font-mono">{layer.lotNumber}</td>
                                <td className="p-2 text-right font-bold">{layer.remainingQty}</td>
                                <td className="p-2 text-right">
                                  ₺{layer.unitCost.toLocaleString("tr-TR")}
                                </td>
                                <td className="p-2 text-right font-semibold">
                                  ₺{(layer.remainingQty * layer.unitCost).toLocaleString("tr-TR")}
                                </td>
                              </tr>
                            ))}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  {/* 4 Değerleme Yöntemi Karşılaştırma Kartları */}
                  {valuationComparisons && (
                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                      {valuationComparisons.map(res => (
                        <div
                          key={res.method}
                          className="rounded-lg border border-slate-200 bg-slate-50/60 p-3.5 space-y-1.5"
                        >
                          <div className="flex items-center justify-between">
                            <Badge className="bg-slate-900 text-white">{res.method}</Badge>
                            <span className="text-xs text-slate-500">
                              Birim SMM: <strong>₺{res.unitCost.toLocaleString("tr-TR")}</strong>
                            </span>
                          </div>
                          <div className="grid grid-cols-2 gap-2 pt-1 text-xs">
                            <div>
                              <span className="text-slate-500">Çıkış SMM (COGS):</span>
                              <div className="font-bold text-rose-700 text-sm">
                                ₺{res.cogsForSimulatedIssue.toLocaleString("tr-TR")}
                              </div>
                            </div>
                            <div>
                              <span className="text-slate-500">Kalan Envanter Değeri:</span>
                              <div className="font-bold text-emerald-700 text-sm">
                                ₺{res.endingInventoryValue.toLocaleString("tr-TR")}
                              </div>
                            </div>
                          </div>
                          <div className="pt-1 border-t border-slate-200/80 text-[11px] text-slate-600">
                            Tüketilen Katmanlar:{" "}
                            {res.consumedLayersBreakdown
                              .map(c => `${c.lotNumber} (${c.consumedQty}x₺${c.unitCost})`)
                              .join(", ")}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Sağ: Ürün Ağacı (BOM) Reçete ve Maliyet Rollup */}
              <Card className="border-slate-200 lg:col-span-5">
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2">
                    <GitBranch className="h-4 w-4 text-emerald-600" />
                    Ürün Ağacı (BOM) Reçete & Maliyet Rollup
                  </CardTitle>
                  <CardDescription>
                    Hammadde, ambalaj, fire oranı, işçilik ve genel üretim giderleri dahil reçete maliyet motoru.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-3 gap-2">
                    <div className="col-span-2">
                      <Label className="text-xs">Ürün Ağacı (BOM) Reçetesi</Label>
                      <Select value={selectedBomId} onValueChange={setSelectedBomId}>
                        <SelectTrigger className="mt-1">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {state.bomRecipes.map(b => (
                            <SelectItem key={b.id} value={b.id}>
                              {b.bomCode} — {b.finishedName}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label className="text-xs">Üretim Adedi</Label>
                      <Input
                        type="number"
                        value={bomBatchMultiplier}
                        onChange={e => setBomBatchMultiplier(e.target.value)}
                        className="mt-1"
                      />
                    </div>
                  </div>

                  {selectedBom && bomCalculation && (
                    <>
                      <div className="rounded-lg border border-slate-200 overflow-hidden">
                        <table className="w-full text-left text-xs">
                          <thead className="bg-slate-50 text-slate-600 border-b">
                            <tr>
                              <th className="p-2">Bileşen / Hammadde</th>
                              <th className="p-2 text-right">Birim Miktar</th>
                              <th className="p-2 text-right">Fire %</th>
                              <th className="p-2 text-right">Net Maliyet</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-200">
                            {bomCalculation.componentDetails.map(comp => (
                              <tr key={comp.id}>
                                <td className="p-2">
                                  <div className="font-medium text-slate-900">
                                    {comp.componentName}
                                  </div>
                                  <div className="font-mono text-[10px] text-slate-500">
                                    {comp.componentSku}
                                  </div>
                                </td>
                                <td className="p-2 text-right">
                                  {comp.effectiveQty} {comp.unit}
                                </td>
                                <td className="p-2 text-right text-amber-700">
                                  %{comp.scrapPercent}
                                </td>
                                <td className="p-2 text-right font-semibold">
                                  ₺{comp.lineTotalCost.toLocaleString("tr-TR")}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>

                      <div className="rounded-xl bg-slate-900 text-white p-4 space-y-2 text-xs">
                        <div className="flex justify-between text-slate-300">
                          <span>Hammadde + Fire Toplamı (1 Birim):</span>
                          <span>₺{bomCalculation.materialCostTotal.toLocaleString("tr-TR")}</span>
                        </div>
                        <div className="flex justify-between text-slate-300">
                          <span>Direkt İşçilik + Genel Üretim (Overhead):</span>
                          <span>
                            ₺
                            {(
                              selectedBom.laborCostTry + selectedBom.overheadCostTry
                            ).toLocaleString("tr-TR")}
                          </span>
                        </div>
                        <div className="flex justify-between text-sm font-bold text-emerald-400 pt-2 border-t border-slate-700">
                          <span>1 Birim Mamul Standart/Rollup Maliyeti:</span>
                          <span>₺{bomCalculation.unitFinishedCost.toLocaleString("tr-TR")}</span>
                        </div>
                        <div className="flex justify-between text-sm font-bold text-amber-300">
                          <span>
                            {Number(bomBatchMultiplier) || 1} Birim Parti Üretim Toplam Maliyeti:
                          </span>
                          <span>
                            ₺
                            {(
                              bomCalculation.unitFinishedCost *
                              Math.max(1, Number(bomBatchMultiplier) || 1)
                            ).toLocaleString("tr-TR")}
                          </span>
                        </div>
                      </div>
                    </>
                  )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>

        {/* Yeni Stok Kartı Oluşturma Modalı */}
        <Dialog open={isAddModalOpen} onOpenChange={setIsAddModalOpen}>
          <DialogContent className="sm:max-w-lg">
            <DialogHeader>
              <DialogTitle>Yeni Kurumsal Stok Kartı Aç</DialogTitle>
              <DialogDescription>
                Çoklu depo bakiyesi, GS1 barkodu, birim dönüşümü ve FIFO maliyet katmanı otomatik oluşturulur.
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-3 py-2">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-xs">SKU Kodu (Opsiyonel)</Label>
                  <Input
                    placeholder="Örn: SKU-FLR-2026"
                    value={newSku}
                    onChange={e => setNewSku(e.target.value)}
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label className="text-xs">Kategori</Label>
                  <Input
                    value={newCategory}
                    onChange={e => setNewCategory(e.target.value)}
                    className="mt-1"
                  />
                </div>
              </div>
              <div>
                <Label className="text-xs">Stok Kartı Adı</Label>
                <Input
                  placeholder="Örn: Kraliyet Şakayık Aranjmanı (VIP Seri)"
                  value={newName}
                  onChange={e => setNewName(e.target.value)}
                  className="mt-1"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-xs">Varsayılan Depo</Label>
                  <Select value={newWhId} onValueChange={setNewWhId}>
                    <SelectTrigger className="mt-1">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {state.warehouses.map(w => (
                        <SelectItem key={w.id} value={w.id}>
                          {w.code} — {w.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-xs">Maliyet Değerleme Yöntemi</Label>
                  <Select
                    value={newValuationMethod}
                    onValueChange={v => setNewValuationMethod(v as ValuationMethod)}
                  >
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
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <Label className="text-xs">Açılış Stoğu</Label>
                  <Input
                    type="number"
                    value={newInitialQty}
                    onChange={e => setNewInitialQty(e.target.value)}
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label className="text-xs">Birim Maliyet (₺)</Label>
                  <Input
                    type="number"
                    value={newUnitCost}
                    onChange={e => setNewUnitCost(e.target.value)}
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label className="text-xs">Satış Fiyatı (₺)</Label>
                  <Input
                    type="number"
                    value={newSalesPrice}
                    onChange={e => setNewSalesPrice(e.target.value)}
                    className="mt-1"
                  />
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsAddModalOpen(false)}>
                İptal
              </Button>
              <Button
                onClick={handleCreateItem}
                className="bg-emerald-600 hover:bg-emerald-700 text-white"
              >
                Stok Kartını Kaydet
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Yeni Lot / SKT Kaydı Modalı */}
        <Dialog open={isLotModalOpen} onOpenChange={setIsLotModalOpen}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Yeni Lot / Parti ve SKT Kaydı Aç</DialogTitle>
              <DialogDescription>
                Uçtan uca izlenebilirlik (Traceability) ve FEFO sevkiyat önceliği için lot bilgilerini giriniz.
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-3 py-2">
              <div>
                <Label className="text-xs">Stok Kartı</Label>
                <Select value={newLotItemId} onValueChange={setNewLotItemId}>
                  <SelectTrigger className="mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {state.items.map(i => (
                      <SelectItem key={i.id} value={i.id}>
                        {i.sku} — {i.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-xs">Lot Numarası</Label>
                  <Input
                    placeholder="LOT-2026-880"
                    value={newLotNumber}
                    onChange={e => setNewLotNumber(e.target.value)}
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label className="text-xs">Son Kullanma Tarihi (SKT)</Label>
                  <Input
                    type="date"
                    value={newLotExpiry}
                    onChange={e => setNewLotExpiry(e.target.value)}
                    className="mt-1"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-xs">Parti Miktarı</Label>
                  <Input
                    type="number"
                    value={newLotQty}
                    onChange={e => setNewLotQty(e.target.value)}
                    className="mt-1"
                  />
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
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsLotModalOpen(false)}>
                Vazgeç
              </Button>
              <Button
                onClick={handleCreateLot}
                className="bg-indigo-600 hover:bg-indigo-700 text-white"
              >
                Lot Zincirini Başlat
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    )
  }

