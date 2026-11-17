/**
 * Lojistik Faz 6 (lojistik_sevkiyat_rota) — Sunucu Servis Katmanı
 *
 * A) Sefer / Yük Planlama (kapasite kg/m³/palet/soğuk zincir + şoför vardiya/ehliyet kontrolü)
 * B) Çok Duraklı CVRPTW Rota Optimizasyonu + Arka Plan İlerleme İşleri + Mesafe Matrisi Adaptörü
 * C) Planlanan vs Gerçekleşen ETA, Sürükle-Bırak Sıra Değişikliği & Dinamik Yeniden Planlama
 * D) Sürücü Mobil Yürütme & e-POD Teslimat Kanıtı (Fotoğraf / İmza / Not / Konum / Checksum)
 * E) Kimlik Doğrulamasız, Tahmin Edilemez (192-bit CSPRNG) ve Süreli Müşteri Takip Bağlantısı
 * F) Sefer Onayında Otomatik E-İrsaliye (EDocumentRecord / GibIntegrator) Tetikleyicisi
 * G) Gerçek Kayıtlardan Hesaplanan Sevkiyat & Rota KPI Göstergeleri
 */

import crypto from "node:crypto"
import { prisma } from "@/lib/db"
import { DEMO_WAREHOUSE_COORDINATES } from "@/lib/logistics/constants"
import { createLogisticsProviders } from "@/lib/logistics/providers"
import { resolveDistanceDurationMatrixWithAdapter } from "@/lib/logistics/providers/routing"
import { releaseStockReservation } from "@/lib/logistics/wms/reservationAndFefo"
import { LogisticsDomainError, logLogisticsAudit } from "@/lib/logistics/security"
import { getServerLogisticsInvoiceTiming } from "@/lib/system-config"
import {
  canTransitionDispatchTripStatus,
  computeDispatchKpis,
  DISPATCH_FAILURE_REASON_LABELS,
  evaluateDriverVehicleCompatibility,
  evaluateVehicleCapacityLoad,
  type DispatchFailureReasonCode,
  type DispatchStopSourceType,
  type DispatchStopStatus,
  type DispatchTripStatus,
} from "./constantsAndHelpers"
import {
  optimizeSingleTripRoute,
  planMultiVehicleTrips,
  recalculateFixedStopSequence,
  type SolverStopInput,
} from "./cvrptwSolver"

// Türkiye müşteri şehir/ilçe koordinat çözümleyicisi (veride açık lat/lng yoksa şehirden türetir)
const CITY_DISTRICT_COORDS: Array<{ pattern: RegExp; lat: number; lng: number }> = [
  { pattern: /sarıyer|maslak/i, lat: 41.1086, lng: 29.0209 },
  { pattern: /kağıthane/i, lat: 41.0802, lng: 28.9721 },
  { pattern: /beşiktaş|nispetiye|levent/i, lat: 41.0695, lng: 29.0085 },
  { pattern: /üsküdar|kuzguncuk|nakkaştepe/i, lat: 41.0315, lng: 29.0352 },
  { pattern: /maltepe|cevizli/i, lat: 40.9225, lng: 29.1552 },
  { pattern: /şişli|mecidiyeköy|kuştepe/i, lat: 41.0672, lng: 28.9922 },
  { pattern: /pendik|yenişehir/i, lat: 40.9165, lng: 29.2981 },
  { pattern: /kadıköy|fikirtepe/i, lat: 40.9904, lng: 29.0365 },
  { pattern: /ataşehir|içerenköy/i, lat: 40.9833, lng: 29.1277 },
  { pattern: /ümraniye|dudullu/i, lat: 41.0165, lng: 29.1248 },
  { pattern: /tuzla/i, lat: 40.8245, lng: 29.3189 },
  { pattern: /gebze|çayırova|kocaeli/i, lat: 40.8027, lng: 29.4307 },
  { pattern: /çankaya|kızılay|ankara|altındağ/i, lat: 39.9208, lng: 32.8541 },
  { pattern: /izmir|çiğli|alsancak|bornova/i, lat: 38.4415, lng: 27.1422 },
  { pattern: /bursa|nilüfer|gemlik/i, lat: 40.1951, lng: 29.0488 },
]

export function inferCoordinatesFromAddress(
  addressText?: string | null,
  cityHint?: string | null,
  fallbackIndex = 0
): { lat: number; lng: number } {
  const combined = `${addressText || ""} ${cityHint || ""}`.trim()
  for (const entry of CITY_DISTRICT_COORDS) {
    if (entry.pattern.test(combined)) {
      return { lat: entry.lat, lng: entry.lng }
    }
  }
  const offset = (fallbackIndex % 7) * 0.018
  return {
    lat: Number((41.0082 + offset).toFixed(4)),
    lng: Number((29.0412 + offset * 0.7).toFixed(4)),
  }
}

export function generateSecureTrackingToken(): string {
  return crypto.randomBytes(24).toString("base64url")
}

function getWarehouseOrigin(warehouseId?: string | null, warehouse?: any) {
  const id = warehouseId || "wh-merkez-01"
  const known = DEMO_WAREHOUSE_COORDINATES[id]
  if (known) {
    return {
      warehouseId: id,
      label: warehouse?.name || known.label,
      lat: known.lat,
      lng: known.lng,
    }
  }
  return {
    warehouseId: id,
    label: warehouse?.name || "Merkez Lojistik Deposu",
    lat: 40.8245,
    lng: 29.3189,
  }
}

