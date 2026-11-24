'use client';

import React, { useMemo, useState } from 'react';
import {
  Building2,
  CalendarDays,
  CheckCircle2,
  Compass,
  MapPin,
  Plus,
  Search,
  ShieldCheck,
  Users,
  X,
} from 'lucide-react';
import { toast } from 'sonner';
import { DispatchRouteMap } from '@/app/dashboard/sevkiyat/components/DispatchRouteMap';
import {
  TOUR_STATUS_BADGES,
  TOUR_STATUS_LABELS,
  TOUR_STATUSES,
  TOUR_TYPE_LABELS,
  type TourStatus,
  type TourType,
} from '@/lib/tourism/tur/constantsAndHelpers';

// ── A) Tur Paketleri & Hareket Takvimi Sekmesi ───────────────────────────────

export function TourPackagesAndCalendarTab({
  tours,
  vehicles,
  drivers,
  guides,
  seatLayouts,
  hotelAllotments,
  hotelRooms,
  demoCompanyId,
  onRefresh,
  onFocusTour,
}: {
  tours: any[];
  vehicles: any[];
  drivers: any[];
  guides: any[];
  seatLayouts: any[];
  hotelAllotments: any[];
  hotelRooms: any[];
  demoCompanyId: string;
  onRefresh: () => void;
  onFocusTour: (tourId: string, targetTab: 'seat_map' | 'bookings' | 'profit') => void;
}) {
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [typeFilter, setTypeFilter] = useState<string>('ALL');
  const [search, setSearch] = useState<string>('');
  const [showForm, setShowForm] = useState<boolean>(false);
  const [busy, setBusy] = useState<boolean>(false);

  // Yeni / Düzenle Tur Formu
  const [title, setTitle] = useState('');
  const [destinationCity, setDestinationCity] = useState('');
  const [departureCity, setDepartureCity] = useState('İstanbul');
  const [tourType, setTourType] = useState<TourType>('DAY_TRIP');
  const [startAt, setStartAt] = useState('2026-12-03T07:00');
  const [endAt, setEndAt] = useState('2026-12-03T20:00');
  const [adultPriceTry, setAdultPriceTry] = useState(2600);
  const [childPriceTry, setChildPriceTry] = useState(1850);
  const [capacity, setCapacity] = useState(27);
  const [minParticipants, setMinParticipants] = useState(12);
  const [vehicleId, setVehicleId] = useState(vehicles[0]?.id || '');
  const [driverId, setDriverId] = useState(drivers[0]?.id || '');
  const [guideId, setGuideId] = useState(guides[0]?.id || '');
  const [seatLayoutId, setSeatLayoutId] = useState(seatLayouts[1]?.id || seatLayouts[0]?.id || '');
  const [hotelAllotmentId, setHotelAllotmentId] = useState('');

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return tours.filter((t) => {
      if (statusFilter !== 'ALL' && t.status !== statusFilter) return false;
      if (typeFilter !== 'ALL' && t.tourType !== typeFilter) return false;
      if (
        q &&
        !String(t.code).toLowerCase().includes(q) &&
        !String(t.title).toLowerCase().includes(q) &&
        !String(t.destinationCity).toLowerCase().includes(q)
      ) {
        return false;
      }
      return true;
    });
  }, [tours, statusFilter, typeFilter, search]);

  const handleSaveTour = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    try {
      const res = await fetch('/api/tur', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'upsert_tour',
          title,
          destinationCity,
          departureCity,
          tourType,
          startAt: new Date(startAt).toISOString(),
          endAt: new Date(endAt).toISOString(),
          adultPriceTry,
          childPriceTry,
          capacity,
          minParticipants,
          vehicleId: vehicleId || null,
          driverId: driverId || null,
          guideId: guideId || null,
          seatLayoutId: seatLayoutId || null,
          hotelAllotmentId: tourType === 'MULTI_DAY' ? hotelAllotmentId || null : null,
          hotelRoomIds:
            tourType === 'MULTI_DAY'
              ? hotelRooms.filter((r) => r.status === 'CLEAN_VACANT').slice(0, 4).map((r) => r.id)
              : [],
          demoCompanyId,
        }),
      });
      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error || 'Tur paketi kaydedilemedi.');
      }
      toast.success(`Tur oluşturuldu: ${json.tour.code} (${json.tour.title})`);
      setShowForm(false);
      setTitle('');
      setDestinationCity('');
      onRefresh();
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setBusy(false);
    }
  };

  const handleStatusChange = async (tour: any, nextStatus: TourStatus) => {
    setBusy(true);
    try {
      const res = await fetch('/api/tur', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'upsert_tour',
          id: tour.id,
          title: tour.title,
          destinationCity: tour.destinationCity,
          startAt: tour.startAt,
          endAt: tour.endAt,
          status: nextStatus,
          demoCompanyId,
        }),
      });
      const json = await res.json();
      if (!res.ok || !json.success) throw new Error(json.error || 'Durum güncellenemedi.');
      toast.success(`${tour.code} durumu "${TOUR_STATUS_LABELS[nextStatus]}" oldu.`);
      onRefresh();
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-[--line] bg-[white] p-4">
        <div className="flex flex-wrap gap-1.5">
          <button
            type="button"
            onClick={() => setStatusFilter('ALL')}
            className={`rounded-lg px-2.5 py-1.5 text-xs font-medium ${
              statusFilter === 'ALL' ? 'bg-[#1267E6] text-[#F6F8FB]' : 'bg-[#161B18] text-zinc-300'
            }`}
          >
            Tümü ({tours.length})
          </button>
          {TOUR_STATUSES.map((st) => (
            <button
              key={st}
              type="button"
              onClick={() => setStatusFilter(st)}
              className={`rounded-lg px-2.5 py-1.5 text-xs font-medium ${
                statusFilter === st ? 'bg-[#1267E6] text-[#F6F8FB]' : 'bg-[#161B18] text-zinc-300'
              }`}
            >
              {TOUR_STATUS_LABELS[st]}
            </button>
          ))}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="rounded-lg border border-white/[0.1] bg-[#0B0E0D] px-2.5 py-1.5 text-xs text-zinc-200"
          >
            <option value="ALL">Tüm Tur Tipleri</option>
            <option value="DAY_TRIP">Günübirlik</option>
            <option value="MULTI_DAY">Konaklamalı</option>
          </select>
          <div className="relative">
            <Search className="pointer-events-none absolute left-2.5 top-2 h-3.5 w-3.5 text-zinc-500" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Tur kodu, ad, şehir..."
              className="rounded-lg border border-white/[0.1] bg-[#0B0E0D] py-1.5 pl-8 pr-3 text-xs text-zinc-200"
            />
          </div>
          <button
            type="button"
            onClick={() => setShowForm((v) => !v)}
            className="flex items-center gap-1.5 rounded-lg bg-[#1267E6] px-3 py-1.5 text-xs font-semibold text-[#F6F8FB] hover:bg-[--brand-hover]"
          >
            <Plus className="h-3.5 w-3.5" /> Yeni Tur Planla
          </button>
        </div>
      </div>

      {showForm && (
        <form
          onSubmit={handleSaveTour}
          className="grid grid-cols-1 gap-3 rounded-xl border border-[--brand]/35 bg-[white] p-4 md:grid-cols-4"
        >
          <div className="md:col-span-4 flex items-center justify-between">
            <h4 className="text-sm font-semibold text-[#1267E6]">
              Yeni Tur Paketi (Araç / Şoför / Rehber Çakışma Kontrolü Aktif)
            </h4>
            <button type="button" onClick={() => setShowForm(false)} className="text-zinc-400">
              <X className="h-4 w-4" />
            </button>
          </div>
          <div className="md:col-span-2">
            <label className="mb-1 block text-[11px] text-zinc-400">Tur Adı</label>
            <input
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Örn. Kazdağları & Assos 2 Günlük Kültür Turu"
              className="w-full rounded-lg border border-white/[0.1] bg-[#0B0E0D] px-2.5 py-2 text-xs text-zinc-100"
            />
          </div>
          <div>
            <label className="mb-1 block text-[11px] text-zinc-400">Destinasyon</label>
            <input
              required
              value={destinationCity}
              onChange={(e) => setDestinationCity(e.target.value)}
              placeholder="Örn. Çanakkale / Assos"
              className="w-full rounded-lg border border-white/[0.1] bg-[#0B0E0D] px-2.5 py-2 text-xs text-zinc-100"
            />
          </div>
          <div>
            <label className="mb-1 block text-[11px] text-zinc-400">Tur Tipi</label>
            <select
              value={tourType}
              onChange={(e) => setTourType(e.target.value as TourType)}
              className="w-full rounded-lg border border-white/[0.1] bg-[#0B0E0D] px-2.5 py-2 text-xs text-zinc-100"
            >
              <option value="DAY_TRIP">Günübirlik Tur</option>
              <option value="MULTI_DAY">Konaklamalı Tur (Otel Bağlantılı)</option>
            </select>
          </div>

          <div>
            <label className="mb-1 block text-[11px] text-zinc-400">Hareket Tarih/Saat</label>
            <input
              type="datetime-local"
              required
              value={startAt}
              onChange={(e) => setStartAt(e.target.value)}
              className="w-full rounded-lg border border-white/[0.1] bg-[#0B0E0D] px-2.5 py-2 text-xs text-zinc-100"
            />
          </div>
          <div>
            <label className="mb-1 block text-[11px] text-zinc-400">Dönüş Tarih/Saat</label>
            <input
              type="datetime-local"
              required
              value={endAt}
              onChange={(e) => setEndAt(e.target.value)}
              className="w-full rounded-lg border border-white/[0.1] bg-[#0B0E0D] px-2.5 py-2 text-xs text-zinc-100"
            />
          </div>
          <div>
            <label className="mb-1 block text-[11px] text-zinc-400">Yetişkin / Çocuk (₺)</label>
            <div className="flex gap-1.5">
              <input
                type="number"
                value={adultPriceTry}
                onChange={(e) => setAdultPriceTry(Number(e.target.value))}
                className="w-full rounded-lg border border-white/[0.1] bg-[#0B0E0D] px-2 py-2 text-xs text-zinc-100"
              />
              <input
                type="number"
                value={childPriceTry}
                onChange={(e) => setChildPriceTry(Number(e.target.value))}
                className="w-full rounded-lg border border-white/[0.1] bg-[#0B0E0D] px-2 py-2 text-xs text-zinc-100"
              />
            </div>
          </div>
          <div>
            <label className="mb-1 block text-[11px] text-zinc-400">Kapasite / Min. Katılım</label>
            <div className="flex gap-1.5">
              <input
                type="number"
                value={capacity}
                onChange={(e) => setCapacity(Number(e.target.value))}
                className="w-full rounded-lg border border-white/[0.1] bg-[#0B0E0D] px-2 py-2 text-xs text-zinc-100"
              />
              <input
                type="number"
                value={minParticipants}
                onChange={(e) => setMinParticipants(Number(e.target.value))}
                className="w-full rounded-lg border border-white/[0.1] bg-[#0B0E0D] px-2 py-2 text-xs text-zinc-100"
              />
            </div>
          </div>

          <div>
            <label className="mb-1 block text-[11px] text-zinc-400">Filo Aracı</label>
            <select
              value={vehicleId}
              onChange={(e) => setVehicleId(e.target.value)}
              className="w-full rounded-lg border border-white/[0.1] bg-[#0B0E0D] px-2.5 py-2 text-xs text-zinc-100"
            >
              <option value="">Sonra Ata</option>
              {vehicles.map((v) => (
                <option key={v.id} value={v.id}>
                  {v.plate} — {v.brand} {v.model} ({v.status})
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="mb-1 block text-[11px] text-zinc-400">Şoför (Filo)</label>
            <select
              value={driverId}
              onChange={(e) => setDriverId(e.target.value)}
              className="w-full rounded-lg border border-white/[0.1] bg-[#0B0E0D] px-2.5 py-2 text-xs text-zinc-100"
            >
              <option value="">Sonra Ata</option>
              {drivers.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.fullName}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="mb-1 block text-[11px] text-zinc-400">Tur Rehberi</label>
            <select
              value={guideId}
              onChange={(e) => setGuideId(e.target.value)}
              className="w-full rounded-lg border border-white/[0.1] bg-[#0B0E0D] px-2.5 py-2 text-xs text-zinc-100"
            >
              <option value="">Sonra Ata</option>
              {guides.map((g) => (
                <option key={g.id} value={g.id}>
                  {g.fullName} ({g.code})
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="mb-1 block text-[11px] text-zinc-400">Koltuk Şeması</label>
            <select
              value={seatLayoutId}
              onChange={(e) => setSeatLayoutId(e.target.value)}
              className="w-full rounded-lg border border-white/[0.1] bg-[#0B0E0D] px-2.5 py-2 text-xs text-zinc-100"
            >
              {seatLayouts.map((l) => (
                <option key={l.id} value={l.id}>
                  {l.name}
                </option>
              ))}
            </select>
          </div>

          {tourType === 'MULTI_DAY' && (
            <div className="md:col-span-2">
              <label className="mb-1 block text-[11px] text-[#1267E6]">
                Bağlı Otel Kontenjanı (Otel PMS)
              </label>
              <select
                value={hotelAllotmentId}
                onChange={(e) => setHotelAllotmentId(e.target.value)}
                className="w-full rounded-lg border border-[--brand]/35 bg-[#0B0E0D] px-2.5 py-2 text-xs text-zinc-100"
              >
                <option value="">Otel kontenjanı seç (opsiyonel)...</option>
                {hotelAllotments.map((al) => (
                  <option key={al.id} value={al.id}>
                    {al.code} — {al.agencyName} ({al.allocatedRoomsPerNight} oda/gece)
                  </option>
                ))}
              </select>
            </div>
          )}

          <div className="md:col-span-4 flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setShowForm(false)}
              className="rounded-lg border border-white/[0.1] px-4 py-2 text-xs text-zinc-300"
            >
              Vazgeç
            </button>
            <button
              type="submit"
              disabled={busy}
              className="rounded-lg bg-[#1267E6] px-4 py-2 text-xs font-semibold text-[#F6F8FB] hover:bg-[--brand-hover]"
            >
              {busy ? 'Çakışmalar Kontrol Ediliyor...' : 'Turu Kaydet'}
            </button>
          </div>
        </form>
      )}

      {/* Tur Kartları */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {filtered.map((t) => {
          const paxCount = t.profitability?.confirmedPassengers ?? t.confirmedPassengerCount ?? 0;
          const occPct = Math.min(100, Math.round((paxCount / Math.max(1, t.capacity)) * 100));
          const belowMin =
            t.status !== 'CANCELLED' &&
            t.status !== 'COMPLETED' &&
            paxCount < Number(t.minParticipants || 1);

          return (
            <div
              key={t.id}
              className="flex flex-col justify-between rounded-xl border border-[--line] bg-[white] p-4"
            >
              <div>
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-mono text-xs font-semibold text-[#1267E6]">
                        {t.code}
                      </span>
                      <span className="rounded bg-[--muted-bg] px-1.5 py-0.5 text-[10px] text-zinc-300">
                        {TOUR_TYPE_LABELS[t.tourType as TourType] || t.tourType} ({t.durationDays} Gün)
                      </span>
                      {t.hotelAllotmentId && (
                        <span className="inline-flex items-center gap-1 rounded bg-sky-500/15 px-1.5 py-0.5 text-[10px] text-sky-300">
                          <Building2 className="h-3 w-3" /> Otel & KBS Bağlı
                        </span>
                      )}
                    </div>
                    <h3 className="mt-1 text-sm font-bold text-white">{t.title}</h3>
                    <p className="text-xs text-zinc-400">
                      {t.departureCity} → {t.destinationCity} ·{' '}
                      {String(t.startAt).slice(0, 16).replace('T', ' ')}
                    </p>
                  </div>

                  <span
                    className={`shrink-0 rounded-full border px-2.5 py-0.5 text-[10px] font-medium ${
                      TOUR_STATUS_BADGES[t.status as TourStatus] || 'border-[--line] text-zinc-300'
                    }`}
                  >
                    {TOUR_STATUS_LABELS[t.status as TourStatus] || t.status}
                  </span>
                </div>

                {/* Doluluk Barı & Kaynaklar */}
                <div className="mt-3 space-y-1.5">
                  <div className="flex justify-between text-[11px]">
                    <span className="text-zinc-300">
                      Doluluk: <strong>{paxCount}</strong> / {t.capacity} yolcu (%{occPct}){' '}
                      <span className={belowMin ? 'text-amber-300' : 'text-zinc-400'}>
                        · Min: {t.minParticipants}
                      </span>
                    </span>
                    <span className="font-mono font-semibold text-[#1267E6]">
                      {Number(t.adultPriceTry).toLocaleString('tr-TR')} ₺
                    </span>
                  </div>
                  <div className="h-1.5 w-full overflow-hidden rounded-full bg-white/[0.08]">
                    <div
                      className={`h-full rounded-full ${
                        occPct >= 95
                          ? 'bg-amber-400'
                          : belowMin
                            ? 'bg-rose-400'
                            : 'bg-[#1267E6]'
                      }`}
                      style={{ width: `${occPct}%` }}
                    />
                  </div>
                </div>

                <div className="mt-3 grid grid-cols-3 gap-2 rounded-lg bg-[#0B0E0D] p-2.5 text-[11px] text-zinc-300">
                  <div>
                    <span className="block text-[10px] text-zinc-500">Araç</span>
                    <strong className="truncate block">
                      {t.vehicle?.plate || 'Atanmadı'}
                    </strong>
                  </div>
                  <div>
                    <span className="block text-[10px] text-zinc-500">Şoför</span>
                    <strong className="truncate block">
                      {t.driver?.fullName || 'Atanmadı'}
                    </strong>
                  </div>
                  <div>
                    <span className="block text-[10px] text-zinc-500">Rehber</span>
                    <strong className="truncate block">
                      {t.guide?.fullName || 'Atanmadı'}
                    </strong>
                  </div>
                </div>

                {Array.isArray(t.itinerary) && t.itinerary.length > 0 && (
                  <div className="mt-2.5 space-y-1 text-[11px] text-zinc-400">
                    {t.itinerary.slice(0, 2).map((it: any, i: number) => (
                      <div key={i} className="truncate">
                        <span className="font-mono text-[#1267E6]">
                          Gün {it.day} {it.time}
                        </span>{' '}
                        · {it.location} — {it.activity}
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="mt-3 flex flex-wrap items-center justify-between gap-2 border-t border-[--line] pt-3">
                <div className="flex flex-wrap gap-1.5">
                  <button
                    type="button"
                    onClick={() => onFocusTour(t.id, 'seat_map')}
                    className="rounded-md bg-[--brand]/15 px-2.5 py-1 text-[11px] font-medium text-[#1267E6] hover:bg-[--brand]/30"
                  >
                    Koltuk & Duraklar
                  </button>
                  <button
                    type="button"
                    onClick={() => onFocusTour(t.id, 'bookings')}
                    className="rounded-md bg-sky-500/15 px-2.5 py-1 text-[11px] font-medium text-sky-300 hover:bg-sky-500/30"
                  >
                    Manifesto & Rezervasyon
                  </button>
                  <button
                    type="button"
                    onClick={() => onFocusTour(t.id, 'profit')}
                    className="rounded-md bg-purple-500/15 px-2.5 py-1 text-[11px] font-medium text-purple-300 hover:bg-purple-500/30"
                  >
                    Kâr Analizi
                  </button>
                </div>

                <select
                  disabled={busy}
                  value={t.status}
                  onChange={(e) => handleStatusChange(t, e.target.value as TourStatus)}
                  className="rounded-md border border-white/[0.1] bg-[#0B0E0D] px-2 py-1 text-[10px] text-zinc-200"
                >
                  {TOUR_STATUSES.map((s) => (
                    <option key={s} value={s}>
                      {TOUR_STATUS_LABELS[s]}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── B & D) Dinamik Koltuk Planı & Biniş Noktaları Haritası Sekmesi ───────────

export function TourSeatMapAndStopsTab({
  tours,
  focusedTourId,
  mapConfig,
  demoCompanyId,
  onRefresh,
}: {
  tours: any[];
  focusedTourId: string | null;
  mapConfig: any;
  demoCompanyId: string;
  onRefresh: () => void;
}) {
  const [selectedTourId, setSelectedTourId] = useState<string>(focusedTourId || tours[0]?.id || '');
  const [selectedPaxId, setSelectedPaxId] = useState<string>('');
  const [stopName, setStopName] = useState('');
  const [district, setDistrict] = useState('');
  const [pickupTime, setPickupTime] = useState('07:45');
  const [lat, setLat] = useState(40.98);
  const [lng, setLng] = useState(29.05);
  const [busy, setBusy] = useState(false);

  const tour = useMemo(
    () => tours.find((t) => t.id === (focusedTourId || selectedTourId)) || tours[0] || null,
    [tours, focusedTourId, selectedTourId]
  );

  const slots = tour?.seatLayout?.slots || [];
  const paxBySeat = useMemo(() => {
    const map = new Map<string, any>();
    for (const p of tour?.passengers || []) {
      if (p.seatNumber) map.set(String(p.seatNumber), p);
    }
    return map;
  }, [tour]);

  const rowsGrouped = useMemo(() => {
    const map = new Map<number, any[]>();
    for (const s of slots) {
      const arr = map.get(s.row) || [];
      arr.push(s);
      map.set(s.row, arr);
    }
    return Array.from(map.entries()).sort((a, b) => a[0] - b[0]);
  }, [slots]);

  const handleAssignSeat = async (seatNumber: string) => {
    if (!tour || !selectedPaxId) {
      toast.info('Önce aşağıdan koltuk atanacak yolcuyu seçin.');
      return;
    }
    setBusy(true);
    try {
      const res = await fetch('/api/tur', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'assign_seat',
          tourId: tour.id,
          passengerId: selectedPaxId,
          seatNumber,
          demoCompanyId,
        }),
      });
      const json = await res.json();
      if (!res.ok || !json.success) throw new Error(json.error || 'Koltuk atanamadı.');
      toast.success(`Yolcu ${seatNumber} numaralı koltuğa atandı.`);
      onRefresh();
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setBusy(false);
    }
  };

  const handleAddStop = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!tour || !stopName.trim()) return;
    setBusy(true);
    try {
      const res = await fetch('/api/tur', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'upsert_pickup_stop',
          tourId: tour.id,
          stopName,
          district,
          pickupTime,
          lat,
          lng,
          demoCompanyId,
        }),
      });
      const json = await res.json();
      if (!res.ok || !json.success) throw new Error(json.error || 'Durak eklenemedi.');
      toast.success('Biniş durağı eklendi ve tahmini rota yeniden hesaplandı.');
      setStopName('');
      setDistrict('');
      onRefresh();
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setBusy(false);
    }
  };

  const mapStops = (tour?.stops || []).map((s: any) => ({
    id: s.id,
    sequenceNo: s.sequenceNo,
    customerName: `${s.pickupTime} · ${s.stopName}`,
    cityDistrict: s.district,
    status: 'YOLDA',
    lat: Number(s.lat),
    lng: Number(s.lng),
    timeWindowStart: s.pickupTime,
  }));
  const mapPolyline: Array<[number, number]> = mapStops.map((s: any) => [s.lat, s.lng]);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-[--line] bg-[white] p-4">
        <div className="flex items-center gap-2">
          <Compass className="h-4 w-4 text-[#1267E6]" />
          <h3 className="text-sm font-semibold text-zinc-100">
            Dinamik Araç Koltuk Planı & Biniş Noktaları Rotası
          </h3>
        </div>
        <select
          value={tour?.id || ''}
          onChange={(e) => setSelectedTourId(e.target.value)}
          className="min-w-[280px] rounded-lg border border-white/[0.1] bg-[#0B0E0D] px-3 py-2 text-xs text-zinc-100"
        >
          {tours.map((t) => (
            <option key={t.id} value={t.id}>
              {t.code} — {t.title} ({t.seatLayout?.name || `${t.capacity} Koltuk`})
            </option>
          ))}
        </select>
      </div>

      {tour && (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          {/* Sol: Dinamik Koltuk Haritası */}
          <div className="space-y-3 rounded-xl border border-[--line] bg-[white] p-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <h4 className="text-sm font-semibold text-zinc-100">
                  {tour.seatLayout?.name || 'Araç Koltuk Şeması'} · {tour.vehicle?.plate || 'Araç'}
                </h4>
                <p className="text-[11px] text-zinc-400">
                  Cinsiyet kuralı: {tour.enforceGenderSeatRule ? 'Aktif' : 'Esnek'} · Aile yan yana istisnası:{' '}
                  {tour.allowFamilySeatOverride ? 'Açık' : 'Kapalı'}
                </p>
              </div>
              <div className="flex gap-1.5 text-[10px]">
                <span className="rounded bg-[--brand]/15 px-2 py-0.5 text-[#1267E6]">Boş</span>
                <span className="rounded bg-sky-500/20 px-2 py-0.5 text-sky-300">Erkek (E)</span>
                <span className="rounded bg-pink-500/20 px-2 py-0.5 text-pink-300">Kadın (K)</span>
              </div>
            </div>

            <div className="flex items-center gap-2 rounded-lg bg-[#0B0E0D] p-2.5 text-xs">
              <Users className="h-4 w-4 text-[#1267E6]" />
              <select
                value={selectedPaxId}
                onChange={(e) => setSelectedPaxId(e.target.value)}
                className="flex-1 rounded border border-white/[0.1] bg-[white] px-2.5 py-1.5 text-xs text-zinc-100"
              >
                <option value="">Koltuk atanacak / taşınacak yolcuyu seçin...</option>
                {(tour.passengers || []).map((p: any) => (
                  <option key={p.id} value={p.id}>
                    {p.fullName} ({p.gender === 'F' ? 'K' : p.gender === 'M' ? 'E' : '?'}) · Mevcut: Koltuk{' '}
                    {p.seatNumber || 'Yok'}
                    {p.familyGroupCode ? ` [${p.familyGroupCode}]` : ''}
                  </option>
                ))}
              </select>
            </div>

            {/* Koltuk Sıraları */}
            <div className="space-y-2 rounded-xl border border-[--line] bg-[#0B0E0D] p-3">
              <div className="mb-2 flex justify-between border-b border-[--line] pb-1.5 text-[10px] text-zinc-500">
                <span>ŞOFÖR / KAPTAN</span>
                <span>ÖN KAPI / REHBER</span>
              </div>
              {rowsGrouped.map(([rowNum, rowSlots]) => {
                const aisleAfter = Number(tour.seatLayout?.aisleAfterCol || 2);
                const leftSeats = rowSlots.filter((s) => s.col < aisleAfter);
                const rightSeats = rowSlots.filter((s) => s.col >= aisleAfter);
                return (
                  <div key={rowNum} className="flex items-center justify-between gap-3">
                    <div className="flex flex-1 gap-1.5">
                      {leftSeats.map((slot) => {
                        const pax = paxBySeat.get(slot.seatNumber);
                        const cls = !pax
                          ? 'border-[--brand-line] bg-[--brand]/10 text-[#1267E6] hover:bg-[--brand]/25'
                          : pax.gender === 'F'
                            ? 'border-pink-500/40 bg-pink-500/20 text-pink-200'
                            : 'border-sky-500/40 bg-sky-500/20 text-sky-200';
                        return (
                          <button
                            key={slot.seatNumber}
                            type="button"
                            disabled={busy}
                            onClick={() => handleAssignSeat(slot.seatNumber)}
                            title={pax ? `${pax.fullName} (${pax.gender})` : `Koltuk ${slot.seatNumber} — Boş`}
                            className={`flex-1 rounded-lg border px-1.5 py-2 text-center text-[11px] font-semibold transition ${cls}`}
                          >
                            <div>{slot.seatNumber}</div>
                            <div className="truncate text-[9px] opacity-80">
                              {pax ? pax.fullName.split(' ')[0] : 'Boş'}
                            </div>
                          </button>
                        );
                      })}
                    </div>
                    <span className="w-6 text-center font-mono text-[10px] text-zinc-600">
                      S{rowNum}
                    </span>
                    <div className="flex flex-1 gap-1.5">
                      {rightSeats.map((slot) => {
                        const pax = paxBySeat.get(slot.seatNumber);
                        const cls = !pax
                          ? 'border-[--brand-line] bg-[--brand]/10 text-[#1267E6] hover:bg-[--brand]/25'
                          : pax.gender === 'F'
                            ? 'border-pink-500/40 bg-pink-500/20 text-pink-200'
                            : 'border-sky-500/40 bg-sky-500/20 text-sky-200';
                        return (
                          <button
                            key={slot.seatNumber}
                            type="button"
                            disabled={busy}
                            onClick={() => handleAssignSeat(slot.seatNumber)}
                            title={pax ? `${pax.fullName} (${pax.gender})` : `Koltuk ${slot.seatNumber} — Boş`}
                            className={`flex-1 rounded-lg border px-1.5 py-2 text-center text-[11px] font-semibold transition ${cls}`}
                          >
                            <div>{slot.seatNumber}</div>
                            <div className="truncate text-[9px] opacity-80">
                              {pax ? pax.fullName.split(' ')[0] : 'Boş'}
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Sağ: Biniş Noktaları & Mevcut Lojistik Harita Bileşeni */}
          <div className="space-y-3 rounded-xl border border-[--line] bg-[white] p-4">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="text-sm font-semibold text-zinc-100">
                  Biniş Noktaları & Rota Haritası ({mapStops.length} Durak)
                </h4>
                <p className="text-[11px] text-zinc-400">
                  Tahmini Mesafe:{' '}
                  <strong className="text-[#1267E6]">
                    {tour.estimatedDistanceKm || tour.routeEstimate?.estimatedDistanceKm || 0} km (tahmini)
                  </strong>{' '}
                  · Tahmini Süre:{' '}
                  <strong className="text-sky-300">
                    {tour.estimatedDurationMinutes || tour.routeEstimate?.estimatedDurationMinutes || 0} dk (tahmini)
                  </strong>
                </p>
              </div>
            </div>

            {mapStops.length > 0 && (
              <DispatchRouteMap
                origin={{
                  label: mapStops[0].customerName,
                  lat: mapStops[0].lat,
                  lng: mapStops[0].lng,
                }}
                stops={mapStops}
                polyline={mapPolyline}
                mapConfig={mapConfig || { tileUrl: null, hasExternalTileConfig: false, attribution: 'Tahmini Rota' }}
                tripNumber={`${tour.code} (Tahmini Rota)`}
              />
            )}

            <div className="space-y-1.5">
              {(tour.stops || []).map((s: any) => {
                const paxAtStop = (tour.passengers || []).filter((p: any) => p.pickupStopId === s.id).length;
                return (
                  <div
                    key={s.id}
                    className="flex items-center justify-between rounded-lg border border-[--line] bg-[#0B0E0D] px-3 py-2 text-xs"
                  >
                    <div className="flex items-center gap-2">
                      <span className="flex h-5 w-5 items-center justify-center rounded-full bg-[--brand]/20 font-mono text-[10px] font-bold text-[#1267E6]">
                        {s.sequenceNo}
                      </span>
                      <div>
                        <span className="font-mono font-semibold text-sky-300">{s.pickupTime}</span>{' '}
                        <span className="font-medium text-zinc-100">{s.stopName}</span>{' '}
                        <span className="text-zinc-500">({s.district || '-'})</span>
                      </div>
                    </div>
                    <span className="rounded bg-[--muted-bg] px-2 py-0.5 text-[10px] text-zinc-300">
                      {paxAtStop} yolcu
                    </span>
                  </div>
                );
              })}
            </div>

            <form onSubmit={handleAddStop} className="grid grid-cols-2 gap-2 border-t border-[--line] pt-3">
              <input
                required
                value={stopName}
                onChange={(e) => setStopName(e.target.value)}
                placeholder="Yeni biniş durağı adı..."
                className="rounded-lg border border-white/[0.1] bg-[#0B0E0D] px-2.5 py-1.5 text-xs text-zinc-100"
              />
              <input
                value={district}
                onChange={(e) => setDistrict(e.target.value)}
                placeholder="İlçe / Bölge"
                className="rounded-lg border border-white/[0.1] bg-[#0B0E0D] px-2.5 py-1.5 text-xs text-zinc-100"
              />
              <input
                value={pickupTime}
                onChange={(e) => setPickupTime(e.target.value)}
                placeholder="07:45"
                className="rounded-lg border border-white/[0.1] bg-[#0B0E0D] px-2.5 py-1.5 text-xs text-zinc-100"
              />
              <div className="flex gap-1">
                <input
                  type="number"
                  step="0.0001"
                  value={lat}
                  onChange={(e) => setLat(Number(e.target.value))}
                  className="w-full rounded-lg border border-white/[0.1] bg-[#0B0E0D] px-2 py-1.5 text-xs text-zinc-100"
                />
                <input
                  type="number"
                  step="0.0001"
                  value={lng}
                  onChange={(e) => setLng(Number(e.target.value))}
                  className="w-full rounded-lg border border-white/[0.1] bg-[#0B0E0D] px-2 py-1.5 text-xs text-zinc-100"
                />
              </div>
              <button
                type="submit"
                disabled={busy}
                className="col-span-2 flex items-center justify-center gap-1.5 rounded-lg bg-[--brand]/20 py-1.5 text-xs font-medium text-[#1267E6] hover:bg-[--brand]/30"
              >
                <MapPin className="h-3.5 w-3.5" /> Biniş Durağı Ekle & Tahmini Rotayı Güncelle
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
