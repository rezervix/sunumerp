'use client';

import React, { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import {
  BarChart3,
  CheckCircle2,
  FileCheck2,
  RefreshCw,
  Smartphone,
  Truck,
} from 'lucide-react';
import { toast } from 'sonner';
import { AnimatedNumber, StaggerContainer, StaggerItem } from '@/components/ui/motion-primitives';
import { DispatchPlanningAndTripsTab } from './components/DispatchPlanningAndTripsTab';
import { DispatchPodsAndAnalyticsTab } from './components/DispatchPodsAndAnalyticsTab';

export default function SevkiyatVeRotaPage() {
  const [activeTab, setActiveTab] = useState<'planning' | 'pods' | 'analytics'>('planning');
  const [loading, setLoading] = useState<boolean>(true);
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [submitting, setSubmitting] = useState<boolean>(false);

  const [kpis, setKpis] = useState<any>({
    totalTrips: 0,
    activeTrips: 0,
    completedTrips: 0,
    totalStops: 0,
    onTimeDeliveryRatePct: 0,
    failedDeliveryRatePct: 0,
    avgStopsPerVehicleDay: 0,
    avgCapacityLoadPct: 0,
    totalPlannedDistanceKm: 0,
    totalActualDistanceKm: 0,
    optimizationSavedKm: 0,
    optimizationSavedPct: 0,
    distanceVarianceKm: 0,
    distanceVariancePct: 0,
    eWaybillIssuedTrips: 0,
    podCapturedStops: 0,
  });
  const [trips, setTrips] = useState<any[]>([]);
  const [readyPool, setReadyPool] = useState<any[]>([]);
  const [vehicles, setVehicles] = useState<any[]>([]);
  const [drivers, setDrivers] = useState<any[]>([]);
  const [warehouses, setWarehouses] = useState<any[]>([]);
  const [optJobs, setOptJobs] = useState<any[]>([]);
  const [adapterStatus, setAdapterStatus] = useState<any>({});
  const [mapConfig, setMapConfig] = useState<any>({
    tileUrl: null,
    hasExternalTileConfig: false,
    attribution: '© Sunum ERP Sevkiyat Harita Altlığı (Çevrimdışı Koordinat Kanvası)',
  });
  const [preselectedSourceKey, setPreselectedSourceKey] = useState<string | null>(null);
  const [preselectedTripId, setPreselectedTripId] = useState<string | null>(null);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const sp = new URLSearchParams(window.location.search);
    const sType = sp.get('addSourceType');
    const sId = sp.get('addSourceId');
    if (sType && sId) {
      setPreselectedSourceKey(`${sType}:${sId}`);
    }
    const tId = sp.get('tripId');
    if (tId) {
      setPreselectedTripId(tId);
    }
    const tab = sp.get('tab');
    if (tab === 'pods' || tab === 'analytics') setActiveTab(tab);
  }, []);

  const fetchOverview = useCallback(async (silent = false) => {
    try {
      if (!silent) setRefreshing(true);
      const res = await fetch('/api/sevkiyat?section=overview', { cache: 'no-store' });
      const data = await res.json();
      if (!res.ok || !data.success) {
        if (!silent) toast.error(data.error || 'Sevkiyat verileri alınamadı.');
        return;
      }
      if (data.kpis) setKpis(data.kpis);
      setTrips(data.trips || []);
      setReadyPool(data.readyPool || []);
      setVehicles(data.vehicles || []);
      setDrivers(data.drivers || []);
      setWarehouses(data.warehouses || []);
      setOptJobs(data.optJobs || []);
      if (data.adapterStatus) setAdapterStatus(data.adapterStatus);
      if (data.mapConfig) setMapConfig(data.mapConfig);
    } catch {
      if (!silent) toast.error('Sevkiyat servisine ulaşılamadı.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchOverview(true);
  }, [fetchOverview]);

  const handleAction = async (action: string, payload?: Record<string, any>) => {
    try {
      setSubmitting(true);
      const res = await fetch('/api/sevkiyat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, ...(payload || {}) }),
      });
      const json = await res.json();
      if (!res.ok || !json.success) {
        toast.error(json.error || 'İşlem başarısız oldu.');
        return null;
      }
      toast.success(json.message || 'İşlem tamamlandı.');
      await fetchOverview(true);
      return json;
    } catch {
      toast.error('Sunucu bağlantısı sırasında hata oluştu.');
      return null;
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <StaggerContainer className="space-y-6">
      {/* Üst Başlık */}
      <StaggerItem className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div>
          <h1 className="text-2xl lg:text-3xl font-semibold text-white tracking-tight flex items-center gap-2.5">
            <Truck className="w-7 h-7 text-[#34D399]" />
            Sevkiyat &amp; Çok Duraklı Rota Planlama
          </h1>
          <p className="text-sm text-zinc-400 mt-1">
            Kapasite &amp; zaman penceresi kısıtlı sefer planlama, CVRPTW optimizasyon, e-İrsaliye ve teslimat kanıtı (e-POD)
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Link
            href="/dashboard/sevkiyat/surucu"
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full bg-[#34D399] hover:bg-[#10B981] text-[#061811] text-xs font-semibold transition"
          >
            <Smartphone className="w-4 h-4" /> Sürücü Mobil &amp; e-POD
          </Link>
          <Link
            href="/dashboard/filo"
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-full bg-white/[0.06] hover:bg-white/[0.12] border border-white/[0.1] text-xs text-zinc-200 transition"
          >
            Filo &amp; Araçlar
          </Link>
          <Link
            href="/dashboard/cargo"
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-full bg-white/[0.06] hover:bg-white/[0.12] border border-white/[0.1] text-xs text-zinc-200 transition"
          >
            Dış Kargo &amp; Kurye
          </Link>
          <button
            type="button"
            onClick={() => fetchOverview(false)}
            disabled={refreshing}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-full bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.08] text-xs text-zinc-300 transition"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin' : ''}`} /> Yenile
          </button>
        </div>
      </StaggerItem>

      {/* Üst KPI Kartları (Gerçek Kayıtlardan Hesaplanır) */}
      <StaggerItem className="grid grid-cols-2 lg:grid-cols-6 gap-3">
        <div className="p-4 rounded-[20px] bg-[#111513]/90 border border-white/[0.06]">
          <div className="text-[11px] text-zinc-400 uppercase tracking-wider">Aktif / Toplam Sefer</div>
          <div className="text-2xl font-bold text-white mt-1">
            {kpis.activeTrips} <span className="text-sm font-normal text-zinc-400">/ {kpis.totalTrips}</span>
          </div>
          <div className="text-[11px] text-zinc-500 mt-0.5">{kpis.totalStops} toplam durak</div>
        </div>
        <div className="p-4 rounded-[20px] bg-[#111513]/90 border border-white/[0.06]">
          <div className="text-[11px] text-zinc-400 uppercase tracking-wider">Zamanında Teslimat</div>
          <div className="text-2xl font-bold text-[#34D399] mt-1">
            %<AnimatedNumber value={kpis.onTimeDeliveryRatePct} />
          </div>
          <div className="text-[11px] text-zinc-500 mt-0.5">Teslim edilemeyen: %{kpis.failedDeliveryRatePct}</div>
        </div>
        <div className="p-4 rounded-[20px] bg-[#111513]/90 border border-white/[0.06]">
          <div className="text-[11px] text-zinc-400 uppercase tracking-wider">Araç Doluluk</div>
          <div className="text-2xl font-bold text-white mt-1">
            %<AnimatedNumber value={kpis.avgCapacityLoadPct} />
          </div>
          <div className="text-[11px] text-zinc-500 mt-0.5">Durak/araç/gün: {kpis.avgStopsPerVehicleDay}</div>
        </div>
        <div className="p-4 rounded-[20px] bg-[#111513]/90 border border-white/[0.06]">
          <div className="text-[11px] text-zinc-400 uppercase tracking-wider">Planlanan / Gerçek Km</div>
          <div className="text-2xl font-bold text-white mt-1">{kpis.totalPlannedDistanceKm} km</div>
          <div className="text-[11px] text-zinc-500 mt-0.5">Sapma: %{kpis.distanceVariancePct}</div>
        </div>
        <div className="p-4 rounded-[20px] bg-[#111513]/90 border border-white/[0.06]">
          <div className="text-[11px] text-zinc-400 uppercase tracking-wider">Rota Tasarrufu</div>
          <div className="text-2xl font-bold text-[#34D399] mt-1">{kpis.optimizationSavedKm} km</div>
          <div className="text-[11px] text-zinc-500 mt-0.5">Ham rotaya göre %{kpis.optimizationSavedPct}</div>
        </div>
        <div className="p-4 rounded-[20px] bg-[#111513]/90 border border-white/[0.06]">
          <div className="text-[11px] text-zinc-400 uppercase tracking-wider">E-İrsaliye &amp; e-POD</div>
          <div className="text-2xl font-bold text-white mt-1">{kpis.eWaybillIssuedTrips} / {kpis.podCapturedStops}</div>
          <div className="text-[11px] text-zinc-500 mt-0.5">Sefer irsaliyesi / kanıtlı durak</div>
        </div>
      </StaggerItem>

      {/* Sekme Çubuğu */}
      <StaggerItem className="inline-flex flex-wrap gap-1 bg-[#111513] p-1 rounded-full border border-white/[0.06]">
        <button
          type="button"
          onClick={() => setActiveTab('planning')}
          className={`px-4 py-2 rounded-full text-xs font-medium inline-flex items-center gap-1.5 transition ${
            activeTab === 'planning'
              ? 'bg-[#34D399] text-[#061811] font-semibold'
              : 'text-zinc-400 hover:text-white'
          }`}
        >
          <Truck className="w-3.5 h-3.5" /> Sefer Planlama, Rota &amp; Harita
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('pods')}
          className={`px-4 py-2 rounded-full text-xs font-medium inline-flex items-center gap-1.5 transition ${
            activeTab === 'pods'
              ? 'bg-[#34D399] text-[#061811] font-semibold'
              : 'text-zinc-400 hover:text-white'
          }`}
        >
          <FileCheck2 className="w-3.5 h-3.5" /> Teslimat Kanıtları (e-POD) &amp; Takip
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('analytics')}
          className={`px-4 py-2 rounded-full text-xs font-medium inline-flex items-center gap-1.5 transition ${
            activeTab === 'analytics'
              ? 'bg-[#34D399] text-[#061811] font-semibold'
              : 'text-zinc-400 hover:text-white'
          }`}
        >
          <BarChart3 className="w-3.5 h-3.5" /> Göstergeler, İş Geçmişi &amp; Adaptörler
        </button>
      </StaggerItem>

      {/* İçerik */}
      {loading ? (
        <div className="p-12 rounded-[20px] bg-[#111513]/90 border border-white/[0.06] text-center text-sm text-zinc-400">
          Sevkiyat verileri yükleniyor...
        </div>
      ) : activeTab === 'planning' ? (
        <DispatchPlanningAndTripsTab
          readyPool={readyPool}
          trips={trips}
          vehicles={vehicles}
          drivers={drivers}
          warehouses={warehouses}
          mapConfig={mapConfig}
          preselectedSourceKey={preselectedSourceKey}
          preselectedTripId={preselectedTripId}
          onAction={handleAction}
          submitting={submitting}
        />
      ) : activeTab === 'pods' ? (
        <DispatchPodsAndAnalyticsTab
          mode="pods"
          trips={trips}
          optJobs={optJobs}
          kpis={kpis}
          adapterStatus={adapterStatus}
          onAction={handleAction}
        />
      ) : (
        <DispatchPodsAndAnalyticsTab
          mode="analytics"
          trips={trips}
          optJobs={optJobs}
          kpis={kpis}
          adapterStatus={adapterStatus}
          onAction={handleAction}
        />
      )}
    </StaggerContainer>
  );
}
