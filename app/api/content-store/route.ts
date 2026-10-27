import { NextResponse } from "next/server"
import { prisma } from "@/lib/db"
import { getAuthPayload, checkPermission, isSuperAdminUser } from "@/lib/auth/server-permission"
import fs from "fs"

export async function GET(req: Request) {
  const payload = await getAuthPayload()
  if (!payload) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const search = searchParams.get("search") || ""
  const nicheIds = searchParams.get("nicheIds")?.split(",").filter(Boolean) || []
  const types = searchParams.get("types")?.split(",").filter(Boolean) || []
  const startDateStr = searchParams.get("startDate")
  const endDateStr = searchParams.get("endDate")
  const minBytes = searchParams.get("minBytes") ? parseInt(searchParams.get("minBytes") || "0", 10) : null
  const maxBytes = searchParams.get("maxBytes") ? parseInt(searchParams.get("maxBytes") || "0", 10) : null
  const tab = searchParams.get("tab") || "approved" // approved, pending, mine

  // Check permissions
  const isSuperAdmin = await isSuperAdminUser(payload.userId)
  const canApprove = isSuperAdmin || await checkPermission(payload.userId, undefined, "icerik_magazasi_onayla", "create")

  // Build prisma query where clause
  const where: any = {}

  if (search) {
    where.OR = [
      { originalName: { contains: search, mode: "insensitive" } },
      { niche: { name: { contains: search, mode: "insensitive" } } },
      { uploadedBy: { fullName: { contains: search, mode: "insensitive" } } }
    ]
  }

  if (nicheIds.length > 0) {
    where.nicheId = { in: nicheIds }
  }

  if (types.length > 0) {
    where.type = { in: types }
  }

  if (startDateStr || endDateStr) {
    where.createdAt = {}
    if (startDateStr) where.createdAt.gte = new Date(startDateStr)
    if (endDateStr) where.createdAt.lte = new Date(endDateStr)
  }

  if (minBytes !== null || maxBytes !== null) {
    where.sizeBytes = {}
    if (minBytes !== null) where.sizeBytes.gte = minBytes
    if (maxBytes !== null) where.sizeBytes.lte = maxBytes
  }

  // Tab filtering logic
  if (tab === "pending") {
    if (!canApprove) {
      return NextResponse.json({ error: "Bu sekme icin yetkiniz bulunmamaktadir" }, { status: 403 })
    }
    where.status = "pending_approval"
  } else if (tab === "mine") {
    where.uploadedById = payload.userId
  } else {
    // tab === "approved"
    where.status = "approved"
  }

  try {
    const contents = await prisma.contentStore.findMany({
      where,
      include: {
        niche: true,
        uploadedBy: { select: { id: true, fullName: true, avatarUrl: true } },
        approvedBy: { select: { id: true, fullName: true } },
        duplicateOf: { select: { id: true, originalName: true, uploadedBy: { select: { fullName: true } }, createdAt: true } },
      },
      orderBy: { createdAt: "desc" }
    })

    const serializedContents = contents.map(c => ({ ...c, sizeBytes: Number(c.sizeBytes) }))
    const niches = await prisma.niche.findMany({ orderBy: { name: "asc" } })

    let pendingCount = 0
    if (canApprove) {
      pendingCount = await prisma.contentStore.count({ where: { status: "pending_approval" } })
    }

    return NextResponse.json({ contents: serializedContents, niches, pendingCount, canApprove })
  } catch (err: any) {
    console.error("Content store query error:", err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

export async function DELETE(req: Request) {
  const payload = await getAuthPayload()
  if (!payload) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const isAdmin = await isSuperAdminUser(payload.userId)
  const canDelete = isAdmin || await checkPermission(payload.userId, undefined, "icerik_magazasi_sil", "delete")
  if (!canDelete) return NextResponse.json({ error: "Silme yetkiniz yok" }, { status: 403 })

  const { searchParams } = new URL(req.url)
  const id = searchParams.get("id")
  if (!id) return NextResponse.json({ error: "Eksik parametre" }, { status: 400 })

  try {
    const content = await prisma.contentStore.findUnique({ where: { id } })
    if (!content) return NextResponse.json({ error: "Icerik bulunamadi" }, { status: 404 })
    await prisma.contentStore.delete({ where: { id } })
    if (content.url) {
      const isLocalPath = !content.url.startsWith("http://") && !content.url.startsWith("https://")
      if (isLocalPath && fs.existsSync(content.url)) {
        await fs.promises.unlink(content.url).catch(() => {})
      }
    }
    return NextResponse.json({ success: true })
  } catch (err: any) {
    console.error("Content store deletion error:", err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

export async function PATCH(req: Request) {
  const payload = await getAuthPayload()
  if (!payload) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const isAdmin = await isSuperAdminUser(payload.userId)
  const canApprove = isAdmin || await checkPermission(payload.userId, undefined, "icerik_magazasi_onayla", "create")

  const body = await req.json()
  const { id, action, rejectionReason, nicheId } = body
  if (!id || !action) return NextResponse.json({ error: "Eksik parametre" }, { status: 400 })

  try {
    if (action === "approve") {
      if (!canApprove) return NextResponse.json({ error: "Onay yetkiniz yok" }, { status: 403 })
      await prisma.contentStore.update({ where: { id }, data: { status: "approved", approvedById: payload.userId, approvedAt: new Date() } })
      return NextResponse.json({ success: true, message: "Icerik onaylandi" })
    }
    if (action === "reject") {
      if (!canApprove) return NextResponse.json({ error: "Red yetkisi yok" }, { status: 403 })
      if (!rejectionReason?.trim()) return NextResponse.json({ error: "Red gerekçesi zorunludur" }, { status: 400 })
      await prisma.contentStore.update({ where: { id }, data: { status: "rejected", rejectionReason: rejectionReason.trim() } })
      return NextResponse.json({ success: true, message: "Icerik reddedildi" })
    }
    if (action === "resubmit") {
      const content = await prisma.contentStore.findUnique({ where: { id } })
      if (!content) return NextResponse.json({ error: "Bulunamadi" }, { status: 404 })
      if (content.uploadedById !== payload.userId && !isAdmin) return NextResponse.json({ error: "Yetki yok" }, { status: 403 })
      await prisma.contentStore.update({ where: { id }, data: { status: "pending_approval", rejectionReason: null } })
      return NextResponse.json({ success: true, message: "Onaya gönderildi" })
    }
    if (action === "change-niche") {
      if (!nicheId) return NextResponse.json({ error: "Nis ID zorunlu" }, { status: 400 })
      await prisma.contentStore.update({ where: { id }, data: { nicheId } })
      return NextResponse.json({ success: true })
    }
    return NextResponse.json({ error: "Gecersiz aksiyon" }, { status: 400 })
  } catch (err: any) {
    console.error("Content store patch error:", err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
