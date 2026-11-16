/**
 * Lojistik Faz 4 — İade Mali Kredi Notası, E-Ticaret İade Webhook Güvenliği & Canlı İade Analitiği Servisi
 */

import crypto from "node:crypto"
import { prisma } from "@/lib/db"
import { isDemoEnvironment } from "@/lib/config/production-feature-flags"
import { LogisticsDomainError, logLogisticsAudit } from "@/lib/logistics/security"
import { createLogisticsProviders } from "@/lib/logistics/providers"
import {
  RMA_DECISION_LABELS,
  RMA_REASON_CODES,
  RMA_REASON_LABELS,
  evaluateReturnEligibility,
  isRmaEligibleForRefundTrigger,
  normalizeLegacyRmaStatus,
  type RmaQualityDecision,
  type RmaReasonCode,
} from "./constantsAndHelpers"
import { createRmaDocument, recordRmaEvent } from "./rmaService"

async function resolveDefaultBranchId(preferred?: string | null): Promise<string> {
  if (preferred) {
    const found = await prisma.branch.findUnique({ where: { id: preferred } }).catch(() => null)
    if (found) return found.id
  }
  const hq = await prisma.branch.findUnique({ where: { id: "local-debug-branch" } }).catch(() => null)
  if (hq) return hq.id
  const first = await prisma.branch.findFirst().catch(() => null)
  return first?.id || "local-debug-branch"
}

export async function listCreditNotes(rmaId?: string) {
  return (prisma as any).lojistikRmaCreditNote.findMany({
    where: rmaId ? { rmaId } : undefined,
    orderBy: { createdAt: "desc" },
  })
}

