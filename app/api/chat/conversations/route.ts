/**
 * /api/chat/conversations
 * 
 * GET  — Kullanıcının tüm konuşmalarını listeler (son mesaj önizlemesi ile)
 * POST — Yeni DM veya grup konuşması oluşturur
 */
import { NextResponse } from "next/server"
import { prisma } from "@/lib/db"
import { getAuthPayload } from "@/lib/auth/server-permission"
import { emitChatEvent } from "@/lib/services/chatService"
import { v4 as uuidv4 } from "uuid"

// ─────────────────────────────────────────────────────────────
// GET /api/chat/conversations
// ─────────────────────────────────────────────────────────────
export async function GET(req: Request) {
  const auth = await getAuthPayload()
  if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const search = searchParams.get("search") ?? ""
  const type = searchParams.get("type") ?? undefined // dm | group | branch_channel

  try {
    // Kullanıcının aktif olarak dahil olduğu tüm konuşmalar
    const participations = await prisma.chatParticipant.findMany({
      where: {
        userId: auth.userId,
        isRemoved: false,
        leftAt: null,
      },
      select: { conversationId: true },
    })
    const conversationIds = participations.map((p) => p.conversationId)

    const conversations = await prisma.chatConversation.findMany({
      where: {
        id: { in: conversationIds },
        isArchived: false,
        ...(type ? { type } : {}),
        ...(search
          ? { name: { contains: search, mode: "insensitive" } }
          : {}),
      },
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
              },
            },
          },
        },
        muteSettings: {
          where: { userId: auth.userId },
        },
        pinnedMessages: {
          include: {
            message: {
              select: {
                id: true,
                content: true,
                contentType: true,
                createdAt: true,
                fromUser: { select: { id: true, fullName: true } },
              },
            },
          },
          orderBy: { pinnedAt: "desc" },
          take: 1,
        },
        // Son mesajı getir
        messages: {
          where: { isDeleted: false },
          orderBy: { createdAt: "desc" },
          take: 1,
          include: {
            fromUser: { select: { id: true, fullName: true, avatarUrl: true } },
            reactions: { include: { user: { select: { id: true, fullName: true } } } },
            readReceipts: { select: { userId: true, readAt: true } },
          },
        },
      },
      orderBy: { lastActivityAt: "desc" },
    })

    // Her konuşma için okunmamış mesaj sayısını hesapla
    const conversationsWithUnread = await Promise.all(
      conversations.map(async (conv) => {
        const participant = conv.participants.find((p) => p.userId === auth.userId)
        const lastReadAt = participant?.lastReadAt ?? new Date(0)

        const unreadCount = await prisma.message.count({
          where: {
            conversationId: conv.id,
            isDeleted: false,
            fromUserId: { not: auth.userId },
            createdAt: { gt: lastReadAt },
          },
        })

        // Mute durumunu kontrol et
        const mute = conv.muteSettings[0]
        const isMuted = mute
          ? mute.mutedUntil === null || mute.mutedUntil > new Date()
          : false

        // DM konuşmalarında karşı tarafın bilgilerini al
        let otherParticipant = null
        if (conv.type === "dm") {
          otherParticipant =
            conv.participants.find((p) => p.userId !== auth.userId) ?? null
        }

        return {
          ...conv,
          unreadCount,
          isMuted,
          mutedUntil: mute?.mutedUntil ?? null,
          otherParticipant,
          lastMessage: conv.messages[0] ?? null,
          messages: undefined, // Yanıtta messages dizisi yerine lastMessage kullan
          muteSettings: undefined,
        }
      })
    )

    return NextResponse.json(conversationsWithUnread)
  } catch (error) {
    console.error("Get conversations error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

// ─────────────────────────────────────────────────────────────
// POST /api/chat/conversations
// ─────────────────────────────────────────────────────────────
export async function POST(req: Request) {
  const auth = await getAuthPayload()
  if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  try {
    const body = await req.json()
    const {
      type = "dm",
      participantIds = [] as string[],
      name,
      description,
      avatarUrl,
      branchId,
    } = body

    // Göndereni her zaman katılımcılara ekle
    const allParticipantIds: string[] = Array.from(
      new Set([auth.userId, ...participantIds])
    )

    if (type === "dm") {
      // DM: tam olarak 2 katılımcı olmalı
      if (allParticipantIds.length !== 2) {
        return NextResponse.json(
          { error: "DM konuşması sadece 2 katılımcı içerebilir" },
          { status: 400 }
        )
      }

      const targetUserId = allParticipantIds.find((id) => id !== auth.userId)!

      // Kullanıcının engelleme durumunu kontrol et
      const block = await prisma.userBlock.findFirst({
        where: {
          OR: [
            { blockerId: auth.userId, blockedId: targetUserId },
            { blockerId: targetUserId, blockedId: auth.userId },
          ],
        },
      })
      if (block) {
        return NextResponse.json(
          { error: "Bu kullanıcıyla mesajlaşamazsınız" },
          { status: 403 }
        )
      }

      // Mevcut DM konuşması var mı kontrol et
      const existingParticipation = await prisma.chatParticipant.findMany({
        where: {
          userId: auth.userId,
          conversation: { type: "dm" },
        },
        include: { conversation: { include: { participants: true } } },
      })

      const existing = existingParticipation.find((p) =>
        p.conversation.participants.some((cp) => cp.userId === targetUserId)
      )

      if (existing) {
        // Mevcut konuşmayı döndür
        return NextResponse.json({ id: existing.conversationId, exists: true })
      }

      // Yeni DM konuşması oluştur
      const conversation = await prisma.chatConversation.create({
        data: {
          id: uuidv4(),
          type: "dm",
          createdById: auth.userId,
          updatedAt: new Date(),
          participants: {
            create: allParticipantIds.map((uid) => ({
              id: uuidv4(),
              userId: uid,
              role: "member",
            })),
          },
        },
        include: {
          participants: {
            include: {
              user: { select: { id: true, username: true, fullName: true, avatarUrl: true } },
            },
          },
        },
      })

      // Sistem mesajı oluştur (isteğe bağlı)
      emitChatEvent({
        type: "conversation_created",
        conversationId: conversation.id,
        targetUserIds: allParticipantIds,
        payload: { conversation },
      })

      return NextResponse.json(conversation, { status: 201 })
    } else if (type === "group" || type === "branch_channel") {
      // Grup: en az 2 katılımcı (kendiniz dahil)
      if (allParticipantIds.length < 2) {
        return NextResponse.json(
          { error: "Grup en az 2 katılımcı içermelidir" },
          { status: 400 }
        )
      }

      if (!name?.trim()) {
        return NextResponse.json(
          { error: "Grup adı zorunludur" },
          { status: 400 }
        )
      }

      // Grup davet linki üret
      const inviteLink = uuidv4()

      const conversation = await prisma.chatConversation.create({
        data: {
          id: uuidv4(),
          type,
          name: name.trim(),
          description: description?.trim() ?? null,
          avatarUrl: avatarUrl ?? null,
          branchId: branchId ?? null,
          createdById: auth.userId,
          inviteLink,
          updatedAt: new Date(),
          participants: {
            create: allParticipantIds.map((uid) => ({
              id: uuidv4(),
              userId: uid,
              role: uid === auth.userId ? "admin" : "member",
            })),
          },
        },
        include: {
          participants: {
            include: {
              user: { select: { id: true, username: true, fullName: true, avatarUrl: true } },
            },
          },
        },
      })

      // Sistem mesajı: grup oluşturuldu
      const creator = await prisma.user.findUnique({
        where: { id: auth.userId },
        select: { fullName: true },
      })

      await prisma.message.create({
        data: {
          id: uuidv4(),
          conversationId: conversation.id,
          fromUserId: auth.userId,
          content: `${creator?.fullName ?? "Kullanıcı"} grubu oluşturdu`,
          contentType: "system",
          isSystemMessage: true,
          systemAction: "group_created",
          updatedAt: new Date(),
        },
      })

      emitChatEvent({
        type: "conversation_created",
        conversationId: conversation.id,
        targetUserIds: allParticipantIds,
        payload: { conversation },
      })

      return NextResponse.json(conversation, { status: 201 })
    } else if (type === "broadcast") {
      // Broadcast listesi oluştur
      if (!name?.trim()) {
        return NextResponse.json(
          { error: "Yayın listesi adı zorunludur" },
          { status: 400 }
        )
      }

      const broadcastList = await prisma.broadcastList.create({
        data: {
          id: uuidv4(),
          name: name.trim(),
          createdById: auth.userId,
          branchId: branchId ?? null,
          updatedAt: new Date(),
          members: {
            create: participantIds.map((uid: string) => ({
              id: uuidv4(),
              userId: uid,
            })),
          },
        },
        include: {
          members: {
            include: {
              user: { select: { id: true, fullName: true, avatarUrl: true } },
            },
          },
        },
      })

      return NextResponse.json(broadcastList, { status: 201 })
    }

    return NextResponse.json({ error: "Geçersiz konuşma tipi" }, { status: 400 })
  } catch (error) {
    console.error("Create conversation error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
