'use client';

import React, { useState } from 'react';
import {
  AlertTriangle,
  ShoppingCart,
  CheckCircle2,
  Search,
  Filter,
  ArrowRight,
  TrendingDown,
  ShieldAlert,
  Plus
} from 'lucide-react';
import { toast } from 'sonner';

interface CriticalItem {
  id: string;
  sku: string;
  name: string;
  category: string;
  unit: string;
  unitCost: number;
  totalOnHand: number;
  totalReserved: number;
  availableQty: number;
  onOrderQty: number;
  avgDailyDemand: number;
  leadTimeDays: number;
  safetyStock: number;
  reorderPointRop: number;
  recommendedOrderQty: number;
  status: 'HEALTHY' | 'BELOW_ROP' | 'CRITICAL_SAFETY' | 'STOCKOUT';
  warehouseName: string;
  warehouseId?: string;
}

interface Supplier {
  id: string;
  name: string;
  code: string;
}

interface Props {
  items: CriticalItem[];
  suppliers: Supplier[];
  onOrderCreated: () => void;
}

export function CriticalStockRopTable({
  items,
  suppliers,
  onOrderCreated
}: Props) {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedStatus, setSelectedStatus] = useState<string>('ALL');
  const [submittingId, setSubmittingId] = useState<string | null>(null);

  const filteredItems = items.filter((item) => {
    const matchesSearch =
      item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.sku.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus =
      selectedStatus === 'ALL' || item.status === selectedStatus;
    return matchesSearch && matchesStatus;
  });

  const handleQuickRequisition = async (item: CriticalItem) => {
    try {
      setSubmittingId(item.id);
      const defaultSupplier = suppliers[0];
      if (!defaultSupplier) {
        toast.error('Kayıtlı tedarikçi bulunamadı');
        return;
      }

      const res = await fetch('/api/procurement', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'create_requisition',
          warehouseId: item.warehouseId,
          supplierId: defaultSupplier.id,
          itemId: item.id,
          quantity: item.recommendedOrderQty || 50,
          unitCost: item.unitCost,
          priority: item.status === 'STOCKOUT' ? 'CRITICAL' : 'HIGH',
          triggerSource: 'AUTO_ROP_ENGINE',
          notes: `Otomatik ROP Tetiklemesi: Stok (${item.availableQty} ${item.unit}) < ROP (${item.reorderPointRop}). Güvenlik Stoğu: ${item.safetyStock}`
        })
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Satın alma talebi oluşturulamadı');
      }

      toast.success(
        `Satın Alma Talebi Oluşturuldu: ${data.requisition?.reqNumber || ''}`,
        {
          description: `${item.name} için ${item.recommendedOrderQty} ${item.unit} sipariş emri açıldı.`
        }
      );
      onOrderCreated();
    } catch (err: any) {
      toast.error(err.message || 'İşlem başarısız');
    } finally {
      setSubmittingId(null);
    }
  };

  const getStatusBadge = (status: CriticalItem['status']) => {
    switch (status) {
      case 'STOCKOUT':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300 animate-pulse">
            <ShieldAlert className="w-3.5 h-3.5 text-rose-600" />
            TÜKENDİ (0 STOK)
          </span>
        );
      case 'CRITICAL_SAFETY':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300">
            <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
            GÜVENLİK STOĞU ALTI
          </span>
        );
      case 'BELOW_ROP':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-orange-100 text-orange-800 dark:bg-orange-950 dark:text-orange-300">
            <TrendingDown className="w-3.5 h-3.5 text-orange-600" />
            ROP EŞİĞİ ALTINDA
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
            NORMAL
          </span>
        );
    }
  };

  return (
    <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5 shadow-sm space-y-4">
      {/* Filtre ve Arama Barı */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        <div>
          <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-amber-500" />
            Kritik Stok & Otomatik Yeniden Sipariş (ROP) Listesi
          </h3>
          <p className="text-xs text-slate-500 mt-0.5">
            Dinamik $ROP = (\text{Talep} \times L) + SS$ formülü ile anlık tetiklenen ikmal önerileri
          </p>
        </div>

        <div className="flex items-center gap-2">
          {/* Arama Kutusu */}
          <div className="relative flex-1 sm:w-64">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Ürün adı veya SKU ara..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          {/* Durum Filtresi */}
          <select
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value)}
            className="text-xs rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800 p-2 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
          >
            <option value="ALL">Tüm Kritik Seviyeler</option>
            <option value="STOCKOUT">Tükenenler (0 Stok)</option>
            <option value="CRITICAL_SAFETY">Güvenlik Stoğu Altı</option>
            <option value="BELOW_ROP">ROP Eşiği Altı</option>
          </select>
        </div>
      </div>

      {/* Tablo */}
      <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-800">
        <table className="w-full text-xs">
          <thead>
            <tr className="bg-slate-50 dark:bg-slate-800/60 text-slate-500 border-b border-slate-200 dark:border-slate-800 text-left">
              <th className="py-3 px-4 font-semibold">Ürün / SKU</th>
              <th className="py-3 px-3 font-semibold text-center">Durum</th>
              <th className="py-3 px-3 font-semibold text-right">Kullanılabilir Stok</th>
              <th className="py-3 px-3 font-semibold text-right">Güvenlik Stoğu (SS)</th>
              <th className="py-3 px-3 font-semibold text-right">Sipariş Eşiği (ROP)</th>
              <th className="py-3 px-3 font-semibold text-right">Önerilen Sipariş</th>
              <th className="py-3 px-3 font-semibold text-right">Tahmini Tutar</th>
              <th className="py-3 px-4 font-semibold text-right">Aksiyon</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
            {filteredItems.length === 0 ? (
              <tr>
                <td colSpan={8} className="py-8 text-center text-slate-400">
                  Kritik stoğa düşen ürün bulunmuyor. Tüm stoklar sağlıklı seviyede.
                </td>
              </tr>
            ) : (
              filteredItems.map((it) => {
                const totalEstimated = (it.recommendedOrderQty || 0) * it.unitCost;
                return (
                  <tr
                    key={it.id}
                    className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40 transition"
                  >
                    <td className="py-3.5 px-4">
                      <div className="font-semibold text-slate-900 dark:text-white">
                        {it.name}
                      </div>
                      <div className="flex items-center gap-2 text-slate-400 font-mono text-[11px] mt-0.5">
                        <span>{it.sku}</span>
                        <span>•</span>
                        <span className="text-slate-500">{it.category}</span>
                      </div>
                    </td>

                    <td className="py-3.5 px-3 text-center">
                      {getStatusBadge(it.status)}
                    </td>

                    <td className="py-3.5 px-3 text-right">
                      <div className={`font-bold ${it.availableQty === 0 ? 'text-rose-600' : 'text-slate-900 dark:text-white'}`}>
                        {it.availableQty} {it.unit}
                      </div>
                      {it.onOrderQty > 0 && (
                        <div className="text-[11px] text-amber-600 font-medium">
                          +{it.onOrderQty} {it.unit} yolda
                        </div>
                      )}
                    </td>

                    <td className="py-3.5 px-3 text-right font-medium text-slate-600 dark:text-slate-400">
                      {it.safetyStock} {it.unit}
                    </td>

                    <td className="py-3.5 px-3 text-right font-bold text-indigo-600 dark:text-indigo-400">
                      {it.reorderPointRop} {it.unit}
                    </td>

                    <td className="py-3.5 px-3 text-right">
                      <span className="px-2 py-1 bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 font-bold rounded-lg border border-indigo-200 dark:border-indigo-800">
                        {it.recommendedOrderQty} {it.unit}
                      </span>
                    </td>

                    <td className="py-3.5 px-3 text-right font-semibold text-slate-800 dark:text-slate-200">
                      ₺{totalEstimated.toLocaleString('tr-TR')}
                    </td>

                    <td className="py-3.5 px-4 text-right">
                      <button
                        onClick={() => handleQuickRequisition(it)}
                        disabled={submittingId === it.id}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-semibold shadow-sm transition active:scale-95 disabled:opacity-50"
                      >
                        <ShoppingCart className="w-3.5 h-3.5" />
                        {submittingId === it.id ? 'Açılıyor...' : 'Sipariş Aç'}
                      </button>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

