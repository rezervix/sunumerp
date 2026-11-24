'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  Layers,
  MapPin,
  ClipboardCheck,
  Truck,
  Boxes,
  Split,
  Lock,
  Activity,
  Warehouse,
  RotateCcw
} from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { WmsPackagingAndSsccTab } from './components/WmsPackagingAndSsccTab';
import { WmsCrossDockAndKitTab } from './components/WmsCrossDockAndKitTab';
import { WmsReservationAndLedgerTab } from './components/WmsReservationAndLedgerTab';
import { WmsKpiAndRfidTab } from './components/WmsKpiAndRfidTab';
import { toast } from 'sonner';

import { WmsSummaryCards } from './components/WmsSummaryCards';
import { WmsWorkflowStepper } from './components/WmsWorkflowStepper';
import { StorageBinGrid } from './components/StorageBinGrid';
import { InventoryCountManager } from './components/InventoryCountManager';
import { InterWarehouseTransfers } from './components/InterWarehouseTransfers';
import { CreateWmsTaskModal } from './components/CreateWmsTaskModal';
import { InventoryModuleNav } from '../stok/components/InventoryModuleNav';
import { mockDatabase } from '@/lib/data/mockDatabase';
import { IconLoader, IconRefresh } from '@/components/ui/app-icons';
import { safeText } from '@/lib/utils/safe-display';

const EMPTY_WMS_STATS = {
  totalPendingTasks: 0,
  inProgressTasks: 0,
  totalBins: 0,
  occupiedBins: 0,
  averageOccupancy: 0,
  activeTransfers: 0,
  openCountSessions: 0,
};

