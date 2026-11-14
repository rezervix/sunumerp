/**
 * Lojistik Sağlayıcı Adaptörü — E-Ticaret İade Webhook & Bildirim Adaptörü
 */

import { prisma } from "@/lib/db"
import type {
  ILogisticsReturnWebhookProvider,
  ReturnWebhookPayload,
} from "../types"

export class DemoDbReturnWebhookProvider implements ILogisticsReturnWebhookProvider {
  readonly adapterId = "lojistik-demo-return-webhook"
  readonly displayName = "E-Ticaret İade Webhook (Demo Veritabanı)"
  readonly mode = "demo-db" as const

  async ingestReturnWebhook(payload: ReturnWebhookPayload) {
    const normalizedRmaNo =
      payload.externalRmaRef.startsWith("RMA-")
        ? payload.externalRmaRef
        : `RMA-${payload.channelCode.slice(0, 3).toUpperCase()}-${Date.now().toString().slice(-6)}`

    return {
      accepted: true,
      normalizedRmaNo,
      channelCode: payload.channelCode,
      receivedAt: new Date().toISOString(),
    }
  }

  async pushReturnStatus(rmaNumber: string, channelCode: string, status: string) {
    const rma = await (prisma as any).returnRmaRecord
      .findFirst({ where: { rmaNumber } })
      .catch(() => null)

    if (rma) {
      await (prisma as any).returnRmaRecord
        .update({
          where: { id: rma.id },
          data: { refundStatus: status },
        })
        .catch(() => null)
    }

    return {
      synced: true,
      syncedAt: new Date().toISOString(),
      note: `${channelCode} kanalına ${rmaNumber} iade durumu (${status}) aktarıldı.`,
    }
  }
}

export class ExternalWebhookReturnProvider implements ILogisticsReturnWebhookProvider {
  readonly adapterId = "lojistik-external-return-webhook"
  readonly displayName = "Harici Pazaryeri İade Webhook Adaptörü"
  readonly mode = "webhook" as const

  constructor(private readonly callbackBaseUrl: string) {}

  async ingestReturnWebhook(payload: ReturnWebhookPayload) {
    return {
      accepted: Boolean(payload.orderNumber && payload.sku),
      normalizedRmaNo: `RMA-WH-${payload.externalRmaRef}`,
      channelCode: payload.channelCode,
      receivedAt: new Date().toISOString(),
    }
  }

  async pushReturnStatus(rmaNumber: string, channelCode: string, status: string) {
    if (!this.callbackBaseUrl || !this.callbackBaseUrl.startsWith("http")) {
      throw new Error("Harici iade webhook URL yapılandırması eksik.")
    }
    const res = await fetch(`${this.callbackBaseUrl.replace(/\/$/, "")}/returns/status`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ rmaNumber, channelCode, status }),
    })
    if (!res.ok) {
      throw new Error(`İade webhook güncelleme hatası: HTTP ${res.status}`)
    }
    return {
      synced: true,
      syncedAt: new Date().toISOString(),
      note: `HTTP ${res.status}`,
    }
  }
}
