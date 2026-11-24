'use client';

import React, { useState } from 'react';
import {
  Handshake,
  MinusCircle,
  Building,
  CheckCircle2
} from 'lucide-react';
import { toast } from 'sonner';
import { safeText, safeNumber, safeCurrency, safeDate } from '@/lib/utils/safe-display';

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
      <div className="bg-white/80 backdrop-blur-xl border border-[--line] p-4 rounded-[20px] shadow-sm">
        <h3 className="text-base font-semibold text-[--text] flex items-center gap-2">
          <Handshake className="w-4 h-4 text-[--brand]" />
          Konsinye (Emanet) Stok & Tedarikçi Hakediş Yönetimi
        </h3>
        <p className="text-xs text-[--text-muted] mt-0.5">
          Mülkiyeti tedarikçide olan, deponuzda bulunan ve satıldıkça hakedişi tahakkuk eden emanet stoklar
        </p>
      </div>

      <div className="space-y-4">
        {(consignmentStocks || []).length === 0 ? (
          <div className="text-center py-12 bg-white border border-[--line] rounded-[20px] text-[--text-muted] text-xs shadow-sm">
            Kayıtlı konsinye stok anlaşması bulunamadı.
          </div>
        ) : (
          consignmentStocks.map((item) => (
            <div
              key={item.id}
              className="bg-white border border-[--line] p-5 rounded-[20px] space-y-3.5 shadow-sm hover:border-[--brand-line] transition"
            >
              <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4 pb-3 border-b border-[--line]">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-[--brand-soft] border border-[--brand-line] flex items-center justify-center text-[--brand]">
                    <Handshake className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-[--text] text-sm">
                        {safeText(item.item?.name, 'Ürün')}
                      </span>
                      <span className="rounded-full px-2.5 py-0.5 text-xs font-mono bg-[--muted-bg] text-[--brand] border border-[--line]">
                        {safeText(item.agreementNo)}
                      </span>
                    </div>
                    <div className="text-xs text-[--text-muted] flex items-center gap-2 mt-1">
                      <Building className="w-3.5 h-3.5 text-[--text-muted]" />
                      <span>{safeText(item.supplier?.name, 'Tedarikçi')}</span>
                      {item.binCode && (
                        <>
                          <span>•</span>
                          <span>Hücre: <strong className="text-[--text]">{item.binCode}</strong></span>
                        </>
                      )}
                    </div>
                  </div>
                </div>

                {/* Stok Miktarları */}
                <div className="grid grid-cols-3 gap-3 text-xs w-full lg:w-auto">
                  <div className="bg-[--muted-bg]/60 p-3 rounded-xl border border-[--line] text-right">
                    <div className="text-[10px] text-[--text-muted]">Teslim Alınan</div>
                    <div className="font-semibold text-[--text] mt-0.5 font-mono tabular-nums">
                      {safeNumber(item.receivedConsignQty)} {safeText(item.item?.baseUnit, 'Adet')}
                    </div>
                  </div>

                  <div className="bg-[--brand-soft]/50 p-3 rounded-xl border border-[--brand-line] text-right">
                    <div className="text-[10px] text-[--brand]">Kullanılabilir Konsinye</div>
                    <div className="font-semibold text-[--brand] mt-0.5 font-mono tabular-nums">
                      {safeNumber(item.availableConsignQty)} {safeText(item.item?.baseUnit, 'Adet')}
                    </div>
                  </div>

                  <div className="bg-[--muted-bg]/60 p-3 rounded-xl border border-[--line] text-right">
                    <div className="text-[10px] text-[--text-muted]">Satılan / Tüketilen</div>
                    <div className="font-semibold text-[--text] mt-0.5 font-mono tabular-nums">
                      {safeNumber(item.consumedOrSoldQty)} {safeText(item.item?.baseUnit, 'Adet')}
                    </div>
                  </div>
                </div>

                {/* Hakediş ve Aksiyon Butonu */}
                <div className="flex items-center gap-3 w-full lg:w-auto justify-end">
                  <div className="text-right">
                    <div className="text-[10px] text-[--text-muted]">Ödenecek Hakediş</div>
                    <div className="text-sm font-semibold text-[--brand] font-mono tabular-nums">
                      {safeCurrency(item.unbilledPayableAmt)}
                    </div>
                  </div>

                  <button
                    onClick={() => {
                      setSelectedRecord(item);
                      setConsumeQty('5');
                    }}
                    disabled={safeNumber(item.availableConsignQty) <= 0}
                    className="inline-flex items-center gap-1.5 px-4 py-2 bg-gradient-to-r from-[--brand] to-[--blue] hover:opacity-95 text-white rounded-full text-xs font-semibold shadow-sm shadow-[--brand]/20 transition active:scale-95 disabled:opacity-50 cursor-pointer"
                  >
                    <MinusCircle className="w-3.5 h-3.5" />
                    Satış / Sarfiyat Düş
                  </button>
                </div>
              </div>

              <div className="text-[11px] text-[--text-muted] flex items-center justify-between">
                <span>Anlaşılan Birim Maliyet: <strong className="text-[--text] font-mono">{safeCurrency(item.agreedUnitCost)}</strong> / Adet</span>
                {item.lastSettlementDate && (
                  <span>Son Hakediş Tarihi: {safeDate(item.lastSettlementDate)}</span>
                )}
              </div>
            </div>
          ))
        )}
      </div>

      {/* Sarfiyat Düşme Modalı */}
      {selectedRecord && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[--navy]/40 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white border border-[--line] rounded-2xl w-full max-w-md p-6 shadow-xl relative text-[--text]">
            <h3 className="text-base font-semibold text-[--text] flex items-center gap-2 pb-3 border-b border-[--line]">
              <MinusCircle className="w-5 h-5 text-[--brand]" />
              Konsinye Stok Tüketim Girişi
            </h3>

            <form onSubmit={handleSettleSubmit} className="mt-4 space-y-4">
              <div>
                <label className="block text-xs font-medium text-[--text-muted] mb-1">
                  Ürün ve Anlaşma
                </label>
                <div className="text-xs font-semibold text-[--text] bg-[--muted-bg] p-2.5 rounded-xl border border-[--line]">
                  {safeText(selectedRecord.item?.name)} ({safeText(selectedRecord.agreementNo)})
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-[--text-muted] mb-1">
                  Düşülecek Miktar ({safeText(selectedRecord.item?.baseUnit, 'Adet')})
                </label>
                <input
                  type="number"
                  min="1"
                  max={selectedRecord.availableConsignQty}
                  value={consumeQty}
                  onChange={(e) => setConsumeQty(e.target.value)}
                  required
                  className="w-full text-xs bg-white border border-[--line] text-[--text] rounded-xl p-2.5 font-bold focus:border-[--brand] focus:ring-1 focus:ring-[--brand] focus:outline-none"
                />
                <span className="text-[11px] text-[--text-muted] mt-1 block">
                  Kullanılabilir emanet stok: {safeNumber(selectedRecord.availableConsignQty)} {safeText(selectedRecord.item?.baseUnit, 'Adet')}
                </span>
              </div>

              <div>
                <label className="block text-xs font-medium text-[--text-muted] mb-1">
                  Açıklama / Tüketim Yeri
                </label>
                <input
                  type="text"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="w-full text-xs bg-white border border-[--line] text-[--text] rounded-xl p-2.5 focus:border-[--brand] focus:ring-1 focus:ring-[--brand] focus:outline-none"
                />
              </div>

              <div className="pt-3 border-t border-[--line] flex justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setSelectedRecord(null)}
                  className="px-4 py-2 border border-[--line] bg-white text-[--text-2] hover:bg-[--muted-bg] text-xs font-medium rounded-full transition cursor-pointer"
                >
                  İptal
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2 bg-gradient-to-r from-[--brand] to-[--blue] hover:opacity-95 text-white text-xs font-semibold rounded-full shadow-sm shadow-[--brand]/20 transition disabled:opacity-50 cursor-pointer"
                >
                  {submitting ? 'İşleniyor...' : 'Hakedişi Onayla ve Düş'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
