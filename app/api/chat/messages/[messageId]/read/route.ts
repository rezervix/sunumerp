/**
 * POST /api/chat/messages/[messageId]/read
 * 
 * Mesajı ve bu mesajdan önceki tüm okunmamış mesajları okundu olarak işaretle.
 * Hem MessageReadReceipt'i günceller hem SSE broadcast eder.
 */
import { NextResponse } from "next/server"
import { prisma } from "@/lib/db"
import { getAuthPayload } from "@/lib/auth/server-permission"
import { emitChatEvent } from "@/lib/services/chatService"
import { v4 as uuidv4 } from "uuid"

export async function POST(
  req: Request,
  { params }: { params: Promise<{ messageId: string }> }
) {
  const auth = await getAuthPayload()
  if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { messageId } = await params

  try {
    const message = await prisma.message.findUnique({
      where: { id: messageId },
      select: {
        id: true,
        conversationId: true,
        createdAt: true,
        conversation: {
          include: {
            participants: {
              where: { isRemoved: false, leftAt: null },
              select: { userId: true },
            },
          },
        },
      },
    })

    if (!message) {
      return NextResponse.json({ error: "Mesaj bulunamadı" }, { status: 404 })
    }

    const isMember = message.conversation.participants.some(
      (p) => p.userId === auth.userId
    )
    if (!isMember) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    // Bu mesaj ve öncesindeki tüm mesajları bul (bu kullanıcının okumadıkları)
    const unreadMessages = await prisma.message.findMany({
      where: {
        conversationId: message.conversationId,
        createdAt: { lte: message.createdAt },
        fromUserId: { not: auth.userId },
        readReceipts: { none: { userId: auth.userId } },
        isDeleted: false,
      },
      select: { id: true },
    })

    if (unreadMessages.length > 0) {
      const now = new Date()
      await prisma.messageReadReceipt.createMany({
        data: unreadMessages.map((m) => ({
          id: uuidv4(),
          messageId: m.id,
          userId: auth.userId,
          readAt: now,
          deliveredAt: now,
        })),
        skipDuplicates: true,
      })
    }

    // ChatParticipant'ın lastReadAt ve lastReadMessageId'sini güncelle
    await prisma.chatParticipant.update({
      where: {
        conversationId_userId: {
          conversationId: message.conversationId,
          userId: auth.userId,
        },
      },
      data: {
        lastReadAt: message.createdAt,
        lastReadMessageId: messageId,
      },
    })

    emitChatEvent({
      type: "message_read",
      conversationId: message.conversationId,
      targetUserIds: message.conversation.participants.map((p) => p.userId),
      payload: {
        readByUserId: auth.userId,
        upToMessageId: messageId,
        readAt: new Date().toISOString(),
      },
    })

    return NextResponse.json({ success: true, markedCount: unreadMessages.length })
  } catch (error) {
    console.error("Mark read error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
