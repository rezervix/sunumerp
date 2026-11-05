'use client';

import React, { useState } from 'react';
import { ShoppingCart, X } from 'lucide-react';
import { toast } from 'sonner';

interface Supplier {
  id: string;
  name: string;
  code: string;
}

interface ItemOption {
  id: string;
  name: string;
  sku: string;
  unit?: string;
  unitCost?: number;
}

interface Props {
  isOpen: boolean;
  onClose: () => void;
  suppliers: Supplier[];
  items: ItemOption[];
  onCreated: () => void;
}

export function CreateRequisitionModal({
  isOpen,
  onClose,
  suppliers,
  items,
  onCreated
}: Props) {
  const [supplierId, setSupplierId] = useState(suppliers[0]?.id || '');
  const [itemId, setItemId] = useState(items[0]?.id || '');
  const [quantity, setQuantity] = useState('50');
  const [priority, setPriority] = useState<'NORMAL' | 'HIGH' | 'CRITICAL'>('HIGH');
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!supplierId || !itemId) {
      toast.error('Lütfen tedarikçi ve ürün seçiniz');
      return;
    }

    try {
      setSubmitting(true);
      const res = await fetch('/api/procurement', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'create_requisition',
          supplierId,
          itemId,
          quantity: parseFloat(quantity) || 1,
          priority,
          notes,
          triggerSource: 'MANUAL_REQUEST'
        })
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Satın alma talebi oluşturulamadı');
      }

      toast.success(`Satın alma talebi oluşturuldu: ${data.requisition?.reqNumber || ''}`);
      onCreated();
      onClose();
    } catch (err: any) {
      toast.error(err.message || 'Hata oluştu');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in">
      <div className="backdrop-blur-xl bg-[#111513] border border-white/[0.08] rounded-2xl w-full max-w-lg p-6 shadow-2xl relative text-white">
        <div className="flex items-center justify-between pb-3 border-b border-white/[0.08]">
          <h3 className="text-base font-semibold text-white flex items-center gap-2">
            <ShoppingCart className="w-5 h-5 text-[#34D399]" />
            Yeni Satın Alma Talebi Tanımla
          </h3>
          <button
            onClick={onClose}
            className="text-zinc-500 hover:text-white p-1 cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="mt-4 space-y-4">
          <div>
            <label className="block text-xs font-medium text-zinc-300 mb-1.5">
              Tedarikçi Firma *
            </label>
            <select
              value={supplierId}
              onChange={(e) => setSupplierId(e.target.value)}
              required
              className="w-full text-xs bg-white/[0.03] border border-white/[0.08] text-white rounded-xl p-2.5 focus:outline-none"
            >
              {suppliers.map((sup) => (
                <option key={sup.id} value={sup.id} className="bg-[#111513] text-white">
                  {sup.name} ({sup.code})
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div className="col-span-2">
              <label className="block text-xs font-medium text-zinc-300 mb-1.5">
                İkmal Edilecek Ürün *
              </label>
              <select
                value={itemId}
                onChange={(e) => setItemId(e.target.value)}
                required
                className="w-full text-xs bg-white/[0.03] border border-white/[0.08] text-white rounded-xl p-2.5 focus:outline-none"
              >
                {items.map((it) => (
                  <option key={it.id} value={it.id} className="bg-[#111513] text-white">
                    {it.name} ({it.sku})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-zinc-300 mb-1.5">
                Sipariş Miktarı *
              </label>
              <input
                type="number"
                min="1"
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
                required
                className="w-full text-xs bg-white/[0.03] border border-white/[0.08] text-white rounded-xl p-2.5 font-bold focus:outline-none"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-zinc-300 mb-1.5">
              Öncelik Seviyesi
            </label>
            <select
              value={priority}
              onChange={(e) => setPriority(e.target.value as any)}
              className="w-full text-xs bg-white/[0.03] border border-white/[0.08] text-white rounded-xl p-2.5 focus:outline-none"
            >
              <option value="NORMAL" className="bg-[#111513] text-white">Normal</option>
              <option value="HIGH" className="bg-[#111513] text-white">Yüksek (Kritik Stok)</option>
              <option value="CRITICAL" className="bg-[#111513] text-white">Acil / Kritik (Stoksuz)</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-medium text-zinc-300 mb-1.5">
              Sipariş Notu / Talimatı
            </label>
            <input
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Örn: Hafta sonu teslimatı için acil sevkiyat"
              className="w-full text-xs bg-white/[0.03] border border-white/[0.08] text-white rounded-xl p-2.5 focus:outline-none"
            />
          </div>

          <div className="pt-3 border-t border-white/[0.08] flex justify-end gap-2.5">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border border-white/[0.08] bg-white/[0.04] text-zinc-300 hover:text-white text-xs font-medium rounded-full hover:bg-white/[0.08] transition cursor-pointer"
            >
              Vazgeç
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-5 py-2 bg-[#34D399] hover:bg-[#34D399]/90 text-[#061811] text-xs font-semibold rounded-full transition shadow-lg shadow-emerald-500/20 disabled:opacity-50 cursor-pointer"
            >
              {submitting ? 'Kaydediliyor...' : 'Satın Alma Talebini Oluştur'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
