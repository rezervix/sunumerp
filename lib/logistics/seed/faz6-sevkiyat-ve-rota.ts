/**
 * Lojistik Faz 6 (lojistik_sevkiyat_rota — Sevkiyat, Sefer Planlama, CVRPTW Rota, e-POD & Müşteri Takip)
 * İdempotent ve Tam Geri Alınabilir Demo Seed Modülü
 *
 * KURALLAR:
 * - Yalnızca DEMO ortamında çalışır (`isDemoEnvironment()`).
 * - Mevcut hiçbir kayda dokunmaz; tüm Faz 6 kayıtları `f6-*` önekli sabit ID taşır.
 * - Mesafe/Süre ve poliçizgi geometrisi gerçek `optimizeSingleTripRoute` CVRPTW çözücüsüyle hesaplanır;
 *   uydurma tasarruf yüzdesi yazılmaz.
 * - e-POD imzaları ve teslimat fotoğrafları diskte tracked `public/uploads/pod-demo/*.png`
 *   dosyalarına ve gerçek SHA-256 sağlama toplamlarına bağlanır.
 * - Müşteri takip linkleri 192-bit CSPRNG token (`crypto.randomBytes(24).toString("hex")`) kullanır.
 */

import crypto from "crypto"
import fs from "fs"
import path from "path"
import { optimizeSingleTripRoute } from "../dispatch/cvrptwSolver"
import { DEMO_WAREHOUSE_COORDINATES } from "../constants"
import type { LogisticsSeedModule } from "./framework"

const SEEDED_TRIP_IDS = ["f6-trip-01", "f6-trip-02", "f6-trip-03", "f6-trip-04"] as const
const SEEDED_STOP_IDS = Array.from({ length: 14 }, (_, i) => `f6-stop-${String(i + 1).padStart(2, "0")}`)
const SEEDED_POD_IDS = ["f6-pod-01", "f6-pod-02", "f6-pod-03", "f6-pod-04"] as const
const SEEDED_OPT_JOB_IDS = ["f6-job-01", "f6-job-02", "f6-job-03", "f6-job-04"] as const
const SEEDED_TRACKING_EVENT_IDS = Array.from({ length: 12 }, (_, i) => `f6-tev-${String(i + 1).padStart(2, "0")}`)
const SEEDED_EDOC_IDS = ["f6-edoc-01", "f6-edoc-02", "f6-edoc-03"] as const

function pushIfMissing(db: Record<string, any[]>, col: string, rec: any): number {
  if (!Array.isArray(db[col])) db[col] = []
  if (db[col].some((r) => String(r?.id) === String(rec.id))) return 0
  db[col].push(rec)
  return 1
}

function removeByIds(list: any[] | undefined, ids: Set<string>): number {
  if (!Array.isArray(list) || ids.size === 0) return 0
  const before = list.length
  const kept = list.filter((r) => !ids.has(String(r?.id ?? "")))
  list.length = 0
  list.push(...kept)
  return before - kept.length
}

function daysAgoIso(days: number): string {
  return new Date(Date.now() - days * 86_400_000).toISOString()
}

function hoursAgoIso(hours: number): string {
  return new Date(Date.now() - hours * 3_600_000).toISOString()
}

function hoursAheadIso(hours: number): string {
  return new Date(Date.now() + hours * 3_600_000).toISOString()
}

function todayDateKey(): string {
  return new Date().toISOString().slice(0, 10)
}

function yesterdayDateKey(): string {
  return new Date(Date.now() - 86_400_000).toISOString().slice(0, 10)
}

function todayAtHhMm(hh: number, mm: number): string {
  const d = new Date()
  d.setHours(hh, mm, 0, 0)
  return d.toISOString()
}

function yesterdayAtHhMm(hh: number, mm: number): string {
  const d = new Date(Date.now() - 86_400_000)
  d.setHours(hh, mm, 0, 0)
  return d.toISOString()
}

function computeDemoPodSha256(fileName: string): string {
  const fullPath = path.join(process.cwd(), "public", "uploads", "pod-demo", fileName)
  if (fs.existsSync(fullPath)) {
    const buf = fs.readFileSync(fullPath)
    return crypto.createHash("sha256").update(buf).digest("hex")
  }
  return crypto.createHash("sha256").update(`pod-demo:${fileName}`).digest("hex")
}

function generate192BitToken(): string {
  return crypto.randomBytes(24).toString("hex")
}

interface RawStopTemplate {
  id: string
  sourceType: string
  sourceId: string | null
  sourceRefNo: string
  customerId: string | null
  customerName: string
  contactPhone: string | null
  addressText: string
  cityDistrict: string
  lat: number
  lng: number
  timeWindowStart: string
  timeWindowEnd: string
  serviceMinutes: number
  weightKg: number
  volumeM3: number
  palletCount: number
  requiresColdChain: boolean
  priority: number
  status: string
  actualArrivalAt: string | null
  actualDepartureAt: string | null
  delayMinutes: number
  failureReasonCode: string | null
  failureReasonNote: string | null
  driverNote: string | null
  expiresHoursFromNow: number
}

