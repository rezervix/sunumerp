'use client';

import React, { useState } from 'react';
import {
  Activity,
  AlertCircle,
  AlertTriangle,
  CheckCircle2,
  ClipboardCheck,
  Clock,
  CreditCard,
  Plus,
  Settings,
  ShieldAlert,
  TrendingUp,
  Upload,
} from 'lucide-react';
import { toast } from 'sonner';
import {
  FLEET_MAINT_STATUS_LABELS,
  TIRE_POSITIONS,
  TIRE_POSITION_LABELS,
  type FleetMaintWorkOrderStatus,
  type TirePosition,
} from '@/lib/logistics/fleet/constantsAndHelpers';

export function FleetMaintenanceTab({
  vehicles,
  maintenance,
  onRefresh,
}: {
  vehicles: any[];
  maintenance: any;
  onRefresh: () => void;
}) {
  const [subTab, setSubTab] = useState<'orders' | 'plans' | 'faults' | 'tires'>('orders');
  const [woForm, setWoForm] = useState({ vehicleId: vehicles[0]?.id || '', orderType: 'PREVENTIVE', title: '', serviceProviderName: '', laborHours: '2', externalServiceCostTry: '0' });
  const [planForm, setPlanForm] = useState({ vehicleId: vehicles[0]?.id || '', name: '', planType: 'METER_KM', frequencyKm: '15000', frequencyDays: '180' });
  const [faultForm, setFaultForm] = useState({ vehicleId: vehicles[0]?.id || '', severity: 'HIGH', category: 'MEKANIK', title: '', createWorkOrder: true });
  const [tireForm, setTireForm] = useState({ vehicleId: vehicles[0]?.id || '', serialOrDot: '', brandModel: '', sizeCode: '215/65R16C', position: 'FRONT_LEFT', currentTreadDepthMm: '7.5' });
  const [sparePartWoId, setSparePartWoId] = useState('');
  const [spareItemId, setSpareItemId] = useState(maintenance?.sparePartItems?.[0]?.id || '');
  const [spareQty, setSpareQty] = useState('1');

  const postAction = async (payload: Record<string, any>) => {
    const res = await fetch('/api/filo', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    const json = await res.json();
    if (!res.ok) throw new Error(json.error || 'İşlem başarısız.');
    toast.success(json.message);
    onRefresh();
  };

  const kpis = maintenance?.kpis || {};
  const plans = maintenance?.plans || [];
  const workOrders = maintenance?.workOrders || [];
  const faultLogs = maintenance?.faultLogs || [];
  const tires = maintenance?.tires || [];
  const sparePartItems = maintenance?.sparePartItems || [];

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        {[
          { label: 'MTBF (Arızalar Arası)', val: `${kpis.mtbfHours ?? 0} sa`, color: 'text-[#1267E6]' },
          { label: 'MTTR (Ort. Onarım)', val: `${kpis.mttrMinutes ?? 0} dk`, color: 'text-sky-300' },
          { label: 'Vadesi Gelen / Geçen Plan', val: `${kpis.dueOrOverduePlanCount ?? 0} / ${kpis.soonPlanCount ?? 0}`, color: 'text-amber-300' },
          { label: 'Açık İş Emri / Arıza', val: `${kpis.openWorkOrderCount ?? 0} / ${kpis.openFaultCount ?? 0}`, color: 'text-rose-300' },
          { label: 'Toplam Bakım Maliyeti', val: `₺${Number(kpis.totalMaintenanceCostTry || 0).toLocaleString('tr-TR')}`, color: 'text-white' },
        ].map((card) => (
          <div key={card.label} className="bg-[white]/90 border border-[--line] rounded-[20px] p-4">
            <div className="text-[11px] text-zinc-400">{card.label}</div>
            <div className={`text-xl font-bold font-mono mt-1 ${card.color}`}>{card.val}</div>
          </div>
        ))}
      </div>

      <div className="flex flex-wrap items-center justify-between gap-2 bg-[white]/90 border border-[--line] rounded-[20px] p-3">
        <div className="flex flex-wrap gap-1.5">
          {[
            { id: 'orders', label: `Bakım İş Emirleri (${workOrders.length})` },
            { id: 'plans', label: `Periyodik Planlar (${plans.length})` },
            { id: 'faults', label: `Arıza Kayıtları (${faultLogs.length})` },
            { id: 'tires', label: `Lastik Takibi (${tires.length})` },
          ].map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => setSubTab(t.id as any)}
              className={`px-3.5 py-1.5 rounded-full text-xs font-medium cursor-pointer transition ${
                subTab === t.id
                  ? 'bg-[--brand]/15 text-[#1267E6] border border-[--brand-line]'
                  : 'bg-white text-zinc-400 border border-[--line]'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
        <span className="text-[11px] text-zinc-400 px-2">
          Bağımsız Filo Bakım Motoru (Stok yedek parçaları: InventoryItem)
        </span>
      </div>

      {subTab === 'orders' && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <form
              onSubmit={async (e) => {
                e.preventDefault();
                try {
                  await postAction({
                    action: 'create_maint_wo',
                    ...woForm,
                    laborHours: Number(woForm.laborHours),
                    externalServiceCostTry: Number(woForm.externalServiceCostTry),
                  });
                  setWoForm({ ...woForm, title: '' });
                } catch (err: any) {
                  toast.error(err.message);
                }
              }}
              className="bg-[white]/90 border border-[--line] rounded-[20px] p-4 space-y-2.5"
            >
              <div className="text-xs font-semibold text-white flex items-center gap-1.5"><Plus className="w-3.5 h-3.5 text-[#1267E6]" /> Yeni Araç Bakım İş Emri</div>
              <div className="grid grid-cols-2 gap-2">
                <select required value={woForm.vehicleId} onChange={(e) => setWoForm({ ...woForm, vehicleId: e.target.value })} className="bg-[#0B0F0D] border border-white/[0.1] rounded-xl px-3 py-1.5 text-xs text-white">
                  <option value="">Araç Seçin</option>
                  {vehicles.map((v) => <option key={v.id} value={v.id}>{v.plate}</option>)}
                </select>
                <select value={woForm.orderType} onChange={(e) => setWoForm({ ...woForm, orderType: e.target.value })} className="bg-[#0B0F0D] border border-white/[0.1] rounded-xl px-3 py-1.5 text-xs text-white">
                  <option value="PREVENTIVE">Periyodik Bakım</option>
                  <option value="BREAKDOWN">Arıza Onarımı</option>
                  <option value="TIRE_SERVICE">Lastik / Rot-Balans</option>
                  <option value="INSPECTION_PREP">Muayene Hazırlık</option>
                </select>
                <input required placeholder="İş Emri Başlığı" value={woForm.title} onChange={(e) => setWoForm({ ...woForm, title: e.target.value })} className="col-span-2 bg-[#0B0F0D] border border-white/[0.1] rounded-xl px-3 py-1.5 text-xs text-white" />
                <input placeholder="Servis / Atölye" value={woForm.serviceProviderName} onChange={(e) => setWoForm({ ...woForm, serviceProviderName: e.target.value })} className="bg-[#0B0F0D] border border-white/[0.1] rounded-xl px-3 py-1.5 text-xs text-white" />
                <input type="number" placeholder="Dış Servis Tutarı (₺)" value={woForm.externalServiceCostTry} onChange={(e) => setWoForm({ ...woForm, externalServiceCostTry: e.target.value })} className="bg-[#0B0F0D] border border-white/[0.1] rounded-xl px-3 py-1.5 text-xs text-white" />
              </div>
              <button type="submit" className="w-full py-2 rounded-full bg-[#1267E6] text-white text-xs font-semibold cursor-pointer">İş Emri Aç</button>
            </form>

            <form
              onSubmit={async (e) => {
                e.preventDefault();
                try {
                  await postAction({
                    action: 'record_spare_part',
                    workOrderId: sparePartWoId,
                    itemId: spareItemId,
                    quantityUsed: Number(spareQty || 1),
                  });
                } catch (err: any) {
                  toast.error(err.message);
                }
              }}
              className="bg-[white]/90 border border-[--line] rounded-[20px] p-4 space-y-2.5"
            >
              <div className="text-xs font-semibold text-white flex items-center gap-1.5"><Settings className="w-3.5 h-3.5 text-[#1267E6]" /> İş Emrine Yedek Parça Sarfiyatı (Mevcut Stoktan)</div>
              <div className="grid grid-cols-2 gap-2">
                <select required value={sparePartWoId} onChange={(e) => setSparePartWoId(e.target.value)} className="col-span-2 bg-[#0B0F0D] border border-white/[0.1] rounded-xl px-3 py-1.5 text-xs text-white">
                  <option value="">İş Emri Seçin</option>
                  {workOrders.filter((w: any) => w.status !== 'CANCELLED').map((w: any) => (
                    <option key={w.id} value={w.id}>{w.workOrderNumber} · {w.plate} ({w.title})</option>
                  ))}
                </select>
                <select required value={spareItemId} onChange={(e) => setSpareItemId(e.target.value)} className="bg-[#0B0F0D] border border-white/[0.1] rounded-xl px-3 py-1.5 text-xs text-white">
                  <option value="">Stok Kartı Seçin</option>
                  {sparePartItems.map((it: any) => (
                    <option key={it.id} value={it.id}>{it.sku} - {it.name} (₺{it.unitCost})</option>
                  ))}
                </select>
                <input type="number" step="0.01" placeholder="Miktar" value={spareQty} onChange={(e) => setSpareQty(e.target.value)} className="bg-[#0B0F0D] border border-white/[0.1] rounded-xl px-3 py-1.5 text-xs text-white" />
              </div>
              <button type="submit" className="w-full py-2 rounded-full bg-white/[0.08] hover:bg-white/[0.14] border border-white/[0.1] text-white text-xs font-semibold cursor-pointer">Parça Düş &amp; Maliyete Ekle</button>
            </form>
          </div>

          <div className="bg-[white]/90 border border-[--line] rounded-[20px] overflow-hidden">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-[--page] border-b border-[--line] text-[11px] uppercase text-zinc-400">
                  <th className="py-3 px-4">İş Emri / Araç</th>
                  <th className="py-3 px-4">Tür &amp; Başlık</th>
                  <th className="py-3 px-4">Parça / Duruş</th>
                  <th className="py-3 px-4">Maliyet (₺)</th>
                  <th className="py-3 px-4">Durum &amp; Aksiyon</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/[0.05]">
                {workOrders.map((wo: any) => (
                  <tr key={wo.id}>
                    <td className="py-3 px-4">
                      <div className="font-mono font-semibold text-white">{wo.workOrderNumber}</div>
                      <div className="text-[11px] text-[#1267E6]">{wo.plate}</div>
                    </td>
                    <td className="py-3 px-4">
                      <div className="text-zinc-200 font-medium">{wo.title}</div>
                      <div className="text-[11px] text-zinc-500">{wo.orderType} · {wo.serviceProviderName || 'İç Servis'}</div>
                    </td>
                    <td className="py-3 px-4 text-zinc-300">
                      <div>{wo.spareParts?.length || 0} parça · {wo.downtimeMinutes || 0} dk</div>
                    </td>
                    <td className="py-3 px-4 font-mono text-zinc-200">₺{Number(wo.totalCostTry || 0).toLocaleString('tr-TR')}</td>
                    <td className="py-3 px-4 flex flex-wrap items-center gap-1.5">
                      <span className="px-2 py-0.5 rounded-full text-[10px] bg-white/[0.05] border border-white/[0.1] text-zinc-300">
                        {FLEET_MAINT_STATUS_LABELS[wo.status as FleetMaintWorkOrderStatus] || wo.status}
                      </span>
                      {wo.status === 'REQUESTED' && (
                        <button type="button" onClick={() => postAction({ action: 'update_maint_wo_status', workOrderId: wo.id, nextStatus: 'IN_PROGRESS' })} className="px-2.5 py-1 rounded-full bg-sky-500/20 text-sky-300 text-[10px] cursor-pointer">Servise Al</button>
                      )}
                      {wo.status === 'IN_PROGRESS' && (
                        <button type="button" onClick={() => postAction({ action: 'update_maint_wo_status', workOrderId: wo.id, nextStatus: 'COMPLETED', downtimeMinutes: 90, laborHours: 2 })} className="px-2.5 py-1 rounded-full bg-[#1267E6] text-white font-semibold text-[10px] cursor-pointer">Tamamla &amp; Finansa İşle</button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {subTab === 'plans' && (
        <div className="space-y-4">
          <form
            onSubmit={async (e) => {
              e.preventDefault();
              try {
                await postAction({
                  action: 'upsert_maint_plan',
                  ...planForm,
                  frequencyKm: Number(planForm.frequencyKm),
                  frequencyDays: Number(planForm.frequencyDays),
                });
                setPlanForm({ ...planForm, name: '' });
              } catch (err: any) {
                toast.error(err.message);
              }
            }}
            className="bg-[white]/90 border border-[--line] rounded-[20px] p-4 grid grid-cols-1 md:grid-cols-5 gap-2"
          >
            <select required value={planForm.vehicleId} onChange={(e) => setPlanForm({ ...planForm, vehicleId: e.target.value })} className="bg-[#0B0F0D] border border-white/[0.1] rounded-xl px-3 py-2 text-xs text-white">
              <option value="">Araç Seçin</option>
              {vehicles.map((v) => <option key={v.id} value={v.id}>{v.plate}</option>)}
            </select>
            <input required placeholder="Plan Adı (örn. 15.000 km Yağ Bakımı)" value={planForm.name} onChange={(e) => setPlanForm({ ...planForm, name: e.target.value })} className="bg-[#0B0F0D] border border-white/[0.1] rounded-xl px-3 py-2 text-xs text-white" />
            <select value={planForm.planType} onChange={(e) => setPlanForm({ ...planForm, planType: e.target.value })} className="bg-[#0B0F0D] border border-white/[0.1] rounded-xl px-3 py-2 text-xs text-white">
              <option value="METER_KM">Kilometre Bazlı</option>
              <option value="CALENDAR">Takvim Bazlı</option>
              <option value="METER_HOURS">Motor / Frigo Saati</option>
            </select>
            <input type="number" placeholder="Periyot (km)" value={planForm.frequencyKm} onChange={(e) => setPlanForm({ ...planForm, frequencyKm: e.target.value })} className="bg-[#0B0F0D] border border-white/[0.1] rounded-xl px-3 py-2 text-xs text-white" />
            <button type="submit" className="rounded-full bg-[#1267E6] text-white text-xs font-semibold cursor-pointer">Bakım Planı Ekle</button>
          </form>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {plans.map((p: any) => (
              <div key={p.id} className="bg-[white]/90 border border-[--line] rounded-2xl p-4 flex items-center justify-between text-xs">
                <div>
                  <div className="font-semibold text-white">{p.plate || 'Genel'} · {p.name}</div>
                  <div className="text-[11px] text-zinc-400 mt-0.5">
                    Tip: {p.planType} {p.frequencyKm ? `· ${Number(p.frequencyKm).toLocaleString('tr-TR')} km` : ''} {p.frequencyDays ? `· ${p.frequencyDays} gün` : ''}
                  </div>
                  {p.reason && <div className="text-[11px] text-amber-300 mt-1">{p.reason}</div>}
                </div>
                <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-semibold border ${
                  p.isDue
                    ? 'bg-rose-500/15 text-rose-300 border-rose-500/30'
                    : p.isSoon
                      ? 'bg-amber-500/15 text-amber-300 border-amber-500/30'
                      : 'bg-[--brand]/15 text-[#1267E6] border-[--brand-line]'
                }`}>
                  {p.isDue ? 'Bakım Vadesi Geldi/Geçti' : p.isSoon ? 'Yaklaşıyor' : 'Normal'}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {subTab === 'faults' && (
        <div className="space-y-4">
          <form
            onSubmit={async (e) => {
              e.preventDefault();
              try {
                await postAction({ action: 'create_fault', ...faultForm });
                setFaultForm({ ...faultForm, title: '' });
              } catch (err: any) {
                toast.error(err.message);
              }
            }}
            className="bg-[white]/90 border border-[--line] rounded-[20px] p-4 grid grid-cols-1 md:grid-cols-5 gap-2"
          >
            <select required value={faultForm.vehicleId} onChange={(e) => setFaultForm({ ...faultForm, vehicleId: e.target.value })} className="bg-[#0B0F0D] border border-white/[0.1] rounded-xl px-3 py-2 text-xs text-white">
              <option value="">Araç Seçin</option>
              {vehicles.map((v) => <option key={v.id} value={v.id}>{v.plate}</option>)}
            </select>
            <input required placeholder="Arıza Açıklaması" value={faultForm.title} onChange={(e) => setFaultForm({ ...faultForm, title: e.target.value })} className="md:col-span-2 bg-[#0B0F0D] border border-white/[0.1] rounded-xl px-3 py-2 text-xs text-white" />
            <select value={faultForm.severity} onChange={(e) => setFaultForm({ ...faultForm, severity: e.target.value })} className="bg-[#0B0F0D] border border-white/[0.1] rounded-xl px-3 py-2 text-xs text-white">
              <option value="MEDIUM">Orta</option>
              <option value="HIGH">Yüksek</option>
              <option value="CRITICAL">Kritik</option>
            </select>
            <button type="submit" className="rounded-full bg-rose-500/80 text-white text-xs font-semibold cursor-pointer">Arıza + İş Emri Aç</button>
          </form>

          <div className="space-y-2">
            {faultLogs.map((f: any) => (
              <div key={f.id} className="bg-[white]/90 border border-[--line] rounded-2xl p-3.5 flex items-center justify-between text-xs">
                <div>
                  <div className="font-semibold text-white"><span className="font-mono text-zinc-400">{f.faultCode}</span> · {f.plate} — {f.title}</div>
                  <div className="text-[11px] text-zinc-400">{f.category} · Öncelik: {f.severity} · {Number(f.odometerKm).toLocaleString('tr-TR')} km</div>
                </div>
                <span className="px-2.5 py-0.5 rounded-full text-[10px] bg-white/[0.05] text-zinc-300 border border-white/[0.1]">{f.status}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {subTab === 'tires' && (
        <div className="space-y-4">
          <form
            onSubmit={async (e) => {
              e.preventDefault();
              try {
                await postAction({ action: 'upsert_tire', ...tireForm, currentTreadDepthMm: Number(tireForm.currentTreadDepthMm) });
              } catch (err: any) {
                toast.error(err.message);
              }
            }}
            className="bg-[white]/90 border border-[--line] rounded-[20px] p-4 grid grid-cols-1 md:grid-cols-6 gap-2"
          >
            <select required value={tireForm.vehicleId} onChange={(e) => setTireForm({ ...tireForm, vehicleId: e.target.value })} className="bg-[#0B0F0D] border border-white/[0.1] rounded-xl px-3 py-2 text-xs text-white">
              <option value="">Araç Seçin</option>
              {vehicles.map((v) => <option key={v.id} value={v.id}>{v.plate}</option>)}
            </select>
            <select value={tireForm.position} onChange={(e) => setTireForm({ ...tireForm, position: e.target.value })} className="bg-[#0B0F0D] border border-white/[0.1] rounded-xl px-3 py-2 text-xs text-white">
              {TIRE_POSITIONS.map((tp) => <option key={tp} value={tp}>{TIRE_POSITION_LABELS[tp]}</option>)}
            </select>
            <input required placeholder="DOT / Seri" value={tireForm.serialOrDot} onChange={(e) => setTireForm({ ...tireForm, serialOrDot: e.target.value })} className="bg-[#0B0F0D] border border-white/[0.1] rounded-xl px-3 py-2 text-xs text-white" />
            <input required placeholder="Marka Model" value={tireForm.brandModel} onChange={(e) => setTireForm({ ...tireForm, brandModel: e.target.value })} className="bg-[#0B0F0D] border border-white/[0.1] rounded-xl px-3 py-2 text-xs text-white" />
            <input type="number" step="0.1" placeholder="Diş (mm)" value={tireForm.currentTreadDepthMm} onChange={(e) => setTireForm({ ...tireForm, currentTreadDepthMm: e.target.value })} className="bg-[#0B0F0D] border border-white/[0.1] rounded-xl px-3 py-2 text-xs text-white" />
            <button type="submit" className="rounded-full bg-[#1267E6] text-white text-xs font-semibold cursor-pointer">Lastik Kaydet</button>
          </form>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {tires.map((t: any) => (
              <div key={t.id} className="bg-[white]/90 border border-[--line] rounded-2xl p-3.5 text-xs flex items-center justify-between">
                <div>
                  <div className="font-semibold text-white">{t.plate} · {TIRE_POSITION_LABELS[t.position as TirePosition] || t.position}</div>
                  <div className="text-[11px] text-zinc-400">{t.brandModel} ({t.sizeCode}) · <span className="font-mono">{t.serialOrDot}</span></div>
                </div>
                <div className="text-right">
                  <div className={`font-mono font-bold ${t.treadWarning ? 'text-rose-300' : 'text-[#1267E6]'}`}>{t.currentTreadDepthMm} mm</div>
                  <div className="text-[10px] text-zinc-500">Min {t.minTreadDepthMm} mm</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export function FleetFuelTab({
  vehicles,
  fuel,
  onRefresh,
}: {
  vehicles: any[];
  fuel: any;
  onRefresh: () => void;
}) {
  const [form, setForm] = useState({
    vehicleId: vehicles[0]?.id || '',
    odometerKm: '',
    liters: '',
    totalAmountTry: '',
    stationName: '',
    invoiceRef: '',
    invoiceLiters: '',
    invoiceAmountTry: '',
  });
  const [csvText, setCsvText] = useState('');

  const summaries = fuel?.vehicleSummaries || [];
  const logs = fuel?.logs || [];
  const anomalyLogs = fuel?.anomalyLogs || [];

  const handleSaveFuel = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch('/api/filo', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'record_fuel',
          ...form,
          odometerKm: Number(form.odometerKm),
          liters: Number(form.liters),
          totalAmountTry: Number(form.totalAmountTry),
          invoiceLiters: form.invoiceLiters ? Number(form.invoiceLiters) : null,
          invoiceAmountTry: form.invoiceAmountTry ? Number(form.invoiceAmountTry) : null,
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error);
      toast.success(json.message);
      setForm({ ...form, odometerKm: '', liters: '', totalAmountTry: '' });
      onRefresh();
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  const handleImportCsv = async () => {
    try {
      const lines = csvText.trim().split(/\r?\n/).filter(Boolean);
      const rows = lines.map((line) => {
        const [plate, fuelDate, odometerKm, liters, totalAmountTry, invoiceRef, invoiceLiters, invoiceAmountTry] = line.split(',').map((s) => s.trim());
        return {
          plate,
          fuelDate,
          odometerKm: Number(odometerKm || 0),
          liters: Number(liters || 0),
          totalAmountTry: Number(totalAmountTry || 0),
          invoiceRef,
          invoiceLiters: Number(invoiceLiters || liters || 0),
          invoiceAmountTry: Number(invoiceAmountTry || totalAmountTry || 0),
        };
      });
      const res = await fetch('/api/filo', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'import_fuel_cards', rows }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error);
      toast.success(json.message);
      setCsvText('');
      onRefresh();
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  return (
    <div className="space-y-4">
      {anomalyLogs.length > 0 && (
        <div className="bg-rose-500/10 border border-rose-500/30 rounded-2xl p-3.5 text-xs text-rose-200 flex items-start gap-2.5">
          <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
          <div>
            <strong>Anormal Tüketim Tespit Edildi ({anomalyLogs.length} kayıt):</strong>{' '}
            {anomalyLogs.map((a: any) => `${a.plate} (${a.calculatedLPer100Km} L/100km)`).join(', ')}
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <form onSubmit={handleSaveFuel} className="bg-[white]/90 border border-[--line] rounded-[20px] p-4 space-y-2.5">
          <div className="text-xs font-semibold text-white flex items-center gap-1.5"><CreditCard className="w-3.5 h-3.5 text-[#1267E6]" /> Elle Yakıt Alımı Kaydet</div>
          <div className="grid grid-cols-2 gap-2">
            <select required value={form.vehicleId} onChange={(e) => setForm({ ...form, vehicleId: e.target.value })} className="bg-[#0B0F0D] border border-white/[0.1] rounded-xl px-3 py-1.5 text-xs text-white">
              <option value="">Araç Seçin</option>
              {vehicles.map((v) => <option key={v.id} value={v.id}>{v.plate}</option>)}
            </select>
            <input required type="number" placeholder="Km Sayacı" value={form.odometerKm} onChange={(e) => setForm({ ...form, odometerKm: e.target.value })} className="bg-[#0B0F0D] border border-white/[0.1] rounded-xl px-3 py-1.5 text-xs text-white" />
            <input required type="number" step="0.01" placeholder="Litre" value={form.liters} onChange={(e) => setForm({ ...form, liters: e.target.value })} className="bg-[#0B0F0D] border border-white/[0.1] rounded-xl px-3 py-1.5 text-xs text-white" />
            <input required type="number" step="0.01" placeholder="Toplam Tutar (₺)" value={form.totalAmountTry} onChange={(e) => setForm({ ...form, totalAmountTry: e.target.value })} className="bg-[#0B0F0D] border border-white/[0.1] rounded-xl px-3 py-1.5 text-xs text-white" />
            <input placeholder="İstasyon" value={form.stationName} onChange={(e) => setForm({ ...form, stationName: e.target.value })} className="bg-[#0B0F0D] border border-white/[0.1] rounded-xl px-3 py-1.5 text-xs text-white" />
            <input placeholder="Fatura Ref (Opsiyonel)" value={form.invoiceRef} onChange={(e) => setForm({ ...form, invoiceRef: e.target.value })} className="bg-[#0B0F0D] border border-white/[0.1] rounded-xl px-3 py-1.5 text-xs text-white" />
          </div>
          <button type="submit" className="w-full py-2 rounded-full bg-[#1267E6] text-white text-xs font-semibold cursor-pointer">Yakıt Kaydet &amp; Finansa Bağla</button>
        </form>

        <div className="bg-[white]/90 border border-[--line] rounded-[20px] p-4 space-y-2.5">
          <div className="text-xs font-semibold text-white flex items-center gap-1.5"><Upload className="w-3.5 h-3.5 text-[#1267E6]" /> Yakıt Kartı Ekstresi İçe Aktar (CSV)</div>
          <textarea
            rows={4}
            value={csvText}
            onChange={(e) => setCsvText(e.target.value)}
            placeholder="plaka,tarih,km,litre,tutar,faturaNo,faturaLitre,faturaTutar&#10;34 SNR 808,2026-11-15,91420,82,3690,FAT-8812,82,3690"
            className="w-full bg-[#0B0F0D] border border-white/[0.1] rounded-xl p-2.5 text-[11px] font-mono text-zinc-200"
          />
          <button type="button" onClick={handleImportCsv} disabled={!csvText.trim()} className="w-full py-2 rounded-full bg-white/[0.08] hover:bg-white/[0.14] border border-white/[0.1] text-white text-xs font-semibold cursor-pointer">
            Ekstreyi İçe Aktar &amp; Mutabakat Yap
          </button>
        </div>
      </div>

      <div className="bg-[white]/90 border border-[--line] rounded-[20px] overflow-hidden">
        <div className="p-4 border-b border-[--line] text-sm font-semibold text-white">
          Araç Bazlı Tüketim (L/100km) &amp; Kart Fatura Mutabakatı
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-[--page] border-b border-[--line] text-[11px] uppercase text-zinc-400">
                <th className="py-3 px-4">Araç</th>
                <th className="py-3 px-4">Mesafe (km)</th>
                <th className="py-3 px-4">Ort. Tüketim</th>
                <th className="py-3 px-4">Kaydedilen / Fatura (L)</th>
                <th className="py-3 px-4">Fatura Tutarı / Fark (₺)</th>
                <th className="py-3 px-4">Mutabakat</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/[0.05]">
              {summaries.map((s: any) => (
                <tr key={s.vehicleId}>
                  <td className="py-3 px-4">
                    <div className="font-semibold text-white">{s.plate}</div>
                    <div className="text-[11px] text-zinc-500">{s.brandModel}</div>
                  </td>
                  <td className="py-3 px-4 font-mono text-zinc-300">{Number(s.totalDistanceKm || 0).toLocaleString('tr-TR')} km</td>
                  <td className="py-3 px-4 font-mono">
                    <span className={s.anomalyCount > 0 ? 'text-rose-300 font-bold' : 'text-[#1267E6]'}>
                      {s.avgLitersPer100Km !== null ? `${s.avgLitersPer100Km} L/100km` : '—'}
                    </span>
                    <div className="text-[10px] text-zinc-500">Hedef: {s.expectedLPer100Km} L</div>
                  </td>
                  <td className="py-3 px-4 font-mono text-zinc-300">
                    {s.totalLitersLogged} L / {s.totalInvoiceLiters} L
                  </td>
                  <td className="py-3 px-4 font-mono text-zinc-300">
                    ₺{Number(s.totalInvoiceAmountTry || 0).toLocaleString('tr-TR')} (Fark: ₺{s.amountVarianceTry})
                  </td>
                  <td className="py-3 px-4">
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold border ${
                      s.reconciliationStatus === 'VARIANCE_WARNING'
                        ? 'bg-rose-500/15 text-rose-300 border-rose-500/30'
                        : s.reconciliationStatus === 'MATCHED'
                          ? 'bg-[--brand]/15 text-[#1267E6] border-[--brand-line]'
                          : 'bg-zinc-500/15 text-zinc-400 border-[--line]'
                    }`}>
                      {s.reconciliationStatus === 'VARIANCE_WARNING' ? 'Fark Uyarısı' : s.reconciliationStatus === 'MATCHED' ? 'Mutabık' : 'Fatura Bekliyor'}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="bg-[white]/90 border border-[--line] rounded-[20px] p-4">
        <div className="text-xs font-semibold text-white mb-2">Son Yakıt İşlemleri ({logs.length})</div>
        <div className="space-y-1.5 max-h-60 overflow-y-auto text-xs">
          {logs.slice(0, 25).map((l: any) => (
            <div key={l.id} className="bg-[--page] border border-white/[0.05] rounded-xl px-3 py-2 flex items-center justify-between">
              <div>
                <span className="font-semibold text-white">{l.plate}</span> · {new Date(l.fuelDate).toLocaleDateString('tr-TR')} · {l.stationName || 'İstasyon'}
                {l.isAnomaly && <span className="ml-2 px-2 py-0.5 rounded-full text-[10px] bg-rose-500/15 text-rose-300">Anormal Tüketim</span>}
              </div>
              <div className="font-mono text-zinc-300">
                {l.liters} L · ₺{Number(l.totalAmountTry).toLocaleString('tr-TR')} {l.calculatedLPer100Km ? `(${l.calculatedLPer100Km} L/100km)` : ''}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
