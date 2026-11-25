'use client';

import React, { useMemo } from 'react';
import Link from 'next/link';
import {
  BarChart3,
  CheckCircle2,
  Clock,
  ExternalLink,
  FileCheck2,
  Globe,
  RefreshCw,
  ShieldCheck,
  Truck,
} from 'lucide-react';
import { DISTANCE_MATRIX_ADAPTER_INFO } from '@/lib/logistics/providers/routing';

export function DispatchPodsAndAnalyticsTab({
  mode,
  trips,
  optJobs,
  kpis,
  adapterStatus,
  onAction,
}: {
  mode: 'pods' | 'analytics';
  trips: any[];
  optJobs: any[];
  kpis: any;
  adapterStatus: any;
  onAction: (action: string, payload?: Record<string, any>) => Promise<any>;
}) {
  const allStopsWithProofs = useMemo(() => {
    const out: any[] = [];
    for (const t of trips) {
      for (const s of t.stops || []) {
        out.push({
          ...s,
          tripNumber: t.tripNumber,
          vehiclePlate: t.vehiclePlate,
          driverName: t.driverName,
        });
      }
    }
    return out;
  }, [trips]);

  if (mode === 'pods') {
    const podStops = allStopsWithProofs.filter((s) => (s.proofs || []).length > 0 || s.status === 'TESLIM_EDILEMEDI');
    return (
      <div className="space-y-5">
        <div className="bg-white/80 backdrop-blur-xl border border-[--line] rounded-[20px] p-5 space-y-4 shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <h3 className="text-base font-semibold text-[--text] flex items-center gap-2">
                <FileCheck2 className="w-4 h-4 text-[--brand]" />
                Teslimat Kanıtları (e-POD) & Müşteri Takip Bağlantıları
              </h3>
              <p className="text-xs text-[--text-muted] mt-0.5">
                Sürücü tarafından kaydedilen dijital imza/fotoğraf kanıtları ve 192-bit süreli müşteri takip linkleri
              </p>
            </div>
          </div>

          {podStops.length === 0 ? (
            <div className="py-10 text-center text-xs text-[--text-muted] bg-[--page] rounded-2xl border border-dashed border-[--line]">
              Henüz teslimat kanıtı (e-POD) kaydedilmedi.
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {podStops.map((s) => {
                const pod = s.proofs?.[0];
                const isExpired = new Date(s.trackingExpiresAt).getTime() < Date.now();
                return (
                  <div
                    key={s.id}
                    className="bg-white border border-[--line] rounded-2xl p-4 space-y-3 shadow-sm"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <div className="text-xs font-semibold text-[--text]">
                          {s.tripNumber} · Durak #{s.sequenceNo} — {s.customerName}
                        </div>
                        <div className="text-[11px] text-[--text-muted]">
                          {s.vehiclePlate || '-'} · {s.driverName || '-'} · {s.sourceRefNo || ''}
                        </div>
                      </div>
                      <div className="flex flex-wrap items-center gap-1.5">
                        {s.eInvoiceStatus === 'KESILDI' ? (
                          <span className="text-[10px] px-2 py-0.5 rounded-full bg-[--ok-soft] text-[--ok] border border-[--ok-soft] font-mono font-medium">
                            E-Fatura: {s.eInvoiceNo}
                          </span>
                        ) : s.eInvoiceStatus === 'TASLAK' ||
                          s.status === 'TESLIM_EDILDI' ||
                          s.status === 'KISMI_TESLIM' ? (
                          <button
                            type="button"
                            onClick={() =>
                              onAction('issue_stop_efatura', { stopId: s.id })
                            }
                            className="text-[10px] px-2.5 py-0.5 rounded-full bg-[--warn-soft] hover:bg-[--warn-soft]/80 text-[--warn] border border-[--warn-soft] font-medium transition cursor-pointer"
                            title={
                              s.eInvoiceNo
                                ? `Taslak: ${s.eInvoiceNo}`
                                : 'Taslak / Kesime hazır'
                            }
                          >
                            {s.eInvoiceNo ? `Taslak (${s.eInvoiceNo}) · ` : ''}
                            Tek Tıkla E-Fatura Kes
                          </button>
                        ) : null}
                        <span
                          className={`text-[10px] px-2 py-0.5 rounded-full ${ s.status === 'TESLIM_EDILEMEDI' ? 'bg-[--bad-soft] text-[--bad] border border-[--bad-soft]' : 'bg-[--ok-soft] text-[--ok] border border-[--ok-soft]' }`}
                        >
                          {s.status}
                        </span>
                      </div>
                    </div>

                    {pod ? (
                      <div className="space-y-2 text-xs">
                        <div className="text-[--text]">
                          Teslim Alan: <strong>{pod.recipientName}</strong> ({pod.recipientRelation}) ·{' '}
                          <span className="text-[--text-muted]">
                            {new Date(pod.capturedAt).toLocaleString('tr-TR')}
                          </span>
                        </div>
                        {pod.note && <div className="text-[--text-muted] text-[11px]">{pod.note}</div>}

                        <div className="flex flex-wrap gap-3 pt-1">
                          {pod.signatureFileUrl && (
                            <div className="space-y-1">
                              <div className="text-[10px] text-[--text-muted]">Dijital İmza</div>
                              <img
                                src={pod.signatureFileUrl}
                                alt={`İmza - ${pod.recipientName}`}
                                className="h-16 w-40 object-contain rounded-lg border border-[--line] bg-[--page]"
                              />
                            </div>
                          )}
                          {(pod.photoFileUrls || []).map((u: string, i: number) => (
                            <div key={i} className="space-y-1">
                              <div className="text-[10px] text-[--text-muted]">Teslimat Fotoğrafı</div>
                              <img
                                src={u}
                                alt={`Kanıt ${i + 1}`}
                                className="h-16 w-28 object-cover rounded-lg border border-[--line] bg-[--page]"
                              />
                            </div>
                          ))}
                        </div>
                      </div>
                    ) : (
                      <div className="text-xs text-[--bad] bg-[--bad-soft] border border-[--bad-soft] rounded-xl p-2.5">
                        Başarısız Teslimat Nedeni: <strong>{s.failureReasonCode}</strong>
                        {s.failureReasonNote ? ` — ${s.failureReasonNote}` : ''}
                      </div>
                    )}

                    <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-[--line] text-[11px]">
                      <div className="text-[--text-muted] flex items-center gap-1.5">
                        <Clock className="w-3.5 h-3.5" />
                        Takip Süresi:{' '}
                        <span className={isExpired ? 'text-[--bad]' : 'text-[--text]'}>
                          {isExpired ? 'Süresi Doldu' : new Date(s.trackingExpiresAt).toLocaleString('tr-TR')}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => onAction('extend_tracking', { stopId: s.id, extendHours: 72 })}
                          className="text-xs px-2.5 py-1 rounded-full bg-[--muted-bg] hover:bg-[--brand-soft] text-[--text] inline-flex items-center gap-1 border border-[--line]"
                        >
                          <RefreshCw className="w-3 h-3 text-[--brand]" /> +72s Uzat
                        </button>
                        <Link
                          href={`/takip/${s.trackingToken}`}
                          target="_blank"
                          className="text-xs px-2.5 py-1 rounded-full bg-[--brand-soft] text-[--brand] border border-[--brand-line] inline-flex items-center gap-1 font-medium"
                        >
                          Takip Sayfası <ExternalLink className="w-3 h-3" />
                        </Link>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* Optimize Edilmiş vs Optimize Edilmemiş Kıyaslama + KPI Detayları */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <div className="bg-white/80 backdrop-blur-xl border border-[--line] rounded-[20px] p-5 space-y-4 shadow-sm">
          <div className="flex items-center justify-between gap-2">
            <h3 className="text-base font-semibold text-[--text] flex items-center gap-2">
              <BarChart3 className="w-4 h-4 text-[--brand]" />
              Sevkiyat Performans & Plan–Gerçek Sapma Özeti
            </h3>
            <Link
              href="/dashboard/lojistik-raporlar?module=sevkiyat"
              className="text-xs text-[--brand] hover:underline font-medium px-2.5 py-1 rounded-full bg-[--brand-soft] border border-[--brand-line] shrink-0"
            >
              Raporlar&apos;a Git →
            </Link>
          </div>
          <div className="grid grid-cols-2 gap-3 text-xs">
            <div className="p-3 rounded-xl bg-[--page] border border-[--line]">
              <div className="text-[--text-muted]">Zamanında Teslimat Oranı</div>
              <div className="text-lg font-bold text-[--ok] mt-1 tabular-nums">%{kpis.onTimeDeliveryRatePct}</div>
            </div>
            <div className="p-3 rounded-xl bg-[--page] border border-[--line]">
              <div className="text-[--text-muted]">Teslim Edilemeyen Oranı</div>
              <div className="text-lg font-bold text-[--bad] mt-1 tabular-nums">%{kpis.failedDeliveryRatePct}</div>
            </div>
            <div className="p-3 rounded-xl bg-[--page] border border-[--line]">
              <div className="text-[--text-muted]">Durak / Araç / Gün</div>
              <div className="text-lg font-bold text-[--text] mt-1 tabular-nums">{kpis.avgStopsPerVehicleDay}</div>
            </div>
            <div className="p-3 rounded-xl bg-[--page] border border-[--line]">
              <div className="text-[--text-muted]">Ortalama Araç Doluluk</div>
              <div className="text-lg font-bold text-[--text] mt-1 tabular-nums">%{kpis.avgCapacityLoadPct}</div>
            </div>
            <div className="p-3 rounded-xl bg-[--page] border border-[--line]">
              <div className="text-[--text-muted]">Optimizasyon Km Kazancı</div>
              <div className="text-lg font-bold text-[--brand] mt-1 tabular-nums">
                {kpis.optimizationSavedKm} km (%{kpis.optimizationSavedPct})
              </div>
              <div className="text-[10px] text-[--text-muted]">
                Ham {kpis.totalBaselineUnoptimizedKm} km → Opt. {kpis.totalPlannedDistanceKm} km
              </div>
            </div>
            <div className="p-3 rounded-xl bg-[--page] border border-[--line]">
              <div className="text-[--text-muted]">Plan vs Gerçek Km Sapması</div>
              <div className="text-lg font-bold text-[--text] mt-1 tabular-nums">
                {kpis.distanceVarianceKm >= 0 ? `+${kpis.distanceVarianceKm}` : kpis.distanceVarianceKm} km (%{kpis.distanceVariancePct})
              </div>
              <div className="text-[10px] text-[--text-muted]">
                Gerçekleşen: {kpis.totalActualDistanceKm} km
              </div>
            </div>
          </div>
        </div>

        {/* Sağlayıcı Adaptörü Durumu */}
        <div className="bg-white/80 backdrop-blur-xl border border-[--line] rounded-[20px] p-5 space-y-4 shadow-sm">
          <h3 className="text-base font-semibold text-[--text] flex items-center gap-2">
            <Globe className="w-4 h-4 text-[--brand]" />
            Mesafe/Süre & E-İrsaliye Sağlayıcı Adaptörleri
          </h3>
          <div className="space-y-2 text-xs">
            <div className="p-3 rounded-xl bg-[--page] border border-[--line] flex items-center justify-between">
              <div>
                <div className="font-semibold text-[--text]">Mesafe / Süre Matrisi Sağlayıcısı</div>
                <div className="text-[11px] text-[--text-muted]">
                  Aktif: {adapterStatus?.routingEngine || 'LOCAL_COORDINATE'} ({adapterStatus?.routingMode})
                </div>
              </div>
              <span className="px-2.5 py-1 rounded-full bg-[--ok-soft] text-[--ok] border border-[--ok-soft] text-[10px] font-semibold">
                Anahtarsız Çalışır
              </span>
            </div>

            <div className="p-3 rounded-xl bg-[--page] border border-[--line] flex items-center justify-between">
              <div>
                <div className="font-semibold text-[--text]">GİB E-İrsaliye Entegratör Adaptörü</div>
                <div className="text-[11px] text-[--text-muted]">
                  Mod: {adapterStatus?.eDocumentMode === 'external-rest' ? 'Harici Özel Entegratör (REST)' : 'Demo Veritabanı (EDocumentRecord)'}
                </div>
              </div>
              <span className="px-2.5 py-1 rounded-full bg-[--muted-bg] text-[--text-2] text-[10px]">
                {kpis.eWaybillIssuedTrips} Sefer E-İrsaliyeli
              </span>
            </div>

            <div className="pt-1 space-y-1.5 text-[11px] text-[--text-muted]">
              <div className="font-medium text-[--text]">Yapılandırma ile Bağlanabilir Mesafe Profilleri:</div>
              {Object.entries(DISTANCE_MATRIX_ADAPTER_INFO).map(([k, info]) => (
                <div key={k} className="flex items-center justify-between border-b border-[--line] pb-1">
                  <span className="text-[--text-2]">{info.label}</span>
                  <span className="font-mono text-[10px] text-[--text-muted]">
                    {info.envVars.length > 0 ? info.envVars.join(', ') : 'Yerleşik'}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Son Rota Optimizasyon İşleri */}
      <div className="bg-white/80 backdrop-blur-xl border border-[--line] rounded-[20px] p-5 space-y-3 shadow-sm">
        <h3 className="text-sm font-semibold text-[--text] flex items-center gap-2">
          <Truck className="w-4 h-4 text-[--brand]" />
          Son Rota Optimizasyon Arka Plan İşleri ({optJobs.length})
        </h3>
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="text-left text-[11px] uppercase tracking-wider text-[--text-muted] border-b border-[--line]">
                <th className="py-2 pr-3">Çözücü & Aşama</th>
                <th className="py-2 pr-3">Durak / Araç</th>
                <th className="py-2 pr-3">Ham Km → Opt. Km</th>
                <th className="py-2 pr-3">İhlal</th>
                <th className="py-2 pr-3">Süre</th>
                <th className="py-2">Durum</th>
              </tr>
            </thead>
            <tbody>
              {optJobs.map((j) => (
                <tr key={j.id} className="border-b border-[--line] text-[--text-2] hover:bg-[--brand-soft]/20">
                  <td className="py-2 pr-3">
                    <div className="font-medium text-[--text]">{j.solverName || 'CVRPTW Çözücü'}</div>
                    <div className="text-[11px] text-[--text-muted]">{j.stageLabel}</div>
                  </td>
                  <td className="py-2 pr-3">
                    {j.stopCount} durak / {j.vehicleCount} araç
                  </td>
                  <td className="py-2 pr-3 font-mono">
                    {j.unoptimizedDistanceKm} km →{' '}
                    <span className="text-[--brand] font-semibold">{j.optimizedDistanceKm} km</span>
                  </td>
                  <td className="py-2 pr-3">{j.timeWindowViolations} pencere ihlali</td>
                  <td className="py-2 pr-3 font-mono">{j.durationMs} ms</td>
                  <td className="py-2">
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-[--ok-soft] text-[--ok] text-[10px] font-semibold">
                      <CheckCircle2 className="w-3 h-3" /> %{j.progressPct}
                    </span>
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
