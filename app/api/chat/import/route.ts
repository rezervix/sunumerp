/**
 * POST /api/chat/import
 *
 * WhatsApp zip export dosyasını alır, parse eder ve veritabanına yazar.
 *
 * FormData alanları:
 *   file            : .zip dosyası
 *   conversationId  : Hedef konuşma ID
 *   senderMappings  : JSON { "WhatsApp İsmi": "erpUserId" }  (boş olabilir)
 *   preview         : "true" → sadece özet döndür, DB'ye yazma
 */
import { NextResponse } from "next/server"
import { prisma } from "@/lib/db"
import { getAuthPayload } from "@/lib/auth/server-permission"
import { emitChatEvent } from "@/lib/services/chatService"
import { parseWhatsAppZip } from "@/lib/services/whatsappParser"
import { writeFile, mkdir } from "fs/promises"
import { join } from "path"
import { v4 as uuidv4 } from "uuid"

// Next.js varsayılan 4MB body limitini devre dışı bırak
export const config = {
  api: { bodyParser: false },
}

// Tüm medya tiplerine göre MIME default
const CONTENT_TYPE_MIME: Record<string, string> = {
  image: "image/jpeg",
  video: "video/mp4",
  audio: "audio/mpeg",
  voice: "audio/ogg",
  document: "application/octet-stream",
  sticker: "image/webp",
  contact: "text/vcard",
  text: "text/plain",
  system: "text/plain",
}

