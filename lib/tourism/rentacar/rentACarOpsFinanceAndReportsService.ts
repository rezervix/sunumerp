/**
 * Sunum ERP — Turizm Faz 2: Araç Kiralama (Rent-a-Car) Operasyon, Finans,
 * Ceza/HGS Eşleştirme, KABİS Hazırlık, Raporlama ve Bildirim Servisi
 *
 * Kapsam:
 * F) Teslim (DELIVERY) & İade (RETURN) Ekspertiz Formu, İki Form Karşılaştırması ve Fark Hesabı
 * G) Depozito ve Ek Ücretler (Yakıt farkı, Km aşımı, Gecikme, Hasar) -> Finance & EDocumentRecord Bağlantısı
 * H) Trafik Cezası (Filo LojistikTrafficPenalty) & HGS/OGS (TurizmRentTollPassLog) Plaka+Tarih Eşleştirme ve Müşteriye Yansıtma
 * I) KABİS Bildirim Hazırlık, Durum Yönetimi (Hazırlandı/Gönderildi-Manuel/Hatalı), Yeniden Deneme ve CSV/Excel/JSON Dışa Aktarma
 * J) Raporlar (Araç Doluluk, Gelir/Gider, Filo TCO ile Araç Başı Kârlılık, Sınıf Bazlı Gelir, İptal/No-Show, Ek Ücret) + XLSX/PDF
 * K) Bildirimler (Yaklaşan teslim/iade, geciken iade, bakım/belge çakışması, bekleyen depozito iadesi)
 */

import * as XLSX from "xlsx"
import { prisma } from "@/lib/db"
import { maskDocumentNo, maskTckn } from "@/lib/logistics/fleet/constantsAndHelpers"
import { DemoDbEDocumentProvider } from "@/lib/logistics/providers/efatura-irsaliye"
import {
  exportLogisticsReportToExcelBuffer,
  exportLogisticsReportToPdfBuffer,
} from "@/lib/logistics/reports/exportReports"
import type { LogisticsReportPayload } from "@/lib/logistics/reports/constantsAndHelpers"
import { createNotificationMany } from "@/lib/services/notificationService"
import { MAIN_COMPANY_ID } from "@/lib/tourism/constants"
import {
  applyCompanyScopeFilter as filterRecordsByCompanyScope,
  logTourismAudit,
  TourismDomainError,
} from "@/lib/tourism/security"
import type { TourismScopeContext } from "@/lib/tourism/types"
import {
  compareDeliveryAndReturnForms,
  doTimeIntervalsOverlap,
  RENT_CHARGE_ENTRY_TYPE_LABELS,
  resolveEffectiveVehicleClassId,
  type RentChargeEntryType,
} from "./constantsAndHelpers"
import { createRentACarAdapters } from "./providers"
import {
  canUserViewRenterKvkkPii,
  generateOrSignRentContract,
  getRentalAvailabilityGantt,
  getRentPolicyConfig,
  listExtraServices,
  listRentalCustomers,
  listRentalFleetVehicles,
  listTariffs,
  listVehicleClasses,
} from "./rentACarCoreService"

// ── I) KABİS Bildirim Hazırlık Yardımcıları ───────────────────────────────────

export async function prepareOrRefreshKabisRecord(
  input: {
    reservationId: string
    notificationType?: "KIRALAMA_ACILIS" | "KIRALAMA_KAPANIS" | "EK_SURUCU_BILDIRIMI"
    preparationStatusOverride?: "HAZIRLANDI" | "GONDERILDI_MANUEL" | "HATALI" | "EKSIK_VERI"
    lastErrorNote?: string | null
  },
  scope: TourismScopeContext
) {
  const dbAny = prisma as any
  const reservation = await dbAny.turizmRentReservation.findUnique({
    where: { id: input.reservationId },
    include: { vehicle: true, customer: true, contract: true },
  })
  if (!reservation) {
    throw new TourismDomainError("NOT_FOUND", "KABİS hazırlığı yapılacak rezervasyon bulunamadı.", 404)
  }

  const vehicle =
    reservation.vehicle ||
    (await dbAny.lojistikVehicle.findUnique({ where: { id: reservation.vehicleId } }))
  const customer =
    reservation.customer ||
    (await dbAny.customer.findUnique({ where: { id: reservation.customerId } }))
  const contract =
    reservation.contract ||
    (await dbAny.turizmRentContract
      .findUnique({ where: { reservationId: reservation.id } })
      .catch(() => null))

  const notificationType = input.notificationType || "KIRALAMA_ACILIS"
  const adapters = createRentACarAdapters()
  const validation = adapters.kabis.validateAndPrepare({
    plate: vehicle?.plate,
    vehicleVin: vehicle?.vin,
    renterFullName: customer?.name || customer?.company,
    renterNationality: customer?.nationality || "TR",
    renterTckn: customer?.tckn,
    renterPassportNo: customer?.passportNo,
    renterLicenseNo: customer?.driverLicenseNo,
    pickupAt: reservation.actualPickupAt || reservation.startAt,
    expectedReturnAt: reservation.endAt,
  })

  const allKabis = await dbAny.turizmRentKabisRecord.findMany({
    where: { reservationId: reservation.id },
  })
  const existing = allKabis.find((k: any) => k.notificationType === notificationType)

  const kabisRefNo =
    existing?.kabisRefNo ||
    `KBS-ARAC-${reservation.reservationNo.replace(/^RNT-/, "")}-${notificationType === "KIRALAMA_KAPANIS"
      ? "KPN"
      : notificationType === "EK_SURUCU_BILDIRIMI"
        ? "EKS"
        : "ACL"
    }`

  const preparedPayload = {
    kabisRefNo,
    notificationType,
    plate: vehicle?.plate || "-",
    vehicleVin: vehicle?.vin || null,
    renterFullName: customer?.name || customer?.company || "Kiracı",
    renterNationality: customer?.nationality || "TR",
    renterTcknMasked: maskTckn(customer?.tckn),
    renterPassportMasked: maskDocumentNo(customer?.passportNo),
    renterLicenseNoMasked: maskDocumentNo(customer?.driverLicenseNo),
    additionalDriverFullName: reservation.additionalDriverName || null,
    pickupAt: new Date(reservation.actualPickupAt || reservation.startAt).toISOString(),
    expectedReturnAt: new Date(reservation.endAt).toISOString(),
    actualReturnAt: reservation.actualReturnAt
      ? new Date(reservation.actualReturnAt).toISOString()
      : null,
  }

  const finalStatus = input.preparationStatusOverride || validation.preparationStatus

  const payload = {
    kabisRefNo,
    reservationId: reservation.id,
    contractId: contract?.id || null,
    vehicleId: reservation.vehicleId,
    customerId: reservation.customerId,
    notificationType,
    plate: preparedPayload.plate,
    vehicleVin: preparedPayload.vehicleVin,
    renterFullName: preparedPayload.renterFullName,
    renterTcknMasked: preparedPayload.renterTcknMasked,
    renterPassportMasked: preparedPayload.renterPassportMasked,
    renterNationality: preparedPayload.renterNationality,
    renterLicenseNoMasked: preparedPayload.renterLicenseNoMasked,
    additionalDriverFullName: preparedPayload.additionalDriverFullName,
    pickupAt: new Date(preparedPayload.pickupAt),
    expectedReturnAt: new Date(preparedPayload.expectedReturnAt),
    actualReturnAt: preparedPayload.actualReturnAt ? new Date(preparedPayload.actualReturnAt) : null,
    missingFieldsJson: JSON.stringify(validation.missingFields),
    isPayloadComplete: validation.isComplete,
    preparationStatus: finalStatus,
    retryCount: existing ? Number(existing.retryCount || 0) + 1 : 0,
    lastErrorNote:
      input.lastErrorNote !== undefined
        ? input.lastErrorNote
        : validation.isComplete
          ? null
          : `Eksik zorunlu alanlar: ${validation.missingFields.join(", ")}`,
    preparedPayloadJson: JSON.stringify(preparedPayload),
    notes: validation.adapterNote,
    ownerCompanyId: scope.effectiveCompanyId || MAIN_COMPANY_ID,
    updatedAt: new Date(),
  }

  const saved = existing
    ? await dbAny.turizmRentKabisRecord.update({ where: { id: existing.id }, data: payload })
    : await dbAny.turizmRentKabisRecord.create({
      data: {
        id: `trzm-rnt-kbs-${Date.now()}-${Math.random().toString(36).slice(2, 5)}`,
        ...payload,
        createdAt: new Date(),
      },
    })

  await logTourismAudit({
    userId: scope.userId,
    action: existing ? "REFRESH_KABIS_PREPARATION" : "PREPARE_KABIS_NOTIFICATION",
    resource: "turizm_rentacar",
    resourceId: saved.id,
    moduleKey: "turizm_rentacar",
    branchId: scope.branchId,
    companyId: scope.effectiveCompanyId,
    metadata: {
      kabisRefNo: saved.kabisRefNo,
      notificationType: saved.notificationType,
      preparationStatus: saved.preparationStatus,
    },
  })

  return saved
}

export async function updateKabisRecordStatus(
  input: {
    kabisId: string
    preparationStatus: "HAZIRLANDI" | "GONDERILDI_MANUEL" | "HATALI" | "EKSIK_VERI"
    exportedFormat?: "CSV" | "EXCEL" | "JSON_PAKET"
    lastErrorNote?: string | null
  },
  scope: TourismScopeContext
) {
  const dbAny = prisma as any
  const rec = await dbAny.turizmRentKabisRecord.findUnique({ where: { id: input.kabisId } })
  if (!rec) {
    throw new TourismDomainError("NOT_FOUND", "KABİS hazırlık kaydı bulunamadı.", 404)
  }

  const updated = await dbAny.turizmRentKabisRecord.update({
    where: { id: rec.id },
    data: {
      preparationStatus: input.preparationStatus,
      exportedFormat: input.exportedFormat || rec.exportedFormat || null,
      lastExportedAt:
        input.preparationStatus === "GONDERILDI_MANUEL" || input.exportedFormat
          ? new Date()
          : rec.lastExportedAt,
      retryCount: Number(rec.retryCount || 0) + 1,
      lastErrorNote: input.lastErrorNote !== undefined ? input.lastErrorNote : rec.lastErrorNote,
      updatedAt: new Date(),
    },
  })

  await logTourismAudit({
    userId: scope.userId,
    action: "UPDATE_KABIS_STATUS",
    resource: "turizm_rentacar",
    resourceId: updated.id,
    moduleKey: "turizm_rentacar",
    branchId: scope.branchId,
    companyId: scope.effectiveCompanyId,
    metadata: {
      kabisRefNo: updated.kabisRefNo,
      preparationStatus: updated.preparationStatus,
    },
  })

  return updated
}