async function appendTrackingEvent(params: {
  tripId: string
  stopId?: string | null
  eventType: string
  actorUserId?: string | null
  actorName?: string | null
  message: string
  lat?: number | null
  lng?: number | null
  metadata?: Record<string, unknown>
}) {
  const dbAny = prisma as any
  return await dbAny.lojistikTrackingEvent.create({
    data: {
      id: `tev-trp-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      tripId: params.tripId,
      stopId: params.stopId ?? null,
      eventType: params.eventType,
      actorUserId: params.actorUserId ?? null,
      actorName: params.actorName ?? null,
      message: params.message,
      lat: params.lat ?? null,
      lng: params.lng ?? null,
      metadataJson: params.metadata ? JSON.stringify(params.metadata) : null,
      createdAt: new Date(),
    },
  })
}

export async function listDispatchOverviewAndReadyPool(params?: {
  branchId?: string
  status?: string
}) {
  const dbAny = prisma as any
  const [
    trips,
    stops,
    proofs,
    optJobs,
    trackingEvents,
    vehicles,
    drivers,
    warehouses,
    omniOrders,
    erpOrders,
    customers,
    wmsTasks,
    transfers,
    eDocuments,
  ] = await Promise.all([
    dbAny.lojistikShipmentTrip.findMany().catch(() => []),
    dbAny.lojistikShipmentStop.findMany().catch(() => []),
    dbAny.lojistikDeliveryProof.findMany().catch(() => []),
    dbAny.lojistikRouteOptimizationJob.findMany().catch(() => []),
    dbAny.lojistikTrackingEvent.findMany().catch(() => []),
    dbAny.lojistikVehicle.findMany().catch(() => []),
    dbAny.lojistikDriver.findMany().catch(() => []),
    dbAny.warehouse.findMany().catch(() => []),
    dbAny.omnichannelOrder.findMany().catch(() => []),
    dbAny.order.findMany().catch(() => []),
    dbAny.customer.findMany().catch(() => []),
    dbAny.wmsTask.findMany().catch(() => []),
    dbAny.warehouseTransferOrder.findMany().catch(() => []),
    dbAny.eDocumentRecord.findMany().catch(() => []),
  ])

  const custById = new Map<string, any>(customers.map((c: any) => [c.id, c]))
  const vehById = new Map<string, any>(vehicles.map((v: any) => [v.id, v]))
  const drvById = new Map<string, any>(drivers.map((d: any) => [d.id, d]))
  const stopsByTrip = new Map<string, any[]>()
  for (const s of stops) {
    const arr = stopsByTrip.get(s.tripId) || []
    arr.push(s)
    stopsByTrip.set(s.tripId, arr)
  }
  const proofsByStop = new Map<string, any[]>()
  for (const p of proofs) {
    const arr = proofsByStop.get(p.stopId) || []
    arr.push({
      ...p,
      photoFileUrls: (() => {
        try {
          return JSON.parse(p.photoFileUrlsJson || "[]")
        } catch {
          return []
        }
      })(),
    })
    proofsByStop.set(p.stopId, arr)
  }

  let filteredTrips = trips
  if (params?.branchId) {
    filteredTrips = filteredTrips.filter((t: any) => t.branchId === params.branchId)
  }
  if (params?.status) {
    filteredTrips = filteredTrips.filter((t: any) => t.status === params.status)
  }

  const enrichedTrips = filteredTrips
    .sort((a: any, b: any) => new Date(b.plannedDepartureAt).getTime() - new Date(a.plannedDepartureAt).getTime())
    .map((t: any) => {
      const tripStops = (stopsByTrip.get(t.id) || [])
        .sort((a: any, b: any) => Number(a.sequenceNo) - Number(b.sequenceNo))
        .map((s: any) => ({
          ...s,
          proofs: proofsByStop.get(s.id) || [],
        }))
      const veh = t.vehicleId ? vehById.get(t.vehicleId) : null
      const drv = t.driverId ? drvById.get(t.driverId) : null
      const tripJobs = optJobs
        .filter((j: any) => j.tripId === t.id)
        .sort((a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      const tripEvents = trackingEvents
        .filter((e: any) => e.tripId === t.id)
        .sort((a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      let polyline: Array<[number, number]> = []
      try {
        polyline = t.polylineJson ? JSON.parse(t.polylineJson) : []
      } catch {
        polyline = []
      }
      return {
        ...t,
        vehicleSummary: veh
          ? {
              id: veh.id,
              plate: veh.plate,
              brandModel: `${veh.brand} ${veh.model}`,
              vehicleType: veh.vehicleType,
              capacityKg: veh.capacityKg,
              capacityM3: veh.capacityM3,
              palletSlots: veh.palletSlots,
              isRefrigerated: Boolean(veh.isRefrigerated),
              status: veh.status,
            }
          : null,
        driverSummary: drv
          ? {
              id: drv.id,
              fullName: drv.fullName,
              licenseClass: drv.licenseClass,
              shiftStart: drv.shiftStart,
              shiftEnd: drv.shiftEnd,
              status: drv.status,
            }
          : null,
        stops: tripStops,
        latestOptJob: tripJobs[0] || null,
        events: tripEvents,
        polyline,
      }
    })

  // Hangi kaynaklar aktif bir sefere bağlanmış?
  const dispatchedSourceKeys = new Set<string>()
  for (const s of stops) {
    const parentTrip = trips.find((t: any) => t.id === s.tripId)
    if (parentTrip && parentTrip.status !== "IPTAL" && s.sourceId) {
      dispatchedSourceKeys.add(`${s.sourceType}:${s.sourceId}`)
    }
  }

  // Hazır Sipariş ve Görev Havuzu (Sefer planlamaya hazır)
  const readyPool: any[] = []
  let idxCounter = 0

  for (const ord of omniOrders) {
    if (dispatchedSourceKeys.has(`OMNICHANNEL_ORDER:${ord.id}`)) continue
    if (ord.status === "DELIVERED" || ord.status === "CANCELLED") continue
    const coords =
      typeof ord.shippingLat === "number" && typeof ord.shippingLng === "number"
        ? { lat: ord.shippingLat, lng: ord.shippingLng }
        : inferCoordinatesFromAddress(ord.shippingAddress, ord.customerCity, idxCounter++)
    readyPool.push({
      sourceType: "OMNICHANNEL_ORDER" as DispatchStopSourceType,
      sourceId: ord.id,
      sourceRefNo: ord.orderNumber,
      customerName: ord.customerName,
      addressText: ord.shippingAddress || `${ord.customerCity} Teslimat Adresi`,
      cityDistrict: ord.customerCity,
      lat: coords.lat,
      lng: coords.lng,
      weightKg: Number(ord.estimatedWeightKg ?? 180),
      volumeM3: Number(ord.estimatedVolumeM3 ?? 1.4),
      palletCount: Number(ord.palletCount ?? 1),
      requiresColdChain: true,
      timeWindowStart: ord.timeWindowStart || "09:00",
      timeWindowEnd: ord.timeWindowEnd || "15:00",
      serviceMinutes: 12,
      status: ord.status,
      channelCode: ord.channelCode,
    })
  }

  for (const ord of erpOrders) {
    if (dispatchedSourceKeys.has(`ERP_ORDER:${ord.id}`)) continue
    if (!["approved", "in-progress"].includes(String(ord.status))) continue
    const cust = ord.customerId ? custById.get(ord.customerId) : null
    const addr = cust?.address || ord.title || "İstanbul Merkez Teslimatı"
    const coords = inferCoordinatesFromAddress(addr, cust?.city, idxCounter++)
    readyPool.push({
      sourceType: "ERP_ORDER" as DispatchStopSourceType,
      sourceId: ord.id,
      sourceRefNo: ord.orderNumber || ord.id,
      customerId: ord.customerId || null,
      customerName: cust?.name || ord.customerName || ord.companyName || "ERP Müşterisi",
      contactPhone: cust?.phone || ord.customerPhone || null,
      addressText: addr,
      cityDistrict: cust?.city || (addr.includes("/") ? addr.split(",").pop()?.trim() : "İstanbul"),
      lat: coords.lat,
      lng: coords.lng,
      weightKg: Math.max(40, Number(ord.quantity || 12) * 18),
      volumeM3: Number(Math.max(0.5, Number(ord.quantity || 12) * 0.12).toFixed(2)),
      palletCount: Math.max(1, Math.ceil(Number(ord.quantity || 12) / 20)),
      requiresColdChain: /çiçek|gül|buket|orkide|lilyum/i.test(String(ord.title || ord.description || "")),
      timeWindowStart: "09:30",
      timeWindowEnd: "16:30",
      serviceMinutes: 10,
      status: ord.status,
      channelCode: "ERP_SIPARIS",
    })
  }

  for (const trf of transfers) {
    if (dispatchedSourceKeys.has(`WMS_TRANSFER:${trf.id}`)) continue
    if (trf.status === "RECEIVED" || trf.status === "CANCELLED") continue
    const destCoord = DEMO_WAREHOUSE_COORDINATES[trf.toWarehouseId] || DEMO_WAREHOUSE_COORDINATES["wh-kadikoy-02"]
    readyPool.push({
      sourceType: "WMS_TRANSFER" as DispatchStopSourceType,
      sourceId: trf.id,
      sourceRefNo: trf.transferNumber,
      customerName: `Şube/Depo Transfer (${destCoord.code})`,
      addressText: destCoord.label,
      cityDistrict: destCoord.code,
      lat: destCoord.lat,
      lng: destCoord.lng,
      weightKg: 320,
      volumeM3: 2.2,
      palletCount: 2,
      requiresColdChain: true,
      timeWindowStart: "08:30",
      timeWindowEnd: "13:00",
      serviceMinutes: 15,
      status: trf.status,
      channelCode: "WMS_TRANSFER",
    })
  }

  for (const t of wmsTasks) {
    if (dispatchedSourceKeys.has(`WMS_WAVE:${t.id}`)) continue
    if (!["WAVE_PICK", "PACKING"].includes(String(t.workflowStage))) continue
    if (t.status === "CANCELLED") continue
    const coords = inferCoordinatesFromAddress("Ataşehir Hub", null, idxCounter++)
    readyPool.push({
      sourceType: "WMS_WAVE" as DispatchStopSourceType,
      sourceId: t.id,
      sourceRefNo: t.taskNumber,
      customerName: `WMS Çıkış Dalgası (${t.waveNumber || t.taskNumber})`,
      addressText: "PACK-STAGING-01 → Dağıtım Rotası",
      cityDistrict: "İstanbul",
      lat: coords.lat,
      lng: coords.lng,
      weightKg: 210,
      volumeM3: 1.6,
      palletCount: 1,
      requiresColdChain: false,
      timeWindowStart: "10:00",
      timeWindowEnd: "17:00",
      serviceMinutes: 12,
      status: t.status,
      channelCode: "WMS_DALGA",
    })
  }

  const kpis = computeDispatchKpis(trips, stops, proofs)
  const providers = createLogisticsProviders()

  return {
    kpis,
    trips: enrichedTrips,
    readyPool,
    vehicles: vehicles
      .filter((v: any) => v.isActive !== false)
      .map((v: any) => ({
        id: v.id,
        code: v.code,
        plate: v.plate,
        brandModel: `${v.brand} ${v.model}`,
        vehicleType: v.vehicleType,
        status: v.status,
        capacityKg: v.capacityKg,
        capacityM3: v.capacityM3,
        palletSlots: v.palletSlots,
        isRefrigerated: Boolean(v.isRefrigerated),
        assignedDriverId: v.assignedDriverId || null,
      })),
    drivers: drivers
      .filter((d: any) => d.isActive !== false)
      .map((d: any) => ({
        id: d.id,
        code: d.code,
        fullName: d.fullName,
        licenseClass: d.licenseClass,
        shiftName: d.shiftName,
        shiftStart: d.shiftStart,
        shiftEnd: d.shiftEnd,
        status: d.status,
        licenseExpiresAt: d.licenseExpiresAt,
      })),
    warehouses: warehouses.map((w: any) => {
      const origin = getWarehouseOrigin(w.id, w)
      return { id: w.id, code: w.code, name: w.name, lat: origin.lat, lng: origin.lng }
    }),
    optJobs: optJobs
      .sort((a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .slice(0, 20),
    dispatchEDocuments: eDocuments.filter((d: any) => Boolean(d.shipmentTripId)),
    adapterStatus: {
      routingMode: providers.config.routingMode,
      routingEngine: process.env.LOJISTIK_ROUTING_ENGINE || "LOCAL_COORDINATE",
      routingConfigured: Boolean(process.env.LOJISTIK_ROUTING_API_URL || process.env.LOJISTIK_ROUTING_API_KEY),
      eDocumentMode: providers.config.eDocumentMode,
      eDocumentConfigured: Boolean(providers.config.eDocumentApiUrl),
      storageMode: providers.config.storageMode,
    },
    failureReasons: DISPATCH_FAILURE_REASON_LABELS,
    invoiceTimingConfig: getServerLogisticsInvoiceTiming(),
  }
}

/**
 * Açık kritik arızası veya aktif bakım iş emri olan araç ID'lerini döndürür.
 */
async function getCriticalFleetBlockers(): Promise<Set<string>> {
  const dbAny = prisma as any
  const [faults, workOrders] = await Promise.all([
    dbAny.lojistikVehicleFaultLog.findMany().catch(() => []),
    dbAny.lojistikVehicleMaintenanceWorkOrder.findMany().catch(() => []),
  ])
  const blocked = new Set<string>()
  for (const f of faults) {
    if (f.vehicleId && f.status !== "RESOLVED" && f.status !== "CLOSED" && String(f.severity || "").toUpperCase() === "CRITICAL") {
      blocked.add(f.vehicleId)
    }
  }
  for (const w of workOrders) {
    if (w.vehicleId && w.status === "IN_PROGRESS") {
      blocked.add(w.vehicleId)
    }
  }
  return blocked
}

/**
 * Araç arıza/bakım durumunun açık seferlere etkisini bildirir.
 * Kural: Mevcut seferler ASLA otomatik silinmez veya değiştirilmez; yalnızca uyarı bayrağı ve olay kaydı işlenir.
 */
export async function syncVehicleMaintenanceImpactToDispatchTrips(params: {
  vehicleId: string
  reason: string
  severity?: string
  resolved?: boolean
  actorUserId?: string
}) {
  const dbAny = prisma as any
  const openTrips = await dbAny.lojistikShipmentTrip
    .findMany({
      where: { vehicleId: params.vehicleId },
    })
    .catch(() => [])

  const affected = openTrips.filter((t: any) =>
    ["TASLAK", "ONAYLANDI", "YUKLENIYOR", "YOLDA", "TESLIMAT_SURUYOR"].includes(t.status)
  )
  const impactedTrips: any[] = []

  if (params.resolved) {
    const blockers = await getCriticalFleetBlockers()
    const veh = await dbAny.lojistikVehicle.findUnique({ where: { id: params.vehicleId } }).catch(() => null)
    const stillBlocked =
      blockers.has(params.vehicleId) ||
      (veh && ["FAULT", "MAINTENANCE", "OUT_OF_SERVICE"].includes(veh.status))
    if (!stillBlocked) {
      for (const trip of affected) {
        if (trip.maintenanceImpactWarning) {
          await dbAny.lojistikShipmentTrip
            .update({
              where: { id: trip.id },
              data: { maintenanceImpactWarning: null, updatedAt: new Date() },
            })
            .catch(() => null)
        }
      }
    }
    return { impactedTripCount: 0, impactedTrips: [] }
  }

  for (const trip of affected) {
    await dbAny.lojistikShipmentTrip
      .update({
        where: { id: trip.id },
        data: { maintenanceImpactWarning: params.reason, updatedAt: new Date() },
      })
      .catch(() => null)
    await appendTrackingEvent({
      tripId: trip.id,
      eventType: "VEHICLE_MAINTENANCE_IMPACT",
      actorUserId: params.actorUserId || "system",
      actorName: "Filo & Bakım Entegrasyonu",
      message: `Araç uyarısı (${trip.vehiclePlate || params.vehicleId}): ${params.reason}. Başka araca manuel devir önerilir.`,
      metadata: { severity: params.severity || "HIGH", vehicleId: params.vehicleId },
    })
    impactedTrips.push({
      id: trip.id,
      tripNumber: trip.tripNumber,
      title: trip.title,
      status: trip.status,
      vehiclePlate: trip.vehiclePlate,
    })
  }

  return { impactedTripCount: impactedTrips.length, impactedTrips }
}

export async function createDispatchTrip(
  input: Record<string, any>,
  actor: { userId: string; branchId?: string; username?: string }
) {
  const dbAny = prisma as any
  const rawStops = Array.isArray(input.stops) ? input.stops : []
  if (rawStops.length === 0) {
    throw new LogisticsDomainError("VALIDATION_ERROR", "Sefer oluşturmak için en az 1 teslimat durağı gereklidir.", 400)
  }

  const whId = String(input.originWarehouseId || "wh-merkez-01")
  const warehouse = await dbAny.warehouse.findUnique({ where: { id: whId } }).catch(() => null)
  const origin = getWarehouseOrigin(whId, warehouse)

  const vehicle = input.vehicleId
    ? await dbAny.lojistikVehicle.findUnique({ where: { id: input.vehicleId } }).catch(() => null)
    : null
  const driverId = input.driverId || vehicle?.assignedDriverId || null
  const driver = driverId
    ? await dbAny.lojistikDriver.findUnique({ where: { id: driverId } }).catch(() => null)
    : null

  const normalizedStops: SolverStopInput[] = rawStops.map((s: any, idx: number) => {
    const coords =
      typeof s.lat === "number" && typeof s.lng === "number"
        ? { lat: s.lat, lng: s.lng }
        : inferCoordinatesFromAddress(s.addressText, s.cityDistrict, idx)
    return {
      id: s.id || `tmp-stop-${idx + 1}`,
      label: s.customerName || s.sourceRefNo || `Durak ${idx + 1}`,
      lat: coords.lat,
      lng: coords.lng,
      weightKg: Number(s.weightKg ?? 100),
      volumeM3: Number(s.volumeM3 ?? 0.8),
      palletCount: Number(s.palletCount ?? 1),
      requiresColdChain: Boolean(s.requiresColdChain),
      timeWindowStart: s.timeWindowStart || "09:00",
      timeWindowEnd: s.timeWindowEnd || "17:00",
      serviceMinutes: Number(s.serviceMinutes ?? 10),
      priority: Number(s.priority ?? 1),
    }
  })

  if (vehicle) {
    const blockers = await getCriticalFleetBlockers()
    if (
      ["FAULT", "MAINTENANCE", "OUT_OF_SERVICE"].includes(vehicle.status) ||
      blockers.has(vehicle.id)
    ) {
      throw new LogisticsDomainError(
        "DRIVER_VEHICLE_INCOMPATIBLE",
        `${vehicle.plate} aracı bakım veya kritik arıza durumunda olduğu için yeni sefere atanamaz.`,
        409
      )
    }
  }

  // Kapasite & Şoför uyumluluk doğrulaması
  const loadEval = evaluateVehicleCapacityLoad(vehicle, normalizedStops)
  if (vehicle && !loadEval.isValid) {
    throw new LogisticsDomainError("CAPACITY_EXCEEDED", loadEval.warnings.join(" "), 409, {
      loadEval,
    })
  }

  const plannedDep = input.plannedDepartureAt ? new Date(input.plannedDepartureAt) : new Date()
  const safeDep = Number.isNaN(plannedDep.getTime()) ? new Date() : plannedDep

  // İlk sıra mesafe & ETA hesabı (isteğe bağlı olarak başlangıçta optimize de edilebilir)
  const shouldOptimizeNow = input.autoOptimize !== false
  const optRes = shouldOptimizeNow
    ? optimizeSingleTripRoute({
        origin: { label: origin.label, lat: origin.lat, lng: origin.lng },
        stops: normalizedStops,
        plannedDepartureAt: safeDep,
        returnToDepot: Boolean(input.returnToDepot),
      })
    : (() => {
        const seq = recalculateFixedStopSequence({
          origin: { label: origin.label, lat: origin.lat, lng: origin.lng },
          stopsInOrder: normalizedStops,
          plannedDepartureAt: safeDep,
          returnToDepot: Boolean(input.returnToDepot),
        })
        return {
          ...seq,
          baselineUnoptimizedDistanceKm: seq.optimizedDistanceKm,
          stages: [],
        }
      })()

  if (vehicle || driver) {
    const drvCheck = evaluateDriverVehicleCompatibility(
      driver,
      vehicle,
      safeDep,
      optRes.estimatedDurationMin
    )
    if (!drvCheck.compatible && input.ignoreShiftWarning !== true) {
      throw new LogisticsDomainError("DRIVER_VEHICLE_INCOMPATIBLE", drvCheck.reasons.join(" "), 409, {
        reasons: drvCheck.reasons,
      })
    }
  }

  const tripId = input.id || `trp-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`
  const tripNumber =
    String(input.tripNumber || "").trim() ||
    `SFR-${new Date().getFullYear()}-${String(Date.now()).slice(-5)}`
  const plannedDateKey = safeDep.toISOString().slice(0, 10)
  const plannedComp = new Date(safeDep.getTime() + optRes.estimatedDurationMin * 60_000)

  const tripRec = await dbAny.lojistikShipmentTrip.create({
    data: {
      id: tripId,
      tripNumber,
      title: String(input.title || `${origin.label.split("—")[0].trim()} Dağıtım Seferi`),
      branchId: input.branchId || actor.branchId || "local-debug-branch",
      originWarehouseId: origin.warehouseId,
      originLabel: origin.label,
      originLat: origin.lat,
      originLng: origin.lng,
      vehicleId: vehicle?.id || null,
      driverId: driver?.id || null,
      vehiclePlate: vehicle?.plate || null,
      driverName: driver?.fullName || null,
      plannedDateKey,
      plannedDepartureAt: safeDep,
      actualDepartureAt: null,
      plannedCompletionAt: plannedComp,
      actualCompletionAt: null,
      status: "TASLAK",
      totalWeightKg: loadEval.totalWeightKg,
      totalVolumeM3: loadEval.totalVolumeM3,
      totalPallets: loadEval.totalPallets,
      capacityLoadPct: loadEval.capacityLoadPct,
      baselineUnoptimizedDistanceKm: optRes.baselineUnoptimizedDistanceKm,
      plannedDistanceKm: optRes.optimizedDistanceKm,
      actualDistanceKm: 0,
      plannedDurationMin: optRes.estimatedDurationMin,
      actualDurationMin: 0,
      routeProviderMode: optRes.providerMode,
      routeSolverName: optRes.solverName,
      eWaybillId: null,
      eWaybillNo: null,
      eWaybillEttn: null,
      replanReason: null,
      replanHistoryJson: null,
      polylineJson: JSON.stringify(optRes.polylinePoints),
      notes: input.notes || null,
      createdBy: actor.userId,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
  })

  const rawByTmpId = new Map<string, any>()
  rawStops.forEach((s: any, idx: number) => {
    rawByTmpId.set(s.id || `tmp-stop-${idx + 1}`, { ...s, _norm: normalizedStops[idx] })
  })

  const createdStops: any[] = []
  const expiresAt = new Date(safeDep.getTime() + 7 * 86_400_000)

  for (const sched of optRes.stops) {
    const src = rawByTmpId.get(sched.id)
    const nrm = src._norm
    const trackingToken = generateSecureTrackingToken()
    const stopRec = await dbAny.lojistikShipmentStop.create({
      data: {
        id: `stp-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        tripId: tripRec.id,
        sequenceNo: sched.sequenceNo,
        sourceType: String(src.sourceType || "MANUAL"),
        sourceId: src.sourceId || null,
        sourceRefNo: src.sourceRefNo || null,
        customerId: src.customerId || null,
        customerName: String(src.customerName || "Müşteri"),
        contactPhone: src.contactPhone || null,
        addressText: String(src.addressText || "Teslimat Adresi"),
        cityDistrict: src.cityDistrict || null,
        lat: nrm.lat,
        lng: nrm.lng,
        timeWindowStart: nrm.timeWindowStart,
        timeWindowEnd: nrm.timeWindowEnd,
        serviceMinutes: nrm.serviceMinutes,
        weightKg: nrm.weightKg,
        volumeM3: nrm.volumeM3,
        palletCount: nrm.palletCount,
        requiresColdChain: Boolean(nrm.requiresColdChain),
        priority: nrm.priority,
        plannedEtaAt: new Date(sched.plannedEtaAt),
        actualArrivalAt: null,
        actualDepartureAt: null,
        legDistanceKm: sched.legDistanceKm,
        cumulativeDistanceKm: sched.cumulativeDistanceKm,
        delayMinutes: sched.lateMinutes,
        status: "BEKLIYOR",
        trackingToken,
        trackingExpiresAt: expiresAt,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    })
    createdStops.push(stopRec)

    // Kaynak siparişi güncelle (varsa)
    if (stopRec.sourceType === "OMNICHANNEL_ORDER" && stopRec.sourceId) {
      await dbAny.omnichannelOrder
        .update({
          where: { id: stopRec.sourceId },
          data: { shipmentTripId: tripRec.id, trackingToken },
        })
        .catch(() => null)
    } else if (stopRec.sourceType === "ERP_ORDER" && stopRec.sourceId) {
      await dbAny.order
        .update({
          where: { id: stopRec.sourceId },
          data: { shipmentTripId: tripRec.id, trackingToken },
        })
        .catch(() => null)
    }
  }

  await appendTrackingEvent({
    tripId: tripRec.id,
    eventType: "TRIP_CREATED",
    actorUserId: actor.userId,
    actorName: actor.username || actor.userId,
    message: `${tripRec.tripNumber} seferi ${createdStops.length} durak ve ${optRes.optimizedDistanceKm} km planla oluşturuldu.`,
    lat: origin.lat,
    lng: origin.lng,
  })

  await logLogisticsAudit({
    userId: actor.userId,
    action: "CREATE_DISPATCH_TRIP",
    resource: "lojistik_sevkiyat_rota",
    resourceId: tripRec.id,
    moduleKey: "lojistik_sevkiyat_rota",
    metadata: { tripNumber: tripRec.tripNumber, stopCount: createdStops.length, vehiclePlate: tripRec.vehiclePlate },
  })

  return { trip: tripRec, stops: createdStops }
}

