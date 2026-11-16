/**
 * Lojistik Faz 3 — İmzalı & Süreli Tedarikçi Portal Davet Linki Motoru
 *
 * - HMAC-SHA256 imza + timingSafeEqual doğrulama
 * - DB'de LojistikSupplierPortalInvite kaydı ile tekil iptal (revoke) & kullanım takibi
 * - Kara listedeki / pasif tedarikçiler için token üretimini ve kullanımını engeller
 */

import crypto from "crypto"
import { prisma } from "@/lib/db"
import { LogisticsDomainError } from "@/lib/logistics/security"

const INVITE_SECRET =
  process.env.SUPPLIER_PORTAL_SECRET ||
  process.env.JWT_SECRET ||
  "super-secret-key-change-this"

export interface SupplierInviteTokenPayload {
  tokenId: string
  supplierId: string
  purpose: string
  relatedRef?: string | null
  iat: number
  exp: number
}

function toBase64Url(input: string): string {
  return Buffer.from(input, "utf8").toString("base64url")
}

function fromBase64Url(input: string): string {
  return Buffer.from(input, "base64url").toString("utf8")
}

function signData(dataB64: string): string {
  return crypto.createHmac("sha256", INVITE_SECRET).update(dataB64).digest("base64url")
}

export async function createSupplierPortalInvite(input: {
  supplierId: string
  invitedBy: string
  purpose?: "PORTAL_ACCESS" | "RFQ_INVITE" | "PO_CONFIRM"
  relatedRef?: string | null
  expiresInHours?: number
}) {
  const supplier = await prisma.supplier.findUnique({ where: { id: input.supplierId } })
  if (!supplier) {
    throw new LogisticsDomainError("SUPPLIER_NOT_FOUND", "Tedarikçi bulunamadı.", 404)
  }
  if (supplier.approvalStatus === "KARALISTE" || !supplier.isActive) {
    throw new LogisticsDomainError(
      "SUPPLIER_BLOCKED",
      `${supplier.name} kara listede/pasif olduğu için portal daveti oluşturulamaz.`,
      400
    )
  }

  const hours = Math.max(1, Math.min(24 * 30, Number(input.expiresInHours ?? 168)))
  const nowSec = Math.floor(Date.now() / 1000)
  const expSec = nowSec + hours * 3600
  const tokenId = crypto.randomUUID()

  const invite = await prisma.lojistikSupplierPortalInvite.create({
    data: {
      supplierId: supplier.id,
      tokenId,
      invitedBy: input.invitedBy,
      purpose: input.purpose || "PORTAL_ACCESS",
      relatedRef: input.relatedRef?.trim() || null,
      expiresAt: new Date(expSec * 1000),
      isRevoked: false,
      usedCount: 0,
    },
  })

  const payload: SupplierInviteTokenPayload = {
    tokenId,
    supplierId: supplier.id,
    purpose: invite.purpose,
    relatedRef: invite.relatedRef,
    iat: nowSec,
    exp: expSec,
  }
  const encoded = toBase64Url(JSON.stringify(payload))
  const sig = signData(encoded)
  const token = `${encoded}.${sig}`

  return {
    invite,
    token,
    portalPath: `/portal/tedarikci/${token}`,
    supplierName: supplier.name,
    supplierCode: supplier.code,
  }
}

export async function verifySupplierPortalInviteToken(token: string) {
  const clean = (token || "").trim()
  const parts = clean.split(".")
  if (parts.length !== 2 || !parts[0] || !parts[1]) {
    throw new LogisticsDomainError("INVALID_INVITE_TOKEN", "Davet bağlantısı geçersiz veya bozuk.", 401)
  }

  const [payloadB64, sigB64] = parts
  const expectedSig = signData(payloadB64)
  const a = Buffer.from(sigB64, "utf8")
  const b = Buffer.from(expectedSig, "utf8")
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) {
    throw new LogisticsDomainError("INVALID_INVITE_SIGNATURE", "Davet bağlantısı güvenlik imzası doğrulanamadı.", 401)
  }

  let parsed: SupplierInviteTokenPayload
  try {
    parsed = JSON.parse(fromBase64Url(payloadB64))
  } catch {
    throw new LogisticsDomainError("INVALID_INVITE_PAYLOAD", "Davet verisi çözümlenemedi.", 401)
  }

  if (!parsed?.tokenId || !parsed?.supplierId || !parsed?.exp) {
    throw new LogisticsDomainError("INVALID_INVITE_PAYLOAD", "Eksik davet bilgisi.", 401)
  }
  if (Math.floor(Date.now() / 1000) > parsed.exp) {
    throw new LogisticsDomainError("INVITE_EXPIRED", "Bu davet bağlantısının geçerlilik süresi dolmuş.", 401)
  }

  const invite = await prisma.lojistikSupplierPortalInvite.findFirst({
    where: { tokenId: parsed.tokenId },
  })
  if (!invite) {
    throw new LogisticsDomainError("INVITE_NOT_FOUND", "Davet kaydı sistemde bulunamadı.", 401)
  }
  if (invite.isRevoked) {
    throw new LogisticsDomainError("INVITE_REVOKED", "Bu portal davet bağlantısı yönetici tarafından iptal edilmiş.", 403)
  }
  if (new Date(invite.expiresAt).getTime() <= Date.now()) {
    throw new LogisticsDomainError("INVITE_EXPIRED", "Davet bağlantısının süresi dolmuş.", 401)
  }

  const supplier = await prisma.supplier.findUnique({ where: { id: invite.supplierId } })
  if (!supplier || !supplier.isActive || supplier.approvalStatus === "KARALISTE") {
    throw new LogisticsDomainError(
      "SUPPLIER_BLOCKED",
      "Tedarikçi hesabı pasif veya kara listede olduğundan portal erişimi kapalıdır.",
      403
    )
  }

  return { invite, supplier, payload: parsed }
}

export async function revokeSupplierPortalInvite(inviteId: string) {
  const inv = await prisma.lojistikSupplierPortalInvite.findUnique({ where: { id: inviteId } })
  if (!inv) throw new LogisticsDomainError("INVITE_NOT_FOUND", "Davet kaydı bulunamadı.", 404)
  return prisma.lojistikSupplierPortalInvite.update({
    where: { id: inviteId },
    data: { isRevoked: true },
  })
}

export async function listSupplierPortalInvites(supplierId?: string) {
  const [invites, suppliers] = await Promise.all([
    prisma.lojistikSupplierPortalInvite.findMany({
      ...(supplierId ? { where: { supplierId } } : {}),
      orderBy: { createdAt: "desc" },
    }),
    prisma.supplier.findMany(),
  ])
  const supMap = new Map(suppliers.map((s: any) => [s.id, s]))
  const now = Date.now()
  return invites.map((inv: any) => ({
    ...inv,
    supplierCode: supMap.get(inv.supplierId)?.code ?? "-",
    supplierName: supMap.get(inv.supplierId)?.name ?? "-",
    isExpired: new Date(inv.expiresAt).getTime() <= now,
  }))
}
