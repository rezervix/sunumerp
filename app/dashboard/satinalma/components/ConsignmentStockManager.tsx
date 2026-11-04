'use client';

import React, { useState } from 'react';
import {
  Handshake,
  TrendingUp,
  Boxes,
  MinusCircle,
  Building,
  CheckCircle2,
  Calendar,
  Layers,
  ArrowRight
} from 'lucide-react';
import { toast } from 'sonner';

interface ConsignmentItem {
  id: string;
  agreementNo: string;
  supplierId: string;
  itemId: string;
  warehouseId: string;
  binCode?: string | null;
  lotNumber?: string | null;
  receivedConsignQty: number;
  availableConsignQty: number;
  consumedOrSoldQty: number;
  agreedUnitCost: number;
  commissionPercent: number;
  unbilledPayableAmt: number;
  status: string;
  lastSettlementDate?: string | null;
  item?: {
    name: string;
    sku: string;
    baseUnit?: string;
  };
  supplier?: {
    name: string;
    code: string;
  };
  warehouse?: {
    name: string;
  };
}

interface Props {
  consignmentStocks: ConsignmentItem[];
  onUpdated: () => void;
}

export function ConsignmentStockManager({ consignmentStocks, onUpdated }: Props) {
  const [selectedRecord, setSelectedRecord] = useState<ConsignmentItem | null>(null);
  const [consumeQty, setConsumeQty] = useState('10');
  const [notes, setNotes] = useState('Buket aranjmanında kullanıldı / Satıldı');
  const [submitting, setSubmitting] = useState(false);

  const handleSettleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedRecord) return;

    const qty = parseFloat(consumeQty) || 0;
    if (qty <= 0) {
      toast.error('Lütfen geçerli bir miktar girin');
      return;
    }
    if (qty > selectedRecord.availableConsignQty) {
      toast.error(`Mevcut konsinye stoğu (${selectedRecord.availableConsignQty}) aşılamaz!`);
      return;
    }

    try {
      setSubmitting(true);
      const res = await fetch('/api/procurement', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'settle_consignment',
          consignId: selectedRecord.id,
          consumeQty: qty,
          notes
        })
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Konsinye mutabakatı başarısız');
      }

      toast.success(data.message || 'Konsinye stok düşüldü ve hakediş tahakkuk ettirildi!');
      setSelectedRecord(null);
      onUpdated();
    } catch (err: any) {
      toast.error(err.message || 'İşlem başarısız');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5 shadow-sm space-y-4">
      <div>
        <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
          <Handshake className="w-5 h-5 text-blue-600" />
          Konsinye (Emanet) Stok & Tedarikçi Hakediş Yönetimi
        </h3>
        <p className="text-xs text-slate-500 mt-0.5">
          Mülkiyeti tedarikçide olan, deponuzda bulunan ve satıldıkça hakedişi tahakkuk eden emanet stoklar
        </p>
      </div>

      <div className="space-y-3">
        {consignmentStocks.length === 0 ? (
          <div className="text-center py-10 text-slate-400 text-xs">
            Kayıtlı konsinye stok anlaşması bulunamadı.
          </div>
        ) : (
          consignmentStocks.map((item) => (
            <div
              key={item.id}
              className="p-4 rounded-xl border border-slate-200/80 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30 hover:bg-slate-50 transition"
            >
              <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4 pb-3 border-b border-slate-200/60 dark:border-slate-800">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-blue-50 dark:bg-blue-950/60 border border-blue-200 dark:border-blue-800 flex items-center justify-center text-blue-600">
                    <Handshake className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-slate-900 dark:text-white text-sm">
                        {item.item?.name || 'Ürün'}
                      </span>
                      <span className="px-2 py-0.5 rounded text-[11px] font-mono bg-slate-200/70 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                        {item.agreementNo}
                      </span>
                    </div>
                    <div className="text-xs text-slate-500 flex items-center gap-2 mt-0.5">
                      <Building className="w-3 h-3 text-slate-400" />
                      <span>{item.supplier?.name || 'Tedarikçi'}</span>
                      {item.binCode && (
                        <>
                          <span>•</span>
                          <span>Hücre: <strong>{item.binCode}</strong></span>
                        </>
                      )}
                    </div>
                  </div>
                </div>

                {/* Stok Miktarları */}
                <div className="grid grid-cols-3 gap-3 text-xs w-full lg:w-auto">
                  <div className="bg-white dark:bg-slate-800/80 p-2.5 rounded-xl border border-slate-200/60 dark:border-slate-700/60 text-right">
                    <div className="text-[11px] text-slate-400">Teslim Alınan</div>
                    <div className="font-bold text-slate-900 dark:text-white">
                      {item.receivedConsignQty} {item.item?.baseUnit || 'Adet'}
                    </div>
                  </div>

                  <div className="bg-white dark:bg-slate-800/80 p-2.5 rounded-xl border border-slate-200/60 dark:border-slate-700/60 text-right">
                    <div className="text-[11px] text-slate-400">Kullanılabilir Konsinye</div>
                    <div className="font-bold text-blue-600 dark:text-blue-400">
                      {item.availableConsignQty} {item.item?.baseUnit || 'Adet'}
                    </div>
                  </div>

                  <div className="bg-white dark:bg-slate-800/80 p-2.5 rounded-xl border border-slate-200/60 dark:border-slate-700/60 text-right">
                    <div className="text-[11px] text-slate-400">Satılan / Tüketilen</div>
                    <div className="font-bold text-emerald-600 dark:text-emerald-400">
                      {item.consumedOrSoldQty} {item.item?.baseUnit || 'Adet'}
                    </div>
                  </div>
                </div>

                {/* Hakediş ve Aksiyon Butonu */}
                <div className="flex items-center gap-3 w-full lg:w-auto justify-end">
                  <div className="text-right">
                    <div className="text-[11px] text-slate-400">Ödenecek Hakediş</div>
                    <div className="text-sm font-bold text-emerald-600 dark:text-emerald-400">
                      ₺{Number(item.unbilledPayableAmt || 0).toLocaleString('tr-TR')}
                    </div>
                  </div>

                  <button
                    onClick={() => {
                      setSelectedRecord(item);
                      setConsumeQty('5');
                    }}
                    disabled={item.availableConsignQty <= 0}
                    className="inline-flex items-center gap-1.5 px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-semibold shadow-sm transition active:scale-95 disabled:opacity-50"
                  >
                    <MinusCircle className="w-3.5 h-3.5" />
                    Satış / Sarfiyat Düş
                  </button>
                </div>
              </div>

              <div className="mt-2.5 text-[11px] text-slate-400 flex items-center justify-between">
                <span>Anlaşılan Birim Maliyet: <strong>₺{item.agreedUnitCost}</strong> / Adet</span>
                {item.lastSettlementDate && (
                  <span>Son Hakediş Tarihi: {new Date(item.lastSettlementDate).toLocaleString('tr-TR')}</span>
                )}
              </div>
            </div>
          ))
        )}
      </div>

      {/* Sarfiyat Düşme Modalı */}
      {selectedRecord && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl w-full max-w-md p-6 shadow-2xl relative">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <MinusCircle className="w-4 h-4 text-blue-600" />
                Konsinye Stok Tüketimi / Satış Kaydı
              </h3>
              <button
                onClick={() => setSelectedRecord(null)}
                className="text-slate-400 hover:text-slate-600 text-lg font-bold"
              >
                &times;
              </button>
            </div>

            <form onSubmit={handleSettleSubmit} className="mt-4 space-y-3">
              <div className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-xl text-xs space-y-1">
                <div className="font-semibold text-slate-900 dark:text-white">
                  {selectedRecord.item?.name}
                </div>
                <div className="text-slate-500">
                  Tedarikçi: {selectedRecord.supplier?.name}
                </div>
                <div className="text-blue-600 font-bold">
                  Mevcut Konsinye Stok: {selectedRecord.availableConsignQty} Adet
                </div>
                <div className="text-slate-600">
                  Birim Maliyet: ₺{selectedRecord.agreedUnitCost}
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">
                  Kullanılan / Satılan Miktar *
                </label>
                <input
                  type="number"
                  min="1"
                  max={selectedRecord.availableConsignQty}
                  value={consumeQty}
                  onChange={(e) => setConsumeQty(e.target.value)}
                  required
                  className="w-full text-xs rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800 p-2.5 text-slate-900 dark:text-white font-bold focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">
                  Kullanım Açıklaması / Sipariş No
                </label>
                <input
                  type="text"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="w-full text-xs rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800 p-2.5 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="p-3 bg-emerald-50 dark:bg-emerald-950/40 rounded-xl text-xs text-emerald-800 dark:text-emerald-300">
                Tahakkuk Edecek Hakediş: <strong>₺{(parseFloat(consumeQty) || 0) * selectedRecord.agreedUnitCost}</strong>
              </div>

              <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setSelectedRecord(null)}
                  className="px-4 py-2 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 text-xs font-semibold rounded-xl hover:bg-slate-100 transition"
                >
                  Vazgeç
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-xl transition shadow-sm disabled:opacity-50"
                >
                  {submitting ? 'İşleniyor...' : 'Stoğu Düş ve Hakedişi Kaydet'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

