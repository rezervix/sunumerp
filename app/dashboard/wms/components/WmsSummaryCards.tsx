"use client"

import React from "react"
import Link from "next/link"
import { motion } from "framer-motion"
import {
  Boxes,
  MapPin,
  ClipboardCheck,
  Truck,
  Smartphone,
  Plus,
  ArrowRight,
  TrendingUp,
  AlertTriangle
} from "lucide-react"
import { Button } from "@/components/ui/button"

interface WmsSummaryCardsProps {
  stats: {
    totalPendingTasks: number
    inProgressTasks: number
    totalBins: number
    occupiedBins: number
    averageOccupancy: number
    activeTransfers: number
    openCountSessions: number
  }
  onNewTaskClick: () => void
  onNewTransferClick: () => void
  onNewCountClick: () => void
}

export function WmsSummaryCards({
  stats,
  onNewTaskClick,
  onNewTransferClick,
  onNewCountClick
}: WmsSummaryCardsProps) {
  return (
    <div className="space-y-4">
      {/* ÜST BAŞLIK VE HIZLI AKSİYON BUTONLARI */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-white">
              Depo Yönetim Sistemi (WMS)
            </h1>
            <span className="bg-indigo-500/15 text-indigo-300 border border-indigo-500/30 rounded-full px-3 py-0.5 text-xs font-medium">
              Canlı Depo
            </span>
          </div>
          <p className="text-xs text-white/60 mt-1">
            Raf adresleme, adım adım iş akışı, kör sayım ve mobil saha operasyonları
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Mobil El Terminali Butonu */}
          <Link href="/dashboard/wms/mobil">
            <Button
              size="sm"
              className="bg-white/10 hover:bg-white/15 border border-white/15 text-white font-semibold text-xs rounded-xl gap-1.5 backdrop-blur-md"
            >
              <Smartphone className="h-4 w-4 text-emerald-400" />
              <span>Mobil Saha Terminali</span>
            </Button>
          </Link>

          <Button
            size="sm"
            onClick={onNewTaskClick}
            className="bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs rounded-xl shadow-lg shadow-indigo-500/25 gap-1"
          >
            <Plus className="h-4 w-4" />
            <span>+ Yeni Görev</span>
          </Button>

          <Button
            size="sm"
            variant="outline"
            onClick={onNewTransferClick}
            className="text-xs font-medium border-white/15 bg-white/5 hover:bg-white/10 text-white rounded-xl gap-1.5"
          >
            <Truck className="h-3.5 w-3.5 text-sky-400" />
            <span>Depo Transferi</span>
          </Button>

          <Button
            size="sm"
            variant="outline"
            onClick={onNewCountClick}
            className="text-xs font-medium border-white/15 bg-white/5 hover:bg-white/10 text-white rounded-xl gap-1.5"
          >
            <ClipboardCheck className="h-3.5 w-3.5 text-amber-400" />
            <span>Yeni Sayım</span>
          </Button>
        </div>
      </div>

      {/* 4 NET ÖZET KART */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* KART 1: BEKLEYEN GÖREVLER */}
        <motion.div
          whileHover={{ y: -4 }}
          className="glass-card p-6 rounded-2xl flex flex-col justify-between"
        >
          <div className="flex items-center justify-between">
            <span className="text-sm text-white/60">Bekleyen Görevler</span>
            <div className="h-10 w-10 rounded-xl bg-indigo-500/15 border border-indigo-500/30 text-indigo-400 flex items-center justify-center">
              <Boxes className="h-5 w-5" />
            </div>
          </div>
          <div className="flex items-baseline gap-2 mt-2">
            <span className="text-2xl font-bold text-white mt-1">
              {stats.totalPendingTasks + stats.inProgressTasks}
            </span>
            <span className="text-xs text-white/50">
              ({stats.inProgressTasks} işlemde)
            </span>
          </div>
          <div className="text-xs text-indigo-400 font-medium flex items-center gap-1 mt-3">
            <span>Mal kabul, toplama & istif</span>
          </div>
        </motion.div>

        {/* KART 2: RAF DOLULUK ORANI */}
        <motion.div
          whileHover={{ y: -4 }}
          className="glass-card p-6 rounded-2xl flex flex-col justify-between"
        >
          <div className="flex items-center justify-between">
            <span className="text-sm text-white/60">Raf Doluluk Oranı</span>
            <div className="h-10 w-10 rounded-xl bg-sky-500/15 border border-sky-500/30 text-sky-400 flex items-center justify-center">
              <MapPin className="h-5 w-5" />
            </div>
          </div>
          <div className="flex items-baseline gap-2 mt-2">
            <span className="text-2xl font-bold text-white mt-1">
              %{stats.averageOccupancy}
            </span>
            <span className="text-xs text-white/50">
              {stats.occupiedBins} / {stats.totalBins} raf dolu
            </span>
          </div>
          <div className="w-full bg-white/10 rounded-full h-1.5 overflow-hidden mt-3">
            <div
              className="bg-gradient-to-r from-sky-400 to-indigo-400 h-full rounded-full transition-all"
              style={{ width: `${Math.min(100, stats.averageOccupancy)}%` }}
            />
          </div>
        </motion.div>

        {/* KART 3: AKTİF SAYIM OTURUMLARI */}
        <motion.div
          whileHover={{ y: -4 }}
          className="glass-card p-6 rounded-2xl flex flex-col justify-between"
        >
          <div className="flex items-center justify-between">
            <span className="text-sm text-white/60">Aktif Sayım Oturumu</span>
            <div className="h-10 w-10 rounded-xl bg-amber-500/15 border border-amber-500/30 text-amber-400 flex items-center justify-center">
              <ClipboardCheck className="h-5 w-5" />
            </div>
          </div>
          <div className="flex items-baseline gap-2 mt-2">
            <span className="text-2xl font-bold text-white mt-1">
              {stats.openCountSessions}
            </span>
            <span className="text-xs text-amber-400 font-medium">
              {stats.openCountSessions > 0 ? "Açık Sayım Var" : "Tüm Depo Eşit"}
            </span>
          </div>
          <div className="text-xs text-white/50 mt-3">
            Kör / Tam / Döngüsel Sayım
          </div>
        </motion.div>

        {/* KART 4: DEPOLAR ARASI TRANSFERLER */}
        <motion.div
          whileHover={{ y: -4 }}
          className="glass-card p-6 rounded-2xl flex flex-col justify-between"
        >
          <div className="flex items-center justify-between">
            <span className="text-sm text-white/60">Aktif Transferler</span>
            <div className="h-10 w-10 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 flex items-center justify-center">
              <Truck className="h-5 w-5" />
            </div>
          </div>
          <div className="flex items-baseline gap-2 mt-2">
            <span className="text-2xl font-bold text-white mt-1">
              {stats.activeTransfers}
            </span>
            <span className="text-xs text-emerald-400 font-medium">
              Yolda / Onaylı
            </span>
          </div>
          <div className="text-xs text-white/50 mt-3">
            Şube & atölye sevkiyatları
          </div>
        </motion.div>
      </div>
    </div>
  )
}