export async function runMultiVehicleAutoPlanAndPersist(
  params: {
    originWarehouseId?: string
    stopItems: Array<Record<string, any>>
    vehicleIds?: string[]
    plannedDepartureAt?: string
    persistTrips?: boolean
  },
  actor: { userId: string; branchId?: string; username?: string }
) {
  const dbAny = prisma as any
  if (!params.stopItems || params.stopItems.length === 0) {
    throw new LogisticsDomainError("VALIDATION_ERROR", "Otomatik sefer önerisi için en az 1 bekleyen sipariş gereklidir.", 400)
  }

  const [vehicles, drivers, wh, blockers] = await Promise.all([
    dbAny.lojistikVehicle.findMany(),
    dbAny.lojistikDriver.findMany(),
    dbAny.warehouse.findUnique({ where: { id: params.originWarehouseId || "wh-merkez-01" } }).catch(() => null),
    getCriticalFleetBlockers(),
  ])

  const drvById = new Map<string, any>(drivers.map((d: any) => [d.id, d]))
  const eligibleVehicles = vehicles.filter(
    (v: any) =>
      v.isActive !== false &&
      (v.status === "ACTIVE" || v.status === "IN_TRANSIT") &&
      !blockers.has(v.id) &&
      (!params.vehicleIds || params.vehicleIds.length === 0 || params.vehicleIds.includes(v.id))
  )

  const origin = getWarehouseOrigin(params.originWarehouseId || "wh-merkez-01", wh)
  const solverStops: SolverStopInput[] = params.stopItems.map((s: any, idx: number) => {
    const coords =
      typeof s.lat === "number" && typeof s.lng === "number"
        ? { lat: s.lat, lng: s.lng }
        : inferCoordinatesFromAddress(s.addressText, s.cityDistrict, idx)
    return {
      id: String(s.sourceId || s.id || `auto-stop-${idx + 1}`),
      label: s.customerName || s.sourceRefNo || `Sipariş ${idx + 1}`,
      lat: coords.lat,
      lng: coords.lng,
      weightKg: Number(s.weightKg ?? 120),
      volumeM3: Number(s.volumeM3 ?? 1.0),
      palletCount: Number(s.palletCount ?? 1),
      requiresColdChain: Boolean(s.requiresColdChain),
      timeWindowStart: s.timeWindowStart || "09:00",
      timeWindowEnd: s.timeWindowEnd || "16:30",
      serviceMinutes: Number(s.serviceMinutes ?? 10),
      priority: Number(s.priority ?? 1),
    }
  })

  const plan = planMultiVehicleTrips({
    origin: { label: origin.label, lat: origin.lat, lng: origin.lng },
    stops: solverStops,
    vehicles: eligibleVehicles.map((v: any) => {
      const drv = v.assignedDriverId ? drvById.get(v.assignedDriverId) : null
      return {
        vehicleId: v.id,
        plate: v.plate,
        driverId: drv?.id || null,
        driverName: drv?.fullName || null,
        capacityKg: Number(v.capacityKg || 1500),
        capacityM3: Number(v.capacityM3 || 10),
        palletSlots: Number(v.palletSlots || 4),
        isRefrigerated: Boolean(v.isRefrigerated),
        shiftStart: drv?.shiftStart || "07:00",
        shiftEnd: drv?.shiftEnd || "18:30",
      }
    }),
    plannedDepartureAt: params.plannedDepartureAt || new Date().toISOString(),
  })

  const jobRec = await dbAny.lojistikRouteOptimizationJob.create({
    data: {
      id: `optjob-${Date.now()}-${Math.random().toString(36).slice(2, 5)}`,
      tripId: null,
      jobStatus: "COMPLETED",
      stageLabel: `${plan.trips.length} araçlı otomatik sefer dağılımı ve CVRPTW optimizasyonu tamamlandı`,
      progressPct: 100,
      stopCount: params.stopItems.length,
      vehicleCount: plan.trips.length,
      providerMode: "local-solver",
      solverName: "Çoklu Araç CVRPTW Otomatik Dağıtıcı (2-Opt + Or-Opt)",
      unoptimizedDistanceKm: plan.baselineTotalDistanceKm,
      optimizedDistanceKm: plan.optimizedTotalDistanceKm,
      timeWindowViolations: plan.trips.reduce((s, t) => s + t.timeWindowViolations, 0),
      capacityOverflowPct: 0,
      durationMs: plan.durationMs,
      resultJson: JSON.stringify({ unassignedCount: plan.unassignedStops.length }),
      startedAt: new Date(Date.now() - plan.durationMs),
      completedAt: new Date(),
      createdAt: new Date(),
    },
  })

  const createdTrips: any[] = []
  if (params.persistTrips) {
    const rawMap = new Map<string, any>()
    params.stopItems.forEach((s: any, idx: number) => {
      rawMap.set(String(s.sourceId || s.id || `auto-stop-${idx + 1}`), s)
    })

    for (let i = 0; i < plan.trips.length; i++) {
      const pt = plan.trips[i]
      const tripStops = pt.stopIds.map((sid) => rawMap.get(sid)).filter(Boolean)
      if (tripStops.length === 0) continue
      const res = await createDispatchTrip(
        {
          originWarehouseId: origin.warehouseId,
          vehicleId: pt.vehicleId,
          driverId: pt.driverId,
          title: `Otomatik Sefer #${i + 1} (${pt.plate})`,
          plannedDepartureAt: params.plannedDepartureAt,
          stops: tripStops,
          autoOptimize: true,
          ignoreShiftWarning: true,
        },
        actor
      )
      createdTrips.push(res.trip)
    }
  }

  return { plan, job: jobRec, createdTrips }
}

