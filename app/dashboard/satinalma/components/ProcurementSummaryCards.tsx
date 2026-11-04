'use client';

import React from 'react';
import { motion } from 'framer-motion';
import {
  AlertTriangle,
  FileCheck2,
  Handshake,
  TrendingUp,
  Plus,
  Truck,
  RotateCcw
} from 'lucide-react';

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
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 glass-panel p-5 rounded-2xl">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-white">
              Akıllı Satın Alma & Tedarik Yönetimi
            </h1>
            <span className="bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 rounded-full px-3 py-0.5 text-xs font-semibold">
              Canlı ROP Motoru
            </span>
          </div>
          <p className="text-xs text-white/60 mt-1">
            Kritik stok otomasyonu, dinamik yeniden sipariş noktası (ROP), konsinye emanet stok ve tedarikçi mutabakatı
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={onNewRequisitionClick}
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white text-xs sm:text-sm font-semibold rounded-xl shadow-lg shadow-indigo-500/25 transition active:scale-95"
          >
            <Plus className="w-4 h-4" />
            Yeni Satın Alma Talebi
          </button>
        </div>
      </div>

      {/* 4 Ana Özet Metrik Kartı */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Kart 1: Kritik Stok Uyarısı */}
        <motion.div
          whileHover={{ y: -4 }}
          className="glass-card p-6 rounded-2xl flex flex-col justify-between"
        >
          <div className="flex items-center justify-between">
            <span className="text-sm text-white/60">Kritik Stok Uyarısı</span>
            <div className="w-10 h-10 rounded-xl bg-rose-500/15 border border-rose-500/30 flex items-center justify-center text-rose-400">
              <AlertTriangle className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-white mt-1">
              {stats.totalCriticalItems}
            </span>
            <span className="text-xs text-rose-400 font-semibold">
              {stats.stockoutItems > 0 ? `(${stats.stockoutItems} Tükendi)` : 'Acil İkmal'}
            </span>
          </div>
          <div className="mt-3 text-xs text-white/50">
            {stats.belowRopItems} ürün ROP sipariş eşiğinin altında
          </div>
        </motion.div>

        {/* Kart 2: Bekleyen Satın Alma Talepleri (PR) */}
        <motion.div
          whileHover={{ y: -4 }}
          className="glass-card p-6 rounded-2xl flex flex-col justify-between"
        >
          <div className="flex items-center justify-between">
            <span className="text-sm text-white/60">Bekleyen Satın Alma (PR)</span>
            <div className="w-10 h-10 rounded-xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-400">
              <FileCheck2 className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-white mt-1">
              {stats.pendingPrCount}
            </span>
            <span className="text-xs text-white/50 font-medium">Talep / Sipariş</span>
          </div>
          <div className="mt-3 text-xs text-amber-400 font-semibold">
            ₺{stats.pendingPrTotalAmount.toLocaleString('tr-TR')} Toplam Tutar
          </div>
        </motion.div>

        {/* Kart 3: Konsinye (Emanet) Stok Değeri */}
        <motion.div
          whileHover={{ y: -4 }}
          className="glass-card p-6 rounded-2xl flex flex-col justify-between"
        >
          <div className="flex items-center justify-between">
            <span className="text-sm text-white/60">Konsinye Stok Değeri</span>
            <div className="w-10 h-10 rounded-xl bg-sky-500/15 border border-sky-500/30 flex items-center justify-center text-sky-400">
              <Handshake className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-white mt-1">
              ₺{stats.totalConsignmentValue.toLocaleString('tr-TR')}
            </span>
          </div>
          <div className="mt-3 text-xs text-white/50">
            Depoda bulunan tedarikçi emanet stoğu
          </div>
        </motion.div>

        {/* Kart 4: Bekleyen Konsinye Hakedişi */}
        <motion.div
          whileHover={{ y: -4 }}
          className="glass-card p-6 rounded-2xl flex flex-col justify-between"
        >
          <div className="flex items-center justify-between">
            <span className="text-sm text-white/60">Ödenecek Tedarikçi Hakedişi</span>
            <div className="w-10 h-10 rounded-xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
              <TrendingUp className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-white mt-1">
              ₺{stats.unbilledConsignmentPayable.toLocaleString('tr-TR')}
            </span>
          </div>
          <div className="mt-3 text-xs text-emerald-400">
            Satılan/tüketilen konsinye karşılığı
          </div>
        </motion.div>
      </div>
    </div>
  );
}
