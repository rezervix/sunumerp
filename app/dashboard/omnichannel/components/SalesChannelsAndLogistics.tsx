'use client';

import React, { useState } from 'react';
import { motion } from 'framer-motion';
import {
  Globe,
  Truck,
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
      <div className="bg-[#111513]/90 border border-white/[0.06] rounded-[20px] p-6 space-y-5">
        <div>
          <h3 className="text-base font-semibold text-white flex items-center gap-2">
            <Globe className="w-4 h-4 text-emerald-400" />
            Aktif Satış Kanalları & Pazaryeri Entegrasyonları
          </h3>
          <p className="text-xs text-zinc-400 mt-0.5">
            Canlı stok tamponu (% buffer), minimum eşik ve webhook gecikme süreleri
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {channels.map((ch) => (
            <motion.div
              key={ch.id}
              whileHover={{ y: -4 }}
              className="p-5 rounded-[20px] bg-[#0d100e] border border-white/[0.06] hover:border-emerald-500/20 transition-all space-y-3.5"
            >
              <div className="flex items-center justify-between">
                <span className="font-medium text-xs px-2.5 py-0.5 rounded-full bg-white/5 text-zinc-300 border border-white/10 font-mono">
                  {ch.code}
                </span>
                <span className="inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                  <CheckCircle2 className="w-3 h-3 text-emerald-400" /> Bağlı
                </span>
              </div>

              <div>
                <div className="text-sm font-medium text-white truncate">
                  {ch.name}
                </div>
                <div className="text-xs text-zinc-400 mt-0.5">
                  Senkronize Ürün: <strong className="text-white font-medium">{ch.syncedSkuCount} SKU</strong>
                </div>
              </div>

              <div className="pt-2.5 border-t border-white/[0.06] space-y-1.5 text-xs">
                <div className="flex justify-between text-zinc-400">
                  <span>Stok Güvenlik Tamponu:</span>
                  <strong className="text-white font-medium">%{ch.stockBufferPercent}</strong>
                </div>
                <div className="flex justify-between text-zinc-400">
                  <span>Webhook Gecikmesi:</span>
                  <strong className="text-emerald-400 font-mono font-medium">{ch.webhookLatencyMs}ms</strong>
                </div>
                <div className="flex justify-between text-zinc-400">
                  <span>Günlük Sipariş / Ciro:</span>
                  <strong className="text-white font-medium">
                    {ch.dailyOrderCount} adet / ₺{Number(ch.dailyRevenue).toLocaleString('tr-TR')}
                  </strong>
                </div>
              </div>

              <button
                onClick={() => handleCopyWebhook(ch.code)}
                className="w-full mt-2 py-2 px-3 bg-white/5 hover:bg-white/10 text-zinc-300 border border-white/10 rounded-full text-xs font-medium flex items-center justify-center gap-1.5 transition active:scale-95"
              >
                <Copy className="w-3.5 h-3.5 text-zinc-400" />
                Webhook URL Kopyala
              </button>
            </motion.div>
          ))}
        </div>
      </div>

      {/* 2. DIŞ SİSTEMLER İÇİN WEBHOOK ADAPTÖR AYARLARI */}
      <div className="bg-[#111513]/90 border border-white/[0.06] rounded-[20px] p-6 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-base font-semibold text-white flex items-center gap-2">
              <Server className="w-4 h-4 text-emerald-400" />
              REST & Webhook Adaptör Ağ Geçidi (Webhook Gateway)
            </h3>
            <p className="text-xs text-zinc-400 mt-0.5">
              Trendyol, Hepsiburada, Shopify veya Kargo yazılımlarından canlı sipariş ve bildirim kabul eden uç nokta
            </p>
          </div>
          <span className="bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 rounded-full px-3 py-0.5 text-xs font-medium">
            HTTP POST Aktif
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <label className="block text-xs font-medium text-zinc-400">
              Webhook Uç Noktası (Endpoint URL)
            </label>
            <div className="flex items-center gap-2">
              <input
                type="text"
                readOnly
                value={`${webhookBaseUrl}?channel=trendyol`}
                className="w-full text-xs font-mono p-2.5 bg-white/[0.03] border border-white/10 rounded-xl text-zinc-300 focus:outline-none"
              />
              <button
                onClick={() => handleCopyWebhook('trendyol')}
                className="px-3.5 py-2.5 bg-white/5 hover:bg-white/10 text-zinc-300 rounded-xl text-xs font-medium border border-white/10 transition"
              >
                Kopyala
              </button>
            </div>
          </div>

          <div className="space-y-2">
            <label className="block text-xs font-medium text-zinc-400">
              Gizli API Anahtarı (X-Channel-Secret)
            </label>
            <div className="flex items-center gap-2">
              <input
                type="password"
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                className="w-full text-xs font-mono p-2.5 bg-white/[0.03] border border-white/10 rounded-xl text-white focus:outline-none focus:border-emerald-500/50"
              />
              <button
                onClick={() => toast.success('API Anahtarı kaydedildi!')}
                className="px-5 py-2.5 bg-emerald-400 text-black hover:bg-emerald-300 rounded-full text-xs font-semibold shadow-[0_0_15px_rgba(52,211,153,0.2)] transition active:scale-95"
              >
                Kaydet
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* 3. KARGO VE LOJİSTİK ADAPTÖRLERİ */}
      <div className="bg-[#111513]/90 border border-white/[0.06] rounded-[20px] p-6 space-y-4">
        <div>
          <h3 className="text-base font-semibold text-white flex items-center gap-2">
            <Truck className="w-4 h-4 text-emerald-400" />
            Kargo & 3PL Lojistik Adaptörleri
          </h3>
          <p className="text-xs text-zinc-400 mt-0.5">
            ZPL barkod etiket basımı, teslimat SLA performansı ve desi bazlı taşıma tarifeleri
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {logisticsAdapters.map((ad) => (
            <motion.div
              key={ad.id}
              whileHover={{ y: -4 }}
              className="p-5 rounded-[20px] bg-[#0d100e] border border-white/[0.06] hover:border-emerald-500/20 transition-all space-y-3 text-xs"
            >
              <div className="flex items-center justify-between">
                <span className="font-medium text-white text-sm">
                  {ad.providerName}
                </span>
                <span className="bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 rounded-full px-2.5 py-0.5 text-xs font-medium">
                  Aktif
                </span>
              </div>

              <div className="space-y-1.5 text-zinc-400 pt-2.5 border-t border-white/[0.06]">
                <div className="flex justify-between">
                  <span>Ortalama Teslim Süresi:</span>
                  <strong className="text-white font-medium">{ad.avgDeliveryDays} Gün</strong>
                </div>
                <div className="flex justify-between">
                  <span>Başlangıç Tarifesi:</span>
                  <strong className="text-white font-medium">₺{ad.baseRateTry} / Desi</strong>
                </div>
                <div className="flex justify-between">
                  <span>Zamanında Teslim SLA:</span>
                  <strong className="text-emerald-400 font-medium">%{ad.slaSuccessPercent}</strong>
                </div>
                <div className="flex justify-between">
                  <span>Aktif Taşıma:</span>
                  <strong className="text-white font-medium">{ad.activeShipments} Paket</strong>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  );
}
