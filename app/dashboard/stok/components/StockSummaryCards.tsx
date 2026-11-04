"use client"

import React from "react"
import { Card, CardContent } from "@/components/ui/card"
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
      <Card className="border-slate-200 shadow-xs hover:border-slate-300 transition-colors bg-white">
        <CardContent className="p-4 sm:p-5 flex items-center justify-between">
          <div className="space-y-1">
            <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">
              Toplam Stok Değeri
            </p>
            <div className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
              {loading ? "..." : formatCurrency(stats.totalStockValue)}
            </div>
            <p className="text-[11px] text-slate-500">Mevcut aktif envanter maliyeti</p>
          </div>
          <div className="h-11 w-11 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0 border border-emerald-100">
            <DollarSign className="h-5 w-5" />
          </div>
        </CardContent>
      </Card>

      {/* 2. KRİTİK STOĞA DÜŞENLER */}
      <Card className={`border-slate-200 shadow-xs hover:border-slate-300 transition-colors bg-white ${
        stats.criticalStockCount > 0 ? "border-rose-200 bg-rose-50/20" : ""
      }`}>
        <CardContent className="p-4 sm:p-5 flex items-center justify-between">
          <div className="space-y-1">
            <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">
              Kritik Stoğa Düşenler
            </p>
            <div className="flex items-center gap-2">
              <span className={`text-xl sm:text-2xl font-bold tracking-tight ${
                stats.criticalStockCount > 0 ? "text-rose-600" : "text-slate-900"
              }`}>
                {loading ? "..." : `${stats.criticalStockCount} Ürün`}
              </span>
            </div>
            <p className="text-[11px] text-slate-500">Min. stok seviyesinin altında</p>
          </div>
          <div className={`h-11 w-11 rounded-xl flex items-center justify-center shrink-0 border ${
            stats.criticalStockCount > 0
              ? "bg-rose-50 text-rose-600 border-rose-200"
              : "bg-slate-50 text-slate-500 border-slate-200"
          }`}>
            <AlertTriangle className="h-5 w-5" />
          </div>
        </CardContent>
      </Card>

      {/* 3. SKT YAKLAŞANLAR */}
      <Card className={`border-slate-200 shadow-xs hover:border-slate-300 transition-colors bg-white ${
        stats.expiringCount > 0 ? "border-amber-200 bg-amber-50/20" : ""
      }`}>
        <CardContent className="p-4 sm:p-5 flex items-center justify-between">
          <div className="space-y-1">
            <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">
              SKT Yaklaşanlar
            </p>
            <div className="text-xl sm:text-2xl font-bold tracking-tight text-amber-600">
              {loading ? "..." : `${stats.expiringCount} Parti / Lot`}
            </div>
            <p className="text-[11px] text-slate-500">15 gün içinde tazelik/son kullanma</p>
          </div>
          <div className="h-11 w-11 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center shrink-0 border border-amber-200">
            <Clock className="h-5 w-5" />
          </div>
        </CardContent>
      </Card>

      {/* 4. AKTİF DEPO / ÇEŞİT */}
      <Card className="border-slate-200 shadow-xs hover:border-slate-300 transition-colors bg-white">
        <CardContent className="p-4 sm:p-5 flex items-center justify-between">
          <div className="space-y-1">
            <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">
              Aktif Depo / Çeşit
            </p>
            <div className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
              {loading ? "..." : `${stats.activeWarehouseCount} Depo / ${stats.totalItemCount} Çeşit`}
            </div>
            <p className="text-[11px] text-slate-500">Çoklu lokasyon & raf takibi</p>
          </div>
          <div className="h-11 w-11 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0 border border-blue-100">
            <Warehouse className="h-5 w-5" />
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

