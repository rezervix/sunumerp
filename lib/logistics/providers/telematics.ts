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
    // Faz 4'te eklenen LojistikVehicle koleksiyonu varsa doğrudan oradan oku
    const vehicles = await (prisma as any).lojistikVehicle
      ?.findMany?.(branchId ? { where: { branchId } } : undefined)
      .catch(() => [])

    const now = new Date().toISOString()

    if (Array.isArray(vehicles) && vehicles.length > 0) {
      return vehicles.map((v: any, idx: number) => {
        const temp =
          typeof v.currentTemperatureC === "number"
            ? v.currentTemperatureC
            : v.isRefrigerated
              ? 3.4
              : 18.2
        const maxSafeTemp =
          typeof v.maxSafeTempC === "number" ? v.maxSafeTempC : v.isRefrigerated ? 6 : 25
        const isWarn = temp > maxSafeTemp
        return {
          vehicleId: v.id,
          plate: v.plate || `34 SNR ${700 + idx}`,
          lat: Number(v.currentLat ?? DEMO_WAREHOUSE_COORDINATES["wh-merkez-01"].lat),
          lng: Number(v.currentLng ?? DEMO_WAREHOUSE_COORDINATES["wh-merkez-01"].lng),
          speedKmh: v.status === "SEVK_HALINDE" ? 48 : 0,
          headingDeg: (idx * 75) % 360,
          temperatureCelsius: temp,
          humidityPercent: v.isRefrigerated ? 82 : 55,
          doorOpen: false,
          engineRunning: v.status === "SEVK_HALINDE",
          recordedAt: now,
          status: isWarn
            ? "UYARI"
            : v.status === "SEVK_HALINDE"
              ? "HAREKETTE"
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
        recordedAt: now,
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
