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
import { safeNumber, safeCurrency } from '@/lib/utils/safe-display';

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
}: StatsProps) {
  const criticalItemsCount = safeNumber(stats?.totalCriticalItems, 0);
  const stockoutCount = safeNumber(stats?.stockoutItems, 0);
  const belowRopCount = safeNumber(stats?.belowRopItems, 0);
  const pendingPrCount = safeNumber(stats?.pendingPrCount, 0);
  const pendingPrTotal = safeNumber(stats?.pendingPrTotalAmount, 0);
  const consignmentValue = safeNumber(stats?.totalConsignmentValue, 0);
  const unbilledPayable = safeNumber(stats?.unbilledConsignmentPayable, 0);

  return (
    <div className="space-y-6">
      {/* Üst Başlık ve Hızlı Aksiyon Butonu */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-2xl font-semibold tracking-tight text-[--text]">
              Akıllı Satın Alma & Tedarik Yönetimi
            </h1>
            <span className="bg-[--brand-soft] text-[--brand] border border-[--brand-line] rounded-full px-2.5 py-0.5 text-[11px] font-medium">
              Canlı ROP Motoru
            </span>
          </div>
          <p className="text-sm text-[--text-muted] mt-1">
            Kritik stok otomasyonu, dinamik yeniden sipariş noktası (ROP), konsinye emanet stok ve tedarikçi mutabakatı
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <button
            onClick={onNewRequisitionClick}
            className="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-[--brand] to-[--blue] hover:opacity-95 text-white text-xs font-semibold rounded-full shadow-sm shadow-[--brand]/20 transition active:scale-95 cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            Yeni Satın Alma Talebi
          </button>
        </div>
      </div>

      {/* 4 Ana Kutusuz Metrik Şeridi (Borderless KPI Strip) */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-8 py-2 border-b border-[--line]">
        {/* Kart 1: Kritik Stok Uyarısı */}
        <div className="space-y-1">
          <div className="flex items-center gap-1.5 text-[11px] uppercase tracking-[0.12em] text-[--text-muted] font-medium">
            <AlertTriangle className={`w-3.5 h-3.5 ${criticalItemsCount > 0 ? "text-[--bad]" : "text-[--text-muted]"}`} />
            <span>Kritik Stok Uyarısı</span>
          </div>
          <div className="flex items-baseline gap-2 pt-1">
            <div className={`text-3xl font-light tracking-tight tabular-nums ${
              criticalItemsCount > 0 ? "text-[--bad]" : "text-[--text]"
            }`}>
              <AnimatedNumber value={criticalItemsCount} />
            </div>
            {stockoutCount > 0 && (
              <span className="bg-[--bad-soft] text-[--bad] border border-[--bad]/20 text-[11px] px-2 py-0.5 rounded-full font-medium">
                {stockoutCount} Tükendi
              </span>
            )}
          </div>
          <p className="text-[11px] text-[--text-muted]">
            {belowRopCount} ürün ROP sipariş eşiğinin altında
          </p>
        </div>

        {/* Kart 2: Bekleyen Satın Alma Talepleri (PR) */}
        <div className="space-y-1">
          <div className="flex items-center gap-1.5 text-[11px] uppercase tracking-[0.12em] text-[--text-muted] font-medium">
            <FileCheck2 className={`w-3.5 h-3.5 ${pendingPrCount > 0 ? "text-[--warn]" : "text-[--text-muted]"}`} />
            <span>Bekleyen Satın Alma (PR)</span>
          </div>
          <div className="flex items-baseline gap-2 pt-1">
            <div className="text-3xl font-light text-[--text] tracking-tight tabular-nums">
              <AnimatedNumber value={pendingPrCount} suffix=" Talep" />
            </div>
            <span className="bg-[--warn-soft] text-[--warn] border border-[--warn]/20 text-[11px] px-2 py-0.5 rounded-full font-medium font-mono tabular-nums">
              {safeCurrency(pendingPrTotal)}
            </span>
          </div>
          <p className="text-[11px] text-[--text-muted]">Onay bekleyen tedarik emirleri</p>
        </div>

        {/* Kart 3: Konsinye (Emanet) Stok Değeri */}
        <div className="space-y-1">
          <div className="flex items-center gap-1.5 text-[11px] uppercase tracking-[0.12em] text-[--text-muted] font-medium">
            <Handshake className="w-3.5 h-3.5 text-[--brand]" />
            <span>Konsinye Stok Değeri</span>
          </div>
          <div className="flex items-baseline gap-2 pt-1">
            <div className="text-3xl font-light text-[--text] tracking-tight tabular-nums">
              <AnimatedNumber value={consignmentValue} prefix="₺" />
            </div>
            <span className="bg-[--muted-bg] text-[--text-muted] border border-[--line] text-[11px] px-2 py-0.5 rounded-full font-medium">
              Emanet
            </span>
          </div>
          <p className="text-[11px] text-[--text-muted]">Depoda bulunan tedarikçi emanet stoğu</p>
        </div>

        {/* Kart 4: Bekleyen Konsinye Hakedişi */}
        <div className="space-y-1">
          <div className="flex items-center gap-1.5 text-[11px] uppercase tracking-[0.12em] text-[--text-muted] font-medium">
            <TrendingUp className="w-3.5 h-3.5 text-[--brand]" />
            <span>Tedarikçi Hakedişi</span>
          </div>
          <div className="flex items-baseline gap-2 pt-1">
            <div className="text-3xl font-light text-[--brand] tracking-tight tabular-nums">
              <AnimatedNumber value={unbilledPayable} prefix="₺" />
            </div>
            <span className="bg-[--brand-soft] text-[--brand] border border-[--brand-line] text-[11px] px-2 py-0.5 rounded-full font-medium">
              Tahakkuk
            </span>
          </div>
          <p className="text-[11px] text-[--text-muted]">Satılan/tüketilen konsinye karşılığı</p>
        </div>
      </div>
    </div>
  );
}
