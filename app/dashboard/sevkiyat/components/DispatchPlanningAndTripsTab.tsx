'use client';

import React, { useMemo, useState } from 'react';
import Link from 'next/link';
import {
  AlertTriangle,
  Boxes,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Clock,
  Copy,
  ExternalLink,
  FileText,
  Plus,
  RefreshCw,
  Scale,
  Send,
  Truck,
  UserCheck,
  X,
  Zap,
} from 'lucide-react';
import { toast } from 'sonner';
import {
  DISPATCH_STOP_STATUS_BADGES,
  DISPATCH_STOP_STATUS_LABELS,
  DISPATCH_TRIP_STATUS_BADGES,
  DISPATCH_TRIP_STATUS_LABELS,
  evaluateDriverVehicleCompatibility,
  evaluateVehicleCapacityLoad,
  type DispatchStopStatus,
  type DispatchTripStatus,
} from '@/lib/logistics/dispatch/constantsAndHelpers';
import { DispatchRouteMap } from './DispatchRouteMap';

interface Props {
  readyPool: any[];
  trips: any[];
  vehicles: any[];
  drivers: any[];
  warehouses: any[];
  mapConfig: any;
  preselectedSourceKey?: string | null;
  preselectedTripId?: string | null;
  onAction: (action: string, payload?: Record<string, any>) => Promise<any>;
  submitting: boolean;
}

