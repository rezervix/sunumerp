'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import {
  Layers,
  MapPin,
  ClipboardCheck,
  Truck,
  RotateCcw,
  RefreshCw,
  Boxes,
  Split,
  Lock,
  Activity,
  Warehouse
} from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
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

export default function WmsDashboardPage() {
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState('wizard-flow');
  const [selectedWarehouseId, setSelectedWarehouseId] = useState('ALL');

  // WMS Data States - Anında Canlı Demo Verileri ile Başlat
  const [stats, setStats] = useState(() => mockDatabase.getWmsOverview().stats);
  const [tasks, setTasks] = useState<any[]>(() => mockDatabase.getWmsOverview().tasks);
  const [bins, setBins] = useState<any[]>(() => mockDatabase.getWmsOverview().bins);
  const [zones, setZones] = useState<any[]>(() => mockDatabase.getWmsOverview().zones);
  const [countSessions, setCountSessions] = useState<any[]>(() => mockDatabase.getWmsOverview().countSessions);
  const [transfers, setTransfers] = useState<any[]>(() => mockDatabase.getWmsOverview().transfers);
  const [warehouses, setWarehouses] = useState<any[]>(() => mockDatabase.getWmsOverview().warehouses);
  const [items, setItems] = useState<any[]>(() => mockDatabase.getWmsOverview().items);

  // Modal State
  const [isTaskModalOpen, setIsTaskModalOpen] = useState(false);

  // Canlı Reaktif Mock DB Dinleyicisi
  useEffect(() => {
    const handleDbChange = () => {
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

  // Fetch WMS data from real Prisma API with seamless Demo fallback
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
      // Demo Fallback
      const ov = mockDatabase.getWmsOverview();
      setStats(ov.stats);
      setTasks(ov.tasks);
      setBins(ov.bins);
      setZones(ov.zones);
      setCountSessions(ov.countSessions);
      setTransfers(ov.transfers);
      setWarehouses(ov.warehouses);
      setItems(ov.items);
    } catch (err: any) {
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
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchWmsData(true);
  }, [fetchWmsData]);

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
      } else {
        mockDatabase.resetToDefault();
        toast.success('Gerçekçi WMS demo verileri sıfırlandı');
      }
    } catch {
      mockDatabase.resetToDefault();
      toast.success('Gerçekçi WMS demo verileri sıfırlandı');
    } finally {
      setRefreshing(false);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[500px] space-y-4 bg-[#111513]/90 border border-white/[0.06] rounded-[20px] m-6">
        <RefreshCw className="w-8 h-8 text-[#34D399] animate-spin" />
        <p className="text-sm font-medium text-zinc-400">
          WMS Depo ve Raf Veritabanı Yükleniyor...
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* 0. STOK VE DEPO YÖNETİMİ BİRLEŞİK ÜST SEKME / NAVİGASYON */}
      <InventoryModuleNav />

      {/* 1. ÜST ÖZET KARTLAR VE HIZLI BUTONLAR (KUTUSUZ STRIP) */}
      <WmsSummaryCards
        stats={stats}
        onNewTaskClick={() => setIsTaskModalOpen(true)}
        onNewTransferClick={() => setActiveTab('transfers')}
        onNewCountClick={() => setActiveTab('counts')}
      />

      {/* Yenile & Test Verisi Araç Çubuğu */}
      <div className="flex items-center justify-between text-xs text-zinc-400 bg-[#111513]/90 border border-white/[0.06] px-4 py-2.5 rounded-xl">
        <div className="flex items-center gap-2">
          <span className="inline-block w-2 h-2 rounded-full bg-[#34D399] animate-ping" />
          <span className="text-zinc-300">Prisma / PostgreSQL Canlı WMS Hattı Aktif</span>
          {refreshing && (
            <span className="text-[#34D399] font-medium flex items-center gap-1">
              <RefreshCw className="w-3 h-3 animate-spin" /> Güncelleniyor...
            </span>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-1.5 bg-black/40 border border-white/[0.08] rounded-lg px-2.5 py-1">
            <Warehouse className="w-3.5 h-3.5 text-[#34D399]" />
            <select
              value={selectedWarehouseId}
              onChange={(e) => setSelectedWarehouseId(e.target.value)}
              aria-label="Global Depo Seçimi"
              className="bg-transparent text-xs text-zinc-200 focus:outline-none cursor-pointer"
            >
              <option value="ALL" className="bg-[#111513]">Tüm Depolar</option>
              {warehouses.map((w: any) => (
                <option key={w.id} value={w.id} className="bg-[#111513]">
                  {w.name} ({w.code})
                </option>
              ))}
            </select>
          </div>
          <button
            onClick={() => fetchWmsData()}
            className="flex items-center gap-1.5 text-zinc-400 hover:text-white transition cursor-pointer"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            Yenile
          </button>
          <span className="text-white/20">•</span>
          <button
            onClick={handleResetSeed}
            className="flex items-center gap-1.5 text-zinc-400 hover:text-amber-400 transition cursor-pointer"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            Örnek Verileri Sıfırla
          </button>
        </div>
      </div>

      {/* 2. MODÜLER TAB YAPISI */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid grid-cols-2 sm:grid-cols-4 xl:grid-cols-8 gap-1 bg-[#111513]/90 border border-white/[0.06] p-1.5 rounded-2xl h-auto">
          <TabsTrigger
            value="wizard-flow"
            className="flex items-center justify-center gap-1.5 py-2.5 px-2.5 rounded-xl text-xs font-medium text-zinc-400 hover:text-white transition data-[state=active]:bg-white/[0.08] data-[state=active]:text-white data-[state=active]:border data-[state=active]:border-white/[0.1] data-[state=active]:shadow-sm"
          >
            <Layers className="w-3.5 h-3.5 text-zinc-400 shrink-0" />
            <span className="truncate">İş Akışları</span>
          </TabsTrigger>

          <TabsTrigger
            value="bin-map"
            className="flex items-center justify-center gap-1.5 py-2.5 px-2.5 rounded-xl text-xs font-medium text-zinc-400 hover:text-white transition data-[state=active]:bg-white/[0.08] data-[state=active]:text-white data-[state=active]:border data-[state=active]:border-white/[0.1] data-[state=active]:shadow-sm"
          >
            <MapPin className="w-3.5 h-3.5 text-[#34D399] shrink-0" />
            <span className="truncate">Depo & Raf Yapısı</span>
          </TabsTrigger>

          <TabsTrigger
            value="counts"
            className="flex items-center justify-center gap-1.5 py-2.5 px-2.5 rounded-xl text-xs font-medium text-zinc-400 hover:text-white transition data-[state=active]:bg-white/[0.08] data-[state=active]:text-white data-[state=active]:border data-[state=active]:border-white/[0.1] data-[state=active]:shadow-sm"
          >
            <ClipboardCheck className="w-3.5 h-3.5 text-amber-400 shrink-0" />
            <span className="truncate">Dönemsel Sayım</span>
          </TabsTrigger>

          <TabsTrigger
            value="transfers"
            className="flex items-center justify-center gap-1.5 py-2.5 px-2.5 rounded-xl text-xs font-medium text-zinc-400 hover:text-white transition data-[state=active]:bg-white/[0.08] data-[state=active]:text-white data-[state=active]:border data-[state=active]:border-white/[0.1] data-[state=active]:shadow-sm"
          >
            <Truck className="w-3.5 h-3.5 text-zinc-300 shrink-0" />
            <span className="truncate">Transferler</span>
          </TabsTrigger>

          <TabsTrigger
            value="packaging-sscc"
            className="flex items-center justify-center gap-1.5 py-2.5 px-2.5 rounded-xl text-xs font-medium text-zinc-400 hover:text-white transition data-[state=active]:bg-white/[0.08] data-[state=active]:text-white data-[state=active]:border data-[state=active]:border-white/[0.1] data-[state=active]:shadow-sm"
          >
            <Boxes className="w-3.5 h-3.5 text-[#34D399] shrink-0" />
            <span className="truncate">Ambalaj & SSCC</span>
          </TabsTrigger>

          <TabsTrigger
            value="crossdock-kit"
            className="flex items-center justify-center gap-1.5 py-2.5 px-2.5 rounded-xl text-xs font-medium text-zinc-400 hover:text-white transition data-[state=active]:bg-white/[0.08] data-[state=active]:text-white data-[state=active]:border data-[state=active]:border-white/[0.1] data-[state=active]:shadow-sm"
          >
            <Split className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
            <span className="truncate">Cross-Dock & Kit</span>
          </TabsTrigger>

          <TabsTrigger
            value="reservations-ledger"
            className="flex items-center justify-center gap-1.5 py-2.5 px-2.5 rounded-xl text-xs font-medium text-zinc-400 hover:text-white transition data-[state=active]:bg-white/[0.08] data-[state=active]:text-white data-[state=active]:border data-[state=active]:border-white/[0.1] data-[state=active]:shadow-sm"
          >
            <Lock className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
            <span className="truncate">Rezervasyon & Defter</span>
          </TabsTrigger>

          <TabsTrigger
            value="kpi-rfid"
            className="flex items-center justify-center gap-1.5 py-2.5 px-2.5 rounded-xl text-xs font-medium text-zinc-400 hover:text-white transition data-[state=active]:bg-white/[0.08] data-[state=active]:text-white data-[state=active]:border data-[state=active]:border-white/[0.1] data-[state=active]:shadow-sm"
          >
            <Activity className="w-3.5 h-3.5 text-violet-400 shrink-0" />
            <span className="truncate">Depo KPI & RFID</span>
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
