'use client';

import React, { useState } from 'react';
import {
  RotateCcw,
  CheckCircle2,
  AlertTriangle
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
          <span className="inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium bg-amber-500/10 text-amber-300 border border-amber-500/20">
            <AlertTriangle className="w-3 h-3 text-amber-400" /> Muayene Bekliyor
          </span>
        );
      case 'RESTOCK_TO_BIN':
        return (
          <span className="inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
            <CheckCircle2 className="w-3 h-3 text-emerald-400" /> Sağlam (Rafa Alındı)
          </span>
        );
      case 'QUARANTINE_REPAIR':
        return (
          <span className="inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium bg-rose-500/10 text-rose-300 border border-rose-500/20">
            <AlertTriangle className="w-3 h-3 text-rose-400" /> Hasarlı (Karantinada)
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium bg-white/5 text-zinc-400 border border-white/10">
            {result}
          </span>
        );
    }
  };

  return (
    <div className="space-y-4">
      <div className="bg-[#111513]/90 border border-white/[0.06] p-5 rounded-[20px]">
        <h3 className="text-base font-semibold text-white flex items-center gap-2">
          <RotateCcw className="w-4 h-4 text-emerald-400" />
          Müşteri İade & Kalite Kontrol Muayenesi (RMA)
        </h3>
        <p className="text-xs text-zinc-400 mt-0.5">
          Pazaryeri ve e-ticaret iadelerinin kalite kontrolü, sağlam ürünlerin tekrar raf stok bakiyelerine eklenmesi
        </p>
      </div>

      <div className="bg-[#111513]/90 border border-white/[0.06] rounded-[20px] overflow-hidden">
        {rmaReturns.length === 0 ? (
          <div className="text-center py-10 text-zinc-500 text-xs">
            Kayıtlı iade (RMA) talebi bulunmuyor.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead>
                <tr className="bg-white/[0.02] border-b border-white/[0.06] text-zinc-400 uppercase text-[11px] tracking-wider">
                  <th className="py-3.5 px-4 font-medium">RMA / Sipariş No</th>
                  <th className="py-3.5 px-3 font-medium">Müşteri & Kanal</th>
                  <th className="py-3.5 px-3 font-medium">İade Ürün / Neden</th>
                  <th className="py-3.5 px-3 font-medium text-center">Kalite Durumu</th>
                  <th className="py-3.5 px-4 font-medium text-right">Karar / Aksiyon</th>
                </tr>
              </thead>
              <tbody>
                {rmaReturns.map((rma) => (
                  <tr
                    key={rma.id}
                    className="border-b border-white/[0.04] border-l-2 border-l-transparent hover:border-l-emerald-400 hover:bg-white/[0.02] transition-colors"
                  >
                    <td className="py-4 px-4">
                      <div className="font-medium text-white text-sm">
                        {rma.rmaNumber}
                      </div>
                      <div className="text-[11px] text-zinc-500 font-mono mt-0.5">
                        Sipariş: {rma.orderNumber}
                      </div>
                    </td>

                    <td className="py-4 px-3">
                      <div className="font-medium text-white">
                        {rma.customerName}
                      </div>
                      <div className="flex items-center gap-1.5 mt-1">
                        <span className="bg-white/5 text-zinc-300 border border-white/10 rounded-full px-2.5 py-0.5 text-[10px] font-mono">
                          {rma.channelCode}
                        </span>
                        {rma.returnTrackingNo && (
                          <span className="text-[11px] text-zinc-500 font-mono">
                            {rma.returnTrackingNo}
                          </span>
                        )}
                      </div>
                    </td>

                    <td className="py-4 px-3">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-white">{rma.itemName}</span>
                        <span className="font-mono text-zinc-500">({rma.sku})</span>
                        <strong className="text-emerald-400 font-medium">x {rma.returnQty} Adet</strong>
                      </div>
                      <div className="text-[11px] text-zinc-500 italic mt-0.5">
                        {rma.returnReason}
                      </div>
                    </td>

                    <td className="py-4 px-3 text-center">
                      {getQcBadge(rma.qcInspectionResult)}
                    </td>

                    <td className="py-4 px-4 text-right">
                      {rma.qcInspectionResult === 'PENDING_INSPECTION' ? (
                        <div className="inline-flex items-center gap-2">
                          <button
                            onClick={() => handleDisposition(rma.id, 'RESTOCK_TO_BIN')}
                            disabled={submittingId === rma.id}
                            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-emerald-400 text-black hover:bg-emerald-300 rounded-full text-xs font-semibold shadow-[0_0_15px_rgba(52,211,153,0.2)] transition active:scale-95 disabled:opacity-50"
                          >
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            Sağlam Kabul (Rafa Al)
                          </button>

                          <button
                            onClick={() => handleDisposition(rma.id, 'QUARANTINE_REPAIR')}
                            disabled={submittingId === rma.id}
                            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 border border-rose-500/20 rounded-full text-xs font-semibold transition active:scale-95 disabled:opacity-50"
                          >
                            <AlertTriangle className="w-3.5 h-3.5" />
                            Kusurlu (Karantina)
                          </button>
                        </div>
                      ) : (
                        <div className="text-xs text-zinc-400">
                          <div>Hücre: <strong className="text-white font-mono">{rma.targetBinCode || 'A-01-01'}</strong></div>
                          <div className="text-emerald-400 font-medium mt-0.5">İade: ₺{rma.refundAmount}</div>
                        </div>
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
