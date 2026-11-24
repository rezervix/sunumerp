'use client';

import React, { useState } from 'react';
import {
  FileCheck2,
  Clock,
  CheckCircle2,
  Send,
  Building,
  Calendar,
  Layers
} from 'lucide-react';
import { toast } from 'sonner';
import { safeText, safeCurrency, safeDate, safeNumber } from '@/lib/utils/safe-display';

interface RequisitionLine {
  id: string;
  itemId: string;
  sku?: string;
  itemName?: string;
  quantity: number;
  unit?: string;
  estimatedCost?: number;
  totalCost?: number;
  item?: {
    name: string;
    sku: string;
  };
}

interface PurchaseRequisition {
  id: string;
  reqNumber: string;
  supplierName: string;
  triggerSource: string;
  status: string;
  priority: string;
  totalAmount: number;
  currency: string;
  notes?: string;
  createdAt: string;
  approvedBy?: string;
  lines?: RequisitionLine[];
  warehouse?: {
    name: string;
  };
}

interface Props {
  requisitions: PurchaseRequisition[];
  onUpdated: () => void;
}

export function PurchaseRequisitionsList({ requisitions, onUpdated }: Props) {
  const [submittingId, setSubmittingId] = useState<string | null>(null);
  const [filterStatus, setFilterStatus] = useState<string>('ALL');

  const filteredRequisitions = (requisitions || []).filter((pr) => {
    if (filterStatus === 'ALL') return true;
    return pr.status === filterStatus;
  });

  const handleApprove = async (prId: string) => {
    try {
      setSubmittingId(prId);
      const res = await fetch('/api/procurement', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'approve_requisition',
          reqId: prId,
          approvedBy: 'Satın Alma Müdürü'
        })
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Onaylama başarısız');
      }

      toast.success('Satın alma talebi onaylandı ve tedarikçiye PO olarak iletildi!');
      onUpdated();
    } catch (err: any) {
      toast.error(err.message || 'Hata oluştu');
    } finally {
      setSubmittingId(null);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'PENDING_APPROVAL':
        return (
          <span className="inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium bg-[--warn-soft] text-[--warn] border border-[--warn]/20">
            <Clock className="w-3 h-3 text-[--warn]" /> Onay Bekliyor
          </span>
        );
      case 'APPROVED_PO_SENT':
        return (
          <span className="inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium bg-[--brand-soft] text-[--brand] border border-[--brand-line]">
            <Send className="w-3 h-3 text-[--brand]" /> Sipariş Gönderildi (PO)
          </span>
        );
      case 'RECEIVED':
        return (
          <span className="inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium bg-[--ok-soft] text-[--ok] border border-[--ok]/20">
            <CheckCircle2 className="w-3 h-3 text-[--ok]" /> Teslim Alındı
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium bg-[--muted-bg] text-[--text-muted] border border-[--line]">
            {safeText(status)}
          </span>
        );
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-white/80 backdrop-blur-xl border border-[--line] p-4 rounded-[20px] shadow-sm">
        <div>
          <h3 className="text-base font-semibold text-[--text] flex items-center gap-2">
            <FileCheck2 className="w-4 h-4 text-[--brand]" />
            Satın Alma Talepleri & Sipariş Emirleri (PO)
          </h3>
          <p className="text-xs text-[--text-muted] mt-0.5">
            Otomatik ROP veya manuel oluşturulan tedarikçi satın alma onayları
          </p>
        </div>

        <div className="flex items-center gap-2">
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="text-xs bg-white border border-[--line] text-[--text] rounded-xl px-3 py-1.5 focus:border-[--brand] focus:ring-1 focus:ring-[--brand] focus:outline-none"
          >
            <option value="ALL">Tüm Talepler</option>
            <option value="PENDING_APPROVAL">Onay Bekleyenler</option>
            <option value="APPROVED_PO_SENT">Siparişe Dönüşenler</option>
          </select>
        </div>
      </div>

      <div className="bg-white border border-[--line] rounded-[20px] overflow-hidden shadow-sm">
        {filteredRequisitions.length === 0 ? (
          <div className="text-center py-12 text-[--text-muted] text-xs">
            Kayıtlı satın alma talebi bulunamadı.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-[--line] bg-[--muted-bg]/50 text-[11px] uppercase tracking-wider text-[--text-muted] font-medium">
                  <th className="py-3 px-4">Talep No</th>
                  <th className="py-3 px-3">Tedarikçi Firma</th>
                  <th className="py-3 px-3">İçerik / Kalemler</th>
                  <th className="py-3 px-3 text-right">Tahmini Tutar</th>
                  <th className="py-3 px-3">Kaynak & Öncelik</th>
                  <th className="py-3 px-3">Tarih</th>
                  <th className="py-3 px-3">Durum</th>
                  <th className="py-3 px-4 text-right">Aksiyon</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[--line]">
                {filteredRequisitions.map((pr) => (
                  <tr
                    key={pr.id}
                    className="hover:bg-[--brand-soft]/40 transition group"
                  >
                    <td className="py-3.5 px-4">
                      <span className="font-mono font-medium text-[--brand]">
                        {safeText(pr.reqNumber)}
                      </span>
                    </td>

                    <td className="py-3.5 px-3">
                      <div className="flex items-center gap-1.5 font-medium text-[--text]">
                        <Building className="w-3.5 h-3.5 text-[--text-muted]" />
                        {safeText(pr.supplierName, 'Tedarikçi')}
                      </div>
                      {pr.warehouse && (
                        <div className="text-[11px] text-[--text-muted] mt-0.5">
                          Depo: {safeText(pr.warehouse.name)}
                        </div>
                      )}
                    </td>

                    <td className="py-3.5 px-3 text-[--text-2]">
                      {pr.lines && pr.lines.length > 0 ? (
                        <div className="space-y-0.5">
                          {pr.lines.map((l) => (
                            <div key={l.id} className="flex items-center gap-1.5">
                              <span className="font-medium text-[--text]">
                                {safeText(l.item?.name || l.itemName)}
                              </span>
                              <span className="text-[--text-muted] font-mono tabular-nums">
                                ({safeNumber(l.quantity)} {safeText(l.unit, 'Adet')})
                              </span>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <span className="text-[--text-muted]">—</span>
                      )}
                    </td>

                    <td className="py-3.5 px-3 text-right font-mono font-semibold tabular-nums text-[--text]">
                      {safeCurrency(pr.totalAmount, pr.currency || 'TRY')}
                    </td>

                    <td className="py-3.5 px-3">
                      <div className="flex flex-col gap-1 items-start">
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-[--muted-bg] text-[--text-muted] border border-[--line]">
                          {safeText(pr.triggerSource)}
                        </span>
                        {pr.priority === 'CRITICAL' ? (
                          <span className="text-[10px] px-2 py-0.5 rounded-full bg-[--bad-soft] text-[--bad] border border-[--bad]/20 font-semibold">
                            Acil (Kritik)
                          </span>
                        ) : pr.priority === 'HIGH' ? (
                          <span className="text-[10px] px-2 py-0.5 rounded-full bg-[--warn-soft] text-[--warn] border border-[--warn]/20 font-medium">
                            Yüksek
                          </span>
                        ) : (
                          <span className="text-[10px] px-2 py-0.5 rounded-full bg-[--muted-bg] text-[--text-muted]">
                            Normal
                          </span>
                        )}
                      </div>
                    </td>

                    <td className="py-3.5 px-3 text-[--text-muted] tabular-nums">
                      <div className="flex items-center gap-1 text-[11px]">
                        <Calendar className="w-3 h-3 text-[--text-muted]" />
                        {safeDate(pr.createdAt)}
                      </div>
                    </td>

                    <td className="py-3.5 px-3">
                      {getStatusBadge(pr.status)}
                    </td>

                    <td className="py-3.5 px-4 text-right">
                      {pr.status === 'PENDING_APPROVAL' ? (
                        <button
                          onClick={() => handleApprove(pr.id)}
                          disabled={submittingId === pr.id}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-gradient-to-r from-[--brand] to-[--blue] hover:opacity-95 text-white rounded-full text-xs font-semibold shadow-sm shadow-[--brand]/20 transition active:scale-95 disabled:opacity-50 cursor-pointer"
                        >
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          {submittingId === pr.id ? 'Onaylanıyor...' : 'PO Onayla'}
                        </button>
                      ) : (
                        <span className="text-[11px] text-[--text-muted]">İşlem Tamam</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
