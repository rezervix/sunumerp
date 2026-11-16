/**
 * Lojistik Faz 5 — Deklaratif Telematik Sağlayıcı Profilleri & Ortak Normalizasyon Motoru
 *
 * KURALLAR:
 * - Fiyat / ticari paket bedeli ASLA bu dosyaya, API yanıtına veya arayüze yazılmaz; yalnızca erişim şekli ve resmî doküman bağlantıları taşınır.
 * - Her profil SADECE resmî, herkese açık API dokümantasyonundaki doğrulanmış alanlara dayanır.
 * - Yeni sağlayıcı eklemek özel parser kodu yazmak değil, bu deklaratif profile yeni kayıt eklemektir.
 * - Bu dosya client-safe ve pure TypeScript'tir (fs/db import etmez).
 */

import type { NormalizedTelematicEventType } from "./constantsAndHelpers"

export type TelematicsAuthMethod = "BEARER" | "HEADER_TOKEN" | "HMAC_SHA256" | "API_KEY"

export interface TelematicsFieldMapping {
  deviceIdPaths: string[]
  platePaths?: string[]
  vinPaths?: string[]
  eventTypePaths?: string[]
  timestampPaths: string[]
  timestampFormat: "ISO" | "UNIX_SECONDS" | "UNIX_MS"
  latPaths: string[]
  lngPaths: string[]
  speedPaths: string[]
  speedUnit?: "KMH" | "KNOTS" | "MS"
  headingPaths?: string[]
  ignitionPaths?: string[]
  fuelLevelLitersPaths?: string[]
  fuelLevelPctPaths?: string[]
  odometerPaths?: string[]
  odometerUnit?: "KM" | "METERS"
  temperaturePaths?: string[]
  idleMinutesPaths?: string[]
  driverRefPaths?: string[]
  idempotencyPaths?: string[]
}

export interface TelematicsEventTypeMap {
  [externalType: string]: NormalizedTelematicEventType
}

export interface DeclarativeTelematicsProfile {
  providerCode: "TRACCAR" | "FLESPI" | "GPSGATE_CLOUD" | "GENERIC_WEBHOOK" | (string & {})
  displayName: string
  protocolSummary: string
  accessMethodSummary: string
  authMethod: TelematicsAuthMethod
  authHeaderExample: string
  docsUrl: string
  docsAccessDate: string
  fieldMapping: TelematicsFieldMapping
  eventTypeAliases: TelematicsEventTypeMap
}

