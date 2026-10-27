/**
 * /api/chat/messages/[messageId]
 * 
 * GET    — Tek mesaj detayı
 * PUT    — Mesaj düzenle (sadece gönderen, 15 dakika limiti)
 * DELETE — Mesaj sil (benim için veya herkes için)
 */
import { NextResponse } from "next/server"
import { prisma } from "@/lib/db"
import { getAuthPayload } from "@/lib/auth/server-permission"
import { emitChatEvent } from "@/lib/services/chatService"

// ─────────────────────────────────────────────────────────────
// PUT /api/chat/messages/[messageId]
// ─────────────────────────────────────────────────────────────
export async function PUT(
  req: Request,
  { params }: { params: Promise<{ messageId: string }> }
) {
  const auth = await getAuthPayload()
  if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { messageId } = await params

  try {
    const message = await prisma.message.findUnique({
      where: { id: messageId },
      include: {
        conversation: {
          include: { participants: { select: { userId: true } } },
        },
      },
    })

    if (!message) {
      return NextResponse.json({ error: "Mesaj bulunamadı" }, { status: 404 })
    }

    // Sadece gönderen düzenleyebilir
    if (message.fromUserId !== auth.userId) {
      return NextResponse.json({ error: "Yalnızca kendi mesajlarınızı düzenleyebilirsiniz" }, { status: 403 })
    }

    // Sistem ve silinen mesajlar düzenlenemez
    if (message.isSystemMessage || message.isDeleted) {
      return NextResponse.json({ error: "Bu mesaj düzenlenemez" }, { status: 400 })
    }

    // Sadece text mesajları düzenlenebilir
    if (message.contentType !== "text") {
      return NextResponse.json({ error: "Yalnızca metin mesajları düzenlenebilir" }, { status: 400 })
    }

    // 15 dakika limiti — WhatsApp davranışı
    const fifteenMinutes = 15 * 60 * 1000
    if (Date.now() - message.createdAt.getTime() > fifteenMinutes) {
      return NextResponse.json(
        { error: "Mesaj gönderilme süresinden 15 dakika geçtiği için düzenlenemez" },
        { status: 400 }
      )
    }

    const { content } = await req.json()

    if (!content?.trim()) {
      return NextResponse.json({ error: "Mesaj içeriği boş olamaz" }, { status: 400 })
    }

    const updated = await prisma.message.update({
      where: { id: messageId },
      data: {
        content: content.trim(),
        isEdited: true,
        editedAt: new Date(),
        updatedAt: new Date(),
      },
      include: {
        fromUser: { select: { id: true, fullName: true, avatarUrl: true } },
      },
    })

    emitChatEvent({
      type: "message_edited",
      conversationId: message.conversationId,
      targetUserIds: message.conversation.participants.map((p) => p.userId),
      payload: { message: updated },
    })

    return NextResponse.json(updated)
  } catch (error) {
    console.error("Edit message error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

// ─────────────────────────────────────────────────────────────
// DELETE /api/chat/messages/[messageId]
// ─────────────────────────────────────────────────────────────
export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ messageId: string }> }
) {
  const auth = await getAuthPayload()
  if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { messageId } = await params
  const { searchParams } = new URL(req.url)
  const forAll = searchParams.get("forAll") === "true"

  try {
    const message = await prisma.message.findUnique({
      where: { id: messageId },
      include: {
        conversation: {
          include: { participants: { select: { userId: true } } },
        },
      },
    })

    if (!message) {
      return NextResponse.json({ error: "Mesaj bulunamadı" }, { status: 404 })
    }

    // Üyelik kontrolü
    const participant = await prisma.chatParticipant.findUnique({
      where: {
        conversationId_userId: {
          conversationId: message.conversationId,
          userId: auth.userId,
        },
      },
    })

    if (!participant || participant.isRemoved) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    const isAdmin = participant.role === "admin" || participant.role === "super_admin"

    if (forAll) {
      // Herkes için sil: sadece gönderen veya admin yapabilir
      if (message.fromUserId !== auth.userId && !isAdmin) {
        return NextResponse.json(
          { error: "Bu mesajı herkes için silemezsiniz" },
          { status: 403 }
        )
      }

      await prisma.message.update({
        where: { id: messageId },
        data: {
          isDeleted: true,
          deletedAt: new Date(),
          deletedForAll: true,
          content: "",
          fileUrl: null,
          fileType: null,
          updatedAt: new Date(),
        },
      })

      emitChatEvent({
        type: "message_deleted",
        conversationId: message.conversationId,
        targetUserIds: message.conversation.participants.map((p) => p.userId),
        payload: { messageId, forAll: true },
      })
    } else {
      // Sadece benim için sil — soft delete, sadece bu kullanıcının görmemesi
      // Bu özellik için Message'a deletedForUserIds (JSON array) eklenebilir
      // Şimdilik "benim için sil" sadece gönderen ise tam sil, değilse not-found döndür
      if (message.fromUserId !== auth.userId) {
        return NextResponse.json(
          { error: "Başkasının mesajını kendiniz için silemezsiniz. Herkes için silme işlemi admin/gönderen yetkisi gerektirir." },
          { status: 403 }
        )
      }

      await prisma.message.update({
        where: { id: messageId },
        data: {
          isDeleted: true,
          deletedAt: new Date(),
          deletedForAll: false,
          content: "",
          updatedAt: new Date(),
        },
      })

      emitChatEvent({
        type: "message_deleted",
        conversationId: message.conversationId,
        targetUserIds: [auth.userId],
        payload: { messageId, forAll: false },
      })
    }

    return NextResponse.json({ success: true, messageId, forAll })
  } catch (error) {
    console.error("Delete message error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
