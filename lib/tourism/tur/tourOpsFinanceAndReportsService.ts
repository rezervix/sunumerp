/**
 * Sunum ERP — Turizm Faz 4: Tur Operatörlüğü (turizm_tur)
 * Yolcu Rezervasyonu & İmzalı Manifesto PDF, Maliyet-Kâr & Acenta Komisyonu,
 * Faz 3 Otel Grup Bloğu & KBS Hazırlık Yeniden Kullanımı, Rehber Mobil Çevrimdışı Senkron,
 * Raporlar (XLSX/PDF) ve Bildirim Servisi
 */

// @ts-ignore — jspdf ESM bundle projede harici tip paketi olmadan kullanılır (exportReports.ts ile aynı kalıp)
import { jsPDF } from "jspdf"
import { prisma } from "@/lib/db"
import { maskDocumentNo, maskPhone, maskTckn } from "@/lib/logistics/fleet/constantsAndHelpers"
import { DemoDbEDocumentProvider } from "@/lib/logistics/providers/efatura-irsaliye"
import type { LogisticsReportPayload } from "@/lib/logistics/reports/constantsAndHelpers"
import {
  exportLogisticsReportToExcelBuffer,
  exportLogisticsReportToPdfBuffer,
} from "@/lib/logistics/reports/exportReports"
import { createNotificationMany } from "@/lib/services/notificationService"
import { MAIN_COMPANY_ID } from "@/lib/tourism/constants"
import {
  createHotelReservation,
  prepareOrRefreshKbsRecord,
} from "@/lib/tourism/otel"
import {
  applyCompanyScopeFilter,
  logTourismAudit,
  TourismDomainError,
} from "@/lib/tourism/security"
import type { TourismScopeContext } from "@/lib/tourism/types"
import {
  buildSeatSlotsFromLayout,
  computeAgencyCommission,
  computeTourProfitability,
  estimateTourRouteMetrics,
  TOUR_EXPENSE_CATEGORY_LABELS,
  validateSeatAssignmentRule,
  type TourExpenseCategory,
} from "./constantsAndHelpers"
import {
  assertNotTourGuideScoped,
  canUserViewPassengerKvkkPii,
  getTourResourceAvailabilityGantt,
  isUserTourGuideScoped,
  listSeatLayouts,
  listTourAgencies,
  listTourGuides,
  maskPassengerKvkk,
  withTourResourceLock,
} from "./tourCoreService"

function toAsciiTr(text: string): string {
  return String(text || "")
    .replace(/ğ/g, "g").replace(/Ğ/g, "G")
    .replace(/ü/g, "u").replace(/Ü/g, "U")
    .replace(/ş/g, "s").replace(/Ş/g, "S")
    .replace(/ı/g, "i").replace(/İ/g, "I")
    .replace(/ö/g, "o").replace(/Ö/g, "O")
    .replace(/ç/g, "c").replace(/Ç/g, "C")
}

// ── Yardımcı: Tur Doluluk Durumunu Güncelle (ON_SALE / GUARANTEED / FULL) ────

async function refreshTourCapacityStatus(tourId: string) {
  const dbAny = prisma as any
  const [tour, bookings] = await Promise.all([
    dbAny.turizmTourPackage.findUnique({ where: { id: tourId } }),
    dbAny.turizmTourBooking.findMany({ where: { tourId } }),
  ])
  if (!tour || tour.status === "CANCELLED" || tour.status === "COMPLETED" || tour.status === "DRAFT") {
    return
  }
  const confirmedPax = bookings
    .filter((b: any) => b.status !== "CANCELLED" && b.status !== "NO_SHOW")
    .reduce((s: number, b: any) => s + Number(b.passengerCount || 0), 0)

  let nextStatus = "ON_SALE"
  if (confirmedPax >= Number(tour.capacity || 1)) nextStatus = "FULL"
  else if (confirmedPax >= Number(tour.minParticipants || 1)) nextStatus = "GUARANTEED"

  if (nextStatus !== tour.status) {
    await dbAny.turizmTourPackage.update({
      where: { id: tour.id },
      data: { status: nextStatus, updatedAt: new Date() },
    })
  }
}

// ── C & H) Yolcu Rezervasyonu (Bireysel / Grup), Koltuk Kilidi & Faz 3 Otel/KBS ──

