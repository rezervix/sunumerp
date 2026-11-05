'use client';

import React, { useState } from 'react';
import {
  Handshake,
  MinusCircle,
  Building,
  CheckCircle2
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
    <div className="space-y-4">
      <div className="bg-[#111513]/90 backdrop-blur-xl border border-white/[0.06] p-4 rounded-[20px]">
        <h3 className="text-base font-semibold text-white flex items-center gap-2">
          <Handshake className="w-4 h-4 text-[#34D399]" />
          Konsinye (Emanet) Stok & Tedarikçi Hakediş Yönetimi
        </h3>
        <p className="text-xs text-zinc-400 mt-0.5">
          Mülkiyeti tedarikçide olan, deponuzda bulunan ve satıldıkça hakedişi tahakkuk eden emanet stoklar
        </p>
      </div>

      <div className="space-y-4">
        {consignmentStocks.length === 0 ? (
          <div className="text-center py-10 bg-[#111513]/90 border border-white/[0.06] rounded-[20px] text-zinc-500 text-xs">
            Kayıtlı konsinye stok anlaşması bulunamadı.
          </div>
        ) : (
          consignmentStocks.map((item) => (
            <div
              key={item.id}
              className="bg-[#111513]/90 backdrop-blur-xl border border-white/[0.06] p-5 rounded-[20px] space-y-3.5 shadow-xl"
            >
              <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4 pb-3 border-b border-white/[0.06]">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-white/[0.03] border border-white/[0.06] flex items-center justify-center text-[#34D399]">
                    <Handshake className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-white text-sm">
                        {item.item?.name || 'Ürün'}
                      </span>
                      <span className="rounded-full px-2.5 py-0.5 text-xs font-mono bg-white/[0.05] text-zinc-300 border border-white/[0.08]">
                        {item.agreementNo}
                      </span>
                    </div>
                    <div className="text-xs text-zinc-400 flex items-center gap-2 mt-1">
                      <Building className="w-3.5 h-3.5 text-zinc-500" />
                      <span>{item.supplier?.name || 'Tedarikçi'}</span>
                      {item.binCode && (
                        <>
                          <span>•</span>
                          <span>Hücre: <strong className="text-white">{item.binCode}</strong></span>
                        </>
                      )}
                    </div>
                  </div>
                </div>

                {/* Stok Miktarları */}
                <div className="grid grid-cols-3 gap-3 text-xs w-full lg:w-auto">
                  <div className="bg-black/30 p-3 rounded-xl border border-white/[0.06] text-right">
                    <div className="text-[10px] text-zinc-500">Teslim Alınan</div>
                    <div className="font-semibold text-white mt-0.5 font-mono">
                      {item.receivedConsignQty} {item.item?.baseUnit || 'Adet'}
                    </div>
                  </div>

                  <div className="bg-black/30 p-3 rounded-xl border border-white/[0.06] text-right">
                    <div className="text-[10px] text-zinc-500">Kullanılabilir Konsinye</div>
                    <div className="font-semibold text-[#34D399] mt-0.5 font-mono">
                      {item.availableConsignQty} {item.item?.baseUnit || 'Adet'}
                    </div>
                  </div>

                  <div className="bg-black/30 p-3 rounded-xl border border-white/[0.06] text-right">
                    <div className="text-[10px] text-zinc-500">Satılan / Tüketilen</div>
                    <div className="font-semibold text-white mt-0.5 font-mono">
                      {item.consumedOrSoldQty} {item.item?.baseUnit || 'Adet'}
                    </div>
                  </div>
                </div>

                {/* Hakediş ve Aksiyon Butonu */}
                <div className="flex items-center gap-3 w-full lg:w-auto justify-end">
                  <div className="text-right">
                    <div className="text-[10px] text-zinc-500">Ödenecek Hakediş</div>
                    <div className="text-sm font-semibold text-[#34D399] font-mono">
                      ₺{Number(item.unbilledPayableAmt || 0).toLocaleString('tr-TR')}
                    </div>
                  </div>

                  <button
                    onClick={() => {
                      setSelectedRecord(item);
                      setConsumeQty('5');
                    }}
                    disabled={item.availableConsignQty <= 0}
                    className="inline-flex items-center gap-1.5 px-4 py-2 bg-[#34D399] hover:bg-[#34D399]/90 text-[#061811] rounded-full text-xs font-semibold shadow-lg shadow-emerald-500/20 transition active:scale-95 disabled:opacity-50 cursor-pointer"
                  >
                    <MinusCircle className="w-3.5 h-3.5" />
                    Satış / Sarfiyat Düş
                  </button>
                </div>
              </div>

              <div className="text-[11px] text-zinc-400 flex items-center justify-between">
                <span>Anlaşılan Birim Maliyet: <strong className="text-white font-mono">₺{item.agreedUnitCost}</strong> / Adet</span>
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
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in">
          <div className="backdrop-blur-xl bg-[#111513] border border-white/[0.08] rounded-2xl w-full max-w-md p-6 shadow-2xl relative text-white">
            <div className="flex items-center justify-between pb-3 border-b border-white/[0.08]">
              <h3 className="text-sm font-semibold text-white flex items-center gap-2">
                <MinusCircle className="w-4 h-4 text-[#34D399]" />
                Konsinye Stok Tüketimi / Satış Kaydı
              </h3>
              <button
                onClick={() => setSelectedRecord(null)}
                className="text-zinc-500 hover:text-white text-lg font-bold cursor-pointer"
              >
                &times;
              </button>
            </div>

            <form onSubmit={handleSettleSubmit} className="mt-4 space-y-3.5">
              <div className="p-3.5 bg-white/[0.03] border border-white/[0.06] rounded-xl text-xs space-y-1">
                <div className="font-semibold text-white">
                  {selectedRecord.item?.name}
                </div>
                <div className="text-zinc-400">
                  Tedarikçi: {selectedRecord.supplier?.name}
                </div>
                <div className="text-[#34D399] font-medium font-mono">
                  Mevcut Konsinye Stok: {selectedRecord.availableConsignQty} Adet
                </div>
                <div className="text-zinc-300 font-mono">
                  Birim Maliyet: ₺{selectedRecord.agreedUnitCost}
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-zinc-300 mb-1.5">
                  Kullanılan / Satılan Miktar *
                </label>
                <input
                  type="number"
                  min="1"
                  max={selectedRecord.availableConsignQty}
                  value={consumeQty}
                  onChange={(e) => setConsumeQty(e.target.value)}
                  required
                  className="w-full text-xs bg-white/[0.03] border border-white/[0.08] text-white rounded-xl p-2.5 font-bold focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-zinc-300 mb-1.5">
                  Kullanım Açıklaması / Sipariş No
                </label>
                <input
                  type="text"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="w-full text-xs bg-white/[0.03] border border-white/[0.08] text-white rounded-xl p-2.5 focus:outline-none"
                />
              </div>

              <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-xl text-xs text-[#34D399]">
                Tahakkuk Edecek Hakediş: <strong className="font-mono">₺{(parseFloat(consumeQty) || 0) * selectedRecord.agreedUnitCost}</strong>
              </div>

              <div className="pt-3 border-t border-white/[0.08] flex justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setSelectedRecord(null)}
                  className="px-4 py-2 border border-white/[0.08] bg-white/[0.04] text-zinc-300 hover:text-white text-xs font-medium rounded-full hover:bg-white/[0.08] transition cursor-pointer"
                >
                  Vazgeç
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2 bg-[#34D399] hover:bg-[#34D399]/90 text-[#061811] text-xs font-semibold rounded-full transition shadow-lg shadow-emerald-500/20 disabled:opacity-50 cursor-pointer"
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
