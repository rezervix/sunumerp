import { NextResponse } from "next/server"
import { prisma } from "@/lib/db"
import { getAuthPayload, isSuperAdminUser } from "@/lib/auth/server-permission"

// GET /api/support-tickets/[id] - Get details of a support ticket
export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await getAuthPayload()
  if (!auth) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { id } = await params

  try {
    const ticket = await prisma.supportTicket.findUnique({
      where: { id },
      include: {
        reporter: {
          select: {
            id: true,
            username: true,
            fullName: true,
            avatarUrl: true,
            department: true,
            position: true
          }
        },
        assignedUser: {
          select: {
            id: true,
            fullName: true,
            avatarUrl: true,
            department: true,
            position: true
          }
        },
        attachments: true
      }
    })

    if (!ticket || ticket.isDeleted) {
      return NextResponse.json({ error: "Talep bulunamadı." }, { status: 404 })
    }

    // Normal users can only see their own tickets
    const isAdmin = await isSuperAdminUser(auth.userId)
    if (!isAdmin && ticket.reporterUserId !== auth.userId) {
      return NextResponse.json({ error: "Bu talebi görüntülemek için yetkiniz bulunmamaktadır." }, { status: 403 })
    }

    return NextResponse.json(ticket)
  } catch (error) {
    console.error("Get support ticket detail error:", error)
    return NextResponse.json({ error: "Sunucu hatası oluştu." }, { status: 500 })
  }
}

// PATCH /api/support-tickets/[id] - Update status, priority, assignment, or resolution note (Admin/Developer only)
export async function PATCH(
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

    const body = await req.json()
    const { status, priority, assignedTo, resolutionNote } = body

    const updateData: any = {}
    if (status !== undefined) updateData.status = status
    if (priority !== undefined) updateData.priority = priority
    if (assignedTo !== undefined) updateData.assignedTo = assignedTo || null
    if (resolutionNote !== undefined) updateData.resolutionNote = resolutionNote

    const updatedTicket = await prisma.supportTicket.update({
      where: { id },
      data: updateData,
      include: {
        reporter: {
          select: {
            id: true,
            fullName: true
          }
        },
        assignedUser: {
          select: {
            id: true,
            fullName: true
          }
        }
      }
    })

    return NextResponse.json(updatedTicket)
  } catch (error) {
    console.error("Update support ticket error:", error)
    return NextResponse.json({ error: "Sunucu hatası oluştu." }, { status: 500 })
  }
}

// DELETE /api/support-tickets/[id] - Soft delete a support ticket (Admin/Developer only)
export async function DELETE(
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

    await prisma.supportTicket.update({
      where: { id },
      data: { isDeleted: true }
    })

    return NextResponse.json({ success: true, message: "Talep başarıyla silindi." })
  } catch (error) {
    console.error("Delete support ticket error:", error)
    return NextResponse.json({ error: "Sunucu hatası oluştu." }, { status: 500 })
  }
}
