/**
 * Lojistik Sağlayıcı Adaptörü — E-İrsaliye / E-Fatura Entegrasyonu
 *
 * Karar #5:
 * - Varsayılan sağlayıcı Demo-DB üzerinde çalışan dahili EDocumentRecord adaptörüdür.
 * - Gerçek GİB / özel entegratör bağlandığında sadece yapılandırma değişir.
 */

import crypto from "crypto"
import { prisma } from "@/lib/db"
import type {
  EDokumanGonderimIstegi,
  EDokumanGonderimSonucu,
  ILogisticsEDocumentProvider,
} from "../types"

export class DemoDbEDocumentProvider implements ILogisticsEDocumentProvider {
  readonly adapterId = "lojistik-demo-gib-edocument"
  readonly displayName = "GİB E-İrsaliye / E-Fatura (Demo Veritabanı)"
  readonly mode = "demo-db" as const

  async submitEDocument(
    req: EDokumanGonderimIstegi
  ): Promise<EDokumanGonderimSonucu> {
    const now = new Date()
    const ettnUuid = crypto.randomUUID().toUpperCase()
    const prefix = req.documentType.includes("IRSALIYE") ? "IRS" : "FTR"
    const seq = `${now.getFullYear()}${String(now.getTime()).slice(-7)}`
    const documentNo = `${prefix}${seq}`

    const linesWithTotals = req.lines.map((l) => {
      const net = Number(l.quantity) * Number(l.unitPrice ?? 0)
      const vatRate = Number(l.vatRate ?? 20)
      const vat = (net * vatRate) / 100
      return {
        sku: l.sku,
        name: l.name,
        quantity: l.quantity,
        unit: l.unit,
        unitPrice: l.unitPrice ?? 0,
        vatRate,
        lineNet: Math.round(net * 100) / 100,
        lineVat: Math.round(vat * 100) / 100,
      }
    })

    const totalNetAmount = linesWithTotals.reduce((s, l) => s + l.lineNet, 0)
    const totalVatAmount = linesWithTotals.reduce((s, l) => s + l.lineVat, 0)
    const totalGrossAmount = Math.round((totalNetAmount + totalVatAmount) * 100) / 100

    await (prisma as any).eDocumentRecord.create({
      data: {
        ettnUuid,
        documentNo,
        documentType: req.documentType,
        profileId: req.documentType.includes("IRSALIYE") ? "TEMELIRSALIYE" : "TICARIFATURA",
        relatedOrderNo: req.relatedOrderNo ?? req.shipmentWaveNo ?? null,
        receiverTitle: req.receiverTitle,
        receiverVknTckn: req.receiverVknTckn,
        receiverTaxOffice: req.receiverTaxOffice ?? "Merkez V.D.",
        dispatchDate: now,
        carrierName: req.carrierName ?? "Sunum İç Filo Lojistik",
        vehiclePlate: req.vehiclePlate ?? null,
        driverName: req.driverName ?? null,
        driverTckn: req.driverTckn ?? null,
        totalNetAmount: Math.round(totalNetAmount * 100) / 100,
        totalVatAmount: Math.round(totalVatAmount * 100) / 100,
        totalGrossAmount,
        currency: "TRY",
        gibStatusCode: "1300",
        gibStatusText: "GİB Başarıyla İletildi (Demo Adaptör)",
        linesJson: JSON.stringify(linesWithTotals),
      },
    })

    return {
      success: true,
      providerMode: this.mode,
      providerName: this.displayName,
      ettnUuid,
      documentNo,
      gibStatusCode: "1300",
      gibStatusText: "GİB Başarıyla İletildi (Demo Adaptör)",
      dispatchTimestamp: now.toISOString(),
    }
  }

  async queryEDocumentStatus(ettnUuid: string) {
    const existing = await (prisma as any).eDocumentRecord
      .findFirst({ where: { ettnUuid } })
      .catch(() => null)

    return {
      ettnUuid,
      gibStatusCode: existing?.gibStatusCode ?? "1300",
      gibStatusText: existing?.gibStatusText ?? "GİB Kaydı Doğrulandı",
      checkedAt: new Date().toISOString(),
    }
  }

  async cancelEDocument(ettnUuid: string, reason: string) {
    const existing = await (prisma as any).eDocumentRecord
      .findFirst({ where: { ettnUuid } })
      .catch(() => null)

    if (existing) {
      await (prisma as any).eDocumentRecord.update({
        where: { id: existing.id },
        data: {
          gibStatusCode: "IPTAL",
          gibStatusText: `İptal Edildi: ${reason}`,
        },
      })
    }

    return {
      success: Boolean(existing),
      cancelledAt: new Date().toISOString(),
      message: existing
        ? `ETTN ${ettnUuid} belgesi iptal edildi.`
        : `ETTN ${ettnUuid} kaydı bulunamadı.`,
    }
  }
}

export class GibIntegratorEDocumentProvider implements ILogisticsEDocumentProvider {
  readonly adapterId = "lojistik-gib-external-rest"
  readonly displayName = "Harici GİB Özel Entegratör (REST / UBL-TR)"
  readonly mode = "external-rest" as const

  constructor(
    private readonly apiUrl: string,
    private readonly apiKey?: string,
    private readonly integratorName?: string
  ) {}

  private buildHeaders(): Record<string, string> {
    const headers: Record<string, string> = { "Content-Type": "application/json" }
    const key = this.apiKey || process.env.LOJISTIK_EDOC_API_KEY
    if (key) {
      headers["Authorization"] = `Bearer ${key}`
      headers["X-Api-Key"] = key
    }
    if (this.integratorName) {
      headers["X-GIB-Integrator"] = this.integratorName
    }
    return headers
  }

  async submitEDocument(
    req: EDokumanGonderimIstegi
  ): Promise<EDokumanGonderimSonucu> {
    if (!this.apiUrl || !this.apiUrl.startsWith("http")) {
      throw new Error(
        "Harici GİB entegratör URL yapılandırması tanımlı değil (SystemConfig -> eDocumentApiUrl / LOJISTIK_EDOC_API_URL)."
      )
    }

    const res = await fetch(`${this.apiUrl.replace(/\/$/, "")}/documents/submit`, {
      method: "POST",
      headers: this.buildHeaders(),
      body: JSON.stringify(req),
    })
    if (!res.ok) {
      throw new Error(`Harici GİB entegratör hatası: HTTP ${res.status}`)
    }
    return (await res.json()) as EDokumanGonderimSonucu
  }

  async queryEDocumentStatus(ettnUuid: string) {
    if (!this.apiUrl || !this.apiUrl.startsWith("http")) {
      throw new Error("Harici GİB entegratör URL yapılandırması eksik.")
    }
    const res = await fetch(`${this.apiUrl.replace(/\/$/, "")}/documents/${ettnUuid}/status`, {
      headers: this.buildHeaders(),
    })
    if (!res.ok) {
      throw new Error(`Harici GİB durum sorgu hatası: HTTP ${res.status}`)
    }
    return await res.json()
  }

  async cancelEDocument(ettnUuid: string, reason: string) {
    if (!this.apiUrl || !this.apiUrl.startsWith("http")) {
      throw new Error("Harici GİB entegratör URL yapılandırması eksik.")
    }
    const res = await fetch(`${this.apiUrl.replace(/\/$/, "")}/documents/${ettnUuid}/cancel`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ reason }),
    })
    if (!res.ok) {
      throw new Error(`Harici GİB iptal hatası: HTTP ${res.status}`)
    }
    return await res.json()
  }
}
