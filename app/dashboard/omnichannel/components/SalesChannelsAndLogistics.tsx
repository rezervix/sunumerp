'use client';

import React, { useState } from 'react';
import {
  Globe,
  Truck,
  ShieldCheck,
  CheckCircle2,
  Key,
  Copy,
  Zap,
  ExternalLink,
  Save,
  Server
} from 'lucide-react';
import { toast } from 'sonner';

interface Channel {
  id: string;
  code: string;
  name: string;
  channelType: string;
  syncStatus: string;
  stockBufferPercent: number;
  minStockThreshold: number;
  syncedSkuCount: number;
  dailyOrderCount: number;
  dailyRevenue: number;
  webhookLatencyMs: number;
  lastSyncAt: string;
}

interface LogisticsAdapter {
  id: string;
  providerCode: string;
  providerName: string;
  adapterType: string;
  status: string;
  apiEndpoint: string;
  supportsZplLabel: boolean;
  supportsColdChain: boolean;
  avgDeliveryDays: number;
  baseRateTry: number;
  activeShipments: number;
  slaSuccessPercent: number;
}

interface Props {
  channels: Channel[];
  logisticsAdapters: LogisticsAdapter[];
}

export function SalesChannelsAndLogistics({
  channels,
  logisticsAdapters
}: Props) {
  const [apiKey, setApiKey] = useState('sunum_live_sec_8921a9df71c0');
  const [copied, setCopied] = useState(false);

  const webhookBaseUrl = typeof window !== 'undefined'
    ? `${window.location.origin}/api/webhooks/omnichannel`
    : '/api/webhooks/omnichannel';

  const handleCopyWebhook = (channelCode: string) => {
    const url = `${webhookBaseUrl}?channel=${channelCode.toLowerCase()}`;
    navigator.clipboard.writeText(url);
    toast.success(`${channelCode} Webhook URL panoya kopyalandı!`);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="space-y-6">
      {/* 1. BAĞLI SATIŞ KANALLARI KARTLARI */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5 shadow-sm space-y-4">
        <div>
          <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <Globe className="w-5 h-5 text-blue-600" />
            Aktif Satış Kanalları & Pazaryeri Entegrasyonları
          </h3>
          <p className="text-xs text-slate-500 mt-0.5">
            Canlı stok tamponu (% buffer), minimum eşik ve webhook gecikme süreleri
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {channels.map((ch) => (
            <div
              key={ch.id}
              className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-800/40 hover:bg-slate-50 transition space-y-3"
            >
              <div className="flex items-center justify-between">
                <span className="font-bold text-xs px-2.5 py-1 rounded-lg bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300 font-mono">
                  {ch.code}
                </span>
                <span className="flex items-center gap-1 text-[11px] font-semibold text-emerald-600">
                  <CheckCircle2 className="w-3.5 h-3.5" /> Bağlı
                </span>
              </div>

              <div>
                <div className="text-sm font-bold text-slate-900 dark:text-white truncate">
                  {ch.name}
                </div>
                <div className="text-xs text-slate-400 mt-0.5">
                  Senkronize Ürün: <strong>{ch.syncedSkuCount} SKU</strong>
                </div>
              </div>

              <div className="pt-2 border-t border-slate-200/60 dark:border-slate-700/60 space-y-1.5 text-xs">
                <div className="flex justify-between text-slate-500">
                  <span>Stok Güvenlik Tamponu:</span>
                  <strong className="text-slate-800 dark:text-slate-200">%{ch.stockBufferPercent}</strong>
                </div>
                <div className="flex justify-between text-slate-500">
                  <span>Webhook Gecikmesi:</span>
                  <strong className="text-emerald-600 font-mono">{ch.webhookLatencyMs}ms</strong>
                </div>
                <div className="flex justify-between text-slate-500">
                  <span>Günlük Sipariş / Ciro:</span>
                  <strong className="text-slate-800 dark:text-slate-200">
                    {ch.dailyOrderCount} adet / ₺{Number(ch.dailyRevenue).toLocaleString('tr-TR')}
                  </strong>
                </div>
              </div>

              <button
                onClick={() => handleCopyWebhook(ch.code)}
                className="w-full mt-2 py-1.5 px-2 bg-white dark:bg-slate-800 hover:bg-slate-100 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition active:scale-95"
              >
                <Copy className="w-3.5 h-3.5" />
                Webhook URL Kopyala
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* 2. DIŞ SİSTEMLER İÇİN WEBHOOK ADAPTÖR AYARLARI */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5 shadow-sm space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <Server className="w-5 h-5 text-indigo-600" />
              REST & Webhook Adaptör Ağ Geçidi (Webhook Gateway)
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Trendyol, Hepsiburada, Shopify veya Kargo yazılımlarından canlı sipariş ve bildirim kabul eden uç nokta
            </p>
          </div>
          <span className="px-2.5 py-1 bg-emerald-50 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 rounded-full text-xs font-bold border border-emerald-200 dark:border-emerald-800">
            HTTP POST Aktif
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400">
              Webhook Uç Noktası (Endpoint URL)
            </label>
            <div className="flex items-center gap-2">
              <input
                type="text"
                readOnly
                value={`${webhookBaseUrl}?channel=trendyol`}
                className="w-full text-xs font-mono p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-slate-200"
              />
              <button
                onClick={() => handleCopyWebhook('trendyol')}
                className="px-3 py-2.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-xl text-xs font-semibold border border-slate-200 dark:border-slate-700"
              >
                Kopyala
              </button>
            </div>
          </div>

          <div className="space-y-2">
            <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400">
              Gizli API Anahtarı (X-Channel-Secret)
            </label>
            <div className="flex items-center gap-2">
              <input
                type="password"
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                className="w-full text-xs font-mono p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-slate-200"
              />
              <button
                onClick={() => toast.success('API Anahtarı kaydedildi!')}
                className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-semibold shadow-sm transition active:scale-95"
              >
                Kaydet
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* 3. KARGO VE LOJİSTİK ADAPTÖRLERİ */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5 shadow-sm space-y-4">
        <div>
          <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <Truck className="w-5 h-5 text-purple-600" />
            Kargo & 3PL Lojistik Adaptörleri
          </h3>
          <p className="text-xs text-slate-500 mt-0.5">
            ZPL barkod etiket basımı, teslimat SLA performansı ve desi bazlı taşıma tarifeleri
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {logisticsAdapters.map((ad) => (
            <div
              key={ad.id}
              className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-800/40 space-y-2.5 text-xs"
            >
              <div className="flex items-center justify-between">
                <span className="font-bold text-slate-900 dark:text-white text-sm">
                  {ad.providerName}
                </span>
                <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
                  Aktif
                </span>
              </div>

              <div className="space-y-1.5 text-slate-500 pt-2 border-t border-slate-200/60 dark:border-slate-700/60">
                <div className="flex justify-between">
                  <span>Ortalama Teslim Süresi:</span>
                  <strong className="text-slate-800 dark:text-slate-200">{ad.avgDeliveryDays} Gün</strong>
                </div>
                <div className="flex justify-between">
                  <span>Başlangıç Tarifesi:</span>
                  <strong className="text-slate-800 dark:text-slate-200">₺{ad.baseRateTry} / Desi</strong>
                </div>
                <div className="flex justify-between">
                  <span>Zamanında Teslim SLA:</span>
                  <strong className="text-purple-600 font-bold">%{ad.slaSuccessPercent}</strong>
                </div>
                <div className="flex justify-between">
                  <span>Aktif Taşıma:</span>
                  <strong className="text-slate-800 dark:text-slate-200">{ad.activeShipments} Paket</strong>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

