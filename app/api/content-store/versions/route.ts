import { NextResponse } from "next/server"
import { prisma } from "@/lib/db"
import { getAuthPayload, checkPermission, isSuperAdminUser } from "@/lib/auth/server-permission"

export async function GET(req: Request) {
  const payload = await getAuthPayload()
  if (!payload) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const contentStoreId = searchParams.get("contentStoreId")

  if (!contentStoreId) {
    return NextResponse.json({ error: "contentStoreId parametresi eksik" }, { status: 400 })
  }

  try {
    const versions = await prisma.contentVersion.findMany({
      where: { contentStoreId },
      include: {
        uploadedBy: {
          select: { fullName: true }
        }
      },
      orderBy: { versionNumber: "desc" }
    })

    const serialized = versions.map(v => ({
      ...v,
      fileSize: Number(v.fileSize)
    }))

    return NextResponse.json({ versions: serialized })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

export async function POST(req: Request) {
  const payload = await getAuthPayload()
  if (!payload) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const isSuperAdmin = await isSuperAdminUser(payload.userId)
  const canApprove = isSuperAdmin || await checkPermission(payload.userId, undefined, "icerik_magazasi_onayla", "create")
  const canDelete = isSuperAdmin || await checkPermission(payload.userId, undefined, "icerik_magazasi_sil", "delete")

  if (!canApprove && !canDelete) {
    return NextResponse.json({ error: "Rollback işlemi için yetkiniz bulunmamaktadır" }, { status: 403 })
  }

  try {
    const body = await req.json()
    const { contentStoreId, versionId } = body

    if (!contentStoreId || !versionId) {
      return NextResponse.json({ error: "Eksik parametre" }, { status: 400 })
    }

    const existing = await prisma.contentStore.findUnique({
      where: { id: contentStoreId }
    })
    const targetVersion = await prisma.contentVersion.findUnique({
      where: { id: versionId }
    })

    if (!existing || !targetVersion) {
      return NextResponse.json({ error: "İçerik veya versiyon bulunamadı" }, { status: 404 })
    }

    await prisma.contentVersion.create({
      data: {
        contentStoreId: existing.id,
        versionNumber: existing.currentVersionNumber,
        url: existing.url,
        fileHash: existing.fileHash || "",
        fileSize: existing.sizeBytes,
        uploadedById: existing.uploadedById,
        changeNote: `Rollback öncesi sürüm (v${existing.currentVersionNumber})`,
        createdAt: existing.updatedAt
      }
    })

    let assetType = "OTHER"
    if (existing.mimeType.startsWith("image/")) assetType = "IMAGE"
    else if (existing.mimeType.startsWith("video/")) assetType = "VIDEO"

    const nextVersionNumber = existing.currentVersionNumber + 1
    await prisma.contentStore.update({
      where: { id: contentStoreId },
      data: {
        url: targetVersion.url,
        fileHash: targetVersion.fileHash,
        sizeBytes: targetVersion.fileSize,
        currentVersionNumber: nextVersionNumber,
        status: "approved"
      }
    })

    await prisma.contentVersion.delete({
      where: { id: versionId }
    })

    return NextResponse.json({ success: true, message: `v${targetVersion.versionNumber} sürümüne geri dönüldü.` })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
