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
  Layers
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
      <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between bg-[#111513]/90 backdrop-blur-xl border border-white/[0.06] p-4 rounded-[20px]">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-500" />
          <Input
            placeholder="Ürün adı, SKU veya barkod ile ara..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="pl-10 text-xs bg-white/[0.03] border-white/[0.08] text-white rounded-xl focus:border-[#34D399] h-9.5"
          />
        </div>

        <div className="flex items-center gap-2.5">
          {/* Kategori Filtresi */}
          <Select value={selectedCategory} onValueChange={setSelectedCategory}>
            <SelectTrigger className="w-36 sm:w-44 text-xs bg-white/[0.03] border-white/[0.08] text-zinc-300 rounded-xl h-9.5">
              <SelectValue placeholder="Tüm Kategoriler" />
            </SelectTrigger>
            <SelectContent className="backdrop-blur-xl bg-[#111513] border border-white/[0.08] text-white">
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
            <SelectTrigger className="w-36 text-xs bg-white/[0.03] border-white/[0.08] text-zinc-300 rounded-xl h-9.5">
              <SelectValue placeholder="Stok Durumu" />
            </SelectTrigger>
            <SelectContent className="backdrop-blur-xl bg-[#111513] border border-white/[0.08] text-white">
              <SelectItem value="ALL" className="text-xs">Tüm Stoklar</SelectItem>
              <SelectItem value="CRITICAL" className="text-xs text-rose-400 font-medium">
                Kritik Seviyedekiler
              </SelectItem>
              <SelectItem value="NORMAL" className="text-xs">Yeterli Seviye</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* SADE & ŞIK 6 SÜTUNLU ANA TABLO */}
      <div className="bg-[#111513]/90 backdrop-blur-xl border border-white/[0.06] rounded-[20px] overflow-hidden shadow-2xl">
        <Table>
          <TableHeader className="bg-white/[0.02]">
            <TableRow className="border-b border-white/[0.06] text-[11px] text-zinc-400 uppercase tracking-wider hover:bg-transparent">
              <TableHead className="w-[30%] py-4 pl-5 text-zinc-400 font-medium">1. Ürün Bilgisi</TableHead>
              <TableHead className="w-[15%] text-zinc-400 font-medium">2. Kategori & Tür</TableHead>
              <TableHead className="w-[20%] text-zinc-400 font-medium">3. Stok & Seviye (LED)</TableHead>
              <TableHead className="w-[12%] text-right text-zinc-400 font-medium">4. Birim Maliyet</TableHead>
              <TableHead className="w-[12%] text-right text-zinc-400 font-medium">5. Satış Fiyatı</TableHead>
              <TableHead className="w-[11%] text-right pr-5 text-zinc-400 font-medium">6. İşlemler</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow className="border-b border-white/[0.04]">
                <TableCell colSpan={6} className="h-32 text-center text-xs text-zinc-500">
                  Stok verileri yükleniyor...
                </TableCell>
              </TableRow>
            ) : filteredItems.length === 0 ? (
              <TableRow className="border-b border-white/[0.04]">
                <TableCell colSpan={6} className="h-32 text-center text-xs text-zinc-500">
                  <div className="flex flex-col items-center justify-center gap-2 py-4">
                    <Boxes className="h-8 w-8 text-zinc-600" />
                    <span>Aramanıza uygun ürün bulunamadı.</span>
                  </div>
                </TableCell>
              </TableRow>
            ) : (
              filteredItems.map(item => {
                const totalStock = item.totalOnHand || 0
                const availableStock = item.totalAvailable || 0
                const minStock = Number(item.minStockLevel || 10)
                const isCritical = totalStock <= minStock
                const unitCost = Number(item.fifoUnitCost || item.currentAvgCost || item.standardCost || 0)

                // 5-Segment LED Bar calculation
                const ratio = minStock > 0 ? totalStock / (minStock * 2) : totalStock > 0 ? 1 : 0
                const activeSegments = Math.min(5, Math.max(totalStock > 0 ? 1 : 0, Math.round(ratio * 5)))

                return (
                  <TableRow
                    key={item.id}
                    onClick={() => onSelectItem(item.id)}
                    className="border-b border-white/[0.04] border-l-2 border-l-transparent hover:border-l-emerald-400 hover:bg-white/[0.02] transition-colors cursor-pointer group"
                  >
                    {/* SÜTUN 1: ÜRÜN BİLGİSİ */}
                    <TableCell className="py-4 pl-5">
                      <div className="space-y-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="font-medium text-sm text-white group-hover:text-[#34D399] transition-colors">
                            {item.name}
                          </span>
                          {item.itemType === "MATRIX_PARENT" && (
                            <span className="inline-flex items-center bg-white/[0.05] text-zinc-400 border border-white/[0.08] rounded-full px-2 py-0.5 text-[10px] font-medium">
                              <Layers className="h-2.5 w-2.5 mr-1" />
                              Varyantlı
                            </span>
                          )}
                          {item.bomHeaders && item.bomHeaders.length > 0 && (
                            <span className="inline-flex items-center bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 rounded-full px-2 py-0.5 text-[10px] font-medium">
                              Reçeteli (BOM)
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-2 text-[11px] text-zinc-500 font-mono">
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
                        <span className="inline-flex bg-white/[0.04] text-zinc-300 border border-white/[0.08] rounded-full px-3 py-0.5 text-xs">
                          {item.category || "Genel"}
                        </span>
                        <span className="text-[10px] text-zinc-500 block">
                          {item.valuationMethod} Değerleme
                        </span>
                      </div>
                    </TableCell>

                    {/* SÜTUN 3: MEVCUT STOK & BİRİM & KESİKLİ LED ÇUBUĞU */}
                    <TableCell>
                      <div className="space-y-1.5">
                        <div className="flex items-center gap-2">
                          <span className={`text-sm font-semibold ${
                            isCritical ? "text-rose-400" : "text-white"
                          }`}>
                            {totalStock} {item.baseUnit}
                          </span>
                          {isCritical ? (
                            <span
                              title={`Kritik stok uyarısı! Min: ${minStock}`}
                              className="inline-flex items-center gap-1 bg-rose-500/10 text-rose-300 border border-rose-500/20 rounded-full px-2 py-0.5 text-[10px] font-medium"
                            >
                              <AlertTriangle className="h-2.5 w-2.5" />
                              Kritik
                            </span>
                          ) : (
                            <span className="inline-flex items-center bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 rounded-full px-2 py-0.5 text-[10px] font-medium">
                              Yeterli
                            </span>
                          )}
                        </div>

                        {/* Kesikli (Segmented) LED Bar */}
                        <div className="flex items-center gap-1 pt-0.5">
                          {[0, 1, 2, 3, 4].map(idx => (
                            <div
                              key={idx}
                              className={`h-1.5 w-3.5 rounded-full transition-colors ${
                                idx < activeSegments
                                  ? isCritical
                                    ? "bg-rose-400 shadow-[0_0_6px_rgba(244,63,94,0.4)]"
                                    : "bg-[#34D399] shadow-[0_0_6px_rgba(52,211,153,0.35)]"
                                  : "bg-white/[0.08]"
                              }`}
                            />
                          ))}
                          <span className="text-[10px] text-zinc-500 ml-1.5">
                            {availableStock} uygun
                          </span>
                        </div>
                      </div>
                    </TableCell>

                    {/* SÜTUN 4: BİRİM MALİYET */}
                    <TableCell className="text-right">
                      <div className="space-y-0.5">
                        <span className="text-xs font-semibold text-zinc-200 block">
                          {formatCurrency(unitCost)}
                        </span>
                        <span className="text-[10px] text-zinc-500 block">
                          Katman Bazlı
                        </span>
                      </div>
                    </TableCell>

                    {/* SÜTUN 5: SATIŞ FİYATI */}
                    <TableCell className="text-right">
                      <div className="space-y-0.5">
                        <span className="text-xs font-semibold text-[#34D399] block font-mono">
                          {formatCurrency(item.salesPrice || 0)}
                        </span>
                        <span className="text-[10px] text-zinc-500 block">
                          KDV Dahil
                        </span>
                      </div>
                    </TableCell>

                    {/* SÜTUN 6: İŞLEMLER */}
                    <TableCell className="text-right pr-5" onClick={e => e.stopPropagation()}>
                      <div className="flex items-center justify-end gap-1.5">
                        <Button
                          size="sm"
                          variant="ghost"
                          title="Hızlı Stok Girişi (Alış/İrsaliye)"
                          onClick={() => onQuickMove("IN", item.id)}
                          className="h-8 w-8 p-0 text-[#34D399] hover:bg-emerald-500/10 rounded-lg cursor-pointer"
                        >
                          <ArrowDownLeft className="h-4 w-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          title="Hızlı Stok Çıkışı (Satış/Sarf)"
                          onClick={() => onQuickMove("OUT", item.id)}
                          className="h-8 w-8 p-0 text-zinc-400 hover:text-white hover:bg-white/[0.06] rounded-lg cursor-pointer"
                        >
                          <ArrowUpRight className="h-4 w-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          title="Detaylı İncele (Çekmece)"
                          onClick={() => onSelectItem(item.id)}
                          className="h-8 w-8 p-0 text-zinc-400 hover:text-white hover:bg-white/[0.06] rounded-lg cursor-pointer"
                        >
                          <Eye className="h-4 w-4" />
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
