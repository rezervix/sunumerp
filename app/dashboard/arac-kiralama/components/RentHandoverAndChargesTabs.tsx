'use client';

import React, { useMemo, useRef, useState } from 'react';
import {
  AlertTriangle,
  Camera,
  CheckCircle2,
  ClipboardCheck,
  CreditCard,
  FileCheck2,
  Plus,
  RefreshCw,
  Upload,
} from 'lucide-react';
import { toast } from 'sonner';
import {
  compareDeliveryAndReturnForms,
  RENT_CHARGE_ENTRY_TYPE_LABELS,
  RENT_CHARGE_STATUS_LABELS,
  RENT_DAMAGE_ZONES,
  type RentChargeEntryType,
} from '@/lib/tourism/rentacar/constantsAndHelpers';

const DEMO_DAMAGE_PHOTOS = [
  {
    label: 'Hasarsız Çıkış Ekspertizi',
    url: '/uploads/pod-demo/rentacar-teslim-ekspertiz.svg',
  },
  {
    label: 'Ön Tampon Sağ Köşe Sürtme',
    url: '/uploads/pod-demo/rentacar-hasar-on-tampon.svg',
  },
  {
    label: 'Sağ Ön Kapı Hafif Göçük',
    url: '/uploads/pod-demo/rentacar-hasar-sag-kapi.svg',
  },
];

