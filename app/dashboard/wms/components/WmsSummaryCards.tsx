"use client"

import React from "react"
import Link from "next/link"
import {
  Boxes,
  MapPin,
  ClipboardCheck,
  Truck,
  Smartphone,
  Plus
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { AnimatedNumber } from "@/components/ui/motion-primitives"

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
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 py-2">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-xl sm:text-2xl font-light tracking-tight text-white">
              Depo Yönetim Sistemi (WMS)
            </h1>
            <span className="bg-emerald-500/10 text-[#34D399] border border-emerald-500/20 rounded-full px-2.5 py-0.5 text-[11px] font-medium">
              Canlı Depo
            </span>
          </div>
          <p className="text-xs text-zinc-400 mt-0.5">
            Raf adresleme, adım adım iş akışı, kör sayım ve mobil saha operasyonları
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          {/* Mobil El Terminali Butonu */}
          <Link href="/dashboard/wms/mobil">
            <Button
              size="sm"
              className="bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.08] text-zinc-300 hover:text-white font-medium text-xs rounded-full h-9 px-4 gap-1.5"
            >
              <Smartphone className="h-4 w-4 text-[#34D399]" />
              <span>Mobil Saha Terminali</span>
            </Button>
          </Link>

          <Button
            size="sm"
            onClick={onNewTaskClick}
            className="bg-[#34D399] hover:bg-[#34D399]/90 text-[#061811] font-semibold text-xs rounded-full h-9 px-4 shadow-lg shadow-emerald-500/20 gap-1.5 cursor-pointer"
          >
            <Plus className="h-4 w-4" />
            <span>Yeni Görev</span>
          </Button>

          <Button
            size="sm"
            variant="outline"
            onClick={onNewTransferClick}
            className="text-xs font-medium border-white/[0.08] bg-white/[0.04] hover:bg-white/[0.08] text-zinc-300 hover:text-white rounded-full h-9 px-4 gap-1.5"
          >
            <Truck className="h-3.5 w-3.5 text-zinc-400" />
            <span>Depo Transferi</span>
          </Button>

          <Button
            size="sm"
            variant="outline"
            onClick={onNewCountClick}
            className="text-xs font-medium border-white/[0.08] bg-white/[0.04] hover:bg-white/[0.08] text-zinc-300 hover:text-white rounded-full h-9 px-4 gap-1.5"
          >
            <ClipboardCheck className="h-3.5 w-3.5 text-amber-400" />
            <span>Yeni Sayım</span>
          </Button>
        </div>
      </div>

      {/* 4 KUTUSUZ METRİK ŞERİDİ (BORDERLESS KPI STRIP) */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-8 py-4 border-b border-white/[0.06]">
        {/* KART 1: BEKLEYEN GÖREVLER */}
        <div className="space-y-1">
          <div className="flex items-center gap-1.5 text-[11px] uppercase tracking-wider text-zinc-400 font-medium">
            <Boxes className="h-3.5 w-3.5 text-[#34D399]" />
            <span>Bekleyen Görevler</span>
          </div>
          <div className="flex items-baseline gap-2 pt-1">
            <div className="text-3xl sm:text-4xl font-light text-white tracking-tight">
              <AnimatedNumber value={stats.totalPendingTasks + stats.inProgressTasks} />
            </div>
            <span className="text-xs text-zinc-400 font-mono">
              ({stats.inProgressTasks} işlemde)
            </span>
          </div>
          <p className="text-[11px] text-zinc-500">Mal kabul, toplama ve istif kuyruğu</p>
        </div>

        {/* KART 2: RAF DOLULUK ORANI */}
        <div className="space-y-1">
          <div className="flex items-center gap-1.5 text-[11px] uppercase tracking-wider text-zinc-400 font-medium">
            <MapPin className="h-3.5 w-3.5 text-zinc-400" />
            <span>Raf Doluluk Oranı</span>
          </div>
          <div className="flex items-baseline gap-2 pt-1">
            <div className="text-3xl sm:text-4xl font-light text-white tracking-tight">
              <AnimatedNumber value={stats.averageOccupancy} prefix="%" />
            </div>
            <span className="bg-white/[0.06] text-zinc-400 text-xs px-2 py-0.5 rounded-full font-mono">
              {stats.occupiedBins}/{stats.totalBins}
            </span>
          </div>
          <div className="w-full bg-white/[0.06] rounded-full h-1.5 overflow-hidden mt-2 max-w-[180px]">
            <div
              className="bg-[#34D399] h-full rounded-full transition-all"
              style={{ width: `${Math.min(100, stats.averageOccupancy)}%` }}
            />
          </div>
        </div>

        {/* KART 3: AKTİF SAYIM OTURUMLARI */}
        <div className="space-y-1">
          <div className="flex items-center gap-1.5 text-[11px] uppercase tracking-wider text-zinc-400 font-medium">
            <ClipboardCheck className={`h-3.5 w-3.5 ${stats.openCountSessions > 0 ? "text-amber-400" : "text-zinc-500"}`} />
            <span>Aktif Sayım Oturumu</span>
          </div>
          <div className="flex items-baseline gap-2 pt-1">
            <div className="text-3xl sm:text-4xl font-light text-white tracking-tight">
              <AnimatedNumber value={stats.openCountSessions} />
            </div>
            <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
              stats.openCountSessions > 0
                ? "bg-amber-500/10 text-amber-300"
                : "bg-white/[0.06] text-zinc-400"
            }`}>
              {stats.openCountSessions > 0 ? "Açık Sayım" : "Eşit"}
            </span>
          </div>
          <p className="text-[11px] text-zinc-500">Kör ve döngüsel sayım seansları</p>
        </div>

        {/* KART 4: DEPOLAR ARASI TRANSFERLER */}
        <div className="space-y-1">
          <div className="flex items-center gap-1.5 text-[11px] uppercase tracking-wider text-zinc-400 font-medium">
            <Truck className="h-3.5 w-3.5 text-[#34D399]" />
            <span>Aktif Transferler</span>
          </div>
          <div className="flex items-baseline gap-2 pt-1">
            <div className="text-3xl sm:text-4xl font-light text-white tracking-tight">
              <AnimatedNumber value={stats.activeTransfers} />
            </div>
            <span className="bg-emerald-500/10 text-[#34D399] text-xs px-2 py-0.5 rounded-full font-medium">
              Yolda
            </span>
          </div>
          <p className="text-[11px] text-zinc-500">Şube ve atölye arası sevkiyatlar</p>
        </div>
      </div>
    </div>
  )
}
