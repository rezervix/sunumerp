'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  Globe,
  ShoppingBag,
  RotateCcw,
  Truck,
  FileText,
  RefreshCw,
  RotateCcw as ResetIcon
} from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from 'sonner';

import { OmnichannelSummaryCards } from './components/OmnichannelSummaryCards';
import { OmnichannelOrdersManager } from './components/OmnichannelOrdersManager';
import { RmaReturnManager } from './components/RmaReturnManager';
import { SalesChannelsAndLogistics } from './components/SalesChannelsAndLogistics';
import { EDocumentViewer } from './components/EDocumentViewer';
import { InventoryModuleNav } from '../stok/components/InventoryModuleNav';
import { mockDatabase } from '@/lib/data/mockDatabase';

const EMPTY_OMNICHANNEL_STATS = {
  connectedChannelsCount: 0,
  totalDailyOrders: 0,
  totalDailyRevenue: 0,
  pendingRmaCount: 0,
  activeShipmentsCount: 0,
  averageSlaPercent: 0,
  totalPublishedStock: 0,
};

export default function OmnichannelLogisticsAndEDocumentPage() {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [activeTab, setActiveTab] = useState('orders');
  const demoModeRef = useRef<boolean | null>(null);

  // Backend Veri Durumları — gerçek DB verisi gelene kadar boş başlar
  const [stats, setStats] = useState(EMPTY_OMNICHANNEL_STATS);
  const [channels, setChannels] = useState<any[]>([]);
  const [orders, setOrders] = useState<any[]>([]);
  const [rmaReturns, setRmaReturns] = useState<any[]>([]);
  const [logisticsAdapters, setLogisticsAdapters] = useState<any[]>([]);
  const [eDocuments, setEDocuments] = useState<any[]>([]);
  const [storageBins, setStorageBins] = useState<any[]>([]);
  const [suppliers, setSuppliers] = useState<any[]>([]);
  const [items, setItems] = useState<any[]>([]);
  const [returnPolicies, setReturnPolicies] = useState<any[]>([]);
  const [returnCreditNotes, setReturnCreditNotes] = useState<any[]>([]);
  const [returnWebhookLogs, setReturnWebhookLogs] = useState<any[]>([]);
  const [returnAnalytics, setReturnAnalytics] = useState<any>(null);
  const [eligibleReturnOrders, setEligibleReturnOrders] = useState<any[]>([]);
  const [logisticsDemoMode, setLogisticsDemoMode] = useState<boolean>(false);
  const [lojistikIadeEnabled, setLojistikIadeEnabled] = useState<boolean>(true);
  const [initialRmaOrder, setInitialRmaOrder] = useState<string | undefined>(undefined);

  const resolveDemoMode = useCallback(async () => {
    if (demoModeRef.current !== null) return demoModeRef.current;
    try {
      const cfgRes = await fetch('/api/system-config');
      if (cfgRes.ok) {
        const cfg = await cfgRes.json();
        const isDemo = Boolean(cfg?.logisticsDemoMode);
        demoModeRef.current = isDemo;
        setLogisticsDemoMode(isDemo);
        return isDemo;
      }
    } catch {
      // Demo durumu okunamazsa kapalı kabul edilir
    }
    demoModeRef.current = false;
    return false;
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const sp = new URLSearchParams(window.location.search);
    const tabParam = sp.get('tab');
    const rmaOrderParam = sp.get('rmaOrder');
    if (tabParam && ['orders', 'rma', 'channels', 'edoc'].includes(tabParam)) {
      setActiveTab(tabParam);
    }
    if (rmaOrderParam) {
      setActiveTab('rma');
      setInitialRmaOrder(rmaOrderParam);
    }
  }, []);

  // Modal Durumu
  const [isEdocModalOpen, setIsEdocModalOpen] = useState(false);

  // Canlı Reaktif Mock DB Dinleyicisi (yalnızca demo modunda)
  useEffect(() => {
    const handleDbChange = () => {
      if (demoModeRef.current !== true) return;
      const o = mockDatabase.getOmnichannelOverview();
      setStats(o.stats);
      setChannels(o.channels);
      setOrders(o.orders);
      setRmaReturns(o.rmaReturns);
      setLogisticsAdapters(o.logisticsAdapters);
      setEDocuments(o.eDocuments);
    };
    window.addEventListener('sunum-mockdb-change', handleDbChange);
    return () => window.removeEventListener('sunum-mockdb-change', handleDbChange);
  }, []);

  // Veritabanından Omnichannel Verilerini Çek (Demo fallback yalnız demo modunda geçerlidir)
  const fetchOmnichannelData = useCallback(async (isSilent = false) => {
    try {
      if (!isSilent) setRefreshing(true);
      const res = await fetch('/api/omnichannel', { cache: 'no-store' });
      if (res.ok) {
        const data = await res.json();
        if (data.success && Array.isArray(data.orders)) {
          if (data.stats) setStats(data.stats);
          if (data.channels) setChannels(data.channels);
          if (data.orders) setOrders(data.orders);
          if (data.rmaReturns) setRmaReturns(data.rmaReturns);
          if (data.logisticsAdapters) setLogisticsAdapters(data.logisticsAdapters);
          if (data.eDocuments) setEDocuments(data.eDocuments);
          if (Array.isArray(data.storageBins)) setStorageBins(data.storageBins);
          if (Array.isArray(data.suppliers)) setSuppliers(data.suppliers);
          if (Array.isArray(data.items)) setItems(data.items);
          if (Array.isArray(data.returnPolicies)) setReturnPolicies(data.returnPolicies);
          if (Array.isArray(data.returnCreditNotes)) setReturnCreditNotes(data.returnCreditNotes);
          if (Array.isArray(data.returnWebhookLogs)) setReturnWebhookLogs(data.returnWebhookLogs);
          if (data.returnAnalytics !== undefined) setReturnAnalytics(data.returnAnalytics);
          if (Array.isArray(data.eligibleReturnOrders)) setEligibleReturnOrders(data.eligibleReturnOrders);
          if (data.featureFlags) {
            if (typeof data.featureFlags.logisticsDemoMode === 'boolean') {
              demoModeRef.current = data.featureFlags.logisticsDemoMode;
              setLogisticsDemoMode(data.featureFlags.logisticsDemoMode);
            }
            if (typeof data.featureFlags.lojistik_iade === 'boolean') {
              setLojistikIadeEnabled(data.featureFlags.lojistik_iade);
            }
          }
          return;
        }
      }
      if (res.status !== 401 && res.status !== 403 && (await resolveDemoMode())) {
        const o = mockDatabase.getOmnichannelOverview();
        setStats(o.stats);
        setChannels(o.channels);
        setOrders(o.orders);
        setRmaReturns(o.rmaReturns);
        setLogisticsAdapters(o.logisticsAdapters);
        setEDocuments(o.eDocuments);
      }
    } catch (err: any) {
      if (await resolveDemoMode()) {
        console.warn('Omnichannel fetch fallback to demo:', err);
        const o = mockDatabase.getOmnichannelOverview();
        setStats(o.stats);
        setChannels(o.channels);
        setOrders(o.orders);
        setRmaReturns(o.rmaReturns);
        setLogisticsAdapters(o.logisticsAdapters);
        setEDocuments(o.eDocuments);
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [resolveDemoMode]);

  useEffect(() => {
    resolveDemoMode();
    fetchOmnichannelData(true);
  }, [fetchOmnichannelData, resolveDemoMode]);

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
      } else if (await resolveDemoMode()) {
        mockDatabase.syncAllChannels();
        toast.success('Tüm satış kanallarında (Trendyol, Hepsiburada, Shopify) stoklar demo olarak eşitlendi!');
      } else {
        toast.error(data.error || 'Kanal senkronizasyonu yetkiniz yok veya oturum gerekiyor.');
      }
    } catch {
      if (await resolveDemoMode()) {
        mockDatabase.syncAllChannels();
        toast.success('Tüm satış kanallarında (Trendyol, Hepsiburada, Shopify) stoklar demo olarak eşitlendi!');
      } else {
        toast.error('Satış kanalı senkronizasyonu başarısız.');
      }
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
            storageBins={storageBins}
            suppliers={suppliers}
            items={items}
            returnPolicies={returnPolicies}
            returnCreditNotes={returnCreditNotes}
            returnWebhookLogs={returnWebhookLogs}
            returnAnalytics={returnAnalytics}
            eligibleReturnOrders={eligibleReturnOrders}
            logisticsDemoMode={logisticsDemoMode}
            lojistikIadeEnabled={lojistikIadeEnabled}
            initialOrderNumber={initialRmaOrder}
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