export function RentHandoverAndReturnTab({
  reservations,
  inspectionForms,
  policyConfig,
  demoCompanyId,
  selectedReservationId,
  onSelectReservationId,
  onRefresh,
}: {
  reservations: any[];
  inspectionForms: any[];
  policyConfig: any;
  demoCompanyId?: string;
  selectedReservationId?: string | null;
  onSelectReservationId: (id: string) => void;
  onRefresh: () => void;
}) {
  const actionableReservations = useMemo(
    () =>
      reservations.filter(
        (r) =>
          r.status === 'ACTIVE' ||
          r.status === 'CONFIRMED' ||
          r.status === 'COMPLETED'
      ),
    [reservations]
  );

  const activeRes = useMemo(
    () =>
      actionableReservations.find((r) => r.id === selectedReservationId) ||
      actionableReservations.find((r) => r.status === 'ACTIVE') ||
      actionableReservations[0] ||
      null,
    [actionableReservations, selectedReservationId]
  );

  const existingDeliveryForm = useMemo(
    () =>
      inspectionForms.find(
        (f) => f.reservationId === activeRes?.id && f.formType === 'DELIVERY'
      ) || null,
    [inspectionForms, activeRes]
  );

  const existingReturnForm = useMemo(
    () =>
      inspectionForms.find(
        (f) => f.reservationId === activeRes?.id && f.formType === 'RETURN'
      ) || null,
    [inspectionForms, activeRes]
  );

  const [formType, setFormType] = useState<'DELIVERY' | 'RETURN'>(
    activeRes?.status === 'CONFIRMED' ? 'DELIVERY' : 'RETURN'
  );
  const [odometerKm, setOdometerKm] = useState<number>(
    Number(
      existingDeliveryForm?.odometerKm ||
        activeRes?.vehicle?.odometerKm ||
        24500
    ) + (formType === 'RETURN' ? 680 : 0)
  );
  const [fuelLevelPct, setFuelLevelPct] = useState<number>(
    formType === 'RETURN' ? 85 : 100
  );
  const [damageMarkers, setDamageMarkers] = useState<string[]>([]);
  const [damagePhotoUrls, setDamagePhotoUrls] = useState<string[]>([
    '/uploads/pod-demo/rentacar-teslim-ekspertiz.svg',
  ]);
  const [estimatedDamageCostTry, setEstimatedDamageCostTry] = useState<number>(0);
  const [sendToMaintenance, setSendToMaintenance] = useState<boolean>(false);
  const [exteriorNote, setExteriorNote] = useState<string>(
    'Karoser, lastik ve aydınlatma kontrolü yapıldı.'
  );
  const [interiorNote, setInteriorNote] = useState<string>(
    'İç döşeme ve ekipmanlar kontrol edildi.'
  );
  const [uploading, setUploading] = useState<boolean>(false);
  const [submitting, setSubmitting] = useState<boolean>(false);

  // İmza Canvas
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const drawingRef = useRef<boolean>(false);
  const hasSigRef = useRef<boolean>(false);

  const deliveryMarkers: string[] = useMemo(() => {
    try {
      return existingDeliveryForm?.damageMarkersJson
        ? JSON.parse(existingDeliveryForm.damageMarkersJson)
        : [];
    } catch {
      return [];
    }
  }, [existingDeliveryForm]);

  const liveComparison = useMemo(() => {
    if (!activeRes) return null;
    return compareDeliveryAndReturnForms({
      deliveryOdometerKm: Number(
        existingDeliveryForm?.odometerKm ?? activeRes?.vehicle?.odometerKm ?? 0
      ),
      returnOdometerKm: odometerKm,
      deliveryFuelPct: Number(existingDeliveryForm?.fuelLevelPct ?? 100),
      returnFuelPct: fuelLevelPct,
      deliveryDamageMarkers: deliveryMarkers,
      returnDamageMarkers: damageMarkers,
      estimatedDamageCostTry,
      plannedEndAt: activeRes.endAt,
      actualReturnAt: new Date(),
      allowedTotalKm: Number(activeRes.totalKmLimit || 250),
      extraKmRateTry: Number(activeRes.extraKmRateTry || 6.5),
      dailyRateTry: Number(activeRes.dailyRateTry || 2000),
      lateReturnHourlyTry: Number(activeRes.vehicleClass?.lateReturnHourlyTry ?? 350),
      gracePeriodMinutes: Number(policyConfig?.gracePeriodMinutes ?? 60),
      lateHourToFullDayThreshold: Number(policyConfig?.lateHourToFullDayThreshold ?? 4),
      missingFuelRatePerPctTry: Number(policyConfig?.missingFuelRatePerPctTry ?? 32),
      depositCollectedTry: Number(activeRes.depositRequiredTry || 5000),
    });
  }, [
    activeRes,
    existingDeliveryForm,
    odometerKm,
    fuelLevelPct,
    deliveryMarkers,
    damageMarkers,
    estimatedDamageCostTry,
    policyConfig,
  ]);

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    try {
      setUploading(true);
      const fd = new FormData();
      Array.from(files).forEach((f) => fd.append('files', f));
      const res = await fetch('/api/upload', { method: 'POST', body: fd });
      const data = await res.json();
      if (res.ok && Array.isArray(data.urls)) {
        setDamagePhotoUrls((prev) => [...prev, ...data.urls]);
        toast.success('Ekspertiz fotoğrafı yüklendi.');
      } else {
        toast.error(data.error || 'Fotoğraf yüklenemedi.');
      }
    } catch {
      toast.error('Dosya yükleme hatası.');
    } finally {
      setUploading(false);
    }
  };

  const handleSubmitForm = async () => {
    if (!activeRes) return;
    try {
      setSubmitting(true);
      let sigUrl: string | null = null;
      if (hasSigRef.current && canvasRef.current) {
        sigUrl = canvasRef.current.toDataURL('image/png');
      }

      const action =
        formType === 'DELIVERY'
          ? 'submit_delivery_inspection'
          : 'submit_return_inspection';

      const res = await fetch('/api/arac-kiralama', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action,
          demoCompanyId,
          reservationId: activeRes.id,
          odometerKm: Number(odometerKm),
          fuelLevelPct: Number(fuelLevelPct),
          exteriorConditionNote: exteriorNote,
          interiorConditionNote: interiorNote,
          damageMarkers,
          damagePhotoUrls,
          hasNewDamage: damageMarkers.length > 0 || estimatedDamageCostTry > 0,
          estimatedDamageCostTry: Number(estimatedDamageCostTry || 0),
          sendToMaintenance,
          customerSignatureUrl: sigUrl,
          signedByCustomerName: activeRes.customer?.name || 'Kiracı Müşteri',
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Ekspertiz formu kaydedilemedi.');
      }
      toast.success(
        formType === 'DELIVERY'
          ? `Araç teslim (çıkış) formu kaydedildi ve araç 'KİRADA' durumuna alındı.`
          : `Araç iade (dönüş) formu, fark hesapları ve KABİS kapanış paketi kaydedildi.`
      );
      onRefresh();
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* Rezervasyon Seçici ve Form Tipi */}
      <div className="bg-[white]/90 border border-[--line] rounded-[20px] p-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-3">
          <div>
            <label className="block text-[10px] text-zinc-400 mb-1">
              Teslim / İade İşlemi Yapılacak Rezervasyon
            </label>
            <select
              value={activeRes?.id || ''}
              onChange={(e) => {
                onSelectReservationId(e.target.value);
                const found = actionableReservations.find((r) => r.id === e.target.value);
                if (found) {
                  setFormType(found.status === 'CONFIRMED' ? 'DELIVERY' : 'RETURN');
                  setOdometerKm(Number(found.vehicle?.odometerKm || 20000) + 450);
                }
              }}
              className="bg-[#F6F8FB] border border-white/[0.1] rounded-xl px-3 py-2 text-xs text-white min-w-[320px]"
            >
              {actionableReservations.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.reservationNo} — {r.vehicle?.plate} ({r.customer?.name}) [{r.status}]
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-1.5 mt-4">
            <button
              type="button"
              onClick={() => setFormType('DELIVERY')}
              className={`px-3.5 py-2 rounded-xl text-xs font-medium cursor-pointer ${
                formType === 'DELIVERY'
                  ? 'bg-[#1267E6] text-white font-semibold'
                  : 'bg-[--muted-bg] text-zinc-300'
              }`}
            >
              1. Teslim (Çıkış) Ekspertiz Formu
            </button>
            <button
              type="button"
              onClick={() => setFormType('RETURN')}
              className={`px-3.5 py-2 rounded-xl text-xs font-medium cursor-pointer ${
                formType === 'RETURN'
                  ? 'bg-[#1267E6] text-white font-semibold'
                  : 'bg-[--muted-bg] text-zinc-300'
              }`}
            >
              2. İade (Dönüş) &amp; Fark Hesaplama Formu
            </button>
          </div>
        </div>
      </div>

      {/* Ana Ekspertiz Formu + İki Form Karşılaştırma Paneli */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        {/* Sol: Mobil Uyumlu Teslim/İade Giriş Formu */}
        <div className="lg:col-span-7 bg-[white]/90 border border-[--line] rounded-[20px] p-5 space-y-4 text-xs">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-white">
              {formType === 'DELIVERY'
                ? 'Araç Teslim (Çıkış) Ekspertiz Formu'
                : 'Araç İade (Dönüş) Ekspertiz Formu'}
            </h3>
            <span className="font-mono text-xs text-[#1267E6]">
              {activeRes?.vehicle?.plate} · {activeRes?.reservationNo}
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <label className="block text-zinc-400 mb-1">Sayaç Kilometresi (Km)</label>
              <input
                type="number"
                value={odometerKm}
                onChange={(e) => setOdometerKm(Number(e.target.value))}
                className="w-full bg-[#F6F8FB] border border-white/[0.1] rounded-xl px-3 py-2 text-white font-mono"
              />
            </div>

            <div>
              <label className="block text-zinc-400 mb-1">
                Yakıt Seviyesi: %{fuelLevelPct} ({Math.round((fuelLevelPct / 100) * 8)}/8 Dilim)
              </label>
              <input
                type="range"
                min={0}
                max={100}
                step={5}
                value={fuelLevelPct}
                onChange={(e) => setFuelLevelPct(Number(e.target.value))}
                className="w-full accent-[#1267E6] mt-2"
              />
            </div>
          </div>

          {/* 16 Karoser Hasar Bölgesi Seçimi */}
          <div>
            <label className="block text-zinc-400 mb-1.5">
              Karoser Hasar İşaretlemesi (Hasarlı bölgelere dokunun)
            </label>
            <div className="flex flex-wrap gap-1.5">
              {RENT_DAMAGE_ZONES.map((zone) => {
                const active = damageMarkers.includes(zone);
                return (
                  <button
                    key={zone}
                    type="button"
                    onClick={() =>
                      setDamageMarkers((prev) =>
                        active ? prev.filter((z) => z !== zone) : [...prev, zone]
                      )
                    }
                    className={`px-2.5 py-1 rounded-lg text-[11px] border transition cursor-pointer ${
                      active
                        ? 'bg-rose-500/20 text-rose-300 border-rose-500/40 font-semibold'
                        : 'bg-[#F6F8FB] text-zinc-400 border-[--line] hover:text-white'
                    }`}
                  >
                    {zone}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Hasar Fotoğrafları Yükleme & Demo Görsel Seçici */}
          <div className="space-y-2">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <label className="text-zinc-400">Ekspertiz &amp; Hasar Fotoğrafları</label>
              <label className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/[0.08] hover:bg-white/[0.14] text-white cursor-pointer">
                <Upload className="w-3.5 h-3.5 text-[#1267E6]" />
                <span>{uploading ? 'Yükleniyor...' : 'Fotoğraf Yükle'}</span>
                <input
                  type="file"
                  accept="image/*"
                  multiple
                  onChange={handlePhotoUpload}
                  className="hidden"
                />
              </label>
            </div>

            <div className="flex flex-wrap gap-1.5">
              {DEMO_DAMAGE_PHOTOS.map((dp) => (
                <button
                  key={dp.url}
                  type="button"
                  onClick={() =>
                    setDamagePhotoUrls((prev) =>
                      prev.includes(dp.url) ? prev : [...prev, dp.url]
                    )
                  }
                  className="px-2.5 py-1 rounded-lg bg-[#F6F8FB] border border-[--line] text-[10px] text-zinc-300 hover:border-[--brand-line] cursor-pointer"
                >
                  + {dp.label}
                </button>
              ))}
            </div>

            <div className="grid grid-cols-3 gap-2">
              {damagePhotoUrls.map((url, idx) => (
                <div
                  key={`${url}-${idx}`}
                  className="relative bg-[#F6F8FB] border border-white/[0.1] rounded-xl p-1.5"
                >
                  <img
                    src={url}
                    alt="Ekspertiz Fotoğrafı"
                    className="w-full h-20 object-cover rounded-lg"
                  />
                </div>
              ))}
            </div>
          </div>

          {formType === 'RETURN' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <label className="block text-zinc-400 mb-1">
                  Yeni Hasar Ekspertiz Onarım Bedeli (TRY)
                </label>
                <input
                  type="number"
                  min={0}
                  value={estimatedDamageCostTry}
                  onChange={(e) => setEstimatedDamageCostTry(Number(e.target.value))}
                  className="w-full bg-[#F6F8FB] border border-white/[0.1] rounded-xl px-3 py-2 text-white font-mono"
                />
              </div>

              <div className="flex items-center mt-5">
                <label className="flex items-center gap-2 text-amber-300 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={sendToMaintenance}
                    onChange={(e) => setSendToMaintenance(e.target.checked)}
                  />
                  İade Sonrası Aracı Filo Bakım / Servis Durumuna Al
                </label>
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <label className="block text-zinc-400 mb-1">Dış Karoser Ekspertiz Notu</label>
              <input
                type="text"
                value={exteriorNote}
                onChange={(e) => setExteriorNote(e.target.value)}
                className="w-full bg-[#F6F8FB] border border-white/[0.1] rounded-xl px-3 py-2 text-white"
              />
            </div>
            <div>
              <label className="block text-zinc-400 mb-1">İç Kabin / Aksesuar Notu</label>
              <input
                type="text"
                value={interiorNote}
                onChange={(e) => setInteriorNote(e.target.value)}
                className="w-full bg-[#F6F8FB] border border-white/[0.1] rounded-xl px-3 py-2 text-white"
              />
            </div>
          </div>

          {/* Müşteri Teslim/İade İmzası */}
          <div>
            <label className="block text-zinc-400 mb-1">
              Kiracı Teslim / İade Onay İmzası (Dokunmatik / Fare)
            </label>
            <canvas
              ref={canvasRef}
              width={420}
              height={90}
              onMouseDown={(e) => {
                const r = e.currentTarget.getBoundingClientRect();
                const ctx = canvasRef.current?.getContext('2d');
                if (!ctx) return;
                drawingRef.current = true;
                hasSigRef.current = true;
                ctx.strokeStyle = '#1267E6';
                ctx.lineWidth = 2.5;
                ctx.beginPath();
                ctx.moveTo(e.clientX - r.left, e.clientY - r.top);
              }}
              onMouseMove={(e) => {
                if (!drawingRef.current) return;
                const r = e.currentTarget.getBoundingClientRect();
                const ctx = canvasRef.current?.getContext('2d');
                if (!ctx) return;
                ctx.lineTo(e.clientX - r.left, e.clientY - r.top);
                ctx.stroke();
              }}
              onMouseUp={() => {
                drawingRef.current = false;
              }}
              className="w-full bg-[#F6F8FB] border border-dashed border-[--brand-line] rounded-xl cursor-crosshair"
            />
          </div>

          <button
            type="button"
            disabled={submitting}
            onClick={handleSubmitForm}
            className="w-full py-2.5 rounded-xl bg-[#1267E6] hover:bg-[--brand] text-white font-semibold cursor-pointer"
          >
            {submitting
              ? 'İşleniyor...'
              : formType === 'DELIVERY'
                ? 'Teslim (Çıkış) Formunu Kaydet & Aracı KİRADA Durumuna Al'
                : 'İade (Dönüş) Formunu Kaydet, Farkları Hesapla & İadeyi Tamamla'}
          </button>
        </div>

        {/* Sağ: Teslim vs İade Karşılaştırma & Otomatik Fark Hesabı */}
        <div className="lg:col-span-5 bg-[white]/90 border border-[--line] rounded-[20px] p-5 space-y-3 text-xs">
          <h3 className="text-sm font-bold text-white">
            Teslim vs İade Formu Karşılaştırması &amp; Fark Hesabı
          </h3>
          {liveComparison ? (
            <div className="space-y-2.5">
              <div className="bg-[#F6F8FB] border border-[--line] rounded-xl p-3 flex items-center justify-between">
                <div>
                  <div className="text-[11px] text-zinc-400">Kilometre Karşılaştırması</div>
                  <div className="text-white font-mono">
                    Çıkış: {liveComparison.deliveryKm.toLocaleString('tr-TR')} km → Dönüş:{' '}
                    {liveComparison.returnKm.toLocaleString('tr-TR')} km
                  </div>
                  <div className="text-[11px] text-zinc-400">
                    Kullanılan: {liveComparison.distanceDrivenKm} km / Limit:{' '}
                    {liveComparison.allowedKm} km (Aşım: {liveComparison.excessKm} km)
                  </div>
                </div>
                <div className="font-mono font-bold text-amber-300">
                  ₺{liveComparison.extraKmChargeTry.toLocaleString('tr-TR')}
                </div>
              </div>

              <div className="bg-[#F6F8FB] border border-[--line] rounded-xl p-3 flex items-center justify-between">
                <div>
                  <div className="text-[11px] text-zinc-400">Yakıt Seviyesi Karşılaştırması</div>
                  <div className="text-white font-mono">
                    Çıkış: %{liveComparison.deliveryFuelPct} → Dönüş: %
                    {liveComparison.returnFuelPct} (Eksik: %{liveComparison.missingFuelPct})
                  </div>
                </div>
                <div className="font-mono font-bold text-amber-300">
                  ₺{liveComparison.fuelDifferenceChargeTry.toLocaleString('tr-TR')}
                </div>
              </div>

              <div className="bg-[#F6F8FB] border border-[--line] rounded-xl p-3 flex items-center justify-between">
                <div>
                  <div className="text-[11px] text-zinc-400">Zaman / Gecikme Kontrolü</div>
                  <div className="text-white font-mono">
                    Gecikme: {liveComparison.lateMinutes} dk (Hoşgörü:{' '}
                    {liveComparison.gracePeriodMinutes} dk → {liveComparison.billableLateHours} sa)
                  </div>
                </div>
                <div className="font-mono font-bold text-amber-300">
                  ₺{liveComparison.lateReturnChargeTry.toLocaleString('tr-TR')}
                </div>
              </div>

              <div className="bg-[#F6F8FB] border border-[--line] rounded-xl p-3 flex items-center justify-between">
                <div>
                  <div className="text-[11px] text-zinc-400">Karoser Yeni Hasar Farkı</div>
                  <div className="text-white">
                    {liveComparison.newDamageMarkers.length > 0
                      ? liveComparison.newDamageMarkers.join(', ')
                      : 'Yeni hasar bölgesi işaretlenmedi'}
                  </div>
                </div>
                <div className="font-mono font-bold text-rose-300">
                  ₺{liveComparison.damageChargeTry.toLocaleString('tr-TR')}
                </div>
              </div>

              <div className="bg-[--brand]/10 border border-[--brand-line] rounded-xl p-3.5 space-y-1.5">
                <div className="flex justify-between text-zinc-300">
                  <span>Alınan Depozito:</span>
                  <span className="font-mono">
                    ₺{liveComparison.depositCollectedTry.toLocaleString('tr-TR')}
                  </span>
                </div>
                <div className="flex justify-between text-amber-300">
                  <span>Toplam Ek Ücret / Kesinti:</span>
                  <span className="font-mono">
                    -₺{liveComparison.totalExtraChargesTry.toLocaleString('tr-TR')}
                  </span>
                </div>
                <div className="flex justify-between text-sm font-bold text-[#1267E6] pt-1 border-t border-white/[0.1]">
                  <span>İade Edilecek Net Depozito:</span>
                  <span className="font-mono">
                    ₺{liveComparison.netDepositRefundTry.toLocaleString('tr-TR')}
                  </span>
                </div>
              </div>
            </div>
          ) : null}

          {/* Kayıtlı Teslim/İade Ekspertiz Geçmişi */}
          <div className="pt-2 border-t border-[--line] space-y-2">
            <h4 className="text-xs font-semibold text-white">
              Kayıtlı Teslim &amp; İade Ekspertiz Formları ({inspectionForms.length})
            </h4>
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {inspectionForms.slice(0, 8).map((f: any) => {
                let photos: string[] = [];
                try {
                  photos = f.damagePhotoUrlsJson ? JSON.parse(f.damagePhotoUrlsJson) : [];
                } catch {
                  photos = [];
                }
                return (
                  <div
                    key={f.id}
                    className="bg-[#F6F8FB] border border-[--line] rounded-xl p-2.5 flex items-center justify-between gap-2"
                  >
                    <div>
                      <div className="font-mono font-semibold text-white">
                        {f.formNo} ({f.formType === 'DELIVERY' ? 'Çıkış' : 'Dönüş'}) · {f.plate}
                      </div>
                      <div className="text-[11px] text-zinc-400">
                        {Number(f.odometerKm || 0).toLocaleString('tr-TR')} km · Yakıt %{f.fuelLevelPct} ·{' '}
                        {f.exteriorConditionNote}
                      </div>
                    </div>
                    {photos[0] && (
                      <img
                        src={photos[0]}
                        alt={f.formNo}
                        className="w-14 h-10 object-cover rounded border border-white/[0.1]"
                      />
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export function RentDepositsChargesAndPenaltiesTab({
  depositCharges,
  tollPasses,
  trafficPenalties,
  reservations,
  demoCompanyId,
  onRefresh,
}: {
  depositCharges: any[];
  tollPasses: any[];
  trafficPenalties: any[];
  reservations: any[];
  demoCompanyId?: string;
  onRefresh: () => void;
}) {
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [csvText, setCsvText] = useState<string>(
    '34 SNR 205;2026-11-20T14:20:00.000Z;Osmangazi Köprüsü Geçişi;555;Muallimköy;Altınova'
  );

  const handleSettleDeposit = async (chargeId: string) => {
    try {
      setSubmitting(true);
      const res = await fetch('/api/arac-kiralama', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'refund_or_settle_deposit',
          demoCompanyId,
          chargeId,
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Depozito iadesi onaylanamadı.');
      }
      toast.success('Depozito iadesi onaylandı.');
      onRefresh();
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleIssueInvoice = async (reservationId: string) => {
    try {
      setSubmitting(true);
      const res = await fetch('/api/arac-kiralama', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'issue_rental_invoice',
          demoCompanyId,
          reservationId,
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Fatura kesilemedi.');
      }
      toast.success(
        `Cari (Finance) ve E-Belge oluşturuldu (${data.eDocument?.documentNo}).`
      );
      onRefresh();
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleAutoMatch = async () => {
    try {
      setSubmitting(true);
      const res = await fetch('/api/arac-kiralama', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'auto_match_penalties_and_tolls',
          demoCompanyId,
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Eşleştirme yapılamadı.');
      }
      toast.success(
        `Plaka + Tarih eşleştirmesi tamamlandı (${data.matchedPenaltiesCount} ceza, ${data.matchedTollPassesCount} HGS geçişi).`
      );
      onRefresh();
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleImportCsvTolls = async () => {
    if (!csvText.trim()) return;
    try {
      setSubmitting(true);
      const res = await fetch('/api/arac-kiralama', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'import_or_record_toll_pass',
          demoCompanyId,
          csvContent: csvText,
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'HGS CSV içe aktarılamadı.');
      }
      toast.success(`${data.importedCount} HGS geçiş kaydı içe aktarıldı ve kiralama dönemiyle eşleştirildi.`);
      onRefresh();
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleReflectToCustomer = async (
    sourceType: 'PENALTY' | 'TOLL',
    sourceId: string
  ) => {
    try {
      setSubmitting(true);
      const res = await fetch('/api/arac-kiralama', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'reflect_penalty_or_toll',
          demoCompanyId,
          sourceType,
          sourceId,
          includeAdminServiceFee: true,
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Müşteriye yansıtma yapılamadı.');
      }
      toast.success('Kayıt müşteri cari hesabına ve ek ücret defterine yansıtıldı.');
      onRefresh();
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-5">
      {/* 1. Depozito ve Ek Ücretler Defteri */}
      <div className="bg-[white]/90 border border-[--line] rounded-[20px] p-4 space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <h3 className="text-sm font-bold text-white">
              Depozito, Km Aşımı, Yakıt Farkı, Gecikme ve Hasar Defteri ({depositCharges.length})
            </h3>
            <p className="text-[11px] text-zinc-400">
              İade ekspertizinden ve HGS/ceza eşleştirmelerinden üretilen tüm kayıtlar Finans (Cari) ve E-Belge ile bağlanır.
            </p>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse min-w-[900px]">
            <thead>
              <tr className="border-b border-[--line] text-[11px] text-zinc-400">
                <th className="py-2 px-3">Kayıt No / Rezervasyon</th>
                <th className="py-2 px-3">Araç / Müşteri</th>
                <th className="py-2 px-3">İşlem Türü</th>
                <th className="py-2 px-3">Hesaplama Kuralı</th>
                <th className="py-2 px-3">Tutar (KDV Dahil)</th>
                <th className="py-2 px-3">Durum &amp; E-Belge</th>
                <th className="py-2 px-3 text-right">İşlem</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/[0.05] text-xs">
              {depositCharges.map((chg: any) => (
                <tr key={chg.id} className="hover:bg-[--page]">
                  <td className="py-2.5 px-3 font-mono">
                    <div className="font-semibold text-white">{chg.entryNo}</div>
                    <div className="text-[11px] text-zinc-400">{chg.reservationNo}</div>
                  </td>
                  <td className="py-2.5 px-3">
                    <div className="font-mono text-white">{chg.plate}</div>
                    <div className="text-[11px] text-zinc-400">{chg.customerName}</div>
                  </td>
                  <td className="py-2.5 px-3 text-white font-medium">
                    {RENT_CHARGE_ENTRY_TYPE_LABELS[chg.entryType as RentChargeEntryType] ||
                      chg.entryType}
                  </td>
                  <td className="py-2.5 px-3 text-[11px] text-zinc-300">
                    {chg.calculationRuleNote || '-'}
                  </td>
                  <td className="py-2.5 px-3 font-mono font-semibold text-[#1267E6]">
                    ₺{Number(chg.totalWithVatTry || chg.amountTry || 0).toLocaleString('tr-TR')}
                  </td>
                  <td className="py-2.5 px-3">
                    <span className="px-2 py-0.5 rounded-full text-[10px] bg-[--muted-bg] text-zinc-200">
                      {RENT_CHARGE_STATUS_LABELS[chg.status] || chg.status}
                    </span>
                    {chg.eDocumentNo && (
                      <div className="text-[10px] font-mono text-[#1267E6] mt-0.5">
                        E-Belge: {chg.eDocumentNo}
                      </div>
                    )}
                  </td>
                  <td className="py-2.5 px-3 text-right">
                    <div className="flex items-center justify-end gap-1.5">
                      {chg.status === 'REFUND_PENDING' && (
                        <button
                          type="button"
                          disabled={submitting}
                          onClick={() => handleSettleDeposit(chg.id)}
                          className="px-2.5 py-1 rounded-lg bg-[#1267E6] text-white text-[11px] font-semibold cursor-pointer"
                        >
                          İadeyi Onayla
                        </button>
                      )}
                      {!chg.eDocumentNo && !String(chg.entryType).startsWith('DEPOSIT_') && (
                        <button
                          type="button"
                          disabled={submitting}
                          onClick={() => handleIssueInvoice(chg.reservationId)}
                          className="px-2.5 py-1 rounded-lg bg-sky-500/20 text-sky-300 border border-sky-500/30 text-[11px] cursor-pointer"
                        >
                          Cari &amp; E-Fatura Kes
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* 2. HGS/OGS Geçişleri ve Filo Trafik Cezaları Otomatik Plaka+Tarih Eşleştirme */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Sol: HGS Geçişleri & CSV İçe Aktarma */}
        <div className="bg-[white]/90 border border-[--line] rounded-[20px] p-4 space-y-3 text-xs">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-white">
                HGS / Otoyol Geçiş Eşleştirme ({tollPasses.length})
              </h3>
              <p className="text-[11px] text-zinc-400">
                Sağlayıcı adaptörü (Demo + CSV içe aktarma) ile plaka ve geçiş zamanına göre kiralama sözleşmesiyle eşleşir.
              </p>
            </div>
            <button
              type="button"
              disabled={submitting}
              onClick={handleAutoMatch}
              className="px-3 py-1.5 rounded-xl bg-white/[0.08] hover:bg-white/[0.14] text-white text-[11px] cursor-pointer"
            >
              Otomatik Eşleştir
            </button>
          </div>

          <div className="flex gap-2">
            <input
              type="text"
              value={csvText}
              onChange={(e) => setCsvText(e.target.value)}
              placeholder="PLAKA;TARIH_SAAT;OTOYOL_ADI;TUTAR;GIRIS;CIKIS"
              className="flex-1 bg-[#F6F8FB] border border-white/[0.1] rounded-xl px-3 py-1.5 text-[11px] text-white font-mono"
            />
            <button
              type="button"
              disabled={submitting}
              onClick={handleImportCsvTolls}
              className="px-3 py-1.5 rounded-xl bg-[#1267E6] text-white font-semibold text-[11px] cursor-pointer"
            >
              CSV İçe Aktar
            </button>
          </div>

          <div className="space-y-2 max-h-72 overflow-y-auto">
            {tollPasses.map((tp: any) => (
              <div
                key={tp.id}
                className="bg-[#F6F8FB] border border-[--line] rounded-xl p-3 flex items-center justify-between gap-2"
              >
                <div>
                  <div className="font-mono font-semibold text-white">
                    {tp.plate} · {tp.passNo} — ₺{Number(tp.amountTry).toLocaleString('tr-TR')}
                  </div>
                  <div className="text-[11px] text-zinc-300">{tp.highwayOrBridgeName}</div>
                  <div className="text-[10px] text-zinc-400">
                    {new Date(tp.passDateTime).toLocaleString('tr-TR')} · Eşleşen:{' '}
                    <span className="text-[#1267E6]">
                      {tp.matchedReservationNo
                        ? `${tp.matchedReservationNo} (${tp.matchedCustomerName || 'Kiracı'})`
                        : 'Şirket Kullanımı'}
                    </span>
                  </div>
                </div>
                <div>
                  {tp.reflectionStatus === 'REFLECTED_TO_CUSTOMER' ? (
                    <span className="px-2 py-1 rounded-full text-[10px] bg-[--brand]/15 text-[#1267E6] border border-[--brand-line]">
                      Müşteriye Yansıtıldı
                    </span>
                  ) : tp.matchedReservationId ? (
                    <button
                      type="button"
                      disabled={submitting}
                      onClick={() => handleReflectToCustomer('TOLL', tp.id)}
                      className="px-2.5 py-1 rounded-lg bg-amber-400 text-white font-semibold text-[11px] cursor-pointer"
                    >
                      Müşteriye Yansıt
                    </button>
                  ) : (
                    <span className="px-2 py-1 rounded-full text-[10px] bg-[--muted-bg] text-zinc-400">
                      Şirket İçi
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Sağ: Filo Trafik Cezaları (LojistikTrafficPenalty Yeniden Kullanımı) */}
        <div className="bg-[white]/90 border border-[--line] rounded-[20px] p-4 space-y-3 text-xs">
          <div>
            <h3 className="text-sm font-bold text-white">
              Trafik Cezaları (Filo Ortak Kayıtları) &amp; Müşteriye Rücu ({trafficPenalties.length})
            </h3>
            <p className="text-[11px] text-zinc-400">
              Lojistik Filo modülündeki trafik cezaları plaka ve ihlal tarihine göre aktif kiralama dönemiyle eşleştirilir.
            </p>
          </div>

          <div className="space-y-2 max-h-80 overflow-y-auto">
            {trafficPenalties.map((pen: any) => (
              <div
                key={pen.id}
                className="bg-[#F6F8FB] border border-[--line] rounded-xl p-3 flex items-center justify-between gap-2"
              >
                <div>
                  <div className="font-mono font-semibold text-white">
                    {pen.plate} · {pen.penaltyNo} — ₺{Number(pen.amountTry).toLocaleString('tr-TR')}
                  </div>
                  <div className="text-[11px] text-zinc-300">
                    {pen.violationType}: {pen.reason} ({pen.location || '-'})
                  </div>
                  <div className="text-[10px] text-zinc-400">
                    {new Date(pen.violationDate).toLocaleString('tr-TR')} · Eşleşen:{' '}
                    <span className="text-[#1267E6]">
                      {pen.matchedReservationNo
                        ? `${pen.matchedReservationNo} (${pen.matchedCustomerName || 'Kiracı'})`
                        : 'Eşleşme Yok'}
                    </span>
                  </div>
                </div>
                <div>
                  {pen.reflectionStatus === 'REFLECTED_TO_CUSTOMER' ? (
                    <span className="px-2 py-1 rounded-full text-[10px] bg-[--brand]/15 text-[#1267E6] border border-[--brand-line]">
                      Müşteriye Yansıtıldı
                    </span>
                  ) : pen.matchedReservationId ? (
                    <button
                      type="button"
                      disabled={submitting}
                      onClick={() => handleReflectToCustomer('PENALTY', pen.id)}
                      className="px-2.5 py-1 rounded-lg bg-rose-400 text-white font-semibold text-[11px] cursor-pointer"
                    >
                      Müşteriye Yansıt
                    </button>
                  ) : null}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
