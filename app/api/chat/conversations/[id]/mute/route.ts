/**
 * /api/chat/conversations/[id]/mute
 * 
 * POST   — Konuşmayı sessize al
 * DELETE — Sessize almayı kaldır
 */
import { NextResponse } from "next/server"
import { prisma } from "@/lib/db"
import { getAuthPayload } from "@/lib/auth/server-permission"
import { v4 as uuidv4 } from "uuid"

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await getAuthPayload()
  if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { id: conversationId } = await params

  try {
    const { duration, showPreview = true } = await req.json()
    // duration: "8h" | "1w" | "forever" | null (forever)

    const participant = await prisma.chatParticipant.findUnique({
      where: { conversationId_userId: { conversationId, userId: auth.userId } },
    })

    if (!participant || participant.isRemoved || participant.leftAt) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    let mutedUntil: Date | null = null
    if (duration === "8h") {
      mutedUntil = new Date(Date.now() + 8 * 60 * 60 * 1000)
    } else if (duration === "1w") {
      mutedUntil = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
    } else if (duration === "forever" || !duration) {
      mutedUntil = null // null = kalıcı sessiz
    }

    const muteSettings = await prisma.chatMuteSettings.upsert({
      where: { conversationId_userId: { conversationId, userId: auth.userId } },
      create: {
        id: uuidv4(),
        conversationId,
        userId: auth.userId,
        mutedUntil,
        showPreview,
        updatedAt: new Date(),
      },
      update: {
        mutedUntil,
        showPreview,
        updatedAt: new Date(),
      },
    })

    return NextResponse.json({
      success: true,
      isMuted: true,
      mutedUntil: muteSettings.mutedUntil,
    })
  } catch (error) {
    console.error("Mute conversation error:", error)
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

  try {
    await prisma.chatMuteSettings.deleteMany({
      where: { conversationId, userId: auth.userId },
    })

    return NextResponse.json({ success: true, isMuted: false })
  } catch (error) {
    console.error("Unmute conversation error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
