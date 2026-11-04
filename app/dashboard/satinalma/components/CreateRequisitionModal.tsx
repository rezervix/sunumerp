'use client';

import React, { useState } from 'react';
import { ShoppingCart, X, Building, Layers } from 'lucide-react';
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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm animate-in fade-in">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl w-full max-w-lg p-6 shadow-2xl relative">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
          <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <ShoppingCart className="w-5 h-5 text-indigo-600" />
            Yeni Satın Alma Talebi Tanımla
          </h3>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 p-1"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="mt-4 space-y-3.5">
          <div>
            <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">
              Tedarikçi Firma *
            </label>
            <select
              value={supplierId}
              onChange={(e) => setSupplierId(e.target.value)}
              required
              className="w-full text-xs rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800 p-2.5 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              {suppliers.map((sup) => (
                <option key={sup.id} value={sup.id}>
                  {sup.name} ({sup.code})
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div className="col-span-2">
              <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">
                İkmal Edilecek Ürün *
              </label>
              <select
                value={itemId}
                onChange={(e) => setItemId(e.target.value)}
                required
                className="w-full text-xs rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800 p-2.5 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                {items.map((it) => (
                  <option key={it.id} value={it.id}>
                    {it.name} ({it.sku})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">
                Sipariş Miktarı *
              </label>
              <input
                type="number"
                min="1"
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
                required
                className="w-full text-xs rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800 p-2.5 text-slate-900 dark:text-white font-bold focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">
              Öncelik Seviyesi
            </label>
            <select
              value={priority}
              onChange={(e) => setPriority(e.target.value as any)}
              className="w-full text-xs rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800 p-2.5 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="NORMAL">Normal</option>
              <option value="HIGH">Yüksek (Kritik Stok)</option>
              <option value="CRITICAL">Acil / Kritik (Stoksuz)</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">
              Sipariş Notu / Talimatı
            </label>
            <input
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Örn: Hafta sonu teslimatı için acil sevkiyat"
              className="w-full text-xs rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800 p-2.5 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 text-xs font-semibold rounded-xl hover:bg-slate-100 transition"
            >
              Vazgeç
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold rounded-xl transition shadow-sm disabled:opacity-50"
            >
              {submitting ? 'Kaydediliyor...' : 'Satın Alma Talebini Oluştur'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

