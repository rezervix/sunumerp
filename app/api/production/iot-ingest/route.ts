import { NextResponse } from "next/server"
import { getServerProductionFeatureFlags } from "@/lib/system-config"
import { ProductionDomainError, handleProductionApiError } from "@/lib/services/productionAuditAndError"
import { ingestIotRecordInDb } from "@/lib/services/productionWorkOrderServerDb"

/**
 * Endüstriyel IoT / PLC / SCADA / Terazi & Barkod Veri Toplama Entegrasyon Endpoint'i
 * POST /api/production/iot-ingest
 */
export async function POST(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const branchId = searchParams.get("branchId") || null
    const flags = getServerProductionFeatureFlags(branchId)

    if (!flags.uretim_is_emri) {
      return NextResponse.json(
        {
          success: false,
          error: "Üretim / İş Emri modülü özellik bayrağı kapalıdır.",
          code: "FEATURE_DISABLED",
        },
        { status: 403 }
      )
    }

    // Cihaz veya sistem kimlik doğrulaması (API anahtarı veya yetkili başlık)
    const apiKey =
      request.headers.get("x-device-api-key") ||
      request.headers.get("x-api-key") ||
      request.headers.get("authorization")

    // Geliştirme ortamında veya geçerli anahtarla izin verilir
    if (!apiKey && process.env.NODE_ENV === "production") {
      throw new ProductionDomainError(
        "UNAUTHORIZED",
        "Geçerli bir x-device-api-key başlığı sağlanmalıdır.",
        undefined,
        401
      )
    }

    const body = await request.json().catch(() => ({}))

    if (!body.deviceId) {
      throw new ProductionDomainError(
        "VALIDATION_ERROR",
        "deviceId (cihaz / PLC / terazi kimliği) zorunludur."
      )
    }

    const staging = await ingestIotRecordInDb({
      deviceId: String(body.deviceId),
      deviceType: body.deviceType || "PLC",
      workOrderId: body.workOrderId || undefined,
      operationId: body.operationId || undefined,
      sensorKey: body.sensorKey || undefined,
      payload: body.payload || body,
    })

    return NextResponse.json(
      {
        success: true,
        stagingId: staging.id,
        receivedAt: staging.receivedAt,
        status: staging.status,
      },
      { status: 201 }
    )
  } catch (error: any) {
    return handleProductionApiError(error)
  }
}

