'use client';

import React, { useMemo, useState } from 'react';
import Link from 'next/link';
import {
  Activity,
  AlertTriangle,
  BarChart3,
  CheckCircle2,
  Clock,
  CreditCard,
  FileCheck2,
  Plus,
  QrCode,
  RotateCcw,
  Search,
  ShieldCheck,
  SlidersHorizontal,
} from 'lucide-react';
import { toast } from 'sonner';
import {
  RMA_DECISION_BADGE_CLASSES,
  RMA_DECISION_LABELS,
  RMA_REASON_CODES,
  RMA_REASON_LABELS,
  RMA_STATUS_BADGE_CLASSES,
  RMA_STATUS_LABELS,
  RMA_STATUS_VALUES,
  evaluateReturnEligibility,
  normalizeLegacyRmaStatus,
  type RmaQualityDecision,
  type RmaReasonCode,
} from '@/lib/logistics/returns/constantsAndHelpers';
import { RmaCreateModal, type EligibleOrder } from './RmaCreateModal';
import { RmaDetailAndDecisionDrawer } from './RmaDetailAndDecisionDrawer';
import {
  RmaAnalyticsPanel,
  RmaCreditNotesPanel,
  RmaPoliciesPanel,
  RmaWebhookLogsPanel,
} from './RmaPoliciesAndAnalyticsPanels';
import { safeText, safeNumber, safeCurrency, safeDate } from '@/lib/utils/safe-display';

export interface RmaRecord {
  id: string;
  rmaNumber: string;
  orderNumber: string;
  channelCode: string;
  customerName: string;
  sku: string;
  itemName: string;
  returnQty: number;
  returnReason: string;
  qcInspectionResult: string;
  targetWarehouseId?: string | null;
  targetBinCode?: string | null;
  receivedBinCode?: string | null;
  refundAmount: number;
  refundStatus: string;
  returnTrackingNo?: string | null;
  rmaStatus?: string | null;
  reasonCode?: string | null;
  orderSourceType?: string | null;
  deliveredAt?: string | null;
  returnWindowDays?: number | null;
  returnDeadlineAt?: string | null;
  warrantyExpiresAt?: string | null;
  isWithinReturnWindow?: boolean | null;
  isWithinWarranty?: boolean | null;
  deadlineOverrideApproved?: boolean | null;
  qualityDecision?: string | null;
  creditNoteNo?: string | null;
  lines?: any[];
  events?: any[];
  creditNotes?: any[];
  createdAt: string;
}

interface Props {
  rmaReturns: RmaRecord[];
  onUpdated: () => void;
  storageBins?: any[];
  suppliers?: any[];
  items?: any[];
  returnPolicies?: any[];
  returnCreditNotes?: any[];
  returnWebhookLogs?: any[];
  returnAnalytics?: any | null;
  eligibleReturnOrders?: EligibleOrder[];
  logisticsDemoMode?: boolean;
  lojistikIadeEnabled?: boolean;
  initialOrderNumber?: string;
}

type RmaSubTab = 'list' | 'credit-notes' | 'policies' | 'webhooks' | 'analytics';