export async function exportKabisRecordsPackage(
  input: {
    format: "CSV" | "EXCEL" | "JSON_PAKET"
    statusFilter?: string
    markAsManualExported?: boolean
  },
  scope: TourismScopeContext
) {
  const dbAny = prisma as any
  let records = await dbAny.turizmRentKabisRecord.findMany()
  records = filterRecordsByCompanyScope(records, scope)
  if (input.statusFilter) {
    records = records.filter((r: any) => r.preparationStatus === input.statusFilter)
  }

  const adapters = createRentACarAdapters()
  const payloads = records.map((r: any) => ({
    kabisRefNo: r.kabisRefNo,
    notificationType: r.notificationType,
    plate: r.plate,
    vehicleVin: r.vehicleVin || null,
    renterFullName: r.renterFullName,
    renterNationality: r.renterNationality || "TR",
    renterTcknMasked: r.renterTcknMasked || null,
    renterPassportMasked: r.renterPassportMasked || null,
    renterLicenseNoMasked: r.renterLicenseNoMasked || null,
    additionalDriverFullName: r.additionalDriverFullName || null,
    pickupAt: new Date(r.pickupAt).toISOString(),
    expectedReturnAt: new Date(r.expectedReturnAt).toISOString(),
    actualReturnAt: r.actualReturnAt ? new Date(r.actualReturnAt).toISOString() : null,
  }))

  const now = new Date()
  if (input.markAsManualExported) {
    for (const rec of records) {
      if (rec.isPayloadComplete && rec.preparationStatus === "HAZIRLANDI") {
        await dbAny.turizmRentKabisRecord.update({
          where: { id: rec.id },
          data: {
            preparationStatus: "GONDERILDI_MANUEL",
            exportedFormat: input.format,
            lastExportedAt: now,
            updatedAt: now,
          },
        })
      }
    }
  }

  const csvText = adapters.kabis.formatCsvExport(payloads)

  return {
    exportedAt: now.toISOString(),
    format: input.format,
    recordCount: payloads.length,
    officialPortalRef: adapters.kabis.officialPortalRef,
    docsAccessDate: adapters.kabis.docsAccessDate,
    notice:
      "Resmî erişim/doküman ve Emniyet sabit IP yetkilendirmesi gerektiğinden paket kurum dışa aktarma formatında hazırlanmıştır; gerçek dış servis çağrısı yapılmaz.",
    csvText,
    records: payloads,
  }
}

// ── F) Teslim (DELIVERY) ve İade (RETURN) Ekspertiz Formu & Karşılaştırma ────

export async function submitVehicleHandoverInspection(
  input: {
    reservationId: string
    odometerKm: number
    fuelLevelPct: number
    exteriorConditionNote?: string
    interiorConditionNote?: string
    damageMarkers?: string[]
    damagePhotoUrls?: string[]
    customerSignatureUrl?: string | null
    staffSignatureUrl?: string | null
    signedByCustomerName?: string | null
    depositCollectedTry?: number
    capturedLat?: number | null
    capturedLng?: number | null
  },
  scope: TourismScopeContext
) {
  const dbAny = prisma as any
  const reservation = await dbAny.turizmRentReservation.findUnique({
    where: { id: input.reservationId },
    include: { vehicle: true, customer: true, contract: true },
  })
  if (!reservation) {
    throw new TourismDomainError("NOT_FOUND", "Teslim formu işlenecek rezervasyon bulunamadı.", 404)
  }

  const vehicle =
    reservation.vehicle ||
    (await dbAny.lojistikVehicle.findUnique({ where: { id: reservation.vehicleId } }))
  if (!vehicle) {
    throw new TourismDomainError("NOT_FOUND", "Teslim edilecek araç bulunamadı.", 404)
  }
  if (
    vehicle.status === "MAINTENANCE" ||
    vehicle.status === "FAULT" ||
    vehicle.status === "OUT_OF_SERVICE"
  ) {
    throw new TourismDomainError(
      "CONFLICT",
      `${vehicle.plate} plakalı araç bakımda/arızalı olduğu için müşteriye teslim edilemez.`,
      409
    )
  }

  // Sözleşme henüz üretilmediyse otomatik üret/imzala
  let contract = reservation.contract
  if (!contract) {
    contract = await generateOrSignRentContract(
      {
        reservationId: reservation.id,
        customerSignatureDataUrl: input.customerSignatureUrl || null,
        customerSignedByName: input.signedByCustomerName || reservation.customer?.name || null,
      },
      scope
    )
  }

  const odometerKm = Math.max(
    Number(vehicle.odometerKm || 0),
    Number(input.odometerKm || vehicle.odometerKm || 0)
  )
  const fuelLevelPct = Math.min(100, Math.max(0, Math.round(Number(input.fuelLevelPct ?? 100))))
  const fuelEighths = Math.round((fuelLevelPct / 100) * 8)
  const now = new Date()

  const existingForms = await dbAny.turizmRentInspectionForm.findMany({
    where: { reservationId: reservation.id },
  })
  const existingDelivery = existingForms.find((f: any) => f.formType === "DELIVERY")

  const formPayload = {
    formNo:
      existingDelivery?.formNo ||
      `TSL-${reservation.reservationNo.replace(/^RNT-/, "")}`,
    reservationId: reservation.id,
    contractId: contract?.id || null,
    vehicleId: vehicle.id,
    formType: "DELIVERY",
    odometerKm,
    fuelLevelPct,
    fuelEighths,
    exteriorConditionNote: input.exteriorConditionNote || "Çıkış ekspertizi tamamlandı.",
    interiorConditionNote: input.interiorConditionNote || "İç kabin temiz ve eksiksiz.",
    damageMarkersJson: JSON.stringify(input.damageMarkers || []),
    damagePhotoUrlsJson: JSON.stringify(input.damagePhotoUrls || []),
    hasNewDamage: false,
    estimatedDamageCostTry: 0,
    customerSignatureUrl: input.customerSignatureUrl || null,
    staffSignatureUrl: input.staffSignatureUrl || null,
    signedByCustomerName:
      input.signedByCustomerName || reservation.customer?.name || "Kiracı",
    inspectedByUserId: scope.userId,
    inspectedByName: scope.username,
    capturedLat: input.capturedLat ?? vehicle.currentLat ?? null,
    capturedLng: input.capturedLng ?? vehicle.currentLng ?? null,
    inspectedAt: now,
    ownerCompanyId: scope.effectiveCompanyId || MAIN_COMPANY_ID,
  }

  const savedForm = existingDelivery
    ? await dbAny.turizmRentInspectionForm.update({
      where: { id: existingDelivery.id },
      data: formPayload,
    })
    : await dbAny.turizmRentInspectionForm.create({
      data: {
        id: `trzm-rnt-insp-del-${Date.now()}-${Math.random().toString(36).slice(2, 5)}`,
        ...formPayload,
        createdAt: now,
      },
    })

  // Rezervasyonu ACTIVE (Kirada) yap, Filo aracını IN_TRANSIT / RENTED olarak güncelle
  await dbAny.turizmRentReservation.update({
    where: { id: reservation.id },
    data: {
      status: "ACTIVE",
      actualPickupAt: now,
      updatedAt: now,
    },
  })

  await dbAny.lojistikVehicle.update({
    where: { id: vehicle.id },
    data: {
      status: "IN_TRANSIT",
      rentalStatus: "RENTED",
      odometerKm,
      currentFuelPct: fuelLevelPct,
      isRentalPool: true,
      updatedAt: now,
    },
  })

  // Depozito tahsilatı kaydı oluştur
  const depositAmount = Number(
    input.depositCollectedTry ?? reservation.depositRequiredTry ?? 0
  )
  if (depositAmount > 0) {
    const existingCharges = await dbAny.turizmRentDepositAndCharge.findMany({
      where: { reservationId: reservation.id },
    })
    const hasDepositCollect = existingCharges.some(
      (c: any) => c.entryType === "DEPOSIT_COLLECT"
    )
    if (!hasDepositCollect) {
      await dbAny.turizmRentDepositAndCharge.create({
        data: {
          id: `trzm-rnt-chg-dep-${Date.now()}-${Math.random().toString(36).slice(2, 5)}`,
          entryNo: `DEP-TAH-${reservation.reservationNo.replace(/^RNT-/, "")}`,
          reservationId: reservation.id,
          contractId: contract?.id || null,
          vehicleId: vehicle.id,
          customerId: reservation.customerId,
          entryType: "DEPOSIT_COLLECT",
          status: "COLLECTED",
          quantity: 1,
          unitPriceTry: depositAmount,
          amountTry: depositAmount,
          vatRatePct: 0,
          totalWithVatTry: depositAmount,
          currency: "TRY",
          calculationRuleNote: "Araç tesliminde alınan güvence/depozito tutarı",
          settledAt: now,
          ownerCompanyId: scope.effectiveCompanyId || MAIN_COMPANY_ID,
          createdBy: scope.userId,
          createdAt: now,
          updatedAt: now,
        },
      })
    }
  }

  // KABİS Kiralama Açılış Bildirim Hazırlığını otomatik oluştur
  const kabisRecord = await prepareOrRefreshKabisRecord(
    {
      reservationId: reservation.id,
      notificationType: "KIRALAMA_ACILIS",
    },
    scope
  )

  await logTourismAudit({
    userId: scope.userId,
    action: "SUBMIT_VEHICLE_DELIVERY_FORM",
    resource: "turizm_rentacar",
    resourceId: savedForm.id,
    moduleKey: "turizm_rentacar",
    branchId: scope.branchId,
    companyId: scope.effectiveCompanyId,
    metadata: {
      formNo: savedForm.formNo,
      reservationNo: reservation.reservationNo,
      plate: vehicle.plate,
      odometerKm,
      fuelLevelPct,
    },
  })

  return {
    deliveryForm: savedForm,
    kabisRecord,
  }
}