export async function POST(req: Request) {
  const auth = await getAuthPayload()
  if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  try {
    const formData = await req.formData()
    const file = formData.get("file") as File | null
    const conversationId = formData.get("conversationId") as string | null
    const senderMappingsRaw = (formData.get("senderMappings") as string) || "{}"
    const isPreview = formData.get("preview") === "true"

    // ── Validasyon ─────────────────────────────────────────────
    if (!file) {
      return NextResponse.json({ error: "Zip dosyası gerekli" }, { status: 400 })
    }
    if (!conversationId) {
      return NextResponse.json({ error: "conversationId gerekli" }, { status: 400 })
    }

    const fileExt = file.name.split(".").pop()?.toLowerCase()
    if (fileExt !== "zip") {
      return NextResponse.json({ error: "Sadece .zip dosyası kabul edilir" }, { status: 400 })
    }

    // ── Katılımcı yetkisi ──────────────────────────────────────
    const participant = await prisma.chatParticipant.findUnique({
      where: { conversationId_userId: { conversationId, userId: auth.userId } },
    })
    if (!participant || participant.isRemoved || participant.leftAt) {
      return NextResponse.json(
        { error: "Bu konuşmaya erişim yetkiniz yok" },
        { status: 403 }
      )
    }

    // ── Zip'i parse et ─────────────────────────────────────────
    const zipBuffer = new Uint8Array(await file.arrayBuffer())
    let parseResult
    try {
      parseResult = parseWhatsAppZip(zipBuffer)
    } catch (e) {
      return NextResponse.json(
        { error: String(e) },
        { status: 422 }
      )
    }

    const { messages, mediaMap, parseErrors, detectedFormat } = parseResult

    // ── Tarih aralığı ──────────────────────────────────────────
    const timestamps = messages
      .filter((m) => !m.isSystemMessage)
      .map((m) => m.timestamp.getTime())
    const dateFrom = timestamps.length ? new Date(Math.min(...timestamps)) : null
    const dateTo = timestamps.length ? new Date(Math.max(...timestamps)) : null

    // ── Bilinmeyen gönderenler ─────────────────────────────────
    const senderMappings: Record<string, string> = JSON.parse(senderMappingsRaw)
    const uniqueSenders = [
      ...new Set(
        messages
          .filter((m) => !m.isSystemMessage && m.senderName !== "System")
          .map((m) => m.senderName)
      ),
    ]
    const unknownSenders = uniqueSenders.filter(
      (s) => !senderMappings[s]
    )

    // ── Preview mod ────────────────────────────────────────────
    if (isPreview) {
      return NextResponse.json({
        messageCount: messages.filter((m) => !m.isSystemMessage).length,
        systemMessageCount: messages.filter((m) => m.isSystemMessage).length,
        mediaCount: mediaMap.size,
        dateFrom: dateFrom?.toISOString() ?? null,
        dateTo: dateTo?.toISOString() ?? null,
        unknownSenders,
        parseErrors: parseErrors.slice(0, 50), // Maks 50 hata göster
        detectedFormat,
        allSenders: uniqueSenders,
      })
    }

    // ── Import mod — DB'ye yaz ─────────────────────────────────

    // ERP kullanıcılarını al (senderMappings'teki ID'leri doğrula)
    const mappedUserIds = Object.values(senderMappings).filter(Boolean)
    const validUsers = mappedUserIds.length
      ? await prisma.user.findMany({
          where: { id: { in: mappedUserIds }, isActive: true },
          select: { id: true },
        })
      : []
    const validUserIdSet = new Set(validUsers.map((u) => u.id))

    // Bilinmeyen gönderenler için sistem kullanıcısı olarak mevcut kullanıcıyı kullan
    const fallbackUserId = auth.userId

    // Medya dosyalarını diske yaz
    const uploadDir = join(process.cwd(), "public", "uploads", "whatsapp-import")
    await mkdir(uploadDir, { recursive: true })

    const savedMediaMap = new Map<string, string>() // fileRef → /api/uploads/... URL

    for (const [fileName, data] of mediaMap.entries()) {
      const ext = fileName.split(".").pop()?.toLowerCase() ?? "bin"
      const savedName = `wa_${uuidv4()}.${ext}`
      const filePath = join(uploadDir, savedName)
      try {
        await writeFile(filePath, data)
        savedMediaMap.set(fileName, `/api/uploads/whatsapp-import/${savedName}`)
      } catch {
        // Dosya yazılamazsa eksik medya olarak işaretle
        savedMediaMap.set(fileName, "")
      }
    }

    // Mesajları toplu yaz (batch 500)
    const BATCH_SIZE = 500
    let importedCount = 0
    let skippedCount = 0
    const now = new Date()

    const allMessages = messages

    for (let i = 0; i < allMessages.length; i += BATCH_SIZE) {
      const batch = allMessages.slice(i, i + BATCH_SIZE)

      const createData = batch
        .map((msg) => {
          // Göndereni bul
          const mappedUserId = senderMappings[msg.senderName]
          const fromUserId =
            mappedUserId && validUserIdSet.has(mappedUserId)
              ? mappedUserId
              : fallbackUserId

          // Medya URL
          const fileUrl = msg.fileRef ? (savedMediaMap.get(msg.fileRef) ?? "") : undefined
          const isEmpty = fileUrl === ""

          return {
            id: uuidv4(),
            conversationId,
            fromUserId,
            content: msg.content,
            contentType: msg.contentType,
            fileUrl: isEmpty ? null : (fileUrl ?? null),
            fileName: msg.fileRef ?? null,
            fileType: msg.contentType !== "text" && msg.contentType !== "system"
              ? (CONTENT_TYPE_MIME[msg.contentType] ?? null)
              : null,
            isSystemMessage: msg.isSystemMessage,
            systemAction: msg.isSystemMessage ? "whatsapp_import" : null,
            importedFrom: "whatsapp" as string,
            importedAt: now,
            externalId: msg.externalId,
            createdAt: msg.timestamp,
            updatedAt: msg.timestamp,
          }
        })

      // Duplicate'leri atla: createMany skipDuplicates=true
      try {
        const result = await prisma.message.createMany({
          data: createData,
          skipDuplicates: true,
        })
        importedCount += result.count
        skippedCount += batch.length - result.count
      } catch {
        skippedCount += batch.length
      }

      // İlerleme bildirimi (her batch'te)
      emitChatEvent({
        type: "import_progress",
        conversationId,
        payload: {
          total: allMessages.length,
          done: Math.min(i + BATCH_SIZE, allMessages.length),
          importedCount,
          skippedCount,
        },
      })
    }

    // lastActivityAt güncelle
    await prisma.chatConversation.update({
      where: { id: conversationId },
      data: { lastActivityAt: now, updatedAt: now },
    })

    // Audit log
    await prisma.auditLog.create({
      data: {
        userId: auth.userId,
        action: "whatsapp_import",
        resource: "chat_conversation",
        resourceId: conversationId,
        details: JSON.stringify({
          importedCount,
          skippedCount,
          mediaCount: mediaMap.size,
          parseErrorCount: parseErrors.length,
          detectedFormat,
          dateFrom: dateFrom?.toISOString(),
          dateTo: dateTo?.toISOString(),
        }),
      },
    })

    return NextResponse.json({
      success: true,
      imported: importedCount,
      skipped: skippedCount,
      errors: parseErrors.length,
      detectedFormat,
    })
  } catch (error) {
    console.error("WhatsApp import error:", error)
    return NextResponse.json(
      { error: "İçe aktarma sırasında hata oluştu: " + String(error) },
      { status: 500 }
    )
  }
}