export function RmaReturnManager({
  rmaReturns,
  onUpdated,
  storageBins = [],
  suppliers = [],
  items = [],
  returnPolicies = [],
  returnCreditNotes = [],
  returnWebhookLogs = [],
  returnAnalytics = null,
  eligibleReturnOrders = [],
  logisticsDemoMode = false,
  lojistikIadeEnabled = true,
  initialOrderNumber,
}: Props) {
  const [submittingId, setSubmittingId] = useState<string | null>(null);
  const [subTab, setSubTab] = useState<RmaSubTab>('list');
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [reasonFilter, setReasonFilter] = useState('ALL');
  const [isCreateOpen, setIsCreateOpen] = useState(Boolean(initialOrderNumber));
  const [selectedRma, setSelectedRma] = useState<RmaRecord | null>(null);

  const handleLegacyDisposition = async (
    rmaId: string,
    disposition: 'RESTOCK_TO_BIN' | 'QUARANTINE_REPAIR'
  ) => {
    try {
      setSubmittingId(rmaId);
      const res = await fetch('/api/omnichannel', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'process_rma',
          rmaId,
          disposition,
          targetBinCode: disposition === 'RESTOCK_TO_BIN' ? 'A-01-01' : 'Q-01-01',
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'İade muayenesi tamamlanamadı');
      }
      toast.success(data.message || 'İade muayene işlemi başarıyla tamamlandı!');
      onUpdated();
    } catch (err: any) {
      toast.error(err.message || 'Hata oluştu');
    } finally {
      setSubmittingId(null);
    }
  };

  const filteredRmas = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return (rmaReturns || []).filter((r) => {
      const st = normalizeLegacyRmaStatus(r);
      if (statusFilter !== 'ALL' && st !== statusFilter) return false;
      if (reasonFilter !== 'ALL' && (r.reasonCode || 'CAYMA_HAKKI') !== reasonFilter) {
        return false;
      }
      if (q) {
        const hay =
          `${r.rmaNumber || ''} ${r.orderNumber || ''} ${r.customerName || ''} ${r.sku || ''} ${r.itemName || ''} ${r.returnTrackingNo || ''}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [rmaReturns, searchQuery, statusFilter, reasonFilter]);

  const openCount = (rmaReturns || []).filter(
    (r) => !['KAPANDI', 'REDDEDILDI', 'IPTAL'].includes(normalizeLegacyRmaStatus(r))
  ).length;
  const quarantineCount = (rmaReturns || []).filter((r) =>
    ['TESLIM_ALINDI', 'INCELEMEDE'].includes(normalizeLegacyRmaStatus(r))
  ).length;

  return (
    <div className="space-y-4">
      {/* Üst Başlık & Alt Sekmeler */}
      <div className="bg-white/80 backdrop-blur-xl border border-[--line] p-5 rounded-[20px] space-y-4 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <h3 className="text-base font-semibold text-[--text] flex items-center gap-2">
              <RotateCcw className="w-4 h-4 text-[--brand]" />
              Tersine Lojistik, İade (RMA), Kalite &amp; Kredi Notası Yönetimi
            </h3>
            <p className="text-xs text-[--text-muted] mt-0.5">
              Omnichannel &amp; ERP sipariş iadeleri, 14 gün/garanti takibi, karantina kabulü, NCR/Skor Kartı ve mali kredi notası
            </p>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <span className="px-2.5 py-1 rounded-full bg-[--muted-bg] border border-[--line] text-[11px] text-[--text-muted]">
              Açık: <strong className="text-[--text]">{openCount}</strong>
            </span>
            <span className="px-2.5 py-1 rounded-full bg-[--warn-soft] border border-[--warn]/25 text-[11px] text-[--warn] font-semibold">
              Karantinada: <strong>{quarantineCount}</strong>
            </span>
            {lojistikIadeEnabled && (
              <button
                type="button"
                onClick={() => setIsCreateOpen(true)}
                data-testid="open-create-rma-btn"
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full bg-gradient-to-r from-[--brand] to-[--blue] hover:opacity-95 text-white text-xs font-semibold cursor-pointer shadow-sm shadow-[--brand]/20 transition"
              >
                <Plus className="w-3.5 h-3.5" />
                Yeni RMA Talebi
              </button>
            )}
          </div>
        </div>

        <div className="flex flex-wrap gap-1.5 border-t border-[--line] pt-3">
          {[
            { id: 'list', label: `RMA Kayıtları (${(rmaReturns || []).length})`, icon: RotateCcw },
            { id: 'credit-notes', label: `Kredi Notaları (${(returnCreditNotes || []).length})`, icon: CreditCard },
            { id: 'policies', label: `İade Politikaları (${(returnPolicies || []).length})`, icon: ShieldCheck },
            { id: 'webhooks', label: `Webhook Günlüğü (${(returnWebhookLogs || []).length})`, icon: Activity },
            { id: 'analytics', label: 'İade Analizi', icon: BarChart3 },
          ].map((tab) => {
            const Icon = tab.icon;
            const active = subTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setSubTab(tab.id as RmaSubTab)}
                className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-medium transition cursor-pointer ${
                  active
                    ? 'bg-[--brand-soft] text-[--brand] border border-[--brand-line]'
                    : 'bg-white text-[--text-muted] hover:text-[--text] border border-[--line] hover:bg-[--muted-bg]'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                {tab.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Alt Sekme İçerikleri */}
      {subTab === 'list' && (
        <div className="bg-white border border-[--line] rounded-[20px] overflow-hidden shadow-sm">
          {/* Arama & Filtreler */}
          <div className="p-4 border-b border-[--line] flex flex-wrap gap-2.5 items-center justify-between bg-[--muted-bg]/40">
            <div className="relative flex-1 min-w-[220px] max-w-sm">
              <Search className="w-4 h-4 text-[--text-muted] absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="RMA no, sipariş no, müşteri, SKU, takip ara..."
                className="w-full bg-white border border-[--line] rounded-xl pl-9 pr-3 py-2 text-xs text-[--text] placeholder:text-[--text-muted] focus:border-[--brand] focus:ring-1 focus:ring-[--brand] focus:outline-none"
              />
            </div>
            <div className="flex flex-wrap gap-2 text-xs">
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="bg-white border border-[--line] rounded-xl px-3 py-2 text-[--text] focus:border-[--brand] focus:ring-1 focus:ring-[--brand] focus:outline-none"
              >
                <option value="ALL">Tüm RMA Durumları</option>
                {RMA_STATUS_VALUES.map((st) => (
                  <option key={st} value={st}>
                    {RMA_STATUS_LABELS[st]}
                  </option>
                ))}
              </select>
              <select
                value={reasonFilter}
                onChange={(e) => setReasonFilter(e.target.value)}
                className="bg-white border border-[--line] rounded-xl px-3 py-2 text-[--text] focus:border-[--brand] focus:ring-1 focus:ring-[--brand] focus:outline-none"
              >
                <option value="ALL">Tüm Nedenler</option>
                {RMA_REASON_CODES.map((code) => (
                  <option key={code} value={code}>
                    {RMA_REASON_LABELS[code]}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {filteredRmas.length === 0 ? (
            <div className="text-center py-12 text-[--text-muted] text-xs">
              Filtreye uygun iade (RMA) kaydı bulunmuyor.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left border-collapse">
                <thead>
                  <tr className="bg-[--muted-bg]/50 border-b border-[--line] text-[--text-muted] uppercase text-[11px] tracking-wider font-medium">
                    <th className="py-3.5 px-4 font-medium">RMA / Sipariş</th>
                    <th className="py-3.5 px-3 font-medium">Müşteri &amp; Kanal</th>
                    <th className="py-3.5 px-3 font-medium">Ürün / Neden</th>
                    <th className="py-3.5 px-3 font-medium">14 Gün / Garanti</th>
                    <th className="py-3.5 px-3 font-medium text-center">Durum &amp; Karar</th>
                    <th className="py-3.5 px-4 font-medium text-right">Aksiyonlar</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[--line]">
                  {filteredRmas.map((rma) => {
                    const wfStatus = normalizeLegacyRmaStatus(rma);
                    const elig = rma.deliveredAt
                      ? evaluateReturnEligibility({
                          deliveredAt: rma.deliveredAt,
                          policyReturnDays: rma.returnWindowDays || 14,
                        })
                      : null;
                    const rCode = (rma.reasonCode || 'CAYMA_HAKKI') as RmaReasonCode;
                    const lineCount = Array.isArray(rma.lines) ? rma.lines.length : 0;

                    return (
                      <tr
                        key={rma.id}
                        className="hover:bg-[--brand-soft]/30 transition-colors text-[--text-2]"
                      >
                        <td className="py-3.5 px-4">
                          <div className="font-mono font-semibold text-[--brand] text-sm">
                            {safeText(rma.rmaNumber)}
                          </div>
                          <div className="text-[11px] text-[--text-muted] font-mono mt-0.5">
                            {safeText(rma.orderNumber)}
                            {rma.orderSourceType && (
                              <span className="ml-1.5 px-1.5 py-0.5 rounded bg-[--muted-bg] text-[9px] text-[--text] font-medium border border-[--line]">
                                {rma.orderSourceType === 'ERP_ORDER' ? 'ERP' : 'OMNI'}
                              </span>
                            )}
                          </div>
                        </td>

                        <td className="py-3.5 px-3">
                          <div className="font-medium text-[--text]">{safeText(rma.customerName)}</div>
                          <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                            <span className="bg-[--muted-bg] text-[--text-2] border border-[--line] rounded-full px-2 py-0.5 text-[10px] font-mono">
                              {safeText(rma.channelCode)}
                            </span>
                            {rma.returnTrackingNo && (
                              <span className="text-[10px] text-[--text-muted] font-mono">
                                {safeText(rma.returnTrackingNo)}
                              </span>
                            )}
                          </div>
                        </td>

                        <td className="py-3.5 px-3">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="font-medium text-[--text]">{safeText(rma.itemName)}</span>
                            <span className="font-mono text-[--brand]">({safeText(rma.sku)})</span>
                            <strong className="text-[--brand]">x {safeNumber(rma.returnQty)}</strong>
                            {lineCount > 1 && (
                              <span className="text-[10px] px-1.5 py-0.5 rounded bg-[--muted-bg] text-[--text-2] border border-[--line]">
                                {lineCount} kalem
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-1.5 mt-1">
                            <span className="text-[10px] px-2 py-0.5 rounded bg-[--muted-bg] text-[--text-2] border border-[--line]">
                              {RMA_REASON_LABELS[rCode] || safeText(rma.reasonCode) || 'İade'}
                            </span>
                            <span className="text-[11px] text-[--text-muted] truncate max-w-[200px]">
                              {safeText(rma.returnReason)}
                            </span>
                          </div>
                        </td>

                        <td className="py-3.5 px-3">
                          {rma.deadlineOverrideApproved ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] bg-[--brand-soft] text-[--brand] border border-[--brand-line]">
                              <FileCheck2 className="w-3 h-3" /> İstisna Onaylı
                            </span>
                          ) : elig ? (
                            elig.isWithinReturnWindow ? (
                              <span
                                className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] border ${
                                  elig.isExpiringSoon
                                    ? 'bg-[--warn-soft] text-[--warn] border-[--warn]/25'
                                    : 'bg-[--ok-soft] text-[--ok] border-[--ok]/25'
                                }`}
                              >
                                <Clock className="w-3 h-3" />
                                {elig.remainingDays} gün kaldı
                              </span>
                            ) : rma.isWithinWarranty ? (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] bg-[--brand-soft] text-[--brand] border border-[--brand-line]">
                                <ShieldCheck className="w-3 h-3" /> Garanti
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] bg-[--bad-soft] text-[--bad] border border-[--bad]/25">
                                <AlertTriangle className="w-3 h-3" /> Süre Doldu
                              </span>
                            )
                          ) : (
                            <span className="text-[--text-muted] text-[11px]">
                              {safeNumber(rma.returnWindowDays, 14)} gün
                            </span>
                          )}
                        </td>

                        <td className="py-3.5 px-3 text-center space-y-1">
                          <div>
                            <span
                              className={`inline-flex px-2.5 py-0.5 rounded-full text-[10px] font-medium border ${
                                wfStatus === 'KAPANDI' || wfStatus === 'ONAYLANDI'
                                  ? 'bg-[--ok-soft] text-[--ok] border-[--ok]/25'
                                  : wfStatus === 'REDDEDILDI'
                                    ? 'bg-[--bad-soft] text-[--bad] border-[--bad]/25'
                                    : 'bg-[--warn-soft] text-[--warn] border-[--warn]/25'
                              }`}
                            >
                              {RMA_STATUS_LABELS[wfStatus] || wfStatus}
                            </span>
                          </div>
                          {rma.qualityDecision && (
                            <div>
                              <span className="inline-flex px-2 py-0.5 rounded-full text-[10px] border bg-[--brand-soft] text-[--brand] border-[--brand-line]">
                                {RMA_DECISION_LABELS[
                                  rma.qualityDecision as RmaQualityDecision
                                ] || safeText(rma.qualityDecision)}
                              </span>
                            </div>
                          )}
                        </td>

                        <td className="py-3.5 px-4 text-right">
                          <div className="inline-flex items-center gap-1.5 flex-wrap justify-end">
                            <button
                              type="button"
                              onClick={() => setSelectedRma(rma)}
                              className="inline-flex items-center gap-1 px-3 py-1.5 rounded-full bg-white hover:bg-[--muted-bg] border border-[--line] text-[11px] font-semibold text-[--text] cursor-pointer shadow-sm transition"
                            >
                              <SlidersHorizontal className="w-3 h-3 text-[--brand]" />
                              Yönet
                            </button>
                            <Link
                              href={`/dashboard/omnichannel/rma/${rma.id}/print`}
                              target="_blank"
                              className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-full bg-white hover:bg-[--muted-bg] border border-[--line] text-[11px] text-[--text-2] transition shadow-sm"
                              title="İade Etiketi / Fişi Yazdır"
                            >
                              <QrCode className="w-3 h-3" />
                            </Link>
                            {!rma.rmaStatus && rma.qcInspectionResult === 'PENDING_INSPECTION' && (
                              <button
                                type="button"
                                onClick={() => handleLegacyDisposition(rma.id, 'RESTOCK_TO_BIN')}
                                disabled={submittingId === rma.id}
                                className="inline-flex items-center gap-1 px-2.5 py-1.5 bg-gradient-to-r from-[--brand] to-[--blue] text-white hover:opacity-95 rounded-full text-[11px] font-semibold cursor-pointer shadow-sm transition"
                              >
                                <CheckCircle2 className="w-3 h-3" />
                                Rafa Al
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
          )}
        </div>
      )}

      {subTab === 'credit-notes' && (
        <RmaCreditNotesPanel creditNotes={returnCreditNotes} onUpdated={onUpdated} />
      )}

      {subTab === 'policies' && (
        <RmaPoliciesPanel policies={returnPolicies} items={items} onUpdated={onUpdated} />
      )}

      {subTab === 'webhooks' && (
        <RmaWebhookLogsPanel
          logs={returnWebhookLogs}
          logisticsDemoMode={logisticsDemoMode}
          onUpdated={onUpdated}
        />
      )}

      {subTab === 'analytics' && <RmaAnalyticsPanel analytics={returnAnalytics} />}

      <RmaCreateModal
        isOpen={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
        eligibleOrders={eligibleReturnOrders}
        items={items}
        initialOrderNumber={initialOrderNumber}
        onCreated={() => onUpdated()}
      />

      <RmaDetailAndDecisionDrawer
        rma={selectedRma}
        storageBins={storageBins}
        suppliers={suppliers}
        onClose={() => setSelectedRma(null)}
        onUpdated={onUpdated}
      />
    </div>
  );
}