export async function createTourBookingWithPassengers(
  input: {
    tourId: string
    customerId: string
    bookingType?: "INDIVIDUAL" | "GROUP"
    groupName?: string | null
    agencyId?: string | null
    channelSource?: string
    paidAmountTry?: number
    paymentMethod?: string
    linkOvernightHotel?: boolean
    notes?: string
    passengers: Array<{
      fullName: string
      tckn?: string | null
      passportNo?: string | null
      nationality?: string
      birthDate?: string | null
      phone?: string | null
      gender?: "M" | "F" | "UNSPECIFIED"
      familyGroupCode?: string | null
      seatNumber?: string | null
      pickupStopId?: string | null
      isChild?: boolean
      hotelRoomId?: string | null
    }>
  },
  scope: TourismScopeContext
) {
  assertNotTourGuideScoped(scope, "Tur rezervasyonu oluşturma")
  if (!input.tourId || !input.customerId) {
    throw new TourismDomainError("VALIDATION_ERROR", "Tur ve cari müşteri seçimi zorunludur.", 400)
  }
  const paxList = Array.isArray(input.passengers) ? input.passengers.filter((p) => p?.fullName?.trim()) : []
  if (paxList.length === 0) {
    throw new TourismDomainError("VALIDATION_ERROR", "En az bir yolcu bilgisi girilmelidir.", 400)
  }

  return await withTourResourceLock(`tour-seat:${input.tourId}`, async () => {
    const dbAny = prisma as any
    const [tour, customer, existingBookings, existingPassengers, layouts, agencies] =
      await Promise.all([
        dbAny.turizmTourPackage.findUnique({ where: { id: input.tourId } }),
        dbAny.customer.findUnique({ where: { id: input.customerId } }),
        dbAny.turizmTourBooking.findMany({ where: { tourId: input.tourId } }),
        dbAny.turizmTourPassenger.findMany({ where: { tourId: input.tourId } }),
        dbAny.turizmTourSeatLayout.findMany(),
        dbAny.turizmTourAgency.findMany(),
      ])

    if (!tour) throw new TourismDomainError("NOT_FOUND", "Tur paketi bulunamadı.", 404)
    if (!customer) throw new TourismDomainError("NOT_FOUND", "Müşteri cari kaydı bulunamadı.", 404)
    if (tour.status === "CANCELLED" || tour.status === "COMPLETED") {
      throw new TourismDomainError("CONFLICT", "İptal edilmiş veya tamamlanmış tura rezervasyon alınamaz.", 409)
    }

    const activeBookings = existingBookings.filter(
      (b: any) => b.status !== "CANCELLED" && b.status !== "NO_SHOW"
    )
    const cancelledBookingIds = new Set(
      existingBookings
        .filter((b: any) => b.status === "CANCELLED" || b.status === "NO_SHOW")
        .map((b: any) => b.id)
    )
    const currentOccupiedCount = activeBookings.reduce(
      (s: number, b: any) => s + Number(b.passengerCount || 0),
      0
    )

    if (currentOccupiedCount + paxList.length > Number(tour.capacity || 1)) {
      const msg = `Kapasite aşımı: ${tour.code} turunda kalan koltuk ${
        Math.max(0, Number(tour.capacity) - currentOccupiedCount)
      }, talep edilen ${paxList.length} yolcu.`
      await dbAny.turizmTourConflictLog.create({
        data: {
          id: `trzm-tur-cnf-${Date.now()}-${Math.random().toString(36).slice(2, 5)}`,
          tourId: tour.id,
          tourCode: tour.code,
          resourceType: "CAPACITY",
          resourceId: tour.id,
          resourceLabel: tour.title,
          attemptedStartAt: new Date(tour.startAt),
          attemptedEndAt: new Date(tour.endAt),
          conflictSource: "SEAT_LOCK",
          conflictRefNo: tour.code,
          rejectionCode: "CAPACITY_EXCEEDED",
          rejectionMessage: msg,
          resolved: false,
          actorUserId: scope.userId,
          ownerCompanyId: scope.effectiveCompanyId || MAIN_COMPANY_ID,
          attemptedAt: new Date(),
        },
      })
      throw new TourismDomainError("CONFLICT", msg, 409, { rejectionCode: "CAPACITY_EXCEEDED" })
    }

    // Acenta kontenjan & komisyon kontrolü
    const agency = input.agencyId ? agencies.find((a: any) => a.id === input.agencyId) : null
    if (agency) {
      let quotaLimit = Number(agency.defaultQuotaPerTour || 10)
      if (tour.agencyQuotasJson) {
        try {
          const parsedQuotas = JSON.parse(tour.agencyQuotasJson)
          const matchQ = Array.isArray(parsedQuotas)
            ? parsedQuotas.find((q: any) => q.agencyId === agency.id)
            : null
          if (matchQ && Number(matchQ.quotaSeats) > 0) quotaLimit = Number(matchQ.quotaSeats)
        } catch {
          // ignore
        }
      }
      const agencyUsed = activeBookings
        .filter((b: any) => b.agencyId === agency.id)
        .reduce((s: number, b: any) => s + Number(b.passengerCount || 0), 0)
      if (agencyUsed + paxList.length > quotaLimit) {
        const msg = `Acenta kontenjan aşımı: ${agency.name} için bu turdaki ${quotaLimit} koltukluk kontenjan dolmuştur.`
        await dbAny.turizmTourConflictLog.create({
          data: {
            id: `trzm-tur-cnf-${Date.now()}-${Math.random().toString(36).slice(2, 5)}`,
            tourId: tour.id,
            tourCode: tour.code,
            resourceType: "AGENCY_QUOTA",
            resourceId: agency.id,
            resourceLabel: agency.name,
            attemptedStartAt: new Date(tour.startAt),
            attemptedEndAt: new Date(tour.endAt),
            conflictSource: "AGENCY_QUOTA",
            conflictRefNo: agency.code,
            rejectionCode: "AGENCY_QUOTA_EXCEEDED",
            rejectionMessage: msg,
            resolved: false,
            actorUserId: scope.userId,
            ownerCompanyId: scope.effectiveCompanyId || MAIN_COMPANY_ID,
            attemptedAt: new Date(),
          },
        })
        throw new TourismDomainError("CONFLICT", msg, 409, {
          rejectionCode: "AGENCY_QUOTA_EXCEEDED",
        })
      }
    }

    // Koltuk doğrulaması (tüm yolcular için artımlı kontrol)
    const layout =
      layouts.find((l: any) => l.id === tour.seatLayoutId) || {
        totalSeats: tour.capacity,
        seatsPerRow: 4,
        aisleAfterCol: 2,
      }
    const workingOccupied = existingPassengers
      .filter((p: any) => !cancelledBookingIds.has(p.bookingId))
      .map((p: any) => ({ ...p }))

    for (const p of paxList) {
      if (p.seatNumber) {
        const check = validateSeatAssignmentRule({
          seatNumber: String(p.seatNumber),
          passengerGender: p.gender || "UNSPECIFIED",
          familyGroupCode: p.familyGroupCode || (input.bookingType === "GROUP" ? input.groupName : null),
          layout,
          occupiedPassengers: workingOccupied,
          enforceGenderRule: tour.enforceGenderSeatRule !== false,
          allowFamilyOverride: tour.allowFamilySeatOverride !== false,
        })
        if (!check.ok) {
          throw new TourismDomainError("CONFLICT", check.message, 409, { rejectionCode: check.code })
        }
        workingOccupied.push({
          seatNumber: String(p.seatNumber),
          gender: p.gender || "UNSPECIFIED",
          familyGroupCode: p.familyGroupCode || (input.bookingType === "GROUP" ? input.groupName : null),
          fullName: p.fullName,
        })
      }
    }

    // Tutar, Kısmi Ödeme ve Acenta Komisyonu Hesabı
    const totalPriceTry = Number(
      paxList
        .reduce(
          (sum, p) => sum + Number(p.isChild ? tour.childPriceTry : tour.adultPriceTry),
          0
        )
        .toFixed(2)
    )
    const paidAmountTry = Math.min(totalPriceTry, Math.max(0, Number(input.paidAmountTry || 0)))
    const balanceDueTry = Number((totalPriceTry - paidAmountTry).toFixed(2))
    const paymentStatus =
      paidAmountTry <= 0 ? "UNPAID" : balanceDueTry <= 0.01 ? "PAID" : "PARTIAL"
    const agencyCommissionRatePct = agency ? Number(agency.commissionRatePct || 0) : 0
    const agencyCommissionTry = computeAgencyCommission(totalPriceTry, agencyCommissionRatePct)

    const now = new Date()
    const bookingNo = `TRZ-2026-${String(Date.now()).slice(-5)}-${Math.random().toString(36).slice(2, 4).toUpperCase()}`

    const booking = await dbAny.turizmTourBooking.create({
      data: {
        id: `trzm-tur-bkg-${Date.now()}-${Math.random().toString(36).slice(2, 5)}`,
        bookingNo,
        tourId: tour.id,
        customerId: customer.id,
        branchId: tour.branchId || scope.branchId || "local-debug-branch",
        bookingType: input.bookingType || (paxList.length > 1 ? "GROUP" : "INDIVIDUAL"),
        groupName: input.groupName || null,
        agencyId: agency?.id || null,
        agencyName: agency?.name || null,
        channelSource: String(
          input.channelSource || (agency ? "AGENCY_B2B" : "DIRECT_WEB")
        ).toUpperCase(),
        passengerCount: paxList.length,
        totalPriceTry,
        paidAmountTry,
        balanceDueTry,
        agencyCommissionRatePct,
        agencyCommissionTry,
        paymentStatus,
        status: "CONFIRMED",
        notes: input.notes || null,
        ownerCompanyId: scope.effectiveCompanyId || MAIN_COMPANY_ID,
        createdBy: scope.userId,
        createdAt: now,
        updatedAt: now,
      },
    })

    // Yolcuları oluştur (ve istenirse konaklamalı turda Faz 3 Otel + KBS bağla)
    const createdPassengers: any[] = []
    const linkedHotelResIds: string[] = []
    let candidateRoomIds: string[] = []
    if (tour.tourType === "MULTI_DAY" && tour.hotelRoomIdsJson) {
      try {
        candidateRoomIds = JSON.parse(tour.hotelRoomIdsJson)
      } catch {
        candidateRoomIds = []
      }
    }

    for (let idx = 0; idx < paxList.length; idx++) {
      const p = paxList[idx]
      let hotelReservationId: string | null = null
      let kbsRecordId: string | null = null
      const assignedHotelRoomId =
        p.hotelRoomId ||
        (input.linkOvernightHotel && candidateRoomIds.length > 0
          ? candidateRoomIds[idx % candidateRoomIds.length]
          : null)

      // H) Konaklamalı turlarda Faz 3 otel rezervasyonu & Faz 3 KBS kalıbını doğrudan yeniden kullan!
      if (input.linkOvernightHotel && tour.tourType === "MULTI_DAY" && assignedHotelRoomId && idx === 0) {
        try {
          const hRes = await createHotelReservation(
            {
              roomId: assignedHotelRoomId,
              customerId: customer.id,
              allotmentId: tour.hotelAllotmentId || null,
              checkInDate: tour.startAt,
              checkOutDate: tour.endAt,
              boardType: "HB",
              channelSource: "AGENCY_B2B",
              agencyName: agency?.name || `Tur Grubu (${tour.code})`,
              adultsCount: Math.min(3, paxList.length),
              notes: `${tour.code} (${bookingNo}) konaklamalı tur grup bloğu rezervasyonu`,
            },
            scope
          )
          hotelReservationId = hRes.id
          linkedHotelResIds.push(hRes.id)
          const kbsRec = await prepareOrRefreshKbsRecord(
            { reservationId: hRes.id, notificationType: "MISAFIR_GIRIS" },
            scope
          )
          kbsRecordId = kbsRec.id
        } catch {
          // Oda zaten blokluysa yolcu kaydı yine devam eder; manuel oda eşleştirmesi yapılabilir
        }
      }

      const pax = await dbAny.turizmTourPassenger.create({
        data: {
          id: `trzm-tur-pax-${Date.now()}-${idx}-${Math.random().toString(36).slice(2, 4)}`,
          bookingId: booking.id,
          tourId: tour.id,
          fullName: p.fullName.trim(),
          tckn: p.tckn || null,
          passportNo: p.passportNo || null,
          nationality: String(p.nationality || "TR").toUpperCase(),
          birthDate: p.birthDate ? new Date(p.birthDate) : null,
          phone: p.phone || null,
          gender: String(p.gender || "UNSPECIFIED").toUpperCase(),
          familyGroupCode: p.familyGroupCode || (input.bookingType === "GROUP" ? input.groupName : null),
          seatNumber: p.seatNumber ? String(p.seatNumber) : null,
          pickupStopId: p.pickupStopId || null,
          boardingStatus: "WAITING",
          hotelRoomId: assignedHotelRoomId,
          hotelReservationId,
          kbsRecordId,
          ownerCompanyId: scope.effectiveCompanyId || MAIN_COMPANY_ID,
          createdAt: now,
          updatedAt: now,
        },
      })
      createdPassengers.push(pax)
    }

    if (linkedHotelResIds.length > 0) {
      await dbAny.turizmTourBooking.update({
        where: { id: booking.id },
        data: { hotelReservationIdsJson: JSON.stringify(linkedHotelResIds) },
      })
    }

    await refreshTourCapacityStatus(tour.id)

    await logTourismAudit({
      userId: scope.userId,
      action: "CREATE_TOUR_BOOKING",
      resource: "turizm_tur",
      resourceId: booking.id,
      moduleKey: "turizm_tur",
      branchId: scope.branchId,
      companyId: scope.effectiveCompanyId,
      metadata: {
        bookingNo: booking.bookingNo,
        tourCode: tour.code,
        passengerCount: paxList.length,
        totalPriceTry,
        agencyCommissionTry,
      },
    })

    return { booking, passengers: createdPassengers, linkedHotelResIds }
  })
}

