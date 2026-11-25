'use client';

import React, { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import {
  ArrowLeft,
  ClipboardCheck,
  RefreshCw,
  Smartphone,
} from 'lucide-react';
import { toast } from 'sonner';
import { RentHandoverAndReturnTab } from '../components/RentHandoverAndChargesTabs';

export default function MobilTeslimVeIadePage() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [selectedReservationId, setSelectedReservationId] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/arac-kiralama?section=overview', { cache: 'no-store' });
      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error || 'Teslim ve iade görevleri yüklenemedi.');
      }
      setData(json);
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  return (
    <div className="min-h-screen bg-[#F6F8FB] text-[var(--text)] p-4 md:p-6 space-y-4">
      <div className="bg-[white]/90 border border-[--line] rounded-[20px] p-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-2xl bg-[--brand]/15 border border-[--brand-line] flex items-center justify-center">
            <Smartphone className="w-5 h-5 text-[#1267E6]" />
          </div>
          <div>
            <h1 className="text-base font-bold text-[var(--text)]">
              Saha Personeli Mobil Araç Teslim &amp; İade Ekspertiz Formu
            </h1>
            <p className="text-xs text-[var(--text-muted)]">
              Dokunmatik km/yakıt girişi, karoser hasar işaretlemesi, fotoğraf yükleme, iki form karşılaştırması ve müşteri imzası
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Link
            href="/dashboard/arac-kiralama"
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-full bg-[--muted-bg] hover:bg-white/[0.12] border border-[var(--line)] text-xs text-[var(--text)]"
          >
            <ArrowLeft className="w-3.5 h-3.5 text-[#1267E6]" />
            Kiralama Merkezine Dön
          </Link>
          <button
            type="button"
            onClick={loadData}
            disabled={loading}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-full bg-[--muted-bg] hover:bg-white/[0.12] border border-[var(--line)] text-xs text-[var(--text)] cursor-pointer"
          >
            <RefreshCw className={`w-3.5 h-3.5 text-[#1267E6] ${loading ? 'animate-spin' : ''}`} />
            Yenile
          </button>
        </div>
      </div>

      {data && (
        <RentHandoverAndReturnTab
          reservations={data.reservations || []}
          inspectionForms={data.inspectionForms || []}
          policyConfig={data.policyConfig || {}}
          selectedReservationId={selectedReservationId}
          onSelectReservationId={setSelectedReservationId}
          onRefresh={loadData}
        />
      )}
    </div>
  );
}
