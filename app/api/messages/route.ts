/**
 * /api/messages — Geriye Uyumluluk (Legacy Redirect) Katmanı
 * 
 * Bu endpoint, eski chat sisteminden gelen istekleri yeni
 * /api/chat/* endpoint'lerine yönlendirir.
 * 
 * ÖNEMLİ: Bu endpoint yalnızca geçiş döneminde kullanılır.
 * Tüm yeni geliştirmelerde /api/chat/* endpoint'lerini kullanın.
 * 
 * Yeni endpoint'ler:
 *  GET  /api/chat/conversations — Konuşmaları listele
 *  POST /api/chat/conversations/[id]/messages — Mesaj gönder
 *  GET  /api/chat/conversations/[id]/messages — Mesajları getir
 */
import { NextResponse } from "next/server"
import { prisma } from "@/lib/db"
import { getAuthPayload } from "@/lib/auth/server-permission"

/**
 * GET /api/messages — Legacy: Tüm konuşmaları veya belirli bir konuşmanın mesajlarını getir
 * 
 * Query params (legacy):
 *  toUserId: Karşı kullanıcı ID'si (DM için)
 *  branchId: Şube ID'si (şube kanalı için)
 */
export async function GET(req: Request) {
  const auth = await getAuthPayload()
  if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const toUserId = searchParams.get("toUserId")
  const branchId = searchParams.get("branchId")

  try {
    // DM mesajlarını yeni schema üzerinden getir
    if (toUserId) {
      // İki kullanıcı arasındaki DM konuşmasını bul
      const myConversations = await prisma.chatParticipant.findMany({
        where: { userId: auth.userId, isRemoved: false, leftAt: null },
        select: { conversationId: true },
      })

      const myConvIds = myConversations.map((p) => p.conversationId)

      const targetConversations = await prisma.chatParticipant.findMany({
        where: {
          userId: toUserId,
          conversationId: { in: myConvIds },
          isRemoved: false,
          leftAt: null,
        },
        include: {
          conversation: { select: { id: true, type: true } },
        },
      })

      const dmConv = targetConversations.find((p) => p.conversation.type === "dm")

      if (!dmConv) return NextResponse.json([])

      // Yeni Message şemasından mesajları getir
      const messages = await prisma.message.findMany({
        where: {
          conversationId: dmConv.conversationId,
          isDeleted: false,
        },
        include: {
          fromUser: { select: { id: true, username: true, fullName: true, avatarUrl: true } },
        },
        orderBy: { createdAt: "asc" },
        take: 100,
      })

      // Legacy format'a dönüştür
      return NextResponse.json(
        messages.map((m) => ({
          id: m.id,
          fromUserId: m.fromUserId,
          toUserId,
          branchId: null,
          content: m.isDeleted ? "Bu mesaj silindi" : m.content,
          fileUrl: m.fileUrl,
          fileType: m.fileType,
          isRead: false, // Legacy uyumluluk - yeni sistemde MessageReadReceipt kullanılır
          createdAt: m.createdAt,
          fromUser: m.fromUser,
        }))
      )
    }

    if (branchId) {
      // Şube kanalı mesajlarını getir
      const branchConv = await prisma.chatConversation.findFirst({
        where: { branchId, type: "branch_channel" },
      })

      if (!branchConv) return NextResponse.json([])

      const messages = await prisma.message.findMany({
        where: {
          conversationId: branchConv.id,
          isDeleted: false,
        },
        include: {
          fromUser: { select: { id: true, username: true, fullName: true, avatarUrl: true } },
        },
        orderBy: { createdAt: "asc" },
        take: 100,
      })

      return NextResponse.json(
        messages.map((m) => ({
          id: m.id,
          fromUserId: m.fromUserId,
          toUserId: null,
          branchId,
          content: m.isDeleted ? "Bu mesaj silindi" : m.content,
          fileUrl: m.fileUrl,
          fileType: m.fileType,
          isRead: false,
          createdAt: m.createdAt,
          fromUser: m.fromUser,
        }))
      )
    }

    return NextResponse.json([])
  } catch (error) {
    console.error("Legacy messages GET error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

/**
 * POST /api/messages — Legacy: Mesaj gönder
 * 
 * Yeni /api/chat/conversations/[id]/messages endpoint'ine yönlendirme yapar.
 */
export async function POST(req: Request) {
  const auth = await getAuthPayload()
  if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  try {
    const body = await req.json()
    const { toUserId, branchId, content, fileUrl, fileType } = body

    if (!content?.trim() && !fileUrl) {
      return NextResponse.json({ error: "Mesaj içeriği veya dosya zorunludur" }, { status: 400 })
    }

    let conversationId: string | null = null

    if (toUserId) {
      // DM konuşmasını bul veya oluştur
      const myConversations = await prisma.chatParticipant.findMany({
        where: { userId: auth.userId, isRemoved: false, leftAt: null },
        select: { conversationId: true },
      })

      const myConvIds = myConversations.map((p) => p.conversationId)

      const targetConversations = await prisma.chatParticipant.findMany({
        where: {
          userId: toUserId,
          conversationId: { in: myConvIds },
          isRemoved: false,
          leftAt: null,
        },
        include: { conversation: { select: { id: true, type: true } } },
      })

      const dmConv = targetConversations.find((p) => p.conversation.type === "dm")

      if (dmConv) {
        conversationId = dmConv.conversationId
      } else {
        // Yeni DM konuşması oluştur
        const { v4: uuidv4 } = await import("uuid")
        const newConv = await prisma.chatConversation.create({
          data: {
            id: uuidv4(),
            type: "dm",
            createdById: auth.userId,
            updatedAt: new Date(),
            participants: {
              create: [
                { id: uuidv4(), userId: auth.userId, role: "member" },
                { id: uuidv4(), userId: toUserId, role: "member" },
              ],
            },
          },
        })
        conversationId = newConv.id
      }
    } else if (branchId) {
      // Şube kanalı
      let branchConv = await prisma.chatConversation.findFirst({
        where: { branchId, type: "branch_channel" },
      })

      if (!branchConv) {
        const branch = await prisma.branch.findUnique({ where: { id: branchId }, select: { name: true } })
        const { v4: uuidv4 } = await import("uuid")
        const branchUsers = await prisma.userBranchRole.findMany({
          where: { branchId },
          select: { userId: true },
        })
        branchConv = await prisma.chatConversation.create({
          data: {
            id: uuidv4(),
            type: "branch_channel",
            name: branch?.name ?? "Şube Kanalı",
            branchId,
            createdById: auth.userId,
            updatedAt: new Date(),
            participants: {
              create: branchUsers.map((u) => ({
                id: uuidv4(),
                userId: u.userId,
                role: auth.userId === u.userId ? "admin" : "member",
              })),
            },
          },
        })
      }
      conversationId = branchConv.id
    }

    if (!conversationId) {
      return NextResponse.json({ error: "Hedef kullanıcı veya şube belirtilmeli" }, { status: 400 })
    }

    // Yeni schema ile mesaj oluştur
    const { v4: uuidv4 } = await import("uuid")
    const message = await prisma.message.create({
      data: {
        id: uuidv4(),
        conversationId,
        fromUserId: auth.userId,
        content: content?.trim() ?? "",
        contentType: fileType?.startsWith("image/") ? "image"
          : fileType?.startsWith("video/") ? "video"
          : fileType?.startsWith("audio/") ? "audio"
          : fileUrl ? "document"
          : "text",
        fileUrl: fileUrl ?? null,
        fileType: fileType ?? null,
        updatedAt: new Date(),
      },
      include: {
        fromUser: { select: { id: true, username: true, fullName: true, avatarUrl: true } },
      },
    })

    // Konuşmayı güncelle
    await prisma.chatConversation.update({
      where: { id: conversationId },
      data: { lastActivityAt: new Date(), lastMessageId: message.id, updatedAt: new Date() },
    })

    // SSE broadcast
    try {
      const { emitChatEvent } = await import("@/lib/services/chatService")
      emitChatEvent({
        type: "new_message",
        conversationId,
        payload: { message },
      })
    } catch { /* SSE broadcast hatası kritik değil */ }

    // Legacy response format
    return NextResponse.json({
      id: message.id,
      fromUserId: message.fromUserId,
      toUserId: toUserId ?? null,
      branchId: branchId ?? null,
      content: message.content,
      fileUrl: message.fileUrl,
      fileType: message.fileType,
      isRead: false,
      createdAt: message.createdAt,
      fromUser: message.fromUser,
    })
  } catch (error) {
    console.error("Legacy messages POST error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

/**
 * PUT /api/messages — Legacy: Mesajı okundu olarak işaretle
 */
export async function PUT(req: Request) {
  const auth = await getAuthPayload()
  if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  try {
    const { id } = await req.json()

    await prisma.message.update({
      where: { id },
      data: { isRead: true, updatedAt: new Date() },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Legacy PUT message error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
