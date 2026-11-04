'use client';

import React, { useState } from 'react';
import {
  ClipboardList,
  Layers,
  ArrowDownToLine,
  Search,
  Truck,
  CheckCircle2,
  X
} from 'lucide-react';
import { toast } from 'sonner';

interface Warehouse {
  id: string;
  name: string;
  code: string;
}

interface Bin {
  id: string;
  binCode: string;
  warehouseId: string;
  zone?: { name: string };
}

interface ItemOption {
  id: string;
  name: string;
  sku: string;
  unit: string;
}

interface Props {
  isOpen: boolean;
  onClose: () => void;
  warehouses: Warehouse[];
  bins: Bin[];
  items: ItemOption[];
  onCreated: () => void;
}

export function CreateWmsTaskModal({
  isOpen,
  onClose,
  warehouses,
  bins,
  items,
  onCreated
}: Props) {
  const [taskType, setTaskType] = useState<
    'GOODS_RECEIPT' | 'PUTAWAY' | 'WAVE_PICK' | 'TRANSFER_DISPATCH'
  >('GOODS_RECEIPT');
  const [priority, setPriority] = useState<'LOW' | 'NORMAL' | 'HIGH' | 'URGENT'>('NORMAL');
  const [warehouseId, setWarehouseId] = useState(warehouses[0]?.id || '');
  const [selectedItemId, setSelectedItemId] = useState(items[0]?.id || '');
  const [quantity, setQuantity] = useState('20');
  const [targetBinId, setTargetBinId] = useState('');
  const [assignedTo, setAssignedTo] = useState('Depo Sorumlusu');
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);

  if (!isOpen) return null;

  const relevantBins = bins.filter((b) => !warehouseId || b.warehouseId === warehouseId);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!warehouseId) {
      toast.error('Lütfen bir depo seçin');
      return;
    }
    if (!selectedItemId) {
      toast.error('Lütfen bir ürün seçin');
      return;
    }

    try {
      setSubmitting(true);
      const res = await fetch('/api/wms', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'create_task',
          warehouseId,
          taskType,
          priority,
          assignedTo,
          notes,
          items: [
            {
              itemId: selectedItemId,
              quantity: parseFloat(quantity) || 1,
              targetBinId: targetBinId || undefined
            }
          ]
        })
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Görev oluşturulamadı');
      }

      toast.success(`WMS Görevi oluşturuldu: ${data.data?.taskNumber || ''}`);
      onCreated();
      onClose();
    } catch (err: any) {
      toast.error(err.message || 'Hata oluştu');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in">
      <div className="backdrop-blur-xl bg-slate-950/85 border border-white/15 rounded-2xl w-full max-w-lg p-6 shadow-2xl relative text-white">
        <div className="flex items-center justify-between pb-4 border-b border-white/10">
          <div className="flex items-center gap-2">
            <ClipboardList className="w-5 h-5 text-indigo-400" />
            <h3 className="text-base font-bold text-white">
              Yeni Depo Görevi (WMS Emri) Tanımla
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-white/50 hover:text-white p-1"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="mt-4 space-y-4">
          {/* Task Type selector tabs */}
          <div>
            <label className="block text-xs font-semibold text-white/70 mb-1.5">
              İşlem Türü *
            </label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setTaskType('GOODS_RECEIPT')}
                className={`p-2.5 rounded-xl border text-xs font-medium flex items-center gap-2 transition ${
                  taskType === 'GOODS_RECEIPT'
                    ? 'border-indigo-400/50 bg-indigo-500/20 text-white font-bold shadow-[0_0_15px_rgba(99,102,241,0.2)]'
                    : 'border-white/10 bg-white/5 text-white/70 hover:bg-white/10'
                }`}
              >
                <ArrowDownToLine className="w-4 h-4 text-emerald-400" />
                Mal Kabul & Kalite
              </button>

              <button
                type="button"
                onClick={() => setTaskType('PUTAWAY')}
                className={`p-2.5 rounded-xl border text-xs font-medium flex items-center gap-2 transition ${
                  taskType === 'PUTAWAY'
                    ? 'border-indigo-400/50 bg-indigo-500/20 text-white font-bold shadow-[0_0_15px_rgba(99,102,241,0.2)]'
                    : 'border-white/10 bg-white/5 text-white/70 hover:bg-white/10'
                }`}
              >
                <Layers className="w-4 h-4 text-indigo-400" />
                Rafa İstifleme (Putaway)
              </button>

              <button
                type="button"
                onClick={() => setTaskType('WAVE_PICK')}
                className={`p-2.5 rounded-xl border text-xs font-medium flex items-center gap-2 transition ${
                  taskType === 'WAVE_PICK'
                    ? 'border-indigo-400/50 bg-indigo-500/20 text-white font-bold shadow-[0_0_15px_rgba(99,102,241,0.2)]'
                    : 'border-white/10 bg-white/5 text-white/70 hover:bg-white/10'
                }`}
              >
                <Search className="w-4 h-4 text-amber-400" />
                Sipariş Toplama (Pick)
              </button>

              <button
                type="button"
                onClick={() => setTaskType('TRANSFER_DISPATCH')}
                className={`p-2.5 rounded-xl border text-xs font-medium flex items-center gap-2 transition ${
                  taskType === 'TRANSFER_DISPATCH'
                    ? 'border-indigo-400/50 bg-indigo-500/20 text-white font-bold shadow-[0_0_15px_rgba(99,102,241,0.2)]'
                    : 'border-white/10 bg-white/5 text-white/70 hover:bg-white/10'
                }`}
              >
                <Truck className="w-4 h-4 text-purple-400" />
                Sevk / Paketleme
              </button>
            </div>
          </div>

          {/* Warehouse & Priority */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-white/70 mb-1.5">
                Depo *
              </label>
              <select
                value={warehouseId}
                onChange={(e) => setWarehouseId(e.target.value)}
                required
                className="w-full text-xs glass-input p-2.5 focus:outline-none"
              >
                {warehouses.map((wh) => (
                  <option key={wh.id} value={wh.id} className="bg-slate-900 text-white">
                    {wh.name} ({wh.code})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-white/70 mb-1.5">
                Öncelik
              </label>
              <select
                value={priority}
                onChange={(e) => setPriority(e.target.value as any)}
                className="w-full text-xs glass-input p-2.5 focus:outline-none"
              >
                <option value="LOW" className="bg-slate-900 text-white">Düşük</option>
                <option value="NORMAL" className="bg-slate-900 text-white">Normal</option>
                <option value="HIGH" className="bg-slate-900 text-white">Yüksek</option>
                <option value="URGENT" className="bg-slate-900 text-white">Acil / Kritik</option>
              </select>
            </div>
          </div>

          {/* Item & Quantity */}
          <div className="grid grid-cols-3 gap-3">
            <div className="col-span-2">
              <label className="block text-xs font-semibold text-white/70 mb-1.5">
                Ürün Seçimi *
              </label>
              <select
                value={selectedItemId}
                onChange={(e) => setSelectedItemId(e.target.value)}
                required
                className="w-full text-xs glass-input p-2.5 focus:outline-none"
              >
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

          {/* Target Bin & Operator */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-white/70 mb-1.5">
                Hedef Raf / Hücre (Opsiyonel)
              </label>
              <select
                value={targetBinId}
                onChange={(e) => setTargetBinId(e.target.value)}
                className="w-full text-xs glass-input p-2.5 focus:outline-none"
              >
                <option value="" className="bg-slate-900 text-white">Otomatik / Atanmamış</option>
                {relevantBins.map((bin) => (
                  <option key={bin.id} value={bin.id} className="bg-slate-900 text-white">
                    {bin.binCode} ({bin.zone?.name || 'Genel'})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-white/70 mb-1.5">
                Atanan Personel / Operatör
              </label>
              <input
                type="text"
                value={assignedTo}
                onChange={(e) => setAssignedTo(e.target.value)}
                className="w-full text-xs glass-input p-2.5 focus:outline-none"
              />
            </div>
          </div>

          {/* Notes */}
          <div>
            <label className="block text-xs font-semibold text-white/70 mb-1.5">
              Görev Notu / Talimatı
            </label>
            <input
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Örn: Isı kontrolü yapılarak A-01-01 soğuk hava hücresine yerleştirilsin"
              className="w-full text-xs glass-input p-2.5 focus:outline-none"
            />
          </div>

          {/* Modal Actions */}
          <div className="pt-3 border-t border-white/10 flex justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border border-white/15 bg-white/5 text-white/80 text-xs font-semibold rounded-xl hover:bg-white/10 transition"
            >
              Vazgeç
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-5 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold rounded-xl transition shadow-lg shadow-indigo-500/20 disabled:opacity-50"
            >
              {submitting ? 'Oluşturuluyor...' : 'Görevi Başlat'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
