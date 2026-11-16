/**
 * Lojistik Faz 3 — /api/procurement Genişletilmiş Sorgu ve İşlem Dağıtıcısı
 *
 * KURALLAR:
 * - Mevcut GET (overview) ve POST sözleşmeleri %100 korunur.
 * - Sadece şirket içi yetkilendirilmiş kullanıcılar erişebilir;
 *   "Tedarikçi" rolündeki oturumlar (`isSupplierScoped === true`) her zaman 403 alır.
 * - Her yazma/onay/iptal işlemi Audit Log'a yazılır.
 */

import { NextResponse } from "next/server"
import { prisma } from "@/lib/db"
import {
  requireLogisticsAccess,
  handleLogisticsApiError,
  logLogisticsAudit,
} from "@/lib/logistics/security"
import {
  getProcurementOverviewSnapshot,
  createPurchaseRequisition,
  approvePurchaseRequisition,
  settleConsignmentStock,
  seedRealisticProcurementData,
} from "@/lib/services/procurementServerDb"
import { calculateDynamicReorderPoint } from "@/lib/services/procurementReorderEngine"
import {
  listSuppliersEnriched,
  upsertSupplierRecord,
  listSupplierItemLinks,
  upsertSupplierItemLink,
  listSupplierDocuments,
  createSupplierDocument,
  reviewSupplierDocumentStatus,
  getSingleSourceRiskReport,
  recalculateEoqPoliciesAndSuggestions,
} from "./supplierMasterService"
import {
  listRfqsEnriched,
  createRfq,
  submitRfqQuote,
  getRfqComparisonMatrix,
  awardRfqAndConvertToPo,
  createLojistikPurchaseOrder,
  processPoApprovalStep,
  dispatchPoToSupplier,
  recordSupplierPoResponse,
  listPurchaseOrdersEnriched,
  convertReorderPolicyToPo,
} from "./rfqAndPoService"
import {
  createSupplierAsn,
  advanceAsnStatus,
  ingestExternalEdiAsn,
  listAsnsEnriched,
  receiveAsnIntoWms,
} from "./asnAndReceivingService"
import {
  getScorecardConfig,
  updateScorecardWeights,
  recalculateAllSupplierScorecards,
  getSupplierScorecardsSummary,
} from "./scorecardService"
import {
  createSupplierPortalInvite,
  revokeSupplierPortalInvite,
  listSupplierPortalInvites,
} from "./inviteToken"

function resolveProcurementPermissionAction(
  action: string
): "read" | "create" | "update" | "delete" | "approve" {
  if (
    action === "approve_requisition" ||
    action === "process_po_approval" ||
    action === "award_rfq" ||
    action === "review_supplier_document" ||
    action === "update_scorecard_weights"
  ) {
    return "approve"
  }
  if (
    action.startsWith("create_") ||
    action === "submit_rfq_quote" ||
    action === "upload_supplier_document" ||
    action === "ingest_edi_asn" ||
    action === "convert_eoq_to_po" ||
    action === "receive_asn_to_wms" ||
    action === "upsert_supplier" ||
    action === "upsert_supplier_item_link"
  ) {
    return "create"
  }
  return "update"
}

