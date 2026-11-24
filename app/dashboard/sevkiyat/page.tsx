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
    <StaggerContainer className="space-y-8">
      {/* Üst Başlık */}
      <StaggerItem className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-[--text] tracking-tight flex items-center gap-2.5">
            <Truck className="w-7 h-7 text-[--brand]" />
            Sevkiyat &amp; Çok Duraklı Rota Planlama
          </h1>
          <p className="text-sm text-[--text-muted] mt-1">
            Kapasite &amp; zaman penceresi kısıtlı sefer planlama, CVRPTW optimizasyon, e-İrsaliye ve teslimat kanıtı (e-POD)
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Link
            href="/dashboard/sevkiyat/surucu"
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full bg-gradient-to-r from-[--brand] to-[--blue] text-white text-xs font-semibold shadow-sm hover:opacity-95 transition"
          >
            <Smartphone className="w-4 h-4" /> Sürücü Mobil &amp; e-POD
          </Link>
          <Link
            href="/dashboard/filo"
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-full bg-white hover:bg-[--brand-soft] border border-[--line] text-xs text-[--text] transition"
          >
            Filo &amp; Araçlar
          </Link>
          <Link
            href="/dashboard/cargo"
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-full bg-white hover:bg-[--brand-soft] border border-[--line] text-xs text-[--text] transition"
          >
            Dış Kargo &amp; Kurye
          </Link>
          <button
            type="button"
            onClick={() => fetchOverview(false)}
            disabled={refreshing}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-full bg-white hover:bg-[--muted-bg] border border-[--line] text-xs text-[--text-2] transition"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin' : ''}`} /> Yenile
          </button>
        </div>
      </StaggerItem>

      {/* Kutusuz KPI Şeridi */}
      <StaggerItem className="grid grid-cols-2 lg:grid-cols-6 gap-6 pt-2 pb-4 border-b border-[--line]">
        <div>
          <div className="text-[11px] font-medium uppercase tracking-[0.12em] text-[--text-muted]">Aktif / Toplam Sefer</div>
          <div className="text-3xl font-light tracking-tight tabular-nums text-[--text] mt-1">
            {kpis.activeTrips} <span className="text-base font-normal text-[--text-muted]">/ {kpis.totalTrips}</span>
          </div>
          <div className="text-xs text-[--text-muted] mt-1">{kpis.totalStops} toplam durak</div>
        </div>
        <div>
          <div className="text-[11px] font-medium uppercase tracking-[0.12em] text-[--text-muted]">Zamanında Teslimat</div>
          <div className="text-3xl font-light tracking-tight tabular-nums text-[--ok] mt-1">
            %<AnimatedNumber value={kpis.onTimeDeliveryRatePct} />
          </div>
          <div className="text-xs text-[--text-muted] mt-1">Teslim edilemeyen: %{kpis.failedDeliveryRatePct}</div>
        </div>
        <div>
          <div className="text-[11px] font-medium uppercase tracking-[0.12em] text-[--text-muted]">Araç Doluluk</div>
          <div className="text-3xl font-light tracking-tight tabular-nums text-[--text] mt-1">
            %<AnimatedNumber value={kpis.avgCapacityLoadPct} />
          </div>
          <div className="text-xs text-[--text-muted] mt-1">Durak/araç/gün: {kpis.avgStopsPerVehicleDay}</div>
        </div>
        <div>
          <div className="text-[11px] font-medium uppercase tracking-[0.12em] text-[--text-muted]">Planlanan / Gerçek Km</div>
          <div className="text-3xl font-light tracking-tight tabular-nums text-[--text] mt-1">{kpis.totalPlannedDistanceKm} km</div>
          <div className="text-xs text-[--text-muted] mt-1">Sapma: %{kpis.distanceVariancePct}</div>
        </div>
        <div>
          <div className="text-[11px] font-medium uppercase tracking-[0.12em] text-[--text-muted]">Rota Tasarrufu</div>
          <div className="text-3xl font-light tracking-tight tabular-nums text-[--brand] mt-1">{kpis.optimizationSavedKm} km</div>
          <div className="text-xs text-[--text-muted] mt-1">Ham rotaya göre %{kpis.optimizationSavedPct}</div>
        </div>
        <div>
          <div className="text-[11px] font-medium uppercase tracking-[0.12em] text-[--text-muted]">E-İrsaliye &amp; e-POD</div>
          <div className="text-3xl font-light tracking-tight tabular-nums text-[--text] mt-1">{kpis.eWaybillIssuedTrips} / {kpis.podCapturedStops}</div>
          <div className="text-xs text-[--text-muted] mt-1">Sefer irsaliyesi / kanıtlı durak</div>
        </div>
      </StaggerItem>

      {/* Sekme Çubuğu */}
      <StaggerItem className="inline-flex flex-wrap gap-1 bg-[--muted-bg] p-1 rounded-full border border-[--line]">
        <button
          type="button"
          onClick={() => setActiveTab('planning')}
          className={`px-4 py-2 rounded-full text-xs font-medium inline-flex items-center gap-1.5 transition ${
            activeTab === 'planning'
              ? 'bg-white text-[--brand] font-semibold shadow-sm border border-[--line]'
              : 'text-[--text-muted] hover:text-[--text]'
          }`}
        >
          <Truck className="w-3.5 h-3.5" /> Sefer Planlama, Rota &amp; Harita
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('pods')}
          className={`px-4 py-2 rounded-full text-xs font-medium inline-flex items-center gap-1.5 transition ${
            activeTab === 'pods'
              ? 'bg-white text-[--brand] font-semibold shadow-sm border border-[--line]'
              : 'text-[--text-muted] hover:text-[--text]'
          }`}
        >
          <FileCheck2 className="w-3.5 h-3.5" /> Teslimat Kanıtları (e-POD) &amp; Takip
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('analytics')}
          className={`px-4 py-2 rounded-full text-xs font-medium inline-flex items-center gap-1.5 transition ${
            activeTab === 'analytics'
              ? 'bg-white text-[--brand] font-semibold shadow-sm border border-[--line]'
              : 'text-[--text-muted] hover:text-[--text]'
          }`}
        >
          <BarChart3 className="w-3.5 h-3.5" /> Göstergeler, İş Geçmişi &amp; Adaptörler
        </button>
      </StaggerItem>

      {/* İçerik */}
      {loading ? (
        <div className="p-12 rounded-[20px] bg-white/80 backdrop-blur-xl border border-[--line] text-center text-sm text-[--text-muted] shadow-sm">
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
