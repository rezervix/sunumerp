'use client';

import React, { useState } from 'react';
import {
  AlertTriangle,
  ShoppingCart,
  CheckCircle2,
  Search,
  TrendingDown,
  ShieldAlert
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
          <span className="inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[11px] font-semibold bg-rose-500/10 text-rose-300 border border-rose-500/20">
            <ShieldAlert className="w-3 h-3 text-rose-400" />
            TÜKENDİ (0 STOK)
          </span>
        );
      case 'CRITICAL_SAFETY':
        return (
          <span className="inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[11px] font-medium bg-amber-500/10 text-amber-300 border border-amber-500/20">
            <AlertTriangle className="w-3 h-3 text-amber-400" />
            GÜVENLİK ALTI
          </span>
        );
      case 'BELOW_ROP':
        return (
          <span className="inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[11px] font-medium bg-amber-500/10 text-amber-300 border border-amber-500/20">
            <TrendingDown className="w-3 h-3 text-amber-400" />
            ROP EŞİĞİ ALTI
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[11px] font-medium bg-emerald-500/10 text-[#34D399] border border-emerald-500/20">
            <CheckCircle2 className="w-3 h-3 text-[#34D399]" />
            NORMAL
          </span>
        );
    }
  };

  return (
    <div className="space-y-4">
      {/* Filtre ve Arama Barı */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-[#111513]/90 backdrop-blur-xl border border-white/[0.06] p-4 rounded-[20px]">
        <div>
          <h3 className="text-base font-semibold text-white flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-amber-400" />
            Kritik Stok & Otomatik Yeniden Sipariş (ROP) Listesi
          </h3>
          <p className="text-xs text-zinc-400 mt-0.5">
            Dinamik ROP = (Günlük Talep × Tedarik Süresi) + Güvenlik Stoğu formülü ile anlık tetiklenen ikmal önerileri
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          {/* Arama Kutusu */}
          <div className="relative flex-1 sm:w-64">
            <Search className="w-4 h-4 text-zinc-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Ürün adı veya SKU ara..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-3 py-2 text-xs bg-white/[0.03] border border-white/[0.08] text-white rounded-xl focus:border-[#34D399] focus:outline-none"
            />
          </div>

          {/* Durum Filtresi */}
          <select
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value)}
            className="text-xs bg-white/[0.03] border border-white/[0.08] text-zinc-300 rounded-xl p-2 focus:outline-none"
          >
            <option value="ALL" className="bg-[#111513] text-white">Tüm Kritik Seviyeler</option>
            <option value="STOCKOUT" className="bg-[#111513] text-white">Tükenenler (0 Stok)</option>
            <option value="CRITICAL_SAFETY" className="bg-[#111513] text-white">Güvenlik Stoğu Altı</option>
            <option value="BELOW_ROP" className="bg-[#111513] text-white">ROP Eşiği Altı</option>
          </select>
        </div>
      </div>

      {/* Tablo */}
      <div className="bg-[#111513]/90 backdrop-blur-xl border border-white/[0.06] rounded-[20px] overflow-hidden shadow-2xl">
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="bg-white/[0.02] text-zinc-400 border-b border-white/[0.06] text-left uppercase text-[11px] font-medium">
                <th className="py-4 px-5">Ürün / SKU</th>
                <th className="py-4 px-3 text-center">Durum</th>
                <th className="py-4 px-3 text-center">Stok / ROP Seviyesi (LED)</th>
                <th className="py-4 px-3 text-right">Kullanılabilir</th>
                <th className="py-4 px-3 text-right">Güvenlik (SS)</th>
                <th className="py-4 px-3 text-right">Sipariş Eşiği (ROP)</th>
                <th className="py-4 px-3 text-right">Önerilen Sipariş</th>
                <th className="py-4 px-3 text-right">Tahmini Tutar</th>
                <th className="py-4 px-5 text-right">Aksiyon</th>
              </tr>
            </thead>
            <tbody>
              {filteredItems.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-10 text-center text-zinc-500">
                    Kritik stoğa düşen ürün bulunmuyor. Tüm stoklar sağlıklı seviyede.
                  </td>
                </tr>
              ) : (
                filteredItems.map((it) => {
                  const totalEstimated = (it.recommendedOrderQty || 0) * it.unitCost;
                  const ropTarget = it.reorderPointRop || 10;
                  const ratio = ropTarget > 0 ? it.availableQty / ropTarget : 0;
                  const activeSegments = Math.min(8, Math.max(it.availableQty > 0 ? 1 : 0, Math.round(ratio * 8)));

                  return (
                    <tr
                      key={it.id}
                      className="border-b border-white/[0.04] border-l-2 border-l-transparent hover:border-l-emerald-400 hover:bg-white/[0.02] transition-colors"
                    >
                      <td className="py-4 px-5">
                        <div className="font-medium text-white">
                          {it.name}
                        </div>
                        <div className="flex items-center gap-2 text-zinc-500 font-mono text-[11px] mt-0.5">
                          <span>{it.sku}</span>
                          <span>•</span>
                          <span className="text-zinc-400">{it.category}</span>
                        </div>
                      </td>

                      <td className="py-4 px-3 text-center">
                        {getStatusBadge(it.status)}
                      </td>

                      {/* 8-Segment LED Pipeline */}
                      <td className="py-4 px-3 text-center">
                        <div className="flex items-center justify-center gap-1">
                          {[0, 1, 2, 3, 4, 5, 6, 7].map(idx => (
                            <div
                              key={idx}
                              className={`h-1.5 w-2.5 rounded-full transition-colors ${
                                idx < activeSegments
                                  ? it.status === 'STOCKOUT'
                                    ? "bg-rose-400 shadow-[0_0_6px_rgba(244,63,94,0.4)]"
                                    : it.status === 'CRITICAL_SAFETY' || it.status === 'BELOW_ROP'
                                    ? "bg-amber-400 shadow-[0_0_6px_rgba(251,191,36,0.35)]"
                                    : "bg-[#34D399] shadow-[0_0_6px_rgba(52,211,153,0.35)]"
                                  : "bg-white/[0.08]"
                              }`}
                            />
                          ))}
                        </div>
                      </td>

                      <td className="py-4 px-3 text-right">
                        <div className={`font-semibold ${it.availableQty === 0 ? 'text-rose-400' : 'text-white'}`}>
                          {it.availableQty} {it.unit}
                        </div>
                        {it.onOrderQty > 0 && (
                          <div className="text-[11px] text-zinc-400 font-medium font-mono">
                            +{it.onOrderQty} {it.unit} yolda
                          </div>
                        )}
                      </td>

                      <td className="py-4 px-3 text-right font-medium text-zinc-400 font-mono">
                        {it.safetyStock} {it.unit}
                      </td>

                      <td className="py-4 px-3 text-right font-semibold text-white font-mono">
                        {it.reorderPointRop} {it.unit}
                      </td>

                      <td className="py-4 px-3 text-right">
                        <span className="rounded-full px-2.5 py-0.5 text-xs bg-white/[0.05] text-[#34D399] font-semibold border border-white/[0.08] font-mono">
                          {it.recommendedOrderQty} {it.unit}
                        </span>
                      </td>

                      <td className="py-4 px-3 text-right font-semibold text-white font-mono">
                        ₺{totalEstimated.toLocaleString('tr-TR')}
                      </td>

                      <td className="py-4 px-5 text-right">
                        <button
                          onClick={() => handleQuickRequisition(it)}
                          disabled={submittingId === it.id}
                          className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-[#34D399] hover:bg-[#34D399]/90 text-[#061811] rounded-full font-semibold shadow-lg shadow-emerald-500/20 transition active:scale-95 disabled:opacity-50 cursor-pointer text-xs"
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