export const OFFICIAL_TELEMATICS_PROFILES: Record<string, DeclarativeTelematicsProfile> = {
  TRACCAR: {
    providerCode: "TRACCAR",
    displayName: "Traccar (REST API & Webhook)",
    protocolSummary: "REST JSON (/api/devices, /api/positions) + WebSocket (/api/socket)",
    accessMethodSummary:
      "Müşteri kendi Traccar panelinden (Settings > Account > Token veya POST /api/session/token) self-servis Bearer Token alır; ek sözleşme veya onay gerekmez.",
    authMethod: "BEARER",
    authHeaderExample: "Authorization: Bearer <TRACCAR_USER_TOKEN>",
    docsUrl: "https://www.traccar.org/api-ref/",
    docsAccessDate: "2026-11-16",
    fieldMapping: {
      deviceIdPaths: ["deviceId", "uniqueId", "device.uniqueId", "device.id"],
      platePaths: ["device.name", "plate"],
      eventTypePaths: ["type", "event.type"],
      timestampPaths: ["fixTime", "deviceTime", "serverTime"],
      timestampFormat: "ISO",
      latPaths: ["latitude", "position.latitude"],
      lngPaths: ["longitude", "position.longitude"],
      speedPaths: ["speed", "position.speed"],
      speedUnit: "KMH",
      headingPaths: ["course", "position.course"],
      ignitionPaths: ["attributes.ignition", "ignition"],
      fuelLevelLitersPaths: ["attributes.fuelUsed", "attributes.fuelLiters"],
      fuelLevelPctPaths: ["attributes.fuel"],
      odometerPaths: ["attributes.odometer", "attributes.totalDistance"],
      odometerUnit: "METERS",
      temperaturePaths: ["attributes.temp1", "attributes.temperature"],
      driverRefPaths: ["attributes.driverUniqueId"],
      idempotencyPaths: ["id", "positionId"],
    },
    eventTypeAliases: {
      deviceMoving: "POSITION",
      deviceStopped: "IDLE_ALERT",
      deviceOverspeed: "SPEED_VIOLATION",
      ignitionOn: "IGNITION_ON",
      ignitionOff: "IGNITION_OFF",
      driverChanged: "DRIVER_IDENT",
      alarm: "HARSH_BRAKE",
    },
  },
  FLESPI: {
    providerCode: "FLESPI",
    displayName: "flespi (Gurtam Telematics Hub)",
    protocolSummary: "REST JSON (/gw/devices/{id}/telemetry) + HTTP Webhook / Stream Array",
    accessMethodSummary:
      "Müşteri flespi panelinden anında self-servis FlespiToken (ACL destekli) üretir; satış görüşmesi, NDA veya donanım kilidi yoktur.",
    authMethod: "HEADER_TOKEN",
    authHeaderExample: "Authorization: FlespiToken <FLESPI_TOKEN>",
    docsUrl: "https://flespi.io/docs/",
    docsAccessDate: "2026-11-16",
    fieldMapping: {
      deviceIdPaths: ["ident", "device.id"],
      platePaths: ["device.name", "plate"],
      eventTypePaths: ["event.type", "type"],
      timestampPaths: ["timestamp", "server.timestamp"],
      timestampFormat: "UNIX_SECONDS",
      latPaths: ["position.latitude", "latitude"],
      lngPaths: ["position.longitude", "longitude"],
      speedPaths: ["position.speed", "speed"],
      speedUnit: "KMH",
      headingPaths: ["position.direction", "direction"],
      ignitionPaths: ["engine.ignition.status", "ignition"],
      fuelLevelLitersPaths: ["fuel.volume", "can.fuel.consumed"],
      fuelLevelPctPaths: ["can.fuel.level", "fuel.level"],
      odometerPaths: ["vehicle.mileage", "can.vehicle.mileage"],
      odometerUnit: "KM",
      temperaturePaths: ["ble.sensor.temperature.1", "sensor.temperature.1"],
      driverRefPaths: ["ibutton.code", "tacho.driver.id"],
      idempotencyPaths: ["message.id", "id"],
    },
    eventTypeAliases: {
      overspeed: "SPEED_VIOLATION",
      harsh_braking: "HARSH_BRAKE",
      harsh_acceleration: "HARSH_ACCEL",
      idling: "IDLE_ALERT",
      refuel: "FUEL_REFILL",
    },
  },
  GPSGATE_CLOUD: {
    providerCode: "GPSGATE_CLOUD",
    displayName: "GpsGate Cloud (REST & OpenAPI)",
    protocolSummary: "REST JSON (/comGpsGate/api/v.1/applications/{appId}/users/{userId}/status)",
    accessMethodSummary:
      "Müşteri GpsGate Cloud panelinden (Manage Users > REST API Token) self-servis API token oluşturur.",
    authMethod: "HEADER_TOKEN",
    authHeaderExample: "Authorization: <GPSGATE_API_TOKEN>",
    docsUrl: "https://support.gpsgate.com/",
    docsAccessDate: "2026-11-16",
    fieldMapping: {
      deviceIdPaths: ["userId", "userName"],
      platePaths: ["displayName", "userName", "plate"],
      eventTypePaths: ["eventType", "type"],
      timestampPaths: ["trackPoint.utcTimestamp", "utcTimestamp"],
      timestampFormat: "ISO",
      latPaths: ["trackPoint.position.latitude", "position.latitude"],
      lngPaths: ["trackPoint.position.longitude", "position.longitude"],
      speedPaths: ["trackPoint.velocity.groundSpeed", "velocity.groundSpeed"],
      speedUnit: "KMH",
      headingPaths: ["trackPoint.velocity.heading", "velocity.heading"],
      ignitionPaths: ["trackPoint.variables.engineOn", "variables.engineOn"],
      fuelLevelPctPaths: ["trackPoint.variables.fuelLevel", "variables.fuelLevel"],
      fuelLevelLitersPaths: ["trackPoint.variables.fuelVolume"],
      odometerPaths: ["trackPoint.variables.odometer", "variables.odometer"],
      odometerUnit: "KM",
      temperaturePaths: ["trackPoint.variables.temperature", "variables.temperature"],
      driverRefPaths: ["trackPoint.variables.driverId", "variables.driverId"],
      idempotencyPaths: ["trackPoint.id", "eventId"],
    },
    eventTypeAliases: {
      Speeding: "SPEED_VIOLATION",
      Idling: "IDLE_ALERT",
      IgnitionOn: "IGNITION_ON",
      IgnitionOff: "IGNITION_OFF",
      FuelRefill: "FUEL_REFILL",
    },
  },
  GENERIC_WEBHOOK: {
    providerCode: "GENERIC_WEBHOOK",
    displayName: "Genel Webhook / CSV-JSON İçe Aktarma",
    protocolSummary: "İmzalı HTTP POST JSON Webhook veya CSV/JSON Toplu İçe Aktarma",
    accessMethodSummary:
      "Listede yer almayan sağlayıcılar için kullanıcı özel alan eşlemesi (JSON path) ve HMAC-SHA256 / API anahtarı tanımlanarak kullanılır.",
    authMethod: "HMAC_SHA256",
    authHeaderExample: "X-Telematics-Signature: sha256=<HMAC_HEX> veya X-Api-Key: <SECRET>",
    docsUrl: "internal://sunum-erp/telematics-generic-schema",
    docsAccessDate: "2026-11-16",
    fieldMapping: {
      deviceIdPaths: ["externalDeviceId", "deviceId", "device_id", "imei", "tid"],
      platePaths: ["plate", "vehiclePlate", "plaka"],
      vinPaths: ["vin", "chassisNo"],
      eventTypePaths: ["eventType", "event_type", "type"],
      timestampPaths: ["eventTime", "event_time", "timestamp", "recordedAt", "tst"],
      timestampFormat: "ISO",
      latPaths: ["lat", "latitude"],
      lngPaths: ["lng", "lon", "longitude"],
      speedPaths: ["speedKmh", "speed", "vel"],
      speedUnit: "KMH",
      headingPaths: ["headingDeg", "heading", "course", "cog"],
      ignitionPaths: ["ignitionOn", "ignition", "engineOn"],
      fuelLevelLitersPaths: ["fuelLevelLiters", "fuelLiters", "fuel_liters"],
      fuelLevelPctPaths: ["fuelLevelPct", "fuelPct", "fuel"],
      odometerPaths: ["odometerKm", "odometer", "km"],
      odometerUnit: "KM",
      temperaturePaths: ["temperatureC", "temperature", "tempC"],
      idleMinutesPaths: ["idleMinutes", "idle_minutes"],
      driverRefPaths: ["driverId", "driverRef", "driverTckn"],
      idempotencyPaths: ["idempotencyKey", "eventId", "id"],
    },
    eventTypeAliases: {
      POSITION: "POSITION",
      LOCATION: "POSITION",
      SPEED_VIOLATION: "SPEED_VIOLATION",
      OVERSPEED: "SPEED_VIOLATION",
      IGNITION_ON: "IGNITION_ON",
      IGNITION_OFF: "IGNITION_OFF",
      FUEL_LEVEL: "FUEL_LEVEL",
      FUEL_REFILL: "FUEL_REFILL",
      IDLE_ALERT: "IDLE_ALERT",
      HARSH_BRAKE: "HARSH_BRAKE",
      HARSH_ACCEL: "HARSH_ACCEL",
      DRIVER_IDENT: "DRIVER_IDENT",
      TEMP_ALERT: "TEMP_ALERT",
    },
  },
}