export async function optimizeExistingTripWithJob(
  tripId: string,
  actor: { userId: string; username?: string },
  options?: { timeBudgetMs?: number; returnToDepot?: boolean }
) {
  const dbAny = prisma as any
  const trip = await dbAny.lojistikShipmentTrip.findUnique({ where: { id: tripId } })
  if (!trip) throw new LogisticsDomainError("NOT_FOUND", "Sefer bulunamadı.", 404)

  const stops = await dbAny.lojistikShipmentStop.findMany({ where: { tripId } })
  if (stops.length === 0) {
    throw new LogisticsDomainError("EMPTY_STOPS", "Optimize edilecek durak bulunmuyor.", 400)
  }

  const orderedCurrent = [...stops].sort((a: any, b: any) => Number(a.sequenceNo) - Number(b.sequenceNo))
  const jobId = `optjob-${Date.now()}-${Math.random().toString(36).slice(2, 5)}`

  const jobRec = await dbAny.lojistikRouteOptimizationJob.create({
    data: {
      id: jobId,
      tripId,
      jobStatus: "QUEUED",
      stageLabel: "Mesafe matrisi sağlayıcı adaptöründen hazırlanıyor",
      progressPct: 10,
      stopCount: orderedCurrent.length,
      vehicleCount: 1,
      providerMode: "local-solver",
      startedAt: new Date(),
      createdAt: new Date(),
    },
  })

  const solverStops: SolverStopInput[] = orderedCurrent.map((s: any) => ({
    id: s.id,
    label: s.customerName,
    lat: Number(s.lat),
    lng: Number(s.lng),
    weightKg: Number(s.weightKg || 0),
    volumeM3: Number(s.volumeM3 || 0),
    palletCount: Number(s.palletCount || 0),
    requiresColdChain: Boolean(s.requiresColdChain),
    timeWindowStart: s.timeWindowStart,
    timeWindowEnd: s.timeWindowEnd,
    serviceMinutes: Number(s.serviceMinutes || 10),
    priority: Number(s.priority || 1),
  }))

  const matrix = await resolveDistanceDurationMatrixWithAdapter(
    { label: trip.originLabel, lat: Number(trip.originLat), lng: Number(trip.originLng) },
    solverStops
  )

  const opt = optimizeSingleTripRoute({
    origin: { label: trip.originLabel, lat: Number(trip.originLat), lng: Number(trip.originLng) },
    stops: solverStops,
    plannedDepartureAt: trip.plannedDepartureAt,
    returnToDepot: Boolean(options?.returnToDepot),
    timeBudgetMs: options?.timeBudgetMs ?? 1500,
    matrix,
  })

  for (const sched of opt.stops) {
    await dbAny.lojistikShipmentStop.update({
      where: { id: sched.id },
      data: {
        sequenceNo: sched.sequenceNo,
        legDistanceKm: sched.legDistanceKm,
        cumulativeDistanceKm: sched.cumulativeDistanceKm,
        plannedEtaAt: new Date(sched.plannedEtaAt),
        delayMinutes: sched.lateMinutes,
        updatedAt: new Date(),
      },
    })
  }

  const plannedComp = new Date(
    new Date(trip.plannedDepartureAt).getTime() + opt.estimatedDurationMin * 60_000
  )

  const updatedTrip = await dbAny.lojistikShipmentTrip.update({
    where: { id: tripId },
    data: {
      baselineUnoptimizedDistanceKm: opt.baselineUnoptimizedDistanceKm,
      plannedDistanceKm: opt.optimizedDistanceKm,
      plannedDurationMin: opt.estimatedDurationMin,
      plannedCompletionAt: plannedComp,
      routeProviderMode: opt.providerMode,
      routeSolverName: opt.solverName,
      polylineJson: JSON.stringify(opt.polylinePoints),
      updatedAt: new Date(),
    },
  })

  const completedJob = await dbAny.lojistikRouteOptimizationJob.update({
    where: { id: jobRec.id },
    data: {
      jobStatus: "COMPLETED",
      stageLabel: "2-Opt ve Or-Opt optimizasyonu tamamlandı",
      progressPct: 100,
      providerMode: opt.providerMode,
      solverName: opt.solverName,
      unoptimizedDistanceKm: opt.baselineUnoptimizedDistanceKm,
      optimizedDistanceKm: opt.optimizedDistanceKm,
      timeWindowViolations: opt.timeWindowViolations,
      durationMs: opt.durationMs,
      resultJson: JSON.stringify({ stages: opt.stages, savedKm: Number(Math.max(0, opt.baselineUnoptimizedDistanceKm - opt.optimizedDistanceKm).toFixed(2)) }),
      completedAt: new Date(),
    },
  })

  await appendTrackingEvent({
    tripId,
    eventType: "ROUTE_OPTIMIZED",
    actorUserId: actor.userId,
    actorName: actor.username || actor.userId,
    message: `Rota optimize edildi: ${opt.baselineUnoptimizedDistanceKm} km → ${opt.optimizedDistanceKm} km (${opt.durationMs} ms).`,
  })

  return { trip: updatedTrip, optimization: opt, job: completedJob }
}

export async function reorderTripStopsManually(
  params: { tripId: string; orderedStopIds: string[] },
  actor: { userId: string; username?: string }
) {
  const dbAny = prisma as any
  const trip = await dbAny.lojistikShipmentTrip.findUnique({ where: { id: params.tripId } })
  if (!trip) throw new LogisticsDomainError("NOT_FOUND", "Sefer bulunamadı.", 404)

  const stops = await dbAny.lojistikShipmentStop.findMany({ where: { tripId: trip.id } })
  const stopMap = new Map<string, any>(stops.map((s: any) => [s.id, s]))

  const orderedStops: any[] = []
  for (const id of params.orderedStopIds) {
    const found = stopMap.get(id)
    if (found) {
      orderedStops.push(found)
      stopMap.delete(id)
    }
  }
  for (const leftover of stopMap.values()) orderedStops.push(leftover)

  const recalc = recalculateFixedStopSequence({
    origin: { label: trip.originLabel, lat: Number(trip.originLat), lng: Number(trip.originLng) },
    stopsInOrder: orderedStops.map((s) => ({
      id: s.id,
      label: s.customerName,
      lat: Number(s.lat),
      lng: Number(s.lng),
      weightKg: Number(s.weightKg || 0),
      volumeM3: Number(s.volumeM3 || 0),
      palletCount: Number(s.palletCount || 0),
      requiresColdChain: Boolean(s.requiresColdChain),
      timeWindowStart: s.timeWindowStart,
      timeWindowEnd: s.timeWindowEnd,
      serviceMinutes: Number(s.serviceMinutes || 10),
    })),
    plannedDepartureAt: trip.plannedDepartureAt,
  })

  for (const sched of recalc.stops) {
    await dbAny.lojistikShipmentStop.update({
      where: { id: sched.id },
      data: {
        sequenceNo: sched.sequenceNo,
        legDistanceKm: sched.legDistanceKm,
        cumulativeDistanceKm: sched.cumulativeDistanceKm,
        plannedEtaAt: new Date(sched.plannedEtaAt),
        delayMinutes: sched.lateMinutes,
        updatedAt: new Date(),
      },
    })
  }

  const updatedTrip = await dbAny.lojistikShipmentTrip.update({
    where: { id: trip.id },
    data: {
      plannedDistanceKm: recalc.optimizedDistanceKm,
      plannedDurationMin: recalc.estimatedDurationMin,
      polylineJson: JSON.stringify(recalc.polylinePoints),
      updatedAt: new Date(),
    },
  })

  await appendTrackingEvent({
    tripId: trip.id,
    eventType: "STOP_REORDERED",
    actorUserId: actor.userId,
    actorName: actor.username || actor.userId,
    message: `Durak sırası manuel olarak güncellendi (${recalc.optimizedDistanceKm} km).`,
  })

  return { trip: updatedTrip, schedule: recalc }
}

