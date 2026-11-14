"use client"

import React, { useEffect, useState } from "react"
import { motion } from "framer-motion"
import { toast } from "sonner"
import {
  MapPin,
  Lock,
  Unlock,
  Search,
  LayoutGrid,
  GitBranch,
  Plus,
  QrCode,
  Building2,
  Layers,
} from "lucide-react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { PrintableLabelModal } from "./PrintableLabelModal"
import {
  WMS_BIN_ROLE_LABELS,
  resolveNormalizedBinRole,
  type WmsBinRole,
} from "@/lib/logistics/wms/constantsAndHelpers"

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
  binRole?: string | null
  abcVelocity: string
  maxWeightKg: number
  currentWeightKg: number
  maxVolumeM3: number
  currentVolumeM3: number
  occupancyPercent: number
  isBlocked: boolean
  isActive?: boolean
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
  warehouses: Array<{ id: string; name: string; code: string; city?: string }>
  zones?: Array<{ id: string; warehouseId: string; code: string; name: string; zoneType: string }>
  selectedWarehouseId?: string
  onRefresh?: () => void
}

export function StorageBinGrid({
  bins,
  warehouses,
  zones = [],
  selectedWarehouseId: parentWhId,
  onRefresh,
}: StorageBinGridProps) {
  const [selectedWarehouseId, setSelectedWarehouseId] = useState<string>(parentWhId || "ALL")
  const [selectedZoneType, setSelectedZoneType] = useState<string>("ALL")
  const [selectedBinRole, setSelectedBinRole] = useState<string>("ALL")
  const [viewMode, setViewMode] = useState<"GRID" | "HIERARCHY">("GRID")
  const [searchQuery, setSearchQuery] = useState("")
  const [selectedBin, setSelectedBin] = useState<StorageBinRecord | null>(null)
  const [isDrawerOpen, setIsDrawerOpen] = useState(false)
  const [labelBinId, setLabelBinId] = useState<string | null>(null)

  // Hiyerarşi CRUD modalları
  const [createModal, setCreateModal] = useState<"NONE" | "WAREHOUSE" | "ZONE" | "BIN">("NONE")
  const [submitting, setSubmitting] = useState(false)
  const [whCode, setWhCode] = useState("")
  const [whName, setWhName] = useState("")
  const [whCity, setWhCity] = useState("İstanbul")
  const [zWhId, setZWhId] = useState(warehouses[0]?.id || "wh-merkez-01")
  const [zCode, setZCode] = useState("")
  const [zName, setZName] = useState("")
  const [zType, setZType] = useState("COLD_STORAGE")
  const [bWhId, setBWhId] = useState(warehouses[0]?.id || "wh-merkez-01")
  const [bZoneId, setBZoneId] = useState(zones[0]?.id || "")
  const [bCode, setBCode] = useState("")
  const [bAisle, setBAisle] = useState("A")
  const [bRack, setBRack] = useState("01")
  const [bLevel, setBLevel] = useState("01")
  const [bRole, setBRole] = useState<WmsBinRole>("NORMAL")
  const [bMaxWeight, setBMaxWeight] = useState("500")
  const [bMaxVol, setBMaxVol] = useState("2.4")

  useEffect(() => {
    if (parentWhId) setSelectedWarehouseId(parentWhId)
  }, [parentWhId])

  // Filtreleme
  const filteredBins = bins.filter(bin => {
    const q = searchQuery.toLowerCase().trim()
    const role = resolveNormalizedBinRole(bin)
    const matchesSearch =
      !q ||
      bin.code.toLowerCase().includes(q) ||
      bin.binPosition?.toLowerCase().includes(q) ||
      bin.zone?.name?.toLowerCase().includes(q) ||
      WMS_BIN_ROLE_LABELS[role].toLowerCase().includes(q)

    const matchesWh = selectedWarehouseId === "ALL" || bin.warehouseId === selectedWarehouseId
    const matchesZone = selectedZoneType === "ALL" || bin.zone?.zoneType === selectedZoneType
    const matchesRole = selectedBinRole === "ALL" || role === selectedBinRole

    return matchesSearch && matchesWh && matchesZone && matchesRole
  })

  const openBinDrawer = (bin: StorageBinRecord) => {
    setSelectedBin(bin)
    setIsDrawerOpen(true)
  }

  const handleToggleBlock = async (bin: StorageBinRecord) => {
    const nextBlocked = !bin.isBlocked
    let blockReason = bin.blockReason || ""
    if (nextBlocked) {
      blockReason = window.prompt("Blokaj nedenini girin (ör. Kalite Kontrol / Hasarlı Raf):", "Kalite Kontrol İncelemesi") || "Operatör Blokajı"
    }
    try {
      const res = await fetch("/api/wms", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "toggle_bin_block",
          payload: { binId: bin.id, isBlocked: nextBlocked, blockReason },
        }),
      })
      const data = await res.json()
      if (!data.success) throw new Error(data.error || "İşlem başarısız")
      toast.success(nextBlocked ? `${bin.code} bloklandı` : `${bin.code} blokajı kaldırıldı`)
      setSelectedBin({ ...bin, isBlocked: nextBlocked, blockReason })
      onRefresh?.()
    } catch (err: any) {
      toast.error(err.message || "Hücre durumu güncellenemedi")
    }
  }

  const handleCreateHierarchy = async (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitting(true)
    try {
      let action = "upsert_warehouse"
      let payload: any = {}
      if (createModal === "WAREHOUSE") {
        action = "upsert_warehouse"
        payload = { code: whCode.trim(), name: whName.trim(), city: whCity.trim() }
      } else if (createModal === "ZONE") {
        action = "upsert_zone"
        payload = { warehouseId: zWhId, code: zCode.trim(), name: zName.trim(), zoneType: zType }
      } else if (createModal === "BIN") {
        action = "upsert_bin"
        const targetZones = zones.filter((z) => z.warehouseId === bWhId)
        const resolvedZoneId = bZoneId && targetZones.some((z) => z.id === bZoneId) ? bZoneId : (targetZones[0]?.id || "")
        if (!resolvedZoneId) throw new Error("Önce seçili depoda bir bölge tanımlayın.")
        payload = {
          warehouseId: bWhId,
          zoneId: resolvedZoneId,
          code: bCode.trim(),
          aisle: bAisle.trim() || "A",
          rack: bRack.trim() || "01",
          level: bLevel.trim() || "01",
          binRole: bRole,
          binType: bRole === "COLD_STORAGE" ? "COLD_RACK" : "STANDARD",
          maxWeightKg: Number(bMaxWeight || 500),
          maxVolumeM3: Number(bMaxVol || 2.4),
        }
      }
      const res = await fetch("/api/wms", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, payload }),
      })
      const data = await res.json()
      if (!data.success) throw new Error(data.error || "Kayıt başarısız")
      toast.success("Depo hiyerarşisi kaydedildi.")
      setCreateModal("NONE")
      onRefresh?.()
    } catch (err: any) {
      toast.error(err.message || "Kayıt sırasında hata oluştu")
    } finally {
      setSubmitting(false)
    }
  }

  // 4 seviyeli ağaç verisi (Depo -> Bölge -> Koridor/Raf -> Gözler)
  const hierarchyWarehouses = warehouses.filter(
    (w) => selectedWarehouseId === "ALL" || w.id === selectedWarehouseId
  )

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
            <SelectTrigger className="w-36 text-xs bg-white/[0.03] border-white/[0.08] text-zinc-300 rounded-xl h-9.5">
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

          {/* 7 Lokasyon Rolü Filtresi */}
          <Select value={selectedBinRole} onValueChange={setSelectedBinRole}>
            <SelectTrigger className="w-40 text-xs bg-white/[0.03] border-white/[0.08] text-zinc-300 rounded-xl h-9.5">
              <SelectValue placeholder="Lokasyon Rolü" />
            </SelectTrigger>
            <SelectContent className="bg-[#111513] border-white/[0.08] text-white backdrop-blur-xl">
              <SelectItem value="ALL" className="text-xs">Tüm Roller (7 Tip)</SelectItem>
              {(Object.keys(WMS_BIN_ROLE_LABELS) as WmsBinRole[]).map(role => (
                <SelectItem key={role} value={role} className="text-xs">
                  {WMS_BIN_ROLE_LABELS[role]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* HİYERARŞİ & GÖRÜNÜM ARAÇ ÇUBUĞU */}
      <div className="flex flex-wrap items-center justify-between gap-2 bg-[#111513]/70 border border-white/[0.06] px-4 py-2.5 rounded-2xl">
        <div className="flex items-center gap-1.5 bg-black/40 border border-white/[0.06] p-1 rounded-xl">
          <button
            type="button"
            onClick={() => setViewMode("GRID")}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium flex items-center gap-1.5 cursor-pointer transition ${
              viewMode === "GRID"
                ? "bg-[#34D399]/15 text-[#34D399] border border-emerald-500/20"
                : "text-zinc-400 hover:text-white"
            }`}
          >
            <LayoutGrid className="w-3.5 h-3.5" />
            Hücre Matrisi ({filteredBins.length})
          </button>
          <button
            type="button"
            onClick={() => setViewMode("HIERARCHY")}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium flex items-center gap-1.5 cursor-pointer transition ${
              viewMode === "HIERARCHY"
                ? "bg-[#34D399]/15 text-[#34D399] border border-emerald-500/20"
                : "text-zinc-400 hover:text-white"
            }`}
          >
            <GitBranch className="w-3.5 h-3.5" />
            4-Seviye Ağaç (Depo → Bölge → Raf → Göz)
          </button>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setCreateModal("WAREHOUSE")}
            className="h-8 text-xs bg-white/[0.03] border-white/[0.08] text-zinc-200 hover:bg-white/[0.08] rounded-xl gap-1"
          >
            <Building2 className="w-3.5 h-3.5 text-[#34D399]" /> + Depo
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setCreateModal("ZONE")}
            className="h-8 text-xs bg-white/[0.03] border-white/[0.08] text-zinc-200 hover:bg-white/[0.08] rounded-xl gap-1"
          >
            <Layers className="w-3.5 h-3.5 text-amber-400" /> + Bölge
          </Button>
          <Button
            type="button"
            size="sm"
            onClick={() => setCreateModal("BIN")}
            className="h-8 text-xs bg-[#34D399] text-[#0A0E0C] hover:bg-[#10B981] font-semibold rounded-xl gap-1"
          >
            <Plus className="w-3.5 h-3.5" /> Yeni Göz / Raf
          </Button>
        </div>
      </div>

      {/* 4 SEVİYELİ AĞAÇ GÖRÜNÜMÜ */}
      {viewMode === "HIERARCHY" ? (
        <div className="space-y-4">
          {hierarchyWarehouses.map(wh => {
            const whBins = filteredBins.filter(b => b.warehouseId === wh.id)
            const whZones = zones.filter(z => z.warehouseId === wh.id)
            const derivedZones =
              whZones.length > 0
                ? whZones
                : Array.from(
                    new Map(whBins.filter(b => b.zone).map(b => [b.zone!.id, b.zone!])).values()
                  )

            return (
              <div
                key={wh.id}
                className="backdrop-blur-xl bg-[#111513]/90 border border-white/[0.06] rounded-[20px] p-5 space-y-4"
              >
                <div className="flex items-center justify-between border-b border-white/[0.06] pb-3">
                  <div className="flex items-center gap-2.5">
                    <Building2 className="w-4 h-4 text-[#34D399]" />
                    <span className="text-sm font-semibold text-white">{wh.name}</span>
                    <span className="text-[11px] font-mono px-2 py-0.5 rounded-full bg-white/[0.05] text-zinc-400">
                      {wh.code}
                    </span>
                  </div>
                  <span className="text-xs text-zinc-400">
                    {derivedZones.length} Bölge • {whBins.length} Göz
                  </span>
                </div>

                <div className="space-y-3 pl-3 border-l border-emerald-500/20">
                  {derivedZones.map((zone: any) => {
                    const zoneBins = whBins.filter(b => b.zoneId === zone.id)
                    const aisleMap = new Map<string, StorageBinRecord[]>()
                    for (const zb of zoneBins) {
                      const key = `${zb.aisle || "A"}-${zb.rack || "01"}`
                      aisleMap.set(key, [...(aisleMap.get(key) || []), zb])
                    }

                    return (
                      <div key={zone.id} className="bg-white/[0.02] border border-white/[0.05] rounded-2xl p-3.5 space-y-2.5">
                        <div className="flex items-center justify-between text-xs">
                          <div className="flex items-center gap-2">
                            <Layers className="w-3.5 h-3.5 text-amber-400" />
                            <span className="font-semibold text-zinc-100">{zone.name}</span>
                            <span className="text-[11px] font-mono text-zinc-500">({zone.code})</span>
                          </div>
                          <span className="text-[11px] text-zinc-400">{zoneBins.length} Hücre</span>
                        </div>

                        {aisleMap.size === 0 ? (
                          <div className="text-[11px] text-zinc-500 pl-5">Bu bölgede filtrelenen hücre yok.</div>
                        ) : (
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5 pl-4 border-l border-white/[0.08]">
                            {Array.from(aisleMap.entries()).map(([aisleRack, aisleBins]) => (
                              <div key={aisleRack} className="bg-black/30 border border-white/[0.05] rounded-xl p-2.5 space-y-2">
                                <div className="text-[11px] font-mono text-zinc-400">
                                  Koridor / Raf: <span className="text-white font-semibold">{aisleRack}</span>
                                </div>
                                <div className="flex flex-wrap gap-1.5">
                                  {aisleBins.map(bin => {
                                    const role = resolveNormalizedBinRole(bin)
                                    return (
                                      <button
                                        key={bin.id}
                                        type="button"
                                        onClick={() => openBinDrawer(bin)}
                                        className={`px-2 py-1 rounded-lg text-[11px] font-mono border cursor-pointer flex items-center gap-1 transition ${
                                          bin.isBlocked
                                            ? "bg-rose-500/10 border-rose-500/30 text-rose-300"
                                            : "bg-emerald-500/10 border-emerald-500/20 text-[#34D399] hover:bg-emerald-500/20"
                                        }`}
                                      >
                                        <span>{bin.code}</span>
                                        <span className="text-[9px] text-zinc-400">({WMS_BIN_ROLE_LABELS[role].split(" ")[0]})</span>
                                      </button>
                                    )
                                  })}
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              </div>
            )
          })}
        </div>
      ) : filteredBins.length === 0 ? (
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
                  <div className="flex items-center justify-between gap-2">
                    <span className="truncate font-medium">{bin.binPosition || "Standart Raf"}</span>
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-white/[0.05] text-zinc-400 shrink-0">
                      {WMS_BIN_ROLE_LABELS[resolveNormalizedBinRole(bin)]}
                    </span>
                  </div>
                  <div className="text-[11px] text-zinc-500 font-mono truncate mt-0.5 flex items-center justify-between">
                    <span>{bin.zone?.name || "Depo Bölgesi"}</span>
                    <button
                      type="button"
                      title="QR / Barkod Etiketi Yazdır"
                      onClick={(e) => {
                        e.stopPropagation()
                        setLabelBinId(bin.id)
                      }}
                      className="text-zinc-400 hover:text-[#34D399] p-0.5 cursor-pointer"
                    >
                      <QrCode className="w-3.5 h-3.5" />
                    </button>
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
                  <span className="text-zinc-500 block text-[11px]">Lokasyon Rolü</span>
                  <span className="font-medium text-white mt-0.5 block">
                    {WMS_BIN_ROLE_LABELS[resolveNormalizedBinRole(selectedBin)]}
                  </span>
                </div>
                <div>
                  <span className="text-zinc-500 block text-[11px]">Hız Sınıfı (ABC)</span>
                  <span className="font-medium text-[#34D399] font-mono mt-0.5 block">Sınıf {selectedBin.abcVelocity}</span>
                </div>
                <div>
                  <span className="text-zinc-500 block text-[11px]">Ağırlık Kapasitesi</span>
                  <span className="font-medium text-white mt-0.5 block">
                    {Number(selectedBin.currentWeightKg || 0).toFixed(1)} / {selectedBin.maxWeightKg} kg
                  </span>
                </div>
                <div>
                  <span className="text-zinc-500 block text-[11px]">Hacim Kapasitesi</span>
                  <span className="font-medium text-white mt-0.5 block">
                    {Number(selectedBin.currentVolumeM3 || 0).toFixed(2)} / {selectedBin.maxVolumeM3} m³
                  </span>
                </div>
              </div>

              {selectedBin.isBlocked && (
                <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-xs text-rose-300 flex items-center gap-2">
                  <Lock className="w-4 h-4 shrink-0" />
                  <span>Blokaj Aktif: {selectedBin.blockReason || "Operasyonel Kilit"}</span>
                </div>
              )}

              <div className="grid grid-cols-2 gap-2.5">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => handleToggleBlock(selectedBin)}
                  className={`h-9 text-xs rounded-xl gap-1.5 ${
                    selectedBin.isBlocked
                      ? "bg-emerald-500/10 border-emerald-500/30 text-[#34D399] hover:bg-emerald-500/20"
                      : "bg-rose-500/10 border-rose-500/30 text-rose-300 hover:bg-rose-500/20"
                  }`}
                >
                  {selectedBin.isBlocked ? <Unlock className="w-3.5 h-3.5" /> : <Lock className="w-3.5 h-3.5" />}
                  {selectedBin.isBlocked ? "Kilidi Aç" : "Hücreyi Blokla"}
                </Button>
                <Button
                  type="button"
                  onClick={() => setLabelBinId(selectedBin.id)}
                  className="h-9 text-xs bg-white/[0.08] hover:bg-white/[0.14] text-white rounded-xl gap-1.5"
                >
                  <QrCode className="w-3.5 h-3.5 text-[#34D399]" />
                  Etiket Yazdır
                </Button>
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

      {/* DEPO / BÖLGE / GÖZ OLUŞTURMA MODALI */}
      <Dialog open={createModal !== "NONE"} onOpenChange={(o) => !o && setCreateModal("NONE")}>
        <DialogContent className="sm:max-w-md bg-[#111513] border border-white/[0.08] text-white rounded-2xl">
          <DialogHeader>
            <DialogTitle className="text-base">
              {createModal === "WAREHOUSE"
                ? "Yeni Depo Tanımla"
                : createModal === "ZONE"
                  ? "Yeni Depo Bölgesi Tanımla"
                  : "Yeni Koridor / Raf / Göz Tanımla"}
            </DialogTitle>
            <DialogDescription className="text-xs text-zinc-400">
              4 seviyeli Depo → Bölge → Koridor/Raf → Göz hiyerarşisine yeni lokasyon ekleyin.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleCreateHierarchy} className="space-y-3 text-xs">
            {createModal === "WAREHOUSE" && (
              <>
                <div className="space-y-1">
                  <Label className="text-zinc-300">Depo Kodu *</Label>
                  <Input required value={whCode} onChange={(e) => setWhCode(e.target.value)} placeholder="WH-ANK-04" className="bg-black/40 border-white/[0.08]" />
                </div>
                <div className="space-y-1">
                  <Label className="text-zinc-300">Depo Adı *</Label>
                  <Input required value={whName} onChange={(e) => setWhName(e.target.value)} placeholder="Ankara Lojistik Hub" className="bg-black/40 border-white/[0.08]" />
                </div>
                <div className="space-y-1">
                  <Label className="text-zinc-300">Şehir</Label>
                  <Input value={whCity} onChange={(e) => setWhCity(e.target.value)} placeholder="Ankara" className="bg-black/40 border-white/[0.08]" />
                </div>
              </>
            )}

            {createModal === "ZONE" && (
              <>
                <div className="space-y-1">
                  <Label className="text-zinc-300">Depo</Label>
                  <select value={zWhId} onChange={(e) => setZWhId(e.target.value)} className="w-full h-9 rounded-lg bg-black/40 border border-white/[0.08] px-2.5 text-white">
                    {warehouses.map(w => (
                      <option key={w.id} value={w.id} className="bg-[#111513]">{w.name}</option>
                    ))}
                  </select>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-1">
                    <Label className="text-zinc-300">Bölge Kodu *</Label>
                    <Input required value={zCode} onChange={(e) => setZCode(e.target.value)} placeholder="ZN-KARANTINA" className="bg-black/40 border-white/[0.08]" />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-zinc-300">Bölge Türü</Label>
                    <select value={zType} onChange={(e) => setZType(e.target.value)} className="w-full h-9 rounded-lg bg-black/40 border border-white/[0.08] px-2.5 text-white">
                      <option value="COLD_STORAGE" className="bg-[#111513]">Soğuk Hava</option>
                      <option value="FAST_PICK" className="bg-[#111513]">Hızlı Toplama</option>
                      <option value="BULK_STORAGE" className="bg-[#111513]">Palet / Kuru Depo</option>
                      <option value="RECEIVING" className="bg-[#111513]">Mal Kabul / Cross-Dock</option>
                      <option value="QUARANTINE" className="bg-[#111513]">Karantina & Kalite</option>
                    </select>
                  </div>
                </div>
                <div className="space-y-1">
                  <Label className="text-zinc-300">Bölge Adı *</Label>
                  <Input required value={zName} onChange={(e) => setZName(e.target.value)} placeholder="Karantina & RMA Alanı" className="bg-black/40 border-white/[0.08]" />
                </div>
              </>
            )}

            {createModal === "BIN" && (
              <>
                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-1">
                    <Label className="text-zinc-300">Depo</Label>
                    <select value={bWhId} onChange={(e) => setBWhId(e.target.value)} className="w-full h-9 rounded-lg bg-black/40 border border-white/[0.08] px-2 text-white">
                      {warehouses.map(w => (
                        <option key={w.id} value={w.id} className="bg-[#111513]">{w.name}</option>
                      ))}
                    </select>
                  </div>
                  <div className="space-y-1">
                    <Label className="text-zinc-300">Bölge</Label>
                    <select value={bZoneId} onChange={(e) => setBZoneId(e.target.value)} className="w-full h-9 rounded-lg bg-black/40 border border-white/[0.08] px-2 text-white">
                      {zones.filter(z => z.warehouseId === bWhId).map(z => (
                        <option key={z.id} value={z.id} className="bg-[#111513]">{z.name}</option>
                      ))}
                    </select>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-1">
                    <Label className="text-zinc-300">Hücre Kodu *</Label>
                    <Input required value={bCode} onChange={(e) => setBCode(e.target.value)} placeholder="B-02-01" className="bg-black/40 border-white/[0.08]" />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-zinc-300">Lokasyon Rolü (7 Tip)</Label>
                    <select value={bRole} onChange={(e) => setBRole(e.target.value as WmsBinRole)} className="w-full h-9 rounded-lg bg-black/40 border border-white/[0.08] px-2 text-white">
                      {(Object.keys(WMS_BIN_ROLE_LABELS) as WmsBinRole[]).map(role => (
                        <option key={role} value={role} className="bg-[#111513]">{WMS_BIN_ROLE_LABELS[role]}</option>
                      ))}
                    </select>
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-2">
                  <div className="space-y-1">
                    <Label className="text-zinc-300">Koridor</Label>
                    <Input value={bAisle} onChange={(e) => setBAisle(e.target.value)} className="bg-black/40 border-white/[0.08]" />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-zinc-300">Raf</Label>
                    <Input value={bRack} onChange={(e) => setBRack(e.target.value)} className="bg-black/40 border-white/[0.08]" />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-zinc-300">Kat / Göz</Label>
                    <Input value={bLevel} onChange={(e) => setBLevel(e.target.value)} className="bg-black/40 border-white/[0.08]" />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-1">
                    <Label className="text-zinc-300">Maks. Ağırlık (kg)</Label>
                    <Input type="number" value={bMaxWeight} onChange={(e) => setBMaxWeight(e.target.value)} className="bg-black/40 border-white/[0.08]" />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-zinc-300">Maks. Hacim (m³)</Label>
                    <Input type="number" step="0.1" value={bMaxVol} onChange={(e) => setBMaxVol(e.target.value)} className="bg-black/40 border-white/[0.08]" />
                  </div>
                </div>
              </>
            )}

            <DialogFooter className="pt-2">
              <Button type="button" variant="outline" onClick={() => setCreateModal("NONE")} className="border-white/[0.08] text-zinc-300">
                Vazgeç
              </Button>
              <Button type="submit" disabled={submitting} className="bg-[#34D399] text-[#0A0E0C] hover:bg-[#10B981] font-semibold">
                {submitting ? "Kaydediliyor..." : "Kaydet"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* YAZDIRILABİLİR QR / BARKOD RAF ETİKETİ */}
      <PrintableLabelModal
        open={Boolean(labelBinId)}
        onClose={() => setLabelBinId(null)}
        entityType="BIN"
        entityId={labelBinId}
      />
    </div>
  )
}
