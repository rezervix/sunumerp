'use client';

import React, { useRef, useState } from 'react';
import {
  AlertTriangle,
  Calendar,
  CheckCircle2,
  Clock,
  FileText,
  Plus,
  RefreshCw,
  Search,
  ShieldAlert,
  Truck,
  X,
} from 'lucide-react';
import { toast } from 'sonner';
import {
  calculateRentalPricing,
  RENT_CONTRACT_STATUS_LABELS,
  RENT_RESERVATION_STATUS_BADGES,
  RENT_RESERVATION_STATUS_LABELS,
  type RentContractStatus,
  type RentReservationStatus,
} from '@/lib/tourism/rentacar/constantsAndHelpers';

const GANTT_CELL_BADGES: Record<string, { bg: string; label: string; short: string }> = {
  RENTED: {
    bg: 'bg-[--brand]/25 text-[#1267E6] border-[--brand-line]',
    label: 'Kirada (Teslim Edildi)',
    short: 'KİRADA',
  },
  RESERVED: {
    bg: 'bg-sky-500/25 text-sky-300 border-sky-500/40',
    label: 'Rezerve (Onaylı/Bekleyen)',
    short: 'REZ',
  },
  MAINTENANCE: {
    bg: 'bg-amber-500/25 text-[var(--warn)] border-[var(--warn-line)]',
    label: 'Bakımda / Servis',
    short: 'BAKIM',
  },
  AVAILABLE: {
    bg: 'bg-white text-[var(--text-muted)] border-[var(--line-soft)]',
    label: 'Müsait (Boş Gün)',
    short: 'BOŞ',
  },
};