export async function recordBookingPayment(
  input: {
    bookingId: string
    amountTry: number
    paymentMethod?: string
    postToFinance?: boolean
    allowFromGuide?: boolean
  },
  scope: TourismScopeContext
) {
  if (!input.allowFromGuide) {
    assertNotTourGuideScoped(scope, "Rezervasyon tahsilat kaydı")
  }
  const dbAny = prisma as any
  const booking = await dbAny.turizmTourBooking.findUnique({ where: { id: input.bookingId } })
  if (!booking) throw new TourismDomainError("NOT_FOUND", "Rezervasyon bulunamadı.", 404)

  const addAmt = Math.max(0, Number(input.amountTry || 0))
  if (addAmt <= 0) {
    throw new TourismDomainError("VALIDATION_ERROR", "Tahsilat tutarı 0'dan büyük olmalıdır.", 400)
  }

  const nextPaid = Number(
    Math.min(Number(booking.totalPriceTry || 0), Number(booking.paidAmountTry || 0) + addAmt).toFixed(2)
  )
  const nextBalance = Number(Math.max(0, Number(booking.totalPriceTry || 0) - nextPaid).toFixed(2))
  const nextPaymentStatus = nextBalance <= 0.01 ? "PAID" : "PARTIAL"

  let financeId = booking.financeId || null
  if (input.postToFinance !== false) {
    const fin = await dbAny.finance.create({
      data: {
        id: `trzm-tur-fin-${Date.now()}-${Math.random().toString(36).slice(2, 5)}`,
        branchId: booking.branchId || scope.branchId || "local-debug-branch",
        type: "INCOME",
        amount: addAmt,
        category: "Tur Satış & Tahsilat Geliri",
        description: `Tur Tahsilatı (${booking.bookingNo} · ${input.paymentMethod || "Kredi Kartı/Nakit"})`,
        status: "approved",
        approvedBy: scope.userId,
        date: new Date(),
      },
    })
    financeId = fin.id
  }

  const updated = await dbAny.turizmTourBooking.update({
    where: { id: booking.id },
    data: {
      paidAmountTry: nextPaid,
      balanceDueTry: nextBalance,
      paymentStatus: nextPaymentStatus,
      financeId,
      updatedAt: new Date(),
    },
  })

  await logTourismAudit({
    userId: scope.userId,
    action: "RECORD_TOUR_BOOKING_PAYMENT",
    resource: "turizm_tur",
    resourceId: updated.id,
    moduleKey: "turizm_tur",
    branchId: scope.branchId,
    companyId: scope.effectiveCompanyId,
    metadata: { bookingNo: updated.bookingNo, addedAmountTry: addAmt, balanceDueTry: nextBalance },
  })
  return updated
}

export async function cancelTourBooking(
  input: { bookingId: string; cancelReason?: string },
  scope: TourismScopeContext
) {
  assertNotTourGuideScoped(scope, "Tur rezervasyon iptali")
  const dbAny = prisma as any
  const booking = await dbAny.turizmTourBooking.findUnique({ where: { id: input.bookingId } })
  if (!booking) throw new TourismDomainError("NOT_FOUND", "Rezervasyon bulunamadı.", 404)

  const updated = await dbAny.turizmTourBooking.update({
    where: { id: booking.id },
    data: {
      status: "CANCELLED",
      paymentStatus: Number(booking.paidAmountTry || 0) > 0 ? "REFUNDED" : booking.paymentStatus,
      cancelReason: input.cancelReason || "Müşteri/acenta talebiyle iptal",
      updatedAt: new Date(),
    },
  })
  await refreshTourCapacityStatus(booking.tourId)
  return updated
}

export async function issueTourBookingInvoice(
  input: { bookingId: string },
  scope: TourismScopeContext
) {
  assertNotTourGuideScoped(scope, "Tur faturası / E-Belge kesimi")
  const dbAny = prisma as any
  const booking = await dbAny.turizmTourBooking.findUnique({ where: { id: input.bookingId } })
  if (!booking) throw new TourismDomainError("NOT_FOUND", "Faturalandırılacak tur rezervasyonu bulunamadı.", 404)
  const [tour, customer] = await Promise.all([
    dbAny.turizmTourPackage.findUnique({ where: { id: booking.tourId } }),
    dbAny.customer.findUnique({ where: { id: booking.customerId } }),
  ])

  const edocProvider = new DemoDbEDocumentProvider()
  const unitPrice = Number((Number(booking.totalPriceTry || 0) / Math.max(1, Number(booking.passengerCount || 1))).toFixed(2))
  const edocRes = await edocProvider.submitEDocument({
    documentType: booking.agencyName || customer?.company ? "E_FATURA" : "E_ARSIV",
    relatedOrderNo: booking.bookingNo,
    receiverTitle: booking.agencyName || customer?.company || customer?.name || "Tur Yolcusu",
    receiverVknTckn: customer?.tckn || "11111111111",
    lines: [
      {
        sku: tour?.code || "TUR-PAKET",
        name: `${tour?.title || "Tur Paketi"} (${booking.passengerCount} Yolcu)`,
        quantity: Number(booking.passengerCount || 1),
        unit: "Kişi",
        unitPrice,
        vatRate: 20,
      },
    ],
  })

  const fin = await dbAny.finance.create({
    data: {
      id: `trzm-tur-fin-${Date.now()}-${Math.random().toString(36).slice(2, 5)}`,
      branchId: booking.branchId || scope.branchId || "local-debug-branch",
      type: "INCOME",
      amount: Number(booking.totalPriceTry || 0),
      category: "Tur Paket Satış Geliri",
      description: `${tour?.code || "TUR"} — ${booking.bookingNo} Faturası (${edocRes.documentNo})`,
      status: "approved",
      approvedBy: scope.userId,
      date: new Date(),
    },
  })

  const updated = await dbAny.turizmTourBooking.update({
    where: { id: booking.id },
    data: {
      financeId: fin.id,
      eDocumentId: edocRes.ettnUuid,
      eDocumentNo: edocRes.documentNo,
      updatedAt: new Date(),
    },
  })

  return { booking: updated, eDocument: edocRes, financeRecord: fin }
}

// ── C) İmzalı Yolcu Manifestosu PDF Üretimi (jsPDF) ──────────────────────────

