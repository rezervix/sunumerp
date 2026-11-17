'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import {
  Activity,
  AlertTriangle,
  BarChart3,
  CheckCircle2,
  CreditCard,
  Plus,
  ShieldCheck,
  Webhook,
} from 'lucide-react';
import { toast } from 'sonner';
import {
  LEGAL_MIN_RETURN_DAYS,
  RMA_CREDIT_STATUS_LABELS,
  RMA_REASON_CODES,
  RMA_REASON_LABELS,
  type RmaCreditNoteStatus,
  type RmaReasonCode,
} from '@/lib/logistics/returns/constantsAndHelpers';

export function RmaCreditNotesPanel({
  creditNotes,
  onUpdated,
}: {
  creditNotes: any[];
  onUpdated: () => void;
}) {
  const [busyId, setBusyId] = useState<string | null>(null);

  const handleAction = async (
    creditNoteId: string,
    rmaId: string,
    creditAction: 'APPROVE' | 'ISSUE_AND_PAY' | 'REJECT'
  ) => {
    setBusyId(creditNoteId);
    try {
      const res = await fetch('/api/omnichannel', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'process_credit_note',
          creditAction,
          creditNoteId,
          rmaId,
          closeRma: creditAction === 'ISSUE_AND_PAY',
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Kredi notası işlemi başarısız');
      }
      toast.success(data.message || 'Kredi notası güncellendi.');
      onUpdated();
    } catch (err: any) {
      toast.error(err.message || 'İşlem hatası');
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div className="bg-[#111513]/90 border border-white/[0.06] rounded-[20px] overflow-hidden">
      <div className="p-5 border-b border-white/[0.06] flex items-center justify-between">
        <div>
          <h4 className="text-sm font-semibold text-white flex items-center gap-2">
            <CreditCard className="w-4 h-4 text-[#34D399]" />
            İade Kredi Notaları &amp; Mali Onay Kuyruğu ({creditNotes.length})
          </h4>
          <p className="text-xs text-zinc-400 mt-0.5">
            Fiziksel mal kabul + kalite kararı sonrası onaylanan kredi notaları Finance giderine ve GİB E-Belgeye bağlanır
          </p>
        </div>
      </div>

      {creditNotes.length === 0 ? (
        <div className="text-center py-10 text-xs text-zinc-500">
          Henüz oluşturulmuş kredi notası bulunmuyor.
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead>
              <tr className="bg-white/[0.02] border-b border-white/[0.06] text-zinc-400 uppercase text-[10px] tracking-wider">
                <th className="py-3 px-4">Kredi Notası / RMA</th>
                <th className="py-3 px-3">Müşteri / Sipariş</th>
                <th className="py-3 px-3 text-right">Net / KDV / Brüt</th>
                <th className="py-3 px-3">E-Belge &amp; Finans</th>
                <th className="py-3 px-3 text-center">Durum</th>
                <th className="py-3 px-4 text-right">Mali İşlem</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/[0.04]">
              {creditNotes.map((cn) => (
                <tr key={cn.id} className="hover:bg-white/[0.02]">
                  <td className="py-3.5 px-4">
                    <div className="font-mono font-semibold text-white">{cn.creditNoteNo}</div>
                    <div className="text-[11px] font-mono text-zinc-500">{cn.rmaNumber}</div>
                  </td>
                  <td className="py-3.5 px-3">
                    <div className="text-white font-medium">{cn.customerName}</div>
                    <div className="text-[11px] font-mono text-zinc-500">{cn.orderNumber}</div>
                  </td>
                  <td className="py-3.5 px-3 text-right font-mono">
                    <div className="text-[#34D399] font-semibold">
                      ₺{Number(cn.grossAmount || 0).toLocaleString('tr-TR')}
                    </div>
                    <div className="text-[10px] text-zinc-500">
                      Net ₺{cn.netAmount} + KDV ₺{cn.vatAmount}
                    </div>
                  </td>
                  <td className="py-3.5 px-3 font-mono text-[11px] text-zinc-300">
                    <div>E-Belge: {cn.eDocumentNo || '-'}</div>
                    <div className="text-zinc-500">Finans: {cn.financeId || '-'}</div>
                  </td>
                  <td className="py-3.5 px-3 text-center">
                    <span className="inline-flex px-2.5 py-0.5 rounded-full text-[10px] font-medium bg-white/[0.06] text-zinc-200 border border-white/[0.08]">
                      {RMA_CREDIT_STATUS_LABELS[cn.status as RmaCreditNoteStatus] || cn.status}
                    </span>
                  </td>
                  <td className="py-3.5 px-4 text-right">
                    <div className="inline-flex gap-1.5">
                      {cn.status === 'TASLAK_ONAY_BEKLIYOR' && (
                        <button
                          type="button"
                          disabled={busyId === cn.id}
                          onClick={() => handleAction(cn.id, cn.rmaId, 'APPROVE')}
                          className="px-2.5 py-1 rounded-full bg-sky-500/20 text-sky-200 border border-sky-500/30 text-[11px] font-semibold cursor-pointer"
                        >
                          Onayla
                        </button>
                      )}
                      {(cn.status === 'TASLAK_ONAY_BEKLIYOR' || cn.status === 'ONAYLANDI') && (
                        <button
                          type="button"
                          disabled={busyId === cn.id}
                          onClick={() => handleAction(cn.id, cn.rmaId, 'ISSUE_AND_PAY')}
                          className="px-2.5 py-1 rounded-full bg-[#34D399] text-[#061811] text-[11px] font-semibold cursor-pointer"
                        >
                          Öde &amp; Kapat
                        </button>
                      )}
                      {cn.status === 'TASLAK_ONAY_BEKLIYOR' && (
                        <button
                          type="button"
                          disabled={busyId === cn.id}
                          onClick={() => handleAction(cn.id, cn.rmaId, 'REJECT')}
                          className="px-2.5 py-1 rounded-full bg-rose-500/15 text-rose-300 border border-rose-500/30 text-[11px] font-semibold cursor-pointer"
                        >
                          Reddet
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

export function RmaPoliciesPanel({
  policies,
  items,
  onUpdated,
}: {
  policies: any[];
  items: any[];
  onUpdated: () => void;
}) {
  const [policyKey, setPolicyKey] = useState('');
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState('');
  const [itemId, setItemId] = useState('');
  const [returnWindowDays, setReturnWindowDays] = useState(14);
  const [warrantyMonths, setWarrantyMonths] = useState(0);
  const [restockable, setRestockable] = useState(true);
  const [requireInspection, setRequireInspection] = useState(true);
  const [saving, setSaving] = useState(false);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (returnWindowDays < LEGAL_MIN_RETURN_DAYS) {
      toast.error(`Yasal asgari iade süresi ${LEGAL_MIN_RETURN_DAYS} günden az olamaz.`);
      return;
    }
    setSaving(true);
    try {
      const res = await fetch('/api/omnichannel', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'upsert_return_policy',
          policyKey: policyKey.trim() || `POL-${Date.now().toString().slice(-5)}`,
          title: title.trim(),
          category: category.trim() || null,
          itemId: itemId || null,
          returnWindowDays: Number(returnWindowDays),
          warrantyMonths: Number(warrantyMonths),
          restockable,
          requireInspection,
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Politika kaydedilemedi');
      }
      toast.success(data.message || 'İade politikası kaydedildi.');
      setPolicyKey('');
      setTitle('');
      setCategory('');
      setItemId('');
      onUpdated();
    } catch (err: any) {
      toast.error(err.message || 'Politika hatası');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
      <div className="lg:col-span-2 bg-[#111513]/90 border border-white/[0.06] rounded-[20px] overflow-hidden">
        <div className="p-5 border-b border-white/[0.06]">
          <h4 className="text-sm font-semibold text-white flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-[#34D399]" />
            Ürün / Kategori Bazlı İade &amp; Garanti Politikaları ({policies.length})
          </h4>
          <p className="text-xs text-zinc-400 mt-0.5">
            Yasal asgari 14 gün kuralı korunur; ürün veya kategoriye göre daha uzun süre ve garanti ayı tanımlanabilir
          </p>
        </div>

        <div className="divide-y divide-white/[0.04]">
          {policies.length === 0 ? (
            <div className="py-10 text-center text-xs text-zinc-500">
              Henüz özel iade politikası tanımlanmamış (varsayılan 14 gün yasal süre uygulanır).
            </div>
          ) : (
            policies.map((pol) => (
              <div key={pol.id} className="p-4 flex items-center justify-between gap-4 text-xs">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-white">{pol.title}</span>
                    <span className="font-mono text-[10px] px-2 py-0.5 rounded bg-white/[0.06] text-zinc-300">
                      {pol.policyKey}
                    </span>
                  </div>
                  <div className="text-zinc-400 mt-1">
                    Kapsam: {pol.itemId ? `Ürün (${pol.itemId})` : pol.category || 'Genel Varsayılan'} ·{' '}
                    {pol.restockable ? 'Stoğa Dönüş Uygun' : 'Tekrar Satışa Kapalı'}
                  </div>
                </div>
                <div className="text-right font-mono shrink-0">
                  <div className="text-[#34D399] font-bold">{pol.returnWindowDays} Gün</div>
                  <div className="text-[11px] text-zinc-400">
                    {pol.warrantyMonths > 0 ? `${pol.warrantyMonths} Ay Garanti` : 'Garantisiz'}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      <form
        onSubmit={handleSave}
        className="bg-[#111513]/90 border border-white/[0.06] rounded-[20px] p-5 space-y-3 text-xs"
      >
        <h4 className="text-sm font-semibold text-white flex items-center gap-2">
          <Plus className="w-4 h-4 text-[#34D399]" />
          Yeni Politika Ekle / Güncelle
        </h4>
        <div>
          <label className="text-zinc-400 block mb-1">Politika Anahtarı *</label>
          <input
            required
            value={policyKey}
            onChange={(e) => setPolicyKey(e.target.value)}
            placeholder="ör. SERAMIK_30_GUN"
            className="w-full bg-black/40 border border-white/[0.08] rounded-xl px-3 py-2 text-white font-mono"
          />
        </div>
        <div>
          <label className="text-zinc-400 block mb-1">Başlık *</label>
          <input
            required
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Seramik & Aksesuar 30 Gün İade + 12 Ay Garanti"
            className="w-full bg-black/40 border border-white/[0.08] rounded-xl px-3 py-2 text-white"
          />
        </div>
        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="text-zinc-400 block mb-1">İade Süresi (Gün ≥14)</label>
            <input
              type="number"
              min={14}
              value={returnWindowDays}
              onChange={(e) => setReturnWindowDays(Number(e.target.value || 14))}
              className="w-full bg-black/40 border border-white/[0.08] rounded-xl px-3 py-2 text-white font-mono"
            />
          </div>
          <div>
            <label className="text-zinc-400 block mb-1">Garanti (Ay)</label>
            <input
              type="number"
              min={0}
              value={warrantyMonths}
              onChange={(e) => setWarrantyMonths(Number(e.target.value || 0))}
              className="w-full bg-black/40 border border-white/[0.08] rounded-xl px-3 py-2 text-white font-mono"
            />
          </div>
        </div>
        <div>
          <label className="text-zinc-400 block mb-1">Kategori (Opsiyonel)</label>
          <input
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            placeholder="ör. Aksesuar veya Kesme Çiçek"
            className="w-full bg-black/40 border border-white/[0.08] rounded-xl px-3 py-2 text-white"
          />
        </div>
        <div>
          <label className="text-zinc-400 block mb-1">Belirli Ürün (Opsiyonel)</label>
          <select
            value={itemId}
            onChange={(e) => setItemId(e.target.value)}
            className="w-full bg-black/40 border border-white/[0.08] rounded-xl px-3 py-2 text-white"
          >
            <option value="" className="bg-[#111513]">Tüm Kategori / Genel</option>
            {items.map((it) => (
              <option key={it.id} value={it.id} className="bg-[#111513]">
                {it.sku} — {it.name}
              </option>
            ))}
          </select>
        </div>
        <label className="flex items-center gap-2 text-zinc-300 cursor-pointer">
          <input
            type="checkbox"
            checked={restockable}
            onChange={(e) => setRestockable(e.target.checked)}
          />
          Sağlam ürünler yeniden stoğa alınabilir
        </label>
        <label className="flex items-center gap-2 text-zinc-300 cursor-pointer">
          <input
            type="checkbox"
            checked={requireInspection}
            onChange={(e) => setRequireInspection(e.target.checked)}
          />
          Fiziksel kalite muayenesi zorunlu
        </label>
        <button
          type="submit"
          disabled={saving}
          className="w-full py-2.5 rounded-full bg-[#34D399] hover:bg-[#34D399]/90 text-[#061811] font-semibold cursor-pointer disabled:opacity-50"
        >
          {saving ? 'Kaydediliyor...' : 'Politikayı Kaydet'}
        </button>
      </form>
    </div>
  );
}

export function RmaWebhookLogsPanel({
  logs,
  logisticsDemoMode,
  onUpdated,
}: {
  logs: any[];
  logisticsDemoMode: boolean;
  onUpdated: () => void;
}) {
  const [simChannel, setSimChannel] = useState('TRENDYOL');
  const [simOrderNo, setSimOrderNo] = useState('OMN-2026-9041');
  const [simReasonCode, setSimReasonCode] = useState<RmaReasonCode>('HASARLI_KARGO');
  const [simQty, setSimQty] = useState(1);
  const [simulating, setSimulating] = useState(false);

  const handleSimulateWebhook = async () => {
    setSimulating(true);
    try {
      const res = await fetch('/api/omnichannel', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'simulate_return_webhook',
          channelCode: simChannel,
          orderNumber: simOrderNo,
          reasonCode: simReasonCode,
          quantity: simQty,
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Webhook simülasyonu başarısız');
      }
      toast.success(data.message || 'İmzalı webhook işlendi!');
      onUpdated();
    } catch (err: any) {
      toast.error(err.message || 'Simülasyon hatası');
    } finally {
      setSimulating(false);
    }
  };

  return (
    <div className="space-y-4">
      {logisticsDemoMode && (
        <div className="bg-[#111513]/90 border border-emerald-500/25 rounded-[20px] p-4 flex flex-wrap items-end justify-between gap-3 text-xs">
          <div>
            <div className="font-semibold text-[#34D399] flex items-center gap-1.5">
              <Webhook className="w-4 h-4" />
              Demo Pazaryeri HMAC İade Webhook Simülatörü
            </div>
            <p className="text-zinc-400 mt-0.5">
              Yalnızca demo modunda aktiftir; payload&apos;u HMAC-SHA256 ile imzalayıp idempotency kontrollü RMA üretir.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <select
              value={simChannel}
              onChange={(e) => setSimChannel(e.target.value)}
              className="bg-black/40 border border-white/[0.08] rounded-xl px-2.5 py-1.5 text-white"
            >
              <option value="TRENDYOL" className="bg-[#111513]">TRENDYOL</option>
              <option value="HEPSIBURADA" className="bg-[#111513]">HEPSIBURADA</option>
              <option value="SHOPIFY" className="bg-[#111513]">SHOPIFY</option>
            </select>
            <input
              value={simOrderNo}
              onChange={(e) => setSimOrderNo(e.target.value)}
              className="w-36 bg-black/40 border border-white/[0.08] rounded-xl px-2.5 py-1.5 text-white font-mono"
            />
            <select
              value={simReasonCode}
              onChange={(e) => setSimReasonCode(e.target.value as RmaReasonCode)}
              className="bg-black/40 border border-white/[0.08] rounded-xl px-2.5 py-1.5 text-white"
            >
              {RMA_REASON_CODES.map((c) => (
                <option key={c} value={c} className="bg-[#111513]">
                  {RMA_REASON_LABELS[c]}
                </option>
              ))}
            </select>
            <input
              type="number"
              min={1}
              value={simQty}
              onChange={(e) => setSimQty(Number(e.target.value || 1))}
              className="w-16 bg-black/40 border border-white/[0.08] rounded-xl px-2.5 py-1.5 text-white font-mono"
            />
            <button
              type="button"
              disabled={simulating}
              onClick={handleSimulateWebhook}
              data-testid="simulate-return-webhook-btn"
              className="px-4 py-1.5 rounded-full bg-[#34D399] hover:bg-[#34D399]/90 text-[#061811] font-semibold cursor-pointer disabled:opacity-50"
            >
              {simulating ? 'Gönderiliyor...' : 'İmzalı Webhook Gönder'}
            </button>
          </div>
        </div>
      )}

      <div className="bg-[#111513]/90 border border-white/[0.06] rounded-[20px] overflow-hidden">
        <div className="p-5 border-b border-white/[0.06]">
          <h4 className="text-sm font-semibold text-white flex items-center gap-2">
            <Activity className="w-4 h-4 text-[#34D399]" />
            E-Ticaret İade Webhook Günlüğü ({logs.length})
          </h4>
          <p className="text-xs text-zinc-400 mt-0.5">
            HMAC imza doğrulama, tekrar (idempotency) tekilleştirme ve dış kanal durum geri bildirim kayıtları
          </p>
        </div>
        {logs.length === 0 ? (
          <div className="py-10 text-center text-xs text-zinc-500">
            Henüz kaydedilmiş iade webhook olayı bulunmuyor.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead>
                <tr className="bg-white/[0.02] border-b border-white/[0.06] text-zinc-400 uppercase text-[10px] tracking-wider">
                  <th className="py-3 px-4">Yön / Kanal</th>
                  <th className="py-3 px-3">Olay / RMA</th>
                  <th className="py-3 px-3">İmza</th>
                  <th className="py-3 px-3">Durum</th>
                  <th className="py-3 px-3">Yanıt Notu</th>
                  <th className="py-3 px-4 text-right">Tarih</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/[0.04]">
                {logs.map((log) => (
                  <tr key={log.id} className="hover:bg-white/[0.02]">
                    <td className="py-3 px-4 font-mono">
                      <span className="px-1.5 py-0.5 rounded bg-white/[0.06] text-zinc-300 mr-1.5 text-[10px]">
                        {log.direction}
                      </span>
                      <span className="text-white">{log.channelCode}</span>
                    </td>
                    <td className="py-3 px-3 font-mono">
                      <div className="text-white">{log.eventType}</div>
                      <div className="text-[10px] text-[#34D399]">{log.rmaNumber || log.externalRef || '-'}</div>
                    </td>
                    <td className="py-3 px-3">
                      {log.signatureVerified ? (
                        <span className="text-[#34D399] inline-flex items-center gap-1">
                          <CheckCircle2 className="w-3.5 h-3.5" /> Doğrulandı
                        </span>
                      ) : (
                        <span className="text-rose-300 inline-flex items-center gap-1">
                          <AlertTriangle className="w-3.5 h-3.5" /> Geçersiz
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-3 font-mono">
                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] ${
                          log.status === 'ACCEPTED'
                            ? 'bg-emerald-500/15 text-[#34D399]'
                            : log.status === 'DUPLICATE'
                              ? 'bg-amber-500/15 text-amber-300'
                              : 'bg-rose-500/15 text-rose-300'
                        }`}
                      >
                        {log.status}
                      </span>
                    </td>
                    <td className="py-3 px-3 text-zinc-400 max-w-xs truncate">
                      {log.responseNote || '-'}
                    </td>
                    <td className="py-3 px-4 text-right font-mono text-[10px] text-zinc-500">
                      {new Date(log.createdAt).toLocaleString('tr-TR')}
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

export function RmaAnalyticsPanel({ analytics }: { analytics: any | null }) {
  if (!analytics) {
    return (
      <div className="bg-[#111513]/90 border border-white/[0.06] rounded-[20px] p-8 text-center text-xs text-zinc-500">
        İade analitiği verileri yükleniyor veya henüz kayıt bulunmuyor.
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* Üst KPI Kartları */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <div className="bg-[#111513]/90 border border-white/[0.06] rounded-2xl p-4">
          <div className="text-[11px] uppercase text-zinc-400">İade Oranı</div>
          <div className="text-2xl font-light text-[#34D399] mt-1">
            %{analytics.returnRatePercent}
          </div>
          <div className="text-[10px] text-zinc-500 mt-1">
            {analytics.totalReturnedQty} / {analytics.totalSoldQty} Adet
          </div>
        </div>
        <div className="bg-[#111513]/90 border border-white/[0.06] rounded-2xl p-4">
          <div className="text-[11px] uppercase text-zinc-400">Açık / Karantina</div>
          <div className="text-2xl font-light text-white mt-1">
            {analytics.openRmas}{' '}
            <span className="text-sm text-amber-300">/ {analytics.quarantineWaitingCount}</span>
          </div>
          <div className="text-[10px] text-zinc-500 mt-1">
            Süresi yaklaşan: {analytics.expiringSoonCount}
          </div>
        </div>
        <div className="bg-[#111513]/90 border border-white/[0.06] rounded-2xl p-4">
          <div className="text-[11px] uppercase text-zinc-400">Ort. Çevrim Süresi</div>
          <div className="text-2xl font-light text-white mt-1">{analytics.avgCycleHours} sa</div>
          <div className="text-[10px] text-zinc-500 mt-1">Kapanan: {analytics.closedRmas}</div>
        </div>
        <div className="bg-[#111513]/90 border border-white/[0.06] rounded-2xl p-4">
          <div className="text-[11px] uppercase text-zinc-400">Toplam İade Tutarı</div>
          <div className="text-2xl font-light text-rose-300 mt-1">
            ₺{Number(analytics.totalRefundAmountTry || 0).toLocaleString('tr-TR')}
          </div>
          <div className="text-[10px] text-zinc-500 mt-1">
            Maliyet etkisi: ₺{Number(analytics.totalCostImpactTry || 0).toLocaleString('tr-TR')}
          </div>
        </div>
        <div className="bg-[#111513]/90 border border-white/[0.06] rounded-2xl p-4">
          <div className="text-[11px] uppercase text-zinc-400">Net Kurtarma Oranı</div>
          <div className="text-2xl font-light text-[#34D399] mt-1">
            %{analytics.netRecoveryPercent}
          </div>
          <div className="text-[10px] text-zinc-500 mt-1">
            Kazanım: ₺{Number(analytics.totalRecoveredValueTry || 0).toLocaleString('tr-TR')}
          </div>
        </div>
      </div>

      {/* Neden Dağılımı & Karar Dağılımı */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <div className="bg-[#111513]/90 border border-white/[0.06] rounded-[20px] p-5 space-y-3">
          <div className="flex items-center justify-between gap-2">
            <h4 className="text-sm font-semibold text-white flex items-center gap-2">
              <BarChart3 className="w-4 h-4 text-[#34D399]" />
              Neden Koduna Göre İade Dağılımı
            </h4>
            <Link
              href="/dashboard/lojistik-raporlar?module=omnichannel"
              className="text-xs text-[#34D399] hover:underline font-medium px-2.5 py-1 rounded-full bg-[#34D399]/10 border border-[#34D399]/20 shrink-0"
            >
              Raporlar&apos;a Git →
            </Link>
          </div>
          <div className="space-y-2.5">
            {(analytics.byReason || []).map((r: any) => (
              <div key={r.reasonCode} className="space-y-1 text-xs">
                <div className="flex justify-between">
                  <span className="text-zinc-200">{r.label}</span>
                  <span className="font-mono text-zinc-400">
                    {r.count} talep (%{r.sharePercent}) · ₺{r.amountTry}
                  </span>
                </div>
                <div className="h-1.5 rounded-full bg-white/[0.06] overflow-hidden">
                  <div
                    className="h-full bg-[#34D399] rounded-full"
                    style={{ width: `${Math.min(100, r.sharePercent)}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-[#111513]/90 border border-white/[0.06] rounded-[20px] p-5 space-y-3">
          <h4 className="text-sm font-semibold text-white">Kalite Kararı &amp; Kanal Özeti</h4>
          <div className="space-y-2 text-xs">
            {(analytics.byDecision || []).map((d: any) => (
              <div
                key={d.decision}
                className="flex items-center justify-between bg-black/30 rounded-xl px-3 py-2 border border-white/[0.04]"
              >
                <span className="text-zinc-200">{d.label}</span>
                <span className="font-mono text-zinc-300">
                  {d.count} RMA · Kazanım ₺{Math.round(d.recoveredTry)} / Maliyet ₺{Math.round(d.costTry)}
                </span>
              </div>
            ))}
          </div>
          <div className="pt-2 border-t border-white/[0.06] space-y-1.5 text-xs">
            <div className="text-[11px] uppercase text-zinc-400">Satış Kanalları</div>
            {(analytics.byChannel || []).map((c: any) => (
              <div key={c.channelCode} className="flex justify-between text-zinc-300">
                <span className="font-mono">{c.channelCode}</span>
                <span className="font-mono">
                  {c.rmaCount} RMA · {c.qty} Adet · ₺{Math.round(c.refundAmountTry)}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Ürün Bazlı & Tedarikçi Bazlı Analiz */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <div className="bg-[#111513]/90 border border-white/[0.06] rounded-[20px] overflow-hidden">
          <div className="p-4 border-b border-white/[0.06] text-xs font-semibold text-white">
            Ürün (SKU) Bazlı İade Analizi
          </div>
          <table className="w-full text-xs text-left">
            <thead>
              <tr className="bg-white/[0.02] text-[10px] text-zinc-400 uppercase">
                <th className="py-2.5 px-4">SKU / Ürün</th>
                <th className="py-2.5 px-2 text-right">Adet</th>
                <th className="py-2.5 px-4 text-right">Başlıca Neden</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/[0.04]">
              {(analytics.byProduct || []).map((p: any) => (
                <tr key={p.sku}>
                  <td className="py-2.5 px-4">
                    <div className="text-white font-medium">{p.itemName}</div>
                    <div className="text-[10px] font-mono text-zinc-500">{p.sku}</div>
                  </td>
                  <td className="py-2.5 px-2 text-right font-mono text-[#34D399]">
                    {p.returnedQty} ({p.rmaCount}x)
                  </td>
                  <td className="py-2.5 px-4 text-right text-zinc-300">
                    {p.primaryReasonLabel}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="bg-[#111513]/90 border border-white/[0.06] rounded-[20px] overflow-hidden">
          <div className="p-4 border-b border-white/[0.06] text-xs font-semibold text-white">
            Tedarikçi Bazlı İade &amp; RTV Maliyet Analizi
          </div>
          <table className="w-full text-xs text-left">
            <thead>
              <tr className="bg-white/[0.02] text-[10px] text-zinc-400 uppercase">
                <th className="py-2.5 px-4">Tedarikçi</th>
                <th className="py-2.5 px-2 text-right">RMA / RTV / Hurda</th>
                <th className="py-2.5 px-4 text-right">Maliyet Etkisi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/[0.04]">
              {(analytics.bySupplier || []).map((s: any) => (
                <tr key={s.supplierId}>
                  <td className="py-2.5 px-4 text-white font-medium">{s.supplierName}</td>
                  <td className="py-2.5 px-2 text-right font-mono text-zinc-300">
                    {s.rmaCount} / {s.rtvCount} / {s.scrapCount}
                  </td>
                  <td className="py-2.5 px-4 text-right font-mono text-rose-300">
                    ₺{Number(s.totalCostTry || 0).toLocaleString('tr-TR')}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
