/**
 * Lojistik Faz 5 (lojistik_filo — Filo, Araç, Şoför, Bakım, Yakıt, TCO, CO2 & Telematik)
 * İdempotent ve Tam Geri Alınabilir Demo Seed Modülü
 *
 * KURALLAR:
 * - Yalnızca DEMO ortamında çalışır (`isDemoEnvironment()`).
 * - Mevcut hiçbir kayda dokunmaz; tüm Faz 5 kayıtları `f5-*` önekli sabit ID taşır.
 * - Sistemdeki mevcut plakalar (`34 SNR 808` / Cemal Kaya, `34 LJS 402` / Kadir Şahin,
 *   `34 SNR 720` / Kemal Öztürk) yeniden kullanılarak depo transferleri ve e-İrsaliyelerle doğal bütünlük kurulur.
 * - Telematik sağlayıcı bağlantıları (`TRACCAR`, `FLESPI`, `GPSGATE_CLOUD`, `GENERIC_WEBHOOK`)
 *   yalnızca demo DB olaylarıyla çalışır; canlı hesapla bağlantı denenmez ve fiyat bilgisi yazılmaz.
 * - CO2 katsayıları UK DESNZ / DEFRA 2026 tablolarından alınmıştır (tahmini değer).
 */

import type { LogisticsSeedModule } from "./framework"

const SEEDED_VEHICLE_IDS = Array.from({ length: 18 }, (_, i) => `f5-veh-${String(i + 1).padStart(2, "0")}`)
const SEEDED_LEASE_IDS = [
  "f5-lease-02",
  "f5-lease-04",
  "f5-lease-06",
  "f5-lease-09",
  "f5-lease-11",
  "f5-lease-12",
  "f5-lease-16",
  "f5-lease-17",
] as const
const SEEDED_DRIVER_IDS = Array.from({ length: 15 }, (_, i) => `f5-drv-${String(i + 1).padStart(2, "0")}`)
const SEEDED_DOC_IDS = Array.from({ length: 22 }, (_, i) => `f5-doc-${String(i + 1).padStart(2, "0")}`)
const SEEDED_PENALTY_IDS = ["f5-pen-01", "f5-pen-02", "f5-pen-03", "f5-pen-04", "f5-pen-05", "f5-pen-06"] as const
const SEEDED_MPLAN_IDS = ["f5-mplan-01", "f5-mplan-02", "f5-mplan-03", "f5-mplan-04", "f5-mplan-05", "f5-mplan-06"] as const
const SEEDED_MWO_IDS = Array.from({ length: 12 }, (_, i) => `f5-mwo-${String(i + 1).padStart(2, "0")}`)
const SEEDED_MSP_IDS = ["f5-msp-01", "f5-msp-02", "f5-msp-03", "f5-msp-04"] as const
const SEEDED_MCHK_IDS = ["f5-mchk-01", "f5-mchk-02", "f5-mchk-03", "f5-mchk-04"] as const
const SEEDED_FAULT_IDS = ["f5-flt-01", "f5-flt-02", "f5-flt-03", "f5-flt-04", "f5-flt-05"] as const
const SEEDED_TIRE_IDS = Array.from({ length: 12 }, (_, i) => `f5-tire-${String(i + 1).padStart(2, "0")}`)
const SEEDED_FUEL_IDS = Array.from({ length: 36 }, (_, i) => `f5-fuel-${String(i + 1).padStart(2, "0")}`)
const SEEDED_CO2_IDS = ["f5-co2-diesel", "f5-co2-petrol", "f5-co2-lpg", "f5-co2-hybrid"] as const
const SEEDED_TCONN_IDS = ["f5-tconn-traccar", "f5-tconn-flespi", "f5-tconn-gpsgate", "f5-tconn-generic"] as const
const SEEDED_TMAP_IDS = Array.from({ length: 10 }, (_, i) => `f5-tmap-${String(i + 1).padStart(2, "0")}`)
const SEEDED_TEV_IDS = Array.from({ length: 48 }, (_, i) => `f5-tev-${String(i + 1).padStart(2, "0")}`)
const SEEDED_TERR_IDS = ["f5-terr-01", "f5-terr-02"] as const
const SEEDED_FINANCE_IDS = Array.from({ length: 10 }, (_, i) => `f5-fin-${String(i + 1).padStart(2, "0")}`)

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

function daysAheadIso(days: number): string {
  return new Date(Date.now() + days * 86_400_000).toISOString()
}

function hoursAgoIso(hours: number): string {
  return new Date(Date.now() - hours * 3_600_000).toISOString()
}

