/**
 * Lojistik Raporları — Ortak Sabitler, Tipler ve Türkçe Biçimlendirme Yardımcıları
 */

import type { LogisticsFeatureFlagKey } from "@/lib/logistics/types"

export type LogisticsReportModuleKey =
  | "wms"
  | "satinalma"
  | "sevkiyat"
  | "filo"
  | "omnichannel"

export interface LogisticsReportModuleDefinition {
  key: LogisticsReportModuleKey
  title: string
  shortTitle: string
  description: string
  flagKey: LogisticsFeatureFlagKey
  resource: string
  primaryHref: string
}

export const LOGISTICS_REPORT_MODULE_DEFS: LogisticsReportModuleDefinition[] = [
  {
    key: "wms",
    title: "Depo Doluluk & Stok Doğruluğu Raporu",
    shortTitle: "Depo & WMS",
    description:
      "Depo bazlı hacim doluluk oranları, eldeki/kullanılabilir/karantina stokları ve değerleme özeti.",
    flagKey: "lojistik_wms",
    resource: "lojistik_wms",
    primaryHref: "/dashboard/wms",
  },
  {
    key: "satinalma",
    title: "Tedarikçi Performansı & Satınalma (PO) Raporu",
    shortTitle: "Tedarikçi & PO",
    description:
      "Tedarikçi OTD %, kalite kabul oranı, bileşik puan kartları ve açık/gecikmiş PO tutarları.",
    flagKey: "lojistik_tedarikci",
    resource: "lojistik_tedarikci",
    primaryHref: "/dashboard/satinalma",
  },
  {
    key: "sevkiyat",
    title: "Sevkiyat Sefer Maliyeti & Rota Optimizasyonu Raporu",
    shortTitle: "Sevkiyat & Rota",
    description:
      "Sefer bazlı kilometre tasarrufu, durak OTIF başarı oranı, doluluk ve E-Fatura kesim durumu.",
    flagKey: "lojistik_sevkiyat_rota",
    resource: "lojistik_sevkiyat_rota",
    primaryHref: "/dashboard/sevkiyat",
  },
  {
    key: "filo",
    title: "Filo TCO, Yakıt & Tahmini CO₂ Maliyet Raporu",
    shortTitle: "Filo & TCO",
    description:
      "Araç bazlı yakıt, bakım/arıza, sabit/ceza kalemleri, km başı TCO ve tahmini CO₂ emisyonu.",
    flagKey: "lojistik_filo",
    resource: "lojistik_filo",
    primaryHref: "/dashboard/filo",
  },
  {
    key: "omnichannel",
    title: "İade, RMA & Alacak Dekontu Analiz Raporu",
    shortTitle: "İade & RMA",
    description:
      "İade talepleri, neden kodları, kalite kontrol kararları ve alacak dekontu finansal tutarları.",
    flagKey: "lojistik_iade",
    resource: "lojistik_iade",
    primaryHref: "/dashboard/iade",
  },
]

export const ALL_LOGISTICS_REPORT_KEYS: LogisticsReportModuleKey[] =
  LOGISTICS_REPORT_MODULE_DEFS.map((d) => d.key)

export interface LogisticsReportFilters {
  dateFrom?: string
  dateTo?: string
  warehouseId?: string
  vehicleId?: string
  supplierId?: string
  channelCode?: string
}

export interface LogisticsReportColumn {
  key: string
  label: string
  format?: "text" | "number" | "currency" | "percent" | "date"
}

export interface LogisticsReportSummaryCard {
  label: string
  value: string
  hint?: string
}

export interface LogisticsReportChartPoint {
  name: string
  primaryValue: number
  secondaryValue?: number
  primaryLabel: string
  secondaryLabel?: string
}

export interface LogisticsReportPayload {
  moduleKey: LogisticsReportModuleKey
  title: string
  subtitle: string
  generatedAt: string
  filtersApplied: LogisticsReportFilters
  summaryCards: LogisticsReportSummaryCard[]
  chartTitle: string
  chartData: LogisticsReportChartPoint[]
  columns: LogisticsReportColumn[]
  rows: Array<Record<string, string | number | null>>
  filterOptions: {
    warehouses?: Array<{ id: string; label: string }>
    vehicles?: Array<{ id: string; label: string }>
    suppliers?: Array<{ id: string; label: string }>
    channels?: string[]
  }
}

export function formatReportCurrencyTry(amount: number): string {
  const num = Number.isFinite(amount) ? amount : 0
  return `₺${num.toLocaleString("tr-TR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`
}

export function formatReportDateTr(value?: string | Date | null): string {
  if (!value) return "-"
  const d = value instanceof Date ? value : new Date(value)
  if (Number.isNaN(d.getTime())) return "-"
  return d.toLocaleDateString("tr-TR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  })
}

export function formatReportCellValue(
  value: string | number | null | undefined,
  format: LogisticsReportColumn["format"] = "text"
): string {
  if (value === null || value === undefined || value === "") return "-"
  if (format === "currency") return formatReportCurrencyTry(Number(value))
  if (format === "percent") return `%${Number(value).toLocaleString("tr-TR", { maximumFractionDigits: 1 })}`
  if (format === "number") return Number(value).toLocaleString("tr-TR", { maximumFractionDigits: 2 })
  if (format === "date") return formatReportDateTr(String(value))
  return String(value)
}

/**
 * jsPDF standart Helvetica (WinAnsi) fontunda sorunsuz görüntülenmesi için
 * yalnızca WinAnsi dışında kalan Türkçe karakterleri sadeleştirir (ü/ö/ç korunur).
 */
export function toPdfSafeText(input: string): string {
  return String(input ?? "")
    .replace(/ğ/g, "g")
    .replace(/Ğ/g, "G")
    .replace(/ş/g, "s")
    .replace(/Ş/g, "S")
    .replace(/ı/g, "i")
    .replace(/İ/g, "I")
    .replace(/₺/g, "TRY ")
    .replace(/₂/g, "2")
}
