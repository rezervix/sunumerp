'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  AlertTriangle,
  Clock,
  Compass,
  Info,
  MapPin,
  RefreshCw,
  Truck,
  UserCheck,
} from 'lucide-react';
import {
  FLEET_VEHICLE_STATUS_BADGES,
  FLEET_VEHICLE_STATUS_LABELS,
  FLEET_VEHICLE_TYPE_LABELS,
  type FleetVehicleStatus,
  type FleetVehicleType,
} from '@/lib/logistics/fleet/constantsAndHelpers';

interface MapVehiclePoint {
  id: string;
  code: string;
  plate: string;
  brandModel: string;
  vehicleType: string;
  fuelType: string;
  status: string;
  isRefrigerated: boolean;
  targetTempMaxC: number | null;
  odometerKm: number;
  driverName: string | null;
  lat: number | null;
  lng: number | null;
  speedKmh: number;
  headingDeg: number;
  temperatureC: number | null;
  lastTelemetryAt: string | null;
  lastTelemetryProvider: string | null;
  sourceOrigin: string | null;
  trail: Array<{
    id: string;
    lat: number;
    lng: number;
    speedKmh: number | null;
    eventType: string;
    temperatureC: number | null;
    eventTime: string;
  }>;
}

interface MapConfig {
  tileUrl: string | null;
  hasExternalTileConfig: boolean;
  externalTileConfiguredButMissingKey: boolean;
  attribution: string;
}

const STATUS_MARKER_COLORS: Record<string, string> = {
  ACTIVE: '#34D399',
  IN_TRANSIT: '#38BDF8',
  MAINTENANCE: '#FBBF24',
  FAULT: '#F43F5E',
  OUT_OF_SERVICE: '#71717A',
};

function getVehicleMarkerColor(v: MapVehiclePoint): string {
  if (
    v.isRefrigerated &&
    v.temperatureC !== null &&
    v.targetTempMaxC !== null &&
    v.temperatureC > v.targetTempMaxC
  ) {
    return '#F43F5E';
  }
  return STATUS_MARKER_COLORS[v.status] || '#34D399';
}

