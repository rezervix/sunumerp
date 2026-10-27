/**
 * POST /api/chat/presence
 * 
 * Kullanıcının online durumu, yazıyor ve ses kaydediyor bildirimlerini günceller.
 * 
 * Body:
 *  action: "typing_start" | "typing_stop" | "recording_start" | "recording_stop" | "heartbeat"
 *  conversationId: string (typing ve recording için zorunlu)
 */
import { NextResponse } from "next/server"
import { getAuthPayload } from "@/lib/auth/server-permission"
import { prisma } from "@/lib/db"
import { emitChatEvent } from "@/lib/services/chatService"

export const dynamic = "force-dynamic"

export async function POST(req: Request) {
  const auth = await getAuthPayload()
  if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  try {
    const { action, conversationId } = await req.json()

    // Kullanıcının online durumunu heartbeat'te güncelle
    await prisma.userPresence.upsert({
      where: { userId: auth.userId },
      create: {
        userId: auth.userId,
        isOnline: true,
        lastSeenAt: new Date(),
        updatedAt: new Date(),
      },
      update: {
        isOnline: true,
        lastSeenAt: new Date(),
        updatedAt: new Date(),
      },
    })

    if (action === "typing_start" && conversationId) {
      // Kullanıcının bu konuşmaya gerçekten üye olduğunu doğrula
      const participant = await prisma.chatParticipant.findUnique({
        where: { conversationId_userId: { conversationId, userId: auth.userId } },
      })
      if (!participant || participant.isRemoved || participant.leftAt) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 })
      }

      await prisma.userPresence.update({
        where: { userId: auth.userId },
        data: { typingInConversationId: conversationId, updatedAt: new Date() },
      })

      emitChatEvent({
        type: "typing_start",
        conversationId,
        payload: { userId: auth.userId },
      })
    } else if (action === "typing_stop" && conversationId) {
      await prisma.userPresence.updateMany({
        where: { userId: auth.userId, typingInConversationId: conversationId },
        data: { typingInConversationId: null, updatedAt: new Date() },
      })

      emitChatEvent({
        type: "typing_stop",
        conversationId,
        payload: { userId: auth.userId },
      })
    } else if (action === "recording_start" && conversationId) {
      const participant = await prisma.chatParticipant.findUnique({
        where: { conversationId_userId: { conversationId, userId: auth.userId } },
      })
      if (!participant || participant.isRemoved || participant.leftAt) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 })
      }

      await prisma.userPresence.update({
        where: { userId: auth.userId },
        data: { recordingInConversationId: conversationId, updatedAt: new Date() },
      })

      emitChatEvent({
        type: "recording_start",
        conversationId,
        payload: { userId: auth.userId },
      })
    } else if (action === "recording_stop" && conversationId) {
      await prisma.userPresence.updateMany({
        where: { userId: auth.userId, recordingInConversationId: conversationId },
        data: { recordingInConversationId: null, updatedAt: new Date() },
      })

      emitChatEvent({
        type: "recording_stop",
        conversationId,
        payload: { userId: auth.userId },
      })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Chat presence error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

/**
 * GET /api/chat/presence?userIds=a,b,c
 * 
 * Belirtilen kullanıcıların anlık durumunu getirir.
 */
export async function GET(req: Request) {
  const auth = await getAuthPayload()
  if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  try {
    const { searchParams } = new URL(req.url)
    const userIds = searchParams.get("userIds")?.split(",").filter(Boolean) ?? []

    if (userIds.length === 0) {
      return NextResponse.json([])
    }

    const presences = await prisma.userPresence.findMany({
      where: { userId: { in: userIds } },
      select: {
        userId: true,
        isOnline: true,
        lastSeenAt: true,
        lastSeenHidden: true,
        typingInConversationId: true,
        recordingInConversationId: true,
      },
    })

    // lastSeenHidden olan kullanıcılar için lastSeenAt'i gizle
    const sanitized = presences.map((p) => ({
      userId: p.userId,
      isOnline: p.isOnline,
      lastSeenAt: p.lastSeenHidden ? null : p.lastSeenAt,
      typingInConversationId: p.typingInConversationId,
      recordingInConversationId: p.recordingInConversationId,
    }))

    return NextResponse.json(sanitized)
  } catch (error) {
    console.error("Get presence error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