export async function processCreditNoteAction(params: {
  action: "REQUEST_DRAFT" | "APPROVE" | "ISSUE_AND_PAY" | "REJECT"
  rmaId?: string
  creditNoteId?: string
  netAmount?: number
  vatRate?: number
  notes?: string
  branchId?: string
  actorUserId?: string
  actorName?: string
  closeRma?: boolean
}) {
  const actorId = params.actorUserId || "system"
  const actorLabel = params.actorName || "Mali İşler"

  let creditNote: any = null
  if (params.creditNoteId) {
    creditNote = await (prisma as any).lojistikRmaCreditNote
      .findUnique({ where: { id: params.creditNoteId } })
      .catch(() => null)
  }

  const targetRmaId = params.rmaId || creditNote?.rmaId
  if (!targetRmaId) {
    throw new LogisticsDomainError("VALIDATION_ERROR", "RMA veya Kredi Notası kimliği gereklidir.", 400)
  }

  const rma = await (prisma as any).returnRmaRecord.findUnique({
    where: { id: targetRmaId },
    include: { lines: true, creditNotes: true },
  })
  if (!rma) {
    throw new LogisticsDomainError("RMA_NOT_FOUND", "İlgili iade (RMA) kaydı bulunamadı.", 404)
  }

  const rmaStatus = normalizeLegacyRmaStatus(rma)
  if (["REDDEDILDI", "IPTAL"].includes(rmaStatus)) {
    throw new LogisticsDomainError(
      "RMA_REJECTED_NO_REFUND",
      `Reddedilen veya iptal edilen iade (${rma.rmaNumber}) için mali işlem başlatılamaz.`,
      400
    )
  }

  // KRİTİK KAPIM KURALI: Fiziksel mal kabul + Kalite kararı olmadan İADE / KREDİ NOTASI KAPALI!
  if (params.action !== "REJECT" && !isRmaEligibleForRefundTrigger(rma)) {
    throw new LogisticsDomainError(
      "REFUND_BLOCKED_BEFORE_RECEIPT_AND_DECISION",
      `${rma.rmaNumber} için ödeme iadesi / kredi notası oluşturulamaz: Önce fiziksel mal kabul (TESLIM_ALINDI) ve kalite muayene kararı (KARARA_BAGLANDI) tamamlanmalıdır.`,
      400,
      {
        rmaNumber: rma.rmaNumber,
        rmaStatus,
        receivedAt: rma.receivedAt ?? null,
        qualityDecision: rma.qualityDecision ?? null,
      }
    )
  }

  const branchId = await resolveDefaultBranchId(params.branchId)

  if (!creditNote && params.action !== "REQUEST_DRAFT") {
    const existingList: any[] = Array.isArray(rma.creditNotes) ? rma.creditNotes : []
    creditNote = existingList.find((cn) => cn.status !== "REDDEDILDI") || null
  }

  // 1. TASLAK OLUŞTUR
  if (params.action === "REQUEST_DRAFT") {
    const activeExisting = (Array.isArray(rma.creditNotes) ? rma.creditNotes : []).find(
      (cn: any) => cn.status !== "REDDEDILDI"
    )
    if (activeExisting) {
      throw new LogisticsDomainError(
        "DUPLICATE_CREDIT_NOTE",
        `${rma.rmaNumber} için aktif bir kredi notası zaten mevcut (${activeExisting.creditNoteNo}).`,
        409,
        { existingCreditNoteId: activeExisting.id, creditNoteNo: activeExisting.creditNoteNo }
      )
    }

    const rmaLines: any[] = Array.isArray(rma.lines) ? rma.lines : []
    const defaultVatRate = Number(params.vatRate ?? rmaLines[0]?.vatRate ?? 20)

    let netAmount = 0
    let vatAmount = 0
    let grossAmount = 0

    if (typeof params.netAmount === "number" && params.netAmount > 0) {
      netAmount = Number(params.netAmount.toFixed(2))
      vatAmount = Number(((netAmount * defaultVatRate) / 100).toFixed(2))
      grossAmount = Number((netAmount + vatAmount).toFixed(2))
    } else {
      let computedGross = 0
      for (const l of rmaLines) {
        const physical = Number(l.receivedQty || 0) + Number(l.damagedQty || 0)
        const qty = physical > 0 ? physical : Number(l.requestedQty || 0)
        computedGross += qty * Number(l.unitPrice || 0)
      }
      grossAmount = Number((computedGross > 0 ? computedGross : Number(rma.refundAmount || 0)).toFixed(2))
      netAmount = Number((grossAmount / (1 + defaultVatRate / 100)).toFixed(2))
      vatAmount = Number((grossAmount - netAmount).toFixed(2))
    }

    const count = await (prisma as any).lojistikRmaCreditNote.count().catch(() => 0)
    const creditNoteNo = `CRN-2026-${String(count + 101).padStart(4, "0")}-${Math.floor(10 + Math.random() * 89)}`

    const created = await (prisma as any).lojistikRmaCreditNote.create({
      data: {
        creditNoteNo,
        rmaId: rma.id,
        rmaNumber: rma.rmaNumber,
        orderNumber: rma.orderNumber,
        customerName: rma.customerName,
        netAmount,
        vatAmount,
        grossAmount,
        currency: "TRY",
        status: "TASLAK_ONAY_BEKLIYOR",
        branchId,
        requestedBy: actorLabel,
        notes:
          params.notes ||
          `${rma.rmaNumber} (${rma.qualityDecision || "KALITE_ONAYLI"}) için mali kredi notası talebi.`,
      },
    })

    await recordRmaEvent({
      rmaId: rma.id,
      eventType: "CREDIT_NOTE_DRAFTED",
      fromStatus: rmaStatus,
      toStatus: rmaStatus,
      actorUserId: actorId,
      actorName: actorLabel,
      note: `Kredi notası taslağı oluşturuldu: ${created.creditNoteNo} (${grossAmount.toFixed(2)} TL).`,
      metadata: { creditNoteId: created.id, creditNoteNo: created.creditNoteNo, grossAmount },
    })

    await logLogisticsAudit({
      userId: actorId,
      action: "CREATE",
      resource: "lojistik_iade",
      resourceId: created.id,
      moduleKey: "lojistik_iade",
      branchId,
      metadata: { type: "CREDIT_NOTE_DRAFT", creditNoteNo: created.creditNoteNo, grossAmount },
    })

    return { creditNote: created, rma, eDocument: null, financeRecord: null }
  }

  if (!creditNote) {
    throw new LogisticsDomainError(
      "CREDIT_NOTE_NOT_FOUND",
      "İşlem yapılacak kredi notası kaydı bulunamadı. Önce taslak oluşturun.",
      404
    )
  }

  // 2. REDDET
  if (params.action === "REJECT") {
    const updatedCn = await (prisma as any).lojistikRmaCreditNote.update({
      where: { id: creditNote.id },
      data: {
        status: "REDDEDILDI",
        approvedBy: actorLabel,
        approvedAt: new Date(),
        notes: params.notes || creditNote.notes,
      },
    })

    const updatedRma = await (prisma as any).returnRmaRecord.update({
      where: { id: rma.id },
      data: { refundStatus: "REJECTED" },
      include: { lines: true, events: true, creditNotes: true },
    })

    await recordRmaEvent({
      rmaId: rma.id,
      eventType: "CREDIT_NOTE_REJECTED",
      fromStatus: rmaStatus,
      toStatus: rmaStatus,
      actorUserId: actorId,
      actorName: actorLabel,
      note: `Kredi notası reddedildi (${creditNote.creditNoteNo}): ${params.notes || "Mali onay verilmedi."}`,
    })

    await logLogisticsAudit({
      userId: actorId,
      action: "UPDATE",
      resource: "lojistik_iade",
      resourceId: creditNote.id,
      moduleKey: "lojistik_iade",
      branchId,
      metadata: { type: "CREDIT_NOTE_REJECTED", creditNoteNo: creditNote.creditNoteNo },
    })

    return { creditNote: updatedCn, rma: updatedRma, eDocument: null, financeRecord: null }
  }

  // 3. ONAYLA VE/VEYA ÖDE -> GERÇEK E-BELGE + FİNANS KAYDI
  if (creditNote.status === "REDDEDILDI") {
    throw new LogisticsDomainError(
      "CREDIT_NOTE_ALREADY_REJECTED",
      "Reddedilmiş kredi notası tekrar onaylanamaz.",
      400
    )
  }

  if (
    creditNote.status === "IADE_ODENDI" ||
    (params.action === "APPROVE" && creditNote.status === "ONAYLANDI")
  ) {
    return {
      duplicate: true,
      creditNote,
      rma,
      eDocument: creditNote.eDocumentId
        ? await (prisma as any).eDocumentRecord.findUnique({ where: { id: creditNote.eDocumentId } }).catch(() => null)
        : null,
      financeRecord: creditNote.financeId
        ? await prisma.finance.findUnique({ where: { id: creditNote.financeId } }).catch(() => null)
        : null,
    }
  }

  const now = new Date()
  let eDoc: any = creditNote.eDocumentId
    ? await (prisma as any).eDocumentRecord.findUnique({ where: { id: creditNote.eDocumentId } }).catch(() => null)
    : null

  if (!eDoc) {
    const ettnUuid = crypto.randomUUID()
    const docNo = `IAD2026${Date.now().toString().slice(-8)}${Math.floor(10 + Math.random() * 89)}`
    eDoc = await (prisma as any).eDocumentRecord.create({
      data: {
        ettnUuid,
        documentNo: docNo,
        documentType: "E_FATURA",
        profileId: "IADE",
        relatedOrderNo: rma.orderNumber,
        receiverTitle: rma.customerName,
        receiverVknTckn: "1111111111",
        receiverTaxOffice: "Kurumsal İade",
        carrierName: rma.returnCarrierCode || "İade Lojistik",
        totalNetAmount: Number(creditNote.netAmount || 0),
        totalVatAmount: Number(creditNote.vatAmount || 0),
        totalGrossAmount: Number(creditNote.grossAmount || 0),
        currency: creditNote.currency || "TRY",
        gibStatusCode: "1300",
        gibStatusText: `GİB Onaylı - İade Kredi Notası (${creditNote.creditNoteNo})`,
        linesJson: JSON.stringify(
          (Array.isArray(rma.lines) && rma.lines.length > 0
            ? rma.lines
            : [{ sku: rma.sku, itemName: rma.itemName, requestedQty: rma.returnQty, unitPrice: 0 }]
          ).map((l: any) => ({
            sku: l.sku,
            name: l.itemName,
            quantity: Number(l.receivedQty || 0) + Number(l.damagedQty || 0) || Number(l.requestedQty || 0),
            unitPrice: Number(l.unitPrice || 0),
          }))
        ),
      },
    })
  }

  let financeRecord: any = creditNote.financeId
    ? await prisma.finance.findUnique({ where: { id: creditNote.financeId } }).catch(() => null)
    : null

  if (!financeRecord) {
    financeRecord = await prisma.finance.create({
      data: {
        branchId,
        type: "EXPENSE",
        amount: Number(creditNote.grossAmount || 0),
        category: "Müşteri İadesi & Kredi Notası",
        description: `${creditNote.creditNoteNo} — ${rma.rmaNumber} (${rma.orderNumber}) / ${rma.customerName}`,
        status: "approved",
        approvedBy: actorLabel,
        date: now,
      },
    })
  }

  const nextCnStatus = params.action === "ISSUE_AND_PAY" ? "IADE_ODENDI" : "ONAYLANDI"
  const updatedCn = await (prisma as any).lojistikRmaCreditNote.update({
    where: { id: creditNote.id },
    data: {
      status: nextCnStatus,
      eDocumentId: eDoc?.id ?? null,
      eDocumentNo: eDoc?.documentNo ?? null,
      financeId: financeRecord?.id ?? null,
      approvedBy: creditNote.approvedBy || actorLabel,
      approvedAt: creditNote.approvedAt || now,
      paidAt: params.action === "ISSUE_AND_PAY" ? now : creditNote.paidAt,
      notes: params.notes || creditNote.notes,
    },
  })

  const shouldCloseRma =
    (params.action === "ISSUE_AND_PAY" || params.closeRma) && rmaStatus === "KARARA_BAGLANDI"

  const updatedRma = await (prisma as any).returnRmaRecord.update({
    where: { id: rma.id },
    data: {
      refundStatus: "APPROVED_CREDITED",
      refundAmount: Number(updatedCn.grossAmount || rma.refundAmount || 0),
      creditNoteNo: updatedCn.creditNoteNo,
      ...(shouldCloseRma
        ? {
            rmaStatus: "KAPANDI",
            closedAt: now,
            cycleHours: Number(
              ((now.getTime() - new Date(rma.createdAt).getTime()) / 3_600_000).toFixed(2)
            ),
          }
        : {}),
    },
    include: { lines: true, events: true, creditNotes: true },
  })

  await recordRmaEvent({
    rmaId: rma.id,
    eventType: params.action === "ISSUE_AND_PAY" ? "REFUND_PAID" : "CREDIT_NOTE_APPROVED",
    fromStatus: rmaStatus,
    toStatus: shouldCloseRma ? "KAPANDI" : rmaStatus,
    actorUserId: actorId,
    actorName: actorLabel,
    note: `${updatedCn.creditNoteNo} ${params.action === "ISSUE_AND_PAY" ? "ödendi & RMA kapatıldı" : "onaylandı"}. E-Belge: ${eDoc?.documentNo || "-"}, Finans Gideri: ${updatedCn.grossAmount.toFixed(2)} TL.`,
    metadata: {
      creditNoteId: updatedCn.id,
      creditNoteNo: updatedCn.creditNoteNo,
      eDocumentId: eDoc?.id ?? null,
      eDocumentNo: eDoc?.documentNo ?? null,
      financeId: financeRecord?.id ?? null,
    },
  })

  await logLogisticsAudit({
    userId: actorId,
    action: "APPROVE",
    resource: "lojistik_iade",
    resourceId: updatedCn.id,
    moduleKey: "lojistik_iade",
    branchId,
    metadata: {
      type: params.action,
      creditNoteNo: updatedCn.creditNoteNo,
      eDocumentNo: eDoc?.documentNo ?? null,
      financeId: financeRecord?.id ?? null,
      grossAmount: updatedCn.grossAmount,
    },
  })

  return {
    creditNote: updatedCn,
    rma: updatedRma,
    eDocument: eDoc,
    financeRecord,
  }
}

