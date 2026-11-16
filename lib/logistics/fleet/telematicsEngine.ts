/**
 * Lojistik Faz 5 — Genel Telematik Entegrasyon Motoru
 *
 * Görevler:
 * 1. HMAC-SHA256 / Bearer / API Key imza & yetki doğrulaması (Demo OFF iken demo fallback kapalıdır)
 * 2. Deklaratif profil tabanlı normalize olay işleme (Traccar, flespi, GpsGate Cloud, Genel Webhook / CSV-JSON)
 * 3. Plaka / VIN <-> Sağlayıcı Cihaz ID eşleme çözümü
 * 4. Idempotent kayıt (idempotencyKey) & sıra dışı / bağlantı kopukluğu backfill koruması
 * 5. Hata günlüğü (LojistikTelematicErrorLog) & yönetim ekranı özeti
 *
 * NOT: Demo ortamında canlı API'lere bağlantı denenmez; olaylar demo veritabanındaki LojistikTelemetryEvent kayıtlarından okunur.
 */

import crypto from "node:crypto"
import { prisma } from "@/lib/db"
import { isDemoEnvironment } from "@/lib/config/production-feature-flags"
import { LogisticsDomainError, logLogisticsAudit } from "@/lib/logistics/security"
import {
  OFFICIAL_TELEMATICS_PROFILES,
  normalizePayloadWithProfile,
  type TelematicsFieldMapping,
} from "./telematicsProfiles"

export function getConfiguredTelematicsSecret(providerCode?: string): string {
  const code = String(providerCode || "GENERIC_WEBHOOK").toUpperCase()
  const specific = process.env[`LOJISTIK_TELEMATICS_${code}_SECRET`]
  if (specific && specific.trim()) return specific.trim()

  const globalSecret = process.env.LOJISTIK_TELEMATICS_SECRET
  if (globalSecret && globalSecret.trim()) return globalSecret.trim()

  return isDemoEnvironment() ? "sunum-demo-telematics-secret" : ""
}

export function signTelematicsWebhookPayload(rawBody: string, secret: string): string {
  return `sha256=${crypto.createHmac("sha256", secret).update(rawBody, "utf8").digest("hex")}`
}

export function verifyTelematicsWebhookAuth(params: {
  providerCode?: string
  rawBody: string
  headers: Headers
}): { verified: boolean; method: string; reason?: string } {
  const code = String(params.providerCode || "GENERIC_WEBHOOK").toUpperCase()
  const secret = getConfiguredTelematicsSecret(code)
  if (!secret) {
    return {
      verified: false,
      method: "NONE",
      reason: "Telematik webhook/API gizli anahtarı tanımlı değil ve demo fallback kapalı.",
    }
  }

  const sigHeader =
    params.headers.get("x-telematics-signature") ||
    params.headers.get("x-hub-signature-256") ||
    params.headers.get("x-webhook-signature")

  if (sigHeader) {
    const expected = signTelematicsWebhookPayload(params.rawBody, secret)
    const a = Buffer.from(sigHeader.trim(), "utf8")
    const b = Buffer.from(expected, "utf8")
    if (a.length === b.length && crypto.timingSafeEqual(a, b)) {
      return { verified: true, method: "HMAC_SHA256" }
    }
    return { verified: false, method: "HMAC_SHA256", reason: "HMAC imza doğrulaması başarısız." }
  }

  const tokenHeader =
    params.headers.get("x-api-key") ||
    params.headers.get("x-telematics-token") ||
    params.headers.get("authorization")

  if (tokenHeader) {
    const cleaned = tokenHeader
      .replace(/^Bearer\s+/i, "")
      .replace(/^FlespiToken\s+/i, "")
      .trim()
    const a = Buffer.from(cleaned, "utf8")
    const b = Buffer.from(secret, "utf8")
    if (a.length === b.length && crypto.timingSafeEqual(a, b)) {
      return { verified: true, method: "TOKEN_HEADER" }
    }
    return { verified: false, method: "TOKEN_HEADER", reason: "Sağlanan API token/anahtar geçersiz." }
  }

  return { verified: false, method: "MISSING", reason: "Yetkilendirme veya imza başlığı eksik." }
}

