/**
 * Lojistik Faz 2 — RFID Okuyucu Portal & El Terminali EPC Giriş API'si
 *
 * Güvenlik:
 * - WMS operatör oturumu (requireLogisticsAccess -> inventory:update) VEYA
 * - Donanım okuyucu API anahtarı (`x-wms-rfid-key`, `InventoryApiKey` tablosu veya env `WMS_RFID_API_KEY`) ile çalışır.
 * - Her okuma `LojistikRfidTagEvent` tablosuna idempotencyKey korumasıyla yazılır.
 */

import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/db"
import {
  requireLogisticsAccess,
  handleLogisticsApiError,
  logLogisticsAudit,
} from "@/lib/logistics/security"
import { ingestRfidTagReads } from "@/lib/logistics/wms/operationsEngine"

async function verifyRfidHardwareKey(request: NextRequest): Promise<{
  authorized: boolean
  label?: string
}> {
  const headerKey = request.headers.get("x-wms-rfid-key")?.trim()
  if (!headerKey) return { authorized: false }

  if (process.env.WMS_RFID_API_KEY && headerKey === process.env.WMS_RFID_API_KEY) {
    return { authorized: true, label: "ENV_RFID_PORTAL" }
  }

  const keyRow = await prisma.inventoryApiKey
    .findFirst({ where: { keyPrefix: headerKey.slice(0, 12), isActive: true } })
    .catch(() => null)

  if (keyRow) {
    return { authorized: true, label: keyRow.name || "RFID_API_KEY" }
  }

  return { authorized: false }
}

export async function GET(request: NextRequest) {
  try {
    const auth = await requireLogisticsAccess({
      flagKey: "lojistik_wms",
      resource: "inventory",
      action: "read",
    })
    if (auth instanceof NextResponse) return auth

    const warehouseId = request.nextUrl.searchParams.get("warehouseId") || undefined
    const limit = Math.min(100, Math.max(10, Number(request.nextUrl.searchParams.get("limit") || 40)))

    const events = await (prisma as any).lojistikRfidTagEvent.findMany({
      ...(warehouseId && warehouseId !== "ALL" ? { where: { warehouseId } } : {}),
      orderBy: { scannedAt: "desc" },
      take: limit,
    })

    return NextResponse.json({
      success: true,
      events,
      apiDocumentation: {
        endpoint: "/api/wms/rfid",
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-wms-rfid-key": "<API Anahtarı (veya oturum çerezi)>",
        },
        samplePayload: {
          readerId: "PORTAL-MRK-KAPI-01",
          antennaPort: 1,
          warehouseId: "wh-merkez-01",
          reads: [
            {
              epcCode: "E280117000000201GUL0001",
              rssi: -46.5,
              scannedAt: new Date().toISOString(),
              idempotencyKey: "PORTAL-01-SCAN-1001",
            },
          ],
        },
      },
    })
  } catch (err) {
    return handleLogisticsApiError(err, "RFID olayları okunamadı.")
  }
}

export async function POST(request: NextRequest) {
  try {
    const hwAuth = await verifyRfidHardwareKey(request)
    let operatorName = hwAuth.label || "RFID Donanım"
    let actorUserId = "system-rfid"

    if (!hwAuth.authorized) {
      const auth = await requireLogisticsAccess({
        flagKey: "lojistik_wms",
        resource: "inventory",
        action: "update",
      })
      if (auth instanceof NextResponse) return auth
      operatorName = auth.payload.username || "WMS Operatör"
      actorUserId = auth.payload.userId
    }

    const body = await request.json()
    const result = await ingestRfidTagReads({
      readerId: String(body.readerId || "PORTAL-RFID-01"),
      antennaPort: body.antennaPort ? Number(body.antennaPort) : 1,
      warehouseId: body.warehouseId || undefined,
      countSessionId: body.countSessionId || undefined,
      reads: Array.isArray(body.reads) ? body.reads : [],
    })

    await logLogisticsAudit({
      userId: actorUserId,
      action: "RFID_INGEST",
      resource: "wms",
      resourceId: body.readerId || "RFID",
      moduleKey: "lojistik_wms",
      metadata: {
        receivedCount: result.receivedCount,
        matchedCount: result.matchedCount,
        operatorName,
      },
    })

    return NextResponse.json({
      success: true,
      message: `${result.receivedCount} RFID etiketi işlendi (${result.matchedCount} eşleşme).`,
      ...result,
    })
  } catch (err) {
    return handleLogisticsApiError(err, "RFID okuması işlenemedi.")
  }
}
