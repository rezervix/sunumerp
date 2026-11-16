/**
 * Lojistik Faz 3 — Tedarikçi Portalı Güvenli Kimlik Doğrulama & Kapsam İzolasyonu Servisi
 *
 * KESİN GÜVENLİK İLKELERİ:
 * - Tedarikçi oturumları SADECE kendi `supplierId` kayıtlarını görür ve düzenler.
 * - Çapraz tedarikçi erişimi (`Supplier A -> Supplier B`) her zaman `403 FORBIDDEN_SUPPLIER_SCOPE` döner.
 * - Kara listedeki (`KARALISTE`) veya pasif tedarikçiler oturum açamaz.
 * - Davet tokenı veya portal girişi HİÇBİR ZAMAN Super Admin / şirket içi yetki yükseltmesi vermez.
 */

import crypto from "crypto"
import bcrypt from "bcryptjs"
import { SignJWT } from "jose"
import { prisma } from "@/lib/db"
import {
  assertSupplierRecordAccess,
  getLogisticsScopeContext,
  LogisticsDomainError,
} from "@/lib/logistics/security"
import type { LogisticsScopeContext } from "@/lib/logistics/types"
import { getAuthPayload } from "@/lib/auth/server-permission"
import { createSupplierAsn, listAsnsEnriched } from "./asnAndReceivingService"
import {
  listPurchaseOrdersEnriched,
  listRfqsEnriched,
  recordSupplierPoResponse,
  submitRfqQuote,
} from "./rfqAndPoService"
import { getSupplierScorecardsSummary } from "./scorecardService"
import {
  createSupplierDocument,
  listSupplierDocuments,
  listSupplierItemLinks,
} from "./supplierMasterService"
import { verifySupplierPortalInviteToken } from "./inviteToken"

const JWT_SECRET = process.env.JWT_SECRET || "super-secret-key-change-this"

export async function issueSupplierPortalSessionToken(userId: string) {
  const user: any = await prisma.user.findUnique({
    where: { id: userId },
    include: {
      branches: {
        include: { role: true, branch: true },
      },
    },
  })

  if (!user || !user.isActive) {
    throw new LogisticsDomainError("USER_INACTIVE", "Kullanıcı hesabı aktif değil.", 401)
  }

  const roleNames = (user.branches || [])
    .map((b: any) => b.role?.name)
    .filter(Boolean)

  if (!roleNames.includes("Tedarikçi") || !user.supplierId) {
    throw new LogisticsDomainError(
      "NOT_SUPPLIER_ACCOUNT",
      "Bu kullanıcı hesabı bir tedarikçi portalı kullanıcısı değildir.",
      403
    )
  }

  const supplier = await prisma.supplier.findUnique({ where: { id: user.supplierId } })
  if (!supplier || !supplier.isActive || supplier.approvalStatus === "KARALISTE") {
    throw new LogisticsDomainError(
      "SUPPLIER_BLOCKED",
      "Bağlı tedarikçi hesabı pasif veya kara listede olduğu için portal girişi reddedildi.",
      403
    )
  }

  const expiresAt = new Date(Date.now() + 3 * 24 * 60 * 60 * 1000) // 3 gün
  const session = await prisma.userSession.create({
    data: {
      userId: user.id,
      tokenHash: crypto
        .createHash("sha256")
        .update(`portal:${user.id}:${Date.now()}:${crypto.randomUUID()}`)
        .digest("hex"),
      expiresAt,
      isActive: true,
    },
  })

  const secret = new TextEncoder().encode(JWT_SECRET)
  const token = await new SignJWT({
    userId: user.id,
    username: user.username,
    sessionId: session.id,
    supplierId: supplier.id,
    portalScoped: true,
  })
    .setProtectedHeader({ alg: "HS256" })
    .setExpirationTime("3d")
    .sign(secret)

  return {
    token,
    expiresAt,
    sessionId: session.id,
    user: {
      id: user.id,
      username: user.username,
      fullName: user.fullName,
      email: user.email,
      supplierId: supplier.id,
    },
    supplier: {
      id: supplier.id,
      code: supplier.code,
      name: supplier.name,
      glnNumber: supplier.glnNumber,
      approvalStatus: supplier.approvalStatus,
    },
  }
}

