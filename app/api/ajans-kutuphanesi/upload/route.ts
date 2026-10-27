/**
 * POST /api/ajans-kutuphanesi/upload/init
 * Resumable upload başlatır, uploadId döndürür
 *
 * POST /api/ajans-kutuphanesi/upload/complete
 * Tüm chunk'lar yüklendikten sonra dosyayı birleştirir
 */
import { NextResponse } from "next/server"
import { prisma } from "@/lib/db"
import { requirePermission } from "@/lib/auth/server-permission"
import {
  ensureStorageDirs,
  assembleChunks,
  buildStoragePath,
  ALL_ALLOWED_MIMES,
  getSizeLimit,
} from "@/lib/storage/ajans-library"
import { v4 as uuidv4 } from "uuid"
import fs from "fs"

export async function POST(req: Request) {
  const auth = await requirePermission("ajans-kutuphanesi", "create")
  if (auth instanceof NextResponse) return auth
  const { payload } = auth

  ensureStorageDirs()

  const { searchParams } = new URL(req.url)
  const action = searchParams.get("action")

  if (action === "init") {
    // Upload başlatma
    const body = await req.json()
    const { fileName, mimeType, fileSize, totalChunks, folderId } = body

    if (!fileName || !mimeType || !fileSize || !totalChunks) {
      return NextResponse.json({ error: "Eksik parametre" }, { status: 400 })
    }

    if (!ALL_ALLOWED_MIMES.includes(mimeType)) {
      return NextResponse.json(
        { error: `İzin verilmeyen dosya türü: ${mimeType}` },
        { status: 415 }
      )
    }

    const sizeLimit = getSizeLimit(mimeType)
    if (fileSize > sizeLimit) {
      return NextResponse.json(
        { error: `Dosya boyutu limitini aşıyor (max: ${Math.round(sizeLimit / 1024 / 1024)} MB)` },
        { status: 413 }
      )
    }

    const uploadId = uuidv4()

    return NextResponse.json({ uploadId, totalChunks })
  }

  if (action === "complete") {
    // Upload tamamlama — chunk'ları birleştir
    const body = await req.json()
    const { uploadId, fileName, mimeType, totalChunks, folderId, branchId, contentCalendarId } = body

    if (!uploadId || !fileName || !mimeType || !totalChunks || !branchId) {
      return NextResponse.json({ error: "Eksik parametre" }, { status: 400 })
    }

    try {
      const fileUuid = uuidv4()
      const ext = fileName.split(".").pop()?.toLowerCase() ?? "bin"
      const targetPath = buildStoragePath(fileUuid, ext)

      const { checksum, sizeBytes } = await assembleChunks(uploadId, totalChunks, targetPath)

      // ╔══════════════════════════════════════════════════════════════════════════════╗
      // ║ KALİTE KONTROL ADIMI (RUN FULL QUALITY ASSURANCE)                            ║
      // ║ Yükleme sonrasında SHA-256, MIME Magic Number ve Yapısal Bütünlük doğrulanır.║
      // ╚══════════════════════════════════════════════════════════════════════════════╝
      const { runFullQualityAssurance, applyImmutabilityProtocol } = await import("@/lib/storage/quality-assurance")
      const qaResult = await runFullQualityAssurance(targetPath, mimeType, checksum)

      if (!qaResult.passed) {
        // Kontrollerden geçemezse dosyayı diskten sil
        if (fs.existsSync(targetPath)) {
          await fs.promises.unlink(targetPath).catch(() => {})
        }
        return NextResponse.json({
          error: "Dosya Kalite Güvence (QA) testlerinden geçemedi ve reddedildi.",
          details: qaResult.errors
        }, { status: 422 })
      }

      // PROTOKOL 1: Orijinal Dosya Dokunulmazlık Kilidi (ReadOnly / 444) set et
      await applyImmutabilityProtocol(targetPath)

      // DB'ye kaydet
      const dbFile = await prisma.libraryFile.create({
        data: {
          id: fileUuid,
          branchId,
          folderId: folderId || null,
          contentCalendarId: contentCalendarId || null,
          originalName: fileName,
          mimeType,
          sizeBytes,
          checksumSha256: checksum,
          storagePath: targetPath,
          uploadedById: payload.userId,
          version: 1,
        },
      })

      // Aktivite logu
      await prisma.libraryActivityLog.create({
        data: {
          branchId,
          fileId: dbFile.id,
          userId: payload.userId,
          action: "upload",
          details: JSON.stringify({
            size: sizeBytes,
            checksum,
            qa: "Passed (K1, K2, K3 verified)"
          }),
        },
      })

      return NextResponse.json({
        success: true,
        file: {
          ...dbFile,
          sizeBytes: Number(dbFile.sizeBytes),
        },
      })
    } catch (err: any) {
      console.error("Upload complete error:", err)
      return NextResponse.json({ error: err.message }, { status: 500 })
    }
  }

  return NextResponse.json({ error: "Geçersiz action" }, { status: 400 })
}
