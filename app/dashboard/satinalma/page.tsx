'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  AlertTriangle,
  FileCheck2,
  Handshake,
  RefreshCw,
  RotateCcw,
  Building2,
  Scale,
  ClipboardCheck,
  Truck,
  ShieldAlert
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
import SupplierMasterScorecardTab from './components/SupplierMasterScorecardTab';
import RfqComparisonTab from './components/RfqComparisonTab';
import { MultiTierPoTab, EoqSuggestionsPanel } from './components/MultiTierPoAndEoqTab';
import { AsnTrackingTab, SingleSourceRiskTab } from './components/AsnAndRiskTabs';
import { ErpPerspectiveSwitchButton } from '@/components/demo/SupplierPortalDemoComponents';
import { safeNumber } from '@/lib/utils/safe-display';

const EMPTY_PROCUREMENT_STATS = {
  totalCriticalItems: 0,
  stockoutItems: 0,
  belowRopItems: 0,
  pendingPrCount: 0,
  pendingPrTotalAmount: 0,
  totalConsignmentValue: 0,
  unbilledConsignmentPayable: 0,
  activeSupplierCount: 0,
};

export default function SmartProcurementAndConsignmentPage() {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState('critical-rop');
  const [demoMode, setDemoMode] = useState(false);
  const demoModeRef = useRef<boolean | null>(null);

  // Backend Veri Durumları — gerçek DB verisi gelene kadar boş başlar
  const [stats, setStats] = useState(EMPTY_PROCUREMENT_STATS);
  const [criticalItems, setCriticalItems] = useState<any[]>([]);
  const [allItems, setAllItems] = useState<any[]>([]);
  const [suppliers, setSuppliers] = useState<any[]>([]);
  const [purchaseRequisitions, setPurchaseRequisitions] = useState<any[]>([]);
  const [consignmentStocks, setConsignmentStocks] = useState<any[]>([]);

  // Lojistik Faz 3: Tedarikçi Ana Kart, RFQ, Çok Kademeli PO, ASN, EOQ & Risk Verileri
  const [rfqs, setRfqs] = useState<any[]>([]);
  const [purchaseOrders, setPurchaseOrders] = useState<any[]>([]);
  const [asns, setAsns] = useState<any[]>([]);
  const [scorecards, setScorecards] = useState<any>(null);
  const [singleSourceRisk, setSingleSourceRisk] = useState<any>(null);
  const [eoqPolicies, setEoqPolicies] = useState<any[]>([]);
  const [documents, setDocuments] = useState<any[]>([]);
  const [invites, setInvites] = useState<any[]>([]);
  const [warehouses, setWarehouses] = useState<any[]>([]);
  const [faz3Summary, setFaz3Summary] = useState<any>(null);

  // Modal Durumu
  const [isModalOpen, setIsModalOpen] = useState(false);

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
      // Demo durumu çözülemezse güvenli varsayılan kapalı
    }
    demoModeRef.current = false;
    return false;
  }, []);

  // Canlı Reaktif Mock DB Dinleyicisi (yalnızca demo modunda)
  useEffect(() => {
    const handleDbChange = () => {
      if (demoModeRef.current !== true) return;
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

  // Veritabanından verileri çek (Demo fallback yalnızca demo modunda geçerlidir)
  const fetchProcurementData = useCallback(async (isSilent = false) => {
    try {
      if (!isSilent) setRefreshing(true);
      const res = await fetch('/api/procurement', { cache: 'no-store' });
      if (res.ok) {
        const data = await res.json();
        if (data.success) {
          if (data.stats) setStats(data.stats);
          if (Array.isArray(data.criticalItems)) setCriticalItems(data.criticalItems);
          if (Array.isArray(data.allItems)) setAllItems(data.allItems);
          if (Array.isArray(data.suppliers)) setSuppliers(data.suppliers);
          if (Array.isArray(data.purchaseRequisitions)) setPurchaseRequisitions(data.purchaseRequisitions);
          if (Array.isArray(data.consignmentStocks)) setConsignmentStocks(data.consignmentStocks);
          if (Array.isArray(data.rfqs)) setRfqs(data.rfqs);
          if (Array.isArray(data.purchaseOrders)) setPurchaseOrders(data.purchaseOrders);
          if (Array.isArray(data.asns)) setAsns(data.asns);
          if (data.scorecards) setScorecards(data.scorecards);
          if (data.singleSourceRisk) setSingleSourceRisk(data.singleSourceRisk);
          if (Array.isArray(data.eoqPolicies)) setEoqPolicies(data.eoqPolicies);
          if (Array.isArray(data.documents)) setDocuments(data.documents);
          if (Array.isArray(data.invites)) setInvites(data.invites);
          if (Array.isArray(data.warehouses)) setWarehouses(data.warehouses);
          if (data.faz3Summary) setFaz3Summary(data.faz3Summary);
          return;
        }
      }
      if (res.status !== 401 && res.status !== 403 && (await resolveDemoMode())) {
        const p = mockDatabase.getProcurementOverview();
        setStats(p.stats);
        setCriticalItems(p.criticalItems);
        setAllItems(p.allItems);
        setSuppliers(p.suppliers);
        setPurchaseRequisitions(p.purchaseRequisitions);
        setConsignmentStocks(p.consignmentStocks);
      }
    } catch (err: any) {
      if (await resolveDemoMode()) {
        console.warn('Procurement fetch fallback to demo:', err);
        const p = mockDatabase.getProcurementOverview();
        setStats(p.stats);
        setCriticalItems(p.criticalItems);
        setAllItems(p.allItems);
        setSuppliers(p.suppliers);
        setPurchaseRequisitions(p.purchaseRequisitions);
        setConsignmentStocks(p.consignmentStocks);
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [resolveDemoMode]);

  useEffect(() => {
    resolveDemoMode();
    fetchProcurementData(true);
  }, [fetchProcurementData, resolveDemoMode]);

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
      } else if (await resolveDemoMode()) {
        mockDatabase.resetToDefault();
        toast.success('Satın alma demo verileri sıfırlandı');
      } else {
        toast.error(data.error || 'Bu işlem yalnızca demo ortamında kullanılabilir.');
      }
    } catch {
      if (await resolveDemoMode()) {
        mockDatabase.resetToDefault();
        toast.success('Satın alma demo verileri sıfırlandı');
      } else {
        toast.error('Satın alma sıfırlama işlemi başarısız.');
      }
    } finally {
      setRefreshing(false);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[500px] space-y-4 bg-white/80 backdrop-blur-xl border border-[--line] rounded-[20px] m-6">
        <RefreshCw className="w-8 h-8 text-[--brand] animate-spin" />
        <p className="text-sm font-medium text-[--text-muted]">
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
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap items-center gap-2 text-[11px] text-[--text-muted]">
          {faz3Summary && (
            <>
              <span className="px-2.5 py-1 rounded-lg border border-[--line] bg-white">
                Onaylı Tedarikçi: <strong className="text-[--brand]">{safeNumber(faz3Summary.approvedSuppliers)}/{safeNumber(faz3Summary.totalSuppliers)}</strong>
              </span>
              <span className="px-2.5 py-1 rounded-lg border border-[--line] bg-white">
                Onay Bekleyen PO: <strong className="text-[--warn]">{safeNumber(faz3Summary.pendingApprovalPoCount)}</strong>
              </span>
              <span className="px-2.5 py-1 rounded-lg border border-[--line] bg-white">
                Açık RFQ: <strong className="text-[--brand]">{safeNumber(faz3Summary.openRfqCount)}</strong>
              </span>
              <span className="px-2.5 py-1 rounded-lg border border-[--line] bg-white">
                Açık ASN: <strong className="text-[--text]">{safeNumber(faz3Summary.openAsnCount)}</strong>
              </span>
              <span className="px-2.5 py-1 rounded-lg border border-[--line] bg-white">
                Ort. Skor Kartı: <strong className="text-[--ok]">{safeNumber(faz3Summary.avgSupplierScore)}</strong>
              </span>
              {safeNumber(faz3Summary.redFlagPoCount) > 0 && (
                <span className="px-2.5 py-1 rounded-lg border border-[--bad]/25 bg-[--bad-soft] text-[--bad] font-semibold">
                  {faz3Summary.redFlagPoCount} Kırmızı Bayrak PO
                </span>
              )}
            </>
          )}
        </div>
        <ErpPerspectiveSwitchButton />
      </div>

      <ProcurementSummaryCards
        stats={stats}
        onNewRequisitionClick={() => setIsModalOpen(true)}
        onRefresh={() => fetchProcurementData()}
      />

      {/* Durum & Araç Çubuğu */}
      <div className="flex items-center justify-between text-xs text-[--text-muted] bg-white/80 backdrop-blur-xl border border-[--line] px-4 py-2.5 rounded-xl shadow-sm">
        <div className="flex items-center gap-2">
          <span className="inline-block w-2 h-2 rounded-full bg-[--ok] animate-ping" />
          <span className="text-[--text]">Prisma / PostgreSQL Otomatik ROP Motoru Aktif</span>
          {refreshing && (
            <span className="text-[--brand] font-medium flex items-center gap-1">
              <RefreshCw className="w-3 h-3 animate-spin" /> Güncelleniyor...
            </span>
          )}
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => fetchProcurementData()}
            className="flex items-center gap-1.5 text-[--text-muted] hover:text-[--text] transition cursor-pointer"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            Yenile
          </button>
          {demoMode && (
            <>
              <span className="text-[--line]">•</span>
              <button
                onClick={handleResetSeed}
                className="flex items-center gap-1.5 text-[--text-muted] hover:text-[--warn] transition cursor-pointer"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                Örnek Verileri Sıfırla
              </button>
            </>
          )}
        </div>
      </div>

      {/* 2. MODÜLER TAB YAPISI */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="flex flex-wrap gap-1.5 bg-white/80 backdrop-blur-xl border border-[--line] p-1.5 rounded-2xl h-auto shadow-sm">
          <TabsTrigger
            value="critical-rop"
            className="flex items-center gap-2 py-2 px-3.5 rounded-xl text-xs font-medium text-[--text-muted] hover:text-[--text] transition data-[state=active]:bg-[--brand-soft] data-[state=active]:text-[--brand] data-[state=active]:border data-[state=active]:border-[--brand-line] data-[state=active]:shadow-sm"
          >
            <AlertTriangle className="w-3.5 h-3.5 text-[--warn]" />
            Kritik Stok & EOQ/ROP ({criticalItems.length})
          </TabsTrigger>

          <TabsTrigger
            value="orders"
            className="flex items-center gap-2 py-2 px-3.5 rounded-xl text-xs font-medium text-[--text-muted] hover:text-[--text] transition data-[state=active]:bg-[--brand-soft] data-[state=active]:text-[--brand] data-[state=active]:border data-[state=active]:border-[--brand-line] data-[state=active]:shadow-sm"
          >
            <ClipboardCheck className="w-3.5 h-3.5 text-[--brand]" />
            Çok Kademeli PO ({purchaseOrders.length})
          </TabsTrigger>

          <TabsTrigger
            value="rfq"
            className="flex items-center gap-2 py-2 px-3.5 rounded-xl text-xs font-medium text-[--text-muted] hover:text-[--text] transition data-[state=active]:bg-[--brand-soft] data-[state=active]:text-[--brand] data-[state=active]:border data-[state=active]:border-[--brand-line] data-[state=active]:shadow-sm"
          >
            <Scale className="w-3.5 h-3.5 text-[--brand]" />
            RFQ & Teklif Kıyas ({rfqs.length})
          </TabsTrigger>

          <TabsTrigger
            value="asns"
            className="flex items-center gap-2 py-2 px-3.5 rounded-xl text-xs font-medium text-[--text-muted] hover:text-[--text] transition data-[state=active]:bg-[--brand-soft] data-[state=active]:text-[--brand] data-[state=active]:border data-[state=active]:border-[--brand-line] data-[state=active]:shadow-sm"
          >
            <Truck className="w-3.5 h-3.5 text-[--brand]" />
            ASN & EDI Sevkiyat ({asns.length})
          </TabsTrigger>

          <TabsTrigger
            value="suppliers"
            className="flex items-center gap-2 py-2 px-3.5 rounded-xl text-xs font-medium text-[--text-muted] hover:text-[--text] transition data-[state=active]:bg-[--brand-soft] data-[state=active]:text-[--brand] data-[state=active]:border data-[state=active]:border-[--brand-line] data-[state=active]:shadow-sm"
          >
            <Building2 className="w-3.5 h-3.5 text-[--brand]" />
            Tedarikçi & Skor Kartı ({suppliers.length})
          </TabsTrigger>

          <TabsTrigger
            value="single-source"
            className="flex items-center gap-2 py-2 px-3.5 rounded-xl text-xs font-medium text-[--text-muted] hover:text-[--text] transition data-[state=active]:bg-[--brand-soft] data-[state=active]:text-[--brand] data-[state=active]:border data-[state=active]:border-[--brand-line] data-[state=active]:shadow-sm"
          >
            <ShieldAlert className="w-3.5 h-3.5 text-[--warn]" />
            Tek-Kaynak Riski ({(singleSourceRisk?.riskItems || []).length})
          </TabsTrigger>

          <TabsTrigger
            value="requisitions"
            className="flex items-center gap-2 py-2 px-3.5 rounded-xl text-xs font-medium text-[--text-muted] hover:text-[--text] transition data-[state=active]:bg-[--brand-soft] data-[state=active]:text-[--brand] data-[state=active]:border data-[state=active]:border-[--brand-line] data-[state=active]:shadow-sm"
          >
            <FileCheck2 className="w-3.5 h-3.5 text-[--brand]" />
            Satın Alma Talepleri ({purchaseRequisitions.length})
          </TabsTrigger>

          <TabsTrigger
            value="consignment"
            className="flex items-center gap-2 py-2 px-3.5 rounded-xl text-xs font-medium text-[--text-muted] hover:text-[--text] transition data-[state=active]:bg-[--brand-soft] data-[state=active]:text-[--brand] data-[state=active]:border data-[state=active]:border-[--brand-line] data-[state=active]:shadow-sm"
          >
            <Handshake className="w-3.5 h-3.5 text-[--brand]" />
            Konsinye Stoklar ({consignmentStocks.length})
          </TabsTrigger>
        </TabsList>

        {/* SEKME 1: KRİTİK STOK VE EOQ/ROP */}
        <TabsContent value="critical-rop" className="focus-visible:outline-none space-y-5">
          <CriticalStockRopTable
            items={criticalItems}
            suppliers={suppliers}
            onOrderCreated={() => fetchProcurementData(true)}
          />
          {eoqPolicies.length > 0 && (
            <EoqSuggestionsPanel
              eoqPolicies={eoqPolicies}
              onRefresh={() => fetchProcurementData(true)}
              onNotify={(msg, isErr) => (isErr ? toast.error(msg) : toast.success(msg))}
            />
          )}
        </TabsContent>

        {/* SEKME 2: ÇOK KADEMELİ PO */}
        <TabsContent value="orders" className="focus-visible:outline-none">
          <MultiTierPoTab
            purchaseOrders={purchaseOrders}
            suppliers={suppliers}
            items={allItems.length > 0 ? allItems : criticalItems}
            warehouses={warehouses}
            onRefresh={() => fetchProcurementData(true)}
            onNotify={(msg, isErr) => (isErr ? toast.error(msg) : toast.success(msg))}
          />
        </TabsContent>

        {/* SEKME 3: RFQ VE TEKLİF KARŞILAŞTIRMA */}
        <TabsContent value="rfq" className="focus-visible:outline-none">
          <RfqComparisonTab
            rfqs={rfqs}
            suppliers={suppliers}
            items={allItems.length > 0 ? allItems : criticalItems}
            warehouses={warehouses}
            onRefresh={() => fetchProcurementData(true)}
            onNotify={(msg, isErr) => (isErr ? toast.error(msg) : toast.success(msg))}
          />
        </TabsContent>

        {/* SEKME 4: ASN VE EDI SEVKİYAT */}
        <TabsContent value="asns" className="focus-visible:outline-none">
          <AsnTrackingTab
            asns={asns}
            purchaseOrders={purchaseOrders}
            suppliers={suppliers}
            onRefresh={() => fetchProcurementData(true)}
            onNotify={(msg, isErr) => (isErr ? toast.error(msg) : toast.success(msg))}
          />
        </TabsContent>

        {/* SEKME 5: TEDARİKÇİ ANA KART VE SKOR KARTI */}
        <TabsContent value="suppliers" className="focus-visible:outline-none">
          <SupplierMasterScorecardTab
            suppliers={suppliers}
            scorecards={scorecards}
            documents={documents}
            invites={invites}
            items={allItems.length > 0 ? allItems : criticalItems}
            onRefresh={() => fetchProcurementData(true)}
            onNotify={(msg, isErr) => (isErr ? toast.error(msg) : toast.success(msg))}
          />
        </TabsContent>

        {/* SEKME 6: TEK-KAYNAK RİSK ANALİZİ */}
        <TabsContent value="single-source" className="focus-visible:outline-none">
          <SingleSourceRiskTab
            singleSourceRisk={singleSourceRisk}
            onRefresh={() => fetchProcurementData(true)}
            onNotify={(msg, isErr) => (isErr ? toast.error(msg) : toast.success(msg))}
          />
        </TabsContent>

        {/* SEKME 7: SATIN ALMA TALEPLERİ (LEGACY UYUMLU) */}
        <TabsContent value="requisitions" className="focus-visible:outline-none">
          <PurchaseRequisitionsList
            requisitions={purchaseRequisitions}
            onUpdated={() => fetchProcurementData(true)}
          />
        </TabsContent>

        {/* SEKME 8: KONSİNYE STOKLAR (LEGACY UYUMLU) */}
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
