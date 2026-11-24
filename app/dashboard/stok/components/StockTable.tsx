"use client"

import React, { useState, useMemo } from "react"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from "@/components/ui/select"
import {
  IconArrowDownLeft,
  IconArrowUpRight,
  IconEye,
  IconAlertTriangle,
  IconBoxes,
  IconLayers,
  IconChevronLeft,
  IconChevronRight
} from "@/components/ui/app-icons"
import { FilterBar } from "@/components/shared/filter-bar"
import { LedStockBar } from "@/components/shared/led-stock-bar"
import { safeText, safeCurrency, safeNumber } from "@/lib/utils/safe-display"

interface StockTableProps {
  items: any[]
  loading?: boolean
  onSelectItem: (itemId: string) => void
  onQuickMove: (mode: "IN" | "OUT", itemId: string) => void
}

const ITEMS_PER_PAGE = 10

export function StockTable({
  items,
  loading = false,
  onSelectItem,
  onQuickMove
}: StockTableProps) {
  const [searchQuery, setSearchQuery] = useState("")
  const [selectedCategory, setSelectedCategory] = useState("ALL")
  const [stockStatusFilter, setStockStatusFilter] = useState("ALL")
  const [currentPage, setCurrentPage] = useState(1)

  // Benzersiz kategorileri topla
  const categories = useMemo(() => {
    return Array.from(new Set(items.map(i => i.category || "Genel"))).filter(Boolean)
  }, [items])

  // Filtreleme
  const filteredItems = useMemo(() => {
    return items.filter(item => {
      const q = searchQuery.toLowerCase().trim()
      const name = safeText(item.name, "").toLowerCase()
      const sku = safeText(item.sku, "").toLowerCase()
      const barcode = safeText(item.barcode, "").toLowerCase()

      const matchesSearch = !q || name.includes(q) || sku.includes(q) || barcode.includes(q)

      const matchesCategory =
        selectedCategory === "ALL" || (item.category || "Genel") === selectedCategory

      const totalStock = safeNumber(item.totalOnHand, 0)
      const minStock = safeNumber(item.minStockLevel, 10)
      const isCritical = totalStock <= minStock

      const matchesStock =
        stockStatusFilter === "ALL" ||
        (stockStatusFilter === "CRITICAL" && isCritical) ||
        (stockStatusFilter === "NORMAL" && !isCritical)

      return matchesSearch && matchesCategory && matchesStock
    })
  }, [items, searchQuery, selectedCategory, stockStatusFilter])

  // Sayfalama
  const totalPages = Math.max(1, Math.ceil(filteredItems.length / ITEMS_PER_PAGE))
  const paginatedItems = useMemo(() => {
    const start = (currentPage - 1) * ITEMS_PER_PAGE
    return filteredItems.slice(start, start + ITEMS_PER_PAGE)
  }, [filteredItems, currentPage])

  // Arama değiştiğinde 1. sayfaya dön
  const handleSearchChange = (val: string) => {
    setSearchQuery(val)
    setCurrentPage(1)
  }

  return (
    <div className="space-y-4">
      {/* 1. TEKİL FİLTRE BARI (FAZ 4) */}
      <FilterBar
        searchValue={searchQuery}
        onSearchChange={handleSearchChange}
        searchPlaceholder="Ürün adı, SKU veya barkod ile filtrele..."
        onCustomizeClick={() => {}}
      >
        {/* Kategori Filtresi */}
        <Select
          value={selectedCategory}
          onValueChange={val => {
            setSelectedCategory(val)
            setCurrentPage(1)
          }}
        >
          <SelectTrigger className="w-36 sm:w-44 text-xs bg-white border-[--line] text-[--text-2] rounded-xl h-9">
            <SelectValue placeholder="Tüm Kategoriler" />
          </SelectTrigger>
          <SelectContent className="bg-white border border-[--line] text-[--text] shadow-lg">
            <SelectItem value="ALL" className="text-xs">Tüm Kategoriler</SelectItem>
            {categories.map(cat => (
              <SelectItem key={cat} value={cat} className="text-xs">
                {safeText(cat)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Stok Durumu Filtresi */}
        <Select
          value={stockStatusFilter}
          onValueChange={val => {
            setStockStatusFilter(val)
            setCurrentPage(1)
          }}
        >
          <SelectTrigger className="w-36 text-xs bg-white border-[--line] text-[--text-2] rounded-xl h-9">
            <SelectValue placeholder="Stok Durumu" />
          </SelectTrigger>
          <SelectContent className="bg-white border border-[--line] text-[--text] shadow-lg">
            <SelectItem value="ALL" className="text-xs">Tüm Stoklar</SelectItem>
            <SelectItem value="CRITICAL" className="text-xs text-[--bad] font-medium">
              Kritik Seviyedekiler
            </SelectItem>
            <SelectItem value="NORMAL" className="text-xs">Yeterli Seviye</SelectItem>
          </SelectContent>
        </Select>
      </FilterBar>

      {/* 2. ANA TABLO KARTI (CAM ÇERÇEVE, BEYAZ TABLO SATIRLARI) */}
      <div className="bg-white border border-[--line] rounded-[20px] overflow-hidden shadow-card">
        <Table>
          <TableHeader className="bg-[--muted-bg]/60">
            <TableRow className="border-b border-[--line] hover:bg-transparent">
              <TableHead className="w-[30%] py-3.5 pl-6 text-[11px] font-medium uppercase tracking-[0.12em] text-[--text-muted]">
                1. Ürün Bilgisi
              </TableHead>
              <TableHead className="w-[15%] text-[11px] font-medium uppercase tracking-[0.12em] text-[--text-muted]">
                2. Kategori & Değerleme
              </TableHead>
              <TableHead className="w-[20%] text-[11px] font-medium uppercase tracking-[0.12em] text-[--text-muted]">
                3. Stok & Seviye (LED)
              </TableHead>
              <TableHead className="w-[12%] text-right text-[11px] font-medium uppercase tracking-[0.12em] text-[--text-muted]">
                4. Birim Maliyet
              </TableHead>
              <TableHead className="w-[12%] text-right text-[11px] font-medium uppercase tracking-[0.12em] text-[--text-muted]">
                5. Satış Fiyatı
              </TableHead>
              <TableHead className="w-[11%] text-right pr-6 text-[11px] font-medium uppercase tracking-[0.12em] text-[--text-muted]">
                6. İşlemler
              </TableHead>
            </TableRow>
          </TableHeader>

          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={6} className="h-36 text-center text-xs text-[--text-muted]">
                  Stok verileri yükleniyor...
                </TableCell>
              </TableRow>
            ) : paginatedItems.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="h-36 text-center text-xs text-[--text-muted]">
                  <div className="flex flex-col items-center justify-center gap-2 py-6">
                    <IconBoxes size={32} className="text-[--text-muted]" />
                    <span>Aramanıza uygun ürün bulunamadı.</span>
                  </div>
                </TableCell>
              </TableRow>
            ) : (
              paginatedItems.map(item => {
                const totalStock = safeNumber(item.totalOnHand, 0)
                const availableStock = safeNumber(item.totalAvailable, 0)
                const minStock = safeNumber(item.minStockLevel, 10)
                const isCritical = totalStock <= minStock
                const unitCost = safeNumber(
                  item.fifoUnitCost ?? item.currentAvgCost ?? item.standardCost,
                  0
                )
                const salesPrice = safeNumber(item.salesPrice, 0)

                return (
                  <TableRow
                    key={item.id}
                    onClick={() => onSelectItem(item.id)}
                    className="border-b border-[--line-soft] hover:bg-[--brand-soft]/40 transition-colors cursor-pointer group"
                  >
                    {/* SÜTUN 1: ÜRÜN BİLGİSİ */}
                    <TableCell className="py-3.5 pl-6">
                      <div className="space-y-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="font-medium text-sm text-[--text] group-hover:text-[--brand] transition-colors">
                            {safeText(item.name, "İsimsiz Ürün")}
                          </span>
                          {item.itemType === "MATRIX_PARENT" && (
                            <Badge variant="neutral" size="sm">
                              <IconLayers size={11} className="mr-1" />
                              Varyantlı
                            </Badge>
                          )}
                          {item.bomHeaders && item.bomHeaders.length > 0 && (
                            <Badge variant="brand" size="sm">
                              Reçeteli (BOM)
                            </Badge>
                          )}
                        </div>

                        <div className="flex items-center gap-2 text-[11px] text-[--text-muted] font-mono">
                          <span>SKU: {safeText(item.sku, "—")}</span>
                          {item.barcode && item.barcode !== item.sku && (
                            <>
                              <span>•</span>
                              <span>Barkod: {safeText(item.barcode)}</span>
                            </>
                          )}
                        </div>
                      </div>
                    </TableCell>

                    {/* SÜTUN 2: KATEGORİ & DEĞERLEME */}
                    <TableCell>
                      <div className="space-y-1">
                        <Badge variant="outline" size="sm">
                          {safeText(item.category, "Genel")}
                        </Badge>
                        <span className="text-[11px] text-[--text-muted] block">
                          {safeText(item.valuationMethod, "FIFO")} Değerleme
                        </span>
                      </div>
                    </TableCell>

                    {/* SÜTUN 3: STOK MİKTARI + LED ÇUBUK */}
                    <TableCell>
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span
                            className={`text-sm font-semibold tabular-nums ${
                              isCritical ? "text-[--bad]" : "text-[--text]"
                            }`}
                          >
                            {totalStock} {safeText(item.baseUnit, "Adet")}
                          </span>
                          {isCritical ? (
                            <Badge variant="bad" size="sm" className="gap-1">
                              <IconAlertTriangle size={11} />
                              Kritik
                            </Badge>
                          ) : (
                            <Badge variant="neutral" size="sm">
                              Yeterli
                            </Badge>
                          )}
                        </div>

                        {/* LED Çubuğu */}
                        <LedStockBar
                          total={totalStock}
                          minLevel={minStock}
                          isCritical={isCritical}
                          availableText={`${availableStock} uygun`}
                        />
                      </div>
                    </TableCell>

                    {/* SÜTUN 4: BİRİM MALİYET */}
                    <TableCell className="text-right">
                      <div className="space-y-0.5">
                        <span className="text-xs font-semibold text-[--text] tabular-nums block">
                          {safeCurrency(unitCost)}
                        </span>
                        <span className="text-[11px] text-[--text-muted] block">
                          Katman Bazlı
                        </span>
                      </div>
                    </TableCell>

                    {/* SÜTUN 5: SATIŞ FİYATI */}
                    <TableCell className="text-right">
                      <div className="space-y-0.5">
                        <span className="text-xs font-semibold text-[--text] tabular-nums block">
                          {safeCurrency(salesPrice)}
                        </span>
                        <span className="text-[11px] text-[--text-muted] block">
                          KDV Dahil
                        </span>
                      </div>
                    </TableCell>

                    {/* SÜTUN 6: İŞLEMLER (YALNIZCA HOVER İLE GÖRÜNÜR) */}
                    <TableCell
                      className="text-right pr-6"
                      onClick={e => e.stopPropagation()}
                    >
                      <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <Button
                          size="sm"
                          variant="ghost"
                          title="Hızlı Stok Girişi"
                          onClick={() => onQuickMove("IN", item.id)}
                          className="h-8 w-8 p-0 text-[--brand] hover:bg-[--brand-soft] rounded-lg cursor-pointer"
                        >
                          <IconArrowDownLeft size={16} />
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          title="Hızlı Stok Çıkışı"
                          onClick={() => onQuickMove("OUT", item.id)}
                          className="h-8 w-8 p-0 text-[--text-muted] hover:text-[--text] hover:bg-[--muted-bg] rounded-lg cursor-pointer"
                        >
                          <IconArrowUpRight size={16} />
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          title="Detaylı İncele"
                          onClick={() => onSelectItem(item.id)}
                          className="h-8 w-8 p-0 text-[--text-muted] hover:text-[--text] hover:bg-[--muted-bg] rounded-lg cursor-pointer"
                        >
                          <IconEye size={16} />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                )
              })
            )}
          </TableBody>
        </Table>

        {/* 3. ALT BİLGİ & SAYFALAMA */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 px-6 py-3.5 bg-[--muted-bg]/40 border-t border-[--line]">
          <span className="text-xs text-[--text-muted] tabular-nums">
            Toplam <strong className="text-[--text]">{filteredItems.length}</strong> kalem ürünün{" "}
            {filteredItems.length > 0 ? (currentPage - 1) * ITEMS_PER_PAGE + 1 : 0}-
            {Math.min(currentPage * ITEMS_PER_PAGE, filteredItems.length)} arası gösteriliyor
          </span>

          {totalPages > 1 && (
            <div className="flex items-center gap-1.5">
              <Button
                variant="secondary"
                size="sm"
                disabled={currentPage <= 1}
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                className="h-8 px-2.5 text-xs rounded-xl"
              >
                <IconChevronLeft size={14} />
              </Button>
              <span className="text-xs text-[--text] font-medium px-2 tabular-nums">
                {currentPage} / {totalPages}
              </span>
              <Button
                variant="secondary"
                size="sm"
                disabled={currentPage >= totalPages}
                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                className="h-8 px-2.5 text-xs rounded-xl"
              >
                <IconChevronRight size={14} />
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