export function getConfiguredWebhookSecret(channelCode: string): string {
  const ch = String(channelCode || "EXTERNAL").toUpperCase().replace(/[^A-Z0-9_]/g, "_")
  return (
    process.env[`OMNICHANNEL_WEBHOOK_SECRET_${ch}`] ||
    process.env.OMNICHANNEL_WEBHOOK_SECRET ||
    (isDemoEnvironment() ? process.env.OMNICHANNEL_DEMO_SECRET || "sunum-demo-webhook-secret" : "")
  )
}

export function signReturnWebhookPayload(rawBody: string, secret: string): string {
  const hex = crypto.createHmac("sha256", secret).update(rawBody, "utf8").digest("hex")
  return `sha256=${hex}`
}

function timingSafeStringMatch(a: string, b: string): boolean {
  const bufA = Buffer.from(a, "utf8")
  const bufB = Buffer.from(b, "utf8")
  if (bufA.length !== bufB.length) return false
  return crypto.timingSafeEqual(bufA, bufB)
}

export function verifyReturnWebhookSignature(params: {
  rawBody: string
  signatureHeader?: string | null
  secretHeader?: string | null
  channelCode: string
}): { verified: boolean; reason?: string } {
  const secret = getConfiguredWebhookSecret(params.channelCode)
  if (!secret) {
    return { verified: false, reason: "WEBHOOK_SECRET_NOT_CONFIGURED" }
  }

  if (params.signatureHeader) {
    const provided = params.signatureHeader.trim().replace(/^sha256=/i, "").toLowerCase()
    const expected = crypto
      .createHmac("sha256", secret)
      .update(params.rawBody, "utf8")
      .digest("hex")
      .toLowerCase()
    if (timingSafeStringMatch(provided, expected)) {
      return { verified: true }
    }
    return { verified: false, reason: "INVALID_HMAC_SIGNATURE" }
  }

  if (params.secretHeader) {
    const clean = params.secretHeader.trim().replace(/^Bearer\s+/i, "")
    if (timingSafeStringMatch(clean, secret)) {
      return { verified: true }
    }
    return { verified: false, reason: "INVALID_CHANNEL_SECRET" }
  }

  return { verified: false, reason: "MISSING_WEBHOOK_SIGNATURE" }
}