export async function listTelematicsIntegrationsOverview() {
  const dbAny = prisma as any
  const [connections, mappings, events, errors] = await Promise.all([
    dbAny.lojistikTelematicConnection.findMany().catch(() => []),
    dbAny.lojistikVehicleTelematicMap.findMany().catch(() => []),
    dbAny.lojistikTelemetryEvent.findMany({ orderBy: { eventTime: "desc" }, take: 200 }).catch(() => []),
    dbAny.lojistikTelematicErrorLog.findMany({ orderBy: { createdAt: "desc" }, take: 50 }).catch(() => []),
  ])

  const connMap = new Map<string, any>(
    connections.map((c: any) => [String(c.providerCode).toUpperCase(), c])
  )

  const demoActive = isDemoEnvironment()
  const providers = Object.values(OFFICIAL_TELEMATICS_PROFILES).map((prof) => {
    const dbConn = connMap.get(prof.providerCode)
    const provMaps = mappings.filter((m: any) => String(m.providerCode).toUpperCase() === prof.providerCode)
    const provEvents = events.filter((e: any) => String(e.providerCode).toUpperCase() === prof.providerCode)
    const provErrors = errors.filter((e: any) => String(e.providerCode).toUpperCase() === prof.providerCode)
    const latestEvt = provEvents[0]

    const configuredExternally = Boolean(dbConn?.baseUrl) || Boolean(process.env[`LOJISTIK_TELEMATICS_${prof.providerCode}_SECRET`])
    const connectionStatus = dbConn?.status
      ? dbConn.status
      : configuredExternally
        ? "CONFIGURED"
        : demoActive
          ? "DEMO_DB"
          : "AWAITING_CONFIG"

    return {
      providerCode: prof.providerCode,
      displayName: dbConn?.displayName || prof.displayName,
      protocolSummary: prof.protocolSummary,
      accessMethodSummary: prof.accessMethodSummary,
      authMethod: prof.authMethod,
      authHeaderExample: prof.authHeaderExample,
      docsUrl: prof.docsUrl,
      docsAccessDate: prof.docsAccessDate,
      isEnabled: dbConn ? Boolean(dbConn.isEnabled) : true,
      mode: configuredExternally ? "EXTERNAL_CONFIGURED" : demoActive ? "DEMO_DB" : "NOT_CONFIGURED",
      connectionStatus,
      baseUrl: dbConn?.baseUrl ?? null,
      customFieldMapping: dbConn?.fieldMappingJson ? safeJsonParse(dbConn.fieldMappingJson) : prof.fieldMapping,
      mappedVehicleCount: provMaps.filter((m: any) => m.isActive !== false).length,
      recentEventCount: provEvents.length,
      errorCount: provErrors.length,
      lastEventAt: latestEvt?.eventTime || dbConn?.lastEventAt || null,
      lastEventSourceOrigin: latestEvt?.sourceOrigin || (demoActive ? "DEMO_DB" : null),
    }
  })

  return {
    providers,
    mappings,
    recentEvents: events.slice(0, 60),
    errorLogs: errors,
    telemetryModeLabel: demoActive
      ? "Demo Veritabanı (Canlı cihaz bağlantısı yok — kayıtlar .local-db.json üzerinden okunur)"
      : "Üretim / Yapılandırılmış Alıcı",
  }
}

function safeJsonParse(raw: string): any {
  try {
    return JSON.parse(raw)
  } catch {
    return null
  }
}

