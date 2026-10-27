import { NextResponse } from "next/server"
import { prisma } from "@/lib/db"
import { getAuthPayload, checkPermission, isSuperAdminUser } from "@/lib/auth/server-permission"

export async function GET(req: Request) {
  const payload = await getAuthPayload()
  if (!payload) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const isSuperAdmin = await isSuperAdminUser(payload.userId)
  const canViewAnalytics = isSuperAdmin || await checkPermission(payload.userId, undefined, "icerik_magazasi_analitik", "read")

  if (!canViewAnalytics) {
    return NextResponse.json({ error: "Analitik sayfasını görme yetkiniz yok" }, { status: 403 })
  }

  try {
    // 1. En çok görüntülenen ilk 10
    const topViewed = await prisma.contentStore.findMany({
      take: 10,
      orderBy: { viewCount: "desc" },
      include: { niche: true }
    })

    // 2. En çok indirilen ilk 10
    const topDownloaded = await prisma.contentStore.findMany({
      take: 10,
      orderBy: { downloadCount: "desc" },
      include: { niche: true }
    })

    // 3. Nişe göre içerik dağılımı
    const nicheDistributionRaw = await prisma.contentStore.groupBy({
      by: ["nicheId"],
      _count: { id: true }
    })
    const niches = await prisma.niche.findMany({
      where: { id: { in: nicheDistributionRaw.map(n => n.nicheId) } }
    })
    const nicheDistribution = nicheDistributionRaw.map(item => {
      const niche = niches.find(n => n.id === item.nicheId)
      return {
        name: niche ? niche.name : "Bilinmeyen",
        value: item._count.id
      }
    })

    // 4. Kalite kontrol / durum oranları
    const statusRatesRaw = await prisma.contentStore.groupBy({
      by: ["status"],
      _count: { id: true }
    })
    const statusRates = statusRatesRaw.map(item => ({
      name: item.status === "approved" ? "Onaylandı" :
            item.status === "pending_approval" ? "Onay Bekliyor" :
            item.status === "rejected" ? "Reddedildi" : "Taslak",
      value: item._count.id
    }))

    // 5. Son 30 günün yükleme ve onay trendi
    const thirtyDaysAgo = new Date()
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)

    const recentContents = await prisma.contentStore.findMany({
      where: { createdAt: { gte: thirtyDaysAgo } },
      select: { createdAt: true, status: true }
    })

    // Group by date
    const dailyStats: Record<string, { uploads: number; approvals: number }> = {}
    // Initialize last 30 days
    for (let i = 29; i >= 0; i--) {
      const d = new Date()
      d.setDate(d.getDate() - i)
      const dateStr = d.toISOString().split("T")[0]
      dailyStats[dateStr] = { uploads: 0, approvals: 0 }
    }

    recentContents.forEach(item => {
      const dateStr = item.createdAt.toISOString().split("T")[0]
      if (dailyStats[dateStr]) {
        dailyStats[dateStr].uploads++
        if (item.status === "approved") {
          dailyStats[dateStr].approvals++
        }
      }
    })

    const trendData = Object.entries(dailyStats).map(([date, stats]) => ({
      date: date.substring(5), // MM-DD format
      uploads: stats.uploads,
      approvals: stats.approvals
    }))

    return NextResponse.json({
      topViewed: topViewed.map(item => ({ ...item, sizeBytes: Number(item.sizeBytes) })),
      topDownloaded: topDownloaded.map(item => ({ ...item, sizeBytes: Number(item.sizeBytes) })),
      nicheDistribution,
      statusRates,
      trendData
    })

  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

export async function POST(req: Request) {
  const payload = await getAuthPayload()
  if (!payload) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  try {
    const body = await req.json()
    const { contentStoreId, eventType } = body // eventType: "view" | "download"

    if (!contentStoreId || !eventType || !["view", "download"].includes(eventType)) {
      return NextResponse.json({ error: "Geçersiz parametreler" }, { status: 400 })
    }

    const content = await prisma.contentStore.findUnique({
      where: { id: contentStoreId }
    })

    if (!content) {
      return NextResponse.json({ error: "İçerik bulunamadı" }, { status: 404 })
    }

    // Cooldown logic for "view" events (30 minutes)
    if (eventType === "view") {
      const thirtyMinutesAgo = new Date(Date.now() - 30 * 60 * 1000)
      const existingEvent = await prisma.contentAnalyticsEvent.findFirst({
        where: {
          contentStoreId,
          userId: payload.userId,
          eventType: "view",
          createdAt: { gte: thirtyMinutesAgo }
        }
      })

      if (existingEvent) {
        // Skip view tracking during cooldown, return success anyway
        return NextResponse.json({ success: true, message: "View cooldown active, count skipped." })
      }
    }

    // Save event
    await prisma.contentAnalyticsEvent.create({
      data: {
        contentStoreId,
        userId: payload.userId,
        eventType
      }
    })

    // Update main counter
    await prisma.contentStore.update({
      where: { id: contentStoreId },
      data: {
        viewCount: eventType === "view" ? { increment: 1 } : undefined,
        downloadCount: eventType === "download" ? { increment: 1 } : undefined
      }
    })

    return NextResponse.json({ success: true })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