export function DispatchPlanningAndTripsTab({
  readyPool,
  trips,
  vehicles,
  drivers,
  warehouses,
  mapConfig,
  preselectedSourceKey,
  preselectedTripId,
  onAction,
  submitting,
}: Props) {
  const [selectedSourceKeys, setSelectedSourceKeys] = useState<string[]>(() =>
    preselectedSourceKey ? [preselectedSourceKey] : []
  );
  const [poolFilter, setPoolFilter] = useState<string>('ALL');
  const [originWarehouseId, setOriginWarehouseId] = useState<string>('wh-merkez-01');
  const [vehicleId, setVehicleId] = useState<string>(vehicles[0]?.id || '');
  const [driverId, setDriverId] = useState<string>(vehicles[0]?.assignedDriverId || drivers[0]?.id || '');
  const [tripTitle, setTripTitle] = useState<string>('');
  const [departureInput, setDepartureInput] = useState<string>(() => {
    const d = new Date();
    d.setHours(9, 0, 0, 0);
    return d.toISOString().slice(0, 16);
  });

  const [selectedTripId, setSelectedTripId] = useState<string>(
    preselectedTripId || trips[0]?.id || ''
  );
  const [dragStopId, setDragStopId] = useState<string | null>(null);
  const [optProgressMsg, setOptProgressMsg] = useState<string | null>(null);
  const [replanModalTrip, setReplanModalTrip] = useState<any | null>(null);
  const [replanReason, setReplanReason] = useState<string>('Araç arızası nedeniyle kalan durak devri');
  const [replanTargetVehicleId, setReplanTargetVehicleId] = useState<string>('');
  const [replanDelayMin, setReplanDelayMin] = useState<string>('35');

  const selectedTrip = useMemo(
    () => trips.find((t) => t.id === selectedTripId) || trips[0] || null,
    [trips, selectedTripId]
  );

  const filteredPool = useMemo(
    () =>
      readyPool.filter((item) =>
        poolFilter === 'ALL' ? true : item.sourceType === poolFilter
      ),
    [readyPool, poolFilter]
  );

  const selectedItems = useMemo(
    () =>
      readyPool.filter((item) =>
        selectedSourceKeys.includes(`${item.sourceType}:${item.sourceId}`)
      ),
    [readyPool, selectedSourceKeys]
  );

  const chosenVehicle = useMemo(
    () => vehicles.find((v) => v.id === vehicleId) || null,
    [vehicles, vehicleId]
  );
  const chosenDriver = useMemo(
    () => drivers.find((d) => d.id === driverId) || null,
    [drivers, driverId]
  );

  const liveCapacity = useMemo(
    () => evaluateVehicleCapacityLoad(chosenVehicle, selectedItems),
    [chosenVehicle, selectedItems]
  );
  const liveDriverCheck = useMemo(
    () => evaluateDriverVehicleCompatibility(chosenDriver, chosenVehicle, departureInput, 180),
    [chosenDriver, chosenVehicle, departureInput]
  );

  const toggleSourceKey = (key: string) => {
    setSelectedSourceKeys((prev) =>
      prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key]
    );
  };

  const handleVehicleChange = (nextVid: string) => {
    setVehicleId(nextVid);
    const v = vehicles.find((x) => x.id === nextVid);
    if (v?.assignedDriverId) setDriverId(v.assignedDriverId);
  };

  const handleCreateTrip = async () => {
    if (selectedItems.length === 0) {
      toast.error('Lütfen bekleyen sipariş havuzundan en az 1 kalem seçin.');
      return;
    }
    const res = await onAction('create_trip', {
      originWarehouseId,
      vehicleId: vehicleId || null,
      driverId: driverId || null,
      title: tripTitle || undefined,
      plannedDepartureAt: new Date(departureInput).toISOString(),
      stops: selectedItems,
      autoOptimize: true,
    });
    if (res?.trip?.id) {
      setSelectedTripId(res.trip.id);
      setSelectedSourceKeys([]);
      setTripTitle('');
    }
  };

  const handleAutoPlanBatch = async () => {
    const itemsToPlan = selectedItems.length > 0 ? selectedItems : filteredPool;
    if (itemsToPlan.length === 0) {
      toast.error('Otomatik planlama için hazır sipariş bulunmuyor.');
      return;
    }
    setOptProgressMsg('Aşama 1/3: Araç kapasite ve zaman penceresi gruplanıyor...');
    const res = await onAction('auto_plan_trips', {
      originWarehouseId,
      stopItems: itemsToPlan,
      plannedDepartureAt: new Date(departureInput).toISOString(),
      persistTrips: true,
    });
    setOptProgressMsg(null);
    if (res?.createdTrips?.[0]?.id) {
      setSelectedTripId(res.createdTrips[0].id);
      setSelectedSourceKeys([]);
    }
  };

  const handleOptimizeTrip = async (tripId: string) => {
    setOptProgressMsg('Aşama 1/3: Mesafe matrisi hazırlanıyor...');
    setTimeout(() => setOptProgressMsg('Aşama 2/3: Hızlı zaman pencereli tur oluşturuluyor...'), 150);
    await onAction('optimize_trip', { tripId, timeBudgetMs: 1500 });
    setOptProgressMsg(null);
  };

  const handleReorderStops = async (trip: any, newOrderedIds: string[]) => {
    await onAction('reorder_stops', {
      tripId: trip.id,
      orderedStopIds: newOrderedIds,
    });
  };

  const moveStopStep = async (trip: any, idx: number, dir: -1 | 1) => {
    const ids = (trip.stops || []).map((s: any) => s.id);
    const target = idx + dir;
    if (target < 0 || target >= ids.length) return;
    const copy = [...ids];
    const [picked] = copy.splice(idx, 1);
    copy.splice(target, 0, picked);
    await handleReorderStops(trip, copy);
  };

  const handleCopyTracking = (token: string) => {
    const url = `${window.location.origin}/takip/${token}`;
    navigator.clipboard?.writeText(url).catch(() => null);
    toast.success('Müşteri takip linki panoya kopyalandı.');
  };

  return (
    <div className="space-y-6">
      {/* BÖLÜM A: SEFER & YÜK PLANLAMA */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-5">
        {/* Sol: Hazır Sipariş Havuzu */}
        <div className="xl:col-span-7 bg-[#111513]/90 border border-white/[0.06] rounded-[20px] p-5 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h3 className="text-base font-semibold text-white flex items-center gap-2">
                <Boxes className="w-4 h-4 text-[#34D399]" />
                Sevk Bekleyen Sipariş & Dalga Havuzu ({readyPool.length})
              </h3>
              <p className="text-xs text-zinc-400">
                Omnichannel, Şube Siparişleri ve WMS PACK-STAGING-01 çıkışlarını araca gruplayın
              </p>
            </div>
            <select
              value={poolFilter}
              onChange={(e) => setPoolFilter(e.target.value)}
              className="bg-[#0B0F0D] border border-white/[0.1] text-zinc-200 text-xs rounded-xl px-3 py-1.5"
            >
              <option value="ALL">Tüm Kaynaklar</option>
              <option value="OMNICHANNEL_ORDER">Omnichannel Siparişler</option>
              <option value="ERP_ORDER">Şube / ERP Siparişleri</option>
              <option value="WMS_TRANSFER">WMS Depo Transferleri</option>
              <option value="WMS_WAVE">WMS Toplama Dalgaları</option>
            </select>
          </div>

          {filteredPool.length === 0 ? (
            <div className="py-10 text-center text-xs text-zinc-500 border border-dashed border-white/[0.08] rounded-2xl">
              Şu anda sefere atanmayı bekleyen açık sipariş bulunmuyor (tümü aktif seferlere atanmış).
            </div>
          ) : (
            <div className="space-y-2 max-h-[340px] overflow-y-auto pr-1">
              {filteredPool.map((item) => {
                const key = `${item.sourceType}:${item.sourceId}`;
                const checked = selectedSourceKeys.includes(key);
                return (
                  <label
                    key={key}
                    className={`flex items-start gap-3 p-3 rounded-xl border cursor-pointer transition ${
                      checked
                        ? 'bg-emerald-500/[0.08] border-[#34D399]/50'
                        : 'bg-white/[0.02] border-white/[0.06] hover:border-white/[0.15]'
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() => toggleSourceKey(key)}
                      className="mt-1 accent-[#34D399]"
                    />
                    <div className="flex-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-xs font-semibold text-white">{item.sourceRefNo}</span>
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-white/[0.06] text-zinc-300">
                          {item.channelCode}
                        </span>
                        {item.requiresColdChain && (
                          <span className="text-[10px] px-2 py-0.5 rounded-full bg-sky-500/15 text-sky-300 border border-sky-500/25">
                            +2/+6°C Frigo
                          </span>
                        )}
                        <span className="text-[10px] text-zinc-400 ml-auto">
                          Pencere: {item.timeWindowStart}–{item.timeWindowEnd}
                        </span>
                      </div>
                      <div className="text-xs text-zinc-300 mt-0.5 truncate">
                        {item.customerName} — <span className="text-zinc-400">{item.cityDistrict}</span>
                      </div>
                      <div className="text-[11px] text-zinc-500 flex flex-wrap gap-3 mt-1">
                        <span>{item.weightKg} kg</span>
                        <span>{item.volumeM3} m³</span>
                        <span>{item.palletCount} palet</span>
                      </div>
                    </div>
                  </label>
                );
              })}
            </div>
          )}
        </div>

        {/* Sağ: Araç / Şoför Atama, Kapasite Göstergesi & Otomatik Öneri */}
        <div className="xl:col-span-5 bg-[#111513]/90 border border-white/[0.06] rounded-[20px] p-5 space-y-4">
          <h3 className="text-base font-semibold text-white flex items-center gap-2">
            <Truck className="w-4 h-4 text-[#34D399]" />
            Sefer Oluştur & Kapasite / Vardiya Kontrolü
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
            <div>
              <label className="text-zinc-400 block mb-1">Çıkış Deposu</label>
              <select
                value={originWarehouseId}
                onChange={(e) => setOriginWarehouseId(e.target.value)}
                className="w-full bg-[#0B0F0D] border border-white/[0.1] text-white rounded-xl px-3 py-2"
              >
                {warehouses.map((w) => (
                  <option key={w.id} value={w.id}>
                    {w.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-zinc-400 block mb-1">Planlanan Hareket</label>
              <input
                type="datetime-local"
                value={departureInput}
                onChange={(e) => setDepartureInput(e.target.value)}
                className="w-full bg-[#0B0F0D] border border-white/[0.1] text-white rounded-xl px-3 py-2"
              />
            </div>
            <div>
              <label className="text-zinc-400 block mb-1">Araç Seçimi</label>
              <select
                value={vehicleId}
                onChange={(e) => handleVehicleChange(e.target.value)}
                className="w-full bg-[#0B0F0D] border border-white/[0.1] text-white rounded-xl px-3 py-2"
              >
                {vehicles.map((v) => (
                  <option key={v.id} value={v.id}>
                    {v.plate} — {v.capacityKg}kg / {v.capacityM3}m³ {v.isRefrigerated ? '(Frigo)' : ''}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-zinc-400 block mb-1">Şoför (Vardiya & Ehliyet)</label>
              <select
                value={driverId}
                onChange={(e) => setDriverId(e.target.value)}
                className="w-full bg-[#0B0F0D] border border-white/[0.1] text-white rounded-xl px-3 py-2"
              >
                <option value="">Şoför Seçin</option>
                {drivers.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.fullName} ({d.licenseClass} · {d.shiftStart}-{d.shiftEnd})
                  </option>
                ))}
              </select>
            </div>
          </div>

          <input
            type="text"
            placeholder="Sefer başlığı (isteğe bağlı, ör. Anadolu Yakası Sabah Dağıtımı)"
            value={tripTitle}
            onChange={(e) => setTripTitle(e.target.value)}
            className="w-full bg-[#0B0F0D] border border-white/[0.1] text-white text-xs rounded-xl px-3 py-2"
          />

          {/* Canlı Kapasite Çubuğu */}
          <div className="bg-white/[0.03] border border-white/[0.06] rounded-xl p-3 space-y-2 text-xs">
            <div className="flex items-center justify-between">
              <span className="text-zinc-400 flex items-center gap-1.5">
                <Scale className="w-3.5 h-3.5 text-[#34D399]" />
                Seçili Yük ({selectedItems.length} durak):
              </span>
              <span className={liveCapacity.isValid ? 'text-[#34D399] font-semibold' : 'text-rose-400 font-semibold'}>
                {liveCapacity.totalWeightKg} kg · {liveCapacity.totalVolumeM3} m³ · {liveCapacity.totalPallets} palet (%{liveCapacity.capacityLoadPct})
              </span>
            </div>
            <div className="h-2 bg-white/[0.06] rounded-full overflow-hidden">
              <div
                className={`h-full transition-all ${liveCapacity.isValid ? 'bg-[#34D399]' : 'bg-rose-500'}`}
                style={{ width: `${Math.min(100, liveCapacity.capacityLoadPct)}%` }}
              />
            </div>
            {(!liveCapacity.isValid || !liveDriverCheck.compatible) && (
              <div className="text-[11px] text-rose-300 space-y-0.5 pt-1">
                {liveCapacity.warnings.map((w, i) => (
                  <div key={i} className="flex items-center gap-1">
                    <AlertTriangle className="w-3.5 h-3.5 shrink-0" /> {w}
                  </div>
                ))}
                {liveDriverCheck.reasons.map((r, i) => (
                  <div key={`drv-${i}`} className="flex items-center gap-1 text-amber-300">
                    <UserCheck className="w-3.5 h-3.5 shrink-0" /> {r}
                  </div>
                ))}
              </div>
            )}
          </div>

          {optProgressMsg && (
            <div className="text-xs text-[#34D399] bg-emerald-500/10 border border-emerald-500/25 rounded-xl px-3 py-2 flex items-center gap-2">
              <RefreshCw className="w-3.5 h-3.5 animate-spin" /> {optProgressMsg}
            </div>
          )}

          <div className="flex flex-wrap gap-2 pt-1">
            <button
              type="button"
              disabled={submitting || selectedItems.length === 0 || !liveCapacity.isValid}
              onClick={handleCreateTrip}
              className="flex-1 inline-flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-full bg-[#34D399] hover:bg-[#10B981] text-[#061811] text-xs font-semibold transition disabled:opacity-50"
            >
              <Plus className="w-4 h-4" /> Seçilenlerden Sefer Oluştur & Optimize Et
            </button>
            <button
              type="button"
              disabled={submitting || readyPool.length === 0}
              onClick={handleAutoPlanBatch}
              className="inline-flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-full bg-white/[0.06] hover:bg-white/[0.12] border border-white/[0.1] text-white text-xs font-medium transition disabled:opacity-50"
            >
              <Zap className="w-4 h-4 text-amber-300" /> Otomatik Öner (Çoklu Araç)
            </button>
          </div>
        </div>
      </div>

      {/* BÖLÜM B & C: AKTİF SEFERLER, SÜRÜKLE-BIRAK DURAK SIRALAMA, HARİTA & E-İRSALİYE */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-5">
        {/* Sefer Listesi */}
        <div className="xl:col-span-4 bg-[#111513]/90 border border-white/[0.06] rounded-[20px] p-4 space-y-3">
          <h3 className="text-sm font-semibold text-white">Planlı & Aktif Seferler ({trips.length})</h3>
          <div className="space-y-2 max-h-[540px] overflow-y-auto pr-1">
            {trips.map((t) => {
              const active = selectedTrip?.id === t.id;
              return (
                <button
                  type="button"
                  key={t.id}
                  onClick={() => setSelectedTripId(t.id)}
                  className={`w-full text-left p-3 rounded-xl border transition space-y-1.5 ${
                    active
                      ? 'bg-emerald-500/[0.08] border-[#34D399]/60'
                      : 'bg-white/[0.02] border-white/[0.06] hover:border-white/[0.15]'
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-semibold text-white text-xs">{t.tripNumber}</span>
                    <span
                      className={`text-[10px] px-2 py-0.5 rounded-full border ${
                        DISPATCH_TRIP_STATUS_BADGES[t.status as DispatchTripStatus] ||
                        'bg-white/[0.05] text-zinc-300'
                      }`}
                    >
                      {DISPATCH_TRIP_STATUS_LABELS[t.status as DispatchTripStatus] || t.status}
                    </span>
                  </div>
                  <div className="text-xs text-zinc-300 truncate">{t.title}</div>
                  <div className="flex flex-wrap items-center justify-between text-[11px] text-zinc-400">
                    <span>
                      {t.vehiclePlate || 'Araçsız'} · {t.driverName || 'Şoförsüz'}
                    </span>
                    <span>
                      {(t.stops || []).length} durak · {t.plannedDistanceKm} km
                    </span>
                  </div>
                  {t.eWaybillNo && (
                    <div className="text-[10px] text-[#34D399] font-mono">
                      e-İrsaliye: {t.eWaybillNo}
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Seçili Sefer Detayı, Harita & Sürükle-Bırak Sıralama */}
        <div className="xl:col-span-8 space-y-4">
          {selectedTrip ? (
            <>
              <DispatchRouteMap
                origin={{
                  label: selectedTrip.originLabel,
                  lat: Number(selectedTrip.originLat),
                  lng: Number(selectedTrip.originLng),
                }}
                stops={selectedTrip.stops || []}
                polyline={selectedTrip.polyline || []}
                mapConfig={mapConfig}
                tripNumber={selectedTrip.tripNumber}
              />

              <div className="bg-[#111513]/90 border border-white/[0.06] rounded-[20px] p-5 space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-white/[0.06]">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="text-base font-semibold text-white">
                        {selectedTrip.tripNumber} — {selectedTrip.title}
                      </h3>
                      {selectedTrip.baselineUnoptimizedDistanceKm > selectedTrip.plannedDistanceKm && (
                        <span className="text-[11px] px-2.5 py-0.5 rounded-full bg-emerald-500/15 text-[#34D399] border border-emerald-500/30">
                          Optimizasyon: {selectedTrip.baselineUnoptimizedDistanceKm} km →{' '}
                          {selectedTrip.plannedDistanceKm} km
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-zinc-400 mt-1">
                      Araç: <strong className="text-zinc-200">{selectedTrip.vehiclePlate || '-'}</strong> ·
                      Şoför: <strong className="text-zinc-200">{selectedTrip.driverName || '-'}</strong> ·
                      Doluluk: <strong className="text-zinc-200">%{selectedTrip.capacityLoadPct}</strong> ·
                      Plan Km: <strong className="text-zinc-200">{selectedTrip.plannedDistanceKm} km</strong>
                      {selectedTrip.actualDistanceKm > 0 && (
                        <>
                          {' '}
                          · Gerçek: <strong className="text-white">{selectedTrip.actualDistanceKm} km</strong>
                        </>
                      )}
                    </p>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      disabled={submitting || selectedTrip.status === 'TAMAMLANDI'}
                      onClick={() => handleOptimizeTrip(selectedTrip.id)}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/[0.06] hover:bg-white/[0.12] border border-white/[0.1] text-xs text-white transition disabled:opacity-40"
                    >
                      <Zap className="w-3.5 h-3.5 text-[#34D399]" /> Yeniden Optimize Et
                    </button>

                    {!selectedTrip.eWaybillNo ? (
                      <button
                        type="button"
                        disabled={submitting}
                        onClick={() =>
                          onAction('approve_and_issue_ewaybill', { tripId: selectedTrip.id })
                        }
                        className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-[#34D399] hover:bg-[#10B981] text-[#061811] text-xs font-semibold transition disabled:opacity-50"
                      >
                        <FileText className="w-3.5 h-3.5" /> Seferi Onayla & E-İrsaliye Kes
                      </button>
                    ) : (
                      <Link
                        href="/dashboard/omnichannel?tab=edoc"
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-xs text-[#34D399]"
                      >
                        <CheckCircle2 className="w-3.5 h-3.5" /> {selectedTrip.eWaybillNo}
                      </Link>
                    )}

                    {selectedTrip.status !== 'TAMAMLANDI' && selectedTrip.status !== 'IPTAL' && (
                      <button
                        type="button"
                        onClick={() => {
                          setReplanModalTrip(selectedTrip);
                          setReplanTargetVehicleId('');
                        }}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-amber-500/15 hover:bg-amber-500/25 border border-amber-500/30 text-xs text-amber-200 transition"
                      >
                        <Send className="w-3.5 h-3.5" /> Dinamik Yeniden Planla
                      </button>
                    )}
                  </div>
                </div>

                <div className="text-[11px] text-zinc-400">
                  Sürükle-bırak yaparak veya ok düğmeleriyle durak sırasını değiştirdiğinizde mesafe ve ETA otomatik yeniden hesaplanır.
                </div>

                {/* Sürükle-Bırak Durak Listesi */}
                <div className="space-y-2">
                  {(selectedTrip.stops || []).map((stop: any, idx: number) => {
                    const isLate = Number(stop.delayMinutes || 0) > 10;
                    return (
                      <div
                        key={stop.id}
                        draggable={selectedTrip.status !== 'TAMAMLANDI'}
                        onDragStart={() => setDragStopId(stop.id)}
                        onDragOver={(e) => e.preventDefault()}
                        onDrop={async () => {
                          if (!dragStopId || dragStopId === stop.id) return;
                          const ids = (selectedTrip.stops || []).map((s: any) => s.id);
                          const fromIdx = ids.indexOf(dragStopId);
                          const toIdx = ids.indexOf(stop.id);
                          if (fromIdx < 0 || toIdx < 0) return;
                          const copy = [...ids];
                          const [moved] = copy.splice(fromIdx, 1);
                          copy.splice(toIdx, 0, moved);
                          setDragStopId(null);
                          await handleReorderStops(selectedTrip, copy);
                        }}
                        className={`p-3 rounded-xl border flex flex-col sm:flex-row sm:items-center justify-between gap-3 transition ${
                          dragStopId === stop.id
                            ? 'opacity-60 border-[#34D399]'
                            : 'bg-white/[0.02] border-white/[0.06] hover:border-white/[0.16]'
                        }`}
                      >
                        <div className="flex items-start gap-3 min-w-0">
                          <div className="w-7 h-7 rounded-full bg-[#34D399]/15 border border-[#34D399]/35 text-[#34D399] font-bold text-xs flex items-center justify-center shrink-0">
                            {stop.sequenceNo}
                          </div>
                          <div className="min-w-0">
                            <div className="flex flex-wrap items-center gap-2">
                              <span className="font-semibold text-white text-xs">
                                {stop.customerName}
                              </span>
                              <span className="text-[10px] font-mono text-zinc-400">
                                {stop.sourceRefNo || stop.sourceType}
                              </span>
                              <span
                                className={`text-[10px] px-2 py-0.5 rounded-full border ${
                                  DISPATCH_STOP_STATUS_BADGES[stop.status as DispatchStopStatus] ||
                                  'bg-white/[0.05] text-zinc-300'
                                }`}
                              >
                                {DISPATCH_STOP_STATUS_LABELS[stop.status as DispatchStopStatus] ||
                                  stop.status}
                              </span>
                              {isLate && (
                                <span className="text-[10px] px-2 py-0.5 rounded-full bg-rose-500/15 text-rose-300 border border-rose-500/30">
                                  +{stop.delayMinutes} dk gecikme
                                </span>
                              )}
                            </div>
                            <p className="text-[11px] text-zinc-400 mt-0.5 truncate">
                              {stop.addressText} ({stop.cityDistrict})
                            </p>
                            <div className="flex flex-wrap items-center gap-3 text-[11px] text-zinc-500 mt-1">
                              <span className="inline-flex items-center gap-1">
                                <Clock className="w-3 h-3" />
                                Plan ETA:{' '}
                                {stop.plannedEtaAt
                                  ? new Date(stop.plannedEtaAt).toLocaleTimeString('tr-TR', {
                                      hour: '2-digit',
                                      minute: '2-digit',
                                    })
                                  : '-'}
                                {stop.actualArrivalAt && (
                                  <span className="text-zinc-300 ml-1">
                                    (Gerçek:{' '}
                                    {new Date(stop.actualArrivalAt).toLocaleTimeString('tr-TR', {
                                      hour: '2-digit',
                                      minute: '2-digit',
                                    })}
                                    )
                                  </span>
                                )}
                              </span>
                              <span>Pencere: {stop.timeWindowStart}–{stop.timeWindowEnd}</span>
                              <span>Mesafe: +{stop.legDistanceKm} km ({stop.cumulativeDistanceKm} km top.)</span>
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center gap-1.5 shrink-0">
                          <button
                            type="button"
                            onClick={() => handleCopyTracking(stop.trackingToken)}
                            className="p-1.5 rounded-lg bg-white/[0.04] hover:bg-white/[0.1] text-zinc-300 text-xs"
                            title="Müşteri Takip Linkini Kopyala"
                          >
                            <Copy className="w-3.5 h-3.5" />
                          </button>
                          <Link
                            href={`/takip/${stop.trackingToken}`}
                            target="_blank"
                            className="p-1.5 rounded-lg bg-white/[0.04] hover:bg-white/[0.1] text-[#34D399] text-xs"
                            title="Müşteri Takip Ekranını Aç"
                          >
                            <ExternalLink className="w-3.5 h-3.5" />
                          </Link>
                          <button
                            type="button"
                            disabled={idx === 0 || submitting}
                            onClick={() => moveStopStep(selectedTrip, idx, -1)}
                            className="p-1.5 rounded-lg bg-white/[0.04] hover:bg-white/[0.1] text-zinc-300 disabled:opacity-30"
                            title="Yukarı Taşı"
                          >
                            <ChevronUp className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            disabled={idx === (selectedTrip.stops?.length || 1) - 1 || submitting}
                            onClick={() => moveStopStep(selectedTrip, idx, 1)}
                            className="p-1.5 rounded-lg bg-white/[0.04] hover:bg-white/[0.1] text-zinc-300 disabled:opacity-30"
                            title="Aşağı Taşı"
                          >
                            <ChevronDown className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </>
          ) : (
            <div className="bg-[#111513]/90 border border-white/[0.06] rounded-[20px] p-12 text-center text-sm text-zinc-400">
              İncelemek için soldan bir sefer seçin veya yukarıdaki havuzdan yeni sefer oluşturun.
            </div>
          )}
        </div>
      </div>

      {/* Dinamik Yeniden Planlama Modalı */}
      {replanModalTrip && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-md p-4">
          <div className="bg-[#111513] border border-white/[0.08] rounded-[20px] w-full max-w-md p-6 space-y-4">
            <div className="flex items-start justify-between">
              <div>
                <h3 className="text-base font-semibold text-white">
                  Dinamik Yeniden Planlama — {replanModalTrip.tripNumber}
                </h3>
                <p className="text-xs text-zinc-400 mt-1">
                  Teslim edilmemiş durakları başka bir araca devredin veya gecikmeye göre yeniden optimize edin.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setReplanModalTrip(null)}
                className="text-zinc-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="text-zinc-400 block mb-1">Yeniden Planlama Nedeni</label>
                <input
                  type="text"
                  value={replanReason}
                  onChange={(e) => setReplanReason(e.target.value)}
                  className="w-full bg-[#0B0F0D] border border-white/[0.1] text-white rounded-xl px-3 py-2"
                />
              </div>
              <div>
                <label className="text-zinc-400 block mb-1">
                  Yedek Araç (Boş bırakılırsa mevcut araçta gecikme yeniden sıralanır)
                </label>
                <select
                  value={replanTargetVehicleId}
                  onChange={(e) => setReplanTargetVehicleId(e.target.value)}
                  className="w-full bg-[#0B0F0D] border border-white/[0.1] text-white rounded-xl px-3 py-2"
                >
                  <option value="">Aynı Araçta ETA & Sıra Güncelle</option>
                  {vehicles
                    .filter((v) => v.id !== replanModalTrip.vehicleId)
                    .map((v) => (
                      <option key={v.id} value={v.id}>
                        {v.plate} — {v.brandModel} ({v.capacityKg} kg)
                      </option>
                    ))}
                </select>
              </div>
              {!replanTargetVehicleId && (
                <div>
                  <label className="text-zinc-400 block mb-1">Gecikme Kaydırması (Dakika)</label>
                  <input
                    type="number"
                    value={replanDelayMin}
                    onChange={(e) => setReplanDelayMin(e.target.value)}
                    className="w-full bg-[#0B0F0D] border border-white/[0.1] text-white rounded-xl px-3 py-2"
                  />
                </div>
              )}
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setReplanModalTrip(null)}
                className="px-4 py-2 rounded-full bg-white/[0.05] text-zinc-300 text-xs"
              >
                İptal
              </button>
              <button
                type="button"
                disabled={submitting}
                onClick={async () => {
                  await onAction('replan_trip', {
                    tripId: replanModalTrip.id,
                    reason: replanReason,
                    targetVehicleId: replanTargetVehicleId || undefined,
                    delayOffsetMinutes: Number(replanDelayMin || 30),
                  });
                  setReplanModalTrip(null);
                }}
                className="px-4 py-2 rounded-full bg-[#34D399] text-[#061811] text-xs font-semibold"
              >
                Uygula & Yeniden Hesapla
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