export async function authenticateSupplierPortalCredentials(input: {
  username: string
  password: string
}) {
  const login = (input.username || "").trim()
  const password = input.password || ""
  if (!login || !password) {
    throw new LogisticsDomainError(
      "MISSING_CREDENTIALS",
      "Tedarikçi kullanıcı adı/e-posta ve şifre gereklidir.",
      400
    )
  }

  const allUsers = await prisma.user.findMany({
    include: { branches: { include: { role: true } } },
  })

  const lower = login.toLowerCase()
  const matched = allUsers.find(
    (u: any) =>
      u.username?.toLowerCase() === lower ||
      (u.email && u.email.toLowerCase() === lower)
  )

  if (!matched) {
    throw new LogisticsDomainError(
      "INVALID_CREDENTIALS",
      "Geçersiz tedarikçi kullanıcı adı veya şifre.",
      401
    )
  }

  const storedHash = (matched as any).password || (matched as any).passwordHash || ""
  const validPass = storedHash ? await bcrypt.compare(password, storedHash) : false
  if (!validPass) {
    throw new LogisticsDomainError(
      "INVALID_CREDENTIALS",
      "Geçersiz tedarikçi kullanıcı adı veya şifre.",
      401
    )
  }

  return issueSupplierPortalSessionToken(matched.id)
}

async function ensureLeastPrivilegePortalUserForSupplier(supplier: any) {
  const existingUsers = await prisma.user.findMany({
    include: { branches: { include: { role: true } } },
  })
  const activePortalUser = existingUsers.find(
    (u: any) =>
      u.supplierId === supplier.id &&
      u.isActive &&
      (u.branches || []).some((b: any) => b.role?.name === "Tedarikçi")
  )
  if (activePortalUser) return activePortalUser

  // Eğer admin yeni oluşturduğu tedarikçiye doğrudan davet gönderdiyse en kısıtlı "Tedarikçi" rolüyle hesap üret
  let supplierRole = await prisma.role.findFirst({ where: { name: "Tedarikçi" } })
  if (!supplierRole) {
    supplierRole = await prisma.role.create({
      data: {
        name: "Tedarikçi",
        description: "Harici Tedarikçi Portalı — Yalnızca kendi kayıtlarıyla sınırlı rol.",
        permissions: JSON.stringify([
          { resource: "lojistik_tedarikci", actions: ["read", "create", "update"] },
          { resource: "tedarikci_portali", actions: ["read", "create", "update"] },
        ]),
      },
    })
  }

  const branch =
    (await prisma.branch.findFirst({ where: { code: "HQ" } })) ||
    (await prisma.branch.findFirst())
  if (!branch) {
    throw new LogisticsDomainError("NO_BRANCH_FOR_PORTAL", "Tedarikçi kullanıcısı bağlanacak şube bulunamadı.", 500)
  }

  const slug = supplier.code.toLowerCase().replace(/[^a-z0-9]/g, "") || supplier.id.slice(0, 8)
  const username = `portal.${slug}`
  const randomHash = await bcrypt.hash(`LOCKED-INVITE-ONLY-${Date.now()}-${Math.random()}`, 8)

  const newUser = await prisma.user.create({
    data: {
      username,
      password: randomHash,
      fullName: `${supplier.name} Portal Kullanıcısı`,
      email: supplier.email || `${username}@portal.local`,
      isActive: true,
      supplierId: supplier.id,
    } as any,
  })

  await prisma.userBranchRole.create({
    data: {
      userId: newUser.id,
      branchId: branch.id,
      roleId: supplierRole.id,
    },
  })

  return newUser
}