export async function handleProcurementGet(request: Request) {
  const access = await requireLogisticsAccess({
    flagKey: "lojistik_tedarikci",
    resource: "lojistik_tedarikci",
    action: "read",
  })
  if (access instanceof NextResponse) return access

  if (access.scope.isSupplierScoped) {
    return NextResponse.json(
      {
        success: false,
        code: "FORBIDDEN_SUPPLIER_SCOPE",
        error: "Tedarikçi portal hesapları ERP Satın Alma yönetici ekranına erişemez.",
      },
      { status: 403 }
    )
  }

  try {
    const { searchParams } = new URL(request.url)
    const section = searchParams.get("section") || "overview"

    if (section === "suppliers") {
      const [suppliers, links] = await Promise.all([
        listSuppliersEnriched({
          status: searchParams.get("status") || undefined,
          category: searchParams.get("category") || undefined,
          criticality: searchParams.get("criticality") || undefined,
          search: searchParams.get("search") || undefined,
        }),
        listSupplierItemLinks({
          supplierId: searchParams.get("supplierId") || undefined,
          itemId: searchParams.get("itemId") || undefined,
        }),
      ])
      return NextResponse.json({ success: true, suppliers, itemLinks: links })
    }

    if (section === "rfqs") {
      const rfqs = await listRfqsEnriched({
        status: searchParams.get("status") || undefined,
      })
      return NextResponse.json({ success: true, rfqs })
    }

    if (section === "rfq_compare") {
      const rfqId = searchParams.get("rfqId") || ""
      const matrix = await getRfqComparisonMatrix(rfqId)
      return NextResponse.json({ success: true, ...matrix })
    }

    if (section === "purchase_orders") {
      const purchaseOrders = await listPurchaseOrdersEnriched({
        status: searchParams.get("status") || undefined,
        supplierId: searchParams.get("supplierId") || undefined,
        warehouseId: searchParams.get("warehouseId") || undefined,
      })
      return NextResponse.json({ success: true, purchaseOrders })
    }

    if (section === "asns") {
      const asns = await listAsnsEnriched({
        status: searchParams.get("status") || undefined,
        supplierId: searchParams.get("supplierId") || undefined,
        warehouseId: searchParams.get("warehouseId") || undefined,
      })
      return NextResponse.json({ success: true, asns })
    }

    if (section === "scorecards") {
      const summary = await getSupplierScorecardsSummary()
      return NextResponse.json({ success: true, ...summary })
    }

    if (section === "single_source_risk") {
      const report = await getSingleSourceRiskReport()
      return NextResponse.json({ success: true, ...report })
    }

    if (section === "eoq_suggestions") {
      const eoqPolicies = await recalculateEoqPoliciesAndSuggestions(
        searchParams.get("warehouseId") || undefined
      )
      return NextResponse.json({ success: true, eoqPolicies })
    }

    if (section === "documents") {
      const documents = await listSupplierDocuments(searchParams.get("supplierId") || undefined)
      return NextResponse.json({ success: true, documents })
    }

    if (section === "portal_invites") {
      const invites = await listSupplierPortalInvites(searchParams.get("supplierId") || undefined)
      return NextResponse.json({ success: true, invites })
    }

    // Varsayılan "overview": Mevcut Faz 0/1 sözleşmesi alanları korunur + Faz 3 özet katmanı eklenir
    const [
      legacySnapshot,
      enrichedSuppliers,
      rfqs,
      purchaseOrders,
      asns,
      scorecards,
      singleSourceRisk,
      eoqPolicies,
      documents,
      invites,
      links,
      warehouses,
    ] = await Promise.all([
      getProcurementOverviewSnapshot(),
      listSuppliersEnriched(),
      listRfqsEnriched(),
      listPurchaseOrdersEnriched(),
      listAsnsEnriched(),
      getSupplierScorecardsSummary(),
      getSingleSourceRiskReport(),
      recalculateEoqPoliciesAndSuggestions(),
      listSupplierDocuments(),
      listSupplierPortalInvites(),
      listSupplierItemLinks(),
      prisma.warehouse.findMany({ where: { isActive: true }, orderBy: { name: "asc" } }),
    ])

    const pendingApprovalPoCount = purchaseOrders.filter((p: any) => p.status === "ONAY_BEKLIYOR").length
    const redFlagPoCount = purchaseOrders.filter((p: any) => p.status === "RED_BAYRAK").length
    const openRfqCount = rfqs.filter((r: any) => ["TEKLIFE_ACIK", "DEGERLENDIRMEDE"].includes(r.status)).length
    const openAsnCount = asns.filter((a: any) => ["ON_IHBAR", "YOLDA", "KAPI_GIRIS"].includes(a.status)).length
    const expiringDocsCount = documents.filter(
      (d: any) => d.status === "YENILEME_YAKIN" || d.status === "SURESI_DOLMUS"
    ).length
    const eoqTriggeredCount = eoqPolicies.filter((p: any) => p.needsReorder).length

    const { success: _ignoredLegacySuccess, ...legacyData } = (legacySnapshot || {}) as any

    return NextResponse.json({
      success: true,
      ...legacyData,
      suppliers: enrichedSuppliers,
      rfqs,
      purchaseOrders,
      asns,
      scorecards,
      singleSourceRisk,
      eoqPolicies,
      documents,
      invites,
      itemLinks: links,
      warehouses,
      faz3Summary: {
        totalSuppliers: enrichedSuppliers.length,
        approvedSuppliers: enrichedSuppliers.filter((s: any) => s.approvalStatus === "ONAYLI").length,
        blacklistedSuppliers: enrichedSuppliers.filter((s: any) => s.approvalStatus === "KARALISTE").length,
        pendingApprovalPoCount,
        redFlagPoCount,
        openRfqCount,
        openAsnCount,
        singleSourceRiskCount: singleSourceRisk.singleSourceRiskCount + singleSourceRisk.noApprovedSupplierCount,
        expiringDocsCount,
        eoqTriggeredCount,
        avgSupplierScore: scorecards.avgComposite,
      },
    })
  } catch (err) {
    return handleLogisticsApiError(err, "Satın alma ve tedarikçi verileri alınamadı.")
  }
}

