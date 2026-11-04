'use client';

import React, { useState } from 'react';
import {
  Truck,
  ArrowRight,
  CheckCircle2,
  Clock,
  MapPin,
  Plus,
  Send,
  PackageCheck,
  AlertCircle,
  FileText,
  User,
  Phone
} from 'lucide-react';
import { toast } from 'sonner';

interface TransferLine {
  id: string;
  itemId: string;
  item?: {
    name: string;
    sku: string;
    unit?: string;
  };
  requestedQty: number;
  shippedQty: number;
  receivedQty: number;
  unit?: string;
}

interface TransferOrder {
  id: string;
  orderNumber: string;
  fromWarehouseId: string;
  toWarehouseId: string;
  fromWarehouse?: { name: string; code: string };
  toWarehouse?: { name: string; code: string };
  status: 'DRAFT' | 'APPROVED' | 'IN_TRANSIT' | 'RECEIVED' | 'CANCELLED';
  vehiclePlate?: string | null;
  driverName?: string | null;
  driverPhone?: string | null;
  notes?: string | null;
  dispatchDate?: string | null;
  receivedDate?: string | null;
  createdAt: string;
  lines?: TransferLine[];
}

interface Warehouse {
  id: string;
  name: string;
  code: string;
}

interface InventoryItemOption {
  id: string;
  name: string;
  sku: string;
  unit: string;
}

interface Props {
  transfers: TransferOrder[];
  warehouses: Warehouse[];
  items?: InventoryItemOption[];
  onRefresh: () => void;
}

