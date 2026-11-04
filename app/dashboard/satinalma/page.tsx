'use client';

import React, { useState, useEffect, useCallback } from 'react';
import {
  AlertTriangle,
  FileCheck2,
  Handshake,
  RefreshCw,
  RotateCcw,
  Sparkles
} from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from 'sonner';

import { ProcurementSummaryCards } from './components/ProcurementSummaryCards';
import { CriticalStockRopTable } from './components/CriticalStockRopTable';
import { PurchaseRequisitionsList } from './components/PurchaseRequisitionsList';
import { ConsignmentStockManager } from './components/ConsignmentStockManager';
import { CreateRequisitionModal } from './components/CreateRequisitionModal';
import { InventoryModuleNav } from '../stok/components/InventoryModuleNav';

export default function SmartProcurementAndConsignmentPage() {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState('critical-rop');

  // Backend Veri Durumları
  const [stats, setStats] = useState({
    totalCriticalItems: 0,
    stockoutItems: 0,
    belowRopItems: 0,
    pendingPrCount: 0,
    pendingPrTotalAmount: 0,
    totalConsignmentValue: 0,
    unbilledConsignmentPayable: 0,
    activeSupplierCount: 0
  });
  const [criticalItems, setCriticalItems] = useState<any[]>([]);
  const [allItems, setAllItems] = useState<any[]>([]);
  const [suppliers, setSuppliers] = useState<any[]>([]);
  const [purchaseRequisitions, setPurchaseRequisitions] = useState<any[]>([]);
  const [consignmentStocks, setConsignmentStocks] = useState<any[]>([]);

  // Modal Durumu
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Veritabanından verileri çek
  const fetchProcurementData = useCallback(async (isSilent = false) => {
    try {
      if (!isSilent) setRefreshing(true);
      const res = await fetch('/api/procurement', { cache: 'no-store' });
      const data = await res.json();

      if (data.success) {
        if (data.stats) setStats(data.stats);
        if (data.criticalItems) setCriticalItems(data.criticalItems);
        if (data.allItems) setAllItems(data.allItems);
        if (data.suppliers) setSuppliers(data.suppliers);
        if (data.purchaseRequisitions) setPurchaseRequisitions(data.purchaseRequisitions);
        if (data.consignmentStocks) setConsignmentStocks(data.consignmentStocks);
      } else {
        toast.error(data.error || 'Satın alma verileri yüklenemedi');
      }
    } catch (err: any) {
      console.error('Procurement fetch error:', err);
      toast.error('Satın alma sunucu bağlantısında hata oluştu');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchProcurementData();
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
      <div className="flex flex-col items-center justify-center min-h-[500px] space-y-4">
        <RefreshCw className="w-8 h-8 text-indigo-600 animate-spin" />
        <p className="text-sm font-medium text-slate-600 dark:text-slate-400">
          Akıllı Satın Alma ve ROP Motoru Yükleniyor...
        </p>
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-[1600px] mx-auto">
      {/* 0. STOK VE DEPO YÖNETİMİ BİRLEŞİK ÜST SEKME / NAVİGASYON */}
      <InventoryModuleNav />

      {/* 1. ÜST ÖZET KARTLAR VE HIZLI AKSİYONLAR */}
      <ProcurementSummaryCards
        stats={stats}
        onNewRequisitionClick={() => setIsModalOpen(true)}
        onRefresh={() => fetchProcurementData()}
      />

      {/* Durum & Araç Çubuğu */}
      <div className="flex items-center justify-between text-xs text-slate-500">
        <div className="flex items-center gap-2">
          <span className="inline-block w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
          <span>Prisma / PostgreSQL Bağlantısı Aktif</span>
          {refreshing && (
            <span className="text-indigo-600 font-medium flex items-center gap-1">
              <RefreshCw className="w-3 h-3 animate-spin" /> Güncelleniyor...
            </span>
          )}
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => fetchProcurementData()}
            className="flex items-center gap-1 hover:text-indigo-600 transition"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            Yenile
          </button>
          <span>•</span>
          <button
            onClick={handleResetSeed}
            className="flex items-center gap-1 hover:text-amber-600 transition"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            Örnek Verileri Sıfırla
          </button>
        </div>
      </div>

      {/* 2. MODÜLER TAB YAPISI */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid grid-cols-3 bg-slate-100 dark:bg-slate-800/80 p-1 rounded-2xl h-auto border border-slate-200/80 dark:border-slate-800">
          <TabsTrigger
            value="critical-rop"
            className="flex items-center gap-2 py-3 px-4 rounded-xl text-xs sm:text-sm font-semibold transition data-[state=active]:bg-white dark:data-[state=active]:bg-slate-900 data-[state=active]:text-indigo-600 data-[state=active]:shadow-sm"
          >
            <AlertTriangle className="w-4 h-4 text-amber-500" />
            Kritik Stok & ROP Listesi ({criticalItems.length})
          </TabsTrigger>

          <TabsTrigger
            value="requisitions"
            className="flex items-center gap-2 py-3 px-4 rounded-xl text-xs sm:text-sm font-semibold transition data-[state=active]:bg-white dark:data-[state=active]:bg-slate-900 data-[state=active]:text-indigo-600 data-[state=active]:shadow-sm"
          >
            <FileCheck2 className="w-4 h-4 text-indigo-600" />
            Satın Alma Talepleri (PR / PO) ({purchaseRequisitions.length})
          </TabsTrigger>

          <TabsTrigger
            value="consignment"
            className="flex items-center gap-2 py-3 px-4 rounded-xl text-xs sm:text-sm font-semibold transition data-[state=active]:bg-white dark:data-[state=active]:bg-slate-900 data-[state=active]:text-indigo-600 data-[state=active]:shadow-sm"
          >
            <Handshake className="w-4 h-4 text-blue-600" />
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
