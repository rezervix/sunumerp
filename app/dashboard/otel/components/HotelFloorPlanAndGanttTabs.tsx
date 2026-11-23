'use client';

import React, { useMemo, useState } from 'react';
import {
  AlertTriangle,
  Building2,
  Calendar,
  CheckCircle2,
  CreditCard,
  Plus,
  Search,
  ShieldCheck,
  Wrench,
} from 'lucide-react';
import { toast } from 'sonner';
import {
  HOTEL_ROOM_STATUSES,
  HOTEL_ROOM_STATUS_BADGES,
  HOTEL_ROOM_STATUS_LABELS,
  type HotelRoomStatus,
} from '@/lib/tourism/otel/constantsAndHelpers';

interface FloorPlanProps {
  rooms: any[];
  roomTypes: any[];
  demoCompanyId: string;
  onRefresh: () => void;
  onQuickReserveRoom: (roomId: string, dateKey?: string) => void;
  onOpenFolioForReservation: (reservationId: string) => void;
}

export function HotelFloorPlanTab({
  rooms,
  roomTypes,
  demoCompanyId,
  onRefresh,
  onQuickReserveRoom,
  onOpenFolioForReservation,
}: FloorPlanProps) {
  const [floorFilter, setFloorFilter] = useState<string>('ALL');
  const [typeFilter, setTypeFilter] = useState<string>('ALL');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [search, setSearch] = useState<string>('');
  const [updatingRoomId, setUpdatingRoomId] = useState<string | null>(null);

  const floors = useMemo(() => {
    const set = new Set<number>();
    for (const r of rooms) set.add(Number(r.floorNumber || 1));
    return Array.from(set).sort((a, b) => a - b);
  }, [rooms]);

  const filteredRooms = useMemo(() => {
    const q = search.trim().toLowerCase();
    return rooms.filter((r) => {
      if (floorFilter !== 'ALL' && Number(r.floorNumber) !== Number(floorFilter)) return false;
      if (typeFilter !== 'ALL' && r.roomTypeId !== typeFilter) return false;
      if (statusFilter !== 'ALL' && r.status !== statusFilter) return false;
      if (
        q &&
        !String(r.roomNumber).toLowerCase().includes(q) &&
        !String(r.roomTypeName || '').toLowerCase().includes(q) &&
        !String(r.activeStaySummary?.reservationNo || '').toLowerCase().includes(q)
      ) {
        return false;
      }
      return true;
    });
  }, [rooms, floorFilter, typeFilter, statusFilter, search]);

  const roomsByFloor = useMemo(() => {
    const map = new Map<number, any[]>();
    for (const r of filteredRooms) {
      const f = Number(r.floorNumber || 1);
      const arr = map.get(f) || [];
      arr.push(r);
      map.set(f, arr);
    }
    return Array.from(map.entries()).sort((a, b) => a[0] - b[0]);
  }, [filteredRooms]);

  const statusCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const s of HOTEL_ROOM_STATUSES) counts[s] = 0;
    for (const r of rooms) counts[r.status] = (counts[r.status] || 0) + 1;
    return counts;
  }, [rooms]);

  const handleStatusChange = async (roomId: string, nextStatus: HotelRoomStatus) => {
    setUpdatingRoomId(roomId);
    try {
      const res = await fetch('/api/otel', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'update_room_status',
          roomId,
          status: nextStatus,
          demoCompanyId,
        }),
      });
      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error || 'Oda durumu güncellenemedi.');
      }
      toast.success(
        `Oda ${json.room?.roomNumber || ''} durumu "${HOTEL_ROOM_STATUS_LABELS[nextStatus]}" olarak güncellendi.`
      );
      onRefresh();
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setUpdatingRoomId(null);
    }
  };

  return (
    <div className="space-y-4">
      {/* Durum Özeti & Renk Açıklaması */}
      <div className="flex flex-wrap gap-2 rounded-xl border border-white/[0.08] bg-[#111513] p-3">
        <button
          type="button"
          onClick={() => setStatusFilter('ALL')}
          className={`rounded-lg border px-2.5 py-1 text-xs font-medium transition ${
            statusFilter === 'ALL'
              ? 'border-[#34D399] bg-emerald-500/20 text-[#34D399]'
              : 'border-white/[0.08] bg-[#161B18] text-zinc-300 hover:border-white/20'
          }`}
        >
          Tümü ({rooms.length})
        </button>
        {HOTEL_ROOM_STATUSES.map((st) => (
          <button
            key={st}
            type="button"
            onClick={() => setStatusFilter(statusFilter === st ? 'ALL' : st)}
            className={`rounded-lg border px-2.5 py-1 text-xs font-medium transition ${
              HOTEL_ROOM_STATUS_BADGES[st]
            } ${statusFilter === st ? 'ring-2 ring-white/40' : 'opacity-85 hover:opacity-100'}`}
          >
            {HOTEL_ROOM_STATUS_LABELS[st]} ({statusCounts[st] || 0})
          </button>
        ))}
      </div>

      {/* Filtre Çubuğu */}
      <div className="flex flex-wrap items-center gap-3 rounded-xl border border-white/[0.08] bg-[#111513] p-3">
        <div className="flex flex-wrap items-center gap-1.5">
          <button
            type="button"
            onClick={() => setFloorFilter('ALL')}
            className={`rounded-lg px-3 py-1.5 text-xs font-medium transition ${
              floorFilter === 'ALL'
                ? 'bg-[#34D399] text-[#080A09]'
                : 'bg-[#161B18] text-zinc-300 hover:bg-white/[0.06]'
            }`}
          >
            Tüm Katlar
          </button>
          {floors.map((f) => (
            <button
              key={f}
              type="button"
              onClick={() => setFloorFilter(String(f))}
              className={`rounded-lg px-3 py-1.5 text-xs font-medium transition ${
                floorFilter === String(f)
                  ? 'bg-[#34D399] text-[#080A09]'
                  : 'bg-[#161B18] text-zinc-300 hover:bg-white/[0.06]'
              }`}
            >
              {f}. Kat
            </button>
          ))}
        </div>

        <select
          value={typeFilter}
          onChange={(e) => setTypeFilter(e.target.value)}
          className="rounded-lg border border-white/[0.1] bg-[#0B0E0D] px-3 py-1.5 text-xs text-zinc-200 focus:border-[#34D399] focus:outline-none"
        >
          <option value="ALL">Tüm Oda Tipleri</option>
          {roomTypes.map((rt) => (
            <option key={rt.id} value={rt.id}>
              {rt.name} ({rt.code})
            </option>
          ))}
        </select>

        <div className="relative ml-auto min-w-[200px] flex-1 sm:flex-none">
          <Search className="pointer-events-none absolute left-2.5 top-2 h-3.5 w-3.5 text-zinc-500" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Oda no, tip veya rez. ara..."
            className="w-full rounded-lg border border-white/[0.1] bg-[#0B0E0D] py-1.5 pl-8 pr-3 text-xs text-zinc-200 placeholder:text-zinc-500 focus:border-[#34D399] focus:outline-none"
          />
        </div>
      </div>

      {/* Kat Bazlı Etkileşimli Oda Kartları */}
      {roomsByFloor.length === 0 ? (
        <div className="rounded-xl border border-white/[0.08] bg-[#111513] p-8 text-center text-sm text-zinc-400">
          Seçilen filtrelere uygun oda bulunamadı.
        </div>
      ) : (
        roomsByFloor.map(([floorNum, floorRooms]) => (
          <div
            key={floorNum}
            className="space-y-3 rounded-xl border border-white/[0.08] bg-[#111513] p-4"
          >
            <div className="flex items-center justify-between border-b border-white/[0.06] pb-2">
              <div className="flex items-center gap-2">
                <Building2 className="h-4 w-4 text-[#34D399]" />
                <h3 className="text-sm font-semibold text-zinc-100">
                  {floorNum}. Kat — {floorRooms.length} Oda
                </h3>
              </div>
              <span className="text-xs text-zinc-400">
                Satışa Hazır:{' '}
                <strong className="text-[#34D399]">
                  {floorRooms.filter((r) => r.status === 'CLEAN_VACANT').length}
                </strong>{' '}
                · Dolu:{' '}
                <strong className="text-sky-300">
                  {floorRooms.filter((r) => r.status === 'OCCUPIED').length}
                </strong>{' '}
                · Kirli/Temizlik:{' '}
                <strong className="text-amber-300">
                  {
                    floorRooms.filter(
                      (r) =>
                        r.status === 'DIRTY_VACANT' ||
                        r.status === 'CLEANING_IN_PROGRESS' ||
                        r.status === 'INSPECTION_PENDING'
                    ).length
                  }
                </strong>
              </span>
            </div>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-5">
              {floorRooms.map((room) => {
                const st = (room.status || 'CLEAN_VACANT') as HotelRoomStatus;
                const badgeClass =
                  HOTEL_ROOM_STATUS_BADGES[st] || HOTEL_ROOM_STATUS_BADGES.CLEAN_VACANT;
                const isBusy = updatingRoomId === room.id;

                return (
                  <div
                    key={room.id}
                    className={`flex flex-col justify-between rounded-xl border p-3 transition ${badgeClass}`}
                  >
                    <div>
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <span className="text-lg font-bold tracking-tight text-white">
                            {room.roomNumber}
                          </span>
                          <p className="text-[11px] text-zinc-200/80">{room.roomTypeName}</p>
                        </div>
                        <span className="rounded bg-black/30 px-1.5 py-0.5 text-[10px] font-medium">
                          {room.wingOrSection}
                        </span>
                      </div>

                      <div className="mt-2 text-[11px] font-medium">
                        {HOTEL_ROOM_STATUS_LABELS[st]}
                      </div>

                      {room.activeStaySummary && (
                        <div className="mt-2 rounded-lg bg-black/30 p-2 text-[11px] text-zinc-200">
                          <div className="font-mono text-[10px] text-sky-300">
                            {room.activeStaySummary.reservationNo}
                          </div>
                          <div className="mt-0.5 flex items-center justify-between text-[10px] text-zinc-300">
                            <span>
                              Çıkış: {String(room.activeStaySummary.checkOutDate).slice(0, 10)}
                            </span>
                            {Number(room.activeStaySummary.balanceDueTry || 0) > 0 && (
                              <span className="font-semibold text-amber-300">
                                {Number(room.activeStaySummary.balanceDueTry).toLocaleString(
                                  'tr-TR'
                                )}{' '}
                                ₺
                              </span>
                            )}
                          </div>
                        </div>
                      )}

                      {!room.activeStaySummary && room.notes && (
                        <p className="mt-2 line-clamp-2 text-[10px] text-zinc-200/75">
                          {room.notes}
                        </p>
                      )}
                    </div>

                    {/* Tek Tıkla Durum Değiştirme & Hızlı Aksiyonlar */}
                    <div className="mt-3 space-y-1.5 border-t border-white/10 pt-2">
                      <select
                        disabled={isBusy}
                        value={st}
                        onChange={(e) =>
                          handleStatusChange(room.id, e.target.value as HotelRoomStatus)
                        }
                        className="w-full rounded-md border border-white/15 bg-black/40 px-2 py-1 text-[11px] text-white focus:border-[#34D399] focus:outline-none"
                      >
                        {HOTEL_ROOM_STATUSES.map((opt) => (
                          <option key={opt} value={opt} className="bg-[#111513] text-zinc-100">
                            {HOTEL_ROOM_STATUS_LABELS[opt]}
                          </option>
                        ))}
                      </select>

                      <div className="flex gap-1.5">
                        {room.activeStaySummary ? (
                          <button
                            type="button"
                            onClick={() =>
                              onOpenFolioForReservation(room.activeStaySummary.reservationId)
                            }
                            className="flex flex-1 items-center justify-center gap-1 rounded-md bg-black/40 px-2 py-1 text-[10px] font-medium text-white hover:bg-black/60"
                          >
                            <CreditCard className="h-3 w-3" /> Folio
                          </button>
                        ) : st === 'CLEAN_VACANT' ? (
                          <button
                            type="button"
                            onClick={() => onQuickReserveRoom(room.id)}
                            className="flex flex-1 items-center justify-center gap-1 rounded-md bg-emerald-500/30 px-2 py-1 text-[10px] font-medium text-white hover:bg-emerald-500/45"
                          >
                            <Plus className="h-3 w-3" /> Rezerve Et
                          </button>
                        ) : st === 'INSPECTION_PENDING' || st === 'DIRTY_VACANT' ? (
                          <button
                            type="button"
                            disabled={isBusy}
                            onClick={() => handleStatusChange(room.id, 'CLEAN_VACANT')}
                            className="flex flex-1 items-center justify-center gap-1 rounded-md bg-emerald-500/30 px-2 py-1 text-[10px] font-medium text-white hover:bg-emerald-500/45"
                          >
                            <CheckCircle2 className="h-3 w-3" /> Temiz Onayla
                          </button>
                        ) : (
                          <button
                            type="button"
                            disabled={isBusy}
                            onClick={() => handleStatusChange(room.id, 'CLEAN_VACANT')}
                            className="flex flex-1 items-center justify-center gap-1 rounded-md bg-black/40 px-2 py-1 text-[10px] font-medium text-white hover:bg-black/60"
                          >
                            <Wrench className="h-3 w-3" /> Hazıra Al
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ))
      )}
    </div>
  );
}

interface GanttProps {
  gantt: { dateHeaders: string[]; rows: any[] };
  conflictLogs: any[];
  ganttStartDate: string;
  onChangeStartDate: (next: string) => void;
  onQuickReserveCell: (roomId: string, dateKey: string) => void;
}

export function HotelAvailabilityGanttTab({
  gantt,
  conflictLogs,
  ganttStartDate,
  onChangeStartDate,
  onQuickReserveCell,
}: GanttProps) {
  const [floorFilter, setFloorFilter] = useState<string>('ALL');

  const rows = useMemo(() => {
    const list = gantt?.rows || [];
    if (floorFilter === 'ALL') return list;
    return list.filter((r) => Number(r.floorNumber) === Number(floorFilter));
  }, [gantt, floorFilter]);

  const dateHeaders = gantt?.dateHeaders || [];

  return (
    <div className="space-y-4">
      {/* Üst Kontrol Barı */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-white/[0.08] bg-[#111513] p-4">
        <div className="flex items-center gap-2">
          <Calendar className="h-4 w-4 text-[#34D399]" />
          <div>
            <h3 className="text-sm font-semibold text-zinc-100">
              Oda × Gün Rezervasyon Takvimi (Gantt)
            </h3>
            <p className="text-xs text-zinc-400">
              Boş bir güne tıklayarak o oda ve tarih için atomik çift rezervasyon kilitli kayıt açabilirsiniz.
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <label className="text-xs text-zinc-400">Başlangıç:</label>
          <input
            type="date"
            value={ganttStartDate}
            onChange={(e) => onChangeStartDate(e.target.value)}
            className="rounded-lg border border-white/[0.1] bg-[#0B0E0D] px-2.5 py-1.5 text-xs text-zinc-200"
          />
          <select
            value={floorFilter}
            onChange={(e) => setFloorFilter(e.target.value)}
            className="rounded-lg border border-white/[0.1] bg-[#0B0E0D] px-2.5 py-1.5 text-xs text-zinc-200"
          >
            <option value="ALL">Tüm Katlar ({gantt?.rows?.length || 0} Oda)</option>
            {[1, 2, 3, 4, 5].map((f) => (
              <option key={f} value={String(f)}>
                {f}. Kat
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Gantt Matrisi */}
      <div className="overflow-x-auto rounded-xl border border-white/[0.08] bg-[#111513]">
        <table className="w-full min-w-[920px] border-collapse text-xs">
          <thead>
            <tr className="border-b border-white/[0.08] bg-[#161B18] text-zinc-400">
              <th className="sticky left-0 z-10 bg-[#161B18] px-3 py-2.5 text-left font-medium">
                Oda / Tip
              </th>
              {dateHeaders.map((dk) => (
                <th key={dk} className="px-1.5 py-2.5 text-center font-mono text-[10px]">
                  {dk.slice(5)}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-white/[0.05]">
            {rows.map((row) => (
              <tr key={row.roomId} className="hover:bg-white/[0.02]">
                <td className="sticky left-0 z-10 border-r border-white/[0.06] bg-[#111513] px-3 py-2">
                  <div className="font-semibold text-zinc-100">Oda {row.roomNumber}</div>
                  <div className="text-[10px] text-zinc-400">{row.roomTypeName}</div>
                </td>
                {row.days.map((cell: any) => {
                  if (cell.status === 'CHECKED_IN') {
                    return (
                      <td key={cell.dateKey} className="p-1">
                        <div
                          title={`${cell.reservationNo} — ${cell.guestLabel} (Konaklıyor)`}
                          className="truncate rounded bg-sky-500/25 px-1.5 py-1.5 text-center text-[10px] font-medium text-sky-200 ring-1 ring-sky-500/40"
                        >
                          {cell.guestLabel?.split(' ')[0] || 'Dolu'}
                        </div>
                      </td>
                    );
                  }
                  if (cell.status === 'CONFIRMED') {
                    return (
                      <td key={cell.dateKey} className="p-1">
                        <div
                          title={`${cell.reservationNo} — ${cell.guestLabel} (Onaylı)`}
                          className="truncate rounded bg-amber-500/20 px-1.5 py-1.5 text-center text-[10px] font-medium text-amber-200 ring-1 ring-amber-500/35"
                        >
                          Rez
                        </div>
                      </td>
                    );
                  }
                  if (cell.status === 'MAINTENANCE') {
                    return (
                      <td key={cell.dateKey} className="p-1">
                        <div
                          title="Bakım / Arıza — Rezervasyon Kilitli"
                          className="rounded bg-rose-500/20 px-1.5 py-1.5 text-center text-[10px] font-medium text-rose-300 ring-1 ring-rose-500/35"
                        >
                          Bakım
                        </div>
                      </td>
                    );
                  }
                  return (
                    <td key={cell.dateKey} className="p-1">
                      <button
                        type="button"
                        onClick={() => onQuickReserveCell(row.roomId, cell.dateKey)}
                        title={`Oda ${row.roomNumber} · ${cell.dateKey} — Müsait (Hızlı Rezervasyon)`}
                        className="w-full rounded bg-emerald-500/10 px-1.5 py-1.5 text-center text-[10px] text-[#34D399]/70 transition hover:bg-emerald-500/25 hover:text-[#34D399]"
                      >
                        Boş
                      </button>
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Sunucu Tarafı Çakışma & Kontenjan Aşım Günlüğü */}
      <div className="rounded-xl border border-white/[0.08] bg-[#111513] p-4">
        <div className="mb-3 flex items-center gap-2">
          <ShieldCheck className="h-4 w-4 text-[#34D399]" />
          <h4 className="text-sm font-semibold text-zinc-100">
            Sunucu Tarafı Engellenen Çift Rezervasyon, Bakım ve Kontenjan Aşım Günlüğü (
            {conflictLogs.length})
          </h4>
        </div>
        {conflictLogs.length === 0 ? (
          <p className="text-xs text-zinc-400">Henüz engellenmiş çakışma kaydı yok.</p>
        ) : (
          <div className="space-y-2">
            {conflictLogs.slice(0, 12).map((log) => (
              <div
                key={log.id}
                className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-rose-500/20 bg-rose-500/5 px-3 py-2 text-xs"
              >
                <div className="flex items-center gap-2">
                  <AlertTriangle className="h-3.5 w-3.5 shrink-0 text-rose-400" />
                  <span className="font-mono text-[11px] font-semibold text-rose-300">
                    {log.rejectionCode}
                  </span>
                  <span className="text-zinc-200">{log.rejectionMessage}</span>
                </div>
                <span className="font-mono text-[10px] text-zinc-500">
                  Oda {log.roomNumber} · {String(log.attemptedAt || '').slice(0, 16).replace('T', ' ')}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
