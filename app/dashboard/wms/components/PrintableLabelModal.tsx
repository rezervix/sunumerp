"use client"

import React, { useEffect, useRef, useState } from "react"
import JsBarcode from "jsbarcode"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Barcode, QrCode, CheckCircle2, RefreshCw } from "lucide-react"

interface PrintableLabelModalProps {
  open: boolean
  onClose: () => void
  entityType: "BIN" | "LPN" | "ITEM"
  entityId: string | null
}

export function PrintableLabelModal({
  open,
  onClose,
  entityType,
  entityId,
}: PrintableLabelModalProps) {
  const [loading, setLoading] = useState(false)
  const [label, setLabel] = useState<any>(null)
  const [error, setError] = useState<string | null>(null)
  const barcodeSvgRef = useRef<SVGSVGElement | null>(null)

  useEffect(() => {
    if (!open || !entityId) return
    let cancelled = false
    setLoading(true)
    setError(null)
    fetch(`/api/wms?section=label&entityType=${entityType}&id=${encodeURIComponent(entityId)}`)
      .then((r) => r.json())
      .then((data) => {
        if (cancelled) return
        if (data.success && data.label) {
          setLabel(data.label)
        } else {
          setError(data.error || "Etiket bilgisi yüklenemedi.")
        }
      })
      .catch(() => {
        if (!cancelled) setError("Etiket servisine erişilemedi.")
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [open, entityType, entityId])

  useEffect(() => {
    if (!label?.barcodeValue || !barcodeSvgRef.current) return
    try {
      JsBarcode(barcodeSvgRef.current, String(label.barcodeValue), {
        format: "CODE128",
        lineColor: "#0B1B33",
        background: "#ffffff",
        width: 1.8,
        height: 46,
        displayValue: false,
        margin: 4,
      })
    } catch {
      // Barkod formatı uyuşmazsa sadece QR gösterilir
    }
  }, [label])

  const handlePrint = () => {
    if (!label) return
    const printWin = window.open("", "_blank", "width=520,height=640")
    if (!printWin) return
    const barcodeHtml = barcodeSvgRef.current ? barcodeSvgRef.current.outerHTML : ""
    const metaRows = Object.entries(label.metadata || {})
      .map(
        ([k, v]) =>
          `<tr><td style="padding:4px 8px;font-weight:600;color:#33445E;">${k}</td><td style="padding:4px 8px;font-family:monospace;color:#0B1B33;">${String(v)}</td></tr>`
      )
      .join("")
    printWin.document.write(`
      <html>
        <head>
          <title>Etiket: ${label.title}</title>
          <style>
            body { font-family: system-ui, -apple-system, sans-serif; padding: 16px; color: #0B1B33; background: #fff; }
            .card { border: 2px solid #0B1B33; border-radius: 12px; padding: 16px; max-width: 440px; margin: 0 auto; }
            .hdr { display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 1px dashed #CBD5E1; padding-bottom: 12px; }
            .title { font-size: 20px; font-weight: 800; font-family: monospace; color: #0B1B33; }
            .sub { font-size: 12px; color: #5B6B82; margin-top: 2px; }
            .barcode { margin: 14px 0; text-align: center; }
            .human { font-family: monospace; font-size: 13px; font-weight: 700; margin-top: 4px; color: #0B1B33; }
            table { width: 100%; border-collapse: collapse; font-size: 11px; margin-top: 10px; }
            tr { border-top: 1px solid #E2E8F0; }
            @media print {
              body { padding: 0; }
              .card { border-width: 1px; }
            }
          </style>
        </head>
        <body>
          <div class="card">
            <div class="hdr">
              <div>
                <div class="title">${label.title}</div>
                <div class="sub">${label.subtitle}</div>
              </div>
              <div style="width:92px;height:92px;">${label.qrSvg || ""}</div>
            </div>
            <div class="barcode">
              ${barcodeHtml}
              <div class="human">${label.humanReadable || label.barcodeValue}</div>
            </div>
            <table>${metaRows}</table>
          </div>
          <script>setTimeout(() => { window.print(); }, 250);</script>
        </body>
      </html>
    `)
    printWin.document.close()
  }

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="sm:max-w-lg bg-white border border-[--line] text-[--text] rounded-2xl shadow-2xl p-6">
        <DialogHeader>
          <DialogTitle className="text-base font-semibold flex items-center gap-2 text-[--text]">
            <QrCode className="h-5 w-5 text-[--brand]" />
            <span>
              {entityType === "LPN"
                ? "GS1-128 SSCC Palet / Koli Etiketi"
                : entityType === "BIN"
                  ? "Raf / Göz Barkod & QR Etiketi"
                  : "Ürün Barkod Etiketi"}
            </span>
          </DialogTitle>
          <DialogDescription className="text-xs text-[--text-muted]">
            Zebra/Termal yazıcı veya PDF çıktısı için GS1 CODE-128 &amp; QR etiket önizlemesi.
          </DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="py-12 flex flex-col items-center justify-center gap-2 text-xs text-[--text-muted]">
            <RefreshCw className="h-6 w-6 animate-spin text-[--brand]" />
            <span>Etiket oluşturuluyor...</span>
          </div>
        ) : error ? (
          <div className="p-4 rounded-xl bg-[--bad-soft] border border-[--bad-fill]/20 text-xs text-[--bad] font-medium">
            {error}
          </div>
        ) : label ? (
          <div className="bg-white text-[--text] rounded-2xl p-5 border border-[--line] space-y-4 shadow-sm">
            <div className="flex items-start justify-between gap-4 border-b border-dashed border-[--line] pb-3">
              <div>
                <div className="text-xl font-bold font-mono tracking-tight text-[--text]">
                  {label.title}
                </div>
                <div className="text-xs text-[--text-muted] mt-0.5">{label.subtitle}</div>
                {label.ssccValid !== undefined && (
                  <div className="mt-2 inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[11px] font-semibold bg-[--ok-soft] text-[--ok]">
                    <CheckCircle2 className="h-3 w-3" />
                    {label.ssccValid
                      ? "GS1 Mod-10 Check-Digit Doğrulandı"
                      : "Özel Kod Formatı"}
                  </div>
                )}
              </div>
              {label.qrSvg && (
                <div
                  className="w-24 h-24 shrink-0 border border-[--line] rounded-lg p-1 bg-white [&>svg]:w-full [&>svg]:h-full"
                  dangerouslySetInnerHTML={{ __html: label.qrSvg }}
                />
              )}
            </div>

            <div className="flex flex-col items-center justify-center bg-[--page] border border-[--line] rounded-xl p-3">
              <svg ref={barcodeSvgRef} className="max-w-full" />
              <div className="font-mono text-xs font-bold text-[--text] mt-1">
                {label.humanReadable}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2 text-xs">
              {Object.entries(label.metadata || {}).map(([k, v]) => (
                <div key={k} className="bg-[--page] rounded-lg px-2.5 py-1.5 border border-[--line]">
                  <div className="text-[10px] text-[--text-muted] uppercase tracking-wider">{k}</div>
                  <div className="font-mono font-semibold text-[--text] truncate">{String(v)}</div>
                </div>
              ))}
            </div>
          </div>
        ) : null}

        <DialogFooter className="gap-2 sm:gap-2 pt-2">
          <Button
            variant="outline"
            size="sm"
            onClick={onClose}
            className="text-xs border-[--line] bg-white hover:bg-[--muted-bg] text-[--text-2] rounded-full h-9 px-4 cursor-pointer"
          >
            Kapat
          </Button>
          <Button
            size="sm"
            disabled={!label}
            onClick={handlePrint}
            className="text-xs bg-[--brand] hover:bg-[--brand-hover] text-[var(--text)] font-semibold rounded-full h-9 px-4 gap-1.5 cursor-pointer shadow-sm disabled:opacity-50"
          >
            <Barcode className="h-3.5 w-3.5" />
            <span>Etiketi Yazdır / PDF</span>
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