export async function buildSignedManifestoPdfBuffer(
  tourId: string,
  scope: TourismScopeContext
): Promise<{ buffer: Buffer; fileName: string }> {
  const dbAny = prisma as any
  const [tour, bookings, passengers, stops, vehicles, drivers, guides] = await Promise.all([
    dbAny.turizmTourPackage.findUnique({ where: { id: tourId } }),
    dbAny.turizmTourBooking.findMany({ where: { tourId } }),
    dbAny.turizmTourPassenger.findMany({ where: { tourId } }),
    dbAny.turizmTourPickupStop.findMany({ where: { tourId } }),
    dbAny.lojistikVehicle.findMany().catch(() => []),
    dbAny.lojistikDriver.findMany().catch(() => []),
    dbAny.turizmTourGuide.findMany().catch(() => []),
  ])
  if (!tour) throw new TourismDomainError("NOT_FOUND", "Manifesto üretilecek tur bulunamadı.", 404)

  const cancelledIds = new Set(
    bookings.filter((b: any) => b.status === "CANCELLED").map((b: any) => b.id)
  )
  const activePax = passengers
    .filter((p: any) => !cancelledIds.has(p.bookingId))
    .sort((a: any, b: any) => Number(a.seatNumber || 999) - Number(b.seatNumber || 999))
  const stopMap = new Map<string, any>(stops.map((s: any) => [s.id, s]))
  const veh = vehicles.find((v: any) => v.id === tour.vehicleId)
  const drv = drivers.find((d: any) => d.id === tour.driverId)
  const gd = guides.find((g: any) => g.id === tour.guideId)

  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" })
  doc.setFontSize(14)
  doc.text(toAsciiTr(`SUNUM ERP - RESMI YOLCU MANIFESTOSU (${tour.code})`), 14, 16)
  doc.setFontSize(10)
  doc.text(toAsciiTr(`Tur: ${tour.title} (${tour.departureCity} -> ${tour.destinationCity})`), 14, 24)
  doc.text(
    toAsciiTr(
      `Tarih: ${String(tour.startAt).slice(0, 16).replace("T", " ")} / ${String(tour.endAt).slice(0, 16).replace("T", " ")}`
    ),
    14,
    30
  )
  doc.text(
    toAsciiTr(
      `Arac: ${veh ? `${veh.plate} (${veh.brand} ${veh.model})` : "Atanmadi"} | Sofor: ${drv?.fullName || "-"} | Rehber: ${gd?.fullName || "-"}`
    ),
    14,
    36
  )
  doc.text(toAsciiTr(`Toplam Yolcu: ${activePax.length} / Kapasite: ${tour.capacity} (KVKK Maskeli)`), 14, 42)

  let y = 52
  doc.setFontSize(9)
  doc.text("Koltuk | Ad Soyad               | Uyruk | Kimlik (Maskeli) | Binis Duragi         | Durum", 14, y)
  doc.line(14, y + 2, 196, y + 2)
  y += 7

  for (const p of activePax) {
    if (y > 260) {
      doc.addPage()
      y = 20
    }
    const stp = p.pickupStopId ? stopMap.get(p.pickupStopId) : null
    const idMasked = maskTckn(p.tckn) || maskDocumentNo(p.passportNo) || "-"
    const line = `${String(p.seatNumber || "-").padEnd(6)} | ${toAsciiTr(p.fullName).slice(0, 22).padEnd(22)} | ${String(
      p.nationality || "TR"
    ).padEnd(5)} | ${String(idMasked).padEnd(16)} | ${toAsciiTr(
      stp ? `${stp.pickupTime} ${stp.stopName}` : "-"
    )
      .slice(0, 20)
      .padEnd(20)} | ${p.boardingStatus}`
    doc.text(line, 14, y)
    y += 6
  }

  y = Math.min(272, Math.max(y + 12, 230))
  doc.line(14, y, 196, y)
  doc.text(toAsciiTr("Rehber Imza: _______________________"), 14, y + 10)
  doc.text(toAsciiTr("Sofor / Kaptan Imza: _______________________"), 110, y + 10)
  doc.setFontSize(8)
  doc.text(
    toAsciiTr(`Olusturma: ${new Date().toISOString().slice(0, 19).replace("T", " ")} | Kullanici: ${scope.username}`),
    14,
    y + 20
  )

  const arrBuf = doc.output("arraybuffer")
  return {
    buffer: Buffer.from(arrBuf),
    fileName: `SunumERP_Manifesto_${tour.code}.pdf`,
  }
}

// ── F) Tur Gider Kalemleri & Finans Entegrasyonu ─────────────────────────────

export async function addTourExpenseItem(
  input: {
    tourId: string
    category: TourExpenseCategory
    description: string
    quantity?: number
    unitCostTry: number
    sourceRefType?: string
    sourceRefId?: string
    postToFinance?: boolean
  },
  scope: TourismScopeContext
) {
  assertNotTourGuideScoped(scope, "Tur gider kalemi ekleme")
  const dbAny = prisma as any
  const tour = await dbAny.turizmTourPackage.findUnique({ where: { id: input.tourId } })
  if (!tour) throw new TourismDomainError("NOT_FOUND", "Tur bulunamadı.", 404)

  const quantity = Math.max(0.1, Number(input.quantity ?? 1))
  const unitCostTry = Math.max(0, Number(input.unitCostTry || 0))
  const totalCostTry = Number((quantity * unitCostTry).toFixed(2))
  if (totalCostTry <= 0) {
    throw new TourismDomainError("VALIDATION_ERROR", "Gider tutarı 0'dan büyük olmalıdır.", 400)
  }

  let financeId: string | null = null
  if (input.postToFinance !== false) {
    const fin = await dbAny.finance.create({
      data: {
        id: `trzm-tur-fin-exp-${Date.now()}-${Math.random().toString(36).slice(2, 5)}`,
        branchId: tour.branchId || scope.branchId || "local-debug-branch",
        type: "EXPENSE",
        amount: totalCostTry,
        category: TOUR_EXPENSE_CATEGORY_LABELS[input.category] || "Tur Operasyon Gideri",
        description: `${tour.code} — ${input.description}`,
        status: "approved",
        approvedBy: scope.userId,
        vehicleId: input.category === "VEHICLE_FUEL" ? tour.vehicleId || null : null,
        date: new Date(),
      },
    })
    financeId = fin.id
  }

  const saved = await dbAny.turizmTourExpenseItem.create({
    data: {
      id: `trzm-tur-exp-${Date.now()}-${Math.random().toString(36).slice(2, 5)}`,
      tourId: tour.id,
      category: input.category,
      description: input.description.trim(),
      quantity,
      unitCostTry,
      totalCostTry,
      sourceRefType: input.sourceRefType || "MANUAL",
      sourceRefId: input.sourceRefId || null,
      financeId,
      recordedBy: scope.userId,
      ownerCompanyId: scope.effectiveCompanyId || MAIN_COMPANY_ID,
      createdAt: new Date(),
    },
  })

  await logTourismAudit({
    userId: scope.userId,
    action: "ADD_TOUR_EXPENSE",
    resource: "turizm_tur",
    resourceId: saved.id,
    moduleKey: "turizm_tur",
    branchId: scope.branchId,
    companyId: scope.effectiveCompanyId,
    metadata: { tourCode: tour.code, category: saved.category, totalCostTry },
  })
  return saved
}

// ── H) Konaklamalı Tur İçin Faz 3 Otel Grup Bloğu & KBS Hazırlık Tetikleyici ──

