/**
 * /api/chat/conversations/[id]/messages
 * 
 * GET    — Konuşmanın mesajlarını sayfalı getirir
 * POST   — Yeni mesaj gönderir (metin, medya, sesli mesaj, konum, anket, iletme)
 * 
 * Desteklenen content type'lar:
 *  text | image | video | audio | voice | document | location | poll | sticker
 */
import { NextResponse } from "next/server"
import { prisma } from "@/lib/db"
import { getAuthPayload } from "@/lib/auth/server-permission"
import { emitChatEvent } from "@/lib/services/chatService"
import { createNotification, createNotificationMany } from "@/lib/services/notificationService"
import { sendPushNotification } from "@/lib/webpush"
import { v4 as uuidv4 } from "uuid"

// ─────────────────────────────────────────────────────────────
// GET /api/chat/conversations/[id]/messages
// ─────────────────────────────────────────────────────────────
export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await getAuthPayload()
  if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { id: conversationId } = await params
  const { searchParams } = new URL(req.url)

  // Sayfalama parametreleri
  const cursor = searchParams.get("cursor") ?? undefined   // Son mesaj ID'si (daha eski mesajlar için)
  const limit = Math.min(parseInt(searchParams.get("limit") ?? "50"), 100)
  const search = searchParams.get("search") ?? undefined   // Metin arama
  const contentType = searchParams.get("contentType") ?? undefined // image | video | document gibi filtre
  const dateFrom = searchParams.get("dateFrom") ? new Date(searchParams.get("dateFrom")!) : undefined
  const dateTo = searchParams.get("dateTo") ? new Date(searchParams.get("dateTo")!) : undefined

  try {
    // Kullanıcının bu konuşmaya erişimi olduğunu doğrula
    const participant = await prisma.chatParticipant.findUnique({
      where: { conversationId_userId: { conversationId, userId: auth.userId } },
    })
    if (!participant || participant.isRemoved) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    // Kullanıcının gruba katılma tarihinden önceki mesajları gösterme
    const joinedAt = participant.joinedAt

    const where: Record<string, unknown> = {
      conversationId,
      createdAt: {
        gte: joinedAt,
        ...(dateFrom ? { gte: dateFrom } : {}),
        ...(dateTo ? { lte: dateTo } : {}),
      },
      ...(search
        ? { content: { contains: search, mode: "insensitive" } }
        : {}),
      ...(contentType ? { contentType } : {}),
    }

    // Sayfalama: cursor kullanılıyorsa o ID'den önceki mesajları getir
    if (cursor) {
      const cursorMessage = await prisma.message.findUnique({
        where: { id: cursor },
        select: { createdAt: true },
      })
      if (cursorMessage) {
        (where as any).createdAt = { lt: cursorMessage.createdAt, gte: joinedAt }
      }
    }

    const messages = await prisma.message.findMany({
      where: where as any,
      include: {
        fromUser: {
          select: {
            id: true,
            username: true,
            fullName: true,
            avatarUrl: true,
          },
        },
        reactions: {
          include: {
            user: { select: { id: true, username: true, fullName: true } },
          },
          orderBy: { createdAt: "asc" },
        },
        readReceipts: {
          select: {
            userId: true,
            readAt: true,
            deliveredAt: true,
          },
        },
        replyToMessage: {
          select: {
            id: true,
            content: true,
            contentType: true,
            fileUrl: true,
            fileName: true,
            fromUserId: true,
            fromUser: { select: { id: true, fullName: true } },
            isDeleted: true,
          },
        },
        mentions: {
          include: {
            mentionedUser: { select: { id: true, username: true, fullName: true } },
          },
        },
        voiceMessage: true,
        pinnedIn: {
          select: {
            id: true,
            pinnedAt: true,
            pinnedBy: { select: { id: true, fullName: true } },
          },
        },
        starredBy: {
          where: { userId: auth.userId },
          select: { id: true },
        },
      },
      orderBy: { createdAt: "desc" },
      take: limit + 1, // +1 ile daha fazla mesaj var mı kontrol et
    })

    const hasMore = messages.length > limit
    const result = hasMore ? messages.slice(0, limit) : messages
    // Kronolojik sıraya çevir (en eski önce)
    result.reverse()

    // Kullanıcı için yıldızlı mı?
    const enriched = result.map((msg) => ({
      ...msg,
      isStarredByMe: (msg.starredBy ?? []).length > 0,
      starredBy: undefined,
    }))

    return NextResponse.json({
      messages: enriched,
      hasMore,
      nextCursor: hasMore ? result[0]?.id ?? null : null,
    })
  } catch (error) {
    console.error("Get messages error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

// ─────────────────────────────────────────────────────────────
// POST /api/chat/conversations/[id]/messages
// ─────────────────────────────────────────────────────────────
export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await getAuthPayload()
  if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { id: conversationId } = await params

  try {
    // Konuşma ve kullanıcı yetkisini doğrula
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

    // onlyAdminCanMessage kontrolü
    if (
      conversation.onlyAdminCanMessage &&
      participant.role === "member"
    ) {
      return NextResponse.json(
        { error: "Bu grupta yalnızca yöneticiler mesaj gönderebilir" },
        { status: 403 }
      )
    }

    const body = await req.json()
    const {
      content = "",
      contentType = "text",
      // Dosya alanları
      fileUrl,
      fileType,
      fileName,
      fileSize,
      fileDuration,
      thumbnailUrl,
      waveformData,
      // Konum
      locationLat,
      locationLng,
      locationAddress,
      locationName,
      // Yanıt
      replyToMessageId,
      // İletme
      isForwarded = false,
      forwardedFromConversationId,
      // Anket
      pollData,
      // Sesli mesaj detayları
      voiceMessageData,
      // @mention edilen kullanıcılar
      mentionedUserIds = [] as string[],
      // Kaybolan mesaj
      isSelfDestruct = false,
      selfDestructAt,
    } = body

    // İçerik doğrulama
    if (!content.trim() && !fileUrl && contentType !== "location" && contentType !== "poll") {
      return NextResponse.json(
        { error: "Mesaj içeriği veya dosya zorunludur" },
        { status: 400 }
      )
    }

    // Yanıt mesajı önizleme bilgilerini hazırla
    let replyPreviewText: string | undefined
    let replyPreviewType: string | undefined
    let replyFromUserId: string | undefined

    if (replyToMessageId) {
      const originalMsg = await prisma.message.findUnique({
        where: { id: replyToMessageId },
        select: {
          content: true,
          contentType: true,
          fromUserId: true,
          isDeleted: true,
        },
      })
      if (originalMsg && !originalMsg.isDeleted) {
        replyPreviewText = originalMsg.content.slice(0, 100)
        replyPreviewType = originalMsg.contentType
        replyFromUserId = originalMsg.fromUserId
      }
    }

    // Kaybolan mesaj süresi belirle
    let selfDestructAtDate: Date | undefined
    if (isSelfDestruct && conversation.disappearingMessages && conversation.disappearingDuration) {
      selfDestructAtDate = new Date(Date.now() + conversation.disappearingDuration * 1000)
    } else if (isSelfDestruct && selfDestructAt) {
      selfDestructAtDate = new Date(selfDestructAt)
    }

    // Mesajı oluştur
    const message = await prisma.message.create({
      data: {
        id: uuidv4(),
        conversationId,
        fromUserId: auth.userId,
        content: content.trim(),
        contentType,
        fileUrl,
        fileType,
        fileName,
        fileSize: fileSize ? BigInt(fileSize) : undefined,
        fileDuration,
        thumbnailUrl,
        waveformData: waveformData ? JSON.stringify(waveformData) : undefined,
        locationLat,
        locationLng,
        locationAddress,
        locationName,
        replyToMessageId: replyToMessageId ?? null,
        replyPreviewText,
        replyPreviewType,
        replyFromUserId,
        isForwarded,
        forwardedFromConversationId,
        pollData: pollData ? JSON.stringify(pollData) : undefined,
        isSelfDestruct,
        selfDestructAt: selfDestructAtDate,
        updatedAt: new Date(),
      },
      include: {
        fromUser: {
          select: { id: true, username: true, fullName: true, avatarUrl: true },
        },
        replyToMessage: {
          select: {
            id: true,
            content: true,
            contentType: true,
            fileUrl: true,
            fileName: true,
            fromUser: { select: { id: true, fullName: true } },
          },
        },
      },
    })

    // Sesli mesaj kaydı oluştur
    if (contentType === "voice" && voiceMessageData) {
      await prisma.voiceMessage.create({
        data: {
          id: uuidv4(),
          messageId: message.id,
          duration: voiceMessageData.duration ?? 0,
          waveform: voiceMessageData.waveform ? JSON.stringify(voiceMessageData.waveform) : null,
          fileSize: voiceMessageData.fileSize ? BigInt(voiceMessageData.fileSize) : null,
        },
      })
    }

    // @mention kayıtları oluştur
    if (mentionedUserIds.length > 0) {
      const validMentions = mentionedUserIds.filter((uid: string) =>
        conversation.participants.some((p) => p.userId === uid)
      )
      if (validMentions.length > 0) {
        await prisma.messageMention.createMany({
          data: validMentions.map((uid: string) => ({
            id: uuidv4(),
            messageId: message.id,
            mentionedUserId: uid,
          })),
          skipDuplicates: true,
        })
      }
    }

    // İletme geçmişi kaydet
    if (isForwarded && forwardedFromConversationId) {
      // Orijinal mesajı bul (content eşleşmesi üzerinden basit yaklaşım)
      // Gerçek uygulamada orijinalMessageId body'den geçirilir
      await prisma.message.update({
        where: { id: message.id },
        data: { forwardCount: { increment: 1 } },
      })
    }

    // Konuşmanın lastActivityAt'ini güncelle
    await prisma.chatConversation.update({
      where: { id: conversationId },
      data: {
        lastActivityAt: new Date(),
        lastMessageId: message.id,
        updatedAt: new Date(),
      },
    })

    // Gönderenin kendi okundu kaydını oluştur
    await prisma.messageReadReceipt.create({
      data: {
        id: uuidv4(),
        messageId: message.id,
        userId: auth.userId,
        readAt: new Date(),
        deliveredAt: new Date(),
      },
    })

    // Diğer katılımcılara teslim edildi kaydı oluştur
    const otherParticipants = conversation.participants.filter(
      (p) => p.userId !== auth.userId
    )

    // SSE ile real-time broadcast
    emitChatEvent({
      type: "new_message",
      conversationId,
      targetUserIds: conversation.participants.map((p) => p.userId),
      payload: {
        message: {
          ...message,
          fileSize: message.fileSize ? Number(message.fileSize) : null,
        },
      },
    })

    // Push notification — sessizleştirme kontrolü ile
    try {
      const muteSettings = await prisma.chatMuteSettings.findMany({
        where: {
          conversationId,
          userId: { in: otherParticipants.map((p) => p.userId) },
        },
      })

      const mutedUserIds = new Set(
        muteSettings
          .filter((m) => !m.mutedUntil || m.mutedUntil > new Date())
          .map((m) => m.userId)
      )

      const notifTargets = otherParticipants.filter(
        (p) => !mutedUserIds.has(p.userId)
      )

      if (notifTargets.length > 0) {
        const sender = await prisma.user.findUnique({
          where: { id: auth.userId },
          select: { fullName: true },
        })

        const notifTitle =
          conversation.type === "dm"
            ? `${sender?.fullName}`
            : `${conversation.name} — ${sender?.fullName}`

        const notifBody =
          contentType === "image" ? "📷 Fotoğraf"
          : contentType === "video" ? "🎥 Video"
          : contentType === "voice" ? "🎤 Sesli mesaj"
          : contentType === "audio" ? "🎵 Ses dosyası"
          : contentType === "document" ? `📄 ${fileName ?? "Dosya"}`
          : contentType === "location" ? "📍 Konum"
          : contentType === "poll" ? "📊 Anket"
          : content.slice(0, 80)

        // DB bildirimleri
        await createNotificationMany(
          notifTargets.map((p) => ({
            userId: p.userId,
            title: notifTitle,
            message: notifBody,
            type: "info",
            moduleType: "chat",
            link: `/dashboard/chat?conversation=${conversationId}`,
          }))
        )

        // Web Push bildirimleri
        const pushSubs = await prisma.pushSubscription.findMany({
          where: { userId: { in: notifTargets.map((p) => p.userId) } },
        })

        const pushPayload = JSON.stringify({
          title: notifTitle,
          body: notifBody,
          url: `/dashboard/chat?conversation=${conversationId}`,
          icon: "/images/logo.png",
        })

        await Promise.allSettled(
          pushSubs.map((sub) =>
            sendPushNotification(
              { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
              pushPayload
            )
          )
        )
      }

      // @mention edilen kullanıcılara özel bildirim
      if (mentionedUserIds.length > 0) {
        const sender = await prisma.user.findUnique({
          where: { id: auth.userId },
          select: { fullName: true },
        })

        await createNotificationMany(
          mentionedUserIds
            .filter((uid: string) => uid !== auth.userId)
            .map((uid: string) => ({
              userId: uid,
              title: `@Bahsedildiniz — ${conversation.name ?? ""}`,
              message: `${sender?.fullName}: ${content.slice(0, 60)}`,
              type: "info",
              moduleType: "chat",
              link: `/dashboard/chat?conversation=${conversationId}&message=${message.id}`,
            }))
        )
      }
    } catch (pushErr) {
      console.error("Push notification error:", pushErr)
    }

    return NextResponse.json({
      ...message,
      fileSize: message.fileSize ? Number(message.fileSize) : null,
    }, { status: 201 })
  } catch (error) {
    console.error("Send message error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
