/**
 * Lojistik Faz 4 — Tersine Lojistik / İade (RMA) Genişletilmiş API Dağıtıcısı
 *
 * KURALLAR:
 * - Tüm Faz 4 okuma/yazma işlemleri `requireLogisticsAccess({ flagKey: "lojistik_iade", resource: "lojistik_iade", action })` ile korunur.
 * - "Tedarikçi" kapsamlı oturumlar şirket içi iade/mali işlem ekranlarına erişemez (403).
 * - Demo webhook simülasyonu yalnızca `isDemoEnvironment()` açıkken kullanılabilir.
 */

import { NextResponse } from "next/server"
import { prisma } from "@/lib/db"
import { isDemoEnvironment } from "@/lib/config/production-feature-flags"
import {
  LogisticsDomainError,
  handleLogisticsApiError,
  requireLogisticsAccess,
} from "@/lib/logistics/security"
import type { LogisticsPermissionAction } from "@/lib/logistics/types"
import {
  createRmaDocument,
  decideRmaInspection,
  generateRmaLabelPayload,
  listEligibleSalesOrdersForRma,
  listReturnPolicies,
  lookupOrderForRma,
  receiveRmaIntoQuarantine,
  transitionRmaStatus,
  upsertReturnPolicy,
} from "./rmaService"
import {
  getConfiguredWebhookSecret,
  getReturnsAnalyticsReport,
  ingestSecureReturnWebhook,
  listCreditNotes,
  listReturnWebhookLogs,
  processCreditNoteAction,
  pushChannelReturnStatusSync,
  signReturnWebhookPayload,
} from "./financeAndWebhookService"

export const FAZ4_GET_SECTIONS = new Set([
  "rma_list",
  "rma_detail",
  "order_lookup",
  "eligible_orders",
  "return_policies",
  "credit_notes",
  "webhook_logs",
  "return_analytics",
  "rma_label",
])

export const FAZ4_POST_ACTIONS = new Set([
  "lookup_order_for_rma",
  "create_rma",
  "transition_rma_status",
  "receive_rma_quarantine",
  "decide_rma_inspection",
  "process_credit_note",
  "upsert_return_policy",
  "push_rma_channel_status",
  "simulate_return_webhook",
])

function resolveReturnsPermissionAction(
  action: string,
  subAction?: string
): LogisticsPermissionAction {
  if (action === "lookup_order_for_rma") return "read"
  if (action === "create_rma") return "create"
  if (
    action === "decide_rma_inspection" ||
    action === "upsert_return_policy" ||
    (action === "process_credit_note" && subAction !== "REQUEST_DRAFT")
  ) {
    return "approve"
  }
  return "update"
}

