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
import { safeText, safeNumber, safeCurrency, safeDate } from '@/lib/utils/safe-display';

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
    <div className="bg-white/80 backdrop-blur-xl border border-[--line] rounded-[20px] overflow-hidden shadow-sm">
      <div className="p-5 border-b border-[--line] flex items-center justify-between">
        <div>
          <h4 className="text-sm font-semibold text-[--text] flex items-center gap-2">
            <CreditCard className="w-4 h-4 text-[--brand]" />
            İade Kredi Notaları &amp; Mali Onay Kuyruğu ({(creditNotes || []).length})
          </h4>
          <p className="text-xs text-[--text-muted] mt-0.5">
            Fiziksel mal kabul + kalite kararı sonrası onaylanan kredi notaları Finance giderine ve GİB E-Belgeye bağlanır
          </p>
        </div>
      </div>

      {(creditNotes || []).length === 0 ? (
        <div className="text-center py-12 text-xs text-[--text-muted]">
          Henüz oluşturulmuş kredi notası bulunmuyor.
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left border-collapse">
            <thead>
              <tr className="bg-[--muted-bg]/50 border-b border-[--line] text-[--text-muted] uppercase text-[10px] tracking-wider font-medium">
                <th className="py-3 px-4">Kredi Notası / RMA</th>
                <th className="py-3 px-3">Müşteri / Sipariş</th>
                <th className="py-3 px-3 text-right">Net / KDV / Brüt</th>
                <th className="py-3 px-3">E-Belge &amp; Finans</th>
                <th className="py-3 px-3 text-center">Durum</th>
                <th className="py-3 px-4 text-right">Mali İşlem</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[--line]">
              {creditNotes.map((cn) => (
                <tr key={cn.id} className="hover:bg-[--brand-soft]/30 transition text-[--text-2]">
                  <td className="py-3.5 px-4">
                    <div className="font-mono font-semibold text-[--brand]">{safeText(cn.creditNoteNo)}</div>
                    <div className="text-[11px] font-mono text-[--text-muted]">{safeText(cn.rmaNumber)}</div>
                  </td>
                  <td className="py-3.5 px-3">
                    <div className="text-[--text] font-medium">{safeText(cn.customerName)}</div>
                    <div className="text-[11px] font-mono text-[--text-muted]">{safeText(cn.orderNumber)}</div>
                  </td>
                  <td className="py-3.5 px-3 text-right font-mono tabular-nums">
                    <div className="text-[--brand] font-semibold">
                      {safeCurrency(cn.grossAmount)}
                    </div>
                    <div className="text-[10px] text-[--text-muted]">
                      Net {safeCurrency(cn.netAmount)} + KDV {safeCurrency(cn.vatAmount)}
                    </div>
                  </td>
                  <td className="py-3.5 px-3 font-mono text-[11px] text-[--text-2]">
                    <div>E-Belge: {safeText(cn.eDocumentNo, '-')}</div>
                    <div className="text-[--text-muted]">Finans: {safeText(cn.financeId, '-')}</div>
                  </td>
                  <td className="py-3.5 px-3 text-center">
                    <span className="inline-flex px-2.5 py-0.5 rounded-full text-[10px] font-medium bg-[--muted-bg] text-[--text] border border-[--line]">
                      {RMA_CREDIT_STATUS_LABELS[cn.status as RmaCreditNoteStatus] || safeText(cn.status)}
                    </span>
                  </td>
                  <td className="py-3.5 px-4 text-right">
                    <div className="inline-flex gap-1.5">
                      {cn.status === 'TASLAK_ONAY_BEKLIYOR' && (
                        <button
                          type="button"
                          disabled={busyId === cn.id}
                          onClick={() => handleAction(cn.id, cn.rmaId, 'APPROVE')}
                          className="px-2.5 py-1 rounded-full bg-[--brand-soft] text-[--brand] border border-[--brand-line] text-[11px] font-semibold cursor-pointer hover:bg-[--brand-soft]/80 transition"
                        >
                          Onayla
                        </button>
                      )}
                      {(cn.status === 'TASLAK_ONAY_BEKLIYOR' || cn.status === 'ONAYLANDI') && (
                        <button
                          type="button"
                          disabled={busyId === cn.id}
                          onClick={() => handleAction(cn.id, cn.rmaId, 'ISSUE_AND_PAY')}
                          className="px-2.5 py-1 rounded-full bg-gradient-to-r from-[--brand] to-[--blue] text-white text-[11px] font-semibold cursor-pointer hover:opacity-95 transition shadow-sm"
                        >
                          Öde &amp; Kapat
                        </button>
                      )}
                      {cn.status === 'TASLAK_ONAY_BEKLIYOR' && (
                        <button
                          type="button"
                          disabled={busyId === cn.id}
                          onClick={() => handleAction(cn.id, cn.rmaId, 'REJECT')}
                          className="px-2.5 py-1 rounded-full bg-[--bad-soft] text-[--bad] border border-[--bad]/25 text-[11px] font-semibold cursor-pointer hover:bg-[--bad-soft]/80 transition"
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
      <div className="lg:col-span-2 bg-white/80 backdrop-blur-xl border border-[--line] rounded-[20px] overflow-hidden shadow-sm">
        <div className="p-5 border-b border-[--line]">
          <h4 className="text-sm font-semibold text-[--text] flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-[--brand]" />
            Ürün / Kategori Bazlı İade &amp; Garanti Politikaları ({(policies || []).length})
          </h4>
          <p className="text-xs text-[--text-muted] mt-0.5">
            Yasal asgari 14 gün kuralı korunur; ürün veya kategoriye göre daha uzun süre ve garanti ayı tanımlanabilir
          </p>
        </div>

        <div className="divide-y divide-[--line]">
          {(policies || []).length === 0 ? (
            <div className="py-12 text-center text-xs text-[--text-muted]">
              Henüz özel iade politikası tanımlanmamış (varsayılan 14 gün yasal süre uygulanır).
            </div>
          ) : (
            policies.map((pol) => (
              <div key={pol.id} className="p-4 flex items-center justify-between gap-4 text-xs hover:bg-[--brand-soft]/20 transition">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-[--text]">{safeText(pol.title)}</span>
                    <span className="font-mono text-[10px] px-2 py-0.5 rounded bg-[--muted-bg] text-[--brand] border border-[--line]">
                      {safeText(pol.policyKey)}
                    </span>
                  </div>
                  <div className="text-[--text-muted] mt-1">
                    Kapsam: {pol.itemId ? `Ürün (${safeText(pol.itemId)})` : safeText(pol.category, 'Genel Varsayılan')} ·{' '}
                    {pol.restockable ? 'Stoğa Dönüş Uygun' : 'Tekrar Satışa Kapalı'}
                  </div>
                </div>
                <div className="text-right font-mono shrink-0 tabular-nums">
                  <div className="text-[--brand] font-bold">{safeNumber(pol.returnWindowDays)} Gün</div>
                  <div className="text-[11px] text-[--text-muted]">
                    {safeNumber(pol.warrantyMonths) > 0 ? `${pol.warrantyMonths} Ay Garanti` : 'Garantisiz'}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      <form
        onSubmit={handleSave}
        className="bg-white/80 backdrop-blur-xl border border-[--line] rounded-[20px] p-5 space-y-3 text-xs shadow-sm"
      >
        <h4 className="text-sm font-semibold text-[--text] flex items-center gap-2">
          <Plus className="w-4 h-4 text-[--brand]" />
          Yeni Politika Ekle / Güncelle
        </h4>
        <div>
          <label className="text-[--text-muted] block mb-1">Politika Anahtarı *</label>
          <input
            required
            value={policyKey}
            onChange={(e) => setPolicyKey(e.target.value)}
            placeholder="ör. SERAMIK_30_GUN"
            className="w-full bg-white border border-[--line] rounded-xl px-3 py-2 text-[--text] font-mono focus:border-[--brand] focus:ring-1 focus:ring-[--brand] focus:outline-none"
          />
        </div>
        <div>
          <label className="text-[--text-muted] block mb-1">Başlık *</label>
          <input
            required
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Seramik & Aksesuar 30 Gün İade + 12 Ay Garanti"
            className="w-full bg-white border border-[--line] rounded-xl px-3 py-2 text-[--text] focus:border-[--brand] focus:ring-1 focus:ring-[--brand] focus:outline-none"
          />
        </div>
        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="text-[--text-muted] block mb-1">İade Süresi (Gün ≥14)</label>
            <input
              type="number"
              min={14}
              value={returnWindowDays}
              onChange={(e) => setReturnWindowDays(Number(e.target.value || 14))}
              className="w-full bg-white border border-[--line] rounded-xl px-3 py-2 text-[--text] font-mono focus:border-[--brand] focus:ring-1 focus:ring-[--brand] focus:outline-none"
            />
          </div>
          <div>
            <label className="text-[--text-muted] block mb-1">Garanti (Ay)</label>
            <input
              type="number"
              min={0}
              value={warrantyMonths}
              onChange={(e) => setWarrantyMonths(Number(e.target.value || 0))}
              className="w-full bg-white border border-[--line] rounded-xl px-3 py-2 text-[--text] font-mono focus:border-[--brand] focus:ring-1 focus:ring-[--brand] focus:outline-none"
            />
          </div>
        </div>
        <div>
          <label className="text-[--text-muted] block mb-1">Kategori (Opsiyonel)</label>
          <input
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            placeholder="ör. Aksesuar veya Kesme Çiçek"
            className="w-full bg-white border border-[--line] rounded-xl px-3 py-2 text-[--text] focus:border-[--brand] focus:ring-1 focus:ring-[--brand] focus:outline-none"
          />
        </div>
        <div>
          <label className="text-[--text-muted] block mb-1">Belirli Ürün (Opsiyonel)</label>
          <select
            value={itemId}
            onChange={(e) => setItemId(e.target.value)}
            className="w-full bg-white border border-[--line] rounded-xl px-3 py-2 text-[--text] focus:border-[--brand] focus:ring-1 focus:ring-[--brand] focus:outline-none"
          >
            <option value="">Tüm Kategori / Genel</option>
            {items.map((it) => (
              <option key={it.id} value={it.id}>
                {safeText(it.sku)} — {safeText(it.name)}
              </option>
            ))}
          </select>
        </div>
        <label className="flex items-center gap-2 text-[--text-2] cursor-pointer">
          <input
            type="checkbox"
            checked={restockable}
            onChange={(e) => setRestockable(e.target.checked)}
          />
          Sağlam ürünler yeniden stoğa alınabilir
        </label>
        <label className="flex items-center gap-2 text-[--text-2] cursor-pointer">
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
          className="w-full py-2.5 rounded-full bg-gradient-to-r from-[--brand] to-[--blue] hover:opacity-95 text-[var(--text)] font-semibold cursor-pointer disabled:opacity-50 shadow-sm transition"
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
        <div className="bg-white/80 backdrop-blur-xl border border-[--brand-line] rounded-[20px] p-4 flex flex-wrap items-end justify-between gap-3 text-xs shadow-sm">
          <div>
            <div className="font-semibold text-[--brand] flex items-center gap-1.5">
              <Webhook className="w-4 h-4" />
              Demo Pazaryeri HMAC İade Webhook Simülatörü
            </div>
            <p className="text-[--text-muted] mt-0.5">
              Yalnızca demo modunda aktiftir; payload&apos;u HMAC-SHA256 ile imzalayıp idempotency kontrollü RMA üretir.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <select
              value={simChannel}
              onChange={(e) => setSimChannel(e.target.value)}
              className="bg-white border border-[--line] rounded-xl px-2.5 py-1.5 text-[--text] focus:border-[--brand] focus:ring-1 focus:ring-[--brand] focus:outline-none"
            >
              <option value="TRENDYOL">TRENDYOL</option>
              <option value="HEPSIBURADA">HEPSIBURADA</option>
              <option value="SHOPIFY">SHOPIFY</option>
            </select>
            <input
              value={simOrderNo}
              onChange={(e) => setSimOrderNo(e.target.value)}
              className="w-36 bg-white border border-[--line] rounded-xl px-2.5 py-1.5 text-[--text] font-mono focus:border-[--brand] focus:ring-1 focus:ring-[--brand] focus:outline-none"
            />
            <select
              value={simReasonCode}
              onChange={(e) => setSimReasonCode(e.target.value as RmaReasonCode)}
              className="bg-white border border-[--line] rounded-xl px-2.5 py-1.5 text-[--text] focus:border-[--brand] focus:ring-1 focus:ring-[--brand] focus:outline-none"
            >
              {RMA_REASON_CODES.map((c) => (
                <option key={c} value={c}>
                  {RMA_REASON_LABELS[c]}
                </option>
              ))}
            </select>
            <input
              type="number"
              min={1}
              value={simQty}
              onChange={(e) => setSimQty(Number(e.target.value || 1))}
              className="w-16 bg-white border border-[--line] rounded-xl px-2.5 py-1.5 text-[--text] font-mono font-bold focus:border-[--brand] focus:ring-1 focus:ring-[--brand] focus:outline-none"
            />
            <button
              type="button"
              disabled={simulating}
              onClick={handleSimulateWebhook}
              data-testid="simulate-return-webhook-btn"
              className="px-4 py-1.5 rounded-full bg-gradient-to-r from-[--brand] to-[--blue] hover:opacity-95 text-[var(--text)] font-semibold cursor-pointer disabled:opacity-50 shadow-sm transition"
            >
              {simulating ? 'Gönderiliyor...' : 'İmzalı Webhook Gönder'}
            </button>
          </div>
        </div>
      )}

      <div className="bg-white border border-[--line] rounded-[20px] overflow-hidden shadow-sm">
        <div className="p-5 border-b border-[--line]">
          <h4 className="text-sm font-semibold text-[--text] flex items-center gap-2">
            <Activity className="w-4 h-4 text-[--brand]" />
            E-Ticaret İade Webhook Günlüğü ({(logs || []).length})
          </h4>
          <p className="text-xs text-[--text-muted] mt-0.5">
            HMAC imza doğrulama, tekrar (idempotency) tekilleştirme ve dış kanal durum geri bildirim kayıtları
          </p>
        </div>
        {(logs || []).length === 0 ? (
          <div className="py-12 text-center text-xs text-[--text-muted]">
            Henüz kaydedilmiş iade webhook olayı bulunmuyor.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left border-collapse">
              <thead>
                <tr className="bg-[--muted-bg]/50 border-b border-[--line] text-[--text-muted] uppercase text-[10px] tracking-wider font-medium">
                  <th className="py-3 px-4">Yön / Kanal</th>
                  <th className="py-3 px-3">Olay / RMA</th>
                  <th className="py-3 px-3">İmza</th>
                  <th className="py-3 px-3">Durum</th>
                  <th className="py-3 px-3">Yanıt Notu</th>
                  <th className="py-3 px-4 text-right">Tarih</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[--line]">
                {logs.map((log) => (
                  <tr key={log.id} className="hover:bg-[--brand-soft]/30 transition text-[--text-2]">
                    <td className="py-3 px-4 font-mono">
                      <span className="px-1.5 py-0.5 rounded bg-[--muted-bg] text-[--text] mr-1.5 text-[10px] border border-[--line]">
                        {safeText(log.direction)}
                      </span>
                      <span className="text-[--text] font-semibold">{safeText(log.channelCode)}</span>
                    </td>
                    <td className="py-3 px-3 font-mono">
                      <div className="text-[--text]">{safeText(log.eventType)}</div>
                      <div className="text-[10px] text-[--brand]">{safeText(log.rmaNumber || log.externalRef, '-')}</div>
                    </td>
                    <td className="py-3 px-3">
                      {log.signatureVerified ? (
                        <span className="text-[--ok] inline-flex items-center gap-1 font-medium">
                          <CheckCircle2 className="w-3.5 h-3.5" /> Doğrulandı
                        </span>
                      ) : (
                        <span className="text-[--bad] inline-flex items-center gap-1 font-medium">
                          <AlertTriangle className="w-3.5 h-3.5" /> Geçersiz
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-3 font-mono">
                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-medium border ${ log.status === 'ACCEPTED' ? 'bg-[--ok-soft] text-[--ok] border-[--ok]/25' : log.status === 'DUPLICATE' ? 'bg-[--warn-soft] text-[--warn] border-[--warn]/25' : 'bg-[--bad-soft] text-[--bad] border-[--bad]/25' }`}
                      >
                        {safeText(log.status)}
                      </span>
                    </td>
                    <td className="py-3 px-3 text-[--text-muted] max-w-xs truncate">
                      {safeText(log.responseNote, '-')}
                    </td>
                    <td className="py-3 px-4 text-right font-mono text-[10px] text-[--text-muted] tabular-nums">
                      {safeDate(log.createdAt)}
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
      <div className="bg-white/80 backdrop-blur-xl border border-[--line] rounded-[20px] p-8 text-center text-xs text-[--text-muted] shadow-sm">
        İade analitiği verileri yükleniyor veya henüz kayıt bulunmuyor.
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* Üst KPI Kartları */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <div className="bg-white border border-[--line] rounded-2xl p-4 shadow-sm">
          <div className="text-[11px] uppercase tracking-wider text-[--text-muted] font-medium">İade Oranı</div>
          <div className="text-2xl font-light text-[--brand] mt-1 tabular-nums">
            %{safeNumber(analytics.returnRatePercent)}
          </div>
          <div className="text-[10px] text-[--text-muted] mt-1 font-mono">
            {safeNumber(analytics.totalReturnedQty)} / {safeNumber(analytics.totalSoldQty)} Adet
          </div>
        </div>
        <div className="bg-white border border-[--line] rounded-2xl p-4 shadow-sm">
          <div className="text-[11px] uppercase tracking-wider text-[--text-muted] font-medium">Açık / Karantina</div>
          <div className="text-2xl font-light text-[--text] mt-1 tabular-nums">
            {safeNumber(analytics.openRmas)}{' '}
            <span className="text-sm text-[--warn]">/ {safeNumber(analytics.quarantineWaitingCount)}</span>
          </div>
          <div className="text-[10px] text-[--text-muted] mt-1">
            Süresi yaklaşan: {safeNumber(analytics.expiringSoonCount)}
          </div>
        </div>
        <div className="bg-white border border-[--line] rounded-2xl p-4 shadow-sm">
          <div className="text-[11px] uppercase tracking-wider text-[--text-muted] font-medium">Ort. Çevrim Süresi</div>
          <div className="text-2xl font-light text-[--text] mt-1 tabular-nums">{safeNumber(analytics.avgCycleHours)} sa</div>
          <div className="text-[10px] text-[--text-muted] mt-1">Kapanan: {safeNumber(analytics.closedRmas)}</div>
        </div>
        <div className="bg-white border border-[--line] rounded-2xl p-4 shadow-sm">
          <div className="text-[11px] uppercase tracking-wider text-[--text-muted] font-medium">Toplam İade Tutarı</div>
          <div className="text-2xl font-light text-[--bad] mt-1 tabular-nums">
            {safeCurrency(analytics.totalRefundAmountTry)}
          </div>
          <div className="text-[10px] text-[--text-muted] mt-1 font-mono">
            Maliyet etkisi: {safeCurrency(analytics.totalCostImpactTry)}
          </div>
        </div>
        <div className="bg-white border border-[--line] rounded-2xl p-4 shadow-sm">
          <div className="text-[11px] uppercase tracking-wider text-[--text-muted] font-medium">Net Kurtarma Oranı</div>
          <div className="text-2xl font-light text-[--ok] mt-1 tabular-nums">
            %{safeNumber(analytics.netRecoveryPercent)}
          </div>
          <div className="text-[10px] text-[--text-muted] mt-1 font-mono">
            Kazanım: {safeCurrency(analytics.totalRecoveredValueTry)}
          </div>
        </div>
      </div>

      {/* Neden Dağılımı & Karar Dağılımı */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <div className="bg-white border border-[--line] rounded-[20px] p-5 space-y-3 shadow-sm">
          <div className="flex items-center justify-between gap-2">
            <h4 className="text-sm font-semibold text-[--text] flex items-center gap-2">
              <BarChart3 className="w-4 h-4 text-[--brand]" />
              Neden Koduna Göre İade Dağılımı
            </h4>
            <Link
              href="/dashboard/lojistik-raporlar?module=omnichannel"
              className="text-xs text-[--brand] hover:underline font-medium px-2.5 py-1 rounded-full bg-[--brand-soft] border border-[--brand-line] shrink-0"
            >
              Raporlar&apos;a Git →
            </Link>
          </div>
          <div className="space-y-2.5">
            {(analytics.byReason || []).map((r: any) => (
              <div key={r.reasonCode} className="space-y-1 text-xs">
                <div className="flex justify-between">
                  <span className="text-[--text] font-medium">{safeText(r.label)}</span>
                  <span className="font-mono text-[--text-muted] tabular-nums">
                    {safeNumber(r.count)} talep (%{safeNumber(r.sharePercent)}) · {safeCurrency(r.amountTry)}
                  </span>
                </div>
                <div className="h-1.5 rounded-full bg-[--muted-bg] overflow-hidden">
                  <div
                    className="h-full bg-[--brand] rounded-full"
                    style={{ width: `${Math.min(100, safeNumber(r.sharePercent))}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white border border-[--line] rounded-[20px] p-5 space-y-3 shadow-sm">
          <h4 className="text-sm font-semibold text-[--text]">Kalite Kararı &amp; Kanal Özeti</h4>
          <div className="space-y-2 text-xs">
            {(analytics.byDecision || []).map((d: any) => (
              <div
                key={d.decision}
                className="flex items-center justify-between bg-[--muted-bg]/40 rounded-xl px-3 py-2 border border-[--line]"
              >
                <span className="text-[--text] font-medium">{safeText(d.label)}</span>
                <span className="font-mono text-[--text-muted] tabular-nums">
                  {safeNumber(d.count)} RMA · Kazanım {safeCurrency(d.recoveredTry)} / Maliyet {safeCurrency(d.costTry)}
                </span>
              </div>
            ))}
          </div>
          <div className="pt-2 border-t border-[--line] space-y-1.5 text-xs">
            <div className="text-[11px] uppercase tracking-wider text-[--text-muted] font-medium">Satış Kanalları</div>
            {(analytics.byChannel || []).map((c: any) => (
              <div key={c.channelCode} className="flex justify-between text-[--text-2]">
                <span className="font-mono font-medium">{safeText(c.channelCode)}</span>
                <span className="font-mono tabular-nums text-[--text-muted]">
                  {safeNumber(c.rmaCount)} RMA · {safeNumber(c.qty)} Adet · {safeCurrency(c.refundAmountTry)}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Ürün Bazlı & Tedarikçi Bazlı Analiz */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <div className="bg-white border border-[--line] rounded-[20px] overflow-hidden shadow-sm">
          <div className="p-4 border-b border-[--line] text-xs font-semibold text-[--text]">
            Ürün (SKU) Bazlı İade Analizi
          </div>
          <table className="w-full text-xs text-left border-collapse">
            <thead>
              <tr className="bg-[--muted-bg]/50 text-[10px] text-[--text-muted] uppercase font-medium border-b border-[--line]">
                <th className="py-2.5 px-4">SKU / Ürün</th>
                <th className="py-2.5 px-2 text-right">Adet</th>
                <th className="py-2.5 px-4 text-right">Başlıca Neden</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[--line]">
              {(analytics.byProduct || []).map((p: any) => (
                <tr key={p.sku} className="hover:bg-[--brand-soft]/20 transition">
                  <td className="py-2.5 px-4">
                    <div className="text-[--text] font-medium">{safeText(p.itemName)}</div>
                    <div className="text-[10px] font-mono text-[--brand]">{safeText(p.sku)}</div>
                  </td>
                  <td className="py-2.5 px-2 text-right font-mono text-[--brand] font-semibold tabular-nums">
                    {safeNumber(p.returnedQty)} ({safeNumber(p.rmaCount)}x)
                  </td>
                  <td className="py-2.5 px-4 text-right text-[--text-muted]">
                    {safeText(p.primaryReasonLabel)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="bg-white border border-[--line] rounded-[20px] overflow-hidden shadow-sm">
          <div className="p-4 border-b border-[--line] text-xs font-semibold text-[--text]">
            Tedarikçi Bazlı İade &amp; RTV Maliyet Analizi
          </div>
          <table className="w-full text-xs text-left border-collapse">
            <thead>
              <tr className="bg-[--muted-bg]/50 text-[10px] text-[--text-muted] uppercase font-medium border-b border-[--line]">
                <th className="py-2.5 px-4">Tedarikçi</th>
                <th className="py-2.5 px-2 text-right">RMA / RTV / Hurda</th>
                <th className="py-2.5 px-4 text-right">Maliyet Etkisi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[--line]">
              {(analytics.bySupplier || []).map((s: any) => (
                <tr key={s.supplierId} className="hover:bg-[--brand-soft]/20 transition">
                  <td className="py-2.5 px-4 text-[--text] font-medium">{safeText(s.supplierName)}</td>
                  <td className="py-2.5 px-2 text-right font-mono text-[--text-muted] tabular-nums">
                    {safeNumber(s.rmaCount)} / {safeNumber(s.rtvCount)} / {safeNumber(s.scrapCount)}
                  </td>
                  <td className="py-2.5 px-4 text-right font-mono text-[--bad] font-semibold tabular-nums">
                    {safeCurrency(s.totalCostTry)}
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