export async function handleProcurementPost(request: Request) {
  let body: Record<string, any> = {}
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ success: false, error: "Geçersiz JSON gövdesi." }, { status: 400 })
  }

  const action = String(body.action || "")
  const permAction = resolveProcurementPermissionAction(action)

  const access = await requireLogisticsAccess({
    flagKey: "lojistik_tedarikci",
    resource: "lojistik_tedarikci",
    action: permAction,
  })
  if (access instanceof NextResponse) return access

  if (access.scope.isSupplierScoped) {
    return NextResponse.json(
      {
        success: false,
        code: "FORBIDDEN_SUPPLIER_SCOPE",
        error: "Tedarikçi portal oturumu ile şirket içi satın alma işlemi yapılamaz.",
      },
      { status: 403 }
    )
  }

  const actor = access.payload.username || "Satın Alma Yöneticisi"
  const actorUserId = access.payload.userId
  const branchId = access.payload.branchId

  try {
    const buildLegacyReqInput = (payloadBody: Record<string, any>) => {
      const firstLine = Array.isArray(payloadBody.lines) ? payloadBody.lines[0] : null
      return {
        warehouseId: payloadBody.warehouseId,
        supplierId: payloadBody.supplierId,
        itemId: String(payloadBody.itemId || firstLine?.itemId || ""),
        quantity: Number(payloadBody.quantity ?? firstLine?.quantity ?? 1),
        unitCost: payloadBody.unitCost ?? firstLine?.unitCost,
        priority: payloadBody.priority,
        notes: payloadBody.notes,
        triggerSource: payloadBody.triggerSource,
      }
    }

    // ── Legacy Mevcut İşlemler (Tam Geriye Dönük Uyumluluk) ───────────────────
    if (action === "create_requisition") {
      const req = await createPurchaseRequisition(buildLegacyReqInput(body))
      return NextResponse.json({
        success: true,
        requisition: req.requisition ?? req,
        message: "Satınalma talebi oluşturuldu ve onaya gönderildi.",
      })
    }

    if (action === "approve_requisition") {
      const res: any = await approvePurchaseRequisition(body.reqId, body.approvedBy || actor)
      const { success: _ok, ...rest } = res || {}
      return NextResponse.json({
        success: true,
        ...rest,
        message: "Talep onaylandı ve Satınalma Siparişi (PO) oluşturuldu.",
      })
    }

    if (action === "settle_consignment") {
      const updated = await settleConsignmentStock(body.consignmentId, Number(body.consumedQty))
      return NextResponse.json({
        success: true,
        consignment: updated,
        message: "Konsinye tüketim faturası hesaplandı ve mahsuplaşıldı.",
      })
    }

    if (action === "calculate_rop") {
      const calc = calculateDynamicReorderPoint({
        avgDailyDemand: Number(body.avgDailyDemand),
        demandStdDev: Number(body.demandStdDev),
        leadTimeDays: Number(body.leadTimeDays),
        serviceLevelPercent: Number(body.serviceLevelPercent || 95),
        seasonalityMultiplier: Number(body.seasonalityMultiplier || 1.0),
        currentAvailableQty: Number(body.currentAvailableQty || 0),
        onOrderQty: Number(body.onOrderQty || 0),
        minOrderQtyMoq: Number(body.minOrderQtyMoq || 1),
      })
      return NextResponse.json({ success: true, calculation: calc })
    }

    if (action === "seed_reset") {
      await seedRealisticProcurementData()
      return NextResponse.json({ success: true, message: "Satınalma verileri sıfırlandı ve yüklendi." })
    }

    // ── Faz 3: Tedarikçi Ana Kart, Katalog & Belge Kasası ──────────────────────
    if (action === "upsert_supplier") {
      const supplier = await upsertSupplierRecord(body as any, actor)
      await logLogisticsAudit({
        userId: actorUserId,
        action: body.id ? "SUPPLIER_UPDATED" : "SUPPLIER_CREATED",
        resource: "lojistik_tedarikci",
        resourceId: supplier.id,
        moduleKey: "lojistik_tedarikci",
        branchId,
        supplierId: supplier.id,
        metadata: { code: supplier.code, approvalStatus: supplier.approvalStatus, glnNumber: supplier.glnNumber },
      })
      return NextResponse.json({
        success: true,
        supplier,
        message: `${supplier.name} tedarikçi kartı kaydedildi.`,
      })
    }

    if (action === "upsert_supplier_item_link") {
      const link = await upsertSupplierItemLink(body as any)
      await logLogisticsAudit({
        userId: actorUserId,
        action: "SUPPLIER_ITEM_LINKED",
        resource: "lojistik_tedarikci",
        resourceId: link.id,
        moduleKey: "lojistik_tedarikci",
        branchId,
        supplierId: link.supplierId,
        metadata: { itemId: link.itemId, isPrimary: link.isPrimary, unitCost: link.unitCost },
      })
      return NextResponse.json({
        success: true,
        link,
        message: "Tedarikçi-ürün katalog bağlantısı kaydedildi.",
      })
    }

    if (action === "upload_supplier_document") {
      const document = await createSupplierDocument({
        supplierId: body.supplierId,
        docType: body.docType,
        title: body.title,
        fileName: body.fileName,
        fileUrl: body.fileUrl,
        mimeType: body.mimeType,
        fileSizeBytes: body.fileSizeBytes,
        validFrom: body.validFrom,
        expiresAt: body.expiresAt,
        uploadedBy: actor,
        uploadedVia: "ERP",
        notes: body.notes,
      })
      await logLogisticsAudit({
        userId: actorUserId,
        action: "SUPPLIER_DOC_UPLOADED",
        resource: "lojistik_tedarikci",
        resourceId: document.id,
        moduleKey: "lojistik_tedarikci",
        branchId,
        supplierId: document.supplierId,
        metadata: { docType: document.docType, status: document.status },
      })
      return NextResponse.json({
        success: true,
        document,
        message: `${document.title} belge kasasına eklendi.`,
      })
    }

    if (action === "review_supplier_document") {
      const document = await reviewSupplierDocumentStatus(body.docId, body.decision)
      return NextResponse.json({
        success: true,
        document,
        message: "Belge inceleme durumu güncellendi.",
      })
    }

    // ── Faz 3: RFQ & Teklif Karşılaştırma & PO Dönüşümü ────────────────────────
    if (action === "create_rfq") {
      const rfq = await createRfq(body as any, actor)
      await logLogisticsAudit({
        userId: actorUserId,
        action: "RFQ_CREATED",
        resource: "lojistik_tedarikci",
        resourceId: rfq.id,
        moduleKey: "lojistik_tedarikci",
        branchId,
        metadata: { rfqNumber: rfq.rfqNumber, itemCount: (rfq.items || []).length },
      })
      return NextResponse.json({
        success: true,
        rfq,
        message: `${rfq.rfqNumber} teklif talebi (RFQ) açıldı.`,
      })
    }

    if (action === "submit_rfq_quote") {
      const quote = await submitRfqQuote(body as any, actor, "ERP")
      await logLogisticsAudit({
        userId: actorUserId,
        action: "RFQ_QUOTE_SUBMITTED",
        resource: "lojistik_tedarikci",
        resourceId: quote.id,
        moduleKey: "lojistik_tedarikci",
        branchId,
        supplierId: quote.supplierId,
        metadata: { rfqId: quote.rfqId, quoteNumber: quote.quoteNumber, tcoTotal: quote.tcoTotal },
      })
      return NextResponse.json({
        success: true,
        quote,
        message: `${quote.quoteNumber} teklifi kaydedildi (TCO: ₺${quote.tcoTotal.toLocaleString("tr-TR")}).`,
      })
    }

    if (action === "award_rfq") {
      const result = await awardRfqAndConvertToPo(body as any, actor)
      await logLogisticsAudit({
        userId: actorUserId,
        action: "RFQ_AWARDED_TO_PO",
        resource: "lojistik_tedarikci",
        resourceId: result.purchaseOrder.id,
        moduleKey: "lojistik_tedarikci",
        branchId,
        supplierId: result.purchaseOrder.supplierId,
        metadata: {
          rfqId: result.rfqId,
          quoteId: result.quoteId,
          poNumber: result.purchaseOrder.poNumber,
        },
      })
      return NextResponse.json({
        success: true,
        ...result,
        message: `Teklif kazanan olarak seçildi ve ${result.purchaseOrder.poNumber} satın alma emri oluşturuldu.`,
      })
    }

    // ── Faz 3: Çok Kademeli PO Yaşam Döngüsü ───────────────────────────────────
    if (action === "create_po") {
      const po = await createLojistikPurchaseOrder(body as any, actor)
      await logLogisticsAudit({
        userId: actorUserId,
        action: "PO_CREATED",
        resource: "lojistik_tedarikci",
        resourceId: po.id,
        moduleKey: "lojistik_tedarikci",
        branchId,
        supplierId: po.supplierId,
        metadata: {
          poNumber: po.poNumber,
          agreedTotalAmount: po.agreedTotalAmount,
          requiredApprovalSteps: po.requiredApprovalSteps,
        },
      })
      return NextResponse.json({
        success: true,
        purchaseOrder: po,
        message: `${po.poNumber} oluşturuldu (${po.requiredApprovalSteps} kademeli onay akışı).`,
      })
    }

    if (action === "process_po_approval") {
      const po = await processPoApprovalStep(body as any, actor)
      await logLogisticsAudit({
        userId: actorUserId,
        action: body.decision === "REDDET" ? "PO_APPROVAL_REJECTED" : "PO_APPROVAL_STEP_APPROVED",
        resource: "lojistik_tedarikci",
        resourceId: po.id,
        moduleKey: "lojistik_tedarikci",
        branchId,
        supplierId: po.supplierId,
        metadata: { poNumber: po.poNumber, status: po.status, currentStep: po.currentApprovalStep },
      })
      return NextResponse.json({
        success: true,
        purchaseOrder: po,
        message:
          po.status === "TEDARIKCIYE_ILETILDI"
            ? `${po.poNumber} tüm onay kademelerinden geçti ve tedarikçiye iletildi.`
            : po.status === "IPTAL"
              ? `${po.poNumber} onay adımında reddedildi.`
              : `${po.poNumber} onay adımı tamamlandı (${po.currentApprovalStep}/${po.requiredApprovalSteps}).`,
      })
    }

    if (action === "dispatch_po") {
      const po = await dispatchPoToSupplier(body as any, actor)
      await logLogisticsAudit({
        userId: actorUserId,
        action: "PO_DISPATCHED",
        resource: "lojistik_tedarikci",
        resourceId: po.id,
        moduleKey: "lojistik_tedarikci",
        branchId,
        supplierId: po.supplierId,
        metadata: { poNumber: po.poNumber, channel: po.dispatchedChannel },
      })
      return NextResponse.json({
        success: true,
        purchaseOrder: po,
        message: `${po.poNumber} (${po.dispatchedChannel}) üzerinden tedarikçiye gönderildi.`,
      })
    }

    if (action === "simulate_supplier_po_response") {
      const po = await recordSupplierPoResponse(body as any, actor)
      return NextResponse.json({
        success: true,
        purchaseOrder: po,
        message: `${po.poNumber} tedarikçi yanıtı güncellendi (${po.supplierResponseStatus}).`,
      })
    }

    // ── Faz 3: EOQ / ROP Yeniden Hesaplama & PO Dönüşümü ──────────────────────
    if (action === "recalculate_eoq_policies") {
      const eoqPolicies = await recalculateEoqPoliciesAndSuggestions(body.warehouseId)
      return NextResponse.json({
        success: true,
        eoqPolicies,
        message: `${eoqPolicies.length} EOQ/ROP politikası canlı stok pozisyonu ile yeniden hesaplandı.`,
      })
    }

    if (action === "convert_eoq_to_po") {
      const po = await convertReorderPolicyToPo(body as any, actor)
      await logLogisticsAudit({
        userId: actorUserId,
        action: "EOQ_CONVERTED_TO_PO",
        resource: "lojistik_tedarikci",
        resourceId: po.id,
        moduleKey: "lojistik_tedarikci",
        branchId,
        supplierId: po.supplierId,
        metadata: { policyId: body.policyId, poNumber: po.poNumber },
      })
      return NextResponse.json({
        success: true,
        purchaseOrder: po,
        message: `EOQ önerisi ${po.poNumber} satın alma emrine dönüştürüldü.`,
      })
    }

    // ── Faz 3: ASN & Harici EDI & Faz 2 WMS Mal Kabul Köprüsü ─────────────────
    if (action === "create_asn") {
      const asn = await createSupplierAsn(body as any, actor, "ERP")
      await logLogisticsAudit({
        userId: actorUserId,
        action: "ASN_CREATED",
        resource: "lojistik_tedarikci",
        resourceId: asn.id,
        moduleKey: "lojistik_tedarikci",
        branchId,
        supplierId: asn.supplierId,
        metadata: { asnNumber: asn.asnNumber, poNumber: asn.poNumber },
      })
      return NextResponse.json({
        success: true,
        asn,
        message: `${asn.asnNumber} ön sevkiyat bildirimi oluşturuldu.`,
      })
    }

    if (action === "advance_asn_status") {
      const asn = await advanceAsnStatus(body.asnId, body.newStatus, actor)
      return NextResponse.json({
        success: true,
        asn,
        message: `${asn.asnNumber} durumu '${asn.status}' olarak güncellendi.`,
      })
    }

    if (action === "ingest_edi_asn") {
      const res = await ingestExternalEdiAsn(body.desadv || (body as any), actor)
      return NextResponse.json({
        success: true,
        ...res,
        message: `EDI DESADV mesajı ${res.asn.asnNumber} olarak işlendi.`,
      })
    }

    if (action === "receive_asn_to_wms") {
      const res = await receiveAsnIntoWms({
        asnId: body.asnId,
        performedBy: actor,
        linesOverride: body.linesOverride,
      })
      await logLogisticsAudit({
        userId: actorUserId,
        action: "ASN_RECEIVED_TO_WMS",
        resource: "lojistik_tedarikci",
        resourceId: res.asnId,
        moduleKey: "lojistik_tedarikci",
        branchId,
        metadata: { asnNumber: res.asnNumber, wmsTaskNo: res.task?.taskNumber },
      })
      return NextResponse.json({
        success: true,
        ...res,
        message: `${res.asnNumber} WMS mal kabule alındı (${res.task?.taskNumber}) ve tedarikçi skoru güncellendi.`,
      })
    }

    // ── Faz 3: Skor Kartı Yapılandırma & Yeniden Hesaplama ────────────────────
    if (action === "update_scorecard_weights") {
      const res = await updateScorecardWeights(body as any, actor)
      await logLogisticsAudit({
        userId: actorUserId,
        action: "SCORECARD_WEIGHTS_UPDATED",
        resource: "lojistik_tedarikci",
        resourceId: res.config.id,
        moduleKey: "lojistik_tedarikci",
        branchId,
        metadata: body,
      })
      return NextResponse.json({
        success: true,
        ...res,
        message: `Skor kartı ağırlıkları kaydedildi ve ${res.recalculatedCount} tedarikçi yeniden puanlandı.`,
      })
    }

    if (action === "recalculate_scorecards") {
      const cfg = await getScorecardConfig()
      const results = await recalculateAllSupplierScorecards("LIVE", cfg)
      return NextResponse.json({
        success: true,
        recalculatedCount: results.length,
        message: `${results.length} tedarikçi performans skoru canlı PO & kalite kayıtlarından güncellendi.`,
      })
    }

    // ── Faz 3: İmzalı & Süreli Portal Davet Linkleri ──────────────────────────
    if (action === "create_portal_invite") {
      const res = await createSupplierPortalInvite({
        supplierId: body.supplierId,
        invitedBy: actor,
        purpose: body.purpose || "PORTAL_ACCESS",
        relatedRef: body.relatedRef,
        expiresInHours: body.expiresInHours ? Number(body.expiresInHours) : 168,
      })
      await logLogisticsAudit({
        userId: actorUserId,
        action: "SUPPLIER_PORTAL_INVITE_CREATED",
        resource: "lojistik_tedarikci",
        resourceId: res.invite.id,
        moduleKey: "lojistik_tedarikci",
        branchId,
        supplierId: res.invite.supplierId,
        metadata: { purpose: res.invite.purpose, relatedRef: res.invite.relatedRef },
      })
      return NextResponse.json({
        success: true,
        ...res,
        message: `${res.supplierName} için süreli portal davet bağlantısı oluşturuldu.`,
      })
    }

    if (action === "revoke_portal_invite") {
      const inv = await revokeSupplierPortalInvite(body.inviteId)
      return NextResponse.json({
        success: true,
        invite: inv,
        message: "Davet bağlantısı iptal edildi.",
      })
    }

    // Eski fallback compat (doğrudan body gönderilmişse)
    if (body.itemId || body.lines) {
      const req = await createPurchaseRequisition(buildLegacyReqInput(body))
      return NextResponse.json({ success: true, requisition: req.requisition ?? req })
    }

    return NextResponse.json(
      { success: false, error: `Bilinmeyen satın alma/tedarikçi işlemi: ${action}` },
      { status: 400 }
    )
  } catch (err) {
    return handleLogisticsApiError(err, "Satın alma işlemi işlenemedi.")
  }
}
