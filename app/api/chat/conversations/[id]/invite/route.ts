/**
 * /api/chat/conversations/[id]/invite
 * 
 * GET    — Davet linkini getir
 * POST   — Davet linkini sıfırla (yeni link üret)
 * 
 * GET /api/chat/invite/[token] — Davet linki ile gruba katıl
 */
import { NextResponse } from "next/server"
import { prisma } from "@/lib/db"
import { getAuthPayload } from "@/lib/auth/server-permission"
import { emitChatEvent } from "@/lib/services/chatService"
import { v4 as uuidv4 } from "uuid"

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await getAuthPayload()
  if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { id: conversationId } = await params

  try {
    const participant = await prisma.chatParticipant.findUnique({
      where: { conversationId_userId: { conversationId, userId: auth.userId } },
    })

    if (!participant || participant.isRemoved || participant.leftAt) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    const conversation = await prisma.chatConversation.findUnique({
      where: { id: conversationId },
      select: { inviteLink: true, inviteLinkActive: true, name: true, type: true },
    })

    if (!conversation) {
      return NextResponse.json({ error: "Konuşma bulunamadı" }, { status: 404 })
    }

    if (conversation.type === "dm") {
      return NextResponse.json({ error: "DM konuşmaları için davet linki oluşturulamaz" }, { status: 400 })
    }

    return NextResponse.json({
      inviteLink: conversation.inviteLink,
      inviteLinkActive: conversation.inviteLinkActive,
      fullUrl: `${process.env.NEXTAUTH_URL ?? ""}/dashboard/chat/join/${conversation.inviteLink}`,
    })
  } catch (error) {
    console.error("Get invite link error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await getAuthPayload()
  if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { id: conversationId } = await params

  try {
    const participant = await prisma.chatParticipant.findUnique({
      where: { conversationId_userId: { conversationId, userId: auth.userId } },
    })

    if (!participant || participant.isRemoved || participant.leftAt) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    const isAdmin = participant.role === "admin" || participant.role === "super_admin"
    if (!isAdmin) {
      return NextResponse.json(
        { error: "Yalnızca yöneticiler davet linkini sıfırlayabilir" },
        { status: 403 }
      )
    }

    const newInviteLink = uuidv4()
    const updated = await prisma.chatConversation.update({
      where: { id: conversationId },
      data: { inviteLink: newInviteLink, updatedAt: new Date() },
      include: {
        participants: { where: { isRemoved: false, leftAt: null }, select: { userId: true } },
      },
    })

    emitChatEvent({
      type: "conversation_updated",
      conversationId,
      targetUserIds: updated.participants.map((p) => p.userId),
      payload: { inviteLinkReset: true, changedBy: auth.userId },
    })

    return NextResponse.json({
      inviteLink: newInviteLink,
      fullUrl: `${process.env.NEXTAUTH_URL ?? ""}/dashboard/chat/join/${newInviteLink}`,
    })
  } catch (error) {
    console.error("Reset invite link error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
