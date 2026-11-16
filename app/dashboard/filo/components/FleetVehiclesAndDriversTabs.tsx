'use client';

import React, { useMemo, useState } from 'react';
import {
  AlertTriangle,
  BellRing,
  CheckCircle2,
  CreditCard,
  Eye,
  EyeOff,
  FileCheck2,
  FileText,
  Lock,
  Plus,
  Search,
  ShieldAlert,
  ShieldCheck,
  Truck,
  Unlock,
  Users,
} from 'lucide-react';
import { toast } from 'sonner';
import {
  FLEET_DOCUMENT_TYPES,
  FLEET_DOCUMENT_TYPE_LABELS,
  FLEET_FUEL_TYPES,
  FLEET_FUEL_TYPE_LABELS,
  FLEET_OWNERSHIP_LABELS,
  FLEET_OWNERSHIP_TYPES,
  FLEET_VEHICLE_STATUSES,
  FLEET_VEHICLE_STATUS_BADGES,
  FLEET_VEHICLE_STATUS_LABELS,
  FLEET_VEHICLE_TYPES,
  FLEET_VEHICLE_TYPE_LABELS,
  type FleetDocumentType,
  type FleetFuelType,
  type FleetOwnershipType,
  type FleetVehicleStatus,
  type FleetVehicleType,
} from '@/lib/logistics/fleet/constantsAndHelpers';

