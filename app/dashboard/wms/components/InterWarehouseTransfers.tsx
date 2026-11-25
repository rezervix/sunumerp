'use client';

import React, { useState } from 'react';
import {
  Truck,
  ArrowRight,
  CheckCircle2,
  Clock,
  Plus,
  Send,
  PackageCheck,
  AlertCircle,
  FileText,
  User
} from 'lucide-react';
import { toast } from 'sonner';
import { FleetPickerSelect } from '@/components/logistics/FleetPickerSelect';
import { safeNumber, safeText } from '@/lib/utils/safe-display';

interface TransferLine {
  id: string;
  itemId: string;
  itemName?: string;
  item?: {
    name: string;
    sku: string;
    unit?: string;
  };
  requestedQty: number;
  shippedQty: number;
  inTransitQty?: number;
  receivedQty: number;
  discrepancyReason?: string | null;
  unit?: string;
}

interface TransferOrder {
  id: string;
  orderNumber?: string;
  transferNumber?: string;
  fromWarehouseId: string;
  toWarehouseId: string;
  fromWarehouse?: { name: string; code: string };
  toWarehouse?: { name: string; code: string };
  status: 'DRAFT' | 'APPROVED' | 'IN_TRANSIT' | 'DISCREPANCY' | 'RECEIVED' | 'CANCELLED';
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
  bins?: any[];
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

