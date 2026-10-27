/**
 * /api/icerik-takvimi/[id]/gorev-gonder
 *
 * POST — İçerik veya çekim kaydını chat üzerinden ilgili kişiye gönderir.
 * Mevcut chat DM sistemi üzerinden otomatik mesaj oluşturur.
 * Görev kartı: zengin JSON içeriğe sahip mesaj.
 */
import { NextResponse } from "next/server"
import { prisma } from "@/lib/db"
import { requirePermission } from "@/lib/auth/server-permission"
import { v4 as uuidv4 } from "uuid"

function safeParseJson(str: string | null | undefined, fallback: unknown = null) {
  if (!str) return fallback
  try { return JSON.parse(str) } catch { return fallback }
}

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requirePermission("icerik-takvimi", "update")
  if (auth instanceof NextResponse) return auth

  const { id } = await params

  try {
    const body = await req.json()
    const {
      targetUserId,        // Kime gönderilecek
      role,                // "shooter" | "editor" | "manager"
      extraNote,           // Opsiyonel ek not
      entityType = "content_item", // "content_item" | "production_shoot"
    } = body

    if (!targetUserId) {
      return NextResponse.json({ error: "targetUserId zorunlu" }, { status: 400 })
    }

    // Kaydı al
    let entityData: Record<string, unknown> | null = null
    let entityTitle = ""
    let entityDate = ""
    let entityLocation = ""

    if (entityType === "content_item") {
      const item = await prisma.contentItem.findUnique({
        where: { id },
        include: {
          branch: { select: { name: true } },
          shoot: true,
        },
      })
      if (!item) return NextResponse.json({ error: "Kayıt bulunamadı" }, { status: 404 })
      entityData = item as unknown as Record<string, unknown>
      entityTitle = item.title
      entityDate = new Date(item.scheduledDate).toLocaleDateString("tr-TR")
      entityLocation = (item.shoot as { location?: string } | null)?.location || ""
    } else if (entityType === "production_shoot") {
      const shoot = await prisma.productionShoot.findUnique({
        where: { id },
        include: { branch: { select: { name: true } } },
      })
      if (!shoot) return NextResponse.json({ error: "Kayıt bulunamadı" }, { status: 404 })
      entityData = shoot as unknown as Record<string, unknown>
      entityTitle = `Çekim — ${(shoot.branch as { name: string }).name}`
      entityDate = new Date(shoot.shootDate).toLocaleDateString("tr-TR")
      entityLocation = shoot.location || ""
    }

    if (!entityData) return NextResponse.json({ error: "Kayıt bulunamadı" }, { status: 404 })

    // Gönderen kullanıcı bilgisi
    const sender = await prisma.user.findUnique({
      where: { id: auth.payload.userId },
      select: { fullName: true },
    })

    // DM konuşmasını bul veya oluştur
    const myConversations = await prisma.chatParticipant.findMany({
      where: { userId: auth.payload.userId, isRemoved: false, leftAt: null },
      select: { conversationId: true },
    })
    const myConvIds = myConversations.map((p) => p.conversationId)

    const targetConversations = await prisma.chatParticipant.findMany({
      where: {
        userId: targetUserId,
        conversationId: { in: myConvIds },
        isRemoved: false,
        leftAt: null,
      },
      include: { conversation: { select: { id: true, type: true } } },
    })
    const dmConv = targetConversations.find((p) => p.conversation.type === "dm")

    let conversationId: string
    if (dmConv) {
      conversationId = dmConv.conversationId
    } else {
      // Yeni DM konuşması oluştur
      const newConv = await prisma.chatConversation.create({
        data: {
          id: uuidv4(),
          type: "dm",
          createdById: auth.payload.userId,
          updatedAt: new Date(),
          participants: {
            create: [
              { id: uuidv4(), userId: auth.payload.userId, role: "member" },
              { id: uuidv4(), userId: targetUserId, role: "member" },
            ],
          },
        },
      })
      conversationId = newConv.id
    }

    // Görev kartı mesaj içeriği — JSON formatında zengin içerik
    const roleLabel =
      role === "shooter" ? "Videoçekim" :
      role === "editor" ? "Editörleme" :
      role === "manager" ? "Sosyal Medya Yönetimi" : "Görev"

    const taskCard = {
      type: "content_task_card",
      entityType,
      entityId: id,
      title: entityTitle,
      date: entityDate,
      location: entityLocation,
      role: roleLabel,
      senderName: sender?.fullName || "Yönetici",
      extraNote: extraNote || null,
      statusOptions:
        entityType === "production_shoot"
          ? ["shot", "cancelled", "postponed"]
          : ["in_editing", "pending_approval", "published", "cancelled"],
      deepLink: `/dashboard/icerik-takvimi?item=${id}`,
    }

    const messageContent = `📋 **${roleLabel} Görevi**\n\n**${entityTitle}**\n📅 ${entityDate}${entityLocation ? `\n📍 ${entityLocation}` : ""}${extraNote ? `\n\n💬 ${extraNote}` : ""}`

    // Mesajı gönder
    const message = await prisma.message.create({
      data: {
        id: uuidv4(),
        conversationId,
        fromUserId: auth.payload.userId,
        content: messageContent,
        contentType: "text", // Mevcut sistemde text olarak sakla, içinde JSON kart var
        updatedAt: new Date(),
        // Görev kartı verisini pollData alanında sakla (mevcut şemada boş alan)
        pollData: JSON.stringify(taskCard),
      },
      include: {
        fromUser: { select: { id: true, fullName: true, avatarUrl: true } },
      },
    })

    // Konuşmayı güncelle
    await prisma.chatConversation.update({
      where: { id: conversationId },
      data: { lastActivityAt: new Date(), lastMessageId: message.id, updatedAt: new Date() },
    })

    // Chat link kaydı
    await prisma.contentChatLink.create({
      data: {
        ...(entityType === "content_item" ? { contentItemId: id } : { shootId: id }),
        sentToUserId: targetUserId,
        chatMessageId: message.id,
        chatConversationId: conversationId,
        sentById: auth.payload.userId,
      },
    })

    // ContentItem'da atanan kişiyi güncelle
    if (entityType === "content_item") {
      const updateData: Record<string, string> = {}
      if (role === "shooter") updateData.shooterId = targetUserId
      if (role === "editor") updateData.editorId = targetUserId
      if (role === "manager") updateData.managerId = targetUserId
      if (Object.keys(updateData).length > 0) {
        await prisma.contentItem.update({ where: { id }, data: updateData })
      }
    }

    // SSE broadcast
    try {
      const { emitChatEvent } = await import("@/lib/services/chatService")
      emitChatEvent({
        type: "new_message",
        conversationId,
        payload: { message },
      })
    } catch { /* SSE hatası kritik değil */ }

    // Bildirim gönder
    try {
      const { createNotification } = await import("@/lib/services/notificationService")
      await createNotification({
        userId: targetUserId,
        title: `Yeni ${roleLabel} Görevi`,
        message: `${entityTitle} için görev atandı. Chat'te detayları gör.`,
        type: "task",
        moduleType: "icerik-takvimi",
        link: `/dashboard/chat`,
      })
    } catch (err) {
      console.error("Task send notification error:", err)
    }

    return NextResponse.json({
      success: true,
      messageId: message.id,
      conversationId,
    })
  } catch (error) {
    console.error("GorevGonder POST error:", error)
    return NextResponse.json({ error: "Sunucu hatası" }, { status: 500 })
  }
}
