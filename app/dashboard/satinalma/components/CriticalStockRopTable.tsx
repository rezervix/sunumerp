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
import { safeNumber, safeCurrency, safeText } from '@/lib/utils/safe-display';

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

  const filteredItems = (items || []).filter((item) => {
    const name = (item.name || '').toLowerCase();
    const sku = (item.sku || '').toLowerCase();
    const query = searchQuery.toLowerCase();
    const matchesSearch = name.includes(query) || sku.includes(query);
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
          notes: `Otomatik ROP Tetiklemesi: Stok (${safeNumber(item.availableQty)} ${safeText(item.unit)}) < ROP (${safeNumber(item.reorderPointRop)}). Güvenlik Stoğu: ${safeNumber(item.safetyStock)}`
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
          <span className="inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[11px] font-semibold bg-[--bad-soft] text-[--bad] border border-[--bad]/20">
            <ShieldAlert className="w-3 h-3 text-[--bad]" />
            TÜKENDİ (0 STOK)
          </span>
        );
      case 'CRITICAL_SAFETY':
        return (
          <span className="inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[11px] font-medium bg-[--warn-soft] text-[--warn] border border-[--warn]/20">
            <AlertTriangle className="w-3 h-3 text-[--warn]" />
            GÜVENLİK ALTI
          </span>
        );
      case 'BELOW_ROP':
        return (
          <span className="inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[11px] font-medium bg-[--warn-soft] text-[--warn] border border-[--warn]/20">
            <TrendingDown className="w-3 h-3 text-[--warn]" />
            ROP EŞİĞİ ALTI
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[11px] font-medium bg-[--ok-soft] text-[--ok] border border-[--ok]/20">
            <CheckCircle2 className="w-3 h-3 text-[--ok]" />
            NORMAL
          </span>
        );
    }
  };

  return (
    <div className="space-y-4">
      {/* Filtre ve Arama Barı */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-white/80 backdrop-blur-xl border border-[--line] p-4 rounded-[20px] shadow-sm">
        <div>
          <h3 className="text-base font-semibold text-[--text] flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-[--warn]" />
            Kritik Stok & Otomatik Yeniden Sipariş (ROP) Listesi
          </h3>
          <p className="text-xs text-[--text-muted] mt-0.5">
            Günlük talep hızı ve tedarik süresine göre dinamik hesaplanan sipariş önerileri
          </p>
        </div>

        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5">
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-[--text-muted] absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Ürün adı veya SKU ara..."
              className="pl-9 pr-3 py-1.5 text-xs bg-white border border-[--line] text-[--text] placeholder:text-[--text-muted] rounded-xl focus:border-[--brand] focus:ring-1 focus:ring-[--brand] focus:outline-none w-full sm:w-60"
            />
          </div>

          <select
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value)}
            className="text-xs bg-white border border-[--line] text-[--text] rounded-xl px-3 py-1.5 focus:border-[--brand] focus:ring-1 focus:ring-[--brand] focus:outline-none"
          >
            <option value="ALL">Tüm Durumlar</option>
            <option value="STOCKOUT">Tükenenler (0 Stok)</option>
            <option value="CRITICAL_SAFETY">Güvenlik Stoğu Altındakiler</option>
            <option value="BELOW_ROP">ROP Altındakiler</option>
            <option value="HEALTHY">Normal</option>
          </select>
        </div>
      </div>

      {/* Tablo */}
      <div className="bg-white border border-[--line] rounded-[20px] overflow-hidden shadow-sm">
        {filteredItems.length === 0 ? (
          <div className="text-center py-12 text-[--text-muted] text-xs">
            Kritik stok eşiği altında kayıt bulunamadı.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-[--line] bg-[--muted-bg]/50 text-[11px] uppercase tracking-wider text-[--text-muted] font-medium">
                  <th className="py-3 px-4">Ürün & SKU</th>
                  <th className="py-3 px-3">Depo</th>
                  <th className="py-3 px-3 text-right">Eldeki / Rezerve</th>
                  <th className="py-3 px-3 text-right">Kullanılabilir</th>
                  <th className="py-3 px-3 text-right">ROP Eşiği</th>
                  <th className="py-3 px-3 text-right">Güvenlik Stoğu</th>
                  <th className="py-3 px-3 text-right">Önerilen Sipariş</th>
                  <th className="py-3 px-3">Durum</th>
                  <th className="py-3 px-4 text-right">Aksiyon</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[--line]">
                {filteredItems.map((item) => (
                  <tr
                    key={item.id}
                    className="hover:bg-[--brand-soft]/40 transition group"
                  >
                    <td className="py-3.5 px-4">
                      <div className="font-medium text-[--text] text-sm">
                        {safeText(item.name)}
                      </div>
                      <div className="flex items-center gap-2 mt-0.5 text-[11px] text-[--text-muted]">
                        <span className="font-mono text-[--brand]">{safeText(item.sku)}</span>
                        <span>•</span>
                        <span>{safeText(item.category)}</span>
                      </div>
                    </td>

                    <td className="py-3.5 px-3 text-[--text-2]">
                      {safeText(item.warehouseName, 'Merkez Depo')}
                    </td>

                    <td className="py-3.5 px-3 text-right font-mono tabular-nums text-[--text-2]">
                      <div>{safeNumber(item.totalOnHand)} {safeText(item.unit)}</div>
                      <div className="text-[10px] text-[--text-muted]">
                        Rezerve: {safeNumber(item.totalReserved)}
                      </div>
                    </td>

                    <td className="py-3.5 px-3 text-right font-mono tabular-nums">
                      <span className={`font-semibold ${ safeNumber(item.availableQty) <= 0 ? 'text-[--bad]' : safeNumber(item.availableQty) < safeNumber(item.reorderPointRop) ? 'text-[--warn]' : 'text-[--ok]' }`}>
                        {safeNumber(item.availableQty)} {safeText(item.unit)}
                      </span>
                    </td>

                    <td className="py-3.5 px-3 text-right font-mono tabular-nums text-[--text-2]">
                      {safeNumber(item.reorderPointRop)} {safeText(item.unit)}
                    </td>

                    <td className="py-3.5 px-3 text-right font-mono tabular-nums text-[--text-muted]">
                      {safeNumber(item.safetyStock)} {safeText(item.unit)}
                    </td>

                    <td className="py-3.5 px-3 text-right font-mono tabular-nums font-semibold text-[--brand]">
                      {safeNumber(item.recommendedOrderQty)} {safeText(item.unit)}
                    </td>

                    <td className="py-3.5 px-3">
                      {getStatusBadge(item.status)}
                    </td>

                    <td className="py-3.5 px-4 text-right">
                      <button
                        onClick={() => handleQuickRequisition(item)}
                        disabled={submittingId === item.id}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-gradient-to-r from-[--brand] to-[--blue] hover:opacity-95 text-white rounded-full text-xs font-semibold shadow-sm shadow-[--brand]/20 transition active:scale-95 disabled:opacity-50 cursor-pointer"
                      >
                        <ShoppingCart className="w-3.5 h-3.5" />
                        {submittingId === item.id ? 'Açılıyor...' : 'Sipariş Aç'}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
