'use client';

import React, { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import {
  AlertTriangle,
  BarChart3,
  Bell,
  Building2,
  Calendar,
  ClipboardCheck,
  CreditCard,
  Eye,
  EyeOff,
  FileText,
  HelpCircle,
  RefreshCw,
  Settings,
  ShieldCheck,
  Smartphone,
  Users,
} from 'lucide-react';
import { toast } from 'sonner';
import {
  HotelAvailabilityGanttTab,
  HotelFloorPlanTab,
} from './components/HotelFloorPlanAndGanttTabs';
import {
  HotelFolioAndBillingTab,
  HotelReservationsAndCheckInOutTab,
} from './components/HotelReservationsAndFolioTabs';
import {
  HotelAllotmentsTab,
  HotelAnalyticsAndReportsTab,
  HotelHousekeepingSupervisionTab,
  HotelKbsPreparationTab,
  HotelRoomTypesTariffsPolicyTab,
} from './components/HotelHkKbsAllotmentAndReportsTabs';

type HotelTabId =
  | 'floor_plan'
  | 'gantt'
  | 'reservations'
  | 'folio'
  | 'housekeeping'
  | 'allotments'
  | 'kbs'
  | 'settings'
  | 'reports';

export default function HotelMiniPmsDashboardPage() {
  const [activeTab, setActiveTab] = useState<HotelTabId>('floor_plan');
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const [ganttStartDate, setGanttStartDate] = useState<string>('2026-11-18');
  const [revealKvkk, setRevealKvkk] = useState<boolean>(false);
  const [demoCompanyId, setDemoCompanyId] = useState<string>('trzm-comp-main');
  const [showDemoGuide, setShowDemoGuide] = useState<boolean>(false);

  const [focusedReservationId, setFocusedReservationId] = useState<string | null>(null);
  const [preselectedRoomForNew, setPreselectedRoomForNew] = useState<{
    roomId: string;
    dateKey?: string;
  } | null>(null);

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

        const res = await fetch(`/api/otel?${params.toString()}`, { cache: 'no-store' });
        const json = await res.json();
        if (!res.ok || !json.success) {
          throw new Error(json.error || 'Otel PMS verileri yüklenemedi.');
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
      const res = await fetch('/api/otel', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'dispatch_alerts', demoCompanyId }),
      });
      const json = await res.json();
      if (res.ok && json.success) {
        toast.success(
          `${json.totalAlerts} otel uyarısı tarandı (${json.notificationsSent} yeni bildirim iletildi).`
        );
        loadSnapshot();
      }
    } catch {
      toast.error('Bildirim taraması çalıştırılamadı.');
    }
  };

  const roomTypes = data?.roomTypes || [];
  const rooms = data?.rooms || [];
  const tariffs = data?.tariffs || [];
  const policyConfig = data?.policyConfig || {};
  const allotments = data?.allotments || [];
  const gantt = data?.gantt || { dateHeaders: [], rows: [] };
  const guests = data?.guests || [];
  const reservations = data?.reservations || [];
  const minibarItems = data?.minibarItems || [];
  const housekeepingTasks = data?.housekeepingTasks || [];
  const housekeepingStaff = data?.housekeepingStaff || [];
  const kbsRecords = data?.kbsRecords || [];
  const conflictLogs = data?.conflictLogs || [];
  const analytics = data?.analytics || {};
  const alerts = data?.alerts || { totalAlerts: 0, alerts: [] };
  const isDemoMode = Boolean(data?.featureFlags?.tourismDemoMode);
  const demoPerspectiveCompanies = data?.demoPerspectiveCompanies || [];

  const occupiedCount = rooms.filter((r: any) => r.status === 'OCCUPIED').length;
  const cleanVacantCount = rooms.filter((r: any) => r.status === 'CLEAN_VACANT').length;
  const dirtyOrCleaningCount = rooms.filter(
    (r: any) =>
      r.status === 'DIRTY_VACANT' ||
      r.status === 'CLEANING_IN_PROGRESS' ||
      r.status === 'INSPECTION_PENDING'
  ).length;
  const liveOccupancyPct =
    rooms.length > 0 ? Number(((occupiedCount / rooms.length) * 100).toFixed(1)) : 0;

  const tabs: Array<{ id: HotelTabId; label: string; icon: any; badge?: number }> = [
    { id: 'floor_plan', label: 'Kat Planı & Odalar', icon: Building2, badge: rooms.length },
    { id: 'gantt', label: 'Rezervasyon Takvimi', icon: Calendar },
    { id: 'reservations', label: 'Rezervasyon & Check-In/Out', icon: Users, badge: reservations.length },
    { id: 'folio', label: 'Oda Hesabı (Folio)', icon: CreditCard },
    { id: 'housekeeping', label: 'Housekeeping & Arıza', icon: ClipboardCheck, badge: housekeepingTasks.length },
    { id: 'allotments', label: 'Acenta Kontenjanı', icon: FileText, badge: allotments.length },
    { id: 'kbs', label: 'KBS Hazırlık', icon: ShieldCheck, badge: kbsRecords.length },
    { id: 'settings', label: 'Oda Tipleri & Tarifeler', icon: Settings },
    { id: 'reports', label: 'Raporlar & KPI', icon: BarChart3 },
  ];

  return (
    <div className="min-h-screen space-y-5 bg-[var(--page)] p-4 text-[var(--text)] md:p-6">
      {/* Üst Başlık & Demo Kontrolleri */}
      <div className="flex flex-wrap items-start justify-between gap-4 rounded-2xl border border-[var(--line)] bg-[var(--bg)] p-5 shadow-sm">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center gap-1.5 rounded-full border border-[var(--brand-line)] bg-[var(--brand-soft)] px-2.5 py-0.5 text-[11px] font-medium text-[var(--brand)]">
              <Building2 className="h-3.5 w-3.5" /> Otel Yönetimi (Mini PMS)
            </span>
            {policyConfig?.hotelDisplayName && (
              <span className="text-xs text-[var(--text-muted)]">{policyConfig.hotelDisplayName}</span>
            )}
          </div>
          <h1 className="mt-1.5 text-xl font-bold tracking-tight text-[var(--text)] md:text-2xl">
            Otel Ön Büro, Kat Planı, Folio, Housekeeping & KBS Paneli
          </h1>
          <p className="mt-1 text-xs text-[var(--text-muted)]">
            Atomik çift rezervasyon kilidi, KVKK maskeli misafir kaydı, stok bağlantılı minibar folio, çevrimdışı housekeeping ve Doluluk/ADR/RevPAR raporları tek ekranda.
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
              {revealKvkk ? 'KVKK Maskele' : 'KVKK Aç (Denetimli)'}
            </button>
          )}

          <Link
            href="/dashboard/otel/housekeeping"
            className="flex items-center gap-1.5 rounded-lg border border-[var(--brand-line)] bg-[var(--brand-soft)] px-3 py-2 text-xs font-medium text-[var(--brand)] hover:bg-[var(--brand-soft-2)] transition-colors"
          >
            <Smartphone className="h-3.5 w-3.5" /> Mobil Housekeeping
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

      {/* Yalnızca Demo Ortamında Görünen Kısa Kılavuz & Senaryo Kısayolları */}
      {isDemoMode && showDemoGuide && (
        <div className="rounded-xl border border-[var(--brand-line)] bg-[var(--brand-soft)] p-4 text-xs text-[var(--text)] shadow-sm">
          <div className="mb-2 font-semibold text-[var(--brand)]">
            Demo Senaryo Kısayolları (Yalnızca Demo Ortamında Gösterilir)
          </div>
          <div className="grid grid-cols-1 gap-2 md:grid-cols-4">
            <button
              type="button"
              onClick={() => setActiveTab('floor_plan')}
              className="rounded-lg border border-[var(--line)] bg-[var(--bg)] p-2.5 text-left hover:border-[var(--brand)] transition shadow-sm"
            >
              <strong className="block text-[var(--text)]">1. Kat Planı (50 Oda)</strong>
              <span className="text-[11px] text-[var(--text-muted)]">
                5 katlı odalarda tek tıkla temizlik/bakım durumu değiştirin.
              </span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('reservations')}
              className="rounded-lg border border-[var(--line)] bg-[var(--bg)] p-2.5 text-left hover:border-[var(--brand)] transition shadow-sm"
            >
              <strong className="block text-[var(--text)]">2. Check-In → Folio → Check-Out</strong>
              <span className="text-[11px] text-[var(--text-muted)]">
                OTL-2026-1014 için Check-In yapıp minibar ekleyin, bakiye kapatıp Check-Out alın.
              </span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('allotments')}
              className="rounded-lg border border-[var(--line)] bg-[var(--bg)] p-2.5 text-left hover:border-[var(--brand)] transition shadow-sm"
            >
              <strong className="block text-[var(--text)]">3. Acenta Kontenjan Limiti</strong>
              <span className="text-[11px] text-[var(--text-muted)]">
                KNT-EGE-DLX (%88 dolu) dolmaya yakın uyarısını ve aşım engellemesini inceleyin.
              </span>
            </button>
            <Link
              href="/dashboard/otel/housekeeping"
              className="rounded-lg border border-[var(--line)] bg-[var(--bg)] p-2.5 text-left hover:border-[var(--brand)] transition shadow-sm"
            >
              <strong className="block text-[var(--text)]">4. Çevrimdışı Housekeeping</strong>
              <span className="text-[11px] text-[var(--text-muted)]">
                Kısıtlı temizlik personeli (<code>temizlik.ayse</code> / <code>demo123</code>) mobil ekranını deneyin.
              </span>
            </Link>
          </div>
        </div>
      )}

      {/* Özet KPI Şeridi */}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-5">
        <div className="rounded-xl border border-[var(--line)] bg-[var(--bg)] p-4 shadow-sm">
          <div className="text-xs text-[var(--text-muted)]">Anlık Oda Doluluğu</div>
          <div className="mt-1 text-2xl font-bold text-[var(--brand)]">%{liveOccupancyPct}</div>
          <div className="mt-0.5 text-[11px] text-[var(--text-muted)]">
            {occupiedCount} Dolu / {rooms.length} Aktif Oda
          </div>
        </div>
        <div className="rounded-xl border border-[var(--line)] bg-[var(--bg)] p-4 shadow-sm">
          <div className="text-xs text-[var(--text-muted)]">Satışa Hazır / Temizlikte</div>
          <div className="mt-1 text-2xl font-bold text-[var(--text)]">{cleanVacantCount}</div>
          <div className="mt-0.5 text-[11px] text-[var(--warn)]">
            {dirtyOrCleaningCount} kirli / temizlik / denetim
          </div>
        </div>
        <div className="rounded-xl border border-[var(--line)] bg-[var(--bg)] p-4 shadow-sm">
          <div className="text-xs text-[var(--text-muted)]">ADR (Ort. Günlük Oda)</div>
          <div className="mt-1 text-2xl font-bold text-[var(--text)]">
            {Number(analytics?.kpis?.adrTry || 0).toLocaleString('tr-TR')} ₺
          </div>
          <div className="mt-0.5 text-[11px] text-[var(--text-muted)]">
            RevPAR: {Number(analytics?.kpis?.revParTry || 0).toLocaleString('tr-TR')} ₺
          </div>
        </div>
        <div className="rounded-xl border border-[var(--line)] bg-[var(--bg)] p-4 shadow-sm">
          <div className="text-xs text-[var(--text-muted)]">Toplam Konaklama + Ekstra</div>
          <div className="mt-1 text-2xl font-bold text-[var(--text)]">
            {Number(analytics?.kpis?.totalRevenueTry || 0).toLocaleString('tr-TR')} ₺
          </div>
          <div className="mt-0.5 text-[11px] text-[var(--text-muted)]">
            {analytics?.kpis?.soldRoomNights || 0} satılan oda-gece
          </div>
        </div>
        <div className="rounded-xl border border-[var(--line)] bg-[var(--bg)] p-4 shadow-sm">
          <div className="text-xs text-[var(--text-muted)]">Aktif Uyarılar & KBS</div>
          <div className="mt-1 text-2xl font-bold text-[var(--warn)]">{alerts.totalAlerts || 0}</div>
          <div className="mt-0.5 text-[11px] text-[var(--text-muted)]">
            KBS Eksik/Hatalı:{' '}
            {
              kbsRecords.filter(
                (k: any) => k.preparationStatus === 'EKSIK_VERI' || k.preparationStatus === 'HATALI'
              ).length
            }
          </div>
        </div>
      </div>

      {/* Aktif Uyarılar Şeridi */}
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

      {/* Sekme Navigasyonu */}
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

      {/* Hata veya Yükleniyor Durumu */}
      {errorMsg && (
        <div className="rounded-xl border border-[var(--bad-line)] bg-[var(--bad-soft)] p-4 text-xs text-rose-200">
          {errorMsg}
        </div>
      )}

      {/* Sekme İçerikleri */}
      {!loading || data ? (
        <div>
          {activeTab === 'floor_plan' && (
            <HotelFloorPlanTab
              rooms={rooms}
              roomTypes={roomTypes}
              demoCompanyId={demoCompanyId}
              onRefresh={() => loadSnapshot()}
              onQuickReserveRoom={(roomId, dateKey) => {
                setPreselectedRoomForNew({ roomId, dateKey });
                setActiveTab('reservations');
              }}
              onOpenFolioForReservation={(resId) => {
                setFocusedReservationId(resId);
                setActiveTab('folio');
              }}
            />
          )}

          {activeTab === 'gantt' && (
            <HotelAvailabilityGanttTab
              gantt={gantt}
              conflictLogs={conflictLogs}
              ganttStartDate={ganttStartDate}
              onChangeStartDate={(next) => {
                setGanttStartDate(next);
                loadSnapshot({ startDate: next });
              }}
              onQuickReserveCell={(roomId, dateKey) => {
                setPreselectedRoomForNew({ roomId, dateKey });
                setActiveTab('reservations');
              }}
            />
          )}

          {activeTab === 'reservations' && (
            <HotelReservationsAndCheckInOutTab
              reservations={reservations}
              rooms={rooms}
              guests={guests}
              allotments={allotments}
              demoCompanyId={demoCompanyId}
              preselectedRoom={preselectedRoomForNew}
              onClearPreselectedRoom={() => setPreselectedRoomForNew(null)}
              onRefresh={() => loadSnapshot()}
              onOpenFolio={(resId) => {
                setFocusedReservationId(resId);
                setActiveTab('folio');
              }}
            />
          )}

          {activeTab === 'folio' && (
            <HotelFolioAndBillingTab
              reservations={reservations}
              minibarItems={minibarItems}
              focusedReservationId={focusedReservationId}
              demoCompanyId={demoCompanyId}
              onRefresh={() => loadSnapshot()}
            />
          )}

          {activeTab === 'housekeeping' && (
            <HotelHousekeepingSupervisionTab
              tasks={housekeepingTasks}
              rooms={rooms}
              staff={housekeepingStaff}
              demoCompanyId={demoCompanyId}
              onRefresh={() => loadSnapshot()}
            />
          )}

          {activeTab === 'allotments' && (
            <HotelAllotmentsTab
              allotments={allotments}
              roomTypes={roomTypes}
              demoCompanyId={demoCompanyId}
              onRefresh={() => loadSnapshot()}
            />
          )}

          {activeTab === 'kbs' && (
            <HotelKbsPreparationTab
              kbsRecords={kbsRecords}
              demoCompanyId={demoCompanyId}
              onRefresh={() => loadSnapshot()}
            />
          )}

          {activeTab === 'settings' && (
            <HotelRoomTypesTariffsPolicyTab
              roomTypes={roomTypes}
              tariffs={tariffs}
              policyConfig={policyConfig}
              demoCompanyId={demoCompanyId}
              onRefresh={() => loadSnapshot()}
            />
          )}

          {activeTab === 'reports' && (
            <HotelAnalyticsAndReportsTab analytics={analytics} demoCompanyId={demoCompanyId} />
          )}
        </div>
      ) : (
        <div className="rounded-xl border border-[--line] bg-[white] p-12 text-center text-sm text-[var(--text-muted)]">
          Otel PMS verileri yükleniyor...
        </div>
      )}
    </div>
  );
}