export async function dynamicReplanTrip(
  params: {
    tripId: string
    reason: string
    targetVehicleId?: string | null
    targetDriverId?: string | null
    delayOffsetMinutes?: number
    stopIdsToMove?: string[]
  },
  actor: { userId: string; branchId?: string; username?: string }
) {
  const dbAny = prisma as any
  const trip = await dbAny.lojistikShipmentTrip.findUnique({ where: { id: params.tripId } })
  if (!trip) throw new LogisticsDomainError("NOT_FOUND", "Yeniden planlanacak sefer bulunamadı.", 404)

  const allStops = await dbAny.lojistikShipmentStop.findMany({ where: { tripId: trip.id } })
  const pendingStops = allStops.filter(
    (s: any) => !["TESLIM_EDILDI", "KISMI_TESLIM"].includes(s.status)
  )
  const targetMoveSet =
    params.stopIdsToMove && params.stopIdsToMove.length > 0
      ? new Set(params.stopIdsToMove)
      : new Set(pendingStops.map((s: any) => s.id))

  const stopsToTransfer = pendingStops.filter((s: any) => targetMoveSet.has(s.id))
  if (stopsToTransfer.length === 0) {
    throw new LogisticsDomainError("NO_MOVABLE_STOPS", "Yeniden planlanabilecek bekleyen durak bulunamadı.", 400)
  }

  // Senaryo A: Başka bir araca/sürücüye aktarma (arıza / kapasite / devir)
  if (params.targetVehicleId && params.targetVehicleId !== trip.vehicleId) {
    const newVeh = await dbAny.lojistikVehicle.findUnique({ where: { id: params.targetVehicleId } }).catch(() => null)
    if (!newVeh) throw new LogisticsDomainError("NOT_FOUND", "Hedef araç bulunamadı.", 404)

    const newDrvId = params.targetDriverId || newVeh.assignedDriverId || trip.driverId
    const newDrv = newDrvId
      ? await dbAny.lojistikDriver.findUnique({ where: { id: newDrvId } }).catch(() => null)
      : null

    const loadEval = evaluateVehicleCapacityLoad(newVeh, stopsToTransfer)
    if (!loadEval.isValid) {
      throw new LogisticsDomainError("CAPACITY_EXCEEDED", loadEval.warnings.join(" "), 409)
    }

    const newTripRes = await createDispatchTrip(
      {
        originWarehouseId: trip.originWarehouseId,
        vehicleId: newVeh.id,
        driverId: newDrv?.id || null,
        title: `${trip.title} [Yeniden Planlı Devir]`,
        plannedDepartureAt: new Date(Date.now() + 15 * 60_000).toISOString(),
        stops: stopsToTransfer.map((s: any) => ({
          sourceType: s.sourceType,
          sourceId: s.sourceId,
          sourceRefNo: s.sourceRefNo,
          customerId: s.customerId,
          customerName: s.customerName,
          contactPhone: s.contactPhone,
          addressText: s.addressText,
          cityDistrict: s.cityDistrict,
          lat: s.lat,
          lng: s.lng,
          timeWindowStart: s.timeWindowStart,
          timeWindowEnd: s.timeWindowEnd,
          serviceMinutes: s.serviceMinutes,
          weightKg: s.weightKg,
          volumeM3: s.volumeM3,
          palletCount: s.palletCount,
          requiresColdChain: s.requiresColdChain,
          priority: s.priority,
        })),
        autoOptimize: true,
        ignoreShiftWarning: true,
        notes: `Kaynak sefer: ${trip.tripNumber} · Neden: ${params.reason}`,
      },
      actor
    )

    // Eski durakları yeni sefere aktarıldı olarak işaretle / kaldır veya eski seferi kapat
    for (const oldStop of stopsToTransfer) {
      await dbAny.lojistikShipmentStop.delete({ where: { id: oldStop.id } }).catch(() => null)
    }
    const remainingOld = allStops.length - stopsToTransfer.length
    const prevHistory = (() => {
      try {
        return trip.replanHistoryJson ? JSON.parse(trip.replanHistoryJson) : []
      } catch {
        return []
      }
    })()

    const updatedOldTrip = await dbAny.lojistikShipmentTrip.update({
      where: { id: trip.id },
      data: {
        status: remainingOld === 0 ? "IPTAL" : trip.status,
        replanReason: params.reason,
        replanHistoryJson: JSON.stringify([
          ...prevHistory,
          {
            at: new Date().toISOString(),
            reason: params.reason,
            movedStops: stopsToTransfer.length,
            targetTripNumber: newTripRes.trip.tripNumber,
          },
        ]),
        updatedAt: new Date(),
      },
    })

    await appendTrackingEvent({
      tripId: trip.id,
      eventType: "TRIP_REPLANNED",
      actorUserId: actor.userId,
      actorName: actor.username || actor.userId,
      message: `${stopsToTransfer.length} bekleyen durak '${params.reason}' nedeniyle ${newTripRes.trip.tripNumber} (${newVeh.plate}) seferine aktarıldı.`,
    })

    return {
      mode: "REASSIGNED_VEHICLE",
      sourceTrip: updatedOldTrip,
      newTrip: newTripRes.trip,
      movedCount: stopsToTransfer.length,
    }
  }

  // Senaryo B: Aynı araçta gecikme sonrası kalan durakları dinamik yeniden sırala / ETA kaydır
  const delayShiftMs = Math.max(0, Number(params.delayOffsetMinutes ?? 30)) * 60_000
  const baseShiftDep = new Date(
    Math.max(Date.now(), new Date(trip.plannedDepartureAt).getTime()) + delayShiftMs
  )
  const opt = optimizeSingleTripRoute({
    origin: { label: trip.originLabel, lat: Number(trip.originLat), lng: Number(trip.originLng) },
    stops: stopsToTransfer.map((s: any) => ({
      id: s.id,
      label: s.customerName,
      lat: Number(s.lat),
      lng: Number(s.lng),
      weightKg: Number(s.weightKg || 0),
      volumeM3: Number(s.volumeM3 || 0),
      palletCount: Number(s.palletCount || 0),
      requiresColdChain: Boolean(s.requiresColdChain),
      timeWindowStart: s.timeWindowStart,
      timeWindowEnd: s.timeWindowEnd,
      serviceMinutes: Number(s.serviceMinutes || 10),
    })),
    plannedDepartureAt: baseShiftDep,
  })

  const completedCount = allStops.length - stopsToTransfer.length
  for (const sched of opt.stops) {
    await dbAny.lojistikShipmentStop.update({
      where: { id: sched.id },
      data: {
        sequenceNo: completedCount + sched.sequenceNo,
        plannedEtaAt: new Date(sched.plannedEtaAt),
        delayMinutes: Math.max(Number(params.delayOffsetMinutes ?? 0), sched.lateMinutes),
        updatedAt: new Date(),
      },
    })
  }

  const prevHistory = (() => {
    try {
      return trip.replanHistoryJson ? JSON.parse(trip.replanHistoryJson) : []
    } catch {
      return []
    }
  })()

  const updatedTrip = await dbAny.lojistikShipmentTrip.update({
    where: { id: trip.id },
    data: {
      replanReason: params.reason,
      replanHistoryJson: JSON.stringify([
        ...prevHistory,
        {
          at: new Date().toISOString(),
          reason: params.reason,
          delayOffsetMinutes: params.delayOffsetMinutes ?? 30,
          reoptimizedRemaining: stopsToTransfer.length,
        },
      ]),
      polylineJson: JSON.stringify(opt.polylinePoints),
      updatedAt: new Date(),
    },
  })

  await appendTrackingEvent({
    tripId: trip.id,
    eventType: "TRIP_REPLANNED",
    actorUserId: actor.userId,
    actorName: actor.username || actor.userId,
    message: `Gecikme/aksama sonrası kalan ${stopsToTransfer.length} durak yeniden optimize edildi (${params.reason}).`,
  })

  return {
    mode: "RESEQUENCED_SAME_VEHICLE",
    sourceTrip: updatedTrip,
    optimization: opt,
    movedCount: stopsToTransfer.length,
  }
}

export async function approveTripAndTriggerEWaybill(
  tripId: string,
  actor: { userId: string; username?: string }
) {
  const dbAny = prisma as any
  const trip = await dbAny.lojistikShipmentTrip.findUnique({ where: { id: tripId } })
  if (!trip) throw new LogisticsDomainError("NOT_FOUND", "Onaylanacak sefer bulunamadı.", 404)

  if (!canTransitionDispatchTripStatus(trip.status, "ONAYLANDI") && trip.status !== "ONAYLANDI") {
    throw new LogisticsDomainError(
      "CONFLICT",
      `Bu durumdaki (${trip.status}) sefer için onay/e-İrsaliye tetiklenemez.`,
      409
    )
  }

  const stops = await dbAny.lojistikShipmentStop.findMany({ where: { tripId: trip.id } })
  if (stops.length === 0) {
    throw new LogisticsDomainError("EMPTY_STOPS", "Duraksız sefer onaylanamaz.", 400)
  }

  // Kapasite son kontrolü
  if (trip.vehicleId) {
    const veh = await dbAny.lojistikVehicle.findUnique({ where: { id: trip.vehicleId } }).catch(() => null)
    const capEval = evaluateVehicleCapacityLoad(veh, stops)
    if (veh && !capEval.isValid) {
      throw new LogisticsDomainError("CAPACITY_EXCEEDED", capEval.warnings.join(" "), 409)
    }
  }

  const driver = trip.driverId
    ? await dbAny.lojistikDriver.findUnique({ where: { id: trip.driverId } }).catch(() => null)
    : null

  // Idempotent E-İrsaliye kesimi
  let eWaybillId = trip.eWaybillId
  let eWaybillNo = trip.eWaybillNo
  let eWaybillEttn = trip.eWaybillEttn
  let providerInfo: { providerMode: string; providerName: string } | null = null

  if (!eWaybillNo) {
    const providers = createLogisticsProviders()
    const firstStop = stops[0]
    const totalWeight = stops.reduce((s: number, x: any) => s + Number(x.weightKg || 1), 0)
    const eDocRes = await providers.eDocument.submitEDocument({
      documentType: "E_IRSALIYE",
      shipmentWaveNo: trip.tripNumber,
      relatedOrderNo: firstStop?.sourceRefNo || trip.tripNumber,
      receiverTitle:
        stops.length > 1
          ? `${firstStop.customerName} (+${stops.length - 1} Teslimat)`
          : firstStop.customerName,
      receiverVknTckn: "1111111111",
      receiverTaxOffice: "Marmara Kurumlar V.D.",
      carrierName: "Sunum İç Filo Lojistik",
      vehiclePlate: trip.vehiclePlate || undefined,
      driverName: trip.driverName || driver?.fullName || undefined,
      driverTckn: driver?.tckn || undefined,
      lines: stops.map((s: any, idx: number) => ({
        sku: s.sourceRefNo || `DURAK-${idx + 1}`,
        name: `${s.customerName} (${s.cityDistrict || "Sevkiyat"})`,
        quantity: Math.max(1, Number(s.palletCount || 1)),
        unit: "Palet",
        unitPrice: 1250,
        vatRate: 20,
      })),
    })

    eWaybillNo = eDocRes.documentNo
    eWaybillEttn = eDocRes.ettnUuid
    providerInfo = { providerMode: eDocRes.providerMode, providerName: eDocRes.providerName }

    // Oluşan EDocumentRecord satırına Faz 6 sefer & araç bağını işle
    const createdEdoc = await dbAny.eDocumentRecord
      .findFirst({ where: { documentNo: eWaybillNo } })
      .catch(() => null)
    if (createdEdoc) {
      eWaybillId = createdEdoc.id
      await dbAny.eDocumentRecord
        .update({
          where: { id: createdEdoc.id },
          data: {
            shipmentTripId: trip.id,
            vehicleId: trip.vehicleId || null,
            driverId: trip.driverId || null,
          },
        })
        .catch(() => null)
    }

    // Bağlı Omnichannel siparişlerine eWaybillNo işle
    for (const s of stops) {
      if (s.sourceType === "OMNICHANNEL_ORDER" && s.sourceId) {
        await dbAny.omnichannelOrder
          .update({ where: { id: s.sourceId }, data: { eWaybillNo } })
          .catch(() => null)
      }
    }

    await appendTrackingEvent({
      tripId: trip.id,
      eventType: "EWAYBILL_ISSUED",
      actorUserId: actor.userId,
      actorName: actor.username || actor.userId,
      message: `${eWaybillNo} numaralı E-İrsaliye onay akışıyla kesildi (${eDocRes.providerName}, ${totalWeight.toFixed(0)} kg).`,
      metadata: { eWaybillNo, eWaybillEttn, providerMode: eDocRes.providerMode },
    })
  }

  const nextStatus = trip.status === "TASLAK" ? "ONAYLANDI" : trip.status
  const updatedTrip = await dbAny.lojistikShipmentTrip.update({
    where: { id: trip.id },
    data: {
      status: nextStatus,
      eWaybillId,
      eWaybillNo,
      eWaybillEttn,
      approvedBy: actor.username || actor.userId,
      approvedAt: trip.approvedAt || new Date(),
      updatedAt: new Date(),
    },
  })

  await logLogisticsAudit({
    userId: actor.userId,
    action: "APPROVE_TRIP_AND_ISSUE_EWAYBILL",
    resource: "lojistik_sevkiyat_rota",
    resourceId: trip.id,
    moduleKey: "lojistik_sevkiyat_rota",
    metadata: { tripNumber: trip.tripNumber, eWaybillNo, eWaybillEttn },
  })

  return { trip: updatedTrip, eWaybillNo, eWaybillEttn, providerInfo }
}

