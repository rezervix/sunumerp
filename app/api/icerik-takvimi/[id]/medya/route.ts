/**
 * /api/icerik-takvimi/[id]/medya
 * Medya yükleme ve versiyonlama endpoint'i
 */
import { NextResponse } from "next/server"
import { prisma } from "@/lib/db"
import { requirePermission } from "@/lib/auth/server-permission"
import { mkdir, writeFile } from "fs/promises"
import { join } from "path"
import { v4 as uuidv4 } from "uuid"

const MAX_SIZE_BYTES = 200 * 1024 * 1024 // 200MB limit

// ─── GET: Medya listesi ───────────────────────────────────────────────
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requirePermission("icerik-takvimi", "read")
  if (auth instanceof NextResponse) return auth

  const { id } = await params

  try {
    const media = await prisma.contentMedia.findMany({
      where: { contentItemId: id },
      orderBy: [{ isFinal: "desc" }, { version: "desc" }],
    })
    return NextResponse.json(media)
  } catch (error) {
    console.error("ContentMedia GET error:", error)
    return NextResponse.json({ error: "Sunucu hatası" }, { status: 500 })
  }
}

// ─── POST: Medya yükle ────────────────────────────────────────────────
export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requirePermission("icerik-takvimi", "update")
  if (auth instanceof NextResponse) return auth

  const { id: contentItemId } = await params

  try {
    const formData = await req.formData()
    const file = formData.get("file") as File | null
    const versionNote = formData.get("versionNote") as string | null
    const markAsFinal = formData.get("isFinal") === "true"

    if (!file) {
      return NextResponse.json({ error: "Dosya zorunlu" }, { status: 400 })
    }

    // Boyut kontrolü
    if (file.size > MAX_SIZE_BYTES) {
      return NextResponse.json(
        { error: `Dosya çok büyük. Maksimum ${MAX_SIZE_BYTES / 1024 / 1024}MB` },
        { status: 413 }
      )
    }

    // Mevcut son versiyonu bul
    const lastMedia = await prisma.contentMedia.findFirst({
      where: { contentItemId },
      orderBy: { version: "desc" },
      select: { version: true },
    })
    const nextVersion = (lastMedia?.version ?? 0) + 1

    // Dosyayı kaydet
    const uploadDir = join(process.cwd(), "public", "uploads", "icerik-takvimi", contentItemId)
    await mkdir(uploadDir, { recursive: true })

    const ext = file.name.split(".").pop() || "bin"
    const fileName = `v${nextVersion}-${uuidv4()}.${ext}`
    const filePath = join(uploadDir, fileName)
    const subdirPath = `icerik-takvimi/${contentItemId}`
    const fileUrl = `/api/uploads/${fileName}?subdir=${encodeURIComponent(subdirPath)}`

    const buffer = Buffer.from(await file.arrayBuffer())
    await writeFile(filePath, buffer)

    // Dosya tipi belirle
    const mimeType = file.type || "application/octet-stream"
    const fileType = mimeType.startsWith("image/") ? "image"
      : mimeType.startsWith("video/") ? "video"
      : "document"

    // Eğer bu final olarak işaretleniyorsa diğerlerinin final'ini kaldır
    if (markAsFinal) {
      await prisma.contentMedia.updateMany({
        where: { contentItemId, isFinal: true },
        data: { isFinal: false },
      })
    }

    const media = await prisma.contentMedia.create({
      data: {
        contentItemId,
        fileUrl,
        fileType,
        mimeType,
        fileName: file.name,
        fileSize: BigInt(file.size),
        version: nextVersion,
        isFinal: markAsFinal,
        versionNote: versionNote || null,
        uploadedById: auth.payload.userId,
      },
    })

    return NextResponse.json({
      ...media,
      fileSize: media.fileSize?.toString(), // BigInt → string serialization
    }, { status: 201 })
  } catch (error) {
    console.error("ContentMedia POST error:", error)
    return NextResponse.json({ error: "Sunucu hatası" }, { status: 500 })
  }
}

// ─── PATCH: Medyayı final olarak işaretle ─────────────────────────────
export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requirePermission("icerik-takvimi", "update")
  if (auth instanceof NextResponse) return auth

  const { id: contentItemId } = await params

  try {
    const { mediaId } = await req.json()

    // Önce tüm final'leri kaldır
    await prisma.contentMedia.updateMany({
      where: { contentItemId, isFinal: true },
      data: { isFinal: false },
    })

    // Seçileni final yap
    const updated = await prisma.contentMedia.update({
      where: { id: mediaId },
      data: { isFinal: true },
    })

    return NextResponse.json({
      ...updated,
      fileSize: updated.fileSize?.toString(),
    })
  } catch (error) {
    console.error("ContentMedia PATCH error:", error)
    return NextResponse.json({ error: "Sunucu hatası" }, { status: 500 })
  }
}

// ─── DELETE: Medya sil ────────────────────────────────────────────────
export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requirePermission("icerik-takvimi", "update")
  if (auth instanceof NextResponse) return auth

  const { searchParams } = new URL(req.url)
  const mediaId = searchParams.get("mediaId")

  if (!mediaId) {
    return NextResponse.json({ error: "mediaId zorunlu" }, { status: 400 })
  }

  try {
    await prisma.contentMedia.delete({ where: { id: mediaId } })
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("ContentMedia DELETE error:", error)
    return NextResponse.json({ error: "Sunucu hatası" }, { status: 500 })
  }
}
