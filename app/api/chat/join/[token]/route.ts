/**
 * GET /api/chat/join/[token]
 * 
 * Davet linki ile gruba katıl.
 * Token: ChatConversation.inviteLink UUID değeri
 */
import { NextResponse } from "next/server"
import { prisma } from "@/lib/db"
import { getAuthPayload } from "@/lib/auth/server-permission"
import { emitChatEvent } from "@/lib/services/chatService"
import { createNotification } from "@/lib/services/notificationService"
import { v4 as uuidv4 } from "uuid"

export async function POST(
  req: Request,
  { params }: { params: Promise<{ token: string }> }
) {
  const auth = await getAuthPayload()
  if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { token } = await params

  try {
    const conversation = await prisma.chatConversation.findUnique({
      where: { inviteLink: token },
      include: {
        participants: { where: { isRemoved: false, leftAt: null } },
      },
    })

    if (!conversation) {
      return NextResponse.json({ error: "Geçersiz veya süresi dolmuş davet linki" }, { status: 404 })
    }

    if (!conversation.inviteLinkActive) {
      return NextResponse.json({ error: "Bu davet linki devre dışı bırakılmış" }, { status: 410 })
    }

    if (conversation.type === "dm") {
      return NextResponse.json({ error: "DM konuşmasına davet linki ile katılamazsınız" }, { status: 400 })
    }

    // Zaten üye mi?
    const existingParticipant = conversation.participants.find(
      (p) => p.userId === auth.userId
    )

    if (existingParticipant && !existingParticipant.isRemoved && !existingParticipant.leftAt) {
      return NextResponse.json({
        success: true,
        alreadyMember: true,
        conversationId: conversation.id,
        conversation,
      })
    }

    // Üye limiti kontrolü
    if (conversation.participants.length >= conversation.maxParticipants) {
      return NextResponse.json(
        { error: `Grup dolu (maksimum ${conversation.maxParticipants} üye)` },
        { status: 400 }
      )
    }

    // Engelleme kontrolü
    const block = await prisma.userBlock.findFirst({
      where: {
        OR: [
          { blockerId: conversation.createdById, blockedId: auth.userId },
        ],
      },
    })

    if (block) {
      return NextResponse.json({ error: "Bu gruba katılamazsınız" }, { status: 403 })
    }

    // Daha önce çıkarılmış veya ayrılmış ise güncelle, yoksa yeni kayıt oluştur
    const wasParticipant = await prisma.chatParticipant.findUnique({
      where: {
        conversationId_userId: { conversationId: conversation.id, userId: auth.userId },
      },
    })

    if (wasParticipant) {
      await prisma.chatParticipant.update({
        where: {
          conversationId_userId: { conversationId: conversation.id, userId: auth.userId },
        },
        data: { isRemoved: false, leftAt: null, joinedAt: new Date() },
      })
    } else {
      await prisma.chatParticipant.create({
        data: {
          id: uuidv4(),
          conversationId: conversation.id,
          userId: auth.userId,
          role: "member",
        },
      })
    }

    // Sistem mesajı
    const joiner = await prisma.user.findUnique({
      where: { id: auth.userId },
      select: { fullName: true },
    })

    await prisma.message.create({
      data: {
        id: uuidv4(),
        conversationId: conversation.id,
        fromUserId: auth.userId,
        content: `${joiner?.fullName} davet linki ile gruba katıldı`,
        contentType: "system",
        isSystemMessage: true,
        systemAction: "member_added",
        updatedAt: new Date(),
      },
    })

    // Konuşmayı güncelle
    await prisma.chatConversation.update({
      where: { id: conversation.id },
      data: { lastActivityAt: new Date(), updatedAt: new Date() },
    })

    // Admin(lar)a bildirim
    const adminParticipants = conversation.participants.filter(
      (p) => p.role === "admin" || p.role === "super_admin"
    )

    if (adminParticipants.length > 0) {
      await Promise.allSettled(
        adminParticipants.map((p) =>
          createNotification({
            userId: p.userId,
            title: `${conversation.name} — Yeni Üye`,
            message: `${joiner?.fullName} gruba katıldı`,
            type: "info",
            moduleType: "chat",
            link: `/dashboard/chat?conversation=${conversation.id}`,
          })
        )
      )
    }

    emitChatEvent({
      type: "participant_added",
      conversationId: conversation.id,
      targetUserIds: conversation.participants.map((p) => p.userId),
      payload: {
        addedUserIds: [auth.userId],
        addedBy: auth.userId,
        viaInviteLink: true,
      },
    })

    return NextResponse.json({
      success: true,
      alreadyMember: false,
      conversationId: conversation.id,
    })
  } catch (error) {
    console.error("Join via invite link error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

/**
 * GET /api/chat/join/[token]
 * 
 * Katılmadan önce grup bilgilerini önizle.
 */
export async function GET(
  req: Request,
  { params }: { params: Promise<{ token: string }> }
) {
  const auth = await getAuthPayload()
  if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { token } = await params

  try {
    const conversation = await prisma.chatConversation.findUnique({
      where: { inviteLink: token },
      include: {
        participants: {
          where: { isRemoved: false, leftAt: null },
          select: { userId: true },
        },
      },
    })

    if (!conversation || !conversation.inviteLinkActive) {
      return NextResponse.json(
        { error: "Geçersiz veya devre dışı davet linki" },
        { status: 404 }
      )
    }

    const isMember = conversation.participants.some((p) => p.userId === auth.userId)

    return NextResponse.json({
      id: conversation.id,
      name: conversation.name,
      description: conversation.description,
      avatarUrl: conversation.avatarUrl,
      type: conversation.type,
      memberCount: conversation.participants.length,
      maxParticipants: conversation.maxParticipants,
      isMember,
      isFull: conversation.participants.length >= conversation.maxParticipants,
    })
  } catch (error) {
    console.error("Preview invite link error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
