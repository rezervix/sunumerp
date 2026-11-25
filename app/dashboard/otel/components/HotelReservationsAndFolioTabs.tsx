'use client';

import React, { useEffect, useMemo, useState } from 'react';
import {
  CheckCircle2,
  CreditCard,
  FileText,
  Plus,
  Search,
  ShieldCheck,
  Users,
  X,
} from 'lucide-react';
import { toast } from 'sonner';
import {
  HOTEL_BOARD_TYPES,
  HOTEL_BOARD_TYPE_LABELS,
  HOTEL_CHANNEL_LABELS,
  HOTEL_CHANNEL_SOURCES,
  HOTEL_FOLIO_CATEGORIES,
  HOTEL_FOLIO_CATEGORY_LABELS,
  HOTEL_FOLIO_GROUPS,
  HOTEL_FOLIO_GROUP_LABELS,
  HOTEL_RESERVATION_STATUS_BADGES,
  HOTEL_RESERVATION_STATUS_LABELS,
  type HotelFolioCategory,
  type HotelFolioGroup,
  type HotelReservationStatus,
} from '@/lib/tourism/otel/constantsAndHelpers';

interface ReservationsTabProps {
  reservations: any[];
  rooms: any[];
  guests: any[];
  allotments: any[];
  demoCompanyId: string;
  preselectedRoom?: { roomId: string; dateKey?: string } | null;
  onClearPreselectedRoom: () => void;
  onRefresh: () => void;
  onOpenFolio: (reservationId: string) => void;
}

