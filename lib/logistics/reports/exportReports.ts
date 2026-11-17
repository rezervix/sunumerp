/**
 * Lojistik Raporları — Excel (.xlsx) & PDF (.pdf) Dışa Aktarma Oluşturucuları
 * Mevcut proje paketlerini (`xlsx` + `jspdf`) kullanır; yeni paket eklemez.
 * Hem tarayıcı indirmesi hem Node test doğrulaması için ortak buffer üreteçleri sağlar.
 */

import * as XLSX from "xlsx"
import { jsPDF } from "jspdf"
import {
  formatReportCellValue,
  formatReportDateTr,
  toPdfSafeText,
  type LogisticsReportPayload,
} from "./constantsAndHelpers"

export function buildLogisticsReportWorkbook(report: LogisticsReportPayload): XLSX.WorkBook {
  const summaryRows = report.summaryCards.map((card) => ({
    "Gösterge": card.label,
    "Değer": card.value,
    "Not": card.hint || "-",
  }))

  const dataRows = report.rows.map((row) => {
    const mapped: Record<string, string | number> = {}
    for (const col of report.columns) {
      const raw = row[col.key]
      if (col.format === "number" || col.format === "currency" || col.format === "percent") {
        mapped[col.label] = raw === null || raw === undefined ? "" : Number(raw)
      } else {
        mapped[col.label] = formatReportCellValue(raw, col.format)
      }
    }
    return mapped
  })

  const wb = XLSX.utils.book_new()
  const wsSummary = XLSX.utils.json_to_sheet(
    summaryRows.length > 0 ? summaryRows : [{ "Bilgi": "Özet verisi yok" }]
  )
  const wsData = XLSX.utils.json_to_sheet(
    dataRows.length > 0 ? dataRows : [{ "Bilgi": "Kayıt bulunamadı" }]
  )

  XLSX.utils.book_append_sheet(wb, wsSummary, "Yönetici Özeti")
  XLSX.utils.book_append_sheet(wb, wsData, "Detay Tablosu")
  return wb
}

export function exportLogisticsReportToExcelBuffer(report: LogisticsReportPayload): Buffer {
  const wb = buildLogisticsReportWorkbook(report)
  const out = XLSX.write(wb, { type: "buffer", bookType: "xlsx" })
  return Buffer.from(out)
}

export function downloadLogisticsReportExcel(report: LogisticsReportPayload): void {
  const wb = buildLogisticsReportWorkbook(report)
  const dateTag = new Date().toISOString().slice(0, 10)
  XLSX.writeFile(wb, `SunumERP_Lojistik_${report.moduleKey}_${dateTag}.xlsx`)
}

export function buildLogisticsReportPdfDoc(report: LogisticsReportPayload): jsPDF {
  const doc = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" })

  doc.setFont("helvetica", "bold")
  doc.setFontSize(15)
  doc.text(toPdfSafeText(`Sunum ERP - ${report.title}`), 12, 16)

  doc.setFont("helvetica", "normal")
  doc.setFontSize(9.5)
  doc.text(
    toPdfSafeText(
      `Olusturulma: ${formatReportDateTr(report.generatedAt)} | Kayit Sayisi: ${report.rows.length}`
    ),
    12,
    22
  )
  doc.line(12, 25, 285, 25)

  // Özet KPI Kartları
  let y = 32
  doc.setFont("helvetica", "bold")
  doc.setFontSize(10)
  report.summaryCards.forEach((c, idx) => {
    const x = 12 + idx * 68
    doc.text(toPdfSafeText(`${c.label}:`), x, y)
    doc.setFont("helvetica", "normal")
    doc.text(toPdfSafeText(c.value), x, y + 5)
    doc.setFont("helvetica", "bold")
  })

  y = 46
  doc.line(12, y, 285, y)
  y += 6

  // İlk 7 sütunu landscape A4'e hizalı sığdır
  const visibleCols = report.columns.slice(0, 7)
  const colWidth = Math.floor(270 / Math.max(1, visibleCols.length))

  const drawHeader = () => {
    doc.setFont("helvetica", "bold")
    doc.setFontSize(8.5)
    visibleCols.forEach((col, i) => {
      doc.text(toPdfSafeText(col.label).slice(0, 18), 12 + i * colWidth, y)
    })
    doc.line(12, y + 2, 285, y + 2)
    y += 7
    doc.setFont("helvetica", "normal")
  }

  drawHeader()

  for (const row of report.rows) {
    if (y > 192) {
      doc.addPage()
      y = 18
      drawHeader()
    }
    visibleCols.forEach((col, i) => {
      const formatted = formatReportCellValue(row[col.key], col.format)
      doc.text(toPdfSafeText(formatted).slice(0, 22), 12 + i * colWidth, y)
    })
    y += 6.5
  }

  if (report.rows.length === 0) {
    doc.text(toPdfSafeText("Secili filtrelerle eslesen kayit bulunamadi."), 12, y)
  }

  return doc
}

export function exportLogisticsReportToPdfBuffer(report: LogisticsReportPayload): Buffer {
  const doc = buildLogisticsReportPdfDoc(report)
  const arrBuf = doc.output("arraybuffer")
  return Buffer.from(arrBuf)
}

export function downloadLogisticsReportPdf(report: LogisticsReportPayload): void {
  const doc = buildLogisticsReportPdfDoc(report)
  const dateTag = new Date().toISOString().slice(0, 10)
  doc.save(`SunumERP_Lojistik_${report.moduleKey}_${dateTag}.pdf`)
}
