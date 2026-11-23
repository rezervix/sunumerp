/**
 * Sunum ERP — Turizm Faz 3: Otel Yönetimi (Mini PMS) — Operasyon, Folio, Stok/Minibar,
 * Housekeeping (Otomasyon + Çevrimdışı Senkron + Rol İzolasyonu), KBS Hazırlık,
 * Raporlama (Doluluk/ADR/RevPAR + XLSX/PDF) ve Bildirim Servisi
 */

import { prisma } from "@/lib/db"
import { maskDocumentNo, maskTckn } from "@/lib/logistics/fleet/constantsAndHelpers"
import { DemoDbEDocumentProvider } from "@/lib/logistics/providers/efatura-irsaliye"
import type { LogisticsReportPayload } from "@/lib/logistics/reports/constantsAndHelpers"
import {
  exportLogisticsReportToExcelBuffer,
  exportLogisticsReportToPdfBuffer,
} from "@/lib/logistics/reports/exportReports"
import { createNotificationMany } from "@/lib/services/notificationService"
import { HOUSEKEEPING_ROLE_NAME, MAIN_COMPANY_ID } from "@/lib/tourism/constants"
import {
  applyCompanyScopeFilter,
  logTourismAudit,
  TourismDomainError,
} from "@/lib/tourism/security"
import type { TourismScopeContext } from "@/lib/tourism/types"
import {
  calculateHotelNights,
  computeFolioBalance,
  computeHotelKpis,
  HOTEL_CHANNEL_LABELS,
  HOTEL_FOLIO_CATEGORIES,
  HOTEL_FOLIO_CATEGORY_LABELS,
  HOTEL_FOLIO_GROUPS,
  type HotelChannelSource,
  type HotelFolioCategory,
  type HotelFolioGroup,
} from "./constantsAndHelpers"
import {
  assertNotHousekeepingScoped,
  getHotelPolicyConfig,
  getHotelRoomAvailabilityGantt,
  isUserHousekeepingScoped,
  listHotelAllotments,
  listHotelGuestsKvkk,
  listHotelRooms,
  listHotelRoomTypes,
  listHotelTariffs,
  recomputeReservationFolioTotals,
} from "./hotelCoreService"
import { createHotelAdapters, type KbsPreparedPayload } from "./providers"

// ── Yardımcı: Aktif Temizlik Personelini Bul ──────────────────────────────────

async function listHousekeepingStaffMembers() {
  const dbAny = prisma as any
  const [roles, ubrs, users] = await Promise.all([
    dbAny.role.findMany().catch(() => []),
    dbAny.userBranchRole.findMany().catch(() => []),
    dbAny.user.findMany().catch(() => []),
  ])
  const hkRoleIds = new Set(
    roles
      .filter((r: any) => r.name === HOUSEKEEPING_ROLE_NAME || r.id === "role-housekeeping")
      .map((r: any) => r.id)
  )
  const hkUserIds = new Set(
    ubrs.filter((u: any) => hkRoleIds.has(u.roleId)).map((u: any) => u.userId)
  )
  return users
    .filter((u: any) => u.isActive !== false && hkUserIds.has(u.id))
    .map((u: any) => ({
      id: u.id,
      username: u.username,
      fullName: u.fullName || u.username,
      department: u.department || "Kat Hizmetleri (Housekeeping)",
    }))
}

// ── E) KBS (Kimlik Bildirim Sistemi) Hazırlık & Dışa Aktarma ──────────────────

export async function prepareOrRefreshKbsRecord(
  input: {
    reservationId: string
    notificationType?: "MISAFIR_GIRIS" | "MISAFIR_CIKIS" | "ODA_DEGISIKLIGI"
    preparationStatusOverride?: "HAZIRLANDI" | "GONDERILDI_MANUEL" | "HATALI" | "EKSIK_VERI"
    lastErrorNote?: string | null
  },
  scope: TourismScopeContext
) {
  assertNotHousekeepingScoped(scope, "KBS kimlik bildirimi hazırlığı")
  const dbAny = prisma as any
  const reservation = await dbAny.turizmHotelReservation.findUnique({
    where: { id: input.reservationId },
    include: { room: true, customer: true },
  })
  if (!reservation) {
    throw new TourismDomainError("NOT_FOUND", "KBS hazırlığı yapılacak rezervasyon bulunamadı.", 404)
  }

  const room =
    reservation.room ||
    (await dbAny.turizmHotelRoom.findUnique({ where: { id: reservation.roomId } }))
  const customer =
    reservation.customer ||
    (await dbAny.customer.findUnique({ where: { id: reservation.customerId } }))

  const notificationType = input.notificationType || "MISAFIR_GIRIS"
  const adapters = createHotelAdapters()
  const validation = adapters.kbs.validateAndPrepare({
    roomNumber: room?.roomNumber,
    guestFullName: customer?.name || customer?.company,
    guestNationality: customer?.nationality || "TR",
    guestTckn: customer?.tckn,
    guestPassportNo: customer?.passportNo,
    guestBirthDate: customer?.birthDate,
    checkInAt: reservation.actualCheckInAt || reservation.checkInDate,
  })

  const allKbs = await dbAny.turizmHotelKbsRecord.findMany({
    where: { reservationId: reservation.id },
  })
  const existing = allKbs.find((k: any) => k.notificationType === notificationType)

  const suffix =
    notificationType === "MISAFIR_CIKIS"
      ? "CKS"
      : notificationType === "ODA_DEGISIKLIGI"
        ? "ODA"
        : "GRS"
  const kbsRefNo =
    existing?.kbsRefNo ||
    `KBS-OTL-${String(reservation.reservationNo || reservation.id).replace(/^OTL-/, "")}-${suffix}`

  const birthYear = customer?.birthDate ? new Date(customer.birthDate).getUTCFullYear() : null
  const preparedPayload: KbsPreparedPayload = {
    kbsRefNo,
    notificationType,
    roomNumber: room?.roomNumber || "-",
    guestFullName: customer?.name || customer?.company || "Misafir",
    guestNationality: customer?.nationality || "TR",
    guestTcknMasked: maskTckn(customer?.tckn),
    guestPassportMasked: maskDocumentNo(customer?.passportNo),
    guestBirthYear: birthYear && !Number.isNaN(birthYear) ? birthYear : null,
    checkInAt: new Date(reservation.actualCheckInAt || reservation.checkInDate).toISOString(),
    expectedCheckOutAt: new Date(reservation.checkOutDate).toISOString(),
    actualCheckOutAt: reservation.actualCheckOutAt
      ? new Date(reservation.actualCheckOutAt).toISOString()
      : null,
  }

  const finalStatus = input.preparationStatusOverride || validation.preparationStatus
  const now = new Date()

  const payload = {
    kbsRefNo,
    reservationId: reservation.id,
    roomId: reservation.roomId,
    roomNumber: preparedPayload.roomNumber,
    customerId: reservation.customerId,
    notificationType,
    guestFullName: preparedPayload.guestFullName,
    guestTcknMasked: preparedPayload.guestTcknMasked,
    guestPassportMasked: preparedPayload.guestPassportMasked,
    guestNationality: preparedPayload.guestNationality,
    guestBirthYear: preparedPayload.guestBirthYear,
    checkInAt: new Date(preparedPayload.checkInAt),
    expectedCheckOutAt: new Date(preparedPayload.expectedCheckOutAt),
    actualCheckOutAt: preparedPayload.actualCheckOutAt
      ? new Date(preparedPayload.actualCheckOutAt)
      : null,
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
    updatedAt: now,
  }

  const saved = existing
    ? await dbAny.turizmHotelKbsRecord.update({ where: { id: existing.id }, data: payload })
    : await dbAny.turizmHotelKbsRecord.create({
        data: {
          id: `trzm-otl-kbs-${Date.now()}-${Math.random().toString(36).slice(2, 5)}`,
          ...payload,
          createdAt: now,
        },
      })

  await logTourismAudit({
    userId: scope.userId,
    action: existing ? "REFRESH_HOTEL_KBS_PREPARATION" : "PREPARE_HOTEL_KBS_RECORD",
    resource: "turizm_otel",
    resourceId: saved.id,
    moduleKey: "turizm_otel",
    branchId: scope.branchId,
    companyId: scope.effectiveCompanyId,
    metadata: {
      kbsRefNo: saved.kbsRefNo,
      notificationType: saved.notificationType,
      preparationStatus: saved.preparationStatus,
    },
  })

  return saved
}

export async function updateKbsRecordStatus(
  input: {
    kbsId: string
    preparationStatus: "HAZIRLANDI" | "GONDERILDI_MANUEL" | "HATALI" | "EKSIK_VERI"
    exportedFormat?: "XML_SABLON" | "CSV" | "JSON_PAKET"
    lastErrorNote?: string | null
  },
  scope: TourismScopeContext
) {
  assertNotHousekeepingScoped(scope, "KBS durum güncelleme")
  const dbAny = prisma as any
  const rec = await dbAny.turizmHotelKbsRecord.findUnique({ where: { id: input.kbsId } })
  if (!rec) {
    throw new TourismDomainError("NOT_FOUND", "KBS hazırlık kaydı bulunamadı.", 404)
  }

  const now = new Date()
  const updated = await dbAny.turizmHotelKbsRecord.update({
    where: { id: rec.id },
    data: {
      preparationStatus: input.preparationStatus,
      exportedFormat: input.exportedFormat || rec.exportedFormat || null,
      lastExportedAt:
        input.preparationStatus === "GONDERILDI_MANUEL" || input.exportedFormat
          ? now
          : rec.lastExportedAt,
      retryCount: Number(rec.retryCount || 0) + 1,
      lastErrorNote: input.lastErrorNote !== undefined ? input.lastErrorNote : rec.lastErrorNote,
      updatedAt: now,
    },
  })

  await logTourismAudit({
    userId: scope.userId,
    action: "UPDATE_HOTEL_KBS_STATUS",
    resource: "turizm_otel",
    resourceId: updated.id,
    moduleKey: "turizm_otel",
    branchId: scope.branchId,
    companyId: scope.effectiveCompanyId,
    metadata: { kbsRefNo: updated.kbsRefNo, preparationStatus: updated.preparationStatus },
  })

  return updated
}

