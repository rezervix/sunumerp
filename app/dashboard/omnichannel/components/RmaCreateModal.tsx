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
    if (!isOpen) {
      setSelectedOrder(null);
      return;
    }
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
    if (eligibleOrders.length > 0) {
      selectOrder(eligibleOrders[0]);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, initialOrderNumber, eligibleOrders]);

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
    <div className="fixed inset-0 z-50 bg-[#0B1B33]/40 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white border border-[--line] rounded-[24px] w-full max-w-3xl shadow-2xl overflow-hidden my-6 text-[--text]">
        <div className="flex items-center justify-between px-6 py-4 border-b border-[--line] bg-[--page]">
          <div className="flex items-center gap-2.5">
            <RotateCcw className="w-5 h-5 text-[--brand]" />
            <div>
              <h2 className="text-base font-semibold text-[--text]">
                Yeni İade Talebi (RMA) Oluştur
              </h2>
              <p className="text-[11px] text-[--text-muted]">
                Omnichannel veya Çekirdek ERP siparişlerinden çok kalemli iade &amp; 14 gün süre kontrolü
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 text-[--text-muted] hover:text-[--text] rounded-xl hover:bg-[--muted-bg] cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-5 max-h-[78vh] overflow-y-auto">
          {/* Sipariş Seçimi / Arama */}
          <div className="space-y-2.5">
            <label className="text-xs font-medium text-[--text-2] block">
              1. Kaynak Sipariş Seçin (E-Ticaret / ERP)
            </label>
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Search className="w-4 h-4 text-[--text-muted] absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Sipariş No ara (ör. OMN-2026-9041 veya ORD-2026-0101)"
                  className="w-full bg-[--muted-bg] border border-[--line] rounded-xl pl-9 pr-3 py-2 text-xs text-[--text] focus:outline-none focus:border-[--brand]"
                />
              </div>
              <button
                type="button"
                onClick={handleLookupOrder}
                disabled={lookupLoading}
                className="px-4 py-2 rounded-xl bg-white hover:bg-[--brand-soft] border border-[--line] text-xs font-medium text-[--text] cursor-pointer disabled:opacity-50"
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
                      className={`shrink-0 text-left px-3 py-2 rounded-xl border text-[11px] transition cursor-pointer ${ isSel ? 'bg-[--brand-soft] border-[--brand-line] text-[--brand] font-medium' : 'bg-white border-[--line] text-[--text-2] hover:bg-[--brand-soft]/50' }`}
                    >
                      <div className="flex items-center gap-1.5">
                        <span className="font-mono font-semibold text-[--brand]">
                          {ord.orderNumber}
                        </span>
                        <span className="px-1.5 py-0.5 rounded bg-[--muted-bg] text-[9px] text-[--text-muted]">
                          {ord.orderSourceType === 'ERP_ORDER' ? 'ERP' : ord.channelCode}
                        </span>
                      </div>
                      <div className="text-[--text-muted] truncate max-w-[160px] mt-0.5">
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
            <div className="space-y-3 bg-[--page] border border-[--line] rounded-2xl p-4">
              <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
                <div>
                  <span className="text-[--text-muted]">Müşteri: </span>
                  <strong className="text-[--text]">{selectedOrder.customerName}</strong>
                  {selectedOrder.invoiceNo && (
                    <span className="ml-2 text-[11px] font-mono text-[--text-muted]">
                      (Fatura: {selectedOrder.invoiceNo})
                    </span>
                  )}
                </div>
                <span className="text-[11px] text-[--text-muted]">
                  Teslimat:{' '}
                  <strong className="text-[--text]">
                    {new Date(selectedOrder.deliveredAt).toLocaleDateString('tr-TR')}
                  </strong>
                </span>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-xs text-left">
                  <thead>
                    <tr className="border-b border-[--line] text-[10px] uppercase text-[--text-muted]">
                      <th className="py-2 pr-3">Ürün / SKU</th>
                      <th className="py-2 px-2 text-right">Satılan</th>
                      <th className="py-2 px-2 text-right">Kalan Hak</th>
                      <th className="py-2 px-2">Süre / Garanti</th>
                      <th className="py-2 pl-2 text-right">İade Adedi</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[--line]">
                    {selectedOrder.lines.map((line) => {
                      const elig = line.eligibility;
                      const currentQty = selectedQtyBySku[line.sku] ?? 0;
                      return (
                        <tr key={line.sku} className="hover:bg-[var(--muted-bg)]">
                          <td className="py-2.5 pr-3">
                            <div className="font-medium text-[--text]">{line.itemName}</div>
                            <div className="font-mono text-[10px] text-[--text-muted]">
                              {line.sku} · ₺{line.unitPrice}
                            </div>
                          </td>
                          <td className="py-2.5 px-2 text-right font-mono text-[--text]">
                            {line.soldQty}
                          </td>
                          <td className="py-2.5 px-2 text-right font-mono text-[--brand] font-semibold">
                            {line.maxReturnableQty}
                          </td>
                          <td className="py-2.5 px-2">
                            {elig?.isWithinReturnWindow ? (
                              <span
                                className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] border ${ elig.isExpiringSoon ? 'bg-[--warn-soft] text-[--warn] border-[--warn-soft]' : 'bg-[--ok-soft] text-[--ok] border-[--ok-soft]' }`}
                              >
                                <Clock className="w-3 h-3" />
                                {elig.remainingDays} gün kaldı
                              </span>
                            ) : elig?.isWithinWarranty ? (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] bg-[--brand-soft] text-[--brand] border border-[--brand-line]">
                                <ShieldCheck className="w-3 h-3" />
                                Garanti Kapsamında
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] bg-[--bad-soft] text-[--bad] border border-[--bad-soft]">
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
                              className="w-20 bg-white border border-[--line] rounded-lg px-2 py-1 text-right font-mono text-[--text] disabled:opacity-40"
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
              <label className="text-[--text-muted]">Standart İade Nedeni *</label>
              <select
                value={reasonCode}
                onChange={(e) => setReasonCode(e.target.value as RmaReasonCode)}
                className="w-full bg-white border border-[--line] rounded-xl px-3 py-2 text-[--text]"
              >
                {RMA_REASON_CODES.map((code) => (
                  <option key={code} value={code}>
                    {RMA_REASON_LABELS[code]}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-1">
              <label className="text-[--text-muted]">İade Kargo Firması</label>
              <select
                value={carrierCode}
                onChange={(e) => setCarrierCode(e.target.value)}
                className="w-full bg-white border border-[--line] rounded-xl px-3 py-2 text-[--text]"
              >
                <option value="YURTICI">Yurtiçi Kargo</option>
                <option value="ARAS">Aras Kargo</option>
                <option value="UPS">UPS Express</option>
                <option value="MNG">MNG / DHL eCommerce</option>
                <option value="TRENDYOL_EXPRESS">Trendyol Express</option>
              </select>
            </div>
            <div className="space-y-1">
              <label className="text-[--text-muted]">İade Takip Kodu (Opsiyonel)</label>
              <input
                type="text"
                value={trackingNo}
                onChange={(e) => setTrackingNo(e.target.value)}
                placeholder="Örn: YK-RMA-998811"
                className="w-full bg-white border border-[--line] rounded-xl px-3 py-2 text-[--text] font-mono"
              />
            </div>
          </div>

          <div className="space-y-1 text-xs">
            <label className="text-[--text-muted]">Detaylı Açıklama / Müşteri Notu</label>
            <input
              type="text"
              value={reasonNote}
              onChange={(e) => setReasonNote(e.target.value)}
              placeholder="Hasar durumu, eksik parça veya müşteri beyanı..."
              className="w-full bg-white border border-[--line] rounded-xl px-3 py-2 text-[--text]"
            />
          </div>

          {/* Süre İstisna Onayı */}
          {anyLineExpiredWithoutWarranty && (
            <div className="bg-[--warn-soft] border border-[--warn-soft] rounded-2xl p-4 space-y-2.5 text-xs">
              <div className="flex items-start gap-2 text-[--warn]">
                <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                <div>
                  <strong>Yasal / Politika İade Süresi Dolmuş:</strong> Bu sipariş için RMA açabilmek için yetkili istisna onayı ve gerekçesi zorunludur.
                </div>
              </div>
              <label className="flex items-center gap-2 text-[--text] cursor-pointer">
                <input
                  type="checkbox"
                  checked={deadlineOverrideApproved}
                  onChange={(e) => setDeadlineOverrideApproved(e.target.checked)}
                  className="rounded border-[--line]"
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
                  className="w-full bg-white border border-[--warn] rounded-xl px-3 py-2 text-[--text]"
                />
              )}
            </div>
          )}

          <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-[--line]">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-full bg-white border border-[--line] text-xs font-medium text-[--text-2] hover:bg-[--muted-bg] cursor-pointer"
            >
              Vazgeç
            </button>
            <button
              type="submit"
              disabled={submitting || selectedLinesPayload.length === 0}
              className="inline-flex items-center gap-1.5 px-5 py-2 rounded-full bg-gradient-to-r from-[--brand] to-[--blue] text-white text-xs font-semibold cursor-pointer shadow-sm hover:opacity-95 disabled:opacity-50"
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
