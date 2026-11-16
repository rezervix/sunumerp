/**
 * Lojistik Sağlayıcı Adaptörü — Harici EDI ASN (DESADV / JSON) Entegrasyonu
 *
 * Sağlayıcı Adaptörü Mimarisi (Kural 4):
 * - Demo ortamında veya harici AS2/EDI URL'si tanımlı değilken DemoDbEdiAsnProvider çalışır;
 *   JSON ve UN/EDIFACT DESADV yüklerini ayrıştırıp normalleştirir.
 * - Gerçek EDI entegratörüne (LOJISTIK_EDI_ASN_API_URL) geçildiğinde yalnızca yapılandırma değişir.
 */

import type {
  EdiDesadvInput,
  EdiDesadvNormalizedResult,
  ILogisticsEdiAsnProvider,
} from "../types"

function parseUnEdifactDesadv(rawEdiText: string): Partial<EdiDesadvInput> {
  const segments = rawEdiText
    .replace(/\r?\n/g, "")
    .split("'")
    .map((s) => s.trim())
    .filter(Boolean)

  let externalRef = `EDI-${Date.now()}`
  let supplierCode = ""
  let supplierGln = ""
  let poNumber = ""
  let expectedArrivalAt = ""
  let waybillNo = ""
  let carrierName = ""
  let vehiclePlate = ""
  const lines: EdiDesadvInput["lines"] = []

  let currentLineSku = ""
  let currentLineQty = 0
  let currentLineLot = ""
  let currentLineExpiry = ""
  let currentLineSscc = ""

  const flushLine = () => {
    if (currentLineSku && currentLineQty > 0) {
      lines.push({
        sku: currentLineSku,
        shippedQty: currentLineQty,
        lotNumber: currentLineLot || undefined,
        expiryDate: currentLineExpiry || undefined,
        ssccCode: currentLineSscc || undefined,
      })
    }
    currentLineSku = ""
    currentLineQty = 0
    currentLineLot = ""
    currentLineExpiry = ""
    currentLineSscc = ""
  }

  for (const seg of segments) {
    const parts = seg.split("+")
    const tag = parts[0]
    if (tag === "BGM" && parts[2]) {
      externalRef = parts[2]
      waybillNo = parts[2]
    } else if (tag === "DTM") {
      const sub = (parts[1] || "").split(":")
      if (sub[0] === "137" || sub[0] === "132" || sub[0] === "2") {
        const rawDate = sub[1] || ""
        if (/^\d{8}$/.test(rawDate)) {
          expectedArrivalAt = `${rawDate.slice(0, 4)}-${rawDate.slice(4, 6)}-${rawDate.slice(6, 8)}T09:00:00.000Z`
        }
      } else if (sub[0] === "36" && /^\d{8}$/.test(sub[1] || "")) {
        currentLineExpiry = `${sub[1].slice(0, 4)}-${sub[1].slice(4, 6)}-${sub[1].slice(6, 8)}`
      }
    } else if (tag === "NAD" && (parts[1] === "SU" || parts[1] === "CZ")) {
      const glnOrCode = (parts[2] || "").split(":")[0]
      if (/^\d{13}$/.test(glnOrCode)) supplierGln = glnOrCode
      else if (glnOrCode) supplierCode = glnOrCode
    } else if (tag === "RFF") {
      const refSub = (parts[1] || "").split(":")
      if (refSub[0] === "ON" && refSub[1]) poNumber = refSub[1]
      if (refSub[0] === "DQ" && refSub[1]) waybillNo = refSub[1]
    } else if (tag === "TDT") {
      carrierName = parts[4] || carrierName
      vehiclePlate = (parts[8] || "").split(":")[0] || vehiclePlate
    } else if (tag === "LIN") {
      flushLine()
      const itemPart = (parts[3] || "").split(":")
      currentLineSku = itemPart[0] || ""
    } else if (tag === "QTY") {
      const qtyPart = (parts[1] || "").split(":")
      if (qtyPart[0] === "12") {
        currentLineQty = Number(qtyPart[1] || 0)
      }
    } else if (tag === "PCI" && parts[4]) {
      currentLineSscc = parts[4]
    } else if (tag === "GIN" && parts[1] === "BX") {
      currentLineLot = parts[2] || ""
    }
  }
  flushLine()

  return {
    externalRef,
    supplierCode: supplierCode || undefined,
    supplierGln: supplierGln || undefined,
    poNumber,
    waybillNo: waybillNo || undefined,
    carrierName: carrierName || undefined,
    vehiclePlate: vehiclePlate || undefined,
    expectedArrivalAt: expectedArrivalAt || undefined,
    lines,
  }
}