/**
 * Hem "position.latitude" gibi düz noktalı anahtar adlarını (flespi) hem de
 * "trackPoint.position.latitude" gibi iç içe nesne yollarını (GpsGate/Traccar) çözer.
 */
export function resolveDotPathValue(payload: any, pathExpr: string): unknown {
  if (!payload || typeof payload !== "object" || !pathExpr) return undefined
  if (Object.prototype.hasOwnProperty.call(payload, pathExpr)) {
    return payload[pathExpr]
  }
  const parts = pathExpr.split(".")
  let cur: any = payload
  for (const part of parts) {
    if (cur === null || cur === undefined || typeof cur !== "object") return undefined
    if (Object.prototype.hasOwnProperty.call(cur, part)) {
      cur = cur[part]
    } else {
      return undefined
    }
  }
  return cur
}

function pickFirstDefined(payload: any, paths?: string[]): unknown {
  if (!paths || paths.length === 0) return undefined
  for (const p of paths) {
    const val = resolveDotPathValue(payload, p)
    if (val !== undefined && val !== null && val !== "") return val
  }
  return undefined
}

function toFiniteNumber(val: unknown): number | null {
  if (val === undefined || val === null || val === "") return null
  const num = Number(val)
  return Number.isFinite(num) ? num : null
}

