/**
 * Birleşik Turizm Raporları Servisi
 *
 * Rent-a-Car, Otel PMS, Tur Operatörlüğü ve B2B Partner Ağı'nın
 * birleşik finansal ve operasyonel rapor verilerini hazırlar;
 * Excel (.xlsx) ve PDF (.pdf) üretim motorunu çalıştırır.
 */

import { prisma } from "@/lib/db"
import {
  exportLogisticsReportToExcelBuffer,
  exportLogisticsReportToPdfBuffer,
} from "@/lib/logistics/reports/exportReports"
import type {
  LogisticsReportPayload,
} from "@/lib/logistics/reports/constantsAndHelpers"
import type { TourismScopeContext } from "@/lib/tourism/types"

export type TourismReportType =
  | "CONSOLIDATED"
  | "RENTACAR"
  | "HOTEL"
  | "TOUR"
  | "B2B"

export async function buildTourismReportPayload(
  scope: TourismScopeContext,
  reportType: TourismReportType = "CONSOLIDATED"
): Promise<LogisticsReportPayload> {
  const [rentRes, hotelRes, tourPkgs, tourBookings, b2bCross, b2bPartners] = await Promise.all([
    (prisma as any).turizmRentReservation.findMany().catch(() => []),
    (prisma as any).turizmHotelReservation.findMany().catch(() => []),
    (prisma as any).turizmTourPackage.findMany().catch(() => []),
    (prisma as any).turizmTourBooking.findMany().catch(() => []),
    (prisma as any).turizmCrossReservation.findMany().catch(() => []),
    (prisma as any).turizmPartnerCompany.findMany().catch(() => []),
  ])

  const partnerMap = new Map<string, string>(b2bPartners.map((p: any) => [p.id, p.name]))

  // 1. RENT-A-CAR
  const rentTotal = rentRes.reduce((s: number, r: any) => s + (r.finalTotalTry || r.baseRentalAmountTry || 0), 0)
  // 2. HOTEL
  const hotelTotal = hotelRes.reduce((s: number, r: any) => s + (r.roomTotalTry || 0) + (r.extrasTotalTry || 0), 0)
  // 3. TOUR
  const tourTotal = tourBookings.reduce((s: number, b: any) => s + (b.totalAmountTry || 0), 0)
  // 4. B2B
  const b2bTotal = b2bCross.reduce((s: number, c: any) => s + (c.grossAmountTry || c.netAmountTry || 0), 0)

  const grandTotal = rentTotal + hotelTotal + tourTotal + b2bTotal

  const summaryCards = [
    { label: "Konsolide Turizm Cirosu", value: `₺${grandTotal.toLocaleString("tr-TR")}`, hint: "Tüm aktif 4 modül toplamı" },
    { label: "Araç Kiralama Geliri", value: `₺${rentTotal.toLocaleString("tr-TR")}`, hint: `${rentRes.length} rezervasyon` },
    { label: "Otel Konaklama Hacmi", value: `₺${hotelTotal.toLocaleString("tr-TR")}`, hint: `${hotelRes.length} konaklama` },
    { label: "Tur Satış Hacmi", value: `₺${tourTotal.toLocaleString("tr-TR")}`, hint: `${tourBookings.length} yolcu kaydı` },
    { label: "B2B Partner Hacmi", value: `₺${b2bTotal.toLocaleString("tr-TR")}`, hint: `${b2bCross.length} çapraz kiralama` },
  ]

  let rows: Array<Record<string, string | number | null>> = []
  let columns: LogisticsReportPayload["columns"] = []
  let title = "Birleşik Turizm Ekosistemi Konsolide Raporu"
  let chartTitle = "Sektörel Ciro Dağılımı (TRY)"
  let chartData: LogisticsReportPayload["chartData"] = [
    { name: "Rent-a-Car", primaryValue: rentTotal, primaryLabel: "Ciro" },
    { name: "Otel PMS", primaryValue: hotelTotal, primaryLabel: "Ciro" },
    { name: "Tur Operatörlüğü", primaryValue: tourTotal, primaryLabel: "Ciro" },
    { name: "B2B Partner Ağı", primaryValue: b2bTotal, primaryLabel: "Ciro" },
  ]

  if (reportType === "RENTACAR") {
    title = "Araç Kiralama (Rent-a-Car) Operasyonel Performans Raporu"
    chartTitle = "Rezervasyon Başına Gelir (TRY)"
    columns = [
      { key: "no", label: "Rezervasyon No", format: "text" },
      { key: "status", label: "Durum", format: "text" },
      { key: "days", label: "Gün", format: "number" },
      { key: "dailyRate", label: "Günlük Ücret (TRY)", format: "currency" },
      { key: "total", label: "Toplam Tutar (TRY)", format: "currency" },
    ]
    rows = rentRes.map((r: any) => ({
      no: r.reservationNo,
      status: r.status,
      days: r.rentalDays || 1,
      dailyRate: r.dailyRateTry || 0,
      total: r.finalTotalTry || r.baseRentalAmountTry || 0,
    }))
    chartData = rows.slice(0, 10).map((r) => ({
      name: String(r.no),
      primaryValue: Number(r.total || 0),
      primaryLabel: "Toplam (TRY)",
    }))
  } else if (reportType === "HOTEL") {
    title = "Otel Yönetimi (Mini PMS) Doluluk ve Gelir Raporu"
    chartTitle = "Oda Başına Konaklama Tutarı (TRY)"
    columns = [
      { key: "no", label: "Rezervasyon No", format: "text" },
      { key: "status", label: "Durum", format: "text" },
      { key: "nights", label: "Gece Sayısı", format: "number" },
      { key: "roomTotal", label: "Oda Tutarı (TRY)", format: "currency" },
      { key: "extras", label: "Ekstra/Folyo (TRY)", format: "currency" },
      { key: "balanceDue", label: "Kalan Bakiye (TRY)", format: "currency" },
    ]
    rows = hotelRes.map((r: any) => ({
      no: r.reservationNo,
      status: r.status,
      nights: r.nightsCount || 1,
      roomTotal: r.roomTotalTry || 0,
      extras: r.extrasTotalTry || 0,
      balanceDue: r.balanceDueTry || 0,
    }))
    chartData = rows.slice(0, 10).map((r) => ({
      name: String(r.no),
      primaryValue: Number(r.roomTotal || 0),
      primaryLabel: "Oda Tutarı",
    }))
  } else if (reportType === "TOUR") {
    title = "Tur Operatörlüğü Manifesto ve Satış Raporu"
    chartTitle = "Paket Başına Rezervasyon Sayısı"
    columns = [
      { key: "code", label: "Tur Kodu / Adı", format: "text" },
      { key: "dest", label: "Bölge", format: "text" },
      { key: "cap", label: "Kapasite", format: "number" },
      { key: "price", label: "Birim Fiyat (TRY)", format: "currency" },
      { key: "status", label: "Durum", format: "text" },
    ]
    rows = tourPkgs.map((t: any) => ({
      code: t.code || t.title,
      dest: t.destinationCity || "—",
      cap: t.maxCapacity || 30,
      price: t.adultPriceTry || 0,
      status: t.status,
    }))
    chartData = rows.slice(0, 10).map((r) => ({
      name: String(r.code).slice(0, 15),
      primaryValue: Number(r.price || 0),
      primaryLabel: "Birim Fiyat",
    }))
  } else if (reportType === "B2B") {
    title = "B2B Partner Ağı Çapraz Paylaşım ve Hakediş Raporu"
    chartTitle = "Partner Çapraz Rezervasyon Hacimleri (TRY)"
    columns = [
      { key: "no", label: "Rezervasyon No", format: "text" },
      { key: "owner", label: "Kaynak Sahibi", format: "text" },
      { key: "booker", label: "Rezerve Eden", format: "text" },
      { key: "status", label: "Durum", format: "text" },
      { key: "gross", label: "Brüt Tutar (TRY)", format: "currency" },
      { key: "commission", label: "Komisyon (TRY)", format: "currency" },
      { key: "net", label: "Net Hakediş (TRY)", format: "currency" },
    ]
    rows = b2bCross.map((c: any) => ({
      no: c.reservationNo,
      owner: partnerMap.get(c.ownerCompanyId) || c.ownerCompanyId,
      booker: partnerMap.get(c.bookingCompanyId) || c.bookingCompanyId,
      status: c.status,
      gross: c.grossAmountTry || c.netAmountTry || 0,
      commission: c.commissionAmountTry || 0,
      net: c.ownerNetAmountTry || c.netAmountTry || 0,
    }))
    chartData = rows.slice(0, 10).map((r) => ({
      name: String(r.no),
      primaryValue: Number(r.gross || 0),
      primaryLabel: "Brüt (TRY)",
    }))
  } else {
    // CONSOLIDATED
    columns = [
      { key: "module", label: "Modül / Sektör", format: "text" },
      { key: "itemCount", label: "Toplam İşlem", format: "number" },
      { key: "revenue", label: "Toplam Ciro (TRY)", format: "currency" },
      { key: "share", label: "Pay (%)", format: "percent" },
    ]
    rows = [
      { module: "Araç Kiralama (Rent-a-Car)", itemCount: rentRes.length, revenue: rentTotal, share: grandTotal > 0 ? Math.round((rentTotal / grandTotal) * 100) : 0 },
      { module: "Otel Yönetimi (Mini PMS)", itemCount: hotelRes.length, revenue: hotelTotal, share: grandTotal > 0 ? Math.round((hotelTotal / grandTotal) * 100) : 0 },
      { module: "Tur Operatörlüğü", itemCount: tourBookings.length, revenue: tourTotal, share: grandTotal > 0 ? Math.round((tourTotal / grandTotal) * 100) : 0 },
      { module: "B2B Partner Ağı", itemCount: b2bCross.length, revenue: b2bTotal, share: grandTotal > 0 ? Math.round((b2bTotal / grandTotal) * 100) : 0 },
    ]
  }

  return {
    moduleKey: "filo" as any, // exportReports ile uyumluluk için güvenli fallback
    title,
    subtitle: `Sunum ERP Turizm Ekosistemi | Üretilme Tarihi: ${new Date().toLocaleDateString("tr-TR")}`,
    generatedAt: new Date().toISOString(),
    filtersApplied: { channelCode: reportType },
    summaryCards,
    chartTitle,
    chartData,
    columns,
    rows,
    filterOptions: {},
  }
}

export async function exportTourismReportBuffer(
  scope: TourismScopeContext,
  reportType: TourismReportType,
  format: "xlsx" | "pdf"
): Promise<{ buffer: Buffer; filename: string; contentType: string }> {
  const payload = await buildTourismReportPayload(scope, reportType)
  const dateTag = new Date().toISOString().slice(0, 10)

  if (format === "pdf") {
    const buffer = exportLogisticsReportToPdfBuffer(payload)
    return {
      buffer,
      filename: `turizm-rapor-${reportType.toLowerCase()}-${dateTag}.pdf`,
      contentType: "application/pdf",
    }
  }

  const buffer = exportLogisticsReportToExcelBuffer(payload)
  return {
    buffer,
    filename: `turizm-rapor-${reportType.toLowerCase()}-${dateTag}.xlsx`,
    contentType: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  }
}