export async function bulkPrepareOrRetryKbsRecords(
  input: { mode?: "RETRY_FAILED_AND_MISSING" | "PREPARE_ALL_ACTIVE_STAYS" },
  scope: TourismScopeContext
) {
  assertNotHousekeepingScoped(scope, "Toplu KBS hazırlık ve yeniden deneme")
  const dbAny = prisma as any
  const mode = input.mode || "RETRY_FAILED_AND_MISSING"
  const processed: any[] = []

  if (mode === "PREPARE_ALL_ACTIVE_STAYS") {
    const reservations = applyCompanyScopeFilter(
      await dbAny.turizmHotelReservation.findMany(),
      scope
    ).filter((r: any) => r.status === "CHECKED_IN" || r.status === "CHECKED_OUT")
    for (const res of reservations) {
      const saved = await prepareOrRefreshKbsRecord(
        {
          reservationId: res.id,
          notificationType: res.status === "CHECKED_OUT" ? "MISAFIR_CIKIS" : "MISAFIR_GIRIS",
        },
        scope
      )
      processed.push(saved)
    }
  } else {
    const failedOrMissing = applyCompanyScopeFilter(
      await dbAny.turizmHotelKbsRecord.findMany(),
      scope
    ).filter((k: any) => k.preparationStatus === "HATALI" || k.preparationStatus === "EKSIK_VERI")
    for (const rec of failedOrMissing) {
      const saved = await prepareOrRefreshKbsRecord(
        {
          reservationId: rec.reservationId,
          notificationType: rec.notificationType,
        },
        scope
      )
      processed.push(saved)
    }
  }

  return {
    mode,
    processedCount: processed.length,
    records: processed,
  }
}

