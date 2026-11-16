'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  AlertTriangle,
  CheckCircle2,
  ClipboardCheck,
  Clock,
  CreditCard,
  FileCheck2,
  PackageCheck,
  QrCode,
  Send,
  ShieldAlert,
  Truck,
  X,
} from 'lucide-react';
import { toast } from 'sonner';
import {
  ALLOWED_RMA_TRANSITIONS,
  RMA_CREDIT_STATUS_LABELS,
  RMA_DECISION_BADGE_CLASSES,
  RMA_DECISION_LABELS,
  RMA_QUALITY_DECISIONS,
  RMA_REASON_LABELS,
  RMA_STATUS_BADGE_CLASSES,
  RMA_STATUS_LABELS,
  isRmaEligibleForRefundTrigger,
  normalizeLegacyRmaStatus,
  type RmaCreditNoteStatus,
  type RmaQualityDecision,
  type RmaReasonCode,
  type RmaWorkflowStatus,
} from '@/lib/logistics/returns/constantsAndHelpers';

const LIFECYCLE_STEPS: RmaWorkflowStatus[] = [
  'TALEP',
  'ONAYLANDI',
  'YOLDA',
  'TESLIM_ALINDI',
  'INCELEMEDE',
  'KARARA_BAGLANDI',
  'KAPANDI',
];

interface Props {
  rma: any | null;
  storageBins: any[];
  suppliers: any[];
  onClose: () => void;
  onUpdated: () => void;
}