function normalizeWebhookReasonCode(rawReason?: string | null): RmaReasonCode {
  if (!rawReason) return "CAYMA_HAKKI"
  const upper = String(rawReason).trim().toUpperCase()
  if ((RMA_REASON_CODES as readonly string[]).includes(upper)) {
    return upper as RmaReasonCode
  }
  const lower = String(rawReason).toLowerCase()
  if (lower.includes("hasar") || lower.includes("kırık") || lower.includes("kargo")) return "HASARLI_KARGO"
  if (lower.includes("yanlış") || lower.includes("eksik")) return "YANLIS_URUN"
  if (lower.includes("skt") || lower.includes("tazelik") || lower.includes("bozuk")) return "SKT_SORUNU"
  if (lower.includes("kalite") || lower.includes("kusur") || lower.includes("solgun")) return "KALITE_HATASI"
  if (lower.includes("garanti")) return "GARANTI_KAPSAMI"
  if (lower.includes("teslim") || lower.includes("adres")) return "TESLIM_EDILEMEDI"
  return "CAYMA_HAKKI"
}

export async function listReturnWebhookLogs(limit = 40) {
  return (prisma as any).lojistikRmaWebhookLog.findMany({
    orderBy: { createdAt: "desc" },
    take: limit,
  })
}

export async function ingestSecureReturnWebhook(params: {
  channelCode: string
  rawBody: string
  payload: Record<string, any>
  signatureHeader?: string | null
  secretHeader?: string | null
}) {
  const channel = String(params.channelCode || params.payload.channelCode || "EXTERNAL").toUpperCase()
  const sigCheck = verifyReturnWebhookSignature({
    rawBody: params.rawBody,
    signatureHeader: params.signatureHeader,
    secretHeader: params.secretHeader,
    channelCode: channel,
  })

  const idempotencyKey =
    String(
      params.payload.idempotencyKey ||
        params.payload.eventId ||
        params.payload.externalRmaRef ||
        `${channel}:${params.payload.orderNumber || "ORD"}:${params.payload.sku || "MULTI"}:${params.payload.trackingNumber || ""}`
    ).slice(0, 140)

  if (!sigCheck.verified) {
    await (prisma as any).lojistikRmaWebhookLog
      .create({
        data: {
          direction: "INBOUND",
          channelCode: channel,
          eventType: String(params.payload.event || params.payload.eventType || "RETURN_REQUEST"),
          externalRef: params.payload.externalRmaRef ?? null,
          idempotencyKey,
          signatureVerified: false,
          status: "REJECTED",
          payloadJson: params.rawBody.slice(0, 4000),
          responseNote: `İmza reddedildi: ${sigCheck.reason}`,
        },
      })
      .catch(() => null)

    throw new LogisticsDomainError(
      "WEBHOOK_SIGNATURE_INVALID",
      `Pazaryeri iade webhook doğrulaması başarısız (${sigCheck.reason}).`,
      401
    )
  }

  // Idempotency dedup
  const existingAccepted = await (prisma as any).lojistikRmaWebhookLog
    .findFirst({
      where: { idempotencyKey, direction: "INBOUND", status: "ACCEPTED" },
    })
    .catch(() => null)

  if (existingAccepted) {
    const existingRma = existingAccepted.rmaId
      ? await (prisma as any).returnRmaRecord
          .findUnique({
            where: { id: existingAccepted.rmaId },
            include: { lines: true, events: true, creditNotes: true },
          })
          .catch(() => null)
      : null

    await (prisma as any).lojistikRmaWebhookLog
      .create({
        data: {
          direction: "INBOUND",
          channelCode: channel,
          eventType: "RETURN_REQUEST",
          externalRef: params.payload.externalRmaRef ?? null,
          idempotencyKey: `${idempotencyKey}-dup-${Date.now()}`,
          rmaId: existingAccepted.rmaId ?? null,
          rmaNumber: existingAccepted.rmaNumber ?? null,
          signatureVerified: true,
          status: "DUPLICATE",
          payloadJson: params.rawBody.slice(0, 4000),
          responseNote: `Idempotency tekilleştirme: ${existingAccepted.rmaNumber} mevcut kayda bağlandı.`,
        },
      })
      .catch(() => null)

    return {
      accepted: true,
      duplicate: true,
      rma: existingRma,
      rmaNumber: existingAccepted.rmaNumber,
    }
  }

  const linesInput = Array.isArray(params.payload.lines) && params.payload.lines.length > 0
    ? params.payload.lines.map((l: any) => ({
        itemId: l.itemId ?? null,
        sku: String(l.sku || params.payload.sku || "SKU-01"),
        itemName: l.itemName || l.name || params.payload.itemName,
        requestedQty: Number(l.quantity || l.requestedQty || 1),
        unitPrice: l.unitPrice !== undefined ? Number(l.unitPrice) : undefined,
        lotNumber: l.lotNumber ?? null,
      }))
    : [
        {
          sku: String(params.payload.sku || "SKU-01"),
          itemName: params.payload.itemName,
          requestedQty: Number(params.payload.quantity || params.payload.returnQty || 1),
          unitPrice:
            params.payload.unitPrice !== undefined
              ? Number(params.payload.unitPrice)
              : params.payload.refundAmount !== undefined && Number(params.payload.quantity || 1) > 0
                ? Number(params.payload.refundAmount) / Number(params.payload.quantity || 1)
                : undefined,
        },
      ]

  const reasonCode = normalizeWebhookReasonCode(params.payload.reasonCode || params.payload.reason)
  const providers = createLogisticsProviders()
  const adapterAck = await providers.returnWebhook.ingestReturnWebhook({
    channelCode: channel,
    externalRmaRef: String(params.payload.externalRmaRef || idempotencyKey),
    orderNumber: String(params.payload.orderNumber || "EXT-SIPARIS"),
    customerName: String(params.payload.customerName || "Pazaryeri Müşterisi"),
    sku: linesInput[0].sku,
    quantity: linesInput.reduce((s: number, l: any) => s + Number(l.requestedQty || 0), 0),
    reason: params.payload.reason || RMA_REASON_LABELS[reasonCode],
    requestedAt: String(params.payload.requestedAt || new Date().toISOString()),
  })

  const createdResult = await createRmaDocument(
    {
      orderNumber: String(params.payload.orderNumber || `EXT-${Date.now().toString().slice(-6)}`),
      channelCode: channel,
      customerName: params.payload.customerName || "Pazaryeri Müşterisi",
      reasonCode,
      reasonNote: params.payload.reason || `${channel} Pazaryeri Webhook İade Talebi`,
      returnTrackingNo: params.payload.trackingNumber || params.payload.trackingNo || null,
      returnCarrierCode: params.payload.carrierCode || channel,
      idempotencyKey: `wh-${idempotencyKey}`,
      externalChannelRef: params.payload.externalRmaRef || adapterAck.normalizedRmaNo,
      deliveredAt: params.payload.deliveredAt || undefined,
      deadlineOverrideApproved: Boolean(params.payload.deadlineOverrideApproved),
      deadlineOverrideReason: params.payload.deadlineOverrideReason,
      lines: linesInput,
    },
    "webhook-gateway",
    `${channel} Webhook`
  )

  await (prisma as any).lojistikRmaWebhookLog.create({
    data: {
      direction: "INBOUND",
      channelCode: channel,
      eventType: "RETURN_REQUEST",
      externalRef: params.payload.externalRmaRef || adapterAck.normalizedRmaNo,
      idempotencyKey,
      rmaId: createdResult.rma.id,
      rmaNumber: createdResult.rma.rmaNumber,
      signatureVerified: true,
      status: createdResult.duplicate ? "DUPLICATE" : "ACCEPTED",
      payloadJson: params.rawBody.slice(0, 4000),
      responseNote: `${createdResult.rma.rmaNumber} RMA belgesi oluşturuldu (${providers.returnWebhook.adapterId || channel}).`,
    },
  })

  return {
    accepted: true,
    duplicate: createdResult.duplicate,
    rma: createdResult.rma,
    rmaNumber: createdResult.rma.rmaNumber,
  }
}

