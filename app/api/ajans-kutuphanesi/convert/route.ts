/**
 * POST /api/ajans-kutuphanesi/convert  — Yeni dönüşüm job'u oluştur
 * GET  /api/ajans-kutuphanesi/convert  — Job listesi
 */
import { NextResponse } from "next/server"
import { prisma } from "@/lib/db"
import { requirePermission } from "@/lib/auth/server-permission"
import { CONVERSION_RULES, processQueuedJobs } from "@/lib/services/converter"

// Kullanıcı başına max eşzamanlı job limiti
const MAX_CONCURRENT_JOBS = 3

export async function POST(req: Request) {
  const auth = await requirePermission("ajans-kutuphanesi", "create")
  if (auth instanceof NextResponse) return auth
  const { payload } = auth

  const body = await req.json()
  const { fileId, targetFormat, options } = body

  if (!fileId || !targetFormat) {
    return NextResponse.json({ error: "fileId ve targetFormat zorunlu" }, { status: 400 })
  }

  // Kaynak dosyayı kontrol et
  const sourceFile = await prisma.libraryFile.findUnique({ where: { id: fileId } })
  if (!sourceFile) return NextResponse.json({ error: "Dosya bulunamadı" }, { status: 404 })
  if (sourceFile.isTrashed) return NextResponse.json({ error: "Silinen dosya dönüştürülemez" }, { status: 400 })

  // Dönüşüm kuralı kontrolü
  const allowedFormats = CONVERSION_RULES[sourceFile.mimeType] ?? []
  if (!allowedFormats.includes(targetFormat)) {
    return NextResponse.json(
      {
        error: `${sourceFile.mimeType} → ${targetFormat} dönüşümü desteklenmiyor`,
        allowedFormats,
      },
      { status: 422 }
    )
  }

  // Rate limiting — kullanıcı başına max 3 aktif job
  const activeJobs = await prisma.libraryConversionJob.count({
    where: {
      requestedById: payload.userId,
      status: { in: ["queued", "processing"] },
    },
  })
  if (activeJobs >= MAX_CONCURRENT_JOBS) {
    return NextResponse.json(
      { error: `En fazla ${MAX_CONCURRENT_JOBS} eşzamanlı dönüşüm işlemi yapabilirsiniz` },
      { status: 429 }
    )
  }

  try {
    const job = await prisma.libraryConversionJob.create({
      data: {
        sourceFileId: fileId,
        targetFormat,
        requestedById: payload.userId,
        status: "queued",
        options: options ? JSON.stringify(options) : null,
      },
    })

    // Worker'ı tetikle (async, non-blocking)
    processQueuedJobs(1).catch((err) => {
      console.error("Worker tetikleme hatası:", err.message)
    })

    return NextResponse.json(job)
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

export async function GET(req: Request) {
  const auth = await requirePermission("ajans-kutuphanesi", "read")
  if (auth instanceof NextResponse) return auth
  const { payload } = auth

  const { searchParams } = new URL(req.url)
  const fileId = searchParams.get("fileId")
  const status = searchParams.get("status")

  const jobs = await prisma.libraryConversionJob.findMany({
    where: {
      requestedById: payload.userId,
      ...(fileId ? { sourceFileId: fileId } : {}),
      ...(status ? { status } : {}),
    },
    orderBy: { createdAt: "desc" },
    take: 50,
    include: {
      sourceFile: { select: { id: true, originalName: true, mimeType: true } },
      outputFile: { select: { id: true, originalName: true, mimeType: true, sizeBytes: true } },
    },
  })

  return NextResponse.json(
    jobs.map((j) => ({
      ...j,
      outputFile: j.outputFile
        ? { ...j.outputFile, sizeBytes: Number(j.outputFile.sizeBytes) }
        : null,
    }))
  )
}