export const faz5FleetAndTelematicsSeedModule: LogisticsSeedModule = {
  moduleKey: "faz5_filo_ve_telematik",
  phase: 5,
  seededIdsByCollection: {
    lojistikVehicle: SEEDED_VEHICLE_IDS,
    lojistikVehicleLease: SEEDED_LEASE_IDS,
    lojistikDriver: SEEDED_DRIVER_IDS,
    lojistikVehicleDocument: SEEDED_DOC_IDS,
    lojistikTrafficPenalty: SEEDED_PENALTY_IDS,
    lojistikVehicleMaintenancePlan: SEEDED_MPLAN_IDS,
    lojistikVehicleMaintenanceWorkOrder: SEEDED_MWO_IDS,
    lojistikVehicleMaintenanceSparePart: SEEDED_MSP_IDS,
    lojistikVehicleMaintenanceChecklistResult: SEEDED_MCHK_IDS,
    lojistikVehicleFaultLog: SEEDED_FAULT_IDS,
    lojistikVehicleTire: SEEDED_TIRE_IDS,
    lojistikFuelLog: SEEDED_FUEL_IDS,
    lojistikCo2EmissionFactor: SEEDED_CO2_IDS,
    lojistikTelematicConnection: SEEDED_TCONN_IDS,
    lojistikVehicleTelematicMap: SEEDED_TMAP_IDS,
    lojistikTelemetryEvent: SEEDED_TEV_IDS,
    lojistikTelematicErrorLog: SEEDED_TERR_IDS,
    finance: SEEDED_FINANCE_IDS,
  },

  seed(db) {
    const inserted: Record<string, number> = {}
    let skippedExisting = 0

    const track = (col: string, rec: any) => {
      const n = pushIfMissing(db, col, rec)
      inserted[col] = (inserted[col] || 0) + n
      if (n === 0) skippedExisting++
    }

    const createdAtBase = daysAgoIso(360)

    // 1. 15 Şoför (Mevcut transfer/e-İrsaliye şoförleri Cemal Kaya, Kadir Şahin, Kemal Öztürk dahil)
    const driversSpec = [
      {
        id: "f5-drv-01",
        code: "DRV-001",
        userId: null,
        branchId: "local-debug-branch",
        fullName: "Cemal Kaya",
        tckn: "24198374612",
        phone: "+90 532 411 22 01",
        email: "cemal.kaya@cicekana.demo",
        homeAddress: "Atatürk Mah. 142. Sk. No:18 Ümraniye / İstanbul",
        emergencyContact: "Ayşe Kaya - +90 533 219 04 11",
        licenseClass: "CE",
        licenseNumber: "TR-IST-884102",
        licenseExpiresAt: daysAheadIso(620),
        srcType: "SRC-4",
        srcNumber: "SRC4-34-90122",
        srcExpiresAt: daysAheadIso(14), // Yaklaşan SRC uyarısı
        psychotechNumber: "PSK-34-77810",
        psychotechExpiresAt: daysAheadIso(185),
        shiftName: "Sabah Dağıtım",
        shiftStart: "06:30",
        shiftEnd: "15:30",
        monthlySalaryCostTry: 38500,
        status: "ON_ROUTE",
        notes: "Marmara soğuk zincir ana hat sürücüsü (34 SNR 808).",
      },
      {
        id: "f5-drv-02",
        code: "DRV-002",
        userId: null,
        branchId: "local-debug-branch",
        fullName: "Kadir Şahin",
        tckn: "38129405814",
        phone: "+90 532 518 44 09",
        email: "kadir.sahin@cicekana.demo",
        homeAddress: "Fikirtepe Mah. Mandıra Cad. No:42 Kadıköy / İstanbul",
        emergencyContact: "Mehmet Şahin - +90 535 901 11 22",
        licenseClass: "C",
        licenseNumber: "TR-IST-661204",
        licenseExpiresAt: daysAheadIso(480),
        srcType: "SRC-4",
        srcNumber: "SRC4-34-81203",
        srcExpiresAt: daysAheadIso(290),
        psychotechNumber: "PSK-34-66211",
        psychotechExpiresAt: daysAheadIso(210),
        shiftName: "Gündüz Şehir İçi",
        shiftStart: "08:00",
        shiftEnd: "17:30",
        monthlySalaryCostTry: 36000,
        status: "ON_ROUTE",
        notes: "Kadıköy & Ataşehir ring hattı (34 LJS 402).",
      },
      {
        id: "f5-drv-03",
        code: "DRV-003",
        userId: "user-accountant",
        branchId: "local-debug-branch",
        fullName: "Kemal Öztürk",
        tckn: "19283746510",
        phone: "+90 533 612 73 40",
        email: "kemal.ozturk@cicekana.demo",
        homeAddress: "Levent Mah. Çarşı Cad. No:9 Beşiktaş / İstanbul",
        emergencyContact: "Fatma Öztürk - +90 536 442 18 90",
        licenseClass: "B",
        licenseNumber: "TR-IST-550912",
        licenseExpiresAt: daysAheadIso(890),
        srcType: "SRC-2",
        srcNumber: "SRC2-34-44120",
        srcExpiresAt: daysAheadIso(410),
        psychotechNumber: "PSK-34-55209",
        psychotechExpiresAt: daysAheadIso(310),
        shiftName: "Sabah VIP Teslimat",
        shiftStart: "07:30",
        shiftEnd: "17:00",
        monthlySalaryCostTry: 35000,
        status: "ON_ROUTE",
        notes: "Kurumsal B2B soğuk zincir aracı (34 SNR 720, edoc-001).",
      },
      {
        id: "f5-drv-04",
        code: "DRV-004",
        userId: null,
        branchId: "local-debug-branch",
        fullName: "Murat Yıldız",
        tckn: "41298501926",
        phone: "+90 534 709 18 33",
        email: "murat.yildiz@cicekana.demo",
        homeAddress: "İçerenköy Mah. Karslı Ahmet Cad. No:12 Ataşehir / İstanbul",
        emergencyContact: "Zehra Yıldız - +90 541 218 09 44",
        licenseClass: "B",
        licenseNumber: "TR-IST-774129",
        licenseExpiresAt: daysAheadIso(510),
        srcType: "SRC-4",
        srcNumber: "SRC4-34-77910",
        srcExpiresAt: daysAheadIso(120),
        psychotechNumber: "PSK-34-10982",
        psychotechExpiresAt: daysAgoIso(5), // Süresi dolmuş psikoteknik örneği
        shiftName: "Gündüz Vardiyası",
        shiftStart: "08:30",
        shiftEnd: "18:00",
        monthlySalaryCostTry: 34200,
        status: "AVAILABLE",
        notes: "Psikoteknik yenileme randevusu bekleniyor; anormal yakıt aracı atanmış.",
      },
      { id: "f5-drv-05", code: "DRV-005", branchId: "branch-ankara", fullName: "Serkan Aydın", tckn: "51839204716", phone: "+90 532 802 14 55", licenseClass: "C", srcType: "SRC-4", srcExpiresAt: daysAheadIso(340), licenseExpiresAt: daysAheadIso(710), psychotechExpiresAt: daysAheadIso(250), shiftName: "Ankara Sabah", monthlySalaryCostTry: 34800, status: "ON_ROUTE" },
      { id: "f5-drv-06", code: "DRV-006", branchId: "branch-izmir", fullName: "Hasan Demir", tckn: "62384910234", phone: "+90 533 911 63 20", licenseClass: "B", srcType: "SRC-4", srcExpiresAt: daysAheadIso(260), licenseExpiresAt: daysAheadIso(440), psychotechExpiresAt: daysAheadIso(190), shiftName: "İzmir Dağıtım", monthlySalaryCostTry: 34000, status: "AVAILABLE" },
      { id: "f5-drv-07", code: "DRV-007", branchId: "branch-bursa", fullName: "Ali Vural", tckn: "73920184752", phone: "+90 535 304 82 11", licenseClass: "C", srcType: "SRC-3", srcExpiresAt: daysAheadIso(310), licenseExpiresAt: daysAheadIso(600), psychotechExpiresAt: daysAheadIso(280), shiftName: "Bursa-Gemlik Hat", monthlySalaryCostTry: 35200, status: "ON_ROUTE" },
      { id: "f5-drv-08", code: "DRV-008", branchId: "local-debug-branch", fullName: "Emre Çelik", tckn: "84910293844", phone: "+90 536 742 51 90", licenseClass: "CE", srcType: "SRC-4", srcExpiresAt: daysAheadIso(180), licenseExpiresAt: daysAheadIso(12), psychotechExpiresAt: daysAheadIso(160), shiftName: "Akşam Transfer", monthlySalaryCostTry: 37500, status: "AVAILABLE", notes: "Ehliyet yenileme tarihi yaklaşmaktadır." },
      { id: "f5-drv-09", code: "DRV-009", branchId: "local-debug-branch", fullName: "İsmail Yılmaz", tckn: "91283746502", phone: "+90 537 219 48 66", licenseClass: "B", srcType: "SRC-4", srcExpiresAt: daysAheadIso(420), licenseExpiresAt: daysAheadIso(550), psychotechExpiresAt: daysAheadIso(330), shiftName: "Gündüz Vardiyası", monthlySalaryCostTry: 33500, status: "AVAILABLE" },
      { id: "f5-drv-10", code: "DRV-010", branchId: "local-debug-branch", fullName: "Hakan Arslan", tckn: "18472930156", phone: "+90 538 410 99 12", licenseClass: "B", srcType: "SRC-2", srcExpiresAt: daysAheadIso(215), licenseExpiresAt: daysAheadIso(480), psychotechExpiresAt: daysAheadIso(210), shiftName: "Gündüz Vardiyası", monthlySalaryCostTry: 33200, status: "AVAILABLE" },
      { id: "f5-drv-11", code: "DRV-011", branchId: "local-debug-branch", fullName: "Mehmet Koç", tckn: "29481726390", phone: "+90 539 623 17 04", licenseClass: "D", srcType: "SRC-2", srcExpiresAt: daysAheadIso(390), licenseExpiresAt: daysAheadIso(720), psychotechExpiresAt: daysAheadIso(270), shiftName: "Personel Ring", monthlySalaryCostTry: 36800, status: "ON_ROUTE" },
      { id: "f5-drv-12", code: "DRV-012", branchId: "local-debug-branch", fullName: "Selim Şen", tckn: "37465829104", phone: "+90 541 772 34 88", licenseClass: "B", srcType: null, srcExpiresAt: null, licenseExpiresAt: daysAheadIso(640), psychotechExpiresAt: daysAheadIso(300), shiftName: "Yönetim & Saha", monthlySalaryCostTry: 31500, status: "AVAILABLE" },
      { id: "f5-drv-13", code: "DRV-013", branchId: "local-debug-branch", fullName: "Burhan Aksoy", tckn: "48291038472", phone: "+90 542 885 20 15", licenseClass: "B", srcType: null, srcExpiresAt: null, licenseExpiresAt: daysAheadIso(510), psychotechExpiresAt: daysAheadIso(220), shiftName: "Gündüz Vardiyası", monthlySalaryCostTry: 31200, status: "AVAILABLE" },
      { id: "f5-drv-14", code: "DRV-014", branchId: "local-debug-branch", fullName: "Tolga Çakır", tckn: "59201837468", phone: "+90 543 901 47 32", licenseClass: "C", srcType: "SRC-4", srcExpiresAt: daysAheadIso(280), licenseExpiresAt: daysAheadIso(430), psychotechExpiresAt: daysAheadIso(195), shiftName: "Gece Sevkiyat", monthlySalaryCostTry: 36400, status: "ON_ROUTE" },
      { id: "f5-drv-15", code: "DRV-015", branchId: "branch-ankara", fullName: "Yusuf Tekin", tckn: "68192038452", phone: "+90 544 612 90 77", licenseClass: "B", srcType: "SRC-4", srcExpiresAt: daysAheadIso(305), licenseExpiresAt: daysAheadIso(520), psychotechExpiresAt: daysAheadIso(240), shiftName: "Ankara Gündüz", monthlySalaryCostTry: 32900, status: "OFF_DUTY" },
    ]

    for (const d of driversSpec) {
      track("lojistikDriver", {
        id: d.id,
        code: d.code,
        userId: d.userId ?? null,
        branchId: d.branchId,
        fullName: d.fullName,
        tckn: d.tckn,
        phone: d.phone,
        email: d.email ?? `${d.code.toLowerCase()}@cicekana.demo`,
        homeAddress: d.homeAddress ?? "İstanbul Lojistik Lojmanı",
        emergencyContact: d.emergencyContact ?? "Operasyon Masası +90 212 555 0100",
        licenseClass: d.licenseClass,
        licenseNumber: d.licenseNumber ?? `TR-${d.code}`,
        licenseExpiresAt: d.licenseExpiresAt,
        srcType: d.srcType,
        srcNumber: d.srcNumber ?? (d.srcType ? `${d.srcType}-${d.code}` : null),
        srcExpiresAt: d.srcExpiresAt,
        psychotechNumber: d.psychotechNumber ?? `PSK-${d.code}`,
        psychotechExpiresAt: d.psychotechExpiresAt,
        shiftName: d.shiftName,
        shiftStart: d.shiftStart ?? "08:00",
        shiftEnd: d.shiftEnd ?? "17:30",
        monthlySalaryCostTry: d.monthlySalaryCostTry,
        status: d.status,
        notes: d.notes ?? null,
        isActive: true,
        createdAt: createdAtBase,
        updatedAt: daysAgoIso(1),
      })
    }

    // 2. 18 Araç (TRUCK, FRIGO_VAN, PANEL_VAN, MINIBUS, PASSENGER, PICKUP — yalnızca DIESEL/PETROL/LPG/HYBRID)
    const vehiclesSpec = [
      { id: "f5-veh-01", code: "ARC-001", plate: "34 SNR 808", vin: "WF0XXXTTGXRL80801", brand: "Ford", model: "Transit Custom Frigo", modelYear: 2024, vehicleType: "FRIGO_VAN", fuelType: "DIESEL", ownershipType: "OWNED", branchId: "local-debug-branch", status: "IN_TRANSIT", capacityKg: 1450, capacityM3: 8.5, palletSlots: 4, isRefrigerated: true, targetTempMinC: 2, targetTempMaxC: 6, currentTempC: 3.4, odometerKm: 84250, engineHours: 2140, expectedLPer100Km: 11.8, tankCapacityLiters: 80, acquisitionCostTry: 1480000, monthlyDepreciationTry: 24500, currentLat: 40.7852, currentLng: 29.5320, currentSpeedKmh: 68, currentHeadingDeg: 118, lastTelemetryProvider: "TRACCAR", assignedDriverId: "f5-drv-01" },
      { id: "f5-veh-02", code: "ARC-002", plate: "34 LJS 402", vin: "ZCFC35A200540202", brand: "Iveco", model: "Daily 35S16 Kamyonet", modelYear: 2023, vehicleType: "TRUCK", fuelType: "DIESEL", ownershipType: "LEASED", branchId: "local-debug-branch", status: "IN_TRANSIT", capacityKg: 3200, capacityM3: 18.0, palletSlots: 8, isRefrigerated: false, odometerKm: 112400, engineHours: 2910, expectedLPer100Km: 15.2, tankCapacityLiters: 100, acquisitionCostTry: 0, monthlyDepreciationTry: 0, currentLat: 40.9923, currentLng: 29.1244, currentSpeedKmh: 52, currentHeadingDeg: 245, lastTelemetryProvider: "FLESPI", assignedDriverId: "f5-drv-02" },
      { id: "f5-veh-03", code: "ARC-003", plate: "34 SNR 720", vin: "W1V9076331P72003", brand: "Mercedes-Benz", model: "Sprinter 317 CDI Frigo", modelYear: 2025, vehicleType: "FRIGO_VAN", fuelType: "DIESEL", ownershipType: "OWNED", branchId: "local-debug-branch", status: "IN_TRANSIT", capacityKg: 1650, capacityM3: 11.2, palletSlots: 5, isRefrigerated: true, targetTempMinC: 2, targetTempMaxC: 6, currentTempC: 7.4, odometerKm: 41600, engineHours: 980, expectedLPer100Km: 11.4, tankCapacityLiters: 93, acquisitionCostTry: 1950000, monthlyDepreciationTry: 32000, currentLat: 41.0422, currentLng: 29.0079, currentSpeedKmh: 44, currentHeadingDeg: 295, lastTelemetryProvider: "TRACCAR", assignedDriverId: "f5-drv-03" },
      { id: "f5-veh-04", code: "ARC-004", plate: "34 SNR 412", vin: "VF1MA00016941204", brand: "Renault", model: "Master L2H2 Van", modelYear: 2023, vehicleType: "PANEL_VAN", fuelType: "DIESEL", ownershipType: "LEASED", branchId: "local-debug-branch", status: "ACTIVE", capacityKg: 1500, capacityM3: 10.8, palletSlots: 4, isRefrigerated: false, odometerKm: 93400, engineHours: 2290, expectedLPer100Km: 12.5, tankCapacityLiters: 105, acquisitionCostTry: 0, monthlyDepreciationTry: 0, currentLat: 41.0082, currentLng: 29.1489, currentSpeedKmh: 0, currentHeadingDeg: 90, lastTelemetryProvider: "GPSGATE_CLOUD", assignedDriverId: "f5-drv-04", notes: "Anormal yakıt tüketimi (26+ L/100km) takibi altında." },
      { id: "f5-veh-05", code: "ARC-005", plate: "06 ANK 514", vin: "WF0EXXTTGXNK51405", brand: "Ford", model: "Transit 350L Frigo", modelYear: 2024, vehicleType: "FRIGO_VAN", fuelType: "DIESEL", ownershipType: "OWNED", branchId: "branch-ankara", status: "IN_TRANSIT", capacityKg: 1550, capacityM3: 10.2, palletSlots: 4, isRefrigerated: true, targetTempMinC: 2, targetTempMaxC: 6, currentTempC: 4.1, odometerKm: 67800, engineHours: 1640, expectedLPer100Km: 12.2, tankCapacityLiters: 80, acquisitionCostTry: 1560000, monthlyDepreciationTry: 26000, currentLat: 39.9208, currentLng: 32.8541, currentSpeedKmh: 59, currentHeadingDeg: 35, lastTelemetryProvider: "FLESPI", assignedDriverId: "f5-drv-05" },
      { id: "f5-veh-06", code: "ARC-006", plate: "35 IZM 309", vin: "ZFA2500000230906", brand: "Fiat", model: "Ducato Maxi Panel", modelYear: 2023, vehicleType: "PANEL_VAN", fuelType: "DIESEL", ownershipType: "LEASED", branchId: "branch-izmir", status: "ACTIVE", capacityKg: 1450, capacityM3: 11.5, palletSlots: 4, isRefrigerated: false, odometerKm: 58300, engineHours: 1380, expectedLPer100Km: 11.0, tankCapacityLiters: 90, acquisitionCostTry: 0, monthlyDepreciationTry: 0, currentLat: 38.4192, currentLng: 27.1287, currentSpeedKmh: 0, currentHeadingDeg: 180, lastTelemetryProvider: "TRACCAR", assignedDriverId: "f5-drv-06" },
      { id: "f5-veh-07", code: "ARC-007", plate: "16 BRS 218", vin: "VF3YDBPFC1221807", brand: "Peugeot", model: "Boxer Soğutmalı", modelYear: 2024, vehicleType: "FRIGO_VAN", fuelType: "DIESEL", ownershipType: "OWNED", branchId: "branch-bursa", status: "IN_TRANSIT", capacityKg: 1500, capacityM3: 10.5, palletSlots: 4, isRefrigerated: true, targetTempMinC: 2, targetTempMaxC: 6, currentTempC: 3.9, odometerKm: 51200, engineHours: 1210, expectedLPer100Km: 11.6, tankCapacityLiters: 90, acquisitionCostTry: 1490000, monthlyDepreciationTry: 24800, currentLat: 40.1885, currentLng: 29.0610, currentSpeedKmh: 62, currentHeadingDeg: 20, lastTelemetryProvider: "GENERIC_WEBHOOK", assignedDriverId: "f5-drv-07" },
      { id: "f5-veh-08", code: "ARC-008", plate: "34 SNR 915", vin: "JALNPR75L7791508", brand: "Isuzu", model: "NPR10 Long Kamyonet", modelYear: 2022, vehicleType: "TRUCK", fuelType: "DIESEL", ownershipType: "OWNED", branchId: "local-debug-branch", status: "MAINTENANCE", capacityKg: 5400, capacityM3: 24.0, palletSlots: 12, isRefrigerated: false, odometerKm: 148900, engineHours: 3680, expectedLPer100Km: 17.8, tankCapacityLiters: 140, acquisitionCostTry: 2150000, monthlyDepreciationTry: 31000, currentLat: 41.0715, currentLng: 28.9891, currentSpeedKmh: 0, currentHeadingDeg: 0, lastTelemetryProvider: "TRACCAR", assignedDriverId: "f5-drv-08", notes: "75.000 km ağır bakım ve fren balata değişimi için serviste." },
      { id: "f5-veh-09", code: "ARC-009", plate: "34 SNR 622", vin: "ZFA2500000262209", brand: "Fiat", model: "Ducato Van L3H2", modelYear: 2024, vehicleType: "PANEL_VAN", fuelType: "DIESEL", ownershipType: "RENTED", branchId: "local-debug-branch", status: "ACTIVE", capacityKg: 1480, capacityM3: 13.0, palletSlots: 5, isRefrigerated: false, odometerKm: 28400, engineHours: 680, expectedLPer100Km: 10.6, tankCapacityLiters: 90, acquisitionCostTry: 0, monthlyDepreciationTry: 0, currentLat: 41.0289, currentLng: 29.1180, currentSpeedKmh: 0, currentHeadingDeg: 45, lastTelemetryProvider: "FLESPI", assignedDriverId: "f5-drv-09" },
      { id: "f5-veh-10", code: "ARC-010", plate: "34 SNR 304", vin: "6FPPXXMJ2PN30410", brand: "Ford", model: "Ranger Wildtrak 4x4", modelYear: 2023, vehicleType: "PICKUP", fuelType: "DIESEL", ownershipType: "OWNED", branchId: "local-debug-branch", status: "ACTIVE", capacityKg: 1050, capacityM3: 3.2, palletSlots: 1, isRefrigerated: false, odometerKm: 63500, engineHours: 1490, expectedLPer100Km: 9.8, tankCapacityLiters: 80, acquisitionCostTry: 1720000, monthlyDepreciationTry: 28000, currentLat: 41.0845, currentLng: 29.0124, currentSpeedKmh: 0, currentHeadingDeg: 130, lastTelemetryProvider: "TRACCAR", assignedDriverId: "f5-drv-10" },
      { id: "f5-veh-11", code: "ARC-011", plate: "34 SNR 118", vin: "WV1ZZZSYZN911811", brand: "Volkswagen", model: "Crafter Minibüs", modelYear: 2023, vehicleType: "MINIBUS", fuelType: "DIESEL", ownershipType: "LEASED", branchId: "local-debug-branch", status: "IN_TRANSIT", capacityKg: 1600, capacityM3: 11.0, palletSlots: 0, isRefrigerated: false, odometerKm: 79100, engineHours: 1920, expectedLPer100Km: 11.2, tankCapacityLiters: 75, acquisitionCostTry: 0, monthlyDepreciationTry: 0, currentLat: 40.9875, currentLng: 29.0355, currentSpeedKmh: 47, currentHeadingDeg: 315, lastTelemetryProvider: "GPSGATE_CLOUD", assignedDriverId: "f5-drv-11" },
      { id: "f5-veh-12", code: "ARC-012", plate: "34 SNR 205", vin: "NMTBZ3BE10R20512", brand: "Toyota", model: "Corolla 1.8 Hybrid", modelYear: 2025, vehicleType: "PASSENGER", fuelType: "HYBRID", ownershipType: "LEASED", branchId: "local-debug-branch", status: "ACTIVE", capacityKg: 420, capacityM3: 1.5, palletSlots: 0, isRefrigerated: false, odometerKm: 18400, engineHours: 430, expectedLPer100Km: 5.2, tankCapacityLiters: 43, acquisitionCostTry: 0, monthlyDepreciationTry: 0, currentLat: 41.0785, currentLng: 29.0112, currentSpeedKmh: 0, currentHeadingDeg: 60, assignedDriverId: "f5-drv-12" },
      { id: "f5-veh-13", code: "ARC-013", plate: "34 SNR 209", vin: "VF1RFB0017120913", brand: "Renault", model: "Megane Sedan 1.3 TCe", modelYear: 2024, vehicleType: "PASSENGER", fuelType: "PETROL", ownershipType: "OWNED", branchId: "local-debug-branch", status: "ACTIVE", capacityKg: 430, capacityM3: 1.6, palletSlots: 0, isRefrigerated: false, odometerKm: 39200, engineHours: 890, expectedLPer100Km: 7.4, tankCapacityLiters: 50, acquisitionCostTry: 1280000, monthlyDepreciationTry: 21000, currentLat: 41.0642, currentLng: 28.9970, currentSpeedKmh: 0, currentHeadingDeg: 210, assignedDriverId: "f5-drv-13" },
      { id: "f5-veh-14", code: "ARC-014", plate: "34 SNR 214", vin: "UU10SDCV56721414", brand: "Dacia", model: "Dokker Express LPG", modelYear: 2022, vehicleType: "PANEL_VAN", fuelType: "LPG", ownershipType: "OWNED", branchId: "local-debug-branch", status: "FAULT", capacityKg: 750, capacityM3: 3.9, palletSlots: 2, isRefrigerated: false, odometerKm: 121300, engineHours: 3050, expectedLPer100Km: 10.2, tankCapacityLiters: 50, acquisitionCostTry: 690000, monthlyDepreciationTry: 11500, currentLat: 41.0124, currentLng: 29.1040, currentSpeedKmh: 0, currentHeadingDeg: 0, assignedDriverId: null, notes: "LPG regülatörü basınç arızası nedeniyle servise çekildi." },
      { id: "f5-veh-15", code: "ARC-015", plate: "34 SNR 510", vin: "TYAFB83S00151015", brand: "Mitsubishi Fuso", model: "Canter 7C15 Kamyon", modelYear: 2022, vehicleType: "TRUCK", fuelType: "DIESEL", ownershipType: "OWNED", branchId: "local-debug-branch", status: "IN_TRANSIT", capacityKg: 4200, capacityM3: 21.0, palletSlots: 10, isRefrigerated: false, odometerKm: 136800, engineHours: 3420, expectedLPer100Km: 16.9, tankCapacityLiters: 130, acquisitionCostTry: 1980000, monthlyDepreciationTry: 29000, currentLat: 40.8712, currentLng: 29.3810, currentSpeedKmh: 71, currentHeadingDeg: 105, lastTelemetryProvider: "FLESPI", assignedDriverId: "f5-drv-14" },
      { id: "f5-veh-16", code: "ARC-016", plate: "34 SNR 640", vin: "VF3YDBPFC1264016", brand: "Peugeot", model: "Boxer L3H2 Frigo", modelYear: 2024, vehicleType: "FRIGO_VAN", fuelType: "DIESEL", ownershipType: "LEASED", branchId: "local-debug-branch", status: "ACTIVE", capacityKg: 1490, capacityM3: 11.5, palletSlots: 4, isRefrigerated: true, targetTempMinC: 2, targetTempMaxC: 6, currentTempC: 3.8, odometerKm: 44900, engineHours: 1050, expectedLPer100Km: 11.7, tankCapacityLiters: 90, acquisitionCostTry: 0, monthlyDepreciationTry: 0, currentLat: 41.0501, currentLng: 29.0694, currentSpeedKmh: 0, currentHeadingDeg: 15, assignedDriverId: null },
      { id: "f5-veh-17", code: "ARC-017", plate: "06 ANK 882", vin: "ZFA2630000688217", brand: "Fiat", model: "Doblo Maxi LPG", modelYear: 2023, vehicleType: "PICKUP", fuelType: "LPG", ownershipType: "RENTED", branchId: "branch-ankara", status: "ACTIVE", capacityKg: 850, capacityM3: 4.2, palletSlots: 2, isRefrigerated: false, odometerKm: 49200, engineHours: 1120, expectedLPer100Km: 9.6, tankCapacityLiters: 54, acquisitionCostTry: 0, monthlyDepreciationTry: 0, currentLat: 39.9412, currentLng: 32.8110, currentSpeedKmh: 0, currentHeadingDeg: 270, assignedDriverId: "f5-drv-15" },
      { id: "f5-veh-18", code: "ARC-018", plate: "34 SNR 990", vin: "NLAFC1620MW99018", brand: "Honda", model: "Civic 1.5 i-VTEC", modelYear: 2021, vehicleType: "PASSENGER", fuelType: "PETROL", ownershipType: "OWNED", branchId: "local-debug-branch", status: "OUT_OF_SERVICE", capacityKg: 410, capacityM3: 1.5, palletSlots: 0, isRefrigerated: false, odometerKm: 174200, engineHours: 4120, expectedLPer100Km: 7.9, tankCapacityLiters: 47, acquisitionCostTry: 940000, monthlyDepreciationTry: 14000, currentLat: 41.0790, currentLng: 29.0095, currentSpeedKmh: 0, currentHeadingDeg: 0, assignedDriverId: null, notes: "Filo yenileme kapsamında satış/tasfiye sürecinde." },
    ]

    for (const v of vehiclesSpec) {
      track("lojistikVehicle", {
        id: v.id,
        code: v.code,
        plate: v.plate,
        vin: v.vin,
        brand: v.brand,
        model: v.model,
        modelYear: v.modelYear,
        vehicleType: v.vehicleType,
        fuelType: v.fuelType,
        ownershipType: v.ownershipType,
        branchId: v.branchId,
        status: v.status,
        capacityKg: v.capacityKg,
        capacityM3: v.capacityM3,
        palletSlots: v.palletSlots,
        isRefrigerated: v.isRefrigerated,
        targetTempMinC: v.targetTempMinC ?? null,
        targetTempMaxC: v.targetTempMaxC ?? null,
        odometerKm: v.odometerKm,
        engineHours: v.engineHours,
        expectedLPer100Km: v.expectedLPer100Km,
        tankCapacityLiters: v.tankCapacityLiters,
        acquisitionCostTry: v.acquisitionCostTry,
        monthlyDepreciationTry: v.monthlyDepreciationTry,
        currentLat: v.currentLat,
        currentLng: v.currentLng,
        currentSpeedKmh: v.currentSpeedKmh,
        currentHeadingDeg: v.currentHeadingDeg,
        currentTempC: v.currentTempC ?? null,
        lastTelemetryAt: hoursAgoIso(0.5),
        lastTelemetryProvider: v.lastTelemetryProvider ?? "DEMO_DB",
        assignedDriverId: v.assignedDriverId,
        notes: v.notes ?? null,
        isActive: true,
        createdAt: createdAtBase,
        updatedAt: hoursAgoIso(0.5),
      })
    }

    // 3. Kiralama & Leasing Sözleşmeleri
    const leaseSpecs = [
      { id: "f5-lease-02", vehicleId: "f5-veh-02", lessorName: "Hedef Filo Kiralama A.Ş.", contractNo: "HDF-2023-402", monthlyCostTry: 34500, annualKmLimit: 60000, depreciationMonthlyTry: 0, startAgo: 420, endAhead: 310 },
      { id: "f5-lease-04", vehicleId: "f5-veh-04", lessorName: "ALD Automotive Türkiye", contractNo: "ALD-2023-412", monthlyCostTry: 28900, annualKmLimit: 50000, depreciationMonthlyTry: 0, startAgo: 380, endAhead: 350 },
      { id: "f5-lease-06", vehicleId: "f5-veh-06", lessorName: "LeasePlan Filo Yönetim", contractNo: "LPN-2024-309", monthlyCostTry: 27400, annualKmLimit: 45000, depreciationMonthlyTry: 0, startAgo: 290, endAhead: 440 },
      { id: "f5-lease-09", vehicleId: "f5-veh-09", lessorName: "Avis Filo Kısa Dönem", contractNo: "AVS-2026-622", monthlyCostTry: 31200, annualKmLimit: 40000, depreciationMonthlyTry: 0, startAgo: 95, endAhead: 19 }, // Süresi yaklaşıyor
      { id: "f5-lease-11", vehicleId: "f5-veh-11", lessorName: "Intercity Filo A.Ş.", contractNo: "ITC-2023-118", monthlyCostTry: 33000, annualKmLimit: 55000, depreciationMonthlyTry: 0, startAgo: 400, endAhead: 330 },
      { id: "f5-lease-12", vehicleId: "f5-veh-12", lessorName: "Garanti BBVA Filo", contractNo: "GBF-2025-205", monthlyCostTry: 24800, annualKmLimit: 35000, depreciationMonthlyTry: 0, startAgo: 180, endAhead: 550 },
      { id: "f5-lease-16", vehicleId: "f5-veh-16", lessorName: "Hedef Filo Kiralama A.Ş.", contractNo: "HDF-2024-640", monthlyCostTry: 32500, annualKmLimit: 50000, depreciationMonthlyTry: 0, startAgo: 250, endAhead: 480 },
      { id: "f5-lease-17", vehicleId: "f5-veh-17", lessorName: "Budget Kurumsal Kiralama", contractNo: "BDG-2025-882", monthlyCostTry: 19500, annualKmLimit: 40000, depreciationMonthlyTry: 0, startAgo: 160, endAhead: 205 },
    ]
    for (const l of leaseSpecs) {
      track("lojistikVehicleLease", {
        id: l.id,
        vehicleId: l.vehicleId,
        lessorName: l.lessorName,
        contractNo: l.contractNo,
        startDate: daysAgoIso(l.startAgo),
        endDate: daysAheadIso(l.endAhead),
        monthlyCostTry: l.monthlyCostTry,
        annualKmLimit: l.annualKmLimit,
        depreciationMonthlyTry: l.depreciationMonthlyTry,
        notes: "Kasko ve periyodik lastik değişimi sözleşme dahilindedir.",
        isActive: true,
        createdAt: daysAgoIso(l.startAgo),
        updatedAt: daysAgoIso(10),
      })
    }

    // 4. Araç Evrakları (Süresi Dolmuş + Yaklaşan + Geçerli Örnekleri)
    const docsSpec = [
      { id: "f5-doc-01", vehicleId: "f5-veh-01", docType: "KASKO", documentNo: "KSK-2025-808", issuer: "Allianz Sigorta", expiresDelta: 7, costTry: 34200 }, // Yaklaşan (7 gün)
      { id: "f5-doc-02", vehicleId: "f5-veh-01", docType: "MUAYENE", documentNo: "TUV-34-8081", issuer: "TÜVTÜRK", expiresDelta: 190, costTry: 2680 },
      { id: "f5-doc-03", vehicleId: "f5-veh-01", docType: "FRIGO_KALIBRASYON", documentNo: "FRG-2026-01", issuer: "TermoTest", expiresDelta: 140, costTry: 4800 },
      { id: "f5-doc-04", vehicleId: "f5-veh-02", docType: "TRAFIK_SIGORTASI", documentNo: "TRF-2026-402", issuer: "Anadolu Sigorta", expiresDelta: 112, costTry: 14900 },
      { id: "f5-doc-05", vehicleId: "f5-veh-02", docType: "MUAYENE", documentNo: "TUV-34-4022", issuer: "TÜVTÜRK", expiresDelta: 220, costTry: 2680 },
      { id: "f5-doc-06", vehicleId: "f5-veh-03", docType: "FRIGO_KALIBRASYON", documentNo: "FRG-2026-03", issuer: "TermoTest", expiresDelta: 18, costTry: 4950 }, // Yaklaşan (18 gün)
      { id: "f5-doc-07", vehicleId: "f5-veh-03", docType: "KASKO", documentNo: "KSK-2025-720", issuer: "AXA Sigorta", expiresDelta: 260, costTry: 41800 },
      { id: "f5-doc-08", vehicleId: "f5-veh-04", docType: "TRAFIK_SIGORTASI", documentNo: "TRF-2025-412", issuer: "Sompo Sigorta", expiresDelta: 11, costTry: 12400 }, // Yaklaşan (11 gün)
      { id: "f5-doc-09", vehicleId: "f5-veh-05", docType: "MUAYENE", documentNo: "TUV-06-514", issuer: "TÜVTÜRK Ankara", expiresDelta: 175, costTry: 2680 },
      { id: "f5-doc-10", vehicleId: "f5-veh-05", docType: "MTV_VERGI", documentNo: "MTV-2026-0514", issuer: "GİB İnteraktif VD", expiresDelta: 74, costTry: 6420 },
      { id: "f5-doc-11", vehicleId: "f5-veh-06", docType: "KASKO", documentNo: "KSK-2026-309", issuer: "Aksigorta", expiresDelta: 240, costTry: 29500 },
      { id: "f5-doc-12", vehicleId: "f5-veh-07", docType: "FRIGO_KALIBRASYON", documentNo: "FRG-16-218", issuer: "Bursa Soğutma Kalib.", expiresDelta: 205, costTry: 4600 },
      { id: "f5-doc-13", vehicleId: "f5-veh-08", docType: "MUAYENE", documentNo: "TUV-34-915", issuer: "TÜVTÜRK", expiresDelta: -6, costTry: 3120 }, // SÜRESİ DOLMUŞ (-6 gün)
      { id: "f5-doc-14", vehicleId: "f5-veh-08", docType: "TRAFIK_SIGORTASI", documentNo: "TRF-2026-915", issuer: "HDI Sigorta", expiresDelta: 132, costTry: 18900 },
      { id: "f5-doc-15", vehicleId: "f5-veh-10", docType: "MTV_VERGI", documentNo: "MTV-2026-304", issuer: "GİB İnteraktif VD", expiresDelta: 74, costTry: 9180 },
      { id: "f5-doc-16", vehicleId: "f5-veh-11", docType: "TRAFIK_SIGORTASI", documentNo: "TRF-2026-118", issuer: "Allianz Sigorta", expiresDelta: 288, costTry: 13400 },
      { id: "f5-doc-17", vehicleId: "f5-veh-12", docType: "KASKO", documentNo: "KSK-2026-205", issuer: "Anadolu Sigorta", expiresDelta: 310, costTry: 22600 },
      { id: "f5-doc-18", vehicleId: "f5-veh-13", docType: "MUAYENE", documentNo: "TUV-34-209", issuer: "TÜVTÜRK", expiresDelta: 390, costTry: 1821 },
      { id: "f5-doc-19", vehicleId: "f5-veh-14", docType: "MUAYENE", documentNo: "TUV-34-214", issuer: "TÜVTÜRK", expiresDelta: 82, costTry: 1821 },
      { id: "f5-doc-20", vehicleId: "f5-veh-15", docType: "KASKO", documentNo: "KSK-2026-510", issuer: "Türkiye Sigorta", expiresDelta: 165, costTry: 46500 },
      { id: "f5-doc-21", vehicleId: "f5-veh-16", docType: "FRIGO_KALIBRASYON", documentNo: "FRG-2026-640", issuer: "TermoTest", expiresDelta: 245, costTry: 4850 },
      { id: "f5-doc-22", vehicleId: "f5-veh-17", docType: "TRAFIK_SIGORTASI", documentNo: "TRF-06-882", issuer: "Neova Sigorta", expiresDelta: 198, costTry: 8900 },
    ]

    for (const d of docsSpec) {
      const expiresAt = d.expiresDelta < 0 ? daysAgoIso(Math.abs(d.expiresDelta)) : daysAheadIso(d.expiresDelta)
      track("lojistikVehicleDocument", {
        id: d.id,
        vehicleId: d.vehicleId,
        docType: d.docType,
        documentNo: d.documentNo,
        issuer: d.issuer,
        issuedAt: daysAgoIso(180),
        expiresAt,
        costTry: d.costTry,
        reminderDaysBefore: 30,
        financeId: null,
        notes: d.expiresDelta < 0 ? "Yenileme tarihi geçti — trafiğe çıkış engellendi." : null,
        status: d.expiresDelta < 0 ? "EXPIRED" : d.expiresDelta <= 30 ? "EXPIRING_SOON" : "VALID",
        createdAt: daysAgoIso(180),
        updatedAt: daysAgoIso(2),
      })
    }

    // 5. Trafik Cezaları + Bağlı Finans Kayıtları
    const penaltiesSpec = [
      { id: "f5-pen-01", penaltyNo: "CEZA-2026-0411", vehicleId: "f5-veh-04", driverId: "f5-drv-04", daysAgo: 18, violationType: "HIZ_IHLALI", reason: "TEM Kurtköy EDS %30 üzeri hız sınırı ihlali", amountTry: 3135, discountedAmountTry: 2351.25, paymentStatus: "UNPAID" },
      { id: "f5-pen-02", penaltyNo: "CEZA-2026-0388", vehicleId: "f5-veh-01", driverId: "f5-drv-01", daysAgo: 42, violationType: "OGS_HGS_IHLAL", reason: "Osmangazi Köprüsü HGS bakiye yetersizliği geçişi", amountTry: 1840, discountedAmountTry: 1380, paymentStatus: "PAID", finId: "f5-fin-09" },
      { id: "f5-pen-03", penaltyNo: "CEZA-2026-0351", vehicleId: "f5-veh-11", driverId: "f5-drv-11", daysAgo: 65, violationType: "PARK_YASAGI", reason: "Kadıköy Söğütlüçeşme durak dışı park cezası", amountTry: 1506, discountedAmountTry: 1129.5, paymentStatus: "DEDUCTED_DRIVER", finId: "f5-fin-10" },
      { id: "f5-pen-04", penaltyNo: "CEZA-2026-0294", vehicleId: "f5-veh-02", driverId: "f5-drv-02", daysAgo: 110, violationType: "TONAJ_FAZLA", reason: "Kantar ölçüm toleransı aşımı idari para cezası", amountTry: 4680, discountedAmountTry: 3510, paymentStatus: "PAID" },
      { id: "f5-pen-05", penaltyNo: "CEZA-2026-0210", vehicleId: "f5-veh-15", driverId: "f5-drv-14", daysAgo: 175, violationType: "SERIT_IHLALI", reason: "Kamyon yasak saat / sağ şerit ihlali", amountTry: 2167, discountedAmountTry: 1625.25, paymentStatus: "DISPUTED" },
      { id: "f5-pen-06", penaltyNo: "CEZA-2026-0440", vehicleId: "f5-veh-07", driverId: "f5-drv-07", daysAgo: 9, violationType: "HIZ_IHLALI", reason: "O-5 Yalova gişe çıkışı EDS hız ihlali", amountTry: 1506, discountedAmountTry: 1129.5, paymentStatus: "UNPAID" },
    ]
    for (const p of penaltiesSpec) {
      track("lojistikTrafficPenalty", {
        id: p.id,
        penaltyNo: p.penaltyNo,
        vehicleId: p.vehicleId,
        driverId: p.driverId,
        violationDate: daysAgoIso(p.daysAgo),
        dueDate: p.paymentStatus === "UNPAID" ? daysAheadIso(12) : daysAgoIso(p.daysAgo - 10),
        location: "Karayolları EDS",
        violationType: p.violationType,
        reason: p.reason,
        amountTry: p.amountTry,
        discountedAmountTry: p.discountedAmountTry,
        paidAt: p.paymentStatus === "PAID" || p.paymentStatus === "DEDUCTED_DRIVER" ? daysAgoIso(p.daysAgo - 5) : null,
        paymentStatus: p.paymentStatus,
        financeId: p.finId ?? null,
        notes: null,
        createdAt: daysAgoIso(p.daysAgo),
        updatedAt: daysAgoIso(p.daysAgo),
      })
    }

    // 6. Bağımsız Filo Bakım Planları, 12 Aylık İş Emirleri, Yedek Parça & Lastikler
    const plansSpec = [
      { id: "f5-mplan-01", code: "MPLAN-15K-01", name: "15.000 km Periyodik Motor & Yağ Bakımı", vehicleId: "f5-veh-01", planType: "METER_KM", frequencyKm: 15000, lastTriggeredKm: 70000, estimatedCostTry: 9800 }, // 84250 - 70000 = 14250 -> yaklaşıyor!
      { id: "f5-mplan-02", code: "MPLAN-FRIGO-02", name: "Frigo Ünite 180 Günlük Gaz & Kompresör Bakımı", vehicleId: "f5-veh-03", planType: "CALENDAR", frequencyDays: 180, lastTriggeredDate: daysAgoIso(190), nextScheduledDate: daysAgoIso(10), estimatedCostTry: 7400 }, // Gecikmiş!
      { id: "f5-mplan-03", code: "MPLAN-TRK-20K", name: "Kamyonet 20.000 km Şanzıman & Fren Bakımı", vehicleId: "f5-veh-02", planType: "METER_KM", frequencyKm: 20000, lastTriggeredKm: 100000, estimatedCostTry: 14500 },
      { id: "f5-mplan-04", code: "MPLAN-HRS-04", name: "2.500 Saat Ağır Motor Revizyon Kontrolü", vehicleId: "f5-veh-08", planType: "METER_HOURS", frequencyHours: 1000, lastTriggeredHours: 2680, estimatedCostTry: 24000 }, // 3680 >= 3680 -> DUE!
      { id: "f5-mplan-05", code: "MPLAN-VAN-15K", name: "Van 15.000 km Bakım & Enjektör Temizliği", vehicleId: "f5-veh-04", planType: "METER_KM", frequencyKm: 15000, lastTriggeredKm: 75000, estimatedCostTry: 11200 }, // 93400 >= 90000 -> Gecikmiş!
      { id: "f5-mplan-06", code: "MPLAN-GEN-ALL", name: "Filo Genel Kış Lastiği & Antifriz Kontrolü", vehicleId: null, vehicleTypeFilter: "ALL", planType: "CALENDAR", frequencyDays: 365, lastTriggeredDate: daysAgoIso(340), nextScheduledDate: daysAheadIso(25), estimatedCostTry: 3500 },
    ]
    for (const mp of plansSpec) {
      track("lojistikVehicleMaintenancePlan", {
        id: mp.id,
        code: mp.code,
        name: mp.name,
        vehicleId: mp.vehicleId,
        vehicleTypeFilter: mp.vehicleTypeFilter ?? null,
        planType: mp.planType,
        frequencyDays: mp.frequencyDays ?? null,
        frequencyKm: mp.frequencyKm ?? null,
        frequencyHours: mp.frequencyHours ?? null,
        conditionParameter: null,
        conditionThreshold: null,
        lastTriggeredDate: mp.lastTriggeredDate ?? daysAgoIso(90),
        lastTriggeredKm: mp.lastTriggeredKm ?? null,
        lastTriggeredHours: mp.lastTriggeredHours ?? null,
        nextScheduledDate: mp.nextScheduledDate ?? daysAheadIso(30),
        estimatedCostTry: mp.estimatedCostTry,
        checklistJson: JSON.stringify(["Motor yağı & filtre değişimi", "Fren balata kalınlık kontrolü", "Süspansiyon & rot kontrolü"]),
        isActive: true,
        notes: null,
        createdAt: createdAtBase,
        updatedAt: daysAgoIso(2),
      })
    }

    // 12 Aylık Bakım İş Emirleri (f5-mwo-01 .. f5-mwo-12)
    const wosSpec = [
      { id: "f5-mwo-01", num: "FBK-2025-101", veh: "f5-veh-01", planId: "f5-mplan-01", type: "PREVENTIVE", status: "COMPLETED", title: "70.000 km Periyodik Yağ & Filtre Bakımı", daysAgo: 335, downtime: 150, laborCost: 2600, spareCost: 5400, extCost: 0, odo: 70100 },
      { id: "f5-mwo-02", num: "FBK-2025-114", veh: "f5-veh-02", planId: "f5-mplan-03", type: "PREVENTIVE", status: "COMPLETED", title: "100.000 km Şanzıman & Balata Bakımı", daysAgo: 285, downtime: 240, laborCost: 4200, spareCost: 6800, extCost: 2500, odo: 100200 },
      { id: "f5-mwo-03", num: "FBK-2026-009", veh: "f5-veh-08", planId: null, type: "BREAKDOWN", status: "COMPLETED", title: "Alternatör & Şarj Dinamosu Arıza Onarımı", daysAgo: 240, downtime: 360, laborCost: 4800, spareCost: 9200, extCost: 3100, odo: 138400, fail: "ELEKTRIK_ARIZA", root: "Rulman aşınması sonucu sargı hasarı" },
      { id: "f5-mwo-04", num: "FBK-2026-024", veh: "f5-veh-04", planId: "f5-mplan-05", type: "PREVENTIVE", status: "COMPLETED", title: "75.000 km Periyodik Bakım & Dizel Filtre", daysAgo: 195, downtime: 120, laborCost: 2400, spareCost: 4900, extCost: 0, odo: 75200 },
      { id: "f5-mwo-05", num: "FBK-2026-041", veh: "f5-veh-05", planId: null, type: "BREAKDOWN", status: "COMPLETED", title: "Frigo Termostat & Sensör Değişimi", daysAgo: 155, downtime: 180, laborCost: 2200, spareCost: 3400, extCost: 1900, odo: 59100, fail: "FRIGO_SENSOR", root: "Nem alması nedeniyle PT100 sensör sapması" },
      { id: "f5-mwo-06", num: "FBK-2026-058", veh: "f5-veh-03", planId: "f5-mplan-02", type: "PREVENTIVE", status: "COMPLETED", title: "Frigo Kompresör Gaz Dolumu & Sızdırmazlık", daysAgo: 120, downtime: 110, laborCost: 1900, spareCost: 2100, extCost: 1800, odo: 31400 },
      { id: "f5-mwo-07", num: "FBK-2026-073", veh: "f5-veh-15", planId: null, type: "TIRE_SERVICE", status: "COMPLETED", title: "Arka Aks 4 Adet Lastik Yenileme & Balans", daysAgo: 88, downtime: 95, laborCost: 1800, spareCost: 28400, extCost: 600, odo: 129500 },
      { id: "f5-mwo-08", num: "FBK-2026-089", veh: "f5-veh-07", planId: null, type: "PREVENTIVE", status: "COMPLETED", title: "45.000 km Periyodik Bakım & Polen Filtresi", daysAgo: 54, downtime: 90, laborCost: 2100, spareCost: 4300, extCost: 0, odo: 45100 },
      { id: "f5-mwo-09", num: "FBK-2026-102", veh: "f5-veh-14", planId: null, type: "BREAKDOWN", status: "COMPLETED", title: "Ateşleme Bobini & Buji Değişimi", daysAgo: 28, downtime: 140, laborCost: 1750, spareCost: 3200, extCost: 0, odo: 119800, fail: "ATESLEME", root: "Silindir 2 bobin kısa devresi" },
      { id: "f5-mwo-10", num: "FBK-2026-118", veh: "f5-veh-08", planId: "f5-mplan-04", type: "PREVENTIVE", status: "IN_PROGRESS", title: "150.000 km Ağır Bakım & Ön Fren Disk Değişimi", daysAgo: 3, downtime: 420, laborCost: 6400, spareCost: 11800, extCost: 4500, odo: 148900 },
      { id: "f5-mwo-11", num: "FBK-2026-124", veh: "f5-veh-14", planId: null, type: "BREAKDOWN", status: "SCHEDULED", title: "LPG Regülatör Değişimi & Kalibrasyon", daysAgo: 2, downtime: 0, laborCost: 1800, spareCost: 4600, extCost: 0, odo: 121300, fail: "LPG_BASINC", root: "Diyafram yırtılması" },
      { id: "f5-mwo-12", num: "FBK-2026-129", veh: "f5-veh-04", planId: "f5-mplan-05", type: "INSPECTION_PREP", status: "REQUESTED", title: "90.000 km Bakım + Enjektör Testi (Yakıt Anormalliği)", daysAgo: 1, downtime: 0, laborCost: 3200, spareCost: 8400, extCost: 1500, odo: 93400 },
    ]
    for (const w of wosSpec) {
      const total = w.laborCost + w.spareCost + w.extCost
      track("lojistikVehicleMaintenanceWorkOrder", {
        id: w.id,
        workOrderNumber: w.num,
        vehicleId: w.veh,
        planId: w.planId,
        orderType: w.type,
        priority: w.type === "BREAKDOWN" ? "HIGH" : "MEDIUM",
        status: w.status,
        title: w.title,
        description: w.title,
        serviceProviderName: w.extCost > 0 ? "Yetkili Ticari Araç Servisi" : "İç Filo Bakım Atölyesi",
        odometerKmAtService: w.odo,
        engineHoursAtService: Math.round(w.odo / 42),
        downtimeMinutes: w.downtime,
        laborHours: Number((w.downtime / 60).toFixed(1)),
        laborCostTry: w.laborCost,
        sparePartCostTry: w.spareCost,
        externalServiceCostTry: w.extCost,
        totalCostTry: total,
        failureReasonCode: w.fail ?? null,
        rootCause: w.root ?? null,
        checklistResultsJson: null,
        financeId: w.id === "f5-mwo-07" ? "f5-fin-05" : w.id === "f5-mwo-08" ? "f5-fin-06" : null,
        plannedDate: daysAgoIso(w.daysAgo),
        startedAt: w.status === "REQUESTED" ? null : daysAgoIso(w.daysAgo),
        completedAt: w.status === "COMPLETED" ? daysAgoIso(w.daysAgo) : null,
        createdBy: "local-debug-user",
        createdAt: daysAgoIso(w.daysAgo),
        updatedAt: daysAgoIso(Math.max(0, w.daysAgo - 1)),
      })
    }

    // İş Emirlerinde Kullanılan Stok Kartları (mevcut InventoryItem kayıtlarına referansla)
    const sparePartsSpec = [
      { id: "f5-msp-01", woId: "f5-mwo-01", itemId: "item-sng-04", qty: 2, unitCost: 480, note: "Temizlik & koruyucu sarf kiti (demo)" },
      { id: "f5-msp-02", woId: "f5-mwo-08", itemId: "item-sng-04", qty: 1, unitCost: 480, note: "Kabin/filtre temizlik sarfı (demo)" },
      { id: "f5-msp-03", woId: "f5-mwo-09", itemId: "item-vaz-03", qty: 1, unitCost: 280, note: "Muhafaza & koruma seti (demo)" },
      { id: "f5-msp-04", woId: "f5-mwo-10", itemId: "item-sng-04", qty: 3, unitCost: 480, note: "Atölye bakım sarfı (demo)" },
    ]
    for (const sp of sparePartsSpec) {
      track("lojistikVehicleMaintenanceSparePart", {
        id: sp.id,
        workOrderId: sp.woId,
        itemId: sp.itemId,
        quantityUsed: sp.qty,
        unitCostTry: sp.unitCost,
        totalCostTry: sp.qty * sp.unitCost,
        stockMovementId: null,
        notes: sp.note,
        createdAt: daysAgoIso(10),
      })
    }

    // Bakım Kontrol Listesi Sonuçları
    const chkSpec = [
      { id: "f5-mchk-01", woId: "f5-mwo-08", seq: 10, ins: "Motor yağı vizkozite ve seviye kontrolü", pass: true, val: "5W-30 Tam" },
      { id: "f5-mchk-02", woId: "f5-mwo-08", seq: 20, ins: "Ön & arka balata kalınlık ölçümü", pass: true, val: "7.5 mm" },
      { id: "f5-mchk-03", woId: "f5-mwo-10", seq: 10, ins: "Ön fren disk kalınlık ölçümü (min 24mm)", pass: false, val: "22.1 mm - Değiştiriliyor" },
      { id: "f5-mchk-04", woId: "f5-mwo-10", seq: 20, ins: "El freni tel gerginlik ayarı", pass: true, val: "Standart" },
    ]
    for (const c of chkSpec) {
      track("lojistikVehicleMaintenanceChecklistResult", {
        id: c.id,
        workOrderId: c.woId,
        sequence: c.seq,
        instruction: c.ins,
        isPassed: c.pass,
        measuredVal: c.val,
        notes: null,
        checkedAt: daysAgoIso(3),
      })
    }

    // Arıza Kayıtları
    const faultsSpec = [
      { id: "f5-flt-01", code: "FLT-2026-014", veh: "f5-veh-14", drv: null, daysAgo: 2, odo: 121300, sev: "HIGH", cat: "MEKANIK", title: "LPG Regülatör Gaz Kaçağı & Basınç Düşümü", status: "WORK_ORDER_CREATED", woId: "f5-mwo-11" },
      { id: "f5-flt-02", code: "FLT-2026-013", veh: "f5-veh-03", drv: "f5-drv-03", daysAgo: 1, odo: 41600, sev: "CRITICAL", cat: "FRIGO", title: "Kasa Sıcaklığı +7.4°C Eşiğini Aştı (Kapı Contası Kontrolü)", status: "OPEN", woId: null },
      { id: "f5-flt-03", code: "FLT-2026-012", veh: "f5-veh-04", drv: "f5-drv-04", daysAgo: 3, odo: 93400, sev: "HIGH", cat: "MEKANIK", title: "Yakıt Tüketimi +110% Sapma & Siyah Egzoz Dumanı", status: "WORK_ORDER_CREATED", woId: "f5-mwo-12" },
      { id: "f5-flt-04", code: "FLT-2026-009", veh: "f5-veh-08", drv: "f5-drv-08", daysAgo: 240, odo: 138400, sev: "HIGH", cat: "ELEKTRIK", title: "Akü Şarj İkaz Lambası & Alternatör Arızası", status: "RESOLVED", woId: "f5-mwo-03" },
      { id: "f5-flt-05", code: "FLT-2026-005", veh: "f5-veh-05", drv: "f5-drv-05", daysAgo: 155, odo: 59100, sev: "MEDIUM", cat: "FRIGO", title: "Soğutucu Kabin Sensörü Yanlış Okuma", status: "RESOLVED", woId: "f5-mwo-05" },
    ]
    for (const f of faultsSpec) {
      track("lojistikVehicleFaultLog", {
        id: f.id,
        faultCode: f.code,
        vehicleId: f.veh,
        driverId: f.drv,
        reportedAt: daysAgoIso(f.daysAgo),
        odometerKm: f.odo,
        severity: f.sev,
        category: f.cat,
        title: f.title,
        description: f.title,
        status: f.status,
        linkedWorkOrderId: f.woId,
        resolvedAt: f.status === "RESOLVED" ? daysAgoIso(f.daysAgo - 1) : null,
        createdAt: daysAgoIso(f.daysAgo),
        updatedAt: daysAgoIso(f.daysAgo),
      })
    }

    // Lastik Takibi (12 kayıt; f5-tire-04 yıpranmış 2.4 mm uyarısı!)
    const tiresSpec = [
      { id: "f5-tire-01", veh: "f5-veh-01", dot: "DOT-MIC-2408", brand: "Michelin Agilis 3", size: "215/65R16C", pos: "FRONT_LEFT", installedKm: 62000, tread: 5.8, min: 3.0, cost: 5200 },
      { id: "f5-tire-02", veh: "f5-veh-01", dot: "DOT-MIC-2409", brand: "Michelin Agilis 3", size: "215/65R16C", pos: "FRONT_RIGHT", installedKm: 62000, tread: 5.6, min: 3.0, cost: 5200 },
      { id: "f5-tire-03", veh: "f5-veh-02", dot: "DOT-BRI-2311", brand: "Bridgestone Duravis R660", size: "195/75R16C", pos: "FRONT_LEFT", installedKm: 74000, tread: 4.1, min: 3.0, cost: 6400 },
      { id: "f5-tire-04", veh: "f5-veh-04", dot: "DOT-LAS-2204", brand: "Lassa Transway 2", size: "225/65R16C", pos: "REAR_LEFT", installedKm: 41000, tread: 2.4, min: 3.0, cost: 4300, status: "NEEDS_REPLACEMENT" }, // Düşük diş derinliği uyarısı
      { id: "f5-tire-05", veh: "f5-veh-04", dot: "DOT-LAS-2205", brand: "Lassa Transway 2", size: "225/65R16C", pos: "REAR_RIGHT", installedKm: 41000, tread: 2.8, min: 3.0, cost: 4300, status: "NEEDS_REPLACEMENT" },
      { id: "f5-tire-06", veh: "f5-veh-03", dot: "DOT-CON-2501", brand: "Continental VanContact", size: "235/65R16C", pos: "FRONT_LEFT", installedKm: 5000, tread: 7.4, min: 3.0, cost: 6900 },
      { id: "f5-tire-07", veh: "f5-veh-03", dot: "DOT-CON-2502", brand: "Continental VanContact", size: "235/65R16C", pos: "FRONT_RIGHT", installedKm: 5000, tread: 7.3, min: 3.0, cost: 6900 },
      { id: "f5-tire-08", veh: "f5-veh-08", dot: "DOT-PIR-2308", brand: "Pirelli Carrier", size: "215/75R17.5", pos: "FRONT_LEFT", installedKm: 112000, tread: 3.6, min: 3.0, cost: 8900 },
      { id: "f5-tire-09", veh: "f5-veh-15", dot: "DOT-GOO-2601", brand: "Goodyear KMAX S", size: "215/75R17.5", pos: "REAR_LEFT", installedKm: 129500, tread: 10.2, min: 3.0, cost: 7100 },
      { id: "f5-tire-10", veh: "f5-veh-15", dot: "DOT-GOO-2602", brand: "Goodyear KMAX S", size: "215/75R17.5", pos: "REAR_RIGHT", installedKm: 129500, tread: 10.1, min: 3.0, cost: 7100 },
      { id: "f5-tire-11", veh: "f5-veh-05", dot: "DOT-MIC-2412", brand: "Michelin Agilis CrossClimate", size: "235/65R16C", pos: "FRONT_LEFT", installedKm: 32000, tread: 6.2, min: 3.0, cost: 6400 },
      { id: "f5-tire-12", veh: "f5-veh-12", dot: "DOT-BRI-2509", brand: "Bridgestone Turanza T005", size: "205/55R16", pos: "FRONT_LEFT", installedKm: 1000, tread: 7.1, min: 2.5, cost: 3900 },
    ]
    for (const t of tiresSpec) {
      track("lojistikVehicleTire", {
        id: t.id,
        vehicleId: t.veh,
        serialOrDot: t.dot,
        brandModel: t.brand,
        sizeCode: t.size,
        position: t.pos,
        installedOdometerKm: t.installedKm,
        currentTreadDepthMm: t.tread,
        minTreadDepthMm: t.min,
        status: t.status ?? "ACTIVE",
        lastInspectedAt: daysAgoIso(4),
        costTry: t.cost,
        notes: t.tread <= t.min ? "Acil lastik değişimi gerekiyor!" : null,
        createdAt: daysAgoIso(60),
        updatedAt: daysAgoIso(4),
      })
    }

    // 7. 12 Aylık Yakıt Kayıtları (f5-fuel-01 .. f5-fuel-36)
    // İçerisinde:
    // - Aylık normal seyir (34 SNR 808, 34 LJS 402, 34 SNR 720, 06 ANK 514, 34 SNR 205, 34 SNR 209, 34 SNR 214)
    // - 34 SNR 412 (f5-veh-04) ANORMAL TÜKETİM (26.25 L/100km ve 27.5 L/100km — beklenen 12.5 L/100km'ye göre >%100 artış!)
    // - Kart faturası mutabakat uyuşmazlık örneği (+8.5 L fark)
    const fuelSpec = [
      // 34 SNR 808 (12 ay - aylık dolum, ~11.8 L/100km normal)
      { id: "f5-fuel-01", veh: "f5-veh-01", drv: "f5-drv-01", daysAgo: 340, fuelType: "DIESEL", odo: 51200, liters: 65.0, price: 42.1, card: "OPET-4401", invRef: "OPT-2025-1101", invL: 65.0, station: "Opet Ümraniye" },
      { id: "f5-fuel-02", veh: "f5-veh-01", drv: "f5-drv-01", daysAgo: 310, fuelType: "DIESEL", odo: 53800, liters: 306.8, price: 42.4, card: "OPET-4401", invRef: "OPT-2025-1201", invL: 306.8, station: "Opet Gebze" }, // 2600km -> 11.8 L/100km
      { id: "f5-fuel-03", veh: "f5-veh-01", drv: "f5-drv-01", daysAgo: 280, fuelType: "DIESEL", odo: 56500, liters: 321.3, price: 42.9, card: "OPET-4401", invRef: "OPT-2026-0101", invL: 321.3, station: "Opet Levent" },
      { id: "f5-fuel-04", veh: "f5-veh-01", drv: "f5-drv-01", daysAgo: 250, fuelType: "DIESEL", odo: 59300, liters: 324.8, price: 43.2, card: "OPET-4401", invRef: "OPT-2026-0201", invL: 324.8, station: "Opet Dilovası" },
      { id: "f5-fuel-05", veh: "f5-veh-01", drv: "f5-drv-01", daysAgo: 218, fuelType: "DIESEL", odo: 62200, liters: 342.2, price: 43.6, card: "OPET-4401", invRef: "OPT-2026-0301", invL: 342.2, station: "Opet Ataşehir" },
      { id: "f5-fuel-06", veh: "f5-veh-01", drv: "f5-drv-01", daysAgo: 185, fuelType: "DIESEL", odo: 65100, liters: 339.3, price: 43.8, card: "OPET-4401", invRef: "OPT-2026-0401", invL: 339.3, station: "Opet Gebze" },
      { id: "f5-fuel-07", veh: "f5-veh-01", drv: "f5-drv-01", daysAgo: 150, fuelType: "DIESEL", odo: 68200, liters: 365.8, price: 44.1, card: "OPET-4401", invRef: "OPT-2026-0501", invL: 365.8, station: "Opet Kartal" },
      { id: "f5-fuel-08", veh: "f5-veh-01", drv: "f5-drv-01", daysAgo: 118, fuelType: "DIESEL", odo: 71600, liters: 397.8, price: 44.3, card: "OPET-4401", invRef: "OPT-2026-0601", invL: 397.8, station: "Opet Ümraniye" },
      { id: "f5-fuel-09", veh: "f5-veh-01", drv: "f5-drv-01", daysAgo: 88, fuelType: "DIESEL", odo: 75000, liters: 401.2, price: 44.6, card: "OPET-4401", invRef: "OPT-2026-0701", invL: 401.2, station: "Opet Gebze" },
      { id: "f5-fuel-10", veh: "f5-veh-01", drv: "f5-drv-01", daysAgo: 58, fuelType: "DIESEL", odo: 78400, liters: 394.4, price: 44.8, card: "OPET-4401", invRef: "OPT-2026-0801", invL: 394.4, station: "Opet Yalova" },
      { id: "f5-fuel-11", veh: "f5-veh-01", drv: "f5-drv-01", daysAgo: 28, fuelType: "DIESEL", odo: 81400, liters: 357.0, price: 45.0, card: "OPET-4401", invRef: "OPT-2026-0901", invL: 357.0, station: "Opet Levent" },
      { id: "f5-fuel-12", veh: "f5-veh-01", drv: "f5-drv-01", daysAgo: 3, fuelType: "DIESEL", odo: 84100, liters: 318.6, price: 45.2, card: "OPET-4401", invRef: "OPT-2026-1102", invL: 318.6, station: "Opet Gebze" },

      // 34 SNR 412 (f5-veh-04) — ANORMAL TÜKETİM & FATURA UYUŞMAZLIK ÖRNEĞİ
      { id: "f5-fuel-13", veh: "f5-veh-04", drv: "f5-drv-04", daysAgo: 75, fuelType: "DIESEL", odo: 89600, liters: 58.0, price: 44.5, card: "SHELL-4120", invRef: "SHL-2026-8801", invL: 58.0, station: "Shell Ataşehir", calc: 12.2 },
      { id: "f5-fuel-14", veh: "f5-veh-04", drv: "f5-drv-04", daysAgo: 45, fuelType: "DIESEL", odo: 91200, liters: 201.6, price: 44.8, card: "SHELL-4120", invRef: "SHL-2026-9102", invL: 201.6, station: "Shell Ümraniye", calc: 12.6 }, // 1600km -> 12.6
      { id: "f5-fuel-15", veh: "f5-veh-04", drv: "f5-drv-04", daysAgo: 14, fuelType: "DIESEL", odo: 92400, liters: 315.0, price: 45.1, card: "SHELL-4120", invRef: "SHL-2026-9450", invL: 315.0, station: "Shell Dudullu", calc: 26.25, anomaly: true, anomalyNote: "Beklenen 12.5 L/100km yerine 26.25 L/100km (+%110 sapma) — acil yakıt kaçağı / suistimal kontrolü." },
      { id: "f5-fuel-16", veh: "f5-veh-04", drv: "f5-drv-04", daysAgo: 3, fuelType: "DIESEL", odo: 93200, liters: 220.0, price: 45.2, card: "SHELL-4120", invRef: "SHL-2026-9788", invL: 228.5, station: "Shell Sancaktepe", calc: 27.5, anomaly: true, anomalyNote: "Beklenen 12.5 L/100km yerine 27.5 L/100km (+%120 sapma) ve kart ekstresiyle +8.5L fatura farkı!" },

      // 34 LJS 402 (f5-veh-02 — TRUCK)
      { id: "f5-fuel-17", veh: "f5-veh-02", drv: "f5-drv-02", daysAgo: 90, fuelType: "DIESEL", odo: 105400, liters: 82.0, price: 44.5, card: "OPET-4402", invRef: "OPT-2026-0702", invL: 82.0, station: "Opet Kartal" },
      { id: "f5-fuel-18", veh: "f5-veh-02", drv: "f5-drv-02", daysAgo: 58, fuelType: "DIESEL", odo: 108400, liters: 456.0, price: 44.8, card: "OPET-4402", invRef: "OPT-2026-0802", invL: 456.0, station: "Opet Ataşehir", calc: 15.2 },
      { id: "f5-fuel-19", veh: "f5-veh-02", drv: "f5-drv-02", daysAgo: 25, fuelType: "DIESEL", odo: 111800, liters: 513.4, price: 45.1, card: "OPET-4402", invRef: "OPT-2026-1002", invL: 513.4, station: "Opet Kadıköy", calc: 15.1 },
      { id: "f5-fuel-20", veh: "f5-veh-02", drv: "f5-drv-02", daysAgo: 4, fuelType: "DIESEL", odo: 112400, liters: 92.0, price: 45.2, card: "OPET-4402", invRef: "OPT-2026-1103", invL: 92.0, station: "Opet Kurtköy", calc: 15.33 },

      // 34 SNR 720 (f5-veh-03 — FRIGO_VAN)
      { id: "f5-fuel-21", veh: "f5-veh-03", drv: "f5-drv-03", daysAgo: 62, fuelType: "DIESEL", odo: 36800, liters: 68.0, price: 44.7, card: "BP-7201", invRef: "BP-2026-7201", invL: 68.0, station: "BP Beşiktaş" },
      { id: "f5-fuel-22", veh: "f5-veh-03", drv: "f5-drv-03", daysAgo: 31, fuelType: "DIESEL", odo: 39200, liters: 273.6, price: 45.0, card: "BP-7201", invRef: "BP-2026-7202", invL: 273.6, station: "BP Zincirlikuyu", calc: 11.4 },
      { id: "f5-fuel-23", veh: "f5-veh-03", drv: "f5-drv-03", daysAgo: 2, fuelType: "DIESEL", odo: 41600, liters: 276.0, price: 45.2, card: "BP-7201", invRef: "BP-2026-7203", invL: 276.0, station: "BP İkitelli", calc: 11.5 },

      // 06 ANK 514 (f5-veh-05 — FRIGO_VAN Ankara)
      { id: "f5-fuel-24", veh: "f5-veh-05", drv: "f5-drv-05", daysAgo: 60, fuelType: "DIESEL", odo: 63200, liters: 72.0, price: 44.9, card: "OPET-0514", invRef: "OPT-ANK-61", invL: 72.0, station: "Opet Çankaya" },
      { id: "f5-fuel-25", veh: "f5-veh-05", drv: "f5-drv-05", daysAgo: 29, fuelType: "DIESEL", odo: 65500, liters: 280.6, price: 45.1, card: "OPET-0514", invRef: "OPT-ANK-62", invL: 280.6, station: "Opet OSTİM", calc: 12.2 },
      { id: "f5-fuel-26", veh: "f5-veh-05", drv: "f5-drv-05", daysAgo: 4, fuelType: "DIESEL", odo: 67800, liters: 278.3, price: 45.3, card: "OPET-0514", invRef: "OPT-ANK-63", invL: 278.3, station: "Opet Sincan", calc: 12.1 },

      // 35 IZM 309 & 16 BRS 218
      { id: "f5-fuel-27", veh: "f5-veh-06", drv: "f5-drv-06", daysAgo: 35, fuelType: "DIESEL", odo: 55800, liters: 65.0, price: 44.8, card: "PETROL-309", invRef: "PO-IZM-11", invL: 65.0, station: "PO Bornova" },
      { id: "f5-fuel-28", veh: "f5-veh-06", drv: "f5-drv-06", daysAgo: 5, fuelType: "DIESEL", odo: 58300, liters: 275.0, price: 45.1, card: "PETROL-309", invRef: "PO-IZM-12", invL: 275.0, station: "PO Alsancak", calc: 11.0 },
      { id: "f5-fuel-29", veh: "f5-veh-07", drv: "f5-drv-07", daysAgo: 33, fuelType: "DIESEL", odo: 48700, liters: 70.0, price: 44.8, card: "OPET-218", invRef: "OPT-BRS-21", invL: 70.0, station: "Opet Nilüfer" },
      { id: "f5-fuel-30", veh: "f5-veh-07", drv: "f5-drv-07", daysAgo: 4, fuelType: "DIESEL", odo: 51200, liters: 290.0, price: 45.1, card: "OPET-218", invRef: "OPT-BRS-22", invL: 290.0, station: "Opet Gemlik", calc: 11.6 },

      // Hybrid (34 SNR 205) + Petrol (34 SNR 209) + LPG (34 SNR 214, 06 ANK 882) — 4 yakıt tipi CO2 kıyaslaması için!
      { id: "f5-fuel-31", veh: "f5-veh-12", drv: "f5-drv-12", daysAgo: 36, fuelType: "HYBRID", odo: 16200, liters: 38.0, price: 43.9, card: "SHELL-205", invRef: "SHL-HYB-01", invL: 38.0, station: "Shell Levent" },
      { id: "f5-fuel-32", veh: "f5-veh-12", drv: "f5-drv-12", daysAgo: 6, fuelType: "HYBRID", odo: 18400, liters: 112.2, price: 44.2, card: "SHELL-205", invRef: "SHL-HYB-02", invL: 112.2, station: "Shell Beşiktaş", calc: 5.1 },
      { id: "f5-fuel-33", veh: "f5-veh-13", drv: "f5-drv-13", daysAgo: 32, fuelType: "PETROL", odo: 37100, liters: 45.0, price: 43.9, card: "OPET-209", invRef: "OPT-BEN-01", invL: 45.0, station: "Opet Şişli" },
      { id: "f5-fuel-34", veh: "f5-veh-13", drv: "f5-drv-13", daysAgo: 5, fuelType: "PETROL", odo: 39200, liters: 155.4, price: 44.2, card: "OPET-209", invRef: "OPT-BEN-02", invL: 155.4, station: "Opet Mecidiyeköy", calc: 7.4 },
      { id: "f5-fuel-35", veh: "f5-veh-14", drv: null, daysAgo: 25, fuelType: "LPG", odo: 120100, liters: 122.4, price: 24.5, card: "AYGAZ-214", invRef: "AYG-LPG-01", invL: 122.4, station: "Aygaz Ümraniye", calc: 10.2 },
      { id: "f5-fuel-36", veh: "f5-veh-17", drv: "f5-drv-15", daysAgo: 10, fuelType: "LPG", odo: 49200, liters: 115.2, price: 24.8, card: "AYGAZ-882", invRef: "AYG-ANK-01", invL: 115.2, station: "Aygaz Ankara", calc: 9.6 },
    ]

    for (const f of fuelSpec) {
      const totalAmountTry = Number((f.liters * f.price).toFixed(2))
      const invoiceAmountTry = Number((f.invL * f.price).toFixed(2))
      track("lojistikFuelLog", {
        id: f.id,
        vehicleId: f.veh,
        driverId: f.drv,
        fuelDate: daysAgoIso(f.daysAgo),
        fuelType: f.fuelType,
        odometerKm: f.odo,
        liters: f.liters,
        unitPriceTry: f.price,
        totalAmountTry,
        fullTank: true,
        stationName: f.station,
        fuelCardNo: f.card,
        invoiceRef: f.invRef,
        invoiceLiters: f.invL,
        invoiceAmountTry,
        source: "FUEL_CARD_IMPORT",
        calculatedLPer100Km: f.calc ?? 11.8,
        isAnomaly: Boolean(f.anomaly),
        anomalyNote: f.anomalyNote ?? null,
        financeId: null,
        createdAt: daysAgoIso(f.daysAgo),
        updatedAt: daysAgoIso(f.daysAgo),
      })
    }

    // 8. Yapılandırılabilir CO2 Katsayıları — UK DESNZ / DEFRA 2026 (Resmî, doğrulanmış; Türkiye'ye özgü değil dipnotu ile)
    const desnzUrl = "https://www.gov.uk/government/publications/greenhouse-gas-reporting-conversion-factors-2026"
    const co2FactorsSpec = [
      { id: "f5-co2-diesel", fuelType: "DIESEL", kgCo2ePerUnit: 2.58354, notes: "UK DESNZ / DEFRA 2026 Dizel (average biofuel blend) Scope 1 litre katsayısı." },
      { id: "f5-co2-petrol", fuelType: "PETROL", kgCo2ePerUnit: 2.07500, notes: "UK DESNZ / DEFRA 2026 Benzin (average biofuel blend) Scope 1 litre katsayısı." },
      { id: "f5-co2-lpg", fuelType: "LPG", kgCo2ePerUnit: 1.55713, notes: "UK DESNZ / DEFRA 2026 LPG (Litre) Scope 1 katsayısı." },
      { id: "f5-co2-hybrid", fuelType: "HYBRID", kgCo2ePerUnit: 2.07500, notes: "Benzinli hibrit araçlar için DESNZ/DEFRA 2026 Benzin katsayısı esas alınır." },
    ]
    for (const c of co2FactorsSpec) {
      track("lojistikCo2EmissionFactor", {
        id: c.id,
        fuelType: c.fuelType,
        unit: "L",
        kgCo2ePerUnit: c.kgCo2ePerUnit,
        sourceName: "UK DESNZ / DEFRA Greenhouse Gas Reporting Conversion Factors",
        sourceYear: 2026,
        sourceVersion: "2026 v1.0 (Scope 1)",
        sourceUrl: desnzUrl,
        notes: c.notes,
        isActive: true,
        updatedBy: "local-debug-user",
        createdAt: daysAgoIso(10),
        updatedAt: daysAgoIso(10),
      })
    }

    // 9. Telematik Sağlayıcı Bağlantıları (Fiyat bilgisi YOK — sadece erişim şekli & resmî doküman URL)
    const connectionsSpec = [
      {
        id: "f5-tconn-traccar",
        providerCode: "TRACCAR",
        displayName: "Traccar (REST API & Webhook)",
        mode: "DEMO_DB",
        authType: "BEARER",
        docsUrl: "https://www.traccar.org/api-ref/",
        notes: "Demo ortamında olaylar yerel DB'den okunur; canlı hesapla test EDİLMEDİ.",
      },
      {
        id: "f5-tconn-flespi",
        providerCode: "FLESPI",
        displayName: "flespi (Gurtam Telematics Hub)",
        mode: "DEMO_DB",
        authType: "HEADER_TOKEN",
        docsUrl: "https://flespi.com/kb/how-to-get-flespi-token",
        notes: "Demo ortamında olaylar yerel DB'den okunur; canlı hesapla test EDİLMEDİ.",
      },
      {
        id: "f5-tconn-gpsgate",
        providerCode: "GPSGATE_CLOUD",
        displayName: "GpsGate Cloud (REST API & Event Webhook)",
        mode: "DEMO_DB",
        authType: "API_KEY",
        docsUrl: "https://support.gpsgate.com/hc/en-us/articles/360000838999-REST-API-documentation",
        notes: "Demo ortamında olaylar yerel DB'den okunur; canlı hesapla test EDİLMEDİ.",
      },
      {
        id: "f5-tconn-generic",
        providerCode: "GENERIC_WEBHOOK",
        displayName: "Genel Webhook / CSV-JSON İçe Aktarma",
        mode: "DEMO_DB",
        authType: "HMAC_SHA256",
        docsUrl: "https://developer.mozilla.org/en-US/docs/Web/API/Web_Crypto_API",
        notes: "Türkiye/yerel araç takip cihazlarından JSON webhook veya CSV içe aktarma adaptörü.",
      },
    ]
    for (const tc of connectionsSpec) {
      track("lojistikTelematicConnection", {
        id: tc.id,
        providerCode: tc.providerCode,
        displayName: tc.displayName,
        mode: tc.mode,
        authType: tc.authType,
        baseUrl: null,
        isEnabled: true,
        status: "DEMO_READY",
        lastEventAt: hoursAgoIso(0.25),
        lastSyncAt: hoursAgoIso(0.25),
        fieldMappingJson: null,
        docsUrl: tc.docsUrl,
        docsAccessDate: "2026-11-16",
        notes: tc.notes,
        createdAt: daysAgoIso(30),
        updatedAt: hoursAgoIso(0.25),
      })
    }

    // 10. Plaka/VIN <-> Sağlayıcı Cihaz ID Eşleme Tablosu
    const mapsSpec = [
      { id: "f5-tmap-01", veh: "f5-veh-01", provider: "TRACCAR", devId: "traccar-dev-808", plate: "34 SNR 808", vin: "WF0XXXTTGXRL80801" },
      { id: "f5-tmap-02", veh: "f5-veh-02", provider: "FLESPI", devId: "flespi-402", plate: "34 LJS 402", vin: "ZCFC35A200540202" },
      { id: "f5-tmap-03", veh: "f5-veh-03", provider: "TRACCAR", devId: "traccar-dev-720", plate: "34 SNR 720", vin: "W1V9076331P72003" },
      { id: "f5-tmap-04", veh: "f5-veh-04", provider: "GPSGATE_CLOUD", devId: "gpsgate-412", plate: "34 SNR 412", vin: "VF1MA00016941204" },
      { id: "f5-tmap-05", veh: "f5-veh-05", provider: "FLESPI", devId: "flespi-514", plate: "06 ANK 514", vin: "WF0EXXTTGXNK51405" },
      { id: "f5-tmap-06", veh: "f5-veh-06", provider: "TRACCAR", devId: "traccar-dev-309", plate: "35 IZM 309", vin: "ZFA2500000230906" },
      { id: "f5-tmap-07", veh: "f5-veh-07", provider: "GENERIC_WEBHOOK", devId: "gen-218", plate: "16 BRS 218", vin: "VF3YDBPFC1221807" },
      { id: "f5-tmap-08", veh: "f5-veh-08", provider: "TRACCAR", devId: "traccar-dev-915", plate: "34 SNR 915", vin: "JALNPR75L7791508" },
      { id: "f5-tmap-09", veh: "f5-veh-11", provider: "GPSGATE_CLOUD", devId: "gpsgate-118", plate: "34 SNR 118", vin: "WV1ZZZSYZN911811" },
      { id: "f5-tmap-10", veh: "f5-veh-15", provider: "FLESPI", devId: "flespi-510", plate: "34 SNR 510", vin: "TYAFB83S00151015" },
    ]
    for (const m of mapsSpec) {
      track("lojistikVehicleTelematicMap", {
        id: m.id,
        vehicleId: m.veh,
        providerCode: m.provider,
        externalDeviceId: m.devId,
        externalVehicleRef: m.plate,
        plateSnapshot: m.plate,
        vinSnapshot: m.vin,
        isActive: true,
        lastSeenAt: hoursAgoIso(0.5),
        createdAt: daysAgoIso(30),
        updatedAt: hoursAgoIso(0.5),
      })
    }

    // 11. Son 48 Saat Telematik İz & İhlal Olayları (48 olay)
    const tevSpec: Array<{
      id: string; veh: string; drv: string | null; provider: string; devId: string;
      type: string; hoursAgo: number; lat: number; lng: number; spd: number; hdg: number;
      ign: boolean; odo: number; fuelL?: number; tempC?: number; idle?: number
    }> = [
      // 34 SNR 808 (Levent -> TEM -> Tuzla -> Gebze -> Dilovası koridoru, 10 nokta)
      { id: "f5-tev-01", veh: "f5-veh-01", drv: "f5-drv-01", provider: "TRACCAR", devId: "traccar-dev-808", type: "IGNITION_ON", hoursAgo: 46, lat: 41.0785, lng: 29.0112, spd: 0, hdg: 90, ign: true, odo: 83960, fuelL: 78, tempC: 3.1 },
      { id: "f5-tev-02", veh: "f5-veh-01", drv: "f5-drv-01", provider: "TRACCAR", devId: "traccar-dev-808", type: "POSITION", hoursAgo: 40, lat: 41.0450, lng: 29.1050, spd: 64, hdg: 120, ign: true, odo: 83995, tempC: 3.2 },
      { id: "f5-tev-03", veh: "f5-veh-01", drv: "f5-drv-01", provider: "TRACCAR", devId: "traccar-dev-808", type: "POSITION", hoursAgo: 34, lat: 40.9850, lng: 29.2180, spd: 72, hdg: 125, ign: true, odo: 84035, tempC: 3.3 },
      { id: "f5-tev-04", veh: "f5-veh-01", drv: "f5-drv-01", provider: "TRACCAR", devId: "traccar-dev-808", type: "IDLE_ALERT", hoursAgo: 28, lat: 40.8920, lng: 29.3100, spd: 0, hdg: 130, ign: true, odo: 84080, idle: 14, tempC: 3.5 },
      { id: "f5-tev-05", veh: "f5-veh-01", drv: "f5-drv-01", provider: "TRACCAR", devId: "traccar-dev-808", type: "POSITION", hoursAgo: 20, lat: 40.8310, lng: 29.4050, spd: 70, hdg: 115, ign: true, odo: 84130, tempC: 3.4 },
      { id: "f5-tev-06", veh: "f5-veh-01", drv: "f5-drv-01", provider: "TRACCAR", devId: "traccar-dev-808", type: "FUEL_LEVEL", hoursAgo: 12, lat: 40.8080, lng: 29.4610, spd: 58, hdg: 110, ign: true, odo: 84175, fuelL: 52, tempC: 3.4 },
      { id: "f5-tev-07", veh: "f5-veh-01", drv: "f5-drv-01", provider: "TRACCAR", devId: "traccar-dev-808", type: "POSITION", hoursAgo: 5, lat: 40.7940, lng: 29.5010, spd: 66, hdg: 122, ign: true, odo: 84215, tempC: 3.3 },
      { id: "f5-tev-08", veh: "f5-veh-01", drv: "f5-drv-01", provider: "TRACCAR", devId: "traccar-dev-808", type: "POSITION", hoursAgo: 0.4, lat: 40.7852, lng: 29.5320, spd: 68, hdg: 118, ign: true, odo: 84250, fuelL: 46, tempC: 3.4 },

      // 34 LJS 402 (Kadıköy -> Ataşehir -> Kurtköy -> Kartal)
      { id: "f5-tev-09", veh: "f5-veh-02", drv: "f5-drv-02", provider: "FLESPI", devId: "flespi-402", type: "IGNITION_ON", hoursAgo: 44, lat: 40.9860, lng: 29.0290, spd: 0, hdg: 80, ign: true, odo: 112120 },
      { id: "f5-tev-10", veh: "f5-veh-02", drv: "f5-drv-02", provider: "FLESPI", devId: "flespi-402", type: "POSITION", hoursAgo: 35, lat: 40.9720, lng: 29.1520, spd: 56, hdg: 95, ign: true, odo: 112180 },
      { id: "f5-tev-11", veh: "f5-veh-02", drv: "f5-drv-02", provider: "FLESPI", devId: "flespi-402", type: "POSITION", hoursAgo: 24, lat: 40.9310, lng: 29.2610, spd: 62, hdg: 110, ign: true, odo: 112250 },
      { id: "f5-tev-12", veh: "f5-veh-02", drv: "f5-drv-02", provider: "FLESPI", devId: "flespi-402", type: "HARSH_BRAKE", hoursAgo: 14, lat: 40.9080, lng: 29.2110, spd: 18, hdg: 270, ign: true, odo: 112310 },
      { id: "f5-tev-13", veh: "f5-veh-02", drv: "f5-drv-02", provider: "FLESPI", devId: "flespi-402", type: "POSITION", hoursAgo: 6, lat: 40.9550, lng: 29.1640, spd: 49, hdg: 300, ign: true, odo: 112360 },
      { id: "f5-tev-14", veh: "f5-veh-02", drv: "f5-drv-02", provider: "FLESPI", devId: "flespi-402", type: "POSITION", hoursAgo: 0.5, lat: 40.9923, lng: 29.1244, spd: 52, hdg: 245, ign: true, odo: 112400 },

      // 34 SNR 720 (Levent -> Mecidiyeköy -> Beşiktaş -> İkitelli + TEMP_ALERT 7.4°C!)
      { id: "f5-tev-15", veh: "f5-veh-03", drv: "f5-drv-03", provider: "TRACCAR", devId: "traccar-dev-720", type: "IGNITION_ON", hoursAgo: 42, lat: 41.0785, lng: 29.0112, spd: 0, hdg: 200, ign: true, odo: 41350, tempC: 3.8 },
      { id: "f5-tev-16", veh: "f5-veh-03", drv: "f5-drv-03", provider: "TRACCAR", devId: "traccar-dev-720", type: "POSITION", hoursAgo: 30, lat: 41.0610, lng: 28.9720, spd: 48, hdg: 265, ign: true, odo: 41420, tempC: 4.1 },
      { id: "f5-tev-17", veh: "f5-veh-03", drv: "f5-drv-03", provider: "TRACCAR", devId: "traccar-dev-720", type: "POSITION", hoursAgo: 18, lat: 41.0710, lng: 28.8120, spd: 54, hdg: 280, ign: true, odo: 41490, tempC: 4.6 },
      { id: "f5-tev-18", veh: "f5-veh-03", drv: "f5-drv-03", provider: "TRACCAR", devId: "traccar-dev-720", type: "POSITION", hoursAgo: 8, lat: 41.0520, lng: 28.9120, spd: 42, hdg: 105, ign: true, odo: 41550, tempC: 5.9 },
      { id: "f5-tev-19", veh: "f5-veh-03", drv: "f5-drv-03", provider: "TRACCAR", devId: "traccar-dev-720", type: "TEMP_ALERT", hoursAgo: 1.2, lat: 41.0450, lng: 28.9850, spd: 38, hdg: 290, ign: true, odo: 41590, tempC: 7.4 },
      { id: "f5-tev-20", veh: "f5-veh-03", drv: "f5-drv-03", provider: "TRACCAR", devId: "traccar-dev-720", type: "POSITION", hoursAgo: 0.3, lat: 41.0422, lng: 29.0079, spd: 44, hdg: 295, ign: true, odo: 41600, tempC: 7.4 },

      // 34 SNR 412 (Ataşehir -> Ümraniye -> Dudullu: SPEED_VIOLATION, HARSH_ACCEL, IDLE_ALERT -> düşük eco puan!)
      { id: "f5-tev-21", veh: "f5-veh-04", drv: "f5-drv-04", provider: "GPSGATE_CLOUD", devId: "gpsgate-412", type: "IGNITION_ON", hoursAgo: 38, lat: 40.9920, lng: 29.1240, spd: 0, hdg: 45, ign: true, odo: 93210 },
      { id: "f5-tev-22", veh: "f5-veh-04", drv: "f5-drv-04", provider: "GPSGATE_CLOUD", devId: "gpsgate-412", type: "SPEED_VIOLATION", hoursAgo: 32, lat: 41.0050, lng: 29.1380, spd: 118, hdg: 60, ign: true, odo: 93255 },
      { id: "f5-tev-23", veh: "f5-veh-04", drv: "f5-drv-04", provider: "GPSGATE_CLOUD", devId: "gpsgate-412", type: "HARSH_ACCEL", hoursAgo: 26, lat: 41.0190, lng: 29.1590, spd: 86, hdg: 70, ign: true, odo: 93295 },
      { id: "f5-tev-24", veh: "f5-veh-04", drv: "f5-drv-04", provider: "GPSGATE_CLOUD", devId: "gpsgate-412", type: "HARSH_BRAKE", hoursAgo: 21, lat: 41.0280, lng: 29.1810, spd: 22, hdg: 190, ign: true, odo: 93330 },
      { id: "f5-tev-25", veh: "f5-veh-04", drv: "f5-drv-04", provider: "GPSGATE_CLOUD", devId: "gpsgate-412", type: "IDLE_ALERT", hoursAgo: 15, lat: 41.0150, lng: 29.1640, spd: 0, hdg: 180, ign: true, odo: 93355, idle: 42 },
      { id: "f5-tev-26", veh: "f5-veh-04", drv: "f5-drv-04", provider: "GPSGATE_CLOUD", devId: "gpsgate-412", type: "SPEED_VIOLATION", hoursAgo: 9, lat: 41.0110, lng: 29.1520, spd: 114, hdg: 220, ign: true, odo: 93385 },
      { id: "f5-tev-27", veh: "f5-veh-04", drv: "f5-drv-04", provider: "GPSGATE_CLOUD", devId: "gpsgate-412", type: "IGNITION_OFF", hoursAgo: 2, lat: 41.0082, lng: 29.1489, spd: 0, hdg: 90, ign: false, odo: 93400 },

      // Ankara (06 ANK 514) 5 nokta
      { id: "f5-tev-28", veh: "f5-veh-05", drv: "f5-drv-05", provider: "FLESPI", devId: "flespi-514", type: "IGNITION_ON", hoursAgo: 36, lat: 39.9010, lng: 32.8610, spd: 0, hdg: 340, ign: true, odo: 67620, tempC: 4.0 },
      { id: "f5-tev-29", veh: "f5-veh-05", drv: "f5-drv-05", provider: "FLESPI", devId: "flespi-514", type: "POSITION", hoursAgo: 24, lat: 39.9480, lng: 32.7850, spd: 61, hdg: 310, ign: true, odo: 67690, tempC: 4.1 },
      { id: "f5-tev-30", veh: "f5-veh-05", drv: "f5-drv-05", provider: "FLESPI", devId: "flespi-514", type: "POSITION", hoursAgo: 12, lat: 39.9610, lng: 32.6810, spd: 68, hdg: 280, ign: true, odo: 67745, tempC: 4.2 },
      { id: "f5-tev-31", veh: "f5-veh-05", drv: "f5-drv-05", provider: "FLESPI", devId: "flespi-514", type: "POSITION", hoursAgo: 4, lat: 39.9350, lng: 32.7900, spd: 55, hdg: 110, ign: true, odo: 67780, tempC: 4.0 },
      { id: "f5-tev-32", veh: "f5-veh-05", drv: "f5-drv-05", provider: "FLESPI", devId: "flespi-514", type: "POSITION", hoursAgo: 0.4, lat: 39.9208, lng: 32.8541, spd: 59, hdg: 35, ign: true, odo: 67800, tempC: 4.1 },

      // İzmir (35 IZM 309) 4 nokta
      { id: "f5-tev-33", veh: "f5-veh-06", drv: "f5-drv-06", provider: "TRACCAR", devId: "traccar-dev-309", type: "IGNITION_ON", hoursAgo: 32, lat: 38.4310, lng: 27.1450, spd: 0, hdg: 90, ign: true, odo: 58180 },
      { id: "f5-tev-34", veh: "f5-veh-06", drv: "f5-drv-06", provider: "TRACCAR", devId: "traccar-dev-309", type: "POSITION", hoursAgo: 20, lat: 38.4580, lng: 27.2110, spd: 54, hdg: 75, ign: true, odo: 58230 },
      { id: "f5-tev-35", veh: "f5-veh-06", drv: "f5-drv-06", provider: "TRACCAR", devId: "traccar-dev-309", type: "POSITION", hoursAgo: 10, lat: 38.4410, lng: 27.1750, spd: 46, hdg: 230, ign: true, odo: 58275 },
      { id: "f5-tev-36", veh: "f5-veh-06", drv: "f5-drv-06", provider: "TRACCAR", devId: "traccar-dev-309", type: "IGNITION_OFF", hoursAgo: 3, lat: 38.4192, lng: 27.1287, spd: 0, hdg: 180, ign: false, odo: 58300 },

      // Bursa (16 BRS 218) 4 nokta
      { id: "f5-tev-37", veh: "f5-veh-07", drv: "f5-drv-07", provider: "GENERIC_WEBHOOK", devId: "gen-218", type: "IGNITION_ON", hoursAgo: 28, lat: 40.2140, lng: 28.9850, spd: 0, hdg: 80, ign: true, odo: 51040, tempC: 3.7 },
      { id: "f5-tev-38", veh: "f5-veh-07", drv: "f5-drv-07", provider: "GENERIC_WEBHOOK", devId: "gen-218", type: "POSITION", hoursAgo: 16, lat: 40.3120, lng: 29.0940, spd: 74, hdg: 40, ign: true, odo: 51110, tempC: 3.8 },
      { id: "f5-tev-39", veh: "f5-veh-07", drv: "f5-drv-07", provider: "GENERIC_WEBHOOK", devId: "gen-218", type: "POSITION", hoursAgo: 6, lat: 40.2410, lng: 29.0820, spd: 58, hdg: 200, ign: true, odo: 51165, tempC: 3.9 },
      { id: "f5-tev-40", veh: "f5-veh-07", drv: "f5-drv-07", provider: "GENERIC_WEBHOOK", devId: "gen-218", type: "POSITION", hoursAgo: 0.5, lat: 40.1885, lng: 29.0610, spd: 62, hdg: 20, ign: true, odo: 51200, tempC: 3.9 },

      // İstanbul ek saha izleri (f5-veh-11, f5-veh-15, f5-veh-09, f5-veh-10)
      { id: "f5-tev-41", veh: "f5-veh-11", drv: "f5-drv-11", provider: "GPSGATE_CLOUD", devId: "gpsgate-118", type: "POSITION", hoursAgo: 8, lat: 40.9710, lng: 29.0680, spd: 44, hdg: 310, ign: true, odo: 79040 },
      { id: "f5-tev-42", veh: "f5-veh-11", drv: "f5-drv-11", provider: "GPSGATE_CLOUD", devId: "gpsgate-118", type: "POSITION", hoursAgo: 0.6, lat: 40.9875, lng: 29.0355, spd: 47, hdg: 315, ign: true, odo: 79100 },
      { id: "f5-tev-43", veh: "f5-veh-15", drv: "f5-drv-14", provider: "FLESPI", devId: "flespi-510", type: "POSITION", hoursAgo: 10, lat: 40.9120, lng: 29.2980, spd: 69, hdg: 112, ign: true, odo: 136720 },
      { id: "f5-tev-44", veh: "f5-veh-15", drv: "f5-drv-14", provider: "FLESPI", devId: "flespi-510", type: "POSITION", hoursAgo: 0.4, lat: 40.8712, lng: 29.3810, spd: 71, hdg: 105, ign: true, odo: 136800 },
      { id: "f5-tev-45", veh: "f5-veh-08", drv: "f5-drv-08", provider: "TRACCAR", devId: "traccar-dev-915", type: "IGNITION_OFF", hoursAgo: 18, lat: 41.0715, lng: 28.9891, spd: 0, hdg: 0, ign: false, odo: 148900 },
      { id: "f5-tev-46", veh: "f5-veh-09", drv: "f5-drv-09", provider: "FLESPI", devId: "flespi-622", type: "IGNITION_OFF", hoursAgo: 5, lat: 41.0289, lng: 29.1180, spd: 0, hdg: 45, ign: false, odo: 28400 },
      { id: "f5-tev-47", veh: "f5-veh-10", drv: "f5-drv-10", provider: "TRACCAR", devId: "traccar-dev-304", type: "IGNITION_OFF", hoursAgo: 7, lat: 41.0845, lng: 29.0124, spd: 0, hdg: 130, ign: false, odo: 63500 },
      { id: "f5-tev-48", veh: "f5-veh-16", drv: null, provider: "GENERIC_WEBHOOK", devId: "gen-640", type: "IGNITION_OFF", hoursAgo: 4, lat: 41.0501, lng: 29.0694, spd: 0, hdg: 15, ign: false, odo: 44900, tempC: 3.8 },
    ]

    for (const e of tevSpec) {
      track("lojistikTelemetryEvent", {
        id: e.id,
        vehicleId: e.veh,
        driverId: e.drv,
        providerCode: e.provider,
        externalDeviceId: e.devId,
        sourceOrigin: "DEMO_DB",
        idempotencyKey: `seed-${e.id}`,
        eventType: e.type,
        eventTime: hoursAgoIso(e.hoursAgo),
        receivedAt: hoursAgoIso(e.hoursAgo),
        isBackfill: false,
        lat: e.lat,
        lng: e.lng,
        speedKmh: e.spd,
        headingDeg: e.hdg,
        ignitionOn: e.ign,
        fuelLevelLiters: e.fuelL ?? null,
        fuelLevelPct: null,
        odometerKm: e.odo,
        temperatureC: e.tempC ?? null,
        idleMinutes: e.idle ?? 0,
        rawPayloadJson: JSON.stringify({ seeded: true, eventType: e.type, plateRef: e.devId }),
        createdAt: hoursAgoIso(e.hoursAgo),
      })
    }

    // 12. Örnek Telematik Hata Günlüğü
    track("lojistikTelematicErrorLog", {
      id: "f5-terr-01",
      providerCode: "TRACCAR",
      externalDeviceId: "unmapped-dev-991",
      eventType: "POSITION",
      errorCode: "UNMAPPED_DEVICE",
      errorMessage: "Eşlenmemiş cihaz kimliği (unmapped-dev-991) için araç eşlemesi bulunamadı.",
      rawPayloadJson: JSON.stringify({ deviceId: "unmapped-dev-991", lat: 41.01, lng: 29.02 }),
      createdAt: hoursAgoIso(19),
    })
    track("lojistikTelematicErrorLog", {
      id: "f5-terr-02",
      providerCode: "GENERIC_WEBHOOK",
      externalDeviceId: "gen-test-00",
      eventType: "POSITION",
      errorCode: "INVALID_COORDINATES",
      errorMessage: "Geçersiz GPS koordinat aralığı atlandı (lat: 0, lng: 0).",
      rawPayloadJson: JSON.stringify({ deviceId: "gen-test-00", lat: 0, lng: 0 }),
      createdAt: daysAgoIso(2),
    })

    // 13. Filo Muhasebe / Finance Kayıtları (Araç & Filo Maliyet Kategorileri ile)
    const finSpec = [
      { id: "f5-fin-01", veh: "f5-veh-01", fcat: "FUEL", cat: "Araç & Yakıt", amount: 14399.0, daysAgo: 3, desc: "34 SNR 808 aylık motorin yakıt mutabakatı (OPT-2026-1102)" },
      { id: "f5-fin-02", veh: "f5-veh-04", fcat: "FUEL", cat: "Araç & Yakıt", amount: 9944.0, daysAgo: 3, desc: "34 SNR 412 kart yakıt alımı — anormal tüketim inceleniyor" },
      { id: "f5-fin-03", veh: "f5-veh-02", fcat: "LEASE", cat: "Araç & Yakıt", amount: 34500.0, daysAgo: 8, desc: "34 LJS 402 aylık filo kiralama faturası (Hedef Filo)" },
      { id: "f5-fin-04", veh: "f5-veh-04", fcat: "LEASE", cat: "Araç & Yakıt", amount: 28900.0, daysAgo: 8, desc: "34 SNR 412 aylık leasing bedeli (ALD Automotive)" },
      { id: "f5-fin-05", veh: "f5-veh-15", fcat: "MAINTENANCE", cat: "Bakım Onarım", amount: 30800.0, daysAgo: 88, desc: "34 SNR 510 arka aks 4 lastik değişimi & balans (FBK-2026-073)" },
      { id: "f5-fin-06", veh: "f5-veh-07", fcat: "MAINTENANCE", cat: "Bakım Onarım", amount: 6400.0, daysAgo: 54, desc: "16 BRS 218 45.000 km periyodik bakım (FBK-2026-089)" },
      { id: "f5-fin-07", veh: "f5-veh-01", fcat: "INSURANCE_TAX", cat: "Sigorta", amount: 34200.0, daysAgo: 180, desc: "34 SNR 808 Kasko poliçe bedeli" },
      { id: "f5-fin-08", veh: "f5-veh-10", fcat: "INSURANCE_TAX", cat: "Vergi & Harç", amount: 9180.0, daysAgo: 120, desc: "34 SNR 304 MTV taksiti" },
      { id: "f5-fin-09", veh: "f5-veh-01", fcat: "PENALTY", cat: "Vergi & Harç", amount: 1380.0, daysAgo: 37, desc: "CEZA-2026-0388 erken ödeme (34 SNR 808)" },
      { id: "f5-fin-10", veh: "f5-veh-11", fcat: "PENALTY", cat: "Vergi & Harç", amount: 1129.5, daysAgo: 60, desc: "CEZA-2026-0351 şoföre rücu ödeme (34 SNR 118)" },
    ]
    for (const fi of finSpec) {
      track("finance", {
        id: fi.id,
        branchId: "local-debug-branch",
        type: "EXPENSE",
        amount: fi.amount,
        category: fi.cat,
        description: fi.desc,
        vehicleId: fi.veh,
        driverId: null,
        fleetCostCategory: fi.fcat,
        receiptUrl: null,
        status: "approved",
        approvedBy: "Mali İşler Müdürü",
        date: daysAgoIso(fi.daysAgo),
        createdAt: daysAgoIso(fi.daysAgo),
        updatedAt: daysAgoIso(fi.daysAgo),
      })
    }

    const totalTargets = Object.values(
      faz5FleetAndTelematicsSeedModule.seededIdsByCollection
    ).reduce((sum, list) => sum + list.length, 0)
    const totalInserted = Object.values(inserted).reduce((sum, n) => sum + n, 0)

    return {
      moduleKey: "faz5_filo_ve_telematik",
      inserted,
      skippedExisting: Math.max(0, totalTargets - totalInserted),
      notes: [
        "18 araç (Marmara/Ankara/İzmir/Bursa, mevcut 34 SNR 808 / 34 LJS 402 / 34 SNR 720 plakalarıyla bağlı), 15 şoför ve 8 kiralama sözleşmesi eklendi.",
        "Süresi dolmuş (-6 gün) ve yaklaşan (7-18 gün) evraklar, psikoteknik/SRC uyarıları ve 6 trafik cezası eklendi.",
        "12 aylık yakıt fişleri (+110% anormal tüketimli 34 SNR 412 ve +8.5L fatura farkı), 12 bakım iş emri (InventoryItem yedek parçaları) ve yıpranmış 2.4mm lastik uyarısı eklendi.",
        "UK DESNZ/DEFRA 2026 CO2 katsayıları ve son 48 saate ait 48 telematik olayı (TRACCAR, FLESPI, GPSGATE_CLOUD, GENERIC_WEBHOOK) eklendi.",
      ],
    }
  },

  rollback(db) {
    const removed: Record<string, number> = {}
    removed.lojistikTelematicErrorLog = removeByIds(db.lojistikTelematicErrorLog, new Set(SEEDED_TERR_IDS))
    removed.lojistikTelemetryEvent = removeByIds(db.lojistikTelemetryEvent, new Set(SEEDED_TEV_IDS))
    removed.lojistikVehicleTelematicMap = removeByIds(db.lojistikVehicleTelematicMap, new Set(SEEDED_TMAP_IDS))
    removed.lojistikTelematicConnection = removeByIds(db.lojistikTelematicConnection, new Set(SEEDED_TCONN_IDS))
    removed.lojistikCo2EmissionFactor = removeByIds(db.lojistikCo2EmissionFactor, new Set(SEEDED_CO2_IDS))
    removed.lojistikFuelLog = removeByIds(db.lojistikFuelLog, new Set(SEEDED_FUEL_IDS))
    removed.lojistikVehicleTire = removeByIds(db.lojistikVehicleTire, new Set(SEEDED_TIRE_IDS))
    removed.lojistikVehicleFaultLog = removeByIds(db.lojistikVehicleFaultLog, new Set(SEEDED_FAULT_IDS))
    removed.lojistikVehicleMaintenanceChecklistResult = removeByIds(db.lojistikVehicleMaintenanceChecklistResult, new Set(SEEDED_MCHK_IDS))
    removed.lojistikVehicleMaintenanceSparePart = removeByIds(db.lojistikVehicleMaintenanceSparePart, new Set(SEEDED_MSP_IDS))
    removed.lojistikVehicleMaintenanceWorkOrder = removeByIds(db.lojistikVehicleMaintenanceWorkOrder, new Set(SEEDED_MWO_IDS))
    removed.lojistikVehicleMaintenancePlan = removeByIds(db.lojistikVehicleMaintenancePlan, new Set(SEEDED_MPLAN_IDS))
    removed.lojistikTrafficPenalty = removeByIds(db.lojistikTrafficPenalty, new Set(SEEDED_PENALTY_IDS))
    removed.lojistikVehicleDocument = removeByIds(db.lojistikVehicleDocument, new Set(SEEDED_DOC_IDS))
    removed.lojistikVehicleLease = removeByIds(db.lojistikVehicleLease, new Set(SEEDED_LEASE_IDS))
    removed.finance = removeByIds(db.finance, new Set(SEEDED_FINANCE_IDS))
    removed.lojistikDriver = removeByIds(db.lojistikDriver, new Set(SEEDED_DRIVER_IDS))
    removed.lojistikVehicle = removeByIds(db.lojistikVehicle, new Set(SEEDED_VEHICLE_IDS))
    return removed
  },
}
