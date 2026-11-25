'use client';

import React, { useCallback, useEffect, useState } from 'react';
import {
  Activity,
  AlertTriangle,
  BarChart3,
  Compass,
  CreditCard,
  FileCheck2,
  RefreshCw,
  Settings,
  Truck,
  Users,
  Webhook,
} from 'lucide-react';
import { toast } from 'sonner';
import { FleetLiveMap } from './components/FleetLiveMap';
import {
  FleetDocsAndPenaltiesTab,
  FleetDriversKvkkTab,
  FleetVehiclesTab,
} from './components/FleetVehiclesAndDriversTabs';
import {
  FleetFuelTab,
  FleetMaintenanceTab,
} from './components/FleetMaintenanceAndFuelTabs';
import {
  FleetTelematicsTab,
  FleetTcoAndEfficiencyTab,
} from './components/FleetTcoAndTelematicsTabs';

type FiloTabId =
  | 'map'
  | 'vehicles'
  | 'drivers'
  | 'docs'
  | 'maintenance'
  | 'fuel'
  | 'tco'
  | 'telematics';

export default function FleetDashboardPage() {
  const [activeTab, setActiveTab] = useState<FiloTabId>('map');
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [revealKvkk, setRevealKvkk] = useState<boolean>(false);
  const [tcoMonth, setTcoMonth] = useState<string>('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const loadSnapshot = useCallback(
    async (opts?: { reveal?: boolean; month?: string }) => {
      setLoading(true);
      setErrorMsg(null);
      try {
        const useReveal = opts?.reveal ?? revealKvkk;
        const useMonth = opts?.month !== undefined ? opts.month : tcoMonth;
        const params = new URLSearchParams({ section: 'overview' });
        if (useReveal) params.set('revealKvkk', 'true');
        if (useMonth) params.set('month', useMonth);

        const res = await fetch(`/api/filo?${params.toString()}`, { cache: 'no-store' });
        const json = await res.json();
        if (!res.ok || !json.success) {
          throw new Error(json.error || 'Filo verileri yüklenemedi.');
        }
        setData(json);
      } catch (err: any) {
        setErrorMsg(err.message);
        toast.error(err.message);
      } finally {
        setLoading(false);
      }
    },
    [revealKvkk, tcoMonth]
  );

  useEffect(() => {
    loadSnapshot();
  }, [loadSnapshot]);

  const vehicles = data?.vehicles || [];
  const drivers = data?.drivers || [];
  const documents = data?.documents || [];
  const penalties = data?.penalties || [];
  const expiryAlerts = data?.expiryAlerts || {};
  const maintenance = data?.maintenance || {};
  const fuel = data?.fuel || {};
  const tcoReport = data?.tcoReport || {};
  const telematics = data?.telematics || {};
  const mapLive = data?.mapLive || { vehicles: [], mapConfig: { tileUrl: null, attribution: '' } };
  const isDemoMode = Boolean(data?.featureFlags?.logisticsDemoMode);

  const inTransitCount = vehicles.filter((v: any) => v.status === 'IN_TRANSIT').length;
  const activeCount = vehicles.filter((v: any) => v.status === 'ACTIVE').length;
  const alertTotal =
    Number(expiryAlerts?.totalAlerts || 0) + Number(fuel?.anomalyLogs?.length || 0);

  return (
    <div className="min-h-screen bg-[#F6F8FB] text-[var(--text)] p-4 md:p-6 space-y-5">
      {/* Üst Başlık */}
      <div className="bg-[white]/90 backdrop-blur-xl border border-[--line] rounded-[20px] p-5 flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-2xl bg-[--brand]/15 border border-[--brand-line] flex items-center justify-center">
              <Truck className="w-5 h-5 text-[#1267E6]" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-[var(--text)]">Filo, Araç &amp; Sürücü Yönetimi</h1>
              <p className="text-xs text-[var(--text-muted)]">
                Araç envanteri, KVKK korumalı sürücü kadrosu, periyodik bakım/lastik, yakıt mutabakatı, TCO, canlı harita ve telematik merkezi
              </p>
            </div>
          </div>
        </div>

        <button
          type="button"
          onClick={() => loadSnapshot()}
          disabled={loading}
          className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full bg-[--muted-bg] hover:bg-white/[0.12] border border-[var(--line)] text-xs font-medium text-[var(--text)] cursor-pointer"
        >
          <RefreshCw className={`w-3.5 h-3.5 text-[#1267E6] ${loading ? 'animate-spin' : ''}`} />
          Verileri Güncelle
        </button>
      </div>

      {/* Üst Özet Kartları */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <div className="bg-[white]/90 border border-[--line] rounded-[20px] p-4">
          <div className="text-[11px] text-[var(--text-muted)]">Toplam Araç / Seferde</div>
          <div className="text-2xl font-bold text-[var(--text)] font-mono mt-1">
            {vehicles.length} <span className="text-sm text-sky-300">/ {inTransitCount} sefer</span>
          </div>
          <div className="text-[11px] text-[#1267E6] mt-0.5">{activeCount} araç göreve hazır</div>
        </div>

        <div className="bg-[white]/90 border border-[--line] rounded-[20px] p-4">
          <div className="text-[11px] text-[var(--text-muted)]">Şoför Kadrosu</div>
          <div className="text-2xl font-bold text-[var(--text)] font-mono mt-1">{drivers.length}</div>
          <div className="text-[11px] text-[var(--text-muted)] mt-0.5">KVKK yetkili maskeleme aktif</div>
        </div>

        <div className="bg-[white]/90 border border-[--line] rounded-[20px] p-4">
          <div className="text-[11px] text-[var(--text-muted)]">Vade &amp; Anormal Tüketim Uyarısı</div>
          <div className={`text-2xl font-bold font-mono mt-1 ${alertTotal > 0 ? 'text-[var(--bad)]' : 'text-[#1267E6]'}`}>
            {alertTotal}
          </div>
          <div className="text-[11px] text-[var(--text-muted)] mt-0.5">
            {expiryAlerts?.totalAlerts || 0} vade · {fuel?.anomalyLogs?.length || 0} yakıt anomalisi
          </div>
        </div>

        <div className="bg-[white]/90 border border-[--line] rounded-[20px] p-4">
          <div className="text-[11px] text-[var(--text-muted)]">Filo MTBF / Açık İş Emri</div>
          <div className="text-2xl font-bold text-[var(--text)] font-mono mt-1">
            {maintenance?.kpis?.mtbfHours ?? 0} sa <span className="text-sm text-[var(--warn)]">/ {maintenance?.kpis?.openWorkOrderCount ?? 0}</span>
          </div>
          <div className="text-[11px] text-[var(--text-muted)] mt-0.5">
            Ort. Onarım (MTTR): {maintenance?.kpis?.mttrMinutes ?? 0} dk
          </div>
        </div>

        <div className="bg-[white]/90 border border-[--line] rounded-[20px] p-4">
          <div className="text-[11px] text-[var(--text-muted)]">Km Başı Maliyet / Tahmini CO₂</div>
          <div className="text-2xl font-bold text-[#1267E6] font-mono mt-1">
            ₺{Number(tcoReport?.summary?.avgCostPerKmTry || 0).toLocaleString('tr-TR')}
          </div>
          <div className="text-[11px] text-[var(--warn)] mt-0.5">
            {Number(tcoReport?.summary?.totalEstimatedCo2Tonnes || 0).toFixed(2)} tCO₂e (tahmini)
          </div>
        </div>
      </div>

      {/* Ana Sekme Çubuğu */}
      <div className="bg-[white] p-1.5 rounded-2xl border border-[--line] flex flex-wrap gap-1.5">
        {[
          { id: 'map', label: 'Canlı Filo Haritası', icon: Compass },
          { id: 'vehicles', label: `Araçlar (${vehicles.length})`, icon: Truck },
          { id: 'drivers', label: `Şoförler & KVKK (${drivers.length})`, icon: Users },
          { id: 'docs', label: `Belgeler & Cezalar (${documents.length + penalties.length})`, icon: FileCheck2 },
          { id: 'maintenance', label: 'Bakım & Lastik', icon: Settings },
          { id: 'fuel', label: 'Yakıt & Mutabakat', icon: CreditCard },
          { id: 'tco', label: 'Maliyet (TCO) & CO₂', icon: BarChart3 },
          { id: 'telematics', label: 'Telematik Entegrasyonları', icon: Webhook },
        ].map((tab) => {
          const Icon = tab.icon;
          const active = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id as FiloTabId)}
              className={`inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-medium transition cursor-pointer ${ active ? 'bg-[#1267E6] text-[var(--text)] font-semibold' : 'text-[var(--text-muted)] hover:text-[var(--brand)] hover:bg-[--muted-bg]' }`}
            >
              <Icon className="w-3.5 h-3.5" />
              {tab.label}
            </button>
          );
        })}
      </div>

      {errorMsg && !data && (
        <div className="bg-[var(--bad-soft)] border border-[var(--bad-line)] rounded-2xl p-4 text-xs text-rose-200 flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 text-[var(--bad)]" />
          {errorMsg}
        </div>
      )}

      {loading && !data ? (
        <div className="bg-[white]/90 border border-[--line] rounded-[20px] p-12 text-center text-xs text-[var(--text-muted)] flex items-center justify-center gap-2">
          <Activity className="w-4 h-4 text-[#1267E6] animate-pulse" />
          Filo veritabanı yükleniyor...
        </div>
      ) : (
        <>
          {activeTab === 'map' && (
            <FleetLiveMap
              vehicles={mapLive.vehicles || []}
              mapConfig={mapLive.mapConfig || { tileUrl: null, hasExternalTileConfig: false, externalTileConfiguredButMissingKey: false, attribution: '' }}
              hoursWindow={mapLive.hoursWindow || 48}
              isDemoMode={isDemoMode}
              onRefresh={() => loadSnapshot()}
              loading={loading}
            />
          )}

          {activeTab === 'vehicles' && (
            <FleetVehiclesTab vehicles={vehicles} drivers={drivers} onRefresh={() => loadSnapshot()} />
          )}

          {activeTab === 'drivers' && (
            <FleetDriversKvkkTab
              drivers={drivers}
              canRevealKvkkPii={Boolean(data?.canRevealKvkkPii)}
              isKvkkRevealed={revealKvkk}
              onToggleRevealKvkk={() => {
                const next = !revealKvkk;
                setRevealKvkk(next);
                loadSnapshot({ reveal: next });
              }}
              onRefresh={() => loadSnapshot()}
            />
          )}

          {activeTab === 'docs' && (
            <FleetDocsAndPenaltiesTab
              vehicles={vehicles}
              drivers={drivers}
              documents={documents}
              penalties={penalties}
              expiryAlerts={expiryAlerts}
              onRefresh={() => loadSnapshot()}
            />
          )}

          {activeTab === 'maintenance' && (
            <FleetMaintenanceTab vehicles={vehicles} maintenance={maintenance} onRefresh={() => loadSnapshot()} />
          )}

          {activeTab === 'fuel' && (
            <FleetFuelTab vehicles={vehicles} fuel={fuel} onRefresh={() => loadSnapshot()} />
          )}

          {activeTab === 'tco' && (
            <FleetTcoAndEfficiencyTab
              tcoReport={tcoReport}
              onMonthChange={(m) => {
                setTcoMonth(m);
                loadSnapshot({ month: m });
              }}
              onRefresh={() => loadSnapshot()}
            />
          )}

          {activeTab === 'telematics' && (
            <FleetTelematicsTab vehicles={vehicles} telematics={telematics} isDemoMode={isDemoMode} onRefresh={() => loadSnapshot()} />
          )}
        </>
      )}
    </div>
  );
}
