'use client';

import React, { useEffect, useState } from 'react';
import { Truck } from 'lucide-react';

interface FleetPickerVehicle {
  id: string;
  plate: string;
  brandModel: string;
  status: string;
  assignedDriverId: string | null;
}

interface FleetPickerDriver {
  id: string;
  code: string;
  fullName: string;
  phoneMasked: string | null;
  licenseClass: string;
}

/**
 * Mevcut Depo Transfer / E-İrsaliye formlarına bozmadan bağlanan opsiyonel Araç/Şoför seçici.
 * Filo modülü kapalıysa veya yetki yoksa sessizce gizlenir; manuel giriş akışını etkilemez.
 */
export function FleetPickerSelect({
  onSelectVehicle,
  onSelectDriver,
}: {
  onSelectVehicle?: (v: FleetPickerVehicle, assignedDriver?: FleetPickerDriver | null) => void;
  onSelectDriver?: (d: FleetPickerDriver) => void;
}) {
  const [vehicles, setVehicles] = useState<FleetPickerVehicle[]>([]);
  const [drivers, setDrivers] = useState<FleetPickerDriver[]>([]);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let active = true;
    fetch('/api/filo?section=pickers', { cache: 'no-store' })
      .then((res) => (res.ok ? res.json() : null))
      .then((json) => {
        if (!active || !json?.success) return;
        setVehicles(json.vehicles || []);
        setDrivers(json.drivers || []);
        setReady(true);
      })
      .catch(() => {
        // Filo modülü kapalıysa veya erişim yoksa sessiz kal
      });
    return () => {
      active = false;
    };
  }, []);

  if (!ready || (vehicles.length === 0 && drivers.length === 0)) return null;

  return (
    <div className="bg-[--brand]/[0.06] border border-[--brand-line] rounded-xl p-2.5 flex flex-wrap items-center gap-2">
      <div className="inline-flex items-center gap-1 text-[11px] font-medium text-[#1267E6] mr-1">
        <Truck className="w-3.5 h-3.5" />
        Filodan Seç:
      </div>
      {onSelectVehicle && vehicles.length > 0 && (
        <select
          defaultValue=""
          onChange={(e) => {
            const v = vehicles.find((item) => item.id === e.target.value);
            if (!v) return;
            const d = v.assignedDriverId
              ? drivers.find((drv) => drv.id === v.assignedDriverId) || null
              : null;
            onSelectVehicle(v, d);
          }}
          className="bg-[var(--bg)] border border-[var(--line)] text-[var(--text)] text-[11px] rounded-lg px-2 py-1"
        >
          <option value="">Kayıtlı Araç Seçin ({vehicles.length})</option>
          {vehicles.map((v) => (
            <option key={v.id} value={v.id}>
              {v.plate} — {v.brandModel}
            </option>
          ))}
        </select>
      )}
      {onSelectDriver && drivers.length > 0 && (
        <select
          defaultValue=""
          onChange={(e) => {
            const d = drivers.find((item) => item.id === e.target.value);
            if (d) onSelectDriver(d);
          }}
          className="bg-[var(--bg)] border border-[var(--line)] text-[var(--text)] text-[11px] rounded-lg px-2 py-1"
        >
          <option value="">Kayıtlı Şoför Seçin ({drivers.length})</option>
          {drivers.map((d) => (
            <option key={d.id} value={d.id}>
              {d.fullName} ({d.licenseClass})
            </option>
          ))}
        </select>
      )}
    </div>
  );
}
