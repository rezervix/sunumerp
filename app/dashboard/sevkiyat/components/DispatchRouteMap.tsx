'use client';

import React, { useEffect, useRef } from 'react';
import { Compass, Info, MapPin } from 'lucide-react';
import {
  DISPATCH_STOP_STATUS_LABELS,
  type DispatchStopStatus,
} from '@/lib/logistics/dispatch/constantsAndHelpers';

interface MapStopPoint {
  id: string;
  sequenceNo: number;
  customerName: string;
  cityDistrict?: string | null;
  status: string;
  lat: number;
  lng: number;
  delayMinutes?: number;
  timeWindowStart?: string | null;
  timeWindowEnd?: string | null;
}

interface MapConfig {
  tileUrl: string | null;
  hasExternalTileConfig: boolean;
  attribution: string;
}

const STOP_MARKER_COLORS: Record<string, string> = {
  BEKLIYOR: '#94A3B8',
  YOLDA: '#38BDF8',
  VARISTA: '#FBBF24',
  TESLIM_EDILDI: '#34D399',
  KISMI_TESLIM: '#FBBF24',
  TESLIM_EDILEMEDI: '#F43F5E',
};

export function DispatchRouteMap({
  origin,
  stops,
  polyline,
  mapConfig,
  tripNumber,
}: {
  origin: { label: string; lat: number; lng: number } | null;
  stops: MapStopPoint[];
  polyline: Array<[number, number]>;
  mapConfig: MapConfig;
  tripNumber?: string;
}) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<any>(null);
  const layerRef = useRef<any>(null);

  useEffect(() => {
    let active = true;
    let map: any = null;

    async function initMap() {
      if (!containerRef.current) return;
      const L = await import('leaflet');
      if (!active || !containerRef.current) return;
      try {
        await import('leaflet/dist/leaflet.css');
      } catch {
        // no-op
      }

      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }

      map = L.map(containerRef.current, {
        center: origin ? [origin.lat, origin.lng] : [40.99, 29.1],
        zoom: 10,
        attributionControl: false,
      });

      if (mapConfig.tileUrl) {
        L.tileLayer(mapConfig.tileUrl, { maxZoom: 18 }).addTo(map);
      } else {
        const DarkCanvasGrid = L.GridLayer.extend({
          createTile: function (coords: any) {
            const tile = document.createElement('canvas');
            const size = this.getTileSize();
            tile.width = size.x;
            tile.height = size.y;
            const ctx = tile.getContext('2d');
            if (ctx) {
              ctx.fillStyle = '#0B100E';
              ctx.fillRect(0, 0, size.x, size.y);
              ctx.strokeStyle = 'rgba(52, 211, 153, 0.08)';
              ctx.lineWidth = 1;
              ctx.strokeRect(0, 0, size.x, size.y);
              ctx.strokeStyle = 'rgba(255, 255, 255, 0.03)';
              ctx.beginPath();
              ctx.moveTo(size.x / 2, 0);
              ctx.lineTo(size.x / 2, size.y);
              ctx.moveTo(0, size.y / 2);
              ctx.lineTo(size.x, size.y / 2);
              ctx.stroke();
              ctx.fillStyle = 'rgba(148, 163, 184, 0.25)';
              ctx.font = '10px monospace';
              ctx.fillText(`Z${coords.z} (${coords.x},${coords.y})`, 8, 16);
            }
            return tile;
          },
        });
        new (DarkCanvasGrid as any)().addTo(map);
      }

      const layerGroup = L.layerGroup().addTo(map);
      mapRef.current = map;
      layerRef.current = layerGroup;
      renderLayers(L, map, layerGroup);
    }

    initMap();
    return () => {
      active = false;
      if (map) {
        map.remove();
        mapRef.current = null;
        layerRef.current = null;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mapConfig.tileUrl]);

  const renderLayers = (L: any, map: any, layerGroup: any) => {
    layerGroup.clearLayers();
    const bounds: Array<[number, number]> = [];

    if (polyline && polyline.length > 1) {
      L.polyline(polyline, {
        color: '#34D399',
        weight: 3.5,
        opacity: 0.9,
      }).addTo(layerGroup);
    }

    if (origin) {
      bounds.push([origin.lat, origin.lng]);
      const depotMarker = L.circleMarker([origin.lat, origin.lng], {
        radius: 9,
        color: '#FFFFFF',
        fillColor: '#10B981',
        fillOpacity: 1,
        weight: 2.5,
      });
      depotMarker.bindTooltip(`Depo Çıkış: ${origin.label}`, { direction: 'top' });
      depotMarker.addTo(layerGroup);
    }

    for (const s of stops) {
      if (!Number.isFinite(s.lat) || !Number.isFinite(s.lng)) continue;
      bounds.push([s.lat, s.lng]);
      const color =
        Number(s.delayMinutes || 0) > 10 && s.status !== 'TESLIM_EDILDI'
          ? '#F43F5E'
          : STOP_MARKER_COLORS[s.status] || '#38BDF8';
      const statusTxt =
        DISPATCH_STOP_STATUS_LABELS[s.status as DispatchStopStatus] || s.status;

      const marker = L.circleMarker([s.lat, s.lng], {
        radius: 8,
        color: '#0B0F0D',
        fillColor: color,
        fillOpacity: 0.95,
        weight: 2,
      });
      marker.bindTooltip(
        `#${s.sequenceNo} ${s.customerName} (${statusTxt}${s.timeWindowEnd ? ` · Pencere ${s.timeWindowStart || ''}-${s.timeWindowEnd}` : ''})`,
        { direction: 'top' }
      );
      marker.addTo(layerGroup);
    }

    if (bounds.length > 0) {
      map.fitBounds(bounds, { padding: [30, 30], maxZoom: 12 });
    }
  };

  useEffect(() => {
    let mounted = true;
    if (!mapRef.current || !layerRef.current) return;
    import('leaflet').then((L) => {
      if (!mounted || !mapRef.current || !layerRef.current) return;
      renderLayers(L, mapRef.current, layerRef.current);
    });
    return () => {
      mounted = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [origin?.lat, origin?.lng, stops, polyline]);

  return (
    <div className="bg-[#111513]/90 border border-white/[0.06] rounded-[20px] p-4 space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2 text-sm font-semibold text-white">
          <Compass className="w-4 h-4 text-[#34D399]" />
          {tripNumber ? `${tripNumber} Rota Haritası` : 'Sefer Rota Haritası'} ({stops.length} Durak)
        </div>
        <div className="flex flex-wrap items-center gap-3 text-[11px] text-zinc-400">
          <span className="inline-flex items-center gap-1">
            <span className="w-2.5 h-2.5 rounded-full bg-[#10B981]" /> Depo / Teslim
          </span>
          <span className="inline-flex items-center gap-1">
            <span className="w-2.5 h-2.5 rounded-full bg-[#38BDF8]" /> Yolda
          </span>
          <span className="inline-flex items-center gap-1">
            <span className="w-2.5 h-2.5 rounded-full bg-[#FBBF24]" /> Varış / Kısmi
          </span>
          <span className="inline-flex items-center gap-1">
            <span className="w-2.5 h-2.5 rounded-full bg-[#F43F5E]" /> Gecikme / Başarısız
          </span>
        </div>
      </div>

      <div
        ref={containerRef}
        className="w-full h-[300px] rounded-2xl overflow-hidden border border-white/[0.08] bg-[#0B100E]"
      />

      <div className="flex flex-wrap items-center justify-between gap-2 text-[11px] text-zinc-500">
        <span className="inline-flex items-center gap-1.5">
          <Info className="w-3.5 h-3.5 text-zinc-400" />
          {mapConfig.attribution}
        </span>
        <span className="inline-flex items-center gap-1">
          <MapPin className="w-3 h-3 text-[#34D399]" />
          {mapConfig.hasExternalTileConfig ? 'Harici Harita Karosu Aktif' : 'Yerleşik Koyu Koordinat Kanvası'}
        </span>
      </div>
    </div>
  );
}