export async function driverUpdateTripOrStopExecution(
  params: {
    tripId?: string
    stopId: string
    status: DispatchStopStatus | "START_TRIP"
    failureReasonCode?: DispatchFailureReasonCode | string
    failureReasonNote?: string
    driverNote?: string
    lat?: number
    lng?: number
    actualDistanceKm?: number
  },
  actor: { userId: string; username?: string }
) {
  const dbAny = prisma as any
  const stop = await dbAny.lojistikShipmentStop.findUnique({ where: { id: params.stopId } })
  if (!stop) throw new LogisticsDomainError("NOT_FOUND", "Durak kaydı bulunamadı.", 404)

  const trip = await dbAny.lojistikShipmentTrip.findUnique({ where: { id: stop.tripId } })
  if (!trip) throw new LogisticsDomainError("NOT_FOUND", "Bağlı sefer bulunamadı.", 404)

  const now = new Date()

  if (params.status === "START_TRIP") {
    const savedTrip = await dbAny.lojistikShipmentTrip.update({
      where: { id: trip.id },
      data: {
        status: "YOLDA",
        actualDepartureAt: trip.actualDepartureAt || now,
        updatedAt: now,
      },
    })
    await dbAny.lojistikShipmentStop.update({
      where: { id: stop.id },
      data: { status: "YOLDA", updatedAt: now },
    })
    await appendTrackingEvent({
      tripId: trip.id,
      stopId: stop.id,
      eventType: "TRIP_STARTED",
      actorUserId: actor.userId,
      actorName: actor.username || actor.userId,
      message: `${trip.vehiclePlate || ""} seferi yola çıktı.`,
      lat: params.lat ?? trip.originLat,
      lng: params.lng ?? trip.originLng,
    })
    return { trip: savedTrip, stop }
  }

  if (params.status === "TESLIM_EDILEMEDI" && !params.failureReasonCode) {
    throw new LogisticsDomainError(
      "VALIDATION_ERROR",
      "Teslim edilemedi durumu için neden kodu seçilmelidir.",
      400
    )
  }

  const etaMs = stop.plannedEtaAt ? new Date(stop.plannedEtaAt).getTime() : now.getTime()
  const computedDelayMin =
    params.status === "VARISTA" || params.status === "TESLIM_EDILDI" || params.status === "KISMI_TESLIM"
      ? Math.max(0, Math.round((now.getTime() - etaMs) / 60_000))
      : stop.delayMinutes || 0

  const stopUpdates: Record<string, any> = {
    status: params.status,
    driverNote: params.driverNote !== undefined ? params.driverNote : stop.driverNote,
    updatedAt: now,
  }
  if (params.status === "VARISTA") {
    stopUpdates.actualArrivalAt = stop.actualArrivalAt || now
    stopUpdates.delayMinutes = computedDelayMin
  }
  if (["TESLIM_EDILDI", "KISMI_TESLIM", "TESLIM_EDILEMEDI"].includes(params.status)) {
    stopUpdates.actualArrivalAt = stop.actualArrivalAt || now
    stopUpdates.actualDepartureAt = now
    stopUpdates.delayMinutes = computedDelayMin
  }
  if (params.status === "TESLIM_EDILEMEDI") {
    stopUpdates.failureReasonCode = params.failureReasonCode
    stopUpdates.failureReasonNote = params.failureReasonNote || null
  }

  const savedStop = await dbAny.lojistikShipmentStop.update({
    where: { id: stop.id },
    data: stopUpdates,
  })

  // Sefer durumunu güncelle (tüm duraklar bittiyse TAMAMLANDI)
  const siblingStops = await dbAny.lojistikShipmentStop.findMany({ where: { tripId: trip.id } })
  const allClosed = siblingStops.every((s: any) =>
    ["TESLIM_EDILDI", "KISMI_TESLIM", "TESLIM_EDILEMEDI"].includes(s.id === savedStop.id ? savedStop.status : s.status)
  )

  const tripUpdates: Record<string, any> = {
    actualDepartureAt: trip.actualDepartureAt || now,
    status: allClosed ? "TAMAMLANDI" : trip.status === "ONAYLANDI" || trip.status === "TASLAK" ? "TESLIMAT_SURUYOR" : "TESLIMAT_SURUYOR",
    updatedAt: now,
  }
  if (allClosed) {
    tripUpdates.actualCompletionAt = now
    tripUpdates.actualDistanceKm = Number(
      params.actualDistanceKm || trip.actualDistanceKm || trip.plannedDistanceKm || 0
    )
    const depTime = new Date(tripUpdates.actualDepartureAt).getTime()
    tripUpdates.actualDurationMin = Math.max(1, Math.round((now.getTime() - depTime) / 60_000))
  }

  const savedTrip = await dbAny.lojistikShipmentTrip.update({
    where: { id: trip.id },
    data: tripUpdates,
  })

  await appendTrackingEvent({
    tripId: trip.id,
    stopId: stop.id,
    eventType: params.status === "VARISTA" ? "STOP_ARRIVED" : params.status === "TESLIM_EDILEMEDI" ? "STOP_FAILED" : "STOP_UPDATED",
    actorUserId: actor.userId,
    actorName: actor.username || actor.userId,
    message: `${stop.customerName} durağı güncellendi: ${params.status}${params.failureReasonCode ? ` (${params.failureReasonCode})` : ""}.`,
    lat: params.lat ?? stop.lat,
    lng: params.lng ?? stop.lng,
  })

  return { trip: savedTrip, stop: savedStop }
}

async function buildBillableInvoiceLinesForStop(
  stop: any,
  opts: {
    isPartial: boolean
    deliveredRatio: number
    deliveredItems?: Array<{ sku: string; itemName: string; deliveredQty: number; unitPrice?: number }>
    vatRate: number
  }
) {
  const dbAny = prisma as any
  if (Array.isArray(opts.deliveredItems) && opts.deliveredItems.length > 0) {
    return opts.deliveredItems
      .filter((x) => Number(x.deliveredQty || 0) > 0)
      .map((x) => ({
        sku: x.sku || stop.sourceRefNo || "URUN",
        name: x.itemName || stop.customerName,
        quantity: Number(x.deliveredQty),
        unit: "Adet",
        unitPrice: Number(x.unitPrice ?? 150),
        vatRate: opts.vatRate,
      }))
  }

  if (stop.sourceType === "OMNICHANNEL_ORDER" && stop.sourceId) {
    const ord = await dbAny.omnichannelOrder
      .findUnique({ where: { id: stop.sourceId }, include: { shipmentLines: true } })
      .catch(() => null)
    if (ord?.shipmentLines?.length) {
      return ord.shipmentLines
        .map((l: any) => {
          const baseQty = Number(l.shippedQty || l.quantity || 0)
          const qty = opts.isPartial
            ? Math.max(0, Math.round(baseQty * opts.deliveredRatio))
            : baseQty
          return {
            sku: l.sku || "SKU",
            name: l.itemName || ord.customerName,
            quantity: qty,
            unit: "Adet",
            unitPrice: Number(l.unitPrice || 150),
            vatRate: opts.vatRate,
          }
        })
        .filter((l: any) => l.quantity > 0)
    }
    if (ord) {
      const amt = Number(ord.totalAmount || 0) * opts.deliveredRatio
      if (amt <= 0) return []
      return [
        {
          sku: ord.orderNumber || stop.sourceRefNo || "OMN",
          name: `${ord.customerName} Teslimatı`,
          quantity: 1,
          unit: "Paket",
          unitPrice: Number((amt / (1 + opts.vatRate / 100)).toFixed(2)),
          vatRate: opts.vatRate,
        },
      ]
    }
  }

  if (stop.sourceType === "ERP_ORDER" && stop.sourceId) {
    const ord = await dbAny.order.findUnique({ where: { id: stop.sourceId } }).catch(() => null)
    if (ord) {
      const baseQty = Math.max(1, Number(ord.quantity || 1))
      const qty = opts.isPartial ? Math.max(0, Math.round(baseQty * opts.deliveredRatio)) : baseQty
      if (qty <= 0) return []
      const gross = Number(ord.totalAmount || baseQty * 250)
      const perUnitNet = gross / baseQty / (1 + opts.vatRate / 100)
      return [
        {
          sku: ord.orderNumber || ord.id,
          name: ord.title || stop.customerName,
          quantity: qty,
          unit: "Adet",
          unitPrice: Number(perUnitNet.toFixed(2)),
          vatRate: opts.vatRate,
        },
      ]
    }
  }

  const basePallets = Math.max(1, Number(stop.palletCount || 1))
  const qty = opts.isPartial ? Math.max(0, Math.round(basePallets * opts.deliveredRatio)) : basePallets
  if (qty <= 0) return []
  return [
    {
      sku: stop.sourceRefNo || stop.id,
      name: `${stop.customerName} Teslimat Bedeli`,
      quantity: qty,
      unit: "Palet",
      unitPrice: 1250,
      vatRate: opts.vatRate,
    },
  ]
}

