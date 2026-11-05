'use client';

import React, { useState } from 'react';
import {
  ShoppingBag,
  Split,
  CheckCircle2,
  Clock,
  Sparkles,
  User,
  MapPin,
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
          <span className="inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium bg-white/[0.06] text-zinc-300 border border-white/[0.08]">
            <Clock className="w-3 h-3 text-[#34D399]" /> Hazırlanıyor
          </span>
        );
      case 'PARTIALLY_SHIPPED':
        return (
          <span className="inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold bg-amber-500/10 text-amber-300 border border-amber-500/20">
            <Split className="w-3 h-3 text-amber-400" /> Parçalı Sevk
          </span>
        );
      case 'BACKORDERED':
        return (
          <span className="inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium bg-white/[0.05] text-zinc-400 border border-white/[0.08]">
            <Clock className="w-3 h-3 text-zinc-500" /> Backorder
          </span>
        );
      case 'DELIVERED':
        return (
          <span className="inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium bg-emerald-500/10 text-[#34D399] border border-emerald-500/20">
            <CheckCircle2 className="w-3 h-3 text-[#34D399]" /> Teslim Edildi
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
      {/* Filtre Barı */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-[#111513]/90 backdrop-blur-xl border border-white/[0.06] p-4 rounded-[20px]">
        <div>
          <h3 className="text-base font-semibold text-white flex items-center gap-2">
            <ShoppingBag className="w-4 h-4 text-[#34D399]" />
            Omnichannel Sipariş Karşılama & Sevkiyat Yönetimi
          </h3>
          <p className="text-xs text-zinc-400 mt-0.5">
            Pazaryeri ve e-ticaret siparişlerinin stok rezervasyonu, parçalı sevkiyat ve muadil ürün çözümleri
          </p>
        </div>

        <select
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value)}
          className="text-xs bg-white/[0.03] border border-white/[0.08] text-zinc-300 rounded-xl p-2 focus:outline-none"
        >
          <option value="ALL" className="bg-[#111513] text-white">Tüm Siparişler</option>
          <option value="PROCESSING" className="bg-[#111513] text-white">Hazırlananlar</option>
          <option value="PARTIALLY_SHIPPED" className="bg-[#111513] text-white">Parçalı Sevk Edilenler</option>
          <option value="BACKORDERED" className="bg-[#111513] text-white">Bekleyen Siparişler (Backorder)</option>
          <option value="DELIVERED" className="bg-[#111513] text-white">Teslim Edilenler</option>
        </select>
      </div>

      {/* Siparişler Listesi */}
      <div className="space-y-4">
        {filteredOrders.length === 0 ? (
          <div className="text-center py-10 bg-[#111513]/90 border border-white/[0.06] rounded-[20px] text-zinc-500 text-xs">
            Kayıtlı sipariş bulunamadı.
          </div>
        ) : (
          filteredOrders.map((ord) => (
            <div
              key={ord.id}
              className="p-6 rounded-[20px] bg-[#111513]/90 backdrop-blur-xl border border-white/[0.06] space-y-4 shadow-xl"
            >
              {/* Başlık Satırı */}
              <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-3 pb-3 border-b border-white/[0.06]">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-white/[0.03] border border-white/[0.06] flex items-center justify-center text-[#34D399] font-bold text-xs">
                    {ord.channelCode.slice(0, 3)}
                  </div>
                  <div>
                    <div className="flex items-center gap-2.5">
                      <span className="font-semibold text-white text-sm">
                        {ord.orderNumber}
                      </span>
                      <span className="bg-white/[0.04] text-zinc-300 border border-white/[0.08] rounded-full px-2.5 py-0.5 text-xs font-mono font-medium">
                        {ord.channelCode}
                      </span>
                      {getStatusBadge(ord.status)}
                      <span className="text-[11px] text-zinc-500">
                        {new Date(ord.orderDate).toLocaleDateString('tr-TR')}
                      </span>
                    </div>
                    <div className="text-xs text-zinc-400 flex items-center gap-3 mt-1">
                      <span className="flex items-center gap-1 font-medium text-zinc-300">
                        <User className="w-3 h-3 text-zinc-500" />
                        {ord.customerName}
                      </span>
                      <span className="flex items-center gap-1">
                        <MapPin className="w-3 h-3 text-zinc-500" />
                        {ord.customerCity}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Tutar ve Aksiyonlar */}
                <div className="flex items-center gap-3 w-full lg:w-auto justify-end">
                  <div className="text-right">
                    <div className="text-[10px] text-zinc-500">Sipariş Tutarı</div>
                    <div className="text-sm font-semibold text-white font-mono">
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
                        className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-[#34D399] hover:bg-[#34D399]/90 text-[#061811] rounded-full text-xs font-semibold shadow-lg shadow-emerald-500/20 transition active:scale-95 cursor-pointer"
                      >
                        <Split className="w-3.5 h-3.5" />
                        Parçalı Sevk
                      </button>

                      {ord.status !== 'BACKORDERED' && (
                        <button
                          onClick={() => handleBackorder(ord.id)}
                          className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-white/[0.04] hover:bg-white/[0.08] text-zinc-300 border border-white/[0.08] rounded-full text-xs font-medium transition cursor-pointer"
                        >
                          <Clock className="w-3.5 h-3.5 text-zinc-500" />
                          Backorder
                        </button>
                      )}
                    </div>
                  )}
                </div>
              </div>

              {/* Sipariş Kalemleri Tablosu */}
              <div className="bg-white/[0.02] border border-white/[0.06] rounded-xl overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="text-zinc-500 text-left bg-white/[0.02] border-b border-white/[0.06] uppercase text-[11px] font-medium">
                        <th className="py-2.5 px-4">Ürün / SKU</th>
                        <th className="py-2.5 px-3 text-right">Sipariş</th>
                        <th className="py-2.5 px-3 text-right">Sevk Edilen</th>
                        <th className="py-2.5 px-3 text-center">İlerleme (LED)</th>
                        <th className="py-2.5 px-3 text-right">Kalan</th>
                        <th className="py-2.5 px-3 text-right">Kargo Takip</th>
                        <th className="py-2.5 px-4 text-right">Aksiyon</th>
                      </tr>
                    </thead>
                    <tbody>
                      {ord.shipmentLines && ord.shipmentLines.length > 0 ? (
                        ord.shipmentLines.map((line) => {
                          const remaining = Math.max(0, line.quantity - line.shippedQty);
                          const ratio = line.quantity > 0 ? line.shippedQty / line.quantity : 0;
                          const activeLeds = Math.min(5, Math.max(line.shippedQty > 0 ? 1 : 0, Math.round(ratio * 5)));

                          return (
                            <tr
                              key={line.id}
                              className="border-b border-white/[0.04] border-l-2 border-l-transparent hover:border-l-emerald-400 hover:bg-white/[0.02] transition-colors text-zinc-300"
                            >
                              <td className="py-3 px-4">
                                <div className="font-medium text-white">
                                  {line.itemName || line.item?.name}
                                </div>
                                <div className="text-[11px] font-mono text-zinc-500">
                                  {line.sku || line.item?.sku}
                                </div>
                              </td>
                              <td className="py-3 px-3 text-right font-medium text-white">
                                {line.quantity} Adet
                              </td>
                              <td className="py-3 px-3 text-right font-semibold text-[#34D399]">
                                {line.shippedQty} Adet
                              </td>

                              {/* Segmented LED Bar */}
                              <td className="py-3 px-3 text-center">
                                <div className="flex items-center justify-center gap-1">
                                  {[0, 1, 2, 3, 4].map(idx => (
                                    <div
                                      key={idx}
                                      className={`h-1.5 w-3 rounded-full transition-colors ${
                                        idx < activeLeds
                                          ? "bg-[#34D399] shadow-[0_0_6px_rgba(52,211,153,0.35)]"
                                          : "bg-white/[0.08]"
                                      }`}
                                    />
                                  ))}
                                </div>
                              </td>

                              <td className="py-3 px-3 text-right font-medium text-amber-300">
                                {remaining} Adet
                              </td>
                              <td className="py-3 px-3 text-right text-[11px]">
                                {line.carrierTracking ? (
                                  <span className="font-mono bg-white/[0.04] text-zinc-200 px-2.5 py-0.5 rounded-full border border-white/[0.06]">
                                    {line.carrierTracking}
                                  </span>
                                ) : (
                                  <span className="text-zinc-500 italic">Sevk Bekliyor</span>
                                )}
                              </td>
                              <td className="py-3 px-4 text-right">
                                {remaining > 0 && line.itemId && (
                                  <button
                                    onClick={() => handleOpenSubstituteModal(ord, line)}
                                    className="inline-flex items-center gap-1 text-[11px] font-medium text-[#34D399] hover:text-emerald-300 bg-emerald-500/10 border border-emerald-500/20 rounded-full px-2.5 py-0.5 transition cursor-pointer"
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
                          <td colSpan={7} className="py-3 text-zinc-500 italic text-center">
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
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in">
          <div className="backdrop-blur-xl bg-[#111513] border border-white/[0.08] rounded-2xl w-full max-w-md p-6 shadow-2xl relative text-white">
            <div className="flex items-center justify-between pb-3 border-b border-white/[0.08]">
              <h3 className="text-sm font-semibold text-white flex items-center gap-2">
                <Split className="w-4 h-4 text-[#34D399]" />
                Parçalı Sevkiyat (Split Shipment)
              </h3>
              <button
                onClick={() => setSplitModalOrder(null)}
                className="text-zinc-500 hover:text-white p-1 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSplitShipment} className="mt-4 space-y-3.5">
              <div>
                <label className="block text-xs font-medium text-zinc-300 mb-1.5">
                  Sevk Edilecek Kalem *
                </label>
                <select
                  value={selectedLineId}
                  onChange={(e) => setSelectedLineId(e.target.value)}
                  required
                  className="w-full text-xs bg-white/[0.03] border border-white/[0.08] text-white rounded-xl p-2.5 focus:outline-none"
                >
                  {splitModalOrder.shipmentLines?.map((l) => (
                    <option key={l.id} value={l.id} className="bg-[#111513] text-white">
                      {l.itemName} (Kalan: {l.quantity - l.shippedQty} Adet)
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-zinc-300 mb-1.5">
                  Bu Pakette Sevk Edilecek Miktar *
                </label>
                <input
                  type="number"
                  min="1"
                  value={splitQty}
                  onChange={(e) => setSplitQty(e.target.value)}
                  required
                  className="w-full text-xs bg-white/[0.03] border border-white/[0.08] text-white rounded-xl p-2.5 font-bold focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-zinc-300 mb-1.5">
                    Kargo Firması
                  </label>
                  <select
                    value={carrierName}
                    onChange={(e) => setCarrierName(e.target.value)}
                    className="w-full text-xs bg-white/[0.03] border border-white/[0.08] text-white rounded-xl p-2.5 focus:outline-none"
                  >
                    <option value="Yurtiçi Kargo VIP" className="bg-[#111513] text-white">Yurtiçi Kargo</option>
                    <option value="Aras Kargo" className="bg-[#111513] text-white">Aras Kargo</option>
                    <option value="UPS Express Kurumsal" className="bg-[#111513] text-white">UPS Express</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-medium text-zinc-300 mb-1.5">
                    Kargo Takip No
                  </label>
                  <input
                    type="text"
                    value={trackingNo}
                    onChange={(e) => setTrackingNo(e.target.value)}
                    required
                    className="w-full text-xs bg-white/[0.03] border border-white/[0.08] text-white rounded-xl p-2.5 font-mono focus:outline-none"
                  />
                </div>
              </div>

              <div className="pt-3 border-t border-white/[0.08] flex justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setSplitModalOrder(null)}
                  className="px-4 py-2 border border-white/[0.08] bg-white/[0.04] text-zinc-300 hover:text-white text-xs font-medium rounded-full hover:bg-white/[0.08] transition cursor-pointer"
                >
                  Vazgeç
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2 bg-[#34D399] hover:bg-[#34D399]/90 text-[#061811] text-xs font-semibold rounded-full transition shadow-lg shadow-emerald-500/20 disabled:opacity-50 cursor-pointer"
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
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in">
          <div className="backdrop-blur-xl bg-[#111513] border border-white/[0.08] rounded-2xl w-full max-w-lg p-6 shadow-2xl relative text-white">
            <div className="flex items-center justify-between pb-3 border-b border-white/[0.08]">
              <h3 className="text-sm font-semibold text-white flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-[#34D399]" />
                Muadil & İkame Ürün Önerisi
              </h3>
              <button
                onClick={() => setSubstituteModalOrder(null)}
                className="text-zinc-500 hover:text-white p-1 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="mt-4 space-y-3.5">
              <div className="p-3 bg-amber-500/[0.08] border border-amber-500/20 rounded-xl text-xs text-amber-200">
                Siparişteki Ürün: <strong className="text-white">{substituteLine.itemName}</strong> (Miktar: {substituteLine.quantity} Adet)
              </div>

              <div className="text-xs font-semibold text-zinc-300">
                Stokta Bulunan Alternatifler:
              </div>

              {loadingSuggestions ? (
                <div className="text-center py-6 text-zinc-500 text-xs">
                  Uygun muadiller taranıyor...
                </div>
              ) : suggestions.length === 0 ? (
                <div className="text-center py-6 text-zinc-500 text-xs">
                  Bu ürün için tanımlı veya aynı kategoride stokta muadil bulunamadı.
                </div>
              ) : (
                <div className="space-y-2">
                  {suggestions.map((s) => (
                    <div
                      key={s.id}
                      className="p-3 rounded-xl border border-white/[0.06] bg-white/[0.02] flex items-center justify-between hover:bg-white/[0.04] transition text-xs"
                    >
                      <div>
                        <div className="font-semibold text-white">
                          {s.name}
                        </div>
                        <div className="text-zinc-500 text-[11px] font-mono mt-0.5">
                          {s.sku} • Stok: <strong className="text-[#34D399]">{s.availableQty} {s.unit}</strong>
                        </div>
                      </div>

                      <div className="flex items-center gap-3">
                        <span className="font-semibold text-white font-mono">
                          ₺{s.salesPrice}
                        </span>
                        <button
                          onClick={() => handleApplySubstitute(s.id)}
                          disabled={submitting}
                          className="px-3.5 py-1.5 bg-[#34D399] hover:bg-[#34D399]/90 text-[#061811] rounded-full font-semibold shadow-lg shadow-emerald-500/20 transition active:scale-95 disabled:opacity-50 cursor-pointer"
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