  // Kısmi / Farklı Teslim Alma Modalı
  const [discrepancyModalTransfer, setDiscrepancyModalTransfer] = useState<TransferOrder | null>(null);
  const [discrepancyQtys, setDiscrepancyQtys] = useState<Record<string, string>>({});
  const [discrepancyReasons, setDiscrepancyReasons] = useState<Record<string, string>>({});

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
    newStatus: 'APPROVED' | 'IN_TRANSIT' | 'RECEIVED',
    receivedLines?: Array<{ lineId: string; receivedQty: number; discrepancyReason?: string }>
  ) => {
    try {
      setSubmitting(true);
      const res = await fetch('/api/wms', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'advance_transfer',
          transferId,
          newStatus,
          receivedLines,
        })
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Transfer durumu güncellenemedi');
      }

      if (newStatus === 'APPROVED') {
        toast.success('Transfer emri onaylandı. Sevke hazır.');
      } else if (newStatus === 'IN_TRANSIT') {
        toast.success(
          'Transfer sevk edildi. Kaynak depodan düşüldü, yolda stoğuna (In-Transit) alındı.'
        );
      } else if (data.transfer?.status === 'DISCREPANCY') {
        toast.warning('Farklı / eksik teslimat kaydedildi. Durum: FARKLI TESLİMAT (DISCREPANCY).');
      } else if (newStatus === 'RECEIVED') {
        toast.success(
          'Transfer tam olarak teslim alındı! Hedef depoya stok girişi tamamlandı.'
        );
      }

      setDiscrepancyModalTransfer(null);
      onRefresh();
    } catch (err: any) {
      toast.error(err.message || 'İşlem başarısız');
    } finally {
      setSubmitting(false);
    }
  };

  const openDiscrepancyModal = (tr: TransferOrder) => {
    const initialQtys: Record<string, string> = {};
    const initialReasons: Record<string, string> = {};
    for (const ln of tr.lines || []) {
      initialQtys[ln.id] = String(ln.shippedQty || ln.requestedQty || 0);
      initialReasons[ln.id] = ln.discrepancyReason || '';
    }
    setDiscrepancyQtys(initialQtys);
    setDiscrepancyReasons(initialReasons);
    setDiscrepancyModalTransfer(tr);
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
          <span className="inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium bg-[--page] text-[--text-muted] border border-[--line]">
            <Clock className="w-3 h-3 text-[--text-muted]" /> Taslak
          </span>
        );
      case 'APPROVED':
        return (
          <span className="inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium bg-[--brand-soft] text-[--brand] border border-[--brand-line]">
            <Clock className="w-3 h-3 text-[--brand]" /> Onaylı
          </span>
        );
      case 'IN_TRANSIT':
        return (
          <span className="inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold bg-[--warn-soft] text-[--warn] border border-[--warn-fill]/20">
            <Truck className="w-3 h-3 text-[--warn]" /> Yolda / Sevkiyatta
          </span>
        );
      case 'DISCREPANCY':
        return (
          <span className="inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold bg-[--bad-soft] text-[--bad] border border-[--bad-fill]/20">
            <AlertCircle className="w-3 h-3 text-[--bad]" /> Farklı Teslimat
          </span>
        );
      case 'RECEIVED':
        return (
          <span className="inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium bg-[--ok-soft] text-[--ok] border border-[--ok-fill]/20">
            <CheckCircle2 className="w-3 h-3 text-[--ok]" /> Teslim Alındı
          </span>
        );
      case 'CANCELLED':
        return (
          <span className="inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium bg-[--bad-soft] text-[--bad] border border-[--bad-fill]/20">
            <AlertCircle className="w-3 h-3 text-[--bad]" /> İptal
          </span>
        );
    }
  };

  return (
    <div className="space-y-6">
      {/* Header bar */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-white/80 backdrop-blur-xl border border-[--line] p-5 rounded-2xl shadow-sm">
        <div>
          <h3 className="text-base font-semibold text-[--text] flex items-center gap-2">
            <Truck className="w-4 h-4 text-[--brand]" />
            Depolar Arası Transferler (İç Sevkiyat)
          </h3>
          <p className="text-xs text-[--text-muted] mt-0.5">
            Merkez depo, şubeler ve mağazalar arası stok sevk hareketleri ve nakliye takip ekranı
          </p>
        </div>

        <button
          type="button"
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
          className="inline-flex items-center gap-2 px-4 py-2 bg-[--brand] hover:bg-[--brand-hover] text-white text-xs font-semibold rounded-full shadow-sm transition active:scale-95 cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          Yeni Transfer Emri
        </button>
      </div>

      {/* Transfer Orders List */}
      <div className="space-y-4">
        {transfers.length === 0 ? (
          <div className="text-center py-12 bg-white border border-[--line] rounded-2xl shadow-sm">
            <Truck className="w-10 h-10 text-[--text-muted] mx-auto mb-2.5 opacity-40" />
            <h4 className="text-sm font-semibold text-[--text]">
              Kayıtlı Depo Transfer Emri Yok
            </h4>
            <p className="text-xs text-[--text-muted] mt-1 max-w-md mx-auto">
              Depolarınız arasında ürün sevk etmek için yukarıdaki &quot;Yeni Transfer Emri&quot; butonuna tıklayın.
            </p>
          </div>
        ) : (
          transfers.map((tr) => (
            <div
              key={tr.id}
              className="bg-white border border-[--line] rounded-2xl p-6 space-y-4 shadow-sm"
            >
              <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4 pb-4 border-b border-[--line]">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-[--brand-soft] border border-[--brand-line] flex items-center justify-center text-[--brand]">
                    <FileText className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2.5">
                      <span className="text-base font-semibold text-[--text]">
                        {tr.orderNumber || tr.transferNumber}
                      </span>
                      {getStatusBadge(tr.status)}
                    </div>
                    <span className="text-xs text-[--text-muted]">
                      Tarih: {new Date(tr.createdAt).toLocaleDateString('tr-TR')}
                    </span>
                  </div>
                </div>

                {/* Warehouse Route */}
                <div className="flex items-center gap-3 bg-[--page] px-4 py-2 rounded-xl text-xs border border-[--line]">
                  <div className="text-right">
                    <div className="text-[10px] text-[--text-muted]">Çıkış Deposu</div>
                    <div className="font-semibold text-[--text]">
                      {tr.fromWarehouse?.name || 'Kaynak Depo'}
                    </div>
                  </div>
                  <ArrowRight className="w-3.5 h-3.5 text-[--text-muted]" />
                  <div>
                    <div className="text-[10px] text-[--text-muted]">Hedef Depo</div>
                    <div className="font-semibold text-[--text]">
                      {tr.toWarehouse?.name || 'Hedef Depo'}
                    </div>
                  </div>
                </div>

                {/* Driver / Plate */}
                {(tr.vehiclePlate || tr.driverName) && (
                  <div className="flex items-center gap-3 text-xs text-[--text-muted]">
                    {tr.vehiclePlate && (
                      <span className="px-2.5 py-1 bg-[--page] font-mono font-semibold rounded-lg border border-[--line] text-[--text]">
                        {tr.vehiclePlate}
                      </span>
                    )}
                    {tr.driverName && (
                      <span className="flex items-center gap-1.5">
                        <User className="w-3.5 h-3.5 text-[--text-muted]" />
                        {tr.driverName}
                      </span>
                    )}
                  </div>
                )}

                {/* Action Buttons */}
                <div className="flex flex-wrap items-center gap-2 w-full lg:w-auto justify-end">
                  {tr.status === 'DRAFT' && (
                    <button
                      type="button"
                      disabled={submitting}
                      onClick={() => handleAdvanceStatus(tr.id, 'APPROVED')}
                      className="inline-flex items-center gap-1.5 px-4 py-2 bg-white hover:bg-[--muted-bg] border border-[--line] text-[--text-2] text-xs font-medium rounded-full transition active:scale-95 disabled:opacity-50 cursor-pointer"
                    >
                      <CheckCircle2 className="w-3.5 h-3.5 text-[--brand]" />
                      Onayla
                    </button>
                  )}

                  {tr.status === 'APPROVED' && (
                    <button
                      type="button"
                      disabled={submitting}
                      onClick={() => handleAdvanceStatus(tr.id, 'IN_TRANSIT')}
                      className="inline-flex items-center gap-1.5 px-4 py-2 bg-[--warn-soft] hover:bg-[--warn-soft]/80 border border-[--warn-fill]/30 text-[--warn] text-xs font-semibold rounded-full transition active:scale-95 disabled:opacity-50 cursor-pointer"
                    >
                      <Send className="w-3.5 h-3.5" />
                      Sevk Et (Yola Çıkar)
                    </button>
                  )}

                  {tr.status === 'IN_TRANSIT' && (
                    <>
                      <button
                        type="button"
                        disabled={submitting}
                        onClick={() => openDiscrepancyModal(tr)}
                        className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-[--bad-soft] hover:bg-[--bad-soft]/80 border border-[--bad-fill]/30 text-[--bad] text-xs font-semibold rounded-full transition active:scale-95 disabled:opacity-50 cursor-pointer"
                      >
                        <AlertCircle className="w-3.5 h-3.5" />
                        Farklı / Eksik Teslim Al
                      </button>
                      <button
                        type="button"
                        disabled={submitting}
                        onClick={() => handleAdvanceStatus(tr.id, 'RECEIVED')}
                        className="inline-flex items-center gap-1.5 px-4 py-2 bg-[--brand] hover:bg-[--brand-hover] text-white text-xs font-semibold rounded-full shadow-sm transition active:scale-95 disabled:opacity-50 cursor-pointer"
                      >
                        <PackageCheck className="w-3.5 h-3.5" />
                        Tam Teslim Al
                      </button>
                    </>
                  )}

                  {tr.status === 'DISCREPANCY' && (
                    <span className="text-xs text-[--bad] font-semibold flex items-center gap-1">
                      <AlertCircle className="w-4 h-4" />
                      Eksik / Farklı Teslimat Kaydedildi
                    </span>
                  )}

                  {tr.status === 'RECEIVED' && (
                    <span className="text-xs text-[--ok] font-semibold flex items-center gap-1">
                      <CheckCircle2 className="w-4 h-4" />
                      Depoya İşlendi
                    </span>
                  )}
                </div>
              </div>

              {/* Items Line Table */}
              <div>
                <div className="text-[11px] font-semibold text-[--text-muted] uppercase tracking-wider mb-2">
                  Transfer Edilen Ürünler
                </div>
                <div className="bg-[--page] border border-[--line] rounded-xl overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="w-full text-xs">
                      <thead>
                        <tr className="text-left text-[--text-muted] bg-white border-b border-[--line]">
                          <th className="py-2.5 px-4">Ürün Adı</th>
                          <th className="py-2.5 px-3">SKU</th>
                          <th className="py-2.5 px-3 text-right">Talep</th>
                          <th className="py-2.5 px-3 text-right">Sevk</th>
                          <th className="py-2.5 px-3 text-right">Yolda (In-Transit)</th>
                          <th className="py-2.5 px-4 text-right">Teslim</th>
                        </tr>
                      </thead>
                      <tbody>
                        {tr.lines && tr.lines.length > 0 ? (
                          tr.lines.map((line) => (
                            <tr key={line.id} className="border-b border-[--line-soft] hover:bg-[--brand-soft]/30 transition-colors text-[--text-2]">
                              <td className="py-2.5 px-4 font-medium text-[--text]">
                                <div>{line.itemName || line.item?.name || 'Ürün'}</div>
                                {line.discrepancyReason && (
                                  <div className="text-[10px] text-[--bad] font-medium mt-0.5">Fark Nedeni: {line.discrepancyReason}</div>
                                )}
                              </td>
                              <td className="py-2.5 px-3 font-mono text-[--text-muted]">
                                {safeText(line.item?.sku)}
                              </td>
                              <td className="py-2.5 px-3 text-right font-medium text-[--text]">
                                {safeNumber(line.requestedQty, 0)} {line.unit || line.item?.unit || 'Adet'}
                              </td>
                              <td className="py-2.5 px-3 text-right font-medium text-[--warn]">
                                {safeNumber(line.shippedQty || line.requestedQty, 0)} {line.unit || line.item?.unit || 'Adet'}
                              </td>
                              <td className="py-2.5 px-3 text-right font-mono text-[--brand]">
                                {safeNumber(Number(line.inTransitQty || 0), 0)} {line.unit || line.item?.unit || 'Adet'}
                              </td>
                              <td className="py-2.5 px-4 text-right font-semibold text-[--ok]">
                                {safeNumber(tr.status === 'RECEIVED'
                                  ? line.receivedQty || line.shippedQty || line.requestedQty
                                  : line.receivedQty || 0, 0)}{' '}
                                {line.unit || line.item?.unit || 'Adet'}
                              </td>
                            </tr>
                          ))
                        ) : (
                          <tr>
                            <td colSpan={6} className="py-3 px-4 text-[--text-muted] italic">
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
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[--navy]/40 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white border border-[--line] rounded-2xl w-full max-w-xl p-6 shadow-2xl relative text-[--text]">
            <div className="flex items-center justify-between pb-3 border-b border-[--line]">
              <h3 className="text-base font-semibold text-[--text] flex items-center gap-2">
                <Truck className="w-5 h-5 text-[--brand]" />
                Yeni Depo Transfer Emri
              </h3>
              <button
                type="button"
                onClick={() => setIsNewModalOpen(false)}
                className="text-[--text-muted] hover:text-[--text] text-xl font-bold leading-none p-1 cursor-pointer"
              >
                &times;
              </button>
            </div>

            <form onSubmit={handleCreateTransfer} className="mt-4 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-[--text-muted] mb-1.5">
                    Kaynak Depo (Çıkış) *
                  </label>
                  <select
                    value={fromWhId}
                    onChange={(e) => setFromWhId(e.target.value)}
                    required
                    className="w-full text-xs bg-[--page] border border-[--line] text-[--text] rounded-xl p-2.5 focus:outline-none focus:border-[--brand] focus:ring-1 focus:ring-[--brand]"
                  >
                    <option value="" className="bg-white text-[--text]">Seçiniz...</option>
                    {warehouses.map((wh) => (
                      <option key={wh.id} value={wh.id} className="bg-white text-[--text]">
                        {wh.name} ({wh.code})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-medium text-[--text-muted] mb-1.5">
                    Hedef Depo (Varış) *
                  </label>
                  <select
                    value={toWhId}
                    onChange={(e) => setToWhId(e.target.value)}
                    required
                    className="w-full text-xs bg-[--page] border border-[--line] text-[--text] rounded-xl p-2.5 focus:outline-none focus:border-[--brand] focus:ring-1 focus:ring-[--brand]"
                  >
                    <option value="" className="bg-white text-[--text]">Seçiniz...</option>
                    {warehouses
                      .filter((wh) => wh.id !== fromWhId)
                      .map((wh) => (
                        <option key={wh.id} value={wh.id} className="bg-white text-[--text]">
                          {wh.name} ({wh.code})
                        </option>
                      ))}
                  </select>
                </div>
              </div>

              {/* Item selection */}
              <div className="grid grid-cols-3 gap-4">
                <div className="col-span-2">
                  <label className="block text-xs font-medium text-[--text-muted] mb-1.5">
                    Transfer Edilecek Ürün *
                  </label>
                  <select
                    value={selectedItemId}
                    onChange={(e) => setSelectedItemId(e.target.value)}
                    required
                    className="w-full text-xs bg-[--page] border border-[--line] text-[--text] rounded-xl p-2.5 focus:outline-none focus:border-[--brand] focus:ring-1 focus:ring-[--brand]"
                  >
                    <option value="" className="bg-white text-[--text]">Ürün Seçiniz...</option>
                    {items.map((it) => (
                      <option key={it.id} value={it.id} className="bg-white text-[--text]">
                        {it.name} ({it.sku})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-medium text-[--text-muted] mb-1.5">
                    Miktar *
                  </label>
                  <input
                    type="number"
                    min="1"
                    step="1"
                    value={quantity}
                    onChange={(e) => setQuantity(e.target.value)}
                    required
                    className="w-full text-xs bg-[--page] border border-[--line] text-[--text] rounded-xl p-2.5 focus:outline-none focus:border-[--brand] focus:ring-1 focus:ring-[--brand] font-semibold"
                  />
                </div>
              </div>

              {/* Logistics Details */}
              <FleetPickerSelect
                onSelectVehicle={(v, assignedDriver) => {
                  setVehiclePlate(v.plate);
                  if (assignedDriver) {
                    setDriverName(assignedDriver.fullName);
                    if (assignedDriver.phoneMasked) setDriverPhone(assignedDriver.phoneMasked);
                  }
                }}
                onSelectDriver={(d) => {
                  setDriverName(d.fullName);
                  if (d.phoneMasked) setDriverPhone(d.phoneMasked);
                }}
              />
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-medium text-[--text-muted] mb-1.5">
                    Araç Plakası
                  </label>
                  <input
                    type="text"
                    value={vehiclePlate}
                    onChange={(e) => setVehiclePlate(e.target.value)}
                    className="w-full text-xs bg-[--page] border border-[--line] text-[--text] rounded-xl p-2.5 focus:outline-none font-mono"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-[--text-muted] mb-1.5">
                    Sürücü / Kurye
                  </label>
                  <input
                    type="text"
                    value={driverName}
                    onChange={(e) => setDriverName(e.target.value)}
                    className="w-full text-xs bg-[--page] border border-[--line] text-[--text] rounded-xl p-2.5 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-[--text-muted] mb-1.5">
                    İletişim Tel
                  </label>
                  <input
                    type="text"
                    value={driverPhone}
                    onChange={(e) => setDriverPhone(e.target.value)}
                    className="w-full text-xs bg-[--page] border border-[--line] text-[--text] rounded-xl p-2.5 focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-[--text-muted] mb-1.5">
                  Sevkiyat Notu
                </label>
                <input
                  type="text"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Örn: Saat 15:00'e kadar teslim edilmeli"
                  className="w-full text-xs bg-[--page] border border-[--line] text-[--text] rounded-xl p-2.5 focus:outline-none focus:border-[--brand] focus:ring-1 focus:ring-[--brand]"
                />
              </div>

              <div className="pt-3 border-t border-[--line] flex justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setIsNewModalOpen(false)}
                  className="px-4 py-2 border border-[--line] bg-white text-[--text-2] hover:bg-[--muted-bg] text-xs font-medium rounded-full transition cursor-pointer"
                >
                  Vazgeç
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2 bg-[--brand] hover:bg-[--brand-hover] text-white text-xs font-semibold rounded-full transition shadow-sm disabled:opacity-50 cursor-pointer"
                >
                  {submitting ? 'Kaydediliyor...' : 'Transfer Emrini Oluştur'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Farklı / Eksik Teslimat Modalı */}
      {discrepancyModalTransfer && (
        <div className="fixed inset-0 bg-[--navy]/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white border border-[--line] rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden text-[--text] p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-[--line] pb-3">
              <div>
                <h4 className="text-sm font-semibold text-[--text]">
                  Kısmi / Farklı Teslim Alma — {discrepancyModalTransfer.orderNumber || discrepancyModalTransfer.transferNumber}
                </h4>
                <p className="text-xs text-[--text-muted]">Fiilen sağlam ulaşan miktarları ve varsa eksik/hasar nedenini girin.</p>
              </div>
              <button type="button" onClick={() => setDiscrepancyModalTransfer(null)} className="text-[--text-muted] hover:text-[--text] p-1">&times;</button>
            </div>

            <div className="space-y-3 max-h-80 overflow-y-auto text-xs">
              {(discrepancyModalTransfer.lines || []).map((ln) => (
                <div key={ln.id} className="p-3 bg-[--page] border border-[--line] rounded-xl space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-[--text]">{ln.itemName || ln.item?.name || ln.itemId}</span>
                    <span className="font-mono text-[--warn] font-semibold">Sevk: {ln.shippedQty || ln.requestedQty}</span>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="text-[11px] text-[--text-muted] block mb-1">Teslim Alınan Miktar</label>
                      <input
                        type="number"
                        min="0"
                        value={discrepancyQtys[ln.id] ?? '0'}
                        onChange={(e) => setDiscrepancyQtys({ ...discrepancyQtys, [ln.id]: e.target.value })}
                        className="w-full px-2.5 py-1.5 rounded-lg bg-white border border-[--line] text-[--text] font-mono"
                      />
                    </div>
                    <div>
                      <label className="text-[11px] text-[--text-muted] block mb-1">Fark / Hasar Nedeni</label>
                      <input
                        type="text"
                        placeholder="Örn. 2 adet kırık sap"
                        value={discrepancyReasons[ln.id] ?? ''}
                        onChange={(e) => setDiscrepancyReasons({ ...discrepancyReasons, [ln.id]: e.target.value })}
                        className="w-full px-2.5 py-1.5 rounded-lg bg-white border border-[--line] text-[--text]"
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-[--line]">
              <button
                type="button"
                onClick={() => setDiscrepancyModalTransfer(null)}
                className="px-4 py-2 rounded-full text-xs border border-[--line] text-[--text-2] bg-white hover:bg-[--muted-bg] cursor-pointer"
              >
                Vazgeç
              </button>
              <button
                type="button"
                disabled={submitting}
                onClick={() =>
                  handleAdvanceStatus(
                    discrepancyModalTransfer.id,
                    'RECEIVED',
                    (discrepancyModalTransfer.lines || []).map((ln) => ({
                      lineId: ln.id,
                      receivedQty: Number(discrepancyQtys[ln.id] || 0),
                      discrepancyReason: discrepancyReasons[ln.id] || undefined,
                    }))
                  )
                }
                className="px-4 py-2 rounded-full text-xs bg-[--bad] hover:bg-[--bad]/90 text-[var(--text)] font-semibold cursor-pointer shadow-sm disabled:opacity-50"
              >
                {submitting ? 'Kaydediliyor...' : 'Farklı Teslimatı Onayla'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