export async function syncOvernightTourHotelAndKbs(
  input: { tourId: string },
  scope: TourismScopeContext
) {
  assertNotTourGuideScoped(scope, "Konaklamalı tur otel & KBS senkronizasyonu")
  const dbAny = prisma as any
  const [tour, bookings, passengers] = await Promise.all([
    dbAny.turizmTourPackage.findUnique({ where: { id: input.tourId } }),
    dbAny.turizmTourBooking.findMany({ where: { tourId: input.tourId } }),
    dbAny.turizmTourPassenger.findMany({ where: { tourId: input.tourId } }),
  ])
  if (!tour) throw new TourismDomainError("NOT_FOUND", "Tur bulunamadı.", 404)
  if (tour.tourType !== "MULTI_DAY") {
    throw new TourismDomainError("VALIDATION_ERROR", "Yalnızca konaklamalı turlar otel ve KBS ile bağlanabilir.", 400)
  }

  let roomIds: string[] = []
  try {
    roomIds = tour.hotelRoomIdsJson ? JSON.parse(tour.hotelRoomIdsJson) : []
  } catch {
    roomIds = []
  }
  if (roomIds.length === 0) {
    throw new TourismDomainError("VALIDATION_ERROR", "Bu tura henüz Faz 3 otel oda bloğu tanımlanmamış.", 400)
  }

  const activeBookings = bookings.filter((b: any) => b.status !== "CANCELLED")
  let createdHotelReservations = 0
  let preparedKbsRecords = 0

  for (let idx = 0; idx < activeBookings.length; idx++) {
    const bkg = activeBookings[idx]
    const bPax = passengers.filter((p: any) => p.bookingId === bkg.id)
    const existingResId = bPax.find((p: any) => p.hotelReservationId)?.hotelReservationId

    let hotelResId = existingResId
    if (!hotelResId) {
      const targetRoomId = roomIds[idx % roomIds.length]
      try {
        const hRes = await createHotelReservation(
          {
            roomId: targetRoomId,
            customerId: bkg.customerId,
            allotmentId: tour.hotelAllotmentId || null,
            checkInDate: tour.startAt,
            checkOutDate: tour.endAt,
            boardType: "HB",
            channelSource: "AGENCY_B2B",
            agencyName: bkg.agencyName || `Tur Grubu (${tour.code})`,
            adultsCount: Math.min(3, Math.max(1, bPax.length)),
            notes: `${tour.code} konaklamalı tur oda bloğu (${bkg.bookingNo})`,
          },
          scope
        )
        hotelResId = hRes.id
        createdHotelReservations++
      } catch {
        continue
      }
    }

    if (hotelResId) {
      // Faz 3'teki mevcut KBS hazırlık mekanizmasını doğrudan yeniden kullan (ikinci KBS kurma!)
      const kbsRec = await prepareOrRefreshKbsRecord(
        { reservationId: hotelResId, notificationType: "MISAFIR_GIRIS" },
        scope
      )
      preparedKbsRecords++
      for (const p of bPax) {
        await dbAny.turizmTourPassenger.update({
          where: { id: p.id },
          data: {
            hotelRoomId: p.hotelRoomId || roomIds[idx % roomIds.length],
            hotelReservationId: hotelResId,
            kbsRecordId: kbsRec.id,
            updatedAt: new Date(),
          },
        })
      }
    }
  }

  return { tourId: tour.id, createdHotelReservations, preparedKbsRecords }
}

// ── I) Rehber / Şoför Mobil Yoklama, Saha Notu, Tahsilat & Çevrimdışı Senkron ──

export async function updatePassengerBoardingStatus(
  input: {
    passengerId: string
    boardingStatus: "WAITING" | "BOARDED" | "NO_SHOW"
    emergencyNote?: string | null
    offlineIdempotencyKey?: string
  },
  scope: TourismScopeContext
) {
  const dbAny = prisma as any
  const pax = await dbAny.turizmTourPassenger.findUnique({ where: { id: input.passengerId } })
  if (!pax) throw new TourismDomainError("NOT_FOUND", "Yolcu kaydı bulunamadı.", 404)

  const now = new Date()
  const updated = await dbAny.turizmTourPassenger.update({
    where: { id: pax.id },
    data: {
      boardingStatus: input.boardingStatus,
      boardedAt: input.boardingStatus === "BOARDED" ? now : pax.boardedAt,
      emergencyNote: input.emergencyNote !== undefined ? input.emergencyNote : pax.emergencyNote,
      offlineIdempotencyKey: input.offlineIdempotencyKey || pax.offlineIdempotencyKey || null,
      updatedAt: now,
    },
  })

  await logTourismAudit({
    userId: scope.userId,
    action: "UPDATE_TOUR_PASSENGER_BOARDING",
    resource: "turizm_tur",
    resourceId: updated.id,
    moduleKey: "turizm_tur",
    branchId: scope.branchId,
    companyId: scope.effectiveCompanyId,
    metadata: { tourId: updated.tourId, boardingStatus: updated.boardingStatus },
  })
  return updated
}

export async function recordGuideFieldLogOrCollection(
  input: {
    tourId: string
    logType: "BOARDING_SYNC" | "EMERGENCY_NOTE" | "FIELD_COLLECTION" | "INCIDENT"
    bookingId?: string | null
    passengerId?: string | null
    amountTry?: number
    paymentMethod?: string
    note: string
    offlineIdempotencyKey?: string
  },
  scope: TourismScopeContext
) {
  const dbAny = prisma as any
  if (input.offlineIdempotencyKey) {
    const existingLogs = await dbAny.turizmTourFieldLog.findMany()
    const dup = existingLogs.find((l: any) => l.offlineIdempotencyKey === input.offlineIdempotencyKey)
    if (dup) return { fieldLog: dup, duplicateIgnored: true }
  }

  if (input.logType === "FIELD_COLLECTION" && input.bookingId && Number(input.amountTry || 0) > 0) {
    await recordBookingPayment(
      {
        bookingId: input.bookingId,
        amountTry: Number(input.amountTry),
        paymentMethod: input.paymentMethod || "Saha Nakit (Rehber)",
        postToFinance: true,
        allowFromGuide: true,
      },
      scope
    )
  }

  const saved = await dbAny.turizmTourFieldLog.create({
    data: {
      id: `trzm-tur-fld-${Date.now()}-${Math.random().toString(36).slice(2, 5)}`,
      tourId: input.tourId,
      logType: input.logType,
      bookingId: input.bookingId || null,
      passengerId: input.passengerId || null,
      amountTry: Math.max(0, Number(input.amountTry || 0)),
      paymentMethod: input.paymentMethod || null,
      note: String(input.note || "Saha kaydı"),
      recordedByUserId: scope.userId,
      recordedByName: scope.username,
      offlineIdempotencyKey: input.offlineIdempotencyKey || null,
      ownerCompanyId: scope.effectiveCompanyId || MAIN_COMPANY_ID,
      recordedAt: new Date(),
    },
  })
  return { fieldLog: saved, duplicateIgnored: false }
}

export async function syncOfflineGuideBatch(
  input: {
    operations: Array<{
      offlineIdempotencyKey: string
      tourId: string
      operationType: "BOARDING_CHECKIN" | "EMERGENCY_NOTE" | "FIELD_COLLECTION"
      passengerId?: string
      boardingStatus?: "BOARDED" | "NO_SHOW" | "WAITING"
      bookingId?: string
      amountTry?: number
      paymentMethod?: string
      note?: string
    }>
  },
  scope: TourismScopeContext
) {
  const dbAny = prisma as any
  const [existingPax, existingLogs] = await Promise.all([
    dbAny.turizmTourPassenger.findMany(),
    dbAny.turizmTourFieldLog.findMany(),
  ])
  const seenKeys = new Set<string>([
    ...existingPax.map((p: any) => p.offlineIdempotencyKey).filter(Boolean),
    ...existingLogs.map((l: any) => l.offlineIdempotencyKey).filter(Boolean),
  ])

  const results: Array<{
    offlineIdempotencyKey: string
    status: "SYNCED" | "DUPLICATE_IGNORED" | "ERROR"
    message?: string
  }> = []

  for (const op of input.operations || []) {
    const key = String(op.offlineIdempotencyKey || "").trim()
    if (!key) {
      results.push({ offlineIdempotencyKey: "", status: "ERROR", message: "Anahtar eksik." })
      continue
    }
    if (seenKeys.has(key)) {
      results.push({ offlineIdempotencyKey: key, status: "DUPLICATE_IGNORED" })
      continue
    }
    try {
      if (op.operationType === "BOARDING_CHECKIN" && op.passengerId) {
        await updatePassengerBoardingStatus(
          {
            passengerId: op.passengerId,
            boardingStatus: op.boardingStatus || "BOARDED",
            emergencyNote: op.note,
            offlineIdempotencyKey: key,
          },
          scope
        )
        seenKeys.add(key)
        results.push({ offlineIdempotencyKey: key, status: "SYNCED" })
      } else {
        const res = await recordGuideFieldLogOrCollection(
          {
            tourId: op.tourId,
            logType: op.operationType === "FIELD_COLLECTION" ? "FIELD_COLLECTION" : "EMERGENCY_NOTE",
            bookingId: op.bookingId || null,
            passengerId: op.passengerId || null,
            amountTry: op.amountTry,
            paymentMethod: op.paymentMethod,
            note: op.note || "Çevrimdışı saha kaydı",
            offlineIdempotencyKey: key,
          },
          scope
        )
        seenKeys.add(key)
        results.push({
          offlineIdempotencyKey: key,
          status: res.duplicateIgnored ? "DUPLICATE_IGNORED" : "SYNCED",
        })
      }
    } catch (err: any) {
      results.push({
        offlineIdempotencyKey: key,
        status: "ERROR",
        message: err?.message || "Senkronizasyon hatası",
      })
    }
  }

  return {
    totalProcessed: results.length,
    syncedCount: results.filter((r) => r.status === "SYNCED").length,
    duplicateIgnoredCount: results.filter((r) => r.status === "DUPLICATE_IGNORED").length,
    errorCount: results.filter((r) => r.status === "ERROR").length,
    results,
  }
}

