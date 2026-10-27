/**
 * /api/chat/messages/[messageId]/react
 * 
 * POST — Emoji reaksiyon ekle veya kaldır (toggle)
 * GET  — Mesaja verilen tüm reaksiyonları listele
 * 
 * Body: { emoji: "👍" }
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
    const { emoji } = await req.json()

    if (!emoji) {
      return NextResponse.json({ error: "Emoji zorunludur" }, { status: 400 })
    }

    // Mesaj ve konuşmayı bul
    const message = await prisma.message.findUnique({
      where: { id: messageId },
      include: {
        conversation: {
          include: { participants: { where: { isRemoved: false, leftAt: null }, select: { userId: true } } },
        },
      },
    })

    if (!message || message.isDeleted) {
      return NextResponse.json({ error: "Mesaj bulunamadı" }, { status: 404 })
    }

    // Üyelik kontrolü
    const isMember = message.conversation.participants.some((p) => p.userId === auth.userId)
    if (!isMember) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    // Mevcut reaksiyon var mı kontrol et (toggle)
    const existing = await prisma.messageReaction.findUnique({
      where: { messageId_userId_emoji: { messageId, userId: auth.userId, emoji } },
    })

    let action: "added" | "removed"
    if (existing) {
      // Reaksiyonu kaldır
      await prisma.messageReaction.delete({
        where: { messageId_userId_emoji: { messageId, userId: auth.userId, emoji } },
      })
      action = "removed"
    } else {
      // Yeni reaksiyon ekle
      await prisma.messageReaction.create({
        data: {
          id: uuidv4(),
          messageId,
          userId: auth.userId,
          emoji,
        },
      })
      action = "added"
    }

    // Güncel reaksiyon listesini getir
    const allReactions = await prisma.messageReaction.findMany({
      where: { messageId },
      include: {
        user: { select: { id: true, username: true, fullName: true } },
      },
    })

    emitChatEvent({
      type: "message_reaction",
      conversationId: message.conversationId,
      targetUserIds: message.conversation.participants.map((p) => p.userId),
      payload: {
        messageId,
        action,
        emoji,
        userId: auth.userId,
        reactions: allReactions,
      },
    })

    return NextResponse.json({ action, emoji, reactions: allReactions })
  } catch (error) {
    console.error("React to message error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function GET(
  req: Request,
  { params }: { params: Promise<{ messageId: string }> }
) {
  const auth = await getAuthPayload()
  if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { messageId } = await params

  try {
    const reactions = await prisma.messageReaction.findMany({
      where: { messageId },
      include: {
        user: { select: { id: true, username: true, fullName: true, avatarUrl: true } },
      },
      orderBy: { createdAt: "asc" },
    })

    // Emoji bazında grupla
    const grouped = reactions.reduce<Record<string, { emoji: string; count: number; users: typeof reactions }>>((acc, r) => {
      if (!acc[r.emoji]) acc[r.emoji] = { emoji: r.emoji, count: 0, users: [] }
      acc[r.emoji].count++
      acc[r.emoji].users.push(r)
      return acc
    }, {})

    return NextResponse.json({ reactions, grouped: Object.values(grouped) })
  } catch (error) {
    console.error("Get reactions error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
