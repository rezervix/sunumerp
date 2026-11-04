'use client';

import React from 'react';
import {
  Globe,
  RefreshCw,
  ShoppingBag,
  Truck,
  TrendingUp,
  FileText,
  Boxes,
  CheckCircle2,
  Plus
} from 'lucide-react';

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
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
              Omnichannel Sipariş, Lojistik & E-Dönüşüm
            </h1>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300 border border-blue-200 dark:border-blue-800">
              Canlı Pazaryeri & Kargo
            </span>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Trendyol, Hepsiburada, Shopify ve B2B sipariş karşılama, parçalı sevkiyat, muadil ürün ve RMA iade yönetimi
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={onSyncAll}
            disabled={isSyncing}
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-xs sm:text-sm font-semibold rounded-xl shadow-sm transition active:scale-95 disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${isSyncing ? 'animate-spin' : ''}`} />
            {isSyncing ? 'Eşitleniyor...' : 'Tüm Kanalları Eşitle'}
          </button>

          <button
            onClick={onNewEDocumentClick}
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-slate-900 hover:bg-slate-800 dark:bg-slate-100 dark:hover:bg-white text-white dark:text-slate-900 text-xs sm:text-sm font-semibold rounded-xl shadow-sm transition active:scale-95"
          >
            <Plus className="w-4 h-4" />
            Yeni E-İrsaliye Kes
          </button>
        </div>
      </div>

      {/* 4 Ana Metrik Kartı */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Kart 1: Bağlı Kanallar ve Günlük Sipariş */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-4 shadow-sm hover:shadow transition">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500">Aktif Satış Kanalları</span>
            <div className="w-8 h-8 rounded-lg bg-blue-50 dark:bg-blue-950/60 flex items-center justify-center text-blue-600">
              <Globe className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-slate-900 dark:text-white">
              {stats.connectedChannelsCount} Kanal
            </span>
            <span className="text-xs font-semibold text-emerald-600">
              ({stats.totalDailyOrders} Sipariş/Gün)
            </span>
          </div>
          <div className="mt-1 text-xs text-slate-400">
            Trendyol, Hepsiburada, Shopify, B2B
          </div>
        </div>

        {/* Kart 2: Günlük Ciro */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-4 shadow-sm hover:shadow transition">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500">Günlük Omnichannel Ciro</span>
            <div className="w-8 h-8 rounded-lg bg-emerald-50 dark:bg-emerald-950/60 flex items-center justify-center text-emerald-600">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-slate-900 dark:text-white">
              ₺{stats.totalDailyRevenue.toLocaleString('tr-TR')}
            </span>
          </div>
          <div className="mt-1 text-xs text-slate-400">
            Tüm kanallardan canlı satış toplamı
          </div>
        </div>

        {/* Kart 3: Lojistik & Kargo SLA */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-4 shadow-sm hover:shadow transition">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500">Kargo & Lojistik SLA</span>
            <div className="w-8 h-8 rounded-lg bg-purple-50 dark:bg-purple-950/60 flex items-center justify-center text-purple-600">
              <Truck className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-purple-600 dark:text-purple-400">
              %{stats.averageSlaPercent}
            </span>
            <span className="text-xs text-slate-500">Zamanında Teslim</span>
          </div>
          <div className="mt-1 text-xs text-slate-400">
            {stats.activeShipmentsCount} adet aktif sevkiyat yolda
          </div>
        </div>

        {/* Kart 4: İade (RMA) & Satılabilir Stok */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-4 shadow-sm hover:shadow transition">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500">İade (RMA) Bekleyen</span>
            <div className="w-8 h-8 rounded-lg bg-amber-50 dark:bg-amber-950/60 flex items-center justify-center text-amber-600">
              <Boxes className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-slate-900 dark:text-white">
              {stats.pendingRmaCount}
            </span>
            <span className="text-xs text-amber-600 font-semibold">Muayene Bekliyor</span>
          </div>
          <div className="mt-1 text-xs text-slate-400">
            Yayınlanan Stok (ATP): <strong>{stats.totalPublishedStock} Adet</strong>
          </div>
        </div>
      </div>
    </div>
  );
}

