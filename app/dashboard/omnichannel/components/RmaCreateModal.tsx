'use client';

import React, { useEffect, useMemo, useState } from 'react';
import {
  AlertTriangle,
  CheckCircle2,
  Clock,
  Plus,
  RotateCcw,
  Search,
  ShieldCheck,
  X,
} from 'lucide-react';
import { toast } from 'sonner';
import {
  RMA_REASON_CODES,
  RMA_REASON_LABELS,
  type RmaReasonCode,
} from '@/lib/logistics/returns/constantsAndHelpers';

export interface EligibleOrderLine {
  orderLineId?: string | null;
  itemId?: string | null;
  sku: string;
  itemName: string;
  soldQty: number;
  shippedQty?: number;
  alreadyReturnedQty: number;
  maxReturnableQty: number;
  unitPrice: number;
  policy?: {
    returnWindowDays: number;
    warrantyMonths: number;
    restockable: boolean;
    policyTitle: string;
  };
  eligibility?: {
    deliveredAtIso: string;
    effectiveWindowDays: number;
    returnDeadlineIso: string;
    remainingDays: number;
    isWithinReturnWindow: boolean;
    isExpiringSoon: boolean;
    warrantyMonths: number;
    warrantyExpiresIso: string | null;
    isWithinWarranty: boolean;
  };
}

export interface EligibleOrder {
  found: boolean;
  orderSourceType: 'OMNICHANNEL' | 'ERP_ORDER';
  orderId: string;
  orderNumber: string;
  channelCode: string;
  customerName: string;
  deliveredAt: string;
  invoiceDocId?: string | null;
  invoiceNo?: string | null;
  lines: EligibleOrderLine[];
}

interface Props {
  isOpen: boolean;
  onClose: () => void;
  eligibleOrders: EligibleOrder[];
  items?: any[];
  initialOrderNumber?: string;
  onCreated: (rma: any) => void;
}

