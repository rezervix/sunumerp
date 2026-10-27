import { NextResponse } from "next/server"
import { prisma } from "@/lib/db"
import { requirePermission } from "@/lib/auth/server-permission"

function safeParseJson(str: string | null | undefined, fallback: unknown = null) {
  if (!str) return fallback
  try { return JSON.parse(str) } catch { return fallback }
}

export async function GET(req: Request) {
  const auth = await requirePermission("icerik-takvimi", "read")
  if (auth instanceof NextResponse) return auth

  const { searchParams } = new URL(req.url)
  const branchId = searchParams.get("branchId")

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

    const now = new Date()
    const firstDayOfThisMonth = new Date(now.getFullYear(), now.getMonth(), 1)
    const firstDayOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1)
    const lastDayOfLastMonth = new Date(now.getFullYear(), now.getMonth(), 0)

    // ─── BU AY VE GEÇEN AY KARŞILAŞTIRMASI ──────────────────────────────
    const [thisMonthCount, lastMonthCount, totalItems] = await Promise.all([
      prisma.contentItem.count({
        where: { branchId: branchFilter, scheduledDate: { gte: firstDayOfThisMonth } },
      }),
      prisma.contentItem.count({
        where: {
          branchId: branchFilter,
          scheduledDate: { gte: firstDayOfLastMonth, lte: lastDayOfLastMonth },
        },
      }),
      prisma.contentItem.findMany({
        where: { branchId: branchFilter },
        select: { status: true, platforms: true, contentType: true },
      }),
    ])

    // ─── DURUM DAĞILIMI (Firma Bazlı Oranlar İçin) ──────────────────────
    const statusCounts: Record<string, number> = {}
    totalItems.forEach((item) => {
      statusCounts[item.status] = (statusCounts[item.status] || 0) + 1
    })

    // ─── PLATFORM DAĞILIMI ──────────────────────────────────────────────
    const platformCounts: Record<string, number> = {}
    totalItems.forEach((item) => {
      const platforms = safeParseJson(item.platforms, []) as string[]
      platforms.forEach((p) => {
        platformCounts[p] = (platformCounts[p] || 0) + 1
      })
    })

    // ─── EKİP BAZLI İŞ YÜKÜ (Kişi Başı Görev Dağılımı) ─────────────────
    const [shootersList, editorsList, managersList] = await Promise.all([
      prisma.contentItem.groupBy({
        by: ["shooterId"],
        where: { branchId: branchFilter, shooterId: { not: null } },
        _count: { id: true },
      }),
      prisma.contentItem.groupBy({
        by: ["editorId"],
        where: { branchId: branchFilter, editorId: { not: null } },
        _count: { id: true },
      }),
      prisma.contentItem.groupBy({
        by: ["managerId"],
        where: { branchId: branchFilter, managerId: { not: null } },
        _count: { id: true },
      }),
    ])

    // Kullanıcı adlarını çözmek için ID'leri topla
    const userIds = Array.from(
      new Set([
        ...shootersList.map((s) => s.shooterId),
        ...editorsList.map((e) => e.editorId),
        ...managersList.map((m) => m.managerId),
      ].filter(Boolean) as string[])
    )

    const userNames = await prisma.user.findMany({
      where: { id: { in: userIds } },
      select: { id: true, fullName: true },
    })

    const userIdToName = new Map(userNames.map((u) => [u.id, u.fullName]))

    const teamWorkload = {
      shooters: shootersList.map((s) => ({
        name: userIdToName.get(s.shooterId!) || "Atanmamış",
        count: s._count.id,
      })),
      editors: editorsList.map((e) => ({
        name: userIdToName.get(e.editorId!) || "Atanmamış",
        count: e._count.id,
      })),
      managers: managersList.map((m) => ({
        name: userIdToName.get(m.managerId!) || "Atanmamış",
        count: m._count.id,
      })),
    }

    return NextResponse.json({
      comparison: {
        thisMonth: thisMonthCount,
        lastMonth: lastMonthCount,
        changePercentage:
          lastMonthCount > 0
            ? Math.round(((thisMonthCount - lastMonthCount) / lastMonthCount) * 100)
            : 0,
      },
      statusDistribution: Object.entries(statusCounts).map(([status, count]) => ({
        status,
        count,
      })),
      platformDistribution: Object.entries(platformCounts).map(([platform, count]) => ({
        platform,
        count,
      })),
      teamWorkload,
    })
  } catch (error) {
    console.error("Cron reports error:", error)
    return NextResponse.json({ error: "Sunucu hatası" }, { status: 500 })
  }
}