export function FleetVehiclesTab({
  vehicles,
  drivers,
  onRefresh,
}: {
  vehicles: any[];
  drivers: any[];
  onRefresh: () => void;
}) {
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);

  const [form, setForm] = useState({
    plate: '',
    vin: '',
    brand: '',
    model: '',
    modelYear: '2025',
    vehicleType: 'PANEL_VAN',
    fuelType: 'DIESEL',
    ownershipType: 'OWNED',
    capacityKg: '1500',
    capacityM3: '11',
    odometerKm: '0',
    expectedLPer100Km: '11.5',
    assignedDriverId: '',
    isRefrigerated: false,
    contractNo: '',
    lessorName: '',
    monthlyCostTry: '',
  });

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return vehicles.filter((v) => {
      if (typeFilter !== 'ALL' && v.vehicleType !== typeFilter) return false;
      if (statusFilter !== 'ALL' && v.status !== statusFilter) return false;
      if (
        q &&
        !String(v.plate || '').toLowerCase().includes(q) &&
        !String(v.brand || '').toLowerCase().includes(q) &&
        !String(v.model || '').toLowerCase().includes(q) &&
        !String(v.vin || '').toLowerCase().includes(q)
      ) {
        return false;
      }
      return true;
    });
  }, [vehicles, search, typeFilter, statusFilter]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await fetch('/api/filo', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'upsert_vehicle',
          plate: form.plate,
          vin: form.vin || null,
          brand: form.brand,
          model: form.model,
          modelYear: Number(form.modelYear),
          vehicleType: form.vehicleType,
          fuelType: form.fuelType,
          ownershipType: form.ownershipType,
          capacityKg: Number(form.capacityKg),
          capacityM3: Number(form.capacityM3),
          odometerKm: Number(form.odometerKm),
          expectedLPer100Km: Number(form.expectedLPer100Km),
          assignedDriverId: form.assignedDriverId || null,
          isRefrigerated: form.isRefrigerated,
          lease:
            form.ownershipType !== 'OWNED' && form.contractNo
              ? {
                  contractNo: form.contractNo,
                  lessorName: form.lessorName || 'Kurumsal Filo Kiralama',
                  monthlyCostTry: Number(form.monthlyCostTry || 0),
                }
              : undefined,
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Araç kaydedilemedi.');
      toast.success(json.message);
      setShowForm(false);
      setForm({ ...form, plate: '', vin: '', brand: '', model: '' });
      onRefresh();
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="bg-[#111513]/90 border border-white/[0.06] rounded-[20px] p-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-zinc-500 absolute left-3 top-2.5" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Plaka, şasi (VIN) veya marka ara..."
              className="bg-[#0B0F0D] border border-white/[0.08] rounded-full pl-8 pr-3 py-1.5 text-xs text-white w-60"
            />
          </div>
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="bg-[#0B0F0D] border border-white/[0.08] rounded-full px-3 py-1.5 text-xs text-zinc-200"
          >
            <option value="ALL">Tüm Araç Tipleri</option>
            {FLEET_VEHICLE_TYPES.map((t) => (
              <option key={t} value={t}>
                {FLEET_VEHICLE_TYPE_LABELS[t]}
              </option>
            ))}
          </select>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="bg-[#0B0F0D] border border-white/[0.08] rounded-full px-3 py-1.5 text-xs text-zinc-200"
          >
            <option value="ALL">Tüm Durumlar</option>
            {FLEET_VEHICLE_STATUSES.map((s) => (
              <option key={s} value={s}>
                {FLEET_VEHICLE_STATUS_LABELS[s]}
              </option>
            ))}
          </select>
        </div>

        <button
          type="button"
          onClick={() => setShowForm((s) => !s)}
          className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-full bg-[#34D399] hover:bg-emerald-300 text-[#061811] text-xs font-semibold cursor-pointer"
        >
          <Plus className="w-3.5 h-3.5" />
          Yeni Araç Ekle
        </button>
      </div>

      {showForm && (
        <form
          onSubmit={handleSave}
          className="bg-[#111513]/90 border border-emerald-500/25 rounded-[20px] p-5 grid grid-cols-1 md:grid-cols-4 gap-3"
        >
          <input required placeholder="Plaka (örn. 34 ABC 123)" value={form.plate} onChange={(e) => setForm({ ...form, plate: e.target.value })} className="bg-[#0B0F0D] border border-white/[0.1] rounded-xl px-3 py-2 text-xs text-white" />
          <input placeholder="Şasi No (VIN)" value={form.vin} onChange={(e) => setForm({ ...form, vin: e.target.value })} className="bg-[#0B0F0D] border border-white/[0.1] rounded-xl px-3 py-2 text-xs text-white" />
          <input required placeholder="Marka (Ford, Mercedes...)" value={form.brand} onChange={(e) => setForm({ ...form, brand: e.target.value })} className="bg-[#0B0F0D] border border-white/[0.1] rounded-xl px-3 py-2 text-xs text-white" />
          <input required placeholder="Model (Transit, Sprinter...)" value={form.model} onChange={(e) => setForm({ ...form, model: e.target.value })} className="bg-[#0B0F0D] border border-white/[0.1] rounded-xl px-3 py-2 text-xs text-white" />

          <select value={form.vehicleType} onChange={(e) => setForm({ ...form, vehicleType: e.target.value })} className="bg-[#0B0F0D] border border-white/[0.1] rounded-xl px-3 py-2 text-xs text-white">
            {FLEET_VEHICLE_TYPES.map((t) => <option key={t} value={t}>{FLEET_VEHICLE_TYPE_LABELS[t]}</option>)}
          </select>
          <select value={form.fuelType} onChange={(e) => setForm({ ...form, fuelType: e.target.value })} className="bg-[#0B0F0D] border border-white/[0.1] rounded-xl px-3 py-2 text-xs text-white">
            {FLEET_FUEL_TYPES.map((f) => <option key={f} value={f}>{FLEET_FUEL_TYPE_LABELS[f]}</option>)}
          </select>
          <select value={form.ownershipType} onChange={(e) => setForm({ ...form, ownershipType: e.target.value })} className="bg-[#0B0F0D] border border-white/[0.1] rounded-xl px-3 py-2 text-xs text-white">
            {FLEET_OWNERSHIP_TYPES.map((o) => <option key={o} value={o}>{FLEET_OWNERSHIP_LABELS[o]}</option>)}
          </select>
          <select value={form.assignedDriverId} onChange={(e) => setForm({ ...form, assignedDriverId: e.target.value })} className="bg-[#0B0F0D] border border-white/[0.1] rounded-xl px-3 py-2 text-xs text-white">
            <option value="">Şoför Seçin (Opsiyonel)</option>
            {drivers.map((d) => <option key={d.id} value={d.id}>{d.fullName}</option>)}
          </select>

          <input type="number" placeholder="Kapasite (kg)" value={form.capacityKg} onChange={(e) => setForm({ ...form, capacityKg: e.target.value })} className="bg-[#0B0F0D] border border-white/[0.1] rounded-xl px-3 py-2 text-xs text-white" />
          <input type="number" placeholder="Hacim (m³)" value={form.capacityM3} onChange={(e) => setForm({ ...form, capacityM3: e.target.value })} className="bg-[#0B0F0D] border border-white/[0.1] rounded-xl px-3 py-2 text-xs text-white" />
          <input type="number" placeholder="Km Sayacı" value={form.odometerKm} onChange={(e) => setForm({ ...form, odometerKm: e.target.value })} className="bg-[#0B0F0D] border border-white/[0.1] rounded-xl px-3 py-2 text-xs text-white" />
          <label className="flex items-center gap-2 text-xs text-zinc-300 px-2">
            <input type="checkbox" checked={form.isRefrigerated} onChange={(e) => setForm({ ...form, isRefrigerated: e.target.checked })} />
            Soğutuculu (Frigo) Kasa
          </label>

          {form.ownershipType !== 'OWNED' && (
            <>
              <input placeholder="Kiralama Sözleşme No" value={form.contractNo} onChange={(e) => setForm({ ...form, contractNo: e.target.value })} className="bg-[#0B0F0D] border border-white/[0.1] rounded-xl px-3 py-2 text-xs text-white" />
              <input placeholder="Kiralayan Firma" value={form.lessorName} onChange={(e) => setForm({ ...form, lessorName: e.target.value })} className="bg-[#0B0F0D] border border-white/[0.1] rounded-xl px-3 py-2 text-xs text-white" />
              <input type="number" placeholder="Aylık Kira Bedeli (₺)" value={form.monthlyCostTry} onChange={(e) => setForm({ ...form, monthlyCostTry: e.target.value })} className="bg-[#0B0F0D] border border-white/[0.1] rounded-xl px-3 py-2 text-xs text-white" />
            </>
          )}

          <div className="md:col-span-4 flex justify-end gap-2">
            <button type="button" onClick={() => setShowForm(false)} className="px-4 py-1.5 rounded-full bg-white/[0.06] text-xs text-zinc-300 cursor-pointer">İptal</button>
            <button type="submit" disabled={saving} className="px-5 py-1.5 rounded-full bg-[#34D399] text-[#061811] text-xs font-semibold cursor-pointer">
              {saving ? 'Kaydediliyor...' : 'Kaydet'}
            </button>
          </div>
        </form>
      )}

      <div className="bg-[#111513]/90 border border-white/[0.06] rounded-[20px] overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-white/[0.02] border-b border-white/[0.06] text-[11px] uppercase tracking-wider text-zinc-400">
                <th className="py-3 px-4">Plaka / Kod</th>
                <th className="py-3 px-4">Araç &amp; Şasi (VIN)</th>
                <th className="py-3 px-4">Kapasite &amp; Yakıt</th>
                <th className="py-3 px-4">Sahiplik / Kira</th>
                <th className="py-3 px-4">Km Sayacı</th>
                <th className="py-3 px-4">Şoför &amp; Belge</th>
                <th className="py-3 px-4">Durum</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/[0.05] text-xs">
              {filtered.map((v) => (
                <tr key={v.id} className="hover:bg-white/[0.02] border-l-2 border-l-transparent hover:border-l-emerald-400">
                  <td className="py-3 px-4">
                    <div className="font-bold text-white flex items-center gap-1.5">
                      <Truck className="w-3.5 h-3.5 text-[#34D399]" />
                      {v.plate}
                    </div>
                    <div className="text-[11px] text-zinc-500 font-mono">{v.code}</div>
                  </td>
                  <td className="py-3 px-4">
                    <div className="text-zinc-200 font-medium">{v.brand} {v.model} ({v.modelYear})</div>
                    <div className="text-[11px] text-zinc-500">
                      {FLEET_VEHICLE_TYPE_LABELS[v.vehicleType as FleetVehicleType] || v.vehicleType} · VIN: <span className="font-mono">{v.vin || '—'}</span>
                    </div>
                  </td>
                  <td className="py-3 px-4">
                    <div className="text-zinc-200">{Number(v.capacityKg).toLocaleString('tr-TR')} kg · {v.capacityM3} m³</div>
                    <div className="text-[11px] text-zinc-400">
                      {FLEET_FUEL_TYPE_LABELS[v.fuelType as FleetFuelType] || v.fuelType}
                      {v.isRefrigerated ? ` · Frigo (${v.targetTempMinC ?? 2}..${v.targetTempMaxC ?? 6}°C)` : ''}
                    </div>
                  </td>
                  <td className="py-3 px-4">
                    <div className="text-zinc-200">{FLEET_OWNERSHIP_LABELS[v.ownershipType as FleetOwnershipType] || v.ownershipType}</div>
                    {v.activeLease && (
                      <div className="text-[11px] text-amber-300 font-mono">
                        {v.activeLease.contractNo} · ₺{Number(v.activeLease.monthlyCostTry).toLocaleString('tr-TR')}/ay
                      </div>
                    )}
                  </td>
                  <td className="py-3 px-4 font-mono text-zinc-200">
                    {Number(v.odometerKm || 0).toLocaleString('tr-TR')} km
                  </td>
                  <td className="py-3 px-4">
                    <div className="text-zinc-200">{v.assignedDriverSummary?.fullName || 'Atanmadı'}</div>
                    {v.expiringDocumentCount > 0 ? (
                      <span className="text-[10px] text-rose-300 font-medium">{v.expiringDocumentCount} belge/vade uyarısı</span>
                    ) : (
                      <span className="text-[10px] text-emerald-400">Belgeler güncel</span>
                    )}
                  </td>
                  <td className="py-3 px-4">
                    <span className={`inline-flex px-2.5 py-0.5 rounded-full text-[10px] font-semibold border ${FLEET_VEHICLE_STATUS_BADGES[v.status as FleetVehicleStatus] || ''}`}>
                      {FLEET_VEHICLE_STATUS_LABELS[v.status as FleetVehicleStatus] || v.status}
                    </span>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={7} className="text-center py-8 text-zinc-500">Kriterlere uyan araç bulunamadı.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

export function FleetDriversKvkkTab({
  drivers,
  canRevealKvkkPii,
  isKvkkRevealed,
  onToggleRevealKvkk,
  onRefresh,
}: {
  drivers: any[];
  canRevealKvkkPii: boolean;
  isKvkkRevealed: boolean;
  onToggleRevealKvkk: () => void;
  onRefresh: () => void;
}) {
  const [showAdd, setShowAdd] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    fullName: '',
    tckn: '',
    phone: '',
    licenseClass: 'CE',
    licenseNumber: '',
    licenseExpiresAt: '',
    srcNumber: '',
    srcExpiresAt: '',
    shiftName: 'Gündüz Vardiyası',
  });

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await fetch('/api/filo', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'upsert_driver', ...form }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error);
      toast.success(json.message);
      setShowAdd(false);
      onRefresh();
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="bg-[#111513]/90 border border-white/[0.06] rounded-[20px] p-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2.5 text-xs text-zinc-300">
          <Users className="w-4 h-4 text-[#34D399]" />
          <span className="font-semibold text-white">Şoför Kadrosu ({drivers.length})</span>
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-white/[0.04] border border-white/[0.08] text-[11px] text-zinc-400">
            {isKvkkRevealed ? <Unlock className="w-3 h-3 text-amber-300" /> : <Lock className="w-3 h-3 text-[#34D399]" />}
            KVKK: {isKvkkRevealed ? 'Açık (Erişim Denetim Günlüğüne Loglandı)' : 'Maskeli Görünüm'}
          </span>
        </div>

        <div className="flex items-center gap-2">
          {canRevealKvkkPii && (
            <button
              type="button"
              onClick={onToggleRevealKvkk}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-white/[0.06] hover:bg-white/[0.12] border border-white/[0.1] text-xs text-white cursor-pointer"
            >
              {isKvkkRevealed ? <EyeOff className="w-3.5 h-3.5 text-amber-300" /> : <Eye className="w-3.5 h-3.5 text-[#34D399]" />}
              {isKvkkRevealed ? 'KVKK Alanlarını Maskele' : 'KVKK Alanlarını Aç (Logla)'}
            </button>
          )}
          <button
            type="button"
            onClick={() => setShowAdd((p) => !p)}
            className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-full bg-[#34D399] text-[#061811] text-xs font-semibold cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            Yeni Şoför
          </button>
        </div>
      </div>

      {showAdd && (
        <form onSubmit={handleSave} className="bg-[#111513]/90 border border-emerald-500/25 rounded-[20px] p-5 grid grid-cols-1 md:grid-cols-3 gap-3">
          <input required placeholder="Ad Soyad" value={form.fullName} onChange={(e) => setForm({ ...form, fullName: e.target.value })} className="bg-[#0B0F0D] border border-white/[0.1] rounded-xl px-3 py-2 text-xs text-white" />
          <input placeholder="TCKN (KVKK maskelenir)" value={form.tckn} onChange={(e) => setForm({ ...form, tckn: e.target.value })} className="bg-[#0B0F0D] border border-white/[0.1] rounded-xl px-3 py-2 text-xs text-white" />
          <input placeholder="Telefon" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} className="bg-[#0B0F0D] border border-white/[0.1] rounded-xl px-3 py-2 text-xs text-white" />
          <select value={form.licenseClass} onChange={(e) => setForm({ ...form, licenseClass: e.target.value })} className="bg-[#0B0F0D] border border-white/[0.1] rounded-xl px-3 py-2 text-xs text-white">
            <option value="B">B Sınıfı</option>
            <option value="C">C Sınıfı</option>
            <option value="CE">CE (Tır / Ağır Vasıta)</option>
            <option value="D1">D1 (Minibüs)</option>
            <option value="D">D (Otobüs)</option>
          </select>
          <input placeholder="Ehliyet Seri No" value={form.licenseNumber} onChange={(e) => setForm({ ...form, licenseNumber: e.target.value })} className="bg-[#0B0F0D] border border-white/[0.1] rounded-xl px-3 py-2 text-xs text-white" />
          <input type="date" title="Ehliyet Geçerlilik" value={form.licenseExpiresAt} onChange={(e) => setForm({ ...form, licenseExpiresAt: e.target.value })} className="bg-[#0B0F0D] border border-white/[0.1] rounded-xl px-3 py-2 text-xs text-white" />
          <div className="md:col-span-3 flex justify-end gap-2">
            <button type="button" onClick={() => setShowAdd(false)} className="px-4 py-1.5 rounded-full bg-white/[0.06] text-xs text-zinc-300 cursor-pointer">İptal</button>
            <button type="submit" disabled={saving} className="px-5 py-1.5 rounded-full bg-[#34D399] text-[#061811] text-xs font-semibold cursor-pointer">Kaydet</button>
          </div>
        </form>
      )}

      <div className="bg-[#111513]/90 border border-white/[0.06] rounded-[20px] overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-white/[0.02] border-b border-white/[0.06] text-[11px] uppercase tracking-wider text-zinc-400">
                <th className="py-3 px-4">Şoför</th>
                <th className="py-3 px-4">TCKN &amp; Telefon (KVKK)</th>
                <th className="py-3 px-4">Ehliyet &amp; Geçerlilik</th>
                <th className="py-3 px-4">SRC &amp; Psikoteknik</th>
                <th className="py-3 px-4">Vardiya</th>
                <th className="py-3 px-4">Uyum Durumu</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/[0.05] text-xs">
              {drivers.map((d) => (
                <tr key={d.id} className="hover:bg-white/[0.02]">
                  <td className="py-3 px-4">
                    <div className="font-semibold text-white">{d.fullName}</div>
                    <div className="text-[11px] text-zinc-500 font-mono">{d.code}</div>
                  </td>
                  <td className="py-3 px-4 font-mono text-zinc-300">
                    <div>{d.tckn || '—'}</div>
                    <div className="text-[11px] text-zinc-400">{d.phone || '—'}</div>
                  </td>
                  <td className="py-3 px-4">
                    <div className="text-zinc-200 font-semibold">{d.licenseClass} · <span className="font-mono font-normal text-zinc-400">{d.licenseNumber || '—'}</span></div>
                    <div className="text-[11px] text-zinc-400">
                      {d.licenseExpiresAt ? new Date(d.licenseExpiresAt).toLocaleDateString('tr-TR') : '—'}
                    </div>
                  </td>
                  <td className="py-3 px-4">
                    <div className="text-zinc-300">{d.srcType || 'SRC'} (<span className="font-mono text-zinc-400">{d.srcNumber || '—'}</span>)</div>
                    <div className="text-[11px] text-zinc-400">
                      Psikoteknik: {d.psychotechExpiresAt ? new Date(d.psychotechExpiresAt).toLocaleDateString('tr-TR') : '—'}
                    </div>
                  </td>
                  <td className="py-3 px-4 text-zinc-300">
                    <div>{d.shiftName}</div>
                    <div className="text-[11px] text-zinc-500">{d.shiftStart} - {d.shiftEnd}</div>
                  </td>
                  <td className="py-3 px-4">
                    {d.compliance?.hasAlert ? (
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-rose-500/15 text-rose-300 border border-rose-500/30">
                        <ShieldAlert className="w-3 h-3" /> Belge Yenileme Uyarısı
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-500/15 text-[#34D399] border border-emerald-500/30">
                        <ShieldCheck className="w-3 h-3" /> Geçerli
                      </span>
                    )}
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

export function FleetDocsAndPenaltiesTab({
  vehicles,
  drivers,
  documents,
  penalties,
  expiryAlerts,
  onRefresh,
}: {
  vehicles: any[];
  drivers: any[];
  documents: any[];
  penalties: any[];
  expiryAlerts: any;
  onRefresh: () => void;
}) {
  const [sendingAlerts, setSendingAlerts] = useState(false);
  const [docForm, setDocForm] = useState({ vehicleId: vehicles[0]?.id || '', docType: 'MUAYENE', documentNo: '', expiresAt: '', costTry: '' });
  const [penForm, setPenForm] = useState({ vehicleId: vehicles[0]?.id || '', driverId: '', penaltyNo: '', violationType: 'HIZ_IHLALI', reason: '', amountTry: '' });

  const handleDispatchAlerts = async () => {
    setSendingAlerts(true);
    try {
      const res = await fetch('/api/filo', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'dispatch_expiry_alerts' }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error);
      toast.success(json.message);
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setSendingAlerts(false);
    }
  };

  const handleAddDoc = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch('/api/filo', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'upsert_document', ...docForm, costTry: Number(docForm.costTry || 0) }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error);
      toast.success(json.message);
      setDocForm({ ...docForm, documentNo: '', costTry: '' });
      onRefresh();
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  const handleAddPenalty = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch('/api/filo', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'record_penalty', ...penForm, amountTry: Number(penForm.amountTry || 0) }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error);
      toast.success(json.message);
      setPenForm({ ...penForm, penaltyNo: '', reason: '', amountTry: '' });
      onRefresh();
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  return (
    <div className="space-y-4">
      <div className="bg-[#111513]/90 border border-white/[0.06] rounded-[20px] p-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3 text-xs">
          <AlertTriangle className="w-4 h-4 text-amber-400" />
          <span className="text-white font-semibold">
            Vade Uyarıları: {expiryAlerts?.expiredCount || 0} Süresi Dolmuş · {expiryAlerts?.expiringSoonCount || 0} Yaklaşan
          </span>
        </div>
        <button
          type="button"
          disabled={sendingAlerts}
          onClick={handleDispatchAlerts}
          className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-full bg-amber-500/20 hover:bg-amber-500/30 border border-amber-500/40 text-amber-200 text-xs font-semibold cursor-pointer"
        >
          <BellRing className="w-3.5 h-3.5" />
          {sendingAlerts ? 'Gönderiliyor...' : 'Bildirim Merkezine Uyarı Gönder'}
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <form onSubmit={handleAddDoc} className="bg-[#111513]/90 border border-white/[0.06] rounded-[20px] p-4 space-y-3">
          <div className="text-sm font-semibold text-white flex items-center gap-2">
            <FileCheck2 className="w-4 h-4 text-[#34D399]" /> Yeni Belge / Sigorta / Muayene
          </div>
          <div className="grid grid-cols-2 gap-2">
            <select required value={docForm.vehicleId} onChange={(e) => setDocForm({ ...docForm, vehicleId: e.target.value })} className="bg-[#0B0F0D] border border-white/[0.1] rounded-xl px-3 py-2 text-xs text-white">
              <option value="">Araç Seçin</option>
              {vehicles.map((v) => <option key={v.id} value={v.id}>{v.plate}</option>)}
            </select>
            <select value={docForm.docType} onChange={(e) => setDocForm({ ...docForm, docType: e.target.value })} className="bg-[#0B0F0D] border border-white/[0.1] rounded-xl px-3 py-2 text-xs text-white">
              {FLEET_DOCUMENT_TYPES.map((dt) => <option key={dt} value={dt}>{FLEET_DOCUMENT_TYPE_LABELS[dt]}</option>)}
            </select>
            <input placeholder="Poliçe / Belge No" value={docForm.documentNo} onChange={(e) => setDocForm({ ...docForm, documentNo: e.target.value })} className="bg-[#0B0F0D] border border-white/[0.1] rounded-xl px-3 py-2 text-xs text-white" />
            <input required type="date" value={docForm.expiresAt} onChange={(e) => setDocForm({ ...docForm, expiresAt: e.target.value })} className="bg-[#0B0F0D] border border-white/[0.1] rounded-xl px-3 py-2 text-xs text-white" />
            <input type="number" placeholder="Tutar (₺)" value={docForm.costTry} onChange={(e) => setDocForm({ ...docForm, costTry: e.target.value })} className="bg-[#0B0F0D] border border-white/[0.1] rounded-xl px-3 py-2 text-xs text-white" />
            <button type="submit" className="rounded-full bg-[#34D399] text-[#061811] text-xs font-semibold py-2 cursor-pointer">Belge Ekle</button>
          </div>
        </form>

        <form onSubmit={handleAddPenalty} className="bg-[#111513]/90 border border-white/[0.06] rounded-[20px] p-4 space-y-3">
          <div className="text-sm font-semibold text-white flex items-center gap-2">
            <CreditCard className="w-4 h-4 text-rose-400" /> Trafik Cezası Kaydet
          </div>
          <div className="grid grid-cols-2 gap-2">
            <select required value={penForm.vehicleId} onChange={(e) => setPenForm({ ...penForm, vehicleId: e.target.value })} className="bg-[#0B0F0D] border border-white/[0.1] rounded-xl px-3 py-2 text-xs text-white">
              <option value="">Araç Seçin</option>
              {vehicles.map((v) => <option key={v.id} value={v.id}>{v.plate}</option>)}
            </select>
            <select value={penForm.driverId} onChange={(e) => setPenForm({ ...penForm, driverId: e.target.value })} className="bg-[#0B0F0D] border border-white/[0.1] rounded-xl px-3 py-2 text-xs text-white">
              <option value="">Atanan Şoför (Otomatik)</option>
              {drivers.map((d) => <option key={d.id} value={d.id}>{d.fullName}</option>)}
            </select>
            <input required placeholder="Tutanak / Ceza No" value={penForm.penaltyNo} onChange={(e) => setPenForm({ ...penForm, penaltyNo: e.target.value })} className="bg-[#0B0F0D] border border-white/[0.1] rounded-xl px-3 py-2 text-xs text-white" />
            <input required placeholder="İhlal Nedeni" value={penForm.reason} onChange={(e) => setPenForm({ ...penForm, reason: e.target.value })} className="bg-[#0B0F0D] border border-white/[0.1] rounded-xl px-3 py-2 text-xs text-white" />
            <input required type="number" placeholder="Ceza Tutarı (₺)" value={penForm.amountTry} onChange={(e) => setPenForm({ ...penForm, amountTry: e.target.value })} className="bg-[#0B0F0D] border border-white/[0.1] rounded-xl px-3 py-2 text-xs text-white" />
            <button type="submit" className="rounded-full bg-rose-500/80 hover:bg-rose-500 text-white text-xs font-semibold py-2 cursor-pointer">Ceza İşle</button>
          </div>
        </form>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="bg-[#111513]/90 border border-white/[0.06] rounded-[20px] p-4">
          <h4 className="text-sm font-semibold text-white mb-3 flex items-center gap-2"><FileText className="w-4 h-4 text-[#34D399]" /> Araç Belgeleri ({documents.length})</h4>
          <div className="space-y-2 max-h-80 overflow-y-auto">
            {documents.map((doc) => (
              <div key={doc.id} className="bg-white/[0.02] border border-white/[0.05] rounded-xl p-3 flex items-center justify-between text-xs">
                <div>
                  <div className="font-semibold text-white">{doc.plate} · {FLEET_DOCUMENT_TYPE_LABELS[doc.docType as FleetDocumentType] || doc.docType}</div>
                  <div className="text-[11px] text-zinc-400">
                    {doc.documentNo || '—'} · Bitiş: {doc.expiresAt ? new Date(doc.expiresAt).toLocaleDateString('tr-TR') : '—'}
                  </div>
                </div>
                <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold border ${
                  doc.expiryStatus === 'EXPIRED'
                    ? 'bg-rose-500/15 text-rose-300 border-rose-500/30'
                    : doc.expiryStatus === 'EXPIRING_SOON'
                      ? 'bg-amber-500/15 text-amber-300 border-amber-500/30'
                      : 'bg-emerald-500/15 text-[#34D399] border-emerald-500/30'
                }`}>
                  {doc.expiryStatus === 'EXPIRED' ? `${Math.abs(doc.daysRemaining)}g geçti` : doc.expiryStatus === 'EXPIRING_SOON' ? `${doc.daysRemaining}g kaldı` : 'Geçerli'}
                </span>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-[#111513]/90 border border-white/[0.06] rounded-[20px] p-4">
          <h4 className="text-sm font-semibold text-white mb-3 flex items-center gap-2"><ShieldAlert className="w-4 h-4 text-rose-400" /> Trafik Cezaları ({penalties.length})</h4>
          <div className="space-y-2 max-h-80 overflow-y-auto">
            {penalties.map((p) => (
              <div key={p.id} className="bg-white/[0.02] border border-white/[0.05] rounded-xl p-3 flex items-center justify-between text-xs">
                <div>
                  <div className="font-semibold text-white">{p.plate} · <span className="font-mono text-zinc-400">{p.penaltyNo}</span></div>
                  <div className="text-[11px] text-zinc-400">{p.reason} {p.driverName ? `· ${p.driverName}` : ''}</div>
                </div>
                <div className="text-right">
                  <div className="font-mono font-bold text-rose-300">₺{Number(p.amountTry).toLocaleString('tr-TR')}</div>
                  <div className="text-[10px] text-zinc-400">{p.paymentStatus}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