export async function getTourGuideMobileSnapshot(scope: TourismScopeContext) {
  const dbAny = prisma as any
  const [guides, tours, bookings, passengers, stops, fieldLogs] = await Promise.all([
    dbAny.turizmTourGuide.findMany(),
    dbAny.turizmTourPackage.findMany({ orderBy: { startAt: "asc" } }),
    dbAny.turizmTourBooking.findMany(),
    dbAny.turizmTourPassenger.findMany(),
    dbAny.turizmTourPickupStop.findMany(),
    dbAny.turizmTourFieldLog.findMany({ orderBy: { recordedAt: "desc" } }),
  ])

  const isRestrictedGuide = isUserTourGuideScoped(scope)
  const ownGuideIds = new Set(
    guides.filter((g: any) => g.userId === scope.userId).map((g: any) => g.id)
  )

  let visibleTours = applyCompanyScopeFilter(tours, scope).filter((t: any) => t.status !== "CANCELLED")
  if (isRestrictedGuide) {
    visibleTours = visibleTours.filter((t: any) => ownGuideIds.has(t.guideId))
  }

  const enrichedTours = visibleTours.map((t: any) => {
    const tBookings = bookings.filter((b: any) => b.tourId === t.id && b.status !== "CANCELLED")
    const activeBkgIds = new Set(tBookings.map((b: any) => b.id))
    const tStops = stops
      .filter((s: any) => s.tourId === t.id)
      .sort((a: any, b: any) => a.sequenceNo - b.sequenceNo)
    const stopById = new Map<string, any>(tStops.map((s: any) => [s.id, s]))
    const tPax = passengers
      .filter((p: any) => p.tourId === t.id && activeBkgIds.has(p.bookingId))
      .sort((a: any, b: any) => Number(a.seatNumber || 999) - Number(b.seatNumber || 999))
      .map((p: any) => ({
        ...maskPassengerKvkk(p, false),
        pickupStopLabel: p.pickupStopId
          ? `${stopById.get(p.pickupStopId)?.pickupTime || ""} ${stopById.get(p.pickupStopId)?.stopName || ""}`.trim()
          : "Ana Hareket Noktası",
      }))
    const tLogs = fieldLogs.filter((l: any) => l.tourId === t.id)

    return {
      ...t,
      stops: tStops,
      bookings: tBookings.map((b: any) => ({
        id: b.id,
        bookingNo: b.bookingNo,
        groupName: b.groupName,
        passengerCount: b.passengerCount,
        totalPriceTry: b.totalPriceTry,
        paidAmountTry: b.paidAmountTry,
        balanceDueTry: b.balanceDueTry,
        paymentStatus: b.paymentStatus,
      })),
      passengers: tPax,
      fieldLogs: tLogs,
      boardedCount: tPax.filter((p: any) => p.boardingStatus === "BOARDED").length,
      waitingCount: tPax.filter((p: any) => p.boardingStatus === "WAITING").length,
    }
  })

  return {
    isRestrictedGuide,
    staffUser: { userId: scope.userId, username: scope.username },
    tours: enrichedTours,
  }
}

// ── J) Raporlar & Analitik (XLSX / PDF) ──────────────────────────────────────

export async function buildTourAnalyticsAndReports(scope: TourismScopeContext) {
  assertNotTourGuideScoped(scope, "Tur kârlılık ve acenta raporları")
  const dbAny = prisma as any
  const [tours, bookings, expenses, agencies, vehicles, fuelLogs] = await Promise.all([
    dbAny.turizmTourPackage.findMany(),
    dbAny.turizmTourBooking.findMany(),
    dbAny.turizmTourExpenseItem.findMany(),
    dbAny.turizmTourAgency.findMany(),
    dbAny.lojistikVehicle.findMany().catch(() => []),
    dbAny.lojistikFuelLog.findMany().catch(() => []),
  ])

  const scopedTours = applyCompanyScopeFilter(tours, scope)
  const scopedBookings = applyCompanyScopeFilter(bookings, scope)
  const scopedExpenses = applyCompanyScopeFilter(expenses, scope)
  const scopedAgencies = applyCompanyScopeFilter(agencies, scope)
  const vehMap = new Map<string, any>(vehicles.map((v: any) => [v.id, v]))

  const tourProfitabilityRows = scopedTours.map((t: any) => {
    const tBookings = scopedBookings.filter((b: any) => b.tourId === t.id)
    const tExpenses = scopedExpenses.filter((e: any) => e.tourId === t.id)
    // Filo yakıt kayıtlarından araç bazlı ortalama maliyet tahmini (varsa)
    const vehFuel = t.vehicleId
      ? fuelLogs
          .filter((f: any) => f.vehicleId === t.vehicleId)
          .slice(0, 1)
          .reduce((s: number, f: any) => s + Number(f.totalAmountTry || 0), 0)
      : 0
    return computeTourProfitability({
      tour: t,
      bookings: tBookings,
      expenses: tExpenses,
      fleetFuelCostTry: t.status === "CANCELLED" ? 0 : vehFuel,
    })
  })

  const activeRows = tourProfitabilityRows.filter((r) => r.status !== "CANCELLED")
  const totalGrossRevenueTry = Number(
    activeRows.reduce((s, r) => s + r.grossRevenueTry, 0).toFixed(2)
  )
  const totalCostsTry = Number(
    activeRows.reduce((s, r) => s + r.totalCostsWithCommissionTry, 0).toFixed(2)
  )
  const totalNetProfitTry = Number((totalGrossRevenueTry - totalCostsTry).toFixed(2))
  const totalPassengers = activeRows.reduce((s, r) => s + r.confirmedPassengers, 0)
  const totalCapacity = activeRows.reduce((s, r) => s + r.capacity, 0)
  const avgOccupancyPct =
    totalCapacity > 0 ? Number(((totalPassengers / totalCapacity) * 100).toFixed(1)) : 0

  const totalBookingsCount = scopedBookings.length
  const cancelledBookingsCount = scopedBookings.filter(
    (b: any) => b.status === "CANCELLED" || b.status === "NO_SHOW"
  ).length
  const cancellationRatePct =
    totalBookingsCount > 0
      ? Number(((cancelledBookingsCount / totalBookingsCount) * 100).toFixed(1))
      : 0

  // Acenta performans raporu
  const agencyPerformanceRows = scopedAgencies.map((ag: any) => {
    const agBookings = scopedBookings.filter(
      (b: any) => b.agencyId === ag.id && b.status !== "CANCELLED" && b.status !== "NO_SHOW"
    )
    const passengersSold = agBookings.reduce((s: number, b: any) => s + Number(b.passengerCount || 0), 0)
    const grossSalesTry = Number(
      agBookings.reduce((s: number, b: any) => s + Number(b.totalPriceTry || 0), 0).toFixed(2)
    )
    const commissionPayableTry = Number(
      agBookings.reduce((s: number, b: any) => s + Number(b.agencyCommissionTry || 0), 0).toFixed(2)
    )
    return {
      agencyId: ag.id,
      code: ag.code,
      name: ag.name,
      commissionRatePct: ag.commissionRatePct,
      bookingCount: agBookings.length,
      passengersSold,
      grossSalesTry,
      commissionPayableTry,
      netToOperatorTry: Number((grossSalesTry - commissionPayableTry).toFixed(2)),
    }
  })

  // Araç kullanım süreleri raporu
  const vehUsageMap = new Map<
    string,
    { vehicleId: string; plate: string; brandModel: string; tourCount: number; totalHours: number; totalDays: number }
  >()
  for (const t of scopedTours) {
    if (!t.vehicleId || t.status === "CANCELLED") continue
    const v = vehMap.get(t.vehicleId)
    const hrs = Math.max(
      1,
      Math.round((new Date(t.endAt).getTime() - new Date(t.startAt).getTime()) / 3_600_000)
    )
    const entry = vehUsageMap.get(t.vehicleId) || {
      vehicleId: t.vehicleId,
      plate: v?.plate || t.vehicleId,
      brandModel: v ? `${v.brand} ${v.model}` : "Filo Aracı",
      tourCount: 0,
      totalHours: 0,
      totalDays: 0,
    }
    entry.tourCount++
    entry.totalHours += hrs
    entry.totalDays += Number(t.durationDays || 1)
    vehUsageMap.set(t.vehicleId, entry)
  }

  return {
    summary: {
      totalTours: scopedTours.length,
      activeTours: activeRows.length,
      completedTours: scopedTours.filter((t: any) => t.status === "COMPLETED").length,
      cancelledTours: scopedTours.filter((t: any) => t.status === "CANCELLED").length,
      totalPassengers,
      avgOccupancyPct,
      cancellationRatePct,
      totalGrossRevenueTry,
      totalCostsTry,
      totalNetProfitTry,
      avgProfitPerPassengerTry:
        totalPassengers > 0 ? Number((totalNetProfitTry / totalPassengers).toFixed(2)) : 0,
    },
    tourProfitabilityRows,
    agencyPerformanceRows,
    vehicleUsageRows: Array.from(vehUsageMap.values()).sort((a, b) => b.totalHours - a.totalHours),
  }
}

