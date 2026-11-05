'use client';

import React from 'react';
import {
  AlertTriangle,
  FileCheck2,
  Handshake,
  TrendingUp,
  Plus
} from 'lucide-react';
import { AnimatedNumber } from '@/components/ui/motion-primitives';

interface StatsProps {
  stats: {
    totalCriticalItems: number;
    stockoutItems: number;
    belowRopItems: number;
    pendingPrCount: number;
    pendingPrTotalAmount: number;
    totalConsignmentValue: number;
    unbilledConsignmentPayable: number;
    activeSupplierCount: number;
  };
  onNewRequisitionClick: () => void;
  onRefresh: () => void;
}

export function ProcurementSummaryCards({
  stats,
  onNewRequisitionClick,
  onRefresh
}: StatsProps) {
  return (
    <div className="space-y-4">
      {/* Üst Başlık ve Hızlı Aksiyon Butonları */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 py-2">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-xl sm:text-2xl font-light tracking-tight text-white">
              Akıllı Satın Alma & Tedarik Yönetimi
            </h1>
            <span className="bg-emerald-500/10 text-[#34D399] border border-emerald-500/20 rounded-full px-2.5 py-0.5 text-[11px] font-medium">
              Canlı ROP Motoru
            </span>
          </div>
          <p className="text-xs text-zinc-400 mt-0.5">
            Kritik stok otomasyonu, dinamik yeniden sipariş noktası (ROP), konsinye emanet stok ve tedarikçi mutabakatı
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <button
            onClick={onNewRequisitionClick}
            className="inline-flex items-center gap-2 px-4 py-2 bg-[#34D399] hover:bg-[#34D399]/90 text-[#061811] text-xs font-semibold rounded-full shadow-lg shadow-emerald-500/20 transition active:scale-95 cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            Yeni Satın Alma Talebi
          </button>
        </div>
      </div>

      {/* 4 Ana Kutusuz Metrik Şeridi (Borderless KPI Strip) */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-8 py-4 border-b border-white/[0.06]">
        {/* Kart 1: Kritik Stok Uyarısı */}
        <div className="space-y-1">
          <div className="flex items-center gap-1.5 text-[11px] uppercase tracking-wider text-zinc-400 font-medium">
            <AlertTriangle className={`w-3.5 h-3.5 ${stats.totalCriticalItems > 0 ? "text-rose-400" : "text-zinc-500"}`} />
            <span>Kritik Stok Uyarısı</span>
          </div>
          <div className="flex items-baseline gap-2 pt-1">
            <div className={`text-3xl sm:text-4xl font-light tracking-tight ${
              stats.totalCriticalItems > 0 ? "text-rose-400" : "text-white"
            }`}>
              <AnimatedNumber value={stats.totalCriticalItems} />
            </div>
            {stats.stockoutItems > 0 && (
              <span className="bg-rose-500/10 text-rose-300 text-xs px-2 py-0.5 rounded-full font-medium">
                {stats.stockoutItems} Tükendi
              </span>
            )}
          </div>
          <p className="text-[11px] text-zinc-500">
            {stats.belowRopItems} ürün ROP sipariş eşiğinin altında
          </p>
        </div>

        {/* Kart 2: Bekleyen Satın Alma Talepleri (PR) */}
        <div className="space-y-1">
          <div className="flex items-center gap-1.5 text-[11px] uppercase tracking-wider text-zinc-400 font-medium">
            <FileCheck2 className={`w-3.5 h-3.5 ${stats.pendingPrCount > 0 ? "text-amber-400" : "text-zinc-500"}`} />
            <span>Bekleyen Satın Alma (PR)</span>
          </div>
          <div className="flex items-baseline gap-2 pt-1">
            <div className="text-3xl sm:text-4xl font-light text-white tracking-tight">
              <AnimatedNumber value={stats.pendingPrCount} suffix=" Talep" />
            </div>
            <span className="bg-amber-500/10 text-amber-300 text-xs px-2 py-0.5 rounded-full font-medium font-mono">
              ₺{stats.pendingPrTotalAmount.toLocaleString('tr-TR')}
            </span>
          </div>
          <p className="text-[11px] text-zinc-500">Onay bekleyen tedarik emirleri</p>
        </div>

        {/* Kart 3: Konsinye (Emanet) Stok Değeri */}
        <div className="space-y-1">
          <div className="flex items-center gap-1.5 text-[11px] uppercase tracking-wider text-zinc-400 font-medium">
            <Handshake className="w-3.5 h-3.5 text-zinc-400" />
            <span>Konsinye Stok Değeri</span>
          </div>
          <div className="flex items-baseline gap-2 pt-1">
            <div className="text-3xl sm:text-4xl font-light text-white tracking-tight">
              <AnimatedNumber value={stats.totalConsignmentValue} prefix="₺" />
            </div>
            <span className="bg-white/[0.06] text-zinc-400 text-xs px-2 py-0.5 rounded-full font-mono">
              Emanet
            </span>
          </div>
          <p className="text-[11px] text-zinc-500">Depoda bulunan tedarikçi emanet stoğu</p>
        </div>

        {/* Kart 4: Bekleyen Konsinye Hakedişi */}
        <div className="space-y-1">
          <div className="flex items-center gap-1.5 text-[11px] uppercase tracking-wider text-zinc-400 font-medium">
            <TrendingUp className="w-3.5 h-3.5 text-[#34D399]" />
            <span>Tedarikçi Hakedişi</span>
          </div>
          <div className="flex items-baseline gap-2 pt-1">
            <div className="text-3xl sm:text-4xl font-light text-[#34D399] tracking-tight">
              <AnimatedNumber value={stats.unbilledConsignmentPayable} prefix="₺" />
            </div>
            <span className="bg-emerald-500/10 text-[#34D399] text-xs px-2 py-0.5 rounded-full font-medium">
              Tahakkuk
            </span>
          </div>
          <p className="text-[11px] text-zinc-500">Satılan/tüketilen konsinye karşılığı</p>
        </div>
      </div>
    </div>
  );
}
