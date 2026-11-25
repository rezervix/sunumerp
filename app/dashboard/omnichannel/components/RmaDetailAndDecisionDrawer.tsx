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
    <div className="fixed inset-0 z-50 bg-[#0B1B33]/40 backdrop-blur-sm flex justify-end">
      <div className="bg-white border-l border-[--line] w-full max-w-3xl h-full flex flex-col shadow-2xl text-[--text]">
        {/* Başlık */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[--line] bg-[--page]">
          <div>
            <div className="flex items-center gap-2.5 flex-wrap">
              <h2 className="text-lg font-semibold font-mono text-[--text]">
                {detail.rmaNumber}
              </h2>
              <span
                className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-medium border ${ RMA_STATUS_BADGE_CLASSES[status] }`}
              >
                {RMA_STATUS_LABELS[status]}
              </span>
              {detail.qualityDecision && (
                <span
                  className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-medium border ${ RMA_DECISION_BADGE_CLASSES[detail.qualityDecision as RmaQualityDecision] || 'bg-[--muted-bg] text-[--text-muted] border-[--line]' }`}
                >
                  {RMA_DECISION_LABELS[detail.qualityDecision as RmaQualityDecision] ||
                    detail.qualityDecision}
                </span>
              )}
            </div>
            <p className="text-xs text-[--text-muted] mt-1">
              Sipariş: <span className="font-mono text-[--text]">{detail.orderNumber}</span> ·{' '}
              {detail.customerName} ({detail.channelCode})
            </p>
          </div>

          <div className="flex items-center gap-2">
            <Link
              href={`/dashboard/omnichannel/rma/${detail.id}/print`}
              target="_blank"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white hover:bg-[--brand-soft] border border-[--line] text-xs font-medium text-[--text]"
            >
              <QrCode className="w-3.5 h-3.5 text-[--brand]" />
              Etiket / Fiş
            </Link>
            <button
              type="button"
              onClick={onClose}
              className="p-2 rounded-xl text-[--text-muted] hover:text-[--text] hover:bg-[--muted-bg] cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Gövde */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* 7 Adımlı Yaşam Döngüsü Çubuğu */}
          <div className="bg-[--page] border border-[--line] rounded-2xl p-4 space-y-3">
            <div className="flex items-center justify-between text-xs">
              <span className="font-semibold text-[--text]">RMA Yaşam Döngüsü</span>
              {detail.channelCode !== 'ERP' && (
                <button
                  type="button"
                  disabled={busy}
                  onClick={() =>
                    callAction({ action: 'push_rma_channel_status', rmaId: detail.id })
                  }
                  className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-white hover:bg-[--brand-soft] border border-[--line] text-[11px] text-[--text-2] cursor-pointer"
                >
                  <Send className="w-3 h-3 text-[--brand]" />
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
                    className={`rounded-xl px-2 py-2 text-center border text-[10px] ${ done ? 'bg-[--brand-soft] border-[--brand-line] text-[--brand] font-semibold' : 'bg-white border-[--line] text-[--text-muted]' }`}
                  >
                    <div className="truncate">{RMA_STATUS_LABELS[st].split(' ')[0]}</div>
                  </div>
                );
              })}
            </div>

            {/* Süre & Neden Özeti */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1 text-[11px]">
              <div className="bg-white rounded-xl p-2.5 border border-[--line]">
                <div className="text-[--text-muted]">Neden Kodu</div>
                <div className="text-[--text] font-medium mt-0.5">
                  {RMA_REASON_LABELS[(detail.reasonCode || 'CAYMA_HAKKI') as RmaReasonCode] ||
                    detail.reasonCode}
                </div>
              </div>
              <div className="bg-white rounded-xl p-2.5 border border-[--line]">
                <div className="text-[--text-muted]">İade Süresi / Son Tarih</div>
                <div className="text-[--text] font-mono mt-0.5">
                  {detail.returnWindowDays || 14} gün ·{' '}
                  {detail.returnDeadlineAt
                    ? new Date(detail.returnDeadlineAt).toLocaleDateString('tr-TR')
                    : '-'}
                </div>
              </div>
              <div className="bg-white rounded-xl p-2.5 border border-[--line]">
                <div className="text-[--text-muted]">Hedef Depo / Hücre</div>
                <div className="text-[--brand] font-mono mt-0.5 font-semibold">
                  {detail.receivedBinCode || detail.targetBinCode || 'Q-01-01'}
                </div>
              </div>
              <div className="bg-white rounded-xl p-2.5 border border-[--line]">
                <div className="text-[--text-muted]">Takip / Çevrim</div>
                <div className="text-[--text] font-mono mt-0.5">
                  {detail.returnTrackingNo || '-'}
                  {detail.cycleHours ? ` (${detail.cycleHours}s)` : ''}
                </div>
              </div>
            </div>

            {/* Durum Geçiş Aksiyonları */}
            {allowedNext.length > 0 && (
              <div className="pt-2 border-t border-[--line] space-y-2">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                  <input
                    type="text"
                    value={transitionNote}
                    onChange={(e) => setTransitionNote(e.target.value)}
                    placeholder="Durum geçiş veya red gerekçesi notu..."
                    className="bg-white border border-[--line] rounded-xl px-3 py-1.5 text-[--text]"
                  />
                  <input
                    type="text"
                    value={trackingInput}
                    onChange={(e) => setTrackingInput(e.target.value)}
                    placeholder="Kargo takip no (opsiyonel)"
                    className="bg-white border border-[--line] rounded-xl px-3 py-1.5 text-[--text] font-mono"
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
                        className={`px-3 py-1.5 rounded-full text-xs font-semibold cursor-pointer disabled:opacity-50 ${ st === 'REDDEDILDI' || st === 'IPTAL' ? 'bg-[--bad-soft] hover:bg-[--bad-soft]/80 text-[--bad] border border-[--bad-soft]' : 'bg-white hover:bg-[--brand-soft] text-[--text] border border-[--line]' }`}
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
            <div className="bg-[--page] border border-[--warn-soft] rounded-2xl p-4 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-sm font-semibold text-[--warn]">
                  <Truck className="w-4 h-4" />
                  Fiziksel Mal Kabul &amp; Karantina Girişi
                </div>
                <select
                  value={quarantineBinCode}
                  onChange={(e) => setQuarantineBinCode(e.target.value)}
                  className="bg-white border border-[--line] rounded-xl px-3 py-1.5 text-xs font-mono text-[--text]"
                >
                  {quarantineBins.length === 0 ? (
                    <>
                      <option value="Q-01-01">Q-01-01 (Karantina)</option>
                      <option value="RMA-01-01">RMA-01-01 (İade Kabul)</option>
                    </>
                  ) : (
                    quarantineBins.map((b) => (
                      <option key={b.id} value={b.code}>
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
                      className="grid grid-cols-12 gap-2 items-center bg-white p-2.5 rounded-xl border border-[--line] text-xs"
                    >
                      <div className="col-span-5">
                        <div className="text-[--text] font-medium truncate">{l.itemName}</div>
                        <div className="text-[10px] font-mono text-[--text-muted]">
                          {l.sku} · Talep: {l.requestedQty}
                        </div>
                      </div>
                      <div className="col-span-2">
                        <label className="text-[10px] text-[--text-muted] block">Sağlam</label>
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
                          className="w-full bg-[--muted-bg] border border-[--line] rounded-lg px-2 py-1 text-[--text] font-mono"
                        />
                      </div>
                      <div className="col-span-2">
                        <label className="text-[10px] text-[--warn] block">Hasarlı</label>
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
                          className="w-full bg-[--warn-soft] border border-[--warn] rounded-lg px-2 py-1 text-[--warn] font-mono"
                        />
                      </div>
                      <div className="col-span-3">
                        <label className="text-[10px] text-[--text-muted] block">Lot No</label>
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
                          className="w-full bg-[--muted-bg] border border-[--line] rounded-lg px-2 py-1 text-[--text] font-mono"
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
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full bg-gradient-to-r from-[--brand] to-[--blue] text-white text-xs font-semibold cursor-pointer disabled:opacity-50 shadow-sm"
                >
                  <PackageCheck className="w-4 h-4" />
                  Mal Kabulü Onayla (Karantinaya Al)
                </button>
              </div>
            </div>
          )}

          {/* Kalite Muayene & Karar Paneli */}
          {['TESLIM_ALINDI', 'INCELEMEDE'].includes(status) && (
            <div className="bg-[--page] border border-[--brand-line] rounded-2xl p-4 space-y-3">
              <div className="flex items-center gap-2 text-sm font-semibold text-[--brand]">
                <ClipboardCheck className="w-4 h-4" />
                Kalite Muayene &amp; Nihai Karar (`UretimQualityInspection` + `NCR`)
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                <div className="space-y-1">
                  <label className="text-[--text-muted]">Muayene Kararı *</label>
                  <select
                    value={decision}
                    onChange={(e) => setDecision(e.target.value as RmaQualityDecision)}
                    className="w-full bg-white border border-[--line] rounded-xl px-3 py-2 text-[--text]"
                  >
                    {RMA_QUALITY_DECISIONS.map((d) => (
                      <option key={d} value={d}>
                        {RMA_DECISION_LABELS[d]}
                      </option>
                    ))}
                  </select>
                </div>

                {decision === 'RESTOCK_TO_BIN' && (
                  <div className="space-y-1">
                    <label className="text-[--text-muted]">Satılabilir Hedef Raf</label>
                    <select
                      value={sellableBinCode}
                      onChange={(e) => setSellableBinCode(e.target.value)}
                      className="w-full bg-white border border-[--line] rounded-xl px-3 py-2 text-[--text] font-mono"
                    >
                      {sellableBins.length === 0 ? (
                        <option value="A-01-01">A-01-01</option>
                      ) : (
                        sellableBins.map((b) => (
                          <option key={b.id} value={b.code}>
                            {b.code} ({b.binRole || 'Satılabilir'})
                          </option>
                        ))
                      )}
                    </select>
                  </div>
                )}

                {decision === 'RESTOCK_TO_BIN' && (
                  <div className="space-y-1">
                    <label className="text-[--text-muted]">FEFO / SKT Yeniden Değerleme (Opsiyonel)</label>
                    <input
                      type="date"
                      value={newExpiryDate}
                      onChange={(e) => setNewExpiryDate(e.target.value)}
                      className="w-full bg-white border border-[--line] rounded-xl px-3 py-2 text-[--text]"
                    />
                  </div>
                )}

                <div className="space-y-1">
                  <label className="text-[--text-muted]">
                    Tedarikçi {decision === 'RETURN_TO_VENDOR' ? '*' : '(Skor Kartı Bağlantısı)'}
                  </label>
                  <select
                    value={supplierId}
                    onChange={(e) => setSupplierId(e.target.value)}
                    className="w-full bg-white border border-[--line] rounded-xl px-3 py-2 text-[--text]"
                  >
                    <option value="">Tedarikçi Seçiniz...</option>
                    {suppliers.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name} ({s.code || s.id})
                      </option>
                    ))}
                  </select>
                </div>

                {decision !== 'RESTOCK_TO_BIN' && (
                  <div className="space-y-1">
                    <label className="text-[--text-muted]">NCR Önem Derecesi</label>
                    <select
                      value={severity}
                      onChange={(e) => setSeverity(e.target.value as any)}
                      className="w-full bg-white border border-[--line] rounded-xl px-3 py-2 text-[--text]"
                    >
                      <option value="MINOR">MINOR (Düşük)</option>
                      <option value="MAJOR">MAJOR (Orta / RTV)</option>
                      <option value="CRITICAL">CRITICAL (Kritik / Hurda)</option>
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
                  className="bg-white border border-[--line] rounded-xl px-3 py-2 text-[--text]"
                />
                <input
                  type="text"
                  value={inspectorNote}
                  onChange={(e) => setInspectorNote(e.target.value)}
                  placeholder="Kalite uzmanı muayene notu..."
                  className="sm:col-span-2 bg-white border border-[--line] rounded-xl px-3 py-2 text-[--text]"
                />
              </div>

              <div className="flex justify-end">
                <button
                  type="button"
                  disabled={busy}
                  onClick={handleQualityDecision}
                  className="inline-flex items-center gap-1.5 px-5 py-2 rounded-full bg-gradient-to-r from-[--brand] to-[--blue] text-white text-xs font-semibold cursor-pointer disabled:opacity-50 shadow-sm"
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
                <div className="bg-white border border-[--line] rounded-2xl p-3.5">
                  <div className="text-[--text-muted] flex items-center gap-1.5">
                    <FileCheck2 className="w-3.5 h-3.5 text-[--brand]" />
                    Kalite Muayenesi
                  </div>
                  <div className="font-mono font-semibold text-[--text] mt-1">
                    {inspection.inspectionNumber}
                  </div>
                  <div className="text-[11px] text-[--ok] font-medium mt-0.5">
                    Karar: {inspection.decision}
                  </div>
                </div>
              )}
              {ncr && (
                <div className="bg-white border border-[--bad-soft] rounded-2xl p-3.5">
                  <div className="text-[--bad] flex items-center gap-1.5 font-medium">
                    <ShieldAlert className="w-3.5 h-3.5" />
                    NCR Uygunsuzluk
                  </div>
                  <div className="font-mono font-semibold text-[--text] mt-1">
                    {ncr.ncrNumber}
                  </div>
                  <div className="text-[11px] text-[--text-muted] mt-0.5">
                    {ncr.severity} · Etki: ₺{ncr.costImpact}
                  </div>
                </div>
              )}
              {linkedSupplier && (
                <div className="bg-white border border-[--line] rounded-2xl p-3.5">
                  <div className="text-[--text-muted]">Bağlı Tedarikçi (Skor Kartı)</div>
                  <div className="font-semibold text-[--text] mt-1">{linkedSupplier.name}</div>
                  <div className="text-[11px] text-[--brand] mt-0.5">
                    Skor: {linkedSupplier.scorecardScore ?? '-'} ({linkedSupplier.scorecardTier || '-'})
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Mali Bağlantı & Kredi Notası */}
          <div className="bg-[--page] border border-[--line] rounded-2xl p-4 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-sm font-semibold text-[--text]">
                <CreditCard className="w-4 h-4 text-[--brand]" />
                Mali Bağlantı &amp; Kredi Notası / Ödeme İadesi
              </div>
              <span className="font-mono text-sm font-bold text-[--brand]">
                ₺{Number(detail.refundAmount || 0).toLocaleString('tr-TR')}
              </span>
            </div>

            {!refundEligible ? (
              <div className="bg-[--bad-soft] border border-[--bad-soft] rounded-xl p-3 text-xs text-[--bad] flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                <div>
                  <strong>Sunucu Sert Bloğu Aktif:</strong> Fiziksel mal kabul (<code>TESLIM_ALINDI</code>) ve kalite muayene kararı (<code>KARARA_BAGLANDI</code>) tamamlanmadan kredi notası veya ödeme iadesi tetiklenemez.
                </div>
              </div>
            ) : activeCreditNote ? (
              <div className="bg-white border border-[--line] rounded-xl p-3.5 space-y-2 text-xs">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <span className="font-mono font-semibold text-[--text]">
                      {activeCreditNote.creditNoteNo}
                    </span>
                    <span className="ml-2 px-2 py-0.5 rounded-full bg-[--muted-bg] text-[--text-2] text-[10px]">
                      {RMA_CREDIT_STATUS_LABELS[activeCreditNote.status as RmaCreditNoteStatus] ||
                        activeCreditNote.status}
                    </span>
                  </div>
                  <div className="font-mono text-[--text-muted]">
                    Net: ₺{activeCreditNote.netAmount} + KDV: ₺{activeCreditNote.vatAmount} ={' '}
                    <strong className="text-[--brand]">₺{activeCreditNote.grossAmount}</strong>
                  </div>
                </div>
                {(activeCreditNote.eDocumentNo || activeCreditNote.financeId) && (
                  <div className="text-[11px] font-mono text-[--text-muted]">
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
                      className="px-3.5 py-1.5 rounded-full bg-[--brand-soft] hover:bg-[--brand-soft]/80 border border-[--brand-line] text-[--brand] font-semibold cursor-pointer"
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
                      className="px-3.5 py-1.5 rounded-full bg-gradient-to-r from-[--brand] to-[--blue] text-[var(--text)] font-semibold cursor-pointer shadow-sm hover:opacity-95"
                    >
                      İade Ödemesini Tamamla &amp; RMA Kapat
                    </button>
                  )}
                  {activeCreditNote.status === 'TASLAK_ONAY_BEKLIYOR' && (
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() => handleCreditAction('REJECT')}
                      className="px-3.5 py-1.5 rounded-full bg-[--bad-soft] hover:bg-[--bad-soft]/80 border border-[--bad-soft] text-[--bad] font-semibold cursor-pointer"
                    >
                      Reddet
                    </button>
                  )}
                </div>
              </div>
            ) : (
              <div className="flex items-center justify-between bg-white border border-[--line] rounded-xl p-3 text-xs">
                <span className="text-[--text-2]">
                  Fiziksel kabul ve kalite kararı tamamlandı. Mali kredi notası taslağı oluşturabilirsiniz.
                </span>
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => handleCreditAction('REQUEST_DRAFT')}
                  className="px-4 py-1.5 rounded-full bg-gradient-to-r from-[--brand] to-[--blue] text-[var(--text)] font-semibold cursor-pointer shrink-0 shadow-sm hover:opacity-95"
                >
                  Kredi Notası Taslağı Aç
                </button>
              </div>
            )}
          </div>

          {/* Kronolojik Olay Günlüğü */}
          <div className="bg-[--page] border border-[--line] rounded-2xl p-4 space-y-2.5">
            <div className="flex items-center gap-2 text-xs font-semibold text-[--text]">
              <Clock className="w-3.5 h-3.5 text-[--brand]" />
              RMA Olay &amp; Denetim Günlüğü
            </div>
            {Array.isArray(detail.events) && detail.events.length > 0 ? (
              <div className="space-y-2 max-h-56 overflow-y-auto">
                {detail.events.map((ev: any) => (
                  <div
                    key={ev.id}
                    className="bg-white border border-[--line] rounded-xl px-3 py-2 text-xs flex items-start justify-between gap-3"
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-[10px] px-1.5 py-0.5 rounded bg-[--brand-soft] text-[--brand] font-semibold">
                          {ev.eventType}
                        </span>
                        <span className="text-[--text] font-medium">
                          {ev.actorName || 'Sistem'}
                        </span>
                        <span className="text-[10px] text-[--text-muted]">({ev.method})</span>
                      </div>
                      <div className="text-[--text-2] mt-1">{ev.note}</div>
                    </div>
                    <div className="text-[10px] font-mono text-[--text-muted] shrink-0">
                      {new Date(ev.createdAt).toLocaleString('tr-TR')}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-[--text-muted]">Bu kayıt için henüz olay günlüğü yok.</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
