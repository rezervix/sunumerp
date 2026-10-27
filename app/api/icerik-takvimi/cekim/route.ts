import { NextResponse } from "next/server"
import { prisma } from "@/lib/db"
import { requirePermission } from "@/lib/auth/server-permission"

function safeParseJson(str: string | null | undefined, fallback: unknown = null) {
  if (!str) return fallback
  try { return JSON.parse(str) } catch { return fallback }
}

// ─── GET: Çekim listesi ───────────────────────────────────────────────
export async function GET(req: Request) {
  const auth = await requirePermission("icerik-takvimi", "read")
  if (auth instanceof NextResponse) return auth

  const { searchParams } = new URL(req.url)
  const branchId = searchParams.get("branchId")
  const from = searchParams.get("from")
  const to = searchParams.get("to")
  const status = searchParams.get("status")

  // ─── MOCK DATA BYPASS ────────────────────────────────────────────────
  if (process.env.NEXT_PUBLIC_USE_MOCK_DATA === "true") {
    try {
      const userBranches = await prisma.userBranchRole.findMany({
        where: { userId: auth.payload.userId },
        include: { branch: true },
      })
      const accessibleBranches = userBranches.map((ub) => ({
        id: ub.branch.id,
        name: ub.branch.name,
        themeColor: ub.branch.themeColor,
        logoUrl: ub.branch.logoUrl,
      }))

      const { generateMockShoots } = await import("@/app/dashboard/icerik-takvimi/utils/mockCalendarData")
      const fromDate = from ? new Date(from) : new Date(new Date().getFullYear(), new Date().getMonth(), 1)
      const toDate = to ? new Date(to) : new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0)

      let mockShoots = generateMockShoots(fromDate, toDate, branchId, accessibleBranches)
      if (status && status !== "all") {
        mockShoots = mockShoots.filter(shoot => shoot.status === status)
      }

      return NextResponse.json(mockShoots)
    } catch (err) {
      console.error("Mock shoots generation failed, falling back to database:", err)
    }
  }

  try {
    const userBranches = await prisma.userBranchRole.findMany({
      where: { userId: auth.payload.userId },
      select: { branchId: true },
    })
    const accessibleBranchIds = userBranches.map((b) => b.branchId)

    let branchFilter: { in: string[] }
    if (branchId && branchId !== "all") {
      if (!accessibleBranchIds.includes(branchId)) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 })
      }
      branchFilter = { in: [branchId] }
    } else {
      branchFilter = { in: accessibleBranchIds }
    }

    const where: Record<string, unknown> = { branchId: branchFilter }
    if (status && status !== "all") where.status = status
    if (from || to) {
      const dateFilter: Record<string, Date> = {}
      if (from) dateFilter.gte = new Date(from)
      if (to) dateFilter.lte = new Date(to)
      where.shootDate = dateFilter
    }

    // Rol bazlı veri kısıtlaması (Fine-tuning Authorization)
    const user = await prisma.user.findUnique({
      where: { id: auth.payload.userId },
      select: { position: true, department: true }
    })

    const userRoles = await prisma.userBranchRole.findMany({
      where: { userId: auth.payload.userId },
      include: { role: true }
    })

    const roleNames = userRoles.map(ur => ur.role?.name || "")
    const isSuperAdmin = roleNames.some(name => ["Super Admin", "Yonetim Kurulu Uyesi", "Genel Mudur"].includes(name))

    if (!isSuperAdmin) {
      const positionLower = (user?.position || "").toLowerCase()
      const deptLower = (user?.department || "").toLowerCase()

      const isShooter = positionLower.includes("çekim") || positionLower.includes("video") || positionLower.includes("shoot") || deptLower.includes("çekim") || deptLower.includes("video")
      const isEditor = positionLower.includes("edit") || positionLower.includes("kurgu") || deptLower.includes("edit") || deptLower.includes("kurgu")

      if (isShooter && !isEditor) {
        where.videographerIds = { contains: auth.payload.userId }
      } else if (isEditor && !isShooter) {
        where.contentItems = { some: { editorId: auth.payload.userId } }
      } else if (isShooter && isEditor) {
        where.OR = [
          { videographerIds: { contains: auth.payload.userId } },
          { contentItems: { some: { editorId: auth.payload.userId } } }
        ]
      }
    }

    const shoots = await prisma.productionShoot.findMany({
      where,
      orderBy: { shootDate: "asc" },
      include: {
        branch: { select: { id: true, name: true, themeColor: true } },
        contentItems: {
          select: {
            id: true,
            title: true,
            status: true,
            platforms: true,
            contentType: true,
          },
        },
        _count: { select: { contentItems: true } },
      },
    })

    const parsed = shoots.map((s) => ({
      ...s,
      videographerIds: safeParseJson(s.videographerIds, []),
      contentItems: s.contentItems.map((ci) => ({
        ...ci,
        platforms: safeParseJson(ci.platforms, []),
      })),
    }))

    return NextResponse.json(parsed)
  } catch (error) {
    console.error("ProductionShoot GET error:", error)
    return NextResponse.json({ error: "Sunucu hatası" }, { status: 500 })
  }
}

// ─── POST: Yeni çekim günü ────────────────────────────────────────────
export async function POST(req: Request) {
  const auth = await requirePermission("icerik-takvimi", "create")
  if (auth instanceof NextResponse) return auth

  try {
    const body = await req.json()
    const {
      branchId,
      shootDate,
      shootTime,
      location,
      videographerIds = [],
      equipmentNotes,
      contentItemIds = [], // Bu çekimde üretilecek içerikler
    } = body

    if (!branchId || !shootDate) {
      return NextResponse.json({ error: "branchId ve shootDate zorunlu" }, { status: 400 })
    }

    const shoot = await prisma.productionShoot.create({
      data: {
        branchId,
        shootDate: new Date(shootDate),
        shootTime: shootTime || null,
        location: location || null,
        videographerIds: JSON.stringify(videographerIds),
        equipmentNotes: equipmentNotes || null,
        createdById: auth.payload.userId,
        status: "planned",
      },
    })

    // Bağlı içerikleri güncelle
    if (contentItemIds.length > 0) {
      await prisma.contentItem.updateMany({
        where: { id: { in: contentItemIds } },
        data: {
          shootId: shoot.id,
          status: "awaiting_shoot",
        },
      })
    }

    // StatusHistory
    await prisma.contentStatusHistory.create({
      data: {
        entityType: "production_shoot",
        entityId: shoot.id,
        oldStatus: "",
        newStatus: "planned",
        changedById: auth.payload.userId,
        note: "Çekim planlandı",
      },
    })

    // Videoçekimcilere bildirim
    if (videographerIds.length > 0) {
      try {
        const { createNotificationMany } = await import("@/lib/services/notificationService")
        const dateStr = new Date(shootDate).toLocaleDateString("tr-TR")
        await createNotificationMany(
          videographerIds.map((userId: string) => ({
            userId,
            title: "Yeni Çekim Planlandı",
            message: `${dateStr} tarihinde ${location || "belirtilmemiş konumda"} çekim planlandı.`,
            type: "task",
            moduleType: "icerik-takvimi",
            link: `/dashboard/icerik-takvimi`,
          }))
        )
      } catch (err) {
        console.error("Shoot notification error:", err)
      }
    }

    return NextResponse.json({
      ...shoot,
      videographerIds: safeParseJson(shoot.videographerIds, []),
    }, { status: 201 })
  } catch (error) {
    console.error("ProductionShoot POST error:", error)
    return NextResponse.json({ error: "Sunucu hatası" }, { status: 500 })
  }
}
