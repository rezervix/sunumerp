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

  const filteredRequisitions = requisitions.filter((pr) => {
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
          <span className="inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium bg-amber-500/10 text-amber-300 border border-amber-500/20">
            <Clock className="w-3 h-3 text-amber-400" /> Onay Bekliyor
          </span>
        );
      case 'APPROVED_PO_SENT':
        return (
          <span className="inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium bg-white/[0.06] text-zinc-300 border border-white/[0.08]">
            <Send className="w-3 h-3 text-[#34D399]" /> Sipariş Gönderildi (PO)
          </span>
        );
      case 'RECEIVED':
        return (
          <span className="inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium bg-emerald-500/10 text-[#34D399] border border-emerald-500/20">
            <CheckCircle2 className="w-3 h-3 text-[#34D399]" /> Teslim Alındı
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium bg-white/[0.04] text-zinc-400 border border-white/[0.06]">
            {status}
          </span>
        );
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-[#111513]/90 backdrop-blur-xl border border-white/[0.06] p-4 rounded-[20px]">
        <div>
          <h3 className="text-base font-semibold text-white flex items-center gap-2">
            <FileCheck2 className="w-4 h-4 text-[#34D399]" />
            Satın Alma Talepleri & Sipariş Emirleri (PO)
          </h3>
          <p className="text-xs text-zinc-400 mt-0.5">
            Otomatik ROP veya manuel oluşturulan tedarikçi satın alma onayları
          </p>
        </div>

        <div className="flex items-center gap-2">
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="text-xs bg-white/[0.03] border border-white/[0.08] text-zinc-300 rounded-xl p-2 focus:outline-none"
          >
            <option value="ALL" className="bg-[#111513] text-white">Tüm Talepler</option>
            <option value="PENDING_APPROVAL" className="bg-[#111513] text-white">Onay Bekleyenler</option>
            <option value="APPROVED_PO_SENT" className="bg-[#111513] text-white">Siparişe Dönüşenler</option>
          </select>
        </div>
      </div>

      <div className="bg-[#111513]/90 backdrop-blur-xl border border-white/[0.06] rounded-[20px] overflow-hidden shadow-2xl">
        {filteredRequisitions.length === 0 ? (
          <div className="text-center py-10 text-zinc-500 text-xs">
            Kayıtlı satın alma talebi bulunamadı.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead>
                <tr className="bg-white/[0.02] border-b border-white/[0.06] text-zinc-400 uppercase text-[11px] font-medium">
                  <th className="py-4 px-5">Talep No / Tarih</th>
                  <th className="py-4 px-3">Tedarikçi & Depo</th>
                  <th className="py-4 px-3">Kalemler</th>
                  <th className="py-4 px-3 text-center">Durum</th>
                  <th className="py-4 px-3 text-right">Toplam Tutar</th>
                  <th className="py-4 px-5 text-right">İşlem</th>
                </tr>
              </thead>
              <tbody>
                {filteredRequisitions.map((pr) => (
                  <tr
                    key={pr.id}
                    className="border-b border-white/[0.04] border-l-2 border-l-transparent hover:border-l-emerald-400 hover:bg-white/[0.02] transition-colors"
                  >
                    <td className="py-4 px-5">
                      <div className="font-semibold text-white text-sm">
                        {pr.reqNumber}
                      </div>
                      <div className="text-[11px] text-zinc-500 flex items-center gap-1 mt-0.5">
                        <Calendar className="w-3 h-3 text-zinc-500" />
                        {new Date(pr.createdAt).toLocaleDateString('tr-TR')}
                      </div>
                    </td>

                    <td className="py-4 px-3">
                      <div className="flex items-center gap-1.5 text-white font-medium">
                        <Building className="w-3.5 h-3.5 text-zinc-500" />
                        <span>{pr.supplierName}</span>
                      </div>
                      {pr.warehouse?.name && (
                        <div className="text-[11px] text-zinc-400 mt-0.5">
                          {pr.warehouse.name}
                        </div>
                      )}
                      {pr.notes && (
                        <div className="text-[11px] text-zinc-500 mt-0.5 truncate max-w-xs">
                          {pr.notes}
                        </div>
                      )}
                    </td>

                    <td className="py-4 px-3">
                      {pr.lines && pr.lines.length > 0 ? (
                        <div className="flex flex-wrap gap-1.5">
                          {pr.lines.map((l) => (
                            <span
                              key={l.id}
                              className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-white/[0.03] border border-white/[0.06] rounded-lg text-xs font-medium text-zinc-300"
                            >
                              <Layers className="w-3 h-3 text-zinc-500" />
                              <span>{l.itemName || l.item?.name || 'Ürün'}</span>
                              <strong className="text-[#34D399] font-mono">
                                {l.quantity} {l.unit || 'Adet'}
                              </strong>
                            </span>
                          ))}
                        </div>
                      ) : (
                        <span className="text-zinc-600">-</span>
                      )}
                    </td>

                    <td className="py-4 px-3 text-center">
                      {getStatusBadge(pr.status)}
                    </td>

                    <td className="py-4 px-3 text-right">
                      <div className="text-sm font-semibold text-white font-mono">
                        ₺{Number(pr.totalAmount || 0).toLocaleString('tr-TR')}
                      </div>
                    </td>

                    <td className="py-4 px-5 text-right">
                      {pr.status === 'PENDING_APPROVAL' ? (
                        <button
                          onClick={() => handleApprove(pr.id)}
                          disabled={submittingId === pr.id}
                          className="inline-flex items-center gap-1.5 px-4 py-2 bg-[#34D399] hover:bg-[#34D399]/90 text-[#061811] rounded-full text-xs font-semibold shadow-lg shadow-emerald-500/20 transition active:scale-95 disabled:opacity-50 cursor-pointer"
                        >
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          {submittingId === pr.id ? 'Onaylanıyor...' : 'Onayla (PO Gönder)'}
                        </button>
                      ) : (
                        <span className="text-xs text-zinc-500">Onaylandı</span>
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