export async function pushChannelReturnStatusSync(params: {
  rmaId: string
  statusOverride?: string
  actorUserId?: string
  actorName?: string
}) {
  const rma = await (prisma as any).returnRmaRecord
    .findUnique({ where: { id: params.rmaId } })
    .catch(() => null)
  if (!rma) {
    throw new LogisticsDomainError("RMA_NOT_FOUND", "Senkronize edilecek RMA kaydı bulunamadı.", 404)
  }

  const targetStatus = params.statusOverride || normalizeLegacyRmaStatus(rma)
  const providers = createLogisticsProviders()
  const syncRes = await providers.returnWebhook.pushReturnStatus(
    rma.rmaNumber,
    rma.channelCode || "EXTERNAL",
    targetStatus
  )

  const logEntry = await (prisma as any).lojistikRmaWebhookLog.create({
    data: {
      direction: "OUTBOUND",
      channelCode: rma.channelCode || "EXTERNAL",
      eventType: "RMA_STATUS_PUSH",
      externalRef: rma.externalChannelRef ?? null,
      rmaId: rma.id,
      rmaNumber: rma.rmaNumber,
      signatureVerified: true,
      status: syncRes.synced ? "ACCEPTED" : "FAILED",
      payloadJson: JSON.stringify({
        rmaNumber: rma.rmaNumber,
        channelCode: rma.channelCode,
        status: targetStatus,
      }),
      responseNote: syncRes.note,
    },
  })

  await recordRmaEvent({
    rmaId: rma.id,
    eventType: "CHANNEL_SYNC_PUSHED",
    fromStatus: normalizeLegacyRmaStatus(rma),
    toStatus: normalizeLegacyRmaStatus(rma),
    actorUserId: params.actorUserId || "system",
    actorName: params.actorName || "Kanal Adaptörü",
    method: "WEBHOOK",
    note: syncRes.note,
  })

  return { syncRes, logEntry }
}

