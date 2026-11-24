'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import {
  ShoppingBag,
  Split,
  CheckCircle2,
  Clock,
  Sparkles,
  User,
  MapPin,
  Truck,
  X
} from 'lucide-react';
import { toast } from 'sonner';
import { safeText, safeNumber, safeCurrency, safeDate } from '@/lib/utils/safe-display';

interface OrderLine {
  id: string;
  itemId?: string | null;
  sku: string;
  itemName: string;
  quantity: number;
  shippedQty: number;
  unitPrice: number;
  carrierName?: string | null;
  carrierTracking?: string | null;
  status: string;
  item?: {
    name: string;
    sku: string;
  };
}

interface OmnichannelOrder {
  id: string;
  orderNumber: string;
  channelCode: string;
  channelOrderRef: string;
  customerName: string;
  customerCity: string;
  fulfillmentStrategy: string;
  status: string;
  totalAmount: number;
  currency: string;
  backorderQty?: number;
  eInvoiceNo?: string | null;
  eInvoiceStatus?: string | null;
  eWaybillNo?: string | null;
  shipmentTripId?: string | null;
  trackingToken?: string | null;
  orderDate: string;
  shipmentLines?: OrderLine[];
}

interface Props {
  orders: OmnichannelOrder[];
  onOrderUpdated: () => void;
}

