'use client';

import React, { useState } from 'react';
import {
  RotateCcw,
  Boxes,
  CheckCircle2,
  AlertTriangle,
  Layers,
  ArrowRight,
  ShieldCheck,
  Building
} from 'lucide-react';
import { toast } from 'sonner';

interface RmaRecord {
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
  refundAmount: number;
  refundStatus: string;
  returnTrackingNo?: string | null;
  createdAt: string;
}

interface Props {
  rmaReturns: RmaRecord[];
  onUpdated: () => void;
}

export function RmaReturnManager({ rmaReturns, onUpdated }: Props) {
  const [submittingId, setSubmittingId] = useState<string | null>(null);

  const handleDisposition = async (
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
          targetBinCode: disposition === 'RESTOCK_TO_BIN' ? 'A-01-01' : 'KARANTINA-01'
        })
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

  const getQcBadge = (result: string) => {
    switch (result) {
      case 'PENDING_INSPECTION':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300">
            <AlertTriangle className="w-3 h-3 text-amber-600" /> Muayene Bekliyor
          </span>
        );
      case 'RESTOCK_TO_BIN':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800">
            <CheckCircle2 className="w-3 h-3 text-emerald-600" /> Sağlam (Rafa Alındı)
          </span>
        );
      case 'QUARANTINE_REPAIR':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300">
            <AlertTriangle className="w-3 h-3 text-rose-600" /> Hasarlı (Karantinada)
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-gray-100 text-gray-700">
            {result}
          </span>
        );
    }
  };

  return (
    <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5 shadow-sm space-y-4">
      <div>
        <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
          <RotateCcw className="w-5 h-5 text-amber-600" />
          Müşteri İade & Kalite Kontrol Muayenesi (RMA)
        </h3>
        <p className="text-xs text-slate-500 mt-0.5">
          Pazaryeri ve e-ticaret iadelerinin kalite kontrolü, sağlam ürünlerin tekrar raf stok bakiyelerine eklenmesi
        </p>
      </div>

      <div className="space-y-3">
        {rmaReturns.length === 0 ? (
          <div className="text-center py-10 text-slate-400 text-xs">
            Kayıtlı iade (RMA) talebi bulunmuyor.
          </div>
        ) : (
          rmaReturns.map((rma) => (
            <div
              key={rma.id}
              className="p-4 rounded-xl border border-slate-200/80 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30 hover:bg-slate-50 transition"
            >
              <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-3 pb-3 border-b border-slate-200/60 dark:border-slate-800">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-amber-50 dark:bg-amber-950/60 border border-amber-200 dark:border-amber-800 flex items-center justify-center text-amber-600">
                    <RotateCcw className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-slate-900 dark:text-white text-sm">
                        {rma.rmaNumber}
                      </span>
                      {getQcBadge(rma.qcInspectionResult)}
                      <span className="text-[11px] text-slate-400 font-mono">
                        Sipariş: {rma.orderNumber}
                      </span>
                    </div>
                    <div className="text-xs text-slate-500 mt-0.5">
                      Müşteri: <strong>{rma.customerName}</strong> ({rma.channelCode})
                      {rma.returnTrackingNo && (
                        <span> • Kargo Takip: <strong>{rma.returnTrackingNo}</strong></span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Aksiyon Butonları */}
                <div className="flex items-center gap-2 w-full lg:w-auto justify-end">
                  {rma.qcInspectionResult === 'PENDING_INSPECTION' ? (
                    <>
                      <button
                        onClick={() => handleDisposition(rma.id, 'RESTOCK_TO_BIN')}
                        disabled={submittingId === rma.id}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-semibold shadow-sm transition active:scale-95 disabled:opacity-50"
                      >
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        Sağlam Kabul (Rafa Al)
                      </button>

                      <button
                        onClick={() => handleDisposition(rma.id, 'QUARANTINE_REPAIR')}
                        disabled={submittingId === rma.id}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-xs font-semibold shadow-sm transition active:scale-95 disabled:opacity-50"
                      >
                        <AlertTriangle className="w-3.5 h-3.5" />
                        Kusurlu (Karantina)
                      </button>
                    </>
                  ) : (
                    <div className="text-xs text-slate-500 flex items-center gap-2">
                      <span>Yerleştirilen Hücre: <strong>{rma.targetBinCode || 'A-01-01'}</strong></span>
                      <span>•</span>
                      <span className="text-emerald-600 font-semibold">İade Tutarı: ₺{rma.refundAmount}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Detay Bilgileri */}
              <div className="mt-3 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 text-xs">
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-slate-900 dark:text-white">
                    {rma.itemName}
                  </span>
                  <span className="font-mono text-slate-400">({rma.sku})</span>
                  <strong className="text-amber-600">x {rma.returnQty} Adet</strong>
                </div>

                <div className="text-slate-500 text-[11px]">
                  İade Nedeni: <span className="italic">{rma.returnReason}</span>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

