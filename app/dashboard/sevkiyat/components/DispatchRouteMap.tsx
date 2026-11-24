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
  BEKLIYOR: '#5B6B82',
  YOLDA: '#1267E6',
  VARISTA: '#9A5B00',
  TESLIM_EDILDI: '#0B7A3E',
  KISMI_TESLIM: '#9A5B00',
  TESLIM_EDILEMEDI: '#C42B31',
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
              ctx.fillStyle = '#F6F8FB';
              ctx.fillRect(0, 0, size.x, size.y);
              ctx.strokeStyle = 'rgba(18, 103, 230, 0.08)';
              ctx.lineWidth = 1;
              ctx.strokeRect(0, 0, size.x, size.y);
              ctx.strokeStyle = 'rgba(11, 27, 51, 0.04)';
              ctx.beginPath();
              ctx.moveTo(size.x / 2, 0);
              ctx.lineTo(size.x / 2, size.y);
              ctx.moveTo(0, size.y / 2);
              ctx.lineTo(size.x / 2, size.y);
              ctx.stroke();
              ctx.fillStyle = 'rgba(91, 107, 130, 0.45)';
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
        color: '#1267E6',
        weight: 3.5,
        opacity: 0.9,
      }).addTo(layerGroup);
    }

    if (origin) {
      bounds.push([origin.lat, origin.lng]);
      const depotMarker = L.circleMarker([origin.lat, origin.lng], {
        radius: 9,
        color: '#FFFFFF',
        fillColor: '#07254A',
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
          ? '#C42B31'
          : STOP_MARKER_COLORS[s.status] || '#1267E6';
      const statusTxt =
        DISPATCH_STOP_STATUS_LABELS[s.status as DispatchStopStatus] || s.status;

      const marker = L.circleMarker([s.lat, s.lng], {
        radius: 8,
        color: '#FFFFFF',
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
    <div className="bg-white/80 backdrop-blur-xl border border-[--line] rounded-[20px] p-4 space-y-3 shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2 text-sm font-semibold text-[--text]">
          <Compass className="w-4 h-4 text-[--brand]" />
          {tripNumber ? `${tripNumber} Rota Haritası` : 'Sefer Rota Haritası'} ({stops.length} Durak)
        </div>
        <div className="flex flex-wrap items-center gap-3 text-[11px] text-[--text-muted]">
          <span className="inline-flex items-center gap-1">
            <span className="w-2.5 h-2.5 rounded-full bg-[--ok-fill]" /> Depo / Teslim
          </span>
          <span className="inline-flex items-center gap-1">
            <span className="w-2.5 h-2.5 rounded-full bg-[--brand]" /> Yolda
          </span>
          <span className="inline-flex items-center gap-1">
            <span className="w-2.5 h-2.5 rounded-full bg-[--warn-fill]" /> Varış / Kısmi
          </span>
          <span className="inline-flex items-center gap-1">
            <span className="w-2.5 h-2.5 rounded-full bg-[--bad-fill]" /> Gecikme / Başarısız
          </span>
        </div>
      </div>

      <div
        ref={containerRef}
        className="w-full h-[300px] rounded-2xl overflow-hidden border border-[--line] bg-[--page]"
      />

      <div className="flex flex-wrap items-center justify-between gap-2 text-[11px] text-[--text-muted]">
        <span className="inline-flex items-center gap-1.5">
          <Info className="w-3.5 h-3.5 text-[--text-muted]" />
          {mapConfig.attribution}
        </span>
        <span className="inline-flex items-center gap-1">
          <MapPin className="w-3 h-3 text-[--brand]" />
          {mapConfig.hasExternalTileConfig ? 'Harici Harita Karosu Aktif' : 'Yerleşik Koordinat Kanvası'}
        </span>
      </div>
    </div>
  );
}
