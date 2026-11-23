'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import {
  AlertTriangle,
  CheckCircle2,
  Compass,
  CreditCard,
  Download,
  RefreshCw,
  ShieldCheck,
  Smartphone,
  Wifi,
  WifiOff,
} from 'lucide-react';
import { toast } from 'sonner';
import {
  TOUR_BOARDING_STATUS_BADGES,
  TOUR_BOARDING_STATUS_LABELS,
} from '@/lib/tourism/tur/constantsAndHelpers';
import {
  enqueueOfflineGuideOperation,
  getOfflineGuideQueue,
  syncAllOfflineGuideOperations,
  type OfflineGuideOperation,
} from '@/lib/tourism/tur/guideOfflineSync';

export default function TourGuideMobilePage() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [selectedTourId, setSelectedTourId] = useState<string>('');
  const [isOnline, setIsOnline] = useState<boolean>(true);
  const [simulatedOffline, setSimulatedOffline] = useState<boolean>(false);
  const [pendingQueue, setPendingQueue] = useState<OfflineGuideOperation[]>([]);
  const [syncing, setSyncing] = useState<boolean>(false);

  // Acil Not & Saha Tahsilat Formu
  const [emergencyNote, setEmergencyNote] = useState('');
  const [collectBookingId, setCollectBookingId] = useState('');
  const [collectAmount, setCollectAmount] = useState(1000);
  const [collectMethod, setCollectMethod] = useState('Saha Nakit (Rehber)');

  const effectiveOnline = isOnline && !simulatedOffline;

  const refreshQueue = useCallback(async () => {
    const items = await getOfflineGuideQueue();
    setPendingQueue(
      items.filter((i) => i.syncStatus === 'QUEUED_OFFLINE' || i.syncStatus === 'ERROR')
    );
  }, []);

  const loadTours = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/tur?section=guide_mobile', { cache: 'no-store' });
      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error || 'Rehber saha verileri yüklenemedi.');
      }
      setData(json);
      if (!selectedTourId && json.tours?.[0]?.id) {
        setSelectedTourId(json.tours[0].id);
      }
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  }, [selectedTourId]);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      setIsOnline(navigator.onLine);
      const onOn = () => setIsOnline(true);
      const onOff = () => setIsOnline(false);
      window.addEventListener('online', onOn);
      window.addEventListener('offline', onOff);
      return () => {
        window.removeEventListener('online', onOn);
        window.removeEventListener('offline', onOff);
      };
    }
  }, []);

  useEffect(() => {
    loadTours();
    refreshQueue();
  }, [loadTours, refreshQueue]);

  const tours = data?.tours || [];
  const activeTour = useMemo(
    () => tours.find((t: any) => t.id === selectedTourId) || tours[0] || null,
    [tours, selectedTourId]
  );

  const handleSync = async () => {
    if (!effectiveOnline) {
      toast.error('Senkronizasyon için çevrimiçi moda geçin.');
      return;
    }
    setSyncing(true);
    try {
      const res = await syncAllOfflineGuideOperations();
      await refreshQueue();
      await loadTours();
      toast.success(
        `Senkron tamamlandı: ${res.syncedCount} işlendi, ${res.duplicateIgnoredCount} mükerrer atlandı.`
      );
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setSyncing(false);
    }
  };

  const handleToggleBoarding = async (pax: any, nextStatus: 'BOARDED' | 'NO_SHOW') => {
    if (!activeTour) return;
    if (!effectiveOnline) {
      await enqueueOfflineGuideOperation({
        tourId: activeTour.id,
        operationType: 'BOARDING_CHECKIN',
        passengerId: pax.id,
        passengerName: pax.fullName,
        boardingStatus: nextStatus,
        note: `Çevrimdışı yoklama (${nextStatus})`,
      });
      await refreshQueue();
      toast.info(`Çevrimdışı kuyruğa alındı: ${pax.fullName} → ${TOUR_BOARDING_STATUS_LABELS[nextStatus]}`);
      return;
    }

    try {
      const res = await fetch('/api/tur', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'update_boarding_status',
          passengerId: pax.id,
          boardingStatus: nextStatus,
        }),
      });
      const json = await res.json();
      if (!res.ok || !json.success) throw new Error(json.error || 'Yoklama güncellenemedi.');
      toast.success(`${pax.fullName}: ${TOUR_BOARDING_STATUS_LABELS[nextStatus]}`);
      loadTours();
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  const handleSaveEmergencyNote = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeTour || !emergencyNote.trim()) return;
    if (!effectiveOnline) {
      await enqueueOfflineGuideOperation({
        tourId: activeTour.id,
        operationType: 'EMERGENCY_NOTE',
        note: emergencyNote,
      });
      await refreshQueue();
      setEmergencyNote('');
      toast.info('Acil saha notu çevrimdışı kuyruğa kaydedildi.');
      return;
    }

    try {
      const res = await fetch('/api/tur', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'record_guide_field_log',
          tourId: activeTour.id,
          logType: 'EMERGENCY_NOTE',
          note: emergencyNote,
        }),
      });
      const json = await res.json();
      if (!res.ok || !json.success) throw new Error(json.error || 'Not kaydedilemedi.');
      toast.success('Acil saha notu merkeze iletildi.');
      setEmergencyNote('');
      loadTours();
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  const handleFieldCollection = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeTour || !collectBookingId || collectAmount <= 0) return;
    if (!effectiveOnline) {
      await enqueueOfflineGuideOperation({
        tourId: activeTour.id,
        operationType: 'FIELD_COLLECTION',
        bookingId: collectBookingId,
        amountTry: collectAmount,
        paymentMethod: collectMethod,
        note: `Çevrimdışı saha tahsilatı (${collectAmount} ₺)`,
      });
      await refreshQueue();
      toast.info('Saha tahsilatı çevrimdışı kuyruğa alındı.');
      return;
    }

    try {
      const res = await fetch('/api/tur', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'record_guide_field_log',
          tourId: activeTour.id,
          logType: 'FIELD_COLLECTION',
          bookingId: collectBookingId,
          amountTry: collectAmount,
          paymentMethod: collectMethod,
          note: `Rehber saha tahsilatı (${collectAmount} ₺ · ${collectMethod})`,
        }),
      });
      const json = await res.json();
      if (!res.ok || !json.success) throw new Error(json.error || 'Tahsilat işlenemedi.');
      toast.success(`Saha tahsilatı (${collectAmount} ₺) rezervasyon ve Finansa işlendi.`);
      loadTours();
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  const isRestricted = Boolean(data?.isRestrictedGuide);

  return (
    <div className="min-h-screen bg-[#080A09] p-4 text-zinc-100">
      <div className="mx-auto max-w-3xl space-y-4">
        <div className="rounded-2xl border border-white/[0.08] bg-[#111513] p-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <Smartphone className="h-5 w-5 text-[#34D399]" />
              <div>
                <h1 className="text-lg font-bold text-white">Rehber & Şoför Mobil Saha Ekranı</h1>
                <p className="text-[11px] text-zinc-400">
                  Görevli: <strong className="text-zinc-200">{data?.staffUser?.username || '-'}</strong>
                  {isRestricted && ' · Kısıtlı Rehber Görünümü'}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {!isRestricted && (
                <Link
                  href="/dashboard/tur"
                  className="flex items-center gap-1 rounded-lg border border-white/[0.1] bg-[#161B18] px-2.5 py-1.5 text-xs text-zinc-200"
                >
                  <Compass className="h-3.5 w-3.5" /> Operasyon
                </Link>
              )}
              <button
                type="button"
                onClick={() => setSimulatedOffline((v) => !v)}
                className={`flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-medium ${
                  effectiveOnline
                    ? 'border-emerald-500/35 bg-emerald-500/15 text-[#34D399]'
                    : 'border-amber-500/40 bg-amber-500/20 text-amber-300'
                }`}
              >
                {effectiveOnline ? <Wifi className="h-3.5 w-3.5" /> : <WifiOff className="h-3.5 w-3.5" />}
                {effectiveOnline ? 'Çevrimiçi' : 'Çevrimdışı Mod'}
              </button>
            </div>
          </div>

          {isRestricted && (
            <div className="mt-3 flex items-center gap-2 rounded-lg border border-sky-500/25 bg-sky-500/10 px-3 py-2 text-[11px] text-sky-200">
              <ShieldCheck className="h-4 w-4 shrink-0 text-sky-400" />
              <span>Yalnızca size atanan turların yolcu listesi, yoklama ve tahsilat ekranına erişiminiz açıktır.</span>
            </div>
          )}
        </div>

        {pendingQueue.length > 0 && (
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-amber-500/40 bg-amber-500/10 p-3 text-xs">
            <span className="text-amber-200">
              <strong>{pendingQueue.length} çevrimdışı işlem</strong> senkronizasyon bekliyor.
            </span>
            <button
              type="button"
              disabled={syncing || !effectiveOnline}
              onClick={handleSync}
              className="flex items-center gap-1.5 rounded-lg bg-[#34D399] px-3 py-1.5 font-semibold text-[#080A09] disabled:opacity-50"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${syncing ? 'animate-spin' : ''}`} />
              Senkronize Et
            </button>
          </div>
        )}

        {/* Tur Seçimi */}
        <div className="flex flex-wrap items-center gap-2 rounded-xl border border-white/[0.08] bg-[#111513] p-3">
          <select
            value={activeTour?.id || ''}
            onChange={(e) => setSelectedTourId(e.target.value)}
            className="flex-1 rounded-lg border border-white/[0.1] bg-[#0B0E0D] px-3 py-2 text-xs text-zinc-100"
          >
            {tours.map((t: any) => (
              <option key={t.id} value={t.id}>
                {t.code} — {t.title} ({t.boardedCount}/{t.passengers?.length || 0} Bindi)
              </option>
            ))}
          </select>
          {activeTour && (
            <a
              href={`/api/tur?section=manifesto_pdf&tourId=${encodeURIComponent(activeTour.id)}`}
              className="flex items-center gap-1 rounded-lg bg-emerald-500/15 px-3 py-2 text-xs font-medium text-[#34D399]"
            >
              <Download className="h-3.5 w-3.5" /> Manifesto PDF
            </a>
          )}
        </div>

        {/* Yolcu Listesi & Tek Tıkla Yoklama */}
        {loading && !data ? (
          <div className="rounded-xl border border-white/[0.08] bg-[#111513] p-8 text-center text-xs text-zinc-400">
            Tur yolcu listesi yükleniyor...
          </div>
        ) : activeTour ? (
          <>
            <div className="space-y-2">
              {(activeTour.passengers || []).map((p: any) => (
                <div
                  key={p.id}
                  className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-white/[0.08] bg-[#111513] p-3"
                >
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="rounded bg-emerald-500/20 px-2 py-0.5 font-mono text-xs font-bold text-[#34D399]">
                        K:{p.seatNumber || '-'}
                      </span>
                      <strong className="text-sm text-white">{p.fullName}</strong>
                    </div>
                    <div className="mt-0.5 text-[11px] text-zinc-400">
                      Durak: {p.pickupStopLabel} · {p.phone || '-'}
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span
                      className={`rounded-full border px-2 py-0.5 text-[10px] ${
                        TOUR_BOARDING_STATUS_BADGES[p.boardingStatus] || 'border-white/10'
                      }`}
                    >
                      {TOUR_BOARDING_STATUS_LABELS[p.boardingStatus] || p.boardingStatus}
                    </span>
                    <button
                      type="button"
                      onClick={() => handleToggleBoarding(p, 'BOARDED')}
                      className="rounded-lg bg-[#34D399] px-2.5 py-1.5 text-xs font-semibold text-[#080A09]"
                    >
                      Bindi
                    </button>
                    <button
                      type="button"
                      onClick={() => handleToggleBoarding(p, 'NO_SHOW')}
                      className="rounded-lg bg-rose-500/20 px-2.5 py-1.5 text-xs text-rose-300"
                    >
                      Gelmedi
                    </button>
                  </div>
                </div>
              ))}
            </div>

            {/* Saha Tahsilatı & Acil Not */}
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <form
                onSubmit={handleFieldCollection}
                className="space-y-2.5 rounded-xl border border-emerald-500/30 bg-[#111513] p-4"
              >
                <div className="flex items-center gap-1.5 text-xs font-semibold text-[#34D399]">
                  <CreditCard className="h-4 w-4" /> Saha Ödeme Tahsilatı
                </div>
                <select
                  required
                  value={collectBookingId}
                  onChange={(e) => setCollectBookingId(e.target.value)}
                  className="w-full rounded-lg border border-white/[0.1] bg-[#0B0E0D] px-2.5 py-2 text-xs text-zinc-100"
                >
                  <option value="">Açık bakiyeli rezervasyon seç...</option>
                  {(activeTour.bookings || [])
                    .filter((b: any) => Number(b.balanceDueTry || 0) > 0)
                    .map((b: any) => (
                      <option key={b.id} value={b.id}>
                        {b.bookingNo} ({b.groupName || 'Yolcu'}) — Bakiye: {b.balanceDueTry} ₺
                      </option>
                    ))}
                </select>
                <div className="flex gap-2">
                  <input
                    type="number"
                    min={1}
                    value={collectAmount}
                    onChange={(e) => setCollectAmount(Number(e.target.value))}
                    className="w-28 rounded-lg border border-white/[0.1] bg-[#0B0E0D] px-2.5 py-2 text-xs text-zinc-100"
                  />
                  <select
                    value={collectMethod}
                    onChange={(e) => setCollectMethod(e.target.value)}
                    className="flex-1 rounded-lg border border-white/[0.1] bg-[#0B0E0D] px-2.5 py-2 text-xs text-zinc-100"
                  >
                    <option value="Saha Nakit (Rehber)">Saha Nakit</option>
                    <option value="Mobil POS Kart">Mobil POS Kart</option>
                  </select>
                </div>
                <button
                  type="submit"
                  className="w-full rounded-lg bg-[#34D399] py-2 text-xs font-semibold text-[#080A09]"
                >
                  Tahsilatı Kaydet
                </button>
              </form>

              <form
                onSubmit={handleSaveEmergencyNote}
                className="space-y-2.5 rounded-xl border border-amber-500/30 bg-[#111513] p-4"
              >
                <div className="flex items-center gap-1.5 text-xs font-semibold text-amber-300">
                  <AlertTriangle className="h-4 w-4" /> Acil Saha Notu / Operasyon Bildirimi
                </div>
                <textarea
                  required
                  rows={3}
                  value={emergencyNote}
                  onChange={(e) => setEmergencyNote(e.target.value)}
                  placeholder="Gecikme, durak değişikliği veya acil yolcu notunu yazın..."
                  className="w-full rounded-lg border border-white/[0.1] bg-[#0B0E0D] p-2.5 text-xs text-zinc-100"
                />
                <button
                  type="submit"
                  className="w-full rounded-lg bg-amber-400 py-2 text-xs font-semibold text-[#080A09]"
                >
                  Saha Notunu Kaydet
                </button>
              </form>
            </div>
          </>
        ) : (
          <div className="rounded-xl border border-white/[0.08] bg-[#111513] p-8 text-center text-xs text-zinc-400">
            Atanmış aktif tur bulunmuyor.
          </div>
        )}
      </div>
    </div>
  );
}