export async function saveTelematicsConnectionConfig(params: {
  providerCode: string
  baseUrl?: string | null
  isEnabled?: boolean
  fieldMapping?: Partial<TelematicsFieldMapping> | null
  actorUserId: string
  actorName: string
}) {
  const code = String(params.providerCode || "").trim().toUpperCase()
  const baseProf = OFFICIAL_TELEMATICS_PROFILES[code]
  if (!baseProf) {
    throw new LogisticsDomainError(
      "VALIDATION_ERROR",
      `Desteklenmeyen veya onaylanmamış telematik profili: ${code}`,
      400
    )
  }

  const dbAny = prisma as any
  const existing = await dbAny.lojistikTelematicConnection.findFirst({ where: { providerCode: code } })
  const payload = {
    providerCode: code,
    displayName: baseProf.displayName,
    mode: params.baseUrl ? "REST_OR_WEBHOOK" : isDemoEnvironment() ? "DEMO_DB" : "WEBHOOK_GENERIC",
    authType: baseProf.authMethod,
    baseUrl: params.baseUrl?.trim() || null,
    isEnabled: params.isEnabled ?? true,
    status: params.isEnabled === false ? "DISABLED" : params.baseUrl ? "CONFIGURED" : isDemoEnvironment() ? "DEMO_DB" : "AWAITING_CONFIG",
    fieldMappingJson: params.fieldMapping ? JSON.stringify(params.fieldMapping) : existing?.fieldMappingJson || null,
    docsUrl: baseProf.docsUrl,
    docsAccessDate: baseProf.docsAccessDate,
    updatedAt: new Date(),
  }

  const saved = existing
    ? await dbAny.lojistikTelematicConnection.update({ where: { id: existing.id }, data: payload })
    : await dbAny.lojistikTelematicConnection.create({
        data: { id: `tel-conn-${code.toLowerCase()}`, ...payload, createdAt: new Date() },
      })

  await logLogisticsAudit({
    userId: params.actorUserId,
    action: "UPSERT_TELEMATICS_CONNECTION",
    resource: "lojistik_filo",
    resourceId: saved.id,
    moduleKey: "lojistik_filo",
    metadata: { providerCode: code, status: saved.status },
  })

  return saved
}

export async function upsertVehicleTelematicMapping(params: {
  vehicleId: string
  providerCode: string
  externalDeviceId: string
  externalVehicleRef?: string | null
  actorUserId: string
}) {
  const dbAny = prisma as any
  const vehicle = await dbAny.lojistikVehicle.findUnique({ where: { id: params.vehicleId } })
  if (!vehicle) {
    throw new LogisticsDomainError("NOT_FOUND", "Eşlenecek araç bulunamadı.", 404)
  }

  const code = String(params.providerCode || "").trim().toUpperCase()
  const extId = String(params.externalDeviceId || "").trim()
  if (!code || !extId) {
    throw new LogisticsDomainError("VALIDATION_ERROR", "Sağlayıcı kodu ve harici cihaz kimliği zorunludur.", 400)
  }

  if (!OFFICIAL_TELEMATICS_PROFILES[code]) {
    throw new LogisticsDomainError("VALIDATION_ERROR", `Tanımlı olmayan sağlayıcı profili: ${code}`, 400)
  }

  const collision = await dbAny.lojistikVehicleTelematicMap.findFirst({
    where: { providerCode: code, externalDeviceId: extId },
  })
  if (collision && collision.vehicleId !== vehicle.id) {
    throw new LogisticsDomainError(
      "CONFLICT",
      `Cihaz ID '${extId}' (${code}) zaten başka bir araca atanmış.`,
      409
    )
  }

  const existing = await dbAny.lojistikVehicleTelematicMap.findFirst({
    where: { vehicleId: vehicle.id, providerCode: code },
  })

  const recordData = {
    vehicleId: vehicle.id,
    providerCode: code,
    externalDeviceId: extId,
    externalVehicleRef: params.externalVehicleRef?.trim() || extId,
    plateSnapshot: vehicle.plate,
    vinSnapshot: vehicle.vin || null,
    isActive: true,
    updatedAt: new Date(),
  }

  const saved = existing
    ? await dbAny.lojistikVehicleTelematicMap.update({ where: { id: existing.id }, data: recordData })
    : await dbAny.lojistikVehicleTelematicMap.create({
        data: { id: `tel-map-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`, ...recordData, createdAt: new Date() },
      })

  await logLogisticsAudit({
    userId: params.actorUserId,
    action: "UPSERT_VEHICLE_TELEMATIC_MAP",
    resource: "lojistik_filo",
    resourceId: saved.id,
    moduleKey: "lojistik_filo",
    metadata: { vehicleId: vehicle.id, plate: vehicle.plate, providerCode: code, externalDeviceId: extId },
  })

  return saved
}