async function ensureDraftSalesEInvoiceForStop(
  stop: any,
  trip: any,
  opts: {
    isPartial: boolean
    deliveredRatio: number
    deliveredItems?: Array<{ sku: string; itemName: string; deliveredQty: number; unitPrice?: number }>
    timingMode: string
    vatRate: number
  }
) {
  const dbAny = prisma as any
  // Çift taslak engeli (idempotency): durak veya ilişkili e-fatura varsa yeniden üretme
  if (stop.eInvoiceId) {
    const existing = await dbAny.eDocumentRecord
      .findUnique({ where: { id: stop.eInvoiceId } })
      .catch(() => null)
    if (existing) return existing
  }
  const existingByStop = await dbAny.eDocumentRecord
    .findFirst({ where: { shipmentStopId: stop.id, documentType: "E_FATURA" } })
    .catch(() => null)
  if (existingByStop) return existingByStop

  const lines = await buildBillableInvoiceLinesForStop(stop, {
    isPartial: opts.isPartial,
    deliveredRatio: opts.deliveredRatio,
    deliveredItems: opts.deliveredItems,
    vatRate: opts.vatRate,
  })
  if (lines.length === 0) return null

  const linesWithTotals = lines.map((l: any) => {
    const net = Number(l.quantity) * Number(l.unitPrice || 0)
    const vat = (net * Number(l.vatRate ?? opts.vatRate)) / 100
    return {
      ...l,
      lineNet: Number(net.toFixed(2)),
      lineVat: Number(vat.toFixed(2)),
    }
  })
  const totalNet = Number(linesWithTotals.reduce((s: number, l: any) => s + l.lineNet, 0).toFixed(2))
  const totalVat = Number(linesWithTotals.reduce((s: number, l: any) => s + l.lineVat, 0).toFixed(2))
  const totalGross = Number((totalNet + totalVat).toFixed(2))
  if (totalGross <= 0) return null

  const ettnUuid = crypto.randomUUID().toUpperCase()
  const docNo = `FTR-TSL-${Date.now().toString().slice(-7)}`
  const edoc = await dbAny.eDocumentRecord.create({
    data: {
      ettnUuid,
      documentNo: docNo,
      documentType: "E_FATURA",
      profileId: "TICARIFATURA",
      documentStatus: "TASLAK",
      eInvoiceTimingMode: opts.timingMode,
      relatedOrderNo: stop.sourceRefNo || trip?.tripNumber || stop.id,
      receiverTitle: stop.customerName,
      receiverVknTckn: "1111111111",
      receiverTaxOffice: "Merkez V.D.",
      dispatchDate: new Date(),
      carrierName: "Sunum İç Filo Lojistik",
      vehiclePlate: trip?.vehiclePlate || null,
      driverName: trip?.driverName || null,
      shipmentTripId: stop.tripId,
      shipmentStopId: stop.id,
      totalNetAmount: totalNet,
      totalVatAmount: totalVat,
      totalGrossAmount: totalGross,
      currency: "TRY",
      gibStatusCode: "TASLAK",
      gibStatusText: opts.isPartial
        ? "Kısmi teslimat kanıtı sonrası taslak e-fatura oluşturuldu"
        : "Teslimat kanıtı sonrası taslak e-fatura oluşturuldu",
      linesJson: JSON.stringify(linesWithTotals),
    },
  })

  await dbAny.lojistikShipmentStop
    .update({
      where: { id: stop.id },
      data: {
        eInvoiceId: edoc.id,
        eInvoiceNo: edoc.documentNo,
        eInvoiceStatus: "TASLAK",
        updatedAt: new Date(),
      },
    })
    .catch(() => null)

  if (stop.sourceType === "OMNICHANNEL_ORDER" && stop.sourceId) {
    await dbAny.omnichannelOrder
      .update({
        where: { id: stop.sourceId },
        data: { eInvoiceNo: edoc.documentNo, eInvoiceStatus: "TASLAK" },
      })
      .catch(() => null)
  } else if (stop.sourceType === "ERP_ORDER" && stop.sourceId) {
    await dbAny.order
      .update({
        where: { id: stop.sourceId },
        data: { eInvoiceNo: edoc.documentNo, eInvoiceStatus: "TASLAK" },
      })
      .catch(() => null)
  }

  return edoc
}

/**
 * Yetkili kullanıcı için durak bazlı "Tek Tıkla E-Fatura Kes" onay adımı.
 * Kural: Teslim edilemeyen veya teslimatı tamamlanmamış duraklar faturalanamaz; çift kesim idempotency ile engellenir.
 */
export async function issueOneClickSalesEInvoiceForStop(
  stopId: string,
  actor: { userId: string; username?: string }
) {
  const dbAny = prisma as any
  const stop = await dbAny.lojistikShipmentStop.findUnique({ where: { id: stopId } })
  if (!stop) {
    throw new LogisticsDomainError("NOT_FOUND", "Fatura kesilecek sevkiyat durağı bulunamadı.", 404)
  }
  if (!["TESLIM_EDILDI", "KISMI_TESLIM"].includes(stop.status)) {
    throw new LogisticsDomainError(
      "INVOICE_NOT_ELIGIBLE",
      `Yalnızca teslim edilen duraklar faturalanabilir (durak durumu: ${stop.status}).`,
      409
    )
  }

  let existingEdoc = stop.eInvoiceId
    ? await dbAny.eDocumentRecord.findUnique({ where: { id: stop.eInvoiceId } }).catch(() => null)
    : null
  if (!existingEdoc) {
    existingEdoc = await dbAny.eDocumentRecord
      .findFirst({ where: { shipmentStopId: stop.id, documentType: "E_FATURA" } })
      .catch(() => null)
  }

  // Çift kesim idempotency koruması
  if (
    stop.eInvoiceStatus === "KESILDI" ||
    existingEdoc?.documentStatus === "KESILDI" ||
    existingEdoc?.gibStatusCode === "1300"
  ) {
    return {
      alreadyIssued: true,
      eDocument: existingEdoc,
      eInvoiceNo: stop.eInvoiceNo || existingEdoc?.documentNo || null,
      eInvoiceStatus: "KESILDI" as const,
    }
  }

  const trip = await dbAny.lojistikShipmentTrip
    .findUnique({ where: { id: stop.tripId } })
    .catch(() => null)
  const timingCfg = getServerLogisticsInvoiceTiming()
  const providers = createLogisticsProviders()

  if (!existingEdoc) {
    existingEdoc = await ensureDraftSalesEInvoiceForStop(stop, trip, {
      isPartial: stop.status === "KISMI_TESLIM",
      deliveredRatio: stop.status === "KISMI_TESLIM" ? 0.5 : 1,
      timingMode: timingCfg.mode,
      vatRate: timingCfg.defaultVatRate,
    })
  }
  if (!existingEdoc) {
    throw new LogisticsDomainError(
      "INVOICE_ZERO_AMOUNT",
      "Teslim edilen faturalanabilir miktar/tutar bulunamadı.",
      409
    )
  }

  let issuedDocNo = existingEdoc.documentNo
  let issuedEttn = existingEdoc.ettnUuid
  let gibStatusCode = "1300"
  let gibStatusText = "GİB Başarıyla İletildi (Demo Adaptör - Tek Tık Onay)"

  if (providers.config.eDocumentMode === "external-rest" && providers.config.eDocumentApiUrl) {
    const parsedLines = (() => {
      try {
        return JSON.parse(existingEdoc.linesJson || "[]")
      } catch {
        return []
      }
    })()
    const extRes = await providers.eDocument.submitEDocument({
      documentType: "E_FATURA",
      relatedOrderNo: stop.sourceRefNo || trip?.tripNumber || stop.id,
      receiverTitle: existingEdoc.receiverTitle,
      receiverVknTckn: existingEdoc.receiverVknTckn,
      receiverTaxOffice: existingEdoc.receiverTaxOffice || "Merkez V.D.",
      vehiclePlate: trip?.vehiclePlate || undefined,
      driverName: trip?.driverName || undefined,
      lines: parsedLines,
    })
    issuedDocNo = extRes.documentNo
    issuedEttn = extRes.ettnUuid
    gibStatusCode = extRes.gibStatusCode
    gibStatusText = extRes.gibStatusText
  } else if (String(issuedDocNo).startsWith("FTR-TSL-")) {
    issuedDocNo = `FTR${new Date().getFullYear()}${String(Date.now()).slice(-7)}`
  }

  const updatedEdoc = await dbAny.eDocumentRecord.update({
    where: { id: existingEdoc.id },
    data: {
      documentNo: issuedDocNo,
      ettnUuid: issuedEttn,
      documentStatus: "KESILDI",
      gibStatusCode,
      gibStatusText,
      dispatchDate: new Date(),
    },
  })

  await dbAny.lojistikShipmentStop.update({
    where: { id: stop.id },
    data: {
      eInvoiceId: updatedEdoc.id,
      eInvoiceNo: updatedEdoc.documentNo,
      eInvoiceStatus: "KESILDI",
      updatedAt: new Date(),
    },
  })

  if (stop.sourceType === "OMNICHANNEL_ORDER" && stop.sourceId) {
    await dbAny.omnichannelOrder
      .update({
        where: { id: stop.sourceId },
        data: { eInvoiceNo: updatedEdoc.documentNo, eInvoiceStatus: "KESILDI" },
      })
      .catch(() => null)
  } else if (stop.sourceType === "ERP_ORDER" && stop.sourceId) {
    await dbAny.order
      .update({
        where: { id: stop.sourceId },
        data: { eInvoiceNo: updatedEdoc.documentNo, eInvoiceStatus: "KESILDI" },
      })
      .catch(() => null)
  }

  await appendTrackingEvent({
    tripId: stop.tripId,
    stopId: stop.id,
    eventType: "EINVOICE_ISSUED",
    actorUserId: actor.userId,
    actorName: actor.username || actor.userId,
    message: `${updatedEdoc.documentNo} numaralı satış E-Faturası kesildi (${stop.customerName}).`,
    metadata: { eInvoiceId: updatedEdoc.id, ettnUuid: updatedEdoc.ettnUuid },
  })

  await logLogisticsAudit({
    userId: actor.userId,
    action: "ISSUE_ONE_CLICK_EINVOICE",
    resource: "lojistik_sevkiyat_rota",
    resourceId: updatedEdoc.id,
    moduleKey: "lojistik_sevkiyat_rota",
    metadata: { stopId: stop.id, documentNo: updatedEdoc.documentNo },
  })

  return {
    alreadyIssued: false,
    eDocument: updatedEdoc,
    eInvoiceNo: updatedEdoc.documentNo,
    eInvoiceStatus: "KESILDI" as const,
  }
}