function toBooleanOrNull(val: unknown): boolean | null {
  if (typeof val === "boolean") return val
  if (typeof val === "number") return val !== 0
  if (typeof val === "string") {
    const norm = val.trim().toLowerCase()
    if (["true", "1", "on", "yes", "acik"].includes(norm)) return true
    if (["false", "0", "off", "no", "kapali"].includes(norm)) return false
  }
  return null
}

function parseTelemetryTimestamp(
  raw: unknown,
  formatHint: TelematicsFieldMapping["timestampFormat"]
): Date {
  if (raw instanceof Date && !Number.isNaN(raw.getTime())) return raw
  if (typeof raw === "number" && Number.isFinite(raw)) {
    if (formatHint === "UNIX_SECONDS" || raw < 10_000_000_000) {
      return new Date(raw * 1000)
    }
    return new Date(raw)
  }
  if (typeof raw === "string" && raw.trim()) {
    const numeric = Number(raw.trim())
    if (Number.isFinite(numeric)) {
      return numeric < 10_000_000_000 ? new Date(numeric * 1000) : new Date(numeric)
    }
    const parsed = new Date(raw.trim())
    if (!Number.isNaN(parsed.getTime())) return parsed
  }
  return new Date()
}

export interface NormalizedTelematicsPayload {
  providerCode: string
  externalDeviceId: string
  plateHint: string | null
  vinHint: string | null
  eventType: NormalizedTelematicEventType
  eventTime: Date
  lat: number | null
  lng: number | null
  speedKmh: number | null
  headingDeg: number | null
  ignitionOn: boolean | null
  fuelLevelLiters: number | null
  fuelLevelPct: number | null
  odometerKm: number | null
  temperatureC: number | null
  idleMinutes: number | null
  driverRef: string | null
  externalEventId: string | null
  isBackfillHint: boolean
}