export async function submitVehicleReturnInspection(
  input: {
    reservationId: string
    odometerKm: number
    fuelLevelPct: number
    actualReturnAt?: string | Date
    exteriorConditionNote?: string
    interiorConditionNote?: string
    damageMarkers?: string[]
    damagePhotoUrls?: string[]
    hasNewDamage?: boolean
    estimatedDamageCostTry?: number
    sendToMaintenance?: boolean
    customerSignatureUrl?: string | null
    staffSignatureUrl?: string | null
    signedByCustomerName?: string | null
    autoRefundRemainingDeposit?: boolean
  },
  scope: TourismScopeContext
) {
  const dbAny = prisma as any
  const reservation = await dbAny.turizmRentReservation.findUnique({
    where: { id: input.reservationId },
    include: { vehicle: true, vehicleClass: true, customer: true, contract: true },
  })
  if (!reservation) {
    throw new TourismDomainError("NOT_FOUND", "İade formu işlenecek rezervasyon bulunamadı.", 404)
  }

  const vehicle =
    reservation.vehicle ||
    (await dbAny.lojistikVehicle.findUnique({ where: { id: reservation.vehicleId } }))
  const vehicleClass =
    reservation.vehicleClass ||
    (await dbAny.turizmRentVehicleClass
      .findUnique({ where: { id: reservation.vehicleClassId } })
      .catch(() => null))
  const policy = await getRentPolicyConfig(reservation.branchId)

  const existingForms = await dbAny.turizmRentInspectionForm.findMany({
    where: { reservationId: reservation.id },
  })
  const deliveryForm = existingForms.find((f: any) => f.formType === "DELIVERY")
  const existingReturn = existingForms.find((f: any) => f.formType === "RETURN")

  let deliveryMarkers: string[] = []
  try {
    deliveryMarkers = deliveryForm?.damageMarkersJson
      ? JSON.parse(deliveryForm.damageMarkersJson)
      : []
  } catch {
    deliveryMarkers = []
  }

  const existingCharges = await dbAny.turizmRentDepositAndCharge.findMany({
    where: { reservationId: reservation.id },
  })
  const depositCollectEntry = existingCharges.find(
    (c: any) => c.entryType === "DEPOSIT_COLLECT" && c.status === "COLLECTED"
  )
  const depositCollectedTry = Number(
    depositCollectEntry?.amountTry ?? reservation.depositRequiredTry ?? 0
  )

  const actualReturnAt = input.actualReturnAt ? new Date(input.actualReturnAt) : new Date()
  const returnOdometerKm = Math.max(
    Number(deliveryForm?.odometerKm ?? vehicle?.odometerKm ?? 0),
    Number(input.odometerKm || 0)
  )
  const returnFuelPct = Math.min(100, Math.max(0, Math.round(Number(input.fuelLevelPct ?? 100))))

  // İki form karşılaştırması ve fark hesabı (ayarlanabilir kurallarla)
  const comparison = compareDeliveryAndReturnForms({
    deliveryOdometerKm: Number(deliveryForm?.odometerKm ?? vehicle?.odometerKm ?? 0),
    returnOdometerKm,
    deliveryFuelPct: Number(deliveryForm?.fuelLevelPct ?? 100),
    returnFuelPct,
    deliveryDamageMarkers: deliveryMarkers,
    returnDamageMarkers: input.damageMarkers || [],
    estimatedDamageCostTry: Number(input.estimatedDamageCostTry || 0),
    plannedEndAt: reservation.endAt,
    actualReturnAt,
    allowedTotalKm: Number(reservation.totalKmLimit || 250),
    extraKmRateTry: Number(
      reservation.extraKmRateTry ?? vehicleClass?.extraKmUnitPriceTry ?? 6.5
    ),
    dailyRateTry: Number(reservation.dailyRateTry || 2000),
    lateReturnHourlyTry: Number(vehicleClass?.lateReturnHourlyTry ?? 350),
    gracePeriodMinutes: Number(policy.gracePeriodMinutes ?? 60),
    lateHourToFullDayThreshold: Number(policy.lateHourToFullDayThreshold ?? 4),
    missingFuelRatePerPctTry: Number(
      vehicleClass?.missingFuelPricePerPctTry ?? policy.missingFuelRatePerPctTry ?? 32
    ),
    depositCollectedTry,
  })

  const hasNewDamage =
    Boolean(input.hasNewDamage) ||
    comparison.newDamageMarkers.length > 0 ||
    comparison.damageChargeTry > 0

  const returnFormPayload = {
    formNo:
      existingReturn?.formNo ||
      `IAD-${reservation.reservationNo.replace(/^RNT-/, "")}`,
    reservationId: reservation.id,
    contractId: reservation.contract?.id || null,
    vehicleId: reservation.vehicleId,
    formType: "RETURN",
    odometerKm: returnOdometerKm,
    fuelLevelPct: returnFuelPct,
    fuelEighths: Math.round((returnFuelPct / 100) * 8),
    exteriorConditionNote:
      input.exteriorConditionNote ||
      (hasNewDamage ? "İade ekspertizinde yeni hasar tespit edildi." : "Dış karoser hasarsız teslim alındı."),
    interiorConditionNote: input.interiorConditionNote || "İç kabin kontrol edildi.",
    damageMarkersJson: JSON.stringify(input.damageMarkers || []),
    damagePhotoUrlsJson: JSON.stringify(input.damagePhotoUrls || []),
    hasNewDamage,
    estimatedDamageCostTry: comparison.damageChargeTry,
    comparisonSummaryJson: JSON.stringify(comparison),
    customerSignatureUrl: input.customerSignatureUrl || null,
    staffSignatureUrl: input.staffSignatureUrl || null,
    signedByCustomerName:
      input.signedByCustomerName || reservation.customer?.name || "Kiracı",
    inspectedByUserId: scope.userId,
    inspectedByName: scope.username,
    inspectedAt: actualReturnAt,
    ownerCompanyId: scope.effectiveCompanyId || MAIN_COMPANY_ID,
  }

  const savedReturnForm = existingReturn
    ? await dbAny.turizmRentInspectionForm.update({
      where: { id: existingReturn.id },
      data: returnFormPayload,
    })
    : await dbAny.turizmRentInspectionForm.create({
      data: {
        id: `trzm-rnt-insp-ret-${Date.now()}-${Math.random().toString(36).slice(2, 5)}`,
        ...returnFormPayload,
        createdAt: actualReturnAt,
      },
    })

  // Ek ücret kalemlerini oluştur (Km aşımı, Yakıt farkı, Geç iade, Hasar, Depozito kesintisi/iadesi)
  const vatRatePct = Number(policy.defaultVatRatePct ?? 20)
  const createdChargeEntries: any[] = []

  const upsertReturnCharge = async (params: {
    entryType: RentChargeEntryType
    quantity: number
    unitPriceTry: number
    amountTry: number
    vatRate: number
    status: string
    ruleNote: string
  }) => {
    if (params.amountTry <= 0) return
    const totalWithVatTry = Number(
      (params.amountTry * (1 + params.vatRate / 100)).toFixed(2)
    )
    const entry = await dbAny.turizmRentDepositAndCharge.create({
      data: {
        id: `trzm-rnt-chg-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        entryNo: `EKU-${params.entryType.slice(0, 4)}-${String(Date.now()).slice(-5)}`,
        reservationId: reservation.id,
        contractId: reservation.contract?.id || null,
        vehicleId: reservation.vehicleId,
        customerId: reservation.customerId,
        entryType: params.entryType,
        status: params.status,
        quantity: params.quantity,
        unitPriceTry: params.unitPriceTry,
        amountTry: params.amountTry,
        vatRatePct: params.vatRate,
        totalWithVatTry,
        currency: "TRY",
        calculationRuleNote: params.ruleNote,
        settledAt: params.status === "COLLECTED" || params.status === "REFUNDED" ? actualReturnAt : null,
        ownerCompanyId: scope.effectiveCompanyId || MAIN_COMPANY_ID,
        createdBy: scope.userId,
        createdAt: actualReturnAt,
        updatedAt: actualReturnAt,
      },
    })
    createdChargeEntries.push(entry)
  }

  if (comparison.extraKmChargeTry > 0) {
    await upsertReturnCharge({
      entryType: "EXTRA_KM",
      quantity: comparison.excessKm,
      unitPriceTry: comparison.extraKmRateTry,
      amountTry: comparison.extraKmChargeTry,
      vatRate: vatRatePct,
      status: "COLLECTED",
      ruleNote: `Km aşımı: ${comparison.distanceDrivenKm} km kullanıldı (Limit: ${comparison.allowedKm} km, Aşım: ${comparison.excessKm} km x ${comparison.extraKmRateTry} TRY)`,
    })
  }

  if (comparison.fuelDifferenceChargeTry > 0) {
    await upsertReturnCharge({
      entryType: "FUEL_DIFFERENCE",
      quantity: comparison.missingFuelPct,
      unitPriceTry: comparison.missingFuelRatePerPctTry,
      amountTry: comparison.fuelDifferenceChargeTry,
      vatRate: vatRatePct,
      status: "COLLECTED",
      ruleNote: `Yakıt farkı: Çıkış %${comparison.deliveryFuelPct} -> Dönüş %${comparison.returnFuelPct} (%${comparison.missingFuelPct} eksik x ${comparison.missingFuelRatePerPctTry} TRY)`,
    })
  }

  if (comparison.lateReturnChargeTry > 0) {
    await upsertReturnCharge({
      entryType: "LATE_RETURN",
      quantity: comparison.billableLateHours,
      unitPriceTry: comparison.lateFullDayApplied
        ? Number(reservation.dailyRateTry || 0)
        : Number(vehicleClass?.lateReturnHourlyTry ?? 350),
      amountTry: comparison.lateReturnChargeTry,
      vatRate: vatRatePct,
      status: "COLLECTED",
      ruleNote: `Geç iade: ${comparison.lateMinutes} dk gecikme (${comparison.gracePeriodMinutes} dk hoşgörü sonrası ${comparison.billableLateHours} saat${comparison.lateFullDayApplied ? " -> tam gün tarifesi" : ""})`,
    })
  }

  if (comparison.damageChargeTry > 0) {
    await upsertReturnCharge({
      entryType: "DAMAGE_FEE",
      quantity: 1,
      unitPriceTry: comparison.damageChargeTry,
      amountTry: comparison.damageChargeTry,
      vatRate: vatRatePct,
      status: "COLLECTED",
      ruleNote: `Hasar ekspertiz bedeli (${comparison.newDamageMarkers.join(", ") || "Yeni hasar kaydı"})`,
    })
  }

  if (comparison.depositDeductionTry > 0) {
    await upsertReturnCharge({
      entryType: "DEPOSIT_DEDUCTION",
      quantity: 1,
      unitPriceTry: comparison.depositDeductionTry,
      amountTry: comparison.depositDeductionTry,
      vatRate: 0,
      status: "COLLECTED",
      ruleNote: `Depozitodan ek ücret mahsubu (${comparison.depositDeductionTry} TRY)`,
    })
  }

  if (comparison.netDepositRefundTry > 0) {
    await upsertReturnCharge({
      entryType: "DEPOSIT_REFUND",
      quantity: 1,
      unitPriceTry: comparison.netDepositRefundTry,
      amountTry: comparison.netDepositRefundTry,
      vatRate: 0,
      status: input.autoRefundRemainingDeposit ? "REFUNDED" : "REFUND_PENDING",
      ruleNote: `Kalan depozito iadesi (${comparison.depositCollectedTry} TRY - ${comparison.depositDeductionTry} TRY kesinti)`,
    })
  }

  const finalTotalTry = Number(
    (Number(reservation.totalEstimatedTry || 0) + comparison.totalExtraChargesTry).toFixed(2)
  )

  await dbAny.turizmRentReservation.update({
    where: { id: reservation.id },
    data: {
      status: "COMPLETED",
      actualReturnAt,
      finalTotalTry,
      updatedAt: actualReturnAt,
    },
  })

  if (reservation.contract) {
    await dbAny.turizmRentContract.update({
      where: { id: reservation.contract.id },
      data: {
        status: "CLOSED",
        updatedAt: actualReturnAt,
      },
    })
  }

  // Filo araç durumu senkronu: hasar/bakım işaretlendiyse MAINTENANCE, değilse ACTIVE / AVAILABLE
  if (vehicle) {
    const goMaint = Boolean(input.sendToMaintenance);
    await dbAny.lojistikVehicle.update({
      where: { id: vehicle.id },
      data: {
        status: goMaint ? "MAINTENANCE" : "ACTIVE",
        rentalStatus: goMaint ? "MAINTENANCE" : "AVAILABLE",
        odometerKm: returnOdometerKm,
        currentFuelPct: returnFuelPct,
        updatedAt: actualReturnAt,
      },
    })
  }

  // KABİS Kiralama Kapanış bildirim paketini otomatik hazırla
  const kabisClosing = await prepareOrRefreshKabisRecord(
    {
      reservationId: reservation.id,
      notificationType: "KIRALAMA_KAPANIS",
    },
    scope
  )

  // Faturalama zamanlaması ON_RETURN_COMPLETION ise otomatik cari (Finance) + E-Belge (EDocumentRecord) kes
  let invoiceResult = null
  if (policy.invoiceTimingMode === "ON_RETURN_COMPLETION") {
    invoiceResult = await issueRentalInvoiceAndFinanceEntry(
      { reservationId: reservation.id },
      scope
    )
  }

  await logTourismAudit({
    userId: scope.userId,
    action: "SUBMIT_VEHICLE_RETURN_FORM",
    resource: "turizm_rentacar",
    resourceId: savedReturnForm.id,
    moduleKey: "turizm_rentacar",
    branchId: scope.branchId,
    companyId: scope.effectiveCompanyId,
    metadata: {
      formNo: savedReturnForm.formNo,
      reservationNo: reservation.reservationNo,
      totalExtraChargesTry: comparison.totalExtraChargesTry,
      finalTotalTry,
    },
  })

  return {
    returnForm: savedReturnForm,
    comparison,
    createdChargeEntries,
    kabisClosing,
    invoiceResult,
  }
}

// ── G) Depozito, Ek Ücret, Cari (Finance) ve E-Belge (EDocumentRecord) ───────

export async function recordDepositOrExtraCharge(
  input: {
    reservationId: string
    entryType: RentChargeEntryType
    quantity?: number
    unitPriceTry: number
    vatRatePct?: number
    status?: string
    calculationRuleNote?: string
    notes?: string
    postToFinance?: boolean
  },
  scope: TourismScopeContext
) {
  const dbAny = prisma as any
  const reservation = await dbAny.turizmRentReservation.findUnique({
    where: { id: input.reservationId },
    include: { vehicle: true, customer: true, contract: true },
  })
  if (!reservation) {
    throw new TourismDomainError("NOT_FOUND", "Kayıt eklenecek rezervasyon bulunamadı.", 404)
  }

  const quantity = Math.max(0.1, Number(input.quantity ?? 1))
  const unitPriceTry = Math.max(0, Number(input.unitPriceTry || 0))
  const amountTry = Number((quantity * unitPriceTry).toFixed(2))
  const isDepositEntry = input.entryType.startsWith("DEPOSIT_")
  const vatRatePct = isDepositEntry ? 0 : Math.max(0, Number(input.vatRatePct ?? 20))
  const totalWithVatTry = Number((amountTry * (1 + vatRatePct / 100)).toFixed(2))
  const now = new Date()

  let financeId: string | null = null
  if (input.postToFinance && !isDepositEntry && amountTry > 0) {
    const fin = await dbAny.finance.create({
      data: {
        branchId: reservation.branchId || scope.branchId || "local-debug-branch",
        type: "INCOME",
        amount: totalWithVatTry,
        category: "Araç Kiralama Ek Ücret Geliri",
        description: `${reservation.vehicle?.plate || "Araç"} — ${RENT_CHARGE_ENTRY_TYPE_LABELS[input.entryType] || input.entryType
          } (${reservation.reservationNo})`,
        status: "approved",
        approvedBy: scope.userId,
        vehicleId: reservation.vehicleId,
        date: now,
      },
    })
    financeId = fin.id
  }

  const saved = await dbAny.turizmRentDepositAndCharge.create({
    data: {
      id: `trzm-rnt-chg-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      entryNo: `DCH-${String(Date.now()).slice(-6)}`,
      reservationId: reservation.id,
      contractId: reservation.contract?.id || null,
      vehicleId: reservation.vehicleId,
      customerId: reservation.customerId,
      entryType: input.entryType,
      status:
        input.status ||
        (input.entryType === "DEPOSIT_REFUND" ? "REFUND_PENDING" : "COLLECTED"),
      quantity,
      unitPriceTry,
      amountTry,
      vatRatePct,
      totalWithVatTry,
      currency: "TRY",
      calculationRuleNote: input.calculationRuleNote || null,
      financeId,
      settledAt: now,
      notes: input.notes || null,
      ownerCompanyId: scope.effectiveCompanyId || MAIN_COMPANY_ID,
      createdBy: scope.userId,
      createdAt: now,
      updatedAt: now,
    },
  })

  await logTourismAudit({
    userId: scope.userId,
    action: "RECORD_DEPOSIT_OR_EXTRA_CHARGE",
    resource: "turizm_rentacar",
    resourceId: saved.id,
    moduleKey: "turizm_rentacar",
    branchId: scope.branchId,
    companyId: scope.effectiveCompanyId,
    metadata: {
      entryNo: saved.entryNo,
      entryType: saved.entryType,
      totalWithVatTry: saved.totalWithVatTry,
    },
  })

  return saved
}

export async function refundOrSettleDeposit(
  input: { chargeId: string; notes?: string },
  scope: TourismScopeContext
) {
  const dbAny = prisma as any
  const charge = await dbAny.turizmRentDepositAndCharge.findUnique({
    where: { id: input.chargeId },
  })
  if (!charge) {
    throw new TourismDomainError("NOT_FOUND", "Depozito/ücret kaydı bulunamadı.", 404)
  }

  const nextStatus = charge.entryType === "DEPOSIT_REFUND" ? "REFUNDED" : "COLLECTED"
  const updated = await dbAny.turizmRentDepositAndCharge.update({
    where: { id: charge.id },
    data: {
      status: nextStatus,
      settledAt: new Date(),
      notes: input.notes || charge.notes,
      updatedAt: new Date(),
    },
  })

  await logTourismAudit({
    userId: scope.userId,
    action: "SETTLE_OR_REFUND_DEPOSIT",
    resource: "turizm_rentacar",
    resourceId: updated.id,
    moduleKey: "turizm_rentacar",
    branchId: scope.branchId,
    companyId: scope.effectiveCompanyId,
    metadata: { entryNo: updated.entryNo, status: updated.status },
  })

  return updated
}

export async function issueRentalInvoiceAndFinanceEntry(
  input: { reservationId: string },
  scope: TourismScopeContext
) {
  const dbAny = prisma as any
  const reservation = await dbAny.turizmRentReservation.findUnique({
    where: { id: input.reservationId },
    include: {
      vehicle: true,
      customer: true,
      contract: true,
      depositCharges: true,
    },
  })
  if (!reservation) {
    throw new TourismDomainError("NOT_FOUND", "Faturalandırılacak rezervasyon bulunamadı.", 404)
  }

  const vehicle =
    reservation.vehicle ||
    (await dbAny.lojistikVehicle.findUnique({ where: { id: reservation.vehicleId } }))
  const customer =
    reservation.customer ||
    (await dbAny.customer.findUnique({ where: { id: reservation.customerId } }))
  const policy = await getRentPolicyConfig(reservation.branchId)
  const vatRate = Number(policy.defaultVatRatePct ?? 20)

  const billableExtraCharges = (reservation.depositCharges || []).filter(
    (c: any) =>
      !String(c.entryType).startsWith("DEPOSIT_") &&
      c.status !== "WAIVED" &&
      !c.eDocumentNo
  )

  const lines: Array<{
    sku: string
    name: string
    quantity: number
    unit: string
    unitPrice: number
    vatRate: number
  }> = [
      {
        sku: `KIRA-${vehicle?.plate || "ARAC"}`,
        name: `${vehicle?.plate || "Araç"} Kiralama Bedeli (${reservation.rentalDays} Gün)`,
        quantity: Number(reservation.rentalDays || 1),
        unit: "Gün",
        unitPrice: Number(reservation.dailyRateTry || 0),
        vatRate,
      },
    ]

  if (Number(reservation.extrasTotalTry || 0) > 0) {
    lines.push({
      sku: "KIRA-EK-HIZMET",
      name: "Kiralama Ek Hizmet & Güvence Paketi",
      quantity: 1,
      unit: "Paket",
      unitPrice: Number(reservation.extrasTotalTry),
      vatRate,
    })
  }

  for (const chg of billableExtraCharges) {
    lines.push({
      sku: `EKU-${chg.entryType}`,
      name: RENT_CHARGE_ENTRY_TYPE_LABELS[chg.entryType as RentChargeEntryType] || chg.entryType,
      quantity: Number(chg.quantity || 1),
      unit: "Adet",
      unitPrice: Number(chg.unitPriceTry || chg.amountTry || 0),
      vatRate: Number(chg.vatRatePct ?? vatRate),
    })
  }

  const edocProvider = new DemoDbEDocumentProvider()
  const edocRes = await edocProvider.submitEDocument({
    documentType: customer?.company ? "E_FATURA" : "E_ARSIV",
    relatedOrderNo: reservation.reservationNo,
    receiverTitle: customer?.company || customer?.name || "Kiracı Müşteri",
    receiverVknTckn: customer?.tckn || "11111111111",
    vehiclePlate: vehicle?.plate || undefined,
    lines,
  })

  const totalAmount = lines.reduce(
    (sum, l) => sum + l.quantity * l.unitPrice * (1 + l.vatRate / 100),
    0
  )

  const fin = await dbAny.finance.create({
    data: {
      branchId: reservation.branchId || scope.branchId || "local-debug-branch",
      type: "INCOME",
      amount: Number(totalAmount.toFixed(2)),
      category: "Araç Kiralama Geliri",
      description: `${vehicle?.plate || "Araç"} — Kiralama & Ek Ücret Faturası (${edocRes.documentNo} / ${reservation.reservationNo})`,
      status: "approved",
      approvedBy: scope.userId,
      vehicleId: reservation.vehicleId,
      date: new Date(),
    },
  })

  if (reservation.contract) {
    await dbAny.turizmRentContract.update({
      where: { id: reservation.contract.id },
      data: {
        financeId: fin.id,
        eDocumentId: edocRes.ettnUuid,
        eDocumentNo: edocRes.documentNo,
        updatedAt: new Date(),
      },
    })
  }

  for (const chg of billableExtraCharges) {
    await dbAny.turizmRentDepositAndCharge.update({
      where: { id: chg.id },
      data: {
        status: "INVOICED",
        financeId: fin.id,
        eDocumentId: edocRes.ettnUuid,
        eDocumentNo: edocRes.documentNo,
        updatedAt: new Date(),
      },
    })
  }

  await logTourismAudit({
    userId: scope.userId,
    action: "ISSUE_RENTAL_INVOICE_AND_FINANCE",
    resource: "turizm_rentacar",
    resourceId: reservation.id,
    moduleKey: "turizm_rentacar",
    branchId: scope.branchId,
    companyId: scope.effectiveCompanyId,
    metadata: {
      reservationNo: reservation.reservationNo,
      documentNo: edocRes.documentNo,
      financeId: fin.id,
      totalAmount: Number(totalAmount.toFixed(2)),
    },
  })

  return {
    eDocument: edocRes,
    financeRecord: fin,
  }
}

// ── H) Trafik Cezası (Filo) ve HGS/OGS Otomatik Plaka+Tarih Eşleştirme & Yansıtma ──

export async function importOrRecordTollPasses(
  input: {
    csvContent?: string
    manualPass?: {
      vehicleId?: string
      plate: string
      passDateTime: string | Date
      highwayOrBridgeName: string
      entryPoint?: string
      exitPoint?: string
      amountTry: number
    }
  },
  scope: TourismScopeContext
) {
  const dbAny = prisma as any
  const vehicles = await dbAny.lojistikVehicle.findMany()
  const vehicleByPlate = new Map<string, any>(
    vehicles.map((v: any) => [String(v.plate || "").toUpperCase(), v])
  )

  const adapters = createRentACarAdapters()
  const rowsToInsert = input.csvContent
    ? adapters.hgsToll.parseCsvRows(input.csvContent)
    : input.manualPass
      ? [
        {
          plate: String(input.manualPass.plate).toUpperCase(),
          passDateTime: new Date(input.manualPass.passDateTime).toISOString(),
          highwayOrBridgeName: input.manualPass.highwayOrBridgeName,
          entryPoint: input.manualPass.entryPoint || null,
          exitPoint: input.manualPass.exitPoint || null,
          amountTry: Number(input.manualPass.amountTry || 0),
        },
      ]
      : []

  const createdPasses: any[] = []
  for (const row of rowsToInsert) {
    const veh =
      (input.manualPass?.vehicleId
        ? vehicles.find((v: any) => v.id === input.manualPass?.vehicleId)
        : null) || vehicleByPlate.get(row.plate)
    if (!veh) continue

    const created = await dbAny.turizmRentTollPassLog.create({
      data: {
        id: `trzm-rnt-hgs-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        passNo: `HGS-2026-${String(Date.now()).slice(-5)}-${Math.random().toString(36).slice(2, 4).toUpperCase()}`,
        vehicleId: veh.id,
        plate: veh.plate,
        passDateTime: new Date(row.passDateTime),
        highwayOrBridgeName: row.highwayOrBridgeName,
        entryPoint: row.entryPoint,
        exitPoint: row.exitPoint,
        amountTry: row.amountTry,
        sourceMode: input.csvContent ? "CSV_IMPORT" : "MANUAL",
        reflectionStatus: "UNMATCHED",
        ownerCompanyId: scope.effectiveCompanyId || MAIN_COMPANY_ID,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    })
    createdPasses.push(created)
  }

  // Otomatik eşleştirmeyi çalıştır
  const matchSummary = await autoMatchPenaltiesAndTollPassesToRentals(scope)

  return {
    importedCount: createdPasses.length,
    createdPasses,
    matchSummary,
  }
}

export async function autoMatchPenaltiesAndTollPassesToRentals(
  scope: TourismScopeContext
) {
  const dbAny = prisma as any
  const [reservations, contracts, penalties, tollPasses] = await Promise.all([
    dbAny.turizmRentReservation.findMany(),
    dbAny.turizmRentContract.findMany().catch(() => []),
    dbAny.lojistikTrafficPenalty.findMany().catch(() => []),
    dbAny.turizmRentTollPassLog.findMany().catch(() => []),
  ])

  const contractByResId = new Map<string, any>(
    contracts.map((c: any) => [c.reservationId, c])
  )
  const validReservations = reservations.filter(
    (r: any) =>
      r.status === "ACTIVE" || r.status === "COMPLETED" || r.status === "CONFIRMED"
  )

  let matchedPenaltiesCount = 0
  let matchedTollPassesCount = 0

  for (const pen of penalties) {
    if (pen.reflectionStatus === "REFLECTED_TO_CUSTOMER") continue
    const vDate = new Date(pen.violationDate).getTime()
    if (Number.isNaN(vDate)) continue

    const matchedRes = validReservations.find((r: any) => {
      if (r.vehicleId !== pen.vehicleId) return false
      const s = new Date(r.actualPickupAt || r.startAt).getTime()
      const e = new Date(r.actualReturnAt || r.endAt).getTime()
      return vDate >= s && vDate <= e
    })

    if (matchedRes) {
      const cnt = contractByResId.get(matchedRes.id)
      await dbAny.lojistikTrafficPenalty.update({
        where: { id: pen.id },
        data: {
          matchedReservationId: matchedRes.id,
          matchedContractId: cnt?.id || null,
          matchedCustomerId: matchedRes.customerId,
          reflectionStatus:
            pen.reflectionStatus === "REFLECTED_TO_CUSTOMER"
              ? "REFLECTED_TO_CUSTOMER"
              : "MATCHED_PENDING",
          updatedAt: new Date(),
        },
      })
      matchedPenaltiesCount++
    }
  }

  for (const toll of tollPasses) {
    if (toll.reflectionStatus === "REFLECTED_TO_CUSTOMER") continue
    const pDate = new Date(toll.passDateTime).getTime()
    if (Number.isNaN(pDate)) continue

    const matchedRes = validReservations.find((r: any) => {
      if (r.vehicleId !== toll.vehicleId) return false
      const s = new Date(r.actualPickupAt || r.startAt).getTime()
      const e = new Date(r.actualReturnAt || r.endAt).getTime()
      return pDate >= s && pDate <= e
    })

    if (matchedRes) {
      const cnt = contractByResId.get(matchedRes.id)
      await dbAny.turizmRentTollPassLog.update({
        where: { id: toll.id },
        data: {
          matchedReservationId: matchedRes.id,
          matchedContractId: cnt?.id || null,
          matchedCustomerId: matchedRes.customerId,
          reflectionStatus:
            toll.reflectionStatus === "REFLECTED_TO_CUSTOMER"
              ? "REFLECTED_TO_CUSTOMER"
              : "MATCHED_PENDING",
          updatedAt: new Date(),
        },
      })
      matchedTollPassesCount++
    }
  }

  await logTourismAudit({
    userId: scope.userId,
    action: "AUTO_MATCH_PENALTIES_AND_TOLLS",
    resource: "turizm_rentacar",
    moduleKey: "turizm_rentacar",
    branchId: scope.branchId,
    companyId: scope.effectiveCompanyId,
    metadata: { matchedPenaltiesCount, matchedTollPassesCount },
  })

  return {
    matchedPenaltiesCount,
    matchedTollPassesCount,
  }
}

export async function reflectPenaltyOrTollToCustomer(
  input: {
    sourceType: "PENALTY" | "TOLL"
    sourceId: string
    includeAdminServiceFee?: boolean
    issueEDocument?: boolean
  },
  scope: TourismScopeContext
) {
  const dbAny = prisma as any
  const policy = await getRentPolicyConfig(scope.branchId)
  const adminFee = input.includeAdminServiceFee
    ? Number(policy.adminServiceFeeForPenaltyTry || 0)
    : 0

  if (input.sourceType === "PENALTY") {
    const penalty = await dbAny.lojistikTrafficPenalty.findUnique({
      where: { id: input.sourceId },
    })
    if (!penalty) {
      throw new TourismDomainError("NOT_FOUND", "Yansıtılacak trafik cezası bulunamadı.", 404)
    }
    if (!penalty.matchedReservationId) {
      throw new TourismDomainError(
        "VALIDATION_ERROR",
        "Bu trafik cezası herhangi bir kiralama dönemiyle eşleşmemiştir.",
        400
      )
    }

    const totalReflectTry = Number((Number(penalty.amountTry || 0) + adminFee).toFixed(2))
    const charge = await recordDepositOrExtraCharge(
      {
        reservationId: penalty.matchedReservationId,
        entryType: "TRAFFIC_PENALTY_REFLECTION",
        quantity: 1,
        unitPriceTry: totalReflectTry,
        vatRatePct: Number(policy.defaultVatRatePct ?? 20),
        status: "INVOICED",
        calculationRuleNote: `Trafik cezası yansıtması (${penalty.penaltyNo}: ${penalty.reason})${adminFee > 0 ? ` + ${adminFee} TRY hizmet bedeli` : ""
          }`,
        postToFinance: true,
      },
      scope
    )

    await dbAny.lojistikTrafficPenalty.update({
      where: { id: penalty.id },
      data: {
        reflectionStatus: "REFLECTED_TO_CUSTOMER",
        reflectedExtraChargeId: charge.id,
        reflectedAt: new Date(),
        updatedAt: new Date(),
      },
    })

    return { reflectedCharge: charge, sourceType: "PENALTY", sourceId: penalty.id }
  }

  const toll = await dbAny.turizmRentTollPassLog.findUnique({
    where: { id: input.sourceId },
  })
  if (!toll) {
    throw new TourismDomainError("NOT_FOUND", "Yansıtılacak HGS geçiş kaydı bulunamadı.", 404)
  }
  if (!toll.matchedReservationId) {
    throw new TourismDomainError(
      "VALIDATION_ERROR",
      "Bu HGS geçişi herhangi bir kiralama dönemiyle eşleşmemiştir.",
      400
    )
  }

  const totalReflectTry = Number((Number(toll.amountTry || 0) + adminFee).toFixed(2))
  const charge = await recordDepositOrExtraCharge(
    {
      reservationId: toll.matchedReservationId,
      entryType: "TOLL_PASS_REFLECTION",
      quantity: 1,
      unitPriceTry: totalReflectTry,
      vatRatePct: Number(policy.defaultVatRatePct ?? 20),
      status: "INVOICED",
      calculationRuleNote: `HGS geçiş yansıtması (${toll.passNo}: ${toll.highwayOrBridgeName})`,
      postToFinance: true,
    },
    scope
  )

  await dbAny.turizmRentTollPassLog.update({
    where: { id: toll.id },
    data: {
      reflectionStatus: "REFLECTED_TO_CUSTOMER",
      serviceFeeTry: adminFee,
      reflectedChargeId: charge.id,
      updatedAt: new Date(),
    },
  })

  return { reflectedCharge: charge, sourceType: "TOLL", sourceId: toll.id }
}

// ── J) Raporlar & Analitik (Filo TCO ile Araç Başı Kârlılık + XLSX / PDF) ───

export async function buildRentACarAnalyticsAndReports(
  params: { branchId?: string; periodDays?: number },
  scope: TourismScopeContext
) {
  const dbAny = prisma as any
  const [
    vehicles,
    classes,
    reservations,
    charges,
    fuelLogs,
    maintWos,
    leases,
    vehicleDocs,
    penalties,
  ] = await Promise.all([
    dbAny.lojistikVehicle.findMany(),
    dbAny.turizmRentVehicleClass.findMany().catch(() => []),
    dbAny.turizmRentReservation.findMany().catch(() => []),
    dbAny.turizmRentDepositAndCharge.findMany().catch(() => []),
    dbAny.lojistikFuelLog.findMany().catch(() => []),
    dbAny.lojistikVehicleMaintenanceWorkOrder.findMany().catch(() => []),
    dbAny.lojistikVehicleLease.findMany().catch(() => []),
    dbAny.lojistikVehicleDocument.findMany().catch(() => []),
    dbAny.lojistikTrafficPenalty.findMany().catch(() => []),
  ])

  const periodDays = Math.max(30, Number(params.periodDays || 180))
  const classById = new Map<string, any>(classes.map((c: any) => [c.id, c]))

  let rentalVehicles = filterRecordsByCompanyScope(vehicles, scope).filter(
    (v: any) =>
      v.isActive !== false &&
      (v.isRentalPool === true ||
        Boolean(v.rentalClassId) ||
        v.vehicleType === "PASSENGER" ||
        v.vehicleType === "MINIBUS")
  )
  let scopedReservations = filterRecordsByCompanyScope(reservations, scope)
  let scopedCharges = filterRecordsByCompanyScope(charges, scope)

  if (params.branchId) {
    rentalVehicles = rentalVehicles.filter((v: any) => v.branchId === params.branchId)
    scopedReservations = scopedReservations.filter((r: any) => r.branchId === params.branchId)
  }

  // 1. Araç Başı Kârlılık & Doluluk (Filo TCO ile Birleştirilmiş)
  const vehicleProfitabilityRows = rentalVehicles.map((v: any) => {
    const effClassId = resolveEffectiveVehicleClassId(v)
    const cls = effClassId ? classById.get(effClassId) : null
    const vRes = scopedReservations.filter(
      (r: any) => r.vehicleId === v.id && r.status !== "CANCELLED" && r.status !== "NO_SHOW"
    )
    const rentedDays = vRes.reduce((sum: number, r: any) => sum + Number(r.rentalDays || 0), 0)
    const utilizationPct = Number(
      Math.min(100, (rentedDays / Math.max(1, periodDays)) * 100).toFixed(1)
    )

    const baseRentalIncomeTry = vRes.reduce(
      (sum: number, r: any) => sum + Number(r.baseRentalAmountTry || 0) + Number(r.extrasTotalTry || 0),
      0
    )
    const extraChargesIncomeTry = scopedCharges
      .filter(
        (c: any) =>
          c.vehicleId === v.id &&
          !String(c.entryType).startsWith("DEPOSIT_") &&
          c.status !== "WAIVED"
      )
      .reduce((sum: number, c: any) => sum + Number(c.amountTry || 0), 0)

    const totalRevenueTry = Number((baseRentalIncomeTry + extraChargesIncomeTry).toFixed(2))

    // Filo TCO gider kalemleri (Lojistik Filo ortak tablolarından)
    const fuelCostTry = fuelLogs
      .filter((f: any) => f.vehicleId === v.id)
      .reduce((sum: number, f: any) => sum + Number(f.totalAmountTry || 0), 0)
    const maintenanceCostTry = maintWos
      .filter((w: any) => w.vehicleId === v.id && w.status !== "CANCELLED")
      .reduce((sum: number, w: any) => sum + Number(w.totalCostTry || 0), 0)
    const leaseOrDepreciationTry =
      leases
        .filter((l: any) => l.vehicleId === v.id && l.isActive !== false)
        .reduce((sum: number, l: any) => sum + Number(l.monthlyCostTry || 0), 0) ||
      Number(v.monthlyDepreciationTry || 0)
    const insuranceDocCostTry = vehicleDocs
      .filter((d: any) => d.vehicleId === v.id)
      .reduce((sum: number, d: any) => sum + Number(d.costTry || 0), 0)
    const unreflectedPenaltyCostTry = penalties
      .filter(
        (p: any) => p.vehicleId === v.id && p.reflectionStatus !== "REFLECTED_TO_CUSTOMER"
      )
      .reduce((sum: number, p: any) => sum + Number(p.amountTry || 0), 0)

    const fleetTcoExpenseTry = Number(
      (
        fuelCostTry +
        maintenanceCostTry +
        leaseOrDepreciationTry +
        insuranceDocCostTry +
        unreflectedPenaltyCostTry
      ).toFixed(2)
    )
    const netProfitTry = Number((totalRevenueTry - fleetTcoExpenseTry).toFixed(2))

    return {
      vehicleId: v.id,
      plate: v.plate,
      brandModel: `${v.brand} ${v.model}`,
      className: cls?.name || "Genel Filo",
      reservationCount: vRes.length,
      rentedDays,
      utilizationPct,
      baseRentalIncomeTry: Number(baseRentalIncomeTry.toFixed(2)),
      extraChargesIncomeTry: Number(extraChargesIncomeTry.toFixed(2)),
      totalRevenueTry,
      fleetTcoExpenseTry,
      netProfitTry,
    }
  })

  // 2. Sınıf Bazlı Gelir Dağılımı
  const classRevenueRows = classes.map((cls: any) => {
    const cRes = scopedReservations.filter(
      (r: any) => r.vehicleClassId === cls.id && r.status !== "CANCELLED" && r.status !== "NO_SHOW"
    )
    const totalDays = cRes.reduce((s: number, r: any) => s + Number(r.rentalDays || 0), 0)
    const revenueTry = cRes.reduce(
      (s: number, r: any) => s + Number(r.finalTotalTry || r.totalEstimatedTry || 0),
      0
    )
    return {
      vehicleClassId: cls.id,
      code: cls.code,
      className: cls.name,
      segmentCode: cls.segmentCode,
      reservationCount: cRes.length,
      totalDays,
      revenueTry: Number(revenueTry.toFixed(2)),
      avgDailyRevenueTry: totalDays > 0 ? Number((revenueTry / totalDays).toFixed(2)) : 0,
    }
  })

  // 3. Ek Ücret Dökümü
  const extraChargeTypes: RentChargeEntryType[] = [
    "EXTRA_KM",
    "FUEL_DIFFERENCE",
    "LATE_RETURN",
    "DAMAGE_FEE",
    "TOLL_PASS_REFLECTION",
    "TRAFFIC_PENALTY_REFLECTION",
    "EXTRA_SERVICE",
  ]
  const extraChargesBreakdown = extraChargeTypes.map((type) => {
    const items = scopedCharges.filter((c: any) => c.entryType === type && c.status !== "WAIVED")
    const totalTry = items.reduce((s: number, c: any) => s + Number(c.amountTry || 0), 0)
    return {
      entryType: type,
      label: RENT_CHARGE_ENTRY_TYPE_LABELS[type],
      count: items.length,
      totalAmountTry: Number(totalTry.toFixed(2)),
    }
  })

  // 4. İptal & No-Show Oranı ve Genel KPI Özeti
  const totalReservations = scopedReservations.length
  const cancelledCount = scopedReservations.filter((r: any) => r.status === "CANCELLED").length
  const noShowCount = scopedReservations.filter((r: any) => r.status === "NO_SHOW").length
  const activeCount = scopedReservations.filter((r: any) => r.status === "ACTIVE").length
  const completedCount = scopedReservations.filter((r: any) => r.status === "COMPLETED").length
  const cancelOrNoShowRatePct =
    totalReservations > 0
      ? Number((((cancelledCount + noShowCount) / totalReservations) * 100).toFixed(1))
      : 0

  const totalRevenueTry = Number(
    vehicleProfitabilityRows.reduce((s, r) => s + r.totalRevenueTry, 0).toFixed(2)
  )
  const totalFleetTcoExpenseTry = Number(
    vehicleProfitabilityRows.reduce((s, r) => s + r.fleetTcoExpenseTry, 0).toFixed(2)
  )
  const totalNetProfitTry = Number((totalRevenueTry - totalFleetTcoExpenseTry).toFixed(2))
  const avgUtilizationPct =
    vehicleProfitabilityRows.length > 0
      ? Number(
        (
          vehicleProfitabilityRows.reduce((s, r) => s + r.utilizationPct, 0) /
          vehicleProfitabilityRows.length
        ).toFixed(1)
      )
      : 0

  return {
    summary: {
      totalRentalVehicles: rentalVehicles.length,
      totalReservations,
      activeCount,
      completedCount,
      cancelledCount,
      noShowCount,
      cancelOrNoShowRatePct,
      avgUtilizationPct,
      totalRevenueTry,
      totalFleetTcoExpenseTry,
      totalNetProfitTry,
    },
    vehicleProfitabilityRows,
    classRevenueRows,
    extraChargesBreakdown,
  }
}

export async function buildRentACarExportPayload(
  params: { branchId?: string },
  scope: TourismScopeContext
): Promise<LogisticsReportPayload> {
  const analytics = await buildRentACarAnalyticsAndReports(params, scope)
  return {
    moduleKey: "filo",
    title: "Araç Kiralama (Rent-a-Car) Doluluk, Gelir/Gider ve Filo TCO Kârlılık Raporu",
    subtitle: "Kiralama gelirleri, ek ücretler ve Lojistik Filo TCO giderlerinden canlı hesaplanmıştır",
    generatedAt: new Date().toISOString(),
    filtersApplied: {},
    chartTitle: "Sınıf Bazlı Kiralama Geliri (TRY)",
    chartData: analytics.classRevenueRows.map((c: any) => ({
      name: c.className,
      primaryValue: c.revenueTry,
      primaryLabel: "Gelir (TRY)",
    })),
    filterOptions: {},
    summaryCards: [
      {
        label: "Kiralama Filosu / Ort. Doluluk",
        value: `${analytics.summary.totalRentalVehicles} Araç (%${analytics.summary.avgUtilizationPct})`,
        hint: `${analytics.summary.activeCount} aktif kirada · ${analytics.summary.completedCount} tamamlandı`,
      },
      {
        label: "Toplam Kiralama + Ek Ücret Geliri",
        value: `${analytics.summary.totalRevenueTry.toLocaleString("tr-TR")} TRY`,
        hint: `${analytics.summary.totalReservations} rezervasyon kaydından`,
      },
      {
        label: "Filo TCO Gideri (Yakıt/Bakım/Kira)",
        value: `${analytics.summary.totalFleetTcoExpenseTry.toLocaleString("tr-TR")} TRY`,
        hint: "Lojistik Filo TCO kayıtlarından hesaplandı",
      },
      {
        label: "Araç Filosu Net Katkı & İptal Oranı",
        value: `${analytics.summary.totalNetProfitTry.toLocaleString("tr-TR")} TRY`,
        hint: `İptal/No-Show oranı: %${analytics.summary.cancelOrNoShowRatePct}`,
      },
    ],
    columns: [
      { key: "plate", label: "Plaka", format: "text" },
      { key: "brandModel", label: "Marka / Model", format: "text" },
      { key: "className", label: "Araç Sınıfı", format: "text" },
      { key: "rentedDays", label: "Kiralanan Gün", format: "number" },
      { key: "utilizationPct", label: "Doluluk %", format: "percent" },
      { key: "totalRevenueTry", label: "Toplam Gelir (TRY)", format: "currency" },
      { key: "fleetTcoExpenseTry", label: "Filo TCO Gideri", format: "currency" },
      { key: "netProfitTry", label: "Net Kârlılık (TRY)", format: "currency" },
    ],
    rows: analytics.vehicleProfitabilityRows,
  }
}

export async function exportRentACarReportBuffer(
  params: { format: "xlsx" | "pdf"; branchId?: string },
  scope: TourismScopeContext
): Promise<{ buffer: Buffer; fileName: string; mimeType: string }> {
  const report = await buildRentACarExportPayload({ branchId: params.branchId }, scope)
  const dateTag = new Date().toISOString().slice(0, 10)
  if (params.format === "pdf") {
    return {
      buffer: exportLogisticsReportToPdfBuffer(report),
      fileName: `SunumERP_RentACar_Karlilik_Raporu_${dateTag}.pdf`,
      mimeType: "application/pdf",
    }
  }
  return {
    buffer: exportLogisticsReportToExcelBuffer(report),
    fileName: `SunumERP_RentACar_Karlilik_Raporu_${dateTag}.xlsx`,
    mimeType: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  }
}

// ── K) Bildirimler (Mevcut Notification Altyapısı İle) ───────────────────────

export interface RentACarAlertItem {
  kind:
  | "UPCOMING_PICKUP_OR_RETURN"
  | "OVERDUE_RENTAL_RETURN"
  | "MAINTENANCE_OR_DOC_CONFLICT"
  | "PENDING_DEPOSIT_REFUND"
  severity: "warning" | "error"
  entityId: string
  title: string
  message: string
}

export async function evaluateAndDispatchRentACarAlerts(
  params: {
    scope: TourismScopeContext
    dispatchNotifications?: boolean
    referenceNow?: Date
  }
) {
  const dbAny = prisma as any
  const refNow = params.referenceNow || new Date()
  const [vehicles, reservations, charges, workOrders, existingNotifs] = await Promise.all([
    dbAny.lojistikVehicle.findMany(),
    dbAny.turizmRentReservation.findMany().catch(() => []),
    dbAny.turizmRentDepositAndCharge.findMany().catch(() => []),
    dbAny.lojistikVehicleMaintenanceWorkOrder.findMany().catch(() => []),
    prisma.notification.findMany({ take: 100, orderBy: { createdAt: "desc" } }).catch(() => []),
  ])

  const vehById = new Map<string, any>(vehicles.map((v: any) => [v.id, v]))
  const alerts: RentACarAlertItem[] = []

  for (const res of filterRecordsByCompanyScope(reservations, params.scope)) {
    const veh = vehById.get(res.vehicleId)
    const plate = veh?.plate || res.vehicleId
    const startMs = new Date(res.startAt).getTime()
    const endMs = new Date(res.endAt).getTime()
    const nowMs = refNow.getTime()

    // 1. Geciken İade (ACTIVE ve iade zamanı geçmiş)
    if (res.status === "ACTIVE" && endMs < nowMs) {
      const overdueHours = Math.max(1, Math.round((nowMs - endMs) / 3_600_000))
      alerts.push({
        kind: "OVERDUE_RENTAL_RETURN",
        severity: "error",
        entityId: res.id,
        title: `${plate} — Geciken Araç İadesi (${res.reservationNo})`,
        message: `${plate} plakalı aracın planlanan iade zamanı ${overdueHours} saat geçmiştir.`,
      })
    }

    // 2. Yaklaşan Teslim veya İade (önümüzdeki 36 saat içinde)
    if (
      (res.status === "CONFIRMED" || res.status === "PENDING") &&
      startMs >= nowMs &&
      startMs - nowMs <= 36 * 3_600_000
    ) {
      alerts.push({
        kind: "UPCOMING_PICKUP_OR_RETURN",
        severity: "warning",
        entityId: `${res.id}:pickup`,
        title: `${plate} — Yaklaşan Araç Teslimi (${res.reservationNo})`,
        message: `${plate} plakalı araç için teslim zamanı yaklaşıyor (${new Date(res.startAt).toISOString().slice(0, 16).replace("T", " ")}).`,
      })
    } else if (
      res.status === "ACTIVE" &&
      endMs >= nowMs &&
      endMs - nowMs <= 36 * 3_600_000
    ) {
      alerts.push({
        kind: "UPCOMING_PICKUP_OR_RETURN",
        severity: "warning",
        entityId: `${res.id}:return`,
        title: `${plate} — Yaklaşan Araç İadesi (${res.reservationNo})`,
        message: `${plate} plakalı aracın planlanan iade zamanı yaklaşıyor (${new Date(res.endAt).toISOString().slice(0, 16).replace("T", " ")}).`,
      })
    }

    // 3. Bakım / Arıza Çakışması
    if (res.status === "CONFIRMED" || res.status === "PENDING") {
      const hasMaintConflict =
        veh?.status === "MAINTENANCE" ||
        veh?.status === "FAULT" ||
        workOrders.some(
          (wo: any) =>
            wo.vehicleId === res.vehicleId &&
            (wo.status === "IN_PROGRESS" || wo.status === "SCHEDULED") &&
            doTimeIntervalsOverlap(
              res.startAt,
              res.endAt,
              wo.startedAt || wo.plannedDate || wo.createdAt,
              wo.completedAt || new Date(new Date(wo.startedAt || wo.plannedDate || wo.createdAt).getTime() + 48 * 3_600_000)
            )
        )
      if (hasMaintConflict) {
        alerts.push({
          kind: "MAINTENANCE_OR_DOC_CONFLICT",
          severity: "error",
          entityId: `${res.id}:maint`,
          title: `${plate} — Bakımda Araç / Rezervasyon Çakışması (${res.reservationNo})`,
          message: `${plate} plakalı araç bakımda/arızalı olduğundan ${res.reservationNo} rezervasyonu için ikame araç atanmalıdır.`,
        })
      }
    }
  }

  // 4. Depozito İadesi Bekleyenler
  for (const chg of filterRecordsByCompanyScope(charges, params.scope)) {
    if (chg.entryType === "DEPOSIT_REFUND" && chg.status === "REFUND_PENDING") {
      const veh = vehById.get(chg.vehicleId)
      alerts.push({
        kind: "PENDING_DEPOSIT_REFUND",
        severity: "warning",
        entityId: chg.id,
        title: `${veh?.plate || "Araç"} — Bekleyen Depozito İadesi (${chg.entryNo})`,
        message: `İadesi tamamlanan kiralamaya ait ${Number(chg.amountTry || 0).toLocaleString("tr-TR")} TRY depozito iadesi onay bekliyor.`,
      })
    }
  }

  let notificationsSent = 0
  if (params.dispatchNotifications && alerts.length > 0 && params.scope.userId) {
    const existingTitles = new Set(existingNotifs.map((n: any) => n.title))
    const toSend = alerts
      .filter((a) => !existingTitles.has(a.title))
      .slice(0, 15)
      .map((a) => ({
        userId: params.scope.userId,
        title: a.title,
        message: a.message,
        type: a.severity,
        moduleType: "TURIZM_RENTACAR",
        link: "/dashboard/arac-kiralama",
      }))
    if (toSend.length > 0) {
      const sent = await createNotificationMany(toSend)
      notificationsSent = sent.length
    }
  }

  return {
    totalAlerts: alerts.length,
    errorCount: alerts.filter((a) => a.severity === "error").length,
    warningCount: alerts.filter((a) => a.severity === "warning").length,
    notificationsSent,
    alerts,
  }
}

// ── Tam Çalışma Alanı (Workspace Snapshot) Toplayıcısı ───────────────────────

export async function getRentACarWorkspaceSnapshot(
  params: {
    branchId?: string
    vehicleClassId?: string
    ganttStartDate?: string
    ganttDays?: number
    revealKvkk?: boolean
  },
  scope: TourismScopeContext
) {
  const dbAny = prisma as any
  const [
    classes,
    tariffs,
    extraServices,
    policyConfig,
    rentalVehicles,
    gantt,
    customersBundle,
    rawReservations,
    rawContracts,
    rawInspections,
    rawCharges,
    rawTollPasses,
    rawPenalties,
    rawKabisRecords,
    rawConflictLogs,
    drivers,
    analytics,
    alerts,
  ] = await Promise.all([
    listVehicleClasses(scope),
    listTariffs(scope, { branchId: params.branchId, vehicleClassId: params.vehicleClassId }),
    listExtraServices(scope),
    getRentPolicyConfig(params.branchId || scope.branchId),
    listRentalFleetVehicles(
      { branchId: params.branchId, rentalClassId: params.vehicleClassId },
      scope
    ),
    getRentalAvailabilityGantt(
      {
        windowStartDate: params.ganttStartDate || new Date("2026-11-15T00:00:00.000Z"),
        daysCount: params.ganttDays || 21,
        vehicleClassId: params.vehicleClassId,
        branchId: params.branchId,
      },
      scope
    ),
    listRentalCustomers({
      scope,
      branchId: params.branchId,
      revealSensitivePii: params.revealKvkk,
    }),
    dbAny.turizmRentReservation.findMany({
      include: { vehicle: true, vehicleClass: true, tariff: true, customer: true, contract: true },
      orderBy: { startAt: "desc" },
    }),
    dbAny.turizmRentContract.findMany({
      include: { reservation: true, vehicle: true, customer: true },
      orderBy: { createdAt: "desc" },
    }),
    dbAny.turizmRentInspectionForm.findMany({ orderBy: { inspectedAt: "desc" } }),
    dbAny.turizmRentDepositAndCharge.findMany({ orderBy: { createdAt: "desc" } }),
    dbAny.turizmRentTollPassLog.findMany({ orderBy: { passDateTime: "desc" } }),
    dbAny.lojistikTrafficPenalty.findMany({ orderBy: { violationDate: "desc" } }).catch(() => []),
    dbAny.turizmRentKabisRecord.findMany({ orderBy: { createdAt: "desc" } }),
    dbAny.turizmRentConflictAttemptLog.findMany({ orderBy: { attemptedAt: "desc" } }),
    dbAny.lojistikDriver.findMany().catch(() => []),
    buildRentACarAnalyticsAndReports({ branchId: params.branchId }, scope),
    evaluateAndDispatchRentACarAlerts({ scope, dispatchNotifications: false }),
  ])

  const custById = new Map<string, any>(
    customersBundle.customers.map((c: any) => [c.id, c])
  )
  const vehById = new Map<string, any>(rentalVehicles.map((v: any) => [v.id, v]))
  const resById = new Map<string, any>(rawReservations.map((r: any) => [r.id, r]))

  const reservations = filterRecordsByCompanyScope(rawReservations, scope).map((r: any) => ({
    ...r,
    customer: custById.get(r.customerId) || r.customer || null,
    vehicle: vehById.get(r.vehicleId) || r.vehicle || null,
  }))

  const contracts = filterRecordsByCompanyScope(rawContracts, scope).map((c: any) => ({
    ...c,
    customer: custById.get(c.customerId) || c.customer || null,
    vehicle: vehById.get(c.vehicleId) || c.vehicle || null,
    reservation: resById.get(c.reservationId) || c.reservation || null,
  }))

  const inspectionForms = filterRecordsByCompanyScope(rawInspections, scope).map((f: any) => {
    const res = resById.get(f.reservationId)
    const veh = vehById.get(f.vehicleId)
    return {
      ...f,
      reservationNo: res?.reservationNo || "-",
      plate: veh?.plate || res?.vehicle?.plate || "-",
      customerName: custById.get(res?.customerId)?.name || res?.customer?.name || "-",
    }
  })

  const depositCharges = filterRecordsByCompanyScope(rawCharges, scope).map((chg: any) => {
    const res = resById.get(chg.reservationId)
    const veh = vehById.get(chg.vehicleId)
    return {
      ...chg,
      reservationNo: res?.reservationNo || "-",
      plate: veh?.plate || "-",
      customerName: custById.get(chg.customerId)?.name || "-",
    }
  })

  const tollPasses = filterRecordsByCompanyScope(rawTollPasses, scope).map((t: any) => {
    const matchedRes = t.matchedReservationId ? resById.get(t.matchedReservationId) : null
    return {
      ...t,
      matchedReservationNo: matchedRes?.reservationNo || null,
      matchedCustomerName: t.matchedCustomerId ? custById.get(t.matchedCustomerId)?.name || null : null,
    }
  })

  const rentalVehicleIds = new Set(rentalVehicles.map((v: any) => v.id))
  const trafficPenalties = rawPenalties
    .filter((p: any) => rentalVehicleIds.has(p.vehicleId) || Boolean(p.matchedReservationId))
    .map((p: any) => {
      const veh = vehById.get(p.vehicleId)
      const matchedRes = p.matchedReservationId ? resById.get(p.matchedReservationId) : null
      return {
        ...p,
        plate: veh?.plate || p.vehicleId,
        matchedReservationNo: matchedRes?.reservationNo || null,
        matchedCustomerName: p.matchedCustomerId
          ? custById.get(p.matchedCustomerId)?.name || null
          : null,
      }
    })

  return {
    classes,
    tariffs,
    extraServices,
    policyConfig,
    rentalVehicles,
    gantt,
    customers: customersBundle.customers,
    canRevealKvkkPii: customersBundle.canViewPii,
    isKvkkRevealed: customersBundle.isUnmasked,
    reservations,
    contracts,
    inspectionForms,
    depositCharges,
    tollPasses,
    trafficPenalties,
    kabisRecords: filterRecordsByCompanyScope(rawKabisRecords, scope),
    conflictLogs: filterRecordsByCompanyScope(rawConflictLogs, scope),
    chauffeurDrivers: drivers.filter((d: any) => d.isActive !== false),
    analytics,
    alerts,
  }
}
