"use client"

import React, { useState } from "react"
import {
  MapPin,
  Box,
  Layers,
  Thermometer,
  Weight,
  Maximize2,
  Lock,
  Search,
  CheckCircle2,
  AlertTriangle
} from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"
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
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle
} from "@/components/ui/sheet"

export interface StorageBinRecord {
  id: string
  warehouseId: string
  zoneId: string
  code: string
  aisle: string
  rack: string
  level: string
  binPosition: string
  binType: string
  abcVelocity: string
  maxWeightKg: number
  currentWeightKg: number
  maxVolumeM3: number
  currentVolumeM3: number
  occupancyPercent: number
  isBlocked: boolean
  blockReason?: string
  zone?: {
    id: string
    code: string
    name: string
    zoneType: string
    temperatureMin?: number
    temperatureMax?: number
  }
  warehouse?: {
    id: string
    name: string
    code: string
  }
  stockBalances?: Array<{
    id: string
    itemId: string
    onHandQty: number
    availableQty: number
    item?: {
      id: string
      sku: string
      name: string
      baseUnit: string
      salesPrice?: number
    }
  }>
}

interface StorageBinGridProps {
  bins: StorageBinRecord[]
  warehouses: Array<{ id: string; name: string; code: string }>
}

export function StorageBinGrid({ bins, warehouses }: StorageBinGridProps) {
  const [selectedWarehouseId, setSelectedWarehouseId] = useState<string>("ALL")
  const [selectedZoneType, setSelectedZoneType] = useState<string>("ALL")
  const [searchQuery, setSearchQuery] = useState("")
  const [selectedBin, setSelectedBin] = useState<StorageBinRecord | null>(null)
  const [isDrawerOpen, setIsDrawerOpen] = useState(false)

  // Filtreleme
  const filteredBins = bins.filter(bin => {
    const q = searchQuery.toLowerCase().trim()
    const matchesSearch =
      !q ||
      bin.code.toLowerCase().includes(q) ||
      bin.binPosition?.toLowerCase().includes(q) ||
      bin.zone?.name?.toLowerCase().includes(q)

    const matchesWh = selectedWarehouseId === "ALL" || bin.warehouseId === selectedWarehouseId
    const matchesZone = selectedZoneType === "ALL" || bin.zone?.zoneType === selectedZoneType

    return matchesSearch && matchesWh && matchesZone
  })

  const openBinDrawer = (bin: StorageBinRecord) => {
    setSelectedBin(bin)
    setIsDrawerOpen(true)
  }

  return (
    <div className="space-y-4">
      {/* FİLTRE VE ARAMA ÇUBUĞU */}
      <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between bg-white p-3 rounded-xl border border-slate-200/80 shadow-xs">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <Input
            placeholder="Hücre kodu (A-01-01), bölge ara..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="pl-9 text-xs bg-slate-50 border-slate-200"
          />
        </div>

        <div className="flex items-center gap-2">
          {/* Depo Filtresi */}
          <Select value={selectedWarehouseId} onValueChange={setSelectedWarehouseId}>
            <SelectTrigger className="w-36 sm:w-44 text-xs bg-slate-50 border-slate-200">
              <SelectValue placeholder="Tüm Depolar" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL" className="text-xs">Tüm Depolar</SelectItem>
              {warehouses.map(wh => (
                <SelectItem key={wh.id} value={wh.id} className="text-xs">
                  {wh.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* Bölge Türü Filtresi */}
          <Select value={selectedZoneType} onValueChange={setSelectedZoneType}>
            <SelectTrigger className="w-36 text-xs bg-slate-50 border-slate-200">
              <SelectValue placeholder="Tüm Bölgeler" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL" className="text-xs">Tüm Bölgeler</SelectItem>
              <SelectItem value="COLD_STORAGE" className="text-xs">Soğuk Hava (+4°C)</SelectItem>
              <SelectItem value="FAST_PICK" className="text-xs">Hızlı Toplama</SelectItem>
              <SelectItem value="BULK_STORAGE" className="text-xs">Kuru & Palet İstif</SelectItem>
              <SelectItem value="RECEIVING" className="text-xs">Mal Kabul Rampa</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* RAF HÜCRELERİ MATRİSİ (GRID) */}
      {filteredBins.length === 0 ? (
        <div className="bg-white rounded-xl border border-slate-200/80 p-8 text-center text-xs text-slate-500">
          Aramanıza uygun raf hücresi bulunamadı.
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
          {filteredBins.map(bin => {
            const occupancy = Number(bin.occupancyPercent || 0)
            const balances = bin.stockBalances || []
            const totalItemsCount = balances.reduce((sum, b) => sum + Number(b.onHandQty || 0), 0)

            return (
              <Card
                key={bin.id}
                onClick={() => openBinDrawer(bin)}
                className="cursor-pointer border-slate-200/80 hover:border-indigo-300 hover:shadow-sm transition-all group overflow-hidden"
              >
                <CardContent className="p-3.5 space-y-2.5">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5">
                      <span className="font-mono font-bold text-sm text-slate-900 group-hover:text-indigo-600 transition-colors">
                        {bin.code}
                      </span>
                      {bin.isBlocked && (
                        <span title="Hücre Kilitli">
                          <Lock className="h-3 w-3 text-rose-500" />
                        </span>
                      )}
                    </div>

                    <Badge
                      variant="outline"
                      className={`text-[10px] font-bold ${
                        occupancy >= 80
                          ? "bg-rose-50 border-rose-200 text-rose-700"
                          : occupancy > 0
                          ? "bg-blue-50 border-blue-200 text-blue-700"
                          : "bg-slate-50 border-slate-200 text-slate-500"
                      }`}
                    >
                      %{occupancy}
                    </Badge>
                  </div>

                  <div className="text-[11px] text-slate-500">
                    <div className="truncate">{bin.binPosition || "Standart Raf"}</div>
                    <div className="text-[10px] text-slate-400 font-mono truncate">
                      {bin.zone?.name || "Depo Bölgesi"}
                    </div>
                  </div>

                  {/* Doluluk Çubuğu */}
                  <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all ${
                        occupancy >= 80 ? "bg-rose-500" : "bg-indigo-600"
                      }`}
                      style={{ width: `${Math.min(100, occupancy)}%` }}
                    />
                  </div>

                  {/* Hücredeki Ürün / Stok */}
                  <div className="pt-1 border-t border-slate-100 flex items-center justify-between text-[11px]">
                    <span className="text-slate-400">Toplam Stok:</span>
                    <span className="font-bold text-slate-800 font-mono">
                      {totalItemsCount > 0 ? `${totalItemsCount} Adet` : "Boş Hücre"}
                    </span>
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}

      {/* HÜCRE DETAY ÇEKMECESİ (DRAWER) */}
      <Sheet open={isDrawerOpen} onOpenChange={setIsDrawerOpen}>
        <SheetContent side="right" className="w-full sm:max-w-md bg-white p-6 overflow-y-auto">
          {selectedBin && (
            <div className="space-y-5">
              <SheetHeader>
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="text-xs font-mono bg-indigo-50 border-indigo-200 text-indigo-700">
                    {selectedBin.code}
                  </Badge>
                  <SheetTitle className="text-lg font-bold text-slate-900">
                    {selectedBin.binPosition || "Hücre Detayları"}
                  </SheetTitle>
                </div>
                <SheetDescription className="text-xs text-slate-500">
                  {selectedBin.warehouse?.name} • {selectedBin.zone?.name}
                </SheetDescription>
              </SheetHeader>

              {/* Hücre Özellikleri */}
              <div className="grid grid-cols-2 gap-2 text-xs bg-slate-50 p-3 rounded-xl border border-slate-100">
                <div>
                  <span className="text-slate-400 block text-[10px]">Hücre Tipi</span>
                  <span className="font-semibold text-slate-800">{selectedBin.binType}</span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px]">Hız Sınıfı (ABC)</span>
                  <span className="font-semibold text-slate-800 font-mono">Sınıf {selectedBin.abcVelocity}</span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px]">Ağırlık Kapasitesi</span>
                  <span className="font-semibold text-slate-800">{selectedBin.maxWeightKg} kg</span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px]">Hacim Kapasitesi</span>
                  <span className="font-semibold text-slate-800">{selectedBin.maxVolumeM3} m³</span>
                </div>
              </div>

              {/* Hücredeki Mevcut Ürünler */}
              <div className="space-y-2">
                <div className="text-xs font-bold text-slate-900 flex items-center justify-between">
                  <span>Hücredeki Ürünler</span>
                  <span className="text-[11px] text-slate-500 font-normal">
                    {selectedBin.stockBalances?.length || 0} Çeşit
                  </span>
                </div>

                {(!selectedBin.stockBalances || selectedBin.stockBalances.length === 0) ? (
                  <div className="p-4 bg-slate-50 rounded-xl border border-slate-100 text-center text-xs text-slate-400">
                    Bu hücrede şu an kayıtlı stok bulunmuyor.
                  </div>
                ) : (
                  <div className="space-y-2">
                    {selectedBin.stockBalances.map(sb => (
                      <div
                        key={sb.id}
                        className="p-3 bg-white rounded-xl border border-slate-200/80 shadow-xs space-y-1"
                      >
                        <div className="flex items-center justify-between text-xs">
                          <span className="font-bold text-slate-900">{sb.item?.name || "Ürün"}</span>
                          <span className="font-bold text-indigo-600 font-mono">
                            {sb.onHandQty} {sb.item?.baseUnit || "Adet"}
                          </span>
                        </div>
                        <div className="flex items-center justify-between text-[11px] text-slate-500 font-mono">
                          <span>SKU: {sb.item?.sku}</span>
                          <span>Kullanılabilir: {sb.availableQty}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </SheetContent>
      </Sheet>
    </div>
  )
}

