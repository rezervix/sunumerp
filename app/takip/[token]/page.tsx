'use client';

import React, { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import {
  AlertTriangle,
  CheckCircle2,
  Clock,
  MapPin,
  PackageCheck,
  ShieldCheck,
  Truck,
} from 'lucide-react';
import {
  DISPATCH_STOP_STATUS_LABELS,
  type DispatchStopStatus,
} from '@/lib/logistics/dispatch/constantsAndHelpers';

export default function MusteriTakipPage() {
  const params = useParams<{ token: string }>();
  const token = params?.token || '';
  const [loading, setLoading] = useState(true);
  const [state, setState] = useState<{
    status: 'ok' | 'expired' | 'not_found' | 'error';
    tracking?: any;
    message?: string;
    orderRef?: string;
  }>({ status: 'not_found' });

  useEffect(() => {
    if (!token) return;
    fetch(`/api/takip/${encodeURIComponent(token)}`, { cache: 'no-store' })
      .then(async (res) => {
        const json = await res.json().catch(() => ({}));
        if (res.status === 410) {
          setState({ status: 'expired', message: json.error, orderRef: json.orderRef });
        } else if (res.ok && json.success) {
          setState({ status: 'ok', tracking: json.tracking });
        } else {
          setState({ status: 'not_found', message: json.error });
        }
      })
      .catch(() => {
        setState({ status: 'error', message: 'Bağlantı hatası.' });
      })
      .finally(() => setLoading(false));
  }, [token]);

  return (
    <div className="min-h-screen bg-[#070B09] text-white flex items-center justify-center p-4">
      <div className="w-full max-w-xl bg-[#111513]/95 border border-white/[0.08] rounded-[24px] p-6 sm:p-8 shadow-2xl space-y-6">
        <div className="flex items-center justify-between border-b border-white/[0.06] pb-4">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-[#34D399]">
              <Truck className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-lg font-semibold">Canlı Teslimat Takibi</h1>
              <p className="text-xs text-zinc-400">Sunum Lojistik Müşteri Bilgilendirme</p>
            </div>
          </div>
          <span className="inline-flex items-center gap-1 text-[11px] text-zinc-400">
            <ShieldCheck className="w-3.5 h-3.5 text-[#34D399]" /> Süreli Güvenli Bağlantı
          </span>
        </div>

        {loading ? (
          <div className="py-12 text-center text-sm text-zinc-400">Teslimat bilgileri yükleniyor...</div>
        ) : state.status === 'expired' ? (
          <div className="py-8 text-center space-y-3">
            <Clock className="w-10 h-10 text-amber-400 mx-auto" />
            <h2 className="text-base font-semibold">Takip Bağlantısının Süresi Dolmuş</h2>
            <p className="text-xs text-zinc-400">
              {state.orderRef ? `${state.orderRef} numaralı gönderi için takip süresi sona ermiştir.` : state.message}
            </p>
          </div>
        ) : state.status !== 'ok' || !state.tracking ? (
          <div className="py-8 text-center space-y-3">
            <AlertTriangle className="w-10 h-10 text-rose-400 mx-auto" />
            <h2 className="text-base font-semibold">Geçersiz Takip Bağlantısı</h2>
            <p className="text-xs text-zinc-400">
              Bu bağlantıya ait aktif teslimat kaydı bulunamadı.
            </p>
          </div>
        ) : (
          <div className="space-y-5">
            <div className="flex flex-wrap items-center justify-between gap-3 bg-white/[0.03] border border-white/[0.06] rounded-2xl p-4">
              <div>
                <div className="text-xs text-zinc-400">Sipariş / Referans</div>
                <div className="text-base font-bold text-white">{state.tracking.orderRef}</div>
                <div className="text-xs text-zinc-300 mt-0.5">{state.tracking.customerName}</div>
              </div>
              <div className="text-right">
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-[#34D399] text-xs font-semibold">
                  {state.tracking.status === 'TESLIM_EDILDI' ? (
                    <CheckCircle2 className="w-3.5 h-3.5" />
                  ) : (
                    <PackageCheck className="w-3.5 h-3.5" />
                  )}
                  {DISPATCH_STOP_STATUS_LABELS[state.tracking.status as DispatchStopStatus] ||
                    state.tracking.status}
                </span>
                <div className="text-[11px] text-zinc-400 mt-1 flex items-center justify-end gap-1">
                  <MapPin className="w-3 h-3" /> {state.tracking.cityDistrict}
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 text-xs">
              <div className="p-3.5 rounded-xl bg-white/[0.03] border border-white/[0.06]">
                <div className="text-zinc-400">Tahmini Teslim Zamanı (ETA)</div>
                <div className="text-sm font-semibold text-white mt-1">
                  {state.tracking.plannedEtaAt
                    ? new Date(state.tracking.plannedEtaAt).toLocaleString('tr-TR', {
                        day: '2-digit',
                        month: 'short',
                        hour: '2-digit',
                        minute: '2-digit',
                      })
                    : '-'}
                </div>
                {state.tracking.timeWindowStart && (
                  <div className="text-[11px] text-zinc-500 mt-0.5">
                    Pencere: {state.tracking.timeWindowStart}–{state.tracking.timeWindowEnd}
                  </div>
                )}
              </div>
              <div className="p-3.5 rounded-xl bg-white/[0.03] border border-white/[0.06]">
                <div className="text-zinc-400">Araç &amp; Sıra Durumu</div>
                <div className="text-sm font-semibold text-white mt-1">
                  {state.tracking.vehiclePlate || 'Planlanıyor'} ·{' '}
                  {state.tracking.driverShortName || ''}
                </div>
                <div className="text-[11px] text-zinc-400 mt-0.5">
                  {state.tracking.status === 'TESLIM_EDILDI'
                    ? 'Teslimat tamamlandı'
                    : `Önünüzde ${state.tracking.stopsRemainingBeforeYou} teslimat durağı var`}
                </div>
              </div>
            </div>

            {state.tracking.delayMinutes > 10 && state.tracking.status !== 'TESLIM_EDILDI' && (
              <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/25 text-xs text-amber-200 flex items-center gap-2">
                <Clock className="w-4 h-4 shrink-0" />
                Trafik / rota kaynaklı yaklaşık +{state.tracking.delayMinutes} dk gecikme öngörülüyor.
              </div>
            )}

            {state.tracking.podSummary && (
              <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-xs space-y-1">
                <div className="font-semibold text-[#34D399]">Teslimat Onayı Kaydedildi</div>
                <div className="text-zinc-300">
                  Teslim Alan: <strong>{state.tracking.podSummary.recipientName}</strong> ·{' '}
                  {new Date(state.tracking.podSummary.capturedAt).toLocaleString('tr-TR')}
                </div>
              </div>
            )}

            {Array.isArray(state.tracking.timeline) && state.tracking.timeline.length > 0 && (
              <div className="space-y-2 pt-2">
                <div className="text-xs font-semibold text-zinc-300">Sevkiyat Hareketleri</div>
                <div className="space-y-2">
                  {state.tracking.timeline.map((ev: any, idx: number) => (
                    <div
                      key={idx}
                      className="flex items-start justify-between gap-2 text-xs p-2.5 rounded-xl bg-white/[0.02] border border-white/[0.05]"
                    >
                      <span className="text-zinc-300">{ev.message}</span>
                      <span className="text-[11px] text-zinc-500 shrink-0">
                        {new Date(ev.createdAt).toLocaleTimeString('tr-TR', {
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
