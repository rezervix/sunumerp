import crypto from "crypto"
import { NextResponse } from "next/server"
import { prisma } from "@/lib/db"
import {
  handleLogisticsApiError,
  logLogisticsAudit,
  requireLogisticsAccess,
} from "@/lib/logistics/security"
import { ingestExternalEdiAsn } from "@/lib/logistics/procurement"
import {
  checkRateLimit,
  resolveRequestClientIp,
} from "@/lib/security/rateLimiter"

/**
 * Harici EDI / DESADV ASN Entegrasyon Uç Noktası
 * Kimlik doğrulama: `x-edi-api-key` (EDI_ASN_WEBHOOK_KEY veya DB InventoryApiKey)
 * VEYA şirket içi yetkili `lojistik_tedarikci` personeli.
 */
export async function POST(request: Request) {
  try {
    const ip = resolveRequestClientIp(request.headers)
    const rl = checkRateLimit(`edi-asn:${ip}`, 60, 60_000)
    if (!rl.allowed) {
      return NextResponse.json(
        { success: false, code: "RATE_LIMIT_EXCEEDED", error: "EDI ASN hız limiti aşıldı." },
        { status: 429, headers: { "Retry-After": String(rl.retryAfterSec) } }
      )
    }

    const apiKeyHeader = request.headers.get("x-edi-api-key") || request.headers.get("x-api-key")
    let actor = "EDI_WEBHOOK"
    let actorUserId: string = "EDI_WEBHOOK_SYSTEM"

    if (apiKeyHeader) {
      const envKey = process.env.EDI_ASN_WEBHOOK_KEY || process.env.ERP_INTEGRATION_KEY
      let matched = Boolean(envKey && apiKeyHeader === envKey)

      if (!matched) {
        const dbKey = await prisma.inventoryApiKey.findFirst({
          where: { keyPrefix: apiKeyHeader.slice(0, 12), isActive: true },
        })
        if (dbKey) {
          matched = true
          actor = `API_KEY:${dbKey.name}`
          await prisma.inventoryApiKey.update({
            where: { id: dbKey.id },
            data: { lastUsedAt: new Date() },
          })
        }
      }

      if (!matched) {
        return NextResponse.json(
          { success: false, error: "Geçersiz veya pasif EDI API anahtarı." },
          { status: 401 }
        )
      }
    } else {
      const access = await requireLogisticsAccess({
        flagKey: "lojistik_tedarikci",
        resource: "lojistik_tedarikci",
        action: "create",
      })
      if (access instanceof NextResponse) return access
      if (access.scope.isSupplierScoped) {
        return NextResponse.json(
          {
            success: false,
            code: "FORBIDDEN_SUPPLIER_SCOPE",
            error: "Portal tedarikçileri harici EDI webhook'unu doğrudan tetikleyemez.",
          },
          { status: 403 }
        )
      }
      actor = access.payload.username
      actorUserId = access.payload.userId
    }

    const rawBody = await request.json()
    const result = await ingestExternalEdiAsn(rawBody, actor)

    await logLogisticsAudit({
      userId: actorUserId,
      action: "EDI_DESADV_INGESTED",
      resource: "lojistik_tedarikci",
      resourceId: result.asn.id,
      moduleKey: "lojistik_tedarikci",
      supplierId: result.asn.supplierId,
      metadata: {
        asnNumber: result.asn.asnNumber,
        poNumber: result.asn.poNumber,
        provider: result.providerNormalized.providerName,
      },
    })

    return NextResponse.json({
      success: true,
      ...result,
      message: `EDI DESADV sevkiyat bildirimi (${result.asn.asnNumber}) sisteme işlendi.`,
    })
  } catch (err) {
    return handleLogisticsApiError(err, "EDI ASN mesajı işlenemedi.")
  }
}