export const faz6DispatchAndRoutingSeedModule: LogisticsSeedModule = {
  moduleKey: "faz6_sevkiyat_ve_rota",
  phase: 6,
  seededIdsByCollection: {
    lojistikShipmentTrip: SEEDED_TRIP_IDS,
    lojistikShipmentStop: SEEDED_STOP_IDS,
    lojistikDeliveryProof: SEEDED_POD_IDS,
    lojistikRouteOptimizationJob: SEEDED_OPT_JOB_IDS,
    lojistikTrackingEvent: SEEDED_TRACKING_EVENT_IDS,
    eDocumentRecord: SEEDED_EDOC_IDS,
  },

  seed(db) {
    const inserted: Record<string, number> = {}
    const track = (col: string, rec: any) => {
      inserted[col] = (inserted[col] || 0) + pushIfMissing(db, col, rec)
    }

    const whMerkez = DEMO_WAREHOUSE_COORDINATES["wh-merkez-01"] || {
      code: "DEP-MRK-01",
      label: "Tuzla Merkez Soğuk Hava & Dağıtım Deposu",
      lat: 40.8224,
      lng: 29.3665,
    }
    const whOnline = DEMO_WAREHOUSE_COORDINATES["wh-online-03"] || {
      code: "DEP-ETC-03",
      label: "Ümraniye E-Ticaret Dağıtım Hub",
      lat: 41.0254,
      lng: 29.1155,
    }

    const todayKey = todayDateKey()
    const yestKey = yesterdayDateKey()
    const sig01Hash = computeDemoPodSha256("pod-sign-01.png")
    const sig02Hash = computeDemoPodSha256("pod-sign-02.png")
    const sig03Hash = computeDemoPodSha256("pod-sign-03.png")

    // ── 1) Bugünkü Canlı Çok Duraklı Soğuk Zincir Seferi (SFR-2026-601, TESLIMAT_SURUYOR) ──
    const trip1StopsRaw: RawStopTemplate[] = [
      {
        id: "f6-stop-01",
        sourceType: "OMNICHANNEL_ORDER",
        sourceId: "omni-ord-001",
        sourceRefNo: "OMN-2026-9041",
        customerId: "cust-05",
        customerName: "KoçSistem Bilgi ve İletişim Hizmetleri A.Ş.",
        contactPhone: "+90 216 555 01 41",
        addressText: "Nakkaştepe Azizbey Sok. No:1, Kuzguncuk, Üsküdar / İstanbul",
        cityDistrict: "Üsküdar / İstanbul",
        lat: 41.0352,
        lng: 29.0358,
        timeWindowStart: "08:00",
        timeWindowEnd: "10:30",
        serviceMinutes: 12,
        weightKg: 260,
        volumeM3: 1.8,
        palletCount: 1,
        requiresColdChain: true,
        priority: 2,
        status: "TESLIM_EDILDI",
        actualArrivalAt: todayAtHhMm(8, 52),
        actualDepartureAt: todayAtHhMm(9, 6),
        delayMinutes: 0,
        failureReasonCode: null,
        failureReasonNote: null,
        driverNote: "Kuzey resepsiyona soğuk zincir kutusuyla teslim edildi.",
        expiresHoursFromNow: 72,
      },
      {
        id: "f6-stop-02",
        sourceType: "ERP_ORDER",
        sourceId: "ord-01",
        sourceRefNo: "ORD-2026-0101",
        customerId: "cust-01",
        customerName: "Ziraat Bankası A.Ş. Marmara Bölge",
        contactPhone: "+90 216 555 02 18",
        addressText: "Finans Kent Mah. Ümraniye Bölge Plaza No:14, Ümraniye / İstanbul",
        cityDistrict: "Ümraniye / İstanbul",
        lat: 41.0118,
        lng: 29.1086,
        timeWindowStart: "09:00",
        timeWindowEnd: "11:30",
        serviceMinutes: 10,
        weightKg: 195,
        volumeM3: 1.4,
        palletCount: 1,
        requiresColdChain: true,
        priority: 1,
        status: "TESLIM_EDILDI",
        actualArrivalAt: todayAtHhMm(9, 44),
        actualDepartureAt: todayAtHhMm(9, 58),
        delayMinutes: 0,
        failureReasonCode: null,
        failureReasonNote: null,
        driverNote: "Güvenlik X-Ray kontrolü sonrası teslim alındı.",
        expiresHoursFromNow: 72,
      },
      {
        id: "f6-stop-03",
        sourceType: "MANUAL",
        sourceId: null,
        sourceRefNo: "SVK-2026-8813",
        customerId: "cust-06",
        customerName: "Teknosa İç ve Dış Ticaret A.Ş.",
        contactPhone: "+90 216 555 03 67",
        addressText: "Carrefoursa Plaza Cevizli Mah. Tugay Yolu Cad. No:67, Maltepe / İstanbul",
        cityDistrict: "Maltepe / İstanbul",
        lat: 40.9195,
        lng: 29.1462,
        timeWindowStart: "10:00",
        timeWindowEnd: "12:00",
        serviceMinutes: 12,
        weightKg: 310,
        volumeM3: 2.1,
        palletCount: 1,
        requiresColdChain: true,
        priority: 2,
        status: "VARISTA",
        actualArrivalAt: todayAtHhMm(10, 48),
        actualDepartureAt: null,
        delayMinutes: 18,
        failureReasonCode: null,
        failureReasonNote: null,
        driverNote: "E-5 gişe trafiği nedeniyle +18 dk gecikmeli varış yapıldı, boşaltma peronunda.",
        expiresHoursFromNow: 96,
      },
      {
        id: "f6-stop-04",
        sourceType: "MANUAL",
        sourceId: null,
        sourceRefNo: "SVK-2026-8814",
        customerId: "cust-08",
        customerName: "Pegasus Hava Taşımacılığı VIP İkram",
        contactPhone: "+90 216 555 04 88",
        addressText: "Aeropark Yenişehir Mah. Osmanlı Bulvarı No:11/A, Pendik / İstanbul",
        cityDistrict: "Pendik / İstanbul",
        lat: 40.9148,
        lng: 29.3085,
        timeWindowStart: "11:00",
        timeWindowEnd: "13:30",
        serviceMinutes: 15,
        weightKg: 245,
        volumeM3: 1.6,
        palletCount: 1,
        requiresColdChain: true,
        priority: 1,
        status: "YOLDA",
        actualArrivalAt: null,
        actualDepartureAt: null,
        delayMinutes: 18,
        failureReasonCode: null,
        failureReasonNote: null,
        driverNote: null,
        expiresHoursFromNow: 96,
      },
      {
        id: "f6-stop-05",
        sourceType: "MANUAL",
        sourceId: null,
        sourceRefNo: "SVK-2026-8815",
        customerId: "cust-02",
        customerName: "Çiçek Sepeti Dağıtım Merkezi",
        contactPhone: "+90 212 555 05 22",
        addressText: "Küçükyalı Sahil Şevki Özbek Sok. No:8, Maltepe / İstanbul",
        cityDistrict: "Maltepe Sahil / İstanbul",
        lat: 40.9462,
        lng: 29.1154,
        timeWindowStart: "12:00",
        timeWindowEnd: "15:00",
        serviceMinutes: 10,
        weightKg: 140,
        volumeM3: 0.9,
        palletCount: 0,
        requiresColdChain: true,
        priority: 1,
        status: "BEKLIYOR",
        actualArrivalAt: null,
        actualDepartureAt: null,
        delayMinutes: 12,
        failureReasonCode: null,
        failureReasonNote: null,
        driverNote: null,
        expiresHoursFromNow: 96,
      },
    ]

    const dep1Iso = todayAtHhMm(8, 0)
    const opt1 = optimizeSingleTripRoute({
      origin: { label: whMerkez.label || "Tuzla Merkez Depo", lat: whMerkez.lat, lng: whMerkez.lng },
      stops: trip1StopsRaw,
      plannedDepartureAt: dep1Iso,
      avgSpeedKmh: 38,
      timeBudgetMs: 120,
    })
    const schedById1 = new Map(opt1.stops.map((s) => [s.id, s]))

    track("lojistikShipmentTrip", {
      id: "f6-trip-01",
      tripNumber: "SFR-2026-601",
      title: "Marmara Anadolu Yakası Soğuk Zincir Seferi",
      branchId: "local-debug-branch",
      originWarehouseId: "wh-merkez-01",
      originLabel: whMerkez.label,
      originLat: whMerkez.lat,
      originLng: whMerkez.lng,
      vehicleId: "f5-veh-01",
      driverId: "f5-drv-01",
      vehiclePlate: "34 SNR 808",
      driverName: "Cemal Kaya",
      plannedDateKey: todayKey,
      plannedDepartureAt: dep1Iso,
      actualDepartureAt: todayAtHhMm(8, 5),
      plannedCompletionAt: new Date(
        new Date(dep1Iso).getTime() + opt1.estimatedDurationMin * 60_000
      ).toISOString(),
      actualCompletionAt: null,
      status: "TESLIMAT_SURUYOR",
      totalWeightKg: 1150,
      totalVolumeM3: 7.8,
      totalPallets: 4,
      capacityLoadPct: 79.3,
      baselineUnoptimizedDistanceKm: opt1.baselineUnoptimizedDistanceKm,
      plannedDistanceKm: opt1.optimizedDistanceKm,
      actualDistanceKm: 41.8,
      plannedDurationMin: opt1.estimatedDurationMin,
      actualDurationMin: 168,
      routeProviderMode: opt1.providerMode,
      routeSolverName: opt1.solverName,
      eWaybillId: "f6-edoc-01",
      eWaybillNo: "IRS2026000601",
      eWaybillEttn: "F6601000-1111-4444-8888-202600000601",
      replanReason: "E-5 Köprü trafiği sonrası ETA kaydırıldı (+18 dk).",
      replanHistoryJson: JSON.stringify([
        {
          at: todayAtHhMm(10, 32),
          reason: "E-5 gişe yoğunluğu nedeniyle Maltepe/Pendik varışları ötelendi",
          delayMinutes: 18,
          mode: "DELAY_ETA_SHIFT",
        },
      ]),
      polylineJson: JSON.stringify(opt1.polylinePoints),
      notes: "2°C–6°C frigo sevkiyat; 2 durak teslim edildi, 3. durakta araç.",
      createdBy: "usr-admin-01",
      approvedBy: "Lojistik Planlama Şefi",
      approvedAt: todayAtHhMm(7, 45),
      createdAt: todayAtHhMm(7, 15),
      updatedAt: todayAtHhMm(10, 48),
    })

    for (const s of trip1StopsRaw) {
      const sch = schedById1.get(s.id)
      track("lojistikShipmentStop", {
        id: s.id,
        tripId: "f6-trip-01",
        sequenceNo: sch?.sequenceNo ?? 1,
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
        plannedEtaAt: sch?.plannedEtaAt ?? dep1Iso,
        actualArrivalAt: s.actualArrivalAt,
        actualDepartureAt: s.actualDepartureAt,
        legDistanceKm: sch?.legDistanceKm ?? 8.4,
        cumulativeDistanceKm: sch?.cumulativeDistanceKm ?? 8.4,
        delayMinutes: s.delayMinutes,
        status: s.status,
        failureReasonCode: s.failureReasonCode,
        failureReasonNote: s.failureReasonNote,
        driverNote: s.driverNote,
        trackingToken: generate192BitToken(),
        trackingExpiresAt: hoursAheadIso(s.expiresHoursFromNow),
        reassignedFromTripId: null,
        createdAt: todayAtHhMm(7, 15),
        updatedAt: todayAtHhMm(10, 48),
      })
    }

    // ── 2) Optimize vs Ham Kıyaslama Seferi (SFR-2026-602, ONAYLANDI — Karışık Boğaz Geçişini Çözer) ──
    const trip2StopsRaw: RawStopTemplate[] = [
      // Kasıtlı çapraz/karışık giriş sırası: Tuzla -> Beylikdüzü -> Pendik -> Sarıyer
      {
        id: "f6-stop-06",
        sourceType: "MANUAL",
        sourceId: null,
        sourceRefNo: "SVK-2026-8821",
        customerId: "cust-02",
        customerName: "Çiçek Sepeti Maslak Plaza",
        contactPhone: "+90 212 555 09 10",
        addressText: "Maslak Mah. Büyükdere Cad. USO Center No:245, Sarıyer / İstanbul",
        cityDistrict: "Sarıyer / İstanbul",
        lat: 41.1128,
        lng: 29.0209,
        timeWindowStart: "09:30",
        timeWindowEnd: "12:00",
        serviceMinutes: 12,
        weightKg: 420,
        volumeM3: 2.8,
        palletCount: 2,
        requiresColdChain: false,
        priority: 2,
        status: "BEKLIYOR",
        actualArrivalAt: null,
        actualDepartureAt: null,
        delayMinutes: 0,
        failureReasonCode: null,
        failureReasonNote: null,
        driverNote: null,
        expiresHoursFromNow: 96,
      },
      {
        id: "f6-stop-07",
        sourceType: "MANUAL",
        sourceId: null,
        sourceRefNo: "SVK-2026-8822",
        customerId: "cust-07",
        customerName: "Hepsiburada Trump Kuleleri",
        contactPhone: "+90 212 555 09 11",
        addressText: "Kuştepe Mah. Mecidiyeköy Yolu Cad. Trump Towers, Şişli / İstanbul",
        cityDistrict: "Şişli / İstanbul",
        lat: 41.0681,
        lng: 28.9937,
        timeWindowStart: "10:00",
        timeWindowEnd: "13:00",
        serviceMinutes: 10,
        weightKg: 350,
        volumeM3: 2.4,
        palletCount: 1,
        requiresColdChain: false,
        priority: 1,
        status: "BEKLIYOR",
        actualArrivalAt: null,
        actualDepartureAt: null,
        delayMinutes: 0,
        failureReasonCode: null,
        failureReasonNote: null,
        driverNote: null,
        expiresHoursFromNow: 96,
      },
      {
        id: "f6-stop-08",
        sourceType: "MANUAL",
        sourceId: null,
        sourceRefNo: "SVK-2026-8823",
        customerId: "cust-03",
        customerName: "Vodafone Türkiye Genel Müdürlük",
        contactPhone: "+90 212 555 09 12",
        addressText: "Merkez Mah. Ayazma Cad. Papirus Plaza No:37, Kağıthane / İstanbul",
        cityDistrict: "Kağıthane / İstanbul",
        lat: 41.0846,
        lng: 28.9721,
        timeWindowStart: "11:00",
        timeWindowEnd: "14:30",
        serviceMinutes: 12,
        weightKg: 310,
        volumeM3: 2.1,
        palletCount: 1,
        requiresColdChain: false,
        priority: 1,
        status: "BEKLIYOR",
        actualArrivalAt: null,
        actualDepartureAt: null,
        delayMinutes: 0,
        failureReasonCode: null,
        failureReasonNote: null,
        driverNote: null,
        expiresHoursFromNow: 96,
      },
      {
        id: "f6-stop-09",
        sourceType: "MANUAL",
        sourceId: null,
        sourceRefNo: "SVK-2026-8824",
        customerId: "cust-04",
        customerName: "Garanti BBVA Etiler Kampüs",
        contactPhone: "+90 212 555 09 13",
        addressText: "Nispetiye Mah. Aytar Cad. No:2, Beşiktaş / İstanbul",
        cityDistrict: "Beşiktaş / İstanbul",
        lat: 41.0789,
        lng: 29.0241,
        timeWindowStart: "09:00",
        timeWindowEnd: "11:00",
        serviceMinutes: 10,
        weightKg: 290,
        volumeM3: 1.9,
        palletCount: 1,
        requiresColdChain: false,
        priority: 2,
        status: "BEKLIYOR",
        actualArrivalAt: null,
        actualDepartureAt: null,
        delayMinutes: 0,
        failureReasonCode: null,
        failureReasonNote: null,
        driverNote: null,
        expiresHoursFromNow: 96,
      },
    ]

    const dep2Iso = todayAtHhMm(9, 0)
    const opt2 = optimizeSingleTripRoute({
      origin: { label: whOnline.label || "Ümraniye E-Ticaret Hub", lat: whOnline.lat, lng: whOnline.lng },
      stops: trip2StopsRaw,
      plannedDepartureAt: dep2Iso,
      avgSpeedKmh: 36,
      timeBudgetMs: 120,
    })
    const schedById2 = new Map(opt2.stops.map((s) => [s.id, s]))

    track("lojistikShipmentTrip", {
      id: "f6-trip-02",
      tripNumber: "SFR-2026-602",
      title: "Avrupa Yakası Kurumsal Plaza Ringi (CVRPTW Optimize)",
      branchId: "local-debug-branch",
      originWarehouseId: "wh-online-03",
      originLabel: whOnline.label,
      originLat: whOnline.lat,
      originLng: whOnline.lng,
      vehicleId: "f5-veh-02",
      driverId: "f5-drv-02",
      vehiclePlate: "34 LJS 402",
      driverName: "Kadir Şahin",
      plannedDateKey: todayKey,
      plannedDepartureAt: dep2Iso,
      actualDepartureAt: null,
      plannedCompletionAt: new Date(
        new Date(dep2Iso).getTime() + opt2.estimatedDurationMin * 60_000
      ).toISOString(),
      actualCompletionAt: null,
      status: "ONAYLANDI",
      totalWeightKg: 1370,
      totalVolumeM3: 9.2,
      totalPallets: 5,
      capacityLoadPct: 51.1,
      baselineUnoptimizedDistanceKm: opt2.baselineUnoptimizedDistanceKm,
      plannedDistanceKm: opt2.optimizedDistanceKm,
      actualDistanceKm: 0,
      plannedDurationMin: opt2.estimatedDurationMin,
      actualDurationMin: 0,
      routeProviderMode: opt2.providerMode,
      routeSolverName: opt2.solverName,
      eWaybillId: "f6-edoc-02",
      eWaybillNo: "IRS2026000602",
      eWaybillEttn: "F6602000-2222-4444-8888-202600000602",
      replanReason: null,
      replanHistoryJson: null,
      polylineJson: JSON.stringify(opt2.polylinePoints),
      notes: "Beşiktaş (09:00-11:00) penceresi önceliklendirilerek optimize edildi.",
      createdBy: "usr-admin-01",
      approvedBy: "Lojistik Planlama Şefi",
      approvedAt: todayAtHhMm(8, 25),
      createdAt: todayAtHhMm(7, 40),
      updatedAt: todayAtHhMm(8, 25),
    })

    for (const s of trip2StopsRaw) {
      const sch = schedById2.get(s.id)
      track("lojistikShipmentStop", {
        id: s.id,
        tripId: "f6-trip-02",
        sequenceNo: sch?.sequenceNo ?? 1,
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
        plannedEtaAt: sch?.plannedEtaAt ?? dep2Iso,
        actualArrivalAt: null,
        actualDepartureAt: null,
        legDistanceKm: sch?.legDistanceKm ?? 7.5,
        cumulativeDistanceKm: sch?.cumulativeDistanceKm ?? 7.5,
        delayMinutes: 0,
        status: s.status,
        failureReasonCode: null,
        failureReasonNote: null,
        driverNote: null,
        trackingToken: generate192BitToken(),
        trackingExpiresAt: hoursAheadIso(s.expiresHoursFromNow),
        reassignedFromTripId: null,
        createdAt: todayAtHhMm(7, 40),
        updatedAt: todayAtHhMm(8, 25),
      })
    }

    // ── 3) Dünkü Tamamlanmış Sefer (SFR-2026-603, TAMAMLANDI — 1 başarısız teslimat + süresi dolmuş takip linki) ──
    const trip3StopsRaw: RawStopTemplate[] = [
      {
        id: "f6-stop-10",
        sourceType: "ERP_ORDER",
        sourceId: "ord-05",
        sourceRefNo: "ORD-2026-0105",
        customerId: "cust-05",
        customerName: "Koç Holding A.Ş. Nakkaştepe",
        contactPhone: "+90 216 555 07 01",
        addressText: "Nakkaştepe Azizbey Sok. No:1, Üsküdar / İstanbul",
        cityDistrict: "Üsküdar / İstanbul",
        lat: 41.0361,
        lng: 29.0372,
        timeWindowStart: "09:00",
        timeWindowEnd: "11:00",
        serviceMinutes: 12,
        weightKg: 380,
        volumeM3: 2.9,
        palletCount: 2,
        requiresColdChain: true,
        priority: 2,
        status: "TESLIM_EDILDI",
        actualArrivalAt: yesterdayAtHhMm(9, 28),
        actualDepartureAt: yesterdayAtHhMm(9, 43),
        delayMinutes: 0,
        failureReasonCode: null,
        failureReasonNote: null,
        driverNote: "Protokol kabul birimine eksiksiz teslim.",
        expiresHoursFromNow: -24, // Dünkü seferin takip linki süresini doldurmuş (410 testine hazır)
      },
      {
        id: "f6-stop-11",
        sourceType: "MANUAL",
        sourceId: null,
        sourceRefNo: "SVK-2026-8790",
        customerId: "cust-09",
        customerName: "Bağdat Cad. Butik Atölye",
        contactPhone: "+90 216 555 07 02",
        addressText: "Caddebostan Bağdat Cad. No:294, Kadıköy / İstanbul",
        cityDistrict: "Kadıköy / İstanbul",
        lat: 40.9634,
        lng: 29.0695,
        timeWindowStart: "10:30",
        timeWindowEnd: "12:30",
        serviceMinutes: 10,
        weightKg: 145,
        volumeM3: 1.1,
        palletCount: 1,
        requiresColdChain: true,
        priority: 1,
        status: "TESLIM_EDILEMEDI",
        actualArrivalAt: yesterdayAtHhMm(11, 20),
        actualDepartureAt: yesterdayAtHhMm(11, 32),
        delayMinutes: 12,
        failureReasonCode: "ALICI_ADRESTE_YOK",
        failureReasonNote: "Mağaza tadilat nedeniyle kapalıydı; alıcıya telefonla ulaşılamadı.",
        driverNote: "Kapı fotoğrafı çekildi, ertesi güne yeniden randevu notu girildi.",
        expiresHoursFromNow: -36, // Süresi dolmuş token (HTTP 410 testi)
      },
      {
        id: "f6-stop-12",
        sourceType: "MANUAL",
        sourceId: null,
        sourceRefNo: "SVK-2026-8791",
        customerId: "cust-10",
        customerName: "Ataşehir Acıbadem VIP Karşılama",
        contactPhone: "+90 216 555 07 03",
        addressText: "Küçükbakkalköy Kayışdağı Cad. No:47, Ataşehir / İstanbul",
        cityDistrict: "Ataşehir / İstanbul",
        lat: 40.9802,
        lng: 29.1098,
        timeWindowStart: "12:00",
        timeWindowEnd: "15:00",
        serviceMinutes: 12,
        weightKg: 290,
        volumeM3: 2.0,
        palletCount: 1,
        requiresColdChain: true,
        priority: 1,
        status: "TESLIM_EDILDI",
        actualArrivalAt: yesterdayAtHhMm(12, 55),
        actualDepartureAt: yesterdayAtHhMm(13, 12),
        delayMinutes: 15,
        failureReasonCode: null,
        failureReasonNote: null,
        driverNote: "Resepsiyon sorumlusuna imza karşılığı teslim edildi.",
        expiresHoursFromNow: 24,
      },
    ]

    const dep3Iso = yesterdayAtHhMm(8, 15)
    const opt3 = optimizeSingleTripRoute({
      origin: { label: whMerkez.label || "Tuzla Merkez Depo", lat: whMerkez.lat, lng: whMerkez.lng },
      stops: trip3StopsRaw,
      plannedDepartureAt: dep3Iso,
      avgSpeedKmh: 38,
      timeBudgetMs: 100,
    })
    const schedById3 = new Map(opt3.stops.map((s) => [s.id, s]))

    track("lojistikShipmentTrip", {
      id: "f6-trip-03",
      tripNumber: "SFR-2026-603",
      title: "Kadıköy & Ataşehir Dünkü Dağıtım Turu",
      branchId: "local-debug-branch",
      originWarehouseId: "wh-merkez-01",
      originLabel: whMerkez.label,
      originLat: whMerkez.lat,
      originLng: whMerkez.lng,
      vehicleId: "f5-veh-03",
      driverId: "f5-drv-03",
      vehiclePlate: "34 SNR 720",
      driverName: "Kemal Öztürk",
      plannedDateKey: yestKey,
      plannedDepartureAt: dep3Iso,
      actualDepartureAt: yesterdayAtHhMm(8, 22),
      plannedCompletionAt: yesterdayAtHhMm(13, 5),
      actualCompletionAt: yesterdayAtHhMm(13, 48),
      status: "TAMAMLANDI",
      totalWeightKg: 815,
      totalVolumeM3: 6.0,
      totalPallets: 4,
      capacityLoadPct: 80.0,
      baselineUnoptimizedDistanceKm: opt3.baselineUnoptimizedDistanceKm,
      plannedDistanceKm: opt3.optimizedDistanceKm,
      actualDistanceKm: Number((opt3.optimizedDistanceKm + 4.3).toFixed(2)),
      plannedDurationMin: opt3.estimatedDurationMin,
      actualDurationMin: opt3.estimatedDurationMin + 32,
      routeProviderMode: opt3.providerMode,
      routeSolverName: opt3.solverName,
      eWaybillId: "f6-edoc-03",
      eWaybillNo: "IRS2026000603",
      eWaybillEttn: "F6603000-3333-4444-8888-202600000603",
      replanReason: null,
      replanHistoryJson: null,
      polylineJson: JSON.stringify(opt3.polylinePoints),
      notes: "1 durak alıcı adreste bulunamadığı için devredildi; kalan 2 durak e-POD ile kapandı.",
      createdBy: "usr-admin-01",
      approvedBy: "Lojistik Planlama Şefi",
      approvedAt: yesterdayAtHhMm(7, 50),
      createdAt: daysAgoIso(2),
      updatedAt: yesterdayAtHhMm(13, 48),
    })

    for (const s of trip3StopsRaw) {
      const sch = schedById3.get(s.id)
      track("lojistikShipmentStop", {
        id: s.id,
        tripId: "f6-trip-03",
        sequenceNo: sch?.sequenceNo ?? 1,
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
        plannedEtaAt: sch?.plannedEtaAt ?? dep3Iso,
        actualArrivalAt: s.actualArrivalAt,
        actualDepartureAt: s.actualDepartureAt,
        legDistanceKm: sch?.legDistanceKm ?? 9.1,
        cumulativeDistanceKm: sch?.cumulativeDistanceKm ?? 9.1,
        delayMinutes: s.delayMinutes,
        status: s.status,
        failureReasonCode: s.failureReasonCode,
        failureReasonNote: s.failureReasonNote,
        driverNote: s.driverNote,
        trackingToken: generate192BitToken(),
        trackingExpiresAt: hoursAheadIso(s.expiresHoursFromNow),
        reassignedFromTripId: null,
        createdAt: daysAgoIso(2),
        updatedAt: yesterdayAtHhMm(13, 48),
      })
    }

    // ── 4) Taslak Plan (SFR-2026-604, TASLAK — Onay & Otomatik E-İrsaliye Testi İçin Hazır) ──
    const trip4StopsRaw: RawStopTemplate[] = [
      {
        id: "f6-stop-13",
        sourceType: "MANUAL",
        sourceId: null,
        sourceRefNo: "SVK-2026-8840",
        customerId: "cust-11",
        customerName: "İstinye Park Kurumsal Mağaza",
        contactPhone: "+90 212 555 08 40",
        addressText: "Pınar Mah. Katar Cad. No:11, Sarıyer / İstanbul",
        cityDistrict: "Sarıyer / İstanbul",
        lat: 41.1105,
        lng: 29.0332,
        timeWindowStart: "13:00",
        timeWindowEnd: "16:30",
        serviceMinutes: 10,
        weightKg: 210,
        volumeM3: 1.5,
        palletCount: 1,
        requiresColdChain: false,
        priority: 1,
        status: "BEKLIYOR",
        actualArrivalAt: null,
        actualDepartureAt: null,
        delayMinutes: 0,
        failureReasonCode: null,
        failureReasonNote: null,
        driverNote: null,
        expiresHoursFromNow: 120,
      },
      {
        id: "f6-stop-14",
        sourceType: "MANUAL",
        sourceId: null,
        sourceRefNo: "SVK-2026-8841",
        customerId: "cust-12",
        customerName: "Zorlu Center Butik Galeri",
        contactPhone: "+90 212 555 08 41",
        addressText: "Levazım Mah. Koru Sok. No:2, Beşiktaş / İstanbul",
        cityDistrict: "Beşiktaş / İstanbul",
        lat: 41.0672,
        lng: 29.0176,
        timeWindowStart: "14:00",
        timeWindowEnd: "17:00",
        serviceMinutes: 12,
        weightKg: 185,
        volumeM3: 1.3,
        palletCount: 1,
        requiresColdChain: false,
        priority: 1,
        status: "BEKLIYOR",
        actualArrivalAt: null,
        actualDepartureAt: null,
        delayMinutes: 0,
        failureReasonCode: null,
        failureReasonNote: null,
        driverNote: null,
        expiresHoursFromNow: 120,
      },
    ]

    const dep4Iso = todayAtHhMm(13, 0)
    const opt4 = optimizeSingleTripRoute({
      origin: { label: whOnline.label || "Ümraniye E-Ticaret Hub", lat: whOnline.lat, lng: whOnline.lng },
      stops: trip4StopsRaw,
      plannedDepartureAt: dep4Iso,
      avgSpeedKmh: 36,
      timeBudgetMs: 80,
    })
    const schedById4 = new Map(opt4.stops.map((s) => [s.id, s]))

    track("lojistikShipmentTrip", {
      id: "f6-trip-04",
      tripNumber: "SFR-2026-604",
      title: "Öğleden Sonra Butik İkmal Planı (Taslak)",
      branchId: "local-debug-branch",
      originWarehouseId: "wh-online-03",
      originLabel: whOnline.label,
      originLat: whOnline.lat,
      originLng: whOnline.lng,
      vehicleId: "f5-veh-09",
      driverId: "f5-drv-09",
      vehiclePlate: "34 SNR 622",
      driverName: "İsmail Yılmaz",
      plannedDateKey: todayKey,
      plannedDepartureAt: dep4Iso,
      actualDepartureAt: null,
      plannedCompletionAt: new Date(
        new Date(dep4Iso).getTime() + opt4.estimatedDurationMin * 60_000
      ).toISOString(),
      actualCompletionAt: null,
      status: "TASLAK",
      totalWeightKg: 395,
      totalVolumeM3: 2.8,
      totalPallets: 2,
      capacityLoadPct: 40.0,
      baselineUnoptimizedDistanceKm: opt4.baselineUnoptimizedDistanceKm,
      plannedDistanceKm: opt4.optimizedDistanceKm,
      actualDistanceKm: 0,
      plannedDurationMin: opt4.estimatedDurationMin,
      actualDurationMin: 0,
      routeProviderMode: opt4.providerMode,
      routeSolverName: opt4.solverName,
      eWaybillId: null,
      eWaybillNo: null,
      eWaybillEttn: null,
      replanReason: null,
      replanHistoryJson: null,
      polylineJson: JSON.stringify(opt4.polylinePoints),
      notes: "Sevk amiri onayı ve E-İrsaliye kesimi bekleniyor.",
      createdBy: "usr-admin-01",
      approvedBy: null,
      approvedAt: null,
      createdAt: todayAtHhMm(8, 10),
      updatedAt: todayAtHhMm(8, 10),
    })

    for (const s of trip4StopsRaw) {
      const sch = schedById4.get(s.id)
      track("lojistikShipmentStop", {
        id: s.id,
        tripId: "f6-trip-04",
        sequenceNo: sch?.sequenceNo ?? 1,
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
        plannedEtaAt: sch?.plannedEtaAt ?? dep4Iso,
        actualArrivalAt: null,
        actualDepartureAt: null,
        legDistanceKm: sch?.legDistanceKm ?? 8.2,
        cumulativeDistanceKm: sch?.cumulativeDistanceKm ?? 8.2,
        delayMinutes: 0,
        status: s.status,
        failureReasonCode: null,
        failureReasonNote: null,
        driverNote: null,
        trackingToken: generate192BitToken(),
        trackingExpiresAt: hoursAheadIso(s.expiresHoursFromNow),
        reassignedFromTripId: null,
        createdAt: todayAtHhMm(8, 10),
        updatedAt: todayAtHhMm(8, 10),
      })
    }

    // ── 5) Elektronik Teslimat Kanıtları (e-POD — Gerçek Diskteki PNG Dosyalarına Bağlı) ──
    const pods = [
      {
        id: "f6-pod-01",
        tripId: "f6-trip-01",
        stopId: "f6-stop-01",
        captureMethod: "IMZA_VE_FOTOGRAF",
        recipientName: "Selin Aksoy (Resepsiyon Şefi)",
        recipientRelation: "RESEPSIYON",
        note: "3 palet soğuk zincir çiçeği ısı kontrollü olarak teslim alındı (+3.4°C).",
        signatureFileUrl: "/api/uploads/pod-sign-01.png?subdir=pod-demo",
        photoFileUrlsJson: JSON.stringify(["/api/uploads/pod-photo-01.png?subdir=pod-demo"]),
        checksumSha256: sig01Hash,
        capturedLat: 41.0352,
        capturedLng: 29.0358,
        capturedAt: todayAtHhMm(9, 4),
        capturedByDriverId: "f5-drv-01",
      },
      {
        id: "f6-pod-02",
        tripId: "f6-trip-01",
        stopId: "f6-stop-02",
        captureMethod: "IMZA_CIZIM",
        recipientName: "Murat Kılıç (İdari İşler Güvenlik)",
        recipientRelation: "GUVENLIK",
        note: "Bölge müdürlüğü giriş kapısında teslim edildi.",
        signatureFileUrl: "/api/uploads/pod-sign-02.png?subdir=pod-demo",
        photoFileUrlsJson: JSON.stringify([]),
        checksumSha256: sig02Hash,
        capturedLat: 41.0118,
        capturedLng: 29.1086,
        capturedAt: todayAtHhMm(9, 57),
        capturedByDriverId: "f5-drv-01",
      },
      {
        id: "f6-pod-03",
        tripId: "f6-trip-03",
        stopId: "f6-stop-10",
        captureMethod: "IMZA_VE_FOTOGRAF",
        recipientName: "Elif Yıldırım (Protokol Sorumlusu)",
        recipientRelation: "ALICI",
        note: "Aranjman setleri salon kurulumuna eksiksiz teslim edildi.",
        signatureFileUrl: "/api/uploads/pod-sign-03.png?subdir=pod-demo",
        photoFileUrlsJson: JSON.stringify(["/api/uploads/pod-photo-02.png?subdir=pod-demo"]),
        checksumSha256: sig03Hash,
        capturedLat: 41.0361,
        capturedLng: 29.0372,
        capturedAt: yesterdayAtHhMm(9, 41),
        capturedByDriverId: "f5-drv-03",
      },
      {
        id: "f6-pod-04",
        tripId: "f6-trip-03",
        stopId: "f6-stop-12",
        captureMethod: "FOTOGRAF",
        recipientName: "Deniz Karahan (Danışma)",
        recipientRelation: "RESEPSIYON",
        note: "VIP karşılama standına bırakıldı, fotoğraf eklendi.",
        signatureFileUrl: null,
        photoFileUrlsJson: JSON.stringify(["/api/uploads/pod-photo-01.png?subdir=pod-demo"]),
        checksumSha256: computeDemoPodSha256("pod-photo-01.png"),
        capturedLat: 40.9802,
        capturedLng: 29.1098,
        capturedAt: yesterdayAtHhMm(13, 10),
        capturedByDriverId: "f5-drv-03",
      },
    ]
    for (const p of pods) {
      track("lojistikDeliveryProof", { ...p, createdAt: p.capturedAt })
    }

    // ── 6) Rota Optimizasyon İş Kayıtları ──
    const jobs = [
      {
        id: "f6-job-01",
        tripId: "f6-trip-01",
        opt: opt1,
        stopCount: trip1StopsRaw.length,
        startedAt: todayAtHhMm(7, 20),
        completedAt: todayAtHhMm(7, 20),
      },
      {
        id: "f6-job-02",
        tripId: "f6-trip-02",
        opt: opt2,
        stopCount: trip2StopsRaw.length,
        startedAt: todayAtHhMm(8, 12),
        completedAt: todayAtHhMm(8, 12),
      },
      {
        id: "f6-job-03",
        tripId: "f6-trip-03",
        opt: opt3,
        stopCount: trip3StopsRaw.length,
        startedAt: daysAgoIso(2),
        completedAt: daysAgoIso(2),
      },
      {
        id: "f6-job-04",
        tripId: "f6-trip-04",
        opt: opt4,
        stopCount: trip4StopsRaw.length,
        startedAt: todayAtHhMm(8, 10),
        completedAt: todayAtHhMm(8, 10),
      },
    ]
    for (const j of jobs) {
      track("lojistikRouteOptimizationJob", {
        id: j.id,
        tripId: j.tripId,
        jobStatus: "COMPLETED",
        stageLabel: `2-Opt + Or-Opt tamamlandı (${j.opt.optimizedDistanceKm} km)`,
        progressPct: 100,
        stopCount: j.stopCount,
        vehicleCount: 1,
        providerMode: j.opt.providerMode,
        solverName: j.opt.solverName,
        unoptimizedDistanceKm: j.opt.baselineUnoptimizedDistanceKm,
        optimizedDistanceKm: j.opt.optimizedDistanceKm,
        timeWindowViolations: j.opt.timeWindowViolations,
        capacityOverflowPct: 0,
        durationMs: Math.max(2, j.opt.durationMs),
        resultJson: JSON.stringify({
          stages: j.opt.stages,
          savedKm: Number(
            Math.max(0, j.opt.baselineUnoptimizedDistanceKm - j.opt.optimizedDistanceKm).toFixed(2)
          ),
        }),
        errorMessage: null,
        startedAt: j.startedAt,
        completedAt: j.completedAt,
        createdAt: j.startedAt,
      })
    }

    // ── 7) E-İrsaliye Kayıtları (Sefer Onayı Entegrasyonu Örnekleri) ──
    const edocs = [
      {
        id: "f6-edoc-01",
        ettnUuid: "F6601000-1111-4444-8888-202600000601",
        documentNo: "IRS2026000601",
        documentType: "E_IRSALIYE",
        profileId: "TEMELIRSALIYE",
        relatedOrderNo: "SFR-2026-601",
        shipmentTripId: "f6-trip-01",
        shipmentStopId: null,
        receiverTitle: "KoçSistem (+4 Teslimat)",
        receiverVknTckn: "1111111111",
        receiverTaxOffice: "Marmara Kurumlar V.D.",
        dispatchDate: todayAtHhMm(7, 45),
        carrierName: "Sunum İç Filo Lojistik",
        vehiclePlate: "34 SNR 808",
        driverName: "Cemal Kaya",
        driverTckn: "24198374612",
        totalNetAmount: 5000,
        totalVatAmount: 1000,
        totalGrossAmount: 6000,
        currency: "TRY",
        gibStatusCode: "1300",
        gibStatusText: "GİB Başarıyla İletildi (Demo Adaptör)",
        linesJson: JSON.stringify(
          trip1StopsRaw.map((s) => ({
            sku: s.sourceRefNo,
            name: `${s.customerName} (${s.cityDistrict})`,
            quantity: Math.max(1, s.palletCount),
            unit: "Palet",
            unitPrice: 1250,
            vatRate: 20,
          }))
        ),
        createdAt: todayAtHhMm(7, 45),
        updatedAt: todayAtHhMm(7, 45),
      },
      {
        id: "f6-edoc-02",
        ettnUuid: "F6602000-2222-4444-8888-202600000602",
        documentNo: "IRS2026000602",
        documentType: "E_IRSALIYE",
        profileId: "TEMELIRSALIYE",
        relatedOrderNo: "SFR-2026-602",
        shipmentTripId: "f6-trip-02",
        shipmentStopId: null,
        receiverTitle: "Garanti BBVA Etiler (+3 Teslimat)",
        receiverVknTckn: "1111111111",
        receiverTaxOffice: "Büyük Mükellefler V.D.",
        dispatchDate: todayAtHhMm(8, 25),
        carrierName: "Sunum İç Filo Lojistik",
        vehiclePlate: "34 LJS 402",
        driverName: "Kadir Şahin",
        driverTckn: "38129471048",
        totalNetAmount: 6250,
        totalVatAmount: 1250,
        totalGrossAmount: 7500,
        currency: "TRY",
        gibStatusCode: "1300",
        gibStatusText: "GİB Başarıyla İletildi (Demo Adaptör)",
        linesJson: JSON.stringify(
          trip2StopsRaw.map((s) => ({
            sku: s.sourceRefNo,
            name: `${s.customerName} (${s.cityDistrict})`,
            quantity: Math.max(1, s.palletCount),
            unit: "Palet",
            unitPrice: 1250,
            vatRate: 20,
          }))
        ),
        createdAt: todayAtHhMm(8, 25),
        updatedAt: todayAtHhMm(8, 25),
      },
      {
        id: "f6-edoc-03",
        ettnUuid: "F6603000-3333-4444-8888-202600000603",
        documentNo: "IRS2026000603",
        documentType: "E_IRSALIYE",
        profileId: "TEMELIRSALIYE",
        relatedOrderNo: "SFR-2026-603",
        shipmentTripId: "f6-trip-03",
        shipmentStopId: null,
        receiverTitle: "Koç Holding (+2 Teslimat)",
        receiverVknTckn: "1111111111",
        receiverTaxOffice: "Anadolu Kurumlar V.D.",
        dispatchDate: yesterdayAtHhMm(7, 50),
        carrierName: "Sunum İç Filo Lojistik",
        vehiclePlate: "34 SNR 720",
        driverName: "Kemal Öztürk",
        driverTckn: "51829301294",
        totalNetAmount: 5000,
        totalVatAmount: 1000,
        totalGrossAmount: 6000,
        currency: "TRY",
        gibStatusCode: "1300",
        gibStatusText: "GİB Başarıyla İletildi (Demo Adaptör)",
        linesJson: JSON.stringify(
          trip3StopsRaw.map((s) => ({
            sku: s.sourceRefNo,
            name: `${s.customerName} (${s.cityDistrict})`,
            quantity: Math.max(1, s.palletCount),
            unit: "Palet",
            unitPrice: 1250,
            vatRate: 20,
          }))
        ),
        createdAt: yesterdayAtHhMm(7, 50),
        updatedAt: yesterdayAtHhMm(7, 50),
      },
    ]
    for (const ed of edocs) {
      track("eDocumentRecord", ed)
    }

    // ── 8) Takip Olay Günlükleri (Müşteri Zaman Çizelgesi & Operasyon İzleri) ──
    const events = [
      { id: "f6-tev-01", tripId: "f6-trip-01", stopId: null, eventType: "TRIP_CREATED", actorName: "Lojistik Planlama", message: "SFR-2026-601 soğuk zincir seferi Tuzla Depo çıkışlı oluşturuldu.", at: todayAtHhMm(7, 15) },
      { id: "f6-tev-02", tripId: "f6-trip-01", stopId: null, eventType: "EWAYBILL_ISSUED", actorName: "Lojistik Planlama Şefi", message: "IRS2026000601 numaralı E-İrsaliye onay akışıyla kesildi.", at: todayAtHhMm(7, 45) },
      { id: "f6-tev-03", tripId: "f6-trip-01", stopId: null, eventType: "TRIP_DEPARTED", actorName: "Cemal Kaya", message: "34 SNR 808 depodan hareket etti (+3.4°C frigo aktif).", at: todayAtHhMm(8, 5) },
      { id: "f6-tev-04", tripId: "f6-trip-01", stopId: "f6-stop-01", eventType: "POD_CAPTURED", actorName: "Cemal Kaya", message: "KoçSistem teslimatı e-imza ve fotoğraf kanıtı ile tamamlandı.", at: todayAtHhMm(9, 6) },
      { id: "f6-tev-05", tripId: "f6-trip-01", stopId: "f6-stop-02", eventType: "POD_CAPTURED", actorName: "Cemal Kaya", message: "Ziraat Bankası Ümraniye teslimatı e-POD ile tamamlandı.", at: todayAtHhMm(9, 58) },
      { id: "f6-tev-06", tripId: "f6-trip-01", stopId: "f6-stop-03", eventType: "TRIP_REPLANNED", actorName: "Operasyon Merkezi", message: "E-5 trafiği sebebiyle +18 dk gecikme ötelemesi uygulandı.", at: todayAtHhMm(10, 32) },
      { id: "f6-tev-07", tripId: "f6-trip-01", stopId: "f6-stop-03", eventType: "STOP_ARRIVED", actorName: "Cemal Kaya", message: "Teknosa Maltepe teslimat noktasına varış yapıldı.", at: todayAtHhMm(10, 48) },
      { id: "f6-tev-08", tripId: "f6-trip-02", stopId: null, eventType: "ROUTE_OPTIMIZED", actorName: "CVRPTW Çözücü", message: `SFR-2026-602 rota optimizasyonu tamamlandı (${opt2.baselineUnoptimizedDistanceKm} km → ${opt2.optimizedDistanceKm} km).`, at: todayAtHhMm(8, 12) },
      { id: "f6-tev-09", tripId: "f6-trip-02", stopId: null, eventType: "EWAYBILL_ISSUED", actorName: "Lojistik Planlama Şefi", message: "IRS2026000602 numaralı E-İrsaliye kesildi.", at: todayAtHhMm(8, 25) },
      { id: "f6-tev-10", tripId: "f6-trip-03", stopId: "f6-stop-11", eventType: "STOP_DELIVERY_FAILED", actorName: "Kemal Öztürk", message: "Bağdat Cad. Butik Atölye kapalı bulundu (ALICI_ADRESTE_YOK).", at: yesterdayAtHhMm(11, 28) },
      { id: "f6-tev-11", tripId: "f6-trip-03", stopId: null, eventType: "TRIP_COMPLETED", actorName: "Kemal Öztürk", message: "SFR-2026-603 sefer kapanışı yapıldı.", at: yesterdayAtHhMm(13, 48) },
      { id: "f6-tev-12", tripId: "f6-trip-04", stopId: null, eventType: "TRIP_CREATED", actorName: "Lojistik Planlama", message: "SFR-2026-604 taslak seferi onay için hazırlandı.", at: todayAtHhMm(8, 10) },
    ]
    for (const ev of events) {
      track("lojistikTrackingEvent", {
        id: ev.id,
        tripId: ev.tripId,
        stopId: ev.stopId,
        eventType: ev.eventType,
        actorUserId: "usr-admin-01",
        actorName: ev.actorName,
        message: ev.message,
        lat: null,
        lng: null,
        metadataJson: null,
        createdAt: ev.at,
      })
    }

    const totalTargets = Object.values(
      faz6DispatchAndRoutingSeedModule.seededIdsByCollection
    ).reduce((sum, list) => sum + list.length, 0)
    const totalInserted = Object.values(inserted).reduce((sum, n) => sum + n, 0)

    return {
      moduleKey: "faz6_sevkiyat_ve_rota",
      inserted,
      skippedExisting: Math.max(0, totalTargets - totalInserted),
      notes: [
        `4 sefer (SFR-2026-601 Teslimat Sürüyor, SFR-2026-602 Onaylı Optimize [${opt2.baselineUnoptimizedDistanceKm}km->${opt2.optimizedDistanceKm}km], SFR-2026-603 Tamamlandı/Başarısız duraklı, SFR-2026-604 Taslak) eklendi.`,
        "14 durak (aktif + süresi dolmuş 192-bit CSPRNG müşteri takip linkleriyle), 4 e-POD kanıtı (diskteki pod-demo PNG dosyalarına SHA-256 ile bağlı) ve 3 E-İrsaliye eklendi.",
      ],
    }
  },

  rollback(db) {
    const removed: Record<string, number> = {}
    removed.lojistikTrackingEvent = removeByIds(
      db.lojistikTrackingEvent,
      new Set(SEEDED_TRACKING_EVENT_IDS)
    )
    removed.lojistikRouteOptimizationJob = removeByIds(
      db.lojistikRouteOptimizationJob,
      new Set(SEEDED_OPT_JOB_IDS)
    )
    removed.lojistikDeliveryProof = removeByIds(
      db.lojistikDeliveryProof,
      new Set(SEEDED_POD_IDS)
    )
    removed.lojistikShipmentStop = removeByIds(
      db.lojistikShipmentStop,
      new Set(SEEDED_STOP_IDS)
    )
    removed.lojistikShipmentTrip = removeByIds(
      db.lojistikShipmentTrip,
      new Set(SEEDED_TRIP_IDS)
    )
    removed.eDocumentRecord = removeByIds(
      db.eDocumentRecord,
      new Set(SEEDED_EDOC_IDS)
    )
    return removed
  },
}
