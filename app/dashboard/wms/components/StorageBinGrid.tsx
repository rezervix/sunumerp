"use client"

import React, { useState } from "react"
import { motion } from "framer-motion"
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
    <div className="space-y-5">
      {/* FİLTRE VE ARAMA ÇUBUĞU */}
      <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between glass-panel p-4 rounded-2xl">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-white/40" />
          <Input
            placeholder="Hücre kodu (A-01-01), bölge ara..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="pl-10 text-xs glass-input h-10"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          {/* Doluluk Renk Rehberi */}
          <div className="hidden lg:flex items-center gap-3 text-[11px] text-white/60 mr-2 px-3 py-1.5 rounded-xl bg-white/5 border border-white/10">
            <span className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-400" /> Normal (&lt;%60)
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-amber-400" /> Yoğun (%60-%79)
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-rose-400" /> Kritik (&ge;%80)
            </span>
          </div>

          {/* Depo Filtresi */}
          <Select value={selectedWarehouseId} onValueChange={setSelectedWarehouseId}>
            <SelectTrigger className="w-36 sm:w-44 text-xs glass-input h-10">
              <SelectValue placeholder="Tüm Depolar" />
            </SelectTrigger>
            <SelectContent className="bg-slate-950/95 border-white/15 text-white backdrop-blur-xl">
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
            <SelectTrigger className="w-40 text-xs glass-input h-10">
              <SelectValue placeholder="Tüm Bölgeler" />
            </SelectTrigger>
            <SelectContent className="bg-slate-950/95 border-white/15 text-white backdrop-blur-xl">
              <SelectItem value="ALL" className="text-xs">Tüm Bölgeler</SelectItem>
              <SelectItem value="COLD_STORAGE" className="text-xs">Soğuk Hava (+4°C)</SelectItem>
              <SelectItem value="FAST_PICK" className="text-xs">Hızlı Toplama</SelectItem>
              <SelectItem value="BULK_STORAGE" className="text-xs">Kuru & Palet İstif</SelectItem>
              <SelectItem value="RECEIVING" className="text-xs">Mal Kabul Rampa</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* RAF HÜCRELERİ MATRİSİ (21st.dev BENTO-GRID GÖRÜNÜMÜ) */}
      {filteredBins.length === 0 ? (
        <div className="glass-card rounded-2xl p-10 text-center text-xs text-white/50">
          Aramanıza uygun raf hücresi bulunamadı.
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
          {filteredBins.map(bin => {
            const occupancy = Number(bin.occupancyPercent || 0)
            const balances = bin.stockBalances || []
            const totalItemsCount = balances.reduce((sum, b) => sum + Number(b.onHandQty || 0), 0)

            // Doluluk oranına göre renklenen yarı saydam cam kutu sınıfları (yeşil / kehribar / kırmızı)
            const bentoCardClass =
              occupancy >= 80
                ? "bg-rose-500/10 hover:bg-rose-500/15 border-rose-500/30 shadow-[0_0_24px_rgba(244,63,94,0.12)]"
                : occupancy >= 60
                  ? "bg-amber-500/10 hover:bg-amber-500/15 border-amber-500/30 shadow-[0_0_24px_rgba(245,158,11,0.12)]"
                  : occupancy > 0
                    ? "bg-emerald-500/10 hover:bg-emerald-500/15 border-emerald-500/30 shadow-[0_0_24px_rgba(16,185,129,0.12)]"
                    : "bg-white/5 hover:bg-white/10 border-white/10"

            const pillBadgeClass =
              occupancy >= 80
                ? "bg-rose-500/15 text-rose-300 border-rose-500/30"
                : occupancy >= 60
                  ? "bg-amber-500/15 text-amber-300 border-amber-500/30"
                  : occupancy > 0
                    ? "bg-emerald-500/15 text-emerald-300 border-emerald-500/30"
                    : "bg-white/10 text-white/60 border-white/15"

            const barColorClass =
              occupancy >= 80
                ? "bg-rose-400"
                : occupancy >= 60
                  ? "bg-amber-400"
                  : "bg-emerald-400"

            return (
              <motion.div
                key={bin.id}
                whileHover={{ y: -4, scale: 1.01 }}
                onClick={() => openBinDrawer(bin)}
                className={`cursor-pointer backdrop-blur-md border rounded-2xl p-4 space-y-3 transition-all group relative overflow-hidden ${bentoCardClass}`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <span className="font-mono font-bold text-sm text-white group-hover:text-indigo-300 transition-colors">
                      {bin.code}
                    </span>
                    {bin.isBlocked && (
                      <span title="Hücre Kilitli">
                        <Lock className="h-3.5 w-3.5 text-rose-400" />
                      </span>
                    )}
                  </div>

                  <span
                    className={`rounded-full px-3 py-0.5 text-xs font-bold border ${pillBadgeClass}`}
                  >
                    %{occupancy}
                  </span>
                </div>

                <div className="text-xs text-white/70">
                  <div className="truncate font-medium">{bin.binPosition || "Standart Raf"}</div>
                  <div className="text-[11px] text-white/45 font-mono truncate mt-0.5">
                    {bin.zone?.name || "Depo Bölgesi"}
                  </div>
                </div>

                {/* Doluluk Çubuğu */}
                <div className="w-full bg-black/30 rounded-full h-1.5 overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all ${barColorClass}`}
                    style={{ width: `${Math.min(100, occupancy)}%` }}
                  />
                </div>

                {/* Hücredeki Ürün / Stok */}
                <div className="pt-2 border-t border-white/10 flex items-center justify-between text-xs">
                  <span className="text-white/50">Toplam Stok:</span>
                  <span className="font-bold text-white font-mono">
                    {totalItemsCount > 0 ? `${totalItemsCount} Adet` : "Boş Hücre"}
                  </span>
                </div>
              </motion.div>
            )
          })}
        </div>
      )}

      {/* HÜCRE DETAY ÇEKMECESİ (DRAWER) */}
      <Sheet open={isDrawerOpen} onOpenChange={setIsDrawerOpen}>
        <SheetContent
          side="right"
          className="w-full sm:max-w-md backdrop-blur-xl bg-slate-950/85 border-l border-white/15 text-white p-6 overflow-y-auto shadow-2xl"
        >
          {selectedBin && (
            <div className="space-y-5">
              <SheetHeader>
                <div className="flex items-center gap-2.5">
                  <span className="bg-indigo-500/15 text-indigo-300 border border-indigo-500/30 rounded-full px-3 py-0.5 text-xs font-mono font-bold">
                    {selectedBin.code}
                  </span>
                  <SheetTitle className="text-lg font-bold text-white">
                    {selectedBin.binPosition || "Hücre Detayları"}
                  </SheetTitle>
                </div>
                <SheetDescription className="text-xs text-white/60">
                  {selectedBin.warehouse?.name} • {selectedBin.zone?.name}
                </SheetDescription>
              </SheetHeader>

              {/* Hücre Özellikleri */}
              <div className="grid grid-cols-2 gap-3 text-xs glass-card p-4 rounded-2xl">
                <div>
                  <span className="text-white/45 block text-[11px]">Hücre Tipi</span>
                  <span className="font-semibold text-white mt-0.5 block">{selectedBin.binType}</span>
                </div>
                <div>
                  <span className="text-white/45 block text-[11px]">Hız Sınıfı (ABC)</span>
                  <span className="font-semibold text-emerald-300 font-mono mt-0.5 block">Sınıf {selectedBin.abcVelocity}</span>
                </div>
                <div>
                  <span className="text-white/45 block text-[11px]">Ağırlık Kapasitesi</span>
                  <span className="font-semibold text-white mt-0.5 block">{selectedBin.maxWeightKg} kg</span>
                </div>
                <div>
                  <span className="text-white/45 block text-[11px]">Hacim Kapasitesi</span>
                  <span className="font-semibold text-white mt-0.5 block">{selectedBin.maxVolumeM3} m³</span>
                </div>
              </div>

              {/* Hücredeki Mevcut Ürünler */}
              <div className="space-y-2.5">
                <div className="text-xs font-bold text-white flex items-center justify-between">
                  <span>Hücredeki Ürünler</span>
                  <span className="text-[11px] text-white/50 font-normal">
                    {selectedBin.stockBalances?.length || 0} Çeşit
                  </span>
                </div>

                {(!selectedBin.stockBalances || selectedBin.stockBalances.length === 0) ? (
                  <div className="p-5 glass-card rounded-2xl text-center text-xs text-white/45">
                    Bu hücrede şu an kayıtlı stok bulunmuyor.
                  </div>
                ) : (
                  <div className="space-y-2.5">
                    {selectedBin.stockBalances.map(sb => (
                      <div
                        key={sb.id}
                        className="p-3.5 glass-card rounded-2xl space-y-1.5"
                      >
                        <div className="flex items-center justify-between text-xs">
                          <span className="font-bold text-white">{sb.item?.name || "Ürün"}</span>
                          <span className="font-bold text-emerald-400 font-mono">
                            {sb.onHandQty} {sb.item?.baseUnit || "Adet"}
                          </span>
                        </div>
                        <div className="flex items-center justify-between text-[11px] text-white/50 font-mono">
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
