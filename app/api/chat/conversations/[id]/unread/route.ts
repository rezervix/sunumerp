/**
 * POST /api/chat/conversations/[id]/unread
 * 
 * Konuşmayı okunmadı olarak işaretle.
 * Sohbetin son mesajının tarihinden 1 milisaniye öncesini lastReadAt olarak
 * ayarlayarak okunmamış mesaj sayısını (en az 1 olacak şekilde) tetikler.
 */
import { NextResponse } from "next/server"
import { prisma } from "@/lib/db"
import { getAuthPayload } from "@/lib/auth/server-permission"
import { emitChatEvent } from "@/lib/services/chatService"

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await getAuthPayload()
  if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { id: conversationId } = await params

  try {
    const conversation = await (prisma as any).chatConversation.findUnique({
      where: { id: conversationId },
      include: {
        messages: {
          where: { isDeleted: false },
          orderBy: { createdAt: "desc" },
          take: 1,
        },
      },
    })

    if (!conversation) {
      return NextResponse.json({ error: "Konuşma bulunamadı" }, { status: 404 })
    }

    const lastMessage = conversation.messages[0]
    const targetDate = lastMessage ? new Date(lastMessage.createdAt.getTime() - 1) : new Date()

    await (prisma as any).chatParticipant.update({
      where: {
        conversationId_userId: {
          conversationId,
          userId: auth.userId,
        },
      },
      data: {
        lastReadAt: targetDate,
        lastReadMessageId: null,
      },
    })

    // Real-time update for conversation unread status
    emitChatEvent({
      type: "conversation_updated",
      conversationId,
      targetUserIds: [auth.userId],
      payload: { conversationId, markedAsUnread: true },
    })

    return NextResponse.json({ success: true, lastReadAt: targetDate })
  } catch (error) {
    console.error("Mark unread error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
