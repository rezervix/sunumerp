'use client';

import React, { useMemo, useState } from 'react';
import {
  AlertTriangle,
  Building2,
  Calendar,
  CheckCircle2,
  CreditCard,
  Download,
  FileText,
  Plus,
  ShieldCheck,
  Users,
  X,
} from 'lucide-react';
import { toast } from 'sonner';
import {
  TOUR_BOARDING_STATUS_BADGES,
  TOUR_BOARDING_STATUS_LABELS,
  TOUR_BOOKING_STATUS_LABELS,
  TOUR_PAYMENT_STATUS_LABELS,
} from '@/lib/tourism/tur/constantsAndHelpers';

// ── C & H) Yolcu Rezervasyonu, İmzalı Manifesto & Otel/KBS Bağlantısı ────────

export function TourBookingsAndManifestoTab({
  tours,
  customers,
  agencies,
  focusedTourId,
  demoCompanyId,
  onRefresh,
}: {
  tours: any[];
  customers: any[];
  agencies: any[];
  focusedTourId: string | null;
  demoCompanyId: string;
  onRefresh: () => void;
}) {
  const [selectedTourId, setSelectedTourId] = useState<string>(focusedTourId || tours[0]?.id || '');
  const [showBookingForm, setShowBookingForm] = useState<boolean>(false);
  const [busy, setBusy] = useState<boolean>(false);

  // Yeni Rezervasyon State
  const [customerId, setCustomerId] = useState<string>(customers[0]?.id || '');
  const [agencyId, setAgencyId] = useState<string>('');
  const [bookingType, setBookingType] = useState<'INDIVIDUAL' | 'GROUP'>('INDIVIDUAL');
  const [groupName, setGroupName] = useState<string>('');
  const [paidAmountTry, setPaidAmountTry] = useState<number>(0);
  const [linkOvernightHotel, setLinkOvernightHotel] = useState<boolean>(true);
  const [paxFullName, setPaxFullName] = useState<string>('');
  const [paxTckn, setPaxTckn] = useState<string>('');
  const [paxGender, setPaxGender] = useState<'M' | 'F'>('M');
  const [paxSeat, setPaxSeat] = useState<string>('');
  const [paxStopId, setPaxStopId] = useState<string>('');

  const tour = useMemo(
    () => tours.find((t) => t.id === (focusedTourId || selectedTourId)) || tours[0] || null,
    [tours, focusedTourId, selectedTourId]
  );

  const handleCreateBooking = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!tour || !paxFullName.trim()) return;
    setBusy(true);
    try {
      const res = await fetch('/api/tur', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'create_booking',
          tourId: tour.id,
          customerId,
          bookingType,
          groupName: groupName || null,
          agencyId: agencyId || null,
          paidAmountTry,
          linkOvernightHotel: tour.tourType === 'MULTI_DAY' && linkOvernightHotel,
          passengers: [
            {
              fullName: paxFullName,
              tckn: paxTckn || null,
              gender: paxGender,
              seatNumber: paxSeat || null,
              pickupStopId: paxStopId || tour.stops?.[0]?.id || null,
            },
          ],
          demoCompanyId,
        }),
      });
      const json = await res.json();
      if (!res.ok || !json.success) throw new Error(json.error || 'Rezervasyon oluşturulamadı.');
      toast.success(`Rezervasyon kaydedildi: ${json.booking.bookingNo}`);
      setShowBookingForm(false);
      setPaxFullName('');
      setPaxTckn('');
      setPaxSeat('');
      onRefresh();
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setBusy(false);
    }
  };

  const postAction = async (payload: Record<string, any>, successMsg: string) => {
    setBusy(true);
    try {
      const res = await fetch('/api/tur', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...payload, demoCompanyId }),
      });
      const json = await res.json();
      if (!res.ok || !json.success) throw new Error(json.error || 'İşlem başarısız.');
      toast.success(successMsg);
      onRefresh();
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-white/[0.08] bg-[#111513] p-4">
        <div className="flex flex-wrap items-center gap-2">
          <select
            value={tour?.id || ''}
            onChange={(e) => setSelectedTourId(e.target.value)}
            className="min-w-[280px] rounded-lg border border-white/[0.1] bg-[#0B0E0D] px-3 py-2 text-xs text-zinc-100"
          >
            {tours.map((t) => (
              <option key={t.id} value={t.id}>
                {t.code} — {t.title} ({t.confirmedPassengerCount}/{t.capacity} yolcu)
              </option>
            ))}
          </select>

          {tour && (
            <a
              href={`/api/tur?section=manifesto_pdf&tourId=${encodeURIComponent(
                tour.id
              )}&demoCompanyId=${encodeURIComponent(demoCompanyId)}`}
              className="flex items-center gap-1.5 rounded-lg border border-emerald-500/35 bg-emerald-500/15 px-3 py-2 text-xs font-medium text-[#34D399] hover:bg-emerald-500/25"
            >
              <Download className="h-3.5 w-3.5" /> İmzalı Manifesto PDF İndir
            </a>
          )}

          {tour?.tourType === 'MULTI_DAY' && (
            <button
              type="button"
              disabled={busy}
              onClick={() =>
                postAction(
                  { action: 'sync_overnight_hotel_kbs', tourId: tour.id },
                  'Konaklamalı tur yolcuları Otel PMS oda bloğuna ve KBS hazırlığına bağlandı.'
                )
              }
              className="flex items-center gap-1.5 rounded-lg border border-sky-500/35 bg-sky-500/15 px-3 py-2 text-xs font-medium text-sky-300 hover:bg-sky-500/25"
            >
              <Building2 className="h-3.5 w-3.5" /> Otel Oda Bloğu & KBS Hazırla
            </button>
          )}
        </div>

        <button
          type="button"
          onClick={() => setShowBookingForm((v) => !v)}
          className="flex items-center gap-1.5 rounded-lg bg-[#34D399] px-3 py-2 text-xs font-semibold text-[#080A09] hover:bg-emerald-300"
        >
          <Plus className="h-3.5 w-3.5" /> Yeni Yolcu Rezervasyonu
        </button>
      </div>

      {showBookingForm && tour && (
        <form
          onSubmit={handleCreateBooking}
          className="grid grid-cols-1 gap-3 rounded-xl border border-emerald-500/35 bg-[#111513] p-4 md:grid-cols-4"
        >
          <div className="md:col-span-4 flex items-center justify-between">
            <h4 className="text-sm font-semibold text-[#34D399]">
              Yeni Rezervasyon ({tour.code}) — Koltuk & Kontenjan Kilitli
            </h4>
            <button type="button" onClick={() => setShowBookingForm(false)} className="text-zinc-400">
              <X className="h-4 w-4" />
            </button>
          </div>
          <div>
            <label className="mb-1 block text-[11px] text-zinc-400">Cari Müşteri</label>
            <select
              value={customerId}
              onChange={(e) => setCustomerId(e.target.value)}
              className="w-full rounded-lg border border-white/[0.1] bg-[#0B0E0D] px-2.5 py-2 text-xs text-zinc-100"
            >
              {customers.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name || c.company}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="mb-1 block text-[11px] text-zinc-400">Acenta (Komisyonlu)</label>
            <select
              value={agencyId}
              onChange={(e) => setAgencyId(e.target.value)}
              className="w-full rounded-lg border border-white/[0.1] bg-[#0B0E0D] px-2.5 py-2 text-xs text-zinc-100"
            >
              <option value="">Direkt Satış (%0 Komisyon)</option>
              {agencies.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.name} (%{a.commissionRatePct})
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="mb-1 block text-[11px] text-zinc-400">Tip / Grup Adı</label>
            <div className="flex gap-1.5">
              <select
                value={bookingType}
                onChange={(e) => setBookingType(e.target.value as 'INDIVIDUAL' | 'GROUP')}
                className="rounded-lg border border-white/[0.1] bg-[#0B0E0D] px-2 py-2 text-xs text-zinc-100"
              >
                <option value="INDIVIDUAL">Bireysel</option>
                <option value="GROUP">Grup</option>
              </select>
              <input
                value={groupName}
                onChange={(e) => setGroupName(e.target.value)}
                placeholder="Grup adı"
                className="w-full rounded-lg border border-white/[0.1] bg-[#0B0E0D] px-2 py-2 text-xs text-zinc-100"
              />
            </div>
          </div>
          <div>
            <label className="mb-1 block text-[11px] text-zinc-400">İlk Tahsilat / Kısmi Ödeme (₺)</label>
            <input
              type="number"
              min={0}
              value={paidAmountTry}
              onChange={(e) => setPaidAmountTry(Number(e.target.value))}
              className="w-full rounded-lg border border-white/[0.1] bg-[#0B0E0D] px-2.5 py-2 text-xs text-zinc-100"
            />
          </div>

          <div>
            <label className="mb-1 block text-[11px] text-zinc-400">Yolcu Ad Soyad</label>
            <input
              required
              value={paxFullName}
              onChange={(e) => setPaxFullName(e.target.value)}
              placeholder="Örn. Deniz Akın"
              className="w-full rounded-lg border border-white/[0.1] bg-[#0B0E0D] px-2.5 py-2 text-xs text-zinc-100"
            />
          </div>
          <div>
            <label className="mb-1 block text-[11px] text-zinc-400">TCKN / Pasaport (KVKK Maskeli)</label>
            <input
              value={paxTckn}
              onChange={(e) => setPaxTckn(e.target.value)}
              placeholder="Opsiyonel"
              className="w-full rounded-lg border border-white/[0.1] bg-[#0B0E0D] px-2.5 py-2 text-xs text-zinc-100"
            />
          </div>
          <div>
            <label className="mb-1 block text-[11px] text-zinc-400">Cinsiyet / Koltuk No</label>
            <div className="flex gap-1.5">
              <select
                value={paxGender}
                onChange={(e) => setPaxGender(e.target.value as 'M' | 'F')}
                className="rounded-lg border border-white/[0.1] bg-[#0B0E0D] px-2 py-2 text-xs text-zinc-100"
              >
                <option value="M">Erkek</option>
                <option value="F">Kadın</option>
              </select>
              <input
                value={paxSeat}
                onChange={(e) => setPaxSeat(e.target.value)}
                placeholder="Koltuk No"
                className="w-full rounded-lg border border-white/[0.1] bg-[#0B0E0D] px-2 py-2 text-xs text-zinc-100"
              />
            </div>
          </div>
          <div>
            <label className="mb-1 block text-[11px] text-zinc-400">Biniş Noktası</label>
            <select
              value={paxStopId}
              onChange={(e) => setPaxStopId(e.target.value)}
              className="w-full rounded-lg border border-white/[0.1] bg-[#0B0E0D] px-2.5 py-2 text-xs text-zinc-100"
            >
              {(tour.stops || []).map((s: any) => (
                <option key={s.id} value={s.id}>
                  {s.pickupTime} · {s.stopName}
                </option>
              ))}
            </select>
          </div>

          <div className="md:col-span-4 flex flex-wrap items-center justify-between gap-2">
            {tour.tourType === 'MULTI_DAY' ? (
              <label className="flex items-center gap-2 text-xs text-sky-300">
                <input
                  type="checkbox"
                  checked={linkOvernightHotel}
                  onChange={(e) => setLinkOvernightHotel(e.target.checked)}
                />
                Otel PMS grup bloğuna bağla ve KBS giriş hazırlığı oluştur
              </label>
            ) : (
              <span />
            )}
            <button
              type="submit"
              disabled={busy}
              className="rounded-lg bg-[#34D399] px-4 py-2 text-xs font-semibold text-[#080A09]"
            >
              Rezervasyonu Oluştur
            </button>
          </div>
        </form>
      )}

      {/* Rezervasyonlar Tablosu */}
      {tour && (
        <>
          <div className="overflow-x-auto rounded-xl border border-white/[0.08] bg-[#111513]">
            <div className="border-b border-white/[0.08] px-4 py-3 text-xs font-semibold text-zinc-200">
              Rezervasyonlar & Kısmi Ödeme / Komisyon Takibi ({tour.bookings?.length || 0})
            </div>
            <table className="w-full min-w-[840px] text-left text-xs">
              <thead className="border-b border-white/[0.06] bg-[#161B18] text-zinc-400">
                <tr>
                  <th className="px-3 py-2">Rez No / Grup</th>
                  <th className="px-3 py-2">Acenta / Kanal</th>
                  <th className="px-3 py-2 text-right">Yolcu</th>
                  <th className="px-3 py-2 text-right">Toplam / Ödenen / Bakiye</th>
                  <th className="px-3 py-2 text-right">Acenta Komisyonu</th>
                  <th className="px-3 py-2">Durum</th>
                  <th className="px-3 py-2 text-right">İşlem</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/[0.05]">
                {(tour.bookings || []).map((b: any) => (
                  <tr key={b.id} className="hover:bg-white/[0.02]">
                    <td className="px-3 py-2.5">
                      <div className="font-mono font-semibold text-zinc-100">{b.bookingNo}</div>
                      <div className="text-[10px] text-zinc-400">
                        {b.groupName || b.customerName}
                      </div>
                    </td>
                    <td className="px-3 py-2.5 text-zinc-300">
                      {b.agencyName || 'Direkt Satış'}
                    </td>
                    <td className="px-3 py-2.5 text-right font-mono">{b.passengerCount}</td>
                    <td className="px-3 py-2.5 text-right font-mono">
                      <div>{Number(b.totalPriceTry).toLocaleString('tr-TR')} ₺</div>
                      <div className="text-[10px]">
                        <span className="text-[#34D399]">
                          Öd: {Number(b.paidAmountTry).toLocaleString('tr-TR')} ₺
                        </span>{' '}
                        ·{' '}
                        <span className={b.balanceDueTry > 0 ? 'text-amber-300' : 'text-zinc-500'}>
                          Bak: {Number(b.balanceDueTry).toLocaleString('tr-TR')} ₺
                        </span>
                      </div>
                    </td>
                    <td className="px-3 py-2.5 text-right font-mono text-amber-300">
                      {b.agencyCommissionTry > 0
                        ? `${Number(b.agencyCommissionTry).toLocaleString('tr-TR')} ₺ (%${b.agencyCommissionRatePct})`
                        : '-'}
                    </td>
                    <td className="px-3 py-2.5 text-[11px]">
                      <div>{TOUR_BOOKING_STATUS_LABELS[b.status] || b.status}</div>
                      <div className="text-[10px] text-zinc-400">
                        {TOUR_PAYMENT_STATUS_LABELS[b.paymentStatus] || b.paymentStatus}
                        {b.eDocumentNo ? ` · ${b.eDocumentNo}` : ''}
                      </div>
                    </td>
                    <td className="px-3 py-2.5 text-right">
                      <div className="flex justify-end gap-1">
                        {b.status === 'CONFIRMED' && b.balanceDueTry > 0 && (
                          <button
                            type="button"
                            disabled={busy}
                            onClick={() =>
                              postAction(
                                {
                                  action: 'record_payment',
                                  bookingId: b.id,
                                  amountTry: b.balanceDueTry,
                                  paymentMethod: 'Kredi Kartı / EFT',
                                },
                                `${b.bookingNo} kalan bakiyesi tahsil edildi ve Finansa işlendi.`
                              )
                            }
                            className="rounded bg-emerald-500/20 px-2 py-1 text-[10px] text-[#34D399]"
                          >
                            Bakiye Kapat
                          </button>
                        )}
                        {b.status === 'CONFIRMED' && !b.eDocumentNo && (
                          <button
                            type="button"
                            disabled={busy}
                            onClick={() =>
                              postAction(
                                { action: 'issue_booking_invoice', bookingId: b.id },
                                `${b.bookingNo} için E-Belge oluşturuldu ve Finansa işlendi.`
                              )
                            }
                            className="rounded bg-sky-500/20 px-2 py-1 text-[10px] text-sky-300"
                          >
                            E-Belge Kes
                          </button>
                        )}
                        {b.status === 'CONFIRMED' && (
                          <button
                            type="button"
                            disabled={busy}
                            onClick={() =>
                              postAction(
                                { action: 'cancel_booking', bookingId: b.id },
                                `${b.bookingNo} iptal edildi.`
                              )
                            }
                            className="rounded bg-rose-500/15 px-2 py-1 text-[10px] text-rose-300"
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

          {/* Yolcu Manifesto & Yoklama Tablosu */}
          <div className="overflow-x-auto rounded-xl border border-white/[0.08] bg-[#111513]">
            <div className="border-b border-white/[0.08] px-4 py-3 text-xs font-semibold text-zinc-200">
              Yolcu Manifestosu & Biniş Check-In Listesi ({tour.passengers?.length || 0} Yolcu · KVKK Maskeli)
            </div>
            <table className="w-full min-w-[800px] text-left text-xs">
              <thead className="border-b border-white/[0.06] bg-[#161B18] text-zinc-400">
                <tr>
                  <th className="px-3 py-2">Koltuk</th>
                  <th className="px-3 py-2">Yolcu Ad Soyad</th>
                  <th className="px-3 py-2">Kimlik (KVKK) / Uyruk</th>
                  <th className="px-3 py-2">Telefon</th>
                  <th className="px-3 py-2">Otel / KBS</th>
                  <th className="px-3 py-2">Biniş Durumu</th>
                  <th className="px-3 py-2 text-right">Yoklama</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/[0.05]">
                {(tour.passengers || []).slice(0, 40).map((p: any) => (
                  <tr key={p.id} className="hover:bg-white/[0.02]">
                    <td className="px-3 py-2 font-mono font-bold text-[#34D399]">
                      {p.seatNumber || '-'}
                    </td>
                    <td className="px-3 py-2 font-medium text-zinc-100">
                      {p.fullName}{' '}
                      <span className="text-[10px] text-zinc-500">
                        ({p.gender === 'F' ? 'K' : p.gender === 'M' ? 'E' : '-'})
                      </span>
                    </td>
                    <td className="px-3 py-2 font-mono text-[11px] text-zinc-300">
                      {p.tckn || p.passportNo || '-'} · {p.nationality}
                    </td>
                    <td className="px-3 py-2 font-mono text-[11px] text-zinc-400">
                      {p.phone || '-'}
                    </td>
                    <td className="px-3 py-2 text-[10px]">
                      {p.kbsRecordId ? (
                        <span className="rounded bg-emerald-500/15 px-1.5 py-0.5 text-[#34D399]">
                          KBS Hazır
                        </span>
                      ) : p.hotelRoomId ? (
                        <span className="rounded bg-sky-500/15 px-1.5 py-0.5 text-sky-300">
                          Oda Atandı
                        </span>
                      ) : (
                        <span className="text-zinc-500">-</span>
                      )}
                    </td>
                    <td className="px-3 py-2">
                      <span
                        className={`inline-flex rounded-full border px-2 py-0.5 text-[10px] font-medium ${
                          TOUR_BOARDING_STATUS_BADGES[p.boardingStatus] || 'border-white/10'
                        }`}
                      >
                        {TOUR_BOARDING_STATUS_LABELS[p.boardingStatus] || p.boardingStatus}
                      </span>
                    </td>
                    <td className="px-3 py-2 text-right">
                      <button
                        type="button"
                        disabled={busy}
                        onClick={() =>
                          postAction(
                            {
                              action: 'update_boarding_status',
                              passengerId: p.id,
                              boardingStatus: p.boardingStatus === 'BOARDED' ? 'WAITING' : 'BOARDED',
                            },
                            `${p.fullName} biniş durumu güncellendi.`
                          )
                        }
                        className="rounded bg-emerald-500/20 px-2 py-1 text-[10px] text-[#34D399]"
                      >
                        {p.boardingStatus === 'BOARDED' ? 'Geri Al' : 'Bindi İşaretle'}
                      </button>
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

// ── E) Kaynak Çakışma Gantt & Günlüğü Sekmesi ────────────────────────────────

export function TourResourceGanttAndConflictsTab({
  resourceGantt,
  conflictLogs,
  ganttStartDate,
  onChangeStartDate,
  demoCompanyId,
  onRefresh,
}: {
  resourceGantt: { dateHeaders: string[]; rows: any[] };
  conflictLogs: any[];
  ganttStartDate: string;
  onChangeStartDate: (d: string) => void;
  demoCompanyId: string;
  onRefresh: () => void;
}) {
  const [busy, setBusy] = useState(false);

  const handleResolve = async (conflictId: string) => {
    setBusy(true);
    try {
      const res = await fetch('/api/tur', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'resolve_conflict',
          conflictId,
          resolutionNote: 'Alternatif kaynak / tarih ile operasyon ekibince çözüldü.',
          demoCompanyId,
        }),
      });
      const json = await res.json();
      if (!res.ok || !json.success) throw new Error(json.error || 'Çözümlenemedi.');
      toast.success('Çakışma çözüldü olarak işaretlendi.');
      onRefresh();
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-white/[0.08] bg-[#111513] p-4">
        <div className="flex items-center gap-2">
          <Calendar className="h-4 w-4 text-[#34D399]" />
          <div>
            <h3 className="text-sm font-semibold text-zinc-100">
              Araç, Şoför & Rehber Çapraz Kaynak Çakışma Takvimi (Gantt)
            </h3>
            <p className="text-xs text-zinc-400">
              Turlar, Filo bakım/arıza kayıtları ve Rent-a-Car kiralamaları tek çakışma matrisinde izlenir.
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <input
            type="date"
            value={ganttStartDate}
            onChange={(e) => onChangeStartDate(e.target.value)}
            className="rounded-lg border border-white/[0.1] bg-[#0B0E0D] px-2.5 py-1.5 text-xs text-zinc-200"
          />
        </div>
      </div>

      <div className="overflow-x-auto rounded-xl border border-white/[0.08] bg-[#111513]">
        <table className="w-full min-w-[920px] border-collapse text-xs">
          <thead>
            <tr className="border-b border-white/[0.08] bg-[#161B18] text-zinc-400">
              <th className="sticky left-0 z-10 bg-[#161B18] px-3 py-2 text-left">Kaynak</th>
              {(resourceGantt?.dateHeaders || []).map((dk) => (
                <th key={dk} className="px-1.5 py-2 text-center font-mono text-[10px]">
                  {dk.slice(5)}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-white/[0.05]">
            {(resourceGantt?.rows || []).map((row) => (
              <tr key={`${row.resourceType}-${row.resourceId}`}>
                <td className="sticky left-0 z-10 border-r border-white/[0.06] bg-[#111513] px-3 py-2">
                  <div className="font-semibold text-zinc-100">{row.label}</div>
                  <div className="text-[10px] text-zinc-500">{row.subLabel}</div>
                </td>
                {row.days.map((c: any) => (
                  <td key={c.dateKey} className="p-1">
                    {c.status === 'TOUR' ? (
                      <div
                        title={c.refLabel}
                        className="truncate rounded bg-sky-500/25 px-1 py-1.5 text-center font-mono text-[9px] text-sky-200"
                      >
                        {c.refLabel?.slice(-5) || 'TUR'}
                      </div>
                    ) : c.status === 'RENTACAR' ? (
                      <div
                        title={`Rent-a-Car: ${c.refLabel}`}
                        className="truncate rounded bg-amber-500/25 px-1 py-1.5 text-center font-mono text-[9px] text-amber-200"
                      >
                        KİRA
                      </div>
                    ) : c.status === 'MAINTENANCE' ? (
                      <div className="rounded bg-rose-500/25 px-1 py-1.5 text-center text-[9px] text-rose-200">
                        BAKIM
                      </div>
                    ) : (
                      <div className="rounded bg-emerald-500/10 py-1.5 text-center text-[9px] text-[#34D399]/60">
                        Boş
                      </div>
                    )}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Çakışma Günlüğü & Manuel Çözüm */}
      <div className="rounded-xl border border-white/[0.08] bg-[#111513] p-4">
        <div className="mb-3 flex items-center gap-2">
          <ShieldCheck className="h-4 w-4 text-[#34D399]" />
          <h4 className="text-sm font-semibold text-zinc-100">
            Engellenen Kaynak / Koltuk / Kontenjan Çakışmaları ({conflictLogs.length})
          </h4>
        </div>
        <div className="space-y-2">
          {conflictLogs.map((c) => (
            <div
              key={c.id}
              className={`flex flex-wrap items-center justify-between gap-2 rounded-lg border px-3 py-2 text-xs ${
                c.resolved
                  ? 'border-emerald-500/25 bg-emerald-500/5'
                  : 'border-rose-500/30 bg-rose-500/10'
              }`}
            >
              <div className="flex items-center gap-2">
                {c.resolved ? (
                  <CheckCircle2 className="h-4 w-4 shrink-0 text-[#34D399]" />
                ) : (
                  <AlertTriangle className="h-4 w-4 shrink-0 text-rose-400" />
                )}
                <div>
                  <span className="font-mono text-[11px] font-semibold text-white">
                    {c.rejectionCode}
                  </span>{' '}
                  <span className="text-zinc-200">{c.rejectionMessage}</span>
                  {c.resolutionNote && (
                    <div className="text-[10px] text-[#34D399]">Çözüm: {c.resolutionNote}</div>
                  )}
                </div>
              </div>
              {!c.resolved && (
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => handleResolve(c.id)}
                  className="rounded bg-emerald-500/20 px-2.5 py-1 text-[11px] font-medium text-[#34D399]"
                >
                  Çözüldü İşaretle
                </button>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
