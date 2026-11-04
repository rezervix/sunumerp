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
          <span className="inline-flex items-center gap-1 rounded-full px-3 py-0.5 text-xs font-bold bg-rose-500/15 text-rose-300 border border-rose-500/30 animate-pulse">
            <ShieldAlert className="w-3.5 h-3.5 text-rose-400" />
            TÜKENDİ (0 STOK)
          </span>
        );
      case 'CRITICAL_SAFETY':
        return (
          <span className="inline-flex items-center gap-1 rounded-full px-3 py-0.5 text-xs font-semibold bg-amber-500/15 text-amber-300 border border-amber-500/30">
            <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />
            GÜVENLİK STOĞU ALTI
          </span>
        );
      case 'BELOW_ROP':
        return (
          <span className="inline-flex items-center gap-1 rounded-full px-3 py-0.5 text-xs font-semibold bg-amber-500/15 text-amber-300 border border-amber-500/30">
            <TrendingDown className="w-3.5 h-3.5 text-amber-400" />
            ROP EŞİĞİ ALTINDA
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 rounded-full px-3 py-0.5 text-xs font-semibold bg-emerald-500/15 text-emerald-300 border border-emerald-500/30">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
            NORMAL
          </span>
        );
    }
  };

  return (
    <div className="space-y-4">
      {/* Filtre ve Arama Barı */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 glass-panel p-5 rounded-2xl">
        <div>
          <h3 className="text-base font-bold text-white flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-amber-400" />
            Kritik Stok & Otomatik Yeniden Sipariş (ROP) Listesi
          </h3>
          <p className="text-xs text-white/60 mt-0.5">
            Dinamik ROP = (Günlük Talep × Tedarik Süresi) + Güvenlik Stoğu formülü ile anlık tetiklenen ikmal önerileri
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          {/* Arama Kutusu */}
          <div className="relative flex-1 sm:w-64">
            <Search className="w-4 h-4 text-white/40 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Ürün adı veya SKU ara..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-3 py-2 text-xs glass-input focus:outline-none"
            />
          </div>

          {/* Durum Filtresi */}
          <select
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value)}
            className="text-xs glass-input p-2 focus:outline-none"
          >
            <option value="ALL" className="bg-slate-900 text-white">Tüm Kritik Seviyeler</option>
            <option value="STOCKOUT" className="bg-slate-900 text-white">Tükenenler (0 Stok)</option>
            <option value="CRITICAL_SAFETY" className="bg-slate-900 text-white">Güvenlik Stoğu Altı</option>
            <option value="BELOW_ROP" className="bg-slate-900 text-white">ROP Eşiği Altı</option>
          </select>
        </div>
      </div>

      {/* Tablo */}
      <div className="glass-table-container overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="bg-white/[0.03] text-white/50 border-b border-white/10 text-left uppercase text-[11px]">
                <th className="py-3.5 px-4 font-semibold">Ürün / SKU</th>
                <th className="py-3.5 px-3 font-semibold text-center">Durum</th>
                <th className="py-3.5 px-3 font-semibold text-right">Kullanılabilir Stok</th>
                <th className="py-3.5 px-3 font-semibold text-right">Güvenlik Stoğu (SS)</th>
                <th className="py-3.5 px-3 font-semibold text-right">Sipariş Eşiği (ROP)</th>
                <th className="py-3.5 px-3 font-semibold text-right">Önerilen Sipariş</th>
                <th className="py-3.5 px-3 font-semibold text-right">Tahmini Tutar</th>
                <th className="py-3.5 px-4 font-semibold text-right">Aksiyon</th>
              </tr>
            </thead>
            <tbody>
              {filteredItems.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-10 text-center text-white/45">
                    Kritik stoğa düşen ürün bulunmuyor. Tüm stoklar sağlıklı seviyede.
                  </td>
                </tr>
              ) : (
                filteredItems.map((it) => {
                  const totalEstimated = (it.recommendedOrderQty || 0) * it.unitCost;
                  return (
                    <tr
                      key={it.id}
                      className="border-b border-white/5 hover:bg-white/[0.04] transition-colors"
                    >
                      <td className="py-3.5 px-4">
                        <div className="font-semibold text-white">
                          {it.name}
                        </div>
                        <div className="flex items-center gap-2 text-white/45 font-mono text-[11px] mt-0.5">
                          <span>{it.sku}</span>
                          <span>•</span>
                          <span className="text-white/60">{it.category}</span>
                        </div>
                      </td>

                      <td className="py-3.5 px-3 text-center">
                        {getStatusBadge(it.status)}
                      </td>

                      <td className="py-3.5 px-3 text-right">
                        <div className={`font-bold ${it.availableQty === 0 ? 'text-rose-400' : 'text-white'}`}>
                          {it.availableQty} {it.unit}
                        </div>
                        {it.onOrderQty > 0 && (
                          <div className="text-[11px] text-amber-400 font-medium">
                            +{it.onOrderQty} {it.unit} yolda
                          </div>
                        )}
                      </td>

                      <td className="py-3.5 px-3 text-right font-medium text-white/70">
                        {it.safetyStock} {it.unit}
                      </td>

                      <td className="py-3.5 px-3 text-right font-bold text-indigo-300">
                        {it.reorderPointRop} {it.unit}
                      </td>

                      <td className="py-3.5 px-3 text-right">
                        <span className="rounded-full px-3 py-0.5 text-xs bg-indigo-500/15 text-indigo-300 font-bold border border-indigo-500/30">
                          {it.recommendedOrderQty} {it.unit}
                        </span>
                      </td>

                      <td className="py-3.5 px-3 text-right font-semibold text-white">
                        ₺{totalEstimated.toLocaleString('tr-TR')}
                      </td>

                      <td className="py-3.5 px-4 text-right">
                        <button
                          onClick={() => handleQuickRequisition(it)}
                          disabled={submittingId === it.id}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl font-semibold shadow-lg shadow-indigo-500/20 transition active:scale-95 disabled:opacity-50"
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
    </div>
  );
}