export async function handleReturnsExtendedGet(request: Request) {
  const access = await requireLogisticsAccess({
    flagKey: "lojistik_iade",
    resource: "lojistik_iade",
    action: "read",
  })
  if (access instanceof NextResponse) return access

  if (access.scope.isSupplierScoped) {
    return NextResponse.json(
      {
        success: false,
        code: "FORBIDDEN_SUPPLIER_SCOPE",
        error: "Tedarikçi portal hesapları ERP iade yönetimine erişemez.",
      },
      { status: 403 }
    )
  }

  try {
    const { searchParams } = new URL(request.url)
    const section = searchParams.get("section") || "rma_list"

    if (section === "rma_list") {
      const status = searchParams.get("status")
      const reasonCode = searchParams.get("reasonCode")
      const channelCode = searchParams.get("channelCode")
      const q = searchParams.get("q")?.trim().toLowerCase()

      const rows = await (prisma as any).returnRmaRecord.findMany({
        include: { lines: true, events: true, creditNotes: true },
        orderBy: { createdAt: "desc" },
      })

      const filtered = rows.filter((r: any) => {
        if (status && status !== "ALL" && r.rmaStatus !== status) return false
        if (reasonCode && reasonCode !== "ALL" && r.reasonCode !== reasonCode) return false
        if (channelCode && channelCode !== "ALL" && r.channelCode !== channelCode) return false
        if (q) {
          const hay =
            `${r.rmaNumber} ${r.orderNumber} ${r.customerName} ${r.sku} ${r.itemName} ${r.returnTrackingNo || ""}`.toLowerCase()
          if (!hay.includes(q)) return false
        }
        return true
      })

      return NextResponse.json({ success: true, rmas: filtered })
    }

    if (section === "rma_detail") {
      const rmaId = searchParams.get("rmaId")
      const rmaNumber = searchParams.get("rmaNumber")
      const rma = rmaId
        ? await (prisma as any).returnRmaRecord.findUnique({
            where: { id: rmaId },
            include: { lines: true, events: true, creditNotes: true },
          })
        : rmaNumber
          ? await (prisma as any).returnRmaRecord.findFirst({
              where: { rmaNumber },
              include: { lines: true, events: true, creditNotes: true },
            })
          : null

      if (!rma) {
        return NextResponse.json({ success: false, error: "RMA kaydı bulunamadı." }, { status: 404 })
      }

      const [inspection, ncr, supplier] = await Promise.all([
        rma.inspectionId
          ? (prisma as any).uretimQualityInspection
              .findUnique({ where: { id: rma.inspectionId } })
              .catch(() => null)
          : null,
        rma.ncrId
          ? (prisma as any).uretimQualityNcr
              .findUnique({ where: { id: rma.ncrId } })
              .catch(() => null)
          : null,
        rma.supplierId
          ? (prisma as any).supplier
              .findUnique({ where: { id: rma.supplierId } })
              .catch(() => null)
          : null,
      ])

      return NextResponse.json({ success: true, rma, inspection, ncr, supplier })
    }

    if (section === "order_lookup") {
      const result = await lookupOrderForRma({
        orderNumber: searchParams.get("orderNumber") || undefined,
        orderId: searchParams.get("orderId") || undefined,
        orderSourceType: (searchParams.get("orderSourceType") as any) || undefined,
      })
      return NextResponse.json({ success: true, ...result })
    }

    if (section === "eligible_orders") {
      const orders = await listEligibleSalesOrdersForRma()
      return NextResponse.json({ success: true, orders })
    }

    if (section === "return_policies") {
      const policies = await listReturnPolicies()
      return NextResponse.json({ success: true, policies })
    }

    if (section === "credit_notes") {
      const creditNotes = await listCreditNotes(searchParams.get("rmaId") || undefined)
      return NextResponse.json({ success: true, creditNotes })
    }

    if (section === "webhook_logs") {
      const logs = await listReturnWebhookLogs()
      return NextResponse.json({ success: true, logs })
    }

    if (section === "return_analytics") {
      const analytics = await getReturnsAnalyticsReport({
        dateFrom: searchParams.get("dateFrom") || undefined,
        dateTo: searchParams.get("dateTo") || undefined,
        channelCode: searchParams.get("channelCode") || undefined,
      })
      return NextResponse.json({ success: true, analytics })
    }

    if (section === "rma_label") {
      const rmaId = searchParams.get("rmaId")
      if (!rmaId) {
        return NextResponse.json({ success: false, error: "rmaId parametresi gereklidir." }, { status: 400 })
      }
      const label = await generateRmaLabelPayload(rmaId)
      return NextResponse.json({ success: true, label })
    }

    return NextResponse.json({ success: false, error: `Bilinmeyen bölüm: ${section}` }, { status: 400 })
  } catch (error) {
    return handleLogisticsApiError(error, "Tersine lojistik verisi getirilemedi.")
  }
}

