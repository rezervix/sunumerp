/**
 * /api/chat/conversations/[id]
 * 
 * GET    — Konuşma detaylarını getirir
 * PUT    — Grup bilgilerini günceller (ad, açıklama, avatar, ayarlar)
 * DELETE — Konuşmayı arşivler (kullanıcı için)
 */
import { NextResponse } from "next/server"
import { prisma } from "@/lib/db"
import { getAuthPayload } from "@/lib/auth/server-permission"
import { emitChatEvent } from "@/lib/services/chatService"

// ─────────────────────────────────────────────────────────────
// GET /api/chat/conversations/[id]
// ─────────────────────────────────────────────────────────────
export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await getAuthPayload()
  if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { id } = await params

  try {
    // Kullanıcının bu konuşmaya erişimi olduğunu doğrula
    const participant = await prisma.chatParticipant.findUnique({
      where: { conversationId_userId: { conversationId: id, userId: auth.userId } },
    })
    if (!participant || participant.isRemoved || participant.leftAt) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    const conversation = await prisma.chatConversation.findUnique({
      where: { id },
      include: {
        participants: {
          where: { isRemoved: false, leftAt: null },
          include: {
            user: {
              select: {
                id: true,
                username: true,
                fullName: true,
                avatarUrl: true,
                department: true,
                position: true,
              },
            },
          },
          orderBy: { joinedAt: "asc" },
        },
        pinnedMessages: {
          include: {
            message: {
              include: {
                fromUser: { select: { id: true, fullName: true, avatarUrl: true } },
                reactions: {
                  include: { user: { select: { id: true, fullName: true } } },
                },
              },
            },
          },
          orderBy: { pinnedAt: "desc" },
        },
        wallpapers: {
          where: { userId: auth.userId },
        },
        muteSettings: {
          where: { userId: auth.userId },
        },
      },
    })

    if (!conversation) {
      return NextResponse.json({ error: "Konuşma bulunamadı" }, { status: 404 })
    }

    // Kullanıcının rolünü ekle
    const myRole = participant.role

    return NextResponse.json({ ...conversation, myRole })
  } catch (error) {
    console.error("Get conversation error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

// ─────────────────────────────────────────────────────────────
// PUT /api/chat/conversations/[id]
// ─────────────────────────────────────────────────────────────
export async function PUT(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await getAuthPayload()
  if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { id } = await params

  try {
    // Yetki kontrolü: grup ise admin olmalı ya da onlyAdminCanEditInfo=false olmalı
    const conversation = await prisma.chatConversation.findUnique({
      where: { id },
      include: {
        participants: {
          where: { userId: auth.userId, isRemoved: false, leftAt: null },
        },
      },
    })

    if (!conversation) {
      return NextResponse.json({ error: "Konuşma bulunamadı" }, { status: 404 })
    }

    const participant = conversation.participants[0]
    if (!participant) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    const isAdmin = participant.role === "admin" || participant.role === "super_admin"

    if (conversation.onlyAdminCanEditInfo && !isAdmin) {
      return NextResponse.json(
        { error: "Yalnızca yöneticiler grup bilgilerini düzenleyebilir" },
        { status: 403 }
      )
    }

    const body = await req.json()
    const {
      name,
      description,
      avatarUrl,
      onlyAdminCanMessage,
      onlyAdminCanEditInfo,
      disappearingMessages,
      disappearingDuration,
      // Admin-only settings
      inviteLinkActive,
    } = body

    // Sadece adminlerin değiştirebileceği alanlar
    const adminOnlyFields: Record<string, unknown> = {}
    if (isAdmin) {
      if (onlyAdminCanMessage !== undefined) adminOnlyFields.onlyAdminCanMessage = onlyAdminCanMessage
      if (onlyAdminCanEditInfo !== undefined) adminOnlyFields.onlyAdminCanEditInfo = onlyAdminCanEditInfo
      if (disappearingMessages !== undefined) adminOnlyFields.disappearingMessages = disappearingMessages
      if (disappearingDuration !== undefined) adminOnlyFields.disappearingDuration = disappearingDuration
      if (inviteLinkActive !== undefined) adminOnlyFields.inviteLinkActive = inviteLinkActive
    }

    const updatedFields: Record<string, unknown> = {
      ...adminOnlyFields,
      updatedAt: new Date(),
    }
    if (name !== undefined) updatedFields.name = name.trim()
    if (description !== undefined) updatedFields.description = description.trim()
    if (avatarUrl !== undefined) updatedFields.avatarUrl = avatarUrl

    const updated = await prisma.chatConversation.update({
      where: { id },
      data: updatedFields as any,
    })

    // Hangi alan değiştiğini belirle
    let systemAction = "name_changed"
    if (avatarUrl !== undefined) systemAction = "avatar_changed"
    if (disappearingMessages !== undefined) {
      systemAction = disappearingMessages ? "disappearing_on" : "disappearing_off"
    }

    // Sistem mesajı
    const actor = await prisma.user.findUnique({
      where: { id: auth.userId },
      select: { fullName: true },
    })

    const systemMessages: Record<string, string> = {
      name_changed: `${actor?.fullName} grup adını değiştirdi`,
      avatar_changed: `${actor?.fullName} grup fotoğrafını değiştirdi`,
      disappearing_on: `${actor?.fullName} kaybolan mesajları açtı`,
      disappearing_off: `${actor?.fullName} kaybolan mesajları kapattı`,
    }

    if (systemMessages[systemAction]) {
      await prisma.message.create({
        data: {
          conversationId: id,
          fromUserId: auth.userId,
          content: systemMessages[systemAction],
          contentType: "system",
          isSystemMessage: true,
          systemAction,
          updatedAt: new Date(),
        },
      })
    }

    emitChatEvent({
      type: "conversation_updated",
      conversationId: id,
      payload: { conversation: updated, changedBy: auth.userId },
    })

    return NextResponse.json(updated)
  } catch (error) {
    console.error("Update conversation error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

// ─────────────────────────────────────────────────────────────
// DELETE /api/chat/conversations/[id]
// ─────────────────────────────────────────────────────────────
export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await getAuthPayload()
  if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { id } = await params
  const { searchParams } = new URL(req.url)
  const action = searchParams.get("action") ?? "archive" // archive | leave

  try {
    const participant = await prisma.chatParticipant.findUnique({
      where: { conversationId_userId: { conversationId: id, userId: auth.userId } },
    })

    if (!participant || participant.isRemoved || participant.leftAt) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    if (action === "archive") {
      // Konuşmayı arşivle (sadece bu kullanıcı için — conversation.isArchived tüm kullanıcıları etkiler)
      // Şimdilik conversation bazında arşivleme yapıyoruz
      await prisma.chatConversation.update({
        where: { id },
        data: { isArchived: true, updatedAt: new Date() },
      })
      return NextResponse.json({ success: true, action: "archived" })
    } else if (action === "leave") {
      // Gruptan ayrıl
      const conversation = await prisma.chatConversation.findUnique({
        where: { id },
        include: {
          participants: { where: { isRemoved: false, leftAt: null } },
        },
      })

      if (!conversation) {
        return NextResponse.json({ error: "Konuşma bulunamadı" }, { status: 404 })
      }

      if (conversation.type === "dm") {
        return NextResponse.json(
          { error: "DM konuşmasından ayrılamazsınız" },
          { status: 400 }
        )
      }

      // Kullanıcı son admin mi?
      const admins = conversation.participants.filter(
        (p) => p.role === "admin" || p.role === "super_admin"
      )
      if (admins.length === 1 && admins[0].userId === auth.userId) {
        // Başka aktif üye yoksa grubu çöz
        if (conversation.participants.length === 1) {
          await prisma.chatConversation.update({
            where: { id },
            data: { isArchived: true, updatedAt: new Date() },
          })
        } else {
          return NextResponse.json(
            {
              error:
                "Son yönetici olarak ayrılabilmek için önce başka bir üyeyi yönetici yapın",
            },
            { status: 400 }
          )
        }
      }

      await prisma.chatParticipant.update({
        where: { conversationId_userId: { conversationId: id, userId: auth.userId } },
        data: { leftAt: new Date() },
      })

      // Sistem mesajı
      const actor = await prisma.user.findUnique({
        where: { id: auth.userId },
        select: { fullName: true },
      })

      await prisma.message.create({
        data: {
          conversationId: id,
          fromUserId: auth.userId,
          content: `${actor?.fullName} gruptan ayrıldı`,
          contentType: "system",
          isSystemMessage: true,
          systemAction: "member_removed",
          updatedAt: new Date(),
        },
      })

      emitChatEvent({
        type: "participant_removed",
        conversationId: id,
        payload: { userId: auth.userId, removedSelf: true },
      })

      return NextResponse.json({ success: true, action: "left" })
    }

    return NextResponse.json({ error: "Geçersiz action" }, { status: 400 })
  } catch (error) {
    console.error("Delete/leave conversation error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
