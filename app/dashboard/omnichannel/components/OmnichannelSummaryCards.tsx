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
import { safeNumber, safeCurrency } from '@/lib/utils/safe-display';

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
  const channelCount = safeNumber(stats?.connectedChannelsCount, 0);
  const dailyOrders = safeNumber(stats?.totalDailyOrders, 0);
  const dailyRevenue = safeNumber(stats?.totalDailyRevenue, 0);
  const slaPercent = safeNumber(stats?.averageSlaPercent, 0);
  const activeShipments = safeNumber(stats?.activeShipmentsCount, 0);
  const pendingRma = safeNumber(stats?.pendingRmaCount, 0);
  const publishedStock = safeNumber(stats?.totalPublishedStock, 0);

  return (
    <div className="space-y-6">
      {/* Üst Başlık ve Hızlı Aksiyon Butonları */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-2xl font-semibold tracking-tight text-[--text]">
              Omnichannel Sipariş, Lojistik & E-Dönüşüm
            </h1>
            <span className="bg-[--brand-soft] text-[--brand] border border-[--brand-line] rounded-full px-2.5 py-0.5 text-[11px] font-medium">
              Canlı Pazaryeri & Kargo
            </span>
          </div>
          <p className="text-sm text-[--text-muted] mt-1">
            Trendyol, Hepsiburada, Shopify ve B2B sipariş karşılama, parçalı sevkiyat, muadil ürün ve RMA iade yönetimi
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <button
            onClick={onSyncAll}
            disabled={isSyncing}
            className="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-[--brand] to-[--blue] hover:opacity-95 text-white text-xs font-semibold rounded-full shadow-sm shadow-[--brand]/20 transition active:scale-95 disabled:opacity-50 cursor-pointer"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin' : ''}`} />
            {isSyncing ? 'Eşitleniyor...' : 'Tüm Kanalları Eşitle'}
          </button>

          <button
            onClick={onNewEDocumentClick}
            className="inline-flex items-center gap-2 px-4 py-2 bg-white hover:bg-[--muted-bg] border border-[--line] text-[--text-2] text-xs font-medium rounded-full transition active:scale-95 cursor-pointer shadow-sm"
          >
            <Plus className="w-4 h-4 text-[--brand]" />
            Yeni E-İrsaliye Kes
          </button>
        </div>
      </div>

      {/* 4 Kutusuz Metrik Şeridi (Borderless KPI Strip) */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-8 py-2 border-b border-[--line]">
        {/* Kart 1: Bağlı Kanallar ve Günlük Sipariş */}
        <div className="space-y-1">
          <div className="flex items-center gap-1.5 text-[11px] uppercase tracking-[0.12em] text-[--text-muted] font-medium">
            <Globe className="w-3.5 h-3.5 text-[--brand]" />
            <span>Aktif Satış Kanalları</span>
          </div>
          <div className="flex items-baseline gap-2 pt-1">
            <div className="text-3xl font-light text-[--text] tracking-tight tabular-nums">
              <AnimatedNumber value={channelCount} suffix=" Kanal" />
            </div>
            <span className="bg-[--brand-soft] text-[--brand] border border-[--brand-line] text-[11px] px-2 py-0.5 rounded-full font-medium">
              {dailyOrders} Sipariş/G
            </span>
          </div>
          <p className="text-[11px] text-[--text-muted]">Trendyol, Hepsiburada, Shopify, B2B</p>
        </div>

        {/* Kart 2: Günlük Ciro */}
        <div className="space-y-1">
          <div className="flex items-center gap-1.5 text-[11px] uppercase tracking-[0.12em] text-[--text-muted] font-medium">
            <TrendingUp className="w-3.5 h-3.5 text-[--brand]" />
            <span>Günlük Ciro</span>
          </div>
          <div className="flex items-baseline gap-2 pt-1">
            <div className="text-3xl font-light text-[--brand] tracking-tight tabular-nums">
              <AnimatedNumber value={dailyRevenue} prefix="₺" />
            </div>
            <span className="bg-[--ok-soft] text-[--ok] border border-[--ok]/25 text-[11px] px-2 py-0.5 rounded-full font-medium">
              Canlı
            </span>
          </div>
          <p className="text-[11px] text-[--text-muted]">Tüm kanallardan canlı brüt satış toplamı</p>
        </div>

        {/* Kart 3: Lojistik & Kargo SLA */}
        <div className="space-y-1">
          <div className="flex items-center gap-1.5 text-[11px] uppercase tracking-[0.12em] text-[--text-muted] font-medium">
            <Truck className="w-3.5 h-3.5 text-[--brand]" />
            <span>Kargo Teslimat SLA</span>
          </div>
          <div className="flex items-baseline gap-2 pt-1">
            <div className="text-3xl font-light text-[--text] tracking-tight tabular-nums">
              <AnimatedNumber value={slaPercent} prefix="%" />
            </div>
            <span className="bg-[--muted-bg] text-[--text-2] border border-[--line] text-[11px] px-2 py-0.5 rounded-full font-mono tabular-nums">
              {activeShipments} Yolda
            </span>
          </div>
          <p className="text-[11px] text-[--text-muted]">Zamanında kargo teslimat oranı</p>
        </div>

        {/* Kart 4: İade (RMA) & Satılabilir Stok */}
        <div className="space-y-1">
          <div className="flex items-center gap-1.5 text-[11px] uppercase tracking-[0.12em] text-[--text-muted] font-medium">
            <Boxes className={`w-3.5 h-3.5 ${pendingRma > 0 ? "text-[--warn]" : "text-[--text-muted]"}`} />
            <span>İade (RMA) Muayene</span>
          </div>
          <div className="flex items-baseline gap-2 pt-1">
            <div className="text-3xl font-light text-[--text] tracking-tight tabular-nums">
              <AnimatedNumber value={pendingRma} suffix=" Paket" />
            </div>
            {pendingRma > 0 ? (
              <span className="bg-[--warn-soft] text-[--warn] border border-[--warn]/25 text-[11px] px-2 py-0.5 rounded-full font-medium">
                Bekliyor
              </span>
            ) : (
              <span className="bg-[--ok-soft] text-[--ok] border border-[--ok]/25 text-[11px] px-2 py-0.5 rounded-full font-medium">
                Temiz
              </span>
            )}
          </div>
          <p className="text-[11px] text-[--text-muted]">
            Yayınlanan Stok (ATP): <strong className="text-[--text] font-mono tabular-nums">{publishedStock} Adet</strong>
          </p>
        </div>
      </div>
    </div>
  );
}
