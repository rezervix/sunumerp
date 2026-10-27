/**
 * POST /api/ajans-kutuphanesi/download-zip
 * Seçilen dosyaları ZIP olarak streaming ile indirir (belleğe almadan)
 */
import { NextResponse } from "next/server"
import { prisma } from "@/lib/db"
import { getAuthPayload } from "@/lib/auth/server-permission"
import { validateStoragePath } from "@/lib/storage/ajans-library"
import fs from "fs"

export async function POST(req: Request) {
  const payload = await getAuthPayload()
  if (!payload) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const body = await req.json()
  const { fileIds, branchId } = body as { fileIds: string[]; branchId: string }

  if (!fileIds?.length || !branchId) {
    return NextResponse.json({ error: "fileIds ve branchId zorunlu" }, { status: 400 })
  }

  if (fileIds.length > 200) {
    return NextResponse.json({ error: "Tek seferde en fazla 200 dosya indirilebilir" }, { status: 400 })
  }

  // Branch erişim kontrolü
  const userBranches = await prisma.userBranchRole.findMany({
    where: { userId: payload.userId },
    select: { branchId: true },
  })
  if (!userBranches.map((ub) => ub.branchId).includes(branchId)) {
    return NextResponse.json({ error: "Erişim yetkiniz yok" }, { status: 403 })
  }

  // Dosyaları DB'den al
  const files = await prisma.libraryFile.findMany({
    where: { id: { in: fileIds }, branchId, isTrashed: false },
  })

  if (!files.length) {
    return NextResponse.json({ error: "Dosya bulunamadı" }, { status: 404 })
  }

  // Streaming ZIP oluştur — archiver
  let archiver: any
  try {
    // @ts-ignore
    archiver = (await import("archiver")).default
  } catch {
    return NextResponse.json(
      { error: "archiver paketi yüklü değil. Lütfen: npm install archiver" },
      { status: 500 }
    )
  }

  const archive = archiver("zip", { zlib: { level: 0 } }) // level: 0 = store (hızlı, sıkıştırmasız)

  const stream = new ReadableStream({
    start(controller) {
      archive.on("data", (chunk: Buffer) => controller.enqueue(chunk))
      archive.on("end", () => controller.close())
      archive.on("error", (err: Error) => controller.error(err))

      // Dosyaları ekle
      for (const file of files) {
        if (validateStoragePath(file.storagePath) && fs.existsSync(file.storagePath)) {
          archive.file(file.storagePath, { name: file.originalName })
        }
      }

      archive.finalize()
    },
  })

  const timestamp = new Date().toISOString().slice(0, 10)

  return new Response(stream, {
    headers: {
      "Content-Type": "application/zip",
      "Content-Disposition": `attachment; filename="ajans-kutuphanesi-${timestamp}.zip"`,
      "Transfer-Encoding": "chunked",
    },
  })
}
