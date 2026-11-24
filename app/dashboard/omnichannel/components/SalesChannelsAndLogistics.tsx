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
import { safeText, safeNumber, safeCurrency } from '@/lib/utils/safe-display';

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
      <div className="bg-white/80 backdrop-blur-xl border border-[--line] rounded-[20px] p-6 space-y-5 shadow-sm">
        <div>
          <h3 className="text-base font-semibold text-[--text] flex items-center gap-2">
            <Globe className="w-4 h-4 text-[--brand]" />
            Aktif Satış Kanalları & Pazaryeri Entegrasyonları
          </h3>
          <p className="text-xs text-[--text-muted] mt-0.5">
            Canlı stok tamponu (% buffer), minimum eşik ve webhook gecikme süreleri
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {(channels || []).map((ch) => (
            <motion.div
              key={ch.id}
              whileHover={{ y: -4 }}
              className="p-5 rounded-[20px] bg-white border border-[--line] hover:border-[--brand-line] transition-all space-y-3.5 shadow-sm"
            >
              <div className="flex items-center justify-between">
                <span className="font-medium text-xs px-2.5 py-0.5 rounded-full bg-[--muted-bg] text-[--text] border border-[--line] font-mono">
                  {safeText(ch.code)}
                </span>
                <span className="inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium bg-[--ok-soft] text-[--ok] border border-[--ok]/25">
                  <CheckCircle2 className="w-3 h-3 text-[--ok]" /> Bağlı
                </span>
              </div>

              <div>
                <div className="text-sm font-semibold text-[--text] truncate">
                  {safeText(ch.name)}
                </div>
                <div className="text-xs text-[--text-muted] mt-0.5">
                  Senkronize Ürün: <strong className="text-[--brand] font-medium">{safeNumber(ch.syncedSkuCount)} SKU</strong>
                </div>
              </div>

              <div className="pt-2.5 border-t border-[--line] space-y-1.5 text-xs">
                <div className="flex justify-between text-[--text-muted]">
                  <span>Stok Güvenlik Tamponu:</span>
                  <strong className="text-[--text] font-medium font-mono tabular-nums">%{safeNumber(ch.stockBufferPercent)}</strong>
                </div>
                <div className="flex justify-between text-[--text-muted]">
                  <span>Webhook Gecikmesi:</span>
                  <strong className="text-[--brand] font-mono font-medium tabular-nums">{safeNumber(ch.webhookLatencyMs)}ms</strong>
                </div>
                <div className="flex justify-between text-[--text-muted]">
                  <span>Günlük Sipariş / Ciro:</span>
                  <strong className="text-[--text] font-medium tabular-nums">
                    {safeNumber(ch.dailyOrderCount)} adet / {safeCurrency(ch.dailyRevenue)}
                  </strong>
                </div>
              </div>

              <button
                onClick={() => handleCopyWebhook(ch.code)}
                className="w-full mt-2 py-2 px-3 bg-white hover:bg-[--muted-bg] text-[--text-2] border border-[--line] rounded-full text-xs font-medium flex items-center justify-center gap-1.5 transition active:scale-95 cursor-pointer shadow-sm"
              >
                <Copy className="w-3.5 h-3.5 text-[--text-muted]" />
                Webhook URL Kopyala
              </button>
            </motion.div>
          ))}
        </div>
      </div>

      {/* 2. DIŞ SİSTEMLER İÇİN WEBHOOK ADAPTÖR AYARLARI */}
      <div className="bg-white/80 backdrop-blur-xl border border-[--line] rounded-[20px] p-6 space-y-4 shadow-sm">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-base font-semibold text-[--text] flex items-center gap-2">
              <Server className="w-4 h-4 text-[--brand]" />
              REST & Webhook Adaptör Ağ Geçidi (Webhook Gateway)
            </h3>
            <p className="text-xs text-[--text-muted] mt-0.5">
              Trendyol, Hepsiburada, Shopify veya Kargo yazılımlarından canlı sipariş ve bildirim kabul eden uç nokta
            </p>
          </div>
          <span className="bg-[--brand-soft] text-[--brand] border border-[--brand-line] rounded-full px-3 py-0.5 text-xs font-medium">
            HTTP POST Aktif
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <label className="block text-xs font-medium text-[--text-muted]">
              Webhook Uç Noktası (Endpoint URL)
            </label>
            <div className="flex items-center gap-2">
              <input
                type="text"
                readOnly
                value={`${webhookBaseUrl}?channel=trendyol`}
                className="w-full text-xs font-mono p-2.5 bg-[--muted-bg]/50 border border-[--line] rounded-xl text-[--text] focus:outline-none"
              />
              <button
                onClick={() => handleCopyWebhook('trendyol')}
                className="px-3.5 py-2.5 bg-white hover:bg-[--muted-bg] text-[--text-2] rounded-xl text-xs font-medium border border-[--line] transition cursor-pointer shadow-sm"
              >
                Kopyala
              </button>
            </div>
          </div>

          <div className="space-y-2">
            <label className="block text-xs font-medium text-[--text-muted]">
              Gizli API Anahtarı (X-Channel-Secret)
            </label>
            <div className="flex items-center gap-2">
              <input
                type="password"
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                className="w-full text-xs font-mono p-2.5 bg-white border border-[--line] rounded-xl text-[--text] focus:border-[--brand] focus:ring-1 focus:ring-[--brand] focus:outline-none"
              />
              <button
                onClick={() => toast.success('API Anahtarı kaydedildi!')}
                className="px-5 py-2.5 bg-gradient-to-r from-[--brand] to-[--blue] text-white hover:opacity-95 rounded-full text-xs font-semibold shadow-sm transition active:scale-95 cursor-pointer"
              >
                Kaydet
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* 3. KARGO VE LOJİSTİK ADAPTÖRLERİ */}
      <div className="bg-white/80 backdrop-blur-xl border border-[--line] rounded-[20px] p-6 space-y-4 shadow-sm">
        <div>
          <h3 className="text-base font-semibold text-[--text] flex items-center gap-2">
            <Truck className="w-4 h-4 text-[--brand]" />
            Kargo & 3PL Lojistik Adaptörleri
          </h3>
          <p className="text-xs text-[--text-muted] mt-0.5">
            ZPL barkod etiket basımı, teslimat SLA performansı ve desi bazlı taşıma tarifeleri
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {(logisticsAdapters || []).map((ad) => (
            <motion.div
              key={ad.id}
              whileHover={{ y: -4 }}
              className="p-5 rounded-[20px] bg-white border border-[--line] hover:border-[--brand-line] transition-all space-y-3 text-xs shadow-sm"
            >
              <div className="flex items-center justify-between">
                <span className="font-semibold text-[--text] text-sm">
                  {safeText(ad.providerName)}
                </span>
                <span className="bg-[--ok-soft] text-[--ok] border border-[--ok]/25 rounded-full px-2.5 py-0.5 text-xs font-medium">
                  Aktif
                </span>
              </div>

              <div className="space-y-1.5 text-[--text-muted] pt-2.5 border-t border-[--line]">
                <div className="flex justify-between">
                  <span>Ortalama Teslim Süresi:</span>
                  <strong className="text-[--text] font-medium font-mono tabular-nums">{safeNumber(ad.avgDeliveryDays)} Gün</strong>
                </div>
                <div className="flex justify-between">
                  <span>Başlangıç Tarifesi:</span>
                  <strong className="text-[--text] font-medium font-mono tabular-nums">{safeCurrency(ad.baseRateTry)} / Desi</strong>
                </div>
                <div className="flex justify-between">
                  <span>Zamanında Teslim SLA:</span>
                  <strong className="text-[--ok] font-medium font-mono tabular-nums">%{safeNumber(ad.slaSuccessPercent)}</strong>
                </div>
                <div className="flex justify-between">
                  <span>Aktif Taşıma:</span>
                  <strong className="text-[--brand] font-medium font-mono tabular-nums">{safeNumber(ad.activeShipments)} Paket</strong>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  );
}
