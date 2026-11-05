"use client"

import React, { useState } from "react"
import { motion } from "framer-motion"
import {
  MapPin,
  Lock,
  Search
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
      <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between bg-[#111513]/90 backdrop-blur-xl border border-white/[0.06] p-4 rounded-[20px]">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-500" />
          <Input
            placeholder="Hücre kodu (A-01-01), bölge ara..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="pl-10 text-xs bg-white/[0.03] border-white/[0.08] text-white rounded-xl focus:border-[#34D399] h-9.5"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          {/* Doluluk Renk Rehberi */}
          <div className="hidden lg:flex items-center gap-3 text-[11px] text-zinc-400 mr-2 px-3 py-1.5 rounded-xl bg-white/[0.03] border border-white/[0.06]">
            <span className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-[#34D399]" /> Normal (&lt;%60)
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
            <SelectTrigger className="w-36 sm:w-44 text-xs bg-white/[0.03] border-white/[0.08] text-zinc-300 rounded-xl h-9.5">
              <SelectValue placeholder="Tüm Depolar" />
            </SelectTrigger>
            <SelectContent className="bg-[#111513] border-white/[0.08] text-white backdrop-blur-xl">
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
            <SelectTrigger className="w-40 text-xs bg-white/[0.03] border-white/[0.08] text-zinc-300 rounded-xl h-9.5">
              <SelectValue placeholder="Tüm Bölgeler" />
            </SelectTrigger>
            <SelectContent className="bg-[#111513] border-white/[0.08] text-white backdrop-blur-xl">
              <SelectItem value="ALL" className="text-xs">Tüm Bölgeler</SelectItem>
              <SelectItem value="COLD_STORAGE" className="text-xs">Soğuk Hava (+4°C)</SelectItem>
              <SelectItem value="FAST_PICK" className="text-xs">Hızlı Toplama</SelectItem>
              <SelectItem value="BULK_STORAGE" className="text-xs">Kuru & Palet İstif</SelectItem>
              <SelectItem value="RECEIVING" className="text-xs">Mal Kabul Rampa</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* RAF HÜCRELERİ MATRİSİ (BENTO-GRID GÖRÜNÜMÜ & DİKEY DOLDURULAN ANİMASYONLU BAR) */}
      {filteredBins.length === 0 ? (
        <div className="bg-[#111513]/90 border border-white/[0.06] rounded-[20px] p-10 text-center text-xs text-zinc-500">
          Aramanıza uygun raf hücresi bulunamadı.
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
          {filteredBins.map(bin => {
            const occupancy = Number(bin.occupancyPercent || 0)
            const balances = bin.stockBalances || []
            const totalItemsCount = balances.reduce((sum, b) => sum + Number(b.onHandQty || 0), 0)

            const badgeClass =
              occupancy >= 80
                ? "bg-rose-500/10 text-rose-300 border-rose-500/20"
                : occupancy >= 60
                  ? "bg-amber-500/10 text-amber-300 border-amber-500/20"
                  : occupancy > 0
                    ? "bg-emerald-500/10 text-[#34D399] border-emerald-500/20"
                    : "bg-white/[0.04] text-zinc-500 border-white/[0.06]"

            const fillBgClass =
              occupancy >= 80
                ? "bg-rose-400"
                : occupancy >= 60
                  ? "bg-amber-400"
                  : "bg-[#34D399]"

            return (
              <motion.div
                key={bin.id}
                whileHover={{ y: -4 }}
                onClick={() => openBinDrawer(bin)}
                className="cursor-pointer backdrop-blur-xl bg-[#111513]/90 border border-white/[0.06] hover:border-white/[0.12] rounded-[20px] p-4.5 space-y-3 transition-colors group relative overflow-hidden shadow-xl"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <span className="font-mono font-semibold text-sm text-white group-hover:text-[#34D399] transition-colors">
                      {bin.code}
                    </span>
                    {bin.isBlocked && (
                      <span title="Hücre Kilitli">
                        <Lock className="h-3.5 w-3.5 text-rose-400" />
                      </span>
                    )}
                  </div>

                  <span
                    className={`rounded-full px-2.5 py-0.5 text-xs font-semibold border ${badgeClass}`}
                  >
                    %{occupancy}
                  </span>
                </div>

                <div className="text-xs text-zinc-300">
                  <div className="truncate font-medium">{bin.binPosition || "Standart Raf"}</div>
                  <div className="text-[11px] text-zinc-500 font-mono truncate mt-0.5">
                    {bin.zone?.name || "Depo Bölgesi"}
                  </div>
                </div>

                {/* Dikey Dolum Simülasyonu & Yatay LED Doluluk Çubuğu */}
                <div className="w-full bg-white/[0.06] rounded-full h-1.5 overflow-hidden">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${Math.min(100, occupancy)}%` }}
                    transition={{ duration: 0.8, ease: "easeOut" }}
                    className={`h-full rounded-full ${fillBgClass}`}
                  />
                </div>

                {/* Hücredeki Ürün / Stok */}
                <div className="pt-2 border-t border-white/[0.06] flex items-center justify-between text-xs">
                  <span className="text-zinc-500">Toplam Stok:</span>
                  <span className="font-medium text-white font-mono">
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
          className="w-full sm:max-w-md backdrop-blur-xl bg-[#111513] border-l border-white/[0.06] text-white p-6 overflow-y-auto shadow-2xl"
        >
          {selectedBin && (
            <motion.div
              initial={{ x: 60, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              transition={{ type: "spring", damping: 25, stiffness: 260 }}
              className="space-y-5"
            >
              <SheetHeader>
                <div className="flex items-center gap-2.5">
                  <span className="bg-emerald-500/10 text-[#34D399] border border-emerald-500/20 rounded-full px-3 py-0.5 text-xs font-mono font-semibold">
                    {selectedBin.code}
                  </span>
                  <SheetTitle className="text-lg font-semibold text-white">
                    {selectedBin.binPosition || "Hücre Detayları"}
                  </SheetTitle>
                </div>
                <SheetDescription className="text-xs text-zinc-400">
                  {selectedBin.warehouse?.name} • {selectedBin.zone?.name}
                </SheetDescription>
              </SheetHeader>

              {/* Hücre Özellikleri */}
              <div className="grid grid-cols-2 gap-3 text-xs bg-white/[0.03] border border-white/[0.06] p-4 rounded-2xl">
                <div>
                  <span className="text-zinc-500 block text-[11px]">Hücre Tipi</span>
                  <span className="font-medium text-white mt-0.5 block">{selectedBin.binType}</span>
                </div>
                <div>
                  <span className="text-zinc-500 block text-[11px]">Hız Sınıfı (ABC)</span>
                  <span className="font-medium text-[#34D399] font-mono mt-0.5 block">Sınıf {selectedBin.abcVelocity}</span>
                </div>
                <div>
                  <span className="text-zinc-500 block text-[11px]">Ağırlık Kapasitesi</span>
                  <span className="font-medium text-white mt-0.5 block">{selectedBin.maxWeightKg} kg</span>
                </div>
                <div>
                  <span className="text-zinc-500 block text-[11px]">Hacim Kapasitesi</span>
                  <span className="font-medium text-white mt-0.5 block">{selectedBin.maxVolumeM3} m³</span>
                </div>
              </div>

              {/* Hücredeki Mevcut Ürünler */}
              <div className="space-y-2.5">
                <div className="text-xs font-semibold text-white flex items-center justify-between">
                  <span>Hücredeki Ürünler</span>
                  <span className="text-[11px] text-zinc-500 font-normal">
                    {selectedBin.stockBalances?.length || 0} Çeşit
                  </span>
                </div>

                {(!selectedBin.stockBalances || selectedBin.stockBalances.length === 0) ? (
                  <div className="p-5 bg-white/[0.02] border border-dashed border-white/[0.08] rounded-2xl text-center text-xs text-zinc-500">
                    Bu hücrede şu an kayıtlı stok bulunmuyor.
                  </div>
                ) : (
                  <div className="space-y-2.5">
                    {selectedBin.stockBalances.map(sb => (
                      <div
                        key={sb.id}
                        className="p-3.5 bg-white/[0.03] border border-white/[0.06] rounded-2xl space-y-1.5"
                      >
                        <div className="flex items-center justify-between text-xs">
                          <span className="font-medium text-white">{sb.item?.name || "Ürün"}</span>
                          <span className="font-semibold text-[#34D399] font-mono">
                            {sb.onHandQty} {sb.item?.baseUnit || "Adet"}
                          </span>
                        </div>
                        <div className="flex items-center justify-between text-[11px] text-zinc-500 font-mono">
                          <span>SKU: {sb.item?.sku}</span>
                          <span>Kullanılabilir: {sb.availableQty}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </motion.div>
          )}
        </SheetContent>
      </Sheet>
    </div>
  )
}
