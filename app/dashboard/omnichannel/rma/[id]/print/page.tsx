"use client"

import { useEffect, useRef, useState } from "react"
import Link from "next/link"
import { useParams } from "next/navigation"
import JsBarcode from "jsbarcode"
import { BRAND_CONFIG } from "@/lib/config/brand"

interface RmaLabelData {
  rmaId: string
  rmaNumber: string
  orderNumber: string
  invoiceNo?: string | null
  channelCode: string
  customerName: string
  carrierCode: string
  trackingNo: string
  barcodeValue: string
  qrSvg: string
  reasonCode: string
  reasonLabel: string
  returnDeadlineAt?: string | null
  targetWarehouse: {
    id: string
    code: string
    name: string
    address: string
  }
  targetBinCode: string
  lines: Array<{
    sku: string
    itemName: string
    requestedQty: number
    lotNumber?: string | null
    serialNumber?: string | null
  }>
  generatedAt: string
}

export default function PrintRmaLabelPage() {
  const params = useParams()
  const id = params.id as string
  const [label, setLabel] = useState<RmaLabelData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const barcodeRef = useRef<SVGSVGElement | null>(null)

  useEffect(() => {
    if (!id) return
    let cancelled = false

    const fetchLabel = async () => {
      try {
        const res = await fetch(
          `/api/omnichannel?section=rma_label&rmaId=${encodeURIComponent(id)}`,
          { cache: "no-store" }
        )
        const data = await res.json()
        if (cancelled) return
        if (!res.ok || !data.success || !data.label) {
          setError(data.error || "İade etiketi verisi alınamadı.")
        } else {
          setLabel(data.label)
          if (typeof window !== "undefined" && window.location.search.includes("autoprint=1")) {
            setTimeout(() => window.print(), 450)
          }
        }
      } catch {
        if (!cancelled) setError("İade etiketi yüklenirken sunucu hatası oluştu.")
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    fetchLabel()
    return () => {
      cancelled = true
    }
  }, [id])

  useEffect(() => {
    if (!label?.barcodeValue || !barcodeRef.current) return
    try {
      JsBarcode(barcodeRef.current, String(label.barcodeValue), {
        format: "CODE128",
        lineColor: "#0f172a",
        background: "#ffffff",
        width: 1.9,
        height: 52,
        displayValue: false,
        margin: 4,
      })
    } catch {
      // Barkod formatı uyuşmazsa QR görünür kalır
    }
  }, [label])

  if (loading) {
    return (
      <div className="flex justify-center items-center h-screen bg-[#f7f9fb] text-[#191c1e]">
        İade etiketi hazırlanıyor...
      </div>
    )
  }

  if (error || !label) {
    return (
      <div className="flex flex-col justify-center items-center gap-4 h-screen bg-[--page] text-[--text] px-4 text-center">
        <p className="text-base font-semibold text-[--bad]">
          {error || "İade (RMA) kaydı bulunamadı."}
        </p>
        <Link
          href="/dashboard/omnichannel"
          className="px-4 py-2 rounded-lg bg-gradient-to-r from-[--brand] to-[--blue] text-white text-sm font-medium"
        >
          Omnichannel Ekranına Dön
        </Link>
      </div>
    )
  }

  return (
    <div className="bg-[--page] text-[--text] antialiased overflow-x-hidden min-h-screen font-sans">
      <style
        dangerouslySetInnerHTML={{
          __html: `
            @media print {
              @page { margin: 8mm; size: auto; }
              body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
              .print-hidden { display: none !important; }
            }
          `,
        }}
      />

      <main className="py-8 px-4 flex justify-center items-start w-full bg-[--page] min-h-screen">
        <div className="w-full max-w-[820px] bg-white rounded-2xl shadow-lg border border-[--line] flex flex-col overflow-hidden">
          {/* Üst Başlık & QR Kodu */}
          <div className="p-6 md:p-8 border-b border-[--line] bg-[--page] flex justify-between items-start gap-6 flex-wrap">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-xl bg-[--navy] flex items-center justify-center text-white text-xl font-bold shadow-sm">
                RMA
              </div>
              <div>
                <h1 className="text-2xl md:text-3xl font-bold text-[--text]">
                  İade Etiketi &amp; RMA Fişi
                </h1>
                <p className="text-[--text-muted] text-sm mt-0.5">{BRAND_CONFIG.companyName}</p>
                <p className="text-xs text-[--text-muted] font-mono mt-1">
                  Kanal: {label.channelCode} · Kargo: {label.carrierCode}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-4">
              <div className="text-right">
                <p className="text-xs text-[--text-muted] uppercase tracking-wider mb-1">RMA Belge No</p>
                <p className="text-xl font-bold font-mono text-[--navy]">{label.rmaNumber}</p>
                <p className="text-xs font-mono text-[--text-muted] mt-0.5">
                  Takip: {label.trackingNo}
                </p>
              </div>
              <div
                className="w-24 h-24 rounded-lg border border-[--line] bg-white p-1 shrink-0 [&>svg]:w-full [&>svg]:h-full"
                dangerouslySetInnerHTML={{ __html: label.qrSvg }}
              />
            </div>
          </div>

          {/* Barkod Şeridi */}
          <div className="px-6 md:px-8 py-4 border-b border-dashed border-[--line] bg-white flex flex-col items-center justify-center">
            <svg ref={barcodeRef} className="max-w-full" />
            <div className="font-mono text-xs font-bold tracking-widest text-[--text] mt-1">
              {label.barcodeValue}
            </div>
          </div>

          {/* Gönderici & Karantina Depo Bilgisi */}
          <div className="p-6 md:p-8 space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div className="bg-[--page] p-5 rounded-xl border border-[--line] space-y-2.5">
                <h2 className="text-xs font-semibold text-[--text-muted] uppercase tracking-wider">
                  Müşteri &amp; Sipariş Referansı
                </h2>
                <div className="flex justify-between text-sm">
                  <span className="text-[--text-muted]">Müşteri:</span>
                  <span className="font-semibold text-[--text]">{label.customerName}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-[--text-muted]">Sipariş No:</span>
                  <span className="font-mono font-semibold text-[--brand]">{label.orderNumber}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-[--text-muted]">Fatura / İrsaliye:</span>
                  <span className="font-mono font-semibold text-[--text]">
                    {label.invoiceNo || "-"}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-[--text-muted]">İade Nedeni:</span>
                  <span className="font-semibold text-[--text]">{label.reasonLabel}</span>
                </div>
              </div>

              <div className="bg-[--page] p-5 rounded-xl border border-[--line] space-y-2.5">
                <h2 className="text-xs font-semibold text-[--text-muted] uppercase tracking-wider">
                  Teslim Alacak Depo &amp; Karantina Hücresi
                </h2>
                <div className="flex justify-between text-sm">
                  <span className="text-[--text-muted]">Depo:</span>
                  <span className="font-semibold text-[--text]">
                    {label.targetWarehouse.name} ({label.targetWarehouse.code})
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-[--text-muted]">Adres:</span>
                  <span className="text-right font-medium text-[--text]">
                    {label.targetWarehouse.address}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-[--text-muted]">Hedef Raf (Karantina):</span>
                  <span className="font-mono font-bold text-[--warn]">{label.targetBinCode}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-[--text-muted]">Son İade Tarihi:</span>
                  <span className="font-semibold text-[--text]">
                    {label.returnDeadlineAt
                      ? new Date(label.returnDeadlineAt).toLocaleDateString("tr-TR")
                      : "-"}
                  </span>
                </div>
              </div>
            </div>

            {/* İade Edilen Kalemler */}
            <div>
              <h2 className="text-xs font-semibold text-[--text-muted] uppercase tracking-wider mb-3">
                İade Kalemleri
              </h2>
              <div className="overflow-x-auto print:overflow-visible rounded-xl border border-[--line]">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-[--muted-bg] text-xs text-[--text-muted] uppercase tracking-wider">
                      <th className="p-3.5 font-semibold">SKU</th>
                      <th className="p-3.5 font-semibold">Ürün Adı</th>
                      <th className="p-3.5 font-semibold">Lot / Seri</th>
                      <th className="p-3.5 font-semibold text-right">İade Miktarı</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[--line] text-sm text-[--text]">
                    {label.lines.map((line, idx) => (
                      <tr key={`${line.sku}-${idx}`}>
                        <td className="p-3.5 font-mono font-semibold">{line.sku}</td>
                        <td className="p-3.5 font-medium">{line.itemName}</td>
                        <td className="p-3.5 font-mono text-xs text-[--text-muted]">
                          {line.lotNumber || line.serialNumber || "-"}
                        </td>
                        <td className="p-3.5 text-right font-bold tabular-nums">{line.requestedQty} Adet</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Yazdırma & Geri Dönüş Butonları */}
            <div className="flex items-center justify-center gap-3 pt-2 print-hidden">
              <Link
                href="/dashboard/omnichannel"
                className="px-5 py-2.5 rounded-full border border-[--line] bg-white text-[--text] text-sm font-medium hover:bg-[--muted-bg] transition-colors"
              >
                Omnichannel&apos;a Dön
              </Link>
              <button
                type="button"
                onClick={() => window.print()}
                className="px-6 py-2.5 bg-gradient-to-r from-[--brand] to-[--blue] text-white rounded-full text-sm font-semibold hover:opacity-95 shadow-sm transition-colors cursor-pointer"
              >
                İade Etiketini Yazdır / PDF
              </button>
            </div>
          </div>

          <div className="p-5 border-t border-[--line] bg-[--muted-bg] text-center text-xs text-[--text-muted]">
            El terminali mal kabul taramasında üstteki QR veya <span className="font-mono font-semibold text-[--text]">{label.barcodeValue}</span> barkodunu okutunuz.
          </div>
        </div>
      </main>
    </div>
  )
}