export function RentAvailabilityGanttTab({
  gantt,
  classes,
  conflictLogs,
  selectedClassId,
  selectedBranchId,
  ganttStartDate,
  onFilterChange,
  onSelectReservationId,
  onOpenNewReservationForVehicle,
}: {
  gantt: { dateHeaders: string[]; rows: any[] };
  classes: any[];
  conflictLogs: any[];
  selectedClassId: string;
  selectedBranchId: string;
  ganttStartDate: string;
  onFilterChange: (filters: { classId?: string; branchId?: string; startDate?: string }) => void;
  onSelectReservationId: (reservationId: string) => void;
  onOpenNewReservationForVehicle: (vehicleId: string, dateKey?: string) => void;
}) {
  const dateHeaders = gantt?.dateHeaders || [];
  const rows = gantt?.rows || [];

  return (
    <div className="space-y-4">
      {/* Filtre Çubuğu ve Renk Lejantı */}
      <div className="bg-[white]/90 border border-[--line] rounded-[20px] p-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2.5">
          <div>
            <label className="block text-[10px] text-[var(--text-muted)] mb-1">Araç Sınıfı Filtresi</label>
            <select
              value={selectedClassId}
              onChange={(e) => onFilterChange({ classId: e.target.value })}
              className="bg-[#F6F8FB] border border-[var(--line)] rounded-xl px-3 py-1.5 text-xs text-[var(--text)]"
            >
              <option value="">Tüm Araç Sınıfları</option>
              {classes.map((cls: any) => (
                <option key={cls.id} value={cls.id}>
                  {cls.name} ({cls.code})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-[10px] text-[var(--text-muted)] mb-1">Şube / Lokasyon</label>
            <select
              value={selectedBranchId}
              onChange={(e) => onFilterChange({ branchId: e.target.value })}
              className="bg-[#F6F8FB] border border-[var(--line)] rounded-xl px-3 py-1.5 text-xs text-[var(--text)]"
            >
              <option value="">Tüm Şubeler</option>
              <option value="local-debug-branch">İstanbul Levent Merkez</option>
              <option value="branch-izmir">İzmir Alsancak Şubesi</option>
              <option value="branch-ankara">Ankara Çankaya Şubesi</option>
              <option value="branch-bursa">Bursa Nilüfer Şubesi</option>
            </select>
          </div>

          <div>
            <label className="block text-[10px] text-[var(--text-muted)] mb-1">Takvim Başlangıç Tarihi</label>
            <input
              type="date"
              value={ganttStartDate}
              onChange={(e) => onFilterChange({ startDate: e.target.value })}
              className="bg-[#F6F8FB] border border-[var(--line)] rounded-xl px-3 py-1.5 text-xs text-[var(--text)]"
            />
          </div>
        </div>

        {/* Renk=Durum Lejantı */}
        <div className="flex flex-wrap items-center gap-2 text-[11px]">
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-[--brand]/20 text-[#1267E6] border border-[--brand-line]">
            <span className="w-2 h-2 rounded-full bg-[#1267E6]" /> Kirada
          </span>
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-sky-500/20 text-sky-300 border border-sky-500/30">
            <span className="w-2 h-2 rounded-full bg-sky-400" /> Rezerve
          </span>
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-[var(--warn-soft)] text-[var(--warn)] border border-[var(--warn-line)]">
            <span className="w-2 h-2 rounded-full bg-amber-400" /> Bakımda (Kiralanamaz)
          </span>
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-[--muted-bg] text-[var(--text-2)] border border-[--line]">
            <span className="w-2 h-2 rounded-full bg-zinc-400" /> Boş / Müsait Gün
          </span>
        </div>
      </div>

      {/* Gantt Zaman Çizelgesi Tablosu */}
      <div className="bg-[white]/90 border border-[--line] rounded-[20px] p-4 overflow-x-auto">
        <div className="flex items-center justify-between mb-3">
          <div>
            <h3 className="text-sm font-semibold text-[var(--text)]">
              Araç Müsaitlik Takvimi (Gantt Zaman Ekseni — {rows.length} Kiralama Aracı)
            </h3>
            <p className="text-[11px] text-[var(--text-muted)]">
              Dolu hücreye tıklayarak rezervasyon detayını açabilir, boş güne tıklayarak o araç için hızlı rezervasyon başlatabilirsiniz.
            </p>
          </div>
        </div>

        <table className="w-full text-left border-collapse min-w-[1100px]">
          <thead>
            <tr className="border-b border-[--line] text-[10px] text-[var(--text-muted)]">
              <th className="py-2.5 px-3 w-56 sticky left-0 bg-[white] z-10">Araç &amp; Sınıf</th>
              <th className="py-2.5 px-2 w-28 text-center">Doluluk / Boş Gün</th>
              {dateHeaders.map((dt) => {
                const [, m, d] = dt.split('-');
                return (
                  <th key={dt} className="py-2 px-1 text-center font-mono min-w-[44px]">
                    <div>{d}.{m}</div>
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody className="divide-y divide-white/[0.05] text-xs">
            {rows.map((row: any) => (
              <tr key={row.vehicleId} className="hover:bg-[--page]">
                <td className="py-2.5 px-3 sticky left-0 bg-[white] z-10 border-r border-[var(--line-soft)]">
                  <div className="font-mono font-semibold text-[var(--text)] flex items-center gap-1.5">
                    <span>{row.plate}</span>
                    {row.rentalStatus === 'MAINTENANCE' && (
                      <span className="px-1.5 py-0.5 text-[9px] rounded bg-[var(--warn-soft)] text-[var(--warn)] border border-[var(--warn-line)]">
                        BAKIMDA
                      </span>
                    )}
                  </div>
                  <div className="text-[11px] text-[var(--text-muted)] truncate">{row.brandModel}</div>
                  <div className="text-[10px] text-[#1267E6]">{row.vehicleClassName}</div>
                </td>
                <td className="py-2 px-2 text-center font-mono">
                  <div className="text-xs font-semibold text-[var(--text)]">%{row.occupancyPct}</div>
                  <div className="text-[10px] text-[var(--text-muted)]">{row.availableDaysCount} boş gün</div>
                </td>
                {row.days.map((cell: any) => {
                  const cfg = GANTT_CELL_BADGES[cell.status] || GANTT_CELL_BADGES.AVAILABLE;
                  return (
                    <td key={cell.dateKey} className="p-0.5 text-center">
                      <button
                        type="button"
                        onClick={() => {
                          if (cell.reservationId) {
                            onSelectReservationId(cell.reservationId);
                          } else if (cell.status === 'AVAILABLE') {
                            onOpenNewReservationForVehicle(row.vehicleId, cell.dateKey);
                          } else if (cell.status === 'MAINTENANCE') {
                            toast.warning(
                              `${row.plate} plakalı araç bu tarihte bakımda (${cell.maintenanceRef || 'Servis'}) olduğu için kiralanamaz.`
                            );
                          }
                        }}
                        title={
                          cell.reservationNo
                            ? `${cell.reservationNo} — ${cell.customerName} (${cfg.label})`
                            : cell.maintenanceRef
                              ? `Bakım İş Emri: ${cell.maintenanceRef}`
                              : `${row.plate} — ${cell.dateKey}: Müsait`
                        }
                        className={`w-full h-8 rounded-lg border text-[9px] font-mono font-medium flex flex-col items-center justify-center transition cursor-pointer ${cfg.bg}`}
                      >
                        <span>{cfg.short}</span>
                      </button>
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Atomik Çift Rezervasyon & Bakım Çakışması Engellenen Girişimler Günlüğü */}
      <div className="bg-[white]/90 border border-[--line] rounded-[20px] p-4">
        <div className="flex items-center gap-2 mb-2.5">
          <ShieldAlert className="w-4 h-4 text-[var(--warn)]" />
          <h4 className="text-xs font-semibold text-[var(--text)]">
            Sunucu Atomik Çakışma Kilidi Günlüğü (Engellenen Çift Rezervasyon &amp; Bakım Çakışmaları)
          </h4>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-2.5">
          {conflictLogs.slice(0, 6).map((log: any) => (
            <div
              key={log.id}
              className="bg-[#F6F8FB]/80 border border-[var(--warn-line)] rounded-xl p-3 text-xs space-y-1"
            >
              <div className="flex items-center justify-between">
                <span className="font-mono font-semibold text-[var(--warn)]">{log.vehiclePlate}</span>
                <span className="px-2 py-0.5 rounded-full text-[10px] bg-[var(--bad-soft)] text-[var(--bad)] border border-[var(--bad-line)]">
                  {log.rejectionCode === 'VEHICLE_IN_MAINTENANCE'
                    ? 'Bakımda Araç Engeli'
                    : 'Çift Rezervasyon Kilidi'}
                </span>
              </div>
              <p className="text-[11px] text-[var(--text-2)] leading-relaxed">{log.rejectionMessage}</p>
              <div className="text-[10px] text-[var(--text-muted)] font-mono">
                Referans: {log.conflictingRefNo || '-'} ·{' '}
                {new Date(log.attemptedAt).toLocaleString('tr-TR')}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export function RentReservationsAndContractsTab({
  reservations,
  contracts,
  rentalVehicles,
  classes,
  tariffs,
  extraServices,
  customers,
  chauffeurDrivers,
  demoCompanyId,
  initialSelectedReservationId,
  preselectedVehicleForNew,
  onRefresh,
  onGoToHandoverForReservation,
}: {
  reservations: any[];
  contracts: any[];
  rentalVehicles: any[];
  classes: any[];
  tariffs: any[];
  extraServices: any[];
  customers: any[];
  chauffeurDrivers: any[];
  demoCompanyId?: string;
  initialSelectedReservationId?: string | null;
  preselectedVehicleForNew?: { vehicleId: string; dateKey?: string } | null;
  onRefresh: () => void;
  onGoToHandoverForReservation: (reservationId: string) => void;
}) {
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [showNewModal, setShowNewModal] = useState<boolean>(Boolean(preselectedVehicleForNew));
  const [submitting, setSubmitting] = useState<boolean>(false);

  // Yeni Rezervasyon Formu
  const [newVehicleId, setNewVehicleId] = useState<string>(
    preselectedVehicleForNew?.vehicleId || rentalVehicles[0]?.id || ''
  );
  const [newCustomerId, setNewCustomerId] = useState<string>(customers[0]?.id || '');
  const [newStartAt, setNewStartAt] = useState<string>(
    preselectedVehicleForNew?.dateKey
      ? `${preselectedVehicleForNew.dateKey}T09:00`
      : '2026-11-28T09:00'
  );
  const [newEndAt, setNewEndAt] = useState<string>('2026-12-02T09:00');
  const [selectedExtraIds, setSelectedExtraIds] = useState<string[]>([]);
  const [withChauffeur, setWithChauffeur] = useState<boolean>(false);
  const [chauffeurDriverId, setChauffeurDriverId] = useState<string>('');
  const [additionalDriverName, setAdditionalDriverName] = useState<string>('');
  const [newNotes, setNewNotes] = useState<string>('');

  // Süre Uzatma / Araç Değiştirme Modal
  const [extendModalRes, setExtendModalRes] = useState<any | null>(null);
  const [extendEndAt, setExtendEndAt] = useState<string>('');
  const [extendNotes, setExtendNotes] = useState<string>('');

  const [swapModalRes, setSwapModalRes] = useState<any | null>(null);
  const [swapNewVehicleId, setSwapNewVehicleId] = useState<string>('');
  const [swapReason, setSwapReason] = useState<string>('Periyodik bakım / operasyonel ikame');

  // Sözleşme & Dijital İmza Modal
  const [activeContractModal, setActiveContractModal] = useState<{
    reservation: any;
    contract: any | null;
  } | null>(null);
  const [signerName, setSignerName] = useState<string>('');
  const sigCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const isDrawingRef = useRef<boolean>(false);
  const hasDrawnSigRef = useRef<boolean>(false);

  const selectedVehicleObj = rentalVehicles.find((v) => v.id === newVehicleId);
  const matchingTariff =
    tariffs.find((t) => t.vehicleClassId === selectedVehicleObj?.rentalClassId) || tariffs[0];

  const livePricing = calculateRentalPricing({
    startAt: newStartAt,
    endAt: newEndAt,
    dailyRateTry: Number(matchingTariff?.dailyRateTry || 2100),
    weeklyDailyRateTry: matchingTariff?.weeklyDailyRateTry,
    monthlyDailyRateTry: matchingTariff?.monthlyDailyRateTry,
    dailyKmLimit: Number(matchingTariff?.dailyKmLimit || 250),
    extraKmRateTry: Number(matchingTariff?.extraKmRateTry || 6.5),
    depositAmountTry: Number(matchingTariff?.depositAmountTry || 5000),
    selectedExtras: extraServices
      .filter((e) => selectedExtraIds.includes(e.id))
      .map((e) => ({
        serviceId: e.id,
        code: e.code,
        name: e.name,
        pricingType: e.pricingType,
        unitPriceTry: e.unitPriceTry,
        quantity: 1,
      })),
  });

  const filteredReservations = reservations.filter((r) => {
    if (initialSelectedReservationId && r.id === initialSelectedReservationId) return true;
    if (statusFilter && r.status !== statusFilter) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.trim().toLowerCase();
      const matchNo = String(r.reservationNo || '').toLowerCase().includes(q);
      const matchPlate = String(r.vehicle?.plate || '').toLowerCase().includes(q);
      const matchCust = String(r.customer?.name || r.customer?.company || '')
        .toLowerCase()
        .includes(q);
      if (!matchNo && !matchPlate && !matchCust) return false;
    }
    return true;
  });

  const handleCreateReservation = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setSubmitting(true);
      const res = await fetch('/api/arac-kiralama', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'create_reservation',
          demoCompanyId,
          vehicleId: newVehicleId,
          vehicleClassId: selectedVehicleObj?.rentalClassId,
          tariffId: matchingTariff?.id,
          customerId: newCustomerId,
          startAt: new Date(newStartAt).toISOString(),
          endAt: new Date(newEndAt).toISOString(),
          selectedExtraIds,
          withChauffeur,
          chauffeurDriverId: withChauffeur ? chauffeurDriverId : null,
          additionalDriverName: additionalDriverName.trim() || null,
          notes: newNotes.trim() || null,
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Rezervasyon oluşturulamadı.');
      }
      toast.success(`Rezervasyon oluşturuldu (${data.reservation.reservationNo}).`);
      setShowNewModal(false);
      onRefresh();
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleExtendReservation = async () => {
    if (!extendModalRes || !extendEndAt) return;
    try {
      setSubmitting(true);
      const res = await fetch('/api/arac-kiralama', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'extend_reservation',
          demoCompanyId,
          reservationId: extendModalRes.id,
          newEndAt: new Date(extendEndAt).toISOString(),
          notes: extendNotes,
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Süre uzatma işlemi başarısız.');
      }
      toast.success(`${extendModalRes.reservationNo} rezervasyon süresi uzatıldı.`);
      setExtendModalRes(null);
      onRefresh();
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleSwapVehicle = async () => {
    if (!swapModalRes || !swapNewVehicleId) return;
    try {
      setSubmitting(true);
      const res = await fetch('/api/arac-kiralama', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'swap_vehicle',
          demoCompanyId,
          reservationId: swapModalRes.id,
          newVehicleId: swapNewVehicleId,
          swapReason,
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Araç değişimi yapılamadı.');
      }
      toast.success(`${swapModalRes.reservationNo} için araç değişimi tamamlandı.`);
      setSwapModalRes(null);
      onRefresh();
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleStatusChange = async (
    reservationId: string,
    status: RentReservationStatus,
    cancelReason?: string
  ) => {
    try {
      setSubmitting(true);
      const res = await fetch('/api/arac-kiralama', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'update_reservation_status',
          demoCompanyId,
          reservationId,
          status,
          cancelReason,
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Durum güncellenemedi.');
      }
      toast.success('Rezervasyon durumu güncellendi.');
      onRefresh();
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  // Sözleşme İmza Çizim Fonksiyonları
  const startSigDraw = (x: number, y: number) => {
    const ctx = sigCanvasRef.current?.getContext('2d');
    if (!ctx) return;
    isDrawingRef.current = true;
    hasDrawnSigRef.current = true;
    ctx.strokeStyle = '#1267E6';
    ctx.lineWidth = 2.5;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(x, y);
  };
  const moveSigDraw = (x: number, y: number) => {
    if (!isDrawingRef.current) return;
    const ctx = sigCanvasRef.current?.getContext('2d');
    if (!ctx) return;
    ctx.lineTo(x, y);
    ctx.stroke();
  };
  const endSigDraw = () => {
    isDrawingRef.current = false;
  };
  const clearSigCanvas = () => {
    const c = sigCanvasRef.current;
    if (!c) return;
    c.getContext('2d')?.clearRect(0, 0, c.width, c.height);
    hasDrawnSigRef.current = false;
  };

  const handleGenerateOrSignContract = async () => {
    if (!activeContractModal) return;
    try {
      setSubmitting(true);
      let sigDataUrl: string | null =
        activeContractModal.contract?.customerSignatureDataUrl || null;
      if (hasDrawnSigRef.current && sigCanvasRef.current) {
        sigDataUrl = sigCanvasRef.current.toDataURL('image/png');
      }
      const res = await fetch('/api/arac-kiralama', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'generate_or_sign_contract',
          demoCompanyId,
          reservationId: activeContractModal.reservation.id,
          customerSignatureDataUrl: sigDataUrl,
          customerSignedByName:
            signerName.trim() ||
            activeContractModal.reservation.customer?.name ||
            'Kiracı Müşteri',
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Sözleşme kaydedilemedi.');
      }
      toast.success(`Kiralama sözleşmesi kaydedildi (${data.contract.contractNo}).`);
      setActiveContractModal({
        reservation: activeContractModal.reservation,
        contract: data.contract,
      });
      onRefresh();
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handlePrintContract = (contract: any, reservation: any) => {
    const win = window.open('', '_blank', 'width=840,height=900');
    if (!win) {
      toast.info('Yazdırma penceresi için tarayıcı izni gerekiyor.');
      return;
    }
    win.document.write(`
      <!DOCTYPE html>
      <html lang="tr">
      <head>
        <meta charset="utf-8" />
        <title>Kiralama Sözleşmesi — ${contract.contractNo}</title>
        <style>
          body { font-family: Arial, sans-serif; padding: 32px; color: #111; line-height: 1.5; }
          .badge { display: inline-block; padding: 4px 10px; background: #fef3c7; border: 1px solid #f59e0b; font-size: 12px; font-weight: bold; }
          pre { white-space: pre-wrap; font-family: Arial, sans-serif; background: #f9fafb; padding: 16px; border: 1px solid #e5e7eb; border-radius: 8px; }
          .sig-box { margin-top: 24px; display: flex; justify-content: space-between; gap: 24px; }
          .sig-col { border: 1px solid #d1d5db; padding: 14px; border-radius: 8px; width: 46%; }
        </style>
      </head>
      <body>
        <div class="badge">${contract.templateVersionLabel || 'ÖRNEK ŞABLON (Hukuki İnceleme Gerektirir)'}</div>
        <h2>ARAÇ KİRALAMA SÖZLEŞMESİ — ${contract.contractNo}</h2>
        <p><strong>Rezervasyon No:</strong> ${reservation?.reservationNo || '-'} | <strong>Plaka:</strong> ${reservation?.vehicle?.plate || '-'}</p>
        <pre>${contract.renderedTermsText}</pre>
        <div class="sig-box">
          <div class="sig-col">
            <strong>Kiralayan Operasyon Yetkilisi</strong><br/>
            ${contract.staffSignedByName || 'Operasyon Yetkilisi'}<br/>
            <small>${contract.staffSignedAt ? new Date(contract.staffSignedAt).toLocaleString('tr-TR') : ''}</small>
          </div>
          <div class="sig-col">
            <strong>Kiracı Müşteri İmzası</strong><br/>
            ${contract.customerSignedByName || '-'}<br/>
            ${contract.customerSignatureDataUrl ? `<img src="${contract.customerSignatureDataUrl}" style="max-height:70px;margin-top:6px;" />` : '<em>İmza Bekliyor</em>'}
          </div>
        </div>
        <script>window.print();</script>
      </body>
      </html>
    `);
    win.document.close();
  };

  return (
    <div className="space-y-4">
      {/* Üst Filtre ve Yeni Rezervasyon Butonu */}
      <div className="bg-[white]/90 border border-[--line] rounded-[20px] p-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2.5">
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-[var(--text-muted)] absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="Rezervasyon no, plaka, müşteri ara..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="bg-[#F6F8FB] border border-[var(--line)] rounded-xl pl-8 pr-3 py-1.5 text-xs text-[var(--text)] w-64"
            />
          </div>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="bg-[#F6F8FB] border border-[var(--line)] rounded-xl px-3 py-1.5 text-xs text-[var(--text)]"
          >
            <option value="">Tüm Durumlar ({reservations.length})</option>
            <option value="ACTIVE">Kirada / Aktif</option>
            <option value="CONFIRMED">Onaylı (Rezerve)</option>
            <option value="PENDING">Onay Bekliyor</option>
            <option value="COMPLETED">İade Alındı (Tamamlandı)</option>
            <option value="CANCELLED">İptal Edildi</option>
            <option value="NO_SHOW">Gelmedi (No-Show)</option>
          </select>
        </div>

        <button
          type="button"
          onClick={() => setShowNewModal(true)}
          className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#1267E6] hover:bg-[--brand] text-white text-xs font-semibold cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          Yeni Kiralama Rezervasyonu
        </button>
      </div>

      {/* Rezervasyonlar Tablosu */}
      <div className="bg-[white]/90 border border-[--line] rounded-[20px] p-4 overflow-x-auto">
        <table className="w-full text-left border-collapse min-w-[980px]">
          <thead>
            <tr className="border-b border-[--line] text-[11px] text-[var(--text-muted)]">
              <th className="py-2.5 px-3">Rezervasyon / Sözleşme</th>
              <th className="py-2.5 px-3">Araç &amp; Sınıf</th>
              <th className="py-2.5 px-3">Kiracı Müşteri &amp; Ek Sürücü</th>
              <th className="py-2.5 px-3">Alış – İade Dönemi</th>
              <th className="py-2.5 px-3">Tutar &amp; Depozito</th>
              <th className="py-2.5 px-3">Durum</th>
              <th className="py-2.5 px-3 text-right">Operasyon İşlemleri</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/[0.05] text-xs">
            {filteredReservations.map((r: any) => {
              const statusKey = (r.status || 'CONFIRMED') as RentReservationStatus;
              const badgeCls =
                RENT_RESERVATION_STATUS_BADGES[statusKey] ||
                RENT_RESERVATION_STATUS_BADGES.CONFIRMED;
              const contract =
                r.contract || contracts.find((c: any) => c.reservationId === r.id) || null;
              const isOverdue =
                r.status === 'ACTIVE' && new Date(r.endAt).getTime() < Date.now();

              return (
                <tr key={r.id} className="hover:bg-[--page]">
                  <td className="py-3 px-3">
                    <div className="font-mono font-semibold text-[var(--text)]">{r.reservationNo}</div>
                    {contract ? (
                      <div className="text-[11px] text-[#1267E6] font-mono">
                        {contract.contractNo} ({RENT_CONTRACT_STATUS_LABELS[contract.status as RentContractStatus] || contract.status})
                      </div>
                    ) : (
                      <div className="text-[11px] text-[var(--text-muted)]">Sözleşme bekliyor</div>
                    )}
                    {r.extensionCount > 0 && (
                      <span className="inline-block mt-0.5 px-1.5 py-0.5 rounded text-[10px] bg-sky-500/15 text-sky-300">
                        +{r.extensionCount} kez uzatıldı
                      </span>
                    )}
                  </td>

                  <td className="py-3 px-3">
                    <div className="font-mono font-semibold text-[var(--text)]">
                      {r.vehicle?.plate || r.vehicleId}
                    </div>
                    <div className="text-[11px] text-[var(--text-muted)]">
                      {r.vehicle ? `${r.vehicle.brand} ${r.vehicle.model}` : '-'}
                    </div>
                    <div className="text-[10px] text-[var(--text-muted)]">
                      Limit: {r.totalKmLimit} km ({r.dailyKmLimit} km/gün)
                    </div>
                  </td>

                  <td className="py-3 px-3">
                    <div className="font-medium text-[var(--text)]">
                      {r.customer?.name || r.customer?.company || 'Kiracı'}
                    </div>
                    {r.additionalDriverName && (
                      <div className="text-[11px] text-sky-300">
                        Ek Sürücü: {r.additionalDriverName}
                      </div>
                    )}
                    {r.withChauffeur && (
                      <div className="text-[10px] text-[var(--warn)]">Şoförlü Tahsis</div>
                    )}
                  </td>

                  <td className="py-3 px-3 font-mono text-[11px]">
                    <div className="text-[var(--text-2)]">
                      Alış: {new Date(r.startAt).toLocaleDateString('tr-TR')}
                    </div>
                    <div className={isOverdue ? 'text-[var(--bad)] font-semibold' : 'text-[var(--text-2)]'}>
                      İade: {new Date(r.endAt).toLocaleDateString('tr-TR')} ({r.rentalDays} gün)
                    </div>
                    {isOverdue && (
                      <span className="inline-flex items-center gap-1 text-[10px] text-[var(--bad)]">
                        <AlertTriangle className="w-3 h-3" /> İade Süresi Aşıldı
                      </span>
                    )}
                  </td>

                  <td className="py-3 px-3 font-mono">
                    <div className="text-[var(--text)] font-semibold">
                      ₺{Number(r.finalTotalTry || r.totalEstimatedTry || 0).toLocaleString('tr-TR')}
                    </div>
                    <div className="text-[11px] text-[var(--text-muted)]">
                      Depozito: ₺{Number(r.depositRequiredTry || 0).toLocaleString('tr-TR')}
                    </div>
                  </td>

                  <td className="py-3 px-3">
                    <span
                      className={`inline-flex items-center px-2.5 py-1 rounded-full text-[11px] border ${badgeCls}`}
                    >
                      {RENT_RESERVATION_STATUS_LABELS[statusKey] || r.status}
                    </span>
                  </td>

                  <td className="py-3 px-3 text-right">
                    <div className="flex flex-wrap items-center justify-end gap-1.5">
                      <button
                        type="button"
                        onClick={() => {
                          setSignerName(r.customer?.name || '');
                          setActiveContractModal({ reservation: r, contract });
                        }}
                        className="px-2.5 py-1 rounded-lg bg-[--muted-bg] hover:bg-white/[0.12] text-[11px] text-[var(--text)] cursor-pointer"
                      >
                        Sözleşme / İmza
                      </button>

                      {(r.status === 'CONFIRMED' || r.status === 'ACTIVE') && (
                        <>
                          <button
                            type="button"
                            onClick={() => onGoToHandoverForReservation(r.id)}
                            className="px-2.5 py-1 rounded-lg bg-[--brand]/20 hover:bg-[--brand]/30 text-[11px] text-[#1267E6] border border-[--brand-line] cursor-pointer"
                          >
                            {r.status === 'CONFIRMED' ? 'Teslim Formu' : 'İade Al'}
                          </button>

                          <button
                            type="button"
                            onClick={() => {
                              setExtendModalRes(r);
                              const nextDt = new Date(
                                new Date(r.endAt).getTime() + 2 * 86_400_000
                              );
                              setExtendEndAt(nextDt.toISOString().slice(0, 16));
                            }}
                            className="px-2 py-1 rounded-lg bg-sky-500/15 hover:bg-sky-500/25 text-[11px] text-sky-300 cursor-pointer"
                          >
                            Uzat
                          </button>

                          <button
                            type="button"
                            onClick={() => {
                              setSwapModalRes(r);
                              const alt = rentalVehicles.find(
                                (v) =>
                                  v.id !== r.vehicleId && v.rentalStatus === 'AVAILABLE'
                              );
                              setSwapNewVehicleId(alt?.id || '');
                            }}
                            className="px-2 py-1 rounded-lg bg-[var(--warn-soft)] hover:bg-amber-500/25 text-[11px] text-[var(--warn)] cursor-pointer"
                          >
                            Araç Değiştir
                          </button>
                        </>
                      )}

                      {r.status === 'PENDING' && (
                        <button
                          type="button"
                          onClick={() => handleStatusChange(r.id, 'CONFIRMED')}
                          className="px-2.5 py-1 rounded-lg bg-[--brand]/20 text-[#1267E6] text-[11px] cursor-pointer"
                        >
                          Onayla
                        </button>
                      )}

                      {(r.status === 'PENDING' || r.status === 'CONFIRMED') && (
                        <button
                          type="button"
                          onClick={() =>
                            handleStatusChange(r.id, 'CANCELLED', 'Operasyon tarafından iptal edildi')
                          }
                          className="px-2 py-1 rounded-lg bg-[var(--bad-soft)] text-[var(--bad)] text-[11px] cursor-pointer"
                        >
                          İptal
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* YENİ REZERVASYON MODAL */}
      {showNewModal && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[white] border border-[var(--line)] rounded-[20px] max-w-2xl w-full p-5 space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-[var(--text)]">
                Yeni Kiralama Rezervasyonu (Atomik Çakışma &amp; Ehliyet Kontrolü)
              </h3>
              <button
                type="button"
                onClick={() => setShowNewModal(false)}
                className="text-[var(--text-muted)] hover:text-[var(--brand)] cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateReservation} className="space-y-3 text-xs">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[var(--text-muted)] mb-1">Kiralama Aracı</label>
                  <select
                    value={newVehicleId}
                    onChange={(e) => setNewVehicleId(e.target.value)}
                    className="w-full bg-[#F6F8FB] border border-[var(--line)] rounded-xl px-3 py-2 text-[var(--text)]"
                  >
                    {rentalVehicles.map((v) => (
                      <option key={v.id} value={v.id}>
                        {v.plate} — {v.brand} {v.model} ({v.vehicleClassName} · {v.rentalStatus})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-[var(--text-muted)] mb-1">Kiracı Müşteri / Sürücü</label>
                  <select
                    value={newCustomerId}
                    onChange={(e) => setNewCustomerId(e.target.value)}
                    className="w-full bg-[#F6F8FB] border border-[var(--line)] rounded-xl px-3 py-2 text-[var(--text)]"
                  >
                    {customers.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name} {c.company ? `(${c.company})` : ''} {c.isBlacklisted ? '[KARA LİSTE]' : ''}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-[var(--text-muted)] mb-1">Teslim (Alış) Tarihi &amp; Saati</label>
                  <input
                    type="datetime-local"
                    value={newStartAt}
                    onChange={(e) => setNewStartAt(e.target.value)}
                    className="w-full bg-[#F6F8FB] border border-[var(--line)] rounded-xl px-3 py-2 text-[var(--text)]"
                    required
                  />
                </div>

                <div>
                  <label className="block text-[var(--text-muted)] mb-1">Planlanan İade Tarihi &amp; Saati</label>
                  <input
                    type="datetime-local"
                    value={newEndAt}
                    onChange={(e) => setNewEndAt(e.target.value)}
                    className="w-full bg-[#F6F8FB] border border-[var(--line)] rounded-xl px-3 py-2 text-[var(--text)]"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-[var(--text-muted)] mb-1">Ek Hizmet &amp; Güvence Paketleri</label>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                  {extraServices.map((ex) => {
                    const checked = selectedExtraIds.includes(ex.id);
                    return (
                      <label
                        key={ex.id}
                        className={`flex items-center justify-between p-2.5 rounded-xl border cursor-pointer ${ checked ? 'bg-[--brand]/15 border-[--brand-line] text-[var(--text)]' : 'bg-[#F6F8FB] border-[--line] text-[var(--text-2)]' }`}
                      >
                        <div className="flex items-center gap-2">
                          <input
                            type="checkbox"
                            checked={checked}
                            onChange={() =>
                              setSelectedExtraIds((prev) =>
                                checked ? prev.filter((id) => id !== ex.id) : [...prev, ex.id]
                              )
                            }
                          />
                          <span>{ex.name}</span>
                        </div>
                        <span className="font-mono text-[#1267E6]">
                          ₺{ex.unitPriceTry}/{ex.pricingType === 'DAILY' ? 'gün' : 'kira'}
                        </span>
                      </label>
                    );
                  })}
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[var(--text-muted)] mb-1">Ek Sürücü Ad Soyad (Opsiyonel)</label>
                  <input
                    type="text"
                    value={additionalDriverName}
                    onChange={(e) => setAdditionalDriverName(e.target.value)}
                    placeholder="Örn: Selin Arslan"
                    className="w-full bg-[#F6F8FB] border border-[var(--line)] rounded-xl px-3 py-2 text-[var(--text)]"
                  />
                </div>

                <div>
                  <label className="flex items-center gap-2 text-[var(--text-2)] mt-5 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={withChauffeur}
                      onChange={(e) => setWithChauffeur(e.target.checked)}
                    />
                    Şirket Şoförü İle Tahsis Et (Filo Şoför Kadrosundan)
                  </label>
                  {withChauffeur && (
                    <select
                      value={chauffeurDriverId}
                      onChange={(e) => setChauffeurDriverId(e.target.value)}
                      className="w-full mt-1.5 bg-[#F6F8FB] border border-[var(--line)] rounded-xl px-3 py-1.5 text-[var(--text)]"
                    >
                      <option value="">Şoför Seçiniz</option>
                      {chauffeurDrivers.map((d) => (
                        <option key={d.id} value={d.id}>
                          {d.fullName} ({d.licenseClass})
                        </option>
                      ))}
                    </select>
                  )}
                </div>
              </div>

              {/* Canlı Fiyat Özeti */}
              <div className="bg-[#F6F8FB] border border-[--brand-line] rounded-xl p-3 flex flex-wrap items-center justify-between gap-2">
                <div>
                  <div className="text-[11px] text-[var(--text-muted)]">
                    {livePricing.rentalDays} Gün ({livePricing.tierApplied} Kademe) · Günlük ₺
                    {livePricing.appliedDailyRateTry.toLocaleString('tr-TR')} · Toplam Limit:{' '}
                    {livePricing.totalKmLimit} km
                  </div>
                  <div className="text-xs text-[var(--text-2)]">
                    Kira: ₺{livePricing.baseRentalAmountTry.toLocaleString('tr-TR')} + Ek Hizmet: ₺
                    {livePricing.extrasTotalTry.toLocaleString('tr-TR')} | Depozito: ₺
                    {livePricing.depositRequiredTry.toLocaleString('tr-TR')}
                  </div>
                </div>
                <div className="text-base font-bold font-mono text-[#1267E6]">
                  Toplam: ₺{livePricing.totalEstimatedTry.toLocaleString('tr-TR')}
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowNewModal(false)}
                  className="px-4 py-2 rounded-xl bg-[--muted-bg] text-[var(--text-2)] cursor-pointer"
                >
                  Vazgeç
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-4 py-2 rounded-xl bg-[#1267E6] text-[var(--text)] font-semibold cursor-pointer"
                >
                  {submitting ? 'Kaydediliyor...' : 'Atomik Kontrol İle Rezervasyonu Kaydet'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* SÜRE UZATMA MODAL */}
      {extendModalRes && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[white] border border-[var(--line)] rounded-[20px] max-w-md w-full p-5 space-y-3 text-xs">
            <h3 className="text-sm font-bold text-[var(--text)]">
              Rezervasyon Süresi Uzat — {extendModalRes.reservationNo}
            </h3>
            <p className="text-[var(--text-muted)]">
              Mevcut İade Tarihi: {new Date(extendModalRes.endAt).toLocaleString('tr-TR')}
            </p>
            <div>
              <label className="block text-[var(--text-muted)] mb-1">Yeni İade Tarihi &amp; Saati</label>
              <input
                type="datetime-local"
                value={extendEndAt}
                onChange={(e) => setExtendEndAt(e.target.value)}
                className="w-full bg-[#F6F8FB] border border-[var(--line)] rounded-xl px-3 py-2 text-[var(--text)]"
              />
            </div>
            <div>
              <label className="block text-[var(--text-muted)] mb-1">Uzatma Notu</label>
              <input
                type="text"
                value={extendNotes}
                onChange={(e) => setExtendNotes(e.target.value)}
                placeholder="Müşteri talebiyle uzatıldı"
                className="w-full bg-[#F6F8FB] border border-[var(--line)] rounded-xl px-3 py-2 text-[var(--text)]"
              />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setExtendModalRes(null)}
                className="px-3 py-1.5 rounded-xl bg-[--muted-bg] text-[var(--text-2)] cursor-pointer"
              >
                Kapat
              </button>
              <button
                type="button"
                disabled={submitting}
                onClick={handleExtendReservation}
                className="px-4 py-1.5 rounded-xl bg-[#1267E6] text-[var(--text)] font-semibold cursor-pointer"
              >
                Süreyi Uzat
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ARAÇ DEĞİŞTİRME / İKAME MODAL */}
      {swapModalRes && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[white] border border-[var(--line)] rounded-[20px] max-w-md w-full p-5 space-y-3 text-xs">
            <h3 className="text-sm font-bold text-[var(--text)]">
              Araç Değiştir / İkame Ata — {swapModalRes.reservationNo}
            </h3>
            <div>
              <label className="block text-[var(--text-muted)] mb-1">Yeni Atanacak Müsait Araç</label>
              <select
                value={swapNewVehicleId}
                onChange={(e) => setSwapNewVehicleId(e.target.value)}
                className="w-full bg-[#F6F8FB] border border-[var(--line)] rounded-xl px-3 py-2 text-[var(--text)]"
              >
                {rentalVehicles
                  .filter((v) => v.id !== swapModalRes.vehicleId)
                  .map((v) => (
                    <option key={v.id} value={v.id}>
                      {v.plate} — {v.brand} {v.model} ({v.rentalStatus})
                    </option>
                  ))}
              </select>
            </div>
            <div>
              <label className="block text-[var(--text-muted)] mb-1">Değişim / İkame Gerekçesi</label>
              <input
                type="text"
                value={swapReason}
                onChange={(e) => setSwapReason(e.target.value)}
                className="w-full bg-[#F6F8FB] border border-[var(--line)] rounded-xl px-3 py-2 text-[var(--text)]"
              />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setSwapModalRes(null)}
                className="px-3 py-1.5 rounded-xl bg-[--muted-bg] text-[var(--text-2)] cursor-pointer"
              >
                Kapat
              </button>
              <button
                type="button"
                disabled={submitting}
                onClick={handleSwapVehicle}
                className="px-4 py-1.5 rounded-xl bg-amber-400 text-[var(--text)] font-semibold cursor-pointer"
              >
                Aracı Değiştir
              </button>
            </div>
          </div>
        </div>
      )}

      {/* KİRALAMA SÖZLEŞMESİ, TARAYICI İMZA ALANI VE YAZDIR / PDF MODAL */}
      {activeContractModal && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[white] border border-[var(--line)] rounded-[20px] max-w-3xl w-full p-5 space-y-4 max-h-[90vh] overflow-y-auto text-xs">
            <div className="flex items-center justify-between">
              <div>
                <span className="px-2.5 py-0.5 rounded-full text-[10px] bg-[var(--warn-soft)] text-[var(--warn)] border border-[var(--warn-line)]">
                  ÖRNEK ŞABLON — Hukuki İnceleme Gerektirir
                </span>
                <h3 className="text-sm font-bold text-[var(--text)] mt-1">
                  Kiralama Sözleşmesi &amp; Dijital Müşteri İmzası —{' '}
                  {activeContractModal.contract?.contractNo ||
                    activeContractModal.reservation.reservationNo}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setActiveContractModal(null)}
                className="text-[var(--text-muted)] hover:text-[var(--brand)] cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <pre className="bg-[#F6F8FB] border border-[--line] rounded-xl p-4 text-[11px] text-[var(--text-2)] whitespace-pre-wrap font-sans leading-relaxed max-h-60 overflow-y-auto">
              {activeContractModal.contract?.renderedTermsText ||
                'Sözleşme metni rezervasyon bilgilerinden üretilmeye hazır. Aşağıdan imzalayarak sözleşmeyi oluşturabilirsiniz.'}
            </pre>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-[var(--text-muted)] mb-1">İmzalayan Kiracı Ad Soyad</label>
                <input
                  type="text"
                  value={signerName}
                  onChange={(e) => setSignerName(e.target.value)}
                  className="w-full bg-[#F6F8FB] border border-[var(--line)] rounded-xl px-3 py-2 text-[var(--text)] mb-2"
                />
                {activeContractModal.contract?.customerSignatureDataUrl && (
                  <div className="bg-[#F6F8FB] border border-[--brand-line] rounded-xl p-2">
                    <div className="text-[10px] text-[#1267E6] mb-1">Kayıtlı Dijital İmza:</div>
                    <img
                      src={activeContractModal.contract.customerSignatureDataUrl}
                      alt="Müşteri İmzası"
                      className="h-14 object-contain"
                    />
                  </div>
                )}
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-[var(--text-muted)]">Tarayıcı Dijital İmza Çizim Alanı</label>
                  <button
                    type="button"
                    onClick={clearSigCanvas}
                    className="text-[11px] text-[var(--bad)] hover:underline cursor-pointer"
                  >
                    İmzayı Temizle
                  </button>
                </div>
                <canvas
                  ref={sigCanvasRef}
                  width={340}
                  height={110}
                  onMouseDown={(e) => {
                    const rect = e.currentTarget.getBoundingClientRect();
                    startSigDraw(e.clientX - rect.left, e.clientY - rect.top);
                  }}
                  onMouseMove={(e) => {
                    const rect = e.currentTarget.getBoundingClientRect();
                    moveSigDraw(e.clientX - rect.left, e.clientY - rect.top);
                  }}
                  onMouseUp={endSigDraw}
                  onMouseLeave={endSigDraw}
                  onTouchStart={(e) => {
                    const rect = e.currentTarget.getBoundingClientRect();
                    const t = e.touches[0];
                    if (t) startSigDraw(t.clientX - rect.left, t.clientY - rect.top);
                  }}
                  onTouchMove={(e) => {
                    const rect = e.currentTarget.getBoundingClientRect();
                    const t = e.touches[0];
                    if (t) moveSigDraw(t.clientX - rect.left, t.clientY - rect.top);
                  }}
                  onTouchEnd={endSigDraw}
                  className="w-full bg-[#F6F8FB] border border-dashed border-[--brand-line] rounded-xl cursor-crosshair"
                />
              </div>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-2 pt-2">
              {activeContractModal.contract && (
                <button
                  type="button"
                  onClick={() =>
                    handlePrintContract(
                      activeContractModal.contract,
                      activeContractModal.reservation
                    )
                  }
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-[var(--brand-soft)] hover:bg-[var(--brand-soft-2)] text-[var(--brand)] font-medium cursor-pointer"
                >
                  <FileText className="w-3.5 h-3.5 text-[#1267E6]" />
                  Yazdır / PDF Olarak Kaydet
                </button>
              )}

              <div className="flex items-center gap-2 ml-auto">
                <button
                  type="button"
                  onClick={() => setActiveContractModal(null)}
                  className="px-3.5 py-2 rounded-xl bg-[--muted-bg] text-[var(--text-2)] cursor-pointer"
                >
                  Kapat
                </button>
                <button
                  type="button"
                  disabled={submitting}
                  onClick={handleGenerateOrSignContract}
                  className="px-4 py-2 rounded-xl bg-[#1267E6] text-[var(--text)] font-semibold cursor-pointer"
                >
                  {submitting ? 'Kaydediliyor...' : 'Sözleşmeyi Üret & Dijital İmzayı Kaydet'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
