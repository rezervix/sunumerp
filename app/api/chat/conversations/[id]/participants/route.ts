/**
 * /api/chat/conversations/[id]/participants
 * 
 * GET    — Konuşma katılımcılarını listele
 * POST   — Konuşmaya üye ekle
 * DELETE — Konuşmadan üye çıkar (?userId=xxx)
 * PUT    — Üye rolünü değiştir (admin ↔ member)
 */
import { NextResponse } from "next/server"
import { prisma } from "@/lib/db"
import { getAuthPayload } from "@/lib/auth/server-permission"
import { emitChatEvent } from "@/lib/services/chatService"
import { createNotificationMany } from "@/lib/services/notificationService"
import { v4 as uuidv4 } from "uuid"

// ─────────────────────────────────────────────────────────────
// GET — Katılımcıları listele (aktif + geçmiş)
// ─────────────────────────────────────────────────────────────
export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await getAuthPayload()
  if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { id: conversationId } = await params
  const { searchParams } = new URL(req.url)
  const includeHistory = searchParams.get("history") === "true"

  try {
    const participant = await prisma.chatParticipant.findUnique({
      where: { conversationId_userId: { conversationId, userId: auth.userId } },
    })

    if (!participant || participant.isRemoved) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    const participants = await prisma.chatParticipant.findMany({
      where: {
        conversationId,
        ...(includeHistory ? {} : { isRemoved: false, leftAt: null }),
      },
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
      orderBy: [{ role: "asc" }, { joinedAt: "asc" }],
    })

    // Presence bilgilerini ekle
    const userIds = participants.map((p) => p.userId)
    const presences = await prisma.userPresence.findMany({
      where: { userId: { in: userIds } },
      select: { userId: true, isOnline: true, lastSeenAt: true, lastSeenHidden: true },
    })
    const presenceMap = new Map(presences.map((p) => [p.userId, p]))

    const enriched = participants.map((p) => ({
      ...p,
      presence: presenceMap.get(p.userId) ?? null,
    }))

    return NextResponse.json(enriched)
  } catch (error) {
    console.error("Get participants error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

// ─────────────────────────────────────────────────────────────
// POST — Üye ekle
// ─────────────────────────────────────────────────────────────
export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await getAuthPayload()
  if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { id: conversationId } = await params

  try {
    const { userIds } = await req.json() as { userIds: string[] }

    if (!userIds || userIds.length === 0) {
      return NextResponse.json({ error: "userIds zorunludur" }, { status: 400 })
    }

    const [conversation, participant] = await Promise.all([
      prisma.chatConversation.findUnique({
        where: { id: conversationId },
        include: {
          participants: { where: { isRemoved: false, leftAt: null } },
        },
      }),
      prisma.chatParticipant.findUnique({
        where: { conversationId_userId: { conversationId, userId: auth.userId } },
      }),
    ])

    if (!conversation) {
      return NextResponse.json({ error: "Konuşma bulunamadı" }, { status: 404 })
    }

    if (!participant || participant.isRemoved || participant.leftAt) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    // Sadece admin üye ekleyebilir (DM'de eklenemez)
    if (conversation.type === "dm") {
      return NextResponse.json({ error: "DM konuşmasına üye eklenemez" }, { status: 400 })
    }

    const isAdmin = participant.role === "admin" || participant.role === "super_admin"
    if (!isAdmin) {
      return NextResponse.json({ error: "Yalnızca yöneticiler üye ekleyebilir" }, { status: 403 })
    }

    // Üye limiti kontrolü
    const currentCount = conversation.participants.length
    if (currentCount + userIds.length > conversation.maxParticipants) {
      return NextResponse.json(
        { error: `Grup üye limiti (${conversation.maxParticipants}) aşılamaz` },
        { status: 400 }
      )
    }

    // Zaten üye olanları filtrele
    const existingIds = new Set(conversation.participants.map((p) => p.userId))
    const newUserIds = userIds.filter((uid) => !existingIds.has(uid))

    if (newUserIds.length === 0) {
      return NextResponse.json({ error: "Tüm kullanıcılar zaten grup üyesi" }, { status: 400 })
    }

    // Daha önce çıkarılmış / ayrılmış üyeleri yeniden aktifleştir
    const removedOrLeft = await prisma.chatParticipant.findMany({
      where: {
        conversationId,
        userId: { in: newUserIds },
        OR: [{ isRemoved: true }, { leftAt: { not: null } }],
      },
    })

    const rejoinIds = removedOrLeft.map((p) => p.userId)
    const brandNewIds = newUserIds.filter((uid) => !rejoinIds.includes(uid))

    // Yeniden katılanları güncelle
    if (rejoinIds.length > 0) {
      await prisma.chatParticipant.updateMany({
        where: { conversationId, userId: { in: rejoinIds } },
        data: { isRemoved: false, leftAt: null, joinedAt: new Date() },
      })
    }

    // Yeni üyeleri ekle
    if (brandNewIds.length > 0) {
      await prisma.chatParticipant.createMany({
        data: brandNewIds.map((uid) => ({
          id: uuidv4(),
          conversationId,
          userId: uid,
          role: "member",
        })),
        skipDuplicates: true,
      })
    }

    // Sistem mesajları
    const addedUsers = await prisma.user.findMany({
      where: { id: { in: newUserIds } },
      select: { id: true, fullName: true },
    })
    const adder = await prisma.user.findUnique({
      where: { id: auth.userId },
      select: { fullName: true },
    })

    const systemMessages = addedUsers.map((u) => ({
      id: uuidv4(),
      conversationId,
      fromUserId: auth.userId,
      content: `${adder?.fullName} kullanıcısını ekledi: ${u.fullName}`,
      contentType: "system",
      isSystemMessage: true,
      systemAction: "member_added",
      updatedAt: new Date(),
    }))

    await prisma.message.createMany({ data: systemMessages })

    // Konuşma aktivitesini güncelle
    await prisma.chatConversation.update({
      where: { id: conversationId },
      data: { lastActivityAt: new Date(), updatedAt: new Date() },
    })

    // Yeni üyelere bildirim gönder
    await createNotificationMany(
      newUserIds.map((uid) => ({
        userId: uid,
        title: `${conversation.name ?? "Gruba"} eklendini`,
        message: `${adder?.fullName} sizi "${conversation.name ?? "grup"}" grubuna ekledi`,
        type: "info",
        moduleType: "chat",
        link: `/dashboard/chat?conversation=${conversationId}`,
      }))
    )

    // Tüm katılımcılara SSE event
    const allParticipantIds = conversation.participants.map((p) => p.userId)
    emitChatEvent({
      type: "participant_added",
      conversationId,
      targetUserIds: [...allParticipantIds, ...newUserIds],
      payload: {
        addedUserIds: newUserIds,
        addedBy: auth.userId,
        addedUsers,
      },
    })

    return NextResponse.json({ success: true, addedCount: newUserIds.length })
  } catch (error) {
    console.error("Add participant error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

// ─────────────────────────────────────────────────────────────
// DELETE — Üye çıkar (?userId=xxx)
// ─────────────────────────────────────────────────────────────
export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await getAuthPayload()
  if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { id: conversationId } = await params
  const { searchParams } = new URL(req.url)
  const targetUserId = searchParams.get("userId")

  if (!targetUserId) {
    return NextResponse.json({ error: "userId zorunludur" }, { status: 400 })
  }

  try {
    const [conversation, myParticipant] = await Promise.all([
      prisma.chatConversation.findUnique({
        where: { id: conversationId },
        include: {
          participants: { where: { isRemoved: false, leftAt: null }, select: { userId: true } },
        },
      }),
      prisma.chatParticipant.findUnique({
        where: { conversationId_userId: { conversationId, userId: auth.userId } },
      }),
    ])

    if (!conversation || !myParticipant || myParticipant.isRemoved || myParticipant.leftAt) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    const isAdmin = myParticipant.role === "admin" || myParticipant.role === "super_admin"

    // Kendini çıkaramazsın (leave endpoint kullan)
    if (targetUserId === auth.userId) {
      return NextResponse.json(
        { error: "Kendinizi gruptan çıkarmak için 'ayrıl' işlemini kullanın" },
        { status: 400 }
      )
    }

    if (!isAdmin) {
      return NextResponse.json({ error: "Yalnızca yöneticiler üye çıkarabilir" }, { status: 403 })
    }

    // Hedef üyeyi bul
    const targetParticipant = await prisma.chatParticipant.findUnique({
      where: { conversationId_userId: { conversationId, userId: targetUserId } },
    })

    if (!targetParticipant || targetParticipant.isRemoved || targetParticipant.leftAt) {
      return NextResponse.json({ error: "Kullanıcı bu grupta değil" }, { status: 404 })
    }

    // Super admin çıkarılamaz (sadece super_admin tarafından)
    if (targetParticipant.role === "super_admin" && myParticipant.role !== "super_admin") {
      return NextResponse.json(
        { error: "Süper yönetici çıkarılamaz" },
        { status: 403 }
      )
    }

    await prisma.chatParticipant.update({
      where: { conversationId_userId: { conversationId, userId: targetUserId } },
      data: { isRemoved: true, removedById: auth.userId },
    })

    // Sistem mesajı
    const [actor, removed] = await Promise.all([
      prisma.user.findUnique({ where: { id: auth.userId }, select: { fullName: true } }),
      prisma.user.findUnique({ where: { id: targetUserId }, select: { fullName: true } }),
    ])

    await prisma.message.create({
      data: {
        id: uuidv4(),
        conversationId,
        fromUserId: auth.userId,
        content: `${actor?.fullName} kullanıcısını gruptan çıkardı: ${removed?.fullName}`,
        contentType: "system",
        isSystemMessage: true,
        systemAction: "member_removed",
        updatedAt: new Date(),
      },
    })

    emitChatEvent({
      type: "participant_removed",
      conversationId,
      targetUserIds: conversation.participants.map((p) => p.userId),
      payload: {
        removedUserId: targetUserId,
        removedBy: auth.userId,
        removedSelf: false,
      },
    })

    return NextResponse.json({ success: true, removedUserId: targetUserId })
  } catch (error) {
    console.error("Remove participant error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

// ─────────────────────────────────────────────────────────────
// PUT — Rol değiştir (admin/member)
// ─────────────────────────────────────────────────────────────
export async function PUT(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await getAuthPayload()
  if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { id: conversationId } = await params

  try {
    const { userId: targetUserId, role } = await req.json()

    if (!targetUserId || !role) {
      return NextResponse.json({ error: "userId ve role zorunludur" }, { status: 400 })
    }

    if (!["admin", "member"].includes(role)) {
      return NextResponse.json(
        { error: "Rol yalnızca 'admin' veya 'member' olabilir" },
        { status: 400 }
      )
    }

    const [conversation, myParticipant, targetParticipant] = await Promise.all([
      prisma.chatConversation.findUnique({
        where: { id: conversationId },
        include: { participants: { where: { isRemoved: false, leftAt: null }, select: { userId: true } } },
      }),
      prisma.chatParticipant.findUnique({
        where: { conversationId_userId: { conversationId, userId: auth.userId } },
      }),
      prisma.chatParticipant.findUnique({
        where: { conversationId_userId: { conversationId, userId: targetUserId } },
      }),
    ])

    if (!conversation || !myParticipant || myParticipant.isRemoved || myParticipant.leftAt) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    const isAdmin = myParticipant.role === "admin" || myParticipant.role === "super_admin"
    if (!isAdmin) {
      return NextResponse.json({ error: "Yalnızca yöneticiler rol atayabilir" }, { status: 403 })
    }

    if (!targetParticipant || targetParticipant.isRemoved || targetParticipant.leftAt) {
      return NextResponse.json({ error: "Kullanıcı bu grupta değil" }, { status: 404 })
    }

    await prisma.chatParticipant.update({
      where: { conversationId_userId: { conversationId, userId: targetUserId } },
      data: { role },
    })

    // Sistem mesajı
    const [actor, target] = await Promise.all([
      prisma.user.findUnique({ where: { id: auth.userId }, select: { fullName: true } }),
      prisma.user.findUnique({ where: { id: targetUserId }, select: { fullName: true } }),
    ])

    const systemAction = role === "admin" ? "admin_granted" : "admin_revoked"
    const content =
      role === "admin"
        ? `${actor?.fullName}, ${target?.fullName} kullanıcısını yönetici yaptı`
        : `${actor?.fullName}, ${target?.fullName} kullanıcısının yöneticilik yetkisini kaldırdı`

    await prisma.message.create({
      data: {
        id: uuidv4(),
        conversationId,
        fromUserId: auth.userId,
        content,
        contentType: "system",
        isSystemMessage: true,
        systemAction,
        updatedAt: new Date(),
      },
    })

    emitChatEvent({
      type: "participant_role_changed",
      conversationId,
      targetUserIds: conversation.participants.map((p) => p.userId),
      payload: { userId: targetUserId, role, changedBy: auth.userId },
    })

    return NextResponse.json({ success: true, userId: targetUserId, role })
  } catch (error) {
    console.error("Change role error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