export async function handleReturnsExtendedPost(
  body: Record<string, any>
): Promise<NextResponse> {
  const action = String(body.action || "")
  const subAction = String(body.creditAction || body.subAction || "")
  const permAction = resolveReturnsPermissionAction(action, subAction)

  const access = await requireLogisticsAccess({
    flagKey: "lojistik_iade",
    resource: "lojistik_iade",
    action: permAction,
  })
  if (access instanceof NextResponse) return access

  if (access.scope.isSupplierScoped) {
    return NextResponse.json(
      {
        success: false,
        code: "FORBIDDEN_SUPPLIER_SCOPE",
        error: "Tedarikçi portal oturumu ile şirket içi iade işlemi yapılamaz.",
      },
      { status: 403 }
    )
  }

  const actorUserId = access.payload.userId
  const actorName = access.payload.username || "Yetkili"
  const branchId = access.payload.branchId

  try {
    if (action === "lookup_order_for_rma") {
      const result = await lookupOrderForRma({
        orderNumber: body.orderNumber,
        orderId: body.orderId,
        orderSourceType: body.orderSourceType,
      })
      return NextResponse.json({ success: true, ...result })
    }

    if (action === "create_rma") {
      const result = await createRmaDocument(
        {
          orderNumber: body.orderNumber,
          originalOrderId: body.originalOrderId,
          orderSourceType: body.orderSourceType,
          channelCode: body.channelCode,
          customerName: body.customerName,
          invoiceDocId: body.invoiceDocId,
          invoiceNo: body.invoiceNo,
          reasonCode: body.reasonCode,
          reasonNote: body.reasonNote,
          returnTrackingNo: body.returnTrackingNo,
          returnCarrierCode: body.returnCarrierCode,
          deliveredAt: body.deliveredAt,
          deadlineOverrideApproved: body.deadlineOverrideApproved,
          deadlineOverrideReason: body.deadlineOverrideReason,
          supplierId: body.supplierId,
          poId: body.poId,
          idempotencyKey: body.idempotencyKey,
          externalChannelRef: body.externalChannelRef,
          targetWarehouseId: body.targetWarehouseId,
          lines: body.lines || [],
        },
        actorUserId,
        actorName
      )
      return NextResponse.json({
        success: true,
        ...result,
        message: result.duplicate
          ? `Tekilleştirilen mevcut RMA kaydı döndü: ${result.rma.rmaNumber}`
          : `${result.rma.rmaNumber} RMA belgesi oluşturuldu.`,
      })
    }

    if (action === "transition_rma_status") {
      const result = await transitionRmaStatus({
        rmaId: body.rmaId,
        toStatus: body.toStatus,
        note: body.note,
        returnTrackingNo: body.returnTrackingNo,
        returnCarrierCode: body.returnCarrierCode,
        actorUserId,
        actorName,
        syncChannel: body.syncChannel,
      })
      return NextResponse.json({
        success: true,
        ...result,
        message: `${result.rma.rmaNumber} durumu güncellendi -> ${body.toStatus}.`,
      })
    }

    if (action === "receive_rma_quarantine") {
      const result = await receiveRmaIntoQuarantine({
        rmaId: body.rmaId,
        rmaNumber: body.rmaNumber,
        trackingNo: body.trackingNo,
        warehouseId: body.warehouseId,
        targetBinCode: body.targetBinCode,
        method: body.method || "WEB",
        deviceId: body.deviceId,
        idempotencyKey: body.idempotencyKey,
        note: body.note,
        actorUserId,
        actorName,
        receivedLines: body.receivedLines,
      })
      return NextResponse.json({
        success: true,
        ...result,
        message: result.duplicate
          ? `Mükerrer mal kabul atlandı (${result.rma.rmaNumber}).`
          : `${result.rma.rmaNumber} fiziksel mal kabulü tamamlandı ve karantinaya (${result.rma.targetBinCode}) alındı.`,
      })
    }

    if (action === "decide_rma_inspection") {
      const result = await decideRmaInspection({
        rmaId: body.rmaId,
        decision: body.decision,
        targetBinCode: body.targetBinCode,
        warehouseId: body.warehouseId,
        newExpiryDate: body.newExpiryDate,
        inspectorNote: body.inspectorNote,
        severity: body.severity,
        defectCategory: body.defectCategory,
        supplierId: body.supplierId,
        actorUserId,
        actorName,
      })
      return NextResponse.json({
        success: true,
        ...result,
        message: `${result.rma.rmaNumber} kalite kararı kaydedildi (${body.decision}).`,
      })
    }

    if (action === "process_credit_note") {
      const result = await processCreditNoteAction({
        action: (body.creditAction || body.subAction || "REQUEST_DRAFT") as any,
        rmaId: body.rmaId,
        creditNoteId: body.creditNoteId,
        netAmount: body.netAmount !== undefined ? Number(body.netAmount) : undefined,
        vatRate: body.vatRate !== undefined ? Number(body.vatRate) : undefined,
        notes: body.notes,
        branchId: body.branchId || branchId,
        actorUserId,
        actorName,
        closeRma: body.closeRma,
      })
      return NextResponse.json({
        success: true,
        ...result,
        message: `Kredi notası işlemi tamamlandı: ${result.creditNote.creditNoteNo} (${result.creditNote.status}).`,
      })
    }

    if (action === "upsert_return_policy") {
      const policy = await upsertReturnPolicy(
        {
          policyKey: body.policyKey,
          title: body.title,
          category: body.category,
          itemId: body.itemId,
          returnWindowDays: Number(body.returnWindowDays ?? 14),
          warrantyMonths: Number(body.warrantyMonths ?? 0),
          restockable: body.restockable,
          requireInspection: body.requireInspection,
          notes: body.notes,
          isActive: body.isActive,
        },
        actorUserId
      )
      return NextResponse.json({
        success: true,
        policy,
        message: `İade politikası kaydedildi: ${policy.title} (${policy.returnWindowDays} gün).`,
      })
    }

    if (action === "push_rma_channel_status") {
      const result = await pushChannelReturnStatusSync({
        rmaId: body.rmaId,
        statusOverride: body.statusOverride,
        actorUserId,
        actorName,
      })
      return NextResponse.json({
        success: true,
        ...result,
        message: result.syncRes.note,
      })
    }

    if (action === "simulate_return_webhook") {
      if (!isDemoEnvironment()) {
        throw new LogisticsDomainError(
          "DEMO_MODE_DISABLED",
          "Webhook test simülatörü yalnızca demo ortamında kullanılabilir.",
          403
        )
      }
      const ch = String(body.channelCode || "TRENDYOL").toUpperCase()
      const webhookPayload = body.payload || {
        event: "RETURN_REQUEST",
        channelCode: ch,
        orderNumber: body.orderNumber || "OMN-2026-9041",
        customerName: body.customerName || "KoçSistem Bilgi ve İletişim Hizmetleri A.Ş.",
        sku: body.sku || "SKU-CICEK-01",
        quantity: Number(body.quantity || 2),
        reasonCode: body.reasonCode || "HASARLI_KARGO",
        reason: body.reason || "Kargo paketinde ezilme bildirimi",
        trackingNumber: body.trackingNumber || `TRK-WH-${Date.now().toString().slice(-6)}`,
        externalRmaRef: body.externalRmaRef || `EXT-RMA-${Date.now().toString().slice(-6)}`,
        idempotencyKey: body.idempotencyKey || `demo-wh-${Date.now()}`,
      }
      const rawBody = JSON.stringify(webhookPayload)
      const secret = getConfiguredWebhookSecret(ch)
      const sig = signReturnWebhookPayload(rawBody, secret)
      const result = await ingestSecureReturnWebhook({
        channelCode: ch,
        rawBody,
        payload: webhookPayload,
        signatureHeader: sig,
      })
      return NextResponse.json({
        success: true,
        ...result,
        signatureUsed: sig,
        message: `İmzalı demo webhook alındı ve ${result.rmaNumber} RMA açıldı.`,
      })
    }

    return NextResponse.json({ success: false, error: `Bilinmeyen Faz 4 işlemi: ${action}` }, { status: 400 })
  } catch (error) {
    return handleLogisticsApiError(error, "Tersine lojistik işlemi başarısız.")
  }
}
