"use client"

import React from "react"
import Link from "next/link"
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
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"

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
          <div className="flex items-center gap-2">
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900">
              Depo Yönetim Sistemi (WMS)
            </h1>
            <Badge variant="outline" className="border-indigo-200 bg-indigo-50 text-indigo-700 text-xs">
              Canlı Depo
            </Badge>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Raf adresleme, adım adım iş akışı, kör sayım ve mobil saha operasyonları
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Mobil El Terminali Butonu */}
          <Link href="/dashboard/wms/mobil">
            <Button
              size="sm"
              className="bg-slate-900 hover:bg-slate-800 text-white font-semibold text-xs shadow-xs gap-1.5"
            >
              <Smartphone className="h-4 w-4 text-emerald-400" />
              <span>Mobil Saha Terminali</span>
            </Button>
          </Link>

          <Button
            size="sm"
            onClick={onNewTaskClick}
            className="bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs shadow-xs gap-1"
          >
            <Plus className="h-4 w-4" />
            <span>+ Yeni Görev</span>
          </Button>

          <Button
            size="sm"
            variant="outline"
            onClick={onNewTransferClick}
            className="text-xs font-medium border-slate-200 bg-white hover:bg-slate-50 gap-1"
          >
            <Truck className="h-3.5 w-3.5 text-blue-600" />
            <span>Depo Transferi</span>
          </Button>

          <Button
            size="sm"
            variant="outline"
            onClick={onNewCountClick}
            className="text-xs font-medium border-slate-200 bg-white hover:bg-slate-50 gap-1"
          >
            <ClipboardCheck className="h-3.5 w-3.5 text-amber-600" />
            <span>Yeni Sayım</span>
          </Button>
        </div>
      </div>

      {/* 4 NET ÖZET KART */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {/* KART 1: BEKLEYEN GÖREVLER */}
        <Card className="border-slate-200/80 shadow-xs hover:border-indigo-200 transition-colors">
          <CardContent className="p-4 space-y-1.5">
            <div className="flex items-center justify-between text-slate-500">
              <span className="text-xs font-medium">Bekleyen Görevler</span>
              <div className="h-8 w-8 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center">
                <Boxes className="h-4 w-4" />
              </div>
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-bold tracking-tight text-slate-900">
                {stats.totalPendingTasks + stats.inProgressTasks}
              </span>
              <span className="text-[11px] text-slate-500">
                ({stats.inProgressTasks} işlemde)
              </span>
            </div>
            <div className="text-[11px] text-indigo-600 font-medium flex items-center gap-1">
              <span>Mal kabul, toplama & istif</span>
            </div>
          </CardContent>
        </Card>

        {/* KART 2: RAF DOLULUK ORANI */}
        <Card className="border-slate-200/80 shadow-xs hover:border-blue-200 transition-colors">
          <CardContent className="p-4 space-y-1.5">
            <div className="flex items-center justify-between text-slate-500">
              <span className="text-xs font-medium">Raf Doluluk Oranı</span>
              <div className="h-8 w-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
                <MapPin className="h-4 w-4" />
              </div>
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-bold tracking-tight text-slate-900">
                %{stats.averageOccupancy}
              </span>
              <span className="text-[11px] text-slate-500">
                {stats.occupiedBins} / {stats.totalBins} raf dolu
              </span>
            </div>
            <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
              <div
                className="bg-blue-600 h-full rounded-full transition-all"
                style={{ width: `${Math.min(100, stats.averageOccupancy)}%` }}
              />
            </div>
          </CardContent>
        </Card>

        {/* KART 3: AKTİF SAYIM OTURUMLARI */}
        <Card className="border-slate-200/80 shadow-xs hover:border-amber-200 transition-colors">
          <CardContent className="p-4 space-y-1.5">
            <div className="flex items-center justify-between text-slate-500">
              <span className="text-xs font-medium">Aktif Sayım Oturumu</span>
              <div className="h-8 w-8 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center">
                <ClipboardCheck className="h-4 w-4" />
              </div>
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-bold tracking-tight text-slate-900">
                {stats.openCountSessions}
              </span>
              <span className="text-[11px] text-amber-700 font-medium">
                {stats.openCountSessions > 0 ? "Açık Sayım Var" : "Tüm Depo Eşit"}
              </span>
            </div>
            <div className="text-[11px] text-slate-500">
              Kör / Tam / Döngüsel Sayım
            </div>
          </CardContent>
        </Card>

        {/* KART 4: DEPOLAR ARASI TRANSFERLER */}
        <Card className="border-slate-200/80 shadow-xs hover:border-emerald-200 transition-colors">
          <CardContent className="p-4 space-y-1.5">
            <div className="flex items-center justify-between text-slate-500">
              <span className="text-xs font-medium">Aktif Transferler</span>
              <div className="h-8 w-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
                <Truck className="h-4 w-4" />
              </div>
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-bold tracking-tight text-slate-900">
                {stats.activeTransfers}
              </span>
              <span className="text-[11px] text-emerald-700 font-medium">
                Yolda / Onaylı
              </span>
            </div>
            <div className="text-[11px] text-slate-500">
              Şube & atölye sevkiyatları
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

