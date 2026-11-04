"use client"

import React from "react"
import { motion } from "framer-motion"
import { DollarSign, AlertTriangle, Clock, Warehouse } from "lucide-react"

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
  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat("tr-TR", {
      style: "currency",
      currency: "TRY",
      maximumFractionDigits: 0
    }).format(val || 0)
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {/* 1. TOPLAM STOK DEĞERİ */}
      <motion.div
        whileHover={{ y: -4 }}
        transition={{ type: "spring", stiffness: 300, damping: 22 }}
        className="glass-card p-6 rounded-2xl flex items-center justify-between"
      >
        <div className="space-y-1">
          <p className="text-sm text-white/60">
            Toplam Stok Değeri
          </p>
          <div className="text-2xl font-bold text-white mt-1 tracking-tight">
            {loading ? "..." : formatCurrency(stats.totalStockValue)}
          </div>
          <p className="text-[11px] text-emerald-400 font-medium">Mevcut aktif envanter maliyeti</p>
        </div>
        <div className="h-11 w-11 rounded-2xl bg-emerald-500/15 text-emerald-400 flex items-center justify-center shrink-0 border border-emerald-400/25">
          <DollarSign className="h-5 w-5" />
        </div>
      </motion.div>

      {/* 2. KRİTİK STOĞA DÜŞENLER */}
      <motion.div
        whileHover={{ y: -4 }}
        transition={{ type: "spring", stiffness: 300, damping: 22 }}
        className={`glass-card p-6 rounded-2xl flex items-center justify-between ${
          stats.criticalStockCount > 0 ? "border-rose-500/30 bg-rose-500/[0.06]" : ""
        }`}
      >
        <div className="space-y-1">
          <p className="text-sm text-white/60">
            Kritik Stoğa Düşenler
          </p>
          <div className="flex items-center gap-2">
            <span className={`text-2xl font-bold mt-1 tracking-tight ${
              stats.criticalStockCount > 0 ? "text-rose-400" : "text-white"
            }`}>
              {loading ? "..." : `${stats.criticalStockCount} Ürün`}
            </span>
          </div>
          <p className={`text-[11px] font-medium ${stats.criticalStockCount > 0 ? "text-rose-400/90" : "text-white/50"}`}>
            Min. stok seviyesinin altında
          </p>
        </div>
        <div className={`h-11 w-11 rounded-2xl flex items-center justify-center shrink-0 border ${
          stats.criticalStockCount > 0
            ? "bg-rose-500/15 text-rose-400 border-rose-500/30"
            : "bg-white/5 text-white/60 border-white/10"
        }`}>
          <AlertTriangle className="h-5 w-5" />
        </div>
      </motion.div>

      {/* 3. SKT YAKLAŞANLAR */}
      <motion.div
        whileHover={{ y: -4 }}
        transition={{ type: "spring", stiffness: 300, damping: 22 }}
        className={`glass-card p-6 rounded-2xl flex items-center justify-between ${
          stats.expiringCount > 0 ? "border-amber-500/30 bg-amber-500/[0.06]" : ""
        }`}
      >
        <div className="space-y-1">
          <p className="text-sm text-white/60">
            SKT Yaklaşanlar
          </p>
          <div className="text-2xl font-bold mt-1 tracking-tight text-amber-400">
            {loading ? "..." : `${stats.expiringCount} Parti / Lot`}
          </div>
          <p className="text-[11px] text-amber-400/80 font-medium">15 gün içinde tazelik/son kullanma</p>
        </div>
        <div className="h-11 w-11 rounded-2xl bg-amber-500/15 text-amber-400 flex items-center justify-center shrink-0 border border-amber-400/25">
          <Clock className="h-5 w-5" />
        </div>
      </motion.div>

      {/* 4. AKTİF DEPO / ÇEŞİT */}
      <motion.div
        whileHover={{ y: -4 }}
        transition={{ type: "spring", stiffness: 300, damping: 22 }}
        className="glass-card p-6 rounded-2xl flex items-center justify-between"
      >
        <div className="space-y-1">
          <p className="text-sm text-white/60">
            Aktif Depo / Çeşit
          </p>
          <div className="text-2xl font-bold text-white mt-1 tracking-tight">
            {loading ? "..." : `${stats.activeWarehouseCount} Depo / ${stats.totalItemCount} Çeşit`}
          </div>
          <p className="text-[11px] text-sky-400 font-medium">Çoklu lokasyon & raf takibi</p>
        </div>
        <div className="h-11 w-11 rounded-2xl bg-sky-500/15 text-sky-400 flex items-center justify-center shrink-0 border border-sky-400/25">
          <Warehouse className="h-5 w-5" />
        </div>
      </motion.div>
    </div>
  )
}

