'use client';

import React, { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import {
  ArrowLeft,
  CheckCircle2,
  ClipboardCheck,
  RefreshCw,
  ShieldCheck,
  Smartphone,
  Wifi,
  WifiOff,
  Wrench,
} from 'lucide-react';
import { toast } from 'sonner';
import {
  HOTEL_HK_STATUS_BADGES,
  HOTEL_HK_STATUS_LABELS,
  HOTEL_HK_TASK_TYPE_LABELS,
} from '@/lib/tourism/otel/constantsAndHelpers';
import {
  enqueueOfflineHousekeepingOperation,
  getOfflineHousekeepingQueue,
  syncAllOfflineHousekeepingOperations,
  type OfflineHousekeepingOperation,
} from '@/lib/tourism/otel/housekeepingOfflineSync';

export default function HotelHousekeepingMobilePage() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [isOnline, setIsOnline] = useState<boolean>(true);
  const [simulatedOffline, setSimulatedOffline] = useState<boolean>(false);
  const [pendingQueue, setPendingQueue] = useState<OfflineHousekeepingOperation[]>([]);
  const [syncing, setSyncing] = useState<boolean>(false);

  // Hızlı Teknik Arıza Formu
  const [faultRoomId, setFaultRoomId] = useState<string>('');
  const [faultCategory, setFaultCategory] = useState<string>('TESISAT_SU');
  const [faultDescription, setFaultDescription] = useState<string>('');
  const [markOutOfOrder, setMarkOutOfOrder] = useState<boolean>(false);

  const effectiveOnline = isOnline && !simulatedOffline;

  const refreshQueue = useCallback(async () => {
    const items = await getOfflineHousekeepingQueue();
    setPendingQueue(items.filter((i) => i.syncStatus === 'QUEUED_OFFLINE' || i.syncStatus === 'ERROR'));
  }, []);

  const loadTasks = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/otel?section=housekeeping_mobile', { cache: 'no-store' });
      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error || 'Housekeeping görevleri yüklenemedi.');
      }
      setData(json);
      if (!faultRoomId && json.rooms?.[0]?.id) {
        setFaultRoomId(json.rooms[0].id);
      }
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  }, [faultRoomId]);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      setIsOnline(navigator.onLine);
      const onOnline = () => setIsOnline(true);
      const onOffline = () => setIsOnline(false);
      window.addEventListener('online', onOnline);
      window.addEventListener('offline', onOffline);
      return () => {
        window.removeEventListener('online', onOnline);
        window.removeEventListener('offline', onOffline);
      };
    }
  }, []);

  useEffect(() => {
    loadTasks();
    refreshQueue();
  }, [loadTasks, refreshQueue]);

  const handleSyncQueue = async () => {
    if (!effectiveOnline) {
      toast.error('Senkronizasyon için önce çevrimiçi moda geçin.');
      return;
    }
    setSyncing(true);
    try {
      const res = await syncAllOfflineHousekeepingOperations();
      await refreshQueue();
      await loadTasks();
      toast.success(
        `Çevrimdışı kuyruk senkronize edildi: ${res.syncedCount} başarılı, ${res.duplicateIgnoredCount} tekrar atlandı.`
      );
    } catch (err: any) {
      toast.error(err.message || 'Senkronizasyon sırasında hata oluştu.');
    } finally {
      setSyncing(false);
    }
  };

  const handleTaskAction = async (task: any, nextStatus: 'IN_PROGRESS' | 'COMPLETED') => {
    const idempotencyKey = `hk-${task.id}-${nextStatus}-${Date.now()}`;

    if (!effectiveOnline) {
      await enqueueOfflineHousekeepingOperation({
        taskId: task.id,
        roomId: task.roomId,
        roomNumber: task.roomNumber,
        operationType: nextStatus === 'IN_PROGRESS' ? 'START_CLEANING' : 'COMPLETE_CLEANING',
        notes: `Çevrimdışı mobil güncelleme (${nextStatus})`,
      });
      await refreshQueue();
      toast.info(
        `Çevrimdışı kuyruğa kaydedildi: Oda ${task.roomNumber} → ${HOTEL_HK_STATUS_LABELS[nextStatus]}`
      );
      return;
    }

    try {
      const res = await fetch('/api/otel', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'update_housekeeping_task',
          taskId: task.id,
          status: nextStatus,
          offlineIdempotencyKey: idempotencyKey,
        }),
      });
      const json = await res.json();
      if (!res.ok || !json.success) throw new Error(json.error || 'Görev güncellenemedi.');
      toast.success(`Oda ${task.roomNumber}: ${HOTEL_HK_STATUS_LABELS[nextStatus]}`);
      loadTasks();
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  const handleReportFault = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!faultRoomId || !faultDescription.trim()) return;
    const room = (data?.rooms || []).find((r: any) => r.id === faultRoomId);
    const idempotencyKey = `flt-${faultRoomId}-${Date.now()}`;

    if (!effectiveOnline) {
      await enqueueOfflineHousekeepingOperation({
        roomId: faultRoomId,
        roomNumber: room?.roomNumber || '-',
        operationType: 'REPORT_FAULT',
        faultCategory,
        faultDescription,
      });
      await refreshQueue();
      setFaultDescription('');
      toast.info(`Arıza bildirimi çevrimdışı kuyruğa alındı (Oda ${room?.roomNumber || ''}).`);
      return;
    }

    try {
      const res = await fetch('/api/otel', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'report_room_fault',
          roomId: faultRoomId,
          faultCategory,
          faultDescription,
          markRoomOutOfOrder: markOutOfOrder,
          offlineIdempotencyKey: idempotencyKey,
        }),
      });
      const json = await res.json();
      if (!res.ok || !json.success) throw new Error(json.error || 'Arıza kaydedilemedi.');
      toast.success(`Teknik arıza bildirildi: Oda ${room?.roomNumber || ''}`);
      setFaultDescription('');
      loadTasks();
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  const tasks = data?.tasks || [];
  const rooms = data?.rooms || [];
  const summary = data?.summary || {};
  const isRestricted = Boolean(data?.isRestrictedHousekeeper);

  return (
    <div className="min-h-screen bg-[#080A09] p-4 text-zinc-100">
      <div className="mx-auto max-w-3xl space-y-4">
        {/* Mobil Başlık & Bağlantı Durumu */}
        <div className="rounded-2xl border border-white/[0.08] bg-[#111513] p-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <Smartphone className="h-5 w-5 text-[#34D399]" />
              <div>
                <h1 className="text-lg font-bold text-white">Kat Hizmetleri Mobil Görev Ekranı</h1>
                <p className="text-[11px] text-zinc-400">
                  Personel: <strong className="text-zinc-200">{data?.staffUser?.username || '-'}</strong>
                  {isRestricted && ' · Kısıtlı Rol (Yalnızca Atanan Odalar)'}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              {!isRestricted && (
                <Link
                  href="/dashboard/otel"
                  className="flex items-center gap-1 rounded-lg border border-white/[0.1] bg-[#161B18] px-2.5 py-1.5 text-xs text-zinc-200"
                >
                  <ArrowLeft className="h-3.5 w-3.5" /> Ön Büro
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
              <span>
                Güvenlik izolasyonu aktif: Yalnızca size atanmış temizlik görevlerini görebilirsiniz; misafir kimlik/KVKK, rezervasyon ve folio kayıtlarına erişim kapalıdır.
              </span>
            </div>
          )}
        </div>

        {/* Çevrimdışı Senkron Kuyruğu Çubuğu */}
        {pendingQueue.length > 0 && (
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-amber-500/40 bg-amber-500/10 p-3 text-xs">
            <div className="text-amber-200">
              <strong>{pendingQueue.length} çevrimdışı işlem</strong> cihazda (IndexedDB/LocalStorage) senkronizasyon bekliyor.
            </div>
            <button
              type="button"
              disabled={syncing || !effectiveOnline}
              onClick={handleSyncQueue}
              className="flex items-center gap-1.5 rounded-lg bg-[#34D399] px-3 py-1.5 font-semibold text-[#080A09] disabled:opacity-50"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${syncing ? 'animate-spin' : ''}`} />
              Senkronize Et
            </button>
          </div>
        )}

        {/* Özet Kartları */}
        <div className="grid grid-cols-3 gap-2">
          <div className="rounded-xl border border-white/[0.08] bg-[#111513] p-3 text-center">
            <div className="text-[11px] text-zinc-400">Bekleyen</div>
            <div className="text-xl font-bold text-amber-300">{summary.pendingCount ?? 0}</div>
          </div>
          <div className="rounded-xl border border-white/[0.08] bg-[#111513] p-3 text-center">
            <div className="text-[11px] text-zinc-400">İşlemde</div>
            <div className="text-xl font-bold text-sky-300">{summary.inProgressCount ?? 0}</div>
          </div>
          <div className="rounded-xl border border-white/[0.08] bg-[#111513] p-3 text-center">
            <div className="text-[11px] text-zinc-400">Tamamlandı</div>
            <div className="text-xl font-bold text-[#34D399]">
              {(summary.completedCount ?? 0) + (summary.inspectedCount ?? 0)}
            </div>
          </div>
        </div>

        {/* Atanan Oda Görev Kartları */}
        <div className="space-y-3">
          {loading && !data ? (
            <div className="rounded-xl border border-white/[0.08] bg-[#111513] p-8 text-center text-xs text-zinc-400">
              Görevler yükleniyor...
            </div>
          ) : tasks.length === 0 ? (
            <div className="rounded-xl border border-white/[0.08] bg-[#111513] p-8 text-center text-xs text-zinc-400">
              Şu anda size atanmış aktif oda görevi bulunmuyor.
            </div>
          ) : (
            tasks.map((t: any) => (
              <div
                key={t.id}
                className="rounded-xl border border-white/[0.08] bg-[#111513] p-4 space-y-3"
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-lg font-bold text-white">Oda {t.roomNumber}</span>
                      <span className="rounded bg-white/[0.06] px-2 py-0.5 text-[10px] text-zinc-300">
                        {t.floorNumber}. Kat
                      </span>
                    </div>
                    <div className="text-xs text-zinc-300">
                      {HOTEL_HK_TASK_TYPE_LABELS[t.taskType] || t.taskType}
                    </div>
                    <div className="font-mono text-[10px] text-zinc-500">{t.taskNo}</div>
                  </div>
                  <span
                    className={`rounded-full border px-2.5 py-0.5 text-[10px] font-medium ${
                      HOTEL_HK_STATUS_BADGES[t.status] || 'border-white/10 text-zinc-300'
                    }`}
                  >
                    {HOTEL_HK_STATUS_LABELS[t.status] || t.status}
                  </span>
                </div>

                {(t.notes || t.faultDescription) && (
                  <p className="rounded-lg bg-[#0B0E0D] p-2.5 text-xs text-zinc-300">
                    {t.faultDescription || t.notes}
                  </p>
                )}

                <div className="flex flex-wrap gap-2">
                  {t.status === 'PENDING' && (
                    <button
                      type="button"
                      onClick={() => handleTaskAction(t, 'IN_PROGRESS')}
                      className="flex flex-1 items-center justify-center gap-1.5 rounded-xl bg-sky-500/25 py-2.5 text-xs font-semibold text-sky-200 hover:bg-sky-500/40"
                    >
                      <ClipboardCheck className="h-4 w-4" /> Temizliğe Başla
                    </button>
                  )}
                  {(t.status === 'PENDING' || t.status === 'IN_PROGRESS') && (
                    <button
                      type="button"
                      onClick={() => handleTaskAction(t, 'COMPLETED')}
                      className="flex flex-1 items-center justify-center gap-1.5 rounded-xl bg-[#34D399] py-2.5 text-xs font-semibold text-[#080A09] hover:bg-emerald-300"
                    >
                      <CheckCircle2 className="h-4 w-4" /> Temizliği Tamamla
                    </button>
                  )}
                  {t.status === 'COMPLETED' && (
                    <div className="w-full rounded-lg border border-purple-500/30 bg-purple-500/10 py-2 text-center text-xs text-purple-200">
                      Kat şefi denetim onayı bekleniyor (INSPECTION_PENDING).
                    </div>
                  )}
                </div>
              </div>
            ))
          )}
        </div>

        {/* Hızlı Teknik Arıza Bildirimi (Çevrimdışı Destekli) */}
        {rooms.length > 0 && (
          <form
            onSubmit={handleReportFault}
            className="space-y-3 rounded-2xl border border-orange-500/30 bg-[#111513] p-4"
          >
            <div className="flex items-center gap-2 text-sm font-semibold text-orange-300">
              <Wrench className="h-4 w-4" /> Hızlı Teknik Arıza Bildir
            </div>
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              <select
                value={faultRoomId}
                onChange={(e) => setFaultRoomId(e.target.value)}
                className="rounded-lg border border-white/[0.1] bg-[#0B0E0D] px-3 py-2 text-xs text-zinc-100"
              >
                {rooms.map((rm: any) => (
                  <option key={rm.id} value={rm.id}>
                    Oda {rm.roomNumber} ({rm.floorNumber}. Kat)
                  </option>
                ))}
              </select>
              <select
                value={faultCategory}
                onChange={(e) => setFaultCategory(e.target.value)}
                className="rounded-lg border border-white/[0.1] bg-[#0B0E0D] px-3 py-2 text-xs text-zinc-100"
              >
                <option value="TESISAT_SU">Su / Tesisat</option>
                <option value="KLIMA_HVAC">Klima / HVAC</option>
                <option value="ELEKTRIK_AYDINLATMA">Elektrik / Aydınlatma</option>
                <option value="MOBILYA_KAPI">Mobilya / Kapı Kilidi</option>
              </select>
            </div>
            <input
              required
              value={faultDescription}
              onChange={(e) => setFaultDescription(e.target.value)}
              placeholder="Arıza detayını yazın (çevrimdışıysa cihazda kuyruğa alınır)..."
              className="w-full rounded-lg border border-white/[0.1] bg-[#0B0E0D] px-3 py-2 text-xs text-zinc-100"
            />
            <div className="flex flex-wrap items-center justify-between gap-2">
              <label className="flex items-center gap-2 text-xs text-zinc-300">
                <input
                  type="checkbox"
                  checked={markOutOfOrder}
                  onChange={(e) => setMarkOutOfOrder(e.target.checked)}
                />
                Odayı acil servis dışı (OUT_OF_ORDER) kapat
              </label>
              <button
                type="submit"
                className="rounded-lg bg-orange-500/25 px-4 py-2 text-xs font-semibold text-orange-200 hover:bg-orange-500/40"
              >
                Arızayı Kaydet
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
