/**
 * GET /api/ajans-kutuphanesi/files/[id]/preview
 * Dosyayı tarayıcıda inline gösterir (indirmeden önizleme)
 */
import { NextResponse } from "next/server"
import { prisma } from "@/lib/db"
import { getAuthPayload } from "@/lib/auth/server-permission"
import { validateStoragePath } from "@/lib/storage/ajans-library"
import fs from "fs"

type Params = { params: Promise<{ id: string }> }

export async function GET(req: Request, { params }: Params) {
  // Auth kontrolü — her istekte
  const payload = await getAuthPayload()
  if (!payload) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { id } = await params

  const file = await prisma.libraryFile.findUnique({ where: { id } })
  if (!file || file.isTrashed) {
    return NextResponse.json({ error: "Dosya bulunamadı" }, { status: 404 })
  }

  // Erişim yetkisi: branchId eşleşmeli
  // (Gelişmiş RBAC için permission tablosu da kontrol edilebilir)
  const userBranches = await prisma.userBranchRole.findMany({
    where: { userId: payload.userId },
    select: { branchId: true },
  })
  const branchIds = userBranches.map((ub) => ub.branchId)

  if (!branchIds.includes(file.branchId)) {
    return NextResponse.json({ error: "Bu dosyaya erişim yetkiniz yok" }, { status: 403 })
  }

  if (!validateStoragePath(file.storagePath)) {
    return NextResponse.json({ error: "Geçersiz dosya yolu" }, { status: 400 })
  }

  if (!fs.existsSync(file.storagePath)) {
    return NextResponse.json({ error: "Dosya disk üzerinde bulunamadı" }, { status: 404 })
  }

  // Range request desteği (video için gerekli)
  const stat = fs.statSync(file.storagePath)
  const fileSize = stat.size
  const rangeHeader = req.headers.get("range")

  if (rangeHeader) {
    const parts = rangeHeader.replace(/bytes=/, "").split("-")
    const start = parseInt(parts[0], 10)
    const end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1
    const chunkSize = end - start + 1

    const readStream = fs.createReadStream(file.storagePath, { start, end })
    const webStream = new ReadableStream({
      start(controller) {
        readStream.on("data", (chunk) => controller.enqueue(chunk))
        readStream.on("end", () => controller.close())
        readStream.on("error", (err) => controller.error(err))
      },
    })

    return new Response(webStream, {
      status: 206,
      headers: {
        "Content-Type": file.mimeType,
        "Content-Range": `bytes ${start}-${end}/${fileSize}`,
        "Accept-Ranges": "bytes",
        "Content-Length": chunkSize.toString(),
        "Cache-Control": "private, max-age=3600",
      },
    })
  }

  // Normal stream
  const readStream = fs.createReadStream(file.storagePath)
  const webStream = new ReadableStream({
    start(controller) {
      readStream.on("data", (chunk) => controller.enqueue(chunk))
      readStream.on("end", () => controller.close())
      readStream.on("error", (err) => controller.error(err))
    },
  })

  return new Response(webStream, {
    status: 200,
    headers: {
      "Content-Type": file.mimeType,
      "Content-Length": fileSize.toString(),
      "Content-Disposition": `inline; filename="${encodeURIComponent(file.originalName)}"`,
      "Accept-Ranges": "bytes",
      "Cache-Control": "private, max-age=3600",
    },
  })
}