export async function exchangeInviteTokenForPortalSession(token: string) {
  const { invite, supplier } = await verifySupplierPortalInviteToken(token)
  const portalUser = await ensureLeastPrivilegePortalUserForSupplier(supplier)

  await prisma.lojistikSupplierPortalInvite.update({
    where: { id: invite.id },
    data: {
      usedCount: Number(invite.usedCount || 0) + 1,
      lastUsedAt: new Date(),
    },
  })

  const sessionRes = await issueSupplierPortalSessionToken(portalUser.id)
  return {
    ...sessionRes,
    invitePurpose: invite.purpose,
    inviteRelatedRef: invite.relatedRef,
  }
}

export async function requireSupplierPortalScope(): Promise<{
  payload: any
  scope: LogisticsScopeContext
  supplier: any
}> {
  const payload = await getAuthPayload()
  if (!payload) {
    throw new LogisticsDomainError(
      "UNAUTHENTICATED",
      "Tedarikçi portalına erişmek için oturum açmanız gerekir.",
      401
    )
  }

  const scope = await getLogisticsScopeContext(payload, undefined)
  if (!scope.isSupplierScoped || !scope.supplierId) {
    throw new LogisticsDomainError(
      "PORTAL_SUPPLIER_SCOPE_REQUIRED",
      "Bu alan yalnızca tedarikçi kapsamındaki portal hesaplarına özeldir.",
      403
    )
  }

  const supplier = await prisma.supplier.findUnique({ where: { id: scope.supplierId } })
  if (!supplier || !supplier.isActive || supplier.approvalStatus === "KARALISTE") {
    throw new LogisticsDomainError(
      "SUPPLIER_BLOCKED",
      "Tedarikçi hesabınız askıda veya kara listede olduğundan portal işlemi durduruldu.",
      403
    )
  }

  return { payload, scope, supplier }
}

export async function getSupplierPortalSnapshot(scope: LogisticsScopeContext, supplier: any) {
  const sid = scope.supplierId!

  const [pos, asns, rfqs, docs, catalogLinks, scoreSummary] = await Promise.all([
    listPurchaseOrdersEnriched({ supplierId: sid }),
    listAsnsEnriched({ supplierId: sid }),
    listRfqsEnriched({ supplierScopeId: sid }),
    listSupplierDocuments(sid),
    listSupplierItemLinks({ supplierId: sid }),
    getSupplierScorecardsSummary(),
  ])

  const myLiveScore =
    scoreSummary.liveSnapshots.find((s: any) => s.supplierId === sid) ?? null
  const myHistory = scoreSummary.historyBySupplier[sid] ?? []

  // Tedarikçi taslak PO'ları görmez — yalnızca iletilmiş veya yanıtlanmış/teslim sürecindeki PO'lar
  const portalPos = pos.filter((p: any) => p.status !== "TASLAK" && p.status !== "ONAY_BEKLIYOR")

  return {
    supplier: {
      id: supplier.id,
      code: supplier.code,
      name: supplier.name,
      glnNumber: supplier.glnNumber,
      category: supplier.category || "GENEL",
      criticalityLevel: supplier.criticalityLevel || "ORTA",
      approvalStatus: supplier.approvalStatus || "ONAYLI",
      paymentTermsLabel: supplier.paymentTermsLabel || `${supplier.paymentTermsDays || 30} Gün Vadeli`,
      leadTimeDays: supplier.leadTimeDays || 5,
      contactPerson: supplier.contactPerson,
      email: supplier.email,
      phone: supplier.phone,
    },
    stats: {
      openPoCount: portalPos.filter((p: any) =>
        ["TEDARIKCIYE_ILETILDI", "TEDARIKCI_ONAYLADI", "KISMI_ONAY", "KISMI_TESLIM"].includes(p.status)
      ).length,
      pendingPoConfirmCount: portalPos.filter(
        (p: any) => p.status === "TEDARIKCIYE_ILETILDI"
      ).length,
      openRfqCount: rfqs.filter(
        (r: any) => (r.status === "TEKLIFE_ACIK" || r.status === "DEGERLENDIRMEDE") && !r.myQuote
      ).length,
      activeAsnCount: asns.filter((a: any) =>
        ["ON_IHBAR", "YOLDA", "KAPI_GIRIS"].includes(a.status)
      ).length,
      expiringDocCount: docs.filter(
        (d: any) => d.status === "YENILEME_YAKIN" || d.status === "SURESI_DOLMUS"
      ).length,
    },
    purchaseOrders: portalPos,
    asns,
    rfqs,
    documents: docs,
    catalogLinks,
    scorecard: {
      live: myLiveScore,
      history: myHistory,
      weights: scoreSummary.config,
    },
  }
}

