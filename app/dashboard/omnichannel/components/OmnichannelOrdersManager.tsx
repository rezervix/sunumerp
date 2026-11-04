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
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300">
            <Clock className="w-3 h-3 text-blue-600" /> Hazırlanıyor
          </span>
        );
      case 'PARTIALLY_SHIPPED':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300">
            <Split className="w-3 h-3 text-amber-600" /> Parçalı Sevk Edildi
          </span>
        );
      case 'BACKORDERED':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-purple-100 text-purple-800 dark:bg-purple-950 dark:text-purple-300">
            <Clock className="w-3 h-3 text-purple-600" /> Bekleyen Sipariş (Backorder)
          </span>
        );
      case 'DELIVERED':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800">
            <CheckCircle2 className="w-3 h-3 text-emerald-600" /> Teslim Edildi
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
      {/* Filtre Barı */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        <div>
          <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <ShoppingBag className="w-5 h-5 text-blue-600" />
            Omnichannel Sipariş Karşılama & Sevkiyat Yönetimi
          </h3>
          <p className="text-xs text-slate-500 mt-0.5">
            Pazaryeri ve e-ticaret siparişlerinin stok rezervasyonu, parçalı sevkiyat ve muadil ürün çözümleri
          </p>
        </div>

        <select
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value)}
          className="text-xs rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800 p-2 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
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
          <div className="text-center py-10 text-slate-400 text-xs">
            Kayıtlı sipariş bulunamadı.
          </div>
        ) : (
          filteredOrders.map((ord) => (
            <div
              key={ord.id}
              className="p-4 rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30 hover:bg-slate-50 transition"
            >
              {/* Başlık Satırı */}
              <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-3 pb-3 border-b border-slate-200/60 dark:border-slate-800">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-blue-50 dark:bg-blue-950/60 border border-blue-200 dark:border-blue-800 flex items-center justify-center text-blue-600 font-bold text-xs">
                    {ord.channelCode.slice(0, 3)}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-slate-900 dark:text-white text-sm">
                        {ord.orderNumber}
                      </span>
                      {getStatusBadge(ord.status)}
                      <span className="text-[11px] text-slate-400">
                        {new Date(ord.orderDate).toLocaleDateString('tr-TR')}
                      </span>
                    </div>
                    <div className="text-xs text-slate-500 flex items-center gap-3 mt-0.5">
                      <span className="flex items-center gap-1 font-medium text-slate-700 dark:text-slate-300">
                        <User className="w-3 h-3 text-slate-400" />
                        {ord.customerName}
                      </span>
                      <span className="flex items-center gap-1">
                        <MapPin className="w-3 h-3 text-slate-400" />
                        {ord.customerCity}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Tutar ve Aksiyonlar */}
                <div className="flex items-center gap-3 w-full lg:w-auto justify-end">
                  <div className="text-right">
                    <div className="text-[11px] text-slate-400">Sipariş Tutarı</div>
                    <div className="text-sm font-bold text-indigo-600 dark:text-indigo-400">
                      ₺{Number(ord.totalAmount || 0).toLocaleString('tr-TR')}
                    </div>
                  </div>

                  {ord.status !== 'DELIVERED' && (
                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={() => {
                          setSplitModalOrder(ord);
                          setSelectedLineId(ord.shipmentLines?.[0]?.id || '');
                        }}
                        className="inline-flex items-center gap-1 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold shadow-sm transition active:scale-95"
                      >
                        <Split className="w-3.5 h-3.5" />
                        Parçalı Sevk
                      </button>

                      {ord.status !== 'BACKORDERED' && (
                        <button
                          onClick={() => handleBackorder(ord.id)}
                          className="inline-flex items-center gap-1 px-3 py-1.5 bg-purple-100 hover:bg-purple-200 text-purple-800 dark:bg-purple-950 dark:text-purple-300 rounded-lg text-xs font-semibold transition"
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
              <div className="mt-3 overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="text-slate-400 text-left border-b border-slate-100 dark:border-slate-800">
                      <th className="pb-1.5 font-medium">Ürün / SKU</th>
                      <th className="pb-1.5 font-medium text-right">Sipariş</th>
                      <th className="pb-1.5 font-medium text-right">Sevk Edilen</th>
                      <th className="pb-1.5 font-medium text-right">Kalan</th>
                      <th className="pb-1.5 font-medium text-right">Kargo Takip</th>
                      <th className="pb-1.5 font-medium text-right">Aksiyon</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80">
                    {ord.shipmentLines && ord.shipmentLines.length > 0 ? (
                      ord.shipmentLines.map((line) => {
                        const remaining = Math.max(0, line.quantity - line.shippedQty);
                        return (
                          <tr key={line.id} className="text-slate-700 dark:text-slate-300">
                            <td className="py-2">
                              <div className="font-semibold text-slate-900 dark:text-white">
                                {line.itemName || line.item?.name}
                              </div>
                              <div className="text-[11px] font-mono text-slate-400">
                                {line.sku || line.item?.sku}
                              </div>
                            </td>
                            <td className="py-2 text-right font-medium">
                              {line.quantity} Adet
                            </td>
                            <td className="py-2 text-right font-bold text-emerald-600 dark:text-emerald-400">
                              {line.shippedQty} Adet
                            </td>
                            <td className="py-2 text-right font-bold text-amber-600 dark:text-amber-400">
                              {remaining} Adet
                            </td>
                            <td className="py-2 text-right text-[11px]">
                              {line.carrierTracking ? (
                                <span className="font-mono bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded border border-slate-200 dark:border-slate-700">
                                  {line.carrierTracking}
                                </span>
                              ) : (
                                <span className="text-slate-400 italic">Sevk Bekliyor</span>
                              )}
                            </td>
                            <td className="py-2 text-right">
                              {remaining > 0 && line.itemId && (
                                <button
                                  onClick={() => handleOpenSubstituteModal(ord, line)}
                                  className="inline-flex items-center gap-1 text-[11px] font-semibold text-indigo-600 hover:text-indigo-800 hover:underline"
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
                        <td colSpan={6} className="py-2 text-slate-400 italic text-center">
                          Kalem bilgisi bulunamadı.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Parçalı Sevkiyat Modalı */}
      {splitModalOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl w-full max-w-md p-6 shadow-2xl relative">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Split className="w-4 h-4 text-blue-600" />
                Parçalı Sevkiyat (Split Shipment)
              </h3>
              <button
                onClick={() => setSplitModalOrder(null)}
                className="text-slate-400 hover:text-slate-600 p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSplitShipment} className="mt-4 space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">
                  Sevk Edilecek Kalem *
                </label>
                <select
                  value={selectedLineId}
                  onChange={(e) => setSelectedLineId(e.target.value)}
                  required
                  className="w-full text-xs rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800 p-2.5 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  {splitModalOrder.shipmentLines?.map((l) => (
                    <option key={l.id} value={l.id}>
                      {l.itemName} (Kalan: {l.quantity - l.shippedQty} Adet)
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">
                  Bu Pakette Sevk Edilecek Miktar *
                </label>
                <input
                  type="number"
                  min="1"
                  value={splitQty}
                  onChange={(e) => setSplitQty(e.target.value)}
                  required
                  className="w-full text-xs rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800 p-2.5 text-slate-900 dark:text-white font-bold focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">
                    Kargo Firması
                  </label>
                  <select
                    value={carrierName}
                    onChange={(e) => setCarrierName(e.target.value)}
                    className="w-full text-xs rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800 p-2.5 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="Yurtiçi Kargo VIP">Yurtiçi Kargo</option>
                    <option value="Aras Kargo">Aras Kargo</option>
                    <option value="UPS Express Kurumsal">UPS Express</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">
                    Kargo Takip No
                  </label>
                  <input
                    type="text"
                    value={trackingNo}
                    onChange={(e) => setTrackingNo(e.target.value)}
                    required
                    className="w-full text-xs rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800 p-2.5 text-slate-900 dark:text-white font-mono focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setSplitModalOrder(null)}
                  className="px-4 py-2 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 text-xs font-semibold rounded-xl hover:bg-slate-100 transition"
                >
                  Vazgeç
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-xl transition shadow-sm disabled:opacity-50"
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
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl w-full max-w-lg p-6 shadow-2xl relative">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-indigo-600" />
                Muadil & İkame Ürün Önerisi
              </h3>
              <button
                onClick={() => setSubstituteModalOrder(null)}
                className="text-slate-400 hover:text-slate-600 p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="mt-4 space-y-3">
              <div className="p-3 bg-amber-50 dark:bg-amber-950/40 rounded-xl text-xs text-amber-800 dark:text-amber-300">
                Siparişteki Ürün: <strong>{substituteLine.itemName}</strong> (Miktar: {substituteLine.quantity} Adet)
              </div>

              <div className="text-xs font-semibold text-slate-600 dark:text-slate-400">
                Stokta Bulunan Alternatifler:
              </div>

              {loadingSuggestions ? (
                <div className="text-center py-6 text-slate-400 text-xs">
                  Uygun muadiller taranıyor...
                </div>
              ) : suggestions.length === 0 ? (
                <div className="text-center py-6 text-slate-400 text-xs">
                  Bu ürün için tanımlı veya aynı kategoride stokta muadil bulunamadı.
                </div>
              ) : (
                <div className="space-y-2">
                  {suggestions.map((s) => (
                    <div
                      key={s.id}
                      className="p-3 rounded-xl border border-slate-200 dark:border-slate-800 flex items-center justify-between hover:bg-slate-50 transition text-xs"
                    >
                      <div>
                        <div className="font-semibold text-slate-900 dark:text-white">
                          {s.name}
                        </div>
                        <div className="text-slate-400 text-[11px] font-mono">
                          {s.sku} • Stok: <strong className="text-emerald-600">{s.availableQty} {s.unit}</strong>
                        </div>
                      </div>

                      <div className="flex items-center gap-3">
                        <span className="font-bold text-slate-800 dark:text-slate-200">
                          ₺{s.salesPrice}
                        </span>
                        <button
                          onClick={() => handleApplySubstitute(s.id)}
                          disabled={submitting}
                          className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-semibold shadow-sm transition active:scale-95 disabled:opacity-50"
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

