'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import {
  Layers,
  MapPin,
  ClipboardCheck,
  Truck,
  RotateCcw,
  RefreshCw
} from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from 'sonner';

import { WmsSummaryCards } from './components/WmsSummaryCards';
import { WmsWorkflowStepper } from './components/WmsWorkflowStepper';
import { StorageBinGrid } from './components/StorageBinGrid';
import { InventoryCountManager } from './components/InventoryCountManager';
import { InterWarehouseTransfers } from './components/InterWarehouseTransfers';
import { CreateWmsTaskModal } from './components/CreateWmsTaskModal';
import { InventoryModuleNav } from '../stok/components/InventoryModuleNav';

export default function WmsDashboardPage() {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState('wizard-flow');

  // WMS Data States
  const [stats, setStats] = useState({
    totalPendingTasks: 0,
    inProgressTasks: 0,
    totalBins: 0,
    occupiedBins: 0,
    averageOccupancy: 0,
    activeTransfers: 0,
    openCountSessions: 0
  });
  const [tasks, setTasks] = useState<any[]>([]);
  const [bins, setBins] = useState<any[]>([]);
  const [zones, setZones] = useState<any[]>([]);
  const [countSessions, setCountSessions] = useState<any[]>([]);
  const [transfers, setTransfers] = useState<any[]>([]);
  const [warehouses, setWarehouses] = useState<any[]>([]);
  const [items, setItems] = useState<any[]>([]);

  // Modal State
  const [isTaskModalOpen, setIsTaskModalOpen] = useState(false);

  // Fetch WMS data from real Prisma API
  const fetchWmsData = useCallback(async (isSilent = false) => {
    try {
      if (!isSilent) setRefreshing(true);
      const res = await fetch('/api/wms', { cache: 'no-store' });
      const data = await res.json();

      if (data.success) {
        if (data.stats) setStats(data.stats);
        if (data.tasks) setTasks(data.tasks);
        if (data.bins) setBins(data.bins);
        if (data.zones) setZones(data.zones);
        if (data.countSessions) setCountSessions(data.countSessions);
        if (data.transfers) setTransfers(data.transfers);
        if (data.warehouses) setWarehouses(data.warehouses);
        if (data.items) setItems(data.items);
      } else {
        toast.error(data.error || 'WMS verileri yüklenemedi');
      }
    } catch (err: any) {
      console.error('WMS fetch error:', err);
      toast.error('WMS sunucu bağlantısında hata oluştu');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchWmsData();
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
        toast.error(data.error || 'Sıfırlama başarısız');
      }
    } catch (err: any) {
      toast.error('Hata oluştu');
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

        <div className="flex items-center gap-3">
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
        <TabsList className="grid grid-cols-2 md:grid-cols-4 bg-[#111513]/90 border border-white/[0.06] p-1.5 rounded-2xl h-auto">
          <TabsTrigger
            value="wizard-flow"
            className="flex items-center gap-2 py-2.5 px-4 rounded-xl text-xs sm:text-sm font-medium text-zinc-400 hover:text-white transition data-[state=active]:bg-white/[0.08] data-[state=active]:text-white data-[state=active]:border data-[state=active]:border-white/[0.1] data-[state=active]:shadow-sm"
          >
            <Layers className="w-4 h-4 text-zinc-400" />
            İş Akışları & Sihirbaz
          </TabsTrigger>

          <TabsTrigger
            value="bin-map"
            className="flex items-center gap-2 py-2.5 px-4 rounded-xl text-xs sm:text-sm font-medium text-zinc-400 hover:text-white transition data-[state=active]:bg-white/[0.08] data-[state=active]:text-white data-[state=active]:border data-[state=active]:border-white/[0.1] data-[state=active]:shadow-sm"
          >
            <MapPin className="w-4 h-4 text-[#34D399]" />
            Raf & Hücre Haritası
          </TabsTrigger>

          <TabsTrigger
            value="counts"
            className="flex items-center gap-2 py-2.5 px-4 rounded-xl text-xs sm:text-sm font-medium text-zinc-400 hover:text-white transition data-[state=active]:bg-white/[0.08] data-[state=active]:text-white data-[state=active]:border data-[state=active]:border-white/[0.1] data-[state=active]:shadow-sm"
          >
            <ClipboardCheck className="w-4 h-4 text-amber-400" />
            Sayım & Mahsuplaşma
          </TabsTrigger>

          <TabsTrigger
            value="transfers"
            className="flex items-center gap-2 py-2.5 px-4 rounded-xl text-xs sm:text-sm font-medium text-zinc-400 hover:text-white transition data-[state=active]:bg-white/[0.08] data-[state=active]:text-white data-[state=active]:border data-[state=active]:border-white/[0.1] data-[state=active]:shadow-sm"
          >
            <Truck className="w-4 h-4 text-zinc-300" />
            Depolar Arası Transfer
          </TabsTrigger>
        </TabsList>

        {/* SEKME 1: İŞ AKIŞLARI SİHİRBAZI */}
        <TabsContent value="wizard-flow" className="focus-visible:outline-none">
          <WmsWorkflowStepper
            tasks={tasks}
            onTaskUpdated={() => fetchWmsData(true)}
          />
        </TabsContent>

        {/* SEKME 2: RAF & HÜCRE HARİTASI */}
        <TabsContent value="bin-map" className="focus-visible:outline-none">
          <StorageBinGrid
            bins={bins}
            warehouses={warehouses}
          />
        </TabsContent>

        {/* SEKME 3: STOK SAYIMI VE KÖR SAYIM */}
        <TabsContent value="counts" className="focus-visible:outline-none">
          <InventoryCountManager
            sessions={countSessions}
            warehouses={warehouses}
            onSessionUpdated={() => fetchWmsData(true)}
          />
        </TabsContent>

        {/* SEKME 4: DEPOLAR ARASI TRANSFER */}
        <TabsContent value="transfers" className="focus-visible:outline-none">
          <InterWarehouseTransfers
            transfers={transfers}
            warehouses={warehouses}
            items={items}
            onRefresh={() => fetchWmsData(true)}
          />
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