export async function exportKbsRecordsPackage(
  input: {
    format: "XML_SABLON" | "CSV" | "JSON_PAKET"
    statusFilter?: string
    markAsManualExported?: boolean
  },
  scope: TourismScopeContext
) {
  assertNotHousekeepingScoped(scope, "KBS bildirim paketi dışa aktarma")
  const dbAny = prisma as any
  let records = applyCompanyScopeFilter(
    await dbAny.turizmHotelKbsRecord.findMany(),
    scope
  )
  if (input.statusFilter) {
    records = records.filter((r: any) => r.preparationStatus === input.statusFilter)
  }

  const adapters = createHotelAdapters()
  const payloads: KbsPreparedPayload[] = records.map((r: any) => ({
    kbsRefNo: r.kbsRefNo,
    notificationType: r.notificationType,
    roomNumber: r.roomNumber,
    guestFullName: r.guestFullName,
    guestNationality: r.guestNationality || "TR",
    guestTcknMasked: r.guestTcknMasked || null,
    guestPassportMasked: r.guestPassportMasked || null,
    guestBirthYear: r.guestBirthYear ?? null,
    checkInAt: new Date(r.checkInAt).toISOString(),
    expectedCheckOutAt: new Date(r.expectedCheckOutAt).toISOString(),
    actualCheckOutAt: r.actualCheckOutAt ? new Date(r.actualCheckOutAt).toISOString() : null,
  }))

  const now = new Date()
  if (input.markAsManualExported) {
    for (const rec of records) {
      if (rec.isPayloadComplete && rec.preparationStatus === "HAZIRLANDI") {
        await dbAny.turizmHotelKbsRecord.update({
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

  const csvText = adapters.kbs.formatCsvExport(payloads)
  const xmlText = adapters.kbs.formatXmlTemplateExport(payloads)

  await logTourismAudit({
    userId: scope.userId,
    action: "EXPORT_HOTEL_KBS_PACKAGE",
    resource: "turizm_otel",
    moduleKey: "turizm_otel",
    branchId: scope.branchId,
    companyId: scope.effectiveCompanyId,
    metadata: { format: input.format, recordCount: payloads.length },
  })

  return {
    exportedAt: now.toISOString(),
    format: input.format,
    recordCount: payloads.length,
    officialPortalRefs: adapters.kbs.officialPortalRefs,
    docsAccessDate: adapters.kbs.docsAccessDate,
    notice:
      "EGM KBS (EGMSEC) ve Jandarma KBS Tesis 2 resmî tesis yetkisi/sabit IP gerektirdiğinden bildirimler kurum şablonu olarak dışa aktarılmıştır; gerçek dış servis bağlantısı kurulmaz.",
    xmlText,
    csvText,
    records: payloads,
  }
}

// ── G) Oda Hesabı (Folio), Minibar Stok Düşümü, Split Folio ve E-Belge ───────

export async function addHotelFolioChargeOrPayment(
  input: {
    reservationId: string
    folioGroup?: HotelFolioGroup
    entryCategory: HotelFolioCategory
    description?: string
    inventoryItemId?: string | null
    quantity?: number
    unitPriceTry?: number
    vatRatePct?: number
    paymentMethod?: string | null
    allowFromHousekeeping?: boolean
  },
  scope: TourismScopeContext
) {
  if (!input.allowFromHousekeeping) {
    assertNotHousekeepingScoped(scope, "Oda hesabı (folio) kalemi ekleme")
  }
  const dbAny = prisma as any
  const reservation = await dbAny.turizmHotelReservation.findUnique({
    where: { id: input.reservationId },
    include: { room: true, customer: true },
  })
  if (!reservation) {
    throw new TourismDomainError("NOT_FOUND", "Folio işlenecek rezervasyon bulunamadı.", 404)
  }

  if (!HOTEL_FOLIO_CATEGORIES.includes(input.entryCategory)) {
    throw new TourismDomainError("VALIDATION_ERROR", `Geçersiz folio kategorisi: ${input.entryCategory}`, 400)
  }

  const folioGroup: HotelFolioGroup = HOTEL_FOLIO_GROUPS.includes(
    (input.folioGroup || "A_ANA_HESAP") as HotelFolioGroup
  )
    ? ((input.folioGroup || "A_ANA_HESAP") as HotelFolioGroup)
    : "A_ANA_HESAP"

  const isPayment =
    input.entryCategory === "PAYMENT_CASH" ||
    input.entryCategory === "PAYMENT_CARD" ||
    input.entryCategory === "PAYMENT_TRANSFER"

  const policy = await getHotelPolicyConfig(reservation.branchId)
  const quantity = Math.max(0.1, Number(input.quantity ?? 1))
  let unitPriceTry = Math.max(0, Number(input.unitPriceTry ?? 0))
  let description = String(input.description || "").trim()
  let stockMovementId: string | null = null
  let inventoryItemId: string | null = input.inventoryItemId || null

  // Minibar veya stok bağlantılı tüketim ise mevcut InventoryItem + StockBalance + StockMovement kullan!
  if (inventoryItemId && !isPayment) {
    const invItem = await dbAny.inventoryItem.findUnique({ where: { id: inventoryItemId } })
    if (!invItem) {
      throw new TourismDomainError("NOT_FOUND", "Seçilen minibar stok kalemi bulunamadı.", 404)
    }
    if (unitPriceTry <= 0) {
      unitPriceTry = Number(invItem.salesPrice || invItem.currentAvgCost || 120)
    }
    if (!description) {
      description = `Minibar — ${invItem.name} (${quantity} ${invItem.baseUnit || "Adet"})`
    }

    // Mevcut stok bakiyesinden düşüm ve StockMovement kaydı
    const balances = await dbAny.stockBalance.findMany({ where: { itemId: invItem.id } })
    const primaryBalance =
      balances.find((b: any) => b.warehouseId === "wh-merkez-01") || balances[0] || null
    const warehouseId = primaryBalance?.warehouseId || "wh-merkez-01"
    const unitCost = Number(invItem.currentAvgCost || invItem.standardCost || 0)

    let nextBalanceQty = 0
    if (primaryBalance) {
      const nextOnHand = Math.max(0, Number(primaryBalance.onHandQty || 0) - quantity)
      const nextAvailable = Math.max(0, Number(primaryBalance.availableQty || 0) - quantity)
      nextBalanceQty = nextOnHand
      await dbAny.stockBalance.update({
        where: { id: primaryBalance.id },
        data: {
          onHandQty: nextOnHand,
          availableQty: nextAvailable,
          updatedAt: new Date(),
        },
      })
    }

    const movement = await dbAny.stockMovement.create({
      data: {
        id: `trzm-otl-smv-${Date.now()}-${Math.random().toString(36).slice(2, 5)}`,
        itemId: invItem.id,
        warehouseId,
        movementType: "ISSUE",
        quantity,
        unit: invItem.baseUnit || "Adet",
        valuationMethodUsed: invItem.valuationMethod || "FIFO",
        unitCost,
        totalCost: Number((unitCost * quantity).toFixed(2)),
        standardCostVariance: 0,
        referenceDocNo: `HOTEL-MINIBAR-${reservation.reservationNo}`,
        performedBy: scope.username || scope.userId,
        notes: `Oda ${reservation.room?.roomNumber || reservation.roomId} minibar tüketimi (${reservation.reservationNo})`,
        reservationId: reservation.id,
        balanceAfterQty: nextBalanceQty,
        createdAt: new Date(),
      },
    })
    stockMovementId = movement.id
  }

  if (!description) {
    description = HOTEL_FOLIO_CATEGORY_LABELS[input.entryCategory] || input.entryCategory
  }
  if (unitPriceTry <= 0) {
    throw new TourismDomainError("VALIDATION_ERROR", "Folio tutarı 0'dan büyük olmalıdır.", 400)
  }

  const amountTry = Number((quantity * unitPriceTry).toFixed(2))
  const vatRatePct = isPayment
    ? 0
    : Math.max(0, Number(input.vatRatePct ?? policy.defaultVatRatePct ?? 10))
  const totalWithVatTry = isPayment
    ? amountTry
    : Number((amountTry * (1 + vatRatePct / 100)).toFixed(2))

  const now = new Date()
  const folioItem = await dbAny.turizmHotelFolioItem.create({
    data: {
      id: `trzm-otl-fol-${Date.now()}-${Math.random().toString(36).slice(2, 5)}`,
      entryNo: `FOL-${input.entryCategory.slice(0, 3)}-${String(Date.now()).slice(-6)}`,
      reservationId: reservation.id,
      roomId: reservation.roomId,
      customerId: reservation.customerId,
      folioGroup,
      entryCategory: input.entryCategory,
      isPayment,
      description,
      inventoryItemId,
      stockMovementId,
      quantity,
      unitPriceTry,
      amountTry,
      vatRatePct,
      totalWithVatTry,
      paymentMethod: isPayment
        ? input.paymentMethod ||
          (input.entryCategory === "PAYMENT_CARD"
            ? "Kredi Kartı"
            : input.entryCategory === "PAYMENT_TRANSFER"
              ? "Havale / EFT"
              : "Nakit")
        : null,
      postedByUserId: scope.userId,
      postedAt: now,
      ownerCompanyId: scope.effectiveCompanyId || MAIN_COMPANY_ID,
      createdAt: now,
    },
  })

  const balanceSummary = await recomputeReservationFolioTotals(reservation.id)

  await logTourismAudit({
    userId: scope.userId,
    action: isPayment ? "POST_HOTEL_FOLIO_PAYMENT" : "POST_HOTEL_FOLIO_CHARGE",
    resource: "turizm_otel",
    resourceId: folioItem.id,
    moduleKey: "turizm_otel",
    branchId: scope.branchId,
    companyId: scope.effectiveCompanyId,
    metadata: {
      reservationNo: reservation.reservationNo,
      entryCategory: folioItem.entryCategory,
      folioGroup: folioItem.folioGroup,
      totalWithVatTry: folioItem.totalWithVatTry,
      stockMovementId,
    },
  })

  return { folioItem, balanceSummary }
}

export async function splitFolioItemToGroup(
  input: { folioItemId: string; targetFolioGroup: HotelFolioGroup },
  scope: TourismScopeContext
) {
  assertNotHousekeepingScoped(scope, "Folio bölme (split folio)")
  const dbAny = prisma as any
  if (!HOTEL_FOLIO_GROUPS.includes(input.targetFolioGroup)) {
    throw new TourismDomainError("VALIDATION_ERROR", "Geçersiz hedef folio grubu.", 400)
  }
  const item = await dbAny.turizmHotelFolioItem.findUnique({ where: { id: input.folioItemId } })
  if (!item) {
    throw new TourismDomainError("NOT_FOUND", "Taşınacak folio kalemi bulunamadı.", 404)
  }

  const updated = await dbAny.turizmHotelFolioItem.update({
    where: { id: item.id },
    data: { folioGroup: input.targetFolioGroup },
  })
  const balanceSummary = await recomputeReservationFolioTotals(item.reservationId)

  await logTourismAudit({
    userId: scope.userId,
    action: "SPLIT_HOTEL_FOLIO_ITEM",
    resource: "turizm_otel",
    resourceId: updated.id,
    moduleKey: "turizm_otel",
    branchId: scope.branchId,
    companyId: scope.effectiveCompanyId,
    metadata: { prevGroup: item.folioGroup, targetFolioGroup: input.targetFolioGroup },
  })

  return { folioItem: updated, balanceSummary }
}

export async function issueHotelFolioInvoice(
  input: { reservationId: string; folioGroup?: HotelFolioGroup | "ALL" },
  scope: TourismScopeContext
) {
  assertNotHousekeepingScoped(scope, "Otel faturası / E-Belge kesimi")
  const dbAny = prisma as any
  const reservation = await dbAny.turizmHotelReservation.findUnique({
    where: { id: input.reservationId },
    include: { room: true, customer: true, folioItems: true },
  })
  if (!reservation) {
    throw new TourismDomainError("NOT_FOUND", "Faturalandırılacak otel rezervasyonu bulunamadı.", 404)
  }

  const room =
    reservation.room ||
    (await dbAny.turizmHotelRoom.findUnique({ where: { id: reservation.roomId } }))
  const customer =
    reservation.customer ||
    (await dbAny.customer.findUnique({ where: { id: reservation.customerId } }))
  const allItems =
    reservation.folioItems ||
    (await dbAny.turizmHotelFolioItem.findMany({ where: { reservationId: reservation.id } }))

  const targetGroup = input.folioGroup && input.folioGroup !== "ALL" ? input.folioGroup : null
  const billableItems = allItems.filter(
    (it: any) =>
      !it.isPayment &&
      it.entryCategory !== "REFUND" &&
      !it.eDocumentNo &&
      (!targetGroup || it.folioGroup === targetGroup)
  )

  if (billableItems.length === 0) {
    throw new TourismDomainError(
      "VALIDATION_ERROR",
      "Seçilen folio grubunda henüz faturalandırılmamış masraf/konaklama kalemi bulunmuyor.",
      400
    )
  }

  const policy = await getHotelPolicyConfig(reservation.branchId)
  const lines = billableItems.map((it: any) => ({
    sku: `OTL-${it.entryCategory}`,
    name: it.description,
    quantity: Number(it.quantity || 1),
    unit: it.entryCategory === "ROOM_NIGHT" ? "Gece" : "Adet",
    unitPrice: Number(it.unitPriceTry || it.amountTry || 0),
    vatRate: Number(it.vatRatePct ?? policy.defaultVatRatePct ?? 10),
  }))

  const isAgencyFolio = targetGroup === "C_ACENTA_FATURASI" && Boolean(reservation.agencyName)
  const edocProvider = new DemoDbEDocumentProvider()
  const edocRes = await edocProvider.submitEDocument({
    documentType: isAgencyFolio || customer?.company ? "E_FATURA" : "E_ARSIV",
    relatedOrderNo: reservation.reservationNo,
    receiverTitle: isAgencyFolio
      ? reservation.agencyName
      : customer?.company || customer?.name || "Otel Misafiri",
    receiverVknTckn: customer?.tckn || "11111111111",
    lines,
  })

  const totalGrossTry = Number(
    billableItems.reduce((sum: number, it: any) => sum + Number(it.totalWithVatTry || 0), 0).toFixed(2)
  )

  const fin = await dbAny.finance.create({
    data: {
      id: `trzm-otl-fin-${Date.now()}-${Math.random().toString(36).slice(2, 5)}`,
      branchId: reservation.branchId || scope.branchId || "local-debug-branch",
      type: "INCOME",
      amount: totalGrossTry,
      category: "Otel Konaklama & Folio Geliri",
      description: `Oda ${room?.roomNumber || "-"} — Konaklama & Ekstra Faturası (${edocRes.documentNo} / ${reservation.reservationNo}${targetGroup ? ` · ${targetGroup}` : ""})`,
      status: "approved",
      approvedBy: scope.userId,
      date: new Date(),
    },
  })

  for (const it of billableItems) {
    await dbAny.turizmHotelFolioItem.update({
      where: { id: it.id },
      data: {
        financeId: fin.id,
        eDocumentId: edocRes.ettnUuid,
        eDocumentNo: edocRes.documentNo,
      },
    })
  }

  await logTourismAudit({
    userId: scope.userId,
    action: "ISSUE_HOTEL_FOLIO_INVOICE",
    resource: "turizm_otel",
    resourceId: reservation.id,
    moduleKey: "turizm_otel",
    branchId: scope.branchId,
    companyId: scope.effectiveCompanyId,
    metadata: {
      reservationNo: reservation.reservationNo,
      folioGroup: targetGroup || "ALL",
      documentNo: edocRes.documentNo,
      financeId: fin.id,
      totalGrossTry,
    },
  })

  return {
    eDocument: edocRes,
    financeRecord: fin,
    invoicedItemCount: billableItems.length,
    totalGrossTry,
  }
}

// ── D) Check-In ve Check-Out İş Akışı ────────────────────────────────────────

export async function performHotelCheckIn(
  input: {
    reservationId: string
    keyCardIssuedCode?: string
    guestTckn?: string
    guestPassportNo?: string
    guestNationality?: string
    guestBirthDate?: string
    guestPhone?: string
    overrideDirtyRoom?: boolean
    notes?: string
  },
  scope: TourismScopeContext
) {
  assertNotHousekeepingScoped(scope, "Misafir Check-In işlemi")
  const dbAny = prisma as any
  const reservation = await dbAny.turizmHotelReservation.findUnique({
    where: { id: input.reservationId },
    include: { room: true, customer: true },
  })
  if (!reservation) {
    throw new TourismDomainError("NOT_FOUND", "Check-In yapılacak rezervasyon bulunamadı.", 404)
  }
  if (reservation.status === "CANCELLED" || reservation.status === "CHECKED_OUT") {
    throw new TourismDomainError(
      "CONFLICT",
      "İptal edilmiş veya çıkışı tamamlanmış rezervasyon için Check-In yapılamaz.",
      409
    )
  }

  const room =
    reservation.room ||
    (await dbAny.turizmHotelRoom.findUnique({ where: { id: reservation.roomId } }))
  if (!room) {
    throw new TourismDomainError("NOT_FOUND", "Rezervasyona atanmış oda bulunamadı.", 404)
  }
  if (room.status === "MAINTENANCE" || room.status === "OUT_OF_ORDER") {
    throw new TourismDomainError(
      "CONFLICT",
      `${room.roomNumber} numaralı oda bakımda/arızalı olduğu için Check-In yapılamaz.`,
      409
    )
  }
  if (
    !input.overrideDirtyRoom &&
    (room.status === "DIRTY_VACANT" || room.status === "CLEANING_IN_PROGRESS")
  ) {
    throw new TourismDomainError(
      "CONFLICT",
      `${room.roomNumber} numaralı oda henüz temizlenmedi (${room.status}). Temizlik tamamlanmalı veya ön büro onayıyla istisna seçilmelidir.`,
      409
    )
  }

  // KVKK veri minimizasyonu: Yalnızca kimlik bildirimine gereken temel alanları güncelle (kimlik fotokopisi SAKLANMAZ!)
  if (
    reservation.customerId &&
    (input.guestTckn ||
      input.guestPassportNo ||
      input.guestNationality ||
      input.guestBirthDate ||
      input.guestPhone)
  ) {
    const custUpdate: Record<string, any> = { updatedAt: new Date() }
    if (input.guestTckn) custUpdate.tckn = String(input.guestTckn).trim()
    if (input.guestPassportNo) custUpdate.passportNo = String(input.guestPassportNo).trim().toUpperCase()
    if (input.guestNationality) custUpdate.nationality = String(input.guestNationality).trim().toUpperCase()
    if (input.guestBirthDate) custUpdate.birthDate = new Date(input.guestBirthDate)
    if (input.guestPhone) custUpdate.phone = String(input.guestPhone).trim()
    await dbAny.customer.update({ where: { id: reservation.customerId }, data: custUpdate })
  }

  const now = new Date()
  const keyCardCode =
    String(input.keyCardIssuedCode || "").trim() ||
    `KEY-${room.roomNumber}-${String(now.getTime()).slice(-4)}`

  const updatedRes = await dbAny.turizmHotelReservation.update({
    where: { id: reservation.id },
    data: {
      status: "CHECKED_IN",
      actualCheckInAt: now,
      keyCardIssuedCode: keyCardCode,
      notes: input.notes ? `${reservation.notes ? `${reservation.notes} | ` : ""}${input.notes}` : reservation.notes,
      updatedAt: now,
    },
  })

  await dbAny.turizmHotelRoom.update({
    where: { id: room.id },
    data: {
      status: "OCCUPIED",
      keyCardCode,
      updatedAt: now,
    },
  })

  // Otomatik KBS Misafir Giriş Hazırlığı
  const kbsRecord = await prepareOrRefreshKbsRecord(
    { reservationId: reservation.id, notificationType: "MISAFIR_GIRIS" },
    scope
  )

  // Politika ON_CHECKIN ise otomatik fatura kes
  const policy = await getHotelPolicyConfig(reservation.branchId)
  let invoiceResult = null
  if (policy.invoiceTimingMode === "ON_CHECKIN") {
    invoiceResult = await issueHotelFolioInvoice(
      { reservationId: reservation.id, folioGroup: "ALL" },
      scope
    ).catch(() => null)
  }

  await logTourismAudit({
    userId: scope.userId,
    action: "HOTEL_CHECK_IN",
    resource: "turizm_otel",
    resourceId: updatedRes.id,
    moduleKey: "turizm_otel",
    branchId: scope.branchId,
    companyId: scope.effectiveCompanyId,
    metadata: {
      reservationNo: updatedRes.reservationNo,
      roomNumber: room.roomNumber,
      keyCardCode,
    },
  })

  return {
    reservation: updatedRes,
    keyCardCode,
    kbsRecord,
    invoiceResult,
  }
}

export async function performHotelCheckOut(
  input: {
    reservationId: string
    settleRemainingPaymentMethod?: "PAYMENT_CASH" | "PAYMENT_CARD" | "PAYMENT_TRANSFER" | null
    skipBalanceCheck?: boolean
    assignedHousekeeperUserId?: string | null
    notes?: string
  },
  scope: TourismScopeContext
) {
  assertNotHousekeepingScoped(scope, "Misafir Check-Out işlemi")
  const dbAny = prisma as any
  const reservation = await dbAny.turizmHotelReservation.findUnique({
    where: { id: input.reservationId },
    include: { room: true, customer: true },
  })
  if (!reservation) {
    throw new TourismDomainError("NOT_FOUND", "Check-Out yapılacak rezervasyon bulunamadı.", 404)
  }
  if (reservation.status !== "CHECKED_IN" && reservation.status !== "CONFIRMED") {
    throw new TourismDomainError(
      "CONFLICT",
      `Bu rezervasyonun mevcut durumu (${reservation.status}) Check-Out için uygun değil.`,
      409
    )
  }

  const policy = await getHotelPolicyConfig(reservation.branchId)
  let balanceSummary = await recomputeReservationFolioTotals(reservation.id)

  // Anlık bakiye kapatma tahsilatı istendiyse işle
  if (input.settleRemainingPaymentMethod && balanceSummary.balanceDueTry > 0.01) {
    const payRes = await addHotelFolioChargeOrPayment(
      {
        reservationId: reservation.id,
        folioGroup: "A_ANA_HESAP",
        entryCategory: input.settleRemainingPaymentMethod,
        description: `Check-Out Kapanış Tahsilatı (${reservation.reservationNo})`,
        quantity: 1,
        unitPriceTry: balanceSummary.balanceDueTry,
      },
      scope
    )
    balanceSummary = payRes.balanceSummary
  }

  if (
    policy.requireZeroBalanceOnCheckOut !== false &&
    !input.skipBalanceCheck &&
    balanceSummary.balanceDueTry > 0.01
  ) {
    throw new TourismDomainError(
      "CONFLICT",
      `Oda hesabında ${balanceSummary.balanceDueTry.toLocaleString("tr-TR")} TRY açık bakiye var. Check-Out öncesinde tahsilat yapın veya kapanış tahsilat yöntemini seçin.`,
      409,
      { balanceDueTry: balanceSummary.balanceDueTry }
    )
  }

  const room =
    reservation.room ||
    (await dbAny.turizmHotelRoom.findUnique({ where: { id: reservation.roomId } }))
  const now = new Date()

  const updatedRes = await dbAny.turizmHotelReservation.update({
    where: { id: reservation.id },
    data: {
      status: "CHECKED_OUT",
      actualCheckOutAt: now,
      notes: input.notes ? `${reservation.notes ? `${reservation.notes} | ` : ""}${input.notes}` : reservation.notes,
      updatedAt: now,
    },
  })

  if (room) {
    await dbAny.turizmHotelRoom.update({
      where: { id: room.id },
      data: {
        status: "DIRTY_VACANT",
        keyCardCode: null,
        updatedAt: now,
      },
    })
  }

  // F) Check-Out sonrası otomatik Housekeeping temizlik görevi oluştur!
  let housekeepingTask = null
  if (policy.autoCreateHousekeepingOnCheckOut !== false && room) {
    const staff = await listHousekeepingStaffMembers()
    let assignee = input.assignedHousekeeperUserId
      ? staff.find((s: any) => s.id === input.assignedHousekeeperUserId)
      : null
    if (!assignee && staff.length > 0) {
      // Kat numarasına göre dengeli atama
      assignee = staff[(Number(room.floorNumber || 1) - 1) % staff.length]
    }

    housekeepingTask = await dbAny.turizmHotelHousekeepingTask.create({
      data: {
        id: `trzm-otl-hk-${Date.now()}-${Math.random().toString(36).slice(2, 5)}`,
        taskNo: `HK-${room.roomNumber}-${String(now.getTime()).slice(-5)}`,
        roomId: room.id,
        roomNumber: room.roomNumber,
        floorNumber: Number(room.floorNumber || 1),
        reservationId: reservation.id,
        taskType: "CHECKOUT_CLEANING",
        priority: "HIGH",
        status: "PENDING",
        assignedToUserId: assignee?.id || null,
        assignedToName: assignee?.fullName || null,
        checklistJson: JSON.stringify([
          { key: "linen", label: "Çarşaf ve havlu değişimi", done: false },
          { key: "bathroom", label: "Banyo dezenfeksiyon & buklet yenileme", done: false },
          { key: "minibar", label: "Minibar sayım ve ikmal kontrolü", done: false },
          { key: "vacuum", label: "Zemin & yüzey temizliği / havalandırma", done: false },
        ]),
        notes: `${reservation.reservationNo} çıkışı sonrası otomatik oluşturulan temizlik görevi.`,
        ownerCompanyId: scope.effectiveCompanyId || MAIN_COMPANY_ID,
        createdAt: now,
        updatedAt: now,
      },
    })
  }

  // E) Otomatik KBS Misafir Çıkış Hazırlığı
  const kbsRecord = await prepareOrRefreshKbsRecord(
    { reservationId: reservation.id, notificationType: "MISAFIR_CIKIS" },
    scope
  )

  // G) Politika ON_CHECKOUT ise otomatik Finance + EDocumentRecord kes
  let invoiceResult = null
  if (policy.invoiceTimingMode === "ON_CHECKOUT") {
    invoiceResult = await issueHotelFolioInvoice(
      { reservationId: reservation.id, folioGroup: "ALL" },
      scope
    ).catch(() => null)
  }

  await logTourismAudit({
    userId: scope.userId,
    action: "HOTEL_CHECK_OUT",
    resource: "turizm_otel",
    resourceId: updatedRes.id,
    moduleKey: "turizm_otel",
    branchId: scope.branchId,
    companyId: scope.effectiveCompanyId,
    metadata: {
      reservationNo: updatedRes.reservationNo,
      roomNumber: room?.roomNumber,
      housekeepingTaskNo: housekeepingTask?.taskNo || null,
      eDocumentNo: invoiceResult?.eDocument?.documentNo || null,
    },
  })

  return {
    reservation: updatedRes,
    balanceSummary,
    housekeepingTask,
    kbsRecord,
    invoiceResult,
  }
}

// ── F) Housekeeping, Teknik Arıza & Çevrimdışı İdempotent Senkronizasyon ─────

export async function listHousekeepingTasks(
  params: { status?: string; floorNumber?: number | null; assignedToUserId?: string },
  scope: TourismScopeContext
) {
  const dbAny = prisma as any
  let tasks = applyCompanyScopeFilter(
    await dbAny.turizmHotelHousekeepingTask.findMany({ orderBy: { createdAt: "desc" } }),
    scope
  )

  // Kısıtlı "Temizlik Personeli" rolü YALNIZCA kendisine atanan görevleri görebilir!
  if (isUserHousekeepingScoped(scope)) {
    tasks = tasks.filter((t: any) => t.assignedToUserId === scope.userId)
  } else if (params.assignedToUserId) {
    tasks = tasks.filter((t: any) => t.assignedToUserId === params.assignedToUserId)
  }

  if (params.status) {
    tasks = tasks.filter((t: any) => t.status === params.status)
  }
  if (params.floorNumber !== undefined && params.floorNumber !== null) {
    tasks = tasks.filter((t: any) => Number(t.floorNumber) === Number(params.floorNumber))
  }

  return tasks
}

export async function createOrAssignHousekeepingTask(
  input: {
    taskId?: string
    roomId: string
    taskType?: string
    priority?: string
    assignedToUserId?: string | null
    notes?: string
  },
  scope: TourismScopeContext
) {
  assertNotHousekeepingScoped(scope, "Housekeeping görevi oluşturma/atama")
  const dbAny = prisma as any
  const staff = await listHousekeepingStaffMembers()
  const assignee = input.assignedToUserId
    ? staff.find((s: any) => s.id === input.assignedToUserId)
    : null
  const now = new Date()

  if (input.taskId) {
    const existing = await dbAny.turizmHotelHousekeepingTask.findUnique({
      where: { id: input.taskId },
    })
    if (!existing) {
      throw new TourismDomainError("NOT_FOUND", "Atanacak housekeeping görevi bulunamadı.", 404)
    }
    const updated = await dbAny.turizmHotelHousekeepingTask.update({
      where: { id: existing.id },
      data: {
        assignedToUserId: assignee?.id ?? input.assignedToUserId ?? existing.assignedToUserId,
        assignedToName: assignee?.fullName ?? existing.assignedToName,
        priority: input.priority ? String(input.priority).toUpperCase() : existing.priority,
        notes: input.notes !== undefined ? input.notes : existing.notes,
        updatedAt: now,
      },
    })
    return updated
  }

  const room = await dbAny.turizmHotelRoom.findUnique({ where: { id: input.roomId } })
  if (!room) {
    throw new TourismDomainError("NOT_FOUND", "Görev açılacak oda bulunamadı.", 404)
  }

  const created = await dbAny.turizmHotelHousekeepingTask.create({
    data: {
      id: `trzm-otl-hk-${Date.now()}-${Math.random().toString(36).slice(2, 5)}`,
      taskNo: `HK-${room.roomNumber}-${String(now.getTime()).slice(-5)}`,
      roomId: room.id,
      roomNumber: room.roomNumber,
      floorNumber: Number(room.floorNumber || 1),
      taskType: String(input.taskType || "STAYOVER_CLEANING").toUpperCase(),
      priority: String(input.priority || "NORMAL").toUpperCase(),
      status: "PENDING",
      assignedToUserId: assignee?.id || null,
      assignedToName: assignee?.fullName || null,
      checklistJson: JSON.stringify([
        { key: "linen", label: "Çarşaf ve havlu değişimi", done: false },
        { key: "bathroom", label: "Banyo temizliği", done: false },
        { key: "minibar", label: "Minibar kontrolü", done: false },
        { key: "general", label: "Genel düzen & havalandırma", done: false },
      ]),
      notes: input.notes || null,
      ownerCompanyId: scope.effectiveCompanyId || MAIN_COMPANY_ID,
      createdAt: now,
      updatedAt: now,
    },
  })

  await logTourismAudit({
    userId: scope.userId,
    action: "CREATE_HOUSEKEEPING_TASK",
    resource: "turizm_otel",
    resourceId: created.id,
    moduleKey: "turizm_otel",
    branchId: scope.branchId,
    companyId: scope.effectiveCompanyId,
    metadata: { taskNo: created.taskNo, roomNumber: room.roomNumber, assignedTo: created.assignedToName },
  })

  return created
}

export async function updateHousekeepingTaskStatus(
  input: {
    taskId: string
    status: "PENDING" | "IN_PROGRESS" | "COMPLETED" | "INSPECTED" | "CANCELLED"
    checklist?: Array<{ key: string; label: string; done: boolean }>
    minibarItems?: Array<{ inventoryItemId: string; quantity: number }>
    notes?: string
    offlineIdempotencyKey?: string
  },
  scope: TourismScopeContext
) {
  const dbAny = prisma as any
  const task = await dbAny.turizmHotelHousekeepingTask.findUnique({ where: { id: input.taskId } })
  if (!task) {
    throw new TourismDomainError("NOT_FOUND", "Housekeeping görevi bulunamadı.", 404)
  }

  // Kısıtlı Temizlik Personeli kontrolü:
  // 1) Yalnızca kendisine atanan görevi güncelleyebilir.
  // 2) Kendi işini 'INSPECTED' (denetlendi) olarak onaylayamaz veya iptal edemez.
  if (isUserHousekeepingScoped(scope)) {
    if (task.assignedToUserId !== scope.userId) {
      throw new TourismDomainError(
        "FORBIDDEN_HOUSEKEEPING_SCOPE",
        "Temizlik personeli yalnızca kendisine atanmış oda görevlerini güncelleyebilir.",
        403
      )
    }
    if (input.status === "INSPECTED" || input.status === "CANCELLED") {
      throw new TourismDomainError(
        "FORBIDDEN_HOUSEKEEPING_SCOPE",
        "Temizlik denetim onayı (INSPECTED) yalnızca kat şefi veya ön büro yetkilisi tarafından verilebilir.",
        403
      )
    }
  }

  const now = new Date()
  const updateData: Record<string, any> = {
    status: input.status,
    updatedAt: now,
  }
  if (Array.isArray(input.checklist)) {
    updateData.checklistJson = JSON.stringify(input.checklist)
  }
  if (Array.isArray(input.minibarItems)) {
    updateData.minibarCountJson = JSON.stringify(input.minibarItems)
  }
  if (input.notes !== undefined) updateData.notes = input.notes
  if (input.offlineIdempotencyKey && !task.offlineIdempotencyKey) {
    updateData.offlineIdempotencyKey = input.offlineIdempotencyKey
  }
  if (input.status === "IN_PROGRESS" && !task.startedAt) updateData.startedAt = now
  if (input.status === "COMPLETED") updateData.completedAt = now
  if (input.status === "INSPECTED") {
    updateData.inspectedAt = now
    updateData.inspectedByUserId = scope.userId
    updateData.inspectedByName = scope.username
  }

  const updated = await dbAny.turizmHotelHousekeepingTask.update({
    where: { id: task.id },
    data: updateData,
  })

  // Oda durumunu housekeeping yaşam döngüsüyle otomatik senkronize et
  const room = await dbAny.turizmHotelRoom.findUnique({ where: { id: task.roomId } })
  if (room && room.status !== "OCCUPIED") {
    let nextRoomStatus: string | null = null
    if (input.status === "IN_PROGRESS") nextRoomStatus = "CLEANING_IN_PROGRESS"
    else if (input.status === "COMPLETED") nextRoomStatus = "INSPECTION_PENDING"
    else if (input.status === "INSPECTED") nextRoomStatus = "CLEAN_VACANT"
    if (nextRoomStatus) {
      await dbAny.turizmHotelRoom.update({
        where: { id: room.id },
        data: { status: nextRoomStatus, updatedAt: now },
      })
    }
  }

  // Minibar sayımında tüketim bildirildiyse ve bağlı rezervasyon varsa otomatik folio + stok düşümü işle
  if (Array.isArray(input.minibarItems) && input.minibarItems.length > 0 && task.reservationId) {
    for (const mb of input.minibarItems) {
      if (Number(mb.quantity) > 0 && mb.inventoryItemId) {
        await addHotelFolioChargeOrPayment(
          {
            reservationId: task.reservationId,
            folioGroup: "A_ANA_HESAP",
            entryCategory: "MINIBAR",
            inventoryItemId: mb.inventoryItemId,
            quantity: Number(mb.quantity),
            allowFromHousekeeping: true,
          },
          scope
        ).catch(() => null)
      }
    }
  }

  await logTourismAudit({
    userId: scope.userId,
    action: "UPDATE_HOUSEKEEPING_TASK_STATUS",
    resource: "turizm_otel",
    resourceId: updated.id,
    moduleKey: "turizm_otel",
    branchId: scope.branchId,
    companyId: scope.effectiveCompanyId,
    metadata: { taskNo: updated.taskNo, roomNumber: updated.roomNumber, status: updated.status },
  })

  return updated
}

export async function reportRoomTechnicalFault(
  input: {
    roomId: string
    faultCategory: string
    faultDescription: string
    markRoomOutOfOrder?: boolean
    priority?: "NORMAL" | "HIGH" | "URGENT"
    offlineIdempotencyKey?: string
  },
  scope: TourismScopeContext
) {
  const dbAny = prisma as any
  const room = await dbAny.turizmHotelRoom.findUnique({ where: { id: input.roomId } })
  if (!room) {
    throw new TourismDomainError("NOT_FOUND", "Arıza bildirilecek oda bulunamadı.", 404)
  }

  // İdempotent tekrar kontrolü
  if (input.offlineIdempotencyKey) {
    const allTasks = await dbAny.turizmHotelHousekeepingTask.findMany()
    const dup = allTasks.find((t: any) => t.offlineIdempotencyKey === input.offlineIdempotencyKey)
    if (dup) {
      return { task: dup, duplicateIgnored: true }
    }
  }

  const now = new Date()
  const task = await dbAny.turizmHotelHousekeepingTask.create({
    data: {
      id: `trzm-otl-flt-${Date.now()}-${Math.random().toString(36).slice(2, 5)}`,
      taskNo: `ARZ-${room.roomNumber}-${String(now.getTime()).slice(-5)}`,
      roomId: room.id,
      roomNumber: room.roomNumber,
      floorNumber: Number(room.floorNumber || 1),
      taskType: "TECHNICAL_FAULT",
      priority: input.priority || (input.markRoomOutOfOrder ? "URGENT" : "HIGH"),
      status: "PENDING",
      assignedToUserId: isUserHousekeepingScoped(scope) ? scope.userId : null,
      assignedToName: isUserHousekeepingScoped(scope) ? scope.username : "Teknik Servis Ekibi",
      faultCategory: String(input.faultCategory || "GENEL_ARIZA"),
      faultDescription: String(input.faultDescription || "Teknik bakım talebi"),
      offlineIdempotencyKey: input.offlineIdempotencyKey || null,
      notes: input.faultDescription,
      ownerCompanyId: scope.effectiveCompanyId || MAIN_COMPANY_ID,
      createdAt: now,
      updatedAt: now,
    },
  })

  if (room.status !== "OCCUPIED") {
    await dbAny.turizmHotelRoom.update({
      where: { id: room.id },
      data: {
        status: input.markRoomOutOfOrder ? "OUT_OF_ORDER" : "MAINTENANCE",
        notes: `Arıza (${input.faultCategory}): ${input.faultDescription}`,
        updatedAt: now,
      },
    })
  }

  await logTourismAudit({
    userId: scope.userId,
    action: "REPORT_HOTEL_TECHNICAL_FAULT",
    resource: "turizm_otel",
    resourceId: task.id,
    moduleKey: "turizm_otel",
    branchId: scope.branchId,
    companyId: scope.effectiveCompanyId,
    metadata: {
      taskNo: task.taskNo,
      roomNumber: room.roomNumber,
      faultCategory: task.faultCategory,
      markRoomOutOfOrder: Boolean(input.markRoomOutOfOrder),
    },
  })

  return { task, duplicateIgnored: false }
}

export async function syncOfflineHousekeepingBatch(
  input: {
    events: Array<{
      idempotencyKey: string
      eventType: "UPDATE_TASK_STATUS" | "REPORT_TECHNICAL_FAULT"
      taskId?: string
      roomId?: string
      status?: "IN_PROGRESS" | "COMPLETED" | "INSPECTED"
      checklist?: Array<{ key: string; label: string; done: boolean }>
      minibarItems?: Array<{ inventoryItemId: string; quantity: number }>
      faultCategory?: string
      faultDescription?: string
      markRoomOutOfOrder?: boolean
      notes?: string
    }>
  },
  scope: TourismScopeContext
) {
  const dbAny = prisma as any
  const results: Array<{
    idempotencyKey: string
    status: "SYNCED" | "DUPLICATE_IGNORED" | "ERROR"
    message?: string
  }> = []

  const existingTasks = await dbAny.turizmHotelHousekeepingTask.findMany()
  const processedKeys = new Set<string>(
    existingTasks.map((t: any) => t.offlineIdempotencyKey).filter(Boolean)
  )

  for (const ev of input.events || []) {
    const key = String(ev.idempotencyKey || "").trim()
    if (!key) {
      results.push({ idempotencyKey: "", status: "ERROR", message: "idempotencyKey eksik." })
      continue
    }
    if (processedKeys.has(key)) {
      results.push({
        idempotencyKey: key,
        status: "DUPLICATE_IGNORED",
        message: "Bu çevrimdışı olay daha önce işlendi (idempotent).",
      })
      continue
    }

    try {
      if (ev.eventType === "REPORT_TECHNICAL_FAULT" && ev.roomId) {
        const res = await reportRoomTechnicalFault(
          {
            roomId: ev.roomId,
            faultCategory: ev.faultCategory || "TEKNIK_ARIZA",
            faultDescription: ev.faultDescription || "Mobil çevrimdışı arıza bildirimi",
            markRoomOutOfOrder: ev.markRoomOutOfOrder,
            offlineIdempotencyKey: key,
          },
          scope
        )
        processedKeys.add(key)
        results.push({
          idempotencyKey: key,
          status: res.duplicateIgnored ? "DUPLICATE_IGNORED" : "SYNCED",
        })
      } else if (ev.eventType === "UPDATE_TASK_STATUS" && ev.taskId && ev.status) {
        await updateHousekeepingTaskStatus(
          {
            taskId: ev.taskId,
            status: ev.status,
            checklist: ev.checklist,
            minibarItems: ev.minibarItems,
            notes: ev.notes,
            offlineIdempotencyKey: key,
          },
          scope
        )
        processedKeys.add(key)
        results.push({ idempotencyKey: key, status: "SYNCED" })
      } else {
        results.push({
          idempotencyKey: key,
          status: "ERROR",
          message: "Geçersiz çevrimdışı olay parametreleri.",
        })
      }
    } catch (err: any) {
      results.push({
        idempotencyKey: key,
        status: "ERROR",
        message: err?.message || "Olay işlenemedi.",
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

// ── I) Raporlar & Analitik (Doluluk %, ADR, RevPAR, Kanal, Anonim Uyruk, XLSX/PDF) ──

export async function buildHotelAnalyticsAndReports(
  params: { branchId?: string; periodDays?: number; referenceDate?: string | Date },
  scope: TourismScopeContext
) {
  assertNotHousekeepingScoped(scope, "Otel analitik ve finans raporları")
  const dbAny = prisma as any
  const [rooms, roomTypes, reservations, folioItems, customers] = await Promise.all([
    dbAny.turizmHotelRoom.findMany(),
    dbAny.turizmHotelRoomType.findMany().catch(() => []),
    dbAny.turizmHotelReservation.findMany().catch(() => []),
    dbAny.turizmHotelFolioItem.findMany().catch(() => []),
    dbAny.customer.findMany().catch(() => []),
  ])

  const periodDays = Math.max(7, Number(params.periodDays || 90))
  let scopedRooms = applyCompanyScopeFilter(rooms, scope).filter((r: any) => r.isActive !== false)
  let scopedRes = applyCompanyScopeFilter(reservations, scope)
  let scopedFolios = applyCompanyScopeFilter(folioItems, scope)
  if (params.branchId) {
    scopedRooms = scopedRooms.filter((r: any) => r.branchId === params.branchId)
    scopedRes = scopedRes.filter((r: any) => r.branchId === params.branchId)
  }

  const validStays = scopedRes.filter(
    (r: any) => r.status === "CONFIRMED" || r.status === "CHECKED_IN" || r.status === "CHECKED_OUT"
  )
  const soldRoomNights = validStays.reduce((s: number, r: any) => s + Number(r.nightsCount || 0), 0)
  const roomRevenueTry = validStays.reduce((s: number, r: any) => s + Number(r.roomTotalTry || 0), 0)
  const extrasRevenueTry = scopedFolios
    .filter(
      (f: any) => !f.isPayment && f.entryCategory !== "ROOM_NIGHT" && f.entryCategory !== "REFUND"
    )
    .reduce((s: number, f: any) => s + Number(f.totalWithVatTry || 0), 0)

  const kpis = computeHotelKpis({
    activeRoomsCount: scopedRooms.filter((r: any) => r.status !== "OUT_OF_ORDER").length,
    periodDays,
    soldRoomNights,
    roomRevenueTry,
    extrasRevenueTry,
  })

  // Kanal / Acenta Bazlı Gelir Dağılımı
  const channelMap = new Map<
    string,
    { channelSource: string; label: string; reservationCount: number; roomNights: number; revenueTry: number }
  >()
  for (const r of validStays) {
    const ch = String(r.channelSource || "DIRECT_WEB")
    const entry = channelMap.get(ch) || {
      channelSource: ch,
      label: HOTEL_CHANNEL_LABELS[ch as HotelChannelSource] || ch,
      reservationCount: 0,
      roomNights: 0,
      revenueTry: 0,
    }
    entry.reservationCount++
    entry.roomNights += Number(r.nightsCount || 0)
    entry.revenueTry = Number(
      (entry.revenueTry + Number(r.roomTotalTry || 0) + Number(r.extrasTotalTry || 0)).toFixed(2)
    )
    channelMap.set(ch, entry)
  }
  const channelBreakdown = Array.from(channelMap.values()).sort((a, b) => b.revenueTry - a.revenueTry)

  // Oda Tipi Bazlı Performans
  const roomTypeBreakdown = applyCompanyScopeFilter(roomTypes, scope).map((rt: any) => {
    const typeRooms = scopedRooms.filter((r: any) => r.roomTypeId === rt.id)
    const typeRes = validStays.filter((r: any) => r.roomTypeId === rt.id)
    const nights = typeRes.reduce((s: number, r: any) => s + Number(r.nightsCount || 0), 0)
    const rev = typeRes.reduce((s: number, r: any) => s + Number(r.roomTotalTry || 0), 0)
    const sellable = typeRooms.length * periodDays
    return {
      roomTypeId: rt.id,
      code: rt.code,
      name: rt.name,
      roomCount: typeRooms.length,
      reservationCount: typeRes.length,
      soldRoomNights: nights,
      occupancyPct: sellable > 0 ? Number(Math.min(100, (nights / sellable) * 100).toFixed(1)) : 0,
      roomRevenueTry: Number(rev.toFixed(2)),
      adrTry: nights > 0 ? Number((rev / nights).toFixed(2)) : 0,
      revParTry: sellable > 0 ? Number((rev / sellable).toFixed(2)) : 0,
    }
  })

  // Anonimleştirilmiş Misafir Uyruk İstatistikleri (SIFIR PII — isim, TCKN, pasaport, telefon yok!)
  const custById = new Map<string, any>(customers.map((c: any) => [c.id, c]))
  const natCounts = new Map<string, { nationalityCode: string; staysCount: number; guestCount: number }>()
  for (const r of validStays) {
    const cust = custById.get(r.customerId)
    const nat = String(cust?.nationality || "TR").toUpperCase()
    const entry = natCounts.get(nat) || { nationalityCode: nat, staysCount: 0, guestCount: 0 }
    entry.staysCount++
    entry.guestCount += Number(r.adultsCount || 1) + Number(r.childrenCount || 0)
    natCounts.set(nat, entry)
  }
  const totalGuestsAnon = Array.from(natCounts.values()).reduce((s, x) => s + x.guestCount, 0)
  const anonymizedNationalityStats = Array.from(natCounts.values())
    .map((x) => ({
      nationalityCode: x.nationalityCode,
      staysCount: x.staysCount,
      guestCount: x.guestCount,
      sharePct:
        totalGuestsAnon > 0 ? Number(((x.guestCount / totalGuestsAnon) * 100).toFixed(1)) : 0,
    }))
    .sort((a, b) => b.guestCount - a.guestCount)

  // Günlük Ön Büro Raporu Özeti
  const refDayStr = (params.referenceDate ? new Date(params.referenceDate) : new Date())
    .toISOString()
    .slice(0, 10)
  const arrivalsToday = scopedRes.filter(
    (r: any) =>
      (r.status === "CONFIRMED" || r.status === "PENDING") &&
      new Date(r.checkInDate).toISOString().slice(0, 10) === refDayStr
  ).length
  const departuresToday = scopedRes.filter(
    (r: any) =>
      r.status === "CHECKED_IN" &&
      new Date(r.checkOutDate).toISOString().slice(0, 10) === refDayStr
  ).length
  const inHouseCount = scopedRes.filter((r: any) => r.status === "CHECKED_IN").length
  const dirtyRoomsCount = scopedRooms.filter(
    (r: any) => r.status === "DIRTY_VACANT" || r.status === "CLEANING_IN_PROGRESS"
  ).length
  const cleanVacantCount = scopedRooms.filter((r: any) => r.status === "CLEAN_VACANT").length
  const maintenanceRoomsCount = scopedRooms.filter(
    (r: any) => r.status === "MAINTENANCE" || r.status === "OUT_OF_ORDER"
  ).length

  return {
    periodDays,
    kpis,
    dailyReport: {
      reportDate: refDayStr,
      totalRooms: scopedRooms.length,
      inHouseCount,
      arrivalsToday,
      departuresToday,
      cleanVacantCount,
      dirtyRoomsCount,
      maintenanceRoomsCount,
      currentLiveOccupancyPct:
        scopedRooms.length > 0
          ? Number(((inHouseCount / scopedRooms.length) * 100).toFixed(1))
          : 0,
    },
    channelBreakdown,
    roomTypeBreakdown,
    anonymizedNationalityStats,
  }
}

export async function exportHotelReportBuffer(
  params: { format: "xlsx" | "pdf"; branchId?: string },
  scope: TourismScopeContext
): Promise<{ buffer: Buffer; fileName: string; mimeType: string }> {
  const analytics = await buildHotelAnalyticsAndReports({ branchId: params.branchId }, scope)
  const payload: LogisticsReportPayload = {
    moduleKey: "filo",
    title: "Otel Yönetimi (Mini PMS) Doluluk, ADR, RevPAR ve Kanal Performans Raporu",
    subtitle: `Formüller: Doluluk % = ${analytics.kpis.formulas.occupancyFormula} | ADR = ${analytics.kpis.formulas.adrFormula} | RevPAR = ${analytics.kpis.formulas.revParFormula}`,
    generatedAt: new Date().toISOString(),
    filtersApplied: {},
    chartTitle: "Kanal Bazlı Otel Geliri (TRY)",
    chartData: analytics.channelBreakdown.map((c) => ({
      name: c.label,
      primaryValue: c.revenueTry,
      primaryLabel: "Gelir (TRY)",
    })),
    filterOptions: {},
    summaryCards: [
      {
        label: "Dönem Doluluk Oranı (%)",
        value: `%${analytics.kpis.occupancyPct}`,
        hint: `${analytics.kpis.soldRoomNights} / ${analytics.kpis.sellableRoomNights} oda-gece`,
      },
      {
        label: "ADR (Ort. Günlük Oda Fiyatı)",
        value: `${analytics.kpis.adrTry.toLocaleString("tr-TR")} TRY`,
        hint: analytics.kpis.formulas.adrFormula,
      },
      {
        label: "RevPAR (Mevcut Oda Başı Gelir)",
        value: `${analytics.kpis.revParTry.toLocaleString("tr-TR")} TRY`,
        hint: analytics.kpis.formulas.revParFormula,
      },
      {
        label: "Toplam Oda + Ekstra Geliri",
        value: `${analytics.kpis.totalRevenueTry.toLocaleString("tr-TR")} TRY`,
        hint: `Ekstra (Minibar/Restoran): ${analytics.kpis.extrasRevenueTry.toLocaleString("tr-TR")} TRY`,
      },
    ],
    columns: [
      { key: "code", label: "Oda Tipi Kodu", format: "text" },
      { key: "name", label: "Oda Tipi", format: "text" },
      { key: "roomCount", label: "Oda Adedi", format: "number" },
      { key: "soldRoomNights", label: "Satılan Oda-Gece", format: "number" },
      { key: "occupancyPct", label: "Doluluk %", format: "percent" },
      { key: "adrTry", label: "ADR (TRY)", format: "currency" },
      { key: "revParTry", label: "RevPAR (TRY)", format: "currency" },
      { key: "roomRevenueTry", label: "Oda Geliri (TRY)", format: "currency" },
    ],
    rows: analytics.roomTypeBreakdown,
  }

  const dateTag = new Date().toISOString().slice(0, 10)
  if (params.format === "pdf") {
    return {
      buffer: exportLogisticsReportToPdfBuffer(payload),
      fileName: `SunumERP_Otel_PMS_Raporu_${dateTag}.pdf`,
      mimeType: "application/pdf",
    }
  }
  return {
    buffer: exportLogisticsReportToExcelBuffer(payload),
    fileName: `SunumERP_Otel_PMS_Raporu_${dateTag}.xlsx`,
    mimeType: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  }
}

// ── J) Bildirimler (Bugün Giriş/Çıkış, Kirli Odalar, Geciken Çıkış, Kontenjan) ──

export interface HotelAlertItem {
  kind:
    | "TODAY_ARRIVAL"
    | "TODAY_DEPARTURE"
    | "OVERDUE_CHECKOUT"
    | "DIRTY_ROOMS_WAITING"
    | "ALLOTMENT_NEAR_LIMIT"
  severity: "warning" | "error"
  entityId: string
  title: string
  message: string
}

export async function evaluateAndDispatchHotelAlerts(params: {
  scope: TourismScopeContext
  dispatchNotifications?: boolean
  referenceNow?: Date
}) {
  const dbAny = prisma as any
  const refNow = params.referenceNow || new Date()
  const refDayStr = refNow.toISOString().slice(0, 10)

  const [rooms, reservations, allotments, existingNotifs] = await Promise.all([
    dbAny.turizmHotelRoom.findMany(),
    dbAny.turizmHotelReservation.findMany().catch(() => []),
    listHotelAllotments(params.scope).catch(() => []),
    prisma.notification.findMany({ take: 100, orderBy: { createdAt: "desc" } }).catch(() => []),
  ])

  const roomById = new Map<string, any>(rooms.map((r: any) => [r.id, r]))
  const scopedRooms = applyCompanyScopeFilter(rooms, params.scope).filter((r: any) => r.isActive !== false)
  const scopedRes = applyCompanyScopeFilter(reservations, params.scope)
  const alerts: HotelAlertItem[] = []

  // 1. Geciken Çıkışlar ve Bugün Giriş/Çıkışlar
  for (const res of scopedRes) {
    const rm = roomById.get(res.roomId)
    const roomNo = rm?.roomNumber || res.roomId
    const inDay = new Date(res.checkInDate).toISOString().slice(0, 10)
    const outDay = new Date(res.checkOutDate).toISOString().slice(0, 10)

    if (res.status === "CHECKED_IN" && new Date(res.checkOutDate).getTime() < refNow.getTime() && outDay < refDayStr) {
      alerts.push({
        kind: "OVERDUE_CHECKOUT",
        severity: "error",
        entityId: res.id,
        title: `Oda ${roomNo} — Geciken Check-Out (${res.reservationNo})`,
        message: `Oda ${roomNo} için planlanan çıkış tarihi (${outDay}) geçmiştir; geç çıkış veya uzatma işlemi kontrol edilmelidir.`,
      })
    } else if (res.status === "CHECKED_IN" && outDay === refDayStr) {
      alerts.push({
        kind: "TODAY_DEPARTURE",
        severity: "warning",
        entityId: `${res.id}:dep`,
        title: `Oda ${roomNo} — Bugün Check-Out (${res.reservationNo})`,
        message: `Oda ${roomNo} bugün çıkış yapacaktır. Folio bakiye ve housekeeping hazırlığını kontrol edin.`,
      })
    } else if ((res.status === "CONFIRMED" || res.status === "PENDING") && inDay === refDayStr) {
      alerts.push({
        kind: "TODAY_ARRIVAL",
        severity: "warning",
        entityId: `${res.id}:arr`,
        title: `Oda ${roomNo} — Bugün Giriş Bekleniyor (${res.reservationNo})`,
        message: `Oda ${roomNo} için bugün misafir girişi planlı. Oda durumu: ${rm?.status || "-"}.`,
      })
    }
  }

  // 2. Temizlik Bekleyen Kirli Odalar
  const dirtyRooms = scopedRooms.filter((r: any) => r.status === "DIRTY_VACANT")
  if (dirtyRooms.length > 0) {
    alerts.push({
      kind: "DIRTY_ROOMS_WAITING",
      severity: "warning",
      entityId: `dirty-rooms-${dirtyRooms.length}`,
      title: `${dirtyRooms.length} Kirli Oda Temizlik Bekliyor`,
      message: `Temizlik bekleyen odalar: ${dirtyRooms
        .slice(0, 8)
        .map((r: any) => r.roomNumber)
        .join(", ")}${dirtyRooms.length > 8 ? "..." : ""}.`,
    })
  }

  // 3. Acenta Kontenjanı Dolmaya Yakın / Tükenenler
  for (const allot of allotments) {
    if (allot.isNearLimit || allot.status === "NEAR_LIMIT" || allot.status === "EXHAUSTED") {
      alerts.push({
        kind: "ALLOTMENT_NEAR_LIMIT",
        severity: allot.status === "EXHAUSTED" ? "error" : "warning",
        entityId: allot.id,
        title: `Kontenjan Uyarısı: ${allot.agencyName} (${allot.code})`,
        message: `${allot.agencyName} kontenjanı %${allot.usagePct} doluluğa ulaştı (Kalan: ${allot.remainingRoomNights} oda-gece).`,
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
        moduleType: "TURIZM_OTEL",
        link: "/dashboard/otel",
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

// ── Çalışma Alanı (Workspace Snapshot) & Housekeeping Mobil Snapshot ─────────

export async function getHousekeepingMobileSnapshot(scope: TourismScopeContext) {
  const dbAny = prisma as any
  const [tasks, rooms, inventoryItems, stockBalances] = await Promise.all([
    listHousekeepingTasks({}, scope),
    dbAny.turizmHotelRoom.findMany(),
    dbAny.inventoryItem.findMany().catch(() => []),
    dbAny.stockBalance.findMany().catch(() => []),
  ])

  const isRestrictedHousekeeper = isUserHousekeepingScoped(scope)
  const ownRoomIds = new Set(tasks.map((t: any) => t.roomId))
  const visibleRooms = applyCompanyScopeFilter(rooms, scope)
    .filter((r: any) => (isRestrictedHousekeeper ? ownRoomIds.has(r.id) : true))
    .map((r: any) => ({
      id: r.id,
      roomNumber: r.roomNumber,
      floorNumber: r.floorNumber,
      wingOrSection: r.wingOrSection,
      status: r.status,
    }))

  const minibarCatalog = inventoryItems
    .filter((it: any) => String(it.category || "").toLowerCase().includes("minibar") || String(it.id).startsWith("trzm-otl-inv-"))
    .map((it: any) => {
      const bal = stockBalances.find((b: any) => b.itemId === it.id)
      return {
        id: it.id,
        sku: it.sku,
        name: it.name,
        salesPrice: Number(it.salesPrice || 0),
        onHandQty: Number(bal?.onHandQty || 0),
      }
    })

  return {
    isRestrictedHousekeeper,
    staffUser: {
      userId: scope.userId,
      username: scope.username,
    },
    tasks,
    rooms: visibleRooms,
    minibarCatalog,
    summary: {
      totalTasks: tasks.length,
      pendingCount: tasks.filter((t: any) => t.status === "PENDING").length,
      inProgressCount: tasks.filter((t: any) => t.status === "IN_PROGRESS").length,
      completedCount: tasks.filter((t: any) => t.status === "COMPLETED").length,
      inspectedCount: tasks.filter((t: any) => t.status === "INSPECTED").length,
      faultCount: tasks.filter((t: any) => t.taskType === "TECHNICAL_FAULT").length,
    },
  }
}

export async function getHotelWorkspaceSnapshot(
  params: {
    branchId?: string
    floorNumber?: number | null
    roomTypeId?: string
    ganttStartDate?: string
    ganttDays?: number
    revealKvkk?: boolean
  },
  scope: TourismScopeContext
) {
  assertNotHousekeepingScoped(scope, "Otel Ön Büro & Yönetim paneli")
  const dbAny = prisma as any
  const [
    roomTypes,
    rooms,
    tariffs,
    policyConfig,
    allotments,
    gantt,
    guestsBundle,
    rawReservations,
    rawFolioItems,
    housekeepingTasks,
    housekeepingStaff,
    rawKbsRecords,
    rawConflictLogs,
    inventoryItems,
    stockBalances,
    analytics,
    alerts,
  ] = await Promise.all([
    listHotelRoomTypes(scope),
    listHotelRooms(
      { floorNumber: params.floorNumber, roomTypeId: params.roomTypeId, branchId: params.branchId },
      scope
    ),
    listHotelTariffs(scope),
    getHotelPolicyConfig(params.branchId || scope.branchId),
    listHotelAllotments(scope),
    getHotelRoomAvailabilityGantt(
      {
        windowStartDate: params.ganttStartDate || new Date("2026-11-18T00:00:00.000Z"),
        daysCount: params.ganttDays || 14,
        floorNumber: params.floorNumber,
        roomTypeId: params.roomTypeId,
      },
      scope
    ),
    listHotelGuestsKvkk({ scope, revealSensitivePii: params.revealKvkk }),
    dbAny.turizmHotelReservation.findMany({ orderBy: { checkInDate: "desc" } }),
    dbAny.turizmHotelFolioItem.findMany({ orderBy: { postedAt: "desc" } }),
    listHousekeepingTasks({}, scope),
    listHousekeepingStaffMembers(),
    dbAny.turizmHotelKbsRecord.findMany({ orderBy: { createdAt: "desc" } }),
    dbAny.turizmHotelConflictAttemptLog.findMany({ orderBy: { attemptedAt: "desc" } }),
    dbAny.inventoryItem.findMany().catch(() => []),
    dbAny.stockBalance.findMany().catch(() => []),
    buildHotelAnalyticsAndReports({ branchId: params.branchId }, scope),
    evaluateAndDispatchHotelAlerts({ scope, dispatchNotifications: false }),
  ])

  const roomById = new Map<string, any>(rooms.map((r: any) => [r.id, r]))
  const rtById = new Map<string, any>(roomTypes.map((rt: any) => [rt.id, rt]))
  const guestById = new Map<string, any>(guestsBundle.guests.map((g: any) => [g.id, g]))
  const scopedFolios = applyCompanyScopeFilter(rawFolioItems, scope)
  const foliosByResId = new Map<string, any[]>()
  for (const f of scopedFolios) {
    const arr = foliosByResId.get(f.reservationId) || []
    arr.push(f)
    foliosByResId.set(f.reservationId, arr)
  }

  const reservations = applyCompanyScopeFilter(rawReservations, scope).map((r: any) => {
    const resFolios = foliosByResId.get(r.id) || []
    const rm = roomById.get(r.roomId)
    const rt = rtById.get(r.roomTypeId)
    const guest = guestById.get(r.customerId)
    return {
      ...r,
      roomNumber: rm?.roomNumber || "-",
      floorNumber: rm?.floorNumber || 1,
      roomStatus: rm?.status || "CLEAN_VACANT",
      roomTypeName: rt?.name || "Standart Oda",
      guest: guest || null,
      folioItems: resFolios,
      folioSummary: computeFolioBalance(resFolios),
    }
  })

  const minibarItems = inventoryItems
    .filter(
      (it: any) =>
        String(it.category || "").toLowerCase().includes("minibar") ||
        String(it.id).startsWith("trzm-otl-inv-")
    )
    .map((it: any) => {
      const bal = stockBalances.find((b: any) => b.itemId === it.id)
      return {
        id: it.id,
        sku: it.sku,
        name: it.name,
        baseUnit: it.baseUnit || "Adet",
        salesPrice: Number(it.salesPrice || 0),
        taxRate: Number(it.taxRate ?? 10),
        onHandQty: Number(bal?.onHandQty || 0),
        availableQty: Number(bal?.availableQty || 0),
      }
    })

  return {
    roomTypes,
    rooms,
    tariffs,
    policyConfig,
    allotments,
    gantt,
    guests: guestsBundle.guests,
    canRevealKvkkPii: guestsBundle.canViewPii,
    isKvkkRevealed: guestsBundle.isUnmasked,
    reservations,
    folioItems: scopedFolios,
    minibarItems,
    housekeepingTasks,
    housekeepingStaff,
    kbsRecords: applyCompanyScopeFilter(rawKbsRecords, scope),
    conflictLogs: applyCompanyScopeFilter(rawConflictLogs, scope),
    analytics,
    alerts,
  }
}
