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
          <span className="inline-flex items-center gap-1 rounded-full px-3 py-0.5 text-xs font-semibold bg-white/10 text-white/70 border border-white/15">
            <Clock className="w-3 h-3 text-white/50" /> Taslak
          </span>
        );
      case 'APPROVED':
        return (
          <span className="inline-flex items-center gap-1 rounded-full px-3 py-0.5 text-xs font-semibold bg-sky-500/15 text-sky-300 border border-sky-500/30">
            <Clock className="w-3 h-3 text-sky-400" /> Sevkiyat Bekliyor
          </span>
        );
      case 'IN_TRANSIT':
        return (
          <span className="inline-flex items-center gap-1 rounded-full px-3 py-0.5 text-xs font-semibold bg-amber-500/15 text-amber-300 border border-amber-500/30 animate-pulse">
            <Truck className="w-3 h-3 text-amber-400" /> Yolda / Sevkiyatta
          </span>
        );
      case 'RECEIVED':
        return (
          <span className="inline-flex items-center gap-1 rounded-full px-3 py-0.5 text-xs font-semibold bg-emerald-500/15 text-emerald-300 border border-emerald-500/30">
            <CheckCircle2 className="w-3 h-3 text-emerald-400" /> Teslim Alındı
          </span>
        );
      case 'CANCELLED':
        return (
          <span className="inline-flex items-center gap-1 rounded-full px-3 py-0.5 text-xs font-semibold bg-rose-500/15 text-rose-300 border border-rose-500/30">
            <AlertCircle className="w-3 h-3 text-rose-400" /> İptal
          </span>
        );
    }
  };

  return (
    <div className="space-y-6">
      {/* Header bar */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 glass-panel p-5 rounded-2xl">
        <div>
          <h3 className="text-lg font-bold text-white flex items-center gap-2">
            <Truck className="w-5 h-5 text-indigo-400" />
            Depolar Arası Transferler (İç Sevkiyat)
          </h3>
          <p className="text-xs text-white/60 mt-1">
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
          className="inline-flex items-center gap-2 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-semibold rounded-xl shadow-lg shadow-indigo-500/25 transition active:scale-95"
        >
          <Plus className="w-4 h-4" />
          Yeni Transfer Emri
        </button>
      </div>

      {/* Transfer Orders List */}
      <div className="space-y-4">
        {transfers.length === 0 ? (
          <div className="text-center py-12 glass-card rounded-2xl">
            <Truck className="w-12 h-12 text-white/25 mx-auto mb-3" />
            <h4 className="text-base font-semibold text-white">
              Kayıtlı Depo Transfer Emri Yok
            </h4>
            <p className="text-xs text-white/50 mt-1 max-w-md mx-auto">
              Depolarınız arasında ürün sevk etmek için yukarıdaki &quot;Yeni Transfer Emri&quot; butonuna tıklayın.
            </p>
          </div>
        ) : (
          transfers.map((tr) => (
            <div
              key={tr.id}
              className="glass-card rounded-2xl p-6 space-y-4"
            >
              <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4 pb-4 border-b border-white/10">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-indigo-500/15 border border-indigo-500/30 flex items-center justify-center text-indigo-400">
                    <FileText className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2.5">
                      <span className="text-base font-bold text-white">
                        {tr.orderNumber}
                      </span>
                      {getStatusBadge(tr.status)}
                    </div>
                    <span className="text-xs text-white/50">
                      Tarih: {new Date(tr.createdAt).toLocaleDateString('tr-TR')}
                    </span>
                  </div>
                </div>

                {/* Warehouse Route */}
                <div className="flex items-center gap-3 bg-black/25 px-4 py-2 rounded-xl text-sm border border-white/10">
                  <div className="text-right">
                    <div className="text-[11px] text-white/45">Çıkış Deposu</div>
                    <div className="font-semibold text-white">
                      {tr.fromWarehouse?.name || 'Kaynak Depo'}
                    </div>
                  </div>
                  <ArrowRight className="w-4 h-4 text-indigo-400" />
                  <div>
                    <div className="text-[11px] text-white/45">Hedef Depo</div>
                    <div className="font-semibold text-white">
                      {tr.toWarehouse?.name || 'Hedef Depo'}
                    </div>
                  </div>
                </div>

                {/* Driver / Plate */}
                {(tr.vehiclePlate || tr.driverName) && (
                  <div className="flex items-center gap-4 text-xs text-white/70">
                    {tr.vehiclePlate && (
                      <span className="px-2.5 py-1 bg-white/10 font-mono font-bold rounded-lg border border-white/15 text-white">
                        {tr.vehiclePlate}
                      </span>
                    )}
                    {tr.driverName && (
                      <span className="flex items-center gap-1.5">
                        <User className="w-3.5 h-3.5 text-white/45" />
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
                      className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-amber-600 hover:bg-amber-500 text-white text-xs font-semibold rounded-xl shadow-lg shadow-amber-500/20 transition active:scale-95 disabled:opacity-50"
                    >
                      <Send className="w-3.5 h-3.5" />
                      Sevk Et (Yola Çıkar)
                    </button>
                  )}

                  {tr.status === 'IN_TRANSIT' && (
                    <button
                      disabled={submitting}
                      onClick={() => handleAdvanceStatus(tr.id, 'RECEIVED')}
                      className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold rounded-xl shadow-lg shadow-emerald-500/20 transition active:scale-95 disabled:opacity-50"
                    >
                      <PackageCheck className="w-3.5 h-3.5" />
                      Teslim Al (Depoya Gir)
                    </button>
                  )}

                  {tr.status === 'RECEIVED' && (
                    <span className="text-xs text-emerald-400 font-medium flex items-center gap-1">
                      <CheckCircle2 className="w-4 h-4" />
                      Depoya İşlendi
                    </span>
                  )}
                </div>
              </div>

              {/* Items Line Table */}
              <div>
                <div className="text-xs font-semibold text-white/50 uppercase tracking-wider mb-2.5">
                  Transfer Edilen Ürünler
                </div>
                <div className="glass-table-container overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="w-full text-xs">
                      <thead>
                        <tr className="text-left text-white/50 bg-white/[0.03] border-b border-white/10">
                          <th className="py-2.5 px-4">Ürün Adı</th>
                          <th className="py-2.5 px-3">SKU</th>
                          <th className="py-2.5 px-3 text-right">Talep Miktarı</th>
                          <th className="py-2.5 px-3 text-right">Sevk Miktarı</th>
                          <th className="py-2.5 px-4 text-right">Teslim Alınan</th>
                        </tr>
                      </thead>
                      <tbody>
                        {tr.lines && tr.lines.length > 0 ? (
                          tr.lines.map((line) => (
                            <tr key={line.id} className="border-b border-white/5 hover:bg-white/[0.04] transition-colors text-white/80">
                              <td className="py-2.5 px-4 font-medium text-white">
                                {line.item?.name || 'Ürün'}
                              </td>
                              <td className="py-2.5 px-3 font-mono text-white/50">
                                {line.item?.sku || '-'}
                              </td>
                              <td className="py-2.5 px-3 text-right font-semibold text-white">
                                {line.requestedQty} {line.unit || line.item?.unit || 'Adet'}
                              </td>
                              <td className="py-2.5 px-3 text-right font-semibold text-amber-400">
                                {line.shippedQty || line.requestedQty} {line.unit || line.item?.unit || 'Adet'}
                              </td>
                              <td className="py-2.5 px-4 text-right font-semibold text-emerald-400">
                                {tr.status === 'RECEIVED'
                                  ? line.shippedQty || line.requestedQty
                                  : line.receivedQty || 0}{' '}
                                {line.unit || line.item?.unit || 'Adet'}
                              </td>
                            </tr>
                          ))
                        ) : (
                          <tr>
                            <td colSpan={5} className="py-3 px-4 text-white/40 italic">
                              Kalem bilgisi bulunamadı.
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* New Transfer Modal */}
      {isNewModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in">
          <div className="backdrop-blur-xl bg-slate-950/85 border border-white/15 rounded-2xl w-full max-w-xl p-6 shadow-2xl relative text-white">
            <div className="flex items-center justify-between pb-4 border-b border-white/10">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <Truck className="w-5 h-5 text-indigo-400" />
                Yeni Depo Transfer Emri
              </h3>
              <button
                type="button"
                onClick={() => setIsNewModalOpen(false)}
                className="text-white/50 hover:text-white text-xl font-bold leading-none p-1"
              >
                &times;
              </button>
            </div>

            <form onSubmit={handleCreateTransfer} className="mt-4 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-white/70 mb-1.5">
                    Kaynak Depo (Çıkış) *
                  </label>
                  <select
                    value={fromWhId}
                    onChange={(e) => setFromWhId(e.target.value)}
                    required
                    className="w-full text-xs glass-input p-2.5 focus:outline-none"
                  >
                    <option value="" className="bg-slate-900 text-white">Seçiniz...</option>
                    {warehouses.map((wh) => (
                      <option key={wh.id} value={wh.id} className="bg-slate-900 text-white">
                        {wh.name} ({wh.code})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-white/70 mb-1.5">
                    Hedef Depo (Varış) *
                  </label>
                  <select
                    value={toWhId}
                    onChange={(e) => setToWhId(e.target.value)}
                    required
                    className="w-full text-xs glass-input p-2.5 focus:outline-none"
                  >
                    <option value="" className="bg-slate-900 text-white">Seçiniz...</option>
                    {warehouses
                      .filter((wh) => wh.id !== fromWhId)
                      .map((wh) => (
                        <option key={wh.id} value={wh.id} className="bg-slate-900 text-white">
                          {wh.name} ({wh.code})
                        </option>
                      ))}
                  </select>
                </div>
              </div>

              {/* Item selection */}
              <div className="grid grid-cols-3 gap-4">
                <div className="col-span-2">
                  <label className="block text-xs font-semibold text-white/70 mb-1.5">
                    Transfer Edilecek Ürün *
                  </label>
                  <select
                    value={selectedItemId}
                    onChange={(e) => setSelectedItemId(e.target.value)}
                    required
                    className="w-full text-xs glass-input p-2.5 focus:outline-none"
                  >
                    <option value="" className="bg-slate-900 text-white">Ürün Seçiniz...</option>
                    {items.map((it) => (
                      <option key={it.id} value={it.id} className="bg-slate-900 text-white">
                        {it.name} ({it.sku})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-white/70 mb-1.5">
                    Miktar *
                  </label>
                  <input
                    type="number"
                    min="1"
                    step="1"
                    value={quantity}
                    onChange={(e) => setQuantity(e.target.value)}
                    required
                    className="w-full text-xs glass-input p-2.5 focus:outline-none font-bold"
                  />
                </div>
              </div>

              {/* Logistics Details */}
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-white/70 mb-1.5">
                    Araç Plakası
                  </label>
                  <input
                    type="text"
                    value={vehiclePlate}
                    onChange={(e) => setVehiclePlate(e.target.value)}
                    className="w-full text-xs glass-input p-2.5 focus:outline-none font-mono"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-white/70 mb-1.5">
                    Sürücü / Kurye
                  </label>
                  <input
                    type="text"
                    value={driverName}
                    onChange={(e) => setDriverName(e.target.value)}
                    className="w-full text-xs glass-input p-2.5 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-white/70 mb-1.5">
                    İletişim Tel
                  </label>
                  <input
                    type="text"
                    value={driverPhone}
                    onChange={(e) => setDriverPhone(e.target.value)}
                    className="w-full text-xs glass-input p-2.5 focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-white/70 mb-1.5">
                  Sevkiyat Notu
                </label>
                <input
                  type="text"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Örn: Saat 15:00'e kadar teslim edilmeli"
                  className="w-full text-xs glass-input p-2.5 focus:outline-none"
                />
              </div>

              <div className="pt-3 border-t border-white/10 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsNewModalOpen(false)}
                  className="px-4 py-2 border border-white/15 bg-white/5 text-white/80 text-xs font-semibold rounded-xl hover:bg-white/10 transition"
                >
                  Vazgeç
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold rounded-xl transition shadow-lg shadow-indigo-500/20 disabled:opacity-50"
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
