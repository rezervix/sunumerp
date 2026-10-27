/**
 * GET /api/ajans-kutuphanesi/files/[id]/download
 * Dosyayı indirme başlığıyla (Content-Disposition: attachment) döndürür
 */
import { NextResponse } from "next/server"
import { prisma } from "@/lib/db"
import { getAuthPayload } from "@/lib/auth/server-permission"
import { validateStoragePath } from "@/lib/storage/ajans-library"
import fs from "fs"

type Params = { params: Promise<{ id: string }> }

export async function GET(req: Request, { params }: Params) {
  const payload = await getAuthPayload()
  if (!payload) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { id } = await params

  const file = await prisma.libraryFile.findUnique({ where: { id } })
  if (!file || file.isTrashed) {
    return NextResponse.json({ error: "Dosya bulunamadı" }, { status: 404 })
  }

  // Branch erişim kontrolü
  const userBranches = await prisma.userBranchRole.findMany({
    where: { userId: payload.userId },
    select: { branchId: true },
  })
  if (!userBranches.map((ub) => ub.branchId).includes(file.branchId)) {
    return NextResponse.json({ error: "Erişim yetkiniz yok" }, { status: 403 })
  }

  if (!validateStoragePath(file.storagePath) || !fs.existsSync(file.storagePath)) {
    return NextResponse.json({ error: "Dosya bulunamadı" }, { status: 404 })
  }

  const stat = fs.statSync(file.storagePath)

  // ╔══════════════════════════════════════════════════════════════════════════════╗
  // ║ İNDİRME K1 CHECKSUM DOĞRULAMA ADIMI                                          ║
  // ║ Dosya indirilmeden önce diskteki kopyanın SHA-256 hash'i veritabanındaki ile ║
  // ║ doğrulanır. 1 bitlik sapma dahi varsa indirme iptal edilir.                  ║
  // ╚══════════════════════════════════════════════════════════════════════════════╝
  const { computeSha256 } = await import("@/lib/storage/quality-assurance")
  const currentChecksum = await computeSha256(file.storagePath)
  if (currentChecksum !== file.checksumSha256) {
    return NextResponse.json({
      error: "Dosya bütünlük (Integrity) doğrulamasından geçemedi. Disk üzerinde bozulma tespit edildi."
    }, { status: 409 })
  }

  // İndirme aktivite logu
  await prisma.libraryActivityLog.create({
    data: {
      branchId: file.branchId,
      fileId: file.id,
      userId: payload.userId,
      action: "download",
    },
  }).catch(() => {})

  const readStream = fs.createReadStream(file.storagePath)
  const webStream = new ReadableStream({
    start(controller) {
      readStream.on("data", (chunk) => controller.enqueue(chunk))
      readStream.on("end", () => controller.close())
      readStream.on("error", (err) => controller.error(err))
    },
  })

  return new Response(webStream, {
    headers: {
      "Content-Type": file.mimeType || "application/octet-stream",
      "Content-Length": stat.size.toString(),
      "Content-Disposition": `attachment; filename="${encodeURIComponent(file.originalName)}"`,
      "Content-Transfer-Encoding": "binary",
      "Cache-Control": "no-cache, no-store, must-revalidate",
      "Pragma": "no-cache",
      "Expires": "0",
      "X-Content-Type-Options": "nosniff"
    },
  })
}
