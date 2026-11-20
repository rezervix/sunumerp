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
      <div className="flex flex-col justify-center items-center gap-4 h-screen bg-[#f7f9fb] text-[#191c1e] px-4 text-center">
        <p className="text-base font-semibold text-[#93000a]">
          {error || "İade (RMA) kaydı bulunamadı."}
        </p>
        <Link
          href="/dashboard/omnichannel"
          className="px-4 py-2 rounded-lg bg-[#004ac6] text-white text-sm font-medium"
        >
          Omnichannel Ekranına Dön
        </Link>
      </div>
    )
  }

  return (
    <div className="bg-[#f7f9fb] text-[#191c1e] antialiased overflow-x-hidden min-h-screen font-sans">
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

      <main className="py-8 px-4 flex justify-center items-start w-full bg-[#f7f9fb] min-h-screen">
        <div className="w-full max-w-[820px] bg-[#ffffff] rounded-xl shadow-lg border border-[#e6e8ea] flex flex-col overflow-hidden">
          {/* Üst Başlık & QR Kodu */}
          <div className="p-6 md:p-8 border-b border-[#e6e8ea] bg-[#f7f9fb] flex justify-between items-start gap-6 flex-wrap">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-lg bg-[#047857] flex items-center justify-center text-[#ffffff] text-xl font-bold shadow-sm">
                RMA
              </div>
              <div>
                <h1 className="text-2xl md:text-3xl font-bold text-[#191c1e]">
                  İade Etiketi &amp; RMA Fişi
                </h1>
                <p className="text-[#434655] text-sm mt-0.5">{BRAND_CONFIG.companyName}</p>
                <p className="text-xs text-[#434655] font-mono mt-1">
                  Kanal: {label.channelCode} · Kargo: {label.carrierCode}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-4">
              <div className="text-right">
                <p className="text-xs text-[#434655] uppercase tracking-wider mb-1">RMA Belge No</p>
                <p className="text-xl font-bold font-mono text-[#047857]">{label.rmaNumber}</p>
                <p className="text-xs font-mono text-[#434655] mt-0.5">
                  Takip: {label.trackingNo}
                </p>
              </div>
              <div
                className="w-24 h-24 rounded-lg border border-[#d1d5db] bg-white p-1 shrink-0 [&>svg]:w-full [&>svg]:h-full"
                dangerouslySetInnerHTML={{ __html: label.qrSvg }}
              />
            </div>
          </div>

          {/* Barkod Şeridi */}
          <div className="px-6 md:px-8 py-4 border-b border-dashed border-[#cbd5e1] bg-white flex flex-col items-center justify-center">
            <svg ref={barcodeRef} className="max-w-full" />
            <div className="font-mono text-xs font-bold tracking-widest text-[#0f172a] mt-1">
              {label.barcodeValue}
            </div>
          </div>

          {/* Gönderici & Karantina Depo Bilgisi */}
          <div className="p-6 md:p-8 space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div className="bg-[#f7f9fb] p-5 rounded-lg border border-[#e6e8ea] space-y-2.5">
                <h2 className="text-xs font-semibold text-[#434655] uppercase tracking-wider">
                  Müşteri &amp; Sipariş Referansı
                </h2>
                <div className="flex justify-between text-sm">
                  <span className="text-[#434655]">Müşteri:</span>
                  <span className="font-semibold text-[#191c1e]">{label.customerName}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-[#434655]">Sipariş No:</span>
                  <span className="font-mono font-semibold text-[#004ac6]">{label.orderNumber}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-[#434655]">Fatura / İrsaliye:</span>
                  <span className="font-mono font-semibold text-[#191c1e]">
                    {label.invoiceNo || "-"}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-[#434655]">İade Nedeni:</span>
                  <span className="font-semibold text-[#191c1e]">{label.reasonLabel}</span>
                </div>
              </div>

              <div className="bg-[#f7f9fb] p-5 rounded-lg border border-[#e6e8ea] space-y-2.5">
                <h2 className="text-xs font-semibold text-[#434655] uppercase tracking-wider">
                  Teslim Alacak Depo &amp; Karantina Hücresi
                </h2>
                <div className="flex justify-between text-sm">
                  <span className="text-[#434655]">Depo:</span>
                  <span className="font-semibold text-[#191c1e]">
                    {label.targetWarehouse.name} ({label.targetWarehouse.code})
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-[#434655]">Adres:</span>
                  <span className="text-right font-medium text-[#191c1e]">
                    {label.targetWarehouse.address}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-[#434655]">Hedef Raf (Karantina):</span>
                  <span className="font-mono font-bold text-[#b45309]">{label.targetBinCode}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-[#434655]">Son İade Tarihi:</span>
                  <span className="font-semibold text-[#191c1e]">
                    {label.returnDeadlineAt
                      ? new Date(label.returnDeadlineAt).toLocaleDateString("tr-TR")
                      : "-"}
                  </span>
                </div>
              </div>
            </div>

            {/* İade Edilen Kalemler */}
            <div>
              <h2 className="text-xs font-semibold text-[#434655] uppercase tracking-wider mb-3">
                İade Kalemleri
              </h2>
              <div className="overflow-x-auto print:overflow-visible rounded-lg border border-[#e6e8ea]">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-[#f2f4f6] text-xs text-[#434655] uppercase tracking-wider">
                      <th className="p-3.5 font-semibold">SKU</th>
                      <th className="p-3.5 font-semibold">Ürün Adı</th>
                      <th className="p-3.5 font-semibold">Lot / Seri</th>
                      <th className="p-3.5 font-semibold text-right">İade Miktarı</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#e6e8ea] text-sm text-[#191c1e]">
                    {label.lines.map((line, idx) => (
                      <tr key={`${line.sku}-${idx}`}>
                        <td className="p-3.5 font-mono font-semibold">{line.sku}</td>
                        <td className="p-3.5 font-medium">{line.itemName}</td>
                        <td className="p-3.5 font-mono text-xs text-[#434655]">
                          {line.lotNumber || line.serialNumber || "-"}
                        </td>
                        <td className="p-3.5 text-right font-bold">{line.requestedQty} Adet</td>
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
                className="px-5 py-2.5 rounded-lg border border-[#d1d5db] bg-white text-[#191c1e] text-sm font-medium hover:bg-[#f2f4f6] transition-colors"
              >
                Omnichannel&apos;a Dön
              </Link>
              <button
                type="button"
                onClick={() => window.print()}
                className="px-6 py-2.5 bg-[#047857] text-white rounded-lg text-sm font-semibold hover:bg-[#065f46] transition-colors cursor-pointer"
              >
                İade Etiketini Yazdır / PDF
              </button>
            </div>
          </div>

          <div className="p-5 border-t border-[#e6e8ea] bg-[#f2f4f6] text-center text-xs text-[#434655]">
            El terminali mal kabul taramasında üstteki QR veya <span className="font-mono font-semibold">{label.barcodeValue}</span> barkodunu okutunuz.
          </div>
        </div>
      </main>
    </div>
  )
}
