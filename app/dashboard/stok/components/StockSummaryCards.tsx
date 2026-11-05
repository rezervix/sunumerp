"use client"

import React from "react"
import { motion } from "framer-motion"
import { DollarSign, AlertTriangle, Clock, Warehouse } from "lucide-react"
import { AnimatedNumber } from "@/components/ui/motion-primitives"

interface StockSummaryCardsProps {
  stats: {
    totalStockValue: number
    criticalStockCount: number
    expiringCount: number
    activeWarehouseCount: number
    totalItemCount: number
  }
  loading?: boolean
}

export function StockSummaryCards({ stats, loading }: StockSummaryCardsProps) {
  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-8 py-4 border-b border-white/[0.06]">
      {/* 1. TOPLAM STOK DEĞERİ */}
      <div className="space-y-1">
        <div className="flex items-center gap-1.5 text-[11px] uppercase tracking-wider text-zinc-400 font-medium">
          <DollarSign className="h-3.5 w-3.5 text-[#34D399]" />
          <span>Toplam Stok Değeri</span>
        </div>
        <div className="flex items-baseline gap-2 pt-1">
          <div className="text-3xl sm:text-4xl font-light text-white tracking-tight">
            {loading ? "..." : <AnimatedNumber value={stats.totalStockValue || 0} prefix="₺" />}
          </div>
          <span className="bg-emerald-500/10 text-emerald-400 text-xs px-2 py-0.5 rounded-full font-medium">
            Canlı
          </span>
        </div>
        <p className="text-[11px] text-zinc-500">Mevcut aktif envanter maliyeti</p>
      </div>

      {/* 2. KRİTİK STOĞA DÜŞENLER */}
      <div className="space-y-1">
        <div className="flex items-center gap-1.5 text-[11px] uppercase tracking-wider text-zinc-400 font-medium">
          <AlertTriangle className={`h-3.5 w-3.5 ${stats.criticalStockCount > 0 ? "text-rose-400" : "text-zinc-500"}`} />
          <span>Kritik Stok Uyarısı</span>
        </div>
        <div className="flex items-baseline gap-2 pt-1">
          <div className={`text-3xl sm:text-4xl font-light tracking-tight ${
            stats.criticalStockCount > 0 ? "text-rose-400" : "text-white"
          }`}>
            {loading ? "..." : <AnimatedNumber value={stats.criticalStockCount || 0} suffix=" Ürün" />}
          </div>
          {stats.criticalStockCount > 0 && (
            <span className="bg-rose-500/10 text-rose-300 text-xs px-2 py-0.5 rounded-full font-medium">
              ROP Altı
            </span>
          )}
        </div>
        <p className="text-[11px] text-zinc-500">Min. stok seviyesinin altında</p>
      </div>

      {/* 3. SKT YAKLAŞANLAR */}
      <div className="space-y-1">
        <div className="flex items-center gap-1.5 text-[11px] uppercase tracking-wider text-zinc-400 font-medium">
          <Clock className={`h-3.5 w-3.5 ${stats.expiringCount > 0 ? "text-amber-400" : "text-zinc-500"}`} />
          <span>SKT Yaklaşanlar</span>
        </div>
        <div className="flex items-baseline gap-2 pt-1">
          <div className="text-3xl sm:text-4xl font-light text-white tracking-tight">
            {loading ? "..." : <AnimatedNumber value={stats.expiringCount || 0} suffix=" Lot" />}
          </div>
          {stats.expiringCount > 0 && (
            <span className="bg-amber-500/10 text-amber-300 text-xs px-2 py-0.5 rounded-full font-medium">
              15 Gün
            </span>
          )}
        </div>
        <p className="text-[11px] text-zinc-500">Tazelik ve parti son kullanma riski</p>
      </div>

      {/* 4. AKTİF DEPO / ÇEŞİT */}
      <div className="space-y-1">
        <div className="flex items-center gap-1.5 text-[11px] uppercase tracking-wider text-zinc-400 font-medium">
          <Warehouse className="h-3.5 w-3.5 text-[#34D399]" />
          <span>Aktif Envanter Çeşit</span>
        </div>
        <div className="flex items-baseline gap-2 pt-1">
          <div className="text-3xl sm:text-4xl font-light text-white tracking-tight">
            {loading ? "..." : <AnimatedNumber value={stats.totalItemCount || 0} suffix=" Kalem" />}
          </div>
          <span className="bg-white/[0.06] text-zinc-400 text-xs px-2 py-0.5 rounded-full font-mono">
            {stats.activeWarehouseCount} Depo
          </span>
        </div>
        <p className="text-[11px] text-zinc-500">Çoklu lokasyon ve raf takibi</p>
      </div>
    </div>
  )
}
