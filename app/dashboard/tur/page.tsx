'use client';

import React, { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import {
  AlertTriangle,
  BarChart3,
  Bell,
  CalendarDays,
  Compass,
  CreditCard,
  Eye,
  EyeOff,
  Globe,
  HelpCircle,
  RefreshCw,
  ShieldCheck,
  Smartphone,
  Users,
} from 'lucide-react';
import { toast } from 'sonner';
import {
  TourPackagesAndCalendarTab,
  TourSeatMapAndStopsTab,
} from './components/TourPackagesAndSeatMapTabs';
import {
  TourBookingsAndManifestoTab,
  TourResourceGanttAndConflictsTab,
} from './components/TourBookingsManifestoAndResourcesTabs';
import {
  TourAgenciesAndGuidesTab,
  TourAnalyticsAndReportsTab,
  TourProfitabilityAndExpensesTab,
} from './components/TourProfitAgenciesAndReportsTabs';

type TourTabId =
  | 'packages'
  | 'seat_map'
  | 'bookings'
  | 'resources'
  | 'profit'
  | 'agencies_guides'
  | 'reports';

export default function TourOperatorDashboardPage() {
  const [activeTab, setActiveTab] = useState<TourTabId>('packages');
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const [ganttStartDate, setGanttStartDate] = useState<string>('2026-11-20');
  const [revealKvkk, setRevealKvkk] = useState<boolean>(false);
  const [demoCompanyId, setDemoCompanyId] = useState<string>('trzm-comp-main');
  const [showDemoGuide, setShowDemoGuide] = useState<boolean>(false);
  const [focusedTourId, setFocusedTourId] = useState<string | null>(null);

  const loadSnapshot = useCallback(
    async (opts?: { startDate?: string; reveal?: boolean; companyId?: string }) => {
      setLoading(true);
      setErrorMsg(null);
      try {
        const stDate = opts?.startDate !== undefined ? opts.startDate : ganttStartDate;
        const rev = opts?.reveal !== undefined ? opts.reveal : revealKvkk;
        const cmpId = opts?.companyId !== undefined ? opts.companyId : demoCompanyId;

        const params = new URLSearchParams({ section: 'overview' });
        if (stDate) params.set('ganttStartDate', stDate);
        if (rev) params.set('revealKvkk', 'true');
        if (cmpId) params.set('demoCompanyId', cmpId);

        const res = await fetch(`/api/tur?${params.toString()}`, { cache: 'no-store' });
        const json = await res.json();
        if (!res.ok || !json.success) {
          throw new Error(json.error || 'Tur operatörlüğü verileri yüklenemedi.');
        }
        setData(json);
      } catch (err: any) {
        setErrorMsg(err.message);
        toast.error(err.message);
      } finally {
        setLoading(false);
      }
    },
    [ganttStartDate, revealKvkk, demoCompanyId]
  );

  useEffect(() => {
    loadSnapshot();
  }, [loadSnapshot]);

  const handleDispatchAlerts = async () => {
    try {
      const res = await fetch('/api/tur', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'dispatch_alerts', demoCompanyId }),
      });
      const json = await res.json();
      if (res.ok && json.success) {
        toast.success(
          `${json.totalAlerts} tur uyarısı tarandı (${json.notificationsSent} yeni bildirim gönderildi).`
        );
        loadSnapshot();
      }
    } catch {
      toast.error('Bildirim taraması çalıştırılamadı.');
    }
  };

  const tours = data?.tours || [];
  const guides = data?.guides || [];
  const agencies = data?.agencies || [];
  const seatLayouts = data?.seatLayouts || [];
  const vehicles = data?.vehicles || [];
  const drivers = data?.drivers || [];
  const customers = data?.customers || [];
  const hotelAllotments = data?.hotelAllotments || [];
  const hotelRooms = data?.hotelRooms || [];
  const conflictLogs = data?.conflictLogs || [];
  const resourceGantt = data?.resourceGantt || { dateHeaders: [], rows: [] };
  const analytics = data?.analytics || {};
  const alerts = data?.alerts || { totalAlerts: 0, alerts: [] };
  const isDemoMode = Boolean(data?.featureFlags?.tourismDemoMode);
  const demoPerspectiveCompanies = data?.demoPerspectiveCompanies || [];

  const tabs: Array<{ id: TourTabId; label: string; icon: any; badge?: number }> = [
    { id: 'packages', label: 'Turlar & Takvim', icon: Globe, badge: tours.length },
    { id: 'seat_map', label: 'Koltuk Planı & Biniş Haritası', icon: Compass },
    { id: 'bookings', label: 'Rezervasyon, Manifesto & Otel', icon: Users },
    { id: 'resources', label: 'Kaynak Çakışma & Gantt', icon: CalendarDays, badge: conflictLogs.length },
    { id: 'profit', label: 'Maliyet-Kâr Analizi', icon: CreditCard },
    { id: 'agencies_guides', label: 'Acenta & Rehberler', icon: ShieldCheck, badge: agencies.length },
    { id: 'reports', label: 'Raporlar & Dışa Aktar', icon: BarChart3 },
  ];

  return (
    <div className="min-h-screen space-y-5 bg-[var(--page)] p-4 text-[var(--text)] md:p-6">
      {/* Başlık */}
      <div className="flex flex-wrap items-start justify-between gap-4 rounded-2xl border border-[var(--line)] bg-[var(--bg)] p-5 shadow-sm">
        <div>
          <span className="inline-flex items-center gap-1.5 rounded-full border border-[var(--brand-line)] bg-[var(--brand-soft)] px-2.5 py-0.5 text-[11px] font-medium text-[var(--brand)]">
            <Globe className="h-3.5 w-3.5" /> Tur Operatörlüğü
          </span>
          <h1 className="mt-1.5 text-xl font-bold tracking-tight text-[var(--text)] md:text-2xl">
            Tur Planlama, Dinamik Koltuk, Manifesto, Çakışma & Kâr Analizi
          </h1>
          <p className="mt-1 text-xs text-[var(--text-muted)]">
            Günübirlik ve konaklamalı turlar, Filo & Rent-a-Car çapraz kaynak kilidi, Otel PMS & KBS bağlantısı, acenta komisyonları ve mobil rehber sahası.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {isDemoMode && demoPerspectiveCompanies.length > 0 && (
            <select
              value={demoCompanyId}
              onChange={(e) => {
                setDemoCompanyId(e.target.value);
                loadSnapshot({ companyId: e.target.value });
              }}
              className="rounded-lg border border-[var(--line)] bg-[var(--bg)] px-3 py-2 text-xs text-[var(--text)] focus:border-[var(--brand)] focus:outline-none"
            >
              {demoPerspectiveCompanies.map((c: any) => (
                <option key={c.id} value={c.id} className="bg-[var(--bg)] text-[var(--text)]">
                  Perspektif: {c.name}
                </option>
              ))}
            </select>
          )}

          {data?.canRevealKvkkPii && (
            <button
              type="button"
              onClick={() => {
                const next = !revealKvkk;
                setRevealKvkk(next);
                loadSnapshot({ reveal: next });
              }}
              className="flex items-center gap-1.5 rounded-lg border border-[var(--line)] bg-[var(--bg)] px-3 py-2 text-xs text-[var(--text-2)] hover:bg-[var(--muted-bg)] transition-colors"
            >
              {revealKvkk ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
              {revealKvkk ? 'KVKK Maskele' : 'KVKK Aç'}
            </button>
          )}

          <Link
            href="/dashboard/tur/rehber"
            className="flex items-center gap-1.5 rounded-lg border border-[var(--brand-line)] bg-[var(--brand-soft)] px-3 py-2 text-xs font-medium text-[var(--brand)] hover:bg-[var(--brand-soft-2)] transition-colors"
          >
            <Smartphone className="h-3.5 w-3.5" /> Rehber / Şoför Mobil
          </Link>

          <button
            type="button"
            onClick={handleDispatchAlerts}
            className="flex items-center gap-1.5 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs font-medium text-[var(--warn)] hover:bg-amber-100 transition-colors"
          >
            <Bell className="h-3.5 w-3.5" /> Uyarıları Bildir ({alerts.totalAlerts || 0})
          </button>

          {isDemoMode && (
            <button
              type="button"
              onClick={() => setShowDemoGuide((v) => !v)}
              className="flex items-center gap-1.5 rounded-lg border border-[var(--line)] bg-[var(--bg)] px-3 py-2 text-xs text-[var(--text-2)] hover:bg-[var(--muted-bg)] transition-colors"
            >
              <HelpCircle className="h-3.5 w-3.5 text-[var(--brand)]" /> Bu Ekranda Neler Yapabilirsiniz?
            </button>
          )}

          <button
            type="button"
            onClick={() => loadSnapshot()}
            className="flex items-center gap-1.5 rounded-lg border border-[var(--line)] bg-[var(--bg)] px-3 py-2 text-xs text-[var(--text-2)] hover:bg-[var(--muted-bg)] transition-colors"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} /> Yenile
          </button>
        </div>
      </div>

      {/* Yalnızca Demo Rehberi */}
      {isDemoMode && showDemoGuide && (
        <div className="rounded-xl border border-[var(--brand-line)] bg-[var(--brand-soft)] p-4 text-xs text-[var(--text)] shadow-sm">
          <div className="mb-2 font-semibold text-[var(--brand)]">
            Demo Senaryo Kısayolları (Yalnızca Demo Ortamında Görünür)
          </div>
          <div className="grid grid-cols-1 gap-2 md:grid-cols-4">
            <button
              type="button"
              onClick={() => {
                setFocusedTourId('trzm-tur-pkg-01');
                setActiveTab('bookings');
              }}
              className="rounded-lg border border-[var(--line)] bg-[var(--bg)] p-2.5 text-left hover:border-[var(--brand)] transition shadow-sm"
            >
              <strong className="block text-[var(--text)]">1. Otel & KBS Bağlı Tur</strong>
              <span className="text-[11px] text-[var(--text-muted)]">
                TUR-2026-01 konaklamalı turu inceleyip imzalı PDF manifesto indirin.
              </span>
            </button>
            <button
              type="button"
              onClick={() => {
                setFocusedTourId('trzm-tur-pkg-01');
                setActiveTab('seat_map');
              }}
              className="rounded-lg border border-[var(--line)] bg-[var(--bg)] p-2.5 text-left hover:border-[var(--brand)] transition shadow-sm"
            >
              <strong className="block text-[var(--text)]">2. Koltuk Cinsiyet Kuralı & Harita</strong>
              <span className="text-[11px] text-[var(--text-muted)]">
                Midibüs koltuk planında yan yana cinsiyet kuralını ve biniş haritasını görün.
              </span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('resources')}
              className="rounded-lg border border-[var(--line)] bg-[var(--bg)] p-2.5 text-left hover:border-[var(--brand)] transition shadow-sm"
            >
              <strong className="block text-[var(--text)]">3. Çapraz Kaynak Çakışması</strong>
              <span className="text-[11px] text-[var(--text-muted)]">
                Araç/Şoför/Rehber Gantt üzerinde Rent-a-Car ve Filo bakım bloklarını görün.
              </span>
            </button>
            <Link
              href="/dashboard/tur/rehber"
              className="rounded-lg border border-[var(--line)] bg-[var(--bg)] p-2.5 text-left hover:border-[var(--brand)] transition shadow-sm"
            >
              <strong className="block text-[var(--text)]">4. Çevrimdışı Rehber Mobil</strong>
              <span className="text-[11px] text-[var(--text-muted)]">
                Rehber (<code>rehber.kerem</code> / <code>demo123</code>) ile çevrimdışı yoklama & saha tahsilatı deneyin.
              </span>
            </Link>
          </div>
        </div>
      )}

      {/* Özet KPI Kartları */}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-5">
        <div className="rounded-xl border border-[var(--line)] bg-[var(--bg)] p-4 shadow-sm">
          <div className="text-xs text-[var(--text-muted)]">Aktif / Toplam Tur</div>
          <div className="mt-1 text-2xl font-bold text-[var(--text)]">
            {analytics?.summary?.activeTours ?? 0} / {tours.length}
          </div>
          <div className="text-[11px] text-[var(--brand)]">
            Ort. Doluluk: %{analytics?.summary?.avgOccupancyPct ?? 0}
          </div>
        </div>
        <div className="rounded-xl border border-[var(--line)] bg-[var(--bg)] p-4 shadow-sm">
          <div className="text-xs text-[var(--text-muted)]">Toplam Yolcu</div>
          <div className="mt-1 text-2xl font-bold text-[var(--text)]">
            {analytics?.summary?.totalPassengers ?? 0}
          </div>
          <div className="text-[11px] text-[var(--text-muted)]">
            İptal Oranı: %{analytics?.summary?.cancellationRatePct ?? 0}
          </div>
        </div>
        <div className="rounded-xl border border-[var(--line)] bg-[var(--bg)] p-4 shadow-sm">
          <div className="text-xs text-[var(--text-muted)]">Toplam Tur Geliri</div>
          <div className="mt-1 text-2xl font-bold text-[var(--text)]">
            {Number(analytics?.summary?.totalGrossRevenueTry || 0).toLocaleString('tr-TR')} ₺
          </div>
          <div className="text-[11px] text-[var(--text-muted)]">{agencies.length} acenta kanalı</div>
        </div>
        <div className="rounded-xl border border-[var(--line)] bg-[var(--bg)] p-4 shadow-sm">
          <div className="text-xs text-[var(--text-muted)]">Toplam Net Kâr</div>
          <div className="mt-1 text-2xl font-bold text-[var(--ok)]">
            {Number(analytics?.summary?.totalNetProfitTry || 0).toLocaleString('tr-TR')} ₺
          </div>
          <div className="text-[11px] text-[var(--text-muted)]">
            Yolcu başı: {Number(analytics?.summary?.avgProfitPerPassengerTry || 0).toLocaleString('tr-TR')} ₺
          </div>
        </div>
        <div className="rounded-xl border border-[var(--line)] bg-[var(--bg)] p-4 shadow-sm">
          <div className="text-xs text-[var(--text-muted)]">Uyarılar & Çakışmalar</div>
          <div className="mt-1 text-2xl font-bold text-[var(--warn)]">{alerts.totalAlerts || 0}</div>
          <div className="text-[11px] text-[var(--bad)]">
            Açık çakışma: {conflictLogs.filter((c: any) => !c.resolved).length}
          </div>
        </div>
      </div>

      {/* Aktif Uyarılar */}
      {alerts.alerts?.length > 0 && (
        <div className="flex flex-wrap gap-2 rounded-xl border border-amber-200 bg-amber-50 p-3">
          {alerts.alerts.slice(0, 5).map((al: any) => (
            <div
              key={al.entityId}
              className={`flex items-center gap-1.5 rounded-lg border px-2.5 py-1 text-[11px] ${ al.severity === 'error' ? 'border-red-200 bg-red-50 text-[var(--bad)]' : 'border-amber-200 bg-amber-100/50 text-[var(--warn)]' }`}
            >
              <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
              <span>{al.title}</span>
            </div>
          ))}
        </div>
      )}

      {/* Sekme Çubuğu */}
      <div className="flex flex-wrap gap-1.5 rounded-xl border border-[var(--line)] bg-[var(--bg)] p-2 shadow-sm">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const active = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-medium transition ${ active ? 'bg-[var(--brand)] text-white shadow-sm' : 'text-[var(--text-muted)] hover:bg-[var(--brand-soft)] hover:text-[var(--brand)]' }`}
            >
              <Icon className="h-3.5 w-3.5" />
              <span>{tab.label}</span>
              {tab.badge !== undefined && (
                <span
                  className={`rounded-full px-1.5 py-0.5 text-[10px] ${ active ? 'bg-[var(--muted-bg)] text-[var(--text)]' : 'bg-[var(--muted-bg)] text-[var(--text-muted)]' }`}
                >
                  {tab.badge}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {errorMsg && (
        <div className="rounded-xl border border-[var(--bad-line)] bg-[var(--bad-soft)] p-4 text-xs text-rose-200">
          {errorMsg}
        </div>
      )}

      {!loading || data ? (
        <div>
          {activeTab === 'packages' && (
            <TourPackagesAndCalendarTab
              tours={tours}
              vehicles={vehicles}
              drivers={drivers}
              guides={guides}
              seatLayouts={seatLayouts}
              hotelAllotments={hotelAllotments}
              hotelRooms={hotelRooms}
              demoCompanyId={demoCompanyId}
              onRefresh={() => loadSnapshot()}
              onFocusTour={(tourId, targetTab) => {
                setFocusedTourId(tourId);
                setActiveTab(targetTab);
              }}
            />
          )}

          {activeTab === 'seat_map' && (
            <TourSeatMapAndStopsTab
              tours={tours}
              focusedTourId={focusedTourId}
              mapConfig={data?.mapConfig}
              demoCompanyId={demoCompanyId}
              onRefresh={() => loadSnapshot()}
            />
          )}

          {activeTab === 'bookings' && (
            <TourBookingsAndManifestoTab
              tours={tours}
              customers={customers}
              agencies={agencies}
              focusedTourId={focusedTourId}
              demoCompanyId={demoCompanyId}
              onRefresh={() => loadSnapshot()}
            />
          )}

          {activeTab === 'resources' && (
            <TourResourceGanttAndConflictsTab
              resourceGantt={resourceGantt}
              conflictLogs={conflictLogs}
              ganttStartDate={ganttStartDate}
              onChangeStartDate={(d) => {
                setGanttStartDate(d);
                loadSnapshot({ startDate: d });
              }}
              demoCompanyId={demoCompanyId}
              onRefresh={() => loadSnapshot()}
            />
          )}

          {activeTab === 'profit' && (
            <TourProfitabilityAndExpensesTab
              tours={tours}
              focusedTourId={focusedTourId}
              demoCompanyId={demoCompanyId}
              onRefresh={() => loadSnapshot()}
            />
          )}

          {activeTab === 'agencies_guides' && (
            <TourAgenciesAndGuidesTab
              agencies={agencies}
              agencyPerformanceRows={analytics?.agencyPerformanceRows || []}
              guides={guides}
              demoCompanyId={demoCompanyId}
              onRefresh={() => loadSnapshot()}
            />
          )}

          {activeTab === 'reports' && (
            <TourAnalyticsAndReportsTab analytics={analytics} demoCompanyId={demoCompanyId} />
          )}
        </div>
      ) : (
        <div className="rounded-xl border border-[--line] bg-[white] p-12 text-center text-sm text-[var(--text-muted)]">
          Tur operatörlüğü verileri yükleniyor...
        </div>
      )}
    </div>
  );
}