export function normalizePayloadWithProfile(
  providerCodeInput: string,
  rawPayload: Record<string, any>,
  customMappingOverride?: Partial<TelematicsFieldMapping> | null,
  speedViolationThresholdKmh = 110
): NormalizedTelematicsPayload {
  const code = String(providerCodeInput || "GENERIC_WEBHOOK").toUpperCase()
  const baseProfile =
    OFFICIAL_TELEMATICS_PROFILES[code] ?? OFFICIAL_TELEMATICS_PROFILES.GENERIC_WEBHOOK

  const mapping: TelematicsFieldMapping = {
    ...baseProfile.fieldMapping,
    ...(customMappingOverride ?? {}),
  }

  const externalDeviceIdRaw = pickFirstDefined(rawPayload, mapping.deviceIdPaths)
  const plateHintRaw = pickFirstDefined(rawPayload, mapping.platePaths)
  const vinHintRaw = pickFirstDefined(rawPayload, mapping.vinPaths)

  const rawTs = pickFirstDefined(rawPayload, mapping.timestampPaths)
  const eventTime = parseTelemetryTimestamp(rawTs, mapping.timestampFormat)

  const lat = toFiniteNumber(pickFirstDefined(rawPayload, mapping.latPaths))
  const lng = toFiniteNumber(pickFirstDefined(rawPayload, mapping.lngPaths))

  let speedKmh = toFiniteNumber(pickFirstDefined(rawPayload, mapping.speedPaths))
  if (speedKmh !== null && mapping.speedUnit === "KNOTS") {
    speedKmh = Number((speedKmh * 1.852).toFixed(2))
  } else if (speedKmh !== null && mapping.speedUnit === "MS") {
    speedKmh = Number((speedKmh * 3.6).toFixed(2))
  }

  const headingDeg = toFiniteNumber(pickFirstDefined(rawPayload, mapping.headingPaths))
  const ignitionOn = toBooleanOrNull(pickFirstDefined(rawPayload, mapping.ignitionPaths))
  const fuelLevelLiters = toFiniteNumber(pickFirstDefined(rawPayload, mapping.fuelLevelLitersPaths))
  const fuelLevelPct = toFiniteNumber(pickFirstDefined(rawPayload, mapping.fuelLevelPctPaths))

  let odometerKm = toFiniteNumber(pickFirstDefined(rawPayload, mapping.odometerPaths))
  if (odometerKm !== null && mapping.odometerUnit === "METERS") {
    odometerKm = Number((odometerKm / 1000).toFixed(2))
  }

  const temperatureC = toFiniteNumber(pickFirstDefined(rawPayload, mapping.temperaturePaths))
  const idleMinutes = toFiniteNumber(pickFirstDefined(rawPayload, mapping.idleMinutesPaths))
  const driverRefRaw = pickFirstDefined(rawPayload, mapping.driverRefPaths)
  const externalEventIdRaw = pickFirstDefined(rawPayload, mapping.idempotencyPaths)

  const rawTypeVal = pickFirstDefined(rawPayload, mapping.eventTypePaths)
  let eventType: NormalizedTelematicEventType = "POSITION"
  if (rawTypeVal) {
    const typeKey = String(rawTypeVal).trim()
    const mapped =
      baseProfile.eventTypeAliases[typeKey] ??
      baseProfile.eventTypeAliases[typeKey.toUpperCase()] ??
      OFFICIAL_TELEMATICS_PROFILES.GENERIC_WEBHOOK.eventTypeAliases[typeKey.toUpperCase()]
    if (mapped) {
      eventType = mapped
    }
  } else if (speedKmh !== null && speedKmh > speedViolationThresholdKmh) {
    eventType = "SPEED_VIOLATION"
  } else if (idleMinutes !== null && idleMinutes > 0) {
    eventType = "IDLE_ALERT"
  } else if (ignitionOn === false && (speedKmh === null || speedKmh === 0)) {
    eventType = "IGNITION_OFF"
  } else if (fuelLevelLiters !== null && lat === null && lng === null) {
    eventType = "FUEL_LEVEL"
  }

  return {
    providerCode: code,
    externalDeviceId: externalDeviceIdRaw !== undefined ? String(externalDeviceIdRaw) : "",
    plateHint: plateHintRaw ? String(plateHintRaw).trim().toUpperCase() : null,
    vinHint: vinHintRaw ? String(vinHintRaw).trim().toUpperCase() : null,
    eventType,
    eventTime,
    lat,
    lng,
    speedKmh,
    headingDeg,
    ignitionOn,
    fuelLevelLiters,
    fuelLevelPct,
    odometerKm,
    temperatureC,
    idleMinutes,
    driverRef: driverRefRaw ? String(driverRefRaw) : null,
    externalEventId: externalEventIdRaw !== undefined ? String(externalEventIdRaw) : null,
    isBackfillHint: Boolean(rawPayload.isBackfill || rawPayload.backfill),
  }
}
