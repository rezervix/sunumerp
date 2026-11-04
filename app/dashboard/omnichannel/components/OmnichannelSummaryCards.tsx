'use client';

import React from 'react';
import { motion } from 'framer-motion';
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
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 glass-panel p-5 rounded-2xl">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-white">
              Omnichannel Sipariş, Lojistik & E-Dönüşüm
            </h1>
            <span className="bg-sky-500/15 text-sky-300 border border-sky-500/30 rounded-full px-3 py-0.5 text-xs font-semibold">
              Canlı Pazaryeri & Kargo
            </span>
          </div>
          <p className="text-xs text-white/60 mt-1">
            Trendyol, Hepsiburada, Shopify ve B2B sipariş karşılama, parçalı sevkiyat, muadil ürün ve RMA iade yönetimi
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={onSyncAll}
            disabled={isSyncing}
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-sky-600 hover:bg-sky-500 text-white text-xs sm:text-sm font-semibold rounded-xl shadow-lg shadow-sky-500/25 transition active:scale-95 disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${isSyncing ? 'animate-spin' : ''}`} />
            {isSyncing ? 'Eşitleniyor...' : 'Tüm Kanalları Eşitle'}
          </button>

          <button
            onClick={onNewEDocumentClick}
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-white/10 hover:bg-white/15 border border-white/15 text-white text-xs sm:text-sm font-semibold rounded-xl transition active:scale-95"
          >
            <Plus className="w-4 h-4 text-indigo-400" />
            Yeni E-İrsaliye Kes
          </button>
        </div>
      </div>

      {/* 4 Ana Metrik Kartı */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Kart 1: Bağlı Kanallar ve Günlük Sipariş */}
        <motion.div
          whileHover={{ y: -4 }}
          className="glass-card p-6 rounded-2xl flex flex-col justify-between"
        >
          <div className="flex items-center justify-between">
            <span className="text-sm text-white/60">Aktif Satış Kanalları</span>
            <div className="w-10 h-10 rounded-xl bg-sky-500/15 border border-sky-500/30 flex items-center justify-center text-sky-400">
              <Globe className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-white mt-1">
              {stats.connectedChannelsCount} Kanal
            </span>
            <span className="text-xs font-semibold text-emerald-400">
              ({stats.totalDailyOrders} Sipariş/Gün)
            </span>
          </div>
          <div className="mt-3 text-xs text-white/50">
            Trendyol, Hepsiburada, Shopify, B2B
          </div>
        </motion.div>

        {/* Kart 2: Günlük Ciro */}
        <motion.div
          whileHover={{ y: -4 }}
          className="glass-card p-6 rounded-2xl flex flex-col justify-between"
        >
          <div className="flex items-center justify-between">
            <span className="text-sm text-white/60">Günlük Omnichannel Ciro</span>
            <div className="w-10 h-10 rounded-xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
              <TrendingUp className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-white mt-1">
              ₺{stats.totalDailyRevenue.toLocaleString('tr-TR')}
            </span>
          </div>
          <div className="mt-3 text-xs text-emerald-400">
            Tüm kanallardan canlı satış toplamı
          </div>
        </motion.div>

        {/* Kart 3: Lojistik & Kargo SLA */}
        <motion.div
          whileHover={{ y: -4 }}
          className="glass-card p-6 rounded-2xl flex flex-col justify-between"
        >
          <div className="flex items-center justify-between">
            <span className="text-sm text-white/60">Kargo & Lojistik SLA</span>
            <div className="w-10 h-10 rounded-xl bg-purple-500/15 border border-purple-500/30 flex items-center justify-center text-purple-400">
              <Truck className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-white mt-1">
              %{stats.averageSlaPercent}
            </span>
            <span className="text-xs text-purple-300 font-medium">Zamanında Teslim</span>
          </div>
          <div className="mt-3 text-xs text-white/50">
            {stats.activeShipmentsCount} adet aktif sevkiyat yolda
          </div>
        </motion.div>

        {/* Kart 4: İade (RMA) & Satılabilir Stok */}
        <motion.div
          whileHover={{ y: -4 }}
          className="glass-card p-6 rounded-2xl flex flex-col justify-between"
        >
          <div className="flex items-center justify-between">
            <span className="text-sm text-white/60">İade (RMA) Bekleyen</span>
            <div className="w-10 h-10 rounded-xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-400">
              <Boxes className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-white mt-1">
              {stats.pendingRmaCount}
            </span>
            <span className="text-xs text-amber-400 font-semibold">Muayene Bekliyor</span>
          </div>
          <div className="mt-3 text-xs text-white/50">
            Yayınlanan Stok (ATP): <strong className="text-white">{stats.totalPublishedStock} Adet</strong>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