export function FleetLiveMap({
  vehicles,
  mapConfig,
  hoursWindow = 48,
  isDemoMode,
  onRefresh,
  loading,
}: {
  vehicles: MapVehiclePoint[];
  mapConfig: MapConfig;
  hoursWindow?: number;
  isDemoMode: boolean;
  onRefresh: () => void;
  loading: boolean;
}) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapInstanceRef = useRef<any>(null);
  const layerGroupRef = useRef<any>(null);

  const vehiclesWithCoords = useMemo(
    () => vehicles.filter((v) => typeof v.lat === 'number' && typeof v.lng === 'number'),
    [vehicles]
  );

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [showAllTrails, setShowAllTrails] = useState<boolean>(false);

  const visibleVehicles = useMemo(
    () =>
      statusFilter === 'ALL'
        ? vehiclesWithCoords
        : vehiclesWithCoords.filter((v) => v.status === statusFilter),
    [vehiclesWithCoords, statusFilter]
  );

  const selectedVehicle = useMemo(() => {
    if (!visibleVehicles.length) return null;
    return visibleVehicles.find((v) => v.id === selectedId) || visibleVehicles[0];
  }, [visibleVehicles, selectedId]);

  useEffect(() => {
    let active = true;
    let map: any = null;

    async function initMap() {
      if (!containerRef.current) return;
      const L = await import('leaflet');
      if (!active || !containerRef.current) return;

      // Leaflet stil dosyasını istemcide yükle
      try {
        await import('leaflet/dist/leaflet.css');
      } catch {
        // fallback no-op
      }

      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }

      map = L.map(containerRef.current, {
        center: [40.99, 29.06],
        zoom: 9,
        attributionControl: false,
      });

      if (mapConfig.tileUrl) {
        L.tileLayer(mapConfig.tileUrl, {
          maxZoom: 18,
        }).addTo(map);
      } else {
        // Harici tile/anahtar yokken filigransız yerleşik koyu tema koordinat kanvas katmanı
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
      mapInstanceRef.current = map;
      layerGroupRef.current = layerGroup;

      renderOverlay(L, map, layerGroup);
    }

    initMap();

    return () => {
      active = false;
      if (map) {
        map.remove();
        mapInstanceRef.current = null;
        layerGroupRef.current = null;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mapConfig.tileUrl]);

  const renderOverlay = (L: any, map: any, layerGroup: any) => {
    layerGroup.clearLayers();
    const boundsPoints: Array<[number, number]> = [];

    for (const v of visibleVehicles) {
      if (v.lat === null || v.lng === null) continue;
      const color = getVehicleMarkerColor(v);
      const isSelected = selectedVehicle?.id === v.id;
      boundsPoints.push([v.lat, v.lng]);

      // Son 48 saat rota izi
      if ((isSelected || showAllTrails) && v.trail && v.trail.length > 1) {
        const latLngs = v.trail.map((pt) => [pt.lat, pt.lng] as [number, number]);
        L.polyline(latLngs, {
          color,
          weight: isSelected ? 4 : 2,
          opacity: isSelected ? 0.92 : 0.4,
          dashArray: isSelected ? undefined : '4 6',
        }).addTo(layerGroup);

        for (const pt of v.trail.slice(0, -1)) {
          L.circleMarker([pt.lat, pt.lng], {
            radius: 3,
            color,
            fillColor: color,
            fillOpacity: 0.55,
            weight: 1,
          }).addTo(layerGroup);
        }
      }

      const marker = L.circleMarker([v.lat, v.lng], {
        radius: isSelected ? 10 : 7,
        color: isSelected ? '#FFFFFF' : color,
        fillColor: color,
        fillOpacity: 0.9,
        weight: isSelected ? 2.5 : 1.5,
      });

      marker.bindTooltip(`${v.plate} • ${Math.round(v.speedKmh || 0)} km/s`, {
        direction: 'top',
        offset: [0, -8],
      });

      marker.on('click', () => {
        setSelectedId(v.id);
      });

      marker.addTo(layerGroup);
    }

    if (boundsPoints.length > 0 && !selectedId) {
      map.fitBounds(boundsPoints, { padding: [36, 36], maxZoom: 12 });
    } else if (selectedVehicle && selectedVehicle.lat && selectedVehicle.lng) {
      map.panTo([selectedVehicle.lat, selectedVehicle.lng], { animate: true });
    }
  };

  useEffect(() => {
    let active = true;
    import('leaflet').then((L) => {
      if (!active || !mapInstanceRef.current || !layerGroupRef.current) return;
      renderOverlay(L, mapInstanceRef.current, layerGroupRef.current);
    });
    return () => {
      active = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visibleVehicles, selectedVehicle?.id, showAllTrails]);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3 bg-[#111513]/90 border border-white/[0.06] rounded-[20px] p-4">
        <div className="flex flex-wrap items-center gap-2">
          <Compass className="w-4 h-4 text-[#34D399]" />
          <span className="text-sm font-semibold text-white">Canlı Filo Haritası</span>
          <span className="px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-emerald-500/10 text-[#34D399] border border-emerald-500/25">
            {visibleVehicles.length} Konumlu Araç · Son {hoursWindow} Saat İz
          </span>
          {isDemoMode && (
            <span className="px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-amber-500/15 text-amber-300 border border-amber-500/30">
              Kaynak: Demo Veritabanı (Telematik Kayıtları)
            </span>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="bg-[#0B0F0D] border border-white/[0.1] rounded-full px-3 py-1.5 text-xs text-zinc-200"
          >
            <option value="ALL">Tüm Durumlar</option>
            <option value="IN_TRANSIT">Seferde</option>
            <option value="ACTIVE">Hazır / Aktif</option>
            <option value="MAINTENANCE">Bakımda</option>
            <option value="FAULT">Arızalı</option>
          </select>

          <button
            type="button"
            onClick={() => setShowAllTrails((prev) => !prev)}
            className={`px-3 py-1.5 rounded-full text-xs border cursor-pointer transition ${
              showAllTrails
                ? 'bg-emerald-500/15 text-[#34D399] border-emerald-500/30'
                : 'bg-white/[0.04] text-zinc-300 border-white/[0.08]'
            }`}
          >
            {showAllTrails ? 'Tüm Rotalar Açık' : 'Tüm Rotaları Göster'}
          </button>

          <button
            type="button"
            onClick={onRefresh}
            disabled={loading}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/[0.06] hover:bg-white/[0.12] border border-white/[0.1] text-xs text-white cursor-pointer"
          >
            <RefreshCw className={`w-3.5 h-3.5 text-[#34D399] ${loading ? 'animate-spin' : ''}`} />
            Yenile
          </button>
        </div>
      </div>

      {mapConfig.externalTileConfiguredButMissingKey && (
        <div className="bg-amber-500/10 border border-amber-500/30 rounded-2xl px-4 py-2.5 text-xs text-amber-200 flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
          Harici harita altlığı (`LOJISTIK_MAP_TILE_URL`) anahtar gerektiriyor; `LOJISTIK_MAP_TILE_KEY` tanımlı olmadığı için filigransız yerleşik koyu tema koordinat kanvası kullanılıyor.
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 relative bg-[#0B100E] border border-white/[0.08] rounded-[20px] overflow-hidden min-h-[460px]">
          <div ref={containerRef} className="w-full h-[460px] z-0" />

          {/* Harita Durum Renk Göstergesi + Zorunlu Atıf Çubuğu */}
          <div className="absolute top-3 left-3 z-[400] bg-[#0B0F0D]/90 backdrop-blur-md border border-white/[0.1] rounded-xl px-3 py-2 text-[11px] flex flex-wrap gap-3 text-zinc-300">
            <span className="inline-flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-[#38BDF8]" /> Seferde</span>
            <span className="inline-flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-[#34D399]" /> Hazır</span>
            <span className="inline-flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-[#FBBF24]" /> Bakımda</span>
            <span className="inline-flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-[#F43F5E]" /> Arıza / Isı İhlali</span>
          </div>

          <div className="absolute bottom-2 right-2 z-[400] bg-[#0B0F0D]/90 border border-white/[0.1] rounded-lg px-2.5 py-1 text-[10px] text-zinc-400">
            {mapConfig.attribution}
          </div>
        </div>

        {/* Sağ Detay Paneli & Araç Seçim Listesi */}
        <div className="bg-[#111513]/90 border border-white/[0.06] rounded-[20px] p-4 flex flex-col gap-3 max-h-[460px] overflow-y-auto">
          {selectedVehicle ? (
            <div className="bg-white/[0.03] border border-white/[0.08] rounded-2xl p-3.5 space-y-2.5">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <div className="text-base font-bold text-white flex items-center gap-2">
                    <Truck className="w-4 h-4 text-[#34D399]" />
                    {selectedVehicle.plate}
                  </div>
                  <div className="text-xs text-zinc-400">
                    {selectedVehicle.brandModel} · {FLEET_VEHICLE_TYPE_LABELS[selectedVehicle.vehicleType as FleetVehicleType] || selectedVehicle.vehicleType}
                  </div>
                </div>
                <span
                  className={`px-2 py-0.5 rounded-full text-[10px] font-semibold border ${
                    FLEET_VEHICLE_STATUS_BADGES[selectedVehicle.status as FleetVehicleStatus] || ''
                  }`}
                >
                  {FLEET_VEHICLE_STATUS_LABELS[selectedVehicle.status as FleetVehicleStatus] || selectedVehicle.status}
                </span>
              </div>

              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="bg-[#0B0F0D] rounded-xl p-2 border border-white/[0.05]">
                  <div className="text-[10px] text-zinc-500">Şoför</div>
                  <div className="text-zinc-200 font-medium flex items-center gap-1 mt-0.5">
                    <UserCheck className="w-3 h-3 text-[#34D399]" />
                    {selectedVehicle.driverName || 'Atanmadı'}
                  </div>
                </div>
                <div className="bg-[#0B0F0D] rounded-xl p-2 border border-white/[0.05]">
                  <div className="text-[10px] text-zinc-500">Anlık Hız / Km</div>
                  <div className="text-zinc-200 font-mono mt-0.5">
                    {Math.round(selectedVehicle.speedKmh || 0)} km/s · {Number(selectedVehicle.odometerKm || 0).toLocaleString('tr-TR')} km
                  </div>
                </div>
                <div className="bg-[#0B0F0D] rounded-xl p-2 border border-white/[0.05]">
                  <div className="text-[10px] text-zinc-500">Konum</div>
                  <div className="text-zinc-300 font-mono text-[11px] mt-0.5">
                    {selectedVehicle.lat?.toFixed(4)}, {selectedVehicle.lng?.toFixed(4)}
                  </div>
                </div>
                <div className="bg-[#0B0F0D] rounded-xl p-2 border border-white/[0.05]">
                  <div className="text-[10px] text-zinc-500">Son Sinyal / Kaynak</div>
                  <div className="text-zinc-300 text-[11px] mt-0.5 flex items-center gap-1">
                    <Clock className="w-3 h-3 text-zinc-500" />
                    {selectedVehicle.lastTelemetryAt
                      ? new Date(selectedVehicle.lastTelemetryAt).toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })
                      : 'Yok'}
                  </div>
                </div>
              </div>

              {selectedVehicle.isRefrigerated && (
                <div
                  className={`rounded-xl px-3 py-1.5 text-xs flex items-center justify-between border ${
                    selectedVehicle.temperatureC !== null &&
                    selectedVehicle.targetTempMaxC !== null &&
                    selectedVehicle.temperatureC > selectedVehicle.targetTempMaxC
                      ? 'bg-rose-500/15 border-rose-500/30 text-rose-200'
                      : 'bg-sky-500/10 border-sky-500/25 text-sky-200'
                  }`}
                >
                  <span>Soğuk Kasa Sıcaklığı</span>
                  <span className="font-mono font-semibold">
                    {selectedVehicle.temperatureC !== null ? `${selectedVehicle.temperatureC} °C` : 'Ölçüm yok'} (Max {selectedVehicle.targetTempMaxC ?? 6} °C)
                  </span>
                </div>
              )}

              <div className="flex items-center justify-between text-[11px] text-zinc-400 pt-1 border-t border-white/[0.06]">
                <span className="inline-flex items-center gap-1">
                  <Info className="w-3 h-3 text-[#34D399]" />
                  {selectedVehicle.lastTelemetryProvider || (isDemoMode ? 'DEMO Veritabanı' : 'Telematik')}
                </span>
                <span className="font-mono">{selectedVehicle.trail?.length || 0} iz noktası ({hoursWindow}s)</span>
              </div>
            </div>
          ) : (
            <div className="text-center py-8 text-xs text-zinc-500">
              Konum verisi olan araç bulunamadı.
            </div>
          )}

          <div className="space-y-1.5">
            <div className="text-[11px] uppercase tracking-wider text-zinc-500 font-semibold">
              Filo Araç Listesi ({visibleVehicles.length})
            </div>
            {visibleVehicles.map((v) => {
              const active = selectedVehicle?.id === v.id;
              return (
                <button
                  key={v.id}
                  type="button"
                  onClick={() => setSelectedId(v.id)}
                  className={`w-full text-left px-3 py-2 rounded-xl border text-xs flex items-center justify-between transition cursor-pointer ${
                    active
                      ? 'bg-emerald-500/15 border-emerald-500/35 text-white'
                      : 'bg-white/[0.02] border-white/[0.05] text-zinc-300 hover:bg-white/[0.05]'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <span
                      className="w-2.5 h-2.5 rounded-full shrink-0"
                      style={{ backgroundColor: getVehicleMarkerColor(v) }}
                    />
                    <span className="font-semibold">{v.plate}</span>
                    <span className="text-[11px] text-zinc-400 truncate max-w-[110px]">{v.driverName || v.vehicleType}</span>
                  </div>
                  <span className="font-mono text-[11px] text-zinc-400 flex items-center gap-1">
                    <MapPin className="w-3 h-3" />
                    {Math.round(v.speedKmh || 0)} km/s
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
