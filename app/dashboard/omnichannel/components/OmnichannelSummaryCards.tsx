'use client';

import React from 'react';
import {
  Globe,
  RefreshCw,
  Truck,
  TrendingUp,
  Boxes,
  Plus
} from 'lucide-react';
import { AnimatedNumber } from '@/components/ui/motion-primitives';

interface SummaryCardsProps {
  stats: {
    connectedChannelsCount: number;
    totalDailyOrders: number;
    totalDailyRevenue: number;
    pendingRmaCount: number;
    activeShipmentsCount: number;
    averageSlaPercent: number;
    totalPublishedStock: number;
  };
  isSyncing: boolean;
  onSyncAll: () => void;
  onNewEDocumentClick: () => void;
}

export function OmnichannelSummaryCards({
  stats,
  isSyncing,
  onSyncAll,
  onNewEDocumentClick
}: SummaryCardsProps) {
  return (
    <div className="space-y-4">
      {/* Üst Başlık ve Hızlı Aksiyon Butonları */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 py-2">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-xl sm:text-2xl font-light tracking-tight text-white">
              Omnichannel Sipariş, Lojistik & E-Dönüşüm
            </h1>
            <span className="bg-emerald-500/10 text-[#34D399] border border-emerald-500/20 rounded-full px-2.5 py-0.5 text-[11px] font-medium">
              Canlı Pazaryeri & Kargo
            </span>
          </div>
          <p className="text-xs text-zinc-400 mt-0.5">
            Trendyol, Hepsiburada, Shopify ve B2B sipariş karşılama, parçalı sevkiyat, muadil ürün ve RMA iade yönetimi
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <button
            onClick={onSyncAll}
            disabled={isSyncing}
            className="inline-flex items-center gap-2 px-4 py-2 bg-[#34D399] hover:bg-[#34D399]/90 text-[#061811] text-xs font-semibold rounded-full shadow-lg shadow-emerald-500/20 transition active:scale-95 disabled:opacity-50 cursor-pointer"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin' : ''}`} />
            {isSyncing ? 'Eşitleniyor...' : 'Tüm Kanalları Eşitle'}
          </button>

          <button
            onClick={onNewEDocumentClick}
            className="inline-flex items-center gap-2 px-4 py-2 bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.08] text-zinc-300 hover:text-white text-xs font-medium rounded-full transition active:scale-95 cursor-pointer"
          >
            <Plus className="w-4 h-4 text-[#34D399]" />
            Yeni E-İrsaliye Kes
          </button>
        </div>
      </div>

      {/* 4 Kutusuz Metrik Şeridi (Borderless KPI Strip) */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-8 py-4 border-b border-white/[0.06]">
        {/* Kart 1: Bağlı Kanallar ve Günlük Sipariş */}
        <div className="space-y-1">
          <div className="flex items-center gap-1.5 text-[11px] uppercase tracking-wider text-zinc-400 font-medium">
            <Globe className="w-3.5 h-3.5 text-zinc-400" />
            <span>Aktif Satış Kanalları</span>
          </div>
          <div className="flex items-baseline gap-2 pt-1">
            <div className="text-3xl sm:text-4xl font-light text-white tracking-tight">
              <AnimatedNumber value={stats.connectedChannelsCount} suffix=" Kanal" />
            </div>
            <span className="bg-emerald-500/10 text-[#34D399] text-xs px-2 py-0.5 rounded-full font-medium">
              {stats.totalDailyOrders} Sipariş/G
            </span>
          </div>
          <p className="text-[11px] text-zinc-500">Trendyol, Hepsiburada, Shopify, B2B</p>
        </div>

        {/* Kart 2: Günlük Ciro */}
        <div className="space-y-1">
          <div className="flex items-center gap-1.5 text-[11px] uppercase tracking-wider text-zinc-400 font-medium">
            <TrendingUp className="w-3.5 h-3.5 text-[#34D399]" />
            <span>Günlük Ciro</span>
          </div>
          <div className="flex items-baseline gap-2 pt-1">
            <div className="text-3xl sm:text-4xl font-light text-[#34D399] tracking-tight">
              <AnimatedNumber value={stats.totalDailyRevenue} prefix="₺" />
            </div>
            <span className="bg-emerald-500/10 text-[#34D399] text-xs px-2 py-0.5 rounded-full font-medium">
              Canlı
            </span>
          </div>
          <p className="text-[11px] text-zinc-500">Tüm kanallardan canlı brüt satış toplamı</p>
        </div>

        {/* Kart 3: Lojistik & Kargo SLA */}
        <div className="space-y-1">
          <div className="flex items-center gap-1.5 text-[11px] uppercase tracking-wider text-zinc-400 font-medium">
            <Truck className="w-3.5 h-3.5 text-zinc-400" />
            <span>Kargo Teslimat SLA</span>
          </div>
          <div className="flex items-baseline gap-2 pt-1">
            <div className="text-3xl sm:text-4xl font-light text-white tracking-tight">
              <AnimatedNumber value={stats.averageSlaPercent} prefix="%" />
            </div>
            <span className="bg-white/[0.06] text-zinc-300 text-xs px-2 py-0.5 rounded-full font-mono">
              {stats.activeShipmentsCount} Yolda
            </span>
          </div>
          <p className="text-[11px] text-zinc-500">Zamanında kargo teslimat oranı</p>
        </div>

        {/* Kart 4: İade (RMA) & Satılabilir Stok */}
        <div className="space-y-1">
          <div className="flex items-center gap-1.5 text-[11px] uppercase tracking-wider text-zinc-400 font-medium">
            <Boxes className={`w-3.5 h-3.5 ${stats.pendingRmaCount > 0 ? "text-amber-400" : "text-zinc-500"}`} />
            <span>İade (RMA) Muayene</span>
          </div>
          <div className="flex items-baseline gap-2 pt-1">
            <div className="text-3xl sm:text-4xl font-light text-white tracking-tight">
              <AnimatedNumber value={stats.pendingRmaCount} suffix=" Paket" />
            </div>
            {stats.pendingRmaCount > 0 ? (
              <span className="bg-amber-500/10 text-amber-300 text-xs px-2 py-0.5 rounded-full font-medium">
                Bekliyor
              </span>
            ) : (
              <span className="bg-white/[0.06] text-zinc-400 text-xs px-2 py-0.5 rounded-full font-mono">
                Temiz
              </span>
            )}
          </div>
          <p className="text-[11px] text-zinc-500">
            Yayınlanan Stok (ATP): <strong className="text-white font-mono">{stats.totalPublishedStock} Adet</strong>
          </p>
        </div>
      </div>
    </div>
  );
}