export function OmnichannelOrdersManager({ orders, onOrderUpdated }: Props) {
  const [filterStatus, setFilterStatus] = useState<string>('ALL');
  const [submitting, setSubmitting] = useState(false);

  // Split shipment modal state
  const [splitModalOrder, setSplitModalOrder] = useState<OmnichannelOrder | null>(null);
  const [selectedLineId, setSelectedLineId] = useState<string>('');
  const [splitQty, setSplitQty] = useState('10');
  const [carrierName, setCarrierName] = useState('Yurtiçi Kargo VIP');
  const [trackingNo, setTrackingNo] = useState(`YK-${Date.now().toString().slice(-8)}`);

  // Substitute modal state
  const [substituteModalOrder, setSubstituteModalOrder] = useState<OmnichannelOrder | null>(null);
  const [substituteLine, setSubstituteLine] = useState<OrderLine | null>(null);
  const [suggestions, setSuggestions] = useState<any[]>([]);
  const [loadingSuggestions, setLoadingSuggestions] = useState(false);

  const filteredOrders = (orders || []).filter((ord) => {
    if (filterStatus === 'ALL') return true;
    return ord.status === filterStatus;
  });

  // 1. Parçalı Sevkiyat (Split Shipment)
  const handleSplitShipment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!splitModalOrder || !selectedLineId) return;

    try {
      setSubmitting(true);
      const res = await fetch('/api/omnichannel', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'split_shipment',
          orderId: splitModalOrder.id,
          lineId: selectedLineId,
          shipQuantity: parseFloat(splitQty) || 1,
          carrierName,
          trackingNumber: trackingNo
        })
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Parçalı sevkiyat başarısız');
      }

      toast.success(data.message || 'Parçalı sevkiyat başarıyla gerçekleştirildi!');
      setSplitModalOrder(null);
      onOrderUpdated();
    } catch (err: any) {
      toast.error(err.message || 'Hata oluştu');
    } finally {
      setSubmitting(false);
    }
  };

  // 2. Muadil Ürün Önerilerini Çek
  const handleOpenSubstituteModal = async (order: OmnichannelOrder, line: OrderLine) => {
    setSubstituteModalOrder(order);
    setSubstituteLine(line);
    setSuggestions([]);
    setLoadingSuggestions(true);

    try {
      const res = await fetch('/api/omnichannel', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'suggest_substitute',
          itemId: line.itemId
        })
      });

      const data = await res.json();
      if (data.success && data.suggestions) {
        setSuggestions(data.suggestions);
      } else {
        toast.info('Tavsiye edilebilecek alternatif ürün bulunamadı');
      }
    } catch (err) {
      toast.error('Muadil ürünler getirilemedi');
    } finally {
      setLoadingSuggestions(false);
    }
  };

  // 3. Muadil Ürünü Siparişe Uygula
  const handleApplySubstitute = async (substituteItemId: string) => {
    if (!substituteModalOrder || !substituteLine) return;

    try {
      setSubmitting(true);
      const res = await fetch('/api/omnichannel', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'apply_substitute',
          orderId: substituteModalOrder.id,
          lineId: substituteLine.id,
          substituteItemId
        })
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Muadil değişimi uygulanamadı');
      }

      toast.success(data.message || 'Sipariş kalemi muadil ürünle değiştirildi!');
      setSubstituteModalOrder(null);
      onOrderUpdated();
    } catch (err: any) {
      toast.error(err.message || 'Hata oluştu');
    } finally {
      setSubmitting(false);
    }
  };

  // 4. Bekleyen Siparişe (Backorder) Al
  const handleBackorder = async (orderId: string, qty = 20) => {
    try {
      setSubmitting(true);
      const res = await fetch('/api/omnichannel', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'backorder_order',
          orderId,
          backorderQty: qty
        })
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Backorder işlemi başarısız');
      }

      toast.success(data.message || 'Sipariş bekleyen siparişe alındı!');
      onOrderUpdated();
    } catch (err: any) {
      toast.error(err.message || 'Hata oluştu');
    } finally {
      setSubmitting(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'PROCESSING':
        return (
          <span className="inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium bg-[--brand-soft] text-[--brand] border border-[--brand-line]">
            <Clock className="w-3 h-3 text-[--brand]" /> Hazırlanıyor
          </span>
        );
      case 'PARTIALLY_SHIPPED':
        return (
          <span className="inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold bg-[--warn-soft] text-[--warn] border border-[--warn]/25">
            <Split className="w-3 h-3 text-[--warn]" /> Parçalı Sevk
          </span>
        );
      case 'BACKORDERED':
        return (
          <span className="inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium bg-[--muted-bg] text-[--text-muted] border border-[--line]">
            <Clock className="w-3 h-3 text-[--text-muted]" /> Backorder
          </span>
        );
      case 'DELIVERED':
        return (
          <span className="inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium bg-[--ok-soft] text-[--ok] border border-[--ok]/25">
            <CheckCircle2 className="w-3 h-3 text-[--ok]" /> Teslim Edildi
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
      {/* Filtre Barı */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-white/80 backdrop-blur-xl border border-[--line] p-4 rounded-[20px] shadow-sm">
        <div>
          <h3 className="text-base font-semibold text-[--text] flex items-center gap-2">
            <ShoppingBag className="w-4 h-4 text-[--brand]" />
            Omnichannel Sipariş Karşılama & Sevkiyat Yönetimi
          </h3>
          <p className="text-xs text-[--text-muted] mt-0.5">
            Pazaryeri ve e-ticaret siparişlerinin stok rezervasyonu, parçalı sevkiyat ve muadil ürün çözümleri
          </p>
        </div>

        <select
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value)}
          className="text-xs bg-white border border-[--line] text-[--text] rounded-xl px-3 py-1.5 focus:border-[--brand] focus:ring-1 focus:ring-[--brand] focus:outline-none"
        >
          <option value="ALL">Tüm Siparişler</option>
          <option value="PROCESSING">Hazırlananlar</option>
          <option value="PARTIALLY_SHIPPED">Parçalı Sevk Edilenler</option>
          <option value="BACKORDERED">Bekleyen Siparişler (Backorder)</option>
          <option value="DELIVERED">Teslim Edilenler</option>
        </select>
      </div>

      {/* Siparişler Listesi */}
      <div className="space-y-4">
        {filteredOrders.length === 0 ? (
          <div className="text-center py-12 bg-white border border-[--line] rounded-[20px] text-[--text-muted] text-xs shadow-sm">
            Kayıtlı sipariş bulunamadı.
          </div>
        ) : (
          filteredOrders.map((ord) => (
            <div
              key={ord.id}
              className="p-6 rounded-[20px] bg-white border border-[--line] space-y-4 shadow-sm hover:border-[--brand-line] transition"
            >
              {/* Başlık Satırı */}
              <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-3 pb-3 border-b border-[--line]">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-[--brand-soft] border border-[--brand-line] flex items-center justify-center text-[--brand] font-bold text-xs">
                    {safeText(ord.channelCode).slice(0, 3)}
                  </div>
                  <div>
                    <div className="flex flex-wrap items-center gap-2.5">
                      <span className="font-semibold text-[--text] text-sm">
                        {safeText(ord.orderNumber)}
                      </span>
                      <span className="bg-[--muted-bg] text-[--brand] border border-[--line] rounded-full px-2.5 py-0.5 text-xs font-mono font-medium">
                        {safeText(ord.channelCode)}
                      </span>
                      {getStatusBadge(ord.status)}
                      {ord.eInvoiceNo && (
                        <span
                          className={`rounded-full px-2 py-0.5 text-[10px] font-mono border ${
                            ord.eInvoiceStatus === 'TASLAK'
                              ? 'bg-[--warn-soft] text-[--warn] border-[--warn]/25'
                              : 'bg-[--ok-soft] text-[--ok] border-[--ok]/25'
                          }`}
                        >
                          {ord.eInvoiceStatus === 'TASLAK' ? 'Taslak Fatura' : 'E-Fatura'}: {safeText(ord.eInvoiceNo)}
                        </span>
                      )}
                      <span className="text-[11px] text-[--text-muted] tabular-nums">
                        {safeDate(ord.orderDate)}
                      </span>
                    </div>
                    <div className="text-xs text-[--text-muted] flex items-center gap-3 mt-1">
                      <span className="flex items-center gap-1 font-medium text-[--text]">
                        <User className="w-3 h-3 text-[--text-muted]" />
                        {safeText(ord.customerName)}
                      </span>
                      <span className="flex items-center gap-1">
                        <MapPin className="w-3 h-3 text-[--text-muted]" />
                        {safeText(ord.customerCity)}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Tutar ve Aksiyonlar */}
                <div className="flex items-center gap-3 w-full lg:w-auto justify-end">
                  <div className="text-right">
                    <div className="text-[10px] text-[--text-muted]">Sipariş Tutarı</div>
                    <div className="text-sm font-semibold text-[--text] font-mono tabular-nums">
                      {safeCurrency(ord.totalAmount, ord.currency || 'TRY')}
                    </div>
                  </div>

                  {ord.status !== 'DELIVERED' && (
                    <div className="flex flex-wrap items-center gap-2">
                      {ord.trackingToken ? (
                        <Link
                          href={`/takip/${ord.trackingToken}`}
                          target="_blank"
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-[--brand-soft] hover:bg-[--brand-soft]/80 text-[--brand] border border-[--brand-line] rounded-full text-xs font-medium transition"
                        >
                          <MapPin className="w-3.5 h-3.5" />
                          Müşteri Takip
                        </Link>
                      ) : (
                        <Link
                          href={
                            ord.shipmentTripId
                              ? `/dashboard/sevkiyat?tripId=${encodeURIComponent(ord.shipmentTripId)}`
                              : `/dashboard/sevkiyat?addSourceType=OMNICHANNEL_ORDER&addSourceId=${encodeURIComponent(ord.id)}`
                          }
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white hover:bg-[--muted-bg] text-[--text-2] border border-[--line] rounded-full text-xs font-medium transition shadow-sm"
                        >
                          <Truck className="w-3.5 h-3.5 text-[--brand]" />
                          {ord.shipmentTripId ? 'Sefer Planı' : 'Sefere Ekle'}
                        </Link>
                      )}
                      <button
                        onClick={() => {
                          setSplitModalOrder(ord);
                          setSelectedLineId(ord.shipmentLines?.[0]?.id || '');
                        }}
                        className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-gradient-to-r from-[--brand] to-[--blue] hover:opacity-95 text-white rounded-full text-xs font-semibold shadow-sm transition active:scale-95 cursor-pointer"
                      >
                        <Split className="w-3.5 h-3.5" />
                        Parçalı Sevk
                      </button>

                      {ord.status !== 'BACKORDERED' && (
                        <button
                          onClick={() => handleBackorder(ord.id)}
                          className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-white hover:bg-[--muted-bg] text-[--text-2] border border-[--line] rounded-full text-xs font-medium transition cursor-pointer shadow-sm"
                        >
                          <Clock className="w-3.5 h-3.5 text-[--text-muted]" />
                          Backorder
                        </button>
                      )}
                    </div>
                  )}
                </div>
              </div>

              {/* Sipariş Kalemleri Tablosu */}
              <div className="bg-[--muted-bg]/40 border border-[--line] rounded-xl overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-xs border-collapse">
                    <thead>
                      <tr className="text-[--text-muted] text-left bg-white border-b border-[--line] uppercase text-[11px] font-medium tracking-wider">
                        <th className="py-2.5 px-4">Ürün / SKU</th>
                        <th className="py-2.5 px-3 text-right">Sipariş</th>
                        <th className="py-2.5 px-3 text-right">Sevk Edilen</th>
                        <th className="py-2.5 px-3 text-center">İlerleme (LED)</th>
                        <th className="py-2.5 px-3 text-right">Kalan</th>
                        <th className="py-2.5 px-3 text-right">Kargo Takip</th>
                        <th className="py-2.5 px-4 text-right">Aksiyon</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[--line]">
                      {ord.shipmentLines && ord.shipmentLines.length > 0 ? (
                        ord.shipmentLines.map((line) => {
                          const remaining = Math.max(0, safeNumber(line.quantity) - safeNumber(line.shippedQty));
                          const qty = safeNumber(line.quantity, 1);
                          const shipped = safeNumber(line.shippedQty, 0);
                          const ratio = qty > 0 ? shipped / qty : 0;
                          const activeLeds = Math.min(5, Math.max(shipped > 0 ? 1 : 0, Math.round(ratio * 5)));

                          return (
                            <tr
                              key={line.id}
                              className="hover:bg-[--brand-soft]/30 transition text-[--text-2]"
                            >
                              <td className="py-3 px-4">
                                <div className="font-medium text-[--text]">
                                  {safeText(line.itemName || line.item?.name)}
                                </div>
                                <div className="text-[11px] font-mono text-[--brand]">
                                  {safeText(line.sku || line.item?.sku)}
                                </div>
                              </td>
                              <td className="py-3 px-3 text-right font-medium text-[--text] tabular-nums">
                                {qty} Adet
                              </td>
                              <td className="py-3 px-3 text-right font-semibold text-[--brand] tabular-nums">
                                {shipped} Adet
                              </td>

                              {/* Segmented LED Bar */}
                              <td className="py-3 px-3 text-center">
                                <div className="flex items-center justify-center gap-1">
                                  {[0, 1, 2, 3, 4].map(idx => (
                                    <div
                                      key={idx}
                                      className={`h-1.5 w-3 rounded-full transition-colors ${
                                        idx < activeLeds
                                          ? "bg-[--brand]"
                                          : "bg-[--line]"
                                      }`}
                                    />
                                  ))}
                                </div>
                              </td>

                              <td className="py-3 px-3 text-right font-medium text-[--warn] tabular-nums">
                                {remaining} Adet
                              </td>
                              <td className="py-3 px-3 text-right text-[11px]">
                                {line.carrierTracking ? (
                                  <span className="font-mono bg-[--muted-bg] text-[--text] px-2.5 py-0.5 rounded-full border border-[--line]">
                                    {safeText(line.carrierTracking)}
                                  </span>
                                ) : (
                                  <span className="text-[--text-muted] italic">Sevk Bekliyor</span>
                                )}
                              </td>
                              <td className="py-3 px-4 text-right">
                                {remaining > 0 && line.itemId && (
                                  <button
                                    onClick={() => handleOpenSubstituteModal(ord, line)}
                                    className="inline-flex items-center gap-1 text-[11px] font-medium text-[--brand] hover:text-[--brand-hover] bg-[--brand-soft] border border-[--brand-line] rounded-full px-2.5 py-0.5 transition cursor-pointer"
                                  >
                                    <Sparkles className="w-3 h-3" />
                                    Muadil
                                  </button>
                                )}
                              </td>
                            </tr>
                          );
                        })
                      ) : (
                        <tr>
                          <td colSpan={7} className="py-3 text-[--text-muted] italic text-center">
                            Kalem bilgisi bulunamadı.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Parçalı Sevkiyat Modalı */}
      {splitModalOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[--navy]/40 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white border border-[--line] rounded-2xl w-full max-w-md p-6 shadow-xl relative text-[--text]">
            <div className="flex items-center justify-between pb-3 border-b border-[--line]">
              <h3 className="text-sm font-semibold text-[--text] flex items-center gap-2">
                <Split className="w-4 h-4 text-[--brand]" />
                Parçalı Sevkiyat (Split Shipment)
              </h3>
              <button
                onClick={() => setSplitModalOrder(null)}
                className="text-[--text-muted] hover:text-[--text] p-1 cursor-pointer transition rounded-lg hover:bg-[--muted-bg]"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSplitShipment} className="mt-4 space-y-3.5">
              <div>
                <label className="block text-xs font-medium text-[--text-muted] mb-1.5">
                  Sevk Edilecek Kalem *
                </label>
                <select
                  value={selectedLineId}
                  onChange={(e) => setSelectedLineId(e.target.value)}
                  required
                  className="w-full text-xs bg-white border border-[--line] text-[--text] rounded-xl p-2.5 focus:border-[--brand] focus:ring-1 focus:ring-[--brand] focus:outline-none"
                >
                  {splitModalOrder.shipmentLines?.map((l) => (
                    <option key={l.id} value={l.id} className="bg-white text-[--text]">
                      {safeText(l.itemName)} (Kalan: {safeNumber(l.quantity) - safeNumber(l.shippedQty)} Adet)
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-[--text-muted] mb-1.5">
                  Bu Pakette Sevk Edilecek Miktar *
                </label>
                <input
                  type="number"
                  min="1"
                  value={splitQty}
                  onChange={(e) => setSplitQty(e.target.value)}
                  required
                  className="w-full text-xs bg-white border border-[--line] text-[--text] rounded-xl p-2.5 font-bold focus:border-[--brand] focus:ring-1 focus:ring-[--brand] focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-[--text-muted] mb-1.5">
                    Kargo Firması
                  </label>
                  <select
                    value={carrierName}
                    onChange={(e) => setCarrierName(e.target.value)}
                    className="w-full text-xs bg-white border border-[--line] text-[--text] rounded-xl p-2.5 focus:border-[--brand] focus:ring-1 focus:ring-[--brand] focus:outline-none"
                  >
                    <option value="Yurtiçi Kargo VIP">Yurtiçi Kargo</option>
                    <option value="Aras Kargo">Aras Kargo</option>
                    <option value="UPS Express Kurumsal">UPS Express</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-medium text-[--text-muted] mb-1.5">
                    Kargo Takip No
                  </label>
                  <input
                    type="text"
                    value={trackingNo}
                    onChange={(e) => setTrackingNo(e.target.value)}
                    required
                    className="w-full text-xs bg-white border border-[--line] text-[--text] rounded-xl p-2.5 font-mono focus:border-[--brand] focus:ring-1 focus:ring-[--brand] focus:outline-none"
                  />
                </div>
              </div>

              <div className="pt-3 border-t border-[--line] flex justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setSplitModalOrder(null)}
                  className="px-4 py-2 border border-[--line] bg-white text-[--text-2] hover:bg-[--muted-bg] text-xs font-medium rounded-full transition cursor-pointer"
                >
                  Vazgeç
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2 bg-gradient-to-r from-[--brand] to-[--blue] hover:opacity-95 text-white text-xs font-semibold rounded-full shadow-sm transition disabled:opacity-50 cursor-pointer"
                >
                  {submitting ? 'Sevk Ediliyor...' : 'Paketi Yola Çıkar'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Muadil Ürün Öneri Modalı */}
      {substituteModalOrder && substituteLine && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[--navy]/40 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white border border-[--line] rounded-2xl w-full max-w-lg p-6 shadow-xl relative text-[--text]">
            <div className="flex items-center justify-between pb-3 border-b border-[--line]">
              <h3 className="text-sm font-semibold text-[--text] flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-[--brand]" />
                Muadil & İkame Ürün Önerisi
              </h3>
              <button
                onClick={() => setSubstituteModalOrder(null)}
                className="text-[--text-muted] hover:text-[--text] p-1 cursor-pointer transition rounded-lg hover:bg-[--muted-bg]"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="mt-4 space-y-3.5">
              <div className="p-3 bg-[--warn-soft] border border-[--warn]/25 rounded-xl text-xs text-[--warn]">
                Siparişteki Ürün: <strong className="text-[--text]">{safeText(substituteLine.itemName)}</strong> (Miktar: {safeNumber(substituteLine.quantity)} Adet)
              </div>

              <div className="text-xs font-semibold text-[--text]">
                Stokta Bulunan Alternatifler:
              </div>

              {loadingSuggestions ? (
                <div className="text-center py-6 text-[--text-muted] text-xs">
                  Uygun muadiller taranıyor...
                </div>
              ) : suggestions.length === 0 ? (
                <div className="text-center py-6 text-[--text-muted] text-xs">
                  Bu ürün için tanımlı veya aynı kategoride stokta muadil bulunamadı.
                </div>
              ) : (
                <div className="space-y-2">
                  {suggestions.map((s) => (
                    <div
                      key={s.id}
                      className="p-3 rounded-xl border border-[--line] bg-white flex items-center justify-between hover:bg-[--muted-bg]/40 transition text-xs shadow-sm"
                    >
                      <div>
                        <div className="font-semibold text-[--text]">
                          {safeText(s.name)}
                        </div>
                        <div className="text-[--text-muted] text-[11px] font-mono mt-0.5">
                          {safeText(s.sku)} • Stok: <strong className="text-[--ok]">{safeNumber(s.availableQty)} {safeText(s.unit)}</strong>
                        </div>
                      </div>

                      <div className="flex items-center gap-3">
                        <span className="font-semibold text-[--text] font-mono tabular-nums">
                          {safeCurrency(s.salesPrice)}
                        </span>
                        <button
                          onClick={() => handleApplySubstitute(s.id)}
                          disabled={submitting}
                          className="px-3.5 py-1.5 bg-gradient-to-r from-[--brand] to-[--blue] hover:opacity-95 text-white rounded-full font-semibold shadow-sm transition active:scale-95 disabled:opacity-50 cursor-pointer"
                        >
                          Seç & Değiştir
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