export async function exportTourReportBuffer(
  params: { format: "xlsx" | "pdf" },
  scope: TourismScopeContext
): Promise<{ buffer: Buffer; fileName: string; mimeType: string }> {
  const analytics = await buildTourAnalyticsAndReports(scope)
  const payload: LogisticsReportPayload = {
    moduleKey: "filo",
    title: "Tur Operatörlüğü Doluluk, Maliyet-Kâr Analizi ve Acenta Performans Raporu",
    subtitle: "Gelirler, Filo yakıt/rehber/otel giderleri ve acenta komisyonlarından canlı hesaplanmıştır",
    generatedAt: new Date().toISOString(),
    filtersApplied: {},
    chartTitle: "Tur Bazlı Net Kâr (TRY)",
    chartData: analytics.tourProfitabilityRows.slice(0, 10).map((r) => ({
      name: r.tourCode,
      primaryValue: r.netProfitTry,
      primaryLabel: "Net Kâr (TRY)",
    })),
    filterOptions: {},
    summaryCards: [
      {
        label: "Ortalama Tur Doluluğu",
        value: `%${analytics.summary.avgOccupancyPct}`,
        hint: `${analytics.summary.totalPassengers} yolcu · ${analytics.summary.activeTours} aktif tur`,
      },
      {
        label: "Toplam Tur Geliri",
        value: `${analytics.summary.totalGrossRevenueTry.toLocaleString("tr-TR")} TRY`,
        hint: `İptal/No-Show oranı: %${analytics.summary.cancellationRatePct}`,
      },
      {
        label: "Toplam Maliyet & Komisyon",
        value: `${analytics.summary.totalCostsTry.toLocaleString("tr-TR")} TRY`,
        hint: "Filo yakıt, rehber, otel, müze ve acenta komisyonu",
      },
      {
        label: "Toplam Net Kâr / Yolcu Başı",
        value: `${analytics.summary.totalNetProfitTry.toLocaleString("tr-TR")} TRY`,
        hint: `Yolcu başı ort. kâr: ${analytics.summary.avgProfitPerPassengerTry.toLocaleString("tr-TR")} TRY`,
      },
    ],
    columns: [
      { key: "tourCode", label: "Tur Kodu", format: "text" },
      { key: "tourTitle", label: "Tur Adı", format: "text" },
      { key: "confirmedPassengers", label: "Yolcu", format: "number" },
      { key: "occupancyPct", label: "Doluluk %", format: "percent" },
      { key: "grossRevenueTry", label: "Gelir (TRY)", format: "currency" },
      { key: "totalCostsWithCommissionTry", label: "Maliyet+Kom.", format: "currency" },
      { key: "netProfitTry", label: "Net Kâr (TRY)", format: "currency" },
      { key: "profitPerPassengerTry", label: "Yolcu Başı Kâr", format: "currency" },
    ],
    rows: analytics.tourProfitabilityRows as unknown as Array<Record<string, string | number | null>>,
  }

  const dateTag = new Date().toISOString().slice(0, 10)
  if (params.format === "pdf") {
    return {
      buffer: exportLogisticsReportToPdfBuffer(payload),
      fileName: `SunumERP_Tur_Karlilik_Raporu_${dateTag}.pdf`,
      mimeType: "application/pdf",
    }
  }
  return {
    buffer: exportLogisticsReportToExcelBuffer(payload),
    fileName: `SunumERP_Tur_Karlilik_Raporu_${dateTag}.xlsx`,
    mimeType: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  }
}

// ── K) Bildirimler (Dolmak Üzere, Min Katılım Altı, Ödeme Bekleyen, Çakışma, Yaklaşan Hareket) ──

