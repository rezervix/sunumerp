/**
 * GET    /api/ajans-kutuphanesi/files/[id]          — Dosya detayı
 * PATCH  /api/ajans-kutuphanesi/files/[id]          — Güncelle (isim, yıldız, klasör)
 * DELETE /api/ajans-kutuphanesi/files/[id]          — Soft delete (çöp kutusuna taşı)
 * POST   /api/ajans-kutuphanesi/files/[id]?action=restore  — Geri yükle
 * POST   /api/ajans-kutuphanesi/files/[id]?action=purge    — Kalıcı sil
 */
import { NextResponse } from "next/server"
import { prisma } from "@/lib/db"
import { requirePermission } from "@/lib/auth/server-permission"
import { validateStoragePath } from "@/lib/storage/ajans-library"
import fs from "fs"

type Params = { params: Promise<{ id: string }> }

export async function GET(req: Request, { params }: Params) {
  const auth = await requirePermission("ajans-kutuphanesi", "read")
  if (auth instanceof NextResponse) return auth

  const { id } = await params

  const file = await prisma.libraryFile.findUnique({
    where: { id },
    include: {
      uploadedBy: { select: { id: true, fullName: true, avatarUrl: true } },
      folder: { select: { id: true, name: true } },
      contentCalendar: { select: { id: true, title: true } },
      fileVersions: {
        orderBy: { version: "desc" },
        select: { id: true, version: true, originalName: true, sizeBytes: true, createdAt: true },
      },
      derivedFiles: {
        where: { isTrashed: false },
        select: { id: true, originalName: true, mimeType: true, sizeBytes: true, createdAt: true },
      },
    },
  })

  if (!file) return NextResponse.json({ error: "Dosya bulunamadı" }, { status: 404 })

  return NextResponse.json({ ...file, sizeBytes: Number(file.sizeBytes) })
}

export async function PATCH(req: Request, { params }: Params) {
  const auth = await requirePermission("ajans-kutuphanesi", "update")
  if (auth instanceof NextResponse) return auth
  const { payload } = auth
  const { id } = await params

  const body = await req.json()
  const { originalName, isStarred, folderId, description, tags } = body

  const updateData: any = {}
  if (originalName !== undefined) updateData.originalName = originalName
  if (isStarred !== undefined) updateData.isStarred = isStarred
  if (folderId !== undefined) updateData.folderId = folderId
  if (description !== undefined) updateData.description = description
  if (tags !== undefined) updateData.tags = JSON.stringify(tags)

  try {
    const file = await prisma.libraryFile.update({
      where: { id },
      data: updateData,
    })

    await prisma.libraryActivityLog.create({
      data: {
        branchId: file.branchId,
        fileId: file.id,
        userId: payload.userId,
        action: folderId !== undefined ? "move" : "rename",
        details: JSON.stringify(updateData),
      },
    })

    return NextResponse.json({ ...file, sizeBytes: Number(file.sizeBytes) })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

export async function DELETE(req: Request, { params }: Params) {
  const auth = await requirePermission("ajans-kutuphanesi", "delete")
  if (auth instanceof NextResponse) return auth
  const { payload } = auth
  const { id } = await params

  try {
    const file = await prisma.libraryFile.update({
      where: { id },
      data: { isTrashed: true, trashedAt: new Date() },
    })

    await prisma.libraryActivityLog.create({
      data: {
        branchId: file.branchId,
        fileId: file.id,
        userId: payload.userId,
        action: "delete",
      },
    })

    return NextResponse.json({ success: true })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

export async function POST(req: Request, { params }: Params) {
  const { id } = await params
  const { searchParams } = new URL(req.url)
  const action = searchParams.get("action")

  if (action === "restore") {
    const auth = await requirePermission("ajans-kutuphanesi", "update")
    if (auth instanceof NextResponse) return auth
    const { payload } = auth

    const file = await prisma.libraryFile.update({
      where: { id },
      data: { isTrashed: false, trashedAt: null },
    })

    await prisma.libraryActivityLog.create({
      data: {
        branchId: file.branchId,
        fileId: file.id,
        userId: payload.userId,
        action: "restore",
      },
    })

    return NextResponse.json({ success: true })
  }

  if (action === "purge") {
    // Kalıcı silme — dikkatli kullan
    const auth = await requirePermission("ajans-kutuphanesi", "delete")
    if (auth instanceof NextResponse) return auth
    const { payload } = auth

    const file = await prisma.libraryFile.findUnique({ where: { id } })
    if (!file) return NextResponse.json({ error: "Dosya bulunamadı" }, { status: 404 })

    if (!file.isTrashed) {
      return NextResponse.json({ error: "Önce çöp kutusuna taşıyın" }, { status: 400 })
    }

    // Disk'ten sil
    if (file.storagePath && validateStoragePath(file.storagePath)) {
      if (fs.existsSync(file.storagePath)) {
        await fs.promises.unlink(file.storagePath).catch(() => {})
      }
    }

    // DB'den sil
    await prisma.libraryFile.delete({ where: { id } })

    await prisma.libraryActivityLog.create({
      data: {
        branchId: file.branchId,
        fileId: null,
        userId: payload.userId,
        action: "purge",
        details: JSON.stringify({ fileName: file.originalName }),
      },
    })

    return NextResponse.json({ success: true })
  }

  return NextResponse.json({ error: "Geçersiz action" }, { status: 400 })
}
