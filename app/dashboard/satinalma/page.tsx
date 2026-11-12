'use client';

import React, { useState, useEffect, useCallback } from 'react';
import {
  AlertTriangle,
  FileCheck2,
  Handshake,
  RefreshCw,
  RotateCcw
} from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from 'sonner';

import { ProcurementSummaryCards } from './components/ProcurementSummaryCards';
import { CriticalStockRopTable } from './components/CriticalStockRopTable';
import { PurchaseRequisitionsList } from './components/PurchaseRequisitionsList';
import { ConsignmentStockManager } from './components/ConsignmentStockManager';
import { CreateRequisitionModal } from './components/CreateRequisitionModal';
import { InventoryModuleNav } from '../stok/components/InventoryModuleNav';
import { mockDatabase } from '@/lib/data/mockDatabase';

export default function SmartProcurementAndConsignmentPage() {
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState('critical-rop');

  // Backend Veri Durumları - Anında Canlı Demo Verileri ile Başlat
  const [stats, setStats] = useState(() => mockDatabase.getProcurementOverview().stats);
  const [criticalItems, setCriticalItems] = useState<any[]>(() => mockDatabase.getProcurementOverview().criticalItems);
  const [allItems, setAllItems] = useState<any[]>(() => mockDatabase.getProcurementOverview().allItems);
  const [suppliers, setSuppliers] = useState<any[]>(() => mockDatabase.getProcurementOverview().suppliers);
  const [purchaseRequisitions, setPurchaseRequisitions] = useState<any[]>(() => mockDatabase.getProcurementOverview().purchaseRequisitions);
  const [consignmentStocks, setConsignmentStocks] = useState<any[]>(() => mockDatabase.getProcurementOverview().consignmentStocks);

  // Modal Durumu
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Canlı Reaktif Mock DB Dinleyicisi
  useEffect(() => {
    const handleDbChange = () => {
      const p = mockDatabase.getProcurementOverview();
      setStats(p.stats);
      setCriticalItems(p.criticalItems);
      setAllItems(p.allItems);
      setSuppliers(p.suppliers);
      setPurchaseRequisitions(p.purchaseRequisitions);
      setConsignmentStocks(p.consignmentStocks);
    };
    window.addEventListener('sunum-mockdb-change', handleDbChange);
    return () => window.removeEventListener('sunum-mockdb-change', handleDbChange);
  }, []);

  // Veritabanından verileri çek (API boş veya hata verirse mockDatabase'e zarifçe döner)
  const fetchProcurementData = useCallback(async (isSilent = false) => {
    try {
      if (!isSilent) setRefreshing(true);
      const res = await fetch('/api/procurement', { cache: 'no-store' });
      if (res.ok) {
        const data = await res.json();
        if (data.success && Array.isArray(data.criticalItems) && data.criticalItems.length > 0) {
          if (data.stats) setStats(data.stats);
          if (data.criticalItems) setCriticalItems(data.criticalItems);
          if (data.allItems) setAllItems(data.allItems);
          if (data.suppliers) setSuppliers(data.suppliers);
          if (data.purchaseRequisitions) setPurchaseRequisitions(data.purchaseRequisitions);
          if (data.consignmentStocks) setConsignmentStocks(data.consignmentStocks);
          return;
        }
      }
      // Demo Fallback
      const p = mockDatabase.getProcurementOverview();
      setStats(p.stats);
      setCriticalItems(p.criticalItems);
      setAllItems(p.allItems);
      setSuppliers(p.suppliers);
      setPurchaseRequisitions(p.purchaseRequisitions);
      setConsignmentStocks(p.consignmentStocks);
    } catch (err: any) {
      console.warn('Procurement fetch fallback to demo:', err);
      const p = mockDatabase.getProcurementOverview();
      setStats(p.stats);
      setCriticalItems(p.criticalItems);
      setAllItems(p.allItems);
      setSuppliers(p.suppliers);
      setPurchaseRequisitions(p.purchaseRequisitions);
      setConsignmentStocks(p.consignmentStocks);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchProcurementData(true);
  }, [fetchProcurementData]);

  const handleResetSeed = async () => {
    if (!confirm('Satın alma ve konsinye verilerini sıfırlayıp temiz örnek veriler yüklemek istiyor musunuz?')) {
      return;
    }

    try {
      setRefreshing(true);
      const res = await fetch('/api/procurement', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'seed_reset' })
      });
      const data = await res.json();
      if (data.success) {
        toast.success('Satın alma ve konsinye verileri başarıyla yüklendi');
        fetchProcurementData();
      } else {
        mockDatabase.resetToDefault();
        toast.success('Satın alma demo verileri sıfırlandı');
      }
    } catch {
      mockDatabase.resetToDefault();
      toast.success('Satın alma demo verileri sıfırlandı');
    } finally {
      setRefreshing(false);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[500px] space-y-4 bg-[#111513]/90 border border-white/[0.06] rounded-[20px] m-6">
        <RefreshCw className="w-8 h-8 text-[#34D399] animate-spin" />
        <p className="text-sm font-medium text-zinc-400">
          Akıllı Satın Alma ve ROP Motoru Yükleniyor...
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* 0. STOK VE DEPO YÖNETİMİ BİRLEŞİK ÜST SEKME / NAVİGASYON */}
      <InventoryModuleNav />

      {/* 1. ÜST ÖZET KARTLAR VE HIZLI AKSİYONLAR (KUTUSUZ BORDERLESS STRIP) */}
      <ProcurementSummaryCards
        stats={stats}
        onNewRequisitionClick={() => setIsModalOpen(true)}
        onRefresh={() => fetchProcurementData()}
      />

      {/* Durum & Araç Çubuğu */}
      <div className="flex items-center justify-between text-xs text-zinc-400 bg-[#111513]/90 border border-white/[0.06] px-4 py-2.5 rounded-xl">
        <div className="flex items-center gap-2">
          <span className="inline-block w-2 h-2 rounded-full bg-[#34D399] animate-ping" />
          <span className="text-zinc-300">Prisma / PostgreSQL Otomatik ROP Motoru Aktif</span>
          {refreshing && (
            <span className="text-[#34D399] font-medium flex items-center gap-1">
              <RefreshCw className="w-3 h-3 animate-spin" /> Güncelleniyor...
            </span>
          )}
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => fetchProcurementData()}
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
        <TabsList className="grid grid-cols-1 sm:grid-cols-3 bg-[#111513]/90 border border-white/[0.06] p-1.5 rounded-2xl h-auto">
          <TabsTrigger
            value="critical-rop"
            className="flex items-center gap-2 py-2.5 px-4 rounded-xl text-xs sm:text-sm font-medium text-zinc-400 hover:text-white transition data-[state=active]:bg-white/[0.08] data-[state=active]:text-white data-[state=active]:border data-[state=active]:border-white/[0.1] data-[state=active]:shadow-sm"
          >
            <AlertTriangle className="w-4 h-4 text-amber-400" />
            Kritik Stok & ROP Listesi ({criticalItems.length})
          </TabsTrigger>

          <TabsTrigger
            value="requisitions"
            className="flex items-center gap-2 py-2.5 px-4 rounded-xl text-xs sm:text-sm font-medium text-zinc-400 hover:text-white transition data-[state=active]:bg-white/[0.08] data-[state=active]:text-white data-[state=active]:border data-[state=active]:border-white/[0.1] data-[state=active]:shadow-sm"
          >
            <FileCheck2 className="w-4 h-4 text-[#34D399]" />
            Satın Alma Talepleri (PO) ({purchaseRequisitions.length})
          </TabsTrigger>

          <TabsTrigger
            value="consignment"
            className="flex items-center gap-2 py-2.5 px-4 rounded-xl text-xs sm:text-sm font-medium text-zinc-400 hover:text-white transition data-[state=active]:bg-white/[0.08] data-[state=active]:text-white data-[state=active]:border data-[state=active]:border-white/[0.1] data-[state=active]:shadow-sm"
          >
            <Handshake className="w-4 h-4 text-zinc-300" />
            Konsinye (Emanet) Stoklar ({consignmentStocks.length})
          </TabsTrigger>
        </TabsList>

        {/* SEKME 1: KRİTİK STOK VE ROP */}
        <TabsContent value="critical-rop" className="focus-visible:outline-none">
          <CriticalStockRopTable
            items={criticalItems}
            suppliers={suppliers}
            onOrderCreated={() => fetchProcurementData(true)}
          />
        </TabsContent>

        {/* SEKME 2: SATIN ALMA TALEPLERİ */}
        <TabsContent value="requisitions" className="focus-visible:outline-none">
          <PurchaseRequisitionsList
            requisitions={purchaseRequisitions}
            onUpdated={() => fetchProcurementData(true)}
          />
        </TabsContent>

        {/* SEKME 3: KONSİNYE STOKLAR */}
        <TabsContent value="consignment" className="focus-visible:outline-none">
          <ConsignmentStockManager
            consignmentStocks={consignmentStocks}
            onUpdated={() => fetchProcurementData(true)}
          />
        </TabsContent>
      </Tabs>

      {/* YENİ SATIN ALMA TALEBİ OLUŞTURMA MODALI */}
      <CreateRequisitionModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        suppliers={suppliers}
        items={allItems.length > 0 ? allItems : criticalItems}
        onCreated={() => fetchProcurementData(true)}
      />
    </div>
  );
}
