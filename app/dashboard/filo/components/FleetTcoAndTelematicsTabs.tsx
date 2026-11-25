'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import {
  Activity,
  AlertCircle,
  BarChart3,
  CheckCircle2,
  ExternalLink,
  Info,
  Radio,
  ShieldCheck,
  TrendingUp,
  Upload,
  Webhook,
} from 'lucide-react';
import { toast } from 'sonner';

export function FleetTcoAndEfficiencyTab({
  tcoReport,
  onMonthChange,
  onRefresh,
}: {
  tcoReport: any;
  onMonthChange: (month: string) => void;
  onRefresh: () => void;
}) {
  const [monthInput, setMonthInput] = useState(tcoReport?.month === 'ALL' ? '' : tcoReport?.month || '');
  const summary = tcoReport?.summary || {};
  const rows = tcoReport?.vehicles || [];
  const co2Factors = tcoReport?.co2Factors || [];

  return (
    <div className="space-y-4">
      <div className="bg-[white]/90 border border-[--line] rounded-[20px] p-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2 text-sm font-semibold text-[var(--text)]">
          <BarChart3 className="w-4 h-4 text-[#1267E6]" />
          Araç Bazlı TCO (km Başı Maliyet), Sürüş Verimliliği &amp; Tahmini CO₂
        </div>
        <div className="flex items-center gap-2">
          <Link
            href="/dashboard/lojistik-raporlar?module=filo"
            className="text-xs text-[#1267E6] hover:underline font-medium px-2.5 py-1.5 rounded-full bg-[#1267E6]/10 border border-[#1267E6]/20"
          >
            Raporlar&apos;a Git →
          </Link>
          <input
            type="month"
            value={monthInput}
            onChange={(e) => {
              setMonthInput(e.target.value);
              onMonthChange(e.target.value);
            }}
            className="bg-[var(--bg)] border border-[var(--line)] rounded-full px-3 py-1.5 text-xs text-[var(--text)]"
          />
          {monthInput && (
            <button
              type="button"
              onClick={() => {
                setMonthInput('');
                onMonthChange('');
              }}
              className="px-3 py-1.5 rounded-full bg-[--muted-bg] text-xs text-[var(--text-2)] cursor-pointer"
            >
              Tüm Dönemler
            </button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="bg-[white]/90 border border-[--line] rounded-[20px] p-4">
          <div className="text-[11px] text-[var(--text-muted)]">Toplam Filo Maliyeti</div>
          <div className="text-xl font-bold font-mono text-[var(--text)] mt-1">₺{Number(summary.totalFleetCostTry || 0).toLocaleString('tr-TR')}</div>
        </div>
        <div className="bg-[white]/90 border border-[--line] rounded-[20px] p-4">
          <div className="text-[11px] text-[var(--text-muted)]">Ortalama Km Başı Maliyet</div>
          <div className="text-xl font-bold font-mono text-[#1267E6] mt-1">₺{Number(summary.avgCostPerKmTry || 0).toLocaleString('tr-TR')} / km</div>
        </div>
        <div className="bg-[white]/90 border border-[--line] rounded-[20px] p-4">
          <div className="text-[11px] text-[var(--text-muted)]">Toplam Mesafe</div>
          <div className="text-xl font-bold font-mono text-sky-300 mt-1">{Number(summary.totalFleetDistanceKm || 0).toLocaleString('tr-TR')} km</div>
        </div>
        <div className="bg-[white]/90 border border-[--line] rounded-[20px] p-4">
          <div className="text-[11px] text-[var(--text-muted)]">Tahmini CO₂ Emisyonu *</div>
          <div className="text-xl font-bold font-mono text-[var(--warn)] mt-1">{Number(summary.totalEstimatedCo2Kg || 0).toLocaleString('tr-TR')} kg CO₂e</div>
        </div>
      </div>

      <div className="bg-[white]/90 border border-[--line] rounded-[20px] overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-[--page] border-b border-[--line] text-[11px] uppercase text-[var(--text-muted)]">
                <th className="py-3 px-4">Araç / Şoför</th>
                <th className="py-3 px-4">Yakıt + Bakım + Kira/Amort.</th>
                <th className="py-3 px-4">Sürücü + Sigorta + Ceza</th>
                <th className="py-3 px-4">Toplam / km Başı</th>
                <th className="py-3 px-4">Eko-Sürüş (Rölanti / İhlal)</th>
                <th className="py-3 px-4">Tahmini CO₂ *</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/[0.05]">
              {rows.map((r: any) => (
                <tr key={r.vehicleId}>
                  <td className="py-3 px-4">
                    <div className="font-semibold text-[var(--text)]">{r.plate}</div>
                    <div className="text-[11px] text-[var(--text-muted)]">{r.driverName || '—'} · {Number(r.totalDistanceKm).toLocaleString('tr-TR')} km</div>
                  </td>
                  <td className="py-3 px-4 font-mono text-[var(--text-2)]">
                    ₺{Number(r.fuelCostTry).toLocaleString('tr-TR')} + ₺{Number(r.maintenanceCostTry).toLocaleString('tr-TR')} + ₺{Number(r.leaseDepreciationTry).toLocaleString('tr-TR')}
                  </td>
                  <td className="py-3 px-4 font-mono text-[var(--text-2)]">
                    ₺{Number(r.driverCostTry).toLocaleString('tr-TR')} + ₺{Number(r.insuranceTaxTry).toLocaleString('tr-TR')} + ₺{Number(r.penaltyCostTry).toLocaleString('tr-TR')}
                  </td>
                  <td className="py-3 px-4 font-mono">
                    <div className="font-bold text-[var(--text)]">₺{Number(r.totalCostTry).toLocaleString('tr-TR')}</div>
                    <div className="text-[11px] text-[#1267E6]">₺{r.costPerKmTry} / km</div>
                  </td>
                  <td className="py-3 px-4">
                    <div className="font-semibold text-[var(--text)]">{r.ecoScore}/100 ({r.ecoGrade})</div>
                    <div className="text-[11px] text-[var(--text-muted)]">
                      Rölanti: {r.idleMinutes}dk · Hız:{r.speedViolationCount} · Fren/İvme:{r.harshBrakeCount + r.harshAccelCount}
                    </div>
                  </td>
                  <td className="py-3 px-4 font-mono text-[var(--warn)]">
                    {r.co2Estimate ? `${r.co2Estimate.totalKgCo2e} kg` : 'Katsayı yok'}
                    {r.co2Estimate && (
                      <div className="text-[10px] text-[var(--text-muted)]">tahmini ({r.co2Estimate.factorKgCo2ePerUnit} kg/{r.co2Estimate.unit})</div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Yapılandırılabilir CO2 Katsayıları ve Resmî Dipnot */}
      <div className="bg-[white]/90 border border-[--line] rounded-[20px] p-4 space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="text-xs font-semibold text-[var(--text)] flex items-center gap-2">
            <Info className="w-4 h-4 text-[#1267E6]" />
            * {tcoReport?.co2DisclaimerNote || 'Tahmini CO₂ değerleridir. Katsayılar Birleşik Krallık (DESNZ/DEFRA) tablolarına dayanır, Türkiye\'ye özgü değildir.'}
          </div>
          <button type="button" onClick={onRefresh} className="text-[11px] text-[#1267E6] underline cursor-pointer">Katsayıları Yenile</button>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-2 text-[11px]">
          {co2Factors.map((f: any) => (
            <div key={f.id} className="bg-[var(--bg)] border border-[--line] rounded-xl p-2.5">
              <div className="font-semibold text-[var(--text)]">{f.fuelType} ({f.kgCo2ePerUnit} kg CO₂e/{f.unit})</div>
              <div className="text-[var(--text-muted)]">{f.sourceName} · {f.sourceYear} {f.sourceVersion ? `(${f.sourceVersion})` : ''}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export function FleetTelematicsTab({
  vehicles,
  telematics,
  isDemoMode,
  onRefresh,
}: {
  vehicles: any[];
  telematics: any;
  isDemoMode: boolean;
  onRefresh: () => void;
}) {
  const [mapForm, setMapForm] = useState({ vehicleId: vehicles[0]?.id || '', providerCode: 'TRACCAR', externalDeviceId: '' });
  const [importProvider, setImportProvider] = useState('GENERIC_WEBHOOK');
  const [importJson, setImportJson] = useState('');

  const providers = telematics?.providers || [];
  const mappings = telematics?.mappings || [];
  const errorLogs = telematics?.errorLogs || [];
  const recentEvents = telematics?.recentEvents || [];

  const handleSaveMap = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch('/api/filo', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'upsert_telematic_mapping', ...mapForm }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error);
      toast.success(json.message);
      setMapForm({ ...mapForm, externalDeviceId: '' });
      onRefresh();
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  const handleImportPayloads = async () => {
    try {
      const parsed = JSON.parse(importJson);
      const events = Array.isArray(parsed) ? parsed : [parsed];
      const res = await fetch('/api/filo', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'import_telematic_events',
          providerCode: importProvider,
          events,
          sourceOrigin: 'CSV_JSON_IMPORT',
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error);
      toast.success(json.message);
      setImportJson('');
      onRefresh();
    } catch (err: any) {
      toast.error(err.message || 'Geçersiz JSON biçimi.');
    }
  };

  return (
    <div className="space-y-4">
      <div className="bg-[white]/90 border border-[--line] rounded-[20px] p-4 flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2 text-sm font-semibold text-[var(--text)]">
          <Webhook className="w-4 h-4 text-[#1267E6]" />
          Telematik Entegrasyonları (Onaylı Sağlayıcı Profilleri)
        </div>
        <span className={`px-3 py-1 rounded-full text-[11px] font-medium border ${ isDemoMode ? 'bg-[var(--warn-soft)] text-[var(--warn)] border-[var(--warn-line)]' : 'bg-[--brand]/15 text-[#1267E6] border-[--brand-line]' }`}>
          {telematics?.telemetryModeLabel || (isDemoMode ? 'Demo Veritabanı' : 'Üretim Webhook')}
        </span>
      </div>

      {/* Desteklenen Sağlayıcılar (FİYAT BİLGİSİ YOK — Yalnız Erişim Şekli ve Resmî Doküman) */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {providers.map((p: any) => (
          <div key={p.providerCode} className="bg-[white]/90 border border-[--line] rounded-[20px] p-4 space-y-2 text-xs">
            <div className="flex items-start justify-between gap-2">
              <div>
                <div className="font-bold text-[var(--text)] flex items-center gap-1.5">
                  <Radio className="w-3.5 h-3.5 text-[#1267E6]" />
                  {p.displayName}
                </div>
                <div className="text-[11px] text-[var(--text-muted)] mt-0.5">{p.protocolSummary}</div>
              </div>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-[--muted-bg] border border-[var(--line)] text-[--brand]">
                {p.connectionStatus === 'DEMO_DB' ? 'Demo Verisi' : p.connectionStatus}
              </span>
            </div>

            <div className="text-[11px] text-[var(--text-2)]">{p.accessMethodSummary}</div>

            <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-[var(--line-soft)] text-[11px] text-[var(--text-muted)]">
              <span>Eşli Araç: {p.mappedVehicleCount} · Olay: {p.recentEventCount} · Hata: {p.errorCount}</span>
              <span>Son Olay: {p.lastEventAt ? new Date(p.lastEventAt).toLocaleString('tr-TR') : '—'}</span>
            </div>

            <div className="flex items-center justify-between text-[10px] text-[var(--text-muted)]">
              <span className="font-mono">{p.authHeaderExample}</span>
              {String(p.docsUrl || '').startsWith('http') && (
                <a href={p.docsUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-[#1267E6] hover:underline">
                  Resmî Doküman ({p.docsAccessDate}) <ExternalLink className="w-3 h-3" />
                </a>
              )}
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Araç <-> Cihaz ID Eşleme */}
        <form onSubmit={handleSaveMap} className="bg-[white]/90 border border-[--line] rounded-[20px] p-4 space-y-2.5">
          <div className="text-xs font-semibold text-[var(--text)]">Plaka / VIN ↔ Sağlayıcı Cihaz ID Eşleme</div>
          <div className="grid grid-cols-3 gap-2">
            <select required value={mapForm.vehicleId} onChange={(e) => setMapForm({ ...mapForm, vehicleId: e.target.value })} className="bg-[var(--bg)] border border-[var(--line)] rounded-xl px-2.5 py-1.5 text-xs text-[var(--text)]">
              <option value="">Araç Seçin</option>
              {vehicles.map((v) => <option key={v.id} value={v.id}>{v.plate}</option>)}
            </select>
            <select value={mapForm.providerCode} onChange={(e) => setMapForm({ ...mapForm, providerCode: e.target.value })} className="bg-[var(--bg)] border border-[var(--line)] rounded-xl px-2.5 py-1.5 text-xs text-[var(--text)]">
              {providers.map((p: any) => <option key={p.providerCode} value={p.providerCode}>{p.providerCode}</option>)}
            </select>
            <input required placeholder="Cihaz ID / IMEI" value={mapForm.externalDeviceId} onChange={(e) => setMapForm({ ...mapForm, externalDeviceId: e.target.value })} className="bg-[var(--bg)] border border-[var(--line)] rounded-xl px-2.5 py-1.5 text-xs text-[var(--text)]" />
          </div>
          <button type="submit" className="w-full py-2 rounded-full bg-[#1267E6] text-white text-xs font-semibold cursor-pointer">Cihaz Eşlemesini Kaydet</button>

          <div className="space-y-1 max-h-40 overflow-y-auto pt-2 text-[11px]">
            {mappings.map((m: any) => (
              <div key={m.id} className="bg-[--page] rounded-lg px-2.5 py-1.5 flex items-center justify-between text-[var(--text-2)]">
                <span><strong>{m.plateSnapshot || m.vehicleId}</strong> · {m.providerCode}</span>
                <span className="font-mono text-[var(--text-muted)]">ID: {m.externalDeviceId}</span>
              </div>
            ))}
          </div>
        </form>

        {/* Genel Webhook / JSON İçe Aktarım */}
        <div className="bg-[white]/90 border border-[--line] rounded-[20px] p-4 space-y-2.5">
          <div className="flex items-center justify-between">
            <div className="text-xs font-semibold text-[var(--text)] flex items-center gap-1.5"><Upload className="w-3.5 h-3.5 text-[#1267E6]" /> Telematik JSON İçe Aktar / Test Et</div>
            <select value={importProvider} onChange={(e) => setImportProvider(e.target.value)} className="bg-[var(--bg)] border border-[var(--line)] rounded-full px-2.5 py-1 text-[11px] text-[var(--text)]">
              {providers.map((p: any) => <option key={p.providerCode} value={p.providerCode}>{p.providerCode}</option>)}
            </select>
          </div>
          <textarea
            rows={4}
            value={importJson}
            onChange={(e) => setImportJson(e.target.value)}
            placeholder='[{"plate":"34 SNR 808","lat":41.015,"lng":29.045,"speedKmh":62,"ignitionOn":true,"eventTime":"2026-11-16T12:00:00Z"}]'
            className="w-full bg-[var(--bg)] border border-[var(--line)] rounded-xl p-2.5 text-[11px] font-mono text-[var(--text-2)]"
          />
          <button type="button" onClick={handleImportPayloads} disabled={!importJson.trim()} className="w-full py-2 rounded-full bg-white/[0.08] hover:bg-white/[0.14] border border-[var(--line)] text-[var(--text)] text-xs font-semibold cursor-pointer">
            Normalize Et &amp; İçe Aktar
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="bg-[white]/90 border border-[--line] rounded-[20px] p-4">
          <div className="text-xs font-semibold text-[var(--text)] mb-2 flex items-center gap-1.5"><Activity className="w-3.5 h-3.5 text-[#1267E6]" /> Son Telematik Olayları ({recentEvents.length})</div>
          <div className="space-y-1.5 max-h-56 overflow-y-auto text-[11px]">
            {recentEvents.slice(0, 20).map((ev: any) => (
              <div key={ev.id} className="bg-[--page] rounded-lg px-2.5 py-1.5 flex items-center justify-between text-[var(--text-2)]">
                <div>
                  <span className="font-semibold text-[var(--text)]">{ev.eventType}</span> · {ev.providerCode}
                  {ev.isBackfill && <span className="ml-1.5 text-[10px] text-[var(--warn)]">[Backfill]</span>}
                  <span className="ml-1.5 text-[10px] text-[var(--text-muted)]">({ev.sourceOrigin})</span>
                </div>
                <div className="font-mono text-[var(--text-muted)]">
                  {ev.speedKmh !== null ? `${ev.speedKmh} km/s` : ''} · {new Date(ev.eventTime).toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })}
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-[white]/90 border border-[--line] rounded-[20px] p-4">
          <div className="text-xs font-semibold text-[var(--text)] mb-2 flex items-center gap-1.5"><AlertCircle className="w-3.5 h-3.5 text-[var(--bad)]" /> Telematik Hata Günlüğü ({errorLogs.length})</div>
          <div className="space-y-1.5 max-h-56 overflow-y-auto text-[11px]">
            {errorLogs.map((er: any) => (
              <div key={er.id} className="bg-rose-500/5 border border-[var(--bad-line)] rounded-lg px-2.5 py-1.5 text-rose-200">
                <div className="font-semibold">{er.providerCode} · {er.errorCode}</div>
                <div className="text-[var(--text-muted)]">{er.errorMessage}</div>
              </div>
            ))}
            {errorLogs.length === 0 && (
              <div className="text-[var(--text-muted)] py-6 text-center">Kayıtlı telematik hatası yok.</div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
