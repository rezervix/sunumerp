'use client';

import React, { useState, useEffect, useCallback } from 'react';
import {
  Globe,
  ShoppingBag,
  RotateCcw,
  Truck,
  FileText,
  RefreshCw,
  RotateCcw as ResetIcon,
  Server
} from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from 'sonner';

import { OmnichannelSummaryCards } from './components/OmnichannelSummaryCards';
import { OmnichannelOrdersManager } from './components/OmnichannelOrdersManager';
import { RmaReturnManager } from './components/RmaReturnManager';
import { SalesChannelsAndLogistics } from './components/SalesChannelsAndLogistics';
import { EDocumentViewer } from './components/EDocumentViewer';
import { InventoryModuleNav } from '../stok/components/InventoryModuleNav';

export default function OmnichannelLogisticsAndEDocumentPage() {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [activeTab, setActiveTab] = useState('orders');

  // Backend Veri Durumları
  const [stats, setStats] = useState({
    connectedChannelsCount: 0,
    totalDailyOrders: 0,
    totalDailyRevenue: 0,
    pendingRmaCount: 0,
    activeShipmentsCount: 0,
    averageSlaPercent: 0,
    totalPublishedStock: 0
  });
  const [channels, setChannels] = useState<any[]>([]);
  const [orders, setOrders] = useState<any[]>([]);
  const [rmaReturns, setRmaReturns] = useState<any[]>([]);
  const [logisticsAdapters, setLogisticsAdapters] = useState<any[]>([]);
  const [eDocuments, setEDocuments] = useState<any[]>([]);

  // Modal Durumu
  const [isEdocModalOpen, setIsEdocModalOpen] = useState(false);

  // Veritabanından Omnichannel Verilerini Çek
  const fetchOmnichannelData = useCallback(async (isSilent = false) => {
    try {
      if (!isSilent) setRefreshing(true);
      const res = await fetch('/api/omnichannel', { cache: 'no-store' });
      const data = await res.json();

      if (data.success) {
        if (data.stats) setStats(data.stats);
        if (data.channels) setChannels(data.channels);
        if (data.orders) setOrders(data.orders);
        if (data.rmaReturns) setRmaReturns(data.rmaReturns);
        if (data.logisticsAdapters) setLogisticsAdapters(data.logisticsAdapters);
        if (data.eDocuments) setEDocuments(data.eDocuments);
      } else {
        toast.error(data.error || 'Omnichannel verileri yüklenemedi');
      }
    } catch (err: any) {
      console.error('Omnichannel fetch error:', err);
      toast.error('Sunucu bağlantı hatası oluştu');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchOmnichannelData();
  }, [fetchOmnichannelData]);

  // Tüm Satış Kanallarını Canlı Senkronize Et
  const handleSyncAllChannels = async () => {
    try {
      setIsSyncing(true);
      const res = await fetch('/api/omnichannel', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'sync_all_channels' })
      });
      const data = await res.json();
      if (data.success) {
        toast.success(
          data.message || 'Tüm satış kanallarında (Pazaryerlerinde) stoklar eşitlendi!'
        );
        fetchOmnichannelData(true);
      } else {
        toast.error(data.error || 'Senkronizasyon başarısız');
      }
    } catch (err: any) {
      toast.error('Hata oluştu');
    } finally {
      setIsSyncing(false);
    }
  };

  // Örnek Verileri Sıfırla / Seed Et
  const handleResetSeed = async () => {
    if (!confirm('Omnichannel sipariş ve kanal verilerini sıfırlayıp temiz örnek veri yüklemek istiyor musunuz?')) {
      return;
    }

    try {
      setRefreshing(true);
      const res = await fetch('/api/omnichannel', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'seed_reset' })
      });
      const data = await res.json();
      if (data.success) {
        toast.success('Omnichannel verileri başarıyla yüklendi');
        fetchOmnichannelData();
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
        <RefreshCw className="w-8 h-8 text-emerald-400 animate-spin" />
        <p className="text-sm font-medium text-zinc-400">
          Omnichannel Satış ve Lojistik Motoru Yükleniyor...
        </p>
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-[1600px] mx-auto">
      {/* 0. STOK VE DEPO YÖNETİMİ BİRLEŞİK ÜST SEKME / NAVİGASYON */}
      <InventoryModuleNav />

      {/* 1. ÜST ÖZET KARTLAR VE HIZLI AKSİYONLAR */}
      <OmnichannelSummaryCards
        stats={stats}
        isSyncing={isSyncing}
        onSyncAll={handleSyncAllChannels}
        onNewEDocumentClick={() => setIsEdocModalOpen(true)}
      />

      {/* Durum & Araç Çubuğu */}
      <div className="flex items-center justify-between text-xs text-zinc-400 bg-[#111513]/90 border border-white/[0.06] px-4 py-2.5 rounded-[20px]">
        <div className="flex items-center gap-2">
          <span className="inline-block w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
          <span className="text-zinc-300">Prisma / PostgreSQL Bağlantısı Aktif</span>
          {refreshing && (
            <span className="text-emerald-400 font-medium flex items-center gap-1">
              <RefreshCw className="w-3 h-3 animate-spin" /> Güncelleniyor...
            </span>
          )}
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => fetchOmnichannelData()}
            className="flex items-center gap-1.5 text-zinc-400 hover:text-emerald-400 transition"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            Yenile
          </button>
          <span className="text-white/10">•</span>
          <button
            onClick={handleResetSeed}
            className="flex items-center gap-1.5 text-zinc-400 hover:text-rose-400 transition"
          >
            <ResetIcon className="w-3.5 h-3.5" />
            Örnek Verileri Sıfırla
          </button>
        </div>
      </div>

      {/* 2. MODÜLER TAB YAPISI */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid grid-cols-2 lg:grid-cols-4 bg-[#111513]/90 border border-white/[0.06] p-1.5 rounded-[20px] h-auto">
          <TabsTrigger
            value="orders"
            className="flex items-center gap-2 py-2.5 px-4 rounded-xl text-xs sm:text-sm font-medium text-zinc-400 hover:text-white transition data-[state=active]:bg-white/10 data-[state=active]:text-white data-[state=active]:shadow-sm"
          >
            <ShoppingBag className="w-4 h-4 text-emerald-400" />
            Sipariş Karşılama ({orders.length})
          </TabsTrigger>

          <TabsTrigger
            value="rma"
            className="flex items-center gap-2 py-2.5 px-4 rounded-xl text-xs sm:text-sm font-medium text-zinc-400 hover:text-white transition data-[state=active]:bg-white/10 data-[state=active]:text-white data-[state=active]:shadow-sm"
          >
            <RotateCcw className="w-4 h-4 text-emerald-400" />
            İade & RMA Muayenesi ({rmaReturns.length})
          </TabsTrigger>

          <TabsTrigger
            value="channels"
            className="flex items-center gap-2 py-2.5 px-4 rounded-xl text-xs sm:text-sm font-medium text-zinc-400 hover:text-white transition data-[state=active]:bg-white/10 data-[state=active]:text-white data-[state=active]:shadow-sm"
          >
            <Globe className="w-4 h-4 text-emerald-400" />
            Pazaryerleri & Webhook ({channels.length})
          </TabsTrigger>

          <TabsTrigger
            value="edoc"
            className="flex items-center gap-2 py-2.5 px-4 rounded-xl text-xs sm:text-sm font-medium text-zinc-400 hover:text-white transition data-[state=active]:bg-white/10 data-[state=active]:text-white data-[state=active]:shadow-sm"
          >
            <FileText className="w-4 h-4 text-emerald-400" />
            GİB E-İrsaliye & Fatura ({eDocuments.length})
          </TabsTrigger>
        </TabsList>

        {/* SEKME 1: SİPARİŞ KARŞILAMA VE PARÇALI SEVKİYAT */}
        <TabsContent value="orders" className="focus-visible:outline-none">
          <OmnichannelOrdersManager
            orders={orders}
            onOrderUpdated={() => fetchOmnichannelData(true)}
          />
        </TabsContent>

        {/* SEKME 2: RMA İADE MUAYENESİ */}
        <TabsContent value="rma" className="focus-visible:outline-none">
          <RmaReturnManager
            rmaReturns={rmaReturns}
            onUpdated={() => fetchOmnichannelData(true)}
          />
        </TabsContent>

        {/* SEKME 3: PAZARYERLERİ, WEBHOOK VE LOJİSTİK */}
        <TabsContent value="channels" className="focus-visible:outline-none">
          <SalesChannelsAndLogistics
            channels={channels}
            logisticsAdapters={logisticsAdapters}
          />
        </TabsContent>

        {/* SEKME 4: GİB E-BELGE SİSTEMİ */}
        <TabsContent value="edoc" className="focus-visible:outline-none">
          <EDocumentViewer
            eDocuments={eDocuments}
            isNewModalOpen={isEdocModalOpen}
            onCloseNewModal={() => setIsEdocModalOpen(false)}
            onCreated={() => fetchOmnichannelData(true)}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}