export function RmaDetailAndDecisionDrawer({
  rma,
  storageBins,
  suppliers,
  onClose,
  onUpdated,
}: Props) {
  const [detail, setDetail] = useState<any | null>(rma);
  const [inspection, setInspection] = useState<any | null>(null);
  const [ncr, setNcr] = useState<any | null>(null);
  const [linkedSupplier, setLinkedSupplier] = useState<any | null>(null);
  const [busy, setBusy] = useState(false);

  // Durum geçişi
  const [transitionNote, setTransitionNote] = useState('');
  const [trackingInput, setTrackingInput] = useState('');

  // Mal kabul (Karantina)
  const [quarantineBinCode, setQuarantineBinCode] = useState('Q-01-01');
  const [lineReceiveMap, setLineReceiveMap] = useState<
    Record<string, { receivedQty: number; damagedQty: number; lotNumber: string }>
  >({});

  // Kalite & Karar
  const [decision, setDecision] = useState<RmaQualityDecision>('RESTOCK_TO_BIN');
  const [sellableBinCode, setSellableBinCode] = useState('A-01-01');
  const [newExpiryDate, setNewExpiryDate] = useState('');
  const [supplierId, setSupplierId] = useState('');
  const [severity, setSeverity] = useState<'MINOR' | 'MAJOR' | 'CRITICAL'>('MAJOR');
  const [defectCategory, setDefectCategory] = useState('MATERIAL');
  const [inspectorNote, setInspectorNote] = useState('');

  const loadDetail = async (id: string) => {
    try {
      const res = await fetch(
        `/api/omnichannel?section=rma_detail&rmaId=${encodeURIComponent(id)}`,
        { cache: 'no-store' }
      );
      if (res.ok) {
        const data = await res.json();
        if (data.success && data.rma) {
          setDetail(data.rma);
          setInspection(data.inspection || null);
          setNcr(data.ncr || null);
          setLinkedSupplier(data.supplier || null);
          setSupplierId(data.rma.supplierId || '');
        }
      }
    } catch {
      // Fallback: mevcut prop verisi korunur
    }
  };

  useEffect(() => {
    if (!rma) {
      setDetail(null);
      return;
    }
    setDetail(rma);
    setInspection(null);
    setNcr(null);
    setLinkedSupplier(null);
    setTrackingInput(rma.returnTrackingNo || '');
    setSupplierId(rma.supplierId || '');
    setQuarantineBinCode(
      rma.receivedBinCode || rma.targetBinCode || 'Q-01-01'
    );

    const initMap: Record<
      string,
      { receivedQty: number; damagedQty: number; lotNumber: string }
    > = {};
    const lines =
      Array.isArray(rma.lines) && rma.lines.length > 0
        ? rma.lines
        : [{ id: 'single', sku: rma.sku, requestedQty: rma.returnQty, lotNumber: '' }];
    for (const l of lines) {
      const key = l.id || l.sku;
      initMap[key] = {
        receivedQty: Number(l.receivedQty || l.requestedQty || rma.returnQty || 0),
        damagedQty: Number(l.damagedQty || 0),
        lotNumber: l.lotNumber || '',
      };
    }
    setLineReceiveMap(initMap);
    loadDetail(rma.id);
  }, [rma]);

  if (!rma || !detail) return null;

  const status = normalizeLegacyRmaStatus(detail);
  const allowedNext = ALLOWED_RMA_TRANSITIONS[status] || [];
  const refundEligible = isRmaEligibleForRefundTrigger(detail);
  const activeCreditNote =
    Array.isArray(detail.creditNotes) && detail.creditNotes.length > 0
      ? detail.creditNotes.find((c: any) => c.status !== 'REDDEDILDI') ||
        detail.creditNotes[0]
      : null;

  const quarantineBins = storageBins.filter(
    (b) =>
      b.binRole === 'QUARANTINE' ||
      b.binRole === 'RETURN_RMA' ||
      String(b.code || '').startsWith('Q-') ||
      String(b.code || '').startsWith('RMA-')
  );
  const sellableBins = storageBins.filter(
    (b) =>
      !b.isBlocked &&
      b.binRole !== 'QUARANTINE' &&
      b.binRole !== 'RETURN_RMA'
  );

  const callAction = async (payload: Record<string, any>, successMsg?: string) => {
    setBusy(true);
    try {
      const res = await fetch('/api/omnichannel', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'İşlem başarısız');
      }
      toast.success(data.message || successMsg || 'İşlem tamamlandı');
      await loadDetail(detail.id);
      onUpdated();
    } catch (err: any) {
      toast.error(err.message || 'İşlem hatası');
    } finally {
      setBusy(false);
    }
  };

  const handleTransition = async (toStatus: RmaWorkflowStatus) => {
    if (toStatus === 'REDDEDILDI' && !transitionNote.trim()) {
      toast.error('Red kararı için açıklama notu girilmelidir.');
      return;
    }
    await callAction({
      action: 'transition_rma_status',
      rmaId: detail.id,
      toStatus,
      note: transitionNote.trim() || undefined,
      returnTrackingNo: trackingInput.trim() || undefined,
    });
    setTransitionNote('');
  };

  const handleReceiveQuarantine = async () => {
    const lines =
      Array.isArray(detail.lines) && detail.lines.length > 0
        ? detail.lines
        : [{ id: undefined, sku: detail.sku, requestedQty: detail.returnQty }];

    const receivedLines = lines.map((l: any) => {
      const entry = lineReceiveMap[l.id || l.sku] || {
        receivedQty: Number(l.requestedQty || detail.returnQty || 0),
        damagedQty: 0,
        lotNumber: '',
      };
      return {
        lineId: l.id || undefined,
        sku: l.sku,
        receivedQty: Number(entry.receivedQty || 0),
        damagedQty: Number(entry.damagedQty || 0),
        lotNumber: entry.lotNumber || undefined,
      };
    });

    await callAction({
      action: 'receive_rma_quarantine',
      rmaId: detail.id,
      targetBinCode: quarantineBinCode,
      method: 'WEB',
      note: transitionNote.trim() || 'Web depo mal kabul teyidi',
      receivedLines,
    });
  };

  const handleQualityDecision = async () => {
    if (decision === 'RETURN_TO_VENDOR' && !supplierId) {
      toast.error('Tedarikçiye iade (RTV) kararı için tedarikçi seçmelisiniz.');
      return;
    }
    await callAction({
      action: 'decide_rma_inspection',
      rmaId: detail.id,
      decision,
      targetBinCode: decision === 'RESTOCK_TO_BIN' ? sellableBinCode : quarantineBinCode,
      newExpiryDate: newExpiryDate || undefined,
      supplierId: supplierId || undefined,
      severity,
      defectCategory,
      inspectorNote: inspectorNote.trim() || undefined,
    });
  };

  const handleCreditAction = async (
    creditAction: 'REQUEST_DRAFT' | 'APPROVE' | 'ISSUE_AND_PAY' | 'REJECT'
  ) => {
    await callAction({
      action: 'process_credit_note',
      creditAction,
      rmaId: detail.id,
      creditNoteId: activeCreditNote?.id,
      closeRma: creditAction === 'ISSUE_AND_PAY',
    });
  };

  const stepIndex = LIFECYCLE_STEPS.indexOf(status);

  return (
    <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-md flex justify-end">
      <div className="bg-[#0d110f] border-l border-white/[0.08] w-full max-w-3xl h-full flex flex-col shadow-2xl">
        {/* Başlık */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/[0.06] bg-[#111513]">
          <div>
            <div className="flex items-center gap-2.5 flex-wrap">
              <h2 className="text-lg font-semibold font-mono text-white">
                {detail.rmaNumber}
              </h2>
              <span
                className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-medium border ${
                  RMA_STATUS_BADGE_CLASSES[status]
                }`}
              >
                {RMA_STATUS_LABELS[status]}
              </span>
              {detail.qualityDecision && (
                <span
                  className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-medium border ${
                    RMA_DECISION_BADGE_CLASSES[detail.qualityDecision as RmaQualityDecision] ||
                    'bg-white/5 text-zinc-300 border-white/10'
                  }`}
                >
                  {RMA_DECISION_LABELS[detail.qualityDecision as RmaQualityDecision] ||
                    detail.qualityDecision}
                </span>
              )}
            </div>
            <p className="text-xs text-zinc-400 mt-1">
              Sipariş: <span className="font-mono text-zinc-200">{detail.orderNumber}</span> ·{' '}
              {detail.customerName} ({detail.channelCode})
            </p>
          </div>

          <div className="flex items-center gap-2">
            <Link
              href={`/dashboard/omnichannel/rma/${detail.id}/print`}
              target="_blank"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/[0.06] hover:bg-white/[0.12] border border-white/[0.1] text-xs font-medium text-white"
            >
              <QrCode className="w-3.5 h-3.5 text-[#34D399]" />
              Etiket / Fiş
            </Link>
            <button
              type="button"
              onClick={onClose}
              className="p-2 rounded-xl text-zinc-400 hover:text-white hover:bg-white/[0.06] cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Gövde */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* 7 Adımlı Yaşam Döngüsü Çubuğu */}
          <div className="bg-[#111513] border border-white/[0.06] rounded-2xl p-4 space-y-3">
            <div className="flex items-center justify-between text-xs">
              <span className="font-semibold text-zinc-300">RMA Yaşam Döngüsü</span>
              {detail.channelCode !== 'ERP' && (
                <button
                  type="button"
                  disabled={busy}
                  onClick={() =>
                    callAction({ action: 'push_rma_channel_status', rmaId: detail.id })
                  }
                  className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-white/[0.05] hover:bg-white/[0.1] border border-white/[0.08] text-[11px] text-zinc-200 cursor-pointer"
                >
                  <Send className="w-3 h-3 text-[#34D399]" />
                  Kanala Durum Bildir
                </button>
              )}
            </div>
            <div className="grid grid-cols-7 gap-1.5">
              {LIFECYCLE_STEPS.map((st, idx) => {
                const done = stepIndex >= idx && stepIndex !== -1;
                return (
                  <div
                    key={st}
                    className={`rounded-xl px-2 py-2 text-center border text-[10px] ${
                      done
                        ? 'bg-emerald-500/15 border-emerald-500/30 text-[#34D399] font-semibold'
                        : 'bg-black/30 border-white/[0.05] text-zinc-500'
                    }`}
                  >
                    <div className="truncate">{RMA_STATUS_LABELS[st].split(' ')[0]}</div>
                  </div>
                );
              })}
            </div>

            {/* Süre & Neden Özeti */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1 text-[11px]">
              <div className="bg-black/30 rounded-xl p-2.5 border border-white/[0.04]">
                <div className="text-zinc-500">Neden Kodu</div>
                <div className="text-white font-medium mt-0.5">
                  {RMA_REASON_LABELS[(detail.reasonCode || 'CAYMA_HAKKI') as RmaReasonCode] ||
                    detail.reasonCode}
                </div>
              </div>
              <div className="bg-black/30 rounded-xl p-2.5 border border-white/[0.04]">
                <div className="text-zinc-500">İade Süresi / Son Tarih</div>
                <div className="text-white font-mono mt-0.5">
                  {detail.returnWindowDays || 14} gün ·{' '}
                  {detail.returnDeadlineAt
                    ? new Date(detail.returnDeadlineAt).toLocaleDateString('tr-TR')
                    : '-'}
                </div>
              </div>
              <div className="bg-black/30 rounded-xl p-2.5 border border-white/[0.04]">
                <div className="text-zinc-500">Hedef Depo / Hücre</div>
                <div className="text-[#34D399] font-mono mt-0.5">
                  {detail.receivedBinCode || detail.targetBinCode || 'Q-01-01'}
                </div>
              </div>
              <div className="bg-black/30 rounded-xl p-2.5 border border-white/[0.04]">
                <div className="text-zinc-500">Takip / Çevrim</div>
                <div className="text-white font-mono mt-0.5">
                  {detail.returnTrackingNo || '-'}
                  {detail.cycleHours ? ` (${detail.cycleHours}s)` : ''}
                </div>
              </div>
            </div>

            {/* Durum Geçiş Aksiyonları */}
            {allowedNext.length > 0 && (
              <div className="pt-2 border-t border-white/[0.06] space-y-2">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                  <input
                    type="text"
                    value={transitionNote}
                    onChange={(e) => setTransitionNote(e.target.value)}
                    placeholder="Durum geçiş veya red gerekçesi notu..."
                    className="bg-black/40 border border-white/[0.08] rounded-xl px-3 py-1.5 text-white"
                  />
                  <input
                    type="text"
                    value={trackingInput}
                    onChange={(e) => setTrackingInput(e.target.value)}
                    placeholder="Kargo takip no (opsiyonel)"
                    className="bg-black/40 border border-white/[0.08] rounded-xl px-3 py-1.5 text-white font-mono"
                  />
                </div>
                <div className="flex flex-wrap gap-2">
                  {allowedNext
                    .filter((st) => st !== 'TESLIM_ALINDI')
                    .map((st) => (
                      <button
                        key={st}
                        type="button"
                        disabled={busy}
                        onClick={() => handleTransition(st)}
                        className={`px-3 py-1.5 rounded-full text-xs font-semibold cursor-pointer disabled:opacity-50 ${
                          st === 'REDDEDILDI' || st === 'IPTAL'
                            ? 'bg-rose-500/15 hover:bg-rose-500/25 text-rose-300 border border-rose-500/30'
                            : 'bg-white/[0.08] hover:bg-white/[0.14] text-white border border-white/[0.1]'
                        }`}
                      >
                        → {RMA_STATUS_LABELS[st]}
                      </button>
                    ))}
                </div>
              </div>
            )}
          </div>

          {/* Mal Kabul / Karantina Paneli */}
          {['TALEP', 'ONAYLANDI', 'YOLDA'].includes(status) && (
            <div className="bg-[#111513] border border-amber-500/25 rounded-2xl p-4 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-sm font-semibold text-amber-300">
                  <Truck className="w-4 h-4" />
                  Fiziksel Mal Kabul &amp; Karantina Girişi
                </div>
                <select
                  value={quarantineBinCode}
                  onChange={(e) => setQuarantineBinCode(e.target.value)}
                  className="bg-black/50 border border-white/[0.1] rounded-xl px-3 py-1.5 text-xs font-mono text-white"
                >
                  {quarantineBins.length === 0 ? (
                    <>
                      <option value="Q-01-01" className="bg-[#111513]">Q-01-01 (Karantina)</option>
                      <option value="RMA-01-01" className="bg-[#111513]">RMA-01-01 (İade Kabul)</option>
                    </>
                  ) : (
                    quarantineBins.map((b) => (
                      <option key={b.id} value={b.code} className="bg-[#111513]">
                        {b.code} ({b.binRole || b.binType || 'Karantina'})
                      </option>
                    ))
                  )}
                </select>
              </div>

              <div className="space-y-2">
                {(Array.isArray(detail.lines) && detail.lines.length > 0
                  ? detail.lines
                  : [{ id: 'single', sku: detail.sku, itemName: detail.itemName, requestedQty: detail.returnQty }]
                ).map((l: any) => {
                  const key = l.id || l.sku;
                  const cur = lineReceiveMap[key] || {
                    receivedQty: Number(l.requestedQty || 0),
                    damagedQty: 0,
                    lotNumber: '',
                  };
                  return (
                    <div
                      key={key}
                      className="grid grid-cols-12 gap-2 items-center bg-black/30 p-2.5 rounded-xl border border-white/[0.05] text-xs"
                    >
                      <div className="col-span-5">
                        <div className="text-white font-medium truncate">{l.itemName}</div>
                        <div className="text-[10px] font-mono text-zinc-500">
                          {l.sku} · Talep: {l.requestedQty}
                        </div>
                      </div>
                      <div className="col-span-2">
                        <label className="text-[10px] text-zinc-400 block">Sağlam</label>
                        <input
                          type="number"
                          min={0}
                          value={cur.receivedQty}
                          onChange={(e) =>
                            setLineReceiveMap((prev) => ({
                              ...prev,
                              [key]: { ...cur, receivedQty: Number(e.target.value || 0) },
                            }))
                          }
                          className="w-full bg-black/50 border border-white/[0.1] rounded-lg px-2 py-1 text-white font-mono"
                        />
                      </div>
                      <div className="col-span-2">
                        <label className="text-[10px] text-amber-300 block">Hasarlı</label>
                        <input
                          type="number"
                          min={0}
                          value={cur.damagedQty}
                          onChange={(e) =>
                            setLineReceiveMap((prev) => ({
                              ...prev,
                              [key]: { ...cur, damagedQty: Number(e.target.value || 0) },
                            }))
                          }
                          className="w-full bg-black/50 border border-amber-500/30 rounded-lg px-2 py-1 text-amber-200 font-mono"
                        />
                      </div>
                      <div className="col-span-3">
                        <label className="text-[10px] text-zinc-400 block">Lot No</label>
                        <input
                          type="text"
                          value={cur.lotNumber}
                          onChange={(e) =>
                            setLineReceiveMap((prev) => ({
                              ...prev,
                              [key]: { ...cur, lotNumber: e.target.value },
                            }))
                          }
                          placeholder="LOT-..."
                          className="w-full bg-black/50 border border-white/[0.1] rounded-lg px-2 py-1 text-white font-mono"
                        />
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="flex justify-end">
                <button
                  type="button"
                  disabled={busy}
                  onClick={handleReceiveQuarantine}
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full bg-amber-400 hover:bg-amber-300 text-[#061811] text-xs font-semibold cursor-pointer disabled:opacity-50"
                >
                  <PackageCheck className="w-4 h-4" />
                  Mal Kabulü Onayla (Karantinaya Al)
                </button>
              </div>
            </div>
          )}

          {/* Kalite Muayene & Karar Paneli */}
          {['TESLIM_ALINDI', 'INCELEMEDE'].includes(status) && (
            <div className="bg-[#111513] border border-emerald-500/25 rounded-2xl p-4 space-y-3">
              <div className="flex items-center gap-2 text-sm font-semibold text-[#34D399]">
                <ClipboardCheck className="w-4 h-4" />
                Kalite Muayene &amp; Nihai Karar (`UretimQualityInspection` + `NCR`)
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                <div className="space-y-1">
                  <label className="text-zinc-400">Muayene Kararı *</label>
                  <select
                    value={decision}
                    onChange={(e) => setDecision(e.target.value as RmaQualityDecision)}
                    className="w-full bg-black/50 border border-white/[0.1] rounded-xl px-3 py-2 text-white"
                  >
                    {RMA_QUALITY_DECISIONS.map((d) => (
                      <option key={d} value={d} className="bg-[#111513]">
                        {RMA_DECISION_LABELS[d]}
                      </option>
                    ))}
                  </select>
                </div>

                {decision === 'RESTOCK_TO_BIN' && (
                  <div className="space-y-1">
                    <label className="text-zinc-400">Satılabilir Hedef Raf</label>
                    <select
                      value={sellableBinCode}
                      onChange={(e) => setSellableBinCode(e.target.value)}
                      className="w-full bg-black/50 border border-white/[0.1] rounded-xl px-3 py-2 text-white font-mono"
                    >
                      {sellableBins.length === 0 ? (
                        <option value="A-01-01" className="bg-[#111513]">A-01-01</option>
                      ) : (
                        sellableBins.map((b) => (
                          <option key={b.id} value={b.code} className="bg-[#111513]">
                            {b.code} ({b.binRole || 'Satılabilir'})
                          </option>
                        ))
                      )}
                    </select>
                  </div>
                )}

                {decision === 'RESTOCK_TO_BIN' && (
                  <div className="space-y-1">
                    <label className="text-zinc-400">FEFO / SKT Yeniden Değerleme (Opsiyonel)</label>
                    <input
                      type="date"
                      value={newExpiryDate}
                      onChange={(e) => setNewExpiryDate(e.target.value)}
                      className="w-full bg-black/50 border border-white/[0.1] rounded-xl px-3 py-2 text-white"
                    />
                  </div>
                )}

                <div className="space-y-1">
                  <label className="text-zinc-400">
                    Tedarikçi {decision === 'RETURN_TO_VENDOR' ? '*' : '(Skor Kartı Bağlantısı)'}
                  </label>
                  <select
                    value={supplierId}
                    onChange={(e) => setSupplierId(e.target.value)}
                    className="w-full bg-black/50 border border-white/[0.1] rounded-xl px-3 py-2 text-white"
                  >
                    <option value="" className="bg-[#111513]">Tedarikçi Seçiniz...</option>
                    {suppliers.map((s) => (
                      <option key={s.id} value={s.id} className="bg-[#111513]">
                        {s.name} ({s.code || s.id})
                      </option>
                    ))}
                  </select>
                </div>

                {decision !== 'RESTOCK_TO_BIN' && (
                  <div className="space-y-1">
                    <label className="text-zinc-400">NCR Önem Derecesi</label>
                    <select
                      value={severity}
                      onChange={(e) => setSeverity(e.target.value as any)}
                      className="w-full bg-black/50 border border-white/[0.1] rounded-xl px-3 py-2 text-white"
                    >
                      <option value="MINOR" className="bg-[#111513]">MINOR (Düşük)</option>
                      <option value="MAJOR" className="bg-[#111513]">MAJOR (Orta / RTV)</option>
                      <option value="CRITICAL" className="bg-[#111513]">CRITICAL (Kritik / Hurda)</option>
                    </select>
                  </div>
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                <input
                  type="text"
                  value={defectCategory}
                  onChange={(e) => setDefectCategory(e.target.value)}
                  placeholder="Kusur Kategorisi (ör. MATERIAL)"
                  className="bg-black/50 border border-white/[0.1] rounded-xl px-3 py-2 text-white"
                />
                <input
                  type="text"
                  value={inspectorNote}
                  onChange={(e) => setInspectorNote(e.target.value)}
                  placeholder="Kalite uzmanı muayene notu..."
                  className="sm:col-span-2 bg-black/50 border border-white/[0.1] rounded-xl px-3 py-2 text-white"
                />
              </div>

              <div className="flex justify-end">
                <button
                  type="button"
                  disabled={busy}
                  onClick={handleQualityDecision}
                  className="inline-flex items-center gap-1.5 px-5 py-2 rounded-full bg-[#34D399] hover:bg-[#34D399]/90 text-[#061811] text-xs font-semibold cursor-pointer disabled:opacity-50"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  Kalite Kararını Kaydet
                </button>
              </div>
            </div>
          )}

          {/* Bağlı Kalite Muayene / NCR / Tedarikçi Kartları */}
          {(inspection || ncr || linkedSupplier) && (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
              {inspection && (
                <div className="bg-[#111513] border border-white/[0.06] rounded-2xl p-3.5">
                  <div className="text-zinc-400 flex items-center gap-1.5">
                    <FileCheck2 className="w-3.5 h-3.5 text-[#34D399]" />
                    Kalite Muayenesi
                  </div>
                  <div className="font-mono font-semibold text-white mt-1">
                    {inspection.inspectionNumber}
                  </div>
                  <div className="text-[11px] text-[#34D399] mt-0.5">
                    Karar: {inspection.decision}
                  </div>
                </div>
              )}
              {ncr && (
                <div className="bg-[#111513] border border-rose-500/20 rounded-2xl p-3.5">
                  <div className="text-rose-300 flex items-center gap-1.5">
                    <ShieldAlert className="w-3.5 h-3.5" />
                    NCR Uygunsuzluk
                  </div>
                  <div className="font-mono font-semibold text-white mt-1">
                    {ncr.ncrNumber}
                  </div>
                  <div className="text-[11px] text-zinc-400 mt-0.5">
                    {ncr.severity} · Etki: ₺{ncr.costImpact}
                  </div>
                </div>
              )}
              {linkedSupplier && (
                <div className="bg-[#111513] border border-white/[0.06] rounded-2xl p-3.5">
                  <div className="text-zinc-400">Bağlı Tedarikçi (Skor Kartı)</div>
                  <div className="font-semibold text-white mt-1">{linkedSupplier.name}</div>
                  <div className="text-[11px] text-indigo-300 mt-0.5">
                    Skor: {linkedSupplier.scorecardScore ?? '-'} ({linkedSupplier.scorecardTier || '-'})
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Mali Bağlantı & Kredi Notası */}
          <div className="bg-[#111513] border border-white/[0.06] rounded-2xl p-4 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-sm font-semibold text-white">
                <CreditCard className="w-4 h-4 text-[#34D399]" />
                Mali Bağlantı &amp; Kredi Notası / Ödeme İadesi
              </div>
              <span className="font-mono text-sm font-bold text-[#34D399]">
                ₺{Number(detail.refundAmount || 0).toLocaleString('tr-TR')}
              </span>
            </div>

            {!refundEligible ? (
              <div className="bg-rose-500/10 border border-rose-500/25 rounded-xl p-3 text-xs text-rose-200 flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                <div>
                  <strong>Sunucu Sert Bloğu Aktif:</strong> Fiziksel mal kabul (<code>TESLIM_ALINDI</code>) ve kalite muayene kararı (<code>KARARA_BAGLANDI</code>) tamamlanmadan kredi notası veya ödeme iadesi tetiklenemez.
                </div>
              </div>
            ) : activeCreditNote ? (
              <div className="bg-black/30 border border-white/[0.06] rounded-xl p-3.5 space-y-2 text-xs">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <span className="font-mono font-semibold text-white">
                      {activeCreditNote.creditNoteNo}
                    </span>
                    <span className="ml-2 px-2 py-0.5 rounded-full bg-white/[0.06] text-zinc-200 text-[10px]">
                      {RMA_CREDIT_STATUS_LABELS[activeCreditNote.status as RmaCreditNoteStatus] ||
                        activeCreditNote.status}
                    </span>
                  </div>
                  <div className="font-mono text-zinc-300">
                    Net: ₺{activeCreditNote.netAmount} + KDV: ₺{activeCreditNote.vatAmount} ={' '}
                    <strong className="text-[#34D399]">₺{activeCreditNote.grossAmount}</strong>
                  </div>
                </div>
                {(activeCreditNote.eDocumentNo || activeCreditNote.financeId) && (
                  <div className="text-[11px] font-mono text-zinc-400">
                    E-Belge: {activeCreditNote.eDocumentNo || '-'} · Finans Kaydı:{' '}
                    {activeCreditNote.financeId || '-'}
                  </div>
                )}
                <div className="flex flex-wrap gap-2 pt-1">
                  {activeCreditNote.status === 'TASLAK_ONAY_BEKLIYOR' && (
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() => handleCreditAction('APPROVE')}
                      className="px-3.5 py-1.5 rounded-full bg-sky-500/20 hover:bg-sky-500/30 border border-sky-500/30 text-sky-200 font-semibold cursor-pointer"
                    >
                      Mali Onay Ver (E-Belge + Finans)
                    </button>
                  )}
                  {(activeCreditNote.status === 'TASLAK_ONAY_BEKLIYOR' ||
                    activeCreditNote.status === 'ONAYLANDI') && (
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() => handleCreditAction('ISSUE_AND_PAY')}
                      className="px-3.5 py-1.5 rounded-full bg-[#34D399] hover:bg-[#34D399]/90 text-[#061811] font-semibold cursor-pointer"
                    >
                      İade Ödemesini Tamamla &amp; RMA Kapat
                    </button>
                  )}
                  {activeCreditNote.status === 'TASLAK_ONAY_BEKLIYOR' && (
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() => handleCreditAction('REJECT')}
                      className="px-3.5 py-1.5 rounded-full bg-rose-500/15 hover:bg-rose-500/25 border border-rose-500/30 text-rose-300 font-semibold cursor-pointer"
                    >
                      Reddet
                    </button>
                  )}
                </div>
              </div>
            ) : (
              <div className="flex items-center justify-between bg-black/30 border border-white/[0.06] rounded-xl p-3 text-xs">
                <span className="text-zinc-300">
                  Fiziksel kabul ve kalite kararı tamamlandı. Mali kredi notası taslağı oluşturabilirsiniz.
                </span>
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => handleCreditAction('REQUEST_DRAFT')}
                  className="px-4 py-1.5 rounded-full bg-[#34D399] hover:bg-[#34D399]/90 text-[#061811] font-semibold cursor-pointer shrink-0"
                >
                  Kredi Notası Taslağı Aç
                </button>
              </div>
            )}
          </div>

          {/* Kronolojik Olay Günlüğü */}
          <div className="bg-[#111513] border border-white/[0.06] rounded-2xl p-4 space-y-2.5">
            <div className="flex items-center gap-2 text-xs font-semibold text-zinc-300">
              <Clock className="w-3.5 h-3.5 text-[#34D399]" />
              RMA Olay &amp; Denetim Günlüğü
            </div>
            {Array.isArray(detail.events) && detail.events.length > 0 ? (
              <div className="space-y-2 max-h-56 overflow-y-auto">
                {detail.events.map((ev: any) => (
                  <div
                    key={ev.id}
                    className="bg-black/30 border border-white/[0.04] rounded-xl px-3 py-2 text-xs flex items-start justify-between gap-3"
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-[10px] px-1.5 py-0.5 rounded bg-white/[0.06] text-[#34D399]">
                          {ev.eventType}
                        </span>
                        <span className="text-zinc-300 font-medium">
                          {ev.actorName || 'Sistem'}
                        </span>
                        <span className="text-[10px] text-zinc-500">({ev.method})</span>
                      </div>
                      <div className="text-zinc-300 mt-1">{ev.note}</div>
                    </div>
                    <div className="text-[10px] font-mono text-zinc-500 shrink-0">
                      {new Date(ev.createdAt).toLocaleString('tr-TR')}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-zinc-500">Bu kayıt için henüz olay günlüğü yok.</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