export function HotelReservationsAndCheckInOutTab({
  reservations,
  rooms,
  guests,
  allotments,
  demoCompanyId,
  preselectedRoom,
  onClearPreselectedRoom,
  onRefresh,
  onOpenFolio,
}: ReservationsTabProps) {
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [search, setSearch] = useState<string>('');
  const [showCreateForm, setShowCreateForm] = useState<boolean>(false);
  const [submitting, setSubmitting] = useState<boolean>(false);

  // Yeni Rezervasyon Formu
  const [roomId, setRoomId] = useState<string>(rooms[0]?.id || '');
  const [customerId, setCustomerId] = useState<string>(guests[0]?.id || '');
  const [checkInDate, setCheckInDate] = useState<string>('2026-11-24');
  const [checkOutDate, setCheckOutDate] = useState<string>('2026-11-27');
  const [boardType, setBoardType] = useState<string>('BB');
  const [channelSource, setChannelSource] = useState<string>('DIRECT_WEB');
  const [allotmentId, setAllotmentId] = useState<string>('');
  const [adultsCount, setAdultsCount] = useState<number>(2);
  const [childrenCount, setChildrenCount] = useState<number>(0);

  // Check-In Modal State
  const [checkInTarget, setCheckInTarget] = useState<any | null>(null);
  const [keyCardCode, setKeyCardCode] = useState<string>('');
  const [guestTckn, setGuestTckn] = useState<string>('');
  const [guestPassportNo, setGuestPassportNo] = useState<string>('');
  const [guestNationality, setGuestNationality] = useState<string>('TR');
  const [guestBirthDate, setGuestBirthDate] = useState<string>('');
  const [overrideDirtyRoom, setOverrideDirtyRoom] = useState<boolean>(false);

  // Check-Out Modal State
  const [checkOutTarget, setCheckOutTarget] = useState<any | null>(null);
  const [settleMethod, setSettleMethod] = useState<string>('PAYMENT_CARD');

  useEffect(() => {
    if (preselectedRoom?.roomId) {
      setRoomId(preselectedRoom.roomId);
      if (preselectedRoom.dateKey) {
        setCheckInDate(preselectedRoom.dateKey);
        const nextDay = new Date(new Date(`${preselectedRoom.dateKey}T12:00:00.000Z`).getTime() + 2 * 86_400_000)
          .toISOString()
          .slice(0, 10);
        setCheckOutDate(nextDay);
      }
      setShowCreateForm(true);
      onClearPreselectedRoom();
    }
  }, [preselectedRoom, onClearPreselectedRoom]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return reservations.filter((r) => {
      if (statusFilter !== 'ALL' && r.status !== statusFilter) return false;
      if (
        q &&
        !String(r.reservationNo).toLowerCase().includes(q) &&
        !String(r.roomNumber || '').toLowerCase().includes(q) &&
        !String(r.guest?.name || '').toLowerCase().includes(q) &&
        !String(r.agencyName || '').toLowerCase().includes(q)
      ) {
        return false;
      }
      return true;
    });
  }, [reservations, statusFilter, search]);

  const handleCreateReservation = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const res = await fetch('/api/otel', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'create_reservation',
          roomId,
          customerId,
          checkInDate: `${checkInDate}T14:00:00.000Z`,
          checkOutDate: `${checkOutDate}T12:00:00.000Z`,
          boardType,
          channelSource: allotmentId ? 'AGENCY_B2B' : channelSource,
          allotmentId: allotmentId || null,
          adultsCount,
          childrenCount,
          demoCompanyId,
        }),
      });
      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error || 'Rezervasyon oluşturulamadı.');
      }
      toast.success(`Rezervasyon oluşturuldu: ${json.reservation.reservationNo}`);
      setShowCreateForm(false);
      onRefresh();
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleConfirmCheckIn = async () => {
    if (!checkInTarget) return;
    setSubmitting(true);
    try {
      const res = await fetch('/api/otel', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'check_in',
          reservationId: checkInTarget.id,
          keyCardIssuedCode: keyCardCode || undefined,
          guestTckn: guestTckn || undefined,
          guestPassportNo: guestPassportNo || undefined,
          guestNationality: guestNationality || undefined,
          guestBirthDate: guestBirthDate || undefined,
          overrideDirtyRoom,
          demoCompanyId,
        }),
      });
      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error || 'Check-In tamamlanamadı.');
      }
      toast.success(
        `Check-In tamamlandı (${json.keyCardCode}). KBS Giriş bildirimi otomatik hazırlandı.`
      );
      setCheckInTarget(null);
      onRefresh();
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleConfirmCheckOut = async () => {
    if (!checkOutTarget) return;
    setSubmitting(true);
    try {
      const res = await fetch('/api/otel', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'check_out',
          reservationId: checkOutTarget.id,
          settleRemainingPaymentMethod:
            Number(checkOutTarget.balanceDueTry || 0) > 0 && settleMethod !== 'NONE'
              ? settleMethod
              : null,
          demoCompanyId,
        }),
      });
      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error || 'Check-Out tamamlanamadı.');
      }
      toast.success(
        `Check-Out tamamlandı. Oda kirli işaretlendi, Housekeeping görevi (${
          json.housekeepingTask?.taskNo || '-'
        }) ve KBS Çıkış kaydı otomatik açıldı.`
      );
      setCheckOutTarget(null);
      onRefresh();
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleCancelReservation = async (resId: string) => {
    try {
      const res = await fetch('/api/otel', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'update_reservation',
          reservationId: resId,
          status: 'CANCELLED',
          cancelReason: 'Ön büro tarafından iptal edildi',
          demoCompanyId,
        }),
      });
      const json = await res.json();
      if (!res.ok || !json.success) throw new Error(json.error || 'İptal edilemedi.');
      toast.success('Rezervasyon iptal edildi ve kontenjan serbest bırakıldı.');
      onRefresh();
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  return (
    <div className="space-y-4">
      {/* Üst Çubuk */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-[var(--line)] bg-[var(--bg)] shadow-sm p-4">
        <div className="flex flex-wrap items-center gap-2">
          {['ALL', 'CONFIRMED', 'CHECKED_IN', 'PENDING', 'CHECKED_OUT', 'CANCELLED'].map((st) => (
            <button
              key={st}
              type="button"
              onClick={() => setStatusFilter(st)}
              className={`rounded-lg px-2.5 py-1.5 text-xs font-medium transition ${ statusFilter === st ? 'bg-[var(--brand)] text-white' : 'bg-[var(--muted-bg)] text-[var(--text-2)] hover:bg-[--muted-bg]' }`}
            >
              {st === 'ALL'
                ? `Tümü (${reservations.length})`
                : HOTEL_RESERVATION_STATUS_LABELS[st as HotelReservationStatus]}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-2">
          <div className="relative">
            <Search className="pointer-events-none absolute left-2.5 top-2 h-3.5 w-3.5 text-[var(--text-muted)]" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Rez no, oda, misafir, acenta..."
              className="rounded-lg border border-[var(--line)] bg-[var(--bg)] py-1.5 pl-8 pr-3 text-xs text-[var(--text)]"
            />
          </div>
          <button
            type="button"
            onClick={() => setShowCreateForm((v) => !v)}
            className="flex items-center gap-1.5 rounded-lg bg-[var(--brand)] px-3 py-1.5 text-xs font-semibold text-[var(--text)] hover:bg-[--brand-hover]"
          >
            <Plus className="h-3.5 w-3.5" /> Yeni Rezervasyon
          </button>
        </div>
      </div>

      {/* Yeni Rezervasyon Formu */}
      {showCreateForm && (
        <form
          onSubmit={handleCreateReservation}
          className="grid grid-cols-1 gap-3 rounded-xl border border-[--brand-line] bg-[var(--bg)] shadow-sm p-4 md:grid-cols-4"
        >
          <div className="md:col-span-4 flex items-center justify-between">
            <h4 className="text-sm font-semibold text-[var(--brand)]">
              Yeni Otel Rezervasyonu (Sunucu Tarafı Atomik Çakışma & Kontenjan Kilitli)
            </h4>
            <button
              type="button"
              onClick={() => setShowCreateForm(false)}
              className="text-[var(--text-muted)] hover:text-[var(--brand)]"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          <div>
            <label className="mb-1 block text-[11px] text-[var(--text-muted)]">Oda</label>
            <select
              value={roomId}
              onChange={(e) => setRoomId(e.target.value)}
              required
              className="w-full rounded-lg border border-[var(--line)] bg-[var(--bg)] px-2.5 py-2 text-xs text-[var(--text)]"
            >
              {rooms.map((rm) => (
                <option key={rm.id} value={rm.id}>
                  Oda {rm.roomNumber} · {rm.roomTypeName} ({rm.status})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="mb-1 block text-[11px] text-[var(--text-muted)]">Misafir (Mevcut Cari)</label>
            <select
              value={customerId}
              onChange={(e) => setCustomerId(e.target.value)}
              required
              className="w-full rounded-lg border border-[var(--line)] bg-[var(--bg)] px-2.5 py-2 text-xs text-[var(--text)]"
            >
              {guests.map((g) => (
                <option key={g.id} value={g.id}>
                  {g.name || g.company} ({g.nationality || 'TR'})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="mb-1 block text-[11px] text-[var(--text-muted)]">Giriş Tarihi</label>
            <input
              type="date"
              value={checkInDate}
              onChange={(e) => setCheckInDate(e.target.value)}
              required
              className="w-full rounded-lg border border-[var(--line)] bg-[var(--bg)] px-2.5 py-2 text-xs text-[var(--text)]"
            />
          </div>

          <div>
            <label className="mb-1 block text-[11px] text-[var(--text-muted)]">Çıkış Tarihi</label>
            <input
              type="date"
              value={checkOutDate}
              onChange={(e) => setCheckOutDate(e.target.value)}
              required
              className="w-full rounded-lg border border-[var(--line)] bg-[var(--bg)] px-2.5 py-2 text-xs text-[var(--text)]"
            />
          </div>

          <div>
            <label className="mb-1 block text-[11px] text-[var(--text-muted)]">Pansiyon Tipi</label>
            <select
              value={boardType}
              onChange={(e) => setBoardType(e.target.value)}
              className="w-full rounded-lg border border-[var(--line)] bg-[var(--bg)] px-2.5 py-2 text-xs text-[var(--text)]"
            >
              {HOTEL_BOARD_TYPES.map((bt) => (
                <option key={bt} value={bt}>
                  {HOTEL_BOARD_TYPE_LABELS[bt]}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="mb-1 block text-[11px] text-[var(--text-muted)]">Satış Kanalı</label>
            <select
              value={channelSource}
              onChange={(e) => setChannelSource(e.target.value)}
              className="w-full rounded-lg border border-[var(--line)] bg-[var(--bg)] px-2.5 py-2 text-xs text-[var(--text)]"
            >
              {HOTEL_CHANNEL_SOURCES.map((ch) => (
                <option key={ch} value={ch}>
                  {HOTEL_CHANNEL_LABELS[ch]}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="mb-1 block text-[11px] text-[var(--text-muted)]">
              Acenta Kontenjanı (Opsiyonel)
            </label>
            <select
              value={allotmentId}
              onChange={(e) => setAllotmentId(e.target.value)}
              className="w-full rounded-lg border border-[var(--line)] bg-[var(--bg)] px-2.5 py-2 text-xs text-[var(--text)]"
            >
              <option value="">Direkt / Kontenjansız</option>
              {allotments.map((al) => (
                <option key={al.id} value={al.id}>
                  {al.code} — {al.agencyName} (Kalan: {al.remainingRoomNights} gece)
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="mb-1 block text-[11px] text-[var(--text-muted)]">Yetişkin</label>
              <input
                type="number"
                min={1}
                max={6}
                value={adultsCount}
                onChange={(e) => setAdultsCount(Number(e.target.value))}
                className="w-full rounded-lg border border-[var(--line)] bg-[var(--bg)] px-2.5 py-2 text-xs text-[var(--text)]"
              />
            </div>
            <div>
              <label className="mb-1 block text-[11px] text-[var(--text-muted)]">Çocuk</label>
              <input
                type="number"
                min={0}
                max={4}
                value={childrenCount}
                onChange={(e) => setChildrenCount(Number(e.target.value))}
                className="w-full rounded-lg border border-[var(--line)] bg-[var(--bg)] px-2.5 py-2 text-xs text-[var(--text)]"
              />
            </div>
          </div>

          <div className="md:col-span-4 flex justify-end gap-2 pt-1">
            <button
              type="button"
              onClick={() => setShowCreateForm(false)}
              className="rounded-lg border border-[var(--line)] px-4 py-2 text-xs text-[var(--text-2)]"
            >
              Vazgeç
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="rounded-lg bg-[var(--brand)] px-4 py-2 text-xs font-semibold text-[var(--text)] hover:bg-[--brand-hover] disabled:opacity-50"
            >
              {submitting ? 'Kontrol Ediliyor...' : 'Rezervasyonu Kaydet'}
            </button>
          </div>
        </form>
      )}

      {/* Check-In Paneli (KVKK Veri Minimizasyonu — Kimlik Fotokopisi Saklanmaz) */}
      {checkInTarget && (
        <div className="space-y-3 rounded-xl border border-sky-500/40 bg-[var(--bg)] shadow-sm p-4">
          <div className="flex items-center justify-between">
            <div>
              <h4 className="text-sm font-semibold text-sky-300">
                Misafir Check-In: {checkInTarget.reservationNo} · Oda {checkInTarget.roomNumber}
              </h4>
              <p className="text-xs text-[var(--text-muted)]">
                KVKK veri minimizasyonu uygulanır: Yalnızca KBS giriş hazırlığı için gerekli kimlik/pasaport alanları işlenir, kimlik fotokopisi saklanmaz.
              </p>
            </div>
            <button
              type="button"
              onClick={() => setCheckInTarget(null)}
              className="text-[var(--text-muted)] hover:text-[var(--brand)]"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          <div className="grid grid-cols-1 gap-3 md:grid-cols-5">
            <div>
              <label className="mb-1 block text-[11px] text-[var(--text-muted)]">Anahtar Kart Kodu</label>
              <input
                value={keyCardCode}
                onChange={(e) => setKeyCardCode(e.target.value)}
                placeholder={`KEY-${checkInTarget.roomNumber}`}
                className="w-full rounded-lg border border-[var(--line)] bg-[var(--bg)] px-2.5 py-1.5 text-xs text-[var(--text)]"
              />
            </div>
            <div>
              <label className="mb-1 block text-[11px] text-[var(--text-muted)]">TCKN (Güncelleme)</label>
              <input
                value={guestTckn}
                onChange={(e) => setGuestTckn(e.target.value)}
                placeholder="Mevcut korunur"
                className="w-full rounded-lg border border-[var(--line)] bg-[var(--bg)] px-2.5 py-1.5 text-xs text-[var(--text)]"
              />
            </div>
            <div>
              <label className="mb-1 block text-[11px] text-[var(--text-muted)]">Pasaport No</label>
              <input
                value={guestPassportNo}
                onChange={(e) => setGuestPassportNo(e.target.value)}
                placeholder="Yabancı misafir"
                className="w-full rounded-lg border border-[var(--line)] bg-[var(--bg)] px-2.5 py-1.5 text-xs text-[var(--text)]"
              />
            </div>
            <div>
              <label className="mb-1 block text-[11px] text-[var(--text-muted)]">Uyruk</label>
              <input
                value={guestNationality}
                onChange={(e) => setGuestNationality(e.target.value)}
                className="w-full rounded-lg border border-[var(--line)] bg-[var(--bg)] px-2.5 py-1.5 text-xs text-[var(--text)]"
              />
            </div>
            <div>
              <label className="mb-1 block text-[11px] text-[var(--text-muted)]">Doğum Tarihi</label>
              <input
                type="date"
                value={guestBirthDate}
                onChange={(e) => setGuestBirthDate(e.target.value)}
                className="w-full rounded-lg border border-[var(--line)] bg-[var(--bg)] px-2.5 py-1.5 text-xs text-[var(--text)]"
              />
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-2">
            <label className="flex items-center gap-2 text-xs text-[var(--text-2)]">
              <input
                type="checkbox"
                checked={overrideDirtyRoom}
                onChange={(e) => setOverrideDirtyRoom(e.target.checked)}
              />
              Oda kirli olsa dahi ön büro istisnası ile Check-In yap
            </label>
            <button
              type="button"
              disabled={submitting}
              onClick={handleConfirmCheckIn}
              className="rounded-lg bg-sky-500 px-4 py-2 text-xs font-semibold text-[var(--text)] hover:bg-sky-400 disabled:opacity-50"
            >
              {submitting ? 'İşleniyor...' : 'Check-In Onayla & KBS Giriş Hazırla'}
            </button>
          </div>
        </div>
      )}

      {/* Check-Out Paneli (Bakiye Kontrolü + Otomatik Housekeeping + Fatura) */}
      {checkOutTarget && (
        <div className="space-y-3 rounded-xl border border-[var(--warn-line)] bg-[var(--bg)] shadow-sm p-4">
          <div className="flex items-center justify-between">
            <div>
              <h4 className="text-sm font-semibold text-[var(--warn)]">
                Misafir Check-Out: {checkOutTarget.reservationNo} · Oda {checkOutTarget.roomNumber}
              </h4>
              <p className="text-xs text-[var(--text-muted)]">
                Check-Out ile oda kirli (DIRTY_VACANT) işaretlenir, otomatik temizlik görevi açılır, KBS Çıkış hazırlanır ve E-Belge/Finans kaydı oluşturulur.
              </p>
            </div>
            <button
              type="button"
              onClick={() => setCheckOutTarget(null)}
              className="text-[var(--text-muted)] hover:text-[var(--brand)]"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          <div className="grid grid-cols-2 gap-3 rounded-lg bg-[var(--bg)] p-3 text-xs md:grid-cols-4">
            <div>
              <span className="text-[var(--text-muted)]">Konaklama:</span>{' '}
              <strong className="text-[var(--text)]">
                {Number(checkOutTarget.roomTotalTry || 0).toLocaleString('tr-TR')} ₺
              </strong>
            </div>
            <div>
              <span className="text-[var(--text-muted)]">Ekstralar:</span>{' '}
              <strong className="text-[var(--text)]">
                {Number(checkOutTarget.extrasTotalTry || 0).toLocaleString('tr-TR')} ₺
              </strong>
            </div>
            <div>
              <span className="text-[var(--text-muted)]">Ödenen:</span>{' '}
              <strong className="text-[var(--brand)]">
                {Number(checkOutTarget.paidTotalTry || 0).toLocaleString('tr-TR')} ₺
              </strong>
            </div>
            <div>
              <span className="text-[var(--text-muted)]">Kalan Bakiye:</span>{' '}
              <strong
                className={
                  Number(checkOutTarget.balanceDueTry || 0) > 0
                    ? 'text-[var(--warn)]'
                    : 'text-[var(--brand)]'
                }
              >
                {Number(checkOutTarget.balanceDueTry || 0).toLocaleString('tr-TR')} ₺
              </strong>
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3">
            {Number(checkOutTarget.balanceDueTry || 0) > 0 ? (
              <div className="flex items-center gap-2 text-xs">
                <span className="text-[var(--text-2)]">Kalan bakiyeyi şimdi tahsil et:</span>
                <select
                  value={settleMethod}
                  onChange={(e) => setSettleMethod(e.target.value)}
                  className="rounded-lg border border-[var(--line)] bg-[var(--bg)] px-2.5 py-1.5 text-xs text-[var(--text)]"
                >
                  <option value="PAYMENT_CARD">Kredi Kartı ile Kapat</option>
                  <option value="PAYMENT_CASH">Nakit ile Kapat</option>
                  <option value="PAYMENT_TRANSFER">Havale / EFT ile Kapat</option>
                  <option value="NONE">Tahsilat Yapma (Bakiye Kontrolünü Test Et)</option>
                </select>
              </div>
            ) : (
              <span className="flex items-center gap-1.5 text-xs text-[var(--brand)]">
                <CheckCircle2 className="h-4 w-4" /> Folio bakiyesi kapalı (0 ₺).
              </span>
            )}

            <button
              type="button"
              disabled={submitting}
              onClick={handleConfirmCheckOut}
              className="rounded-lg bg-amber-400 px-4 py-2 text-xs font-semibold text-[var(--text)] hover:bg-amber-300 disabled:opacity-50"
            >
              {submitting ? 'Tamamlanıyor...' : 'Check-Out Tamamla'}
            </button>
          </div>
        </div>
      )}

      {/* Rezervasyon Listesi */}
      <div className="overflow-x-auto rounded-xl border border-[var(--line)] bg-[var(--bg)] shadow-sm">
        <table className="w-full min-w-[920px] text-left text-xs">
          <thead className="border-b border-[--line] bg-[var(--muted-bg)] text-[var(--text-muted)]">
            <tr>
              <th className="px-3 py-2.5">Rez No / Kanal</th>
              <th className="px-3 py-2.5">Oda & Tip</th>
              <th className="px-3 py-2.5">Misafir (KVKK Maskeli)</th>
              <th className="px-3 py-2.5">Giriş – Çıkış</th>
              <th className="px-3 py-2.5">Durum</th>
              <th className="px-3 py-2.5 text-right">Toplam / Bakiye</th>
              <th className="px-3 py-2.5 text-right">İşlemler</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/[0.05]">
            {filtered.map((r) => (
              <tr key={r.id} className="hover:bg-[--page]">
                <td className="px-3 py-2.5">
                  <div className="font-mono font-semibold text-[var(--text)]">{r.reservationNo}</div>
                  <div className="text-[10px] text-[var(--text-muted)]">
                    {HOTEL_CHANNEL_LABELS[r.channelSource as keyof typeof HOTEL_CHANNEL_LABELS] ||
                      r.channelSource}
                    {r.agencyName ? ` · ${r.agencyName}` : ''}
                  </div>
                </td>
                <td className="px-3 py-2.5">
                  <div className="font-semibold text-[var(--text)]">Oda {r.roomNumber}</div>
                  <div className="text-[10px] text-[var(--text-muted)]">
                    {r.roomTypeName} · {r.boardType}
                  </div>
                </td>
                <td className="px-3 py-2.5">
                  <div className="font-medium text-[var(--text)]">
                    {r.guest?.name || r.guest?.company || 'Misafir'}
                  </div>
                  <div className="font-mono text-[10px] text-[var(--text-muted)]">
                    {r.guest?.nationality || 'TR'} ·{' '}
                    {r.guest?.tckn || r.guest?.passportNo || 'Kimlik bekleniyor'}
                  </div>
                </td>
                <td className="px-3 py-2.5 font-mono text-[11px] text-[var(--text-2)]">
                  <div>{String(r.checkInDate).slice(0, 10)}</div>
                  <div className="text-[var(--text-muted)]">
                    → {String(r.checkOutDate).slice(0, 10)} ({r.nightsCount} gece)
                  </div>
                </td>
                <td className="px-3 py-2.5">
                  <span
                    className={`inline-flex rounded-full border px-2 py-0.5 text-[10px] font-medium ${ HOTEL_RESERVATION_STATUS_BADGES[r.status as HotelReservationStatus] || 'border-[--line] text-[var(--text-2)]' }`}
                  >
                    {HOTEL_RESERVATION_STATUS_LABELS[r.status as HotelReservationStatus] ||
                      r.status}
                  </span>
                </td>
                <td className="px-3 py-2.5 text-right font-mono">
                  <div className="text-[var(--text)]">
                    {(Number(r.roomTotalTry || 0) + Number(r.extrasTotalTry || 0)).toLocaleString(
                      'tr-TR'
                    )}{' '}
                    ₺
                  </div>
                  <div
                    className={`text-[10px] ${ Number(r.balanceDueTry || 0) > 0 ? 'text-[var(--warn)]' : 'text-[var(--brand)]' }`}
                  >
                    Bakiye: {Number(r.balanceDueTry || 0).toLocaleString('tr-TR')} ₺
                  </div>
                </td>
                <td className="px-3 py-2.5 text-right">
                  <div className="flex justify-end gap-1.5">
                    {(r.status === 'CONFIRMED' || r.status === 'PENDING') && (
                      <button
                        type="button"
                        onClick={() => {
                          setCheckInTarget(r);
                          setKeyCardCode(`KEY-${r.roomNumber}`);
                          setGuestNationality(r.guest?.nationality || 'TR');
                          setGuestTckn('');
                          setGuestPassportNo('');
                          setGuestBirthDate('');
                          setOverrideDirtyRoom(false);
                        }}
                        className="rounded-md bg-sky-500/20 px-2 py-1 text-[11px] font-medium text-sky-300 hover:bg-sky-500/35"
                      >
                        Check-In
                      </button>
                    )}
                    {r.status === 'CHECKED_IN' && (
                      <button
                        type="button"
                        onClick={() => {
                          setCheckOutTarget(r);
                          setSettleMethod('PAYMENT_CARD');
                        }}
                        className="rounded-md bg-[var(--warn-soft)] px-2 py-1 text-[11px] font-medium text-[var(--warn)] hover:bg-amber-500/35"
                      >
                        Check-Out
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => onOpenFolio(r.id)}
                      className="rounded-md bg-[--brand]/15 px-2 py-1 text-[11px] font-medium text-[var(--brand)] hover:bg-[--brand]/30"
                    >
                      Folio
                    </button>
                    {(r.status === 'CONFIRMED' || r.status === 'PENDING') && (
                      <button
                        type="button"
                        onClick={() => handleCancelReservation(r.id)}
                        className="rounded-md bg-[var(--bad-soft)] px-2 py-1 text-[11px] font-medium text-[var(--bad)] hover:bg-rose-500/30"
                      >
                        İptal
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

interface FolioTabProps {
  reservations: any[];
  minibarItems: any[];
  focusedReservationId: string | null;
  demoCompanyId: string;
  onRefresh: () => void;
}

export function HotelFolioAndBillingTab({
  reservations,
  minibarItems,
  focusedReservationId,
  demoCompanyId,
  onRefresh,
}: FolioTabProps) {
  const activeReservations = useMemo(
    () => reservations.filter((r) => r.status !== 'CANCELLED' && r.status !== 'NO_SHOW'),
    [reservations]
  );

  const [selectedResId, setSelectedResId] = useState<string>(
    focusedReservationId ||
      activeReservations.find((r) => r.status === 'CHECKED_IN')?.id ||
      activeReservations[0]?.id ||
      ''
  );
  const [entryCategory, setEntryCategory] = useState<HotelFolioCategory>('MINIBAR');
  const [folioGroup, setFolioGroup] = useState<HotelFolioGroup>('A_ANA_HESAP');
  const [inventoryItemId, setInventoryItemId] = useState<string>(minibarItems[0]?.id || '');
  const [quantity, setQuantity] = useState<number>(1);
  const [unitPriceTry, setUnitPriceTry] = useState<number>(minibarItems[0]?.salesPrice || 195);
  const [description, setDescription] = useState<string>('');
  const [busy, setBusy] = useState<boolean>(false);

  useEffect(() => {
    if (focusedReservationId) setSelectedResId(focusedReservationId);
  }, [focusedReservationId]);

  const selectedRes = useMemo(
    () => activeReservations.find((r) => r.id === selectedResId) || activeReservations[0] || null,
    [activeReservations, selectedResId]
  );

  const handleSelectMinibar = (itemId: string) => {
    setInventoryItemId(itemId);
    const it = minibarItems.find((m) => m.id === itemId);
    if (it) {
      setUnitPriceTry(Number(it.salesPrice || 0));
      setDescription(`Minibar — ${it.name}`);
    }
  };

  const handleAddEntry = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedRes) return;
    setBusy(true);
    try {
      const res = await fetch('/api/otel', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'add_folio_entry',
          reservationId: selectedRes.id,
          folioGroup,
          entryCategory,
          inventoryItemId: entryCategory === 'MINIBAR' ? inventoryItemId || null : null,
          quantity,
          unitPriceTry,
          description: description || undefined,
          demoCompanyId,
        }),
      });
      const json = await res.json();
      if (!res.ok || !json.success) throw new Error(json.error || 'Folio kalemi eklenemedi.');
      toast.success(
        entryCategory === 'MINIBAR'
          ? 'Minibar kalemi folioya işlendi ve stoktan (StockMovement) düşüldü.'
          : 'Folio kalemi kaydedildi.'
      );
      setDescription('');
      onRefresh();
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setBusy(false);
    }
  };

  const handleSplitItem = async (folioItemId: string, targetFolioGroup: HotelFolioGroup) => {
    setBusy(true);
    try {
      const res = await fetch('/api/otel', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'split_folio_item',
          folioItemId,
          targetFolioGroup,
          demoCompanyId,
        }),
      });
      const json = await res.json();
      if (!res.ok || !json.success) throw new Error(json.error || 'Folio bölünemedi.');
      toast.success(`Kalem "${HOTEL_FOLIO_GROUP_LABELS[targetFolioGroup]}" hesabına taşındı.`);
      onRefresh();
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setBusy(false);
    }
  };

  const handleIssueInvoice = async (targetGrp: HotelFolioGroup | 'ALL') => {
    if (!selectedRes) return;
    setBusy(true);
    try {
      const res = await fetch('/api/otel', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'issue_folio_invoice',
          reservationId: selectedRes.id,
          folioGroup: targetGrp,
          demoCompanyId,
        }),
      });
      const json = await res.json();
      if (!res.ok || !json.success) throw new Error(json.error || 'E-Belge kesilemedi.');
      toast.success(
        `Fatura / E-Belge oluşturuldu (${json.eDocument?.documentNo}) ve Finans gelir kaydına işlendi.`
      );
      onRefresh();
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setBusy(false);
    }
  };

  const folioSummary = selectedRes?.folioSummary || {
    roomChargesTry: 0,
    extraChargesTry: 0,
    totalChargesTry: 0,
    totalPaymentsTry: 0,
    balanceDueTry: 0,
    byGroup: {},
  };

  return (
    <div className="space-y-4">
      {/* Rezervasyon Seçici */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-[var(--line)] bg-[var(--bg)] shadow-sm p-4">
        <div className="flex items-center gap-2">
          <CreditCard className="h-4 w-4 text-[var(--brand)]" />
          <h3 className="text-sm font-semibold text-[var(--text)]">
            Oda Hesabı (Folio), Stok Bağlı Minibar, Split Folio & E-Belge
          </h3>
        </div>
        <select
          value={selectedRes?.id || ''}
          onChange={(e) => setSelectedResId(e.target.value)}
          className="min-w-[280px] rounded-lg border border-[var(--line)] bg-[var(--bg)] px-3 py-2 text-xs text-[var(--text)]"
        >
          {activeReservations.map((r) => (
            <option key={r.id} value={r.id}>
              Oda {r.roomNumber} · {r.reservationNo} — {r.guest?.name || 'Misafir'} (Bakiye:{' '}
              {Number(r.balanceDueTry || 0).toLocaleString('tr-TR')} ₺)
            </option>
          ))}
        </select>
      </div>

      {/* Split Folio Grup Kartları */}
      {selectedRes && (
        <>
          <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
            {HOTEL_FOLIO_GROUPS.map((grp) => {
              const g = folioSummary.byGroup?.[grp] || {
                chargesTry: 0,
                paymentsTry: 0,
                balanceTry: 0,
                itemCount: 0,
              };
              return (
                <div
                  key={grp}
                  className="rounded-xl border border-[var(--line)] bg-[var(--bg)] shadow-sm p-4"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-[var(--text)]">
                      {HOTEL_FOLIO_GROUP_LABELS[grp]}
                    </span>
                    <span className="rounded bg-[--muted-bg] px-1.5 py-0.5 text-[10px] text-[var(--text-muted)]">
                      {g.itemCount} kalem
                    </span>
                  </div>
                  <div className="mt-2 flex items-baseline justify-between text-xs">
                    <span className="text-[var(--text-muted)]">
                      Borç: {Number(g.chargesTry).toLocaleString('tr-TR')} ₺ · Ödenen:{' '}
                      {Number(g.paymentsTry).toLocaleString('tr-TR')} ₺
                    </span>
                    <strong className="text-sm text-[var(--brand)]">
                      {Number(g.balanceTry).toLocaleString('tr-TR')} ₺
                    </strong>
                  </div>
                  <button
                    type="button"
                    disabled={busy || g.chargesTry <= 0}
                    onClick={() => handleIssueInvoice(grp)}
                    className="mt-3 flex w-full items-center justify-center gap-1.5 rounded-lg border border-[--brand-line] bg-[--brand]/10 py-1.5 text-[11px] font-medium text-[var(--brand)] hover:bg-[--brand]/20 disabled:opacity-40"
                  >
                    <FileText className="h-3.5 w-3.5" /> Bu Folioyu Faturala (E-Belge)
                  </button>
                </div>
              );
            })}
          </div>

          {/* Yeni Masraf / Stok Bağlı Minibar / Kısmi Tahsilat Formu */}
          <form
            onSubmit={handleAddEntry}
            className="grid grid-cols-1 gap-3 rounded-xl border border-[var(--line)] bg-[var(--bg)] shadow-sm p-4 md:grid-cols-6"
          >
            <div>
              <label className="mb-1 block text-[11px] text-[var(--text-muted)]">Kalem Türü</label>
              <select
                value={entryCategory}
                onChange={(e) => setEntryCategory(e.target.value as HotelFolioCategory)}
                className="w-full rounded-lg border border-[var(--line)] bg-[var(--bg)] px-2.5 py-2 text-xs text-[var(--text)]"
              >
                {HOTEL_FOLIO_CATEGORIES.filter((c) => c !== 'ROOM_NIGHT').map((cat) => (
                  <option key={cat} value={cat}>
                    {HOTEL_FOLIO_CATEGORY_LABELS[cat]}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="mb-1 block text-[11px] text-[var(--text-muted)]">Hedef Folio</label>
              <select
                value={folioGroup}
                onChange={(e) => setFolioGroup(e.target.value as HotelFolioGroup)}
                className="w-full rounded-lg border border-[var(--line)] bg-[var(--bg)] px-2.5 py-2 text-xs text-[var(--text)]"
              >
                {HOTEL_FOLIO_GROUPS.map((g) => (
                  <option key={g} value={g}>
                    {HOTEL_FOLIO_GROUP_LABELS[g]}
                  </option>
                ))}
              </select>
            </div>

            {entryCategory === 'MINIBAR' ? (
              <div className="md:col-span-2">
                <label className="mb-1 block text-[11px] text-[var(--brand)]">
                  Minibar Stok Ürünü (Stoktan Düşer)
                </label>
                <select
                  value={inventoryItemId}
                  onChange={(e) => handleSelectMinibar(e.target.value)}
                  className="w-full rounded-lg border border-[--brand-line] bg-[var(--bg)] px-2.5 py-2 text-xs text-[var(--text)]"
                >
                  {minibarItems.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.name} — {m.salesPrice} ₺ (Stok: {m.onHandQty} {m.baseUnit})
                    </option>
                  ))}
                </select>
              </div>
            ) : (
              <div className="md:col-span-2">
                <label className="mb-1 block text-[11px] text-[var(--text-muted)]">Açıklama</label>
                <input
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Örn. Oda servisi, çamaşırhane veya kısmi tahsilat"
                  className="w-full rounded-lg border border-[var(--line)] bg-[var(--bg)] px-2.5 py-2 text-xs text-[var(--text)]"
                />
              </div>
            )}

            <div>
              <label className="mb-1 block text-[11px] text-[var(--text-muted)]">Adet / Birim Tutar (₺)</label>
              <div className="flex gap-1.5">
                <input
                  type="number"
                  min={1}
                  value={quantity}
                  onChange={(e) => setQuantity(Number(e.target.value))}
                  className="w-16 rounded-lg border border-[var(--line)] bg-[var(--bg)] px-2 py-2 text-xs text-[var(--text)]"
                />
                <input
                  type="number"
                  min={1}
                  value={unitPriceTry}
                  onChange={(e) => setUnitPriceTry(Number(e.target.value))}
                  className="w-full rounded-lg border border-[var(--line)] bg-[var(--bg)] px-2 py-2 text-xs text-[var(--text)]"
                />
              </div>
            </div>

            <div className="flex items-end">
              <button
                type="submit"
                disabled={busy}
                className="w-full rounded-lg bg-[var(--brand)] px-3 py-2 text-xs font-semibold text-[var(--text)] hover:bg-[--brand-hover] disabled:opacity-50"
              >
                Folioya İşle
              </button>
            </div>
          </form>

          {/* Folio Hareket Tablosu */}
          <div className="overflow-x-auto rounded-xl border border-[var(--line)] bg-[var(--bg)] shadow-sm">
            <table className="w-full min-w-[820px] text-left text-xs">
              <thead className="border-b border-[--line] bg-[var(--muted-bg)] text-[var(--text-muted)]">
                <tr>
                  <th className="px-3 py-2.5">Kalem No</th>
                  <th className="px-3 py-2.5">Kategori / Açıklama</th>
                  <th className="px-3 py-2.5">Folio Grubu (Split)</th>
                  <th className="px-3 py-2.5 text-right">Tutar (KDV Dahil)</th>
                  <th className="px-3 py-2.5">Stok / E-Belge</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/[0.05]">
                {(selectedRes.folioItems || []).map((item: any) => (
                  <tr key={item.id} className="hover:bg-[--page]">
                    <td className="px-3 py-2 font-mono text-[11px] text-[var(--text-muted)]">
                      {item.entryNo}
                    </td>
                    <td className="px-3 py-2">
                      <div className="font-medium text-[var(--text)]">{item.description}</div>
                      <div className="text-[10px] text-[var(--text-muted)]">
                        {HOTEL_FOLIO_CATEGORY_LABELS[item.entryCategory as HotelFolioCategory] ||
                          item.entryCategory}{' '}
                        · {item.quantity} × {Number(item.unitPriceTry).toLocaleString('tr-TR')} ₺
                      </div>
                    </td>
                    <td className="px-3 py-2">
                      <select
                        disabled={busy || Boolean(item.eDocumentNo)}
                        value={item.folioGroup}
                        onChange={(e) =>
                          handleSplitItem(item.id, e.target.value as HotelFolioGroup)
                        }
                        className="rounded border border-[var(--line)] bg-[var(--bg)] px-2 py-1 text-[11px] text-[var(--text)] disabled:opacity-50"
                      >
                        {HOTEL_FOLIO_GROUPS.map((g) => (
                          <option key={g} value={g}>
                            {g}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td
                      className={`px-3 py-2 text-right font-mono font-semibold ${ item.isPayment ? 'text-[var(--brand)]' : 'text-[var(--text)]' }`}
                    >
                      {item.isPayment ? '− ' : '+ '}
                      {Number(item.totalWithVatTry || item.amountTry).toLocaleString('tr-TR')} ₺
                    </td>
                    <td className="px-3 py-2 font-mono text-[10px]">
                      {item.stockMovementId && (
                        <span className="mr-1.5 rounded bg-sky-500/15 px-1.5 py-0.5 text-sky-300">
                          Stok Düştü
                        </span>
                      )}
                      {item.eDocumentNo ? (
                        <span className="rounded bg-[--brand]/15 px-1.5 py-0.5 text-[var(--brand)]">
                          {item.eDocumentNo}
                        </span>
                      ) : (
                        <span className="text-[var(--text-muted)]">Açık</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}
