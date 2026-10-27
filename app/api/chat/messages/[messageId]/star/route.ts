/**
 * POST /api/chat/messages/[messageId]/star
 * 
 * Mesajı yıldızla veya yıldızını kaldır (toggle).
 */
import { NextResponse } from "next/server"
import { prisma } from "@/lib/db"
import { getAuthPayload } from "@/lib/auth/server-permission"
import { v4 as uuidv4 } from "uuid"

export async function POST(
  req: Request,
  { params }: { params: Promise<{ messageId: string }> }
) {
  const auth = await getAuthPayload()
  if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { messageId } = await params

  try {
    const message = await prisma.message.findUnique({
      where: { id: messageId },
      include: {
        conversation: {
          include: {
            participants: {
              where: { userId: auth.userId, isRemoved: false, leftAt: null },
              select: { userId: true },
            },
          },
        },
      },
    })

    if (!message || message.isDeleted) {
      return NextResponse.json({ error: "Mesaj bulunamadı" }, { status: 404 })
    }

    const isMember = message.conversation.participants.length > 0
    if (!isMember) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    // Toggle yıldız
    const existing = await prisma.messageStar.findUnique({
      where: { messageId_userId: { messageId, userId: auth.userId } },
    })

    if (existing) {
      await prisma.messageStar.delete({
        where: { messageId_userId: { messageId, userId: auth.userId } },
      })
      return NextResponse.json({ starred: false, messageId })
    } else {
      await prisma.messageStar.create({
        data: {
          id: uuidv4(),
          messageId,
          userId: auth.userId,
        },
      })
      return NextResponse.json({ starred: true, messageId })
    }
  } catch (error) {
    console.error("Star message error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

/**
 * GET /api/chat/messages/[messageId]/star
 * 
 * Bu kullanıcının yıldızladığı tüm mesajları listele.
 * messageId parametresi bu endpoint'te kullanılmaz — tüm yıldızlılar döner.
 */
export async function GET(
  req: Request,
  { params }: { params: Promise<{ messageId: string }> }
) {
  const auth = await getAuthPayload()
  if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  try {
    const starredMessages = await prisma.messageStar.findMany({
      where: { userId: auth.userId },
      include: {
        message: {
          include: {
            fromUser: { select: { id: true, fullName: true, avatarUrl: true } },
            conversation: {
              select: {
                id: true,
                name: true,
                type: true,
                participants: {
                  where: { isRemoved: false, leftAt: null },
                  include: {
                    user: { select: { id: true, fullName: true } },
                  },
                },
              },
            },
          },
        },
      },
      orderBy: { starredAt: "desc" },
    })

    return NextResponse.json(starredMessages)
  } catch (error) {
    console.error("Get starred messages error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
