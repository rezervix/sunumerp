"use client"

import React, { useState } from "react"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from "@/components/ui/select"
import {
  Search,
  ArrowDownLeft,
  ArrowUpRight,
  Eye,
  AlertTriangle,
  Boxes,
  Layers,
  FileSpreadsheet
} from "lucide-react"

interface StockTableProps {
  items: any[]
  loading?: boolean
  onSelectItem: (itemId: string) => void
  onQuickMove: (mode: "IN" | "OUT", itemId: string) => void
}

export function StockTable({
  items,
  loading,
  onSelectItem,
  onQuickMove
}: StockTableProps) {
  const [searchQuery, setSearchQuery] = useState("")
  const [selectedCategory, setSelectedCategory] = useState("ALL")
  const [stockStatusFilter, setStockStatusFilter] = useState("ALL")

  // Benzersiz kategorileri topla
  const categories = Array.from(new Set(items.map(i => i.category || "Genel")))

  // Filtreleme
  const filteredItems = items.filter(item => {
    const q = searchQuery.toLowerCase().trim()
    const matchesSearch =
      !q ||
      item.name?.toLowerCase().includes(q) ||
      item.sku?.toLowerCase().includes(q) ||
      item.barcode?.toLowerCase().includes(q)

    const matchesCategory =
      selectedCategory === "ALL" || item.category === selectedCategory

    const isCritical = (item.totalOnHand || 0) <= Number(item.minStockLevel || 0)
    const matchesStock =
      stockStatusFilter === "ALL" ||
      (stockStatusFilter === "CRITICAL" && isCritical) ||
      (stockStatusFilter === "NORMAL" && !isCritical)

    return matchesSearch && matchesCategory && matchesStock
  })

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat("tr-TR", {
      style: "currency",
      currency: "TRY",
      maximumFractionDigits: 2
    }).format(val || 0)
  }

  return (
    <div className="space-y-4">
      {/* ARAMA VE FİLTRELEME ÇUBUĞU */}
      <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between bg-white p-3.5 rounded-xl border border-slate-200 shadow-xs">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <Input
            placeholder="Ürün adı, SKU veya barkod ile ara..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="pl-9 text-xs bg-slate-50 border-slate-200"
          />
        </div>

        <div className="flex items-center gap-2">
          {/* Kategori Filtresi */}
          <Select value={selectedCategory} onValueChange={setSelectedCategory}>
            <SelectTrigger className="w-36 sm:w-44 text-xs bg-slate-50 border-slate-200">
              <SelectValue placeholder="Tüm Kategoriler" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL" className="text-xs">Tüm Kategoriler</SelectItem>
              {categories.map(cat => (
                <SelectItem key={cat} value={cat} className="text-xs">
                  {cat}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* Stok Durumu Filtresi */}
          <Select value={stockStatusFilter} onValueChange={setStockStatusFilter}>
            <SelectTrigger className="w-36 text-xs bg-slate-50 border-slate-200">
              <SelectValue placeholder="Stok Durumu" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL" className="text-xs">Tüm Stoklar</SelectItem>
              <SelectItem value="CRITICAL" className="text-xs text-rose-600 font-medium">
                Kritik Seviyedekiler
              </SelectItem>
              <SelectItem value="NORMAL" className="text-xs">Yeterli Seviye</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* SADE & ŞIK 6 SÜTUNLU ANA TABLO */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
        <Table>
          <TableHeader className="bg-slate-50/75">
            <TableRow className="border-b border-slate-200 text-[11px] text-slate-500 uppercase tracking-wider">
              <TableHead className="w-[30%] py-3.5 pl-4">1. Ürün Bilgisi</TableHead>
              <TableHead className="w-[15%]">2. Kategori & Tür</TableHead>
              <TableHead className="w-[18%]">3. Mevcut Stok & Birim</TableHead>
              <TableHead className="w-[12%] text-right">4. Birim Maliyet</TableHead>
              <TableHead className="w-[12%] text-right">5. Satış Fiyatı</TableHead>
              <TableHead className="w-[13%] text-right pr-4">6. İşlemler</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={6} className="h-32 text-center text-xs text-slate-500">
                  Stok verileri yükleniyor...
                </TableCell>
              </TableRow>
            ) : filteredItems.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="h-32 text-center text-xs text-slate-500">
                  <div className="flex flex-col items-center justify-center gap-1.5 py-4">
                    <Boxes className="h-8 w-8 text-slate-300" />
                    <span>Aramanıza uygun ürün bulunamadı.</span>
                  </div>
                </TableCell>
              </TableRow>
            ) : (
              filteredItems.map(item => {
                const totalStock = item.totalOnHand || 0
                const availableStock = item.totalAvailable || 0
                const isCritical = totalStock <= Number(item.minStockLevel || 0)
                const unitCost = Number(item.fifoUnitCost || item.currentAvgCost || item.standardCost || 0)

                return (
                  <TableRow
                    key={item.id}
                    onClick={() => onSelectItem(item.id)}
                    className="hover:bg-slate-50/80 cursor-pointer transition-colors border-b border-slate-100 group"
                  >
                    {/* SÜTUN 1: ÜRÜN BİLGİSİ */}
                    <TableCell className="py-3.5 pl-4">
                      <div className="space-y-0.5">
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-xs sm:text-sm text-slate-900 group-hover:text-blue-600 transition-colors">
                            {item.name}
                          </span>
                          {item.itemType === "MATRIX_PARENT" && (
                            <Badge variant="outline" className="text-[10px] text-blue-700 bg-blue-50 border-blue-200">
                              <Layers className="h-2.5 w-2.5 mr-0.5" />
                              Varyantlı
                            </Badge>
                          )}
                          {item.bomHeaders && item.bomHeaders.length > 0 && (
                            <Badge variant="outline" className="text-[10px] text-purple-700 bg-purple-50 border-purple-200">
                              Reçeteli (BOM)
                            </Badge>
                          )}
                        </div>
                        <div className="flex items-center gap-2 text-[11px] text-slate-500 font-mono">
                          <span>SKU: {item.sku}</span>
                          {item.barcode && item.barcode !== item.sku && (
                            <>
                              <span>•</span>
                              <span>Barkod: {item.barcode}</span>
                            </>
                          )}
                        </div>
                      </div>
                    </TableCell>

                    {/* SÜTUN 2: KATEGORİ & TÜR */}
                    <TableCell>
                      <div className="space-y-1">
                        <Badge variant="secondary" className="text-[11px] font-normal text-slate-700">
                          {item.category || "Genel"}
                        </Badge>
                        <span className="text-[10px] text-slate-400 block">
                          {item.valuationMethod} Değerleme
                        </span>
                      </div>
                    </TableCell>

                    {/* SÜTUN 3: MEVCUT STOK & BİRİM */}
                    <TableCell>
                      <div className="space-y-0.5">
                        <div className="flex items-center gap-1.5">
                          <span className={`text-sm font-bold ${
                            isCritical ? "text-rose-600" : "text-slate-900"
                          }`}>
                            {totalStock} {item.baseUnit}
                          </span>
                          {isCritical && (
                            <span
                              title={`Kritik stok uyarısı! Min: ${item.minStockLevel}`}
                              className="text-rose-500 flex items-center"
                            >
                              <AlertTriangle className="h-3.5 w-3.5" />
                            </span>
                          )}
                        </div>
                        <span className="text-[11px] text-slate-500 block">
                          {availableStock} kullanılabilir
                        </span>
                      </div>
                    </TableCell>

                    {/* SÜTUN 4: BİRİM MALİYET */}
                    <TableCell className="text-right">
                      <div className="space-y-0.5">
                        <span className="text-xs font-semibold text-slate-700 block">
                          {formatCurrency(unitCost)}
                        </span>
                        <span className="text-[10px] text-slate-400 block">
                          Katman Bazlı
                        </span>
                      </div>
                    </TableCell>

                    {/* SÜTUN 5: SATIŞ FİYATI */}
                    <TableCell className="text-right">
                      <div className="space-y-0.5">
                        <span className="text-xs font-bold text-slate-900 block">
                          {formatCurrency(item.salesPrice || 0)}
                        </span>
                        <span className="text-[10px] text-slate-400 block">
                          KDV Dahil
                        </span>
                      </div>
                    </TableCell>

                    {/* SÜTUN 6: İŞLEMLER */}
                    <TableCell className="text-right pr-4" onClick={e => e.stopPropagation()}>
                      <div className="flex items-center justify-end gap-1">
                        <Button
                          size="sm"
                          variant="ghost"
                          title="Hızlı Stok Girişi (Alış/İrsaliye)"
                          onClick={() => onQuickMove("IN", item.id)}
                          className="h-7 w-7 p-0 text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50"
                        >
                          <ArrowDownLeft className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          title="Hızlı Stok Çıkışı (Satış/Sarf)"
                          onClick={() => onQuickMove("OUT", item.id)}
                          className="h-7 w-7 p-0 text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                        >
                          <ArrowUpRight className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          title="Detaylı İncele (Çekmece)"
                          onClick={() => onSelectItem(item.id)}
                          className="h-7 w-7 p-0 text-slate-500 hover:text-slate-900 hover:bg-slate-100"
                        >
                          <Eye className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                )
              })
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}

