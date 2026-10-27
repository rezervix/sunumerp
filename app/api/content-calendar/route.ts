import { NextResponse } from "next/server"
import { prisma } from "@/lib/db"
import { requirePermission } from "@/lib/auth/server-permission"

function normalizeStatus(status?: string | null) {
  return status || "planned"
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const branchId = searchParams.get("branchId")
  if (!branchId) {
    return NextResponse.json({ error: "branchId gerekli" }, { status: 400 })
  }

  const auth = await requirePermission("takvim", "read", branchId)
  if (auth instanceof NextResponse) return auth

  try {
    const from = searchParams.get("from")
    const to = searchParams.get("to")
    const where: any = { branchId }

    if (from || to) {
      where.scheduledDate = {}
      if (from) where.scheduledDate.gte = new Date(from)
      if (to) where.scheduledDate.lte = new Date(to)
    }

    const items = await prisma.contentCalendar.findMany({
      where,
      orderBy: { scheduledDate: "asc" },
    })

    return NextResponse.json(items)
  } catch (error) {
    console.error("Content calendar fetch error:", error)
    return NextResponse.json({ error: "Sunucu hatası" }, { status: 500 })
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json()
    const { branchId, title, description, scheduledDate, status, customerName } = body

    if (!branchId || !title || !scheduledDate) {
      return NextResponse.json({ error: "branchId, title ve scheduledDate zorunlu" }, { status: 400 })
    }

    const auth = await requirePermission("takvim", "create", branchId)
    if (auth instanceof NextResponse) return auth

    const item = await prisma.contentCalendar.create({
      data: {
        branchId,
        title,
        description: description || null,
        scheduledDate: new Date(scheduledDate),
        status: normalizeStatus(status),
        customerName: customerName || null,
      },
    })

    const branchUsers = await prisma.userBranchRole.findMany({
      where: { branchId },
      select: { userId: true },
    })

    if (branchUsers.length > 0) {
      try {
        const { createNotificationMany } = await import("@/lib/services/notificationService")
        await createNotificationMany(
          branchUsers.map((user) => ({
            userId: user.userId,
            title: "Yeni İçerik Takvimi Öğesi",
            message: `${title} başlıklı içerik takvimi öğesi eklendi.`,
            type: "task",
            moduleType: "takvim",
            link: "/dashboard/takvim",
          }))
        )
      } catch (err) {
        console.error("Error creating content-calendar notifications:", err)
      }
    }

    return NextResponse.json(item, { status: 201 })
  } catch (error) {
    console.error("Content calendar create error:", error)
    return NextResponse.json({ error: "Sunucu hatası" }, { status: 500 })
  }
}

export async function PUT(req: Request) {
  try {
    const body = await req.json()
    const { id, branchId, title, description, scheduledDate, status, customerName } = body

    if (!id || !branchId) {
      return NextResponse.json({ error: "id ve branchId zorunlu" }, { status: 400 })
    }

    const auth = await requirePermission("takvim", "update", branchId)
    if (auth instanceof NextResponse) return auth

    const item = await prisma.contentCalendar.update({
      where: { id },
      data: {
        title,
        description: description ?? undefined,
        scheduledDate: scheduledDate ? new Date(scheduledDate) : undefined,
        status: status ? normalizeStatus(status) : undefined,
        customerName: customerName ?? undefined,
      },
    })

    return NextResponse.json(item)
  } catch (error) {
    console.error("Content calendar update error:", error)
    return NextResponse.json({ error: "Sunucu hatası" }, { status: 500 })
  }
}

export async function DELETE(req: Request) {
  const { searchParams } = new URL(req.url)
  const id = searchParams.get("id")
  const branchId = searchParams.get("branchId")

  if (!id || !branchId) {
    return NextResponse.json({ error: "id ve branchId zorunlu" }, { status: 400 })
  }

  const auth = await requirePermission("takvim", "delete", branchId)
  if (auth instanceof NextResponse) return auth

  try {
    await prisma.contentCalendar.delete({ where: { id } })
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Content calendar delete error:", error)
    return NextResponse.json({ error: "Sunucu hatası" }, { status: 500 })
  }
}
