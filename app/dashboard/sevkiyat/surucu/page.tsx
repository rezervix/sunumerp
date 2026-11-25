'use client';

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import {
  AlertTriangle,
  CheckCircle2,
  Clock,
  Compass,
  ExternalLink,
  MapPin,
  Phone,
  RefreshCw,
  Smartphone,
  Trash2,
  Truck,
  Upload,
  X,
} from 'lucide-react';
import { toast } from 'sonner';
import {
  buildNavigationDeepLinks,
  DISPATCH_FAILURE_REASON_LABELS,
  DISPATCH_STOP_STATUS_BADGES,
  DISPATCH_STOP_STATUS_LABELS,
  DISPATCH_TRIP_STATUS_LABELS,
  POD_RELATION_LABELS,
  type DispatchStopStatus,
  type DispatchTripStatus,
} from '@/lib/logistics/dispatch/constantsAndHelpers';

export default function SurucuMobilTeslimatPage() {
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [trips, setTrips] = useState<any[]>([]);
  const [drivers, setDrivers] = useState<any[]>([]);
  const [selectedDriverId, setSelectedDriverId] = useState<string>('');
  const [selectedTripId, setSelectedTripId] = useState<string>('');

  // e-POD Modal
  const [podStop, setPodStop] = useState<any | null>(null);
  const [recipientName, setRecipientName] = useState('');
  const [recipientRelation, setRecipientRelation] = useState('ALICI');
  const [podNote, setPodNote] = useState('');
  const [uploadedPhotos, setUploadedPhotos] = useState<string[]>([]);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [deliveryStatus, setDeliveryStatus] = useState<'TESLIM_EDILDI' | 'KISMI_TESLIM'>('TESLIM_EDILDI');

  // İmza Canvas Ref
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const drawingRef = useRef<boolean>(false);
  const hasSignatureRef = useRef<boolean>(false);

  // Teslim Edilemedi Modal
  const [failStop, setFailStop] = useState<any | null>(null);
  const [failureReasonCode, setFailureReasonCode] = useState('ALICI_ADRESTE_YOK');
  const [failureReasonNote, setFailureReasonNote] = useState('');

  const loadDriverDay = useCallback(async (drvId?: string) => {
    try {
      setLoading(true);
      const q = drvId ? `&driverId=${encodeURIComponent(drvId)}` : '';
      const res = await fetch(`/api/sevkiyat?section=driver_day${q}`, { cache: 'no-store' });
      const data = await res.json();
      if (res.ok && data.success) {
        setTrips(data.trips || []);
        setDrivers(data.drivers || []);
        if (!selectedTripId && data.trips?.[0]?.id) {
          setSelectedTripId(data.trips[0].id);
        }
      }
    } catch {
      toast.error('Sürücü seferleri yüklenemedi.');
    } finally {
      setLoading(false);
    }
  }, [selectedTripId]);

  useEffect(() => {
    loadDriverDay(selectedDriverId || undefined);
  }, [selectedDriverId, loadDriverDay]);

  const activeTrip = useMemo(
    () => trips.find((t) => t.id === selectedTripId) || trips[0] || null,
    [trips, selectedTripId]
  );

  // Canvas İmza Çizim Olayları
  const startDraw = (x: number, y: number) => {
    const ctx = canvasRef.current?.getContext('2d');
    if (!ctx) return;
    drawingRef.current = true;
    hasSignatureRef.current = true;
    ctx.strokeStyle = '#1267E6';
    ctx.lineWidth = 2.5;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(x, y);
  };
  const moveDraw = (x: number, y: number) => {
    if (!drawingRef.current) return;
    const ctx = canvasRef.current?.getContext('2d');
    if (!ctx) return;
    ctx.lineTo(x, y);
    ctx.stroke();
  };
  const endDraw = () => {
    drawingRef.current = false;
  };
  const clearCanvas = () => {
    const c = canvasRef.current;
    if (!c) return;
    const ctx = c.getContext('2d');
    ctx?.clearRect(0, 0, c.width, c.height);
    hasSignatureRef.current = false;
  };

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    try {
      setUploadingPhoto(true);
      const fd = new FormData();
      Array.from(files).forEach((f) => fd.append('files', f));
      const res = await fetch('/api/upload', { method: 'POST', body: fd });
      const data = await res.json();
      if (res.ok && Array.isArray(data.urls)) {
        setUploadedPhotos((prev) => [...prev, ...data.urls]);
        toast.success('Teslimat fotoğrafı yüklendi.');
      } else {
        toast.error(data.error || 'Fotoğraf yüklenemedi.');
      }
    } catch {
      toast.error('Dosya yükleme hatası.');
    } finally {
      setUploadingPhoto(false);
    }
  };

  const handleSubmitPod = async () => {
    if (!podStop) return;
    if (!recipientName.trim()) {
      toast.error('Teslim alan kişi adını giriniz.');
      return;
    }

    try {
      setSubmitting(true);
      let signatureUrlOrDataUrl: string | null = null;
      if (hasSignatureRef.current && canvasRef.current) {
        // Önce mevcut /api/upload ucuyla PNG dosyası olarak yüklemeyi dene
        const blob: Blob | null = await new Promise((resolve) =>
          canvasRef.current?.toBlob(resolve, 'image/png')
        );
        if (blob) {
          const fd = new FormData();
          fd.append('files', new File([blob], `imza-${podStop.id}.png`, { type: 'image/png' }));
          const upRes = await fetch('/api/upload', { method: 'POST', body: fd }).catch(() => null);
          if (upRes?.ok) {
            const upJson = await upRes.json();
            signatureUrlOrDataUrl = upJson.urls?.[0] || null;
          }
          if (!signatureUrlOrDataUrl) {
            signatureUrlOrDataUrl = canvasRef.current.toDataURL('image/png');
          }
        }
      }

      const res = await fetch('/api/sevkiyat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'submit_pod',
          stopId: podStop.id,
          recipientName: recipientName.trim(),
          recipientRelation,
          note: podNote,
          signatureUrlOrDataUrl,
          photoUrlsOrDataUrls: uploadedPhotos,
          deliveryStatus,
          capturedLat: podStop.lat,
          capturedLng: podStop.lng,
          driverId: activeTrip?.driverId || selectedDriverId || undefined,
        }),
      });
      const json = await res.json();
      if (!res.ok || !json.success) {
        toast.error(json.error || 'Teslimat kanıtı kaydedilemedi.');
        return;
      }
      toast.success(json.message || 'Teslimat kanıtı (e-POD) ERP sistemine kaydedildi.');
      setPodStop(null);
      setRecipientName('');
      setPodNote('');
      setUploadedPhotos([]);
      hasSignatureRef.current = false;
      await loadDriverDay(selectedDriverId || undefined);
    } finally {
      setSubmitting(false);
    }
  };

  const handleStopStatus = async (stopId: string, status: string, extra?: Record<string, any>) => {
    try {
      setSubmitting(true);
      const res = await fetch('/api/sevkiyat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'driver_update_stop',
          stopId,
          status,
          ...(extra || {}),
        }),
      });
      const json = await res.json();
      if (!res.ok || !json.success) {
        toast.error(json.error || 'Durum güncellenemedi.');
        return;
      }
      toast.success(json.message || 'Durum güncellendi.');
      await loadDriverDay(selectedDriverId || undefined);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto space-y-5 pb-16">
      <div className="flex flex-wrap items-center justify-between gap-3 bg-white/80 backdrop-blur-xl border border-[--line] rounded-[20px] p-4 shadow-sm">
        <div>
          <h1 className="text-lg font-semibold text-[--text] flex items-center gap-2">
            <Smartphone className="w-5 h-5 text-[--brand]" />
            Sürücü Mobil Teslimat &amp; e-POD
          </h1>
          <p className="text-xs text-[--text-muted]">
            Günün seferi, durak sırası, navigasyon ve anlık teslimat kanıtı kaydı
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Link
            href="/dashboard/sevkiyat"
            className="px-3.5 py-2 rounded-full bg-white hover:bg-[--brand-soft] border border-[--line] text-xs text-[--text] shadow-sm"
          >
            Sefer Planlama
          </Link>
          <button
            type="button"
            onClick={() => loadDriverDay(selectedDriverId || undefined)}
            className="p-2 rounded-full bg-white hover:bg-[--muted-bg] border border-[--line] text-[--text-2]"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Şoför & Sefer Seçici */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 bg-white/80 backdrop-blur-xl border border-[--line] rounded-[20px] p-4 text-xs shadow-sm">
        <div>
          <label className="text-[--text-muted] block mb-1">Sürücü Filtresi</label>
          <select
            value={selectedDriverId}
            onChange={(e) => {
              setSelectedDriverId(e.target.value);
              setSelectedTripId('');
            }}
            className="w-full bg-white border border-[--line] text-[--text] rounded-xl px-3 py-2 focus:border-[--brand]"
          >
            <option value="">Tüm Aktif Seferler</option>
            {drivers.map((d) => (
              <option key={d.id} value={d.id}>
                {d.fullName} ({d.shiftStart}-{d.shiftEnd})
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="text-[--text-muted] block mb-1">Sefer Seçin ({trips.length})</label>
          <select
            value={activeTrip?.id || ''}
            onChange={(e) => setSelectedTripId(e.target.value)}
            className="w-full bg-white border border-[--line] text-[--text] rounded-xl px-3 py-2 focus:border-[--brand]"
          >
            {trips.map((t) => (
              <option key={t.id} value={t.id}>
                {t.tripNumber} · {t.vehiclePlate || '-'} ({t.stops?.length || 0} durak)
              </option>
            ))}
          </select>
        </div>
      </div>

      {activeTrip ? (
        <div className="space-y-3">
          {/* Sefer Özet Başlığı */}
          <div className="bg-white/80 backdrop-blur-xl border border-[--line] rounded-[20px] p-4 flex flex-wrap items-center justify-between gap-3 shadow-sm">
            <div>
              <div className="text-sm font-semibold text-[--text] flex items-center gap-2">
                <Truck className="w-4 h-4 text-[--brand]" />
                {activeTrip.tripNumber} — {activeTrip.vehiclePlate || 'Araçsız'}
              </div>
              <div className="text-xs text-[--text-muted] mt-0.5">
                Şoför: {activeTrip.driverName || '-'} · Durum:{' '}
                {DISPATCH_TRIP_STATUS_LABELS[activeTrip.status as DispatchTripStatus] || activeTrip.status}
                {activeTrip.eWaybillNo ? ` · e-İrsaliye: ${activeTrip.eWaybillNo}` : ''}
              </div>
            </div>
            {['TASLAK', 'ONAYLANDI', 'YUKLENIYOR'].includes(activeTrip.status) &&
              activeTrip.stops?.[0] && (
                <button
                  type="button"
                  disabled={submitting}
                  onClick={() => handleStopStatus(activeTrip.stops[0].id, 'START_TRIP')}
                  className="px-4 py-2 rounded-full bg-gradient-to-r from-[--brand] to-[--blue] text-white text-xs font-semibold shadow-sm hover:opacity-95"
                >
                  Sefere Çık (Yola Başla)
                </button>
              )}
          </div>

          {/* Durak Kartları */}
          {(activeTrip.stops || []).map((stop: any) => {
            const nav = buildNavigationDeepLinks(stop.lat, stop.lng, stop.customerName);
            const done = ['TESLIM_EDILDI', 'KISMI_TESLIM', 'TESLIM_EDILEMEDI'].includes(stop.status);
            return (
              <div
                key={stop.id}
                className="bg-white/80 backdrop-blur-xl border border-[--line] rounded-[20px] p-4 space-y-3 shadow-sm"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 rounded-full bg-[--brand-soft] border border-[--brand-line] text-[--brand] font-bold text-sm flex items-center justify-center shrink-0">
                      {stop.sequenceNo}
                    </div>
                    <div>
                      <div className="font-semibold text-[--text] text-sm">{stop.customerName}</div>
                      <div className="text-xs text-[--text-muted]">
                        {stop.addressText} ({stop.cityDistrict})
                      </div>
                      <div className="flex flex-wrap items-center gap-3 text-[11px] text-[--text-muted] mt-1 tabular-nums">
                        <span className="inline-flex items-center gap-1">
                          <Clock className="w-3 h-3 text-[--brand]" /> Pencere: {stop.timeWindowStart}–{stop.timeWindowEnd}
                        </span>
                        {stop.contactPhone && (
                          <span className="inline-flex items-center gap-1 text-[--text]">
                            <Phone className="w-3 h-3" /> {stop.contactPhone}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  <span
                    className={`text-[10px] px-2.5 py-0.5 rounded-full border shrink-0 ${ DISPATCH_STOP_STATUS_BADGES[stop.status as DispatchStopStatus] || 'text-[--text-muted]' }`}
                  >
                    {DISPATCH_STOP_STATUS_LABELS[stop.status as DispatchStopStatus] || stop.status}
                  </span>
                </div>

                {/* Navigasyon Linkleri */}
                <div className="flex flex-wrap gap-2 text-[11px]">
                  <a
                    href={nav.googleMaps}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1 px-3 py-1.5 rounded-full bg-[--muted-bg] hover:bg-[--brand-soft] text-[--text-2] border border-[--line]"
                  >
                    <Compass className="w-3.5 h-3.5 text-[--brand]" /> Google Maps <ExternalLink className="w-3 h-3" />
                  </a>
                  <a
                    href={nav.appleMaps}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1 px-3 py-1.5 rounded-full bg-[--muted-bg] hover:bg-[--brand-soft] text-[--text-2] border border-[--line]"
                  >
                    <MapPin className="w-3.5 h-3.5 text-[--brand]" /> Apple Maps <ExternalLink className="w-3 h-3" />
                  </a>
                  <a
                    href={nav.yandexNavi}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1 px-3 py-1.5 rounded-full bg-[--muted-bg] hover:bg-[--brand-soft] text-[--text-2] border border-[--line]"
                  >
                    Yandex Navi <ExternalLink className="w-3 h-3" />
                  </a>
                </div>

                {/* Durak Aksiyonları */}
                {!done ? (
                  <div className="flex flex-wrap gap-2 pt-2 border-t border-[--line]">
                    {stop.status !== 'VARISTA' && (
                      <button
                        type="button"
                        disabled={submitting}
                        onClick={() => handleStopStatus(stop.id, 'VARISTA', { lat: stop.lat, lng: stop.lng })}
                        className="px-3.5 py-2 rounded-full bg-[--warn-soft] hover:bg-[--warn-soft]/80 text-[--warn] border border-[--warn-soft] text-xs font-medium"
                      >
                        Vardım
                      </button>
                    )}
                    <button
                      type="button"
                      disabled={submitting}
                      onClick={() => {
                        setPodStop(stop);
                        setRecipientName(stop.customerName);
                        setUploadedPhotos([]);
                        setPodNote('');
                        hasSignatureRef.current = false;
                      }}
                      className="flex-1 px-4 py-2 rounded-full bg-gradient-to-r from-[--brand] to-[--blue] text-white text-xs font-semibold shadow-sm hover:opacity-95"
                    >
                      Teslim Ettim (İmza / Fotoğraf / e-POD)
                    </button>
                    <button
                      type="button"
                      disabled={submitting}
                      onClick={() => {
                        setFailStop(stop);
                        setFailureReasonNote('');
                      }}
                      className="px-3.5 py-2 rounded-full bg-[--bad-soft] hover:bg-[--bad-soft]/80 text-[--bad] border border-[--bad-soft] text-xs font-medium"
                    >
                      Teslim Edilemedi
                    </button>
                  </div>
                ) : (
                  <div className="text-xs text-[--text-muted] pt-2 border-t border-[--line] flex items-center justify-between">
                    <span>
                      {stop.status === 'TESLIM_EDILEMEDI'
                        ? `Teslim Edilemedi: ${stop.failureReasonCode || ''}`
                        : `Kanıt alındı (${stop.proofs?.[0]?.recipientName || 'Alıcı'})`}
                    </span>
                    <Link
                      href={`/takip/${stop.trackingToken}`}
                      target="_blank"
                      className="text-[--brand] inline-flex items-center gap-1 font-medium"
                    >
                      Takip Sayfası <ExternalLink className="w-3 h-3" />
                    </Link>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      ) : (
        <div className="bg-white/80 backdrop-blur-xl border border-[--line] rounded-[20px] p-10 text-center text-xs text-[--text-muted] shadow-sm">
          Seçili sürücü için atanmış sefer bulunamadı.
        </div>
      )}

      {/* e-POD Teslimat Kanıtı Modalı */}
      {podStop && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#0B1B33]/40 backdrop-blur-sm p-4">
          <div className="bg-white border border-[--line] rounded-[20px] w-full max-w-lg p-5 space-y-4 max-h-[92vh] overflow-y-auto shadow-2xl text-[--text]">
            <div className="flex items-start justify-between">
              <div>
                <h3 className="text-base font-semibold text-[--text]">
                  Teslimat Kanıtı (e-POD) — Durak #{podStop.sequenceNo}
                </h3>
                <p className="text-xs text-[--text-muted]">{podStop.customerName}</p>
              </div>
              <button type="button" onClick={() => setPodStop(null)} className="text-[--text-muted] hover:text-[--text]">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              <div>
                <label className="text-[--text-muted] block mb-1">Teslim Alan Ad Soyad *</label>
                <input
                  type="text"
                  value={recipientName}
                  onChange={(e) => setRecipientName(e.target.value)}
                  className="w-full bg-white border border-[--line] text-[--text] rounded-xl px-3 py-2 focus:border-[--brand]"
                />
              </div>
              <div>
                <label className="text-[--text-muted] block mb-1">Teslim Alan Yakınlığı</label>
                <select
                  value={recipientRelation}
                  onChange={(e) => setRecipientRelation(e.target.value)}
                  className="w-full bg-white border border-[--line] text-[--text] rounded-xl px-3 py-2 focus:border-[--brand]"
                >
                  {Object.entries(POD_RELATION_LABELS).map(([k, lbl]) => (
                    <option key={k} value={k}>
                      {lbl}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="flex gap-2 text-xs">
              <button
                type="button"
                onClick={() => setDeliveryStatus('TESLIM_EDILDI')}
                className={`flex-1 py-2 rounded-xl border transition ${ deliveryStatus === 'TESLIM_EDILDI' ? 'bg-[--brand-soft] border-[--brand-line] text-[--brand] font-semibold' : 'bg-white border-[--line] text-[--text-muted]' }`}
              >
                Tam Teslim
              </button>
              <button
                type="button"
                onClick={() => setDeliveryStatus('KISMI_TESLIM')}
                className={`flex-1 py-2 rounded-xl border transition ${ deliveryStatus === 'KISMI_TESLIM' ? 'bg-[--warn-soft] border-[--warn] text-[--warn] font-semibold' : 'bg-white border-[--line] text-[--text-muted]' }`}
              >
                Kısmi Teslim
              </button>
            </div>

            {/* HTML5 İmza Tuvali */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-xs">
                <span className="text-[--text-muted]">Dijital İmza Çizimi</span>
                <button
                  type="button"
                  onClick={clearCanvas}
                  className="text-[--text-muted] hover:text-[--text] inline-flex items-center gap-1"
                >
                  <Trash2 className="w-3 h-3" /> Temizle
                </button>
              </div>
              <canvas
                ref={canvasRef}
                width={420}
                height={130}
                onMouseDown={(e) => {
                  const r = e.currentTarget.getBoundingClientRect();
                  startDraw(e.clientX - r.left, e.clientY - r.top);
                }}
                onMouseMove={(e) => {
                  const r = e.currentTarget.getBoundingClientRect();
                  moveDraw(e.clientX - r.left, e.clientY - r.top);
                }}
                onMouseUp={endDraw}
                onMouseLeave={endDraw}
                onTouchStart={(e) => {
                  const r = e.currentTarget.getBoundingClientRect();
                  const touch = e.touches[0];
                  if (touch) startDraw(touch.clientX - r.left, touch.clientY - r.top);
                }}
                onTouchMove={(e) => {
                  const r = e.currentTarget.getBoundingClientRect();
                  const touch = e.touches[0];
                  if (touch) moveDraw(touch.clientX - r.left, touch.clientY - r.top);
                }}
                onTouchEnd={endDraw}
                className="w-full h-32 rounded-xl border border-[--line] bg-[--page] touch-none cursor-crosshair"
              />
            </div>

            {/* Fotoğraf Yükleme (Mevcut /api/upload) */}
            <div className="space-y-2 text-xs">
              <label className="inline-flex items-center gap-2 px-3.5 py-2 rounded-full bg-white hover:bg-[--brand-soft] border border-[--line] text-[--text] cursor-pointer shadow-sm">
                <Upload className="w-3.5 h-3.5 text-[--brand]" />
                {uploadingPhoto ? 'Fotoğraf Yükleniyor...' : 'Teslimat Fotoğrafı Ekle'}
                <input
                  type="file"
                  accept="image/*"
                  capture="environment"
                  multiple
                  className="hidden"
                  onChange={handlePhotoUpload}
                />
              </label>
              {uploadedPhotos.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {uploadedPhotos.map((u, idx) => (
                    <img
                      key={idx}
                      src={u}
                      alt={`Foto ${idx + 1}`}
                      className="h-14 w-20 object-cover rounded-lg border border-[--line]"
                    />
                  ))}
                </div>
              )}
            </div>

            <textarea
              rows={2}
              placeholder="Sürücü teslimat notu (isteğe bağlı)"
              value={podNote}
              onChange={(e) => setPodNote(e.target.value)}
              className="w-full bg-white border border-[--line] text-[--text] text-xs rounded-xl px-3 py-2 focus:border-[--brand]"
            />

            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setPodStop(null)}
                className="px-4 py-2 rounded-full bg-white hover:bg-[--muted-bg] border border-[--line] text-[--text-2] text-xs"
              >
                İptal
              </button>
              <button
                type="button"
                disabled={submitting}
                onClick={handleSubmitPod}
                className="px-4 py-2 rounded-full bg-gradient-to-r from-[--brand] to-[--blue] text-white text-xs font-semibold shadow-sm hover:opacity-95"
              >
                Teslimatı Kaydet
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Teslim Edilemedi Modalı */}
      {failStop && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#0B1B33]/40 backdrop-blur-sm p-4">
          <div className="bg-white border border-[--line] rounded-[20px] w-full max-w-md p-5 space-y-4 text-xs shadow-2xl text-[--text]">
            <div className="flex items-start justify-between">
              <h3 className="text-base font-semibold text-[--text] flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-[--bad]" />
                Teslim Edilemedi Bildirimi
              </h3>
              <button type="button" onClick={() => setFailStop(null)} className="text-[--text-muted] hover:text-[--text]">
                <X className="w-4 h-4" />
              </button>
            </div>
            <div>
              <label className="text-[--text-muted] block mb-1">Neden Kodu</label>
              <select
                value={failureReasonCode}
                onChange={(e) => setFailureReasonCode(e.target.value)}
                className="w-full bg-white border border-[--line] text-[--text] rounded-xl px-3 py-2 focus:border-[--brand]"
              >
                {Object.entries(DISPATCH_FAILURE_REASON_LABELS).map(([k, lbl]) => (
                  <option key={k} value={k}>
                    {lbl}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-[--text-muted] block mb-1">Açıklama</label>
              <textarea
                rows={2}
                value={failureReasonNote}
                onChange={(e) => setFailureReasonNote(e.target.value)}
                className="w-full bg-white border border-[--line] text-[--text] rounded-xl px-3 py-2 focus:border-[--brand]"
              />
            </div>
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setFailStop(null)}
                className="px-4 py-2 rounded-full bg-white hover:bg-[--muted-bg] border border-[--line] text-[--text-2]"
              >
                Vazgeç
              </button>
              <button
                type="button"
                disabled={submitting}
                onClick={async () => {
                  await handleStopStatus(failStop.id, 'TESLIM_EDILEMEDI', {
                    failureReasonCode,
                    failureReasonNote,
                  });
                  setFailStop(null);
                }}
                className="px-4 py-2 rounded-full bg-[--bad] hover:bg-[--bad]/90 text-[var(--text)] font-semibold shadow-sm"
              >
                Kaydet
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
