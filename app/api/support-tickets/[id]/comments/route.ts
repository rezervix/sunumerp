import { NextResponse } from "next/server"
import { prisma } from "@/lib/db"
import { getAuthPayload, isSuperAdminUser } from "@/lib/auth/server-permission"
import { v4 as uuidv4 } from "uuid"

// POST /api/support-tickets/[id]/comments - Add an internal developer comment
export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await getAuthPayload()
  if (!auth) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const isAdmin = await isSuperAdminUser(auth.userId)
  if (!isAdmin) {
    return NextResponse.json({ error: "Bu işlem için geliştirici veya yönetici yetkisi gerekmektedir." }, { status: 403 })
  }

  const { id } = await params

  try {
    const ticket = await prisma.supportTicket.findUnique({ where: { id } })
    if (!ticket || ticket.isDeleted) {
      return NextResponse.json({ error: "Talep bulunamadı." }, { status: 404 })
    }

    const { comment } = await req.json()
    if (!comment || comment.trim() === "") {
      return NextResponse.json({ error: "Yorum boş bırakılamaz." }, { status: 400 })
    }

    // Parse current comments
    let currentComments: any[] = []
    if (ticket.internalComments) {
      if (typeof ticket.internalComments === "string") {
        try {
          currentComments = JSON.parse(ticket.internalComments)
        } catch (e) {
          currentComments = []
        }
      } else if (Array.isArray(ticket.internalComments)) {
        currentComments = ticket.internalComments as any[]
      }
    }

    // Retrieve full name of the user writing the comment
    let fullName = auth.username
    const dbUser = await prisma.user.findUnique({
      where: { id: auth.userId },
      select: { fullName: true }
    })
    if (dbUser) {
      fullName = dbUser.fullName
    }

    // Create new comment object
    const newComment = {
      id: uuidv4(),
      userId: auth.userId,
      fullName,
      comment: comment.replace(/</g, "&lt;").replace(/>/g, "&gt;"), // Basic XSS protection
      createdAt: new Date().toISOString()
    }

    currentComments.push(newComment)

    await prisma.supportTicket.update({
      where: { id },
      data: {
        internalComments: currentComments as any
      }
    })

    return NextResponse.json(currentComments)
  } catch (error) {
    console.error("Add internal comment error:", error)
    return NextResponse.json({ error: "Sunucu hatası oluştu." }, { status: 500 })
  }
}
