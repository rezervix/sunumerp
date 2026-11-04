'use client';

import React, { useState } from 'react';
import {
  ShoppingBag,
  Truck,
  Split,
  Layers,
  CheckCircle2,
  Clock,
  AlertCircle,
  Sparkles,
  ArrowRight,
  PackageCheck,
  Send,
  User,
  MapPin,
  RefreshCw,
  X
} from 'lucide-react';
import { toast } from 'sonner';

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
  eWaybillNo?: string | null;
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

  const filteredOrders = orders.filter((ord) => {
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
          <span className="inline-flex items-center gap-1 rounded-full px-3 py-0.5 text-xs font-semibold bg-sky-500/15 text-sky-300 border border-sky-500/30">
            <Clock className="w-3 h-3 text-sky-400" /> Hazırlanıyor
          </span>
        );
      case 'PARTIALLY_SHIPPED':
        return (
          <span className="inline-flex items-center gap-1 rounded-full px-3 py-0.5 text-xs font-semibold bg-amber-500/15 text-amber-300 border border-amber-500/30">
            <Split className="w-3 h-3 text-amber-400" /> Parçalı Sevk Edildi
          </span>
        );
      case 'BACKORDERED':
        return (
          <span className="inline-flex items-center gap-1 rounded-full px-3 py-0.5 text-xs font-semibold bg-purple-500/15 text-purple-300 border border-purple-500/30">
            <Clock className="w-3 h-3 text-purple-400" /> Bekleyen Sipariş (Backorder)
          </span>
        );
      case 'DELIVERED':
        return (
          <span className="inline-flex items-center gap-1 rounded-full px-3 py-0.5 text-xs font-semibold bg-emerald-500/15 text-emerald-300 border border-emerald-500/30">
            <CheckCircle2 className="w-3 h-3 text-emerald-400" /> Teslim Edildi
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 rounded-full px-3 py-0.5 text-xs font-semibold bg-white/10 text-white/70 border border-white/15">
            {status}
          </span>
        );
    }
  };

  return (
    <div className="space-y-4">
      {/* Filtre Barı */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 glass-panel p-5 rounded-2xl">
        <div>
          <h3 className="text-base font-bold text-white flex items-center gap-2">
            <ShoppingBag className="w-5 h-5 text-sky-400" />
            Omnichannel Sipariş Karşılama & Sevkiyat Yönetimi
          </h3>
          <p className="text-xs text-white/60 mt-0.5">
            Pazaryeri ve e-ticaret siparişlerinin stok rezervasyonu, parçalı sevkiyat ve muadil ürün çözümleri
          </p>
        </div>

        <select
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value)}
          className="text-xs glass-input p-2 focus:outline-none"
        >
          <option value="ALL" className="bg-slate-900 text-white">Tüm Siparişler</option>
          <option value="PROCESSING" className="bg-slate-900 text-white">Hazırlananlar</option>
          <option value="PARTIALLY_SHIPPED" className="bg-slate-900 text-white">Parçalı Sevk Edilenler</option>
          <option value="BACKORDERED" className="bg-slate-900 text-white">Bekleyen Siparişler (Backorder)</option>
          <option value="DELIVERED" className="bg-slate-900 text-white">Teslim Edilenler</option>
        </select>
      </div>

      {/* Siparişler Listesi */}
      <div className="space-y-4">
        {filteredOrders.length === 0 ? (
          <div className="text-center py-10 glass-card rounded-2xl text-white/45 text-xs">
            Kayıtlı sipariş bulunamadı.
          </div>
        ) : (
          filteredOrders.map((ord) => (
            <div
              key={ord.id}
              className="p-5 rounded-2xl glass-card space-y-4"
            >
              {/* Başlık Satırı */}
              <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-3 pb-3 border-b border-white/10">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-sky-500/15 border border-sky-500/30 flex items-center justify-center text-sky-300 font-bold text-xs">
                    {ord.channelCode.slice(0, 3)}
                  </div>
                  <div>
                    <div className="flex items-center gap-2.5">
                      <span className="font-bold text-white text-sm">
                        {ord.orderNumber}
                      </span>
                      <span className="bg-indigo-500/15 text-indigo-300 border border-indigo-500/30 rounded-full px-3 py-0.5 text-xs font-mono font-semibold">
                        {ord.channelCode}
                      </span>
                      {getStatusBadge(ord.status)}
                      <span className="text-[11px] text-white/45">
                        {new Date(ord.orderDate).toLocaleDateString('tr-TR')}
                      </span>
                    </div>
                    <div className="text-xs text-white/60 flex items-center gap-3 mt-1">
                      <span className="flex items-center gap-1 font-medium text-white/85">
                        <User className="w-3 h-3 text-white/45" />
                        {ord.customerName}
                      </span>
                      <span className="flex items-center gap-1">
                        <MapPin className="w-3 h-3 text-white/45" />
                        {ord.customerCity}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Tutar ve Aksiyonlar */}
                <div className="flex items-center gap-3 w-full lg:w-auto justify-end">
                  <div className="text-right">
                    <div className="text-[11px] text-white/45">Sipariş Tutarı</div>
                    <div className="text-sm font-bold text-emerald-400">
                      ₺{Number(ord.totalAmount || 0).toLocaleString('tr-TR')}
                    </div>
                  </div>

                  {ord.status !== 'DELIVERED' && (
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => {
                          setSplitModalOrder(ord);
                          setSelectedLineId(ord.shipmentLines?.[0]?.id || '');
                        }}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-sky-600 hover:bg-sky-500 text-white rounded-xl text-xs font-semibold shadow-lg shadow-sky-500/20 transition active:scale-95"
                      >
                        <Split className="w-3.5 h-3.5" />
                        Parçalı Sevk
                      </button>

                      {ord.status !== 'BACKORDERED' && (
                        <button
                          onClick={() => handleBackorder(ord.id)}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-purple-500/15 hover:bg-purple-500/25 text-purple-300 border border-purple-500/30 rounded-xl text-xs font-semibold transition"
                        >
                          <Clock className="w-3.5 h-3.5" />
                          Backorder
                        </button>
                      )}
                    </div>
                  )}
                </div>
              </div>

              {/* Sipariş Kalemleri Tablosu */}
              <div className="glass-table-container overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="text-white/50 text-left bg-white/[0.03] border-b border-white/10 uppercase text-[11px]">
                        <th className="py-2.5 px-4 font-semibold">Ürün / SKU</th>
                        <th className="py-2.5 px-3 font-semibold text-right">Sipariş</th>
                        <th className="py-2.5 px-3 font-semibold text-right">Sevk Edilen</th>
                        <th className="py-2.5 px-3 font-semibold text-right">Kalan</th>
                        <th className="py-2.5 px-3 font-semibold text-right">Kargo Takip</th>
                        <th className="py-2.5 px-4 font-semibold text-right">Aksiyon</th>
                      </tr>
                    </thead>
                    <tbody>
                      {ord.shipmentLines && ord.shipmentLines.length > 0 ? (
                        ord.shipmentLines.map((line) => {
                          const remaining = Math.max(0, line.quantity - line.shippedQty);
                          return (
                            <tr key={line.id} className="border-b border-white/5 hover:bg-white/[0.04] transition-colors text-white/80">
                              <td className="py-3 px-4">
                                <div className="font-semibold text-white">
                                  {line.itemName || line.item?.name}
                                </div>
                                <div className="text-[11px] font-mono text-white/45">
                                  {line.sku || line.item?.sku}
                                </div>
                              </td>
                              <td className="py-3 px-3 text-right font-medium text-white">
                                {line.quantity} Adet
                              </td>
                              <td className="py-3 px-3 text-right font-bold text-emerald-400">
                                {line.shippedQty} Adet
                              </td>
                              <td className="py-3 px-3 text-right font-bold text-amber-400">
                                {remaining} Adet
                              </td>
                              <td className="py-3 px-3 text-right text-[11px]">
                                {line.carrierTracking ? (
                                  <span className="font-mono bg-white/10 text-white px-2.5 py-0.5 rounded-full border border-white/15">
                                    {line.carrierTracking}
                                  </span>
                                ) : (
                                  <span className="text-white/40 italic">Sevk Bekliyor</span>
                                )}
                              </td>
                              <td className="py-3 px-4 text-right">
                                {remaining > 0 && line.itemId && (
                                  <button
                                    onClick={() => handleOpenSubstituteModal(ord, line)}
                                    className="inline-flex items-center gap-1 text-[11px] font-semibold text-indigo-300 hover:text-indigo-200 bg-indigo-500/15 border border-indigo-500/30 rounded-full px-3 py-0.5 transition"
                                  >
                                    <Sparkles className="w-3 h-3" />
                                    Muadil Öner
                                  </button>
                                )}
                              </td>
                            </tr>
                          );
                        })
                      ) : (
                        <tr>
                          <td colSpan={6} className="py-3 text-white/40 italic text-center">
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
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in">
          <div className="backdrop-blur-xl bg-slate-950/85 border border-white/15 rounded-2xl w-full max-w-md p-6 shadow-2xl relative text-white">
            <div className="flex items-center justify-between pb-3 border-b border-white/10">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <Split className="w-4 h-4 text-sky-400" />
                Parçalı Sevkiyat (Split Shipment)
              </h3>
              <button
                onClick={() => setSplitModalOrder(null)}
                className="text-white/50 hover:text-white p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSplitShipment} className="mt-4 space-y-3.5">
              <div>
                <label className="block text-xs font-semibold text-white/70 mb-1.5">
                  Sevk Edilecek Kalem *
                </label>
                <select
                  value={selectedLineId}
                  onChange={(e) => setSelectedLineId(e.target.value)}
                  required
                  className="w-full text-xs glass-input p-2.5 focus:outline-none"
                >
                  {splitModalOrder.shipmentLines?.map((l) => (
                    <option key={l.id} value={l.id} className="bg-slate-900 text-white">
                      {l.itemName} (Kalan: {l.quantity - l.shippedQty} Adet)
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-white/70 mb-1.5">
                  Bu Pakette Sevk Edilecek Miktar *
                </label>
                <input
                  type="number"
                  min="1"
                  value={splitQty}
                  onChange={(e) => setSplitQty(e.target.value)}
                  required
                  className="w-full text-xs glass-input p-2.5 font-bold focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-white/70 mb-1.5">
                    Kargo Firması
                  </label>
                  <select
                    value={carrierName}
                    onChange={(e) => setCarrierName(e.target.value)}
                    className="w-full text-xs glass-input p-2.5 focus:outline-none"
                  >
                    <option value="Yurtiçi Kargo VIP" className="bg-slate-900 text-white">Yurtiçi Kargo</option>
                    <option value="Aras Kargo" className="bg-slate-900 text-white">Aras Kargo</option>
                    <option value="UPS Express Kurumsal" className="bg-slate-900 text-white">UPS Express</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-white/70 mb-1.5">
                    Kargo Takip No
                  </label>
                  <input
                    type="text"
                    value={trackingNo}
                    onChange={(e) => setTrackingNo(e.target.value)}
                    required
                    className="w-full text-xs glass-input p-2.5 font-mono focus:outline-none"
                  />
                </div>
              </div>

              <div className="pt-3 border-t border-white/10 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setSplitModalOrder(null)}
                  className="px-4 py-2 border border-white/15 bg-white/5 text-white/80 text-xs font-semibold rounded-xl hover:bg-white/10 transition"
                >
                  Vazgeç
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2 bg-sky-600 hover:bg-sky-500 text-white text-xs font-semibold rounded-xl transition shadow-lg shadow-sky-500/20 disabled:opacity-50"
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
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in">
          <div className="backdrop-blur-xl bg-slate-950/85 border border-white/15 rounded-2xl w-full max-w-lg p-6 shadow-2xl relative text-white">
            <div className="flex items-center justify-between pb-3 border-b border-white/10">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-indigo-400" />
                Muadil & İkame Ürün Önerisi
              </h3>
              <button
                onClick={() => setSubstituteModalOrder(null)}
                className="text-white/50 hover:text-white p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="mt-4 space-y-3.5">
              <div className="p-3 bg-amber-500/15 border border-amber-500/30 rounded-xl text-xs text-amber-200">
                Siparişteki Ürün: <strong className="text-white">{substituteLine.itemName}</strong> (Miktar: {substituteLine.quantity} Adet)
              </div>

              <div className="text-xs font-semibold text-white/70">
                Stokta Bulunan Alternatifler:
              </div>

              {loadingSuggestions ? (
                <div className="text-center py-6 text-white/50 text-xs">
                  Uygun muadiller taranıyor...
                </div>
              ) : suggestions.length === 0 ? (
                <div className="text-center py-6 text-white/50 text-xs">
                  Bu ürün için tanımlı veya aynı kategoride stokta muadil bulunamadı.
                </div>
              ) : (
                <div className="space-y-2.5">
                  {suggestions.map((s) => (
                    <div
                      key={s.id}
                      className="p-3.5 rounded-xl border border-white/10 bg-white/5 flex items-center justify-between hover:bg-white/10 transition text-xs"
                    >
                      <div>
                        <div className="font-semibold text-white">
                          {s.name}
                        </div>
                        <div className="text-white/50 text-[11px] font-mono mt-0.5">
                          {s.sku} • Stok: <strong className="text-emerald-400">{s.availableQty} {s.unit}</strong>
                        </div>
                      </div>

                      <div className="flex items-center gap-3">
                        <span className="font-bold text-white">
                          ₺{s.salesPrice}
                        </span>
                        <button
                          onClick={() => handleApplySubstitute(s.id)}
                          disabled={submitting}
                          className="px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl font-semibold shadow-lg shadow-indigo-500/20 transition active:scale-95 disabled:opacity-50"
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
