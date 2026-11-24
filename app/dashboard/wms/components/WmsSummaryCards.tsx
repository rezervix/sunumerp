"use client"

import React from "react"
import Link from "next/link"
import {
  Smartphone,
  Plus,
  Truck,
  ClipboardCheck,
  Boxes,
  MapPin
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { KpiStrip, type KpiItemDef } from "@/components/shared/kpi-strip"
import { safeNumber } from "@/lib/utils/safe-display"

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
  const pendingTotal = safeNumber(stats?.totalPendingTasks, 0) + safeNumber(stats?.inProgressTasks, 0)
  const inProgress = safeNumber(stats?.inProgressTasks, 0)
  const avgOccupancy = safeNumber(stats?.averageOccupancy, 0)
  const occupiedBins = safeNumber(stats?.occupiedBins, 0)
  const totalBins = safeNumber(stats?.totalBins, 0)
  const openCounts = safeNumber(stats?.openCountSessions, 0)
  const transfers = safeNumber(stats?.activeTransfers, 0)

  const kpiItems: KpiItemDef[] = [
    {
      id: "pendingTasks",
      label: "Bekleyen Görevler",
      value: pendingTotal,
      badgeText: inProgress > 0 ? `${inProgress} İşlemde` : "Sırada",
      badgeVariant: inProgress > 0 ? "brand" : "neutral",
      description: "Mal kabul, toplama ve istif kuyruğu",
      icon: <Boxes className="h-3.5 w-3.5" />
    },
    {
      id: "occupancy",
      label: "Raf Doluluk Oranı",
      value: avgOccupancy,
      prefix: "%",
      badgeText: `${occupiedBins}/${totalBins} Göz`,
      badgeVariant: "brand",
      description: "Aktif depolardaki doluluk payı",
      icon: <MapPin className="h-3.5 w-3.5" />
    },
    {
      id: "countSessions",
      label: "Aktif Sayım Oturumu",
      value: openCounts,
      badgeText: openCounts > 0 ? "Açık Sayım" : "Mutabık",
      badgeVariant: openCounts > 0 ? "warn" : "ok",
      description: "Kör ve döngüsel sayım seansları",
      icon: <ClipboardCheck className="h-3.5 w-3.5" />
    },
    {
      id: "transfers",
      label: "Aktif Transferler",
      value: transfers,
      badgeText: "Yolda",
      badgeVariant: "brand",
      description: "Şube ve depo arası sevkiyatlar",
      icon: <Truck className="h-3.5 w-3.5" />
    }
  ]

  return (
    <div className="space-y-6">
      {/* ÜST BAŞLIK VE HIZLI AKSİYON BUTONLARI (B4: TEK BİRİNCİL BUTON) */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-2xl font-semibold tracking-tight text-[--text]">
              Depo Yönetim Sistemi (WMS)
            </h1>
            <Badge variant="brand" size="sm">
              Canlı Depo
            </Badge>
          </div>
          <p className="text-xs sm:text-sm text-[--text-muted] mt-1">
            Raf adresleme, adım adım iş akışı, kör sayım ve mobil saha operasyonları
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          {/* Mobil El Terminali Butonu */}
          <Link href="/dashboard/wms/mobil">
            <Button
              variant="secondary"
              size="sm"
              className="text-xs h-9 px-3.5 gap-1.5 rounded-xl cursor-pointer"
            >
              <Smartphone className="h-4 w-4 text-[--brand]" />
              <span>Mobil Saha Terminali</span>
            </Button>
          </Link>

          {/* TEK BİRİNCİL AKSİYON: YENİ GÖREV */}
          <Button
            variant="primary"
            size="sm"
            onClick={onNewTaskClick}
            className="text-xs h-9 px-4 gap-1.5 rounded-xl cursor-pointer"
          >
            <Plus className="h-4 w-4" />
            <span>Yeni Görev</span>
          </Button>

          <Button
            variant="secondary"
            size="sm"
            onClick={onNewTransferClick}
            className="text-xs h-9 px-3.5 gap-1.5 rounded-xl cursor-pointer"
          >
            <Truck className="h-3.5 w-3.5 text-[--text-muted]" />
            <span>Depo Transferi</span>
          </Button>

          <Button
            variant="secondary"
            size="sm"
            onClick={onNewCountClick}
            className="text-xs h-9 px-3.5 gap-1.5 rounded-xl cursor-pointer"
          >
            <ClipboardCheck className="h-3.5 w-3.5 text-[--text-muted]" />
            <span>Yeni Sayım</span>
          </Button>
        </div>
      </div>

      {/* 4 KUTUSUZ METRİK ŞERİDİ (BORDERLESS KPI STRIP) */}
      <div className="border-y border-[--line-soft] py-2">
        <KpiStrip items={kpiItems} />
      </div>
    </div>
  )
}
