'use client';

import React, { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import {
  Activity,
  AlertTriangle,
  BarChart3,
  Bell,
  Building2,
  Calendar,
  ClipboardCheck,
  CreditCard,
  FileCheck2,
  FileText,
  HelpCircle,
  RefreshCw,
  Settings,
  ShieldCheck,
  Smartphone,
  Truck,
  Users,
} from 'lucide-react';
import { toast } from 'sonner';
import {
  RentAvailabilityGanttTab,
  RentReservationsAndContractsTab,
} from './components/RentGanttAndReservationsTabs';
import {
  RentDepositsChargesAndPenaltiesTab,
  RentHandoverAndReturnTab,
} from './components/RentHandoverAndChargesTabs';
import {
  RentAnalyticsAndReportsTab,
  RentClassesTariffsAndPolicyTab,
  RentCustomersKvkkTab,
  RentKabisPreparationTab,
} from './components/RentClassesKabisAndReportsTabs';

type RentTabId =
  | 'gantt'
  | 'reservations'
  | 'handover'
  | 'charges_penalties'
  | 'classes_tariffs'
  | 'customers_kvkk'
  | 'kabis'
  | 'reports';

export default function RentACarDashboardPage() {
  const [activeTab, setActiveTab] = useState<RentTabId>('gantt');
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Filtreler & Demo Perspektifi
  const [selectedClassId, setSelectedClassId] = useState<string>('');
  const [selectedBranchId, setSelectedBranchId] = useState<string>('');
  const [ganttStartDate, setGanttStartDate] = useState<string>('2026-11-15');
  const [revealKvkk, setRevealKvkk] = useState<boolean>(false);
  const [demoCompanyId, setDemoCompanyId] = useState<string>('trzm-comp-main');
  const [showDemoGuide, setShowDemoGuide] = useState<boolean>(false);

  // Sekmeler arası hızlı geçiş bağlamı
  const [focusedReservationId, setFocusedReservationId] = useState<string | null>(null);
  const [preselectedVehicleForNew, setPreselectedVehicleForNew] = useState<{
    vehicleId: string;
    dateKey?: string;
  } | null>(null);

  const loadSnapshot = useCallback(
    async (opts?: {
      classId?: string;
      branchId?: string;
      startDate?: string;
      reveal?: boolean;
      companyId?: string;
    }) => {
      setLoading(true);
      setErrorMsg(null);
      try {
        const clsId = opts?.classId !== undefined ? opts.classId : selectedClassId;
        const brId = opts?.branchId !== undefined ? opts.branchId : selectedBranchId;
        const stDate = opts?.startDate !== undefined ? opts.startDate : ganttStartDate;
        const rev = opts?.reveal !== undefined ? opts.reveal : revealKvkk;
        const cmpId = opts?.companyId !== undefined ? opts.companyId : demoCompanyId;

        const params = new URLSearchParams({ section: 'overview' });
        if (clsId) params.set('vehicleClassId', clsId);
        if (brId) params.set('branchId', brId);
        if (stDate) params.set('ganttStartDate', stDate);
        if (rev) params.set('revealKvkk', 'true');
        if (cmpId) params.set('demoCompanyId', cmpId);

        const res = await fetch(`/api/arac-kiralama?${params.toString()}`, {
          cache: 'no-store',
        });
        const json = await res.json();
        if (!res.ok || !json.success) {
          throw new Error(json.error || 'Araç kiralama verileri yüklenemedi.');
        }
        setData(json);
      } catch (err: any) {
        setErrorMsg(err.message);
        toast.error(err.message);
      } finally {
        setLoading(false);
      }
    },
    [selectedClassId, selectedBranchId, ganttStartDate, revealKvkk, demoCompanyId]
  );

  useEffect(() => {
    loadSnapshot();
  }, [loadSnapshot]);

  const handleDispatchAlerts = async () => {
    try {
      const res = await fetch('/api/arac-kiralama', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'dispatch_alerts', demoCompanyId }),
      });
      const json = await res.json();
      if (res.ok && json.success) {
        toast.success(
          `${json.totalAlerts} aktif kiralama uyarısı tarandı (${json.notificationsSent} yeni bildirim iletildi).`
        );
        loadSnapshot();
      }
    } catch {
      toast.error('Bildirim taraması çalıştırılamadı.');
    }
  };

  const classes = data?.classes || [];
  const tariffs = data?.tariffs || [];
  const extraServices = data?.extraServices || [];
  const policyConfig = data?.policyConfig || {};
  const rentalVehicles = data?.rentalVehicles || [];
  const gantt = data?.gantt || { dateHeaders: [], rows: [] };
  const customers = data?.customers || [];
  const reservations = data?.reservations || [];
  const contracts = data?.contracts || [];
  const inspectionForms = data?.inspectionForms || [];
  const depositCharges = data?.depositCharges || [];
  const tollPasses = data?.tollPasses || [];
  const trafficPenalties = data?.trafficPenalties || [];
  const kabisRecords = data?.kabisRecords || [];
  const conflictLogs = data?.conflictLogs || [];
  const chauffeurDrivers = data?.chauffeurDrivers || [];
  const analytics = data?.analytics || {};
  const alerts = data?.alerts || { totalAlerts: 0, alerts: [] };
  const isDemoMode = Boolean(data?.featureFlags?.tourismDemoMode);
  const demoPerspectiveCompanies = data?.demoPerspectiveCompanies || [];

  const rentedCount = rentalVehicles.filter((v: any) => v.rentalStatus === 'RENTED').length;
  const availableCount = rentalVehicles.filter((v: any) => v.rentalStatus === 'AVAILABLE').length;
  const maintenanceCount = rentalVehicles.filter(
    (v: any) => v.rentalStatus === 'MAINTENANCE'
  ).length;

  return (
    <div className="min-h-screen bg-[#080A09] text-zinc-100 p-4 md:p-6 space-y-5">
      {/* Üst Başlık & Aksiyon Çubuğu */}
      <div className="bg-[#111513]/90 backdrop-blur-xl border border-white/[0.06] rounded-[20px] p-5 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center">
            <Truck className="w-5 h-5 text-[#34D399]" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-white">
              Araç Kiralama (Rent-a-Car) Operasyon &amp; Sözleşme Merkezi
            </h1>
            <p className="text-xs text-zinc-400">
              Lojistik Filo entegreli müsaitlik Gantt takvimi, atomik çift rezervasyon kilidi, dijital imzalı sözleşme, teslim/iade ekspertizi, HGS/ceza yansıtma ve KABİS hazırlığı
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Link
            href="/dashboard/arac-kiralama/teslim-iade"
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-full bg-emerald-500/15 hover:bg-emerald-500/25 border border-emerald-500/30 text-xs font-medium text-[#34D399]"
          >
            <Smartphone className="w-3.5 h-3.5" />
            Mobil Teslim &amp; İade Ekranı
          </Link>

          <button
            type="button"
            onClick={handleDispatchAlerts}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-full bg-white/[0.06] hover:bg-white/[0.12] border border-white/[0.1] text-xs font-medium text-white cursor-pointer"
          >
            <Bell className="w-3.5 h-3.5 text-amber-300" />
            Uyarıları Tara ({alerts.totalAlerts || 0})
          </button>

          <button
            type="button"
            onClick={() => loadSnapshot()}
            disabled={loading}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full bg-white/[0.06] hover:bg-white/[0.12] border border-white/[0.1] text-xs font-medium text-white cursor-pointer"
          >
            <RefreshCw className={`w-3.5 h-3.5 text-[#34D399] ${loading ? 'animate-spin' : ''}`} />
            Verileri Güncelle
          </button>
        </div>
      </div>

      {/* DEMO KOLAYLIĞI ŞERİDİ (Yalnızca Demo Modu Açıkken Render Edilir; DISABLE_DEMO_MODE=true İken Kaybolur) */}
      {isDemoMode && (
        <div className="bg-[#111513]/95 border border-emerald-500/25 rounded-[20px] p-4 space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-2.5">
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-emerald-500/15 text-[#34D399] border border-emerald-500/30">
                <Building2 className="w-3.5 h-3.5" />
                Firma Perspektifi (Çok Firmalı İzolasyon Önizlemesi):
              </span>
              {demoPerspectiveCompanies.map((comp: any) => {
                const active = demoCompanyId === comp.id;
                return (
                  <button
                    key={comp.id}
                    type="button"
                    onClick={() => {
                      setDemoCompanyId(comp.id);
                      loadSnapshot({ companyId: comp.id });
                    }}
                    className={`px-3 py-1 rounded-xl text-xs font-medium transition cursor-pointer ${
                      active
                        ? 'bg-[#34D399] text-[#061811] font-semibold'
                        : 'bg-white/[0.06] text-zinc-300 hover:text-white'
                    }`}
                  >
                    {comp.name}
                  </button>
                );
              })}
            </div>

            <div className="flex flex-wrap items-center gap-1.5">
              <button
                type="button"
                onClick={() => {
                  setFocusedReservationId('trzm-rnt-res-11');
                  setActiveTab('reservations');
                }}
                className="px-2.5 py-1 rounded-lg bg-rose-500/15 text-rose-300 border border-rose-500/30 text-[11px] cursor-pointer"
              >
                Senaryo: Geciken İade (34 RNT 202)
              </button>
              <button
                type="button"
                onClick={() => {
                  setFocusedReservationId('trzm-rnt-res-06');
                  setActiveTab('handover');
                }}
                className="px-2.5 py-1 rounded-lg bg-amber-500/15 text-amber-300 border border-amber-500/30 text-[11px] cursor-pointer"
              >
                Senaryo: Hasar Fotoğraflı İade Farkı
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('charges_penalties')}
                className="px-2.5 py-1 rounded-lg bg-sky-500/15 text-sky-300 border border-sky-500/30 text-[11px] cursor-pointer"
              >
                Senaryo: HGS &amp; Ceza Müşteri Yansıtma
              </button>
              <button
                type="button"
                onClick={() => setShowDemoGuide((prev) => !prev)}
                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-white/[0.08] text-zinc-200 text-[11px] cursor-pointer"
              >
                <HelpCircle className="w-3.5 h-3.5 text-[#34D399]" />
                Bu ekranda neler yapabilirsiniz?
              </button>
            </div>
          </div>

          {showDemoGuide && (
            <div className="bg-[#080A09] border border-white/[0.08] rounded-xl p-3.5 text-xs text-zinc-300 grid grid-cols-1 md:grid-cols-4 gap-3">
              <div>
                <strong className="text-white block mb-0.5">1. Gantt &amp; Çakışma Kilidi</strong>
                Araç satırlarında kirada, rezerve ve bakımdaki (`34 RNT 913`) günleri görebilir; boş güne tıklayarak atomik çakışma korumalı rezervasyon açabilirsiniz.
              </div>
              <div>
                <strong className="text-white block mb-0.5">2. Dijital İmzalı Sözleşme</strong>
                Rezervasyon satırındaki &ldquo;Sözleşme / İmza&rdquo; butonuyla tarayıcı üzerinden müşteri imzası alıp yazdırılabilir sözleşme üretebilirsiniz.
              </div>
              <div>
                <strong className="text-white block mb-0.5">3. Teslim &amp; İade Fark Hesabı</strong>
                Çıkış ve dönüş km, yakıt yüzdesi ve karoser hasar fotoğraflarını karşılaştırıp aşım/yakıt/gecikme bedelini depozitodan otomatik mahsup edebilirsiniz.
              </div>
              <div>
                <strong className="text-white block mb-0.5">4. HGS/Ceza, KABİS &amp; TCO</strong>
                Filo cezalarını ve HGS geçişlerini plaka+tarih ile eşleştirip müşteriye faturalayabilir, KABİS CSV paketi ve Filo TCO kârlılık Excel/PDF raporu indirebilirsiniz.
              </div>
            </div>
          )}
        </div>
      )}

      {/* Üst KPI Kartları (Veritabanı Kayıtlarından Canlı Hesaplanan) */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <div className="bg-[#111513]/90 border border-white/[0.06] rounded-[20px] p-4">
          <div className="text-[11px] text-zinc-400">Kiralama Filosu / Kirada</div>
          <div className="text-2xl font-bold text-white font-mono mt-1">
            {rentalVehicles.length}{' '}
            <span className="text-sm text-[#34D399]">/ {rentedCount} kirada</span>
          </div>
          <div className="text-[11px] text-zinc-400 mt-0.5">
            {availableCount} müsait · {maintenanceCount} bakımda
          </div>
        </div>

        <div className="bg-[#111513]/90 border border-white/[0.06] rounded-[20px] p-4">
          <div className="text-[11px] text-zinc-400">Ortalama Doluluk &amp; Rezervasyon</div>
          <div className="text-2xl font-bold text-[#34D399] font-mono mt-1">
            %{analytics?.summary?.avgUtilizationPct ?? 0}
          </div>
          <div className="text-[11px] text-zinc-400 mt-0.5">
            {reservations.length} kayıt ({analytics?.summary?.completedCount || 0} tamamlandı)
          </div>
        </div>

        <div className="bg-[#111513]/90 border border-white/[0.06] rounded-[20px] p-4">
          <div className="text-[11px] text-zinc-400">Kiralama &amp; Ek Ücret Geliri</div>
          <div className="text-2xl font-bold text-white font-mono mt-1">
            ₺{Number(analytics?.summary?.totalRevenueTry || 0).toLocaleString('tr-TR')}
          </div>
          <div className="text-[11px] text-[#34D399] mt-0.5">
            Net Katkı (TCO Sonrası): ₺
            {Number(analytics?.summary?.totalNetProfitTry || 0).toLocaleString('tr-TR')}
          </div>
        </div>

        <div className="bg-[#111513]/90 border border-white/[0.06] rounded-[20px] p-4">
          <div className="text-[11px] text-zinc-400">Eşleşen HGS &amp; Trafik Cezası</div>
          <div className="text-2xl font-bold text-amber-300 font-mono mt-1">
            {tollPasses.length + trafficPenalties.length}
          </div>
          <div className="text-[11px] text-zinc-400 mt-0.5">
            {kabisRecords.length} KABİS bildirim hazırlık paketi
          </div>
        </div>

        <div className="bg-[#111513]/90 border border-white/[0.06] rounded-[20px] p-4">
          <div className="text-[11px] text-zinc-400">Aktif Operasyon Uyarısı</div>
          <div
            className={`text-2xl font-bold font-mono mt-1 ${
              (alerts.totalAlerts || 0) > 0 ? 'text-rose-300' : 'text-[#34D399]'
            }`}
          >
            {alerts.totalAlerts || 0}
          </div>
          <div className="text-[11px] text-zinc-400 mt-0.5">
            Geciken iade, yaklaşan teslim &amp; depozito
          </div>
        </div>
      </div>

      {/* Sekme Çubuğu */}
      <div className="bg-[#111513] p-1.5 rounded-2xl border border-white/[0.06] flex flex-wrap gap-1.5">
        {[
          { id: 'gantt', label: `Müsaitlik Takvimi (Gantt)`, icon: Calendar },
          {
            id: 'reservations',
            label: `Rezervasyon & Sözleşme (${reservations.length})`,
            icon: FileText,
          },
          {
            id: 'handover',
            label: `Teslim & İade Ekspertiz (${inspectionForms.length})`,
            icon: ClipboardCheck,
          },
          {
            id: 'charges_penalties',
            label: `Depozito, Ek Ücret & HGS/Ceza (${depositCharges.length})`,
            icon: CreditCard,
          },
          {
            id: 'classes_tariffs',
            label: `Sınıflar, Tarifeler & Şablon (${classes.length})`,
            icon: Settings,
          },
          {
            id: 'customers_kvkk',
            label: `Müşteri & Sürücü KVKK (${customers.length})`,
            icon: Users,
          },
          {
            id: 'kabis',
            label: `KABİS Hazırlık & Dışa Aktarma (${kabisRecords.length})`,
            icon: ShieldCheck,
          },
          {
            id: 'reports',
            label: 'Raporlar & Filo TCO Kârlılık',
            icon: BarChart3,
          },
        ].map((tab) => {
          const Icon = tab.icon;
          const active = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id as RentTabId)}
              className={`inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-medium transition cursor-pointer ${
                active
                  ? 'bg-[#34D399] text-[#061811] font-semibold'
                  : 'text-zinc-400 hover:text-white hover:bg-white/[0.04]'
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              {tab.label}
            </button>
          );
        })}
      </div>

      {errorMsg && !data && (
        <div className="bg-rose-500/10 border border-rose-500/30 rounded-2xl p-4 text-xs text-rose-200 flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 text-rose-400" />
          {errorMsg}
        </div>
      )}

      {loading && !data ? (
        <div className="bg-[#111513]/90 border border-white/[0.06] rounded-[20px] p-12 text-center text-xs text-zinc-400 flex items-center justify-center gap-2">
          <Activity className="w-4 h-4 text-[#34D399] animate-pulse" />
          Araç kiralama veritabanı yükleniyor...
        </div>
      ) : (
        <>
          {activeTab === 'gantt' && (
            <RentAvailabilityGanttTab
              gantt={gantt}
              classes={classes}
              conflictLogs={conflictLogs}
              selectedClassId={selectedClassId}
              selectedBranchId={selectedBranchId}
              ganttStartDate={ganttStartDate}
              onFilterChange={(f) => {
                if (f.classId !== undefined) setSelectedClassId(f.classId);
                if (f.branchId !== undefined) setSelectedBranchId(f.branchId);
                if (f.startDate !== undefined) setGanttStartDate(f.startDate);
                loadSnapshot({
                  classId: f.classId,
                  branchId: f.branchId,
                  startDate: f.startDate,
                });
              }}
              onSelectReservationId={(resId) => {
                setFocusedReservationId(resId);
                setActiveTab('reservations');
              }}
              onOpenNewReservationForVehicle={(vehicleId, dateKey) => {
                setPreselectedVehicleForNew({ vehicleId, dateKey });
                setActiveTab('reservations');
              }}
            />
          )}

          {activeTab === 'reservations' && (
            <RentReservationsAndContractsTab
              reservations={reservations}
              contracts={contracts}
              rentalVehicles={rentalVehicles}
              classes={classes}
              tariffs={tariffs}
              extraServices={extraServices}
              customers={customers}
              chauffeurDrivers={chauffeurDrivers}
              demoCompanyId={demoCompanyId}
              initialSelectedReservationId={focusedReservationId}
              preselectedVehicleForNew={preselectedVehicleForNew}
              onRefresh={() => {
                setPreselectedVehicleForNew(null);
                loadSnapshot();
              }}
              onGoToHandoverForReservation={(resId) => {
                setFocusedReservationId(resId);
                setActiveTab('handover');
              }}
            />
          )}

          {activeTab === 'handover' && (
            <RentHandoverAndReturnTab
              reservations={reservations}
              inspectionForms={inspectionForms}
              policyConfig={policyConfig}
              demoCompanyId={demoCompanyId}
              selectedReservationId={focusedReservationId}
              onSelectReservationId={(id) => setFocusedReservationId(id)}
              onRefresh={() => loadSnapshot()}
            />
          )}

          {activeTab === 'charges_penalties' && (
            <RentDepositsChargesAndPenaltiesTab
              depositCharges={depositCharges}
              tollPasses={tollPasses}
              trafficPenalties={trafficPenalties}
              reservations={reservations}
              demoCompanyId={demoCompanyId}
              onRefresh={() => loadSnapshot()}
            />
          )}

          {activeTab === 'classes_tariffs' && (
            <RentClassesTariffsAndPolicyTab
              classes={classes}
              tariffs={tariffs}
              extraServices={extraServices}
              policyConfig={policyConfig}
              demoCompanyId={demoCompanyId}
              onRefresh={() => loadSnapshot()}
            />
          )}

          {activeTab === 'customers_kvkk' && (
            <RentCustomersKvkkTab
              customers={customers}
              canRevealKvkkPii={Boolean(data?.canRevealKvkkPii)}
              isKvkkRevealed={revealKvkk}
              onToggleRevealKvkk={() => {
                const next = !revealKvkk;
                setRevealKvkk(next);
                loadSnapshot({ reveal: next });
              }}
              demoCompanyId={demoCompanyId}
              onRefresh={() => loadSnapshot()}
            />
          )}

          {activeTab === 'kabis' && (
            <RentKabisPreparationTab
              kabisRecords={kabisRecords}
              demoCompanyId={demoCompanyId}
              onRefresh={() => loadSnapshot()}
            />
          )}

          {activeTab === 'reports' && (
            <RentAnalyticsAndReportsTab
              analytics={analytics}
              demoCompanyId={demoCompanyId}
            />
          )}
        </>
      )}
    </div>
  );
}