export function InterWarehouseTransfers({
  transfers,
  warehouses,
  items = [],
  onRefresh
}: Props) {
  const [isNewModalOpen, setIsNewModalOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // New transfer form state
  const [fromWhId, setFromWhId] = useState('');
  const [toWhId, setToWhId] = useState('');
  const [selectedItemId, setSelectedItemId] = useState('');
  const [quantity, setQuantity] = useState('10');
  const [vehiclePlate, setVehiclePlate] = useState('34 ER 1024');
  const [driverName, setDriverName] = useState('Ahmet Demir');
  const [driverPhone, setDriverPhone] = useState('0532 555 44 33');
  const [notes, setNotes] = useState('Acil sevkiyat');

  const handleAdvanceStatus = async (
    transferId: string,
    newStatus: 'IN_TRANSIT' | 'RECEIVED'
  ) => {
    try {
      setSubmitting(true);
      const res = await fetch('/api/wms', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'advance_transfer',
          transferId,
          newStatus
        })
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Transfer durumu güncellenemedi');
      }

      if (newStatus === 'IN_TRANSIT') {
        toast.success(
          'Transfer sevk edildi. Kaynak depodan stok çıkışı yapıldı.'
        );
      } else if (newStatus === 'RECEIVED') {
        toast.success(
          'Transfer teslim alındı! Hedef depoya stok girişi tamamlandı.'
        );
      }

      onRefresh();
    } catch (err: any) {
      toast.error(err.message || 'İşlem başarısız');
    } finally {
      setSubmitting(false);
    }
  };

  const handleCreateTransfer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fromWhId || !toWhId) {
      toast.error('Lütfen kaynak ve hedef depoları seçin');
      return;
    }
    if (fromWhId === toWhId) {
      toast.error('Kaynak ve hedef depo aynı olamaz');
      return;
    }
    if (!selectedItemId) {
      toast.error('Lütfen transfer edilecek ürünü seçin');
      return;
    }

    try {
      setSubmitting(true);
      const res = await fetch('/api/wms', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'create_transfer',
          fromWarehouseId: fromWhId,
          toWarehouseId: toWhId,
          vehiclePlate,
          driverName,
          driverPhone,
          notes,
          items: [
            {
              itemId: selectedItemId,
              quantity: parseFloat(quantity) || 1
            }
          ]
        })
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Transfer emri oluşturulamadı');
      }

      toast.success(
        `Transfer emri oluşturuldu: ${data.data?.orderNumber || ''}`
      );
      setIsNewModalOpen(false);
      onRefresh();
    } catch (err: any) {
      toast.error(err.message || 'Kayıt başarısız');
    } finally {
      setSubmitting(false);
    }
  };

  const getStatusBadge = (status: TransferOrder['status']) => {
    switch (status) {
      case 'DRAFT':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-gray-100 text-gray-700">
            <Clock className="w-3 h-3 text-gray-500" /> Taslak
          </span>
        );
      case 'APPROVED':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-100 text-blue-700">
            <Clock className="w-3 h-3 text-blue-500" /> Sevkiyat Bekliyor
          </span>
        );
      case 'IN_TRANSIT':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-100 text-amber-800 animate-pulse">
            <Truck className="w-3 h-3 text-amber-600" /> Yolda / Sevkiyatta
          </span>
        );
      case 'RECEIVED':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800">
            <CheckCircle2 className="w-3 h-3 text-emerald-600" /> Teslim Alındı
          </span>
        );
      case 'CANCELLED':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-rose-100 text-rose-700">
            <AlertCircle className="w-3 h-3 text-rose-500" /> İptal
          </span>
        );
    }
  };

  return (
    <div className="space-y-6">
      {/* Header bar */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
        <div>
          <h3 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <Truck className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
            Depolar Arası Transferler (İç Sevkiyat)
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Merkez depo, şubeler ve mağazalar arası stok sevk hareketleri ve nakliye takip ekranı
          </p>
        </div>

        <button
          onClick={() => {
            if (warehouses.length >= 2) {
              setFromWhId(warehouses[0].id);
              setToWhId(warehouses[1].id);
            }
            if (items.length > 0) {
              setSelectedItemId(items[0].id);
            }
            setIsNewModalOpen(true);
          }}
          className="inline-flex items-center gap-2 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold rounded-xl shadow-sm transition active:scale-95"
        >
          <Plus className="w-4 h-4" />
          Yeni Transfer Emri
        </button>
      </div>

      {/* Transfer Orders List */}
      <div className="space-y-4">
        {transfers.length === 0 ? (
          <div className="text-center py-12 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800">
            <Truck className="w-12 h-12 text-slate-300 dark:text-slate-700 mx-auto mb-3" />
            <h4 className="text-base font-semibold text-slate-800 dark:text-slate-200">
              Kayıtlı Depo Transfer Emri Yok
            </h4>
            <p className="text-xs text-slate-500 mt-1 max-w-md mx-auto">
              Depolarınız arasında ürün sevk etmek için yukarıdaki &quot;Yeni Transfer Emri&quot; butonuna tıklayın.
            </p>
          </div>
        ) : (
          transfers.map((tr) => (
            <div
              key={tr.id}
              className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5 shadow-sm hover:shadow transition"
            >
              <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4 pb-4 border-b border-slate-100 dark:border-slate-800">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-200 dark:border-indigo-800 flex items-center justify-center text-indigo-600 dark:text-indigo-400">
                    <FileText className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-base font-bold text-slate-900 dark:text-white">
                        {tr.orderNumber}
                      </span>
                      {getStatusBadge(tr.status)}
                    </div>
                    <span className="text-xs text-slate-500">
                      Tarih: {new Date(tr.createdAt).toLocaleDateString('tr-TR')}
                    </span>
                  </div>
                </div>

                {/* Warehouse Route */}
                <div className="flex items-center gap-3 bg-slate-50 dark:bg-slate-800/60 px-4 py-2 rounded-xl text-sm border border-slate-200/60 dark:border-slate-700/60">
                  <div className="text-right">
                    <div className="text-xs text-slate-400">Çıkış Deposu</div>
                    <div className="font-semibold text-slate-800 dark:text-slate-200">
                      {tr.fromWarehouse?.name || 'Kaynak Depo'}
                    </div>
                  </div>
                  <ArrowRight className="w-4 h-4 text-slate-400" />
                  <div>
                    <div className="text-xs text-slate-400">Hedef Depo</div>
                    <div className="font-semibold text-slate-800 dark:text-slate-200">
                      {tr.toWarehouse?.name || 'Hedef Depo'}
                    </div>
                  </div>
                </div>

                {/* Driver / Plate */}
                {(tr.vehiclePlate || tr.driverName) && (
                  <div className="flex items-center gap-4 text-xs text-slate-600 dark:text-slate-400">
                    {tr.vehiclePlate && (
                      <span className="px-2 py-1 bg-slate-100 dark:bg-slate-800 font-mono font-bold rounded border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-slate-100">
                        {tr.vehiclePlate}
                      </span>
                    )}
                    {tr.driverName && (
                      <span className="flex items-center gap-1">
                        <User className="w-3.5 h-3.5 text-slate-400" />
                        {tr.driverName}
                      </span>
                    )}
                  </div>
                )}

                {/* Action Buttons */}
                <div className="flex items-center gap-2 w-full lg:w-auto justify-end">
                  {tr.status === 'APPROVED' && (
                    <button
                      disabled={submitting}
                      onClick={() => handleAdvanceStatus(tr.id, 'IN_TRANSIT')}
                      className="inline-flex items-center gap-1.5 px-3 py-2 bg-amber-600 hover:bg-amber-700 text-white text-xs font-semibold rounded-lg shadow-sm transition active:scale-95 disabled:opacity-50"
                    >
                      <Send className="w-3.5 h-3.5" />
                      Sevk Et (Yola Çıkar)
                    </button>
                  )}

                  {tr.status === 'IN_TRANSIT' && (
                    <button
                      disabled={submitting}
                      onClick={() => handleAdvanceStatus(tr.id, 'RECEIVED')}
                      className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold rounded-lg shadow-sm transition active:scale-95 disabled:opacity-50"
                    >
                      <PackageCheck className="w-3.5 h-3.5" />
                      Teslim Al (Depoya Gir)
                    </button>
                  )}

                  {tr.status === 'RECEIVED' && (
                    <span className="text-xs text-emerald-600 dark:text-emerald-400 font-medium flex items-center gap-1">
                      <CheckCircle2 className="w-4 h-4" />
                      Depoya İşlendi
                    </span>
                  )}
                </div>
              </div>

              {/* Items Line Table */}
              <div className="mt-3 pt-2">
                <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">
                  Transfer Edilen Ürünler
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="text-left text-slate-400 border-b border-slate-100 dark:border-slate-800">
                        <th className="pb-2">Ürün Adı</th>
                        <th className="pb-2">SKU</th>
                        <th className="pb-2 text-right">Talep Miktarı</th>
                        <th className="pb-2 text-right">Sevk Miktarı</th>
                        <th className="pb-2 text-right">Teslim Alınan</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                      {tr.lines && tr.lines.length > 0 ? (
                        tr.lines.map((line) => (
                          <tr key={line.id} className="text-slate-700 dark:text-slate-300">
                            <td className="py-2 font-medium text-slate-900 dark:text-white">
                              {line.item?.name || 'Ürün'}
                            </td>
                            <td className="py-2 font-mono text-slate-500">
                              {line.item?.sku || '-'}
                            </td>
                            <td className="py-2 text-right font-semibold">
                              {line.requestedQty} {line.unit || line.item?.unit || 'Adet'}
                            </td>
                            <td className="py-2 text-right font-semibold text-amber-600 dark:text-amber-400">
                              {line.shippedQty || line.requestedQty} {line.unit || line.item?.unit || 'Adet'}
                            </td>
                            <td className="py-2 text-right font-semibold text-emerald-600 dark:text-emerald-400">
                              {tr.status === 'RECEIVED'
                                ? line.shippedQty || line.requestedQty
                                : line.receivedQty || 0}{' '}
                              {line.unit || line.item?.unit || 'Adet'}
                            </td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td colSpan={5} className="py-2 text-slate-400 italic">
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

      {/* New Transfer Modal */}
      {isNewModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl w-full max-w-xl p-6 shadow-2xl relative">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-800">
              <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Truck className="w-5 h-5 text-indigo-600" />
                Yeni Depo Transfer Emri
              </h3>
              <button
                type="button"
                onClick={() => setIsNewModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 text-xl font-bold leading-none p-1"
              >
                &times;
              </button>
            </div>

            <form onSubmit={handleCreateTransfer} className="mt-4 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">
                    Kaynak Depo (Çıkış) *
                  </label>
                  <select
                    value={fromWhId}
                    onChange={(e) => setFromWhId(e.target.value)}
                    required
                    className="w-full text-xs rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800 p-2.5 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  >
                    <option value="">Seçiniz...</option>
                    {warehouses.map((wh) => (
                      <option key={wh.id} value={wh.id}>
                        {wh.name} ({wh.code})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">
                    Hedef Depo (Varış) *
                  </label>
                  <select
                    value={toWhId}
                    onChange={(e) => setToWhId(e.target.value)}
                    required
                    className="w-full text-xs rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800 p-2.5 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  >
                    <option value="">Seçiniz...</option>
                    {warehouses
                      .filter((wh) => wh.id !== fromWhId)
                      .map((wh) => (
                        <option key={wh.id} value={wh.id}>
                          {wh.name} ({wh.code})
                        </option>
                      ))}
                  </select>
                </div>
              </div>

              {/* Item selection */}
              <div className="grid grid-cols-3 gap-4">
                <div className="col-span-2">
                  <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">
                    Transfer Edilecek Ürün *
                  </label>
                  <select
                    value={selectedItemId}
                    onChange={(e) => setSelectedItemId(e.target.value)}
                    required
                    className="w-full text-xs rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800 p-2.5 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  >
                    <option value="">Ürün Seçiniz...</option>
                    {items.map((it) => (
                      <option key={it.id} value={it.id}>
                        {it.name} ({it.sku})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">
                    Miktar *
                  </label>
                  <input
                    type="number"
                    min="1"
                    step="1"
                    value={quantity}
                    onChange={(e) => setQuantity(e.target.value)}
                    required
                    className="w-full text-xs rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800 p-2.5 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 font-bold"
                  />
                </div>
              </div>

              {/* Logistics Details */}
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">
                    Araç Plakası
                  </label>
                  <input
                    type="text"
                    value={vehiclePlate}
                    onChange={(e) => setVehiclePlate(e.target.value)}
                    className="w-full text-xs rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800 p-2.5 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 font-mono"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">
                    Sürücü / Kurye
                  </label>
                  <input
                    type="text"
                    value={driverName}
                    onChange={(e) => setDriverName(e.target.value)}
                    className="w-full text-xs rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800 p-2.5 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">
                    İletişim Tel
                  </label>
                  <input
                    type="text"
                    value={driverPhone}
                    onChange={(e) => setDriverPhone(e.target.value)}
                    className="w-full text-xs rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800 p-2.5 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">
                  Sevkiyat Notu
                </label>
                <input
                  type="text"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Örn: Saat 15:00'e kadar teslim edilmeli"
                  className="w-full text-xs rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800 p-2.5 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsNewModalOpen(false)}
                  className="px-4 py-2 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 text-xs font-semibold rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition"
                >
                  Vazgeç
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold rounded-xl transition shadow-sm disabled:opacity-50"
                >
                  {submitting ? 'Kaydediliyor...' : 'Transfer Emrini Oluştur'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