export function RmaCreateModal({
  isOpen,
  onClose,
  eligibleOrders,
  initialOrderNumber,
  onCreated,
}: Props) {
  const [searchTerm, setSearchTerm] = useState(initialOrderNumber || '');
  const [selectedOrder, setSelectedOrder] = useState<EligibleOrder | null>(null);
  const [lookupLoading, setLookupLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const [reasonCode, setReasonCode] = useState<RmaReasonCode>('HASARLI_KARGO');
  const [reasonNote, setReasonNote] = useState('');
  const [carrierCode, setCarrierCode] = useState('YURTICI');
  const [trackingNo, setTrackingNo] = useState('');
  const [deadlineOverrideApproved, setDeadlineOverrideApproved] = useState(false);
  const [deadlineOverrideReason, setDeadlineOverrideReason] = useState('');
  const [selectedQtyBySku, setSelectedQtyBySku] = useState<Record<string, number>>({});

  useEffect(() => {
    if (!isOpen) return;
    if (initialOrderNumber) {
      setSearchTerm(initialOrderNumber);
      const found = eligibleOrders.find(
        (o) =>
          o.orderNumber.toLowerCase() === initialOrderNumber.toLowerCase() ||
          o.orderId === initialOrderNumber
      );
      if (found) {
        selectOrder(found);
        return;
      }
    }
    if (!selectedOrder && eligibleOrders.length > 0) {
      selectOrder(eligibleOrders[0]);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, initialOrderNumber]);

  const selectOrder = (ord: EligibleOrder) => {
    setSelectedOrder(ord);
    const qtyMap: Record<string, number> = {};
    for (const l of ord.lines || []) {
      qtyMap[l.sku] = l.maxReturnableQty > 0 ? Math.min(1, l.maxReturnableQty) : 0;
    }
    setSelectedQtyBySku(qtyMap);
    setDeadlineOverrideApproved(false);
    setDeadlineOverrideReason('');
  };

  const handleLookupOrder = async () => {
    const q = searchTerm.trim();
    if (!q) {
      toast.error('Sipariş numarası veya kodu giriniz.');
      return;
    }
    setLookupLoading(true);
    try {
      const res = await fetch('/api/omnichannel', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'lookup_order_for_rma',
          orderNumber: q,
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Sipariş sorgulanamadı');
      }
      if (!data.found) {
        toast.warning(`"${q}" numaralı sipariş bulunamadı.`);
        return;
      }
      selectOrder(data as EligibleOrder);
      toast.success(`Sipariş yüklendi: ${data.orderNumber}`);
    } catch (err: any) {
      toast.error(err.message || 'Sipariş arama hatası');
    } finally {
      setLookupLoading(false);
    }
  };

  const anyLineExpiredWithoutWarranty = useMemo(() => {
    if (!selectedOrder) return false;
    return selectedOrder.lines.some((l) => {
      const qty = Number(selectedQtyBySku[l.sku] || 0);
      if (qty <= 0) return false;
      const elig = l.eligibility;
      return elig ? !elig.isWithinReturnWindow && !elig.isWithinWarranty : false;
    });
  }, [selectedOrder, selectedQtyBySku]);

  const selectedLinesPayload = useMemo(() => {
    if (!selectedOrder) return [];
    return selectedOrder.lines
      .filter((l) => Number(selectedQtyBySku[l.sku] || 0) > 0)
      .map((l) => ({
        itemId: l.itemId ?? null,
        orderLineId: l.orderLineId ?? null,
        sku: l.sku,
        itemName: l.itemName,
        requestedQty: Number(selectedQtyBySku[l.sku] || 0),
        unitPrice: l.unitPrice,
      }));
  }, [selectedOrder, selectedQtyBySku]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedOrder) {
      toast.error('Lütfen bir kaynak sipariş seçin.');
      return;
    }
    if (selectedLinesPayload.length === 0) {
      toast.error('İade edilecek en az bir satır için 0’dan büyük miktar girin.');
      return;
    }
    if (anyLineExpiredWithoutWarranty && !deadlineOverrideApproved) {
      toast.error('İade süresi dolmuş sipariş için yetkili istisna onayı işaretlenmelidir.');
      return;
    }
    if (deadlineOverrideApproved && !deadlineOverrideReason.trim()) {
      toast.error('Süre dışı istisna onayı için gerekçe yazılmalıdır.');
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch('/api/omnichannel', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'create_rma',
          orderNumber: selectedOrder.orderNumber,
          originalOrderId: selectedOrder.orderId,
          orderSourceType: selectedOrder.orderSourceType,
          channelCode: selectedOrder.channelCode,
          customerName: selectedOrder.customerName,
          invoiceDocId: selectedOrder.invoiceDocId ?? null,
          invoiceNo: selectedOrder.invoiceNo ?? null,
          reasonCode,
          reasonNote: reasonNote.trim() || undefined,
          returnCarrierCode: carrierCode,
          returnTrackingNo: trackingNo.trim() || undefined,
          deliveredAt: selectedOrder.deliveredAt,
          deadlineOverrideApproved,
          deadlineOverrideReason: deadlineOverrideReason.trim() || undefined,
          lines: selectedLinesPayload,
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'RMA oluşturulamadı');
      }
      toast.success(data.message || 'RMA belgesi oluşturuldu!');
      onCreated(data.rma);
      onClose();
    } catch (err: any) {
      toast.error(err.message || 'RMA oluşturma hatası');
    } finally {
      setSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-[#111513] border border-white/[0.08] rounded-[24px] w-full max-w-3xl shadow-2xl overflow-hidden my-6">
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/[0.06] bg-white/[0.02]">
          <div className="flex items-center gap-2.5">
            <RotateCcw className="w-5 h-5 text-[#34D399]" />
            <div>
              <h2 className="text-base font-semibold text-white">
                Yeni İade Talebi (RMA) Oluştur
              </h2>
              <p className="text-[11px] text-zinc-400">
                Omnichannel veya Çekirdek ERP siparişlerinden çok kalemli iade &amp; 14 gün süre kontrolü
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 text-zinc-400 hover:text-white rounded-xl hover:bg-white/[0.06] cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-5 max-h-[78vh] overflow-y-auto">
          {/* Sipariş Seçimi / Arama */}
          <div className="space-y-2.5">
            <label className="text-xs font-medium text-zinc-300 block">
              1. Kaynak Sipariş Seçin (E-Ticaret / ERP)
            </label>
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Search className="w-4 h-4 text-zinc-500 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Sipariş No ara (ör. OMN-2026-9041 veya ORD-2026-0101)"
                  className="w-full bg-black/40 border border-white/[0.08] rounded-xl pl-9 pr-3 py-2 text-xs text-white focus:outline-none focus:border-[#34D399]"
                />
              </div>
              <button
                type="button"
                onClick={handleLookupOrder}
                disabled={lookupLoading}
                className="px-4 py-2 rounded-xl bg-white/[0.06] hover:bg-white/[0.12] border border-white/[0.08] text-xs font-medium text-white cursor-pointer disabled:opacity-50"
              >
                {lookupLoading ? 'Aranıyor...' : 'Sipariş Bul'}
              </button>
            </div>

            {eligibleOrders.length > 0 && (
              <div className="flex gap-2 overflow-x-auto pb-1">
                {eligibleOrders.slice(0, 8).map((ord) => {
                  const isSel = selectedOrder?.orderId === ord.orderId;
                  return (
                    <button
                      key={`${ord.orderSourceType}-${ord.orderId}`}
                      type="button"
                      onClick={() => selectOrder(ord)}
                      className={`shrink-0 text-left px-3 py-2 rounded-xl border text-[11px] transition cursor-pointer ${
                        isSel
                          ? 'bg-emerald-500/15 border-[#34D399]/50 text-white'
                          : 'bg-black/30 border-white/[0.06] text-zinc-300 hover:bg-white/[0.05]'
                      }`}
                    >
                      <div className="flex items-center gap-1.5">
                        <span className="font-mono font-semibold text-[#34D399]">
                          {ord.orderNumber}
                        </span>
                        <span className="px-1.5 py-0.5 rounded bg-white/[0.06] text-[9px] text-zinc-300">
                          {ord.orderSourceType === 'ERP_ORDER' ? 'ERP' : ord.channelCode}
                        </span>
                      </div>
                      <div className="text-zinc-400 truncate max-w-[160px] mt-0.5">
                        {ord.customerName}
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* Seçilen Sipariş Kalemleri */}
          {selectedOrder && (
            <div className="space-y-3 bg-black/30 border border-white/[0.06] rounded-2xl p-4">
              <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
                <div>
                  <span className="text-zinc-400">Müşteri: </span>
                  <strong className="text-white">{selectedOrder.customerName}</strong>
                  {selectedOrder.invoiceNo && (
                    <span className="ml-2 text-[11px] font-mono text-zinc-400">
                      (Fatura: {selectedOrder.invoiceNo})
                    </span>
                  )}
                </div>
                <span className="text-[11px] text-zinc-400">
                  Teslimat:{' '}
                  <strong className="text-zinc-200">
                    {new Date(selectedOrder.deliveredAt).toLocaleDateString('tr-TR')}
                  </strong>
                </span>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-xs text-left">
                  <thead>
                    <tr className="border-b border-white/[0.06] text-[10px] uppercase text-zinc-400">
                      <th className="py-2 pr-3">Ürün / SKU</th>
                      <th className="py-2 px-2 text-right">Satılan</th>
                      <th className="py-2 px-2 text-right">Kalan Hak</th>
                      <th className="py-2 px-2">Süre / Garanti</th>
                      <th className="py-2 pl-2 text-right">İade Adedi</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/[0.04]">
                    {selectedOrder.lines.map((line) => {
                      const elig = line.eligibility;
                      const currentQty = selectedQtyBySku[line.sku] ?? 0;
                      return (
                        <tr key={line.sku}>
                          <td className="py-2.5 pr-3">
                            <div className="font-medium text-white">{line.itemName}</div>
                            <div className="font-mono text-[10px] text-zinc-500">
                              {line.sku} · ₺{line.unitPrice}
                            </div>
                          </td>
                          <td className="py-2.5 px-2 text-right font-mono text-zinc-300">
                            {line.soldQty}
                          </td>
                          <td className="py-2.5 px-2 text-right font-mono text-[#34D399]">
                            {line.maxReturnableQty}
                          </td>
                          <td className="py-2.5 px-2">
                            {elig?.isWithinReturnWindow ? (
                              <span
                                className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] border ${
                                  elig.isExpiringSoon
                                    ? 'bg-amber-500/10 text-amber-300 border-amber-500/25'
                                    : 'bg-emerald-500/10 text-[#34D399] border-emerald-500/25'
                                }`}
                              >
                                <Clock className="w-3 h-3" />
                                {elig.remainingDays} gün kaldı
                              </span>
                            ) : elig?.isWithinWarranty ? (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] bg-sky-500/10 text-sky-300 border border-sky-500/25">
                                <ShieldCheck className="w-3 h-3" />
                                Garanti Kapsamında
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] bg-rose-500/10 text-rose-300 border border-rose-500/25">
                                <AlertTriangle className="w-3 h-3" />
                                Süre Dolmuş ({elig?.effectiveWindowDays || 14}g)
                              </span>
                            )}
                          </td>
                          <td className="py-2.5 pl-2 text-right">
                            <input
                              type="number"
                              min={0}
                              max={line.maxReturnableQty}
                              step="any"
                              disabled={line.maxReturnableQty <= 0}
                              value={currentQty}
                              onChange={(e) => {
                                const val = Math.max(
                                  0,
                                  Math.min(line.maxReturnableQty, Number(e.target.value || 0))
                                );
                                setSelectedQtyBySku((prev) => ({
                                  ...prev,
                                  [line.sku]: val,
                                }));
                              }}
                              className="w-20 bg-black/50 border border-white/[0.1] rounded-lg px-2 py-1 text-right font-mono text-white disabled:opacity-40"
                            />
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Neden Kodu, Kargo & Takip */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
            <div className="space-y-1">
              <label className="text-zinc-400">Standart İade Nedeni *</label>
              <select
                value={reasonCode}
                onChange={(e) => setReasonCode(e.target.value as RmaReasonCode)}
                className="w-full bg-black/40 border border-white/[0.08] rounded-xl px-3 py-2 text-white"
              >
                {RMA_REASON_CODES.map((code) => (
                  <option key={code} value={code} className="bg-[#111513]">
                    {RMA_REASON_LABELS[code]}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-1">
              <label className="text-zinc-400">İade Kargo Firması</label>
              <select
                value={carrierCode}
                onChange={(e) => setCarrierCode(e.target.value)}
                className="w-full bg-black/40 border border-white/[0.08] rounded-xl px-3 py-2 text-white"
              >
                <option value="YURTICI" className="bg-[#111513]">Yurtiçi Kargo</option>
                <option value="ARAS" className="bg-[#111513]">Aras Kargo</option>
                <option value="UPS" className="bg-[#111513]">UPS Express</option>
                <option value="MNG" className="bg-[#111513]">MNG / DHL eCommerce</option>
                <option value="TRENDYOL_EXPRESS" className="bg-[#111513]">Trendyol Express</option>
              </select>
            </div>
            <div className="space-y-1">
              <label className="text-zinc-400">İade Takip Kodu (Opsiyonel)</label>
              <input
                type="text"
                value={trackingNo}
                onChange={(e) => setTrackingNo(e.target.value)}
                placeholder="Örn: YK-RMA-998811"
                className="w-full bg-black/40 border border-white/[0.08] rounded-xl px-3 py-2 text-white font-mono"
              />
            </div>
          </div>

          <div className="space-y-1 text-xs">
            <label className="text-zinc-400">Detaylı Açıklama / Müşteri Notu</label>
            <input
              type="text"
              value={reasonNote}
              onChange={(e) => setReasonNote(e.target.value)}
              placeholder="Hasar durumu, eksik parça veya müşteri beyanı..."
              className="w-full bg-black/40 border border-white/[0.08] rounded-xl px-3 py-2 text-white"
            />
          </div>

          {/* Süre İstisna Onayı */}
          {anyLineExpiredWithoutWarranty && (
            <div className="bg-amber-500/10 border border-amber-500/30 rounded-2xl p-4 space-y-2.5 text-xs">
              <div className="flex items-start gap-2 text-amber-200">
                <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                <div>
                  <strong>Yasal / Politika İade Süresi Dolmuş:</strong> Bu sipariş için RMA açabilmek için yetkili istisna onayı ve gerekçesi zorunludur.
                </div>
              </div>
              <label className="flex items-center gap-2 text-white cursor-pointer">
                <input
                  type="checkbox"
                  checked={deadlineOverrideApproved}
                  onChange={(e) => setDeadlineOverrideApproved(e.target.checked)}
                  className="rounded border-white/20"
                />
                Yetkili Süre İstisna Onayı Veriyorum
              </label>
              {deadlineOverrideApproved && (
                <input
                  type="text"
                  required
                  value={deadlineOverrideReason}
                  onChange={(e) => setDeadlineOverrideReason(e.target.value)}
                  placeholder="İstisna onay gerekçesi (ör. VIP müşteri memnuniyeti / geç teslimat kanıtı)..."
                  className="w-full bg-black/50 border border-amber-500/30 rounded-xl px-3 py-2 text-white"
                />
              )}
            </div>
          )}

          <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-white/[0.06]">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-full bg-white/[0.04] border border-white/[0.08] text-xs font-medium text-zinc-300 hover:text-white cursor-pointer"
            >
              Vazgeç
            </button>
            <button
              type="submit"
              disabled={submitting || selectedLinesPayload.length === 0}
              className="inline-flex items-center gap-1.5 px-5 py-2 rounded-full bg-[#34D399] hover:bg-[#34D399]/90 text-[#061811] text-xs font-semibold cursor-pointer disabled:opacity-50"
            >
              <Plus className="w-3.5 h-3.5" />
              {submitting ? 'Oluşturuluyor...' : 'RMA Belgesi Oluştur'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
