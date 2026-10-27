import { NextResponse } from "next/server"
import { prisma } from "@/lib/db"
import { requirePermission } from "@/lib/auth/server-permission"
import { TrashService } from "@/lib/trash/trash-service"

export async function GET(req: Request) {
  const auth = await requirePermission("trash", "read")
  if (auth instanceof NextResponse) {
    return auth
  }

  const { searchParams } = new URL(req.url)
  const entityType = searchParams.get("entityType") || undefined
  const search = searchParams.get("search") || undefined
  const status = searchParams.get("status") || "IN_TRASH"
  const take = parseInt(searchParams.get("take") || "30")
  const skip = parseInt(searchParams.get("skip") || "0")

  try {
    const where: any = { status }

    if (entityType && entityType !== "ALL") {
      where.entityType = entityType
    }

    if (search) {
      where.OR = [
        { title: { contains: search, mode: "insensitive" } },
        { deletedByFullName: { contains: search, mode: "insensitive" } },
        { entityType: { contains: search, mode: "insensitive" } },
      ]
    }

    const [items, total, allCounts] = await Promise.all([
      prisma.trashItem.findMany({
        where,
        orderBy: { deletedAt: "desc" },
        take,
        skip,
        include: {
          user: {
            select: { id: true, fullName: true, username: true, avatarUrl: true },
          },
        },
      }),
      prisma.trashItem.count({ where }),
      prisma.trashItem.groupBy({
        by: ["entityType"],
        where: { status: "IN_TRASH" },
        _count: { _all: true },
      }),
    ])

    // Modül bazlı sayı özeti (Tabs badge'leri için)
    const entityCounts: Record<string, number> = {}
    let grandTotal = 0
    allCounts.forEach((c) => {
      entityCounts[c.entityType] = c._count._all
      grandTotal += c._count._all
    })
    entityCounts["ALL"] = grandTotal

    return NextResponse.json({
      data: items,
      total,
      entityCounts,
      page: Math.floor(skip / take) + 1,
      pageSize: take,
    })
  } catch (error) {
    console.error("Error fetching trash items:", error)
    return NextResponse.json({ error: "Geri dönüşüm kutusu verileri yüklenemedi." }, { status: 500 })
  }
}

export async function POST(req: Request) {
  const auth = await requirePermission("trash", "write")
  if (auth instanceof NextResponse) {
    return auth
  }
  const userId = auth.payload.userId

  try {
    const body = await req.json()
    const { action, ids } = body

    if (!Array.isArray(ids) || ids.length === 0) {
      return NextResponse.json({ error: "Geçerli bir öge listesi sağlanmalıdır." }, { status: 400 })
    }

    if (action === "restore_bulk") {
      let restoredCount = 0
      for (const id of ids) {
        try {
          await TrashService.restoreFromTrash(id, userId)
          restoredCount++
        } catch (err) {
          console.error(`Bulk restore failed for ${id}:`, err)
        }
      }
      return NextResponse.json({ success: true, count: restoredCount })
    }

    if (action === "purge_bulk") {
      let purgedCount = 0
      for (const id of ids) {
        try {
          await TrashService.purgeFromTrash(id, userId)
          purgedCount++
        } catch (err) {
          console.error(`Bulk purge failed for ${id}:`, err)
        }
      }
      return NextResponse.json({ success: true, count: purgedCount })
    }

    return NextResponse.json({ error: "Geçersiz toplu işlem aksiyonu." }, { status: 400 })
  } catch (error) {
    console.error("Error processing bulk trash action:", error)
    return NextResponse.json({ error: "Toplu işlem gerçekleştirilemedi." }, { status: 500 })
  }
}