export async function submitStopDeliveryProof(
  params: {
    stopId: string
    captureMethod?: "IMZA_CIZIM" | "FOTOGRAF" | "QR_KOD" | "PIN_ONAY"
    recipientName: string
    recipientRelation?: string
    note?: string
    signatureUrlOrDataUrl?: string | null
    photoUrlsOrDataUrls?: string[]
    deliveryStatus?: "TESLIM_EDILDI" | "KISMI_TESLIM"
    deliveredRatio?: number
    deliveredItems?: Array<{ sku: string; itemName: string; deliveredQty: number; unitPrice?: number }>
    capturedLat?: number
    capturedLng?: number
    driverId?: string
  },
  actor: { userId: string; username?: string }
) {
  const dbAny = prisma as any
  const stop = await dbAny.lojistikShipmentStop.findUnique({ where: { id: params.stopId } })
  if (!stop) throw new LogisticsDomainError("NOT_FOUND", "Teslimat kanıtı işlenecek durak bulunamadı.", 404)
  if (!params.recipientName?.trim()) {
    throw new LogisticsDomainError("VALIDATION_ERROR", "Teslim alan alıcı adı soyadı zorunludur.", 400)
  }

  const providers = createLogisticsProviders()
  let signatureFileUrl: string | null = null
  const checksumParts: string[] = []

  if (params.signatureUrlOrDataUrl) {
    if (params.signatureUrlOrDataUrl.startsWith("/api/") || params.signatureUrlOrDataUrl.startsWith("http")) {
      signatureFileUrl = params.signatureUrlOrDataUrl
      checksumParts.push(signatureFileUrl)
    } else if (params.signatureUrlOrDataUrl.startsWith("data:image/")) {
      const stored = await providers.storage.saveProofArtifact({
        fileName: `sign-${stop.id}.png`,
        mimeType: "image/png",
        base64OrDataUrl: params.signatureUrlOrDataUrl,
        category: "POD_SIGNATURE",
        referenceId: stop.id,
      })
      signatureFileUrl = stored.publicUrl
      checksumParts.push(stored.checksumSha256)
    }
  }

  const photoFileUrls: string[] = []
  for (let i = 0; i < (params.photoUrlsOrDataUrls || []).length; i++) {
    const raw = params.photoUrlsOrDataUrls![i]
    if (!raw) continue
    if (raw.startsWith("/api/") || raw.startsWith("http")) {
      photoFileUrls.push(raw)
      checksumParts.push(raw)
    } else if (raw.startsWith("data:image/")) {
      const stored = await providers.storage.saveProofArtifact({
        fileName: `photo-${stop.id}-${i + 1}.png`,
        mimeType: "image/png",
        base64OrDataUrl: raw,
        category: "POD_PHOTO",
        referenceId: stop.id,
      })
      photoFileUrls.push(stored.publicUrl)
      checksumParts.push(stored.checksumSha256)
    }
  }

  const checksumSha256 = crypto
    .createHash("sha256")
    .update(`${stop.id}|${params.recipientName.trim()}|${checksumParts.join("|")}`)
    .digest("hex")

  const proofRec = await dbAny.lojistikDeliveryProof.create({
    data: {
      id: `pod-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      tripId: stop.tripId,
      stopId: stop.id,
      captureMethod: params.captureMethod || (signatureFileUrl ? "IMZA_CIZIM" : "FOTOGRAF"),
      recipientName: params.recipientName.trim(),
      recipientRelation: params.recipientRelation || "ALICI",
      note: params.note || null,
      signatureFileUrl,
      photoFileUrlsJson: JSON.stringify(photoFileUrls),
      checksumSha256,
      capturedLat: params.capturedLat ?? stop.lat,
      capturedLng: params.capturedLng ?? stop.lng,
      capturedAt: new Date(),
      capturedByDriverId: params.driverId || null,
      createdAt: new Date(),
    },
  })

  const statusResult = await driverUpdateTripOrStopExecution(
    {
      tripId: stop.tripId,
      stopId: stop.id,
      status: params.deliveryStatus || "TESLIM_EDILDI",
      driverNote: params.note,
      lat: params.capturedLat ?? stop.lat,
      lng: params.capturedLng ?? stop.lng,
    },
    actor
  )

  const isPartial = params.deliveryStatus === "KISMI_TESLIM"
  const deliveredRatio = isPartial
    ? Math.max(0.05, Math.min(0.99, Number(params.deliveredRatio ?? 0.5)))
    : 1

  // Kaynak siparişi ve bağlı WMS görev/rezervasyonunu tamamlandı olarak güncelle
  if (stop.sourceType === "OMNICHANNEL_ORDER" && stop.sourceId) {
    await dbAny.omnichannelOrder
      .update({
        where: { id: stop.sourceId },
        data: { status: isPartial ? "PARTIALLY_SHIPPED" : "DELIVERED" },
      })
      .catch(() => null)
  } else if (stop.sourceType === "ERP_ORDER" && stop.sourceId && !isPartial) {
    await dbAny.order
      .update({ where: { id: stop.sourceId }, data: { status: "delivered" } })
      .catch(() => null)
  } else if (stop.sourceType === "WMS_WAVE" && stop.sourceId) {
    await dbAny.wmsTask
      .update({
        where: { id: stop.sourceId },
        data: {
          workflowStage: isPartial ? "PACKING" : "SHIPPED",
          status: isPartial ? "IN_PROGRESS" : "COMPLETED",
          completedAt: isPartial ? null : new Date(),
        },
      })
      .catch(() => null)
  }

  // Açık WMS stok rezervasyonlarını teslimat oranına göre FULFILLED olarak kapat
  if (stop.sourceId || stop.sourceRefNo) {
    try {
      const openReservations = await dbAny.lojistikStockReservation
        .findMany({
          where: { status: { in: ["ACTIVE", "PARTIAL"] } },
        })
        .catch(() => [])
      for (const r of openReservations) {
        const matchesSource =
          (stop.sourceId && r.sourceId === stop.sourceId) ||
          (stop.sourceRefNo && r.sourceRefNo === stop.sourceRefNo)
        if (!matchesSource) continue
        const openQty = Math.max(
          0,
          Number(r.reservedQty || 0) - Number(r.fulfilledQty || 0) - Number(r.releasedQty || 0)
        )
        if (openQty <= 0) continue
        await releaseStockReservation({
          reservationId: r.id,
          releaseQty: isPartial ? Math.max(1, Math.round(openQty * deliveredRatio)) : openQty,
          markStatus: "FULFILLED",
          performedBy: actor.username || actor.userId,
        })
      }
    } catch {
      // Rezervasyon kapanışı POD kaydını kesmez
    }
  }

  // Yapılandırılabilir E-Fatura zamanlamasına göre teslimat sonrası TASLAK e-fatura oluştur (idempotent)
  let draftInvoice: any = null
  const timingCfg = getServerLogisticsInvoiceTiming()
  if (
    timingCfg.mode === "ON_DELIVERY_DRAFT" &&
    timingCfg.autoDraftOnDelivery &&
    (!isPartial || timingCfg.allowPartialDeliveryDraft)
  ) {
    draftInvoice = await ensureDraftSalesEInvoiceForStop(stop, statusResult.trip, {
      isPartial,
      deliveredRatio,
      deliveredItems: params.deliveredItems,
      timingMode: timingCfg.mode,
      vatRate: timingCfg.defaultVatRate,
    }).catch(() => null)
    if (draftInvoice) {
      await appendTrackingEvent({
        tripId: stop.tripId,
        stopId: stop.id,
        eventType: "EINVOICE_DRAFT_CREATED",
        actorUserId: actor.userId,
        actorName: actor.username || actor.userId,
        message: `${draftInvoice.documentNo} numaralı satış E-Fatura taslağı oluşturuldu (Kesim onayında).`,
        metadata: { eInvoiceId: draftInvoice.id, isPartial },
      })
    }
  }

  await appendTrackingEvent({
    tripId: stop.tripId,
    stopId: stop.id,
    eventType: "POD_CAPTURED",
    actorUserId: actor.userId,
    actorName: actor.username || actor.userId,
    message: `Teslimat kanıtı (e-POD) alındı — Teslim Alan: ${proofRec.recipientName}.`,
    lat: params.capturedLat ?? stop.lat,
    lng: params.capturedLng ?? stop.lng,
    metadata: { checksumSha256, photoCount: photoFileUrls.length, hasSignature: Boolean(signatureFileUrl) },
  })

  await logLogisticsAudit({
    userId: actor.userId,
    action: "CAPTURE_DELIVERY_POD",
    resource: "lojistik_sevkiyat_rota",
    resourceId: proofRec.id,
    moduleKey: "lojistik_sevkiyat_rota",
    metadata: { tripId: stop.tripId, stopId: stop.id, recipientName: proofRec.recipientName },
  })

  return { proof: proofRec, ...statusResult, draftInvoice }
}

/**
 * E: Kimlik doğrulamasız ama tahmin edilemez (CSPRNG 192-bit token), süreli müşteri takip sorgusu.
 * Hassas şirket içi maliyet/TCKN verisi asla dönülmez.
 */
export async function getPublicCustomerTrackingByToken(token: string) {
  const clean = String(token || "").trim()
  if (clean.length < 12) {
    return { found: false as const, expired: false as const }
  }

  const dbAny = prisma as any
  const stop = await dbAny.lojistikShipmentStop.findFirst({ where: { trackingToken: clean } }).catch(() => null)
  if (!stop) {
    return { found: false as const, expired: false as const }
  }

  const expAt = new Date(stop.trackingExpiresAt)
  if (Number.isNaN(expAt.getTime()) || Date.now() > expAt.getTime()) {
    return {
      found: true as const,
      expired: true as const,
      expiredAt: stop.trackingExpiresAt,
      orderRef: stop.sourceRefNo || "Sipariş",
    }
  }

  const [trip, tripStops, proofs, events] = await Promise.all([
    dbAny.lojistikShipmentTrip.findUnique({ where: { id: stop.tripId } }).catch(() => null),
    dbAny.lojistikShipmentStop.findMany({ where: { tripId: stop.tripId } }).catch(() => []),
    dbAny.lojistikDeliveryProof.findMany({ where: { stopId: stop.id } }).catch(() => []),
    dbAny.lojistikTrackingEvent.findMany({ where: { tripId: stop.tripId } }).catch(() => []),
  ])

  const driverMasked = trip?.driverName
    ? (() => {
        const parts = String(trip.driverName).trim().split(/\s+/)
        return parts.length > 1 ? `${parts[0]} ${parts[parts.length - 1][0]}.` : parts[0]
      })()
    : null

  const sortedStops = [...tripStops].sort((a: any, b: any) => Number(a.sequenceNo) - Number(b.sequenceNo))
  const stopsBeforeCount = sortedStops.filter(
    (s: any) =>
      Number(s.sequenceNo) < Number(stop.sequenceNo) &&
      !["TESLIM_EDILDI", "KISMI_TESLIM", "TESLIM_EDILEMEDI"].includes(s.status)
  ).length

  const latestProof = proofs[0] || null

  return {
    found: true as const,
    expired: false as const,
    tracking: {
      orderRef: stop.sourceRefNo || stop.id,
      customerName: stop.customerName,
      cityDistrict: stop.cityDistrict || "Teslimat Bölgesi",
      status: stop.status,
      tripStatus: trip?.status || "YOLDA",
      tripNumber: trip?.tripNumber || null,
      vehiclePlate: trip?.vehiclePlate || null,
      driverShortName: driverMasked,
      sequenceNo: stop.sequenceNo,
      totalStopsInTrip: sortedStops.length,
      stopsRemainingBeforeYou: stopsBeforeCount,
      plannedEtaAt: stop.plannedEtaAt,
      actualArrivalAt: stop.actualArrivalAt,
      actualDepartureAt: stop.actualDepartureAt,
      delayMinutes: stop.delayMinutes || 0,
      timeWindowStart: stop.timeWindowStart,
      timeWindowEnd: stop.timeWindowEnd,
      failureReasonNote: stop.status === "TESLIM_EDILEMEDI" ? stop.failureReasonNote : null,
      trackingExpiresAt: stop.trackingExpiresAt,
      eWaybillNo: trip?.eWaybillNo || null,
      podSummary: latestProof
        ? {
            recipientName: latestProof.recipientName,
            recipientRelation: latestProof.recipientRelation,
            capturedAt: latestProof.capturedAt,
            hasSignature: Boolean(latestProof.signatureFileUrl),
          }
        : null,
      timeline: events
        .filter((e: any) => !e.stopId || e.stopId === stop.id)
        .sort((a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
        .slice(0, 8)
        .map((e: any) => ({
          eventType: e.eventType,
          message: e.message,
          createdAt: e.createdAt,
        })),
    },
  }
}

export async function extendOrRotateTrackingLink(
  params: { stopId: string; extendHours?: number; regenerateToken?: boolean },
  actor: { userId: string }
) {
  const dbAny = prisma as any
  const stop = await dbAny.lojistikShipmentStop.findUnique({ where: { id: params.stopId } })
  if (!stop) throw new LogisticsDomainError("NOT_FOUND", "Durak bulunamadı.", 404)

  const newToken = params.regenerateToken ? generateSecureTrackingToken() : stop.trackingToken
  const newExp = new Date(Date.now() + Math.max(1, Number(params.extendHours ?? 72)) * 3600_000)

  const updated = await dbAny.lojistikShipmentStop.update({
    where: { id: stop.id },
    data: {
      trackingToken: newToken,
      trackingExpiresAt: newExp,
      updatedAt: new Date(),
    },
  })

  await logLogisticsAudit({
    userId: actor.userId,
    action: "UPDATE_TRACKING_LINK",
    resource: "lojistik_sevkiyat_rota",
    resourceId: stop.id,
    moduleKey: "lojistik_sevkiyat_rota",
    metadata: { regenerateToken: Boolean(params.regenerateToken), trackingExpiresAt: newExp.toISOString() },
  })

  return updated
}
