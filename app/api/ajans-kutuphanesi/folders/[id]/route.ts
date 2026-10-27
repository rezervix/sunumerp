/**
 * PATCH  /api/ajans-kutuphanesi/folders/[id]  — Klasör güncelle (isim, taşı)
 * DELETE /api/ajans-kutuphanesi/folders/[id]  — Soft delete
 */
import { NextResponse } from "next/server"
import { prisma } from "@/lib/db"
import { requirePermission } from "@/lib/auth/server-permission"

type Params = { params: Promise<{ id: string }> }

export async function PATCH(req: Request, { params }: Params) {
  const auth = await requirePermission("ajans-kutuphanesi", "update")
  if (auth instanceof NextResponse) return auth
  const { payload } = auth
  const { id } = await params

  const body = await req.json()
  const { name, parentFolderId, isStarred } = body

  const updateData: any = {}
  if (name !== undefined) updateData.name = name
  if (parentFolderId !== undefined) updateData.parentFolderId = parentFolderId
  if (isStarred !== undefined) updateData.isStarred = isStarred

  try {
    const folder = await prisma.libraryFolder.update({
      where: { id },
      data: updateData,
    })

    await prisma.libraryActivityLog.create({
      data: {
        branchId: folder.branchId,
        folderId: folder.id,
        userId: payload.userId,
        action: parentFolderId !== undefined ? "move" : "rename",
        details: JSON.stringify(updateData),
      },
    })

    return NextResponse.json(folder)
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
    const folder = await prisma.libraryFolder.update({
      where: { id },
      data: { isTrashed: true, trashedAt: new Date() },
    })

    // İçindeki dosyaları da çöp kutusuna taşı
    await prisma.libraryFile.updateMany({
      where: { folderId: id },
      data: { isTrashed: true, trashedAt: new Date() },
    })

    await prisma.libraryActivityLog.create({
      data: {
        branchId: folder.branchId,
        folderId: folder.id,
        userId: payload.userId,
        action: "delete",
        details: JSON.stringify({ type: "folder" }),
      },
    })

    return NextResponse.json({ success: true })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
