/**
 * Lojistik Sağlayıcı Adaptörü — GPS / Telematik & Soğuk Zincir Sensör Akışı
 *
 * Karar #5:
 * - Demo-DB adaptörü LojistikVehicle / mevcut eDocument & warehouse kayıtlarından
 *   telemetri üretir; harici GPS / Telematik REST veya Webhook sağlayıcısı yapılandırma
 *   ile devreye alınır.
 */

import { prisma } from "@/lib/db"
import { DEMO_WAREHOUSE_COORDINATES } from "../constants"
import type {
  ILogisticsTelematicsProvider,
  TelematikKonumVerisi,
} from "../types"

export class DemoDbTelematicsProvider implements ILogisticsTelematicsProvider {
  readonly adapterId = "lojistik-demo-telematics"
  readonly displayName = "Filo GPS & Soğuk Zincir Telemetri (Demo Veritabanı)"
  readonly mode = "demo-db" as const

  async listFleetTelemetry(branchId?: string): Promise<TelematikKonumVerisi[]> {
    const vehicles = await (prisma as any).lojistikVehicle
      ?.findMany?.(branchId ? { where: { branchId } } : undefined)
      .catch(() => [])

    if (Array.isArray(vehicles) && vehicles.length > 0) {
      const latestEvents = await (prisma as any).lojistikTelemetryEvent
        ?.findMany?.({ orderBy: { eventTime: "desc" }, take: 500 })
        .catch(() => [])

      const evtByVehicle = new Map<string, any>()
      if (Array.isArray(latestEvents)) {
        for (const ev of latestEvents) {
          if (!evtByVehicle.has(ev.vehicleId)) evtByVehicle.set(ev.vehicleId, ev)
        }
      }

      return vehicles.map((v: any, idx: number) => {
        const lastEv = evtByVehicle.get(v.id)
        const temp =
          typeof lastEv?.temperatureC === "number"
            ? lastEv.temperatureC
            : typeof v.currentTempC === "number"
              ? v.currentTempC
              : typeof v.currentTemperatureC === "number"
                ? v.currentTemperatureC
                : null
        const maxSafeTemp =
          typeof v.targetTempMaxC === "number"
            ? v.targetTempMaxC
            : typeof v.maxSafeTempC === "number"
              ? v.maxSafeTempC
              : v.isRefrigerated
                ? 6
                : 45
        const isWarn = temp !== null && temp > maxSafeTemp
        const speedKmh =
          typeof lastEv?.speedKmh === "number"
            ? lastEv.speedKmh
            : typeof v.currentSpeedKmh === "number"
              ? v.currentSpeedKmh
              : v.status === "IN_TRANSIT" || v.status === "SEVK_HALINDE"
                ? 48
                : 0
        return {
          vehicleId: v.id,
          plate: v.plate || `34 SNR ${700 + idx}`,
          lat: Number(lastEv?.lat ?? v.currentLat ?? DEMO_WAREHOUSE_COORDINATES["wh-merkez-01"].lat),
          lng: Number(lastEv?.lng ?? v.currentLng ?? DEMO_WAREHOUSE_COORDINATES["wh-merkez-01"].lng),
          speedKmh,
          headingDeg: Number(lastEv?.headingDeg ?? v.currentHeadingDeg ?? (idx * 75) % 360),
          temperatureCelsius: temp,
          humidityPercent: v.isRefrigerated ? 82 : null,
          doorOpen: false,
          engineRunning: Boolean(lastEv?.ignitionOn ?? speedKmh > 0),
          recordedAt: (lastEv?.eventTime || v.lastTelemetryAt || new Date()).toString(),
          status: isWarn
            ? "UYARI"
            : speedKmh > 5
              ? "HAREKETTE"
              : v.status === "IN_TRANSIT"
                ? "DURAKTA"
                : "BEKLEMEDE",
        }
      })
    }

    // Henüz LojistikVehicle tablosu tohumlanmamışsa mevcut EDocument / Transfer araçlarını oku
    const edocs = await (prisma as any).eDocumentRecord
      .findMany({ take: 5, orderBy: { dispatchDate: "desc" } })
      .catch(() => [])

    const seenPlates = new Set<string>()
    const derived: TelematikKonumVerisi[] = []
    const baseCoord = DEMO_WAREHOUSE_COORDINATES["wh-merkez-01"]
    const nowIso = new Date().toISOString()

    for (const doc of edocs) {
      const plate = String(doc.vehiclePlate || "").trim()
      if (!plate || seenPlates.has(plate)) continue
      seenPlates.add(plate)
      derived.push({
        vehicleId: `derived-${plate.replace(/\s+/g, "-")}`,
        plate,
        lat: baseCoord.lat + derived.length * 0.032,
        lng: baseCoord.lng - derived.length * 0.045,
        speedKmh: derived.length === 0 ? 44 : 0,
        headingDeg: 295,
        temperatureCelsius: 3.6,
        humidityPercent: 80,
        doorOpen: false,
        engineRunning: derived.length === 0,
        recordedAt: nowIso,
        status: derived.length === 0 ? "HAREKETTE" : "BEKLEMEDE",
      })
    }

    return derived
  }

