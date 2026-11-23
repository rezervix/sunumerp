'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import {
  AlertTriangle,
  BarChart3,
  CheckCircle2,
  ClipboardCheck,
  Download,
  FileSpreadsheet,
  FileText,
  Plus,
  RefreshCw,
  Settings,
  ShieldCheck,
  Smartphone,
  Users,
  Wrench,
} from 'lucide-react';
import { toast } from 'sonner';
import {
  HOTEL_BOARD_TYPES,
  HOTEL_BOARD_TYPE_LABELS,
  HOTEL_HK_STATUS_BADGES,
  HOTEL_HK_STATUS_LABELS,
  HOTEL_HK_TASK_TYPE_LABELS,
  HOTEL_INVOICE_TIMING_LABELS,
  HOTEL_KBS_STATUS_BADGES,
  HOTEL_KBS_STATUS_LABELS,
  HOTEL_KBS_TYPE_LABELS,
  HOTEL_SEASON_LABELS,
} from '@/lib/tourism/otel/constantsAndHelpers';

// ── F) Housekeeping & Teknik Hizmetler Yönetim Sekmesi ───────────────────────

export function HotelHousekeepingSupervisionTab({
  tasks,
  rooms,
  staff,
  demoCompanyId,
  onRefresh,
}: {
  tasks: any[];
  rooms: any[];
  staff: any[];
  demoCompanyId: string;
  onRefresh: () => void;
}) {
  const [roomId, setRoomId] = useState<string>(rooms[0]?.id || '');
  const [taskType, setTaskType] = useState<string>('CHECKOUT_CLEANING');
  const [assignedToUserId, setAssignedToUserId] = useState<string>(staff[0]?.id || '');
  const [faultRoomId, setFaultRoomId] = useState<string>(rooms[0]?.id || '');
  const [faultCategory, setFaultCategory] = useState<string>('KLIMA_HVAC');
  const [faultDescription, setFaultDescription] = useState<string>('');
  const [markOutOfOrder, setMarkOutOfOrder] = useState<boolean>(false);
  const [busy, setBusy] = useState<boolean>(false);

  const postAction = async (payload: Record<string, any>, successMsg: string) => {
    setBusy(true);
    try {
      const res = await fetch('/api/otel', {
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
        <div className="flex items-center gap-2">
          <ClipboardCheck className="h-4 w-4 text-[#34D399]" />
          <div>
            <h3 className="text-sm font-semibold text-zinc-100">
              Housekeeping Görevleri, Kat Şefi Denetimi & Teknik Arıza Yönetimi
            </h3>
            <p className="text-xs text-zinc-400">
              Temizlik personeli mobil ekranı çevrimdışı kuyrukla çalışır; denetim onayı (INSPECTED) odaları otomatik Satışa Hazır yapar.
            </p>
          </div>
        </div>
        <Link
          href="/dashboard/otel/housekeeping"
          className="flex items-center gap-1.5 rounded-lg bg-[#34D399] px-3 py-2 text-xs font-semibold text-[#080A09] hover:bg-emerald-300"
        >
          <Smartphone className="h-3.5 w-3.5" /> Mobil Housekeeping Ekranını Aç
        </Link>
      </div>

      {/* Yeni Görev & Teknik Arıza Formları */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <div className="space-y-3 rounded-xl border border-white/[0.08] bg-[#111513] p-4">
          <h4 className="text-xs font-semibold uppercase tracking-wider text-zinc-300">
            Temizlik Görevi Aç & Ata
          </h4>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
            <select
              value={roomId}
              onChange={(e) => setRoomId(e.target.value)}
              className="rounded-lg border border-white/[0.1] bg-[#0B0E0D] px-2.5 py-2 text-xs text-zinc-100"
            >
              {rooms.map((rm) => (
                <option key={rm.id} value={rm.id}>
                  Oda {rm.roomNumber} ({rm.status})
                </option>
              ))}
            </select>
            <select
              value={taskType}
              onChange={(e) => setTaskType(e.target.value)}
              className="rounded-lg border border-white/[0.1] bg-[#0B0E0D] px-2.5 py-2 text-xs text-zinc-100"
            >
              {Object.entries(HOTEL_HK_TASK_TYPE_LABELS)
                .filter(([k]) => k !== 'TECHNICAL_FAULT')
                .map(([k, v]) => (
                  <option key={k} value={k}>
                    {v}
                  </option>
                ))}
            </select>
            <select
              value={assignedToUserId}
              onChange={(e) => setAssignedToUserId(e.target.value)}
              className="rounded-lg border border-white/[0.1] bg-[#0B0E0D] px-2.5 py-2 text-xs text-zinc-100"
            >
              <option value="">Personel Seç...</option>
              {staff.map((st) => (
                <option key={st.id} value={st.id}>
                  {st.fullName}
                </option>
              ))}
            </select>
          </div>
          <button
            type="button"
            disabled={busy || !roomId}
            onClick={() =>
              postAction(
                { action: 'create_housekeeping_task', roomId, taskType, assignedToUserId },
                'Temizlik görevi oluşturuldu ve atandı.'
              )
            }
            className="flex items-center gap-1.5 rounded-lg bg-emerald-500/20 px-3 py-1.5 text-xs font-medium text-[#34D399] hover:bg-emerald-500/30"
          >
            <Plus className="h-3.5 w-3.5" /> Görevi Oluştur
          </button>
        </div>

        <div className="space-y-3 rounded-xl border border-white/[0.08] bg-[#111513] p-4">
          <h4 className="text-xs font-semibold uppercase tracking-wider text-orange-300">
            Teknik Arıza / Bakım Kaydı Bildir
          </h4>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
            <select
              value={faultRoomId}
              onChange={(e) => setFaultRoomId(e.target.value)}
              className="rounded-lg border border-white/[0.1] bg-[#0B0E0D] px-2.5 py-2 text-xs text-zinc-100"
            >
              {rooms.map((rm) => (
                <option key={rm.id} value={rm.id}>
                  Oda {rm.roomNumber}
                </option>
              ))}
            </select>
            <select
              value={faultCategory}
              onChange={(e) => setFaultCategory(e.target.value)}
              className="rounded-lg border border-white/[0.1] bg-[#0B0E0D] px-2.5 py-2 text-xs text-zinc-100"
            >
              <option value="KLIMA_HVAC">Klima / HVAC</option>
              <option value="TESISAT_SU">Su / Tesisat</option>
              <option value="ELEKTRIK_AYDINLATMA">Elektrik / Aydınlatma</option>
              <option value="MOBILYA_KAPI">Mobilya / Kapı Kilidi</option>
            </select>
            <input
              value={faultDescription}
              onChange={(e) => setFaultDescription(e.target.value)}
              placeholder="Arıza açıklaması..."
              className="rounded-lg border border-white/[0.1] bg-[#0B0E0D] px-2.5 py-2 text-xs text-zinc-100"
            />
          </div>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <label className="flex items-center gap-2 text-xs text-zinc-300">
              <input
                type="checkbox"
                checked={markOutOfOrder}
                onChange={(e) => setMarkOutOfOrder(e.target.checked)}
              />
              Odayı Servis Dışı (OUT_OF_ORDER) kapat
            </label>
            <button
              type="button"
              disabled={busy || !faultDescription.trim()}
              onClick={() => {
                postAction(
                  {
                    action: 'report_room_fault',
                    roomId: faultRoomId,
                    faultCategory,
                    faultDescription,
                    markRoomOutOfOrder: markOutOfOrder,
                  },
                  'Teknik arıza kaydı açıldı ve oda bakım durumuna alındı.'
                );
                setFaultDescription('');
              }}
              className="flex items-center gap-1.5 rounded-lg bg-orange-500/20 px-3 py-1.5 text-xs font-medium text-orange-300 hover:bg-orange-500/35 disabled:opacity-40"
            >
              <Wrench className="h-3.5 w-3.5" /> Arıza Bildir
            </button>
          </div>
        </div>
      </div>

      {/* Görev Listesi */}
      <div className="overflow-x-auto rounded-xl border border-white/[0.08] bg-[#111513]">
        <table className="w-full min-w-[840px] text-left text-xs">
          <thead className="border-b border-white/[0.08] bg-[#161B18] text-zinc-400">
            <tr>
              <th className="px-3 py-2.5">Görev No / Oda</th>
              <th className="px-3 py-2.5">Tür / Öncelik</th>
              <th className="px-3 py-2.5">Atanan Personel</th>
              <th className="px-3 py-2.5">Durum</th>
              <th className="px-3 py-2.5">Not / Arıza</th>
              <th className="px-3 py-2.5 text-right">Aşamalar</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/[0.05]">
            {tasks.map((t) => (
              <tr key={t.id} className="hover:bg-white/[0.02]">
                <td className="px-3 py-2.5">
                  <div className="font-mono font-semibold text-zinc-100">
                    Oda {t.roomNumber} · {t.taskNo}
                  </div>
                  <div className="text-[10px] text-zinc-500">{t.floorNumber}. Kat</div>
                </td>
                <td className="px-3 py-2.5">
                  <div className="text-zinc-200">
                    {HOTEL_HK_TASK_TYPE_LABELS[t.taskType] || t.taskType}
                  </div>
                  <span className="text-[10px] text-amber-300">Öncelik: {t.priority}</span>
                </td>
                <td className="px-3 py-2.5 text-zinc-300">{t.assignedToName || 'Atanmadı'}</td>
                <td className="px-3 py-2.5">
                  <span
                    className={`inline-flex rounded-full border px-2 py-0.5 text-[10px] font-medium ${
                      HOTEL_HK_STATUS_BADGES[t.status] || 'border-white/10 text-zinc-300'
                    }`}
                  >
                    {HOTEL_HK_STATUS_LABELS[t.status] || t.status}
                  </span>
                </td>
                <td className="px-3 py-2.5 text-zinc-400">
                  {t.faultDescription || t.notes || '-'}
                </td>
                <td className="px-3 py-2.5 text-right">
                  <div className="flex justify-end gap-1.5">
                    {t.status === 'PENDING' && (
                      <button
                        type="button"
                        disabled={busy}
                        onClick={() =>
                          postAction(
                            { action: 'update_housekeeping_task', taskId: t.id, status: 'IN_PROGRESS' },
                            `Oda ${t.roomNumber} temizlik başlatıldı.`
                          )
                        }
                        className="rounded bg-sky-500/20 px-2 py-1 text-[10px] text-sky-300 hover:bg-sky-500/35"
                      >
                        Başlat
                      </button>
                    )}
                    {(t.status === 'PENDING' || t.status === 'IN_PROGRESS') && (
                      <button
                        type="button"
                        disabled={busy}
                        onClick={() =>
                          postAction(
                            { action: 'update_housekeeping_task', taskId: t.id, status: 'COMPLETED' },
                            `Oda ${t.roomNumber} tamamlandı (denetim bekliyor).`
                          )
                        }
                        className="rounded bg-purple-500/20 px-2 py-1 text-[10px] text-purple-300 hover:bg-purple-500/35"
                      >
                        Tamamla
                      </button>
                    )}
                    {t.status === 'COMPLETED' && (
                      <button
                        type="button"
                        disabled={busy}
                        onClick={() =>
                          postAction(
                            { action: 'update_housekeeping_task', taskId: t.id, status: 'INSPECTED' },
                            `Oda ${t.roomNumber} denetlendi ve Satışa Hazır oldu.`
                          )
                        }
                        className="rounded bg-emerald-500/25 px-2 py-1 text-[10px] font-semibold text-[#34D399] hover:bg-emerald-500/40"
                      >
                        Denetim Onayla
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

// ── H) Acenta Kontenjanı (Allotment) Sekmesi ─────────────────────────────────

export function HotelAllotmentsTab({
  allotments,
  roomTypes,
  demoCompanyId,
  onRefresh,
}: {
  allotments: any[];
  roomTypes: any[];
  demoCompanyId: string;
  onRefresh: () => void;
}) {
  const [agencyName, setAgencyName] = useState('');
  const [roomTypeId, setRoomTypeId] = useState(roomTypes[0]?.id || '');
  const [allocatedRoomsPerNight, setAllocatedRoomsPerNight] = useState(3);
  const [netRatePerNightTry, setNetRatePerNightTry] = useState(3200);
  const [releaseDaysBefore, setReleaseDaysBefore] = useState(7);
  const [busy, setBusy] = useState(false);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    try {
      const res = await fetch('/api/otel', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'upsert_allotment',
          agencyName,
          roomTypeId,
          allocatedRoomsPerNight,
          netRatePerNightTry,
          releaseDaysBefore,
          demoCompanyId,
        }),
      });
      const json = await res.json();
      if (!res.ok || !json.success) throw new Error(json.error || 'Kontenjan kaydedilemedi.');
      toast.success(`Acenta kontenjanı oluşturuldu: ${json.allotment.code}`);
      setAgencyName('');
      onRefresh();
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-4">
      <form
        onSubmit={handleSave}
        className="grid grid-cols-1 gap-3 rounded-xl border border-white/[0.08] bg-[#111513] p-4 md:grid-cols-6"
      >
        <div className="md:col-span-2">
          <label className="mb-1 block text-[11px] text-zinc-400">Acenta / Tur Operatörü Adı</label>
          <input
            required
            value={agencyName}
            onChange={(e) => setAgencyName(e.target.value)}
            placeholder="Örn. Örnek Akdeniz Turizm Acentası"
            className="w-full rounded-lg border border-white/[0.1] bg-[#0B0E0D] px-2.5 py-2 text-xs text-zinc-100"
          />
        </div>
        <div>
          <label className="mb-1 block text-[11px] text-zinc-400">Oda Tipi</label>
          <select
            value={roomTypeId}
            onChange={(e) => setRoomTypeId(e.target.value)}
            className="w-full rounded-lg border border-white/[0.1] bg-[#0B0E0D] px-2.5 py-2 text-xs text-zinc-100"
          >
            {roomTypes.map((rt) => (
              <option key={rt.id} value={rt.id}>
                {rt.name}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="mb-1 block text-[11px] text-zinc-400">Gecelik Oda / Release Gün</label>
          <div className="flex gap-1.5">
            <input
              type="number"
              min={1}
              value={allocatedRoomsPerNight}
              onChange={(e) => setAllocatedRoomsPerNight(Number(e.target.value))}
              className="w-full rounded-lg border border-white/[0.1] bg-[#0B0E0D] px-2 py-2 text-xs text-zinc-100"
            />
            <input
              type="number"
              min={0}
              value={releaseDaysBefore}
              onChange={(e) => setReleaseDaysBefore(Number(e.target.value))}
              className="w-full rounded-lg border border-white/[0.1] bg-[#0B0E0D] px-2 py-2 text-xs text-zinc-100"
            />
          </div>
        </div>
        <div>
          <label className="mb-1 block text-[11px] text-zinc-400">Net Gecelik (₺)</label>
          <input
            type="number"
            min={100}
            value={netRatePerNightTry}
            onChange={(e) => setNetRatePerNightTry(Number(e.target.value))}
            className="w-full rounded-lg border border-white/[0.1] bg-[#0B0E0D] px-2.5 py-2 text-xs text-zinc-100"
          />
        </div>
        <div className="flex items-end">
          <button
            type="submit"
            disabled={busy}
            className="w-full rounded-lg bg-[#34D399] px-3 py-2 text-xs font-semibold text-[#080A09] hover:bg-emerald-300"
          >
            Kontenjan Ekle
          </button>
        </div>
      </form>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        {allotments.map((al) => (
          <div
            key={al.id}
            className={`rounded-xl border p-4 ${
              al.status === 'EXHAUSTED'
                ? 'border-rose-500/40 bg-rose-500/5'
                : al.isNearLimit || al.status === 'NEAR_LIMIT'
                  ? 'border-amber-500/40 bg-amber-500/5'
                  : 'border-white/[0.08] bg-[#111513]'
            }`}
          >
            <div className="flex items-start justify-between gap-2">
              <div>
                <div className="font-mono text-xs text-[#34D399]">{al.code}</div>
                <h4 className="text-sm font-semibold text-zinc-100">{al.agencyName}</h4>
                <p className="text-xs text-zinc-400">
                  {al.roomType?.name || 'Oda Tipi'} · Gecelik {al.allocatedRoomsPerNight} oda · Net:{' '}
                  {Number(al.netRatePerNightTry).toLocaleString('tr-TR')} ₺
                </p>
              </div>
              <span
                className={`rounded-full px-2.5 py-0.5 text-[10px] font-semibold ${
                  al.status === 'EXHAUSTED'
                    ? 'bg-rose-500/20 text-rose-300'
                    : al.isNearLimit || al.status === 'NEAR_LIMIT'
                      ? 'bg-amber-500/20 text-amber-300'
                      : 'bg-emerald-500/15 text-[#34D399]'
                }`}
              >
                {al.status} (%{al.usagePct})
              </span>
            </div>

            <div className="mt-3">
              <div className="mb-1 flex justify-between text-[11px] text-zinc-400">
                <span>
                  Kullanılan: {al.usedRoomNights} / {al.totalRoomNightCap} oda-gece
                </span>
                <span>Kalan: {al.remainingRoomNights} oda-gece</span>
              </div>
              <div className="h-2 w-full overflow-hidden rounded-full bg-white/[0.08]">
                <div
                  className={`h-full rounded-full ${
                    al.usagePct >= 95
                      ? 'bg-rose-500'
                      : al.usagePct >= 80
                        ? 'bg-amber-400'
                        : 'bg-[#34D399]'
                  }`}
                  style={{ width: `${Math.min(100, al.usagePct)}%` }}
                />
              </div>
            </div>

            <div className="mt-3 flex flex-wrap justify-between gap-2 border-t border-white/[0.06] pt-2 text-[11px] text-zinc-400">
              <span>
                Dönem: {String(al.validFrom).slice(0, 10)} → {String(al.validTo).slice(0, 10)}
              </span>
              <span>
                Release: {al.releaseDaysBefore} gün önce ({String(al.releaseDeadlineAt).slice(0, 10)})
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── E) KBS (Kimlik Bildirim Sistemi) Hazırlık & Dışa Aktarma Sekmesi ─────────

export function HotelKbsPreparationTab({
  kbsRecords,
  demoCompanyId,
  onRefresh,
}: {
  kbsRecords: any[];
  demoCompanyId: string;
  onRefresh: () => void;
}) {
  const [busy, setBusy] = useState(false);

  const handleBulkRetry = async () => {
    setBusy(true);
    try {
      const res = await fetch('/api/otel', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'bulk_prepare_or_retry_kbs',
          mode: 'RETRY_FAILED_AND_MISSING',
          demoCompanyId,
        }),
      });
      const json = await res.json();
      if (!res.ok || !json.success) throw new Error(json.error || 'Toplu deneme başarısız.');
      toast.success(`${json.processedCount} hatalı/eksik KBS kaydı yeniden doğrulandı.`);
      onRefresh();
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setBusy(false);
    }
  };

  const handleExport = async (format: 'XML_SABLON' | 'CSV' | 'JSON_PAKET') => {
    setBusy(true);
    try {
      const res = await fetch('/api/otel', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'export_kbs_package',
          format,
          markAsManualExported: true,
          demoCompanyId,
        }),
      });
      const json = await res.json();
      if (!res.ok || !json.success) throw new Error(json.error || 'Dışa aktarma başarısız.');

      const content =
        format === 'XML_SABLON'
          ? json.xmlText
          : format === 'CSV'
            ? json.csvText
            : JSON.stringify(json.records, null, 2);
      const mime =
        format === 'XML_SABLON'
          ? 'application/xml;charset=utf-8'
          : format === 'CSV'
            ? 'text/csv;charset=utf-8'
            : 'application/json;charset=utf-8';
      const ext = format === 'XML_SABLON' ? 'xml' : format === 'CSV' ? 'csv' : 'json';

      const blob = new Blob([content], { type: mime });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `SunumERP_KBS_Hazirlik_${new Date().toISOString().slice(0, 10)}.${ext}`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success(`KBS ${format} paketi indirildi (${json.recordCount} kayıt).`);
      onRefresh();
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-sky-500/30 bg-sky-500/5 p-4 text-xs text-zinc-300">
        <div className="flex items-start gap-2.5">
          <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-sky-400" />
          <div className="space-y-1">
            <strong className="text-sky-300">
              KBS Kimlik Bildirimi Hazırlık ve Kurum Dışa Aktarma Altyapısı (Canlı Bağlantı Kurulmaz)
            </strong>
            <p className="text-zinc-400">
              EGM KBS (<code>kbs.egm.gov.tr</code> — EGMSEC 2FA/OTP + sabit IP) ve Jandarma KBS Tesis 2 resmî tesis yetkisi gerektirdiğinden (doküman kontrol tarihi: 2026-11-20) bu ekran check-in/out kayıtlarını doğrular, eksik alanları raporlar ve XML şablon / CSV / JSON dışa aktarma paketi hazırlar.
            </p>
          </div>
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-white/[0.08] bg-[#111513] p-3">
        <span className="text-xs text-zinc-400">
          Toplam <strong className="text-zinc-100">{kbsRecords.length}</strong> KBS hazırlık kaydı
        </span>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            disabled={busy}
            onClick={handleBulkRetry}
            className="flex items-center gap-1.5 rounded-lg border border-amber-500/35 bg-amber-500/10 px-3 py-1.5 text-xs font-medium text-amber-300 hover:bg-amber-500/20"
          >
            <RefreshCw className="h-3.5 w-3.5" /> Hatalı / Eksikleri Yeniden Dene
          </button>
          <button
            type="button"
            disabled={busy}
            onClick={() => handleExport('XML_SABLON')}
            className="flex items-center gap-1.5 rounded-lg bg-[#34D399] px-3 py-1.5 text-xs font-semibold text-[#080A09] hover:bg-emerald-300"
          >
            <Download className="h-3.5 w-3.5" /> XML Şablon İndir
          </button>
          <button
            type="button"
            disabled={busy}
            onClick={() => handleExport('CSV')}
            className="flex items-center gap-1.5 rounded-lg border border-white/[0.12] bg-[#161B18] px-3 py-1.5 text-xs text-zinc-200 hover:bg-white/[0.08]"
          >
            <FileSpreadsheet className="h-3.5 w-3.5" /> CSV İndir
          </button>
          <button
            type="button"
            disabled={busy}
            onClick={() => handleExport('JSON_PAKET')}
            className="flex items-center gap-1.5 rounded-lg border border-white/[0.12] bg-[#161B18] px-3 py-1.5 text-xs text-zinc-200 hover:bg-white/[0.08]"
          >
            <FileText className="h-3.5 w-3.5" /> JSON Paket
          </button>
        </div>
      </div>

      <div className="overflow-x-auto rounded-xl border border-white/[0.08] bg-[#111513]">
        <table className="w-full min-w-[840px] text-left text-xs">
          <thead className="border-b border-white/[0.08] bg-[#161B18] text-zinc-400">
            <tr>
              <th className="px-3 py-2.5">KBS Ref / Oda</th>
              <th className="px-3 py-2.5">Bildirim Tipi</th>
              <th className="px-3 py-2.5">Misafir & Maskeli Kimlik</th>
              <th className="px-3 py-2.5">Durum</th>
              <th className="px-3 py-2.5">Doğrulama / Hata Notu</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/[0.05]">
            {kbsRecords.map((k) => (
              <tr key={k.id} className="hover:bg-white/[0.02]">
                <td className="px-3 py-2.5 font-mono text-[11px]">
                  <div className="font-semibold text-zinc-100">{k.kbsRefNo}</div>
                  <div className="text-zinc-500">Oda {k.roomNumber}</div>
                </td>
                <td className="px-3 py-2.5 text-zinc-300">
                  {HOTEL_KBS_TYPE_LABELS[k.notificationType] || k.notificationType}
                </td>
                <td className="px-3 py-2.5">
                  <div className="font-medium text-zinc-100">{k.guestFullName}</div>
                  <div className="font-mono text-[10px] text-zinc-400">
                    {k.guestNationality} · {k.guestTcknMasked || k.guestPassportMasked || 'Eksik'}
                    {k.guestBirthYear ? ` · ${k.guestBirthYear}` : ''}
                  </div>
                </td>
                <td className="px-3 py-2.5">
                  <span
                    className={`inline-flex rounded-full border px-2 py-0.5 text-[10px] font-medium ${
                      HOTEL_KBS_STATUS_BADGES[k.preparationStatus] || 'border-white/10 text-zinc-300'
                    }`}
                  >
                    {HOTEL_KBS_STATUS_LABELS[k.preparationStatus] || k.preparationStatus}
                  </span>
                </td>
                <td className="px-3 py-2.5 text-[11px] text-zinc-400">
                  {k.lastErrorNote || (k.exportedFormat ? `Aktarım: ${k.exportedFormat}` : 'Tam / Dışa aktarmaya hazır')}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ── A) Oda Tipleri, Tarifeler & Politika Ayarları Sekmesi ────────────────────

export function HotelRoomTypesTariffsPolicyTab({
  roomTypes,
  tariffs,
  policyConfig,
  demoCompanyId,
  onRefresh,
}: {
  roomTypes: any[];
  tariffs: any[];
  policyConfig: any;
  demoCompanyId: string;
  onRefresh: () => void;
}) {
  const [hotelDisplayName, setHotelDisplayName] = useState(policyConfig?.hotelDisplayName || '');
  const [invoiceTimingMode, setInvoiceTimingMode] = useState(
    policyConfig?.invoiceTimingMode || 'ON_CHECKOUT'
  );
  const [defaultVatRatePct, setDefaultVatRatePct] = useState(
    Number(policyConfig?.defaultVatRatePct ?? 10)
  );
  const [accommodationExtraRatePct, setAccommodationExtraRatePct] = useState(
    Number(policyConfig?.accommodationExtraRatePct ?? 2)
  );
  const [busy, setBusy] = useState(false);

  const handleSavePolicy = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    try {
      const res = await fetch('/api/otel', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'update_policy_config',
          hotelDisplayName,
          invoiceTimingMode,
          defaultVatRatePct,
          accommodationExtraRatePct,
          demoCompanyId,
        }),
      });
      const json = await res.json();
      if (!res.ok || !json.success) throw new Error(json.error || 'Ayarlar kaydedilemedi.');
      toast.success('Otel politika ve oran ayarları güncellendi.');
      onRefresh();
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* Oda Tipleri */}
      <div className="rounded-xl border border-white/[0.08] bg-[#111513] p-4">
        <h3 className="mb-3 text-sm font-semibold text-zinc-100">
          Oda Tipleri ({roomTypes.length})
        </h3>
        <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
          {roomTypes.map((rt) => (
            <div key={rt.id} className="rounded-lg border border-white/[0.08] bg-[#161B18] p-3">
              <div className="flex items-center justify-between">
                <span className="font-mono text-xs text-[#34D399]">{rt.code}</span>
                <span className="font-mono text-xs font-semibold text-zinc-100">
                  {Number(rt.baseRateTry).toLocaleString('tr-TR')} ₺ / gece
                </span>
              </div>
              <div className="mt-1 text-sm font-semibold text-white">{rt.name}</div>
              <p className="mt-1 text-[11px] text-zinc-400">
                {rt.areaSqm} m² · Maks {rt.maxAdults} Yetişkin + {rt.maxChildren} Çocuk ·{' '}
                {rt.bedConfiguration}
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* Fiyat Tarifeleri */}
      <div className="overflow-x-auto rounded-xl border border-white/[0.08] bg-[#111513] p-4">
        <h3 className="mb-3 text-sm font-semibold text-zinc-100">
          Sezon × Oda Tipi × Pansiyon Fiyat Tarifeleri ({tariffs.length})
        </h3>
        <table className="w-full min-w-[740px] text-left text-xs">
          <thead className="border-b border-white/[0.08] text-zinc-400">
            <tr>
              <th className="py-2">Tarife Kodu / Adı</th>
              <th className="py-2">Sezon</th>
              <th className="py-2">Pansiyon</th>
              <th className="py-2 text-right">Gecelik (TRY)</th>
              <th className="py-2 text-right">Ek Yetişkin / Çocuk</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/[0.05]">
            {tariffs.map((trf) => (
              <tr key={trf.id}>
                <td className="py-2">
                  <span className="font-mono text-[#34D399]">{trf.code}</span> — {trf.name}
                </td>
                <td className="py-2 text-zinc-300">
                  {HOTEL_SEASON_LABELS[trf.seasonType] || trf.seasonType}
                </td>
                <td className="py-2 text-zinc-300">
                  {HOTEL_BOARD_TYPE_LABELS[trf.boardType as keyof typeof HOTEL_BOARD_TYPE_LABELS] ||
                    trf.boardType}
                </td>
                <td className="py-2 text-right font-mono font-semibold text-zinc-100">
                  {Number(trf.nightlyRateTry).toLocaleString('tr-TR')} ₺
                </td>
                <td className="py-2 text-right font-mono text-zinc-400">
                  +{trf.extraAdultRateTry} ₺ / +{trf.childRateTry} ₺
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Ayarlanabilir Politika & Oranlar */}
      <form
        onSubmit={handleSavePolicy}
        className="grid grid-cols-1 gap-3 rounded-xl border border-white/[0.08] bg-[#111513] p-4 md:grid-cols-4"
      >
        <div className="md:col-span-4 flex items-center gap-2">
          <Settings className="h-4 w-4 text-[#34D399]" />
          <h3 className="text-sm font-semibold text-zinc-100">
            Ayarlanabilir Tesis Politika, Faturalama ve Oran Ayarları
          </h3>
        </div>
        <div>
          <label className="mb-1 block text-[11px] text-zinc-400">Tesis Görünen Adı</label>
          <input
            value={hotelDisplayName}
            onChange={(e) => setHotelDisplayName(e.target.value)}
            className="w-full rounded-lg border border-white/[0.1] bg-[#0B0E0D] px-2.5 py-2 text-xs text-zinc-100"
          />
        </div>
        <div>
          <label className="mb-1 block text-[11px] text-zinc-400">E-Belge / Fatura Zamanlaması</label>
          <select
            value={invoiceTimingMode}
            onChange={(e) => setInvoiceTimingMode(e.target.value)}
            className="w-full rounded-lg border border-white/[0.1] bg-[#0B0E0D] px-2.5 py-2 text-xs text-zinc-100"
          >
            {Object.entries(HOTEL_INVOICE_TIMING_LABELS).map(([k, v]) => (
              <option key={k} value={k}>
                {v}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="mb-1 block text-[11px] text-zinc-400">Varsayılan KDV Oranı (%)</label>
          <input
            type="number"
            min={0}
            max={100}
            value={defaultVatRatePct}
            onChange={(e) => setDefaultVatRatePct(Number(e.target.value))}
            className="w-full rounded-lg border border-white/[0.1] bg-[#0B0E0D] px-2.5 py-2 text-xs text-zinc-100"
          />
        </div>
        <div>
          <label className="mb-1 block text-[11px] text-zinc-400">
            Ek Konaklama Oranı (Ayarlanabilir %)
          </label>
          <input
            type="number"
            min={0}
            max={100}
            value={accommodationExtraRatePct}
            onChange={(e) => setAccommodationExtraRatePct(Number(e.target.value))}
            className="w-full rounded-lg border border-white/[0.1] bg-[#0B0E0D] px-2.5 py-2 text-xs text-zinc-100"
          />
        </div>
        <div className="md:col-span-4 flex justify-end">
          <button
            type="submit"
            disabled={busy}
            className="rounded-lg bg-[#34D399] px-4 py-2 text-xs font-semibold text-[#080A09] hover:bg-emerald-300"
          >
            Politika Ayarlarını Kaydet
          </button>
        </div>
      </form>
    </div>
  );
}

// ── I) Otel Raporları (Doluluk %, ADR, RevPAR, Kanal, Anonim Uyruk, XLSX/PDF) ──

export function HotelAnalyticsAndReportsTab({
  analytics,
  demoCompanyId,
}: {
  analytics: any;
  demoCompanyId: string;
}) {
  const kpis = analytics?.kpis || {};
  const daily = analytics?.dailyReport || {};
  const channels = analytics?.channelBreakdown || [];
  const roomTypes = analytics?.roomTypeBreakdown || [];
  const nationalities = analytics?.anonymizedNationalityStats || [];

  const exportUrl = (format: 'xlsx' | 'pdf') =>
    `/api/otel?section=report_export&format=${format}&demoCompanyId=${encodeURIComponent(
      demoCompanyId
    )}`;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-white/[0.08] bg-[#111513] p-4">
        <div className="flex items-center gap-2">
          <BarChart3 className="h-4 w-4 text-[#34D399]" />
          <div>
            <h3 className="text-sm font-semibold text-zinc-100">
              Doluluk %, ADR, RevPAR, Kanal & Anonim Uyruk Raporları
            </h3>
            <p className="text-xs text-zinc-400">
              Tüm metrikler {analytics?.periodDays || 90} günlük konaklama ve folio verilerinden canlı hesaplanır.
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          <a
            href={exportUrl('xlsx')}
            className="flex items-center gap-1.5 rounded-lg bg-[#34D399] px-3 py-2 text-xs font-semibold text-[#080A09] hover:bg-emerald-300"
          >
            <FileSpreadsheet className="h-3.5 w-3.5" /> Excel (.xlsx) İndir
          </a>
          <a
            href={exportUrl('pdf')}
            className="flex items-center gap-1.5 rounded-lg border border-white/[0.12] bg-[#161B18] px-3 py-2 text-xs font-medium text-zinc-200 hover:bg-white/[0.08]"
          >
            <FileText className="h-3.5 w-3.5" /> PDF (.pdf) İndir
          </a>
        </div>
      </div>

      {/* Formül Açıklaması ve Ana KPI Kartları */}
      <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
        <div className="rounded-xl border border-white/[0.08] bg-[#111513] p-4">
          <div className="text-xs text-zinc-400">Dönem Doluluk Oranı (%)</div>
          <div className="mt-1 text-2xl font-bold text-[#34D399]">%{kpis.occupancyPct ?? 0}</div>
          <div className="mt-1 text-[11px] text-zinc-400">
            {kpis.soldRoomNights ?? 0} / {kpis.sellableRoomNights ?? 0} oda-gece
          </div>
          <div className="mt-2 rounded bg-[#0B0E0D] px-2 py-1 font-mono text-[10px] text-zinc-400">
            Formül: {kpis.formulas?.occupancyFormula}
          </div>
        </div>
        <div className="rounded-xl border border-white/[0.08] bg-[#111513] p-4">
          <div className="text-xs text-zinc-400">ADR (Ortalama Günlük Oda Fiyatı)</div>
          <div className="mt-1 text-2xl font-bold text-sky-300">
            {Number(kpis.adrTry || 0).toLocaleString('tr-TR')} ₺
          </div>
          <div className="mt-1 text-[11px] text-zinc-400">
            Oda Geliri: {Number(kpis.roomRevenueTry || 0).toLocaleString('tr-TR')} ₺
          </div>
          <div className="mt-2 rounded bg-[#0B0E0D] px-2 py-1 font-mono text-[10px] text-zinc-400">
            Formül: {kpis.formulas?.adrFormula}
          </div>
        </div>
        <div className="rounded-xl border border-white/[0.08] bg-[#111513] p-4">
          <div className="text-xs text-zinc-400">RevPAR (Mevcut Oda Başı Gelir)</div>
          <div className="mt-1 text-2xl font-bold text-amber-300">
            {Number(kpis.revParTry || 0).toLocaleString('tr-TR')} ₺
          </div>
          <div className="mt-1 text-[11px] text-zinc-400">
            Toplam Gelir (+Ekstra): {Number(kpis.totalRevenueTry || 0).toLocaleString('tr-TR')} ₺
          </div>
          <div className="mt-2 rounded bg-[#0B0E0D] px-2 py-1 font-mono text-[10px] text-zinc-400">
            Formül: {kpis.formulas?.revParFormula}
          </div>
        </div>
      </div>

      {/* Kanal Dağılımı & Anonimleştirilmiş Uyruk İstatistikleri */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <div className="rounded-xl border border-white/[0.08] bg-[#111513] p-4">
          <h4 className="mb-3 text-sm font-semibold text-zinc-100">
            Kanal / Acenta Bazlı Gelir Dağılımı
          </h4>
          <div className="space-y-2.5">
            {channels.map((ch: any) => (
              <div key={ch.channelSource} className="space-y-1 text-xs">
                <div className="flex justify-between">
                  <span className="text-zinc-200">{ch.label}</span>
                  <span className="font-mono text-[#34D399]">
                    {Number(ch.revenueTry).toLocaleString('tr-TR')} ₺ ({ch.roomNights} gece)
                  </span>
                </div>
                <div className="h-1.5 w-full rounded-full bg-white/[0.08]">
                  <div
                    className="h-full rounded-full bg-[#34D399]"
                    style={{
                      width: `${Math.min(
                        100,
                        (ch.revenueTry / Math.max(1, kpis.totalRevenueTry || 1)) * 100
                      )}%`,
                    }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-xl border border-white/[0.08] bg-[#111513] p-4">
          <div className="mb-3 flex items-center justify-between">
            <h4 className="text-sm font-semibold text-zinc-100">
              Anonimleştirilmiş Misafir Uyruk İstatistikleri
            </h4>
            <span className="rounded bg-emerald-500/15 px-2 py-0.5 text-[10px] text-[#34D399]">
              KVKK · Kişisel Veri İçermez
            </span>
          </div>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
            {nationalities.map((n: any) => (
              <div
                key={n.nationalityCode}
                className="rounded-lg border border-white/[0.08] bg-[#161B18] p-2.5 text-xs"
              >
                <div className="font-mono text-sm font-bold text-white">{n.nationalityCode}</div>
                <div className="text-[11px] text-zinc-400">
                  {n.guestCount} misafir · {n.staysCount} konaklama
                </div>
                <div className="mt-1 font-mono text-[11px] text-[#34D399]">%{n.sharePct}</div>
              </div>
            ))}
          </div>
          <div className="mt-3 rounded-lg bg-[#0B0E0D] p-2.5 text-[11px] text-zinc-400">
            Günlük Özet ({daily.reportDate}):{' '}
            <strong className="text-zinc-200">{daily.inHouseCount}</strong> konaklayan ·{' '}
            <strong className="text-sky-300">{daily.arrivalsToday}</strong> bugün giriş ·{' '}
            <strong className="text-amber-300">{daily.departuresToday}</strong> bugün çıkış ·{' '}
            <strong className="text-[#34D399]">{daily.cleanVacantCount}</strong> temiz boş
          </div>
        </div>
      </div>

      {/* Oda Tipi Bazlı Performans Tablosu */}
      <div className="overflow-x-auto rounded-xl border border-white/[0.08] bg-[#111513] p-4">
        <h4 className="mb-3 text-sm font-semibold text-zinc-100">
          Oda Tipi Bazlı Doluluk, ADR ve RevPAR Tablosu
        </h4>
        <table className="w-full min-w-[700px] text-left text-xs">
          <thead className="border-b border-white/[0.08] text-zinc-400">
            <tr>
              <th className="py-2">Oda Tipi</th>
              <th className="py-2 text-right">Oda Adedi</th>
              <th className="py-2 text-right">Satılan Gece</th>
              <th className="py-2 text-right">Doluluk %</th>
              <th className="py-2 text-right">ADR (₺)</th>
              <th className="py-2 text-right">RevPAR (₺)</th>
              <th className="py-2 text-right">Oda Geliri (₺)</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/[0.05]">
            {roomTypes.map((rt: any) => (
              <tr key={rt.roomTypeId}>
                <td className="py-2 font-medium text-zinc-100">
                  {rt.name} <span className="font-mono text-[10px] text-zinc-500">({rt.code})</span>
                </td>
                <td className="py-2 text-right font-mono">{rt.roomCount}</td>
                <td className="py-2 text-right font-mono">{rt.soldRoomNights}</td>
                <td className="py-2 text-right font-mono text-[#34D399]">%{rt.occupancyPct}</td>
                <td className="py-2 text-right font-mono">
                  {Number(rt.adrTry).toLocaleString('tr-TR')}
                </td>
                <td className="py-2 text-right font-mono">
                  {Number(rt.revParTry).toLocaleString('tr-TR')}
                </td>
                <td className="py-2 text-right font-mono font-semibold text-zinc-100">
                  {Number(rt.roomRevenueTry).toLocaleString('tr-TR')}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