export async function evaluateAndDispatchTourAlerts(params: {
  scope: TourismScopeContext
  dispatchNotifications?: boolean
  referenceNow?: Date
}) {
  const dbAny = prisma as any
  const refNow = params.referenceNow || new Date()
  const nowMs = refNow.getTime()

  const [tours, bookings, conflictLogs, existingNotifs] = await Promise.all([
    dbAny.turizmTourPackage.findMany(),
    dbAny.turizmTourBooking.findMany(),
    dbAny.turizmTourConflictLog.findMany(),
    prisma.notification.findMany({ take: 100, orderBy: { createdAt: "desc" } }).catch(() => []),
  ])

  const scopedTours = applyCompanyScopeFilter(tours, params.scope)
  const scopedBookings = applyCompanyScopeFilter(bookings, params.scope)
  const scopedConflicts = applyCompanyScopeFilter(conflictLogs, params.scope)

  const alerts: Array<{
    kind: string
    severity: "warning" | "error"
    entityId: string
    title: string
    message: string
  }> = []

  for (const t of scopedTours) {
    if (t.status === "CANCELLED" || t.status === "COMPLETED") continue
    const startMs = new Date(t.startAt).getTime()
    const hoursUntil = (startMs - nowMs) / 3_600_000
    const confirmedPax = scopedBookings
      .filter((b: any) => b.tourId === t.id && b.status !== "CANCELLED" && b.status !== "NO_SHOW")
      .reduce((s: number, b: any) => s + Number(b.passengerCount || 0), 0)
    const occPct = (confirmedPax / Math.max(1, Number(t.capacity || 1))) * 100

    if (hoursUntil > 0 && hoursUntil <= 48) {
      alerts.push({
        kind: "UPCOMING_DEPARTURE",
        severity: "warning",
        entityId: `${t.id}:dep`,
        title: `Yaklaşan Hareket: ${t.code} — ${t.title}`,
        message: `Tur ${Math.round(hoursUntil)} saat içinde hareket ediyor (${confirmedPax}/${t.capacity} yolcu). Manifesto ve araç/rehber hazırlığını doğrulayın.`,
      })
    }
    if (confirmedPax < Number(t.minParticipants || 1) && hoursUntil > 0 && hoursUntil <= 168) {
      alerts.push({
        kind: "BELOW_MIN_PARTICIPANTS",
        severity: "error",
        entityId: `${t.id}:min`,
        title: `Min. Katılım Altında: ${t.code} (${confirmedPax}/${t.minParticipants})`,
        message: `${t.title} minimum ${t.minParticipants} katılımcı eşiğine henüz ulaşmadı.`,
      })
    } else if (occPct >= 85 && t.status !== "FULL") {
      alerts.push({
        kind: "NEARLY_FULL",
        severity: "warning",
        entityId: `${t.id}:full`,
        title: `Dolmak Üzere: ${t.code} (%${Math.round(occPct)})`,
        message: `${t.title} için yalnızca ${Math.max(0, t.capacity - confirmedPax)} boş koltuk kaldı.`,
      })
    }
  }

  const pendingPayBookings = scopedBookings.filter(
    (b: any) => b.status === "CONFIRMED" && Number(b.balanceDueTry || 0) > 0
  )
  if (pendingPayBookings.length > 0) {
    const totalPending = pendingPayBookings.reduce((s: number, b: any) => s + Number(b.balanceDueTry || 0), 0)
    alerts.push({
      kind: "PENDING_PAYMENTS",
      severity: "warning",
      entityId: `pending-pay-${pendingPayBookings.length}`,
      title: `${pendingPayBookings.length} Tur Rezervasyonunda Açık Bakiye Var`,
      message: `Toplam ${totalPending.toLocaleString("tr-TR")} TRY kısmi/bekleyen yolcu tahsilatı bulunuyor.`,
    })
  }

  const unresolvedConflicts = scopedConflicts.filter((c: any) => !c.resolved)
  if (unresolvedConflicts.length > 0) {
    alerts.push({
      kind: "UNRESOLVED_CONFLICTS",
      severity: "error",
      entityId: `conflicts-${unresolvedConflicts.length}`,
      title: `${unresolvedConflicts.length} Çözülmemiş Kaynak / Koltuk Çakışması`,
      message: `Son çakışma: ${unresolvedConflicts[0].rejectionMessage}`,
    })
  }

  let notificationsSent = 0
  if (params.dispatchNotifications && alerts.length > 0 && params.scope.userId) {
    const existingTitles = new Set(existingNotifs.map((n: any) => n.title))
    const toSend = alerts
      .filter((a) => !existingTitles.has(a.title))
      .slice(0, 12)
      .map((a) => ({
        userId: params.scope.userId,
        title: a.title,
        message: a.message,
        type: a.severity,
        moduleType: "TURIZM_TUR",
        link: "/dashboard/tur",
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

// ── Ana Çalışma Alanı Snapshot Toplayıcısı (/dashboard/tur) ──────────────────

export async function getTourWorkspaceSnapshot(
  params: { ganttStartDate?: string; ganttDays?: number; revealKvkk?: boolean },
  scope: TourismScopeContext
) {
  assertNotTourGuideScoped(scope, "Tur Operatörlüğü Yönetim Paneli")
  const dbAny = prisma as any
  const canRevealPii = await canUserViewPassengerKvkkPii(scope)
  const revealPii = Boolean(params.revealKvkk && canRevealPii)
  if (revealPii) {
    await logTourismAudit({
      userId: scope.userId,
      action: "KVKK_PII_REVEALED",
      resource: "turizm_tur",
      moduleKey: "turizm_tur",
      branchId: scope.branchId,
      companyId: scope.effectiveCompanyId,
      metadata: { entity: "TourPassengerManifesto" },
    })
  }

  const [
    rawTours,
    guides,
    agencies,
    seatLayouts,
    rawStops,
    rawBookings,
    rawPassengers,
    rawExpenses,
    rawConflictLogs,
    rawFieldLogs,
    vehicles,
    drivers,
    customers,
    hotelAllotments,
    hotelRooms,
    kbsRecords,
    resourceGantt,
    analytics,
    alerts,
  ] = await Promise.all([
    dbAny.turizmTourPackage.findMany({ orderBy: { startAt: "asc" } }),
    listTourGuides(scope),
    listTourAgencies(scope),
    listSeatLayouts(scope),
    dbAny.turizmTourPickupStop.findMany(),
    dbAny.turizmTourBooking.findMany({ orderBy: { createdAt: "desc" } }),
    dbAny.turizmTourPassenger.findMany(),
    dbAny.turizmTourExpenseItem.findMany({ orderBy: { createdAt: "desc" } }),
    dbAny.turizmTourConflictLog.findMany({ orderBy: { attemptedAt: "desc" } }),
    dbAny.turizmTourFieldLog.findMany({ orderBy: { recordedAt: "desc" } }),
    dbAny.lojistikVehicle.findMany().catch(() => []),
    dbAny.lojistikDriver.findMany().catch(() => []),
    dbAny.customer.findMany().catch(() => []),
    dbAny.turizmHotelAllotment.findMany().catch(() => []),
    dbAny.turizmHotelRoom.findMany().catch(() => []),
    dbAny.turizmHotelKbsRecord.findMany().catch(() => []),
    getTourResourceAvailabilityGantt(
      { windowStartDate: params.ganttStartDate, daysCount: params.ganttDays },
      scope
    ),
    buildTourAnalyticsAndReports(scope),
    evaluateAndDispatchTourAlerts({ scope, dispatchNotifications: false }),
  ])

  const vehById = new Map<string, any>(vehicles.map((v: any) => [v.id, v]))
  const drvById = new Map<string, any>(drivers.map((d: any) => [d.id, d]))
  const gdById = new Map<string, any>(guides.map((g: any) => [g.id, g]))
  const layById = new Map<string, any>(seatLayouts.map((l: any) => [l.id, l]))
  const custById = new Map<string, any>(customers.map((c: any) => [c.id, c]))
  const profByTourId = new Map<string, any>(
    analytics.tourProfitabilityRows.map((p) => [p.tourId, p])
  )

  const scopedBookings = applyCompanyScopeFilter(rawBookings, scope)
  const scopedPassengers = applyCompanyScopeFilter(rawPassengers, scope)
  const scopedStops = applyCompanyScopeFilter(rawStops, scope)
  const scopedExpenses = applyCompanyScopeFilter(rawExpenses, scope)
  const scopedFieldLogs = applyCompanyScopeFilter(rawFieldLogs, scope)

  const tours = applyCompanyScopeFilter(rawTours, scope).map((t: any) => {
    const tBookings = scopedBookings.filter((b: any) => b.tourId === t.id)
    const cancelledIds = new Set(
      tBookings.filter((b: any) => b.status === "CANCELLED" || b.status === "NO_SHOW").map((b: any) => b.id)
    )
    const tStops = scopedStops
      .filter((s: any) => s.tourId === t.id)
      .sort((a: any, b: any) => a.sequenceNo - b.sequenceNo)
    const tPax = scopedPassengers
      .filter((p: any) => p.tourId === t.id && !cancelledIds.has(p.bookingId))
      .map((p: any) => maskPassengerKvkk(p, revealPii))
    const tExpenses = scopedExpenses.filter((e: any) => e.tourId === t.id)
    const tLogs = scopedFieldLogs.filter((l: any) => l.tourId === t.id)
    const lay = layById.get(t.seatLayoutId) || seatLayouts[0] || null
    const itinerary = (() => {
      try {
        return t.itineraryJson ? JSON.parse(t.itineraryJson) : []
      } catch {
        return []
      }
    })()
    const hotelRoomIds = (() => {
      try {
        return t.hotelRoomIdsJson ? JSON.parse(t.hotelRoomIdsJson) : []
      } catch {
        return []
      }
    })()

    return {
      ...t,
      itinerary,
      hotelRoomIds,
      vehicle: vehById.get(t.vehicleId) || null,
      driver: drvById.get(t.driverId)
        ? { id: drvById.get(t.driverId).id, fullName: drvById.get(t.driverId).fullName }
        : null,
      guide: gdById.get(t.guideId) || null,
      seatLayout: lay ? { ...lay, slots: buildSeatSlotsFromLayout(lay) } : null,
      stops: tStops,
      routeEstimate: estimateTourRouteMetrics(tStops as any),
      bookings: tBookings.map((b: any) => ({
        ...b,
        customerName: custById.get(b.customerId)?.name || custById.get(b.customerId)?.company || "Müşteri",
      })),
      passengers: tPax,
      expenses: tExpenses,
      fieldLogs: tLogs,
      profitability: profByTourId.get(t.id) || null,
      confirmedPassengerCount: tPax.length,
      kbsLinkedCount: tPax.filter((p: any) => Boolean(p.kbsRecordId)).length,
    }
  })

  return {
    tours,
    guides,
    agencies,
    seatLayouts,
    vehicles: applyCompanyScopeFilter(vehicles, scope).filter((v: any) => v.isActive !== false),
    drivers: drivers
      .filter((d: any) => d.isActive !== false)
      .map((d: any) => ({ id: d.id, fullName: d.fullName, licenseClass: d.licenseClass, status: d.status })),
    customers: applyCompanyScopeFilter(customers, scope).map((c: any) => ({
      id: c.id,
      name: c.name,
      company: c.company,
      nationality: c.nationality || "TR",
      phoneMasked: maskPhone(c.phone),
    })),
    hotelAllotments: applyCompanyScopeFilter(hotelAllotments, scope),
    hotelRooms: applyCompanyScopeFilter(hotelRooms, scope).slice(0, 30),
    kbsLinkedRecords: kbsRecords.filter((k: any) =>
      scopedPassengers.some((p: any) => p.kbsRecordId === k.id)
    ),
    conflictLogs: applyCompanyScopeFilter(rawConflictLogs, scope),
    resourceGantt,
    analytics,
    alerts,
    canRevealKvkkPii: canRevealPii,
    isKvkkRevealed: revealPii,
    mapConfig: {
      tileUrl: process.env.NEXT_PUBLIC_MAP_TILE_URL || null,
      hasExternalTileConfig: Boolean(process.env.NEXT_PUBLIC_MAP_TILE_URL),
      attribution: "Sunum ERP Rota Görünümü (Tahmini)",
    },
  }
}
