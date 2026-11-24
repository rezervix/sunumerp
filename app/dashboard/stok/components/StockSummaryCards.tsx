"use client"

import * as React from "react"
import { KpiStrip, type KpiItemDef } from "@/components/shared/kpi-strip"
import {
  IconDollarSign,
  IconAlertTriangle,
  IconClock,
  IconWarehouse
} from "@/components/ui/app-icons"
import { safeNumber } from "@/lib/utils/safe-display"

export interface StockSummaryCardsProps {
  stats: {
    totalStockValue?: number
    criticalStockCount?: number
    expiringCount?: number
    activeWarehouseCount?: number
    totalItemCount?: number
  }
  loading?: boolean
}

/**
 * StockSummaryCards (FAZ 4 & B4 Kuralı):
 * Kutusuz 4'lü ızgara: KpiStrip bileşeni ile render edilir.
 * Hiçbir kutu içine kutu hapsedilmez; tek ve temiz bir özet şerididir.
 */
export function StockSummaryCards({ stats, loading = false }: StockSummaryCardsProps) {
  const totalValue = safeNumber(stats?.totalStockValue, 0)
  const criticalCount = safeNumber(stats?.criticalStockCount, 0)
  const expiringCount = safeNumber(stats?.expiringCount, 0)
  const itemCount = safeNumber(stats?.totalItemCount, 0)
  const warehouseCount = safeNumber(stats?.activeWarehouseCount, 1)

  const items: KpiItemDef[] = [
    {
      id: "totalStockValue",
      label: "Toplam Stok Değeri",
      value: totalValue,
      prefix: "₺",
      decimals: 2,
      badgeText: "Canlı",
      badgeVariant: "ok",
      description: "Mevcut aktif envanter maliyeti",
      icon: <IconDollarSign size={14} />
    },
    {
      id: "criticalStockCount",
      label: "Kritik Stok Uyarısı",
      value: criticalCount,
      suffix: " Ürün",
      badgeText: criticalCount > 0 ? "ROP Altı" : "Yeterli",
      badgeVariant: criticalCount > 0 ? "bad" : "neutral",
      description: "Min. stok seviyesinin altında",
      icon: <IconAlertTriangle size={14} />,
      isCritical: criticalCount > 0
    },
    {
      id: "expiringCount",
      label: "SKT Yaklaşanlar",
      value: expiringCount,
      suffix: " Lot",
      badgeText: expiringCount > 0 ? "15 Gün" : "Temiz",
      badgeVariant: expiringCount > 0 ? "warn" : "neutral",
      description: "Tazelik ve parti son kullanma riski",
      icon: <IconClock size={14} />
    },
    {
      id: "totalItemCount",
      label: "Aktif Envanter Çeşit",
      value: itemCount,
      suffix: " Kalem",
      badgeText: `${warehouseCount} Depo`,
      badgeVariant: "brand",
      description: "Çoklu lokasyon ve raf takibi",
      icon: <IconWarehouse size={14} />
    }
  ]

  return (
    <div className="border-y border-[--line-soft] py-2">
      <KpiStrip items={items} loading={loading} />
    </div>
  )
}