export class DemoDbEdiAsnProvider implements ILogisticsEdiAsnProvider {
  readonly adapterId = "lojistik-demo-edi-asn"
  readonly displayName = "EDI DESADV / ASN Adaptörü (Dahili Ayrıştırıcı)"
  readonly mode = "demo-db" as const

  async ingestDesadv(input: EdiDesadvInput): Promise<EdiDesadvNormalizedResult> {
    const parsedFromRaw = input.rawEdiText ? parseUnEdifactDesadv(input.rawEdiText) : {}
    const mergedLines =
      Array.isArray(input.lines) && input.lines.length > 0
        ? input.lines
        : parsedFromRaw.lines || []

    const poNumber = input.poNumber || parsedFromRaw.poNumber || ""
    const externalRef =
      input.externalRef || parsedFromRaw.externalRef || `EDI-DESADV-${Date.now()}`

    if (!poNumber || mergedLines.length === 0) {
      throw new Error(
        "EDI ASN mesajında geçerli PO numarası ve en az bir sevkiyat satırı (LIN/QTY) bulunmalıdır."
      )
    }

    return {
      accepted: true,
      providerMode: this.mode,
      providerName: this.displayName,
      externalRef,
      poNumber,
      supplierCode: input.supplierCode || parsedFromRaw.supplierCode,
      supplierGln: input.supplierGln || parsedFromRaw.supplierGln,
      waybillNo: input.waybillNo || parsedFromRaw.waybillNo || externalRef,
      carrierName: input.carrierName || parsedFromRaw.carrierName || "EDI Taşıyıcı Ağı",
      vehiclePlate: input.vehiclePlate || parsedFromRaw.vehiclePlate,
      expectedArrivalAt:
        input.expectedArrivalAt ||
        parsedFromRaw.expectedArrivalAt ||
        new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
      lines: mergedLines,
      receivedAt: new Date().toISOString(),
    }
  }

  async acknowledgeAsnReceipt(params: {
    asnNumber: string
    poNumber: string
    externalRef?: string | null
    acceptedQty: number
    damagedQty: number
  }) {
    return {
      acknowledged: true,
      providerMode: this.mode,
      providerName: this.displayName,
      ackRef: `APERAK-${params.asnNumber}-${Date.now().toString().slice(-5)}`,
      timestamp: new Date().toISOString(),
    }
  }
}

export class ExternalEdiGatewayProvider implements ILogisticsEdiAsnProvider {
  readonly adapterId = "lojistik-external-edi-asn"
  readonly displayName = "Harici AS2 / REST EDI Ağ Geçidi"
  readonly mode = "external-rest" as const

  constructor(private readonly apiUrl: string) {}

  async ingestDesadv(input: EdiDesadvInput): Promise<EdiDesadvNormalizedResult> {
    const res = await fetch(`${this.apiUrl.replace(/\/$/, "")}/desadv/parse`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input),
    })
    if (!res.ok) {
      throw new Error(`Harici EDI ağ geçidi yanıt vermedi (HTTP ${res.status}).`)
    }
    const payload = await res.json()
    return {
      ...payload,
      providerMode: this.mode,
      providerName: this.displayName,
    }
  }

  async acknowledgeAsnReceipt(params: {
    asnNumber: string
    poNumber: string
    externalRef?: string | null
    acceptedQty: number
    damagedQty: number
  }) {
    const res = await fetch(`${this.apiUrl.replace(/\/$/, "")}/aperak/send`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(params),
    })
    if (!res.ok) {
      throw new Error(`Harici EDI APERAK bildirimi başarısız (HTTP ${res.status}).`)
    }
    const data = await res.json()
    return {
      acknowledged: true,
      providerMode: this.mode,
      providerName: this.displayName,
      ackRef: data.ackRef || `EXT-ACK-${params.asnNumber}`,
      timestamp: new Date().toISOString(),
    }
  }
}
