/**
 * /api/chat/block
 * 
 * POST   — Kullanıcıyı engelle
 * DELETE — Engeli kaldır (?userId=xxx)
 * GET    — Engellenen kullanıcıları listele
 */
import { NextResponse } from "next/server"
import { prisma } from "@/lib/db"
import { getAuthPayload } from "@/lib/auth/server-permission"
import { v4 as uuidv4 } from "uuid"

export async function POST(req: Request) {
  const auth = await getAuthPayload()
  if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  try {
    const { userId: targetUserId } = await req.json()

    if (!targetUserId) {
      return NextResponse.json({ error: "userId zorunludur" }, { status: 400 })
    }

    if (targetUserId === auth.userId) {
      return NextResponse.json({ error: "Kendinizi engelleyemezsiniz" }, { status: 400 })
    }

    // Zaten engellenmiş mi?
    const existing = await prisma.userBlock.findUnique({
      where: { blockerId_blockedId: { blockerId: auth.userId, blockedId: targetUserId } },
    })

    if (existing) {
      return NextResponse.json({ error: "Kullanıcı zaten engellenmiş" }, { status: 409 })
    }

    await prisma.userBlock.create({
      data: {
        id: uuidv4(),
        blockerId: auth.userId,
        blockedId: targetUserId,
      },
    })

    // Engellenen kişiyle mevcut DM konuşmasını bul ve "mute" et
    const dmConversations = await prisma.chatParticipant.findMany({
      where: { userId: auth.userId },
      include: {
        conversation: {
          include: {
            participants: {
              where: { userId: targetUserId, isRemoved: false, leftAt: null },
            },
          },
        },
      },
    })

    const dmConv = dmConversations.find(
      (p) => p.conversation.type === "dm" && p.conversation.participants.length > 0
    )

    if (dmConv) {
      await prisma.chatMuteSettings.upsert({
        where: {
          conversationId_userId: {
            conversationId: dmConv.conversationId,
            userId: auth.userId,
          },
        },
        create: {
          id: uuidv4(),
          conversationId: dmConv.conversationId,
          userId: auth.userId,
          mutedUntil: null,
          updatedAt: new Date(),
        },
        update: { mutedUntil: null, updatedAt: new Date() },
      })
    }

    return NextResponse.json({ success: true, blocked: true, targetUserId })
  } catch (error) {
    console.error("Block user error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function DELETE(req: Request) {
  const auth = await getAuthPayload()
  if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const targetUserId = searchParams.get("userId")

  if (!targetUserId) {
    return NextResponse.json({ error: "userId zorunludur" }, { status: 400 })
  }

  try {
    await prisma.userBlock.deleteMany({
      where: { blockerId: auth.userId, blockedId: targetUserId },
    })

    return NextResponse.json({ success: true, blocked: false, targetUserId })
  } catch (error) {
    console.error("Unblock user error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function GET(req: Request) {
  const auth = await getAuthPayload()
  if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  try {
    const blocked = await prisma.userBlock.findMany({
      where: { blockerId: auth.userId },
      include: {
        blocked: {
          select: {
            id: true,
            username: true,
            fullName: true,
            avatarUrl: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
    })

    return NextResponse.json(blocked)
  } catch (error) {
    console.error("Get blocked users error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