export async function handleSupplierPortalAction(
  scope: LogisticsScopeContext,
  actor: string,
  action: string,
  body: Record<string, any>
) {
  const sid = scope.supplierId!

  if (action === "respond_po") {
    const po = await prisma.lojistikPurchaseOrder.findUnique({ where: { id: body.poId } })
    if (!po) throw new LogisticsDomainError("PO_NOT_FOUND", "PO bulunamadı.", 404)
    assertSupplierRecordAccess(scope, po.supplierId)
    return recordSupplierPoResponse(
      {
        poId: po.id,
        decision: body.decision,
        promisedDeliveryDate: body.promisedDeliveryDate,
        note: body.note,
        redFlagReason: body.redFlagReason,
      },
      actor
    )
  }

  if (action === "submit_asn") {
    const po = body.poId
      ? await prisma.lojistikPurchaseOrder.findUnique({ where: { id: body.poId } })
      : await prisma.lojistikPurchaseOrder.findFirst({ where: { poNumber: body.poNumber } })
    if (!po) throw new LogisticsDomainError("PO_NOT_FOUND", "İlgili satın alma emri bulunamadı.", 404)
    assertSupplierRecordAccess(scope, po.supplierId)

    return createSupplierAsn(
      {
        poId: po.id,
        poNumber: po.poNumber,
        supplierId: sid,
        waybillNo: body.waybillNo,
        trackingNo: body.trackingNo,
        carrierName: body.carrierName,
        vehiclePlate: body.vehiclePlate,
        driverName: body.driverName,
        ssccPalletCount: body.ssccPalletCount ? Number(body.ssccPalletCount) : 1,
        expectedArrivalAt: body.expectedArrivalAt,
        notes: body.notes,
        lines: Array.isArray(body.lines) ? body.lines : [],
      },
      actor,
      "PORTAL"
    )
  }

  if (action === "submit_rfq_quote") {
    // Eğer gövdede başka supplierId gönderildiyse anında 403 yakala!
    if (body.supplierId && body.supplierId !== sid) {
      throw new LogisticsDomainError(
        "FORBIDDEN_SUPPLIER_SCOPE",
        "Başka bir tedarikçi adına teklif gönderemezsiniz.",
        403
      )
    }
    return submitRfqQuote(
      {
        rfqId: body.rfqId,
        supplierId: sid,
        leadTimeDays: Number(body.leadTimeDays || 3),
        paymentTerms: body.paymentTerms,
        shippingCost: Number(body.shippingCost || 0),
        validityDate: body.validityDate,
        notes: body.notes,
        lines: Array.isArray(body.lines) ? body.lines : [],
      },
      actor,
      "PORTAL"
    )
  }

  if (action === "upload_document") {
    if (body.supplierId && body.supplierId !== sid) {
      throw new LogisticsDomainError(
        "FORBIDDEN_SUPPLIER_SCOPE",
        "Başka bir tedarikçinin belge kasasına yükleme yapamazsınız.",
        403
      )
    }
    return createSupplierDocument({
      supplierId: sid,
      docType: body.docType || "DIGER",
      title: body.title,
      fileName: body.fileName,
      fileUrl: body.fileUrl || `/uploads/supplier-docs/${encodeURIComponent(body.fileName || "belge.pdf")}`,
      mimeType: body.mimeType || "application/pdf",
      fileSizeBytes: body.fileSizeBytes ? Number(body.fileSizeBytes) : null,
      validFrom: body.validFrom,
      expiresAt: body.expiresAt,
      uploadedBy: actor,
      uploadedVia: "PORTAL",
      notes: body.notes,
    })
  }

  throw new LogisticsDomainError("UNKNOWN_PORTAL_ACTION", `Bilinmeyen portal işlemi: ${action}`, 400)
}
