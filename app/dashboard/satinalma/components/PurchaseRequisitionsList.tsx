'use client';

import React, { useState } from 'react';
import {
  FileCheck2,
  Clock,
  CheckCircle2,
  Send,
  AlertCircle,
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
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300">
            <Clock className="w-3 h-3 text-amber-600" /> Onay Bekliyor
          </span>
        );
      case 'APPROVED_PO_SENT':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300">
            <Send className="w-3 h-3 text-blue-600" /> Sipariş Gönderildi (PO)
          </span>
        );
      case 'RECEIVED':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800">
            <CheckCircle2 className="w-3 h-3 text-emerald-600" /> Teslim Alındı
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-gray-100 text-gray-700">
            {status}
          </span>
        );
    }
  };

  return (
    <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5 shadow-sm space-y-4">
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        <div>
          <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <FileCheck2 className="w-5 h-5 text-indigo-600" />
            Satın Alma Talepleri & Sipariş Emirleri (PO)
          </h3>
          <p className="text-xs text-slate-500 mt-0.5">
            Otomatik ROP veya manuel oluşturulan tedarikçi satın alma onayları
          </p>
        </div>

        <div className="flex items-center gap-2">
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="text-xs rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800 p-2 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
          >
            <option value="ALL">Tüm Talepler</option>
            <option value="PENDING_APPROVAL">Onay Bekleyenler</option>
            <option value="APPROVED_PO_SENT">Siparişe Dönüşenler</option>
          </select>
        </div>
      </div>

      <div className="space-y-3">
        {filteredRequisitions.length === 0 ? (
          <div className="text-center py-10 text-slate-400 text-xs">
            Kayıtlı satın alma talebi bulunamadı.
          </div>
        ) : (
          filteredRequisitions.map((pr) => (
            <div
              key={pr.id}
              className="p-4 rounded-xl border border-slate-200/80 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30 hover:bg-slate-50 transition"
            >
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pb-3 border-b border-slate-200/60 dark:border-slate-800">
                <div className="flex items-center gap-3">
                  <span className="font-bold text-slate-900 dark:text-white text-sm">
                    {pr.reqNumber}
                  </span>
                  {getStatusBadge(pr.status)}
                  <span className="text-[11px] text-slate-400 flex items-center gap-1">
                    <Calendar className="w-3 h-3" />
                    {new Date(pr.createdAt).toLocaleDateString('tr-TR')}
                  </span>
                </div>

                <div className="flex items-center gap-3">
                  <div className="text-right">
                    <div className="text-[11px] text-slate-400">Toplam Tutar</div>
                    <div className="text-sm font-bold text-indigo-600 dark:text-indigo-400">
                      ₺{Number(pr.totalAmount || 0).toLocaleString('tr-TR')}
                    </div>
                  </div>

                  {pr.status === 'PENDING_APPROVAL' && (
                    <button
                      onClick={() => handleApprove(pr.id)}
                      disabled={submittingId === pr.id}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-semibold shadow-sm transition active:scale-95 disabled:opacity-50"
                    >
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      {submittingId === pr.id ? 'Onaylanıyor...' : 'Onayla (PO Gönder)'}
                    </button>
                  )}
                </div>
              </div>

              {/* Tedarikçi ve Kalemler */}
              <div className="mt-3 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 text-xs">
                <div className="flex items-center gap-2 text-slate-700 dark:text-slate-300">
                  <Building className="w-3.5 h-3.5 text-slate-400" />
                  <span className="font-semibold">{pr.supplierName}</span>
                  {pr.warehouse?.name && (
                    <span className="text-slate-400">
                      ({pr.warehouse.name})
                    </span>
                  )}
                </div>

                <div className="text-slate-500 text-[11px]">
                  {pr.notes}
                </div>
              </div>

              {/* Kalemler */}
              {pr.lines && pr.lines.length > 0 && (
                <div className="mt-2.5 pt-2 border-t border-slate-100 dark:border-slate-800/80">
                  <div className="flex flex-wrap gap-2">
                    {pr.lines.map((l) => (
                      <span
                        key={l.id}
                        className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-medium text-slate-800 dark:text-slate-200"
                      >
                        <Layers className="w-3 h-3 text-indigo-500" />
                        <span>{l.itemName || l.item?.name || 'Ürün'}</span>
                        <strong className="text-indigo-600">
                          {l.quantity} {l.unit || 'Adet'}
                        </strong>
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}