export async function ingestTelematicsPayloads(params: {
  providerCode: string
  payloads: Array<Record<string, any>>
  sourceOrigin?: "WEBHOOK" | "CSV_JSON_IMPORT" | "TELEMATICS_API" | "DEMO_DB"
  customFieldMapping?: Partial<TelematicsFieldMapping> | null
  actorUserId?: string
}) {
  const dbAny = prisma as any
  const code = String(params.providerCode || "GENERIC_WEBHOOK").trim().toUpperCase()
  const sourceOrigin = params.sourceOrigin || "WEBHOOK"

  if (!OFFICIAL_TELEMATICS_PROFILES[code]) {
    throw new LogisticsDomainError("VALIDATION_ERROR", `Desteklenmeyen sağlayıcı: ${code}`, 400)
  }

  const conn = await dbAny.lojistikTelematicConnection.findFirst({ where: { providerCode: code } }).catch(() => null)
  const connMapping = conn?.fieldMappingJson ? safeJsonParse(conn.fieldMappingJson) : null
  const mergedOverride = { ...(connMapping || {}), ...(params.customFieldMapping || {}) }

  const [vehicles, mappings, drivers] = await Promise.all([
    dbAny.lojistikVehicle.findMany(),
    dbAny.lojistikVehicleTelematicMap.findMany({ where: { providerCode: code } }),
    dbAny.lojistikDriver.findMany(),
  ])

  const vehicleById = new Map<string, any>(vehicles.map((v: any) => [v.id, v]))
  const mapByExtId = new Map<string, any>(mappings.map((m: any) => [String(m.externalDeviceId), m]))
  const driverByCodeOrTckn = new Map<string, any>()
  for (const d of drivers) {
    if (d.code) driverByCodeOrTckn.set(String(d.code), d)
    if (d.tckn) driverByCodeOrTckn.set(String(d.tckn), d)
    if (d.id) driverByCodeOrTckn.set(String(d.id), d)
  }

  let acceptedCount = 0
  let duplicateCount = 0
  let errorCount = 0
  let backfillCount = 0
  const ingestedEvents: any[] = []

  for (const raw of params.payloads) {
    const norm = normalizePayloadWithProfile(code, raw, mergedOverride)
    const extId = norm.externalDeviceId || norm.plateHint || norm.vinHint || "UNKNOWN"

    let targetVehicle: any = null
    const existingMap = norm.externalDeviceId ? mapByExtId.get(norm.externalDeviceId) : null
    if (existingMap) {
      targetVehicle = vehicleById.get(existingMap.vehicleId) || null
    }
    if (!targetVehicle && norm.plateHint) {
      targetVehicle = vehicles.find((v: any) => String(v.plate).toUpperCase() === norm.plateHint) || null
    }
    if (!targetVehicle && norm.vinHint) {
      targetVehicle = vehicles.find((v: any) => v.vin && String(v.vin).toUpperCase() === norm.vinHint) || null
    }

    if (!targetVehicle) {
      errorCount++
      await dbAny.lojistikTelematicErrorLog.create({
        data: {
          id: `tel-err-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
          providerCode: code,
          externalDeviceId: extId,
          eventType: norm.eventType,
          errorCode: "UNMAPPED_VEHICLE",
          errorMessage: `Cihaz/plaka (${extId}) sistemdeki bir araçla eşleştirilemedi.`,
          rawPayloadJson: JSON.stringify(raw).slice(0, 4000),
          createdAt: new Date(),
        },
      })
      continue
    }

    const evtIso = norm.eventTime.toISOString()
    const idempotencyKey = norm.externalEventId
      ? `${code}:${extId}:${norm.externalEventId}`
      : `${code}:${targetVehicle.id}:${norm.eventType}:${evtIso}`

    const existingDup = await dbAny.lojistikTelemetryEvent.findFirst({ where: { idempotencyKey } })
    if (existingDup) {
      duplicateCount++
      continue
    }

    const prevLastAt = targetVehicle.lastTelemetryAt ? new Date(targetVehicle.lastTelemetryAt) : null
    const ageMs = Date.now() - norm.eventTime.getTime()
    const isBackfill =
      norm.isBackfillHint ||
      (prevLastAt !== null && norm.eventTime.getTime() < prevLastAt.getTime()) ||
      ageMs > 15 * 60_000

    if (isBackfill) backfillCount++

    const resolvedDriver =
      (norm.driverRef ? driverByCodeOrTckn.get(norm.driverRef) : null) ||
      (targetVehicle.assignedDriverId ? drivers.find((d: any) => d.id === targetVehicle.assignedDriverId) : null)

    const effectiveType =
      targetVehicle.isRefrigerated &&
      norm.temperatureC !== null &&
      typeof targetVehicle.targetTempMaxC === "number" &&
      norm.temperatureC > targetVehicle.targetTempMaxC &&
      norm.eventType === "POSITION"
        ? "TEMP_ALERT"
        : norm.eventType

    const createdEvt = await dbAny.lojistikTelemetryEvent.create({
      data: {
        id: `tel-evt-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        vehicleId: targetVehicle.id,
        driverId: resolvedDriver?.id || targetVehicle.assignedDriverId || null,
        providerCode: code,
        externalDeviceId: extId,
        sourceOrigin,
        idempotencyKey,
        eventType: effectiveType,
        eventTime: norm.eventTime,
        receivedAt: new Date(),
        isBackfill,
        lat: norm.lat,
        lng: norm.lng,
        speedKmh: norm.speedKmh,
        headingDeg: norm.headingDeg,
        ignitionOn: norm.ignitionOn,
        fuelLevelLiters: norm.fuelLevelLiters,
        fuelLevelPct: norm.fuelLevelPct,
        odometerKm: norm.odometerKm,
        temperatureC: norm.temperatureC,
        idleMinutes: norm.idleMinutes,
        rawPayloadJson: JSON.stringify(raw).slice(0, 4000),
        createdAt: new Date(),
      },
    })

    // Yalnızca araçtaki son konum zamanından daha yeni veya ilk kayıt ise canlı araç fotoğrafını güncelle
    const isNewerThanLive = !prevLastAt || norm.eventTime.getTime() >= prevLastAt.getTime()
    const vehicleUpdate: Record<string, any> = { updatedAt: new Date() }

    if (norm.odometerKm !== null && norm.odometerKm > Number(targetVehicle.odometerKm || 0)) {
      vehicleUpdate.odometerKm = norm.odometerKm
      targetVehicle.odometerKm = norm.odometerKm
    }
    if (isNewerThanLive) {
      if (norm.lat !== null) vehicleUpdate.currentLat = norm.lat
      if (norm.lng !== null) vehicleUpdate.currentLng = norm.lng
      if (norm.speedKmh !== null) vehicleUpdate.currentSpeedKmh = norm.speedKmh
      if (norm.headingDeg !== null) vehicleUpdate.currentHeadingDeg = norm.headingDeg
      if (norm.temperatureC !== null) vehicleUpdate.currentTempC = norm.temperatureC
      vehicleUpdate.lastTelemetryAt = norm.eventTime
      vehicleUpdate.lastTelemetryProvider = sourceOrigin === "DEMO_DB" ? `DEMO (${code})` : code
      targetVehicle.lastTelemetryAt = norm.eventTime
    }

    await dbAny.lojistikVehicle.update({ where: { id: targetVehicle.id }, data: vehicleUpdate })

    if (existingMap) {
      await dbAny.lojistikVehicleTelematicMap.update({
        where: { id: existingMap.id },
        data: { lastSeenAt: new Date(), updatedAt: new Date() },
      })
    }

    acceptedCount++
    ingestedEvents.push(createdEvt)
  }

  if (conn && acceptedCount > 0) {
    await dbAny.lojistikTelematicConnection.update({
      where: { id: conn.id },
      data: { lastEventAt: new Date(), lastSyncAt: new Date(), updatedAt: new Date() },
    })
  }

  if (params.actorUserId) {
    await logLogisticsAudit({
      userId: params.actorUserId,
      action: "INGEST_TELEMATICS_BATCH",
      resource: "lojistik_filo",
      moduleKey: "lojistik_filo",
      metadata: { providerCode: code, sourceOrigin, acceptedCount, duplicateCount, errorCount, backfillCount },
    })
  }

  return {
    providerCode: code,
    sourceOrigin,
    acceptedCount,
    duplicateCount,
    errorCount,
    backfillCount,
    events: ingestedEvents,
  }
}
