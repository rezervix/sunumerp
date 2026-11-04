'use client';

import React from 'react';
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
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
              Akıllı Satın Alma & Tedarik Yönetimi
            </h1>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800">
              Canlı ROP Motoru
            </span>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Kritik stok otomasyonu, dinamik yeniden sipariş noktası (ROP), konsinye emanet stok ve tedarikçi mutabakatı
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={onNewRequisitionClick}
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs sm:text-sm font-semibold rounded-xl shadow-sm transition active:scale-95"
          >
            <Plus className="w-4 h-4" />
            Yeni Satın Alma Talebi
          </button>
        </div>
      </div>

      {/* 4 Ana Özet Metrik Kartı */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Kart 1: Kritik Stok Uyarısı */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-4 shadow-sm hover:shadow transition">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500">Kritik Stok Uyarısı</span>
            <div className="w-8 h-8 rounded-lg bg-rose-50 dark:bg-rose-950/50 flex items-center justify-center text-rose-600">
              <AlertTriangle className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-slate-900 dark:text-white">
              {stats.totalCriticalItems}
            </span>
            <span className="text-xs text-rose-600 font-semibold">
              {stats.stockoutItems > 0 ? `(${stats.stockoutItems} Tükendi)` : 'Acil İkmal'}
            </span>
          </div>
          <div className="mt-1 text-xs text-slate-400">
            {stats.belowRopItems} ürün ROP sipariş eşiğinin altında
          </div>
        </div>

        {/* Kart 2: Bekleyen Satın Alma Talepleri (PR) */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-4 shadow-sm hover:shadow transition">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500">Bekleyen Satın Alma (PR)</span>
            <div className="w-8 h-8 rounded-lg bg-amber-50 dark:bg-amber-950/50 flex items-center justify-center text-amber-600">
              <FileCheck2 className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-slate-900 dark:text-white">
              {stats.pendingPrCount}
            </span>
            <span className="text-xs text-slate-500 font-medium">Talep / Sipariş</span>
          </div>
          <div className="mt-1 text-xs text-amber-600 dark:text-amber-400 font-semibold">
            ₺{stats.pendingPrTotalAmount.toLocaleString('tr-TR')} Toplam Tutar
          </div>
        </div>

        {/* Kart 3: Konsinye (Emanet) Stok Değeri */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-4 shadow-sm hover:shadow transition">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500">Konsinye Stok Değeri</span>
            <div className="w-8 h-8 rounded-lg bg-blue-50 dark:bg-blue-950/50 flex items-center justify-center text-blue-600">
              <Handshake className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-slate-900 dark:text-white">
              ₺{stats.totalConsignmentValue.toLocaleString('tr-TR')}
            </span>
          </div>
          <div className="mt-1 text-xs text-slate-400">
            Depoda bulunan tedarikçi emanet stoğu
          </div>
        </div>

        {/* Kart 4: Bekleyen Konsinye Hakedişi */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-4 shadow-sm hover:shadow transition">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500">Ödenecek Tedarikçi Hakedişi</span>
            <div className="w-8 h-8 rounded-lg bg-emerald-50 dark:bg-emerald-950/50 flex items-center justify-center text-emerald-600">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">
              ₺{stats.unbilledConsignmentPayable.toLocaleString('tr-TR')}
            </span>
          </div>
          <div className="mt-1 text-xs text-slate-400">
            Satılan/tüketilen konsinye karşılığı
          </div>
        </div>
      </div>
    </div>
  );
}

