import { NextResponse } from "next/server"
import { prisma } from "@/lib/db"
import { getAuthPayload, checkPermission, isSuperAdminUser } from "@/lib/auth/server-permission"
import { v4 as uuidv4 } from "uuid"
import fs from "fs"
import path from "path"
import crypto from "crypto"

const UPLOAD_DIR = path.join(process.cwd(), "storage", "content-store")

/**
 * SHA-256 hash hesapla
 */
function computeSha256(buffer: Buffer): string {
  return crypto.createHash("sha256").update(buffer).digest("hex")
}

export async function POST(req: Request) {
  const payload = await getAuthPayload()
  if (!payload) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const isAdmin = await isSuperAdminUser(payload.userId)
  const canUpload = isAdmin || await checkPermission(payload.userId, undefined, "icerik_magazasi_yukle", "create")
  if (!canUpload) return NextResponse.json({ error: "Yukleme yetkiniz yok" }, { status: 403 })
  const canApprove = isAdmin || await checkPermission(payload.userId, undefined, "icerik_magazasi_onayla", "create")

  try {
    const formData = await req.formData()
    const file = formData.get("file") as File
    let nicheId = formData.get("nicheId") as string
    const nicheName = formData.get("nicheName") as string
    const forceUpload = formData.get("forceUpload") === "true" // Duplicate uyarısını atla
    const duplicateOfIdParam = formData.get("duplicateOfId") as string | null
    const force = formData.get("force") === "true"
    const updateContentId = formData.get("updateContentId") as string // For version updates
    const changeNote = formData.get("changeNote") as string || ""

    if (!file) {
      return NextResponse.json({ error: "Dosya bulunamadı" }, { status: 400 })
    }

    // Ensure upload directory exists
    if (!fs.existsSync(UPLOAD_DIR)) {
      fs.mkdirSync(UPLOAD_DIR, { recursive: true })
    }

    const buffer = Buffer.from(await file.arrayBuffer())
    const fileHash = crypto.createHash("sha256").update(buffer).digest("hex")

    // Determine type
    let assetType = "OTHER"
    const mime = file.type
    if (mime.startsWith("image/")) {
      assetType = "IMAGE"
    } else if (mime.startsWith("video/")) {
      assetType = "VIDEO"
    }

    // Write file to disk
    const fileUuid = uuidv4()
    const ext = file.name.split(".").pop()?.toLowerCase() ?? "bin"
    const targetPath = path.join(UPLOAD_DIR, `${fileUuid}.${ext}`)
    await fs.promises.writeFile(targetPath, buffer)

    // CASE 1: VERSION UPDATE
    if (updateContentId) {
      const existing = await prisma.contentStore.findUnique({
        where: { id: updateContentId }
      })

      if (!existing) {
        return NextResponse.json({ error: "Güncellenecek içerik bulunamadı" }, { status: 404 })
      }

      // Archive current version to content_versions
      await prisma.contentVersion.create({
        data: {
          contentStoreId: existing.id,
          versionNumber: existing.currentVersionNumber,
          url: existing.url,
          fileHash: existing.fileHash || "",
          fileSize: existing.sizeBytes,
          uploadedById: existing.uploadedById,
          changeNote: changeNote || null,
          createdAt: existing.updatedAt
        }
      })

      // Update main content record
      const nextVersion = existing.currentVersionNumber + 1
      const updated = await prisma.contentStore.update({
        where: { id: existing.id },
        data: {
          url: targetPath,
          originalName: file.name,
          mimeType: file.type,
          sizeBytes: BigInt(buffer.length),
          type: assetType,
          fileHash: fileHash,
          currentVersionNumber: nextVersion,
          status: canApprove ? "approved" : "pending_approval"
        },
        include: { niche: true }
      })

      return NextResponse.json({
        success: true,
        message: "İçerik yeni sürümü yüklendi.",
        content: {
          ...updated,
          sizeBytes: Number(updated.sizeBytes)
        }
      })
    }

    // CASE 2: NEW UPLOAD (WITH DUPLICATE CHECK)
    if (!force) {
      const existingDuplicate = await prisma.contentStore.findFirst({
        where: {
          fileHash: fileHash,
          status: { not: "rejected" }
        },
        include: {
          uploadedBy: { select: { fullName: true } }
        }
      })

      if (existingDuplicate) {
        // Clean up uploaded file since it's a duplicate and not forced yet
        if (fs.existsSync(targetPath)) {
          await fs.promises.unlink(targetPath).catch(() => {})
        }

        return NextResponse.json({
          duplicate: true,
          message: `Bu dosya sistemde zaten mevcut: '${existingDuplicate.originalName}' (yükleyen: ${existingDuplicate.uploadedBy.fullName}, tarih: ${existingDuplicate.createdAt.toLocaleDateString("tr-TR")})`,
          original: {
            id: existingDuplicate.id,
            originalName: existingDuplicate.originalName,
            uploadedBy: existingDuplicate.uploadedBy.fullName,
            createdAt: existingDuplicate.createdAt
          }
        }, { status: 409 })
      }
    }

    // Create Niche if new niche
    if (!nicheId || nicheId === "other") {
      if (!nicheName || nicheName.trim() === "") {
        return NextResponse.json({ error: "Yeni niş adı belirtilmedi" }, { status: 400 })
      }
      
      const cleanName = nicheName.trim()
      let existingNiche = await prisma.niche.findUnique({
        where: { name: cleanName }
      })
      if (!existingNiche) {
        existingNiche = await prisma.niche.create({
          data: { name: cleanName }
        })
      }
      nicheId = existingNiche.id
    }

    // If duplicate check is forced, find original ID to mark duplicateOfContentId
    let duplicateOfId: string | null = null
    if (force) {
      const original = await prisma.contentStore.findFirst({
        where: { fileHash: fileHash, status: { not: "rejected" } }
      })
      if (original) {
        duplicateOfId = original.id
      }
    }

    // Determine status: if user has approve permission, it is auto-approved. Otherwise, pending_approval.
    const initialStatus = canApprove ? "approved" : "pending_approval"

    const dbContent = await prisma.contentStore.create({
      data: {
        id: fileUuid,
        url: targetPath,
        originalName: file.name,
        mimeType: file.type,
        sizeBytes: BigInt(buffer.length),
        type: assetType,
        nicheId: nicheId,
        uploadedById: payload.userId,
        fileHash: fileHash,
        status: initialStatus,
        duplicateOfContentId: duplicateOfId
      },
      include: {
        niche: true
      }
    })

    return NextResponse.json({
      success: true,
      content: {
        ...dbContent,
        sizeBytes: Number(dbContent.sizeBytes)
      }
    })
  } catch (err: any) {
    console.error("Content store upload error:", err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
