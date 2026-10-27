/**
 * /api/chat/conversations/[id]/pin
 * 
 * POST   — Mesajı konuşmada sabitle
 * DELETE — Mesajın sabitlemesini kaldır
 * GET    — Sabitlenen mesajları listele
 */
import { NextResponse } from "next/server"
import { prisma } from "@/lib/db"
import { getAuthPayload } from "@/lib/auth/server-permission"
import { emitChatEvent } from "@/lib/services/chatService"
import { v4 as uuidv4 } from "uuid"

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await getAuthPayload()
  if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { id: conversationId } = await params

  try {
    const { messageId } = await req.json()

    if (!messageId) {
      return NextResponse.json({ error: "messageId zorunludur" }, { status: 400 })
    }

    // Yetki kontrolü: admin veya grup ise admin gerekli
    const [participant, conversation] = await Promise.all([
      prisma.chatParticipant.findUnique({
        where: { conversationId_userId: { conversationId, userId: auth.userId } },
      }),
      prisma.chatConversation.findUnique({
        where: { id: conversationId },
        include: { participants: { where: { isRemoved: false, leftAt: null }, select: { userId: true } } },
      }),
    ])

    if (!participant || participant.isRemoved || participant.leftAt) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    const isAdmin = participant.role === "admin" || participant.role === "super_admin"
    if (conversation?.type === "group" && !isAdmin) {
      return NextResponse.json(
        { error: "Yalnızca yöneticiler mesaj sabitleyebilir" },
        { status: 403 }
      )
    }

    // Mesajın bu konuşmaya ait olduğunu doğrula
    const message = await prisma.message.findFirst({
      where: { id: messageId, conversationId, isDeleted: false },
    })

    if (!message) {
      return NextResponse.json({ error: "Mesaj bulunamadı" }, { status: 404 })
    }

    // Mevcut sabitleme var mı?
    const existing = await prisma.pinnedMessage.findUnique({
      where: { conversationId_messageId: { conversationId, messageId } },
    })

    if (existing) {
      return NextResponse.json({ error: "Mesaj zaten sabitlenmiş" }, { status: 409 })
    }

    const pinned = await prisma.pinnedMessage.create({
      data: {
        id: uuidv4(),
        conversationId,
        messageId,
        pinnedById: auth.userId,
      },
      include: {
        message: {
          include: { fromUser: { select: { id: true, fullName: true } } },
        },
        pinnedBy: { select: { id: true, fullName: true } },
      },
    })

    // Mesajın isPinned flag'ini güncelle
    await prisma.message.update({
      where: { id: messageId },
      data: { isPinned: true, updatedAt: new Date() },
    })

    // Sistem mesajı
    const actor = await prisma.user.findUnique({
      where: { id: auth.userId },
      select: { fullName: true },
    })
    await prisma.message.create({
      data: {
        conversationId,
        fromUserId: auth.userId,
        content: `${actor?.fullName} bir mesajı sabitledi`,
        contentType: "system",
        isSystemMessage: true,
        systemAction: "name_changed",
        updatedAt: new Date(),
      },
    })

    emitChatEvent({
      type: "message_pinned",
      conversationId,
      targetUserIds: conversation?.participants.map((p) => p.userId) ?? [],
      payload: { pinned, action: "pinned" },
    })

    return NextResponse.json(pinned, { status: 201 })
  } catch (error) {
    console.error("Pin message error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await getAuthPayload()
  if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { id: conversationId } = await params
  const { searchParams } = new URL(req.url)
  const messageId = searchParams.get("messageId")

  if (!messageId) {
    return NextResponse.json({ error: "messageId zorunludur" }, { status: 400 })
  }

  try {
    const participant = await prisma.chatParticipant.findUnique({
      where: { conversationId_userId: { conversationId, userId: auth.userId } },
    })

    if (!participant || participant.isRemoved || participant.leftAt) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    const conversation = await prisma.chatConversation.findUnique({
      where: { id: conversationId },
      include: { participants: { where: { isRemoved: false, leftAt: null }, select: { userId: true } } },
    })

    const isAdmin = participant.role === "admin" || participant.role === "super_admin"
    if (conversation?.type === "group" && !isAdmin) {
      return NextResponse.json(
        { error: "Yalnızca yöneticiler sabitlemeyi kaldırabilir" },
        { status: 403 }
      )
    }

    await prisma.pinnedMessage.delete({
      where: { conversationId_messageId: { conversationId, messageId } },
    })

    await prisma.message.update({
      where: { id: messageId },
      data: { isPinned: false, updatedAt: new Date() },
    })

    emitChatEvent({
      type: "message_pinned",
      conversationId,
      targetUserIds: conversation?.participants.map((p) => p.userId) ?? [],
      payload: { messageId, action: "unpinned" },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Unpin message error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

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

    if (!participant || participant.isRemoved) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    const pinned = await prisma.pinnedMessage.findMany({
      where: { conversationId },
      include: {
        message: {
          include: {
            fromUser: { select: { id: true, fullName: true, avatarUrl: true } },
          },
        },
        pinnedBy: { select: { id: true, fullName: true } },
      },
      orderBy: { pinnedAt: "desc" },
    })

    return NextResponse.json(pinned)
  } catch (error) {
    console.error("Get pinned messages error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