export default function WmsDashboardPage() {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState('wizard-flow');
  const [selectedWarehouseId, setSelectedWarehouseId] = useState('ALL');
  const [demoMode, setDemoMode] = useState(false);
  const demoModeRef = useRef<boolean | null>(null);

  // WMS Data States
  const [stats, setStats] = useState(EMPTY_WMS_STATS);
  const [tasks, setTasks] = useState<any[]>([]);
  const [bins, setBins] = useState<any[]>([]);
  const [zones, setZones] = useState<any[]>([]);
  const [countSessions, setCountSessions] = useState<any[]>([]);
  const [transfers, setTransfers] = useState<any[]>([]);
  const [warehouses, setWarehouses] = useState<any[]>([]);
  const [items, setItems] = useState<any[]>([]);

  // Modal State
  const [isTaskModalOpen, setIsTaskModalOpen] = useState(false);

  const resolveDemoMode = useCallback(async () => {
    if (demoModeRef.current !== null) return demoModeRef.current;
    try {
      const cfgRes = await fetch('/api/system-config');
      if (cfgRes.ok) {
        const cfg = await cfgRes.json();
        const isDemo = Boolean(cfg?.logisticsDemoMode);
        demoModeRef.current = isDemo;
        setDemoMode(isDemo);
        return isDemo;
      }
    } catch {
      // Demo durumu çözülemezse varsayılan kapalı
    }
    demoModeRef.current = false;
    return false;
  }, []);

  // Canlı Reaktif Mock DB Dinleyicisi
  useEffect(() => {
    const handleDbChange = () => {
      if (demoModeRef.current !== true) return;
      const ov = mockDatabase.getWmsOverview();
      setStats(ov.stats);
      setTasks(ov.tasks);
      setBins(ov.bins);
      setZones(ov.zones);
      setCountSessions(ov.countSessions);
      setTransfers(ov.transfers);
      setWarehouses(ov.warehouses);
      setItems(ov.items);
    };
    window.addEventListener('sunum-mockdb-change', handleDbChange);
    return () => window.removeEventListener('sunum-mockdb-change', handleDbChange);
  }, []);

  // Fetch WMS data
  const fetchWmsData = useCallback(async (isSilent = false) => {
    try {
      if (!isSilent) setRefreshing(true);
      const res = await fetch('/api/wms', { cache: 'no-store' });
      if (res.ok) {
        const data = await res.json();
        if (data.success && (Array.isArray(data.warehouses) || Array.isArray(data.tasks))) {
          if (data.stats) setStats(data.stats);
          if (data.tasks) setTasks(data.tasks);
          if (data.bins) setBins(data.bins);
          if (data.zones) setZones(data.zones);
          if (data.countSessions) setCountSessions(data.countSessions);
          if (data.transfers) setTransfers(data.transfers);
          if (data.warehouses) setWarehouses(data.warehouses);
          if (data.items) setItems(data.items);
          return;
        }
      }
      if (res.status !== 401 && res.status !== 403 && (await resolveDemoMode())) {
        const ov = mockDatabase.getWmsOverview();
        setStats(ov.stats);
        setTasks(ov.tasks);
        setBins(ov.bins);
        setZones(ov.zones);
        setCountSessions(ov.countSessions);
        setTransfers(ov.transfers);
        setWarehouses(ov.warehouses);
        setItems(ov.items);
      }
    } catch (err: any) {
      if (await resolveDemoMode()) {
        console.warn('WMS fetch error, fallback to demo:', err);
        const ov = mockDatabase.getWmsOverview();
        setStats(ov.stats);
        setTasks(ov.tasks);
        setBins(ov.bins);
        setZones(ov.zones);
        setCountSessions(ov.countSessions);
        setTransfers(ov.transfers);
        setWarehouses(ov.warehouses);
        setItems(ov.items);
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [resolveDemoMode]);

  useEffect(() => {
    resolveDemoMode();
    fetchWmsData(true);
  }, [fetchWmsData, resolveDemoMode]);

  // Seed / Reset demo data
  const handleResetSeed = async () => {
    if (!confirm('Depo ve WMS verilerini sıfırlayıp temiz başlangıç verisi yüklemek istiyor musunuz?')) {
      return;
    }

    try {
      setRefreshing(true);
      const res = await fetch('/api/wms', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'seed_reset' })
      });
      const data = await res.json();
      if (data.success) {
        toast.success('Gerçekçi WMS verileri başarıyla yüklendi');
        fetchWmsData();
      } else if (await resolveDemoMode()) {
        mockDatabase.resetToDefault();
        toast.success('Gerçekçi WMS demo verileri sıfırlandı');
      } else {
        toast.error(data.error || 'Bu işlem yalnızca demo ortamında kullanılabilir.');
      }
    } catch {
      if (await resolveDemoMode()) {
        mockDatabase.resetToDefault();
        toast.success('Gerçekçi WMS demo verileri sıfırlandı');
      } else {
        toast.error('WMS sıfırlama işlemi başarısız.');
      }
    } finally {
      setRefreshing(false);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] space-y-3 bg-white/80 border border-[--line] rounded-[20px]">
        <IconLoader size={28} className="text-[--brand] animate-spin" />
        <p className="text-xs font-medium text-[--text-muted]">
          WMS Depo ve Raf Veritabanı Yükleniyor...
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* 0. STOK VE DEPO YÖNETİMİ BİRLEŞİK ÜST SEKME / NAVİGASYON */}
      <InventoryModuleNav />

      {/* 1. ÜST ÖZET KARTLAR VE HIZLI BUTONLAR (KUTUSUZ STRIP) */}
      <WmsSummaryCards
        stats={stats}
        onNewTaskClick={() => setIsTaskModalOpen(true)}
        onNewTransferClick={() => setActiveTab('transfers')}
        onNewCountClick={() => setActiveTab('counts')}
      />

      {/* Yenile & Test Verisi Araç Çubuğu (Açık Cam Panel) */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs bg-white/80 backdrop-blur-xl border border-[--line] px-4 py-2.5 rounded-2xl shadow-xs">
        <div className="flex items-center gap-2">
          <span className="inline-block w-2 h-2 rounded-full bg-[--brand] animate-ping" />
          <span className="text-[--text] font-medium">Canlı WMS Hattı Aktif</span>
          {refreshing && (
            <span className="text-[--brand] font-medium flex items-center gap-1 ml-2">
              <IconLoader size={12} className="animate-spin" /> Güncelleniyor...
            </span>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-1.5 bg-[--page] border border-[--line] rounded-xl px-2.5 py-1">
            <Warehouse className="w-3.5 h-3.5 text-[--brand]" />
            <select
              value={selectedWarehouseId}
              onChange={(e) => setSelectedWarehouseId(e.target.value)}
              aria-label="Global Depo Seçimi"
              className="bg-transparent text-xs text-[--text] focus:outline-none cursor-pointer"
            >
              <option value="ALL">Tüm Depolar</option>
              {warehouses.map((w: any) => (
                <option key={w.id} value={w.id}>
                  {safeText(w.name)} ({safeText(w.code)})
                </option>
              ))}
            </select>
          </div>

          <Button
            variant="ghost"
            size="sm"
            onClick={() => fetchWmsData()}
            className="h-8 px-2.5 text-xs text-[--text-muted] hover:text-[--text] gap-1.5 rounded-xl cursor-pointer"
          >
            <IconRefresh size={13} />
            Yenile
          </Button>

          {demoMode && (
            <>
              <span className="text-[--line]">•</span>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleResetSeed}
                className="h-8 px-2.5 text-xs text-[--text-muted] hover:text-[--warn] gap-1.5 rounded-xl cursor-pointer"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                Örnek Verileri Sıfırla
              </Button>
            </>
          )}
        </div>
      </div>

      {/* 2. MODÜLER TAB YAPISI */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid grid-cols-2 sm:grid-cols-4 xl:grid-cols-8 gap-1 bg-[--muted-bg] border border-[--line] p-1 rounded-2xl h-auto">
          <TabsTrigger
            value="wizard-flow"
            className="flex items-center justify-center gap-1.5 py-2 px-2 rounded-xl text-xs font-medium transition data-[state=active]:bg-white data-[state=active]:text-[--brand] data-[state=active]:shadow-xs"
          >
            <Layers className="w-3.5 h-3.5 shrink-0" />
            <span className="truncate">İş Akışları</span>
          </TabsTrigger>

          <TabsTrigger
            value="bin-map"
            className="flex items-center justify-center gap-1.5 py-2 px-2 rounded-xl text-xs font-medium transition data-[state=active]:bg-white data-[state=active]:text-[--brand] data-[state=active]:shadow-xs"
          >
            <MapPin className="w-3.5 h-3.5 shrink-0" />
            <span className="truncate">Depo & Raf</span>
          </TabsTrigger>

          <TabsTrigger
            value="counts"
            className="flex items-center justify-center gap-1.5 py-2 px-2 rounded-xl text-xs font-medium transition data-[state=active]:bg-white data-[state=active]:text-[--brand] data-[state=active]:shadow-xs"
          >
            <ClipboardCheck className="w-3.5 h-3.5 shrink-0" />
            <span className="truncate">Sayım</span>
          </TabsTrigger>

          <TabsTrigger
            value="transfers"
            className="flex items-center justify-center gap-1.5 py-2 px-2 rounded-xl text-xs font-medium transition data-[state=active]:bg-white data-[state=active]:text-[--brand] data-[state=active]:shadow-xs"
          >
            <Truck className="w-3.5 h-3.5 shrink-0" />
            <span className="truncate">Transferler</span>
          </TabsTrigger>

          <TabsTrigger
            value="packaging-sscc"
            className="flex items-center justify-center gap-1.5 py-2 px-2 rounded-xl text-xs font-medium transition data-[state=active]:bg-white data-[state=active]:text-[--brand] data-[state=active]:shadow-xs"
          >
            <Boxes className="w-3.5 h-3.5 shrink-0" />
            <span className="truncate">Ambalaj/SSCC</span>
          </TabsTrigger>

          <TabsTrigger
            value="crossdock-kit"
            className="flex items-center justify-center gap-1.5 py-2 px-2 rounded-xl text-xs font-medium transition data-[state=active]:bg-white data-[state=active]:text-[--brand] data-[state=active]:shadow-xs"
          >
            <Split className="w-3.5 h-3.5 shrink-0" />
            <span className="truncate">Cross-Dock</span>
          </TabsTrigger>

          <TabsTrigger
            value="reservations-ledger"
            className="flex items-center justify-center gap-1.5 py-2 px-2 rounded-xl text-xs font-medium transition data-[state=active]:bg-white data-[state=active]:text-[--brand] data-[state=active]:shadow-xs"
          >
            <Lock className="w-3.5 h-3.5 shrink-0" />
            <span className="truncate">Rezervasyon</span>
          </TabsTrigger>

          <TabsTrigger
            value="kpi-rfid"
            className="flex items-center justify-center gap-1.5 py-2 px-2 rounded-xl text-xs font-medium transition data-[state=active]:bg-white data-[state=active]:text-[--brand] data-[state=active]:shadow-xs"
          >
            <Activity className="w-3.5 h-3.5 shrink-0" />
            <span className="truncate">KPI & RFID</span>
          </TabsTrigger>
        </TabsList>

        {/* SEKME 1: İŞ AKIŞLARI SİHİRBAZI */}
        <TabsContent value="wizard-flow" className="focus-visible:outline-none">
          <WmsWorkflowStepper
            tasks={selectedWarehouseId === 'ALL' ? tasks : tasks.filter((t: any) => t.warehouseId === selectedWarehouseId)}
            warehouses={warehouses}
            bins={bins}
            items={items}
            selectedWarehouseId={selectedWarehouseId}
            onTaskUpdated={() => fetchWmsData(true)}
          />
        </TabsContent>

        {/* SEKME 2: DEPO HİYERARŞİSİ & RAF HARİTASI */}
        <TabsContent value="bin-map" className="focus-visible:outline-none">
          <StorageBinGrid
            bins={bins}
            warehouses={warehouses}
            zones={zones}
            selectedWarehouseId={selectedWarehouseId}
            onRefresh={() => fetchWmsData(true)}
          />
        </TabsContent>

        {/* SEKME 3: STOK SAYIMI VE DÖNEMSEL SAYIM */}
        <TabsContent value="counts" className="focus-visible:outline-none">
          <InventoryCountManager
            sessions={selectedWarehouseId === 'ALL' ? countSessions : countSessions.filter((c: any) => c.warehouseId === selectedWarehouseId)}
            warehouses={warehouses}
            zones={zones}
            selectedWarehouseId={selectedWarehouseId}
            onSessionUpdated={() => fetchWmsData(true)}
          />
        </TabsContent>

        {/* SEKME 4: DEPOLAR ARASI TRANSFER */}
        <TabsContent value="transfers" className="focus-visible:outline-none">
          <InterWarehouseTransfers
            transfers={transfers}
            warehouses={warehouses}
            items={items}
            bins={bins}
            onRefresh={() => fetchWmsData(true)}
          />
        </TabsContent>

        {/* SEKME 5: AMBALAJ & SSCC-18 */}
        <TabsContent value="packaging-sscc" className="focus-visible:outline-none">
          <WmsPackagingAndSsccTab
            warehouses={warehouses}
            items={items}
            bins={bins}
            selectedWarehouseId={selectedWarehouseId}
            onRefreshParent={() => fetchWmsData(true)}
          />
        </TabsContent>

        {/* SEKME 6: CROSS-DOCK & KİTTİNG */}
        <TabsContent value="crossdock-kit" className="focus-visible:outline-none">
          <WmsCrossDockAndKitTab
            warehouses={warehouses}
            items={items}
            bins={bins}
            selectedWarehouseId={selectedWarehouseId}
            onRefreshParent={() => fetchWmsData(true)}
          />
        </TabsContent>

        {/* SEKME 7: REZERVASYON, FEFO/FIFO & STOK DEFTERİ */}
        <TabsContent value="reservations-ledger" className="focus-visible:outline-none">
          <WmsReservationAndLedgerTab
            warehouses={warehouses}
            items={items}
            selectedWarehouseId={selectedWarehouseId}
            onRefreshParent={() => fetchWmsData(true)}
          />
        </TabsContent>

        {/* SEKME 8: DEPO KPI & RFID KAPISI */}
        <TabsContent value="kpi-rfid" className="focus-visible:outline-none">
          <WmsKpiAndRfidTab selectedWarehouseId={selectedWarehouseId} />
        </TabsContent>
      </Tabs>

      {/* YENİ GÖREV EKLEME MODALI */}
      <CreateWmsTaskModal
        isOpen={isTaskModalOpen}
        onClose={() => setIsTaskModalOpen(false)}
        warehouses={warehouses}
        bins={bins}
        items={items}
        onCreated={() => fetchWmsData(true)}
      />
    </div>
  );
}