  async getVehicleTelemetry(vehicleId: string): Promise<TelematikKonumVerisi | null> {
    const all = await this.listFleetTelemetry()
    return all.find((item) => item.vehicleId === vehicleId || item.plate === vehicleId) ?? null
  }

  async getColdChainAlerts(vehicleId?: string) {
    const all = await this.listFleetTelemetry()
    return all
      .filter((v) => !vehicleId || v.vehicleId === vehicleId)
      .filter((v) => v.temperatureCelsius !== null && v.temperatureCelsius > 6.0 && v.status === "UYARI")
      .map((v) => ({
        vehicleId: v.vehicleId,
        plate: v.plate,
        temperatureCelsius: v.temperatureCelsius as number,
        thresholdMaxCelsius: 6.0,
        severity: (v.temperatureCelsius as number) >= 8.0 ? ("CRITICAL" as const) : ("WARNING" as const),
        detectedAt: v.recordedAt,
      }))
  }
}

export class ExternalTelematicsProvider implements ILogisticsTelematicsProvider {
  readonly adapterId = "lojistik-external-telematics"
  readonly displayName = "Harici Telematik & GPS Sağlayıcısı (REST)"
  readonly mode = "external-rest" as const

  constructor(private readonly apiUrl: string) {}

  async listFleetTelemetry(branchId?: string): Promise<TelematikKonumVerisi[]> {
    if (!this.apiUrl || !this.apiUrl.startsWith("http")) {
      throw new Error("Harici Telematik API URL yapılandırması tanımlı değil.")
    }
    const qs = branchId ? `?branchId=${encodeURIComponent(branchId)}` : ""
    const res = await fetch(`${this.apiUrl.replace(/\/$/, "")}/telemetry/vehicles${qs}`)
    if (!res.ok) {
      throw new Error(`Telematik API hatası: HTTP ${res.status}`)
    }
    return await res.json()
  }

  async getVehicleTelemetry(vehicleId: string): Promise<TelematikKonumVerisi | null> {
    const all = await this.listFleetTelemetry()
    return all.find((v) => v.vehicleId === vehicleId) ?? null
  }

  async getColdChainAlerts(vehicleId?: string) {
    if (!this.apiUrl || !this.apiUrl.startsWith("http")) {
      throw new Error("Harici Telematik API URL yapılandırması eksik.")
    }
    const qs = vehicleId ? `?vehicleId=${encodeURIComponent(vehicleId)}` : ""
    const res = await fetch(`${this.apiUrl.replace(/\/$/, "")}/telemetry/alerts${qs}`)
    if (!res.ok) {
      throw new Error(`Telematik alarm API hatası: HTTP ${res.status}`)
    }
    return await res.json()
  }
}