export async function getReturnsAnalyticsReport(filters?: {
  dateFrom?: string
  dateTo?: string
  channelCode?: string
}) {
  const [rmas, omnOrders, erpOrders, suppliers, scorecards, creditNotes] = await Promise.all([
    (prisma as any).returnRmaRecord
      .findMany({ include: { lines: true, creditNotes: true }, orderBy: { createdAt: "desc" } })
      .catch(() => []),
    (prisma as any).omnichannelOrder
      .findMany({ include: { shipmentLines: true } })
      .catch(() => []),
    prisma.order.findMany().catch(() => []),
    (prisma as any).supplier.findMany().catch(() => []),
    (prisma as any).lojistikSupplierScorecard
      .findMany({ orderBy: { calculatedAt: "desc" } })
      .catch(() => []),
    (prisma as any).lojistikRmaCreditNote.findMany().catch(() => []),
  ])

  const fromMs = filters?.dateFrom ? new Date(filters.dateFrom).getTime() : null
  const toMs = filters?.dateTo ? new Date(filters.dateTo).getTime() : null

  const filteredRmas = rmas.filter((r: any) => {
    if (filters?.channelCode && filters.channelCode !== "ALL" && r.channelCode !== filters.channelCode) {
      return false
    }
    const createdMs = new Date(r.createdAt).getTime()
    if (fromMs && Number.isFinite(fromMs) && createdMs < fromMs) return false
    if (toMs && Number.isFinite(toMs) && createdMs > toMs) return false
    return true
  })

  let totalSoldQty = 0
  for (const o of omnOrders) {
    for (const l of o.shipmentLines || []) {
      totalSoldQty += Number(l.quantity || 0)
    }
  }
  for (const eo of erpOrders) {
    totalSoldQty += Number(eo.quantity || 0)
  }

  const nonCancelled = filteredRmas.filter(
    (r: any) => !["REDDEDILDI", "IPTAL"].includes(normalizeLegacyRmaStatus(r))
  )

  const totalRmas = filteredRmas.length
  const totalReturnedQty = nonCancelled.reduce((s: number, r: any) => s + Number(r.returnQty || 0), 0)
  const returnRatePercent =
    totalSoldQty > 0 ? Number(((totalReturnedQty / totalSoldQty) * 100).toFixed(2)) : 0

  const byStatus: Record<string, number> = {}
  const reasonAgg = new Map<string, { reasonCode: string; label: string; count: number; qty: number; amountTry: number }>()
  const decisionAgg = new Map<string, { decision: string; label: string; count: number; recoveredTry: number; costTry: number }>()
  const productAgg = new Map<
    string,
    { sku: string; itemName: string; rmaCount: number; returnedQty: number; refundAmountTry: number; reasonCounts: Record<string, number> }
  >()
  const channelAgg = new Map<string, { channelCode: string; rmaCount: number; qty: number; refundAmountTry: number }>()
  const supplierAgg = new Map<
    string,
    { supplierId: string; rmaCount: number; rtvCount: number; scrapCount: number; totalCostTry: number }
  >()

  let cycleHoursSum = 0
  let cycleHoursCount = 0
  let totalRefundAmountTry = 0
  let totalCostImpactTry = 0
  let totalRecoveredValueTry = 0
  let expiringSoonCount = 0
  let quarantineWaitingCount = 0

  for (const r of filteredRmas) {
    const st = normalizeLegacyRmaStatus(r)
    byStatus[st] = (byStatus[st] || 0) + 1

    if (["TESLIM_ALINDI", "INCELEMEDE"].includes(st)) {
      quarantineWaitingCount += 1
    }

    if (["TALEP", "ONAYLANDI", "YOLDA"].includes(st) && r.deliveredAt) {
      const elig = evaluateReturnEligibility({
        deliveredAt: r.deliveredAt,
        policyReturnDays: r.returnWindowDays || 14,
      })
      if (elig.isExpiringSoon) expiringSoonCount += 1
    }

    if (Number(r.cycleHours || 0) > 0) {
      cycleHoursSum += Number(r.cycleHours)
      cycleHoursCount += 1
    } else if (r.decidedAt || r.closedAt) {
      const endMs = new Date(r.closedAt || r.decidedAt).getTime()
      const hrs = Math.max(0.5, (endMs - new Date(r.createdAt).getTime()) / 3_600_000)
      cycleHoursSum += hrs
      cycleHoursCount += 1
    }

    const rRefund = Number(r.refundAmount || 0)
    const rCost = Number(r.estimatedCostTry || 0)
    const rRec = Number(r.recoveredValueTry || 0)

    if (!["REDDEDILDI", "IPTAL"].includes(st)) {
      totalRefundAmountTry += rRefund
      totalCostImpactTry += rCost
      totalRecoveredValueTry += rRec
    }

    const rCode = (r.reasonCode || "CAYMA_HAKKI") as RmaReasonCode
    const existingReason = reasonAgg.get(rCode) || {
      reasonCode: rCode,
      label: RMA_REASON_LABELS[rCode] || rCode,
      count: 0,
      qty: 0,
      amountTry: 0,
    }
    existingReason.count += 1
    existingReason.qty += Number(r.returnQty || 0)
    existingReason.amountTry += rRefund
    reasonAgg.set(rCode, existingReason)

    if (r.qualityDecision) {
      const dec = r.qualityDecision as RmaQualityDecision
      const dEntry = decisionAgg.get(dec) || {
        decision: dec,
        label: RMA_DECISION_LABELS[dec] || dec,
        count: 0,
        recoveredTry: 0,
        costTry: 0,
      }
      dEntry.count += 1
      dEntry.recoveredTry += rRec
      dEntry.costTry += rCost
      decisionAgg.set(dec, dEntry)
    }

    const ch = r.channelCode || "ERP"
    const cEntry = channelAgg.get(ch) || {
      channelCode: ch,
      rmaCount: 0,
      qty: 0,
      refundAmountTry: 0,
    }
    cEntry.rmaCount += 1
    cEntry.qty += Number(r.returnQty || 0)
    cEntry.refundAmountTry += rRefund
    channelAgg.set(ch, cEntry)

    const lines: any[] =
      Array.isArray(r.lines) && r.lines.length > 0
        ? r.lines
        : [{ sku: r.sku, itemName: r.itemName, requestedQty: r.returnQty, unitPrice: 0, supplierId: r.supplierId }]

    for (const l of lines) {
      const skuKey = l.sku || r.sku
      const pEntry = productAgg.get(skuKey) || {
        sku: skuKey,
        itemName: l.itemName || r.itemName,
        rmaCount: 0,
        returnedQty: 0,
        refundAmountTry: 0,
        reasonCounts: {} as Record<string, number>,
      }
      pEntry.rmaCount += 1
      pEntry.returnedQty += Number(l.requestedQty || 0)
      pEntry.refundAmountTry +=
        Number(l.requestedQty || 0) * Number(l.unitPrice || 0) ||
        (lines.length === 1 ? rRefund : 0)
      pEntry.reasonCounts[rCode] = (pEntry.reasonCounts[rCode] || 0) + 1
      productAgg.set(skuKey, pEntry)
    }

    const supId = r.supplierId || lines.find((l: any) => l.supplierId)?.supplierId
    if (supId) {
      const sEntry = supplierAgg.get(supId) || {
        supplierId: supId,
        rmaCount: 0,
        rtvCount: 0,
        scrapCount: 0,
        totalCostTry: 0,
      }
      sEntry.rmaCount += 1
      if (r.qualityDecision === "RETURN_TO_VENDOR") sEntry.rtvCount += 1
      if (r.qualityDecision === "SCRAP") sEntry.scrapCount += 1
      sEntry.totalCostTry += rCost
      supplierAgg.set(supId, sEntry)
    }
  }

  const supplierById = new Map(suppliers.map((s: any) => [s.id, s]))
  const latestScorecardBySup = new Map<string, any>()
  for (const sc of scorecards) {
    if (!latestScorecardBySup.has(sc.supplierId)) {
      latestScorecardBySup.set(sc.supplierId, sc)
    }
  }

  const byReason = Array.from(reasonAgg.values())
    .sort((a, b) => b.count - a.count)
    .map((entry) => ({
      ...entry,
      amountTry: Number(entry.amountTry.toFixed(2)),
      sharePercent: totalRmas > 0 ? Number(((entry.count / totalRmas) * 100).toFixed(1)) : 0,
    }))

  const byProduct = Array.from(productAgg.values())
    .sort((a, b) => b.returnedQty - a.returnedQty)
    .slice(0, 12)
    .map((p) => {
      const topReason = Object.entries(p.reasonCounts).sort((a, b) => b[1] - a[1])[0]?.[0] || "CAYMA_HAKKI"
      return {
        sku: p.sku,
        itemName: p.itemName,
        rmaCount: p.rmaCount,
        returnedQty: Number(p.returnedQty.toFixed(2)),
        refundAmountTry: Number(p.refundAmountTry.toFixed(2)),
        primaryReasonCode: topReason,
        primaryReasonLabel: RMA_REASON_LABELS[topReason as RmaReasonCode] || topReason,
      }
    })

  const bySupplier = Array.from(supplierAgg.values())
    .sort((a, b) => b.totalCostTry - a.totalCostTry)
    .map((s) => {
      const sup: any = supplierById.get(s.supplierId)
      const sc: any = latestScorecardBySup.get(s.supplierId)
      return {
        supplierId: s.supplierId,
        supplierName: sup?.name || s.supplierId,
        rmaCount: s.rmaCount,
        rtvCount: s.rtvCount,
        scrapCount: s.scrapCount,
        totalCostTry: Number(s.totalCostTry.toFixed(2)),
        latestQualityScore: sc ? Number(sc.qualityScore || 0) : null,
        latestOverallScore: sc ? Number(sc.overallScore || 0) : null,
        latestRiskLevel: sc?.riskLevel || null,
      }
    })

  const openRmas = filteredRmas.filter(
    (r: any) => !["KAPANDI", "REDDEDILDI", "IPTAL"].includes(normalizeLegacyRmaStatus(r))
  ).length

  const totalCostAndRefundBase = totalRefundAmountTry + totalCostImpactTry
  const netRecoveryPercent =
    totalCostAndRefundBase > 0
      ? Number(((totalRecoveredValueTry / totalCostAndRefundBase) * 100).toFixed(1))
      : 0

  return {
    generatedAt: new Date().toISOString(),
    totalRmas,
    openRmas,
    closedRmas: byStatus["KAPANDI"] || 0,
    rejectedRmas: (byStatus["REDDEDILDI"] || 0) + (byStatus["IPTAL"] || 0),
    quarantineWaitingCount,
    expiringSoonCount,
    totalReturnedQty: Number(totalReturnedQty.toFixed(2)),
    totalSoldQty: Number(totalSoldQty.toFixed(2)),
    returnRatePercent,
    avgCycleHours: cycleHoursCount > 0 ? Number((cycleHoursSum / cycleHoursCount).toFixed(1)) : 0,
    totalRefundAmountTry: Number(totalRefundAmountTry.toFixed(2)),
    totalCostImpactTry: Number(totalCostImpactTry.toFixed(2)),
    totalRecoveredValueTry: Number(totalRecoveredValueTry.toFixed(2)),
    netRecoveryPercent,
    approvedCreditNotesCount: creditNotes.filter(
      (cn: any) => cn.status === "ONAYLANDI" || cn.status === "IADE_ODENDI"
    ).length,
    byStatus,
    byReason,
    byDecision: Array.from(decisionAgg.values()),
    byProduct,
    bySupplier,
    byChannel: Array.from(channelAgg.values()).sort((a, b) => b.rmaCount - a.rmaCount),
  }
}
